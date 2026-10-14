import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, cpSync, mkdtempSync, rmSync, mkdirSync } from 'node:fs';
import { resolve, extname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadProgram } from './load.mjs';
let server, browser, base, dist, program;
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
before(async () => {
  mkdirSync('/tmp/icip-research-program-review', { recursive: true });
  program = await loadProgram(); assert.deepEqual(program.errors, []); assert.deepEqual(program.missing, []);
  dist = mkdtempSync(join(tmpdir(), 'icip-program-browser-')); cpSync(resolve('dist'), dist, { recursive: true });
  server = createServer((req, res) => { const requested = req.url.split('?')[0]; const path = resolve(dist, '.' + decodeURIComponent(requested === '/' ? '/index.html' : requested)); if (!path.startsWith(dist + '/') || !existsSync(path)) return res.writeHead(404).end(); res.setHeader('Content-Type', mime[extname(path)] ?? 'application/octet-stream'); res.end(readFileSync(path)); });
  await new Promise(done => server.listen(0, '127.0.0.1', done)); base = `http://127.0.0.1:${server.address().port}`;
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || '/opt/pw-browsers/chromium'; browser = await chromium.launch(existsSync(executablePath) ? { executablePath } : {});
});
after(async () => { await browser?.close(); if (server) await new Promise(done => server.close(done)); if (dist) rmSync(dist, { recursive: true, force: true }); });
async function visit(query = '', width = 1440, init) { const context = await browser.newContext({ viewport: { width, height: 1000 } }); const page = await context.newPage(); if (init) await page.addInitScript(init); await page.goto(`${base}/#/research-program${query}`); await page.locator('.rp-desk h1').waitFor(); assert.equal(await page.locator('.rp-error').count(), 0); return page; }
async function jsonDownload(page, button) { const waiting = page.waitForEvent('download'); await button.click(); return JSON.parse(readFileSync(await (await waiting).path(), 'utf8')); }
const view = (page, name) => page.getByRole('navigation', { name: 'Research desk views' }).getByRole('button', { name, exact: true }).click();

test('research route preserves the hash, moves focus into desk and exposes all five views', async () => {
  const page = await visit(); try { await page.getByRole('button', { name: 'Enter the research desk' }).click(); assert.match(page.url(), /#\/research-program$/); assert.equal(await page.evaluate(() => document.activeElement?.id), 'rp-content');
    assert.equal(await page.getByRole('navigation', { name: 'Research desk views' }).getByRole('button').count(), 5); assert(await page.locator('.rp-ledger button').count() > 0); assert.equal(await page.getByRole('region', { name: 'Recorded relation drawing' }).count(), 1);
  } finally { await page.close(); }
});
test('intersected status/sector/relation/entity filters survive reload and exports retain citation closure', async () => {
  const edge = program.connections.find(row => row.sectorIds?.length); const page = await visit(); try {
    await page.getByLabel('Sector', { exact: true }).selectOption(edge.sectorIds[0]); await page.getByLabel('Status', { exact: true }).selectOption(edge.status); await page.getByLabel('Relation', { exact: true }).selectOption(edge.relation); await page.getByLabel('Endpoint entity').selectOption(edge.from);
    const expected = program.connections.filter(row => row.sectorIds?.includes(edge.sectorIds[0]) && row.status === edge.status && row.relation === edge.relation && [row.from, row.to].includes(edge.from));
    const result = await jsonDownload(page, page.getByRole('button', { name: 'Export filtered records', exact: true })); assert.deepEqual(result.connections.map(row => row.id), expected.map(row => row.id));
    const sourceIds = new Set(result.sources.map(source => source.id)); for (const row of [...result.entities, ...result.connections]) for (const id of row.sourceIds) assert(sourceIds.has(id)); assert.match(result.boundary, /No amounts are aggregated/);
    const url = page.url(); await page.reload(); await page.locator('.rp-ledger').waitFor(); assert.equal(page.url(), url); assert.equal(await page.getByLabel('Status', { exact: true }).inputValue(), edge.status);
    await page.getByLabel('Search recorded text').fill('no-such-record-9d901'); await page.getByText('No recorded relations match these filters.', { exact: false }).waitFor(); assert.equal(await page.locator('.rp-ledger button').count(), 0);
  } finally { await page.close(); }
});
test('exact edge deep links, pagination, evidence inspector and source provenance are keyboard usable', async () => {
  const edge = program.connections.at(-1); const page = await visit(`?edge=${encodeURIComponent(edge.id)}`); try {
    const inspector = page.getByRole('article', { name: 'Connection evidence inspector' }); assert.equal(await inspector.getByRole('heading', { level: 2 }).innerText(), edge.label);
    const pressed = page.locator('.rp-ledger button[aria-pressed=true]'); assert.equal(await pressed.count(), 1); assert((await pressed.innerText()).includes(edge.label));
    const source = inspector.locator('.rp-source').first(); await source.locator('summary').focus(); await page.keyboard.press('Enter'); assert.equal(await source.getAttribute('open'), '');
    assert(await source.getByRole('link', { name: 'Open original source' }).getAttribute('href')); assert.match(await source.innerText(), /family:/);
    await page.getByRole('button', { name: 'Previous relations', exact: true }).click(); assert.equal(await page.locator('.rp-ledger button[aria-pressed=true]').count(), 1);
  } finally { await page.close(); }
});
test('evidence paths preserve recorded steps and export their individual statuses and directions', async () => {
  const edge = program.connections[0]; const page = await visit(); try {
    await page.getByLabel('Path start', { exact: true }).selectOption(edge.from); await page.getByLabel('Path destination', { exact: true }).selectOption(edge.to);
    const path = page.locator('.rp-path').first(); await path.waitFor(); const result = await jsonDownload(page, path.getByRole('button', { name: 'Export this evidence path' })); assert(result.traversal.connectionIds.length > 0); assert(result.traversal.connectionIds.length <= 4); assert(result.connections.every(row => ['documented', 'alleged', 'hypothesis'].includes(row.status)));
    await page.getByLabel('Path start', { exact: true }).selectOption(edge.to); await page.getByLabel('Path destination', { exact: true }).selectOption(edge.from); await page.getByLabel('Traversal', { exact: true }).selectOption('both');
    assert(await page.getByText('Traversed against the recorded arrow;', { exact: false }).count() > 0); assert.match(await page.locator('.rp-paths').innerText(), /does not establish coordination/); assert.match(await path.innerText(), /Recorded period:/); assert.match(await page.locator('.rp-paths').innerText(), /does not enforce temporal overlap/); await page.locator('.rp-path-controls').evaluate(element => element.scrollIntoView({ block: 'start' })); await page.screenshot({ path: '/tmp/icip-research-program-review/path-1440.png', fullPage: false });
  } finally { await page.close(); }
});
test('lead plans recover malformed storage, isolate drafts and freeze captured revisions through export and reload', async () => {
  const page = await visit('?tab=leads', 1440, () => localStorage.setItem('icip-research-program-plans-v1', '{broken'));
  try {
    const first = page.locator('.rp-lead').nth(0), second = page.locator('.rp-lead').nth(1); await first.locator('.rp-plan>summary').click();
    assert.equal(await first.getByLabel('Self-reported plan timing').inputValue(), 'exploratory');
    await first.getByLabel('Prediction to test', { exact: true }).fill('First prediction'); await first.getByLabel('Unit / comparison population').fill('All relevant awards including negative controls'); await first.getByRole('button', { name: 'Capture plan revision', exact: true }).click(); await first.getByLabel('Prediction to test', { exact: true }).fill('Changed prediction');
    await second.locator('.rp-plan>summary').click(); await second.getByLabel('Prediction to test', { exact: true }).fill('Second isolated prediction');
    const result = await jsonDownload(page, first.getByRole('button', { name: 'Export lead and plan', exact: true })); assert.equal(result.draft.prediction, 'Changed prediction'); assert.equal(result.revisions[0].worksheet.prediction, 'First prediction'); assert.equal(result.revisions[0].plan.population, 'All relevant awards including negative controls'); assert.match(result.boundary, /not independently registered or validated/);
    // Remove init script by navigating in the same context through a fresh page: persistence must be real.
    const context = page.context(); const restored = await context.newPage(); await restored.goto(page.url()); await restored.locator('.rp-lead').first().waitFor();
    for (const [index, expected] of [[0, 'Changed prediction'], [1, 'Second isolated prediction']]) { const card = restored.locator('.rp-lead').nth(index); await card.locator('.rp-plan>summary').click(); assert.equal(await card.getByLabel('Prediction to test', { exact: true }).inputValue(), expected); }
    const output = await jsonDownload(restored, restored.locator('.rp-lead').first().getByRole('button', { name: 'Export lead and plan', exact: true })); assert.equal(output.revisions.length, 1); await restored.close();
  } finally { await page.close(); }
});
test('only explicit case-question bridges open an existing worksheet', async () => {
  const lead = program.leads.find(row => row.existingCaseId); assert(lead); const page = await visit('?tab=leads'); try {
    const card = page.locator('.rp-lead').filter({ has: page.getByRole('heading', { name: lead.title, exact: true }) }); await card.locator('.rp-plan>summary').click(); await card.getByRole('link', { name: 'Open the exact linked case worksheet' }).click(); await page.locator('.gt-page').waitFor();
    assert.equal(new URLSearchParams(page.url().split('?')[1]).get('case'), lead.existingCaseId); assert.equal(new URLSearchParams(page.url().split('?')[1]).get('hypothesis'), String(lead.hypothesisIndex ?? 0));
  } finally { await page.close(); }
});
test('coverage, historical legal boundaries and methods expose real corpus counts and source access scope', async () => {
  const page = await visit(); try {
    await view(page, 'Coverage & gaps'); await page.locator('.rp-table-wrap').waitFor(); assert.equal(await page.locator('.rp-table-wrap tbody tr').count(), program.coverage.length); assert.match(await page.locator('#rp-content').innerText(), /not the size of a sector or an exhaustive population/);
    await view(page, 'Case comparisons'); await page.locator('.rp-comparisons').waitFor(); assert.equal(await page.locator('.rp-comparisons>article').count(), program.cases.length); assert.match(await page.locator('#rp-content').innerText(), /Analogies are not evidence against current actors/); assert(await page.locator('.rp-transferable details').count() > 0); await page.locator('.rp-transferable details summary').first().click(); assert(await page.getByText('Stop rule:', { exact: false }).count() > 0);
    await view(page, 'Methods library'); await page.locator('.rp-methods').waitFor(); assert.equal(await page.locator('.rp-methods>article').count(), program.methods.length); const category = program.methods[0].category; await page.getByLabel('Method category').selectOption(category); assert.equal(await page.locator('.rp-methods>article').count(), program.methods.filter(method => method.category === category).length);
  } finally { await page.close(); }
});
test('desktop/mobile desk and expanded plan fit the viewport, retain readable controls, and render without script errors', async () => {
  mkdirSync('/tmp/icip-research-program-review', { recursive: true });
  for (const width of [1440, 390]) { const errors = []; const page = await visit('', width); page.on('pageerror', error => errors.push(error.message)); try {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); assert(overflow <= 1, `viewport overflow ${overflow} at ${width}`);
    await page.screenshot({ path: `/tmp/icip-research-program-review/hero-${width}.png`, fullPage: false });
    await page.locator('.rp-drawing').evaluate(element => element.scrollIntoView({ block: 'start' })); await page.screenshot({ path: `/tmp/icip-research-program-review/network-${width}.png`, fullPage: false });
    await view(page, 'Testable leads'); const first = page.locator('.rp-lead').first(); await first.locator('.rp-plan>summary').click(); await first.getByLabel('Unit / comparison population').fill('Comparison population and negative controls'); await first.getByRole('button', { name: 'Capture plan revision', exact: true }).click();
    await first.locator('.rp-plan').scrollIntoViewIfNeeded(); await page.screenshot({ path: `/tmp/icip-research-program-review/plan-${width}.png`, fullPage: false });
    assert(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) <= 1); if (width < 500) assert(await first.getByLabel('Unit / comparison population').evaluate(element => parseFloat(getComputedStyle(element).fontSize)) >= 16); assert.deepEqual(errors, []);
    await view(page, 'Coverage & gaps'); await page.locator('.rp-table-wrap').waitFor(); await page.locator('.rp-table-wrap').evaluate(element => element.scrollIntoView({ block: 'start' })); if (width < 500) { const table = page.getByRole('region', { name: 'Sector research coverage table', exact: true }); await table.focus(); assert.equal(await table.evaluate(element => element === document.activeElement), true); await page.keyboard.press('ArrowRight'); await page.waitForFunction(() => document.querySelector('.rp-table-wrap').scrollLeft > 0); assert(await table.evaluate(element => element.scrollWidth > element.clientWidth)); } await page.screenshot({ path: `/tmp/icip-research-program-review/coverage-${width}.png`, fullPage: false });
  } finally { await page.close(); } }
});
