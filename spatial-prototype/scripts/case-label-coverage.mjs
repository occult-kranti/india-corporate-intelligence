import assert from 'node:assert/strict';

/** Only explicitly tagged presentation failures may be collected. */
export class CaseLabelGeometryError extends assert.AssertionError {
  constructor(message) {
    super({ message, actual: false, expected: true, operator: '==' });
    this.name = 'CaseLabelGeometryError';
  }
}
export function assertReadableGeometry(condition, message) {
  if (!condition) throw new CaseLabelGeometryError(message);
}

/** Scenario-local, bounded to the exact expected case/phase matrix. No runtime API. */
export function createCaseLabelCoverage(caseIds, captureFailure) {
  assert.ok(Array.isArray(caseIds) && caseIds.length === 19 && new Set(caseIds).size === 19, 'Expected exactly 19 unique case IDs');
  assert.ok(caseIds.every(id => typeof id === 'string' && id));
  assert.equal(typeof captureFailure, 'function');
  const requiredPhases = ['initial', 'selected-node', 'selected-edge'];
  const phasesFor = caseId => [...requiredPhases,
    ...(['case:usa-musk', 'case:public-office%2Findia-modi'].includes(caseId) ? ['selected-edge-after-source-dialog'] : []),
    ...(caseId === 'case:usa-musk' ? ['selected-edge-forced-colors', 'selected-edge-restored-colors'] : [])];
  const expected = new Set(caseIds), observations = [], failures = [];
  return {
    observations, failures,
    async observe(caseId, phase, check) {
      assert.ok(expected.has(caseId), `Unexpected geometry case ${caseId}`);
      assert.ok(phasesFor(caseId).includes(phase), `Unexpected geometry phase ${phase}`);
      assert.ok(!observations.some(row => row.caseId === caseId && row.phase === phase), `Duplicate geometry checkpoint ${caseId}:${phase}`);
      assert.equal(typeof check, 'function');
      const row = { caseId, phase, status: 'checking' }; observations.push(row);
      try {
        const receipt = await check(); row.status = 'passed'; return receipt;
      } catch (error) {
        if (!(error instanceof CaseLabelGeometryError)) throw error;
        row.status = 'failed';
        const failure = { caseId, phase, name: error.name, message: error.message, stack: error.stack };
        failures.push(failure);
        // Capture happens at the exact failed selection, before the next action.
        // A capture error propagates and cannot erase the original failure row.
        failure.capture = await captureFailure(failure);
        return null;
      }
    },
    finish(completedCaseIds) {
      assert.deepEqual(completedCaseIds, caseIds, 'All 19 exact cases must complete in retained order');
      for (const caseId of caseIds) for (const phase of phasesFor(caseId)) {
        const rows = observations.filter(row => row.caseId === caseId && row.phase === phase);
        assert.equal(rows.length, 1, `Missing exact geometry checkpoint ${caseId}:${phase}`);
        assert.ok(['passed', 'failed'].includes(rows[0].status), `Incomplete geometry checkpoint ${caseId}:${phase}`);
      }
      assert.equal(failures.length, 0, `Label geometry failures remain (${failures.length}): ${failures.map(row => `${row.caseId}:${row.phase}: ${row.message}`).join('; ')}`);
      assert.equal(observations.length, caseIds.reduce((sum, id) => sum + phasesFor(id).length, 0), 'Unexpected geometry checkpoint count');
      assert.ok(observations.every(row => row.status === 'passed'), 'Every exact geometry checkpoint must pass');
      return { cases: caseIds.length, checkpoints: observations.length, geometryFailures: 0 };
    },
  };
}
