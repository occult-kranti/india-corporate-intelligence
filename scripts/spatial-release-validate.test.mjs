import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, lstat, mkdir, mkdtemp, readFile, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import {
  ARRAY_KEYS, BASE_COMMIT, BASE_FILES, REVIEWED_REGISTRY, REQUIRED_ROOT_ENTRIES, SPATIAL_NAV_LINE,
  copySpatialBuild, gitBlobSha, parseArguments, preflight, sha256, snapshotTree,
  stripSpatialDeployAdditions, stripSpatialNavigation, validatePinnedSources,
  validateRegistryDirectory, verifyCombined,
} from './spatial-release-validate.mjs';

const GLOBAL_LINK = '        <a className="site-nav-link" href="./global-workbench/" onClick={onNavigate}><Globe2 size={16} aria-hidden="true" /><span>Global evidence workbench</span></a>\n';
const layoutBase = `<nav>\n        <p className="nav-group-label">Connected research</p>\n${GLOBAL_LINK}</nav>\n`;
const deployBase = 'name: Deploy\n\njobs:\n  deploy:\n    steps:\n      - name: Original test\n        run: npm test\n\n      - name: Publish\n        run: echo publish\n';
const block = name => `      # BEGIN SPATIAL ADDITION ${name}\n      - name: Spatial ${name}\n        run: echo spatial\n      # END SPATIAL ADDITION ${name}\n`;

async function put(root, path, content) {
  await mkdir(dirname(join(root, path)), { recursive: true });
  await writeFile(join(root, path), content);
}

async function temporary(t) {
  const root = await mkdtemp(join(tmpdir(), 'spatial-release-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

function fixturePackage() {
  const registry = { updatedAt: '2026-10-07' };
  for (const key of ARRAY_KEYS) registry[key] = [{ id: `${key}:1`, label: 'Unchanged evidence é' }];
  registry.entities.push({ id: 'entities:2', label: 'Second ordered row' });
  const files = new Map();
  const arrays = [];
  const counts = {};
  for (const key of ARRAY_KEYS) {
    counts[key] = registry[key].length;
    const chunks = registry[key].map((row, index) => {
      const bytes = Buffer.from(`${JSON.stringify([row])}\n`);
      const hash = sha256(bytes);
      const file = `${key}/${String(index + 1).padStart(4, '0')}-${hash.slice(0, 12)}.json`;
      files.set(file, bytes);
      return { file, offset: index, rows: 1, bytes: bytes.length, sha256: hash, oversized: false };
    });
    arrays.push({ key, count: registry[key].length, chunks });
  }
  const serialized = JSON.stringify(registry);
  const manifest = {
    schemaVersion: 1, format: 'source-preserving-investigation-registry', maxChunkBytes: 262144,
    sourceSnapshot: { source: 'src/data/investigation.ts#getInvestigationRegistry', updatedAt: registry.updatedAt,
      serialization: 'UTF-8 JSON.stringify(original registry), no trailing newline', bytes: Buffer.byteLength(serialized), sha256: sha256(serialized) },
    topLevelKeys: Object.keys(registry), metadata: { updatedAt: registry.updatedAt }, counts,
    totalRows: Object.values(counts).reduce((sum, value) => sum + value, 0),
    totalChunks: files.size, arrays,
  };
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
  files.set('manifest.json', manifestBytes);
  const expected = { manifestSha256: sha256(manifestBytes), snapshotSha256: sha256(serialized), snapshotBytes: Buffer.byteLength(serialized),
    updatedAt: registry.updatedAt, totalChunks: manifest.totalChunks, totalRows: manifest.totalRows, counts };
  return { registry, manifest, files, expected };
}

async function writePackage(root, path, fixture) {
  for (const [file, content] of fixture.files) await put(root, `${path}/${file}`, content);
}

async function sourceFixture(t) {
  const root = await temporary(t);
  const fixture = fixturePackage();
  const originals = {
    'src/components/Layout.tsx': layoutBase,
    '.github/workflows/deploy.yml': deployBase,
    'src/App.tsx': 'export const original = true;\n',
    'src/data/investigation.ts': 'export const source = "fixture";\n',
  };
  const pins = Object.fromEntries(Object.entries(originals).map(([path, text]) => [path, gitBlobSha(text)]));
  for (const [path, text] of Object.entries(originals)) await put(root, path, text);
  await put(root, 'src/components/Layout.tsx', layoutBase.replace(GLOBAL_LINK, SPATIAL_NAV_LINE + GLOBAL_LINK));
  await put(root, '.github/workflows/deploy.yml', deployBase.replace('      - name: Publish\n', `${block('preflight')}      - name: Publish\n`));
  await writePackage(root, 'spatial-prototype/public/data/registry', fixture);
  return { root, ...fixture, pins };
}

async function buildFixture(t) {
  const fixture = await sourceFixture(t);
  for (const entry of REQUIRED_ROOT_ENTRIES) await put(fixture.root, `dist/${entry}`, `<html>${entry} original bytes</html>\n`);
  await put(fixture.root, 'dist/assets/root-abc.js', 'export const originalRoot = true;\n');
  await put(fixture.root, 'dist/assets/root-abc.css', 'body { color: black }\n');
  await put(fixture.root, 'dist/global-workbench/assets/source.json', '{"original":true}\n');
  await cp(join(fixture.root, 'spatial-prototype/public'), join(fixture.root, 'spatial-prototype/dist'), { recursive: true });
  await put(fixture.root, 'spatial-prototype/dist/index.html', '<html>Spatial reviewed build</html>\n');
  await put(fixture.root, 'spatial-prototype/dist/assets/app.js', 'export const spatial = true;\n');
  return fixture;
}

async function editManifest(directory, expected, edit) {
  const manifest = JSON.parse(await readFile(join(directory, 'manifest.json')));
  await edit(manifest);
  const bytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(join(directory, 'manifest.json'), bytes);
  return { ...expected, manifestSha256: sha256(bytes) };
}

test('production pins contain the reviewed commit, all nine base files, and full registry identities', () => {
  assert.equal(BASE_COMMIT, 'ba6ce850bcb8cb62e4d81f1f1ff6df4406a1877a');
  assert.equal(Object.keys(BASE_FILES).length, 9);
  assert.equal(BASE_FILES['src/components/Layout.tsx'], '258da962b4279ec357886745f771e019c6532718');
  assert.equal(BASE_FILES['.github/workflows/deploy.yml'], '790a9f12456aab7a95d5b20170ae4de9dd3b1893');
  assert.equal(REVIEWED_REGISTRY.totalRows, 16159);
  assert.equal(REVIEWED_REGISTRY.totalChunks, 96);
  assert.equal(REVIEWED_REGISTRY.snapshotBytes, 23207262);
  assert.equal(REVIEWED_REGISTRY.manifestSha256, 'd551897418cc8b9db640293863ab04718408a6b3e6e7a9ef2a7c863d072ef323');
  assert.equal(REVIEWED_REGISTRY.snapshotSha256, '048f89ffd008a498212ff2ac71d4413aef09b138a50ab77f336a23fec4722064');
});

test('Git blob hashing uses byte length rather than character count', () => {
  assert.equal(gitBlobSha(''), 'e69de29bb2d1d6434b8b29ae775ad8c2e48c5391');
  assert.equal(gitBlobSha('é'), gitBlobSha(Buffer.from('é')));
});

test('navigation removal accepts exactly one complete anchor at the reviewed location', () => {
  assert.equal(stripSpatialNavigation(layoutBase.replace(GLOBAL_LINK, SPATIAL_NAV_LINE + GLOBAL_LINK)), layoutBase);
  for (const text of [layoutBase, layoutBase + SPATIAL_NAV_LINE, layoutBase.replace(GLOBAL_LINK, SPATIAL_NAV_LINE.repeat(2) + GLOBAL_LINK),
    layoutBase.replace(GLOBAL_LINK, SPATIAL_NAV_LINE.replace('href={`${import.meta.env.BASE_URL}spatial/`}', 'href="/spatial/"') + GLOBAL_LINK)]) {
    assert.throws(() => stripSpatialNavigation(text), /reviewed spatial link|immediately precede/);
  }
});

test('deployment block removal preserves every original blank line and terminal newline', () => {
  const added = deployBase.replace('      - name: Original test\n', `${block('preflight')}      - name: Original test\n`)
    .replace('      - name: Publish\n', `${block('copy')}      - name: Publish\n`);
  assert.equal(stripSpatialDeployAdditions(added), deployBase);
  assert.equal(stripSpatialDeployAdditions(`${block('only')}original`), 'original');
});

test('deployment removal rejects absent, malformed, nested, mismatched, duplicate and unclosed markers', () => {
  const invalid = [deployBase, block('a').replace('      # BEGIN', '    # BEGIN'), block('a').replace('END SPATIAL ADDITION a', 'END SPATIAL ADDITION b'),
    block('a').replace('      - name: Spatial a\n', block('b')), block('a').repeat(2), '      # BEGIN SPATIAL ADDITION a\n',
    '      # END SPATIAL ADDITION a\n'];
  for (const text of invalid) assert.throws(() => stripSpatialDeployAdditions(text), /marker|block|nest|match/);
});

test('pinned sources allow only the exact nav addition and marked workflow additions', async t => {
  const { root, pins } = await sourceFixture(t);
  const result = await validatePinnedSources(root, pins);
  assert.equal(Object.keys(result).length, 4);
  await put(root, 'src/App.tsx', 'changed root application\n');
  await assert.rejects(validatePinnedSources(root, pins), /Pinned original source changed: src\/App.tsx/);
});

test('an unmarked workflow blank line fails exact original preservation', async t => {
  const { root, pins } = await sourceFixture(t);
  const path = join(root, '.github/workflows/deploy.yml');
  await writeFile(path, `${await readFile(path, 'utf8')}\n`);
  await assert.rejects(validatePinnedSources(root, pins), /Pinned original source changed/);
});

test('registry verification reconstructs original array/property order and UTF-8 snapshot bytes', async t => {
  const { root, registry, expected } = await sourceFixture(t);
  const result = await validateRegistryDirectory(join(root, 'spatial-prototype/public/data/registry'), expected);
  assert.deepEqual(result.registry, registry);
  assert.deepEqual(result.summary, expected);
  assert.equal(Object.keys(result.files).length, expected.totalChunks + 1);
});

test('manifest byte changes are rejected even when parsed data is unchanged', async t => {
  const { root, expected } = await sourceFixture(t);
  const directory = join(root, 'spatial-prototype/public/data/registry');
  await writeFile(join(directory, 'manifest.json'), `${await readFile(join(directory, 'manifest.json'), 'utf8')}\n`);
  await assert.rejects(validateRegistryDirectory(directory, expected), /manifest SHA-256 mismatch/);
});

test('same-length chunk corruption and truncation are rejected', async t => {
  for (const corrupt of [bytes => Buffer.from(bytes.toString().replace('Unchanged', 'Xnchanged')), bytes => bytes.subarray(1)]) {
    const { root, expected, manifest } = await sourceFixture(t);
    const directory = join(root, 'spatial-prototype/public/data/registry');
    const path = join(directory, manifest.arrays[0].chunks[0].file);
    await writeFile(path, corrupt(await readFile(path)));
    await assert.rejects(validateRegistryDirectory(directory, expected), /Registry chunk (SHA-256|byte length) mismatch/);
  }
});

test('missing and extra registry files both fail closed', async t => {
  for (const missing of [true, false]) {
    const { root, expected, manifest } = await sourceFixture(t);
    const directory = join(root, 'spatial-prototype/public/data/registry');
    if (missing) await rm(join(directory, manifest.arrays[0].chunks[0].file));
    else await writeFile(join(directory, 'stale.json'), '[]');
    await assert.rejects(validateRegistryDirectory(directory, expected), /Missing registry chunk|Unexpected or missing registry files/);
  }
});

test('rehashing a changed chunk and its manifest cannot bypass fixed source-snapshot verification', async t => {
  const { root, expected, manifest } = await sourceFixture(t);
  const directory = join(root, 'spatial-prototype/public/data/registry');
  const old = manifest.arrays[0].chunks[0];
  const bytes = Buffer.from((await readFile(join(directory, old.file), 'utf8')).replace('Unchanged', 'Xnchanged'));
  const hash = sha256(bytes);
  const file = old.file.replace(old.sha256.slice(0, 12), hash.slice(0, 12));
  await rename(join(directory, old.file), join(directory, file));
  await writeFile(join(directory, file), bytes);
  const rehashed = await editManifest(directory, expected, next => Object.assign(next.arrays[0].chunks[0], { file, sha256: hash, bytes: bytes.length }));
  await assert.rejects(validateRegistryDirectory(directory, rehashed), /Complete source snapshot SHA-256 mismatch/);
});

test('even test-injected manifest pins cannot permit bad offsets, paths, groups or row counts', async t => {
  const edits = [manifest => manifest.arrays[0].chunks[0].offset++, manifest => { manifest.arrays[0].chunks[0].file = '../outside.json'; },
    manifest => { manifest.arrays[1].key = manifest.arrays[0].key; }, manifest => manifest.arrays[0].chunks[0].rows++,
    manifest => { manifest.topLevelKeys[1] = manifest.topLevelKeys[2]; }];
  for (const edit of edits) {
    const { root, expected } = await sourceFixture(t);
    const directory = join(root, 'spatial-prototype/public/data/registry');
    const altered = await editManifest(directory, expected, edit);
    await assert.rejects(validateRegistryDirectory(directory, altered));
  }
});

test('symlinks are rejected in a registry rather than followed', async t => {
  const { root, expected, manifest } = await sourceFixture(t);
  const directory = join(root, 'spatial-prototype/public/data/registry');
  const file = manifest.arrays[0].chunks[0].file;
  await rename(join(directory, file), join(root, 'outside.json'));
  await symlink(join(root, 'outside.json'), join(directory, file));
  await assert.rejects(validateRegistryDirectory(directory, expected), /Symlinks are not allowed/);
});

test('preflight verifies all root pins and complete original source equality before writing its receipt', async t => {
  const { root, pins, expected, registry } = await sourceFixture(t);
  let requestedRoot;
  const result = await preflight(root, { pins, expected, loadSourceRegistry: async path => { requestedRoot = path; return registry; } });
  assert.equal(requestedRoot, root);
  assert.equal(result.sourceRegistryMatches, true);
  assert.equal(JSON.parse(await readFile(result.receiptPath)).mode, 'preflight');
});

test('preflight rejects original-registry transitive data drift even with unchanged pinned module', async t => {
  const { root, pins, expected, registry } = await sourceFixture(t);
  const altered = structuredClone(registry);
  altered.entities[0].label = altered.entities[0].label.replace('Unchanged', 'Xnchanged');
  await assert.rejects(preflight(root, { pins, expected, loadSourceRegistry: async () => altered }), /Release checkout registry differs/);
  await assert.rejects(lstat(join(root, 'spatial-release-review')), { code: 'ENOENT' });
});

test('copy adds only dist/spatial, keeps every original root file byte-identical and writes a verifiable receipt', async t => {
  const { root, expected } = await buildFixture(t);
  const before = await snapshotTree(join(root, 'dist'));
  const copied = await copySpatialBuild(root, { expected });
  assert.deepEqual(await snapshotTree(join(root, 'dist'), { excludeTopLevel: ['spatial'] }), before);
  assert.deepEqual(copied.preservedRootFiles, before);
  assert.deepEqual(await snapshotTree(join(root, 'dist/spatial')), await snapshotTree(join(root, 'spatial-prototype/dist')));
  const verified = await verifyCombined(root, { expected });
  assert.equal(verified.mode, 'verify-combined');
  assert.equal(verified.preservedFiles, Object.keys(before).length);
  assert.ok(verified.receiptPath.startsWith(join(root, 'spatial-release-review')));
});

test('copy refuses existing directories, files and dangling symlinks at dist/spatial', async t => {
  for (const type of ['directory', 'file', 'link']) {
    const { root, expected } = await buildFixture(t);
    const path = join(root, 'dist/spatial');
    if (type === 'directory') await mkdir(path);
    if (type === 'file') await writeFile(path, 'root-owned bytes');
    if (type === 'link') await symlink(join(root, 'missing'), path);
    await assert.rejects(copySpatialBuild(root, { expected }), /Refusing existing dist\/spatial/);
    assert.ok(await lstat(path));
  }
});

test('copy rejects a corrupted built registry before creating a destination or changing root bytes', async t => {
  const { root, expected, manifest } = await buildFixture(t);
  const before = await snapshotTree(join(root, 'dist'));
  await put(root, `spatial-prototype/dist/data/registry/${manifest.arrays[0].chunks[0].file}`, '[]\n');
  await assert.rejects(copySpatialBuild(root, { expected }), /Registry chunk byte length mismatch/);
  assert.deepEqual(await snapshotTree(join(root, 'dist')), before);
  await assert.rejects(lstat(join(root, 'dist/spatial')), { code: 'ENOENT' });
});

test('copy requires every preserved root/global-workbench entry and rejects missing entries', async t => {
  for (const path of REQUIRED_ROOT_ENTRIES) {
    const { root, expected } = await buildFixture(t);
    await rm(join(root, 'dist', path));
    await assert.rejects(copySpatialBuild(root, { expected }), { code: 'ENOENT' });
    await assert.rejects(lstat(join(root, 'dist/spatial')), { code: 'ENOENT' });
  }
});

test('copy refuses symlinked original output or built assets before writing target files', async t => {
  for (const path of ['dist/assets/root-abc.js', 'spatial-prototype/dist/assets/app.js']) {
    const { root, expected } = await buildFixture(t);
    await rm(join(root, path));
    await symlink(join(root, 'src/App.tsx'), join(root, path));
    await assert.rejects(copySpatialBuild(root, { expected }), /Symlinks are not allowed/);
    await assert.rejects(lstat(join(root, 'dist/spatial')), { code: 'ENOENT' });
  }
});

test('copy refuses stale receipts and does not overwrite review artifacts', async t => {
  const { root, expected } = await buildFixture(t);
  await put(root, 'spatial-release-review/copy-receipt.json', 'previous review');
  await assert.rejects(copySpatialBuild(root, { expected }), /Refusing existing spatial copy receipt/);
  assert.equal(await readFile(join(root, 'spatial-release-review/copy-receipt.json'), 'utf8'), 'previous review');
  await assert.rejects(lstat(join(root, 'dist/spatial')), { code: 'ENOENT' });
});

test('combined verification requires the original copy receipt', async t => {
  const { root, expected } = await buildFixture(t);
  await cp(join(root, 'spatial-prototype/dist'), join(root, 'dist/spatial'), { recursive: true });
  await assert.rejects(verifyCombined(root, { expected }), { code: 'ENOENT' });
});

test('combined verification catches changes and additions to preserved root output', async t => {
  for (const path of ['dist/index.html', 'dist/global-workbench/finance.html', 'dist/assets/new.js']) {
    const { root, expected } = await buildFixture(t);
    await copySpatialBuild(root, { expected });
    await put(root, path, 'unexpected change');
    await assert.rejects(verifyCombined(root, { expected }), /Preserved root output changed/);
  }
});

test('combined verification catches copied/build drift, including matching changes to both trees', async t => {
  for (const paths of [['dist/spatial/assets/app.js'], ['spatial-prototype/dist/assets/app.js'], ['dist/spatial/assets/app.js', 'spatial-prototype/dist/assets/app.js']]) {
    const { root, expected } = await buildFixture(t);
    await copySpatialBuild(root, { expected });
    for (const path of paths) await put(root, path, 'new unexpected app bytes');
    await assert.rejects(verifyCombined(root, { expected }), /Combined spatial output differs|Spatial build changed after the copy receipt/);
  }
});

test('combined verification rejects changed receipt pins and hash records', async t => {
  for (const mutate of [receipt => { receipt.registry.snapshotSha256 = '0'.repeat(64); }, receipt => { receipt.preservedRootTreeSha256 = '0'.repeat(64); },
    receipt => { receipt.spatialTreeSha256 = '0'.repeat(64); }, receipt => { receipt.releaseCommit = 'another-commit'; }]) {
    const { root, expected } = await buildFixture(t);
    await copySpatialBuild(root, { expected });
    const path = join(root, 'spatial-release-review/copy-receipt.json');
    const receipt = JSON.parse(await readFile(path));
    mutate(receipt);
    await writeFile(path, JSON.stringify(receipt));
    await assert.rejects(verifyCombined(root, { expected }), /receipt|Receipt/);
  }
});

test('CLI requires one known mode and allows an explicit root without exposing pin bypasses', () => {
  assert.deepEqual(parseArguments(['--copy', '--root', '.']), { mode: '--copy', root: resolve('.') });
  assert.equal(parseArguments(['--verify-combined']).mode, '--verify-combined');
  for (const args of [[], ['--preflight', '--copy'], ['--root'], ['--skip-pins'], ['--preflight', '--root', '--copy']]) {
    assert.throws(() => parseArguments(args));
  }
});
