import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { build } from 'esbuild';
import { REVIEW_DATE, TRACKS, RESEARCH_ROOT, validateStream, validateAll } from './validate.mjs';

const copy = value => structuredClone(value);
function fixture(track = 'political-finance') {
  const prefix = `hl:${track}:`, sourceId = `${prefix}source`, a = `${prefix}authority`, b = `${prefix}recipient`;
  const sourceIds = [sourceId];
  return {
    schemaVersion: 1, track, reviewDate: REVIEW_DATE, scope: 'Synthetic validator fixture; no claim about a real institution.',
    searchLog: [{ query: 'Synthetic source', requestedResults: 1, date: REVIEW_DATE }],
    sources: [{ id: sourceId, title: 'Synthetic original', publisher: 'Fixture', url: 'https://example.org/record', publishedAt: '2024-01-01', accessedAt: REVIEW_DATE, kind: 'original', sourceFamily: 'fixture', inspection: 'Fixture only', locator: 'Section 1', excerpt: 'No real-world finding.', limitations: ['Synthetic test material.'], capturePath: null, sha256: null }],
    entities: [a, b].map(id => ({ id, label: id, kind: 'institution', identityBasis: 'Synthetic exact identity', resolved: true, sourceIds })),
    edges: [{ id: `${prefix}recorded`, from: a, to: b, relation: 'rule', label: 'Authority issued a rule', status: 'documented', stage: 'rule issued, no payment', date: '2024-01-01', amount: null, sourceIds, response: 'Fixture response', limits: ['A rule is not a transfer.'] }],
    cases: [{ id: `${prefix}case`, title: 'Synthetic decision file', question: 'Which interpretation fits the records?', sector: 'governance', period: '2024', status: 'unresolved', finding: 'Open structural question.', geography: [{ label: 'Delhi', stateCode: 'DL', basis: 'Authority only' }], entityIds: [a, b], edgeIds: [`${prefix}recorded`], sourceIds,
      claims: [{ id: `${prefix}claim`, text: 'The source records a rule.', status: 'documented', sourceIds, response: 'No allocation is established.', alternative: 'Routine administration.', falsifier: 'The original order differs.', missingRecords: ['Decision file.'] }],
      whatWeKnow: ['Rule issued.'], whatWeDoNotKnow: ['Private intent.'], limits: ['No guilt inference.'], nextRecords: [{ record: 'Decision file', holder: 'Authority', purpose: 'Compare rationale' }],
      decisionAnalysis: { decisionDate: '2024-01-01', actors: [{ entityId: a, authority: 'Issue a rule', incentive: 'Deliver the stated service', evidenceSourceIds: sourceIds }], informationThen: [{ text: 'Published rules', sourceIds }], options: [{ label: 'Open competition', expectedObservableOutcome: 'Multiple qualified offers', sourceIds }, { label: 'Existing framework', expectedObservableOutcome: 'Published framework order', sourceIds }], observedOutcome: 'A rule was published.', sourceIds, hindsightLimits: ['Retrospective reconstruction.'] },
      hypothesis: { proposition: 'Did the rule alter access?', assessment: 'open', assessmentReason: 'Eligibility records are missing.', jurisdiction: 'Synthetic Union institution', rules: [{ title: 'Fixture rule', operativePeriod: '2024', requirement: 'Publish eligibility', sourceIds }], alternatives: ['coordination', 'lawful', 'measurement'].map(label => ({ id: `${prefix}alternative-${label}`, label, explanation: `Unproved ${label} explanation`, discriminatingRecord: 'Eligibility ledger' })), tests: ['eligibility', 'comparison'].map(label => ({ id: `${prefix}test-${label}`, question: `Compare ${label}?`, expectedIfTrue: 'Stable differential access', expectedIfAlternative: 'Equal eligibility', observation: 'No matched ledger inspected', result: 'unresolved', sourceIds, nextRecord: 'Eligibility ledger', holder: 'Authority' })), proposedLinks: [{ id: `${prefix}question`, from: b, to: a, question: 'Was the eligibility decision independently reviewed?', missingEvidence: 'Review records', disconfirmingEvidence: 'Complete independent review', sourceIds }], chronology: [{ date: '2024-01-01', event: 'Rule issued', knowledge: 'contemporaneous', sourceIds }, { date: '2025-01-01', event: 'Later review', knowledge: 'later-outcome', sourceIds }], comparison: 'Compare all eligible institutions, including non-recipients.', nextReview: '2027-01-01', inferenceLimits: ['Retrospective, not preregistered.'] },
    }],
    coverage: [{ institution: 'Fixture', jurisdiction: 'Union', period: '2024', status: 'selected-records', sourceIds, gap: 'Incomplete ledger', nextRecord: 'Decision file' }],
    rejectedJoins: [{ from: a, to: b, proposed: 'A payment occurred', reason: 'Rule does not establish payment', sourceIds }],
    roadmap: [{ phase: 'Verify', task: 'Read the ledger', deliverable: 'Matched comparison', acceptance: 'Source-closed finding' }],
  };
}

test('a structurally complete synthetic fixture passes without a real-world finding', () => assert.deepEqual(validateStream(fixture(), { verifyCaptures: false }), []));
const invalid = [
  ['unknown nested rule citation', value => { value.cases[0].hypothesis.rules[0].sourceIds.push('absent'); }, /unknown reference absent/u],
  ['unknown nested actor citation', value => { value.cases[0].decisionAnalysis.actors[0].evidenceSourceIds.push('absent'); }, /unknown reference absent/u],
  ['missing decision actor from case', value => { value.cases[0].decisionAnalysis.actors[0].entityId = 'absent'; }, /outside this case/u],
  ['question endpoint outside case', value => { value.cases[0].hypothesis.proposedLinks[0].to = 'absent'; }, /outside this case/u],
  ['question promoted into evidence', value => { value.cases[0].edgeIds.push(value.cases[0].hypothesis.proposedLinks[0].id); }, /unknown reference|must not be included/u],
  ['question amount even when null', value => { value.cases[0].hypothesis.proposedLinks[0].amount = null; }, /cannot carry financial amounts/u],
  ['question collides with recorded ID', value => { value.cases[0].hypothesis.proposedLinks[0].id = value.edges[0].id; }, /collides|duplicate identifier/u],
  ['guilt probability hidden in nested data', value => { value.cases[0].hypothesis.tests[0].guiltProbability = 0.91; }, /guilt probabilities/u],
  ['impossible calendar date', value => { value.cases[0].hypothesis.chronology[0].date = '2024-02-30'; }, /real YYYY-MM-DD/u],
  ['future observation after cutoff', value => { value.cases[0].hypothesis.chronology[1].date = '2026-10-15'; }, /later than review date/u],
  ['future source after cutoff', value => { value.sources[0].publishedAt = '2026-10-15'; }, /later than review date/u],
  ['source timestamp beyond cutoff', value => { value.sources[0].accessedAt = '2026-10-15T00:00:00Z'; }, /later than review date/u],
  ['hindsight relabelled contemporaneous', value => { value.cases[0].hypothesis.chronology[1].knowledge = 'contemporaneous'; }, /postdates decision/u],
  ['unreviewed resolved flag', value => { delete value.entities[0].resolved; }, /explicitly state true or false/u],
  ['invalid Telangana code', value => { value.cases[0].geography[0].stateCode = 'TG'; }, /Telangana is TS/u],
  ['obsolete state code', value => { value.cases[0].geography[0].stateCode = 'DD'; }, /unknown current state/u],
  ['missing rival explanation', value => { value.cases[0].hypothesis.alternatives.pop(); }, /at least 3/u],
  ['missing discriminating test', value => { value.cases[0].hypothesis.tests.pop(); }, /at least 2/u],
  ['unknown assessment', value => { value.cases[0].hypothesis.assessment = 'proven-conspiracy'; }, /unrecognized hypothesis assessment/u],
  ['path traversal', value => { value.sources[0].capturePath = `${RESEARCH_ROOT}/raw/../outside.txt`; value.sources[0].sha256 = '0'.repeat(64); }, /safe relative path/u],
  ['infinite transaction value', value => { value.edges[0].amount = { value: Infinity, currency: 'INR', unit: 'rupees', period: '2024', basis: 'Fixture', overlapGroup: null }; }, /finite nonnegative/u],
  ['missing array fails usefully instead of throwing', value => { value.cases[0].hypothesis.tests = null; }, /must be an array/u],
];
for (const [label, mutate, pattern] of invalid) test(`validator rejects ${label}`, () => {
  const value = fixture(); mutate(value);
  assert.match(validateStream(value, { verifyCaptures: false }).join('\n'), pattern);
});

test('review-date source and observation are accepted; future next-review remains prospective', () => {
  const value = fixture(); value.sources[0].publishedAt = REVIEW_DATE; value.sources[0].accessedAt = `${REVIEW_DATE}T23:59:59Z`; value.cases[0].hypothesis.chronology[1].date = REVIEW_DATE;
  assert.deepEqual(validateStream(value, { verifyCaptures: false }), []);
});

test('capture bytes are hashed and symlinks cannot escape the raw directory', () => {
  const root = mkdtempSync(join(tmpdir(), 'hypothesis-provenance-'));
  try {
    mkdirSync(join(root, RESEARCH_ROOT, 'raw'), { recursive: true });
    const value = fixture(), source = value.sources[0];
    source.capturePath = `${RESEARCH_ROOT}/raw/extract.txt`;
    writeFileSync(join(root, source.capturePath), 'Exact retained extract\n');
    source.sha256 = createHash('sha256').update(readFileSync(join(root, source.capturePath))).digest('hex');
    assert.deepEqual(validateStream(value, { root }), []);
    writeFileSync(join(root, source.capturePath), 'Changed extract\n');
    assert.match(validateStream(value, { root }).join('\n'), /capture digest mismatch/u);
    writeFileSync(join(root, 'outside.txt'), 'Outside raw');
    symlinkSync(join(root, 'outside.txt'), join(root, RESEARCH_ROOT, 'raw', 'escaped.txt'));
    source.capturePath = `${RESEARCH_ROOT}/raw/escaped.txt`;
    assert.match(validateStream(value, { root }).join('\n'), /resolved path escapes/u);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('assembly binds exactly three streams, is deterministic and stale verification is read-only', () => {
  const root = mkdtempSync(join(tmpdir(), 'hypothesis-assembly-'));
  const assembler = resolve('scripts/hypothesis-lab/assemble.mjs');
  try {
    mkdirSync(join(root, RESEARCH_ROOT, 'streams'), { recursive: true });
    for (const track of TRACKS) writeFileSync(join(root, RESEARCH_ROOT, 'streams', `${track}.json`), `${JSON.stringify(fixture(track), null, 2)}\n`);
    assert.deepEqual(validateAll({ root }).errors, []);
    execFileSync(process.execPath, [assembler], { cwd: root, stdio: 'pipe' });
    const path = join(root, RESEARCH_ROOT, 'bundle.json'), first = readFileSync(path, 'utf8');
    execFileSync(process.execPath, [assembler], { cwd: root, stdio: 'pipe' });
    assert.equal(readFileSync(path, 'utf8'), first);
    execFileSync(process.execPath, [assembler, '--verify'], { cwd: root, stdio: 'pipe' });
    const changed = fixture(TRACKS[0]); changed.scope += ' A legitimate additional scope note.';
    writeFileSync(join(root, RESEARCH_ROOT, 'streams', `${TRACKS[0]}.json`), JSON.stringify(changed));
    assert.throws(() => execFileSync(process.execPath, [assembler, '--verify'], { cwd: root, stdio: 'pipe' }), /stale/u);
    assert.equal(readFileSync(path, 'utf8'), first, 'failed verification must not rewrite the accepted bundle');
    writeFileSync(join(root, RESEARCH_ROOT, 'streams', 'unexpected.json'), JSON.stringify(fixture()));
    assert.match(validateAll({ root }).errors.join('\n'), /expected exactly/u);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

const compiled = await build({ stdin: { contents: "export * as data from './src/data/hypothesisLab'; export { isInvestigationConnectivityEdge } from './src/data/investigation'; export { findAtlasTrails, exportAtlasEvidence } from './src/data/atlasInvestigation'; export { getEvidenceReaderModel } from './src/data/mapEvidence';", resolveDir: process.cwd(), loader: 'ts' }, bundle: true, platform: 'node', format: 'cjs', write: false, logLevel: 'silent', target: 'node20' });
const module = { exports: {} };
new Function('module', 'exports', compiled.outputFiles[0].text)(module, module.exports);
const { data, isInvestigationConnectivityEdge, findAtlasTrails, exportAtlasEvidence, getEvidenceReaderModel } = module.exports;
const bundle = JSON.parse(readFileSync(`${RESEARCH_ROOT}/bundle.json`, 'utf8'));

function assertSources(value, known, where) {
  if (Array.isArray(value)) return value.forEach(child => assertSources(child, known, where));
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (key === 'sourceIds' || key === 'evidenceSourceIds') for (const id of child) assert.ok(known.has(id), `${where}: omitted source ${id}`);
    else assertSources(child, known, where);
  }
}
function assertGraphClosure(graph, label) {
  const entities = new Set(graph.entities.map(row => row.id)), relationships = new Set(graph.relationships.map(row => row.id)), records = new Set(graph.records.map(row => row.id));
  assertSources(graph, new Set(graph.sources.map(row => row.id)), label);
  for (const edge of graph.relationships) {
    assert.ok(entities.has(edge.from) && entities.has(edge.to), `${label}: absent edge endpoint`);
    for (const id of [...edge.recordIds, ...edge.responseIds]) assert.ok(records.has(id), `${label}: absent response/record ${id}`);
  }
  for (const record of graph.records) {
    for (const id of record.entityIds) assert.ok(entities.has(id), `${label}: absent record entity ${id}`);
    for (const id of record.relationshipIds) assert.ok(relationships.has(id), `${label}: absent record relationship ${id}`);
  }
}

test('the live research bundle passes schema and capture gates with current stream hashes', () => {
  assert.deepEqual(validateAll().errors, []);
  assert.equal(bundle.streams.length, 3);
  for (const input of bundle.streamHashes) assert.equal(createHash('sha256').update(readFileSync(input.path)).digest('hex'), input.sha256, input.path);
});
test('wider-sector acquisition roadmap links only to implemented application routes', () => {
  const coverage = JSON.parse(readFileSync(`${RESEARCH_ROOT}/coverage.json`, 'utf8'));
  const routes = new Set([...readFileSync('src/App.tsx', 'utf8').matchAll(/<Route\s+path="([^"]+)"/gu)].map(match => match[1]));
  assert.equal(new Set(coverage.map(row => row.sector)).size, coverage.length);
  for (const row of coverage) {
    assert.ok(routes.has(row.route), `${row.sector}: unavailable route ${row.route}`);
    for (const field of ['authority', 'status', 'question']) assert.ok(row[field]?.trim(), `${row.sector}: missing ${field}`);
    assert.ok(row.nextRecords.length > 0, `${row.sector}: no concrete acquisition target`);
  }
});
for (const item of data.HYPOTHESIS_CASES) test(`case graph, optional questions and exact download stay separate and source closed: ${item.id}`, () => {
  const original = copy(item), basic = data.hypothesisCaseRegistry(item), optional = data.hypothesisCaseRegistry(item, { includeProposed: true }), packet = data.exportHypothesisCase(item);
  assertGraphClosure(basic, `${item.id}: default`);
  assertGraphClosure(optional, `${item.id}: questions`);
  assert.deepEqual(basic.relationships.map(row => row.id).sort(), [...item.edgeIds].sort());
  for (const edge of basic.relationships) {
    const reader = getEvidenceReaderModel(basic, { kind: 'relationship', id: edge.id });
    assert.ok(reader?.primaryResponse, `${edge.id}: own response preview is missing`);
    assert.ok(edge.responseIds.includes(reader.primaryResponse.id), `${edge.id}: preview belongs to another case relationship`);
    assert.equal(reader.primaryResponse.summary, data.HYPOTHESIS_EDGES.get(edge.id).response, `${edge.id}: response qualification changed`);
  }
  const questionIds = new Set(item.hypothesis.proposedLinks.map(link => data.questionEdgeId(link.id)));
  const questions = optional.relationships.filter(row => questionIds.has(row.id));
  assert.equal(questions.length, item.hypothesis.proposedLinks.length);
  for (const edge of questions) {
    const originalQuestion = item.hypothesis.proposedLinks.find(link => data.questionEdgeId(link.id) === edge.id);
    assert.equal(isInvestigationConnectivityEdge(edge), false, 'questions must never bridge source-backed path traversal');
    assert.deepEqual(edge.amounts, []);
    assert.equal(edge.tier, 'analytic');
    assert.match(edge.status, /unestablished/u);
    assert.ok(edge.summary.includes(originalQuestion.missingEvidence));
    assert.equal(edge.falsifier, originalQuestion.disconfirmingEvidence);
    const questionReader = getEvidenceReaderModel(optional, { kind: 'relationship', id: edge.id });
    assert.ok(questionReader?.primaryResponse && edge.responseIds.includes(questionReader.primaryResponse.id), `${edge.id}: question reader must preview its own qualification`);
    assert.ok(questionReader.primaryResponse.response.includes(originalQuestion.disconfirmingEvidence));
    const questionOnly = { ...optional, relationships: [edge] };
    assert.deepEqual(findAtlasTrails(questionOnly, { fromId: edge.from, toId: edge.to, depth: 5 }).paths, [], 'an unproved edge alone cannot complete a five-hop factual trail');
    const trails = findAtlasTrails(optional, { fromId: edge.from, toId: edge.to, depth: 5 });
    for (const path of trails.paths) for (const step of path) assert.ok(!questionIds.has(step.relationship.id), 'actual pathfinding must exclude every analytic question');
  }
  if (questions.length) {
    const generic = exportAtlasEvidence(optional, optional.relationships.map(edge => ({ kind: 'relationship', id: edge.id })));
    assert.match(generic.interpretation, /not a factual trail/u);
    assert.doesNotMatch(generic.interpretation, /^Source-backed evidence packet/u);
    assert.deepEqual(generic.unestablishedQuestions.map(row => row.id).sort(), [...questionIds].sort());
    assert.deepEqual(generic.recordedRelationships.map(row => row.id).sort(), [...item.edgeIds].sort());
    assertSources(generic, new Set(generic.sources.map(row => row.id)), `${item.id}: shared export`);
    assert.deepEqual([generic.inferredCashFlow, generic.outcomeProbabilities], [false, null]);
  }
  assert.deepEqual(packet.case, item);
  assert.deepEqual(packet.recordedEdges, item.edgeIds.map(id => data.HYPOTHESIS_EDGES.get(id)));
  assert.deepEqual(packet.proposedLinks, item.hypothesis.proposedLinks);
  assertSources(packet, new Set(packet.sources.map(row => row.id)), item.id);
  for (const source of packet.sources) assert.deepEqual(source, data.HYPOTHESIS_SOURCES.get(source.id));
  for (const entity of packet.entities) assert.deepEqual(entity, data.HYPOTHESIS_ENTITIES.get(entity.id));
  assert.deepEqual([packet.aggregateAmount, packet.inferredCashFlow, packet.outcomeProbabilities], [null, false, null]);
  assert.match(packet.rejectedJoinsScope, /Entire research track/u);
  assert.deepEqual(item, original, 'adapter and export must not mutate retained research');
});
test('the combined default graph contains no proposed question edges', () => {
  assertGraphClosure(data.HYPOTHESIS_REGISTRY, 'combined registry');
  const proposed = new Set(data.HYPOTHESIS_CASES.flatMap(item => item.hypothesis.proposedLinks.map(link => data.questionEdgeId(link.id))));
  for (const edge of data.HYPOTHESIS_REGISTRY.relationships) assert.ok(!proposed.has(edge.id));
  for (const entity of data.HYPOTHESIS_REGISTRY.entities) assert.equal(entity.resolved, data.HYPOTHESIS_ENTITIES.get(entity.id).resolved === true);
});
