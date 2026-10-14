#!/usr/bin/env node
/** Independent panel tasks against a built artifact; never claims human usability research. */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { loadDeepInvestigation } from './load.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const dist = resolve(root, process.env.PANEL_DIST ?? 'dist');
const out = resolve(root, process.env.PANEL_ARTIFACTS ?? 'docs/deep-investigation/panel-browser');
mkdirSync(out, { recursive: true });
const api = await loadDeepInvestigation();
const selectedCase = api.DEEP_INVESTIGATION_CASES.find(row => row.originalId === 'khyati-pmjay-claims');
assert(selectedCase, 'The reviewed health case must exist in the release.');
const expected = api.getDeepInvestigationCaseEvidence(selectedCase.id);
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  const file = resolve(dist, `.${path === '/' ? '/index.html' : path}`);
  if (!file.startsWith(`${dist}/`)) return res.writeHead(403).end();
  try { res.writeHead(200, { 'content-type': mime[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file)); }
  catch { res.writeHead(404).end(); }
});
let base = process.env.PANEL_BASE_URL;
if (!base) { await new Promise(done => server.listen(0, '127.0.0.1', done)); base = `http://127.0.0.1:${server.address().port}`; }
const checks = [], failures = [], errors = [];
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/usr/bin/chromium' });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', acceptDownloads: true });
const page = await context.newPage();
page.setDefaultTimeout(20000);
page.on('pageerror', error => errors.push(error.message));
const route = `${base}/#/follow-the-money`;
const check = (ok, label) => { assert(ok, label); checks.push(label); };
const query = () => new URLSearchParams(new URL(page.url()).hash.split('?')[1] ?? '');
async function ready() { await page.locator('[data-follow-the-money]').waitFor(); await page.locator('[data-case-option]').first().waitFor(); }
async function download(button) { const pending = page.waitForEvent('download'); await button.click(); return readFileSync(await (await pending).path(), 'utf8'); }
async function task(name, fn) {
  try { await fn(); console.log(`PASS ${name}`); }
  catch (error) { failures.push({ name, message: error.message, url: page.url() }); await page.screenshot({ path: resolve(out, `failure-${failures.length}.png`) }).catch(() => {}); console.error(`FAIL ${name}: ${error.message}`); }
}

try {
  await task('Map, case, monetary stage, source and later response', async () => {
    await page.goto(route); await ready();
    await page.locator('.iw-map-state[data-state-code="GJ"]').click();
    await page.locator(`[data-case-option="${selectedCase.id}"]`).click();
    await page.waitForFunction(id => document.querySelector('[data-follow-the-money]')?.getAttribute('data-case-id') === id, selectedCase.id);
    check(query().get('ftm_state') === 'GJ', 'Map selection persists when a case opens.');
    check(await page.locator('[data-follow-the-money]').getAttribute('data-case-id') === selectedCase.id, 'Selected map case resolves to its exact stable ID.');
    await page.screenshot({ path: resolve(out, 'map-and-case-desktop.png') });
    const step = page.locator('.fm-timeline button').filter({ hasText: 'Reported PM-JAY claim earnings' });
    await step.click();
    const inspected = await page.locator('.fm-inspector').innerText();
    check(inspected.includes('not independently reconciled bank receipts'), 'Reported earnings remain distinct from verified cash and loss.');
    check(inspected.includes('bail') && inspected.includes('May 2026'), 'Later procedural response remains beside the selected money step.');
    await page.locator('.fm-inspector').scrollIntoViewIfNeeded();
    await page.screenshot({ path: resolve(out, 'money-step-desktop.png') });
    await page.locator('.fm-source-ledger button').filter({ hasText: 'Khyati chairman bail hearing' }).click();
    const source = await page.locator('.fm-source-detail').innerText();
    check(source.includes('The Indian Express') && source.includes('sessions order'), 'Source inspector exposes publisher and original-order access limit.');
    const sourceUrl = page.url(); await page.reload(); await ready();
    check(page.url() === sourceUrl && await page.locator('.fm-source-detail').count() === 1, 'Direct source link reload restores exact inspection.');
    await page.locator('.fm-source-detail').scrollIntoViewIfNeeded();
    await page.screenshot({ path: resolve(out, 'source-and-response-desktop.png') });
  });

  await task('Save, reload and export response-closed case', async () => {
    await page.locator('.fm-case-actions button').filter({ hasText: /Save case|Case saved/ }).click();
    await page.reload(); await ready();
    check(await page.locator('.fm-case-actions button').filter({ hasText: 'Case saved' }).count() === 1, 'Saved case survives reload.');
    const packet = JSON.parse(await download(page.locator('.fm-case-actions button').filter({ hasText: 'Evidence JSON' })));
    check(expected.records.every(row => packet.records.some(item => item.id === row.id)), 'Case export includes every linked response record.');
    check(expected.sources.every(row => packet.sources.some(item => item.id === row.id)), 'Case export includes source closure including responses.');
    check(packet.records.some(row => row.id === selectedCase.id && row.response.includes('Supreme Court')), 'Export preserves later Supreme Court bail context.');
    check(packet.relationships.every(row => row.amounts.every(amount => amount.stage && amount.period && amount.currency && amount.unit)), 'Export monetary observations retain period, stage, currency and unit.');
    await page.locator('.fm-header-actions button').filter({ hasText: 'Casebook' }).click();
    const brief = await download(page.getByRole('button', { name: 'Export reading brief', exact: true }));
    check(brief.includes('Khyati') && brief.includes('bail') && brief.includes('May 2026') && brief.includes('independently reconciled bank receipts'), 'Reading brief keeps response, latest retained outcome and payment limit.');
  });

  await task('Company universe distinguishes listing, identity and case coverage', async () => {
    await page.goto(route); await ready();
    const unmatched = api.DEEP_INVESTIGATION_UNIVERSE.securities.find(row => row.registryEntityIds.length === 0);
    const matched = api.DEEP_INVESTIGATION_UNIVERSE.securities.find(row => row.reviewedCaseIds.length > 0) ?? api.DEEP_INVESTIGATION_UNIVERSE.securities.find(row => row.registryEntityIds.length > 0);
    assert(unmatched && matched);
    await page.getByLabel('Search collection', { exact: true }).selectOption('securities');
    await page.locator('#fm-query').fill(unmatched.isin); await page.locator('#fm-query').press('Enter');
    await page.waitForFunction(isin => document.querySelectorAll('.fm-security-list>li').length === 1 && document.querySelector('.fm-security-list')?.textContent?.includes(isin), unmatched.isin);
    check(await page.locator('.fm-security-list>li').count() === 1, 'Exact unmatched ISIN yields one security.');
    check((await page.locator('.fm-security-list').innerText()).includes('No verified registry join'), 'Unmatched listing is explicitly unreviewed identity coverage.');
    const unmatchedUrl = page.url();
    await page.locator('#fm-query').fill(matched.isin); await page.locator('#fm-query').press('Enter');
    await page.waitForFunction(isin => document.querySelectorAll('.fm-security-list>li').length === 1 && document.querySelector('.fm-security-list')?.textContent?.includes(isin), matched.isin);
    const matchText = await page.locator('.fm-security-list').innerText();
    check(matchText.includes('Exact ISIN match') && /reviewed case/i.test(matchText), 'Matched listing distinguishes identity match from reviewed-case coverage.');
    await page.goBack();
    await page.waitForFunction(isin => document.querySelector('#fm-query')?.value === isin, unmatched.isin);
    check(page.url() === unmatchedUrl, 'Native Back restores company search and collection.');
    await page.goForward();
    await page.waitForFunction(isin => document.querySelector('#fm-query')?.value === isin, matched.isin);
    check(query().get('ftm_q') === matched.isin, 'Native Forward restores the second exact ISIN search.');
  });

  await task('Mobile keyboard task, route safety and evidence reachability', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${route}?ftm_case=${encodeURIComponent(selectedCase.id)}`); await ready();
    const dims = await page.evaluate(() => ({ inner: innerWidth, body: document.body.scrollWidth, html: document.documentElement.scrollWidth }));
    check(dims.body <= dims.inner + 1 && dims.html <= dims.inner + 1, 'Mobile case has no horizontal page overflow.');
    const positions = await page.evaluate(() => ({ map: document.querySelector('.fm-map-panel').getBoundingClientRect().top, brief: document.querySelector('.fm-case-brief').getBoundingClientRect().top }));
    check(positions.map < positions.brief, 'Mobile map precedes the full selected-case brief.');
    const follow = page.getByRole('link', { name: 'Follow this trail', exact: true });
    await follow.focus(); await page.keyboard.press('Enter');
    check(new URL(page.url()).hash.startsWith('#/follow-the-money'), 'Keyboard trail jump preserves HashRouter route.');
    check(await page.evaluate(() => document.activeElement?.id === 'fm-trail' || document.activeElement?.id === 'fm-trail-title'), 'Trail jump moves focus with viewport.');
    await page.keyboard.press('Tab');
    check(await page.evaluate(() => !!document.activeElement?.closest('.fm-timeline')), 'Next Tab reaches an actual trail step.');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.activeElement?.classList.contains('fm-inspector'));
    check(await page.evaluate(() => document.activeElement?.classList.contains('fm-inspector')), 'Keyboard step inspection moves focus to readable evidence.');
    await page.screenshot({ path: resolve(out, 'mobile-evidence-inspection.png') });
  });
  check(errors.length === 0, 'No browser page errors occurred during the panel tasks.');
} finally {
  const entryAssets = process.env.PANEL_BASE_URL ? [] : [...readFileSync(resolve(dist, 'index.html'), 'utf8').matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map(([, url]) => ({
    path: url, sha256: createHash('sha256').update(readFileSync(resolve(dist, `.${new URL(url, 'http://localhost/').pathname}`))).digest('hex'),
  }));
  const report = { reviewedAt: new Date().toISOString(), role: 'independent-model-agent-panel', humanResearch: false,
    artifact: process.env.PANEL_BASE_URL ? { base, type: 'development-server' } : { dist, type: 'built-artifact', indexSha256: createHash('sha256').update(readFileSync(resolve(dist, 'index.html'))).digest('hex'), entryAssets },
    casesAtReview: api.DEEP_INVESTIGATION_CASES.length, checks, failures, pageErrors: errors };
  writeFileSync(resolve(out, 'review.json'), `${JSON.stringify(report, null, 2)}\n`);
  await browser.close(); if (server.listening) await new Promise(done => server.close(done));
}
if (failures.length) process.exitCode = 1;
