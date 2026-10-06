#!/usr/bin/env node
/** Black-box checks of the water/food evidence workflow against the built app. */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { dossierUrl, dossier } from '../pages/dossier-navigation.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const dist = resolve(root, process.env.WATER_DIST ?? 'dist');
const data = JSON.parse(readFileSync(resolve(root, 'src/data/water-research.json'), 'utf8'));
const education = JSON.parse(readFileSync(resolve(root, 'src/data/education-research.json'), 'utf8'));
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const file = resolve(dist, `.${pathname === '/' ? '/index.html' : pathname}`);
  if (!file.startsWith(`${dist}/`)) return res.writeHead(403).end();
  try { res.writeHead(200, { 'content-type': mime[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file)); }
  catch { res.writeHead(404).end(); }
});
let listening = false;
let base = process.env.WATER_BASE_URL;
if (!base) {
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  listening = true;
  base = `http://127.0.0.1:${server.address().port}`;
}
const pinned = process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/opt/pw-browsers/chromium';
const fallback = existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined;
const executablePath = existsSync(pinned) ? pinned : fallback;

/** Read quoted CSV including embedded commas, double quotes and line breaks. */
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
  assert.equal(quoted, false, 'export must contain balanced CSV quotes');
  const [headers, ...values] = rows;
  return values.map(values => Object.fromEntries(headers.map((header, i) => [header, values[i]])));
}

let browser;
try {
  browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const ready = () => page.getByRole('heading', { name: 'Water, from source to plate.', exact: true }).waitFor();
  const open = async (query = '') => {
    await page.goto(dossierUrl(base, `/water${query ? `?${query}` : ''}`)); await ready();
    const params = new URLSearchParams(query);
    // A same-document hash navigation can leave the previous page heading present.
    // Wait for the new form state before reading cards or clicking their controls.
    await page.waitForFunction(expected => {
      const inputs = document.querySelectorAll('.water-search-fields input');
      return document.querySelector('select[aria-labelledby="water-state-label"]')?.value === expected.state
        && document.querySelector('select[aria-labelledby="water-window-label"]')?.value === expected.window
        && inputs[0]?.value === expected.place && inputs[1]?.value === expected.q
        && document.querySelector('.water-tools button[aria-pressed]')?.getAttribute('aria-pressed') === String(expected.saved);
    }, {
      state: data.states.some(state => state.code === params.get('state')) ? params.get('state') : '',
      window: ['all', 'background', 'undated'].includes(params.get('window')) ? params.get('window') : 'in-window',
      place: params.get('place') ?? '', q: params.get('q') ?? '', saved: params.get('saved') === '1',
    });
  };
  const selected = async (label, value) => {
    await page.waitForFunction(({ label, value }) => [...document.querySelectorAll('label')].some(node => node.textContent.includes(label) && node.querySelector('select')?.value === value), { label, value });
  };
  const exportRows = async () => {
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export CSV', exact: true }).click();
    const download = await downloading;
    return parseCsv(readFileSync(await download.path(), 'utf8'));
  };
  const verifyRows = (rows, expected) => {
    assert.deepEqual(rows.map(row => row.id).sort(), expected.map(source => source.id).sort(), 'CSV exports every and only matching source, including paginated records');
    for (const source of expected) {
      const row = rows.find(row => row.id === source.id);
      assert.equal(row.source_url, source.url, `source URL ${source.id}`);
      assert.equal(row.period, source.period, `source period ${source.id}`);
      assert.equal(row.review_window_status, source.windowStatus, `publication classification ${source.id}`);
      assert.equal(row.retrieval_status, source.retrievalStatus ?? '', `retrieval status ${source.id}`);
      assert.equal(row.locator, source.locator ?? '', `page locator ${source.id}`);
      assert.equal(row.valid_from, source.validFrom ?? '', `validity start ${source.id}`);
      assert.equal(row.valid_until, source.validUntil ?? '', `expiry ${source.id}`);
      assert.ok(row.limitations, `qualifications ${source.id}`);
      assert.equal(row.snapshot_date, data.updatedAt, `snapshot date ${source.id}`);
    }
  };

  await open();
  assert.equal(await dossier(page).getByLabel('State or union territory', { exact: true }).locator('option').count(), data.states.length + 1, 'all jurisdictions are navigable');
  await selected('Publication window', 'in-window');
  assert.ok((await page.locator('.water-window').innerText()).includes('Not a live alert service'));
  await page.locator('.water-window-summary').waitFor();
  assert.ok((await page.locator('.water-window-summary').innerText()).includes('undated'), 'undated coverage must be immediately discoverable');
  const inWindow = data.sources.filter(source => source.windowStatus === 'in-window');
  assert.ok(inWindow.length > 0, 'the five-year view needs sourced records');
  verifyRows(await exportRows(), inWindow);

  // Context and date uncertainty stay accessible without entering the five-year view.
  for (const window of ['background', 'undated', 'all']) {
    await dossier(page).getByLabel('Publication window', { exact: true }).selectOption(window);
    await selected('Publication window', window);
    const expected = data.sources.filter(source => window === 'all' || source.windowStatus === window);
    await page.waitForFunction(count => document.querySelector('.water-result-count strong')?.textContent === String(count), expected.length);
    if (expected.length) {
      verifyRows(await exportRows(), expected);
      const labels = await page.locator('.water-source-dates').allTextContents();
      if (window !== 'all') assert.ok(labels.every(label => label.includes(window === 'background' ? 'Background outside' : 'date / precision not established')));
    } else assert.equal(await page.getByRole('button', { name: 'Export CSV', exact: true }).isDisabled(), true);
  }

  // Historical warning validity is stated explicitly, not presented as a live alert.
  const expired = data.sources.find(source => source.issuedAt && source.validUntil && Date.parse(source.validUntil) < Date.parse(`${data.updatedAt}T23:59:59Z`));
  assert.ok(expired, 'fixture must retain a dated historical bulletin');
  await open(`window=all&q=${encodeURIComponent(expired.title)}`);
  const expiredCard = page.locator(`[id="water-source-${expired.id}"]`);
  await expiredCard.waitFor();
  const notice = await expiredCard.locator('.water-notice-status').innerText();
  assert.ok(notice.includes('Historical bulletin') && notice.includes('expired'), 'expired record must have an explicit historical label');
  assert.ok(notice.includes(expired.issuedAt) && notice.includes(expired.validUntil), 'issue and expiry are visible');
  if (expired.validFrom) assert.ok(notice.includes(expired.validFrom), 'validity start is distinct from issue date');

  // The two reading lists remain separate, and both survive page reloads.
  await open();
  const educationId = education.sources[0].id;
  await page.evaluate(id => localStorage.setItem('icip-education-reading-list-v1', JSON.stringify([id])), educationId);
  const firstWaterId = (await page.locator('.water-source').first().getAttribute('id')).slice('water-source-'.length);
  await page.getByRole('button', { name: /^Save source:/ }).first().click();
  await page.reload(); await ready();
  await page.getByRole('button', { name: /^Saved \(1\)$/ }).click();
  await page.waitForFunction(() => document.querySelectorAll('.water-source').length === 1);
  assert.equal(await page.locator('.water-source').getAttribute('id'), `water-source-${firstWaterId}`);
  assert.equal(await page.evaluate(() => localStorage.getItem('icip-education-reading-list-v1')), JSON.stringify([educationId]));
  await page.goto(dossierUrl(base, '/education?saved=1'));
  await page.getByRole('heading', { name: 'Who funds the classroom?', exact: true }).waitFor();
  await page.waitForFunction(() => document.querySelectorAll('.edu-source').length === 1);
  assert.equal(await page.locator('.edu-source').getAttribute('id'), `edu-source-${educationId}`);
  await open('saved=1');
  await page.waitForFunction(() => document.querySelectorAll('.water-source').length === 1);
  assert.equal(await page.locator('.water-source').getAttribute('id'), `water-source-${firstWaterId}`);

  // Filter navigation creates actual history and restores rendered control state.
  await open();
  const stateCode = data.states.find(state => state.code === 'KA')?.code ?? data.states[0].code;
  await dossier(page).getByLabel('State or union territory', { exact: true }).selectOption(stateCode);
  await selected('State or union territory', stateCode);
  await page.getByRole('group', { name: 'Filter by subject lens' }).getByRole('button', { name: 'Farming', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.water-lenses button[aria-pressed="true"]')?.textContent === 'Farming');
  await page.getByRole('group', { name: 'Filter by food-chain stage' }).getByRole('button', { name: /Seeds/ }).click();
  await page.waitForFunction(() => document.querySelector('.water-stage[aria-pressed="true"] .water-stage-name')?.textContent === 'Seeds');
  await page.goBack();
  await page.waitForFunction(() => !document.querySelector('.water-stage[aria-pressed="true"]'));
  assert.equal(await page.locator('.water-lenses button[aria-pressed="true"]').innerText(), 'Farming');
  await selected('State or union territory', stateCode);
  await page.goForward();
  await page.waitForFunction(() => document.querySelector('.water-stage[aria-pressed="true"] .water-stage-name')?.textContent === 'Seeds');
  assert.ok(page.url().includes('stage=seed') && page.url().includes('domain=farming'));

  // Rapid successive edits must compose even before a router render commits.
  await open();
  await dossier(page).getByLabel('State or union territory', { exact: true }).selectOption(stateCode);
  await page.waitForURL(new RegExp(`state=${stateCode}`));
  await dossier(page).getByLabel('Topic, crop, scheme or document', { exact: true }).fill('rice');
  await dossier(page).getByLabel('Topic, crop, scheme or document', { exact: true }).press('Enter');
  await page.waitForURL(/q=rice/);
  await selected('State or union territory', stateCode);
  assert.ok(page.url().includes(`state=${stateCode}`), 'rapid topic submission must retain the prior state selection');

  // Section jumps preserve HashRouter state and move reading focus to each heading.
  const url = page.url();
  const jumpNav = page.getByRole('navigation', { name: 'On this water and food page' });
  const targets = ['water-evidence-title', 'water-observations-title', 'water-investigations-title', 'water-discovery-title'];
  for (let i = 0; i < targets.length; i++) {
    await jumpNav.getByRole('button').nth(i).click();
    assert.equal(page.url(), url, 'in-page navigation changed route or filters');
    assert.equal(await page.evaluate(() => document.activeElement.id), targets[i], 'section heading receives focus');
  }

  // An unknown village has no matching evidence, while official retrieval routes survive.
  await open();
  const allDiscovery = await page.locator('.water-discovery').count();
  assert.ok(allDiscovery > 0, 'official discovery routes must be loaded');
  await dossier(page).getByLabel('City, district or village', { exact: true }).fill('UnrecordedVillage987654321');
  await dossier(page).getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByRole('heading', { name: 'No recorded sources match this view.', exact: true }).waitFor();
  assert.equal(await page.locator('.water-source').count(), 0);
  assert.equal(await page.getByRole('button', { name: 'Export CSV', exact: true }).isDisabled(), true);
  assert.equal(await page.locator('.water-discovery').count(), allDiscovery, 'discovery is not mistaken for matching local evidence');
  assert.ok(await page.locator('.water-local-discovery a[href^="https://"]').count() > 0, 'empty locality has an actionable external discovery path');

  // Invalid filters and corrupt storage recover without changing the education list.
  await page.evaluate(() => localStorage.setItem('icip-water-reading-list-v1', '{broken'));
  await page.reload(); await ready();
  await open('state=ZZ&domain=unknown&stage=invalid&window=bad&type=wrong');
  await page.locator('.water-invalid').waitFor();
  assert.ok((await page.locator('.water-invalid').innerText()).includes('default view'));
  await page.getByRole('button', { name: /^Saved \(0\)$/ }).waitFor();
  await page.getByRole('button', { name: 'Reset filters', exact: true }).click();
  await selected('Publication window', 'in-window');
  await selected('State or union territory', '');
  assert.equal(await page.evaluate(() => localStorage.getItem('icip-education-reading-list-v1')), JSON.stringify([educationId]));

  // Narrow reflow includes open provenance and local navigation, not just the hero.
  await open('window=all');
  await page.locator('.water-source details').first().evaluate(details => { details.open = true; });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.getByRole('navigation', { name: 'On this water and food page' }).getByRole('button').first().click();
    const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth, scrollY, focus: document.activeElement.id }));
    assert.ok(dimensions.document <= width && dimensions.body <= width, `no whole-page horizontal overflow at ${width}px: ${JSON.stringify(dimensions)}`);
    assert.equal(dimensions.focus, 'water-evidence-title');
    assert.equal(dimensions.scrollY, 0, 'local section navigation must not scroll the shell away');
  }
  assert.deepEqual(errors, [], `runtime errors: ${errors.join('; ')}`);
  console.log('water browser: OK — dated/undated evidence, expiry, complete provenance CSV, isolated reading lists, filter history, local discovery, section focus and narrow reflow');
} finally {
  await browser?.close();
  if (listening) await new Promise(done => server.close(done));
}
