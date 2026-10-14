import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { TIERS, type GEdge, type Tier } from '../../graph/schema';
import {
  type Filters, COLUMNS, BAND_A, BAND_B, BAND_A_FLOOR, OWN_IDX, OWN_OUTSIDE, cell, columnStatus, holderSummary, RESEARCHED_COLS, NO_RECORD_COLS,
  FILING_DATES, lineKind, pctOf, labelOf, holderLabel, inBandA, MANDATES, LICENCES, ADVISERS, RULES_CAP, benefitOf, responseText, fmtCr, finite,
  monthsBetween, licenceApplied, MODULES, CAPITAL_NARRATIVE_IDS, quartersOf, coverageOf, INDEX_CHANGES, AWARDS_CAP, type BandRow, type CellState,
  yearOf, ASOF, inYear, weakest, ROLE_WORDS,
} from '../../data/financeView';
import type { Constituent } from '../../data/indices';
import { Caption, Twin, Table, Exports, usePage, SkipLinks, captionLine, TierWord, Src, OpenRecord, Connect, RowActions, Q, NOTHING, Denominator, ResponseCell, type Row, ScrollBox } from './ui';
import { BaseRateLine } from './Control';
import { DataRows } from './LoansLens';

/**
 * Capital (spec §5.3). The holder matrix always draws its comparison set; `holder`
 * highlights and never filters; a filing line and a research aggregate are never
 * added, never worded alike and never drawn alike. No percentage is parsed from prose:
 * a cell prints the structured `pct` (G3a) or its state in words, and never a ramp.
 */

export const MATRIX_H3 = 'Named holders in NIFTY 50 filings';
export const COLS_H3 = 'Which companies the filings cover';
export const OUTSIDE_H3 = 'Holdings outside the index';
export const RULES_H3 = 'Rules on foreign capital, by date in force';

const STATE_WORD: Record<CellState, string> = {
  line: 'filing line at ≥1%',
  aggregate: 'aggregate, analytic, lower bound',
  'not-named': 'not named ≥1% in the filing recorded',
  filtered: 'outside the tier filter',
  'no-record': 'no named holder recorded for this company',
  'not-read': 'not read: no filing was opened for this company',
};
/** The tier filter hides a recorded holding: say which tiers, never "not named". */
const filteredWords = (edges: GEdge[]) => `outside the tier filter: ${[...new Set(edges.map((e) => e.tier))].join(', ')} lines not shown`;
/** A cell's state in words, for its name, its title and the grid TSV alike. */
const stateWords = (state: CellState, edges: GEdge[]) => (state === 'filtered' ? filteredWords(edges) : STATE_WORD[state]);

function cellName(state: CellState, edges: GEdge[], all: GEdge[]): string {
  if (state === 'line') {
    const lines = edges.filter((e) => lineKind(e) === 'filing');
    const aggs = all.filter((e) => lineKind(e) === 'aggregate');
    const tiers = [...new Set(lines.map((e) => e.tier))].join(', ');
    return `filing line ≥1% ×${lines.length}, ${tiers}, filed ${[...new Set(lines.map((e) => e.from ?? 'date not recorded'))].join(', ')}${lines.map((e) => (pctOf(e) != null ? ` · ${pctOf(e)}% as the filing prints it` : '')).join('')}${aggs.length ? ` · and an aggregate, analytic, lower bound, of fund holdings files` : ''}`;
  }
  if (state === 'aggregate') return `aggregate, analytic, lower bound, ${edges.length} files, as of ${edges.map((e) => e.from ?? 'date not recorded').join(', ')}; no filing names this holder at ≥1%`;
  if (state === 'not-named') return 'not named ≥1% in the filing recorded';
  if (state === 'filtered') return filteredWords(all);
  if (state === 'not-read') return 'not read: no filing was opened for this company';
  return 'no named holder recorded for this company';
}
function cellText(state: CellState, edges: GEdge[]): string {
  if (state === 'line') {
    const lines = edges.filter((e) => lineKind(e) === 'filing');
    const p = pctOf(lines[0]);
    const agg = edges.some((e) => lineKind(e) === 'aggregate');
    return `${p != null ? `${p}%` : '≥1%'}${lines.length > 1 ? ` ×${lines.length}` : ''}${agg ? ' Σ' : ''}`;
  }
  if (state === 'aggregate') return 'Σ agg.';
  if (state === 'not-named') return '○';
  if (state === 'filtered') return '◌';
  return '·';
}
const HATCH_BG = 'repeating-linear-gradient(45deg, rgba(201,168,108,0.45) 0 1px, transparent 1px 6px)';

/**
 * A cell's border as an SVG rect, so it can carry the house tier dash exactly (a CSS
 * border-style has only "dashed" and "dotted", which read as reported and alleged). The
 * rect sits 1px inside the cell and overflows its box by half the stroke.
 */
function CellFrame({ inset, dash, stroke, width }: { inset: number; dash: string; stroke: string; width: number }) {
  return (
    <svg aria-hidden="true" style={{ position: 'absolute', top: inset, left: inset, right: inset, bottom: inset, width: `calc(100% - ${2 * inset}px)`, height: `calc(100% - ${2 * inset}px)`, overflow: 'visible', pointerEvents: 'none' }}>
      <rect x="0" y="0" width="100%" height="100%" fill="none" stroke={stroke} strokeWidth={width} strokeDasharray={dash || undefined} />
    </svg>
  );
}
/** The dash of a set of claims drawn as one mark: its weakest tier (§8.2-1). */
const dashOf = (tiers: Tier[]) => TIERS[weakest(tiers)].dash;
const roleText = (role: string) => (ROLE_WORDS[role] ? ROLE_WORDS[role] : '');

export function HolderMatrix({ f, captionId }: { f: Filters; captionId: string }) {
  const { narrow, filters: filterText, empty, patch, openRecord, announce } = usePage();
  const uid = useId().replace(/:/g, '');
  const [pos, setPos] = useState<[number, number]>([0, 0]);
  const grid = useRef<HTMLTableElement>(null);
  const guard = BAND_A.length < BAND_A_FLOOR;
  const holders: (BandRow & { band: 'A' | 'B' })[] = [...BAND_A.map((r) => ({ ...r, band: 'A' as const })), ...BAND_B.map((r) => ({ ...r, band: 'B' as const }))];
  const selected = f.holder;
  const extra = selected && !inBandA(selected) && BAND_B.some((r) => r.id === selected) ? BAND_B.find((r) => r.id === selected)! : null;
  // Transposed below 640px: companies are rows, Band A (and a selected Band B holder) are columns.
  const rowsH = narrow ? COLUMNS.map((c) => c) : holders;
  const colsH = narrow ? [...BAND_A.map((r) => ({ ...r, band: 'A' as const })), ...(extra ? [{ ...extra, band: 'B' as const }] : [])] : COLUMNS;
  const nRows = rowsH.length; const nCols = colsH.length;
  // Band A's role sub-header rows (one per run of a declared role), counted in aria-rowcount.
  const roleHeads = BAND_A.some((x) => x.role !== 'comparison') ? BAND_A.filter((x, i) => i === 0 || BAND_A[i - 1].role !== x.role).length : 0;
  const cellAt = (r: number, c: number) => {
    const holder = narrow ? (colsH[c] as BandRow).id : (rowsH[r] as BandRow).id;
    const company = narrow ? (rowsH[r] as Constituent) : (colsH[c] as Constituent);
    return { holder, company, ...cell(holder, company, f.tiers) };
  };
  const focusCell = (r: number, c: number) => {
    setPos([r, c]);
    requestAnimationFrame(() => grid.current?.querySelector<HTMLElement>(`[data-rc="${r}-${c}"]`)?.focus());
  };
  const onKey = (e: KeyboardEvent<HTMLTableElement>) => {
    const [r, c] = pos;
    const map: Record<string, [number, number]> = { ArrowRight: [r, Math.min(nCols - 1, c + 1)], ArrowLeft: [r, Math.max(0, c - 1)], ArrowDown: [Math.min(nRows - 1, r + 1), c], ArrowUp: [Math.max(0, r - 1), c], Home: [r, 0], End: [r, nCols - 1] };
    if (map[e.key]) { e.preventDefault(); focusCell(...map[e.key]); }
  };
  const activate = (r: number, c: number, el: HTMLElement) => {
    const x = cellAt(r, c);
    const edge = x.shown[0] ?? x.edges[0] ?? OWN_IDX.find((o) => o.t === x.company.existingId);
    if (edge?.id) openRecord(edge.id, el);
    else announce(`${x.company.name}: no named holder recorded for this company; there is no record to open`);
  };
  const summary = (id: string) => { const s = holderSummary(id); return `${s.lines} filing line(s) in ${s.cols} of ${RESEARCHED_COLS.length} companies · ${s.aggs} aggregate(s), analytic`; };
  const highlight = (id: string) => { patch({ holder: selected === id ? null : id }); announce(selected === id ? 'holder highlight cleared' : `${holderLabel(id)} highlighted; every other row stays`); };

  const renderCell = (r: number, c: number) => {
    const x = cellAt(r, c);
    const name = cellName(x.state, x.shown.length ? x.shown : x.edges, x.edges);
    const filingShown = x.shown.filter((e) => lineKind(e) === 'filing');
    const aggShown = x.shown.filter((e) => lineKind(e) === 'aggregate');
    const hatched = x.state === 'no-record' || x.state === 'not-read';
    // Each mark keeps its own tier's dash: a filing line its weakest line tier, an aggregate
    // the analytic dash. A cell holding both draws the aggregate as an inset square (first,
    // so it is the cell's first dashed mark) inside the line's border, and shows Σ.
    const frames = x.state === 'line'
      ? [...(aggShown.length ? [<CellFrame key="agg" inset={4} dash={dashOf(aggShown.map((e) => e.tier))} stroke="var(--color-text-muted)" width={1.2} />] : []),
        <CellFrame key="line" inset={1} dash={dashOf(filingShown.map((e) => e.tier))} stroke="var(--color-text-secondary)" width={2} />]
      : x.state === 'aggregate'
        ? [<CellFrame key="agg" inset={1} dash={dashOf(aggShown.map((e) => e.tier))} stroke="var(--color-text-muted)" width={2} />]
        : [<CellFrame key="hair" inset={1} dash="" stroke="var(--color-border-light)" width={1} />];
    // A grid cell, not a button: the grid owns the arrow keys and one roving tab stop,
    // and a cell's name states only the cell (U33) — holder and company come from the
    // headers, so hundreds of identical "not named" names are one row's words, not controls.
    return (
      <td key={c} role="gridcell" data-cell={x.state} data-rc={`${r}-${c}`} tabIndex={pos[0] === r && pos[1] === c ? 0 : -1} aria-label={name}
        title={`${holderLabel(x.holder)}, ${x.company.name}: ${stateWords(x.state, x.edges)}`}
        onFocus={() => setPos([r, c])} onClick={(e) => activate(r, c, e.currentTarget)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(r, c, e.currentTarget); } }}
        className={`relative p-0.5 text-center font-mono text-[11px] leading-tight border-0 cursor-pointer focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-solid focus-visible:-outline-offset-2 focus-visible:outline-accent ${x.state === 'line' ? 'bg-bg-card text-text' : x.state === 'aggregate' ? 'text-text' : 'text-text-muted'}`}
        style={{ ...(hatched ? { backgroundImage: HATCH_BG } : {}), width: narrow ? 32 : undefined, minWidth: narrow ? 32 : undefined, maxWidth: narrow ? 32 : undefined, height: 26 }}>
        {frames}
        <span className="relative">{cellText(x.state, x.shown.length ? x.shown : x.edges)}</span>
      </td>
    );
  };

  const lineRows: Row[] = empty ? [] : OWN_IDX.map((e) => ({
    cells: [holderLabel(e.s), inBandA(e.s) ? 'A' : 'B', lineKind(e), labelOf(e.t), e.from ?? 'undated', <TierWord key="t" tier={e.tier} />, <Q key="d">{e.d ?? e.lab ?? ''}</Q>, <ResponseCell key="r" id={e.id} />, lineKind(e) === 'aggregate' ? (e.innocentReading ?? 'not recorded') : 'not applicable: a filing line', <Src key="s" srcs={e.srcs} of={e.lab ?? e.id!} />],
    out: [e.s, inBandA(e.s) ? 'A' : 'B', lineKind(e), e.t, e.from ?? '', e.tier, e.d ?? '', responseText(e.id), e.innocentReading ?? '', (e.srcs ?? []).map((x) => x[1]).join('|')],
  }));
  const colRows: Row[] = empty ? [] : COLUMNS.map((c) => {
    const mine = OWN_IDX.filter((e) => e.t === c.existingId);
    const cov = coverageOf(c);
    return {
      cells: [c.name, columnStatus(c), quartersOf(c).join(', ') || (cov?.asOf ? `read ${cov.asOf} (${cov.read})` : 'no filing date recorded'), `${new Set(mine.filter((e) => lineKind(e) === 'filing').map((e) => e.s)).size} holders`, `${new Set(mine.filter((e) => inBandA(e.s) && lineKind(e) === 'filing').map((e) => e.s)).size} holders`, `${mine.filter((e) => lineKind(e) === 'aggregate').length} aggregates`],
      out: [c.name, c.existingId ?? '', columnStatus(c), quartersOf(c).join('|'), mine.length],
    };
  });
  const gridTsv = () => {
    const header = ['holder', ...COLUMNS.map((c) => c.name)];
    const rows = holders.map((h) => [`${h.label}${h.band === 'A' && roleText(h.role) ? ` (${roleText(h.role)})` : ''}`, ...COLUMNS.map((c) => { const x = cell(h.id, c, f.tiers); return stateWords(x.state, x.edges); })]);
    return { header, rows };
  };
  const changes = INDEX_CHANGES.filter((x) => x.index === 'nifty50');

  return (
    <>
    <figure className="m-0 min-w-0" aria-labelledby={`${uid}-h`}>
      <h3 id={`${uid}-h`} className="text-[16px] font-semibold text-text mb-1">{MATRIX_H3}</h3>
      <SkipLinks twins={[{ twin: 'matrix-lines', title: MATRIX_H3 }, { twin: 'matrix-columns', title: COLS_H3 }]} />
      {selected && (
        <p className="text-[14px] text-text my-2 max-w-[72ch]">
          {`Comparison set required: ${holderLabel(selected)} is shown with the ${BAND_A.length} holders the research measured with the same lens, and with every other holder named in these filings. This page does not display one holder alone.`}
          {!inBandA(selected) && !BAND_B.some((r) => r.id === selected) ? ` ${holderLabel(selected)} has no recorded line in a NIFTY 50 filing; its recorded holdings are in its card.` : ''}
        </p>
      )}
      {f.tierSet && <p className="font-mono text-[12px] text-text-muted">{`tier filter: ${[...f.tiers].join(', ') || 'none'} only; blank cells may hold lines of other tiers, and every row stays`}</p>}
      {changes.map((x, i) => <p key={i} className="font-mono text-[12px] text-text-muted">{`announced, not applied: ${x.out.name} → ${x.in.name}, effective ${x.effective} [${x.tier}]`}</p>)}
      {guard ? (
        <p className="text-[15px] text-text my-3">{`Comparison set required. This build declares ${BAND_A.length} comparison holders; the matrix needs at least four to be read fairly and is withheld.`}</p>
      ) : (
        <>
          {empty && <p className="text-[14px] text-text my-2">Register not yet promoted</p>}
          <div style={{ overflowX: 'auto' }} className="min-w-0">
            <table ref={grid} role="grid" aria-rowcount={nRows + 1 + (narrow ? 0 : 2 + roleHeads)} aria-colcount={nCols + (narrow ? 1 : 2)} aria-describedby={captionId} onKeyDown={onKey}
              className="border-collapse text-[12px]" style={{ tableLayout: narrow ? 'fixed' : 'auto' }}>
              <caption className="text-left text-[12.5px] text-text-muted pb-2">{captionLine(nRows, narrow ? 'NIFTY 50 companies × the comparison set' : 'holders (comparison set first, then every other named holder) × NIFTY 50 companies', 'capital', filterText, 'holder highlights, never filters; the year control does not reach this grid')}</caption>
              <thead>
                <tr>
                  <th scope={narrow ? 'col' : undefined} className="sticky left-0 z-10 bg-bg text-left font-mono text-[11px] text-text-muted p-1" style={{ width: narrow ? 110 : 220, minWidth: narrow ? 110 : 220, maxWidth: narrow ? 110 : undefined }}>{narrow ? 'Company' : 'Holder'}</th>
                  {narrow
                    ? (colsH as (BandRow & { band: 'A' | 'B' })[]).map((h) => (
                      <th key={h.id} scope="col" data-band={h.band} aria-label={`${h.label}${h.band === 'A' && roleText(h.role) ? `, ${roleText(h.role)}` : ''}${h.id === selected ? ' (selected)' : ''}`} className={`p-0 font-mono text-[11px] ${h.id === selected ? 'text-accent' : 'text-text-muted'}`} style={{ width: 32, minWidth: 32, maxWidth: 32 }}>
                        <span style={{ writingMode: 'vertical-rl', display: 'inline-block', maxHeight: 96, overflow: 'hidden' }}>{`${h.label.split(/[ ,(/]/)[0]}${h.id === selected ? ' (selected)' : ''}`}</span>
                      </th>
                    ))
                    : COLUMNS.map((c) => {
                      const st = columnStatus(c);
                      const lbl = `${c.name}${!c.existingId ? ' — no company record' : st !== 'researched' ? ' — no named holder recorded' : ''}${quartersOf(c).length ? `, filed ${quartersOf(c).join(', ')}` : ''}`;
                      return (
                        <th key={c.name} scope="col" aria-label={lbl} title={lbl} className={`p-0.5 font-mono text-[11px] text-text-muted align-bottom ${st !== 'researched' ? 'hatch' : ''}`} style={st !== 'researched' ? { backgroundImage: HATCH_BG } : undefined}>
                          <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', display: 'inline-block', maxHeight: 130, overflow: 'hidden', whiteSpace: 'nowrap' }}>{c.nse ?? c.name.split(' ')[0]}</span>
                        </th>
                      );
                    })}
                  {!narrow && <th scope="col" className="font-mono text-[11px] text-text-muted text-left p-1">Summary</th>}
                </tr>
              </thead>
              <tbody>
                {narrow
                  ? (rowsH as Constituent[]).map((c, r) => {
                    const also = BAND_B.filter((h) => cell(h.id, c, f.tiers).state === 'line' || cell(h.id, c, f.tiers).state === 'aggregate');
                    return (
                      <tr key={c.name}>
                        <th scope="row" className="sticky left-0 z-10 bg-bg text-left font-normal text-[12px] p-1 align-top" style={{ width: 110, minWidth: 110, maxWidth: 110 }}>
                          <span className="block truncate">{c.name}</span>
                          {also.length > 0 && <span className="block font-mono text-[12px] text-text-muted whitespace-normal">also named: {also.map((h, i) => <span key={h.id}>{i > 0 ? ', ' : ''}<button type="button" tabIndex={-1} className="underline" onClick={() => highlight(h.id)}>{h.label}</button></span>)}</span>}
                        </th>
                        {colsH.map((_, ci) => renderCell(r, ci))}
                      </tr>
                    );
                  })
                  : (['A', 'B'] as const).flatMap((band) => [
                    <tr key={`band-${band}`}><th colSpan={COLUMNS.length + 2} scope="colgroup" className="text-left font-mono text-[11px] text-text-muted pt-3 pb-1">{band === 'A' ? `${BAND_A.some((r) => r.role !== 'comparison') ? 'Subjects, comparison set and domestic control, always shown' : 'Comparison set, always shown'} (${BAND_A.length})` : `Other holders with a recorded line (${BAND_B.length})`}</th></tr>,
                    ...holders.map((h, r) => ({ h, r })).filter(({ h }) => h.band === band).flatMap(({ h, r }, i, arr) => [
                      // With declared roles, each run of one role in Band A is headed by it, so the
                      // subjects are labelled subjects and never read as part of their own control.
                      ...(band === 'A' && roleText(h.role) && BAND_A.some((x) => x.role !== 'comparison') && (i === 0 || arr[i - 1].h.role !== h.role)
                        ? [<tr key={`role-${h.id}`} data-role-head=""><th colSpan={COLUMNS.length + 2} scope="colgroup" className="text-left font-mono text-[11px] text-text-muted pt-1.5 pl-2">{`${roleText(h.role)} (${BAND_A.filter((x) => x.role === h.role).length})`}</th></tr>]
                        : []),
                      <tr key={h.id} aria-current={h.id === selected ? 'true' : undefined} className={h.id === selected ? 'bg-accent/[0.08]' : ''}>
                        <th scope="row" data-band={h.band} aria-current={h.id === selected ? 'true' : undefined} className={`sticky left-0 z-10 bg-bg text-left font-normal text-[12.5px] p-1 ${h.id === selected ? 'border-l-4 border-accent' : ''}`}>
                          <button type="button" tabIndex={-1} onClick={() => highlight(h.id)} aria-label={`${h.label}${h.band === 'A' && roleText(h.role) ? `, ${roleText(h.role)}` : ''}`} className="text-left underline decoration-border-light">{h.label}</button>{h.id === selected ? ' (selected)' : ''}
                        </th>
                        {COLUMNS.map((_, c) => renderCell(r, c))}
                        <td className="font-mono text-[11px] text-text-secondary p-1 whitespace-nowrap">{summary(h.id)}</td>
                      </tr>,
                    ]),
                  ])}
              </tbody>
            </table>
          </div>
        </>
      )}
      <Caption id={captionId} cap="C11">
        {`A holding enters a company's shareholding filing by name only at 1% or more, and each fund line counts separately; a manager with many funds each under 1% is not named at all. An empty cell means 'not named', never 'not held'. An aggregate cell is the research's own sum of a manager's fund holdings files, a lower bound, drawn with the analytic dash: no filing names that holder. Columns are read from filings of different dates (${FILING_DATES.length} dates, ${FILING_DATES[0] ?? 'none'} to ${FILING_DATES[FILING_DATES.length - 1] ?? 'none'}), so a row is not one moment. ${NO_RECORD_COLS.length} of the ${COLUMNS.length} companies have no named holder recorded in this register and are hatched: not researched to that depth, not empty. The checked companies are not a random sample.${f.yFrom != null ? ' While a year is set, the year control does not reach this matrix: each company has one filing here.' : ''}`}
      </Caption>
    </figure>
      {!guard && !empty && (() => { const g = gridTsv(); return (
        <Exports name={`${MATRIX_H3} (grid)`} twin="matrix-grid" meta={{ table: `${MATRIX_H3} (grid)`, population: 'every band row × every NIFTY 50 company, cell states in words', lens: 'capital', filters: filterText, rows: g.rows.length }} header={g.header} rows={() => g.rows} />
      ); })()}
      <Twin twin="matrix-lines" title={MATRIX_H3} rowCount={lineRows.length} open={f.view === 'table'}>
        {() => (
          <ScrollBox label={`${MATRIX_H3} — table`}>
            <Exports name={MATRIX_H3} twin="matrix-lines" meta={{ table: MATRIX_H3, population: 'every recorded holding in a NIFTY 50 company, filing lines and aggregates apart', lens: 'capital', filters: filterText, rows: lineRows.length }}
              header={['holder', 'band', 'kind', 'company', 'from', 'tier', 'record', 'response', 'innocent_reading', 'source_urls']} rows={() => lineRows.map((r) => r.out)} />
            <Table caption={captionLine(lineRows.length, 'holdings in NIFTY 50 companies, long form', 'capital', filterText)} className="min-w-[60rem]"
              cols={[{ key: 'h', label: 'Holder', th: true }, { key: 'b', label: 'Band' }, { key: 'k', label: 'Kind' }, { key: 'c', label: 'Company' }, { key: 'd', label: 'Filing or file date' }, { key: 't', label: 'Tier' }, { key: 'r', label: 'Record text' }, { key: 'resp', label: 'Response' }, { key: 'i', label: 'Innocent reading' }, { key: 's', label: 'Sources' }]}
              rows={lineRows.length ? lineRows : [{ cells: [NOTHING], out: [] }]} />
          </ScrollBox>
        )}
      </Twin>
      <h3 className="text-[14px] font-semibold text-text mt-4">{COLS_H3}</h3>
      <Twin twin="matrix-columns" title={COLS_H3} rowCount={colRows.length} open={f.view === 'table'}>
        {() => (
          <ScrollBox label={`${COLS_H3} — table`}>
            <Exports name={COLS_H3} twin="matrix-columns" meta={{ table: COLS_H3, population: 'every NIFTY 50 constituent and what the register records for it', lens: 'capital', filters: filterText, rows: colRows.length }} header={['company', 'id', 'status', 'dates', 'records']} rows={() => colRows.map((r) => r.out)} />
            <Table caption={captionLine(colRows.length, 'NIFTY 50 constituents by coverage', 'capital', filterText)} className="min-w-[44rem]"
              cols={[{ key: 'c', label: 'Company', th: true }, { key: 's', label: 'Status' }, { key: 'd', label: 'Filing dates' }, { key: 'n', label: 'Named holders recorded' }, { key: 'a', label: 'Comparison-set holders named' }, { key: 'g', label: 'Aggregates recorded' }]}
              rows={colRows.length ? colRows : [{ cells: [NOTHING], out: [] }]} />
          </ScrollBox>
        )}
      </Twin>
      {!empty && (
        <div className="mt-4">
          <h3 className="text-[14px] font-semibold text-text">The same lens on every holder</h3>
          {MODULES.capital.symmetry.filter((s) => s.domain === 'holders').map((s, i) => <p key={i} className="text-[13.5px] fin-q my-1 max-w-[80ch]">{s.text}</p>)}
        </div>
      )}
    </>
  );
}

export function OutsideIndex({ f }: { f: Filters }) {
  const { empty, filters: filterText, narrow } = usePage();
  const rows = OWN_OUTSIDE.filter((e) => f.tiers.has(e.tier));
  return (
    <div className="mt-8">
      <h3 className="text-[16px] font-semibold text-text mb-1">{OUTSIDE_H3}</h3>
      {empty ? <p className="text-[14px]">{NOTHING}</p> : (
        <>
          <DataRows cards={narrow} caption={captionLine(rows.length, 'recorded holdings and joint ventures outside the NIFTY 50 matrix', 'capital', filterText)}
            cols={[{ key: 'o', label: 'Owner' }, { key: 'w', label: 'Owned' }, { key: 's', label: 'Share as recorded' }, { key: 'r', label: 'Response' }, { key: 'd', label: 'Date' }, { key: 't', label: 'Tier' }, { key: 'src', label: 'Sources' }]}
            rows={rows.map((e) => ({ cells: [<RowActions key="o"><Connect id={e.s} label={labelOf(e.s)} /></RowActions>, labelOf(e.t), <Q key="d">{e.d ?? e.lab ?? ''}</Q>, <ResponseCell key="r" id={e.id} />, e.from ?? 'undated', <TierWord key="t" tier={e.tier} />, <Src key="s" srcs={e.srcs} of={e.lab ?? e.id!} />], out: [] }))} />
          <p className="text-[14px] text-text-secondary">{`${OWN_OUTSIDE.length} recorded holdings and joint ventures outside the NIFTY 50 matrix.`}</p>
        </>
      )}
    </div>
  );
}

function feeCell(e: GEdge): string {
  const b = benefitOf(e);
  if (!b || b.amountCr == null) return 'fee not disclosed';
  if (b.amountCr === 0) return '₹0 cr — as recorded';
  return `₹${fmtCr(b.amountCr)} cr (${b.confidence ?? 'confidence not recorded'})`;
}

export function MandatesSection({ f, captionId }: { f: Filters; captionId: string }) {
  const { empty, filters: filterText, narrow } = usePage();
  const rows = MANDATES.filter((e) => f.tiers.has(e.tier) && inYear(f, e.from));
  const base = MODULES.capital.baseRates.filter((r) => r.domain === 'mandates-ventures');
  const advisers = ADVISERS;
  return (
    <section id="mandates" className="pt-12">
      <h2 className="heading-editorial font-bold text-2xl border-b border-border-light pb-2.5 mb-3">Awards by the Union: mandates and sales</h2>
      {empty ? <p className="text-[14px]">{NOTHING}</p> : !MANDATES.length ? <p className="text-[14px]">No awards recorded.</p> : (
        <>
          <Denominator>{`${MANDATES.length} awards recorded by the Union and its bodies, other than regulators' licences; ${AWARDS_CAP.length} awards in all.`}</Denominator>
          <DataRows cards={narrow} caption={captionLine(rows.length, 'mandates and sales awarded by the Union in view', 'capital', filterText)}
            cols={[{ key: 'd', label: 'Date' }, { key: 'a', label: 'Awarder' }, { key: 'w', label: 'Awardee' }, { key: 'x', label: 'Mandate' }, { key: 'f', label: 'Fee or value' }, { key: 'b', label: 'Who benefits' }, { key: 't', label: 'Tier' }, { key: 'r', label: 'Response' }, { key: 's', label: 'Sources' }]}
            rows={rows.map((e) => { const b = benefitOf(e); return { cells: [e.from ?? 'undated', labelOf(e.s), <RowActions key="w"><Connect id={e.t} label={labelOf(e.t)} /></RowActions>, <RowActions key="x"><OpenRecord id={e.id!} lab={e.lab ?? e.id!}>{e.lab ?? e.id}</OpenRecord></RowActions>, feeCell(e), b ? `${labelOf(b.who)}: ${b.how ?? 'how not recorded'}` : 'No cui-bono row recorded', <TierWord key="t" tier={e.tier} />, <ResponseCell key="r" id={e.id} />, <Src key="s" srcs={e.srcs} of={e.lab ?? e.id!} />], out: [] }; })} />
          <h3 className="text-[15px] font-semibold mt-4">Advisers beside each other</h3>
          <ScrollBox label="Advisers beside each other — table">
            <table aria-describedby={captionId} className="w-full border-collapse text-[13.5px] min-w-[40rem]">
              <caption className="text-left text-[12.5px] text-text-muted pb-2">{captionLine(advisers.length, 'every adviser the research declared or recorded, alphabetical; nothing ranked', 'capital', filterText)}</caption>
              <thead>
                <tr><th scope="col" rowSpan={2} className="text-left font-mono text-[11px] text-text-muted">Adviser</th><th scope="colgroup" colSpan={3} className="text-left font-mono text-[11px] text-text-muted">records in this register (computed here)</th><th scope="col" rowSpan={2} className="text-left font-mono text-[11px] text-text-muted">Graph</th></tr>
                <tr><th scope="col" className="text-left font-mono text-[11px] text-text-muted">awards as awardee</th><th scope="col" className="text-left font-mono text-[11px] text-text-muted">analytic records naming it</th><th scope="col" className="text-left font-mono text-[11px] text-text-muted">narratives about it</th></tr>
              </thead>
              <tbody>
                {advisers.map((a) => {
                  const awards = AWARDS_CAP.filter((e) => e.t === a.id).length;
                  const analytic = MODULES.capital.edges.filter((e) => e.tier === 'analytic' && (e.s === a.id || e.t === a.id)).length;
                  const narr = CAPITAL_NARRATIVE_IDS.get(a.id) ?? 0;
                  return (
                    <tr key={a.id} className="align-top">
                      <th scope="row" className="text-left font-normal py-1.5 pr-3 text-text">{a.label}</th>
                      <td className="py-1.5 pr-3">{`in this file: ${awards || 'no mandate recorded in this file'}`}</td>
                      <td className="py-1.5 pr-3">{`in this file: ${analytic}`}</td>
                      <td className="py-1.5 pr-3">{`in this file: ${narr || 'not linked'}`}</td>
                      <td className="py-1.5 pr-3"><Connect id={a.id} label={a.label}>Show connections</Connect></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ScrollBox>
          <Caption id={captionId} cap="C12">A mandate is a public appointment; it is not a finding about the adviser. Fees are shown only where disclosed. Counts of records in this register measure the research&apos;s attention as much as the firm&apos;s work; league tables in the records&apos; text rank by fees and deal value; this table ranks nothing.</Caption>
          <ul className="list-none p-0 m-0 text-[13px] mt-2 space-y-1">{base.map((r, i) => <li key={i}><BaseRateLine r={r} /></li>)}</ul>
        </>
      )}
    </section>
  );
}

export function LicencesSection({ f }: { f: Filters }) {
  const { empty, filters: filterText, narrow } = usePage();
  const rows = LICENCES.filter((e) => f.tiers.has(e.tier));
  return (
    <section id="licences" className="pt-12">
      <h2 className="heading-editorial font-bold text-2xl border-b border-border-light pb-2.5 mb-3">Licences and their timing</h2>
      {empty ? <p className="text-[14px]">{NOTHING}</p> : !LICENCES.length ? <p className="text-[14px]">No licence recorded.</p> : (
        <>
          <DataRows cards={narrow} caption={captionLine(rows.length, 'regulator licences with the application date where one is recorded', 'capital', filterText)}
            cols={[{ key: 'l', label: 'Licensee' }, { key: 'x', label: 'Licence' }, { key: 'r', label: 'Regulator' }, { key: 'a', label: 'Applied' }, { key: 'p', label: 'Approved' }, { key: 'm', label: 'Months between' }, { key: 't', label: 'Tier' }, { key: 'resp', label: 'Response' }]}
            rows={rows.map((e) => { const app = licenceApplied(e); const m = monthsBetween(app?.from, e.from); return { cells: [labelOf(e.t), <RowActions key="x"><OpenRecord id={e.id!} lab={e.lab ?? e.id!}>{e.lab ?? e.id}</OpenRecord></RowActions>, labelOf(e.s), app?.from ?? 'not recorded', e.from ?? 'not recorded', m != null ? `${m} months` : 'one date not recorded', <TierWord key="t" tier={e.tier} />, <ResponseCell key="r" id={e.id} />], out: [] }; })} />
          <p className="text-[14px] text-text-secondary max-w-[72ch]">Months from application to approval, for every sponsor the file dates at both ends. A row with one date is shown and not timed. The comparators are those the research recorded, not every licence the regulator granted.</p>
        </>
      )}
    </section>
  );
}

export function RulesSection({ f, captionId }: { f: Filters; captionId: string }) {
  const { empty, filters: filterText } = usePage();
  const uid = useId().replace(/:/g, '');
  const rules = useMemo(() => RULES_CAP.filter((e) => f.tiers.has(e.tier) && inYear(f, e.from)), [f]);
  const withBenefit = RULES_CAP.filter((e) => benefitOf(e)).length;
  const withIR = RULES_CAP.filter((e) => e.innocentReading).length;
  const years = RULES_CAP.map((e) => yearOf(e.from)).filter((y): y is number => y != null);
  const x0 = years.length ? Math.min(...years) : 2000;
  const endY = yearOf(ASOF.capital) ?? x0 + 1;
  const x1 = endY + 1;
  const W = 720; const ROW = 12;
  const sx = (d: string | undefined, fallback: number) => (d ? 150 + ((Number(d.slice(0, 4)) + (d.length >= 7 ? (Number(d.slice(5, 7)) - 1) / 12 : 0.5) - x0) / Math.max(1, x1 - x0)) * (W - 160) : fallback);
  const asOfX = sx(ASOF.capital ?? undefined, W - 10);
  const rowOf = new Map(rules.map((e, i) => [e.id, i]));
  const rulesRows: Row[] = empty ? [] : rules.map((e) => ({
    cells: [e.lab ?? e.id, `${e.from ?? 'undated'} to ${e.to ?? 'in force, end not recorded'}`, <TierWord key="t" tier={e.tier} />, labelOf(e.t), benefitOf(e) ? 'cui-bono row recorded' : 'No cui-bono row recorded for this rule', e.supersededBy ? `superseded by ${e.supersededBy}` : 'not superseded', <Src key="s" srcs={e.srcs} of={e.lab ?? e.id!} inline />],
    out: [e.id, e.from ?? '', e.to ?? '', e.tier, e.t, benefitOf(e) ? 'yes' : 'no', e.supersededBy ?? ''],
  }));
  return (
    <section id="rules" className="pt-12">
      <h2 className="heading-editorial font-bold text-2xl border-b border-border-light pb-2.5 mb-3">Rules and who benefits</h2>
      {empty ? <p className="text-[14px]">{NOTHING}</p> : !RULES_CAP.length ? <p className="text-[14px]">No rule recorded in this build.</p> : (
        <>
          <Denominator>{`${withBenefit} of ${RULES_CAP.length} rules carry a cui-bono row · ${withIR} carry an innocent reading.`}</Denominator>
          <figure className="m-0 min-w-0" aria-labelledby={`${uid}-h`}>
            <h3 id={`${uid}-h`} className="text-[16px] font-semibold text-text mb-1">{RULES_H3}</h3>
            <SkipLinks twins={[{ twin: 'rules', title: RULES_H3 }]} />
            <div style={{ overflowX: 'auto' }}>
              <svg viewBox={`0 0 ${W} ${rules.length * ROW + 20}`} width="100%" aria-hidden="true" aria-describedby={captionId} style={{ minWidth: 520, display: 'block' }}>
                {Array.from({ length: x1 - x0 + 1 }, (_, i) => x0 + i).filter((y) => y % 5 === 0).map((y) => <text key={y} x={sx(`${y}`, 0)} y={10} fontSize="9" textAnchor="middle" fill="rgb(170,170,170)">{y}</text>)}
                {rules.map((e, i) => {
                  const a = sx(e.from, 150); const b = e.to ? sx(e.to, asOfX) : asOfX; const y = 16 + i * ROW;
                  const succ = e.supersededBy ? rowOf.get(e.supersededBy) : undefined;
                  return (
                    <g key={e.id}>
                      <text x={146} y={y + 7} fontSize="8" textAnchor="end" fill="rgb(200,200,200)">{`${(e.lab ?? '').slice(0, 30)}${e.supersededBy ? ' (superseded)' : ''}`}</text>
                      <rect data-rule="" x={a} y={y} width={Math.max(2, b - a)} height={ROW - 4} fill={e.to ? 'rgba(170,170,170,0.35)' : 'none'} stroke="rgb(210,210,210)" strokeDasharray={TIERS[e.tier].dash || undefined}><title>{`${e.lab}${e.to ? '' : ' — in force, end not recorded'}`}</title></rect>
                      {succ != null && <path d={`M${b},${y + 4} L${b + 4},${y + 4} L${b + 4},${16 + succ * ROW + 4}`} fill="none" stroke="rgb(170,170,170)" strokeWidth="0.8" />}
                    </g>
                  );
                })}
              </svg>
            </div>
            <Caption id={captionId} cap="C13" as="figcaption">A rule changes terms for everyone it covers. A rule that benefits someone is not evidence that it was written for them. Who gained is recorded only where the research filled a cui-bono row; where it did not, the record&apos;s own text is shown and the gap is counted in What this lens cannot show.</Caption>
          </figure>
          <div className="space-y-3 mt-3">
            {rules.map((e) => {
              const b = benefitOf(e);
              return (
                <article key={e.id} className="border border-border rounded p-3 text-[13.5px] text-text-secondary">
                  <p className="text-text"><OpenRecord id={e.id!} lab={e.lab ?? e.id!}>{e.lab ?? e.id}</OpenRecord></p>
                  <p className="text-[13.5px]">{`${e.from ?? 'undated'} to ${e.to ?? 'in force, end not recorded'} · governs ${labelOf(e.t)} · `}<TierWord tier={e.tier} />{e.supersededBy ? ` · superseded by ${e.supersededBy}` : ''}</p>
                  <dl className="grid gap-1 mt-2">
                    <div><dt className="font-mono text-[12px] text-text-muted">Rule</dt><dd className="m-0 text-[13.5px]"><Q>{e.d ?? 'not stated'}</Q></dd></div>
                    <div><dt className="font-mono text-[12px] text-text-muted">Who benefits</dt>
                      <dd className="m-0 text-[13.5px]">{b ? `${labelOf(b.who)}: ${b.how ?? 'how not recorded'} · ${b.amountCr != null ? `₹${fmtCr(b.amountCr)} cr (${b.confidence ?? 'confidence not recorded'})` : 'amount unknown'}` : <><span className="block text-amber text-[13.5px]">No cui-bono row recorded for this rule</span><span className="block text-[13.5px] fin-q">{e.d ?? ''}</span></>}</dd></div>
                    <div><dt className="font-mono text-[12px] text-text-muted">Boring explanation</dt><dd className="m-0 text-[13.5px]">{e.innocentReading ?? 'not recorded'}</dd></div>
                    <div><dt className="font-mono text-[12px] text-text-muted">Upgrade if / kill if</dt><dd className="m-0 text-[13.5px]">{`${e.upgradeIf ?? 'not recorded'} / ${e.killIf ?? 'not recorded'}`}</dd></div>
                    <div><dt className="font-mono text-[12px] text-text-muted">Response</dt><dd className="m-0 text-[13.5px]"><ResponseCell id={e.id} /></dd></div>
                    <div><dt className="font-mono text-[12px] text-text-muted">Sources</dt><dd className="m-0"><Src srcs={e.srcs} of={e.lab ?? e.id!} inline /></dd></div>
                  </dl>
                </article>
              );
            })}
          </div>
          <Twin twin="rules" title={RULES_H3} rowCount={rulesRows.length} open={f.view === 'table'}>
            {() => (
              <ScrollBox label={`${RULES_H3} — table`}>
                <Exports name={RULES_H3} twin="rules" meta={{ table: RULES_H3, population: 'rule edges in the capital register in view', lens: 'capital', filters: filterText, rows: rulesRows.length }} header={['id', 'from', 'to', 'tier', 'governs', 'cui_bono_row', 'superseded_by']} rows={() => rulesRows.map((r) => r.out)} />
                <Table caption={captionLine(rulesRows.length, 'rules on foreign capital', 'capital', filterText)} className="min-w-[48rem]"
                  cols={[{ key: 'r', label: 'Rule', th: true }, { key: 'd', label: 'Dates' }, { key: 't', label: 'Tier' }, { key: 'g', label: 'Governs' }, { key: 'b', label: 'Cui-bono row' }, { key: 's', label: 'Supersession' }, { key: 'src', label: 'Sources' }]}
                  rows={rulesRows.length ? rulesRows : [{ cells: [NOTHING], out: [] }]} />
              </ScrollBox>
            )}
          </Twin>
        </>
      )}
    </section>
  );
}

export { finite };
