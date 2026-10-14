#!/usr/bin/env node
/** Flat geographic evidence overlays and offline acceptance against the retained corpus. */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../../', import.meta.url));
const dist = resolve(root, process.env.INVESTIGATION_DIST ?? 'dist');
const out = resolve(process.env.MAP_BROWSER_ARTIFACTS ?? '/tmp/atlas-flat-map-review');
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
const fixtureStyle = { version: 8, sources: { openmaptiles: { type: 'geojson', data: { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[40,0],[120,0],[120,55],[40,55],[40,0]]] } }] } } }, layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#d7e7e6' } }, { id: 'fixture-land', type: 'fill', source: 'openmaptiles', paint: { 'fill-color': '#edf1e5' } }, { id: 'provider-extrusion', type: 'fill-extrusion', source: 'openmaptiles', paint: { 'fill-extrusion-height': 100 } }] };
const controlled = target => target.route('https://tiles.openfreemap.org/styles/liberty', route => route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixtureStyle)}));
try {
  await controlled(page); await page.goto(url); await page.waitForSelector('[data-places-ready="true"]');
  const map = page.locator('.iw-map-spatial').first(), places = map.locator('.places-atlas');
  check(await map.locator('.iw-map-state').count() === 36, 'All original geographic boundary selectors remain');
  check(await map.getByRole('button', { name: '3D atlas', exact: true }).count() === 0, 'No 3D presentation remains');
  check(await map.getByRole('button', { name: /Tilt map|Top down|Change camera tilt/u }).count() === 0, 'No pitch controls remain');
  check(Number(await places.getAttribute('data-places-pitch')) === 0, 'Camera starts flat');
  check(Number(await places.getAttribute('data-places-extrusions')) === 0, 'Provider extrusion layers are removed');
  const canvas = places.locator('canvas'); await canvas.scrollIntoViewIfNeeded(); const box = await canvas.boundingBox();
  await page.keyboard.down('Shift'); await page.mouse.move(box.x+box.width/2,box.y+box.height/2); await page.mouse.down(); await page.mouse.move(box.x+box.width/2+50,box.y+box.height/2+80); await page.mouse.up(); await page.keyboard.up('Shift');
  check(Number(await places.getAttribute('data-places-pitch')) === 0, 'Drag gestures cannot introduce pitch');
  await places.getByRole('button',{name:'Reset places map to India'}).click();
  await page.waitForTimeout(600);
  check(await places.locator('[data-map-hub]').count() > 0, 'Retained evidence populates state hubs');
  const hub = places.locator('[data-map-hub="state:MP"]'); await hub.click();
  await page.getByRole('region',{name:'Selected state evidence'}).waitFor();
  check(await hub.getAttribute('aria-pressed') === 'true', 'Hub click selects its evidence index');
  check((await hub.getAttribute('aria-label')).includes('Schematic state association'), 'Hub placement is explicitly schematic');
  check((await places.locator('.places-evidence-key').innerText()).includes('All '), 'Connection population and undrawable endpoints are disclosed');
  const overlay = places.getByRole('region', { name: 'Schematic relationship overlay' });
  await overlay.waitFor();
  if (await overlay.getByRole('button', {name:'Show',exact:true}).count()) await overlay.getByRole('button', {name:'Show',exact:true}).click();
  check(Number(await overlay.getAttribute('data-overlay-node-count')) <= 12 && Number(await overlay.getAttribute('data-overlay-edge-count')) <= 18, 'The relational preview respects its declared node and edge limits');
  check((await overlay.innerText()).includes('Schematic · not locations'), 'The selected network never implies geographic coordinates');
  await overlay.getByRole('button', {name:'All connections',exact:true}).click();
  check(await overlay.locator('.map-overlay-list li').count() === Number(await overlay.getAttribute('data-overlay-total-edges')), 'Every selected connection remains in the complete searchable list');
  const relationshipId = await overlay.locator('[data-overlay-edge-id]').first().getAttribute('data-overlay-edge-id');
  await overlay.locator('[data-overlay-edge-id]').first().focus(); await page.keyboard.press('Enter');
  check(await page.locator(`.atlas-evidence-popover[data-selection-id="${relationshipId}"]`).isVisible(), 'A relationship overlay edge opens its exact evidence identifier');
  const entityNode = places.locator('[data-overlay-entity-id]').first(), entityId = await entityNode.getAttribute('data-overlay-entity-id');
  await entityNode.click();
  check(await page.locator(`.atlas-evidence-popover[data-selection-id="${entityId}"]`).isVisible(), 'Selecting a diagram endpoint changes the reader to that exact identity');
  await page.getByRole('button', {name:'Close evidence details',exact:true}).click();
  await map.getByRole('button', { name: '2D map', exact: true }).click();
  check(await map.locator('.iw-map-stage').isVisible(), 'Offline map is directly selectable');
  check(await map.locator('[data-flat-map-hub]').count() > 0, 'Evidence hubs survive offline presentation');
  await map.locator('.iw-map-state[data-state-code="MP"]').focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter');
  check(await map.locator('.iw-map-select select').inputValue() !== 'MP', 'Original boundary keyboard navigation remains');
  await map.getByRole('button', { name: 'All India', exact: true }).click();
  const sitePicker = map.getByLabel('Find a public site', {exact:true});
  if (await sitePicker.count()) { await sitePicker.selectOption(await sitePicker.locator('option').nth(1).getAttribute('value')); const detail=page.getByRole('region',{name:'Selected site details'}); check((await detail.innerText()).includes('coordinate precision'), 'Sourced-site coordinate precision survives fallback'); check(await detail.locator('a[href="https://ipa.org.in/port/8"]').count() === 1, 'Coordinate source remains directly available'); }
  await map.getByRole('button', {name:'Places map',exact:true}).click(); await page.waitForSelector('[data-places-ready="true"]');
  await map.locator('canvas').evaluate(element => element.dispatchEvent(new Event('webglcontextlost', {cancelable:true})));
  await map.locator('.iw-map-graphics-notice').filter({hasText:'interrupted'}).waitFor();
  check(await map.locator('.iw-map-stage').isVisible(), 'Lost WebGL context returns to offline map');
  for (const width of [1440,390,320]) { await page.setViewportSize({width,height:width===1440?1100:900}); await map.getByRole('button',{name:'Places map',exact:true}).click(); await page.waitForSelector('[data-places-ready="true"]'); check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1), `${width}px flat map has no horizontal overflow`); await map.locator('.places-atlas-stage').scrollIntoViewIfNeeded(); await page.screenshot({path:resolve(out,`flat-map-${width}.png`)}); }
  const reduced = await browser.newPage({reducedMotion:'reduce'}); await reduced.goto(url); await reduced.locator('.iw-map-stage').waitFor(); check(await reduced.locator('canvas').count()===0,'Reduced motion defaults to offline geometry'); await reduced.close();
  const failed = await browser.newPage(); await controlled(failed); await failed.addInitScript(()=>{ const original=HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext=function(type,...args){return String(type).includes('webgl')?null:original.call(this,type,...args);}; }); await failed.goto(url); await failed.locator('.iw-map-graphics-notice').filter({hasText:'street-map service is unavailable'}).waitFor(); check(await failed.locator('.iw-map-stage').isVisible(),'Unavailable WebGL preserves usable fallback'); check(await failed.locator('.iw-map-state').count()===36,'Graphics failure preserves every boundary'); await failed.close();
  check(errors.length===0,`No browser runtime exceptions: ${errors.join(' | ')}`);
  console.log(JSON.stringify({passed:true,checks,screenshots:out}));
} catch(error) { console.error(JSON.stringify({passed:false,checks,url:page.url(),message:error.message,runtimeErrors:errors})); throw error; }
finally { await browser.close(); if(listening) await new Promise(done=>server.close(done)); }
