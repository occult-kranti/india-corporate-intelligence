#!/usr/bin/env node
/** Rendered 3D / 2D acceptance against the real atlas and retained corpus. */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../../', import.meta.url));
const dist = resolve(root, process.env.INVESTIGATION_DIST ?? 'dist');
const out = resolve(process.env.SPATIAL_BROWSER_ARTIFACTS ?? '/tmp/atlas-spatial-review');
mkdirSync(out, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  const file = resolve(dist, `.${path === '/' ? '/index.html' : path}`);
  if (!file.startsWith(`${dist}/`)) return res.writeHead(403).end();
  try { const body = readFileSync(file); res.writeHead(200, { 'content-type': mime[extname(file)] ?? 'application/octet-stream' }).end(body); }
  catch { res.writeHead(404).end(); }
});
let base = process.env.INVESTIGATION_BASE_URL;
let listening = false;
if (!base) { await new Promise(done => server.listen(0, '127.0.0.1', done)); listening = true; base = `http://127.0.0.1:${server.address().port}`; }
const binary = process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/usr/bin/chromium';
const browser = await chromium.launch({ ...(existsSync(binary) ? { executablePath: binary } : {}), args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.setDefaultTimeout(30000);
let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };
const url = `${base.replace(/\/$/u, '')}/#/`;
const ready = async target => { await target.getByRole('button', { name: '3D atlas', exact: true }).click(); await target.waitForSelector('[data-atlas-ready="true"]', { timeout: 60000 }); };
try {
  await page.goto(url); await ready(page);
  const map = page.locator('.iw-map-spatial').first();
  const canvas = map.locator('.spatial-atlas-canvas');
  check(await map.locator('.iw-map-state').count() === 36, 'All 36 retained SVG boundaries remain available');
  check(await map.locator('canvas').count() === 1, 'The spatial surface uses a real WebGL canvas');
  await canvas.scrollIntoViewIfNeeded();
  const mp = map.locator('.spatial-state-label[data-state-code="MP"]');
  const initial = await mp.getAttribute('style');
  await map.getByRole('button', { name: 'Zoom in', exact: true }).click(); await page.waitForTimeout(100);
  check(await mp.getAttribute('style') !== initial, 'Zoom changes the projected geometry');
  await map.getByRole('button', { name: 'Reset map camera' }).click(); await page.waitForTimeout(100);
  const box = await mp.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForFunction(() => document.querySelector('.iw-map-select select')?.value === 'MP');
  check(await map.locator('.iw-map-select select').inputValue() === 'MP', 'Raycasting selects the geographic state under its label');
  await map.getByRole('button', { name: 'Zoom to selected state' }).click(); await page.waitForTimeout(100);
  check(await mp.getAttribute('style') !== initial, 'State focus moves the camera');
  await map.getByRole('button', { name: 'Reset map camera' }).click(); await canvas.focus();
  const beforePan = await mp.getAttribute('style'); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(100);
  check(await mp.getAttribute('style') !== beforePan, 'Keyboard arrows provide a pan alternative');
  await page.keyboard.press('Home');
  const beforeTilt = await mp.getAttribute('style'); await map.getByRole('button', { name: 'Change camera tilt' }).click(); await page.waitForTimeout(100);
  check(await mp.getAttribute('style') !== beforeTilt, 'Camera tilt changes the 3D projection');
  await map.getByRole('button', { name: 'Reset map camera' }).click();
  await map.getByRole('button', { name: '2D map', exact: true }).click();
  check(await map.locator('.iw-map-stage').isVisible(), 'Explicit 2D fallback is available');
  await map.locator('.iw-map-state[data-state-code="MP"]').focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('.iw-map-select select')?.value !== 'MP');
  check(await map.locator('.iw-map-select select').inputValue() !== 'MP', 'The original state keyboard pattern is preserved');
  await map.getByRole('button', { name: 'All India', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.iw-map-select select')?.value === '');
  // Site interactions use only the source-backed manifest, never synthetic coordinates.
  const sitePicker = map.getByLabel('Find a public site', { exact: true });
  if (await sitePicker.count()) {
    const option = sitePicker.locator('option').nth(1); const siteId = await option.getAttribute('value');
    await sitePicker.selectOption(siteId);
    check(await map.getByRole('region', { name: 'Selected site details' }).isVisible(), 'A sourced site is inspectable in the fallback');
    check(/coordinate precision/u.test(await map.getByRole('region', { name: 'Selected site details' }).innerText()), 'Coordinate precision remains explicit');
    check(await map.getByRole('region', { name: 'Selected site details' }).locator('a[href^="https://"]').count() > 0, 'The coordinate source is directly linked');
    await map.getByRole('button', { name: 'Close site details' }).click();
  }
  await map.getByRole('button', { name: '3D atlas', exact: true }).click(); await ready(page);
  if (await map.getByLabel('Find a public site', { exact: true }).count()) {
    const select = map.getByLabel('Find a public site', { exact: true }); const id = await select.locator('option').nth(1).getAttribute('value');
    await select.selectOption(id);
    check(await map.getByRole('region', { name: 'Selected site details' }).isVisible(), 'The same source-backed site is inspectable in 3D');
    await map.getByRole('button', { name: 'Close site details' }).click();
  }
  await map.locator('canvas').evaluate(element => element.dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
  await map.locator('.iw-map-graphics-notice').filter({ hasText: 'interrupted' }).waitFor();
  check(await map.locator('.iw-map-stage').isVisible(), 'A lost graphics context recovers to 2D');
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1100 : 900 }); await page.goto(url); await ready(page);
    await canvas.scrollIntoViewIfNeeded();
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width}px spatial view does not overflow the document`);
    await page.screenshot({ path: resolve(out, `spatial-${width}.png`) });
  }
  const reduced = await browser.newPage({ reducedMotion: 'reduce' });
  await reduced.goto(url); await reduced.locator('.iw-map-state').first().waitFor();
  check(await reduced.locator('canvas').count() === 0, 'Reduced motion defaults to 2D without loading WebGL');
  check(await reduced.getByRole('button', { name: '2D map', exact: true }).getAttribute('aria-pressed') === 'true', 'Reduced-motion presentation has a visible selected mode');
  const failed = await browser.newPage();
  await failed.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) { return String(type).includes('webgl') ? null : original.call(this, type, ...args); };
  });
  await failed.goto(url); await failed.getByRole('button', { name: '3D atlas', exact: true }).click(); await failed.locator('.iw-map-graphics-notice').filter({ hasText: '3D graphics are unavailable' }).waitFor();
  check(await failed.locator('.iw-map-stage').isVisible(), 'Unavailable WebGL recovers to a usable 2D map');
  check(await failed.locator('.iw-map-state').count() === 36, 'Graphics failure preserves all boundaries');
  check(errors.length === 0, `No browser runtime exceptions: ${errors.join(' | ')}`);
  console.log(JSON.stringify({ passed: true, checks, screenshots: out }));
} catch (error) {
  console.error(JSON.stringify({ passed: false, checks, url: page.url(), message: error.message })); throw error;
} finally {
  await browser.close(); if (listening) await new Promise(done => server.close(done));
}
