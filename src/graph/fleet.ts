/**
 * Types for the research-fleet modules that scripts/assemble-fleet.mjs generates
 * (src/graph/energy.generated.ts, src/data/welfare.generated.ts).
 *
 * Hand-written on purpose. The generator emits data and never types, so changing a
 * shape is a reviewed edit here that every generated literal must then satisfy under
 * `tsc --strict` — the compiler becomes one more gate on what a fleet wrote, rather
 * than a rubber stamp on types the generator inferred from it.
 *
 * Optional research fields arrive as `null`, never as a plausible-looking default.
 * The exception is GNode/GEdge, whose schema already expresses absence by omission.
 */

import type { Predicate, Source, Tier } from './schema';

// ---------------------------------------------------------------------------
// Who benefits — the cui-bono row carried by a claim
// ---------------------------------------------------------------------------

export type BenefitConfidence = 'documented' | 'estimated' | 'unknown';

/** A claim's `benefit` block as the research file stated it. */
export interface ClaimBenefit {
  /** A node id where the beneficiary is in the graph, otherwise a plain name. */
  who: string;
  how: string | null;
  amountCr: number | null;
  confidence: BenefitConfidence | null;
}

/**
 * One row per surviving claim that names a beneficiary. The tier is the claim's
 * tier after audit, so a downgraded claim cannot keep presenting its benefit at
 * the tier it was written with.
 */
export interface BenefitRow extends ClaimBenefit {
  claimId: string;
  s: string;
  t: string;
  pred: Predicate;
  tier: Tier;
  srcs: Source[];
  domain: string;
}

// ---------------------------------------------------------------------------
// The discipline sections every fleet file carries
// ---------------------------------------------------------------------------

/** A documented absence. Rendered as loudly as any flow — see HANDOFF.md, "Standing". */
export interface Void {
  what: string;
  whyItMatters: string | null;
  srcs: Source[];
  domain: string;
}

export type NarrativeStatus =
  | 'established' | 'well-supported' | 'contested' | 'speculative' | 'unsupported' | 'debunked';

export interface Narrative {
  claim: string;
  status: NarrativeStatus;
  strongestCase: string | null;
  strongestCounter: string | null;
  whatWouldChangeThis: string | null;
  srcs: Source[];
  domain: string;
}

/** A numerator is not a finding without its denominator; both travel together or not at all. */
export interface BaseRateRow {
  property: string;
  numerator: number | null;
  denominator: number | null;
  /** What the denominator actually is. */
  label: string | null;
  srcs: Source[];
  domain: string;
}

/** Free text attributed to one research domain: the symmetry check, a recorded gap. */
export interface FleetText {
  domain: string;
  text: string;
}

/**
 * Identity keys and public role, kept beside the node rather than folded into its
 * `d` facts: a DIN or an office-with-dates is how the node was resolved, not a
 * claim about the entity, and it carries no tier of its own.
 */
export interface EntityIdentity {
  /** cin, din, nse, office, dob first, then any further keys the researcher recorded. */
  identity: Record<string, string | null> | null;
  publicRole: string | null;
}

// ---------------------------------------------------------------------------
// Claims that did not become edges — retained, never deleted
// ---------------------------------------------------------------------------

/**
 * A claim held out of the edges. Typed loosely (pred and tier as plain strings)
 * because the assembler must never fail on a record it is refusing: a killed
 * claim with a malformed field is still a killed claim, and still on the record.
 */
export interface HeldClaim {
  id: string;
  s: string;
  t: string;
  pred: string;
  tier: string;
  a: number | null;
  lab: string | null;
  d: string | null;
  from: string | null;
  to: string | null;
  srcs: Source[];
  innocentReading: string | null;
  upgradeIf: string | null;
  killIf: string | null;
  supersededBy: string | null;
  benefit: ClaimBenefit | null;
  domain: string;
  file: string;
}

export interface KilledClaim extends HeldClaim {
  status: 'killed';
  killedReason: string;
}

export interface ExcludedClaim extends HeldClaim {
  excludedReason: string;
}

// ---------------------------------------------------------------------------
// Audit and run metadata
// ---------------------------------------------------------------------------

/** One cross-examiner verdict as read from AUDIT.json, and what the assembler did with it. */
export interface AuditRecord {
  claimId: string;
  domain: string | null;
  lens: string | null;
  refuted: boolean;
  recommendedTier: string | null;
  sourceCheck: string | null;
  denialFound: string | null;
  innocentReading: string | null;
  reason: string | null;
  corrections: string[];
  applied: string[];
}

export interface FleetFileMeta {
  file: string;
  domain: string;
  asOf: string | null;
  entities: number;
  claims: number;
  killed: number;
}

export interface ReconciliationMapping {
  from: string;
  to: string;
  note: string | null;
}

export interface MergedRecord {
  id: string;
  /** The ids the collapsed records carried before reconciliation, in file order. */
  ids: string[];
  files: string[];
  /**
   * Fields the first record left null and a later record supplied, with the file
   * that supplied each. Optional because a fleet whose research cannot assemble
   * keeps its last clean module, which may predate this field — a new generated
   * field must never break the build for the fleet that cannot regenerate.
   */
  filledFrom?: { field: string; file: string }[];
}

export interface FleetMeta {
  fleet: 'energy' | 'welfare';
  generator: string;
  generatorVersion: string;
  /** The latest `asOf` among the research files; null when the fleet has not run. */
  asOf: string | null;
  /** 'run-' + FNV-1a-64 over the generator version and every input's bytes. No clock. */
  runId: string;
  empty: boolean;
  note: string | null;
  inputs: string[];
  files: FleetFileMeta[];
  counts: Record<string, number>;
  reconciliation: { mappings: ReconciliationMapping[]; merged: MergedRecord[] };
  audit: { asOf: string | null; verdicts: AuditRecord[]; unmatched: AuditRecord[] } | null;
  killed: KilledClaim[];
  excluded: ExcludedClaim[];
}
