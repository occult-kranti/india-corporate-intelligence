/**
 * Distribution funds, 2000–2026 — typed access to the welfare research fleet.
 *
 * The data is generated: src/data/welfare.generated.ts is written by
 * scripts/assemble-fleet.mjs (`npm run generate`) from research/raw/welfare/*.json,
 * after reconciliation and audit. This file holds the shapes that data must satisfy
 * — exactly the scheme record in docs/research/FLEET_CONTRACT.md — and the helpers
 * pages derive figures through, so no page restates a number the dataset holds.
 *
 * Supersession, never deletion: a cut, a rename, an eligibility drive or a
 * discontinuation is a `status` entry, and the helpers below read that history
 * rather than any single "current" field.
 */

import type { Source, StateCode, Tier } from '../graph/schema';
import { WELFARE_META, WELFARE_SCHEMES } from './welfare.generated';

export {
  WELFARE_SCHEMES,
  WELFARE_ENTITIES,
  WELFARE_SCHEME_NODES,
  WELFARE_CLAIMS,
  WELFARE_BENEFITS,
  WELFARE_ELECTIONS,
  WELFARE_COVERAGE,
  WELFARE_EDGE_DOMAIN,
  WELFARE_BASE_RATES,
  WELFARE_NARRATIVES,
  WELFARE_VOIDS,
  WELFARE_SYMMETRY,
  WELFARE_GAPS,
  WELFARE_IDENTITY,
  WELFARE_META,
} from './welfare.generated';

// ---------------------------------------------------------------------------
// The scheme record
// ---------------------------------------------------------------------------

export type SchemeLevel = 'state' | 'central';

export type SchemeCategory =
  | 'women-cash' | 'farmer-cash' | 'pension' | 'grain' | 'unemployment' | 'student'
  | 'housing' | 'energy-subsidy' | 'loan-waiver' | 'consumer-goods' | 'transport' | 'other';

/** `announced` and `launched` are admitted by the quarantine validator as well as the contract's list. */
export type SchemeStatusKind =
  | 'live' | 'raised' | 'cut' | 'eligibility-tightened' | 'paused' | 'renamed'
  | 'discontinued' | 'promised-not-enacted' | 'announced' | 'launched';

export type MinisterAction = 'announced' | 'approved' | 'presented budget' | 'administers' | 'opposed';

export interface SchemeAnnounced {
  date: string | null;
  /** `pol:…` for a Union minister already in the graph, `wel:<slug>` otherwise. */
  byPersonId: string | null;
  office: string | null;
  srcs: Source[];
}

export interface SchemeApproved {
  date: string | null;
  body: string | null;
  srcs: Source[];
}

export interface SchemeLaunched {
  date: string | null;
  srcs: Source[];
}

export interface BenefitChange {
  date: string | null;
  amount: number | null;
  note: string | null;
  srcs: Source[];
}

export interface SchemeBenefit {
  /** Per head, in `unit` — never a total. */
  amount: number | null;
  unit: string | null;
  changes: BenefitChange[];
}

export interface BeneficiaryCount {
  asOf: string | null;
  count: number | null;
  srcs: Source[];
}

export interface OutlayRow {
  /** Indian financial year, e.g. "2023-24". */
  fy: string;
  budgetedCr: number | null;
  actualCr: number | null;
  pctOfStateBudget: number | null;
  pctOfGSDP: number | null;
  srcs: Source[];
}

export interface ElectionContext {
  election: string | null;
  date: string | null;
  /** Counted from the launch date, not the announcement — both dates are on the record. */
  monthsFromLaunch: number | null;
  incumbentParty: string | null;
  result: string | null;
  seatChange: string | null;
  srcs: Source[];
}

export interface SchemeStatus {
  date: string | null;
  status: SchemeStatusKind;
  note: string | null;
  srcs: Source[];
}

export interface SchemeResult {
  finding: string;
  tier: Tier;
  srcs: Source[];
}

export interface SchemeMinister {
  personId: string | null;
  role: string | null;
  action: MinisterAction | null;
  date: string | null;
  party: string | null;
  srcs: Source[];
}

export interface WhoElseBenefits {
  /** A node id or a plain name. */
  who: string;
  how: string | null;
  amountCr: number | null;
  tier: Tier | null;
  srcs: Source[];
}

export interface Scheme {
  id: string;
  name: string;
  al: string[];
  level: SchemeLevel;
  /** Null for a central scheme, which then carries applicableStates: 'all'. */
  st: StateCode | null;
  applicableStates: 'all' | null;
  category: SchemeCategory | null;
  party: string | null;
  announced: SchemeAnnounced | null;
  approved: SchemeApproved | null;
  launched: SchemeLaunched | null;
  benefit: SchemeBenefit | null;
  eligibility: string | null;
  beneficiaries: BeneficiaryCount[];
  outlay: OutlayRow[];
  electionContext: ElectionContext | null;
  status: SchemeStatus[];
  results: SchemeResult[];
  ministers: SchemeMinister[];
  whoElseBenefits: WhoElseBenefits[];
  srcs: Source[];
  /** The research file's domain — which sweep recorded it. */
  domain: string;
}

/**
 * A research file's declaration of what it searched. A state-year is painted
 * "searched, none live" only when an entry declares it; without one, the absence of
 * a scheme is a gap in the research, not a zero.
 *
 * The canonical shape is { st, fromYear, toYear, categories, method, srcs }. Files
 * written to the contract's earlier shape ({ years, searched, note }) are still
 * read: a two-element `years` becomes the range, and missing categories are
 * treated as ["all"] (the assembler warns). A longer `years` list names single
 * years and leaves the range null — read the years through coverageYears(). Any
 * other field the file wrote passes through unchecked.
 */
export interface Coverage {
  st: StateCode | 'central';
  fromYear: number | null;
  toYear: number | null;
  /** ["all"], or the categories the search covered. */
  categories: ['all'] | SchemeCategory[];
  method: string | null;
  srcs: Source[];
  /** The research file (stem) that made the declaration. */
  domain: string;
  [field: string]: unknown;
}

export interface Election {
  st: StateCode | null;
  election: string;
  date: string;
  incumbentParty: string | null;
  winner: string | null;
  srcs: Source[];
  domain: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export const WELFARE_AS_OF: string | null = WELFARE_META.asOf;

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const yearOf = (date: string | null | undefined): number | null => {
  const m = date ? ISO.exec(date) : null;
  return m ? Number(m[1]) : null;
};
// Code-unit order: ISO dates sort correctly as strings, and localeCompare would
// make the order depend on the reader's locale.
const byText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Schemes grouped by the state that runs them; central schemes sit under
 * 'central' rather than being copied into all 36 states, so a per-state count
 * never silently includes the Union's schemes.
 */
export function schemesByState(): Map<StateCode | 'central', Scheme[]> {
  const out = new Map<StateCode | 'central', Scheme[]>();
  for (const s of WELFARE_SCHEMES) {
    const k = s.level === 'central' || s.st == null ? 'central' : s.st;
    if (!out.has(k)) out.set(k, []);
    out.get(k)!.push(s);
  }
  for (const list of out.values()) {
    list.sort((a, b) => byText(a.launched?.date ?? '9999', b.launched?.date ?? '9999') || byText(a.id, b.id));
  }
  return out;
}

/**
 * Live in a calendar year: launched in or before it, and no dated `discontinued`
 * status in or before it. A scheme with no launch date is never counted live — an
 * announcement is not a transfer. An undated discontinuation cannot be placed in
 * time, so it does not end liveness; the gap stays visible in the status history.
 */
export function schemesLiveInYear(year: number): Scheme[] {
  return WELFARE_SCHEMES.filter((s) => {
    const launched = yearOf(s.launched?.date);
    if (launched == null || launched > year) return false;
    return !s.status.some((st) => {
      const y = yearOf(st.date);
      return st.status === 'discontinued' && y != null && y <= year;
    });
  });
}

/**
 * Whole calendar months from `a` to `b` (negative when b precedes a); null when
 * either date is missing or not ISO. 2023-06-10 → 2023-11-17 is 5: the sixth month
 * is not complete until the 10th.
 */
export function monthsBetween(a: string | null | undefined, b: string | null | undefined): number | null {
  const x = a ? ISO.exec(a) : null;
  const y = b ? ISO.exec(b) : null;
  if (!x || !y) return null;
  const [ya, ma, da] = [Number(x[1]), Number(x[2]), Number(x[3])];
  const [yb, mb, db] = [Number(y[1]), Number(y[2]), Number(y[3])];
  let months = (yb - ya) * 12 + (mb - ma);
  if (months > 0 && db < da) months -= 1;
  else if (months < 0 && db > da) months += 1;
  return months;
}

/**
 * The calendar years a coverage entry declares, ascending, or null when it states
 * none that can be read: the fromYear–toYear range, else the single years listed
 * in `years`.
 */
export function coverageYears(c: Coverage): number[] | null {
  if (c.fromYear != null && c.toYear != null) {
    return Array.from({ length: c.toYear - c.fromYear + 1 }, (_, i) => (c.fromYear as number) + i);
  }
  const ys = c.years;
  if (!Array.isArray(ys) || !ys.length || !ys.every((y) => Number.isInteger(y))) return null;
  return [...new Set(ys as number[])].sort((a, b) => a - b);
}

/** "2023-24", "2023-2024", "FY2023-24" and "2023–24" all name the same financial year. */
function normaliseFy(fy: string): string | null {
  const m = /^(?:FY\s*)?(\d{4})\s*[-–/]\s*(\d{2}|\d{4})$/i.exec(fy.trim());
  return m ? `${m[1]}-${m[2].slice(-2)}` : null;
}

/** The outlay row for one financial year, or null — never a zero standing in for "not recorded". */
export function outlayForFy(scheme: Scheme, fy: string): OutlayRow | null {
  const want = normaliseFy(fy);
  if (!want) return null;
  return scheme.outlay.find((o) => normaliseFy(o.fy) === want) ?? null;
}

/**
 * The most recent dated status; on a tie, the later entry in the history wins.
 * Undated entries count only when nothing in the history carries a date.
 */
export function latestStatus(scheme: Scheme): SchemeStatus | null {
  let best: SchemeStatus | null = null;
  for (const st of scheme.status) {
    if (!st.date) continue;
    if (!best || byText(st.date, best.date!) >= 0) best = st;
  }
  return best ?? scheme.status[scheme.status.length - 1] ?? null;
}
