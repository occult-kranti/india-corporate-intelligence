import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync, brotliCompressSync } from 'node:zlib';

/** Actual Vite output accounting. Raw caps are not network-transfer claims. */
export async function caseBuildBudget(dist) {
  const manifest = JSON.parse(await readFile(join(dist, '.vite/manifest.json'), 'utf8'));
  const keys = { initial: 'index.html', chooser: 'src/profile-host/CaseWorkspace.tsx', reader: 'src/profile-host/reader-runtime.ts', scene: 'src/profile-host/attachScene.ts' };
  for (const key of Object.values(keys)) assert.ok(manifest[key], `Missing actual Vite manifest entry: ${key}`);
  function closure(start) {
    const found = new Set();
    function visit(key) { if (found.has(key)) return; assert.ok(manifest[key], `Missing dependency ${key}`); found.add(key); for (const dep of manifest[key].imports ?? []) visit(dep); }
    visit(start); return [...found];
  }
  const initial = closure(keys.initial), chooser = closure(keys.chooser), reader = closure(keys.reader), scene = closure(keys.scene);
  const initialSet = new Set(initial), readerKeys = [...new Set([...chooser, ...reader])].filter(key => !initialSet.has(key));
  assert.ok(chooser.every(key => initialSet.has(key) || key === keys.chooser), 'Chooser must not import reader/data/graphics');
  assert.ok(reader.every(key => !/SpatialWorld|attachScene|_scene-/.test(key)), 'Complete source reader must not require graphics');
  assert.ok(initial.every(key => !/CaseWorkspace|reader-runtime|attachScene|_state-/.test(key)), 'Initial route must not import case workspace/data');
  for (const target of [keys.reader, keys.scene]) assert.ok(manifest[keys.chooser].dynamicImports?.includes(target), 'Reader and scene must each remain explicit dynamic imports');
  const initialCss = new Set(initial.flatMap(key => manifest[key].css ?? []));
  const readerCss = [...new Set(readerKeys.flatMap(key => manifest[key].css ?? []))].filter(file => !initialCss.has(file));
  const files = [...new Set([...readerKeys.map(key => manifest[key].file), ...readerCss])];
  async function row(file) { const bytes = await readFile(join(dist, file)); return { file, rawBytes: bytes.length, gzipBytes: gzipSync(bytes).length, brotliBytes: brotliCompressSync(bytes).length, sha256: createHash('sha256').update(bytes).digest('hex') }; }
  const readerFiles = await Promise.all(files.map(row));
  const readerTotal = readerFiles.reduce((n, item) => n + item.rawBytes, 0);
  assert.ok(readerTotal <= 350000, `Case reader plus chooser and unique CSS exceeds 350000 raw bytes: ${readerTotal}`);
  const cssRows = readerFiles.filter(item => item.file.endsWith('.css'));
  assert.equal(new Set(cssRows.map(item => item.sha256)).size, cssRows.length, 'Duplicate case CSS content must be deduplicated');
  const initialFiles = await Promise.all(initial.map(key => row(manifest[key].file)));
  const initialBytes = initialFiles.reduce((n, item) => n + item.rawBytes, 0);
  assert.ok(initialBytes <= 220000, `Initial closure exceeds unchanged cap: ${initialBytes}`);
  const alreadyCounted = new Set([...initial, ...readerKeys]);
  const incumbentThree = scene.filter(key => /^_scene-/.test(key));
  assert.equal(incumbentThree.length, 1, 'Case scene must reuse one incumbent Three chunk');
  const sceneIncremental = await Promise.all(scene.filter(key => !alreadyCounted.has(key) && !incumbentThree.includes(key)).map(key => row(manifest[key].file)));
  const sceneBytes = sceneIncremental.reduce((n, item) => n + item.rawBytes, 0);
  assert.ok(sceneBytes <= 41000, `Comparable additional case renderer/host exceeds 41000 raw bytes: ${sceneBytes}`);
  const payloadChunks = [], runtimeSources = [], originalSources = [];
  for (const file of await readdir(join(dist, 'assets'))) {
    if (file.endsWith('.js')) {
      const text = await readFile(join(dist, 'assets', file), 'utf8');
      if (text.includes('olympus.key-dictionary.1')) payloadChunks.push(`assets/${file}`);
    } else if (file.endsWith('.js.map')) {
      const map = JSON.parse(await readFile(join(dist, 'assets', file), 'utf8'));
      runtimeSources.push(...map.sources.filter(source => source.endsWith('/case-data/runtime-transport.ts')).map(source => ({ file, source })));
      originalSources.push(...map.sources.filter(source => source.endsWith('/case-data/reviewed-transport.json')).map(source => ({ file, source })));
    }
  }
  assert.equal(payloadChunks.length, 1, 'Exactly one encoded reviewed payload/decoder chunk is allowed');
  assert.equal(runtimeSources.length, 1, 'Runtime transport must be emitted once');
  assert.equal(originalSources.length, 0, 'Retained original audit transport must not be bundled again');
  assert.ok(readerFiles.some(item => item.file === payloadChunks[0]), 'Payload must be counted in reader budget');
  return { status: 'actual-Vite-emitted-bytes', initialBytes, initialLimit: 220000, readerTotal, readerLimit: 350000,
    readerHeadroom: 350000 - readerTotal, readerFiles, readerCss, sceneBytes, sceneLimit: 41000, sceneIncremental,
    incumbentThree: incumbentThree.map(key => manifest[key].file), initial, chooser, reader, scene, payloadChunks,
    runtimeSources, originalSources, caveat: 'gzip/Brotli are offline estimates. Browser resource timing and initialization latency are separate gates; these figures do not certify mobile hardware or GPU performance.' };
}
