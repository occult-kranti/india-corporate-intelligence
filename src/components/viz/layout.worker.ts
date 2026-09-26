import { createLayout, type Layout, type LayoutInput } from './layoutCore';

/**
 * The layout, off the main thread.
 *
 * The main thread never ticks: it receives a positions buffer (transferred, not
 * copied) after each ~12 ms chunk of ticks, and one final buffer marked `done`.
 * Chunking is what keeps this worker responsive to a `pin` or a new `init` in the
 * middle of a run; the chunk size never changes the result, because the tick count
 * is fixed. Every message carries the generation it belongs to, so a buffer from
 * a layout the reader has already filtered away is dropped on arrival.
 */

export type ToWorker =
  | ({ type: 'init'; gen: number; ticks: number; reduced: boolean } & LayoutInput)
  | { type: 'pin'; gen: number; i: number; x: number; y: number }
  | { type: 'release'; gen: number; ticks: number; reduced: boolean }
  | { type: 'stop' };

export type FromWorker = { type: 'pos'; gen: number; pos: Float64Array; ticks: number; done: boolean };

const CHUNK_MS = 12;

let layout: Layout | null = null;
let count = 0;
let gen = -1;
let left = 0;
let ran = 0;
let timer: ReturnType<typeof setTimeout> | null = null;

function post(done: boolean) {
  if (!layout) return;
  const pos = new Float64Array(count * 2);
  layout.write(pos);
  const msg: FromWorker = { type: 'pos', gen, pos, ticks: ran, done };
  (self as unknown as { postMessage(m: FromWorker, t: Transferable[]): void }).postMessage(msg, [pos.buffer]);
}

function chunk() {
  timer = null;
  if (!layout) return;
  const t0 = performance.now();
  while (left > 0 && performance.now() - t0 < CHUNK_MS) {
    layout.tick(1);
    left--;
    ran++;
  }
  post(left === 0);
  if (left > 0) timer = setTimeout(chunk, 0);
}

function run(ticks: number, reduced: boolean) {
  if (timer) clearTimeout(timer);
  timer = null;
  if (!layout) return;
  if (reduced) {
    // Reduced motion: the settled picture, pre-ticked, with nothing in between.
    layout.tick(ticks);
    ran += ticks;
    left = 0;
    post(true);
    return;
  }
  left = ticks;
  chunk();
}

self.onmessage = (ev: MessageEvent<ToWorker>) => {
  const m = ev.data;
  if (m.type === 'stop') {
    if (timer) clearTimeout(timer);
    timer = null;
    layout = null;
    return;
  }
  if (m.type === 'init') {
    gen = m.gen;
    count = m.r.length;
    ran = 0;
    layout = createLayout(m);
    run(m.ticks, m.reduced);
    return;
  }
  if (m.gen !== gen || !layout) return;
  if (m.type === 'pin') {
    // No restart: pulling one strand out must not re-boil the settled picture.
    // A run still in progress honours the pin on its next tick.
    layout.pin(m.i, m.x, m.y);
    return;
  }
  if (m.type === 'release') {
    layout.release();
    run(m.ticks, m.reduced);
  }
};
