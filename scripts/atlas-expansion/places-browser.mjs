#!/usr/bin/env node
/** Places engine checks use a controlled cartographic background, never research
 * fixture records. Set PLACES_LIVE=1 for a separate real OpenFreeMap service check.
 * Core acceptance is independent of third-party service availability. */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const root = fileURLToPath(new URL('../../', import.meta.url));
const dist = resolve(root, process.env.INVESTIGATION_DIST ?? 'dist');
const out = resolve(process.env.PLACES_BROWSER_ARTIFACTS ?? '/tmp/atlas-places-review'); mkdirSync(out, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = createServer((req, res) => { const path = new URL(req.url, 'http://localhost').pathname; const file = resolve(dist, `.${path === '/' ? '/index.html' : path}`); if (!file.startsWith(`${dist}/`)) return res.writeHead(403).end(); try { const body = readFileSync(file); res.writeHead(200, { 'content-type': mime[extname(file)] ?? 'application/octet-stream' }).end(body); } catch { res.writeHead(404).end(); } });
let base = process.env.INVESTIGATION_BASE_URL; let listening = false;
if (!base) { await new Promise(done => server.listen(0, '127.0.0.1', done)); listening = true; base = `http://127.0.0.1:${server.address().port}`; }
const binary = process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/usr/bin/chromium';
const browser = await chromium.launch({ ...(existsSync(binary) ? { executablePath: binary } : {}), args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
page.setDefaultTimeout(60000);
const errors = []; page.on('pageerror', error => errors.push(error.message));
let checks = 0; const check = (condition, message) => { assert.ok(condition, message); checks++; };
const url = `${base.replace(/\/$/u, '')}/#/`;
// A uniform rectangular background tests georeferencing, transport, camera and
// overlays. It is intentionally not a street map or a geographic research claim.
const fixtureStyle = { version: 8, sources: { openmaptiles: { type: 'geojson', attribution: 'Controlled browser-test background', data: { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[40,0],[120,0],[120,55],[40,55],[40,0]]] } }] } } }, layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#d7e7e6' } }, { id: 'fixture-land', type: 'fill', source: 'openmaptiles', paint: { 'fill-color': '#edf1e5' } }] };
const placeFixture = [{ place_id: 245581432, display_name: 'Thiruvananthapuram, Kerala, 695001, India', lat: '8.4882267', lon: '76.9475510', boundingbox: ['8.3282267', '8.6482267', '76.7875510', '77.1075510'], osm_type: 'node', osm_id: 245581432, category: 'place', type: 'city' }];
const controlled = async target => target.route('https://tiles.openfreemap.org/styles/liberty', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixtureStyle) }));
try {
 await controlled(page); let searches = 0;
 await page.route('https://nominatim.openstreetmap.org/search?*', route => { searches++; return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(placeFixture) }); });
 await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 }); await page.waitForSelector('[data-places-ready="true"]'); await page.waitForSelector('[data-places-tiles-ready="true"]');
 const map = page.locator('.places-atlas');
 check(await page.locator('.iw-map-state').count() === 36, 'The 36 original SVG boundary selectors remain available');
 check(await map.locator('canvas').count() === 1, 'Places uses a real MapLibre WebGL canvas');
 check(await page.getByRole('button', { name: 'Places map', exact: true }).getAttribute('aria-pressed') === 'true', 'Places is the normal-motion default');
 check(await map.locator('.maplibregl-ctrl-attrib').isVisible(), 'Map attribution remains visible');
 check(Number(await map.getAttribute('data-places-pitch')) === 0, 'The geographic camera stays flat');
 check(await page.getByRole('button', { name: /3D atlas|Tilt map/u }).count() === 0, 'No 3D presentation controls remain');
 await map.getByLabel('Place names', { exact: true }).uncheck(); check(!await map.getByLabel('Place names', { exact: true }).isChecked(), 'Place-label layer can be toggled');
 await map.getByLabel('Research states', { exact: true }).uncheck(); await map.getByLabel('Research states', { exact: true }).check();
 check(await map.getByLabel('Research states', { exact: true }).isChecked(), 'Research boundaries can be restored independently of the basemap');
 await map.getByLabel('Find a city, village or place', { exact: true }).fill('Thiruvananthapuram'); await page.waitForTimeout(80);
 check(searches === 0, 'Typing never sends autocomplete requests');
 await map.getByRole('button', { name: 'Find place', exact: true }).click(); await map.getByRole('list', { name: 'Place search results' }).waitFor();
 check(searches === 1, 'An explicit submit sends one geocoder request');
 await map.getByRole('button', { name: /Thiruvananthapuram, Kerala/ }).click();
 check(await map.getByRole('region', { name: 'Selected place context' }).isVisible(), 'Place search opens context without adding research');
 check((await map.getByRole('region', { name: 'Selected place context' }).innerText()).includes('representative mapped point or area'), 'Search coordinate precision is disclosed');
 check(await map.getByRole('link', { name: 'Inspect mapped feature' }).getAttribute('href') === 'https://www.openstreetmap.org/node/245581432', 'Search provenance links to the exact OSM feature');
 await map.getByRole('button', { name: 'World', exact: true }).click(); await page.waitForFunction(() => Number(document.querySelector('.places-atlas')?.getAttribute('data-places-zoom')) < 2);
 check(Number(await map.getAttribute('data-places-zoom')) < 2, 'The map supports worldwide geographic context');
 await map.locator('canvas').evaluate(canvas => canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
 await page.locator('.iw-map-graphics-notice').filter({ hasText: 'interrupted' }).waitFor();
 check(await page.locator('.iw-map-stage').isVisible(), 'A lost Places graphics context falls back to the offline map');
 for (const width of [390, 320]) { await page.setViewportSize({ width, height: 900 }); await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 }); await page.getByRole('button', { name: 'Places map', exact: true }).click(); await page.waitForSelector('[data-places-ready="true"]'); check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width}px Places view has no document overflow`); await page.screenshot({ path: resolve(out, `places-controlled-${width}.png`) }); }
 const failed = await browser.newPage(); await failed.route('https://tiles.openfreemap.org/**', route => route.abort('failed')); await failed.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 }); await failed.locator('.iw-map-graphics-notice').filter({ hasText: 'street-map service is unavailable' }).waitFor();
 check(await failed.locator('.iw-map-stage').isVisible(), 'A failed remote style recovers to offline 2D');
 check(await failed.locator('.iw-map-state').count() === 36, 'Service failure preserves all investigation geography'); await failed.close();
 const reduced = await browser.newPage({ reducedMotion: 'reduce' }); await reduced.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 }); await reduced.locator('.iw-map-stage').waitFor();
 check(await reduced.locator('canvas').count() === 0, 'Reduced motion uses the offline 2D default'); await reduced.close();
 let live = 'not requested';
 if (process.env.PLACES_LIVE === '1') {
   const real = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
   await real.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
   try { await real.waitForSelector('[data-places-tiles-ready="true"]', { timeout: 60000 }); await real.locator('.places-atlas-stage').scrollIntoViewIfNeeded(); await real.screenshot({ path: resolve(out, 'places-live-openfreemap.png') }); live = 'OpenFreeMap vector features rendered'; }
   catch { live = 'External map service unavailable; controlled engine and fallback checks remain independent'; }
   await real.close();
 }
 check(errors.length === 0, `No browser runtime exceptions: ${errors.join(' | ')}`);
 console.log(JSON.stringify({ passed: true, checks, live, screenshots: out }));
} catch (error) { console.error(JSON.stringify({ passed: false, checks, url: page.url(), message: error.message, runtimeErrors: errors, notices: await page.locator('.iw-map-graphics-notice').allTextContents() })); throw error; }
finally { await browser.close(); if (listening) await new Promise(done => server.close(done)); }
