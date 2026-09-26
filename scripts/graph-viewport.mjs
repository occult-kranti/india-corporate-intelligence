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
 * The connection graph now draws on a canvas under an SVG interaction layer; its
 * sections read the same camera from that layer and the node positions from the
 * layer's probes and the canvas's pixels (see the note above that section). The
 * GeoNetwork section is unchanged: it is still SVG.
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
//
// The connection graph draws on a canvas. The camera's element is the SVG
// interaction/a11y layer on top of it (`svg[data-graph]`), measured exactly as the
// SVG graph was, so the camera is read from it the same way: viewBox, the content
// group's transform and the live CTM. What used to be read off per-node SVG
// transforms is read from the layer's probes instead — `data-extent` (layout-space
// box of the drawn node centres), `data-probe` (screen position of the largest
// drawn node), `data-layout` (a digest of every position), `data-tick` (ticks run,
// monotonic), `data-pinned` — and "empty canvas" is found by reading the canvas's
// own pixels. The behaviours asserted are the same ones; only the source moved.
const G = 'svg[data-graph]';

/** The frame's canvas: backing store, CSS box and accessible name. */
const canvasState = (sel) =>
  page.evaluate((s) => {
    const svg = document.querySelector(s);
    const cv = svg.parentElement.querySelector('canvas');
    const r = cv.getBoundingClientRect();
    const sr = svg.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    return {
      w: cv.width, h: cv.height, cssW: r.width, cssH: r.height, dpr,
      sameBox: Math.abs(r.x - sr.x) < 0.5 && Math.abs(r.y - sr.y) < 0.5 && Math.abs(r.width - sr.width) < 0.5 && Math.abs(r.height - sr.height) < 0.5,
      role: cv.getAttribute('role'), name: cv.getAttribute('aria-label') ?? '',
    };
  }, sel);

/** Layout-space box of the drawn node centres, mapped through the camera; how many corners fall outside. */
const extentOutside = (sel) =>
  page.evaluate((s) => {
    const svg = document.querySelector(s);
    const vb = svg.getAttribute('viewBox').split(' ').map(Number);
    const m = svg.querySelector('g[transform^="translate"]').getAttribute('transform')
      .match(/translate\(([-\d.]+),\s*([-\d.]+)\)\s*scale\(([-\d.]+)\)/);
    const [tx, ty, k] = [+m[1], +m[2], +m[3]];
    const [x0, y0, x1, y1] = svg.getAttribute('data-extent').split(',').map(Number);
    const sx0 = x0 * k + tx, sx1 = x1 * k + tx, sy0 = y0 * k + ty, sy1 = y1 * k + ty;
    return {
      count: Number(svg.getAttribute('data-count')),
      inside: sx0 >= 0 && sy0 >= 0 && sx1 <= vb[2] && sy1 <= vb[3],
      box: `${Math.round(sx0)},${Math.round(sy0)} – ${Math.round(sx1)},${Math.round(sy1)} in ${vb[2]}×${vb[3]}`,
    };
  }, sel);

/** Screen (client) position and identity of the largest drawn node. */
const probe = (sel) =>
  page.evaluate((s) => {
    const svg = document.querySelector(s);
    const r = svg.getBoundingClientRect();
    const [x, y] = svg.getAttribute('data-probe').split(',').map(Number);
    return { x: r.x + x, y: r.y + y, id: svg.getAttribute('data-probe-id'), label: svg.getAttribute('data-probe-label') };
  }, sel);

/** A point with no ink within 14 CSS px on the canvas, and nothing but the layer under it. */
const emptySpot = (sel) =>
  page.evaluate(async (s) => {
    // The canvas repaints on the next frame after a camera change; read the new one.
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const svg = document.querySelector(s);
    const cv = svg.parentElement.querySelector('canvas');
    const ctx = cv.getContext('2d');
    const r = cv.getBoundingClientRect();
    const dpr = cv.width / r.width;
    for (let fy = 0.2; fy < 0.8; fy += 0.04) {
      for (let fx = 0.3; fx < 0.7; fx += 0.03) {
        const x = r.x + r.width * fx, y = r.y + r.height * fy;
        if (document.elementFromPoint(x, y) !== svg) continue;
        const px = ctx.getImageData(Math.round((x - r.x - 14) * dpr), Math.round((y - r.y - 14) * dpr), Math.round(28 * dpr), Math.round(28 * dpr)).data;
        let ink = false;
        for (let i = 3; i < px.length; i += 4) if (px[i]) { ink = true; break; }
        if (!ink) return { x, y };
      }
    }
    return null;
  }, sel);

/**
 * What the canvas actually painted around the largest drawn node — pixels, not
 * probes. `ring`: the share of 72 points on the pin ring's circle (radius r + 3.5
 * layout units) that carry the ring's colour. `body`: the alpha under the glyph at
 * (0, r/4) node-local, a point inside all five shapes, so a paint-side transform
 * that disagreed with the camera would find no ink there.
 */
const probeInk = (sel) =>
  page.evaluate(async (s) => {
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const svg = document.querySelector(s);
    const cv = svg.parentElement.querySelector('canvas');
    const ctx = cv.getContext('2d');
    const rect = cv.getBoundingClientRect();
    const dpr = cv.width / rect.width;
    const [x, y] = svg.getAttribute('data-probe').split(',').map(Number);
    const k = +svg.querySelector('g[transform^="translate"]').getAttribute('transform').match(/scale\(([-\d.]+)\)/)[1];
    const r = Number(svg.getAttribute('data-probe-r'));
    const rad = (r + 3.5) * k;
    const N = 72;
    let ring = 0;
    for (let i = 0; i < N; i++) {
      const a = (2 * Math.PI * i) / N;
      const d = ctx.getImageData(Math.round((x + rad * Math.cos(a)) * dpr) - 1, Math.round((y + rad * Math.sin(a)) * dpr) - 1, 3, 3).data;
      for (let j = 0; j < d.length; j += 4) {
        // The ring is 1 layout unit wide, as the SVG's was — under a pixel when zoomed
        // out — so any coverage counts; the before-pin control keeps this honest.
        if (d[j + 3] >= 16 && Math.abs(d[j] - 201) < 40 && Math.abs(d[j + 1] - 168) < 40 && Math.abs(d[j + 2] - 108) < 40) {
          ring++;
          break;
        }
      }
    }
    const body = ctx.getImageData(Math.round(x * dpr), Math.round((y + (r * k) / 4) * dpr), 1, 1).data;
    return { ring: ring / N, body: body[3], ok: Number.isFinite(r) && r > 0 };
  }, sel);

console.log('\nForceGraph — /#/cabinet');
await page.goto(`${base}/#/cabinet`, { waitUntil: 'networkidle' });
await page.waitForSelector(G);
await page.waitForFunction((s) => Number(document.querySelector(s)?.getAttribute('data-settled')) > 0, G, { timeout: 20000 });
await page.locator(G).scrollIntoViewIfNeeded();
await page.waitForTimeout(400);

const f0 = await camera(G);
check('viewBox is measured, not assumed (no letterbox)', f0.rectW === f0.vbW && f0.rectH === f0.vbH,
  `element ${f0.rectW}×${f0.rectH}, viewBox ${f0.vbW}×${f0.vbH}`);
const c0 = await canvasState(G);
check('canvas backing store is the frame × device pixel ratio, under the camera layer exactly',
  c0.sameBox && c0.w === Math.round(c0.cssW * c0.dpr) && c0.h === Math.round(c0.cssH * c0.dpr),
  `${c0.w}×${c0.h} for ${c0.cssW}×${c0.cssH} @${c0.dpr}`);
check('the canvas is an image with a name', c0.role === 'img' && /^Connection graph: \d+ entities/.test(c0.name), c0.name.slice(0, 60));
check('the layout ran in the worker', (await page.locator(G).getAttribute('data-driver')) === 'worker',
  await page.locator(G).getAttribute('data-driver'));

const clipped = await extentOutside(G);
check('every node lands inside the frame after auto-fit', clipped.inside, `${clipped.count} nodes, centres span ${clipped.box}`);
const ink0 = await probeInk(G);
check('the canvas painted the largest node where the camera says it is', ink0.ok && ink0.body > 100,
  `alpha ${ink0.body} under ${await page.locator(G).getAttribute('data-probe-label')}`);

await page.getByRole('button', { name: 'Pan right' }).click();
const f1 = await camera(G);
check('pan-right button moves the camera right', Math.round(f1.tx - f0.tx) < 0,
  `Δtx ${Math.round(f1.tx - f0.tx)}`);

const spot = await emptySpot(G);
check('found empty canvas to drag (cabinet)', !!spot);
await page.mouse.move(spot.x, spot.y);
await page.mouse.down();
await page.mouse.move(spot.x + 200, spot.y, { steps: 8 });
await page.mouse.up();
const f2 = await camera(G);
const dragErr = Math.abs(f2.tx - f1.tx - 200 * f2.ctmScale);
check('a 200px drag moves the graph exactly 200px', dragErr < 2,
  `moved ${Math.round(f2.tx - f1.tx)}, expected ${Math.round(200 * f2.ctmScale)}`);

await page.getByRole('button', { name: 'Zoom in' }).click();
const f3 = await camera(G);
check('zoom-in button scales by 1.3', Math.abs(f3.k / f2.k - 1.3) < 0.01, `${(f3.k / f2.k).toFixed(3)}×`);

await page.getByRole('button', { name: 'Fill the window' }).click();
await page.waitForTimeout(800);
const f4 = await camera(G);
check('maximise hands the graph the window', f4.rectW > 1300 && f4.rectH > 780, `${f4.rectW}×${f4.rectH}`);
check('maximised frame has no letterbox either', f4.rectW === f4.vbW && f4.rectH === f4.vbH,
  `viewBox ${f4.vbW}×${f4.vbH}`);
const c4 = await canvasState(G);
check('maximised canvas is re-sized with it', c4.sameBox && c4.w === Math.round(c4.cssW * c4.dpr) && c4.h === Math.round(c4.cssH * c4.dpr),
  `${c4.w}×${c4.h} for ${c4.cssW}×${c4.cssH}`);

// A node drag must move the node, pin it, and NOT be read as a click.
const target = await probe(G);
const ringBefore = await probeInk(G);
await page.mouse.move(target.x, target.y);
await page.mouse.down();
await page.mouse.move(target.x + 120, target.y - 80, { steps: 10 });
await page.mouse.up();
await page.waitForTimeout(250);
const moved = await probe(G);
check('dragging a node moves it — with the pointer', moved.id === target.id &&
  Math.abs(moved.x - target.x - 120) < 2 && Math.abs(moved.y - target.y + 80) < 2,
  `${target.label}: Δ ${Math.round(moved.x - target.x)},${Math.round(moved.y - target.y)}`);
const pinned = ((await page.locator(G).getAttribute('data-pinned')) ?? '').split(' ');
check('a dragged node is pinned and says so', pinned.includes(target.id) && (await page.locator('button:has-text("release")').count()) === 1);
const ringAfter = await probeInk(G);
check('the pinned node wears its ring on the canvas, and did not before', ringBefore.ok && ringBefore.ring < 0.3 && ringAfter.ring >= 0.5 && ringAfter.body > 100,
  `ring ink ${Math.round(ringBefore.ring * 100)}% → ${Math.round(ringAfter.ring * 100)}% of the circle; body alpha ${ringAfter.body}`);
check('a drag is not read as a click', (await page.locator('h3').filter({ hasText: target.label }).count()) === 0);
await page.mouse.click(target.x + 120, target.y - 80);
await page.waitForTimeout(250);
check('a click still selects', (await page.locator('h3').filter({ hasText: target.label }).count()) === 1);

await page.keyboard.press('Escape');
await page.waitForTimeout(400);
const f5 = await camera(G);
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
  page.waitForFunction((n) => Number(document.querySelector('svg[data-graph]')?.getAttribute('data-settled')) > n, after, {
    timeout: 20000,
  });
const settledCount = async () => Number(await page.locator(G).getAttribute('data-settled'));
/** Every drawn position (as a digest) and the ticks run so far: equal means nothing moved and nothing re-ran. */
const layoutState = () =>
  page.evaluate((s) => {
    const svg = document.querySelector(s);
    return { layout: svg.getAttribute('data-layout'), tick: svg.getAttribute('data-tick') };
  }, G);

await page.goto('about:blank');
await page.goto(`${base}/#/atlas`, { waitUntil: 'networkidle' });
await settled();
await page.locator(G).scrollIntoViewIfNeeded();
await page.waitForTimeout(400);

// An empty patch of canvas to drag from — not a node, not an overlay.
const empty = await emptySpot(G);
check('found empty canvas to drag', !!empty);
await page.mouse.move(empty.x, empty.y);
await page.mouse.down();
await page.mouse.move(empty.x + 150, empty.y + 60, { steps: 8 });
await page.mouse.up();
await page.mouse.wheel(0, -120);
await page.waitForTimeout(300);
check('wheel zoom logs no passive-listener error', passive.length === 0, passive[0] ?? '');
const s0 = await camera(G);
const l0 = await layoutState();

const nodes = page.locator(`${G} g[role="button"]`);
await nodes.nth(0).focus();
await page.keyboard.press('Enter');
await page.waitForTimeout(1200);
const s1 = await camera(G);
check('Enter selects (sel in the URL)', /[?&]sel=/.test(page.url()));
check('selecting keeps the pan and zoom', s1.tx === s0.tx && s1.ty === s0.ty && s1.k === s0.k,
  `before ${s0.tx},${s0.ty}×${s0.k} after ${s1.tx},${s1.ty}×${s1.k}`);
const l1 = await layoutState();
check('selecting does not re-run the layout', l1.tick === l0.tick && l1.layout === l0.layout,
  `ticks ${l0.tick}→${l1.tick}, layout ${l0.layout}→${l1.layout}`);
check('the selection is a pressed entity with its relationships in the tab order',
  (await page.locator(`${G} g[role="button"][aria-pressed="true"]`).count()) === 1 &&
  (await page.locator(`${G} g[role="img"][aria-roledescription="relationship"][tabindex="0"]`).count()) > 0);

await nodes.nth(1).focus();
await page.keyboard.press('Shift+Enter');
await page.waitForTimeout(1200);
const s2 = await camera(G);
check('Shift+Enter asks the path question (path in the URL)', /[?&]path=/.test(page.url()));
check('a path keeps the pan and zoom', s2.tx === s0.tx && s2.ty === s0.ty && s2.k === s0.k);

await page.keyboard.press('f');
await page.waitForTimeout(900);
const inFrame = await page.evaluate(() => document.activeElement?.getAttribute('aria-label')?.startsWith('Graph viewport') ?? false);
check('maximising with f keeps keyboard focus in the frame', inFrame);
const m0 = await camera(G);
await page.keyboard.press('ArrowLeft');
await page.waitForTimeout(200);
const m1 = await camera(G);
check('arrow keys still pan when maximised', m1.tx > m0.tx, `Δtx ${Math.round(m1.tx - m0.tx)}`);
await page.keyboard.press('Escape');
await page.waitForTimeout(500);
const m2 = await camera(G);
check('first Escape clears the path and stays maximised', !/[?&]path=/.test(page.url()) && m2.rectW > 1300,
  `${m2.rectW}×${m2.rectH}, url ${page.url().split('#')[1]}`);
await page.keyboard.press('Escape');
await page.waitForTimeout(500);
const m3 = await camera(G);
check('next Escape leaves the maximised view', m3.rectW < 1300, `${m3.rectW}×${m3.rectH}`);

// The keyboard cursor: the access route to entities outside the examined set,
// without one tab stop per entity. Tab from the frame lands on an entity; on an
// entity the arrows walk to a neighbour in space (they pan only on the frame);
// the move is announced; Enter selects where the cursor is.
await page.locator('[aria-label^="Graph viewport"]').first().focus();
await page.keyboard.press('Tab');
const focusedId = () => page.evaluate((s) => {
  const a = document.activeElement;
  return a?.closest?.(s) && a.getAttribute('role') === 'button' ? a.getAttribute('data-id') : null;
}, G);
const k0 = await focusedId();
check('Tab from the frame reaches an entity', !!k0, String(k0));
const stops = await page.locator(`${G} g[tabindex="0"]`).count();
const drawn = Number(await page.locator(G).getAttribute('data-count'));
check('tab stops are the examined set, not every entity', stops > 0 && stops < drawn, `${stops} stops for ${drawn} drawn`);
let k1 = k0;
for (const key of ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp']) {
  await page.keyboard.press(key);
  await page.waitForTimeout(250);
  k1 = await focusedId();
  if (k1 && k1 !== k0) break;
}
check('an arrow on an entity moves the cursor to another entity', !!k1 && k1 !== k0, `${k0} → ${k1}`);
const said = await page.evaluate(() => [...document.querySelectorAll('[aria-live="polite"]')].map((e) => e.textContent).join(' | '));
check('the cursor move is announced', /\d+ relationships? in view, \d+ alleged, \d+ denials?/.test(said), said.slice(0, 90));
await page.keyboard.press('Enter');
await page.waitForTimeout(600);
check('Enter selects the entity under the cursor', new URL(page.url().replace('/#/', '/')).searchParams.get('sel') === k1,
  page.url().split('#')[1]);

// A shared link draws the same picture it was copied from.
const before = await settledCount();
// click(), not uncheck(): the router commits the URL in a transition, so the
// controlled checkbox reads as still checked for a frame after the click.
await page.locator('aside input[type="checkbox"]').first().click();
await settled(before);
await page.waitForTimeout(600);
const viaClick = await layoutState();
const shared = page.url();
await page.goto('about:blank');
await page.goto(shared, { waitUntil: 'networkidle' });
await settled();
await page.waitForTimeout(600);
const viaUrl = await layoutState();
check('a shared URL reproduces the layout', !!viaUrl.layout && viaUrl.layout === viaClick.layout,
  `${viaClick.layout} vs ${viaUrl.layout}`);
page.off('console', onPassive);

// --------------------------------------------------------- hit-testing
// The pointer must find what is PAINTED. The first canvas build tested a circle
// of radius r around the layout point: square corners sit at 1.41·r and the
// person glyph hangs BELOW its layout point, so a quarter to a third of those
// glyphs could not be hovered or clicked, and the only click the gate made — the
// largest node's centre — never noticed. So: sample points inside each examined
// glyph's own fill (the overlay path is the same `shapeFor` string the canvas
// fills), confirm the canvas has ink there, hover each one and read the tooltip.
console.log('\nForceGraph — /#/atlas hit-testing follows the drawn shape');

const tipText = () =>
  page.evaluate(async (s) => {
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return document.querySelector(s).parentElement.querySelector(':scope > div[aria-hidden="true"].whitespace-nowrap')?.textContent ?? null;
  }, G);

/** Points inside each examined glyph's fill, relative to the layer's box, with ink under them, not inside another examined glyph. */
const glyphSamples = () =>
  page.evaluate(async (s) => {
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const svg = document.querySelector(s);
    const cv = svg.parentElement.querySelector('canvas');
    const ctx = cv.getContext('2d');
    const box = svg.getBoundingClientRect();
    const dpr = cv.width / box.width;
    const gs = [...svg.querySelectorAll('g[role="button"][data-id]')];
    const paths = gs.map((g) => g.querySelector('path'));
    const kindOf = (d) =>
      / h /.test(d) ? 'square' : / 0 1 1 /.test(d) ? 'person' : / 0 1 0 /.test(d) ? 'circle' : (d.match(/L/g) ?? []).length === 3 ? 'diamond' : 'triangle';
    const per = {};
    const out = [];
    for (const [gi, g] of gs.entries()) {
      const p = paths[gi];
      const kind = kindOf(p.getAttribute('d'));
      if ((per[kind] = (per[kind] ?? 0) + 1) > 6) continue;
      const b = p.getBBox();
      const m = p.getScreenCTM();
      const pts = [];
      const N = 6;
      for (let i = 0; i <= N; i++) {
        for (let j = 0; j <= N; j++) {
          const lx = b.x + b.width * (0.03 + (0.94 * i) / N);
          const ly = b.y + b.height * (0.03 + (0.94 * j) / N);
          if (!p.isPointInFill(new DOMPoint(lx, ly))) continue;
          const c = new DOMPoint(lx, ly).matrixTransform(m);
          if (c.x < 0 || c.y < 0 || c.x >= innerWidth || c.y >= innerHeight) continue;
          if (document.elementFromPoint(c.x, c.y) !== svg) continue;
          if (paths.some((q, qi) => qi !== gi && q.isPointInFill(new DOMPoint(c.x, c.y).matrixTransform(q.getScreenCTM().inverse())))) continue;
          const px = ctx.getImageData(Math.round((c.x - box.x) * dpr), Math.round((c.y - box.y) * dpr), 1, 1).data;
          if (!px[3]) continue;
          pts.push({ x: c.x - box.x, y: c.y - box.y });
        }
      }
      const cc = new DOMPoint(b.x + b.width / 2, b.y + b.height / 2).matrixTransform(m);
      if (pts.length) out.push({ id: g.getAttribute('data-id'), kind, centre: { x: cc.x - box.x, y: cc.y - box.y }, pts });
    }
    return out;
  }, G);

const layerBox = () => page.locator(G).boundingBox();

/** Hover every sample; a miss is any point whose tooltip is not the glyph's own. */
async function sweep(label) {
  const glyphs = await glyphSamples();
  const tally = {};
  let wrong = 0;
  for (const g of glyphs) {
    const b = await layerBox();
    await page.mouse.move(b.x + g.centre.x, b.y + g.centre.y);
    const own = await tipText();
    const t = (tally[g.kind] ??= { n: 0, miss: 0 });
    for (const p of g.pts) {
      const bb = await layerBox();
      await page.mouse.move(bb.x + p.x, bb.y + p.y);
      const tip = await tipText();
      t.n++;
      if (!own || tip !== own) {
        t.miss++;
        if (tip) wrong++;
      }
    }
  }
  const kinds = Object.keys(tally);
  const k = Number(await page.locator(G).getAttribute('data-k'));
  check(`every in-fill point of every examined glyph hovers that glyph (${label}, k=${k.toFixed(2)})`,
    ['square', 'person'].every((x) => tally[x]?.n > 0) && kinds.every((x) => tally[x].miss === 0) && wrong === 0,
    kinds.map((x) => `${x} ${tally[x].n - tally[x].miss}/${tally[x].n}`).join(' · ') + (wrong ? ` · ${wrong} named another entity` : ''));
}

await page.goto('about:blank');
await page.goto(`${base}/#/atlas?sel=adani`, { waitUntil: 'networkidle' });
await settled();
await page.locator(G).scrollIntoViewIfNeeded();
await page.waitForTimeout(500);
await sweep('at fit');
await page.getByRole('button', { name: 'Zoom in' }).click();
await page.getByRole('button', { name: 'Zoom in' }).click();
await page.waitForTimeout(300);
await sweep('zoomed in');

// The hit-test index must be the DRAWN set. An in-app focus change does not re-run
// the layout, and the first build keyed its quadtree on (layout version, count,
// first id) — so two ego sets of the same size with the same first node shared a
// stale tree: the new set's nodes did not hover, the hidden ones did.
console.log('\nForceGraph — /#/atlas hit-testing after an in-app focus change');
/** Each examined entity: its tooltip-form name, layout position and visual centre relative to the layer. */
const examinedNow = () =>
  page.evaluate((s) => {
    const svg = document.querySelector(s);
    const box = svg.getBoundingClientRect();
    return [...svg.querySelectorAll('g[role="button"][data-id]')].map((g) => {
      const p = g.querySelector('path');
      const b = p.getBBox();
      const c = new DOMPoint(b.x + b.width / 2, b.y + b.height / 2).matrixTransform(p.getScreenCTM());
      const [lx, ly] = g.getAttribute('transform').match(/translate\(([-\d.e]+),\s*([-\d.e]+)\)/).slice(1).map(Number);
      return { id: g.getAttribute('data-id'), name: g.getAttribute('aria-label'), lx, ly, x: c.x - box.x, y: c.y - box.y };
    });
  }, G);
await page.goto('about:blank');
await page.goto(`${base}/#/atlas?sel=jsw&focus=jsw&hops=1`, { waitUntil: 'networkidle' });
await settled();
await page.locator(G).scrollIntoViewIfNeeded();
await page.waitForTimeout(600);
const egoA = await examinedNow();
for (const n of egoA) {
  const b = await layerBox();
  await page.mouse.move(b.x + n.x, b.y + n.y);
  await tipText();
}
await page.evaluate(() => { location.hash = '#/atlas?sel=cavill&focus=cavill&hops=1'; });
await page.waitForFunction((s) => document.querySelector(`${s} g[data-id="cavill"]`), G, { timeout: 5000 });
await page.waitForTimeout(900);
const egoB = await examinedNow();
const drawnB = Number(await page.locator(G).getAttribute('data-count'));
let found = 0;
const misses = [];
for (const n of egoB) {
  const b = await layerBox();
  await page.mouse.move(b.x + n.x, b.y + n.y);
  const tip = await tipText();
  if (tip && n.name.startsWith(tip.split(' — ')[0])) found++;
  else misses.push(`${n.id}→${tip}`);
}
check('after a focus change every drawn entity hovers as itself', egoB.length === drawnB && found === egoB.length,
  `${found}/${egoB.length} of ${drawnB} drawn (${egoA.map((n) => n.id).join(',')} → ${egoB.map((n) => n.id).join(',')})${misses.length ? ` · ${misses.join(' ')}` : ''}`);
const hidden = egoA.filter((a) => !egoB.some((b) => b.id === a.id));
let ghost = 0;
let probed = 0;
for (const n of hidden) {
  const at = await page.evaluate(([s, lx, ly]) => {
    const svg = document.querySelector(s);
    const c = new DOMPoint(lx, ly).matrixTransform(svg.querySelector('g[transform^="translate"]').getScreenCTM());
    return document.elementFromPoint(c.x, c.y) === svg ? { x: c.x, y: c.y } : null;
  }, [G, n.lx, n.ly]);
  if (!at) continue;
  probed++;
  // A click, not a hover: a hover on a hidden entity is cleared on the next render,
  // but a click there used to select it.
  await page.mouse.click(at.x, at.y);
  await page.waitForTimeout(300);
  if (new URL(page.url().replace('/#/', '/')).searchParams.get('sel') === n.id) ghost++;
}
check('an entity the focus hides is not a hit target', probed > 0 && ghost === 0, `${ghost} of ${probed} hidden positions still select their entity`);

// The overlay's role=button must work however its click arrives: voice control,
// switch access and a screen reader's default action can raise a click on the
// element with no pointer coordinates at all.
console.log('\nForceGraph — /#/atlas a coordinate-less click on an entity');
await page.goto('about:blank');
await page.goto(`${base}/#/atlas`, { waitUntil: 'networkidle' });
await settled();
await page.locator(G).scrollIntoViewIfNeeded();
await page.waitForTimeout(400);
const btn = page.locator(`${G} g[role="button"][data-id]`).first();
const btnId = await btn.getAttribute('data-id');
await btn.focus();
await btn.evaluate((el) => el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })));
await page.waitForTimeout(600);
check('a click dispatched on the focused entity selects it', new URL(page.url().replace('/#/', '/')).searchParams.get('sel') === btnId,
  `${btnId}: ${page.url().split('#')[1]}`);

// A denial is drawn last and at least as wide as the claim it answers. With both
// on one straight line between the same two centres that painted the claim out —
// its tier dash, its ₹ width and its arrow — and the pointer found whichever came
// later in the array. Parallel relationships now fan out by rank; assert both are
// painted, in their own colours, and that each hovers as itself.
console.log('\nForceGraph — /#/network a claim beside its same-pair denial');
await page.goto('about:blank');
await page.goto(`${base}/#/network?sel=coal&focus=coal&hops=1`, { waitUntil: 'networkidle' });
await settled();
await page.locator(G).scrollIntoViewIfNeeded();
await page.waitForTimeout(600);
await page.getByRole('button', { name: 'Zoom in' }).first().click();
await page.waitForTimeout(300);
const pairLines = await page.evaluate(async (s) => {
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const svg = document.querySelector(s);
  const cv = svg.parentElement.querySelector('canvas');
  const ctx = cv.getContext('2d');
  const box = svg.getBoundingClientRect();
  const dpr = cv.width / box.width;
  const byPair = {};
  for (const l of svg.querySelectorAll('line[data-s]')) (byPair[[l.dataset.s, l.dataset.t].sort().join('|')] ??= []).push(l);
  const out = [];
  for (const ls of Object.values(byPair)) {
    const titles = ls.map((l) => l.parentElement.getAttribute('aria-label'));
    if (ls.length < 2 || !titles.some((t) => t.includes('Denial')) || titles.every((t) => t.includes('Denial'))) continue;
    for (const l of ls) {
      const m = l.getScreenCTM();
      const [x1, y1, x2, y2] = ['x1', 'y1', 'x2', 'y2'].map((a) => +l.getAttribute(a));
      const pts = [];
      for (const f of [0.25, 0.35, 0.65, 0.75]) {
        const P = new DOMPoint(x1 + (x2 - x1) * f, y1 + (y2 - y1) * f).matrixTransform(m);
        if (document.elementFromPoint(P.x, P.y) !== svg) continue;
        const px = ctx.getImageData(Math.round((P.x - box.x) * dpr), Math.round((P.y - box.y) * dpr), 1, 1).data;
        pts.push({ x: P.x, y: P.y, red: px[3] > 0 && px[0] - px[2] > 60, ink: px[3] > 0 });
      }
      const title = l.parentElement.getAttribute('aria-label');
      out.push({ title, pred: title.split(' · ')[1], denial: title.includes('Denial'), pts });
    }
    break;
  }
  return out;
}, G);
const shown = pairLines.map((l) => ({ ...l, painted: l.pts.filter((p) => p.ink && p.red === l.denial).length }));
check('a claim and its same-pair denial are both painted, each in its own colour',
  shown.length >= 2 && shown.every((l) => l.painted >= 2),
  shown.map((l) => `${l.denial ? 'denial' : 'claim'} ${l.painted}/${l.pts.length}`).join(' · ') || 'no same-pair claim and denial drawn');
let hovered = 0;
for (const l of shown) {
  const p = l.pts.find((q) => q.ink && q.red === l.denial);
  if (!p) continue;
  await page.mouse.move(p.x, p.y);
  await page.waitForTimeout(200);
  const heads = await page.evaluate(() => [...document.querySelectorAll('h3, h4')].map((h) => h.textContent).join(' | '));
  if (heads.includes(`— ${l.pred} —`)) hovered++;
}
check('each of them hovers as itself', shown.length >= 2 && hovered === shown.length, `${hovered}/${shown.length}`);

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
