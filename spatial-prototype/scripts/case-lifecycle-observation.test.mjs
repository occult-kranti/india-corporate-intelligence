/** Portable observation contracts only. These mocks do not establish WebGL acceptance. */
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { compactLifecycleObservation, caseLifecycleObservationInitSource } from './case-lifecycle-observation.mjs';
import { RESOURCE_KINDS, assertLifecycleObservationParity, assertTerminalNativeState } from './case-graphics-browser.mjs';

function fixture() {
  const identity = { contextId: 1, rendererId: 2, canvasId: 3 };
  const draw = { sequence: 12, three: true, shaderKind: 'three', contextId: 1, rendererId: 2, casePass: null, nativeSucceeded: true,
    geographicWorkspaceActive: false, semanticWorkspaceCount: 0, drawFramebuffer: null, viewport: [0, 0, 1440, 1000], buffer: [1440, 1000], scissorTest: false };
  const pass = (id, type) => ({ id, contextId: 1, rendererId: 2, type, entryObserved: true, terminalRestoreObserved: true, changes: [], logicalChanges: [],
    before: { retained: id }, after: { retained: id }, draws: [{ ...draw, sequence: id + 1, casePass: id, shaderKind: type === 'scene' ? 'felt' : 'composite' }] });
  const counts = Object.fromEntries(RESOURCE_KINDS.map(kind => [kind, 1]));
  const context = { id: 1, canvasId: 3, live: counts, created: { ...counts }, deleted: Object.fromEntries(RESOURCE_KINDS.map(kind => [kind, 0])),
    caseLive: 0, totalDraws: 10, hostDraws: 8, caseDraws: 2, scenePasses: 2, compositePasses: 2, hostBoundaryViolationCount: 0, hostLeaseViolationCount: 0,
    hostBoundaryViolations: [], hostLeaseViolations: [], restorationErrors: [], faultEvents: [], pendingPass: null, poisoned: null, postPoisonThreeDraws: 0,
    passes: [pass(1,'scene'), pass(3,'composite'), pass(5,'scene'), pass(7,'composite')],
    draws: [{ ...draw, sequence: 10, three: false, shaderKind: 'maplibre' }, { ...draw, sequence: 11, casePass: 7, shaderKind: 'composite' }, draw], passTimes: [{ type: 'scene', startedAt: 1, durationMs: 2 }] };
  const full = { sequence: 12, allPasses: 4, contexts: [context], renderers: [{ id: 2, contextId: 1, canvasId: 3 }], canvasCount: 1, errors: [], events: [], frameTimes: [] };
  const recovery = { identity, watermark: 11, hostDrawsBefore: 7, boundaryViolationsBefore: 0, activeLeaseViolationsBefore: 0 };
  return { full, recovery, pair: { full, compact: compactLifecycleObservation(full), active: 'false', workspaceCount: 0 } };
}
test('serialized helper captures one full instant, preserves read(), and projects before transport', () => {
  const { full } = fixture(); let reads = 0;
  const originalRead = () => { reads++; return full; };
  const sandbox = { window: { __caseGraphicsProbe: { read: originalRead } } };
  vm.createContext(sandbox); vm.runInContext(caseLifecycleObservationInitSource(), sandbox);
  const probe = sandbox.window.__caseGraphicsProbe;
  assert.equal(probe.read, originalRead);
  const pair = probe.readLifecyclePair(); assert.equal(reads, 1); assert.equal(pair.full, full);
  assert.deepEqual(JSON.parse(JSON.stringify(pair.compact)), compactLifecycleObservation(full));
  assert.deepEqual(JSON.parse(JSON.stringify(probe.readLifecycle())), compactLifecycleObservation(full)); assert.equal(reads, 2);
  assert.throws(() => vm.runInContext(caseLifecycleObservationInitSource(), sandbox), /original unmodified native probe/);
  assert.throws(() => vm.runInNewContext(caseLifecycleObservationInitSource(), { window: {} }), /original unmodified native probe/);
});
test('same-data full-versus-compact checkpoint keeps exact recovery oracle and full latest layouts', () => {
  const { pair, recovery } = fixture();
  assert.equal(assertLifecycleObservationParity(pair, { recovery }).recoveryDraws, 1);
  assert.deepEqual(pair.compact.contexts[0].passes.slice(-2), pair.full.contexts[0].passes.slice(-2));
  assert.equal(pair.compact.contexts[0].passes.length, 4);
});
test('every resource kind and identity/counter mismatch fails the independent checkpoint', () => {
  for (const kind of RESOURCE_KINDS) for (const count of ['live','created','deleted']) {
    const { pair, recovery } = fixture(); pair.compact = structuredClone(pair.compact); pair.compact.contexts[0][count][kind]++;
    assert.throws(() => assertLifecycleObservationParity(pair, { recovery }));
  }
  for (const mutate of [p => { p.sequence++; }, p => { p.canvasCount++; }, p => { p.renderers[0].id++; }, p => { p.contexts[0].caseLive++; },
    p => { p.contexts[0].hostBoundaryViolationCount++; }, p => { p.contexts[0].hostLeaseViolationCount++; }, p => { p.contexts[0].postPoisonThreeDraws++; },
    p => { p.contexts[0].passes.shift(); }, p => { p.contexts[0].draws = []; }]) {
    const { pair } = fixture(); pair.compact = structuredClone(pair.compact); mutate(pair.compact);
    assert.throws(() => assertLifecycleObservationParity(pair));
  }
});
test('projection preserves historical failures and every invalid geographic attempt', () => {
  for (const mutate of [d => { d.contexts[0].passes[0].entryObserved = false; }, d => { d.contexts[0].passes[0].terminalRestoreObserved = false; },
    d => { d.contexts[0].passes[0].changes.push('VIEWPORT'); }, d => { d.contexts[0].passes[0].logicalChanges.push('target'); },
    d => { d.contexts[0].poisoned = { sequence: 1 }; d.contexts[0].postPoisonThreeDraws = 1; }]) {
    const { full } = fixture(); mutate(full); assert.throws(() => assertTerminalNativeState(full)); assert.throws(() => assertTerminalNativeState(compactLifecycleObservation(full)));
  }
  for (const mutate of [d => { d.nativeSucceeded = false; }, d => { d.shaderKind = 'composite'; }, d => { d.geographicWorkspaceActive = true; },
    d => { d.semanticWorkspaceCount = 1; }, d => { d.drawFramebuffer = 99; }, d => { d.scissorTest = true; }, d => { d.viewport = [0,0,1,1]; }]) {
    const { full, recovery } = fixture(); mutate(full.contexts[0].draws.at(-1));
    assert.equal(compactLifecycleObservation(full).contexts[0].draws.length, 1, 'A failed draw attempt must not be filtered out');
    assert.throws(() => assertLifecycleObservationParity({ full, compact: compactLifecycleObservation(full), active: 'false', workspaceCount: 0 }, { recovery }));
  }
});
test('retired and poisoned context observations are retained, not folded into current context', () => {
  const { full } = fixture(); const retired = structuredClone(full.contexts[0]); retired.id = 4; retired.canvasId = 5; full.contexts.unshift(retired);
  full.renderers.unshift({ id: 6, contextId: 4, canvasId: 5 });
  const baseline = { identity: { contextId: 4, rendererId: 6, canvasId: 5 }, hostDraws: retired.hostDraws, hostLeaseViolationCount: 0 };
  assert.doesNotThrow(() => assertLifecycleObservationParity({ full, compact: compactLifecycleObservation(full) }, { retiredBaselines: [baseline] }));
  retired.hostDraws++;
  assert.throws(() => assertLifecycleObservationParity({ full, compact: compactLifecycleObservation(full) }, { retiredBaselines: [baseline] }));
});
test('scenario46 retains counts/budget/actions and full raw checkpoint/final evidence routes', async () => {
  const source = await readFile(new URL('./case-graphics-browser.mjs', import.meta.url), 'utf8');
  const lifecycle = source.slice(source.indexOf('await run(GRAPHICS_SCENARIOS[7]'), source.indexOf('coverage.scenarios ='));
  assert.match(lifecycle, /reducedMotion: true, budgetMs: 240000/);
  assert.match(lifecycle, /index <= 3/); assert.match(lifecycle, /index <= 30/); assert.match(lifecycle, /assertHandlePlateau\(baseline, result\.caseResourceCycles\)/);
  assert.match(lifecycle, /await frames\(page, 3\)/); assert.match(lifecycle, /frames\(120, true\)/);
  assert.match(lifecycle, /await showCompleteCaseReader\(page, until\); await showCaseScene\(page, until\);/);
  for (const phase of ['warmed-baseline','timing-active','timing-closed']) assert.ok(lifecycle.includes(`checkpoint('${phase}'`));
  assert.match(lifecycle, /checkpoint\(`cycle-\$\{number\}-before-close`\)/); assert.match(lifecycle, /checkpoint\(`cycle-\$\{number\}-closed`, result\.caseGeographicRecovery\.at\(-1\)\)/);
  assert.match(lifecycle, /readLifecyclePair\(\)/); assert.match(lifecycle, /JSON\.stringify\(pair\.full, null, 2\)/);
  assert.match(lifecycle, /finally \{ lifecycleObservationPages\.delete\(page\); \}/);
  assert.match(source, /name === GRAPHICS_SCENARIOS\[7\] \? '\\n' \+ caseLifecycleObservationInitSource\(\)/);
  const preservation = source.slice(source.indexOf('afterScenario: async'), source.indexOf('} }, async (page, result)'));
  assert.match(preservation, /const data = await fullProbe\(page\)/); assert.doesNotMatch(preservation, /await probe\(page\)/);
  assert.match(source, /const terminal = await fullProbe\(page\)/);
  assert.doesNotMatch(source, /chromium\.launch|launchPersistentContext|\.waitForTimeout\(/);
});

test('paired active-lease checkpoint preserves suppression and refuses stale baselines', () => {
  const { pair } = fixture(); pair.active = 'true'; pair.workspaceCount = 1;
  const activeBaseline = { identity: { contextId: 1, rendererId: 2, canvasId: 3 }, hostDraws: 8, hostLeaseViolationCount: 0, sequence: 11 };
  assert.doesNotThrow(() => assertLifecycleObservationParity(pair, { activeBaseline }));
  for (const mutate of [p => { p.active = 'false'; }, p => { p.workspaceCount = 0; }]) {
    const changed = structuredClone(pair); mutate(changed); assert.throws(() => assertLifecycleObservationParity(changed, { activeBaseline }));
  }
  assert.throws(() => assertLifecycleObservationParity(pair, { activeBaseline: { ...activeBaseline, hostDraws: 7 } }));
});
