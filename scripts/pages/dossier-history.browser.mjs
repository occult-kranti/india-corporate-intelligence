/** Five consecutive rapid search/Back/Forward/reset cycles for each research desk. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { dossierUrl, dossier } from './dossier-navigation.mjs';

const dist = resolve(process.env.DOSSIER_HISTORY_DIST ?? 'dist');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = createServer((request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  const file = resolve(dist, `.${path === '/' ? '/index.html' : path}`);
  if (!file.startsWith(`${dist}/`)) return response.writeHead(403).end();
  try { response.writeHead(200, { 'content-type': mime[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file)); }
  catch { response.writeHead(404).end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const base = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/usr/bin/chromium' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const [route, fields, resetLabel] of [['education', '.edu-search-fields', 'Clear filters'], ['water', '.water-search-fields', 'Clear filters'], ['public-works', '.pw-fields', 'Reset filters']]) {
    for (let trial = 1; trial <= 5; trial++) {
      await page.goto(dossierUrl(base, `/${route}?state=KA&iw_state=TN`));
      await dossier(page).getByRole('heading', { level: 1 }).waitFor();
      const place = page.locator(`${fields} input`).nth(0);
      const query = page.locator(`${fields} input`).nth(1);
      await page.waitForFunction(selector => document.querySelector(`${selector} select`)?.value === 'KA' && [...document.querySelectorAll(`${selector} input`)].every(input => input.value === ''), fields);
      const q = `history-query-${trial}`, locality = `HistoryVillage${trial}`;
      await query.fill(q); await place.fill(locality);
      await dossier(page).getByRole('button', { name: 'Search', exact: true }).click();
      // Deliberately navigate as soon as history commits, before waiting for the
      // new result render. This is the browser/React ordering that exposed the bug.
      await page.waitForURL(url => new URLSearchParams(url.hash.split('?')[1]).get('q') === q);
      await page.goBack();
      await page.waitForFunction(({ fields }) => {
        const params = new URLSearchParams(location.hash.split('?')[1]);
        const inputs = document.querySelectorAll(`${fields} input`);
        return params.get('state') === 'KA' && params.get('iw_view') === 'dossier' && params.get('iw_state') === 'TN'
          && document.querySelector(`${fields} select`)?.value === 'KA'
          && !params.has('q') && !params.has('place') && inputs[0]?.value === '' && inputs[1]?.value === '';
      }, { fields });
      await page.goForward();
      await page.waitForFunction(({ fields, q, locality }) => {
        const params = new URLSearchParams(location.hash.split('?')[1]);
        const inputs = document.querySelectorAll(`${fields} input`);
        return params.get('q') === q && params.get('place') === locality && params.get('state') === 'KA'
          && params.get('iw_view') === 'dossier' && params.get('iw_state') === 'TN'
          && document.querySelector(`${fields} select`)?.value === 'KA'
          && inputs[0]?.value === locality && inputs[1]?.value === q;
      }, { fields, q, locality });
      await dossier(page).getByRole('button', { name: resetLabel, exact: true }).first().click();
      await page.waitForFunction(({ fields }) => {
        const params = new URLSearchParams(location.hash.split('?')[1]);
        const inputs = document.querySelectorAll(`${fields} input`);
        return params.size === 2 && params.get('iw_view') === 'dossier' && params.get('iw_state') === 'TN'
          && document.querySelector(`${fields} select`)?.value === ''
          && inputs[0]?.value === '' && inputs[1]?.value === '';
      }, { fields });
      assert.equal(await place.inputValue(), ''); assert.equal(await query.inputValue(), '');
    }
    console.log(`${route}: PASS 5/5 consecutive rapid Back/Forward/reset cycles; URL, both drafts and workspace context agree`);
  }
  assert.deepEqual(errors, [], 'no browser exceptions during history recovery');
} finally {
  await browser?.close();
  await new Promise(done => server.close(done));
}
