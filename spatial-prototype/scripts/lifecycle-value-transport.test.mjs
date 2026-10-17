/** Portable transport tests, not native-browser acceptance. */
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { serializeLifecycleValue } from './lifecycle-value-transport.mjs';
import { caseLifecycleObservationInitSource } from './case-lifecycle-observation.mjs';

test('plain native values survive without field omission, coercion, or mutation', () => {
  const shared = { ids: [1, 2], text: 'source → "exact"\n\u0000', okay: false, empty: null };
  const value = { shared, repeated: shared, empty: [], number: 1.234e-100 };
  const before = structuredClone(value);
  assert.deepEqual(JSON.parse(serializeLifecycleValue(value)), value);
  assert.deepEqual(value, before); assert.equal(value.shared, value.repeated);
});
for (const [name, value] of Object.entries({ undefined, nan: NaN, infinity: Infinity, negativeInfinity: -Infinity,
  negativeZero: -0, bigint: 2n, symbol: Symbol('field'), function: () => 1, date: new Date(), typed: new Uint8Array([1]),
  map: new Map(), set: new Set(), nullPrototype: Object.create(null) })) {
  test(`${name} cannot silently become a different JSON value`, () => {
    assert.throws(() => serializeLifecycleValue({ nested: [value] }), /Lifecycle transport/);
  });
}
test('own symbols, hidden/accessor fields, custom serialization, holes and cycles reject', () => {
  let calls = 0;
  const accessor = Object.defineProperty({}, 'field', { enumerable: true, get() { calls++; return 1; } });
  const custom = { toJSON() { calls++; return {}; } };
  const cyclic = {}; cyclic.self = cyclic;
  const arrayWithField = [1]; arrayWithField.field = 2;
  for (const value of [{ [Symbol('hidden')]: 1 }, Object.defineProperty({}, 'hidden', { value: 1 }), accessor, custom, new Array(1), arrayWithField, cyclic])
    assert.throws(() => serializeLifecycleValue(value), /Lifecycle transport/);
  assert.equal(calls, 0);
});
test('serialization cannot reread an original property through a changed get trap', () => {
  let reads = 0;
  const value = new Proxy({ required: 1 }, { get() { reads++; return undefined; } });
  assert.deepEqual(JSON.parse(serializeLifecycleValue(value)), { required: 1 });
  assert.equal(reads, 0);
  const protoKey = JSON.parse('{"__proto__":{"required":1}}');
  assert.deepEqual(JSON.parse(serializeLifecycleValue(protoKey)), protoKey);
});
test('injected observation JSON methods read once and preserve the original raw pair', () => {
  const realm = vm.createContext({});
  vm.runInContext(`globalThis.reads = 0; globalThis.document = { querySelector: () => ({ dataset: { geographicWorkspaceActive: 'true' } }), querySelectorAll: () => [1] };
    globalThis.value = { sequence: 7, contexts: [], renderers: [], errors: [] };
    globalThis.window = { __caseGraphicsProbe: { read() { reads++; return value; } } };`, realm);
  vm.runInContext(caseLifecycleObservationInitSource(), realm);
  const native = realm.window.__caseGraphicsProbe;
  assert.deepEqual(JSON.parse(native.readLifecycleJSON()), { sequence: 7, contexts: [], renderers: [], errors: [] });
  assert.equal(realm.reads, 1);
  assert.deepEqual(JSON.parse(native.readLeaseLifecycleJSON()), { active: 'true', workspaceCount: 1, data: { sequence: 7, contexts: [], renderers: [], errors: [] } });
  assert.equal(realm.reads, 2);
  const pair = native.readLifecyclePair(); assert.equal(realm.reads, 3); assert.equal(pair.full, realm.value);
  vm.runInContext('value.extra = undefined', realm);
  assert.throws(() => native.readLifecycleJSON(), /cannot omit or coerce/);
});
test('exact pair transport reverses to pinned actions, oracles, raw checkpoints and native probe', async () => {
  const source = await readFile(new URL('./case-graphics-browser.mjs', import.meta.url), 'utf8');
  const sha = value => createHash('sha256').update(value).digest('hex');
  const native = source.slice(source.indexOf('export function installCaseGraphicsProbe('), source.indexOf('export function selectCaseGraphicsFixtures('));
  const scenario = source.slice(source.indexOf('  await run(GRAPHICS_SCENARIOS[7]'), source.indexOf('  coverage.scenarios'));
  assert.equal(sha(native), 'f8f8407a5616d89b99e40596487819479dd800ee8e9739e9ddae19b18ab1b80e');
  const pairTransport = 'const pair = JSON.parse(await page.evaluate(() => window.__caseGraphicsProbe.readLifecyclePairJSON()));';
  const originalPair = "const pair = await page.evaluate(() => ({ active: document.querySelector('.webgl-host')?.dataset.geographicWorkspaceActive,\n        workspaceCount: document.querySelectorAll('[data-case-workspace]').length, ...window.__caseGraphicsProbe.readLifecyclePair() }));";
  assert.equal(scenario.split(pairTransport).length, 2, 'Exactly one checkpoint transport expression may change');
  assert.equal(sha(scenario), '4e6974e1426b669749a81838de7db0fbd9df2a820c845ce5588e9375c544d4f1');
  assert.equal(sha(scenario.replace(pairTransport, originalPair)), '31976f41f5380a8cfe7a368d7dbe2e173dabeb5e946966f074e0ca7d4aa995df');
  assert.match(source, /const probe = page => lifecycleObservationPages\.has\(page\)\s*\? page\.evaluate\(\(\) => window\.__caseGraphicsProbe\.readLifecycleJSON\(\)\)\.then\(JSON\.parse\) : fullProbe\(page\)/);
  assert.match(source, /const leaseSnapshot = page => lifecycleObservationPages\.has\(page\)\s*\? page\.evaluate\(\(\) => window\.__caseGraphicsProbe\.readLeaseLifecycleJSON\(\)\)\.then\(JSON\.parse\)/);
});
