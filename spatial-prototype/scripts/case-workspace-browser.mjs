/** Selected-case browser acceptance. Imported by the guarded GitHub Actions harness only.
 * This module never imports Playwright or starts a browser. Node helpers are portable;
 * their success is not evidence that any browser acceptance scenario passed. */
import assert from 'node:assert/strict';
import { observeCaseFrame, waitForCaseFrame } from './case-frame-readiness.mjs';
import { createHash } from 'node:crypto';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { measureReaderLayout, exerciseReaderScroll } from './reader-layout-review.mjs';
import { assertCaseLabelReadability } from './case-label-readability.mjs';
import { createCaseLabelCoverage } from './case-label-coverage.mjs';

export const ACCEPTED_CASE_TRANSPORT_SHA256 = '2ca8ae35ef4a02c252e8a1109bb98afd86d7c104b010e90e981a95891a32476c';
export const ACCEPTED_CASE_ADAPTER_SHA256 = 'bcd69ea3201b236d60eb39cfc4f28dba330359c6131e948e9a2e90decff152ea';
export const CASE_COUNTS = Object.freeze({ cases: 19, claims: 72, nodes: 91, edges: 73, readerOnly: 13 });
const sha256 = value => createHash('sha256').update(value).digest('hex');
const normalized = value => String(value).replace(/\s+/gu, ' ').trim();
const words = value => value.replace(/_/g, ' ');
const fieldLabel = value => words(value.replace(/([a-z0-9])([A-Z])/g, '$1 $2'));
const quoted = value => JSON.stringify(value);
const safeName = value => value.replace(/^case:/, '').replace(/[^a-zA-Z0-9_-]/g, '-');
export const caseWorkspace = page => page.locator('[data-case-workspace]');
export const caseSurface = page => page.locator('[data-case-surface]');
export const caseRail = page => page.locator('[data-reader-scroll="workspace-evidence"]');
export const caseSourceDialog = page => page.locator('[data-case-source-dialog]');
export const caseArticle = (page, id) => caseRail(page).locator(`article[data-claim-id=${quoted(id)}]`);
const evidence = page => caseWorkspace(page).locator('.ocv2-evidence');
const viewControls = page => evidence(page).getByRole('navigation', { name: 'Case views and history' });

/** Only import relocation is normalized. Changes to adapter validation still fail. */
export function normalizedAdapterSource(source) {
  return source.replace(/^import reviewedTransport from '\.\/runtime-transport(?:\.ts)?';/m,
    "import reviewedTransport from './reviewed-transport.json';");
}
export async function loadCaseExpectation(root, temporary) {
  const accepted = await readFile(join(root, 'src/case-data/reviewed-transport.json'));
  assert.equal(sha256(accepted), ACCEPTED_CASE_TRANSPORT_SHA256, 'The original accepted case transport changed');
  const adapter = await readFile(join(root, 'src/case-data/adapter.ts'), 'utf8');
  assert.equal(sha256(normalizedAdapterSource(adapter)), ACCEPTED_CASE_ADAPTER_SHA256, 'Reviewed adapter algorithm changed');
  async function bundle(name, reference) {
    const outfile = join(temporary, `${name}.mjs`);
    await build({ entryPoints: [join(root, 'src/case-scene/catalog-bridge.ts')], outfile,
      bundle: true, platform: 'node', format: 'esm', logLevel: 'silent',
      plugins: reference ? [{ name: 'pinned-accepted-case-input', setup(builder) {
        builder.onLoad({ filter: /\/(?:reviewed-transport\.json|runtime-transport\.ts)$/ }, () => ({ contents: accepted.toString('utf8'), loader: 'json' }));
      } }] : [] });
    return import(pathToFileURL(outfile).href);
  }
  const expected = await bundle('accepted-case-expectation', true);
  const runtime = await bundle('current-case-runtime', false);
  const catalog = expected.getCaseCatalog();
  assert.deepEqual(runtime.getCaseCatalog(), catalog, 'Runtime case serialization lost or changed accepted evidence');
  const actual = { cases: catalog.cases.length, claims: 0, nodes: 0, edges: 0, readerOnly: 0 };
  for (const file of catalog.cases) {
    expected.getSceneCase(file);
    actual.claims += file.claims.length; actual.nodes += file.nodes.length;
    actual.edges += file.edges.length; actual.readerOnly += file.readerFactIds.length;
    for (const item of [file, ...file.nodes, ...file.edges]) {
      for (const flag of ['publicationEligible', 'publicGraphEligible', 'pathEligible', 'aggregateEligible', 'researchExportEligible'])
        assert.equal(item[flag], false, `${item.id}: ${flag} must stay false`);
      assert.equal(item.canonicalEntityId, null); assert.deepEqual(item.countryAssociations, []);
    }
    for (const source of file.sources) assert.equal(source.independentCorroboration, false);
    for (const edge of file.edges) if (edge.v2) for (const flag of ['publicationEligible', 'publicGraphEligible', 'pathEligible', 'aggregateEligible', 'researchExportEligible'])
      assert.equal(edge.v2[flag], false, `${edge.id}: role admission flag changed`);
  }
  assert.deepEqual(actual, CASE_COUNTS);
  assert.equal(catalog.renderReviewComplete, false, 'A browser run must not change the source render-review gate');
  const index = JSON.parse(await readFile(join(root, 'src/profile-host/case-index.json'), 'utf8'));
  assert.deepEqual(index, catalog.cases.map(file => ({ id: file.id, label: file.label, profileId: file.profileId,
    researchJurisdiction: { label: file.researchJurisdiction.label, qualification: file.researchJurisdiction.qualification }, claimCount: file.claims.length })));
  return { catalog, reference: { transportSha256: sha256(accepted), adapterAlgorithmSha256: sha256(normalizedAdapterSource(adapter)), counts: actual } };
}

export async function openCaseWorkspace(page, until) {
  await page.getByRole('button', { name: 'Selected case files', exact: true }).click();
  await until(async () => await caseWorkspace(page).count() === 1 && await caseWorkspace(page).getAttribute('data-case-view') === 'chooser', 'Case chooser did not open');
  return caseWorkspace(page);
}
/** Read-only DOM references live in the CI driver, never in the application.
 * Keep the pre-modal canvas/chrome/credit nodes so unmounting cannot masquerade
 * as a visibility repair. These helpers never start a browser. */
export async function captureCaseChromeBaseline(page, result) {
  const retained = await page.evaluateHandle(() => {
    const root = document.querySelector('main.evidence-app');
    const chrome = () => [...root.children].filter(element => !element.matches('.spatial-stage,.city-attribution'))
      .concat([...root.querySelectorAll(':scope > .spatial-stage > .world-labels,:scope > .city-attribution > button')]);
    return { root, stage: root.querySelector('.spatial-stage'), host: root.querySelector('.webgl-host'),
      canvas: root.querySelector('.webgl-host canvas'), chrome: chrome(),
      credits: [...root.querySelectorAll('.city-attribution > a,.maplibregl-ctrl-attrib-inner')],
      creditControls: [...root.querySelectorAll('.city-attribution > button,.maplibregl-ctrl-attrib-button')] };
  });
  const baseline = { retained, snapshot: null };
  baseline.snapshot = await readCaseChromeSnapshot(baseline);
  (result.caseChromeSamples ??= []).push({ phase: 'before-workspace', ...baseline.snapshot });
  assert.equal(baseline.snapshot.inert, false, 'Chrome baseline must precede the modal');
  assert.ok(baseline.snapshot.canvas?.rect.width > 0 && baseline.snapshot.canvas?.rect.height > 0, 'Chrome review requires a live shared canvas');
  assert.ok(baseline.snapshot.credits.some(row => row.kind === 'provider' && row.text), 'Provider credit baseline is missing');
  return baseline;
}

async function readCaseChromeSnapshot(baseline) {
  return baseline.retained.evaluate(retained => {
    const root = document.querySelector('main.evidence-app');
    const style = element => { const css = getComputedStyle(element); return { display: css.display, visibility: css.visibility, opacity: css.opacity }; };
    const geometry = element => element.getBoundingClientRect().toJSON();
    const sample = element => ({ connected: element.isConnected, name: element.tagName.toLowerCase() + '.' + element.className,
      style: style(element), rect: geometry(element) });
    const currentChrome = [...root.children].filter(element => !element.matches('.spatial-stage,.city-attribution'))
      .concat([...root.querySelectorAll(':scope > .spatial-stage > .world-labels,:scope > .city-attribution > button')]);
    const canvas = root.querySelector('.webgl-host canvas');
    const surface = document.querySelector('[data-case-surface]');
    const opener = root.querySelector('.selected-cases-launcher');
    const openerRect = geometry(opener), hit = document.elementFromPoint(openerRect.x + openerRect.width / 2, openerRect.y + openerRect.height / 2);
    return { inert: root.inert, ariaHidden: root.getAttribute('aria-hidden'), rootRetained: root === retained.root,
      stageRetained: root.querySelector('.spatial-stage') === retained.stage, hostRetained: root.querySelector('.webgl-host') === retained.host,
      canvas: canvas ? { ...sample(canvas), retained: canvas === retained.canvas, buffer: { width: canvas.width, height: canvas.height } } : null,
      canvasAncestors: canvas ? [root, retained.stage, retained.host, canvas.parentElement].map(sample) : [],
      providerOpen: root.querySelector('.maplibregl-ctrl-attrib')?.hasAttribute('open') ?? null,
      chrome: currentChrome.map(sample), retainedChrome: retained.chrome.map(sample),
      credits: retained.credits.map(element => ({ ...sample(element), kind: element.matches('.maplibregl-ctrl-attrib-inner') ? 'provider' : 'city',
        text: element.textContent.trim(), links: [...(element.matches('a') ? [element] : element.querySelectorAll('a'))].map(link => ({ text: link.textContent, href: link.href })),
        displayed: element.checkVisibility({ opacityProperty: true, visibilityProperty: true, contentVisibilityAuto: true }) })),
      creditControls: retained.creditControls.map(sample),
      surface: surface ? geometry(surface) : null,
      opener: { connected: opener.isConnected, focused: document.activeElement === opener,
        reachable: !opener.closest('[inert]') && opener.tabIndex >= 0 && !opener.disabled && (hit === opener || opener.contains(hit)) } };
  });
}

/** Portable assertions over real CI measurements; fixture success is not browser proof. */
export function validateCaseChromeSnapshot(sample, baseline, active) {
  assert.equal(sample.inert, active, 'Atlas inert state does not match the workspace');
  assert.equal(sample.ariaHidden, active ? 'true' : null, 'Atlas accessibility state did not restore');
  assert.ok(sample.rootRetained && sample.stageRetained && sample.hostRetained, 'Case chrome repair replaced the atlas or shared host');
  assert.ok(sample.canvas?.connected && sample.canvas.retained, 'Case chrome repair replaced or unmounted the canvas');
  assert.ok(sample.canvas.rect.width > 0 && sample.canvas.rect.height > 0, 'Case chrome repair collapsed the canvas');
  for (const key of ['x', 'y', 'width', 'height']) assert.equal(sample.canvas.rect[key], baseline.canvas.rect[key], `Case chrome repair changed canvas ${key}`);
  assert.deepEqual(sample.canvas.buffer, baseline.canvas.buffer, 'Case chrome repair changed the drawing buffer');
  for (const row of [sample.canvas, ...sample.canvasAncestors]) {
    assert.equal(row.style.visibility, 'visible', `${row.name}: shared canvas ancestry was hidden`);
    assert.notEqual(row.style.display, 'none', `${row.name}: shared canvas ancestry was removed from layout`);
    assert.equal(Number(row.style.opacity), 1, `${row.name}: shared canvas ancestry became transparent`);
  }
  assert.equal(sample.retainedChrome.length, baseline.retainedChrome.length);
  for (const [index, row] of sample.retainedChrome.entries()) {
    assert.equal(row.connected, true, `${row.name}: atlas chrome was unmounted`);
    if (!active) assert.deepEqual(row.style, baseline.retainedChrome[index].style, `${row.name}: atlas style did not restore`);
  }
  if (active) for (const row of sample.chrome) assert.equal(row.style.visibility, 'hidden', `${row.name}: inactive atlas chrome is still visible`);
  assert.equal(sample.providerOpen, baseline.providerOpen, 'CSS repair changed the original attribution disclosure state');
  assert.equal(sample.credits.length, baseline.credits.length, 'Map credits disappeared');
  for (const [index, row] of sample.credits.entries()) {
    const previous = baseline.credits[index];
    assert.equal(row.connected, true, 'Original map credit DOM was removed');
    assert.equal(row.text, previous.text, 'Map attribution text changed');
    assert.deepEqual(row.links, previous.links, 'Map attribution URLs changed');
    if (active) {
      assert.equal(row.displayed, true, `${row.kind}: map credits are not displayed`);
      assert.ok(row.rect.width > 0 && row.rect.height > 0, `${row.kind}: map credits have no visible bounds`);
      if (sample.surface) {
        const board = sample.surface;
        assert.ok(row.rect.left >= board.left && row.rect.right <= board.right && row.rect.top >= board.top && row.rect.bottom < board.bottom,
          `${row.kind}: displayed credits are outside the transparent board`);
      }
    } else {
      assert.deepEqual(row.style, previous.style, `${row.kind}: credit style did not restore`);
      for (const key of ['x', 'y', 'width', 'height']) assert.ok(Math.abs(row.rect[key] - previous.rect[key]) <= 0.5, `${row.kind}: credit ${key} did not restore`);
    }
  }
  for (const [index, row] of sample.creditControls.entries()) {
    assert.equal(row.connected, true, 'Attribution control was unmounted');
    if (active) assert.ok(row.style.display === 'none' || row.style.visibility === 'hidden', 'Inert attribution control looks usable');
    else assert.deepEqual(row.style, baseline.creditControls[index].style, 'Attribution control did not restore');
  }
  if (!active) assert.ok(sample.opener.connected && sample.opener.focused && sample.opener.reachable, 'Close did not restore the original launcher and focus');
}

export async function assertCaseChromeActive(page, result, baseline, phase = 'scene-active') {
  const sample = await readCaseChromeSnapshot(baseline);
  (result.caseChromeSamples ??= []).push({ phase, ...sample });
  validateCaseChromeSnapshot(sample, baseline.snapshot, true);
  assert.equal(await page.locator('canvas').count(), 1, 'Chrome repair added a second canvas');
  return sample;
}

export async function assertCaseChromeRestored(page, result, baseline, phase = 'workspace-closed') {
  const sample = await readCaseChromeSnapshot(baseline);
  (result.caseChromeSamples ??= []).push({ phase, ...sample });
  validateCaseChromeSnapshot(sample, baseline.snapshot, false);
  await page.getByRole('button', { name: 'Selected case files', exact: true }).click({ trial: true });
  return sample;
}

export async function chooseCase(page, fileOrProfileId, until) {
  const profileId = typeof fileOrProfileId === 'string' ? fileOrProfileId : fileOrProfileId.profileId;
  if (await caseWorkspace(page).getAttribute('data-case-view') !== 'chooser')
    await caseWorkspace(page).getByRole('button', { name: 'Choose another case', exact: true }).click();
  await caseWorkspace(page).locator(`[data-profile-id=${quoted(profileId)}]`).click();
  await until(async () => await caseWorkspace(page).getAttribute('data-case-view') === 'list' &&
    await evidence(page).count() === 1 && (typeof fileOrProfileId === 'string' || await caseWorkspace(page).getAttribute('data-case-id') === fileOrProfileId.id),
  `Complete reader did not load for ${profileId}`);
  return caseWorkspace(page);
}
/** Actual DOM geometry and state, including failures before a physical frame exists. */
export async function caseWorkspaceDiagnostics(page) {
  return page.evaluate(() => {
    const workspace = document.querySelector('[data-case-workspace]');
    const board = workspace?.querySelector('[data-case-surface]');
    const canvas = document.querySelector('.webgl-host canvas');
    const rect = element => element?.getBoundingClientRect().toJSON() ?? null;
    return { viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
      workspace: rect(workspace), board: rect(board), canvas: rect(canvas),
      mode: workspace?.dataset.caseView ?? null, compact: workspace?.dataset.caseCompact ?? null,
      caseId: workspace?.dataset.caseId ?? null, selection: workspace?.dataset.caseSelection ?? null,
      motion: workspace?.dataset.caseMotion ?? null,
      notices: [...(workspace?.querySelectorAll('.cw-notice,[role="status"]') ?? [])].map(element => element.textContent.trim()).filter(Boolean),
      counters: { frameNodes: Number(board?.dataset.caseFrameNodes ?? 0), frameRoles: Number(board?.dataset.caseFrameRoles ?? 0),
        sceneDraws: Number(board?.dataset.caseSceneDraws ?? 0), compositeDraws: Number(board?.dataset.caseCompositeDraws ?? 0),
        targetWidth: Number(board?.dataset.caseTargetWidth ?? 0), targetHeight: Number(board?.dataset.caseTargetHeight ?? 0) } };
  });
}
export async function showCaseScene(page, until, result, phase = 'case-scene') {
  const samples = [];
  const record = async stage => {
    const sample = { phase, stage, ...await caseWorkspaceDiagnostics(page) };
    samples.push(sample);
    if (result) (result.caseSceneReadinessSamples ??= []).push(sample);
  };
  await record('before-request');
  try {
    await viewControls(page).getByRole('button', { name: 'Case scene', exact: true }).click();
    await record('after-request');
    await until(async () => await caseWorkspace(page).getAttribute('data-case-view') === 'scene' &&
      Number(await caseSurface(page).getAttribute('data-case-frame-nodes')) > 0 &&
      Number(await caseSurface(page).getAttribute('data-case-scene-draws')) > 0 &&
      Number(await caseSurface(page).getAttribute('data-case-composite-draws')) > 0,
    'Case scene did not report a physical scene and composite draw', 30000);
    await record('ready');
    return caseSurface(page);
  } catch (error) {
    await record('failure');
    error.message += `\nCase scene readiness diagnostics: ${JSON.stringify(samples)}`;
    throw error;
  }
}
export async function showCompleteCaseReader(page, until) {
  await viewControls(page).getByRole('button', { name: 'Complete reader', exact: true }).click();
  await until(async () => await caseWorkspace(page).getAttribute('data-case-view') === 'list' && await caseSurface(page).count() === 0, 'Complete reader did not replace scene');
}

function valueText(value) {
  if (value === null) return 'Unknown / not established';
  if (Array.isArray(value)) return value.map(valueText).join('; ');
  if (typeof value === 'object') return Object.entries(value).map(([key, child]) => `${words(key)}: ${valueText(child)}`).join('; ');
  return String(value);
}
function includesText(actual, expected, label) {
  assert.ok(normalized(actual).includes(normalized(expected)), `${label}: missing ${JSON.stringify(expected)}`);
}
function assertFields(actual, expected, label) {
  for (const [key, value] of Object.entries(expected ?? {}))
    assert.ok(actual.some(row => row.label === normalized(fieldLabel(key)) && row.value === normalized(valueText(value))), `${label}: missing exact field ${key}`);
}
function assertClaimEvidence(actual, claim, file, includeContext = true) {
  for (const key of ['proposedLabel', 'statement', 'proposedEndpoints', 'alwaysVisibleQualification', 'capacityAndDirectness', 'directionMeaning', 'dateLabel', 'mandatoryBoundary', 'reviewedSourceLocator', 'claimId'])
    includesText(actual.text, claim[key], `${claim.claimId}.${key}`);
  includesText(actual.text, words(claim.financialStage), `${claim.claimId}.financialStage`);
  for (const text of [...claim.qualifications, ...claim.exclusions.map(row => row.statement), ...claim.reviewLimitations]) includesText(actual.text, text, claim.claimId);
  for (const text of [claim.review.scope, claim.review.reviewedOn, words(claim.review.disposition)]) includesText(actual.text, text, claim.claimId);
  for (const fields of [claim.dates, claim.details, claim.v2?.flags, claim.v2?.sourceDateFields, claim.v2?.originalClaimRecord]) assertFields(actual.fields, fields, claim.claimId);
  if (claim.sharedBlockId) includesText(actual.text, claim.sharedBlockId, claim.claimId);
  for (const id of claim.v2?.directSourceIds ?? []) includesText(actual.text, id, `${claim.claimId}.directSourceIds`);
  for (const id of claim.v2?.nonAdditionGroupIds ?? []) {
    const group = file.v2.nonAdditionGroups.find(row => row.id === id);
    includesText(actual.text, words(group.aggregation), `${claim.claimId}.nonAddition`);
    includesText(actual.text, group.qualification, `${claim.claimId}.nonAddition`);
  }
  assert.equal(actual.sources.length, claim.sourceIds.length, `${claim.claimId}: exact source closure`);
  claim.sourceIds.forEach((id, index) => {
    const source = file.sources.find(row => row.id === id), row = actual.sources[index];
    for (const text of [source.title, source.publisher, source.locator, claim.reviewedSourceLocator,
      source.publishedOn ?? 'Unknown', source.accessedOn, words(source.accessDepth), words(source.custody), source.sourceFamily ?? 'Not established',
      'Retrieval is not a relationship date.', 'Dependent sources are not independent corroboration.', ...source.exclusions.map(item => item.statement)])
      includesText(row.text, text, `${claim.claimId}.source.${id}`);
    assertFields(row.fields, source.dateFields, `${claim.claimId}.source.${id}`);
    assert.deepEqual(row.links, source.url ? [{ href: new URL(source.url).href, target: '_blank', rel: 'noopener noreferrer' }] : [], `${claim.claimId}: exact safe source URL`);
  });
  if (includeContext) {
    const dependencies = claim.v2?.recursiveDependencyClaimIds ?? [];
    assert.equal(actual.contexts.length, dependencies.length, `${claim.claimId}: complete recursive context`);
    dependencies.forEach((id, index) => assertClaimEvidence(actual.contexts[index], file.claims.find(row => row.claimId === id), file, false));
  }
}
async function readEvidenceDOM(locator) {
  return locator.evaluate(root => {
    const text = element => element.innerText.replace(/\s+/gu, ' ').trim();
    const fields = element => [...element.querySelectorAll(':scope > dl.ocd-fields > div')].map(row => ({ label: text(row.querySelector('dt')), value: text(row.querySelector('dd')) }));
    const read = element => ({ text: text(element), fields: [...fields(element), ...[...element.querySelectorAll(':scope > .ocd-v2-guards')].flatMap(fields)],
      sources: [...element.querySelectorAll(':scope > ul.ocd-sources > li')].map(row => ({ text: text(row), fields: fields(row),
        links: [...row.querySelectorAll('a')].map(link => ({ href: link.href, target: link.target, rel: link.rel })) })),
      contexts: [...element.querySelectorAll(':scope > section[aria-label="Required recursive claim context"] > .ocd-evidence-content')].map(read) });
    return read(root);
  });
}
export async function assertCompleteCaseReader(page, file) {
  assert.equal(await caseWorkspace(page).getAttribute('data-case-id'), file.id);
  assert.equal(await caseWorkspace(page).getAttribute('data-case-view'), 'list');
  const articles = caseRail(page).locator('article[data-claim-id]');
  assert.deepEqual(await articles.evaluateAll(items => items.map(item => item.dataset.claimId)), file.claims.map(claim => claim.claimId));
  assert.deepEqual(await evidence(page).locator('[data-node-id]').evaluateAll(items => items.map(item => item.dataset.nodeId)), file.nodes.map(node => node.id));
  const text = await evidence(page).innerText();
  for (const required of [file.label, file.researchJurisdiction.label, file.researchJurisdiction.qualification, ...file.constraints]) includesText(text, required, file.id);
  for (const node of file.nodes) {
    const row = evidence(page).locator(`[data-node-id=${quoted(node.id)}]`);
    includesText(await row.innerText(), node.label, node.id); includesText(await row.innerText(), node.qualification, node.id);
  }
  for (const claim of file.claims) {
    const article = caseArticle(page, claim.claimId);
    assert.equal(await article.getAttribute('data-reader-only'), String(file.readerFactIds.includes(claim.claimId)));
    const edges = file.edges.filter(edge => edge.claimId === claim.claimId);
    assert.deepEqual(await article.locator('[data-edge-id]').evaluateAll(items => items.map(item => item.dataset.edgeId)), edges.map(edge => edge.id));
    for (const edge of edges) {
      const role = article.locator(`[data-edge-id=${quoted(edge.id)}]`), roleText = await role.innerText();
      assert.equal(await role.getAttribute('data-predicate'), edge.kind);
      for (const value of [edge.role, file.nodes.find(node => node.id === edge.from).label, file.nodes.find(node => node.id === edge.to).label]) includesText(roleText, value, edge.id);
      if (edge.v2) for (const value of [edge.v2.predicate, edge.v2.capacity, edge.v2.financialStage, edge.v2.dateLabel, edge.v2.alwaysVisibleQualification, edge.v2.locator,
        ...(edge.v2.amount === null ? [] : [valueText(edge.v2.amount)]), ...edge.v2.sourceIds.flatMap(id => { const source = file.sources.find(row => row.id === id); return [source.publisher, source.title, source.locator]; })]) includesText(roleText, value, edge.id);
    }
    assertClaimEvidence(await readEvidenceDOM(article.locator(':scope > .ocd-evidence-content')), claim, file);
  }
  return { id: file.id, profileId: file.profileId, claims: file.claims.map(claim => claim.claimId), sourceReferences: file.claims.reduce((total, claim) => total + claim.sourceIds.length, 0), nodes: file.nodes.length, edges: file.edges.length, readerOnly: file.readerFactIds.length };
}

export async function assertCaseFrame(page, file, until, result, phase = 'frame', labelCoverage = null, afterLabelCheck = null, readiness = {}) {
  const sample = await waitForCaseFrame({ read: () => page.evaluate(observeCaseFrame), until, file, result, phase, ...readiness });
  assert.ok(sample.rect.width >= 240 && sample.rect.height >= 180);
  assert.ok(sample.rect.x >= 0 && sample.rect.y >= 0 && sample.rect.right <= sample.viewport.width + 1 && sample.rect.bottom <= sample.viewport.height + 1);
  assert.ok(sample.nodes.length > 0 && sample.nodes.length <= file.nodes.length, `${file.id}: no projected node labels`);
  assert.ok(sample.roles.length <= Number(sample.dataset.caseFrameRoles));
  assert.equal(new Set(sample.nodes.map(row => row.id)).size, sample.nodes.length);
  assert.equal(new Set(sample.roles.map(row => row.id)).size, sample.roles.length);
  for (const row of sample.nodes) assert.equal(row.text, file.nodes.find(node => node.id === row.id)?.label, `${file.id}: exact node label`);
  for (const row of sample.roles) assert.equal(row.text, file.edges.find(edge => edge.id === row.id)?.role, `${file.id}: exact role label`);
  const selection = sample.selection;
  const selectedEdge = file.edges.find(edge => edge.id === selection), selectedNode = file.nodes.find(node => node.id === selection);
  if (selectedEdge) {
    assert.deepEqual(sample.roles.filter(row => row.selected).map(row => row.id), [selection], 'Selected physical role label differs from exact retained edge');
    assert.equal(await evidence(page).locator(`[data-edge-id=${quoted(selection)}] button`).getAttribute('aria-pressed'), 'true');
  }
  if (selectedNode) {
    assert.deepEqual(sample.nodes.filter(row => row.selected).map(row => row.id), [selection], 'Selected node must remain in the physical frame');
    assert.equal(await evidence(page).locator(`[data-node-id=${quoted(selection)}] button`).getAttribute('aria-pressed'), 'true');
  }
  if (result) (result.caseFrameSamples ??= []).push({ caseId: file.id, phase, selection, ...sample });
  const checkLabels = async () => {
    await assertCaseLabelReadability(page, file, result ?? {}, { phase, fit: phase === 'initial', requireReadablePolicy: true });
    if (afterLabelCheck) await afterLabelCheck();
  };
  if (labelCoverage) await labelCoverage.observe(file.id, phase, checkLabels);
  else await checkLabels();
  return sample;
}

async function geographySnapshot(page) {
  return page.evaluate(() => {
    const app = document.querySelector('.evidence-app'), host = document.querySelector('.webgl-host');
    const pick = (element, keys) => Object.fromEntries(keys.map(key => [key, element?.dataset[key] ?? null]));
    return { app: pick(app, ['dataset', 'loadedEntities', 'loadedRecords', 'loadedRelationships', 'loadedSources', 'heldCount', 'factualItems', 'filteredItems', 'unplacedItems']),
      host: pick(host, ['centerLng', 'centerLat', 'zoom', 'bearing', 'pitch', 'selectedEdge', 'renderedEdgeIds', 'placedPins', 'unplacedPins', 'countryBaseFeatures']) };
  });
}
async function assertNoAdmission(page, baseline) {
  assert.equal(await caseWorkspace(page).getAttribute('data-public-graph-eligible'), 'false');
  assert.equal(await caseWorkspace(page).getAttribute('data-path-eligible'), 'false');
  assert.deepEqual(await geographySnapshot(page), baseline, 'Case-only work changed global geography, selection or registry counts');
  assert.equal(await caseWorkspace(page).locator('.relationship-route,[data-path-eligible="true"],[data-public-graph-eligible="true"]').count(), 0);
}
export function validateCaseReaderLayout(sample) {
  const within = (inner, outer) => inner.left >= outer.left - 0.5 && inner.top >= outer.top - 0.5 &&
    inner.right <= outer.right + 0.5 && inner.bottom <= outer.bottom + 0.5;
  assert.ok(within(sample.workspace, { left: 0, top: 0, right: sample.viewport.width, bottom: sample.viewport.height }), 'Case workspace exceeds the effective viewport');
  assert.ok(within(sample.header, sample.workspace) && within(sample.scroll, sample.workspace), 'Case header or reader escapes the workspace');
  assert.ok(sample.header.bottom <= sample.scroll.top + 0.5, 'Workspace header overlaps case content');
  assert.ok(sample.scroll.height >= 120, 'Case reader has no usable independent scroll region');
  assert.ok(sample.controls.length >= 1 && sample.controls.every(control => within(control.rect, sample.header) && control.hit), 'Workspace header controls are clipped or obscured');
  assert.ok(sample.scrollWidth <= sample.clientWidth + 1, 'Case reader horizontally overflows');
  assert.equal(sample.outerScrollTop, 0, 'Workspace shell must not scroll underneath its header');
  assert.ok(['auto', 'scroll'].includes(sample.overflowY), 'Case evidence must scroll independently');
  assert.equal(sample.focusable, true, 'Case reader must support keyboard scrolling');
  assert.ok(sample.label?.trim(), 'Case reader needs an accessible name');
}
export async function measureCaseReaderLayout(page, result, phase) {
  const sample = await caseWorkspace(page).evaluate(workspace => {
    const header = workspace.querySelector('.cw-header'), scroll = workspace.querySelector('[data-reader-scroll="workspace-evidence"]');
    const rect = element => element.getBoundingClientRect().toJSON();
    return { workspace: rect(workspace), header: rect(header), scroll: rect(scroll),
      viewport: { width: innerWidth, height: innerHeight }, scrollTop: scroll.scrollTop,
      scrollHeight: scroll.scrollHeight, clientHeight: scroll.clientHeight, scrollWidth: scroll.scrollWidth, clientWidth: scroll.clientWidth,
      outerScrollTop: workspace.scrollTop, overflowY: getComputedStyle(scroll).overflowY,
      focusable: scroll.tabIndex === 0, label: scroll.getAttribute('aria-label'),
      controls: [...header.querySelectorAll('button')].map(button => {
        const box = rect(button), hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
        return { label: button.textContent.trim(), rect: box, hit: hit === button || button.contains(hit) };
      }) };
  });
  if (result) (result.caseReaderLayoutSamples ??= []).push({ phase, ...sample });
  validateCaseReaderLayout(sample);
  return sample;
}
export function validateCaseCaptureAlignment(sample) {
  const { visible, anchor, gap } = sample;
  assert.ok(anchor.top >= visible.top + gap - 1 && anchor.top < visible.bottom - 32, 'Case capture target is outside its unobscured reading band');
  // A long source/qualification block may continue below the viewport. A claim
  // introduction must show its complete kind/number, title and first assertion.
  for (const [name, rect] of Object.entries(sample.introduction ?? {})) {
    assert.ok(rect.top >= visible.top + gap - 1 && rect.bottom <= visible.bottom - 1 &&
      rect.left >= visible.left - 0.5 && rect.right <= visible.right + 0.5,
    `Case ${name} is clipped at the capture target`);
  }
}
async function measureCaseCapture(target) {
  return target.evaluate(element => {
    const scroll = element.closest('[data-reader-scroll]');
    const header = element.closest('[data-case-workspace]').querySelector('.cw-header');
    const content = element.parentElement;
    const claimHeading = element.matches('.ocd-evidence-content > h3');
    const anchor = claimHeading ? content.querySelector(':scope > .ocd-eyebrow') : element;
    const rect = item => item.getBoundingClientRect().toJSON();
    const s = rect(scroll), h = rect(header);
    return { target: rect(element), anchor: rect(anchor), scrollTop: scroll.scrollTop,
      gap: Math.max(20, parseFloat(getComputedStyle(claimHeading ? content : element).scrollMarginTop) || 0),
      visible: { top: Math.max(s.top, h.bottom, 0), bottom: Math.min(s.bottom, innerHeight), left: Math.max(s.left, 0), right: Math.min(s.right, innerWidth) },
      introduction: claimHeading ? { claimKindAndNumber: rect(anchor), heading: rect(element), firstAssertion: rect(element.nextElementSibling) } : null };
  });
}
async function positionBand(page, target) {
  await target.evaluate(element => {
    const scroller = element.closest('[data-reader-scroll]');
    if (!scroller) throw new Error('Capture target has no independently scrolling reader');
    const content = element.parentElement, claimHeading = element.matches('.ocd-evidence-content > h3');
    const anchor = claimHeading ? content.querySelector(':scope > .ocd-eyebrow') : element;
    const header = element.closest('[data-case-workspace]').querySelector('.cw-header');
    const top = Math.max(scroller.getBoundingClientRect().top, header.getBoundingClientRect().bottom, 0);
    const gap = Math.max(20, parseFloat(getComputedStyle(claimHeading ? content : element).scrollMarginTop) || 0);
    scroller.scrollTop += anchor.getBoundingClientRect().top - top - gap;
  });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function captureBand(page, result, capture, coverage, file, label, target) {
  await positionBand(page, target);
  await measureCaseReaderLayout(page, result, `${file.id}:${label}`);
  const before = await measureCaseCapture(target);
  (result.caseCaptureAlignmentSamples ??= []).push({ caseId: file.id, band: label, stage: 'before-capture', ...before });
  validateCaseCaptureAlignment(before);
  await capture(page, result, `${safeName(file.id)}-${label}`);
  const after = await measureCaseCapture(target);
  result.caseCaptureAlignmentSamples.push({ caseId: file.id, band: label, stage: 'after-capture', ...after });
  validateCaseCaptureAlignment(after);
  assert.ok(Math.abs(after.scrollTop - before.scrollTop) <= 1, 'Screenshot capture repositioned the case reader');
  coverage.captures.push({ caseId: file.id, band: label, file: result.screenshots.at(-1), alignment: after });
}
async function openClaimSources(page, claim) {
  const controls = caseRail(page).getByRole('region', { name: 'Source dialog controls' });
  const details = controls.locator('details');
  if (await details.getAttribute('open') === null) await details.locator('summary').click();
  const opener = details.getByRole('button', { name: `Claim ${claim.number}: ${claim.proposedLabel}`, exact: true });
  await opener.click(); await caseSourceDialog(page).waitFor({ state: 'visible' });
  assert.equal(await caseSourceDialog(page).evaluate(element => element.open && element.matches(':modal')), true, 'Sources must use a native modal dialog');
  return opener;
}
async function openClaimSourcesByKeyboard(page, claim, result, phase) {
  const scroll = caseRail(page);
  const max = await scroll.evaluate(element => element.scrollHeight - element.clientHeight);
  assert.ok(max > 100, 'Complete case evidence must actually overflow its reader');
  for (const [name, fraction] of [['top', 0], ['middle', 0.5], ['bottom', 1]]) {
    await scroll.evaluate((element, top) => { element.scrollTop = top; }, max * fraction);
    await measureCaseReaderLayout(page, result, `${phase}:${name}`);
  }
  await scroll.evaluate(element => { element.scrollTop = 0; element.focus({ preventScroll: true }); });
  await page.keyboard.press('PageDown');
  await page.waitForFunction(() => document.querySelector('[data-reader-scroll="workspace-evidence"]')?.scrollTop > 0, null, { timeout: 5000 });
  assert.equal(await scroll.evaluate(element => document.activeElement === element), true, 'Case reader PageDown lost focus');
  const outline = await scroll.evaluate(element => ({ width: parseFloat(getComputedStyle(element).outlineWidth), style: getComputedStyle(element).outlineStyle, offset: parseFloat(getComputedStyle(element).outlineOffset) }));
  assert.ok(outline.width >= 2 && outline.style !== 'none' && outline.offset <= -outline.width, 'Case keyboard scroll outline must remain inside the visible rail');
  await measureCaseReaderLayout(page, result, `${phase}:keyboard-page-down`);
  await scroll.evaluate(element => { element.scrollTop = element.scrollHeight; element.focus({ preventScroll: true }); });
  const details = scroll.getByRole('region', { name: 'Source dialog controls' }).locator('details');
  const summary = details.locator('summary');
  // From the scrolled rail's own tab stop, the browser must bring its first source
  // controls back into view. No click or programmatic focus on the action masks it.
  for (let step = 0; step < 4 && !await summary.evaluate(element => document.activeElement === element); step++)
    await page.keyboard.press('Tab');
  assert.equal(await summary.evaluate(element => document.activeElement === element), true, 'Source summary is not keyboard-reachable from the scrolled case reader');
  async function assertActionVisible(action, label) {
    const sample = await action.evaluate(element => {
      const scroll = element.closest('[data-reader-scroll]'), rect = item => item.getBoundingClientRect().toJSON();
      const box = rect(element), bounds = rect(scroll), hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return { action: rect(element), scroll: bounds, focused: document.activeElement === element, hit: hit === element || element.contains(hit) };
    });
    (result.caseReaderKeyboardSamples ??= []).push({ phase, label, ...sample });
    assert.ok(sample.focused && sample.hit && sample.action.top >= sample.scroll.top - 0.5 && sample.action.bottom <= sample.scroll.bottom + 0.5,
      `${phase}: ${label} is clipped or obscured after keyboard scrolling`);
  }
  await assertActionVisible(summary, 'source-summary');
  if (await details.getAttribute('open') === null) await page.keyboard.press('Enter');
  const opener = details.getByRole('button', { name: `Claim ${claim.number}: ${claim.proposedLabel}`, exact: true });
  const count = await details.getByRole('button').count();
  for (let step = 0; step < count && !await opener.evaluate(element => document.activeElement === element); step++)
    await page.keyboard.press('Tab');
  await assertActionVisible(opener, 'claim-source-opener');
  await page.keyboard.press('Enter');
  await caseSourceDialog(page).waitFor({ state: 'visible' });
  assert.equal(await caseSourceDialog(page).evaluate(element => element.open && element.matches(':modal')), true, 'Keyboard sources must open a native modal dialog');
  return opener;
}
/** Keep actual DOM references, so a no-op key or a jump to another control cannot
 * satisfy containment. Only the initial Close focus is set programmatically;
 * every subsequent move and dismissal uses the real browser keyboard. */
async function exerciseSourceDialogKeyboard(page, dialog, result, phase) {
  const retained = await dialog.evaluateHandle(element => ({
    dialog: element,
    controls: [...element.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,[tabindex]')]
      .filter(control => control.tabIndex >= 0 && !control.closest('[hidden],[inert]') && control.getClientRects().length),
  }));
  try {
    const controls = await retained.evaluate(({ controls }) => controls.map(element => ({
      tag: element.tagName, name: (element.getAttribute('aria-label') || element.textContent).trim().slice(0, 180),
      href: element.getAttribute('href'), tabIndex: element.tabIndex,
    })));
    (result.caseSourceKeyboardControls ??= []).push({ phase, controls });
    assert.ok(controls.length >= 3, 'Native source dialog must expose Close, its scroll region and original source links');
    assert.equal(controls[0].name, 'Close sources');
    assert.ok(controls.some(control => control.tag === 'A' && control.href), 'Native source traversal must include real source links');
    assert.ok(controls.every(control => control.tabIndex === 0), 'Source dialog must use native DOM-order tab stops');
    async function record(label, expectedIndex) {
      const sample = await retained.evaluate(({ dialog, controls }) => ({
        open: dialog.open, modal: dialog.matches(':modal'), inDialog: dialog.contains(document.activeElement),
        hasDocumentFocus: document.hasFocus(), focusedIndex: controls.indexOf(document.activeElement),
        activeTag: document.activeElement?.tagName ?? null,
        activeName: (document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent || '').trim().slice(0, 180),
        connected: controls.every(element => element.isConnected && dialog.contains(element)),
      }));
      (result.caseSourceKeyboardSamples ??= []).push({ phase, label, expectedIndex, ...sample });
      const context = `${phase}: ${label}: ${JSON.stringify(sample)}`;
      assert.ok(sample.open && sample.modal && sample.connected, `Native source dialog changed during keyboard traversal: ${context}`);
      assert.equal(sample.inDialog, true, `Native dialog focus escaped: ${context}`);
      assert.equal(sample.focusedIndex, expectedIndex, `Native source keyboard order or boundary wrap failed: ${context}`);
    }
    await dialog.getByRole('button', { name: 'Close sources', exact: true }).focus();
    await record('initial-close', 0);
    await page.keyboard.press('Shift+Tab');
    await record('reverse-boundary', controls.length - 1);
    await page.keyboard.press('Tab');
    await record('forward-boundary', 0);
    for (let index = 1; index <= controls.length; index++) {
      await page.keyboard.press('Tab');
      await record('forward-traversal', index % controls.length);
    }
    for (let index = controls.length - 1; index >= 0; index--) {
      await page.keyboard.press('Shift+Tab');
      await record('reverse-traversal', index);
    }
  } finally { await retained.dispose(); }
}

async function closeClaimSources(page, opener, until) {
  await page.keyboard.press('Escape');
  await until(async () => !await caseSourceDialog(page).isVisible() && await opener.evaluate(element => document.activeElement === element), 'Source Escape did not restore its exact opener');
  assert.equal(await caseWorkspace(page).count(), 1, 'Source Escape incorrectly closed the workspace');
}

async function emittedCaseAssets(dist) {
  const names = await readdir(join(dist, 'assets'));
  const payload = [];
  for (const name of names.filter(name => name.endsWith('.js.map'))) {
    const map = JSON.parse(await readFile(join(dist, 'assets', name), 'utf8'));
    if (map.sources.some(source => /\/case-data\/runtime-transport\.ts$/.test(source))) payload.push(name.slice(0, -4));
  }
  assert.equal(payload.length, 1, 'Exactly one emitted shared case payload chunk is required');
  const find = prefix => { const files = names.filter(name => name.startsWith(prefix) && /\.(?:js|css)$/.test(name)); assert.ok(files.some(name => name.endsWith('.js')), `${prefix} emitted boundary missing`); return files; };
  return { workspace: find('CaseWorkspace-'), reader: find('reader-runtime-'), scene: find('attachScene-'), payload };
}
const requested = (result, names) => result.requests.filter(url => names.includes(basename(new URL(url).pathname)));
function assertNoDuplicateCodeRequests(result) {
  const code = result.requests.filter(url => /\.(?:js|css)$/.test(new URL(url).pathname));
  assert.equal(new Set(code).size, code.length, 'A JS/CSS resource was fetched more than once in the same page');
}
/** Count actual completed same-origin response bodies, including every newly loaded view.
 * Dist size comparison is independent of ResourceTiming's sometimes-zero transferSize. */
function accountResources(page, result, dist, origin, prefix) {
  const pending = [], rows = [], failed = [];
  pending.push(page.evaluate(() => performance.setResourceTimingBufferSize(4000)).catch(error => failed.push(String(error))));
  let stage = 'baseline-shell';
  const listener = response => {
    if (!response.url().startsWith(origin + prefix) || response.request().method() !== 'GET') return;
    const observedStage = stage;
    pending.push((async () => {
      const error = await response.finished(); if (error) throw error;
      const body = await response.body(), url = new URL(response.url());
      const local = url.pathname.slice(prefix.length) || 'index.html';
      const expected = await stat(join(dist, local));
      assert.equal(response.status(), 200); assert.equal(body.length, expected.size, `${local}: response-body byte mismatch`);
      rows.push({ stage: observedStage, url: response.url(), type: response.request().resourceType(), bodyBytes: body.length,
        contentLength: Number((await response.allHeaders())['content-length']), status: response.status() });
      assert.equal(rows.at(-1).contentLength, body.length);
    })().catch(error => { failed.push(String(error)); }));
  };
  page.on('response', listener);
  return {
    stage(value) { stage = value; },
    async finish() {
      for (let observed = -1; observed !== pending.length;) { observed = pending.length; await Promise.all(pending); }
      page.off('response', listener); assert.deepEqual(failed, [], 'Exact resource response accounting failed');
      const incremental = rows.filter(row => row.stage !== 'baseline-shell');
      const timing = await page.evaluate(() => performance.getEntriesByType('resource').map(row => ({ name: row.name, encodedBodySize: row.encodedBodySize, decodedBodySize: row.decodedBodySize, transferSize: row.transferSize })));
      for (const row of incremental) {
        const timed = timing.filter(entry => entry.name === row.url);
        assert.equal(timed.length, 1, `${row.url}: resource timing entry not unique`);
        assert.equal(timed[0].encodedBodySize, row.bodyBytes, `${row.url}: encoded response bytes differ`);
        assert.equal(timed[0].decodedBodySize, row.bodyBytes, `${row.url}: decoded response bytes differ`);
      }
      const phases = [...new Set(incremental.map(row => row.stage))].map(name => ({ name, resources: incremental.filter(row => row.stage === name).length,
        bodyBytes: incremental.filter(row => row.stage === name).reduce((total, row) => total + row.bodyBytes, 0) }));
      result.caseResources = { baseline: 'Completed shell before the explicit workspace action; pre-listener entry responses are not attributed to the workspace.', phases,
        allViewsIncrementalBodyBytes: incremental.reduce((total, row) => total + row.bodyBytes, 0), resources: incremental, timing };
      assertNoDuplicateCodeRequests(result);
      return result.caseResources;
    },
  };
}

/** Browser/device measurements are CI diagnostics, never a mobile hardware benchmark. */
async function installCaseResponsivenessProbe(context) {
  await context.addInitScript(() => {
    const review = { supported: typeof PerformanceObserver !== 'undefined' && (PerformanceObserver.supportedEntryTypes?.includes('longtask') ?? false), tasks: [] };
    window.__caseResponsivenessReview = review;
    if (review.supported) {
      const observer = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) review.tasks.push({ name: entry.name, startTime: entry.startTime, duration: entry.duration });
      });
      observer.observe({ type: 'longtask', buffered: true });
    }
  });
}
async function beginFirstCaseOpen(page) {
  return page.evaluate(() => performance.now());
}
async function recordFirstCaseOpen(page, result, startedAt, phase, assets) {
  const measurement = await page.evaluate(async startedAt => {
    // Two actual animation frames bracket the committed reader's first paint.
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const completedAt = performance.now(), review = window.__caseResponsivenessReview;
    return { milestone: 'first-complete-reader-paint', startedAt, completedAt, durationMs: completedAt - startedAt,
      viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
      userAgent: navigator.userAgent, touchPoints: navigator.maxTouchPoints,
      longTasksSupported: review?.supported ?? false,
      longTasks: (review?.tasks ?? []).filter(task => task.startTime <= completedAt && task.startTime + task.duration >= startedAt),
      resources: performance.getEntriesByType('resource').filter(entry => entry.startTime >= startedAt && /\.(?:js|css)$/.test(new URL(entry.name).pathname))
        .map(entry => ({ url: entry.name, startTime: entry.startTime, durationMs: entry.duration, transferSize: entry.transferSize,
          encodedBodySize: entry.encodedBodySize, decodedBodySize: entry.decodedBodySize })) };
  }, startedAt);
  const payload = measurement.resources.filter(row => assets.payload.includes(basename(new URL(row.url).pathname)));
  assert.equal(payload.length, 1, 'The first chosen case must fetch exactly one shared payload chunk');
  assert.ok(measurement.resources.some(row => assets.reader.includes(basename(new URL(row.url).pathname))), 'Reader code was absent from first-open resource accounting');
  for (const row of measurement.resources) {
    assert.ok(row.transferSize >= row.encodedBodySize && row.encodedBodySize > 0 && row.decodedBodySize >= row.encodedBodySize, `Incomplete first-open JS/CSS bytes: ${row.url}`);
  }
  (result.caseResponsiveness ??= []).push({ phase, environment: 'GitHub Actions Chromium software browser; viewport/touch emulation is not physical mobile hardware.',
    limitMs: 5000, ...measurement, totalTransferBytes: measurement.resources.reduce((sum, row) => sum + row.transferSize, 0),
    totalEncodedBodyBytes: measurement.resources.reduce((sum, row) => sum + row.encodedBodySize, 0),
    totalDecodedBodyBytes: measurement.resources.reduce((sum, row) => sum + row.decodedBodySize, 0),
    longTaskTotalMs: measurement.longTasks.reduce((sum, row) => sum + row.duration, 0) });
  assert.ok(measurement.durationMs <= 5000, `${phase}: first complete reader paint exceeded 5000 ms (${measurement.durationMs.toFixed(1)} ms)`);
}

export async function runCaseWorkspaceBrowserCases({ root, dist, output, scenario, capture, assertFullLoad, assertReaderOnly, assertSpatial, assertCountryBase, until, report, temporary, origin, prefix }) {
  assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Case browser cases run only in GitHub Actions');
  assert.equal(process.env.SPATIAL_BROWSER_REVIEW, 'github-actions', 'Explicit CI browser authorization is required');
  const { catalog, reference } = await loadCaseExpectation(root, temporary);
  const assets = await emittedCaseAssets(dist), files = catalog.cases;
  const coverage = { scope: 'GitHub-CI behavioral evidence; screenshots require independent assistant visual review. Portable checks do not prove browser behavior.',
    reference, readerCases: [], sceneCases: [], captures: [], failureCases: [], resources: [] };
  report.caseWorkspaceReference = reference;

  await scenario('36-case-opt-in-and-all-complete-readers', { query: '?mode=reading', budgetMs: 240000, beforeNavigation: installCaseResponsivenessProbe }, async (page, result) => {
    const resources = accountResources(page, result, dist, origin, prefix);
    await assertFullLoad(page, result); await assertReaderOnly(page, result);
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    const baseline = await geographySnapshot(page);
    for (const names of Object.values(assets)) assert.deepEqual(requested(result, names), [], 'Case code loaded before opt-in');
    resources.stage('case-chooser'); await openCaseWorkspace(page, until);
    assert.equal(await caseWorkspace(page).locator('[data-profile-id]').count(), CASE_COUNTS.cases);
    assert.deepEqual(await caseWorkspace(page).locator('[data-profile-id]').evaluateAll(items => items.map(item => item.dataset.profileId)), files.map(file => file.profileId));
    assert.deepEqual(requested(result, assets.reader), [], 'Opening the chooser loaded the reader');
    assert.deepEqual(requested(result, assets.payload), [], 'Opening the chooser loaded the shared case payload');
    assert.deepEqual(requested(result, assets.scene), [], 'Opening the chooser loaded scene code');
    await capture(page, result, 'nineteen-case-chooser-before-reader-opt-in');
    for (const [index, file] of files.entries()) {
      resources.stage(index === 0 ? 'first-complete-reader' : 'subsequent-complete-readers');
      const before = result.requests.length;
      const firstOpen = index === 0 ? await beginFirstCaseOpen(page) : null;
      await chooseCase(page, file, until);
      if (firstOpen !== null) await recordFirstCaseOpen(page, result, firstOpen, 'desktop-first-case', assets);
      const record = await assertCompleteCaseReader(page, file);
      coverage.readerCases.push(record);
      assert.deepEqual(requested(result, assets.scene), [], 'Complete reader fetched the case scene');
      await assertNoAdmission(page, baseline);
      await captureBand(page, result, capture, coverage, file, 'first-claim-readable', caseArticle(page, file.claims[0].claimId).locator(':scope > .ocd-evidence-content > h3'));
      if (file.claims.length >= 4 || file.readerFactIds.length || file.edges.length > file.claims.length ||
        file.claims.some(claim => claim.v2?.recursiveDependencyClaimIds.length || claim.v2?.nonAdditionGroupIds.length)) {
        const target = file.claims.find(claim => claim.v2?.nonAdditionGroupIds.length || claim.v2?.recursiveDependencyClaimIds.length) ?? file.claims.at(-1);
        const article = caseArticle(page, target.claimId);
        await captureBand(page, result, capture, coverage, file, 'dense-qualification-band', article.locator(':scope > .ocd-evidence-content > .ocd-mandatory').first());
        await captureBand(page, result, capture, coverage, file, 'dense-source-custody-band', article.locator(':scope > .ocd-evidence-content > .ocd-sources > li').first());
      }
      if (index > 0) assert.deepEqual(result.requests.slice(before).filter(url => /\.(?:js|css)$/.test(new URL(url).pathname)), [], 'Switching a selected case refetched reader JS/CSS');
    }
    assert.equal(coverage.readerCases.reduce((total, row) => total + row.claims.length, 0), CASE_COUNTS.claims);
    await assertReaderOnly(page, result);
    const resourceRecord = await resources.finish();
    for (const name of [...assets.workspace, ...assets.reader, ...assets.payload]) assert.ok(resourceRecord.resources.some(row => basename(new URL(row.url).pathname) === name), `Missing chooser/reader resource accounting: ${name}`);
    coverage.resources.push({ scenario: result.name, ...resourceRecord });
    result.notes.push('All 19 complete readers and 72 claim envelopes were checked against the original SHA-pinned accepted transport, including exact role predicates, source URLs/locators/date fields, flags, non-addition and recursive context. No rendering code was fetched by chooser or reader actions.');
  });

  await scenario('37-all-case-scenes-shared-canvas-exact-selection', { query: '', blockTiles: true, budgetMs: 240000 }, async (page, result) => {
    const resources = accountResources(page, result, dist, origin, prefix);
    const labelCoverage = createCaseLabelCoverage(files.map(file => file.id), async failure => {
      await capture(page, result, `${safeName(failure.caseId)}-${failure.phase}-label-geometry-failure`);
      return result.screenshots.at(-1);
    });
    result.caseLabelCoverage = { observations: labelCoverage.observations, failures: labelCoverage.failures };
    const completedLabelCases = [];
    await assertFullLoad(page, result); await assertSpatial(page); await assertCountryBase(page);
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    const baseline = await geographySnapshot(page), canvas = await page.locator('.webgl-host canvas').elementHandle();
    // Exercise the native closed-disclosure case; modal CSS must display credits
    // without changing this original user-controlled open state.
    const providerCredits = page.locator('.webgl-host .maplibregl-ctrl-attrib');
    for (let attempt = 0; attempt < 2 && await providerCredits.getAttribute('open') !== null; attempt++)
      await providerCredits.locator('.maplibregl-ctrl-attrib-button').click();
    assert.equal(await providerCredits.getAttribute('open'), null, 'Native attribution disclosure did not close');
    const chrome = await captureCaseChromeBaseline(page, result);
    const graphics = await page.evaluate(() => ({ contexts: window.__spatialReviewGraphics.contexts, draws: window.__spatialReviewGraphics.drawCalls }));
    assert.equal(graphics.contexts.length, 1, 'Shared-canvas review requires exactly one incumbent WebGL context');
    resources.stage('case-chooser'); await openCaseWorkspace(page, until);
    for (const [index, file] of files.entries()) {
      resources.stage(index === 0 ? 'first-complete-reader' : 'subsequent-case-switches');
      await chooseCase(page, file, until);
      resources.stage(index === 0 ? 'first-case-scene' : 'subsequent-case-scenes');
      await showCaseScene(page, until, result); await assertCaseFrame(page, file, until, result, 'initial', labelCoverage);
      await assertCaseChromeActive(page, result, chrome, `${file.id}:scene-active`);
      assert.equal(await canvas.evaluate(element => element.isConnected && element === document.querySelector('.webgl-host canvas')), true, 'A case replaced the incumbent canvas');
      assert.equal(await page.locator('canvas').count(), 1, 'Case scene created an extra canvas');
      assert.deepEqual(await page.evaluate(() => window.__spatialReviewGraphics.contexts), graphics.contexts, 'Case scene allocated another WebGL context');
      await assertNoAdmission(page, baseline);
      await caseRail(page).evaluate(element => { element.scrollTop = 0; });
      await capture(page, result, `${safeName(file.id)}-scene-with-evidence-rail`);
      coverage.captures.push({ caseId: file.id, band: 'case-scene-and-evidence-rail', file: result.screenshots.at(-1) });
      const edge = file.edges[0], node = file.nodes.find(item => item.id === edge.from);
      await evidence(page).locator(`[data-node-id=${quoted(node.id)}] button`).click();
      await until(async () => await caseWorkspace(page).getAttribute('data-case-selection') === node.id, 'Exact node selection did not reach the workspace');
      await assertCaseFrame(page, file, until, result, 'selected-node', labelCoverage);
      if (file.id === 'case:usa-koch') {
        const policy = JSON.parse(await caseWorkspace(page).getAttribute('data-case-readable-label-report'));
        const peripheralIds = ['case:usa-koch:node:gmu', 'case:usa-koch:node:ihs'];
        assert.equal(policy.status, 'ready');
        for (const id of peripheralIds) assert.ok(policy.deferredNodes.some(item => item.id === id && item.reason === 'outside-view'), `${id}: near-edge label must have an explicit off-view explanation`);
        assert.ok(!policy.deferredNodes.some(item => item.id === node.id), 'Selected Koch node was deferred');
        result.nearEdgeReadableLabelPolicy = { caseId: file.id, selection: node.id, ...policy };
      }

      await evidence(page).locator(`[data-edge-id=${quoted(edge.id)}] button`).click();
      await until(async () => await caseWorkspace(page).getAttribute('data-case-selection') === edge.id, 'Exact relation selection did not reach the workspace');
      await assertCaseFrame(page, file, until, result, 'selected-edge', labelCoverage, async () => {
        if(file.id!=='case:brazil-batista')return;
        const beforeScroll=await caseSurface(page).boundingBox(), beforeStatus=await caseWorkspace(page).locator('[data-case-label-status]').boundingBox();
        const selected=await caseWorkspace(page).getAttribute('data-case-selection');
        const scroll=await caseRail(page).evaluate(rail=>{rail.scrollTop=Math.min(600,rail.scrollHeight-rail.clientHeight);return rail.scrollTop;});
        await assertCaseLabelReadability(page,file,result,{phase:'rail-scroll-stability',requireReadablePolicy:true});
        assert.deepEqual(await caseSurface(page).boundingBox(),beforeScroll,'Rail scroll changed case board geometry');
        assert.deepEqual(await caseWorkspace(page).locator('[data-case-label-status]').boundingBox(),beforeStatus,'Rail scroll changed persistent status geometry');
        assert.equal(await caseRail(page).evaluate(rail=>rail.scrollTop),scroll,'Status publication reset evidence rail scroll');
        assert.equal(await caseWorkspace(page).getAttribute('data-case-selection'),selected,'Rail scroll changed exact selection');
      });
      for (const factId of file.readerFactIds) assert.equal(await caseArticle(page, factId).count(), 1, 'A reader-only fact disappeared in scene mode');
      if (file.claims.length >= 4) {
        await caseRail(page).evaluate(element => { element.scrollTop = 0; });
        await capture(page, result, `${safeName(file.id)}-exact-selected-edge`);
        coverage.captures.push({ caseId: file.id, band: 'exact-selected-edge', file: result.screenshots.at(-1) });
      }
      if (['case:usa-musk', 'case:public-office%2Findia-modi'].includes(file.id)) {
        // Repaired dense labels must retain exact selected-source access too.
        const claim = file.claims.find(item => item.claimId === edge.claimId);
        const opener = caseWorkspace(page).getByRole('button', { name: `Inspect selected claim ${claim.number}: ${claim.proposedLabel}`, exact: true });
        await opener.click(); const dialog = caseSourceDialog(page); await dialog.waitFor({ state: 'visible' });
        assertClaimEvidence(await readEvidenceDOM(dialog.locator('[data-reader-scroll] > .ocd-evidence-content')), claim, file);
        await dialog.getByRole('button', { name: 'Close sources', exact: true }).click();
        await until(async () => !await dialog.isVisible() && await caseWorkspace(page).getAttribute('data-case-selection') === edge.id && await opener.evaluate(element => document.activeElement === element), `${file.id}: dense label source inspection lost exact selection or opener`);
        await assertCaseFrame(page, file, until, result, 'selected-edge-after-source-dialog', labelCoverage);
      }
      if (file.id === 'case:usa-musk') {
        await page.emulateMedia({ forcedColors: 'active' });
        assert.equal(await page.evaluate(() => matchMedia('(forced-colors: active)').matches), true);
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await assertCaseFrame(page, file, until, result, 'selected-edge-forced-colors', labelCoverage);
        await capture(page, result, `${safeName(file.id)}-selected-labels-forced-colors`);
        coverage.captures.push({ caseId: file.id, band: 'selected-labels-forced-colors', file: result.screenshots.at(-1) });
        await page.emulateMedia({ forcedColors: 'none' });
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await assertCaseFrame(page, file, until, result, 'selected-edge-restored-colors', labelCoverage);
      }
      await assertNoAdmission(page, baseline);
      completedLabelCases.push(file.id);
      coverage.sceneCases.push({ id: file.id, selectedNodeId: node.id, selectedEdgeId: edge.id, readerOnlyFactIds: [...file.readerFactIds] });
    }
    assert.ok(await page.evaluate(() => window.__spatialReviewGraphics.drawCalls) > graphics.draws, 'No real shared-context drawing was observed');
    await caseWorkspace(page).getByRole('button', { name: 'Close workspace', exact: true }).click();
    await until(async () => await caseWorkspace(page).count() === 0 && await page.locator('.selected-cases-launcher').evaluate(element => document.activeElement === element), 'Close did not restore atlas launcher focus');
    await assertCaseChromeRestored(page, result, chrome);
    await chrome.retained.dispose();
    const resourceRecord = await resources.finish();
    for (const name of Object.values(assets).flat()) assert.ok(resourceRecord.resources.some(row => basename(new URL(row.url).pathname) === name), `Missing all-view resource accounting: ${name}`);
    coverage.resources.push({ scenario: result.name, ...resourceRecord });
    result.caseLabelCoverage.summary = labelCoverage.finish(completedLabelCases);
    result.notes.push('All 19 cases completed real scene/composite draws using the same live canvas/context. Projected labels and exact selected node/edge IDs were checked against retained records. Global geographic pose, registry counts and admission flags stayed unchanged. GL fault, resource-lifecycle and context-loss probes belong to cases 40+.');
  });

  await scenario('38-native-sources-keyboard-compact-and-reduced-motion', { query: '', blockTiles: true, reducedMotion: true, budgetMs: 180000 }, async (page, result) => {
    await assertFullLoad(page, result); await assertSpatial(page); await assertCountryBase(page);
    const file = files.find(item => item.profileId === 'profile:usa-alphabet-founders');
    const claim = [...file.claims].sort((a, b) => (b.v2?.recursiveDependencyClaimIds.length ?? 0) - (a.v2?.recursiveDependencyClaimIds.length ?? 0))[0];
    await openCaseWorkspace(page, until); await chooseCase(page, file, until);
    const baseline = await geographySnapshot(page);
    await showCaseScene(page, until, result);
    assert.equal(await caseWorkspace(page).getAttribute('data-case-motion'), 'false');
    const edge = file.edges[0];
    await evidence(page).locator(`[data-edge-id=${quoted(edge.id)}] button`).click();
    assert.equal(await caseWorkspace(page).getAttribute('data-case-motion'), 'false', 'Reduced-motion selection started travel');
    await assertCaseFrame(page, file, until, result, 'reduced-motion-selection');
    const beforeQuality = await caseSurface(page).evaluate(element => ({ width: Number(element.dataset.caseTargetWidth), height: Number(element.dataset.caseTargetHeight) }));
    await caseWorkspace(page).getByRole('button', { name: 'Low quality off', exact: true }).click();
    await until(async () => await caseWorkspace(page).getAttribute('data-case-quality') === '0.65' &&
      Number(await caseSurface(page).getAttribute('data-case-target-width')) < beforeQuality.width &&
      Number(await caseSurface(page).getAttribute('data-case-target-height')) < beforeQuality.height, 'Low quality did not reduce the physical offscreen target');
    await assertCaseFrame(page, file, until, result, 'low-quality');
    await caseSurface(page).focus();
    const shortcuts = await caseSurface(page).evaluate(element => ['+', '-', '0'].flatMap(key => ['ctrlKey', 'metaKey'].map(modifier => {
      const event = new KeyboardEvent('keydown', { key, [modifier]: true, bubbles: true, cancelable: true });
      element.dispatchEvent(event); return { key, modifier, defaultPrevented: event.defaultPrevented };
    })));
    assert.ok(shortcuts.every(event => !event.defaultPrevented), 'Case board swallowed browser zoom shortcuts');
    result.caseZoomShortcutEvents = shortcuts;
    result.notes.push('Browser zoom shortcut pass-through is checked with cancelable Ctrl/Meta events. The 640×450 viewport separately exercises an effective 200%-zoom layout; it is not represented as native browser-UI zoom automation.');
    await assertNoAdmission(page, baseline);
    await showCompleteCaseReader(page, until);
    await assertCompleteCaseReader(page, file);
    for (const [phase, viewport] of [['desktop', { width: 1440, height: 1000 }], ['compact-320', { width: 320, height: 844 }], ['effective-640x450', { width: 640, height: 450 }]]) {
      await page.setViewportSize(viewport);
      await until(async () => await caseWorkspace(page).getAttribute('data-case-compact') === String(phase !== 'desktop'), `${phase}: responsive compact state missing`);
      if (phase !== 'desktop') {
        const offset = result.requests.length;
        await viewControls(page).getByRole('button', { name: 'Case scene', exact: true }).click();
        assert.equal(await caseWorkspace(page).getAttribute('data-case-view'), 'list');
        assert.equal(await caseSurface(page).count(), 0, 'Compact scene attempt created a case surface');
        includesText(await caseRail(page).innerText(), 'This viewport is too small', phase);
        assert.deepEqual(result.requests.slice(offset).filter(url => assets.scene.includes(basename(new URL(url).pathname))), []);
        await assertCompleteCaseReader(page, file);
        await captureBand(page, result, capture, coverage, file, `${phase}-complete-reader`, caseArticle(page, file.claims[0].claimId).locator(':scope > .ocd-evidence-content > h3'));
      }
      const opener = await openClaimSourcesByKeyboard(page, claim, result, phase), dialog = caseSourceDialog(page);
      assertClaimEvidence(await readEvidenceDOM(dialog.locator('[data-reader-scroll] > .ocd-evidence-content')), claim, file);
      await measureReaderLayout(dialog, result, `${phase}:source-open`);
      await exerciseReaderScroll(page, dialog, result, `${phase}:source-scroll`);
      await dialog.locator('[data-reader-scroll]').evaluate(element => { element.scrollTop = 0; });
      await capture(page, result, `${phase}-native-source-controls-and-first-claim`);
      coverage.captures.push({ caseId: file.id, band: `${phase}-native-source-dialog`, file: result.screenshots.at(-1) });
      await exerciseSourceDialogKeyboard(page, dialog, result, phase);
      // Close remains reachable after both traversal directions and works by
      // keyboard activation. Reopen from the exact restored opener for Escape.
      await page.keyboard.press('Enter');
      await until(async () => !await dialog.isVisible() && await opener.evaluate(element => document.activeElement === element), `${phase}: keyboard Close did not restore its exact opener`);
      assert.equal(await caseWorkspace(page).count(), 1, 'Source Close incorrectly closed the workspace');
      await page.keyboard.press('Enter');
      await dialog.waitFor({ state: 'visible' });
      assert.equal(await dialog.evaluate(element => element.open && element.matches(':modal')), true, 'Keyboard source reopen must remain native');
      await closeClaimSources(page, opener, until);
      const dimensions = await caseWorkspace(page).evaluate(element => ({ width: innerWidth, documentWidth: document.documentElement.scrollWidth, workspaceWidth: element.scrollWidth, clientWidth: element.clientWidth }));
      assert.ok(dimensions.documentWidth <= dimensions.width + 1 && dimensions.workspaceWidth <= dimensions.clientWidth + 1, `${phase}: horizontal overflow`);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await until(async () => await caseWorkspace(page).getAttribute('data-case-compact') === 'false', 'Desktop compact fallback did not clear');
    await showCaseScene(page, until, result);
    await page.setViewportSize({ width: 640, height: 450 });
    await until(async () => await caseWorkspace(page).getAttribute('data-case-view') === 'list' && await caseSurface(page).count() === 0, 'Live scene did not fall back to the complete reader after a compact resize');
    await assertCompleteCaseReader(page, file);
    // Above the compact breakpoint, use actual settled geometry to distinguish
    // readable scene coverage from explicit complete-reader fallback.
    const shortFile = files.find(item => item.profileId === 'profile:usa-musk');
    await page.setViewportSize({ width: 1440, height: 1000 });
    await until(async () => await caseWorkspace(page).getAttribute('data-case-compact') === 'false', 'Readable-policy desktop baseline remained compact');
    await chooseCase(page, shortFile, until);
    await showCaseScene(page, until, result, 'readable-policy-default');
    await assertCaseFrame(page, shortFile, until, result, 'initial');
    const shortEdge = shortFile.edges[0];
    await evidence(page).locator(`[data-edge-id=${quoted(shortEdge.id)}] button`).click();
    await assertCaseFrame(page, shortFile, until, result, 'readable-policy-selected');
    await caseWorkspace(page).getByRole('button', { name: 'Fit case', exact: true }).click();
    await assertCaseFrame(page, shortFile, until, result, 'initial');
    assert.equal(await caseWorkspace(page).getAttribute('data-case-selection'), shortEdge.id, 'Fit changed exact selection');
    await caseSurface(page).focus();
    await page.setViewportSize({ width: 901, height: 651 });
    await until(async () => {
      const report = JSON.parse(await caseWorkspace(page).getAttribute('data-case-readable-label-report') ?? 'null');
      return await caseWorkspace(page).getAttribute('data-case-view') === 'list' && report?.status === 'insufficient';
    }, 'Supported short board did not report measured readable-label insufficiency', 15000);
    const shortReport = JSON.parse(await caseWorkspace(page).getAttribute('data-case-readable-label-report'));
    assert.equal(await caseWorkspace(page).getAttribute('data-case-compact'), 'false', '901×651 was incorrectly treated as compact');
    assert.equal(shortReport.requireAll, true);
    assert.ok(shortReport.board.width >= 240 && shortReport.board.height >= 180, 'Short board was not a viable scene surface');
    assert.ok(shortReport.board.width < 901 && shortReport.board.height < 651, 'Fallback lacks actual measured board bounds');
    assert.ok(shortReport.failures.length > 0 && shortReport.failures.some(item => ['collision', 'outside-view', 'no-role-placement'].includes(item.reason)), 'Fallback lacks a measured mandatory geometry failure');
    assert.deepEqual(shortReport.deferredNodes, []); assert.deepEqual(shortReport.deferredRoles, []);
    assert.equal(await caseSurface(page).count(), 0);
    assert.equal(await caseWorkspace(page).getAttribute('data-case-selection'), shortEdge.id);
    assert.equal(await caseWorkspace(page).locator('.cw-header h1').evaluate(element => document.activeElement === element), true, 'Removed board focus was not restored inside the workspace');
    const fallbackNotice = await caseWorkspace(page).locator('[data-case-auto-fallback-notice]').evaluate(element => {
      const rect=element.getBoundingClientRect(), rail=element.closest('[data-case-workspace]').querySelector('.cw-rail'), reader=rail.getBoundingClientRect();
      const points=[[rect.left+4,rect.top+4],[rect.right-4,rect.top+4],[rect.left+4,rect.bottom-4],[rect.right-4,rect.bottom-4],[(rect.left+rect.right)/2,(rect.top+rect.bottom)/2]];
      return { text:element.textContent, rect:rect.toJSON(), reader:reader.toJSON(), railScrollTop:rail.scrollTop,
        visible:element.checkVisibility({opacityProperty:true,visibilityProperty:true}),
        inViewport:rect.left>=0&&rect.top>=0&&rect.right<=innerWidth&&rect.bottom<=innerHeight,
        unobscured:points.every(([x,y])=>{const top=document.elementFromPoint(x,y);return top===element||element.contains(top);}) };
    });
    includesText(fallbackNotice.text, 'cannot fit the required full labels at a readable width', 'short-board fallback');
    assert.ok(fallbackNotice.visible && fallbackNotice.inViewport && fallbackNotice.unobscured, 'Automatic fallback reason is not actually visible');
    assert.ok(fallbackNotice.reader.height > 0 && fallbackNotice.reader.top >= fallbackNotice.rect.bottom && fallbackNotice.reader.bottom <= 651, 'Fallback banner obscures or removes the short reader');
    await assertCompleteCaseReader(page, shortFile);
    result.readableLabelShortBoard = { viewport: { width: 901, height: 651 }, outcome: 'complete-reader-fallback', sceneCoverage: false, selection: shortEdge.id, report: shortReport, fallbackNotice };
    await capture(page, result, 'supported-short-board-explicit-readable-label-fallback');
    const shortClaim = shortFile.claims.find(item => item.claimId === shortEdge.claimId);
    const shortOpener = await openClaimSourcesByKeyboard(page, shortClaim, result, 'readable-short-board');
    assertClaimEvidence(await readEvidenceDOM(caseSourceDialog(page).locator('[data-reader-scroll] > .ocd-evidence-content')), shortClaim, shortFile);
    await closeClaimSources(page, shortOpener, until);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await showCaseScene(page, until, result, 'readable-policy-reentry');
    await assertCaseFrame(page, shortFile, until, result, 'readable-policy-reentry');
    assert.equal(await caseWorkspace(page).getAttribute('data-case-selection'), shortEdge.id, 'Readable-policy retry lost retained selection');
    await assertNoAdmission(page, baseline);
    await capture(page, result, 'readable-label-default-desktop-reentry-with-retained-selection');
    // An already-open native source dialog owns focus through automatic fallback.
    await caseWorkspace(page).getByRole('button',{name:'Fit case',exact:true}).click();
    await assertCaseFrame(page,shortFile,until,result,'initial');
    const retainedDialogOpener=await openClaimSourcesByKeyboard(page,shortClaim,result,'readable-fallback-already-open-source');
    await page.setViewportSize({width:901,height:651});
    await until(async()=>await caseWorkspace(page).getAttribute('data-case-view')==='list'&&JSON.parse(await caseWorkspace(page).getAttribute('data-case-readable-label-report')??'null')?.status==='insufficient','Open-dialog readable fallback did not complete',15000);
    assert.equal(await caseSourceDialog(page).evaluate(dialog=>dialog.open&&dialog.contains(document.activeElement)),true,'Automatic fallback stole native source-dialog focus');
    assert.equal(await caseWorkspace(page).getAttribute('data-case-selection'),shortEdge.id);
    assertClaimEvidence(await readEvidenceDOM(caseSourceDialog(page).locator('[data-reader-scroll] > .ocd-evidence-content')),shortClaim,shortFile);
    await capture(page,result,'automatic-readable-fallback-retains-open-source-dialog');
    await closeClaimSources(page,retainedDialogOpener,until);
    const restoredReason=await caseWorkspace(page).locator('[data-case-auto-fallback-notice]').evaluate(element=>{const r=element.getBoundingClientRect();return {visible:element.checkVisibility({opacityProperty:true,visibilityProperty:true}),rect:r.toJSON(),unobscured:element.contains(document.elementFromPoint((r.left+r.right)/2,(r.top+r.bottom)/2))};});
    assert.ok(restoredReason.visible&&restoredReason.unobscured&&restoredReason.rect.top>=0&&restoredReason.rect.bottom<=651,'Closing sources did not reveal persistent fallback reason');
    result.readableLabelFallbackWithOpenSources={selection:shortEdge.id,reason:restoredReason,sceneCoverage:false};
    await capture(page,result,'automatic-readable-fallback-visible-after-source-close');
    await page.setViewportSize({width:1440,height:1000});
    await showCaseScene(page,until,result,'readable-policy-open-dialog-reentry');
    await assertCaseFrame(page,shortFile,until,result,'readable-policy-open-dialog-reentry');

    await page.keyboard.press('Escape');
    await until(async () => await caseWorkspace(page).count() === 0, 'Workspace Escape did not close');
    assert.equal(await page.getByRole('button', { name: 'Selected case files', exact: true }).evaluate(element => document.activeElement === element), true, 'Workspace failed to return focus to its atlas launcher');
    assertNoDuplicateCodeRequests(result);
  });

  await scenario('39a-reader-lazy-load-failure-and-clean-retry', { query: '?mode=reading', budgetMs: 120000,
    beforeNavigation: async (context, result) => {
      await context.route(url => assets.reader.some(name => name.endsWith('.js') && basename(url.pathname) === name), route => {
        result.expectedFailedRequests.push(route.request().url()); return route.abort('failed');
      });
    } }, async (page, result) => {
    await assertFullLoad(page, result); await assertReaderOnly(page, result);
    await openCaseWorkspace(page, until);
    await caseWorkspace(page).locator(`[data-profile-id=${quoted(files[0].profileId)}]`).click();
    await until(async () => (await caseWorkspace(page).innerText()).includes('The reviewed reader could not load.'), 'Reader load failure was not announced');
    assert.equal(await caseWorkspace(page).getAttribute('data-case-view'), 'chooser');
    assert.equal(await caseWorkspace(page).locator('[data-profile-id]').count(), CASE_COUNTS.cases);
    assert.equal(await evidence(page).count(), 0, 'A failed lazy reader presented unverified evidence');
    await capture(page, result, 'reader-failure-keeps-chooser-and-base-atlas');
    await caseWorkspace(page).getByRole('button', { name: 'Close workspace', exact: true }).click();
    await assertFullLoad(page, result); await assertReaderOnly(page, result);
    await page.context().unrouteAll({ behavior: 'wait' });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await assertFullLoad(page, result);
    await openCaseWorkspace(page, until); await chooseCase(page, files[0], until);
    await assertCompleteCaseReader(page, files[0]); await assertReaderOnly(page, result);
    coverage.failureCases.push({ id: 'reader-import', result: 'Explicit failure retains the 19-case chooser and complete baseline registry; a clean reload after transport recovery restores complete case evidence.', scenario: result.name });
    result.notes.push('An initially failed reader import cannot already contain case evidence. This scenario checks truthful failure, preserved baseline access and a clean-page retry rather than claiming the unavailable case reader survived.');
  });

  await scenario('39b-scene-lazy-load-failure-retains-complete-reader', { query: '', blockTiles: true, budgetMs: 120000,
    beforeNavigation: async (context, result) => {
      await context.route(url => assets.scene.some(name => name.endsWith('.js') && basename(url.pathname) === name), route => {
        result.expectedFailedRequests.push(route.request().url()); return route.abort('failed');
      });
    } }, async (page, result) => {
    await assertFullLoad(page, result); await assertSpatial(page); await assertCountryBase(page);
    const file = files.find(item => item.profileId === 'profile:usa-musk');
    await openCaseWorkspace(page, until); await chooseCase(page, file, until);
    const edge = file.edges[0];
    await evidence(page).locator(`[data-edge-id=${quoted(edge.id)}] button`).click();
    await viewControls(page).getByRole('button', { name: 'Case scene', exact: true }).click();
    await until(async () => await caseWorkspace(page).getAttribute('data-case-view') === 'list' && (await caseRail(page).innerText()).includes('Case graphics are unavailable.'), 'Failed scene import did not return to the complete reader');
    assert.equal(await caseWorkspace(page).getAttribute('data-case-selection'), edge.id);
    await assertCompleteCaseReader(page, file);
    assert.equal(await viewControls(page).getByRole('button', { name: 'Back within case', exact: true }).isEnabled(), true, 'Scene failure lost selection history');
    const claim = file.claims.find(item => item.claimId === edge.claimId), opener = await openClaimSources(page, claim);
    assertClaimEvidence(await readEvidenceDOM(caseSourceDialog(page).locator('[data-reader-scroll] > .ocd-evidence-content')), claim, file);
    await measureReaderLayout(caseSourceDialog(page), result, 'scene-import-failure');
    await capture(page, result, 'failed-scene-complete-source-evidence'); await closeClaimSources(page, opener, until);
    assert.equal(await caseSurface(page).count(), 0);
    coverage.failureCases.push({ id: 'scene-import', caseId: file.id, selection: edge.id, result: 'Complete reader, source dialog and selection/history survive.', scenario: result.name });
  });

  await scenario('39c-webgl-unavailable-keeps-complete-case-reader', { query: '', unsupported: true, blockTiles: true, budgetMs: 120000 }, async (page, result) => {
    await assertFullLoad(page, result);
    await page.getByRole('region', { name: 'Accessible record reading mode' }).waitFor();
    const file = files.find(item => item.profileId === 'profile:india-adani');
    await openCaseWorkspace(page, until); await chooseCase(page, file, until);
    await viewControls(page).getByRole('button', { name: 'Case scene', exact: true }).click();
    await until(async () => await caseWorkspace(page).getAttribute('data-case-view') === 'list' && (await caseRail(page).innerText()).includes('Case graphics are unavailable.'), 'Unavailable WebGL did not retain the complete reader');
    await assertCompleteCaseReader(page, file);
    assert.equal(await caseSurface(page).count(), 0); assert.deepEqual(requested(result, assets.scene), []);
    const stats = await page.evaluate(() => window.__spatialReviewGraphics);
    assert.equal(stats.unsupportedRequested, true); assert.deepEqual(stats.contexts, []); assert.equal(stats.drawCalls, 0);
    const opener = await openClaimSources(page, file.claims[0]);
    await measureReaderLayout(caseSourceDialog(page), result, 'webgl-unavailable');
    await exerciseReaderScroll(page, caseSourceDialog(page), result, 'webgl-unavailable');
    await capture(page, result, 'webgl-unavailable-complete-source-reader'); await closeClaimSources(page, opener, until);
    coverage.failureCases.push({ id: 'webgl-unavailable', caseId: file.id, result: 'Complete case reader and native source dialog work with no WebGL context or draw.', scenario: result.name });
  });
  await scenario('39d-compact-first-reader-responsiveness', { query: '?mode=reading', viewport: { width: 320, height: 844 }, touch: true,
    reducedMotion: true, budgetMs: 120000, beforeNavigation: installCaseResponsivenessProbe }, async (page, result) => {
    const resources = accountResources(page, result, dist, origin, prefix);
    await assertFullLoad(page, result); await assertReaderOnly(page, result);
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    for (const names of Object.values(assets)) assert.deepEqual(requested(result, names), [], 'Compact shell fetched opt-in case code');
    resources.stage('compact-case-chooser'); await openCaseWorkspace(page, until);
    assert.deepEqual(requested(result, assets.reader), []);
    assert.deepEqual(requested(result, assets.payload), [], 'Compact chooser fetched the shared case payload before selection');
    const file = files.find(item => item.profileId === 'profile:usa-alphabet-founders');
    resources.stage('compact-first-complete-reader');
    const startedAt = await beginFirstCaseOpen(page);
    await chooseCase(page, file, until);
    await recordFirstCaseOpen(page, result, startedAt, 'compact-320-first-dense-case', assets);
    await assertCompleteCaseReader(page, file); await assertReaderOnly(page, result);
    assert.equal(await caseWorkspace(page).getAttribute('data-case-compact'), 'true');
    assert.deepEqual(requested(result, assets.scene), []);
    const sourceOpener = await openClaimSourcesByKeyboard(page, file.claims[0], result, 'compact-first-reader');
    await measureReaderLayout(caseSourceDialog(page), result, 'compact-first-reader:keyboard-source-open');
    await closeClaimSources(page, sourceOpener, until);
    await captureBand(page, result, capture, coverage, file, 'compact-320-first-open-readable', caseArticle(page, file.claims[0].claimId).locator(':scope > .ocd-evidence-content > h3'));
    coverage.resources.push({ scenario: result.name, ...await resources.finish() });
    result.notes.push('First-open completion, first-paint frames, actual JS/CSS transfer/body bytes and supported Long Tasks are measured on CI at 320×844 with touch/reduced-motion emulation. These values are not mobile-device performance measurements.');
  });
  await scenario('39e-workspace-chunk-failure-preserves-atlas-and-focus', { query: '?mode=reading', budgetMs: 120000,
    beforeNavigation: async (context, result) => {
      await context.route(url => assets.workspace.some(name => name.endsWith('.js') && basename(url.pathname) === name), route => {
        result.expectedFailedRequests.push(route.request().url()); return route.abort('failed');
      });
    } }, async (page, result) => {
    await assertFullLoad(page, result); await assertReaderOnly(page, result);
    const baseline = await geographySnapshot(page);
    const registrySnapshot = () => page.locator('.registry-reader').evaluate(element => ({ dataset: { ...element.dataset },
      records: [...element.querySelectorAll('[data-record-id]')].map(record => ({ id: record.dataset.recordId, text: record.textContent })) }));
    const registry = await registrySnapshot();
    const launcher = page.getByRole('button', { name: 'Selected case files', exact: true });
    const dialog = page.getByRole('dialog', { name: 'Case files unavailable', exact: true });
    for (const dismissal of ['close-button', 'escape']) {
      await launcher.click(); await dialog.waitFor({ state: 'visible' });
      assert.equal(await dialog.getAttribute('aria-modal'), 'true');
      includesText(await dialog.innerText(), 'The selected case files could not load. The atlas remains available.', 'Workspace import failure');
      assert.equal(await caseWorkspace(page).count(), 0, 'An unavailable chooser chunk created a workspace');
      const close = dialog.getByRole('button', { name: 'Close case files', exact: true });
      const detail = dialog.locator('summary');
      assert.equal(await close.count(), 1); assert.equal(await detail.count(), 1);
      assert.equal(normalized(await detail.innerText()), 'Technical detail');
      await until(async () => await close.evaluate(element => document.activeElement === element), 'Failure dialog did not focus Close');
      for (const [key, target] of [['Tab', detail], ['Tab', close], ['Shift+Tab', detail], ['Shift+Tab', close]]) {
        await page.keyboard.press(key);
        assert.equal(await target.evaluate(element => document.activeElement === element), true, `Failure dialog lost its two-target focus cycle on ${key}`);
      }
      const modifiedKeys = await dialog.evaluate(element => ['Escape', 'Tab', '+', '-', '0'].flatMap(key => ['ctrlKey', 'metaKey', 'altKey'].map(modifier => {
        const event = new KeyboardEvent('keydown', { key, [modifier]: true, bubbles: true, cancelable: true });
        element.dispatchEvent(event); return { key, modifier, defaultPrevented: event.defaultPrevented };
      })));
      assert.ok(modifiedKeys.every(event => !event.defaultPrevented), 'Failure dialog swallowed modified browser/system shortcuts');
      (result.caseFallbackModifierEvents ??= []).push({ dismissal, events: modifiedKeys });
      assert.equal(await dialog.isVisible(), true, 'A modified Escape incorrectly closed the error note');
      assert.notEqual(await page.locator('.evidence-app').getAttribute('inert'), null, 'Failure dialog left the atlas interactive behind it');
      assert.deepEqual(await geographySnapshot(page), baseline, 'Chooser import failure changed source registry/geography counts');
      assert.deepEqual(await registrySnapshot(), registry, 'Chooser import failure changed the retained registry reader');
      assert.deepEqual(requested(result, assets.reader), []); assert.deepEqual(requested(result, assets.payload), []); assert.deepEqual(requested(result, assets.scene), []);
      await capture(page, result, `workspace-import-failure-${dismissal}-focus-contained`);
      if (dismissal === 'close-button') await close.click(); else await page.keyboard.press('Escape');
      await until(async () => !await dialog.isVisible() && await launcher.evaluate(element => document.activeElement === element), `Failure ${dismissal} did not restore the exact launcher`);
      assert.equal(await page.locator('.evidence-app').getAttribute('inert'), null, 'Closing the error note left the atlas inert');
      await assertFullLoad(page, result); await assertReaderOnly(page, result);
      assert.deepEqual(await geographySnapshot(page), baseline); assert.deepEqual(await registrySnapshot(), registry);
    }
    assert.equal(result.expectedFailedRequests.length, 1, 'The chooser failure must record exactly its deliberately aborted JavaScript asset');
    await until(async () => result.requestsFailed.some(request => request.url === result.expectedFailedRequests[0]), 'The intentional chooser abort was not observed');
    assert.ok(assets.workspace.some(name => name.endsWith('.js') && basename(new URL(result.expectedFailedRequests[0]).pathname) === name));
    coverage.failureCases.push({ id: 'workspace-import', result: 'Explicit chunk failure preserves the complete atlas reader and source counts; Close and Escape restore the launcher, Tab/Shift+Tab contain both error-note targets, and modified shortcuts pass through.', scenario: result.name, abortedAssets: [...result.expectedFailedRequests] });
  });
  coverage.responsiveness = report.scenarios.flatMap(row => (row.caseResponsiveness ?? []).map(measurement => ({ scenario: row.name, ...measurement })));
  coverage.scenarios = report.scenarios.filter(row => /^(36|37|38|39[a-e])-/.test(row.name)).map(row => ({ name: row.name, status: row.status, error: row.error ?? null }));
  coverage.browserAcceptancePassed = coverage.scenarios.length === 8 && coverage.scenarios.every(row => row.status === 'passed');
  await writeFile(join(output, 'case-workspace-coverage-index.json'), JSON.stringify(coverage, null, 2) + '\n');
}
