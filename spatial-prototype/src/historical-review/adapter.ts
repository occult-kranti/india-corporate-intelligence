import type {
  InvestigationEntity, InvestigationHeldRecord, InvestigationRecord,
  InvestigationRegistry, InvestigationRelationship, InvestigationSource,
} from '../domain';
import { originalRoute, safeSourceUrl } from '../navigation';

export const HISTORICAL_NAMESPACE = 'olympus-reviewed-2025';
export const HISTORICAL_SNAPSHOT = '2025-12-31';
export const HISTORICAL_REVIEW_VALUE = 'historical-2025';
export const PUBLIC_GRAPH_STATUS = 'PUBLIC_GRAPH_BLOCKED' as const;
export const REUSED_IRB_ID = 'public-works:entity:pwg-irb-idl';
export const PINNED_BASE_SHA256 = '048f89ffd008a498212ff2ac71d4413aef09b138a50ab77f336a23fec4722064';
export const PINNED_ADDITIONS_SHA256 = '5cd5c36de9dd98609c948cf526595a175f30fd29457fa1c7db9cf29b978eaf45';
export const PINNED_PROVENANCE_SHA256 = '7ad1b6269af516d7f88dbee5687a6f3ba2cd0ac2f3b97318931d248c382eebf0';
export const BASE_COUNTS = { entities: 2469, relationships: 4203, records: 5617, sources: 3314 } as const;
const admittedBases = new WeakMap<HistoricalReviewOverlay, InvestigationRegistry>();
const suffixes = ['F01', 'F02', 'F03', 'F04', 'P01', 'P02', 'P03', 'P04', 'P05'];
const entityIds = ['ca_fairfax_india', 'OF-N-FIH-MAURITIUS', 'OF-N-ANCHORAGE', 'OF-N-BIAL',
  'OF-N-CINTRA-INR', 'OF-N-CINTRA-GLOBAL', 'OF-N-FERROVIAL', 'OF-N-RIJN', 'OF-N-RAFAEL'];
const id = (kind: string, original: string) => `${HISTORICAL_NAMESPACE}:${kind}:${original}`;
export const EXCLUDED_CLAIM_IDS = ['OF-C-F05', 'OF-C-F06', 'OF-C-P06', 'OF-C-M01', 'OF-C-M02', 'OF-C-M03'] as const;

export interface HistoricalAdditions {
  entities: InvestigationEntity[];
  relationships: InvestigationRelationship[];
  records: InvestigationRecord[];
  sources: InvestigationSource[];
  held: InvestigationHeldRecord[];
}
export interface SourceProvenance {
  sourceId: string; packetSourceId: string; sourceFamily: string;
  reportingPeriod: string; documentDate: string | null; firstPublicationDate: null;
  originalPath: string; sha256: string; retrievalDate: string; retrievalPrecision: string;
}
export interface HistoricalHoldTarget {
  holdId: string; relationshipIds: string[]; recordIds: string[]; entityIds: string[];
  status: typeof PUBLIC_GRAPH_STATUS;
}
export interface HistoricalReviewOverlay {
  status: typeof PUBLIC_GRAPH_STATUS;
  publicGraphEligible: false;
  snapshot: typeof HISTORICAL_SNAPSHOT;
  /** Always the exact baseline object, never the additions or combined reader. */
  graphRegistry: InvestigationRegistry;
  /** Inspection only. All new evidence objects also have exact-ID exclusion guards. */
  readerRegistry: InvestigationRegistry;
  additions: HistoricalAdditions;
  provenance: SourceProvenance[];
  reusedEntity: InvestigationEntity;
  guardHolds: InvestigationHeldRecord[];
  /** Sidecar references preserve the exact original :hold: provenance objects. */
  holdTargets: HistoricalHoldTarget[];
}

export function historicalReviewRequested(search: string, enabled: boolean, dataset: string): boolean {
  const values = new URLSearchParams(search).getAll('review');
  return enabled && dataset === 'full' && values.length === 1 && values[0] === HISTORICAL_REVIEW_VALUE;
}
export function withoutHistoricalReview(href: string): string {
  const url = new URL(href);
  url.searchParams.delete('review');
  return `${url.pathname}${url.search}${url.hash}`;
}
/** New items only have an overview fallback. Never claim an original-item deep link. */
export function reviewOriginalDestination(item: { namespace: string; route: string }) {
  const overview = originalRoute('/investigate');
  const retained = originalRoute(item.route);
  return item.namespace === HISTORICAL_NAMESPACE || retained === overview
    ? { href: overview, label: 'Browse original investigation overview', isItemDeepLink: false }
    : { href: retained, label: 'Open retained original context', isItemDeepLink: true };
}

function fail(message: string): never { throw new Error(`Historical review is unavailable: ${message}. The base registry is unchanged.`); }
async function sha256(text: string): Promise<string> {
  if (!globalThis.crypto?.subtle) return fail('Web Crypto is required for pinned review verification');
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
function exactIds(rows: { id: string }[], expected: string[], label: string) {
  const actual = rows.map(row => row.id);
  if (new Set(actual).size !== actual.length || actual.length !== expected.length || expected.some(value => !actual.includes(value))) fail(`${label} IDs differ from the reviewed allowlist`);
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

/** Strict hashes pin the whole reviewed payload, not just the assertions below.
 * No URL, flag, test, or successful validation can clear PUBLIC_GRAPH_BLOCKED.
 * Caller must opt in explicitly; this function never mutates or freezes base objects.
 */
export async function buildHistoricalReviewOverlay(
  base: InvestigationRegistry,
  additionsText: string,
  provenanceText: string,
  optIn: typeof HISTORICAL_REVIEW_VALUE,
): Promise<HistoricalReviewOverlay> {
  if (optIn !== HISTORICAL_REVIEW_VALUE) fail('explicit historical review opt-in is required');
  if (await sha256(additionsText) !== PINNED_ADDITIONS_SHA256) fail('reviewed additions SHA-256 mismatch');
  if (await sha256(provenanceText) !== PINNED_PROVENANCE_SHA256) fail('source provenance SHA-256 mismatch');
  for (const key of Object.keys(BASE_COUNTS) as (keyof typeof BASE_COUNTS)[]) {
    if (base[key].length !== BASE_COUNTS[key]) fail(`baseline ${key} count mismatch`);
  }
  if (await sha256(JSON.stringify(base)) !== PINNED_BASE_SHA256) fail('full baseline SHA-256 mismatch; do not repin without review');
  const additions = JSON.parse(additionsText) as HistoricalAdditions;
  const provenance = JSON.parse(provenanceText) as SourceProvenance[];
  exactIds(additions.entities, entityIds.map(value => id('entity', value)), 'entity');
  exactIds(additions.relationships, suffixes.map(value => id('relationship', `OF-E-${value}`)), 'relationship');
  exactIds(additions.records, suffixes.map(value => id('record', `OF-C-${value}`)), 'record');
  exactIds(additions.sources, ['OF-S01', 'OF-S02', 'OF-S04'].map(value => id('source', value)), 'source');
  exactIds(additions.held, suffixes.map(value => id('hold', `OF-E-${value}`)), 'hold');
  const keys = ['entities', 'relationships', 'records', 'sources', 'held'] as const;
  const existing = new Set(keys.flatMap(key => base[key].map(row => row.id)));
  const addedIds = new Set<string>();
  for (const key of keys) for (const row of additions[key]) {
    if (existing.has(row.id) || addedIds.has(row.id)) fail(`ID collision: ${row.id}; no overwrite, merge or duplicate append is allowed`);
    if (row.namespace !== HISTORICAL_NAMESPACE) fail(`unexpected namespace: ${row.id}`);
    addedIds.add(row.id);
  }
  const sourceIds = new Set(additions.sources.map(source => source.id));
  const records = new Map(additions.records.map(record => [record.id, record]));
  const relationships = new Map(additions.relationships.map(edge => [edge.id, edge]));
  const allowedEntities = new Set([...additions.entities.map(entity => entity.id), REUSED_IRB_ID]);
  const reusedEntity = base.entities.find(entity => entity.id === REUSED_IRB_ID);
  if (!reusedEntity) fail('the exact retained IRB dependency is missing');
  for (const row of [...additions.entities, ...additions.relationships, ...additions.records, ...additions.held]) {
    if (!row.sourceIds.length || new Set(row.sourceIds).size !== row.sourceIds.length || row.sourceIds.some(sourceId => !sourceIds.has(sourceId))) fail(`source closure or duplicate source reference: ${row.id}`);
    if ('geography' in row) for (const geo of row.geography) {
      if (geo.sourceIds.some(sourceId => !sourceIds.has(sourceId))) fail(`geographic source closure: ${row.id}`);
    }
  }
  for (const edge of additions.relationships) {
    if (!allowedEntities.has(edge.from) || !allowedEntities.has(edge.to)) fail(`unknown endpoint: ${edge.id}`);
    if (edge.recordIds.length !== 1 || edge.responseIds.length || !records.has(edge.recordIds[0])) fail(`record closure: ${edge.id}`);
    const record = records.get(edge.recordIds[0])!;
    if (record.relationshipIds.length !== 1 || record.relationshipIds[0] !== edge.id ||
      record.entityIds.length !== 2 || record.entityIds[0] !== edge.from || record.entityIds[1] !== edge.to) fail(`nonreciprocal relationship/record linkage: ${edge.id}`);
  }
  for (const row of [...additions.records, ...additions.relationships]) {
    if (row.status !== PUBLIC_GRAPH_STATUS || row.tier !== 'self-reported' || row.statusAsOf !== HISTORICAL_SNAPSHOT ||
      row.fromDate !== null || row.toDate !== null || row.amounts.length) fail(`historical/status/amount invariant: ${row.id}`);
    if ('relationshipIds' in row && row.relationshipIds.some(edgeId => !relationships.has(edgeId))) fail(`relationship closure: ${row.id}`);
  }
  for (const source of additions.sources) {
    if (source.tier !== 'self-reported' || source.publishedAt !== null || !safeSourceUrl(source.url)) fail(`issuer/source date invariant: ${source.id}`);
  }
  const contextCountries: Record<string, string> = {
    [id('entity', 'ca_fairfax_india')]: 'CA', [id('entity', 'OF-N-FIH-MAURITIUS')]: 'MU', [id('entity', 'OF-N-ANCHORAGE')]: 'IN',
  };
  for (const row of [...additions.entities, ...additions.relationships, ...additions.records]) {
    for (const geo of row.geography) {
      const country = contextCountries[row.id];
      if (geo.stateCodes.length || geo.localityIds.length) fail(`precise geography is prohibited: ${row.id}`);
      if (country ? geo.scope !== 'country' || geo.basis !== 'country-context' || geo.countryCodes?.join() !== country
        : geo.scope !== 'unknown' || geo.basis !== 'unknown' || geo.countryCodes?.length) fail(`incorporation-only geography invariant: ${row.id}`);
    }
  }
  if (EXCLUDED_CLAIM_IDS.some(value => additionsText.includes(value))) fail('excluded packet claim detected');
  if (provenance.length !== 3 || new Set(provenance.map(row => row.sourceId)).size !== 3 ||
    provenance.some(row => !sourceIds.has(row.sourceId) || row.firstPublicationDate !== null)) fail('source provenance closure');
  // The source packet's :hold: IDs do not match the reader/model exclusion key.
  // Add separate derived guards; do not rewrite the source hold records or statuses.
  const guardHolds: InvestigationHeldRecord[] = [...additions.entities, ...additions.relationships, ...additions.records].map(row => ({
    id: row.id, namespace: HISTORICAL_NAMESPACE, kind: 'review-only-exact-id-guard',
    reason: 'PUBLIC_GRAPH_BLOCKED: historical review-only evidence. Excluded from factual map marks and paths pending next-head rendering and integration review.',
    sourceIds: row.sourceIds, route: row.route,
  }));
  const holdTargets: HistoricalHoldTarget[] = additions.held.map((hold, index) => {
    const edge = additions.relationships[index];
    if (hold.id !== id('hold', edge.originalId) || hold.kind !== PUBLIC_GRAPH_STATUS) fail(`hold target mismatch: ${hold.id}`);
    return { holdId: hold.id, relationshipIds: [edge.id], recordIds: edge.recordIds,
      entityIds: [edge.from, edge.to], status: PUBLIC_GRAPH_STATUS };
  });
  freeze(additions); freeze(provenance); freeze(guardHolds); freeze(holdTargets);
  const readerRegistry: InvestigationRegistry = {
    ...base,
    entities: [...base.entities, ...additions.entities],
    relationships: [...base.relationships, ...additions.relationships],
    records: [...base.records, ...additions.records],
    sources: [...base.sources, ...additions.sources],
    held: [...base.held, ...additions.held, ...guardHolds],
    coverage: [...base.coverage, {
      namespace: HISTORICAL_NAMESPACE, label: 'Historical review only · 2025-12-31 · PUBLIC_GRAPH_BLOCKED', route: '/investigate',
      entities: 9, relationships: 9, records: 9, sources: 3, held: additions.held.length + guardHolds.length,
      limitations: ['Issuer-reported; no current ownership, payment-flow, wrongdoing or propagated-control finding.'],
    }],
  };
  // Freeze only newly allocated containers. Original arrays/objects remain untouched.
  for (const key of [...keys, 'coverage'] as const) Object.freeze(readerRegistry[key]);
  Object.freeze(readerRegistry);
  const overlay = Object.freeze({ status: PUBLIC_GRAPH_STATUS, publicGraphEligible: false as const, snapshot: HISTORICAL_SNAPSHOT,
    graphRegistry: base, readerRegistry, additions, provenance, reusedEntity, guardHolds, holdTargets });
  admittedBases.set(overlay, base);
  return overlay;
}

/** Fail-closed admission boundary. Review data is never a factual graph input.
 * There is deliberately no "approved" status coercion or promotion switch.
 */
export function registryForSurface(overlay: HistoricalReviewOverlay, surface: 'factual' | 'historical-review'): InvestigationRegistry {
  const admittedBase = admittedBases.get(overlay);
  if (!admittedBase) fail('unverified overlay cannot cross the data admission boundary');
  if (overlay.status !== PUBLIC_GRAPH_STATUS || overlay.publicGraphEligible !== false) fail('unrecognized overlay publication policy');
  if (surface === 'factual') return admittedBase;
  if (surface === 'historical-review') return overlay.readerRegistry;
  return fail('unknown data admission surface');
}
