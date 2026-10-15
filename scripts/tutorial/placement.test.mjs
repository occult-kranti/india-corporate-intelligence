/** Geometry and observer contracts without launching a browser. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { getTutorialPlacement, watchTutorialPosition } from '../../src/tutorial/placement.mjs';
const require = createRequire(new URL('../../global-evidence-workbench/ui/package.json', import.meta.url));
const { JSDOM } = require('jsdom');
const rect = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height });
const box = placement => rect(placement.left, placement.top, placement.width, placement.maxHeight);
const separated = (a, b, gap = 20) => a.right + gap <= b.left || b.right + gap <= a.left || a.bottom + gap <= b.top || b.bottom + gap <= a.top;
function bounded(p, v) { assert.ok(p.left >= (v.left ?? 0) + 16); assert.ok(p.top >= (v.top ?? 0) + 16); assert.ok(p.left + p.width <= (v.left ?? 0) + v.width - 16); assert.ok(p.top + p.maxHeight <= (v.top ?? 0) + v.height - 16); }

test('reported 1280 px board screenshot places popup left of Pin a record with 20 px clearance', () => {
 const anchor = rect(1092, 243, 128, 40), viewport = { width: 1280, height: 1000 };
 const p = getTutorialPlacement(anchor, { width: 480, height: 494 }, viewport);
 assert.equal(p.side, 'left'); assert.equal(p.left, 592); assert.equal(p.top, 243);
 assert.ok(separated(box(p), anchor)); bounded(p, viewport);
});
test('each fitting side is selected and clamped without sliding across the anchor', () => {
 for (const [anchor, side] of [[rect(20, 700, 100, 40), 'right'], [rect(1100, 700, 100, 40), 'left'], [rect(300, 30, 680, 40), 'bottom'], [rect(300, 900, 680, 40), 'top']]) {
  const viewport = { width: 1280, height: 1000 }, p = getTutorialPlacement(anchor, { width: 480, height: 494 }, viewport);
  assert.equal(p.side, side); assert.ok(separated(box(p), anchor)); bounded(p, viewport);
 }
});
test('mobile uses a shorter scrollable dialog when a full-height popup cannot fit', () => {
 const anchor = rect(230, 390, 128, 44), viewport = { width: 390, height: 844 };
 const p = getTutorialPlacement(anchor, { width: 358, height: 600 }, viewport);
 assert.equal(p.side, 'bottom'); assert.equal(p.maxHeight, 374); assert.ok(separated(box(p), anchor)); bounded(p, viewport);
});
test('visual viewport offsets and tall content remain inside the visible viewport', () => {
 const viewport = { left: 70, top: 120, width: 800, height: 600 };
 const anchor = rect(710, 300, 100, 40), p = getTutorialPlacement(anchor, { width: 480, height: 900 }, viewport);
 bounded(p, viewport); assert.ok(separated(box(p), anchor));
});
test('large panel fallback preserves its leading label band; unavailable targets center safely', () => {
 const viewport = { width: 390, height: 844 }, anchor = rect(16, 80, 358, 700);
 const p = getTutorialPlacement(anchor, { width: 358, height: 500 }, viewport);
 assert.equal(p.side, 'label'); assert.ok(p.top >= anchor.top + 48 + 20); bounded(p, viewport);
 for (const target of [null, rect(0, 1000, 100, 40)]) { const center = getTutorialPlacement(target, { width: 480, height: 500 }, viewport); assert.equal(center.side, 'center'); bounded(center, viewport); }
});
test('small-window matrix never overlaps a control when any full-size side is available', () => {
 for (const width of [390, 768, 1280, 1440]) for (const height of [600, 844, 1000]) for (const x of [16, width / 2 - 60, width - 136]) for (const y of [16, height / 2, height - 60]) {
  const anchor = rect(x, y, 120, 40), viewport = { width, height }, p = getTutorialPlacement(anchor, { width: Math.min(480, width - 32), height: 440 }, viewport);
  bounded(p, viewport);
  if (['left', 'right', 'top', 'bottom'].includes(p.side)) assert.ok(separated(box(p), anchor));
  const full = (x - 20 - 16 >= p.width || width - 16 - (x + 120 + 20) >= p.width || y - 20 - 16 >= 440 || height - 16 - (y + 40 + 20) >= 440);
  if (full) assert.ok(separated(box(p), anchor));
 }
});
test('position watcher remeasures resize, scroll, content and visual viewport, then fully cleans up', async () => {
 const dom = new JSDOM('<button id="anchor">Pin a record</button><dialog open><header>Guide</header><p>Body</p><footer>Next</footer></dialog>', { pretendToBeVisual: true });
 const w = dom.window, d = w.document, dialog = d.querySelector('dialog'), target = d.querySelector('#anchor');
 Object.defineProperties(w, { innerWidth: { value: 1280, writable: true }, innerHeight: { value: 1000, writable: true } });
 const vv = new w.EventTarget(); Object.assign(vv, { width: 1280, height: 1000, offsetLeft: 0, offsetTop: 0 }); Object.defineProperty(w, 'visualViewport', { value: vv });
 let anchor = rect(1092, 243, 128, 40), popupHeight = 494, resizeCallback, disconnected = false;
 target.getBoundingClientRect = () => anchor; dialog.getBoundingClientRect = () => rect(0, 0, parseFloat(dialog.style.width) || 480, popupHeight);
 w.ResizeObserver = class { constructor(callback) { resizeCallback = callback; } observe() {} unobserve() {} disconnect() { disconnected = true; } };
 const wait = () => new Promise(resolve => w.setTimeout(resolve, 25));
 const watch = watchTutorialPosition(dialog, () => target, getTutorialPlacement);
 assert.equal(dialog.dataset.placement, 'left'); assert.equal(dialog.style.left, '592px');
 anchor = rect(20, 243, 128, 40); w.dispatchEvent(new w.Event('scroll')); await wait(); assert.equal(dialog.dataset.placement, 'right'); assert.equal(dialog.style.left, '168px');
 popupHeight = 800; resizeCallback(); await wait(); assert.equal(dialog.style.top, '184px');
 vv.width = 390; vv.height = 844; anchor = rect(230, 390, 128, 44); vv.dispatchEvent(new w.Event('resize')); await wait(); assert.equal(dialog.dataset.placement, 'bottom'); assert.equal(dialog.style.maxHeight, '374px');
 anchor = rect(230, 700, 128, 44); dialog.querySelector('p').textContent = 'Expanded content'; await wait(); assert.equal(dialog.dataset.placement, 'top');
 watch.stop(); assert.equal(disconnected, true); assert.equal(dialog.getAttribute('style'), ''); assert.equal(dialog.dataset.placement, undefined);
 w.dispatchEvent(new w.Event('resize')); await wait(); assert.equal(dialog.dataset.placement, undefined); dom.window.close();
});
