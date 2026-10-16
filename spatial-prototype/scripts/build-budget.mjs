import assert from 'node:assert/strict';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { build } from 'esbuild';
const html = await readFile('dist/index.html', 'utf8');
const entry = html.match(/<script[^>]+src="\.\/([^\"]+)"/)?.[1];
assert.ok(entry, 'Relative entry asset must be present beneath the Pages subpath');
assert.ok(!/rel="modulepreload"[^>]*(SpatialWorld|scene)/.test(html), 'Map runtime must not be preloaded for reading-only entry');
const assets = await readdir('dist/assets');
const reports = [];
for (const [prefix, maxBytes] of [['index-', 220000], ['App-', 400000], ['SpatialWorld-', 1200000], ['scene-', 550000], ['maplibre-gl-worker-', 550000], ['ReviewGate-', 12000], ['ReviewPanel-', 20000], ['loadHistoricalReview-', 100000]]) {
  const name = assets.find(name => name.startsWith(prefix) && name.endsWith('.js'));
  assert.ok(name, `${prefix} JavaScript chunk missing`);
  const content = await readFile(`dist/assets/${name}`);
  assert.ok(content.length <= maxBytes, `${name} exceeds the ${maxBytes} raw-byte budget: ${content.length}`);
  reports.push({ name, bytes: content.length, gzipBytes: gzipSync(content).length, maxBytes });
}
const registry = JSON.parse(await readFile('dist/data/registry/manifest.json', 'utf8'));
assert.equal(registry.totalChunks, 96);
assert.equal(registry.sourceSnapshot.sha256, '048f89ffd008a498212ff2ac71d4413aef09b138a50ab77f336a23fec4722064');
const geometry = [];
for (const prefix of ['world-countries-50m-', 'india-states-wgs84-']) {
  const name = assets.find(name => name.startsWith(prefix) && name.endsWith('.json'));
  assert.ok(name, 'Source geometry must remain a separate JSON asset, not bundled JavaScript');
  const bytes = await readFile(`dist/assets/${name}`);
  geometry.push({ name, bytes: bytes.length, gzipBytes: gzipSync(bytes).length });
}
// Inspect the actual emitted module graph: payload/reader/map imports must remain lazy.
// esbuild is already used by repository tests; this check emits no rebuilt files.
const graph = await build({ entryPoints: [`dist/${entry}`], bundle: true, write: false, metafile: true,
  platform: 'browser', format: 'esm', logLevel: 'silent', external: ['*.json', '*.css'] });
const inputs = graph.metafile.inputs;
function staticClosure(start) {
  const seen = new Set();
  const visit = path => {
    if (seen.has(path)) return;
    seen.add(path);
    for (const dependency of inputs[path]?.imports ?? []) {
      if (!dependency.external && dependency.kind !== 'dynamic-import') visit(dependency.path);
    }
  };
  visit(start);
  return [...seen];
}
const findChunk = prefix => `dist/assets/${reports.find(row => row.name.startsWith(prefix)).name}`;
const initial = staticClosure(`dist/${entry}`);
const prompt = staticClosure(findChunk('ReviewGate-'));
const reader = staticClosure(findChunk('ReviewPanel-'));
const app = staticClosure(findChunk('App-'));
for (const files of [initial, prompt, reader, app]) {
  assert.ok(files.every(path => !/\/(?:loadHistoricalReview|SpatialWorld|scene)-/.test(path)),
    'Review payload and heavy map runtime must stay outside entry, prompt and reading-only static closures');
}
assert.ok(initial.every(path => !/\/(?:ReviewGate|ReviewPanel|App)-/.test(path)), 'The initial shell must not eagerly import the app or review UI');
assert.ok(prompt.every(path => !/\/ReviewPanel-/.test(path)), 'Opening the review prompt must not download the reader');
assert.ok(inputs[findChunk('ReviewGate-')].imports.some(row => row.kind === 'dynamic-import' && row.path === findChunk('loadHistoricalReview-')),
  'Reviewed raw payload must remain a click-triggered dynamic import');
assert.ok(!/rel="modulepreload"[^>]*(ReviewGate|ReviewPanel|loadHistoricalReview)/.test(html), 'Review chunks must not be preloaded from HTML');
const initialBytes = initial.reduce((sum, path) => sum + inputs[path].bytes, 0);
assert.ok(initialBytes <= 220000, `Initial static closure exceeds 220000 bytes: ${initialBytes}`);
const loading = { initial, initialBytes, reviewPrompt: prompt, reviewReader: reader, accessibleApp: app,
  historicalPayloadDeferred: true, publicGraphStatus: 'PUBLIC_GRAPH_BLOCKED' };
const report = { entry, chunks: reports, geometry, loading, registry: { bytes: registry.sourceSnapshot.bytes, chunks: registry.totalChunks }, caveat: 'Build byte counts only. gzip sizes are estimates, not measured network transfers. CI software WebGL is not a device FPS benchmark.' };
await writeFile('dist/build-budget.json', JSON.stringify(report, null, 2)+'\n');
console.log(`Loading budgets passed: entry ${reports[0].bytes} raw bytes; heavy map JavaScript and geometry deferred.`);
