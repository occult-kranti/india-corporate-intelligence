/** Evaluation infrastructure only. No production probabilities are generated here. */
export const FORECAST_STATUS = 'untrained-uncalibrated';
export const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const requireDate = (value, label) => { if (!validDate(value)) throw new Error(`${label}: valid ISO calendar date required`); };
const requireId = (value, label) => { if (typeof value !== 'string' || !value.trim()) throw new Error(`${label}: nonempty identity required`); };
export const daysBetween = (start, end) => (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000;

export function buildForecastRegistry(cases, cutoff) {
  requireDate(cutoff, 'cutoff');
  return cases.map(row => {
    const scenario = row.scenario;
    if (scenario.probability !== null) throw new Error(`${row.id}: probability requires independent future calibration, unavailable in this registry`);
    requireDate(scenario.evaluationAt, `${row.id}.evaluationAt`);
    if (scenario.evaluationAt <= cutoff || daysBetween(cutoff, scenario.evaluationAt) !== scenario.horizonDays) throw new Error(`${row.id}: evaluation date/horizon inconsistent with cutoff`);
    return { id: row.id, targetType: 'institutional-outcome', target: scenario.target, registeredAt: cutoff, evaluationAt: scenario.evaluationAt, horizonDays: scenario.horizonDays, status: 'unknown', outcome: null, probability: null, forecastStatus: FORECAST_STATUS, baseline: scenario.baseline, triggers: scenario.triggers, alternatives: scenario.alternatives, falsifiers: scenario.falsifiers, requiredData: scenario.requiredData, sourceIds: row.sourceIds, resolutionSourceIds: [], outcomeObservedAt: null, resolvedAt: null };
  });
}

/** Inputs must be prospectively timestamped institutional outcomes; unknowns are never zeroes. */
export function scoreForecasts(rows, { asOf, bins = 10 } = {}) {
  requireDate(asOf, 'asOf');
  if (!Number.isInteger(bins) || bins < 1 || bins > 100) throw new Error('bins must be an integer from 1 through 100');
  const seen = new Set(), eligible = [], excluded = { unknown: 0, censored: 0 };
  for (const row of rows) {
    requireId(row.id, 'row.id');
    if (seen.has(row.id)) throw new Error(`${row.id}: duplicate target`);
    seen.add(row.id);
    if (row.targetType !== 'institutional-outcome') throw new Error(`${row.id}: only institutional-outcome targets accepted`);
    if (!Number.isFinite(row.probability) || row.probability < 0 || row.probability > 1) throw new Error(`${row.id}: forecast probability outside [0,1]`);
    for (const field of ['predictedAt', 'evaluationAt', 'latestFeatureAt']) requireDate(row[field], `${row.id}.${field}`);
    if (row.latestFeatureAt > row.predictedAt) throw new Error(`${row.id}: feature availability after prediction is temporal leakage`);
    if (row.predictedAt >= row.evaluationAt || row.predictedAt > asOf) throw new Error(`${row.id}: prediction must precede evaluation and be known by asOf`);
    if (row.status === 'unknown' || row.status === 'censored') {
      if (row.outcome !== null || row.resolvedAt != null || row.outcomeObservedAt != null || row.resolutionSourceIds?.length) throw new Error(`${row.id}: unresolved/censored rows cannot carry a resolved label`);
      excluded[row.status]++;
      continue;
    }
    if (row.status !== 'resolved' || ![0, 1].includes(row.outcome)) throw new Error(`${row.id}: resolved binary outcome required`);
    requireDate(row.resolvedAt, `${row.id}.resolvedAt`);
    requireDate(row.outcomeObservedAt, `${row.id}.outcomeObservedAt`);
    if (row.outcomeObservedAt <= row.predictedAt || row.outcomeObservedAt > row.evaluationAt || row.resolvedAt < row.outcomeObservedAt || row.resolvedAt > asOf) throw new Error(`${row.id}: resolution/event timing inconsistent with prediction, horizon or asOf`);
    if (row.outcome === 0 && row.outcomeObservedAt < row.evaluationAt) throw new Error(`${row.id}: absence cannot resolve before the observation window ends`);
    if (!Array.isArray(row.resolutionSourceIds) || !row.resolutionSourceIds.length || row.resolutionSourceIds.some(id => typeof id !== 'string' || !id.trim())) throw new Error(`${row.id}: resolution requires documentary provenance`);
    eligible.push(row);
  }
  const brier = eligible.length ? eligible.reduce((sum, row) => sum + (row.probability - row.outcome) ** 2, 0) / eligible.length : null;
  const logLoss = eligible.length ? eligible.reduce((sum, row) => sum - Math.log(row.outcome === 1 ? row.probability : 1 - row.probability), 0) / eligible.length : null;
  const reliability = Array.from({ length: bins }, (_, index) => {
    const members = eligible.filter(row => Math.min(bins - 1, Math.floor(row.probability * bins)) === index);
    return { lower: index / bins, upper: (index + 1) / bins, count: members.length, meanForecast: members.length ? members.reduce((sum, row) => sum + row.probability, 0) / members.length : null, observedFrequency: members.length ? members.reduce((sum, row) => sum + row.outcome, 0) / members.length : null };
  });
  return { asOf, total: rows.length, eligible: eligible.length, excluded, brier, logLoss, logLossStatus: logLoss === null ? 'unscored' : Number.isFinite(logLoss) ? 'finite' : 'infinite', reliability, interpretation: 'Scores evaluate supplied predictions only. Brier mixes calibration, discrimination and uncertainty; bin frequencies and source counts are not individual guilt probabilities. Wrong certainty has infinite log loss; no clipping is applied.' };
}

/** Calendar proof uses feature availability and outcome reporting dates, never event dates alone. */
export function validateTemporalSplit({ train, evaluation, cutoff, asOf }) {
  const errors = [];
  if (!validDate(cutoff) || !validDate(asOf) || cutoff >= asOf) errors.push('Temporal cutoff must be a valid date before asOf');
  const trainGroups = new Set(), ids = new Set();
  for (const row of train) {
    if (!row.id || ids.has(row.id)) errors.push(`Training identity missing or duplicate: ${row.id}`);
    ids.add(row.id);
    if (!row.entityGroup) errors.push(`${row.id}: entityGroup required`);
    trainGroups.add(row.entityGroup);
    if (!validDate(row.featureAvailableAt) || row.featureAvailableAt > cutoff) errors.push(`${row.id}: training feature not available by cutoff`);
    if (!validDate(row.outcomeAvailableAt) || row.outcomeAvailableAt > cutoff) errors.push(`${row.id}: training outcome not available by cutoff`);
    if (!validDate(row.predictedAt) || row.predictedAt > cutoff) errors.push(`${row.id}: historical training prediction date required before cutoff`);
    if (validDate(row.featureAvailableAt) && validDate(row.predictedAt) && row.featureAvailableAt > row.predictedAt) errors.push(`${row.id}: training feature unavailable at its historical prediction time`);
    if (!validDate(row.outcomeObservedAt) || row.outcomeObservedAt <= row.predictedAt || row.outcomeObservedAt > row.outcomeAvailableAt) errors.push(`${row.id}: training outcome must follow historical prediction and precede reporting`);
  }
  for (const row of evaluation) {
    if (!row.id || ids.has(row.id)) errors.push(`Evaluation identity missing, duplicate or reused: ${row.id}`);
    ids.add(row.id);
    if (!row.entityGroup || trainGroups.has(row.entityGroup)) errors.push(`${row.id}: entity group missing or overlaps training`);
    if (!validDate(row.predictedAt) || row.predictedAt <= cutoff || row.predictedAt > asOf) errors.push(`${row.id}: evaluation prediction outside held-out time interval`);
    if (!validDate(row.featureAvailableAt) || row.featureAvailableAt > row.predictedAt) errors.push(`${row.id}: evaluation feature unavailable at prediction`);
    if (row.outcomeAvailableAt != null && (!validDate(row.outcomeAvailableAt) || row.outcomeAvailableAt <= row.predictedAt || row.outcomeAvailableAt > asOf)) errors.push(`${row.id}: evaluation outcome availability invalid`);
    if (row.outcomeAvailableAt != null && (!validDate(row.outcomeObservedAt) || row.outcomeObservedAt <= row.predictedAt || row.outcomeObservedAt > row.outcomeAvailableAt)) errors.push(`${row.id}: evaluation outcome must follow prediction and precede reporting`);
    if (row.outcomeAvailableAt == null && row.outcomeObservedAt != null) errors.push(`${row.id}: unreported evaluation outcome cannot supply a training label`);
  }
  if (!train.length || !evaluation.length) errors.push('Nonempty train and evaluation populations required');
  return { valid: errors.length === 0, errors, trainCount: train.length, evaluationCount: evaluation.length, interpretation: 'Necessary timestamp and entity-group gates only; this does not establish representative sampling, baseline superiority, empirical calibration or fairness.' };
}
