import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './load.mjs';
const { BOARD_LAYOUT_KEY, THREAD_TYPES, emptyBoardLayout, boardPinKey, clampPoint, parseBoardLayout, addBoardThread, mergeBoardLayouts } = await loadModule('src/components/board/boardStore.ts');
const { CASEBOOK_KEY, emptyCasebook, parseCasebook, mergeCasebooks, buildCasebookPacket } = await loadModule('src/components/investigation/casebookStore.ts');
const thread = (overrides = {}) => ({ id: 'thread-1', from: 'record:a', to: 'record:b', type: 'question', note: 'Ask for the underlying record.', ...overrides });
const layout = (threads = [], positions = {}) => ({ version: 1, positions, threads });
const pin = (id, note = '') => ({ kind: 'record', id, note, addedAt: '2026-10-15T00:00:00Z' });

test('board is separate versioned state and fresh defaults do not share mutable objects', () => {
  assert.notEqual(BOARD_LAYOUT_KEY, CASEBOOK_KEY);
  assert.equal(boardPinKey({ kind: 'record', id: 'namespace:one' }), 'record:namespace:one');
  assert.deepEqual(THREAD_TYPES, ['question', 'compare', 'counter-evidence', 'follow-up']);
  const a = emptyBoardLayout(), b = emptyBoardLayout(); a.positions['record:a'] = { x: 24, y: 42 }; a.threads.push(thread());
  assert.deepEqual(b, layout());
});

test('clamping keeps cards inside narrow and desktop stages without mutating inputs', () => {
  const point = { x: -90, y: -20 }; assert.deepEqual(clampPoint(point, 1280), { x: 16, y: 24 }); assert.deepEqual(point, { x: -90, y: -20 });
  assert.equal(clampPoint({ x: 9999, y: 42 }, 1280).x, 988);
  assert.equal(clampPoint({ x: 500, y: 42 }, 200).x, 16);
  assert.equal(clampPoint({ x: 1e30, y: 1e30 }, 1280).y, 90000, 'Extreme coordinates have a finite explicit vertical ceiling');
});

test('all 250 pins can occupy distinct reading-order rows without hitting a vertical overlap ceiling', () => {
  for (const columns of [1, 3, 4]) {
    const expected = Array.from({ length: 250 }, (_, index) => ({ x: 24 + index % columns * 300, y: 42 + Math.floor(index / columns) * 360 }));
    const positions = expected.map(point => clampPoint(point, 1800));
    assert.equal(new Set(positions.map(point => `${point.x}:${point.y}`)).size, 250, `${columns}-column arrangement must retain 250 distinct card positions`);
    assert.equal(positions.at(-1).y, expected.at(-1).y, 'valid last-row position remains visible');
  }
});

test('parser rejects malformed envelopes, array positions and unsupported versions', () => {
  for (const raw of [null, false, 'bad', [], {}, { version: 2, positions: {}, threads: [] }, { version: 1, positions: [], threads: [] }, { version: 1, positions: {}, threads: {} }]) assert.equal(parseBoardLayout(raw), null, JSON.stringify(raw));
});

test('oversized imports reject instead of silently discarding arrangements or annotations', () => {
  const positions = Object.fromEntries(Array.from({ length: 251 }, (_, i) => [`record:${i}`, { x: 24, y: 42 }]));
  assert.equal(parseBoardLayout(layout([], positions)), null, '251 stored positions must not silently become 250');
  assert.equal(parseBoardLayout(layout(Array.from({ length: 501 }, (_, i) => thread({ id: `t-${i}`, to: `record:${i}` })))), null);
});

test('parser ignores invalid rows while retaining bounded, finite positions and valid unknown IDs', () => {
  const parsed = parseBoardLayout(layout([null, {}, thread({ id: 'same-endpoint', to: 'record:a' }), thread({ id: 'invalid-type', type: 'ownership' }), thread({ id: 'bad-key', from: 'javascript:evil' }), thread()], { 'record:a': { x: -100, y: -100 }, 'record:unavailable': { x: 42, y: 90 }, 'record:nan': { x: NaN, y: 20 }, 'entity:infinite': { x: 1, y: Infinity }, 'unknown:id': { x: 30, y: 40 } }));
  assert.ok(parsed); assert.deepEqual(Object.keys(parsed.positions), ['record:a', 'record:unavailable']);
  assert.deepEqual(parsed.positions['record:a'], { x: 16, y: 24 }); assert.equal(parsed.threads.length, 1); assert.equal(parsed.threads[0].note, thread().note);
});

test('empty endpoint IDs are rejected rather than creating unresolvable annotations', () => {
  const parsed = parseBoardLayout(layout([thread({ from: 'record:' })], { 'record:': { x: 40, y: 40 } }));
  assert.ok(!parsed || (!parsed.threads.length && !Object.hasOwn(parsed.positions, 'record:')));
});

test('IDs remain unique after long-ID normalization and typed endpoint duplicates cannot enter', () => {
  const prefix = 'x'.repeat(180);
  const long = parseBoardLayout(layout([thread({ id: `${prefix}a` }), thread({ id: `${prefix}b`, to: 'record:c' })]));
  assert.ok(!long || new Set(long.threads.map(row => row.id)).size === long.threads.length, 'normalization must not create duplicate deletion/React IDs');
  const pairs = parseBoardLayout(layout([thread(), thread({ id: 'second' })]));
  assert.ok(!pairs || pairs.threads.length === 1, 'duplicate typed endpoint rows must be rejected or collapsed');
});

test('parser is stable across JSON persistence and bounds untrusted text', () => {
  const parsed = parseBoardLayout(layout([thread({ note: 'x'.repeat(2200) })], { 'record:a': { x: 42, y: 16000 } }));
  assert.ok(parsed); assert.ok(parsed.threads[0].note.length <= 2000);
  assert.deepEqual(parseBoardLayout(JSON.parse(JSON.stringify(parsed))), parsed);
});

test('adding a thread validates direction, type and duplicate identity without mutating current data', () => {
  const current = layout([thread()]); const original = structuredClone(current);
  assert.throws(() => addBoardThread(current, thread({ id: 'other' })), /already/);
  assert.throws(() => addBoardThread(current, thread({ id: 'self', to: 'record:a' })), /different/);
  assert.throws(() => addBoardThread(current, thread({ id: 'bad', to: 'record:c', type: 'ownership' })), /valid/);
  assert.throws(() => addBoardThread(current, thread({ to: 'record:c' })), /valid/);
  assert.deepEqual(current, original);
  assert.equal(addBoardThread(current, thread({ id: 'reverse', from: 'record:b', to: 'record:a' })).threads.length, 2);
  assert.equal(addBoardThread(current, thread({ id: 'compare', type: 'compare' })).threads.length, 2);
});

test('500-thread capacity is exact and failed addition is atomic', () => {
  const current = layout(Array.from({ length: 499 }, (_, i) => thread({ id: `t-${i}`, to: `record:${i}` })));
  const full = addBoardThread(current, thread({ id: 'last', to: 'record:last' }));
  assert.equal(full.threads.length, 500); const before = structuredClone(full);
  assert.throws(() => addBoardThread(full, thread({ id: 'overflow', to: 'record:overflow' })), /500/);
  assert.deepEqual(full, before); assert.equal(current.threads.length, 499);
});

test('additive merge preserves existing positions and notes, adds incoming items, and is idempotent', () => {
  const current = layout([thread()], { 'record:a': { x: 60, y: 70 } });
  const incoming = layout([thread({ id: 'alternate-id', note: 'Conflicting imported note' }), thread({ id: 'new', to: 'record:c' })], { 'record:a': { x: 90, y: 90 }, 'record:c': { x: 200, y: 90 } });
  const before = structuredClone(current), merged = mergeBoardLayouts(current, incoming);
  assert.deepEqual(merged.positions['record:a'], current.positions['record:a']); assert.deepEqual(merged.positions['record:c'], incoming.positions['record:c']);
  assert.equal(merged.threads[0].note, thread().note); assert.equal(merged.threads.length, 2);
  assert.deepEqual(mergeBoardLayouts(merged, incoming), merged); assert.deepEqual(current, before);
});

test('merge collision resolution never reuses an existing generated ID or loses a row on reload', () => {
  const current = layout([thread({ id: 'same' }), thread({ id: 'same-import-2', to: 'record:c' })]);
  const incoming = layout([thread({ id: 'same', to: 'record:d' })]);
  const merged = mergeBoardLayouts(current, incoming);
  assert.equal(new Set(merged.threads.map(row => row.id)).size, 3);
  assert.equal(parseBoardLayout(JSON.parse(JSON.stringify(merged))).threads.length, 3);
});

test('over-capacity merge is atomic and duplicate endpoints do not consume capacity', () => {
  const current = layout(Array.from({ length: 500 }, (_, i) => thread({ id: `t-${i}`, to: `record:${i}` })));
  const before = structuredClone(current);
  assert.equal(mergeBoardLayouts(current, current).threads.length, 500);
  assert.throws(() => mergeBoardLayouts(current, layout([thread({ id: 'new', to: 'record:other' })])), /500/);
  assert.deepEqual(current, before);
});

test('board restore composes additive casebook and layout merges without dropping unknown saved IDs', () => {
  const currentBook = { ...emptyCasebook(), title: 'Current question', question: 'Keep question', falsifier: 'Keep falsifier', pins: [pin('a', 'Keep note')] };
  const incomingBook = { ...emptyCasebook(), pins: [pin('a', 'Replace note'), pin('missing', 'Retained unavailable note')] };
  const merged = mergeCasebooks(currentBook, parseCasebook(incomingBook));
  assert.equal(merged.pins.length, 2); assert.equal(merged.pins[0].note, 'Keep note'); assert.equal(merged.question, 'Keep question'); assert.equal(merged.falsifier, 'Keep falsifier');
  const currentLayout = layout([thread()], { 'record:a': { x: 40, y: 70 } });
  assert.equal(mergeBoardLayouts(currentLayout, layout()).threads[0].note, thread().note);
});

test('analyst threads remain outside exported source assertions and cannot mutate the registry', async () => {
  const api = await loadModule('src/data/investigation.ts'); const registry = api.getInvestigationRegistry();
  const record = registry.records.find(row => row.sourceIds.length); assert.ok(record);
  const book = { ...emptyCasebook(), pins: [pin(record.id, 'My inference is a question, not a source assertion.')] };
  const before = JSON.stringify(registry); const packet = { ...buildCasebookPacket(book, registry), boardLayout: layout([thread()]) };
  assert.ok(packet.sources.length); assert.equal(packet.boardLayout.threads.length, 1);
  assert.ok(!packet.relationships.some(row => row.id === 'thread-1')); assert.ok(packet.limitations.some(text => text.includes('not source assertions')));
  assert.equal(JSON.stringify(registry), before); assert.deepEqual(parseCasebook(packet.casebook), book);
});

test('combined position capacity rejects atomically rather than creating a layout that cannot reload', () => {
  const current = layout([], Object.fromEntries(Array.from({ length: 250 }, (_, i) => [`record:${i}`, { x: 42, y: 42 + i * 360 }])));
  const before = structuredClone(current);
  assert.throws(() => mergeBoardLayouts(current, layout([], { 'record:extra': { x: 42, y: 60 } })), /250/);
  assert.deepEqual(current, before);
  assert.equal(Object.keys(mergeBoardLayouts(current, current).positions).length, 250);
});
