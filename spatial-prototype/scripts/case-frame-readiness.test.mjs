import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { caseFrameReadiness, waitForCaseFrame, observeCaseFrame } from './case-frame-readiness.mjs';

const edgeId = 'relation:usa-alphabet-founders:AF-C01:1';
const file = { id: 'case:usa-alphabet-founders', nodes: [{ id: 'node:a' }, { id: 'node:b' }], edges: [{ id: edgeId }], readerFactIds: ['fact:retained'] };
const baseline = { sequence: 100, contextId: 1, canvasId: 2, rendererId: 89 };
const pass = (id, contextId = 1) => ({ id, contextId, rendererId: 89, nativeSucceeded: true, restored: true });
function ready() { return {
  caseId: file.id, selection: edgeId, view: 'scene', motion: 'false',
  dataset: { caseFrameNodes: '2', caseSceneDraws: '11', caseCompositeDraws: '1' },
  roles: [{ id: edgeId, selected: true, text: 'Exact retained role' }], nodes: [{ id: 'node:a', selected: false }],
  native: { ...baseline, sequence: 122, pendingPass: null, poisoned: null, scene: pass(101), composite: pass(121) },
}; }
const options = { expectedSelection: edgeId, afterNative: baseline };
const boundedUntil = async (predicate, message, budget) => { assert.equal(budget, 15000); for (let attempt = 0; attempt < 3; attempt++) if (await predicate()) return; throw new Error(message); };

test('retained race fixture rejects new selection with the old zero-role frame despite positive draw counters', () => {
  const stale = ready(); stale.roles = []; stale.dataset.caseSceneDraws = '10'; stale.native.scene = pass(80); stale.native.composite = pass(99);
  assert.equal(caseFrameReadiness(stale, file, options), false);
  assert.equal(caseFrameReadiness(ready(), file, options), true);
});
test('bounded wait observes the exact selected frame and records first/last observations without an arbitrary delay', async () => {
  const stale = ready(); stale.roles = []; const values = [stale, ready()], result = {};
  const value = await waitForCaseFrame({ read: async () => values.shift(), until: boundedUntil, file, result, ...options });
  assert.equal(value.roles[0].id, edgeId); assert.equal(result.caseFrameReadiness[0].attempts, 2);
  assert.deepEqual(result.caseFrameReadiness[0].first.roles, []); assert.equal(result.caseFrameReadiness[0].last.roles[0].id, edgeId);
});
test('a required selected label that never arrives still fails the scenario', async () => {
  const stale = ready(); stale.roles = []; const result = {};
  await assert.rejects(waitForCaseFrame({ read: async () => stale, until: boundedUntil, file, result, ...options }), /exact selected physical frame/);
  assert.equal(result.caseFrameReadiness[0].status, 'failed'); assert.equal(result.caseFrameReadiness[0].attempts, 3);
});
test('a missing first frame is retained as missing rather than overwritten by a later observation', async () => {
  const values = [null, ready()], result = {};
  await waitForCaseFrame({ read: async () => values.shift(), until: boundedUntil, file, result, ...options });
  assert.equal(result.caseFrameReadiness[0].first, null);
});

for (const [name, change] of [
  ['wrong workspace', s => s.caseId = 'other'], ['old selection', s => s.selection = ''],
  ['wrong selected role', s => s.roles[0].id = 'wrong:role'], ['unselected role', s => s.roles[0].selected = false],
  ['duplicate selected role', s => s.roles.push({ ...s.roles[0] })], ['incomplete node frame', s => s.dataset.caseFrameNodes = '0'],
  ['no physical draws', s => s.dataset.caseSceneDraws = '0'], ['motion unfinished', s => s.motion = 'true'],
  ['reader replaces scene', s => s.view = 'list'], ['missing native evidence', s => s.native = null],
  ['stale scene pass', s => s.native.scene.id = 100], ['stale composite', s => s.native.composite.id = 100],
  ['reversed pass order', s => s.native.scene.id = 122], ['pass beyond observed watermark', s => s.native.sequence = 110],
  ['wrong context', s => s.native.contextId = 8], ['wrong canvas', s => s.native.canvasId = 8],
  ['wrong renderer', s => s.native.rendererId = 8], ['wrong pass renderer', s => s.native.scene.rendererId = 8],
  ['wrong pass context', s => s.native.composite.contextId = 8], ['pending native pass', s => s.native.pendingPass = { id: 123 }],
  ['poisoned renderer', s => s.native.poisoned = { reason: 'fault' }], ['native draw failed', s => s.native.composite.nativeSucceeded = false],
  ['state not restored', s => s.native.scene.restored = false], ['unknown selected ID', s => s.selection = 'invented:id'],
]) test(`readiness rejects ${name}`, () => { const sample = ready(); change(sample); assert.equal(caseFrameReadiness(sample, file, options), false); });

test('exact node and retained reader-only selections preserve their own semantics', () => {
  const sample = ready(); sample.selection = 'node:a'; sample.roles[0].selected = false; sample.nodes[0].selected = true;
  assert.equal(caseFrameReadiness(sample, file, { expectedSelection: 'node:a' }), true);
  sample.selection = 'fact:retained'; sample.nodes[0].selected = false;
  assert.equal(caseFrameReadiness(sample, file, { expectedSelection: 'fact:retained' }), true);
});
test('unknown expected original IDs fail before observing any page', async () => {
  let reads = 0;
  await assert.rejects(waitForCaseFrame({ read: async () => { reads++; return ready(); }, until: boundedUntil, file, expectedSelection: 'invented:id' }), /exact retained case ID/);
  assert.equal(reads, 0);
});
test('atomic observation includes selection, physical labels, frame attributes and native identity in one callback', () => {
  const source = observeCaseFrame.toString();
  for (const field of ['caseSelection', 'caseMotion', 'surface.dataset', 'data-case-node-id', 'data-case-edge-id', 'frameIdentity']) assert.ok(source.includes(field));
  assert.doesNotMatch(source, /await |setTimeout|requestAnimationFrame|dispatchEvent|\.click\(/);
});
test('resource cycle keeps actual input and unchanged resource/timing gates while requesting exact fresh frames', async () => {
  const source = await readFile(new URL('./case-graphics-browser.mjs', import.meta.url), 'utf8');
  assert.match(source, /selectionBaseline = await page\.evaluate\(\(\) => window\.__caseGraphicsProbe\.frameIdentity\(\)\);[\s\S]*?await edgeButton\(page, dense\.edges\[0\]\.id\)\.click\(\)/);
  assert.match(source, /expectedSelection: dense\.edges\[0\]\.id, afterNative: selectionBaseline/);
  assert.match(source, /expectedSelection: dense\.edges\[0\]\.id, afterNative: reentryBaseline/);
  for (const exact of ['budgetMs: 300000', 'index <= 30', 'frames(120, true)', 'caseResourceObservationChecks.length, 9', 'assertHandlePlateau(baseline, result.caseResourceCycles)']) assert.ok(source.includes(exact));
  const workspace = await readFile(new URL('./case-workspace-browser.mjs', import.meta.url), 'utf8');
  assert.match(workspace, /const selection = sample\.selection;/);
  assert.match(workspace, /Selected physical role label differs from exact retained edge/);
  assert.match(workspace, /Selected node must remain in the physical frame/);
});
