import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  forceSimulation, forceLink, forceManyBody, forceCollide, forceX, forceY,
  type Simulation, type SimulationNodeDatum,
} from 'd3-force';
import { TIERS, TIER_ORDER, type GNode, type GEdge, type Tier, type NodeFamily, type NodeType, type Predicate } from '../../graph/schema';
import { useCamera, CameraControls, ExpandShell } from './camera';

/**
 * The connection graph.
 *
 * Edge style carries the EVIDENCE TIER — solid / dashed / dotted / dot-dash. That
 * is semantic, not decorative, and is never restyled for looks. Node shape carries
 * type, hue carries family, radius carries weight: three orthogonal channels,
 * never overloaded. Line weight carries the ₹ amount and nothing else — emphasis
 * is done with opacity and tone, never by widening a line.
 *
 * VIEWPORT MODEL — the thing that was broken.
 *
 * The svg used to carry a fixed `viewBox="0 0 900 620"` with the default
 * preserveAspectRatio. Two consequences, both of which made the graph unusable and
 * neither of which was visible in the code:
 *
 *   1. The drawing area was LETTERBOXED inside the element. On a wide card the
 *      graph was pinned to a 1.45 aspect box with dead margin either side, so
 *      "expand" bought blank space rather than graph.
 *   2. Pan was mathematically WRONG. It mapped the cursor through `rect.width`,
 *      but the viewBox does not span `rect.width` when letterboxed — so the graph
 *      slid at a different rate than the pointer. That is why dragging felt broken
 *      rather than merely awkward.
 *
 * Now the viewBox is MEASURED from the element with a ResizeObserver, so one
 * viewBox unit is one CSS pixel: no letterbox, drag is exact, and expanding really
 * does hand the graph the whole window. The force layout is computed around the
 * origin and is deliberately independent of the viewport — resizing refits the
 * camera and never re-runs the simulation.
 *
 * THE LAYOUT IS A FUNCTION OF THE FILTERED GRAPH, AND OF NOTHING ELSE.
 *
 * It always starts cold and runs exactly LAYOUT_TICKS ticks — spread across frames
 * when motion is allowed, all at once when it is not — so the same URL draws the
 * same picture on any machine, at any frame rate, whatever the reader clicked
 * before. (It used to warm-start from the previous layout and stop on a wall-clock
 * timer, which made a shared link reproduce the captions but not the picture.)
 * Pinned nodes are the one exception, and they wear a ring that says so.
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
};

/**
 * The predicates that carry a direction the data actually records: money or an
 * award moving from one party to another. Only these get an arrowhead or an "→".
 * An arrow on "family" or on an analytic comparison would assert a direction that
 * nobody has claimed.
 */
const DIRECTED = new Set<Predicate>(['bond', 'trust', 'direct', 'pmin', 'pmout', 'csr', 'award']);
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

interface SimNode extends SimulationNodeDatum {
  n: GNode;
  id: string;
  r: number;
  cls: ShapeClass;
}
interface SimLink {
  source: SimNode | string;
  target: SimNode | string;
  e: GEdge;
  /** Position in simLinks — what the delegated handlers read back off `data-edge`. */
  i: number;
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

/** How far apart the family bands sit in layout units. Not a pixel measure. */
const BAND = 230;

/**
 * Ticks per layout. d3's default alpha decay reaches alphaMin at 300, so this is
 * "run to the natural end" — fixed, so the result never depends on frame rate.
 */
const LAYOUT_TICKS = 300;
/** Ticks after releasing pins: a nudge from alpha 0.3, not a re-layout. */
const RELEASE_TICKS = 120;
/** Main-thread budget per animation frame while the layout runs. */
const FRAME_BUDGET_MS = 10;

/**
 * Above this many drawn relationships, non-contra edges are batched into one
 * <path> per tier and weight band. Per-edge <line>s with <title>s stay below it.
 * The number is where a mid-range laptop stopped holding frame rate during the
 * settle, not a principled constant.
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

/**
 * Advance a stopped simulation by exactly `n` ticks, spread across frames. The tick
 * count is fixed and the frame budget only decides how many land per frame, so the
 * end state is identical on a fast machine and a slow one.
 */
function stepSim(sim: Simulation<SimNode, undefined>, n: number, onFrame: () => void, onDone: () => void): () => void {
  let left = n;
  let raf = 0;
  const step = () => {
    const t0 = performance.now();
    while (left > 0 && performance.now() - t0 < FRAME_BUDGET_MS) {
      sim.tick();
      left--;
    }
    onFrame();
    if (left > 0) raf = requestAnimationFrame(step);
    else onDone();
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

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
  selected,
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
  const simRef = useRef<Simulation<SimNode, undefined> | null>(null);
  const [tick, setTick] = useState(0);
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
   * ERROR, which is a hard failure of the render smoke gate. It is also
   * intermittent, which is the worst kind of gate failure to inherit: it passed
   * three runs out of four before this comment existed.
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
   * remounts the wrapper, and focus used to fall to <body>: the arrow keys stopped
   * panning and Escape went straight to the camera, skipping the path/focus peel.
   * Skipped on mount so loading a page never steals focus.
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

  /** Set once per layout, so a user who has panned is not yanked back on every tick. */
  const fittedFor = useRef<string>('');
  /**
   * Bumped when the simulation stops. Fitting has to wait for this: d3 seeds nodes
   * in a small spiral near the origin, so fitting on the first tick fits the seed
   * cluster — which is exactly the bug this replaced. It zoomed IN to 1.6x on a
   * graph whose nodes then spread far outside the frame, leaving 196 of 224 clipped.
   */
  const [settledAt, setSettledAt] = useState(0);

  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const stableNodes = useStableList(nodes);
  const stableEdges = useStableList(edges);

  /** Where the reader pinned nodes. Survives a re-layout; released by the button. */
  const pinnedAt = useRef<Map<string, { x: number; y: number }>>(new Map());

  const { simNodes, simLinks, simById } = useMemo(() => {
    const pinned = pinnedAt.current;
    const list = stableNodes.map<SimNode>((n) => {
      const d: SimNode = { n, id: n.id, r: 4 + n.sz * 3.2, cls: shapeClassOf(n.ty) };
      const p = pinned.get(n.id);
      if (p) {
        d.x = d.fx = p.x;
        d.y = d.fy = p.y;
      }
      return d;
    });
    const byId = new Map(list.map((d) => [d.id, d]));
    const links: SimLink[] = [];
    for (const e of stableEdges) {
      if (byId.has(e.s) && byId.has(e.t)) links.push({ source: e.s, target: e.t, e, i: links.length });
    }
    return { simNodes: list, simLinks: links, simById: byId };
  }, [stableNodes, stableEdges]);

  /** Cancels whichever tick run is in flight — the layout's or a pin release's. */
  const cancelRun = useRef<() => void>(() => {});
  useEffect(() => () => cancelRun.current(), []);

  /**
   * The layout runs in its own coordinate space, centred on the origin, and knows
   * nothing about the viewport. That decoupling is what lets the window resize,
   * the panel expand and the camera refit WITHOUT re-running the simulation and
   * throwing away a layout the reader was already reading.
   */
  useEffect(() => {
    cancelRun.current();
    simRef.current?.stop();
    if (!simNodes.length) {
      setTick((t) => t + 1);
      return;
    }
    // Created stopped: d3's own timer is wall-clock driven, which is the thing
    // that made the picture depend on the machine.
    const sim = forceSimulation<SimNode>(simNodes)
      .stop()
      .force('link', forceLink<SimNode, SimLink>(simLinks as never).id((d) => (d as SimNode).id).distance(78).strength(0.55))
      .force('charge', forceManyBody().strength(-190))
      .force('collide', forceCollide<SimNode>().radius((d) => d.r + 7))
      // Families settle into bands — public power left, capital right — so the
      // layout reads as a flow rather than a hairball.
      .force('x', forceX<SimNode>((d) => (d.n.fam === 'state' ? -BAND : d.n.fam === 'capital' ? BAND : 0)).strength(0.09))
      .force('y', forceY<SimNode>(0).strength(0.05));
    simRef.current = sim;

    const frame = () => setTick((t) => t + 1);
    const done = () => setSettledAt((n) => n + 1);
    if (reduced) {
      // Reduced motion: the settled picture, pre-ticked, with nothing in between.
      sim.tick(LAYOUT_TICKS);
      frame();
      done();
      return;
    }
    cancelRun.current = stepSim(sim, LAYOUT_TICKS, frame, done);
    return () => cancelRun.current();
  }, [simNodes, simLinks, reduced]);

  /** What is actually drawn: the layout, minus whatever the ego focus hides. */
  const { drawNodes, drawLinks } = useMemo(() => {
    if (!shown) return { drawNodes: simNodes, drawLinks: simLinks };
    return {
      drawNodes: simNodes.filter((d) => shown.has(d.id)),
      drawLinks: simLinks.filter((l) => shown.has(l.e.s) && shown.has(l.e.t)),
    };
  }, [simNodes, simLinks, shown]);

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
   * Fit the settled layout into the frame.
   *
   * Computes the bounding box of the drawn nodes — the focused set when focus is on
   * — including label overhang, and sets the transform so the whole thing lands
   * inside the measured frame with a margin. Runs once per layout, once per resize
   * and once per focus change, so panning is never yanked back but a window change
   * never strands the graph off-screen either.
   */
  const fitToContent = useCallback(() => {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    // Labels sit below and either side of a node, so the box is padded asymmetrically.
    const LABEL_PAD_X = 60;
    const LABEL_PAD_Y = 16;
    for (const d of drawNodes) {
      if (d.x == null || d.y == null) continue;
      x0 = Math.min(x0, d.x - d.r - LABEL_PAD_X);
      x1 = Math.max(x1, d.x + d.r + LABEL_PAD_X);
      y0 = Math.min(y0, d.y - d.r - LABEL_PAD_Y);
      y1 = Math.max(y1, d.y + d.r + LABEL_PAD_Y * 2);
    }
    if (x0 === Infinity) return;
    fitTo({ x0, x1, y0, y1 });
  }, [drawNodes, fitTo]);

  // Refit when the layout SETTLES, when the frame RESIZES and when the FOCUS
  // changes — keyed so each of those happens exactly once, and a deliberate pan is
  // never overridden.
  useEffect(() => {
    if (!settledAt) return;
    const key = `${simNodes.length}:${simNodes[0]?.id ?? ''}:${settledAt}:${W}x${H}:${focusKey}`;
    if (fittedFor.current === key) return;
    if (!simNodes.length || simNodes[0].x == null) return;
    fittedFor.current = key;
    fitToContent();
  }, [settledAt, simNodes, fitToContent, W, H, focusKey]);

  /**
   * Keyboard focus must not vanish with the node that held it. When a focus or a
   * filter hides the focused entity, the browser drops focus to <body>; hand it to
   * the selected entity if it is still drawn, otherwise to the frame. A hover left
   * on a hidden node is cleared for the same reason — it would dim everything.
   */
  const lastFocusedNode = useRef<string | null>(null);
  useEffect(() => {
    if (hover && !isDrawn(hover)) setHover(null);
    const id = lastFocusedNode.current;
    if (!id || isDrawn(id)) return;
    lastFocusedNode.current = null;
    const active = document.activeElement;
    if (active && active !== document.body) return;
    const target =
      selected && isDrawn(selected)
        ? ref.current?.querySelector<SVGGElement>(`[data-id="${CSS.escape(selected)}"]`)
        : null;
    (target ?? wrapRef.current)?.focus({ preventScroll: true });
  }, [isDrawn, selected, hover]);

  /**
   * What is lit. A path, when there is one, wins outright — it is the question the
   * reader asked. Otherwise the hovered or selected node and its neighbours.
   */
  const neighbours = useMemo(() => {
    if (path) return null;
    const focus = hover ?? selected;
    if (!focus) return null;
    const s = new Set<string>([focus]);
    for (const l of drawLinks) {
      if (l.e.s === focus) s.add(l.e.t);
      if (l.e.t === focus) s.add(l.e.s);
    }
    return s;
  }, [hover, selected, drawLinks, path]);

  const nodeLit = (id: string) => (path ? path.nodes.has(id) : neighbours ? neighbours.has(id) : true);

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
   * Which edges are drawn one by one and which are batched. Decided here, per
   * change of emphasis, never per tick: the tick only rebuilds `d` strings.
   *
   * Always drawn individually: denials (they must stay as loud as their claims and
   * keep their <title>), path edges, the edge on the card, and the hovered or
   * selected entity's own edges when it has INCIDENT_MAX neighbours or fewer.
   */
  const focusNode = hover ?? selected;
  const { singles, batches, batched } = useMemo(() => {
    if (drawLinks.length <= BATCH_OVER) return { singles: drawLinks, batches: [], batched: false };
    const incident = neighbours && neighbours.size <= INCIDENT_MAX;
    const one: SimLink[] = [];
    const groups = new Map<string, { tier: Tier; lit: boolean; w: number; links: SimLink[] }>();
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

  /** Batch `d` strings — rebuilt per tick and per regrouping, never per hover. */
  const batchPaths = useMemo(() => {
    void tick;
    return batches.map((b) => {
      let d = '';
      for (const l of b.links) {
        const s = l.source as SimNode;
        const t = l.target as SimNode;
        if (typeof s === 'string' || typeof t === 'string' || s.x == null || t.x == null) continue;
        d += `M${s.x.toFixed(1)} ${s.y!.toFixed(1)}L${t.x.toFixed(1)} ${t.y!.toFixed(1)}`;
      }
      return d;
    });
  }, [batches, tick]);

  /**
   * Node dragging, and the click/drag disambiguation it forces.
   *
   * Dragging a node PINS it (d3's fx/fy), because the useful thing to do with a
   * hairball is pull one strand out of it and have it stay pulled. A drag under
   * three pixels is treated as a click so selection still works.
   */
  const nodeDrag = useRef<{ d: SimNode; ox: number; oy: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [pins, setPins] = useState<Set<string>>(new Set());
  const pinCount = useMemo(() => simNodes.reduce((c, d) => c + (pins.has(d.id) && d.fx != null ? 1 : 0), 0), [simNodes, pins]);

  /** The node under an event, read off `data-id` — one handler per layer, not seven per node. */
  const nodeAt = (t: EventTarget | null): SimNode | null => {
    const el = (t as Element | null)?.closest?.('[data-id]');
    return el ? simById.get(el.getAttribute('data-id') ?? '') ?? null : null;
  };
  const edgeAt = (t: EventTarget | null): GEdge | null => {
    const el = (t as Element | null)?.closest?.('[data-edge]');
    return el ? simLinks[Number(el.getAttribute('data-edge'))]?.e ?? null : null;
  };

  const onNodePointerDown = (ev: React.PointerEvent<SVGGElement>) => {
    if (ev.button !== 0) return;
    const d = nodeAt(ev.target);
    if (!d) return;
    ev.stopPropagation();
    const p = toLocal(ev.clientX, ev.clientY);
    if (!p) return;
    // Tell the camera to keep its hands off this gesture, then take the pointer.
    cam.suspend.current = true;
    nodeDrag.current = { d, ox: (d.x ?? 0) - p.x, oy: (d.y ?? 0) - p.y, moved: false };
    (ev.target as Element).setPointerCapture?.(ev.pointerId);
  };

  const onPointerMove = (ev: React.PointerEvent<SVGSVGElement>) => {
    const nd = nodeDrag.current;
    if (!nd) {
      panHandlers.onPointerMove(ev);
      return;
    }
    const p = toLocal(ev.clientX, ev.clientY);
    if (!p) return;
    nd.d.fx = nd.d.x = p.x + nd.ox;
    nd.d.fy = nd.d.y = p.y + nd.oy;
    pinnedAt.current.set(nd.d.id, { x: nd.d.x, y: nd.d.y });
    if (!nd.moved) {
      nd.moved = true;
      setPins((s) => new Set(s).add(nd.d.id));
    }
    setTick((t) => t + 1);
  };

  const endDrag = () => {
    if (nodeDrag.current?.moved) suppressClick.current = true;
    nodeDrag.current = null;
    cam.suspend.current = false;
    panHandlers.onPointerUp();
  };

  const activate = (d: SimNode, shift: boolean) => {
    if (shift && onPathEnd) onPathEnd(d.id);
    else onSelect?.(selected === d.id ? null : d.id);
  };

  const onNodeClick = (ev: React.MouseEvent<SVGGElement>) => {
    const d = nodeAt(ev.target);
    if (!d) return;
    // A drag is not a click. Without this, pulling a node out of the tangle would
    // also select it.
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    activate(d, ev.shiftKey);
  };

  const onNodeKeyDown = (ev: React.KeyboardEvent<SVGGElement>) => {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    const d = nodeAt(ev.target);
    if (!d) return;
    ev.preventDefault();
    activate(d, ev.shiftKey);
  };

  const onLayerFocus = (ev: React.FocusEvent<SVGGElement>) => {
    const e = edgeAt(ev.target);
    if (e) {
      onEdgeActive?.(e);
      return;
    }
    const d = nodeAt(ev.target);
    if (!d) return;
    lastFocusedNode.current = d.id;
    setHover(d.id);
  };

  const onLayerBlur = (ev: React.FocusEvent<SVGGElement>) => {
    // A real destination means the reader moved focus on; none may mean the node
    // was removed from under it, which the effect above repairs.
    if (ev.relatedTarget) lastFocusedNode.current = null;
    if (nodeAt(ev.target)) setHover(null);
  };

  /** Release every pinned node and let the layout re-settle around the change. */
  const releasePins = () => {
    for (const d of simNodes) {
      delete d.fx;
      delete d.fy;
    }
    pinnedAt.current.clear();
    setPins(new Set());
    const sim = simRef.current;
    if (!sim) return;
    cancelRun.current();
    sim.alpha(0.3);
    const frame = () => setTick((t) => t + 1);
    const done = () => setSettledAt((n) => n + 1);
    if (reduced) {
      sim.tick(RELEASE_TICKS);
      frame();
      done();
      return;
    }
    cancelRun.current = stepSim(sim, RELEASE_TICKS, frame, done);
  };

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

  const k = cam.view.k;

  /**
   * Semantic labels: what is named depends on how closely the reader is looking.
   * Zoomed out, only the heaviest entities; at 1x, the heavy and the well-connected;
   * from 2x, everything. Scale times degree, so a hub earns its label sooner as the
   * reader zooms in — but never on degree alone at a distance, where a hub's label
   * would read as a claim that it matters.
   */
  const labelled = (d: SimNode) => {
    if (d.id === focusNode || path?.ends.includes(d.id)) return true;
    if (k >= 2) return true;
    if (k < 0.6) return d.n.sz === 4;
    return d.n.sz >= 3 || (degree.get(d.id) ?? 0) * k >= 4;
  };

  const nameOf = (id: string) => simById.get(id)?.n.label ?? id;

  /** One edge's title — the a11y surface, kept on every individually drawn edge. */
  const edgeTitle = (e: GEdge) =>
    `${nameOf(e.s)} ${isDirected(e.pred) ? '→' : '—'} ${nameOf(e.t)} · ${PRED_LABEL[e.pred] ?? e.pred} · ` +
    `${TIERS[e.tier].label.toLowerCase()}${e.a ? ` · ₹${e.a} cr` : ''}${e.lab ? ` · ${e.lab}` : ''}`;

  /**
   * Reachable by Tab only when it belongs to what the reader is examining;
   * otherwise several hundred edges would sit in the tab order. Their focus
   * stops are placed straight after the selected entity (or the path's first
   * end), so Tab walks from the entity into its relationships and then on through
   * the other entities — never through relationships before the first entity.
   */
  const tabAnchor = selected && isDrawn(selected) ? selected : path?.ends[0] ?? null;
  const tabEdges = useMemo(
    () => (tabAnchor ? singles.filter((l) => path?.edges.has(l.e) || (!!selected && (l.e.s === selected || l.e.t === selected))) : []),
    [singles, path, selected, tabAnchor],
  );
  const tabSet = useMemo(() => new Set(tabEdges), [tabEdges]);

  /** Minimap geometry, only when part of the drawn graph is off-screen. */
  const mini = useMemo(() => {
    void tick;
    if (drawNodes.length < 2 || W < 420) return null;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const d of drawNodes) {
      if (d.x == null || d.y == null) continue;
      x0 = Math.min(x0, d.x);
      x1 = Math.max(x1, d.x);
      y0 = Math.min(y0, d.y);
      y1 = Math.max(y1, d.y);
    }
    if (x0 === Infinity) return null;
    const v = cam.view;
    const vx0 = -v.tx / v.k, vy0 = -v.ty / v.k, vx1 = (W - v.tx) / v.k, vy1 = (H - v.ty) / v.k;
    if (x0 >= vx0 && x1 <= vx1 && y0 >= vy0 && y1 <= vy1) return null;
    const MW = 140, MH = 100, PAD = 6;
    const s = Math.min((MW - PAD * 2) / Math.max(1, x1 - x0), (MH - PAD * 2) / Math.max(1, y1 - y0));
    const ox = PAD + ((MW - PAD * 2) - (x1 - x0) * s) / 2 - x0 * s;
    const oy = PAD + ((MH - PAD * 2) - (y1 - y0) * s) / 2 - y0 * s;
    let dots = '';
    for (const d of drawNodes) {
      if (d.x == null || d.y == null) continue;
      dots += `M${(d.x * s + ox - 1).toFixed(1)} ${(d.y * s + oy - 1).toFixed(1)}h2v2h-2z`;
    }
    return { dots, rect: { x: vx0 * s + ox, y: vy0 * s + oy, w: (vx1 - vx0) * s, h: (vy1 - vy0) * s }, MW, MH };
  }, [drawNodes, cam.view, W, H, tick]);

  const renderLine = (l: SimLink) => {
    const s = l.source as SimNode;
    const t = l.target as SimNode;
    if (typeof s === 'string' || typeof t === 'string' || s.x == null || t.x == null) return null;
    const e = l.e;
    const lit = edgeLit.get(e) ?? true;
    const isContra = e.pred === 'contra';
    const isActive = e === activeEdge;
    const onPath = !!path?.edges.has(e);
    return (
      <EdgeLine
        key={l.i}
        i={l.i}
        x1={s.x}
        y1={s.y!}
        x2={t.x}
        y2={t.y!}
        // Emphasis by tone and opacity only: width is the amount channel.
        stroke={isContra ? '#c45b5a' : isActive ? 'rgba(244,240,232,1)' : onPath ? 'rgba(232,228,220,0.85)' : 'rgba(232,228,220,0.30)'}
        width={edgeWidth(e)}
        dash={TIERS[e.tier].dash}
        opacity={!lit ? 0.1 : isContra || isActive || onPath ? 0.95 : 0.55}
        arrow={isDirected(e.pred)}
        hit={Math.max(6, 10 / k)}
        title={edgeTitle(e)}
        // The focus stop carries the accessible name when there is one; this copy
        // would otherwise be announced twice.
        hidden={tabSet.has(l)}
      />
    );
  };

  const edgeStops = tabEdges.length > 0 && (
    <g key="edge-stops">
      {tabEdges.map((l) => {
        const s = l.source as SimNode;
        const t = l.target as SimNode;
        if (typeof s === 'string' || typeof t === 'string' || s.x == null || t.x == null) return null;
        const title = edgeTitle(l.e);
        return (
          <g
            key={l.i}
            data-edge={l.i}
            role="img"
            aria-roledescription="relationship"
            aria-label={title}
            tabIndex={0}
            pointerEvents="none"
            className="outline-none [&:focus-visible>line]:stroke-accent"
          >
            <line x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke="transparent" strokeWidth={3 / k} />
            <title>{title}</title>
          </g>
        );
      })}
    </g>
  );

  const frame = (
    <div
      ref={wrapRef}
      className="relative outline-none focus-visible:ring-1 focus-visible:ring-accent"
      style={{ height: expanded ? '100%' : height }}
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label="Graph viewport. Arrow keys pan, plus and minus zoom, 0 fits, f expands. Tab moves through entities, and from the selected entity into its relationships; Enter selects; Shift+Enter makes the entity the far end of a path; Escape clears the path, then the focus."
    >
      <svg
        ref={ref}
        // Measured, not assumed: one unit is one pixel, so there is no letterbox
        // and a drag moves the graph exactly as far as the pointer moved.
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          touchAction: 'none',
          cursor: cam.dragging ? 'grabbing' : 'grab',
        }}
        // A group, not an img: role="img" makes every child presentational, which
        // silently removed every focusable node from the accessibility tree.
        role="group"
        aria-label={`Connection graph: ${drawNodes.length} entities, ${drawLinks.length} relationships. Drag to pan, scroll or the on-screen buttons to zoom, drag a node to pull it out of the tangle. A table view of the same data is available below.`}
        data-tick={tick}
        data-settled={settledAt}
        data-k={k.toFixed(3)}
        data-batched={batched ? 'true' : undefined}
        onPointerDown={panHandlers.onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
      <defs>
        <marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M 0 0 L 8 4 L 0 8 z" fill="rgba(232,228,220,0.35)" />
        </marker>
      </defs>

      <g transform={cam.transform}>
      {batched && (
        // Not individually inspectable, so it says so once rather than hiding a
        // <title> per batch where no pointer or screen reader can reach it.
        <g
          pointerEvents="none"
          role="img"
          aria-label={`${batches.reduce((n, b) => n + b.links.length, 0)} further relationships drawn in batches by tier and not individually inspectable here — the table view lists every one.`}
        >
          {batches.map((b, i) => (
            <path
              key={`${b.tier}|${b.lit}|${b.w}`}
              d={batchPaths[i]}
              fill="none"
              stroke="rgba(232,228,220,0.30)"
              strokeWidth={b.w}
              strokeDasharray={TIERS[b.tier].dash || undefined}
              opacity={b.lit ? 0.55 : 0.1}
            />
          ))}
        </g>
      )}
      <g
        onMouseOver={(ev) => {
          const e = edgeAt(ev.target);
          if (e && e !== activeEdge) onEdgeActive?.(e);
        }}
        onClick={(ev) => {
          const e = edgeAt(ev.target);
          if (e) onEdgeActive?.(e);
        }}
      >
        {singles.map(renderLine)}
      </g>

      <g
        onPointerDown={onNodePointerDown}
        onClick={onNodeClick}
        onKeyDown={onNodeKeyDown}
        onFocus={onLayerFocus}
        onBlur={onLayerBlur}
        onMouseOver={(ev) => {
          const d = nodeAt(ev.target);
          if (d) setHover(d.id);
        }}
        onMouseOut={(ev) => {
          if (!nodeAt(ev.relatedTarget)) setHover(null);
        }}
      >
        {drawNodes.flatMap((d) => {
          if (d.x == null || d.y == null) return [];
          const isSel = selected === d.id;
          const isEnd = !!path?.ends.includes(d.id);
          const label = labelled(d) ? d.n.label : null;
          const glyph = (
            <NodeGlyph
              key={d.id}
              id={d.id}
              x={d.x}
              y={d.y}
              shape={shapeFor(d.cls, d.r)}
              r={d.r}
              fill={FAMILY_COLOR[d.n.fam]}
              unresolved={d.n.resolved === false}
              dim={!nodeLit(d.id)}
              selected={isSel}
              strong={isSel || isEnd}
              pinned={pins.has(d.id)}
              label={label}
              k={label ? k : 0}
              name={`${d.n.label}${d.n.sub ? `, ${d.n.sub}` : ''}`}
              title={`${d.n.label}${d.n.sub ? ` — ${d.n.sub}` : ''}`}
            />
          );
          return d.id === tabAnchor && edgeStops ? [glyph, edgeStops] : [glyph];
        })}
      </g>

      </g>

      {/* Minimap — in the untransformed layer, inert to the pointer so it can never
          swallow a click meant for a node beneath it. Dots are one neutral tone:
          hue belongs to family, and the inset is for orientation, not reading. */}
      {mini && (
        <svg x={8} y={8} width={mini.MW} height={mini.MH} pointerEvents="none" aria-hidden="true">
          <rect x={0.5} y={0.5} width={mini.MW - 1} height={mini.MH - 1} rx={3} fill="rgba(10,10,12,0.88)" stroke="rgba(244,240,232,0.15)" />
          <path d={mini.dots} fill="rgba(232,228,220,0.55)" />
          <rect
            x={mini.rect.x}
            y={mini.rect.y}
            width={Math.max(2, mini.rect.w)}
            height={Math.max(2, mini.rect.h)}
            fill="none"
            stroke="#c9a86c"
            strokeWidth={1}
          />
        </svg>
      )}

      {!drawNodes.length && (
        <text x={W / 2} y={H / 2} textAnchor="middle" fill="rgba(232,228,220,0.4)" fontSize="13">
          No entities match these filters.
        </text>
      )}
      </svg>

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
          {pinCount > 0 && (
            <>
              {' '}·{' '}
              <button onClick={releasePins} className="text-accent underline underline-offset-2">
                release {pinCount} pinned
              </button>
            </>
          )}
        </p>
        {batched && (
          <p>
            {drawLinks.length} relationships: denials, path steps, the edge on the card and — when it has {INCIDENT_MAX} or
            fewer neighbours — the hovered or selected entity's own edges are drawn one by one; the other{' '}
            {drawLinks.length - singles.length} are batched by tier, without arrows, and cannot be hovered. Focus or filter
            to inspect them, or use the table view.
          </p>
        )}
        {mini && <p>inset: the whole drawn graph · box: your view</p>}
      </div>
    </div>
  );

  return (
    <ExpandShell
      expanded={expanded}
      onClose={() => cam.setExpanded(false)}
      caption={caption ?? `${drawNodes.length} entities · ${drawLinks.length} relationships · filters stay applied`}
    >
      {frame}
    </ExpandShell>
  );
}

/**
 * One drawn relationship. Memoised so a hover after the layout has settled only
 * re-renders the edges whose emphasis actually changed.
 */
const EdgeLine = memo(function EdgeLine({
  i, x1, y1, x2, y2, stroke, width, dash, opacity, arrow, hit, title, hidden,
}: {
  i: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: string;
  width: number;
  dash: string;
  opacity: number;
  arrow: boolean;
  hit: number;
  title: string;
  hidden: boolean;
}) {
  return (
    <g
      data-edge={i}
      role={hidden ? undefined : 'img'}
      aria-roledescription={hidden ? undefined : 'relationship'}
      aria-label={hidden ? undefined : title}
      aria-hidden={hidden || undefined}
    >
      {/* Hit area. A 0.7-unit dashed line is not something a pointer can find. */}
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={hit} pointerEvents="stroke" />
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={stroke}
        strokeWidth={width}
        strokeDasharray={dash || undefined}
        opacity={opacity}
        markerEnd={arrow ? 'url(#arrow)' : undefined}
        pointerEvents="none"
      />
      <title>{title}</title>
    </g>
  );
});

/**
 * One entity. Handlers live on the layer, not here — the glyph is pure, so after
 * the layout settles a hover re-renders only the glyphs whose emphasis changed.
 */
const NodeGlyph = memo(function NodeGlyph({
  id, x, y, shape, r, fill, unresolved, dim, selected, strong, pinned, label, k, name, title,
}: {
  id: string;
  x: number;
  y: number;
  shape: string;
  r: number;
  fill: string;
  unresolved: boolean;
  dim: boolean;
  selected: boolean;
  strong: boolean;
  pinned: boolean;
  label: string | null;
  k: number;
  name: string;
  title: string;
}) {
  return (
    <g
      data-id={id}
      transform={`translate(${x},${y})`}
      opacity={dim ? 0.16 : 1}
      style={{ cursor: 'pointer' }}
      tabIndex={0}
      role="button"
      aria-pressed={selected}
      aria-label={name}
      className="outline-none [&:focus-visible>path:first-of-type]:stroke-accent [&:focus-visible>path:first-of-type]:[stroke-width:2.5]"
    >
      <path
        d={shape}
        fill={fill}
        fillOpacity={unresolved ? 0.25 : 0.88}
        stroke={strong ? '#e8e4dc' : 'rgba(10,10,12,0.9)'}
        strokeWidth={strong ? 2 : 0.8}
        strokeDasharray={unresolved ? '2 2' : undefined}
      />
      {/* A pinned node carries a ring, not a colour or a dash — hue is spoken for
          by family and dashes by identity confidence. */}
      {pinned && <circle r={r + 3.5} fill="none" stroke="#c9a86c" strokeWidth="1" opacity="0.85" pointerEvents="none" />}
      {label != null && (
        // Counter-scaled: the label stays 9.5px on screen at any zoom.
        <text
          x={0}
          y={r + 11 / k}
          textAnchor="middle"
          fontSize={9.5 / k}
          fill="rgba(240,236,228,0.86)"
          stroke="rgba(10,10,12,0.7)"
          strokeWidth={2.4 / k}
          paintOrder="stroke"
          pointerEvents="none"
        >
          {label}
        </text>
      )}
      <title>{title}</title>
    </g>
  );
});
