#!/usr/bin/env node
/** Acceptance against the built application; artifacts always stay outside the repository. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, relative, resolve } from 'node:path';
import { chromium } from 'playwright';
import { build } from 'esbuild';
import { expect as playwrightExpect } from 'playwright/test';

const expect = playwrightExpect.configure({ timeout: 45000 });
const root = process.cwd();
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const digest = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const bundlePath = 'research/funding-investigations/bundle.json';
const bundle = read(bundlePath);
const analysis = read('research/funding-investigations/analysis-ui.json');
const cases = bundle.streams.flatMap(stream => stream.cases.map(row => ({ ...row, track: stream.track })));
const sources = new Map(bundle.streams.flatMap(stream => stream.sources).map(row => [row.id, row]));
const entities = new Map(bundle.streams.flatMap(stream => stream.entities).map(row => [row.id, row]));
const edges = new Map(bundle.streams.flatMap(stream => stream.edges).map(row => [row.id, row]));
// The inherited atlas combines many namespaces; compile its public data adapter to
// compare the rendered sector population with the exact retained registry.
const compiled = await build({ entryPoints: ['src/data/fundingInvestigations.ts'], bundle: true, platform: 'node', format: 'cjs', write: false, logLevel: 'silent', target: 'node20' });
const adapterModule = { exports: {} };
new Function('module', 'exports', compiled.outputFiles[0].text)(adapterModule, adapterModule.exports);
const existingAtlas = adapterModule.exports.EXISTING_ATLAS;
const out = resolve(process.env.FUNDING_BROWSER_ARTIFACTS ?? '/tmp/funding-investigations-browser');
assert.ok(relative(root, out).startsWith('..'), 'Browser artifacts must be outside the repository');
mkdirSync(out, { recursive: true });
const checks = [], errors = [], consoleErrors = [], failedRequests = [], badResponses = [], geometry = [], exportedPackets = [];
const check = (condition, message) => { assert.ok(condition, message); checks.push(message); };
const equals = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks.push(message); };
const attr = (name, value) => `[${name}=${JSON.stringify(value)}]`;
const clean = text => text.replace(/\s+/gu, ' ').trim();
const fingerprints = Object.fromEntries([bundlePath, 'research/funding-investigations/analysis-ui.json', 'scripts/funding-investigations/browser.mjs', 'src/pages/FundingInvestigations.tsx', 'src/pages/FundingSearches.tsx', 'src/data/fundingInvestigations.ts', 'src/pages/funding-investigations.css'].map(path => [path, digest(path)]));
check(bundle.streams.length === 5 && cases.length >= 28, 'The browser accepts the complete reviewed bundle, not a placeholder');
for (const input of bundle.streamHashes ?? []) equals(digest(input.path), input.sha256, `Current stream matches the assembled bundle: ${input.path}`);

let server;
let base = process.env.INVESTIGATION_BASE_URL;
if (!base) {
  const dist = resolve(process.env.INVESTIGATION_DIST ?? 'dist');
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.ico': 'image/x-icon' };
  server = createServer((request, response) => {
    try {
      const pathname = new URL(request.url, 'http://localhost').pathname;
      const file = resolve(dist, `.${pathname === '/' ? '/index.html' : decodeURIComponent(pathname)}`);
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
const desk = page.locator('[data-funding-desk]');
const sourceDialog = page.locator('.fi-source-dialog');
const reader = page.locator('.atlas-evidence-popover');
const trackControl = page.getByRole('combobox', { name: 'Research track', exact: true });
const statusControl = page.getByRole('combobox', { name: 'Evidence status', exact: true });
const search = page.getByRole('searchbox', { name: 'Find a funding research file', exact: true });
const params = () => new URLSearchParams(new URL(page.url()).hash.split('?')[1] ?? '');
const route = values => `${base}/#/funding-investigations${Object.keys(values).length ? `?${new URLSearchParams(values)}` : ''}`;
async function waitParams(values) { await expect.poll(() => Object.fromEntries(Object.keys(values).map(key => [key, params().get(key)]))).toEqual(values); }
async function goto(values = {}) {
  await page.goto(route(values), { waitUntil: 'domcontentloaded' });
  await expect(desk).toBeVisible();
  await expect(desk).toHaveAttribute('data-fi-section', values.fi_section ?? 'cases');
  if (!values.fi_section) {
    const expected = cases.find(item => item.id === values.fi_case) ?? cases[0];
    await expect(desk).toHaveAttribute('data-fi-case', expected.id);
    await expect(desk.locator('.fi-map-heading h2')).toHaveText(expected.title);
    await expect(desk.locator('.fi-map-stage')).toHaveAttribute('data-fi-view', values.fi_view === 'network' ? 'network' : 'map');
  }
}
async function chooseCase(item) {
  await desk.locator(attr('data-fi-case-choice', item.id)).click();
  await waitParams({ fi_case: item.id });
  await expect(desk).toHaveAttribute('data-fi-case', item.id);
  await expect(desk.locator('.fi-map-heading h2')).toHaveText(item.title);
}
async function section(name, id) {
  const button = desk.getByRole('navigation', { name: 'Funding research sections' }).getByRole('button', { name, exact: name !== 'Research files' });
  await button.click();
  await expect(button).toHaveAttribute('aria-current', 'page');
  await expect(desk).toHaveAttribute('data-fi-section', id);
  await waitParams({ fi_section: id === 'cases' ? null : id });
  check(true, `${name}: the visible section and shareable URL agree`);
}
async function noOverflow(label) {
  await page.evaluate(() => document.fonts.ready);
  const result = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth, desk: document.querySelector('[data-funding-desk]').getBoundingClientRect().toJSON() }));
  geometry.push({ label, ...result });
  check(result.document <= result.viewport + 1 && result.body <= result.viewport + 1, `${label}: the page has no horizontal overflow`);
  check(result.desk.x >= -1 && result.desk.right <= result.viewport + 1, `${label}: the research desk fits the viewport`);
}
async function popupFits(locator, label) {
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  geometry.push({ label, box, viewport });
  check(box && box.x >= -1 && box.x + box.width <= viewport.width + 1 && box.y >= -1 && box.y + box.height <= viewport.height + 1, `${label}: the reader fits the viewport`);
}
async function openSourceRegister() {
  const details = desk.locator('.fi-source-register');
  if (!await details.evaluate(element => element.open)) await details.locator(':scope > summary').click();
  await expect(details).toHaveAttribute('open', '');
}
async function verifySource(source, opener) {
  await expect(opener).toBeVisible();
  await opener.focus();
  await expect(opener).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(sourceDialog).toBeVisible();
  await waitParams({ fi_source: source.id });
  await expect(sourceDialog.getByRole('heading', { level: 2 })).toHaveText(source.title);
  await expect(sourceDialog.getByRole('link', { name: 'Open original source' })).toHaveAttribute('href', source.url);
  await expect(sourceDialog.getByRole('link', { name: 'Open original source' })).toHaveAttribute('rel', 'noopener noreferrer');
  const text = clean(await sourceDialog.innerText());
  for (const value of [source.publisher, source.publishedAt ?? 'published date not established', source.inspection, source.kind, source.locator, source.excerpt, source.sourceFamily, source.accessedAt, ...source.limitations, ...(source.sha256 ? [source.sha256] : [])]) check(text.includes(clean(value)), `${source.id}: the reader preserves original metadata or limitation: ${clean(value).slice(0, 55)}`);
  if (source.capturePath) await expect(sourceDialog.getByRole('link', { name: 'Inspect retained capture and its scope' })).toHaveAttribute('href', new RegExp(`${source.capturePath.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}$`, 'u'));
  await expect(sourceDialog.getByRole('button', { name: 'Close source reader' })).toBeFocused();
  await popupFits(sourceDialog, `${source.id} source reader`);
  const sourceBox = await sourceDialog.boundingBox(), sourceViewport = page.viewportSize();
  check(Math.abs(sourceBox.x + sourceBox.width / 2 - sourceViewport.width / 2) <= 12 && Math.abs(sourceBox.y + sourceBox.height / 2 - sourceViewport.height / 2) <= 12, `${source.id}: the source dialog is centered within the viewport`);
  await page.screenshot({ path: resolve(out, `source-${page.viewportSize().width}-${source.id.replace(/:/gu, '-')}.png`) });
  await page.keyboard.press('Escape');
  await expect(sourceDialog).not.toBeVisible();
  await waitParams({ fi_source: null });
  await expect(opener).toBeFocused();
  check(true, `${source.id}: keyboard opening, Escape, URL cleanup and focus restoration work`);
}
function assertSourceClosure(packet, label) {
  const ids = new Set(packet.sources.map(row => row.id));
  const missing = [];
  function walk(value) {
    if (Array.isArray(value)) return value.forEach(walk);
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (key === 'sourceIds' || key === 'evidenceSourceIds') for (const id of child) { if (!ids.has(id)) missing.push(id); }
      else walk(child);
    }
  }
  walk(packet);
  equals([...new Set(missing)], [], `${label}: downloaded cases, entities, edges, decisions and track-wide rejected joins are source closed`);
}
async function exportCase(item) {
  const pending = page.waitForEvent('download');
  await desk.locator('.fi-export').click();
  const download = await pending;
  const target = resolve(out, download.suggestedFilename());
  await download.saveAs(target);
  const packet = read(target);
  equals(packet.case, item, `${item.id}: the actual browser download preserves the complete selected case`);
  equals([...packet.edges].sort((a, b) => a.id.localeCompare(b.id)), item.edgeIds.map(id => edges.get(id)).sort((a, b) => a.id.localeCompare(b.id)), `${item.id}: downloaded financial stages, dates, responses and amount bases remain exact`);
  for (const source of packet.sources) assert.deepEqual(source, sources.get(source.id), `${item.id}: original source metadata changed`);
  assertSourceClosure(packet, item.id);
  equals([packet.aggregateAmount, packet.inferredCashFlow, packet.outcomeProbabilities], [null, false, null], `${item.id}: export does not invent a pooled total, cash flow or outcome probability`);
  check(/Entire research track/u.test(packet.rejectedJoinsScope), `${item.id}: track-wide rejected connections have explicit scope`);
  await expect(desk.locator('.fi-export')).toHaveText('Packet exported');
  exportedPackets.push({ caseId: item.id, path: target, sha256: digest(target), sources: packet.sources.length });
}

let failure;
try {
  await goto();
  await expect(desk.getByRole('heading', { level: 1 })).toHaveText('Power, decisions & public money');
  await expect(desk.locator('[data-fi-case-choice]')).toHaveCount(cases.length);
  await expect(desk.locator('.fi-population')).toContainText(`${cases.length} of ${cases.length} research files`);
  await noOverflow('Desktop map');
  await page.screenshot({ path: resolve(out, 'desktop-map.png') });

  // Every retained file is exercised in the UI, including its actual downloaded packet.
  for (const item of cases) {
    await chooseCase(item);
    await expect(desk.locator('.fi-finding')).toHaveText(item.finding);
    await expect(desk.locator('[data-fi-edge]')).toHaveCount(item.edgeIds.length);
    await expect(desk.locator('[data-fi-claim]')).toHaveCount(item.claims.length);
    for (const claim of item.claims) {
      const article = desk.locator(attr('data-fi-claim', claim.id));
      const text = clean(await article.innerText());
      check([claim.text, claim.response, claim.alternative, claim.falsifier, ...claim.missingRecords].every(value => text.includes(clean(value))), `${claim.id}: the allegation, response, rival explanation, falsifier and missing records are all visible`);
    }
    if (item.decisionAnalysis) {
      const decision = item.decisionAnalysis;
      const text = clean(await desk.locator('.fi-decisions').innerText());
      check([decision.observedOutcome, ...decision.hindsightLimits, ...decision.actors.flatMap(actor => [actor.authority, actor.incentive]), ...decision.options.flatMap(option => [option.label, option.expectedObservableOutcome])].every(value => text.includes(clean(value))), `${item.id}: institutional constraints, options, observed outcome and hindsight limits survive rendering`);
      await expect(desk.locator('.fi-decisions')).toContainText('not private motives or estimated probabilities');
    }
    await exportCase(item);
  }

  // Track, status, search and history update the rendered population, not only the URL.
  await goto();
  for (const stream of bundle.streams) {
    await trackControl.selectOption(stream.track);
    await waitParams({ fi_track: stream.track });
    await expect(desk.locator('[data-fi-case-choice]')).toHaveCount(stream.cases.length);
    await expect.poll(() => desk.locator('[data-fi-case-choice]').evaluateAll(rows => rows.map(row => row.dataset.fiCaseChoice))).toEqual(stream.cases.map(row => row.id));
    equals(await desk.locator('[data-fi-case-choice]').evaluateAll(rows => rows.map(row => row.dataset.fiCaseChoice)), stream.cases.map(row => row.id), `${stream.track}: the selected track contains its exact files`);
  }
  await page.goBack();
  await expect(trackControl).toHaveValue(bundle.streams.at(-2).track);
  await expect(desk.locator('[data-fi-case-choice]')).toHaveCount(bundle.streams.at(-2).cases.length);
  await page.goForward();
  await expect(trackControl).toHaveValue(bundle.streams.at(-1).track);
  check(true, 'Browser Back and Forward restore the visible track and register');
  await desk.getByRole('button', { name: 'Clear filters', exact: true }).click();
  for (const status of [...new Set(cases.map(item => item.status))]) {
    await statusControl.selectOption(status);
    await waitParams({ fi_status: status });
    await expect.poll(() => desk.locator('[data-fi-case-choice]').evaluateAll(rows => rows.map(row => row.dataset.fiCaseChoice))).toEqual(cases.filter(item => item.status === status).map(item => item.id));
    equals(await desk.locator('[data-fi-case-choice]').evaluateAll(rows => rows.map(row => row.dataset.fiCaseChoice)), cases.filter(item => item.status === status).map(item => item.id), `${status}: evidence status filters exact cases`);
  }
  await statusControl.selectOption('');
  await search.fill(cases[0].title);
  await waitParams({ fi_q: cases[0].title });
  await expect(desk.locator(attr('data-fi-case-choice', cases[0].id))).toBeVisible();
  await search.fill('zzzz-no-retained-funding-file-987654');
  await expect(desk.locator('.fi-empty')).toBeVisible();
  await expect(desk.locator('[data-fi-case-choice]')).toHaveCount(0);
  await expect(desk.locator('.fi-empty')).toContainText('not an absence of activity or wrongdoing');
  await desk.getByRole('button', { name: 'Show all research files' }).click();
  await expect(desk.locator('[data-fi-case-choice]')).toHaveCount(cases.length);
  await search.fill('   ');
  await expect(desk.locator('[data-fi-case-choice]')).toHaveCount(cases.length);
  check(true, 'Title search, unmatched query, recovery and whitespace query preserve honest denominators');

  // Source readers expose retained original provenance and return keyboard focus.
  for (const stream of bundle.streams) {
    const item = cases.find(row => row.track === stream.track);
    await goto({ fi_case: item.id });
    await openSourceRegister();
    const source = sources.get(item.sourceIds[0]);
    await verifySource(source, desk.locator('.fi-source-register').locator(attr('data-fi-source', source.id)));
    await desk.getByRole('group', { name: 'Funding evidence view' }).getByRole('button', { name: 'Network', exact: true }).click();
    await expect(desk.locator('[data-entity-id]').first()).toBeVisible();
    const visibleIds = await desk.locator('[data-entity-id]').evaluateAll(rows => rows.map(row => row.dataset.entityId));
    check(visibleIds.length > 0 && visibleIds.every(id => entities.get(id)?.resolved === true), `${stream.track}: the graph exposes source-resolved identities and does not silently resolve unknown aggregates`);
  }
  const mapCase = cases.find(item => item.geography.some(place => place.stateCode) && item.edgeIds.length > 1);
  await goto({ fi_case: mapCase.id });
  await desk.getByRole('button', { name: 'Read the case', exact: true }).click();
  await expect(desk.locator('.fi-case-reading')).toBeFocused();
  check(true, 'Read the case scrolls and moves keyboard focus to the selected file');
  await desk.locator('.map-evidence-index > summary').click();
  const hubButton = desk.locator('[data-map-hub]').first();
  const hubId = await hubButton.getAttribute('data-map-hub');
  await hubButton.click();
  const hub = desk.getByRole('region', { name: 'Selected state evidence' });
  await expect(hub).toBeVisible();
  await waitParams({ fi_inspect: `state:${hubId}` });
  await expect(hub.locator('.map-hub-missing')).toHaveCount(0);
  await expect(hub).toContainText('not an address or a count of wrongdoing');
  await hub.getByRole('tab', { name: /^Identities/u }).click();
  await expect(hub.locator('[data-hub-entity]').first()).toBeVisible();
  const mapEntityId = await hub.locator('[data-hub-entity]').first().getAttribute('data-hub-entity');
  await hub.locator('[data-hub-entity]').first().getByRole('button').click();
  await expect(reader).toHaveAttribute('data-selection-id', mapEntityId);
  await expect(reader.getByRole('heading', { level: 2 })).toHaveText(entities.get(mapEntityId).label);
  await reader.getByRole('button', { name: /^← Back to .* index$/u }).click();
  await expect(hub).toBeVisible();
  await hub.getByRole('button', { name: 'Close place details' }).click();
  await waitParams({ fi_inspect: null });
  check(true, 'Map hub → exact identity → place index preserves geographic scope and clear selection URLs');

  await desk.getByRole('group', { name: 'Funding evidence view' }).getByRole('button', { name: 'Network', exact: true }).click();
  await waitParams({ fi_view: 'network' });
  await expect(desk.locator('[data-fi-view="network"]')).toBeVisible();
  const connectedEdge = mapCase.edgeIds.map(id => edges.get(id)).find(edge => entities.get(edge.from)?.resolved === true && entities.get(edge.to)?.resolved === true);
  check(!!connectedEdge, 'The graph interaction fixture has a retained relationship between two source-resolved identities');
  const nodeId = connectedEdge.from;
  const node = desk.locator(attr('data-entity-id', nodeId));
  await expect(node).toBeVisible();
  await node.focus();
  await page.keyboard.press('Enter');
  await expect(reader).toHaveAttribute('data-selection-id', nodeId);
  await waitParams({ fi_inspect: `entity:${nodeId}` });
  await reader.getByRole('tab', { name: /^Connections/u }).click();
  await expect(reader.locator('[data-connection-id]').first()).toBeVisible();
  const selectedEdgeId = await reader.locator('[data-connection-id]').first().getAttribute('data-connection-id');
  await reader.locator('[data-connection-id]').first().locator('.atlas-related-edge').click();
  await expect(reader).toHaveAttribute('data-selection-id', selectedEdgeId);
  await expect(reader).toContainText(edges.get(selectedEdgeId).stage);
  await expect(reader.locator('.atlas-response-preview')).toContainText(edges.get(selectedEdgeId).response);
  await reader.getByRole('button', { name: 'Back to previous evidence' }).click();
  await expect(reader).toHaveAttribute('data-selection-id', nodeId);
  await reader.getByRole('tab', { name: /^Responses/u }).click();
  await expect(reader.locator('[data-response-id]').first()).toBeVisible();
  await reader.getByRole('tab', { name: /^Sources/u }).click();
  await expect(reader.locator('.atlas-reader-tab-panel .atlas-source-row').first()).toBeVisible();
  await popupFits(reader, 'Desktop network reader');
  await page.screenshot({ path: resolve(out, 'desktop-network-reader.png') });
  await page.keyboard.press('Escape');
  await expect(reader).toHaveCount(0);
  await waitParams({ fi_inspect: null });
  await expect(node).toBeFocused();
  check(true, 'Keyboard node selection supports exact connections, direction, responses, sources, reader history and focus restoration');

  await section('Coverage & gaps', 'coverage');
  await expect(desk.locator('.fi-coverage-track')).toHaveCount(bundle.streams.length);
  await expect(desk.locator('.fi-coverage-list article')).toHaveCount(bundle.streams.reduce((sum, stream) => sum + stream.coverage.length, 0));
  await expect(desk).toContainText('Examined does not mean cleared, and queued does not mean suspicious');
  check(true, 'All coverage entries show the boundary between examined and queued institutions');
  await section('Research roadmaps', 'roadmap');
  await expect(desk.locator('.fi-roadmap-track article')).toHaveCount(bundle.streams.reduce((sum, stream) => sum + stream.roadmap.length, 0));
  await expect(desk.getByRole('link', { name: 'Inspect the local model experiment and its failed promotion gate' })).toHaveAttribute('href', '#/model-lab');
  await expect(desk).toContainText('not a continuously running monitoring service');
  check(true, 'Roadmaps retain deliverables, acceptance conditions and the model limitation link');

  await section('Cross-sector searches', 'analysis');
  const questionControl = desk.getByRole('combobox', { name: 'Cross-sector research question' });
  for (const query of analysis.queries) {
    await questionControl.selectOption(query.id);
    await expect(desk.locator('.fi-search-results h3')).toHaveText(query.question);
    await expect(desk.locator('.fi-search-results article')).toHaveCount(query.topSources.length);
    equals(await desk.locator('.fi-search-results article a').evaluateAll(rows => rows.map(row => row.href)), query.topSources.map(row => row.source.url), `${query.id}: displayed search candidates link to their exact retained originals`);
  }
  await expect(desk).toContainText('Rankings do not measure the truth or likelihood of a claim');
  await expect(desk.locator('.fi-identity-candidate')).toHaveCount(analysis.identityCandidates.length);
  await desk.getByRole('searchbox', { name: 'Filter identity review queue' }).fill('zzzz-no-identity-987654');
  await expect(desk.locator('.fi-identity-candidate')).toHaveCount(0);
  await expect(desk).toContainText('0 matching name groups · no automatic identity links approved');
  check(true, 'Cross-sector questions and identity candidates remain navigation hypotheses without automatic identity merges');

  await section('Existing sector networks', 'atlas');
  const sectorControl = desk.getByRole('combobox', { name: 'Existing sector' });
  const sectors = await sectorControl.locator('option').evaluateAll(rows => rows.filter(row => row.value).map(row => row.value));
  check(sectors.length >= 10, 'The inherited sector explorer exposes the wider institutional atlas');
  for (const domain of [sectors[0], sectors[Math.floor(sectors.length / 2)], sectors.at(-1)]) {
    await sectorControl.selectOption(domain);
    await waitParams({ fi_domain: domain });
    await expect(desk.locator('.atlas-network')).toBeVisible();
    const relationships = existingAtlas.relationships.filter(row => row.domains.includes(domain));
    const endpointIds = new Set(relationships.flatMap(row => [row.from, row.to]));
    const sectorEntities = existingAtlas.entities.filter(row => endpointIds.has(row.id) || row.domains.includes(domain));
    await expect(desk.locator('.atlas-network-header p')).toHaveText(`${sectorEntities.length.toLocaleString()} retained identities · ${relationships.length.toLocaleString()} exact relationships across all sectors`);
    const sectorIds = new Set(sectorEntities.map(row => row.id));
    await expect.poll(async () => {
      const ids = await desk.locator('[data-entity-id]').evaluateAll(rows => rows.map(row => row.dataset.entityId));
      return ids.length > 0 && ids.every(id => sectorIds.has(id));
    }).toBe(true);
    await expect(desk).toContainText('not merged automatically');
    check(true, `${domain}: inherited sector explorer is available with its provenance boundary`);
  }
  await expect(desk.getByRole('link', { name: 'Open the integrated geographic atlas' })).toHaveAttribute('href', '#/follow-the-money');
  const legacyId = await desk.locator('[data-entity-id]').first().getAttribute('data-entity-id');
  const legacyNode = desk.locator(attr('data-entity-id', legacyId));
  await expect(legacyNode).toBeVisible();
  await legacyNode.focus();
  await page.keyboard.press('Enter');
  await expect(reader).toHaveAttribute('data-selection-id', legacyId);
  await expect(reader.locator('.atlas-reader-identity')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(reader).toHaveCount(0);
  check(true, 'An inherited sector node opens its own exact identity reader without joining it to new research identities');

  await goto({ fi_case: 'missing-case-987654' });
  await expect(desk.locator('.fi-notice')).toContainText('first matching file is shown');
  await expect(desk).toHaveAttribute('data-fi-case', cases[0].id);
  await goto({ fi_case: cases[0].id, fi_source: 'missing-source-987654', fi_inspect: 'bogus:missing' });
  await expect(sourceDialog).not.toBeVisible();
  await expect(reader).toHaveCount(0);
  await expect(desk.locator('.fi-finding')).toHaveText(cases[0].finding);
  check(true, 'Invalid case, source and selection identifiers do not fabricate an evidence record');
  await goto({ fi_case: cases[0].id, fi_view: 'network', fi_inspect: 'entity:missing-entity-987654' });
  await expect(reader.getByRole('heading', { level: 2 })).toHaveText('Record unavailable');
  await expect(reader).toContainText('This exact identifier is not retained: missing-entity-987654');
  await page.keyboard.press('Escape');
  await waitParams({ fi_inspect: null });
  check(true, 'A well-formed but unknown entity identifier produces an honest unavailable reader and can be closed');
  const directSource = sources.get(cases[0].sourceIds[0]);
  await goto({ fi_case: cases[0].id, fi_source: directSource.id });
  await expect(sourceDialog.getByRole('heading', { level: 2 })).toHaveText(directSource.title);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(sourceDialog).toBeVisible();
  await expect(sourceDialog.getByRole('heading', { level: 2 })).toHaveText(directSource.title);
  await page.keyboard.press('Escape');
  await expect(sourceDialog).not.toBeVisible();
  await waitParams({ fi_source: null });
  check(true, 'A source citation deep link survives a full document reload and closes without losing the case');

  const mobileCase = cases.find(item => item.decisionAnalysis && item.edgeIds.length >= 5) ?? cases[0];
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await goto({ fi_case: cases.find(item => item.id !== mobileCase.id).id });
    const mobileControl = desk.getByRole('combobox', { name: 'Selected research file', exact: true });
    await expect(mobileControl).toBeVisible();
    await expect(desk.locator('.fi-case-list')).not.toBeVisible();
    await mobileControl.selectOption(mobileCase.id);
    await waitParams({ fi_case: mobileCase.id });
    await expect(desk).toHaveAttribute('data-fi-case', mobileCase.id);
    await expect(desk.locator('.fi-map-heading h2')).toHaveText(mobileCase.title);
    check(true, `${width}px: the compact research-file selector changes the URL and displayed map file`);
    await noOverflow(`${width}px map and research file`);
    await page.screenshot({ path: resolve(out, `mobile-${width}-map.png`) });
    await openSourceRegister();
    const source = sources.get(mobileCase.sourceIds[0]);
    const opener = desk.locator('.fi-source-register').locator(attr('data-fi-source', source.id));
    await verifySource(source, opener);
    await noOverflow(`${width}px after source reader`);
    await desk.getByRole('group', { name: 'Funding evidence view' }).getByRole('button', { name: 'Network', exact: true }).click();
    await expect(desk.locator('[data-entity-id]').first()).toBeVisible();
    const mobileNode = desk.locator('[data-entity-id]').first();
    await mobileNode.focus();
    await page.keyboard.press('Enter');
    await expect(reader).toBeVisible();
    await popupFits(reader, `${width}px network reader`);
    await page.screenshot({ path: resolve(out, `mobile-${width}-reader.png`) });
    await page.keyboard.press('Escape');
    await expect(reader).toHaveCount(0);
    await noOverflow(`${width}px network`);
    await section('Coverage & gaps', 'coverage');
    await noOverflow(`${width}px coverage`);
    await section('Research roadmaps', 'roadmap');
    await noOverflow(`${width}px roadmaps`);
    await section('Cross-sector searches', 'analysis');
    await noOverflow(`${width}px cross-sector searches`);
  }
  equals(errors, [], 'The complete desktop and mobile journey has no uncaught browser errors');
  const localFailures = failedRequests.filter(row => row.url.startsWith(base) && !row.failure?.includes('ERR_ABORTED'));
  equals(localFailures, [], 'Local application assets load without failed requests');
  equals(badResponses, [], 'Local application responses contain no HTTP errors');
} catch (error) {
  failure = error;
  await page.screenshot({ path: resolve(out, 'failure.png') }).catch(() => {});
} finally {
  const report = { passed: !failure, completedAt: new Date().toISOString(), base, route: '/#/funding-investigations', browser: await browser.version(), reducedMotion: 'reduce', mapScope: 'Offline flat map and evidence interactions; live third-party cartographic tile availability is outside this acceptance.', fingerprints, count: checks.length, checks, exportedPackets, geometry, errors, consoleErrors, failedRequests, badResponses, failure: failure ? { message: failure.message, stack: failure.stack, url: page.url() } : null };
  writeFileSync(resolve(out, 'acceptance.json'), `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
  if (server) await new Promise(done => server.close(done));
}
if (failure) throw failure;
console.log(`Funding investigations browser acceptance passed: ${checks.length} checks; ${exportedPackets.length} downloaded case packets. Artifacts: ${out}`);
