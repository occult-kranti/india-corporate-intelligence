#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { createServer } from 'node:http';
import { chromium } from 'playwright';
import { loadInvestigation } from '../investigation/load.mjs';
import { loadAtlas } from './load.mjs';
import { loadDeepInvestigation } from '../deep-investigation/load.mjs';

const dist = resolve(process.env.INVESTIGATION_DIST ?? 'dist');
const output = resolve(process.env.ATLAS_CODE_AUDIT_ARTIFACTS ?? '/tmp/atlas-code-audit');
mkdirSync(output, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
let server;
let base = process.env.INVESTIGATION_BASE_URL;
if (!base) {
  server = createServer((request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const file = resolve(dist, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!file.startsWith(`${dist}/`)) { response.writeHead(403).end(); return; }
    try { response.writeHead(200, { 'content-type': mime[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file)); }
    catch { response.writeHead(404).end(); }
  });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  base = `http://127.0.0.1:${server.address().port}`;
}
base = base.replace(/\/$/u, '');
const api = await loadInvestigation();
const atlas = await loadAtlas();
const reviewedCaseNamespaces = new Set((await loadDeepInvestigation()).DEEP_INVESTIGATION_NAMESPACES);
const registry = api.INVESTIGATION_REGISTRY;
const checks = [], errors = [];
const check = (condition, label) => { assert.ok(condition, label); checks.push(label); };
const binary = process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/usr/bin/chromium';
const browser = await chromium.launch(existsSync(binary) ? { executablePath: binary } : {});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
page.setDefaultTimeout(25000);
page.on('pageerror', error => errors.push(error.message));
const params = () => new URLSearchParams(new URL(page.url()).hash.split('?')[1] ?? '');
const open = async (route = '/', values = {}) => {
  const query = new URLSearchParams(values);
  await page.goto(`${base}/#${route}${query.size ? `?${query}` : ''}`, { waitUntil: 'domcontentloaded' });
  await page.locator(`[data-workspace-route="${route}"]`).waitFor();
  await page.locator('.atlas-case-feed').waitFor();
};
const overflow = async label => check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${label}: no horizontal page overflow`);
try {
  for (const filters of [{ q: 'Adani' }, { q: 'CAG' }, { q: 'World Bank' }, { stateCode: 'KA', includeNational: false, geographyMode: 'associations' }, { stateCode: 'TN', includeNational: false, geographyMode: 'associations' }, { domains: ['international-finance'] }, { domains: ['defence-trade'] }]) {
    const shared = api.getInvestigationView(filters);
    const expected = shared.records.filter(record => atlas.atlasCaseCategory(record)).map(record => record.id).sort();
    const actual = atlas.getAtlasCaseFeed(registry, filters).entries.map(row => row.record.id).sort();
    assert.deepEqual(actual, expected, `Shared case matching: ${JSON.stringify(filters)}`);
    check(true, `Source-of-truth case matching: ${JSON.stringify(filters)}`);
    const atlasEdges = atlas.exploreAtlasGraph(registry, filters).ledger.map(row => row.id).sort();
    assert.deepEqual(atlasEdges, shared.relationships.map(row => row.id).sort(), `Shared network matching: ${JSON.stringify(filters)}`);
    check(true, `Source-of-truth relationship matching: ${JSON.stringify(filters)}`);
  }
  await open('/', { iw_domains: 'energy' });
  check(await page.getByRole('combobox', { name: 'Topic scope' }).inputValue() === 'overlay', 'Active sector overlay is named in the scope control');
  await page.getByRole('combobox', { name: 'Topic scope' }).selectOption('all');
  check(!params().has('iw_domains') && params().get('iw_scope') === 'all', 'All topics clears an explicit sector overlay');

  await open('/', { iw_domains: 'energy' });
  await page.locator('#iw-global-query').fill('Adani');
  await page.locator('#iw-global-query').press('Enter');
  check(!params().has('iw_domains') && params().get('iw_q') === 'Adani', 'Submitted global search clears an explicit sector overlay');
  const adaniCases = api.getInvestigationView({ q: 'Adani' }).records.filter(record => atlas.atlasCaseCategory(record));
  await page.waitForFunction(expected => document.querySelector('.atlas-record-count')?.textContent === `${expected} records`, adaniCases.length);
  check(true, 'Rendered case feed matches the shared global-search population including outcomes');

  const outside = registry.records.find(row => row.kind === 'investigation-case' && !row.domains.includes('energy'));
  check(Boolean(outside), 'A non-energy reviewed case is available for outside-scope regression');
  await open('/', { iw_domains: 'energy', iw_record: outside.id });
  await page.getByRole('button', { name: 'Broaden the view', exact: true }).click();
  check(!params().has('iw_domains'), 'Broadening a linked record clears its explicit sector overlay');
  await page.locator('.iw-notice').filter({ hasText: 'outside the current filters' }).waitFor({ state: 'detached' });
  check(true, 'Broadened record rejoins the active registry view');

  await open();
  const title = page.locator('.atlas-case-title').first();
  await title.click();
  await page.locator('.iw-inspector h2').waitFor();
  await page.waitForFunction(() => document.querySelector('.iw-inspector h2') === document.activeElement);
  check(await page.locator('.iw-inspector h2').evaluate(element => element === document.activeElement), 'Desktop record inspection moves focus into the visible reader');
  await page.keyboard.press('Escape');
  await page.locator('.iw-inspector').waitFor({ state: 'detached' });
  check(true, 'Escape dismisses the desktop map reader');
  check(await title.evaluate(element => element === document.activeElement), 'Escape restores focus to the triggering case title');

  for (const route of ['/international-finance', '/defence-trade']) {
    await open(route);
    check(await page.locator('.atlas-record-count').innerText() !== '0 records', `${route}: reviewed cases rendered`);
    const international = api.getInvestigationView({ domains: api.getRouteLens(route).domains }).internationalRecords;
    check((await page.locator('.iw-map-unlocated').innerText()).includes(`${international.toLocaleString()} international context`), `${route}: map reports country-context records without invented coordinates`);
    await overflow(route);
  }

  for (const stateCode of ['TN', 'KA']) {
    await page.goto(`${base}/#/follow-the-money?ftm_state=${stateCode}`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-follow-the-money]').waitFor();
    await page.waitForFunction(state => document.querySelector('.fm-map-panel .iw-map-select select')?.value === state, stateCode);
    const sharedWithNational = api.getInvestigationView({ stateCode, includeNational: true, includeUndated: true });
    const sharedWithoutNational = api.getInvestigationView({ stateCode, includeNational: false, includeUndated: true });
    const donorId = 'money-trails-corporate:record:donor-case';
    const donor = registry.records.find(row => row.id === donorId);
    check(Boolean(donor) && donor.geography.every(geo => geo.scope === 'national' && geo.stateCodes.length === 0 && geo.localityIds.length === 0), `${stateCode}: donor case remains national context without an invented state allocation`);
    check(sharedWithNational.records.some(row => row.id === donorId), `${stateCode}: including national context retains the donor case`);
    check(!sharedWithoutNational.records.some(row => row.id === donorId), `${stateCode}: excluding national context removes the donor case`);
    const expected = sharedWithNational.records.filter(row => row.kind === 'investigation-case' && reviewedCaseNamespaces.has(row.namespace)).map(row => row.id).sort();
    const actual = (await page.locator('[data-case-option]').evaluateAll(elements => elements.map(element => element.getAttribute('data-case-option')))).sort();
    assert.deepEqual(actual, expected, `${stateCode}: dedicated case index matches shared state associations`);
    check(true, `${stateCode}: dedicated case index agrees with source-of-truth state matching`);
    if (stateCode === 'TN') check(actual.includes('deep-services:record:byju-credit-bcci'), 'Tamil Nadu dedicated case index retains the association-only Byju’s record');
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await open('/');
  await overflow('Mobile homepage');
  const mobileTitle = page.locator('.atlas-case-title').first();
  await mobileTitle.click();
  await page.waitForFunction(() => document.querySelector('.iw-inspector h2') === document.activeElement);
  check(await page.locator('.iw-inspector h2').evaluate(element => element === document.activeElement), 'Mobile record reader receives focus');
  await page.locator('.iw-inspector').screenshot({ path: resolve(output, 'mobile-reader.png') });
  await page.keyboard.press('Escape');
  check(await mobileTitle.evaluate(element => element === document.activeElement), 'Mobile Escape restores the case title');
  await overflow('Mobile after reader dismissal');
  check(errors.length === 0, `No runtime exceptions (${errors.length})`);
  writeFileSync(resolve(output, 'acceptance.json'), `${JSON.stringify({ base, dist, checks: checks.length, results: checks, errors }, null, 2)}\n`);
  console.log(`Independent atlas code audit: ${checks.length} checks passed. ${output}`);
} finally {
  await browser.close();
  if (server) await new Promise(done => server.close(done));
}
