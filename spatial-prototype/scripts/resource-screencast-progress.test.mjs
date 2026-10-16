/** Test-only progress/capture contracts. No browser or graphics process starts. */
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const graphics = await readFile(new URL('./case-graphics-browser.mjs', import.meta.url), 'utf8');
const start = graphics.indexOf('    async frames(count, driveCase = false)');
const end = graphics.indexOf('\n  };', start);
const method = graphics.slice(start, end);
function fixture() {
  const callbacks = [], events = [], shared = { frameTimes: [], timingProgress: null };
  let requested = 0, epoch = 1800000000000, surfaceAvailable = true;
  const surface = { dispatchEvent(event) { events.push({ key: event.key, bubbles: event.bubbles, cancelable: event.cancelable }); } };
  const realm = { shared, performance: { timeOrigin: epoch }, Date: { now: () => epoch++ },
    requestAnimationFrame(resolve) { requested++; callbacks.push(resolve); },
    document: { querySelector(selector) { assert.equal(selector, '[data-case-surface]'); return surfaceAvailable ? surface : null; } },
    KeyboardEvent: class { constructor(type, options) { assert.equal(type, 'keydown'); Object.assign(this, options); } },
    keep(list, value, limit) { list.push(value); if (list.length > limit) list.shift(); } };
  const api = vm.runInNewContext(`({${method}})`, realm);
  const advance = async time => { assert.equal(callbacks.length, 1, 'Exactly one original RAF must be pending'); callbacks.shift()(time); await Promise.resolve(); };
  return { api, shared, events, callbacks, advance, requested: () => requested, loseSurface: () => { surfaceAvailable = false; } };
}
const plain = value => JSON.parse(JSON.stringify(value));
test('actual frame sampler retains exactly120 RAF/input opportunities and119 deltas with additive bounded progress', async () => {
  const f = fixture(); const pending = f.api.frames(120, true);
  assert.equal(f.shared.timingProgress.completed, 0); assert.equal(f.shared.timingProgress.complete, false);
  for (let i = 0; i < 120; i++) {
    await f.advance(100 + 16 * i);
    assert.equal(f.shared.timingProgress.completed, i + 1);
    assert.equal(f.events.length, i + 1);
    assert.equal(f.shared.timingProgress.opportunities.length, i + 1);
  }
  assert.deepEqual(plain(await pending), Array(119).fill(16));
  assert.equal(f.requested(), 120); assert.equal(f.callbacks.length, 0);
  assert.equal(f.shared.frameTimes.length, 1); assert.equal(f.shared.timingProgress.complete, true);
  assert.equal(f.shared.timingProgress.requested, 120);
  assert.deepEqual(f.events, Array.from({ length: 120 }, () => ({ key: 'Home', bubbles: true, cancelable: true })));
  assert.deepEqual(plain(f.shared.timingProgress.opportunities.map(row => row.ordinal)), Array.from({ length: 120 }, (_, i) => i + 1));
  assert.ok(f.shared.timingProgress.opportunities.every((row, i) => row.animationFrameTime === 100 + 16 * i && row.observedAtEpochMs >= f.shared.timingProgress.startedAtEpochMs));
});
test('partial progress remains measurable before pending sample completes and preserves predeadline timestamps', async () => {
  const f = fixture(); const pending = f.api.frames(120, true);
  for (let i = 0; i < 37; i++) await f.advance(i * 16);
  const beforeWait = plain(f.shared.timingProgress), deadlineEpochMs = beforeWait.opportunities.at(-1).observedAtEpochMs;
  assert.equal(beforeWait.completed, 37); assert.equal(beforeWait.complete, false); assert.equal(f.shared.frameTimes.length, 0);
  for (let i = 37; i < 120; i++) await f.advance(i * 16);
  await pending;
  assert.equal(beforeWait.completed, 37, 'Retained partial receipt must not mutate with continuation');
  assert.equal(f.shared.timingProgress.opportunities.filter(row => row.observedAtEpochMs <= deadlineEpochMs).length, 37);
  assert.equal(f.shared.timingProgress.completed, 120);
});
test('unforced sampling retains original RAF result and no progress/input side effects', async () => {
  const f = fixture(); const pending = f.api.frames(3);
  for (const time of [12, 25, 41]) await f.advance(time);
  assert.deepEqual(plain(await pending), [13, 16]); assert.equal(f.requested(), 3);
  assert.deepEqual(f.events, []); assert.equal(f.shared.timingProgress, null);
});
test('invalid counts fail before sampling and missing active surface cannot complete progress', async () => {
  for (const count of [0, 1, 181, NaN, Infinity, 2.5, '120']) {
    const f = fixture(); await assert.rejects(f.api.frames(count, true), /Invalid bounded frame sample/);
    assert.equal(f.requested(), 0); assert.equal(f.shared.timingProgress, null);
  }
  const f = fixture(); const pending = f.api.frames(120, true);
  await f.advance(0); f.loseSurface(); await f.advance(16);
  await assert.rejects(pending, /lost its case surface/);
  assert.equal(f.shared.timingProgress.completed, 1); assert.equal(f.shared.timingProgress.complete, false);
  assert.equal(f.events.length, 1); assert.equal(f.shared.frameTimes.length, 0);
});
test('native probe is byte-token conserved after only exact additive progress fields are removed', () => {
  let probe = graphics.slice(graphics.indexOf('export function installCaseGraphicsProbe'), graphics.indexOf('\nexport function selectCaseGraphicsFixtures'));
  const additions = [
    'timingProgress: null, ',
    '      // Additive diagnostics only: actual RAF/input sequence and result stay unchanged.\n',
    '      if (driveCase) shared.timingProgress = { requested: count, startedAtEpochMs: Date.now(), performanceTimeOrigin: performance.timeOrigin, completed: 0, complete: false, opportunities: [] };\n',
    '        shared.timingProgress.opportunities.push({ ordinal: i + 1, animationFrameTime: times[i], observedAtEpochMs: Date.now() }); shared.timingProgress.completed = i + 1;\n',
    '      if (driveCase) { shared.timingProgress.complete = true; shared.timingProgress.completedAtEpochMs = Date.now(); }\n',
  ];
  for (const addition of additions) { assert.equal(probe.split(addition).length, 2); probe = probe.replace(addition, ''); }
  assert.equal(createHash('sha256').update(probe.replace(/\s+/g, ' ').trim()).digest('hex'), 'b7de9758068be117b5b8535315b067234a274a5bedc34999eb5deea69212024c');
  assert.match(graphics, /read\(\) \{ return \{ \.\.\.shared/);
  assert.match(graphics, /const data = await fullProbe\(page\)/);
});
