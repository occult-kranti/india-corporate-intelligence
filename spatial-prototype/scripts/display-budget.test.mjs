import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { loadOriginalRegistry } from './original-registry.mjs';

const temporary = await mkdtemp(join(tmpdir(), 'spatial-display-budget-'));
after(() => rm(temporary, { recursive: true, force: true }));
async function loadTypescript(entryPoint, name) {
  const outfile = join(temporary, `${name}.mjs`);
  await build({ entryPoints: [entryPoint], outfile, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent' });
  return import(pathToFileURL(outfile).href);
}
const { buildEvidenceScene, factualScene, isHeldItem } = await loadTypescript('src/model.ts', 'model');
const { planGeographicDisplay, MAX_THREAD_MESHES } = await loadTypescript('src/displayBudget.ts', 'display');
const { getNodeAnchor } = await loadTypescript('src/geography.ts', 'geography');
const { originalRoute, safeSourceUrl } = await loadTypescript('src/navigation.ts', 'navigation');
const original = await loadOriginalRegistry();
const complete = buildEvidenceScene(original);
const factual = factualScene(complete);
const display = planGeographicDisplay(factual);
const keyFor = (edge, anchors = display.anchors) => JSON.stringify([
  anchors.get(edge.from).areaCode, anchors.get(edge.to).areaCode, edge.relationship.layers[0],
]);

test('full factual corpus produces exact geographic counts while the full registry remains intact', () => {
  assert.equal(factual.nodes.length, 7859);
  assert.equal(factual.edges.length, 4203);
  assert.equal(display.anchors.size, 3856);
  assert.equal(display.groups.size, 42);
  assert.equal(display.candidates.length, 765);
  assert.equal(display.rendered.length, 60);
  assert.equal(MAX_THREAD_MESHES, 60);
  assert.equal([...display.groups.values()].reduce((count, group) => count + group.records.length, 0), 3856);
  assert.equal([...display.groups.values()].filter(group => group.anchor.precision === 'state').length, 36);
  assert.equal([...display.groups.values()].filter(group => group.anchor.precision === 'country').length, 6);
  assert.equal(factual.registry, original);
  assert.equal(factual.registry.entities.length, 2469);
  assert.equal(factual.registry.records.length, 5617);
  assert.equal(factual.registry.sources.length, 3314);
  assert.equal(factual.registry.held.length, 316);
});

test('each group contains exact original nodes and retained geographic precision, with no source union', () => {
  const originals = new Map(factual.nodes.map(node => [node.id, node]));
  for (const [key, group] of display.groups) {
    assert.equal(key, group.anchor.areaCode);
    assert.ok(['state', 'country'].includes(group.anchor.precision));
    const first = group.records[0];
    assert.equal(group.anchor, display.anchors.get(first.id));
    assert.deepEqual(group.anchor.sourceIds, [...new Set(first.item.geography.flatMap(geo => geo.sourceIds))]);
    for (const node of group.records) {
      assert.equal(node, originals.get(node.id));
      const anchor = display.anchors.get(node.id);
      assert.equal(anchor.areaCode, key);
      assert.equal(anchor.precision, group.anchor.precision);
      assert.equal(anchor.lng, group.anchor.lng);
      assert.equal(anchor.lat, group.anchor.lat);
      assert.deepEqual(anchor, getNodeAnchor(node));
    }
  }
  assert.equal(display.groups.get('IN').anchor.precision, 'country');
  assert.equal(display.groups.get('IN-TN').anchor.precision, 'state');
  assert.notEqual(display.groups.get('IN'), display.groups.get('IN-TN'));
});

test('only original cross-area directed relationships become candidates; no same-area geometry is fabricated', () => {
  const originals = new Map(factual.edges.map(edge => [edge.id, edge]));
  const candidates = new Set(display.candidates.map(edge => edge.id));
  let sameArea = 0;
  for (const edge of factual.edges) {
    const from = display.anchors.get(edge.from), to = display.anchors.get(edge.to);
    const crossArea = !!(from && to && from.areaCode !== to.areaCode);
    assert.equal(candidates.has(edge.id), crossArea, edge.id);
    if (from && to && from.areaCode === to.areaCode) sameArea++;
  }
  assert.equal(sameArea, 894);
  for (const edge of [...display.candidates, ...display.rendered]) {
    assert.equal(edge, originals.get(edge.id));
    assert.equal(edge.relationship, originals.get(edge.id).relationship);
    assert.equal(edge.from, edge.relationship.from);
    assert.equal(edge.to, edge.relationship.to);
    assert.notEqual(display.anchors.get(edge.from).areaCode, display.anchors.get(edge.to).areaCode);
    assert.equal(edge.relationship.sourceIds, originals.get(edge.id).relationship.sourceIds);
    assert.equal(edge.sourceCount, new Set(edge.relationship.sourceIds).size);
  }
});

test('thread cap retains at most one original edge per directed area pair and first-layer category', () => {
  assert.ok(display.rendered.length <= MAX_THREAD_MESHES);
  assert.equal(new Set(display.rendered.map(edge => keyFor(edge))).size, display.rendered.length);
  for (const edge of display.rendered) {
    assert.equal(edge, display.candidates.find(candidate => keyFor(candidate) === keyFor(edge)));
  }
  assert.deepEqual(planGeographicDisplay(factual).rendered, display.rendered);
});

test('a selected original cross-area edge survives either deduplication or the 60-thread cap', () => {
  const omitted = display.candidates.filter(edge => !display.rendered.includes(edge));
  assert.ok(omitted.length > 0);
  for (const selected of [omitted[0], omitted.at(-1)]) {
    const focused = planGeographicDisplay(factual, selected.id);
    assert.equal(focused.rendered[0], selected);
    assert.ok(focused.rendered.length <= MAX_THREAD_MESHES);
    assert.equal(new Set(focused.rendered.map(edge => keyFor(edge, focused.anchors))).size, focused.rendered.length);
    assert.deepEqual(focused.candidates, display.candidates);
    assert.equal(selected.relationship, original.relationships.find(item => item.id === selected.id));
    assert.equal(selected.sourceCount, new Set(selected.relationship.sourceIds).size);
  }
  assert.deepEqual(planGeographicDisplay(factual, 'not-a-retained-original-edge').rendered, display.rendered);
});

test('explicit reverse direction and a different first-layer category do not collapse into one thread', () => {
  const from = display.groups.get('IN').records.find(node => node.kind === 'entity');
  const to = display.groups.get('IN-TN').records.find(node => node.kind === 'entity');
  const source = original.relationships[0];
  const make = (id, start, end, layers, sourceIds) => {
    const relationship = { ...source, id, from: start.id, to: end.id, layers, sourceIds };
    return { id, relationship, from: relationship.from, to: relationship.to, sourceCount: new Set(sourceIds).size };
  };
  const edges = [
    make('test-only:forward', from, to, ['funding'], [original.sources[0].id]),
    make('test-only:duplicate-pair', from, to, ['funding'], [original.sources[1].id]),
    make('test-only:reverse', to, from, ['funding'], [original.sources[2].id]),
    make('test-only:other-category', from, to, ['legal'], [original.sources[3].id]),
    make('test-only:same-area', from, from, ['funding'], [original.sources[4].id]),
  ];
  const result = planGeographicDisplay({ ...factual, nodes: [from, to], edges });
  assert.deepEqual(result.rendered, [edges[0], edges[2], edges[3]]);
  assert.deepEqual(result.candidates, edges.slice(0, 4));
  assert.deepEqual(edges[0].relationship.sourceIds, [original.sources[0].id], 'deduplication does not union citations');
  assert.equal(edges[0].sourceCount, 1);
  const selected = planGeographicDisplay({ ...factual, nodes: [from, to], edges }, edges[1].id);
  assert.deepEqual(selected.rendered, [edges[1], edges[2], edges[3]]);
});

test('documented groups and anchors ignore arbitrary display positions, without geographic jitter', () => {
  const changed = { ...factual, nodes: factual.nodes.map((node, index) => ({ ...node,
    position: [1000 + index, -50, 500 - index], cluster: `test-only:${index}` })) };
  const result = planGeographicDisplay(changed);
  assert.deepEqual([...result.groups.keys()], [...display.groups.keys()]);
  assert.deepEqual(result.anchors, display.anchors);
  assert.deepEqual(result.rendered, display.rendered);
  for (const [key, group] of result.groups) {
    assert.deepEqual(group.anchor, display.groups.get(key).anchor);
    assert.deepEqual(group.records.map(node => node.id), display.groups.get(key).records.map(node => node.id));
  }
});

test('factual held exclusion survives display grouping while every held item remains readable', () => {
  for (const group of display.groups.values()) for (const node of group.records) {
    assert.equal(isHeldItem(original, node.id), false);
    assert.notEqual(node.item.status, 'not-drawn');
  }
  for (const edge of [...display.candidates, ...display.rendered]) {
    assert.equal(isHeldItem(original, edge.id), false);
    assert.notEqual(edge.relationship.status, 'not-drawn');
  }
  assert.equal(original.held.length, 316);
  assert.equal(original.records.filter(record => isHeldItem(original, record.id)).length, 227);
  assert.equal(complete.nodes.length, 8086);
});

test('original routes preserve the subpath HashRouter destination and exact original route text', () => {
  const bases = ['https://example.test/india-corporate-intelligence/spatial/', 'https://example.test/parent/nested/spatial/'];
  const routes = new Set(['/network', '/investigate?entity=original%3Aid', '/', '/finance?from=2020&to=2026',
    ...original.entities.map(item => item.route), ...original.records.map(item => item.route),
    ...original.relationships.map(item => item.route), ...original.held.map(item => item.route)]);
  for (const base of bases) for (const route of routes) {
    const output = originalRoute(route);
    assert.equal(output, `../#${route}`, route);
    const destination = new URL(output, base);
    assert.equal(destination.origin, new URL(base).origin);
    assert.equal(destination.pathname, new URL('../', base).pathname);
    assert.equal(destination.hash, `#${route}`);
  }
});

test('unsafe external, protocol-relative, backslash and control-character routes fall back safely', () => {
  const badRoutes = ['', 'https://outside.example/path', 'javascript:alert(1)', 'data:text/html,test', '//outside.example/path',
    '///outside.example/path', '\\outside.example', '/\\outside.example', '/network\\path', ' /network', '../network'];
  for (const code of [...Array.from({ length: 32 }, (_, index) => index), ...Array.from({ length: 33 }, (_, index) => index + 127)]) {
    badRoutes.push(`/network${String.fromCharCode(code)}suffix`);
  }
  for (const route of badRoutes) {
    assert.equal(originalRoute(route), '../#/investigate', JSON.stringify(route));
    const destination = new URL(originalRoute(route), 'https://example.test/project/spatial/');
    assert.equal(destination.href, 'https://example.test/project/#/investigate');
  }
});

test('all 3314 source URLs survive exactly, including the seven original HTTP citations', () => {
  assert.equal(original.sources.length, 3314);
  assert.equal(original.sources.filter(source => new URL(source.url).protocol === 'https:').length, 3307);
  assert.equal(original.sources.filter(source => new URL(source.url).protocol === 'http:').length, 7);
  for (const source of original.sources) {
    assert.equal(safeSourceUrl(source.url), source.url, source.id);
  }
});

test('safe HTTP(S) source links retain exact text instead of URL serialization or scheme upgrading', () => {
  for (const url of ['http://example.test/source', 'https://example.test/source?q=1&x=%2f#page=2',
    'HTTPS://EXAMPLE.TEST:443/Unchanged%2fPath', 'HTTP://example.test:80', 'https://example.test',
    'https://example.test:8443/document', 'https://[2001:db8::1]/source', 'https://例え.test/出典']) {
    assert.equal(safeSourceUrl(url), url);
  }
});

test('source link guard rejects non-HTTP schemes, relative links and malformed values', () => {
  const invalid = ['', 'javascript:alert(1)', 'JAVASCRIPT:alert(1)', 'data:text/html,test',
    'file:///tmp/source', 'blob:https://example.test/object', 'mailto:reader@example.test',
    'ftp://example.test/source', '//example.test/source', '/source', '../source', 'example.test/source',
    'http:example.test', 'https:/example.test', 'https:///example.test', 'https:////example.test',
    'https://', 'https://?query=1', 'https://#fragment', 'https://[broken]/source',
    'https://example.test:99999/source', 'https://exa mple.test/source', ' https://example.test/source',
    'https://example.test/source ', 'https://example.test/a b', 'https://example.test\\source',
    'https://example.test/source%', 'https://example.test/source%0', 'https://example.test/source%zz'];
  for (const code of [...Array.from({ length: 32 }, (_, index) => index), ...Array.from({ length: 33 }, (_, index) => index + 127)]) {
    invalid.push(`https://example.test/source${String.fromCharCode(code)}suffix`);
  }
  for (const url of invalid) assert.equal(safeSourceUrl(url), null, JSON.stringify(url));
});
