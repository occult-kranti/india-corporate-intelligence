#!/usr/bin/env node
/** Independent integrity/accounting gate for the curated education desk. No network required. */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

export function validateEducationData(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return ['Dataset: object required'];
  const errors = [];
  const check = (condition, message) => { if (!condition) errors.push(message); };
  const enums = {
    channels: ['government', 'csr', 'ngo', 'foreign', 'multilateral', 'private'],
    managements: ['government', 'aided', 'private'], levels: ['school', 'college'],
  };
  const sets = {};
  const names = ['states', 'localities', 'sources', 'programs', 'flows', 'schoolSeries', 'leads'];
  for (const name of names) check(Array.isArray(data[name]) && data[name].every(row => row && typeof row === 'object' && !Array.isArray(row)), `${name}: array of records required`);
  if (errors.length) return errors;
  for (const name of ['sources', 'programs', 'flows', 'leads']) for (const row of data[name]) {
    for (const field of ['stateCodes', 'localityIds', 'channels', 'managements', 'levels']) check(Array.isArray(row[field]) && row[field].every(value => typeof value === 'string'), `${row.id}: ${field} string array required`);
    if (name !== 'sources') check(Array.isArray(row.sourceIds) && row.sourceIds.every(value => typeof value === 'string'), `${row.id}: sourceIds string array required`);
    const notes = name === 'sources' || name === 'flows' ? 'limitations' : name === 'programs' ? 'constraints' : 'alternativeExplanations';
    check(Array.isArray(row[notes]) && row[notes].every(value => typeof value === 'string'), `${row.id}: ${notes} string array required`);
  }
  for (const row of data.schoolSeries) {
    check(Array.isArray(row.points) && row.points.every(point => point && typeof point === 'object'), `${row.id}: points array required`);
    check(Array.isArray(row.sourceIds) && row.sourceIds.every(value => typeof value === 'string'), `${row.id}: sourceIds string array required`);
  }
  if (errors.length) return errors;
  check(/^\d{4}-\d{2}-\d{2}$/.test(data.updatedAt), 'Dataset: dated snapshot required');
  for (const name of names) {
    check(Array.isArray(data[name]), `${name}: array required`);
    const keys = (data[name] ?? []).map(row => name === 'states' ? row.code : row.id);
    check(keys.every(key => typeof key === 'string' && key.length > 0), `${name}: empty id`);
    check(new Set(keys).size === keys.length, `${name}: duplicate id`);
    sets[name] = new Set(keys);
  }
  check(data.states.length === 36, 'Geography: expected all 36 states and union territories');
  const expectedStates = 'AN AP AR AS BR CH CG DN DL GA GJ HR HP JK JH KA KL LA LD MP MH MN ML MZ NL OD PY PB RJ SK TN TS TR UP UK WB'.split(' ');
  check(expectedStates.every(code => sets.states.has(code)), 'Geography: state/UT codes do not match the complete registry');
  for (const row of data.localities) {
    check(['city', 'district'].includes(row.kind), `${row.id}: locality kind must be explicit`);
    check(sets.states.has(row.stateCode), `${row.id}: unknown locality state`);
  }
  const bySource = new Map(data.sources.map(row => [row.id, row]));
  const byPlace = new Map(data.localities.map(row => [row.id, row]));
  const byFlow = new Map(data.flows.map(row => [row.id, row]));
  for (const name of ['sources', 'programs', 'flows', 'leads']) for (const row of data[name]) {
    check(typeof row.title === 'string' && row.title.trim(), `${row.id}: title required`);
    check(typeof row.summary === 'string' && row.summary.trim(), `${row.id}: summary required`);
    check(['national', 'state', 'multi-state', 'district', 'city'].includes(row.scope), `${row.id}: invalid scope`);
    check(row.stateCodes.every(code => sets.states.has(code)), `${row.id}: unknown state code`);
    check(row.localityIds.every(id => sets.localities.has(id)), `${row.id}: unknown locality id`);
    check(row.localityIds.every(id => row.stateCodes.includes(byPlace.get(id)?.stateCode)), `${row.id}: locality outside declared states`);
    if (['state', 'multi-state', 'city', 'district'].includes(row.scope)) check(row.stateCodes.length > 0, `${row.id}: local scope has no states`);
    if (['city', 'district'].includes(row.scope)) check(row.localityIds.some(id => byPlace.get(id)?.kind === row.scope), `${row.id}: local scope lacks matching locality kind`);
    for (const [key, allowed] of Object.entries(enums)) {
      check(row[key].length > 0 && row[key].every(value => allowed.includes(value)), `${row.id}: invalid ${key}`);
      check(new Set(row[key]).size === row[key].length, `${row.id}: repeated ${key}`);
    }
    if (name !== 'sources') check(row.sourceIds.length > 0 && row.sourceIds.every(id => bySource.has(id)), `${row.id}: missing or unknown source`);
  }
  for (const row of data.sources) {
    let url;
    try { url = new URL(row.url); } catch { /* reported below */ }
    check(url?.protocol === 'https:' && !url.username && !url.password, `${row.id}: a direct https source URL is required`);
    check(typeof row.publisher === 'string' && row.publisher.trim(), `${row.id}: publisher required`);
    check(['primary', 'reported', 'self-reported'].includes(row.tier), `${row.id}: invalid source tier`);
    check(['document', 'portal', 'news', 'dataset'].includes(row.type), `${row.id}: invalid source type`);
    check(row.publishedAt === null || /^\d{4}-\d{2}(?:-\d{2})?$/.test(row.publishedAt), `${row.id}: invalid publication date precision`);
    check(/^\d{4}-\d{2}-\d{2}$/.test(row.retrievedAt), `${row.id}: retrieval date required`);
    check(row.publishedAt === null || row.publishedAt <= row.retrievedAt, `${row.id}: publication after retrieval`);
    check(row.retrievedAt <= data.updatedAt, `${row.id}: retrieval after dataset snapshot`);
    check(row.period?.trim(), `${row.id}: reference period required`);
    check(row.limitations.length > 0, `${row.id}: source limitations required`);
    if (row.type === 'news') check(row.tier === 'reported', `${row.id}: news must remain reported`);
    if (/404/.test(row.retrievalStatus ?? '')) check(row.limitations.some(text => /404/.test(text)), `${row.id}: unavailable original must be disclosed`);
  }
  for (const row of data.programs) check(row.constraints.length > 0, `${row.id}: eligibility constraints required`);
  for (const row of data.flows) {
    check(Number.isFinite(row.amount) && row.amount >= 0, `${row.id}: amount must be finite and non-negative`);
    check(['INR', 'USD'].includes(row.currency), `${row.id}: currency required`);
    check(['crore', 'million', 'lakh', 'rupees'].includes(row.unit), `${row.id}: unit required`);
    check(['allocation', 'release', 'receipt', 'expenditure', 'outlay', 'commitment', 'reimbursement'].includes(row.stage), `${row.id}: funding stage required`);
    check(row.period?.trim() && row.limitations.length > 0, `${row.id}: fiscal period and limitations required`);
    if (row.includedInFlowId) {
      const parent = byFlow.get(row.includedInFlowId);
      check(parent && parent.id !== row.id, `${row.id}: invalid included-in reference`);
      check(parent && parent.currency === row.currency && parent.unit === row.unit && parent.amount >= row.amount, `${row.id}: invalid nested monetary amount`);
      const visited = new Set([row.id]);
      let ancestor = parent;
      while (ancestor?.includedInFlowId) {
        if (visited.has(ancestor.id)) { errors.push(`${row.id}: cyclic monetary envelope`); break; }
        visited.add(ancestor.id); ancestor = byFlow.get(ancestor.includedInFlowId);
      }
    }
  }
  const series = data.schoolSeries;
  const national = series.find(row => row.stateCode === 'IN' && !row.localityId);
  const stateSeries = series.filter(row => row.stateCode !== 'IN' && !row.localityId);
  const upDistricts = series.filter(row => row.stateCode === 'UP' && row.localityId);
  check(national && stateSeries.length === 36 && new Set(stateSeries.map(row => row.stateCode)).size === 36, 'School series: national plus all 36 states/UTs required');
  check(upDistricts.length === 75, 'School series: all 75 UP districts required');
  for (const row of series) {
    check(row.stateCode === 'IN' || sets.states.has(row.stateCode), `${row.id}: unknown school-series state`);
    check(!row.localityId || byPlace.get(row.localityId)?.kind === 'district', `${row.id}: district series cannot be labeled a city`);
    check(row.management === 'government' && row.level === 'school' && row.unit === 'schools', `${row.id}: count grain changed`);
    check(row.sourceIds.length > 0 && row.sourceIds.every(id => bySource.has(id)), `${row.id}: unknown series source`);
    check(row.points.length === 5 && new Set(row.points.map(point => point.year)).size === 5, `${row.id}: five unique annual observations required`);
    check(row.points.every(point => ['2021-22', '2022-23', '2023-24', '2024-25', '2025-26'].includes(point.year) && Number.isSafeInteger(point.value) && point.value >= 0), `${row.id}: invalid school-count observation`);
    check(!('closureCount' in row) || row.closureCount === null, `${row.id}: stock observations cannot be closure counts`);
  }
  for (const point of national?.points ?? []) {
    check(stateSeries.every(row => row.points.some(p => p.year === point.year)), `${point.year}: missing state observation`);
    check(stateSeries.reduce((sum, row) => sum + (row.points.find(p => p.year === point.year)?.value ?? NaN), 0) === point.value, `${point.year}: state totals do not reconcile to India`);
    const up = stateSeries.find(row => row.stateCode === 'UP')?.points.find(p => p.year === point.year)?.value;
    check(upDistricts.reduce((sum, row) => sum + (row.points.find(p => p.year === point.year)?.value ?? NaN), 0) === up, `${point.year}: district totals do not reconcile to UP`);
  }
  for (const row of data.leads) {
    check(['investigate', 'context'].includes(row.status), `${row.id}: invalid lead status`);
    check(row.alternativeExplanations.length > 0 && row.falsifier?.trim() && row.signal?.trim(), `${row.id}: signal, alternatives and falsifier required`);
  }
  return errors;
}

export function validateRawReconciliation(data, raw) {
  const errors = [];
  for (const row of [...raw.schoolCounts, ...raw.districtCounts]) {
    const candidate = data.schoolSeries.find(series => series.name === (row.geography === 'INDIA' ? 'India' : row.geography) && Boolean(series.localityId) === (row.geographicLevel === 'District'));
    if (!candidate || Object.entries(row.counts).some(([year, value]) => candidate.points.find(point => point.year === year)?.value !== value)) errors.push(`${row.geography}: curated school series differs from retained extraction`);
  }
  for (const row of raw.fundingRecords) {
    for (const [stage, key] of [['allocation', 'approvedCentral'], ['release', 'releasedCentral']]) if (data.flows.find(flow => flow.id === `${row.id}-${stage}`)?.amount !== row[key]) errors.push(`${row.id}: ${stage} differs from retained extraction`);
    if (Math.abs(row.approvedCentral - row.releasedCentral - row.approvedMinusReleased) > 0.00001) errors.push(`${row.id}: funding difference does not reconcile`);
  }
  for (const row of raw.rteFundingRecords ?? []) for (const [stage, key] of [['allocation', 'sanctioned'], ['reimbursement', 'reimbursedToSchools']]) if (data.flows.find(flow => flow.id === `${row.id}-${stage}`)?.amount !== row[key]) errors.push(`${row.id}: ${stage} differs from retained extraction`);
  return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const read = file => JSON.parse(readFileSync(`${root}${file}`, 'utf8'));
  const data = read('src/data/education-research.json');
  const raw = read('research/raw/education/public-research.json');
  const errors = [...validateEducationData(data), ...validateRawReconciliation(data, raw)];
  const manifest = read('research/raw/education/evidence/download-manifest.json');
  for (const entry of manifest.filter(row => row.sha256)) {
    const bytes = readFileSync(`${root}research/raw/education/evidence/${entry.id}.pdf`);
    if (createHash('sha256').update(bytes).digest('hex') !== entry.sha256) errors.push(`${entry.id}: archived source SHA-256 mismatch`);
  }
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else console.log(`Education integrity passed: ${data.sources.length} sources; ${data.schoolSeries.length} series / 560 values; ${data.flows.length} stage-separated monetary observations; 3 archived PDF hashes verified.`);
}
