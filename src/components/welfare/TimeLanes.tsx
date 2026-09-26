import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { CoverageCell, ElectionRow, Lane, LaneEventKind } from '../../data/welfareView';
import { FIRST_YEAR, LAST_YEAR, YEARS, RAMP, laneName, EVENT_WORD, electionTitle } from '../../data/welfareView';
import { TIERS } from '../../graph/schema';
import { TexturePatterns } from './WelfareMap';

/**
 * The clock: one x-scale from 1 January 2000 to the file's as-of date, shared by every
 * row, so a launch and the election after it are measured against the same ruler.
 *
 * The drawing is aria-hidden. Everything it says is also in the label column's
 * buttons (one per lane, named with the scheme, where, launch and status count) and
 * in the lanes twin, because descendants of an image are presentational and a
 * focusable bar inside one announces nothing.
 */

export const GLYPH: Record<LaneEventKind, string> = {
  raised: '▲', cut: '▼', tightened: '◆', paused: '‖', discontinued: '×', renamed: '↻', promised: '◇',
};
/** Ballot glyphs, disjoint from the scheme-event glyphs above (spec U13). */
export const BALLOT_GLYPH = { retained: '■', lost: '□', unclassified: '◩' } as const;

// The two glyph sets must stay disjoint, or a lost ballot and a scheme event read alike.
// Both are constants, so this can only fire on an edit to one of them.
if (Object.values(BALLOT_GLYPH).some((g) => (Object.values(GLYPH) as string[]).includes(g))) {
  throw new Error('a glyph is used for both a ballot and a scheme event');
}

const ROW = { ribbon: 12, all: 56, preview: 22, header: 22, caps: 16, lane: 22, axis: 26 };
const DAY = 86400000;
const dayOf = (d: string) => {
  const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/.exec(d);
  return m ? Date.UTC(Number(m[1]), Number(m[2] ?? '1') - 1, Number(m[3] ?? '1')) / DAY : 0;
};
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface TimeLanesProps {
  asOf: string | null;
  runId: string;
  year: number | null;
  onYear: (y: number | null) => void;
  coverage: CoverageCell[] | null;
  coverageLabel: string | null;
  allStates: { year: number; launches: number; elections: ElectionRow[] }[];
  preview: { label: string; launches: string[]; elections: ElectionRow[] } | null;
  central: { lanes: Lane[]; elections: ElectionRow[]; hidden: number | null };
  state: { label: string; lanes: Lane[]; elections: ElectionRow[] } | null;
  selected: string | null;
  onLane: (id: string, el: HTMLButtonElement | null) => void;
  narrow: boolean;
  summary: string;
  footer?: ReactNode;
}

export default function TimeLanes(p: TimeLanesProps) {
  const uid = useId().replace(/:/g, '');
  const box = useRef<HTMLDivElement>(null);
  const [boxW, setBoxW] = useState(900);
  const [showing, setShowing] = useState<[number, number]>([FIRST_YEAR, LAST_YEAR]);
  const labelW = p.narrow ? 96 : 120;
  // On a phone the clock is wider than two screens, so "earlier" always has a full
  // screen to move and the years stay legible; on a desktop it fills the column.
  const W = p.narrow ? YEARS.length * 32 : Math.max(580, boxW - labelW);
  const endDay = p.asOf ? dayOf(p.asOf) : dayOf(`${LAST_YEAR}-12-31`);
  const t0 = dayOf(`${FIRST_YEAR}-01-01`);
  const x = (d: string) => Math.max(0, Math.min(W, ((dayOf(d) - t0) / (endDay - t0)) * W));
  const yx = (y: number) => x(`${y}-01-01`);
  const yEnd = (y: number) => (y >= LAST_YEAR ? W : x(`${y + 1}-01-01`));

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setBoxW(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const readShowing = () => {
    const el = box.current;
    if (!el) return;
    const left = el.scrollLeft;
    const right = left + el.clientWidth - labelW;
    const years = YEARS.filter((y) => yEnd(y) > left && yx(y) < right);
    // Only a changed range is a new state; an unchanged one must not re-render.
    if (years.length) setShowing((cur) => (cur[0] === years[0] && cur[1] === years[years.length - 1] ? cur : [years[0], years[years.length - 1]]));
  };

  // A phone opens on the latest years, and follows the chosen year, so the thinnest
  // decades are never the only thing on screen without saying so.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el || !p.narrow) return;
    if (p.year == null) el.scrollLeft = el.scrollWidth;
    else {
      const cx = yx(p.year);
      const view = el.clientWidth - labelW;
      if (cx < el.scrollLeft || yEnd(p.year) > el.scrollLeft + view) el.scrollLeft = Math.max(0, cx - view / 2);
    }
    readShowing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.narrow, p.year, W]);

  useEffect(() => { readShowing(); }, [W, boxW]); // eslint-disable-line react-hooks/exhaustive-deps

  // ----- vertical layout
  let top = 0;
  const rows: { key: string; y: number; h: number }[] = [];
  const add = (key: string, h: number) => { rows.push({ key, y: top, h }); top += h; return rows[rows.length - 1]; };
  const ribbon = p.coverage ? add('ribbon', ROW.ribbon) : null;
  const allRow = add('all', ROW.all);
  const previewRow = !p.narrow ? add('preview', ROW.preview) : null;
  const centralHead = add('central-head', ROW.header);
  // Election caps get a row of their own under each band's header, so the header's
  // words and the ballots never sit on top of each other.
  const centralCaps = p.central.hidden == null ? add('central-caps', ROW.caps) : null;
  const centralLanes = p.central.hidden == null ? p.central.lanes.map((l) => ({ l, r: add(`c-${l.key}`, ROW.lane) })) : [];
  const centralTop = centralCaps ? centralCaps.y + centralCaps.h : centralHead.y + centralHead.h;
  const centralBottom = top;
  const stateHead = add('state-head', ROW.header);
  const stateCaps = p.state ? add('state-caps', ROW.caps) : null;
  const stateLanes = p.state ? p.state.lanes.map((l) => ({ l, r: add(`s-${l.key}`, ROW.lane) })) : [];
  const stateTop = stateCaps ? stateCaps.y + stateCaps.h : stateHead.y + stateHead.h;
  const stateBottom = Math.max(top, stateTop + 4);
  const axis = add('axis', ROW.axis);
  const H = top;
  const glyphSize = p.narrow ? 12 : 10;
  const smallText = p.narrow ? 12 : 10;

  const maxLaunch = Math.max(1, ...p.allStates.map((a) => a.launches));
  const maxElect = Math.max(1, ...p.allStates.map((a) => a.elections.length));

  const cap = (r: ElectionRow, cx: number, cy: number) => {
    const ink = r.muted ? 'var(--color-text-muted)' : 'var(--color-text)';
    return (
      <>
        <rect x={cx - 3.5} y={cy - 3.5} width={7} height={7} fill={r.outcome === 'retained' ? ink : 'var(--color-bg)'} stroke={ink} strokeWidth={1} />
        {r.outcome === 'unclassified' && <path d={`M ${cx - 3.5} ${cy - 3.5} L ${cx - 3.5} ${cy + 3.5} L ${cx + 3.5} ${cy + 3.5} Z`} fill={ink} />}
        {r.exposedBy[12].length > 0 && <line x1={cx - 3.5} x2={cx + 3.5} y1={cy - 6} y2={cy - 6} stroke={ink} strokeWidth={1.4} />}
      </>
    );
  };

  /** The 12-month window before an election: the page's own construct, so its edge carries the analytic dash. */
  const band = (r: ElectionRow, yTop: number, yBot: number) => {
    const ex = x(r.e.date);
    const d = new Date(dayOf(r.e.date) * DAY);
    const back = `${d.getUTCFullYear() - 1}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    const bx = x(back);
    return (
      <>
        <rect x={bx} y={yTop} width={Math.max(0, ex - bx)} height={yBot - yTop} fill="rgba(232,228,220,0.04)" />
        <line x1={bx} x2={bx} y1={yTop} y2={yBot} stroke="var(--color-text-muted)" strokeWidth={0.8} strokeDasharray={TIERS.analytic.dash} />
      </>
    );
  };

  const laneG = (l: Lane, r: { y: number; h: number }, central: boolean) => {
    const sel = p.selected === l.key;
    const ink = sel ? 'var(--color-accent)' : 'var(--color-text-secondary)';
    const op = sel ? 1 : 0.55;
    const mid = r.y + r.h / 2;
    const open = () => p.onLane(l.key, null);
    const endDate = l.ended ?? p.asOf ?? `${LAST_YEAR}-12-31`;
    const startX = l.launched ? x(l.launched) : null;
    const preYear = l.launched && Number(l.launched.slice(0, 4)) < FIRST_YEAR ? l.launched.slice(0, 4) : null;
    const showAmounts = !p.narrow && (central || sel);
    return (
      <g key={l.key} onClick={open} style={{ cursor: 'pointer' }}>
        {l.announced && l.launched && x(l.announced) < x(l.launched) && (
          <line x1={x(l.announced)} x2={x(l.launched)} y1={mid} y2={mid} stroke={ink} strokeOpacity={op} strokeWidth={1}>
            <title>{`${l.label} · announced to launched · ${l.announced} to ${l.launched}`}</title>
          </line>
        )}
        {startX != null ? (
          <rect x={startX} y={mid - 3} width={Math.max(1.5, x(endDate) - startX)} height={6} fill={ink} fillOpacity={op}>
            <title>{`${l.label} · live · ${l.launched} to ${l.ended ?? (l.endUndated ? 'an undated end' : p.asOf ?? 'as of')}${l.undated.length ? ` · undated: ${l.undated.join('; ')}` : ''}`}</title>
          </rect>
        ) : (
          <text x={l.announced ? x(l.announced) : 2} y={mid + 4} fontSize={glyphSize} fill={ink} fillOpacity={op} fontFamily="var(--font-mono)">
            {`○ not launched`}
            <title>{`${l.label} · not launched${l.announced ? ` · announced ${l.announced}` : ''}`}</title>
          </text>
        )}
        {preYear && <text x={2} y={mid - 5} fontSize={smallText} fill={ink} fillOpacity={op} fontFamily="var(--font-mono)">{`◂ ${preYear}`}</text>}
        {l.endUndated && <text x={W - 2} y={mid - 5} textAnchor="end" fontSize={smallText} fill={ink} fillOpacity={op} fontFamily="var(--font-mono)">end undated</text>}
        {l.events.map((ev, i) => (
          <text key={i} x={x(ev.date)} y={mid + 4} textAnchor="middle" fontSize={glyphSize} fill={ink} fillOpacity={1} fontFamily="var(--font-sans)">
            {GLYPH[ev.kind]}
            <title>{`${l.label} · ${EVENT_WORD[ev.kind]} · ${ev.date}${ev.sourced ? '' : ' · no source in file'}`}</title>
          </text>
        ))}
        {showAmounts && l.amounts.map((a, i) => (
          <text key={`a${i}`} x={x(a.date) + 2} y={mid - 5} fontSize={9} fill={ink} fillOpacity={0.9} fontFamily="var(--font-mono)">{a.text}<title>{a.title}</title></text>

        ))}
      </g>
    );
  };

  const label = (key: string, y: number, h: number, node: ReactNode) => (
    <li key={key} className="absolute left-0 whitespace-nowrap overflow-visible font-mono text-[12px] text-text-muted flex items-center pl-1" style={{ top: y, height: h, width: labelW }}>
      {node}
    </li>
  );

  const scrollByView = (dir: -1 | 1) => {
    const el = box.current;
    if (!el) return;
    el.scrollLeft = el.scrollLeft + dir * el.clientWidth;
    readShowing();
  };

  return (
    <div className="mt-4">
      {p.coverageLabel && <p className="font-mono text-[12px] text-text-muted mb-1">{p.coverageLabel}</p>}
      {p.narrow && (
        <div className="flex items-center gap-3 mb-1">
          <button type="button" onClick={() => scrollByView(-1)} className="font-mono text-[12px] px-2 py-1 border border-border-light rounded">‹ earlier years</button>
          <p className="font-mono text-[12px] text-text-secondary">{`showing ${showing[0]}–${showing[1]}`}</p>
          <button type="button" onClick={() => scrollByView(1)} className="font-mono text-[12px] px-2 py-1 border border-border-light rounded">later years ›</button>
        </div>
      )}
      <p className="sr-only">{p.summary}</p>
      <div ref={box} className="overflow-x-auto border-t border-border" onScroll={readShowing}>
        <div className="flex" style={{ width: labelW + W }}>
          <ul className="sticky left-0 z-10 bg-bg shrink-0" style={{ width: labelW, height: H }}>
            {ribbon && label('ribbon', ribbon.y, ribbon.h, <span className="text-[12px] leading-none">coverage</span>)}
            {label('all', allRow.y, allRow.h, <span className="leading-tight">{`all states · max ${maxLaunch} launches · max ${maxElect} elections`}</span>)}
            {previewRow && label('preview', previewRow.y, previewRow.h, <span className="text-text-muted">{p.preview ? p.preview.label : 'hover a state to preview its clock'}</span>)}
            {label('central-head', centralHead.y, centralHead.h, <span className="text-text-secondary">{p.central.hidden != null
              ? `Central · applies to all states · not painted on the map · hidden by Level: state · ${p.central.hidden} central schemes`
              : `Central · applies to all states · not painted on the map · ${p.central.lanes.length} schemes`}</span>)}
            {centralLanes.map(({ l, r }) => (
              <li key={l.key} className="absolute left-0" style={{ top: r.y, height: r.h, width: labelW }}>
                <button type="button" data-lane="central" aria-label={laneName(l)} onClick={(e) => p.onLane(l.key, e.currentTarget)}
                  className={`w-full h-full text-left text-[12px] truncate px-1 hover:text-accent ${p.selected === l.key ? 'text-accent' : 'text-text-secondary'}`}>
                  {l.label}
                </button>
              </li>
            ))}
            {label('state-head', stateHead.y, stateHead.h, <span className="text-text-secondary">{p.state
              ? `${p.state.label} · ${p.state.lanes.length} schemes · ${p.state.elections.length} elections in the file`
              : 'click a state on the map to open its schemes here'}</span>)}
            {stateLanes.map(({ l, r }) => (
              <li key={l.key} className="absolute left-0" style={{ top: r.y, height: r.h, width: labelW }}>
                <button type="button" data-lane="state" aria-label={laneName(l)} onClick={(e) => p.onLane(l.key, e.currentTarget)}
                  className={`w-full h-full text-left text-[12px] truncate px-1 hover:text-accent ${p.selected === l.key ? 'text-accent' : 'text-text-secondary'}`}>
                  {l.label}
                </button>
              </li>
            ))}
          </ul>
          <svg aria-hidden="true" width={W} height={H} style={{ minWidth: 580, display: 'block' }} className="shrink-0">
            {p.year != null && <rect x={yx(p.year)} y={0} width={Math.max(1, yEnd(p.year) - yx(p.year))} height={H} fill="rgba(201,168,108,0.08)" pointerEvents="none" />}
            {YEARS.map((y) => <line key={`g${y}`} x1={yx(y)} x2={yx(y)} y1={0} y2={axis.y} stroke="rgba(244,240,232,0.05)" />)}

            {/* The ribbon speaks the map's texture language: ramp floor = every live scheme has
                the figure, stipple = some do, hatch = none do, a hairline = no live scheme. */}
            {ribbon && <defs><TexturePatterns hatchId={`rb-h-${uid}`} stippleId={`rb-s-${uid}`} px={1} /></defs>}
            {ribbon && p.coverage && p.coverage.map((c) => {
              const x0 = yx(c.year) + 0.5;
              const w = Math.max(1, yEnd(c.year) - yx(c.year) - 1);
              const title = <title>{`${c.year}: ${c.state === 'empty' ? 'no live state schemes' : `figures for ${c.k} of ${c.n} live state schemes`}`}</title>;
              if (c.state === 'empty') {
                return <line key={`rb${c.year}`} x1={x0} x2={x0 + w} y1={ribbon.y + ribbon.h / 2} y2={ribbon.y + ribbon.h / 2} stroke="rgba(244,240,232,0.3)" strokeWidth={0.6}>{title}</line>;
              }
              const fill = c.state === 'full' ? RAMP[0] : c.state === 'partial' ? `url(#rb-s-${uid})` : `url(#rb-h-${uid})`;
              return <rect key={`rb${c.year}`} x={x0} y={ribbon.y + 2} width={w} height={ribbon.h - 4} fill={fill}>{title}</rect>;
            })}


            {/* all states: launches above the baseline, assembly elections below */}
            {p.allStates.map((a) => {
              const x0 = yx(a.year);
              const w = yEnd(a.year) - x0;
              const base = allRow.y + 30;
              const bh = (a.launches / maxLaunch) * 24;
              return (
                <g key={`as${a.year}`} onClick={() => p.onYear(a.year)} style={{ cursor: 'pointer' }}>
                  <rect x={x0} y={allRow.y} width={w} height={allRow.h} fill="transparent" />
                  {a.launches > 0 && <rect x={x0 + w * 0.2} y={base - bh} width={w * 0.6} height={bh} fill="var(--color-text-secondary)" fillOpacity={0.55} />}
                  {a.elections.map((r, i) => <g key={r.key}>{cap(r, x0 + w / 2, base + 7 + i * 9 > allRow.y + allRow.h - 4 ? allRow.y + allRow.h - 4 : base + 7 + i * 9)}</g>)}
                  {a.launches === 0 && a.elections.length === 0 && <text x={x0 + w / 2} y={base + 12} textAnchor="middle" fontSize={smallText} fill="var(--color-text-muted)" fontFamily="var(--font-mono)">0</text>}
                  <title>{`${a.year}: ${a.launches} launches recorded · ${a.elections.length} assembly elections recorded`}</title>
                </g>
              );
            })}
            <line x1={0} x2={W} y1={allRow.y + 30} y2={allRow.y + 30} stroke="rgba(244,240,232,0.2)" />

            {previewRow && p.preview && (
              <g>
                {p.preview.launches.map((d, i) => <line key={`pl${i}`} x1={x(d)} x2={x(d)} y1={previewRow.y + 4} y2={previewRow.y + previewRow.h - 4} stroke="var(--color-text-secondary)" />)}
                {p.preview.elections.map((r) => <g key={`pe${r.key}`}>{cap(r, x(r.e.date), previewRow.y + previewRow.h / 2)}</g>)}
              </g>
            )}

            {/* central band: Lok Sabha rules run through it only */}
            {p.central.hidden == null && p.central.elections.map((r) => (
              <g key={`ls${r.key}`}>
                {band(r, centralTop, centralBottom)}
                <line x1={x(r.e.date)} x2={x(r.e.date)} y1={centralTop} y2={centralBottom} stroke="var(--color-text-muted)" strokeWidth={0.8} />
                {centralCaps && cap(r, x(r.e.date), centralCaps.y + centralCaps.h / 2 + 2)}
                <title>{electionTitle(r)}</title>
              </g>
            ))}
            {centralLanes.map(({ l, r }) => laneG(l, r, true))}

            {p.state && p.state.elections.map((r) => (
              <g key={`se${r.key}`}>
                {band(r, stateTop, stateBottom)}
                <line data-election="" x1={x(r.e.date)} x2={x(r.e.date)} y1={stateTop} y2={stateBottom} stroke="var(--color-text-muted)" strokeWidth={0.8} />
                {stateCaps && cap(r, x(r.e.date), stateCaps.y + stateCaps.h / 2 + 2)}
                <title>{electionTitle(r)}</title>
              </g>
            ))}
            {stateLanes.map(({ l, r }) => laneG(l, r, false))}

            <line x1={0} x2={W} y1={axis.y} y2={axis.y} stroke="rgba(244,240,232,0.2)" />
            {(() => {
              const d = p.asOf ? new Date(dayOf(p.asOf) * DAY) : null;
              const lastTxt = `${LAST_YEAR} (to ${d ? `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}` : 'date not recorded'})`;
              // The last label is anchored at the right edge; any year label that would run
              // into it is left out rather than drawn over it.
              const lastStart = W - 2 - lastTxt.length * 7.4;
              const step = p.narrow ? 1 : 2;
              const shown = YEARS.filter((y) => y !== LAST_YEAR && (y - FIRST_YEAR) % step === 0 && yx(y) + 2 + String(y).length * 7.4 < lastStart - 4);
              return [
                ...shown.map((y) => (
                  <text key={`ax${y}`} x={yx(y) + 2} y={axis.y + 16} fontSize={12} fill="var(--color-text-muted)" fontFamily="var(--font-mono)">{String(y)}</text>
                )),
                <text key="axlast" x={W - 2} y={axis.y + 16} textAnchor="end" fontSize={12} fill="var(--color-text-muted)" fontFamily="var(--font-mono)">{lastTxt}</text>,
              ];
            })()}
          </svg>
        </div>
      </div>
      {p.footer}
    </div>
  );
}
