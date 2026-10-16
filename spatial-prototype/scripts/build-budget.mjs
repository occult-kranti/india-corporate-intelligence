import assert from 'node:assert/strict';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
const html = await readFile('dist/index.html', 'utf8');
const entry = html.match(/<script[^>]+src="\.\/([^\"]+)"/)?.[1];
assert.ok(entry, 'Relative entry asset must be present beneath the Pages subpath');
assert.ok(!/rel="modulepreload"[^>]*(SpatialWorld|scene)/.test(html), 'Map runtime must not be preloaded for reading-only entry');
const assets = await readdir('dist/assets');
const reports = [];
for (const [prefix, maxBytes] of [['index-', 220000], ['App-', 400000], ['SpatialWorld-', 1200000], ['scene-', 550000], ['maplibre-gl-worker-', 550000]]) {
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
const report = { entry, chunks: reports, geometry, registry: { bytes: registry.sourceSnapshot.bytes, chunks: registry.totalChunks }, caveat: 'Build byte counts only. gzip sizes are estimates, not measured network transfers. CI software WebGL is not a device FPS benchmark.' };
await writeFile('dist/build-budget.json', JSON.stringify(report, null, 2)+'\n');
console.log(`Loading budgets passed: entry ${reports[0].bytes} raw bytes; heavy map JavaScript and geometry deferred.`);
