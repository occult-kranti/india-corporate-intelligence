import type { InvestigationRegistry } from '../domain';
import type { SectorProjection, SectorReaderAdmission } from './types';
import { SECTOR_GRAPH_STATUS, SECTOR_READER_STATUS } from './types';
import { sectorFailure, validateSectorProjection, validateSectorReaderAdmission } from './validate';
export { validateSectorProjection, validateSectorReaderAdmission } from './validate';
export const SECTOR_REVIEW_VALUE = 'sector-2026-10' as const;
export const PINNED_SECTOR_BASE_SHA256 = '048f89ffd008a498212ff2ac71d4413aef09b138a50ab77f336a23fec4722064';
export const PINNED_SECTOR_PROJECTION_SHA256 = '83f4f8f016ea0e734095c43c2e1c46b2d1f080747265fef846cccc1f11d85a44';
export const PINNED_SECTOR_ADMISSION_SHA256 = 'adb923b208dd07c1c652cd77a9e1b48fd2a0d37a8d5d2f3a84414e57840ab34b';
export interface SectorReaderOverlay {
  readonly readerAdmission: SectorReaderAdmission;
  readonly projection: SectorProjection;
  readonly status: typeof SECTOR_GRAPH_STATUS;
  readonly publicGraphEligible: false; readonly publicPathEligible: false; readonly aggregationPermitted: false;
  /** The only registry reference. Narrative entries never enter a registry array. */
  readonly graphRegistry: InvestigationRegistry;
}
const admittedBases = new WeakMap<SectorReaderOverlay, InvestigationRegistry>();

export function sectorReviewRequested(search: string, enabled: boolean, dataset: string): boolean {
  const params = new URLSearchParams(search);
  const reviews = params.getAll('review');
  const datasets = params.getAll('dataset');
  return enabled && dataset === 'full' && reviews.length === 1 && reviews[0] === SECTOR_REVIEW_VALUE &&
    datasets.length <= 1 && datasets.every(value => value === 'full');
}
export function withoutSectorReview(href: string): string {
  const url = new URL(href); url.searchParams.delete('review');
  return `${url.pathname}${url.search}${url.hash}`;
}
async function sha256(text: string): Promise<string> {
  if (!globalThis.crypto?.subtle) sectorFailure('Web Crypto is required for exact-byte verification');
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
/** Never mutates, freezes, appends to or replaces any baseline object. */
export async function buildSectorReaderOverlay(base: InvestigationRegistry, projectionText: string, admissionText: string,
  optIn: typeof SECTOR_REVIEW_VALUE): Promise<SectorReaderOverlay> {
  if (optIn !== SECTOR_REVIEW_VALUE) sectorFailure('fresh explicit sector opt-in is required');
  if (await sha256(JSON.stringify(base)) !== PINNED_SECTOR_BASE_SHA256) sectorFailure('complete baseline SHA-256 mismatch');
  if (typeof projectionText !== 'string' || await sha256(projectionText) !== PINNED_SECTOR_PROJECTION_SHA256) sectorFailure('reviewed projection SHA-256 mismatch');
  if (typeof admissionText !== 'string' || await sha256(admissionText) !== PINNED_SECTOR_ADMISSION_SHA256) sectorFailure('reader admission SHA-256 mismatch');
  let projection: unknown; let readerAdmission: unknown;
  try { projection = JSON.parse(projectionText); readerAdmission = JSON.parse(admissionText); }
  catch { return sectorFailure('invalid JSON'); }
  validateSectorProjection(projection);
  validateSectorReaderAdmission(readerAdmission, projection, { base: PINNED_SECTOR_BASE_SHA256, projection: PINNED_SECTOR_PROJECTION_SHA256 });
  freeze(projection); freeze(readerAdmission);
  const overlay = Object.freeze({ projection, readerAdmission, status: SECTOR_GRAPH_STATUS,
    publicGraphEligible: false as const, publicPathEligible: false as const, aggregationPermitted: false as const, graphRegistry: base });
  admittedBases.set(overlay, base);
  return overlay;
}
/** No reader-registry option exists: every supported graph/search/path surface gets the exact base. */
export function registryForSectorSurface(overlay: SectorReaderOverlay, surface: 'factual' | 'search' | 'paths'): InvestigationRegistry {
  const base = admittedBases.get(overlay);
  if (!base || overlay.graphRegistry !== base || overlay.status !== SECTOR_GRAPH_STATUS ||
    overlay.readerAdmission.readerStatus !== SECTOR_READER_STATUS || overlay.publicGraphEligible !== false ||
    overlay.publicPathEligible !== false || overlay.aggregationPermitted !== false || !['factual', 'search', 'paths'].includes(surface)) sectorFailure('unverified overlay or unsupported data surface');
  return base;
}
