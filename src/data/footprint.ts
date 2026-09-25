/**
 * Global facility footprint for the conglomerate groups.
 *
 * Re-verified from source rather than inherited. The list this replaces asserted a
 * Mombasa port facility that does not exist — Adani's 2024 Kenya involvement was a
 * proposed Jomo Kenyatta airport concession and a KETRACO transmission PPP, both
 * cancelled in November 2024 — and carried five materially wrong coordinates, the
 * worst by about 19 km.
 *
 * It also asserted "trade routes" between terminals with invented strength values.
 * Shipping volumes between specific private terminals are not published. Those links
 * are gone; what remains is ownership and operation, each sourced.
 *
 * Facilities that could not be verified are in `rejected`, not in `places`. Two real
 * Reliance sites are among them, omitted because no coordinate could be confirmed —
 * an absent facility is a smaller error than an invented location.
 */

import raw from '../../research/raw/global-footprint.json';
import type { Tier } from '../graph/schema';

export type FacilityKind = 'port' | 'plant' | 'office' | 'mine' | 'hq' | 'partner';
export type FacilityStatus =
  | 'operating'
  | 'under-construction'
  | 'announced'
  | 'cancelled'
  | 'divested'
  | 'disputed';

export interface Facility {
  id: string;
  label: string;
  group: string;
  /** The specific listed entity that owns or operates it, not the group brand. */
  operator: string;
  kind: FacilityKind;
  lon: number;
  lat: number;
  country: string;
  status: FacilityStatus;
  since: string | null;
  notes: string;
  tier: Tier;
  srcs: [string, string][];
}

export interface FacilityLink {
  from: string;
  to: string;
  relation: 'owns' | 'operates' | 'supplies';
  tier: Tier;
  note: string;
  srcs: [string, string][];
}

const doc = raw as unknown as {
  asOf: string;
  sources: [string, string][];
  places: Facility[];
  links: FacilityLink[];
  rejected: { candidate: string; reason: string }[];
  gaps: string[];
};

export const FOOTPRINT_AS_OF = doc.asOf;
export const FACILITIES: Facility[] = doc.places;
export const FACILITY_LINKS: FacilityLink[] = doc.links;
export const FOOTPRINT_SOURCES = doc.sources;
/** Candidates checked and refuted. Published, because a refutation is a result. */
export const FOOTPRINT_REJECTED = doc.rejected;
export const FOOTPRINT_GAPS = doc.gaps;

export function facilitiesForGroup(groupId: string): Facility[] {
  return FACILITIES.filter((f) => f.group === groupId);
}

export function linksForGroup(groupId: string): FacilityLink[] {
  const ids = new Set(facilitiesForGroup(groupId).map((f) => f.id));
  return FACILITY_LINKS.filter((l) => ids.has(l.from) && ids.has(l.to));
}

/**
 * Status counts for a group. `cancelled` and `divested` are surfaced rather than
 * filtered out — a withdrawn concession is a fact about the group's reach, and a
 * map showing only what succeeded overstates it.
 */
export function statusCounts(groupId: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const f of facilitiesForGroup(groupId)) out[f.status] = (out[f.status] ?? 0) + 1;
  return out;
}

export const COUNTRIES_FOR = (groupId: string): string[] => [
  ...new Set(facilitiesForGroup(groupId).map((f) => f.country)),
].sort();
