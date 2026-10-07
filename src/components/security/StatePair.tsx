import { memo, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { StateCode } from '../../graph/schema';
import { STATE_BY_ID, VIEWBOX } from '../../data/geo';
import {
  type Filters, type BudgetRow, type StatePair as Pair, type SpendMetric, UNITS, stateName, STATE_SERIES, STATE_PAIRS, STATE_ROWS, STATE_SERIES_HEAD, GSDP_FY, gsdpOf,
  stateSpend, gsdpShare, vacancyPct, SPEND_BINS, binOf, STRENGTH_ST, STRENGTH_YEARS, stateStrength, STRENGTH_BINS, isDerivedStrength, derivedSentence, pairDrawable, budgetPass, rowTier,
  fmtInt, fmtCr, round2, median, FOOTPRINT, COMMISSIONERATES, EMPTY, NOTHING, ASOF, fyStart, } from '../../data/securityView';
import { usePage, Caption, Twin, TwinTable, Exports, captionText, Cr, Src, FOCUS, SkipLink, type Row, type Col } from './ui';

/**
 * The state maps (§5.1.6) and the map primitive the footprint lens shares. A map is a
 * listbox of 36 options, one per unit, north to south; every shape inside it is drawing
 * only, and the words are the option's name. Bins are pooled over every pair or year with
 * no filter and frozen, so a filter can dim a unit but never re-colour the rest.
 */

const [, , VB_W, VB_H] = VIEWBOX.split(/\s+/).map(Number);
/** The house ramp's floor-to-top steps, five bins; the floor stays at or above #2e373f. */
const RAMP = ['#2e373f', '#3d6668', '#61988e', '#89b19f', '#b7cbb0'];
const GROUND = '#101116';
const HATCH_INK = 'rgba(201,168,108,0.6)';
const CROSS_INK = 'rgba(232,228,220,0.55)';
const STIPPLE_INK = 'rgba(232,228,220,0.5)';
const HIDDEN_FILL = '#23272f';
const FRAME_DASH: Record<string, string | undefined> = { documented: undefined, reported: '6 3' };

export type FillClass = 'value' | 'hatch' | 'crosshatch' | 'stipple' | 'hidden' | 'plain';
export interface UnitOpt { st: StateCode; cls: FillClass; fill?: string; name: string }
export interface MapDot { key: string; st: StateCode; i: number; n: number }

/** The three non-value textures, defined per map so a greyscale print keys the same greys. */
function Patterns({ id }: { id: string }) {
  const p = 8;
  return (
    <defs aria-hidden="true">
      <pattern id={`${id}-h`} width={p} height={p} patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
        <rect width={p} height={p} fill={GROUND} />
        <line x1="0" y1="0" x2="0" y2={p} stroke={HATCH_INK} strokeWidth="1.6" />
      </pattern>
      <pattern id={`${id}-x`} width={p} height={p} patternUnits="userSpaceOnUse">
        <rect width={p} height={p} fill="#3a3f4a" />
        <path d={`M0 0L${p} ${p}M${p} 0L0 ${p}`} stroke={CROSS_INK} strokeWidth="1.4" />
      </pattern>
      <pattern id={`${id}-s`} width={p * 0.75} height={p * 0.75} patternUnits="userSpaceOnUse">
        <rect width={p * 0.75} height={p * 0.75} fill="#1b1d24" />
        <circle cx={p * 0.375} cy={p * 0.375} r="1.4" fill={STIPPLE_INK} />
      </pattern>
    </defs>
  );
}
const fillOf = (o: UnitOpt, id: string) => (o.cls === 'hatch' ? `url(#${id}-h)` : o.cls === 'crosshatch' ? `url(#${id}-x)` : o.cls === 'stipple' ? `url(#${id}-s)` : o.cls === 'hidden' ? HIDDEN_FILL : o.cls === 'plain' ? '#1a1d24' : o.fill ?? RAMP[0]);

/** A legend swatch drawn with the map's own textures (≥ 12 px so a phone reads it). */
export function Swatch({ cls, fill }: { cls: FillClass; fill?: string }) {
  const id = `sw${useId().replace(/:/g, '')}`;
  return (
    <svg width="18" height="12" aria-hidden="true" className="inline-block align-middle mr-1.5 border border-border-light">
      <Patterns id={id} />
      <rect width="18" height="12" fill={fillOf({ st: 'dl', cls, fill, name: '' }, id)} />
    </svg>
  );
}

/**
 * The map: an svg listbox. Arrow keys walk the 36 options north to south; Enter or Space
 * opens the unit; Escape clears the selection. A pointer press on the selected unit
 * clears it. Below 640px each option carries an invisible 44px hit area, drawing only.
 */
interface UnitMapProps {
  id: string; label: string; describedBy?: string; opts: UnitOpt[]; selected: StateCode | null; narrow: boolean;
  onPick: (st: StateCode | null, via: 'pointer' | 'keyboard', el: SVGSVGElement | null) => void;
  frame?: string; dots?: MapDot[]; overflow?: { st: StateCode; k: number }[]; onHover?: (st: StateCode | null) => void;
}
const optsKey = (p: UnitMapProps) => `${p.id}|${p.label}|${p.selected}|${p.narrow}|${p.frame}|${p.opts.map((o) => `${o.cls}${o.fill}${o.name}`).join(';')}|${p.dots?.map((d) => d.key).join() ?? ''}|${p.overflow?.map((o) => `${o.st}${o.k}`).join() ?? ''}`;
/** Memoised on what it draws, so a filter that changes nothing on the map does not repaint 36 paths. */
export const UnitMap = memo(UnitMapImpl, (a, b) => optsKey(a) === optsKey(b));
function UnitMapImpl({ id, label, describedBy, opts, selected, onPick, frame, dots, overflow, onHover, narrow }: UnitMapProps) {
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const hoverRef = useRef(onHover);
  hoverRef.current = onHover;
  const ref = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState<number>(() => Math.max(0, opts.findIndex((o) => o.st === selected)));
  const [focused, setFocused] = useState(false);
  useEffect(() => { const i = opts.findIndex((o) => o.st === selected); if (i >= 0) setActive(i); }, [selected, opts]);
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    let n = -1;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') n = Math.min(opts.length - 1, active + 1);
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') n = Math.max(0, active - 1);
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = opts.length - 1;
    if (n >= 0) { e.preventDefault(); setActive(n); hoverRef.current?.(opts[n].st); return; }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const st = opts[active].st; pickRef.current(st === selected ? null : st, 'keyboard', ref.current); return; }
    if (e.key === 'Escape' && selected) { e.preventDefault(); pickRef.current(null, 'keyboard', ref.current); }
  };
  return (
    <svg ref={ref} role="listbox" tabIndex={0} aria-label={label} aria-describedby={describedBy} aria-activedescendant={`${id}-${opts[active]?.st}`}
      viewBox={`0 0 ${VB_W} ${VB_H}`} style={narrow ? { height: 300 } : undefined} className={`block w-full ${narrow ? '' : 'h-auto max-h-[440px]'} ${FOCUS}`} onKeyDown={onKey} onMouseLeave={() => hoverRef.current?.(null)}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}>
      <Patterns id={id} />
      {opts.map((o, i) => {
        const g = STATE_BY_ID.get(o.st);
        if (!g) return null;
        // At 300px tall a unit needs about 104 user units to reach a 44px target (U8).
        const small = g.bbox[3] - g.bbox[1] < 104;
        const sel = o.st === selected;
        return (
          <g key={o.st} id={`${id}-${o.st}`} role="option" aria-selected={sel ? 'true' : 'false'} aria-label={o.name}
            onClick={() => { setActive(i); pickRef.current(sel ? null : o.st, 'pointer', ref.current); }} onMouseEnter={() => hoverRef.current?.(o.st)} className="cursor-pointer">
            <path aria-hidden="true" data-fill-class={o.cls} d={g.path} fill={fillOf(o, id)} stroke={sel ? 'var(--color-accent)' : i === active ? 'var(--color-text-secondary)' : '#0b0c10'} strokeWidth={sel ? 2.4 : 0.8} />
            {narrow && small && <circle aria-hidden="true" cx={g.cx} cy={g.cy} r={53} fill="transparent" pointerEvents="none" />}
          </g>
        );
      })}
      <g aria-hidden="true">
        {dots?.map((d) => {
          const g = STATE_BY_ID.get(d.st)!;
          const total = Math.min(d.n, capOf(d.st));
          const pt = spiral(g, d.i, total);
          return <circle key={d.key} data-dot="" cx={pt.x} cy={pt.y} r={2.6} fill="var(--color-text-secondary)" stroke={GROUND} strokeWidth="1" />;
        })}
        {overflow?.map((o) => {
          const g = STATE_BY_ID.get(o.st)!;
          return <text key={o.st} data-overflow={o.k} x={g.cx + 6} y={g.cy - 4} fontSize="12" fill="var(--color-text)">{`+${o.k}`}</text>;
        })}
        <rect x="1" y="1" width={VB_W - 2} height={VB_H - 2} fill="none" stroke="var(--color-border-light)" strokeWidth="1" strokeDasharray={frame} />
        {/* The option under aria-activedescendant, drawn last and at 2 CSS px whatever the map's scale (A11Y-006 M1). */}
        {focused && opts[active] && STATE_BY_ID.get(opts[active].st) && (
          <path data-active-outline="" d={STATE_BY_ID.get(opts[active].st)!.path} fill="none" stroke="var(--color-text)" strokeWidth={2} vectorEffect="non-scaling-stroke" pointerEvents="none" />
        )}
      </g>
    </svg>
  );
}
/** How many dots a unit can hold before the rest are counted as `+k` beside its anchor (E16). */
export const capOf = (st: StateCode) => { const g = STATE_BY_ID.get(st); return !g ? 0 : g.clearance < 6 ? 3 : g.clearance < 14 ? 8 : 60; };
function spiral(g: { cx: number; cy: number; clearance: number }, i: number, total: number) {
  if (total <= 1) return { x: g.cx, y: g.cy };
  const maxR = Math.max(3, g.clearance * 0.72);
  const r = maxR * Math.sqrt(i / Math.max(1, total - 1));
  const a = i * 2.399963229728653;
  return { x: g.cx + r * Math.cos(a), y: g.cy + r * Math.sin(a) };
}

// ---------------------------------------------------------------------------
// Spend and strength (Q6)
// ---------------------------------------------------------------------------

const fmt2 = (x: number) => round2(x).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const binLabel = (edges: number[], i: number, unit: string) => `${fmt2(edges[i])}–${fmt2(edges[i + 1])}${unit}`;
/** Why a series row is hidden, in the words a cell prints (never a hatch). */
export function hiddenWhy(f: Filters, r: BudgetRow): string {
  if (!f.tiers.has(rowTier(r))) return 'tier';
  if (f.payer === 'union' && r.payer !== 'union') return 'payer';
  if (f.payer === 'states' && r.payer === 'union') return 'payer';
  if (f.fyFrom && !(r.fy >= f.fyFrom && r.fy <= f.fyTo!)) return 'FY';
  return 'tier';
}
/** A state row is visible under the page filters; `st` is a selection here, never a filter. */
export const stateVisible = (f: Filters, r: BudgetRow) => budgetPass({ ...f, st: null }, r, { comp: false });

function spendModel(f: Filters) {
  const m: SpendMetric = f.m === 'percap' ? 'gsdp' : f.m;
  const pair = f.pair;
  const vis = (r: BudgetRow) => stateVisible(f, r);
  const anyHidden = pair ? STATE_SERIES.find((r) => r.fy === pair.fy && r.stage === pair.stage && !vis(r)) : undefined;
  const units = stateSpend(pair, m, vis, anyHidden ? hiddenWhy(f, anyHidden) : null);
  const edges = SPEND_BINS[m === 'cr' ? 'cr' : 'gsdp'];
  const values = UNITS.map((st) => units.get(st)!).filter((u) => u.cls === 'value').map((u) => u.value!);
  return { m, pair, units, edges, values, med: median(values) };
}
const unitWord = (m: SpendMetric) => (m === 'cr' ? ' ₹ cr' : ' %');

export function spendName(st: StateCode, u: ReturnType<typeof stateSpend> extends Map<StateCode, infer V> ? V : never, m: SpendMetric, pair: Pair | null): string {
  const n = stateName(st);
  if (u.cls === 'union-funded') return 'Delhi: police paid by the Union, not a state line';
  if (u.cls === 'no-row') return `${n}: no row in this register`;
  if (u.cls === 'no-denominator') return `${n}: GSDP not in this build`;
  if (u.cls === 'hidden') return `${n}: rows hidden by the ${u.hiddenBy ?? 'tier'} filter — not absent`;
  return m === 'cr' ? `${n}: ${fmtCr(u.value!)} crore rupees, ${pair?.fy} ${pair?.stage}` : `${n}: ${round2(u.value!)} percent of GSDP, ${pair?.fy} ${pair?.stage}, reported`;
}

/** The dot strip under a map: every drawn unit on the value axis, by value. Drawing only. */
function DotStrip({ items, lo, hi, med, unit }: { items: { st: StateCode; v: number }[]; lo: number; hi: number; med: number | null; unit: string }) {
  const W = 600;
  const x = (v: number) => 12 + ((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo || 1)) * (W - 40);
  const sorted = [...items].sort((a, b) => a.v - b.v || (a.st < b.st ? -1 : 1));
  return (
    <svg aria-hidden="true" viewBox={`0 0 ${W} 58`} className="block w-full h-auto mt-1">
      <line x1="12" x2={W - 28} y1="20" y2="20" stroke="var(--color-border-light)" strokeWidth="1" />
      {med != null && <line x1={x(med)} x2={x(med)} y1="8" y2="32" stroke="var(--color-text-muted)" strokeWidth="1" strokeDasharray="2 2" />}
      {sorted.map((d, i) => (
        <g key={d.st}>
          <circle cx={x(d.v)} cy="20" r="3" fill="var(--color-text-secondary)" />
          <text x={x(d.v)} y={i % 2 ? 50 : 40} fontSize="10" textAnchor="start" fill="var(--color-text-muted)">{d.st.toUpperCase()}</text>
        </g>
      ))}
      {med != null && <text x={x(med)} y="8" fontSize="10" fill="var(--color-text-muted)">{`median of ${items.length} drawn${unit}`}</text>}
    </svg>
  );
}

function Segmented<T extends string | number>({ label, items, value, onPick, describedBy }: { label: string; items: { v: T; text: string }[]; value: T; onPick: (v: T) => void; describedBy?: string }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const cur = Math.max(0, items.findIndex((x) => x.v === value));
  const onKey = (e: KeyboardEvent<HTMLDivElement>, i: number) => {
    let n = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = Math.min(items.length - 1, i + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = Math.max(0, i - 1);
    if (n < 0) return;
    e.preventDefault();
    refs.current[n]?.focus();
  };
  return (
    <div role="group" aria-label={label} aria-describedby={describedBy} className="inline-flex flex-wrap gap-1">
      {items.map((x, i) => (
        <button key={String(x.v)} ref={(el) => { refs.current[i] = el; }} type="button" aria-pressed={x.v === value} tabIndex={i === cur ? 0 : -1}
          onKeyDown={(e) => onKey(e as unknown as KeyboardEvent<HTMLDivElement>, i)} onClick={() => onPick(x.v)}
          className={`sec-pressed font-mono text-[12px] px-2 py-1 min-h-[30px] border rounded ${x.v === value ? 'border-accent text-text' : 'border-border-light text-text-secondary'} ${FOCUS}`}>
          {x.text}
        </button>
      ))}
    </div>
  );
}

export const Q6 = 'Q6 — What does each state spend on police, against its economy, beside how many police it has?';

export function StatePair() {
  const { f, narrow, patch, announce, selectState, inlinePanel, filterWords } = usePage();
  const sp = spendModel(f);
  const sy = f.sy;
  const strength = stateStrength(sy);
  const [hoverL, setHoverL] = useState<StateCode | null>(null);
  const [hoverR, setHoverR] = useState<StateCode | null>(null);
  const noState = EMPTY || STATE_ROWS.length === 0;

  // ---- spend options
  const spendOpts: UnitOpt[] = UNITS.map((st) => {
    if (noState) return { st, cls: 'hatch', name: `${stateName(st)}: ${EMPTY ? 'register not yet promoted' : 'no state rows in this build'}` };
    const u = sp.units.get(st)!;
    const cls: FillClass = u.cls === 'value' ? 'value' : u.cls === 'union-funded' ? 'crosshatch' : u.cls === 'hidden' ? 'hidden' : 'hatch';
    return { st, cls, fill: u.cls === 'value' ? RAMP[binOf(u.value!, sp.edges)] : undefined, name: spendName(st, u, sp.m, sp.pair) };
  });
  const sCount = (c: FillClass) => spendOpts.filter((o) => o.cls === c).length;
  const noRowN = noState ? 36 : UNITS.filter((st) => sp.units.get(st)!.cls === 'no-row').length;
  const noDenN = noState ? 0 : UNITS.filter((st) => sp.units.get(st)!.cls === 'no-denominator').length;
  const spendTier = sp.m === 'gsdp' ? 'reported' : (sp.pair && STATE_SERIES.some((r) => r.fy === sp.pair!.fy && r.stage === sp.pair!.stage && rowTier(r) === 'reported') ? 'reported' : 'documented');

  // ---- strength options
  const strOpts: UnitOpt[] = UNITS.map((st) => {
    if (EMPTY || STRENGTH_ST.length === 0) return { st, cls: 'hatch', name: `${stateName(st)}: ${EMPTY ? 'register not yet promoted' : 'no state rows in this build'}` };
    const u = strength.get(st)!;
    if (u.cls === 'value') return { st, cls: 'value', fill: RAMP[binOf(u.perLakh!, STRENGTH_BINS)], name: `${stateName(st)}: ${u.perLakh} police per lakh people, ${sy}, reported` };
    if (u.cls === 'counts-only') return { st, cls: 'stipple', name: `${stateName(st)}: counts recorded without per-lakh, ${sy}` };
    return { st, cls: 'hatch', name: `${stateName(st)}: no row in this register for ${sy}` };
  });
  const atYear = STRENGTH_ST.filter((r) => r.year === sy);
  const strValues = UNITS.map((st) => strength.get(st)!).filter((u) => u.cls === 'value').map((u) => u.perLakh!);
  const strMed = median(strValues);
  const strTier = atYear.some((r) => rowTier(r) === 'reported') ? 'reported' : 'documented';

  const pick = (st: StateCode | null, via: 'pointer' | 'keyboard', el: SVGSVGElement | null) => selectState(st, via, el);
  const hiddenRows = STATE_SERIES.filter((r) => !stateVisible(f, r)).length;

  const metricItems: { v: SpendMetric; text: string }[] = [{ v: 'gsdp', text: '% of GSDP' }, { v: 'cr', text: 'crore as published' }];
  const setPair = (key: string) => {
    const p = STATE_PAIRS.find((x) => x.key === key);
    if (!p) return;
    if (!pairDrawable(p, sp.m)) { announce(`${p.fy} ${p.stage} cannot be drawn: GSDP in this build is for ${GSDP_FY} only`, 0); return; }
    patch({ sfy: p.key });
    announce(`spend map: ${p.fy} ${p.stage}`, 0);
  };
  const legendBins = (edges: number[], unit: string, counts: number[]) => edges.slice(0, -1).map((_, i) => (
    <li key={i}><Swatch cls="value" fill={RAMP[i]} />{`${binLabel(edges, i, unit)}${counts[i] ? '' : ' (none in view)'}`}</li>
  ));
  const binCounts = (vals: number[], edges: number[]) => edges.slice(0, -1).map((_, i) => vals.filter((v) => binOf(v, edges) === i).length);

  const spendLine = noState ? (EMPTY ? 'register not yet promoted — nothing below is zero' : 'no state rows in this build')
    : sp.m === 'cr'
      ? `${sp.values.length} of 36 drawn · ${sp.pair?.fy} ${sp.pair?.stage} · head Police (MH 2055), revenue account only (capital outlay MH 4055 is not in the RBI row) · ₹ crore as published · median of ${sp.values.length} drawn states: ${sp.med == null ? 'none drawn' : `${fmt2(sp.med)} ₹ cr`}`
      : `${sp.values.length} of 36 drawn · ${sp.pair?.fy} ${sp.pair?.stage} · head Police (MH 2055), revenue account only (capital outlay MH 4055 is not in the RBI row) · ÷ GSDP ${GSDP_FY} (reported) · median of ${sp.values.length} drawn states: ${sp.med == null ? 'none drawn' : `${round2(sp.med)} %`}`;
  const strLine = EMPTY || STRENGTH_ST.length === 0 ? (EMPTY ? 'register not yet promoted — nothing below is zero' : 'no state rows in this build')
    : `${strValues.length} of 36 drawn · per lakh as printed, BPR&D via secondary sources · ${atYear.filter((r) => rowTier(r) === 'reported').length} of ${atYear.length} reported · ${strOpts.filter((o) => o.cls === 'stipple').length} counts only · median of ${strValues.length} drawn states: ${strMed == null ? 'none drawn' : `${round2(strMed)} per lakh`}`;

  const hoverLine = (st: StateCode | null, side: 'l' | 'r'): ReactNode => {
    if (!st) return <span className="text-text-muted">{narrow ? 'Tap a state for its line; tap again to open it.' : 'Point at or arrow to a state for its line; Enter opens it.'}</span>;
    const o = (side === 'l' ? spendOpts : strOpts).find((x) => x.st === st)!;
    const row = side === 'l' ? sp.units.get(st)?.row : null;
    return <>{o.name}{row && <> · <Cr row={row} /></>}{' — open the state for the rows'}</>;
  };

  return (
    <>
      <p data-page-copy="" className="hidden sm:block text-[14px] text-text-secondary max-w-[80ch]">
        Two maps side by side: what each state&apos;s police head records against its economy, and how many police per lakh people the national table printed. They use different bases and years and are not divided one by the other.
      </p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 my-2">
        <Segmented label="Spend map metric" items={metricItems} value={sp.m} onPick={(v) => { patch({ m: v === 'gsdp' ? null : v }); announce(v === 'cr' ? 'spend map in ₹ crore as published' : 'spend map as % of GSDP', 0); }} />
        <button type="button" aria-disabled="true" aria-label={narrow ? 'Per person, unavailable: no population series in this build; a 2011 Census base would re-rank states (S3)' : undefined} className={`font-mono text-[12px] px-2 py-1 min-h-[30px] border border-dashed border-border-light rounded text-text-muted ${FOCUS}`}
          onClick={() => announce('Per person is unavailable: no population series in this build', 0)}>
          {narrow ? 'Per person, unavailable (S3)' : 'Per person, unavailable: no population series in this build; a 2011 Census base would re-rank states (S3)'}
        </button>
        {/* The reason a year is unavailable is in its option's name and in the line under the select, not in the
            option's visible text: a select sizes itself to its longest option, and at 390 px that pushed the
            page sideways (A11Y-006 S2). */}
        <label className="font-mono text-[12px] text-text-muted flex flex-wrap items-center gap-1.5 min-w-0 max-w-full">
          <span>Year and stage of the spend map</span>
          <select value={sp.pair?.key ?? ''} onChange={(e) => setPair(e.target.value)} aria-describedby={STATE_PAIRS.some((p) => !pairDrawable(p, sp.m)) ? 'sec-pair-note' : undefined}
            className={`bg-surface border border-border-light rounded px-1 py-0.5 text-[12px] text-text min-w-0 max-w-full ${FOCUS}`}>
            {STATE_PAIRS.map((p) => {
              const ok = pairDrawable(p, sp.m);
              const text = `${p.fy} ${p.stage} · ${p.states} states`;
              return <option key={p.key} value={p.key} aria-disabled={ok ? undefined : 'true'} aria-label={ok ? undefined : `${text} — GSDP in this build is for ${GSDP_FY} only`}>{ok ? text : `${text} — unavailable`}</option>;
            })}
          </select>
        </label>
        {STATE_PAIRS.some((p) => !pairDrawable(p, sp.m)) && <span id="sec-pair-note" className="basis-full font-mono text-[12px] text-text-muted">{`GSDP in this build is for ${GSDP_FY} only: the other years are listed and cannot be drawn as a share of GSDP.`}</span>}
      </div>
      <div className="grid lg:grid-cols-2 gap-x-6 gap-y-4 items-start">
        <figure className="m-0 min-w-0" aria-labelledby="sec-b6-spend-title" aria-describedby="sec-c7">
          <h4 id="sec-b6-spend-title" className="text-[14px] font-semibold text-text m-0 mb-1">Police spending by state</h4>
          <SkipLink twin="spend-map" title="Police spending by state" />
          <UnitMap id="sec-map-spend" label={`Police spending by state, ${sp.m === 'cr' ? '₹ crore as published' : 'as a share of GSDP'}: 36 states and union territories, north to south`} describedBy="sec-c7"
            opts={spendOpts} selected={f.st} onPick={pick} frame={FRAME_DASH[spendTier]} onHover={setHoverL} narrow={narrow} />
          {!noState && <DotStrip items={UNITS.filter((st) => sp.units.get(st)!.cls === 'value').map((st) => ({ st, v: sp.units.get(st)!.value! }))} lo={sp.edges[0]} hi={sp.edges[sp.edges.length - 1]} med={sp.med} unit={unitWord(sp.m)} />}
          {(!narrow || hoverL) && <p className="font-mono text-[12px] text-text-muted my-1 sm:min-h-[2.6em]" data-readout="">{hoverLine(hoverL, 'l')}</p>}
          <ul data-legend="" className="list-none p-0 m-0 text-[12.5px] text-text-secondary grid grid-cols-2 gap-x-3 gap-y-0.5">
            {noState ? <li><Swatch cls="hatch" />no state rows in this build</li> : <>
              {legendBins(sp.edges, unitWord(sp.m), binCounts(sp.values, sp.edges))}
              <li><Swatch cls="hatch" />{`no row in this register (${noRowN})`}</li>
              <li><Swatch cls="crosshatch" />police paid by the Union: Delhi Police is a line in the Police demand</li>
              {sp.m === 'gsdp' && <li><Swatch cls="hatch" />{`GSDP not in this build (${noDenN})`}</li>}
              {sCount('hidden') > 0 && <li><Swatch cls="hidden" />{`hidden by filter (${sCount('hidden')})`}</li>}
            </>}
          </ul>
          {!noState && sp.m === 'gsdp' && <p className="text-[12.5px] text-text-secondary my-1">every ratio on this map is reported: its denominator is a secondary series</p>}
          <p data-page-copy="" className="font-mono text-[12px] text-text-muted tracking-wide my-1">{spendLine}</p>
          {hiddenRows > 0 && <p className="font-mono text-[12px] text-text-muted my-1">{`${hiddenRows} rows hidden by filters`}</p>}
          {narrow && <OpenState label="Open a state on the spend map" onPick={(st) => selectState(st, 'keyboard', null)} />}
        </figure>
        <figure className="m-0 min-w-0" aria-labelledby="sec-b6-strength-title" aria-describedby="sec-c7">
          <h4 id="sec-b6-strength-title" className="text-[14px] font-semibold text-text m-0 mb-1">Police strength by state</h4>
          <SkipLink twin="strength-map" title="Police strength by state" />
          <UnitMap id="sec-map-strength" label="Police strength by state, per lakh people as printed: 36 states and union territories, north to south" describedBy="sec-c7"
            opts={strOpts} selected={f.st} onPick={pick} frame={FRAME_DASH[strTier]} onHover={setHoverR} narrow={narrow} />
          {strValues.length > 0 && <DotStrip items={UNITS.filter((st) => strength.get(st)!.cls === 'value').map((st) => ({ st, v: strength.get(st)!.perLakh! }))} lo={STRENGTH_BINS[0]} hi={STRENGTH_BINS[STRENGTH_BINS.length - 1]} med={strMed} unit=" per lakh" />}
          {(!narrow || hoverR) && <p className="font-mono text-[12px] text-text-muted my-1 sm:min-h-[2.6em]" data-readout="">{hoverLine(hoverR, 'r')}</p>}
          <div className="my-1">
            {STRENGTH_YEARS.length > 0 && <Segmented label="Strength year" items={STRENGTH_YEARS.map((y) => ({ v: y, text: `${y} · ${STRENGTH_ST.filter((r) => r.year === y).length} rows` }))} value={sy ?? STRENGTH_YEARS[0]}
              onPick={(y) => { patch({ sy: String(y) }); announce(`strength map: ${y}`, 0); }} />}
          </div>
          <ul data-legend="" className="list-none p-0 m-0 text-[12.5px] text-text-secondary grid grid-cols-2 gap-x-3 gap-y-0.5">
            {EMPTY || STRENGTH_ST.length === 0 ? <li><Swatch cls="hatch" />no state rows in this build</li> : <>
              {legendBins(STRENGTH_BINS, ' per lakh', binCounts(strValues, STRENGTH_BINS))}
              <li><Swatch cls="stipple" />{`counts recorded without per-lakh (${strOpts.filter((o) => o.cls === 'stipple').length})`}</li>
              <li><Swatch cls="hatch" />{`no row in this register (${strOpts.filter((o) => o.cls === 'hatch').length})`}</li>
            </>}
          </ul>
          <p data-page-copy="" className="font-mono text-[12px] text-text-muted tracking-wide my-1">{strLine}</p>
          {narrow && <OpenState label="Open a state on the strength map" onPick={(st) => selectState(st, 'keyboard', null)} />}
        </figure>
      </div>
      {inlinePanel('map')}
      <Caption id="sec-c7" cap="C7">
        {`Left: what each state's police head spent or budgeted, from RBI's State Finances, ${sp.m === 'cr' ? 'drawn as the ₹ crore as published, not divided' : `divided by GSDP of ${GSDP_FY}`}; every ratio is reported because its denominator is a secondary series for one year. Right: police per lakh people as the national police table printed it, carried here from secondary sources while that table is unreachable; the absolute counts beneath were derived by the research from the ratio. The two maps use different bases and different years; they sit side by side for reading, not for dividing one by the other. Delhi's police is paid by the Union and is drawn in the budgets above, not here. Hatched means no row is recorded, never zero. A per-person figure waits for a current population series: dividing by the 2011 Census would inflate faster-growing states' figures and re-order them.${sp.m === 'cr' ? ' A ₹ map of states is largely a population map.' : ''}`}
      </Caption>
      <SpendTwin sp={sp} opts={spendOpts} filterWords={filterWords} />
      <StrengthTwin sy={sy} opts={strOpts} filterWords={filterWords} />
      <StateTable />
      {EMPTY && <p className="text-[14px] text-text-secondary">{NOTHING}</p>}
    </>
  );
}

function OpenState({ label, onPick }: { label: string; onPick: (st: StateCode) => void }) {
  return (
    <select aria-label={label} value="" onChange={(e) => { if (e.target.value) onPick(e.target.value as StateCode); }}
      className={`mt-1 w-full bg-surface border border-border-light rounded px-2 py-2 text-[14px] ${FOCUS}`}>
      <option value="">Open a state…</option>
      {[...UNITS].sort((a, b) => stateName(a).localeCompare(stateName(b))).map((st) => <option key={st} value={st}>{stateName(st)}</option>)}
    </select>
  );
}

// ---------------------------------------------------------------------------
// Twins
// ---------------------------------------------------------------------------

type SortKey = { key: string; dir: 'ascending' | 'descending' } | null;
function useSort() {
  const [s, setS] = useState<SortKey>(null);
  const on = (key: string) => setS((p) => (p?.key === key ? { key, dir: p.dir === 'ascending' ? 'descending' : 'ascending' } : { key, dir: 'ascending' }));
  return [s, on] as const;
}
function sortRows<T>(rows: T[], s: SortKey, val: (r: T, key: string) => number | null) {
  if (!s) return rows;
  const k = s.dir === 'ascending' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = val(a, s.key), y = val(b, s.key);
    if (x == null && y == null) return 0;
    if (x == null) return 1;
    if (y == null) return -1;
    return (x - y) * k;
  });
}

const CLASS_WORDS: Record<string, string> = {
  value: 'drawn on the ramp', 'union-funded': 'police paid by the Union', 'no-row': 'no row in this register', 'no-denominator': 'GSDP not in this build', hidden: 'hidden by a filter — not absent',
};

function SpendTwin({ sp, opts, filterWords }: { sp: ReturnType<typeof spendModel>; opts: UnitOpt[]; filterWords: string }) {
  const [sort, onSort] = useSort();
  const gs = sp.m === 'gsdp';
  type R = { st: StateCode; pct: number | null; cr: number | null; row: Row };
  void opts;
  const base: R[] = UNITS.map((st) => {
    const u = sp.units.get(st);
    const cls = EMPTY ? 'register not yet promoted' : u ? CLASS_WORDS[u.cls] : 'no row in this register';
    const r = u?.row ?? null;
    const shown = u && (u.cls === 'value' || u.cls === 'no-denominator');
    const pctV = u?.cls === 'value' && gs ? u.value : null;
    const crCell = !r || !shown ? (u?.cls === 'hidden' ? `rows hidden by the ${u.hiddenBy} filter — not absent` : u?.cls === 'union-funded' ? 'police paid by the Union' : cls)
      : gs ? <Cr row={r} /> : <span data-cr={r.cr}>{`₹${fmtCr(r.cr)} cr — ₹ crore as published, no denominator drawn under this metric · `}{crCompareOnly(r)}</span>;
    const cells: ReactNode[] = [stateName(st), cls];
    if (gs) cells.push(pctV != null ? `${round2(pctV)} percent of GSDP ${GSDP_FY}, computed here` : u?.cls === 'no-denominator' ? 'GSDP not in this build' : cls);
    cells.push(crCell, sp.pair ? `${sp.pair.fy} ${sp.pair.stage}` : 'no pair drawable', r ? rowTier(r) : cls);
    return { st, pct: pctV, cr: r && shown ? r.cr : null, row: { cells, out: [st, stateName(st), u?.cls ?? '', pctV == null ? '' : round2(pctV), r && shown ? r.cr : '', sp.pair?.fy ?? '', sp.pair?.stage ?? '', r ? rowTier(r) : ''] } };
  });
  const rows = sortRows(base, sort, (r, k) => (k === 'pct' ? r.pct : r.cr)).map((r) => r.row);
  const cols: Col[] = [{ key: 'st', label: 'State', th: true }, { key: 'cls', label: 'Class' }, ...(gs ? [{ key: 'pct', label: '% of GSDP' }] : []), { key: 'cr', label: '₹ cr' }, { key: 'pair', label: 'Year and stage' }, { key: 'tier', label: 'Tier' }];
  const header = ['st', 'state', 'class', ...(gs ? ['pct_gsdp'] : []), 'cr', 'fy', 'stage', 'tier'];
  return (
    <Twin twin="spend-map" title="Police spending by state" rowCount={36} suffix=", always all 36">
      {() => (
        <>
          <Exports name="Police spending by state, as drawn" twin="spend-map" meta={{ table: 'Police spending by state, as drawn', population: `36 map units, ${sp.pair ? `${sp.pair.fy} ${sp.pair.stage}` : 'no pair'}`, rows: 36, amounts: sp.pair?.stage ?? null }}
            header={header} rows={() => base.map((r) => { const o = r.row.out!; return gs ? o : [o[0], o[1], o[2], o[4], o[5], o[6], o[7]]; })} />
          <TwinTable caption={captionText(36, '36 map units, north to south; always all 36', filterWords)} cols={cols} rows={rows} sortable={gs ? ['pct', 'cr'] : ['cr']} sortKey={sort} onSort={onSort} />
        </>
      )}
    </Twin>
  );
}
const crCompareOnly = (r: BudgetRow) => {
  const prev = STATE_SERIES.find((x) => x.payer === r.payer && x.stage === r.stage && fyStart(x.fy) === fyStart(r.fy) - 1);
  return prev ? `FY${prev.fy} ${r.stage}: ₹${fmtCr(prev.cr)} cr` : `no ${r.stage} row for FY${fyStart(r.fy) - 1}-${String(fyStart(r.fy) % 100).padStart(2, '0')}`;
};

function StrengthTwin({ sy, opts, filterWords }: { sy: number | null; opts: UnitOpt[]; filterWords: string }) {
  const [sort, onSort] = useSort();
  const st = stateStrength(sy);
  type R = { v: number | null; row: Row };
  const base: R[] = UNITS.map((u, i) => {
    const s = st.get(u)!;
    const r = s.rows.find((x) => x.perLakh != null) ?? s.rows[0] ?? null;
    if (EMPTY) return { v: null, row: { cells: [stateName(u), 'register not yet promoted', 'register not yet promoted', 'register not yet promoted', 'register not yet promoted', 'register not yet promoted'] } };
    const cls = opts[i].cls === 'value' ? 'drawn on the ramp' : opts[i].cls === 'stipple' ? 'counts recorded without per-lakh' : 'no row in this register';
    if (!r) return { v: null, row: { cells: [stateName(u), cls, 'no row in this register', 'no row in this register', 'no row in this register', 'no row in this register'], out: [u, stateName(u), sy ?? '', '', '', '', '', ''] } };
    const derived = isDerivedStrength(r);
    const counts = `${r.sanctioned != null ? `sanctioned ${fmtInt(r.sanctioned)}` : 'sanctioned not recorded'}; ${r.actual != null ? `actual ${fmtInt(r.actual)}` : 'actual not recorded'}${derived ? ` — ${derivedSentence(r.note)}` : ''}`;
    const vac = vacancyPct(r) != null ? `vacancy ${vacancyPct(r)}%, computed here from the two printed counts` : 'not computed: two printed counts are needed';
    return {
      v: r.perLakh,
      row: {
        cells: [stateName(u), cls, r.perLakh != null ? String(r.perLakh) : 'no per-lakh printed', counts, vac, rowTier(r)],
        out: [u, stateName(u), r.year, r.perLakh ?? '', r.sanctioned ?? '', r.actual ?? '', rowTier(r), r.note ?? ''],
      },
    };
  });
  const rows = sortRows(base, sort, (r) => r.v).map((r) => r.row);
  const cols: Col[] = [{ key: 'st', label: 'State', th: true }, { key: 'cls', label: 'Class' }, { key: 'pl', label: `Police per lakh, ${sy ?? 'no year'}` }, { key: 'c', label: 'Sanctioned and actual, as the research file records them — read the note' }, { key: 'vac', label: 'Vacancy' }, { key: 't', label: 'Tier' }];
  return (
    <Twin twin="strength-map" title="Police strength by state" rowCount={36} suffix=", always all 36">
      {() => (
        <>
          <Exports name="Police strength by state, as drawn" twin="strength-map" meta={{ table: 'Police strength by state, as drawn', population: `36 map units, ${sy ?? 'no year'}`, rows: 36 }}
            header={['st', 'state', 'year', 'per_lakh', 'sanctioned', 'actual', 'tier', 'note']} rows={() => base.map((r) => r.row.out ?? [])} />
          <TwinTable caption={captionText(36, `36 map units, strength year ${sy ?? 'none'}; always all 36`, filterWords)} amounts={false} cols={cols} rows={rows} sortable={['pl']} sortKey={sort} onSort={onSort} />
        </>
      )}
    </Twin>
  );
}

/** The reading surface: 36 rows, every unit, each empty cell carrying its reason (§5.1.6). */
function StateTable() {
  const { f, filterWords, selectState } = usePage();
  const vis = (r: BudgetRow) => stateVisible(f, r);
  const gsPair = STATE_PAIRS.find((p) => p.key === f.pair?.key && p.fy === GSDP_FY) ?? STATE_PAIRS.find((p) => p.fy === GSDP_FY) ?? null;
  const cols: Col[] = [
    { key: 'st', label: 'State', th: true },
    ...STATE_PAIRS.map((p) => ({ key: p.key, label: <>{`Police head MH 2055 (revenue), ${p.fy} ${p.stage}, ₹ `}<abbr title="crore">cr</abbr></> })),
    { key: 'pct', label: `% of GSDP (${GSDP_FY ?? 'no year'}, reported)` },
    { key: 'ownS', label: 'Own budget series' },
    { key: 'prs', label: 'District Police line, PRS' },
    ...STRENGTH_YEARS.map((y) => ({ key: `pl${y}`, label: `Police per lakh, ${y}` })),
    { key: 'cnt', label: 'Sanctioned and actual, as the research file records them — read the note' },
    { key: 'w', label: 'Women %' },
    { key: 'inst', label: 'Installations' },
    { key: 'comm', label: 'Commissionerates' },
    { key: 'src', label: 'Sources' },
  ];
  const rows: Row[] = UNITS.map((st) => {
    const nm = stateName(st);
    if (EMPTY) return { cells: [nm, ...cols.slice(1).map(() => 'register not yet promoted')] };
    const series = STATE_SERIES.filter((r) => r.payer === st);
    const none = st === 'dl' ? "Delhi's police is a Union demand line — see Q7" : 'no row in this register';
    const mh = STATE_PAIRS.map((p) => {
      const r = series.find((x) => x.fy === p.fy && x.stage === p.stage);
      if (!r) return series.length ? 'no row in this register' : none;
      if (!vis(r)) return `1 row hidden by the ${hiddenWhy(f, r)} filter — not absent`;
      return <Cr row={r} />;
    });
    const gRow = gsPair ? series.find((x) => x.fy === gsPair.fy && x.stage === gsPair.stage) : undefined;
    const gp = gRow ? gsdpShare(gRow) : null;
    const pctCell = st === 'dl' ? none : !gRow ? 'no row in this register' : !vis(gRow) ? `1 row hidden by the ${hiddenWhy(f, gRow)} filter — not absent` : gp == null ? 'GSDP not in this build' : `${gp}% of GSDP ${gRow.fy} (${gsPair!.stage}), computed here`;
    const own = STATE_ROWS.filter((r) => r.payer === st && r.head !== STATE_SERIES_HEAD && !/PRS/.test(r.head));
    const ownFys = [...new Set(own.map((r) => r.fy))].sort();
    const ownCell = own.length ? (
      <button type="button" className={`underline underline-offset-2 text-left ${FOCUS}`} onClick={(e) => selectState(st, 'pointer', e.currentTarget as unknown as SVGSVGElement)}>{`${own.length} rows, FY${ownFys[0]}–FY${ownFys[ownFys.length - 1]}`}</button>
    ) : 'none in this register';
    const prs = STATE_ROWS.filter((r) => r.payer === st && /PRS/.test(r.head));
    const prsCell = prs.length ? <>{prs.map((r, i) => <span key={i} className="block">{vis(r) ? <Cr row={r} tail={' — reported'} /> : `1 row hidden by the ${hiddenWhy(f, r)} filter — not absent`}</span>)}</> : 'no row in this register';
    const str = STRENGTH_ST.filter((r) => r.st === st);
    const pl = STRENGTH_YEARS.map((y) => {
      const r = str.find((x) => x.year === y);
      if (!r) return 'no row in this register';
      return r.perLakh != null ? `${r.perLakh}, ${rowTier(r)}` : `counts recorded without per-lakh, ${rowTier(r)}`;
    });
    const latest = [...str].sort((a, b) => b.year - a.year)[0];
    const cnt = latest ? `${latest.year}: ${latest.sanctioned != null ? `sanctioned ${fmtInt(latest.sanctioned)}` : 'sanctioned not recorded'}; ${latest.actual != null ? `actual ${fmtInt(latest.actual)}` : 'actual not recorded'}${isDerivedStrength(latest) ? ' — derived by the research from per-lakh' : ''}` : 'no row in this register';
    const women = latest?.womenPct != null ? `${latest.womenPct} (${latest.year})` : latest ? 'not recorded' : 'no row in this register';
    const inst = FOOTPRINT.filter((r) => r.st === st).length;
    const comm = COMMISSIONERATES.filter((r) => r.st === st).length;
    const srcs = [...series, ...own, ...prs].flatMap((r) => r.srcs).concat(str.flatMap((r) => r.srcs));
    const uniqSrcs = [...new Map(srcs.map((s) => [s[1], s])).values()];
    return { cells: [nm, ...mh, pctCell, ownCell, prsCell, ...pl, cnt, women, inst ? String(inst) : 'no installation in this register', comm ? String(comm) : 'none in this register', <Src srcs={uniqSrcs} of={`${nm} state rows`} inline />], current: f.st === st };
  });
  const spendRows = () => STATE_ROWS.filter(vis).map((r) => {
    const g = gsdpOf(r.payer);
    const p = gsdpShare(r) ?? '';
    return [r.payer, stateName(r.payer), r.fy, fyStart(r.fy), r.stage, r.head, r.cr, rowTier(r), r.note ?? '', g ?? '', GSDP_FY ?? '', 'reported', p, r.srcs.map(([, u]) => u).join(' ')];
  });
  const strRows = () => STRENGTH_ST.filter((r) => f.tiers.has(rowTier(r))).map((r) => [r.st ?? '', stateName(r.st ?? ''), r.year, r.perLakh ?? '', r.sanctioned ?? '', r.actual ?? '', r.womenPct ?? '', isDerivedStrength(r) ? 'true' : 'false', rowTier(r), r.note ?? '', r.srcs.map(([, u]) => u).join(' ')]);
  return (
    <Twin twin="state-table" title={Q6} rowCount={36} suffix=", always all 36">
      {() => {
        const sr = spendRows();
        const tr = strRows();
        return (
          <>
            <Exports name="State police spend" twin="state-table-spend" meta={{ table: 'State police spend', population: `${STATE_ROWS.length} state budget rows, one per row as printed`, rows: sr.length, amounts: 'BE, RE and actual, as each row states' }}
              header={['st', 'state', 'fy', 'fy_start', 'stage', 'head', 'cr', 'tier', 'note', 'gsdp_cr', 'gsdp_fy', 'gsdp_tier', 'pct_gsdp', 'source_urls']} rows={() => sr} />
            <Exports name="State police strength" twin="state-table-strength" meta={{ table: 'State police strength', population: `${STRENGTH_ST.length} strength rows with a state`, rows: tr.length }}
              header={['st', 'state', 'year', 'per_lakh', 'sanctioned', 'actual', 'women_pct', 'derived_counts', 'tier', 'note', 'source_urls']} rows={() => tr} />
            <TwinTable caption={captionText(36, `36 map units, north to south; always all 36; read to ${ASOF}`, filterWords)} cols={cols} rows={rows} minWidth="90rem" />
          </>
        );
      }}
    </Twin>
  );
}

