/**
 * /energy — the power map's data layer.
 *
 * Imports ONLY compiled modules: the generated fleet module (which is the quarantine
 * boundary's output, never research/raw/energy directly), the Atlas subgraph and the
 * company register for hydration, and the index lists. Everything below is a
 * module-scope constant or a pure function of the parsed URL state, so the page can
 * restate nothing by hand and every number on it moves when the data does.
 *
 * Sorting always breaks ties on id with code-unit comparison (`cmp`), exactly as the
 * generator does, so a diff or a screenshot reproduces.
 */

import {
  ENERGY_NODES,
  ENERGY_EDGES,
  ENERGY_EDGE_DOMAIN,
  ENERGY_BENEFITS,
  ENERGY_VOIDS,
  ENERGY_NARRATIVES,
  ENERGY_BASE_RATES,
  ENERGY_SYMMETRY,
  ENERGY_GAPS,
  ENERGY_IDENTITY,
  ENERGY_META,
} from '../graph/energy.generated';
import { NODES as ATLAS_NODES } from '../graph/data';
import { COMPANIES, type Company } from './companies';
import { GROUPS } from './conglomerates';
import {
  INDEX_CONSTITUENTS,
  INDEX_KEYS as RAW_INDEX_KEYS,
  INDEX_LABEL,
  INDEX_SOURCES,
  INDICES_AS_OF,
  membershipOf as rawMembershipOf,
  type IndexKey,
} from './indices';
import { TIER_ORDER, type GEdge, type GNode, type NodeFamily, type Tier } from '../graph/schema';
import type { BenefitRow, NarrativeStatus, Void } from '../graph/fleet';
import { shapeClassOf, type ShapeClass } from '../components/viz/ForceGraph';

export {
  ENERGY_VOIDS,
  ENERGY_NARRATIVES,
  ENERGY_BASE_RATES,
  ENERGY_SYMMETRY,
  ENERGY_GAPS,
  ENERGY_IDENTITY,
  ENERGY_META,
  ENERGY_BENEFITS,
};

/** Code-unit comparison, the generator's own order. `localeCompare` varies by machine. */
export const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export const EMPTY = ENERGY_META.empty;
export const RUN_ID = ENERGY_META.runId;

// ---------------------------------------------------------------------------
// Sweeps — the twelve files the fleet was dispatched to write (spec §3.2)
// ---------------------------------------------------------------------------

export interface Sweep {
  slug: string;
  label: string;
  row: 'sector' | 'lens';
}

/**
 * Declared here, not derived: these are the dispatch list, so a sweep that never
 * reported still has a chip — hatched, "not yet researched" — rather than silently
 * vanishing. A file whose domain is not on the list is appended to the lens row.
 */
const SECTOR_SWEEPS: [string, string][] = [
  ['coal', 'Coal'],
  ['mines', 'Mines & minerals'],
  ['oilgas', 'Oil & gas'],
  ['hydro', 'Hydro & dams'],
  ['solarwind', 'Solar, wind & storage'],
  ['nuclear', 'Nuclear'],
  ['grid', 'Grid & discoms'],
];
const LENS_SWEEPS: [string, string][] = [
  ['money', 'Money trail'],
  ['people', 'Promoters & families'],
  ['enforce', 'Regulators & courts'],
  ['states', 'Offices: union & state'],
  ['literature', 'Documents & narratives'],
];

const FILES = ENERGY_META.files ?? [];
const DECLARED = new Set([...SECTOR_SWEEPS, ...LENS_SWEEPS].map(([s]) => s));
const UNDECLARED = [...new Set(FILES.map((f) => f.domain))].filter((d) => !DECLARED.has(d)).sort(cmp);

export const SWEEPS: Sweep[] = [
  ...SECTOR_SWEEPS.map(([slug, label]) => ({ slug, label, row: 'sector' as const })),
  ...LENS_SWEEPS.map(([slug, label]) => ({ slug, label, row: 'lens' as const })),
  ...UNDECLARED.map((slug) => ({ slug, label: slug, row: 'lens' as const })),
];
/** The planned total — the "of 12" every coverage line is measured against. */
export const PLANNED = SECTOR_SWEEPS.length + LENS_SWEEPS.length;
export const SWEEP_LABEL = new Map(SWEEPS.map((s) => [s.slug, s.label]));
export const sweepLabel = (slug: string) => SWEEP_LABEL.get(slug) ?? slug;
export const RESEARCHED = new Set(FILES.map((f) => f.domain));
export const ABSENT = SWEEPS.filter((s) => !RESEARCHED.has(s.slug));
const FILE_OF = new Map(FILES.map((f) => [f.domain, f]));
export const fileAsOf = (sweep: string) => FILE_OF.get(sweep)?.asOf ?? null;

/** Oldest and newest file dates. Never `ENERGY_META.asOf` alone — that is the newest. */
export const ASOF = (() => {
  const ds = FILES.map((f) => f.asOf).filter((d): d is string => !!d).sort(cmp);
  return { oldest: ds[0] ?? null, newest: ds[ds.length - 1] ?? null };
})();
export const ASOF_TEXT = ASOF.oldest
  ? ASOF.newest && ASOF.newest !== ASOF.oldest
    ? `${ASOF.oldest} – ${ASOF.newest}`
    : ASOF.oldest
  : '—';

/** The `companies.ts` sector strings the benchmark calls "energy". Printed wherever used. */
export const ENERGY_SECTORS = ['Energy', 'Utilities', 'Metals & Mining'];
export const ENERGY_SECTOR_RULE = 'Energy, Utilities, Metals & Mining in companies.ts';

// ---------------------------------------------------------------------------
// Nodes — the fleet's, hydrated from the platform where a claim reaches outside it
// ---------------------------------------------------------------------------

const COMPANY_BY_ID = new Map(COMPANIES.map((c) => [c.id, c]));
export const companyOf = (id: string): Company | null => COMPANY_BY_ID.get(id) ?? null;
const GROUP_IDS = new Set(GROUPS.map((g) => g.id));
export const isConglomerate = (id: string) => GROUP_IDS.has(id);

function companyNode(c: Company): GNode {
  return {
    id: c.id,
    label: c.shortName || c.name,
    sub: c.sector,
    ty: 'company',
    fam: 'capital',
    st: c.stateCode,
    sz: 1,
    resolved: true,
    srcs: c.srcs,
  };
}

/**
 * Hydration order: the fleet's own node, then the Atlas subgraph, then the company
 * register. That is the order the acceptance fixtures use, so "drawable" means the
 * same set in the test and on the page. A claim whose endpoint hydrates nowhere is an
 * orphan: counted and listed, never drawn, never silently dropped.
 */
const HYDRATE = new Map<string, GNode>();
for (const n of ATLAS_NODES) if (!HYDRATE.has(n.id)) HYDRATE.set(n.id, n);
for (const c of COMPANIES) if (!HYDRATE.has(c.id)) HYDRATE.set(c.id, companyNode(c));

const FLEET_NODES = new Map(ENERGY_NODES.map((n) => [n.id, n]));
const hydrates = (id: string) => FLEET_NODES.has(id) || HYDRATE.has(id);

const isResponse = (e: GEdge) => e.pred === 'contra' && e.t.startsWith('claim:');

/** Every edge, keyed by claim id. */
export const EDGE_BY_ID = new Map(ENERGY_EDGES.filter((e) => e.id).map((e) => [e.id as string, e]));

/** Responses that name the claim they answer, keyed by that claim's id. Not drawn as edges. */
export const ANSWERS = new Map<string, GEdge[]>();
for (const e of ENERGY_EDGES) {
  if (!isResponse(e)) continue;
  const id = e.t.slice('claim:'.length);
  (ANSWERS.get(id) ?? ANSWERS.set(id, []).get(id)!).push(e);
}

/** Facts that have been replaced. Retained and addressable, never drawn. */
export const SUPERSEDED: GEdge[] = ENERGY_EDGES.filter((e) => !!e.supersededBy).sort((a, b) => cmp(a.id ?? '', b.id ?? ''));
/** Claims with an endpoint the platform does not hold. Listed, not drawn. */
export const ORPHANS: GEdge[] = ENERGY_EDGES.filter(
  (e) => !isResponse(e) && !e.supersededBy && !(hydrates(e.s) && hydrates(e.t)),
).sort((a, b) => cmp(a.id ?? '', b.id ?? ''));
/** Everything else: the claims the canvas can draw. Node↔node denials included. */
export const DRAWABLE: GEdge[] = ENERGY_EDGES.filter(
  (e) => !isResponse(e) && !e.supersededBy && hydrates(e.s) && hydrates(e.t),
).sort((a, b) => cmp(a.id ?? '', b.id ?? ''));
export const D = DRAWABLE.length;
export const DRAWABLE_IDS = new Set(DRAWABLE.map((e) => e.id as string));

export const NODES = new Map<string, GNode>();
for (const n of ENERGY_NODES) NODES.set(n.id, n);
for (const e of DRAWABLE) {
  for (const id of [e.s, e.t]) if (!NODES.has(id) && HYDRATE.has(id)) NODES.set(id, HYDRATE.get(id)!);
}
export const NODE_LIST: GNode[] = [...NODES.values()].sort((a, b) => cmp(a.id, b.id));
export const labelOf = (id: string) => NODES.get(id)?.label ?? HYDRATE.get(id)?.label ?? id;

/**
 * Node↔node denials answer the claims that sit on the same pair — the only join that
 * says something about a claim. The looser "shares an entity" join is not used here.
 */
const PAIR_CONTRAS = new Map<string, GEdge[]>();
const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
for (const e of DRAWABLE) {
  if (e.pred !== 'contra') continue;
  const k = pairKey(e.s, e.t);
  (PAIR_CONTRAS.get(k) ?? PAIR_CONTRAS.set(k, []).get(k)!).push(e);
}

/** Every recorded response to a claim: explicit claim-id joins first, then same-pair denials. */
export function responsesOf(e: GEdge): GEdge[] {
  if (e.pred === 'contra') return [];
  const named = ANSWERS.get(e.id ?? '') ?? [];
  const pair = PAIR_CONTRAS.get(pairKey(e.s, e.t)) ?? [];
  return [...named, ...pair.filter((c) => !named.includes(c))];
}

/** "3 responses recorded" — the accessible-name form, kept plural-invariant (see the page's notes). */
export function responsePhrase(e: GEdge): string {
  const n = responsesOf(e).length;
  if (n > 0) return `${n} responses recorded`;
  return e.tier === 'alleged' ? 'no response recorded — listed in Gaps' : 'no response recorded';
}

export const responseCount = (n: number) => `${n} ${n === 1 ? 'response' : 'responses'}`;

// ---------------------------------------------------------------------------
// Sweep and benefit joins
// ---------------------------------------------------------------------------

/**
 * Claim → the research sweep it was recorded in. The generator's export first; the id
 * prefix only as a fallback when it names a file domain; otherwise "unassigned", and a
 * derived gap counts them.
 */
export function SWEEP_OF(id: string): string {
  const d = (ENERGY_EDGE_DOMAIN as Record<string, string>)[id];
  if (d) return d;
  const prefix = id.split(':')[0];
  return RESEARCHED.has(prefix) ? prefix : 'unassigned';
}

const BENEFIT_BY_CLAIM = new Map<string, BenefitRow>(ENERGY_BENEFITS.map((b) => [b.claimId, b]));
export const BENEFIT_OF = (id: string): BenefitRow | null => BENEFIT_BY_CLAIM.get(id) ?? null;

// ---------------------------------------------------------------------------
// Index membership — joined by company id only
// ---------------------------------------------------------------------------

export const INDEX_KEYS: IndexKey[] = RAW_INDEX_KEYS.filter((k) => INDEX_CONSTITUENTS[k].length > 0);
export const INDICES_LOADED = INDEX_KEYS.length > 0;
export const INDEX_ASOF = INDICES_AS_OF;
export { INDEX_SOURCES, INDEX_LABEL };
export type { IndexKey };
export const indexLabel = (k: string) => INDEX_LABEL[k as IndexKey] ?? k;

export function membershipOf(id: string): IndexKey[] {
  return rawMembershipOf(id).filter((k) => INDEX_KEYS.includes(k));
}

/** Membership in words, for the hover card, the node's accessible name and the cards. */
export function membershipWords(id: string): string {
  if (!INDICES_LOADED) return 'index lists not loaded in this build';
  const m = membershipOf(id);
  if (m.length) {
    const parts = INDEX_KEYS.map((k) => (m.includes(k) ? indexLabel(k) : `not ${indexLabel(k)}`));
    return `${parts.join(' · ')} — lists as of ${INDEX_ASOF}`;
  }
  if (id.startsWith('co:') && !COMPANY_BY_ID.has(id) && !FLEET_NODES.has(id)) return 'not in platform company dataset';
  return 'not an index constituent';
}

const CONSTITUENT_IDS = new Map<IndexKey, Set<string>>(
  INDEX_KEYS.map((k) => [k, new Set(INDEX_CONSTITUENTS[k].map((c) => c.existingId).filter((x): x is string => !!x))]),
);
export const constituentIdsOf = (k: string) => CONSTITUENT_IDS.get(k as IndexKey) ?? new Set<string>();

/** Groups with an `own` edge into the company, from the drawable claims. Id join only. */
const VIA_GROUP = new Map<string, { group: string; claimId: string; tier: Tier }[]>();
for (const e of DRAWABLE) {
  if (e.pred !== 'own') continue;
  const g = NODES.get(e.s);
  if (!g || g.ty !== 'group') continue;
  (VIA_GROUP.get(e.t) ?? VIA_GROUP.set(e.t, []).get(e.t)!).push({ group: e.s, claimId: e.id ?? '', tier: e.tier });
}
export const viaGroupOf = (coId: string) => VIA_GROUP.get(coId) ?? [];

export interface ConstituentRow {
  key: string;
  id: string | null;
  symbol: string;
  name: string;
  sector: string | null;
  member: Record<string, boolean>;
}

/**
 * One row per distinct constituent across every index key; a constituent the
 * platform has no record for is keyed by its name and stays in, hatched.
 */
export const CONSTITUENTS: ConstituentRow[] = (() => {
  const rows = new Map<string, ConstituentRow>();
  for (const k of INDEX_KEYS) {
    for (const c of INDEX_CONSTITUENTS[k]) {
      const key = c.existingId ?? `name:${c.name}`;
      const co = c.existingId ? COMPANY_BY_ID.get(c.existingId) : undefined;
      const row =
        rows.get(key) ??
        rows
          .set(key, {
            key,
            id: c.existingId,
            symbol: co?.nse ?? co?.bse ?? c.nse ?? c.bse ?? c.name,
            name: co?.name ?? c.name,
            sector: co?.sector ?? c.sector ?? null,
            member: Object.fromEntries(INDEX_KEYS.map((x) => [x, false])),
          })
          .get(key)!;
      row.member[k] = true;
    }
  }
  return [...rows.values()].sort((a, b) => cmp(a.symbol, b.symbol) || cmp(a.key, b.key));
})();

// ---------------------------------------------------------------------------
// The URL state and the filter pipeline
// ---------------------------------------------------------------------------

export const ALL_FAMILIES: NodeFamily[] = ['state', 'capital', 'recipient', 'instrument', 'enforce', 'market'];
export const ALL_SHAPES: ShapeClass[] = ['company', 'institution', 'recipient', 'rule', 'person'];
export const PRESENT_FAMILIES = ALL_FAMILIES.filter((f) => NODE_LIST.some((n) => n.fam === f));
export const PRESENT_PREDS = [...new Set(DRAWABLE.map((e) => e.pred))].sort(cmp);

export interface EnergyFilter {
  dom: Set<string>;
  q: string;
  tiers: Set<Tier>;
  fams: Set<NodeFamily>;
  preds: Set<string>;
  types: Set<ShapeClass>;
  min: number;
  from: string;
  to: string;
  idx: string | null;
  via: boolean;
  focus: string | null;
  hops: number;
}

export const DEFAULT_FILTER: EnergyFilter = {
  dom: new Set(),
  q: '',
  tiers: new Set(TIER_ORDER),
  fams: new Set(PRESENT_FAMILIES),
  preds: new Set(),
  types: new Set(ALL_SHAPES),
  min: 0,
  from: '',
  to: '',
  idx: null,
  via: false,
  focus: null,
  hops: 1,
};

const lc = (s: string | null | undefined) => (s ?? '').toLowerCase();

/** The text a claim search reads: label, statement, sources, beneficiary. Endpoint labels match through their nodes. */
function claimText(e: GEdge): string {
  const b = BENEFIT_OF(e.id ?? '');
  return [e.lab, e.d, ...(e.srcs ?? []).map((s) => s[0]), b?.who, b?.how, b ? labelOf(b.who) : null].map(lc).join('\n');
}
const CLAIM_TEXT = new Map(DRAWABLE.map((e) => [e, claimText(e)]));

const nodeMatches = (n: GNode, q: string) =>
  lc(n.label).includes(q) || lc(n.sub).includes(q) || (n.al ?? []).some((a) => lc(a).includes(q));

export function edgePasses(e: GEdge, f: EnergyFilter): boolean {
  if (!f.tiers.has(e.tier)) return false;
  if (f.preds.size && !f.preds.has(e.pred)) return false;
  if (f.min > 0 && (e.a ?? 0) < f.min) return false;
  // An undated claim cannot be placed inside or outside a window, so it passes both
  // tests — and the status line says how many were kept that way.
  if (f.from && e.to && e.to < f.from) return false;
  if (f.to && e.from && e.from > f.to) return false;
  return true;
}

export interface Visible {
  edges: GEdge[];
  nodes: GNode[];
  nodeIds: Set<string>;
  /** Claims matching the search, before node filters — for the status line. */
  searchHits: number;
}

/** Page-level scope: sweep and index. Applied before the graph's own filters. */
function scoped(f: Pick<EnergyFilter, 'dom' | 'idx' | 'via'>): GEdge[] {
  let es = DRAWABLE;
  if (f.dom.size) es = es.filter((e) => f.dom.has(SWEEP_OF(e.id ?? '')));
  if (f.idx) {
    const ids = constituentIdsOf(f.idx);
    const groups = new Set<string>();
    if (f.via) for (const id of ids) for (const g of viaGroupOf(id)) groups.add(g.group);
    es = es.filter((e) => ids.has(e.s) || ids.has(e.t) || groups.has(e.s) || groups.has(e.t));
  }
  return es;
}

/**
 * The visible set: exactly what the canvas draws, the twin lists and the strip counts.
 * One function, so the three cannot drift.
 */
export function visibleSet(f: EnergyFilter, sel: string | null = null): Visible {
  const q = f.q.trim().toLowerCase();
  const pool = scoped(f);
  const nodeOk = (id: string) => {
    const n = NODES.get(id);
    return !!n && f.fams.has(n.fam) && f.types.has(shapeClassOf(n.ty));
  };
  // Search reads claims as well as entities: an endpoint of a matching claim is kept.
  const qNodes = new Set<string>();
  let searchHits = 0;
  if (q) {
    for (const n of NODE_LIST) if (nodeMatches(n, q)) qNodes.add(n.id);
    for (const e of pool) {
      if (CLAIM_TEXT.get(e)?.includes(q)) {
        searchHits++;
        qNodes.add(e.s);
        qNodes.add(e.t);
      }
    }
  }
  const keepNode = (id: string) => nodeOk(id) && (!q || qNodes.has(id));
  let edges = pool.filter((e) => keepNode(e.s) && keepNode(e.t) && edgePasses(e, f));
  // The response-visibility rule (spec §6): a node↔node denial is visible whenever a
  // claim it answers is, whatever the tier, relationship, amount, window or sweep
  // filters say — otherwise `tier=alleged` would keep the allegation and hide its
  // answer. It shares the claim's endpoints, so the node filters have already passed it.
  const inView = new Set(edges);
  let added = false;
  for (const e of edges) {
    if (e.pred === 'contra') continue;
    for (const c of PAIR_CONTRAS.get(pairKey(e.s, e.t)) ?? []) {
      if (!inView.has(c)) {
        inView.add(c);
        added = true;
      }
    }
  }
  if (added) edges = DRAWABLE.filter((e) => inView.has(e));
  const nodeIds = new Set<string>();
  for (const e of edges) {
    nodeIds.add(e.s);
    nodeIds.add(e.t);
  }
  if (q) for (const id of qNodes) if (keepNode(id)) nodeIds.add(id);
  // The entity the reader asked about is drawn even when nothing joins it in view.
  for (const id of [sel, f.focus]) if (id && keepNode(id)) nodeIds.add(id);

  if (f.focus && nodeIds.has(f.focus)) {
    const adj = new Map<string, string[]>();
    for (const e of edges) {
      (adj.get(e.s) ?? adj.set(e.s, []).get(e.s)!).push(e.t);
      (adj.get(e.t) ?? adj.set(e.t, []).get(e.t)!).push(e.s);
    }
    const dist = new Map([[f.focus, 0]]);
    const queue = [f.focus];
    while (queue.length) {
      const x = queue.shift()!;
      const d = dist.get(x)!;
      if (d >= f.hops) continue;
      for (const y of adj.get(x) ?? []) if (!dist.has(y)) { dist.set(y, d + 1); queue.push(y); }
    }
    for (const id of [...nodeIds]) if (!dist.has(id) && id !== sel) nodeIds.delete(id);
    edges = edges.filter((e) => dist.has(e.s) && dist.has(e.t));
  }
  const nodes = NODE_LIST.filter((n) => nodeIds.has(n.id));
  return { edges, nodes, nodeIds, searchHits };
}

/** How many claims survive with the page-level index scope removed — the rail control's "from". */
export const countWithout = (f: EnergyFilter, patch: Partial<EnergyFilter>, sel: string | null = null) =>
  visibleSet({ ...f, ...patch }, sel).edges.length;

/**
 * The single active filter that removed the most claims, found by leaving each one
 * out in turn. Offered as the one-click way out of an empty canvas.
 */
export function mostRemovingFilter(f: EnergyFilter): { key: string; label: string; params: Record<string, null>; count: number } | null {
  const cands: { key: string; label: string; params: Record<string, null>; patch: Partial<EnergyFilter> }[] = [];
  if (f.dom.size) cands.push({ key: 'dom', label: 'the sweep filter', params: { dom: null }, patch: { dom: new Set() } });
  if (f.q) cands.push({ key: 'q', label: 'the search', params: { q: null }, patch: { q: '' } });
  if (f.tiers.size < TIER_ORDER.length) cands.push({ key: 'tier', label: 'the tier filter', params: { tier: null }, patch: { tiers: new Set(TIER_ORDER) } });
  if (f.fams.size < PRESENT_FAMILIES.length) cands.push({ key: 'fam', label: 'the family filter', params: { fam: null }, patch: { fams: new Set(PRESENT_FAMILIES) } });
  if (f.preds.size) cands.push({ key: 'pred', label: 'the relationship filter', params: { pred: null }, patch: { preds: new Set() } });
  if (f.types.size < ALL_SHAPES.length) cands.push({ key: 'ty', label: 'the entity-type filter', params: { ty: null }, patch: { types: new Set(ALL_SHAPES) } });
  if (f.min > 0) cands.push({ key: 'min', label: 'the ₹ minimum', params: { min: null }, patch: { min: 0 } });
  if (f.from || f.to) cands.push({ key: 'window', label: 'the date window', params: { from: null, to: null } as Record<string, null>, patch: { from: '', to: '' } });
  if (f.idx) cands.push({ key: 'idx', label: 'the index filter', params: { idx: null, via: null } as Record<string, null>, patch: { idx: null, via: false } });
  if (f.focus) cands.push({ key: 'focus', label: 'the focus', params: { focus: null, hops: null } as Record<string, null>, patch: { focus: null } });
  let best: { key: string; label: string; params: Record<string, null>; count: number } | null = null;
  for (const c of cands) {
    const count = visibleSet({ ...f, ...c.patch }).edges.length;
    if (!best || count > best.count) best = { key: c.key, label: c.label, params: c.params, count };
  }
  return best;
}

/** Active filters in words — the twin caption, the CSV header and the empty canvas. */
export function filtersInWords(f: EnergyFilter): string {
  const out: string[] = [];
  if (f.dom.size) out.push(`sweep: ${[...f.dom].map(sweepLabel).join(', ')}`);
  if (f.q) out.push(`search "${f.q}"`);
  if (f.tiers.size < TIER_ORDER.length) out.push(`tier: ${TIER_ORDER.filter((t) => f.tiers.has(t)).join(', ') || 'none'}`);
  if (f.fams.size < PRESENT_FAMILIES.length) out.push(`family: ${PRESENT_FAMILIES.filter((x) => f.fams.has(x)).join(', ') || 'none'}`);
  if (f.preds.size) out.push(`relationship: ${[...f.preds].sort(cmp).join(', ')}`);
  if (f.types.size < ALL_SHAPES.length) out.push(`entity type: ${ALL_SHAPES.filter((x) => f.types.has(x)).join(', ') || 'none'}`);
  if (f.min > 0) out.push(`₹ ≥ ${f.min} cr`);
  if (f.from || f.to) out.push(`window ${f.from || '…'} to ${f.to || '…'}`);
  if (f.idx) out.push(`index: ${f.idx}${f.via ? ' incl. via group' : ''}`);
  if (f.focus) out.push(`focus: ${labelOf(f.focus)}, ${f.hops} ${f.hops === 1 ? 'hop' : 'hops'}`);
  return out.length ? `filters in force: ${out.join('; ')}` : 'unfiltered — no filter in force';
}

// ---------------------------------------------------------------------------
// Voids, office-holders, lanes
// ---------------------------------------------------------------------------

export const voidsIn = (dom: Set<string>): Void[] =>
  ENERGY_VOIDS.filter((v) => !dom.size || dom.has(v.domain)).sort(
    (a, b) => SWEEPS.findIndex((s) => s.slug === a.domain) - SWEEPS.findIndex((s) => s.slug === b.domain) || cmp(a.what, b.what),
  );

/**
 * Institution → its recorded jurisdiction (`central` or a state code), from the optional
 * identity key the energy contract is gaining (spec §0.2 fact 9). Never the node's `st`:
 * that is the registered office, and every union ministry's is Delhi. Empty until the
 * key lands, and every line that depends on it says so rather than falling back.
 */
export const JURISDICTION_OF = new Map<string, string>(
  Object.entries(ENERGY_IDENTITY)
    .map(([id, r]) => [id, r.identity?.jurisdiction ?? null] as const)
    .filter((kv): kv is readonly [string, string] => !!kv[1]),
);

const INSTITUTION_TY = new Set(['ministry', 'agency', 'psu', 'state']);
export const isInstitution = (id: string) => INSTITUTION_TY.has(NODES.get(id)?.ty ?? '');
export const DECISION_PREDS = new Set(['award', 'law', 'enforce', 'pmout', 'csr']);

/** Role claims into an institution: who held it, and when. Undated roles cannot be placed. */
export function rolesInto(inst: string, edges: GEdge[] = DRAWABLE): GEdge[] {
  return edges
    .filter((e) => e.pred === 'role' && e.t === inst && isInstitution(inst))
    .sort((a, b) => cmp(a.from ?? '', b.from ?? '') || cmp(a.id ?? '', b.id ?? ''));
}

/** The office-holders whose dated tenure covers a date. The date test, nothing more. */
export function officeHoldersOn(inst: string, date: string | undefined): GEdge[] {
  if (!date) return [];
  const end = ASOF.oldest ?? '9999-12-31';
  return rolesInto(inst).filter((r) => r.from && r.from <= date && date <= (r.to ?? end));
}

/** The two node types the shape legend calls "rule or mechanism". */
const RULE_TY = new Set(['law', 'mechanism']);

export interface DateTest {
  /** The institutions whose office-holders the date test reads. Empty = issuer not recorded. */
  subjects: string[];
  /** For a rule claim, the rule node; null otherwise. */
  rule: string | null;
  /** Dated role claims covering the claim's date, across every subject. */
  holders: GEdge[];
}

/**
 * Who the date test is run against (spec §5.5). For a `law` claim with a rule endpoint,
 * the issuers: public-power nodes with a recorded edge into the rule — never a guess
 * from the rule's name. Otherwise the institution side of the claim (`s`, or `t` when
 * `s` is a person). One function, so the claim card and the canvas's lit set agree.
 */
export function dateTestOf(e: GEdge): DateTest {
  if (e.pred === 'law') {
    const rule = RULE_TY.has(NODES.get(e.t)?.ty ?? '') ? e.t : RULE_TY.has(NODES.get(e.s)?.ty ?? '') ? e.s : null;
    if (rule) {
      const subjects = [...new Set(DRAWABLE.filter((x) => x.t === rule && NODES.get(x.s)?.fam === 'state').map((x) => x.s))].sort(cmp);
      return { subjects, rule, holders: subjects.flatMap((i) => officeHoldersOn(i, e.from)) };
    }
  }
  const inst = NODES.get(e.s)?.ty === 'person' ? e.t : e.s;
  return { subjects: [inst], rule: null, holders: isInstitution(inst) ? officeHoldersOn(inst, e.from) : [] };
}

/** The research sweeps a node's drawable claims were recorded in, in strip order. */
export function sweepsOf(id: string): string[] {
  const s = new Set(DRAWABLE.filter((e) => e.s === id || e.t === id).map((e) => SWEEP_OF(e.id ?? '')));
  return SWEEPS.map((x) => x.slug).filter((x) => s.has(x));
}

/**
 * Voids whose text or sources name this entity (spec §5.5 D). Voids are prose, so this
 * is a text match — on the id, and on the label and aliases where they are at least
 * four characters and match as whole words — and every place that prints it says so.
 * It lists absences to read; it never joins the entity to anything.
 */
export function voidsNaming(id: string): Void[] {
  const n = NODES.get(id);
  // Void prose says "Coal India", not "Coal India Limited", so the label is also tried
  // without a trailing corporate suffix.
  const bare = n?.label.replace(/\s+(private\s+limited|pvt\.?\s+ltd\.?|limited|ltd\.?)$/i, '');
  const terms = [...new Set([id, n?.label, bare, ...(n?.al ?? [])])].filter((t): t is string => !!t && t.length >= 4);
  if (!terms.length) return [];
  const re = new RegExp(`(^|[^\\p{L}\\p{N}])(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?=$|[^\\p{L}\\p{N}])`, 'iu');
  return ENERGY_VOIDS.filter((v) => re.test([v.what, v.whyItMatters ?? '', ...v.srcs.flat()].join('\n')));
}

export interface Lane {
  id: string;
  label: string;
  fam: NodeFamily;
  spans: { personId: string; label: string; party: string | null; from: string; to: string | null; tier: Tier; claimId: string }[];
}
export interface LaneEvent {
  claimId: string;
  laneId: string;
  date: string;
  tier: Tier;
  label: string;
}

const FAM_ORDER: NodeFamily[] = ['state', 'enforce', 'capital', 'recipient', 'instrument', 'market'];

export function tenureLanes(edges: GEdge[]) {
  const roleEdges = edges.filter((e) => e.pred === 'role' && isInstitution(e.t));
  const laneIds = [...new Set(roleEdges.filter((e) => e.from).map((e) => e.t))];
  const partyOf = (person: string, from: string, to: string | null) => {
    const p = DRAWABLE.find(
      (e) => e.pred === 'role' && e.s === person && NODES.get(e.t)?.ty === 'party' && (!e.from || e.from <= (to ?? '9999')) && (!e.to || e.to >= from),
    );
    return p ? labelOf(p.t) : null;
  };
  const lanes: Lane[] = laneIds
    .map((id) => ({
      id,
      label: labelOf(id),
      fam: NODES.get(id)!.fam,
      spans: roleEdges
        .filter((e) => e.t === id && e.from)
        .sort((a, b) => cmp(a.from!, b.from!) || cmp(a.id ?? '', b.id ?? ''))
        .map((e) => ({ personId: e.s, label: labelOf(e.s), party: partyOf(e.s, e.from!, e.to ?? null), from: e.from!, to: e.to ?? null, tier: e.tier, claimId: e.id ?? '' })),
    }))
    .sort((a, b) => FAM_ORDER.indexOf(a.fam) - FAM_ORDER.indexOf(b.fam) || cmp(a.label, b.label) || cmp(a.id, b.id));
  const laneSet = new Set(laneIds);
  const decisions = edges.filter((e) => DECISION_PREDS.has(e.pred) && isInstitution(e.s));
  const events: LaneEvent[] = decisions
    .filter((e) => e.from && laneSet.has(e.s))
    .map((e) => ({ claimId: e.id ?? '', laneId: e.s, date: e.from!, tier: e.tier, label: e.lab ?? e.pred }))
    .sort((a, b) => cmp(a.date, b.date) || cmp(a.claimId, b.claimId));
  const end = ASOF.oldest ?? '9999-12-31';
  const inTenure = (e: GEdge) =>
    lanes.find((l) => l.id === e.s)?.spans.some((s) => s.from <= e.from! && e.from! <= (s.to ?? end)) ?? false;
  const dated = decisions.filter((e) => e.from);
  const placed = dated.filter(inTenure);
  const noHolder = [...new Set(decisions.map((e) => e.s))].filter((id) => !laneSet.has(id)).map(labelOf).sort(cmp);
  const dates = [...roleEdges.map((e) => e.from), ...decisions.map((e) => e.from)].filter((d): d is string => !!d).sort(cmp);
  return {
    lanes,
    events,
    dated: dated.length,
    placed: placed.length,
    gap: dated.length - placed.length,
    undated: decisions.length - dated.length,
    noHolder,
    range: dates.length ? ([dates[0], end] as [string, string]) : null,
  };
}

// ---------------------------------------------------------------------------
// Sources and gaps
// ---------------------------------------------------------------------------

const PRIMARY = /gov\.in|nic\.in|sci\.gov\.in|sebi\.gov\.in|cag\.gov\.in|cercind|bseindia|nseindia|indiacode|sansad|eci\.gov\.in/i;
export const isPrimary = (url: string) => PRIMARY.test(url);

export interface SourceEntry {
  label: string;
  url: string;
  primary: boolean;
  retrieved: string | null;
  claims: string[];
}

/** Every node and edge source, deduped by URL, in first-citation order by claim id. */
export const SOURCES: SourceEntry[] = (() => {
  const m = new Map<string, SourceEntry>();
  const add = (label: string, url: string, claim: string | null, asOf: string | null) => {
    const hit = m.get(url) ?? m.set(url, { label, url, primary: isPrimary(url), retrieved: asOf, claims: [] }).get(url)!;
    if (claim && !hit.claims.includes(claim)) hit.claims.push(claim);
    if (!hit.retrieved && asOf) hit.retrieved = asOf;
  };
  for (const e of [...ENERGY_EDGES].sort((a, b) => cmp(a.id ?? '', b.id ?? ''))) {
    for (const [label, url] of e.srcs ?? []) add(label, url, e.id ?? null, fileAsOf(SWEEP_OF(e.id ?? '')));
  }
  for (const n of ENERGY_NODES) for (const [label, url] of n.srcs ?? []) add(label, url, null, null);
  return [...m.values()];
})();

export interface DerivedGap {
  what: string;
  why: string;
}

/** Gaps the build itself can see, rendered beside the ones research recorded. */
export const DERIVED_GAPS: DerivedGap[] = (() => {
  const g: DerivedGap[] = [];
  for (const s of ABSENT) g.push({ what: `${s.label} — not yet researched`, why: 'Found by the build: no research file for this sweep in this build.' });
  if (ORPHANS.length)
    g.push({ what: `${ORPHANS.length} claims name an endpoint the platform does not hold, so they are not drawn`, why: 'Found by the build: listed under Orphans below.' });
  const unassigned = DRAWABLE.filter((e) => SWEEP_OF(e.id ?? '') === 'unassigned').length;
  if (unassigned) g.push({ what: `claim sweep not recorded for ${unassigned} claims`, why: 'Found by the build: these claims have no sweep and appear under no chip.' });
  for (const slug of RESEARCHED) {
    if (!ENERGY_SYMMETRY.some((s) => s.domain === slug && s.text.trim()))
      g.push({ what: `No symmetry check recorded by the ${sweepLabel(slug)} sweep`, why: 'Found by the build: the contract makes this mandatory.' });
  }
  const silent = DRAWABLE.filter((e) => e.tier === 'alleged' && responsesOf(e).length === 0);
  for (const e of silent) g.push({ what: `Alleged claim ${e.id} has no recorded response`, why: 'Found by the build: the gate requires one; it should not have shipped.' });
  if (!INDICES_LOADED) g.push({ what: 'Index membership lists are not loaded in this build', why: 'Found by the build: research/raw/indices.json is absent or empty.' });
  for (const c of CONSTITUENTS.filter((r) => !r.id)) {
    const keys = INDEX_KEYS.filter((k) => c.member[k]).join(', ');
    g.push({ what: `${c.name} (${keys}) is not in the company dataset`, why: 'Found by the build: it cannot be joined to any claim.' });
  }
  g.push({ what: 'No share-price series or index weights in the platform', why: 'Found by the build: membership is shown, weight and price reaction cannot be.' });
  for (const slug of RESEARCHED)
    g.push({ what: `coverage not declared by the ${sweepLabel(slug)} sweep: an empty year in it is unsearched, not clean`, why: 'Found by the build: the energy contract has no coverage block yet.' });
  g.push({ what: 'the award × donor population with a date-shuffled control has not been run (HANDOFF priority 1)', why: 'Found by the build: without it the company trail cannot test the quid-pro-quo reading in either direction.' });
  return g;
})();

// ---------------------------------------------------------------------------
// Narratives
// ---------------------------------------------------------------------------

export const LADDER: NarrativeStatus[] = ['established', 'well-supported', 'contested', 'speculative', 'unsupported', 'debunked'];
