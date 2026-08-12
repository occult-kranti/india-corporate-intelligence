import { useId, useMemo, useState } from 'react';

/**
 * The chart layer.
 *
 * Until this file existed every quantity on the platform was drawn as a div with a
 * percentage width. That is adequate for a ranked bar and wrong for everything else:
 * a ten-point series over fourteen years, a bid-count distribution with a long tail,
 * and a value-against-bids scatter are three different shapes and none of them is a
 * bar.
 *
 * TWO COLOUR SYSTEMS, KEPT APART. The node-family hues — state, capital, recipient,
 * instrument, enforce, market — are semantically frozen across the platform. A blue
 * line on a chart would read as "public power" to anyone who has looked at the
 * network graph, so chart series never use them.
 *
 * THE CHART PALETTE IS SEPARATE BECAUSE THE TOKEN PALETTE FAILED. Feeding the site's
 * own tokens to the palette validator against the #0a0a0c ground:
 *
 *   sage #7a9e7e vs blue #5a8ec4 → ΔE 13.1 in NORMAL vision, below the floor of 15
 *   four of six tokens fall under the chroma floor and read as grey
 *
 * Those tokens were chosen as low-saturation semantic accents on a dark editorial
 * page, which is a different job from separating adjacent series in a plot. The set
 * below is darker and more saturated, sits inside the dark-mode lightness band
 * (OKLCH L 0.48–0.67), and passes all six checks — lightness, chroma, CVD separation,
 * normal-vision separation, and contrast against the surface.
 *
 * Verified with:
 *   node scripts/validate_palette.js "#b27f02,#448dd4,#459f5d,#9c73c8" --mode dark --surface "#0a0a0c"
 *   → ALL CHECKS PASS
 *
 * Assign in fixed order, never cycled. A fifth series folds into "other", becomes a
 * small multiple, or the chart is wrong.
 */
export const SERIES = ['#b27f02', '#448dd4', '#459f5d', '#9c73c8'] as const;

const GRID = 'rgba(244,240,232,0.07)';
const AXIS = 'rgba(244,240,232,0.20)';
const INK_MUTED = 'var(--color-text-muted)';

const fmtNum = (v: number) =>
  Math.abs(v) >= 1000 ? v.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : String(+v.toFixed(2));

// ---------------------------------------------------------------------------
// Shared frame
// ---------------------------------------------------------------------------

interface Frame {
  w: number;
  h: number;
  pad: { t: number; r: number; b: number; l: number };
}

const FRAME: Frame = { w: 720, h: 300, pad: { t: 14, r: 18, b: 34, l: 48 } };

function scales(f: Frame, xDomain: [number, number], yDomain: [number, number]) {
  const iw = f.w - f.pad.l - f.pad.r;
  const ih = f.h - f.pad.t - f.pad.b;
  const [x0, x1] = xDomain;
  const [y0, y1] = yDomain;
  return {
    iw,
    ih,
    x: (v: number) => f.pad.l + (x1 === x0 ? iw / 2 : ((v - x0) / (x1 - x0)) * iw),
    y: (v: number) => f.pad.t + ih - (y1 === y0 ? ih / 2 : ((v - y0) / (y1 - y0)) * ih),
  };
}

/** Recessive gridlines with the y-axis labelled. Axes never compete with marks. */
function Grid({
  f,
  ticks,
  y,
  fmt = fmtNum,
}: {
  f: Frame;
  ticks: number[];
  y: (v: number) => number;
  fmt?: (v: number) => string;
}) {
  return (
    <g aria-hidden="true">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={f.pad.l} x2={f.w - f.pad.r} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
          <text
            x={f.pad.l - 7}
            y={y(t) + 3.5}
            textAnchor="end"
            fontSize="10"
            fontFamily="var(--font-mono)"
            fill={INK_MUTED}
          >
            {fmt(t)}
          </text>
        </g>
      ))}
    </g>
  );
}

function niceTicks(min: number, max: number, count = 5): number[] {
  if (min === max) return [min];
  const span = max - min;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? mag * 10;
  const out: number[] = [];
  for (let t = Math.ceil(min / step) * step; t <= max + 1e-9; t += step) out.push(+t.toFixed(10));
  return out;
}

function Caption({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[12.5px] text-text-muted mt-2 max-w-[76ch] leading-relaxed">{children}</p>
  );
}

/** Every chart ships one. It is the accessible equivalent, not a fallback. */
function TableTwin({
  columns,
  rows,
  label,
}: {
  columns: string[];
  rows: (string | number)[][];
  label: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="font-mono text-[10px] text-text-muted hover:text-accent underline underline-offset-2"
        aria-expanded={open}
      >
        {open ? 'hide' : 'show'} the numbers behind this chart
      </button>
      {open && (
        <div className="overflow-x-auto mt-2">
          <table className="text-[12px] border-collapse">
            <caption className="sr-only">{label}</caption>
            <thead>
              <tr className="border-b border-border-light text-left">
                {columns.map((c) => (
                  <th
                    key={c}
                    scope="col"
                    className="py-1.5 pr-5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-text-muted font-normal"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-border">
                  {r.map((cell, j) => (
                    <td
                      key={j}
                      className={`py-1 pr-5 ${j === 0 ? 'text-text-secondary' : 'font-mono tabular-nums text-text'}`}
                    >
                      {typeof cell === 'number' ? fmtNum(cell) : cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TimeSeries
// ---------------------------------------------------------------------------

export interface SeriesPoint {
  x: number;
  y: number | null;
  label?: string;
}
export interface Series {
  name: string;
  points: SeriesPoint[];
}

/**
 * Change over time. One y-axis, always — two measures of different scale become two
 * charts, never a second axis.
 *
 * A null y is a genuine gap and the line BREAKS there rather than interpolating
 * across it. Joining across a missing year draws a value nobody measured, which is
 * the same error the PM CARES ledger avoids by drawing holes.
 */
export function TimeSeries({
  series,
  yLabel,
  yFormat = (v: number) => String(v),
  xFormat = (v: number) => String(v),
  caption,
  yMax,
  annotations = [],
}: {
  series: Series[];
  yLabel: string;
  yFormat?: (v: number) => string;
  xFormat?: (v: number) => string;
  caption?: React.ReactNode;
  yMax?: number;
  /** Vertical rules for regime changes and the like. */
  annotations?: { x: number; label: string }[];
}) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const f = FRAME;

  const all = series.flatMap((s) => s.points);
  const xs = all.map((p) => p.x);
  const ys = all.map((p) => p.y).filter((v): v is number => v != null);
  const xDom: [number, number] = [Math.min(...xs), Math.max(...xs)];
  const yDom: [number, number] = [0, yMax ?? Math.max(...ys) * 1.08];
  const { x, y } = scales(f, xDom, yDom);
  const ticks = useMemo(() => niceTicks(yDom[0], yDom[1]), [yDom[0], yDom[1]]);

  const xTicks = useMemo(() => {
    const uniq = [...new Set(xs)].sort((a, b) => a - b);
    // Thin the axis rather than let labels collide.
    const step = Math.ceil(uniq.length / 9);
    return uniq.filter((_, i) => i % step === 0);
  }, [xs.join(',')]);

  const hovered = hover != null ? [...new Set(xs)].sort((a, b) => a - b)[hover] : null;

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${f.w} ${f.h}`}
        className="w-full"
        style={{ maxHeight: 320 }}
        role="img"
        aria-labelledby={`${id}-t`}
        onMouseLeave={() => setHover(null)}
      >
        <title id={`${id}-t`}>
          {yLabel} over time{series.length > 1 ? `, ${series.length} series` : ''}
        </title>

        <Grid f={f} ticks={ticks} y={y} fmt={yFormat} />

        {/* x axis */}
        <line
          x1={f.pad.l}
          x2={f.w - f.pad.r}
          y1={f.h - f.pad.b}
          y2={f.h - f.pad.b}
          stroke={AXIS}
          strokeWidth={1}
        />
        {xTicks.map((t) => (
          <text
            key={t}
            x={x(t)}
            y={f.h - f.pad.b + 15}
            textAnchor="middle"
            fontSize="10"
            fontFamily="var(--font-mono)"
            fill={INK_MUTED}
          >
            {xFormat(t)}
          </text>
        ))}

        {annotations.map((a) => (
          <g key={a.label}>
            <line
              x1={x(a.x)}
              x2={x(a.x)}
              y1={f.pad.t}
              y2={f.h - f.pad.b}
              stroke={AXIS}
              strokeDasharray="3 3"
            />
            <text
              x={x(a.x) + 4}
              y={f.pad.t + 10}
              fontSize="9.5"
              fontFamily="var(--font-mono)"
              fill={INK_MUTED}
            >
              {a.label}
            </text>
          </g>
        ))}

        {series.map((s, si) => {
          const colour = SERIES[si % SERIES.length];
          // Break the path at nulls instead of bridging them.
          const segments: SeriesPoint[][] = [];
          let cur: SeriesPoint[] = [];
          for (const p of [...s.points].sort((a, b) => a.x - b.x)) {
            if (p.y == null) {
              if (cur.length) segments.push(cur);
              cur = [];
            } else cur.push(p);
          }
          if (cur.length) segments.push(cur);

          return (
            <g key={s.name}>
              {segments.map((seg, i) => (
                <path
                  key={i}
                  d={seg.map((p, j) => `${j ? 'L' : 'M'}${x(p.x)},${y(p.y as number)}`).join('')}
                  fill="none"
                  stroke={colour}
                  strokeWidth={2}
                  strokeLinejoin="round"
                />
              ))}
              {s.points
                .filter((p) => p.y != null)
                .map((p) => (
                  <circle
                    key={p.x}
                    cx={x(p.x)}
                    cy={y(p.y as number)}
                    r={hovered === p.x ? 5 : 3.5}
                    fill={colour}
                    stroke="var(--color-bg)"
                    strokeWidth={2}
                  />
                ))}
            </g>
          );
        })}

        {/* Hover bands — wider than the marks, so the target is reachable. */}
        {[...new Set(xs)]
          .sort((a, b) => a - b)
          .map((xv, i, arr) => {
            const w = (f.w - f.pad.l - f.pad.r) / Math.max(1, arr.length);
            return (
              <rect
                key={xv}
                x={x(xv) - w / 2}
                y={f.pad.t}
                width={w}
                height={f.h - f.pad.t - f.pad.b}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
              />
            );
          })}

        {hovered != null && (
          <line
            x1={x(hovered)}
            x2={x(hovered)}
            y1={f.pad.t}
            y2={f.h - f.pad.b}
            stroke={AXIS}
            strokeWidth={1}
          />
        )}
      </svg>

      {hovered != null && (
        <div className="font-mono text-[11px] text-text-secondary mt-1">
          <span className="text-text">{xFormat(hovered)}</span>
          {series.map((s, si) => {
            const p = s.points.find((q) => q.x === hovered);
            return (
              <span key={s.name} className="ml-4">
                <span
                  className="inline-block w-2 h-2 rounded-sm mr-1.5 align-middle"
                  style={{ background: SERIES[si % SERIES.length] }}
                />
                {series.length > 1 && <span className="text-text-muted">{s.name} </span>}
                {p?.y == null ? (
                  <span className="text-amber">not published</span>
                ) : (
                  <span className="text-text">{yFormat(p.y)}</span>
                )}
              </span>
            );
          })}
        </div>
      )}

      {/* A single series takes no legend — the title names it. */}
      {series.length > 1 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 font-mono text-[10.5px]">
          {series.map((s, si) => (
            <span key={s.name} className="text-text-secondary">
              <span
                className="inline-block w-2.5 h-2.5 rounded-sm mr-1.5 align-middle"
                style={{ background: SERIES[si % SERIES.length] }}
              />
              {s.name}
            </span>
          ))}
        </div>
      )}

      {caption && <figcaption><Caption>{caption}</Caption></figcaption>}

      <TableTwin
        label={yLabel}
        columns={['x', ...series.map((s) => s.name)]}
        rows={[...new Set(all.map((p) => p.x))]
          .sort((a, b) => a - b)
          .map((xv) => [
            xFormat(xv),
            ...series.map((s) => {
              const p = s.points.find((q) => q.x === xv);
              return p?.y == null ? 'not published' : yFormat(p.y);
            }),
          ])}
      />
    </figure>
  );
}

// ---------------------------------------------------------------------------
// Distribution
// ---------------------------------------------------------------------------

/**
 * A histogram, with the tail drawn rather than truncated.
 *
 * The reason this form exists on this platform: a mean bid count of 4.4 and a mean of
 * 3.3 sound similar and describe completely different markets once you can see that
 * one has a mode at 3 and the other a spike at 1. A summary statistic hides exactly
 * the shape that matters here.
 */
export function Distribution({
  series,
  xLabel,
  caption,
  highlight,
  maxBin,
}: {
  series: { name: string; bins: Record<string, number> }[];
  xLabel: string;
  caption?: React.ReactNode;
  /** A bin to call out — e.g. the single-bidder bin. */
  highlight?: number;
  maxBin?: number;
}) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const f = { ...FRAME, h: 260 };

  const cap = maxBin ?? 15;
  const keys = useMemo(() => Array.from({ length: cap + 1 }, (_, i) => i), [cap]);

  // Normalise to shares so two populations of very different size are comparable.
  const shares = series.map((s) => {
    const total = Object.values(s.bins).reduce((a, b) => a + b, 0);
    return {
      name: s.name,
      total,
      values: keys.map((k) => {
        const raw =
          k === cap
            ? Object.entries(s.bins)
                .filter(([b]) => Number(b) >= cap)
                .reduce((a, [, v]) => a + v, 0)
            : (s.bins[String(k)] ?? 0);
        return { bin: k, count: raw, share: total ? (raw / total) * 100 : 0 };
      }),
    };
  });

  const yMax = Math.max(...shares.flatMap((s) => s.values.map((v) => v.share))) * 1.1;
  const { x, y } = scales(f, [0, cap], [0, yMax]);
  const ticks = niceTicks(0, yMax, 4);
  const bw = (f.w - f.pad.l - f.pad.r) / (cap + 1);

  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${f.w} ${f.h}`} className="w-full" style={{ maxHeight: 280 }} role="img" aria-labelledby={`${id}-t`}>
        <title id={`${id}-t`}>Distribution of {xLabel}</title>
        <Grid f={f} ticks={ticks} y={y} fmt={(v) => `${v.toFixed(0)}%`} />
        <line x1={f.pad.l} x2={f.w - f.pad.r} y1={f.h - f.pad.b} y2={f.h - f.pad.b} stroke={AXIS} />

        {shares.map((s, si) => {
          const colour = SERIES[si % SERIES.length];
          // 2px surface gap between adjacent fills, and between series.
          const sub = (bw - 3) / shares.length;
          return (
            <g key={s.name}>
              {s.values.map((v) => (
                <rect
                  key={v.bin}
                  x={x(v.bin) - bw / 2 + 1.5 + si * sub}
                  y={y(v.share)}
                  width={Math.max(1, sub - 2)}
                  height={Math.max(0, f.h - f.pad.b - y(v.share))}
                  fill={colour}
                  opacity={hover == null || hover === v.bin ? 0.9 : 0.35}
                  rx={2}
                  onMouseEnter={() => setHover(v.bin)}
                  onMouseLeave={() => setHover(null)}
                />
              ))}
            </g>
          );
        })}

        {highlight != null && (
          <text
            x={x(highlight)}
            y={f.pad.t + 9}
            textAnchor="middle"
            fontSize="9.5"
            fontFamily="var(--font-mono)"
            fill="var(--color-amber)"
          >
            single bidder
          </text>
        )}

        {keys
          .filter((k) => k % (cap > 12 ? 2 : 1) === 0)
          .map((k) => (
            <text
              key={k}
              x={x(k)}
              y={f.h - f.pad.b + 15}
              textAnchor="middle"
              fontSize="10"
              fontFamily="var(--font-mono)"
              fill={INK_MUTED}
            >
              {k === cap ? `${cap}+` : k}
            </text>
          ))}
        <text
          x={(f.pad.l + f.w - f.pad.r) / 2}
          y={f.h - 2}
          textAnchor="middle"
          fontSize="10"
          fontFamily="var(--font-mono)"
          fill={INK_MUTED}
        >
          {xLabel}
        </text>
      </svg>

      {hover != null && (
        <div className="font-mono text-[11px] text-text-secondary mt-1">
          <span className="text-text">{hover === cap ? `${cap}+` : hover} bidders</span>
          {shares.map((s, si) => {
            const v = s.values.find((q) => q.bin === hover);
            return (
              <span key={s.name} className="ml-4">
                <span
                  className="inline-block w-2 h-2 rounded-sm mr-1.5 align-middle"
                  style={{ background: SERIES[si % SERIES.length] }}
                />
                <span className="text-text-muted">{s.name} </span>
                <span className="text-text">
                  {v?.share.toFixed(1)}% ({v?.count.toLocaleString('en-IN')})
                </span>
              </span>
            );
          })}
        </div>
      )}

      {shares.length > 1 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 font-mono text-[10.5px]">
          {shares.map((s, si) => (
            <span key={s.name} className="text-text-secondary">
              <span
                className="inline-block w-2.5 h-2.5 rounded-sm mr-1.5 align-middle"
                style={{ background: SERIES[si % SERIES.length] }}
              />
              {s.name}{' '}
              <span className="text-text-muted">n={s.total.toLocaleString('en-IN')}</span>
            </span>
          ))}
        </div>
      )}

      {caption && <figcaption><Caption>{caption}</Caption></figcaption>}

      <TableTwin
        label={`Distribution of ${xLabel}`}
        columns={[xLabel, ...shares.flatMap((s) => [`${s.name} n`, `${s.name} %`])]}
        rows={keys.map((k) => [
          k === cap ? `${cap}+` : String(k),
          ...shares.flatMap((s) => {
            const v = s.values.find((q) => q.bin === k)!;
            return [v.count, `${v.share.toFixed(2)}%`];
          }),
        ])}
      />
    </figure>
  );
}

// ---------------------------------------------------------------------------
// Scatter
// ---------------------------------------------------------------------------

/**
 * Two variables against each other, which is the only form that can answer "does A
 * move with B". A pair of bar charts side by side cannot, and that is the substitute
 * this replaces.
 */
export function Scatter({
  points,
  xLabel,
  yLabel,
  xFormat = fmtNum,
  yFormat = fmtNum,
  logX = false,
  caption,
}: {
  points: { x: number; y: number; label?: string; group?: string }[];
  xLabel: string;
  yLabel: string;
  xFormat?: (v: number) => string;
  yFormat?: (v: number) => string;
  /** Contract values span six orders of magnitude; linear x would stack everything at zero. */
  logX?: boolean;
  caption?: React.ReactNode;
}) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const f = { ...FRAME, h: 300 };

  const tx = (v: number) => (logX ? Math.log10(Math.max(1, v)) : v);
  const xs = points.map((p) => tx(p.x));
  const ys = points.map((p) => p.y);
  const { x, y } = scales(f, [Math.min(...xs), Math.max(...xs)], [0, Math.max(...ys) * 1.08]);
  const yTicks = niceTicks(0, Math.max(...ys) * 1.08, 5);

  const groups = [...new Set(points.map((p) => p.group).filter(Boolean))] as string[];
  const colourOf = (g?: string) => (g ? SERIES[groups.indexOf(g) % SERIES.length] : SERIES[0]);

  const xTicks = useMemo(() => {
    const lo = Math.min(...xs);
    const hi = Math.max(...xs);
    return niceTicks(lo, hi, 5);
  }, [xs.join(',')]);

  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${f.w} ${f.h}`} className="w-full" style={{ maxHeight: 320 }} role="img" aria-labelledby={`${id}-t`}>
        <title id={`${id}-t`}>
          {yLabel} against {xLabel}, {points.length} points
        </title>
        <Grid f={f} ticks={yTicks} y={y} fmt={yFormat} />
        <line x1={f.pad.l} x2={f.w - f.pad.r} y1={f.h - f.pad.b} y2={f.h - f.pad.b} stroke={AXIS} />
        {xTicks.map((t) => (
          <text
            key={t}
            x={x(t)}
            y={f.h - f.pad.b + 15}
            textAnchor="middle"
            fontSize="10"
            fontFamily="var(--font-mono)"
            fill={INK_MUTED}
          >
            {logX ? xFormat(10 ** t) : xFormat(t)}
          </text>
        ))}

        {points.map((p, i) => (
          <circle
            key={i}
            cx={x(tx(p.x))}
            cy={y(p.y)}
            r={hover === i ? 6 : 4}
            fill={colourOf(p.group)}
            fillOpacity={hover == null || hover === i ? 0.75 : 0.28}
            stroke="var(--color-bg)"
            strokeWidth={hover === i ? 2 : 1}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}

        <text
          x={(f.pad.l + f.w - f.pad.r) / 2}
          y={f.h - 2}
          textAnchor="middle"
          fontSize="10"
          fontFamily="var(--font-mono)"
          fill={INK_MUTED}
        >
          {xLabel}
        </text>
      </svg>

      {hover != null && (
        <div className="font-mono text-[11px] text-text-secondary mt-1">
          {points[hover].label && <span className="text-text">{points[hover].label} · </span>}
          {xLabel} {xFormat(points[hover].x)} · {yLabel} {yFormat(points[hover].y)}
        </div>
      )}

      {groups.length > 1 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 font-mono text-[10.5px]">
          {groups.map((g) => (
            <span key={g} className="text-text-secondary">
              <span
                className="inline-block w-2.5 h-2.5 rounded-sm mr-1.5 align-middle"
                style={{ background: colourOf(g) }}
              />
              {g}
            </span>
          ))}
        </div>
      )}

      {caption && <figcaption><Caption>{caption}</Caption></figcaption>}

      <TableTwin
        label={`${yLabel} against ${xLabel}`}
        columns={[xLabel, yLabel, ...(groups.length ? ['group'] : [])]}
        rows={points
          .slice()
          .sort((a, b) => a.x - b.x)
          .map((p) => [xFormat(p.x), yFormat(p.y), ...(groups.length ? [p.group ?? ''] : [])])}
      />
    </figure>
  );
}
