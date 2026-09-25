import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  forceSimulation, forceLink, forceManyBody, forceCollide, forceX, forceY,
  type Simulation, type SimulationNodeDatum,
} from 'd3-force';
import { TIERS, type GNode, type GEdge, type Tier, type NodeFamily } from '../../graph/schema';
import { useCamera, CameraControls, ExpandShell } from './camera';

/**
 * The connection graph.
 *
 * Edge style carries the EVIDENCE TIER — solid / dashed / dotted / dot-dash. That
 * is semantic, not decorative, and is never restyled for looks. Node shape carries
 * type, hue carries family, radius carries weight: three orthogonal channels,
 * never overloaded.
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

interface SimNode extends SimulationNodeDatum {
  n: GNode;
  id: string;
  r: number;
}
interface SimLink {
  source: SimNode | string;
  target: SimNode | string;
  e: GEdge;
}

export interface GraphFilter {
  tiers: Set<Tier>;
  families: Set<NodeFamily>;
  preds: Set<string>;
  query: string;
  /** ISO date; edges whose window ends before this are hidden. */
  from?: string;
  to?: string;
  minAmount?: number;
}

interface Props {
  nodes: GNode[];
  edges: GEdge[];
  filter: GraphFilter;
  selected?: string | null;
  onSelect?: (id: string | null) => void;
  height?: number;
  /** Ego-network radius in hops. 0 draws the whole filtered graph. */
  focusHops?: number;
}

/** How far apart the family bands sit in layout units. Not a pixel measure. */
const BAND = 230;

/** ty → shape. Deliberately few shapes; more would be unreadable at this density. */
function shapeFor(n: GNode, r: number): string {
  switch (n.ty) {
    case 'person':
      return `M ${-r} ${r} a ${r} ${r} 0 1 1 ${r * 2} 0 z`; // half-round: people read as distinct
    case 'ministry':
    case 'agency':
    case 'psu':
      return `M ${-r} ${-r} h ${r * 2} v ${r * 2} h ${-r * 2} z`; // square: institutions
    case 'party':
    case 'sangh':
    case 'trust':
    case 'fund':
      return `M 0 ${-r} L ${r} 0 L 0 ${r} L ${-r} 0 z`; // diamond: recipients of money
    case 'law':
    case 'mechanism':
      return `M 0 ${-r} L ${r * 0.87} ${r * 0.5} L ${-r * 0.87} ${r * 0.5} z`; // triangle: rules
    default:
      return `M ${-r} 0 a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0`; // circle: companies
  }
}

function within(e: GEdge, f: GraphFilter): boolean {
  if (!f.tiers.has(e.tier)) return false;
  if (f.preds.size && !f.preds.has(e.pred)) return false;
  if (f.minAmount && (e.a ?? 0) < f.minAmount) return false;
  if (f.from && e.to && e.to < f.from) return false;
  if (f.to && e.from && e.from > f.to) return false;
  return true;
}

export default function ForceGraph({
  nodes,
  edges,
  filter,
  selected,
  onSelect,
  height = 620,
  /**
   * Ego-network radius. When a node is selected, render only that node and
   * everything within this many hops of it. 0 disables focus and draws the
   * whole filtered graph.
   *
   * This is the single most important control on a dense graph. Nearly 800
   * relationships in one frame is not a picture of a network, it is a texture;
   * the question a reader actually has is "what is attached to THIS", and an
   * ego view answers it where the full draw cannot.
   */
  focusHops = 0,
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

  const { simNodes, simLinks, hiddenByFocus } = useMemo(() => {
    const q = filter.query.trim().toLowerCase();
    const matches = (n: GNode) =>
      !q ||
      n.label.toLowerCase().includes(q) ||
      (n.sub ?? '').toLowerCase().includes(q) ||
      (n.al ?? []).some((a) => a.toLowerCase().includes(q));

    const visibleEdges = edges.filter((e) => within(e, filter));
    const keep = new Set<string>();
    for (const n of nodes) if (filter.families.has(n.fam) && matches(n)) keep.add(n.id);
    // Keep an edge only when both endpoints survive the node filter.
    let links = visibleEdges.filter((e) => keep.has(e.s) && keep.has(e.t));

    // Ego-network restriction, applied AFTER the filters so the hop count is
    // measured on the graph the reader is actually looking at.
    let hidden = 0;
    if (focusHops > 0 && selected && keep.has(selected)) {
      const adj = new Map<string, string[]>();
      for (const e of links) {
        (adj.get(e.s) ?? adj.set(e.s, []).get(e.s)!).push(e.t);
        (adj.get(e.t) ?? adj.set(e.t, []).get(e.t)!).push(e.s);
      }
      const reach = new Set<string>([selected]);
      let frontier = [selected];
      for (let hop = 0; hop < focusHops; hop++) {
        const next: string[] = [];
        for (const id of frontier) {
          for (const nb of adj.get(id) ?? []) {
            if (!reach.has(nb)) {
              reach.add(nb);
              next.push(nb);
            }
          }
        }
        frontier = next;
        if (!frontier.length) break;
      }
      const before = keep.size;
      for (const id of [...keep]) if (!reach.has(id)) keep.delete(id);
      hidden = before - keep.size;
      links = links.filter((e) => keep.has(e.s) && keep.has(e.t));
    }

    // Drop isolated nodes only when a query is active; otherwise the population matters.
    const connected = new Set<string>();
    for (const l of links) {
      connected.add(l.s);
      connected.add(l.t);
    }
    const finalNodes = nodes
      .filter((n) => keep.has(n.id) && (!q || connected.has(n.id) || matches(n)))
      .map<SimNode>((n) => ({ n, id: n.id, r: 4 + n.sz * 3.2 }));
    const byId = new Map(finalNodes.map((s) => [s.id, s]));
    return {
      simNodes: finalNodes,
      simLinks: links.filter((e) => byId.has(e.s) && byId.has(e.t)).map<SimLink>((e) => ({ source: e.s, target: e.t, e })),
      hiddenByFocus: hidden,
    };
  }, [nodes, edges, filter, focusHops, selected]);

  /**
   * The layout runs in its own coordinate space, centred on the origin, and knows
   * nothing about the viewport. That decoupling is what lets the window resize,
   * the panel expand and the camera refit WITHOUT re-running the simulation and
   * throwing away a layout the reader was already reading.
   */
  useEffect(() => {
    simRef.current?.stop();
    if (!simNodes.length) {
      setTick((t) => t + 1);
      return;
    }
    const sim = forceSimulation<SimNode>(simNodes)
      .force('link', forceLink<SimNode, SimLink>(simLinks as never).id((d) => (d as SimNode).id).distance(78).strength(0.55))
      .force('charge', forceManyBody().strength(-190))
      .force('collide', forceCollide<SimNode>().radius((d) => d.r + 7))
      // Families settle into bands — public power left, capital right — so the
      // layout reads as a flow rather than a hairball.
      .force('x', forceX<SimNode>((d) => (d.n.fam === 'state' ? -BAND : d.n.fam === 'capital' ? BAND : 0)).strength(0.09))
      .force('y', forceY<SimNode>(0).strength(0.05));

    let settle = 0;
    if (reduced) {
      sim.stop();
      for (let i = 0; i < 260; i++) sim.tick();
      setTick((t) => t + 1);
      setSettledAt((n) => n + 1);
    } else {
      sim.on('tick', () => setTick((t) => t + 1));
      sim.alpha(1).restart();
      // Freeze once settled — a graph that jitters under the cursor is unreadable.
      settle = window.setTimeout(() => {
        sim.alphaTarget(0).stop();
        setSettledAt((n) => n + 1);
      }, 4200);
    }
    simRef.current = sim;
    return () => {
      // The timer is cleared, not merely orphaned: it outlived the component
      // otherwise, and fired a refit into a layout that had already been replaced.
      window.clearTimeout(settle);
      sim.stop();
    };
  }, [simNodes, simLinks, reduced]);

  /**
   * Fit the settled layout into the frame.
   *
   * Computes the bounding box of the settled nodes, including label overhang, and
   * sets the transform so the whole thing lands inside the measured frame with a
   * margin. Runs once per layout and once per resize, so panning is never yanked
   * back but a window change never strands the graph off-screen either.
   */
  const fitToContent = useCallback(() => {
    const pts = simNodes.filter((d) => d.x != null && d.y != null);
    if (!pts.length) return;
    // Labels sit below and either side of a node, so the box is padded asymmetrically.
    const LABEL_PAD_X = 60;
    const LABEL_PAD_Y = 16;
    fitTo({
      x0: Math.min(...pts.map((d) => d.x! - d.r - LABEL_PAD_X)),
      x1: Math.max(...pts.map((d) => d.x! + d.r + LABEL_PAD_X)),
      y0: Math.min(...pts.map((d) => d.y! - d.r - LABEL_PAD_Y)),
      y1: Math.max(...pts.map((d) => d.y! + d.r + LABEL_PAD_Y * 2)),
    });
  }, [simNodes, fitTo]);

  // Refit when the layout SETTLES and when the frame RESIZES — keyed so each of
  // those happens exactly once, and a deliberate pan is never overridden.
  useEffect(() => {
    if (!settledAt) return;
    const key = `${simNodes.length}:${simNodes[0]?.id ?? ''}:${settledAt}:${W}x${H}`;
    if (fittedFor.current === key) return;
    if (!simNodes.length || simNodes[0].x == null) return;
    fittedFor.current = key;
    fitToContent();
  }, [settledAt, simNodes, fitToContent, W, H]);

  const neighbours = useMemo(() => {
    const focus = hover ?? selected;
    if (!focus) return null;
    const s = new Set<string>([focus]);
    for (const l of simLinks) {
      if (l.e.s === focus) s.add(l.e.t);
      if (l.e.t === focus) s.add(l.e.s);
    }
    return s;
  }, [hover, selected, simLinks]);

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

  const onNodePointerDown = (ev: React.PointerEvent<SVGGElement>, d: SimNode) => {
    if (ev.button !== 0) return;
    ev.stopPropagation();
    const p = toLocal(ev.clientX, ev.clientY);
    if (!p) return;
    // Tell the camera to keep its hands off this gesture, then take the pointer.
    cam.suspend.current = true;
    nodeDrag.current = { d, ox: (d.x ?? 0) - p.x, oy: (d.y ?? 0) - p.y, moved: false };
    (ev.currentTarget as Element).setPointerCapture?.(ev.pointerId);
  };

  const onPointerMove = (ev: React.PointerEvent<SVGSVGElement>) => {
    const nd = nodeDrag.current;
    if (!nd) {
      cam.svgProps.onPointerMove(ev);
      return;
    }
    const p = toLocal(ev.clientX, ev.clientY);
    if (!p) return;
    nd.d.fx = nd.d.x = p.x + nd.ox;
    nd.d.fy = nd.d.y = p.y + nd.oy;
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
    cam.svgProps.onPointerUp();
  };

  /** Release every pinned node and let the layout re-settle around the change. */
  const releasePins = () => {
    for (const d of simNodes) {
      delete d.fx;
      delete d.fy;
    }
    setPins(new Set());
    const sim = simRef.current;
    if (!sim) return;
    sim.alpha(0.4).restart();
    window.setTimeout(() => {
      sim.alphaTarget(0).stop();
      setSettledAt((n) => n + 1);
    }, 1800);
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

  const frame = (
    <div
      ref={wrapRef}
      className="relative outline-none focus-visible:ring-1 focus-visible:ring-accent"
      style={{ height: expanded ? '100%' : height }}
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label="Graph viewport. Arrow keys pan, plus and minus zoom, 0 fits, f expands."
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
        role="img"
        aria-label={`Connection graph: ${simNodes.length} entities, ${simLinks.length} relationships. Drag to pan, scroll or the on-screen buttons to zoom, drag a node to pull it out of the tangle. A table view of the same data is available below.`}
        data-tick={tick}
        data-k={cam.view.k.toFixed(3)}
        {...cam.svgProps}
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
      <g>
        {simLinks.map((l, i) => {
          const s = l.source as SimNode;
          const t = l.target as SimNode;
          if (typeof s === 'string' || typeof t === 'string' || s.x == null || t.x == null) return null;
          const meta = TIERS[l.e.tier];
          const dim = neighbours && !(neighbours.has(l.e.s) && neighbours.has(l.e.t));
          const isContra = l.e.pred === 'contra';
          return (
            <line
              key={`${l.e.s}-${l.e.t}-${i}`}
              x1={s.x}
              y1={s.y}
              x2={t.x}
              y2={t.y}
              stroke={isContra ? '#c45b5a' : 'rgba(232,228,220,0.30)'}
              strokeWidth={isContra ? 1.5 : 0.7 + Math.min(2.4, Math.sqrt(l.e.a ?? 0) / 26)}
              strokeDasharray={meta.dash || undefined}
              opacity={dim ? 0.1 : isContra ? 0.9 : 0.55}
              markerEnd={l.e.pred === 'contra' || l.e.pred === 'supersede' ? undefined : 'url(#arrow)'}
            >
              <title>{`${l.e.s} → ${l.e.t} · ${l.e.pred} · ${l.e.tier}${l.e.a ? ` · ₹${l.e.a} cr` : ''}${l.e.lab ? ` · ${l.e.lab}` : ''}`}</title>
            </line>
          );
        })}
      </g>

      <g>
        {simNodes.map((d) => {
          if (d.x == null || d.y == null) return null;
          const dim = neighbours && !neighbours.has(d.id);
          const isSel = selected === d.id;
          const pinned = pins.has(d.id);
          return (
            <g
              key={d.id}
              transform={`translate(${d.x},${d.y})`}
              opacity={dim ? 0.16 : 1}
              style={{ cursor: 'pointer' }}
              tabIndex={0}
              role="button"
              aria-label={`${d.n.label}${d.n.sub ? `, ${d.n.sub}` : ''}`}
              onMouseEnter={() => setHover(d.id)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(d.id)}
              onBlur={() => setHover(null)}
              onPointerDown={(e) => onNodePointerDown(e, d)}
              onClick={() => {
                // A drag is not a click. Without this, pulling a node out of the
                // tangle would also select it and collapse the view to its ego net.
                if (suppressClick.current) {
                  suppressClick.current = false;
                  return;
                }
                onSelect?.(isSel ? null : d.id);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect?.(isSel ? null : d.id);
                }
              }}
            >
              <path
                d={shapeFor(d.n, d.r)}
                fill={FAMILY_COLOR[d.n.fam]}
                fillOpacity={d.n.resolved === false ? 0.25 : 0.88}
                stroke={isSel ? '#e8e4dc' : 'rgba(10,10,12,0.9)'}
                strokeWidth={isSel ? 2 : 0.8}
                strokeDasharray={d.n.resolved === false ? '2 2' : undefined}
              />
              {/* A pinned node carries a ring, not a colour or a dash — hue is
                  spoken for by family and dashes by identity confidence. */}
              {pinned && (
                <circle r={d.r + 3.5} fill="none" stroke="#c9a86c" strokeWidth="1" opacity="0.85" pointerEvents="none" />
              )}
              {(d.n.sz >= 3 || isSel || hover === d.id) && (
                <text
                  x={0}
                  y={d.r + 11}
                  textAnchor="middle"
                  fontSize="9.5"
                  fill="rgba(240,236,228,0.86)"
                  stroke="rgba(10,10,12,0.7)"
                  strokeWidth="2.4"
                  paintOrder="stroke"
                  pointerEvents="none"
                >
                  {d.n.label}
                </text>
              )}
              <title>{`${d.n.label}${d.n.sub ? ` — ${d.n.sub}` : ''}`}</title>
            </g>
          );
        })}
      </g>

      </g>

      {!simNodes.length && (
        <text x={W / 2} y={H / 2} textAnchor="middle" fill="rgba(232,228,220,0.4)" fontSize="13">
          No entities match these filters.
        </text>
      )}
      </svg>

      <CameraControls cam={cam} onFit={fitToContent} />

      <div className="absolute bottom-2 left-2 max-w-[60%] font-mono text-[10px] leading-relaxed text-text-muted bg-bg/80 px-1.5 py-0.5 rounded">
        drag to pan · arrows or the pad to move · +/− or scroll to zoom · 0 fits · f maximises · drag a node to pull it out
        {pins.size > 0 && (
          <>
            {' '}·{' '}
            <button onClick={releasePins} className="text-accent underline underline-offset-2">
              release {pins.size} pinned
            </button>
          </>
        )}
        {focusHops > 0 && selected && hiddenByFocus > 0 && (
          <span className="text-accent">
            {' '}· {hiddenByFocus} entities outside {focusHops} hop{focusHops === 1 ? '' : 's'} hidden
          </span>
        )}
      </div>
    </div>
  );

  return (
    <ExpandShell
      expanded={expanded}
      onClose={() => cam.setExpanded(false)}
      caption={`${simNodes.length} entities · ${simLinks.length} relationships · filters stay applied`}
    >
      {frame}
    </ExpandShell>
  );
}
