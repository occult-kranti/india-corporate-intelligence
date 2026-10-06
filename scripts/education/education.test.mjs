import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { validateEducationData, validateRawReconciliation } from './validate.mjs';

// Node 20-compatible: execute the real TypeScript module using the repository's compiler.
// Only its static JSON import is replaced; selectors/guards are not duplicated in tests.
const data = JSON.parse(readFileSync(new URL('../../src/data/education-research.json', import.meta.url), 'utf8'));
const raw = JSON.parse(readFileSync(new URL('../../research/raw/education/public-research.json', import.meta.url), 'utf8'));
const source = readFileSync(new URL('../../src/data/education.ts', import.meta.url), 'utf8')
  .replace("import research from './education-research.json';", `const research = ${JSON.stringify(data)};`);
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ES2020 } }).outputText;
const education = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const clone = value => structuredClone(value);

test('curated records pass provenance, dimensions, stage, locality and reconciliation gates', () => {
  assert.deepEqual(validateEducationData(data), []);
  assert.deepEqual(validateRawReconciliation(data, raw), []);
  assert.equal(data.states.length, 36);
  assert.equal(data.schoolSeries.length, 112);
  assert.equal(data.schoolSeries.flatMap(row => row.points).length, 560);
});

test('validator rejects duplicate IDs, broken provenance, unsupported currency and geography errors', () => {
  const broken = clone(data);
  broken.sources[1].id = broken.sources[0].id;
  broken.flows[0].sourceIds = ['invented-document'];
  broken.flows[1].currency = 'unknown';
  broken.leads[0].stateCodes = ['KA']; // the locality is in Uttar Pradesh
  const errors = validateEducationData(broken);
  assert.ok(errors.some(error => /duplicate id/.test(error)));
  assert.ok(errors.some(error => /missing or unknown source/.test(error)));
  assert.ok(errors.some(error => /currency required/.test(error)));
  assert.ok(errors.some(error => /locality outside/.test(error)));
});

test('malformed collection shapes fail validation rather than bypassing required fields', () => {
  assert.deepEqual(validateEducationData(null), ['Dataset: object required']);
  const broken = clone(data); delete broken.flows[0].sourceIds;
  assert.ok(validateEducationData(broken).some(error => /sourceIds string array required/.test(error)));
  broken.flows = {};
  assert.ok(validateEducationData(broken).some(error => /array of records required/.test(error)));
});

test('national and district control totals detect a changed school count', () => {
  const broken = clone(data);
  broken.schoolSeries.find(row => row.stateCode === 'UP' && row.localityId).points[0].value += 1;
  assert.ok(validateEducationData(broken).some(error => /district totals do not reconcile/.test(error)));
  assert.ok(validateRawReconciliation(broken, raw).some(error => /differs from retained extraction/.test(error)));
});

test('news remains reported and unavailable original-document status must be visible', () => {
  const broken = clone(data);
  broken.sources.find(row => row.type === 'news').tier = 'primary';
  broken.sources.find(row => row.id === 'samagra-cg-pab-2025').limitations = ['Version differs.'];
  const errors = validateEducationData(broken);
  assert.ok(errors.some(error => /news must remain reported/.test(error)));
  assert.ok(errors.some(error => /unavailable original/.test(error)));
});

test('nested monetary components stay within their parent amount and cannot form cycles', () => {
  const broken = clone(data);
  const part = broken.flows.find(row => row.id === 'merite-cabinet-amount-2');
  assert.equal(part.amount, 2100);
  assert.equal(part.includedInFlowId, 'merite-cabinet-amount-1');
  part.amount = 4201;
  assert.ok(validateEducationData(broken).some(error => /invalid nested monetary amount/.test(error)));
  part.amount = 2100;
  broken.flows.find(row => row.id === part.includedInFlowId).includedInFlowId = part.id;
  assert.ok(validateEducationData(broken).some(error => /cyclic monetary envelope/.test(error)));
});

test('government contributions do not turn into CSR or foreign-grant amounts through filtering', () => {
  const governmentReceipt = data.flows.find(row => row.id === 'akshaya-patra-annual-2025-amount-1');
  assert.equal(governmentReceipt.unit, 'lakh');
  assert.equal(governmentReceipt.amount, 42093.64);
  assert.ok(education.getEducationFlows({ channel: 'government' }).some(row => row.id === governmentReceipt.id));
  assert.ok(!education.getEducationFlows({ channel: 'csr' }).some(row => row.id === governmentReceipt.id));
  assert.ok(!education.getEducationFlows({ channel: 'foreign' }).some(row => row.id === governmentReceipt.id));
});

test('Karnataka private-school reimbursement remains state-level and distinct from sanctions', () => {
  const rows = education.getEducationFlows({ stateCode: 'KA', management: 'private' }).filter(row => row.id.startsWith('ka-rte-'));
  assert.equal(rows.length, 10);
  assert.ok(rows.every(row => row.scope === 'state' && row.localityIds.length === 0));
  assert.equal(rows.find(row => row.id === 'ka-rte-2024-25-allocation').amount, 200);
  assert.equal(rows.find(row => row.id === 'ka-rte-2024-25-reimbursement').amount, 85.11);
});

test('state selection includes labeled national context but excludes other states’ local reports', () => {
  const rows = education.getEducationSources({ stateCode: 'KA' });
  assert.ok(rows.some(row => row.id === 'mca-csr-data' && row.scope === 'national'));
  assert.ok(rows.some(row => row.id === 'karnataka-pilot-news'));
  assert.ok(!rows.some(row => row.id === 'up-pairing-revision-news'));
  assert.deepEqual(education.getEducationSources({ stateCode: 'NOT-A-STATE' }), []);
  assert.deepEqual(education.getEducationSources({ localityId: 'invented-city' }), []);
});

test('city, topic and dimension filters intersect, and an unknown city does not inherit national coverage', () => {
  assert.ok(education.getEducationSources({ place: 'Hyderabad', channel: 'foreign', management: 'private' }).some(row => row.id === 'lighthouse-kkr-psp-2025'));
  assert.ok(education.getEducationSources({ stateCode: 'TS', q: 'Lighthouse' }).length > 0);
  assert.deepEqual(education.getEducationSources({ place: 'Fictional City Zero', q: 'education' }), []);
  assert.deepEqual(education.getEducationSources({ place: 'Hyderabad', q: 'Samagra', management: 'government' }), []);
  assert.ok(education.getEducationSources({ place: '  GHAZIABAD  ', q: 'school' }).some(row => row.id === 'ls-school-counts-2026'));
});

test('place and locality-id filters require explicit same-state geography, not topic or publisher text', () => {
  for (const place of ['school', 'Private']) {
    assert.deepEqual(education.getEducationSources({ place }), []);
    assert.deepEqual(education.getEducationFlows({ place }), []);
  }
  assert.ok(!education.getEducationSources({ place: 'Mumbai' }).some(row => row.id === 'pratham-annual-2025'));
  assert.deepEqual(education.getEducationSources({ stateCode: 'KA', place: 'Hyderabad' }), []);
  assert.deepEqual(education.getEducationSources({ stateCode: 'KA', place: 'Ghaziabad' }), []);
  const local = education.getEducationSources({ localityId: 'district-UP-ghaziabad' });
  assert.ok(local.some(row => row.id === 'ls-school-counts-2026'));
  assert.ok(!local.some(row => row.id === 'mca-csr-data'));
  assert.deepEqual(education.getEducationSources({ stateCode: 'KA', localityId: 'district-UP-ghaziabad' }), []);
  assert.deepEqual(education.getEducationSchoolSeries({ place: 'India' }), []);
});

test('school series distinguish districts from cities and do not fill in private or college counts', () => {
  const rows = education.getEducationSchoolSeries({ stateCode: 'UP', place: 'Ghaziabad' });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].localityId, 'district-UP-ghaziabad');
  assert.deepEqual(education.getEducationSchoolSeries({ stateCode: 'KA', place: 'Bengaluru' }), []);
  assert.deepEqual(education.getEducationSchoolSeries({ management: 'private' }), []);
  assert.deepEqual(education.getEducationSchoolSeries({ level: 'college' }), []);
});

test('school stocks report a net count change, never an inferred closure count', () => {
  const series = data.schoolSeries.find(row => row.localityId === 'district-UP-ghaziabad');
  const result = education.getSchoolCountChange(series);
  assert.equal(result.first.value, 504);
  assert.equal(result.last.value, 474);
  assert.equal(result.change, -30);
  assert.equal(result.closureCount, null);
  assert.match(result.label, /reported school count/);
  const reversed = { ...series, points: [...series.points].reverse() };
  assert.deepEqual(education.getSchoolCountChange(reversed), result);
  assert.deepEqual(series.points.map(point => point.year), ['2021-22','2022-23','2023-24','2024-25','2025-26']);
});

test('count changes reject missing/duplicate/invalid observations and keep a zero-baseline percentage unknown', () => {
  const base = data.schoolSeries[0];
  assert.equal(education.getSchoolCountChange({ ...base, points: [] }), null);
  assert.equal(education.getSchoolCountChange({ ...base, points: [{year:'2021-22',value:1},{year:'2021-22',value:0}] }), null);
  assert.equal(education.getSchoolCountChange({ ...base, points: [{year:'2021-22',value:NaN},{year:'2025-26',value:0}] }), null);
  assert.equal(education.getSchoolCountChange({ ...base, points: [{year:'2021-22',value:0},{year:'2025-26',value:2}] }).percentage, null);
});

function comparison() {
  return {
    school: { geographyId: 'district-UP-ghaziabad', ageBand: '6-14', startYear: '2021-22', endYear: '2025-26', startCount: 504, endCount: 474, boundaryVersion: 'fixture-2021', sourceIds: ['ls-school-counts-2026'], startManagement: 'government', endManagement: 'government', startLevel: 'school', endLevel: 'school' },
    population: { geographyId: 'district-UP-ghaziabad', ageBand: '6-14', startYear: '2021-22', endYear: '2025-26', startCount: 1000, endCount: 1200, boundaryVersion: 'fixture-2021', sourceIds: ['population-projections-2020'], basis: 'observed' },
  };
}

test('comparison guards missing population, sources, age-specific demand, boundaries, time and categories', () => {
  const missing = comparison(); delete missing.population;
  assert.equal(education.assessPopulationComparison(missing).comparable, false);
  const invalidCases = [
    input => { input.school.sourceIds = []; },
    input => { input.population.sourceIds = []; },
    input => { input.population.sourceIds = ['unverified-id']; },
    input => { input.population.geographyId = 'city-UP-ghaziabad'; },
    input => { input.school.geographyId = input.population.geographyId = ' '; },
    input => { input.school.ageBand = input.population.ageBand = 'all-ages'; },
    input => { input.school.ageBand = input.population.ageBand = 'school-system'; },
    input => { input.population.ageBand = '18-23'; },
    input => { input.population.boundaryVersion = 'redrawn-2025'; },
    input => { input.population.startYear = '2011'; },
    input => { input.school.endYear = input.population.endYear = '2025-99'; },
    input => { input.school.startYear = input.population.startYear = '2021'; input.school.endYear = input.population.endYear = '2021-22'; },
    input => { input.school.endManagement = 'aided'; },
    input => { input.school.endLevel = 'college'; },
    input => { input.population.endCount = NaN; },
    input => { input.population.endCount = -1; },
    input => { input.population.basis = 'projected'; },
    input => { input.population.basis = undefined; },
  ];
  for (const mutate of invalidCases) {
    const input = comparison(); mutate(input);
    const result = education.assessPopulationComparison(input);
    assert.equal(result.comparable, false, JSON.stringify(input));
    assert.equal(result.signal, false);
    assert.ok(result.reasons.length > 0);
  }
});

test('even a fully aligned hypothetical comparison creates only a review signal', () => {
  // Synthetic observed-population fixture registered solely for this pure-function test.
  // The actual shipped dataset has no aligned observed population series.
  const fixtureId = 'test-observed-population';
  education.EDUCATION_SOURCES.push({ ...data.sources[0], id: fixtureId, title: 'Synthetic observed age-specific population fixture' });
  try {
    const input = comparison(); input.population.sourceIds = [fixtureId];
    const result = education.assessPopulationComparison(input);
    assert.equal(result.comparable, true);
    assert.equal(result.signal, true);
    assert.match(result.conclusion, /not a closure count or a finding of misconduct/);
    input.population.endCount = input.population.startCount;
    assert.equal(education.assessPopulationComparison(input).signal, false);
  } finally { education.EDUCATION_SOURCES.pop(); }
});

test('CSV quoting preserves commas/newlines and neutralizes spreadsheet formula injection', () => {
  assert.equal(education.educationCsvCell('a,"b"\nnext'), '"a,""b""\nnext"');
  assert.equal(education.educationCsvCell('=HYPERLINK("bad")'), '"\'=HYPERLINK(""bad"")"');
  assert.equal(education.educationCsvCell('\t+1'), '"\'\t+1"');
  assert.equal(education.educationCsvCell(null), '""');
});
