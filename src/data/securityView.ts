/**
 * Every figure /security prints, derived at module scope from the force register.
 *
 * The page and its components hold no number of their own: a count, a ₹, a share or a
 * year range on screen is read from here, and here it is computed from
 * src/graph/force.generated.ts, STATE_ECONOMY (GSDP only) and the map geometry. The run
 * will be reconciled (ids merge, counts move), so nothing below pins a figure from the
 * spec; the only literals are the anchors of SECURITY_PAGE.md §3.2, each a head, an id
 * or a pattern the research files already write.
 *
 * Two rules govern every derivation. No total adds rows from two levels: the demand
 * stack sums demand-level rows of one (fy, stage) and nothing else, the police stack
 * adds the Police demand's revenue and capital, and every other ₹ is a row as printed.
 * And absence is never zero: a missing row is `null` here and prints its words, a
 * recorded 0 stays a 0.
 */

import {
  FORCE_NODES, FORCE_EDGES, FORCE_EDGE_DOMAIN, FORCE_BENEFITS, FORCE_VOIDS, FORCE_NARRATIVES, FORCE_BASE_RATES,
  FORCE_SYMMETRY, FORCE_GAPS, FORCE_IDENTITY, FORCE_BUDGETS, FORCE_STRENGTH, FORCE_FOOTPRINT, FORCE_META,
} from '../graph/force.generated';
import { NODES as ATLAS_NODES } from '../graph/data';
import { ENERGY_NODES } from '../graph/energy.generated';
import { FINANCE_NODES } from '../graph/finance.generated';
import { NGO_NODES } from '../graph/ngo.generated';
import { CAPITAL_NODES } from '../graph/capital.generated';
import { WELFARE_SCHEME_NODES } from './welfare.generated';
import { STATES } from './geo';
import { STATE_ECONOMY } from './companies';
import type { GEdge, GNode, Source, StateCode, Tier } from '../graph/schema';
import type { BudgetComponent, BudgetRow, BudgetStage, FootprintKind, FootprintRow, StrengthRow, BaseRateRow, Narrative, Void, FleetText } from '../graph/fleet';

// ---------------------------------------------------------------------------
// Anchors (spec §3.2). Each names a head, an id or a pattern the research writes.
// ---------------------------------------------------------------------------

export const MOD = 'min:ministry-of-defence';
export const MHA = 'min:ministry-of-home-affairs';
export const DELHI_POLICE = 'force:delhi-police';
export const PENSIONS_BODY = 'force:defence-pensions';
export const DEFENCE_BODIES: readonly string[] = [MOD, 'force:indian-army', 'force:indian-navy', 'force:indian-air-force', 'force:drdo', PENSIONS_BODY, 'force:ofb'];
export const STATE_SERIES_HEAD = 'Police (MH 2055)';
export const MOD_ALL_DEMANDS = 'Ministry of Defence — all demands (Summary of Demands for Grants, BE)';
export const WHOLE_DEMAND = '(whole demand)';
export const DEMAND_PREFIX = /^Demand \d+ — /;
export const EDITION_SUFFIX = / \(Summary of Demands for Grants, BE\)$/;
export const DEMAND_LEVEL = /^Demand \d+ — [^:]+?( \(Summary of Demands for Grants, BE\))?$/;
export const REPORTED_PREFIX = 'reported:';
export const CASE_PREFIX = 'force:case-';
export const CASE_PAIR = ['force:case-bofors', 'force:case-rafale'] as const;
export const MONEY_PEOPLE = 'money-people';
export const PAY_PENSIONS = 'pay-pensions';
export const PROCUREMENT = 'procurement-industry';
export const LAKH_NOTE = 'RBI Appendix II prints ₹ lakh; converted to ₹ crore (÷100).';
export const CITY_POLICE_TEXT = (state: string) => `inside ${state}'s police head (MH 2055) — no city budget is published`;
export const CITY_STRENGTH_VOID = 'no primary table — the national police table is unreachable';
export const NO_RESPONSE = 'No response recorded — asked/not asked unknown';
export const NO_PAIRING = 'No control pairing recorded for this case in the register.';
export const NOTHING = 'Nothing recorded yet.';
export const EMPTY_MONO = 'register not yet promoted — nothing below is zero';
export const EMPTY_WORDS = 'Register not yet promoted — nothing below is zero';
export const NO_BUDGET_ROWS = 'This register holds no budget rows in this build. Nothing below is zero.';
export const NO_FP_ROWS = 'This register holds no installation rows in this build. Nothing below is zero.';
export const CONTROL_EMPTY = 'No symmetry check recorded for this lens — the control has not been run. This is a gap, not a pass.';
export const SLICE_ABSENT = 'The open-market slice is not built in this copy of the register. Nothing here is zero.';
export const ZERO_WORDS = '₹0 cr — as recorded';
export const NO_ROW = 'no row in this register';

export type Lens = 'budgets' | 'footprint' | 'procurement';
export const LENSES: Lens[] = ['budgets', 'footprint', 'procurement'];
export const LENS_LABEL: Record<Lens, string> = { budgets: 'Budgets', footprint: 'Footprint', procurement: 'Procurement and people' };
export const LENS_SHORT: Record<Lens, string> = { budgets: 'Budgets', footprint: 'Footprint', procurement: 'Procurement' };
export const LENS_DOMAINS: Record<Lens, string[]> = {
  budgets: ['union-defence', 'union-home', 'state-police', 'pay-pensions'],
  footprint: ['footprint'],
  procurement: ['procurement-industry', 'money-people', 'literature'],
};
export const STAGES: BudgetStage[] = ['BE', 'RE', 'actual'];
export const COMPONENTS: BudgetComponent[] = ['total', 'revenue', 'capital', 'pay', 'pension', 'other', 'grant-to-states'];
/** A component in a table cell, in words: "capital" alone also names an actor family. */
export const COMP_WORD: Record<BudgetComponent, string> = { total: 'total', revenue: 'revenue', capital: 'capital account', pay: 'pay', pension: 'pension', other: 'other', 'grant-to-states': 'grant to states' };
export const TIER_LIST: Tier[] = ['documented', 'reported', 'alleged', 'analytic'];

// ---------------------------------------------------------------------------
// Run metadata
// ---------------------------------------------------------------------------

export const META = FORCE_META;
export const EMPTY = !!FORCE_META.empty;
export const ASOF = FORCE_META.asOf ?? 'not promoted';
export const RUN = FORCE_META.runId;
export const KILLED = FORCE_META.killed ?? [];
export const VERDICTS = FORCE_META.audit?.verdicts.length ?? 0;
export const FILES = FORCE_META.counts?.files ?? FORCE_META.files.length;
export const BUDGETS = FORCE_BUDGETS;
export const STRENGTH = FORCE_STRENGTH;
export const FOOTPRINT = FORCE_FOOTPRINT;
export const EDGES = FORCE_EDGES;
export const DOMAIN = FORCE_EDGE_DOMAIN;
export const VOIDS = FORCE_VOIDS;
export const GAPS = FORCE_GAPS;
export const NARRATIVES = FORCE_NARRATIVES;
export const BASE_RATES = FORCE_BASE_RATES;
export const SYMMETRY = FORCE_SYMMETRY;
export const IDENTITY = FORCE_IDENTITY;
export const BENEFITS = FORCE_BENEFITS;

// ---------------------------------------------------------------------------
// Nodes and labels: the force module first, then the Atlas and the other fleets
// ---------------------------------------------------------------------------

const FORCE_NODE = new Map<string, GNode>(FORCE_NODES.map((n) => [n.id, n]));
const OTHER_NODE = new Map<string, GNode>();
for (const list of [ATLAS_NODES, ENERGY_NODES, FINANCE_NODES, NGO_NODES, CAPITAL_NODES, WELFARE_SCHEME_NODES]) {
  for (const n of list) if (n?.id && !OTHER_NODE.has(n.id)) OTHER_NODE.set(n.id, n);
}
export const nodeOf = (id: string | null | undefined): GNode | null => (id ? FORCE_NODE.get(id) ?? OTHER_NODE.get(id) ?? null : null);
export const resolves = (id: string) => nodeOf(id) != null;
export const labelOf = (id: string) => nodeOf(id)?.label ?? `${id} (not in the register)`;
export const FORCE_NODE_LIST = FORCE_NODES;

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

// One formatter each, built once: toLocaleString builds a new one per call, and the ledger
// formats tens of thousands of figures.
const CR_FMT = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
const INT_FMT = new Intl.NumberFormat('en-IN');
export const fmtCr = (x: number) => CR_FMT.format(x);
export const fmtInt = (x: number) => INT_FMT.format(x);
export const round2 = (x: number) => Math.round(x * 100) / 100;
export const pct = (a: number, b: number) => round2((a / b) * 100);
const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const uniq = <T,>(xs: T[]) => [...new Set(xs)];
export const last = <T,>(xs: readonly T[]): T | undefined => xs[xs.length - 1];
export const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
export const yearOf = (d: string | null | undefined) => (typeof d === 'string' && /^\d{4}/.test(d) ? Number(d.slice(0, 4)) : null);
export const hostOf = (url: string) => { try { return new URL(url).host; } catch { return url; } };
export const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  return n === 0 ? null : n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
};
/** The research's tier for a series row: the `reported:` prefix is the only marker the files write (S4 absent). */
export const rowTier = (r: { note?: string | null; tier?: string }): Tier =>
  (r.tier === 'reported' || r.tier === 'documented' ? (r.tier as Tier) : (r.note ?? '').startsWith(REPORTED_PREFIX) ? 'reported' : 'documented');
export const firstSource = (srcs: Source[] | [string, string][] | undefined | null) => srcs?.[0]?.[0] ?? 'no source in file';

// ---------------------------------------------------------------------------
// The FY axis and the Union and state rows
// ---------------------------------------------------------------------------

export const fyStart = (fy: string) => Number(String(fy).slice(0, 4));
export const fyLabel = (y: number) => `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
const FY_STARTS = BUDGETS.map((r) => fyStart(r.fy)).filter(Number.isFinite);
export const FY_AXIS: string[] = FY_STARTS.length
  ? Array.from({ length: Math.max(...FY_STARTS) - Math.min(...FY_STARTS) + 1 }, (_, i) => fyLabel(Math.min(...FY_STARTS) + i))
  : [];
export const prevFy = (fy: string) => fyLabel(fyStart(fy) - 1);

export const UNION_ROWS = BUDGETS.filter((r) => r.payer === 'union');
export const STATE_ROWS = BUDGETS.filter((r) => r.payer !== 'union');
/** S1 reads a `level` field; until then the head's printed form is the rule (F3, F5). */
export const isDemandLevel = (r: BudgetRow) => ('level' in r ? (r as BudgetRow & { level: string }).level === 'demand' : DEMAND_LEVEL.test(r.head));
const DEFENCE_SET = new Set(DEFENCE_BODIES);
export const isDefence = (r: BudgetRow) => DEFENCE_SET.has(r.body);
const stripDemand = (head: string) => head.replace(DEMAND_PREFIX, '').replace(EDITION_SUFFIX, '');
export const demandNo = (head: string) => head.match(/^Demand (\d+) — /)?.[1] ?? null;
export const demandTitle = (head: string) => stripDemand(head).split(':')[0].trim();

/** Every Union row by (fy, stage) — the readout and the stack read it, never a page total. */
const BY_FY_STAGE = new Map<string, BudgetRow[]>();
for (const r of UNION_ROWS) {
  const k = `${r.fy}|${r.stage}`;
  if (!BY_FY_STAGE.has(k)) BY_FY_STAGE.set(k, []);
  BY_FY_STAGE.get(k)!.push(r);
}
const rowsAt = (fy: string, stage: BudgetStage) => BY_FY_STAGE.get(`${fy}|${stage}`) ?? [];

/** The demand-level defence rows of one (fy, stage); the Summary edition only where nothing else was transcribed (E2). */
export function defenceDemands(fy: string, stage: BudgetStage): BudgetRow[] {
  const rows = rowsAt(fy, stage).filter((r) => isDefence(r) && isDemandLevel(r));
  const plain = rows.filter((r) => !EDITION_SUFFIX.test(r.head));
  return plain.length ? plain : rows;
}
export const publishedTotal = (fy: string, stage: BudgetStage) => rowsAt(fy, stage).find((r) => r.head === MOD_ALL_DEMANDS) ?? null;

export type BandName = 'revenue' | 'capital' | 'civil' | 'pension';
export const BAND_OF: Record<string, BandName> = { revenue: 'revenue', capital: 'capital', pension: 'pension', total: 'civil' };
export const BAND_ORDER: BandName[] = ['revenue', 'capital', 'civil', 'pension'];
export const BAND_WORD: Record<BandName, string> = { revenue: 'revenue', capital: 'capital', civil: 'MoD civil and misc.', pension: 'pensions' };

export interface StackCol {
  fy: string;
  missing: boolean;
  rows: BudgetRow[];
  /** One entry per demand-level row, bottom to top in the fixed band order. */
  bands: { band: BandName; row: BudgetRow }[];
  sum: number;
  published: BudgetRow | null;
  recon: 'equal' | 'differs' | 'none';
  delta: number;
  partial: { k: number; n: number } | null;
  pension: number | null;
  /** The pension share on the one basis (U9): the published total where printed, else the stack. */
  pensionPct: number | null;
  basis: 'of published total' | 'of stack, computed here';
  revenueDemands: number;
}

const stackCache = new Map<BudgetStage, StackCol[]>();
export function defenceStack(stage: BudgetStage): StackCol[] {
  const hit = stackCache.get(stage);
  if (hit) return hit;
  const per = FY_AXIS.map((fy) => ({ fy, rows: defenceDemands(fy, stage) }));
  const maxCount = Math.max(0, ...per.map((p) => p.rows.length));
  const unionComps = new Set(per.flatMap((p) => p.rows.map((r) => r.component)));
  const out = per.map(({ fy, rows }): StackCol => {
    const pub = publishedTotal(fy, stage);
    if (!rows.length) {
      return { fy, missing: true, rows, bands: [], sum: 0, published: pub, recon: 'none', delta: 0, partial: null, pension: null, pensionPct: null, basis: pub ? 'of published total' : 'of stack, computed here', revenueDemands: 0 };
    }
    const bands = [...rows].map((row) => ({ band: BAND_OF[row.component] ?? 'civil', row }))
      .sort((a, b) => BAND_ORDER.indexOf(a.band) - BAND_ORDER.indexOf(b.band) || cmp(a.row.head, b.row.head));
    const sum = rows.reduce((s, r) => s + r.cr, 0);
    const recon = pub == null ? 'none' : Math.abs(sum - pub.cr) <= 0.5 ? 'equal' : 'differs';
    const comps = new Set(rows.map((r) => r.component));
    const partial = rows.length < maxCount && comps.size < unionComps.size && [...comps].every((c) => unionComps.has(c)) ? { k: rows.length, n: maxCount } : null;
    const pensionRows = rows.filter((r) => r.component === 'pension');
    const pension = pensionRows.length ? pensionRows.reduce((s, r) => s + r.cr, 0) : null;
    const base = pub ? pub.cr : sum;
    return {
      fy, missing: false, rows, bands, sum: round2(sum), published: pub, recon, delta: pub ? round2(sum - pub.cr) : 0, partial,
      pension, pensionPct: pension != null && base > 0 ? pct(pension, base) : null,
      basis: pub ? 'of published total' : 'of stack, computed here',
      revenueDemands: rows.filter((r) => r.component === 'revenue').length,
    };
  });
  stackCache.set(stage, out);
  return out;
}
export const coveredFys = (stage: BudgetStage) => defenceStack(stage).filter((c) => !c.missing).map((c) => c.fy);
const STAGE_RANK: Record<BudgetStage, number> = { actual: 0, RE: 1, BE: 2 };
/** The stage with the widest coverage of the stack, ties to actual > RE > BE (D9). Derived, never hand-set. */
export const DEFAULT_STAGE: BudgetStage = [...STAGES].sort((a, b) => coveredFys(b).length - coveredFys(a).length || STAGE_RANK[a] - STAGE_RANK[b])[0];
export const latestFy = (stage: BudgetStage) => last(coveredFys(stage)) ?? null;
/** FYs where the number of revenue demands changes from the previous drawn FY (D8). */
export function structureBreaks(stage: BudgetStage) {
  const cols = defenceStack(stage).filter((c) => !c.missing);
  const out: { fy: string; from: number; to: number }[] = [];
  for (let i = 1; i < cols.length; i++) if (cols[i].revenueDemands !== cols[i - 1].revenueDemands) out.push({ fy: cols[i].fy, from: cols[i - 1].revenueDemands, to: cols[i].revenueDemands });
  return out;
}

/** Pay lines inside the defence demands: a bracket and a count, never a band (F8). */
export function payLines(fy: string, stage: BudgetStage) {
  return rowsAt(fy, stage).filter((r) => r.component === 'pay' && isDefence(r));
}
export function payBreaks(stage: BudgetStage) {
  const out: { fy: string; from: number; to: number }[] = [];
  let prev: number | null = null;
  for (const c of defenceStack(stage)) {
    if (c.missing) continue;
    const k = payLines(c.fy, stage).length;
    if (prev != null && k !== prev) out.push({ fy: c.fy, from: prev, to: k });
    prev = k;
  }
  return out;
}
export const agnipathLines = (fy: string, stage: BudgetStage) => rowsAt(fy, stage).filter((r) => isDefence(r) && /Agnipath/i.test(r.head));

/** The Union Police demand's whole-demand rows of one (fy, stage), by component (F10). */
export function policeDemand(fy: string, stage: BudgetStage): Partial<Record<BudgetComponent, BudgetRow>> | null {
  const rows = rowsAt(fy, stage).filter((r) => (r.head.includes(WHOLE_DEMAND) && r.body === MHA) || (/^Demand/.test(r.head) && r.head.includes('Police: Grand Total')));
  if (!rows.length) return null;
  const by: Partial<Record<BudgetComponent, BudgetRow>> = {};
  for (const r of rows) by[r.component] = r;
  return by;
}
export const policeChecked = (stage: BudgetStage) => FY_AXIS.filter((fy) => { const p = policeDemand(fy, stage); return !!(p?.revenue && p.capital && p.total); });
export const policeEqual = (p: Partial<Record<BudgetComponent, BudgetRow>>) => !!(p.revenue && p.capital && p.total) && Math.abs(p.total!.cr - (p.revenue!.cr + p.capital!.cr)) <= 0.5;
export function delhiAt(fy: string, stage: BudgetStage): Partial<Record<BudgetComponent, BudgetRow>> | null {
  const rows = rowsAt(fy, stage).filter((r) => r.body === DELHI_POLICE);
  if (!rows.length) return null;
  const by: Partial<Record<BudgetComponent, BudgetRow>> = {};
  for (const r of rows) by[r.component] = r;
  return by;
}
export const policePay = (fy: string, stage: BudgetStage) => rowsAt(fy, stage).filter((r) => r.component === 'pay' && r.body === MHA);
export const DELHI_ROWS = UNION_ROWS.filter((r) => r.body === DELHI_POLICE);
export const DELHI_POINTS = uniq(DELHI_ROWS.map((r) => `${r.fy}:${r.stage}`))
  .map((k) => { const [fy, stage] = k.split(':'); return { fy, stage: stage as BudgetStage }; })
  .sort((a, b) => cmp(a.fy, b.fy) || STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage));

// ---------------------------------------------------------------------------
// The ledger: one lane per body × component × line as printed (D11)
// ---------------------------------------------------------------------------

export const laneKey = (r: BudgetRow) => `${r.body}|${r.component}|${stripDemand(r.head)}`;
export const LANE_SOURCE = UNION_ROWS.filter((r) => r.component !== 'grant-to-states');
export type LaneGroup = 'published' | 'body' | 'city';
export interface Lane {
  key: string;
  body: string;
  component: BudgetComponent;
  line: string;
  group: LaneGroup;
  rows: BudgetRow[];
  cells: Map<string, Record<BudgetStage, BudgetRow[]>>;
  max: number;
  maxRow: BudgetRow;
  fyFirst: string;
  fyLast: string;
  cover: Record<BudgetStage, number>;
  slug: string;
}
const COMP_ORDER: BudgetComponent[] = ['total', 'revenue', 'capital', 'pay', 'pension', 'other', 'grant-to-states'];
const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const LANES: Lane[] = (() => {
  const m = new Map<string, BudgetRow[]>();
  for (const r of LANE_SOURCE) { const k = laneKey(r); if (!m.has(k)) m.set(k, []); m.get(k)!.push(r); }
  const lanes: Lane[] = [];
  const slugs = new Map<string, number>();
  for (const [key, rows] of m) {
    const [body, component] = key.split('|');
    const line = key.split('|').slice(2).join('|');
    const published = rows.some((r) => r.head === MOD_ALL_DEMANDS || (r.body === MHA && r.head.includes(WHOLE_DEMAND)));
    const cells = new Map<string, Record<BudgetStage, BudgetRow[]>>();
    for (const r of rows) {
      if (!cells.has(r.fy)) cells.set(r.fy, { BE: [], RE: [], actual: [] });
      cells.get(r.fy)![r.stage].push(r);
    }
    const maxRow = rows.reduce((a, b) => (b.cr > a.cr ? b : a), rows[0]);
    const fys = uniq(rows.map((r) => r.fy)).sort();
    const cover = { BE: 0, RE: 0, actual: 0 } as Record<BudgetStage, number>;
    for (const s of STAGES) cover[s] = uniq(rows.filter((r) => r.stage === s).map((r) => r.fy)).length;
    let slug = slugify(`${body.replace(/^[a-z]+:/, '')}-${component}-${line}`).slice(0, 60);
    const n = slugs.get(slug) ?? 0;
    slugs.set(slug, n + 1);
    if (n) slug = `${slug}-${n + 1}`;
    lanes.push({ key, body, component: component as BudgetComponent, line, group: published ? 'published' : body === DELHI_POLICE ? 'city' : 'body', rows, cells, max: maxRow.cr, maxRow, fyFirst: fys[0], fyLast: last(fys)!, cover, slug });
  }
  const g = { published: 0, body: 1, city: 2 };
  return lanes.sort((a, b) => g[a.group] - g[b.group]
    || (a.group === 'body' ? cmp(labelOf(a.body), labelOf(b.body)) : 0)
    || cmp(a.body, b.body)
    || COMP_ORDER.indexOf(a.component) - COMP_ORDER.indexOf(b.component)
    || cmp(a.line, b.line) || cmp(a.fyFirst, b.fyFirst));
})();
export const LANE_BY_KEY = new Map(LANES.map((l) => [l.key, l]));
export const LANE_BY_SLUG = new Map(LANES.map((l) => [l.slug, l]));
export const LANE_BODIES = new Set(LANES.map((l) => l.body));
export const laneOfRow = (r: BudgetRow) => LANE_BY_KEY.get(laneKey(r)) ?? null;

// ---------------------------------------------------------------------------
// crContext (D4): every ₹ beside its denominator and its comparison
// ---------------------------------------------------------------------------

const GSDP = new Map<string, number | null>(STATE_ECONOMY.map((s) => [s.stateCode, (s as unknown as { gsdpCr?: number | null }).gsdpCr ?? null]));
const toFyLabel = (y: string | null | undefined) => {
  if (!y) return null;
  let m = y.match(/^(\d{4})-(\d{2})$/); if (m) return y;
  m = y.match(/^FY ?(\d{2})$/i); if (m) return fyLabel(2000 + Number(m[1]) - 1);
  m = y.match(/^FY ?(\d{4})$/i); if (m) return fyLabel(Number(m[1]) - 1);
  return y;
};
/** The one FY the repository's GSDP series names (F18). */
export const GSDP_FY: string | null = (() => {
  const by = new Map<string, number>();
  for (const s of STATE_ECONOMY as unknown as { gsdpYear?: string | null }[]) if (s.gsdpYear) by.set(s.gsdpYear, (by.get(s.gsdpYear) ?? 0) + 1);
  return toFyLabel([...by.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null);
})();
export const gsdpOf = (st: string) => GSDP.get(st) ?? null;

function parentOf(r: BudgetRow): BudgetRow | null {
  if (r.payer !== 'union') return null;
  if (r.head === MOD_ALL_DEMANDS || (r.body === MHA && r.head.includes(WHOLE_DEMAND))) return null;
  const no = demandNo(r.head);
  const peers = rowsAt(r.fy, r.stage);
  if (isDefence(r) && isDemandLevel(r)) return peers.find((x) => x.head === MOD_ALL_DEMANDS) ?? null;
  if (!no) return null;
  const title = demandTitle(r.head);
  const cands = peers.filter((x) => x !== r && demandNo(x.head) === no && demandTitle(x.head) === title && (isDemandLevel(x) || x.head.includes(WHOLE_DEMAND)));
  if (!cands.length) return null;
  return cands.find((x) => x.component === r.component) ?? cands.find((x) => x.component === 'total') ?? (cands.length === 1 ? cands[0] : null);
}

export interface CrContext { denom: string; compare: string; parent: BudgetRow | null; share: number | null }
export function crContext(r: BudgetRow): CrContext {
  let denom: string;
  let parent: BudgetRow | null = null;
  let share: number | null = null;
  if (r.component === 'grant-to-states') denom = 'no denominator published for this line';
  else if (r.payer !== 'union') {
    const g = gsdpOf(r.payer);
    if (r.head === STATE_SERIES_HEAD && g != null && r.fy === GSDP_FY) { share = pct(r.cr, g); denom = `${share}% of GSDP ${GSDP_FY} (reported series), computed here`; }
    else denom = 'no same-year denominator in this register (S3)';
  } else if (r.head === MOD_ALL_DEMANDS || (r.body === MHA && r.head.includes(WHOLE_DEMAND))) denom = 'no denominator published for this line';
  else {
    parent = parentOf(r);
    if (parent && parent.cr > 0) { share = pct(r.cr, parent.cr); denom = `₹${fmtCr(r.cr)} of ₹${fmtCr(parent.cr)} cr, ${share}% of the published ${stripDemand(parent.head)}, computed here`; }
    else denom = `no published total for this line's demand in FY${r.fy}`;
  }
  const pf = prevFy(r.fy);
  const prev = BUDGETS.find((x) => x.payer === r.payer && x.body === r.body && x.component === r.component && x.stage === r.stage && x.fy === pf
    && (r.payer === 'union' ? laneKey(x) === laneKey(r) : x.head === r.head));
  // A recorded zero keeps its words even as a comparison (D25).
  const compare = prev ? `FY${pf} ${r.stage}: ${prev.cr === 0 ? ZERO_WORDS : `₹${fmtCr(prev.cr)} cr`}` : `no ${r.stage} row for FY${pf}`;
  return { denom, compare, parent, share };
}
/** U13: a converted RBI row names the unit its source printed, in the same element as its ₹. */
export const lakhLine = (r: BudgetRow) => ((r.note ?? '').startsWith(LAKH_NOTE) ? `as published: ${fmtCr(round2(r.cr * 100))} ₹ lakh; shown here in ₹ crore` : null);
export const crWords = (r: BudgetRow) => (r.cr === 0 ? ZERO_WORDS : `₹${fmtCr(r.cr)} cr`);

/** U12: the pasteable citation for one budget row; the deep link is absolute and built at copy time. */
export function rowCitation(r: BudgetRow, href: string): string {
  const c = crContext(r);
  const lakh = lakhLine(r);
  return [
    labelOf(r.body), r.head, `₹${fmtCr(r.cr)} cr (${r.stage}, FY${r.fy})`, ...(lakh ? [lakh] : []), c.denom, c.compare, rowTier(r), r.note ?? 'no note',
    ...(r.srcs.length ? r.srcs.map(([l, u]) => `${l} ${u}`) : ['no source in file']),
    `ICIP ${href}, read to ${ASOF}`,
  ].join(' — ');
}

// ---------------------------------------------------------------------------
// States: the Police head, GSDP and strength (§5.1.6)
// ---------------------------------------------------------------------------

/** The 36 map units, north to south by label anchor, ties by code — the order of every 36-row surface. */
export const UNITS: StateCode[] = [...STATES].sort((a, b) => a.cy - b.cy || cmp(a.id, b.id)).map((s) => s.id);
export const STATE_NAME = new Map<string, string>(STATES.map((s) => [s.id, s.name]));
export const stateName = (st: string) => STATE_NAME.get(st) ?? st;
export const UNITS_ALPHA = [...UNITS].sort((a, b) => stateName(a).localeCompare(stateName(b)));

export const STATE_SERIES = STATE_ROWS.filter((r) => r.head === STATE_SERIES_HEAD);
export interface StatePair { key: string; fy: string; stage: BudgetStage; states: number }
export const STATE_PAIRS: StatePair[] = uniq(STATE_SERIES.map((r) => `${r.fy}:${r.stage}`)).map((key) => {
  const [fy, stage] = key.split(':');
  return { key, fy, stage: stage as BudgetStage, states: new Set(STATE_SERIES.filter((r) => r.fy === fy && r.stage === stage).map((r) => r.payer)).size };
}).sort((a, b) => cmp(a.fy, b.fy) || STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage));
export type SpendMetric = 'gsdp' | 'cr' | 'percap';
export const S3 = false; // no FORCE_DENOMINATORS export in this build; the per-person metric waits for it
export const pairDrawable = (p: StatePair, m: SpendMetric) => (m === 'gsdp' ? p.fy === GSDP_FY : true);
export function defaultStatePair(m: SpendMetric): StatePair | null {
  const pairs = STATE_PAIRS.filter((p) => pairDrawable(p, m));
  return [...pairs].sort((a, b) => b.states - a.states || STAGE_RANK[a.stage] - STAGE_RANK[b.stage] || cmp(b.fy, a.fy))[0] ?? null;
}
export type SpendClass = 'value' | 'union-funded' | 'no-row' | 'no-denominator' | 'hidden';
export interface SpendUnit { st: StateCode; cls: SpendClass; value: number | null; row: BudgetRow | null; hiddenBy: string | null }
export function stateSpend(pair: StatePair | null, m: SpendMetric, visible: (r: BudgetRow) => boolean, hiddenWord: string | null): Map<StateCode, SpendUnit> {
  const out = new Map<StateCode, SpendUnit>();
  for (const st of UNITS) {
    if (st === 'dl') { out.set(st, { st, cls: 'union-funded', value: null, row: null, hiddenBy: null }); continue; }
    const row = pair ? STATE_SERIES.find((r) => r.payer === st && r.fy === pair.fy && r.stage === pair.stage) ?? null : null;
    if (!row) { out.set(st, { st, cls: 'no-row', value: null, row: null, hiddenBy: null }); continue; }
    if (!visible(row)) { out.set(st, { st, cls: 'hidden', value: null, row, hiddenBy: hiddenWord }); continue; }
    if (m === 'gsdp') {
      const g = gsdpOf(st);
      if (g == null || row.fy !== GSDP_FY) { out.set(st, { st, cls: 'no-denominator', value: null, row, hiddenBy: null }); continue; }
      out.set(st, { st, cls: 'value', value: (row.cr / g) * 100, row, hiddenBy: null });
    } else out.set(st, { st, cls: 'value', value: row.cr, row, hiddenBy: null });
  }
  return out;
}
/** Quantile edges pooled over every drawable value with no filter applied, frozen (§8.2-13). */
function quantileEdges(values: number[], k = 5): number[] {
  const s = [...values].filter(finite).sort((a, b) => a - b);
  if (!s.length) return [];
  const edges = [s[0]];
  for (let i = 1; i < k; i++) edges.push(s[Math.min(s.length - 1, Math.floor((i * s.length) / k))]);
  edges.push(last(s)!);
  return edges;
}
export const SPEND_BINS: Record<'gsdp' | 'cr', number[]> = {
  gsdp: quantileEdges(STATE_SERIES.filter((r) => r.fy === GSDP_FY && gsdpOf(r.payer) != null).map((r) => (r.cr / gsdpOf(r.payer)!) * 100)),
  cr: quantileEdges(STATE_SERIES.map((r) => r.cr)),
};
export const binOf = (v: number, edges: number[]) => {
  for (let i = 1; i < edges.length - 1; i++) if (v < edges[i]) return i - 1;
  return Math.max(0, edges.length - 2);
};

export const STRENGTH_ST = STRENGTH.filter((r) => r.st);
export const STRENGTH_YEARS = uniq(STRENGTH_ST.map((r) => r.year)).sort((a, b) => a - b);
export const DEFAULT_SY: number | null = [...STRENGTH_YEARS].sort((a, b) =>
  STRENGTH_ST.filter((r) => r.year === b && r.perLakh != null).length - STRENGTH_ST.filter((r) => r.year === a && r.perLakh != null).length || b - a)[0] ?? null;
export type StrengthClass = 'value' | 'counts-only' | 'no-row';
export interface StrengthUnit { st: StateCode; cls: StrengthClass; rows: StrengthRow[]; perLakh: number | null }
export function stateStrength(sy: number | null): Map<StateCode, StrengthUnit> {
  const out = new Map<StateCode, StrengthUnit>();
  for (const st of UNITS) {
    const rows = sy == null ? [] : STRENGTH_ST.filter((r) => r.st === st && r.year === sy);
    const v = rows.find((r) => r.perLakh != null);
    out.set(st, { st, cls: !rows.length ? 'no-row' : v ? 'value' : 'counts-only', rows, perLakh: v?.perLakh ?? null });
  }
  return out;
}
export const STRENGTH_BINS = quantileEdges(STRENGTH_ST.map((r) => r.perLakh).filter(finite));
export const isDerivedStrength = (r: StrengthRow) => /DERIVED/.test(r.note ?? '');
export const derivedSentence = (note: string | null) => (note ?? '').split(/(?<=\.)\s+/).find((s) => s.includes('DERIVED'))?.trim() ?? null;

// ---------------------------------------------------------------------------
// Cities and the footprint
// ---------------------------------------------------------------------------

export const COMMISSIONERATES = [...FOOTPRINT.filter((r) => r.kind === 'commissionerate')]
  .sort((a, b) => UNITS.indexOf(a.st) - UNITS.indexOf(b.st) || cmp(a.city, b.city));
const STATE_SERIES_BODIES = new Set(STATE_SERIES.map((r) => r.body));
/** Every city police body other than Delhi Police: the commissionerates and any `-police` id that is not a state's (SG-RF2). */
export const CITY_BODIES = new Set<string>([
  ...COMMISSIONERATES.map((r) => r.body),
  ...[...FORCE_NODE.keys(), ...OTHER_NODE.keys()].filter((id) => /-police$/.test(id) && id !== DELHI_POLICE && !STATE_SERIES_BODIES.has(id)),
]);
export const strengthOfBody = (body: string) => STRENGTH.filter((r) => r.body === body).sort((a, b) => a.year - b.year);

/** The eleven declared kinds, read from the type the generator checks against, plus any kind a row carries. */
const DECLARED_KINDS: FootprintKind[] = ['cantonment', 'dpsu-plant', 'drdo-lab', 'command-hq', 'capf-hq', 'commissionerate', 'prison', 'forensic-lab', 'training', 'ordnance', 'other'];
export const KINDS: FootprintKind[] = uniq([...DECLARED_KINDS, ...FOOTPRINT.map((r) => r.kind)]);
export const KIND_COUNT = new Map(KINDS.map((k) => [k, FOOTPRINT.filter((r) => r.kind === k).length]));
export const EMPTY_KINDS = KINDS.filter((k) => !KIND_COUNT.get(k));
export const kindWord = (k: string) => k.replace(/-/g, ' ');
/** A void or gap that names why a kind has no row, verbatim (prison, ordnance). */
export const kindReason = (k: FootprintKind): string | null => {
  const re = k === 'prison' ? /prison|jail/i : new RegExp(k, 'i');
  return VOIDS.find((v) => re.test(v.what))?.what ?? null;
};
export const FP_STATES = uniq(FOOTPRINT.map((r) => r.st));
export const FP_CITIES = uniq(FOOTPRINT.map((r) => r.city));
export const FP_DATED = FOOTPRINT.filter((r) => r.since !== null).length;
export const PLACES_ORDER = (rows: FootprintRow[]) => [...rows].sort((a, b) => UNITS.indexOf(a.st) - UNITS.indexOf(b.st) || cmp(a.city, b.city) || cmp(a.label, b.label));

// ---------------------------------------------------------------------------
// Grants to states (Q8): the head verbatim; the recipient is not a field (S2 absent)
// ---------------------------------------------------------------------------

export const GRANT_ROWS = [...UNION_ROWS.filter((r) => r.component === 'grant-to-states')].sort((a, b) => cmp(a.head, b.head) || cmp(a.fy, b.fy) || STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage));
export const GRANT_FYS = uniq(GRANT_ROWS.filter((r) => /ASUMP|modernisation/i.test(r.head)).map((r) => r.fy)).sort();
export const grantStageWord = (r: BudgetRow) => (/— Allocation$/.test(r.head) ? 'allocation' : /— Released$/.test(r.head) ? 'released' : r.stage);

// ---------------------------------------------------------------------------
// Edges: responses, roles, awards, vendors, cases
// ---------------------------------------------------------------------------

export const EDGE_BY_ID = new Map<string, GEdge>(EDGES.filter((e) => e.id).map((e) => [e.id!, e]));
export const fileOf = (e: GEdge) => (e.id ? DOMAIN[e.id] ?? e.id.split(':')[0] : 'unknown file');
export const responsesTo = (id: string | undefined) => (id ? EDGES.filter((e) => e.pred === 'contra' && e.t === `claim:${id}`) : []);
export const isAuditContra = (e: GEdge) => /:audit-contra$/.test(e.id ?? '') || e.lab === 'denial found in audit';
export const AUDIT_CONTRAS = EDGES.filter((e) => e.pred === 'contra' && isAuditContra(e));
export interface ChainItem { edge: GEdge; depth: number; parent: GEdge }
/** A claim's answers, then the answers to those, to depth 3 (U27). */
export function responseChain(id: string | undefined, depth = 1, parent?: GEdge): ChainItem[] {
  if (!id || depth > 3) return [];
  const p = parent ?? EDGE_BY_ID.get(id);
  const out: ChainItem[] = [];
  for (const r of responsesTo(id)) { out.push({ edge: r, depth, parent: p! }); out.push(...responseChain(r.id, depth + 1, r)); }
  return out;
}
export const responderWords = (r: GEdge) => (isAuditContra(r) ? `the audit (recorded on ${labelOf(r.s)})` : labelOf(r.s));
export const ALLEGED = EDGES.filter((e) => e.tier === 'alleged' && e.pred !== 'contra');
export const ANSWERED = ALLEGED.filter((e) => responsesTo(e.id).length > 0);
export const EMPTY_SRCS = EDGES.filter((e) => !(e.srcs?.length));

export const ROLE_EDGES = EDGES.filter((e) => e.pred === 'role');
export interface RoleWindow { s: string; t: string; from: string | null; to: string | null; records: GEdge[] }
export const ROLE_WINDOWS: RoleWindow[] = (() => {
  const m = new Map<string, RoleWindow>();
  for (const e of ROLE_EDGES) {
    const k = `${e.s}|${e.t}|${e.from ?? ''}|${e.to ?? ''}`;
    if (!m.has(k)) m.set(k, { s: e.s, t: e.t, from: e.from ?? null, to: e.to ?? null, records: [] });
    m.get(k)!.records.push(e);
  }
  return [...m.values()].sort((a, b) => cmp(a.t, b.t) || cmp(a.from ?? '', b.from ?? ''));
})();
/** Every office a role record names: Defence and Home first, then the rest by label (every window is drawn, D29). */
export const OFFICES = (() => {
  const targets = new Set(ROLE_EDGES.map((e) => e.t));
  return [MOD, MHA, ...[...targets].filter((t) => t !== MOD && t !== MHA).sort((a, b) => cmp(labelOf(a), labelOf(b)))];
})();
export const OPEN_ENDED_OFFICE = ROLE_WINDOWS.filter((w) => !w.to && (w.t === MOD || w.t === MHA)).length;
/** Who held an office on a date, at the record's precision (the finance three-block rule). */
export function officeOn(date: string | null | undefined, office: string) {
  if (!date) return null;
  return ROLE_WINDOWS.filter((w) => w.t === office && w.from && w.from.slice(0, date.length) <= date && (!w.to || date <= w.to.slice(0, date.length) || w.to.slice(0, date.length) >= date.slice(0, w.to.length)));
}
export const partyText = (e: GEdge) => {
  const m = `${e.lab ?? ''} ${e.d ?? ''}`.match(/\b(BJP|INC|Congress|Janata Dal[^,;.)]*|Samata Party|NCP)\b/);
  return m ? m[1] : null;
};

export const AWARDS = EDGES.filter((e) => e.pred === 'award' && e.s === MOD && e.tier !== 'alleged')
  .sort((a, b) => cmp(a.from ?? '9999', b.from ?? '9999') || cmp(a.id ?? '', b.id ?? ''));
export const PRICED = AWARDS.filter((e) => finite(e.a));
export const UNPRICED = AWARDS.filter((e) => !finite(e.a));
export const ALLEGED_AWARDS = EDGES.filter((e) => e.pred === 'award' && e.tier === 'alleged');
export const AWARD_YEARS = uniq(AWARDS.map((e) => yearOf(e.from)).filter((y): y is number => y != null)).sort((a, b) => a - b);
export const AWARD_SPAN = AWARD_YEARS.length ? Array.from({ length: last(AWARD_YEARS)! - AWARD_YEARS[0] + 1 }, (_, i) => AWARD_YEARS[0] + i) : [];
export const EMPTY_AWARD_YEARS = AWARD_SPAN.filter((y) => !AWARD_YEARS.includes(y));

export type VendorClass = 'public' | 'private' | 'unclassified';
export const CLASS_WORDS: Record<VendorClass, string> = { public: 'public sector', private: 'private, JV or foreign', unclassified: 'unclassified' };
/** Interim class = actor family (D33); never from `ty` or `own`. */
export const vendorClass = (id: string): VendorClass => { const f = nodeOf(id)?.fam; return f === 'state' ? 'public' : f === 'capital' ? 'private' : 'unclassified'; };
const isCo = (id: string) => ['company', 'psu'].includes(nodeOf(id)?.ty ?? '');
export const VENDORS: string[] = (() => {
  const base = new Set([...AWARDS.map((e) => e.t), ...ALLEGED_AWARDS.map((e) => e.t)]);
  const out = new Set(base);
  for (const e of EDGES) {
    if (e.pred !== 'analytic') continue;
    if (base.has(e.s) && isCo(e.t)) out.add(e.t);
    if (base.has(e.t) && isCo(e.s)) out.add(e.s);
  }
  for (const r of FOOTPRINT) if ((r.kind === 'dpsu-plant' || r.kind === 'other') && isCo(r.body)) out.add(r.body);
  for (const e of EDGES) {
    if (e.pred === 'bond') out.add(e.s);
    if (e.pred === 'role' && isCo(e.t)) out.add(e.t);
  }
  return [...out].sort((a, b) => cmp(labelOf(a), labelOf(b)));
})();
export const VENDOR_SET = new Set(VENDORS);
export const vendorsOf = (c: VendorClass) => VENDORS.filter((v) => vendorClass(v) === c).sort((a, b) => labelOf(a).localeCompare(labelOf(b)));
export const comparatorEdges = (v: string) => EDGES.filter((e) => e.pred === 'analytic' && ((e.s === v && VENDOR_SET.has(e.t) && e.t !== v) || (e.t === v && VENDOR_SET.has(e.s) && e.s !== v)));
export const comparatorsOf = (v: string) => uniq(comparatorEdges(v).map((e) => (e.s === v ? e.t : e.s)));
export const awardsOf = (v: string) => AWARDS.filter((e) => e.t === v);
export const JOINT_AWARDS = AWARDS.filter((e) => finite(e.a) && VENDORS.filter((v) => `${e.lab ?? ''} ${e.d ?? ''}`.includes(nodeOf(v)?.label ?? '\u0000')).length >= 2);

export const CASES = FORCE_NODES.filter((n) => n.id.startsWith(CASE_PREFIX)).map((n) => n.id).sort();
const CASE_SET = new Set(CASES);
const touching = (c: string) => EDGES.filter((e) => e.s === c || e.t === c);
export const firstRecord = (c: string) => touching(c).map((e) => e.from).filter((x): x is string => !!x).sort()[0] ?? null;
export interface CasePair { a: string; b: string; edges: GEdge[] }
export const CASE_PAIRS: CasePair[] = (() => {
  const seen = new Map<string, CasePair>();
  for (const e of EDGES) {
    if (e.pred !== 'analytic' || !CASE_SET.has(e.s) || !CASE_SET.has(e.t) || e.s === e.t) continue;
    const [a, b] = [e.s, e.t].sort();
    const key = `${a}|${b}`;
    if (!seen.has(key)) seen.set(key, { a, b, edges: [] });
    seen.get(key)!.edges.push(e);
  }
  const t = (d: string | null) => (d ? Date.parse(d) || Infinity : Infinity);
  return [...seen.values()].sort((x, y) => (Math.min(t(firstRecord(x.a)), t(firstRecord(x.b))) - Math.min(t(firstRecord(y.a)), t(firstRecord(y.b)))) || cmp(`${x.a}|${x.b}`, `${y.a}|${y.b}`));
})();
const PAIRED = new Set(CASE_PAIRS.flatMap((p) => [p.a, p.b]));
export const UNPAIRED = CASES.filter((c) => !PAIRED.has(c));
const PAIR_EDGE_IDS = new Set(CASE_PAIRS.flatMap((p) => p.edges.map((e) => e.id)));
/** The edges in a case file: on the case, or on a party joined to it by direct, award or sector, minus answers and pair edges (S11 absent). */
export function caseFile(c: string): GEdge[] {
  const parties = new Set(EDGES.filter((e) => ['direct', 'award', 'sector'].includes(e.pred) && (e.s === c || e.t === c)).map((e) => (e.s === c ? e.t : e.s)));
  return EDGES.filter((e) => e.pred !== 'contra' && !PAIR_EDGE_IDS.has(e.id) && (e.s === c || e.t === c || parties.has(e.s) || parties.has(e.t)))
    .sort((a, b) => cmp(a.from ?? '9999', b.from ?? '9999') || cmp(a.id ?? '', b.id ?? ''));
}
export const pairOf = (c: string) => CASE_PAIRS.find((p) => p.a === c || p.b === c) ?? null;
/** The kind of a case record, from its source node's type and family, never from its text. */
export function recordKind(e: GEdge): 'court' | 'audit' | 'investigation' | 'allegation' | 'decision' | 'response' {
  if (e.pred === 'contra') return 'response';
  if (e.tier === 'alleged') return 'allegation';
  if (e.pred === 'award' || e.pred === 'direct' || e.pred === 'own' || e.pred === 'law') return 'decision';
  const n = nodeOf(e.s);
  if (e.s === 'cag' || /auditor|comptroller/i.test(n?.label ?? '')) return 'audit';
  if (n?.fam === 'enforce' && /court|tribunal|bench|committee|judge|\bsc\b/i.test(`${n.label} ${n.id}`)) return 'court';
  if (e.s === 'sc' || /-hc$|courts?$/.test(e.s)) return 'court';
  if (e.pred === 'enforce') return 'investigation';
  return 'decision';
}

export const BONDS = EDGES.filter((e) => e.pred === 'bond');
export const BOND_DONORS = uniq(BONDS.map((e) => e.s)).sort((a, b) => labelOf(a).localeCompare(labelOf(b)));
export const BOND_PARTIES = uniq(BONDS.map((e) => e.t));
export const bondsOf = (donor: string) => BONDS.filter((e) => e.s === donor).sort((a, b) => cmp(a.from ?? '', b.from ?? ''));
export const BOARD_PAIRS = uniq(ROLE_EDGES.map((e) => e.s)).filter((p) => ROLE_EDGES.some((e) => e.s === p && ['ministry', 'agency'].includes(nodeOf(e.t)?.ty ?? '')) && ROLE_EDGES.some((e) => e.s === p && isCo(e.t)));
export const RULES = EDGES.filter((e) => e.pred === 'law' && DOMAIN[e.id ?? ''] === MONEY_PEOPLE && nodeOf(e.t)?.ty === 'group');
/** Months from office end to board start, at the coarser precision either date gives (D39). */
export function monthsBetween(end: string | null | undefined, start: string | null | undefined): number | null {
  if (!end || !start) return null;
  const y1 = Number(end.slice(0, 4)), y2 = Number(start.slice(0, 4));
  const m1 = end.length >= 7 ? Number(end.slice(5, 7)) : null, m2 = start.length >= 7 ? Number(start.slice(5, 7)) : null;
  if (m1 == null || m2 == null) return (y2 - y1) * 12;
  return (y2 - y1) * 12 + (m2 - m1);
}

export const LAWS = EDGES.filter((e) => e.pred === 'law' && DOMAIN[e.id ?? ''] === PAY_PENSIONS);
export const CONTRACTS = LAWS.filter((e) => !/Pay Commission/.test(nodeOf(e.s)?.label ?? '') || nodeOf(e.t)?.ty !== 'group')
  .sort((a, b) => cmp(a.from ?? '', b.from ?? '') || cmp(a.id ?? '', b.id ?? ''));
const CONTRACT_IDS = new Set(CONTRACTS.map((e) => e.id));
export const PAY_LAWS = LAWS.filter((e) => !CONTRACT_IDS.has(e.id)).sort((a, b) => cmp(a.from ?? '', b.from ?? '') || cmp(a.id ?? '', b.id ?? ''));
export const benefitOf = (id: string | undefined) => FORCE_BENEFITS.find((b) => b.claimId === id) ?? null;
/** D30: ministries and state agencies answer on the left; parties, veterans' bodies and petitioners on the right. */
export const leftResponder = (id: string) => { const n = nodeOf(id); return n?.ty === 'ministry' || (n?.fam === 'state' && ['agency', 'psu', 'mechanism', 'state'].includes(n?.ty ?? '')); };

export const ANALYTIC = EDGES.filter((e) => e.pred === 'analytic');
export const analyticOfDomain = (d: string) => ANALYTIC.filter((e) => DOMAIN[e.id ?? ''] === d);
export const stateRecords = (st: string) => ANALYTIC.filter((e) => DOMAIN[e.id ?? ''] === 'state-police' && nodeOf(e.s)?.st === st);

/** The ₹ figures the register holds as rows or declared fields: budget rows, base-rate figures, award and bond amounts, stated savings. */
const DECLARED_CR = [
  ...BUDGETS.map((r) => r.cr),
  ...BASE_RATES.flatMap((r) => [r.numerator, r.denominator]).filter(finite),
  ...EDGES.filter((e) => (e.pred === 'award' || e.pred === 'bond') && finite(e.a)).map((e) => e.a as number),
  ...FORCE_BENEFITS.map((b) => b.amountCr).filter(finite),
].sort((a, b) => a - b);
/** The budget row that holds a quoted figure, when the register holds it as a row (nearest within ₹0.5 cr). */
const BY_CR = [...BUDGETS].sort((a, b) => a.cr - b.cr);
export function budgetRowFor(v: number): BudgetRow | null {
  let lo = 0, hi = BY_CR.length - 1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (BY_CR[m].cr < v - 0.5) lo = m + 1; else if (BY_CR[m].cr > v + 0.5) hi = m - 1; else return BY_CR[m]; }
  return null;
}
export function isDeclaredCr(v: number) {
  let lo = 0, hi = DECLARED_CR.length - 1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (DECLARED_CR[m] < v - 0.5) lo = m + 1; else if (DECLARED_CR[m] > v + 0.5) hi = m - 1; else return true; }
  return false;
}

// ---------------------------------------------------------------------------
// Base rates and the other discipline sections
// ---------------------------------------------------------------------------

const isInt = (x: unknown) => finite(x) && Number.isInteger(x);
/** U19: a share only when both figures are integers and the part is not larger than the whole. */
export function baseRateForm(r: BaseRateRow): 'share' | 'two-figures' | 'null' {
  if (r.numerator == null || r.denominator == null) return 'null';
  return isInt(r.numerator) && isInt(r.denominator) && r.numerator <= r.denominator ? 'share' : 'two-figures';
}
export const baseRatesOf = (d: string) => BASE_RATES.filter((r) => r.domain === d);
export const symmetryOf = (d: string) => SYMMETRY.find((s) => s.domain === d)?.text ?? null;
export const voidsOf = (ds: string[]): Void[] => VOIDS.filter((v) => ds.includes(v.domain));
export const gapsOf = (ds: string[]): FleetText[] => GAPS.filter((g) => ds.includes(g.domain));
export const narrativesOf = (ds: string[]): Narrative[] => NARRATIVES.filter((n) => ds.includes(n.domain));

// ---------------------------------------------------------------------------
// The graph: the module's edges, an unresolved endpoint drops its edge (D52)
// ---------------------------------------------------------------------------

export const UNRESOLVED = EDGES.filter((e) => !resolves(e.s) || (!String(e.t).startsWith('claim:') && !resolves(e.t)));
export const SPLIT_IDS = (() => { const m = new Map<string, number>(); for (const n of FORCE_NODES) m.set(n.label, (m.get(n.label) ?? 0) + 1); return [...m.values()].filter((k) => k > 1).length; })();
export const FAM_SPLITS = uniq(FORCE_NODES.map((n) => n.ty)).filter((ty) => new Set(FORCE_NODES.filter((n) => n.ty === ty).map((n) => n.fam)).size > 1);
/** Edges the status line counts under a tier set: an answer is drawn whenever its claim is (finance D35). */
export function drawnEdges(tiers: Set<Tier>) {
  return EDGES.filter((x) => resolves(x.s) && (String(x.t).startsWith('claim:') ? true : resolves(x.t)))
    .filter((x) => tiers.has(x.tier) || (x.pred === 'contra' && tiers.has(EDGE_BY_ID.get(String(x.t).replace(/^claim:/, ''))?.tier as Tier)));
}
export const GRAPH_NODES = (): GNode[] => {
  const ids = new Set<string>();
  for (const e of EDGES) { if (resolves(e.s)) ids.add(e.s); if (resolves(e.t)) ids.add(e.t); }
  for (const n of FORCE_NODES) ids.add(n.id);
  return [...ids].map((id) => nodeOf(id)!).filter(Boolean);
};
export const GRAPH_EDGES = (): GEdge[] => EDGES.filter((e) => resolves(e.s) && resolves(e.t));
export const UNDATED_EDGES = EDGES.filter((e) => !e.from).length;

// ---------------------------------------------------------------------------
// Derived gaps (§5.5.3): each printed only while its condition holds
// ---------------------------------------------------------------------------

export function derivedGaps(): { lens: Lens | 'all'; text: string }[] {
  const out: { lens: Lens | 'all'; text: string }[] = [];
  const cells = new Map<string, BudgetRow[]>();
  for (const r of UNION_ROWS) { const k = `${r.body}|${r.component}|${r.fy}|${r.stage}`; if (!cells.has(k)) cells.set(k, []); cells.get(k)!.push(r); }
  const nested = [...cells.values()].filter((v) => v.length > 1).length;
  out.push({ lens: 'budgets', text: `Demand hierarchy is not a field: ${nested} of ${cells.size} Union cells hold a demand and its own lines; the demand level is selected by the head's printed form` });
  const be = defenceStack(DEFAULT_STAGE).filter((c) => !c.missing && c.published);
  out.push({ lens: 'budgets', text: `The Ministry of Defence's published total differs from the sum of its demand lines in ${be.filter((c) => c.recon === 'differs').length} of ${be.length} years where both exist; the stack marks each` });
  out.push({ lens: 'budgets', text: `${FY_AXIS.filter((fy) => !publishedTotal(fy, DEFAULT_STAGE)).length} of ${FY_AXIS.length} financial years have no published Ministry of Defence all-demand total in this register` });
  const act = uniq(UNION_ROWS.filter((r) => r.stage === 'actual').map((r) => r.fy)).sort();
  const re = uniq(UNION_ROWS.filter((r) => r.stage === 'RE').map((r) => r.fy));
  if (act.length) out.push({ lens: 'budgets', text: `Union actuals in this register begin in FY${act[0]}; actual spend is recorded for ${act.length} of ${FY_AXIS.length} FYs, RE for ${re.length}` });
  const pb = payBreaks(DEFAULT_STAGE);
  if (pb.length) out.push({ lens: 'budgets', text: `Pay lines change composition in ${pb.map((b) => `FY${b.fy}`).join(', ')}; no pay trend is drawn across a change` });
  out.push({ lens: 'budgets', text: `Grants to states name their recipient in the line's text only; ${GRANT_ROWS.length} rows are not placed on any map` });
  out.push({ lens: 'budgets', text: 'No population series: per-person spending is not drawn; a 2011 Census base would re-rank states' });
  out.push({ lens: 'budgets', text: `The spend map's denominator is a secondary GSDP series for one FY; ${UNITS.filter((u) => gsdpOf(u) == null).length} of 36 units have none` });
  out.push({ lens: 'all', text: 'Base-rate years and kinds are in words, not fields' });
  out.push({ lens: 'all', text: 'Budget, strength and footprint tiers are read from the reported: note prefix' });
  const derived = STRENGTH.filter(isDerivedStrength).length;
  if (derived) out.push({ lens: 'budgets', text: `${derived} strength rows give absolute counts derived by the research from a ratio` });
  const commBodies = new Set(COMMISSIONERATES.map((c) => c.body));
  if (!STRENGTH.some((s) => commBodies.has(s.body))) out.push({ lens: 'all', text: `${COMMISSIONERATES.filter((c) => !STRENGTH.some((s) => s.body === c.body)).length} commissionerates have no strength row` });
  out.push({ lens: 'budgets', text: 'No budget row for prisons, fire services, home guards, civil defence or forensic laboratories' });
  const noState = UNITS.filter((u) => !STATE_SERIES.some((r) => r.payer === u));
  const noStr = UNITS.filter((u) => !STRENGTH_ST.some((r) => r.st === u));
  const noFp = UNITS.filter((u) => !FOOTPRINT.some((r) => r.st === u));
  out.push({ lens: 'all', text: `${noState.length} of 36 map units have no Police-head row: ${noState.map(stateName).join(', ') || 'none'}; ${noStr.length} have no strength row; ${noFp.length} have no installation` });
  if (EMPTY_KINDS.length) out.push({ lens: 'footprint', text: `${EMPTY_KINDS.length} declared installation kinds have no row: ${EMPTY_KINDS.map(kindWord).join(', ')}` });
  out.push({ lens: 'footprint', text: `Installations have no coordinates; ${FOOTPRINT.filter((r) => r.since === null).length} of ${FOOTPRINT.length} carry no date` });
  out.push({ lens: 'procurement', text: 'Vendor class is not a field; vendors are grouped by actor family' });
  out.push({ lens: 'procurement', text: `${UNPRICED.length} named contracts have no ₹; ${JOINT_AWARDS.length} are joint totals not split by vendor` });
  out.push({ lens: 'procurement', text: 'DAC approvals name no vendor and no value: approvals by vendor class cannot be drawn' });
  out.push({ lens: 'budgets', text: `Outcome rates by state exist only in research prose (${ANALYTIC.filter((e) => DOMAIN[e.id ?? ''] === 'state-police').length} records); no per-state outcome surface is drawn` });
  out.push({ lens: 'procurement', text: `${CASES.filter((c) => !caseFile(c).some((e) => e.pred === 'award')).length} of ${CASES.length} case files have no decision record joined` });
  if (UNPAIRED.length) out.push({ lens: 'procurement', text: `${UNPAIRED.length} case(s) have no recorded control pairing` });
  const enf = EDGES.filter((e) => e.pred === 'enforce');
  out.push({ lens: 'procurement', text: `${enf.filter((e) => !responsesTo(e.id).length).length} of ${enf.length} court, audit and investigation records carry no recorded response` });
  if (EMPTY_SRCS.length) out.push({ lens: 'all', text: `${EMPTY_SRCS.length} records have no source in the file` });
  if (SPLIT_IDS) out.push({ lens: 'all', text: `${SPLIT_IDS} entities appear under two ids and are not merged by name` });
  if (FAM_SPLITS.length) out.push({ lens: 'all', text: `${FAM_SPLITS.length} entity types carry more than one actor family across the research files (${FAM_SPLITS.join(', ')}); their hue in the graph is inconsistent and means nothing` });
  return out;
}

// ---------------------------------------------------------------------------
// Filters (§3.4): parsed from the URL; an unknown value falls back and is named
// ---------------------------------------------------------------------------

export const PAGE_PARAMS = ['lens', 'payer', 'st', 'fy', 'stage', 'comp', 'sfy', 'm', 'sy', 'kind', 'body', 'cell', 'vendor', 'case', 'rec', 'sel', 'tier', 'find', 'view', 'tp'] as const;
/** Every FY a filter may name: the budget axis and the span of the dated records. */
const RECORD_YEARS = EDGES.map((e) => yearOf(e.from)).filter((y): y is number => y != null);
const FY_MIN = Math.min(...(FY_AXIS.length ? [fyStart(FY_AXIS[0])] : []), ...(RECORD_YEARS.length ? [Math.min(...RECORD_YEARS) - 1] : []));
const FY_MAX = Math.max(...(FY_AXIS.length ? [fyStart(last(FY_AXIS)!)] : []), ...(RECORD_YEARS.length ? [Math.max(...RECORD_YEARS)] : []));
export const FY_DOMAIN: string[] = Number.isFinite(FY_MIN) && Number.isFinite(FY_MAX) ? Array.from({ length: FY_MAX - FY_MIN + 1 }, (_, i) => fyLabel(FY_MIN + i)) : [];
const FY_DOMAIN_SET = new Set(FY_DOMAIN);

export interface Filters {
  lens: Lens;
  payer: 'union' | 'states' | null;
  st: StateCode | null;
  fyFrom: string | null;
  fyTo: string | null;
  stage: BudgetStage;
  stageSet: boolean;
  comp: Set<BudgetComponent>;
  compSet: boolean;
  m: SpendMetric;
  mAsked: string | null;
  pair: StatePair | null;
  sy: number | null;
  kind: Set<FootprintKind>;
  kindSet: boolean;
  body: string | null;
  cell: string | null;
  vendor: string | null;
  case: string | null;
  rec: string | null;
  sel: string | null;
  tiers: Set<Tier>;
  tierSet: boolean;
  find: string;
  view: 'table' | null;
  tp: number;
  unknown: string[];
}
const STATE_CODES = new Set<string>(UNITS);
export function parseFilters(p: URLSearchParams): Filters {
  const unknown: string[] = [];
  const lensRaw = p.get('lens');
  const lens: Lens = lensRaw && (LENSES as string[]).includes(lensRaw) ? (lensRaw as Lens) : 'budgets';
  if (lensRaw && lens !== lensRaw) unknown.push('lens');
  const payerRaw = p.get('payer');
  const payer = payerRaw === 'union' || payerRaw === 'states' ? payerRaw : null;
  if (payerRaw && !payer) unknown.push('payer');
  const stRaw = p.get('st');
  const st = stRaw && STATE_CODES.has(stRaw) ? (stRaw as StateCode) : null;
  if (stRaw && !st) unknown.push('st');
  const fyRaw = p.get('fy');
  let fyFrom: string | null = null, fyTo: string | null = null;
  if (fyRaw) {
    const [a, b] = fyRaw.split('..');
    const to = b ?? a;
    if (FY_DOMAIN_SET.has(a) && FY_DOMAIN_SET.has(to)) { fyFrom = a <= to ? a : to; fyTo = a <= to ? to : a; } else unknown.push('fy');
  }
  const stageRaw = p.get('stage');
  const stage = stageRaw && (STAGES as string[]).includes(stageRaw) ? (stageRaw as BudgetStage) : DEFAULT_STAGE;
  if (stageRaw && stage !== stageRaw) unknown.push('stage');
  const compRaw = p.get('comp');
  let comp = new Set<BudgetComponent>(COMPONENTS);
  let compSet = false;
  if (compRaw != null) {
    const parts = compRaw === 'none' ? [] : compRaw.split(',').filter(Boolean);
    if (parts.every((c) => (COMPONENTS as string[]).includes(c))) { comp = new Set(parts as BudgetComponent[]); compSet = true; } else unknown.push('comp');
  }
  const mRaw = p.get('m');
  let m: SpendMetric = S3 ? 'percap' : 'gsdp';
  if (mRaw === 'cr' || mRaw === 'gsdp') m = mRaw;
  else if (mRaw === 'percap') m = S3 ? 'percap' : 'gsdp';
  else if (mRaw) unknown.push('m');
  const sfyRaw = p.get('sfy');
  let pair = defaultStatePair(m);
  if (sfyRaw) {
    const hit = STATE_PAIRS.find((x) => x.key === sfyRaw);
    if (hit && pairDrawable(hit, m)) pair = hit; else unknown.push('sfy');
  }
  const syRaw = p.get('sy');
  let sy = DEFAULT_SY;
  if (syRaw) { const y = Number(syRaw); if (STRENGTH_YEARS.includes(y)) sy = y; else unknown.push('sy'); }
  const kindRaw = p.get('kind');
  let kind = new Set<FootprintKind>(KINDS);
  let kindSet = false;
  if (kindRaw) {
    const parts = kindRaw.split(',').filter(Boolean);
    if (parts.length && parts.every((k) => (KINDS as string[]).includes(k))) { kind = new Set(parts as FootprintKind[]); kindSet = true; } else unknown.push('kind');
  }
  const bodyRaw = p.get('body');
  const body = bodyRaw && LANE_BODIES.has(bodyRaw) ? bodyRaw : null;
  if (bodyRaw && !body) unknown.push('body');
  const tierRaw = p.get('tier');
  let tiers = new Set<Tier>(TIER_LIST);
  let tierSet = false;
  if (tierRaw != null) {
    const parts = tierRaw === 'none' ? [] : tierRaw.split(',').filter(Boolean);
    if (parts.every((t) => (TIER_LIST as string[]).includes(t))) { tiers = new Set(parts as Tier[]); tierSet = true; } else unknown.push('tier');
  }
  const viewRaw = p.get('view');
  const view = viewRaw === 'table' ? 'table' : null;
  if (viewRaw && !view) unknown.push('view');
  const tpRaw = p.get('tp');
  const tp = tpRaw && /^\d+$/.test(tpRaw) && Number(tpRaw) >= 1 ? Number(tpRaw) : 1;
  if (tpRaw && tp === 1 && tpRaw !== '1') unknown.push('tp');
  const cellRaw = p.get('cell');
  const cell = cellRaw && parseCell(cellRaw) ? cellRaw : null;
  if (cellRaw && !cell) unknown.push('cell');
  const caseRaw = p.get('case');
  const kase = caseRaw && CASES.includes(caseRaw) ? caseRaw : null;
  if (caseRaw && !kase) unknown.push('case');
  return {
    lens, payer, st, fyFrom, fyTo, stage, stageSet: !!stageRaw && stage === stageRaw, comp, compSet, m, mAsked: mRaw, pair, sy, kind, kindSet,
    body, cell, vendor: p.get('vendor'), case: kase, rec: p.get('rec'), sel: p.get('sel'), tiers, tierSet, find: p.get('find') ?? '', view, tp, unknown,
  };
}
export const cellParam = (lane: Lane, fy: string) => `${lane.slug}@${fy}`;
export function parseCell(v: string): { lane: Lane; fy: string } | null {
  const at = v.lastIndexOf('@');
  if (at < 0) return null;
  const lane = LANE_BY_SLUG.get(v.slice(0, at));
  const fy = v.slice(at + 1);
  return lane && FY_AXIS.includes(fy) ? { lane, fy } : null;
}
export const fyIn = (f: Filters, fy: string) => !f.fyFrom || (fy >= f.fyFrom && fy <= f.fyTo!);
/** A dated record falls in the FY range when its date lies between 1 April of the first FY and 31 March after the last. */
export function dateInFy(f: Filters, date: string | null | undefined): boolean {
  if (!f.fyFrom) return true;
  if (!date) return false;
  const lo = `${fyStart(f.fyFrom)}-04-01`;
  const hi = `${fyStart(f.fyTo!) + 1}-03-31`;
  const y = date.slice(0, 4);
  if (date.length === 4) return y >= lo.slice(0, 4) && y <= hi.slice(0, 4);
  return date.slice(0, 10) >= lo.slice(0, date.length) && date.slice(0, 10) <= hi.slice(0, Math.min(10, date.length));
}
/** A series row passes the budget filters (payer, state, FY, stage is not a filter on rows, component, tier). */
export function budgetPass(f: Filters, r: BudgetRow, opts: { stage?: boolean; comp?: boolean } = {}) {
  if (f.payer === 'union' && r.payer !== 'union') return false;
  if (f.payer === 'states' && r.payer === 'union') return false;
  if (f.st && r.payer !== 'union' && r.payer !== f.st) return false;
  if (!fyIn(f, r.fy)) return false;
  if (opts.stage && r.stage !== f.stage) return false;
  if (opts.comp !== false && !f.comp.has(r.component)) return false;
  if (!f.tiers.has(rowTier(r))) return false;
  return true;
}
export const edgePass = (f: Filters, e: GEdge) => f.tiers.has(e.tier) || (e.pred === 'contra' && f.tiers.has(EDGE_BY_ID.get(String(e.t).replace(/^claim:/, ''))?.tier as Tier));

/** The lens population before and after the filters (the strip's {N} → {k}). */
export function lensPopulation(f: Filters): { n: number; k: number; unit: string } {
  if (f.lens === 'budgets') return { n: BUDGETS.length, k: BUDGETS.filter((r) => budgetPass(f, r)).length, unit: 'rows' };
  if (f.lens === 'footprint') return { n: FOOTPRINT.length, k: FOOTPRINT.filter((r) => f.kind.has(r.kind) && (!f.st || r.st === f.st) && f.tiers.has(rowTier(r))).length, unit: 'installations' };
  return { n: EDGES.length, k: EDGES.filter((e) => edgePass(f, e) && dateInFy(f, e.from)).length, unit: 'records' };
}

// ---------------------------------------------------------------------------
// TSV (U16): security's own header, finance's cell rule
// ---------------------------------------------------------------------------

export interface TsvMeta { table: string; population: string; rows: number; url: string; lens: Lens; filters: string; slice?: string | null; amounts?: string | null }
const cell = (v: string | number | null | undefined) => (v == null ? '' : String(v).replace(/[\t\r\n]+/g, ' ').trim());
export function tsv(meta: TsvMeta, header: string[], rows: (string | number | null | undefined)[][]): string {
  const head = [
    `# table: ${meta.table} — ${meta.population}`,
    `# rows: ${meta.rows}`,
    `# url: ${meta.url}`,
    `# lens: ${LENS_LABEL[meta.lens]} · filters: ${meta.filters || 'none'}`,
    `# force ${RUN} asOf ${ASOF}`,
    ...(meta.slice ? [meta.slice] : []),
    ...(meta.amounts ? [`# amounts: ₹ crore, nominal, as published; not deflated; stage ${meta.amounts}`] : []),
  ];
  return [...head, header.join('\t'), ...rows.map((r) => r.map(cell).join('\t'))].join('\n') + '\n';
}
export const tsvName = (lens: Lens, twin: string) => `security-${lens}-${slugify(twin)}-${ASOF}-${RUN}.tsv`;

export type { BudgetRow, StrengthRow, FootprintRow, BudgetStage, BudgetComponent, FootprintKind };
