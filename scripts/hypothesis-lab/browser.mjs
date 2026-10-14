#!/usr/bin/env node
/** User journeys against built or deployed bytes, with receipts outside the repository. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, isAbsolute, relative, resolve } from 'node:path';
import { chromium } from 'playwright';
import { expect as playwrightExpect } from 'playwright/test';

const expect = playwrightExpect.configure({ timeout: 45000 });
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const digest = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const bundlePath = 'research/hypothesis-lab/bundle.json', bundle = read(bundlePath);
const cases = bundle.streams.flatMap(stream => stream.cases.map(item => ({ ...item, track: stream.track })));
const sources = new Map(bundle.streams.flatMap(stream => stream.sources).map(row => [row.id, row]));
const entities = new Map(bundle.streams.flatMap(stream => stream.entities).map(row => [row.id, row]));
const edges = new Map(bundle.streams.flatMap(stream => stream.edges).map(row => [row.id, row]));
const out = resolve(process.env.HYPOTHESIS_BROWSER_ARTIFACTS ?? '/tmp/hypothesis-lab-browser');
const rel = relative(process.cwd(), out);
assert.ok(rel === '..' || rel.startsWith('../') || isAbsolute(rel), 'Acceptance artifacts must stay outside the repository');
mkdirSync(out, { recursive: true });
const fingerprints = Object.fromEntries([bundlePath, 'research/hypothesis-lab/coverage.json', 'src/data/hypothesisLab.ts', 'src/pages/HypothesisLab.tsx', 'src/pages/hypothesis-lab.css', 'scripts/hypothesis-lab/browser.mjs'].map(path => [path, digest(path)]));
const checks = [], errors = [], consoleErrors = [], failedRequests = [], badResponses = [], geometry = [], exportedPackets = [];
const check = (condition, message) => { assert.ok(condition, message); checks.push(message); };
const equals = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks.push(message); };
const attr = (name, value) => `[${name}=${JSON.stringify(value)}]`;
const clean = text => text.replace(/\s+/gu, ' ').trim();
check(bundle.streams.length === 3 && cases.length > 0, 'The reviewed three-stream bundle is available');
for (const input of bundle.streamHashes) equals(digest(input.path), input.sha256, `Current stream bytes match bundle: ${input.path}`);

let server, base = process.env.INVESTIGATION_BASE_URL;
if (!base) {
  const dist = resolve(process.env.INVESTIGATION_DIST ?? 'dist');
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.ico': 'image/x-icon' };
  server = createServer((request, response) => {
    try {
      const path = new URL(request.url, 'http://localhost').pathname;
      const file = resolve(dist, `.${path === '/' ? '/index.html' : decodeURIComponent(path)}`);
      if (!file.startsWith(`${dist}/`)) return response.writeHead(403).end();
      response.writeHead(200, { 'content-type': mime[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
    } catch { response.writeHead(404).end(); }
  });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  base = `http://127.0.0.1:${server.address().port}`;
}
base = base.replace(/\/$/u, '');
const binary = process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/usr/bin/chromium';
const browser = await chromium.launch(existsSync(binary) ? { executablePath: binary } : {});
const context = await browser.newContext({ viewport: { width: 1440, height: 1080 }, reducedMotion: 'reduce', acceptDownloads: true });
const page = await context.newPage();
page.setDefaultTimeout(45000);
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
page.on('requestfailed', request => failedRequests.push({ url: request.url(), failure: request.failure()?.errorText }));
page.on('response', response => { if (response.url().startsWith(base) && response.status() >= 400) badResponses.push({ url: response.url(), status: response.status() }); });
const desk = page.locator('[data-hypothesis-desk]'), sourceDialog = page.locator('.hl-source-dialog'), reader = page.locator('.atlas-evidence-popover');
const trackControl = page.getByRole('combobox', { name: 'Research theme', exact: true });
const assessmentControl = page.getByRole('combobox', { name: 'Current assessment', exact: true });
const search = page.getByRole('searchbox', { name: 'Find a hypothesis file', exact: true });
const params = () => new URLSearchParams(new URL(page.url()).hash.split('?')[1] ?? '');
const route = values => `${base}/#/hypothesis-lab${Object.keys(values).length ? `?${new URLSearchParams(values)}` : ''}`;
async function waitParams(values) { await expect.poll(() => Object.fromEntries(Object.keys(values).map(key => [key, params().get(key)]))).toEqual(values); }
async function goto(values = {}) {
  await page.goto(route(values), { waitUntil: 'domcontentloaded' });
  await expect(desk).toBeVisible();
  const item = cases.find(row => row.id === values.hl_case) ?? cases[0];
  await expect(desk).toHaveAttribute('data-hl-case', item.id);
  await expect(desk.locator('.hl-map-heading h2')).toHaveText(item.title);
  await expect(desk.locator('[data-hl-view]')).toHaveAttribute('data-hl-view', values.hl_view === 'network' ? 'network' : 'map');
}
async function choose(item) {
  await desk.locator(attr('data-hl-choice', item.id)).click();
  await waitParams({ hl_case: item.id });
  await expect(desk).toHaveAttribute('data-hl-case', item.id);
  await expect(desk.locator('.hl-map-heading h2')).toHaveText(item.title);
}
async function noOverflow(label) {
  await page.evaluate(() => document.fonts.ready);
  const result = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth, desk: document.querySelector('[data-hypothesis-desk]').getBoundingClientRect().toJSON() }));
  geometry.push({ label, ...result });
  check(result.document <= result.viewport + 1 && result.body <= result.viewport + 1, `${label}: no page horizontal overflow`);
  check(result.desk.x >= -1 && result.desk.right <= result.viewport + 1, `${label}: desk fits viewport`);
}
async function popupFits(locator, label) {
  const box = await locator.boundingBox(), viewport = page.viewportSize();
  geometry.push({ label, box, viewport });
  check(box && box.x >= -1 && box.x + box.width <= viewport.width + 1 && box.y >= -1 && box.y + box.height <= viewport.height + 1, `${label}: popup fits viewport`);
}
async function verifySource(source, opener) {
  await opener.focus(); await expect(opener).toBeFocused(); await page.keyboard.press('Enter');
  await expect(sourceDialog).toBeVisible();
  await waitParams({ hl_source: source.id });
  await expect(sourceDialog.getByRole('heading', { level: 2 })).toHaveText(source.title);
  await expect(sourceDialog.getByRole('link', { name: 'Open original source' })).toHaveAttribute('href', source.url);
  await expect(sourceDialog.getByRole('link', { name: 'Open original source' })).toHaveAttribute('rel', 'noopener noreferrer');
  const text = clean(await sourceDialog.innerText());
  for (const value of [source.publisher, source.inspection, source.locator, source.excerpt, source.kind, source.sourceFamily, source.accessedAt, ...source.limitations, ...(source.sha256 ? [source.sha256] : [])]) check(text.includes(clean(value)), `${source.id}: retained metadata ${clean(value).slice(0, 44)}`);
  if (source.capturePath) check((await sourceDialog.getByRole('link', { name: 'Inspect retained capture' }).getAttribute('href')).endsWith(source.capturePath), `${source.id}: original capture path retained`);
  await expect(sourceDialog.getByRole('button', { name: 'Close source reader' })).toBeFocused();
  await popupFits(sourceDialog, `${page.viewportSize().width}px source reader`);
  await page.screenshot({ path: resolve(out, `source-${page.viewportSize().width}-${source.id.replace(/:/gu, '-')}.png`) });
  await page.keyboard.press('Escape');
  await expect(sourceDialog).not.toBeVisible();
  await waitParams({ hl_source: null });
  await expect(opener).toBeFocused();
  check(true, `${source.id}: keyboard source open, Escape and focus restoration`);
}
function sourceClosure(packet, label) {
  const ids = new Set(packet.sources.map(row => row.id)), missing = [];
  const walk = value => {
    if (Array.isArray(value)) return value.forEach(walk);
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (key === 'sourceIds' || key === 'evidenceSourceIds') for (const id of child) { if (!ids.has(id)) missing.push(id); }
      else walk(child);
    }
  };
  walk(packet);
  equals([...new Set(missing)], [], `${label}: downloaded nested citations are source closed`);
}
async function exportCase(item) {
  const pending = page.waitForEvent('download');
  await desk.locator('[data-hl-export]').click();
  const download = await pending, target = resolve(out, download.suggestedFilename());
  await download.saveAs(target);
  const packet = read(target);
  equals(packet.case, item, `${item.id}: downloaded case preserves exact retained hypothesis, tests and decisions`);
  equals(packet.recordedEdges, item.edgeIds.map(id => edges.get(id)), `${item.id}: exact recorded links retain financial stages, status and response`);
  equals(packet.proposedLinks, item.hypothesis.proposedLinks, `${item.id}: unproved connections export separately from recorded edges`);
  check(!packet.recordedEdges.some(edge => packet.proposedLinks.some(link => link.id === edge.id)), `${item.id}: no proposed link is promoted to recorded evidence`);
  for (const source of packet.sources) assert.deepEqual(source, sources.get(source.id));
  sourceClosure(packet, item.id);
  equals([packet.aggregateAmount, packet.inferredCashFlow, packet.outcomeProbabilities], [null, false, null], `${item.id}: no pooled money total, inferred cash flow or invented probability`);
  check(/Entire research track/u.test(packet.rejectedJoinsScope), `${item.id}: rejected joins explicitly identify track-wide scope`);
  exportedPackets.push({ caseId: item.id, path: target, sha256: digest(target), sources: packet.sources.length });
}
async function network() {
  await desk.getByRole('group', { name: 'Hypothesis evidence view' }).getByRole('button', { name: 'Network', exact: true }).click();
  await waitParams({ hl_view: 'network' });
  await expect(desk.locator('[data-entity-id]').first()).toBeVisible();
}
async function toggleQuestions(enabled) {
  const checkbox = desk.locator('[data-hl-question-layer]');
  // Hash routing commits before React's controlled checkbox and graph rerender.
  // Assert both the starting state and eventual semantic state after a real click.
  if (enabled) await expect(checkbox).not.toBeChecked(); else await expect(checkbox).toBeChecked();
  await checkbox.click();
  if (enabled) await expect(checkbox).toBeChecked(); else await expect(checkbox).not.toBeChecked();
  await waitParams({ hl_questions: enabled ? '1' : null });
  await expect(desk.locator('[data-hl-questions-visible]')).toHaveAttribute('data-hl-questions-visible', String(enabled));
}

let failure;
try {
  await goto();
  await expect(desk.getByRole('heading', { level: 1 })).toHaveText('Coordination hypotheses');
  await expect(desk.locator('[data-hl-choice]')).toHaveCount(cases.length);
  await expect(desk.locator('[data-hl-question-layer]')).not.toBeChecked();
  await expect(desk.locator('[data-state-code]')).toHaveCount(36);
  await noOverflow('Desktop map');
  await page.screenshot({ path: resolve(out, 'desktop-map.png') });
  for (const item of cases) {
    await choose(item);
    await expect(desk.locator('.hl-assessment-reason')).toHaveText(item.hypothesis.assessmentReason);
    await expect(desk.locator('[data-hl-test]')).toHaveCount(item.hypothesis.tests.length);
    await expect(desk.locator('[data-hl-edge]')).toHaveCount(item.edgeIds.length);
    for (const alternative of item.hypothesis.alternatives) {
      const text = clean(await desk.locator(attr('data-hl-alternative', alternative.id)).innerText());
      check([alternative.label, alternative.explanation, alternative.discriminatingRecord].every(value => text.includes(clean(value))), `${item.id}: rival explanation and distinguishing record retained (${alternative.id})`);
    }
    for (const test of item.hypothesis.tests) {
      const article = desk.locator(attr('data-hl-test', test.id)), text = clean(await article.innerText());
      check([test.question, test.expectedIfTrue, test.expectedIfAlternative, test.observation].every(value => text.includes(clean(value))), `${test.id}: both predictions and actual observation retained`);
      await expect(article.locator('[data-result]')).toHaveAttribute('data-result', test.result);
    }
    for (const link of item.hypothesis.proposedLinks) {
      const text = clean(await desk.locator(attr('data-hl-proposed', link.id)).innerText());
      check([link.question, link.missingEvidence, link.disconfirmingEvidence].every(value => text.includes(clean(value))), `${link.id}: question has missing and disconfirming evidence`);
    }
    const decision = item.decisionAnalysis, decisionText = clean(await desk.locator('#hl-decisions').innerText());
    check([decision.observedOutcome, ...decision.hindsightLimits, ...decision.actors.flatMap(actor => [actor.authority, actor.incentive]), ...decision.options.flatMap(option => [option.label, option.expectedObservableOutcome])].every(value => decisionText.includes(clean(value))), `${item.id}: formal authority, options, observed outcomes and hindsight qualifications survive rendering`);
    await expect(desk.locator('.hl-timeline li')).toHaveCount(item.hypothesis.chronology.length);
    await exportCase(item);
  }

  await goto();
  for (const stream of bundle.streams) {
    await trackControl.selectOption(stream.track); await waitParams({ hl_track: stream.track });
    await expect.poll(() => desk.locator('[data-hl-choice]').evaluateAll(rows => rows.map(row => row.dataset.hlChoice))).toEqual(stream.cases.map(row => row.id));
    check(true, `${stream.track}: track filter has exact case membership, not only a matching count`);
  }
  await page.goBack(); await expect(trackControl).toHaveValue(bundle.streams.at(-2).track);
  await expect.poll(() => desk.locator('[data-hl-choice]').evaluateAll(rows => rows.map(row => row.dataset.hlChoice))).toEqual(bundle.streams.at(-2).cases.map(row => row.id));
  await page.goForward(); await expect(trackControl).toHaveValue(bundle.streams.at(-1).track);
  check(true, 'Browser Back and Forward restore filters and visible case membership');
  await desk.getByRole('button', { name: 'Clear filters', exact: true }).click();
  for (const assessment of [...new Set(cases.map(item => item.hypothesis.assessment))]) {
    await assessmentControl.selectOption(assessment); await waitParams({ hl_assessment: assessment });
    await expect.poll(() => desk.locator('[data-hl-choice]').evaluateAll(rows => rows.map(row => row.dataset.hlChoice))).toEqual(cases.filter(item => item.hypothesis.assessment === assessment).map(row => row.id));
    check(true, `${assessment}: assessment filter retains exact case membership`);
  }
  await assessmentControl.selectOption('');
  await search.fill(cases[0].title); await waitParams({ hl_q: cases[0].title });
  await expect(desk.locator(attr('data-hl-choice', cases[0].id))).toBeVisible();
  await search.fill('zzzz-no-hypothesis-file-736829');
  await expect(desk.locator('.hl-empty')).toContainText('not an absence of activity or wrongdoing');
  await expect(desk.locator('[data-hl-choice]')).toHaveCount(0);
  await desk.getByRole('button', { name: 'Show all hypothesis files' }).click();
  await search.fill('   '); await expect(desk.locator('[data-hl-choice]')).toHaveCount(cases.length);
  check(true, 'Search, empty state, recovery and whitespace query describe corpus coverage honestly');

  for (const stream of bundle.streams) {
    const item = cases.find(row => row.track === stream.track);
    await goto({ hl_case: item.id });
    const source = sources.get(item.hypothesis.tests[0].sourceIds[0]);
    await verifySource(source, desk.locator(attr('data-hl-test', item.hypothesis.tests[0].id)).locator(attr('data-hl-source', source.id)).first());
  }
  const interactive = cases.find(item => item.hypothesis.proposedLinks.some(link => entities.get(link.from)?.resolved && entities.get(link.to)?.resolved));
  check(!!interactive, 'At least one unproved question has explicitly resolved institutional endpoints for interaction testing');
  const question = interactive.hypothesis.proposedLinks.find(link => entities.get(link.from)?.resolved && entities.get(link.to)?.resolved), questionId = `question:${question.id}`;
  await goto({ hl_case: interactive.id });
  const placeIndex = desk.locator('.map-evidence-index');
  await placeIndex.locator(':scope > summary').click();
  const hubButton = placeIndex.locator('[data-map-hub]').first(), hubId = await hubButton.getAttribute('data-map-hub');
  await hubButton.click();
  const hub = desk.getByRole('region', { name: 'Selected state evidence' });
  await expect(hub).toBeVisible(); await waitParams({ hl_inspect: `state:${hubId}` });
  await hub.getByRole('tab', { name: /^Identities/u }).click();
  const mapIdentity = hub.locator('[data-hub-entity]').first(), mapIdentityId = await mapIdentity.getAttribute('data-hub-entity');
  await mapIdentity.getByRole('button').click();
  await expect(reader).toHaveAttribute('data-selection-id', mapIdentityId);
  await expect(reader.getByRole('heading', { level: 2 })).toHaveText(entities.get(mapIdentityId).label);
  await reader.getByRole('button', { name: /^← Back to .* index$/u }).click();
  await expect(hub).toBeVisible();
  await hub.getByRole('button', { name: 'Close place details' }).click(); await waitParams({ hl_inspect: null });
  check(true, 'Flat map place index opens an exact institutional identity and returns to the geographic case association');
  await desk.getByRole('button', { name: 'Read the investigation', exact: true }).click();
  await expect(desk.locator('.hl-reading')).toBeFocused();
  check(true, 'Reading action moves keyboard focus into the selected investigation');
  await network();
  await expect(desk.locator('[data-relationship-id^="question:"]')).toHaveCount(0);
  check(true, 'Default network contains no proposed-question edges');
  await toggleQuestions(true);
  const questionEdge = desk.locator(attr('data-relationship-id', questionId));
  await expect(questionEdge).toBeVisible();
  await expect(questionEdge).toHaveAttribute('data-traversable', 'false');
  await expect(questionEdge.locator('path[stroke-dasharray]')).not.toHaveAttribute('stroke-dasharray', '');
  check(true, 'Question layer reveals a dashed, explicitly non-traversable analytic edge');
  await page.screenshot({ path: resolve(out, 'desktop-network-questions.png') });
  const pendingMixed = page.waitForEvent('download');
  await desk.getByRole('button', { name: 'Export displayed links + questions', exact: true }).click();
  const mixedDownload = await pendingMixed, mixedPath = resolve(out, 'displayed-links-and-questions.json');
  await mixedDownload.saveAs(mixedPath);
  const mixed = read(mixedPath);
  check(mixed.interpretation.includes('not a factual trail') && !mixed.interpretation.startsWith('Source-backed evidence packet'), 'Shared graph export labels its mixed evidence/question closure explicitly');
  check(mixed.unestablishedQuestions.some(row => row.id === questionId) && !mixed.recordedRelationships.some(row => row.id === questionId), 'Shared graph download separates the selected analytic question from recorded relationships');
  sourceClosure(mixed, 'Shared graph export');
  await desk.getByRole('button', { name: 'Ledger', exact: true }).click();
  await desk.locator(attr('data-relationship-id', questionId)).locator('.iw-graph-relationship-button').click();
  await expect(reader).toHaveAttribute('data-selection-id', questionId);
  await expect(reader).toContainText(question.missingEvidence);
  await expect(reader).toContainText(question.disconfirmingEvidence);
  await expect(reader).toContainText('unestablished-question');
  await expect(reader.locator('.atlas-money-stage')).toHaveCount(0);
  await reader.getByRole('tab', { name: /^Sources/u }).click();
  await expect(reader.locator('.atlas-reader-tab-panel .atlas-source-row').first()).toBeVisible();
  await popupFits(reader, 'Desktop unestablished-question reader');
  await page.screenshot({ path: resolve(out, 'desktop-question-reader.png') });
  await page.keyboard.press('Escape'); await expect(reader).toHaveCount(0); await waitParams({ hl_inspect: null });
  check(true, 'Question popup preserves missing/disconfirming evidence, contextual citations and absence of money');
  await toggleQuestions(false);
  await expect(desk.locator('[data-relationship-id^="question:"]')).toHaveCount(0);
  check(true, 'Disabling question layer removes unproved connections from the network ledger');

  await goto({ hl_case: interactive.id, hl_view: 'network' });
  // A same-document hash navigation preserves the network's internal ledger tab.
  await desk.getByRole('button', { name: 'Graph', exact: true }).click();
  const node = desk.locator(attr('data-entity-id', question.from));
  await expect(node).toBeVisible();
  await node.focus(); await page.keyboard.press('Enter');
  await expect(reader).toHaveAttribute('data-selection-id', question.from);
  await expect(reader.getByRole('heading', { level: 2 })).toHaveText(entities.get(question.from).label);
  await reader.getByRole('tab', { name: /^Connections/u }).click();
  await expect(reader.locator('[data-connection-id]').first()).toBeVisible();
  const edgeId = await reader.locator('[data-connection-id]').first().getAttribute('data-connection-id');
  await reader.locator('[data-connection-id]').first().locator('.atlas-related-edge').click();
  await expect(reader).toHaveAttribute('data-selection-id', edgeId);
  await expect(reader).toContainText(edges.get(edgeId).stage);
  await expect(reader.locator('.atlas-response-preview')).toContainText(edges.get(edgeId).response);
  await reader.getByRole('button', { name: 'Back to previous evidence' }).click();
  await expect(reader).toHaveAttribute('data-selection-id', question.from);
  await page.keyboard.press('Escape'); await expect(reader).toHaveCount(0); await expect(node).toBeFocused();
  check(true, 'Keyboard node → exact recorded connection → response → Back → Escape restores focus');

  await goto({ hl_case: 'missing-case-736829' });
  await expect(desk.locator('.hl-notice')).toContainText('first matching file is shown');
  await goto({ hl_case: cases[0].id, hl_source: 'missing-source', hl_inspect: 'bogus:missing' });
  await expect(sourceDialog).not.toBeVisible(); await expect(reader).toHaveCount(0);
  check(true, 'Unknown case, source and malformed selection do not manufacture evidence');
  const directSource = sources.get(cases[0].sourceIds[0]);
  await goto({ hl_case: cases[0].id, hl_source: directSource.id });
  await expect(sourceDialog.getByRole('heading', { level: 2 })).toHaveText(directSource.title);
  await page.reload({ waitUntil: 'domcontentloaded' }); await expect(sourceDialog).toBeVisible();
  await page.keyboard.press('Escape'); await expect(sourceDialog).not.toBeVisible(); await waitParams({ hl_source: null });
  check(true, 'Source deep link survives reload and closes without losing its investigation');
  const coverage = read('research/hypothesis-lab/coverage.json');
  await expect(desk.locator('.hl-continuation details')).toHaveCount(coverage.length);
  equals(await desk.locator('.hl-continuation a').evaluateAll(rows => rows.map(row => row.getAttribute('href'))), coverage.map(row => `#${row.route}`), 'All wider-sector roadmap rows link to their retained routes');

  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await goto({ hl_case: cases.find(item => item.id !== interactive.id).id });
    const selector = desk.getByRole('combobox', { name: 'Selected hypothesis file', exact: true });
    await expect(selector).toBeVisible(); await expect(desk.locator('.hl-register')).not.toBeVisible();
    await selector.selectOption(interactive.id); await waitParams({ hl_case: interactive.id });
    await expect(desk).toHaveAttribute('data-hl-case', interactive.id);
    await noOverflow(`${width}px map and research file`);
    await page.screenshot({ path: resolve(out, `mobile-${width}-map.png`) });
    const source = sources.get(interactive.hypothesis.tests[0].sourceIds[0]);
    await verifySource(source, desk.locator(attr('data-hl-test', interactive.hypothesis.tests[0].id)).locator(attr('data-hl-source', source.id)).first());
    await network();
    await toggleQuestions(true);
    await expect(desk.locator(attr('data-relationship-id', questionId))).toHaveAttribute('data-traversable', 'false');
    await desk.getByRole('button', { name: 'Ledger', exact: true }).click();
    await desk.locator(attr('data-relationship-id', questionId)).locator('.iw-graph-relationship-button').click();
    await expect(reader).toHaveAttribute('data-selection-id', questionId);
    await popupFits(reader, `${width}px question reader`);
    await expect(reader).toContainText(question.disconfirmingEvidence);
    await page.screenshot({ path: resolve(out, `mobile-${width}-question-reader.png`) });
    await page.keyboard.press('Escape'); await expect(reader).toHaveCount(0);
    await noOverflow(`${width}px network ledger and remaining sectors`);
    check(true, `${width}px compact case selection, sources and unproved-question reader are functional`);
  }
  equals(errors, [], 'Desktop and mobile journeys have no uncaught browser errors');
  equals(failedRequests.filter(row => row.url.startsWith(base) && !row.failure?.includes('ERR_ABORTED')), [], 'Local application assets have no failed requests');
  equals(badResponses, [], 'Local application assets have no HTTP errors');
} catch (error) {
  failure = error; await page.screenshot({ path: resolve(out, 'failure.png') }).catch(() => {});
} finally {
  const report = { passed: !failure, completedAt: new Date().toISOString(), base, route: '/#/hypothesis-lab', browser: await browser.version(), reducedMotion: 'reduce', mapScope: 'Flat offline map and evidence interactions; availability of external cartographic tiles is not covered.', fingerprints, count: checks.length, checks, exportedPackets, geometry, errors, consoleErrors, failedRequests, badResponses, failure: failure ? { message: failure.message, stack: failure.stack, url: page.url() } : null };
  writeFileSync(resolve(out, 'acceptance.json'), `${JSON.stringify(report, null, 2)}\n`);
  await browser.close(); if (server) await new Promise(done => server.close(done));
}
if (failure) throw failure;
console.log(`Hypothesis browser acceptance passed: ${checks.length} checks; ${exportedPackets.length} exact downloaded packets. Artifacts: ${out}`);
