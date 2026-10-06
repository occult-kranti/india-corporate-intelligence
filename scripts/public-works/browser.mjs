#!/usr/bin/env node
/** Black-box public works desk workflow against the built app (or an explicit development URL). */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../../', import.meta.url));
const dist = resolve(root, process.env.PUBLIC_WORKS_DIST ?? 'dist');
const data = JSON.parse(readFileSync(resolve(root, 'src/data/public-works-research.json'), 'utf8'));
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  const file = resolve(dist, `.${path === '/' ? '/index.html' : path}`);
  if (!file.startsWith(`${dist}/`)) return res.writeHead(403).end();
  try { res.writeHead(200, { 'content-type': mime[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file)); }
  catch { res.writeHead(404).end(); }
});
let listening = false;
let base = process.env.PUBLIC_WORKS_BASE_URL;
if (!base) {
  await new Promise(done => server.listen(0, '127.0.0.1', done)); listening = true;
  base = `http://127.0.0.1:${server.address().port}`;
}
function parseCsv(csv) {
  const rows = []; let row = []; let cell = ''; let quoted = false;
  const text = csv.replace(/^\uFEFF/u, '');
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += char;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  assert.equal(quoted, false);
  const [headers, ...values] = rows;
  return values.map(values => Object.fromEntries(headers.map((header, i) => [header, values[i]])));
}
const binary = process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/usr/bin/chromium';
let browser;
let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks++; };
try {
  browser = await chromium.launch({ ...(existsSync(binary) ? { executablePath: binary } : {}) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const ready = () => page.getByRole('heading', { name: 'Roads, bridges & public works.', exact: true }).waitFor({ timeout: 30000 });
  const open = async (query = '') => {
    await page.goto(`${base}/#/public-works${query ? `?${query}` : ''}`); await ready();
    const params = new URLSearchParams(query);
    await page.waitForFunction(expected => {
      const page = document.querySelector('.public-works-page');
      const fields = page?.querySelectorAll('.pw-fields input');
      const state = page?.querySelector('.pw-fields select');
      return state?.value === expected.state && fields?.[0]?.value === expected.place && fields?.[1]?.value === expected.q
        && page?.querySelector('.pw-sector[aria-pressed="true"]')?.textContent === expected.sector;
    }, { state: data.states.some(state => state.code === params.get('state')) ? params.get('state') : '', place: params.get('place') ?? '', q: params.get('q') ?? '', sector: params.get('sector') === 'all' ? 'All sectors' : ({ electricity: 'Electricity', water: 'Water', hospitals: 'Hospitals & health', schools: 'Schools & colleges', police: 'Police', military: 'Military', recruitment: 'Recruitment', administration: 'Administration' })[params.get('sector')] ?? 'Roads & bridges' });
  };
  const exported = async name => {
    const downloading = page.waitForEvent('download'); await page.getByRole('button', { name, exact: true }).click();
    const download = await downloading; return parseCsv(readFileSync(await download.path(), 'utf8'));
  };
  await open();
  check(await page.getByRole('button', { name: 'Roads & bridges', exact: true }).getAttribute('aria-pressed') === 'true', 'roads is the declared initial sector');
  check(await page.getByLabel('State or union territory', { exact: true }).locator('option').count() === data.states.length + 1, 'all states and UTs are navigable');
  check((await page.locator('#pw-procurement').innerText()).includes('Agreement is unknown'), 'unavailable verification is not rendered as disagreement');
  check((await page.locator('#pw-repeat').innerText()).toLowerCase().includes('not assessable'), 'aggregate repeat work status is visible');
  const sections = await page.locator('.pw-nav button').all();
  for (const button of sections) {
    const hash = new URL(page.url()).hash; await button.click();
    check(new URL(page.url()).hash === hash, 'section jump preserves the research URL');
    check(await page.evaluate(() => document.activeElement?.tagName === 'H2'), 'section jump focuses the target heading');
  }
  await open('sector=all');
  const allRows = await exported('Export sources CSV');
  check(JSON.stringify(allRows.map(row => row.id).sort()) === JSON.stringify(data.sources.map(source => source.id).sort()), 'source CSV includes all filtered sources, including records beyond the visible page');
  for (const source of data.sources) {
    const row = allRows.find(row => row.id === source.id);
    for (const key of ['title', 'publisher', 'url', 'publishedAt', 'period', 'retrievedAt', 'retrievalStatus', 'locator', 'summary', 'scope']) assert.equal(row[key], String(source[key] ?? ''), `source CSV preserves ${source.id} ${key}`);
    assert.equal(row.limitations, source.limitations.join(' | '));
  }
  checks++;
  const buyerRows = await exported('Export buyer CSV');
  check(buyerRows.length === data.buyers.length, 'buyer CSV exports every matching aggregate');
  check(buyerRows.every(row => data.buyers.some(buyer => buyer.id === row.id && String(buyer.n) === row.n && buyer.period === row.period && buyer.classificationBasis === row.classificationBasis)), 'buyer export retains denominator, observation period and classification basis');

  for (const sector of ['roads', 'electricity', 'water', 'hospitals', 'schools', 'police', 'military', 'recruitment', 'administration']) {
    await open(`sector=${sector}`);
    check(await page.locator('.pw-sector[aria-pressed="true"]').count() === 1, `${sector} has one explicit selected lens`);
    const rows = await exported('Export sources CSV');
    check(rows.length === data.sources.filter(source => source.sectors.includes(sector)).length, `${sector} source coverage matches its corpus`);
  }
  await open('sector=all');
  await page.getByLabel('Supporting source type', { exact: true }).selectOption('news');
  await page.waitForFunction(() => document.querySelector('#pw-source-type-label + select')?.value === 'news');
  const newsRows = await exported('Export sources CSV');
  check(newsRows.length === data.sources.filter(source => source.type === 'news').length && newsRows.every(row => row.type === 'news'), 'source type filters the ledger and its full export');
  await open('sector=all');
  await page.getByLabel('State or union territory', { exact: true }).selectOption('KA');
  await page.getByLabel('Project, buyer, scheme or topic', { exact: true }).fill('water');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.waitForURL(url => url.hash.includes('state=KA') && url.hash.includes('q=water'));
  check(new URLSearchParams(new URL(page.url()).hash.split('?')[1]).get('state') === 'KA', 'state and submitted search compose in the URL');
  await page.goBack(); await ready();
  await page.waitForFunction(() => document.querySelectorAll('.pw-fields input')[1]?.value === '');
  check(await page.getByLabel('State or union territory', { exact: true }).inputValue() === 'KA', 'Back restores the previous state and search form');
  await page.goForward(); await ready();
  await page.waitForFunction(() => document.querySelectorAll('.pw-fields input')[1]?.value === 'water');
  check(await page.getByLabel('Project, buyer, scheme or topic', { exact: true }).inputValue() === 'water', 'Forward restores the query');
  await open('sector=all');
  await page.getByLabel('Project, buyer, scheme or topic', { exact: true }).fill('bridge');
  await page.evaluate(() => {
    const state = document.querySelector('.pw-fields select'); state.value = 'GJ'; state.dispatchEvent(new Event('change', { bubbles: true }));
    document.querySelector('form[aria-label="Search public works evidence"]').requestSubmit();
  });
  await page.waitForURL(url => url.hash.includes('state=GJ') && url.hash.includes('q=bridge'));
  check(true, 'rapid native state change and form submit preserve both actions');

  await open('sector=all&place=UnrecordedVillageOfTest');
  check(await page.locator('[data-source-id]').count() === 0 && await page.locator('[data-buyer-id]').count() === 0 && await page.locator('[data-case-id]').count() === 0, 'unknown locality does not inherit national records as local evidence');
  check((await page.locator('#pw-coverage').innerText()).includes('research') || await page.locator('.pw-discovery article').count() > 0, 'empty geography retains a research route');
  await open('sector=bogus&state=ZZ&type=bad&hops=9&networkView=bad&event=nonsense');
  check((await page.locator('.pw-workbench .pw-invalid').innerText()).includes('unrecognised'), 'invalid URL controls are disclosed');
  await open('sector=all&node=missing-entity&case=missing-case');
  check((await page.locator('#pw-network').innerText()).includes('linked entity') && (await page.locator('#pw-network').innerText()).includes('linked case'), 'unavailable case and entity context are disclosed');

  await open('sector=all');
  const firstSource = data.sources[0];
  await page.locator(`[data-source-id="${firstSource.id}"] .pw-save`).click();
  await page.getByRole('button', { name: /^Saved \(1\)$/u }).click();
  await page.waitForURL(url => url.hash.includes('saved=1'));
  await page.waitForFunction(() => document.querySelectorAll('[data-source-id]').length === 1);
  let savedRows = await exported('Export sources CSV');
  check(savedRows.length === 1 && savedRows[0].id === firstSource.id, 'saved-only export is scoped to the local public works reading list');
  await page.reload(); await ready();
  await page.locator(`[data-source-id="${firstSource.id}"]`).waitFor();
  check(await page.locator('[data-source-id]').count() === 1, 'reading list survives reload');
  await page.locator(`[data-source-id="${firstSource.id}"] .pw-save`).click();
  check(await page.getByRole('heading', { name: 'No saved sources match this view.' }).count() === 1, 'removing final saved source renders a useful empty state');
  await page.waitForFunction(() => document.activeElement?.tagName === 'H2');
  check(true, 'removing a saved-only row restores focus to its section');

  await open('sector=all');
  const preciseRule = data.rules.find(rule => /^\d{4}-\d{2}-\d{2}$/u.test(rule.effectiveFrom ?? ''));
  if (preciseRule) {
    await page.getByLabel('Optional procurement event date', { exact: true }).fill('1900-01-01');
    await page.waitForURL(url => url.hash.includes('event=1900-01-01'));
    await page.locator(`[data-rule-id="${preciseRule.id}"] .pw-status`).filter({ hasText: 'predates' }).waitFor();
    check((await page.locator(`[data-rule-id="${preciseRule.id}"]`).innerText()).includes('predates'), 'earlier events are not judged against a later rule');
  } else assert.fail('the finished corpus needs a dated legal record for the workflow check');

  await page.getByText('Compare two work records', { exact: false }).first().click();
  await page.getByRole('button', { name: 'Check comparability', exact: true }).click();
  check((await page.locator('.pw-repeat-result').innerText()).includes('0 of 2'), 'blank work records do not create a match');
  const fieldsets = page.locator('.pw-repeat-pair fieldset');
  for (let index = 0; index < 2; index++) {
    const fieldset = fieldsets.nth(index);
    for (const [name, value] of [['Procuring authority ID', 'authority-001'], ['Site or location ID', 'site-001'], ['Contract ID', `contract-${index}`], ['Asset ID', 'asset-001'], ['Scope or item code', 'scope-001'], ['Work period starts', '2024-01-01'], ['Work period ends', '2024-12-31']]) await fieldset.getByLabel(name, { exact: true }).fill(value);
  }
  await page.getByRole('button', { name: 'Check comparability', exact: true }).click();
  check((await page.locator('.pw-repeat-result').innerText()).includes('Overlapping scope needs review'), 'distinct comparable contracts produce a review question');
  await fieldsets.nth(1).getByLabel('This record was cancelled', { exact: true }).check();
  check((await page.locator('.pw-repeat-result').innerText()).trim() === '', 'editing inputs invalidates the old comparison');
  await page.getByRole('button', { name: 'Check comparability', exact: true }).click();
  check((await page.locator('.pw-repeat-result').innerText()).includes('1 of 2') && (await page.locator('.pw-repeat-result').innerText()).includes('cancelled'), 'cancelled record is excluded');
  await fieldsets.nth(1).getByLabel('This record was cancelled', { exact: true }).uncheck();
  await fieldsets.nth(1).getByLabel('Contract ID', { exact: true }).fill('contract-0');
  await page.getByRole('button', { name: 'Check comparability', exact: true }).click();
  check((await page.locator('.pw-repeat-result').innerText()).includes('No comparable overlap established'), 'same-contract entries do not become repeated physical work');

  await open('sector=all');
  check(data.relationships.length > 0, 'finished corpus includes sourced relationships');
  await page.getByRole('button', { name: 'Relationship table', exact: true }).click();
  await page.waitForURL(url => url.hash.includes('networkView=table'));
  const networkRows = await exported('Export relationships');
  check(networkRows.length === data.relationships.length, 'relationship CSV includes the complete filtered graph');
  await page.locator('.pw-network-table-wrap').waitFor();
  check(await page.locator('.pw-network-table-wrap tbody tr').count() === data.relationships.length, 'table alternative contains every relationship');
  const selectedEntity = data.entities.find(entity => entity.resolved && data.relationships.some(edge => edge.from === entity.id || edge.to === entity.id));
  await page.getByLabel('Focus an entity', { exact: true }).selectOption(selectedEntity.id);
  await page.waitForURL(url => url.hash.includes(`node=${encodeURIComponent(selectedEntity.id)}`));
  await page.getByRole('button', { name: '2 steps', exact: true }).click();
  await page.waitForURL(url => url.hash.includes('hops=2'));
  await page.reload(); await ready();
  check(await page.getByLabel('Focus an entity', { exact: true }).inputValue() === selectedEntity.id, 'focused network entity round-trips through reload');
  check(await page.getByRole('button', { name: 'Relationship table', exact: true }).getAttribute('aria-pressed') === 'true', 'graph/table selection round-trips through reload');
  await page.getByRole('button', { name: 'Network', exact: true }).click();
  const node = page.locator('[data-network-node]').first();
  const keyboardNodeId = await node.getAttribute('data-network-node');
  await node.focus(); await page.keyboard.press('Enter');
  await page.waitForURL(url => new URLSearchParams(url.hash.split('?')[1]).get('node') === keyboardNodeId);
  check(await page.locator(`[data-network-node="${keyboardNodeId}"]`).getAttribute('aria-pressed') === 'true', 'graph nodes support keyboard activation');

  await page.setViewportSize({ width: 390, height: 844 });
  await open('sector=roads&node=pwg-irb-idl&hops=1');
  await page.locator('[data-network-node="pwg-irb-idl"][aria-pressed="true"]').waitFor();
  await page.waitForFunction(() => {
    const plot = document.querySelector('.pw-network-plot');
    const node = plot?.querySelector('[data-network-node="pwg-irb-idl"]');
    if (!plot || !node) return false;
    const bounds = plot.getBoundingClientRect(), target = node.getBoundingClientRect();
    const x = target.x + target.width / 2, y = target.y + 28;
    return x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;
  });
  check(await page.locator('.pw-network-plot').evaluate(plot => plot.scrollLeft > 0), 'mobile URL-selected entity is centered inside the scrolling graph');

  await open();
  const screenshots = process.env.PUBLIC_WORKS_SCREENSHOTS;
  if (screenshots) mkdirSync(screenshots, { recursive: true });
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(() => document.querySelector('main').scrollTo(0, 0));
    await page.evaluate(() => document.fonts.ready);
    const overflow = await page.evaluate(() => ({ body: document.documentElement.scrollWidth > window.innerWidth + 1, main: document.querySelector('main').scrollWidth > document.querySelector('main').clientWidth + 1 }));
    check(!overflow.body && !overflow.main, `${width}px has no document or main horizontal overflow`);
    if (width === 320) {
      check(await page.locator('.pw-fields input').evaluateAll(nodes => nodes.every(node => parseFloat(getComputedStyle(node).fontSize) >= 16)), 'narrow search fields preserve 16px text');
      if (!(await page.locator('.pw-repeat-check').evaluate(node => node.open))) await page.locator('.pw-repeat-check summary').click();
      check(await page.evaluate(() => document.querySelector('main').scrollWidth <= document.querySelector('main').clientWidth + 1), 'expanded manual comparator fits 320px');
    }
    if (screenshots && [1440, 390].includes(width)) await page.screenshot({ path: resolve(screenshots, width === 1440 ? 'desktop.png' : 'mobile.png'), fullPage: false });
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  check(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), 'reduced-motion preference is active');
  check(errors.length === 0, `no browser page errors: ${errors.join('; ')}`);
  console.log(`PASS public works browser workflow: ${checks} checks; ${data.sources.length} sources, ${data.buyers.length} buyer aggregates, ${data.relationships.length} relationships.`);
} finally {
  if (browser) await browser.close();
  if (listening) await new Promise(done => server.close(done));
}
