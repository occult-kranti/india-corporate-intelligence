import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
const temporary = await mkdtemp(join(tmpdir(), 'spatial-geography-test-'));
after(() => rm(temporary, { recursive: true, force: true }));
async function load(file, name) {
  const outfile = join(temporary, `${name}.mjs`);
  await build({ entryPoints: [file], outfile, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent' });
  return import(pathToFileURL(outfile).href);
}
const geo = await load('src/geography.ts', 'geography');
const model = await load('src/model.ts', 'model');
const original = model.buildPreview();
const scene = geo.getGeographicScene(original);
const byId = new Map(original.nodes.map(node => [node.id, node]));
const finance = id => byId.get(`atlas-international-finance:entity:${id}`);

function inRing(point, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > point[1]) !== (yj > point[1]) && point[0] < (xj - xi) * (point[1] - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function inGeometry(point, geometry) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  return polygons.some(poly => inRing(point, poly[0]) && !poly.slice(1).some(hole => inRing(point, hole)));
}

test('geographic scene uses a single continuous Mercator world without narrative zones', () => {
  assert.equal(scene.projection, 'EPSG:3857');
  assert.equal(scene.nodes.length, 44);
  assert.equal(scene.edges.length, 30);
  assert.equal(scene.unplacedNodes.length, 4);
  assert.deepEqual(scene.clusters, []);
  assert.equal(scene.registry, original.registry);
  for (const node of scene.nodes) assert.deepEqual(node.position, geo.projectLngLat(node.anchor.lng, node.anchor.lat));
  assert.match(scene.caveat, /never verified headquarters/);
});

test('only source-supported country/state context is placed, with no invented addresses or building links', () => {
  const sourceIds = new Set(original.registry.sources.map(source => source.id));
  for (const node of scene.nodes) {
    const anchor = node.anchor;
    assert.ok(['country', 'state'].includes(anchor.precision));
    assert.equal(anchor.representativeOnly, true);
    assert.match(anchor.label, /representative area center, not a verified site or address/);
    assert.ok(anchor.sourceIds.length > 0);
    assert.ok(anchor.sourceIds.every(id => sourceIds.has(id)));
    assert.ok(anchor.uncertaintyKm >= 300);
    assert.equal(anchor.maxEvidenceZoom, anchor.precision === 'country' ? 4 : 7);
    assert.equal(anchor.focusZoom, anchor.maxEvidenceZoom);
    assert.ok(!('address' in anchor) && !('buildingId' in anchor));
    assert.deepEqual(node.item, byId.get(node.id).item, 'original evidence must not change');
  }
});

test('all area representatives lie inside the actual retained country/state polygons', () => {
  const checked = new Set();
  for (const node of scene.nodes) {
    const anchor = node.anchor;
    if (checked.has(anchor.areaCode)) continue;
    checked.add(anchor.areaCode);
    const feature = anchor.areaCode === 'IN-TN' ? geo.TAMIL_NADU_BOUNDARY.features[0] : geo.WORLD_COUNTRIES.features.find(feature => feature.properties.iso2 === anchor.areaCode);
    assert.ok(feature, anchor.areaCode);
    assert.ok(inGeometry([anchor.lng, anchor.lat], feature.geometry), `${anchor.areaCode} representative outside geometry`);
    assert.deepEqual(anchor.bounds, feature.bbox);
  }
  assert.deepEqual([...checked].sort(), ['BD', 'ES', 'IN', 'IN-TN']);
});

test('identical area evidence shares exact coordinates with no collision-driven geographic jitter', () => {
  const groups = new Map();
  for (const node of scene.nodes) {
    const prior = groups.get(node.anchor.areaCode);
    if (prior) {
      assert.deepEqual(node.position, prior.position);
      assert.deepEqual([node.anchor.lng, node.anchor.lat], [prior.anchor.lng, prior.anchor.lat]);
    } else groups.set(node.anchor.areaCode, node);
  }
  assert.ok(scene.nodes.length > groups.size, 'duplicates should be retained for DOM/list collision handling');
  assert.deepEqual(geo.getNodeAnchor(finance('adb')).areaCode, 'BD');
  assert.deepEqual(geo.getNodeAnchor(finance('aiib')).areaCode, 'BD');
  assert.equal(geo.getNodeAnchor(finance('ibrd')).areaCode, 'IN', 'national case context is not lender HQ');
});

test('unknown or multi-area evidence receives no fabricated fallback point', () => {
  const template = finance('india');
  const unknown = { ...template, item: { ...template.item, label: 'Known Building Name', geography: [{ scope: 'unknown', countryCodes: [], stateCodes: [], localityIds: [], basis: 'unknown', note: '', sourceIds: template.item.sourceIds }] } };
  assert.equal(geo.getNodeAnchor(unknown), null);
  assert.equal(geo.getNodeAnchor({ ...template, item: { ...template.item, geography: [] } }), null);
  assert.equal(geo.getNodeAnchor({ ...template, item: { ...template.item, namespace: 'unknown-dataset' } }), null);
  assert.equal(geo.getNodeAnchor(finance('lt')), null);
  for (const node of scene.unplacedNodes) {
    assert.equal(geo.getNodeAnchor(node), null);
    assert.ok(!scene.nodes.some(placed => placed.id === node.id));
    assert.match(scene.unplacedReasons[node.id], /Multiple geographic areas/);
  }
  const unknownScene = geo.getGeographicScene({ ...original, nodes: [unknown], edges: [] });
  assert.equal(unknownScene.nodes.length, 0);
  assert.equal(unknownScene.unplacedNodes.length, 1);
});

test('missing geography citations and unsupported states do not get markers', () => {
  const template = finance('india');
  assert.equal(geo.getNodeAnchor({ ...template, item: { ...template.item, geography: template.item.geography.map(g => ({ ...g, sourceIds: [] })) } }), null);
  const unsupported = { ...template, item: { ...template.item, geography: [{ scope: 'state', stateCodes: ['XX'], localityIds: [], basis: 'state-association', note: '', sourceIds: template.item.sourceIds }] } };
  assert.equal(geo.getNodeAnchor(unsupported), null);
});

test('geographic edges stay original, directed and limited to visible placed endpoints', () => {
  const placedIds = new Set(scene.nodes.map(node => node.id));
  for (const edge of scene.edges) {
    assert.ok(placedIds.has(edge.from) && placedIds.has(edge.to));
    assert.deepEqual(edge, original.edges.find(item => item.id === edge.id));
  }
  const filtered = geo.getGeographicScene(model.filterScene(original, { query: 'Airbus' }));
  const visible = new Set(filtered.nodes.map(node => node.id));
  assert.ok(filtered.edges.every(edge => visible.has(edge.from) && visible.has(edge.to)));
});

test('Mercator projection has consistent longitude/latitude axes, clipping and no wrap', () => {
  assert.deepEqual(geo.projectLngLat(0, 0), [0, 0.35, 0]);
  assert.equal(geo.projectLngLat(-180, 0)[0], -30);
  assert.equal(geo.projectLngLat(180, 0)[0], 30);
  assert.equal(geo.projectLngLat(90, 0)[0], 15);
  assert.ok(geo.projectLngLat(0, 45)[2] < 0);
  assert.ok(geo.projectLngLat(0, -45)[2] > 0);
  assert.ok(geo.projectLngLat(0, 90).every(Number.isFinite));
  assert.ok(Math.abs(geo.projectLngLat(0, 90)[2] + 30) < 1e-9);
  assert.throws(() => geo.projectLngLat(181, 0), RangeError);
  assert.throws(() => geo.projectLngLat(NaN, 0), RangeError);
  assert.throws(() => geo.projectLngLat(0, 91), RangeError);
});

test('geographic transformation is deterministic and never mutates the original scene', () => {
  const before = JSON.stringify(original);
  assert.deepEqual(geo.getGeographicScene(original), scene);
  assert.equal(JSON.stringify(original), before);
});

test('cartographic geometry is a source-audited world dataset, not a schematic reconstruction', async () => {
  assert.equal(geo.WORLD_COUNTRIES.features.length, 242);
  assert.equal(geo.TAMIL_NADU_BOUNDARY.features.length, 1);
  assert.equal(geo.TAMIL_NADU_BOUNDARY.features[0].id, 'TN');
  assert.ok(geo.GEOGRAPHY_SOURCES.some(source => source.license === 'Public domain'));
  assert.ok(geo.GEOGRAPHY_SOURCES.some(source => source.id === 'lgd-bharatmaps-tamil-nadu' && source.upstreamGovernmentService.startsWith('https://mapservice.gov.in/')));
  const metadata = JSON.parse(await readFile('src/assets/geography/geography-sources.json', 'utf8'));
  for (const [file, expected] of Object.entries(metadata.artifactSha256)) {
    const bytes = await readFile(`src/assets/geography/${file}`);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), expected, file);
  }
});
