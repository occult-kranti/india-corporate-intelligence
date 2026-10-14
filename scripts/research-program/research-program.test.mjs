import { test } from 'node:test';
import assert from 'node:assert/strict';
import { schema } from './load.mjs';
const { assembleResearchProgram, filterProgramConnections, findEvidencePaths, programExport, validProgramDate } = schema;
const fixture = () => ({ schemaVersion: 1, sources: [
  { id: 's1', title: 'Synthetic test record', url: 'https://example.org/one', publisher: 'Test publisher', accessedAt: '2026-10-14', sourceType: 'test', accessDepth: 'full-text', supports: 'Synthetic fixture only', limitations: 'Not production evidence', sourceFamily: 'family-one' },
  { id: 's2', title: 'Dependent synthetic record', url: 'https://example.org/two', publisher: 'Test publisher', accessedAt: '2026-10-14', sourceType: 'test', accessDepth: 'search-excerpt', supports: 'Synthetic fixture only', limitations: 'Not production evidence', sourceFamily: 'family-one' },
], entities: ['a', 'b', 'c', 'd'].map(id => ({ id, name: id === 'd' ? 'a' : id, type: 'test', identifiers: [], sourceIds: ['s2'] })), connections: [
  { id: 'ab', from: 'a', to: 'b', relation: 'payment', label: 'Synthetic payment', status: 'documented', sourceIds: ['s1'], summary: 'Fixture', sectorIds: ['finance'], limits: ['Stage limited'], alternativeExplanations: ['Ordinary payment'], falsifier: 'Different identity' },
  { id: 'bc', from: 'b', to: 'c', relation: 'association', label: 'Synthetic association', status: 'hypothesis', sourceIds: ['s2'], summary: 'Fixture', sectorIds: ['energy'], limits: ['Unverified'], alternativeExplanations: ['Independent action'], falsifier: 'No association' },
], leads: [{ id: 'lead', title: 'Synthetic lead', question: 'Fixture question?', sectorIds: ['finance'], sourceIds: ['s1'], neededEvidence: ['Record'], disconfirmingEvidence: ['Counterrecord'], feasibility: 'Test only' }], coverage: [{ sector: 'finance', status: 'partial', inspectedSources: 2, remainingGaps: ['Missing population'] }] });
const assemble = raw => assembleResearchProgram({ 'political-funding.json': raw });

test('valid typed corpus preserves identities, dependent families, read depth and textual-array normalization', () => {
  const input = fixture(); input.connections[0].limits = 'A single text limit'; const program = assemble(input);
  assert.deepEqual(program.errors, []); assert.equal(program.entities.length, 4); assert.equal(program.sources[1].accessDepth, 'search-excerpt');
  assert.equal(new Set(program.sources.map(source => source.sourceFamily)).size, 1);
  assert.deepEqual(program.connections[0].limits, ['A single text limit']);
  assert.equal(findEvidencePaths(program.connections, 'd', 'c').paths.length, 0, 'equal labels never establish identity');
});
test('schema errors fail closed and identify precise fields', () => {
  const changes = [raw => raw.schemaVersion = 9, raw => raw.sources[0].url = 'javascript:alert(1)', raw => raw.sources[0].accessDepth = 'verified', raw => raw.sources[0].accessedAt = '2026-02-30', raw => raw.entities[0].sourceIds = ['missing'], raw => raw.connections[0].to = 'missing', raw => raw.connections[0].status = 'proven-corrupt', raw => raw.connections[0].limits = [], raw => raw.sources.push({ ...raw.sources[0] }), raw => raw.connections[0].dateFrom = 'tomorrow', raw => { raw.connections[0].dateFrom = '2026-02-01'; raw.connections[0].dateTo = '2026-01-01'; }, raw => raw.coverage[0].inspectedSources = -1];
  for (const change of changes) { const raw = fixture(); change(raw); const program = assemble(raw); assert(program.errors.length); assert.equal(program.connections.length, 0); assert.equal(program.sources.length, 0); }
  for (const raw of [null, [], 'bad']) assert(assemble(raw).errors.length);
});
test('amounts retain stage and exact source wording, reject invalid values without inventing stage ordering', () => {
  const raw = fixture(); raw.connections[0].amount = { value: 12.34, exactValue: '12.340', currency: 'INR', unit: 'crore', stage: 'sanctioned', basis: 'Synthetic wording' };
  const program = assemble(raw); assert.deepEqual(program.errors, []); assert.equal(program.connections[0].amount.exactValue, '12.340');
  for (const value of [-1, NaN, Infinity, '12']) { raw.connections[0].amount.value = value; assert(assemble(raw).errors.some(error => error.includes('finite and nonnegative'))); }
});
test('existing registry and worksheet bridges require exact resolved IDs and question bounds', () => {
  const raw = fixture(); raw.entities[0].existingEntityId = 'registry:a'; raw.leads[0].existingCaseId = 'case:a'; raw.leads[0].hypothesisIndex = 1;
  assert(assemble(raw).errors.length);
  const context = { resolvedEntityIds: ['registry:a'], existingCases: [{ id: 'case:a', hypotheses: [{}, {}] }] };
  assert.deepEqual(assembleResearchProgram({ 'political-funding.json': raw }, context).errors, []);
  raw.leads[0].hypothesisIndex = 2; assert(assembleResearchProgram({ 'political-funding.json': raw }, context).errors.some(error => error.includes('crosswalk')));
});
test('filters intersect exact sector/status/type/entity and text search without identity joins', () => {
  const program = assemble(fixture()); assert.deepEqual(filterProgramConnections(program, { sector: 'energy', status: 'hypothesis', entity: 'b', query: 'association' }).map(edge => edge.id), ['bc']);
  assert.equal(filterProgramConnections(program, { entity: 'd' }).length, 0); assert.equal(filterProgramConnections(program, { relation: 'payment', sector: 'energy' }).length, 0);
});
test('paths preserve direction and hypothesis status, allow explicit reverse traversal, reject cycles and cap depth', () => {
  const program = assemble(fixture()); const path = findEvidencePaths(program.connections, 'a', 'c').paths[0];
  assert.deepEqual(path.connectionIds, ['ab', 'bc']); assert.deepEqual(path.reversed, [false, false]); assert.equal(program.connections[1].status, 'hypothesis');
  assert.equal(findEvidencePaths(program.connections, 'c', 'a').paths.length, 0);
  assert.deepEqual(findEvidencePaths(program.connections, 'c', 'a', 'both').paths[0].reversed, [true, true]);
  assert.equal(findEvidencePaths(program.connections, 'a', 'c', 'directed', 1).paths.length, 0);
  assert.equal(findEvidencePaths(program.connections, 'a', 'a').paths.length, 0);
});
test('filtered export closes edge and endpoint citations without including unrelated records', () => {
  const program = assemble(fixture()); const output = programExport(program, [program.connections[0]]);
  assert.deepEqual(output.entities.map(entity => entity.id), ['a', 'b']); assert.deepEqual(output.sources.map(source => source.id), ['s1', 's2']); assert.equal(output.connections.length, 1);
  assert.match(output.boundary, /does not prove causation/); assert.match(output.boundary, /No amounts are aggregated/); assert.equal(output.sources[1].sourceFamily, 'family-one');
});
test('calendar validation rejects impossible dates', () => { assert(validProgramDate('2024-02-29')); assert(!validProgramDate('2025-02-29')); assert(!validProgramDate('October 14, 2026')); });

test('source receipts and read scope survive normalization and export, malformed receipts are rejected', () => {
  const raw = fixture(); Object.assign(raw.sources[0], { accessNotes: 'Selected paragraphs inspected', locator: 'Paragraph 12, note 4', sha256: 'a'.repeat(64), bytes: 1234 });
  const program = assemble(raw); const output = programExport(program, program.connections); assert.equal(output.sources[0].locator, 'Paragraph 12, note 4'); assert.equal(output.sources[0].sha256, 'a'.repeat(64)); assert.equal(output.sources[0].bytes, 1234); assert.equal(output.sources[0].accessNotes, 'Selected paragraphs inspected');
  raw.sources[0].sha256 = 'invalid'; assert(assemble(raw).errors.some(error => error.includes('sha256'))); raw.sources[0].sha256 = 'a'.repeat(64); raw.sources[0].bytes = 1.5; assert(assemble(raw).errors.some(error => error.includes('bytes')));
});
test('partial dates retain source precision and reject only definitively reversed windows', () => {
  const raw = fixture(); raw.connections[0].dateFrom = '2020'; raw.connections[0].dateTo = '2020-04'; assert.deepEqual(assemble(raw).errors, []); assert.equal(assemble(raw).connections[0].dateFrom, '2020');
  raw.connections[0].dateFrom = '2021-01'; assert(assemble(raw).errors.some(error => error.includes('later than'))); assert(!validProgramDate('2020-13')); assert(validProgramDate('2020-04'));
});

test('structured historical evidence retains inference limits and validates nested citations', () => {
  const raw = fixture();
  const record = { id: 'case-history', title: 'Synthetic historical test', sectors: ['test'], mechanism: 'Synthetic mechanism', sourceIds: ['s1'], evidentiaryChain: [{ stage: 'signal', evidence: 'Synthetic record', inferenceAllowed: 'Open a question', inferenceNotAllowed: 'Infer guilt', sourceIds: ['s1'], locator: 'Section 1' }], legalOutcome: { stage: 'test', date: '2020-01-01', subject: 'Synthetic actor', finding: 'Fixture only', limits: ['Actor-specific only'] }, transferableTests: [{ id: 'history-test', status: 'proposed-not-executed', question: 'What would disconfirm?', requiredRecords: ['Counterrecord'], comparator: 'Others', rivalExplanation: 'Ordinary process', falsifier: 'Contrary record', stopRule: 'Hold inference' }], nonTransferableInferences: ['No evidence about current actors'] };
  let program = assembleResearchProgram({ 'political-funding.json': raw, 'proven-cases.json': { schemaVersion: 1, sources: [], cases: [record] } });
  assert.deepEqual(program.errors, []); assert.equal(program.cases[0].evidentiaryChain[0].inferenceNotAllowed, 'Infer guilt'); assert.equal(program.cases[0].transferableTests[0].stopRule, 'Hold inference'); assert.equal(program.cases[0].legalOutcome.limits, 'Actor-specific only');
  record.evidentiaryChain[0].sourceIds = ['s2']; program = assembleResearchProgram({ 'political-funding.json': raw, 'proven-cases.json': { schemaVersion: 1, sources: [], cases: [record] } }); assert(program.errors.some(error => error.includes('not declared by this case'))); assert.equal(program.cases.length, 0);
});
