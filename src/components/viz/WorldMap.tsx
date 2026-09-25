import { useEffect, useId, useMemo, useState } from 'react';
import { TIERS, type Tier } from '../../graph/schema';
import {
  GRATICULE,
  WORLD_LAND_PATHS,
  WORLD_OUTLINE_NOTE,
  WORLD_OUTLINE_OMISSIONS,
  WORLD_OUTLINE_VERTEX_COUNT,
  WORLD_VIEWBOX,
  inLonLatRange,
  isOnOutline,
  project,
} from '../../data/world-geo';

/**
 * The world map — Indian corporate footprint outside India.
 *
 * Cartographic engraving on a plate carrée grid: a coarse schematic coastline, a
 * 30° graticule, geocoded marks, and tier-dashed arcs between them.
 *
 * Three honesty problems come with drawing this, and all three are stated on the
 * face of the component rather than handled quietly:
 *
 * 1. **The coastline is a cartoon.** It was hand-typed at a few hundred vertices and
 *    was never a survey. `WORLD_OUTLINE_NOTE` says so and is always rendered. The
 *    marks are as accurate as the coordinates fed in; the land behind them is not.
 * 2. **Equirectangular lies about area and distance.** An arc here is a Bézier on a
 *    flat grid, not a great circle. It shows that two places are connected, not the
 *    route between them or how far apart they are.
 * 3. **Anything undrawable is counted, never dropped.** Coordinates out of range,
 *    marks that miss the schematic land, links pointing at absent places and links
 *    that would cross the antimeridian are all tallied in the caption.
 */

export interface WorldPlace {
  id: string;
  label: string;
  lon: number;
  lat: number;
  kind: 'port' | 'plant' | 'office' | 'mine' | 'hq' | 'partner';
  country: string;
  /** ₹ crore or any magnitude; drives mark radius. Optional. */
  weight?: number;
  srcs?: [string, string][];
}

export interface WorldLink {
  from: string; // WorldPlace id
  to: string; // WorldPlace id
  label?: string;
  tier: Tier; // from src/graph/schema
  srcs?: [string, string][];
}

interface Props {
  places: WorldPlace[];
  links?: WorldLink[];
  height?: number;
  selected?: string | null;
  onSelect?: (id: string | null) => void;
  caption?: string;
}

type MarkShape = 'circle' | 'square' | 'diamond' | 'triangle' | 'downTriangle' | 'hex';

/**
 * Kind → hue and shape. Both channels are used together: hue alone fails for
 * colour-blind readers and shape alone fails at this mark size, so every kind is
 * separated twice. Colours are the existing tokens in `src/index.css` — no new
 * palette, and each resolves in whatever theme is active.
 */
const KIND_SPEC: Record<WorldPlace['kind'], { label: string; color: string; shape: MarkShape }> = {
  hq: { label: 'Headquarters', color: 'var(--color-accent, #c9a86c)', shape: 'hex' },
  office: { label: 'Office', color: 'var(--color-sage, #7a9e7e)', shape: 'circle' },
  plant: { label: 'Plant', color: 'var(--color-teal, #5aa89e)', shape: 'square' },
  port: { label: 'Port / terminal', color: 'var(--color-blue, #5a8ec4)', shape: 'diamond' },
  mine: { label: 'Mine / concession', color: 'var(--color-amber, #d4a03d)', shape: 'triangle' },
  partner: { label: 'Partner / counterparty', color: 'var(--color-purple, #8b7ec4)', shape: 'downTriangle' },
};

const KIND_ORDER: WorldPlace['kind'][] = ['hq', 'office', 'plant', 'port', 'mine', 'partner'];

/** Evidence-tier stroke colour. The dash pattern comes from TIERS and is never restyled. */
const TIER_STROKE: Record<Tier, string> = {
  documented: 'var(--color-tier-documented, #7a9e7e)',
  reported: 'var(--color-tier-reported, #5a8ec4)',
  alleged: 'var(--color-tier-alleged, #d4a03d)',
  analytic: 'var(--color-tier-analytic, #6b6558)',
};

const TIER_ORDER_LOCAL: Tier[] = ['documented', 'reported', 'alleged', 'analytic'];

const R_MIN = 2.2;
const R_MAX = 8.5;

/** One element type for every mark, so the render stays declarative and uniform. */
function markPath(shape: MarkShape, r: number): string {
  const f = (n: number) => n.toFixed(2);
  switch (shape) {
    case 'square':
      return `M ${f(-r * 0.9)} ${f(-r * 0.9)} H ${f(r * 0.9)} V ${f(r * 0.9)} H ${f(-r * 0.9)} Z`;
    case 'diamond':
      return `M 0 ${f(-r * 1.25)} L ${f(r * 1.25)} 0 L 0 ${f(r * 1.25)} L ${f(-r * 1.25)} 0 Z`;
    case 'triangle':
      return `M 0 ${f(-r * 1.3)} L ${f(r * 1.15)} ${f(r * 0.75)} L ${f(-r * 1.15)} ${f(r * 0.75)} Z`;
    case 'downTriangle':
      return `M 0 ${f(r * 1.3)} L ${f(r * 1.15)} ${f(-r * 0.75)} L ${f(-r * 1.15)} ${f(-r * 0.75)} Z`;
    case 'hex': {
      const pts: string[] = [];
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 2;
        pts.push(`${f(r * 1.12 * Math.cos(a))} ${f(r * 1.12 * Math.sin(a))}`);
      }
      return `M ${pts.join(' L ')} Z`;
    }
    case 'circle':
    default:
      return `M ${f(-r)} 0 A ${f(r)} ${f(r)} 0 1 0 ${f(r)} 0 A ${f(r)} ${f(r)} 0 1 0 ${f(-r)} 0 Z`;
  }
}

/**
 * A quadratic arc bulging toward the nearer pole.
 *
 * This is a drawing convention, not a route. On a great circle a long east–west
 * link does bend poleward, so the bulge is the right *direction* of distortion —
 * but the curve here is a Bézier on a flat grid and matches no real path.
 */
function arcPath(a: { x: number; y: number }, b: { x: number; y: number }): string {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  const dir = my <= 180 ? -1 : 1; // y=180 is the equator in this viewBox
  const cy = Math.min(356, Math.max(4, my + dir * d * 0.22));
  return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} Q ${mx.toFixed(1)} ${cy.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return reduced;
}

export default function WorldMap({
  places,
  links = [],
  height = 420,
  selected = null,
  onSelect,
  caption,
}: Props) {
  const uid = useId().replace(/:/g, '');
  const [hover, setHover] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const reduced = usePrefersReducedMotion();

  /**
   * Resolve every place once. Nothing is filtered away here: undrawable places are
   * flagged and counted so the caption can name them.
   */
  const resolved = useMemo(() => {
    const byId = new Map<string, WorldPlace>();
    const duplicateIds: string[] = [];
    for (const p of places) {
      if (byId.has(p.id)) duplicateIds.push(p.id);
      else byId.set(p.id, p);
    }
    const drawn: { p: WorldPlace; x: number; y: number; offOutline: boolean }[] = [];
    const outOfRange: WorldPlace[] = [];
    for (const p of byId.values()) {
      if (!inLonLatRange(p.lon, p.lat)) {
        outOfRange.push(p);
        continue;
      }
      const { x, y } = project(p.lon, p.lat);
      drawn.push({ p, x, y, offOutline: !isOnOutline(p.lon, p.lat) });
    }
    const weights = drawn
      .map((d) => d.p.weight)
      .filter((w): w is number => typeof w === 'number' && Number.isFinite(w) && w > 0);
    return {
      byId,
      drawn,
      outOfRange,
      duplicateIds,
      offOutline: drawn.filter((d) => d.offOutline).map((d) => d.p),
      unweighted: drawn.filter((d) => typeof d.p.weight !== 'number' || !(d.p.weight > 0)).length,
      maxWeight: weights.length ? Math.max(...weights) : 0,
    };
  }, [places]);

  const posOf = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>();
    for (const d of resolved.drawn) m.set(d.p.id, { x: d.x, y: d.y });
    return m;
  }, [resolved]);

  const radiusOf = useMemo(() => {
    const max = resolved.maxWeight;
    return (w?: number): number => {
      if (typeof w !== 'number' || !Number.isFinite(w) || w <= 0 || max <= 0) return R_MIN;
      const t = Math.sqrt(w) / Math.sqrt(max);
      return Math.min(R_MAX, Math.max(R_MIN, R_MIN + t * (R_MAX - R_MIN)));
    };
  }, [resolved.maxWeight]);

  /** Link geometry, with everything undrawable counted rather than skipped in silence. */
  const linkGeom = useMemo(() => {
    const drawnLinks: {
      key: string;
      l: WorldLink;
      d: string;
      from: WorldPlace;
      to: WorldPlace;
      longWay: boolean;
    }[] = [];
    let dangling = 0;
    let undrawableEndpoint = 0;
    let selfLoop = 0;
    let antimeridian = 0;
    links.forEach((l, i) => {
      const a = resolved.byId.get(l.from);
      const b = resolved.byId.get(l.to);
      if (!a || !b) {
        dangling++;
        return;
      }
      if (l.from === l.to) {
        selfLoop++;
        return;
      }
      const pa = posOf.get(l.from);
      const pb = posOf.get(l.to);
      if (!pa || !pb) {
        undrawableEndpoint++;
        return;
      }
      const longWay = Math.abs(a.lon - b.lon) > 180;
      if (longWay) antimeridian++;
      drawnLinks.push({ key: `${l.from}>${l.to}-${i}`, l, d: arcPath(pa, pb), from: a, to: b, longWay });
    });
    return { drawnLinks, dangling, undrawableEndpoint, selfLoop, antimeridian };
  }, [links, posOf, resolved.byId]);

  const tiersUsed = useMemo(() => {
    const s = new Set<Tier>();
    for (const g of linkGeom.drawnLinks) s.add(g.l.tier);
    return TIER_ORDER_LOCAL.filter((t) => s.has(t));
  }, [linkGeom.drawnLinks]);

  const kindsUsed = useMemo(() => {
    const s = new Set<WorldPlace['kind']>();
    for (const d of resolved.drawn) s.add(d.p.kind);
    return KIND_ORDER.filter((k) => s.has(k));
  }, [resolved.drawn]);

  const active = hover ?? focusId ?? selected ?? null;

  /** Places one hop from the active one — used to dim everything else. */
  const ego = useMemo(() => {
    if (!active) return null;
    const s = new Set<string>([active]);
    for (const g of linkGeom.drawnLinks) {
      if (g.l.from === active) s.add(g.l.to);
      if (g.l.to === active) s.add(g.l.from);
    }
    return s;
  }, [active, linkGeom.drawnLinks]);

  const activePlace = active ? resolved.byId.get(active) ?? null : null;
  const activeOffOutline = activePlace ? resolved.offOutline.some((p) => p.id === activePlace.id) : false;
  const activeLinks = active
    ? linkGeom.drawnLinks.filter((g) => g.l.from === active || g.l.to === active)
    : [];

  const trans = reduced ? undefined : 'opacity .18s ease, transform .18s ease';

  const ariaLabel =
    resolved.drawn.length === 0
      ? 'World map with no places to draw.'
      : `Schematic world map. ${resolved.drawn.length} place${resolved.drawn.length === 1 ? '' : 's'} plotted by longitude and latitude` +
        (linkGeom.drawnLinks.length
          ? `, joined by ${linkGeom.drawnLinks.length} link${linkGeom.drawnLinks.length === 1 ? '' : 's'} whose dash pattern carries the evidence tier`
          : '') +
        '. The coastline behind them is a coarse hand-drawn schematic, not a survey. A table of the same data follows the graphic.';

  /** `n thing(s) verb(s)` — the counts are the point, so the grammar has to hold at n = 1. */
  const say = (n: number, noun: string, singular: string, plural: string) =>
    `${n} ${noun}${n === 1 ? '' : 's'} ${n === 1 ? singular : plural}`;

  const nothingShown: string[] = [];
  if (resolved.offOutline.length)
    nothingShown.push(
      `${say(resolved.offOutline.length, 'mark', 'falls', 'fall')} outside the drawn coastline (${resolved.offOutline
        .slice(0, 3)
        .map((p) => p.label)
        .join(', ')}${resolved.offOutline.length > 3 ? `, +${resolved.offOutline.length - 3} more` : ''}) — the outline is at fault there, not the coordinate`,
    );
  if (resolved.outOfRange.length)
    nothingShown.push(
      `${say(resolved.outOfRange.length, 'place', 'has', 'have')} coordinates outside ±180°/±90° and ${
        resolved.outOfRange.length === 1 ? 'is' : 'are'
      } not drawn at all`,
    );
  if (resolved.duplicateIds.length)
    nothingShown.push(
      `${say(resolved.duplicateIds.length, 'place', 'repeats', 'repeat')} an id already used, and only the first of each was kept`,
    );
  if (linkGeom.dangling)
    nothingShown.push(
      `${say(linkGeom.dangling, 'link', 'references', 'reference')} a place id that is not in this set and ${
        linkGeom.dangling === 1 ? 'is' : 'are'
      } not drawn`,
    );
  if (linkGeom.undrawableEndpoint)
    nothingShown.push(`${say(linkGeom.undrawableEndpoint, 'link', 'ends', 'end')} at a place that could not be plotted`);
  if (linkGeom.selfLoop)
    nothingShown.push(`${say(linkGeom.selfLoop, 'link', 'joins', 'join')} a place to itself and cannot be drawn as an arc`);
  if (linkGeom.antimeridian)
    nothingShown.push(
      `${say(linkGeom.antimeridian, 'link', 'would', 'would')} cross the antimeridian and ${
        linkGeom.antimeridian === 1 ? 'is' : 'are'
      } drawn the long way across the map instead`,
    );

  // --- empty state -----------------------------------------------------------
  if (places.length === 0) {
    return (
      <div className="w-full max-w-full">
        <div className="rounded-lg border border-dashed border-border-light bg-bg-elevated/40 px-4 py-10 text-center">
          <p className="text-sm text-text-secondary">No places to draw.</p>
          <p className="mt-1 text-[11.5px] text-text-muted max-w-[60ch] mx-auto">
            This is an empty result, not a world with nothing in it. Nothing has been filtered out
            here — no place records were passed to the map.
          </p>
        </div>
        <p className="mt-3 text-[11.5px] leading-relaxed text-text-muted max-w-[80ch]">{WORLD_OUTLINE_NOTE}</p>
        {caption && <p className="mt-2 text-[11.5px] leading-relaxed text-text-muted max-w-[80ch]">{caption}</p>}
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-full overflow-hidden">
      <svg
        viewBox={WORLD_VIEWBOX}
        style={{ width: '100%', height, display: 'block' }}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={ariaLabel}
      >
        <defs>
          {tiersUsed.map((t) => (
            <marker
              key={t}
              id={`wm-arrow-${t}-${uid}`}
              viewBox="0 0 8 8"
              refX="7"
              refY="4"
              markerWidth="4"
              markerHeight="4"
              orient="auto"
            >
              <path d="M 0 0 L 8 4 L 0 8 z" fill={TIER_STROKE[t]} opacity="0.75" />
            </marker>
          ))}
        </defs>

        {/* ground: a plate mark and the graticule, both from theme tokens so they
            hold up on a light ground as well as a dark one */}
        <rect
          x="0.5"
          y="0.5"
          width="719"
          height="359"
          fill="none"
          stroke="var(--color-border-light, rgba(244,240,232,0.15))"
          strokeWidth="0.6"
        />
        <g pointerEvents="none" stroke="currentColor" opacity="0.16" strokeWidth="0.4">
          {GRATICULE.meridians.map((lon) => (
            <line key={`m${lon}`} x1={project(lon, 90).x} y1={0} x2={project(lon, -90).x} y2={360} />
          ))}
          {GRATICULE.parallels.map((lat) => (
            <line
              key={`p${lat}`}
              x1={0}
              y1={project(0, lat).y}
              x2={720}
              y2={project(0, lat).y}
              strokeWidth={lat === 0 ? 0.7 : 0.4}
            />
          ))}
        </g>

        {/* land: fill, then a hairline coast pass over it */}
        <g pointerEvents="none">
          {WORLD_LAND_PATHS.map((l) => (
            <path key={l.id} d={l.d} fill="currentColor" fillOpacity="0.09" strokeLinejoin="round" />
          ))}
          {WORLD_LAND_PATHS.map((l) => (
            <path
              key={`o-${l.id}`}
              d={l.d}
              fill="none"
              stroke="var(--color-accent, #c9a86c)"
              strokeOpacity="0.30"
              strokeWidth="0.45"
              strokeLinejoin="round"
            >
              <title>{`${l.name} — schematic outline, not a survey`}</title>
            </path>
          ))}
        </g>

        {/* links */}
        <g fill="none">
          {linkGeom.drawnLinks.map((g) => {
            const isEgo = !ego || (ego.has(g.l.from) && ego.has(g.l.to));
            const isActiveLink = active !== null && (g.l.from === active || g.l.to === active);
            return (
              <path
                key={g.key}
                d={g.d}
                stroke={TIER_STROKE[g.l.tier]}
                strokeWidth={isActiveLink ? 1.5 : 0.75}
                strokeDasharray={TIERS[g.l.tier].dash || undefined}
                strokeLinecap="round"
                opacity={ego ? (isEgo ? 0.95 : 0.07) : 0.6}
                markerEnd={`url(#wm-arrow-${g.l.tier}-${uid})`}
                style={{ transition: trans }}
              >
                <title>
                  {`${g.from.label} → ${g.to.label}${g.l.label ? ` · ${g.l.label}` : ''} · ${TIERS[g.l.tier].label.toLowerCase()} evidence${
                    g.longWay ? ' · drawn the long way round: this pair is shorter across the antimeridian' : ''
                  }`}
                </title>
              </path>
            );
          })}
        </g>

        {/* marks, largest first so small ones stay clickable on top */}
        <g>
          {[...resolved.drawn]
            .sort((a, b) => radiusOf(b.p.weight) - radiusOf(a.p.weight))
            .map(({ p, x, y, offOutline }) => {
              const spec = KIND_SPEC[p.kind];
              const r = radiusOf(p.weight);
              const isActive = active === p.id;
              const dim = ego ? !ego.has(p.id) : false;
              const hasWeight = typeof p.weight === 'number' && Number.isFinite(p.weight) && p.weight > 0;
              return (
                <g
                  key={p.id}
                  transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}
                  opacity={dim ? 0.14 : 1}
                  style={{ transition: trans, cursor: 'pointer', outline: 'none' }}
                  tabIndex={0}
                  role="button"
                  aria-label={`${p.label}, ${p.country}, ${spec.label.toLowerCase()}`}
                  onMouseEnter={() => setHover(p.id)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setFocusId(p.id)}
                  onBlur={() => setFocusId(null)}
                  onClick={() => onSelect?.(selected === p.id ? null : p.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect?.(selected === p.id ? null : p.id);
                    } else if (e.key === 'Escape') {
                      onSelect?.(null);
                    }
                  }}
                >
                  {/* focus / selection ring, drawn in SVG so it is visible in both themes */}
                  {(focusId === p.id || selected === p.id) && (
                    <circle
                      r={r + 4}
                      fill="none"
                      stroke="var(--color-accent, #c9a86c)"
                      strokeWidth="1.1"
                      strokeDasharray="3 2"
                      pointerEvents="none"
                    />
                  )}
                  <path
                    d={markPath(spec.shape, isActive ? r + 1.2 : r)}
                    fill={spec.color}
                    fillOpacity={hasWeight ? 0.88 : 0.14}
                    stroke={spec.color}
                    strokeWidth={hasWeight ? 0.5 : 0.9}
                  >
                    <title>
                      {`${p.label} — ${p.country} · ${spec.label}${
                        hasWeight ? ` · weight ${p.weight!.toLocaleString('en-IN')}` : ' · no weight given (drawn hollow at minimum size, not zero)'
                      }${offOutline ? ' · sits off the schematic coastline' : ''}`}
                    </title>
                  </path>
                  {isActive && (
                    <text
                      x={0}
                      y={-r - 5}
                      textAnchor="middle"
                      fontSize="7.5"
                      fontFamily="var(--font-sans, Inter, system-ui)"
                      fill="currentColor"
                      stroke="var(--color-bg, #0a0a0c)"
                      strokeWidth="2.2"
                      paintOrder="stroke"
                      pointerEvents="none"
                    >
                      {p.label}
                    </text>
                  )}
                </g>
              );
            })}
        </g>
      </svg>

      {/* readout — interactive, because the sources in it are links */}
      {activePlace && (
        <div className="absolute top-2 left-2 max-w-[17rem] rounded-lg border border-border-light bg-bg-elevated/95 backdrop-blur px-3 py-2 shadow-lg">
          <p className="text-sm font-medium leading-tight">{activePlace.label}</p>
          <p className="mt-0.5 text-[11px] text-text-muted">
            {activePlace.country} · {KIND_SPEC[activePlace.kind].label}
            {typeof activePlace.weight === 'number' && activePlace.weight > 0
              ? ` · ${activePlace.weight.toLocaleString('en-IN')}`
              : ' · no weight given'}
          </p>
          <p className="mt-0.5 font-mono text-[10.5px] text-text-muted">
            {activePlace.lat.toFixed(2)}°, {activePlace.lon.toFixed(2)}°
          </p>
          {activeOffOutline && (
            <p className="mt-1 text-[10.5px] text-amber">
              Drawn off the schematic coastline — the outline is coarse here, the coordinate stands.
            </p>
          )}
          {activeLinks.length > 0 && (
            <p className="mt-1 text-[10.5px] text-text-secondary">
              {activeLinks.length} link{activeLinks.length === 1 ? '' : 's'} ·{' '}
              {[...new Set(activeLinks.map((g) => TIERS[g.l.tier].label.toLowerCase()))].join(', ')}
            </p>
          )}
          {activePlace.srcs?.length ? (
            <ul className="mt-1.5 space-y-0.5">
              {activePlace.srcs.map(([label, url], i) => (
                <li key={`${url}-${i}`} className="text-[10.5px]">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 text-text-secondary hover:text-text"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1.5 text-[10.5px] text-text-muted italic">No source recorded for this place.</p>
          )}
        </div>
      )}

      {/* legend — one entry per encoding actually used */}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-text-muted">
        {kindsUsed.map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">
              <path d={markPath(KIND_SPEC[k].shape, 4.4)} fill={KIND_SPEC[k].color} fillOpacity="0.88" />
            </svg>
            {KIND_SPEC[k].label}
          </span>
        ))}
        {resolved.maxWeight > 0 && (
          <span className="flex items-center gap-1.5">
            <svg width="26" height="14" viewBox="-13 -7 26 14" aria-hidden="true">
              <path d={markPath('circle', 2.2)} transform="translate(-7 0)" fill="currentColor" fillOpacity="0.55" />
              <path d={markPath('circle', 6)} transform="translate(4 0)" fill="currentColor" fillOpacity="0.55" />
            </svg>
            area ∝ weight (radius = √weight, clamped)
          </span>
        )}
        {resolved.unweighted > 0 && (
          <span className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">
              <path d={markPath('circle', 4)} fill="currentColor" fillOpacity="0.14" stroke="currentColor" strokeWidth="0.9" />
            </svg>
            hollow = no weight given ({resolved.unweighted}) — not zero
          </span>
        )}
        {tiersUsed.map((t) => (
          <span key={t} className="flex items-center gap-1.5">
            <svg width="26" height="8" viewBox="0 0 26 8" aria-hidden="true">
              <line
                x1="0"
                y1="4"
                x2="26"
                y2="4"
                stroke={TIER_STROKE[t]}
                strokeWidth="1.4"
                strokeDasharray={TIERS[t].dash || undefined}
              />
            </svg>
            {TIERS[t].label} link
          </span>
        ))}
        {linkGeom.drawnLinks.length > 0 && <span>arrowhead = direction</span>}
        <span className="ml-auto font-mono">
          {resolved.drawn.length} drawn · {linkGeom.drawnLinks.length} links
        </span>
      </div>

      {/* the honesty block: what the outline is, and what is not shown */}
      <div className="mt-2 space-y-1.5 max-w-[82ch]">
        <p className="text-[11.5px] leading-relaxed text-text-muted">
          {WORLD_OUTLINE_NOTE} It is {WORLD_OUTLINE_VERTEX_COUNT} vertices in total, and leaves out{' '}
          {WORLD_OUTLINE_OMISSIONS}. Marks are geocoded to the longitude and latitude given, so they are
          exactly as accurate as those inputs — the land behind them is not. Arcs are drawn curves on a flat
          equirectangular grid: they show that two places are linked, never the route or the distance.
        </p>
        {nothingShown.length > 0 && (
          <p className="text-[11.5px] leading-relaxed text-amber">
            Not shown as drawn: {nothingShown.join('; ')}. Nothing was dropped silently — every one of these
            appears in the table below.
          </p>
        )}
        {caption && <p className="text-[11.5px] leading-relaxed text-text-muted">{caption}</p>}
      </div>

      {/* the WCAG-clean twin of the graphic */}
      <details className="mt-2">
        <summary className="cursor-pointer text-[11px] uppercase tracking-wider text-text-muted">
          Table view — the same data, including everything the map cannot draw
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-[11.5px]">
            <caption className="sr-only">Places plotted on the world map, and whether each one could be drawn</caption>
            <thead className="text-text-muted">
              <tr className="border-b border-border">
                <th scope="col" className="py-1 pr-3 font-medium">Place</th>
                <th scope="col" className="py-1 pr-3 font-medium">Country</th>
                <th scope="col" className="py-1 pr-3 font-medium">Kind</th>
                <th scope="col" className="py-1 pr-3 font-medium">Weight</th>
                <th scope="col" className="py-1 pr-3 font-medium">Lat, lon</th>
                <th scope="col" className="py-1 pr-3 font-medium">On map</th>
                <th scope="col" className="py-1 font-medium">Sources</th>
              </tr>
            </thead>
            <tbody>
              {places.map((p, i) => {
                const off = resolved.offOutline.some((x) => x.id === p.id);
                const bad = resolved.outOfRange.some((x) => x.id === p.id);
                return (
                  <tr key={`${p.id}-${i}`} className="border-b border-border/60 align-top">
                    <th scope="row" className="py-1 pr-3 font-normal text-text">{p.label}</th>
                    <td className="py-1 pr-3 text-text-secondary">{p.country}</td>
                    <td className="py-1 pr-3 text-text-secondary">{KIND_SPEC[p.kind].label}</td>
                    <td className="py-1 pr-3 font-mono text-text-secondary">
                      {typeof p.weight === 'number' && p.weight > 0 ? p.weight.toLocaleString('en-IN') : 'not given'}
                    </td>
                    <td className="py-1 pr-3 font-mono text-text-muted">
                      {p.lat}, {p.lon}
                    </td>
                    <td className="py-1 pr-3 text-text-secondary">
                      {bad ? 'no — coordinates out of range' : off ? 'yes — but off the coarse outline' : 'yes'}
                    </td>
                    <td className="py-1 text-text-secondary">
                      {p.srcs?.length
                        ? p.srcs.map(([label, url], j) => (
                            <span key={`${url}-${j}`}>
                              {j > 0 && '; '}
                              <a href={url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                                {label}
                              </a>
                            </span>
                          ))
                        : 'none recorded'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {links.length > 0 && (
            <table className="mt-4 w-full text-left text-[11.5px]">
              <caption className="sr-only">Links between places, and whether each one could be drawn</caption>
              <thead className="text-text-muted">
                <tr className="border-b border-border">
                  <th scope="col" className="py-1 pr-3 font-medium">From</th>
                  <th scope="col" className="py-1 pr-3 font-medium">To</th>
                  <th scope="col" className="py-1 pr-3 font-medium">Relationship</th>
                  <th scope="col" className="py-1 pr-3 font-medium">Evidence tier</th>
                  <th scope="col" className="py-1 pr-3 font-medium">Drawn</th>
                  <th scope="col" className="py-1 font-medium">Sources</th>
                </tr>
              </thead>
              <tbody>
                {links.map((l, i) => {
                  const a = resolved.byId.get(l.from);
                  const b = resolved.byId.get(l.to);
                  const drawnRec = linkGeom.drawnLinks.find((g) => g.key === `${l.from}>${l.to}-${i}`);
                  const why = !a
                    ? `no — "${l.from}" is not in this place set`
                    : !b
                      ? `no — "${l.to}" is not in this place set`
                      : l.from === l.to
                        ? 'no — joins a place to itself'
                        : !drawnRec
                          ? 'no — an endpoint could not be plotted'
                          : drawnRec.longWay
                            ? 'yes — the long way round the antimeridian'
                            : 'yes';
                  return (
                    <tr key={`${l.from}-${l.to}-${i}`} className="border-b border-border/60 align-top">
                      <th scope="row" className="py-1 pr-3 font-normal text-text">{a?.label ?? l.from}</th>
                      <td className="py-1 pr-3 text-text-secondary">{b?.label ?? l.to}</td>
                      <td className="py-1 pr-3 text-text-secondary">{l.label ?? '—'}</td>
                      <td className="py-1 pr-3 text-text-secondary">{TIERS[l.tier].label}</td>
                      <td className="py-1 pr-3 text-text-secondary">{why}</td>
                      <td className="py-1 text-text-secondary">
                        {l.srcs?.length
                          ? l.srcs.map(([label, url], j) => (
                              <span key={`${url}-${j}`}>
                                {j > 0 && '; '}
                                <a href={url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                                  {label}
                                </a>
                              </span>
                            ))
                          : 'none recorded'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </details>
    </div>
  );
}
