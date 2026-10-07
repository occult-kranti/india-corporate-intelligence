#!/usr/bin/env node
/** Independent rendered acceptance for shared workspace, geography and casebook. Graph traversal has its own suite. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { loadInvestigation } from './load.mjs';
import { loadMoneyTrails } from '../money-trails/load.mjs';
import { loadResearchRadar } from '../research-radar/load.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const out = resolve(root, process.env.INVESTIGATION_BROWSER_ARTIFACTS ?? '/tmp/investigation-browser-review');
mkdirSync(out, { recursive: true });
const dist = resolve(root, process.env.INVESTIGATION_DIST ?? 'dist');
const distIndexSha256 = !process.env.INVESTIGATION_BASE_URL && existsSync(resolve(dist, 'index.html')) ? createHash('sha256').update(readFileSync(resolve(dist, 'index.html'))).digest('hex') : null;
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  const file = resolve(dist, `.${path === '/' ? '/index.html' : path}`);
  if (!file.startsWith(`${dist}/`)) return res.writeHead(403).end();
  try { res.writeHead(200, { 'content-type': mime[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file)); }
  catch { res.writeHead(404).end(); }
});
let base = process.env.INVESTIGATION_BASE_URL;
let listening = false;
if (!base) { await new Promise(done => server.listen(0, '127.0.0.1', done)); listening = true; base = `http://127.0.0.1:${server.address().port}`; }
base = base.replace(/\/$/u, '');
const api = await loadInvestigation();
const registry = api.INVESTIGATION_REGISTRY;
const moneyTrails = (await loadMoneyTrails()).getMoneyTrailsView(registry).trails;
const radar = await loadResearchRadar();
const results = []; const pageErrors = []; const screenshots = [];
const scenarioFilter = process.env.INVESTIGATION_BROWSER_SCENARIO ?? '';
let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };
const rawParams = page => new URLSearchParams(new URL(page.url()).hash.split('?')[1] ?? '');
const routePaths = [...readFileSync(resolve(root, 'src/App.tsx'), 'utf8').matchAll(/<Route path="([^"]+)"/gu)].map(match => match[1]).filter(path => !path.includes(':') && path !== '*');
const routes = [...new Set([...routePaths, '/states/ka', '/company/reliance-industries', '/conglomerates/adani'])];
// Dedicated atlases own their geographic controls and evidence workflows;
// they intentionally do not expose the shared workspace's Dossier tab.
const dedicatedRoutes = new Map([
  ['/follow-the-money', { marker: '[data-follow-the-money]', stateLabel: 'State or union territory' }],
  ['/allegations', { marker: '[data-allegations-page]', stateLabel: 'State association', filtersButton: 'Filters' }],
  ['/money-trails', { marker: '[data-money-trails-page]', workflow: 'authored-money-trail' }],
  ['/research-radar', { marker: '[data-research-radar-page]', workflow: 'research-radar' }],
]);
const sharedRoutes = routes.filter(route => !dedicatedRoutes.has(route));
const binary = process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/usr/bin/chromium';
const browser = await chromium.launch({ ...(existsSync(binary) ? { executablePath: binary } : {}) });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true, reducedMotion: 'reduce' });
const page = await context.newPage();
page.on('pageerror', error => pageErrors.push({ url: page.url(), message: error.message }));
page.setDefaultTimeout(15000);
const ready = async (route, surface = 'map') => {
  await page.waitForFunction(({ route, surface }) => {
    const workspace = document.querySelector('[data-investigation-workspace]');
    return workspace?.getAttribute('data-workspace-route') === route && workspace.classList.contains(`iw-surface-${surface}`) && document.querySelectorAll('.iw-map-state').length === 36;
  }, { route, surface }, { timeout: 45000 });
  await page.evaluate(() => document.fonts.ready);
};
const open = async (route = '/welfare', params = {}) => {
  const query = new URLSearchParams(params);
  await page.goto(`${base}/#${route}${query.size ? `?${query}` : ''}`);
  const surface = ['map', 'connections', 'evidence', 'casebook', 'dossier'].includes(params.iw_view) ? params.iw_view : 'map';
  await ready(route, surface);
  await page.waitForFunction(expected => document.querySelector('#iw-global-query')?.value === expected, params.iw_q ?? '');
  const selectedId = [params.iw_edge, params.iw_record, params.iw_node].find(id => id && [...registry.relationships, ...registry.records, ...registry.entities].some(row => row.id === id));
  const selectedSource = params.iw_source && registry.sources.some(row => row.id === params.iw_source) ? params.iw_source : null;
  const routeStateRaw = /^\/states\/([^/]+)$/u.exec(route)?.[1];
  const routeState = routeStateRaw ? api.normalizeInvestigationState(routeStateRaw) : undefined;
  const state = Object.hasOwn(params, 'iw_state') ? registry.states.some(row => row.code === params.iw_state) ? params.iw_state : '' : routeState ?? '';
  await page.waitForFunction(({ state, selectedId, selectedSource, surface }) => {
    const selected = document.querySelector('[data-investigation-selection]');
    const source = document.querySelector('[data-investigation-source]');
    const stateControl = document.querySelector('select[aria-labelledby="iw-state-label"]');
    if (stateControl?.value !== state) return false;
    if (surface === 'casebook' || surface === 'dossier') return true;
    if (selectedSource) return source?.getAttribute('data-investigation-source') === selectedSource;
    return selectedId ? selected?.getAttribute('data-investigation-selection') === selectedId : !selected && !source;
  }, { state, selectedId, selectedSource, surface });
};
const surface = name => page.getByRole('navigation', { name: 'Investigation surface', exact: true }).getByRole('button', { name, exact: true });
const overflow = async label => {
  const value = await page.evaluate(() => ({ inner: innerWidth, body: document.body.scrollWidth, html: document.documentElement.scrollWidth }));
  check(value.body <= value.inner + 1 && value.html <= value.inner + 1, `${label}: no body overflow ${JSON.stringify(value)}`);
};
const exported = async name => {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name, exact: true }).click();
  const download = await pending; return { text: readFileSync(await download.path(), 'utf8'), filename: download.suggestedFilename() };
};
async function run(name, task) {
  if (scenarioFilter && !name.includes(scenarioFilter)) return;
  const start = Date.now();
  try { await task(); results.push({ name, status: 'passed', milliseconds: Date.now() - start }); console.log(`PASS ${name}`); }
  catch (error) {
    const path = resolve(out, `failure-${results.length + 1}.png`);
    await page.screenshot({ path, fullPage: true }).catch(() => {});
    results.push({ name, status: 'failed', message: error.message, url: page.url(), screenshot: path, milliseconds: Date.now() - start }); console.error(`FAIL ${name}: ${error.message}`);
  }
}

try {
  await run('Every registered route opens its declared 36-state geographic surface', async () => {
    for (const route of routes) {
      const dedicated = dedicatedRoutes.get(route);
      if (dedicated) {
        await page.goto(`${base}/#${route}`);
        await page.locator(dedicated.marker).waitFor({ timeout: 45000 });
        check(await page.locator(dedicated.marker).count() === 1, `${route}: one dedicated atlas`);
        check(await page.locator('[data-investigation-workspace]').count() === 0, `${route}: dedicated atlas is not nested in the dossier wrapper`);
        if (dedicated.filtersButton) await page.getByRole('button', { name: dedicated.filtersButton, exact: true }).click();
        await page.locator('.iw-map-state').first().waitFor();
      } else {
        await open(route);
        check(await page.locator('[data-investigation-workspace]').count() === 1, `${route}: one shared workspace`);
      }
      const codes = await page.locator('.iw-map-state').evaluateAll(items => items.map(item => item.getAttribute('data-state-code')));
      check(codes.length === 36 && new Set(codes).size === 36, `${route}: 36 distinct geographic shapes`);
      check(codes.includes('LA') && codes.includes('DN') && !codes.includes('DD') && codes.includes('OD') && codes.includes('CG'), `${route}: current state/UT codes`);
      if (dedicated?.workflow === 'research-radar') {
        const cityControl = page.getByRole('combobox', { name: 'Research city', exact: true });
        const cityOptions = await cityControl.locator('option').evaluateAll(items => items.map(item => item.value));
        check(JSON.stringify(cityOptions) === JSON.stringify(['', ...radar.RADAR_CITIES.map(city => city.id)]), `${route}: all exact planning cities remain selectable`);
        // The keyboard interaction follows the map's accessible city-node control.
        await page.locator('[data-radar-city="delhi"]').press('Enter');
        await page.waitForFunction(() => new URLSearchParams(location.hash.split('?')[1] ?? '').get('rr_city') === 'delhi' && document.querySelector('select[aria-label="Research city"]')?.value === 'delhi' && document.querySelector('[data-radar-city="delhi"]')?.getAttribute('aria-pressed') === 'true');
        check(await cityControl.inputValue() === 'delhi', `${route}: map node updates its native city filter`);
        check(await page.locator('[data-radar-city="delhi"]').getAttribute('aria-pressed') === 'true', `${route}: selected city retains geographic emphasis`);
        const selectedCaseId = await page.locator('[data-research-radar-page]').getAttribute('data-radar-case');
        const original = radar.radarCaseById(selectedCaseId);
        check(!!original && original.cityIds.includes('delhi'), `${route}: map selection opens an exact retained Delhi-context investigation`);
        const dossier = page.locator(`[data-radar-dossier="${original.id}"]`);
        check(await dossier.locator('.rr-case-summary').textContent() === original.summary, `${route}: complete authored case summary remains visible`);
        const renderedCounterevidence = await dossier.locator('[data-radar-counterevidence] > p').allTextContents();
        check(JSON.stringify(renderedCounterevidence) === JSON.stringify(original.counterevidence.map(item => item.text)), `${route}: every counterevidence statement is retained verbatim`);
        check(await dossier.locator('[data-radar-node]').count() === original.entities.length, `${route}: graph retains every authored case entity`);
        check((await dossier.locator('[data-radar-scenario]').innerText()).includes('Probability: not estimated'), `${route}: scenario does not invent a probability`);
        const packet = JSON.parse((await exported('Export complete radar research packet')).text);
        check(JSON.stringify(packet.case) === JSON.stringify(original), `${route}: export retains the full exact case, alternatives, falsifiers and source references`);
        check(packet.forecastStatus === 'untrained-uncalibrated' && packet.case.scenario.probability === null, `${route}: exported scenario preserves unavailable calibration`);
        check(packet.missingSourceIds.length === 0, `${route}: exported provenance has no dangling sources`);
        await dossier.locator('.rr-all-sources > summary').click();
        for (const sourceId of original.sourceIds) {
          const source = radar.radarSourceById(sourceId);
          check(!!source && packet.sources.some(item => item.id === sourceId && item.url === source.url), `${route}: export retains exact source ${sourceId}`);
          await dossier.locator(`.rr-all-sources [data-radar-source="${sourceId}"]`).click();
          const reader = page.locator(`[data-radar-reader="${sourceId}"]`);
          await reader.waitFor();
          check(await reader.getByRole('link', { name: 'Read original source', exact: true }).getAttribute('href') === source.url, `${route}: ${sourceId} opens its exact original URL`);
          check((await reader.innerText()).includes(source.locator), `${route}: ${sourceId} exposes the complete retained source locator`);
          await reader.getByRole('button', { name: 'Close radar evidence reader', exact: true }).click();
          await reader.waitFor({ state: 'hidden' });
        }
        check(await page.locator('.iw-map-state').count() === 36, `${route}: reader and export preserve all geographic shapes`);
      } else if (dedicated?.workflow === 'authored-money-trail') {
        // This dedicated page selects an authored investigation, then a geographic
        // evidence hub. Its full original dossier opens in the evidence reader.
        const investigations = page.getByRole('combobox', { name: 'Choose money-trail investigation', exact: true });
        const optionIds = await investigations.locator('option').evaluateAll(items => items.map(item => item.value));
        check(moneyTrails.length > 0 && JSON.stringify(optionIds) === JSON.stringify(moneyTrails.map(trail => trail.id)), `${route}: every authored investigation is selectable`);
        const selectedTrailId = await investigations.inputValue();
        const selectedTrail = moneyTrails.find(trail => trail.id === selectedTrailId);
        check(!!selectedTrail, `${route}: selected investigation is a retained exact trail`);
        check(await page.locator('[data-money-trails-page]').getAttribute('data-money-view') === 'map', `${route}: geographic map is the default surface`);
        // Delhi's small boundary is covered by its visible evidence-hub marker;
        // activate that user-facing geographic target instead of forcing through it.
        await page.locator('[data-flat-map-hub="state:DL"]').click();
        await page.locator('[data-map-place="state:DL"]').waitFor();
        await page.waitForFunction(() => new URLSearchParams(location.hash.split('?')[1] ?? '').get('mt_selection') === 'state:state:DL');
        check(await page.locator('.iw-map-state[data-state-code="DL"]').getAttribute('aria-pressed') === 'true', `${route}: state selection updates its geographic control`);
        check(await page.getByRole('region', { name: 'Selected state evidence', exact: true }).count() === 1, `${route}: state selection opens the sourced geographic evidence hub`);
        await page.getByRole('button', { name: 'Close place details', exact: true }).click();
        await page.locator('[data-map-place]').waitFor({ state: 'hidden' });
        await page.waitForFunction(() => !new URLSearchParams(location.hash.split('?')[1] ?? '').has('mt_selection'));
        check(await page.locator('.iw-map-state[data-state-code="DL"]').getAttribute('aria-pressed') === 'false', `${route}: clearing the geographic hub clears the selected map state`);
        await page.getByRole('button', { name: 'Open investigation dossier', exact: true }).click();
        const reader = page.locator('.atlas-evidence-popover');
        await reader.waitFor();
        check(await reader.getAttribute('data-selection-id') === selectedTrail.caseRecordId, `${route}: dossier opens the exact original case record`);
        const original = registry.records.find(record => record.id === selectedTrail.caseRecordId);
        check(!!original && (await reader.innerText()).includes(original.title), `${route}: the full original dossier title is rendered`);
        check(await reader.locator('.atlas-reader-summary').textContent() === original.summary, `${route}: the complete original case summary is rendered`);
        await reader.getByRole('tab', { name: /^Sources/ }).click();
        check(original.sourceIds.length > 0, `${route}: original dossier declares source provenance`);
        for (const sourceId of original.sourceIds) {
          const source = registry.sources.find(row => row.id === sourceId);
          check(!!source, `${route}: original source ${sourceId} resolves exactly`);
          // Exact-ID search verifies every citation, including sources beyond the
          // first reader page; an unrelated visible link cannot satisfy this check.
          await reader.getByRole('searchbox', { name: 'Search sources', exact: true }).fill(sourceId);
          const sourceLink = reader.getByRole('tabpanel').getByRole('link', { name: `${source.title} ↗`, exact: true });
          await sourceLink.waitFor();
          check(await sourceLink.getAttribute('href') === source.url, `${route}: original source ${sourceId} exposes its exact retained URL`);
        }
        await reader.getByRole('button', { name: 'Close evidence details', exact: true }).click();
        await reader.waitFor({ state: 'hidden' });
        check(await page.locator('.iw-map-state').count() === 36, `${route}: closing the dossier preserves all geographic shapes`);
      } else {
        check(await page.getByRole('combobox', { name: dedicated?.stateLabel ?? 'Place', exact: true }).locator('option').count() === 37, `${route}: all 36 places plus the unfiltered national view`);
      }
      await overflow(route);
    }
  });
  await run('Route lenses and geographic controls preserve context through history', async () => {
    await open('/welfare', { legacyMarker: 'retained' });
    const topic = await page.getByRole('combobox', { name: 'Topic scope', exact: true }).locator('option[value="route"]').innerText();
    check(/welfare|distribution/iu.test(topic), 'welfare route has a welfare topic lens');
    await page.locator('.iw-map-state[data-state-code="MP"]').click();
    await page.waitForFunction(() => new URLSearchParams(location.hash.split('?')[1]).get('iw_state') === 'MP' && document.querySelector('select[aria-labelledby="iw-state-label"]')?.value === 'MP');
    check(await page.getByRole('combobox', { name: 'Place', exact: true }).inputValue() === 'MP', 'map selection updates state control');
    await page.getByRole('button', { name: 'Layers & dates' }).click();
    await page.getByLabel('Retain national context in state views').click();
    await page.waitForFunction(() => new URLSearchParams(location.hash.split('?')[1]).get('iw_national') === '0' && [...document.querySelectorAll('label')].find(label => label.textContent === 'Retain national context in state views')?.querySelector('input')?.checked === false);
    await page.getByLabel('Include undated records').click();
    await page.waitForFunction(() => new URLSearchParams(location.hash.split('?')[1]).get('iw_undated') === '0' && [...document.querySelectorAll('label')].find(label => label.textContent === 'Include undated records')?.querySelector('input')?.checked === false);
    await page.getByLabel(/Recorded window — from|Recorded period starts after/u).fill('2021-10-06');
    await page.waitForFunction(() => new URLSearchParams(location.hash.split('?')[1]).get('iw_from') === '2021-10-06');
    await page.getByLabel(/Recorded window — through|Recorded period ends before/u).fill('2026-10-06');
    await page.waitForFunction(() => new URLSearchParams(location.hash.split('?')[1]).get('iw_to') === '2026-10-06');
    await page.getByRole('combobox', { name: 'Compare state coverage', exact: true }).selectOption('OD');
    await surface('Evidence').click(); await ready('/welfare', 'evidence');
    for (const [key, value] of Object.entries({ iw_state: 'MP', iw_compare: 'OD', iw_national: '0', iw_undated: '0', iw_from: '2021-10-06', iw_to: '2026-10-06', legacyMarker: 'retained' })) check(rawParams(page).get(key) === value, `${key} survives surface switch`);
    check((await page.getByRole('region', { name: 'State evidence coverage comparison' }).innerText()).includes('do not measure'), 'comparison warns that coverage is not performance');
    await page.getByRole('navigation', { name: 'Primary navigation', exact: true }).getByRole('link', { name: 'Education', exact: true }).click();
    await ready('/education', 'evidence');
    check(rawParams(page).get('iw_state') === 'MP' && rawParams(page).get('iw_from') === '2021-10-06', 'state/date context follows navigation');
    check(rawParams(page).get('iw_scope') !== 'all', 'route navigation restores topic lens instead of forcing all topics');
    await page.goBack(); await ready('/welfare', 'evidence');
    check(rawParams(page).get('legacyMarker') === 'retained', 'history restores original route-specific parameter');
    await page.reload(); await ready('/welfare', 'evidence');
    check(await page.getByRole('combobox', { name: 'Place', exact: true }).inputValue() === 'MP', 'reload restores state');
    await page.getByRole('button', { name: 'Reset workspace', exact: true }).click(); await ready('/welfare', 'map');
    check(rawParams(page).get('legacyMarker') === 'retained' && ![...rawParams(page).keys()].some(key => key.startsWith('iw_')), 'reset preserves original route parameters');
  });
  await run('State routes preserve an explicit All India choice and reject ambiguous old boundaries', async () => {
    await open('/states/ka');
    check(await page.getByRole('combobox', { name: 'Place', exact: true }).inputValue() === 'KA', 'state route defaults to current Karnataka boundary');
    await page.getByRole('navigation', { name: 'Primary navigation', exact: true }).getByRole('link', { name: 'Education', exact: true }).click();
    await ready('/education');
    check(await page.getByRole('combobox', { name: 'Place', exact: true }).inputValue() === 'KA', 'route-derived Karnataka context follows cross-lens navigation');
    check(rawParams(page).get('iw_state') === 'KA', 'cross-lens navigation serializes the route-derived state');
    await page.goBack(); await ready('/states/ka');
    await page.getByRole('combobox', { name: 'Place', exact: true }).selectOption('');
    await page.waitForFunction(() => new URLSearchParams(location.hash.split('?')[1]).get('iw_state') === 'all');
    await page.reload(); await ready('/states/ka');
    check(await page.getByRole('combobox', { name: 'Place', exact: true }).inputValue() === '', 'explicit All India survives reload on a state route');
    await surface('Evidence').click(); await ready('/states/ka', 'evidence');
    check(rawParams(page).get('iw_state') === 'all', 'explicit All India survives surface switch');
    await page.getByRole('navigation', { name: 'Primary navigation', exact: true }).getByRole('link', { name: 'Education', exact: true }).click();
    await ready('/education', 'evidence');
    check(rawParams(page).get('iw_state') === 'all' && await page.getByRole('combobox', { name: 'Place', exact: true }).inputValue() === '', 'explicit All India follows cross-lens navigation without restoring a route default');
    for (const state of ['jk', 'dn', 'dd']) {
      await open(`/states/${state}`);
      check(await page.getByRole('combobox', { name: 'Place', exact: true }).inputValue() === '', `${state}: ambiguous historical boundary is not mapped to a modern state`);
      check((await page.locator('.iw-invalid').innerText()).includes('does not establish a current geographic boundary'), `${state}: legacy boundary is explained`);
    }
    await open('/states/jk', { iw_state: 'LA' });
    check(await page.getByRole('combobox', { name: 'Place', exact: true }).inputValue() === 'LA', 'explicit modern boundary overrides an ambiguous dossier route');
  });
  await run('Search drafts reset when history reverses a just-submitted query', async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      await open('/investigate');
      await page.locator('#iw-global-query').fill(`unsubmitted-history-review-${attempt}-x9z`);
      await page.locator('.iw-global-search').getByRole('button', { name: 'Search', exact: true }).click();
      await page.goBack();
      await ready('/investigate');
      await page.waitForFunction(() => !new URLSearchParams(location.hash.split('?')[1]).has('iw_q') && document.querySelector('#iw-global-query')?.value === '');
      check(rawParams(page).get('iw_q') === null && await page.locator('#iw-global-query').inputValue() === '', `history cycle ${attempt + 1}: URL and visible search draft return together`);
    }
  });
  await run('Evidence inspector retains original source, response and separate money stages', async () => {
    await open('/welfare', { iw_state: 'MP', iw_view: 'evidence', iw_q: 'Take Home Ration', iw_scope: 'all', iw_national: '0' });
    const title = 'Madhya Pradesh: reconcile ration orders with beneficiary counts';
    await page.locator('.iw-ledger-list button[aria-pressed]').filter({ hasText: title }).click();
    const inspector = page.getByRole('complementary', { name: 'Evidence inspector' });
    await inspector.locator('.iw-response').waitFor();
    check((await inspector.innerText()).includes('Government said its numbers were correct'), 'government response is next to audit interpretation');
    check((await inspector.innerText()).includes('122.99') && (await inspector.innerText()).includes('100.9') && (await inspector.innerText()).includes('22.09') && (await inspector.innerText()).includes('110.78'), 'all four amount stages visible');
    check((await inspector.innerText()).includes('must never be summed'), 'overlapping amount limitation visible');
    const recordId = rawParams(page).get('iw_record');
    check(Boolean(recordId?.includes('mp-thr-beneficiary-reconciliation')), 'selection has a stable canonical record URL');
    const source = inspector.locator('.iw-citations').getByRole('button').first();
    await source.click();
    await page.waitForFunction(() => Boolean(new URLSearchParams(location.hash.split('?')[1]).get('iw_source')));
    await page.waitForFunction(() => {
      const sourceId = new URLSearchParams(location.hash.split('?')[1]).get('iw_source');
      return Boolean(sourceId) && document.querySelector('[data-investigation-source]')?.getAttribute('data-investigation-source') === sourceId;
    });
    check((await inspector.innerText()).includes('2.2.11.1'), 'source inspector exposes exact locator');
    const origin = inspector.getByRole('link', { name: /Read cited source/u }).first();
    check((await origin.getAttribute('href')).includes('cag.gov.in'), 'source URL remains official CAG origin');
    check(await origin.getAttribute('target') === '_blank', 'opening origin preserves workspace tab');
    await page.goBack();
    await page.waitForFunction(id => new URLSearchParams(location.hash.split('?')[1]).get('iw_record') === id && !new URLSearchParams(location.hash.split('?')[1]).has('iw_source'), recordId);
    await page.reload(); await ready('/welfare', 'evidence');
    check((await inspector.innerText()).includes('must never be summed'), 'record interpretation survives reload');
  });
  await run('Casebook pins, notes, saved views, JSON/Markdown and safe additive import', async () => {
    const record = registry.records.find(row => row.namespace === 'welfare-research' && row.originalId === 'mp-thr-beneficiary-reconciliation');
    check(Boolean(record), 'reviewed welfare record available');
    await open('/welfare', { iw_view: 'evidence', iw_record: record.id, iw_state: 'MP' });
    await page.getByRole('complementary', { name: 'Evidence inspector' }).getByRole('button', { name: /Pin to casebook|Pin evidence|Save to casebook/u }).click();
    await surface('Casebook').click(); await ready('/welfare', 'casebook');
    check(await page.locator(`[data-casebook-pin="${record.id}"]`).count() === 1, 'record pinned once');
    await page.getByLabel('Investigation title', { exact: true }).fill('Welfare evidence acceptance');
    await page.getByLabel('Question or hypothesis', { exact: true }).fill('Can the supply ledger reconcile to eligible recipients?');
    await page.getByLabel('What would close or disprove this question?', { exact: true }).fill('Matched dated receipts and an action-taken statement.');
    await page.getByLabel('Analyst note — user-entered', { exact: true }).fill('Analyst test note; no assertion of individual guilt.');
    await page.getByLabel('View label', { exact: true }).fill('Madhya Pradesh source review');
    await page.getByRole('button', { name: 'Save this view', exact: true }).click();
    const saved = page.getByRole('link', { name: 'Madhya Pradesh source review', exact: true });
    check((await saved.getAttribute('href')).startsWith('#/welfare?'), 'saved view is portable hash route');
    const jsonExport = await exported('Export evidence JSON'); const packet = JSON.parse(jsonExport.text);
    check(packet.schema === 'icip.evidence-packet.v1' && packet.casebook.pins.length === 1, 'JSON packet has schema and explicit pin');
    check(packet.casebook.pins[0].note.startsWith('Analyst test note'), 'JSON retains user note');
    const retained = packet.records.find(item => item.id === record.id);
    check(retained?.response === record.response && retained.amounts.length === 4 && retained.falsifier === record.falsifier, 'JSON retains response, amount stages and falsifier');
    check(packet.sources.some(source => source.url.includes('cag.gov.in')), 'JSON carries source ledger');
    const markdownExport = await exported('Export reading brief');
    check(markdownExport.text.includes('Recorded response or procedural context') && markdownExport.text.includes('Analyst note (user-entered)') && markdownExport.text.includes('Linked context and counter-evidence') && markdownExport.text.includes('100.9'), 'Markdown carries response, analyst distinction and amounts');
    writeFileSync(resolve(out, 'casebook.json'), jsonExport.text); writeFileSync(resolve(out, 'casebook.md'), markdownExport.text);
    await page.getByRole('button', { name: `Remove ${record.title} from casebook`, exact: true }).click();
    check(await page.locator('[data-casebook-pin]').count() === 0, 'remove only pin');
    await page.getByLabel('Import casebook JSON file').setInputFiles({ name: 'casebook.json', mimeType: 'application/json', buffer: Buffer.from(jsonExport.text) });
    await page.getByText('Imported casebook merged.', { exact: false }).waitFor();
    check(await page.getByLabel('Analyst note — user-entered').inputValue() === packet.casebook.pins[0].note, 'JSON import restores analyst note');
    await page.getByLabel('Analyst note — user-entered').fill('Existing local note must survive import.');
    await page.getByLabel('Import casebook JSON file').setInputFiles({ name: 'same.json', mimeType: 'application/json', buffer: Buffer.from(jsonExport.text) });
    await page.getByText('Imported casebook merged.', { exact: false }).waitFor();
    check(await page.getByLabel('Analyst note — user-entered').inputValue() === 'Existing local note must survive import.', 'additive import preserves existing nonempty note');
    await page.getByLabel('Import casebook JSON file').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{"version":999}') });
    await page.getByText('This file does not contain a supported ICIP casebook.', { exact: true }).waitFor();
    check(await page.locator('[data-casebook-pin]').count() === 1, 'invalid import leaves pin intact');
    await page.reload(); await ready('/welfare', 'casebook');
    check(await page.getByLabel('Analyst note — user-entered').inputValue() === 'Existing local note must survive import.', 'notes persist across reload');
    await page.getByRole('button', { name: 'Inspect source record', exact: true }).click(); await ready('/welfare', 'evidence');
    check(rawParams(page).get('iw_record') === record.id, 'casebook inspect returns to exact record');
  });
  await run('Pinned relationship export retains explicitly linked counter-evidence', async () => {
    const edge = registry.relationships.find(row => row.responseIds.length > 0 && row.responseIds.every(id => registry.records.some(record => record.id === id)));
    check(Boolean(edge), 'registry contains an explicit response-linked relationship');
    await open('/investigate', { iw_view: 'evidence', iw_scope: 'all', iw_edge: edge.id });
    const inspector = page.getByRole('complementary', { name: 'Evidence inspector' });
    check((await inspector.innerText()).toLowerCase().includes('response & counter-evidence'), 'explicit response section renders');
    await inspector.getByRole('button', { name: /Pin to casebook|Pin evidence|Save to casebook/u }).click();
    await surface('Casebook').click(); await ready('/investigate', 'casebook');
    const packet = JSON.parse((await exported('Export evidence JSON')).text);
    for (const id of edge.responseIds) check(packet.records.some(record => record.id === id), `export retains linked response ${id}`);
    check(packet.relationships.some(item => item.id === edge.id), 'pinned relationship retained');
  });
  await run('Capacity-limited imports reject the complete merge without losing local work', async () => {
    await open('/investigate', { iw_view: 'casebook' });
    const key = 'icip.investigation.casebook.v1';
    const backup = await page.evaluate(key => localStorage.getItem(key), key);
    const timestamp = '2026-10-06T00:00:00.000Z';
    const blank = { version: 1, title: 'Capacity review', question: 'Keep every local item', falsifier: '', pins: [], views: [] };
    const importBook = async book => page.getByLabel('Import casebook JSON file').setInputFiles({ name: 'capacity.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(book)) });
    try {
      const current = { ...blank, pins: registry.records.slice(0, 249).map(record => ({ kind: 'record', id: record.id, addedAt: timestamp, note: 'Preserve this local note.' })) };
      await page.evaluate(({ key, book }) => localStorage.setItem(key, JSON.stringify(book)), { key, book: current });
      await page.reload(); await ready('/investigate', 'casebook');
      const beforePins = await page.evaluate(key => localStorage.getItem(key), key);
      await importBook({ ...blank, pins: registry.records.slice(249, 251).map(record => ({ kind: 'record', id: record.id, addedAt: timestamp, note: '' })) });
      await page.getByText('Import would exceed the casebook limit', { exact: false }).waitFor();
      check(await page.evaluate(key => localStorage.getItem(key), key) === beforePins, '249 existing plus 2 incoming pins are rejected atomically');
      const withViews = { ...blank, views: Array.from({ length: 40 }, (_, index) => ({ id: `capacity-${index}`, label: `View ${index}`, url: `#/welfare?iw_q=capacity-${index}`, savedAt: timestamp })) };
      await page.evaluate(({ key, book }) => localStorage.setItem(key, JSON.stringify(book)), { key, book: withViews });
      await page.reload(); await ready('/investigate', 'casebook');
      const beforeViews = await page.evaluate(key => localStorage.getItem(key), key);
      await importBook({ ...blank, views: [{ id: 'extra-view', label: 'One extra view', url: '#/welfare?iw_q=one-extra', savedAt: timestamp }] });
      await page.getByText('Import would exceed the casebook limit', { exact: false }).waitFor();
      check(await page.evaluate(key => localStorage.getItem(key), key) === beforeViews, '40 existing plus 1 incoming view are rejected atomically');
    } finally {
      await page.evaluate(({ key, backup }) => backup === null ? localStorage.removeItem(key) : localStorage.setItem(key, backup), { key, backup });
      await page.reload(); await ready('/investigate', 'casebook');
    }
  });
  await run('Invalid and empty URLs are explicit, reversible and preserve valid geography', async () => {
    await open('/welfare', { iw_state: 'MP', iw_compare: 'ZZ', iw_view: 'bogus', iw_record: 'missing', iw_from: '2026-02-30', iw_layers: 'made-up' });
    const message = await page.locator('.iw-invalid').innerText();
    check(message.includes('comparison state') && message.includes('surface') && message.includes('record selection') && message.includes('start date'), 'invalid controls are explained');
    check(await page.getByRole('combobox', { name: 'Place', exact: true }).inputValue() === 'MP', 'valid state survives invalid siblings');
    await open('/welfare', { iw_state: 'MP', iw_view: 'evidence', iw_q: 'no-such-scheme-x9z', iw_scope: 'all' });
    check((await page.locator('.iw-evidence-ledger').innerText()).includes('absence in this curated view does not establish absence of activity'), 'no-match state explains corpus limitation');
    await open('/welfare', { iw_state: 'MP', iw_from: '2026-10-06', iw_to: '2021-10-06' });
    check((await page.locator('.iw-invalid').innerText()).includes('start is after end'), 'reversed date range is explicitly rejected');
    await page.getByRole('button', { name: 'Reset workspace filters', exact: true }).click(); await ready('/welfare', 'map');
    await page.locator('.iw-invalid').waitFor({ state: 'hidden' });
    check(await page.locator('.iw-invalid').count() === 0, 'reset removes invalid-state warning');
  });
  await run('Every dossier remains accessible with geographic context', async () => {
    for (const route of sharedRoutes.filter(route => !route.includes('/company/') && !route.includes('/conglomerates/') && !route.includes('/states/'))) {
      await open(route, { iw_view: 'dossier', iw_state: 'KA' });
      check(await page.locator('.iw-dossier-content').count() === 1, `${route}: complete dossier exposed`);
      await page.locator('.iw-dossier-content').getByText('Loading…', { exact: true }).waitFor({ state: 'hidden', timeout: 45000 });
      check((await page.locator('.iw-dossier-content').innerText()).length > 150, `${route}: route content rendered`);
      check(await page.getByRole('combobox', { name: 'Place', exact: true }).inputValue() === 'KA', `${route}: dossier keeps geographic context`);
      await page.getByRole('button', { name: 'Back to map', exact: true }).click(); await ready(route, 'map');
      check(rawParams(page).get('iw_state') === 'KA', `${route}: map return keeps state`);
    }
  });
  await run('Responsive map, evidence, casebook and dossier have no body overflow', async () => {
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const route of ['/welfare', '/education', '/justice', '/pmcares']) {
        for (const mode of ['map', 'evidence', 'casebook', 'dossier']) {
          await open(route, { iw_view: mode, iw_state: 'MP' });
          if (mode === 'dossier') await page.locator('.iw-dossier-content').getByText('Loading…', { exact: true }).waitFor({ state: 'hidden', timeout: 45000 });
          await overflow(`${width}px ${route} ${mode}`);
          check(await page.locator('.iw-map-state').count() === 36, `${width}px ${route} ${mode}: context map persists`);
          for (const label of ['Place', 'Topic scope']) {
            const box = await page.getByRole('combobox', { name: label, exact: true }).boundingBox();
            check(box?.width >= 100, `${width}px ${route} ${mode}: ${label} has readable control width (${box?.width})`);
          }
        }
      }
      await open('/welfare', { iw_view: 'evidence', iw_state: 'MP' });
      const path = resolve(out, `workspace-${width}.png`); await page.screenshot({ path, fullPage: true }); screenshots.push(path);
    }
  });
  await run('No uncaught browser exceptions', async () => check(pageErrors.length === 0, JSON.stringify(pageErrors)));
} finally {
  const report = { testedAt: new Date().toISOString(), base, distIndexSha256, scenarioFilter: scenarioFilter || null, browser: `/usr/bin/chromium via Playwright (${browser.version()})`, checks, routes, results, pageErrors, screenshots, note: 'Rendered workspace and casebook acceptance. Graph traversal/zoom/pan workflow is owned by its separate suite.' };
  writeFileSync(resolve(out, 'results.json'), `${JSON.stringify(report, null, 2)}\n`);
  await browser.close(); if (listening) await new Promise(done => server.close(done));
  console.log(`${checks} assertions; ${results.filter(item => item.status === 'passed').length}/${results.length} scenarios passed. Report: ${resolve(out, 'results.json')}`);
  if (results.some(item => item.status === 'failed')) process.exitCode = 1;
}
