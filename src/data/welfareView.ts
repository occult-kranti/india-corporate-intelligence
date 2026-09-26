/**
 * /welfare derivations — every figure, row and denominator the page shows.
 *
 * The page and its components import from here and from ./welfare only, and never
 * restate a number: a count on screen is the `.length` of an array built below, and
 * the table twin of a graphic is the same array the graphic was drawn from, so a twin
 * cannot disagree with its picture by a row. Spec: docs/design/WELFARE_PAGE.md §6.6.
 *
 * Nothing here reads a clock, calls Math.random or uses localeCompare: sorts are
 * code-unit comparisons with an explicit id tiebreak, so a diff of the page between
 * two commits is a diff of the data, never of the machine that rendered it.
 */

import type { Source, StateCode, Tier, GEdge, GNode } from '../graph/schema';
import { TIER_ORDER } from '../graph/schema';
import type { Gap } from '../components/Domain';
import { STATES, STATE_NAMES } from './geo';
import {
  WELFARE_SCHEMES,
  WELFARE_ELECTIONS,
  WELFARE_COVERAGE,
  WELFARE_CLAIMS,
  WELFARE_ENTITIES,
  WELFARE_BENEFITS,
  WELFARE_BASE_RATES,
  WELFARE_NARRATIVES,
  WELFARE_VOIDS,
  WELFARE_GAPS,
  WELFARE_SYMMETRY,
  WELFARE_SCHEME_NODES,
  WELFARE_IDENTITY,
  WELFARE_META,
  monthsBetween,
  outlayForFy,
  coverageYears,
  latestStatus,
  type Scheme,
  type SchemeCategory,
  type SchemeStatusKind,
  type Election,
  type OutlayRow,
} from './welfare';

// ---------------------------------------------------------------------------
// Scope — the page's declared frame, not data
// ---------------------------------------------------------------------------

/** The brief's frame: 2000 to 2026. A scope, not a figure the register holds. */
export const FIRST_YEAR = 2000;
export const LAST_YEAR = 2026;
export const YEARS: number[] = Array.from({ length: LAST_YEAR - FIRST_YEAR + 1 }, (_, i) => FIRST_YEAR + i);
export const YEAR_COUNT = YEARS.length;
export const STATE_COUNT = STATES.length;

export const EMPTY = WELFARE_META.empty;
export const RUN_ID = WELFARE_META.runId;
export const AS_OF: string | null = WELFARE_META.asOf;
/** The last year the clock draws: the file's as-of year, else the scope's end. */
export const AS_OF_YEAR: number = AS_OF ? Number(AS_OF.slice(0, 4)) : LAST_YEAR;

/** `{min}–{max}` when the research files disagree on their date; never one date picked. */
export const AS_OF_LABEL: string = (() => {
  const dates = WELFARE_META.files.map((f) => f.asOf).filter((d): d is string => !!d).sort(byText);
  if (!AS_OF && !dates.length) return 'not yet promoted';
  if (dates.length && dates[0] !== dates[dates.length - 1]) return `${dates[0]}–${dates[dates.length - 1]}`;
  return AS_OF ?? dates[0];
})();

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/** Code-unit order: ISO dates sort correctly as strings, and the reader's locale never enters. */
export function byText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

const FULL_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A date only month arithmetic may use: a full ISO day. A year or a month is a place in time, not a day. */
export function fullDate(d: string | null | undefined): string | null {
  return d && FULL_DATE.test(d) ? d : null;
}

/** The calendar year of a full or partial ISO date ("2024", "2024-06", "2024-06-11"). */
export function yearOf(d: string | null | undefined): number | null {
  const m = d ? /^(\d{4})(?:-|$)/.exec(d) : null;
  return m ? Number(m[1]) : null;
}

/** Date order with undated last; the id breaks ties so the order never depends on input order. */
const dateThenId = (da: string | null, db: string | null, ia: string, ib: string) =>
  byText(da ?? '9999', db ?? '9999') || byText(ia, ib);

/** monthsBetween fed only full ISO days; a year or a month never enters month arithmetic. */
export const monthsBetweenSafe = (a: string | null | undefined, b: string | null | undefined): number | null =>
  monthsBetween(fullDate(a), fullDate(b));

export function fyOf(y: number): string {
  return `${y}-${String(y + 1).slice(2)}`;
}

export function fmtNum(v: number): string {
  if (!Number.isFinite(v)) return 'not computed';
  const r = Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 100) / 100;
  return r.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

/** `a of b`, with a percentage only when b ≥ 10 (spec K6): a rate from a tiny base is volatility, not information. */
export function aOfB(a: number, b: number): string {
  if (b >= 10) return `${a} of ${b} (${Math.round((a / b) * 100)}%)`;
  return `${a} of ${b}`;
}

const collapse = (s: string) => s.replace(/\s+/g, ' ').trim();

export const stateName = (st: string | null | undefined): string =>
  st ? (STATE_NAMES[st] ?? st.toUpperCase()) : 'Union';

// ---------------------------------------------------------------------------
// Parties — a resolution table, never a fuzzy match
// ---------------------------------------------------------------------------

/**
 * Every party string today's register records, mapped to a canonical label, or to
 * null where the string names an alliance, a coalition, a hung house, President's
 * rule or more than one party (those outcomes are never forced into kept or lost).
 * Source for each mapping: the recorded string itself — the canonical label is the
 * single party it names; nothing is inferred from outside the record. A string not
 * in this table passes through trimmed and is listed as a derived gap, so a new
 * spelling surfaces instead of silently becoming a party.
 */
const CANON: Record<string, string | null> = {
  AAP: 'AAP',
  "AAP (minority govt collapsed, President's rule)": null,
  AGP: 'AGP',
  AIADMK: 'AIADMK',
  'AIADMK (2011-21) / DMK (2025→)': null,
  AITC: 'AITC',
  TMC: 'AITC',
  'TMC 215, BJP 77 (+74)': 'AITC',
  'TMC-INC alliance': null,
  BJD: 'BJD',
  'BJD (contesting alone after split from BJP)': 'BJD',
  'BJD-BJP alliance': null,
  BJP: 'BJP',
  'BJP (Centre)': 'BJP',
  'BJP (Centre); MP BJP, CT/RJ INC, TG BRS': null,
  'BJP (NDA)': 'BJP',
  'BJP (NDA) — BJP 240 (−63), INC 99': 'BJP',
  'BJP (NDA) — BJP 282, INC 44': 'BJP',
  'BJP (NDA) — BJP 303 (+21), INC 52': 'BJP',
  'BJP (Suvendu Adhikari CM by Jun 2026); seat tally not captured in the page opened': 'BJP',
  'BJP (largest party)': 'BJP',
  'BJP 115 (+42), INC 70': 'BJP',
  'BJP 163 (+54), INC 66': 'BJP',
  'BJP 54 (+39), INC 35': 'BJP',
  'BJP 82 of 126; INC 19': 'BJP',
  'BJP-Shiv Sena': null,
  'BJP-Shiv Sena alliance (largest pre-poll bloc); post-poll government formed by Shiv Sena-NCP-INC (MVA) after the pre-poll alliance broke apart': null,
  'BJP-Shiv Sena pre-poll alliance': null,
  BRS: 'BRS',
  'BRS (TRS)': 'BRS',
  'BRS (then TRS)': 'BRS',
  'TRS (BRS)': 'BRS',
  'CPI(M)': 'CPI(M)',
  'CPI(M)-Left Front': null,
  DMK: 'DMK',
  'DMK (2006) / AIADMK (2011)': null,
  INC: 'INC',
  'INC (2013 launch) → BJP (scaled 2014→)': null,
  'INC (AP government 2004–14)': 'INC',
  'INC (Chhattisgarh); BJP (Centre)': null,
  'INC (Dec 2018); BJP (Feb 2018 precursor)': null,
  'INC (UPA)': 'INC',
  'INC (UPA) — INC 145, BJP 138': 'INC',
  'INC (UPA) — INC 206 (+61), BJP 116': 'INC',
  'INC (introduced 1995); administered by all governments since': 'INC',
  'INC 64 (+45), BRS 39': 'INC',
  'INC-NCP alliance': null,
  'JD(S)': 'JD(S)',
  'JD(S)-BJP coalition (collapsed)': null,
  'JD(S)-INC coalition': null,
  'JD(U)': 'JD(U)',
  'JD(U) (having split from BJP in 2013)': 'JD(U)',
  'JD(U)-BJP': null,
  'JD(U)-BJP (NDA)': null,
  'JD(U)-BJP (NDA, Nitish having rejoined NDA in 2017)': null,
  'JD(U)-BJP (NDA, landslide)': null,
  'JD(U)-BJP (NDA, narrowly)': null,
  "JD(U)-RJD-INC 'Mahagathbandhan'": null,
  'JD(U)–BJP (Nitish Kumar government)': null,
  JMM: 'JMM',
  'JMM-INC-RJD alliance': null,
  'JMM-led (JMM-INC-RJD)': null,
  'JMM-led alliance': null,
  LDF: 'LDF',
  'LDF (CPI(M)-led)': 'LDF',
  'LDF (state)': 'LDF',
  'MVA (Shiv Sena-NCP-INC)': null,
  Mahayuti: null,
  'Mahayuti (BJP-Shiv Sena(Shinde)-NCP(Ajit Pawar))': null,
  'N/A (new state formed June 2014)': null,
  'N/A (new state formed Nov 2000; first full-term election)': null,
  NCP: 'NCP',
  'NCP(SP)': 'NCP(SP)',
  NDA: null,
  'NDA (JD(U)-BJP)': null,
  RJD: 'RJD',
  "RJD (President's rule preceding)": null,
  'RJD-led (narrowly retained)': null,
  'SAD-BJP': null,
  SP: 'SP',
  'SP (2017)': 'SP',
  'Shiv Sena': 'Shiv Sena',
  'Shiv Sena (UBT)': 'Shiv Sena (UBT)',
  'Shiv Sena (undivided)': 'Shiv Sena',
  TDP: 'TDP',
  'TDP-led alliance (TDP-BJP-Janasena)': null,
  TVK: 'TVK',
  UDF: 'UDF',
  'UDF (INC-led)': 'UDF',
  'UDF (INC-led); V. D. Satheesan CM': 'UDF',
  YSRCP: 'YSRCP',
  'coalition (multiple short-tenure govts 2005-09)': null,
  'coalition govts': null,
  'hung; AAP minority govt': null,
  'hung; BJP-led coalition eventually formed': null,
  'hung; INC-JD(S) coalition': null,
  'hung; JMM-BJP coalition': null,
  "hung; no government formed, President's rule": null,
};

/**
 * Strings in the table above that resolve to one label for a scheme's party — the label a
 * reader filters by — but whose recorded words name an alliance or a front, so an election
 * won or lost under them is never forced into kept or lost (caption C5). The table is the
 * one place this is decided; the regex below only ever reads strings the table does not hold.
 *
 * - NDA- and UPA-tagged strings: the Union government was the alliance, though the scheme
 *   is filed under its leading party. All five Lok Sabha results in the file are of this kind.
 * - LDF and UDF, in every spelling: Kerala's governments are fronts of several parties,
 *   exactly as "CPI(M)-Left Front" in West Bengal is, which the table already maps to null.
 *   The front stays a filter label, because Kerala's schemes are filed under it.
 */
const NAMES_ALLIANCE = new Set<string>([
  'BJP (NDA)',
  'BJP (NDA) — BJP 240 (−63), INC 99',
  'BJP (NDA) — BJP 282, INC 44',
  'BJP (NDA) — BJP 303 (+21), INC 52',
  'INC (UPA)',
  'INC (UPA) — INC 145, BJP 138',
  'INC (UPA) — INC 206 (+61), BJP 116',
  'LDF',
  'LDF (CPI(M)-led)',
  'LDF (state)',
  'UDF',
  'UDF (INC-led)',
  'UDF (INC-led); V. D. Satheesan CM',
]);

const UNMAPPED = new Set<string>();

export function canon(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const k = collapse(raw);
  if (!k) return null;
  if (k in CANON) return CANON[k];
  UNMAPPED.add(k);
  return k;
}

/** The spec's coalition test (§5.4), for strings the table does not hold, read after seat-change notes like "(+54)" are removed — a seat swing is not an alliance. */
const COALITION = /\+|\/|alliance|front|\bNDA\b|\bUPA\b|\bINDIA\b|mahayuti|\bMVA\b|mahagathbandhan/i;
const SEAT_SWING = /\(\s*[+−-]\s*\d+\s*\)/g;

/** Does a recorded party string name an alliance, a front, a coalition, or no single party? The table decides for every string it holds. */
export function namesAlliance(raw: string | null | undefined): boolean {
  if (raw == null) return false;
  const k = collapse(raw);
  if (!k) return false;
  if (k in CANON) return CANON[k] == null || NAMES_ALLIANCE.has(k);
  return COALITION.test(k.replace(SEAT_SWING, ''));
}

export type Outcome = 'retained' | 'lost' | 'unclassified';

export function outcomeOf(incumbent: string | null, winner: string | null): Outcome {
  const a = canon(incumbent);
  const b = canon(winner);
  if (a == null || b == null) return 'unclassified';
  if (namesAlliance(incumbent) || namesAlliance(winner)) return 'unclassified';
  return a === b ? 'retained' : 'lost';
}


export const partyText = (s: Scheme): string => (s.party ? collapse(s.party) : 'party not recorded');

// ---------------------------------------------------------------------------
// Categories, metrics, tiers
// ---------------------------------------------------------------------------

export const CATEGORIES: SchemeCategory[] = [
  'women-cash', 'farmer-cash', 'pension', 'grain', 'unemployment', 'student',
  'housing', 'energy-subsidy', 'loan-waiver', 'consumer-goods', 'transport', 'other',
];

export type Metric = 'live' | 'share' | 'perhead' | 'budgeted' | 'actual';
export const METRICS: Metric[] = ['live', 'share', 'perhead', 'budgeted', 'actual'];
export const MONEY: Metric[] = ['share', 'budgeted', 'actual'];

export const METRIC_SHORT: Record<Metric, string> = {
  live: 'Schemes live',
  share: 'Share of state budget',
  perhead: 'Entitlement per beneficiary, per year',
  budgeted: 'Budgeted ₹ cr',
  actual: 'Actual ₹ cr',
};

export function metricLabel(m: Metric, y: number | null): string {
  if (m === 'live') {
    return y != null ? `State schemes live in ${y}` : `State schemes launched ${FIRST_YEAR}–${AS_OF_YEAR} (cumulative, incl. discontinued)`;
  }
  if (m === 'share') return 'Share of state budget';
  if (m === 'perhead') return 'Entitlement per beneficiary, per year (as recorded)';
  if (m === 'budgeted') return 'Budgeted';
  return 'Actual';
}

export const METRIC_UNIT: Record<Metric, string> = {
  live: '',
  share: 'per cent',
  perhead: '₹ per beneficiary-year, entitlement',
  budgeted: '₹ cr',
  actual: '₹ cr',
};

const OUTLAY_KEY: Record<'share' | 'budgeted' | 'actual', keyof OutlayRow> = {
  share: 'pctOfStateBudget',
  budgeted: 'budgetedCr',
  actual: 'actualCr',
};

export const TIER_LIST: Tier[] = TIER_ORDER;

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

const ENTITY = new Map<string, GNode>(WELFARE_ENTITIES.map((n) => [n.id, n]));

export interface Person {
  id: string;
  label: string;
  resolved: boolean;
  office: string | null;
  /** Union ministers already in the graph open on /cabinet. */
  href: string | null;
}

export function personOf(id: string): Person {
  const n = ENTITY.get(id);
  const ident = WELFARE_IDENTITY[id];
  const office = (ident?.identity?.office as string | null | undefined) ?? ident?.publicRole ?? null;
  return {
    id,
    label: n?.label ?? id,
    resolved: n ? n.resolved !== false : false,
    office: office ?? null,
    href: id.startsWith('pol:') ? '/cabinet' : null,
  };
}

/**
 * Every id a claim can name, resolved to words: entities, and the scheme nodes and
 * schemes themselves. A scheme id is a legitimate claim endpoint (and the source of the
 * audit's markers), so a label that fell back to the raw id would print
 * "scheme:mh-ladki-bahin" where a reader expects a name.
 */
const LABEL = new Map<string, string>([
  ...WELFARE_SCHEMES.map((s) => [s.id, s.name] as [string, string]),
  ...WELFARE_SCHEME_NODES.map((n) => [n.id, n.label] as [string, string]),
  ...WELFARE_ENTITIES.map((n) => [n.id, n.label] as [string, string]),
]);

export const entityLabel = (id: string): string => LABEL.get(id) ?? id;

// ---------------------------------------------------------------------------
// Filters (URL state)
// ---------------------------------------------------------------------------

export type Level = 'all' | 'state' | 'central';

export interface WelfareFilters {
  y: number | null;
  /** The metric painted: the requested one when it can be honoured, else live. */
  m: Metric;
  mRequested: Metric;
  /** Why the requested metric is not painted, when it is not. */
  unavailable: string | null;
  cat: Set<SchemeCategory> | null;
  party: Set<string> | null;
  lvl: Level;
  st: StateCode | null;
  s: string | null;
  tier: Set<Tier>;
  view: 'map' | 'table';
  q: string;
  /** Params present with a value the page does not recognise; each gets a notice. */
  ignored: string[];
}

/** Canonical labels of the parties that recorded schemes, alphabetical. */
export const PARTY_LABELS: string[] = [...new Set(WELFARE_SCHEMES.map((s) => canon(s.party)).filter((p): p is string => !!p))].sort(byText);
/** Schemes whose recorded party is an alliance or several parties; no single-party filter can reach them. */
export const SCHEMES_WITHOUT_SINGLE_PARTY: Scheme[] = WELFARE_SCHEMES.filter((s) => !canon(s.party));

const STATE_CODES = new Set(STATES.map((s) => s.id));

export const PARAM_ORDER = ['y', 'm', 'cat', 'party', 'lvl', 'st', 's', 'tier', 'view', 'q'] as const;
/**
 * The params that change the population (spec §5.2). A selected state or scheme opens a
 * panel and filters no table, and view only changes how the stage is shown, so neither
 * may be printed as a filter: "filters: st=mp" over a twin that still holds 36 states
 * would be a false statement about the twin.
 */
export const FILTER_KEYS = ['y', 'm', 'cat', 'party', 'lvl', 'tier', 'q'] as const;
export const SELECTION_KEYS = ['st', 's'] as const;

export function parseFilters(p: URLSearchParams): WelfareFilters {
  const ignored: string[] = [];
  const yRaw = p.get('y');
  let y: number | null = null;
  if (yRaw != null) {
    const n = /^\d{4}$/.test(yRaw) ? Number(yRaw) : NaN;
    if (n >= FIRST_YEAR && n <= LAST_YEAR) y = n;
    else ignored.push('y');
  }
  const mRaw = p.get('m');
  let mRequested: Metric = 'live';
  if (mRaw != null) {
    if ((METRICS as string[]).includes(mRaw)) mRequested = mRaw as Metric;
    else ignored.push('m');
  }
  const list = (raw: string | null) => (raw == null ? null : raw.split(',').map((x) => x.trim()).filter(Boolean));
  let cat: Set<SchemeCategory> | null = null;
  const catList = list(p.get('cat'));
  if (catList) {
    if (catList.length && catList.every((c) => (CATEGORIES as string[]).includes(c))) cat = new Set(catList as SchemeCategory[]);
    else ignored.push('cat');
  }
  let party: Set<string> | null = null;
  const partyList = list(p.get('party'));
  if (partyList) {
    if (partyList.length && partyList.every((x) => PARTY_LABELS.includes(x))) party = new Set(partyList);
    else ignored.push('party');
  }
  let lvl: Level = 'all';
  const lvlRaw = p.get('lvl');
  if (lvlRaw != null) {
    if (lvlRaw === 'all' || lvlRaw === 'state' || lvlRaw === 'central') lvl = lvlRaw;
    else ignored.push('lvl');
  }
  let st: StateCode | null = null;
  const stRaw = p.get('st');
  if (stRaw != null) {
    if (STATE_CODES.has(stRaw as StateCode)) st = stRaw as StateCode;
    else ignored.push('st');
  }
  const s = p.get('s') || null;
  let tier = new Set<Tier>(TIER_LIST);
  const tierList = list(p.get('tier'));
  if (tierList) {
    // `none` is an explicit empty choice: an absent key means all four, so unticking the last tier must say so.
    if (tierList.length === 1 && tierList[0] === 'none') tier = new Set<Tier>();
    else if (tierList.length && tierList.every((t) => (TIER_LIST as string[]).includes(t))) tier = new Set(tierList as Tier[]);
    else ignored.push('tier');
  }
  let view: 'map' | 'table' = 'map';
  const viewRaw = p.get('view');
  if (viewRaw != null) {
    if (viewRaw === 'map' || viewRaw === 'table') view = viewRaw;
    else ignored.push('view');
  }
  const q = p.get('q') ?? '';
  const base = { y, mRequested, cat, party, lvl, st, s, tier, view, q, ignored };
  const unavailable = metricBlocker(mRequested, y, cat);
  return { ...base, m: unavailable ? 'live' : mRequested, unavailable };
}

/** Why a metric cannot be painted under these filters, or null when it can. */
export function metricBlocker(m: Metric, y: number | null, cat: Set<SchemeCategory> | null): string | null {
  if (m === 'live') return null;
  if (y == null) return 'choose a year';
  if (m === 'perhead' && (!cat || cat.size !== 1)) return 'choose exactly one category';
  const b = BINS[m];
  if ('disabled' in b) return b.disabled;
  return null;
}

/** The filters the reader set, in one fixed order: the same string under the strip, in the status line and in every export. */
export function activeFilterString(p: URLSearchParams, drop: string[] = []): string {
  return paramString(p, FILTER_KEYS, drop);
}

/** What is selected (st, s), printed as its own clause so a screenshot carries it without calling it a filter. */
export function selectionString(p: URLSearchParams): string {
  return paramString(p, SELECTION_KEYS, []);
}

function paramString(p: URLSearchParams, keys: readonly string[], drop: string[]): string {
  const f = parseFilters(p);
  const out: string[] = [];
  for (const k of keys) {

    if (drop.includes(k) || f.ignored.includes(k)) continue;
    const v = p.get(k);
    if (v == null || v === '') continue;
    out.push(`${k}=${v}`);
  }
  return out.join(' · ');
}

// ---------------------------------------------------------------------------
// Schemes in view
// ---------------------------------------------------------------------------

export interface ViewOpts {
  ignoreParty?: boolean;
  ignoreLvl?: boolean;
  ignoreQ?: boolean;
  ignoreCat?: boolean;
}

const personLabels = (s: Scheme): string[] => {
  const ids = [s.announced?.byPersonId, ...s.ministers.map((m) => m.personId)].filter((x): x is string => !!x);
  return ids.map((id) => entityLabel(id));
};

export function matchesQ(s: Scheme, q: string): boolean {
  const n = q.trim().toLowerCase();
  if (!n) return true;
  return [s.name, ...s.al, ...personLabels(s)].some((t) => t.toLowerCase().includes(n));
}

/** Launch date (nulls last), then id: the order of every scheme list on the page. */
export const bySchemeLaunch = (a: Scheme, b: Scheme) => dateThenId(a.launched?.date ?? null, b.launched?.date ?? null, a.id, b.id);

const SORTED_SCHEMES = [...WELFARE_SCHEMES].sort(bySchemeLaunch);

export function inView(f: WelfareFilters, o: ViewOpts = {}): Scheme[] {
  return SORTED_SCHEMES.filter((s) => {
    if (!o.ignoreCat && f.cat && !(s.category && f.cat.has(s.category))) return false;
    if (!o.ignoreParty && f.party) {
      const p = canon(s.party);
      if (!p || !f.party.has(p)) return false;
    }
    if (!o.ignoreLvl && f.lvl !== 'all' && s.level !== f.lvl) return false;
    if (!o.ignoreQ && !matchesQ(s, f.q)) return false;
    return true;
  });
}

/** The control's population (§5.8): category and level apply; party and search do not, because narrowing a comparison deletes it. */
export const controlPool = (f: WelfareFilters) => inView(f, { ignoreParty: true, ignoreQ: true });

export const schemeById = new Map<string, Scheme>(WELFARE_SCHEMES.map((s) => [s.id, s]));

// ---------------------------------------------------------------------------
// Liveness and amounts
// ---------------------------------------------------------------------------

/**
 * Live in a calendar year: launched in or before it, and no dated discontinuation in
 * or before it. The rule is welfare.ts's schemesLiveInYear, read at year precision:
 * "2024-06" places a launch in 2024 as surely as "2024-06-11" does, and discarding it
 * would hatch a state the file does record. Month arithmetic never sees such a date.
 */
export function liveInYear(s: Scheme, y: number): boolean {
  const l = yearOf(s.launched?.date);
  if (l == null || l > y) return false;
  return !s.status.some((t) => t.status === 'discontinued' && (yearOf(t.date) ?? Infinity) <= y);
}

export const everLaunched = (s: Scheme) => {
  const l = yearOf(s.launched?.date);
  return l != null && l <= AS_OF_YEAR;
};

/** The per-head amount in force at the end of year y: the base amount, then the latest dated change at or before it. */
export function amountInForce(s: Scheme, y: number): { amount: number | null; undatedChanges: number } {
  if (!s.benefit) return { amount: null, undatedChanges: 0 };
  const endYear = Math.min(y, ...s.status.filter((t) => t.status === 'discontinued').map((t) => yearOf(t.date) ?? Infinity));
  let amount = s.benefit.amount;
  let best = '';
  let undated = 0;
  for (const c of s.benefit.changes) {
    const cy = yearOf(c.date);
    if (cy == null) { undated++; continue; }
    if (c.amount == null || cy > endYear) continue;
    if (byText(c.date!, best) >= 0) { best = c.date!; amount = c.amount; }
  }
  return { amount, undatedChanges: undated };
}

/**
 * Annualise a recorded per-head amount. A whitelist, and a design decision rather
 * than a parser: only rupee amounts stated per month (×12) or per year (×1) convert.
 * Per acre, per season, one-time, maximum, in-kind and goods never do — they are
 * stippled with the unit shown, because a converted figure would compare unlike things.
 */
export function annualPerHead(amount: number | null, unit: string | null): { value: number | null; reason?: string; factor?: 1 | 12 } {
  if (amount == null) return { value: null, reason: 'amount not located' };
  const u = unit ?? '';
  const fail = { value: null, reason: `unit not comparable: ${u || 'unit not recorded'}` };
  if (!/^₹/.test(u.trim())) return fail;
  if (/per\s*acre|one-time|maximum|per\s*instalment|per\s*season|total|over\s+\w+\s+years|staged|crore/i.test(u)) return fail;
  if (/per\s*month|\/\s*month|monthly/i.test(u)) return { value: amount * 12, factor: 12 };
  if (/per\s*(year|annum)|\/\s*year|annual|yearly/i.test(u)) return { value: amount, factor: 1 };
  return fail;
}

// ---------------------------------------------------------------------------
// Coverage (§3.4)
// ---------------------------------------------------------------------------

const STATE_COVERAGE = WELFARE_COVERAGE.filter((c) => c.st !== 'central');

/** A state-year is declared searched only when a file says so for every category in view (with no category chosen: for all). */
export function isDeclared(st: StateCode, y: number | null, cat: Set<SchemeCategory> | null): boolean {
  if (y == null) return false;
  return STATE_COVERAGE.some((c) => {
    if (c.st !== st) return false;
    const ys = coverageYears(c);
    if (!ys || !ys.includes(y)) return false;
    const cats = c.categories as string[];
    if (cats.includes('all')) return true;
    if (!cat) return false;
    return [...cat].every((k) => cats.includes(k));
  });
}

/** Does any declaration reach the current view at all? When none does, the zero class is printed empty, with the reason. */
export function coverageReachesView(cat: Set<SchemeCategory> | null): boolean {
  return STATE_COVERAGE.some((c) => {
    const cats = c.categories as string[];
    return cats.includes('all') || (!!cat && [...cat].every((k) => cats.includes(k)));
  });
}

export function declaredYearsFor(st: StateCode): string | null {
  const spans = STATE_COVERAGE.filter((c) => c.st === st).map((c) => {
    const ys = coverageYears(c);
    const cats = (c.categories as string[]).join(', ');
    return ys ? `${ys[0]}–${ys[ys.length - 1]} (${cats})` : null;
  }).filter((x): x is string => !!x);
  return spans.length ? spans.join('; ') : null;
}

// ---------------------------------------------------------------------------
// Elections — merged records, then exposure
// ---------------------------------------------------------------------------

/**
 * One poll, one election. The register records some polls more than once — a phase
 * date, a counting day, the same election written by two research files — and
 * counting each record would weigh that election two or three times in the control.
 * Records of the same kind in the same state dated within 90 days are one election
 * here: the earliest full date is the poll date, every source is kept, and each
 * merge is listed in the gaps so the reader can undo it.
 */
export interface MergedElection {
  key: string;
  st: StateCode | null;
  election: string;
  date: string;
  incumbentRaw: string | null;
  winnerRaw: string | null;
  outcome: Outcome;
  records: Election[];
  srcs: Source[];
  /** Set when the merged records classify differently. */
  disagreement: string | null;
  kind: 'assembly' | 'lok sabha' | 'other';
}

const dayNumber = (d: string): number | null => {
  const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(d);
  if (!m) return null;
  return Date.UTC(Number(m[1]), Number(m[2] ?? '1') - 1, Number(m[3] ?? '1')) / 86400000;
};

const kindOf = (e: Election): MergedElection['kind'] =>
  /lok sabha/i.test(e.election) ? 'lok sabha' : /assembly/i.test(e.election) ? 'assembly' : 'other';

const dedupeSrcs = (list: Source[][]): Source[] => {
  const seen = new Set<string>();
  const out: Source[] = [];
  for (const srcs of list) for (const s of srcs) if (!seen.has(s[1])) { seen.add(s[1]); out.push(s); }
  return out;
};

export const ELECTIONS: MergedElection[] = (() => {
  const sorted = [...WELFARE_ELECTIONS].sort((a, b) => byText(a.st ?? '', b.st ?? '') || byText(kindOf(a), kindOf(b)) || byText(a.date, b.date) || byText(a.domain, b.domain));
  const groups: Election[][] = [];
  for (const e of sorted) {
    const last = groups[groups.length - 1];
    const head = last?.[0];
    const prev = last?.[last.length - 1];
    const dPrev = prev ? dayNumber(prev.date) : null;
    const dNow = dayNumber(e.date);
    if (head && head.st === e.st && kindOf(head) === kindOf(e) && dPrev != null && dNow != null && dNow - dPrev <= 90) last.push(e);
    else groups.push([e]);
  }
  return groups.map((g) => {
    const withFull = g.filter((e) => fullDate(e.date));
    const lead = withFull[0] ?? g[0];
    const outcomes = g.map((e) => outcomeOf(e.incumbentParty, e.winner));
    const agree = outcomes.every((o) => o === outcomes[0]);
    return {
      key: `${lead.st ?? 'union'}:${lead.date}:${kindOf(lead)}`,
      st: lead.st,
      election: kindOf(lead) === 'lok sabha' ? 'Lok Sabha' : kindOf(lead) === 'assembly' ? 'assembly' : collapse(lead.election),
      date: lead.date,
      incumbentRaw: lead.incumbentParty ? collapse(lead.incumbentParty) : null,
      winnerRaw: lead.winner ? collapse(lead.winner) : null,
      outcome: agree ? outcomes[0] : 'unclassified',
      records: g,
      srcs: dedupeSrcs(g.map((e) => e.srcs)),
      disagreement: agree ? null : `the ${g.length} records of this poll classify differently (${outcomes.join(', ')})`,
      kind: kindOf(lead),
    } satisfies MergedElection;
  }).sort((a, b) => byText(a.date, b.date) || byText(a.st ?? '', b.st ?? ''));
})();

export const ASSEMBLY: MergedElection[] = ELECTIONS.filter((e) => e.kind === 'assembly' && e.st != null);
export const LOK_SABHA: MergedElection[] = ELECTIONS.filter((e) => e.kind === 'lok sabha');
export const MERGED_ELECTIONS = ELECTIONS.filter((e) => e.records.length > 1);

export type Window = 6 | 12 | 24;
export const WINDOWS: Window[] = [12, 6, 24];

/** Event dates that make a scheme "fresh" (§5.4): launch, a dated raise in amount, a dated `raised` status. Full dates only. */
export function freshDates(s: Scheme): string[] {
  const out: string[] = [];
  const l = fullDate(s.launched?.date);
  if (l) out.push(l);
  if (s.benefit) {
    const ordered = s.benefit.changes
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => c.date)
      .sort((a, b) => byText(a.c.date!, b.c.date!) || a.i - b.i);
    let prev = s.benefit.amount;
    for (const { c } of ordered) {
      if (c.amount != null && prev != null && c.amount > prev && fullDate(c.date)) out.push(c.date!);
      if (c.amount != null) prev = c.amount;
    }
  }
  for (const t of s.status) if (t.status === 'raised' && fullDate(t.date)) out.push(t.date!);
  return out;
}

export interface ElectionRow {
  e: MergedElection;
  key: string;
  outcome: Outcome;
  exposedBy: Record<Window, Scheme[]>;
  muted: boolean;
  incumbent: string | null;
}

const exposedWithin = (e: MergedElection, pool: Scheme[], w: Window): Scheme[] => {
  const inc = canon(e.incumbentRaw);
  const d = fullDate(e.date);
  if (!inc || !d) return [];
  return pool.filter((s) => {
    if (e.kind === 'assembly' ? s.level !== 'state' || s.st !== e.st : s.level !== 'central') return false;
    if (canon(s.party) !== inc) return false;
    return freshDates(s).some((x) => {
      const m = monthsBetween(x, d);
      return m != null && m >= 0 && m < w;
    });
  });
};

/** Every election in the file with its exposure under the control's pool; party only mutes, never removes. */
export function electionRows(f: WelfareFilters, kind: 'assembly' | 'lok sabha' = 'assembly'): ElectionRow[] {
  const pool = controlPool(f);
  const list = kind === 'assembly' ? ASSEMBLY : LOK_SABHA;
  return list.map((e) => ({
    e,
    key: e.key,
    outcome: e.outcome,
    exposedBy: { 6: exposedWithin(e, pool, 6), 12: exposedWithin(e, pool, 12), 24: exposedWithin(e, pool, 24) },
    muted: !!f.party && !(canon(e.incumbentRaw) && f.party.has(canon(e.incumbentRaw)!)),
    incumbent: canon(e.incumbentRaw),
  }));
}

export const electionTitle = (r: ElectionRow, w: Window = 12): string =>
  `${stateName(r.e.st)} ${r.e.election} · ${r.e.date} · ${r.e.incumbentRaw ?? 'incumbent not recorded'} → ${r.e.winnerRaw ?? 'winner not recorded'} · fresh scheme within ${w} m: ${r.exposedBy[w].length ? 'yes' : 'no'}`;

export interface ControlWindow {
  months: Window;
  exposed: { retained: ElectionRow[]; lost: ElectionRow[]; unclassified: ElectionRow[] };
  notExposed: { retained: ElectionRow[]; lost: ElectionRow[]; unclassified: ElectionRow[] };
}

const split = (rows: ElectionRow[]) => ({
  retained: rows.filter((r) => r.outcome === 'retained'),
  lost: rows.filter((r) => r.outcome === 'lost'),
  unclassified: rows.filter((r) => r.outcome === 'unclassified'),
});

export function controlWindow(rows: ElectionRow[], w: Window): ControlWindow {
  return {
    months: w,
    exposed: split(rows.filter((r) => r.exposedBy[w].length > 0)),
    notExposed: split(rows.filter((r) => r.exposedBy[w].length === 0)),
  };
}

export function yearElections(rows: ElectionRow[], y: number): ElectionRow[] {
  return rows.filter((r) => yearOf(r.e.date) === y);
}

// ---------------------------------------------------------------------------
// Bins (§6.6) — pooled unfiltered, fixed across years and filters
// ---------------------------------------------------------------------------

export const RAMP = ['#2e373f', '#354e55', '#3d6668', '#487f7c', '#61988e', '#89b19f', '#b7cbb0'];
/**
 * Which RAMP steps a map with k classes paints. Every painted class starts at RAMP[2]
 * (3.1:1 against --color-bg): RAMP[0] and RAMP[1] sit at 1.6:1 and 2.2:1, so a state in
 * the lowest class disappeared into the page and read as no-data (A11Y-002 M1). The
 * order of classes, and so what each shade means, is unchanged. RAMP[0] stays in the
 * array for the clock's coverage ribbon, which is not a map class.
 */
const RAMP_STEPS: Record<number, number[]> = { 1: [3], 2: [2, 6], 3: [2, 4, 6], 4: [2, 3, 5, 6], 5: [2, 3, 4, 5, 6] };

export type Bins = { cuts: number[]; ramp: string[]; labels: string[]; pooled: number } | { disabled: string; pooled: number };

const sig2 = (v: number) => {
  if (v === 0) return 0;
  const p = Math.pow(10, Math.floor(Math.log10(Math.abs(v))) - 1);
  return Math.round(v / p) * p;
};

function quantileBins(values: number[]): Bins {
  const n = values.length;
  if (n < 6) return { disabled: `too few figures to bin (n = ${n})`, pooled: n };
  const k = n >= 20 ? 5 : 3;
  const sorted = [...values].sort((a, b) => a - b);
  const cuts = [...new Set(Array.from({ length: k - 1 }, (_, i) => sig2(sorted[Math.floor(((i + 1) / k) * (n - 1))])))].sort((a, b) => a - b);
  const classes = cuts.length + 1;
  const ramp = RAMP_STEPS[classes].map((i) => RAMP[i]);
  const labels = Array.from({ length: classes }, (_, i) =>
    i === 0 ? `under ${fmtNum(cuts[0])}` : i === classes - 1 ? `${fmtNum(cuts[i - 1])}+` : `${fmtNum(cuts[i - 1])}–${fmtNum(cuts[i])}`);
  return { cuts, ramp, labels, pooled: n };
}

const byStateCode = (() => {
  const m = new Map<string, Scheme[]>();
  for (const s of WELFARE_SCHEMES) if (s.level === 'state' && s.st) {
    if (!m.has(s.st)) m.set(s.st, []);
    m.get(s.st)!.push(s);
  }
  return m;
})();

function pooledValues(m: Metric): number[] {
  const out: number[] = [];
  for (const [, list] of byStateCode) {
    for (const y of YEARS) {
      const live = list.filter((s) => liveInYear(s, y));
      if (!live.length) continue;
      if (m === 'perhead') {
        for (const c of CATEGORIES) {
          const vals = live.filter((s) => s.category === c).map((s) => annualPerHead(amountInForce(s, y).amount, s.benefit?.unit ?? null).value).filter((v): v is number => v != null);
          if (vals.length) out.push(Math.max(...vals));
        }
      } else if (m !== 'live') {
        const key = OUTLAY_KEY[m];
        const vals = live.map((s) => outlayForFy(s, fyOf(y))?.[key]);
        if (vals.every((v) => typeof v === 'number')) out.push((vals as number[]).reduce((a, b) => a + b, 0));
      }
    }
  }
  return out;
}

export const BINS: Record<Metric, Bins> = {
  live: { cuts: [2, 3, 4], ramp: RAMP_STEPS[4].map((i) => RAMP[i]), labels: ['1', '2', '3', '4+'], pooled: 0 },
  share: quantileBins(pooledValues('share')),
  perhead: quantileBins(pooledValues('perhead')),
  budgeted: quantileBins(pooledValues('budgeted')),
  actual: quantileBins(pooledValues('actual')),
};

export function binOf(m: Metric, v: number): number {
  const b = BINS[m];
  if ('disabled' in b) return -1;
  return b.cuts.filter((c) => c <= v).length;
}

// ---------------------------------------------------------------------------
// The map matrix (§5.4)
// ---------------------------------------------------------------------------

export type FillClass = 'value' | 'hatch' | 'stipple' | 'zero';

export interface StateYearRow {
  st: StateCode;
  name: string;
  value: number | null;
  cls: FillClass;
  /** The words the Class column and the legend use. */
  classLabel: string;
  reason: string;
  /** Short matrix cell text. */
  cell: string;
  /** The export enum of §11 item 1. */
  status: 'value' | 'none-recorded' | 'declared-zero' | 'partial' | 'not-located' | 'unit-not-comparable' | 'max-of-n';
  valueText: string;
  detail: string;
  contributing: Scheme[];
  srcs: Source[];
  fill: string | null;
  /**
   * Money metrics only: one entry per live scheme, in `contributing` order, with the
   * figure the sum was built from (null when the FY row or its field is missing). The
   * state panel prints these addends and the readout prints their sum, from this one
   * array, so the two cannot disagree. Empty for the live and per-head metrics.
   */
  addends: MoneyAddend[];
}

export interface MoneyAddend { scheme: Scheme; row: OutlayRow | null; v: number | null }

/** A money figure with its unit, as the panel and readout print it. */
export function fmtMoney(m: Metric, v: number): string {
  return m === 'share' ? `${fmtNum(v)} per cent` : `₹${fmtNum(v)} cr`;
}

const MIRROR_NOTE = (code: StateCode, y: number | null): string[] => {
  const out: string[] = [];
  if (y != null && y <= 2013 && code === 'tg') out.push("undivided Andhra Pradesh until 2 June 2014; value is AP's");
  if (y != null && y >= 2020 && (code === 'dn' || code === 'dd')) out.push('merged UT since 26 Jan 2020');
  if (y != null && y >= 2019 && code === 'jk') out.push('drawn including Ladakh, a separate UT since 31 Oct 2019');
  if (y === 2000 && (code === 'ct' || code === 'jh' || code === 'ut')) out.push('formed Nov 2000');
  return out;
};

/** Display-only boundary mirroring (current geometry, historical data). The control never mirrors. */
function mapSchemesFor(code: StateCode, y: number | null, pool: Scheme[]): Scheme[] {
  let codes: StateCode[] = [code];
  if (y != null && y <= 2013 && code === 'tg') codes = ['ap'];
  if (y != null && y >= 2020 && (code === 'dn' || code === 'dd')) codes = ['dn', 'dd'];
  return pool.filter((s) => s.level === 'state' && s.st != null && codes.includes(s.st));
}

const partiesLine = (list: Scheme[]): string => {
  if (!list.length) return '';
  const counts = new Map<string, number>();
  for (const s of list) {
    const p = canon(s.party) ?? partyText(s);
    counts.set(p, (counts.get(p) ?? 0) + 1);
  }
  return ` · schemes by: ${[...counts.entries()].sort((a, b) => byText(a[0], b[0])).map(([p, n]) => `${p} (${n})`).join(', ')}`;
};

export function stateYearRow(code: StateCode, f: WelfareFilters, y: number | null, pool: Scheme[]): StateYearRow {
  const name = stateName(code);
  const here = mapSchemesFor(code, y, pool);
  const live = y == null ? here.filter(everLaunched) : here.filter((s) => liveInYear(s, y));
  const notes = MIRROR_NOTE(code, y);
  const paused = y != null ? live.filter((s) => s.status.some((t) => t.status === 'paused' && yearOf(t.date) === y)) : [];
  const m = f.m;
  const base = { st: code, name, contributing: live, srcs: dedupeSrcs(live.map((s) => s.srcs)), addends: [] as MoneyAddend[] };
  const tail = (d: string) => [d, ...notes, ...paused.map((s) => `${s.name} paused in ${y}`)].filter(Boolean).join(' · ') + partiesLine(live);
  const bins = BINS[m];
  const fillFor = (v: number) => ('disabled' in bins ? null : bins.ramp[binOf(m, v)]);

  if (!live.length) {
    if (isDeclared(code, y, f.cat)) {
      return { ...base, value: 0, cls: 'zero', classLabel: 'searched, none live', reason: 'declared searched', cell: '0 (declared)', status: 'declared-zero', valueText: `searched, none live in ${y}`, detail: tail(`declared searched for ${y}`), fill: null };
    }
    return { ...base, value: null, cls: 'hatch', classLabel: 'none recorded', reason: 'none recorded in this file', cell: 'none recorded', status: 'none-recorded', valueText: 'none recorded in this file', detail: tail('hatched means unknown, not none'), fill: null };
  }

  if (m === 'live') {
    const n = live.length;
    return { ...base, value: n, cls: 'value', classLabel: fmtNum(n), reason: '', cell: fmtNum(n), status: 'value', valueText: `${n} scheme${n === 1 ? '' : 's'}`, detail: tail(live.map((s) => s.name).join('; ')), fill: fillFor(n) };
  }

  if (m === 'perhead') {
    const items = live.map((s) => {
      const amt = amountInForce(s, y!);
      const a = annualPerHead(amt.amount, s.benefit?.unit ?? null);
      return { s, amt, a };
    });
    const ok = items.filter((i) => i.a.value != null);
    const listText = items.map((i) => {
      const per = i.a.factor === 12 ? ' / month' : i.a.factor === 1 ? ' / year' : ', unit as recorded in the scheme card';
      const rec = i.amt.amount != null ? `₹${fmtNum(i.amt.amount)}${per} as recorded` : 'amount not located';
      const comp = i.a.value != null ? ` · ₹${fmtNum(i.a.value)} / yr ×${i.a.factor}, computed here` : ` · ${i.a.reason?.startsWith('unit not comparable') ? 'unit not comparable' : i.a.reason}`;
      return `${i.s.name}: ${rec}${comp}`;
    }).join('; ');
    if (!ok.length) {
      const reason = items[0].a.reason ?? 'amount not located';
      const unitReason = reason.startsWith('unit not comparable') ? reason : 'amount not located';
      return { ...base, value: null, cls: 'stipple', classLabel: 'live, no comparable figure', reason: unitReason, cell: unitReason.startsWith('unit') ? 'unit not comparable' : 'not located', status: unitReason.startsWith('unit') ? 'unit-not-comparable' : 'not-located', valueText: unitReason, detail: tail(listText), fill: null };
    }
    const v = Math.max(...ok.map((i) => i.a.value!));
    return { ...base, value: v, cls: 'value', classLabel: `₹${fmtNum(v)}`, reason: '', cell: fmtNum(v), status: ok.length > 1 ? 'max-of-n' : 'value', valueText: `₹${fmtNum(v)} per beneficiary-year, computed here`, detail: tail(`${listText}${ok.length > 1 ? '; larger shown; amounts are not added, they may reach the same person' : ''}`), fill: fillFor(v) };
  }

  const key = OUTLAY_KEY[m];
  const fy = fyOf(y!);
  const vals: MoneyAddend[] = live.map((s) => {
    const row = outlayForFy(s, fy) ?? null;
    const v = row?.[key];
    return { scheme: s, row, v: typeof v === 'number' ? v : null };
  });
  const have = vals.filter((x) => x.v != null);
  const sum = have.reduce((a, x) => a + (x.v as number), 0);
  const srcs = dedupeSrcs(vals.map((x) => x.row?.srcs ?? []));
  if (have.length === vals.length) {
    return { ...base, addends: vals, srcs, value: sum, cls: 'value', classLabel: fmtNum(sum), reason: '', cell: fmtNum(sum), status: 'value', valueText: `sum of ${have.length} recorded scheme${have.length === 1 ? '' : 's'} · ${fmtNum(sum)} ${METRIC_UNIT[m]} · FY ${fy}`, detail: tail('computed here; sources in the state panel'), fill: fillFor(sum) };
  }
  if (have.length) {
    return { ...base, addends: vals, srcs, value: null, cls: 'stipple', classLabel: 'live, no comparable figure', reason: 'partial', cell: `partial ${have.length} of ${vals.length}`, status: 'partial', valueText: `partial: ${fmtNum(sum)} across ${have.length} of ${vals.length} live schemes`, detail: tail(`partial: ${fmtNum(sum)} across ${have.length} of ${vals.length} live schemes; a partial sum is a lower bound and is not shaded`), fill: null };
  }
  return { ...base, addends: vals, srcs, value: null, cls: 'stipple', classLabel: 'live, no comparable figure', reason: 'not located',
 cell: 'not located', status: 'not-located', valueText: `not located: no ${METRIC_SHORT[m]} figure for FY ${fy}`, detail: tail(`not located for ${vals.length} live scheme${vals.length === 1 ? '' : 's'}`), fill: null };
}

/** Alphabetical by name — the year-slice twin's order, and the order the legend counts come from. */
export const STATES_BY_NAME = [...STATES].sort((a, b) => byText(a.name, b.name));

export function stateYear(f: WelfareFilters): StateYearRow[] {
  const pool = inView(f, { ignoreLvl: true });
  return STATES_BY_NAME.map((g) => stateYearRow(g.id, f, f.y, pool));
}

export function classCounts(rows: StateYearRow[]) {
  return {
    value: rows.filter((r) => r.cls === 'value').length,
    hatch: rows.filter((r) => r.cls === 'hatch').length,
    stipple: rows.filter((r) => r.cls === 'stipple').length,
    zero: rows.filter((r) => r.cls === 'zero').length,
  };
}

/** Per metric option: how many live state schemes in view have a figure for FY(y). */
export function metricCoverage(f: WelfareFilters, m: Metric): { k: number; n: number } | null {
  if (f.y == null || m === 'live') return null;
  const pool = inView(f, { ignoreLvl: true }).filter((s) => s.level === 'state' && liveInYear(s, f.y!));
  if (m === 'perhead') {
    const inCat = pool;
    return { k: inCat.filter((s) => annualPerHead(amountInForce(s, f.y!).amount, s.benefit?.unit ?? null).value != null).length, n: inCat.length };
  }
  const key = OUTLAY_KEY[m];
  return { k: pool.filter((s) => typeof outlayForFy(s, fyOf(f.y!))?.[key] === 'number').length, n: pool.length };
}

// ---------------------------------------------------------------------------
// The clock
// ---------------------------------------------------------------------------

export type LaneEventKind = 'raised' | 'cut' | 'tightened' | 'paused' | 'discontinued' | 'renamed' | 'promised';

const LANE_KIND: Partial<Record<SchemeStatusKind, LaneEventKind>> = {
  raised: 'raised',
  cut: 'cut',
  'eligibility-tightened': 'tightened',
  paused: 'paused',
  discontinued: 'discontinued',
  renamed: 'renamed',
  'promised-not-enacted': 'promised',
};

export const EVENT_WORD: Record<LaneEventKind, string> = {
  raised: 'raised',
  cut: 'cut',
  tightened: 'eligibility tightened',
  paused: 'paused',
  discontinued: 'discontinued',
  renamed: 'renamed',
  promised: 'promised, not enacted',
};

export interface LaneEvent { date: string; kind: LaneEventKind; label: string; sourced: boolean }

export interface Lane {
  key: string;
  scheme: Scheme;
  label: string;
  where: string;
  announced: string | null;
  launched: string | null;
  ended: string | null;
  endUndated: boolean;
  events: LaneEvent[];
  undated: string[];
  statusEvents: number;
  /** `text` is the drawn label; `title` carries the full unit as recorded, for the lane's <title>. */
  amounts: { date: string; text: string; title: string }[];
}

/**
 * The unit a lane label carries. Monthly and annual rupee amounts get a short suffix;
 * anything else (per acre, per season, one-time, maximum) keeps its recorded words when
 * they are short, and otherwise says the unit is as recorded — never a bare "₹10,000",
 * which reads as a flat per-head figure. The full unit is always in the title and twin.
 */
function laneUnit(unit: string | null | undefined): string {
  const u = collapse(unit ?? '');
  if (!u) return ' (unit not recorded)';
  if (/per\s*month|\/\s*month|monthly/i.test(u) && !/per\s*acre|one-time|maximum|per\s*season/i.test(u)) return '/month';
  if (/per\s*(year|annum)|annual|yearly/i.test(u) && !/per\s*acre|one-time|maximum|per\s*season/i.test(u)) return '/yr';
  const bare = u.replace(/^₹\s*/, '');
  return bare.length <= 22 ? ` ${bare}` : ' (unit as recorded)';
}

export function laneOf(s: Scheme): Lane {
  const events: LaneEvent[] = [];
  const undated: string[] = [];
  let ended: string | null = null;
  let endUndated = false;
  const ordered = [...s.status].sort((a, b) => byText(a.date ?? '9999', b.date ?? '9999'));
  for (const t of ordered) {
    const kind = LANE_KIND[t.status];
    if (!kind) continue;
    if (!t.date) {
      undated.push(`${EVENT_WORD[kind]}${t.note ? `: ${t.note}` : ''}`);
      if (kind === 'discontinued') endUndated = true;
      continue;
    }
    if (kind === 'discontinued' && !ended) ended = t.date;
    events.push({ date: t.date, kind, label: t.note ?? EVENT_WORD[kind], sourced: t.srcs.length > 0 });
  }
  const unit = s.benefit?.unit ?? null;
  const short = laneUnit(unit);
  const title = (a: number, d: string) => `${s.name} · ₹${fmtNum(a)} · unit as recorded: ${unit ?? 'not recorded'} · from ${d}`;
  const amounts: Lane['amounts'] = [];
  if (s.benefit?.amount != null && s.launched?.date) amounts.push({ date: s.launched.date, text: `₹${fmtNum(s.benefit.amount)}${short}`, title: title(s.benefit.amount, s.launched.date) });
  for (const c of s.benefit?.changes ?? []) if (c.date && c.amount != null) amounts.push({ date: c.date, text: `₹${fmtNum(c.amount)}${short}`, title: title(c.amount, c.date) });

  return {
    key: s.id,
    scheme: s,
    label: s.name,
    where: s.level === 'central' ? 'Central' : stateName(s.st),
    announced: s.announced?.date ?? null,
    launched: s.launched?.date ?? null,
    ended,
    endUndated: !ended && endUndated,
    events,
    undated,
    statusEvents: events.length + undated.length,
    amounts,
  };
}

/** The accessible name of a lane's button (§6.2, U20). */
export const laneName = (l: Lane) =>
  `${l.label} · ${l.where} · launched ${l.launched ?? 'not launched'} · ${l.statusEvents} status events`;

export interface ScrubberRow {
  year: number;
  stateLive: number;
  centralLive: number;
  launches: number;
  elections: number;
  money: number;
}

export function scrubberRows(f: WelfareFilters): ScrubberRow[] {
  const all = inView(f);
  const stateAll = inView(f, { ignoreLvl: true }).filter((s) => s.level === 'state');
  const moneyMetric: 'share' | 'budgeted' | 'actual' = MONEY.includes(f.m) ? (f.m as 'share' | 'budgeted' | 'actual') : 'share';
  const key = OUTLAY_KEY[moneyMetric];
  return YEARS.map((y) => {
    const liveState = stateAll.filter((s) => liveInYear(s, y));
    const states = new Set(liveState.filter((s) => typeof outlayForFy(s, fyOf(y))?.[key] === 'number').map((s) => s.st));
    return {
      year: y,
      stateLive: liveState.length,
      centralLive: all.filter((s) => s.level === 'central' && liveInYear(s, y)).length,
      launches: all.filter((s) => yearOf(s.launched?.date) === y).length,
      elections: ASSEMBLY.filter((e) => yearOf(e.date) === y).length,
      money: states.size,
    };
  });
}

export const moneyColumnLabel = (m: Metric) => `States with a money figure (${METRIC_SHORT[MONEY.includes(m) ? m : 'share']}, FY)`;

export type CoverageCell = { year: number; state: 'full' | 'partial' | 'none' | 'empty'; k: number; n: number };

/**
 * Per year: how many live state schemes have the painted metric's figure. Keyed on the
 * metric the map actually paints (f.m), not the one requested, so under a fallback such
 * as ?y=2023&m=share the ribbon never describes a metric nobody can see; with live
 * painted there is no figure to cover, and the ribbon is not drawn.
 */
export function coverageByYear(f: WelfareFilters): CoverageCell[] | null {
  if (f.m === 'live') return null;
  const m = f.m;

  const pool = inView(f, { ignoreLvl: true }).filter((s) => s.level === 'state');
  return YEARS.map((y) => {
    const live = pool.filter((s) => liveInYear(s, y));
    const k = live.filter((s) => (m === 'perhead'
      ? annualPerHead(amountInForce(s, y).amount, s.benefit?.unit ?? null).value != null
      : typeof outlayForFy(s, fyOf(y))?.[OUTLAY_KEY[m]] === 'number')).length;
    const state = !live.length ? 'empty' : k === live.length ? 'full' : k > 0 ? 'partial' : 'none';
    return { year: y, state, k, n: live.length };
  });
}

// ---------------------------------------------------------------------------
// Responses and findings
// ---------------------------------------------------------------------------

interface ClaimRef { s: string; t: string; lab: string | null; tier: Tier | null }

/** Every claim id the file knows, including killed and excluded ones (whose tier the page does not know, so they answer as no tier). */
const CLAIM_BY_ID = new Map<string, ClaimRef>();
for (const c of WELFARE_CLAIMS) if (c.id) CLAIM_BY_ID.set(c.id, { s: c.s, t: c.t, lab: c.lab ?? null, tier: c.tier });
for (const c of [...WELFARE_META.killed, ...WELFARE_META.excluded]) if (!CLAIM_BY_ID.has(c.id)) CLAIM_BY_ID.set(c.id, { s: c.s, t: c.t, lab: c.lab, tier: null });

const claimOf = (ref: string): ClaimRef | null => CLAIM_BY_ID.get(ref.replace(/^claim:/, '')) ?? CLAIM_BY_ID.get(ref) ?? null;
const targetOf = (contra: GEdge) => claimOf(contra.t);

const SCHEME_IDS = new Set<string>([...WELFARE_SCHEMES.map((s) => s.id), ...WELFARE_SCHEME_NODES.map((n) => n.id)]);

/**
 * The schemes a claim concerns: its own endpoints, and, one hop only, the endpoints of a
 * claim it names as its target. The hop exists for accusations the file records as a
 * contra of a documented fact (Supriya Sule's fraud allegation contradicts a documented
 * Ladki Bahin payment figure): the reply to that accusation concerns the scheme even
 * though neither of its own endpoints is the scheme.
 */
function schemesOfClaim(c: { s: string; t: string }, hops = 1): string[] {
  const out = [c.s, c.t].filter((x) => SCHEME_IDS.has(x));
  if (hops > 0 && c.t.startsWith('claim:')) {
    const inner = claimOf(c.t);
    if (inner) out.push(...schemesOfClaim(inner, hops - 1));
  }
  return [...new Set(out)].sort(byText);
}

/**
 * A contra whose source is a scheme node is the audit's marker ("denial found in audit"),
 * not a position anyone took. It names no respondent, so it is never printed as the
 * response of those concerned, never under the rose rule, and never counts as an answer.
 */
export const isAuditNote = (c: GEdge): boolean => SCHEME_IDS.has(c.s);

export const CONTRAS: GEdge[] = WELFARE_CLAIMS.filter((c) => c.pred === 'contra').sort((a, b) => byText(a.id ?? '', b.id ?? ''));

/** The responses a named party gave to one claim: contras whose target is that claim, audit markers excluded. */
export function answersTo(claimId: string | undefined): GEdge[] {
  if (!claimId) return [];
  return CONTRAS.filter((x) => !isAuditNote(x) && (x.t === `claim:${claimId}` || x.t === claimId));
}

/**
 * The claim-level allegation ledger: every alleged claim in the graph (a contra is a
 * response, not an allegation, as contested() has always read it), the schemes it
 * concerns, and the responses that name it. This is the only place the page learns that
 * an allegation was answered: an answer is a contra whose target is that claim.
 */
export interface AllegedClaim { claim: GEdge; schemes: string[]; answers: GEdge[] }

export const ALLEGED_CLAIMS: AllegedClaim[] = WELFARE_CLAIMS
  .filter((c) => c.tier === 'alleged' && c.pred !== 'contra')
  .sort((a, b) => byText(a.from ?? '9999', b.from ?? '9999') || byText(a.id ?? '', b.id ?? ''))
  .map((c) => ({ claim: c, schemes: schemesOfClaim(c), answers: answersTo(c.id) }));

export interface SchemeResponse {
  edge: GEdge;
  /** The alleged claim this response names, verbatim. */
  answering: string | null;
  /** Who made that claim. */
  claimant: string;
  /** Who responded. */
  by: string;
}

/**
 * Responses on record about a scheme: contras whose target is an alleged claim that
 * concerns the scheme. Excluded, because none is a response of those concerned to an
 * allegation about this scheme: a contra of a documented or reported fact (that is an
 * accusation or counter-evidence, not a denial), a contra of a killed or excluded claim,
 * and the audit's markers. The file does not link any of these to one finding or
 * benefit row, so the page prints them once per scheme, each beside the claim it names,
 * and never in an item's own response slot.
 */
export function responsesFor(schemeId: string): SchemeResponse[] {
  return CONTRAS.filter((c) => {
    if (isAuditNote(c)) return false;
    const t = targetOf(c);
    return t != null && t.tier === 'alleged' && schemesOfClaim(t).includes(schemeId);
  }).map((c) => {
    const t = targetOf(c)!;
    return { edge: c, answering: t.lab, claimant: entityLabel(t.s), by: entityLabel(c.s) };
  });
}

/** The audit's markers on alleged claims about a scheme, printed as notes outside the rose slot. */
export function auditNotesFor(schemeId: string): { edge: GEdge; on: string | null }[] {
  return CONTRAS.filter((c) => {
    if (!isAuditNote(c)) return false;
    const t = targetOf(c);
    return t != null && t.tier === 'alleged' && schemesOfClaim(t).includes(schemeId);
  }).map((c) => ({ edge: c, on: targetOf(c)?.lab ?? null }));
}

export interface FindingRow { scheme: Scheme; finding: string; tier: Tier; srcs: Source[]; idx: number }

export function findingsRows(f: WelfareFilters, pool = inView(f)): FindingRow[] {
  return pool.flatMap((s) => s.results.map((r, idx) => ({ scheme: s, finding: r.finding, tier: r.tier, srcs: r.srcs, idx })))
    .filter((r) => f.tier.has(r.tier));
}

export function findingsOf(s: Scheme, tiers: Set<Tier>): FindingRow[] {
  return s.results.map((r, idx) => ({ scheme: s, finding: r.finding, tier: r.tier, srcs: r.srcs, idx }))
    .filter((r) => tiers.has(r.tier))
    .sort((a, b) => byText(a.finding, b.finding));
}

export interface ContestedRow { claim: GEdge; contra: GEdge }

export function contested(f: WelfareFilters): { pairs: ContestedRow[]; unanswered: GEdge[] } {
  if (!f.tier.has('alleged')) return { pairs: [], unanswered: [] };
  const pairs: ContestedRow[] = [];
  const unanswered: GEdge[] = [];
  for (const a of ALLEGED_CLAIMS) {
    if (a.answers.length) for (const x of a.answers) pairs.push({ claim: a.claim, contra: x });
    else unanswered.push(a.claim);
  }
  return { pairs, unanswered };
}

/**
 * An alleged finding or who-else-benefits row. Neither carries an id in the contract, so
 * no response can be paired with one; each is counted as "not linked to a response in
 * the file" until the contract carries a link (proposed: results[].claimId and
 * whoElseBenefits[].claimId).
 */
export interface AllegedItem { scheme: Scheme; kind: 'finding' | 'benefit'; text: string }

/**
 * Every answered count on the page comes from here, so the strip, the sections, the
 * by-party table and the gaps cannot disagree. Claims are in view when they concern a
 * scheme in view; a claim that concerns no scheme at all (a PIL, a Centre–state dispute)
 * is in view only when every scheme in the file is, because no scheme filter can place it.
 */
export function allegationLedger(f: WelfareFilters, o: { respectTier?: boolean; pool?: Scheme[] } = {}) {
  const pool = o.pool ?? inView(f);
  const on = !o.respectTier || f.tier.has('alleged');
  const ids = new Set(pool.map((s) => s.id));
  const whole = pool.length === WELFARE_SCHEMES.length;
  const claims = on ? ALLEGED_CLAIMS.filter((a) => (a.schemes.length ? a.schemes.some((id) => ids.has(id)) : whole)) : [];
  const findings: AllegedItem[] = on ? pool.flatMap((s) => s.results.filter((r) => r.tier === 'alleged').map((r) => ({ scheme: s, kind: 'finding' as const, text: r.finding }))) : [];
  const benefits: AllegedItem[] = on ? pool.flatMap((s) => s.whoElseBenefits.filter((w) => w.tier === 'alleged').map((w) => ({ scheme: s, kind: 'benefit' as const, text: `${whoLabel(w.who)}: ${w.how ?? 'channel not stated'}` }))) : [];
  return { claims, answered: claims.filter((a) => a.answers.length > 0), findings, benefits };
}

// ---------------------------------------------------------------------------
// Beyond the beneficiaries (§5.11)
// ---------------------------------------------------------------------------

export interface BenefitLedgerRow {
  scheme: Scheme;
  /** Set for rows that come from a claim in the graph; a response to that claim answers this row. Scheme-record rows carry no id. */
  claimId: string | null;
  who: string;
  how: string | null;
  amountCr: number | null;
  tier: Tier | null;
  from: string;
  srcs: Source[];
}

export function benefitRows(f: WelfareFilters): BenefitLedgerRow[] {
  const pool = inView(f);
  const ids = new Set(pool.map((s) => s.id));
  const seen = new Set<string>();
  const rows: BenefitLedgerRow[] = [];
  const push = (r: BenefitLedgerRow) => {
    const k = `${r.scheme.id}|${r.who}|${r.how ?? ''}`;
    if (seen.has(k)) return;
    seen.add(k);
    rows.push(r);
  };
  for (const s of pool) for (const w of s.whoElseBenefits) {
    push({ scheme: s, claimId: null, who: w.who, how: w.how, amountCr: w.amountCr, tier: w.tier, from: 'scheme record', srcs: w.srcs });
  }
  for (const b of WELFARE_BENEFITS) {
    const sid = ids.has(b.s) ? b.s : ids.has(b.t) ? b.t : null;
    if (!sid) continue;
    push({ scheme: schemeById.get(sid)!, claimId: b.claimId, who: b.who, how: b.how, amountCr: b.amountCr, tier: b.tier, from: `claim ${b.claimId}`, srcs: b.srcs });
  }
  return rows
    .filter((r) => r.tier == null || f.tier.has(r.tier))
    .sort((a, b) => bySchemeLaunch(a.scheme, b.scheme) || byText(a.who, b.who) || byText(a.how ?? '', b.how ?? ''));
}

export const whoLabel = (who: string) => (LABEL.has(who) ? entityLabel(who) : who);


// ---------------------------------------------------------------------------
// Ministers and parties (§5.9)
// ---------------------------------------------------------------------------

export type Action = 'announced' | 'approved' | 'presented budget' | 'administers' | 'opposed';
export const ACTIONS: Action[] = ['announced', 'approved', 'presented budget', 'administers', 'opposed'];

export interface MinisterAct { scheme: Scheme; date: string | null; action: Action; role: string | null; party: string | null; srcs: Source[] }
export interface MinisterRow { person: Person; party: string; acts: MinisterAct[]; earliest: string | null }

export function ministersRows(f: WelfareFilters): MinisterRow[] {
  const rows = new Map<string, MinisterRow>();
  const add = (pid: string, party: string, act: MinisterAct) => {
    const k = `${pid}|${party}`;
    if (!rows.has(k)) rows.set(k, { person: personOf(pid), party, acts: [], earliest: null });
    const r = rows.get(k)!;
    r.acts.push(act);
    if (act.date && (!r.earliest || byText(act.date, r.earliest) < 0)) r.earliest = act.date;
  };
  for (const s of inView(f)) {
    const listed = new Set(s.ministers.filter((m) => m.action === 'announced').map((m) => m.personId));
    if (s.announced?.byPersonId && !listed.has(s.announced.byPersonId)) {
      add(s.announced.byPersonId, s.party ? `${collapse(s.party)} (scheme's party)` : 'party not recorded', { scheme: s, date: s.announced.date, action: 'announced', role: s.announced.office, party: s.party, srcs: s.announced.srcs });
    }
    for (const m of s.ministers) {
      if (!m.personId || !m.action) continue;
      add(m.personId, m.party ? collapse(m.party) : 'party not recorded', { scheme: s, date: m.date, action: m.action, role: m.role, party: m.party, srcs: m.srcs });
    }
  }
  for (const r of rows.values()) r.acts.sort((a, b) => dateThenId(a.date, b.date, a.scheme.id, b.scheme.id));
  return [...rows.values()].sort((a, b) => byText(a.earliest ?? '9999', b.earliest ?? '9999') || byText(a.person.label, b.person.label) || byText(a.party, b.party));
}

export interface ActionRow { date: string | null; who: string; office: string | null; party: string | null; scheme: Scheme; action: string; srcs: Source[]; personId: string | null }

export function ministerActions(f: WelfareFilters): ActionRow[] {
  const out: ActionRow[] = [];
  for (const s of inView(f)) {
    const listed = new Set(s.ministers.filter((m) => m.action === 'announced').map((m) => m.personId));
    if (s.announced?.byPersonId && !listed.has(s.announced.byPersonId)) {
      out.push({ date: s.announced.date, who: entityLabel(s.announced.byPersonId), office: s.announced.office, party: s.party, scheme: s, action: 'announced', srcs: s.announced.srcs, personId: s.announced.byPersonId });
    }
    for (const m of s.ministers) {
      if (!m.personId) continue;
      out.push({ date: m.date, who: entityLabel(m.personId), office: m.role, party: m.party, scheme: s, action: m.action ?? 'action not recorded', srcs: m.srcs, personId: m.personId });
    }
    if (s.approved?.body) out.push({ date: s.approved.date, who: s.approved.body, office: null, party: null, scheme: s, action: 'approved', srcs: s.approved.srcs, personId: null });
  }
  return out.sort((a, b) => dateThenId(a.date, b.date, a.scheme.id, b.scheme.id) || byText(a.personId ?? '', b.personId ?? ''));
}

export function completeness(f: WelfareFilters) {
  const pool = inView(f);
  const a = pool.filter((s) => s.announced?.byPersonId).length;
  const b = pool.filter((s) => s.approved?.date).length;
  const c = pool.filter((s) => s.launched?.date).length;
  const d = pool.filter((s) => s.announced?.byPersonId && s.approved?.date && s.launched?.date).length;
  return { a, b, c, d, n: pool.length };
}

// ---------------------------------------------------------------------------
// After the launch (§5.10)
// ---------------------------------------------------------------------------

export interface StatusRow { scheme: Scheme; date: string | null; status: SchemeStatusKind; note: string | null; srcs: Source[] }

const NOT_DRAWN: SchemeStatusKind[] = ['live', 'announced', 'launched'];
const CUTS: SchemeStatusKind[] = ['cut', 'eligibility-tightened', 'paused', 'discontinued'];

export function statusRows(f: WelfareFilters, pool = inView(f)): StatusRow[] {
  return pool.flatMap((s) => s.status.filter((t) => !NOT_DRAWN.includes(t.status)).map((t) => ({ scheme: s, date: t.date, status: t.status, note: t.note, srcs: t.srcs })))
    .sort((a, b) => dateThenId(a.date, b.date, a.scheme.id, b.scheme.id) || byText(a.status, b.status));
}

export function afterSummary(f: WelfareFilters) {
  const pool = inView(f);
  const rows = statusRows(f, pool);
  return {
    dated: rows.filter((r) => r.date).length,
    schemes: new Set(rows.map((r) => r.scheme.id)).size,
    n: pool.length,
    undated: rows.filter((r) => !r.date).length,
    promised: rows.filter((r) => r.status === 'promised-not-enacted').length,
    cuts: rows.filter((r) => CUTS.includes(r.status)).length,
  };
}

export interface PromisedRow { scheme: Scheme; note: string | null; date: string | null; by: string | null; paid: string; srcs: Source[] }

export function promisedRows(f: WelfareFilters): PromisedRow[] {
  return statusRows(f).filter((r) => r.status === 'promised-not-enacted').map((r) => {
    const m = r.date ? r.scheme.ministers.find((x) => x.date === r.date && x.personId) : null;
    const amt = amountInForce(r.scheme, AS_OF_YEAR).amount;
    return {
      scheme: r.scheme,
      note: r.note,
      date: r.date,
      by: m?.personId ? entityLabel(m.personId) : null,
      paid: amt != null ? `₹${fmtNum(amt)} (${r.scheme.benefit?.unit ?? 'unit not recorded'})` : 'not located',
      srcs: r.srcs,
    };
  });
}

export interface ScrutinyRow { scheme: Scheme; date: string | null; note: string | null; before: string; after: string; diff: string; srcs: Source[] }

export function scrutinyRows(f: WelfareFilters): ScrutinyRow[] {
  return statusRows(f).filter((r) => r.status === 'eligibility-tightened').map((r) => {
    const snaps = [...r.scheme.beneficiaries].filter((b) => b.asOf && b.count != null).sort((a, b) => byText(a.asOf!, b.asOf!));
    const before = r.date ? [...snaps].reverse().find((b) => byText(b.asOf!, r.date!) <= 0) ?? null : null;
    const after = r.date ? snaps.find((b) => byText(b.asOf!, r.date!) > 0) ?? null : null;
    const txt = (b: typeof before) => (b ? `${fmtNum(b.count!)} as of ${b.asOf}` : 'not located');
    let diff = 'not computed: a snapshot is missing';
    if (before && after) {
      diff = before.srcs[0]?.[1] && before.srcs[0][1] === after.srcs[0]?.[1]
        ? `${fmtNum(after.count! - before.count!)}, computed here`
        : 'different sources, not subtracted';
    }
    return { scheme: r.scheme, date: r.date, note: r.note, before: txt(before), after: txt(after), diff, srcs: dedupeSrcs([r.srcs, before?.srcs ?? [], after?.srcs ?? []]) };
  });
}

// ---------------------------------------------------------------------------
// The control, long form (§5.8)
// ---------------------------------------------------------------------------

/** The earliest assembly election in the same state strictly after a full launch date. */
export function nextElection(s: Scheme): MergedElection | null {
  const l = fullDate(s.launched?.date);
  if (!l || s.level !== 'state') return null;
  return ASSEMBLY.find((e) => e.st === s.st && fullDate(e.date) && byText(e.date, l) > 0) ?? null;
}

export function timing(f: WelfareFilters) {
  const pool = controlPool(f).filter((s) => s.level === 'state');
  const bins: Record<string, Scheme[]> = { 0: [], 1: [], 2: [], 3: [], 4: [] };
  const noLaunch: Scheme[] = [];
  const noLater: Scheme[] = [];
  const beyond60: Scheme[] = [];
  for (const s of pool) {
    if (!fullDate(s.launched?.date)) { noLaunch.push(s); continue; }
    const e = nextElection(s);
    if (!e) { noLater.push(s); continue; }
    const m = monthsBetween(s.launched!.date, e.date)!;
    if (m >= 60) { beyond60.push(s); continue; }
    bins[String(Math.floor(m / 12))].push(s);
  }
  const b = Object.values(bins).reduce((a, x) => a + x.length, 0);
  return { bins, b, n: pool.length, noLaunch, noLater, beyond60 };
}

export interface PartyRow {
  party: string;
  withLater: Scheme[];
  within12: Scheme[];
  raised12: Scheme[];
  promised: Scheme[];
  cuts: Scheme[];
  findings: { D: number; R: number; A: number; An: number };
  /** Alleged claims in the graph about this row's schemes, and those a named party answered: claim-level, never inferred from the scheme. */
  alleged: AllegedClaim[];
  answered: AllegedClaim[];
  incumbent: { retained: ElectionRow[]; lost: ElectionRow[]; unclassified: ElectionRow[] };
}

const raisedNear = (s: Scheme) => {
  const raises = freshDates(s).filter((d) => d !== fullDate(s.launched?.date));
  return raises.some((d) => ASSEMBLY.some((e) => e.st === s.st && fullDate(e.date) && (() => { const m = monthsBetween(d, e.date); return m != null && m >= 0 && m < 12; })()));
};

function partyRowOf(label: string, schemes: Scheme[], rows: ElectionRow[]): PartyRow {
  const withLater = schemes.filter((s) => nextElection(s));
  const within12 = withLater.filter((s) => (monthsBetween(s.launched!.date, nextElection(s)!.date) ?? 99) < 12);
  const results = schemes.flatMap((s) => s.results);
  const ids = new Set(schemes.map((s) => s.id));
  const alleged = ALLEGED_CLAIMS.filter((a) => a.schemes.some((id) => ids.has(id)));
  return {
    party: label,
    withLater,
    within12,
    raised12: schemes.filter(raisedNear),
    promised: schemes.filter((s) => s.status.some((t) => t.status === 'promised-not-enacted')),
    cuts: schemes.filter((s) => s.status.some((t) => CUTS.includes(t.status))),
    findings: {
      D: results.filter((r) => r.tier === 'documented').length,
      R: results.filter((r) => r.tier === 'reported').length,
      A: results.filter((r) => r.tier === 'alleged').length,
      An: results.filter((r) => r.tier === 'analytic').length,
    },
    alleged,
    answered: alleged.filter((a) => a.answers.length > 0),
    incumbent: split(rows),
  };
}

export const NO_SINGLE_PARTY = 'No single party (alliance, coalition or not recorded)';

/**
 * By-party table: every party measured in the same columns; ignores the party filter by
 * construction. A party is a row if it recorded a state scheme OR was the incumbent at an
 * election in the file, because the incumbents with no recorded scheme are exactly the
 * ones the control exists to show. Schemes and elections whose party string names no
 * single party get their own row, so the party rows sum to "All parties" in every column.
 */
export function partyRows(f: WelfareFilters): { all: PartyRow; parties: PartyRow[]; none: PartyRow; central: PartyRow } {
  const pool = controlPool(f);
  const stateSchemes = pool.filter((s) => s.level === 'state');
  const rows = electionRows(f);
  const labels = [...new Set([...stateSchemes.map((s) => canon(s.party)), ...rows.map((r) => r.incumbent)].filter((p): p is string => !!p))].sort(byText);
  return {
    all: partyRowOf('All parties', stateSchemes, rows),
    parties: labels.map((p) => partyRowOf(p, stateSchemes.filter((s) => canon(s.party) === p), rows.filter((r) => r.incumbent === p))),
    none: partyRowOf(NO_SINGLE_PARTY, stateSchemes.filter((s) => !canon(s.party)), rows.filter((r) => !r.incumbent)),
    central: partyRowOf('Central (vs Lok Sabha)', pool.filter((s) => s.level === 'central'), electionRows(f, 'lok sabha')),
  };
}

/** Do the party rows plus the no-single-party row sum to All parties, scheme column and incumbent column alike? */
export function partyRowsBalance(pr: ReturnType<typeof partyRows>): string | null {
  const parts = [...pr.parties, pr.none];
  const sum = (k: (r: PartyRow) => number) => parts.reduce((a, r) => a + k(r), 0);
  const checks: [string, (r: PartyRow) => number][] = [
    ['schemes with a later election', (r) => r.withLater.length],
    ['incumbent retained', (r) => r.incumbent.retained.length],
    ['incumbent lost', (r) => r.incumbent.lost.length],
    ['incumbent unclassified', (r) => r.incumbent.unclassified.length],
  ];
  const bad = checks.filter(([, k]) => sum(k) !== k(pr.all)).map(([n, k]) => `${n}: rows sum to ${sum(k)}, All parties is ${k(pr.all)}`);
  return bad.length ? bad.join('; ') : null;
}


export interface TurnoverRow { e: MergedElection; outcome: Outcome; scheme: Scheme; placed: { date: string; status: string; note: string | null; srcs: Source[] }[]; unplaced: { date: string | null; status: string; note: string | null }[]; ownPartyWon: boolean }

/** Launched on or before a full date — at the precision the launch was recorded, and never assumed when that precision cannot tell. */
const launchedBy = (s: Scheme, d: string): boolean => {
  const l = s.launched?.date;
  if (!l) return false;
  if (fullDate(l)) return byText(l, d) <= 0;
  return byText(l, d.slice(0, l.length)) < 0;
};

export function turnovers(f: WelfareFilters): { rows: TurnoverRow[]; own: TurnoverRow[]; rival: TurnoverRow[] } {
  const pool = controlPool(f).filter((s) => s.level === 'state');
  const all: TurnoverRow[] = [];
  for (const e of ASSEMBLY) {
    const d = fullDate(e.date);
    if (!d) continue;
    for (const s of pool) {
      if (s.st !== e.st || !launchedBy(s, d)) continue;
      const endedBefore = s.status.some((t) => t.status === 'discontinued' && t.date && byText(t.date, d.slice(0, t.date.length)) < 0);
      if (endedBefore) continue;
      const placed: TurnoverRow['placed'] = [];
      const unplaced: TurnoverRow['unplaced'] = [];
      for (const t of s.status) {
        if (NOT_DRAWN.includes(t.status)) continue;
        const td = fullDate(t.date);
        if (td) {
          const m = monthsBetween(d, td);
          if (m != null && m >= 0 && m <= 24) placed.push({ date: td, status: t.status, note: t.note, srcs: t.srcs });
        } else if (!t.date || byText(t.date, d.slice(0, t.date.length)) >= 0) {
          unplaced.push({ date: t.date, status: t.status, note: t.note });
        }
      }
      placed.sort((a, b) => byText(a.date, b.date));
      const own = e.outcome !== 'unclassified' && canon(e.winnerRaw) != null && canon(e.winnerRaw) === canon(s.party);
      all.push({ e, outcome: e.outcome, scheme: s, placed, unplaced, ownPartyWon: own });
    }
  }
  const rows = all.filter((r) => !r.ownPartyWon).sort((a, b) => byText(a.e.date, b.e.date) || byText(a.scheme.id, b.scheme.id));
  return { rows, own: all.filter((r) => r.ownPartyWon), rival: all.filter((r) => !r.ownPartyWon && r.outcome !== 'unclassified') };
}

export const hasCut = (r: TurnoverRow) => r.placed.some((p) => CUTS.includes(p.status as SchemeStatusKind));

// ---------------------------------------------------------------------------
// Money twin and matrix (§11)
// ---------------------------------------------------------------------------

export interface MoneyRow { scheme: Scheme; fy: string; recorded: string; annual: string; beneficiaries: string; budgeted: string; actual: string; share: string; gsdp: string; srcs: Source[] }

const pct = (v: number | null) => (v == null ? 'not located' : `${fmtNum(v)} per cent`);
const cr = (v: number | null) => (v == null ? 'not located' : `₹${fmtNum(v)} cr`);

export function moneyRows(f: WelfareFilters): MoneyRow[] {
  const out: MoneyRow[] = [];
  for (const s of inView(f)) {
    for (const o of s.outlay) {
      const y = yearOf(o.fy);
      const amt = y != null ? amountInForce(s, y).amount : null;
      const a = annualPerHead(amt, s.benefit?.unit ?? null);
      const snap = y != null ? [...s.beneficiaries].filter((b) => b.asOf && (yearOf(b.asOf) ?? 9999) <= y + 1).sort((p, q) => byText(q.asOf!, p.asOf!))[0] : undefined;
      out.push({
        scheme: s,
        fy: o.fy,
        recorded: amt != null ? `₹${fmtNum(amt)} (${s.benefit?.unit ?? 'unit not recorded'})` : 'not located',
        annual: a.value != null ? `₹${fmtNum(a.value)} / yr ×${a.factor}, computed here` : (a.reason ?? 'not located'),
        beneficiaries: snap?.count != null ? `${fmtNum(snap.count)} as of ${snap.asOf}` : 'not located',
        budgeted: cr(o.budgetedCr),
        actual: cr(o.actualCr),
        share: pct(o.pctOfStateBudget),
        gsdp: pct(o.pctOfGSDP),
        srcs: o.srcs,
      });
    }
  }
  return out.sort((a, b) => byText(a.fy, b.fy) || bySchemeLaunch(a.scheme, b.scheme));
}

export function matrix(f: WelfareFilters): { st: StateCode; name: string; cells: StateYearRow[] }[] {
  const pool = inView(f, { ignoreLvl: true });
  return STATES_BY_NAME.map((g) => ({ st: g.id, name: g.name, cells: YEARS.map((y) => stateYearRow(g.id, f, y, pool)) }));
}

// ---------------------------------------------------------------------------
// Strip, gaps, ledger
// ---------------------------------------------------------------------------

export interface Fact { n: number; of?: number; label: string }

export function yearsCovered(pool: Scheme[]): number[] {
  return YEARS.filter((y) => pool.some((s) => liveInYear(s, y)));
}

export function stripFacts(f: WelfareFilters): Fact[] {
  const pool = inView(f);
  const outlay = pool.flatMap((s) => s.outlay);
  const al = allegationLedger(f, { pool });
  const unlinked = al.findings.length + al.benefits.length;
  return [
    { n: pool.length, of: WELFARE_SCHEMES.length, label: 'schemes in view' },
    { n: new Set(pool.filter((s) => s.level === 'state' && s.st).map((s) => s.st)).size, of: STATE_COUNT, label: 'states & UTs with a recorded state scheme' },
    { n: yearsCovered(pool).length, of: YEAR_COUNT, label: 'years with a recorded live scheme' },
    { n: ASSEMBLY.length, label: 'assembly elections recorded · reference class not in file' },
    { n: outlay.filter((o) => o.actualCr != null).length, of: outlay.length, label: 'outlay rows with an actual, not only a budget' },
    { n: al.answered.length, of: al.claims.length, label: `allegations with a response on record (alleged claims in the graph) · ${unlinked} alleged findings and benefit rows not linked to any response in the file · whether a response was sought not recorded` },
  ];
}

/**
 * The byline's facts, from the unfiltered register. The strip is the filtered view; the
 * byline describes the file, so it never mixes a filtered count with an unfiltered total.
 */
export function bylineFacts() {
  return {
    schemes: WELFARE_SCHEMES.length,
    states: new Set(WELFARE_SCHEMES.filter((s) => s.level === 'state' && s.st).map((s) => s.st)).size,
    parties: PARTY_LABELS.length,
    elections: ASSEMBLY.length,
  };
}

/** Launches the file records before and from a year, for a caption that would otherwise say "thinner" by hand. */
export function launchesSplit(year: number, pool: Scheme[] = WELFARE_SCHEMES) {
  const ys = pool.map((s) => yearOf(s.launched?.date)).filter((y): y is number => y != null);
  return { before: ys.filter((y) => y < year).length, from: ys.filter((y) => y >= year).length, undated: pool.length - ys.length };
}

const SYMMETRY_STATES: StateCode[] = ['mp', 'mh', 'or', 'as', 'ct', 'dl', 'hr', 'br', 'ka', 'hp', 'tg', 'wb', 'tn', 'ap', 'jh', 'pb'];

/** §5.15: what the page above cannot say, derived from the file rather than written by hand. */
export function derivedGaps(): Gap[] {
  const gaps: Gap[] = [];
  const all = WELFARE_SCHEMES;
  const why = 'derived by this page from the register';
  // One array, the same one the strip and the sections count from.
  const ledger = allegationLedger(parseFilters(new URLSearchParams()), { pool: all });
  for (const a of ledger.claims.filter((x) => !x.answers.length)) {
    gaps.push({ what: `No response in the file names the alleged claim ${entityLabel(a.claim.s)} → ${entityLabel(a.claim.t)}: ${a.claim.lab ?? a.claim.d ?? 'no summary'}`, why });
  }
  // An item has no id, so the most that can be said is that no response is linked to it.
  for (const a of [...ledger.findings, ...ledger.benefits]) {
    const n = responsesFor(a.scheme.id).length;
    const held = n ? ` (the file holds ${n} response${n === 1 ? '' : 's'} to alleged claims about the scheme, none linked to this ${a.kind === 'finding' ? 'finding' : 'benefit row'})` : '';
    gaps.push({ what: `No response linked to an allegation about ${a.scheme.name}${held}: ${a.text}`, why });
  }

  if (ledger.findings.length || ledger.benefits.length) {
    gaps.push({ what: `${ledger.findings.length + ledger.benefits.length} alleged findings and benefit rows carry no id, so no response can be paired with one and none is counted as answered`, why: 'SchemeResult and whoElseBenefits have no claimId or respondsTo field; proposed for the fleet contract: results[].claimId and whoElseBenefits[].claimId, naming the claim each restates' });
  }
  if (ledger.claims.length || ledger.findings.length || ledger.benefits.length) {
    gaps.push({ what: 'response sought: not recorded — the file does not say, for any allegation, whether the people concerned were asked', why: 'the contract has no responseSought field (denied · no reply · not asked)' });
  }

  const noLaunch = all.filter((s) => !s.launched?.date);
  if (noLaunch.length) gaps.push({ what: `${noLaunch.length} schemes have no launch date and are not placed on the clock or the map: ${noLaunch.map((s) => s.name).join('; ')}`, why });
  const partialLaunch = all.filter((s) => s.launched?.date && !fullDate(s.launched.date));
  if (partialLaunch.length) gaps.push({ what: `${partialLaunch.length} launch dates are a year or a month only, so they count for liveness but never for the 6, 12 or 24 month windows: ${partialLaunch.map((s) => `${s.name} (${s.launched!.date})`).join('; ')}`, why });
  for (const s of all) {
    const ec = s.electionContext;
    const c = ec ? monthsBetween(s.launched?.date, ec.date) : null;
    if (ec && ec.monthsFromLaunch != null && c != null && Math.abs(c - ec.monthsFromLaunch) > 1) {
      gaps.push({ what: `${s.name}: recorded ${ec.monthsFromLaunch} months from launch to ${ec.election ?? 'the election'}, computed ${c} from the recorded dates; the page does not choose`, why });
    }
  }
  const unsourced = all.flatMap((s) => [...s.status.filter((t) => !t.srcs.length).map((t) => `${s.name} · ${t.status}${t.date ? ` ${t.date}` : ''}`), ...(s.benefit?.changes ?? []).filter((c) => !c.srcs.length).map((c) => `${s.name} · benefit change ${c.date ?? 'undated'}`)]);
  if (unsourced.length) gaps.push({ what: `${unsourced.length} status or benefit entries carry no source in the file: ${unsourced.join('; ')}`, why });
  const units = [...new Set(all.filter((s) => s.benefit?.amount != null && annualPerHead(s.benefit.amount, s.benefit.unit).value == null).map((s) => s.benefit!.unit ?? 'unit not recorded'))];
  if (units.length) gaps.push({ what: `${units.length} benefit units cannot be annualised and are stippled, not converted: ${units.join(' | ')}`, why: 'per-acre, one-time, in-kind and maximum amounts do not compare with a monthly or annual transfer' });
  const allParty = [...new Set([...all.map((s) => s.party), ...WELFARE_ELECTIONS.flatMap((e) => [e.incumbentParty, e.winner])].filter((x): x is string => !!x))];
  allParty.forEach((p) => canon(p));
  if (UNMAPPED.size) gaps.push({ what: `party strings the resolution table does not map, shown as recorded: ${[...UNMAPPED].sort(byText).join(' | ')}`, why });
  // Spec D9: every election string the classification sets aside, by either path (the table or, for unmapped strings, the coalition test).
  const allianceStrings = [...new Set(ELECTIONS.flatMap((e) => [e.incumbentRaw, e.winnerRaw]).filter((x): x is string => !!x && (canon(x) == null || namesAlliance(x))))].sort(byText);
  const setAside = ELECTIONS.filter((e) => e.outcome === 'unclassified').length;
  if (allianceStrings.length) gaps.push({ what: `${setAside} of ${ELECTIONS.length} elections are unclassified, because an incumbent or winner string names an alliance, a front, a coalition, a hung house or no single party (or the merged records disagree); the strings: ${allianceStrings.join(' | ')}`, why: 'coalition outcomes are not forced into kept or lost; the resolution table decides which strings name an alliance' });
  const baseAmounts = all.filter((s) => s.benefit?.amount != null);
  if (baseAmounts.length) gaps.push({ what: `${baseAmounts.length} base per-head amounts have no source of their own; the scheme card cites each to its scheme record, which may not state the amount`, why: 'SchemeBenefit has no srcs field; proposed for the fleet contract: benefit.srcs' });
  if (SCHEMES_WITHOUT_SINGLE_PARTY.length) gaps.push({ what: `${SCHEMES_WITHOUT_SINGLE_PARTY.length} schemes record an alliance or more than one party and cannot be reached by a single-party filter or counted as fresh for an incumbent: ${SCHEMES_WITHOUT_SINGLE_PARTY.map((s) => `${s.name} (${partyText(s)})`).join('; ')}`, why });
  const missingSym = SYMMETRY_STATES.filter((st) => !all.some((s) => s.st === st));
  if (missingSym.length) gaps.push({ what: `symmetry-list states with no scheme recorded: ${missingSym.map(stateName).join(', ')}`, why: 'the symmetry check names these states; the file has nothing for them' });
  const emptyYears = YEARS.filter((y) => !all.some((s) => s.level === 'state' && liveInYear(s, y)));
  if (emptyYears.length) gaps.push({ what: `${emptyYears.length} of ${YEAR_COUNT} years have no live state scheme recorded anywhere: ${emptyYears.join(', ')}`, why: 'a hatched year is unmeasured, not a year without schemes' });
  if (!STATE_COVERAGE.length) gaps.push({ what: 'coverage absent: no research file declares which state-years it searched completely, so no state is ever painted as having had no scheme', why: 'the optional coverage field of the fleet contract is empty' });
  else gaps.push({ what: `coverage is declared for ${new Set(STATE_COVERAGE.map((c) => c.st)).size} states and only for the categories each file searched; with no category chosen, no state-year is declared searched`, why: 'coverage declarations are per category' });
  gaps.push({ what: 'challenger promises are not in the contract: the control measures incumbents only, while opposition parties often promised transfers too', why: 'the fleet contract records schemes, not manifestos' });
  gaps.push({ what: 'promise amounts are stored only as text, so promised versus paid is shown side by side and never subtracted', why: 'the contract has no structured promisedAmount field' });
  gaps.push({ what: `the reference class is not in the file: ${ASSEMBLY.length} assembly elections are recorded, not every assembly election held ${FIRST_YEAR}–${LAST_YEAR}`, why: 'an ECI-sourced list of elections held would let the strip print n of all held' });
  for (const e of MERGED_ELECTIONS) gaps.push({ what: `${stateName(e.st)} ${e.election} ${e.date}: ${e.records.length} records of one poll (${e.records.map((r) => `${r.date} in ${r.domain}`).join('; ')}) are counted here as one election${e.disagreement ? `; ${e.disagreement}, so it is unclassified` : ''}`, why: 'records of the same state and kind within 90 days are one poll' });
  const results = all.flatMap((s) => s.results);
  if (results.length) {
    gaps.push({ what: `${results.length} findings carry no date and no issuing body in the contract, so a finding cannot be placed in time`, why: 'SchemeResult has no date or by field yet' });
  }
  return gaps;
}

export const PRIMARY = /\.gov\.in|\.nic\.in|eci\.gov\.in|rbi\.org\.in|cag\.gov\.in|indiabudget\.gov\.in|sansad\.in/i;

export function ledgerSources(): Source[] {
  const all: Source[][] = [];
  for (const s of WELFARE_SCHEMES) {
    all.push(s.srcs, s.announced?.srcs ?? [], s.approved?.srcs ?? [], s.launched?.srcs ?? []);
    for (const b of s.beneficiaries) all.push(b.srcs);
    for (const o of s.outlay) all.push(o.srcs);
    for (const t of s.status) all.push(t.srcs);
    for (const r of s.results) all.push(r.srcs);
    for (const m of s.ministers) all.push(m.srcs);
    for (const w of s.whoElseBenefits) all.push(w.srcs);
    for (const c of s.benefit?.changes ?? []) all.push(c.srcs);
    if (s.electionContext) all.push(s.electionContext.srcs);
  }
  for (const c of WELFARE_CLAIMS) all.push(c.srcs ?? []);
  for (const e of WELFARE_ELECTIONS) all.push(e.srcs);
  for (const b of WELFARE_BASE_RATES) all.push(b.srcs);
  for (const n of WELFARE_NARRATIVES) all.push(n.srcs);
  for (const v of WELFARE_VOIDS) all.push(v.srcs);
  return dedupeSrcs(all).sort((a, b) => byText(a[0], b[0]) || byText(a[1], b[1]));
}

export const RECORDED_GAPS: Gap[] = WELFARE_GAPS.map((g) => ({ what: g.text, why: `recorded by the ${g.domain} sweep` }));

export const hostOf = (url: string): string => {
  const m = /^https?:\/\/([^/?#]+)/i.exec(url);
  return m ? m[1].replace(/^www\./, '') : url;
};

// ---------------------------------------------------------------------------
// Pass-throughs, so components read the register through this module only
// ---------------------------------------------------------------------------

export const WELFARE_SYMMETRY_LIST = WELFARE_SYMMETRY;
export const WELFARE_BASE_RATE_LIST = WELFARE_BASE_RATES;
export const WELFARE_VOID_LIST = WELFARE_VOIDS;
export const WELFARE_NARRATIVE_LIST = WELFARE_NARRATIVES;
export const WELFARE_CLAIM_LIST: GEdge[] = WELFARE_CLAIMS;
export const GRAPH_NODES: GNode[] = [...WELFARE_ENTITIES, ...WELFARE_SCHEME_NODES];
export const killedClaims = () => WELFARE_META.killed;
export const auditRan = () => WELFARE_META.audit != null;
export const TOTAL_SCHEMES = WELFARE_SCHEMES.length;

export const latestStatusOf = latestStatus;
export const outlayForFyView = outlayForFy;

// The by-party rows partition "All parties" by construction, so this can only fail when
// code in this file changes. Failing at load turns that edit into a smoke-test failure,
// rather than a table whose rows silently stop summing to their own total.
{
  const bad = partyRowsBalance(partyRows(parseFilters(new URLSearchParams())));
  if (bad) throw new Error(`/welfare by-party rows do not sum to All parties: ${bad}`);
}

