/**
 * Deep group datasets — the exhaustive entity, contract and investor maps.
 *
 * Distinct from `conglomerates.ts`, which carries the ten-group comparative summary.
 * This module carries the depth: every sourced subsidiary, JV and SPV, the government
 * contracts, the foreign capital, and the base-rate notes that say what any of it is
 * worth against peers.
 *
 * Each group's file arrives independently, so this module is written to hold a
 * partial set. A group with no deep file is not an error — it renders its summary
 * and says the deep map has not been built yet.
 */

import relianceRaw from '../../research/raw/reliance-deep.json';
import adaniRaw from '../../research/raw/adani-deep.json';
import type { Tier, StateCode } from '../graph/schema';

export type EntityKind = 'listed' | 'unlisted' | 'subsidiary' | 'jv' | 'trust' | 'spv';

export interface DeepEntity {
  id: string;
  name: string;
  kind: EntityKind;
  parent: string | null;
  sector: string;
  subSector?: string;
  nse: string | null;
  bse: string | null;
  isin: string | null;
  mcapCr: number | null;
  promoterHoldingPct: number | null;
  asOfQuarter: string | null;
  hqCity: string | null;
  state: string | null;
  stateCode: StateCode | null;
  incorporated: string | null;
  cin: string | null;
  status: string;
  notes: string;
  tier: Tier;
  srcs: [string, string][];
}

export interface DeepContract {
  awardingBody: string;
  level: 'centre' | 'state';
  state: string | null;
  entity: string;
  what: string;
  valueCr: number | null;
  awardDate: string | null;
  processType: string;
  bidders: number | null;
  tier: Tier;
  notes: string;
  srcs: [string, string][];
}

export interface DeepInvestor {
  name: string;
  country: string;
  type: string;
  entity: string;
  stakePct: number | null;
  since: string | null;
  status: string;
  amountCr: number | null;
  tier: Tier;
  notes: string;
  srcs: [string, string][];
}

export interface DeepFlow {
  entity: string;
  recipient?: string;
  amountCr: number | null;
  date?: string | null;
  period?: string;
  tier: Tier;
  notes?: string;
  srcs: [string, string][];
}

export interface DeepPerson {
  name: string;
  role: string;
  entity: string;
  family: boolean;
  since: string | null;
  din: string | null;
  srcs: [string, string][];
}

export interface DeepSector {
  sector: string;
  entities: string[];
  note: string;
  srcs?: [string, string][];
}

export interface GroupDeep {
  asOf: string;
  group: string;
  scope?: string;
  disambiguation?: Record<string, string>;
  sources: [string, string][];
  entities: DeepEntity[];
  sectors: DeepSector[];
  foreignInvestors: DeepInvestor[];
  govtContracts: DeepContract[];
  pmCares: DeepFlow[];
  csr: DeepFlow[];
  keyPeople: DeepPerson[];
  separateAnilAmbaniGroup?: unknown[];
  /**
   * What each pattern is worth against peer groups. Read these before reading
   * anything else here — several are explicitly VERIFIED FLOORS rather than counts,
   * and one rate is deliberately not computed at all because the group's visibility
   * is an artefact of it having filed a prospectus.
   */
  baseRateNotes: string[];
  gaps: string[];
  rejected?: { candidate: string; reason: string }[];
}

/** Add a group here as its deep file lands. Absence is a coverage gap, not an error. */
const DEEP: Record<string, GroupDeep> = {
  adani: adaniRaw as unknown as GroupDeep,
  reliance: relianceRaw as unknown as GroupDeep,
};

export const DEEP_GROUP_IDS = Object.keys(DEEP);
export const hasDeep = (groupId: string): boolean => groupId in DEEP;
export const getDeep = (groupId: string): GroupDeep | null => DEEP[groupId] ?? null;

export function entityCounts(g: GroupDeep): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of g.entities) out[e.kind] = (out[e.kind] ?? 0) + 1;
  return out;
}

export function tierCounts(g: GroupDeep): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of g.entities) out[e.tier] = (out[e.tier] ?? 0) + 1;
  return out;
}

/**
 * How many entities carry a CIN. This is the honest coverage measure for an entity
 * map: a name in a consolidation annexure establishes that something exists, but
 * without a registry identifier it cannot be resolved, joined, or checked.
 */
export function identifierCoverage(g: GroupDeep): { withCin: number; withTicker: number; total: number } {
  return {
    withCin: g.entities.filter((e) => e.cin).length,
    withTicker: g.entities.filter((e) => e.nse || e.bse).length,
    total: g.entities.length,
  };
}

export function contractsByLevel(g: GroupDeep): { centre: number; state: number } {
  return {
    centre: g.govtContracts.filter((c) => c.level === 'centre').length,
    state: g.govtContracts.filter((c) => c.level === 'state').length,
  };
}

export function investorsByType(g: GroupDeep): Record<string, number> {
  const out: Record<string, number> = {};
  for (const i of g.foreignInvestors) out[i.type] = (out[i.type] ?? 0) + 1;
  return out;
}

/** States the group's entities are registered in — registered, not operational. */
export function statesTouched(g: GroupDeep): StateCode[] {
  return [...new Set(g.entities.map((e) => e.stateCode).filter(Boolean))] as StateCode[];
}
