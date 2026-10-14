#!/usr/bin/env node
/** Browser acceptance for the executed model experiment and exact evidence workbench. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { chromium } from 'playwright';
import { expect as playwrightExpect } from 'playwright/test';
const expect = playwrightExpect.configure({ timeout: 45000 });

const folder = 'research/research-radar/next-model';
const read = name => JSON.parse(readFileSync(`${folder}/${name}`, 'utf8'));
const status = read('ui-status.json');
const defaultRetrieverLabel = status.defaultRetriever === 'mini' ? 'MiniLM ONNX uint8' : status.defaultRetriever;
const saved = read('investigation-runs.json');
const graph = read('graph-data.json');
const temporal = read('temporal-ui-summary.json');
const sources = new Map(graph.sources.map(row => [row.id, row]));
const entities = new Map(graph.entities.map(row => [row.id, row]));
const edges = new Map(graph.relationships.map(row => [row.id, row]));
const records = new Map(graph.records.map(row => [row.id, row]));
const out = resolve(process.env.NEXT_MODEL_BROWSER_ARTIFACTS ?? '/tmp/next-model-browser');
mkdirSync(out, { recursive: true });
const artifacts = Object.fromEntries(['ui-status.json', 'investigation-runs.json', 'graph-data.json', 'temporal-ui-summary.json'].map(name => [name, createHash('sha256').update(readFileSync(`${folder}/${name}`)).digest('hex')]));
const checks = [], errors = [], consoleErrors = [], failedRequests = [], geometryAudit = [];
const check = (condition, message) => { assert.ok(condition, message); checks.push(message); };
const equals = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks.push(message); };
const pretty = value => value.replace(/[-_]/g, ' ');
const exact = value => `[${value[0]}=${JSON.stringify(value[1])}]`;
const clean = value => value.replace(/\s+/g, ' ').trim();

// A release acceptance cannot pass on a placeholder or claim pending training completed.
check(status.completedAt && status.trainingRuns.length >= 2 && status.comparisons.length >= 4, 'Both real training runs and the independent comparison are recorded');
check(/^[a-f0-9]{64}$/.test(status.adapterSha256) && /^[a-f0-9]{64}$/.test(status.evaluationSha256), 'Selected weights and final evaluation have exact SHA-256 receipts');
check(saved.runs.length > 0 && saved.runs.every(run => run.ranking.length > 0 && run.ranking.every(row => sources.has(row.sourceId) && Number.isFinite(row.score))), 'Saved demonstrations contain actual numeric rankings of retained sources');
check(temporal.counts.eligibleActiveProjects === temporal.projects.length && temporal.counts.targets === temporal.projects.reduce((sum, row) => sum + row.targets.length, 0), 'Prospective project and target denominators reconcile to the retained rows');
check(temporal.projects.every(row => row.targets.every(target => target.outcome === null && target.probability === null)), 'The current prospective register contains unknown outcomes and unestimated probabilities');

let server;
let base = process.env.INVESTIGATION_BASE_URL;
if (!base) {
  const dist = resolve(process.env.INVESTIGATION_DIST ?? 'dist');
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.ico': 'image/x-icon' };
  server = createServer((request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const file = resolve(dist, `.${pathname === '/' ? '/index.html' : decodeURIComponent(pathname)}`);
    if (!file.startsWith(`${dist}/`)) return response.writeHead(403).end();
    try { response.writeHead(200, { 'content-type': mime[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file)); }
    catch { response.writeHead(404).end(); }
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
const lab = page.locator('[data-model-lab]');
const dialog = page.getByRole('dialog');
const section = name => lab.getByRole('button', { name, exact: true });
const params = () => new URLSearchParams(new URL(page.url()).hash.split('?')[1] ?? '');
const route = (values = {}) => `${base}/#/model-lab?${new URLSearchParams(values)}`;
const depthControl = lab.getByRole('combobox', { name: 'Graph expansion depth' });
async function waitParams(values) { await expect.poll(() => Object.fromEntries(Object.keys(values).map(key => [key, params().get(key)]))).toEqual(values); }
async function gotoEvidence(values) {
  await page.goto(route(values), { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(route(values));
  await expect(lab).toBeVisible();
  const run = saved.runs.find(row => row.id === values.run) ?? saved.runs[0];
  const source = sources.get(values.source ?? run.ranking[0].sourceId);
  await expect(lab.locator('.ml-query-list').getByRole('button').filter({ hasText: run.query })).toHaveAttribute('aria-pressed', 'true');
  await expect(depthControl).toHaveValue(values.depth ?? '1');
  await expect(lab.getByRole('button', { name: values.view === 'graph' ? 'Network' : 'Map', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(lab.locator('.ml-explorer-header h3')).toHaveText(values.focus ? entities.get(values.focus).label : source.title);
  await expect(lab.locator(values.view === 'graph' ? '.ml-network-wrap' : '.ml-map-wrap')).toBeVisible();
}
async function visibleText(locator) { return clean(await locator.innerText()); }
async function tab(name) { await section(name).click(); await expect(section(name)).toHaveAttribute('aria-current', 'page'); check(await section(name).getAttribute('aria-current') === 'page', `${name}: section selection is visible and accessible`); }
async function closeReader(restore) {
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden' });
  await waitParams({ inspect: null, id: null });
  check(!params().has('inspect') && !params().has('id'), 'Escape closes the evidence reader and clears its URL selection');
  if (restore) { await expect(restore).toBeFocused(); check(await restore.evaluate(element => document.activeElement === element), 'Closing the reader returns keyboard focus to its opener'); }
}
async function openWithKeyboard(button, heading) {
  await button.focus();
  await page.keyboard.press('Enter');
  await dialog.waitFor();
  await expect(dialog.getByRole('heading', { level: 2 })).toHaveText(heading);
  equals(await dialog.getByRole('heading', { level: 2 }).innerText(), heading, 'Keyboard opens the exact selected evidence record');
  await expect.poll(() => dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
  check(await dialog.evaluate(element => element.contains(document.activeElement)), 'Focus enters the modal evidence reader');
  await page.keyboard.press('Shift+Tab');
  check(await dialog.evaluate(element => element.contains(document.activeElement)), 'Modal reader keeps keyboard focus inside its evidence controls');
}
async function readExport() {
  const downloaded = page.waitForEvent('download');
  await lab.getByRole('button', { name: /^(Export evidence packet|Packet exported)$/ }).click();
  const download = await downloaded;
  const destination = resolve(out, `packet-${checks.length}.json`);
  await download.saveAs(destination);
  const packet = JSON.parse(readFileSync(destination, 'utf8'));
  equals(packet.registryFingerprint, graph.registryFingerprint, 'Evidence download records the current registry fingerprint');
  check(packet.inferredCashFlow === false && (packet.aggregateAmount === undefined || packet.aggregateAmount === null), 'Evidence export infers no cash flow or pooled cash total');
  check(packet.interpretation.includes('no cash flow'), 'Downloaded evidence contains its interpretation limit');
  for (const [kind, originals] of [['sources', sources], ['entities', entities], ['relationships', edges], ['records', records]]) {
    check(packet[kind].every(row => originals.has(row.id)), `Exported ${kind} contain only retained exact IDs`);
    for (const row of packet[kind]) assert.deepEqual(row, originals.get(row.id), `Export modified ${kind} ${row.id}`);
    checks.push(`Exported ${kind} preserve every original field, date, status and limitation`);
  }
  const sourceIds = new Set(packet.sources.map(row => row.id));
  const entityIds = new Set(packet.entities.map(row => row.id));
  const recordIds = new Set(packet.records.map(row => row.id));
  check([...packet.entities, ...packet.relationships, ...packet.records].every(row => row.sourceIds.every(id => sourceIds.has(id))), 'All downloaded evidence resolves to its retained source citations');
  check(packet.relationships.every(row => entityIds.has(row.from) && entityIds.has(row.to) && [...row.recordIds, ...row.responseIds].every(id => recordIds.has(id))), 'Downloaded edge endpoints, supporting records and responses resolve exactly');
  check(packet.relationships.flatMap(row => row.amounts).every(amount => ['value', 'currency', 'unit', 'stage', 'period'].every(key => Object.hasOwn(amount, key))), 'Every downloaded financial amount keeps its currency, unit, stage and period');
  return packet;
}
async function noOverflow(label) {
  const result = await page.evaluate(() => ({ width: innerWidth, page: document.documentElement.scrollWidth, lab: (() => { const element = document.querySelector('[data-model-lab]'); return { width: element.clientWidth, scroll: element.scrollWidth }; })(), dialog: (() => { const element = document.querySelector('dialog[open]'); if (!element) return null; const rect = element.getBoundingClientRect(); return { left: rect.left, right: rect.right, width: element.clientWidth, scroll: element.scrollWidth }; })() }));
  check(result.page <= result.width + 1 && result.lab.scroll <= result.lab.width + 1 && (!result.dialog || (result.dialog.left >= 0 && result.dialog.right <= result.width + 1 && result.dialog.scroll <= result.dialog.width + 1)), `${label}: page, workbench and open reader fit the viewport without horizontal overflow`);
}
async function networkGeometry(label, expectedNodes) {
  await page.evaluate(() => document.fonts.ready);
  const result = await lab.locator('.ml-network-scroll').evaluate(element => {
    const box = node => { const r = node.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
    return {
      viewport: innerWidth,
      svg: box(element.querySelector('svg')),
      nodes: [...element.querySelectorAll('[data-lab-node]')].map(node => ({
        id: node.getAttribute('data-lab-node'),
        circle: box(node.querySelector('circle')),
        label: box(node.querySelector('[data-lab-node-label]')),
        texts: [...node.querySelectorAll(':scope > text')].slice(1).map(box),
      })),
    };
  });
  const inside = (outer, inner) => inner.left >= outer.left - 0.5 && inner.top >= outer.top - 0.5 && inner.right <= outer.right + 0.5 && inner.bottom <= outer.bottom + 0.5;
  const overlaps = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5;
  equals(result.nodes.length, expectedNodes, `${label}: the actual retained neighborhood draws ${expectedNodes} inspectable nodes`);
  check(result.nodes.every(node => node.label.width > 0 && node.label.height > 0 && inside(result.svg, node.label) && inside(result.svg, node.circle)), `${label}: every node and label remains inside the scrollable SVG bounds`);
  check(result.nodes.every((node, index) => result.nodes.slice(index + 1).every(other => !overlaps(node.label, other.label))), `${label}: measured entity label rectangles do not overlap`);
  check(result.nodes.every(node => result.nodes.every(other => !overlaps(node.label, other.circle))), `${label}: no entity label covers a node target`);
  check(result.nodes.every(node => node.texts.length > 0 && node.texts.every(text => inside(node.label, text))), `${label}: all visible entity name and type text fits its own label card`);
  geometryAudit.push({ label, ...result });
}
async function shot(name, locator) {
  if (locator) await locator.evaluate(element => element.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: resolve(out, `${name}.png`) });
}

try {
  await page.goto(`${base}/#/research-radar`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: /Open the expanded evidence model lab/ }).click();
  await lab.waitFor();
  check(new URL(page.url()).hash.startsWith('#/model-lab'), 'Research radar links into the real model workbench');
  const initial = await visibleText(lab);
  check(initial.includes('saved inference results') && initial.includes('does not run an AI model in your browser') && initial.includes('not truth probabilities'), 'The workbench distinguishes saved relevance rankings from browser inference and truth probabilities');
  check(initial.includes(`${status.corpusDocuments}`) && initial.includes(`${graph.relationships.length}`) && initial.includes(`${temporal.projects.length}`), 'Workbench inventory counts match the actual corpus, graph and cohort');

  // Read each saved result exactly as a user would, with model score and citation.
  for (const run of saved.runs) {
    const queryButton = lab.locator('.ml-query-list').getByRole('button').filter({ hasText: run.query });
    await queryButton.click(); await expect(queryButton).toHaveAttribute('aria-pressed', 'true');
    check(await queryButton.getAttribute('aria-pressed') === 'true' && params().get('run') === run.id, `${run.id}: saved query selection is reflected in the URL and button state`);
    const ranking = lab.locator('.ml-ranking > button');
    equals(await ranking.count(), run.ranking.length, `${run.id}: every saved ranked source remains available`);
    for (let i = 0; i < run.ranking.length; i++) {
      const entry = run.ranking[i], source = sources.get(entry.sourceId);
      const row = ranking.nth(i);
      const text = await visibleText(row);
      check(text.includes(clean(source.title)) && text.includes(entry.score.toFixed(3)), `${run.id}/${i + 1}: source title and score match actual inference`);
    }
    if (run.trace) {
      const findings = lab.getByRole('region', { name: 'Saved investigation findings' });
      equals(await findings.locator('[data-lab-acquisition]').count(), run.trace.missingRecordQuestions.length, `${run.id}: all retained record-acquisition questions remain available`);
      check((await visibleText(findings)).includes('acquisition questions, not newly established relationships') && (await visibleText(findings)).includes('Historical forecast eligibility: no'), `${run.id}: saved investigative leads retain their evidentiary and temporal limits`);
      if (run.trace.missingRecordQuestions.length) {
        const question = run.trace.missingRecordQuestions[0];
        const row = findings.locator(exact(['data-lab-acquisition', question.id]));
        if (await row.getAttribute('open') === null) { await row.locator('summary').focus(); await page.keyboard.press('Enter'); }
        const text = await visibleText(row);
        check([question.question, question.holder, question.neededRecord, question.whyCurrentEvidenceStops, question.disconfirmationTest, question.priorityBasis].every(value => text.includes(clean(value))), `${run.id}: an acquisition lead exposes record holder, missing evidence, disconfirmation and priority basis`);
      }
      const counters = findings.locator('.ml-trace-counter');
      if (await counters.getAttribute('open') === null) await counters.locator('summary').click();
      await expect(counters).toHaveAttribute('open', '');
      equals(await counters.locator('article').count(), run.trace.counterevidence.length, `${run.id}: every retained counter-record stays visible alongside investigative leads`);
      const counterText = await visibleText(counters);
      check(run.trace.counterevidence.every(counter => counterText.includes(clean(counter.response)) && counter.alternativeExplanations.every(value => counterText.includes(clean(value)))), `${run.id}: responses and competing explanations survive the saved trace display`);
    }
  }
  const filter = lab.getByRole('searchbox', { name: 'Filter saved research questions' });
  await filter.fill('no-retained-query-zzzz'); await expect(lab.locator('.ml-query-list button')).toHaveCount(0);
  check(await lab.locator('.ml-query-list button').count() === 0 && (await visibleText(lab.locator('.ml-query-list'))).includes('does not generate a new investigation'), 'An unmatched saved-query search explains its empty state without inventing a model result');
  await filter.fill(''); await expect(lab.locator('.ml-query-list button')).toHaveCount(saved.runs.length);
  equals(await lab.locator('.ml-query-list button').count(), saved.runs.length, 'Clearing query search restores the full saved question list');

  const useful = saved.runs.flatMap(run => run.ranking.map((rank, index) => ({ run, rank, index, count: graph.relationships.filter(edge => edge.sourceIds.includes(rank.sourceId)).length }))).sort((a, b) => b.count - a.count)[0];
  check(useful.count > 0, 'An actual ranked result has retained graph evidence to inspect');
  await lab.locator('.ml-query-list').getByRole('button').filter({ hasText: useful.run.query }).click(); await expect(lab.locator('.ml-query-list').getByRole('button').filter({ hasText: useful.run.query })).toHaveAttribute('aria-pressed', 'true');
  await lab.locator('.ml-ranking > button').nth(useful.index).click(); await expect(lab.locator('.ml-ranking > button').nth(useful.index)).toHaveAttribute('aria-pressed', 'true');
  equals(params().get('source'), useful.rank.sourceId, 'Ranked source selection retains its exact source ID in the URL');
  const selected = sources.get(useful.rank.sourceId);
  const sourceOpener = lab.getByRole('button', { name: 'Open source, dates & limitations' });
  await openWithKeyboard(sourceOpener, selected.title);
  const sourceText = await visibleText(dialog);
  check(sourceText.includes(clean(selected.summary)) && sourceText.includes(clean(selected.locator)) && sourceText.includes(selected.id), 'Source reader preserves summary, exact locator and source ID');
  check(selected.limitations.every(limit => sourceText.includes(clean(limit))), 'Every selected source limitation is available in its popup');
  equals(await dialog.getByRole('link', { name: 'Read original document' }).getAttribute('href'), selected.url, 'Source popup links to the original retained document');
  await closeReader(sourceOpener);
  const packet1 = await readExport();
  equals(packet1.selectedSourceId, selected.id, 'Evidence download identifies the selected ranked source');
  equals(packet1.savedRun.id, useful.run.id, 'Evidence download retains the selected real query run');
  const directEdges = graph.relationships.filter(edge => edge.sourceIds.includes(selected.id)).map(edge => edge.id).sort();
  equals(packet1.relationships.map(edge => edge.id).sort(), directEdges, 'One-hop source evidence lists every directly cited graph edge and no invented edge');

  await lab.getByRole('button', { name: 'Network', exact: true }).click(); await lab.locator('.ml-network-wrap').waitFor();
  await expect(lab.getByRole('button', { name: 'Network', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await waitParams({ view: 'graph' });
  equals(params().get('view'), 'graph', 'Network view is shareable through URL state');
  const visibleNodes = lab.locator('[data-lab-node]');
  await visibleNodes.first().waitFor();
  check(await visibleNodes.count() > 0, 'Source-linked graph renders inspectable entity nodes');
  const node = visibleNodes.first(), nodeId = await node.getAttribute('data-lab-node');
  const entity = entities.get(nodeId);
  await openWithKeyboard(node, entity.label);
  const retainedConnections = graph.relationships.filter(edge => edge.from === nodeId || edge.to === nodeId);
  equals((await dialog.locator('[data-lab-edge]').evaluateAll(rows => rows.map(row => row.getAttribute('data-lab-edge')))).sort(), retainedConnections.map(edge => edge.id).sort(), 'Entity popup lists all exact-ID connections, including those outside the drawn graph cap');
  check((await visibleText(dialog)).includes(clean(entity.identityBasis)), 'Entity popup preserves its identity-resolution basis');
  await closeReader(node);

  const edgeChoice = packet1.relationships.find(edge => edge.amounts.length && (edge.responseIds.length || edge.alternativeExplanations.length)) ?? packet1.relationships[0];
  const edgeButton = lab.locator('.ml-neighborhood-lists').locator(exact(['data-lab-edge', edgeChoice.id]));
  await openWithKeyboard(edgeButton, edgeChoice.label);
  const edgeText = await visibleText(dialog);
  check(edgeText.includes(clean(edgeChoice.summary)) && edgeText.includes(pretty(edgeChoice.kind)) && edgeText.includes(edgeChoice.tier), 'Connection popup preserves its typed evidence, summary and status');
  check(edgeChoice.alternativeExplanations.every(text => edgeText.includes(clean(text))) && edgeChoice.limitations.every(text => edgeText.includes(clean(text))), 'Connection popup keeps competing explanations and limitations visible');
  check(!edgeChoice.falsifier || edgeText.includes(clean(edgeChoice.falsifier)), 'Connection popup preserves the observation that would falsify the interpretation');
  for (const amount of edgeChoice.amounts) check(edgeText.includes(amount.currency) && edgeText.includes(amount.value.toLocaleString('en-IN')) && edgeText.includes(pretty(amount.stage)) && edgeText.includes(amount.period), 'A displayed amount keeps its exact stage, currency, value and period');
  const endpointButtons = dialog.locator('.ml-reader-endpoints button');
  equals(await endpointButtons.allInnerTexts(), [entities.get(edgeChoice.from).label, entities.get(edgeChoice.to).label], 'The connection popup preserves the original directed endpoints');
  const responseId = edgeChoice.responseIds[0] ?? edgeChoice.recordIds[0];
  if (responseId) {
    const response = records.get(responseId);
    await dialog.getByRole('button', { name: response.title, exact: true }).click();
    await waitParams({ inspect: 'record', id: responseId });
    await expect(dialog.getByRole('heading', { level: 2 })).toHaveText(response.title);
    equals(await dialog.getByRole('heading', { level: 2 }).innerText(), response.title, 'A retained supporting or response record can be inspected from the connection');
    const responseText = await visibleText(dialog);
    check(responseText.includes(clean(response.summary)) && (!response.response || responseText.includes(clean(response.response))), 'The nested record retains its summary and counter-response');
    await page.goBack();
    await waitParams({ inspect: 'edge', id: edgeChoice.id });
    await expect(dialog.getByRole('heading', { level: 2 })).toHaveText(edgeChoice.label);
    equals(await dialog.getByRole('heading', { level: 2 }).innerText(), edgeChoice.label, 'Browser Back restores the preceding connection detail');
  }
  await closeReader(edgeButton);

  const oneHopUrl = page.url();
  await depthControl.selectOption('2');
  await waitParams({ depth: '2' });
  await expect(depthControl).toHaveValue('2');
  const oneHopEntities = new Set(packet1.entities.map(row => row.id));
  const expectedExpandedEdges = graph.relationships.filter(edge => oneHopEntities.has(edge.from) || oneHopEntities.has(edge.to)).map(edge => edge.id).sort();
  await expect.poll(async () => (await lab.locator('.ml-neighborhood-lists [data-lab-edge]').evaluateAll(rows => rows.map(row => row.getAttribute('data-lab-edge')))).sort()).toEqual(expectedExpandedEdges);
  const twoHopUrl = page.url();
  equals(params().get('depth'), '2', 'Graph depth is recorded in shareable URL state');
  const packet2 = await readExport();
  equals(packet2.depth, 2, 'The expanded download records the requested two-hop depth');
  check(packet2.relationships.length >= packet1.relationships.length && directEdges.every(id => packet2.relationships.some(edge => edge.id === id)), 'Expanding to two hops preserves every directly cited relationship');
  equals((await lab.locator('.ml-neighborhood-lists [data-lab-edge]').evaluateAll(rows => rows.map(row => row.getAttribute('data-lab-edge')))).sort(), packet2.relationships.map(edge => edge.id).sort(), 'The complete evidence list and full downloaded graph contain the same relationship IDs');
  const networkText = await visibleText(lab.locator('.ml-network-wrap'));
  check(networkText.includes(`of ${packet2.entities.length} entities`) && networkText.includes(`of ${packet2.relationships.length} connections`) && networkText.includes('complete lists') && networkText.includes('Connection ≠ payment'), 'Graph caption states its drawn and complete denominators and cash-flow limit');
  check(await visibleNodes.count() <= 24, 'The graphical overview stays bounded while complete evidence remains accessible');
  await page.goBack();
  await expect(page).toHaveURL(oneHopUrl);
  await expect(depthControl).toHaveValue('1');
  equals(await depthControl.inputValue(), '1', 'Browser Back restores the previous graph expansion depth');
  await page.goForward();
  await expect(page).toHaveURL(twoHopUrl);
  await expect(depthControl).toHaveValue('2');
  equals(await depthControl.inputValue(), '2', 'Browser Forward restores the expanded graph');

  await lab.getByRole('button', { name: 'Map', exact: true }).click(); await lab.locator('.ml-map-wrap').waitFor();
  await expect(lab.getByRole('button', { name: 'Map', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await waitParams({ view: 'map' });
  check((await visibleText(lab.locator('.ml-map-caption'))).includes('State tags, not precise locations'), 'Map explicitly labels administrative associations rather than fabricated precise sites');
  const mapNode = lab.locator('.ml-map-node').first();
  if (await mapNode.count()) {
    await mapNode.focus(); await page.keyboard.press('Enter'); await dialog.waitFor();
    check((await visibleText(dialog)).includes('not an office, building, payment site or allegation location'), 'Map popup explains the limits of its state association');
    await closeReader(mapNode);
  }
  await lab.getByRole('combobox', { name: 'Map zoom' }).selectOption('2');
  await expect(lab.getByRole('combobox', { name: 'Map zoom' })).toHaveValue('2');
  await expect(lab.locator('.ml-map-scroll svg')).toHaveAttribute('style', /width: 200%/);
  check(await lab.getByRole('combobox', { name: 'Map zoom' }).inputValue() === '2', 'Map supports an explicit zoom control and scrollable pan region');
  await lab.getByRole('combobox', { name: 'Map zoom' }).selectOption('1');
  await expect(lab.getByRole('combobox', { name: 'Map zoom' })).toHaveValue('1');

  // A retained institutional hub exceeds the drawing cap; complete evidence must survive.
  const adjacent = new Map(graph.entities.map(entity => [entity.id, new Set()]));
  for (const edge of graph.relationships) { adjacent.get(edge.from).add(edge.to); adjacent.get(edge.to).add(edge.from); }
  const hub = [...adjacent].map(([id, neighbors]) => ({ id, ids: new Set([id, ...neighbors, ...[...neighbors].flatMap(neighbor => [...adjacent.get(neighbor)])]) })).sort((a, b) => b.ids.size - a.ids.size)[0];
  const thirteen = [...adjacent].flatMap(([id, neighbors]) => [{ id, depth: '1', ids: new Set([id, ...neighbors]) }, { id, depth: '2', ids: new Set([id, ...neighbors, ...[...neighbors].flatMap(neighbor => [...adjacent.get(neighbor)])]) }]).find(row => row.ids.size === 13);
  check(Boolean(thirteen), 'A retained 13-entity neighborhood exercises the first dense-layout size without fabricated fixtures');
  check(hub.ids.size > 24, 'A retained two-hop neighborhood is large enough to exercise graphical truncation');
  await gotoEvidence({ run: useful.run.id, source: selected.id, focus: hub.id, view: 'graph', depth: '2' });
  const hubPacket = await readExport();
  check(hubPacket.entities.length > 24 && await lab.locator('[data-lab-node]').count() === 24, 'Large exact-ID neighborhoods explicitly cap the drawing at 24 entities');
  equals(hubPacket.focusEntity, hub.id, 'The downloaded graph preserves the exact focused entity ID');
  check((await visibleText(lab.locator('.ml-network-wrap'))).includes(`Showing 24 of ${hubPacket.entities.length} entities`), 'The graph visibly discloses how many retained entities were omitted from the drawing');
  const allEntities = lab.locator('.ml-neighborhood-lists details').filter({ has: page.locator('summary').filter({ hasText: 'All entities' }) });
  await allEntities.locator('summary').click(); await expect(allEntities).toHaveAttribute('open', '');
  equals(await allEntities.locator('.ml-entity-list button').count(), hubPacket.entities.length, 'All retained entities remain reachable in the complete list after graphical truncation');
  await page.goto(route({ inspect: 'entity', id: 'not-a-retained-identity-zzzz' }), { waitUntil: 'domcontentloaded' });
  await dialog.waitFor();
  await expect(dialog).toContainText('No similar name has been substituted');
  check((await visibleText(dialog)).includes('No similar name has been substituted'), 'Unknown saved identities display an explicit gap and do not resolve through name similarity');
  await closeReader();

  await tab('Model results');
  const models = lab.locator('[data-lab-model-results]');
  const modelText = await visibleText(models);
  check(modelText.includes(status.selectedModel) && modelText.includes(status.selectedConfiguration) && modelText.includes(defaultRetrieverLabel), 'Model results name the selected architecture, configuration and actual default');
  check(modelText.includes(status.promoted ? 'Promotion criteria met' : 'Experimental · not promoted'), 'Visible promotion decision matches the frozen evaluation');
  check(modelText.includes(`${status.trainingQueries} / ${status.developmentQueries} / ${status.testQueries}`) && modelText.includes(`${status.testFamilies} independent test families`) && modelText.includes(status.trainableParameters.toLocaleString('en-IN')), 'Training, development and independent-test denominators remain separate and exact');
  equals(await models.locator('tbody tr').count(), status.comparisons.length, 'All evaluated retrieval systems appear in the results table');
  for (let i = 0; i < status.comparisons.length; i++) {
    const result = status.comparisons[i];
    equals(await models.locator('tbody tr').nth(i).locator('th, td').allInnerTexts(), [result.label, result.ndcgAt5.toFixed(4), result.recallAt5.toFixed(4), result.counterevidenceRecallAt5 === null ? 'Not scored' : result.counterevidenceRecallAt5.toFixed(4)], `${result.id}: every displayed metric equals the actual saved final score`);
  }
  check(status.failedCriteria.every(text => modelText.includes(clean(text))) && status.limitations.every(text => modelText.includes(clean(text))), 'Every failed gate and retained evaluation limitation survives rendering');
  check(modelText.includes(`Epoch ${status.epochs} selected checkpoint`), 'Selected epoch is labelled as checkpoint selection, separate from completed training epochs');
  equals(await models.locator('.ml-training-run').count(), status.trainingRuns.length, 'Every actual trained family retains its own run receipt');
  check(modelText.includes(status.adapterSha256) && modelText.includes(status.evaluationSha256) && status.trainingRuns.every(run => modelText.includes(run.adapterSha256)), 'Model results expose selected and per-run weight hashes plus the independent evaluation hash');
  check(modelText.includes('Neither is a probability that a claim is true'), 'Evaluation metrics are explained as retrieval scores, not allegation probabilities');

  await tab('Future observations');
  const forecast = lab.locator('[data-lab-forecast]');
  const forecastText = await visibleText(forecast);
  check(forecastText.includes(`${temporal.projects.length} active India projects`) && forecastText.includes(`${temporal.counts.targets} targets`) && forecastText.includes(`${temporal.counts.resolvedTargets} outcomes resolved`), 'Prospective cohort denominators and unresolved target counts match official capture');
  check(forecastText.includes('6–20 April 2027') && temporal.resolutionWindow.opensAt.startsWith('2027-04-06') && temporal.resolutionWindow.closesAt.startsWith('2027-04-20'), 'Visible future observation window matches its preregistered dates');
  check(forecastText.includes('Probabilities: not estimated') && temporal.limits.every(limit => forecastText.includes(clean(limit))), 'Future register preserves all missingness and scheduling limitations');
  equals(await forecast.locator('[data-lab-project]').count(), temporal.projects.length, 'Every prospective World Bank project is available in the register');
  for (const project of temporal.projects) {
    const row = forecast.locator(exact(['data-lab-project', project.id]));
    const text = await visibleText(row.locator('summary'));
    check(text.includes(project.id) && text.includes(clean(project.name)), `${project.id}: register retains the official project name and identity`);
    const expectedAmount = project.variables.currentCommitmentUSD == null ? 'Amount missing' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(project.variables.currentCommitmentUSD);
    check(text.includes(expectedAmount) && text.includes('current commitment'), `${project.id}: amount is correctly formatted as USD commitment, not payment`);
  }
  const project = temporal.projects[0], projectSearch = forecast.getByRole('searchbox', { name: 'Search World Bank projects' });
  await projectSearch.fill(project.id); await expect(forecast.locator('[data-lab-project]')).toHaveCount(1);
  equals(await forecast.locator('[data-lab-project]').count(), 1, 'Searching an exact project ID isolates its institutional observation');
  const projectRow = forecast.locator(exact(['data-lab-project', project.id]));
  await projectRow.locator('summary').focus(); await page.keyboard.press('Enter');
  check(await projectRow.getAttribute('open') !== null, 'Keyboard expands project variables and outcome rules');
  const projectText = await visibleText(projectRow);
  check(projectText.includes(project.borrower) && projectText.includes(project.variables.status) && projectText.includes(project.variables.closingDate), 'Expanded project preserves its borrower, observed status and closing date');
  equals(await projectRow.locator('li strong').allInnerTexts(), project.targets.map(() => 'unknown'), 'Each retained target remains unknown, with no invented probability');
  equals(await projectRow.getByRole('link', { name: 'Official project record' }).getAttribute('href'), project.sourceUrl, 'Project links to its exact official World Bank identity');
  await projectSearch.fill('no-retained-project-zzzz'); await expect(forecast.locator('[data-lab-project]')).toHaveCount(0);
  check(await forecast.locator('[data-lab-project]').count() === 0 && (await visibleText(forecast)).includes('No retained project matches'), 'Unmatched project search explains the empty register');
  await projectSearch.fill(''); await expect(forecast.locator('[data-lab-project]')).toHaveCount(temporal.projects.length);
  equals(await forecast.locator('[data-lab-project]').count(), temporal.projects.length, 'Clearing project search restores all prospective projects');
  for (const details of await forecast.locator('.ml-targets details').all()) { await details.locator('summary').focus(); await page.keyboard.press('Enter'); }
  check((await visibleText(forecast)).includes('Missing, unrecognized or failed observations remain unknown'), 'Keyboard can reveal outcome rules that preserve failed observations as unknown');

  await tab('Research methods');
  check((await visibleText(lab)).includes('not presented as full books used in training') && (await visibleText(lab)).includes('does not produce a corruption score'), 'Methods distinguish literature guidance from training on books and from personal wrongdoing prediction');
  const reading = lab.locator('.ml-reading-list details').first();
  await reading.locator('summary').focus(); await page.keyboard.press('Enter');
  check(await reading.getAttribute('open') !== null && await reading.getByRole('link', { name: 'Read source' }).count() === 1, 'A methods citation exposes its inspected finding, application and original source through keyboard disclosure');

  // Regression for the original 13-node label collision and the maximum drawing size.
  // Measure actual rendered fonts and geometry, including the deliberately scrollable mobile canvas.
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1080 });
    for (const neighborhood of [{ ...thirteen, count: 13 }, { ...hub, depth: '2', count: 24 }]) {
      await gotoEvidence({ run: useful.run.id, source: selected.id, focus: neighborhood.id, view: 'graph', depth: neighborhood.depth });
      await expect(lab.locator('[data-lab-node]')).toHaveCount(neighborhood.count);
      await noOverflow(`${width}px ${neighborhood.count}-node graph`);
      await networkGeometry(`${width}px ${neighborhood.count}-node graph`, neighborhood.count);
      await shot(`model-lab-${width}-network-${neighborhood.count}`, lab.locator('.ml-network-wrap'));
    }
  }

  // Actual responsive views, including long evidence IDs and the financial table.
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1080 });
    await gotoEvidence({ run: useful.run.id, source: selected.id, view: 'map', depth: '2' });
    await noOverflow(`${width}px map`);
    await shot(`model-lab-${width}-map`, lab.locator('.ml-explorer'));
    await lab.getByRole('button', { name: 'Network', exact: true }).click(); await lab.locator('.ml-network-wrap').waitFor();
    await expect(lab.getByRole('button', { name: 'Network', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await noOverflow(`${width}px graph`);
    await shot(`model-lab-${width}-network`, lab.locator('.ml-explorer'));
    await sourceOpener.click(); await dialog.waitFor();
    await expect(dialog.getByRole('heading', { level: 2 })).toHaveText(selected.title);
    await noOverflow(`${width}px source reader`);
    await shot(`model-lab-${width}-source`);
    await closeReader();
    await tab('Model results');
    await noOverflow(`${width}px results`);
    await shot(`model-lab-${width}-results`, lab.locator('[data-lab-model-results]'));
    await tab('Future observations');
    await forecast.getByRole('searchbox', { name: 'Search World Bank projects' }).fill(project.id);
    await expect(forecast.locator('[data-lab-project]')).toHaveCount(1);
    await expect(forecast.locator('[data-lab-project]')).toHaveAttribute('data-lab-project', project.id);
    await forecast.locator(exact(['data-lab-project', project.id])).locator('summary').click();
    await expect(forecast.locator(exact(['data-lab-project', project.id]))).toHaveAttribute('open', '');
    await noOverflow(`${width}px future observations`);
    await shot(`model-lab-${width}-forecast`, forecast.locator('.ml-card'));
  }
  check(errors.length === 0, 'No browser runtime exceptions occurred in the complete workbench journey');
  check(consoleErrors.length === 0, 'No console errors occurred in the complete workbench journey');
  check(failedRequests.length === 0, 'No failed network requests occurred in the complete workbench journey');
  for (const [name, digest] of Object.entries(artifacts)) equals(createHash('sha256').update(readFileSync(`${folder}/${name}`)).digest('hex'), digest, `${name}: acceptance used unchanged artifact bytes throughout`);
  writeFileSync(resolve(out, 'acceptance.json'), JSON.stringify({ completedAt: new Date().toISOString(), base, buildDirectory: process.env.INVESTIGATION_BASE_URL ? null : resolve(process.env.INVESTIGATION_DIST ?? 'dist'), browserScriptSha256: createHash('sha256').update(readFileSync('scripts/research-radar/next-model/browser.mjs')).digest('hex'), artifacts, modelStatus: status.status, adapterSha256: status.adapterSha256, evaluationSha256: status.evaluationSha256, checks, geometryAudit, errors, consoleErrors, failedRequests }, null, 2) + '\n');
  console.log(`Model lab browser: ${checks.length} checks passed; ${out}`);
} catch (error) {
  const browserState = await page.evaluate(() => ({ url: location.href, activeElement: document.activeElement?.outerHTML.slice(0, 1000), modalOpen: !!document.querySelector('dialog:modal') })).catch(() => null);
  writeFileSync(resolve(out, 'failure.json'), JSON.stringify({ base, artifacts, checks, error: error.stack, browserState, errors, consoleErrors, failedRequests }, null, 2) + '\n');
  await page.screenshot({ path: resolve(out, 'failure.png') }).catch(() => {});
  throw error;
} finally {
  await context.close();
  await browser.close();
  if (server) await new Promise(done => server.close(done));
}
