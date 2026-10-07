import { memo, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { GEdge } from '../../graph/schema';
import {
  type Lane, type BudgetRow, type BudgetStage, FY_AXIS, LANES, LANE_SOURCE, STAGES, EMPTY, BUDGETS, ROLE_WINDOWS, ROLE_EDGES, OFFICES, OPEN_ENDED_OFFICE, MOD, MHA,
  COMP_WORD, labelOf, fmtCr, rowTier, crContext, budgetPass, cellParam, parseCell, fyStart, ASOF, DELHI_POLICE, fileOf, partyText, NOTHING, NO_BUDGET_ROWS, EMPTY_WORDS, ZERO_WORDS,
  fyIn, DOMAIN,
} from '../../data/securityView';
import { Fold } from './Shared';
import { usePage, Caption, Twin, TwinTable, SkipLink, Exports, captionText, Pager, FOCUS, TARGET, Effect, Denominator, Src, Quote, type Row, type Col } from './ui';

export const Q2 = 'Q2 — Who held the Defence and Home portfolios on each date?';
export const Q3 = 'Q3 — How has each Union line moved, and which years are missing?';

// ---------------------------------------------------------------------------
// Q2 — OfficeLanes (§5.1.2), on the stack's FY grid
// ---------------------------------------------------------------------------

const T0 = FY_AXIS.length ? Date.parse(`${fyStart(FY_AXIS[0])}-04-01`) : 0;
const T1 = FY_AXIS.length ? Date.parse(`${fyStart(FY_AXIS[FY_AXIS.length - 1]) + 1}-04-01`) : 1;
const xPct = (d: string | null) => {
  if (!d) return 100;
  const iso = d.length === 4 ? `${d}-07-01` : d.length === 7 ? `${d}-15` : d;
  const t = Date.parse(iso);
  return Math.max(0, Math.min(100, ((t - T0) / (T1 - T0)) * 100));
};
const asOfIso = ASOF && /^\d{4}-\d{2}-\d{2}$/.test(ASOF) ? ASOF : null;

export function OfficeLanes() {
  const { f, narrow } = usePage();
  const titleId = 'sec-B2-h';
  if (EMPTY) return <p data-page-copy="" className="text-[14px]">{NOTHING}</p>;
  const offices = OFFICES;
  const officeRows = ROLE_EDGES.filter((e) => offices.includes(e.t));
  const windowsOf = (o: string) => ROLE_WINDOWS.filter((w) => w.t === o);
  const tierOf = (rs: GEdge[]) => (rs.some((r) => r.tier === 'alleged') ? 'alleged' : rs.some((r) => r.tier === 'reported') ? 'reported' : rs.some((r) => r.tier === 'analytic') ? 'analytic' : 'documented');
  const DASH: Record<string, string | undefined> = { documented: undefined, reported: '6 3', alleged: '2 4', analytic: '8 3 2 3' };
  return (
    <>
      <SkipLink twin="office" title={Q2} />
      <figure className="m-0 min-w-0" aria-labelledby={titleId} aria-describedby="sec-c3">
        <div aria-hidden="true" className="min-w-0">
          {offices.map((o) => (
            <div key={o} className="flex items-center gap-2 my-1">
              <span className="w-[56px] shrink-0 font-mono text-[12px] leading-tight text-text-muted break-words">{o === MOD ? 'Defence' : o === MHA ? 'Home' : labelOf(o).split(' ')[0]}</span>
              <div className="relative flex-1 h-4 border-b border-border">
                {windowsOf(o).map((w, i) => {
                  const a = xPct(w.from), b = xPct(w.to ?? asOfIso);
                  const t = tierOf(w.records);
                  const dim = !w.records.some((r) => f.tiers.has(r.tier));
                  return (
                    // The window's outline is drawn as an SVG rect with the tier's own dash (A11Y-006 m9):
                    // an HTML border has one dashed style, so reported, alleged and analytic would look alike.
                    <div key={i} data-mark="office" className={`absolute top-0.5 bottom-0.5 ${DASH[t] ? '' : 'border border-text-secondary'} ${w.to ? 'bg-text-muted/40' : 'bg-transparent'}`}
                      style={{ left: `${a}%`, width: `${Math.max(0.6, b - a)}%`, strokeDasharray: DASH[t], opacity: dim ? 0.25 : 1 } as React.CSSProperties}>
                      {DASH[t] && (
                        <svg className="absolute inset-0 w-full h-full overflow-visible" aria-hidden="true">
                          <rect x="0.5" y="0.5" width="100%" height="100%" fill="none" stroke="var(--color-text-secondary)" strokeWidth="1" strokeDasharray={DASH[t]} vectorEffect="non-scaling-stroke" style={{ width: 'calc(100% - 1px)', height: 'calc(100% - 1px)' }} />
                        </svg>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div data-axis="" className="flex gap-2">
            <span className="w-[56px] shrink-0" />
            <div className="flex flex-1 font-mono text-[12px] text-text-muted justify-between">
              <span>{FY_AXIS[0]}</span>
              <span>{FY_AXIS[FY_AXIS.length - 1]}</span>
            </div>
          </div>
        </div>
        <Fold on={narrow} summary={`The office holders, listed: ${ROLE_WINDOWS.length} windows in ${offices.length} offices`}>
        {offices.map((o) => (
          <div key={`l-${o}`} className="mt-2">
            <p className="font-mono text-[12px] text-text-muted m-0">{labelOf(o)}</p>
            {windowsOf(o).length ? (
              <ol className="list-none p-0 m-0 text-[13px] text-text-secondary">
                {windowsOf(o).map((w, i) => (
                  <li key={i}>{`${labelOf(w.s)} · ${w.from ?? 'start not recorded'} – ${w.to ?? 'end not recorded'} · ${tierOf(w.records)}${w.records.length > 1 ? ` · ×${w.records.length} records` : ''}`}</li>
                ))}
              </ol>
            ) : <p className="text-[13px] m-0">{`No dated office record in this register for ${labelOf(o)}.`}</p>}
          </div>
        ))}
        </Fold>
      </figure>
      <Caption id="sec-c3" cap="C3">{`A window is drawn where a dated role record exists; who held the Defence and Home portfolios on each date, from those records. A budget is presented in February for the year beginning in April and spent across it; the lanes show who was in office, not who decided a line. ${OPEN_ENDED_OFFICE} ${OPEN_ENDED_OFFICE === 1 ? 'window has' : 'windows have'} no recorded end and ${OPEN_ENDED_OFFICE === 1 ? 'is' : 'are'} drawn to the register date. Party is not drawn; where a role record states it, the table carries it as text.`}</Caption>
      <OfficeTwin rows={officeRows} />
    </>
  );
}

function OfficeTwin({ rows: edges }: { rows: GEdge[] }) {
  const { f, filterWords } = usePage();
  const shown = edges.filter((e) => f.tiers.has(e.tier));
  const winCount = (e: GEdge) => ROLE_WINDOWS.find((w) => w.records.includes(e))?.records.length ?? 1;
  const rows: Row[] = shown.map((e) => ({
    cells: [labelOf(e.t), labelOf(e.s), e.from ?? 'not recorded', e.to ?? 'end not recorded', e.tier,
      `${fileOf(e)}${winCount(e) > 1 ? ` (window ×${winCount(e)} records)` : ''}`, <span data-quoted="">{partyText(e) ?? 'not recorded'}</span>, <Src srcs={e.srcs} of={e.lab ?? e.id ?? 'role'} />],
    out: [labelOf(e.t), labelOf(e.s), e.from ?? '', e.to ?? '', e.tier, fileOf(e), partyText(e) ?? '', (e.srcs ?? []).map(([, u]) => u).join(' ')],
  }));
  const cols: Col[] = [{ key: 'office', label: 'office', th: true }, { key: 'person', label: 'person' }, { key: 'from', label: 'from' }, { key: 'to', label: 'to' }, { key: 'tier', label: 'tier' }, { key: 'files', label: 'files' }, { key: 'party', label: 'party as recorded in the role claim' }, { key: 'src', label: 'sources' }];
  return (
    <Twin twin="office" title={Q2} rowCount={rows.length}>
      {() => (
        <>
          <Exports name="Office windows" twin="office" meta={{ table: 'Office windows', population: `${edges.length} role records`, rows: rows.length }} header={['office', 'person', 'from', 'to', 'tier', 'file', 'party_as_recorded', 'source_urls']} rows={() => rows.map((r) => r.out!)} />
          <TwinTable caption={captionText(rows.length, 'role records into the offices drawn', filterWords)} amounts={false} cols={cols} rows={rows} />
        </>
      )}
    </Twin>
  );
}

// ---------------------------------------------------------------------------
// Q3 — LineLedger (§5.1.3): periods as columns, three stage slots, a lane scale per row
// ---------------------------------------------------------------------------

type SlotState = 'row' | 'two' | 'zero' | 'hatch' | 'hidden';
interface Slot { stage: BudgetStage; state: SlotState; rows: BudgetRow[]; hidden: number; why: string | null }

function slotsOf(lane: Lane, fy: string, visible: (r: BudgetRow) => boolean, why: (r: BudgetRow) => string): Slot[] {
  const cell = lane.cells.get(fy);
  return STAGES.map((stage) => {
    const all = cell?.[stage] ?? [];
    const vis = all.filter(visible);
    if (!all.length) return { stage, state: 'hatch', rows: [], hidden: 0, why: null };
    if (!vis.length) return { stage, state: 'hidden', rows: [], hidden: all.length, why: why(all[0]) };
    return { stage, state: vis.length >= 2 ? 'two' : vis[0].cr === 0 ? 'zero' : 'row', rows: vis, hidden: all.length - vis.length, why: null };
  });
}
// A slot a filter hides holds rows: its name says so, never "no row" (A11Y-006 S4; the key's "hidden by filter … not absent").
const slotWord = (s: Slot) => (s.state === 'hatch' ? 'no row' : s.state === 'hidden' ? `${s.hidden} ${s.hidden === 1 ? 'row' : 'rows'} hidden by the ${s.why} filter — not absent` : `₹${fmtCr(s.rows[0].cr)} crore`);
export function cellName(lane: Lane, fy: string, slots: Slot[]) {
  return `${labelOf(lane.body)} — ${lane.component} — ${lane.line}, FY${fy}: ${slots.map((s) => `${s.stage} ${slotWord(s)}`).join(', ')} — open for its share of the demand and the previous year`;
}

interface LaneRowProps {
  sig: string; l: Lane; li: number; slots: Slot[][]; acc: boolean; selFy: string; tabFy: number; narrow: boolean; stagesShown: BudgetStage[]; fyFrom: string | null; fyTo: string | null;
  h: { current: { open: (li: number, fi: number, el: HTMLElement) => void; key: (e: KeyboardEvent<HTMLButtonElement>, li: number, fi: number) => void; focus: (li: number, fi: number) => void } };
}
/**
 * One ledger lane. Memoised on a signature of everything it draws from (the series tiers,
 * payer, FY range, stage set, accent, selection and roving stop), so a filter that cannot
 * change a lane — a tier the series never carries, a stage on the desktop ledger — leaves
 * its 28 cells untouched instead of re-rendering 127 × 28 of them.
 */
const LaneRow = memo(function LaneRow({ l, li, slots, acc, selFy, tabFy, narrow, stagesShown, fyFrom, fyTo, h }: LaneRowProps) {
  const maxCtx = crContext(l.maxRow);
  return (
    <tr className={acc ? 'bg-accent/[0.06]' : ''}>
      <th scope="row" data-lane={l.key} data-lane-group={l.group} aria-current={acc ? 'true' : undefined} tabIndex={-1}
        className={`sec-ledger-label text-left font-normal align-top pr-2 py-0.5 border-b border-border text-[12px] leading-tight ${acc ? 'border-l-2 border-l-accent pl-1' : ''} ${narrow ? 'sticky left-0 bg-bg z-[1] w-[120px] min-w-[120px] max-w-[120px]' : 'min-w-[14rem] max-w-[18rem]'} ${TARGET}`}>
        <span className="text-text">{l.component}</span>{' — '}<span>{l.line}</span>
        <span className="block font-mono text-[12px] text-text-muted">{`FY${l.fyFirst}–FY${l.fyLast} · ${l.cover.BE}/${l.cover.RE}/${l.cover.actual} of ${FY_AXIS.length} FYs`}</span>
        {acc && <span className="sr-only"> selected body</span>}
      </th>
      {FY_AXIS.map((fy, fi) => {
        const ss = slots[fi];
        const isSel = selFy === fy;
        const dim = !!fyFrom && !(fy >= fyFrom && fy <= fyTo!);
        return (
          <td key={fy} className={`relative p-0 border-b border-border ${narrow ? 'w-[14px] min-w-[14px]' : 'w-[26px] min-w-[26px]'}`} style={{ opacity: dim ? 0.2 : 1 }}>
            <span aria-hidden="true" className="flex items-end gap-px h-6 px-px">
              <span className="sr-only">{`FY${fy}`}</span>
              {ss.filter((s) => stagesShown.includes(s.stage)).map((s) => {
                const rep = s.rows.some((r) => rowTier(r) === 'reported');
                const lbl = s.state === 'hatch' ? `${s.stage}: no row in this register` : s.state === 'hidden' ? `${s.stage}: ${s.hidden} ${s.hidden === 1 ? 'row' : 'rows'} hidden by the ${s.why} filter — not absent`
                  : s.state === 'zero' ? `${s.stage}: ${ZERO_WORDS}` : `${s.stage}: ${s.rows.map((r) => `₹${fmtCr(r.cr)} crore`).join(' and ')}${rep ? ' (reported)' : ''}`;
                return (
                  <span key={s.stage} data-slot={s.stage} data-slot-state={s.state} aria-label={lbl}
                    className={`relative flex-1 h-full flex items-end gap-px ${s.state === 'hatch' ? 'sec-hatch' : s.state === 'zero' ? 'sec-zero' : s.state === 'hidden' ? 'sec-hidden-slot' : ''}`}
                    style={rep ? { strokeDasharray: '6 3', outline: '1px dashed var(--color-text-muted)' } as React.CSSProperties : undefined}>
                    {(s.state === 'row' || s.state === 'two') && s.rows.map((r, i) => (
                      <span key={i} className="flex-1 bg-text-secondary" style={{ height: `${Math.max(4, (r.cr / (l.max || 1)) * 100)}%` }} />
                    ))}
                  </span>
                );
              })}
            </span>
            <button type="button" data-cell={`${li}-${fi}`} tabIndex={tabFy === fi ? 0 : -1} aria-label={cellName(l, fy, ss)} aria-current={isSel ? 'true' : undefined}
              onClick={(e) => h.current.open(li, fi, e.currentTarget)} onKeyDown={(e) => h.current.key(e, li, fi)} onFocus={() => h.current.focus(li, fi)}
              className={`sec-abs absolute inset-0 w-full h-full ${narrow ? 'scroll-ml-[124px]' : ''} ${isSel ? 'outline outline-2 outline-accent' : ''} ${FOCUS}`} />
          </td>
        );
      })}
      <td className="px-2 border-b border-border align-top whitespace-nowrap">
        <span data-cr={l.max} className="font-mono text-[12px] text-text-muted">
          {`lane max ₹${fmtCr(l.max)} cr`}
          <span className="sr-only">{` (${l.maxRow.stage}, FY${l.maxRow.fy}; ${maxCtx.denom} · ${maxCtx.compare})`}</span>
        </span>
      </td>
    </tr>
  );
}, (a, b) => a.sig === b.sig);

export function LineLedger() {
  const { f, narrow, openCell, openBody, patch, inlinePanel } = usePage();
  const empty = EMPTY || !BUDGETS.length;
  // Memoised on the filters a budget row reads, so a page press (`tp`), Table view or a panel
  // does not rebuild 127 × 28 slots or the 3,556 coverage rows.
  const bsig = budgetSig(f);
  const visible = useCallback((r: BudgetRow) => budgetPass(f, r, { comp: false }), [bsig]); // eslint-disable-line react-hooks/exhaustive-deps
  const why = useCallback((r: BudgetRow) => (!f.tiers.has(rowTier(r)) ? 'tier' : f.payer === 'states' ? 'payer' : 'tier'), [bsig]); // eslint-disable-line react-hooks/exhaustive-deps
  const lanes = useMemo(() => LANES.filter((l) => f.comp.has(l.component)), [f.comp]);
  const accent = (l: Lane) => (f.body ? l.body === f.body : f.st === 'dl' ? l.body === DELHI_POLICE : f.st === 'jk' ? l.body === 'force:jk-police' : false);
  const sel = f.cell ? parseCell(f.cell) : null;
  const [pos, setPos] = useState<{ lane: number; fy: number }>(() => (sel ? { lane: Math.max(0, lanes.indexOf(sel.lane)), fy: FY_AXIS.indexOf(sel.fy) } : { lane: 0, fy: 0 }));
  useEffect(() => { if (sel) setPos({ lane: Math.max(0, lanes.indexOf(sel.lane)), fy: Math.max(0, FY_AXIS.indexOf(sel.fy)) }); }, [f.cell]); // eslint-disable-line react-hooks/exhaustive-deps
  // The cell is looked up from the figure, not one table: below 640px the ledger is one table per
  // group, each behind its own summary, with one roving stop across them all. A cell in a closed
  // group opens its group (and the bodies' summary) before it takes focus (A11Y-006 S1).
  const figureRef = useRef<HTMLElement>(null);
  const focusCell = (li: number, fi: number) => {
    setPos({ lane: li, fy: fi });
    requestAnimationFrame(() => {
      const b = figureRef.current?.querySelector<HTMLButtonElement>(`button[data-cell="${li}-${fi}"]`);
      if (!b) return;
      let opened = false;
      for (let d = b.closest('details'); d; d = d.parentElement?.closest('details') ?? null) if (!d.open) { d.open = true; opened = true; }
      if (opened) requestAnimationFrame(() => b.focus());
      else b.focus();
    });
  };
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, li: number, fi: number) => {
    let n: [number, number] | null = null;
    if (e.key === 'ArrowRight') n = [li, Math.min(FY_AXIS.length - 1, fi + 1)];
    else if (e.key === 'ArrowLeft') n = [li, Math.max(0, fi - 1)];
    else if (e.key === 'ArrowDown') n = [Math.min(lanes.length - 1, li + 1), fi];
    else if (e.key === 'ArrowUp') n = [Math.max(0, li - 1), fi];
    else if (e.key === 'Home') n = [li, 0];
    else if (e.key === 'End') n = [li, FY_AXIS.length - 1];
    if (!n) return;
    e.preventDefault();
    focusCell(n[0], n[1]);
  };
  const stagesShown: BudgetStage[] = narrow ? [f.stage] : STAGES;
  let drawn = 0, hatched = 0;
  const laneSlots = useMemo(() => lanes.map((l) => FY_AXIS.map((fy) => slotsOf(l, fy, visible, why))), [lanes, visible, why]);
  for (const ls of laneSlots) for (const ss of ls) for (const s of ss) if (stagesShown.includes(s.stage)) { if (s.state === 'hatch') hatched++; else drawn++; }
  const kRows = LANE_SOURCE.filter((r) => budgetPass(f, r)).length;
  const groups: { key: string; title: string; group: Lane['group']; body: string | null; lanes: number[] }[] = [];
  lanes.forEach((l, i) => {
    const gk = l.group === 'body' ? `b:${l.body}` : l.group;
    let g = groups.find((x) => x.key === gk);
    if (!g) { g = { key: gk, title: l.group === 'published' ? 'Published totals — as the document publishes it' : l.group === 'city' ? 'Delhi Police — the one city line' : labelOf(l.body), group: l.group, body: l.group === 'published' ? null : l.body, lanes: [] }; groups.push(g); }
    g.lanes.push(i);
  });
  const hiddenRows = LANE_SOURCE.filter((r) => !visible(r)).length;
  const stageWords = narrow ? `${f.stage} slots, one stage at a time (BE by default: the stage with rows in the greatest number of years)` : 'three slots in each FY: BE · RE · actual, left to right';

  // The handlers live in a ref so a memoised row always calls the current ones.
  const handlers = useRef({ open: (_li: number, _fi: number, _el: HTMLElement) => {}, key: (_e: KeyboardEvent<HTMLButtonElement>, _li: number, _fi: number) => {}, focus: (_li: number, _fi: number) => {} });
  handlers.current = {
    open: (li, fi, el) => { setPos({ lane: li, fy: fi }); openCell(cellParam(lanes[li], FY_AXIS[fi]), el); },
    key: onKey,
    focus: (li, fi) => setPos({ lane: li, fy: fi }),
  };
  const seriesKey = ['documented', 'reported'].filter((t) => f.tiers.has(t as 'documented')).join(',');
  const laneRow = (li: number) => {
    const l = lanes[li];
    const acc = accent(l);
    const selFy = sel && sel.lane === l ? sel.fy : '';
    const tabFy = pos.lane === li ? pos.fy : -1;
    const sig = `${seriesKey}|${f.payer}|${f.fyFrom}|${f.fyTo}|${narrow}|${stagesShown.join()}|${acc}|${selFy}|${tabFy}|${li}|${lanes.length}`;
    return <LaneRow key={l.key} sig={sig} l={l} li={li} slots={laneSlots[li]} acc={acc} selFy={selFy} tabFy={tabFy} narrow={narrow} stagesShown={stagesShown} fyFrom={f.fyFrom} fyTo={f.fyTo} h={handlers} />;
  };

  const head = (
    <thead>
      <tr>
        <th scope="col" className={`text-left font-mono text-[12px] text-text-muted pb-1 ${narrow ? 'sticky left-0 bg-bg z-[1] w-[120px] min-w-[120px]' : ''}`}>line</th>
        {FY_AXIS.map((fy, i) => (
          <th key={fy} scope="col" className={`font-mono text-[12px] font-normal pb-1 align-bottom ${f.fyFrom && fyIn(f, fy) ? 'text-text border-b-2 border-accent' : 'text-text-muted'}`}>
            <span className={i % (narrow ? 4 : 2) === 0 || i === FY_AXIS.length - 1 ? '' : 'sr-only'}>{`’${fy.slice(2, 4)}`}</span><span className="sr-only">{` ${fy}`}</span>
          </th>
        ))}
        <th scope="col" className="font-mono text-[12px] text-text-muted font-normal pb-1 text-left">lane max</th>
      </tr>
    </thead>
  );
  const groupRow = (g: (typeof groups)[number]) => (
    <tr key={`g-${g.key}`}>
      <td colSpan={FY_AXIS.length + 2} className="pt-3 pb-1">
        <h4 className="text-[13.5px] font-semibold text-text m-0">
          {g.body ? <button type="button" tabIndex={-1} className={`underline underline-offset-2 hover:text-accent ${FOCUS}`} onClick={(e) => openBody(g.body!, e.currentTarget)}>{g.title}</button> : g.title}
        </h4>
      </td>
    </tr>
  );
  const capId = 'sec-c4';
  const table = (rowsEl: ReactNode, key: string) => (
    <div key={key} className="relative overflow-x-auto min-w-0 sec-ledger-scroll">
      <table role="grid" aria-labelledby="sec-B3-h" aria-describedby={`${capId}${f.fyFrom ? ' sec-c4b' : ''}`} aria-rowcount={lanes.length + groups.length + 1} aria-colcount={FY_AXIS.length + 2} className="border-collapse">
        <caption className="sr-only">{`The ledger: ${lanes.length} lanes by ${FY_AXIS.length} FYs; amounts in ₹ `}<abbr title="crore">cr</abbr></caption>
        {head}
        <tbody>{rowsEl}</tbody>
      </table>
    </div>
  );

  const scroll = (d: number) => {
    for (const el of document.querySelectorAll<HTMLElement>('[data-q="B3"] .sec-ledger-scroll')) el.scrollBy({ left: d * 14 * 6 });
    setTimeout(updateShowing, 50);
  };
  const [showing, setShowing] = useState<[string, string]>([FY_AXIS[0] ?? '', FY_AXIS[FY_AXIS.length - 1] ?? '']);
  const updateShowing = () => {
    const el = document.querySelector<HTMLElement>('[data-q="B3"] .sec-ledger-scroll');
    if (!el || !FY_AXIS.length) return;
    const colW = 14;
    const first = Math.max(0, Math.floor(el.scrollLeft / colW));
    const visible = Math.max(1, Math.floor((el.clientWidth - 120) / colW));
    setShowing([FY_AXIS[Math.min(FY_AXIS.length - 1, first)], FY_AXIS[Math.min(FY_AXIS.length - 1, first + visible - 1)]]);
  };
  useEffect(() => { if (narrow) updateShowing(); }, [narrow]);

  const groupDetails = (g: (typeof groups)[number]) => (
    <details key={g.key} open={g.group === 'published' || (!!f.body && g.body === f.body)}>
      <summary className={`min-h-[44px] flex items-center text-[13px] ${FOCUS}`}>{`${g.title} · ${g.lanes.length} lanes · BE ${coverOf(g.lanes.map((i) => lanes[i]), 'BE')} RE ${coverOf(g.lanes.map((i) => lanes[i]), 'RE')} actual ${coverOf(g.lanes.map((i) => lanes[i]), 'actual')} of ${FY_AXIS.length} FYs`}</summary>
      {table(g.lanes.map(laneRow), g.key)}
    </details>
  );
  return (
    <>
      {empty ? (
        <>
          <p data-page-copy="" className="text-[14px] text-text">{EMPTY ? NOTHING : NO_BUDGET_ROWS}</p>
          <p className="font-mono text-[12px] text-text-muted">{EMPTY ? EMPTY_WORDS : 'no lanes: the budget series is empty in this build'}</p>
        </>
      ) : (
        <>
          <p className="text-[13px] text-text-secondary my-1"><Effect n={LANE_SOURCE.length} k={kRows} tail="ledger rows" /></p>
          {f.compSet && <p data-page-copy="" className="text-[13px] text-text-secondary m-0">{`${lanes.length} of ${LANES.length} lanes under the component filter`}</p>}
          <Denominator>{`${lanes.length} lanes · ${drawn} slots drawn, ${hatched} hatched · ${stageWords}${hiddenRows ? ` · ${hiddenRows} rows hidden by filters` : ''}`}</Denominator>
          <SkipLink twin="ledger-long" title={Q3} />
          {/* Under view=table the drawing is hidden and its twins carry every row, so the grid is not built at all. */}
          <figure ref={figureRef} className="m-0 min-w-0" aria-labelledby="sec-B3-h">
            {f.view === 'table' ? null : narrow ? (
              <div role="region" aria-labelledby={capId} className="min-w-0">
                <div className="flex items-center justify-between">
                  <button type="button" className={`min-h-[44px] min-w-[44px] px-2 underline ${FOCUS}`} onClick={() => scroll(-1)}>‹ earlier</button>
                  <span className="font-mono text-[12px] text-text-muted">{`showing FY${showing[0]}–FY${showing[1]}`}</span>
                  <button type="button" className={`min-h-[44px] min-w-[44px] px-2 underline ${FOCUS}`} onClick={() => scroll(1)}>later ›</button>
                </div>
                {/* Below 640px the body groups sit behind one summary as well, so the ledger keeps
                    the page within its length budget; a body chosen by URL or Find opens both. */}
                {groups.filter((g) => g.group === 'published').map(groupDetails)}
                <details open={!!f.body}>
                  <summary className={`min-h-[44px] flex items-center text-[13px] ${FOCUS}`}>{`${groups.filter((g) => g.group !== 'published').length} bodies and Delhi Police, each behind its own summary`}</summary>
                  {groups.filter((g) => g.group !== 'published').map(groupDetails)}
                </details>
              </div>
            ) : (
              table(groups.flatMap((g) => [groupRow(g), ...g.lanes.map(laneRow)]), 'all')
            )}
          </figure>
        </>
      )}
      <Caption id={capId} cap="C4">{`Each row is one line as the demand document prints it, under the body it funds. Inside each year, three slots: Budget Estimate, Revised Estimate, Actual. A hatched slot has no row in this register; it is not zero. Each row has its own scale, printed at its right, so rows show movement and gaps, not size against each other; a line's share of its demand is in its cell. A demand and the lines inside it are separate rows and are never added together here. Union actuals in this register begin in FY${firstActual()}. Amounts are ₹ crore as published, not adjusted for inflation.`}</Caption>
      {f.fyFrom && <Caption id="sec-c4b" cap="C4b">{`Columns outside FY${f.fyFrom}–FY${f.fyTo} are dimmed, not removed.`}</Caption>}
      {inlinePanel('B3')}
      {!empty && <LedgerTwins lanes={lanes} bsig={bsig} visible={visible} why={why} onPage={(tp) => patch({ tp: tp <= 1 ? null : String(tp) })} />}
    </>
  );
}
const coverOf = (ls: Lane[], s: BudgetStage) => new Set(ls.flatMap((l) => l.rows.filter((r) => r.stage === s).map((r) => r.fy))).size;
function firstActual() { return [...new Set(LANE_SOURCE.filter((r) => r.stage === 'actual').map((r) => r.fy))].sort()[0] ?? 'none'; }

const PAGE = 400;
const covCols: Col[] = [{ key: 'lane', label: 'Lane', th: true }, { key: 'fy', label: 'FY' }, { key: 'be', label: <><abbr title="Budget Estimate">BE</abbr> ₹ <abbr title="crore">cr</abbr></> }, { key: 're', label: <><abbr title="Revised Estimate">RE</abbr> ₹ cr</> }, { key: 'ac', label: 'actual ₹ cr' }];
/** The filters a budget row reads (`budgetPass`): payer, state, FY range, component, tier. */
const budgetSig = (f: { payer: string | null; st: string | null; fyFrom: string | null; fyTo: string | null; comp: Set<string>; tiers: Set<string> }) =>
  `${f.payer}|${f.st}|${f.fyFrom}|${f.fyTo}|${[...f.comp].sort().join(',')}|${[...f.tiers].sort().join(',')}`;
function LedgerTwins({ lanes, bsig, visible, why, onPage }: { lanes: Lane[]; bsig: string; visible: (r: BudgetRow) => boolean; why: (r: BudgetRow) => string; onPage: (tp: number) => void }) {
  const { f, filterWords } = usePage();
  const all = useMemo(() => {
    const laneSet = new Set(lanes.map((l) => l.key));
    return LANE_SOURCE.filter((r) => budgetPass(f, r) && laneSet.has(laneKeyOf(r)));
  }, [lanes, bsig]); // eslint-disable-line react-hooks/exhaustive-deps
  const pages = Math.max(1, Math.ceil(all.length / PAGE));
  const page = Math.min(f.tp, pages);
  const slice = all.slice((page - 1) * PAGE, page * PAGE);
  const longCols: Col[] = [
    { key: 'payer', label: 'Payer' }, { key: 'body', label: 'Body', th: true }, { key: 'title', label: 'Demand title' }, { key: 'line', label: 'Line as printed' }, { key: 'comp', label: 'Component' },
    { key: 'fy', label: 'FY' }, { key: 'stage', label: 'Stage' }, { key: 'cr', label: <>₹ <abbr title="crore">cr</abbr></> }, { key: 'tier', label: 'Tier' }, { key: 'note', label: 'Note' },
    { key: 'src', label: 'Sources' }, { key: 'den', label: 'Denominator' }, { key: 'cmp', label: 'Comparison' },
  ];
  const longRow = (r: BudgetRow): Row => {
    const c = crContext(r);
    return {
      cells: [r.payer === 'union' ? 'Union' : r.payer, labelOf(r.body), r.head.replace(/:.*$/, ''), r.head, COMP_WORD[r.component], r.fy, r.stage, r.cr === 0 ? ZERO_WORDS : `₹${fmtCr(r.cr)}`, rowTier(r),
        <Quote>{r.note ?? 'no note'}</Quote>, <Src srcs={r.srcs} of={r.head} inline />, c.denom, c.compare],
      out: [r.payer, r.body, r.component, r.head, r.fy, fyStart(r.fy), r.stage, r.cr, rowTier(r), laneKeyOf(r), /^Demand \d+ — [^:]+?( \(Summary of Demands for Grants, BE\))?$/.test(r.head) ? 'true' : 'false', r.srcs.map(([, u]) => u).join(' ')],
    };
  };
  // The coverage rows are built once the twin opens (a closed twin costs nothing, U16) and then
  // kept until the lanes or a budget filter change: a page press or Table view reuses them.
  const covLanes = useMemo(() => lanes.filter((l) => l.rows.some(visible)), [lanes, visible]);
  const covCount = covLanes.length * FY_AXIS.length;
  const covCache = useRef<{ key: unknown[]; rows: Row[] } | null>(null);
  const buildCov = (): Row[] => {
    const key = [covLanes, visible, why];
    if (covCache.current && covCache.current.key.every((k, i) => k === key[i])) return covCache.current.rows;
    const covRows: Row[] = [];
    for (const l of covLanes) {
      for (const fy of FY_AXIS) {
        const slots = slotsOf(l, fy, visible, why);
        const word = (s: Slot) => (s.state === 'hatch' ? 'no row in this register' : s.state === 'hidden' ? `${s.hidden} ${s.hidden === 1 ? 'row' : 'rows'} hidden by the ${s.why} filter — not absent` : s.state === 'zero' ? ZERO_WORDS : s.rows.map((r) => `₹${fmtCr(r.cr)}`).join(' and '));
        covRows.push({ cells: [`${labelOf(l.body)} — ${l.component} — ${l.line}`, fy, ...slots.map(word)], out: [l.key, fy, ...slots.map((s) => (s.rows[0] ? s.rows[0].cr : ''))] });
      }
    }
    covCache.current = { key, rows: covRows };
    return covRows;
  };
  return (
    <>
      <Twin twin="ledger-long" title={Q3} rowCount={all.length} paged>
        {() => (
          <>
            <Exports name="Union budget lines, long form" twin="ledger-long" meta={{ table: 'Union budget lines, long form', population: `${LANE_SOURCE.length} Union rows outside the grants to states`, rows: all.length, amounts: 'BE, RE and actual, as each row states' }}
              header={['payer', 'body_id', 'component', 'head', 'fy', 'fy_start', 'stage', 'cr', 'tier', 'lane_key', 'is_demand_level', 'source_urls']} rows={() => all.map((r) => longRow(r).out!)} />
            <Pager page={page} pages={pages} onPage={onPage} />
            <TwinTable caption={captionText(slice.length, `rows ${all.length ? (page - 1) * PAGE + 1 : 0}–${(page - 1) * PAGE + slice.length} of ${all.length}`, filterWords)} cols={longCols} rows={slice.map(longRow)} minWidth="90rem" />
          </>
        )}
      </Twin>
      <Twin twin="ledger-coverage" title={`${Q3} — coverage`} rowCount={covCount}>
        {() => { const covRows = buildCov(); return (
          <>
            <Exports name="Ledger coverage by lane and FY" twin="ledger-coverage" meta={{ table: 'Ledger coverage by lane and FY', population: `${lanes.length} lanes × ${FY_AXIS.length} FYs`, rows: covRows.length, amounts: 'BE, RE and actual, as each column states' }}
              header={['lane_key', 'fy', 'be_cr', 're_cr', 'actual_cr']} rows={() => covRows.map((r) => r.out!)} />
            <TwinTable caption={captionText(covRows.length, 'lanes × FYs', filterWords)} cols={covCols} rows={covRows} amounts={false} />
          </>
        ); }}
      </Twin>
    </>
  );
}
const laneKeyOf = (r: BudgetRow) => `${r.body}|${r.component}|${r.head.replace(/^Demand \d+ — /, '').replace(/ \(Summary of Demands for Grants, BE\)$/, '')}`;

export { DOMAIN };
