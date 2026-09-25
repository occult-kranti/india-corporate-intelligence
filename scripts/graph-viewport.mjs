#!/usr/bin/env node
/**
 * Graph viewport gate.
 *
 * Every assertion here exists because the corresponding bug SHIPPED.
 *
 *  · The svg carried a fixed `viewBox` with the default preserveAspectRatio, so the
 *    force layout was letterboxed inside its element — "maximise" bought blank
 *    margin rather than graph.
 *  · Pan mapped the cursor through `rect.width`, which is not what the viewBox
 *    spans when letterboxed, so the graph slid at a different rate than the pointer.
 *  · Auto-fit ran on the first tick, fitting d3's seed spiral, and zoomed IN to 1.6x
 *    on a graph whose nodes then spread far outside the frame: 196 of 224 clipped.
 *
 * None of those are type errors and none of them fail a render smoke test. They are
 * only visible if something measures the camera, so this measures the camera.
 *
 * Usage: node scripts/graph-viewport.mjs [baseUrl]
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.map': 'application/json',
  '.png': 'image/png', '.woff2': 'font/woff2',
};

let server = null;
let base = process.argv[2]?.startsWith('http') ? process.argv[2] : null;
if (!base) {
  if (!existsSync(join(dist, 'index.html'))) {
    console.error('graph-viewport: dist/index.html missing — run `npm run build` first.\n');
    process.exit(1);
  }
  server = createServer((req, res) => {
    const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
    let file = join(dist, url === '/' ? 'index.html' : url);
    if (!existsSync(file) || extname(file) === '') file = join(dist, 'index.html');
    try {
      res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
      res.end(readFileSync(file));
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
}

const fails = [];
const check = (name, ok, detail) => {
  console.log(`  ${ok ? '·' : '✗'} ${name}${detail ? `  ${detail}` : ''}`);
  if (!ok) fails.push(name);
};

// The environment ships a pinned Chromium; use it rather than downloading one (as smoke.mjs does).
const PINNED = process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/opt/pw-browsers/chromium';
const browser = await chromium.launch(existsSync(PINNED) ? { executablePath: PINNED } : {});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

/** Camera state, read straight off the DOM rather than from app internals. */
const camera = (sel) =>
  page.evaluate((s) => {
    const svg = document.querySelector(s);
    const r = svg.getBoundingClientRect();
    const vb = svg.getAttribute('viewBox').split(' ').map(Number);
    const g = svg.querySelector('g[transform^="translate"]');
    const m = g.getAttribute('transform').match(/translate\(([-\d.]+),\s*([-\d.]+)\)\s*scale\(([-\d.]+)\)/);
    const ctm = svg.getScreenCTM();
    return {
      rectW: Math.round(r.width), rectH: Math.round(r.height),
      vbW: vb[2], vbH: vb[3],
      tx: +m[1], ty: +m[2], k: +m[3],
      /** viewBox units per CSS pixel — 1 when the viewBox is measured, <1 when fixed. */
      ctmScale: +ctm.a.toFixed(4),
    };
  }, sel);

// ---------------------------------------------------------------- force graph
console.log('\nForceGraph — /#/cabinet');
await page.goto(`${base}/#/cabinet`, { waitUntil: 'networkidle' });
await page.waitForSelector('svg[data-tick]');
await page.waitForTimeout(5200); // past the 4200ms settle, then the fit
await page.locator('svg[data-tick]').scrollIntoViewIfNeeded();
await page.waitForTimeout(300);

const f0 = await camera('svg[data-tick]');
check('viewBox is measured, not assumed (no letterbox)', f0.rectW === f0.vbW && f0.rectH === f0.vbH,
  `element ${f0.rectW}×${f0.rectH}, viewBox ${f0.vbW}×${f0.vbH}`);

const clipped = await page.evaluate(() => {
  const svg = document.querySelector('svg[data-tick]');
  const vb = svg.getAttribute('viewBox').split(' ').map(Number);
  const m = svg.querySelector('g[transform^="translate"]').getAttribute('transform')
    .match(/translate\(([-\d.]+),\s*([-\d.]+)\)\s*scale\(([-\d.]+)\)/);
  const [tx, ty, k] = [+m[1], +m[2], +m[3]];
  const nodes = [...svg.querySelectorAll('g[role="button"]')];
  let outside = 0;
  for (const n of nodes) {
    const t = n.getAttribute('transform').match(/translate\(([-\d.]+),\s*([-\d.]+)\)/);
    const x = +t[1] * k + tx, y = +t[2] * k + ty;
    if (x < 0 || y < 0 || x > vb[2] || y > vb[3]) outside++;
  }
  return { outside, total: nodes.length };
});
check('every node lands inside the frame after auto-fit', clipped.outside === 0,
  `${clipped.outside} of ${clipped.total} outside`);

await page.getByRole('button', { name: 'Pan right' }).click();
const f1 = await camera('svg[data-tick]');
check('pan-right button moves the camera right', Math.round(f1.tx - f0.tx) < 0,
  `Δtx ${Math.round(f1.tx - f0.tx)}`);

const box = await page.locator('svg[data-tick]').boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down();
await page.mouse.move(box.x + box.width / 2 + 200, box.y + box.height / 2, { steps: 8 });
await page.mouse.up();
const f2 = await camera('svg[data-tick]');
const dragErr = Math.abs(f2.tx - f1.tx - 200 * f2.ctmScale);
check('a 200px drag moves the graph exactly 200px', dragErr < 2,
  `moved ${Math.round(f2.tx - f1.tx)}, expected ${Math.round(200 * f2.ctmScale)}`);

await page.getByRole('button', { name: 'Zoom in' }).click();
const f3 = await camera('svg[data-tick]');
check('zoom-in button scales by 1.3', Math.abs(f3.k / f2.k - 1.3) < 0.01, `${(f3.k / f2.k).toFixed(3)}×`);

await page.getByRole('button', { name: 'Fill the window' }).click();
await page.waitForTimeout(800);
const f4 = await camera('svg[data-tick]');
check('maximise hands the graph the window', f4.rectW > 1300 && f4.rectH > 780, `${f4.rectW}×${f4.rectH}`);
check('maximised frame has no letterbox either', f4.rectW === f4.vbW && f4.rectH === f4.vbH,
  `viewBox ${f4.vbW}×${f4.vbH}`);

// A node drag must move the node, pin it, and NOT be read as a click.
const target = await page.evaluate(() => {
  const gs = [...document.querySelectorAll('svg[data-tick] g[role="button"]')];
  const best = gs.map((g) => ({ g, r: g.querySelector('path').getBoundingClientRect() }))
    .sort((a, b) => b.r.width - a.r.width)[0];
  return { x: best.r.x + best.r.width / 2, y: best.r.y + best.r.height / 2,
    label: best.g.getAttribute('aria-label'), before: best.g.getAttribute('transform') };
});
await page.mouse.move(target.x, target.y);
await page.mouse.down();
await page.mouse.move(target.x + 120, target.y - 80, { steps: 10 });
await page.mouse.up();
await page.waitForTimeout(250);
const after = await page.evaluate((label) => {
  const g = [...document.querySelectorAll('svg[data-tick] g[role="button"]')]
    .find((n) => n.getAttribute('aria-label') === label);
  return { t: g.getAttribute('transform'), ring: !!g.querySelector('circle[stroke="#c9a86c"]') };
}, target.label);
check('dragging a node moves it', after.t !== target.before);
check('a dragged node is pinned and says so', after.ring && (await page.locator('button:has-text("release")').count()) === 1);
check('a drag is not read as a click', (await page.locator('h3').filter({ hasText: target.label.split(',')[0] }).count()) === 0);
await page.mouse.click(target.x + 120, target.y - 80);
await page.waitForTimeout(250);
check('a click still selects', (await page.locator('h3').filter({ hasText: target.label.split(',')[0] }).count()) === 1);

await page.keyboard.press('Escape');
await page.waitForTimeout(400);
const f5 = await camera('svg[data-tick]');
check('Escape returns it inline', f5.rectW < 1000, `${f5.rectW}×${f5.rectH}`);

// ------------------------------------------------ selection keeps the camera
// Selecting, path-finding and maximising are not filter changes. They used to
// re-run the layout (the filter memos were keyed on the whole URL), move every
// node and refit the camera over the reader's pan and zoom.
console.log('\nForceGraph — /#/atlas selection, path, keyboard focus, reproducibility');
const passive = [];
const onPassive = (m) => {
  if (m.type() === 'error' && /passive/i.test(m.text())) passive.push(m.text());
};
page.on('console', onPassive);

/** Wait until the layout has settled more times than `after` — i.e. a fresh settle. */
const settled = (after = 0) =>
  page.waitForFunction((n) => Number(document.querySelector('svg[data-tick]')?.getAttribute('data-settled')) > n, after, {
    timeout: 20000,
  });
const settledCount = async () => Number(await page.locator('svg[data-tick]').getAttribute('data-settled'));
const nodeTransforms = () =>
  page.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll('svg[data-tick] g[data-id]')].map((g) => [g.getAttribute('data-id'), g.getAttribute('transform')]),
    ),
  );

await page.goto('about:blank');
await page.goto(`${base}/#/atlas`, { waitUntil: 'networkidle' });
await settled();
await page.locator('svg[data-tick]').scrollIntoViewIfNeeded();
await page.waitForTimeout(400);

// An empty patch of canvas to drag from — not a node, not an overlay.
const empty = await page.evaluate(() => {
  const svg = document.querySelector('svg[data-tick]');
  const r = svg.getBoundingClientRect();
  for (let fy = 0.2; fy < 0.8; fy += 0.05) {
    for (let fx = 0.3; fx < 0.7; fx += 0.05) {
      const x = r.x + r.width * fx, y = r.y + r.height * fy;
      const el = document.elementFromPoint(x, y);
      if (el === svg) return { x, y };
    }
  }
  return null;
});
check('found empty canvas to drag', !!empty);
await page.mouse.move(empty.x, empty.y);
await page.mouse.down();
await page.mouse.move(empty.x + 150, empty.y + 60, { steps: 8 });
await page.mouse.up();
await page.mouse.wheel(0, -120);
await page.waitForTimeout(300);
check('wheel zoom logs no passive-listener error', passive.length === 0, passive[0] ?? '');
const s0 = await camera('svg[data-tick]');
const tick0 = await page.locator('svg[data-tick]').getAttribute('data-tick');
const pos0 = await nodeTransforms();

const nodes = page.locator('svg[data-tick] g[role="button"]');
await nodes.nth(0).focus();
await page.keyboard.press('Enter');
await page.waitForTimeout(1200);
const s1 = await camera('svg[data-tick]');
check('Enter selects (sel in the URL)', /[?&]sel=/.test(page.url()));
check('selecting keeps the pan and zoom', s1.tx === s0.tx && s1.ty === s0.ty && s1.k === s0.k,
  `before ${s0.tx},${s0.ty}×${s0.k} after ${s1.tx},${s1.ty}×${s1.k}`);
check('selecting does not re-run the layout',
  (await page.locator('svg[data-tick]').getAttribute('data-tick')) === tick0 &&
  JSON.stringify(await nodeTransforms()) === JSON.stringify(pos0));

await nodes.nth(1).focus();
await page.keyboard.press('Shift+Enter');
await page.waitForTimeout(1200);
const s2 = await camera('svg[data-tick]');
check('Shift+Enter asks the path question (path in the URL)', /[?&]path=/.test(page.url()));
check('a path keeps the pan and zoom', s2.tx === s0.tx && s2.ty === s0.ty && s2.k === s0.k);

await page.keyboard.press('f');
await page.waitForTimeout(900);
const inFrame = await page.evaluate(() => document.activeElement?.getAttribute('aria-label')?.startsWith('Graph viewport') ?? false);
check('maximising with f keeps keyboard focus in the frame', inFrame);
const m0 = await camera('svg[data-tick]');
await page.keyboard.press('ArrowLeft');
await page.waitForTimeout(200);
const m1 = await camera('svg[data-tick]');
check('arrow keys still pan when maximised', m1.tx > m0.tx, `Δtx ${Math.round(m1.tx - m0.tx)}`);
await page.keyboard.press('Escape');
await page.waitForTimeout(500);
const m2 = await camera('svg[data-tick]');
check('first Escape clears the path and stays maximised', !/[?&]path=/.test(page.url()) && m2.rectW > 1300,
  `${m2.rectW}×${m2.rectH}, url ${page.url().split('#')[1]}`);
await page.keyboard.press('Escape');
await page.waitForTimeout(500);
const m3 = await camera('svg[data-tick]');
check('next Escape leaves the maximised view', m3.rectW < 1300, `${m3.rectW}×${m3.rectH}`);

// A shared link draws the same picture it was copied from.
const before = await settledCount();
// click(), not uncheck(): the router commits the URL in a transition, so the
// controlled checkbox reads as still checked for a frame after the click.
await page.locator('aside input[type="checkbox"]').first().click();
await settled(before);
await page.waitForTimeout(600);
const viaClick = await nodeTransforms();
const shared = page.url();
await page.goto('about:blank');
await page.goto(shared, { waitUntil: 'networkidle' });
await settled();
await page.waitForTimeout(600);
const viaUrl = await nodeTransforms();
const ids = Object.keys(viaUrl);
const differ = ids.filter((id) => viaUrl[id] !== viaClick[id]).length;
check('a shared URL reproduces the layout', ids.length > 0 && differ === 0, `${differ} of ${ids.length} nodes differ`);
page.off('console', onPassive);

// --------------------------------------------------------------- geo network
console.log('\nGeoNetwork — /#/geograph');
await page.goto(`${base}/#/geograph`, { waitUntil: 'networkidle' });
await page.waitForSelector('svg[data-geo]');
await page.waitForTimeout(600);
await page.locator('svg[data-geo]').scrollIntoViewIfNeeded();
await page.waitForTimeout(200);

const g0 = await camera('svg[data-geo]');
check('map keeps its fixed viewBox — a stretched map is a lie', g0.vbW === 830 && g0.vbH === 696,
  `viewBox ${g0.vbW}×${g0.vbH}, element ${g0.rectW}×${g0.rectH}`);

const gbox = await page.locator('svg[data-geo]').boundingBox();
await page.mouse.move(gbox.x + gbox.width / 2, gbox.y + gbox.height / 2);
await page.mouse.down();
await page.mouse.move(gbox.x + gbox.width / 2 + 150, gbox.y + gbox.height / 2, { steps: 8 });
await page.mouse.up();
const g1 = await camera('svg[data-geo]');
const geoErr = Math.abs(g1.tx - g0.tx - 150 * g1.ctmScale);
check('drag is exact under letterboxing too', geoErr < 2,
  `moved ${Math.round(g1.tx - g0.tx)} viewBox units for 150px at ${g1.ctmScale} units/px`);

await page.locator('svg[data-geo]').locator('..').getByRole('button', { name: 'Zoom in' }).click();
const g2 = await camera('svg[data-geo]');
check('map zooms', Math.abs(g2.k / g1.k - 1.3) < 0.01, `${(g2.k / g1.k).toFixed(3)}×`);

await page.locator('svg[data-geo]').locator('..').getByRole('button', { name: 'Fit to frame' }).click();
await page.waitForTimeout(200);
const g3 = await camera('svg[data-geo]');
check('fit returns the whole map', g3.k === 1 && g3.tx === 0 && g3.ty === 0, `k=${g3.k} tx=${g3.tx} ty=${g3.ty}`);

await page.locator('svg[data-geo]').locator('..').getByRole('button', { name: 'Fill the window' }).click();
await page.waitForTimeout(700);
const g4 = await camera('svg[data-geo]');
check('map maximises', g4.rectH > 780, `${g4.rectW}×${g4.rectH}`);

await browser.close();
server?.close();

if (fails.length) {
  console.error(`\ngraph-viewport: FAILED — ${fails.length} check${fails.length === 1 ? '' : 's'}\n`);
  process.exit(1);
}
console.log('\ngraph-viewport: OK\n');
