# Full original registry transport

This is a deterministic, source-preserving packaging of the existing India application `getInvestigationRegistry()` result. Separate global-current, finance and media workbench bundles are preserved on their original routes but are not federated into this snapshot. It adds no research, identity merges, geographic guesses, factual edges, or evidence conclusions. The source application is read-only. The full JSON is **not imported into the JavaScript bundle**.

## Snapshot

- Original `updatedAt`: `2026-10-07`
- Serialized snapshot: **23,207,262 UTF-8 bytes**
- SHA-256: `048f89ffd008a498212ff2ac71d4413aef09b138a50ab77f336a23fec4722064`
- **96 JSON chunks**, plus one manifest
- **16,159 total array rows**: 2,469 entities; 4,203 relationships; 5,617 records; 3,314 sources; 36 states; 167 localities; 32 coverage rows; 316 held rows; 5 methodology strings
- All current chunks fit within **262,144 bytes (256 KiB)**, including JSON brackets, commas and the final newline. No current object needs an oversized exception.

The snapshot hash covers `JSON.stringify(originalRegistry)` in its original top-level, object-property, and array order, encoded as UTF-8 with no trailing newline. It identifies the retained data snapshot, not a fresh verification of the underlying claims. The loader verifies the entire reconstructed snapshot as well as each individual chunk.

## Build and audit

From the spatial prototype directory:

```sh
FIELDWORK_SOURCE_ROOT=/path/to/original/app node scripts/build-full-registry.mjs
FIELDWORK_SOURCE_ROOT=/path/to/original/app node --test scripts/full-registry.test.mjs
```

The builder uses the existing `scripts/original-registry.mjs` helper. The helper reads `FIELDWORK_SOURCE_ROOT/src/data/investigation.ts`, or the established parent-source location; its existing local extracted-bundle fallback is development-only. Do not publish that fallback bundle or bundle the original application into the runtime. Set `FIELDWORK_SOURCE_ROOT` explicitly when validating against a particular source checkout.

The script owns and replaces only `public/data/registry/`. Rebuilding the same source produces identical filenames and bytes; no build timestamp or machine-specific absolute path is recorded. Tests compare every checked-in file with the rebuild, detect stale/missing chunks, reconstruct all original values and ordering, and check source closure including nested geography and held citations. No source objects are normalized or rewritten.

Publish/copy the whole generated directory together. `manifest.json` must never point at chunks omitted from the artifact. Content-hashed chunk filenames avoid mixing different chunk bodies under the same name. Standard browser/HTTP caching is sufficient; there is no IndexedDB, localStorage, service-worker, or other persistent registry cache in this loader.

## Manifest v1

`public/data/registry/manifest.json` contains:

- `schemaVersion: 1`, `format: "source-preserving-investigation-registry"`, `maxChunkBytes: 262144`
- `sourceSnapshot`: source function identity, original `updatedAt`, exact serialization description, byte count, and SHA-256
- `topLevelKeys`: every original top-level key, in its original order
- `metadata`: original non-array metadata (`updatedAt`)
- `counts`, `totalRows`, `totalChunks`
- `arrays`: original top-level arrays in original order, each with `key`, `count`, and ordered `chunks`

Each descriptor has `{file, offset, rows, bytes, sha256, oversized}`. Files have names such as `entities/0001-<first12HashCharacters>.json` and contain a bare array of untouched original rows plus a final newline. `offset` is the row's original position within its top-level array. A group with no rows has no chunk. Methodology strings are rows too; coverage, states, localities and held metadata retain their own groups.

Rows are indivisible. A future original object larger than the limit is emitted alone and explicitly marked `oversized: true`; only a one-row chunk may claim that exception. The current snapshot has no such objects. UTF-8 byte counts, not JavaScript string lengths, control packing. The builder rejects values that would be lost by a JSON round trip, including `undefined` fields.

Hashes detect corruption, accidental edits, mixed deployment snapshots and mismatched caches. They are not a signature or independent claim-verification system: the same-origin application and its manifest remain the trust boundary.

## Loader API

```ts
import { loadFullRegistry, RegistryLoadError } from './registryLoader';
import type { RegistryLoadProgress } from './registryLoader';

const controller = new AbortController();
const registry = await loadFullRegistry({
  signal: controller.signal,
  onProgress: ({ loadedChunks, totalChunks, loadedRows, totalRows }) => {
    // Update loading UI; do not expose a partial registry.
  },
});
```

The return type is `Promise<InvestigationRegistry>`. Options are:

- `signal?: AbortSignal`
- `onProgress?: (progress: RegistryLoadProgress) => void`
- `manifestUrl?: string | URL`, default `data/registry/manifest.json`
- `cache?: RequestCache`, default `"default"`; an explicit retry can use `"reload"`
- `fetch?: typeof globalThis.fetch`, for test injection

The default URL resolves relative to `document.baseURI`. At `/india-corporate-intelligence/spatial/`, the manifest loads from `/india-corporate-intelligence/spatial/data/registry/manifest.json`, with chunk paths relative to that manifest. Only same-origin HTTP(S) manifests are accepted in a browser; chunk paths are strictly validated. Redirects are rejected and requests use `credentials: "omit"`. No external service or credentials are needed. Node-based tests supply an absolute `manifestUrl` and a local injected transport.

One manifest fetch is followed by **at most four simultaneous chunk fetches**. Completion order never changes array order. Progress starts after manifest validation, counts only validated rows/chunks, and finishes only after complete-snapshot verification. Counts include all nine arrays, including held, coverage and methodology rows. A progress callback should update UI synchronously and should not throw. The complete registry is exposed only on successful promise resolution. Callers may retain that successful result in memory; aborted or failed loads are never cached as a complete registry.

Web Crypto SHA-256 is required, available in secure browser contexts (HTTPS or localhost). Missing Web Crypto produces an actionable `UNSUPPORTED` error rather than returning unverified data.

### Failure, cancellation and retry

- Cancellation rejects with `name === "AbortError"`, cancels in-flight fetches, stops scheduling new work, and emits no later progress. Treat cancellation as an interrupted request rather than a data error.
- Other expected failures are `RegistryLoadError` with `code`, `retryable`, optional `url`, and a useful message. Codes are `NETWORK`, `HTTP`, `MANIFEST`, `INTEGRITY`, and `UNSUPPORTED`.
- A missing/failed chunk, invalid JSON, incorrect byte length/hash/count, unsafe manifest path, or mismatched complete snapshot rejects the entire load. Other in-flight workers are aborted. The loader never substitutes the preview subset or returns an incomplete result under a full-registry label.
- No automatic retry loop hides failures. Offer an explicit Retry action that creates a new call, normally with `cache: 'reload'`. A successful caller cache can avoid unnecessary repeat loads. When retry still fails, show the failed URL and deployment-repair guidance already present in the error message. Invalid schema or unsupported browser features need correction, not repeated network retries.

```ts
const registry = await loadFullRegistry({ cache: 'reload', signal, onProgress });
```

The test suite covers deterministic full equality, source closure, UTF-8 chunk bounds, the oversized-single-row exception, out-of-order completion, concurrency, nested routes, missing/failed/network errors, altered/truncated/rehashed chunks, invalid manifests, cancellation before/during fetch and ignored transport cancellation, and successful retry.

## Held evidence is still review material

All **316 held entries** remain exactly in `registry.held`. None is introduced into `entities` or `relationships` by this packaging. The original registry deliberately also retains **227 held IDs in `records`**, all with `status: "not-drawn"`: they include 225 counter-evidence/response records and two other held claims. Removing those records would lose original responses and qualifiers.

Consumers must preserve their readable review/counter-evidence role and must not promote held IDs or `status: "not-drawn"` records into factual spatial nodes/edges. Likewise, loading more original rows does not authorize new coordinates, inferred institutional addresses, or geographic links. The loader changes transport only; scene eligibility and evidence display remain explicit responsibilities of the existing adapter.

The next reader release also applies two exact-ID [source-scope correction overlays](source-scope-corrections.md). They remove two mirrored records and two relationships from factual eligibility, without changing this snapshot, its 316-entry queue or its hashes. The dedicated `buildRetainedInvestigationRegistry()` audit export is used by packaging and parity checks; normal original-route consumers use the qualified runtime registry.

This data package alone is not visual-review approval. Exact-head browser CI and inspection of the full-registry screenshots remain release gates; no local browser, publication, merge or deployment is part of this packaging work.
