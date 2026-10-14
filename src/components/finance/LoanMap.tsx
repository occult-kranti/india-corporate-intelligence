import { useEffect, useId, useMemo, useState, type KeyboardEvent } from 'react';
import { STATES, VIEWBOX, labelMode } from '../../data/geo';
import type { StateCode } from '../../graph/schema';
import { TexturePatterns, TextureSwatch } from '../welfare/WelfareMap';
import {
  type Filters, type StateLoanRow, STATES_NORTH_SOUTH, CENSUS, censusInView, rupeeTotal, hasRupee, fmtCr, pooledBins, binOf, strictSt, fetcherSt,
  LOAN_FACT, BASIS_WORDS, yearOf, labelOf, isSampleLender, RESEARCHED, G1, FINANCE_SENSITIVITY, NO_AMOUNT, strictPlacement,
} from '../../data/financeView';
import { Caption, Twin, Table, Exports, usePage, SkipLinks, captionLine, type Row, ScrollBox } from './ui';
import { Segmented } from './Control';

/**
 * The census on the map (spec §5.1.1). A state is filled only when a record names its
 * government as the borrower; the fetcher's looser rule is its own texture (G1); a
 * state body's registered office is a stipple, never a fill; no record is a hatch,
 * never zero. Bins are pooled over the unfiltered census so a shade means the same
 * amount in every view. The UnionBar puts what cannot be placed in the same frame.
 */

// A sequential ramp for an ordered amount; its floor stays well above the page ground
// so a low value never reads as no data (interface-design: ramp floor ≥ #2e373f).
const RAMP = ['#34424a', '#4b5f66', '#667f85', '#8aa1a4', '#b9c9c8'];
const VB_W = Number(VIEWBOX.split(/\s+/)[2]);
const VB_H = Number(VIEWBOX.split(/\s+/)[3]);

export const MAP_H3 = 'Where the census loans were placed';

function spanOf(rows: { from?: string }[]) {
  const ys = rows.map((e) => yearOf(e.from)).filter((y): y is number => y != null);
  return ys.length ? `${Math.min(...ys)}–${Math.max(...ys)}` : 'no approval year';
}
function basisSplit(rows: StateLoanRow['fetcher']) {
  const by = new Map<string, number>();
  for (const e of rows) { const b = LOAN_FACT(e)?.stBasis ?? 'not exported'; by.set(b, (by.get(b) ?? 0) + 1); }
  return [...by.entries()].map(([b, n]) => `${n} ${BASIS_WORDS[b] ?? b}`).join(', ');
}

/** The accessible name of a state option: the class in words and the value, never a bare token. */
export function optionName(r: StateLoanRow, f: Filters): string {
  const span = f.yFrom != null ? `filtered to ${f.yFrom === f.yTo ? f.yFrom : `${f.yFrom}–${f.yTo}`}` : spanOf(r.strict);
  const tail = [
    `${r.body.length} records name a body registered here (not in fill)`,
    `${r.researched.length} researched records from other lenders name this state government (count only)`,
  ];
  // A placed state names both rules' records in one count, so the readouts and the Union
  // row always add up to the census rows in view; the split says which rule placed which.
  if (r.cls === 'value' || r.cls === 'fetcher') {
    const n = r.strict.length + r.fetcher.length;
    const cr = Math.round((r.strictCr + r.fetcherCr) * 100) / 100;
    const strictSplit = r.strict.length ? ` (${strictBranches(r.strict)})` : '';
    const split = `${r.strict.length} by the state government rule${strictSplit}, ${r.fetcher.length} placed by the fetcher's rule${r.fetcher.length ? ` (${basisSplit(r.fetcher)})` : ''}`;
    // Records with no ₹ are placed, but they carry no amount: never "₹0 cr" (§8.2-5, E1).
    const amount = [...r.strict, ...r.fetcher].some(hasRupee) ? `₹${fmtCr(cr)} cr in ${n} census records` : `placed; in ${n} census records, ${NO_AMOUNT}`;
    return `${r.name}: ${amount} (${r.cls === 'value' ? span : spanOf(r.fetcher)}) — ${split} · ${tail.join(' · ')}`;
  }
  if (r.cls === 'stipple') return `${r.name}: no state government named; ${r.body.length} records name a body registered here — not in the fill · ${tail[1]}`;
  const filtered = f.yFrom != null || !!f.st || !!f.lender || f.tierSet;
  return `${r.name}: no loan record names this state${filtered ? ' in view — in 0 census records under the current filters' : ''}${r.researched.length ? `; ${tail[1]}` : ''}`;
}
/** How many strictly placed records name the state government as borrower, and how many as implementer. */
function strictBranches(rows: StateLoanRow['strict']) {
  const borrower = rows.filter((e) => strictPlacement(e)?.rule === 'state government is the borrower').length;
  return `${borrower} as borrower, ${rows.length - borrower} as implementer`;
}
export const CLASS_WORDS: Record<StateLoanRow['cls'], string> = {
  value: 'placed by the state government rule',
  fetcher: "placed by the fetcher's rule",
  stipple: 'a state body registered here implements a loan; not counted in the fill',
  hatch: 'no loan record names this state',
};

export default function LoanMap({ f, rows, captionIds, onSelect, mapRef, narrow, afterCaption, afterBar, height }: {
  f: Filters;
  rows: Map<StateCode, StateLoanRow>;
  captionIds: { c1: string; c2: string | null };
  onSelect: (st: StateCode | null, via: 'pointer' | 'keyboard') => void;
  mapRef: React.RefObject<SVGSVGElement>;
  narrow: boolean;
  afterCaption?: React.ReactNode;
  /** On a phone the reading key sits directly under the bar, within a screen of the map (U25). */
  afterBar?: React.ReactNode;
  height: number;
}) {
  const { patch, announce, filters: filterText, empty, setListFocus } = usePage();
  const uid = useId().replace(/:/g, '');
  const [idx, setIdx] = useState(-1);
  const [hasFocus, setHasFocus] = useState(false);
  const [hover, setHover] = useState<StateCode | null>(null);
  const [armed, setArmed] = useState<StateCode | null>(null);
  const [px, setPx] = useState(height / VB_H);
  const ORDER = STATES_NORTH_SOUTH;
  useEffect(() => {
    const el = mapRef.current;
    if (!el) return;
    const measure = () => { const r = el.getBoundingClientRect(); if (r.width && r.height) setPx(Math.min(r.width / VB_W, r.height / VB_H)); };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [mapRef]);

  const census = useMemo(() => censusInView(f), [f]);
  const total = rupeeTotal(census);
  const cc = census.filter(hasRupee).length;
  const cnr = census.length - cc;
  const placed = rupeeTotal(census.filter((e) => strictSt(e)));
  const fetcherCr = rupeeTotal(census.filter((e) => fetcherSt(e)));
  const unplaced = Math.round((total - placed - fetcherCr) * 100) / 100;
  const bins = useMemo(() => pooledBins(f.m, f.scale), [f.m, f.scale]);
  const inView = new Set([...rows.values()].filter((r) => r.value != null && r.value > 0).map((r) => binOf(r.value as number, bins)));
  const unitOf = (v: number) => (f.m === 'n' ? `${Math.round(v)} records` : f.m === 'usd' ? `US$${fmtCr(v)} m` : `₹${fmtCr(v)} cr`);
  // A placed state with no amount in the metric is not on the ramp: it is drawn as the
  // page ground with an outline (and the fetcher texture when that rule placed it), and
  // the key names it. The lowest bin is a small amount, never "no amount".
  const noValue = (r: StateLoanRow | undefined) => !!r && (r.cls === 'value' || r.cls === 'fetcher') && r.value == null;
  const fillOf = (r: StateLoanRow | undefined) => {
    if (!r || r.cls === 'hatch') return `url(#h-${uid})`;
    if (r.cls === 'stipple') return `url(#s-${uid})`;
    if (r.value == null) return 'var(--color-bg)';
    return RAMP[Math.min(RAMP.length - 1, binOf(r.value, bins))];
  };
  const k = Math.max(1, 9 / (7 * px));
  const focused = hasFocus && idx >= 0 ? ORDER[idx] : null;
  const optId = (st: string) => `${uid}-st-${st}`;
  const readSt = hover ?? armed ?? focused?.id ?? null;
  const readRow = readSt ? rows.get(readSt as StateCode) : null;

  const move = (d: number) => { const n = (idx + d + ORDER.length) % ORDER.length; setIdx(n); announce(optionName(rows.get(ORDER[n].id)!, f)); };
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if ((e.key === 'Enter' || e.key === ' ') && idx >= 0) { e.preventDefault(); onSelect(ORDER[idx].id, 'keyboard'); }
    else if (e.key === 'Escape' && f.st) { e.preventDefault(); onSelect(null, 'keyboard'); }
  };
  const click = (st: StateCode) => {
    // A coarse pointer's first tap shows the readout; the second, or "Open state", acts (energy D30).
    if (narrow && armed !== st) { setArmed(st); return; }
    onSelect(f.st === st ? null : st, 'pointer');
  };

  const sample = f.lender && isSampleLender(f.lender) ? f.lender : null;
  const sampleN = sample ? RESEARCHED.filter((e) => e.s === sample && strictSt(e)).length : 0;
  const readLines = readRow ? optionName(readRow, f).split(' · ') : [];
  const twinRows: Row[] = [...ORDER.map((s) => {
    const r = rows.get(s.id)!;
    return {
      cells: [s.name, `${CLASS_WORDS[r.cls]}${r.cls === 'hatch' && f.yFrom != null ? ' (in view)' : ''}`, r.strict.length ? (r.strict.some(hasRupee) ? `₹${fmtCr(r.strictCr)} cr` : NO_AMOUNT) : 'none placed', `${r.strict.length} records`,
        ...(G1 ? [r.fetcher.length ? (r.fetcher.some(hasRupee) ? `₹${fmtCr(r.fetcherCr)} cr` : NO_AMOUNT) : 'none by that rule', r.fetcher.length ? basisSplit(r.fetcher) : 'not applicable'] : []),
        `${r.body.length} records`, `${r.researched.length} records`, r.strict.length ? `state government is the borrower or implements (${strictBranches(r.strict)})` : r.fetcher.length ? "fetcher's rule" : 'not placed', optionName(r, f)],
      out: [s.name, s.id, CLASS_WORDS[r.cls], r.strict.some(hasRupee) ? r.strictCr : '', r.strict.length, ...(G1 ? [r.fetcher.some(hasRupee) ? r.fetcherCr : '', basisSplit(r.fetcher)] : []), r.body.length, r.researched.length],
    };
  }), (() => {
    const strictN = [...rows.values()].reduce((a, r) => a + r.strict.length, 0);
    const fetcherN = [...rows.values()].reduce((a, r) => a + r.fetcher.length, 0);
    const notStrict = census.length - strictN - fetcherN;
    return {
      cells: ['Union body or not placed', 'not a place on this map', `₹${fmtCr(unplaced)} cr placed by neither rule`, `${notStrict} records`,
        ...(G1 ? [`₹${fmtCr(fetcherCr)} cr placed by the fetcher's rule is in its states' rows, not here`, `${fetcherN} records in state rows`] : []),
        'not applicable', 'not applicable', 'Union body, corporate borrower, or no state government named',
        `${notStrict} census records in view are placed in no state by either rule`],
      out: ['Union body or not placed', '', 'not a place on this map', unplaced, notStrict, ...(G1 ? ['', ''] : []), '', ''],
    };
  })()];
  const twinCols = [
    { key: 'state', label: 'State', th: true }, { key: 'class', label: 'Class' }, { key: 'cr', label: '₹ cr placed (strict)' }, { key: 'n', label: 'Census records placed' },
    ...(G1 ? [{ key: 'fcr', label: "₹ cr by fetcher's rule" }, { key: 'basis', label: 'Basis split' }] : []),
    { key: 'body', label: 'Body-registered records (not in fill)' }, { key: 'res', label: 'Researched records naming the state government' }, { key: 'rule', label: 'Rule' }, { key: 'detail', label: 'Detail' },
  ];
  const shownRows = empty || f.tiers.size === 0 ? [] : twinRows;

  return (
    <>
    <figure className="m-0 min-w-0" aria-labelledby={`${uid}-h`}>
      <h3 id={`${uid}-h`} className="text-[16px] font-semibold text-text mb-1">{MAP_H3}</h3>
      <SkipLinks twins={[{ twin: 'loan-map', title: MAP_H3 }]} />
      <p className="sr-only">{`₹ counted: ${CENSUS.filter(hasRupee).length} records · records placed: ${CENSUS.filter((e) => strictSt(e)).length} census · US$ m: ${CENSUS.filter((e) => LOAN_FACT(e)?.usdM != null).length} records`}</p>
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_13rem] items-start">
        <div className="min-w-0">
          <svg ref={mapRef} viewBox={VIEWBOX} style={{ height, width: '100%', display: 'block' }} role="listbox" aria-roledescription="map"
            aria-orientation="vertical" tabIndex={0} aria-label={`${MAP_H3}: ${ORDER.length} states and union territories, north to south`}
            aria-describedby={[captionIds.c1, captionIds.c2].filter(Boolean).join(' ')}
            aria-activedescendant={focused ? optId(focused.id) : undefined}
            onKeyDown={onKey} onFocus={() => { setHasFocus(true); if (idx < 0) setIdx(0); }} onBlur={() => setHasFocus(false)}
            className="outline-none focus-visible:ring-2 focus-visible:ring-accent/60 rounded">
            <defs>
              <TexturePatterns hatchId={`h-${uid}`} stippleId={`s-${uid}`} px={px} />
              <pattern id={`o-${uid}`} width={Math.max(4, 3.5 / px)} height={Math.max(4, 3.5 / px)} patternTransform="rotate(-45)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2={Math.max(4, 3.5 / px)} stroke="rgba(10,10,12,0.7)" strokeWidth={Math.max(0.9, 1 / px)} />
              </pattern>
            </defs>
            <g role="none">
              {ORDER.map((s, i) => {
                const r = rows.get(s.id)!;
                const isSel = f.st === s.id;
                return (
                  <g key={s.id} id={optId(s.id)} role="option" aria-selected={isSel} data-st={s.id} aria-label={optionName(r, f)}
                    aria-posinset={i + 1} aria-setsize={ORDER.length}
                    onClick={() => click(s.id)} onMouseEnter={() => setHover(s.id)} onMouseLeave={() => setHover(null)} style={{ cursor: 'pointer' }}>
                    <path aria-hidden="true" d={s.path} data-st={s.id} data-fill-class={empty ? 'hatch' : r.cls} data-no-amount={!empty && noValue(r) ? '' : undefined} fill={empty ? `url(#h-${uid})` : fillOf(r)}
                      stroke={!empty && noValue(r) ? 'rgb(185,201,200)' : 'rgba(10,10,12,0.85)'} strokeWidth={!empty && noValue(r) ? 1.2 / Math.max(px, 0.3) : 0.5} strokeLinejoin="round" />
                  </g>
                );
              })}
            </g>
            <g aria-hidden="true" pointerEvents="none">
              {!empty && ORDER.filter((s) => rows.get(s.id)?.cls === 'fetcher').map((s) => <path key={`ov-${s.id}`} d={s.path} fill={`url(#o-${uid})`} />)}
              {STATES.map((s) => <path key={`e-${s.id}`} d={s.path} fill="none" stroke="rgba(201,168,108,0.22)" strokeWidth="0.4" />)}
              {f.st && STATES.filter((s) => s.id === f.st).map((s) => <path key="sel" d={s.path} fill="none" stroke="var(--color-accent)" strokeWidth={1.8 / Math.max(px, 0.3)} />)}
              {focused && <circle cx={focused.cx} cy={focused.cy} r={Math.max(6, focused.clearance * 0.5)} fill="none" stroke="var(--color-accent)" strokeWidth="1.2" />}
            </g>
            {!narrow && (
              <g aria-hidden="true" pointerEvents="none" fontFamily="var(--font-sans)">
                {STATES.filter((s) => labelMode(s) !== 'leader').map((s) => (
                  <text key={`l-${s.id}`} x={s.cx} y={s.cy} textAnchor="middle" dominantBaseline="central" fontSize={labelMode(s) === 'full' ? Math.min(10 * k, Math.max(7, s.clearance / 3.6)) : 6.5 * k}
                    fill="rgb(236,236,236)" stroke="rgb(12,12,12)" strokeWidth="1.8" paintOrder="stroke">
                    {labelMode(s) === 'full' ? s.name.replace('Andaman and Nicobar Islands', 'Andaman & Nicobar') : s.id.toUpperCase()}
                  </text>
                ))}
              </g>
            )}
          </svg>
          <div className="min-h-[3.2em] font-mono text-[12px] text-text-secondary mt-1" aria-hidden={readRow ? undefined : 'true'}>
            {readRow && (
              <div>
                {readLines.map((l, i) => <p key={i}>{l}</p>)}
                <p>— open the state for the list</p>
                {narrow && armed && <button type="button" className="underline mt-1 text-[13px]" onClick={() => onSelect(armed, 'pointer')}>{`Open state`}</button>}
              </div>
            )}
          </div>
        </div>
        <div className="min-w-0 space-y-2">
          <UnionBar f={f} empty={empty} total={total} placed={placed} fetcherCr={fetcherCr} unplaced={unplaced} cc={cc} cnr={cnr} none={!census.length} filterText={filterText}
            onUnplaced={() => {
              const ids = new Set(census.filter((e) => !strictSt(e) && !fetcherSt(e)).map((e) => e.id ?? ''));
              setListFocus({ label: 'census records placed in no state by either rule', ids });
              announce(`the project list is narrowed to the ${ids.size} census records placed in no state by either rule`);
              requestAnimationFrame(() => document.getElementById('twin-project-list')?.scrollIntoView({ block: 'start' }));
            }} />
          {afterBar}
          <div className="flex flex-wrap items-center gap-1 text-[12px]">
        <Segmented param="m" value={f.m} onPick={(v) => patch({ m: v === 'cr' ? null : v })} options={[
          { v: 'cr', label: '₹ counted', note: `${CENSUS.filter(hasRupee).length} records` },
          { v: 'n', label: 'records placed', note: `${CENSUS.filter((e) => strictSt(e)).length} census` },
          { v: 'usd', label: 'US$ m', note: G1 ? `${CENSUS.filter((e) => LOAN_FACT(e)?.usdM != null).length} records` : undefined, disabled: G1 ? undefined : 'US$ figures are not exported in this build (G1)' },
        ]} />
        <Segmented param="scale" value={f.scale} onPick={(v) => patch({ scale: v === 'quantile' ? null : v })} options={[{ v: 'quantile', label: 'quantile bins' }, { v: 'log', label: 'log bins' }]} />
      </div>
          <ul className="list-none p-0 m-0 space-y-0.5 text-[12px] font-mono text-text-secondary" aria-label="Map key">
            {bins.slice(0, -1).map((lo, i) => (
              <li key={i} className="flex items-center gap-2">
                <svg width="16" height="12" aria-hidden="true"><rect width="16" height="12" fill={RAMP[Math.min(RAMP.length - 1, i)]} /></svg>
                <span>{`${unitOf(lo)} – ${unitOf(bins[i + 1])}${inView.has(i) ? '' : ' (none in view)'}`}</span>
              </li>
            ))}
            {G1 && <li className="flex items-center gap-2"><svg width="16" height="12" aria-hidden="true"><rect width="16" height="12" fill={RAMP[2]} /><rect width="16" height="12" fill={`url(#o-${uid})`} /></svg><span>placed by the fetcher&apos;s rule: state agency or title</span></li>}
            <li className="flex items-center gap-2"><svg width="16" height="12" aria-hidden="true" className="shrink-0"><rect x="0.6" y="0.6" width="14.8" height="10.8" fill="var(--color-bg)" stroke="rgb(185,201,200)" strokeWidth="1.2" /></svg><span>{`placed, but no record carries an amount in this measure: ${NO_AMOUNT} · ${[...rows.values()].filter(noValue).length} states in view`}</span></li>
            <li className="flex items-center gap-2"><TextureSwatch kind="stipple" /><span>a state body registered here; not in the fill</span></li>
            <li className="flex items-center gap-2"><TextureSwatch kind="hatch" /><span>no loan record names this state; never zero</span></li>
            <li className="text-text-muted">bins pooled over every placed census record, unfiltered</li>
          </ul>

          {sample && <p className="text-[12.5px] text-text-secondary">{`${labelOf(sample)} is not painted: the map fills from the World Bank census; its ${sampleN} records naming a state government are counted in the readout`}</p>}
        </div>
      </div>
      <Caption id={captionIds.c1} cap="C1" as="figcaption">
        {total > 0
          ? `₹${fmtCr(unplaced)} cr of ₹${fmtCr(total)} cr counted (${((100 * unplaced) / total).toFixed(1)}%) cannot be placed in a state government. That share is computed here. `
          : 'No census record with a ₹ amount is in view, so nothing counted is placed or unplaced. '}
        A loan is placed in a state only when the record names that state&apos;s government as borrower or implementer. Most World Bank lending to India is borrowed by the Union and spent through national programmes, so most of it cannot be placed. A state body&apos;s registered office is not where the money went, so bodies are stippled, not filled. Head offices of companies and the seats of Union bodies are never used. ₹ are at each loan&apos;s approval-year rate, as its record states, and are not adjusted for inflation: totals across decades mix rupees of very different value.
      </Caption>
      {afterCaption}
    </figure>
      {captionIds.c2 && FINANCE_SENSITIVITY && (
        <Caption id={captionIds.c2} cap="C2">
          {FINANCE_SENSITIVITY.num != null && FINANCE_SENSITIVITY.den != null
            ? `The research file's own rule, which also places by a state agency or a state named in the project title, attributes US$ ${fmtCr(FINANCE_SENSITIVITY.num)} m of US$ ${fmtCr(FINANCE_SENSITIVITY.den)} m to a state, across ${FINANCE_SENSITIVITY.apiRows}, pipeline included. `
            : "The research file's own rule also places by a state agency or a state named in the project title; its totals are not recorded as base-rate rows this page can read. "}
          {`This page's strict rule places ₹${fmtCr(placed)} cr of ₹${fmtCr(total)} cr across ${cc} census-counted records. ${G1 ? `The fetcher's rule places a further ₹${fmtCr(fetcherCr)} cr of the same ₹${fmtCr(total)} cr, shown as the overlaid texture. ` : ''}The two shares are on different populations and in different currencies, and are not directly comparable.`}
          {FINANCE_SENSITIVITY.incomeSentence && <> {FINANCE_SENSITIVITY.incomeSentence} (wording: worldbank-projects research file)</>}
        </Caption>
      )}
      <Twin twin="loan-map" title={MAP_H3} rowCount={shownRows.length} open={f.view === 'table'}>
        {() => (
          <ScrollBox label={`${MAP_H3} — table`}>
            <Exports name={MAP_H3} twin="loan-map" meta={{ table: MAP_H3, population: `${ORDER.length} states and union territories plus the Union row; census records in view`, lens: 'loans', filters: filterText, rows: shownRows.length, amounts: true }}
              header={['state', 'st', 'class', 'cr_strict', 'n_strict', ...(G1 ? ['cr_fetcher', 'basis'] : []), 'n_body', 'n_researched']} rows={() => shownRows.map((r) => r.out)} />
            <Table caption={captionLine(shownRows.length, `${ORDER.length} states and union territories north to south, then the Union row`, 'loans', filterText)}
              cols={twinCols} rows={shownRows.length ? shownRows : [{ cells: ['Nothing recorded yet.'], out: [] }]} className="min-w-[60rem]" />
          </ScrollBox>
        )}
      </Twin>
    </>
  );
}

function UnionBar({ f, empty, total, placed, fetcherCr, unplaced, cc, cnr, none, filterText, onUnplaced }: {
  f: Filters; empty: boolean; total: number; placed: number; fetcherCr: number; unplaced: number; cc: number; cnr: number; none: boolean; filterText: string; onUnplaced: () => void;
}) {
  const { patch } = usePage();
  if (empty) return <p className="text-[13px] text-text-secondary border border-border rounded p-2">Register not yet promoted — nothing below is zero</p>;
  const w = (v: number) => `${total > 0 ? Math.max(0, (100 * v) / total) : 0}%`;
  void f;
  return (
    <div className="text-[12.5px] text-text-secondary" data-union-bar="">
      <div className="flex h-3 gap-[2px] w-full" aria-hidden="true">
        <div style={{ width: w(placed), background: '#8aa1a4' }} />
        {G1 && <div style={{ width: w(fetcherCr), background: '#667f85', backgroundImage: 'repeating-linear-gradient(-45deg, rgba(10,10,12,0.7) 0 1px, transparent 1px 4px)' }} />}
        <div style={{ width: w(unplaced), background: '#3a3f44' }} />
      </div>
      <ul className="list-none p-0 m-0 mt-1 space-y-0.5">
        <li>{`placed in a state government ₹${fmtCr(placed)} cr`}</li>
        {G1 && <li>{`placed by the fetcher's rule ₹${fmtCr(fetcherCr)} cr`}</li>}
        <li><button type="button" onClick={onUnplaced} className="underline underline-offset-2 text-left">{`Union body or not placed ₹${fmtCr(unplaced)} cr`}</button> <span className="text-text-muted">— not a place on this map</span></li>
      </ul>
      <p className="font-mono text-[11.5px] text-text-muted mt-1">{`of ₹${fmtCr(total)} cr counted from ${cc} census records · ${cnr} census records carry no ₹ and are in no total · researched records are not on this bar`}</p>
      {none && (
        <p className="text-[13px] text-text-secondary mt-1">
          {`No census record matches ${filterText || 'these filters'}: the bar's segments are the empty filtered population, not a finding. `}
          <button type="button" className="underline" onClick={() => patch({ y: null, st: null, lender: null, tier: null, inc: null, tp: null })}>Reset the filters</button>
        </p>
      )}
    </div>
  );
}
