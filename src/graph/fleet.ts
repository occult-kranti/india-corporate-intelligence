/**
 * Types for the research-fleet modules that scripts/assemble-fleet.mjs generates —
 * one per row of FLEETS in scripts/lib/vocab.mjs (src/graph/energy.generated.ts,
 * src/data/welfare.generated.ts, src/graph/{finance,ngo,capital}.generated.ts).
 *
 * Hand-written on purpose. The generator emits data and never types, so changing a
 * shape is a reviewed edit here that every generated literal must then satisfy under
 * `tsc --strict` — the compiler becomes one more gate on what a fleet wrote, rather
 * than a rubber stamp on types the generator inferred from it.
 *
 * Optional research fields arrive as `null`, never as a plausible-looking default.
 * The exception is GNode/GEdge, whose schema already expresses absence by omission.
 */

import type { LoanTerms, Predicate, Source, StateCode, Tier } from './schema';

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
// Loans — the census and the researched sample (docs/design/FINANCE_PAGE.md §3.3, G1/G2)
// ---------------------------------------------------------------------------

/**
 * Which branch of the World Bank fetcher's placement rule put a project in a state:
 * a state government as borrower; a state government among the implementing agencies;
 * an implementing body seated outside Delhi (not a ministry, not a registered seat
 * alone); a state the project title names. Never a registered office.
 */
export type StateBasis = 'borrower-state' | 'agency-state' | 'agency-seat' | 'title';

/** `census`: the scripted World Bank projects table. `researched`: every other loan record. */
export type LoanPopulation = 'census' | 'researched';

/**
 * One row per `loan` edge, keyed by claim id. Census rows are a COPY of the fields
 * scripts/finance/fetch-worldbank.mjs wrote into worldbank-projects.json projects[]
 * (the project row and the claim's leg); researched rows carry only what their claim
 * states, so every census-only field is null there — never a figure read from prose.
 */
export interface LoanFact {
  /** World Bank project id (P + six digits) — the claim's `projectId`. */
  project: string | null;
  /** The Projects API status, verbatim ("Active", "Closed", "Pipeline"…). Census only. */
  status: string | null;
  /** Census only: status Pipeline, or approval dated after the fetch. */
  pipeline: boolean | null;
  /** This leg's commitment in US$ million (2 dp), as the claim's `d` states it. Census only. */
  usdM: number | null;
  /** PA.NUS.FCRF LCU per US$ used for `a`, as published; null before the series. Census only. */
  fxRate: number | null;
  /** The rate note the claim's `d` states, or why there is no rate. Census only. */
  fxBasis: string | null;
  /** The fetcher's placement (FINANCE_PAGE.md D8 "fetcher" class). Census only. */
  st: StateCode | null;
  stBasis: StateBasis | null;
  /** Projects API `major_sector_name`, verbatim — no crosswalk across the FY2017 taxonomy change. */
  majorSector: string | null;
  sector1: string | null;
  population: LoanPopulation;
  /**
   * False when this record is not one loan of its population's count: a census
   * pipeline leg, or a researched record that repeats a loan counted elsewhere.
   */
  countable: boolean;
  /** The claim that counts this loan (research/raw/finance/RECONCILIATION.json `countedAs`). */
  countedAs: string | null;
  notCountableReason: string | null;
}

/** worldbank-projects.json `provenance.totals`, key for key. */
export interface WbCensusTotals {
  projects: number;
  claims: number;
  croreExclPipeline: number;
  usdMExclPipeline: number;
  pipeline: number;
  dropped: number;
  grantOnly: number;
  otherOnly: number;
  noRupee: number;
  borrowerUnstated: number;
  agencyUnstated: number;
  noInstrument: number;
}

/** worldbank-projects.json `provenance.totals`, `fieldMap` and `fx`, verbatim. */
export interface WbTotals {
  totals: WbCensusTotals;
  /** projects[] field → where it comes from in the API, or the rule that computed it. */
  fieldMap: Record<string, string>;
  fx: { indicator: string; firstYear: number | null; lastYear: number | null; conversion: string };
}

// ---------------------------------------------------------------------------
// FCRA state-wise receipts (docs/design/FINANCE_PAGE.md §3.3, P5/G4)
// ---------------------------------------------------------------------------

/**
 * One state/UT × financial-year row of a Parliament annexure, transcribed into the
 * `fcByState` list of the research file the fleet's FLEETS row names as `fcState`
 * (research/raw/ngo/fcra-receipts.json: RS Unstarred Q.3253 of 29.03.2023, Annexure I
 * received and Annexure II utilised). The assembler refuses the file unless, for every
 * FY the rows name, their receivedCr sum to the same file's current national `grant`
 * claim for that FY within ₹1 crore — so a row here is always a share of a total the
 * page also prints, never a figure on its own.
 */
export interface FcStateRow {
  /** Null for an annexure row that is not a state or UT (e.g. "not specified"); `note` then says what the row is. */
  st: StateCode | null;
  /** The annexure's own spelling ("Orissa", "Pondicherry"), kept for the audit trail. */
  stateName: string;
  /** The Indian financial year as the answer labels it: "2019-20" is 2019-04-01 to 2020-03-31. */
  fy: string;
  /** Foreign contribution received in the FY, ₹ crore, as printed (nominal). */
  receivedCr: number;
  /** Foreign contribution utilised in the FY, ₹ crore, as printed; null when the answer gives no utilisation column. */
  utilisedCr: number | null;
  note: string | null;
  srcs: Source[];
}

// ---------------------------------------------------------------------------
// Capital ownership — holdings, coverage, controls (docs/design/FINANCE_PAGE.md §3.3, G3a–c)
// ---------------------------------------------------------------------------

/**
 * How the filing classes the line: the company's promoter; a member of its promoter
 * group; a foreign portfolio investor; a foreign direct investor; a depositary holding
 * legal title for unnamed receipt holders (never a beneficial owner); a domestic
 * insurer's line; anything else (a public 'Foreign Companies' line, a joint-venture
 * stake, a parent link).
 */
export type HoldingCategory = 'promoter' | 'promoter-group' | 'fpi' | 'fdi' | 'custodian' | 'domestic-insurer' | 'other';

/**
 * G3a. The structured reading of one `own` claim's line, keyed by claim id in
 * CAPITAL_HOLDINGS — surviving edges only. Every value is read from the claim's own
 * `d`/`lab` (the assembler refuses a figure the text does not print), so a number here
 * never says more than the record does.
 */
export interface Holding {
  /** Percentage of the company, 0–100, as printed; null when the text states no figure for this holder. */
  pct: number | null;
  /** Whole shares, as printed (Indian or Western grouping); null when the line prints none. */
  shares: number | null;
  /** ISO date of the line (the filing's quarter end, or the fund-file date for an aggregate); null only when the claim carries no date. */
  asOf: string | null;
  category: HoldingCategory;
  /** The line as the record prints it — a verbatim part of the claim's `d` or `lab`. */
  line: string;
  /** True for the holders-aggregates ETF lower bounds (analytic): no filing names this holder. Never add these to filing lines. */
  aggregate: boolean;
}

/**
 * What was read for a company: `primary` — a named-holder table (SEBI Reg. 31
 * Table II/III) in the company's own filing; `aggregator` — category totals only (an
 * aggregator such as screener.in, or a filing's summary without named holders), so a
 * missing name there says nothing; `not-read` — nothing was read.
 */
export type CoverageRead = 'primary' | 'aggregator' | 'not-read';

/** G3b. One row per index constituent the capital fleet was assigned (research/raw/capital/coverage.json). */
export interface CapitalCoverage {
  /** The constituent's `co:` id (indices.json `existingId`). */
  company: string;
  /** The date of what was read (quarter end); null exactly when `read` is `not-read`. */
  asOf: string | null;
  read: CoverageRead;
  /** The research file (domain) whose scope and voids record the read. */
  domain: string;
  /** The filing read, or the attempts that failed. */
  srcs: Source[];
  note: string | null;
}

/**
 * `subject` — a holder the research exists to calibrate; `comparison` — a holder
 * measured with the same lens so the subject is never shown alone; `domestic-control` —
 * the domestic holder measured the same way; `adviser-subject` / `adviser-comparison` —
 * the same two roles for adviser mandates.
 */
export type ControlRole = 'subject' | 'comparison' | 'domestic-control' | 'adviser-subject' | 'adviser-comparison';

/** G3c. The capital SPEC's declared comparison sets, in declared order (research/raw/capital/controls.json). */
export interface CapitalControl {
  /** The node id; null when the fleet recorded no entity for this declared member (`resolved: false`). */
  id: string | null;
  label: string;
  role: ControlRole;
  resolved: boolean;
  /** Where the membership is declared. */
  declaredIn: string;
  note: string | null;
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
  /** Present only when the claim wrote terms. */
  terms?: LoanTerms | null;
  /** Present only when the claim wrote a World Bank project id. */
  projectId?: string | null;
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
  /** The fleet's key in FLEETS (scripts/lib/vocab.mjs). */
  fleet: 'energy' | 'welfare' | 'finance' | 'ngo' | 'capital';
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
