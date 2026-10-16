import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { loadOriginalRegistry } from './original-registry.mjs';

const temporary = await mkdtemp(join(tmpdir(), 'spatial-full-scene-'));
after(() => rm(temporary, { recursive: true, force: true }));
async function loadTypescript(entryPoint, name) {
  const outfile = join(temporary, `${name}.mjs`);
  await build({ entryPoints: [entryPoint], outfile, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent' });
  return import(pathToFileURL(outfile).href);
}
const model = await loadTypescript('src/model.ts', 'model');
const geography = await loadTypescript('src/geography.ts', 'geography');
const { buildEvidenceScene, factualScene, isHeldItem, filterScene, matchesYearRange } = model;
const original = await loadOriginalRegistry();
const snapshot = createHash('sha256').update(JSON.stringify(original)).digest('hex');
const scene = buildEvidenceScene(original);
const factual = factualScene(scene);
const originalItems = [...original.entities, ...original.records];
const sourceIds = new Set(original.sources.map(source => source.id));
const heldIds = new Set(original.held.map(item => item.id));

function assertOriginalReferences(result) {
  assert.equal(result.registry, original);
  for (const key of ['entities', 'records', 'relationships', 'sources', 'held', 'states', 'localities', 'coverage', 'methodology']) {
    assert.equal(result.registry[key], original[key], `${key} array was replaced`);
  }
  const nodes = new Map(scene.nodes.map(node => [node.id, node]));
  const edges = new Map(scene.edges.map(edge => [edge.id, edge]));
  for (const node of result.nodes) assert.equal(node, nodes.get(node.id), `node ${node.id} was replaced`);
  for (const edge of result.edges) assert.equal(edge, edges.get(edge.id), `edge ${edge.id} was replaced`);
}

test('complete model retains every original entity, record, directed relationship, source and held entry', () => {
  assert.deepEqual({ entities: original.entities.length, records: original.records.length, relationships: original.relationships.length,
    sources: original.sources.length, held: original.held.length },
  { entities: 2469, records: 5617, relationships: 4203, sources: 3314, held: 316 });
  assert.equal(scene.nodes.length, 8086);
  assert.equal(scene.edges.length, 4203);
  assert.equal(scene.nodes.filter(node => node.kind === 'entity').length, 2469);
  assert.equal(scene.nodes.filter(node => node.kind === 'record').length, 5617);
  assert.deepEqual(scene.nodes.map(node => node.id), originalItems.map(item => item.id));
  assert.deepEqual(scene.edges.map(edge => edge.id), original.relationships.map(item => item.id));
  assert.equal(new Set(scene.nodes.map(node => node.id)).size, scene.nodes.length);
  assert.equal(new Set(scene.edges.map(edge => edge.id)).size, scene.edges.length);
  assertOriginalReferences(scene);
});

test('all evidence objects, original IDs, citations, qualifiers and geography are retained by reference', () => {
  for (let index = 0; index < scene.nodes.length; index++) {
    const node = scene.nodes[index], item = originalItems[index];
    assert.equal(node.item, item);
    assert.equal(node.id, item.id);
    assert.equal(node.title, item.title ?? item.label);
    assert.equal(node.item.sourceIds, item.sourceIds);
    assert.equal(node.item.geography, item.geography);
    assert.equal(node.item.limitations, item.limitations);
    assert.equal(node.item.originalId, item.originalId);
  }
  for (let index = 0; index < scene.edges.length; index++) {
    const edge = scene.edges[index], relationship = original.relationships[index];
    assert.equal(edge.relationship, relationship);
    assert.equal(edge.from, relationship.from);
    assert.equal(edge.to, relationship.to);
    assert.equal(edge.sourceCount, new Set(relationship.sourceIds).size);
    assert.equal(edge.relationship.sourceIds, relationship.sourceIds);
    assert.equal(edge.relationship.recordIds, relationship.recordIds);
    assert.equal(edge.relationship.responseIds, relationship.responseIds);
  }
});

test('source IDs remain exact and complete, including held and nested geographic citations', () => {
  assert.equal(sourceIds.size, 3314);
  assert.equal(scene.registry.sources, original.sources);
  assert.deepEqual(scene.registry.sources.map(source => source.id), original.sources.map(source => source.id));
  for (const item of [...originalItems, ...original.relationships, ...original.held]) {
    for (const id of item.sourceIds) assert.ok(sourceIds.has(id), `${item.id}: missing exact source ID ${id}`);
    for (const geo of item.geography ?? []) for (const id of geo.sourceIds) {
      assert.ok(sourceIds.has(id), `${item.id}: missing exact geography citation ${id}`);
    }
  }
});

test('only original directed relationships become edges, with no inferred membership or proximity joins', () => {
  const entityIds = new Set(original.entities.map(item => item.id));
  for (const edge of scene.edges) {
    assert.ok(entityIds.has(edge.from));
    assert.ok(entityIds.has(edge.to));
    assert.equal(edge.id, edge.relationship.id);
    assert.ok(edge.relationship.sourceIds.length > 0);
  }
  assert.equal(scene.edges.length, original.relationships.length);
});

test('complete scene has only non-geographic placeholders and no narrative placement', () => {
  assert.deepEqual(scene.clusters, []);
  for (const node of scene.nodes) {
    assert.deepEqual(node.position, [0, 0, 0]);
    assert.equal(node.cluster, 'unplaced');
    assert.ok(!('latitude' in node) && !('longitude' in node));
  }
  assert.deepEqual(buildEvidenceScene(original), scene);
  assert.match(scene.caveat, /non-geographic placeholders/);
  assert.match(scene.caveat, /held entries/);
});

test('geographic projection ignores every placeholder and does not invent unplaced locations', () => {
  const projected = geography.getGeographicScene(factual);
  const alteredPlaceholders = { ...factual, nodes: factual.nodes.map((node, index) => ({ ...node,
    position: [index + 500, -100, index - 800], cluster: 'test-only-placeholders' })) };
  const projectedAltered = geography.getGeographicScene(alteredPlaceholders);
  assert.deepEqual(projectedAltered.nodes, projected.nodes);
  assert.deepEqual(projectedAltered.unplacedNodes.map(node => node.id), projected.unplacedNodes.map(node => node.id));
  assert.equal(projected.nodes.length + projected.unplacedNodes.length, factual.nodes.length);
  assert.deepEqual(projected.clusters, []);
  assert.equal(projected.registry, original);
  for (const node of projected.unplacedNodes) assert.equal(geography.getNodeAnchor(node), null);
});

test('all 316 held IDs are recognized, including the 89 IDs absent from scene evidence', () => {
  assert.equal(heldIds.size, 316);
  for (const id of heldIds) assert.equal(isHeldItem(original, id), true);
  assert.equal(isHeldItem(original, 'no-such-held-original-id'), false);
  const overlapping = original.records.filter(record => heldIds.has(record.id));
  assert.equal(overlapping.length, 227);
  assert.ok(overlapping.every(record => record.status === 'not-drawn'));
  assert.equal([...heldIds].filter(id => !originalItems.some(item => item.id === id)).length, 89);
  for (const record of overlapping) assert.equal(scene.nodes.find(node => node.id === record.id)?.item, record);
});

test('held lookup indexes each immutable snapshot once without mutating or mixing registries', () => {
  let heldReads = 0;
  const first = Object.freeze({ ...original, get held() { heldReads++; return original.held; } });
  const second = Object.freeze({ ...original, held: Object.freeze([]) });
  for (let index = 0; index < 100; index++) {
    assert.equal(isHeldItem(first, original.held[0].id), true);
    assert.equal(isHeldItem(first, 'no-such-held-id'), false);
    assert.equal(isHeldItem(second, original.held[0].id), false);
  }
  assert.equal(heldReads, 1, 'subsequent lookups use the derived O(1) ID set');
});

test('factual marks exclude all held/not-drawn records while the complete reader registry survives', () => {
  assert.equal(factual.nodes.length, 7859);
  assert.equal(factual.nodes.filter(node => node.kind === 'entity').length, 2469);
  assert.equal(factual.nodes.filter(node => node.kind === 'record').length, 5390);
  assert.equal(factual.edges.length, 4203);
  assert.ok(factual.nodes.every(node => !heldIds.has(node.id) && node.item.status !== 'not-drawn'));
  assert.ok(factual.edges.every(edge => !heldIds.has(edge.id) && edge.relationship.status !== 'not-drawn'));
  assert.equal(factual.registry.held.length, 316);
  assert.equal(factual.registry.records.length, 5617);
  assert.equal(factual.registry.sources.length, 3314);
  assertOriginalReferences(factual);
  assert.deepEqual(factualScene(factual), factual, 'exclusion is idempotent');
});

function exclusionFixture() {
  const entities = ['fixture:held-entity', 'fixture:visible-entity'].map(id => ({ ...original.entities[0], id, label: id, summary: '' }));
  const records = ['fixture:held-record', 'fixture:not-drawn-record'].map((id, index) => ({ ...original.records[0], id,
    title: 'Only withheld context marker', summary: '', entityIds: [entities[1].id], relationshipIds: [],
    status: index ? 'not-drawn' : 'documented' }));
  const relationships = ['fixture:held-edge', 'fixture:not-drawn-edge', 'fixture:dangling-edge', 'fixture:visible-edge']
    .map((id, index) => ({ ...original.relationships[0], id, from: index === 2 ? entities[0].id : entities[1].id,
      to: entities[1].id, status: index === 1 ? 'not-drawn' : 'documented', recordIds: [], responseIds: [] }));
  const held = ['fixture:held-entity', 'fixture:held-record', 'fixture:held-edge'].map(id => ({ ...original.held[0], id }));
  return { ...original, entities, records, relationships, held };
}

test('exclusion independently handles held entities/relationships, not-drawn status and dangling endpoints', () => {
  const input = exclusionFixture(), complete = buildEvidenceScene(input), selected = factualScene(complete);
  assert.deepEqual(selected.nodes.map(node => node.id), ['fixture:visible-entity']);
  assert.deepEqual(selected.edges.map(edge => edge.id), ['fixture:visible-edge']);
  assert.equal(selected.registry, input);
  assert.equal(input.records.length, 2);
  assert.equal(input.relationships.length, 4);
  assert.equal(input.held.length, 3);
  assert.equal(complete.nodes.length, 4);
  assert.equal(complete.edges.length, 4);
});

test('reader-only held records cannot make entity marks match a factual query indirectly', () => {
  const complete = buildEvidenceScene(exclusionFixture());
  assert.equal(filterScene(complete, { query: 'Only withheld context marker' }).nodes.length, 3);
  const selected = filterScene(factualScene(complete), { query: 'Only withheld context marker' });
  assert.deepEqual(selected.nodes, []);
  assert.deepEqual(selected.edges, []);
  assert.equal(selected.registry.records.length, 2);
});

test('full search finds exact record IDs and cited source titles without narrowing the source ledger', () => {
  const record = original.records.find(item => !heldIds.has(item.id) && item.sourceIds.length);
  const source = original.sources.find(source => record.sourceIds.includes(source.id));
  for (const query of [record.id, source.title]) {
    const result = filterScene(factual, { query });
    assert.ok(result.nodes.some(node => node.item === record), query);
    assertOriginalReferences(result);
  }
  assert.equal(filterScene(factual, { query: 'no-such-entity-zzzz-2469-5617' }).nodes.length, 0);
});

test('namespace and layers select original memberships while keeping directed edge endpoints visible', () => {
  for (const filters of [{ namespace: 'atlas-international-finance' }, { namespace: 'atlas-defence-trade', layers: ['procurement'] },
    { layers: ['legal'] }, { namespace: 'no-such-namespace' }]) {
    const result = filterScene(factual, filters), visibleIds = new Set(result.nodes.map(node => node.id));
    const matches = item => (!filters.namespace || item.namespace === filters.namespace)
      && (!filters.layers || item.layers.some(layer => filters.layers.includes(layer)));
    assert.deepEqual(result.nodes.filter(node => node.kind === 'record').map(node => node.id),
      factual.nodes.filter(node => node.kind === 'record' && matches(node.item)).map(node => node.id));
    assert.deepEqual(result.edges.map(edge => edge.id), factual.edges.filter(edge => matches(edge.relationship)).map(edge => edge.id));
    for (const edge of result.edges) assert.ok(visibleIds.has(edge.from) && visibleIds.has(edge.to));
    assertOriginalReferences(result);
  }
  assert.equal(filterScene(factual, { namespace: 'no-such-namespace' }).nodes.length, 0);
  assert.deepEqual(filterScene(factual, { namespace: '' }), filterScene(factual));
});

test('full timeline uses original calendar-event bounds, never status dates or invented dates', () => {
  assert.deepEqual(scene.yearRange, [1949, 2046]);
  for (const filters of [{ fromYear: 2020, toYear: 2020, includeUndated: false },
    { fromYear: 1949, toYear: 1950, includeUndated: false }, { fromYear: 2046, toYear: 2046, includeUndated: false },
    { fromYear: 2026, namespace: 'atlas-defence-trade', layers: ['procurement'], includeUndated: false }]) {
    const result = filterScene(factual, filters), visibleIds = new Set(result.nodes.map(node => node.id));
    for (const node of result.nodes.filter(node => node.kind === 'record')) assert.ok(matchesYearRange(node.item, filters));
    for (const edge of result.edges) {
      assert.ok(matchesYearRange(edge.relationship, filters));
      assert.ok(visibleIds.has(edge.from) && visibleIds.has(edge.to));
    }
    assertOriginalReferences(result);
  }
  const undated = factual.nodes.find(node => node.kind === 'record' && node.item.fromDate === null && node.item.toDate === null);
  assert.ok(undated);
  assert.ok(filterScene(factual, { includeUndated: true }).nodes.includes(undated));
  assert.ok(!filterScene(factual, { includeUndated: false }).nodes.includes(undated));
  assert.equal(filterScene(factual, { fromYear: 1800, toYear: 1801, includeUndated: false }).nodes.length, 0);
});

test('empty and fully undated input use a finite empty year range without adding evidence', () => {
  const empty = { ...original, entities: [], records: [], relationships: [], sources: [], held: [] };
  assert.deepEqual(buildEvidenceScene(empty).yearRange, [0, 0]);
  assert.deepEqual(buildEvidenceScene(empty).nodes, []);
  assert.deepEqual(buildEvidenceScene(empty).edges, []);
  const undated = { ...empty, records: [{ ...original.records[0], fromDate: null, toDate: null, statusAsOf: '2026-10-16' }] };
  assert.deepEqual(buildEvidenceScene(undated).yearRange, [0, 0]);
});

test('filtering preserves the complete scene by default and never changes original registry bytes', () => {
  assert.deepEqual(filterScene(scene).nodes, scene.nodes);
  assert.deepEqual(filterScene(scene).edges, scene.edges);
  assert.deepEqual(filterScene(factual).nodes, factual.nodes);
  assert.deepEqual(filterScene(factual).edges, factual.edges);
  filterScene(factual, { query: 'India', namespace: 'atlas-international-finance', layers: ['funding'], fromYear: 2020, includeUndated: false });
  assert.equal(createHash('sha256').update(JSON.stringify(original)).digest('hex'), snapshot);
});
