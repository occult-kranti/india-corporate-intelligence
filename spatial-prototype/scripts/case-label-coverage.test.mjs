import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CaseLabelGeometryError, assertReadableGeometry, createCaseLabelCoverage } from './case-label-coverage.mjs';
import { validateCaseLabelGeometry } from './case-label-readability.mjs';
const ids = ['case:usa-musk', 'case:public-office%2Findia-modi', ...Array.from({ length: 17 }, (_, i) => `case:${i}`)];
const phases = id => ['initial', 'selected-node', 'selected-edge', ...([ids[0], ids[1]].includes(id) ? ['selected-edge-after-source-dialog'] : []), ...(id === ids[0] ? ['selected-edge-forced-colors', 'selected-edge-restored-colors'] : [])];
const fill = async (collector, check = async () => true, skip = '') => { for (const id of ids) for (const phase of phases(id)) if (`${id}:${phase}` !== skip) await collector.observe(id, phase, () => check(id, phase)); };
test('all 19 cases and exact 61 required state checkpoints pass only with zero geometry failures', async () => {
  const collector = createCaseLabelCoverage(ids, () => assert.fail('unexpected capture'));
  await fill(collector);
  assert.deepEqual(collector.finish(ids), { cases: 19, checkpoints: 61, geometryFailures: 0 });
});
test('one geometry failure is captured at its exact state, traversal continues, and final acceptance fails', async () => {
  const events = [], collector = createCaseLabelCoverage(ids, failure => { events.push(`capture:${failure.caseId}:${failure.phase}`); return 'exact-failed-state.png'; });
  await fill(collector, async (id, phase) => {
    events.push(`check:${id}:${phase}`);
    if (id === ids[2] && phase === 'selected-node') assertReadableGeometry(false, 'measured plaque collision');
    return true;
  });
  const pos = events.indexOf(`check:${ids[2]}:selected-node`);
  assert.equal(events[pos + 1], `capture:${ids[2]}:selected-node`);
  assert.equal(events[pos + 2], `check:${ids[2]}:selected-edge`);
  assert.equal(collector.observations.length, 61); assert.equal(collector.failures.length, 1);
  assert.equal(collector.failures[0].capture, 'exact-failed-state.png');
  assert.throws(() => collector.finish(ids), /Label geometry failures remain \(1\)/);
});
test('every omitted case or required phase and a wrong order fail terminal coverage', async () => {
  for (const id of ids) for (const phase of phases(id)) {
    const collector = createCaseLabelCoverage(ids, () => 'no');
    await fill(collector, undefined, `${id}:${phase}`);
    assert.throws(() => collector.finish(ids), /Missing exact geometry checkpoint/);
  }
  const collector = createCaseLabelCoverage(ids, () => 'no'); await fill(collector);
  assert.throws(() => collector.finish(ids.slice(1)), /All 19 exact cases/);
  assert.throws(() => collector.finish([...ids].reverse()), /All 19 exact cases/);
});
test('unknown states, duplicate states and incorrect case cardinality fail immediately', async () => {
  assert.throws(() => createCaseLabelCoverage(ids.slice(1), () => {}), /19 unique/);
  const collector = createCaseLabelCoverage(ids, () => 'no');
  await assert.rejects(collector.observe('unknown', 'initial', async () => true), /Unexpected geometry case/);
  await assert.rejects(collector.observe(ids[2], 'selected-edge-forced-colors', async () => true), /Unexpected geometry phase/);
  await collector.observe(ids[0], 'initial', async () => true);
  await assert.rejects(collector.observe(ids[0], 'initial', async () => true), /Duplicate geometry/);
});
test('source, selection, native draw and fatal/runtime errors never become collected geometry failures', async () => {
  for (const error of [new assert.AssertionError({ message: 'source identity failed' }), new assert.AssertionError({ message: 'selected endpoint missing' }), new assert.AssertionError({ message: 'no native draw' }), new Error('fatal renderer'), { name: 'CaseLabelGeometryError', message: 'spoofed tag' }]) {
    const collector = createCaseLabelCoverage(ids, () => assert.fail('must not capture semantic/runtime failure'));
    await assert.rejects(collector.observe(ids[0], 'initial', async () => { throw error; }), actual => actual === error);
    assert.equal(collector.failures.length, 0); assert.equal(collector.observations[0].status, 'checking');
  }
});
test('capture errors propagate while retaining the exact original failure', async () => {
  const failure = new CaseLabelGeometryError('collision'), captureError = new Error('capture failed');
  const collector = createCaseLabelCoverage(ids, () => { throw captureError; });
  await assert.rejects(collector.observe(ids[0], 'initial', () => { throw failure; }), actual => actual === captureError);
  assert.equal(collector.failures[0].message, 'collision'); assert.equal(collector.observations[0].status, 'failed');
  assert.throws(() => collector.finish(ids));
});
function fixture() {
  return { width: 400, height: 300, selection: '', labels: [{ id: 'a', kind: 'node', text: 'Exact A', rect: { left: 5, top: 5, width: 100, height: 30 }, anchor: { x: 55, y: 20 }, lines: [{ left: 10, top: 10, width: 90, height: 20 }], visible: true, textOverflow: 'clip', lineClamp: 'none' }], leaders: [], expectedNodeIds: ['a'], expectedRoleIds: [] };
}
const file = { id: 'case:test', nodes: [{ id: 'a', label: 'Exact A' }], edges: [] };
test('strict validator tags only presentation assertions and preserves immediate source/anchor failures', () => {
  const clipping = fixture(); clipping.labels[0].lines[0].width = 110;
  assert.throws(() => validateCaseLabelGeometry(clipping, file), error => error instanceof CaseLabelGeometryError);
  const text = fixture(); text.labels[0].text = 'Changed source';
  assert.throws(() => validateCaseLabelGeometry(text, file), error => error instanceof assert.AssertionError && !(error instanceof CaseLabelGeometryError));
  const moved = fixture(); moved.labels[0].anchor.x = 56;
  assert.throws(() => validateCaseLabelGeometry(moved, file), error => error instanceof assert.AssertionError && !(error instanceof CaseLabelGeometryError));
  const missing = fixture(); missing.expectedNodeIds.push('missing');
  assert.throws(() => validateCaseLabelGeometry(missing, file), error => error instanceof assert.AssertionError && !(error instanceof CaseLabelGeometryError));
});
test('harness uses collector only in scenario37 and unconditionally finishes after native/closure/resource checks', () => {
  const harness = readFileSync(new URL('./case-workspace-browser.mjs', import.meta.url), 'utf8');
  const begin = harness.indexOf("await scenario('37-all-case-scenes"), end = harness.indexOf("await scenario('38-native-sources", begin);
  const body = harness.slice(begin, end), elsewhere = harness.slice(0, begin) + harness.slice(end);
  assert.equal((body.match(/createCaseLabelCoverage\(/g) ?? []).length, 1);
  assert.equal((body.match(/labelCoverage\.finish\(completedLabelCases\)/g) ?? []).length, 1);
  assert.ok(body.indexOf('labelCoverage.finish') > body.indexOf('await resources.finish()'));
  assert.ok(body.indexOf('labelCoverage.finish') > body.indexOf('No real shared-context drawing was observed'));
  assert.ok(body.indexOf('labelCoverage.finish') < body.indexOf("result.notes.push('All 19 cases completed"));
  for (const phase of phases(ids[0])) assert.ok(body.includes(`assertCaseFrame(page, file, until, result, '${phase}', labelCoverage${phase === 'selected-edge' ? ', async () => {' : ')'}`));
  const railCheck = body.slice(body.indexOf("'selected-edge', labelCoverage, async () => {"), body.indexOf('for (const factId of file.readerFactIds)'));
  assert.match(railCheck, /rail-scroll-stability/);
  assert.match(railCheck, /Rail scroll changed exact selection/);
  assert.ok(!body.slice(body.indexOf('for (const factId of file.readerFactIds)')).includes('rail-scroll-stability'));
  assert.ok(body.includes('await assertNoAdmission(page, baseline)'));
  assert.ok(!elsewhere.includes('createCaseLabelCoverage(files.map'));
  assert.match(elsewhere, /else await checkLabels\(\)/);
});

test('mixed geometry plus source/pin faults remain immediate, including a later label', () => {
  for (const later of [false, true]) {
    const mixed = fixture(); mixed.labels[0].lines[0].width = 110;
    if (later) {
      const b = structuredClone(mixed.labels[0]); b.id = 'b'; b.text = 'Exact B'; b.lines[0].width = 90;
      b.rect.left = 205; b.anchor.x = 256; mixed.labels.push(b); mixed.expectedNodeIds.push('b');
    } else mixed.labels[0].anchor.x = 56;
    const expanded = { ...file, nodes: [...file.nodes, { id: 'b', label: 'Exact B' }] };
    assert.throws(() => validateCaseLabelGeometry(mixed, expanded), error => !(error instanceof CaseLabelGeometryError) && /moved away/.test(error.message));
  }
  const mixed = fixture(); mixed.labels[0].lines[0].width = 110; mixed.labels[0].text = 'changed';
  assert.throws(() => validateCaseLabelGeometry(mixed, file), error => !(error instanceof CaseLabelGeometryError) && /exact full text/.test(error.message));
});
