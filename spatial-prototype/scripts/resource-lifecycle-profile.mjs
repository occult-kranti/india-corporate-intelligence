/** Diagnostic-only CDP CPU sampling. No browser launcher and no application writes.
 * Samples the page main-thread isolate, not GPU execution, all renderer threads,
 * or production performance. A killed/crashed process may prevent final stop. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { appendFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export const RESOURCE_PROFILE_INTERVAL_US = 1000;
export const RESOURCE_PHASE_INTERVAL_MS = 1000;
export const RESOURCE_PROFILE_COMMAND_TIMEOUT_MS = 15000;
export const RESOURCE_MAX_PHASE_ROWS = 360;
export const RESOURCE_DIAGNOSTIC_SCENARIO = '46-thirty-cycle-native-resource-handle-plateau';

/** Read only the harness's already-produced progress. Never call the page/probe.
 * Counter snapshots locate progress; they are not exact browser phase boundaries. */
export function resourcePhaseSnapshot(result) {
  const checkpoints = result.caseResourceObservationChecks ?? [];
  return {
    scenarioStatus: result.status,
    completedWarmups: result.caseResourceWarmups?.length ?? 0,
    completedMeasuredCycles: result.caseResourceCycles?.length ?? 0,
    completedCheckpointCount: checkpoints.filter(row => row.status === 'passed').length,
    latestCheckpoint: checkpoints.at(-1)?.phase ?? null,
    latestCheckpointStatus: checkpoints.at(-1)?.status ?? null,
    timingSummaryAvailable: Boolean(result.caseTiming),
  };
}

export function createResourceLifecycleProfile({ output, result, revision = {},
  commandTimeoutMs = RESOURCE_PROFILE_COMMAND_TIMEOUT_MS,
  phaseIntervalMs = RESOURCE_PHASE_INTERVAL_MS } = {}) {
  assert.equal(result?.name, RESOURCE_DIAGNOSTIC_SCENARIO, 'CPU diagnostic is scoped to scenario 46 only');
  assert.ok(output && typeof output === 'string');
  assert.ok(Number.isSafeInteger(commandTimeoutMs) && commandTimeoutMs > 0);
  assert.ok(Number.isSafeInteger(phaseIntervalMs) && phaseIntervalMs > 0);
  const stem = `${RESOURCE_DIAGNOSTIC_SCENARIO}.cpu`;
  const profileFile = `${stem}.cpuprofile`, phaseFile = `${stem}.phases.jsonl`, metadataFile = `${stem}.metadata.json`;
  const metadata = { schemaVersion: 1, diagnosticOnly: true, fullSuiteAcceptance: false,
    scenario: result.name, revision, samplingIntervalUs: RESOURCE_PROFILE_INTERVAL_US,
    nodePerformanceTimeOriginMs: performance.timeOrigin, createdAtMonotonicMs: performance.now(),
    phaseIntervalMs, maxPhaseRows: RESOURCE_MAX_PHASE_ROWS, commandTimeoutMs,
    profileFile, phaseFile, status: 'not-started', phaseRows: 0, errors: [],
    limitations: ['Page main-thread V8 CPU samples only; GPU/native renderer and other threads are not profiled.',
      'Sampling and the existing native probes perturb timing; not a hardware benchmark or full-suite acceptance.',
      'Phase metadata reads existing Node harness counters once per second, not exact browser phase boundaries.',
      'Scenario timeout still requests profile stop/preservation before native dumps, screenshots, traces and page close.',
      'The original Promise.race does not cancel scenario work. Work can continue while Profiler.stop is pending; samples after the 300-second deadline are diagnostic only.',
      'Runner cancellation, process death, browser crash or an unresponsive CDP stop can leave an incomplete profile.'] };
  let session, started = false, attempted = false, timer, stopPromise, phaseWrites = Promise.resolve();
  const startMonotonicMs = performance.now();
  const persist = () => writeFile(join(output, metadataFile), JSON.stringify(metadata, null, 2) + '\n');
  const sample = reason => {
    if (metadata.phaseRows >= RESOURCE_MAX_PHASE_ROWS) { metadata.phaseRowsCapped = true; return; }
    const row = { reason, at: new Date().toISOString(), elapsedMs: performance.now() - startMonotonicMs, ...resourcePhaseSnapshot(result) };
    metadata.phaseRows++;
    phaseWrites = phaseWrites.then(() => appendFile(join(output, phaseFile), JSON.stringify(row) + '\n'))
      .catch(error => { metadata.errors.push(`Phase persistence: ${error.message}`); });
  };
  async function bounded(operation, action) {
    let deadline;
    try {
      return await Promise.race([Promise.resolve().then(action), new Promise((_, reject) => {
        deadline = setTimeout(() => reject(new Error(`${operation} exceeded ${commandTimeoutMs} ms`)), commandTimeoutMs);
      })]);
    } finally { clearTimeout(deadline); }
  }
  async function stop() {
    clearInterval(timer);
    sample('scenario-finally');
    metadata.stopRequestedAt = new Date().toISOString();
    metadata.stopRequestedMonotonicMs = performance.now();
    metadata.scenarioDeadline = result.resourceDiagnosticDeadline ?? null;
    metadata.scenarioWorkCancellation = 'Original Promise.race work is uncancelled; late samples are diagnostic only';
    metadata.scenarioStatus = result.status;
    metadata.scenarioError = result.error ?? null;
    try {
      if (!started) throw new Error('CPU profiler never started; no CPU evidence is claimed');
      const stopped = await bounded('Profiler.stop', () => session.send('Profiler.stop'));
      metadata.stopAcknowledgedAt = new Date().toISOString();
      metadata.stopAcknowledgedMonotonicMs = performance.now();
      assert.ok(stopped?.profile && Array.isArray(stopped.profile.nodes), 'CDP returned no CPU profile');
      const text = JSON.stringify(stopped.profile) + '\n';
      await writeFile(join(output, profileFile), text);
      metadata.profileBytes = Buffer.byteLength(text);
      metadata.profileSha256 = createHash('sha256').update(text).digest('hex');
      metadata.profileStartTimeUs = stopped.profile.startTime;
      metadata.profileEndTimeUs = stopped.profile.endTime;
      metadata.sampleCount = stopped.profile.samples?.length ?? 0;
      metadata.nodeCount = stopped.profile.nodes.length;
      metadata.status = 'retained';
    } catch (error) {
      metadata.status = 'incomplete';
      metadata.errors.push(error.message);
    } finally {
      if (session) {
        try { await bounded('CDP detach', () => session.detach()); }
        catch (error) { metadata.errors.push(error.message); }
      }
      await phaseWrites;
      metadata.finishedAt = new Date().toISOString();
      await persist();
    }
    assert.equal(metadata.status, 'retained', `Required diagnostic CPU profile was not retained: ${metadata.errors.join('; ')}`);
    assert.deepEqual(metadata.errors, [], 'Diagnostic CPU profile or phase persistence was incomplete');
    return { ...metadata };
  }
  return {
    async start(context, page) {
      assert.equal(attempted, false, 'CPU profiler must be started exactly once');
      attempted = true;
      metadata.startedAt = new Date().toISOString();
      metadata.status = 'starting';
      await persist();
      try {
        session = await bounded('CDP attach', () => context.newCDPSession(page));
        await bounded('Profiler.enable', () => session.send('Profiler.enable'));
        await bounded('Profiler.setSamplingInterval', () => session.send('Profiler.setSamplingInterval', { interval: RESOURCE_PROFILE_INTERVAL_US }));
        metadata.startRequestedAt = new Date().toISOString();
        metadata.startRequestedMonotonicMs = performance.now();
        await bounded('Profiler.start', () => session.send('Profiler.start'));
        started = true;
        metadata.startAcknowledgedAt = new Date().toISOString();
        metadata.startAcknowledgedMonotonicMs = performance.now();
        metadata.status = 'running';
        sample('before-navigation');
        timer = setInterval(() => sample('counter-snapshot'), phaseIntervalMs);
        timer.unref?.();
        await persist();
      } catch (error) {
        metadata.errors.push(error.message);
        await persist();
        throw error;
      }
    },
    stop() { return stopPromise ??= stop(); },
  };
}
