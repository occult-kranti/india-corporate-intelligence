import { useId, useMemo, type ReactNode } from 'react';
import { TIERS, type GEdge } from '../../graph/schema';
import {
  type Filters, LOANS, CENSUS, RESEARCHED, isCensus, loanPass, inclusion, INCLUSION_WORDS, hasRupee, fmtCr, labelOf, nodeOf, benefitOf,
  placeText, borrowerDefaulted, instrumentOf, conditionsOf, contractsFor, officeOnDate, loanOfficeIds, LOAN_FACT, G1, NO_AMOUNT, isFutureDated,
  PAGE_SIZE, pToken, DUP_TOKENS, strictSt, bodySt, stateName, CONTRACTS, DEBARMENTS, RULES_FIN, projectKey, loanForProject, contractProjects,
  censusProjects, unattachedContracts, distinctContractors, distinctDebarredFirms, debarredOverlap, BID_COUNT_BASE, precisionOf,
  yearOf, MODULES, FINANCE_ASOF, byLabel,
} from '../../data/financeView';
import { Caption, Twin, Table, Cards, Exports, usePage, SkipLinks, captionLine, TierWord, Src, OpenRecord, Connect, RowActions, Q, NOTHING, Denominator, ResponseCell, type Col, type Row, ScrollBox } from './ui';
import { BaseRateLine } from './Control';

// ---------------------------------------------------------------------------
// Shared cell renderers
// ---------------------------------------------------------------------------

export function amountCell(e: GEdge): { text: string; title?: string } {
  if (!hasRupee(e)) {
    const usd = LOAN_FACT(e)?.usdM;
    return { text: G1 && usd != null ? `${NO_AMOUNT} US$${fmtCr(usd)} m` : NO_AMOUNT };
  }
  if (e.a === 0) return { text: '₹0 cr — as recorded' };
  const f = LOAN_FACT(e);
  const title = isCensus(e)
    ? (f?.usdM != null && f.fxRate != null ? `US$${fmtCr(f.usdM)} m at ₹${fmtCr(f.fxRate)}/US$ (${f.fxBasis ?? 'rate basis in the record'})` : "₹ converted from the lender's US$ commitment at the approval-year rate the record states")
    : '₹ as the research recorded it — its basis is in the record text';
  return { text: `₹${fmtCr(e.a as number)} cr`, title };
}

function officeCell(e: GEdge): ReactNode {
  if (!e.from) return 'no approval date: the date test cannot run';
  const o = officeOnDate(e.from, loanOfficeIds(e));
  const items = [...o.covers, ...o.openEnded, ...o.sameDay];
  if (!items.length) return `no recorded window covers ${e.from}`;
  return (
    <ul className="list-none p-0 m-0">
      {items.map((r) => <li key={r.id}>{`${labelOf(r.s)} — ${r.lab ?? ''} [${r.tier}]${r.to ? '' : ' end not recorded'}`}</li>)}
    </ul>
  );
}
function officeText(e: GEdge): string {
  if (!e.from) return '';
  const o = officeOnDate(e.from, loanOfficeIds(e));
  return [...o.covers, ...o.openEnded, ...o.sameDay].map((r) => `${labelOf(r.s)} — ${r.lab ?? ''}`).join('; ');
}

export function DataRows({ cols, rows, caption, describedBy, cards }: { cols: Col[]; rows: Row[]; caption: string; describedBy?: string; cards: boolean }) {
  if (cards) return <Cards cols={cols} rows={rows} caption={caption} />;
  return (
    <ScrollBox label={caption}>
      <Table caption={caption} cols={cols} rows={rows} describedBy={describedBy} className="min-w-[48rem]" />
    </ScrollBox>
  );
}

// ---------------------------------------------------------------------------
// RecordsStrip (§5.1.4): the researched sample, one mark per record, never summed
// ---------------------------------------------------------------------------

export const STRIP_H3 = 'Other lenders, one mark each';

export function RecordsStrip({ f, captionId }: { f: Filters; captionId: string }) {
  const { filters: filterText, empty, narrow } = usePage();
  const uid = useId().replace(/:/g, '');
  const rows = useMemo(() => RESEARCHED.filter((e) => loanPass(f, e, { inc: true })), [f]);
  const lenders = [...new Set(rows.map((e) => e.s))].map((id) => ({ id, label: labelOf(id) })).sort(byLabel);
  const vals = rows.filter(hasRupee).map((e) => e.a as number).filter((v) => v > 0);
  const lo = vals.length ? Math.floor(Math.log10(Math.min(...vals))) : 0;
  const hi = vals.length ? Math.ceil(Math.log10(Math.max(...vals))) : 1;
  const W = 900; const GUT = 150; const ROW = 20;
  const sx = (v: number) => GUT + ((Math.log10(Math.max(v, 10 ** lo)) - lo) / Math.max(1, hi - lo)) * (W - GUT - 16);
  const H = lenders.length * ROW + 26;
  const twinRows: Row[] = empty || f.tiers.size === 0 ? [] : lenders.flatMap((l) => rows.filter((e) => e.s === l.id).map((e) => {
    const lf = LOAN_FACT(e);
    const status = lf && (!lf.countable || lf.countedAs) ? (lf.countedAs ? `counted under ${pToken(nodeOf(lf.countedAs)?.label) ?? lf.countedAs}` : `not a commitment: ${lf.notCountableReason ?? 'reason not recorded'}`) : 'listed, not summed';
    return {
      cells: [l.label, <OpenRecord key="o" id={e.id!} lab={e.lab ?? e.id!}>{e.lab ?? e.id}</OpenRecord>, e.from ?? 'undated', amountCell(e).text, instrumentOf(e) ?? 'instrument not in the record', status, <TierWord key="t" tier={e.tier} />, <Src key="s" srcs={e.srcs} of={e.lab ?? e.id!} />],
      out: [l.label, e.id, e.from ?? '', hasRupee(e) ? e.a : '', instrumentOf(e) ?? '', status, e.tier, (e.srcs ?? []).map((x) => x[1]).join('|')],
    };
  }));
  return (
    <>
    <figure className="m-0 mt-10 min-w-0" aria-labelledby={`${uid}-h`}>
      <h3 id={`${uid}-h`} className="text-[16px] font-semibold text-text mb-1">{STRIP_H3}</h3>
      <SkipLinks twins={[{ twin: 'records-strip', title: STRIP_H3 }]} />
      {empty ? <p className="text-[14px]">{NOTHING}</p> : !rows.length ? <p className="text-[14px] text-text-secondary">No researched records from other lenders match these filters.</p> : (
        <div style={{ overflowX: narrow ? 'hidden' : 'auto' }}>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" aria-hidden="true" style={{ minWidth: narrow ? 0 : 560, display: 'block' }} aria-describedby={captionId}>
            <text x={4} y={12} fontSize="10" fill="rgb(170,170,170)">{NO_AMOUNT}</text>
            {Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).map((p) => (
              <g key={p}><line x1={sx(10 ** p)} x2={sx(10 ** p)} y1={16} y2={H} stroke="rgba(150,150,150,0.2)" /><text x={sx(10 ** p)} y={12} fontSize="10" textAnchor="middle" fill="rgb(170,170,170)">{`₹${fmtCr(10 ** p)} cr`}</text></g>
            ))}
            {lenders.map((l, i) => {
              const y = 22 + i * ROW;
              const mine = rows.filter((e) => e.s === l.id);
              return (
                <g key={l.id}>
                  <text x={GUT - 6} y={y + ROW / 2} fontSize="10" textAnchor="end" dominantBaseline="central" fill="rgb(210,210,210)">{l.label.length > 26 ? `${l.label.slice(0, 25)}…` : l.label}</text>
                  {mine.map((e, j) => {
                    const lf = LOAN_FACT(e);
                    const hollow = !!lf && (!lf.countable || !!lf.countedAs);
                    const x = hasRupee(e) && (e.a as number) > 0 ? sx(e.a as number) : 10 + (j % 12) * 5;
                    return hollow
                      ? <rect key={e.id} data-mark="" x={x - 2} y={y + 3} width={4} height={ROW - 6} fill="none" stroke="rgb(220,220,220)" strokeWidth={1} strokeDasharray={TIERS[e.tier].dash || undefined}><title>{`${e.lab}: ${lf?.countedAs ? `counted under ${lf.countedAs}` : `not a commitment: ${lf?.notCountableReason ?? ''}`}`}</title></rect>
                      : <line key={e.id} data-mark="" x1={x} x2={x} y1={y + 2} y2={y + ROW - 2} stroke="rgb(220,220,220)" strokeWidth={1.4} strokeDasharray={TIERS[e.tier].dash || undefined}><title>{e.lab}</title></line>;
                  })}
                </g>
              );
            })}
          </svg>
        </div>
      )}
      <Caption id={captionId} cap="C5" as="figcaption">
        {`Each mark is one record as researched. Records are not added up: the research found facilities beside their tranches, non-binding memoranda, a portfolio aggregate and one loan recorded in two files. The instrument column in the table says which is which. World Bank rows here were researched by hand for their conditions, and the same project may also be in the census above (${DUP_TOKENS.length} share a project id with a census record).`}
      </Caption>
    </figure>
      <Twin twin="records-strip" title={STRIP_H3} rowCount={twinRows.length} open={f.view === 'table'}>
        {() => (
          <ScrollBox label={`${STRIP_H3} — table`}>
            <ul className="list-none p-0 my-2 text-[13px] text-text-secondary">
              {lenders.map((l) => <li key={l.id}>{`${l.label}: ${rows.filter((e) => e.s === l.id).length} records in this register, a researched sample, not ${l.label}'s India portfolio`}</li>)}
            </ul>
            <Exports name={STRIP_H3} twin="records-strip" meta={{ table: STRIP_H3, population: 'researched loan records in view, one row per mark; never summed', lens: 'loans', filters: filterText, rows: twinRows.length, amounts: true }}
              header={['lender', 'id', 'from', 'a_cr', 'instrument', 'counting_status', 'tier', 'source_urls']} rows={() => twinRows.map((r) => r.out)} />
            <Table caption={captionLine(twinRows.length, 'researched loan records in view, grouped by lender', 'loans', filterText)} className="min-w-[56rem]"
              cols={[{ key: 'l', label: 'Lender' }, { key: 'r', label: 'Record' }, { key: 'f', label: 'Approved' }, { key: 'a', label: 'Amount' }, { key: 'i', label: 'Instrument' }, { key: 'c', label: 'Counting status' }, { key: 't', label: 'Tier' }, { key: 's', label: 'Sources' }]}
              rows={twinRows.length ? twinRows : [{ cells: [NOTHING], out: [] }]} />
          </ScrollBox>
        )}
      </Twin>
    </>
  );
}

// ---------------------------------------------------------------------------
// ProjectList (§5.1.5): the table readers act on, paged, never truncated
// ---------------------------------------------------------------------------

export const LIST_H3 = 'Every loan record';

const byDateDesc = (a: GEdge, b: GEdge) => (a.from && b.from ? (a.from < b.from ? 1 : a.from > b.from ? -1 : 0) : a.from ? -1 : b.from ? 1 : 0) || ((a.id ?? '') < (b.id ?? '') ? -1 : 1);

export const MACHINE = ['id', 'domain', 'inclusion', 'project_key', 'lender_id', 'borrower_id', 'a_cr', 'from', 'to', 'date_precision', 'approval_year', 'placement_st', 'placement_rule', 'body_st', 'tier', 'instrument', 'conditions_n', 'contracts_n', 'source_urls'];

function listCells(e: GEdge): { cells: ReactNode[]; display: string[]; machine: (string | number)[] } {
  const b = benefitOf(e);
  const who = b?.who ? (nodeOf(b.who) ? labelOf(b.who) : `"${b.who}" (not a node)`) : 'not recorded';
  const amt = amountCell(e);
  const conds = conditionsOf(e);
  const contracts = contractsFor(e);
  const lf = LOAN_FACT(e);
  const borrower = `${labelOf(e.t)}${borrowerDefaulted(e) ? ' (API blank — Union recorded by default)' : ''}`;
  const approved = `${e.from ?? 'undated'}${isFutureDated(e) ? ' · after register date' : ''}`;
  const condText = conds.length ? `${conds.length} conditions` : isCensus(e) ? 'none recorded: the Projects API carries no conditions (void)' : 'none recorded';
  const counting = lf && (!lf.countable || lf.countedAs) ? (lf.countedAs ? `counted under ${lf.countedAs}` : `not a commitment: ${lf.notCountableReason ?? 'reason not recorded'}`) : lf?.pipeline ? 'pipeline, not yet approved' : 'countable';
  const display = [approved, labelOf(e.s), e.lab ?? e.id ?? '', borrower, who, placeText(e), amt.text, INCLUSION_WORDS[inclusion(e)], instrumentOf(e) ?? 'instrument not in the record', condText, contracts.length ? `${contracts.length} contracts` : 'none linked', officeText(e), e.tier, (e.srcs ?? []).map((s) => s[0]).join('; '), ...(G1 ? [counting] : [])];
  const cells: ReactNode[] = [
    approved,
    <RowActions key="l"><Connect id={e.s} label={labelOf(e.s)} /></RowActions>,
    <RowActions key="r"><OpenRecord id={e.id!} lab={e.lab ?? e.id!}>{e.lab ?? e.id}</OpenRecord></RowActions>,
    borrower, who, placeText(e),
    <span key="a" title={amt.title} className="font-mono tabular-nums">{amt.text}</span>,
    INCLUSION_WORDS[inclusion(e)],
    instrumentOf(e) ?? 'instrument not in the record',
    condText,
    contracts.length ? `${contracts.length} contracts` : 'none linked',
    officeCell(e),
    <TierWord key="t" tier={e.tier} />,
    <Src key="s" srcs={e.srcs} of={e.lab ?? e.id!} />,
    ...(G1 ? [counting] : []),
  ];
  const place = strictSt(e) ?? (lf?.st ?? '');
  const machine: (string | number)[] = [
    e.id ?? '', MODULES.loans.domainOf[e.id ?? ''] ?? 'capital', inclusion(e), projectKey(e) ?? '', e.s, e.t, hasRupee(e) ? (e.a as number) : '', e.from ?? '', e.to ?? '',
    precisionOf(e.from ?? e.to), yearOf(e.from) ?? '', place, placeText(e), bodySt(e) ?? '', e.tier, instrumentOf(e) ?? '', conds.length, contracts.length, (e.srcs ?? []).map((s) => s[1]).join('|'),
  ];
  return { cells, display, machine };
}
export const LIST_COLS: Col[] = [
  { key: 'approved', label: 'Approved' }, { key: 'lender', label: 'Lender' }, { key: 'record', label: 'Record' }, { key: 'borrower', label: 'Borrower' },
  { key: 'impl', label: 'Implementing' }, { key: 'place', label: 'Placed in' }, { key: 'cr', label: '₹ cr' }, { key: 'totals', label: 'In totals' },
  { key: 'instrument', label: 'Instrument' }, { key: 'cond', label: 'Conditions' }, { key: 'contracts', label: 'Contracts' },
  { key: 'office', label: 'Office window covers approval (date test)' }, { key: 'tier', label: 'Tier' }, { key: 'src', label: 'Sources' },
  ...(G1 ? [{ key: 'counting', label: 'Counting status' }] : []),
];

export function ProjectList({ f, onPage }: { f: Filters; onPage: (tp: number) => void }) {
  const { filters: filterText, empty, narrow, patch, hrefWith, listFocus, setListFocus, announce } = usePage();
  const all = useMemo(() => (f.tiers.size ? LOANS.filter((e) => loanPass(f, e)).sort(byDateDesc) : []), [f]);
  const rows = useMemo(() => (listFocus ? all.filter((e) => listFocus.ids.has(e.id ?? '')) : all), [all, listFocus]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const tp = Math.min(f.tp, pages);
  const a = rows.length ? (tp - 1) * PAGE_SIZE + 1 : 0;
  const b = Math.min(rows.length, tp * PAGE_SIZE);
  const pageRows = rows.slice(a ? a - 1 : 0, b);
  const shownRows: Row[] = empty ? [] : pageRows.map((e) => { const c = listCells(e); return { cells: c.cells, out: [...c.display, ...c.machine], attrs: { 'data-inclusion': inclusion(e) } }; });
  const exportRows = () => (empty ? [] : rows.map((e) => { const c = listCells(e); return [...c.display, ...c.machine]; }));
  const header = [...LIST_COLS.map((c) => c.label), ...MACHINE];
  const cap = `${rows.length} of ${LOANS.length} loan records · filters: ${filterText || 'none'}${listFocus ? ` · narrowed to ${listFocus.label}` : ''}${pages > 1 ? ` · page ${tp} of ${pages}` : ''} · as of ${FINANCE_ASOF ?? 'not promoted'} · ${MODULES.loans.meta.runId}`;
  // The most-removing filter, named with a one-click reset of it (energy empty state).
  const removing = (() => {
    const base = LOANS.length;
    const tries: [string, Partial<Record<'y' | 'st' | 'lender' | 'tier' | 'inc', boolean>>][] = [['y', { y: true }], ['st', { st: true }], ['lender', { lender: true }], ['tier', { tier: true }], ['inc', { inc: true }]];
    let best: string | null = null; let gain = -1;
    for (const [k, skip] of tries) { const n = LOANS.filter((e) => loanPass(f, e, skip)).length; if (n > gain && n < base + 1 && n > rows.length) { gain = n; best = k; } }
    return best;
  })();
  const adjacent = (() => {
    if (f.yFrom == null || f.yFrom !== f.yTo) return [];
    const years = [...new Set(LOANS.map((e) => yearOf(e.from)).filter((y): y is number => y != null))].sort((x, y) => x - y);
    const before = years.filter((y) => y < (f.yFrom as number)).pop();
    const after = years.find((y) => y > (f.yFrom as number));
    return [before, after].filter((y): y is number => y != null);
  })();
  const pager = rows.length > PAGE_SIZE ? (
    <p className="font-mono text-[12px] text-text-secondary flex flex-wrap gap-3 items-center my-2">
      <span>{`rows ${a}–${b} of ${rows.length}`}</span>
      <button type="button" disabled={tp <= 1} onClick={() => onPage(tp - 1)} className="underline disabled:no-underline disabled:opacity-50">Previous</button>
      <button type="button" disabled={tp >= pages} onClick={() => onPage(tp + 1)} className="underline disabled:no-underline disabled:opacity-50">Next</button>
    </p>
  ) : <p className="font-mono text-[12px] text-text-secondary my-2">{`rows ${a}–${b} of ${rows.length}`}</p>;
  return (
    <section className="mt-10 min-w-0" aria-labelledby="fin-list-h">
      <h3 id="fin-list-h" className="text-[16px] font-semibold text-text mb-1">{LIST_H3}</h3>
      <SkipLinks twins={[{ twin: 'project-list', title: LIST_H3 }]} />
      {f.inc && (
        <p className="font-mono text-[12px] text-text-secondary my-1">
          {`inc=${f.inc}: `}<span>{LOANS.length} <span aria-hidden="true">→</span> {rows.length}</span><span className="sr-only">{` from ${LOANS.length} to ${rows.length}`}</span>{' · '}
          <a href={`#/finance${hrefWith({ inc: null, tp: null })}`} onClick={(e) => { e.preventDefault(); patch({ inc: null, tp: null }); }} className="underline">remove</a>
        </p>
      )}
      {listFocus && (
        <p data-list-focus="" className="font-mono text-[12px] text-text-secondary my-1">
          {`${listFocus.label}: `}<span aria-hidden="true">{all.length} → {rows.length}</span><span className="sr-only">{`from ${all.length} to ${rows.length} records`}</span>{' records · '}
          <button type="button" className="underline" onClick={() => { setListFocus(null); announce(`the project list shows every record in view again: ${all.length}`); }}>remove</button>
        </p>
      )}
      {f.st && !empty && <StateGroups f={f} />}
      {!empty && !rows.length && (
        <p className="text-[14px] text-text-secondary my-2">
          {`No loan record matches ${filterText || 'these filters'}. `}
          {removing && <button type="button" className="underline" onClick={() => patch({ [removing]: null, tp: null })}>{`reset ${removing}`}</button>}
          {adjacent.length > 0 && <> Nearest years with records: {adjacent.map((y, i) => <span key={y}>{i > 0 ? ' · ' : ''}<a href={`#/finance${hrefWith({ y: String(y), tp: null })}`} onClick={(e) => { e.preventDefault(); patch({ y: String(y), tp: null }); }} className="underline">{y}</a></span>)}</>}
        </p>
      )}
      <p className="text-[13.5px] text-text-secondary max-w-[72ch]">One row per record. A record is one lending leg; a blended project has an IBRD leg and an IDA leg. Amounts are the lender&apos;s commitment at approval, not disbursement. Contracts are a sample the research opened, not every contract. Office-holders are those whose recorded window covers the approval date: the date test, not a signature.</p>
      <Twin twin="project-list" title={LIST_H3} rowCount={rows.length} open={f.view === 'table' || !!f.inc || f.tp > 1 || !!listFocus}>
        {() => (
          <div className="min-w-0">
            <Exports name={LIST_H3} twin="project-list" meta={{ table: LIST_H3, population: 'every loan record in view, census and researched, never summed across populations', lens: 'loans', filters: filterText, rows: rows.length, paged: `${a}–${b}`, amounts: true }}
              header={header} rows={exportRows} />
            {pager}
            {narrow
              ? <Cards cols={LIST_COLS} rows={shownRows.length ? shownRows : [{ cells: [NOTHING], out: [] }]} caption={cap} />
              : (
                <ScrollBox label={`${LIST_H3} — table`}>
                  <Table caption={cap} cols={LIST_COLS} rows={shownRows.length ? shownRows : [{ cells: [NOTHING], out: [] }]} sortCol="approved" className="min-w-[110rem]"
                    captionRef={(el) => { if (el) el.setAttribute('data-list-caption', ''); }} />
                </ScrollBox>
              )}
          </div>
        )}
      </Twin>
    </section>
  );
}

/** Under `st` (U5): three labelled groups, none collapsed, whose counts equal the map readout's and the panel's. */
export function stateGroups(f: Filters) {
  const noSt: Filters = { ...f, st: null };
  const pool = LOANS.filter((e) => loanPass(noSt, e, { inc: true }));
  const st = f.st;
  const placed = pool.filter((e) => isCensus(e) && strictSt(e) === st);
  const fetcher = pool.filter((e) => isCensus(e) && !strictSt(e) && LOAN_FACT(e)?.st === st);
  const body = pool.filter((e) => isCensus(e) && bodySt(e) === st);
  const researched = pool.filter((e) => !isCensus(e) && strictSt(e) === st);
  return { placed, fetcher, body, researched };
}
function StateGroups({ f }: { f: Filters }) {
  const g = stateGroups(f);
  const name = stateName(f.st!);
  const list = (rows: GEdge[]) => rows.length ? (
    <ul className="list-none p-0 m-0 text-[13px] space-y-1">
      {rows.map((e) => <li key={e.id}>{`${e.from ?? 'undated'} · ${labelOf(e.s)} · ${amountCell(e).text} · `}<OpenRecord id={e.id!} lab={e.lab ?? e.id!}>{e.lab ?? e.id}</OpenRecord></li>)}
    </ul>
  ) : <p className="text-[13px] text-text-muted">none recorded</p>;
  return (
    <div className="border border-border rounded p-3 my-2 space-y-2">
      <p className="text-[13.5px] text-text">{`Placed in ${name} — the state government is the borrower or implements: ${g.placed.length} census records placed`}</p>
      {list(g.placed)}
      {G1 && <><p className="text-[13.5px] text-text">{`Placed in ${name} by the fetcher's rule only (state agency, seat or title): ${g.fetcher.length} census records`}</p>{list(g.fetcher)}</>}
      <p className="text-[13.5px] text-text">{`Names a body registered in ${name}: ${g.body.length} name a body registered here — not placed, not in the fill`}</p>
      {list(g.body)}
      <p className="text-[13.5px] text-text">{`Researched records naming ${name} government: ${g.researched.length} researched records name this state government — listed, not summed`}</p>
      {list(g.researched)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Contracts, debarments, conditions and rules, debt context
// ---------------------------------------------------------------------------

export function ContractsSection({ f, captionId }: { f: Filters; captionId: string }) {
  const { empty, filters: filterText, narrow } = usePage();
  const rows = CONTRACTS.filter((e) => f.tiers.has(e.tier) && (f.yFrom == null || (yearOf(e.from) ?? -1) >= f.yFrom && (yearOf(e.from) ?? 99999) <= (f.yTo ?? f.yFrom)));
  const keyed = rows.filter((e) => projectKey(e));
  const unkeyed = rows.filter((e) => !projectKey(e));
  const debarredOf = (id: string) => DEBARMENTS.filter((d) => d.t === id);
  const cols: Col[] = [
    { key: 'signed', label: 'Signed' }, { key: 'awarder', label: 'Awarder' }, { key: 'contractor', label: 'Contractor' }, { key: 'pkg', label: 'Package' },
    { key: 'cr', label: '₹ cr' }, { key: 'proj', label: 'Project' }, { key: 'bids', label: 'Bidders and prices as recorded' }, { key: 'how', label: 'How it benefited' },
    { key: 'deb', label: 'Debarment status' }, { key: 'tier', label: 'Tier' }, { key: 'resp', label: 'Response' }, { key: 'src', label: 'Sources' },
  ];
  const toRow = (e: GEdge): Row => {
    const k = projectKey(e);
    const loan = k ? loanForProject(k) : null;
    const deb = debarredOf(e.t);
    return {
      cells: [
        e.from ?? 'undated', <RowActions key="a"><Connect id={e.s} label={labelOf(e.s)} /></RowActions>, <RowActions key="c"><Connect id={e.t} label={labelOf(e.t)} /></RowActions>,
        <RowActions key="p"><OpenRecord id={e.id!} lab={e.lab ?? e.id!}>{e.lab ?? e.id}</OpenRecord></RowActions>,
        hasRupee(e) ? `₹${fmtCr(e.a as number)} cr — contract value` : 'amount not stated',
        loan ? <RowActions key="l"><OpenRecord id={loan.id!} lab={loan.lab ?? loan.id!}>{k}</OpenRecord></RowActions> : k ? `${k}: no census record in view` : 'project not identified in the record',
        <Q key="d">{e.d ?? 'not stated'}</Q>, benefitOf(e)?.how ?? 'no cui-bono row recorded',
        deb.length ? deb.map((d) => `debarred ${d.from ?? 'undated'} to ${d.to ?? 'no end date in the feed'}`).join('; ') : 'no debarment recorded',
        <TierWord key="t" tier={e.tier} />, <ResponseCell key="r" id={e.id} />, <Src key="s" srcs={e.srcs} of={e.lab ?? e.id!} />,
      ],
      out: [],
    };
  };
  const awarders = [...new Set(unkeyed.map((e) => e.s))];
  return (
    <section id="contracts" className="pt-12">
      <h2 className="heading-editorial font-bold text-2xl border-b border-border-light pb-2.5 mb-3">Contracts paid for by these loans</h2>
      {empty ? <p className="text-[14px]">{NOTHING}</p> : (
        <>
          <Denominator>{`${CONTRACTS.length} contract awards recorded, under ${contractProjects.size} of ${censusProjects} census projects · ${unattachedContracts.length} not linked to a project. Award notices publish a bid count for ${BID_COUNT_BASE ? `${BID_COUNT_BASE.k} of ${BID_COUNT_BASE.n}` : 'an unrecorded number of'} sampled notices (${BID_COUNT_BASE ? 'the k is computed here, as the base rate\'s notices less those it records with no observable bid count' : 'base rate, contracts'}).`}</Denominator>
          {!CONTRACTS.length ? <p className="text-[14px]">No contract awards in the register.</p> : (
            <>
              <DataRows cols={cols} rows={keyed.map(toRow)} caption={captionLine(keyed.length, 'contract awards keyed to a World Bank project id', 'loans', filterText)} describedBy={captionId} cards={narrow} />
              <Caption id={captionId} cap="C6">These are contracts the research opened, not every contract under these loans. After 2016 the World Bank publishes only the winning firm for most notices, so losing bids are usually absent. A contractor winning several packages is shown in the rows, not scored.</Caption>
              <h3 className="text-[15px] font-semibold mt-4">{`Awards not keyed to a World Bank project id (${unkeyed.length})`}</h3>
              {awarders.map((aw) => (
                <div key={aw} className="mt-2">
                  <p className="text-[13px] text-text-secondary">{`Awarder: ${labelOf(aw)}`}</p>
                  <DataRows cols={cols} rows={unkeyed.filter((e) => e.s === aw).map(toRow)} caption={captionLine(unkeyed.filter((e) => e.s === aw).length, `awards by ${labelOf(aw)} with no project id in the record`, 'loans', filterText)} cards={narrow} />
                </div>
              ))}
            </>
          )}
        </>
      )}
    </section>
  );
}

export function DebarmentsSection({ f, captionId }: { f: Filters; captionId: string }) {
  const { empty, filters: filterText, narrow } = usePage();
  const rows = DEBARMENTS.filter((e) => f.tiers.has(e.tier));
  const cols: Col[] = [
    { key: 'from', label: 'Debarred from' }, { key: 'to', label: 'Until' }, { key: 'firm', label: 'Firm' }, { key: 'ground', label: 'Ground as recorded' },
    { key: 'awardee', label: 'Also an awardee in this register' }, { key: 'tier', label: 'Tier' }, { key: 'resp', label: 'Response' }, { key: 'src', label: 'Sources' },
  ];
  const contractsBase = MODULES.loans.baseRates.filter((r) => r.domain === 'contracts');
  return (
    <section id="debarments" className="pt-12">
      <h2 className="heading-editorial font-bold text-2xl border-b border-border-light pb-2.5 mb-3">Firms the World Bank debarred</h2>
      {empty ? <p className="text-[14px]">{NOTHING}</p> : (
        <>
          <Denominator>{`${DEBARMENTS.length} World Bank debarments of India-based firms recorded · ${debarredOverlap.length} of ${distinctDebarredFirms.size} debarred firms appear among the ${distinctContractors.size} distinct contractors in this register's ${CONTRACTS.length} awards`}</Denominator>
          {!DEBARMENTS.length ? <p className="text-[14px]">No debarments in the register.</p> : (
            <>
              <DataRows cols={cols} describedBy={captionId} cards={narrow} caption={captionLine(rows.length, 'World Bank debarments of India-based firms in view', 'loans', filterText)}
                rows={rows.map((e) => ({
                  cells: [e.from ?? 'undated', e.to ?? 'open: no end date in the feed', <RowActions key="f"><Connect id={e.t} label={labelOf(e.t)} /></RowActions>,
                    <span key="g"><OpenRecord id={e.id!} lab={e.lab ?? e.id!}>{e.lab ?? e.id}</OpenRecord>{' '}<Q>{e.d ?? ''}</Q></span>,
                    distinctContractors.has(e.t) ? 'yes' : 'no', <TierWord key="t" tier={e.tier} />, <ResponseCell key="r" id={e.id} />, <Src key="s" srcs={e.srcs} of={e.lab ?? e.id!} />],
                  out: [],
                }))} />
              <Caption id={captionId} cap="C7">A debarment is the Bank&apos;s own sanctions decision, not a court finding. The feed rarely names the project. The overlap with awardees is computed here over a sample of contracts; zero here is a statement about the sample.</Caption>
              <ul className="list-none p-0 mt-2 space-y-1 text-[13px]">{contractsBase.map((r, i) => <li key={i}><BaseRateLine r={r} /></li>)}</ul>
            </>
          )}
        </>
      )}
    </section>
  );
}

export function ConditionsSection({ f }: { f: Filters }) {
  const { empty, filters: filterText, narrow } = usePage();
  const withCond = LOANS.filter((e) => conditionsOf(e).length > 0);
  const condRows: Row[] = withCond.filter((e) => f.tiers.has(e.tier)).flatMap((e) => conditionsOf(e).map((c, i) => ({
    cells: [<RowActions key="r"><OpenRecord id={e.id!} lab={e.lab ?? e.id!}>{e.lab ?? e.id}</OpenRecord></RowActions>, <Q key="c">{c}</Q>, <TierWord key="t" tier={e.tier} />, i === 0 ? <Src key="s" srcs={e.srcs} of={e.lab ?? e.id!} /> : 'as above'],
    out: [],
  })));
  const rules = RULES_FIN.filter((e) => f.tiers.has(e.tier));
  return (
    <section id="conditions" className="pt-12">
      <h2 className="heading-editorial font-bold text-2xl border-b border-border-light pb-2.5 mb-3">Conditions and rules</h2>
      {empty ? <p className="text-[14px]">{NOTHING}</p> : (
        <>
          <Denominator>{`Conditions recorded for ${withCond.length} of ${LOANS.length} loan records. The World Bank API carries none: see What this lens cannot show.`}</Denominator>
          <h3 className="text-[15px] font-semibold mt-2">Loan conditions</h3>
          <DataRows cols={[{ key: 'l', label: 'Loan' }, { key: 'c', label: 'Condition' }, { key: 't', label: 'Tier' }, { key: 's', label: 'Sources' }]} rows={condRows.length ? condRows : [{ cells: ['none recorded'], out: [] }]}
            caption={captionLine(condRows.length, 'conditions as the loan records word them, one row per condition', 'loans', filterText)} cards={narrow} />
          <h3 className="text-[15px] font-semibold mt-4">Rules and orders on external finance</h3>
          <DataRows cols={[{ key: 'r', label: 'Rule' }, { key: 'g', label: 'Governed' }, { key: 'd', label: 'Dates' }, { key: 'b', label: 'Who benefits' }, { key: 'i', label: 'Innocent reading' }, { key: 'u', label: 'Upgrade if / kill if' }, { key: 's', label: 'Sources' }]}
            caption={captionLine(rules.length, 'rule edges in the finance register', 'loans', filterText)} cards={narrow}
            rows={rules.length ? rules.map((e) => {
              const b = benefitOf(e);
              return {
                cells: [<RowActions key="r"><OpenRecord id={e.id!} lab={e.lab ?? e.id!}>{e.lab ?? e.id}</OpenRecord></RowActions>, labelOf(e.t), `${e.from ?? 'undated'} to ${e.to ?? 'in force, end not recorded'}`,
                  b ? `${labelOf(b.who)}: ${b.how ?? 'how not recorded'}` : <span key="b" className="text-amber">No cui-bono row recorded</span>, e.innocentReading ?? 'not recorded',
                  `${e.upgradeIf ?? 'not recorded'} / ${e.killIf ?? 'not recorded'}`, <Src key="s" srcs={e.srcs} of={e.lab ?? e.id!} />],
                out: [],
              };
            }) : [{ cells: ['none recorded'], out: [] }]} />
        </>
      )}
    </section>
  );
}

const DEBT_COLS: Col[] = [{ key: 'p', label: 'Row', th: true }, { key: 'v', label: 'Figure' }, { key: 'l', label: 'What the denominator is' }, { key: 's', label: 'Sources' }];

export function DebtSection() {
  const { empty, filters: filterText, narrow } = usePage();
  const mod = MODULES.loans;
  const rows = mod.baseRates.filter((r) => r.domain === 'debt-imf-people');
  const voids = mod.voids.filter((v) => v.domain === 'debt-imf-people');
  const sym = mod.symmetry.filter((s) => s.domain === 'debt-imf-people');
  return (
    <section id="debt" className="pt-12">
      <h2 className="heading-editorial font-bold text-2xl border-b border-border-light pb-2.5 mb-3">India&apos;s external debt, for context</h2>
      {empty ? <p className="text-[14px]">{NOTHING}</p> : !rows.length ? <p className="text-[14px]">No external-debt context rows in this build.</p> : (
        <>
          {narrow && <p className="font-mono text-[12px] text-text-muted">{`${DEBT_COLS.length} columns · scroll → for the rest`}</p>}
          <div role="region" aria-label="External debt context rows" tabIndex={0} className="overflow-x-auto">
            <Table caption={captionLine(rows.length, 'external-debt base-rate rows from World Bank series', 'loans', filterText)} className="min-w-[40rem]"
              cols={DEBT_COLS}
              rows={rows.map((r) => ({ cells: [<Q key="p">{r.property}</Q>, r.numerator != null && r.denominator != null ? `${fmtCr(r.numerator)} of ${fmtCr(r.denominator)}` : 'not computed in this file', <Q key="l">{r.label ?? 'not stated'}</Q>, <Src key="s" srcs={r.srcs} of={r.property} />], out: [] }))} />
          </div>
          {sym.map((s, i) => <p key={i} className="text-[14px] fin-q my-2 max-w-[72ch]">{s.text}</p>)}
          {voids.map((v, i) => <p key={i} className="text-[14px] my-2 max-w-[72ch]"><span className="text-amber">Void: </span><Q>{v.what}</Q></p>)}
          <p className="text-[14px] text-text-secondary max-w-[72ch]">What the loans above are part of. The official external-debt status reports were unreachable from this environment; these rows come from World Bank series.</p>
        </>
      )}
    </section>
  );
}

export { CENSUS };
