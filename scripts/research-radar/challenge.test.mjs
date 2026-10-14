import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { buildForecastRegistry, scoreForecasts, validateTemporalSplit } from './forecast.mjs';

const raw = ['north', 'west', 'south-east', 'national'].map(region => JSON.parse(readFileSync(`research/raw/research-radar/${region}.json`, 'utf8')));
const actualCases = raw.flatMap(region => region.cases);

test('Actual retained cases have no numerical prediction or resolved outcome', () => {
  assert(actualCases.length > 0);
  const registry = buildForecastRegistry(actualCases, '2026-10-07');
  assert.equal(registry.length, actualCases.length);
  for (const row of registry) {
    assert.equal(row.probability, null, row.id);
    assert.equal(row.outcome, null, row.id);
    assert.equal(row.status, 'unknown', row.id);
    assert.equal(row.forecastStatus, 'untrained-uncalibrated', row.id);
    assert.deepEqual(row.resolutionSourceIds, [], row.id);
  }
});

test('Every actual edge has cited endpoints and never turns office oversight into a payment', () => {
  for (const row of actualCases) {
    const ids = new Set(row.entities.map(entity => entity.id));
    const sourceIds = new Set(raw.flatMap(region => region.sources.map(source => source.id)));
    for (const link of row.links) {
      assert(ids.has(link.from) && ids.has(link.to), `${row.id}/${link.id}`);
      assert(link.sourceIds.length && link.sourceIds.every(id => sourceIds.has(id)), `${row.id}/${link.id}`);
      if (link.kind === 'payment') {
        assert(!/\b(?:oversight|responsibility|ministerial role|supervises)\b/i.test(link.label), `Misrepresented oversight as cash: ${link.id}`);
      }
    }
  }
});

// All numbers below are deliberately synthetic mathematical fixtures. They are
// not fitted forecasts, research facts or empirical product accuracy estimates.
const fixture = (id, probability, outcome) => ({
  id, targetType: 'institutional-outcome', probability, outcome, status: 'resolved',
  predictedAt: '2026-01-01', latestFeatureAt: '2025-12-31', evaluationAt: '2026-02-01',
  outcomeObservedAt: '2026-02-01', resolvedAt: '2026-02-03', resolutionSourceIds: ['synthetic-math-fixture'],
});

test('Synthetic math: Brier and log loss independently match hand calculations', () => {
  const rows = [fixture('positive', 0.8, 1), fixture('negative', 0.25, 0)];
  const scored = scoreForecasts(rows, { asOf: '2026-03-01', bins: 2 });
  assert.equal(scored.eligible, 2);
  assert(Math.abs(scored.brier - ((0.2 ** 2 + 0.25 ** 2) / 2)) < 1e-12);
  assert(Math.abs(scored.logLoss - (-(Math.log(0.8) + Math.log(0.75)) / 2)) < 1e-12);
  assert.equal(scored.reliability[0].count, 1);
  assert.equal(scored.reliability[0].observedFrequency, 0);
  assert.equal(scored.reliability[1].count, 1);
  assert.equal(scored.reliability[1].observedFrequency, 1);
});

test('Synthetic math: unknown and censored outcomes remain excluded, never negative labels', () => {
  const unknown = { ...fixture('unknown', 0.8, 1), status: 'unknown', outcome: null, outcomeObservedAt: null, resolvedAt: null, resolutionSourceIds: [] };
  const censored = { ...unknown, id: 'censored', status: 'censored' };
  const result = scoreForecasts([unknown, censored], { asOf: '2026-03-01' });
  assert.equal(result.eligible, 0);
  assert.equal(result.brier, null);
  assert.equal(result.logLoss, null);
  assert.deepEqual(result.excluded, { unknown: 1, censored: 1 });
  assert(result.reliability.every(bin => bin.count === 0 && bin.meanForecast === null && bin.observedFrequency === null));
  assert.throws(() => scoreForecasts([{ ...unknown, outcome: 0 }], { asOf: '2026-03-01' }));
});

test('Synthetic timing: later reporting, features, missing citations and premature negatives are rejected', () => {
  const row = fixture('timing', 0.5, 0);
  for (const changed of [
    { ...row, latestFeatureAt: '2026-01-02' },
    { ...row, outcomeObservedAt: '2026-01-15' },
    { ...row, resolvedAt: '2026-03-02' },
    { ...row, resolvedAt: '2026-01-30' },
    { ...row, resolutionSourceIds: [] },
    { ...row, targetType: 'personal-guilt' },
  ]) assert.throws(() => scoreForecasts([changed], { asOf: '2026-03-01' }));
});

test('Synthetic math: wrong absolute certainty incurs infinite log loss and probability one has a final bin', () => {
  const score = scoreForecasts([fixture('wrong', 1, 0)], { asOf: '2026-03-01', bins: 10 });
  assert.equal(score.brier, 1);
  assert.equal(score.logLoss, Infinity);
  assert.equal(score.reliability[9].count, 1);
  assert.equal(score.reliability[9].meanForecast, 1);
});

test('Synthetic split: time-separated entity groups pass only necessary timestamp gates', () => {
  const train = [{ id: 'training', entityGroup: 'legal-entity-A', predictedAt: '2025-01-02', featureAvailableAt: '2025-01-01', outcomeObservedAt: '2025-05-31', outcomeAvailableAt: '2025-06-01' }];
  const evaluation = [{ id: 'held-out', entityGroup: 'legal-entity-B', predictedAt: '2026-01-01', featureAvailableAt: '2025-12-31', outcomeObservedAt: '2026-02-01', outcomeAvailableAt: '2026-02-03' }];
  const input = { train, evaluation, cutoff: '2025-12-01', asOf: '2026-03-01' };
  assert.equal(validateTemporalSplit(input).valid, true);
  assert.match(validateTemporalSplit(input).interpretation, /does not establish/);
  for (const changed of [
    { ...input, evaluation: [{ ...evaluation[0], entityGroup: 'legal-entity-A' }] },
    { ...input, train: [{ ...train[0], outcomeAvailableAt: '2025-12-02' }] },
    { ...input, train: [{ ...train[0], featureAvailableAt: '2025-06-01' }] },
    { ...input, train: [{ ...train[0], outcomeAvailableAt: '2025-04-01' }] },
    { ...input, evaluation: [{ ...evaluation[0], predictedAt: '2025-11-30' }] },
    { ...input, evaluation: [{ ...evaluation[0], featureAvailableAt: '2026-01-02' }] },
    { ...input, evaluation: [{ ...evaluation[0], outcomeAvailableAt: '2026-04-01' }] },
    { ...input, evaluation: [{ ...evaluation[0], id: 'training' }] },
  ]) assert.equal(validateTemporalSplit(changed).valid, false);
});
