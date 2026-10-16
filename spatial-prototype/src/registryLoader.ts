import type { InvestigationRegistry } from './domain';

export interface RegistryLoadProgress {
  loadedChunks: number;
  totalChunks: number;
  loadedRows: number;
  totalRows: number;
}

export interface RegistryLoadOptions {
  /** Relative to document.baseURI. The default works beneath the nested spatial review route. */
  manifestUrl?: string | URL;
  signal?: AbortSignal;
  onProgress?: (progress: RegistryLoadProgress) => void;
  /** Injectable for offline tests; production uses same-origin browser fetch. */
  fetch?: typeof globalThis.fetch;
  /** Retry with 'reload' if a deployment/cache mismatch was reported. No persistent custom cache. */
  cache?: RequestCache;
}

export type RegistryLoadErrorCode = 'NETWORK' | 'HTTP' | 'MANIFEST' | 'INTEGRITY' | 'UNSUPPORTED';

export class RegistryLoadError extends Error {
  readonly name = 'RegistryLoadError';
  constructor(
    message: string,
    readonly code: RegistryLoadErrorCode,
    readonly retryable: boolean,
    readonly url?: string,
  ) { super(message); }
}

type ArrayKey = Exclude<keyof InvestigationRegistry, 'updatedAt'>;
const ARRAY_KEYS: ArrayKey[] = [
  'entities', 'relationships', 'records', 'sources', 'states',
  'localities', 'coverage', 'held', 'methodology',
];
const MAX_CHUNK_BYTES = 256 * 1024;
const MAX_CONCURRENCY = 4;
interface Chunk {
  file: string;
  offset: number;
  rows: number;
  bytes: number;
  sha256: string;
  oversized: boolean;
}
interface Manifest {
  schemaVersion: 1;
  format: 'source-preserving-investigation-registry';
  maxChunkBytes: number;
  sourceSnapshot: { source: string; updatedAt: string; serialization: string; bytes: number; sha256: string };
  topLevelKeys: (keyof InvestigationRegistry)[];
  metadata: { updatedAt: string };
  counts: Record<ArrayKey, number>;
  totalRows: number;
  totalChunks: number;
  arrays: { key: ArrayKey; count: number; chunks: Chunk[] }[];
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const isCount = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const isHash = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const sameKeys = (actual: string[], expected: string[]) =>
  actual.length === expected.length && expected.every(key => actual.includes(key)) && new Set(actual).size === actual.length;

function invalidManifest(url: string, detail: string): never {
  throw new RegistryLoadError(`Registry manifest is invalid: ${detail}. Reload the page; if this persists, rebuild and publish the manifest and all its chunks together.`, 'MANIFEST', false, url);
}

function validateManifest(value: unknown, url: string): Manifest {
  const fail = (detail: string): never => invalidManifest(url, detail);
  if (!isObject(value)) return fail('expected an object');
  if (value.schemaVersion !== 1 || value.format !== 'source-preserving-investigation-registry') return fail('unsupported format/version');
  if (value.maxChunkBytes !== MAX_CHUNK_BYTES) return fail('unsupported chunk byte limit');
  if (!Array.isArray(value.topLevelKeys) || !sameKeys(value.topLevelKeys, ['updatedAt', ...ARRAY_KEYS])) return fail('missing/duplicate registry keys');
  if (!isObject(value.metadata) || !sameKeys(Object.keys(value.metadata), ['updatedAt']) || typeof value.metadata.updatedAt !== 'string') return fail('missing original metadata');
  const snapshot = value.sourceSnapshot;
  if (!isObject(snapshot) || snapshot.source !== 'src/data/investigation.ts#getInvestigationRegistry' ||
    snapshot.serialization !== 'UTF-8 JSON.stringify(original registry), no trailing newline' ||
    snapshot.updatedAt !== value.metadata.updatedAt || !isCount(snapshot.bytes) || !isHash(snapshot.sha256)) return fail('invalid source snapshot');
  if (!isObject(value.counts) || !sameKeys(Object.keys(value.counts), ARRAY_KEYS) || !isCount(value.totalRows) || !isCount(value.totalChunks)) return fail('invalid counts');
  if (!Array.isArray(value.arrays) || value.arrays.length !== ARRAY_KEYS.length) return fail('missing array groups');
  const arrayOrder = value.topLevelKeys.filter(key => key !== 'updatedAt');
  const files = new Set<string>();
  let totalRows = 0;
  let totalChunks = 0;
  for (const [index, group] of value.arrays.entries()) {
    if (!isObject(group) || group.key !== arrayOrder[index] || !isCount(group.count) || !Array.isArray(group.chunks)) return fail('invalid array group/order');
    const key = group.key as ArrayKey;
    if (value.counts[key] !== group.count) return fail(`count mismatch for ${key}`);
    let offset = 0;
    for (const [chunkIndex, chunk] of group.chunks.entries()) {
      if (!isObject(chunk) || typeof chunk.file !== 'string' || !isHash(chunk.sha256) ||
        !isCount(chunk.offset) || !isCount(chunk.rows) || chunk.rows === 0 || !isCount(chunk.bytes) || chunk.bytes < 4 ||
        typeof chunk.oversized !== 'boolean') return fail(`invalid chunk descriptor for ${key}`);
      const expectedFile = `${key}/${String(chunkIndex + 1).padStart(4, '0')}-${chunk.sha256.slice(0, 12)}.json`;
      if (chunk.file !== expectedFile || files.has(chunk.file)) return fail('unsafe or duplicate chunk path');
      if (chunk.offset !== offset) return fail(`noncontiguous offsets for ${key}`);
      if (chunk.oversized !== (chunk.bytes > MAX_CHUNK_BYTES) || (chunk.oversized && chunk.rows !== 1)) return fail('invalid oversized-object declaration');
      files.add(chunk.file);
      offset += chunk.rows;
      if (!Number.isSafeInteger(offset)) return fail('array count overflow');
      totalChunks++;
    }
    if (offset !== group.count) return fail(`incomplete chunks for ${key}`);
    totalRows += group.count;
  }
  if (!Number.isSafeInteger(totalRows) || totalRows !== value.totalRows || totalChunks !== value.totalChunks) return fail('total count mismatch');
  return value as unknown as Manifest;
}

function abortError(): DOMException { return new DOMException('Registry loading was cancelled.', 'AbortError'); }
function checkAbort(signal: AbortSignal) { if (signal.aborted) throw abortError(); }
async function digest(bytes: Uint8Array): Promise<string> {
  const hash = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
function integrityError(url: string, detail: string): never {
  throw new RegistryLoadError(`Registry data failed validation: ${detail}. Retry loading with cache: 'reload'; if this persists, publish the complete matching data snapshot. No partial registry was returned.`, 'INTEGRITY', true, url);
}

/** Loads the entire retained snapshot, never a silently partial registry or evidence transformation. */
export async function loadFullRegistry(options: RegistryLoadOptions = {}): Promise<InvestigationRegistry> {
  if (options.signal?.aborted) throw abortError();
  if (!globalThis.crypto?.subtle) throw new RegistryLoadError('Registry verification needs Web Crypto. Open this app on HTTPS or localhost, then retry.', 'UNSUPPORTED', false);
  const pageUrl = typeof document !== 'undefined' ? document.baseURI : undefined;
  let manifestUrl: URL;
  try { manifestUrl = new URL(options.manifestUrl ?? 'data/registry/manifest.json', pageUrl); }
  catch { throw new RegistryLoadError('Cannot resolve the registry manifest. Supply an absolute manifestUrl outside a browser, or check the app base route.', 'MANIFEST', false); }
  if (!['https:', 'http:'].includes(manifestUrl.protocol) ||
    (typeof location !== 'undefined' && manifestUrl.origin !== location.origin)) {
    throw new RegistryLoadError('Registry files must use HTTP(S) on the same origin as this app.', 'MANIFEST', false, manifestUrl.href);
  }
  const fetcher = options.fetch ?? globalThis.fetch;
  if (!fetcher) throw new RegistryLoadError('This browser does not provide fetch. Update the browser, then retry.', 'UNSUPPORTED', false);
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  options.signal?.addEventListener('abort', onAbort, { once: true });
  const signal = controller.signal;
  async function read(url: URL): Promise<Uint8Array> {
    checkAbort(signal);
    try {
      const response = await fetcher(url.href, { signal, cache: options.cache ?? 'default', credentials: 'omit', redirect: 'error' });
      checkAbort(signal);
      if (!response.ok) throw new RegistryLoadError(`Could not load registry data (HTTP ${response.status}): ${url.pathname}. Retry loading; for a missing file, publish the manifest and all declared chunks together.`, 'HTTP', true, url.href);
      const bytes = new Uint8Array(await response.arrayBuffer());
      checkAbort(signal);
      return bytes;
    } catch (error) {
      if (signal.aborted) throw abortError();
      if (error instanceof RegistryLoadError) throw error;
      throw new RegistryLoadError(`Could not fetch registry data: ${url.pathname}. Check your connection and retry loading.`, 'NETWORK', true, url.href);
    }
  }
  try {
    const manifestBytes = await read(manifestUrl);
    let value: unknown;
    try { value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(manifestBytes)); }
    catch { return invalidManifest(manifestUrl.href, 'the response is not UTF-8 JSON'); }
    const manifest = validateManifest(value, manifestUrl.href);
    const progress: RegistryLoadProgress = { loadedChunks: 0, totalChunks: manifest.totalChunks, loadedRows: 0, totalRows: manifest.totalRows };
    options.onProgress?.({ ...progress });
    const arrays = Object.fromEntries(manifest.arrays.map(group => [group.key, new Array<unknown>(group.count)])) as Record<ArrayKey, unknown[]>;
    const jobs = manifest.arrays.flatMap(group => group.chunks.map(chunk => ({ key: group.key, chunk })));
    let next = 0;
    async function worker() {
      while (next < jobs.length) {
        checkAbort(signal);
        const { key, chunk } = jobs[next++];
        const url = new URL(chunk.file, manifestUrl);
        const bytes = await read(url);
        if (bytes.byteLength !== chunk.bytes) integrityError(url.href, 'chunk byte length mismatch');
        if (await digest(bytes) !== chunk.sha256) integrityError(url.href, 'chunk SHA-256 mismatch');
        checkAbort(signal);
        let rows: unknown;
        try { rows = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
        catch { return integrityError(url.href, 'chunk is not UTF-8 JSON'); }
        if (!Array.isArray(rows) || rows.length !== chunk.rows) integrityError(url.href, 'chunk row count mismatch');
        for (const [index, row] of rows.entries()) arrays[key][chunk.offset + index] = row;
        progress.loadedChunks++;
        progress.loadedRows += rows.length;
        // Reserve the final progress event for the verified complete snapshot.
        if (progress.loadedChunks < progress.totalChunks) options.onProgress?.({ ...progress });
      }
    }
    await Promise.all(Array.from({ length: Math.min(MAX_CONCURRENCY, jobs.length) }, worker));
    checkAbort(signal);
    const registry = Object.fromEntries(manifest.topLevelKeys.map(key => [key, key === 'updatedAt' ? manifest.metadata.updatedAt : arrays[key]])) as unknown as InvestigationRegistry;
    const snapshot = new TextEncoder().encode(JSON.stringify(registry));
    if (snapshot.byteLength !== manifest.sourceSnapshot.bytes || await digest(snapshot) !== manifest.sourceSnapshot.sha256) integrityError(manifestUrl.href, 'complete source snapshot mismatch');
    checkAbort(signal);
    if (progress.totalChunks > 0) options.onProgress?.({ ...progress });
    checkAbort(signal);
    return registry;
  } catch (error) {
    controller.abort(); // Stop other in-flight work; preserve the first actionable failure.
    throw error;
  } finally {
    options.signal?.removeEventListener('abort', onAbort);
  }
}
