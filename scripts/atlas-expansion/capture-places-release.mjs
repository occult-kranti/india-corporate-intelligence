#!/usr/bin/env node
/** Capture the real online basemap and the retained public-campus provenance.
 * No mocked tiles, geocoder results, or fixture research locations are used.
 */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../../', import.meta.url));
const dist = resolve(root, process.env.INVESTIGATION_DIST ?? 'dist');
const out = resolve(process.env.PLACES_BROWSER_ARTIFACTS ?? '/tmp/atlas-places-release');
mkdirSync(out, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  const file = resolve(dist, `.${path === '/' ? '/index.html' : path}`);
  if (!file.startsWith(`${dist}/`)) return res.writeHead(403).end();
  try {
    const bytes = readFileSync(file);
    res.writeHead(200, { 'content-type': mime[extname(file)] ?? 'application/octet-stream' }).end(bytes);
  } catch { res.writeHead(404).end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const binary = process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/usr/bin/chromium';
const browser = await chromium.launch({ ...(existsSync(binary) ? { executablePath: binary } : {}), args: ['--enable-unsafe-swiftshader'] });
const viewport = { width: 1440, height: 1100 };
const page = await browser.newPage({ viewport });
const runtimeErrors = [], tileResponses200 = new Set();
page.on('pageerror', error => runtimeErrors.push(error.message));
page.on('response', response => {
  if (response.url().includes('tiles.openfreemap.org/planet/') && response.url().endsWith('.pbf') && response.status() === 200) tileResponses200.add(response.url());
});
try {
  await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-places-tiles-ready="true"]', { timeout: 60000 });
  const select = page.locator('.places-atlas-site-picker select');
  const campusTile = page.waitForResponse(response => /\/14\/11750\/7791\.pbf$/u.test(response.url()) && response.status() === 200, { timeout: 60000 });
  await select.selectOption('atlas-site:voc-port-public-campus');
  await page.waitForFunction(() => Number(document.querySelector('.places-atlas')?.getAttribute('data-places-zoom')) > 15);
  await campusTile;
  await page.waitForLoadState('networkidle', { timeout: 30000 });
  const detail = page.getByRole('region', { name: 'Selected site details' });
  const details = await detail.innerText();
  const coordinateSource = await detail.locator('a').first().getAttribute('href');
  assert.equal(coordinateSource, 'https://ipa.org.in/port/8');
  assert.match(details, /campus coordinate precision/u);
  assert.match(details, /Nearby OSM buildings do not establish ownership/u);
  assert.ok([...tileResponses200].some(url => /\/14\/11750\/7791\.pbf$/u.test(url)), 'The real public-campus street tile rendered');
  assert.deepEqual(runtimeErrors, []);
  await page.locator('.places-atlas-stage').scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(out, 'places-live-voc-port-street.png') });
  await detail.scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(out, 'places-live-voc-port-provenance.png') });
  const facts = {
    capturedAt: new Date().toISOString(), buildDirectory: dist, browser: await browser.version(), viewport,
    site: 'V. O. Chidambaranar Port Authority', siteId: 'atlas-site:voc-port-public-campus',
    zoom: await page.locator('.places-atlas').getAttribute('data-places-zoom'),
    pitch: await page.locator('.places-atlas').getAttribute('data-places-pitch'),
    coordinateSource, details, tileResponses200: [...tileResponses200], runtimeErrors,
  };
  writeFileSync(resolve(out, 'voc-browser-evidence.json'), `${JSON.stringify(facts, null, 2)}\n`);
  console.log(JSON.stringify({ passed: true, capturedAt: facts.capturedAt, zoom: facts.zoom, pitch: facts.pitch, tileResponses200: tileResponses200.size, screenshots: out }));
} finally {
  await browser.close();
  await new Promise(done => server.close(done));
}
