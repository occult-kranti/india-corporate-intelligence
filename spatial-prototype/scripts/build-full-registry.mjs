import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadOriginalRegistry } from './original-registry.mjs';

export const MAX_CHUNK_BYTES = 256 * 1024;
export const REGISTRY_ARRAY_KEYS = [
  'entities', 'relationships', 'records', 'sources', 'states',
  'localities', 'coverage', 'held', 'methodology',
];
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

/** Pure, deterministic packaging. No evidence enrichment, filtering or coordinate inference. */
export function packageFullRegistry(registry, maxChunkBytes = MAX_CHUNK_BYTES) {
  assert.ok(Number.isSafeInteger(maxChunkBytes) && maxChunkBytes >= 4, 'Invalid chunk limit');
  const snapshot = JSON.stringify(registry);
  // Fail instead of silently discarding undefined, special numbers or non-JSON values.
  assert.deepEqual(JSON.parse(snapshot), registry, 'Original registry must be losslessly JSON serializable');
  const topLevelKeys = Object.keys(registry);
  assert.deepEqual([...topLevelKeys].sort(), ['updatedAt', ...REGISTRY_ARRAY_KEYS].sort());
  const metadata = {};
  const counts = {};
  const arrays = [];
  const files = new Map();
  for (const key of topLevelKeys) {
    const value = registry[key];
    if (!Array.isArray(value)) {
      metadata[key] = value;
      continue;
    }
    assert.ok(REGISTRY_ARRAY_KEYS.includes(key), `Unexpected registry array: ${key}`);
    counts[key] = value.length;
    const chunks = [];
    let rows = [];
    let byteLength = 3; // brackets and final newline
    let offset = 0;
    function flush() {
      if (!rows.length) return;
      const bytes = Buffer.from(`[${rows.join(',')}]\n`, 'utf8');
      const hash = sha256(bytes);
      const file = `${key}/${String(chunks.length + 1).padStart(4, '0')}-${hash.slice(0, 12)}.json`;
      const oversized = bytes.byteLength > maxChunkBytes;
      assert.ok(!oversized || rows.length === 1, 'Only one indivisible original row may exceed the limit');
      chunks.push({ file, offset, rows: rows.length, bytes: bytes.byteLength, sha256: hash, oversized });
      files.set(file, bytes);
      offset += rows.length;
      rows = [];
      byteLength = 3;
    }
    for (const row of value) {
      const serialized = JSON.stringify(row);
      const bytes = Buffer.byteLength(serialized, 'utf8');
      if (rows.length && byteLength + 1 + bytes > maxChunkBytes) flush();
      byteLength += (rows.length ? 1 : 0) + bytes;
      rows.push(serialized);
    }
    flush();
    arrays.push({ key, count: value.length, chunks });
  }
  const manifest = {
    schemaVersion: 1,
    format: 'source-preserving-investigation-registry',
    maxChunkBytes,
    sourceSnapshot: {
      source: 'src/data/investigation.ts#getInvestigationRegistry',
      updatedAt: registry.updatedAt,
      serialization: 'UTF-8 JSON.stringify(original registry), no trailing newline',
      bytes: Buffer.byteLength(snapshot, 'utf8'),
      sha256: sha256(snapshot),
    },
    topLevelKeys,
    metadata,
    counts,
    totalRows: Object.values(counts).reduce((sum, count) => sum + count, 0),
    totalChunks: arrays.reduce((sum, array) => sum + array.chunks.length, 0),
    arrays,
  };
  files.set('manifest.json', Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, 'utf8'));
  return { manifest, files };
}

export async function writeFullRegistry(outputDirectory, registry) {
  const packaged = packageFullRegistry(registry);
  // This directory is generated and owned exclusively by this script.
  await rm(outputDirectory, { recursive: true, force: true });
  for (const [file, bytes] of packaged.files) {
    const destination = resolve(outputDirectory, file);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, bytes);
  }
  return packaged;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = resolve(fileURLToPath(new URL('../public/data/registry/', import.meta.url)));
  const { manifest } = await writeFullRegistry(output, await loadOriginalRegistry());
  console.log(JSON.stringify({ output, counts: manifest.counts, chunks: manifest.totalChunks,
    snapshotBytes: manifest.sourceSnapshot.bytes, snapshotSha256: manifest.sourceSnapshot.sha256 }, null, 2));
}
