#!/usr/bin/env node
/** Independent consequential-claim checks against the final rendered artifact. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { createServer } from 'node:http';

let server, base = process.env.INVESTIGATION_BASE_URL;
if (!base) {
  const dist = resolve(process.env.INVESTIGATION_DIST ?? 'dist');
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
  server = createServer((request, response) => {
    const path = new URL(request.url, 'http://localhost').pathname;
    const file = resolve(dist, `.${path === '/' ? '/index.html' : path}`);
    if (!file.startsWith(`${dist}/`)) return response.writeHead(403).end();
    try { response.writeHead(200, { 'content-type': mime[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file)); }
    catch { response.writeHead(404).end(); }
  });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  base = `http://127.0.0.1:${server.address().port}`;
}
base = base.replace(/\/$/, '');
const output = resolve(process.env.RADAR_CHALLENGE_ARTIFACTS ?? '/tmp/research-radar-challenge-browser');
mkdirSync(output, { recursive: true });
const binary = process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/usr/bin/chromium';
const browser = await chromium.launch(existsSync(binary) ? { executablePath: binary } : {});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', acceptDownloads: true });
page.setDefaultTimeout(45000);
const checks = [], errors = [];
page.on('pageerror', error => errors.push(error.message));
const check = (condition, meaning) => { assert.ok(condition, meaning); checks.push(meaning); };
const open = async id => {
  await page.goto(`${base}/#/research-radar?rr_case=${encodeURIComponent(id)}`, { waitUntil: 'domcontentloaded' });
  await page.locator(`[data-radar-dossier="${id}"]`).waitFor();
  return page.locator('[data-radar-dossier]').innerText();
};
const reader = page.locator('[data-radar-reader]');
try {
  let text = await open('radar-north:lucknow-smart-meter');
  check(/32\.74/.test(text) && /32\.75/.test(text), 'UPERC preserves both conflicting figures from the original order');
  check(/dispos/i.test(text) && /92,231/.test(text), 'Completed reported refunds and regulatory disposal remain beside the roadmap question');
  check(/Probability: not estimated/.test(text), 'Actual institutional scenario has no invented probability');
  check(/Untrained \/ uncalibrated/.test(await page.locator('.rr-stat-note').innerText()), 'Untrained state is visible before the case details');

  text = await open('radar-west:ports-case');
  check(/processing|process/.test(text) && /not.*(?:final|signed)|stops short/i.test(text), 'Pipavav comfort letter is distinguished from final concession renewal');
  text = await open('radar-west:tara-case');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export complete radar research packet' }).click();
  const packet = JSON.parse(readFileSync(await (await downloadPromise).path(), 'utf8'));
  const legal = packet.case.entities.find(row => row.id === 'radar-west:csgcl');
  const auction = packet.case.links.find(row => row.id === 'radar-west:tara-award');
  check(!!legal && !!auction && auction.to !== legal.id, 'Tara auction and exact corporate ownership do not acquire an unsupported identity bridge');
  check(packet.case.entities.find(row => row.id === auction.to)?.kind === 'source-mention', 'Reported bidder stays an unresolved source mention in the export');
  check(!packet.case.links.some(edge => [edge.from, edge.to].includes(auction.to) && [edge.from, edge.to].includes(legal.id)), 'No indirect-looking identity edge hides the unresolved bidder match');

  text = await open('radar-west:mithi-case');
  check(/bail/i.test(text) && /procurement and allotment|documentary evidence/i.test(text), 'Mithi includes court-reported machinery counterevidence with the continuing inquiry');
  text = await open('radar-west:goa-case');
  check(/quash/i.test(text) && /separate.*(?:case|claim)|specific.*FIR/i.test(text), 'Goa quashing update is bounded to the identified proceeding');

  text = await open('radar-south-east:case:kiifb-publicity');
  check(/79\.977/.test(text) && /102\.8855/.test(text) && /separate/i.test(text), 'KIIFB publicity qualification and separate programme costs remain distinct');
  check(/verified|authentication/i.test(text) && /missing.*(?:next|lower).tier/i.test(text), 'KIIFB presents evidence of services alongside missing lower-tier invoice records');
  text = await open('radar-national:case:psb-writeoffs');
  check(/12 FY|12 financial/.test(text) && /15.year/i.test(text), 'PSB reply population does not masquerade as the requested 15-year corporate series');
  check(/not.*matched|not a matched/i.test(text) && /liabilit/i.test(text), 'PSB flow comparisons retain cohort and write-off-versus-waiver limits');
  text = await open('radar-national:case:fdi-control');
  check(/proposed/i.test(text) && /not certified|not.*cash/i.test(text), 'Proposed foreign investment is not presented as observed incoming money');
  check(/May 1/.test(text) && /May 2/.test(text) && /control/i.test(text), 'FDI rule keeps publication timing and effective-control tests');

  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await open('radar-north:jaipur-jjm');
    await page.locator('[data-radar-source="radar-north:jaipur-sc"]').first().click();
    await reader.waitFor();
    const content = await reader.innerText();
    check(/mirror/i.test(content) && /merits|bail/i.test(content), `${width}px source reader retains mirror access and bail-only limits`);
    const box = await reader.boundingBox();
    check(box && box.x >= 0 && box.x + box.width <= width + 1 && box.y >= 0 && box.y + box.height <= 901, `${width}px consequential-evidence reader fits the viewport`);
    await page.screenshot({ path: resolve(output, `challenge-source-${width}.png`) });
    await page.getByRole('button', { name: 'Close radar evidence reader' }).click();
  }
  check(errors.length === 0, 'No browser runtime exceptions during independent meaning checks');
  const receipt = { passed: true, base, checks, browserErrors: errors, checkedAt: new Date().toISOString(), scope: 'Consequential source-meaning checks, exact unresolved-identity export and two narrow source readers. Not an exhaustive test of every page or source.' };
  writeFileSync(resolve(output, 'challenge-browser.json'), JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify(receipt, null, 2));
} finally { await browser.close(); if (server) await new Promise(done => server.close(done)); }
