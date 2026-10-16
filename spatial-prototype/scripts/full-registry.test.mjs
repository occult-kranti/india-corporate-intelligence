import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { webcrypto } from 'node:crypto';
import { build } from 'esbuild';
import { loadOriginalRegistry } from './original-registry.mjs';
import { packageFullRegistry, MAX_CHUNK_BYTES, REGISTRY_ARRAY_KEYS, sha256 } from './build-full-registry.mjs';

if (!globalThis.crypto) globalThis.crypto = webcrypto;
const temporary = await mkdtemp(join(tmpdir(), 'spatial-full-registry-'));
after(() => rm(temporary, { recursive: true, force: true }));
const outfile = join(temporary, 'registry-loader.mjs');
await build({ entryPoints: ['src/registryLoader.ts'], outfile, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent' });
const { loadFullRegistry, RegistryLoadError } = await import(pathToFileURL(outfile).href);
const original = await loadOriginalRegistry();
const packaged = packageFullRegistry(original);
const BASE = 'https://review.example/india-corporate-intelligence/spatial/data/registry/';
const MANIFEST = `${BASE}manifest.json`;

function fixture() {
  const registry = { updatedAt: original.updatedAt };
  for (const key of REGISTRY_ARRAY_KEYS) registry[key] = [];
  // A small transport fixture spanning six entity chunks plus the original metadata groups.
  registry.entities = Array.from({ length: 12 }, (_, index) => ({ ...original.entities[0], id: `test-only:${index}`, summary: 'x'.repeat(100_000) }));
  registry.held = original.held.slice(0, 1);
  registry.methodology = original.methodology;
  return { registry, ...packageFullRegistry(registry) };
}
const small = fixture();

function transport(files, { delay = () => 0, body = (_file, bytes) => bytes, status = () => 200 } = {}) {
  const state = { active: 0, maximum: 0, requests: [], completed: [], aborted: 0, options: [] };
  const fetch = async (input, options = {}) => {
    const url = new URL(input);
    assert.equal(url.origin, new URL(BASE).origin);
    assert.ok(url.href.startsWith(BASE), 'requests retain the nested app base path');
    const file = url.href.slice(BASE.length);
    state.requests.push(file);
    state.options.push(options);
    state.active++;
    state.maximum = Math.max(state.maximum, state.active);
    try {
      await new Promise((resolve, reject) => {
        let timer;
        const cancel = () => {
          clearTimeout(timer);
          state.aborted++;
          reject(new DOMException('Cancelled', 'AbortError'));
        };
        if (options.signal?.aborted) return cancel();
        options.signal?.addEventListener('abort', cancel, { once: true });
        timer = setTimeout(() => {
          options.signal?.removeEventListener('abort', cancel);
          resolve();
        }, delay(file));
      });
      const bytes = files.get(file);
      const code = bytes ? status(file) : 404;
      state.completed.push(file);
      return new Response(bytes ? body(file, bytes) : 'missing', { status: code });
    } finally { state.active--; }
  };
  return { fetch, state };
}

function changedManifest(files, change) {
  const next = new Map(files);
  const manifest = JSON.parse(next.get('manifest.json').toString('utf8'));
  change(manifest);
  next.set('manifest.json', Buffer.from(JSON.stringify(manifest)));
  return next;
}

function rewriteChunk(files, file, bytes, editDescriptor) {
  const next = changedManifest(files, manifest => {
    for (const group of manifest.arrays) for (const chunk of group.chunks) if (chunk.file === file) {
      chunk.bytes = bytes.length;
      chunk.sha256 = sha256(bytes);
      const newFile = chunk.file.replace(/-[a-f0-9]{12}\.json$/, `-${chunk.sha256.slice(0, 12)}.json`);
      chunk.file = newFile;
      editDescriptor?.(chunk);
    }
  });
  const manifest = JSON.parse(next.get('manifest.json'));
  const oldDescriptor = JSON.parse(files.get('manifest.json')).arrays.flatMap(group => group.chunks).find(chunk => chunk.file === file);
  const newFile = file.replace(/-[a-f0-9]{12}\.json$/, `-${sha256(bytes).slice(0, 12)}.json`);
  assert.ok(oldDescriptor && manifest.arrays.flatMap(group => group.chunks).some(chunk => chunk.file === newFile));
  next.delete(file);
  next.set(newFile, bytes);
  return next;
}

function sourceReferences(value, found = []) {
  if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) {
    if (key === 'sourceIds') found.push(...child);
    else sourceReferences(child, found);
  }
  return found;
}

test('checked-in package exactly matches a deterministic rebuild of the entire original registry', async () => {
  const rebuilt = packageFullRegistry(original);
  assert.deepEqual(rebuilt.manifest, packaged.manifest);
  assert.equal(rebuilt.files.size, packaged.files.size);
  const published = 'public/data/registry';
  const actualFiles = (await readdir(published, { recursive: true, withFileTypes: true }))
    .filter(entry => entry.isFile()).map(entry => join(entry.parentPath ?? entry.path, entry.name).slice(published.length + 1)).sort();
  assert.deepEqual(actualFiles, [...packaged.files.keys()].sort(), 'no absent or stale generated files');
  for (const [file, bytes] of packaged.files) {
    assert.deepEqual(rebuilt.files.get(file), bytes, file);
    assert.deepEqual(await readFile(join(published, file)), bytes, file);
  }
  assert.deepEqual(packaged.manifest.counts, { entities: 2469, relationships: 4203, records: 5617,
    sources: 3314, states: 36, localities: 167, coverage: 32, held: 316, methodology: 5 });
  assert.equal(packaged.manifest.totalRows, 16159);
  assert.equal(packaged.manifest.sourceSnapshot.bytes, 23207262);
  assert.equal(packaged.manifest.sourceSnapshot.sha256, sha256(JSON.stringify(original)));
});

test('all original rows fit the byte limit and exact hashes, offsets and UTF-8 byte sizes are recorded', () => {
  for (const group of packaged.manifest.arrays) {
    let offset = 0;
    for (const chunk of group.chunks) {
      const bytes = packaged.files.get(chunk.file);
      assert.equal(chunk.offset, offset);
      assert.equal(bytes.length, chunk.bytes);
      assert.equal(sha256(bytes), chunk.sha256);
      assert.ok(bytes.length <= MAX_CHUNK_BYTES);
      assert.equal(chunk.oversized, false);
      const rows = JSON.parse(bytes);
      assert.equal(rows.length, chunk.rows);
      assert.deepEqual(rows, original[group.key].slice(offset, offset + rows.length));
      offset += rows.length;
    }
    assert.equal(offset, original[group.key].length);
  }
});

test('a single oversized object is retained whole with an explicit exception', async () => {
  const registry = structuredClone(small.registry);
  registry.entities = [{ ...registry.entities[0], summary: 'é'.repeat(MAX_CHUNK_BYTES) }];
  const result = packageFullRegistry(registry);
  const chunk = result.manifest.arrays[0].chunks[0];
  assert.equal(chunk.oversized, true);
  assert.equal(chunk.rows, 1);
  assert.ok(chunk.bytes > MAX_CHUNK_BYTES);
  const network = transport(result.files);
  assert.deepEqual(await loadFullRegistry({ manifestUrl: MANIFEST, fetch: network.fetch }), registry);
});

test('full async load preserves every value and order despite out-of-order completion, with at most four fetches', async () => {
  const network = transport(packaged.files, { delay: file => file.includes('/0001-') ? 15 : 1 });
  const progress = [];
  const loaded = await loadFullRegistry({ manifestUrl: MANIFEST, fetch: network.fetch, onProgress: value => progress.push(value) });
  assert.deepEqual(loaded, original);
  assert.equal(JSON.stringify(loaded), JSON.stringify(original), 'includes original object property and array order');
  assert.equal(network.state.maximum, 4);
  assert.notDeepEqual(network.state.completed, network.state.requests);
  assert.deepEqual(progress[0], { loadedChunks: 0, totalChunks: 96, loadedRows: 0, totalRows: 16159 });
  assert.deepEqual(progress.at(-1), { loadedChunks: 96, totalChunks: 96, loadedRows: 16159, totalRows: 16159 });
  assert.equal(progress.length, 97);
  for (let index = 1; index < progress.length; index++) {
    assert.equal(progress[index].loadedChunks, progress[index - 1].loadedChunks + 1);
    assert.ok(progress[index].loadedRows > progress[index - 1].loadedRows);
  }
  for (const options of network.state.options) {
    assert.equal(options.credentials, 'omit');
    assert.equal(options.redirect, 'error');
    assert.equal(options.cache, 'default');
  }
  const sources = new Set(loaded.sources.map(source => source.id));
  assert.ok(sourceReferences(loaded).every(id => sources.has(id)), 'source closure includes nested geography and held citations');
  assert.deepEqual(loaded.held, original.held);
  const heldIds = new Set(loaded.held.map(row => row.id));
  assert.ok([...loaded.entities, ...loaded.relationships].every(row => !heldIds.has(row.id)));
  const heldResponses = loaded.records.filter(row => heldIds.has(row.id));
  assert.equal(heldResponses.length, 227);
  assert.ok(heldResponses.every(row => row.status === 'not-drawn'));
  assert.deepEqual(heldResponses, original.records.filter(row => heldIds.has(row.id)));
});

test('relative default manifest URL resolves at the actual nested deployment path', async () => {
  const beforeDocument = globalThis.document;
  const beforeLocation = globalThis.location;
  globalThis.document = { baseURI: 'https://review.example/india-corporate-intelligence/spatial/' };
  globalThis.location = new URL(globalThis.document.baseURI);
  try {
    const network = transport(small.files);
    assert.deepEqual(await loadFullRegistry({ fetch: network.fetch }), small.registry);
    assert.equal(network.state.requests[0], 'manifest.json');
    await assert.rejects(loadFullRegistry({ manifestUrl: 'https://other.example/manifest.json', fetch: network.fetch }),
      error => error instanceof RegistryLoadError && error.code === 'MANIFEST');
  } finally {
    if (beforeDocument === undefined) delete globalThis.document; else globalThis.document = beforeDocument;
    if (beforeLocation === undefined) delete globalThis.location; else globalThis.location = beforeLocation;
  }
});

test('missing/failed chunks reject the whole load and a fresh reload retry succeeds', async () => {
  for (const code of [404, 503]) {
    const missing = small.manifest.arrays[0].chunks[0].file;
    const network = transport(small.files, { status: file => file === missing ? code : 200, delay: file => file === missing ? 0 : 10 });
    await assert.rejects(loadFullRegistry({ manifestUrl: MANIFEST, fetch: network.fetch }), error =>
      error instanceof RegistryLoadError && error.code === 'HTTP' && error.retryable && error.url.endsWith(missing));
    await new Promise(resolve => setTimeout(resolve, 15));
    assert.equal(network.state.active, 0);
    assert.ok(network.state.aborted > 0, 'failure cancels sibling requests');
    const retried = transport(small.files);
    assert.deepEqual(await loadFullRegistry({ manifestUrl: MANIFEST, fetch: retried.fetch, cache: 'reload' }), small.registry);
    assert.ok(retried.state.options.every(options => options.cache === 'reload'));
  }
});

test('network rejection is actionable and never yields a partial registry', async () => {
  await assert.rejects(loadFullRegistry({ manifestUrl: MANIFEST, fetch: async () => { throw new TypeError('offline'); } }),
    error => error instanceof RegistryLoadError && error.code === 'NETWORK' && error.retryable && /connection.*retry/.test(error.message));
});

test('same-byte-length chunk corruption fails SHA-256 verification', async () => {
  const target = small.manifest.arrays[0].chunks[0].file;
  const network = transport(small.files, { body: (file, bytes) => {
    if (file !== target) return bytes;
    const corrupt = Buffer.from(bytes);
    corrupt[corrupt.indexOf('test-only')] = 'b'.charCodeAt(0);
    return corrupt;
  } });
  await assert.rejects(loadFullRegistry({ manifestUrl: MANIFEST, fetch: network.fetch }),
    error => error.code === 'INTEGRITY' && /SHA-256 mismatch/.test(error.message));
});

test('truncated chunks fail byte-length validation', async () => {
  const target = small.manifest.arrays[0].chunks[0].file;
  const network = transport(small.files, { body: (file, bytes) => file === target ? bytes.subarray(1) : bytes });
  await assert.rejects(loadFullRegistry({ manifestUrl: MANIFEST, fetch: network.fetch }),
    error => error.code === 'INTEGRITY' && /byte length mismatch/.test(error.message));
});

test('matching chunk hashes do not bypass JSON or row-count validation', async () => {
  const target = small.manifest.arrays[0].chunks[0].file;
  for (const bytes of [Buffer.from('not-json\n'), Buffer.from('[{}]\n')]) {
    const files = rewriteChunk(small.files, target, bytes);
    const network = transport(files);
    await assert.rejects(loadFullRegistry({ manifestUrl: MANIFEST, fetch: network.fetch }),
      error => error.code === 'INTEGRITY' && /not UTF-8 JSON|row count mismatch/.test(error.message));
  }
});

test('complete-snapshot verification catches validly rehashed but altered evidence', async () => {
  const target = small.manifest.arrays[0].chunks[0].file;
  const rows = JSON.parse(small.files.get(target));
  rows[0].summary = 'changed evidence';
  const files = rewriteChunk(small.files, target, Buffer.from(JSON.stringify(rows)));
  const network = transport(files);
  const progress = [];
  await assert.rejects(loadFullRegistry({ manifestUrl: MANIFEST, fetch: network.fetch, onProgress: value => progress.push(value) }),
    error => error.code === 'INTEGRITY' && /complete source snapshot mismatch/.test(error.message));
  assert.ok(progress.every(value => value.loadedChunks < value.totalChunks), 'no completion progress before full snapshot validation');
});

test('invalid manifest counts, offsets, paths, groups and snapshot metadata fail before any chunk request', async () => {
  const changes = [
    manifest => { manifest.totalRows++; },
    manifest => { manifest.totalChunks--; },
    manifest => { manifest.counts.held++; },
    manifest => { manifest.arrays[0].chunks[0].offset++; },
    manifest => { manifest.arrays[0].chunks[0].file = 'https://other.example/data.json'; },
    manifest => { manifest.arrays[0].chunks[0].file = '../outside.json'; },
    manifest => { manifest.arrays.pop(); },
    manifest => { manifest.topLevelKeys[1] = manifest.topLevelKeys[2]; },
    manifest => { manifest.sourceSnapshot.updatedAt = 'changed'; },
    manifest => { manifest.arrays[0].chunks[0].oversized = true; },
    manifest => { manifest.arrays[0].chunks[0].sha256 = 'not-a-hash'; },
  ];
  for (const change of changes) {
    const network = transport(changedManifest(small.files, change));
    await assert.rejects(loadFullRegistry({ manifestUrl: MANIFEST, fetch: network.fetch }), error => error.code === 'MANIFEST');
    assert.deepEqual(network.state.requests, ['manifest.json']);
  }
});

test('missing or HTML manifest returns an actionable load error', async () => {
  const missing = new Map(small.files);
  missing.delete('manifest.json');
  await assert.rejects(loadFullRegistry({ manifestUrl: MANIFEST, fetch: transport(missing).fetch }), error => error.code === 'HTTP');
  const network = transport(small.files, { body: (file, bytes) => file === 'manifest.json' ? '<html>not found</html>' : bytes });
  await assert.rejects(loadFullRegistry({ manifestUrl: MANIFEST, fetch: network.fetch }), error => error.code === 'MANIFEST');
});

test('already-aborted loads make no request', async () => {
  const controller = new AbortController();
  controller.abort();
  const network = transport(small.files);
  await assert.rejects(loadFullRegistry({ manifestUrl: MANIFEST, fetch: network.fetch, signal: controller.signal }), { name: 'AbortError' });
  assert.deepEqual(network.state.requests, []);
});

test('cancellation during fetch aborts all workers and never emits progress afterwards', async () => {
  const controller = new AbortController();
  const progress = [];
  const network = transport(small.files, { delay: file => file === 'manifest.json' ? 0 : 50 });
  const loading = loadFullRegistry({ manifestUrl: MANIFEST, fetch: network.fetch, signal: controller.signal,
    onProgress: value => {
      progress.push(value);
      if (!value.loadedChunks) setTimeout(() => controller.abort(), 10);
    } });
  await assert.rejects(loading, { name: 'AbortError' });
  const length = progress.length;
  await new Promise(resolve => setTimeout(resolve, 60));
  assert.equal(progress.length, length);
  assert.equal(network.state.active, 0);
  assert.equal(network.state.aborted, 4);
  assert.equal(network.state.maximum, 4);
});

test('a non-cooperative fetch cannot publish late chunk progress after cancellation', async () => {
  const controller = new AbortController();
  const network = transport(small.files, { delay: file => file === 'manifest.json' ? 0 : 15 });
  const progress = [];
  const fetch = (input, options) => network.fetch(input, { ...options, signal: undefined });
  const loading = loadFullRegistry({ manifestUrl: MANIFEST, fetch, signal: controller.signal,
    onProgress: value => { progress.push(value); setTimeout(() => controller.abort(), 5); } });
  await assert.rejects(loading, { name: 'AbortError' });
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(progress.length, 1);
  assert.equal(network.state.requests.length, 5, 'only the manifest and first four chunks start');
  assert.equal(network.state.active, 0);
});

test('cancellation while fetching the manifest is an AbortError and starts no chunks', async () => {
  const controller = new AbortController();
  const network = transport(small.files, { delay: () => 30 });
  const progress = [];
  const loading = loadFullRegistry({ manifestUrl: MANIFEST, fetch: network.fetch, signal: controller.signal,
    onProgress: value => progress.push(value) });
  controller.abort();
  await assert.rejects(loading, { name: 'AbortError' });
  assert.deepEqual(network.state.requests, ['manifest.json']);
  assert.deepEqual(progress, []);
});

test('packager rejects any value that would be silently lost by JSON serialization', () => {
  const invalid = structuredClone(small.registry);
  invalid.entities[0].summary = undefined;
  assert.throws(() => packageFullRegistry(invalid), /losslessly JSON serializable/);
});
