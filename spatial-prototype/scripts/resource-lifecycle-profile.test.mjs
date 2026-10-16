/** Portable mocked CDP lifecycle tests; never imports or launches Playwright. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { createResourceLifecycleProfile, resourcePhaseSnapshot, RESOURCE_DIAGNOSTIC_SCENARIO,
  RESOURCE_PROFILE_INTERVAL_US, RESOURCE_PROFILE_COMMAND_TIMEOUT_MS, RESOURCE_MAX_PHASE_ROWS } from './resource-lifecycle-profile.mjs';

const fakeProfile = { nodes: [{ id: 1, callFrame: { functionName: 'MOCK_ONLY', scriptId: '0', url: '', lineNumber: 0, columnNumber: 0 } }],
  startTime: 100, endTime: 200, samples: [1], timeDeltas: [100] };
async function fixture(fn, { fail, hang } = {}) {
  const output = await mkdtemp(join(tmpdir(), 'resource-profile-portable-'));
  const calls = [], result = { name: RESOURCE_DIAGNOSTIC_SCENARIO, status: 'running' };
  const session = { async send(name, args) {
    calls.push([name, args]);
    if (name === fail) throw new Error(`MOCK ${name} failed`);
    if (name === hang) return new Promise(() => {});
    return name === 'Profiler.stop' ? { profile: fakeProfile } : {};
  }, async detach() { calls.push(['detach']); } };
  const context = { async newCDPSession(page) { calls.push(['attach', page]); return session; } };
  try { await fn({ output, calls, result, context, read: name => readFile(join(output, name), 'utf8') }); }
  finally { await rm(output, { recursive: true, force: true }); }
}
const stem = `${RESOURCE_DIAGNOSTIC_SCENARIO}.cpu`;

test('profile uses fixed 1000 µs interval before start, then stop/persist/detach exactly once', async () => {
  assert.equal(RESOURCE_PROFILE_INTERVAL_US, 1000); assert.equal(RESOURCE_PROFILE_COMMAND_TIMEOUT_MS, 15000);
  assert.equal(RESOURCE_MAX_PHASE_ROWS, 360);
  await fixture(async ({ output, calls, result, context, read }) => {
    const profiler = createResourceLifecycleProfile({ output, result });
    await profiler.start(context, 'MOCK_PAGE');
    await assert.rejects(profiler.start(context, 'SECOND_PAGE'), /exactly once/);
    result.status = 'passed';
    const a = profiler.stop(), b = profiler.stop(); assert.equal(a, b);
    const metadata = await a;
    assert.deepEqual(calls, [['attach', 'MOCK_PAGE'], ['Profiler.enable', undefined],
      ['Profiler.setSamplingInterval', { interval: 1000 }], ['Profiler.start', undefined], ['Profiler.stop', undefined], ['detach']]);
    assert.deepEqual(JSON.parse(await read(`${stem}.cpuprofile`)), fakeProfile);
    assert.equal(metadata.status, 'retained'); assert.equal(metadata.sampleCount, 1);
    assert.equal(metadata.fullSuiteAcceptance, false); assert.equal(metadata.diagnosticOnly, true);
    assert.equal(metadata.scenarioStatus, 'passed');
    assert.equal(JSON.parse(await read(`${stem}.metadata.json`)).profileSha256, metadata.profileSha256);
  });
});

test('scenario deadline failure still retains profile with final failure and completed progress', async () => {
  await fixture(async ({ output, result, context, read }) => {
    const profiler = createResourceLifecycleProfile({ output, result });
    await profiler.start(context, 'MOCK_PAGE');
    Object.assign(result, { status: 'failed', error: 'Scenario exceeded its 300000 ms review budget',
      caseResourceWarmups: [{}, {}, {}], caseResourceCycles: [{}, {}],
      caseResourceObservationChecks: [{ phase: 'warmed-baseline', status: 'passed' }] });
    const metadata = await profiler.stop();
    assert.equal(metadata.status, 'retained'); assert.match(metadata.scenarioError, /300000/);
    assert.match(metadata.scenarioWorkCancellation, /uncancelled/);
    assert.match(metadata.limitations.join(' '), /after the 300-second deadline are diagnostic only/);
    assert.equal(metadata.profileStartTimeUs, 100); assert.equal(metadata.profileEndTimeUs, 200);
    assert.ok(metadata.startRequestedMonotonicMs <= metadata.startAcknowledgedMonotonicMs);
    assert.ok(metadata.stopRequestedMonotonicMs <= metadata.stopAcknowledgedMonotonicMs);
    const rows = (await read(`${stem}.phases.jsonl`)).trim().split('\n').map(JSON.parse);
    assert.deepEqual(rows.map(row => row.reason), ['before-navigation', 'scenario-finally']);
    assert.equal(rows.at(-1).completedMeasuredCycles, 2); assert.equal(rows.at(-1).scenarioStatus, 'failed');
    assert.ok(rows.at(-1).elapsedMs >= rows[0].elapsedMs);
  });
});

test('bounded read-only progress snapshots do not change result arrays or inspect a browser', async () => {
  const result = Object.freeze({ status: 'running', caseResourceCycles: Object.freeze([1, 2]),
    caseResourceObservationChecks: Object.freeze([Object.freeze({ phase: 'cycle-1-closed', status: 'passed' })]) });
  assert.equal(resourcePhaseSnapshot(result).completedMeasuredCycles, 2);
  assert.equal(resourcePhaseSnapshot(result).latestCheckpoint, 'cycle-1-closed');
  await fixture(async ({ output, result, context, read }) => {
    const profiler = createResourceLifecycleProfile({ output, result, phaseIntervalMs: 1 });
    await profiler.start(context, 'MOCK_PAGE'); await delay(12); await profiler.stop();
    const rows = (await read(`${stem}.phases.jsonl`)).trim().split('\n').map(JSON.parse);
    assert.ok(rows.length > 2 && rows.length <= RESOURCE_MAX_PHASE_ROWS);
    assert.ok(rows.some(row => row.reason === 'counter-snapshot'));
  });
});

for (const fail of ['Profiler.enable', 'Profiler.setSamplingInterval', 'Profiler.start']) {
  test(`startup ${fail} failure remains failed with metadata and session cleanup`, async () => {
    await fixture(async ({ output, result, context, calls, read }) => {
      const profiler = createResourceLifecycleProfile({ output, result });
      await assert.rejects(profiler.start(context, 'MOCK_PAGE'), /MOCK/);
      await assert.rejects(profiler.stop(), /not retained/);
      assert.equal(calls.at(-1)[0], 'detach');
      assert.equal(JSON.parse(await read(`${stem}.metadata.json`)).status, 'incomplete');
      assert.ok(!(await readdir(output)).includes(`${stem}.cpuprofile`));
    }, { fail });
  });
}

test('unresponsive stop is bounded, detached and recorded as incomplete; no success claimed', async () => {
  await fixture(async ({ output, result, context, calls, read }) => {
    const profiler = createResourceLifecycleProfile({ output, result, commandTimeoutMs: 20 });
    await profiler.start(context, 'MOCK_PAGE');
    await assert.rejects(profiler.stop(), /Profiler.stop exceeded 20 ms/);
    const metadata = JSON.parse(await read(`${stem}.metadata.json`));
    assert.equal(metadata.status, 'incomplete'); assert.equal(calls.at(-1)[0], 'detach');
  }, { hang: 'Profiler.stop' });
});

test('only exact scenario 46 can construct the CPU profiler', () => {
  assert.throws(() => createResourceLifecycleProfile({ output: '/tmp', result: { name: '40-other' } }), /scenario 46 only/);
});
