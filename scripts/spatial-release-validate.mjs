import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { copyFile, lstat, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Deliberate review pins. A new source snapshot requires a new review, never regeneration here.
export const BASE_COMMIT = 'ba6ce850bcb8cb62e4d81f1f1ff6df4406a1877a';
export const BASE_FILES = Object.freeze({
  '.github/workflows/deploy.yml': '790a9f12456aab7a95d5b20170ae4de9dd3b1893',
  'src/App.tsx': 'a7313dc0ba578f80b5a997d05a833e50f396727f',
  'src/components/Layout.tsx': '258da962b4279ec357886745f771e019c6532718',
  'vite.config.ts': '7ebf285aee30d629236fb60ed4accd87595f5b0c',
  'package.json': '8f1f91cb50c1cd5e8f3b3018cfe2b4d684f58a55',
  'scripts/build-global-workbench.mjs': '3bd798973733298c454de89779c0af7851288219',
  'scripts/global-workbench.test.mjs': '22a6d03d9802103103a7d2adac4960f7063ce4d0',
  'src/components/investigation/shell.css': 'e638b551c2a20d00c0ad47e4ed91ccdab844500f',
  'src/data/investigation.ts': '4aee0a6730e9d5c094aa37027d0efaa5e51e8e12',
});
// Exact reviewed code revisions; historical base pins and immutable data pins remain intact.
export const REVIEWED_SOURCE_REVISIONS = Object.freeze({
  'package.json': Object.freeze({ gitBlob: 'e7fe46c0b4930888604a9c3e272d4ce81795def5', reason: 'Appends the exact source-correction regression test to the existing investigation gate; no prior script is removed.' }),
  'src/data/investigation.ts': Object.freeze({ gitBlob: '232752e7927ae8901fe26be99a1cc09f6ca5da30', reason: 'Separates corrected runtime exports from the dedicated retained audit builder; canonical snapshot stays unchanged.' }),
});
export const ARRAY_KEYS = Object.freeze(['entities', 'relationships', 'records', 'sources', 'states', 'localities', 'coverage', 'held', 'methodology']);
export const REVIEWED_REGISTRY = Object.freeze({
  manifestSha256: 'd551897418cc8b9db640293863ab04718408a6b3e6e7a9ef2a7c863d072ef323',
  snapshotSha256: '048f89ffd008a498212ff2ac71d4413aef09b138a50ab77f336a23fec4722064',
  snapshotBytes: 23207262,
  updatedAt: '2026-10-07',
  totalChunks: 96,
  totalRows: 16159,
  counts: Object.freeze({ entities: 2469, relationships: 4203, records: 5617, sources: 3314, states: 36, localities: 167, coverage: 32, held: 316, methodology: 5 }),
});
export const SPATIAL_NAV_LINE = '        <a className="site-nav-link" href={`${import.meta.env.BASE_URL}spatial/`} onClick={onNavigate}><Map size={16} aria-hidden="true" /><span>Spatial evidence atlas</span></a>\n';
export const ACTIVITY_NAV_LINE = '        <a className="site-nav-link" href={`${import.meta.env.BASE_URL}research-activity/`} onClick={onNavigate}><Notebook size={16} aria-hidden="true" /><span>Research activity</span></a>\n';
const GLOBAL_NAV_LINE = '        <a className="site-nav-link" href="./global-workbench/" onClick={onNavigate}><Globe2 size={16} aria-hidden="true" /><span>Global evidence workbench</span></a>\n';
export const REQUIRED_ROOT_ENTRIES = Object.freeze(['index.html', 'global-workbench/index.html', 'global-workbench/finance.html', 'global-workbench/media.html']);
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export const gitBlobSha = bytes => {
  const content = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  return createHash('sha1').update(`blob ${content.length}\0`).update(content).digest('hex');
};

export function stripSpatialNavigation(text) {
  assert.equal(text.split(SPATIAL_NAV_LINE).length - 1, 1, 'Layout must contain exactly the reviewed spatial link line');
  assert.ok(text.includes(SPATIAL_NAV_LINE + GLOBAL_NAV_LINE), 'Spatial link must immediately precede the preserved global-workbench link');
  assert.equal(text.split(ACTIVITY_NAV_LINE).length - 1, 1, 'Layout must contain exactly the reviewed activity link line');
  assert.ok(text.includes(ACTIVITY_NAV_LINE + SPATIAL_NAV_LINE), 'Activity link must immediately precede the reviewed spatial link');
  return text.replace(ACTIVITY_NAV_LINE, '').replace(SPATIAL_NAV_LINE, '');
}

/** Remove only complete marked addition lines; preserve all other bytes, including blank lines. */
export function stripSpatialDeployAdditions(text) {
  const lines = text.match(/[^\n]*\n|[^\n]+$/g) ?? [];
  const output = [];
  const names = new Set();
  let active = null;
  for (const line of lines) {
    const marker = /^ {6}# (BEGIN|END) SPATIAL ADDITION ([A-Za-z0-9_-]+)\n?$/.exec(line);
    if (marker) {
      const [, operation, name] = marker;
      if (operation === 'BEGIN') {
        assert.equal(active, null, 'Spatial deploy blocks must not nest');
        assert.ok(!names.has(name), `Duplicate spatial deploy block: ${name}`);
        names.add(name);
        active = name;
      } else {
        assert.equal(active, name, 'Spatial deploy block end must match its begin');
        active = null;
      }
    } else {
      assert.ok(!line.includes('SPATIAL ADDITION'), 'Malformed spatial deploy marker');
      if (active === null) output.push(line);
    }
  }
  assert.equal(active, null, 'Unclosed spatial deploy block');
  assert.ok(names.size > 0, 'Deploy workflow must contain reviewed spatial addition blocks');
  return output.join('');
}

export async function assertPlainPath(root, relative, expectedType) {
  assert.ok(relative && !relative.startsWith('/') && !relative.includes('\\') && !relative.split('/').some(part => !part || part === '.' || part === '..'), `Unsafe relative path: ${relative}`);
  let current = root;
  assert.ok((await lstat(root)).isDirectory(), 'Repository root must be a real directory');
  const parts = relative.split('/');
  for (const [index, part] of parts.entries()) {
    current = join(current, part);
    const stat = await lstat(current);
    assert.ok(!stat.isSymbolicLink(), `Symlinks are not allowed: ${relative}`);
    if (index < parts.length - 1 || expectedType === 'directory') assert.ok(stat.isDirectory(), `Expected directory: ${relative}`);
    else if (expectedType === 'file') assert.ok(stat.isFile(), `Expected regular file: ${relative}`);
  }
  return current;
}

export async function validatePinnedSources(root, pins = BASE_FILES) {
  const verified = {};
  for (const [path, expected] of Object.entries(pins)) {
    const bytes = await readFile(await assertPlainPath(root, path, 'file'));
    let original = bytes;
    if (path === 'src/components/Layout.tsx') original = Buffer.from(stripSpatialNavigation(bytes.toString('utf8')));
    if (path === '.github/workflows/deploy.yml') original = Buffer.from(stripSpatialDeployAdditions(bytes.toString('utf8')));
    const revision = pins === BASE_FILES ? REVIEWED_SOURCE_REVISIONS[path] : undefined;
    assert.equal(gitBlobSha(original), revision?.gitBlob ?? expected, `Pinned original source changed: ${path}`);
    verified[path] = { originalGitBlob: expected, currentSha256: sha256(bytes), ...(revision ? { reviewedRevisionGitBlob: revision.gitBlob, revisionReason: revision.reason } : {}) };
  }
  return verified;
}

/** Hash all regular files, in canonical path order. Links and special entries fail closed. */
export async function snapshotTree(directory, { excludeTopLevel = [] } = {}) {
  assert.ok((await lstat(directory)).isDirectory(), `Expected real directory: ${directory}`);
  const entries = {};
  async function walk(relative = '') {
    for (const item of (await readdir(join(directory, relative), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
      if (!relative && excludeTopLevel.includes(item.name)) continue;
      const path = relative ? `${relative}/${item.name}` : item.name;
      const stat = await lstat(join(directory, path));
      assert.ok(!stat.isSymbolicLink(), `Symlinks are not allowed: ${path}`);
      if (stat.isDirectory()) await walk(path);
      else {
        assert.ok(stat.isFile(), `Special files are not allowed: ${path}`);
        const bytes = await readFile(join(directory, path));
        entries[path] = { bytes: bytes.length, sha256: sha256(bytes) };
      }
    }
  }
  await walk();
  return entries;
}

/** Reconstruct the exact source JSON, not merely the advertised manifest hash. */
export async function validateRegistryDirectory(directory, expected = REVIEWED_REGISTRY) {
  const files = await snapshotTree(directory);
  assert.ok(files['manifest.json'], 'Missing registry manifest');
  const manifestBytes = await readFile(join(directory, 'manifest.json'));
  assert.equal(sha256(manifestBytes), expected.manifestSha256, 'Reviewed registry manifest SHA-256 mismatch');
  const manifest = JSON.parse(manifestBytes);
  assert.equal(manifest.schemaVersion, 1, 'Unsupported registry schema');
  assert.equal(manifest.format, 'source-preserving-investigation-registry');
  assert.deepEqual([...manifest.topLevelKeys].sort(), ['updatedAt', ...ARRAY_KEYS].sort(), 'Registry top-level keys changed');
  assert.deepEqual(Object.keys(manifest.metadata), ['updatedAt']);
  assert.equal(manifest.metadata.updatedAt, expected.updatedAt);
  assert.equal(manifest.sourceSnapshot.updatedAt, expected.updatedAt);
  assert.equal(manifest.sourceSnapshot.source, 'src/data/investigation.ts#getInvestigationRegistry');
  assert.equal(manifest.sourceSnapshot.serialization, 'UTF-8 JSON.stringify(original registry), no trailing newline');
  assert.equal(manifest.sourceSnapshot.sha256, expected.snapshotSha256);
  assert.equal(manifest.sourceSnapshot.bytes, expected.snapshotBytes);
  assert.equal(manifest.totalChunks, expected.totalChunks);
  assert.equal(manifest.totalRows, expected.totalRows);
  assert.deepEqual(manifest.counts, expected.counts);
  assert.equal(manifest.maxChunkBytes, 262144);
  assert.deepEqual(manifest.arrays.map(group => group.key), manifest.topLevelKeys.filter(key => key !== 'updatedAt'), 'Array order changed');
  const arrays = new Map();
  const listed = new Set(['manifest.json']);
  let chunkCount = 0;
  let rowCount = 0;
  for (const group of manifest.arrays) {
    assert.ok(ARRAY_KEYS.includes(group.key) && !arrays.has(group.key), 'Duplicate or unknown registry array');
    assert.equal(group.count, expected.counts[group.key]);
    const rows = [];
    for (const [index, chunk] of group.chunks.entries()) {
      assert.match(chunk.sha256, /^[a-f0-9]{64}$/);
      assert.equal(chunk.file, `${group.key}/${String(index + 1).padStart(4, '0')}-${chunk.sha256.slice(0, 12)}.json`, 'Unsafe or unexpected registry chunk path');
      assert.ok(!listed.has(chunk.file), 'Duplicate registry chunk');
      listed.add(chunk.file);
      assert.equal(chunk.offset, rows.length, 'Non-contiguous registry chunk offset');
      assert.ok(Number.isSafeInteger(chunk.rows) && chunk.rows > 0, 'Invalid registry row count');
      assert.ok(files[chunk.file], `Missing registry chunk: ${chunk.file}`);
      const bytes = await readFile(join(directory, chunk.file));
      assert.equal(bytes.length, chunk.bytes, `Registry chunk byte length mismatch: ${chunk.file}`);
      assert.equal(sha256(bytes), chunk.sha256, `Registry chunk SHA-256 mismatch: ${chunk.file}`);
      assert.equal(chunk.oversized, bytes.length > manifest.maxChunkBytes, 'Incorrect oversized declaration');
      assert.ok(!chunk.oversized || chunk.rows === 1, 'Only indivisible rows may exceed the chunk budget');
      const items = JSON.parse(bytes);
      assert.ok(Array.isArray(items), 'Registry chunk must be an array');
      assert.equal(items.length, chunk.rows, 'Registry chunk row-count mismatch');
      for (const item of items) rows.push(item);
      chunkCount++;
    }
    assert.equal(rows.length, group.count, `Registry group count mismatch: ${group.key}`);
    arrays.set(group.key, rows);
    rowCount += rows.length;
  }
  assert.equal(chunkCount, expected.totalChunks);
  assert.equal(rowCount, expected.totalRows);
  assert.deepEqual(Object.keys(files).sort(), [...listed].sort(), 'Unexpected or missing registry files');
  const registry = {};
  for (const key of manifest.topLevelKeys) registry[key] = key === 'updatedAt' ? manifest.metadata.updatedAt : arrays.get(key);
  const serialized = JSON.stringify(registry);
  assert.equal(Buffer.byteLength(serialized), expected.snapshotBytes, 'Complete source snapshot byte length mismatch');
  assert.equal(sha256(serialized), expected.snapshotSha256, 'Complete source snapshot SHA-256 mismatch');
  return { manifest, registry, files, summary: { ...expected } };
}

/** Compile the actual release checkout. No local bundle fallback and no source regeneration. */
export async function loadReleaseRegistry(root) {
  const source = await assertPlainPath(root, 'src/data/investigation.ts', 'file');
  const require = createRequire(join(root, 'spatial-prototype/package.json'));
  const { build } = await import(pathToFileURL(require.resolve('esbuild')).href);
  const temporary = await mkdtemp(join(tmpdir(), 'spatial-release-source-'));
  try {
    const outfile = join(temporary, 'registry.mjs');
    await build({ entryPoints: [source], outfile, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent' });
    const original = await import(pathToFileURL(outfile).href);
    assert.equal(typeof original.getInvestigationRegistry, 'function', 'Original registry export missing');
    assert.equal(typeof original.buildRetainedInvestigationRegistry, "function", "A dedicated retained audit builder is required for release integrity checks");
    return original.buildRetainedInvestigationRegistry();
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

async function ensureReviewDirectory(root) {
  const directory = join(root, 'spatial-release-review');
  try { await mkdir(directory); } catch (error) { if (error.code !== 'EEXIST') throw error; }
  await assertPlainPath(root, 'spatial-release-review', 'directory');
  return directory;
}

async function writeReceipt(root, name, receipt) {
  const directory = await ensureReviewDirectory(root);
  const path = join(directory, name);
  await writeFile(path, `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx' });
  return path;
}

function receiptMetadata(mode) {
  return { schemaVersion: 1, mode, verifiedAt: new Date().toISOString(), baseCommit: BASE_COMMIT,
    releaseCommit: process.env.GITHUB_SHA || null, note: 'Integrity checks only; this is not browser, visual, merge, or deployment approval.' };
}

export async function preflight(root, { pins = BASE_FILES, expected = REVIEWED_REGISTRY, loadSourceRegistry = loadReleaseRegistry, receipt = true } = {}) {
  const originalFiles = await validatePinnedSources(root, pins);
  const registryPath = await assertPlainPath(root, 'spatial-prototype/public/data/registry', 'directory');
  const validated = await validateRegistryDirectory(registryPath, expected);
  const source = await loadSourceRegistry(root);
  const serialized = JSON.stringify(source);
  assert.equal(Buffer.byteLength(serialized), expected.snapshotBytes, 'Release checkout registry differs from reviewed source snapshot (bytes)');
  assert.equal(sha256(serialized), expected.snapshotSha256, 'Release checkout registry differs from reviewed source snapshot (SHA-256)');
  assert.deepEqual(source, validated.registry, 'Release checkout registry differs from reviewed package');
  const result = { ...receiptMetadata('preflight'), originalFiles, registry: validated.summary, sourceRegistryMatches: true };
  if (receipt) result.receiptPath = await writeReceipt(root, `preflight-${randomUUID()}.json`, result);
  return result;
}

async function validateRootEntries(rootDist) {
  for (const entry of REQUIRED_ROOT_ENTRIES) {
    const path = await assertPlainPath(rootDist, entry, 'file');
    assert.ok((await readFile(path)).length > 0, `Required preserved entry is empty: ${entry}`);
  }
}

async function validateSpatialBuild(root, expected) {
  const sourcePath = await assertPlainPath(root, 'spatial-prototype/public/data/registry', 'directory');
  const buildPath = await assertPlainPath(root, 'spatial-prototype/dist', 'directory');
  await assertPlainPath(buildPath, 'index.html', 'file');
  const source = await validateRegistryDirectory(sourcePath, expected);
  const built = await validateRegistryDirectory(await assertPlainPath(buildPath, 'data/registry', 'directory'), expected);
  assert.deepEqual(built.files, source.files, 'Built registry differs from reviewed source registry');
  const buildTree = await snapshotTree(buildPath);
  assert.ok(buildTree['index.html'].bytes > 0, 'Spatial build entry is empty');
  const builtRegistryFiles = Object.fromEntries(Object.entries(buildTree)
    .filter(([path]) => path.startsWith('data/registry/')).map(([path, value]) => [path.slice('data/registry/'.length), value]));
  assert.deepEqual(builtRegistryFiles, source.files, 'Spatial registry changed while validating the build');
  return { source, buildTree, buildPath };
}

export async function copySpatialBuild(root, { expected = REVIEWED_REGISTRY } = {}) {
  const rootDist = await assertPlainPath(root, 'dist', 'directory');
  await validateRootEntries(rootDist);
  const target = join(rootDist, 'spatial');
  try {
    await lstat(target);
    assert.fail('Refusing existing dist/spatial; original root output must never be overwritten');
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const { source, buildTree, buildPath } = await validateSpatialBuild(root, expected);
  const rootBefore = await snapshotTree(rootDist);
  // A stale receipt requires explicit review/cleanup before any copy.
  const reviewDirectory = await ensureReviewDirectory(root);
  try {
    await lstat(join(reviewDirectory, 'copy-receipt.json'));
    assert.fail('Refusing existing spatial copy receipt');
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await mkdir(target); // Non-recursive and exclusive: never merge into someone else's output.
  for (const path of Object.keys(buildTree)) {
    const destination = join(target, path);
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(join(buildPath, path), destination, constants.COPYFILE_EXCL);
  }
  assert.deepEqual(await snapshotTree(buildPath), buildTree, 'Spatial build changed during copying');
  assert.deepEqual(await snapshotTree(target), buildTree, 'Copied spatial output differs from the checked build');
  assert.deepEqual(await snapshotTree(join(root, 'spatial-prototype/public/data/registry')), source.files, 'Reviewed source registry changed during copying');
  await validateRegistryDirectory(join(target, 'data/registry'), expected);
  assert.deepEqual(await snapshotTree(rootDist, { excludeTopLevel: ['spatial'] }), rootBefore, 'Original root output changed during copying');
  const result = { ...receiptMetadata('copy'), registry: source.summary, preservedRootFiles: rootBefore, spatialFiles: buildTree,
    preservedRootTreeSha256: sha256(JSON.stringify(rootBefore)), spatialTreeSha256: sha256(JSON.stringify(buildTree)) };
  result.receiptPath = await writeReceipt(root, 'copy-receipt.json', result);
  return result;
}

export async function verifyCombined(root, { expected = REVIEWED_REGISTRY, receipt = true } = {}) {
  const rootDist = await assertPlainPath(root, 'dist', 'directory');
  await validateRootEntries(rootDist);
  const copyReceipt = JSON.parse(await readFile(await assertPlainPath(root, 'spatial-release-review/copy-receipt.json', 'file')));
  assert.equal(copyReceipt.schemaVersion, 1, 'Invalid copy receipt schema');
  assert.equal(copyReceipt.mode, 'copy', 'Invalid copy receipt mode');
  assert.equal(copyReceipt.baseCommit, BASE_COMMIT, 'Copy receipt base changed');
  assert.deepEqual(copyReceipt.registry, expected, 'Copy receipt registry pins changed');
  assert.equal(copyReceipt.releaseCommit, process.env.GITHUB_SHA || null, 'Copy receipt belongs to another release commit');
  const { source, buildTree } = await validateSpatialBuild(root, expected);
  const target = await assertPlainPath(root, 'dist/spatial', 'directory');
  const copied = await validateRegistryDirectory(await assertPlainPath(target, 'data/registry', 'directory'), expected);
  assert.deepEqual(copied.files, source.files, 'Copied registry differs from reviewed source registry');
  assert.deepEqual(await snapshotTree(target), buildTree, 'Combined spatial output differs from spatial build');
  assert.deepEqual(buildTree, copyReceipt.spatialFiles, 'Spatial build changed after the copy receipt');
  assert.equal(sha256(JSON.stringify(buildTree)), copyReceipt.spatialTreeSha256, 'Spatial tree receipt hash mismatch');
  const preserved = await snapshotTree(rootDist, { excludeTopLevel: ['spatial'] });
  assert.deepEqual(preserved, copyReceipt.preservedRootFiles, 'Preserved root output changed after copying');
  assert.equal(sha256(JSON.stringify(preserved)), copyReceipt.preservedRootTreeSha256, 'Preserved root receipt hash mismatch');
  const result = { ...receiptMetadata('verify-combined'), registry: source.summary, preservedFiles: Object.keys(preserved).length,
    spatialFiles: Object.keys(buildTree).length, preservedRootTreeSha256: copyReceipt.preservedRootTreeSha256, spatialTreeSha256: copyReceipt.spatialTreeSha256 };
  if (receipt) result.receiptPath = await writeReceipt(root, `verify-combined-${randomUUID()}.json`, result);
  return result;
}

export function parseArguments(args) {
  let root = resolve(fileURLToPath(new URL('../', import.meta.url)));
  let mode;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--root') {
      assert.ok(args[index + 1] && !args[index + 1].startsWith('--'), '--root requires a directory');
      root = resolve(args[++index]);
    } else if (['--preflight', '--copy', '--verify-combined'].includes(arg)) {
      assert.equal(mode, undefined, 'Select exactly one release-validation mode');
      mode = arg;
    } else assert.fail(`Unknown argument: ${arg}`);
  }
  assert.ok(mode, 'Usage: node scripts/spatial-release-validate.mjs --preflight|--copy|--verify-combined [--root directory]');
  return { mode, root };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { mode, root } = parseArguments(process.argv.slice(2));
    const operation = { '--preflight': preflight, '--copy': copySpatialBuild, '--verify-combined': verifyCombined }[mode];
    console.log(JSON.stringify(await operation(root), null, 2));
  } catch (error) {
    console.error(`Spatial release validation failed: ${error.message}`);
    process.exitCode = 1;
  }
}
