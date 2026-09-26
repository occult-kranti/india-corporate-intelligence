import { memo, useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { STATES, STATE_BY_ID, type StateGeo } from '../../data/geo';
import { TIERS, TIER_ORDER, edgeId, type GNode, type GEdge, type Tier, type NodeFamily, type StateCode } from '../../graph/schema';
import { FAMILY_COLOR, FAMILY_LABEL } from './ForceGraph';
import { useCamera, CameraControls, ExpandShell, type Box } from './camera';

/**
 * The geographic network — the map and the graph as one object.
 *
 * A force-directed graph tells you who connects to whom and destroys geography.
 * A choropleth tells you where things are and destroys the connections. This draws
 * the relationships in place, on real boundary geometry.
 *
 * Two honesty problems come with doing that, and both are handled visibly rather
 * than quietly:
 *
 * 1. **Entities are not geocoded.** A mark sits on a golden-angle spiral inside its
 *    state; its position within that state carries no information. Every caption
 *    says so.
 * 2. **Most of the graph has no place at all.** Persons, laws, mechanisms, parties
 *    and sectors are not geographic. Dropping them would silently delete most of
 *    the network; scattering them over the map would invent locations they do not
 *    have. They go into a labelled off-map gutter, and the gutter says what it is.
 *
 * Filtering is two-stage, and both stages are exported so the page's table twin
 * runs the SAME code rather than a lookalike that drifts:
 *
 *   filterGeoEdges  tier · family · predicate · search · amount · year window
 *   scopeGeoEdges   state (registered there + first-degree neighbours) → ego focus
 *
 * On-map placement never depends on the filters, the scope or hover — a mark in a
 * state holds still when you filter, focus, click a state or scrub time. The
 * off-map gutter does NOT: it is repacked from whatever is connected, because a
 * column of every non-geographic entity in the layer is unreadable and a gutter
 * row carries no meaning to preserve.
 */

const MAP_H = 696;
const GUTTER_X = 664;
const VIEW_W = 830;
/** Hoisted: a fresh options literal per render would rebuild the camera's key handler every render. */
const CAM_OPTS = { maxFitK: 3 };

/**
 * Predicates that record a transfer or an award, and so MAY carry a mid-arc
 * direction chevron. Membership is not enough: the data records some of these
 * winner → awarder, some agency → party for ad spend, some from the recipient's
 * side. See `directionOf` — the chevron is drawn only where the endpoint types
 * confirm the recorded orientation.
 */
export const MONEY_PREDS: ReadonlySet<string> = new Set(['bond', 'trust', 'direct', 'pmin', 'pmout', 'csr', 'award']);

/** Structure, our own comparison, or a denial — not a claim anybody could deny. */
const NOT_A_CLAIM: ReadonlySet<string> = new Set(['contra', 'supersede', 'hq', 'listed', 'sector', 'analytic']);
export const isClaim = (e: GEdge) => !NOT_A_CLAIM.has(e.pred);

/**
 * With one date and no end, these are events in that year rather than states of
 * affairs: a bond is bought, an award is made, a denial is issued on a day. A role,
 * a holding or a proceeding with no recorded end is treated as ongoing instead,
 * and the caption counts those, because the data does not establish it.
 */
const POINT_PREDS: ReadonlySet<string> = new Set([...MONEY_PREDS, 'contra']);

const PUBLIC_AWARDER = new Set(['ministry', 'agency', 'psu', 'state']);
const WINNER = new Set(['company', 'shell', 'group', 'psu']);
const CORPORATE = new Set(['company', 'shell', 'group', 'psu']);
/** A person pays out of their own pocket only if they are private capital — a minister announcing a budget is not a payer. */
const payer = (n: GNode) => CORPORATE.has(n.ty) || (n.ty === 'person' && n.fam === 'capital');

/**
 * Which (predicate, source type, target type) combinations confirm that the
 * recorded s → t is payer → payee, or awarding body → winner. Anything outside
 * these gets no chevron and reads "direction not established".
 */
const DIRECTION_OK: Record<string, (s: GNode, t: GNode) => boolean> = {
  award: (s, t) => PUBLIC_AWARDER.has(s.ty) && s.fam !== 'capital' && WINNER.has(t.ty),
  bond: (s, t) => (payer(s) && ['party', 'law', 'mechanism', 'trust'].includes(t.ty)) || (['law', 'mechanism'].includes(s.ty) && t.ty === 'party'),
  trust: (s, t) => (payer(s) && t.ty === 'trust') || (s.ty === 'trust' && t.ty === 'party'),
  direct: (s, t) => payer(s) && t.ty === 'party',
  pmin: (s, t) => (payer(s) || s.ty === 'ministry') && ['fund', 'trust', 'mechanism'].includes(t.ty),
  pmout: (s, t) =>
    ['fund', 'trust', 'mechanism', 'ministry', 'agency', 'psu'].includes(s.ty) &&
    ['company', 'shell', 'group', 'psu', 'ministry', 'agency', 'fund', 'trust'].includes(t.ty) &&
    t.fam !== 'enforce',
  csr: (s, t) => CORPORATE.has(s.ty) && ['sangh', 'fund', 'trust'].includes(t.ty),
};

/**
 * `none` — not a money predicate, so there is no direction of money to show.
 * `unconfirmed` — a money predicate whose endpoint types do not confirm s → t.
 */
export type EdgeDirection = 'transfer' | 'award' | 'unconfirmed' | 'none';

export function directionOf(e: GEdge, byId: Map<string, GNode>): EdgeDirection {
  if (!MONEY_PREDS.has(e.pred)) return 'none';
  const s = byId.get(e.s);
  const t = byId.get(e.t);
  if (!s || !t || !DIRECTION_OK[e.pred]?.(s, t)) return 'unconfirmed';
  return e.pred === 'award' ? 'award' : 'transfer';
}
export const isDirected = (d: EdgeDirection) => d === 'transfer' || d === 'award';

export type GeoMode = 'entities' | 'state-flows';

export interface GeoFilter {
  tiers: Set<Tier>;
  families: Set<NodeFamily>;
  preds: Set<string>;
  query: string;
  minAmount?: number;
  /** Inclusive year window. Undated relationships are never hidden by it. */
  years?: [number, number] | null;
}

/** What the reader has narrowed the view to. Lives in the URL on the page. */
export interface GeoScope {
  /** Ego focus: this entity and everything within `hops` of it. */
  focus?: string | null;
  hops?: number;
  /** Entities registered in this state, plus their first-degree neighbours anywhere. */
  state?: StateCode | null;
  /** A state param the page could not recognise — reported, never silently dropped. */
  unknownState?: string | null;
}

export interface StateFlow {
  key: string;
  from: StateCode;
  to: StateCode;
  amount: number;
  /** Relationships only — denials and fact updates are in `aside`, not counted. */
  count: number;
  tiers: Set<Tier>;
  edges: GEdge[];
  /** Denials (contra) and fact updates (supersede) between the same two states. */
  aside: GEdge[];
  /** Every counted relationship is a transfer or award whose direction the endpoint types confirm. */
  directional: boolean;
}

/** Something the page can show a card for. */
export type GeoInspect = { kind: 'edge'; edge: GEdge } | { kind: 'flow'; flow: StateFlow };

interface Props {
  nodes: GNode[];
  edges: GEdge[];
  filter: GeoFilter;
  mode: GeoMode;
  selected?: string | null;
  onSelect?: (id: string | null) => void;
  /** State fill metric. Absent states render as no-data hatch, never as zero. */
  stateWeight?: Partial<Record<StateCode, number>>;
  height?: number;
  /** Show the off-map gutter for non-geographic entities. */
  showGutter?: boolean;
  scope?: GeoScope;
  /** Present = states are clickable and keyboard-reachable. */
  onStateClick?: (code: StateCode) => void;
  /** Hover/focus (`pin` false) and click/Enter (`pin` true) on an arc or a flow. */
  onInspect?: (item: GeoInspect | null, pin: boolean) => void;
  onClearFocus?: () => void;
  onClearState?: () => void;
  /** Escape, when the map is not maximised. The page decides what it clears. */
  onEscape?: () => void;
}

interface Placed {
  n: GNode;
  x: number;
  y: number;
  r: number;
  offMap: boolean;
}

interface ArcGeom {
  d: string;
  /** Curve midpoint and travel direction there, for the direction chevron. */
  mx: number;
  my: number;
  ang: number;
}

type Hover =
  | { kind: 'node'; id: string }
  | { kind: 'edge'; e: GEdge }
  | { kind: 'flow'; key: string }
  | { kind: 'state'; code: StateCode };

/** Arrow keys and Home/End inside a roving layer. */
const ROVE_STEP: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1, Home: -Infinity, End: Infinity };

const RAMP = ['#232a31', '#2b3b41', '#334c50', '#3d6062', '#4a7573'];
const ARC_INK = 'rgba(232,228,220,0.34)';
const CONTRA_INK = '#c45b5a';
const ACCENT = 'var(--color-accent,#c9a86c)';

/**
 * A quadratic arc that always bulges the same way relative to travel direction, so
 * an A→B edge and a B→A edge separate instead of overprinting.
 */
function arc(x1: number, y1: number, x2: number, y2: number, k = 0.16): string {
  return arcGeom(x1, y1, x2, y2, k).d;
}

function arcGeom(x1: number, y1: number, x2: number, y2: number, k: number): ArcGeom {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const cx = (x1 + x2) / 2 - dy * k;
  const cy = (y1 + y2) / 2 + dx * k;
  // B(½) = ¼P0 + ½C + ¼P2, and B′(½) is parallel to P2 − P0.
  return {
    d: `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`,
    mx: (x1 + 2 * cx + x2) / 4,
    my: (y1 + 2 * cy + y2) / 4,
    ang: (Math.atan2(dy, dx) * 180) / Math.PI,
  };
}

/**
 * Deterministic curvature jitter, keyed on the pair.
 *
 * Delhi is the origin of most arcs in almost every view, because that is where
 * ministries and central agencies are registered. With one fixed curvature they
 * bundle into an unreadable white blob at the anchor. Fanning them apart by a
 * stable per-pair offset keeps them legible without inventing any information —
 * the same pair always gets the same curve, so the picture is reproducible.
 */
function curvatureFor(key: string, base = 0.16): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return base + ((h % 100) / 100 - 0.5) * 0.17;
}

/**
 * Spiral radius for a state's entity cluster.
 *
 * `clearance` is the label-fit budget, which is far too small for a state like
 * Delhi that carries a dozen registered ministries. Where the cluster cannot fit,
 * it is allowed to expand past the boundary rather than pile into one dot — the
 * marks were never geocoded, so overflow costs no accuracy, and an unreadable
 * cluster costs the whole view.
 */
function clusterRadius(geo: StateGeo, count: number): number {
  return Math.max(geo.clearance * 0.72, 3 + Math.sqrt(count) * 2.4);
}

/** Amount → stroke width. sqrt, so area-ish reads as magnitude; capped so ₹20,000 cr does not paint a road. */
function amountWidth(e: GEdge): number {
  return 0.45 + Math.min(2, Math.sqrt(e.a ?? 0) / 34);
}

const pairOf = (e: GEdge) => (e.s < e.t ? `${e.s}|${e.t}` : `${e.t}|${e.s}`);
const crore = (v: number) => `₹${v.toLocaleString('en-IN')} cr`;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// ---------------------------------------------------------------------------
// Time
// ---------------------------------------------------------------------------

/**
 * Year resolution, on purpose. The data mixes "2020", "2023-09" and "2024-06-10";
 * scrubbing by day would pretend the coarse dates are precise.
 */
export function yearOf(iso?: string | null): number | null {
  const m = iso ? /^(\d{4})/.exec(iso) : null;
  return m ? Number(m[1]) : null;
}

export type DateKind = 'undated' | 'point' | 'open' | 'bounded';

/** How an edge's dates are read by the year window. See POINT_PREDS. */
export function dateKind(e: GEdge): DateKind {
  const a = yearOf(e.from);
  const b = yearOf(e.to);
  if (a == null && b == null) return 'undated';
  if (a != null && b != null) return 'bounded';
  if (a != null && POINT_PREDS.has(e.pred)) return 'point';
  return 'open';
}

/**
 * [first year, last year] an edge is true in. null = undated. A single-dated
 * transfer, award or denial is an event in that year; any other missing end is
 * open (infinite), and is counted as such in the caption.
 */
export function edgeYears(e: GEdge): [number, number] | null {
  const a = yearOf(e.from);
  const b = yearOf(e.to);
  if (a == null && b == null) return null;
  if (a != null && b == null && POINT_PREDS.has(e.pred)) return [a, a];
  return [a ?? -Infinity, b ?? Infinity];
}

const outsideYears = (e: GEdge, years: [number, number]) => {
  const w = edgeYears(e);
  return !!w && (w[0] > years[1] || w[1] < years[0]);
};

/** The dated span actually present in a set of edges, or null if nothing is dated. */
export function datedSpan(edges: GEdge[]): [number, number] | null {
  let lo = Infinity;
  let hi = -Infinity;
  for (const e of edges) {
    for (const y of [yearOf(e.from), yearOf(e.to)]) {
      if (y == null) continue;
      if (y < lo) lo = y;
      if (y > hi) hi = y;
    }
  }
  return lo <= hi ? [lo, hi] : null;
}

// ---------------------------------------------------------------------------
// Filtering — exported so the table twin runs the same code
// ---------------------------------------------------------------------------

export interface GeoFiltered {
  edges: GEdge[];
  /**
   * Denials re-admitted because a claim touching one of their entities survived
   * the filters. A filter that shows a claim and hides its denial is not neutral.
   * Counted over the scoped set by `geoViewStats`, not here.
   */
  readmitted: Set<GEdge>;
}

/** Family and search — the hard filters, which remove an entity rather than a relationship. */
export function nodePasses(n: GNode, filter: GeoFilter): boolean {
  if (!filter.families.has(n.fam)) return false;
  const q = filter.query.trim().toLowerCase();
  return !q || `${n.label} ${(n.al ?? []).join(' ')}`.toLowerCase().includes(q);
}

export function filterGeoEdges(nodes: GNode[], edges: GEdge[], filter: GeoFilter): GeoFiltered {
  const q = filter.query.trim().toLowerCase();
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const kept: GEdge[] = [];
  const heldContra: GEdge[] = [];
  const claimEntities = new Set<string>();

  for (const e of edges) {
    const s = byId.get(e.s);
    const t = byId.get(e.t);
    if (!s || !t) continue;
    // Hard filters: they remove the entity, so there is nothing left to answer.
    if (!filter.families.has(s.fam) || !filter.families.has(t.fam)) continue;
    if (q) {
      const hay = `${s.label} ${t.label} ${(s.al ?? []).join(' ')} ${(t.al ?? []).join(' ')}`.toLowerCase();
      if (!hay.includes(q)) continue;
    }
    // Soft filters: a denial failing only these comes back if a claim it may answer is shown.
    let soft = true;
    if (!filter.tiers.has(e.tier)) soft = false;
    if (filter.preds.size && !filter.preds.has(e.pred)) soft = false;
    if (filter.minAmount && (e.a ?? 0) < filter.minAmount) soft = false;
    if (soft && filter.years && outsideYears(e, filter.years)) soft = false;
    if (soft) {
      kept.push(e);
      if (isClaim(e)) {
        claimEntities.add(e.s);
        claimEntities.add(e.t);
      }
    } else if (e.pred === 'contra') {
      heldContra.push(e);
    }
  }
  // The data records who denies what about whom, not which edge a denial answers
  // (only one of the three denials shares its endpoint pair with a claim), so the
  // pairing is by shared entity. It over-admits denials, which is the safe side.
  const readmitted = new Set<GEdge>();
  for (const e of heldContra) {
    if (!claimEntities.has(e.s) && !claimEntities.has(e.t)) continue;
    kept.push(e);
    readmitted.add(e);
  }
  return { edges: kept, readmitted };
}

export interface DenialLinks {
  /** denial → the claims sharing an entity with it, same-pair claims first. */
  claimsOf: Map<GEdge, GEdge[]>;
  /** claim → the denials sharing an entity with it. */
  denialsOf: Map<GEdge, GEdge[]>;
}

/**
 * Pairs denials with claims by shared entity — the same rule the filter uses to
 * re-admit them, so the picture, the width parity and the card cannot disagree.
 */
export function linkDenials(edges: GEdge[]): DenialLinks {
  const claimsOf = new Map<GEdge, GEdge[]>();
  const denialsOf = new Map<GEdge, GEdge[]>();
  const byEntity = new Map<string, GEdge[]>();
  for (const d of edges) {
    if (d.pred !== 'contra') continue;
    for (const id of d.s === d.t ? [d.s] : [d.s, d.t]) {
      if (!byEntity.has(id)) byEntity.set(id, []);
      byEntity.get(id)!.push(d);
    }
  }
  if (!byEntity.size) return { claimsOf, denialsOf };
  for (const e of edges) {
    if (!isClaim(e)) continue;
    const ds = new Set([...(byEntity.get(e.s) ?? []), ...(byEntity.get(e.t) ?? [])]);
    if (!ds.size) continue;
    denialsOf.set(e, [...ds]);
    for (const d of ds) {
      if (!claimsOf.has(d)) claimsOf.set(d, []);
      claimsOf.get(d)!.push(e);
    }
  }
  for (const [d, cs] of claimsOf) {
    const k = pairOf(d);
    cs.sort((a, b) => Number(pairOf(b) === k) - Number(pairOf(a) === k));
  }
  return { claimsOf, denialsOf };
}
export const samePair = (a: GEdge, b: GEdge) => pairOf(a) === pairOf(b);

export interface GeoScoped {
  edges: GEdge[];
  /** Entities inside the scope; null = no scope, everything is in. */
  ids: Set<string> | null;
  /** The focus entity is not in the filtered view, so the focus was not applied. */
  focusMissing: boolean;
  /** Entities actually registered in the state filter (not their neighbours). */
  inState: Set<string> | null;
  hops: number;
}

export function scopeGeoEdges(nodes: GNode[], base: GEdge[], scope?: GeoScope): GeoScoped {
  const hops = Math.min(3, Math.max(1, scope?.hops ?? 1));
  let cur = base;
  let ids: Set<string> | null = null;
  let inState: Set<string> | null = null;
  let focusMissing = false;

  if (scope?.state) {
    const st = new Map(nodes.map((n) => [n.id, n.st]));
    inState = new Set<string>();
    for (const e of base) {
      if (st.get(e.s) === scope.state) inState.add(e.s);
      if (st.get(e.t) === scope.state) inState.add(e.t);
    }
    cur = base.filter((e) => inState!.has(e.s) || inState!.has(e.t));
    ids = new Set(inState);
    for (const e of cur) {
      ids.add(e.s);
      ids.add(e.t);
    }
  }

  if (scope?.focus) {
    const adj = new Map<string, string[]>();
    for (const e of cur) {
      if (!adj.has(e.s)) adj.set(e.s, []);
      if (!adj.has(e.t)) adj.set(e.t, []);
      adj.get(e.s)!.push(e.t);
      adj.get(e.t)!.push(e.s);
    }
    if (!adj.has(scope.focus)) {
      focusMissing = true;
    } else {
      const ball = new Set([scope.focus]);
      let frontier = [scope.focus];
      for (let h = 0; h < hops; h++) {
        const next: string[] = [];
        for (const id of frontier) {
          for (const nb of adj.get(id) ?? []) {
            if (ball.has(nb)) continue;
            ball.add(nb);
            next.push(nb);
          }
        }
        frontier = next;
      }
      cur = cur.filter((e) => ball.has(e.s) && ball.has(e.t));
      ids = ball;
    }
  }
  return { edges: cur, ids, focusMissing, inState, hops };
}

/** What the year window and the denial rule did, counted over what is actually in view. */
export interface GeoViewStats {
  undated: number;
  /** Start date, no end, not an event: treated as ongoing, which the data does not establish. */
  openEnded: number;
  /** Single-dated transfers, awards and denials, read as events in that year. */
  pointEvents: number;
  /** In this scope without the window, and outside it. Re-admitted denials are not counted. */
  hiddenByTime: number;
  denialsKept: number;
}

/**
 * Counted over the SCOPED set. Counting before the state/focus scope reported
 * layer-wide totals as "in view" — about seven times too many in a state view.
 */
export function geoViewStats(
  nodes: GNode[],
  edges: GEdge[],
  filter: GeoFilter,
  scope: GeoScope | undefined,
  filtered: GeoFiltered,
  scoped: GeoScoped,
): GeoViewStats {
  const out: GeoViewStats = { undated: 0, openEnded: 0, pointEvents: 0, hiddenByTime: 0, denialsKept: 0 };
  for (const e of scoped.edges) {
    const k = dateKind(e);
    if (k === 'undated') out.undated++;
    else if (k === 'open') out.openEnded++;
    else if (k === 'point') out.pointEvents++;
    if (filtered.readmitted.has(e)) out.denialsKept++;
  }
  if (filter.years) {
    const years = filter.years;
    const untimed = scopeGeoEdges(nodes, filterGeoEdges(nodes, edges, { ...filter, years: null }).edges, scope).edges;
    const shown = new Set(scoped.edges);
    for (const e of untimed) if (!shown.has(e) && outsideYears(e, years)) out.hiddenByTime++;
  }
  return out;
}

const ASIDE_PREDS: ReadonlySet<string> = new Set(['contra', 'supersede']);

/**
 * State→state aggregation. Exported so the page renders the same thing as a table
 * twin. Denials and fact updates are kept aside rather than counted: a denial is
 * an answer to a relationship, not another relationship, and must not thicken the
 * arc or set its weakest tier.
 */
export function aggregateStateFlows(nodes: GNode[], edges: GEdge[]): StateFlow[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const agg = new Map<string, StateFlow>();
  for (const e of edges) {
    const s = byId.get(e.s)?.st;
    const t = byId.get(e.t)?.st;
    if (!s || !t || s === t) continue;
    const key = `${s}>${t}`;
    if (!agg.has(key)) {
      agg.set(key, { key, from: s, to: t, amount: 0, count: 0, tiers: new Set(), edges: [], aside: [], directional: true });
    }
    const rec = agg.get(key)!;
    if (ASIDE_PREDS.has(e.pred)) {
      rec.aside.push(e);
      continue;
    }
    rec.amount += e.a ?? 0;
    rec.count++;
    rec.tiers.add(e.tier);
    rec.edges.push(e);
    if (!isDirected(directionOf(e, byId))) rec.directional = false;
  }
  for (const f of agg.values()) if (!f.count) f.directional = false;
  return [...agg.values()].sort((a, b) => b.count - a.count || b.amount - a.amount || a.key.localeCompare(b.key));
}

/** Top relationships in a flow by amount; unpriced ones last, in a stable order. */
export function topByAmount(edges: GEdge[], n = 5): GEdge[] {
  return [...edges]
    .sort((a, b) => (b.a ?? -1) - (a.a ?? -1) || a.pred.localeCompare(b.pred) || `${a.s}${a.t}`.localeCompare(`${b.s}${b.t}`))
    .slice(0, n);
}

/** The weakest tier present — an aggregate is only as strong as its weakest member. */
function weakestTier(tiers: Set<Tier>): Tier {
  return [...TIER_ORDER].reverse().find((t) => tiers.has(t)) ?? 'documented';
}

// ---------------------------------------------------------------------------

function GeoNetwork({
  nodes,
  edges,
  filter,
  mode,
  selected = null,
  onSelect,
  stateWeight,
  height = 720,
  showGutter = true,
  scope,
  onStateClick,
  onInspect,
  onClearFocus,
  onClearState,
  onEscape,
}: Props) {
  const uid = useId().replace(/:/g, '');
  const [hover, setHover] = useState<Hover | null>(null);

  // Callbacks go through refs so the memoised layers below never go stale and
  // never need rebuilding because a parent re-created a closure.
  const cb = useRef({ onSelect, onInspect, onStateClick, onEscape });
  cb.current = { onSelect, onInspect, onStateClick, onEscape };

  /**
   * The camera. Shared with ForceGraph, but fitting means something different
   * here: the map's own extent IS the frame, so "fit" resets rather than
   * computing a bounding box — unless a focus or state scope is active, in which
   * case it frames that. Zooming into Delhi is the whole point — a dozen
   * ministries land in a cluster narrower than the state's label.
   */
  const svgRef = useRef<SVGSVGElement>(null);
  const cam = useCamera(svgRef, VIEW_W, MAP_H, CAM_OPTS);
  const expandedRef = useRef(cam.expanded);
  expandedRef.current = cam.expanded;

  /**
   * A pan that starts on a state, arc or mark must not also click it. The camera
   * captures the pointer on its target, so the click still lands there — measure
   * the travel and swallow anything that moved.
   */
  const downAt = useRef<{ x: number; y: number } | null>(null);
  // The camera hands back a fresh svgProps object each render, so a memo over it
  // is a no-op; only the one handler wrapped here is made stable, through a ref.
  const camDown = useRef(cam.svgProps.onPointerDown);
  camDown.current = cam.svgProps.onPointerDown;
  const onPointerDown = useCallback((ev: React.PointerEvent<SVGSVGElement>) => {
    downAt.current = { x: ev.clientX, y: ev.clientY };
    camDown.current(ev);
  }, []);
  const wasDrag = useCallback((ev: React.MouseEvent) => {
    const d = downAt.current;
    return !!d && Math.hypot(ev.clientX - d.x, ev.clientY - d.y) > 4;
  }, []);

  /**
   * Wheel zoom through a native, non-passive listener, as ForceGraph does. React
   * attaches wheel handlers as passive, so the camera's preventDefault logged a
   * console error on every notch and the page scrolled underneath the zoom. The
   * zoom itself is still the camera's own handler.
   */
  const { onWheel: camWheel, ...panHandlers } = cam.svgProps;
  const expanded = cam.expanded;
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const h = (ev: WheelEvent) => camWheel(ev as unknown as React.WheelEvent<SVGSVGElement>);
    svg.addEventListener('wheel', h, { passive: false });
    return () => svg.removeEventListener('wheel', h);
  }, [camWheel, expanded]);

  // ---- data --------------------------------------------------------------

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const filtered = useMemo(() => filterGeoEdges(nodes, edges, filter), [nodes, edges, filter]);
  const scopeArg = useMemo(
    () => ({ focus: scope?.focus, hops: scope?.hops, state: scope?.state }),
    [scope?.focus, scope?.hops, scope?.state],
  );
  const scoped = useMemo(() => scopeGeoEdges(nodes, filtered.edges, scopeArg), [nodes, filtered.edges, scopeArg]);
  const stats = useMemo(
    () => geoViewStats(nodes, edges, filter, scopeArg, filtered, scoped),
    [nodes, edges, filter, scopeArg, filtered, scoped],
  );
  const scopeActive = !!scoped.ids;
  /** Denial ↔ claim pairing over what is in view: width parity and the lit overlay both read it. */
  const links = useMemo(() => linkDenials(scoped.edges), [scoped.edges]);
  const dirOf = useMemo(() => {
    const cache = new Map<GEdge, EdgeDirection>();
    return (e: GEdge) => {
      let d = cache.get(e);
      if (!d) cache.set(e, (d = directionOf(e, byId)));
      return d;
    };
  }, [byId]);

  const connected = useMemo(() => {
    const s = new Set<string>();
    for (const e of filtered.edges) {
      s.add(e.s);
      s.add(e.t);
    }
    return s;
  }, [filtered.edges]);

  /**
   * On-map placement, over every entity with ANY edge in the layer — not just the
   * filtered ones — plus unresolved entities, which take no edges by rule and are
   * still drawn. Marks in a state therefore hold still while you filter, focus or
   * scrub time. Depends on nothing a hover can change.
   */
  const mapLayout = useMemo(() => {
    const inLayer = new Set<string>();
    for (const e of edges) {
      inLayer.add(e.s);
      inLayer.add(e.t);
    }
    const onMap = new Map<StateCode, GNode[]>();
    for (const n of nodes) {
      if ((!inLayer.has(n.id) && n.resolved !== false) || !n.st || !STATE_BY_ID.has(n.st)) continue;
      if (!onMap.has(n.st)) onMap.set(n.st, []);
      onMap.get(n.st)!.push(n);
    }
    /** `spread` = distance from the anchor; compared per render against what is actually drawn. */
    const pos = new Map<string, { x: number; y: number; spread: number }>();
    const golden = 2.399963229728653; // 137.507°
    for (const [code, list] of onMap) {
      list.sort((a, b) => b.sz - a.sz || a.label.localeCompare(b.label));
      const geo = STATE_BY_ID.get(code) as StateGeo;
      const maxR = clusterRadius(geo, list.length);
      list.forEach((n, i) => {
        const denom = Math.max(1, list.length - 1);
        const r = list.length <= 1 ? 0 : maxR * Math.sqrt(i / denom);
        const a = i * golden;
        pos.set(n.id, { x: geo.cx + r * Math.cos(a), y: geo.cy + r * Math.sin(a), spread: r });
      });
    }
    return { pos };
  }, [nodes, edges]);

  /**
   * Drawn marks: the connected subset of the map layout, unresolved entities that
   * pass the family and search filters, and the gutter. The gutter IS repacked per
   * filter — see the header.
   */
  const placed = useMemo(() => {
    const out = new Map<string, Placed>();
    const offMap: GNode[] = [];
    /** Furthest drawn mark centre from the anchor, per state — the overflow test runs on what is drawn. */
    const reach = new Map<StateCode, number>();
    let isolated = 0;
    let unresolved = 0;
    for (const n of nodes) {
      const lone = n.resolved === false;
      if (!connected.has(n.id)) {
        if (!nodePasses(n, filter)) continue;
        if (!lone) {
          isolated++;
          continue;
        }
      }
      if (lone) unresolved++;
      const p = mapLayout.pos.get(n.id);
      if (p) {
        const r = 2 + n.sz * 1.5;
        out.set(n.id, { n, x: p.x, y: p.y, r, offMap: false });
        const st = n.st as StateCode;
        reach.set(st, Math.max(reach.get(st) ?? 0, p.spread));
      } else if (showGutter) {
        offMap.push(n);
      }
    }
    offMap.sort((a, b) => a.fam.localeCompare(b.fam) || b.sz - a.sz || a.label.localeCompare(b.label));
    // Gutter: a single ordered column, grouped by family.
    const colH = MAP_H - 90;
    const step = Math.min(15, colH / Math.max(1, offMap.length));
    offMap.forEach((n, i) => {
      out.set(n.id, { n, x: GUTTER_X, y: 62 + i * step, r: 2 + n.sz * 1.4, offMap: true });
    });
    // `clearance` is the radius of the largest circle inside the state at its
    // anchor. A drawn mark centred past it MAY sit outside the boundary — the
    // caption says "may", because this is not a point-in-polygon test. (A mark's
    // disc is wider than Delhi or Chandigarh however it is placed; that is the
    // mark size, not the packing, and is not reported as overflow.)
    const overflowed = [...reach]
      .filter(([c, r]) => r > (STATE_BY_ID.get(c) as StateGeo).clearance + 0.01)
      .map(([c]) => STATE_BY_ID.get(c)!.name)
      .sort();
    return { map: out, offMapCount: offMap.length, onMapCount: out.size - offMap.length, overflowed, isolated, unresolved };
  }, [nodes, connected, mapLayout, showGutter, filter]);

  /**
   * Parallel relationships between the same two entities fan apart by rank, largest
   * amount innermost. Ranked over the whole layer, so a filter never reshuffles them.
   */
  const parallelRank = useMemo(() => {
    const byPair = new Map<string, GEdge[]>();
    for (const e of edges) {
      const k = `${e.s}>${e.t}`;
      if (!byPair.has(k)) byPair.set(k, []);
      byPair.get(k)!.push(e);
    }
    const rank = new Map<GEdge, number>();
    for (const list of byPair.values()) {
      if (list.length === 1) {
        rank.set(list[0], 0);
        continue;
      }
      [...list]
        .sort((a, b) => (b.a ?? 0) - (a.a ?? 0) || a.pred.localeCompare(b.pred) || a.tier.localeCompare(b.tier))
        .forEach((e, i) => rank.set(e, i));
    }
    return rank;
  }, [edges]);

  const edgeIndex = useMemo(() => new Map(edges.map((e, i) => [e, i])), [edges]);

  /**
   * Arc geometry, cached across filters and year steps in a map keyed on the pair,
   * its parallel rank and both endpoint positions — on-map marks never move, so a
   * filter change reuses almost every path, and a stable object lets ArcMark skip
   * re-rendering. Gutter arcs miss the cache when the gutter repacks, as they should.
   */
  const geomCache = useRef<{ layer: GEdge[] | null; map: Map<string, ArcGeom> }>({ layer: null, map: new Map() });
  const geom = useMemo(() => {
    const cache = geomCache.current;
    if (cache.layer !== edges || cache.map.size > 20000) cache.map = new Map();
    cache.layer = edges;
    const out = new Map<GEdge, ArcGeom>();
    for (const e of filtered.edges) {
      const s = placed.map.get(e.s);
      const t = placed.map.get(e.t);
      if (!s || !t) continue;
      const rank = parallelRank.get(e) ?? 0;
      const key = `${e.s}>${e.t}#${rank}@${s.x},${s.y},${t.x},${t.y}`;
      let g = cache.map.get(key);
      if (!g) {
        // Flatten arcs into the gutter — a bulging line into a straight column
        // reads as noise rather than as connection.
        const k = s.offMap || t.offMap ? 0.05 + rank * 0.05 : curvatureFor(`${e.s}>${e.t}`) + rank * 0.09;
        g = arcGeom(s.x, s.y, t.x, t.y, k);
        cache.map.set(key, g);
      }
      out.set(e, g);
    }
    return out;
  }, [edges, filtered.edges, placed, parallelRank]);

  /**
   * A denial is drawn at least as wide as the widest claim sharing an entity with
   * it (see `linkDenials` for why the pairing is by entity). "As loudly as the
   * claim" is a rule about the picture, so it is enforced in the picture.
   */
  const widthOf = useMemo(() => {
    const claimMax = new Map<GEdge, number>();
    for (const [d, cs] of links.claimsOf) claimMax.set(d, Math.max(0, ...cs.map(amountWidth)));
    return (e: GEdge) => (e.pred === 'contra' ? Math.max(1.1, claimMax.get(e) ?? 0) : amountWidth(e));
  }, [links]);

  const stateFlows = useMemo(
    () => (mode === 'state-flows' ? aggregateStateFlows(nodes, scoped.edges) : []),
    [mode, nodes, scoped.edges],
  );
  const flowByKey = useMemo(() => new Map(stateFlows.map((f) => [f.key, f])), [stateFlows]);

  // Same-state edges cannot be drawn as an arc between two states; they are counted
  // and reported rather than silently dropped.
  const exclusions = useMemo(() => {
    if (mode !== 'state-flows') return { intraState: 0, unplaceable: 0 };
    let intraState = 0;
    let unplaceable = 0;
    for (const e of scoped.edges) {
      const s = byId.get(e.s)?.st;
      const t = byId.get(e.t)?.st;
      if (!s || !t) unplaceable++;
      else if (s === t) intraState++;
    }
    return { intraState, unplaceable };
  }, [mode, scoped.edges, byId]);

  // ---- choropleth ground -------------------------------------------------

  const fillFor = useMemo(() => {
    const sorted = Object.values(stateWeight ?? {})
      .filter((v): v is number => typeof v === 'number' && v > 0)
      .sort((a, b) => a - b);
    return (code: StateCode): string => {
      const v = stateWeight?.[code];
      if (typeof v !== 'number' || !sorted.length) return `url(#geo-nodata-${uid})`;
      let i = 0;
      while (i < RAMP.length - 1 && v > sorted[Math.floor(((i + 1) / RAMP.length) * (sorted.length - 1))]) i++;
      return RAMP[i];
    };
  }, [stateWeight, uid]);

  // ---- hover handlers (stable) --------------------------------------------

  const enterEdge = useCallback((e: GEdge) => {
    setHover({ kind: 'edge', e });
    cb.current.onInspect?.({ kind: 'edge', edge: e }, false);
  }, []);
  const leaveInspect = useCallback(() => {
    setHover(null);
    cb.current.onInspect?.(null, false);
  }, []);
  const pinEdge = useCallback((e: GEdge) => cb.current.onInspect?.({ kind: 'edge', edge: e }, true), []);

  /**
   * Keyboard reach: one tab stop per layer — states, arcs, marks, or flows — and
   * arrow keys (Home/End) step within the focused layer, the composite-widget
   * pattern. Tab alone used to need 143 presses to reach the first mark. Arrows
   * pan the camera only while the viewport itself has focus; once an item has it,
   * they are the item's, and the pad still pans.
   */
  const roveList = useCallback((layer: string | null) => {
    const svg = svgRef.current;
    return svg && layer ? [...svg.querySelectorAll<SVGElement>(`[data-rove="${layer}"]`)] : [];
  }, []);
  const onRoveFocus = useCallback(
    (ev: React.FocusEvent<SVGElement>) => {
      const el = ev.currentTarget;
      for (const x of roveList(el.getAttribute('data-rove'))) x.tabIndex = x === el ? 0 : -1;
    },
    [roveList],
  );
  const onRoveKey = useCallback(
    (ev: React.KeyboardEvent<SVGElement>, fn: () => void) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        ev.stopPropagation();
        fn();
        return;
      }
      const step = ROVE_STEP[ev.key];
      if (step === undefined) return;
      const list = roveList(ev.currentTarget.getAttribute('data-rove'));
      const i = list.indexOf(ev.currentTarget);
      if (i < 0) return;
      ev.preventDefault();
      ev.stopPropagation();
      const j = step === -Infinity ? 0 : step === Infinity ? list.length - 1 : (i + step + list.length) % list.length;
      list[j].focus();
    },
    [roveList],
  );

  // ---- memoised layers: none of these re-render on hover ------------------

  const statesInteractive = !!onStateClick;
  const groundLayer = useMemo(
    () => (
      <g role={statesInteractive ? 'group' : undefined} aria-label={statesInteractive ? 'States — arrow keys step between them' : undefined}>
        {STATES.map((s, i) => (
          <path
            key={s.id}
            d={s.path}
            fill={fillFor(s.id)}
            stroke="rgba(10,10,12,0.85)"
            strokeWidth="0.45"
            strokeLinejoin="round"
            className="outline-none"
            style={statesInteractive ? { cursor: 'pointer' } : undefined}
            data-rove={statesInteractive ? 'states' : undefined}
            tabIndex={statesInteractive ? (i === 0 ? 0 : -1) : undefined}
            role={statesInteractive ? 'button' : undefined}
            aria-label={statesInteractive ? `${s.name}. Enter filters the map to entities registered here and their neighbours.` : undefined}
            onMouseEnter={() => setHover({ kind: 'state', code: s.id })}
            onMouseLeave={() => setHover(null)}
            onFocus={(ev) => {
              onRoveFocus(ev);
              setHover({ kind: 'state', code: s.id });
            }}
            onBlur={() => setHover(null)}
            onClick={(ev) => {
              if (!wasDrag(ev)) cb.current.onStateClick?.(s.id);
            }}
            onKeyDown={(ev) => onRoveKey(ev, () => cb.current.onStateClick?.(s.id))}
          />
        ))}
        {STATES.map((s) => (
          <path key={`o-${s.id}`} d={s.path} fill="none" stroke="rgba(201,168,108,0.18)" strokeWidth="0.35" pointerEvents="none" />
        ))}
      </g>
    ),
    [fillFor, statesInteractive, wasDrag, onRoveFocus, onRoveKey],
  );

  const baseArcOpacity = scopeActive ? 0.8 : 0.42;

  const arcLayer = useMemo(() => {
    if (mode !== 'entities') return null;
    return (
      <g>
        {scoped.edges.map((e) => {
          const g = geom.get(e);
          if (!g) return null;
          return <ArcMark key={edgeId(e, edgeIndex.get(e))} e={e} g={g} w={widthOf(e)} opacity={baseArcOpacity} directed={isDirected(dirOf(e))} />;
        })}
      </g>
    );
  }, [mode, scoped.edges, geom, widthOf, baseArcOpacity, edgeIndex, dirOf]);

  /**
   * Invisible, wider hit targets — the drawn arcs are too thin to hover, and stay
   * pointer-transparent. Keyboard-reachable only where there is something to do
   * with an arc: a page that takes no `onInspect` gets no arc tab stop.
   */
  const arcsInteractive = !!onInspect;
  const hitLayer = useMemo(() => {
    if (mode !== 'entities') return null;
    let first = true;
    return (
      <g role={arcsInteractive ? 'group' : undefined} aria-label={arcsInteractive ? 'Relationships — arrow keys step between them' : undefined}>
        {scoped.edges.map((e) => {
          const g = geom.get(e);
          if (!g) return null;
          const s = byId.get(e.s)?.label ?? e.s;
          const t = byId.get(e.t)?.label ?? e.t;
          const tab = arcsInteractive ? (first ? 0 : -1) : undefined;
          first = false;
          return (
            <path
              key={edgeId(e, edgeIndex.get(e))}
              d={g.d}
              fill="none"
              stroke="transparent"
              strokeWidth={5}
              pointerEvents="stroke"
              className="outline-none"
              style={{ cursor: arcsInteractive ? 'pointer' : undefined }}
              data-rove={arcsInteractive ? 'arcs' : undefined}
              tabIndex={tab}
              role={arcsInteractive ? 'button' : undefined}
              aria-label={
                arcsInteractive
                  ? `${s} ${isDirected(dirOf(e)) ? 'to' : 'and'} ${t}: ${e.pred}, ${TIERS[e.tier].label}${e.a ? `, ${crore(e.a)}` : ''}. Enter pins the details.`
                  : undefined
              }
              onMouseEnter={() => enterEdge(e)}
              onMouseLeave={leaveInspect}
              onFocus={(ev) => {
                onRoveFocus(ev);
                enterEdge(e);
              }}
              onBlur={leaveInspect}
              onClick={(ev) => {
                if (!wasDrag(ev)) pinEdge(e);
              }}
              onKeyDown={(ev) => onRoveKey(ev, () => pinEdge(e))}
            />
          );
        })}
      </g>
    );
  }, [mode, scoped.edges, geom, byId, arcsInteractive, enterEdge, leaveInspect, pinEdge, edgeIndex, dirOf, wasDrag, onRoveFocus, onRoveKey]);

  const inScopeCount = useMemo(() => {
    if (!scoped.ids) return placed.map.size;
    let n = 0;
    for (const id of scoped.ids) if (placed.map.has(id)) n++;
    return n;
  }, [scoped.ids, placed]);

  const selectable = !!onSelect;
  const markLayer = useMemo(() => {
    if (mode !== 'entities') return null;
    let first = true;
    return (
      <g role="group" aria-label="Entities — arrow keys step between them">
        {[...placed.map.values()].map((p) => {
          const out = scoped.ids && !scoped.ids.has(p.n.id);
          const isSel = selected === p.n.id;
          const tab = out ? undefined : first ? 0 : -1;
          if (!out) first = false;
          return (
            <g key={p.n.id} opacity={out ? 0.12 : 1}>
              <circle
                cx={p.x}
                cy={p.y}
                r={isSel ? p.r + 1.8 : p.r}
                fill={FAMILY_COLOR[p.n.fam]}
                fillOpacity={p.n.resolved === false ? 0.25 : 0.9}
                stroke={isSel ? '#e8e4dc' : 'rgba(10,10,12,0.9)'}
                strokeWidth={isSel ? 1.2 : 0.4}
                strokeDasharray={p.n.resolved === false ? '1.5 1.5' : undefined}
                className="outline-none"
                style={{ cursor: selectable ? 'pointer' : undefined }}
                data-rove={out ? undefined : 'marks'}
                tabIndex={tab}
                role={out ? undefined : selectable ? 'button' : 'img'}
                aria-label={
                  out
                    ? undefined
                    : `${p.n.label}${p.n.sub ? `, ${p.n.sub}` : ''}${p.offMap ? ', not geographic' : ''}${p.n.resolved === false ? ', identity unresolved, takes no relationships' : ''}.${selectable ? ' Enter selects.' : ''}`
                }
                onMouseEnter={() => setHover({ kind: 'node', id: p.n.id })}
                onMouseLeave={() => setHover(null)}
                onFocus={(ev) => {
                  onRoveFocus(ev);
                  setHover({ kind: 'node', id: p.n.id });
                }}
                onBlur={() => setHover(null)}
                onClick={(ev) => {
                  if (!wasDrag(ev)) cb.current.onSelect?.(isSel ? null : p.n.id);
                }}
                onKeyDown={(ev) => onRoveKey(ev, () => cb.current.onSelect?.(isSel ? null : p.n.id))}
              >
                <title>{`${p.n.label}${p.n.sub ? ` — ${p.n.sub}` : ''}`}</title>
              </circle>
              {p.offMap && (
                <text x={p.x + 6} y={p.y} dominantBaseline="central" fontSize="6.4" fill="rgba(240,236,228,0.62)" pointerEvents="none">
                  {p.n.label.length > 26 ? `${p.n.label.slice(0, 25)}…` : p.n.label}
                </text>
              )}
            </g>
          );
        })}
      </g>
    );
  }, [mode, placed, scoped.ids, selected, selectable, wasDrag, onRoveFocus, onRoveKey]);

  /** Flow geometry, width and tier — memoised like the arc layer, so a pan frame or a hover rebuilds nothing. */
  const flowGeom = useMemo(() => {
    if (mode !== 'state-flows') return [];
    const maxFlow = Math.max(1, ...stateFlows.map((f) => f.count));
    const out: { f: StateFlow; d: string; w: number; weakest: Tier; denial: { d: string; w: number; dash: string } | null; from: StateGeo; to: StateGeo }[] = [];
    for (const f of stateFlows) {
      const a = STATE_BY_ID.get(f.from);
      const b = STATE_BY_ID.get(f.to);
      if (!a || !b) continue;
      const w = f.count ? 0.6 + (f.count / maxFlow) * 4.5 : 0;
      const denials = f.aside.filter((e) => e.pred === 'contra');
      // Denials between two states get their own red arc beside the flow, as wide
      // as the flow it sits beside and dashed by the weakest denial's tier.
      const denial = denials.length
        ? {
            d: arc(a.cx, a.cy, b.cx, b.cy, curvatureFor(f.key) + 0.07),
            w: Math.max(1.1, w),
            dash: TIERS[weakestTier(new Set(denials.map((e) => e.tier)))].dash,
          }
        : null;
      out.push({ f, d: arc(a.cx, a.cy, b.cx, b.cy, curvatureFor(f.key)), w, weakest: weakestTier(f.tiers), denial, from: a, to: b });
    }
    return out;
  }, [mode, stateFlows]);

  const flowLayer = useMemo(() => {
    if (mode !== 'state-flows') return null;
    let first = true;
    return (
      <g role="group" aria-label="State flows — arrow keys step between them">
        {flowGeom.map(({ f, d, w, weakest, denial, from: a, to: b }) => {
          const enter = () => {
            setHover({ kind: 'flow', key: f.key });
            cb.current.onInspect?.({ kind: 'flow', flow: f }, false);
          };
          const pin = () => cb.current.onInspect?.({ kind: 'flow', flow: f }, true);
          const sep = f.directional ? '→' : '—';
          const nDen = f.aside.filter((e) => e.pred === 'contra').length;
          const label = `${a.name} ${sep} ${b.name}: ${f.count ? plural(f.count, 'relationship') : 'no relationships'}${f.amount ? `, ${crore(f.amount)}` : ''}${f.count ? `, weakest tier ${weakest}` : ''}${nDen ? `, ${plural(nDen, 'denial')} beside it` : ''}`;
          const tab = first ? 0 : -1;
          first = false;
          return (
            <g key={f.key}>
              {f.count > 0 && (
                <path
                  d={d}
                  fill="none"
                  stroke="rgba(232,228,220,0.42)"
                  strokeWidth={w}
                  strokeDasharray={TIERS[weakest].dash || undefined}
                  // Butt caps: round caps grow each dash by the stroke width and
                  // close the gaps, so a wide "alleged" flow would read as documented.
                  strokeLinecap="butt"
                  opacity={0.72}
                  markerEnd={f.directional ? `url(#geo-arrow-${uid})` : undefined}
                  pointerEvents="none"
                />
              )}
              {denial && (
                <path d={denial.d} fill="none" stroke={CONTRA_INK} strokeWidth={denial.w} strokeDasharray={denial.dash || undefined} strokeLinecap="butt" opacity={0.9} pointerEvents="none" />
              )}
              <path
                d={d}
                fill="none"
                stroke="transparent"
                strokeWidth={Math.max(6, w + 3)}
                pointerEvents="stroke"
                className="outline-none"
                style={{ cursor: 'pointer' }}
                data-rove="flows"
                tabIndex={tab}
                role="button"
                aria-label={`${label}. Enter pins the top five.`}
                onMouseEnter={enter}
                onMouseLeave={leaveInspect}
                onFocus={(ev) => {
                  onRoveFocus(ev);
                  enter();
                }}
                onBlur={leaveInspect}
                onClick={(ev) => {
                  if (!wasDrag(ev)) pin();
                }}
                onKeyDown={(ev) => onRoveKey(ev, pin)}
              >
                <title>{label}</title>
              </path>
            </g>
          );
        })}
      </g>
    );
  }, [mode, flowGeom, uid, leaveInspect, wasDrag, onRoveFocus, onRoveKey]);

  // ---- hover-derived, cheap ------------------------------------------------

  /** The lit set: a hovered node's ego, a hovered arc's endpoints, else the selection's ego. */
  const lit = useMemo(() => {
    if (mode !== 'entities') return null;
    let seed: string | null = null;
    if (hover?.kind === 'edge') return new Set([hover.e.s, hover.e.t]);
    if (hover?.kind === 'node') seed = hover.id;
    else if (!hover || hover.kind === 'state') seed = selected && placed.map.has(selected) ? selected : null;
    if (!seed) return null;
    const s = new Set<string>([seed]);
    for (const e of scoped.edges) {
      if (e.s === seed) s.add(e.t);
      if (e.t === seed) s.add(e.s);
    }
    return s;
  }, [mode, hover, selected, scoped.edges, placed]);

  /**
   * What the overlay redraws above the dimmed base. Any lit claim brings every
   * denial linked to it along at the SAME opacity and width parity — the base
   * layer drops to ~6% under a highlight, and a denial left there while its claim
   * is raised is exactly the dimming the contradiction rule forbids.
   */
  const overlay = useMemo(() => {
    const out: { e: GEdge; opacity: number; raised: boolean }[] = [];
    if (!lit) return out;
    const seen = new Set<GEdge>();
    const add = (e: GEdge, opacity: number, raised: boolean) => {
      if (seen.has(e) || !geom.has(e)) return;
      seen.add(e);
      out.push({ e, opacity, raised });
    };
    if (hover?.kind === 'edge') {
      const e = hover.e;
      if (e.pred === 'contra') for (const c of links.claimsOf.get(e) ?? []) add(c, 0.85, false);
      add(e, 1, true);
      if (isClaim(e)) for (const d of links.denialsOf.get(e) ?? []) add(d, 1, true);
    } else {
      const base = scoped.edges.filter((e) => geom.has(e) && lit.has(e.s) && lit.has(e.t));
      for (const e of base) add(e, 0.85, false);
      for (const e of base) if (isClaim(e)) for (const d of links.denialsOf.get(e) ?? []) add(d, 0.85, false);
    }
    // Denials last, so red is never overprinted by the claim it answers.
    return [...out.filter((x) => x.e.pred !== 'contra'), ...out.filter((x) => x.e.pred === 'contra')];
  }, [lit, hover, scoped.edges, geom, links]);

  const hoveredEdge = hover?.kind === 'edge' ? hover.e : null;
  const hoveredFlow = hover?.kind === 'flow' ? hover.key : null;
  const hoveredFlowGeom = hoveredFlow ? flowGeom.find((x) => x.f.key === hoveredFlow) ?? null : null;
  const hoveredState = hover?.kind === 'state' ? hover.code : null;
  const labelFor = hover?.kind === 'node' ? hover.id : selected;

  // ---- camera: frame the scope when it changes ----------------------------

  const latest = useRef({ placed, scoped, stateFlows, mode });
  latest.current = { placed, scoped, stateFlows, mode };
  const scopeKey = `${scope?.focus ?? ''}|${scope?.hops ?? ''}|${scope?.state ?? ''}|${mode}|${scoped.focusMissing}`;
  const hadScope = useRef(false);
  const scopeBox = useCallback((): Box | null => {
    const { placed: pl, scoped: sc, stateFlows: fl, mode: md } = latest.current;
    if (!sc.ids) return null;
    const pts: { x: number; y: number; r: number }[] = [];
    if (md === 'entities') {
      for (const id of sc.ids) {
        const p = pl.map.get(id);
        if (p) pts.push({ x: p.x, y: p.y, r: p.offMap ? 60 : p.r });
      }
    } else {
      for (const f of fl) {
        for (const c of [f.from, f.to]) {
          const g = STATE_BY_ID.get(c);
          if (g) pts.push({ x: g.cx, y: g.cy, r: 8 });
        }
      }
    }
    if (!pts.length) return null;
    const pad = 22;
    return {
      x0: Math.min(...pts.map((p) => p.x - p.r)) - pad,
      y0: Math.min(...pts.map((p) => p.y - p.r)) - pad,
      x1: Math.max(...pts.map((p) => p.x + p.r)) + pad,
      y1: Math.max(...pts.map((p) => p.y + p.r)) + pad,
    };
  }, []);
  const { fitTo } = cam;
  useEffect(() => {
    const box = scopeBox();
    if (box) {
      fitTo(box);
      hadScope.current = true;
    } else if (hadScope.current) {
      fitTo(null);
      hadScope.current = false;
    }
  }, [scopeKey, scopeBox, fitTo]);

  const onFit = () => cam.fitTo(scopeBox());

  /** `0` frames the scope if there is one, else the whole map — the frame IS the extent. */
  const onKeyDown = (ev: React.KeyboardEvent) => {
    if (ev.key === '0') {
      onFit();
      ev.preventDefault();
      return;
    }
    cam.onKeyDown(ev);
  };

  // Escape clears — but when maximised, Escape belongs to the camera and only shrinks.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || expandedRef.current) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
      cb.current.onEscape?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ---- captions -----------------------------------------------------------

  const focusNode = scope?.focus ? byId.get(scope.focus) : undefined;
  const stateName = scope?.state ? STATE_BY_ID.get(scope.state)?.name ?? scope.state : null;
  const N = mode === 'entities' ? placed.map.size : connected.size;
  const n = mode === 'entities' ? inScopeCount : scoped.ids?.size ?? N;
  const drawnFlows = stateFlows.filter((f) => f.count > 0).length;

  const summary =
    mode === 'entities'
      ? `${placed.onMapCount} placed · ${placed.offMapCount} non-geographic · ${scoped.edges.length} relationships`
      : `${drawnFlows} state pairs · ${scoped.edges.length} relationships`;

  /** What Tab can reach, and what Escape does — only what this page actually wires. */
  const reach = [statesInteractive && 'states', mode === 'entities' && arcsInteractive && 'arcs', mode === 'entities' && 'marks', mode === 'state-flows' && 'flows'].filter(
    Boolean,
  ) as string[];
  const reachText = reach.length
    ? `Tab reaches the ${reach.length > 1 ? `${reach.slice(0, -1).join(', ')} and ${reach[reach.length - 1]}` : reach[0]}, one stop each; arrow keys step within them`
    : '';

  const hoverLine = ((): ReactNode => {
    if (hoveredState) {
      const name = STATE_BY_ID.get(hoveredState)?.name ?? hoveredState;
      let ents = 0;
      for (const p of placed.map.values()) {
        if (!p.offMap && p.n.st === hoveredState && (!scoped.ids || scoped.ids.has(p.n.id))) ents++;
      }
      // Transfers, ownership valuations and everything else are summed apart: a
      // market-cap stake added to an award is a number with no meaning as either
      // a stock or a flow.
      let rel = 0;
      let money = 0;
      let moneyWeak = 0;
      let stakes = 0;
      let other = 0;
      for (const e of scoped.edges) {
        if (byId.get(e.s)?.st !== hoveredState && byId.get(e.t)?.st !== hoveredState) continue;
        rel++;
        if (!e.a) continue;
        if (MONEY_PREDS.has(e.pred)) {
          money += e.a;
          if (e.tier !== 'documented') moneyWeak += e.a;
        } else if (e.pred === 'own') stakes += e.a;
        else other += e.a;
      }
      return (
        <>
          <strong className="text-text">{name}</strong> · {plural(ents, 'entity', 'entities')} registered here · {plural(rel, 'relationship')} touching it ·{' '}
          {money ? `transfers and awards ${crore(money)}` : 'no priced transfer or award'}
          {moneyWeak ? ` (${crore(moneyWeak)} below documented)` : ''}
          {money ? ', routed money counted per hop' : ''}
          {stakes ? ` · stakes valued at ${crore(stakes)}, not added in` : ''}
          {other ? ` · other figures ${crore(other)}, not added in` : ''}
          {onStateClick && (scope?.state === hoveredState ? ' · click or Enter clears' : ' · click or Enter filters to it')}
        </>
      );
    }
    if (hoveredEdge) {
      const e = hoveredEdge;
      const dk = dateKind(e);
      const nDen = isClaim(e) ? links.denialsOf.get(e)?.length ?? 0 : 0;
      return (
        <>
          <strong className="text-text">{byId.get(e.s)?.label ?? e.s}</strong> {isDirected(dirOf(e)) ? '→' : '—'}{' '}
          <strong className="text-text">{byId.get(e.t)?.label ?? e.t}</strong> · {e.pred} · {TIERS[e.tier].label.toLowerCase()} ·{' '}
          {e.a ? crore(e.a) : 'no amount'} ·{' '}
          {dk === 'undated' ? 'undated' : dk === 'point' ? `${e.from} (an event)` : dk === 'open' ? `${e.from ?? '…'} – no end recorded` : `${e.from}–${e.to}`}
          {nDen ? ` · ${plural(nDen, 'denial')} touching these entities raised with it` : ''}
          {onInspect ? ' · details below · click or Enter pins them' : ''}
        </>
      );
    }
    if (hoveredFlow) {
      const f = flowByKey.get(hoveredFlow);
      if (f) {
        const nDen = f.aside.filter((e) => e.pred === 'contra').length;
        return (
          <>
            <strong className="text-text">{STATE_BY_ID.get(f.from)?.name}</strong> {f.directional ? '→' : '—'}{' '}
            <strong className="text-text">{STATE_BY_ID.get(f.to)?.name}</strong> · {plural(f.count, 'relationship')} ·{' '}
            {f.amount ? crore(f.amount) : 'no amounts'}
            {f.count ? ` · weakest tier ${TIERS[weakestTier(f.tiers)].label.toLowerCase()}` : ''}
            {nDen ? ` · ${plural(nDen, 'denial')}, not counted` : ''}
            {onInspect ? ' · top five listed below' : ''}
          </>
        );
      }
    }
    if (hover?.kind === 'node') {
      const p = placed.map.get(hover.id);
      if (p) {
        const deg = (lit?.size ?? 1) - 1;
        return (
          <>
            <strong className="text-text">{p.n.label}</strong> · {p.n.sub ?? p.n.ty} ·{' '}
            {p.n.resolved === false ? 'identity unresolved — takes no relationships by rule' : `${plural(deg, 'direct connection')} in view`}
            {p.offMap ? ' · not geographic — shown in the side column' : ` · registered in ${STATE_BY_ID.get(p.n.st as StateCode)?.name}`}
            {onSelect ? ' · click or Enter selects' : ''}
          </>
        );
      }
    }
    return (
      <>
        drag to pan · arrows or the pad to move · +/− or scroll to zoom · 0 {scopeActive ? 'frames the scope' : 'returns the whole map'} · f maximises
        {reachText ? ` · ${reachText}` : ''}
        {onEscape ? ' · Escape clears' : ''}
      </>
    );
  })();

  const chip = (label: ReactNode, onClear?: () => void, clearLabel = 'clear') => (
    <span className="inline-flex items-center gap-1.5 rounded border border-accent/60 bg-accent/10 px-1.5 py-0.5 font-mono text-[10.5px] text-accent">
      {label}
      {onClear && (
        <button onClick={onClear} aria-label={clearLabel} className="text-text-muted hover:text-text focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent">
          ×
        </button>
      )}
    </span>
  );

  return (
    <div className="relative">
      <ExpandShell expanded={cam.expanded} onClose={() => cam.setExpanded(false)} caption={summary}>
        <div
          className="relative flex flex-col outline-none focus-visible:ring-1 focus-visible:ring-accent"
          style={{ height: cam.expanded ? '100%' : height }}
          tabIndex={0}
          onKeyDown={onKeyDown}
          aria-label={`Map viewport. Arrow keys pan, plus and minus zoom, 0 frames the view, f maximises.${reachText ? ` ${reachText}.` : ''}${onEscape ? ' Escape clears a focus or state filter.' : ''}`}
        >
          <svg
            ref={svgRef}
            data-geo=""
            // FIXED viewBox, deliberately: these coordinates are map geometry, and a
            // map stretched to fill its box is a lie about the country's shape. It
            // letterboxes on purpose — the camera handles the pointer maths exactly.
            viewBox={`0 0 ${VIEW_W} ${MAP_H}`}
            style={{ width: '100%', flex: '1 1 0', minHeight: 0, display: 'block', touchAction: 'none', cursor: cam.dragging ? 'grabbing' : 'grab' }}
            {...panHandlers}
            onPointerDown={onPointerDown}
            // A group, not an img: it holds focusable states, arcs and marks, and
            // role="img" would hide every one of them from assistive technology.
            role="group"
            aria-roledescription="map"
            aria-label={
              mode === 'state-flows'
                ? `Map of India with ${drawnFlows} aggregated state-to-state flows drawn as arcs. A table of the same data follows.`
                : `Map of India with ${placed.onMapCount} entities placed in their registered state and ${placed.offMapCount} non-geographic entities in a side column, connected by ${scoped.edges.length} relationships. A table of the same data follows.`
            }
          >
            <defs>
              <pattern id={`geo-nodata-${uid}`} width="7" height="7" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                <rect width="7" height="7" fill="#101116" />
                <line x1="0" y1="0" x2="0" y2="7" stroke="rgba(201,168,108,0.13)" strokeWidth="0.9" />
              </pattern>
              <marker id={`geo-arrow-${uid}`} viewBox="0 0 8 8" refX="6.5" refY="4" markerWidth="4.5" markerHeight="4.5" orient="auto">
                <path d="M 0 0 L 8 4 L 0 8 z" fill="rgba(232,228,220,0.5)" />
              </marker>
            </defs>

            {/* Everything below rides the camera. */}
            <g transform={cam.transform}>
              {/* ground */}
              {groundLayer}

              {/* state filter + state hover: an outline over the fill, so the choropleth stays readable */}
              {scope?.state && STATE_BY_ID.get(scope.state) && (
                <path
                  d={STATE_BY_ID.get(scope.state)!.path}
                  fill="rgba(201,168,108,0.12)"
                  stroke={ACCENT}
                  strokeWidth="1.3"
                  strokeLinejoin="round"
                  pointerEvents="none"
                />
              )}
              {hoveredState && hoveredState !== scope?.state && (
                <path d={STATE_BY_ID.get(hoveredState)!.path} fill="none" stroke={ACCENT} strokeOpacity="0.7" strokeWidth="0.8" pointerEvents="none" />
              )}

              {/* gutter frame */}
              {showGutter && placed.offMapCount > 0 && mode === 'entities' && (
                <g pointerEvents="none">
                  <line x1={GUTTER_X - 26} y1="46" x2={GUTTER_X - 26} y2={MAP_H - 24} stroke="rgba(201,168,108,0.16)" strokeWidth="0.5" />
                  <text x={GUTTER_X - 20} y="34" fontSize="8.5" fill="rgba(240,236,228,0.55)" fontFamily="var(--font-mono, monospace)">
                    NOT GEOGRAPHIC
                  </text>
                  <text x={GUTTER_X - 20} y="45" fontSize="7" fill="rgba(240,236,228,0.35)" fontFamily="var(--font-mono, monospace)">
                    people · rules · parties · sectors
                  </text>
                </g>
              )}

              {/* ---- edges ---- */}
              {mode === 'state-flows' ? (
                <>
                  <g opacity={hoveredFlow ? 0.17 : 1}>{flowLayer}</g>
                  {/* the hovered or focused flow, raised — dash intact, and its denials with it */}
                  {hoveredFlowGeom && (
                    <g pointerEvents="none">
                      {hoveredFlowGeom.f.count > 0 && (
                        <path
                          d={hoveredFlowGeom.d}
                          fill="none"
                          stroke={ACCENT}
                          strokeWidth={hoveredFlowGeom.w + 1.4}
                          strokeDasharray={TIERS[hoveredFlowGeom.weakest].dash || undefined}
                          strokeLinecap="butt"
                          opacity={0.9}
                          markerEnd={hoveredFlowGeom.f.directional ? `url(#geo-arrow-${uid})` : undefined}
                        />
                      )}
                      {hoveredFlowGeom.denial && (
                        <path
                          d={hoveredFlowGeom.denial.d}
                          fill="none"
                          stroke={CONTRA_INK}
                          strokeWidth={Math.max(hoveredFlowGeom.denial.w, hoveredFlowGeom.w) + 1.4}
                          strokeDasharray={hoveredFlowGeom.denial.dash || undefined}
                          strokeLinecap="butt"
                        />
                      )}
                    </g>
                  )}
                </>
              ) : (
                <>
                  <g opacity={lit ? 0.14 : 1}>{arcLayer}</g>
                  {hitLayer}
                </>
              )}

              {/* ---- entity marks ---- */}
              {mode === 'entities' && (
                <>
                  <g opacity={lit ? 0.35 : 1}>{markLayer}</g>

                  {/* lit overlay — redrawn on top, pointer-transparent, so the base layers never re-render on hover */}
                  {lit && (
                    <g pointerEvents="none">
                      {overlay
                        .filter((x) => !x.raised)
                        .map(({ e, opacity }) => (
                          <ArcMark key={edgeId(e, edgeIndex.get(e))} e={e} g={geom.get(e)!} w={widthOf(e)} opacity={opacity} directed={isDirected(dirOf(e))} />
                        ))}
                      {[...lit].map((id) => {
                        const p = placed.map.get(id);
                        if (!p) return null;
                        const ring = hover?.kind === 'node' ? hover.id === id : selected === id;
                        return (
                          <g key={id}>
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r={ring ? p.r + 1.8 : p.r}
                              fill={FAMILY_COLOR[p.n.fam]}
                              fillOpacity={p.n.resolved === false ? 0.25 : 0.9}
                              stroke={ring ? '#e8e4dc' : 'rgba(10,10,12,0.9)'}
                              strokeWidth={ring ? 1.2 : 0.4}
                              strokeDasharray={p.n.resolved === false ? '1.5 1.5' : undefined}
                            />
                            {p.offMap && (
                              <text x={p.x + 6} y={p.y} dominantBaseline="central" fontSize="6.4" fill="rgba(240,236,228,0.92)">
                                {p.n.label.length > 26 ? `${p.n.label.slice(0, 25)}…` : p.n.label}
                              </text>
                            )}
                          </g>
                        );
                      })}
                    </g>
                  )}

                  {/* a hovered or focused arc is raised above everything, dash intact — and any denial touching it with it */}
                  {hoveredEdge && geom.get(hoveredEdge) && (
                    <g pointerEvents="none">
                      {overlay
                        .filter((x) => x.raised)
                        .map(({ e, opacity }) => (
                          <ArcMark key={edgeId(e, edgeIndex.get(e))} e={e} g={geom.get(e)!} w={widthOf(e) + 1} opacity={opacity} directed={isDirected(dirOf(e))} raised />
                        ))}
                      {[hoveredEdge.s, hoveredEdge.t].map((id) => {
                        const p = placed.map.get(id);
                        return p ? <circle key={id} cx={p.x} cy={p.y} r={p.r + 2.4} fill="none" stroke={ACCENT} strokeWidth="1" /> : null;
                      })}
                    </g>
                  )}

                  {/* the hovered or selected entity's name */}
                  {labelFor && placed.map.get(labelFor) && !placed.map.get(labelFor)!.offMap && (
                    <text
                      x={placed.map.get(labelFor)!.x}
                      y={placed.map.get(labelFor)!.y - placed.map.get(labelFor)!.r - 4}
                      textAnchor="middle"
                      fontSize="7.5"
                      fill="rgba(240,236,228,0.92)"
                      stroke="rgba(10,10,12,0.8)"
                      strokeWidth="2"
                      paintOrder="stroke"
                      pointerEvents="none"
                    >
                      {placed.map.get(labelFor)!.n.label}
                    </text>
                  )}
                </>
              )}

              {/* state anchors in flow mode */}
              {mode === 'state-flows' && (
                <g pointerEvents="none">
                  {STATES.filter((s) => stateFlows.some((f) => f.from === s.id || f.to === s.id)).map((s) => (
                    <g key={`a-${s.id}`}>
                      <circle cx={s.cx} cy={s.cy} r="2.6" fill={ACCENT} stroke="rgba(10,10,12,0.9)" strokeWidth="0.5" />
                      <text
                        x={s.cx}
                        y={s.cy - 6}
                        textAnchor="middle"
                        fontSize="7.5"
                        fill="rgba(240,236,228,0.8)"
                        stroke="rgba(10,10,12,0.7)"
                        strokeWidth="2"
                        paintOrder="stroke"
                      >
                        {s.name}
                      </text>
                    </g>
                  ))}
                </g>
              )}
            </g>
          </svg>

          {/* The hover line: everything a tooltip would say, in a place the keyboard reaches too. */}
          {/* Height is reserved per breakpoint — never grown by content — so hovering
              never resizes the map under the cursor, and a phone still gets the whole line. */}
          <div
            aria-live="polite"
            className="flex-none h-[144px] sm:h-[76px] lg:h-[46px] overflow-y-auto pr-[92px] pl-1.5 pt-1 font-mono text-[10.5px] leading-snug text-text-muted"
          >
            {hoverLine}
          </div>

          <CameraControls cam={cam} onFit={onFit} fitLabel={scopeActive ? 'Frame the focused set (0)' : 'Back to the whole map (0)'} />
        </div>
      </ExpandShell>

      {/* legend + the honesty line */}
      <div className="mt-3 space-y-2">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] text-text-muted">
          {mode === 'entities' ? (
            ([...filter.families] as NodeFamily[]).map((f) => (
              <span key={f} className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: FAMILY_COLOR[f] }} />
                {FAMILY_LABEL[f]}
              </span>
            ))
          ) : (
            <span>
              arc thickness = number of relationships · dash = weakest tier in the pair · arrowhead only where every relationship in
              the pair is a transfer or award whose direction the endpoint types confirm · denials and fact updates are not counted
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block w-5 h-2.5 border border-border"
              style={{ background: 'repeating-linear-gradient(45deg,transparent,transparent 2px,rgba(201,168,108,.22) 2px,rgba(201,168,108,.22) 3px)' }}
            />
            no data — not zero
          </span>
          {onStateClick && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-4 h-2.5 border" style={{ borderColor: '#c9a86c', background: 'rgba(201,168,108,0.12)' }} />
              state filter
            </span>
          )}
          <span className="ml-auto font-mono">{summary}</span>
        </div>

        {/* Line semantics. Every encoding on the map has an entry here. */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-text-muted">
          {TIER_ORDER.map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <svg width="26" height="8" aria-hidden>
                <line x1="1" y1="4" x2="25" y2="4" stroke="rgba(232,228,220,0.75)" strokeWidth="1.4" strokeDasharray={TIERS[t].dash || undefined} />
              </svg>
              {TIERS[t].label.toLowerCase()}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <svg width="26" height="8" aria-hidden>
              <line x1="1" y1="4" x2="25" y2="4" stroke={CONTRA_INK} strokeWidth="1.4" />
            </svg>
            {mode === 'entities'
              ? 'denial (contra) — never thinner or fainter than any claim sharing an entity with it; the data does not record which claim a denial answers'
              : 'denials between two states — a red arc beside the flow, as wide as it'}
          </span>
          {mode === 'entities' && (
            <>
              <span className="flex items-center gap-1.5">
                <svg width="26" height="8" aria-hidden>
                  <line x1="1" y1="4" x2="25" y2="4" stroke="rgba(232,228,220,0.75)" strokeWidth="1.4" />
                  <path d="M 10.5 1.2 L 15.5 4 L 10.5 6.8 z" fill="rgba(232,228,220,0.95)" />
                </svg>
                mid-arc chevron: payer → payee, or awarding body → winner (not always the way money moves: a block winner pays the
                state) — drawn only where the endpoint types confirm the recorded direction
              </span>
              <span>width = amount (√, capped) · unpriced relationships draw hairline</span>
              {placed.unresolved > 0 && (
                <span className="flex items-center gap-1.5">
                  <svg width="10" height="10" aria-hidden>
                    <circle cx="5" cy="5" r="3.6" fill="rgba(232,228,220,0.25)" stroke="rgba(232,228,220,0.8)" strokeWidth="0.8" strokeDasharray="1.5 1.5" />
                  </svg>
                  identity unresolved — takes no relationships
                </span>
              )}
            </>
          )}
        </div>

        {/* scope chips: what the reader has narrowed to, and one click to undo it */}
        {(scope?.state || scope?.focus || filter.years) && (
          <div className="flex flex-wrap items-center gap-2">
            {scope?.state &&
              chip(
                <>
                  state: {stateName} + first-degree neighbours
                </>,
                onClearState,
                `Clear the ${stateName} filter`,
              )}
            {scope?.focus &&
              !scoped.focusMissing &&
              chip(
                <>
                  {n} of {N} entities — {plural(scoped.hops, 'hop')} from {focusNode?.label ?? scope.focus}
                </>,
                onClearFocus,
                'Clear the focus',
              )}
            {filter.years && chip(<>{filter.years[0]}–{filter.years[1]}</>)}
          </div>
        )}

        <p className="text-[11.5px] text-text-muted leading-relaxed max-w-[76ch]">
          {mode === 'entities' ? (
            <>
              <strong>Marks are placed within a state, not geocoded</strong> — on a golden-angle spiral, so a
              mark's position inside its state carries no information.{' '}
              {placed.offMapCount > 0 && (
                <>
                  {placed.offMapCount} entities are off-map because they are not geographic — people, rules,
                  parties, sectors — and sit in the side column rather than being dropped from the network or
                  given a place they do not have.{' '}
                </>
              )}
              {placed.overflowed.length > 0 && (
                <>
                  In {placed.overflowed.join(', ')} the drawn cluster reaches past the largest circle that fits inside the
                  state, so some marks may sit beyond the boundary. That costs no accuracy — the marks were never located
                  inside it — but it is a distortion, so it is named.{' '}
                </>
              )}
              {placed.isolated > 0 && (
                <>
                  {plural(placed.isolated, 'entity', 'entities')} in this layer {placed.isolated === 1 ? 'has' : 'have'} no
                  relationship under the current filters and {placed.isolated === 1 ? 'is' : 'are'} not drawn.{' '}
                </>
              )}
              {placed.unresolved > 0 && (
                <>
                  {plural(placed.unresolved, 'entity', 'entities')} whose identity is unresolved{' '}
                  {placed.unresolved === 1 ? 'is' : 'are'} drawn dashed and edge-less: an unconfirmed identity takes no
                  relationships by rule.{' '}
                </>
              )}
            </>
          ) : (
            <>
              Arcs aggregate relationships between the <strong>registered</strong> states of the two
              entities — which is a fact about registered offices, not about where anything happened.
              {exclusions.intraState > 0 &&
                ` ${plural(exclusions.intraState, 'relationship')} within a single state cannot be drawn as an arc and ${exclusions.intraState === 1 ? 'is' : 'are'} excluded from the map but counted here.`}
              {exclusions.unplaceable > 0 &&
                ` ${exclusions.unplaceable} involve an entity with no location and ${exclusions.unplaceable === 1 ? 'is' : 'are'} likewise excluded.`}{' '}
              Nothing is silently dropped.{' '}
            </>
          )}
          <ScopeCaption
            mode={mode}
            focusLabel={focusNode?.label ?? scope?.focus ?? null}
            focusMissing={scoped.focusMissing}
            hops={scoped.hops}
            stateName={stateName}
            n={n}
            N={N}
            shown={scoped.edges.length}
            total={filtered.edges.length}
            focusActive={!!scope?.focus && !scoped.focusMissing}
            unknownState={scope?.unknownState ?? null}
          />
          {filter.minAmount ? (
            <>
              A minimum of {crore(filter.minAmount)} is applied{mode === 'state-flows' ? ' before aggregation, so every flow is built only from relationships at or above it' : ''};
              relationships with no recorded amount fall below any minimum and are hidden with it.{' '}
            </>
          ) : null}
          {filter.years ? (
            <>
              The {filter.years[0]}–{filter.years[1]} window hides {plural(stats.hiddenByTime, 'dated relationship')} in this
              view; {stats.undated} undated {stats.undated === 1 ? 'relationship is' : 'relationships are'} never hidden by it
              and remain drawn.{' '}
              {stats.openEnded > 0 && (
                <>
                  {stats.openEnded} drawn {stats.openEnded === 1 ? 'has' : 'have'} a start and no recorded end — roles,
                  holdings, proceedings — and {stats.openEnded === 1 ? 'is' : 'are'} treated as still true, which the data
                  does not establish.{' '}
                </>
              )}
              {stats.pointEvents > 0 && (
                <>
                  {stats.pointEvents} single-dated transfers, awards or denials are read as events in that year.{' '}
                </>
              )}
            </>
          ) : stats.undated > 0 && stats.undated < scoped.edges.length ? (
            <>{stats.undated} of {scoped.edges.length} relationships in view carry no date. </>
          ) : null}
          {stats.denialsKept > 0 && (
            <>
              {plural(stats.denialsKept, 'denial')} {stats.denialsKept === 1 ? 'is' : 'are'} shown although the filters would
              hide {stats.denialsKept === 1 ? 'it' : 'them'}, because a claim touching the same entity is shown. The data
              records who denies what about whom, not which edge a denial answers, so the pairing is by shared entity.
            </>
          )}
        </p>
      </div>
    </div>
  );
}

/**
 * One arc, with its direction chevron when `directed` (see `directionOf`). Dash is
 * the tier; never restyled. Memoised: geometry objects are cached, so a filter
 * change re-renders only the arcs that actually changed.
 */
const ArcMark = memo(function ArcMark({
  e,
  g,
  w,
  opacity,
  directed,
  raised = false,
}: {
  e: GEdge;
  g: ArcGeom;
  w: number;
  opacity: number;
  directed: boolean;
  raised?: boolean;
}) {
  const isContra = e.pred === 'contra';
  const ink = isContra ? CONTRA_INK : raised ? 'rgba(240,236,228,0.95)' : ARC_INK;
  const chev = directed;
  // Sized off the arc it sits on, clamped so a ₹10,000 cr arc does not grow a sail.
  const s = Math.min(1.5, Math.max(0.85, w * 0.7));
  return (
    <g opacity={opacity}>
      <path d={g.d} fill="none" stroke={ink} strokeWidth={w} strokeDasharray={TIERS[e.tier].dash || undefined} />
      {chev && (
        <path
          d={`M ${-2.4 * s} ${-2 * s} L ${2 * s} 0 L ${-2.4 * s} ${2 * s} z`}
          transform={`translate(${g.mx} ${g.my}) rotate(${g.ang})`}
          fill={raised ? 'rgba(240,236,228,0.95)' : 'rgba(232,228,220,0.62)'}
        />
      )}
    </g>
  );
});

/** Says exactly what the focus and state filters hide. */
function ScopeCaption(p: {
  mode: GeoMode;
  focusLabel: string | null;
  focusMissing: boolean;
  focusActive: boolean;
  hops: number;
  stateName: string | null;
  n: number;
  N: number;
  shown: number;
  total: number;
  unknownState: string | null;
}) {
  const parts: ReactNode[] = [];
  if (p.unknownState) {
    parts.push(
      <span key="us">
        “{p.unknownState}” is not a state or UT code this map knows, so no state filter is applied.{' '}
      </span>,
    );
  }
  if (p.focusMissing && p.focusLabel) {
    parts.push(
      <span key="fm">
        {p.focusLabel} is not in the current filtered view{p.stateName ? ` of ${p.stateName}` : ''}, so the focus is not applied.{' '}
      </span>,
    );
  }
  if (p.stateName) {
    parts.push(
      <span key="st">
        The {p.stateName} filter keeps entities registered there and their first-degree neighbours anywhere; a
        relationship between two entities that are both outside {p.stateName} is hidden even when each is a neighbour.{' '}
      </span>,
    );
  }
  if (p.focusActive && p.focusLabel) {
    parts.push(
      <span key="fo">
        The focus keeps everything within {plural(p.hops, 'hop')} of {p.focusLabel}.{' '}
      </span>,
    );
  }
  if (p.stateName || p.focusActive) {
    parts.push(
      <span key="sum">
        {p.n} of {p.N} entities and {p.shown} of {p.total} relationships remain
        {p.mode === 'entities' ? '; the other marks are dimmed, not deleted, and their arcs are hidden' : ''}. Hub
        entities reach almost everything within two hops — a large neighbourhood is a property of the hub, not a
        finding about it.{' '}
      </span>,
    );
  }
  return <>{parts}</>;
}

export default memo(GeoNetwork);
