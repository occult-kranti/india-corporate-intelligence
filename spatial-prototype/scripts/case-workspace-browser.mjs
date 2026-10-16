/** Selected-case browser acceptance. Imported by the guarded GitHub Actions harness only.
 * This module never imports Playwright or starts a browser. Node helpers are portable;
 * their success is not evidence that any browser acceptance scenario passed. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { measureReaderLayout, exerciseReaderScroll } from './reader-layout-review.mjs';

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
export async function showCaseScene(page, until) {
  await viewControls(page).getByRole('button', { name: 'Case scene', exact: true }).click();
  await until(async () => await caseWorkspace(page).getAttribute('data-case-view') === 'scene' &&
    Number(await caseSurface(page).getAttribute('data-case-frame-nodes')) > 0 &&
    Number(await caseSurface(page).getAttribute('data-case-scene-draws')) > 0 &&
    Number(await caseSurface(page).getAttribute('data-case-composite-draws')) > 0,
  'Case scene did not report a physical scene and composite draw', 30000);
  return caseSurface(page);
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

export async function assertCaseFrame(page, file, until, result, phase = 'frame') {
  await until(async () => Number(await caseSurface(page).getAttribute('data-case-frame-nodes')) === file.nodes.length &&
    Number(await caseSurface(page).getAttribute('data-case-scene-draws')) > 0 && Number(await caseSurface(page).getAttribute('data-case-composite-draws')) > 0 &&
    await caseWorkspace(page).getAttribute('data-case-motion') === 'false', `${file.id}: frame did not settle after physical draws`, 15000);
  const sample = await caseSurface(page).evaluate(surface => {
    const box = surface.getBoundingClientRect();
    const label = element => { const rect = element.getBoundingClientRect(); return { id: element.dataset.caseNodeId ?? element.dataset.caseEdgeId,
      text: element.textContent, selected: element.dataset.selected === 'true', x: rect.x, y: rect.y, width: rect.width, height: rect.height }; };
    return { dataset: { ...surface.dataset }, rect: box.toJSON(), viewport: { width: innerWidth, height: innerHeight },
      nodes: [...surface.querySelectorAll('[data-case-node-id]')].map(label), roles: [...surface.querySelectorAll('[data-case-edge-id]')].map(label) };
  });
  assert.ok(sample.rect.width >= 240 && sample.rect.height >= 180);
  assert.ok(sample.rect.x >= 0 && sample.rect.y >= 0 && sample.rect.right <= sample.viewport.width + 1 && sample.rect.bottom <= sample.viewport.height + 1);
  assert.ok(sample.nodes.length > 0 && sample.nodes.length <= file.nodes.length, `${file.id}: no projected node labels`);
  assert.ok(sample.roles.length <= Number(sample.dataset.caseFrameRoles));
  assert.equal(new Set(sample.nodes.map(row => row.id)).size, sample.nodes.length);
  assert.equal(new Set(sample.roles.map(row => row.id)).size, sample.roles.length);
  for (const row of sample.nodes) assert.equal(row.text, file.nodes.find(node => node.id === row.id)?.label, `${file.id}: exact node label`);
  for (const row of sample.roles) assert.equal(row.text, file.edges.find(edge => edge.id === row.id)?.role, `${file.id}: exact role label`);
  const selection = await caseWorkspace(page).getAttribute('data-case-selection');
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
async function positionBand(page, target, scroll = caseRail(page)) {
  await target.evaluate(element => {
    const scroller = element.closest('[data-reader-scroll]');
    if (!scroller) throw new Error('Capture target has no independently scrolling reader');
    scroller.scrollTop += element.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 20;
  });
  await page.waitForFunction(({ targetSelector, scrollSelector }) => {
    const target = document.querySelector(targetSelector), scroll = document.querySelector(scrollSelector);
    if (!target || !scroll) return false;
    const t = target.getBoundingClientRect(), s = scroll.getBoundingClientRect();
    return t.top >= s.top - 1 && t.top < s.bottom - 32;
  }, { targetSelector: await target.evaluate(element => { element.dataset.caseCaptureBand = 'current'; return '[data-case-capture-band="current"]'; }),
    scrollSelector: await scroll.evaluate(element => `[data-reader-scroll=${JSON.stringify(element.getAttribute('data-reader-scroll'))}]`) });
  await target.evaluate(element => { delete element.dataset.caseCaptureBand; });
}
async function captureBand(page, result, capture, coverage, file, label, target, scroll) {
  await positionBand(page, target, scroll);
  await capture(page, result, `${safeName(file.id)}-${label}`);
  coverage.captures.push({ caseId: file.id, band: label, file: result.screenshots.at(-1) });
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
    await assertFullLoad(page, result); await assertSpatial(page); await assertCountryBase(page);
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    const baseline = await geographySnapshot(page), canvas = await page.locator('.webgl-host canvas').elementHandle();
    const graphics = await page.evaluate(() => ({ contexts: window.__spatialReviewGraphics.contexts, draws: window.__spatialReviewGraphics.drawCalls }));
    assert.equal(graphics.contexts.length, 1, 'Shared-canvas review requires exactly one incumbent WebGL context');
    resources.stage('case-chooser'); await openCaseWorkspace(page, until);
    for (const [index, file] of files.entries()) {
      resources.stage(index === 0 ? 'first-complete-reader' : 'subsequent-case-switches');
      await chooseCase(page, file, until);
      resources.stage(index === 0 ? 'first-case-scene' : 'subsequent-case-scenes');
      await showCaseScene(page, until); await assertCaseFrame(page, file, until, result, 'initial');
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
      await assertCaseFrame(page, file, until, result, 'selected-node');
      await evidence(page).locator(`[data-edge-id=${quoted(edge.id)}] button`).click();
      await until(async () => await caseWorkspace(page).getAttribute('data-case-selection') === edge.id, 'Exact relation selection did not reach the workspace');
      await assertCaseFrame(page, file, until, result, 'selected-edge');
      for (const factId of file.readerFactIds) assert.equal(await caseArticle(page, factId).count(), 1, 'A reader-only fact disappeared in scene mode');
      if (file.claims.length >= 4) {
        await caseRail(page).evaluate(element => { element.scrollTop = 0; });
        await capture(page, result, `${safeName(file.id)}-exact-selected-edge`);
        coverage.captures.push({ caseId: file.id, band: 'exact-selected-edge', file: result.screenshots.at(-1) });
      }
      await assertNoAdmission(page, baseline);
      coverage.sceneCases.push({ id: file.id, selectedNodeId: node.id, selectedEdgeId: edge.id, readerOnlyFactIds: [...file.readerFactIds] });
    }
    assert.ok(await page.evaluate(() => window.__spatialReviewGraphics.drawCalls) > graphics.draws, 'No real shared-context drawing was observed');
    const resourceRecord = await resources.finish();
    for (const name of Object.values(assets).flat()) assert.ok(resourceRecord.resources.some(row => basename(new URL(row.url).pathname) === name), `Missing all-view resource accounting: ${name}`);
    coverage.resources.push({ scenario: result.name, ...resourceRecord });
    result.notes.push('All 19 cases completed real scene/composite draws using the same live canvas/context. Projected labels and exact selected node/edge IDs were checked against retained records. Global geographic pose, registry counts and admission flags stayed unchanged. GL fault, resource-lifecycle and context-loss probes belong to cases 40+.');
  });

  await scenario('38-native-sources-keyboard-compact-and-reduced-motion', { query: '', blockTiles: true, reducedMotion: true, budgetMs: 180000 }, async (page, result) => {
    await assertFullLoad(page, result); await assertSpatial(page); await assertCountryBase(page);
    const file = files.find(item => item.profileId === 'profile:usa-alphabet-founders');
    const claim = [...file.claims].sort((a, b) => (b.v2?.recursiveDependencyClaimIds.length ?? 0) - (a.v2?.recursiveDependencyClaimIds.length ?? 0))[0];
    await openCaseWorkspace(page, until); await chooseCase(page, file, until);
    const baseline = await geographySnapshot(page);
    await showCaseScene(page, until);
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
      const opener = await openClaimSources(page, claim), dialog = caseSourceDialog(page);
      assertClaimEvidence(await readEvidenceDOM(dialog.locator('[data-reader-scroll] > .ocd-evidence-content')), claim, file);
      await measureReaderLayout(dialog, result, `${phase}:source-open`);
      await exerciseReaderScroll(page, dialog, result, `${phase}:source-scroll`);
      await dialog.locator('[data-reader-scroll]').evaluate(element => { element.scrollTop = 0; });
      await capture(page, result, `${phase}-native-source-controls-and-first-claim`);
      coverage.captures.push({ caseId: file.id, band: `${phase}-native-source-dialog`, file: result.screenshots.at(-1) });
      const close = dialog.getByRole('button', { name: 'Close sources', exact: true });
      await close.focus(); await page.keyboard.press('Shift+Tab');
      assert.equal(await dialog.evaluate(element => element.contains(document.activeElement)), true, 'Native dialog focus escaped on Shift+Tab');
      await page.keyboard.press('Tab');
      assert.equal(await dialog.evaluate(element => element.contains(document.activeElement)), true, 'Native dialog focus escaped on Tab');
      await closeClaimSources(page, opener, until);
      const dimensions = await caseWorkspace(page).evaluate(element => ({ width: innerWidth, documentWidth: document.documentElement.scrollWidth, workspaceWidth: element.scrollWidth, clientWidth: element.clientWidth }));
      assert.ok(dimensions.documentWidth <= dimensions.width + 1 && dimensions.workspaceWidth <= dimensions.clientWidth + 1, `${phase}: horizontal overflow`);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await until(async () => await caseWorkspace(page).getAttribute('data-case-compact') === 'false', 'Desktop compact fallback did not clear');
    await showCaseScene(page, until);
    await page.setViewportSize({ width: 640, height: 450 });
    await until(async () => await caseWorkspace(page).getAttribute('data-case-view') === 'list' && await caseSurface(page).count() === 0, 'Live scene did not fall back to the complete reader after a compact resize');
    await assertCompleteCaseReader(page, file);
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
