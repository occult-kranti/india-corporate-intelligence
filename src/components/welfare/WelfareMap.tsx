import { useEffect, useMemo, useRef, useState, useId, forwardRef, useImperativeHandle, type KeyboardEvent } from 'react';
import { STATES, VIEWBOX, labelMode, type StateGeo } from '../../data/geo';
import type { StateCode } from '../../graph/schema';
import type { Outcome, StateYearRow } from '../../data/welfareView';

/**
 * The /welfare map: the platform's 36-state geometry with three non-value textures
 * and ballots. A sibling of viz/IndiaMap rather than a change to it, because the
 * welfare classes (hatch, stipple, flat zero) and ballots are claims IndiaMap's other
 * callers do not make — and IndiaMap is not this page's file to change.
 *
 * Every state path carries `data-fill-class`, so a legend count, a status-line count
 * and a table-twin class can be checked against what was actually painted.
 */

export interface MapBallot {
  key: string;
  st: StateCode;
  outcome: Outcome;
  lid: boolean;
  muted: boolean;
  title: string;
}

export interface WelfareMapHandle {
  focus: () => void;
  el: () => SVGSVGElement | null;
}

/** The flat fill for "declared searched, none live" — distinct from the ramp floor and from the page. */
export const ZERO_FILL = '#15171c';
const GROUND = '#101116';

/**
 * The two non-value textures, defined once. The map, the legend swatches and the clock's
 * coverage ribbon all draw these same patterns, so a greyscale screenshot of the key has
 * the same greys as the thing it keys (spec §7.2 rule 2). `px` is screen pixels per user
 * unit: the legend and the ribbon draw at 1, the map passes its measured scale, and the
 * floors keep the pitch and marks legible on a phone either way.
 */
export function TexturePatterns({ hatchId, stippleId, px }: { hatchId: string; stippleId: string; px: number }) {
  const pitch = Math.max(7, 6 / px);
  const dot = Math.max(1.1, 1.5 / px);
  return (
    <>
      {/* No data: warm diagonal lines. Never zero. */}
      <pattern id={hatchId} width={pitch} height={pitch} patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
        <rect width={pitch} height={pitch} fill={GROUND} />
        <line x1="0" y1="0" x2="0" y2={pitch} stroke="rgba(201,168,108,0.34)" strokeWidth={Math.max(1.1, 1 / px)} />
      </pattern>
      {/* Live, no comparable figure: neutral dots. Never zero, never low. */}
      <pattern id={stippleId} width={pitch * 0.72} height={pitch * 0.72} patternUnits="userSpaceOnUse">
        <rect width={pitch * 0.72} height={pitch * 0.72} fill={GROUND} />
        <circle cx={pitch * 0.36} cy={pitch * 0.36} r={dot} fill="rgba(232,228,220,0.32)" />
      </pattern>
    </>
  );
}

/** A legend swatch drawn with the map's own pattern, not a CSS imitation of it. */
export function TextureSwatch({ kind }: { kind: 'hatch' | 'stipple' }) {
  const id = `sw-${kind}-${useId().replace(/:/g, '')}`;
  return (
    <svg width="16" height="12" aria-hidden="true" className="inline-block mr-2 align-middle border border-border-light">
      <defs><TexturePatterns hatchId={`${id}-h`} stippleId={`${id}-s`} px={1} /></defs>
      <rect width="16" height="12" fill={`url(#${id}-${kind === 'hatch' ? 'h' : 's'})`} />
    </svg>
  );
}

const shortName = (name: string) =>
  name
    .replace('Andaman and Nicobar Islands', 'Andaman & Nicobar')
    .replace('Dadra and Nagar Haveli', 'Dadra & N. Haveli')
    .replace('Daman and Diu', 'Daman & Diu');

/** Reading order for the keyboard: north to south, a stable walk a listener can learn. */
const ORDERED = [...STATES].sort((a, b) => a.cy - b.cy || (a.id < b.id ? -1 : 1));

const VB_W = Number(VIEWBOX.split(/\s+/)[2]);
const VB_H = Number(VIEWBOX.split(/\s+/)[3]);

export default forwardRef<WelfareMapHandle, {
  rows: Map<StateCode, StateYearRow>;
  ballots: MapBallot[];
  selected: StateCode | null;
  height: number;
  ariaLabel: string;
  describedBy: string;
  onSelect: (st: StateCode | null, via: 'pointer' | 'keyboard') => void;
  onHover: (st: StateCode | null) => void;
  onFocusState: (st: StateCode | null) => void;
}>(function WelfareMap({ rows, ballots, selected, height, ariaLabel, describedBy, onSelect, onHover, onFocusState }, ref) {
  const uid = useId().replace(/:/g, '');
  const svgRef = useRef<SVGSVGElement>(null);
  const [idx, setIdx] = useState(-1);
  const [hasFocus, setHasFocus] = useState(false);
  // Screen pixels per viewBox unit, from the rendered box, so marks can keep a legible
  // floor on a phone instead of scaling down with the drawing.
  const [px, setPx] = useState(height / VB_H);

  useImperativeHandle(ref, () => ({ focus: () => svgRef.current?.focus(), el: () => svgRef.current }), []);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width && r.height) setPx(Math.min(r.width / VB_W, r.height / VB_H));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Pattern pitch and marks in screen pixels (TexturePatterns): at 360px a 7-unit hatch
  // rasterises to a flat grey that reads as a low value, which is exactly the confusion it
  // exists to prevent.
  const k = Math.max(1, 9 / (7 * px), 2 / (1.4 * px));

  const leaders = useMemo(() => {
    const LEFT = 14;
    const RIGHT = VB_W - 14;
    const MIN_GAP = 21;
    const place = (list: StateGeo[], gutterX: number, anchor: 'start' | 'end') => {
      const sorted = [...list].sort((a, b) => a.cy - b.cy);
      let prev = -Infinity;
      return sorted.map((s) => {
        const y = Math.max(s.cy, prev + MIN_GAP);
        prev = y;
        return { s, gutterY: Math.min(y, VB_H - 8), gutterX, anchor };
      });
    };
    const all = STATES.filter((s) => labelMode(s) === 'leader');
    return [
      ...place(all.filter((s) => s.cx < VB_W / 2), LEFT, 'start'),
      ...place(all.filter((s) => s.cx >= VB_W / 2), RIGHT, 'end'),
    ];
  }, []);

  const move = (d: number) => {
    const next = (idx + d + ORDERED.length) % ORDERED.length;
    setIdx(next);
    onFocusState(ORDERED[next].id);
  };

  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if ((e.key === 'Enter' || e.key === ' ') && idx >= 0) { e.preventDefault(); onSelect(ORDERED[idx].id, 'keyboard'); }
    else if (e.key === 'Escape') onSelect(null, 'keyboard');
  };

  const fillOf = (r: StateYearRow | undefined) => {
    if (!r || r.cls === 'hatch') return `url(#nodata-${uid})`;
    if (r.cls === 'stipple') return `url(#stipple-${uid})`;
    if (r.cls === 'zero') return ZERO_FILL;
    return r.fill ?? `url(#nodata-${uid})`;
  };

  // Several elections in one state-year (Bihar, 2005) sit side by side, never on top of each other.
  const placed = useMemo(() => {
    const seen = new Map<string, number>();
    return ballots.map((b) => {
      const g = STATES.find((s) => s.id === b.st);
      const n = seen.get(b.st) ?? 0;
      seen.set(b.st, n + 1);
      if (!g) return null;
      const dy = labelMode(g) === 'full' ? 9 : labelMode(g) === 'code' ? 7 : 5;
      return { b, x: g.cx + n * 9 * k, y: g.cy + dy };
    }).filter((x): x is { b: MapBallot; x: number; y: number } => !!x);
  }, [ballots, k]);

  const focused = hasFocus && idx >= 0 ? ORDERED[idx] : null;

  return (
    <svg
      ref={svgRef}
      viewBox={VIEWBOX}
      style={{ height, width: '100%', display: 'block' }}
      role="img"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-describedby={describedBy}
      onKeyDown={onKey}
      onFocus={() => setHasFocus(true)}
      onBlur={() => { setHasFocus(false); onFocusState(null); }}
      className="outline-none focus-visible:ring-2 focus-visible:ring-accent/60 rounded-lg"
    >
      <defs>
        <TexturePatterns hatchId={`nodata-${uid}`} stippleId={`stipple-${uid}`} px={px} />
      </defs>


      <g>
        {STATES.map((s) => {
          const r = rows.get(s.id);
          const isSel = selected === s.id;
          return (
            <path
              key={s.id}
              d={s.path}
              data-st={s.id}
              data-fill-class={r?.cls ?? 'hatch'}
              fill={fillOf(r)}
              stroke={isSel ? 'var(--color-accent)' : 'rgba(10,10,12,0.85)'}
              strokeWidth={isSel ? 1.8 : 0.5}
              strokeLinejoin="round"
              style={{ cursor: 'pointer', transitionProperty: 'none' }}
              onMouseEnter={() => onHover(s.id)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onSelect(selected === s.id ? null : s.id, 'pointer')}
            >
              <title>{s.name}</title>
            </path>
          );
        })}
      </g>

      <g pointerEvents="none">
        {STATES.map((s) => (
          <path key={`o-${s.id}`} d={s.path} fill="none" stroke="rgba(201,168,108,0.22)" strokeWidth="0.4" strokeLinejoin="round" />
        ))}
      </g>

      <g pointerEvents="none" fontFamily="var(--font-sans)">
        {STATES.map((s) => {
          const mode = labelMode(s);
          if (mode === 'leader') return null;
          return (
            <text key={`l-${s.id}`} x={s.cx} y={s.cy - (mode === 'full' ? 2 : 1)} textAnchor="middle" dominantBaseline="central"
              fontSize={mode === 'full' ? Math.min(11, Math.max(7.5, s.clearance / 3.4)) : 7}
              fill="rgba(240,236,228,0.82)" stroke="rgba(10,10,12,0.55)" strokeWidth="2" paintOrder="stroke">
              {mode === 'full' ? shortName(s.name) : s.id.toUpperCase()}
            </text>
          );
        })}
        {leaders.map(({ s, gutterY, gutterX, anchor }) => {
          const textW = shortName(s.name).length * 4.1;
          const stop = anchor === 'end' ? gutterX - textW - 5 : gutterX + textW + 5;
          const elbow = anchor === 'end' ? Math.max(s.cx + 8, stop - 16) : Math.min(s.cx - 8, stop + 16);
          return (
            <g key={`lead-${s.id}`}>
              <path d={`M ${s.cx} ${s.cy} L ${elbow} ${gutterY} L ${stop} ${gutterY}`} stroke="rgba(201,168,108,0.30)" strokeWidth="0.45" fill="none" />
              <text x={gutterX} y={gutterY} textAnchor={anchor} dominantBaseline="central" fontSize="7.8" fill="rgba(240,236,228,0.7)" stroke="rgba(10,10,12,0.6)" strokeWidth="1.8" paintOrder="stroke">
                {shortName(s.name)}
              </text>
            </g>
          );
        })}
      </g>

      {/* Ballots: every assembly election in the year, filled = kept, hollow = lost,
          half = unclassified; the lid is a timing fact. Solid strokes only — dash is tier. */}
      <g>
        {placed.map(({ b, x, y }) => {
          const ink = b.muted ? 'var(--color-text-muted)' : 'var(--color-text)';
          return (
            <g key={b.key} data-ballot="" data-outcome={b.outcome} data-lid={b.lid ? 'true' : 'false'} data-muted={b.muted ? 'true' : 'false'} transform={`translate(${x} ${y}) scale(${k})`}>
              <title>{b.title}</title>
              <rect x={-3.5} y={-3.5} width={7} height={7} fill={b.outcome === 'retained' ? ink : 'rgba(10,10,12,0.85)'} stroke={ink} strokeWidth={Math.max(1.1, 1 / (px * k))} paintOrder="stroke" />
              {b.outcome === 'unclassified' && <path d="M -3.5 -3.5 L -3.5 3.5 L 3.5 3.5 Z" fill={ink} stroke={ink} strokeWidth={Math.max(0.6, 1 / (px * k))} />}
              {b.lid && <line x1={-3.5} x2={3.5} y1={-5.6} y2={-5.6} stroke={ink} strokeWidth={Math.max(1.4, 2 / (px * k))} />}
            </g>
          );
        })}
      </g>

      {focused && (
        <circle cx={focused.cx} cy={focused.cy} r={Math.max(6, focused.clearance * 0.5)} fill="none" stroke="var(--color-accent)" strokeWidth="1.2" pointerEvents="none" />
      )}
    </svg>
  );
});

export { ORDERED as MAP_ORDER };
