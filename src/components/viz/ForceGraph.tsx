import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { quadtree, type Quadtree, type QuadtreeLeaf } from 'd3-quadtree';
import { TIERS, TIER_ORDER, type GNode, type GEdge, type Tier, type NodeFamily, type NodeType, type Predicate } from '../../graph/schema';
import { useCamera, CameraControls, ExpandShell, type View } from './camera';
import { useLayout } from './useLayout';
import type { LayoutInput } from './layoutCore';
import GraphA11y, { syncOverlay, segOf, KEYBOARD_CAP, type A11yEdge, type A11yNode, type LayerHandlers } from './GraphA11y';

/**
 * The connection graph.
 *
 * Edge style carries the EVIDENCE TIER — solid / dashed / dotted / dot-dash. That
 * is semantic, not decorative, and is never restyled for looks. Node shape carries
 * type, hue carries family, radius carries weight: three orthogonal channels,
 * never overloaded. Line weight carries the ₹ amount and nothing else — emphasis
 * is done with opacity and tone, never by widening a line. The one exception is
 * the denial, which is drawn at least as wide as the widest claim it answers, in
 * red, with a cross-bar at its midpoint so it survives greyscale: "as prominently
 * as the claim" is enforced in the picture, not promised in a caption.
 *
 * RENDERER. A Canvas 2D surface driven from a ref, not React-reconciled SVG: every
 * layout tick used to be a React render of ~640 node groups and ~780 edge groups.
 * The frozen channels survive byte-for-byte because Canvas takes the same inputs
 * SVG did — `ctx.setLineDash` gets the numbers in `TIERS[t].dash`, drawn in layout
 * units so dashes scale with zoom exactly as `stroke-dasharray` did, and every node
 * is `new Path2D(shapeFor(cls, r))` from the same path strings. The frame is drawn
 * on demand (a new layout buffer, a camera move, a change of emphasis), never on a
 * timer, and not at all once the layout has settled and nothing moves.
 *
 * On top of the canvas sits `GraphA11y`: an SVG of the same measured size that is
 * the camera's element (so `camera.tsx` still converts pointers through a live
 * `getScreenCTM`), receives every pointer event, and renders real focusable
 * elements for the examined set plus a keyboard cursor. The table twin is still
 * the primary accessible route, and the layer's name says so.
 *
 * VIEWPORT MODEL. The viewBox is MEASURED from the element with a ResizeObserver,
 * so one viewBox unit is one CSS pixel: no letterbox, drag is exact, and expanding
 * really does hand the graph the whole window. The canvas backing store is the
 * same frame times the device pixel ratio. The layout is computed around the
 * origin and is independent of the viewport — resizing refits the camera and
 * never re-runs the simulation.
 *
 * THE LAYOUT IS A FUNCTION OF THE FILTERED GRAPH, AND OF NOTHING ELSE. It runs in
 * a Web Worker (`useLayout`), always starts cold and runs exactly 300 ticks — so
 * the same URL draws the same picture on any machine, at any frame rate, whatever
 * the reader clicked before. Reduced motion pre-ticks it and draws only the
 * settled picture. Pinned nodes are the one exception, and they wear a ring.
 *
 * Selection, focus and path do not touch the layout at all: the node and edge
 * arrays are identity-stabilised below, so a new array holding the same members
 * does not restart anything. Ego focus hides what is outside the neighbourhood and
 * refits the camera; the path finder dims what is off the path; a deliberate pan
 * survives both.
 */

export const FAMILY_COLOR: Record<NodeFamily, string> = {
  state: '#5a8ec4',
  capital: '#c9a86c',
  recipient: '#8b7ec4',
  instrument: '#5aa89e',
  enforce: '#c45b5a',
  market: '#7a9e7e',
};

export const FAMILY_LABEL: Record<NodeFamily, string> = {
  state: 'Public power',
  capital: 'Private capital',
  recipient: 'Recipients',
  instrument: 'Instruments',
  enforce: 'Regulators & courts',
  market: 'Markets & geography',
};

export const PRED_LABEL: Record<string, string> = {
  award: 'Award / contract',
  bond: 'Electoral bond',
  trust: 'Electoral trust',
  direct: 'Direct donation',
  pmin: 'Into a fund',
  pmout: 'Out of a fund',
  csr: 'CSR disbursement',
  own: 'Ownership',
  family: 'Family',
  role: 'Office / directorship',
  law: 'Rule or regulatory reach',
  enforce: 'Proceeding / audit',
  hq: 'Headquartered in',
  listed: 'Listed on',
  sector: 'Operates in',
  contra: 'Denial / counter-evidence',
  supersede: 'Fact update',
  analytic: 'Analytic comparison',
  loan: 'Loan',
  grant: 'Grant / foreign contribution',
};

/**
 * The predicates that carry a direction the data actually records: money or an
 * award moving from one party to another (MONEY_PREDS in scripts/lib/vocab.mjs,
 * plus `award`; a test holds the two lists together). Only these get an arrowhead
 * or an "→".
 * An arrow on "family" or on an analytic comparison would assert a direction that
 * nobody has claimed.
 */
const DIRECTED = new Set<Predicate>(['bond', 'trust', 'direct', 'pmin', 'pmout', 'csr', 'award', 'loan', 'grant']);
export const isDirected = (pred: Predicate) => DIRECTED.has(pred);

/**
 * Shape classes — the legend's vocabulary and the `ty` URL filter's. The circle is
 * the default shape, so its legend entry names every type that falls through to it
 * rather than claiming to mean "company" alone.
 */
export type ShapeClass = 'company' | 'institution' | 'recipient' | 'rule' | 'person';

export const SHAPE_CLASSES: { id: ShapeClass; glyph: string; label: string; types: string }[] = [
  { id: 'company', glyph: '◯', label: 'company, group or sector', types: 'company, shell, group, industry, exchange, state' },
  { id: 'institution', glyph: '▢', label: 'institution', types: 'ministry, agency, PSU' },
  { id: 'recipient', glyph: '◇', label: 'recipient of funds', types: 'party, sangh, trust, fund' },
  { id: 'rule', glyph: '△', label: 'rule or mechanism', types: 'law, mechanism' },
  { id: 'person', glyph: '⌒', label: 'person', types: 'person' },
];

export function shapeClassOf(ty: NodeType): ShapeClass {
  switch (ty) {
    case 'person':
      return 'person';
    case 'ministry':
    case 'agency':
    case 'psu':
      return 'institution';
    case 'party':
    case 'sangh':
    case 'trust':
    case 'fund':
      return 'recipient';
    case 'law':
    case 'mechanism':
      return 'rule';
    default:
      return 'company';
  }
}


export interface GraphFilter {
  tiers: Set<Tier>;
  families: Set<NodeFamily>;
  preds: Set<string>;
  /** Shape classes shown — the clickable legend. */
  types: Set<ShapeClass>;
  query: string;
  /** ISO date; edges whose window ends before this are hidden. */
  from?: string;
  to?: string;
  minAmount?: number;
}

/**
 * Above this many drawn relationships, non-contra edges are batched into one
 * stroke per tier and weight band. Below it every edge is drawn, and hit-tested,
 * one by one. The number is where a mid-range laptop stopped holding frame rate
 * during the settle of the SVG renderer, kept so the batching rule — and the
 * caption that states it — is unchanged by the canvas.
 */
const BATCH_OVER = 600;
/** The hovered or selected entity keeps its own edges individual up to this many neighbours. */
const INCIDENT_MAX = 200;

/**
 * Shape paths, memoised per (class, radius). There are five classes and four
 * weights, so this is twenty strings for the life of the page instead of one per
 * node per tick.
 */
const SHAPES = new Map<string, string>();
function shapeFor(cls: ShapeClass, r: number): string {
  const key = `${cls}:${r}`;
  const hit = SHAPES.get(key);
  if (hit) return hit;
  let d: string;
  switch (cls) {
    case 'person':
      d = `M ${-r} ${r} a ${r} ${r} 0 1 1 ${r * 2} 0 z`; // half-round: people read as distinct
      break;
    case 'institution':
      d = `M ${-r} ${-r} h ${r * 2} v ${r * 2} h ${-r * 2} z`; // square: institutions
      break;
    case 'recipient':
      d = `M 0 ${-r} L ${r} 0 L 0 ${r} L ${-r} 0 z`; // diamond: recipients of money
      break;
    case 'rule':
      d = `M 0 ${-r} L ${r * 0.87} ${r * 0.5} L ${-r * 0.87} ${r * 0.5} z`; // triangle: rules
      break;
    default:
      d = `M ${-r} 0 a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0`; // circle: companies
  }
  SHAPES.set(key, d);
  return d;
}

/**
 * Line weight: the ₹ amount, banded to the quarter unit. One function for single
 * lines and batches alike, so the same amount never draws at two weights depending
 * on how many edges happen to be on screen.
 */
export function edgeWidth(e: GEdge): number {
  if (e.pred === 'contra') return 1.5;
  return Math.round((0.7 + Math.min(2.4, Math.sqrt(e.a ?? 0) / 26)) * 4) / 4;
}

function within(e: GEdge, f: GraphFilter): boolean {
  if (!f.tiers.has(e.tier)) return false;
  if (f.preds.size && !f.preds.has(e.pred)) return false;
  if (f.minAmount && (e.a ?? 0) < f.minAmount) return false;
  // Undated edges pass both tests by construction: absence of a date is not
  // evidence about when something happened.
  if (f.from && e.to && e.to < f.from) return false;
  if (f.to && e.from && e.from > f.to) return false;
  return true;
}

/**
 * The filtered graph — the one the layout runs over, and the one the table twin
 * reads. Exported so the two cannot drift: they used to compute this separately,
 * and the table ignored the search box and the date range.
 *
 * The contradiction invariant is applied last. A denial carries no amount, often
 * sits in a different tier from its claim, and has its own predicate — so tier,
 * predicate, amount and date filters used to remove denials while the claims they
 * answer stayed drawn. Any denial whose claim survives is put back, with its
 * endpoints, and counted in `restored` so the caption can say so.
 */
export function filterGraph(
  nodes: GNode[],
  edges: GEdge[],
  filter: GraphFilter,
  denials?: DenialIndex,
): { nodes: GNode[]; edges: GEdge[]; restored: number } {
  const q = filter.query.trim().toLowerCase();
  const matches = (n: GNode) =>
    !q ||
    n.label.toLowerCase().includes(q) ||
    (n.sub ?? '').toLowerCase().includes(q) ||
    (n.al ?? []).some((a) => a.toLowerCase().includes(q));
  const keep = new Set<string>();
  for (const n of nodes) {
    if (!filter.families.has(n.fam)) continue;
    if (!filter.types.has(shapeClassOf(n.ty))) continue;
    if (matches(n)) keep.add(n.id);
  }
  // Keep an edge only when both endpoints survive the node filter.
  const drawn = new Set(edges.filter((e) => keep.has(e.s) && keep.has(e.t) && within(e, filter)));
  let restored = 0;
  if (denials) {
    const exists = new Set(nodes.map((n) => n.id));
    for (const e of edges) {
      if (e.pred !== 'contra' || drawn.has(e) || !exists.has(e.s) || !exists.has(e.t)) continue;
      const claims = [...(denials.answers.get(e) ?? []), ...(denials.mayRelate.get(e) ?? [])];
      if (!claims.some((c) => drawn.has(c))) continue;
      drawn.add(e);
      keep.add(e.s);
      keep.add(e.t);
      restored++;
    }
  }
  return {
    // Input order, not insertion order: the layout is seeded from array order.
    nodes: nodes.filter((n) => keep.has(n.id)),
    edges: edges.filter((e) => drawn.has(e)),
    restored,
  };
}

/**
 * Which claims each denial answers, and which denials answer each claim.
 *
 * A denial ANSWERS a claim when it names it (`t: "claim:<edge id>"`, the fleet
 * convention) or, failing that, when the two sit on the same pair of entities.
 * Only that join lights edges, expands a focus or restores a filtered denial's
 * claim context — it is the one that says something about the claim.
 *
 * The looser join — claims that merely touch the entity the denial is aimed at —
 * is kept separately as `mayRelate`. It is display-only and labelled on both
 * cards, because "Reliance denies Qwik is a subsidiary" is not an answer to "Qwik
 * bought ₹375 cr of bonds", and presenting it as one would draw a relationship the
 * data does not carry.
 */
export interface DenialIndex {
  answers: Map<GEdge, GEdge[]>;
  answeredBy: Map<GEdge, GEdge[]>;
  /** Denial → claims that only share its target entity. Never lights, focuses or links. */
  mayRelate: Map<GEdge, GEdge[]>;
  mayRelateBy: Map<GEdge, GEdge[]>;
}

export function denialIndex(edges: GEdge[]): DenialIndex {
  const pair = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const byPair = new Map<string, GEdge[]>();
  const byNode = new Map<string, GEdge[]>();
  const byEdgeId = new Map<string, GEdge>();
  const push = <K,>(m: Map<K, GEdge[]>, k: K, e: GEdge) => (m.get(k) ?? m.set(k, []).get(k)!).push(e);
  for (const e of edges) {
    if (e.id) byEdgeId.set(e.id, e);
    if (e.pred === 'contra' || e.pred === 'supersede') continue;
    push(byPair, pair(e.s, e.t), e);
    push(byNode, e.s, e);
    if (e.t !== e.s) push(byNode, e.t, e);
  }
  const answers = new Map<GEdge, GEdge[]>();
  const answeredBy = new Map<GEdge, GEdge[]>();
  const mayRelate = new Map<GEdge, GEdge[]>();
  const mayRelateBy = new Map<GEdge, GEdge[]>();
  for (const c of edges) {
    if (c.pred !== 'contra') continue;
    const named = c.t.startsWith('claim:') ? byEdgeId.get(c.t.slice(6)) : undefined;
    const claims = named ? [named] : byPair.get(pair(c.s, c.t)) ?? [];
    if (claims.length) {
      answers.set(c, claims);
      for (const cl of claims) push(answeredBy, cl, c);
      continue;
    }
    const near = byNode.get(c.t) ?? [];
    if (!near.length) continue;
    mayRelate.set(c, near);
    for (const cl of near) push(mayRelateBy, cl, c);
  }
  return { answers, answeredBy, mayRelate, mayRelateBy };
}

export interface GraphPath {
  nodes: Set<string>;
  edges: Set<GEdge>;
  ends: [string, string];
}

/**
 * The same members in the same order keep the same array. The caller rebuilds its
 * filtered arrays whenever the URL changes; without this, a click that only changes
 * `sel` would hand the layout "new" data and restart it.
 */
function useStableList<T>(xs: T[]): T[] {
  const ref = useRef(xs);
  const prev = ref.current;
  if (prev !== xs && (prev.length !== xs.length || xs.some((x, i) => x !== prev[i]))) ref.current = xs;
  return ref.current;
}

// ---------------------------------------------------------------------------
// The canvas renderer
// ---------------------------------------------------------------------------

/** `TIERS[t].dash` as `setLineDash` takes it — the same numbers, nothing added. */
const DASH: Record<Tier, number[]> = Object.fromEntries(
  TIER_ORDER.map((t) => [t, TIERS[t].dash ? TIERS[t].dash.split(/\s+/).map(Number) : []]),
) as Record<Tier, number[]>;
const NO_DASH: number[] = [];
const UNRESOLVED_DASH = [2, 2];

/** One Path2D per (class, radius) — twenty for the life of the page, from the same strings. */
const PATH2D = new Map<string, Path2D>();
function path2d(cls: ShapeClass, r: number): Path2D {
  const key = `${cls}:${r}`;
  let p = PATH2D.get(key);
  if (!p) PATH2D.set(key, (p = new Path2D(shapeFor(cls, r))));
  return p;
}

/**
 * Is a node-local point on the glyph as PAINTED — its fill or its outline? Tested
 * against the very Path2D the canvas fills, on a detached context whose transform
 * is never touched, so the pointer and the picture cannot disagree about a shape.
 * (The square's corners sit at 1.41·r, and the person's half-round hangs BELOW its
 * layout point; a circle around the layout point got both wrong.)
 */
let HIT: CanvasRenderingContext2D | null | undefined;
const OUTLINE_MAX = 2; // the widest node outline drawn (selected / path end)
function onGlyph(cls: ShapeClass, r: number, lx: number, ly: number): boolean {
  if (HIT === undefined) {
    HIT = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
    if (HIT) HIT.lineWidth = OUTLINE_MAX;
  }
  if (!HIT) return lx * lx + ly * ly <= r * r;
  const p = path2d(cls, r);
  return HIT.isPointInPath(p, lx, ly) || HIT.isPointInStroke(p, lx, ly);
}
/** The middle of a glyph's box relative to its layout point: the half-round's body is below it. */
const bodyDy = (cls: ShapeClass, r: number) => (cls === 'person' ? r / 2 : 0);

/**
 * The palette the SVG version used, verbatim. Under `forced-colors: active` the
 * canvas does not get the system palette for free, so lines, outlines and labels
 * switch to system colours; family hue, dash, shape — and the denial's red — are
 * kept. A denial is red in every mode: it is a frozen channel like family hue, and
 * `#c45b5a` clears 3:1 (WCAG 1.4.11) on both a black and a white `Canvas`
 * (4.8:1 and 4.4:1). Width and the mid-edge cross-bar carry it without hue.
 */
const PAL = {
  edge: 'rgba(232,228,220,0.30)',
  edgeActive: 'rgba(244,240,232,1)',
  edgePath: 'rgba(232,228,220,0.85)',
  arrow: 'rgba(232,228,220,0.35)',
  contra: '#c45b5a',
  strong: '#e8e4dc',
  outline: 'rgba(10,10,12,0.9)',
  ring: '#c9a86c',
  labelFill: 'rgba(240,236,228,0.86)',
  labelHalo: 'rgba(10,10,12,0.7)',
  miniBg: 'rgba(10,10,12,0.88)',
  miniEdge: 'rgba(244,240,232,0.15)',
  miniDot: 'rgba(232,228,220,0.55)',
  miniBox: '#c9a86c',
};
const FORCED: typeof PAL = {
  ...PAL,
  edge: 'CanvasText',
  edgeActive: 'Highlight',
  edgePath: 'Highlight',
  arrow: 'CanvasText',
  strong: 'Highlight',
  outline: 'CanvasText',
  labelFill: 'CanvasText',
  labelHalo: 'Canvas',
  miniBg: 'Canvas',
  miniEdge: 'CanvasText',
  miniDot: 'CanvasText',
  miniBox: 'Highlight',
};

interface DNode {
  n: GNode;
  id: string;
  /** Index into the positions buffer. */
  i: number;
  r: number;
  cls: ShapeClass;
}
interface DLink {
  e: GEdge;
  s: number;
  t: number;
  /** Position in the link list — what the overlay's `data-edge` reads back. */
  i: number;
}
interface Batch {
  tier: Tier;
  lit: boolean;
  w: number;
  links: DLink[];
}

/** Everything one frame needs, captured at the last commit. */
interface Frame {
  W: number;
  H: number;
  view: View;
  drawNodes: DNode[];
  singles: DLink[];
  batches: Batch[];
  edgeLit: Map<GEdge, boolean>;
  litNodes: Set<string> | null;
  path: GraphPath | null;
  selected: string | null;
  activeEdge: GEdge | null;
  pins: Set<string>;
  focusNode: string | null;
  degree: Map<string, number>;
  contraW: Map<GEdge, number>;
  /** Per link (by `DLink.i`): perpendicular offset from the centre line, signed along its own s→t. */
  off: Float64Array;
  probe: DNode | null;
  tip: DNode | null;
}

/** FNV-1a over the positions to 0.1 unit: the layout's identity, for the viewport gate. */
function digest(pos: Float64Array): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < pos.length; i++) {
    let v = Math.round(pos[i] * 10) | 0;
    for (let b = 0; b < 4; b++) {
      h ^= v & 0xff;
      h = Math.imul(h, 0x01000193);
      v >>= 8;
    }
  }
  return `${pos.length / 2}:${(h >>> 0).toString(16)}`;
}

function segDist2(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len = dx * dx + dy * dy;
  let u = len ? ((px - ax) * dx + (py - ay) * dy) / len : 0;
  u = Math.max(0, Math.min(1, u));
  const x = ax + u * dx - px;
  const y = ay + u * dy - py;
  return x * x + y * y;
}

const DIR: Record<string, [number, number, string]> = {
  ArrowLeft: [-1, 0, 'left'],
  ArrowRight: [1, 0, 'right'],
  ArrowUp: [0, -1, 'up'],
  ArrowDown: [0, 1, 'down'],
};

interface Props {
  /** The FILTERED graph. The layout runs over exactly this set. */
  nodes: GNode[];
  edges: GEdge[];
  /** Ego focus: only these ids are drawn. null draws everything. */
  shown?: Set<string> | null;
  /** Changes whenever the focused set changes, so the camera refits exactly once per change. */
  focusKey?: string;
  path?: GraphPath | null;
  denials?: DenialIndex;
  selected?: string | null;
  onSelect?: (id: string | null) => void;
  /** Shift-click or Shift+Enter: make this node the far end of a path. */
  onPathEnd?: (id: string) => void;
  activeEdge?: GEdge | null;
  onEdgeActive?: (e: GEdge) => void;
  /** Focus and path captions, drawn inside the frame so they survive maximising. */
  status?: ReactNode;
  /** The edge card, drawn inside the frame while maximised — the inline one is out of sight then. */
  card?: ReactNode;
  /** One-line summary for the maximised overlay header. */
  caption?: string;
  height?: number;
}

export default function ForceGraph({
  nodes,
  edges,
  shown = null,
  focusKey = '',
  path = null,
  denials,
  selected = null,
  onSelect,
  onPathEnd,
  activeEdge = null,
  onEdgeActive,
  status,
  card,
  caption,
  height = 620,
}: Props) {
  const ref = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<string | null>(null);

  /**
   * The viewport, measured rather than assumed. Seeded with the declared height so
   * the first paint is not degenerate; the observer corrects it within a frame.
   */
  const [size, setSize] = useState({ w: 900, h: height });
  const W = size.w;
  const H = size.h;

  const cam = useCamera(ref, W, H);
  const { fitTo, expanded, toLocal } = cam;
  const { onWheel, ...panHandlers } = cam.svgProps;

  /**
   * Measure the frame.
   *
   * The state update is deferred to the next frame ON PURPOSE. A ResizeObserver
   * callback that writes state synchronously can re-enter layout inside the same
   * delivery, and the browser reports that as an uncaught
   * "ResizeObserver loop completed with undelivered notifications" — a CONSOLE
   * ERROR, which is a hard failure of the render smoke gate.
   */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    let frame = 0;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (!r) return;
      const w = Math.max(240, Math.round(r.width));
      const h = Math.max(240, Math.round(r.height));
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setSize((s) => (s.w === w && s.h === h ? s : { w, h })));
    });
    ro.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
    // Re-observed when the frame moves between inline and overlay, since React
    // remounts the wrapper at the new position in the tree.
  }, [expanded]);

  /**
   * Keyboard focus follows the frame in and out of the maximised view. Maximising
   * remounts the wrapper, and focus used to fall to <body>. Skipped on mount so
   * loading a page never steals focus.
   */
  const wasExpanded = useRef(expanded);
  useEffect(() => {
    if (wasExpanded.current === expanded) return;
    wasExpanded.current = expanded;
    wrapRef.current?.focus({ preventScroll: true });
  }, [expanded]);

  /**
   * Wheel zoom through a native, non-passive listener. React attaches wheel
   * handlers as passive, so the camera's preventDefault logged a console error on
   * every notch and the page scrolled underneath the zoom.
   */
  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const h = (ev: WheelEvent) => onWheel(ev as unknown as React.WheelEvent<SVGSVGElement>);
    svg.addEventListener('wheel', h, { passive: false });
    return () => svg.removeEventListener('wheel', h);
  }, [onWheel, expanded]);

  const reduced = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const forced = typeof window !== 'undefined' && !!window.matchMedia?.('(forced-colors: active)').matches;

  const stableNodes = useStableList(nodes);
  const stableEdges = useStableList(edges);

  /** Where the reader pinned nodes. Survives a re-layout; released by the button. */
  const pinnedAt = useRef<Map<string, { x: number; y: number }>>(new Map());

  const { simNodes, links, simById, linkOf, layoutInput } = useMemo(() => {
    const list = stableNodes.map<DNode>((n, i) => ({ n, id: n.id, i, r: 4 + n.sz * 3.2, cls: shapeClassOf(n.ty) }));
    const byId = new Map(list.map((d) => [d.id, d]));
    const ls: DLink[] = [];
    for (const e of stableEdges) {
      const s = byId.get(e.s);
      const t = byId.get(e.t);
      if (s && t) ls.push({ e, s: s.i, t: t.i, i: ls.length });
    }
    const input: LayoutInput | null = list.length
      ? {
          r: Float64Array.from(list, (d) => d.r),
          band: Int8Array.from(list, (d) => (d.n.fam === 'state' ? -1 : d.n.fam === 'capital' ? 1 : 0)),
          links: Uint32Array.from(ls.flatMap((l) => [l.s, l.t])),
          pinned: Float64Array.from(list.flatMap((d) => {
            const p = pinnedAt.current.get(d.id);
            return p ? [p.x, p.y] : [NaN, NaN];
          })),
        }
      : null;
    return { simNodes: list, links: ls, simById: byId, linkOf: new Map(ls.map((l) => [l.e, l])), layoutInput: input };
  }, [stableNodes, stableEdges]);

  // ---- the draw loop: one rAF, only when something changed ----
  const frameRef = useRef<Frame | null>(null);
  const raf = useRef(0);
  const posVersion = useRef(0);
  const paintRef = useRef<() => void>(() => {});
  const requestDraw = useCallback(() => {
    if (!raf.current) raf.current = requestAnimationFrame(() => paintRef.current());
  }, []);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  const onLayoutFrame = useCallback(() => {
    posVersion.current++;
    requestDraw();
  }, [requestDraw]);

  const layout = useLayout({ input: layoutInput, reduced, onFrame: onLayoutFrame });
  const overlayDirty = useRef(true);
  const synced = useRef({ v: -1, digestV: -1 });
  const miniShownRef = useRef(false);

  /** What is actually drawn: the layout, minus whatever the ego focus hides. */
  const { drawNodes, drawLinks } = useMemo(() => {
    if (!shown) return { drawNodes: simNodes, drawLinks: links };
    return {
      drawNodes: simNodes.filter((d) => shown.has(d.id)),
      drawLinks: links.filter((l) => shown.has(l.e.s) && shown.has(l.e.t)),
    };
  }, [simNodes, links, shown]);

  const isDrawn = useCallback((id: string) => (shown ? shown.has(id) : simById.has(id)), [shown, simById]);

  /** Degree over the drawn edges — the label rule reads it. */
  const degree = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of drawLinks) {
      m.set(l.e.s, (m.get(l.e.s) ?? 0) + 1);
      m.set(l.e.t, (m.get(l.e.t) ?? 0) + 1);
    }
    return m;
  }, [drawLinks]);

  /**
   * Fit the settled layout into the frame: the bounding box of the drawn nodes —
   * the focused set when focus is on — including label overhang.
   */
  const fitToContent = useCallback(() => {
    const pos = layout.pos.current;
    if (!pos) return;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    // Labels sit below and either side of a node, so the box is padded asymmetrically.
    const LABEL_PAD_X = 60;
    const LABEL_PAD_Y = 16;
    for (const d of drawNodes) {
      const x = pos[2 * d.i];
      const y = pos[2 * d.i + 1];
      x0 = Math.min(x0, x - d.r - LABEL_PAD_X);
      x1 = Math.max(x1, x + d.r + LABEL_PAD_X);
      y0 = Math.min(y0, y - d.r - LABEL_PAD_Y);
      y1 = Math.max(y1, y + d.r + LABEL_PAD_Y * 2);
    }
    if (x0 === Infinity) return;
    fitTo({ x0, x1, y0, y1 });
  }, [drawNodes, fitTo, layout.pos]);

  /** Set once per layout, so a user who has panned is not yanked back on every tick. */
  const fittedFor = useRef<string>('');
  // Refit when the layout SETTLES, when the frame RESIZES and when the FOCUS
  // changes — keyed so each happens exactly once, and a deliberate pan is never
  // overridden. Fitting waits for the settle: fitting the seed spiral zoomed IN to
  // 1.6x on a graph whose nodes then spread far outside the frame.
  useEffect(() => {
    if (!layout.settled) return;
    const key = `${simNodes.length}:${simNodes[0]?.id ?? ''}:${layout.settled}:${W}x${H}:${focusKey}`;
    if (fittedFor.current === key) return;
    if (!simNodes.length || !layout.pos.current) return;
    fittedFor.current = key;
    fitToContent();
  }, [layout.settled, layout.pos, simNodes, fitToContent, W, H, focusKey]);

  /**
   * What is lit. A path, when there is one, wins outright — it is the question the
   * reader asked. Otherwise the hovered or selected node and its neighbours.
   */
  const focusNode = hover ?? selected;
  const neighbours = useMemo(() => {
    if (path) return null;
    if (!focusNode) return null;
    const s = new Set<string>([focusNode]);
    for (const l of drawLinks) {
      if (l.e.s === focusNode) s.add(l.e.t);
      if (l.e.t === focusNode) s.add(l.e.s);
    }
    return s;
  }, [focusNode, drawLinks, path]);

  /**
   * Edge emphasis, with the contradiction invariant applied last: a denial is lit
   * whenever any claim it ANSWERS is lit, so it can never sit dimmer than the
   * claim. The looser entity join does not light anything.
   */
  const edgeLit = useMemo(() => {
    const own = (e: GEdge) =>
      path ? path.edges.has(e) : neighbours ? neighbours.has(e.s) && neighbours.has(e.t) : true;
    const lit = new Map<GEdge, boolean>();
    for (const l of drawLinks) lit.set(l.e, own(l.e));
    for (const l of drawLinks) {
      if (l.e.pred !== 'contra' || lit.get(l.e)) continue;
      if (denials?.answers.get(l.e)?.some(own)) lit.set(l.e, true);
    }
    return lit;
  }, [drawLinks, path, neighbours, denials]);

  /**
   * A denial's width: at least as wide as the widest DRAWN claim it answers, never
   * under the 1.5 a denial always had. The join is `answers` only (the claim it
   * names, or a claim on the same pair) — the looser `mayRelate` entity join never
   * widens anything, as it never lights anything. GeoNetwork's `widthOf` is NOT the
   * same rule: it joins every claim sharing an entity with the denial and floors at
   * 1.1. The one shared `contraWidth` §6.3 asks for is not yet extracted.
   */
  const contraW = useMemo(() => {
    const m = new Map<GEdge, number>();
    const drawn = new Set(drawLinks.map((l) => l.e));
    for (const l of drawLinks) {
      if (l.e.pred !== 'contra') continue;
      let w = edgeWidth(l.e);
      for (const c of denials?.answers.get(l.e) ?? []) if (drawn.has(c)) w = Math.max(w, edgeWidth(c));
      m.set(l.e, w);
    }
    return m;
  }, [drawLinks, denials]);

  /**
   * Parallel relationships between the same two entities sit side by side, never on
   * top of each other: each gets a perpendicular offset by its rank on the pair
   * (SOTA §7 — a fan-out by rank carries meaning, curvature would not). Without it a
   * denial, drawn last and at least as wide as its claim, painted the claim out
   * completely: its tier dash, its ₹ width and its arrow. Ranked per unordered pair
   * over the drawn edges — claims by amount, predicate, tier, then input order, the
   * denials after them — and packed edge to edge with a one-unit gap, in layout
   * units so the fan scales with zoom exactly as the widths do. A lone edge stays
   * on the centre line. The same offsets are used by the hit-test and the overlay's
   * lines, so what the pointer and the keyboard find is what is painted.
   */
  const off = useMemo(() => {
    const o = new Float64Array(links.length);
    const byPair = new Map<string, DLink[]>();
    for (const l of drawLinks) {
      if (l.s === l.t) continue;
      const key = l.s < l.t ? `${l.s}|${l.t}` : `${l.t}|${l.s}`;
      (byPair.get(key) ?? byPair.set(key, []).get(key)!).push(l);
    }
    const GAP = 1;
    const widthOf = (l: DLink) => contraW.get(l.e) ?? edgeWidth(l.e);
    for (const list of byPair.values()) {
      if (list.length < 2) continue;
      list.sort(
        (a, b) =>
          Number(a.e.pred === 'contra') - Number(b.e.pred === 'contra') ||
          (b.e.a ?? 0) - (a.e.a ?? 0) ||
          a.e.pred.localeCompare(b.e.pred) ||
          a.e.tier.localeCompare(b.e.tier) ||
          a.i - b.i,
      );
      const total = list.reduce((w, l) => w + widthOf(l), 0) + GAP * (list.length - 1);
      let at = -total / 2;
      for (const l of list) {
        const w = widthOf(l);
        // Offsets are laid out along the pair's canonical direction (lower index →
        // higher) and stored along each edge's own s→t, whose normal is flipped.
        o[l.i] = (l.s < l.t ? 1 : -1) * (at + w / 2);
        at += w + GAP;
      }
    }
    return o;
  }, [links, drawLinks, contraW]);

  /**
   * Which edges are drawn one by one and which are batched. Decided per change of
   * emphasis, never per tick.
   *
   * Always drawn individually: denials (they must stay as loud as their claims),
   * path edges, the edge on the card — which is also the hovered edge — and the
   * hovered or selected entity's own edges when it has INCIDENT_MAX neighbours or
   * fewer.
   */
  const { singles, batches, batched } = useMemo(() => {
    if (drawLinks.length <= BATCH_OVER) return { singles: drawLinks, batches: [] as Batch[], batched: false };
    const incident = neighbours && neighbours.size <= INCIDENT_MAX;
    const one: DLink[] = [];
    const groups = new Map<string, Batch>();
    for (const l of drawLinks) {
      const e = l.e;
      if (
        e.pred === 'contra' ||
        e === activeEdge ||
        path?.edges.has(e) ||
        (incident && (e.s === focusNode || e.t === focusNode))
      ) {
        one.push(l);
        continue;
      }
      const lit = edgeLit.get(e) ?? true;
      const w = edgeWidth(e);
      const key = `${e.tier}|${lit ? 1 : 0}|${w}`;
      const g = groups.get(key) ?? groups.set(key, { tier: e.tier, lit, w, links: [] }).get(key)!;
      g.links.push(l);
    }
    const order = (t: Tier) => TIER_ORDER.indexOf(t);
    return {
      singles: one,
      // Dim batches first so lit ones paint over them.
      batches: [...groups.values()].sort((a, b) => Number(a.lit) - Number(b.lit) || order(a.tier) - order(b.tier) || a.w - b.w),
      batched: true,
    };
  }, [drawLinks, neighbours, edgeLit, path, activeEdge, focusNode]);

  // ---- pins ----
  const [pins, setPins] = useState<Set<string>>(new Set());
  const pinnedIds = useMemo(() => [...pins].filter((id) => simById.has(id)), [pins, simById]);

  /** Release every pinned node and let the layout re-settle around the change. */
  const releasePins = () => {
    pinnedAt.current.clear();
    setPins(new Set());
    layout.release();
  };

  // ---- hit-testing ----
  /**
   * The quadtree indexes the DRAWN set at one positions buffer. It is rebuilt when
   * either changes — the array identity, not a digest of it: an in-app focus change
   * swaps the drawn set without re-running the layout, and two ego sets of the same
   * size with the same first node used to share a stale tree, so the new set's
   * entities could not be hovered and the hidden ones could still be clicked.
   */
  const tree = useRef<{ nodes: DNode[]; pos: Float64Array; v: number; qt: Quadtree<DNode>; maxR: number } | null>(null);
  const nodeAt = (x: number, y: number): DNode | null => {
    const pos = layout.pos.current;
    if (!pos || !drawNodes.length) return null;
    const t0 = tree.current;
    if (!t0 || t0.nodes !== drawNodes || t0.pos !== pos || t0.v !== posVersion.current) {
      tree.current = {
        nodes: drawNodes,
        pos,
        v: posVersion.current,
        qt: quadtree<DNode>().x((d) => pos[2 * d.i]).y((d) => pos[2 * d.i + 1]).addAll(drawNodes),
        maxR: drawNodes.reduce((m, d) => Math.max(m, d.r), 0),
      };
    }
    const { qt, maxR } = tree.current!;
    // A target of at least 24 CSS pixels (WCAG 2.5.8), whatever the zoom, measured
    // from the middle of the glyph's body.
    const slack = 12 / cam.view.k;
    // The furthest a hit can be from a layout point: a square's corner or the
    // half-round's lower corner (√2·r), a slack circle around the half-round's
    // body (r/2 + slack), or the outline's outer half.
    const R = Math.max(Math.SQRT2 * maxR, maxR / 2 + slack) + OUTLINE_MAX / 2;
    // On the glyph beats near it; among glyphs the topmost (drawn last) wins; among
    // near misses the nearest body, then the topmost.
    let onTop: DNode | null = null;
    let near: DNode | null = null;
    let nearD = Infinity;
    qt.visit((q, x0, y0, x1, y1) => {
      if (x0 > x + R || x1 < x - R || y0 > y + R || y1 < y - R) return true;
      if (!Array.isArray(q)) {
        for (let leaf: QuadtreeLeaf<DNode> | undefined = q as QuadtreeLeaf<DNode>; leaf; leaf = leaf.next) {
          const d = leaf.data;
          const lx = x - pos[2 * d.i];
          const ly = y - pos[2 * d.i + 1];
          if (onGlyph(d.cls, d.r, lx, ly)) {
            if (!onTop || d.i > onTop.i) onTop = d;
            continue;
          }
          const dist = Math.hypot(lx, ly - bodyDy(d.cls, d.r));
          if (dist > slack) continue;
          if (dist < nearD || (dist === nearD && near && d.i > near.i)) {
            near = d;
            nearD = dist;
          }
        }
      }
      return false;
    });
    return onTop ?? near;
  };
  /**
   * The nearest individually drawn relationship, on the segment it is painted on.
   * Candidates are walked in PAINT order — claims, then denials — and a tie goes to
   * the later one, so where two lines coincide the pointer finds the one on top.
   */
  const edgeAt = (x: number, y: number): GEdge | null => {
    const pos = layout.pos.current;
    if (!pos) return null;
    // The hit band the SVG gave each line: max(6, 10/k) wide.
    const tol = Math.max(3, 5 / cam.view.k);
    let best: GEdge | null = null;
    let bestD = tol * tol;
    const test = (l: DLink) => {
      const [ax, ay, bx, by] = segOf(pos, l.s, l.t, off[l.i]);
      const d = segDist2(x, y, ax, ay, bx, by);
      if (d <= bestD) {
        best = l.e;
        bestD = d;
      }
    };
    for (const l of singles) if (l.e.pred !== 'contra') test(l);
    for (const l of singles) if (l.e.pred === 'contra') test(l);
    return best;
  };

  // ---- pointer model ----
  const nodeDrag = useRef<{ d: DNode; ox: number; oy: number; cx: number; cy: number; moved: boolean } | null>(null);
  const downAt = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);

  const onPointerDown = (ev: React.PointerEvent<SVGSVGElement>) => {
    if (ev.button !== 0) return;
    downAt.current = { x: ev.clientX, y: ev.clientY };
    const p = toLocal(ev.clientX, ev.clientY);
    const d = p ? nodeAt(p.x, p.y) : null;
    const pos = layout.pos.current;
    if (d && p && pos) {
      // Tell the camera to keep its hands off this gesture, then take the pointer.
      cam.suspend.current = true;
      nodeDrag.current = { d, ox: pos[2 * d.i] - p.x, oy: pos[2 * d.i + 1] - p.y, cx: ev.clientX, cy: ev.clientY, moved: false };
      ev.currentTarget.setPointerCapture?.(ev.pointerId);
      return;
    }
    panHandlers.onPointerDown(ev);
  };

  const onPointerMove = (ev: React.PointerEvent<SVGSVGElement>) => {
    const nd = nodeDrag.current;
    if (nd) {
      // Under three pixels a drag is still a click.
      if (!nd.moved && Math.hypot(ev.clientX - nd.cx, ev.clientY - nd.cy) < 3) return;
      const p = toLocal(ev.clientX, ev.clientY);
      if (!p) return;
      const x = p.x + nd.ox;
      const y = p.y + nd.oy;
      pinnedAt.current.set(nd.d.id, { x, y });
      layout.pin(nd.d.i, x, y);
      if (!nd.moved) {
        nd.moved = true;
        setPins((s) => new Set(s).add(nd.d.id));
      }
      return;
    }
    if (cam.dragging) {
      panHandlers.onPointerMove(ev);
      return;
    }
    const p = toLocal(ev.clientX, ev.clientY);
    if (!p) return;
    const d = nodeAt(p.x, p.y);
    if ((d?.id ?? null) !== hover && (d || hover)) setHover(d?.id ?? null);
    if (d) return;
    const e = edgeAt(p.x, p.y);
    if (e && e !== activeEdge) onEdgeActive?.(e);
  };

  const endDrag = () => {
    if (nodeDrag.current?.moved) suppressClick.current = true;
    nodeDrag.current = null;
    cam.suspend.current = false;
    panHandlers.onPointerUp();
  };

  const activate = (d: DNode, shift: boolean) => {
    setCursor(d.id);
    if (shift && onPathEnd) onPathEnd(d.id);
    else onSelect?.(selected === d.id ? null : d.id);
  };

  const onClick = (ev: React.MouseEvent<SVGSVGElement>) => {
    // A drag is not a click. Without this, pulling a node out of the tangle — or
    // ending a pan over one — would also select it.
    const from = downAt.current;
    downAt.current = null;
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    // A click raised on an entity or relationship element itself — element.click(),
    // a screen reader's default action, voice control, switch access — may carry no
    // pointer coordinates at all. The element says what was activated; only a click
    // on the layer's own surface is resolved by position.
    if (ev.target !== ev.currentTarget) {
      const d = simById.get(idOf(ev.target) ?? '');
      if (d && isDrawn(d.id)) {
        activate(d, ev.shiftKey);
        return;
      }
      const e = edgeOf(ev.target);
      if (e) {
        onEdgeActive?.(e);
        return;
      }
    }
    if (from && Math.hypot(ev.clientX - from.x, ev.clientY - from.y) >= 3) return;
    const p = toLocal(ev.clientX, ev.clientY);
    if (!p) return;
    const d = nodeAt(p.x, p.y);
    if (d) {
      activate(d, ev.shiftKey);
      return;
    }
    const e = edgeAt(p.x, p.y);
    if (e) onEdgeActive?.(e);
  };

  // ---- keyboard: the examined set and the cursor ----
  const [cursor, setCursor] = useState<string | null>(null);
  const [live, setLive] = useState('');
  const pendingFocus = useRef<string | null>(null);

  /** Where the cursor starts: the drawn entity nearest the middle of the drawn layout. */
  const defaultCursor = useMemo(() => {
    void layout.settled;
    const pos = layout.pos.current;
    if (!drawNodes.length) return null;
    if (!pos) return drawNodes[0].id;
    let cx = 0, cy = 0;
    for (const d of drawNodes) {
      cx += pos[2 * d.i];
      cy += pos[2 * d.i + 1];
    }
    cx /= drawNodes.length;
    cy /= drawNodes.length;
    let best = drawNodes[0];
    let bd = Infinity;
    for (const d of drawNodes) {
      const dd = Math.hypot(pos[2 * d.i] - cx, pos[2 * d.i + 1] - cy);
      if (dd < bd || (dd === bd && d.id < best.id)) {
        best = d;
        bd = dd;
      }
    }
    return best.id;
  }, [drawNodes, layout.settled, layout.pos]);

  const cursorId = cursor && isDrawn(cursor) ? cursor : selected && isDrawn(selected) ? selected : defaultCursor;

  /** One edge's accessible name — the same sentence the SVG version put in its <title>. */
  const edgeTitle = useCallback(
    (e: GEdge) =>
      `${simById.get(e.s)?.n.label ?? e.s} ${isDirected(e.pred) ? '→' : '—'} ${simById.get(e.t)?.n.label ?? e.t} · ${PRED_LABEL[e.pred] ?? e.pred} · ` +
      `${TIERS[e.tier].label.toLowerCase()}${e.a ? ` · ₹${e.a} cr` : ''}${e.lab ? ` · ${e.lab}` : ''}`,
    [simById],
  );

  /**
   * Relationship stops: reachable by Tab only when they belong to what the reader
   * is examining, placed straight after the selected entity (or the path's first
   * end) so Tab walks from the entity into its relationships and then on.
   */
  const tabAnchor = selected && isDrawn(selected) ? selected : path?.ends[0] ?? null;
  const tabEdges = useMemo(
    () => (tabAnchor ? singles.filter((l) => path?.edges.has(l.e) || (!!selected && (l.e.s === selected || l.e.t === selected))) : []),
    [singles, path, selected, tabAnchor],
  );

  /** The examined entities, in a stable order that never depends on the cursor. */
  const examined = useMemo(() => {
    const want = new Set<string>();
    if (selected && isDrawn(selected)) {
      want.add(selected);
      for (const l of drawLinks) {
        if (l.e.s === selected) want.add(l.e.t);
        if (l.e.t === selected) want.add(l.e.s);
      }
    }
    if (path) for (const id of path.nodes) if (isDrawn(id)) want.add(id);
    const ids: string[] = [];
    if (tabAnchor && want.has(tabAnchor)) ids.push(tabAnchor);
    for (const d of drawNodes) if (want.has(d.id) && d.id !== tabAnchor) ids.push(d.id);
    return { ids: ids.slice(0, KEYBOARD_CAP), total: ids.length };
  }, [selected, path, drawLinks, drawNodes, isDrawn, tabAnchor]);

  const overlayNodes = useMemo<A11yNode[]>(() => {
    const ids = [...examined.ids];
    const have = new Set(ids);
    for (const extra of [hover, cursorId]) if (extra && !have.has(extra) && isDrawn(extra)) (have.add(extra), ids.push(extra));
    return ids.flatMap((id) => {
      const d = simById.get(id);
      if (!d) return [];
      return [{ id, i: d.i, d: shapeFor(d.cls, d.r), name: `${d.n.label}${d.n.sub ? `, ${d.n.sub}` : ''}`, pressed: selected === id }];
    });
  }, [examined, hover, cursorId, isDrawn, simById, selected]);

  const overlayEdges = useMemo<A11yEdge[]>(() => {
    const out: A11yEdge[] = [];
    const seen = new Set<DLink>();
    const push = (l: DLink, tabbable: boolean) => {
      if (seen.has(l)) return;
      seen.add(l);
      out.push({ key: l.i, s: l.s, t: l.t, o: off[l.i], title: edgeTitle(l.e), tabbable });
    };
    for (const l of tabEdges) push(l, true);
    const claims = new Set(tabEdges.map((l) => l.e));
    const act = activeEdge ? linkOf.get(activeEdge) : undefined;
    if (act && activeEdge && isDrawn(activeEdge.s) && isDrawn(activeEdge.t)) {
      push(act, false);
      claims.add(activeEdge);
    }
    // A denial answering anything examined is in the layer too: never a claim without its denial.
    for (const l of drawLinks) {
      if (l.e.pred === 'contra' && denials?.answers.get(l.e)?.some((c) => claims.has(c))) push(l, false);
    }
    return out;
  }, [tabEdges, activeEdge, linkOf, isDrawn, drawLinks, denials, edgeTitle, off]);

  const describe = (d: DNode) => {
    let n = 0, alleged = 0, contra = 0;
    for (const l of drawLinks) {
      if (l.e.s !== d.id && l.e.t !== d.id) continue;
      n++;
      if (l.e.tier === 'alleged') alleged++;
      if (l.e.pred === 'contra') contra++;
    }
    return `${d.n.label}, ${d.n.ty}, ${n} relationship${n === 1 ? '' : 's'} in view, ${alleged} alleged, ${contra} denial${contra === 1 ? '' : 's'}`;
  };

  /** Arrow keys on an entity: the nearest drawn entity within 30° of that direction, else within 75°. */
  const moveCursor = (from: DNode, key: string) => {
    const pos = layout.pos.current;
    const dir = DIR[key];
    if (!pos || !dir) return;
    const fx = pos[2 * from.i];
    const fy = pos[2 * from.i + 1];
    const pick = (cosMin: number) => {
      let best: DNode | null = null;
      let bd = Infinity;
      for (const d of drawNodes) {
        if (d === from) continue;
        const vx = pos[2 * d.i] - fx;
        const vy = pos[2 * d.i + 1] - fy;
        const dist = Math.hypot(vx, vy);
        if (!dist || (vx * dir[0] + vy * dir[1]) / dist < cosMin) continue;
        if (dist < bd || (dist === bd && best && d.id < best.id)) {
          best = d;
          bd = dist;
        }
      }
      return best;
    };
    const to = pick(Math.cos(Math.PI / 6)) ?? pick(Math.cos((75 * Math.PI) / 180));
    if (!to) {
      setLive(`No entity further ${dir[2]} of ${from.n.label}.`);
      return;
    }
    // The camera follows the cursor: an entity off-screen is recentred.
    const v = cam.view;
    const sx = pos[2 * to.i] * v.k + v.tx;
    const sy = pos[2 * to.i + 1] * v.k + v.ty;
    const M = 48;
    if (sx < M || sy < M || sx > W - M || sy > H - M) cam.panBy(W / 2 - sx, H / 2 - sy);
    setCursor(to.id);
    pendingFocus.current = to.id;
    setLive(describe(to));
  };

  /**
   * Keyboard focus must not vanish with the node that held it. When a focus or a
   * filter hides the focused entity, the browser drops focus to <body>; hand it to
   * the selected entity if it is still drawn, otherwise to the frame. A hover left
   * on a hidden node is cleared for the same reason — it would dim everything.
   */
  const lastFocusedNode = useRef<string | null>(null);
  useEffect(() => {
    if (hover && !isDrawn(hover)) setHover(null);
    const want = pendingFocus.current;
    if (want) {
      pendingFocus.current = null;
      ref.current?.querySelector<SVGGElement>(`g[data-id="${CSS.escape(want)}"]`)?.focus({ preventScroll: true });
      return;
    }
    // The focused entity is always the cursor, and the cursor is always in the
    // layer, so a drawn entity never loses its element; only hiding it can.
    const id = lastFocusedNode.current;
    if (!id || isDrawn(id)) return;
    lastFocusedNode.current = null;
    const active = document.activeElement;
    if (active && active !== document.body) return;
    const target =
      selected && isDrawn(selected) ? ref.current?.querySelector<SVGGElement>(`g[data-id="${CSS.escape(selected)}"]`) : null;
    (target ?? wrapRef.current)?.focus({ preventScroll: true });
  });

  const idOf = (t: EventTarget | null) => (t as Element | null)?.closest?.('[data-id]')?.getAttribute('data-id') ?? null;
  const edgeOf = (t: EventTarget | null) => {
    const el = (t as Element | null)?.closest?.('[data-edge]');
    return el ? links[Number(el.getAttribute('data-edge'))]?.e ?? null : null;
  };
  const handlersRef = useRef<LayerHandlers | null>(null);
  handlersRef.current = {
    onKeyDown: (ev) => {
      const d = simById.get(idOf(ev.target) ?? '');
      if (!d) return;
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        activate(d, ev.shiftKey);
      } else if (DIR[ev.key] && !ev.altKey && !ev.metaKey && !ev.ctrlKey) {
        // On an entity the arrows walk the graph; on the frame they pan it.
        ev.preventDefault();
        ev.stopPropagation();
        moveCursor(d, ev.key);
      }
    },
    onFocus: (ev) => {
      const e = edgeOf(ev.target);
      if (e) {
        onEdgeActive?.(e);
        return;
      }
      const id = idOf(ev.target);
      if (!id) return;
      lastFocusedNode.current = id;
      setCursor(id);
      setHover(id);
    },
    onBlur: (ev) => {
      // A real destination means the reader moved focus on; none may mean the node
      // was removed from under it, which the effect above repairs.
      if (ev.relatedTarget) lastFocusedNode.current = null;
      if (idOf(ev.target)) setHover(null);
    },
  };
  const handlers = useMemo<LayerHandlers>(
    () => ({
      onKeyDown: (ev) => handlersRef.current?.onKeyDown(ev),
      onFocus: (ev) => handlersRef.current?.onFocus(ev),
      onBlur: (ev) => handlersRef.current?.onBlur(ev),
    }),
    [],
  );

  /**
   * Keyboard camera. Handled on the wrapper so it works whether the frame itself
   * or a node inside it holds focus. `0` is the one key the camera cannot own —
   * only the caller knows what "fit" means for its own content.
   */
  const onKeyDown = (ev: React.KeyboardEvent<HTMLDivElement>) => {
    if (ev.key === '0') {
      fitToContent();
      ev.preventDefault();
      return;
    }
    cam.onKeyDown(ev);
  };

  // ---- the frame ----
  const probe = useMemo(() => {
    let best: DNode | null = null;
    for (const d of drawNodes) if (!best || d.r > best.r || (d.r === best.r && d.id < best.id)) best = d;
    return best;
  }, [drawNodes]);
  const tipNode = hover ? simById.get(hover) ?? null : null;
  const [miniShown, setMiniShown] = useState(false);
  const fontRef = useRef('');

  useLayoutEffect(() => {
    frameRef.current = {
      W,
      H,
      view: cam.view,
      drawNodes,
      singles,
      batches,
      edgeLit,
      litNodes: path ? path.nodes : neighbours,
      path,
      selected,
      activeEdge,
      pins,
      focusNode,
      degree,
      contraW,
      off,
      probe,
      tip: tipNode,
    };
    overlayDirty.current = true;
    requestDraw();
  });
  paintRef.current = () => {
    raf.current = 0;
    const t0 = performance.now();
    const f = frameRef.current;
    const cv = canvasRef.current;
    const svg = ref.current;
    if (!f || !cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const bw = Math.round(f.W * dpr);
    const bh = Math.round(f.H * dpr);
    if (cv.width !== bw || cv.height !== bh) {
      cv.width = bw;
      cv.height = bh;
    }
    if (!fontRef.current) fontRef.current = `9.5px ${getComputedStyle(cv).fontFamily || 'sans-serif'}`;
    const pal = forced ? FORCED : PAL;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, f.W, f.H);
    const pos = layout.pos.current;
    const { k, tx, ty } = f.view;

    if (pos) {
      const X = (i: number) => pos[2 * i];
      const Y = (i: number) => pos[2 * i + 1];
      // Layout space: identical to the SVG's <g transform="translate() scale()">.
      ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * tx, dpr * ty);
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'miter';
      ctx.miterLimit = 4;

      // 1. Batched claims: one stroke per (tier, lit, weight). Canvas restarts the
      //    dash pattern at every moveTo, as SVG does per subpath, so each edge's
      //    dash phase still starts at its source.
      for (const b of f.batches) {
        ctx.beginPath();
        for (const l of b.links) {
          const [ax, ay, bx, by] = segOf(pos, l.s, l.t, f.off[l.i]);
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
        }
        ctx.setLineDash(DASH[b.tier]);
        ctx.lineWidth = b.w;
        ctx.strokeStyle = pal.edge;
        ctx.globalAlpha = b.lit ? 0.55 : 0.1;
        ctx.stroke();
      }

      // 2. Individually drawn claims. Emphasis by tone and opacity only: width is the amount.
      const denialsLast: DLink[] = [];
      for (const l of f.singles) {
        const e = l.e;
        if (e.pred === 'contra') {
          denialsLast.push(l);
          continue;
        }
        const lit = f.edgeLit.get(e) ?? true;
        const isActive = e === f.activeEdge;
        const onPath = !!f.path?.edges.has(e);
        const alpha = !lit ? 0.1 : isActive || onPath ? 0.95 : 0.55;
        const w = edgeWidth(e);
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = isActive ? pal.edgeActive : onPath ? pal.edgePath : pal.edge;
        ctx.lineWidth = w;
        ctx.setLineDash(DASH[e.tier]);
        const [ax, ay, bx, by] = segOf(pos, l.s, l.t, f.off[l.i]);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
        if (isDirected(e.pred)) {
          // The old <marker>: viewBox 8×8, ref (7,4), 5 stroke-widths wide, at the target.
          const ang = Math.atan2(by - ay, bx - ax);
          const sc = (5 * w) / 8;
          const c = Math.cos(ang);
          const s = Math.sin(ang);
          const px = (u: number, v: number) => bx + (u * c - v * s) * sc;
          const py = (u: number, v: number) => by + (u * s + v * c) * sc;
          ctx.fillStyle = pal.arrow;
          ctx.beginPath();
          ctx.moveTo(px(-7, -4), py(-7, -4));
          ctx.lineTo(px(1, 0), py(1, 0));
          ctx.lineTo(px(-7, 4), py(-7, 4));
          ctx.closePath();
          ctx.fill();
        }
      }

      // 3. Denials last, on top: never batched, never dimmer than a claim they
      //    answer, at least as wide, with a cross-bar that survives greyscale.
      for (const l of denialsLast) {
        const e = l.e;
        const lit = f.edgeLit.get(e) ?? true;
        const w = f.contraW.get(e) ?? edgeWidth(e);
        ctx.globalAlpha = lit ? 0.95 : 0.1;
        ctx.strokeStyle = pal.contra;
        ctx.lineWidth = w;
        ctx.setLineDash(DASH[e.tier]);
        const [ax, ay, bx, by] = segOf(pos, l.s, l.t, f.off[l.i]);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
        const mx = (ax + bx) / 2;
        const my = (ay + by) / 2;
        const len = Math.hypot(bx - ax, by - ay) || 1;
        const half = 3 + w;
        const nx = (-(by - ay) / len) * half;
        const ny = ((bx - ax) / len) * half;
        ctx.setLineDash(NO_DASH);
        ctx.beginPath();
        ctx.moveTo(mx - nx, my - ny);
        ctx.lineTo(mx + nx, my + ny);
        ctx.stroke();
      }

      // 4. Nodes — the same path strings, family hue, declared size.
      const vx0 = -tx / k - 30, vy0 = -ty / k - 30, vx1 = (f.W - tx) / k + 30, vy1 = (f.H - ty) / k + 30;
      const strongIds = new Set<string>(f.path ? f.path.ends : []);
      if (f.selected) strongIds.add(f.selected);
      for (const d of f.drawNodes) {
        const x = X(d.i);
        const y = Y(d.i);
        if (x < vx0 || x > vx1 || y < vy0 || y > vy1) continue;
        const dim = f.litNodes ? !f.litNodes.has(d.id) : false;
        const a = dim ? 0.16 : 1;
        const unresolved = d.n.resolved === false;
        const strong = strongIds.has(d.id);
        const p = path2d(d.cls, d.r);
        ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * (tx + x * k), dpr * (ty + y * k));
        ctx.globalAlpha = a * (unresolved ? 0.25 : 0.88);
        ctx.fillStyle = FAMILY_COLOR[d.n.fam];
        ctx.fill(p);
        ctx.globalAlpha = a;
        ctx.setLineDash(unresolved ? UNRESOLVED_DASH : NO_DASH);
        ctx.lineWidth = strong ? 2 : 0.8;
        ctx.strokeStyle = strong ? pal.strong : pal.outline;
        ctx.stroke(p);
        // A pinned node carries a ring, not a colour or a dash — hue is spoken for
        // by family and dashes by identity confidence.
        if (f.pins.has(d.id)) {
          ctx.globalAlpha = a * 0.85;
          ctx.setLineDash(NO_DASH);
          ctx.lineWidth = 1;
          ctx.strokeStyle = pal.ring;
          ctx.beginPath();
          ctx.arc(0, 0, d.r + 3.5, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // 5. Semantic labels, in screen space at 9.5 px. What is named depends on how
      //    closely the reader is looking: zoomed out only the heaviest; at 1x the
      //    heavy and the well-connected; from 2x everything. Scale times degree, so
      //    a hub earns its label sooner as the reader zooms in — never on degree
      //    alone at a distance, where a label would read as a claim that it matters.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = fontRef.current;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.setLineDash(NO_DASH);
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = pal.labelHalo;
      ctx.fillStyle = pal.labelFill;
      for (const d of f.drawNodes) {
        const labelled =
          d.id === f.focusNode ||
          !!f.path?.ends.includes(d.id) ||
          k >= 2 ||
          (k < 0.6 ? d.n.sz === 4 : d.n.sz >= 3 || (f.degree.get(d.id) ?? 0) * k >= 4);
        if (!labelled) continue;
        const sx = tx + X(d.i) * k;
        const sy = ty + (Y(d.i) + d.r) * k + 11;
        if (sx < -150 || sx > f.W + 150 || sy < -20 || sy > f.H + 20) continue;
        ctx.globalAlpha = f.litNodes && !f.litNodes.has(d.id) ? 0.16 : 1;
        ctx.strokeText(d.n.label, sx, sy);
        ctx.fillText(d.n.label, sx, sy);
      }

      // 6. Minimap — only when part of the drawn graph is off-screen. Dots are one
      //    neutral tone: hue belongs to family, and the inset is for orientation.
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const d of f.drawNodes) {
        x0 = Math.min(x0, X(d.i));
        x1 = Math.max(x1, X(d.i));
        y0 = Math.min(y0, Y(d.i));
        y1 = Math.max(y1, Y(d.i));
      }
      const wx0 = -tx / k, wy0 = -ty / k, wx1 = (f.W - tx) / k, wy1 = (f.H - ty) / k;
      const clipped = f.drawNodes.length >= 2 && f.W >= 420 && x0 !== Infinity && !(x0 >= wx0 && x1 <= wx1 && y0 >= wy0 && y1 <= wy1);
      if (clipped) {
        const MW = 140, MH = 100, PAD = 6;
        const s = Math.min((MW - PAD * 2) / Math.max(1, x1 - x0), (MH - PAD * 2) / Math.max(1, y1 - y0));
        const ox = 8 + PAD + ((MW - PAD * 2) - (x1 - x0) * s) / 2 - x0 * s;
        const oy = 8 + PAD + ((MH - PAD * 2) - (y1 - y0) * s) / 2 - y0 * s;
        ctx.globalAlpha = 1;
        ctx.fillStyle = pal.miniBg;
        ctx.strokeStyle = pal.miniEdge;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(8.5, 8.5, MW - 1, MH - 1, 3);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = pal.miniDot;
        for (const d of f.drawNodes) ctx.fillRect(X(d.i) * s + ox - 1, Y(d.i) * s + oy - 1, 2, 2);
        ctx.strokeStyle = pal.miniBox;
        ctx.strokeRect(wx0 * s + ox, wy0 * s + oy, Math.max(2, (wx1 - wx0) * s), Math.max(2, (wy1 - wy0) * s));
      }
      if (clipped !== miniShownRef.current) {
        miniShownRef.current = clipped;
        setMiniShown(clipped);
      }

      // The hovered entity's name, beside it.
      if (tipRef.current && f.tip) {
        tipRef.current.style.transform = `translate(${tx + X(f.tip.i) * k}px, ${ty + (Y(f.tip.i) - f.tip.r) * k - 6}px) translate(-50%, -100%)`;
      }

      // The examined set follows the layout without a React render.
      if (svg && (overlayDirty.current || synced.current.v !== posVersion.current)) {
        syncOverlay(svg, pos);
        overlayDirty.current = false;
        synced.current.v = posVersion.current;
      }

      // Test probes: camera and layout state, read by scripts/graph-viewport.mjs.
      if (svg) {
        svg.setAttribute('data-tick', String(layout.ticks.current));
        svg.setAttribute('data-tx', tx.toFixed(1));
        svg.setAttribute('data-ty', ty.toFixed(1));
        if (synced.current.digestV !== posVersion.current) {
          synced.current.digestV = posVersion.current;
          svg.setAttribute('data-layout', digest(pos));
        }
        svg.setAttribute('data-extent', x0 === Infinity ? '' : `${x0.toFixed(1)},${y0.toFixed(1)},${x1.toFixed(1)},${y1.toFixed(1)}`);
        svg.setAttribute('data-count', String(f.drawNodes.length));
        if (f.probe) {
          svg.setAttribute('data-probe', `${(tx + X(f.probe.i) * k).toFixed(1)},${(ty + Y(f.probe.i) * k).toFixed(1)}`);
          svg.setAttribute('data-probe-id', f.probe.id);
          svg.setAttribute('data-probe-r', String(f.probe.r));
          svg.setAttribute('data-probe-label', f.probe.n.label);
        }
      }
    }
    ctx.globalAlpha = 1;
    // Main-thread cost of this frame, for the perf measurement — not a gate.
    svg?.setAttribute('data-paint-ms', (performance.now() - t0).toFixed(2));
  };
  // The canvas remounts when the frame moves in or out of the maximised view.
  useEffect(() => {
    fontRef.current = '';
    overlayDirty.current = true;
    requestDraw();
  }, [expanded, requestDraw]);

  const drawnCount = drawNodes.length;
  const batchedCount = batches.reduce((n, b) => n + b.links.length, 0);
  const pos = layout.pos.current;

  const frame = (
    <div
      ref={wrapRef}
      className="relative outline-none focus-visible:ring-1 focus-visible:ring-accent"
      style={{ height: expanded ? '100%' : height }}
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label="Graph viewport. Arrow keys pan, plus and minus zoom, 0 fits, f expands. Tab moves into the graph: the keyboard cursor, the selected entity and its relationships, its neighbours and the path. On an entity, arrow keys move to the nearest entity in that direction; Enter selects; Shift+Enter makes the entity the far end of a path; Escape clears the path, then the focus. The table view lists every entity and relationship."
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={
          `Connection graph: ${drawnCount} entities, ${drawLinks.length} relationships. Drag to pan, scroll or the on-screen buttons to zoom, drag a node to pull it out of the tangle. A table view of the same data is available below.` +
          (batched ? ` ${batchedCount} further relationships drawn in batches by tier and not individually inspectable here — the table view lists every one.` : '')
        }
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }}
      />
      <GraphA11y
        svgRef={ref}
        W={W}
        H={H}
        transform={cam.transform}
        label={
          `Entities under examination: ${overlayNodes.length}` +
          (examined.total > KEYBOARD_CAP ? ` — the first ${KEYBOARD_CAP} of ${examined.total}; the table view lists the rest` : '') +
          '. The selection, its neighbours and relationships, the path and the keyboard cursor. The table view is the complete accessible listing.'
        }
        nodes={overlayNodes}
        edges={overlayEdges}
        anchor={tabAnchor}
        pos={pos}
        handlers={handlers}
        live={live}
        svgProps={{
          style: {
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            display: 'block',
            touchAction: 'none',
            cursor: cam.dragging ? 'grabbing' : hover && !nodeDrag.current ? 'pointer' : 'grab',
          },
          'data-graph': 'canvas',
          'data-driver': layout.driver,
          'data-settled': layout.settled,
          'data-k': cam.view.k.toFixed(3),
          'data-batched': batched ? 'true' : undefined,
          'data-pinned': pinnedIds.join(' '),
          onPointerDown,
          onPointerMove,
          onPointerUp: endDrag,
          onPointerLeave: () => {
            endDrag();
            if (hover && !lastFocusedNode.current) setHover(null);
          },
          onClick,
        }}
      />

      {tipNode && pos && (
        <div
          ref={tipRef}
          aria-hidden="true"
          className="absolute left-0 top-0 pointer-events-none font-mono text-[10.5px] leading-tight px-1.5 py-0.5 rounded bg-bg/90 border border-border text-text-secondary whitespace-nowrap"
          style={{
            transform: `translate(${cam.view.tx + pos[2 * tipNode.i] * cam.view.k}px, ${cam.view.ty + (pos[2 * tipNode.i + 1] - tipNode.r) * cam.view.k - 6}px) translate(-50%, -100%)`,
          }}
        >
          {tipNode.n.label}
          {tipNode.n.sub ? ` — ${tipNode.n.sub}` : ''}
        </div>
      )}

      {!drawnCount && (
        <p className="absolute inset-0 grid place-items-center text-[13px] text-text-muted pointer-events-none">
          No entities match these filters.
        </p>
      )}

      <CameraControls cam={cam} onFit={fitToContent} />

      {/* The edge card, inside the frame while maximised — below the zoom cluster,
          above the pan pad, in the untransformed layer. */}
      {expanded && card && (
        <div className="absolute top-10 right-2 w-[22rem] max-w-[45%] max-h-[calc(100%-8.5rem)] overflow-y-auto">{card}</div>
      )}

      <div className="absolute bottom-2 left-2 max-w-[62%] font-mono text-[10px] leading-relaxed text-text-muted bg-bg/85 px-1.5 py-0.5 rounded space-y-0.5">
        {status}
        <p>
          drag to pan · arrows or the pad to move · +/− or scroll to zoom · 0 fits · f maximises · drag a node to pull it out ·
          shift-click a second entity for the shortest path
          {pinnedIds.length > 0 && (
            <>
              {' '}·{' '}
              <button onClick={releasePins} className="text-accent underline underline-offset-2">
                release {pinnedIds.length} pinned
              </button>
            </>
          )}
        </p>
        {batched && (
          <p>
            {drawLinks.length} relationships: denials, path steps, the edge on the card and — when it has {INCIDENT_MAX} or
            fewer neighbours — the hovered or selected entity's own edges are drawn one by one; the other{' '}
            {batchedCount} are batched by tier, without arrows, and cannot be hovered. Focus or filter
            to inspect them, or use the table view.
          </p>
        )}
        {miniShown && <p>inset: the whole drawn graph · box: your view</p>}
      </div>
    </div>
  );

  return (
    <ExpandShell
      expanded={expanded}
      onClose={() => cam.setExpanded(false)}
      caption={caption ?? `${drawnCount} entities · ${drawLinks.length} relationships · filters stay applied`}
    >
      {frame}
    </ExpandShell>
  );
}
