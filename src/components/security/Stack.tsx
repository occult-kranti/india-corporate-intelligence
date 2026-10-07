import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { SecurityFile } from '../../data/cppp';
import {
  type BudgetRow, type BudgetStage, type StackCol, type PoliceCol, FY_AXIS, EMPTY, BUDGETS, UNION_ROWS, defenceStack, latestFy, policeStack, policeDrawn, delhiLineAt,
  payBracketAt, agnipathTicks, agnipathLines, POLICE_PAY_TICKS, reconSummary, structureBreaks, fmtCr, fyStart, crContext, rowTier, BAND_WORD, MOD_ALL_DEMANDS, DEFAULT_STAGE, coveredFys,
  budgetPass, EMPTY_WORDS, NO_BUDGET_ROWS, NOTHING, type BandName, last, DEMAND_LEVEL, hostOf, COMP_WORD, prevFy, otherDocument, otherPayWords, pensionSpoken,
} from '../../data/securityView';
import { usePage, Caption, Twin, TwinTable, SkipLink, Exports, captionText, FOCUS, type Row, type Col } from './ui';
import { MovedFacts } from './Chrome';

/**
 * Budgets Q1 (§5.1.1): the Ministry of Defence's demands and the Police demand on one FY
 * axis and one ₹ scale. Each defence column stacks the demand-level rows of one
 * (fy, stage) and nothing else; pay, Agnipath, Delhi Police and police pay are brackets
 * and ticks inside a band, never added on top (F3). The published all-demands total is a
 * tick over the column, so the reader sees where the stack and the Summary disagree.
 *
 * The columns are HTML boxes rather than SVG groups so that a column's box is exactly
 * its slot: a tap lands on the column it names, and a label drawn above the latest
 * column cannot move its target.
 */

export const Q1 = 'Q1 — What does the Union budget for force, year by year, and how much is pensions and pay?';
// Bands are lightness steps of one neutral grey, never a family hue: a component is not an actor.
const BAND_FILL: Record<BandName, string> = { revenue: 'rgb(88, 88, 88)', capital: 'rgb(120, 120, 120)', civil: 'rgb(152, 152, 152)', pension: 'rgb(188, 188, 188)' };
const POLICE_FILL: Record<'revenue' | 'capital', string> = { revenue: BAND_FILL.revenue, capital: BAND_FILL.capital };

/** A round ceiling for the shared scale: 1, 2, 2.5 or 5 × 10^k. */
function niceMax(x: number) {
  if (x <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(x));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= x) return m * p;
  return 10 * p;
}
const fmtTick = (x: number) => x.toLocaleString('en-IN', { maximumFractionDigits: 0 });

export interface StackModel {
  stage: BudgetStage;
  cols: StackCol[];
  /** The Police demand per FY; null where no part of it is printed. */
  police: Map<string, PoliceCol | null>;
  max: number;
  latest: string | null;
}
export function stackModel(stage: BudgetStage): StackModel {
  const cols = defenceStack(stage);
  const police = new Map(policeStack(stage).map((p) => [p.fy, policeDrawn(p) ? p : null]));
  // The shared scale's ceiling: the tallest drawn column or tick, read from the derivations.
  let m = 0;
  for (const c of cols) { if (!c.missing) m = Math.max(m, c.sum); if (c.published) m = Math.max(m, c.published.cr); }
  for (const p of police.values()) if (p) m = Math.max(m, p.total?.cr ?? 0, p.sum ?? p.revenue?.cr ?? p.capital?.cr ?? 0);
  return { stage, cols, police, max: niceMax(m), latest: latestFy(stage) };
}
/** The pension share in an axis name: the derived words, with "percent" spelt out for a screen reader. */

/** The axis button's name (§5.1.1): its text, never an aria-label — no ₹ is named outside the ledger grid. */
export function axisName(m: StackModel, fy: string) {
  const c = m.cols.find((x) => x.fy === fy)!;
  if (c.missing) return `${fy}, no ${m.stage} rows recorded`;
  const recon = c.recon === 'equal' ? 'equals the published total' : c.recon === 'differs' ? `exceeds the published total by ₹${fmtCr(c.delta)} crore, computed here` : 'no published total';
  const p = m.police.get(fy);
  const police = p?.total ? `₹${fmtCr(p.total.cr)} crore` : p?.sum != null ? `₹${fmtCr(p.sum)} crore, computed here` : 'no row';
  // A partial column holds some demands, not the year: its sum is never read as the year's total.
  const demands = c.partial ? `${c.partial.k} of ${c.partial.n} demands recorded (partial, not the year's total)` : `${c.rows.length} demands`;
  return `${fy}, ${m.stage}: defence ₹${fmtCr(c.sum)} crore in ${demands}, computed here, pensions ${pensionSpoken(c)}, ${recon}; police ${police}`;
}

/** Q1's answer sentence (U10): the first text in the figure, every ₹ beside its basis and the previous year. */
export function answerSentence(m: StackModel) {
  const fy = m.latest;
  if (!fy) return null;
  const c = m.cols.find((x) => x.fy === fy)!;
  const pension = c.rows.find((r) => r.component === 'pension') ?? null;
  const prev = m.cols.filter((x) => !x.missing && x.fy < fy).pop();
  const prevPension = prev?.rows.find((r) => r.component === 'pension');
  const pubLast = [...m.cols].reverse().find((x) => x.published);
  const pay = payBracketAt(fy, m.stage).lines;
  const text = `FY${fy} ${m.stage}: ${c.pension != null ? `pensions ₹${fmtCr(c.pension)} cr, ${c.pensionWords}` : 'no pension row'}; defence ₹${fmtCr(c.sum)} cr across ${c.rows.length} demands, computed here; ${pay} pay lines inside revenue.`
    + (c.published ? '' : pubLast?.published ? ` Latest published all-demands total: ₹${fmtCr(pubLast.published.cr)} cr (FY${pubLast.fy}).` : '')
    + (prevPension ? ` Previous year: FY${prev!.fy} ${m.stage}: ₹${fmtCr(prevPension.cr)} cr in pensions.` : ' Previous year not applicable.');
  return { text, cr: pension?.cr ?? c.sum };
}

export function DemandStack({ fyCurrent, setFyCurrent, slice }: { fyCurrent: string | null; setFyCurrent: (fy: string) => void; slice: SecurityFile | null | undefined }) {
  const { f, narrow, openFy, inlinePanel, announce } = usePage();
  const m = useMemo(() => stackModel(f.stage), [f.stage]);
  const [armed, setArmed] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const btns = useRef<(HTMLButtonElement | null)[]>([]);
  const current = fyCurrent && FY_AXIS.includes(fyCurrent) ? fyCurrent : m.latest ?? FY_AXIS[FY_AXIS.length - 1] ?? null;
  // Desktop panels are short enough that the latest pension band sits in the first screen at 1280 × 800 (D58).
  const H = narrow ? Math.max(160, Math.min(220, (typeof window !== 'undefined' ? window.innerWidth : 390) * 0.5)) : 112;
  const headroom = narrow ? 64 : 26;
  const k = H / m.max;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * m.max);
  const inRange = (fy: string) => !f.fyFrom || (fy >= f.fyFrom && fy <= f.fyTo!);
  const seriesTierOn = f.tiers.has('documented') || f.tiers.has('reported');
  const hiddenRows = UNION_ROWS.filter((r) => !f.tiers.has(rowTier(r))).length;
  const breaks = structureBreaks(f.stage);
  const breakSet = new Set(breaks.map((b) => b.fy));
  const agniAt = useMemo(() => new Map(agnipathTicks(f.stage).map((t) => [t.fy, t.cr])), [f.stage]);
  const answer = answerSentence(m);
  const { equal: eq, checkable } = reconSummary(f.stage);
  const pstack = policeStack(f.stage);
  const chk = pstack.filter((p) => p.check !== 'incomplete');
  const eqPolice = chk.filter((p) => p.check === 'equal').length;
  const covered = coveredFys(f.stage).length;
  const titleId = 'sec-B1-h';

  // A page opened with an FY range says how many drawn columns fall inside it (U18).
  const announced = useRef(false);
  useEffect(() => {
    if (announced.current || !f.fyFrom || EMPTY) return;
    announced.current = true;
    const k = m.cols.filter((c) => !c.missing && inRange(c.fy)).length;
    announce(`${k} ${f.stage} columns in FY${f.fyFrom}–FY${f.fyTo}; the other years are dimmed, not removed`, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const choose = (fy: string, el: HTMLElement | null) => { setFyCurrent(fy); openFy(fy, el); };
  const tapColumn = (fy: string) => {
    // A coarse pointer's first tap reads the column; a second tap on the same column opens it (U5).
    if (narrow && armed !== fy) { setArmed(fy); setFyCurrent(fy); return; }
    setArmed(null);
    choose(fy, btns.current[FY_AXIS.indexOf(fy)]);
  };
  const onAxisKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    let n = -1;
    if (e.key === 'ArrowRight') n = Math.min(FY_AXIS.length - 1, i + 1);
    else if (e.key === 'ArrowLeft') n = Math.max(0, i - 1);
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = FY_AXIS.length - 1;
    if (n < 0) return;
    e.preventDefault();
    setFyCurrent(FY_AXIS[n]);
    btns.current[n]?.focus();
  };
  const readFy = hover ?? armed;
  const readCol = readFy ? m.cols.find((c) => c.fy === readFy) : null;

  const column = (c: StackCol, panel: 'defence' | 'police') => {
    const fy = c.fy;
    const dim = !inRange(fy);
    if (panel === 'police') {
      const p = m.police.get(fy);
      const state = !p ? 'hatched' : !seriesTierOn ? 'hidden' : 'full';
      const d = delhiLineAt(fy, f.stage);
      const pp = POLICE_PAY_TICKS.filter((r) => r.fy === fy && r.stage === f.stage);
      let y = 0;
      return (
        <div key={`p-${fy}`} data-column={fy} data-panel="police" data-column-state={state} className="relative flex-1 min-w-0" style={{ height: H, opacity: dim || state === 'hidden' ? 0.25 : 1 }}
          onClick={() => tapColumn(fy)} onMouseEnter={() => setHover(fy)} onMouseLeave={() => setHover(null)}>
          {!p && <div className="absolute inset-0 sec-hatch" />}
          {p && (['revenue', 'capital'] as const).map((comp) => {
            const r = p[comp];
            if (!r) return null;
            const h = r.cr * k;
            const el = <div key={comp} data-band={comp} data-cr={r.cr} className="absolute left-[1px] right-[1px] border-t border-bg" style={{ bottom: y, height: Math.max(1, h), background: POLICE_FILL[comp], fill: POLICE_FILL[comp], strokeDasharray: rowTier(r) === 'reported' ? '6 3' : undefined } as React.CSSProperties} />;
            y += h;
            return el;
          })}
          {d?.total && <div data-tick="delhi" className="absolute right-0 w-[3px] border-r-2 border-t-2 border-b-2 border-text" style={{ bottom: 0, height: Math.max(2, d.total.cr * k) }} />}
          {pp.map((r) => <div key={r.head} data-tick="police-pay" title={otherDocument(r) ? `${r.head}: ${otherPayWords(r, 'Police')}` : r.head} className="absolute left-0 right-0 h-0 border-t-2 border-dotted border-text-secondary" style={{ bottom: r.cr * k }} />)}
        </div>
      );
    }
    if (c.missing) {
      return (
        <div key={`d-${fy}`} data-column={fy} data-panel="defence" data-column-state="hatched" className="relative flex-1 min-w-0" style={{ height: H, opacity: dim ? 0.25 : 1 }}
          onClick={() => tapColumn(fy)} onMouseEnter={() => setHover(fy)} onMouseLeave={() => setHover(null)}>
          <div className="absolute inset-0 sec-hatch" />
        </div>
      );
    }
    let y = 0;
    const isLatest = fy === m.latest;
    const isChosen = fy === current && fy !== m.latest && !narrow ? false : false;
    const pay = payBracketAt(fy, f.stage);
    const agni = agniAt.get(fy) ?? 0;
    const pensionRow = c.rows.find((r) => r.component === 'pension');
    const prev = m.cols.filter((x) => !x.missing && x.fy < fy).pop();
    const prevPension = prev?.rows.find((r) => r.component === 'pension');
    const state = !seriesTierOn ? 'hidden' : c.partial ? 'partial' : 'full';
    return (
      <div key={`d-${fy}`} data-column={fy} data-panel="defence" data-column-state={state} className={`relative flex-1 min-w-0 ${breakSet.has(fy) ? 'border-l border-dotted border-text-muted' : ''}`}
        style={{ height: H, opacity: dim || state === 'hidden' ? 0.25 : 1 }} onClick={() => tapColumn(fy)} onMouseEnter={() => setHover(fy)} onMouseLeave={() => setHover(null)}>
        {c.bands.map(({ band, row }, i) => {
          const h = row.cr * k;
          const el = <div key={`${band}-${i}`} data-band={band} data-cr={row.cr} className="absolute left-[1px] right-[1px] border-t border-bg" style={{ bottom: y, height: Math.max(1, h), background: BAND_FILL[band], fill: BAND_FILL[band], strokeDasharray: rowTier(row) === 'reported' ? '6 3' : undefined } as React.CSSProperties} />;
          y += h;
          return el;
        })}
        {c.partial && <div className="absolute left-[1px] right-[1px] sec-hatch" style={{ bottom: y, top: 0 }} />}
        {c.partial && <span className="absolute left-0 whitespace-nowrap font-mono text-[11px] text-text-secondary bg-bg/80 px-0.5" style={{ bottom: Math.min(H - 14, y + 2) }}>{`partial: ${c.partial.k} of ${c.partial.n} demands`}</span>}
        {c.published && <div data-tick="published" className="absolute -left-[1px] -right-[1px] h-0 border-t-2 border-accent" style={{ bottom: c.published.cr * k }} />}
        {pay.cr != null && <div data-tick="pay" className="absolute right-0 w-[3px] border-r-2 border-t border-b border-text" style={{ bottom: 0, height: Math.max(2, pay.cr * k) }} />}
        {pay.other.map((r) => <div key={r.head} data-tick="other-pay" title={`${r.head}: another document's pay, not in the bracket`} className="absolute right-[5px] w-[6px] h-[6px] -mb-[3px] border border-text-secondary bg-bg" style={{ bottom: r.cr * k }} />)}
        {agni > 0 && <div data-tick="agnipath" className="absolute left-[2px] w-[60%] h-0 border-t-2 border-text" style={{ bottom: agni * k }} />}
        {(isLatest || isChosen) && pensionRow && (
          <span data-cr={pensionRow.cr} className={`absolute right-0 text-right font-mono text-[12px] leading-tight text-text ${narrow ? 'w-[15rem] whitespace-normal' : 'whitespace-nowrap'}`} style={{ bottom: H + 2 }}>
            {`pensions ₹${fmtCr(pensionRow.cr)} cr · ${c.pensionWords}`}
            <br />
            {prevPension ? `FY${prev!.fy} ${f.stage}: ₹${fmtCr(prevPension.cr)} cr` : `no ${f.stage} pension row for FY${prev?.fy ?? prevFy(fy)}`}
          </span>
        )}
      </div>
    );
  };

  const yAxis = (label: string) => (
    <svg aria-hidden="true" width={narrow ? 58 : 56} height={H + 2} className="shrink-0 overflow-visible" role="presentation">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={narrow ? 54 : 52} x2={narrow ? 58 : 56} y1={H - t * k + 1} y2={H - t * k + 1} stroke="var(--color-text-muted)" />
          <text x={narrow ? 52 : 50} y={H - t * k + 4} textAnchor="end" fontSize={narrow ? 12 : 11} fontFamily="var(--font-mono)" fill="var(--color-text-muted)">{fmtTick(t)}</text>
        </g>
      ))}
      <title>{label}</title>
    </svg>
  );

  const empty = EMPTY || !BUDGETS.length;
  const hidden = !seriesTierOn ? hiddenRows : 0;
  const denominator = empty ? null : [
    `${f.stage}, ₹ crore, nominal, as published`,
    `${covered} of ${FY_AXIS.length} FYs drawn`,
    `defence stack = demand totals, computed here; equal to the published total in ${eq} of ${checkable} FYs that print one`,
    `police stack = revenue + capital of the Police demand, checked in ${chk.length} of ${chk.length} FYs that print all three parts; equal in ${eqPolice}`,
    ...(breaks.length && narrow ? [`demand structure changes: ${breaks.map((b) => `FY${b.fy} from ${b.from} to ${b.to} revenue demands`).join('; ')}`] : []),
    ...(f.payer ? ['the Union stack is not affected by the payer filter'] : []),
    ...(f.compSet ? ['the stack shows every component; the filter applies to the ledger'] : []),
    ...(f.st ? ['Union demands are not placed by state'] : []),
    ...(hidden ? [`${hidden} rows hidden by filters`] : []),
  ].join(' · ');

  return (
    <>
      {!empty && <div className="sm:absolute sm:right-0 sm:top-0"><SkipLink twin="stack" title={Q1} /></div>}
      <figure className="m-0 min-w-0" aria-labelledby={titleId}>
        {empty ? (
          <>
            <p data-page-copy="" className="text-[14px] text-text">{EMPTY ? NOTHING : NO_BUDGET_ROWS}</p>
            <div className="border border-border rounded p-3 font-mono text-[12px] text-text-muted">{EMPTY ? `FY axis: ${EMPTY_WORDS}` : `FY axis: ${NO_BUDGET_ROWS}`}</div>
          </>
        ) : (
          <>
            {answer && <p id="sec-b1-answer" data-cr={answer.cr} className="text-[14px] sm:text-[13px] text-text m-0 mb-1 leading-snug">{answer.text}</p>}
            <div role="group" aria-labelledby={titleId} aria-describedby="sec-b1-answer sec-b1-den sec-c2" className="min-w-0">
              <div aria-hidden="true">
                <p className="font-mono text-[12px] text-text-muted m-0">Defence (the Ministry of Defence&apos;s demands)</p>
                <div className="flex items-end" style={{ paddingTop: headroom }}>
                  {yAxis('defence scale, ₹ crore')}
                  <div className="flex flex-1 min-w-0 gap-[2px] border-b border-border-light" style={{ marginRight: narrow ? 0 : 12 }}>{m.cols.map((c) => column(c, 'defence'))}</div>
                </div>
                {/* The reconciliation marks sit in their own row under the columns, so the FY filter dims the
                    drawing and never these words (A11Y-006 M6). One mark per defence column. */}
                <div className="flex" style={{ height: 16 }}>
                  <div style={{ width: narrow ? 58 : 56 }} className="shrink-0" />
                  <div className="flex flex-1 min-w-0 gap-[2px]" style={{ marginRight: narrow ? 0 : 12 }}>
                    {m.cols.map((c) => {
                      const g = c.missing ? 'none' : c.recon;
                      return <span key={c.fy} data-glyph={g} className="flex-1 min-w-0 text-center font-mono text-[10px] leading-4 text-text-muted">{g === 'equal' ? '=' : g === 'differs' ? '≠' : '·'}</span>;
                    })}
                  </div>
                </div>
                <p className="font-mono text-[12px] text-text-muted m-0">Police (the Home Ministry&apos;s Police demand), same scale</p>
                <div className="flex items-end">
                  {yAxis('police scale, ₹ crore')}
                  <div className="flex flex-1 min-w-0 gap-[2px] border-b border-border-light" style={{ marginRight: narrow ? 0 : 12 }}>{m.cols.map((c) => column(c, 'police'))}</div>
                </div>
              </div>
              <div className="flex">
                <div style={{ width: narrow ? 58 : 56 }} className="shrink-0" />
                <div className="relative flex flex-1 min-w-0 gap-[2px]" style={{ marginRight: narrow ? 0 : 12 }}>
                  {FY_AXIS.map((fy, i) => (
                    <button key={fy} ref={(el) => { btns.current[i] = el; }} type="button" title={axisName(m, fy)} tabIndex={fy === current ? 0 : -1}
                      aria-current={fy === current && fyCurrent ? 'true' : undefined}
                      onClick={(e) => choose(fy, e.currentTarget)} onKeyDown={(e) => onAxisKey(e, i)} onFocus={() => setFyCurrent(fy)}
                      className={`sec-abs flex-1 min-w-0 h-5 ${fy === current ? 'bg-accent/30' : ''} ${FOCUS}`} />
                  ))}
                </div>
              </div>
              <div data-axis="" aria-hidden="true" className="flex font-mono text-[11px] text-text-muted">
                <div style={{ width: narrow ? 58 : 56 }} className="shrink-0" />
                <div className="flex flex-1 min-w-0 gap-[2px]" style={{ marginRight: narrow ? 0 : 12 }}>
                  {FY_AXIS.map((fy, i) => {
                    const show = i === 0 || fy === m.latest || i === FY_AXIS.length - 1 || fy === current || (i % 4 === 0);
                    // The end labels lean inward so the axis never pushes past the figure's edge.
                    const lean = i === 0 ? 'justify-start' : i === FY_AXIS.length - 1 ? 'justify-end' : 'justify-center';
                    return <span key={fy} className={`relative flex ${lean} flex-1 min-w-0 overflow-visible whitespace-nowrap`} style={{ opacity: show ? 1 : 0, fontSize: narrow ? 12 : 11 }}><span className="sr-only left-0 top-0">{`${fy} `}</span>{show ? `’${fy.slice(2, 4)}` : ''}</span>;
                  })}
                </div>
              </div>
              {narrow && current && (
                <div className="flex items-center justify-between mt-1">
                  <button type="button" className={`min-h-[44px] min-w-[44px] px-2 underline ${FOCUS}`} onClick={() => { const i = Math.max(0, FY_AXIS.indexOf(current) - 1); setFyCurrent(FY_AXIS[i]); setArmed(FY_AXIS[i]); }}>‹ earlier</button>
                  <button type="button" className={`min-h-[44px] min-w-[44px] px-2 font-mono underline ${FOCUS}`} onClick={(e) => choose(current, e.currentTarget)}>{`FY${current}`}</button>
                  <button type="button" className={`min-h-[44px] min-w-[44px] px-2 underline ${FOCUS}`} onClick={() => { const i = Math.min(FY_AXIS.length - 1, FY_AXIS.indexOf(current) + 1); setFyCurrent(FY_AXIS[i]); setArmed(FY_AXIS[i]); }}>later ›</button>
                </div>
              )}
              <div className="min-h-[1.5em] font-mono text-[12px] text-text-secondary mt-1">
                {readCol && (readCol.missing
                  ? <span>{`FY${readCol.fy}: no ${f.stage} rows recorded — the column is hatched, not zero`}</span>
                  : <span data-cr={readCol.sum}>{`FY${readCol.fy} ${f.stage}: defence ₹${fmtCr(readCol.sum)} cr in ${readCol.rows.length} demands, computed here; pensions ${readCol.pensionWords}; ${(() => { const p = m.cols.filter((x) => !x.missing && x.fy < readCol.fy).pop(); return p ? `FY${p.fy} ${f.stage}: ₹${fmtCr(p.sum)} cr, computed here` : 'previous year not applicable'; })()} — ${narrow ? 'tap again to open' : 'choose the year to open'}`}</span>)}
              </div>
            </div>
            <figcaption id="sec-b1-den" data-page-copy="" className="font-mono text-[12px] sm:text-[11px] text-text-muted mt-1 leading-snug">{denominator}</figcaption>
            {narrow && <MovedFacts f={f} slice={slice} />}
          </>
        )}
      </figure>
      <Caption id="sec-c2" cap="C2">{c2Text()}</Caption>
      {inlinePanel('B1')}
      {!empty && <StackTwin m={m} />}
    </>
  );
}

function c2Text() {
  const { equal: eq, checkable, differ, maxPct } = reconSummary(DEFAULT_STAGE);
  const breaks = structureBreaks(DEFAULT_STAGE);
  const lastBreak = breaks.filter((b) => b.to === 1).pop() ?? last(breaks);
  const tierWord = UNION_ROWS.some((r) => rowTier(r) === 'reported') ? 'reported where its note says so, documented otherwise' : 'documented';
  return `Each defence column stacks the Ministry of Defence's demands for grants as Parliament votes them; before ${lastBreak ? `FY${lastBreak.fy}` : 'the first year drawn'} the services had revenue demands of their own, one band each. Pay is a line inside revenue, so it is drawn as a bracket, not added on top. A total the Summary prints for all demands is drawn as a tick across the column, and the mark beneath says whether the stack equals it: in ${eq} of ${checkable} such years it does${differ && maxPct != null ? `, and in the rest the stack exceeds it by under ${maxPct}%` : ''}. Missing years are hatched, not skipped; every Union row here is ${tierWord}. Amounts are nominal and not adjusted for inflation. The pension share is of the published total where one is printed, else of the stack, computed here; the label says which, and this page does not rate whether the share is high. Delhi Police is bracketed in the police panel, on the same scale, as the only city police force with its own budget line.`;
}

/** The stack twin (U11): one row per drawn band, two published-total rows per FY, one per hatched column, and the bracket rows. */
function StackTwin({ m }: { m: StackModel }) {
  const { f, filterWords } = usePage();
  const seriesOn = (r: BudgetRow) => f.tiers.has(rowTier(r));
  const anySeries = f.tiers.has('documented') || f.tiers.has('reported');
  const answer = answerSentence(m);
  const rows: Row[] = [];
  const out = (kind: string, fy: string, panel: string, component: string, head: string, cr: number | '', pub: number | '', sum: number | '', delta: string, tier: string, urls: string) =>
    [kind, fy, fyStart(fy), m.stage, panel, component, head, cr, pub, sum, delta, tier, urls];
  const src = (r: BudgetRow | null | undefined) => (r?.srcs.length ? r.srcs.map(([, u]) => u).join(' ') : 'no source in file');
  // The twin names each source by its host: a document title carries other years in its
  // words ("Expenditure Budget 2026-27" for a 2025-26 row), and a row here is read by its FY
  // cell alone. The full titles are in the ledger, the readout and the TSV.
  const srcCell = (r: BudgetRow | null | undefined) => (r?.srcs.length ? <ul className="list-none p-0 m-0">{[...new Set(r.srcs.map(([, u]) => u))].map((u, i) => <li key={i}><a href={u} target="_blank" rel="noopener noreferrer" className="underline break-words">{hostOf(u)}</a></li>)}</ul> : <span className="text-amber">no source in file</span>);
  // Per FY: each panel's published-total row first, then its bands, then the brackets, so a
  // reader scanning a year meets the total before the parts it is checked against.
  const headCell = (h: string) => (DEMAND_LEVEL.test(h) ? h : `line as printed: ${h}`);
  for (const c of m.cols) {
    const fy = c.fy;
    if (anySeries) {
      const pub = c.published;
      const sumWords = c.missing ? 'no stack' : c.partial ? 'partial, no sum printed' : `stack ₹${fmtCr(c.sum)} cr, computed here`;
      const recon = c.missing ? 'no stack to reconcile' : !pub ? 'no published all-demands total for this FY' : c.recon === 'equal' ? 'the stack equals the published total' : `the stack exceeds the published total by ₹${fmtCr(c.delta)} cr (${c.deltaPct}%), computed here`;
      rows.push({
        cells: ['published total', fy, m.stage, 'defence', 'total', pub ? MOD_ALL_DEMANDS : 'no published all-demands total for this FY', pub ? `₹${fmtCr(pub.cr)} cr — published; ${sumWords}` : sumWords, recon, pub ? rowTier(pub) : 'not applicable', pub ? srcCell(pub) : 'not applicable'],
        out: out('published total', fy, 'defence', 'total', pub ? MOD_ALL_DEMANDS : 'no published all-demands total for this FY', '', pub?.cr ?? '', c.missing || c.partial ? '' : c.sum, c.recon === 'differs' ? `stack exceeds published by ${c.delta}, computed here` : c.missing || c.partial ? recon : `${recon}; stack sum computed here`, pub ? rowTier(pub) : '', pub ? src(pub) : ''),
      });
    }
    if (c.missing) {
      if (anySeries) rows.push({ cells: ['hatched column', fy, m.stage, 'defence', 'no row', `no ${m.stage} rows recorded`, 'no row in this register', 'not applicable', 'not applicable', 'not applicable'], out: out('hatched', fy, 'defence', '', `no ${m.stage} rows recorded`, '', '', '', '', '', '') });
    } else {
      for (const { band, row, share: sh } of c.bands) {
        if (!seriesOn(row)) continue;
        const ctx = crContext(row);
        const share = sh != null ? `${sh}% ${c.basis}` : c.partial ? `${c.partial.k} of ${c.partial.n} demands recorded; no share computed` : 'not computed';
        rows.push({ cells: [`${band} (${BAND_WORD[band]})`, fy, m.stage, 'defence', COMP_WORD[row.component], headCell(row.head), `₹${fmtCr(row.cr)} cr — ${ctx.denom} · ${ctx.compare}`, share, rowTier(row), srcCell(row)], out: out('band', fy, 'defence', row.component, row.head, row.cr, '', '', '', rowTier(row), src(row)) });
      }
      if (anySeries) {
        const pb = payBracketAt(fy, m.stage);
        const pays = pb.rows;
        // Another document's pay row (Statement 22) is named beside the bracket, never inside it.
        const otherWords = pb.other.length ? `; not in the bracket, from another document with another definition of pay: ${pb.other.map((r) => r.head).join('; ')}` : '';
        if (pays.length) rows.push({ cells: [`pay lines (${pays.length})`, fy, m.stage, 'defence', 'pay', `lines as printed: ${pays.map((r) => r.head).join('; ')}`, `${pays.length} pay lines inside revenue; each is in the ledger and the year's readout${otherWords}`, 'a bracket, not added on top', 'documented', 'see the ledger'], out: out(`pay lines (${pays.length})`, fy, 'defence', 'pay', pays.map((r) => r.head).join('; '), '', '', '', otherWords.replace(/^; /, ''), 'documented', '') });
        const ag = agnipathLines(fy, m.stage);
        if (ag.length) rows.push({ cells: ['Agnipath lines', fy, m.stage, 'defence', 'other', `lines as printed: ${ag.map((r) => r.head).join('; ')}`, `${ag.length} lines inside revenue; Agnipath lines → contract card (Q5)`, 'a tick, not added on top', 'documented', 'see the ledger'], out: out('Agnipath lines', fy, 'defence', 'other', ag.map((r) => r.head).join('; '), '', '', '', '', 'documented', '') });
      }
    }
    const p = m.police.get(fy);
    if (anySeries) {
      const t = p?.total;
      const rc = p?.sum ?? null;
      // The check is policeStack's own (one tolerance, RECON_TOLERANCE): the graphic and this row read the same verdict.
      const words = p && p.check !== 'incomplete' ? `${p.check === 'equal' ? 'equals' : 'differs from'} revenue + capital, computed here (₹${fmtCr(p.sum!)} cr)` : 'not all three parts are printed';
      rows.push({
        cells: ['published total', fy, m.stage, 'police', 'total', t ? headCell(t.head) : 'no published Police demand total for this FY', t ? `₹${fmtCr(t.cr)} cr — published` : 'no row in this register', words, t ? rowTier(t) : 'not applicable', t ? srcCell(t) : 'not applicable'],
        out: out('published total', fy, 'police', 'total', t?.head ?? 'no published Police demand total for this FY', '', t?.cr ?? '', rc ?? '', p && p.check !== 'incomplete' ? `revenue + capital, computed here: ${p.check}` : '', t ? rowTier(t) : '', t ? src(t) : ''),
      });
    }
    if (!p) {
      if (anySeries) rows.push({ cells: ['hatched column', fy, m.stage, 'police', 'no row', `no ${m.stage} rows recorded`, 'no row in this register', 'not applicable', 'not applicable', 'not applicable'], out: out('hatched', fy, 'police', '', `no ${m.stage} rows recorded`, '', '', '', '', '', '') });
    } else {
      for (const comp of ['revenue', 'capital'] as const) {
        const r = p[comp];
        if (!r || !seriesOn(r)) continue;
        const ctx = crContext(r);
        const sh = p.shareOf(r);
        rows.push({ cells: [`${comp} (Police demand)`, fy, m.stage, 'police', COMP_WORD[comp], headCell(r.head), `₹${fmtCr(r.cr)} cr — ${ctx.denom} · ${ctx.compare}`, sh != null ? `${sh}% of stack, computed here` : 'not computed', rowTier(r), srcCell(r)], out: out('band', fy, 'police', comp, r.head, r.cr, '', '', '', rowTier(r), src(r)) });
      }
    }
    const d = delhiLineAt(fy, m.stage);
    if (d?.total && anySeries && p?.total && d.shareOfPolice != null) {
      const share = d.shareOfPolice;
      rows.push({ cells: ['Delhi Police (inside the Police demand)', fy, m.stage, 'police', 'total', headCell(d.total.head), `₹${fmtCr(d.total.cr)} cr — ${share}% of the Police demand, computed here`, 'a bracket, not added on top', rowTier(d.total), srcCell(d.total)], out: out('Delhi Police (inside the Police demand)', fy, 'police', 'total', d.total.head, d.total.cr, '', '', `${share}% of the Police demand, computed here`, rowTier(d.total), src(d.total)) });
    } else if (d?.total && anySeries) {
      rows.push({ cells: ['Delhi Police (inside the Police demand)', fy, m.stage, 'police', 'total', headCell(d.total.head), `₹${fmtCr(d.total.cr)} cr — no Police demand total for this FY`, 'a bracket, not added on top', rowTier(d.total), srcCell(d.total)], out: out('Delhi Police (inside the Police demand)', fy, 'police', 'total', d.total.head, d.total.cr, '', '', '', rowTier(d.total), src(d.total)) });
    }
    for (const r of POLICE_PAY_TICKS.filter((x) => x.fy === fy && x.stage === m.stage)) {
      if (!seriesOn(r)) continue;
      const ctx = crContext(r);
      const other = otherDocument(r) ? `; ${otherPayWords(r, 'Police')}` : '';
      rows.push({ cells: ['police pay', fy, m.stage, 'police', 'pay', headCell(r.head), `₹${fmtCr(r.cr)} cr — ${ctx.denom} · ${ctx.compare}`, `a tick at its year only${other}`, rowTier(r), srcCell(r)], out: out('police pay', fy, 'police', 'pay', r.head, r.cr, '', '', other.replace(/^; /, ''), rowTier(r), src(r)) });
    }
  }
  const cols: Col[] = [
    { key: 'kind', label: 'kind' }, { key: 'fy', label: 'FY' }, { key: 'stage', label: 'stage' }, { key: 'panel', label: 'panel' }, { key: 'component', label: 'component' },
    { key: 'head', label: 'demand head as printed' }, { key: 'cr', label: <>₹ <abbr title="crore">cr</abbr>, denominator and comparison</> }, { key: 'share', label: 'share or reconciliation' },
    { key: 'tier', label: 'tier' }, { key: 'src', label: 'sources' },
  ];
  const header = ['kind', 'fy', 'fy_start', 'stage', 'panel', 'component', 'head', 'cr', 'published_cr', 'stack_sum_cr', 'reconciliation', 'tier', 'source_urls'];
  return (
    <Twin twin="stack" title={Q1} rowCount={rows.length}>
      {() => (
        <>
          <Exports name="Union force demands by FY" twin="stack" meta={{ table: 'Union force demands by FY', population: `${FY_AXIS.length} FYs × two panels`, rows: rows.length, amounts: m.stage }} header={header} rows={() => rows.map((r) => r.out!)} />
          <TwinTable caption={answer?.text ?? captionText(rows.length, 'the stack', filterWords)} amounts={false} cols={cols} rows={rows.length ? rows : []} minWidth="70rem" />
        </>
      )}
    </Twin>
  );
}

export { BUDGETS, budgetPass };
