#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { loadInvestigation } from '../investigation/load.mjs';
const compiled = await build({ stdin: { contents: "export * from './src/data/moneyTrails'; export {buildMapEvidenceScene} from './src/data/mapEvidence';", resolveDir: fileURLToPath(new URL('../..', import.meta.url)), loader: 'ts' }, bundle: true, platform: 'node', format: 'cjs', write: false, logLevel: 'silent', target: 'node20' });
const module = { exports: {} }; new Function('module', 'exports', compiled.outputFiles[0].text)(module, module.exports);
const { getMoneyTrailsView, getMoneyTrailDetail, exportMoneyTrailEvidence, MONEY_TRAIL_BASIS_LABELS, buildMapEvidenceScene } = module.exports;
const { INVESTIGATION_REGISTRY: registry } = await loadInvestigation(), trails = getMoneyTrailsView(registry, {}).trails;
const dist = resolve(process.env.INVESTIGATION_DIST ?? 'dist'), out = resolve(process.env.MONEY_TRAILS_ARTIFACTS ?? '/tmp/money-trails-browser'); mkdirSync(out, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
let server, base = process.env.INVESTIGATION_BASE_URL;
if (!base) {
  server = createServer((req, res) => {
    const path = new URL(req.url, 'http://localhost').pathname, file = resolve(dist, `.${path === '/' ? '/index.html' : path}`);
    if (!file.startsWith(`${dist}/`)) return res.writeHead(403).end();
    try { res.writeHead(200, { 'content-type': mime[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file)); } catch { res.writeHead(404).end(); }
  });
  await new Promise(done => server.listen(0, '127.0.0.1', done)); base = `http://127.0.0.1:${server.address().port}`;
}
base = base.replace(/\/$/u, '');
const binary = process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/usr/bin/chromium', browser = await chromium.launch(existsSync(binary) ? { executablePath: binary } : {});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', acceptDownloads: true }), checks = [], errors = [];
page.on('pageerror', error => errors.push(error.message)); page.setDefaultTimeout(30000);
const check = (value, label) => { assert.ok(value, label); checks.push(label); };
const param = async (key, value) => {
  await page.waitForFunction(({ key, value }) => new URLSearchParams(location.hash.split('?')[1] ?? '').get(key) === value, { key, value });
  await page.waitForFunction(() => { const params = new URLSearchParams(location.hash.split('?')[1] ?? ''), root = document.querySelector('[data-money-trails-page]'); return root?.getAttribute('data-money-query') === params.toString() && root?.getAttribute('data-money-view') === (params.get('mt_view') === 'network' ? 'network' : 'map') && root?.getAttribute('data-money-scope') === (params.get('mt_scope') === 'context' ? 'context' : 'path') && (!params.get('mt_trail') || root?.getAttribute('data-money-trail') === params.get('mt_trail')); });
};
const open = async (query = '') => {
  await page.goto(`${base}/#/money-trails${query ? `?${query}` : ''}`, { waitUntil: 'domcontentloaded' });
  const params = new URLSearchParams(query), id = trails.some(row => row.id === params.get('mt_trail')) ? params.get('mt_trail') : trails[0]?.id;
  await page.waitForFunction(({ id, scope, view, query }) => {
    const root = document.querySelector('[data-money-trails-page]');
    return root?.getAttribute('data-money-query') === query && root?.getAttribute('data-money-trail') === id && root?.getAttribute('data-money-scope') === scope && root?.getAttribute('data-money-view') === view;
  }, { id, query: params.toString(), scope: params.get('mt_scope') === 'context' ? 'context' : 'path', view: params.get('mt_view') === 'network' ? 'network' : 'map' });
  await page.evaluate(() => { document.querySelector('.site-main')?.scrollTo(0, 0); });
};
const popup = page.locator('.atlas-evidence-popover');
const overflow = async label => check(await page.evaluate(() => { const root = document.querySelector('[data-money-trails-page]'), main = document.querySelector('.site-main'); return document.documentElement.scrollWidth <= innerWidth + 1 && (!root || root.scrollWidth <= root.clientWidth + 1) && (!main || main.scrollWidth <= main.clientWidth + 1); }), `${label}: no horizontal overflow, including the clipped app container`);
try {
  check(trails.length >= 3, 'At least three reviewed original-document investigations are available');
  await open(); await page.screenshot({ path: resolve(out, 'money-map-1440.png') });
  check(await page.getByRole('combobox', { name: 'Choose money-trail investigation' }).inputValue() === trails[0].id, 'Default selects a real retained investigation');
  check(await page.locator('[data-money-view=map]').count() === 1, 'The geographic map leads the default workspace');
  check(await page.getByRole('group', { name: 'Money trail graph scope' }).getByRole('button', { name: 'Money path', exact: true }).getAttribute('aria-pressed') === 'true', 'Money path is separate from wider contextual connections');
  for (const trail of trails) {
    await open(`mt_trail=${encodeURIComponent(trail.id)}`);
    const detail = getMoneyTrailDetail(registry, trail.id), path = page.getByRole('complementary', { name: 'Selected documentary money path' });
    const mapScene = buildMapEvidenceScene(detail.pathMapRegistry, { geographyMode: 'all' });
    for (const hub of mapScene.stateHubs.filter(row => row.counts.records > 0)) check((await page.locator(`[data-flat-map-hub="${hub.id}"]`).getAttribute('aria-label')).includes(`${hub.counts.records} records`), `${trail.id}: ${hub.label} map hub retains source-backed records in financial projection`);
    check(!detail.pathRegistry.records.some(row => row.geography.some(geo => geo.stateCodes.length)) || mapScene.stateHubs.some(row => row.counts.records > 0), `${trail.id}: supported state-associated case records are not silently lost from the map`);
    check((await path.textContent()).includes(trail.conclusion), `${trail.id}: the bounded conclusion is visible`);
    check(await path.locator('[data-money-hop]').count() === detail.hops.filter(hop => hop.flowState !== 'context').length, `${trail.id}: all authored cash steps and stops are shown`);
    check(await page.locator('[data-money-context]').count() === detail.hops.filter(hop => hop.flowState === 'context').length, `${trail.id}: context steps render separately from the cash path`);
    check(await page.locator('[data-money-hypothesis]').count() === detail.hypotheses.length, `${trail.id}: all falsifiable research questions are retained`);
    for (const hop of detail.hops.filter(row => row.flowState === 'gap')) {
      const gap = page.locator(`[data-money-hop="${hop.id}"]`);
      check(await gap.locator('[data-money-amount]').count() === 0 && (await gap.textContent()).includes(hop.documentHolder), `${hop.id}: missing join names the document holder without inventing an amount`);
    }
    const alleged = detail.hops.find(row => row.basis === 'court-recorded-agency-allegation');
    if (alleged) check((await page.locator(`[data-money-hop="${alleged.id}"], [data-money-context="${alleged.id}"]`).textContent()).includes(MONEY_TRAIL_BASIS_LABELS[alleged.basis]), `${trail.id}: an allegation in a court document keeps its proof label`);
    const source = detail.hops.flatMap(hop => hop.sourceLocators)[0];
    if (source) check((await page.locator(`[data-money-source="${source.sourceId}"]`).first().textContent()).includes(source.locator), `${trail.id}: exact source locator is visible`);
    const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export complete money-trail evidence packet' }).click();
    const actual = JSON.parse(readFileSync(await (await download).path(), 'utf8')), expected = exportMoneyTrailEvidence(registry, trail.id);
    // Compare source-backed content; a generated-at timestamp may legitimately differ.
    const stable = value => JSON.parse(JSON.stringify(value, (key, row) => ['exportedAt', 'generatedAt'].includes(key) ? undefined : row));
    assert.deepEqual(stable(actual), stable(expected)); check(true, `${trail.id}: downloaded evidence packet equals the complete source-closed data export`);
    await path.getByRole('button', { name: 'Open investigation dossier' }).click(); await popup.waitFor(); check(await popup.getAttribute('data-selection-id') === trail.caseRecordId, `${trail.id}: dossier opens the full original case rather than its map projection`); await popup.getByRole('button', { name: 'Close evidence details' }).click(); await param('mt_selection', null);
  }
  const first = trails[0], firstDetail = getMoneyTrailDetail(registry, first.id), entityId = firstDetail.hops.find(row => row.fromEntityId && !['context', 'gap'].includes(row.flowState))?.fromEntityId;
  await open(`mt_trail=${encodeURIComponent(first.id)}`);
  await page.getByRole('group', { name: 'Money trail graph scope' }).getByRole('button', { name: 'Wider connections', exact: true }).click(); await param('mt_scope', 'context');
  check((await page.locator('.mt-scope-note').textContent()).includes('not a downstream cash route'), 'Context mode explicitly distinguishes roles and ownership from cash movement');
  await page.getByRole('group', { name: 'Money trail view' }).getByRole('button', { name: 'Network', exact: true }).click(); await param('mt_view', 'network'); await page.locator('.atlas-network').waitFor();
  check(new URLSearchParams(new URL(page.url()).hash.split('?')[1]).get('mt_scope') === 'context', 'Network switch preserves the selected graph scope');
  await page.reload(); await page.locator('.atlas-network').waitFor(); check(await page.locator('[data-money-scope=context]').count() === 1, 'Reload retains the trail, scope and network mode');
  await page.goBack(); await param('mt_view', null); await page.locator('.linked-evidence-map').waitFor(); check(true, 'Browser Back restores the map without dropping the investigation');
  await page.goForward(); await param('mt_view', 'network'); await page.locator('.atlas-network').waitFor(); check(true, 'Browser Forward restores the network');
  await open(`mt_trail=${encodeURIComponent(first.id)}`);
  if (entityId) {
    await page.locator(`[data-money-entity="${entityId}"]`).first().click(); await popup.waitFor();
    check(await popup.getAttribute('data-selection-id') === entityId, 'Clicking a cash-path entity opens its exact identity popup');
    check(await page.getByRole('dialog').count() === 1, 'The workspace opens one shared evidence popup');
    await popup.getByRole('tab', { name: /^Connections/ }).click();
    check((await popup.locator('[role=tabpanel]').textContent()).includes('exact connections'), 'The node popup exposes all exact retained connections');
    await popup.getByRole('tab', { name: /^Responses/ }).click(); await popup.getByRole('tab', { name: /^Sources/ }).click();
    check(await popup.getByRole('tab', { name: /^Sources/ }).getAttribute('aria-selected') === 'true', 'Evidence reader exposes responses and source provenance');
    await page.reload(); await popup.waitFor(); check(await popup.getAttribute('data-selection-id') === entityId, 'Selected evidence survives a deep-link reload');
    await popup.getByRole('button', { name: 'Close evidence details' }).click(); await param('mt_selection', null); check(await popup.count() === 0, 'Closing the reader clears URL evidence state');
  }
  if (trails.length > 1) {
    await page.getByRole('combobox', { name: 'Choose money-trail investigation' }).selectOption(trails[1].id); await param('mt_trail', trails[1].id);
    check(await page.locator('[data-money-trails-page]').getAttribute('data-money-trail') === trails[1].id, 'Selecting another investigation replaces the authored money path');
    await page.goBack(); await param('mt_trail', first.id); check(true, 'Browser Back restores the previous investigation');
  }
  await open('mt_trail=missing-trail&mt_view=invalid&mt_scope=invalid');
  check(await page.getByRole('status').filter({ hasText: 'saved investigation is unavailable' }).count() === 1, 'A stale investigation URL is disclosed rather than silently reidentified');
  check(await page.locator('[data-money-view=map][data-money-scope=path]').count() === 1, 'Invalid view/scope parameters fall back to the map and money path');
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 }); await open(`mt_trail=${encodeURIComponent(first.id)}`); await overflow(`${width}px map`); await page.screenshot({ path: resolve(out, `money-map-${width}.png`) });
    await page.getByRole('button', { name: 'Read cash path', exact: true }).click();
    check(await page.evaluate(() => document.activeElement === document.querySelector('.mt-path-header h2')), `${width}px cash-path jump moves keyboard focus to the actual reading heading`);
    await page.screenshot({ path: resolve(out, `money-path-${width}.png`) });
    if (entityId) {
      await open(`mt_trail=${encodeURIComponent(first.id)}&mt_selection=${encodeURIComponent(`entity:${entityId}`)}`); await popup.waitFor(); await overflow(`${width}px reader`);
      const box = await popup.boundingBox(); check(box.x >= 0 && box.x + box.width <= width + 1 && box.y >= 0 && box.y + box.height <= 1001, `${width}px node popup stays inside the viewport`);
    }
    await open(`mt_trail=${encodeURIComponent(first.id)}&mt_view=network&mt_scope=context`); await page.locator('.atlas-network').waitFor(); await overflow(`${width}px wider network`);
  }
  await page.setViewportSize({ width: 1440, height: 1000 }); await open(`mt_trail=${encodeURIComponent(first.id)}&mt_view=network&mt_scope=context`); await page.screenshot({ path: resolve(out, 'money-network-1440.png') }); await overflow('1440px wider network');
  check(errors.length === 0, `No runtime exceptions (${errors.length})`);
  writeFileSync(resolve(out, 'acceptance.json'), JSON.stringify({ base, trails: trails.map(row => row.id), checks, errors }, null, 2) + '\n');
  console.log(`Money trails browser: ${checks.length} checks passed; ${out}`);
} finally { await browser.close(); if (server) await new Promise(done => server.close(done)); }
