import { useId, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { STATES, VIEWBOX } from '../../data/geo';
import { TIERS, type GEdge } from '../../graph/schema';
import { TexturePatterns, TextureSwatch } from '../welfare/WelfareMap';
import {
  type Filters, NATIONAL, NATIONAL_CURRENT, NATIONAL_SUPERSEDED, NATIONAL_MULTI, FY_AXIS, FY_WITH, fyStart, fyLabel, sourceClass, SECTOR_DONORS, REGISTRATIONS,
  FC_STATE, FC_STATE_FYS, P5, CASE_FILES, COURTS_ACTIONS, POPULATION_ACTIONS, NO_ACTION_TARGETS, FCRA_NAMED_BASE, responsesTo, responseLine, NO_RESPONSE,
  LOK_SABHA, NAMED_GRANTS, WELFARE_LINKED, WELFARE_UNLINKED, WELFARE_SCHEMES, LINKED_SCHEMES, schemeOf, schemeIdOf, labelOf, fmtCr, finite, inYear, yearOf,
  MODULES, stateName, STATES_BY_NAME, type CaseFile, FINANCE_ASOF, isAggregateId, ASOF, hasRealResponse, isPlaceholder,
} from '../../data/financeView';
import { PRED_LABEL } from '../viz/ForceGraph';
import { Caption, Twin, Table, Cards, Exports, usePage, SkipLinks, captionLine, TierWord, Src, OpenRecord, Connect, RowActions, Q, NOTHING, Denominator, ResponseCell, type Col, type Row } from './ui';
import { BaseRateLine } from './Control';
import { citationFor } from './Panels';
import { DataRows } from './LoansLens';

// ---------------------------------------------------------------------------
// ReceiptsByYear (§5.2.1)
// ---------------------------------------------------------------------------

export const RECEIPTS_H3 = 'National receipts by financial year';
export const DONORS_H3 = 'Donors to the sector as a whole, where the record names them';
export const REGS_H3 = 'Registrations and filers by financial year';
export const STATE_H3 = 'State-wise receipts';

export function ReceiptsByYear({ f, captionId }: { f: Filters; captionId: string }) {
  const { filters: filterText, empty, narrow } = usePage();
  const uid = useId().replace(/:/g, '');
  const show = (e: GEdge) => f.tiers.has(e.tier);
  const cur = NATIONAL_CURRENT.filter(show);
  const W = 720; const H = 220; const PAD = 24;
  const n = Math.max(1, FY_AXIS.length);
  const slot = (W - PAD * 2) / n;
  const maxA = Math.max(1, ...NATIONAL.filter((e) => finite(e.a) && (yearOf(e.to) ?? 0) - (yearOf(e.from) ?? 0) <= 1).map((e) => e.a as number));
  const sy = (a: number) => H - PAD - ((H - PAD * 2) * a) / maxA;
  const xOf = (y: number) => PAD + (y - (FY_AXIS[0] ?? y)) * slot;
  const missing = FY_AXIS.filter((y) => !cur.some((e) => fyStart(e) === y));
  // Every current row for a year is drawn and listed; two current figures for one FY are
  // two thin bars and two table rows, never the first one found (E26).
  const curOf = (y: number) => cur.filter((x) => fyStart(x) === y);
  const doubled = FY_AXIS.filter((y) => curOf(y).length > 1);
  const first = (e: GEdge) => e.srcs?.[0];
  const chip = (e: GEdge) => { const s = first(e); if (!s) return 'no source in file'; const t = `${sourceClass(s)} · ${s[0]}`; return t.length > 24 ? `${t.slice(0, 23)}…` : t; };
  const rows: Row[] = empty || !f.tiers.size ? [] : [
    ...FY_AXIS.flatMap((y): Row[] => {
      const es = curOf(y);
      if (!es.length) return [{ cells: [fyLabel(y), 'no national total recorded', 'not applicable', 'not in the register', 'not applicable', 'no source in file', 'not applicable'], out: [fyLabel(y), '', '', 'not in the register', '', '', y, 'not in the register'] }];
      return es.map((e) => ({ cells: [fyLabel(y), `₹${fmtCr(e.a as number)} cr`, <TierWord key="t" tier={e.tier} />, 'current', first(e) ? sourceClass(first(e)!) : 'no source', <Src key="s" srcs={e.srcs} of={e.lab ?? e.id!} />, <Q key="d">{e.d ?? 'not stated'}</Q>], out: [fyLabel(y), e.a, e.tier, 'current', first(e) ? sourceClass(first(e)!) : '', (e.srcs ?? []).map((s) => s[1]).join('|'), y, 'current'] }));
    }),
    ...NATIONAL_SUPERSEDED.filter(show).map((e): Row => ({ cells: [fyLabel(fyStart(e) ?? 0), `₹${fmtCr(e.a as number)} cr`, <TierWord key="t" tier={e.tier} />, `superseded by ${e.supersededBy}`, first(e) ? sourceClass(first(e)!) : 'no source', <Src key="s" srcs={e.srcs} of={e.lab ?? e.id!} />, <Q key="d">{e.d ?? 'not stated'}</Q>], out: [fyLabel(fyStart(e) ?? 0), e.a, e.tier, `superseded by ${e.supersededBy}`, '', (e.srcs ?? []).map((s) => s[1]).join('|'), fyStart(e), `superseded by ${e.supersededBy}`] })),
    ...NATIONAL_MULTI.filter(show).map((e): Row => ({ cells: [`${fyLabel(fyStart(e) ?? 0)} to ${fyLabel((yearOf(e.to) ?? 1) - 1)}`, `₹${fmtCr(e.a as number)} cr`, <TierWord key="t" tier={e.tier} />, 'current', first(e) ? sourceClass(first(e)!) : 'no source', <Src key="s" srcs={e.srcs} of={e.lab ?? e.id!} />, <Q key="d">{e.d ?? 'not stated'}</Q>], out: [`${fyStart(e)}-${yearOf(e.to)}`, e.a, e.tier, 'current', '', (e.srcs ?? []).map((s) => s[1]).join('|'), fyStart(e), 'current'] })),
  ];
  const donors: Row[] = empty ? [] : SECTOR_DONORS.filter(show).map((e) => ({ cells: [labelOf(e.s), e.from ? `${e.from} to ${e.to ?? 'end not recorded'}` : 'undated', finite(e.a) ? `₹${fmtCr(e.a)} cr` : 'amount not stated', <TierWord key="t" tier={e.tier} />, <Src key="s" srcs={e.srcs} of={e.lab ?? e.id!} />], out: [e.s, e.from ?? '', finite(e.a) ? e.a : '', e.tier] }));
  const regs: Row[] = empty ? [] : REGISTRATIONS.filter(show).map((e) => ({ cells: [e.from ?? 'undated', <Q key="l">{e.lab ?? ''}</Q>, <TierWord key="t" tier={e.tier} />, <Src key="s" srcs={e.srcs} of={e.lab ?? e.id!} />], out: [e.from ?? '', e.lab ?? '', e.tier] }));
  const recCols: Col[] = [{ key: 'fy', label: 'FY', th: true }, { key: 'cr', label: '₹ cr' }, { key: 't', label: 'Tier' }, { key: 'st', label: 'Status' }, { key: 'c', label: 'Source class' }, { key: 's', label: 'Sources' }, { key: 'd', label: 'Record text' }];
  return (
    <>
    <figure className="m-0 min-w-0" aria-labelledby={`${uid}-h`}>
      <h3 id={`${uid}-h`} className="text-[16px] font-semibold text-text mb-1">{RECEIPTS_H3}</h3>
      <SkipLinks twins={[{ twin: 'receipts', title: RECEIPTS_H3 }, { twin: 'receipts-donors', title: DONORS_H3 }, { twin: 'receipts-registrations', title: REGS_H3 }]} />
      {empty || !FY_AXIS.length ? <p className="text-[14px] text-text-secondary">No national receipts total in the register.</p> : (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" aria-hidden="true" aria-describedby={captionId} style={{ display: 'block', maxWidth: W }}>
          <text x={4} y={12} fontSize="10" fill="rgb(170,170,170)">₹ crore, nominal</text>
          {FY_AXIS.map((y, i) => (narrow && i % 2 ? null : <text key={y} x={xOf(y) + slot / 2} y={H - 6} fontSize="10" textAnchor="middle" fill="rgb(170,170,170)">{fyLabel(y)}</text>))}
          {missing.map((y) => {
            const x = xOf(y) + 2; const w = slot - 4; const top = PAD; const h = H - PAD * 2;
            // Diagonal hatch drawn as lines clipped to the column by arithmetic: a <pattern>'s
            // own rect has no box, and would read as a zero-height bar.
            const lines = [];
            for (let k = 7; k < w + h; k += 7) {
              const a = Math.max(0, k - h); const b = Math.min(w, k);
              lines.push(<line key={k} x1={x + a} y1={top + h - (k - a)} x2={x + b} y2={top + h - (k - b)} stroke="rgba(201,168,108,0.55)" strokeWidth="1" />);
            }
            return (
              <g key={y}>
                <rect x={x} y={top} width={w} height={h} fill="rgb(22,22,22)" stroke="rgba(201,168,108,0.4)" aria-label={`FY${fyLabel(y)}: no national total recorded`}><title>{`FY${fyLabel(y)}: no national total recorded`}</title></rect>
                {lines}
              </g>
            );
          })}
          {cur.map((e) => {
            const y = fyStart(e) ?? 0;
            const peers = curOf(y); const k = peers.indexOf(e); const w = (slot - 8) / peers.length;
            return <rect key={e.id} data-mark="" x={xOf(y) + 4 + k * w} y={sy(e.a as number)} width={Math.max(1, w - (peers.length > 1 ? 1 : 0))} height={Math.max(1, H - PAD - sy(e.a as number))} fill="rgb(150,150,150)" stroke="rgb(220,220,220)" strokeDasharray={TIERS[e.tier].dash || undefined}><title>{`₹${fmtCr(e.a as number)} cr, FY${fyLabel(y)}, ${e.tier}, ${first(e)?.[0] ?? 'no source in file'}`}</title></rect>;
          })}
          {NATIONAL_SUPERSEDED.filter(show).map((e) => { const y = fyStart(e) ?? 0; return <line key={e.id} data-tick="" x1={xOf(y) + 2} x2={xOf(y) + slot - 2} y1={sy(e.a as number)} y2={sy(e.a as number)} stroke="rgb(230,230,230)" strokeWidth="2" strokeDasharray={TIERS[e.tier].dash || undefined}><title>{`superseded by ${e.supersededBy}`}</title></line>; })}
          {NATIONAL_MULTI.filter(show).map((e) => {
            const a = fyStart(e) ?? 0; const b = (yearOf(e.to) ?? a + 1) - 1;
            const x1 = xOf(a) + 2; const x2 = xOf(b) + slot - 2; const yy = PAD + 4;
            return <path key={e.id} data-bracket="" d={`M${x1},${yy + 6} L${x1},${yy} L${x2},${yy} L${x2},${yy + 6}`} fill="none" stroke="rgb(220,220,220)" strokeDasharray={TIERS[e.tier].dash || undefined}><title>{`₹${fmtCr(e.a as number)} cr, ${fyLabel(a)}–${fyLabel(b)}, one figure`}</title></path>;
          })}
        </svg>
      )}
      {!empty && doubled.map((y) => <p key={y} className="font-mono text-[12px] text-text-secondary">{`two current figures for ${fyLabel(y)} — see the table`}</p>)}
      {!empty && narrow && <p className="font-mono text-[12px] text-text-secondary">{`hatched: no national total recorded — ${missing.map(fyLabel).join(', ') || 'none'}; source per FY in the table`}</p>}
      {!empty && !narrow && (
        <ul className="list-none p-0 m-0 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[12px] text-text-secondary">
          {cur.map((e) => <li key={e.id} title={first(e)?.[0]}>{`FY${fyLabel(fyStart(e) ?? 0)}: ${chip(e)}`}</li>)}
        </ul>
      )}
      <Caption id={captionId} cap="C8" as="figcaption">
        {`What registered associations reported receiving from abroad, as totals for the whole sector. ${FY_WITH.size} of ${FY_AXIS.length} financial years carry a total. Years without one are hatched because a total was not found, not because nothing arrived. Figures differ between sources for the same year (returns filed late, different cut-off dates), so a superseded figure is kept and marked. The FCRA portal is unreachable from this environment; totals come from Parliament answers and press reports of Ministry statistics, and the tier says which.`}
      </Caption>
    </figure>
      <Twin twin="receipts" title={RECEIPTS_H3} rowCount={rows.length} open={f.view === 'table' || narrow}>
        {() => (
          <div className="overflow-x-auto">
            <Exports name={RECEIPTS_H3} twin="receipts" meta={{ table: RECEIPTS_H3, population: 'every FY on the axis, then every superseded and multi-FY national row', lens: 'associations', filters: filterText, rows: rows.length, amounts: true }}
              header={['fy', 'a_cr', 'tier', 'status_display', 'source_class', 'source_urls', 'fy_start', 'status']} rows={() => rows.map((r) => r.out)} />
            <Table caption={captionLine(rows.length, 'national foreign-contribution totals by FY', 'associations', filterText)} cols={recCols} rows={rows.length ? rows : [{ cells: [NOTHING], out: [] }]} className="min-w-[48rem]" />
          </div>
        )}
      </Twin>
      <h3 className="text-[14px] font-semibold text-text mt-4">{DONORS_H3}</h3>
      <Twin twin="receipts-donors" title={DONORS_H3} rowCount={donors.length} open={f.view === 'table'}>
        {() => (
          <div className="overflow-x-auto">
            <Exports name={DONORS_H3} twin="receipts-donors" meta={{ table: DONORS_H3, population: 'grant rows into the sector aggregate from a named donor', lens: 'associations', filters: filterText, rows: donors.length, amounts: true }} header={['donor', 'from', 'a_cr', 'tier']} rows={() => donors.map((r) => r.out)} />
            <Table caption={captionLine(donors.length, 'donors to the sector as a whole', 'associations', filterText)} cols={[{ key: 'd', label: 'Donor', th: true }, { key: 'f', label: 'FY or window' }, { key: 'a', label: '₹ cr' }, { key: 't', label: 'Tier' }, { key: 's', label: 'Sources' }]} rows={donors.length ? donors : [{ cells: [NOTHING], out: [] }]} />
          </div>
        )}
      </Twin>
      <h3 className="text-[14px] font-semibold text-text mt-4">{REGS_H3}</h3>
      <Twin twin="receipts-registrations" title={REGS_H3} rowCount={regs.length} open={f.view === 'table'}>
        {() => (
          <div className="overflow-x-auto">
            <Exports name={REGS_H3} twin="receipts-registrations" meta={{ table: REGS_H3, population: 'analytic registration and filer counts recorded for the sector', lens: 'associations', filters: filterText, rows: regs.length }} header={['from', 'record', 'tier']} rows={() => regs.map((r) => r.out)} />
            <Table caption={captionLine(regs.length, 'registrations and filers', 'associations', filterText)} cols={[{ key: 'f', label: 'FY or date', th: true }, { key: 'l', label: 'Record' }, { key: 't', label: 'Tier' }, { key: 's', label: 'Sources' }]} rows={regs.length ? regs : [{ cells: [NOTHING], out: [] }]} />
          </div>
        )}
      </Twin>
    </>
  );
}

// ---------------------------------------------------------------------------
// StateReceipts (§5.2.2): the annexure as records (P5), or the void card
// ---------------------------------------------------------------------------

const RAMP = ['#34424a', '#4b5f66', '#667f85', '#8aa1a4', '#b9c9c8'];

export function StateReceipts({ f }: { f: Filters }) {
  const { filters: filterText, empty, patch, announce } = usePage();
  const uid = useId().replace(/:/g, '');
  const fy = FC_STATE_FYS.find((x) => f.yFrom != null && x.startsWith(String(f.yFrom))) ?? FC_STATE_FYS[0];
  const national = (label: string) => NATIONAL_CURRENT.find((e) => fyLabel(fyStart(e) ?? 0) === label);
  const base = MODULES.associations.baseRates.filter((r) => r.domain === 'fcra-receipts');
  if (empty || !P5) {
    const citing = NATIONAL.filter((e) => /annexure|state-wise/i.test(`${e.d ?? ''} ${e.lab ?? ''}`));
    const years = citing.map(fyStart).filter((y): y is number => y != null);
    return (
      <div className="mt-8">
        <h3 className="text-[16px] font-semibold text-text mb-1">{STATE_H3}</h3>
        {empty ? <p className="text-[14px]">{NOTHING}</p> : (
          <p className="text-[15px] text-text-secondary max-w-[72ch]">{`State-wise receipts for ${years.length ? `${fyLabel(Math.min(...years))} to ${fyLabel(Math.max(...years))}` : 'the years in the Parliament answer'} are published as an annexure to a Rajya Sabha answer. This register sums them into the national totals above. Its state rows are not separate records here, so no state is drawn or ranked.`}</p>
        )}
        <Twin twin="state-receipts" title={STATE_H3} rowCount={0} open={f.view === 'table'}>{() => <Table caption={captionLine(0, 'state rows of the annexure', 'associations', filterText)} cols={[{ key: 's', label: 'State' }]} rows={[{ cells: [NOTHING], out: [] }]} />}</Twin>
      </div>
    );
  }
  const byStFy = new Map<string, number>();
  for (const r of FC_STATE) if (r.st) byStFy.set(`${r.st}|${r.fy}`, (byStFy.get(`${r.st}|${r.fy}`) ?? 0) + r.receivedCr);
  // Bins pooled over every state row in every FY (§8.2-14), so a shade means the same ₹
  // whichever FY is shown; they do not move with the year control.
  const vals = [...byStFy.values()].sort((a, b) => a - b);
  const q = (p: number) => vals[Math.min(vals.length - 1, Math.floor(p * (vals.length - 1)))] ?? 0;
  const edges = [...new Set([0, 0.2, 0.4, 0.6, 0.8].map(q))];
  const top = vals[vals.length - 1] ?? 0;
  const binOf = (v: number) => { let i = 0; for (let k = 0; k < edges.length; k++) if (v >= edges[k]) i = k; return i; };
  const shownBins = new Set(STATES.map((st) => byStFy.get(`${st.id}|${fy}`)).filter((v): v is number => v != null).map(binOf));
  const pickSt = (st: string) => { const next = f.st === st ? null : st; patch({ st: next }); announce(next ? `${stateName(next)} selected: case files registered there` : 'state cleared'); };
  const rows: Row[] = STATES_BY_NAME.map((s) => ({
    cells: [s.name, ...FC_STATE_FYS.map((y) => { const v = byStFy.get(`${s.id}|${y}`); return v != null ? `₹${fmtCr(v)} cr` : 'no row for this state in the annexure'; })],
    out: [s.name, s.id, ...FC_STATE_FYS.map((y) => byStFy.get(`${s.id}|${y}`) ?? '')],
  }));
  const footer = FC_STATE_FYS.map((y) => {
    const sum = FC_STATE.filter((r) => r.fy === y).reduce((a, r) => a + r.receivedCr, 0);
    const nat = national(y);
    const diff = nat && finite(nat.a) ? Math.abs(nat.a - sum) : null;
    return <li key={y} className={diff != null && diff > 1 ? 'text-amber' : ''}>{`FY${y}: sum of rows = ${fmtCr(Math.round(sum * 100) / 100)}; national row = ${nat && finite(nat.a) ? fmtCr(nat.a) : 'not in the register'}`}</li>;
  });
  const unplaced = FC_STATE.filter((r) => !r.st);
  return (
    <>
    <figure className="m-0 mt-8 min-w-0" aria-labelledby={`${uid}-h`}>
      <h3 id={`${uid}-h`} className="text-[16px] font-semibold text-text mb-1">{STATE_H3}</h3>
      <SkipLinks twins={[{ twin: 'state-receipts', title: STATE_H3 }]} />
      <p className="text-[13.5px] text-text-secondary max-w-[72ch]">{`FY${fy} as the Rajya Sabha annexure records it, by registered state of the association: registered in, not where it works. The year control chooses the FY (${FC_STATE_FYS.join(', ')}); the State select in the filters is the keyboard route to a state.`}</p>
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_14rem] items-start">
        <svg viewBox={VIEWBOX} aria-hidden="true" style={{ height: 320, width: '100%', display: 'block' }}>
          <defs><TexturePatterns hatchId={`sh-${uid}`} stippleId={`ss-${uid}`} px={0.5} /></defs>
          {STATES.map((s) => { const v = byStFy.get(`${s.id}|${fy}`); return <path key={s.id} d={s.path} data-st={s.id} data-fill-class={v != null ? 'value' : 'hatch'} fill={v != null ? RAMP[Math.min(RAMP.length - 1, binOf(v))] : `url(#sh-${uid})`} stroke="rgba(10,10,12,0.85)" strokeWidth={0.5} onClick={() => pickSt(s.id)} style={{ cursor: 'pointer' }}><title>{`${s.name}: ${v != null ? `₹${fmtCr(v)} cr, FY${fy}` : 'no row for this state in the annexure'}`}</title></path>; })}
          {f.st && STATES.filter((s) => s.id === f.st).map((s) => <path key="sel" d={s.path} fill="none" stroke="var(--color-accent)" strokeWidth={2} pointerEvents="none" />)}
        </svg>
        <ul className="list-none p-0 m-0 space-y-0.5 text-[12px] font-mono text-text-secondary" aria-label="State receipts key">
          {edges.map((lo, i) => (
            <li key={i} className="flex items-center gap-2">
              <svg width="16" height="12" aria-hidden="true"><rect width="16" height="12" fill={RAMP[Math.min(RAMP.length - 1, i)]} /></svg>
              <span>{`₹${fmtCr(lo)} – ₹${fmtCr(edges[i + 1] ?? top)} cr${shownBins.has(i) ? '' : ' (none in view)'}`}</span>
            </li>
          ))}
          <li className="flex items-center gap-2"><TextureSwatch kind="hatch" /><span>no row for this state in the annexure; never zero</span></li>
          <li className="text-text-muted">{`bins pooled over every state row in ${FC_STATE_FYS.length} FYs`}</li>
        </ul>
      </div>
      <ul className="list-none p-0 m-0 font-mono text-[12px] text-text-secondary">{footer}</ul>
      {unplaced.length > 0 && <p className="text-[13px] text-text-secondary">{`${unplaced.length} annexure rows name no state (${[...new Set(unplaced.map((r) => r.stateName))].join(', ')}); they are in the sums above and on no state.`}</p>}
      <ul className="list-none p-0 m-0 text-[13px] mt-2 space-y-1">{base.map((r, i) => <li key={i}><BaseRateLine r={r} /></li>)}</ul>
    </figure>
      <Twin twin="state-receipts" title={STATE_H3} rowCount={rows.length} open={f.view === 'table'}>
        {() => (
          <div className="overflow-x-auto">
            <Exports name={STATE_H3} twin="state-receipts" meta={{ table: STATE_H3, population: 'every state and union territory by FY; hatch words where the annexure has no row', lens: 'associations', filters: filterText, rows: rows.length, amounts: true }} header={['state', 'st', ...FC_STATE_FYS.map((y) => `received_${y}`)]} rows={() => rows.map((r) => r.out)} />
            <Table caption={captionLine(rows.length, 'FCRA receipts by registered state and FY, Rajya Sabha annexure', 'associations', filterText)} cols={[{ key: 's', label: 'State', th: true }, ...FC_STATE_FYS.map((y) => ({ key: y, label: `FY${y} received` }))]} rows={rows} />
            <ul className="list-none p-0 m-0 font-mono text-[12px] text-text-secondary mt-1">{footer}</ul>
          </div>
        )}
      </Twin>
    </>
  );
}

// ---------------------------------------------------------------------------
// ActionsTimeline and ActionsList (§5.2.3–4)
// ---------------------------------------------------------------------------

export const ACTIONS_H3 = "The Ministry's actions and the responses";

/** A case file is in view when any of its actions passes the filters; it then keeps every row (U31). */
export function actionInView(f: Filters, e: GEdge, c: CaseFile | null) {
  return f.tiers.has(e.tier) && inYear(f, e.from) && (!f.st || (c ? c.st === f.st : false));
}
export function casesInView(f: Filters) {
  return CASE_FILES.filter((c) => c.actions.some((a) => actionInView(f, a, c)));
}
const filterSet = (f: Filters) => f.yFrom != null || f.tierSet || !!f.st;
const isGround = (e: GEdge, c: CaseFile) => e.tier === 'alleged' && c.actions.some((a) => a.tier !== 'alleged');

export function ActionsTimeline({ f, captionId }: { f: Filters; captionId: string }) {
  const { filters: filterText, empty, narrow, showConnections } = usePage();
  const cases = useMemo(() => casesInView(f), [f]);
  const dates = [...CASE_FILES.flatMap((c) => c.actions), ...COURTS_ACTIONS].map((e) => e.from).filter((d): d is string => !!d).sort();
  const x0 = dates.length ? Number(dates[0].slice(0, 4)) : (LOK_SABHA.length ? Number(LOK_SABHA[0].date.slice(0, 4)) : 2000);
  const x1 = (ASOF.associations ? Number(ASOF.associations.slice(0, 4)) : x0) + 1;
  const LABEL_W = narrow ? 96 : 200; const PLOT_W = Math.max(narrow ? 520 : 600, (x1 - x0) * 30); const ROW = 18; const GUT = 40;
  const sx = (d: string) => { const y = Number(d.slice(0, 4)); const m = d.length >= 7 ? Number(d.slice(5, 7)) - 1 : 6; return 8 + ((y + m / 12 - x0) / Math.max(1, x1 - x0)) * (PLOT_W - GUT - 16); };
  const courts = COURTS_ACTIONS.filter((e) => f.tiers.has(e.tier) && inYear(f, e.from));
  const lanes = [...cases.map((c) => ({ key: c.id, label: c.label, entity: c.id, actions: c.actions, courts: false })), ...(courts.length ? [{ key: 'courts', label: "Courts and oversight on the government's actions", entity: null as string | null, actions: courts, courts: true }] : [])];
  const H = lanes.length * ROW + 24;
  const noAction = NO_ACTION_TARGETS;
  const sym = MODULES.associations.symmetry;
  const base = MODULES.associations.baseRates.filter((r) => r.domain === 'fcra-actions');
  const agg = POPULATION_ACTIONS;
  return (
    <figure className="m-0 mt-10 min-w-0">
      <h3 className="text-[16px] font-semibold text-text mb-1">{ACTIONS_H3}</h3>
      <SkipLinks twins={[{ twin: 'actions', title: ACTIONS_H3 }]} />
      {empty || !CASE_FILES.length ? <p className="text-[14px] text-text-secondary">No enforcement action recorded.</p> : (
        <>
          <ul className="list-none p-0 m-0 font-mono text-[12px] text-text-secondary space-y-0.5 mb-2" aria-label="Population counts, not events">
            {agg.map((e) => <li key={e.id}>{`${e.from ?? 'undated'}${e.to ? ` to ${e.to}` : ''} · `}<Q>{e.lab ?? ''}</Q>{` · ${e.tier}`}</li>)}
          </ul>
          <div style={{ overflowX: 'auto' }}>
            <div className="flex" style={{ width: LABEL_W + PLOT_W }}>
              <ul className="list-none p-0 m-0 sticky left-0 bg-bg z-10 shrink-0" style={{ width: LABEL_W, paddingTop: 16 }} aria-label="Case files" aria-describedby={captionId}>
                {lanes.map((l) => {
                  const undated = l.actions.filter((a) => !a.from).length;
                  const text = `${l.label} — ${l.actions.length} actions${undated ? ` · undated: ${undated}` : ''}`;
                  return (
                    <li key={l.key} style={{ height: ROW }} className="flex items-center min-w-0">
                      <button type="button" data-lane="" title={text} aria-label={`${text}${l.entity ? ' — show connections' : ''}`} onClick={(ev) => { if (l.entity) showConnections(l.entity, ev.currentTarget); }}
                        className="truncate text-left font-mono text-[12px] text-text-secondary hover:text-accent w-full">{text}</button>
                    </li>
                  );
                })}
              </ul>
              <svg width={PLOT_W} height={H} aria-hidden="true" className="shrink-0 block">
                {Array.from({ length: x1 - x0 + 1 }, (_, i) => x0 + i).filter((y) => y % 5 === 0).map((y) => <text key={y} x={sx(String(y))} y={10} fontSize="10" textAnchor="middle" fill="rgb(170,170,170)">{y}</text>)}
                {LOK_SABHA.filter((e) => Number(e.date.slice(0, 4)) >= x0).map((e) => <g key={e.date}><line x1={sx(e.date)} x2={sx(e.date)} y1={14} y2={H} stroke="rgb(200,200,200)" strokeWidth={1} /><text x={sx(e.date) + 2} y={H - 2} fontSize="8" fill="rgb(170,170,170)">{(e.winner ?? '').split(' ')[0]}</text></g>)}
                <text x={PLOT_W - GUT + 4} y={10} fontSize="9" fill="rgb(170,170,170)">undated</text>
                {lanes.map((l, i) => {
                  const y = 16 + i * ROW;
                  return (
                    <g key={l.key}>
                      {l.actions.map((a, j) => {
                        const x = a.from ? sx(a.from) : PLOT_W - GUT + 6 + (j % 4) * 8;
                        const answered = hasRealResponse(a.id);
                        if (l.courts) {
                          return (
                            <g key={a.id} data-response={answered ? 'true' : 'false'}>
                              <rect x={x - 3} y={y + 3} width={6} height={6} fill="none" stroke="rgb(200,200,200)" strokeDasharray={TIERS[a.tier].dash || undefined}><title>{`${a.from ?? 'undated'} · ${a.lab ?? a.id} · ${a.tier}`}</title></rect>
                              {answered
                                ? <rect x={x - 4} y={y + 12} width={8} height={2} fill="var(--color-rose)"><title>a response is recorded</title></rect>
                                : <path d={`M${x - 4},${y + 11} L${x - 4},${y + 14} L${x + 4},${y + 14} L${x + 4},${y + 11}`} fill="none" stroke="rgb(170,170,170)"><title>{NO_RESPONSE}</title></path>}
                            </g>
                          );
                        }
                        return (
                          <g key={a.id} data-response={answered ? 'true' : 'false'}>
                            <rect data-square="" data-response={answered ? 'true' : 'false'} aria-label={`${a.from ?? 'undated'} · ${a.lab ?? a.id}`} x={x - 4} y={y + 2} width={8} height={8}
                              fill="rgb(120,120,120)" stroke="rgb(230,230,230)" strokeWidth={1} strokeDasharray={TIERS[a.tier].dash || undefined}><title>{`${a.from ?? 'undated'} · ${a.lab ?? a.id} · ${a.tier}`}</title></rect>
                            {answered
                              ? <rect x={x - 4} y={y + 12} width={8} height={2} fill="var(--color-rose)"><title>a response is recorded</title></rect>
                              : <path d={`M${x - 4},${y + 11} L${x - 4},${y + 14} L${x + 4},${y + 14} L${x + 4},${y + 11}`} fill="none" stroke="rgb(170,170,170)"><title>{NO_RESPONSE}</title></path>}
                          </g>
                        );
                      })}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </>
      )}
      <Caption id={captionId} cap="C9" as="figcaption">
        {`Every enforcement action in the register. Case files are the ${CASE_FILES.length} targets with a recorded action; ${noAction.length} further entities in the register have none recorded, and are listed below the lanes. `}
        {FCRA_NAMED_BASE ? `The named cases are a small, chosen set: ${FCRA_NAMED_BASE.numerator} named case files against ${(FCRA_NAMED_BASE.denominator as number).toLocaleString('en-IN')} cancellations counted by the Ministry (base rate beside). The named case files count any recorded action; the Ministry's figure counts cancellations only, so the numerator is wider than the denominator and the share is an upper bound on named cancellations. ` : ''}
        Most cancellations were for not filing returns. A square is an action, not a finding of wrongdoing. The kind of action (suspension, cancellation, refusal to renew) is quoted from the record, not classified by this page.
      </Caption>
      {!empty && (
        <div className="mt-3">
          <h4 className="text-[14px] font-semibold text-text">Counts the Ministry and Parliament have given</h4>
          <p className="text-[13.5px] text-text-secondary">These counts overlap and use different windows. They are never added.</p>
          <DataRows cards={false} caption={captionLine(agg.length, 'population counts of cancellations and cessations, each as recorded', 'associations', filterText)}
            cols={[{ key: 'w', label: 'Window' }, { key: 'l', label: 'Count as recorded' }, { key: 't', label: 'Tier' }, { key: 's', label: 'Sources' }]}
            rows={agg.map((e) => ({ cells: [`${e.from ?? 'undated'} to ${e.to ?? 'end not recorded'}`, <Q key="l">{e.lab ?? ''}</Q>, <TierWord key="t" tier={e.tier} />, <Src key="s" srcs={e.srcs} of={e.lab ?? e.id!} />], out: [] }))} />
          <ul className="list-none p-0 m-0 text-[13px] mt-2 space-y-1">{base.map((r, i) => <li key={i}><BaseRateLine r={r} /></li>)}</ul>
        </div>
      )}
      <div className="mt-4">
        <h4 className="text-[14px] font-semibold text-text">{`In this register, no enforcement action recorded (${noAction.length})`}</h4>
        <ul className="list-none p-0 m-0 text-[13.5px] space-y-1">
          {noAction.map((n) => (
            <li key={n.id}>{`${n.label}${n.sub ? ` — ${n.sub}` : ''} · no enforcement action recorded in the register — not a finding that none occurred `}<Connect id={n.id} label={n.label}>Show connections</Connect></li>
          ))}
        </ul>
        {['fcra-actions', 'political-trusts'].map((d) => sym.filter((s) => s.domain === d).map((s, i) => <p key={`${d}${i}`} className="text-[13.5px] fin-q mt-2 max-w-[80ch]">{s.text}</p>))}
      </div>
    </figure>
  );
}

/** The courts lane in view: the same filter the timeline draws it under. */
export const courtsInView = (f: Filters) => COURTS_ACTIONS.filter((e) => f.tiers.has(e.tier) && inYear(f, e.from));
export const COURTS_H4 = "Courts and oversight on the government's actions";
const responsesCell = (id: string | undefined) => <ResponseCell id={id} />;

export function ActionsList({ f }: { f: Filters }) {
  const { filters: filterText, empty, announce } = usePage();
  const cases = casesInView(f);
  const courts = courtsInView(f);
  const fset = filterSet(f);
  const outsideWhy = (e: GEdge, c: CaseFile) => (!f.tiers.has(e.tier) ? 'tier' : !inYear(f, e.from) ? 'y' : f.st && c.st !== f.st ? 'st' : null);
  // The twin lists every square the timeline draws: case files, then the courts lane.
  const twinItems: { lane: string; a: GEdge }[] = [...cases.flatMap((c) => c.actions.map((a) => ({ lane: c.label, a }))), ...courts.map((a) => ({ lane: COURTS_H4, a }))];
  const rows = twinItems.length;
  return (
    <div className="mt-6">
      <h3 className="text-[16px] font-semibold text-text mb-1">Case files, action by action</h3>
      <p className="text-[13px] text-text-secondary">{captionLine(rows, 'enforcement actions in named case files and the courts lane, each with its response slot', 'associations', filterText)}</p>
      <Twin twin="actions" title={ACTIONS_H3} rowCount={rows} open={f.view === 'table'}>
        {() => (
          <div>
            <Exports name={ACTIONS_H3} twin="actions" meta={{ table: ACTIONS_H3, population: 'one row per action in a named case file, then one per action in the courts lane; responses joined', lens: 'associations', filters: filterText, rows }} header={['case', 'id', 'from', 'actor', 'record', 'tier', 'responses']}
              rows={() => twinItems.map(({ lane, a }) => [lane, a.id, a.from ?? '', labelOf(a.s), a.lab ?? '', a.tier, responsesTo(a.id).map(responseLine).join(' ‖ ') || NO_RESPONSE])} />
            <Table caption={captionLine(rows, 'actions in named case files and the courts lane', 'associations', filterText)} cols={[{ key: 'c', label: 'Case file or lane', th: true }, { key: 'd', label: 'Date' }, { key: 'a', label: 'Action' }, { key: 't', label: 'Tier' }, { key: 'r', label: 'Response' }]}
              rows={rows ? twinItems.map(({ lane, a }) => ({ cells: [lane, a.from ?? 'undated', <Q key="l">{a.lab ?? ''}</Q>, <TierWord key="t" tier={a.tier} />, responsesCell(a.id)], out: [] })) : [{ cells: [NOTHING], out: [] }]} />
          </div>
        )}
      </Twin>
      {empty && <p className="text-[14px]">{NOTHING}</p>}
      {cases.map((c) => {
        const responded = c.actions.filter((a) => hasRealResponse(a.id)).length;
        const inView = c.actions.filter((a) => actionInView(f, a, c)).length;
        const hid = `case-h-${c.id.replace(/[^a-z0-9]+/gi, '-')}`;
        return (
          <section key={c.id} id={`case-${c.id}`} aria-labelledby={hid} className="mt-5 border-t border-border pt-3 scroll-mt-40">
            <h4 id={hid} tabIndex={-1} className="text-[15px] text-text outline-none">
              {`${c.label}${c.st ? ` (registered in ${stateName(c.st)})` : ''} — `}
              <span className="font-mono text-[12px] text-text-secondary">{fset ? `${c.actions.length} actions · ${inView} in view under the current filters · ${responded} with a response to that claim` : `${c.actions.length} actions · ${responded} with a response to that claim`}</span>
            </h4>
            <p className="flex flex-wrap gap-3 text-[12.5px] mt-1">
              <Connect id={c.id} label={c.label}>Show connections</Connect>
              <button type="button" className="underline" aria-label={`Copy link to the case file ${c.label}`} onClick={async () => { const u = `${location.origin}${location.pathname}#/finance?lens=associations#case-${c.id}`; try { await navigator.clipboard.writeText(u); announce('Link copied'); } catch { announce('Copy refused by the browser'); } }}>Copy link to this case</button>
            </p>
            {c.actions.map((a) => {
              const rs = responsesTo(a.id);
              const others = c.actions.filter((x) => x.id !== a.id && hasRealResponse(x.id)).length;
              const why = outsideWhy(a, c);
              const idx = c.actions.indexOf(a);
              const where = c.actions.slice(0, idx).some((x) => hasRealResponse(x.id)) ? 'above' : 'below';
              const ground = isGround(a, c);
              return (
                <dl key={a.id} className="grid gap-x-4 gap-y-1 sm:grid-cols-2 mt-3 text-[14px]">
                  {fset && <div className="sm:col-span-2 flex gap-2"><dt className="font-mono text-[12px] text-text-muted">Filter:</dt><dd className="m-0 font-mono text-[12px] text-text-muted">{why ? `outside ${why} — shown for context` : 'in view'}</dd></div>}
                  <div className="min-w-0">
                    <dt className="font-mono text-[12px] text-text-muted">{ground ? 'Stated ground' : 'Action'}</dt>
                    <dd className="m-0 text-[14px] font-normal">{`${a.from ?? 'undated'} · ${labelOf(a.s)} · `}<Q>{a.lab ?? ''}</Q>{' '}<TierWord tier={a.tier} />{' '}<Q>{a.d ?? ''}</Q></dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="font-mono text-[12px] text-text-muted">Response</dt>
                    <dd className="m-0 text-[14px] font-normal">
                      {rs.length ? rs.map((r) => <span key={r.id} className="block fin-q">{responseLine(r)}</span>) : <span className="fin-q">{NO_RESPONSE}</span>}
                      {!rs.some((r) => !isPlaceholder(r)) && others > 0 && <span className="block">{`${others} response(s) recorded to other claims in this case, shown ${where}.`}</span>}
                    </dd>
                  </div>
                  <div className="sm:col-span-2 min-w-0">
                    <dt className="font-mono text-[12px] text-text-muted">Sources</dt>
                    <dd className="m-0"><Src srcs={a.srcs} of={a.lab ?? a.id!} />
                      <button type="button" aria-label={`Copy citation for ${a.lab ?? a.id}`} className="underline font-mono text-[12px] mt-1" onClick={async () => { try { await navigator.clipboard.writeText(citationFor(a, 'associations')); announce('Citation copied'); } catch { announce('Copy refused by the browser'); } }}>Copy citation</button>
                      {' '}<OpenRecord id={a.id!} lab={a.lab ?? a.id!} />
                    </dd>
                  </div>
                </dl>
              );
            })}
          </section>
        );
      })}
      {!empty && courts.length > 0 && (
        // Not a case file (no case- id): the courts act on the government, so the lane has
        // its own heading, and each action still carries its response slot (§8.2-8).
        <section id="courts-oversight" aria-labelledby="courts-oversight-h" className="mt-5 border-t border-border pt-3 scroll-mt-40">
          <h4 id="courts-oversight-h" className="text-[15px] text-text">
            {`${COURTS_H4} — `}
            <span className="font-mono text-[12px] text-text-secondary">{`${courts.length} actions · ${courts.filter((a) => hasRealResponse(a.id)).length} with a response to that claim`}</span>
          </h4>
          {courts.map((a) => {
            const rs = responsesTo(a.id);
            return (
              <dl key={a.id} className="grid gap-x-4 gap-y-1 sm:grid-cols-2 mt-3 text-[14px]">
                <div className="min-w-0">
                  <dt className="font-mono text-[12px] text-text-muted">Action</dt>
                  <dd className="m-0 text-[14px] font-normal">{`${a.from ?? 'undated'} · ${labelOf(a.s)} on ${labelOf(a.t)} · `}<Q>{a.lab ?? ''}</Q>{' '}<TierWord tier={a.tier} />{' '}<Q>{a.d ?? ''}</Q></dd>
                </div>
                <div className="min-w-0">
                  <dt className="font-mono text-[12px] text-text-muted">Response</dt>
                  <dd className="m-0 text-[14px] font-normal">{rs.length ? rs.map((r) => <span key={r.id} className="block fin-q">{responseLine(r)}</span>) : <span className="fin-q">{NO_RESPONSE}</span>}</dd>
                </div>
                <div className="sm:col-span-2 min-w-0">
                  <dt className="font-mono text-[12px] text-text-muted">Sources</dt>
                  <dd className="m-0"><Src srcs={a.srcs} of={`${a.lab ?? a.id} (${labelOf(a.t)}, ${a.from ?? 'undated'})`} />{' '}<OpenRecord id={a.id!} lab={`${a.lab ?? a.id} (${labelOf(a.t)}, ${a.from ?? 'undated'}, ${a.id})`} /></dd>
                </div>
              </dl>
            );
          })}
        </section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grants and the welfare join
// ---------------------------------------------------------------------------

export function GrantsSection({ f }: { f: Filters }) {
  const { empty, filters: filterText, narrow, hrefWith, patch } = usePage();
  const rows = NAMED_GRANTS.filter((e) => f.tiers.has(e.tier) && inYear(f, e.from));
  const cols: Col[] = [{ key: 'd', label: 'Donor' }, { key: 'r', label: 'Recipient' }, { key: 'f', label: 'FY or window' }, { key: 'a', label: '₹ cr' }, { key: 't', label: 'Tier' }, { key: 'resp', label: 'Response' }, { key: 'x', label: 'Superseded' }, { key: 's', label: 'Sources' }];
  // A preset writes the graph's own `pred`: the reader's act, never a pre-filtered default (D37).
  const preset = (pred: string | null, text: string) => <a href={`#/finance${hrefWith({ pred })}`} className="underline" onClick={(e) => { e.preventDefault(); patch({ pred }); document.getElementById('connections')?.scrollIntoView({ block: 'start' }); }}>{text}</a>;
  return (
    <section id="grants" className="pt-12">
      <h2 className="heading-editorial font-bold text-2xl border-b border-border-light pb-2.5 mb-3">Grants named in the records</h2>
      {empty ? <p className="text-[14px]">{NOTHING}</p> : (
        <>
          <Denominator>{`${NAMED_GRANTS.length} named grant records from ${new Set(NAMED_GRANTS.map((e) => e.s)).size} donors; the page does not classify donors as foreign or domestic.`}</Denominator>
          <p className="flex flex-wrap gap-3 text-[13px] mb-2">{preset('grant', 'Graph: donors and associations')}{preset('enforce,contra', 'Graph: enforcement and responses')}{preset(null, 'Graph: everything in this lens')}</p>
          {!rows.length ? <p className="text-[14px]">No named grant records.</p> : (
            <DataRows cards={narrow} cols={cols} caption={captionLine(rows.length, 'named grant records in view', 'associations', filterText)}
              rows={rows.map((e) => ({ cells: [<span key="d"><RowActions><Connect id={e.s} label={labelOf(e.s)} /></RowActions>{MODULES.associations.nodes.find((n) => n.id === e.s)?.sub ? <span className="block text-[12px] text-text-muted"><Q>{MODULES.associations.nodes.find((n) => n.id === e.s)?.sub}</Q></span> : null}</span>, <RowActions key="r"><Connect id={e.t} label={labelOf(e.t)} /></RowActions>, e.from ? `${e.from} to ${e.to ?? 'end not recorded'}` : 'undated', finite(e.a) ? `₹${fmtCr(e.a)} cr — foreign contribution for the year in the record` : 'amount not stated', <TierWord key="t" tier={e.tier} />, <ResponseCell key="resp" id={e.id} />, e.supersededBy ? `superseded by ${e.supersededBy}` : 'current', <Src key="s" srcs={e.srcs} of={e.lab ?? e.id!} />], out: [] }))} />
          )}
        </>
      )}
    </section>
  );
}

export function WelfareJoinSection({ f, captionId }: { f: Filters; captionId: string }) {
  const { empty, filters: filterText, narrow } = usePage();
  const linked = WELFARE_LINKED.filter((e) => f.tiers.has(e.tier));
  const unlinked = WELFARE_UNLINKED.filter((e) => f.tiers.has(e.tier));
  const analytic = WELFARE_LINKED.filter((e) => e.tier === 'analytic').length;
  return (
    <section id="welfare-join" className="pt-12">
      <h2 className="heading-editorial font-bold text-2xl border-b border-border-light pb-2.5 mb-3">Associations in welfare delivery</h2>
      {empty ? <p className="text-[14px]">{NOTHING}</p> : (
        <>
          <Denominator>{`${LINKED_SCHEMES.size} of ${WELFARE_SCHEMES.length} schemes in the welfare register have a recorded link to an association · ${WELFARE_LINKED.length} of ${WELFARE_LINKED.length + WELFARE_UNLINKED.length} rows are linked to a scheme · ${analytic} of ${WELFARE_LINKED.length} links are our own inference, each with its innocent reading.`}</Denominator>
          {!linked.length ? <p className="text-[14px]">No association is linked to a register scheme in this build.</p> : (
            <DataRows cards={narrow} describedBy={captionId} caption={captionLine(linked.length, 'rows linking an association to a welfare-register scheme', 'associations', filterText)}
              cols={[{ key: 's', label: 'Scheme' }, { key: 'a', label: 'Association or body' }, { key: 'r', label: 'Relationship' }, { key: 't', label: 'Tier' }, { key: 'i', label: 'Innocent reading' }, { key: 'rec', label: 'Record' }, { key: 'src', label: 'Sources' }]}
              rows={linked.map((e) => {
                const s = schemeOf(e);
                const other = e.s.startsWith('scheme:') ? e.t : e.s;
                return { cells: [s ? <Link key="s" to={`/welfare?s=${encodeURIComponent(s.id)}`} className="underline">{`${s.name} (${s.level}${s.st ? `, ${stateName(s.st)}` : ''})`}</Link> : `${schemeIdOf(e)}: scheme id not in the welfare register`, labelOf(other), PRED_LABEL[e.pred] ?? e.pred, <TierWord key="t" tier={e.tier} />, e.innocentReading ?? 'not recorded', <RowActions key="o"><OpenRecord id={e.id!} lab={e.lab ?? e.id!}>{e.lab ?? e.id}</OpenRecord></RowActions>, <Src key="x" srcs={e.srcs} of={e.lab ?? e.id!} />], out: [] };
              })} />
          )}
          <Caption id={captionId} cap="C10">A link here says an association sits in a scheme&apos;s delivery chain, and an association that delivers a scheme is paid to do so. That is how the scheme works. It is an allegation only where the tier says alleged.</Caption>
          <h3 className="text-[15px] font-semibold mt-4">{`Rows about associations in welfare delivery not linked to a scheme record (${unlinked.length})`}</h3>
          <DataRows cards={narrow} caption={captionLine(unlinked.length, 'welfare-join rows with no scheme id', 'associations', filterText)}
            cols={[{ key: 'p', label: 'Payer' }, { key: 'a', label: 'Association' }, { key: 'cr', label: '₹ cr' }, { key: 'w', label: 'Window' }, { key: 't', label: 'Tier' }, { key: 'r', label: 'Response' }, { key: 's', label: 'Sources' }]}
            rows={unlinked.length ? unlinked.map((e) => ({ cells: [labelOf(e.s), labelOf(e.t), finite(e.a) ? `₹${fmtCr(e.a)} cr` : 'amount not stated', `${e.from ?? 'undated'} to ${e.to ?? 'end not recorded'}`, <TierWord key="t" tier={e.tier} />, e.pred === 'contra' ? 'this row is a response' : responsesCell(e.id), <Src key="s" srcs={e.srcs} of={e.lab ?? e.id!} />], out: [] })) : [{ cells: ['none recorded'], out: [] }]} />
        </>
      )}
    </section>
  );
}

export { Cards, isAggregateId, FINANCE_ASOF, STATES_BY_NAME };
