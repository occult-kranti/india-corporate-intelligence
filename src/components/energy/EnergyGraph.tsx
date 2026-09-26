import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type SimulationNodeDatum } from 'd3-force';
import { useCamera, CameraControls, ExpandShell } from '../viz/camera';
import { FAMILY_COLOR, edgeWidth, isDirected, shapeClassOf, type ShapeClass } from '../viz/ForceGraph';
import { TIERS, TIER_ORDER, type GEdge, type GNode, type Tier } from '../../graph/schema';
import { DRAWABLE, NODE_LIST } from '../../data/energy';
import { useMedia } from './hooks';

/**
 * The /energy canvas.
 *
 * WHY NOT ForceGraph. The acceptance criteria need behaviour ForceGraph does not
 * have — one addressable element per claim (`data-claim`), a rose tick for every
 * recorded response, the response count in every accessible name, a click that
 * opens a claim rather than hovering it, a hover card on keyboard focus, and a
 * canvas that lets a phone scroll past it at rest. Those are new ForceGraph props in
 * the spec, and src/components/viz is owned by another agent in this run, so this
 * canvas is built on the same parts instead: the shared camera, and ForceGraph's
 * exported family colours, shape classes, edge width and direction rule. The frozen
 * channels are therefore the same functions, not copies of them.
 *
 * LAYOUT. One force run over the WHOLE drawable register, a fixed tick count, done
 * once per page load. Filters, focus, claims and paths hide or dim; they never
 * re-run the layout, so an entity stays where the reader last saw it and the same
 * URL always draws the same picture. d3-force seeds its jitter from a fixed LCG, so
 * the result is identical on every machine.
 */

const BAND = 230;
/**
 * Fixed tick count, with alpha decaying to d3's alphaMin in exactly that many ticks,
 * so the layout runs to its natural end rather than being cut off. Collision joins
 * only for the final ticks, and the many-body force uses a coarser Barnes-Hut
 * approximation: together they bring a ~400-node register from ~600ms to ~240ms of
 * main-thread work without leaving any two nodes overlapping (measured).
 */
const LAYOUT_TICKS = 200;
const COLLIDE_TICKS = 60;

interface SimNode extends SimulationNodeDatum {
  id: string;
  fam: GNode['fam'];
  r: number;
}

let LAYOUT: Map<string, { x: number; y: number }> | null = null;

function layout(): Map<string, { x: number; y: number }> {
  if (LAYOUT) return LAYOUT;
  const nodes: SimNode[] = NODE_LIST.map((n) => ({ id: n.id, fam: n.fam, r: radius(n) }));
  const ids = new Set(nodes.map((n) => n.id));
  const links = DRAWABLE.filter((e) => ids.has(e.s) && ids.has(e.t) && e.s !== e.t).map((e) => ({ source: e.s, target: e.t }));
  const sim = forceSimulation<SimNode>(nodes)
    .stop()
    .alphaDecay(1 - Math.pow(0.001, 1 / LAYOUT_TICKS))
    .force('link', forceLink<SimNode, { source: string; target: string }>(links).id((d) => d.id).distance(70).strength(0.5))
    .force('charge', forceManyBody().strength(-170).theta(1.2).distanceMax(600))
    // Public power pulled left, private capital right. Captioned: position means
    // nothing beyond that.
    .force('x', forceX<SimNode>((d) => (d.fam === 'state' ? -BAND : d.fam === 'capital' ? BAND : 0)).strength(0.09))
    .force('y', forceY<SimNode>(0).strength(0.06));
  sim.tick(LAYOUT_TICKS - COLLIDE_TICKS);
  sim.force('collide', forceCollide<SimNode>().radius((d) => d.r + 6));
  sim.tick(COLLIDE_TICKS);
  LAYOUT = new Map(nodes.map((n) => [n.id, { x: n.x ?? 0, y: n.y ?? 0 }]));
  return LAYOUT;
}

/** Size is the researcher's declared band, never a computed importance. */
const radius = (n: GNode) => 4 + n.sz * 3.2;

const SHAPES = new Map<string, string>();
function shapeFor(cls: ShapeClass, r: number): string {
  const key = `${cls}:${r}`;
  const hit = SHAPES.get(key);
  if (hit) return hit;
  let d: string;
  switch (cls) {
    case 'person':
      d = `M ${-r} ${r} a ${r} ${r} 0 1 1 ${r * 2} 0 z`;
      break;
    case 'institution':
      d = `M ${-r} ${-r} h ${r * 2} v ${r * 2} h ${-r * 2} z`;
      break;
    case 'recipient':
      d = `M 0 ${-r} L ${r} 0 L 0 ${r} L ${-r} 0 z`;
      break;
    case 'rule':
      d = `M 0 ${-r} L ${r * 0.87} ${r * 0.5} L ${-r * 0.87} ${r * 0.5} z`;
      break;
    default:
      d = `M ${-r} 0 a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0`;
  }
  SHAPES.set(key, d);
  return d;
}

export const HOVER_CARD_ID = 'energy-hover-card';
const ROSE = '#c45b5a';

/**
 * Claim-line luminance (WCAG 1.4.11, audit A11Y-001 S2). The dash pattern is the
 * evidence tier and is never touched here; only how bright the line is. Composited
 * onto --color-bg #0a0a0c: rest 0.62 × 0.75 → 3.95:1, lit 0.62 × 0.95 → 5.76:1, arrowhead
 * 0.70 × 0.75 → 4.77:1 — all above the 3:1 a graphical object needs, so the dash is
 * perceivable at rest and not only when lit. Not-lit stays at 0.1 (≈1.1:1) on purpose:
 * "not part of what you asked about" is meant to recede.
 */
const CLAIM_INK = 'rgba(232,228,220,0.62)';
const ARROW_INK = 'rgba(232,228,220,0.70)';
const CLAIM_OPACITY = { rest: 0.75, lit: 0.95, dim: 0.1 } as const;

export interface Lit {
  nodes: Set<string>;
  edges: Set<string>;
}

export default function EnergyGraph({
  nodes,
  edges,
  selected,
  pathEnds,
  lit,
  tags,
  onSelect,
  onPathEnd,
  onEdgeClick,
  nodeName,
  edgeName,
  responsesOf,
  hoverCard,
  edgeCard,
  status,
  overlay,
  height,
  fitKey,
  expandedAside,
  onExpandedChange,
  connectorClaim = null,
}: {
  nodes: GNode[];
  edges: GEdge[];
  selected: string | null;
  pathEnds: string[];
  lit: Lit | null;
  tags: { id: string; text: string }[];
  onSelect: (id: string) => void;
  onPathEnd: (id: string) => void;
  onEdgeClick: (e: GEdge) => void;
  nodeName: (n: GNode) => string;
  edgeName: (e: GEdge) => string;
  responsesOf: (e: GEdge) => GEdge[];
  hoverCard: (n: GNode) => ReactNode;
  edgeCard: (e: GEdge) => ReactNode;
  status: ReactNode;
  overlay?: ReactNode;
  height: string;
  fitKey: string;
  expandedAside?: ReactNode;
  /**
   * Told when the graph fills the window, so the page can stop rendering what the
   * dialog now carries (the margin) — otherwise its ids exist twice (WCAG 4.1.1).
   */
  onExpandedChange?: (expanded: boolean) => void;
  /** The claim whose responders get a rose connector: set only while that claim is the lit set (spec §6). */
  connectorClaim?: string | null;
}) {
  const pos = useMemo(layout, []);
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 900, h: 560 });
  const W = size.w;
  const H = size.h;
  const cam = useCamera(svgRef, W, H);
  const { onWheel, ...pan } = cam.svgProps;
  const coarse = useMedia('(pointer: coarse)') || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);
  const [armed, setArmed] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [hoverEdge, setHoverEdge] = useState<GEdge | null>(null);

  // Measured, deferred a frame: a synchronous state write inside a ResizeObserver
  // callback can re-enter layout and log a console error, which fails smoke.
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
  }, [cam.expanded]);

  // Wheel zoom through a non-passive listener; React's is passive and would log.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const h = (ev: WheelEvent) => {
      if (coarse && !armed) return;
      onWheel(ev as unknown as React.WheelEvent<SVGSVGElement>);
    };
    svg.addEventListener('wheel', h, { passive: false });
    return () => svg.removeEventListener('wheel', h);
  }, [onWheel, coarse, armed, cam.expanded]);

  // Pan mode ends when the canvas leaves the viewport, so a phone reader is never
  // left with a canvas that traps the page.
  useEffect(() => {
    if (!armed || typeof IntersectionObserver === 'undefined') return;
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) setArmed(false);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [armed]);

  // Reported in a layout effect, so the page drops its inline margin in the same
  // frame the dialog's copy appears and the duplicate ids are never painted.
  const expandedCb = useRef(onExpandedChange);
  expandedCb.current = onExpandedChange;
  const reported = useRef(cam.expanded);
  useLayoutEffect(() => {
    if (reported.current === cam.expanded) return;
    reported.current = cam.expanded;
    expandedCb.current?.(cam.expanded);
  }, [cam.expanded]);

  /**
   * Focus follows the frame into the dialog, and back out to where it came from.
   * ExpandShell's effect runs first (it is the child) and handles the maximise
   * button; this one takes over when the reader opened it with `f` from the frame
   * or from an entity in it, and on open, so the arrow keys keep panning.
   */
  const openedFromFrame = useRef(false);
  const wasExpanded = useRef(cam.expanded);
  useEffect(() => {
    if (wasExpanded.current === cam.expanded) return;
    wasExpanded.current = cam.expanded;
    if (cam.expanded || openedFromFrame.current) wrapRef.current?.focus({ preventScroll: true });
    if (!cam.expanded) openedFromFrame.current = false;
  }, [cam.expanded]);

  const fitToContent = useCallback(() => {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const n of nodes) {
      const p = pos.get(n.id);
      if (!p) continue;
      const r = radius(n);
      x0 = Math.min(x0, p.x - r - 50);
      x1 = Math.max(x1, p.x + r + 50);
      y0 = Math.min(y0, p.y - r - 14);
      y1 = Math.max(y1, p.y + r + 26);
    }
    if (x0 === Infinity) return;
    cam.fitTo({ x0, x1, y0, y1 });
  }, [nodes, pos, cam]);

  const fitted = useRef('');
  useEffect(() => {
    const key = `${fitKey}|${W}x${H}`;
    if (fitted.current === key) return;
    fitted.current = key;
    fitToContent();
  }, [fitKey, W, H, fitToContent]);

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const edgeById = useMemo(() => new Map(edges.map((e) => [e.id ?? '', e])), [edges]);

  /** Hover lights a neighbourhood only when nothing the reader asked for is lit. */
  const effectiveLit = useMemo<Lit | null>(() => {
    if (lit) return lit;
    if (!hover) return null;
    const ns = new Set([hover]);
    const es = new Set<string>();
    for (const e of edges) {
      if (e.s === hover || e.t === hover) {
        ns.add(e.s);
        ns.add(e.t);
        es.add(e.id ?? '');
      }
    }
    return { nodes: ns, edges: es };
  }, [lit, hover, edges]);

  const degree = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of edges) {
      m.set(e.s, (m.get(e.s) ?? 0) + 1);
      m.set(e.t, (m.get(e.t) ?? 0) + 1);
    }
    return m;
  }, [edges]);

  const k = cam.view.k;
  // Only responders that are drawn and are not endpoints of the claim: an endpoint
  // already touches the line, and a connector to an undrawn node would point at nothing.
  const connectors = useMemo(() => {
    const e = connectorClaim ? edgeById.get(connectorClaim) : undefined;
    if (!e) return [];
    const a = pos.get(e.s);
    const b = pos.get(e.t);
    if (!a || !b) return [];
    const drawn = new Set(nodes.map((n) => n.id));
    return responsesOf(e)
      .filter((r) => r.s !== e.s && r.s !== e.t && drawn.has(r.s) && pos.has(r.s))
      .map((r, i) => {
        const p = pos.get(r.s)!;
        return { key: `${r.id ?? r.s}-${i}`, x1: p.x, y1: p.y, x2: (a.x + b.x) / 2, y2: (a.y + b.y) / 2, tier: r.tier };
      });
  }, [connectorClaim, edgeById, pos, nodes, responsesOf]);
  const labelled = (n: GNode) => {
    if (n.id === selected || n.id === hover || pathEnds.includes(n.id) || effectiveLit?.nodes.has(n.id) && lit) return true;
    if (k >= 2) return true;
    if (k < 0.6) return n.sz === 4;
    return n.sz >= 3 || (degree.get(n.id) ?? 0) * k >= 4;
  };

  const nodeAt = (t: EventTarget | null) => {
    const el = (t as Element | null)?.closest?.('[data-id]');
    return el ? nodeById.get(el.getAttribute('data-id') ?? '') ?? null : null;
  };
  const edgeAt = (t: EventTarget | null) => {
    const el = (t as Element | null)?.closest?.('[data-claim]');
    return el ? edgeById.get(el.getAttribute('data-claim') ?? '') ?? null : null;
  };

  const tabbable = (e: GEdge) => !!selected && (e.s === selected || e.t === selected) || (pathEnds.length === 2 && !!lit?.edges.has(e.id ?? ''));

  const onSvgClick = (ev: React.MouseEvent<SVGSVGElement>) => {
    const n = nodeAt(ev.target);
    if (n) {
      if (ev.shiftKey) onPathEnd(n.id);
      else onSelect(n.id);
      return;
    }
    const e = edgeAt(ev.target);
    if (e) {
      onEdgeClick(e);
      return;
    }
    // A tap on empty canvas is the phone reader choosing to pan and zoom.
    if (coarse && !armed) setArmed(true);
  };

  const onSvgKey = (ev: React.KeyboardEvent<SVGSVGElement>) => {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    const n = nodeAt(ev.target);
    if (n) {
      ev.preventDefault();
      ev.stopPropagation();
      if (ev.shiftKey) onPathEnd(n.id);
      else onSelect(n.id);
      return;
    }
    const e = edgeAt(ev.target);
    if (e) {
      ev.preventDefault();
      ev.stopPropagation();
      onEdgeClick(e);
    }
  };

  const onWrapKey = (ev: React.KeyboardEvent<HTMLDivElement>) => {
    if ((ev.key === 'f' || ev.key === 'F') && !cam.expanded) {
      // From the frame or an entity, focus returns to the frame on close; from a
      // camera button, ExpandShell returns it to the maximise button.
      openedFromFrame.current = !(ev.target instanceof HTMLButtonElement);
    }
    if (ev.key === '0') {
      fitToContent();
      ev.preventDefault();
      return;
    }
    cam.onKeyDown(ev);
  };

  const hoverNode = hover ? nodeById.get(hover) ?? null : null;
  const screen = (id: string) => {
    const p = pos.get(id);
    if (!p) return null;
    return { x: p.x * k + cam.view.tx, y: p.y * k + cam.view.ty };
  };
  const cardAt = hoverNode ? screen(hoverNode.id) : hoverEdge ? (() => {
    const a = pos.get(hoverEdge.s);
    const b = pos.get(hoverEdge.t);
    if (!a || !b) return null;
    return { x: ((a.x + b.x) / 2) * k + cam.view.tx, y: ((a.y + b.y) / 2) * k + cam.view.ty };
  })() : null;
  const touchAction = coarse && !armed ? 'pan-y' : 'none';

  const frame = (
    <div
      ref={wrapRef}
      className="relative outline-none focus-visible:ring-1 focus-visible:ring-accent overflow-hidden bg-bg"
      style={{ height: cam.expanded ? '100%' : height }}
      tabIndex={0}
      onKeyDown={onWrapKey}
      aria-label="Graph viewport. Arrow keys pan, plus and minus zoom, 0 fits, f maximises. Tab moves through entities; Enter opens one in the margin; Shift+Enter makes it the far end of a path."
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: '100%', display: 'block', touchAction, cursor: cam.dragging ? 'grabbing' : 'grab' }}
        role="group"
        aria-label={`Connection graph: ${nodes.length} entities, ${edges.length} claims. The table view lists every one; it can be opened with the Show table button or the skip link above.`}
        onPointerDown={(ev) => {
          if (coarse && !armed) return;
          if (nodeAt(ev.target) || edgeAt(ev.target)) return;
          pan.onPointerDown(ev);
        }}
        onPointerMove={pan.onPointerMove}
        onPointerUp={pan.onPointerUp}
        onPointerLeave={pan.onPointerLeave}
        onClick={onSvgClick}
        onKeyDown={onSvgKey}
      >
        <defs>
          <marker id="energy-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M 0 0 L 8 4 L 0 8 z" fill={ARROW_INK} />
          </marker>
        </defs>
        <g transform={cam.transform}>
          <g
            onMouseOver={(ev) => setHoverEdge(edgeAt(ev.target))}
            onMouseOut={(ev) => {
              if (!edgeAt(ev.relatedTarget)) setHoverEdge(null);
            }}
            onFocus={(ev) => setHoverEdge(edgeAt(ev.target))}
            onBlur={() => setHoverEdge(null)}
          >
            {edges.map((e) => {
              const a = pos.get(e.s);
              const b = pos.get(e.t);
              if (!a || !b) return null;
              const id = e.id ?? '';
              const isLit = effectiveLit ? effectiveLit.edges.has(id) : true;
              const resp = responsesOf(e);
              return (
                <EdgeLine
                  key={id}
                  id={id}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  contra={e.pred === 'contra'}
                  width={edgeWidth(e)}
                  dash={TIERS[e.tier].dash}
                  opacity={!isLit ? CLAIM_OPACITY.dim : effectiveLit ? CLAIM_OPACITY.lit : CLAIM_OPACITY.rest}
                  strong={!!lit && isLit}
                  arrow={isDirected(e.pred)}
                  hit={Math.max(coarse ? 10 : 6, 10 / k)}
                  name={edgeName(e)}
                  tab={tabbable(e)}
                  // One tick per distinct response tier, never just the first response's: a
                  // claim answered at two tiers must show both (strongest first, by TIER_ORDER).
                  tickTiers={TIER_ORDER.filter((t) => resp.some((r) => r.tier === t)).join(',')}
                  tickOpacity={isLit ? 0.95 : 0.2}
                  k={k}
                />
              );
            })}
          </g>
          {connectors.length > 0 && (
            // Responder → midpoint of the answered claim, in the response's own dash, only
            // while that claim is lit and only for responders that are not its endpoints.
            // At rest the tick alone says "answered", so the canvas never grows a rose web.
            <g data-response-connector="" aria-hidden="true" pointerEvents="none">
              {connectors.map((c) => (
                <line
                  key={c.key}
                  x1={c.x1}
                  y1={c.y1}
                  x2={c.x2}
                  y2={c.y2}
                  stroke={ROSE}
                  strokeWidth={1.2 / k}
                  strokeDasharray={TIERS[c.tier].dash ? TIERS[c.tier].dash.split(' ').map((v) => Number(v) / k).join(' ') : undefined}
                  opacity={0.9}
                />
              ))}
            </g>
          )}
          <g
            onMouseOver={(ev) => setHover(nodeAt(ev.target)?.id ?? null)}
            onMouseOut={(ev) => {
              if (!nodeAt(ev.relatedTarget)) setHover(null);
            }}
            onFocus={(ev) => setHover(nodeAt(ev.target)?.id ?? null)}
            onBlur={() => setHover(null)}
          >
            {nodes.map((n) => {
              const p = pos.get(n.id);
              if (!p) return null;
              return (
                <NodeGlyph
                  key={n.id}
                  id={n.id}
                  x={p.x}
                  y={p.y}
                  shape={shapeFor(shapeClassOf(n.ty), radius(n))}
                  r={radius(n)}
                  fill={FAMILY_COLOR[n.fam]}
                  unresolved={n.resolved === false}
                  dim={!!effectiveLit && !effectiveLit.nodes.has(n.id)}
                  selected={selected === n.id}
                  strong={selected === n.id || pathEnds.includes(n.id)}
                  label={labelled(n) ? n.label : null}
                  k={k}
                  name={nodeName(n)}
                  describedBy={hover === n.id ? HOVER_CARD_ID : undefined}
                />
              );
            })}
          </g>
          {tags.map((t) => {
            const p = pos.get(t.id);
            if (!p) return null;
            return (
              <text
                key={t.id}
                x={p.x + 12 / k}
                y={p.y - 10 / k}
                fontSize={10 / k}
                fill="rgba(240,236,228,0.9)"
                stroke="rgba(10,10,12,0.8)"
                strokeWidth={2.4 / k}
                paintOrder="stroke"
                pointerEvents="none"
              >
                {t.text}
              </text>
            );
          })}
        </g>
      </svg>

      <CameraControls cam={cam} onFit={fitToContent} />

      {(hoverNode || hoverEdge) && cardAt && (
        <div
          id={HOVER_CARD_ID}
          role="tooltip"
          className="absolute z-10 w-[18rem] max-w-[70%] bg-bg-elevated border border-border-light rounded p-2.5 text-[12px] text-text-secondary pointer-events-none [overflow-wrap:anywhere]"
          style={{
            left: Math.min(Math.max(4, cardAt.x + 14), W - 200),
            top: Math.min(Math.max(4, cardAt.y + 14), H - 160),
          }}
        >
          {hoverNode ? hoverCard(hoverNode) : hoverEdge ? edgeCard(hoverEdge) : null}
        </div>
      )}

      {overlay}

      {/* Inert to the pointer, so the caption never swallows a click meant for a claim beneath it. */}
      <div className="absolute bottom-2 left-2 max-w-[62%] space-y-0.5 pointer-events-none">
        <div aria-hidden="true" className="font-mono text-[10px] leading-relaxed text-text-muted bg-bg/85 px-1.5 py-0.5 rounded space-y-0.5">
          {status}
        </div>
        {coarse && (
          <p className="font-mono text-[10px] text-text-muted bg-bg/85 px-1.5 py-0.5 rounded pointer-events-auto">
            {armed ? (
              <>
                panning: drag to move, pinch to zoom ·{' '}
                <button type="button" onClick={() => setArmed(false)} className="text-accent underline underline-offset-2">
                  done
                </button>
              </>
            ) : (
              'tap the graph to pan and zoom'
            )}
          </p>
        )}
      </div>
    </div>
  );

  // Maximised: the margin comes with the graph. A maximised graph without its
  // margin would be a screenshot with the epistemics stripped. The shared shell makes
  // it a modal dialog (focus in and back, the page inert) — audit A11Y-001 S5.
  return (
    <ExpandShell
      expanded={cam.expanded}
      onClose={() => cam.setExpanded(false)}
      caption={`${nodes.length} entities · ${edges.length} claims · filters stay applied`}
      label="The power map, filling the window"
    >
      {cam.expanded ? (
        <div className="h-full grid gap-3 lg:grid-cols-[minmax(0,1fr)_22rem] max-lg:grid-rows-[minmax(0,1fr)_40vh]">
          <div className="min-h-0">{frame}</div>
          {expandedAside && <div className="min-h-0 overflow-y-auto border border-border rounded p-3">{expandedAside}</div>}
        </div>
      ) : (
        frame
      )}
    </ExpandShell>
  );
}

const EdgeLine = memo(function EdgeLine({
  id, x1, y1, x2, y2, contra, width, dash, opacity, strong, arrow, hit, name, tab, tickTiers, tickOpacity, k,
}: {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  contra: boolean;
  width: number;
  dash: string;
  opacity: number;
  strong: boolean;
  arrow: boolean;
  hit: number;
  name: string;
  tab: boolean;
  /** Comma-joined response tiers, '' for none. A string, not an array, so memo holds. */
  tickTiers: string;
  tickOpacity: number;
  k: number;
}) {
  // The response tick: a short rose stroke across the midpoint, perpendicular to
  // the claim, in the response's own tier dash. At rest it alone says "answered",
  // so the canvas never grows a rose web of connectors.
  // Dash and length are divided by the zoom only, so on screen the tick carries the
  // same pattern at the same scale as the dash key. 16px, not the spec's 8: the
  // longest pattern (analytic, 8 3 2 3) needs 16px to show one whole period.
  // Several response tiers → several parallel ticks, 5px apart along the claim.
  const tiers = tickTiers ? (tickTiers.split(',') as Tier[]) : [];
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  const nx = -uy * (8 / k);
  const ny = ux * (8 / k);
  return (
    <>
      <g
        data-claim={id}
        // A button, because Enter and click open it (WCAG 4.1.2, audit A11Y-001 S3); an
        // img role hid that affordance from assistive technology. The roledescription
        // keeps it announced as a "claim". A claim is tabbable only when it touches the
        // selection or lies on the asked path, so it never precedes the entities in the
        // tab order at rest.
        role="button"
        aria-roledescription="claim"
        aria-label={name}
        tabIndex={tab ? 0 : undefined}
        className="focus:outline-2 focus:outline-accent [&:focus>line:last-of-type]:stroke-accent"
        style={{ cursor: 'pointer' }}
      >
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={hit} pointerEvents="stroke" />
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={contra ? ROSE : strong ? 'rgba(244,240,232,0.95)' : CLAIM_INK}
          strokeWidth={width}
          strokeDasharray={dash || undefined}
          opacity={opacity}
          markerEnd={arrow ? 'url(#energy-arrow)' : undefined}
          pointerEvents="none"
        />
      </g>
      {tiers.length > 0 && (
        <g data-response-tick="" aria-hidden="true" pointerEvents="none">
          {tiers.map((t, i) => {
            const off = ((i - (tiers.length - 1) / 2) * 5) / k;
            const cx = mx + ux * off;
            const cy = my + uy * off;
            const d = TIERS[t].dash;
            return (
              <line
                key={t}
                x1={cx - nx}
                y1={cy - ny}
                x2={cx + nx}
                y2={cy + ny}
                stroke={ROSE}
                strokeWidth={1.5 / k}
                strokeDasharray={d ? d.split(' ').map((v) => Number(v) / k).join(' ') : undefined}
                opacity={tickOpacity}
              />
            );
          })}
        </g>
      )}
    </>
  );
});

const NodeGlyph = memo(function NodeGlyph({
  id, x, y, shape, r, fill, unresolved, dim, selected, strong, label, k, name, describedBy,
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
  label: string | null;
  k: number;
  name: string;
  describedBy?: string;
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
      aria-describedby={describedBy}
      className="focus:outline-2 focus:outline-accent [&:focus>path:first-of-type]:stroke-accent [&:focus>path:first-of-type]:[stroke-width:2.5]"
    >
      <path
        d={shape}
        fill={fill}
        fillOpacity={unresolved ? 0.25 : 0.88}
        stroke={strong ? '#e8e4dc' : 'rgba(10,10,12,0.9)'}
        strokeWidth={strong ? 2 : 0.8}
        strokeDasharray={unresolved ? '2 2' : undefined}
      />
      {selected && <circle r={r + 3.5} fill="none" stroke="#c9a86c" strokeWidth={1} pointerEvents="none" />}
      {label != null && (
        <text
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
    </g>
  );
});
