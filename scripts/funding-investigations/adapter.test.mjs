import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const compiled = await build({ entryPoints: ['src/data/fundingInvestigations.ts'], bundle: true, platform: 'node', format: 'cjs', write: false, logLevel: 'silent', target: 'node20' });
const module = { exports: {} };
new Function('module', 'exports', compiled.outputFiles[0].text)(module, module.exports);
const data = module.exports;
const bundle = JSON.parse(readFileSync('research/funding-investigations/bundle.json'));

test('reviewed bundle and analysis receipt bind to the same current stream bytes', () => {
  assert.equal(bundle.streams.length, 5);
  assert.ok(data.FUNDING_CASES.length >= 28);
  const analysis = JSON.parse(readFileSync('research/funding-investigations/analysis-ui.json'));
  for (const input of bundle.streamHashes) {
    const digest = createHash('sha256').update(readFileSync(input.path)).digest('hex');
    assert.equal(digest, input.sha256, input.path);
    assert.equal(analysis.inputReceipt.streams.find(row => row.path === input.path)?.sha256, digest, `analysis stale: ${input.path}`);
  }
});

for (const item of data.FUNDING_CASES) test(`case graph and exported research packet are source closed: ${item.id}`, () => {
  const graph = data.fundingCaseRegistry(item), packet = data.exportFundingCase(item);
  assert.ok(graph.entities.some(row => row.resolved), `${item.id}: no reviewed identity available to the network`);
  const ids = new Set(graph.entities.map(row => row.id));
  const records = new Set(graph.records.map(row => row.id));
  const sources = new Set(graph.sources.map(row => row.id));
  for (const row of [...graph.entities, ...graph.relationships, ...graph.records]) {
    for (const id of row.sourceIds) assert.ok(sources.has(id), `${row.id}: ${id}`);
    for (const place of row.geography) for (const id of place.sourceIds) assert.ok(sources.has(id));
  }
  for (const edge of graph.relationships) {
    assert.ok(ids.has(edge.from) && ids.has(edge.to));
    for (const id of [...edge.responseIds, ...edge.recordIds]) assert.ok(records.has(id), id);
    const original = data.FUNDING_EDGES.get(edge.id);
    assert.ok(edge.status.includes(original.stage));
    assert.equal(edge.amounts.length, original.amount ? 1 : 0);
    if (original.amount) assert.equal(edge.amounts[0].value, original.amount.value);
  }
  const edges = new Set(graph.relationships.map(row => row.id));
  for (const record of graph.records) {
    for (const id of record.entityIds) assert.ok(ids.has(id), `${record.id}: missing entity ${id}`);
    for (const id of record.relationshipIds) assert.ok(edges.has(id), `${record.id}: missing edge ${id}`);
  }
  assert.deepEqual(packet.case, item);
  assert.equal(packet.aggregateAmount, null);
  assert.equal(packet.inferredCashFlow, false);
  assert.equal(packet.outcomeProbabilities, null);
  assert.match(packet.rejectedJoinsScope, /Entire research track/);
  const exportedSources = new Set(packet.sources.map(row => row.id));
  function checkRefs(value) {
    if (Array.isArray(value)) return value.forEach(checkRefs);
    if (!value || typeof value !== 'object') return;
    for (const [key, v] of Object.entries(value)) {
      if (key === 'sourceIds' || key === 'evidenceSourceIds') for (const id of v) assert.ok(exportedSources.has(id), `export omitted ${id}`);
      else checkRefs(v);
    }
  }
  checkRefs(packet);
  for (const actor of item.decisionAnalysis?.actors ?? []) assert.ok(ids.has(actor.entityId));
  for (const edge of packet.edges) assert.deepEqual(edge, data.FUNDING_EDGES.get(edge.id));
});

test('unresolved identities and unknown geography are not silently resolved', () => {
  for (const entity of data.FUNDING_REGISTRY.entities) {
    assert.equal(typeof data.FUNDING_ENTITIES.get(entity.id).resolved, 'boolean', `${entity.id}: identity review flag absent`);
    assert.equal(entity.resolved, data.FUNDING_ENTITIES.get(entity.id).resolved === true);
  }
  for (const item of data.FUNDING_CASES) for (const place of item.geography) {
    if (place.stateCode !== null) assert.ok(data.FUNDING_REGISTRY.states.some(row => row.code === place.stateCode), `${item.id}: ${place.stateCode}`);
  }
  const current = new Set(data.FUNDING_REGISTRY.entities.map(row => row.id));
  for (const entity of data.EXISTING_ATLAS.entities) assert.ok(!current.has(entity.id));
});
