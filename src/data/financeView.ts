/**
 * /finance — every derivation the page prints. Spec: docs/design/FINANCE_PAGE.md §3.2.
 *
 * Pure, and computed at module scope (or from a parsed `Filters`), so the page, its
 * twins and its exports read the same arrays and cannot disagree. The only literals
 * here are the anchor ids below, checked at load: a renamed domain or node fails the
 * build instead of silently emptying a surface. No figure in this file is a count
 * copied from a brief; every number is read from the generated modules.
 */

import {
  FINANCE_NODES, FINANCE_EDGES, FINANCE_EDGE_DOMAIN, FINANCE_BENEFITS, FINANCE_LOAN_FACTS, FINANCE_WB_TOTALS,
  FINANCE_VOIDS, FINANCE_NARRATIVES, FINANCE_BASE_RATES, FINANCE_SYMMETRY, FINANCE_GAPS, FINANCE_META,
} from '../graph/finance.generated';
import {
  NGO_NODES, NGO_EDGES, NGO_EDGE_DOMAIN, NGO_BENEFITS, NGO_VOIDS, NGO_NARRATIVES, NGO_BASE_RATES, NGO_SYMMETRY,
  NGO_GAPS, NGO_META, NGO_FC_STATE,
} from '../graph/ngo.generated';
import {
  CAPITAL_NODES, CAPITAL_EDGES, CAPITAL_EDGE_DOMAIN, CAPITAL_BENEFITS, CAPITAL_VOIDS, CAPITAL_NARRATIVES,
  CAPITAL_BASE_RATES, CAPITAL_SYMMETRY, CAPITAL_GAPS, CAPITAL_IDENTITY, CAPITAL_META, CAPITAL_HOLDINGS,
  CAPITAL_COVERAGE, CAPITAL_CONTROLS,
} from '../graph/capital.generated';
import { WELFARE_SCHEMES, WELFARE_ELECTIONS } from './welfare.generated';
import { NIFTY50, INDICES_AS_OF, INDEX_CHANGES, type Constituent } from './indices';
import { STATES, STATE_NAMES } from './geo';
import { NODES as PLATFORM_NODES } from '../graph/data';
import { COMPANIES } from './companies';
import { TIER_ORDER, type GEdge, type GNode, type Tier, type StateCode, type Source } from '../graph/schema';
import type { BaseRateRow, BenefitRow, FleetMeta, FleetText, Narrative, Void, LoanFact } from '../graph/fleet';

// ---------------------------------------------------------------------------
// Anchors (spec §3.2) — the only literals the derivations hold
// ---------------------------------------------------------------------------

export const CENSUS_DOMAIN = 'worldbank-projects';
export const AGGREGATES_DOMAIN = 'holders-aggregates';
export const AGG_SOURCE = 'ngo:foreign-sources-aggregate';
export const AGG_RECIPIENT = 'ngo:fcra-associations-aggregate';
export const MOF = 'min:ministry-of-finance';
export const SANCTIONS = 'fin:world-bank-sanctions-system';
export const CONTROL_ROLE_PREFIX = 'Mandatory comparison control';
export const WELFARE_JOIN_DOMAIN = 'darpan-welfare-join';
/** Page size of every paged table (energy C15): paged, never truncated. */
export const PAGE_SIZE = 400;
/** A share is printed only over a denominator at least this large (welfare K6). */
export const SHARE_FLOOR = 10;
/** Band A below this many holders withholds the matrix (Review Focus 5). */
export const BAND_A_FLOOR = 4;

// An anchor that no longer names anything is a renamed domain or node: fail at load
// (and so at build and in smoke) rather than print an empty map or a silent zero.
// Only checked when the register is promoted — an empty module names nothing.
if (!FINANCE_META.empty) {
  if (!Object.values(FINANCE_EDGE_DOMAIN).includes(CENSUS_DOMAIN)) throw new Error(`finance anchor missing: domain ${CENSUS_DOMAIN}`);
  if (!FINANCE_NODES.some((n) => n.id === MOF)) throw new Error(`finance anchor missing: ${MOF}`);
  if (!FINANCE_NODES.some((n) => n.id === SANCTIONS)) throw new Error(`finance anchor missing: ${SANCTIONS}`);
}
if (!NGO_META.empty) {
  for (const id of [AGG_SOURCE, AGG_RECIPIENT]) if (!NGO_NODES.some((n) => n.id === id)) throw new Error(`ngo anchor missing: ${id}`);
}
if (!CAPITAL_META.empty && !Object.values(CAPITAL_EDGE_DOMAIN).includes(AGGREGATES_DOMAIN)) {
  throw new Error(`capital anchor missing: domain ${AGGREGATES_DOMAIN}`);
}

// ---------------------------------------------------------------------------
// Lenses, modules, nodes
// ---------------------------------------------------------------------------

export type Lens = 'loans' | 'associations' | 'capital';
export const LENSES: Lens[] = ['loans', 'associations', 'capital'];
export const LENS_LABEL: Record<Lens, string> = { loans: 'Loans', associations: 'Associations', capital: 'Capital' };

export interface LensModule {
  fleet: 'finance' | 'ngo' | 'capital';
  nodes: GNode[];
  edges: GEdge[];
  domainOf: Record<string, string>;
  benefits: BenefitRow[];
  voids: Void[];
  narratives: Narrative[];
  baseRates: BaseRateRow[];
  symmetry: FleetText[];
  gaps: FleetText[];
  meta: FleetMeta;
}

export const MODULES: Record<Lens, LensModule> = {
  loans: { fleet: 'finance', nodes: FINANCE_NODES, edges: FINANCE_EDGES, domainOf: FINANCE_EDGE_DOMAIN, benefits: FINANCE_BENEFITS, voids: FINANCE_VOIDS, narratives: FINANCE_NARRATIVES, baseRates: FINANCE_BASE_RATES, symmetry: FINANCE_SYMMETRY, gaps: FINANCE_GAPS, meta: FINANCE_META },
  associations: { fleet: 'ngo', nodes: NGO_NODES, edges: NGO_EDGES, domainOf: NGO_EDGE_DOMAIN, benefits: NGO_BENEFITS, voids: NGO_VOIDS, narratives: NGO_NARRATIVES, baseRates: NGO_BASE_RATES, symmetry: NGO_SYMMETRY, gaps: NGO_GAPS, meta: NGO_META },
  capital: { fleet: 'capital', nodes: CAPITAL_NODES, edges: CAPITAL_EDGES, domainOf: CAPITAL_EDGE_DOMAIN, benefits: CAPITAL_BENEFITS, voids: CAPITAL_VOIDS, narratives: CAPITAL_NARRATIVES, baseRates: CAPITAL_BASE_RATES, symmetry: CAPITAL_SYMMETRY, gaps: CAPITAL_GAPS, meta: CAPITAL_META },
};
export const moduleFor = (lens: Lens) => MODULES[lens];

/** The lens whose module holds an edge id. */
export const LENS_OF_EDGE = new Map<string, Lens>();
for (const l of LENSES) for (const e of MODULES[l].edges) if (e.id && !LENS_OF_EDGE.has(e.id)) LENS_OF_EDGE.set(e.id, l);
export const EDGE_BY_ID = new Map<string, GEdge>();
for (const l of LENSES) for (const e of MODULES[l].edges) if (e.id && !EDGE_BY_ID.has(e.id)) EDGE_BY_ID.set(e.id, e);
const countBy = (es: GEdge[]) => { const m = new Map<string, number>(); for (const e of es) m.set(e.pred, (m.get(e.pred) ?? 0) + 1); return m; };
export const NGO_BY_PRED = countBy(NGO_EDGES);
export const CAPITAL_BY_PRED = countBy(CAPITAL_EDGES);
export const DOMAIN_OF = (id: string | undefined): string | null =>
  !id ? null : FINANCE_EDGE_DOMAIN[id] ?? NGO_EDGE_DOMAIN[id] ?? CAPITAL_EDGE_DOMAIN[id] ?? null;

// A node id may be recorded by two research modules; the labels agree today and the
// later module's record is used, the same order the acceptance fixtures resolve in.
const MODULE_NODE = new Map<string, GNode>();
for (const n of [...FINANCE_NODES, ...NGO_NODES, ...CAPITAL_NODES]) MODULE_NODE.set(n.id, n);
const PLATFORM_NODE = new Map<string, GNode>(PLATFORM_NODES.map((n) => [n.id, n]));

export const ALL_EMPTY = FINANCE_META.empty && NGO_META.empty && CAPITAL_META.empty;
export const isEmpty = (lens: Lens) => MODULES[lens].meta.empty;

export function nodeOf(id: string): GNode | null {
  return MODULE_NODE.get(id) ?? PLATFORM_NODE.get(id) ?? null;
}
// `co:` endpoints are minted by the national build from the companies dataset (the node
// the merged graph holds), so their names come from the same field it reads. Used for
// labels only: a company's registered state never feeds placement or the stipple.
const COMPANY_LABEL = new Map<string, string>(COMPANIES.map((c) => [`co:${c.id}`, c.shortName || c.name]));
export const UNREGISTERED = '(not in the register)';
/** A label for any id; an id no register or dataset holds is printed as itself and says so. */
export function labelOf(id: string): string {
  return nodeOf(id)?.label ?? COMPANY_LABEL.get(id) ?? `${id} ${UNREGISTERED}`;
}
export const resolves = (id: string) => nodeOf(id) != null || COMPANY_LABEL.has(id);

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

export const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
export const yearOf = (d: string | null | undefined): number | null =>
  typeof d === 'string' && /^\d{4}/.test(d) ? Number(d.slice(0, 4)) : null;
export const precisionOf = (d: string | null | undefined): 'year' | 'month' | 'day' | '' =>
  !d ? '' : /^\d{4}-\d{2}-\d{2}/.test(d) ? 'day' : /^\d{4}-\d{2}/.test(d) ? 'month' : /^\d{4}/.test(d) ? 'year' : '';
const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
export const byLabel = (a: { label: string }, b: { label: string }) => cmp(a.label, b.label);

/** ₹ crore as the house prints it: Indian grouping, at most two decimals. */
export function fmtCr(v: number): string {
  return v.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}
export function fmtInt(v: number): string {
  return v.toLocaleString('en-IN');
}
/** A count that is never a bare zero: "0 records" rather than "0". */
export function countOf(n: number, unit: string): string {
  return `${fmtInt(n)} ${unit}`;
}
/** A share, only over a denominator large enough to carry one (SHARE_FLOOR). */
export function shareOf(a: number, b: number): string | null {
  if (!(b >= SHARE_FLOOR) || !finite(a)) return null;
  return `${((100 * a) / b).toFixed(1)}%`;
}

export const STATE_CODES: StateCode[] = STATES.map((s) => s.id).sort(cmp);
export const stateName = (st: string) => STATE_NAMES[st] ?? st;
/** States alphabetically by name, as the rail lists them. */
export const STATES_BY_NAME = [...STATES].sort((a, b) => cmp(a.name, b.name));
/** North to south, the map's keyboard order; the map twin lists states in it too. */
export const STATES_NORTH_SOUTH = [...STATES].sort((a, b) => a.cy - b.cy || cmp(a.id, b.id));

export const tierRank = (t: Tier) => TIER_ORDER.indexOf(t);
/** A band merging several records takes its weakest tier, so aggregation never overstates. */
export const weakest = (ts: Tier[]): Tier => ts.reduce<Tier>((w, t) => (tierRank(t) > tierRank(w) ? t : w), 'documented');

/** The first `P######` project token in a label (census labels carry it; it is also how a researched record is grouped in Find). */
export const pToken = (lab: string | undefined): string | null => (lab ?? '').match(/\bP\d{6}\b/)?.[0] ?? null;

// ---------------------------------------------------------------------------
// As-of and run ids
// ---------------------------------------------------------------------------

export const ASOF: Record<Lens, string | null> = { loans: FINANCE_META.asOf, associations: NGO_META.asOf, capital: CAPITAL_META.asOf };
export const RUN: Record<Lens, string> = { loans: FINANCE_META.runId, associations: NGO_META.runId, capital: CAPITAL_META.runId };
export const FLEET_NAME: Record<Lens, string> = { loans: 'finance', associations: 'ngo', capital: 'capital' };
/** One date when the three registers agree, else their span. */
export const ASOF_LABEL: string = (() => {
  const ds = [...new Set(LENSES.map((l) => ASOF[l]).filter((d): d is string => !!d))].sort();
  if (!ds.length) return 'not promoted';
  return ds.length === 1 ? ds[0] : `${ds[0]}–${ds[ds.length - 1]}`;
})();
export { INDICES_AS_OF };
export const FILES_TOTAL = LENSES.reduce((s, l) => s + (MODULES[l].meta.counts?.files ?? 0), 0);
export const VERDICTS_TOTAL = LENSES.reduce((s, l) => s + (MODULES[l].meta.audit?.verdicts?.length ?? 0), 0);

// ---------------------------------------------------------------------------
// Loans — census and researched sample (D4, D5)
// ---------------------------------------------------------------------------

export type Inclusion = 'census-counted' | 'census-no-rupee' | 'researched-listed' | 'researched-no-rupee';
export const INCLUSIONS: Inclusion[] = ['census-counted', 'census-no-rupee', 'researched-listed', 'researched-no-rupee'];

export const LOANS: GEdge[] = [...FINANCE_EDGES.filter((e) => e.pred === 'loan'), ...CAPITAL_EDGES.filter((e) => e.pred === 'loan')];
const CENSUS_IDS = new Set(LOANS.filter((e) => FINANCE_EDGE_DOMAIN[e.id ?? ''] === CENSUS_DOMAIN).map((e) => e.id));
export const isCensus = (e: GEdge) => CENSUS_IDS.has(e.id);
export const CENSUS: GEdge[] = LOANS.filter(isCensus);
export const RESEARCHED: GEdge[] = LOANS.filter((e) => !isCensus(e));
export const hasRupee = (e: GEdge) => finite(e.a);
export function inclusion(e: GEdge): Inclusion {
  if (isCensus(e)) return hasRupee(e) ? 'census-counted' : 'census-no-rupee';
  return hasRupee(e) ? 'researched-listed' : 'researched-no-rupee';
}
export const INCLUSION_WORDS: Record<Inclusion, string> = {
  'census-counted': 'counted',
  'census-no-rupee': 'in no total',
  'researched-listed': 'listed, not summed',
  'researched-no-rupee': 'in no total',
};
/** The only ₹ summation for loans on the page: census rows with a numeric amount. */
export function rupeeTotal(rows: GEdge[]): number {
  let s = 0;
  for (const e of rows) if (isCensus(e) && finite(e.a)) s += e.a;
  return Math.round(s * 100) / 100;
}
export const NO_AMOUNT = 'amount not stated / in US$ m';

export const LOAN_FACT = (e: GEdge): LoanFact | null => (e.id ? FINANCE_LOAN_FACTS[e.id] ?? null : null);
export const G1 = Object.keys(FINANCE_LOAN_FACTS).length > 0;
export const G2 = FINANCE_WB_TOTALS != null;
export const WB_TOTALS = FINANCE_WB_TOTALS;

export const lenderOf = (e: GEdge) => e.s;
export const instrumentOf = (e: GEdge): string | null => e.terms?.instrument ?? null;
export const conditionsOf = (e: GEdge): string[] => e.terms?.conditions ?? [];
export const sectorOf = (e: GEdge): string | null => LOAN_FACT(e)?.majorSector ?? null;
export const isFutureDated = (e: GEdge) => !!(e.from && FINANCE_META.asOf && e.from > FINANCE_META.asOf);
export const isPipeline = (e: GEdge) => LOAN_FACT(e)?.pipeline === true;

const BENEFIT_BY_CLAIM = new Map<string, BenefitRow>();
for (const b of [...FINANCE_BENEFITS, ...NGO_BENEFITS, ...CAPITAL_BENEFITS]) if (!BENEFIT_BY_CLAIM.has(b.claimId)) BENEFIT_BY_CLAIM.set(b.claimId, b);
export const benefitOf = (e: GEdge): BenefitRow | null => (e.id ? BENEFIT_BY_CLAIM.get(e.id) ?? null : null);

/**
 * Strict placement (spec §3.2 `placement`, F5, D7): a `ty: 'state'` node is the
 * borrower, or else it is the benefit row's `who` (the state government implements).
 * Both are structural fields; the fetcher's looser rule (G1) is its own labelled class,
 * and a registered office or a head office is never a place.
 */
export type StrictRule = 'state government is the borrower' | 'state government implements';
export function strictPlacement(e: GEdge): { st: StateCode; rule: StrictRule } | null {
  const t = nodeOf(e.t);
  if (t && t.ty === 'state' && t.st) return { st: t.st, rule: 'state government is the borrower' };
  const who = benefitOf(e)?.who;
  const w = who ? nodeOf(who) : null;
  if (w && w.ty === 'state' && w.st) return { st: w.st, rule: 'state government implements' };
  return null;
}
export function strictSt(e: GEdge): StateCode | null {
  return strictPlacement(e)?.st ?? null;
}
/** The fetcher's placement (G1), only where neither strict branch places the record. */
export function fetcherSt(e: GEdge): StateCode | null {
  if (strictSt(e)) return null;
  return LOAN_FACT(e)?.st ?? null;
}
const BODY_TY = new Set(['psu', 'agency', 'fund']);
/** A state body's registered state (the stipple): never Delhi, the seat of every Union body. */
export function bodySt(e: GEdge): StateCode | null {
  if (strictSt(e) || fetcherSt(e)) return null;
  const b = benefitOf(e);
  for (const id of [e.t, b?.who].filter((x): x is string => !!x)) {
    const n = nodeOf(id);
    if (n && BODY_TY.has(n.ty) && n.st && n.st !== 'dl') return n.st;
  }
  return null;
}
export const BASIS_WORDS: Record<string, string> = {
  'borrower-state': 'state government is the borrower',
  'agency-state': 'a state government implements',
  'agency-seat': 'an implementing body is seated in the state',
  title: 'the project title names the state',
};
export function placementRule(e: GEdge): string {
  const p = strictPlacement(e);
  if (p) return p.rule;
  const f = LOAN_FACT(e);
  if (f?.st) return `placed by the fetcher's rule (${BASIS_WORDS[f.stBasis ?? ''] ?? 'basis not exported'})`;
  const n = nodeOf(e.t);
  if (n?.ty === 'company') return 'corporate borrower — head office is not where the money went';
  if (n && (n.ty === 'ministry' || n.st === 'dl' || n.ty === 'psu' || n.ty === 'agency' || n.ty === 'fund')) return 'Union body';
  return 'no state government named';
}
export function placeText(e: GEdge): string {
  const p = strictPlacement(e);
  if (p) return `${stateName(p.st)} — ${p.rule}`;
  const f = fetcherSt(e);
  if (f) return `${stateName(f)} — ${placementRule(e)}`;
  return `Not placed — ${placementRule(e)}`;
}
/** The API left the borrower blank and the fetcher recorded the Union by default (E9). */
export const borrowerDefaulted = (e: GEdge) => /borrower: not stated in API/i.test(e.d ?? '');

export const projectKey = (e: GEdge): string | null => e.projectId ?? (isCensus(e) || e.pred === 'award' ? pToken(e.lab) : null);

// Projects: census legs grouped by project key; a blend project folds IBRD and IDA legs.
const CENSUS_PROJECT_LEGS = new Map<string, GEdge[]>();
for (const e of CENSUS) {
  const k = pToken(e.lab) ?? e.id ?? '';
  if (!CENSUS_PROJECT_LEGS.has(k)) CENSUS_PROJECT_LEGS.set(k, []);
  CENSUS_PROJECT_LEGS.get(k)!.push(e);
}
export const CENSUS_P_TOKENS = new Set(CENSUS.map((e) => pToken(e.lab)).filter((p): p is string => !!p));
export const censusProjects = CENSUS_P_TOKENS.size;
export const blendProjects = [...CENSUS_PROJECT_LEGS.values()].filter((l) => l.length === 2).length;
/** Researched records whose first project token is also a census project's (E5). */
export const DUP_TOKENS = RESEARCHED.filter((e) => { const p = pToken(e.lab); return !!p && CENSUS_P_TOKENS.has(p); });

/**
 * C2's sensitivity figures, read from the census file's own base-rate rows: the state-
 * attributable US$ is the shared denominator of its per-state rows, the whole is the
 * shared denominator of its IBRD/IDA rows. Null when the file does not carry them.
 */
export const FINANCE_SENSITIVITY: { num: number | null; den: number | null; apiRows: string; incomeSentence: string | null } | null = (() => {
  const rows = FINANCE_BASE_RATES.filter((r) => r.domain === CENSUS_DOMAIN);
  if (!rows.length) return null;
  const state = rows.find((r) => /attributable to any state/i.test(r.label ?? ''));
  const all = rows.find((r) => /IBRD\+IDA/i.test(r.label ?? ''));
  const sym = FINANCE_SYMMETRY.find((s) => s.domain === CENSUS_DOMAIN)?.text ?? '';
  const incomeSentence = sym.split(/(?<=\.)\s+/).find((x) => /income/i.test(x)) ?? null;
  return {
    num: state?.denominator ?? null,
    den: all?.denominator ?? null,
    apiRows: FINANCE_WB_TOTALS ? `${FINANCE_WB_TOTALS.totals.projects} API project rows` : "the API's project rows",
    incomeSentence,
  };
})();

export const LENDERS_CENSUS = [...new Set(CENSUS.map((e) => e.s))].map((id) => ({ id, label: labelOf(id), n: CENSUS.filter((e) => e.s === id).length })).sort(byLabel);
export const LENDERS_RESEARCHED = [...new Set(RESEARCHED.map((e) => e.s))].map((id) => ({ id, label: labelOf(id), n: RESEARCHED.filter((e) => e.s === id).length })).sort(byLabel);
export const LENDER_IDS = new Set([...LENDERS_CENSUS, ...LENDERS_RESEARCHED].map((l) => l.id));
export const isSampleLender = (id: string) => !LENDERS_CENSUS.some((l) => l.id === id);

const LOAN_YEARS = LOANS.map((e) => yearOf(e.from)).filter((y): y is number => y != null);
export const FINANCE_ASOF = FINANCE_META.asOf;
export const ASOF_YEAR_F = yearOf(FINANCE_META.asOf);
export const FIRST_LOAN_YEAR = LOAN_YEARS.length ? Math.min(...LOAN_YEARS) : null;
export const CENSUS_YEARS = CENSUS.map((e) => yearOf(e.from)).filter((y): y is number => y != null);
export const CENSUS_MIN_YEAR = CENSUS_YEARS.length ? Math.min(...CENSUS_YEARS) : null;
export const CENSUS_MAX_YEAR = CENSUS_YEARS.length ? Math.max(...CENSUS_YEARS) : null;

// ---------------------------------------------------------------------------
// Contracts, debarments, rules on external finance
// ---------------------------------------------------------------------------

export const CONTRACTS: GEdge[] = FINANCE_EDGES.filter((e) => e.pred === 'award');
export const DEBARMENTS: GEdge[] = FINANCE_EDGES.filter((e) => e.pred === 'enforce' && e.s === SANCTIONS);
export const RULES_FIN: GEdge[] = FINANCE_EDGES.filter((e) => e.pred === 'law');
export const contractsFor = (loan: GEdge): GEdge[] => {
  const k = projectKey(loan);
  return k ? CONTRACTS.filter((c) => projectKey(c) === k) : [];
};
export const unattachedContracts = CONTRACTS.filter((c) => !projectKey(c));
export const distinctContractors = new Set(CONTRACTS.map((e) => e.t));
export const distinctDebarredFirms = new Set(DEBARMENTS.map((e) => e.t));
export const debarredOverlap = [...distinctDebarredFirms].filter((id) => distinctContractors.has(id));
export const contractProjects = new Set(CONTRACTS.map(projectKey).filter((k): k is string => !!k && CENSUS_P_TOKENS.has(k)));
/** "Award notices publish a bid count for k of n": read from the contracts file's own base-rate row. */
export const BID_COUNT_BASE: { k: number; n: number } | null = (() => {
  const r = FINANCE_BASE_RATES.find((x) => x.domain === 'contracts' && /no observable bid count/i.test(x.property) && x.numerator != null && x.denominator != null);
  return r ? { k: (r.denominator as number) - (r.numerator as number), n: r.denominator as number } : null;
})();
export const loanForProject = (k: string): GEdge | null => CENSUS.find((e) => pToken(e.lab) === k) ?? null;

// ---------------------------------------------------------------------------
// Responses (contra edges answer `claim:{id}`)
// ---------------------------------------------------------------------------

export const NO_RESPONSE = 'No response recorded — asked/not asked unknown';
/**
 * A contra the audit added to record that no response was found is kept and printed,
 * but it is not a response: its words are the no-response sentence, so the timeline
 * draws the open bracket for it, not the rose rule.
 */
export const isPlaceholder = (c: GEdge) => (c.lab ?? '').startsWith(NO_RESPONSE) || (c.d ?? '').startsWith(NO_RESPONSE);

const RESPONSES = new Map<string, GEdge[]>();
for (const l of LENSES) for (const e of MODULES[l].edges) {
  if (e.pred !== 'contra' || !e.t.startsWith('claim:')) continue;
  const k = e.t.slice('claim:'.length);
  if (!RESPONSES.has(k)) RESPONSES.set(k, []);
  RESPONSES.get(k)!.push(e);
}
// A real response leads its claim's list and a placeholder follows it (a stable sort, so
// file order holds within each kind): a claim that was answered never reads, first, as
// unanswered, and a list that opens with the no-response sentence is exactly a claim
// with no real response — the same test the square and the case header use.
for (const list of RESPONSES.values()) list.sort((a, b) => Number(isPlaceholder(a)) - Number(isPlaceholder(b)));
export const responsesTo = (id: string | undefined): GEdge[] => (id ? RESPONSES.get(id) ?? [] : []);
/** A field of a placeholder with the no-response sentence taken off its front ('' when that is all it says). */
const beyondSentence = (x: string | undefined) => {
  const v = x ?? '';
  return v.startsWith(NO_RESPONSE) ? v.slice(NO_RESPONSE.length).replace(/^[\s.;:,—–-]+/, '') : v;
};
/**
 * A response as the list prints it: responder, tier and date first, then its words. A
 * placeholder is not a response, so it prints the exact no-response sentence first and
 * its provenance after it — never "Response from …", which would head an unanswered
 * claim's row with a responder the timeline and the case header do not count. The
 * placeholder's own words (its `lab`, and anything its `d` adds to the sentence) are
 * research text and stay printed after the provenance.
 */
export function responseLine(c: GEdge): string {
  if (isPlaceholder(c)) {
    const lab = beyondSentence(c.lab);
    const rest = beyondSentence(c.d);
    return `${NO_RESPONSE} · recorded in the research file as ${c.id} [${c.tier}]${lab ? `: ${lab}` : ''}${rest && rest !== lab ? ` — ${rest}` : ''}`;
  }
  return `Response from ${labelOf(c.s)} [${c.tier}], ${c.from ?? 'undated response'}: ${c.lab ?? ''}${c.d ? ` ${c.d}` : ''}`;
}
export const responseText = (id: string | undefined) => { const r = responsesTo(id); return r.length ? r.map(responseLine).join(' ‖ ') : NO_RESPONSE; };
export const hasRealResponse = (id: string | undefined) => responsesTo(id).some((c) => !isPlaceholder(c));

// ---------------------------------------------------------------------------
// Office on the date (D17): the date test, never a signature
// ---------------------------------------------------------------------------

const ROLE_EDGES: GEdge[] = [...FINANCE_EDGES, ...NGO_EDGES, ...CAPITAL_EDGES].filter((e) => e.pred === 'role');
const FIN_ROLE_TARGETS = new Set(FINANCE_EDGES.filter((e) => e.pred === 'role' && (e.from || e.to)).map((e) => e.t));
/** Role edges drawn on the clock: every window into the Ministry of Finance, and into any institution the finance file dates a role for. */
export const LANE_ROLES: GEdge[] = ROLE_EDGES
  .filter((e) => (e.t === MOF || FIN_ROLE_TARGETS.has(e.t)) && (e.from || e.to))
  .sort((a, b) => cmp(a.t === MOF ? '0' : a.t, b.t === MOF ? '0' : b.t) || cmp(a.from ?? a.to ?? '', b.from ?? b.to ?? '') || cmp(a.id ?? '', b.id ?? ''));
export const OPEN_WINDOWS = LANE_ROLES.filter((e) => e.from && !e.to);
/** Windows with a recorded end and no recorded start: never drawn as a span, which would invent a start. */
export const NO_START_WINDOWS = LANE_ROLES.filter((e) => !e.from && e.to);
export const datedActs = ROLE_EDGES.filter((e) => e.t === MOF && e.from && e.from === e.to);

/** Compare a record date with a window bound at the coarser of the two precisions. */
const lead = (a: string, b: string) => { const n = Math.min(a.length, b.length); return [a.slice(0, n), b.slice(0, n)]; };
const le = (a: string, b: string) => { const [x, y] = lead(a, b); return x <= y; };
export interface OfficeOnDate { covers: GEdge[]; openEnded: GEdge[]; sameDay: GEdge[] }
export function officeOnDate(date: string | undefined, nodeIds: (string | null | undefined)[]): OfficeOnDate {
  const out: OfficeOnDate = { covers: [], openEnded: [], sameDay: [] };
  if (!date) return out;
  const ids = new Set(nodeIds.filter((x): x is string => !!x));
  for (const e of ROLE_EDGES) {
    if (!ids.has(e.t) || !e.from) continue;
    if (e.to && e.from === e.to) { if (lead(e.from, date).every((v, _i, a) => v === a[0])) out.sameDay.push(e); continue; }
    if (!le(e.from, date)) continue;
    if (!e.to) out.openEnded.push(e);
    else if (le(date, e.to)) out.covers.push(e);
  }
  return out;
}
export const loanOfficeIds = (e: GEdge) => [e.s, e.t, benefitOf(e)?.who, MOF];

// ---------------------------------------------------------------------------
// Elections (text only, never colour)
// ---------------------------------------------------------------------------

export const LOK_SABHA = WELFARE_ELECTIONS.filter((e) => e.election === 'Lok Sabha').sort((a, b) => cmp(a.date, b.date));
export const assemblyFor = (st: string | null) => (st ? WELFARE_ELECTIONS.filter((e) => e.election === 'assembly' && e.st === st).sort((a, b) => cmp(a.date, b.date)) : []);
export const FIRST_LOK_SABHA_YEAR = LOK_SABHA.length ? yearOf(LOK_SABHA[0].date) : null;
export const lokSabhaIn = (y: number) => LOK_SABHA.filter((e) => yearOf(e.date) === y);

// ---------------------------------------------------------------------------
// Associations (FCRA)
// ---------------------------------------------------------------------------

export const NATIONAL: GEdge[] = NGO_EDGES.filter((e) => e.pred === 'grant' && e.s === AGG_SOURCE && e.t === AGG_RECIPIENT);
export const fyStart = (e: GEdge) => yearOf(e.from);
export const isSingleFy = (e: GEdge) => { const a = yearOf(e.from); const b = yearOf(e.to); return a != null && (b == null || b - a <= 1); };
export const fyLabel = (y: number) => `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
const FY_STARTS = NATIONAL.map(fyStart).filter((y): y is number => y != null);
export const FY_AXIS: number[] = FY_STARTS.length ? Array.from({ length: Math.max(...FY_STARTS) - Math.min(...FY_STARTS) + 1 }, (_, i) => Math.min(...FY_STARTS) + i) : [];
export const NATIONAL_CURRENT = NATIONAL.filter((e) => isSingleFy(e) && !e.supersededBy);
export const NATIONAL_SUPERSEDED = NATIONAL.filter((e) => e.supersededBy);
export const NATIONAL_MULTI = NATIONAL.filter((e) => !isSingleFy(e) && !e.supersededBy);
export const FY_WITH = new Set(NATIONAL_CURRENT.map(fyStart).filter((y): y is number => y != null));
export const FY_MISSING = FY_AXIS.filter((y) => !FY_WITH.has(y));
export const SECTOR_DONORS = NGO_EDGES.filter((e) => e.pred === 'grant' && e.t === AGG_RECIPIENT && e.s !== AGG_SOURCE);
export const REGISTRATIONS = NGO_EDGES.filter((e) => e.tier === 'analytic' && e.s === AGG_RECIPIENT && e.t === AGG_RECIPIENT);
export const NAMED_GRANTS = NGO_EDGES.filter((e) => e.pred === 'grant' && e.s !== AGG_SOURCE && e.t !== AGG_RECIPIENT);
export const FC_STATE = NGO_FC_STATE;
export const P5 = FC_STATE.length > 0;
export const FC_STATE_FYS = [...new Set(FC_STATE.map((r) => r.fy))].sort();

export const ACTIONS: GEdge[] = NGO_EDGES.filter((e) => e.pred === 'enforce');
export const isAggregateId = (id: string) => id === AGG_RECIPIENT || id.includes('aggregate');
export const POPULATION_ACTIONS = ACTIONS.filter((e) => isAggregateId(e.t));
export const COURTS_ACTIONS = ACTIONS.filter((e) => !isAggregateId(e.t) && nodeOf(e.t)?.ty === 'ministry');
export interface CaseFile { id: string; label: string; sub: string | null; st: StateCode | null; actions: GEdge[]; first: string | null }
/** One case file per target, ordered by first dated action, then label (D23): a time chart reads in time. */
export const CASE_FILES: CaseFile[] = (() => {
  const by = new Map<string, GEdge[]>();
  for (const e of ACTIONS) {
    if (isAggregateId(e.t) || nodeOf(e.t)?.ty === 'ministry') continue;
    if (!by.has(e.t)) by.set(e.t, []);
    by.get(e.t)!.push(e);
  }
  return [...by.entries()].map(([id, actions]) => {
    const n = nodeOf(id);
    const dated = actions.map((a) => a.from).filter((d): d is string => !!d).sort();
    actions.sort((a, b) => cmp(a.from ?? '9999', b.from ?? '9999') || cmp(a.id ?? '', b.id ?? ''));
    return { id, label: n?.label ?? id, sub: n?.sub ?? null, st: n?.st ?? null, actions, first: dated[0] ?? null };
  }).sort((a, b) => cmp(a.first ?? '9999', b.first ?? '9999') || cmp(a.label, b.label));
})();
export const CASE_TARGETS = new Set(CASE_FILES.map((c) => c.id));
const NO_ACTION_TY = new Set(['trust', 'fund', 'group', 'sangh', 'party']);
const ENFORCE_TARGETS = new Set(ACTIONS.map((e) => e.t));
export const NO_ACTION_TARGETS: GNode[] = NGO_NODES.filter((n) => NO_ACTION_TY.has(n.ty) && !isAggregateId(n.id) && !ENFORCE_TARGETS.has(n.id)).sort(byLabel);
export const NGO_ALLEGED = NGO_EDGES.filter((e) => e.tier === 'alleged' && e.pred !== 'contra');
/** The fcra-actions row that sets the named case files against all cancellations (C9). */
export const FCRA_NAMED_BASE = NGO_BASE_RATES.find((r) => r.domain === 'fcra-actions' && /named/i.test(r.property) && r.numerator != null && r.denominator != null)
  ?? NGO_BASE_RATES.find((r) => r.domain === 'fcra-actions' && r.numerator != null && r.denominator != null) ?? null;

const SCHEME_IDS = new Set(WELFARE_SCHEMES.map((s) => s.id));
export const WELFARE_LINKED = NGO_EDGES.filter((e) => e.s.startsWith('scheme:') || e.t.startsWith('scheme:'));
export const WELFARE_UNLINKED = NGO_EDGES.filter((e) => NGO_EDGE_DOMAIN[e.id ?? ''] === WELFARE_JOIN_DOMAIN && !WELFARE_LINKED.includes(e));
export const schemeOf = (e: GEdge) => { const id = e.s.startsWith('scheme:') ? e.s : e.t; return WELFARE_SCHEMES.find((s) => s.id === id) ?? null; };
export const schemeIdOf = (e: GEdge) => (e.s.startsWith('scheme:') ? e.s : e.t);
export const LINKED_SCHEMES = new Set(WELFARE_LINKED.map(schemeIdOf).filter((id) => SCHEME_IDS.has(id)));
export { WELFARE_SCHEMES };

// ---------------------------------------------------------------------------
// Capital
// ---------------------------------------------------------------------------

export const COLUMNS: Constituent[] = [...NIFTY50].sort((a, b) => cmp(a.name, b.name));
export const COLUMN_IDS = new Set(COLUMNS.map((c) => c.existingId).filter((x): x is string => !!x));
export const OWN: GEdge[] = CAPITAL_EDGES.filter((e) => e.pred === 'own');
export const OWN_IDX = OWN.filter((e) => COLUMN_IDS.has(e.t));
export const OWN_OUTSIDE = OWN.filter((e) => !COLUMN_IDS.has(e.t));
export const lineKind = (e: GEdge): 'filing' | 'aggregate' => (CAPITAL_EDGE_DOMAIN[e.id ?? ''] === AGGREGATES_DOMAIN ? 'aggregate' : 'filing');
export const G3a = Object.keys(CAPITAL_HOLDINGS).length > 0;
export const G3b = CAPITAL_COVERAGE.length > 0;
export const G3c = CAPITAL_CONTROLS.length > 0;
export const pctOf = (e: GEdge): number | null => (e.id ? CAPITAL_HOLDINGS[e.id]?.pct ?? null : null);

export interface BandRow { id: string; label: string; role: string }
/** A Band A role in words: the subject of the narrative is never presented as its own control. */
export const ROLE_WORDS: Record<string, string> = {
  subject: 'subject',
  comparison: 'comparison',
  'domestic-control': 'domestic control',
};
export const roleOf = (id: string): string | null => BAND_A.find((r) => r.id === id)?.role ?? null;
/**
 * Band A: the declared comparison set, always drawn. With G3c the declared subjects,
 * comparisons and domestic control in declared order; before it, the identity roles
 * that begin with the anchored prefix.
 */
export const BAND_A: BandRow[] = G3c
  ? CAPITAL_CONTROLS.filter((r) => (r.role === 'comparison' || r.role === 'subject' || r.role === 'domestic-control') && r.id).map((r) => ({ id: r.id as string, label: r.label, role: r.role }))
  : Object.entries(CAPITAL_IDENTITY).filter(([, v]) => typeof v?.publicRole === 'string' && v.publicRole.startsWith(CONTROL_ROLE_PREFIX))
    .map(([id]) => ({ id, label: labelOf(id), role: 'comparison' })).sort(byLabel);
const BAND_A_IDS = new Set(BAND_A.map((r) => r.id));
export const BAND_B: BandRow[] = [...new Set(OWN_IDX.map((e) => e.s))].filter((id) => !BAND_A_IDS.has(id))
  .map((id) => ({ id, label: labelOf(id), role: 'other holder with a recorded line' })).sort(byLabel);
export const inBandA = (id: string) => BAND_A_IDS.has(id);
export const holderLabel = (id: string) => BAND_A.find((r) => r.id === id)?.label ?? labelOf(id);
export const HOLDER_IDS = new Set([...BAND_A.map((r) => r.id), ...BAND_B.map((r) => r.id), ...CAPITAL_NODES.filter((n) => n.id.startsWith('cap:')).map((n) => n.id)]);

const COVERAGE = new Map(CAPITAL_COVERAGE.map((c) => [c.company, c]));
export type ColumnStatus = 'researched' | 'no-record' | 'not-read';
export function columnStatus(c: Constituent): ColumnStatus {
  if (!c.existingId) return 'no-record';
  if (OWN_IDX.some((e) => e.t === c.existingId)) return 'researched';
  return 'no-record';
}
export const coverageOf = (c: Constituent) => (c.existingId ? COVERAGE.get(c.existingId) ?? null : null);
export const quartersOf = (c: Constituent) => [...new Set(OWN_IDX.filter((e) => e.t === c.existingId).map((e) => e.from).filter((d): d is string => !!d))].sort();
export const RESEARCHED_COLS = COLUMNS.filter((c) => columnStatus(c) === 'researched');
export const NO_RECORD_COLS = COLUMNS.filter((c) => columnStatus(c) !== 'researched');
export const FILING_DATES = [...new Set(OWN_IDX.map((e) => e.from).filter((d): d is string => !!d))].sort();
export type CellState = 'line' | 'aggregate' | 'not-named' | 'filtered' | 'no-record' | 'not-read';
export function cell(holder: string, c: Constituent, tiers: Set<Tier>): { state: CellState; edges: GEdge[]; shown: GEdge[] } {
  const status = columnStatus(c);
  if (status !== 'researched') return { state: status === 'not-read' ? 'not-read' : 'no-record', edges: [], shown: [] };
  const edges = OWN_IDX.filter((e) => e.s === holder && e.t === c.existingId);
  const shown = edges.filter((e) => tiers.has(e.tier));
  // A holding the tier filter hides is not a holder "not named": the filing names it.
  if (edges.length && !shown.length) return { state: 'filtered', edges, shown };
  // A company whose filing was not read cannot say a holder is not named in it (G3b).
  if (!shown.length) return { state: G3b && COVERAGE.get(c.existingId as string)?.read === 'not-read' ? 'not-read' : 'not-named', edges, shown };
  return { state: shown.some((e) => lineKind(e) === 'filing') ? 'line' : 'aggregate', edges, shown };
}
export const holderSummary = (holder: string) => {
  const mine = OWN_IDX.filter((e) => e.s === holder);
  const lines = mine.filter((e) => lineKind(e) === 'filing');
  const aggs = mine.filter((e) => lineKind(e) === 'aggregate');
  return { lines: lines.length, aggs: aggs.length, cols: new Set(lines.map((e) => e.t)).size };
};
export const AGG_OWN = OWN.filter((e) => lineKind(e) === 'aggregate');
export { INDEX_CHANGES };

export const AWARDS_CAP = CAPITAL_EDGES.filter((e) => e.pred === 'award');
export const LICENCES = AWARDS_CAP.filter((e) => e.s === 'sebi');
export const MANDATES = AWARDS_CAP.filter((e) => e.s !== 'sebi');
export const RULES_CAP = CAPITAL_EDGES.filter((e) => e.pred === 'law').sort((a, b) => cmp(a.from ?? '9999', b.from ?? '9999') || cmp(a.id ?? '', b.id ?? ''));
export const ADVISERS: BandRow[] = (() => {
  const ids = G3c
    ? CAPITAL_CONTROLS.filter((r) => (r.role === 'adviser-subject' || r.role === 'adviser-comparison') && r.id).map((r) => r.id as string)
    : Object.entries(CAPITAL_IDENTITY).filter(([, v]) => /adviser/i.test(v?.publicRole ?? '')).map(([id]) => id);
  return [...new Set(ids)].map((id) => ({ id, label: labelOf(id), role: 'adviser' })).sort(byLabel);
})();
/** Narratives about a node, joined by the node id appearing in a narrative's sources — never by a name in its text. */
export const CAPITAL_NARRATIVE_IDS: Map<string, number> = (() => {
  const m = new Map<string, number>();
  for (const n of [...FINANCE_NARRATIVES, ...NGO_NARRATIVES, ...CAPITAL_NARRATIVES]) {
    for (const [label, url] of n.srcs) for (const id of HOLDER_IDS) if (label.includes(id) || url.includes(id)) m.set(id, (m.get(id) ?? 0) + 1);
  }
  return m;
})();
export const UNRESOLVED_ADVISERS = CAPITAL_CONTROLS.filter((r) => (r.role === 'adviser-comparison' || r.role === 'adviser-subject') && !r.id);
/** Months between two ISO dates, only when both exist. */
export function monthsBetween(a: string | undefined, b: string | undefined): number | null {
  if (!a || !b || a.length < 7 || b.length < 7) return null;
  return (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + (Number(b.slice(5, 7)) - Number(a.slice(5, 7)));
}
/**
 * A licence's application: the `law` record in the licence's own supersession chain
 * (application → in-principle approval → final registration). Only a `law` edge is an
 * application; an earlier approval in the chain is a licence row of its own, never the
 * "Applied" date. Nothing is read from the record's prose.
 */
export function licenceApplied(l: GEdge): GEdge | null {
  const seen = new Set<string>();
  let cur: GEdge | undefined = l;
  while (cur?.id && !seen.has(cur.id)) {
    seen.add(cur.id);
    const id: string = cur.id;
    const prev: GEdge | undefined = CAPITAL_EDGES.find((e) => e.supersededBy === id);
    if (!prev) return null;
    if (prev.pred === 'law') return prev.from && l.from && prev.from <= l.from ? prev : null;
    cur = prev;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Graph (D36): the three registers minus the census
// ---------------------------------------------------------------------------

export const GRAPH_EDGES_ALL: GEdge[] = [...FINANCE_EDGES.filter((e) => !isCensus(e) || e.pred !== 'loan'), ...NGO_EDGES, ...CAPITAL_EDGES];
/** Only census-leg ids reach these nodes: the graph cannot show them (E55). */
export const CENSUS_ONLY_IDS = (() => {
  const inGraph = new Set<string>();
  for (const e of GRAPH_EDGES_ALL) { inGraph.add(e.s); inGraph.add(e.t); }
  const out = new Set<string>();
  for (const e of CENSUS) for (const id of [e.s, e.t]) if (!inGraph.has(id)) out.add(id);
  return out;
})();
/** The graph set, resolved against the three registers and any further node list (the merged platform graph). */
export function graphParts(extra: GNode[]): { nodes: GNode[]; edges: GEdge[]; dropped: number } {
  const byId = new Map<string, GNode>();
  for (const n of [...FINANCE_NODES, ...NGO_NODES, ...CAPITAL_NODES]) byId.set(n.id, n);
  const extraById = new Map(extra.map((n) => [n.id, n]));
  const edges: GEdge[] = [];
  let dropped = 0;
  for (const e of GRAPH_EDGES_ALL) {
    const s = byId.get(e.s) ?? extraById.get(e.s) ?? PLATFORM_NODE.get(e.s);
    const t = byId.get(e.t) ?? extraById.get(e.t) ?? PLATFORM_NODE.get(e.t);
    if (!s || !t) { dropped++; continue; }
    byId.set(s.id, s); byId.set(t.id, t);
    edges.push(e);
  }
  const used = new Set<string>();
  for (const e of edges) { used.add(e.s); used.add(e.t); }
  const nodes = [...byId.values()].filter((n) => used.has(n.id) && n.resolved !== false);
  return { nodes, edges: edges.filter((e) => nodes.some((n) => n.id === e.s) && nodes.some((n) => n.id === e.t)), dropped };
}
/** Types whose nodes carry more than one actor family across the research files (U24). */
export const FAM_SPLITS: { ty: string; pairs: string[] }[] = (() => {
  const by = new Map<string, Map<string, string>>();
  for (const n of [...FINANCE_NODES, ...NGO_NODES, ...CAPITAL_NODES]) {
    if (!by.has(n.ty)) by.set(n.ty, new Map());
    const m = by.get(n.ty)!;
    if (!m.has(n.fam)) m.set(n.fam, n.label);
  }
  // Only a party is one kind of actor wherever it is recorded; a person or a company can
  // legitimately be public power in one record and private capital in another (X18).
  return [...by.entries()].filter(([ty, m]) => ty === 'party' && m.size > 1).sort((a, b) => cmp(a[0], b[0]))
    .map(([ty, m]) => ({ ty, pairs: [...m.entries()].map(([fam, label]) => `${label}: ${fam}`) }));
})();

// ---------------------------------------------------------------------------
// Filters (spec §3.4): parsed once from the URL; unknown values fall back, named
// ---------------------------------------------------------------------------

export type Metric = 'cr' | 'n' | 'usd';
export interface Filters {
  lens: Lens;
  yFrom: number | null;
  yTo: number | null;
  st: StateCode | null;
  lender: string | null;
  holder: string | null;
  tiers: Set<Tier>;
  tierSet: boolean;
  rec: string | null;
  sel: string | null;
  find: string;
  m: Metric;
  scale: 'quantile' | 'log';
  mid: 'instrument' | 'sector';
  view: 'stage' | 'table';
  inc: Inclusion | null;
  tp: number;
  /** Params whose value was not recognised: the page says so and uses the default. */
  bad: string[];
}

const ALL_DATED_YEARS = [
  ...LOANS.map((e) => yearOf(e.from)),
  ...NGO_EDGES.map((e) => yearOf(e.from)),
  ...CAPITAL_EDGES.map((e) => yearOf(e.from)),
].filter((y): y is number => y != null);
const ASOF_YEARS = LENSES.map((l) => yearOf(ASOF[l])).filter((y): y is number => y != null);
const LS_YEARS = LOK_SABHA.map((e) => yearOf(e.date)).filter((y): y is number => y != null);
/** The year control's range: the first dated record in any register to the latest register date. */
export const YEAR_MIN = ALL_DATED_YEARS.length ? Math.min(...ALL_DATED_YEARS) : LS_YEARS.length ? Math.min(...LS_YEARS) : null;
export const YEAR_MAX = ASOF_YEARS.length ? Math.max(...ASOF_YEARS) : ALL_DATED_YEARS.length ? Math.max(...ALL_DATED_YEARS) : LS_YEARS.length ? Math.max(...LS_YEARS) : null;
export const YEARS: number[] = YEAR_MIN != null && YEAR_MAX != null ? Array.from({ length: YEAR_MAX - YEAR_MIN + 1 }, (_, i) => YEAR_MIN + i) : [];

export const PAGE_PARAMS = ['lens', 'y', 'st', 'lender', 'holder', 'tier', 'inc', 'find', 'rec', 'm', 'scale', 'mid', 'view', 'tp'] as const;

export function parseFilters(p: URLSearchParams): Filters {
  const bad: string[] = [];
  const lensRaw = p.get('lens');
  let lens: Lens = 'loans';
  if (lensRaw != null) { if ((LENSES as string[]).includes(lensRaw)) lens = lensRaw as Lens; else bad.push('lens'); }

  let yFrom: number | null = null;
  let yTo: number | null = null;
  const yRaw = p.get('y');
  if (yRaw != null) {
    const m = /^(\d{4})(?:-(\d{4}))?$/.exec(yRaw);
    const a = m ? Number(m[1]) : NaN;
    const b = m ? Number(m[2] ?? m[1]) : NaN;
    if (m && YEAR_MIN != null && YEAR_MAX != null && a <= b && a >= YEAR_MIN && b <= YEAR_MAX) { yFrom = a; yTo = b; } else bad.push('y');
  }
  const stRaw = p.get('st');
  let st: StateCode | null = null;
  if (stRaw != null) { if ((STATE_CODES as string[]).includes(stRaw)) st = stRaw as StateCode; else bad.push('st'); }
  const lenderRaw = p.get('lender');
  let lender: string | null = null;
  if (lenderRaw != null) { if (LENDER_IDS.has(lenderRaw)) lender = lenderRaw; else bad.push('lender'); }
  const holderRaw = p.get('holder');
  let holder: string | null = null;
  if (holderRaw != null) { if (HOLDER_IDS.has(holderRaw)) holder = holderRaw; else bad.push('holder'); }

  let tiers = new Set<Tier>(TIER_ORDER);
  let tierSet = false;
  const tierRaw = p.get('tier');
  if (tierRaw != null) {
    if (tierRaw === 'none') { tiers = new Set(); tierSet = true; }
    else {
      const parts = tierRaw.split(',').filter(Boolean);
      if (parts.length && parts.every((t) => (TIER_ORDER as string[]).includes(t))) { tiers = new Set(parts as Tier[]); tierSet = true; } else bad.push('tier');
    }
  }
  const rec = p.get('rec');
  const sel = p.get('sel');
  const find = p.get('find') ?? '';
  const mRaw = p.get('m');
  let m: Metric = 'cr';
  if (mRaw != null) { if (mRaw === 'cr' || mRaw === 'n' || (mRaw === 'usd' && G1)) m = mRaw; else bad.push('m'); }
  const scaleRaw = p.get('scale');
  let scale: 'quantile' | 'log' = 'quantile';
  if (scaleRaw != null) { if (scaleRaw === 'quantile' || scaleRaw === 'log') scale = scaleRaw; else bad.push('scale'); }
  const midRaw = p.get('mid');
  let mid: 'instrument' | 'sector' = G1 ? 'sector' : 'instrument';
  if (midRaw != null) { if (midRaw === 'instrument' || (midRaw === 'sector' && G1)) mid = midRaw; else bad.push('mid'); }
  const viewRaw = p.get('view');
  let view: 'stage' | 'table' = 'stage';
  if (viewRaw != null) { if (viewRaw === 'stage' || viewRaw === 'table') view = viewRaw; else bad.push('view'); }
  const incRaw = p.get('inc');
  let inc: Inclusion | null = null;
  if (incRaw != null) { if ((INCLUSIONS as string[]).includes(incRaw)) inc = incRaw as Inclusion; else bad.push('inc'); }
  const tpRaw = p.get('tp');
  let tp = 1;
  if (tpRaw != null) { if (/^\d+$/.test(tpRaw) && Number(tpRaw) >= 1) tp = Number(tpRaw); else bad.push('tp'); }
  if (rec != null && !EDGE_BY_ID.has(rec)) bad.push('rec');
  return { lens, yFrom, yTo, st, lender, holder, tiers, tierSet, rec, sel, find, m, scale, mid, view, inc, tp, bad };
}

/** The y value as written: one year, or a from–to span. */
export const yText = (f: Filters, dash = '–') => (f.yFrom == null ? null : f.yFrom === f.yTo ? String(f.yFrom) : `${f.yFrom}${dash}${f.yTo}`);
export const inYear = (f: Filters, d: string | undefined) => {
  if (f.yFrom == null) return true;
  const y = yearOf(d);
  return y != null && y >= f.yFrom && y <= (f.yTo ?? f.yFrom);
};

/** The active-filter line's terms, in a fixed order, with the display form of each value. */
export function activeTerms(p: URLSearchParams, f: Filters): string[] {
  const out: string[] = [];
  for (const k of PAGE_PARAMS) {
    const v = p.get(k);
    if (v == null || f.bad.includes(k)) continue;
    if (k === 'y') { out.push(`y=${yText(f)}`); continue; }
    if (k === 'lender' && f.lender) { out.push(`lender=${labelOf(f.lender)}`); continue; }
    if (k === 'holder' && f.holder) { out.push(`holder=${holderLabel(f.holder)}`); continue; }
    out.push(`${k}=${v}`);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Loans under filters
// ---------------------------------------------------------------------------

export function loanPass(f: Filters, e: GEdge, skip: Partial<Record<'y' | 'st' | 'lender' | 'tier' | 'inc', boolean>> = {}): boolean {
  if (!skip.y && !inYear(f, e.from)) return false;
  if (!skip.st && f.st && strictSt(e) !== f.st) return false;
  if (!skip.lender && f.lender && e.s !== f.lender) return false;
  if (!skip.tier && !f.tiers.has(e.tier)) return false;
  if (!skip.inc && f.inc && inclusion(e) !== f.inc) return false;
  return true;
}
export const loansInView = (f: Filters) => LOANS.filter((e) => loanPass(f, e));
/** Census rows the map, bar and flow read: every filter but the list-only `inc`. */
export const censusInView = (f: Filters) => CENSUS.filter((e) => loanPass(f, e, { inc: true }));

export interface StateLoanRow {
  st: StateCode;
  name: string;
  cls: 'value' | 'fetcher' | 'stipple' | 'hatch';
  strict: GEdge[];
  strictCr: number;
  fetcher: GEdge[];
  fetcherCr: number;
  body: GEdge[];
  researched: GEdge[];
  value: number | null;
}
export function loanStateRows(f: Filters): Map<StateCode, StateLoanRow> {
  const census = censusInView(f);
  const researched = RESEARCHED.filter((e) => loanPass(f, e, { inc: true }));
  const out = new Map<StateCode, StateLoanRow>();
  for (const s of STATES) {
    const strict = census.filter((e) => strictSt(e) === s.id);
    const fetcher = census.filter((e) => fetcherSt(e) === s.id);
    const body = census.filter((e) => bodySt(e) === s.id);
    const res = researched.filter((e) => strictSt(e) === s.id);
    const strictCr = rupeeTotal(strict);
    const fetcherCr = rupeeTotal(fetcher);
    const cls = strict.length ? 'value' : fetcher.length ? 'fetcher' : body.length ? 'stipple' : 'hatch';
    // A placed state whose records carry no amount in the metric has no value, never 0:
    // it is drawn outside the ramp and its readout says the amount is not stated (§8.2-5).
    const recs = cls === 'value' ? strict : cls === 'fetcher' ? fetcher : [];
    let value: number | null = null;
    if (recs.length) {
      if (f.m === 'n') value = recs.length;
      else if (f.m === 'usd') value = recs.some((e) => finite(LOAN_FACT(e)?.usdM) && !isPipeline(e)) ? usdOf(recs) : null;
      else value = recs.some(hasRupee) ? rupeeTotal(recs) : null;
    }
    out.set(s.id, { st: s.id, name: s.name, cls, strict, strictCr, fetcher, fetcherCr, body, researched: res, value });
  }
  return out;
}
export function usdOf(rows: GEdge[]): number {
  let s = 0;
  for (const e of rows) { const u = LOAN_FACT(e)?.usdM; if (finite(u) && !isPipeline(e)) s += u; }
  return Math.round(s * 100) / 100;
}

/**
 * Map bins, pooled over every placed census record with no filters (D10), so a shade
 * means the same amount in every view and does not move when the reader filters.
 */
export function pooledBins(m: Metric, scale: 'quantile' | 'log'): number[] {
  const f = parseFilters(new URLSearchParams(m === 'cr' ? '' : `m=${m}`));
  const vals = [...loanStateRows(f).values()].map((r) => r.value).filter((v): v is number => finite(v) && v > 0).sort((a, b) => a - b);
  if (!vals.length) return [];
  const k = 5;
  if (scale === 'log') {
    const lo = Math.log10(vals[0]);
    const hi = Math.log10(vals[vals.length - 1]);
    return Array.from({ length: k + 1 }, (_, i) => 10 ** (lo + ((hi - lo) * i) / k));
  }
  const q = (p: number) => vals[Math.min(vals.length - 1, Math.floor(p * (vals.length - 1)))];
  const edges = Array.from({ length: k + 1 }, (_, i) => q(i / k));
  return [...new Set(edges)];
}
export const binOf = (v: number, edges: number[]) => {
  if (edges.length < 2) return 0;
  for (let i = 1; i < edges.length; i++) if (v <= edges[i]) return i - 1;
  return edges.length - 2;
};

export function approvalsByYear(rows: GEdge[]): Map<number, number> {
  const seen = new Map<number, Set<string>>();
  for (const e of rows) {
    const y = yearOf(e.from);
    if (y == null) continue;
    if (!seen.has(y)) seen.set(y, new Set());
    seen.get(y)!.add(pToken(e.lab) ?? e.id ?? '');
  }
  return new Map([...seen].map(([y, s]) => [y, s.size]));
}
export function approvalsByMonth(rows: GEdge[]): { counts: number[]; projects: number; undated: number } {
  const counts = Array.from({ length: 12 }, () => new Set<string>());
  const all = new Set<string>();
  const undated = new Set<string>();
  for (const e of rows) {
    const k = pToken(e.lab) ?? e.id ?? '';
    all.add(k);
    const m = /^\d{4}-(\d{2})/.exec(e.from ?? '');
    if (!m) { undated.add(k); continue; }
    counts[Number(m[1]) - 1].add(k);
  }
  const monthly = new Set<string>();
  for (const c of counts) for (const k of c) monthly.add(k);
  return { counts: counts.map((c) => c.size), projects: monthly.size, undated: [...all].filter((k) => !monthly.has(k)).length };
}

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

const PARLIAMENT = /sansad|rajya sabha|lok sabha|\bRS\b|\bLS\b|rsdebate|\/Par20\d\d\//i;
const PRIMARY = /\.gov\.in|\.nic\.in|gazette|worldbank\.org|adb\.org|aiib\.org|sebi\.gov|rbi\.org|imf\.org|mha\.gov|court|cag\.gov|\.pdf\b/i;
export function sourceClass(src: Source): 'parliament' | 'primary' | 'secondary' {
  const [label, url] = src;
  if (PARLIAMENT.test(label) || PARLIAMENT.test(url)) return 'parliament';
  if (PRIMARY.test(url) || PRIMARY.test(label)) return 'primary';
  return 'secondary';
}
export const hostOf = (url: string) => { try { return new URL(url).host.replace(/^www\./, ''); } catch { return ''; } };

// ---------------------------------------------------------------------------
// Derived gaps (spec §5.5.3) — page-wide, each shown only when its condition holds
// ---------------------------------------------------------------------------

/** A derived gap belongs to the lens whose records it counts; `all` spans the three registers. */
export interface DerivedGap { lens: Lens | 'all'; text: string }
export function derivedGaps(): DerivedGap[] {
  const out: DerivedGap[] = [];
  const loans = (text: string) => out.push({ lens: 'loans', text });
  const assoc = (text: string) => out.push({ lens: 'associations', text });
  const capital = (text: string) => out.push({ lens: 'capital', text });
  const all = (text: string) => out.push({ lens: 'all', text });
  const unplacedCounted = CENSUS.filter((e) => hasRupee(e) && !strictSt(e) && !fetcherSt(e)).length;
  const cc = CENSUS.filter(hasRupee).length;
  if (!G1) loans(`Loan state is not a field: ${countOf(unplacedCounted, 'of')} ${cc} counted census records cannot be placed in a state government from the register`);
  else if (CENSUS.length) loans(`${countOf(CENSUS.filter((e) => fetcherSt(e)).length, 'census records')} are placed only by the fetcher's rule (state agency or title); ${countOf(unplacedCounted, 'of')} ${cc} counted census records are placed by neither rule`);
  if (!G1) loans('Loan sector is not exported');
  const noRupee = LOANS.filter((e) => !hasRupee(e)).length;
  if (noRupee) loans(`${countOf(noRupee, 'loan records')} have no ₹ amount: ${NO_AMOUNT}`);
  if (DUP_TOKENS.length) loans(`${countOf(DUP_TOKENS.length, 'researched records')} share a World Bank project id with a census record and are not marked superseded`);
  if (!G1) loans('Whether researched loan records duplicate each other is not recorded');
  if (!G2) loans('API population totals not exported');
  const withCond = LOANS.filter((e) => conditionsOf(e).length > 0).length;
  if (LOANS.length) loans(`Conditions recorded for ${fmtInt(withCond)} of ${fmtInt(LOANS.length)} loan records`);
  const mofOpen = LANE_ROLES.filter((e) => e.t === MOF && e.from && !e.to).length;
  if (mofOpen) loans(`${countOf(mofOpen, 'office windows')} at the Ministry of Finance have no recorded end; the register does not distinguish a holder still in office from an end not researched, so every current office-holder is among them`);
  if (NO_START_WINDOWS.length) loans(`${countOf(NO_START_WINDOWS.length, 'office windows')} on the clock have a recorded end and no recorded start; each is drawn as a mark at its end, and covers no earlier approval`);
  const uncovered = CENSUS.filter((e) => e.from && (() => { const o = officeOnDate(e.from, loanOfficeIds(e)); return !o.covers.length && !o.openEnded.length && !o.sameDay.length; })()).length;
  if (uncovered) loans(`${countOf(uncovered, 'census approvals')} fall where no recorded office window exists`);
  loans('Union budget dates are not a dataset in this build');
  if (FY_MISSING.length) assoc(`${countOf(FY_MISSING.length, 'financial years')} in ${fyLabel(FY_AXIS[0])} to ${fyLabel(FY_AXIS[FY_AXIS.length - 1])} have no national FCRA total`);
  if (!P5) assoc('FCRA state-wise receipts are not in the register as records');
  if (WELFARE_UNLINKED.length) assoc(`${countOf(WELFARE_UNLINKED.length, 'welfare-join rows')} are not linked to a scheme`);
  // A contra that only records "no response found" is printed, but it is not a response.
  const silentCases = CASE_FILES.filter((c) => c.actions.every((a) => !hasRealResponse(a.id))).length;
  if (silentCases) assoc(`${countOf(silentCases, 'case files')} carry no recorded response to any claim`);
  if (!G3a) capital('Holder percentages are not a field');
  if (!G3b) capital('Which filings were read is not declared');
  if (!G3c) capital('The comparison set is read from identity prose; a structured declaration is not exported');
  if (AGG_OWN.length) capital(`${countOf(AGG_OWN.length, 'holder records')} are research aggregates of fund holdings files, not filing lines`);
  if (COLUMNS.length && !CAPITAL_META.empty) capital(`${fmtInt(NO_RECORD_COLS.length)} of ${fmtInt(COLUMNS.length)} NIFTY 50 companies have no named holder recorded`);
  const rulesNoRow = RULES_CAP.filter((e) => !benefitOf(e)).length;
  if (RULES_CAP.length) capital(`${fmtInt(rulesNoRow)} of ${fmtInt(RULES_CAP.length)} rules carry no cui-bono row`);
  const alleged = LENSES.flatMap((l) => MODULES[l].edges.filter((e) => e.tier === 'alleged' && e.pred !== 'contra'));
  const unanswered = alleged.filter((e) => !hasRealResponse(e.id)).length;
  if (unanswered) all(`${countOf(unanswered, 'of')} ${fmtInt(alleged.length)} alleged claims carry no recorded response (a contra that records only that none was found is printed beside its claim and not counted as one)`);
  // No structured list of split ids reaches the page: the reconciliation's refused merges
  // live in the research files, and a hand-written pair here would be a figure, not a query.
  if (!ALL_EMPTY) all('Institutions recorded under two ids across the three registers are not detected here: no structured export of refused merges or cross-register aliases reaches this page, so a split id is not flagged');
  for (const f of FAM_SPLITS) all(`${countOf(f.pairs.length, `${f.ty} nodes`)} carry different actor families across research files (${f.pairs.join('; ')}); their hue is inconsistent and means nothing`);
  return out;
}
export const DERIVED_GAPS = derivedGaps();
export const derivedFor = (lens: Lens) => DERIVED_GAPS.filter((g) => g.lens === lens);

// ---------------------------------------------------------------------------
// TSV (D39): a `#` header first, then the rows exactly as drawn
// ---------------------------------------------------------------------------

export interface TsvMeta { table: string; population: string; lens: Lens; filters: string; rows: number; paged?: string; amounts?: boolean }
const cleanCell = (v: unknown) => (v == null ? '' : String(v).replace(/[\t\r\n]+/g, ' ').trim());
export function tsv(meta: TsvMeta, header: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [
    `# table: ${meta.table} — ${meta.population}`,
    `# rows: ${meta.rows}${meta.paged ? ` (all pages; screen shows ${meta.paged})` : ''}`,
    `# url: ${typeof location !== 'undefined' ? location.href : ''}`,
    `# lens: ${meta.lens} · filters: ${meta.filters || 'none'}`,
    ...LENSES.map((l) => `# ${FLEET_NAME[l]} ${RUN[l]} asOf ${ASOF[l] ?? 'not promoted'}`),
  ];
  if (meta.amounts || rows.some((r) => r.some((c) => String(c ?? '').includes('₹')))) lines.push("# amounts: ₹ crore, nominal, at each record's approval-year rate as recorded; not deflated");
  lines.push(header.map(cleanCell).join('\t'));
  for (const r of rows) lines.push(r.map(cleanCell).join('\t'));
  return lines.join('\n') + '\n';
}
