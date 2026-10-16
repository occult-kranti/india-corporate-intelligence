import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { loadOriginalRegistry } from './original-registry.mjs';
const original = await loadOriginalRegistry();

const temporary = await mkdtemp(join(tmpdir(), 'spatial-model-test-'));
after(() => rm(temporary, { recursive: true, force: true }));
async function loadTypescript(entryPoint, name) {
  const outfile = join(temporary, `${name}.mjs`);
  await build({ entryPoints: [entryPoint], outfile, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent' });
  return import(pathToFileURL(outfile).href);
}
const model = await loadTypescript('src/model.ts', 'model');
const casebook = await loadTypescript('src/casebookStore.ts', 'casebook');
const { registry, buildPreview, filterScene, eventYear, matchesYearRange, strength } = model;
const preview = buildPreview();

function assertSourcesClosed(item, sourceIds) {
  for (const id of [...item.sourceIds, ...item.geography.flatMap(geo => geo.sourceIds)]) assert.ok(sourceIds.has(id), `${item.id}: source ${id} missing`);
}

test('preview contains the deliberately selected, labeled scope', () => {
  assert.equal(registry.entities.length, 36);
  assert.equal(registry.relationships.length, 33);
  assert.equal(registry.records.length, 12);
  assert.equal(registry.sources.length, 24);
  assert.equal(preview.nodes.length, 48);
  assert.equal(registry.updatedAt, original.updatedAt);
  assert.deepEqual(preview.yearRange, [2015, 2026]);
  assert.ok(registry.methodology.some(text => text.includes('Source-preserving preview')));
  assert.match(preview.caveat, /not geospatial coordinates/);
  assert.match(preview.caveat, /not confidence, importance or guilt/);
});

test('every retained evidence object is exactly equal to its original, with no invented IDs or edited claims', () => {
  for (const key of ['entities', 'relationships', 'records', 'sources']) {
    const originals = new Map(original[key].map(item => [item.id, item]));
    assert.equal(new Set(registry[key].map(item => item.id)).size, registry[key].length, `${key}: duplicate IDs`);
    for (const item of registry[key]) {
      assert.ok(originals.has(item.id), `${key}: fabricated ID ${item.id}`);
      assert.deepEqual(item, originals.get(item.id), `${item.id}: original evidence changed`);
    }
  }
});

test('the subset is closed over endpoints, records, responses, sources and localities', () => {
  const entities = new Set(registry.entities.map(item => item.id));
  const relationships = new Set(registry.relationships.map(item => item.id));
  const records = new Set(registry.records.map(item => item.id));
  const sources = new Set(registry.sources.map(item => item.id));
  const localities = new Set(registry.localities.map(item => item.id));
  for (const row of [...registry.entities, ...registry.relationships, ...registry.records]) {
    assertSourcesClosed(row, sources);
    for (const geo of row.geography) for (const id of geo.localityIds) assert.ok(localities.has(id));
  }
  for (const row of registry.relationships) {
    assert.ok(entities.has(row.from) && entities.has(row.to), row.id);
    assert.ok(row.sourceIds.length > 0, `${row.id}: unsourced relationship`);
    for (const id of row.recordIds) assert.ok(records.has(id), `${row.id}: missing record ${id}`);
    for (const id of row.responseIds) assert.ok(records.has(id) || relationships.has(id), `${row.id}: missing response ${id}`);
  }
  for (const row of registry.records) {
    for (const id of row.entityIds) assert.ok(entities.has(id), `${row.id}: missing entity ${id}`);
    for (const id of row.relationshipIds) assert.ok(relationships.has(id), `${row.id}: missing relationship ${id}`);
  }
});

test('counter-evidence, financial-stage limits and date qualifiers remain inspectable', () => {
  const responseIds = [
    'atlas-international-finance:record:tn-urban-response',
    'atlas-international-finance:record:ifc-mahindra-response',
    'atlas-international-finance:record:bangladesh-adb-response',
    'atlas-international-finance:record:imf-india-no-programme-credit',
    'atlas-defence-trade:record:c295-delivery-boundary',
  ];
  for (const id of responseIds) {
    const record = registry.records.find(item => item.id === id);
    assert.ok(record, id);
    assert.ok(record.response && record.dateBasis);
    assert.deepEqual(record.limitations, original.records.find(item => item.id === id).limitations);
    assert.ok(preview.nodes.some(node => node.id === id), `${id}: response is not inspectable`);
  }
  const boundary = registry.records.find(item => item.id.endsWith('record:c295-delivery-boundary'));
  assert.equal(boundary.fromDate, null);
  assert.equal(boundary.toDate, '2026-06-30');
  assert.match(boundary.summary, /forecasts/);
  assert.match(boundary.limitations.join(' '), /No negative inference/);
  const imf = registry.records.find(item => item.id.endsWith('record:imf-india-no-programme-credit'));
  assert.match(`${imf.title} ${imf.summary}`, /no outstanding programme credit/i);
});

test('layout is deterministic, bounded and separate from untouched source geography', () => {
  assert.deepEqual(buildPreview(), preview);
  assert.equal(preview.clusters.length, 4);
  assert.equal(new Set(preview.nodes.map(node => node.position.join(','))).size, preview.nodes.length);
  for (const node of preview.nodes) {
    assert.ok(node.position.every(Number.isFinite));
    assert.ok(Math.abs(node.position[0]) < 30 && Math.abs(node.position[2]) < 18, node.id);
    assert.ok(node.position[1] >= 0.25 && node.position[1] <= 1, node.id);
    assert.equal(node.id, node.item.id);
    assert.equal(node.title, node.item.title ?? node.item.label);
    assert.ok(preview.clusters.some(cluster => cluster.id === node.cluster));
    assert.ok(!('latitude' in node) && !('longitude' in node));
  }
});

test('every scene edge is an original relationship; no record membership or proximity edges are manufactured', () => {
  const relationshipIds = new Set(registry.relationships.map(item => item.id));
  const entityIds = new Set(registry.entities.map(item => item.id));
  assert.equal(preview.edges.length, registry.relationships.length);
  for (const edge of preview.edges) {
    assert.ok(relationshipIds.has(edge.id));
    assert.equal(edge.from, edge.relationship.from);
    assert.equal(edge.to, edge.relationship.to);
    assert.ok(entityIds.has(edge.from) && entityIds.has(edge.to));
    assert.equal(edge.sourceCount, new Set(edge.relationship.sourceIds).size);
  }
});

test('source count is distinct, exact on the edge and capped only in visual thickness', () => {
  assert.equal(strength({ sourceIds: ['one', 'one', 'two'] }), 2);
  assert.equal(strength({ sourceIds: ['1', '2', '3', '4', '5', '6', '7'] }), 5);
  assert.equal(strength({ sourceIds: [] }), 1);
  assert.equal(strength({ sourceCount: 9 }), 5);
  assert.equal(strength(3), 3);
  assert.equal(strength(Number.NaN), 1);
});

test('timeline uses inclusive interval overlap and handles undated records explicitly', () => {
  const interval = { fromDate: '2018-05-01', toDate: '2023-08-31' };
  assert.equal(matchesYearRange(interval, { fromYear: 2020, toYear: 2020 }), true);
  assert.equal(matchesYearRange(interval, { fromYear: 2023, toYear: 2024 }), true);
  assert.equal(matchesYearRange(interval, { fromYear: 2010, toYear: 2018 }), true);
  assert.equal(matchesYearRange(interval, { fromYear: 2024 }), false);
  assert.equal(matchesYearRange(interval, { toYear: 2017 }), false);
  assert.equal(matchesYearRange(interval, { fromYear: 2025, toYear: 2020 }), false);
  assert.equal(matchesYearRange(interval, { fromYear: NaN }), false);
  assert.equal(matchesYearRange({ fromDate: null, toDate: null }, { fromYear: 2020, includeUndated: true }), true);
  assert.equal(matchesYearRange({ fromDate: null, toDate: null }, { includeUndated: false }), false);
  assert.equal(matchesYearRange({ fromDate: null, toDate: '2026-06-30' }, { fromYear: 2026, toYear: 2026, includeUndated: false }), true);
  assert.equal(matchesYearRange({ fromDate: null, toDate: '2026-06-30' }, { fromYear: 2025, toYear: 2025, includeUndated: true }), false);
  assert.equal(matchesYearRange({ statusAsOf: '2025-01-01' }, { includeUndated: false }), false);
  assert.equal(eventYear('2025-02-30'), null);
  assert.equal(eventYear('2025'), null);
  assert.equal(eventYear('2024-02-29'), 2024);
});

test('timeline preserves overlapping cases without leaking their out-of-range relationships', () => {
  const scene = filterScene(preview, { fromYear: 2020, toYear: 2020, includeUndated: false });
  assert.ok(scene.nodes.some(node => node.id === 'atlas-international-finance:record:tn-urban-sovereign-contract'));
  assert.ok(!scene.edges.some(edge => edge.id === 'atlas-international-finance:relationship:ibrd-india-8488'));
  assert.ok(scene.edges.every(edge => matchesYearRange(edge.relationship, { fromYear: 2020, toYear: 2020, includeUndated: false })));
  assert.equal(filterScene(preview, { fromYear: 1900, toYear: 1901, includeUndated: false }).nodes.length, 0);
});

test('facets use original layer membership and every visible edge has visible endpoints', () => {
  for (const filters of [{}, { layers: ['procurement'] }, { layers: ['funding'] }, { query: 'Larsen' }, { fromYear: 2021, toYear: 2021, includeUndated: false }]) {
    const scene = filterScene(preview, filters);
    const visibleIds = new Set(scene.nodes.map(node => node.id));
    for (const edge of scene.edges) {
      assert.ok(visibleIds.has(edge.from) && visibleIds.has(edge.to));
      if (filters.layers) assert.ok(edge.relationship.layers.some(layer => filters.layers.includes(layer)));
    }
    for (const node of scene.nodes.filter(node => node.kind === 'record')) if (filters.layers) assert.ok(node.item.layers.some(layer => filters.layers.includes(layer)));
    assert.equal(scene.registry, preview.registry, 'filters must not erase source or counter-evidence registry');
  }
  assert.equal(filterScene(preview, { layers: ['people'] }).nodes.length, 0);
  assert.ok(filterScene(preview, { query: 'Larsen' }).nodes.some(node => node.id === 'atlas-international-finance:entity:lt'));
  assert.equal(filterScene(preview, { query: 'no-such-entity-zzzz' }).nodes.length, 0);
});

test('filtering leaves source objects and stable positions unchanged', () => {
  const before = JSON.stringify(preview);
  filterScene(preview, { query: 'India', layers: ['funding'], fromYear: 2020, includeUndated: false });
  assert.equal(JSON.stringify(preview), before);
  assert.deepEqual(filterScene(preview).nodes, preview.nodes);
  assert.deepEqual(filterScene(preview).edges, preview.edges);
});

test('casebook source was preserved apart from its type-only import path', async () => {
  const retained = await readFile('scripts/fixtures/casebookStore.original.ts', 'utf8');
  const current = await readFile('src/casebookStore.ts', 'utf8');
  assert.equal(current, retained.replace("from '../../data/investigation'", "from './domain'"));
});

test('casebook packets retain original relationships and linked responses without inventing joins', () => {
  const book = casebook.emptyCasebook();
  book.pins = [{ kind: 'relationship', id: 'atlas-defence-trade:relationship:mod-airbus-contract', addedAt: '', note: 'Analyst annotation' }];
  const packet = casebook.buildCasebookPacket(book, registry);
  assert.ok(packet.records.some(record => record.id === 'atlas-defence-trade:record:c295-delivery-boundary'));
  assert.ok(packet.records.some(record => record.id === 'atlas-defence-trade:record:c295-spain-india'));
  assert.equal(packet.unavailablePins.length, 0);
  for (const row of packet.relationships) assert.deepEqual(row, registry.relationships.find(item => item.id === row.id));
  const sourceIds = new Set(packet.sources.map(source => source.id));
  for (const row of [...packet.entities, ...packet.relationships, ...packet.records]) assertSourcesClosed(row, sourceIds);
  const markdown = casebook.casebookMarkdown(packet);
  assert.match(markdown, /Linked context and counter-evidence/);
  assert.match(markdown, /Source ledger/);
  assert.match(markdown, /Analyst note \(user-entered\)/);
});

test('casebook imports stay additive, deduplicate IDs and reject unsafe saved-view URLs', () => {
  const current = { ...casebook.emptyCasebook(), question: 'Preserve my question', pins: [{ kind: 'entity', id: registry.entities[0].id, addedAt: '', note: 'Keep my note' }] };
  const incoming = { ...casebook.emptyCasebook(), question: 'Other question', pins: [{ kind: 'entity', id: registry.entities[0].id, addedAt: '', note: 'Other note' }] };
  const merged = casebook.mergeCasebooks(current, incoming);
  assert.equal(merged.question, current.question);
  assert.equal(merged.pins.length, 1);
  assert.equal(merged.pins[0].note, 'Keep my note');
  assert.equal(casebook.portableCasebookUrl('javascript:alert(1)'), '');
  assert.equal(casebook.portableCasebookUrl('#/board?x=1'), '#/board?x=1');
  const packet = casebook.buildCasebookPacket({ ...casebook.emptyCasebook(), pins: [{ kind: 'entity', id: 'missing-original-id', addedAt: '', note: '' }] }, registry);
  assert.equal(packet.unavailablePins.length, 1);
});
