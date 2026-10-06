/// <reference types="vite/client" />
/**
 * The CPPP award scrape — the pipeline outputs of scripts/cppp/build.py, typed.
 *
 * Why discovery rather than static imports: the files live in research/raw/cppp/, which
 * a build may not have (a fresh clone without the offline pipeline run, or the scaffold
 * fixture the acceptance suite builds). `import.meta.glob` returns an empty map for a
 * missing directory, so the build succeeds and the page prints the absence sentence —
 * never a zero.
 *
 * Why one `import()` per file: the files are large (concentration.json alone is
 * ~0.9 MB) and a reader of the default /tenders view should not download them. Each
 * becomes its own chunk of compiled-in data — code-splitting, not a runtime fetch.
 *
 * The concentration file is deliberately NOT in the glob below: it is normalised in
 * ./cpppConcentration, and only that module (one chunk, loaded after the section mounts)
 * mentions its raw key names.
 */

// ---------------------------------------------------------------------------
// Types, as emitted by scripts/cppp/build.py (and verify_sample.py)
// ---------------------------------------------------------------------------

export type Portal = 'central' | 'state';

export interface InputFile {
  file: string;
  bytes: number;
  sha256_16: string;
}

export interface ValueBandDef {
  band: string;
  lo: number;
  hi: number | null;
}

/** Fields the spec asks the pipeline to add; absent today, so every use is optional. */
export interface DatasetOrigin {
  name: string;
  url: string;
  licence: string;
  scraper: string;
}

export interface Provenance {
  inputs: InputFile[];
  rows: number;
  distinctTenderIds: number;
  afterDedupRows: number;
  dedupRule: string;
  dedupRuleDetail?: string;
  buyerRule?: string;
  markerRegex: string;
  markedRule?: string;
  valueBandsInr: ValueBandDef[];
  sql: Record<string, string>;
  generatedBy: string;
  asOf: string;
  refusal?: string;
  dataset?: DatasetOrigin;
  scrapedAt?: { value: string; method?: string };
}

export interface ProvenanceFile {
  provenance: Provenance;
  outputs?: string[];
}

export interface HeavyTenderId {
  tender_id: string;
  portal: string;
  rows: number;
  distinct_bidders: number;
  distinct_aoc: number;
}

export interface QualityFile {
  readMeFirst: string;
  /** Every output file carries the same provenance block; this one is the fallback. */
  provenance?: Provenance;
  raw: {
    rows: number;
    distinctTenderIds: number;
    byPortalYear: { portal: string; portal_year: number | string; rows: number }[];
  };
  duplicates: {
    tenderIdsWithMultipleRows: number;
    rowsSharingATenderId: number;
    maxRowsPerTenderId: number;
    heaviestTenderIds: HeavyTenderId[];
  };
  afterDedup: {
    rule: string;
    rows: number;
    removed: number;
    alternativeOnePerTenderId: { rule: string; rows: number; removed: number };
    alternativeOnePerTenderBidder: { rule: string; rows: number; removed: number };
  };
  nulls: Record<string, number>;
  bidsReceived: { null: number; zero: number; one: number; over1000: number; max?: number };
  contractValue: { null: number; lteZero: number; over1e12: number; implausibleRule: string };
  dates: {
    aocBeforeClosing: number;
    aocYearOutOfRange: number;
    portalYearDiffersFromAocYear: number;
    yearRange: [number, number];
  };
  tenderType: {
    rawValues: { raw: string | null; normalised: string; n: number }[];
    normalisedCounts: Record<string, number>;
    note: string;
  };
  organisations: {
    junkRows: number;
    centralDistinctBuyers: number;
    stateDistinctBuyers: number;
    /** Distinct organisation_name values on the state portal (each is a state or UT). */
    stateDistinctOrganisationName?: number;
    /**
     * Prerequisite, not yet emitted: every state-portal organisation_name with its raw
     * row count. Until it exists, a state with no buyer at n ≥ 30 cannot be told apart
     * from a state with no rows at all, because smaller buyers are pooled.
     */
    statePortalNames?: { name: string; rows: number }[];
    buyerRule?: string;
  };
  winnerMarkers: {
    regex: string;
    rule: string;
    named: number;
    marked: number;
    unmarked: number;
    markedSharePct: number;
    note?: string;
    msOnlyNamed?: { n: number; of: number };
  };
}

export type Wilson = [number, number] | null | undefined;

export interface YearRow {
  portal: Portal;
  year: string;
  n: number;
  singleBidder: number;
  singleBidderPct: number;
  wilson95?: Wilson;
  meanBids: number | null;
  medianBids: number | null;
}

export interface KeyRow {
  key: string;
  n: number;
  singleBidder: number;
  singleBidderPct: number;
  wilson95?: Wilson;
  meanBids: number | null;
  medianBids: number | null;
}

export interface OrgRow extends KeyRow {
  portal: Portal | 'all';
  pooledGroups?: number;
  junkOrganisationRows?: number;
}

export interface RatesFile {
  denominator: string;
  denominatorN: number;
  excludedFromDenominator: { afterDedupRows: number; bidsNullOrZeroOrOver1000: number };
  rateDefinition: string;
  byPortalYear: YearRow[];
  byTenderType: KeyRow[];
  byValueBand: KeyRow[];
  byOrganisation: OrgRow[];
  byOrganisationPooling: string;
  caveat: string;
  byPortalTenderType?: unknown;
}

export interface PortalRate {
  portal: Portal;
  familySize: number;
  count: number;
  ratePct: number;
  wilson95?: Wilson;
}

export interface Indicator {
  indicator: string;
  definition: string;
  familyDefinition: string;
  familySize: number;
  count: number;
  ratePct: number;
  wilson95?: Wilson;
  byPortal: PortalRate[];
  innocentReading: string;
  note?: string;
  nonOpenLabelsLeftInOtherUnknown?: { n: number; distinct_labels: number };
  pairs?: number;
  repeatPairs?: number;
}

export interface BuyerRate {
  portal: Portal;
  buyer: string;
  n: number;
  singleBidder: number;
  singleBidderPct: number;
  wilson95?: Wilson;
}

export interface RedflagsFile {
  stance: string;
  indicators: Indicator[];
  singleBiddingByBuyer: BuyerRate[];
  singleBiddingByBuyerNote: string;
  singleBiddingByBuyerFamily?: { threshold: number; eligibleBuyers: number };
}

export interface TimingFile {
  definition: string;
  n: number;
  excludedAocBeforeClosing: number;
  excludedDateMissing: number;
  daysClosingToAoc: { bin: string; n: number }[];
  shareLe2Days: { count: number; n: number; pct: number; wilson95?: Wilson };
  medianDays: number;
  byPortal: { portal: Portal; n: number; le2Days: number; le2DaysPct: number }[];
  aocByFinancialYearMonth: {
    fyMonth: number;
    calendarMonth: number;
    n: number;
    pct: number;
    byPortal: Record<Portal, number>;
  }[];
  innocentReading: string;
}

export type Verdict = 'match' | 'mismatch' | 'missing' | 'page_gone';

export interface SampleRow {
  tender_id: string;
  portal: Portal;
  year: number;
  organisation_name: string;
  selected_bidder: string;
  detail_url: string;
  fetch: { httpStatus: number; bytes: number; sha256_16: string; pageClass: string; fetchedAt: string };
  verdicts: Record<string, Verdict>;
}

export interface SampleFile {
  title: string;
  seed: number;
  rng: string;
  strata: { portal: string; year: number; k: number }[];
  strataShortfall: unknown[];
  redraw: string;
  fetchMethod: string;
  pageGone: number;
  finding: string;
  agreement: Record<string, Record<Verdict, number>>;
  verdictRule: Record<Verdict, string>;
  refusal: string;
  rows: SampleRow[];
  provenance: { sql: Record<string, string>; candidateRows?: number; generatedBy?: string };
}

/** Concentration, renamed by ./cpppConcentration (see there for why). */
export interface ConcentrationRow {
  portal: Portal;
  buyer: string;
  awards: number;
  valueSumInr: number;
  markedAwards: number;
  unmarkedAwards: number;
  unmarkedShareOfAwardsPct: number;
  distinctMarkedWinners: number;
  hhiValue: number | null;
  hhiCount: number | null;
  topShareOfValuePct: number | null;
  topShareOfCountPct: number | null;
  winners: { name: string; awards: number; valueInr: number }[];
}

export interface Concentration {
  family: string;
  hhiDefinition: string;
  namingRule: string;
  innocentReading: string;
  rows: ConcentrationRow[];
}

export interface CpppCore {
  provenance: ProvenanceFile | null;
  quality: QualityFile | null;
  rates: RatesFile | null;
  redflags: RedflagsFile | null;
  timing: TimingFile | null;
  sample: SampleFile | null;
}

// ---------------------------------------------------------------------------
// Discovery and loading
// ---------------------------------------------------------------------------

const FILES = import.meta.glob(['../../research/raw/cppp/*.json', '!**/concentration.json'], {
  import: 'default',
}) as Record<string, () => Promise<unknown>>;

const fileKey = (name: string) => Object.keys(FILES).find((k) => k.endsWith(`/cppp/${name}.json`));

/** The spec's rule: without quality.json the section prints the absence sentence and nothing else. */
export const CPPP_PRESENT = !!fileKey('quality');

async function load<T>(name: string): Promise<T | null> {
  const k = fileKey(name);
  return k ? ((await FILES[k]()) as T) : null;
}

let corePromise: Promise<CpppCore> | null = null;

/** Every file the section's first screen needs, in parallel, once per page load. */
export function loadCore(): Promise<CpppCore> {
  corePromise ??= Promise.all([
    load<ProvenanceFile>('provenance'),
    load<QualityFile>('quality'),
    load<RatesFile>('rates'),
    load<RedflagsFile>('redflags'),
    load<TimingFile>('timing'),
    load<SampleFile>('sample-verification'),
  ]).then(([provenance, quality, rates, redflags, timing, sample]) => ({
    provenance, quality, rates, redflags, timing, sample,
  }));
  return corePromise;
}

/** The head link in the default view needs only the row count. */
export const loadProvenance = () => load<ProvenanceFile>('provenance');

let concPromise: Promise<Concentration | null> | null = null;
export function loadConcentration(): Promise<Concentration | null> {
  concPromise ??= import('./cpppConcentration').then((m) => m.CONCENTRATION);
  return concPromise;
}

// ---------------------------------------------------------------------------
// Derivations shared by the section's components
// ---------------------------------------------------------------------------

/** The scrape date, or the words the spec prescribes while it is not a field. */
export const scrapedLabel = (p: Provenance) => p.scrapedAt?.value ?? 'scrape date not yet a field';

const numericYear = (y: string) => /^\d{4}$/.test(y);

/**
 * The scrape year: `scrapedAt`'s year when the field exists; otherwise (fixed by the
 * acceptance document, AC-38) the largest numeric AOC year with n ≥ 30 that is not
 * after the year of `asOf`.
 */
export function scrapeYearOf(p: Provenance, rates: RatesFile): number {
  if (p.scrapedAt?.value) return Number(p.scrapedAt.value.slice(0, 4));
  const cap = Number(p.asOf.slice(0, 4));
  const ys = rates.byPortalYear.filter((r) => numericYear(r.year) && r.n >= 30 && Number(r.year) <= cap).map((r) => Number(r.year));
  return ys.length ? Math.max(...ys) : cap;
}

export type NotPlottedReason = 'out-of-range year' | 'after the scrape year' | 'n < 30';

export interface YearPlan {
  row: YearRow;
  plotted: boolean;
  reason: NotPlottedReason | null;
  /** In range but n < 30: keeps a hatched slot, never a point. */
  hatch: boolean;
  thin: boolean;
  partial: boolean;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : 0;
};

/** The spec's year rules (U4), per portal, in emitted order. */
export function planYears(rates: RatesFile, portal: Portal, scrapeYear: number): YearPlan[] {
  const rows = rates.byPortalYear.filter((r) => r.portal === portal);
  const base = rows.map((row): YearPlan => {
    const reason: NotPlottedReason | null = !numericYear(row.year)
      ? 'out-of-range year'
      : Number(row.year) > scrapeYear
        ? 'after the scrape year'
        : row.n < 30
          ? 'n < 30'
          : null;
    return { row, plotted: reason == null, reason, hatch: reason === 'n < 30', thin: false, partial: false };
  });
  const half = median(base.filter((y) => y.plotted).map((y) => y.row.n)) / 2;
  for (const y of base) {
    if (!y.plotted) continue;
    y.thin = y.row.n < half;
    y.partial = Number(y.row.year) === scrapeYear;
  }
  return base;
}

/**
 * The reviewed alias table for state-portal spellings: exact strings only, never fuzzy.
 * Each entry was read against `rates.byOrganisation` keys and `src/data/india-states.json`
 * names on 2026-09-26. "Ladakh UT" has no entry because Ladakh is not in the 36 names.
 */
export const STATE_PORTAL_ALIASES: Readonly<Record<string, string>> = {
  'Andaman and Nicobar Island': 'Andaman and Nicobar Islands',
  'Chandigarh UT': 'Chandigarh',
  'Dadra and Nagar Haveli (UT)': 'Dadra and Nagar Haveli',
  'Lakshadweep UT': 'Lakshadweep',
  'NCT of Delhi': 'Delhi',
  'Puducherry UT': 'Puducherry',
  Telegana: 'Telangana',
};

export interface StatePrefix {
  prefix: string;
  /** The state name the prefix matches, exactly or through the alias table. */
  state: string | null;
  viaAlias: boolean;
  buyers: number;
  awards: number;
}

export interface StatesSplit {
  /** One row per state that appears: its exact spelling if emitted, else its first alias. */
  matched: StatePrefix[];
  /** Spellings that match no state name, and further spellings of a state already listed. */
  other: StatePrefix[];
  /**
   * States and UTs whose name no emitted prefix matches. This is NOT "absent from the
   * portal": `byOrganisation` lists only buyers with n ≥ 30, so a state whose every
   * buyer is smaller sits in the pooled row and is unlisted here (see `unlistedStatus`).
   */
  unlisted: string[];
}

/** The state-portal prefixes of `byOrganisation` keys, exactly as emitted, in emitted order. */
export function statePrefixes(rates: RatesFile): StatePrefix[] {
  const out = new Map<string, StatePrefix>();
  for (const r of rates.byOrganisation) {
    if (r.portal !== 'state') continue;
    const prefix = r.key.split(' / ')[0];
    let p = out.get(prefix);
    if (!p) {
      p = { prefix, state: null, viaAlias: false, buyers: 0, awards: 0 };
      out.set(prefix, p);
    }
    p.buyers += 1;
    p.awards += r.n;
  }
  return [...out.values()];
}

/** A spelling's state name: exact, or through the reviewed alias table, else null. */
function stateOf(spelling: string, names: Set<string>): { state: string | null; viaAlias: boolean } {
  if (names.has(spelling)) return { state: spelling, viaAlias: false };
  const a = STATE_PORTAL_ALIASES[spelling];
  return a && names.has(a) ? { state: a, viaAlias: true } : { state: null, viaAlias: false };
}

export function splitStates(rates: RatesFile, stateNames: string[]): StatesSplit {
  const names = new Set(stateNames);
  const prefixes = statePrefixes(rates);
  for (const p of prefixes) Object.assign(p, stateOf(p.prefix, names));
  const matched: StatePrefix[] = [];
  const other: StatePrefix[] = [];
  const seen = new Set<string>();
  // An exact spelling claims its state before any alias does, whatever the emitted order.
  const ordered = [...prefixes.filter((p) => p.state && !p.viaAlias), ...prefixes.filter((p) => !p.state || p.viaAlias)];
  for (const p of ordered) {
    if (p.state && !seen.has(p.state)) {
      seen.add(p.state);
      matched.push(p);
    } else other.push(p);
  }
  const order = new Map(prefixes.map((p, i) => [p.prefix, i]));
  matched.sort((a, b) => order.get(a.prefix)! - order.get(b.prefix)!);
  other.sort((a, b) => order.get(a.prefix)! - order.get(b.prefix)!);
  return { matched, other, unlisted: stateNames.filter((s) => !seen.has(s)) };
}

/**
 * What the emitted files can say about a state (or any spelling) with no buyer at n ≥ 30:
 * - `absent`: `statePortalNames` is emitted and gives it no rows — the only case in which
 *   the page may say "not present on the state portal";
 * - `pooled`: `statePortalNames` gives it rows, so its buyers are all below the threshold;
 * - `unknown`: the field is not emitted, so the pooled row may or may not hold it.
 */
export type UnlistedStatus = { kind: 'absent' } | { kind: 'pooled'; rows: number } | { kind: 'unknown' };

export function unlistedStatus(quality: QualityFile | null, spelling: string, stateNames: string[]): UnlistedStatus {
  const list = quality?.organisations.statePortalNames;
  if (!list) return { kind: 'unknown' };
  const names = new Set(stateNames);
  const target = stateOf(spelling, names).state ?? spelling;
  // Every emitted spelling that is, or maps to, the same state counts towards it.
  const rows = list.filter((x) => x.name === spelling || (stateOf(x.name, names).state ?? x.name) === target).reduce((a, x) => a + x.rows, 0);
  return rows > 0 ? { kind: 'pooled', rows } : { kind: 'absent' };
}

/**
 * State-portal organisation names the pipeline counts but no n ≥ 30 buyer carries: they
 * exist only inside the pooled row, and which names they are is not emitted. Null when
 * the count is not in quality.json.
 */
export function pooledOnlyNames(quality: QualityFile | null, rates: RatesFile): number | null {
  const total = quality?.organisations.stateDistinctOrganisationName;
  return total == null ? null : Math.max(0, total - statePrefixes(rates).length);
}

/** True when any emitted file carries a state-portal key under this spelling. */
export function onStatePortal(core: CpppCore, spelling: string, stateNames: string[], concRows: ConcentrationRow[] = []): boolean {
  const pre = `${spelling} / `;
  return (
    !!core.rates?.byOrganisation.some((r) => r.portal === 'state' && r.key.startsWith(pre)) ||
    !!core.redflags?.singleBiddingByBuyer.some((b) => b.portal === 'state' && b.buyer.startsWith(pre)) ||
    concRows.some((r) => r.portal === 'state' && r.buyer.startsWith(pre)) ||
    unlistedStatus(core.quality, spelling, stateNames).kind === 'pooled'
  );
}

/**
 * Sampled rows whose stored link reached a page, so that some field could be compared.
 * Counted per row, because the sentence it feeds divides by rows: summing `match` over
 * fields would put field checks over rows.
 */
export const checkableRows = (s: SampleFile) => s.rows.filter((r) => !Object.values(r.verdicts).includes('page_gone')).length;

/** Fields the spec lists as pipeline prerequisites, and whether each is still absent. */
export function absentPrerequisites(core: CpppCore, p: Provenance): string[] {
  const out: string[] = [];
  if (!p.dataset) out.push('provenance.dataset');
  if (!p.scrapedAt) out.push('provenance.scrapedAt');
  if (core.quality && core.quality.winnerMarkers.msOnlyNamed === undefined) out.push('winnerMarkers.msOnlyNamed');
  if (core.quality && core.quality.organisations.statePortalNames === undefined) out.push('quality.organisations.statePortalNames');
  if (core.redflags && core.redflags.singleBiddingByBuyerFamily === undefined) out.push('redflags.singleBiddingByBuyerFamily');
  if (core.rates && core.rates.byPortalTenderType === undefined) out.push('rates.byPortalTenderType');
  return out;
}

// ---------------------------------------------------------------------------
// The security slice (Phase H2): research/raw/cppp/security.json
// ---------------------------------------------------------------------------

/**
 * The slice is written by scripts/cppp/security.py over the same scrape as the six
 * files above: the awards whose buyer, department code or title names a security body,
 * cut into eight buyer classes. It is read by /security (the procurement lens) and by the
 * one cross-reference line in the /tenders national section. Every rate is dataset-only,
 * exactly as the whole-file rates are, and the file says so in its own words
 * (`readMeFirst`, `caveat`), which the pages quote rather than paraphrase.
 */

export type SecurityClass =
  | 'works' | 'stores' | 'research' | 'dpsu' | 'capf' | 'intelligence-investigation' | 'state-police' | 'other-security';

export interface SecurityRate {
  n: number;
  singleBidder: number;
  singleBidderPct: number;
  wilson95: Wilson;
  meanBids?: number;
  medianBids?: number;
}

/** A class or class-year rate beside the whole file (and the whole file on the same portal). */
export interface SecurityClassRate extends SecurityRate {
  class: SecurityClass | string;
  portal?: Portal | string;
  year?: string;
  wholeFile: SecurityRate;
  wholeFileSamePortal?: SecurityRate;
}

export interface SecurityHeadlineRow {
  class: SecurityClass | string;
  rawRows: number;
  dedupRows: number;
  n: number;
  singleBidder: number;
  singleBidderPct: number;
  wilson95: Wilson;
  wholeFileSamePortalPct: number;
  wholeFilePct: number;
}

export interface SecurityClassDefinition {
  definition: string;
  innocentReading: string;
  note?: string;
}

export interface SecurityTimingBlock {
  class: string;
  dedupRows: number;
  n: number;
  excludedAocBeforeClosing: number;
  excludedDateMissing: number;
  daysClosingToAoc: { bin: string; n: number }[];
  shareLe2Days: { count: number; n: number; pct: number; wilson95: Wilson };
  medianDays: number;
  meanDays: number;
  p90Days: number;
  wholeFile: { shareLe2DaysPct: number; wilson95: Wilson; n: number; medianDays: number };
  wholeFileSamePortal?: { shareLe2DaysPct: number; wilson95: Wilson; n: number; medianDays: number };
}

export interface SecurityBuyerConcentration {
  portal: Portal | string;
  buyer: string;
  class: SecurityClass | string;
  route: string;
  awards: number;
  valueSumInr: number;
  markedAwards: number;
  unmarkedAwards: number;
  unmarkedShareOfAwardsPct: number;
  unmarkedShareOfValuePct: number;
  distinctMarkedWinners: number;
  hhiMarkedValue: number;
  hhiMarkedCount: number;
  topMarkedWinnerSharePct: number;
}

export interface SecurityIndicator {
  indicator: string;
  definition: string;
  familyDefinition: string;
  familySize: number;
  count: number;
  ratePct: number;
  wilson95: Wilson;
  byClass: { class: string; familySize: number; count: number; ratePct: number; wilson95: Wilson }[];
  wholeFile: { familySize: number; count: number; ratePct: number; wilson95: Wilson };
  innocentReading: string;
}

/**
 * quality.total and quality.byClass[] (security.py writes the same block for both). Only
 * the row counts are typed: the nested null and plausibility tallies stay open, because
 * no page reads them and a typed guess would claim a shape the file never promised.
 */
export interface SecurityQualityCounts {
  rawRows: number;
  rawDistinctTenderIds?: number;
  dedupRows: number;
  dedupDistinctTenderIds?: number;
  [k: string]: unknown;
}

export interface SecurityFile {
  readMeFirst: string;
  sliceRule: {
    family: string;
    centralBuyerRegex: string;
    stateDepartmentCodeRegex: string;
    stateTitleRegex: string;
    classRule: string;
    classMembers: { class: string; member: string; regex: string }[];
    otherSecurityRegex: string;
    classes: string[];
    notInSlice: string;
    [k: string]: unknown;
  };
  classes: {
    definitions: Record<string, SecurityClassDefinition>;
    map: { portal: string; buyer: string; class: string; member: string; route: string; rows: number }[];
    mapNote: string;
    memberCoverage: { class: string; member: string; rows: number; buyers: number }[];
    memberCoverageNote: string;
    unclassified: { portal: string; buyer: string; rows: number }[];
    unclassifiedNote: string;
    titleOnlyBuyers: { buyer: string; rows: number; sliceRawRows: number; buyerRawRows: number; sliceShareOfBuyerRawRowsPct: number }[];
    titleOnlyBuyersTotal: { buyers: number; rows: number };
    titleOnlyBuyersNote: string;
    [k: string]: unknown;
  };
  headline: SecurityHeadlineRow[];
  headlineNote: string;
  quality: {
    readMeFirst: string;
    raw: { rows: number; distinctTenderIds: number; byPortal: Record<string, number>; shareOfFileRowsPct: number };
    afterDedup: { rule: string; rows: number; shareOfFileDedupRowsPct: number };
    /** The slice's own counts before and after the dedup rule; /security prints raw → dedup from here. */
    total: SecurityQualityCounts;
    /** The same counts per buyer class, in file order; a class's share of slice decisions is its dedupRows over total.dedupRows. */
    byClass: (SecurityQualityCounts & { class: SecurityClass | string })[];
    stateRoutes: { route: string; rows: number; buyers: number }[];
    bareTitleTermsLeftOut: Record<string, number | string>;
    innocentReading: string;
  };
  rates: {
    denominator: string;
    denominatorN: number;
    rateDefinition: string;
    comparatorRule: string;
    total: SecurityRate & { wholeFile: SecurityRate; restOfFile: SecurityRate };
    excludingWorks: SecurityRate & { note: string };
    byClass: SecurityClassRate[];
    byClassYear: SecurityClassRate[];
    byYear: (SecurityRate & { year: string; wholeFile: SecurityRate })[];
    stateByRoute: (SecurityRate & { route: string })[];
    innocentReading: string;
    caveat: string;
  };
  bands: {
    thresholdsInr: ValueBandDef[];
    implausibleRule: string;
    definition: string;
    byClass: { class: string; rows: number; bands: { band: string; rows: number; n?: number; singleBidder?: number; singleBidderPct?: number; wilson95?: Wilson }[] }[];
    innocentReading: string;
  };
  timing: { definition: string; total: SecurityTimingBlock; byClass: SecurityTimingBlock[]; innocentReading: string };
  concentration: {
    family: string;
    hhiDefinition: string;
    namingRule: string;
    buyers: number;
    byBuyer: SecurityBuyerConcentration[];
    crossFileNote: string;
    byClass: { class: string; topMarkedWinners: { buyer?: string; winner: string; awards: number; sharePct?: number; [k: string]: unknown }[] }[];
    msOnlyNamed: { n: number; of: number; note: string };
    innocentReading: string;
  };
  redflags: { stance: string; indicators: SecurityIndicator[] };
  caveat: string;
  provenance: Provenance;
}

let securityPromise: Promise<SecurityFile | null> | null = null;

/**
 * The slice loads on demand, once per page load, like concentration.json: it is the
 * second-largest file and only two places read it. Null when the pipeline has not
 * written it; the readers print the absence and estimate nothing in its place.
 */
export function loadSecurity(): Promise<SecurityFile | null> {
  securityPromise ??= load<SecurityFile>('security');
  return securityPromise;
}
