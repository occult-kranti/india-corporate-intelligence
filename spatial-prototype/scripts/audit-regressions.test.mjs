import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as THREE from 'three';
import { build } from 'esbuild';
import { loadOriginalRegistry } from './original-registry.mjs';

const require = createRequire(import.meta.url);
const temporary = await mkdtemp(join(tmpdir(), 'spatial-audit-regressions-'));
after(() => rm(temporary, { recursive: true, force: true }));

async function load(entry, name) {
  const outfile = join(temporary, `${name}.mjs`);
  await build({
    entryPoints: [entry], outfile, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent',
    plugins: [{ name: 'offline-component-boundaries', setup(builder) {
      builder.onResolve({ filter: /^(?:react(?:\/.*)?|three|lucide-react)$/ }, args => ({ path: require.resolve(args.path), external: true }));
      builder.onResolve({ filter: /^\.\/SpatialWorld$/ }, () => ({ path: 'spatial-stub', namespace: 'audit-test' }));
      builder.onResolve({ filter: /^maplibre-gl$/ }, () => ({ path: 'maplibre-stub', namespace: 'audit-test' }));
      builder.onResolve({ filter: /maplibre-gl-worker\.mjs\?worker&url$/ }, () => ({ path: 'worker-stub', namespace: 'audit-test' }));
      builder.onLoad({ filter: /.*/, namespace: 'audit-test' }, ({ path }) => ({ loader: 'js', contents:
        path === 'maplibre-stub'
          ? 'export class Map {}; export class MercatorCoordinate {}; export class LngLatBounds {}; export const setWorkerUrl = () => {};'
          : path === 'worker-stub' ? 'export default "offline-worker";'
            : 'export default function SpatialWorld() { return null; }',
      }));
    } }],
  });
  return import(pathToFileURL(outfile).href);
}

const [{ default: App }, { default: RegistryReader }, { default: MapBoundary }, model, geography, { EvidenceWorld }] = await Promise.all([
  load('src/App.tsx', 'app'), load('src/RegistryReader.tsx', 'reader'), load('src/MapBoundary.tsx', 'map-boundary'),
  load('src/model.ts', 'model'), load('src/geography.ts', 'geography'), load('src/scene.ts', 'scene'),
]);
const original = await loadOriginalRegistry();
const complete = model.buildEvidenceScene(original);
const factual = model.factualScene(complete);
const sourceById = new Map(original.sources.map(source => [source.id, source]));

// Exercise real component event handlers and their next-render props without a
// DOM, WebGL, network, or a browser. Effects are deliberately not simulated;
// this specifically catches state that must reset before a child is unmounted.
function componentHarness(Component, props) {
  const slots = [];
  let cursor = 0;
  const useSlot = initial => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
    return [slots[index], update => { slots[index] = typeof update === 'function' ? update(slots[index]) : update; }];
  };
  const dispatcher = {
    useState: useSlot,
    useRef: initial => useSlot(() => ({ current: initial }))[0],
    useMemo: factory => factory(),
    useCallback: callback => callback,
    useDeferredValue: value => value,
    useEffect() {},
    useLayoutEffect() {},
  };
  return {
    render(nextProps = props) {
      props = nextProps;
      cursor = 0;
      const current = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher;
      const previous = current.current;
      current.current = dispatcher;
      try { return Component(props); } finally { current.current = previous; }
    },
  };
}

function elements(tree) {
  const result = [];
  const visit = value => {
    if (Array.isArray(value)) value.forEach(visit);
    else if (React.isValidElement(value)) { result.push(value); visit(value.props.children); }
  };
  visit(tree);
  return result;
}
function textOf(tree) {
  if (Array.isArray(tree)) return tree.map(textOf).join('');
  if (React.isValidElement(tree)) return textOf(tree.props.children);
  return typeof tree === 'string' || typeof tree === 'number' ? String(tree) : '';
}
const normalizedText = tree => textOf(tree).replace(/\s+/g, ' ').trim();
function one(tree, predicate, label) {
  const matches = elements(tree).filter(predicate);
  assert.equal(matches.length, 1, `${label}: expected one element, found ${matches.length}`);
  return matches[0];
}
const button = (tree, label) => one(tree, element => element.type === 'button'
  && (element.props['aria-label'] === label || normalizedText(element) === label), `button ${label}`);
const world = tree => one(tree, element => element.props.data?.registry && typeof element.props.onJourney === 'function', 'map component');
const reader = tree => one(tree, element => element.props.scene?.registry && typeof element.props.onSelect === 'function', 'registry reader');
const escaped = value => renderToStaticMarkup(React.createElement('span', null, value)).replace(/^<span>|<\/span>$/g, '');

const globals = new Map(['window', 'location', 'localStorage', 'document', 'HTMLElement', 'cancelAnimationFrame'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
Object.assign(globalThis, {
  window: { matchMedia: () => ({ matches: false }) }, location: { search: '' },
  localStorage: { getItem: () => null }, document: { activeElement: null },
  HTMLElement: class HTMLElement {}, cancelAnimationFrame: () => {},
});
after(() => { for (const [key, descriptor] of globals) {
  if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
} });
const appHarness = () => componentHarness(App, { registry: original, dataset: 'full' });

function renderHeld(scene, query = '') {
  const harness = componentHarness(RegistryReader, { scene, selected: '', query, namespace: '', onSelect() {} });
  const initial = harness.render();
  one(initial, element => element.type === 'button' && normalizedText(element).startsWith('Held review queue'), 'held tab').props.onClick();
  return renderToStaticMarkup(harness.render());
}

test('all four cited held-only entries expose exact sources, including both withdrawn Waaree citations', () => {
  const evidenceIds = new Set([...original.entities, ...original.records, ...original.relationships].map(item => item.id));
  const heldOnly = original.held.filter(row => !evidenceIds.has(row.id) && row.sourceIds.length);
  assert.equal(heldOnly.length, 4);
  const waaree = heldOnly.find(row => row.id.includes('waaree'));
  assert.ok(waaree);
  assert.equal(new Set(waaree.sourceIds).size, 2);
  for (const row of heldOnly) {
    const html = renderHeld(complete, row.id);
    assert.ok(html.includes(`data-held-id="${escaped(row.id)}"`));
    assert.ok(html.includes(escaped(row.reason)));
    assert.ok(html.includes(`Retained citations (${new Set(row.sourceIds).size})`));
    assert.ok(!html.includes('Read retained counter-context'), 'held-only rows must not imply an available record inspector');
    for (const id of row.sourceIds) {
      const source = sourceById.get(id);
      assert.ok(source, id);
      for (const text of [id, source.title, source.publisher, source.locator, ...source.limitations]) {
        assert.ok(html.includes(escaped(text)), `${row.id}: missing retained citation text ${text}`);
      }
      assert.ok(html.includes(`href="${escaped(source.url)}"`), `${id}: original URL must survive`);
    }
  }
});

test('held citations deduplicate IDs and show explicit missing/empty provenance without unsafe links', () => {
  const source = { ...original.sources[0], id: 'audit:unsafe-source', url: 'javascript:alert(1)', title: 'Unsafe retained URL' };
  const held = [
    { ...original.held[0], id: 'audit:cited-held', sourceIds: [source.id, source.id, 'audit:missing-source'] },
    { ...original.held[0], id: 'audit:uncited-held', sourceIds: [] },
  ];
  const scene = { ...complete, registry: { ...original, sources: [source], held } };
  const html = renderHeld(scene);
  assert.match(html, /Retained citations \(2\)/);
  assert.equal(html.split('Unsafe retained URL').length - 1, 1);
  assert.ok(!html.includes('href="javascript:'), 'unsafe retained URL must not become navigation');
  assert.match(html, /Retained source ID audit:missing-source; no matching source object/);
  assert.match(html, /No direct citation is retained on this held entry/);
});

test('retained held counter-context keeps both its inspector action and citations', () => {
  const held = original.held.find(row => row.sourceIds.length && original.records.some(record => record.id === row.id));
  assert.ok(held);
  const html = renderHeld(complete, held.id);
  assert.match(html, /Read retained counter-context/);
  assert.ok(html.includes(`Retained citations (${new Set(held.sourceIds).size})`));
});

test('Follow is disabled for a filtered-out relationship even when both exact endpoints remain mapped', () => {
  const harness = appHarness();
  let tree = harness.render();
  button(tree, '5D · Layers').props.onClick();
  tree = harness.render();
  button(tree, 'Funding & debt').props.onClick();
  tree = harness.render();
  const edge = complete.edges.find(edge => edge.id === 'legacy:relationship:d517bdaf4d970195|eav|own|co:larsen-toubro');
  assert.ok(edge);
  let map = world(tree);
  assert.ok(!map.props.data.edges.some(candidate => candidate.id === edge.id));
  for (const id of [edge.from, edge.to]) {
    const node = map.props.data.nodes.find(node => node.id === id);
    assert.ok(node && geography.getNodeAnchor(node), `endpoint ${id} must stay mapped`);
  }
  map.props.onSelect(edge.id, 'edge');
  tree = harness.render();
  assert.equal(button(tree, 'Follow this thread').props.disabled, true);
  assert.equal(button(tree, 'Follow thread').props.disabled, true);
  map = world(tree);
  const eligible = map.props.data.edges.find(candidate => [candidate.from, candidate.to].every(id => {
    const node = map.props.data.nodes.find(node => node.id === id);
    return node && geography.getNodeAnchor(node);
  }));
  assert.ok(eligible);
  map.props.onSelect(eligible.id, 'edge');
  tree = harness.render();
  assert.equal(button(tree, 'Follow this thread').props.disabled, false, 'eligible mapped relationships remain followable');
});

test('Find on felt becomes disabled when a new search excludes the inspected geographic item', () => {
  const harness = appHarness();
  let tree = harness.render();
  const node = factual.nodes.find(node => geography.getNodeAnchor(node));
  assert.ok(node);
  world(tree).props.onSelect(node.id, 'node');
  tree = harness.render();
  assert.equal(button(tree, 'Find on felt').props.disabled, false);
  one(tree, element => element.props['aria-label'] === 'Search retained records', 'search input').props.onChange({ target: { value: 'audit-no-such-record-872329' } });
  tree = harness.render();
  assert.ok(!world(tree).props.data.nodes.some(candidate => candidate.id === node.id));
  assert.equal(button(tree, 'Find on felt').props.disabled, true);
});

const readingRoutes = [
  ['overview reader', tree => one(tree, element => element.props.className === 'overview-read', 'overview reader').props.onClick()],
  ['keyboard reader', tree => one(tree, element => element.type === 'button' && normalizedText(element).startsWith('Open searchable keyboard reader'), 'keyboard reader').props.onClick()],
  ['reading dock', tree => button(tree, 'Reading').props.onClick()],
  ['unplaced reader', tree => button(tree, 'Read and search all unplaced items').props.onClick()],
  ['documented-area reader', (tree, harness) => {
    const node = world(tree).props.data.nodes.find(node => geography.getNodeAnchor(node));
    world(tree).props.onSelect(node.id, 'node');
    tree = harness.render();
    one(tree, element => element.type === 'button' && normalizedText(element).startsWith('Browse all records in '), 'area reader').props.onClick();
  }],
  ['graphics runtime failure', tree => world(tree).props.onFailure('Offline simulated graphics failure'), true],
  ['graphics lazy boundary failure', tree => one(tree, element => typeof element.type === 'function'
    && typeof element.type.getDerivedStateFromError === 'function', 'map-local error boundary').props.onFailure('Offline simulated chunk failure'), true],
];
for (const [label, enter, failed] of readingRoutes) test(`${label} clears command and journey before map teardown`, () => {
  const harness = appHarness();
  let tree = harness.render();
  world(tree).props.onJourney({ phase: 'moving', progress: 0.3, edgeId: factual.edges[0].id });
  button(tree, 'Home camera').props.onClick();
  tree = harness.render();
  assert.equal(world(tree).props.command.type, 'home');
  assert.ok(elements(tree).some(element => element.props['aria-label'] === 'Camera journey'));
  enter(tree, harness);
  tree = harness.render();
  assert.ok(reader(tree), 'full registry reader must be available');
  assert.ok(!elements(tree).some(element => element.props['aria-label'] === 'Camera journey'), 'stale journey must not survive');
  assert.ok(!elements(tree).some(element => element.props.data?.registry && element.props.onJourney), 'map is unmounted in reading mode');
  const explore = button(tree, 'Explore');
  if (failed) assert.equal(explore.props.disabled, true);
  else {
    explore.props.onClick();
    tree = harness.render();
    assert.equal(world(tree).props.command, null, 'remount must not replay an earlier camera command');
  }
});

test('map-local boundary reports failure and removes only its own child', () => {
  const failures = [];
  const boundary = new MapBoundary({ children: 'map child', onFailure: reason => failures.push(reason) });
  assert.equal(boundary.render(), 'map child');
  boundary.state = MapBoundary.getDerivedStateFromError(new Error('map chunk failed'));
  boundary.componentDidCatch(new Error('map chunk failed'));
  assert.equal(boundary.render(), null);
  assert.deepEqual(failures, ['map chunk failed']);
});

test('EvidenceWorld disposal emits idle and clears its journey without constructing a map', () => {
  const states = [];
  const calls = [];
  const instance = Object.create(EvidenceWorld.prototype);
  Object.assign(instance, {
    disposed: false, journey: { edgeId: 'audit:edge', paused: false }, raf: 0,
    beforeGraphicsDispose: new Set(),
    cb: { onJourney: state => states.push(state) }, observer: { disconnect: () => calls.push('disconnect') },
    map: { getCanvas: () => ({ removeEventListener: () => calls.push('listener') }), remove: () => calls.push('map') },
    group: new THREE.Group(), curveGroup: new THREE.Group(), renderer: { dispose: () => calls.push('renderer') },
  });
  instance.dispose();
  assert.equal(instance.disposed, true);
  assert.equal(instance.journey, null);
  assert.deepEqual(states, [{ phase: 'idle', progress: 0, edgeId: null }]);
  assert.deepEqual(calls, ['disconnect', 'listener', 'renderer', 'map']);
});

test('entity-own-ID search keeps eligible dated context without requiring that ID in record wording', () => {
  const entity = { ...original.entities[0], id: 'audit:independent-entity-key', label: 'Independent entity label', summary: '', sourceIds: [] };
  const record = { ...original.records[0], id: 'audit:ordinary-record', title: 'Unrelated record wording', summary: '', sourceIds: [],
    status: 'documented', entityIds: [entity.id], relationshipIds: [], fromDate: '2024-06-01', toDate: null };
  const registry = { ...original, entities: [entity], records: [record], relationships: [], held: [] };
  const result = model.filterScene(model.factualScene(model.buildEvidenceScene(registry)), {
    query: entity.id, fromYear: 2024, toYear: 2024, includeUndated: false,
  });
  assert.deepEqual(result.nodes.map(node => node.id), [entity.id]);
  assert.deepEqual(result.edges, []);
});

test('held/not-drawn records and relationships cannot supply the entity temporal-search index', () => {
  const entity = { ...original.entities[0], id: 'audit:temporal-entity', label: 'Temporal entity', summary: '', sourceIds: [] };
  const record = { ...original.records[0], id: 'audit:temporal-record', title: 'Withheld temporal marker', summary: '', sourceIds: [],
    status: 'documented', entityIds: [entity.id], relationshipIds: [], fromDate: '2024-06-01', toDate: null };
  const relationship = { ...original.relationships[0], id: 'audit:temporal-edge', label: 'Withheld temporal edge', summary: '', sourceIds: [],
    status: 'documented', from: entity.id, to: entity.id, fromDate: '2024-06-01', toDate: null };
  const filter = { query: entity.id, fromYear: 2024, toYear: 2024, includeUndated: false };
  for (const kind of ['record', 'relationship']) for (const status of ['held', 'not-drawn']) {
    const item = { ...(kind === 'record' ? record : relationship), status: status === 'not-drawn' ? status : 'documented' };
    const registry = { ...original, entities: [entity], records: kind === 'record' ? [item] : [],
      relationships: kind === 'relationship' ? [item] : [], held: status === 'held' ? [{ ...original.held[0], id: item.id }] : [] };
    const all = model.buildEvidenceScene(registry);
    assert.ok(model.filterScene(all, filter).nodes.some(node => node.id === entity.id), `${kind}/${status}: retained reader has dated context`);
    const filtered = model.filterScene(model.factualScene(all), filter);
    assert.deepEqual(filtered.nodes, [], `${kind}/${status}: withheld date must not make factual entity eligible`);
    assert.deepEqual(filtered.edges, []);
    assert.equal(filtered.registry, registry, 'reader snapshot remains complete');
  }
});

test('country-stack control stays visible when its selected endpoint label collides', () => {
  const instance = Object.create(EvidenceWorld.prototype);
  const node = factual.nodes[0];
  const country = { key: 'country-stack:IN', kind: 'country-stack', records: [node], selectedIds: [], anchor: { lng: 78, lat: 22, label: 'India' }, memberCount: 3838, areaCount: 37, countryLabel: 'India' };
  const endpoint = { ...country, key: 'selected-area:IN-29', kind: 'selected-area', selectedIds: [node.id] };
  let labels;
  Object.assign(instance, { lastLabels: 0, container: { clientWidth: 1000, clientHeight: 800 },
    displayGroups: new Map([[endpoint.key, endpoint], [country.key, country]]), selected: node.id,
    map: { project: () => ({ x: 500, y: 400 }), getZoom: () => 1.5 }, data: { edges: [] },
    cb: { onLabels: value => { labels = value; } },
  });
  instance.updateLabels(true);
  assert.equal(labels.find(label => label.kind === 'stack').visible, true);
  assert.match(labels.find(label => label.kind === 'stack').title, /3838 items · 37 areas · Expand/);
  assert.equal(labels.filter(label => label.visible).length, 1);
});

test('stack expansion changes only camera focus and never selects a synthetic evidence item', () => {
  const instance = Object.create(EvidenceWorld.prototype);
  const poses = [], selections = [];
  Object.assign(instance, { ready: true, anchors: new Map(), pose: () => ({ center: [27, 18], zoom: 1.5, pitch: 18, bearing: 0 }),
    displayGroups: new Map([['country-stack:IN', { kind: 'country-stack', anchor: { lng: 78, lat: 22, focusZoom: 4 } }]]),
    cb: { onSelect: id => selections.push(id) }, go: pose => poses.push(pose),
  });
  instance.command({ type: 'expand-stack', id: 'country-stack:IN', stamp: 0 });
  assert.deepEqual(poses, [{ center: [78, 22], zoom: 4, pitch: 18, bearing: 0 }]);
  assert.deepEqual(selections, []);
  instance.command({ type: 'expand-stack', id: 'unknown-display-group', stamp: 1 });
  assert.equal(poses.length, 1);
});
