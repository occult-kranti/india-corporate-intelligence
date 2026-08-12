import { useId, useMemo, useRef, useState } from 'react';
import { STATES, type StateGeo } from '../../data/geo';
import { TIERS, type GNode, type GEdge, type Tier, type NodeFamily, type StateCode } from '../../graph/schema';
import { FAMILY_COLOR, FAMILY_LABEL } from './ForceGraph';
import { useCamera, CameraControls, ExpandShell } from './camera';

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
 */


const MAP_H = 696;
const GUTTER_X = 664;
const VIEW_W = 830;

export type GeoMode = 'entities' | 'state-flows';

export interface GeoFilter {
  tiers: Set<Tier>;
  families: Set<NodeFamily>;
  preds: Set<string>;
  query: string;
  minAmount?: number;
}

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
}

interface Placed {
  n: GNode;
  x: number;
  y: number;
  r: number;
  offMap: boolean;
}

const RAMP = ['#232a31', '#2b3b41', '#334c50', '#3d6062', '#4a7573'];

/**
 * A quadratic arc that always bulges the same way relative to travel direction, so
 * an A→B edge and a B→A edge separate instead of overprinting.
 */
function arc(x1: number, y1: number, x2: number, y2: number, k = 0.16): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const cx = (x1 + x2) / 2 - dy * k;
  const cy = (y1 + y2) / 2 + dx * k;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
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

export default function GeoNetwork({
  nodes,
  edges,
  filter,
  mode,
  selected = null,
  onSelect,
  stateWeight,
  height = 720,
  showGutter = true,
}: Props) {
  const uid = useId().replace(/:/g, '');
  const [hover, setHover] = useState<string | null>(null);
  const [hoverFlow, setHoverFlow] = useState<string | null>(null);

  /**
   * The camera. Shared with ForceGraph, but fitting means something different
   * here: the map's own extent IS the frame, so "fit" resets rather than
   * computing a bounding box. Zooming into Delhi is the whole point — a dozen
   * ministries land in a cluster narrower than the state's label.
   */
  const svgRef = useRef<SVGSVGElement>(null);
  const cam = useCamera(svgRef, VIEW_W, MAP_H);
  /** `0` means "the whole map" here, not "fit the marks" — the frame IS the extent. */
  const onKeyDown = (ev: React.KeyboardEvent) => {
    if (ev.key === '0') {
      cam.fitTo(null);
      ev.preventDefault();
      return;
    }
    cam.onKeyDown(ev);
  };

  const visibleEdges = useMemo(() => {
    const q = filter.query.trim().toLowerCase();
    const byId = new Map(nodes.map((n) => [n.id, n]));
    return edges.filter((e) => {
      if (!filter.tiers.has(e.tier)) return false;
      if (filter.preds.size && !filter.preds.has(e.pred)) return false;
      if (filter.minAmount && (e.a ?? 0) < filter.minAmount) return false;
      const s = byId.get(e.s);
      const t = byId.get(e.t);
      if (!s || !t) return false;
      if (!filter.families.has(s.fam) || !filter.families.has(t.fam)) return false;
      if (q) {
        const hay = `${s.label} ${t.label} ${(s.al ?? []).join(' ')} ${(t.al ?? []).join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [edges, nodes, filter]);

  const connected = useMemo(() => {
    const s = new Set<string>();
    for (const e of visibleEdges) {
      s.add(e.s);
      s.add(e.t);
    }
    return s;
  }, [visibleEdges]);

  /** Place every connected node: on the map if it has a state, in the gutter if not. */
  const placed = useMemo(() => {
    const onMap = new Map<StateCode, GNode[]>();
    const offMap: GNode[] = [];
    for (const n of nodes) {
      if (!connected.has(n.id)) continue;
      if (n.st && STATES.some((s) => s.id === n.st)) {
        if (!onMap.has(n.st)) onMap.set(n.st, []);
        onMap.get(n.st)!.push(n);
      } else if (showGutter) {
        offMap.push(n);
      }
    }
    for (const list of onMap.values()) list.sort((a, b) => b.sz - a.sz || a.label.localeCompare(b.label));
    offMap.sort((a, b) => a.fam.localeCompare(b.fam) || b.sz - a.sz || a.label.localeCompare(b.label));

    const out = new Map<string, Placed>();
    const overflowed: string[] = [];
    for (const [code, list] of onMap) {
      const geo = STATES.find((s) => s.id === code) as StateGeo;
      const maxR = clusterRadius(geo, list.length);
      if (maxR > geo.clearance * 0.72 + 0.01 && list.length > 2) overflowed.push(geo.name);
      const golden = 2.399963229728653; // 137.507°
      list.forEach((n, i) => {
        const denom = Math.max(1, list.length - 1);
        const r = list.length <= 1 ? 0 : maxR * Math.sqrt(i / denom);
        const a = i * golden;
        out.set(n.id, {
          n,
          x: geo.cx + r * Math.cos(a),
          y: geo.cy + r * Math.sin(a),
          r: 2 + n.sz * 1.5,
          offMap: false,
        });
      });
    }
    // Gutter: a single ordered column, grouped by family.
    const colH = MAP_H - 90;
    const step = Math.min(15, colH / Math.max(1, offMap.length));
    offMap.forEach((n, i) => {
      out.set(n.id, { n, x: GUTTER_X, y: 62 + i * step, r: 2 + n.sz * 1.4, offMap: true });
    });
    return { map: out, offMapCount: offMap.length, onMapCount: out.size - offMap.length, overflowed };
  }, [nodes, connected, showGutter]);

  /** State→state aggregation for the flow mode. */
  const stateFlows = useMemo(() => {
    if (mode !== 'state-flows') return [];
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const agg = new Map<string, { from: StateCode; to: StateCode; amount: number; count: number; tiers: Set<Tier>; edges: GEdge[] }>();
    for (const e of visibleEdges) {
      const s = byId.get(e.s)?.st;
      const t = byId.get(e.t)?.st;
      if (!s || !t || s === t) continue;
      const key = `${s}>${t}`;
      if (!agg.has(key)) agg.set(key, { from: s, to: t, amount: 0, count: 0, tiers: new Set(), edges: [] });
      const rec = agg.get(key)!;
      rec.amount += e.a ?? 0;
      rec.count++;
      rec.tiers.add(e.tier);
      rec.edges.push(e);
    }
    return [...agg.entries()].map(([key, v]) => ({ key, ...v })).sort((a, b) => b.count - a.count);
  }, [visibleEdges, nodes, mode]);

  const focus = hover ?? selected;
  const ego = useMemo(() => {
    if (!focus) return null;
    const s = new Set<string>([focus]);
    for (const e of visibleEdges) {
      if (e.s === focus) s.add(e.t);
      if (e.t === focus) s.add(e.s);
    }
    return s;
  }, [focus, visibleEdges]);

  const weights = useMemo(() => Object.values(stateWeight ?? {}).filter((v): v is number => typeof v === 'number' && v > 0), [stateWeight]);
  const fillFor = (code: StateCode): string => {
    const v = stateWeight?.[code];
    if (typeof v !== 'number' || !weights.length) return `url(#geo-nodata-${uid})`;
    const sorted = [...weights].sort((a, b) => a - b);
    let i = 0;
    while (i < RAMP.length - 1 && v > sorted[Math.floor(((i + 1) / RAMP.length) * (sorted.length - 1))]) i++;
    return RAMP[i];
  };

  // Same-state edges cannot be drawn as an arc between two states; they are counted
  // and reported rather than silently dropped.
  const intraState = useMemo(() => {
    if (mode !== 'state-flows') return 0;
    const byId = new Map(nodes.map((n) => [n.id, n]));
    return visibleEdges.filter((e) => {
      const s = byId.get(e.s)?.st;
      const t = byId.get(e.t)?.st;
      return s && t && s === t;
    }).length;
  }, [visibleEdges, nodes, mode]);

  const unplaceable = useMemo(() => {
    if (mode !== 'state-flows') return 0;
    const byId = new Map(nodes.map((n) => [n.id, n]));
    return visibleEdges.filter((e) => !byId.get(e.s)?.st || !byId.get(e.t)?.st).length;
  }, [visibleEdges, nodes, mode]);

  const maxFlow = Math.max(1, ...stateFlows.map((f) => f.count));

  return (
    <div className="relative">
      <ExpandShell
        expanded={cam.expanded}
        onClose={() => cam.setExpanded(false)}
        caption={
          mode === 'entities'
            ? `${placed.onMapCount} placed · ${placed.offMapCount} non-geographic · ${visibleEdges.length} relationships`
            : `${stateFlows.length} state pairs · ${visibleEdges.length} relationships`
        }
      >
      <div
        className="relative outline-none focus-visible:ring-1 focus-visible:ring-accent"
        style={{ height: cam.expanded ? '100%' : height }}
        tabIndex={0}
        onKeyDown={onKeyDown}
        aria-label="Map viewport. Arrow keys pan, plus and minus zoom, 0 returns the whole map, f maximises."
      >
      <svg
        ref={svgRef}
        data-geo=""
        // FIXED viewBox, deliberately: these coordinates are map geometry, and a
        // map stretched to fill its box is a lie about the country's shape. It
        // letterboxes on purpose — the camera handles the pointer maths exactly.
        viewBox={`0 0 ${VIEW_W} ${MAP_H}`}
        style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none', cursor: cam.dragging ? 'grabbing' : 'grab' }}
        {...cam.svgProps}
        role="img"
        aria-label={
          mode === 'state-flows'
            ? `Map of India with ${stateFlows.length} aggregated state-to-state flows drawn as arcs. A table of the same data follows.`
            : `Map of India with ${placed.onMapCount} entities placed in their registered state and ${placed.offMapCount} non-geographic entities in a side column, connected by ${visibleEdges.length} relationships. A table of the same data follows.`
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
        <g>
          {STATES.map((s) => (
            <path
              key={s.id}
              d={s.path}
              fill={fillFor(s.id)}
              stroke="rgba(10,10,12,0.85)"
              strokeWidth="0.45"
              strokeLinejoin="round"
            />
          ))}
          {STATES.map((s) => (
            <path key={`o-${s.id}`} d={s.path} fill="none" stroke="rgba(201,168,108,0.18)" strokeWidth="0.35" />
          ))}
        </g>

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
          <g>
            {stateFlows.map((f) => {
              const a = STATES.find((s) => s.id === f.from);
              const b = STATES.find((s) => s.id === f.to);
              if (!a || !b) return null;
              const weakest = (['analytic', 'alleged', 'reported', 'documented'] as Tier[]).find((t) => f.tiers.has(t)) ?? 'documented';
              const w = 0.6 + (f.count / maxFlow) * 4.5;
              const isHover = hoverFlow === f.key;
              return (
                <path
                  key={f.key}
                  d={arc(a.cx, a.cy, b.cx, b.cy, curvatureFor(f.key))}
                  fill="none"
                  stroke={isHover ? 'var(--color-accent,#c9a86c)' : 'rgba(232,228,220,0.42)'}
                  strokeWidth={isHover ? w + 1.4 : w}
                  strokeDasharray={TIERS[weakest].dash || undefined}
                  strokeLinecap="round"
                  opacity={hoverFlow && !isHover ? 0.12 : 0.72}
                  markerEnd={`url(#geo-arrow-${uid})`}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoverFlow(f.key)}
                  onMouseLeave={() => setHoverFlow(null)}
                >
                  <title>{`${a.name} → ${b.name}: ${f.count} relationship${f.count === 1 ? '' : 's'}${f.amount ? `, ₹${f.amount.toLocaleString('en-IN')} cr` : ''} · weakest tier ${weakest}`}</title>
                </path>
              );
            })}
          </g>
        ) : (
          <g>
            {visibleEdges.map((e, i) => {
              const s = placed.map.get(e.s);
              const t = placed.map.get(e.t);
              if (!s || !t) return null;
              const dim = ego && !(ego.has(e.s) && ego.has(e.t));
              const isContra = e.pred === 'contra';
              // Flatten arcs into the gutter — a bulging line into a straight column
              // reads as noise rather than as connection.
              const k = s.offMap || t.offMap ? 0.05 : curvatureFor(`${e.s}>${e.t}`);
              return (
                <path
                  key={`${e.s}-${e.t}-${i}`}
                  d={arc(s.x, s.y, t.x, t.y, k)}
                  fill="none"
                  stroke={isContra ? '#c45b5a' : 'rgba(232,228,220,0.34)'}
                  strokeWidth={isContra ? 1.1 : 0.45 + Math.min(2, Math.sqrt(e.a ?? 0) / 34)}
                  strokeDasharray={TIERS[e.tier].dash || undefined}
                  opacity={dim ? 0.06 : ego ? 0.85 : 0.42}
                  pointerEvents="none"
                >
                  <title>{`${e.s} → ${e.t} · ${e.pred} · ${e.tier}`}</title>
                </path>
              );
            })}
          </g>
        )}

        {/* ---- entity marks ---- */}
        {mode === 'entities' && (
          <g>
            {[...placed.map.values()].map((p) => {
              const dim = ego && !ego.has(p.n.id);
              const isSel = selected === p.n.id;
              return (
                <g key={p.n.id} opacity={dim ? 0.12 : 1}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isSel || hover === p.n.id ? p.r + 1.8 : p.r}
                    fill={FAMILY_COLOR[p.n.fam]}
                    fillOpacity={p.n.resolved === false ? 0.25 : 0.9}
                    stroke={isSel ? '#e8e4dc' : 'rgba(10,10,12,0.9)'}
                    strokeWidth={isSel ? 1.2 : 0.4}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHover(p.n.id)}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => onSelect?.(isSel ? null : p.n.id)}
                  >
                    <title>{`${p.n.label}${p.n.sub ? ` — ${p.n.sub}` : ''}`}</title>
                  </circle>
                  {p.offMap && (
                    <text
                      x={p.x + 6}
                      y={p.y}
                      dominantBaseline="central"
                      fontSize="6.4"
                      fill="rgba(240,236,228,0.62)"
                      pointerEvents="none"
                    >
                      {p.n.label.length > 26 ? `${p.n.label.slice(0, 25)}…` : p.n.label}
                    </text>
                  )}
                  {!p.offMap && (isSel || hover === p.n.id) && (
                    <text
                      x={p.x}
                      y={p.y - p.r - 4}
                      textAnchor="middle"
                      fontSize="7.5"
                      fill="rgba(240,236,228,0.92)"
                      stroke="rgba(10,10,12,0.8)"
                      strokeWidth="2"
                      paintOrder="stroke"
                      pointerEvents="none"
                    >
                      {p.n.label}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        )}

        {/* state anchors in flow mode */}
        {mode === 'state-flows' && (
          <g>
            {STATES.filter((s) => stateFlows.some((f) => f.from === s.id || f.to === s.id)).map((s) => (
              <g key={`a-${s.id}`}>
                <circle cx={s.cx} cy={s.cy} r="2.6" fill="var(--color-accent,#c9a86c)" stroke="rgba(10,10,12,0.9)" strokeWidth="0.5" />
                <text
                  x={s.cx}
                  y={s.cy - 6}
                  textAnchor="middle"
                  fontSize="7.5"
                  fill="rgba(240,236,228,0.8)"
                  stroke="rgba(10,10,12,0.7)"
                  strokeWidth="2"
                  paintOrder="stroke"
                  pointerEvents="none"
                >
                  {s.name}
                </text>
              </g>
            ))}
          </g>
        )}
        </g>
      </svg>

      {/* readout */}
      {mode === 'entities' && focus && placed.map.get(focus) && (
        <div className="pointer-events-none absolute top-3 left-3 max-w-[17rem] rounded-lg border border-border-light bg-bg-elevated/95 backdrop-blur px-3 py-2 shadow-lg">
          <p className="text-sm font-medium leading-tight">{placed.map.get(focus)!.n.label}</p>
          <p className="text-[11px] text-text-muted mt-0.5">
            {placed.map.get(focus)!.n.sub ?? placed.map.get(focus)!.n.ty} ·{' '}
            {(ego?.size ?? 1) - 1} direct connection{(ego?.size ?? 1) - 1 === 1 ? '' : 's'}
          </p>
          {placed.map.get(focus)!.offMap && (
            <p className="text-[10.5px] text-amber mt-1">Not geographic — shown in the side column.</p>
          )}
        </div>
      )}

      <div className="absolute bottom-2 left-2 max-w-[58%] font-mono text-[10px] leading-relaxed text-text-muted bg-bg/80 px-1.5 py-0.5 rounded">
        drag to pan · arrows or the pad to move · +/− or scroll to zoom · 0 returns the whole map · f maximises
      </div>

      <CameraControls cam={cam} onFit={() => cam.fitTo(null)} fitLabel="Back to the whole map (0)" />
      </div>
      </ExpandShell>

      {/* legend + the honesty line */}
      <div className="mt-3 space-y-2">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] text-text-muted">
          {mode === 'entities' ? (
            <>
              {([...filter.families] as NodeFamily[]).map((f) => (
                <span key={f} className="flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: FAMILY_COLOR[f] }} />
                  {FAMILY_LABEL[f]}
                </span>
              ))}
            </>
          ) : (
            <span>arc thickness = number of relationships · direction = arrowhead</span>
          )}
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block w-5 h-2.5 border border-border"
              style={{ background: 'repeating-linear-gradient(45deg,transparent,transparent 2px,rgba(201,168,108,.22) 2px,rgba(201,168,108,.22) 3px)' }}
            />
            no data — not zero
          </span>
          <span className="ml-auto font-mono">
            {mode === 'entities'
              ? `${placed.onMapCount} placed · ${placed.offMapCount} non-geographic · ${visibleEdges.length} relationships`
              : `${stateFlows.length} state pairs · ${visibleEdges.length} relationships`}
          </span>
        </div>

        <p className="text-[11.5px] text-text-muted leading-relaxed max-w-[76ch]">
          {mode === 'entities' ? (
            <>
              Marks are placed <strong>within</strong> their registered state on a golden-angle spiral —{' '}
              <strong>not geocoded</strong>. A mark's position inside a state carries no information.{' '}
              {placed.offMapCount > 0 && (
                <>
                  {placed.offMapCount} entities in the graph have no location at all — people, rules,
                  parties, sectors — and sit in the side column rather than being dropped from the network
                  or given a place they do not have.{' '}
                </>
              )}
              {placed.overflowed.length > 0 && (
                <>
                  In {placed.overflowed.slice(0, 3).join(', ')}
                  {placed.overflowed.length > 3 ? ` and ${placed.overflowed.length - 3} other${placed.overflowed.length - 3 === 1 ? '' : 's'}` : ''}{' '}
                  the cluster is larger than the state and spills past the boundary. That costs no accuracy
                  — the marks were never located inside it — but it is a distortion, so it is named.
                </>
              )}
            </>
          ) : (
            <>
              Arcs aggregate relationships between the <strong>registered</strong> states of the two
              entities — which is a fact about registered offices, not about where anything happened.
              {intraState > 0 && ` ${intraState} relationship${intraState === 1 ? '' : 's'} within a single state cannot be drawn as an arc and ${intraState === 1 ? 'is' : 'are'} excluded from the map but counted here.`}
              {unplaceable > 0 && ` ${unplaceable} involve an entity with no location and ${unplaceable === 1 ? 'is' : 'are'} likewise excluded.`}{' '}
              Nothing is silently dropped.
            </>
          )}
        </p>
      </div>
    </div>
  );
}

/** Exported so the page can render the same aggregation as a table twin. */
export function aggregateStateFlows(nodes: GNode[], edges: GEdge[]) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const agg = new Map<string, { from: StateCode; to: StateCode; amount: number; count: number; edges: GEdge[] }>();
  for (const e of edges) {
    const s = byId.get(e.s)?.st;
    const t = byId.get(e.t)?.st;
    if (!s || !t || s === t) continue;
    const key = `${s}>${t}`;
    if (!agg.has(key)) agg.set(key, { from: s, to: t, amount: 0, count: 0, edges: [] });
    const rec = agg.get(key)!;
    rec.amount += e.a ?? 0;
    rec.count++;
    rec.edges.push(e);
  }
  return [...agg.values()].sort((a, b) => b.count - a.count || b.amount - a.amount);
}
