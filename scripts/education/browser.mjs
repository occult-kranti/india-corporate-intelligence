#!/usr/bin/env node
/** Exercise the education research workflow against the actual built application. */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { dossierUrl, dossier } from '../pages/dossier-navigation.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const dist = resolve(root, process.env.EDUCATION_DIST ?? 'dist');
const data = JSON.parse(readFileSync(resolve(root, 'src/data/education-research.json'), 'utf8'));
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  const file = resolve(dist, `.${path === '/' ? '/index.html' : path}`);
  if (!file.startsWith(`${dist}/`)) return res.writeHead(403).end();
  try { res.writeHead(200, { 'content-type': mime[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file)); }
  catch { res.writeHead(404).end(); }
});
let listening = false;
let base = process.env.EDUCATION_BASE_URL;
if (!base) {
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  listening = true;
  base = `http://127.0.0.1:${server.address().port}`;
}
const pinned = process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/opt/pw-browsers/chromium';
let browser;
try {
  browser = await chromium.launch(existsSync(pinned) ? { executablePath: pinned } : {});
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const ready = async () => page.getByRole('heading', { name: 'Who funds the classroom?' }).waitFor();
  await page.goto(dossierUrl(base, '/education'));
  await ready();
  assert.equal(await dossier(page).getByLabel('State or union territory').locator('option').count(), 37, 'all jurisdictions are navigable');

  // Export must include every matching record, including sources below pagination.
  const downloadReady = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  const download = await downloadReady;
  const csv = readFileSync(await download.path(), 'utf8');
  for (const source of data.sources) {
    assert.ok(csv.includes(`"${source.id}"`), `CSV missing ${source.id}`);
    assert.ok(csv.includes(source.url), `CSV missing original citation for ${source.id}`);
  }
  assert.ok(csv.includes('"limitations"') && csv.includes('"retrieved_at"'), 'export retains qualification and date');
  assert.ok(csv.includes('"retrieval_status"') && csv.includes('"locator"'), 'export retains access status and page locators');

  // Saved work survives a reload and can be isolated without altering the evidence.
  const save = page.getByRole('button', { name: /^Save source:/ }).first();
  await save.click();
  await page.reload();
  await ready();
  await page.getByRole('button', { name: /^Saved \(1\)$/ }).click();
  await page.waitForFunction(() => document.querySelectorAll('.edu-source').length === 1);
  assert.equal(await page.locator('.edu-source').count(), 1);
  assert.equal(await page.getByRole('button', { name: /^Remove saved source:/ }).count(), 1);
  await page.getByRole('button', { name: /^Saved \(1\)$/ }).click();
  await page.waitForFunction(() => document.querySelectorAll('.edu-source').length > 1);

  // A committed filter creates a history entry; Back/Forward restore the state.
  await dossier(page).getByLabel('State or union territory').selectOption('UP');
  await page.waitForURL(/state=UP/);
  await dossier(page).getByLabel('Funding channel').selectOption('government');
  await page.waitForURL(/channel=government/);
  assert.ok(page.url().includes('state=UP') && page.url().includes('channel=government'));
  await page.goBack();
  await page.waitForFunction(() => !window.location.hash.includes('channel='));
  await page.waitForFunction(select => select.value === '', await dossier(page).getByLabel('Funding channel').elementHandle());
  assert.equal(await dossier(page).getByLabel('State or union territory').inputValue(), 'UP');
  assert.equal(await dossier(page).getByLabel('Funding channel').inputValue(), '');
  await page.goForward();
  await page.waitForFunction(() => window.location.hash.includes('channel=government'));
  await page.waitForFunction(select => select.value === 'government', await dossier(page).getByLabel('Funding channel').elementHandle());
  assert.equal(await dossier(page).getByLabel('Funding channel').inputValue(), 'government');

  // The URL can commit before React renders it: a rapid search must retain that state.
  await dossier(page).getByLabel('State or union territory').selectOption('MH');
  await page.waitForURL(/state=MH/);
  await dossier(page).getByLabel('Topic, organisation or document', { exact: true }).fill('Samagra');
  await dossier(page).getByLabel('Topic, organisation or document', { exact: true }).press('Enter');
  await page.waitForURL(/q=Samagra/);
  await page.waitForFunction(select => select.value === 'MH', await dossier(page).getByLabel('State or union territory').elementHandle());
  assert.ok(page.url().includes('state=MH') && page.url().includes('channel=government'), 'rapid topic submission must preserve prior committed filters');

  // Internal jumps must not overwrite the HashRouter route or active filters.
  const filteredUrl = page.url();
  const jumpControls = page.getByRole('navigation', { name: 'On this education page' }).locator('a,button');
  for (let index = 0; index < await jumpControls.count(); index++) {
    await jumpControls.nth(index).click();
    assert.equal(page.url(), filteredUrl, 'section jump replaced route or filters');
    await ready();
  }

  // A locality gap is explicit and does not become zero funding.
  await dossier(page).getByLabel('City or district', { exact: true }).fill('UnrecordedLocality987');
  await dossier(page).getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByRole('heading', { name: 'No source records match this view.' }).waitFor();
  assert.equal(await page.locator('.edu-source').count(), 0);
  assert.equal(await page.getByRole('button', { name: 'Export CSV' }).isDisabled(), true);
  await page.getByRole('button', { name: 'Clear filters', exact: true }).first().click();
  await page.waitForFunction(() => document.querySelectorAll('.edu-source').length > 0);
  assert.ok(await page.locator('.edu-source').count() > 0);

  // The district slice retains its actual administrative grain and academic period.
  await dossier(page).getByLabel('State or union territory').selectOption('UP');
  await dossier(page).getByLabel('School-count geography').selectOption('district');
  assert.ok((await page.locator('.edu-table caption').innerText()).includes('not identify school closures'));
  const allDistricts = page.getByRole('button', { name: 'Show all 75 matching geographies' });
  await allDistricts.click();
  await page.waitForFunction(() => document.querySelectorAll('.edu-table tbody tr').length === 75);
  assert.equal(await page.locator('.edu-table tbody tr').count(), 75);
  assert.ok((await page.locator('.edu-table thead').innerText()).includes('2025-26'));
  assert.ok((await page.locator('.edu-table tbody').innerText()).includes('District · Uttar Pradesh'));

  // Corrupted local persistence is recoverable and never breaks the register.
  await page.evaluate(() => localStorage.setItem('icip-education-reading-list-v1', '{broken'));
  await page.reload();
  await ready();
  await page.getByRole('button', { name: /^Saved \(0\)$/ }).waitFor();
  await page.goto(dossierUrl(base, '/education?state=ZZ&channel=unknown'));
  await page.locator('.edu-invalid').waitFor();
  assert.ok((await page.locator('.edu-invalid').innerText()).includes('ignored'));
  await page.getByRole('button', { name: 'Reset filters', exact: true }).click();
  await page.waitForFunction(() => !window.location.hash.includes('state=ZZ'));
  assert.deepEqual(errors, [], `runtime errors: ${errors.join('; ')}`);
  console.log('education browser: OK — export, persistence, filters/history, section navigation, empty locality and 75-district coverage');
} finally {
  await browser?.close();
  if (listening) await new Promise(done => server.close(done));
}
