import { forwardRef } from 'react';
import {
  type WelfareFilters, type StateYearRow, type ElectionRow, type Lane,
  EMPTY, YEARS, metricLabel, stateName, partyText, fmtNum, electionTitle, amountInForce, nextElection,
  monthsBetweenSafe, latestStatusOf, moneyRows, matrix, scrubberRows, moneyColumnLabel, inView, EVENT_WORD, entityLabel, AS_OF_YEAR, STATE_COUNT, YEAR_COUNT,
} from '../../data/welfareView';
import { Src, Verbatim, TableBlock, Tabbable, ReasonText, type TableCtx, QLink } from './ui';

type Search = (kv: Record<string, string | null>) => string;
const urlsOf = (srcs: [string, string][] | undefined) => (srcs ?? []).map((s) => s[1]);
const outcomeWord = (r: ElectionRow) => (r.outcome === 'retained' ? 'incumbent kept power' : r.outcome === 'lost' ? 'incumbent lost' : 'coalition or unclassified');

/**
 * The stage as tables (§11). Exactly three disclosures, so a reader tabbing through
 * meets three toggles, not nine; the matrix, lanes, money and elections tables sit
 * inside them as labelled blocks. Every row array is the one the graphics drew.
 */
export default forwardRef<HTMLHeadingElement, {
  f: WelfareFilters;
  rows: StateYearRow[];
  ballots: ElectionRow[];
  lanes: Lane[];
  elections: ElectionRow[];
  open: boolean;
  ctx: TableCtx;
  search: Search;
  filtersText: string;
  asOfLabel: string;
}>(function StageTwins({ f, rows, ballots, lanes, elections, open, ctx, search, filtersText, asOfLabel }, ref) {
  const yText = f.y != null ? String(f.y) : 'all years';
  const label = metricLabel(f.m, f.y);
  const empty = <p className="text-[14px] text-text-secondary my-3">Nothing recorded yet.</p>;
  const summaryCls = 'cursor-pointer text-[14px] text-text py-2';
  const schemes = inView(f);

  return (
    <Tabbable.Provider value={open}>
    <section id="stage-tables" className="mt-8 scroll-mt-44 lg:scroll-mt-28">
      <h3 ref={ref} tabIndex={-1} className="heading-editorial text-xl text-text mb-2 outline-none">This stage as tables</h3>
      <details data-twin="year-slice" open={open} className="border-t border-border">
        <summary className={summaryCls}>{EMPTY ? 'Map as a table · 0 rows · register not yet promoted' : `Map as a table · ${STATE_COUNT} states · metric: ${label} · year: ${yText} · filters: ${filtersText || 'none'} · as of ${asOfLabel}`}</summary>
        {EMPTY ? empty : (
          <>
            <TableBlock name="year-slice" ctx={ctx} minWidth="72rem"
              cols={[
                { key: 'state', label: 'State', th: true }, { key: 'value', label: `${label}${f.y != null ? '' : ''}` }, { key: 'class', label: 'Class' },
                { key: 'reason', label: 'Reason' }, { key: 'detail', label: 'Detail' }, { key: 'sources', label: 'Sources' },
                { key: 'assembly_election', label: f.y != null ? `Assembly election in ${f.y}` : 'Assembly election in the chosen year (choose a year)' },
                { key: 'schemes_by_party', label: 'Schemes by party (text)' },
              ]}
              rows={rows.map((r) => {
                const es = ballots.filter((b) => b.e.st === r.st);
                const parties = [...new Set(r.contributing.map(partyText))].sort();
                // The exported cell carries its null in words (spec §7.2 rule 11), because the
                // footnote does not travel with a TSV. The on-page cell stays blank: AC-58
                // defines "non-empty election cell" as "an election", and changing that is a
                // change to the acceptance criteria, not to this table.
                const noElection = f.y != null ? `none recorded in ${f.y}` : 'choose a year';
                return {
                  cells: [
                    <QLink tabIndex={open ? undefined : -1} search={search({ st: r.st })} className="underline underline-offset-2 hover:text-accent">{r.name}</QLink>,
                    r.cls === 'value' ? r.valueText : r.cls === 'zero' ? '0 (declared)' : r.classLabel,
                    r.cls === 'value' ? 'value' : r.classLabel,
                    r.reason ? <ReasonText text={r.reason} /> : 'not applicable: a value is shown',
                    r.detail,
                    <Src srcs={r.srcs} />,
                    es.length ? <>{es.map((e) => <span key={e.key} className="block">{`${electionTitle(e)} · ${outcomeWord(e)} `}<Src srcs={e.e.srcs} /></span>)}</> : '',
                    parties.length ? parties.join('; ') : 'none in view',
                  ],
                  out: [r.name, r.value, r.cls === 'value' ? 'value' : r.status, r.reason, r.detail, es.length ? es.map((e) => electionTitle(e)).join(' | ') : noElection, parties.join('; ')],
                  urls: [...urlsOf(r.srcs), ...es.flatMap((e) => urlsOf(e.e.srcs))],
                };
              })} />
            <p className="text-[13px] text-text-muted">A blank election cell means no assembly election is recorded in the file for that state in that year (the export writes it as {f.y != null ? `“none recorded in ${f.y}”` : '“choose a year”'}).</p>

            <div data-twin="matrix" className="mt-6">
              <p className="text-[14px] text-text">{`State × year matrix · ${label.replace(/ in \d{4}$/, ' in each year')} · calendar year for liveness; money is FY y–(y+1)`}</p>
              <p className="text-[13px] text-text-muted">Per-cell figures are the sum of the Money table rows for the same state and FY; that table carries each row's source. n.r. = none recorded in this file.</p>
              <TableBlock name="matrix" ctx={ctx} minWidth="96rem"
                cols={[{ key: 'state', label: 'State', th: true }, ...YEARS.map((y) => ({ key: `y${y}`, label: y === f.y ? `${y} (map year)` : String(y) }))]}
                rows={matrix(f).map((m) => ({
                  cells: [m.name, ...m.cells.map((c) => (c.status === 'none-recorded' ? <abbr title="none recorded">n.r.</abbr> : c.cell))],
                  out: [m.name, ...m.cells.map((c) => `${c.value ?? ''}|${c.status}`)],
                  urls: [],
                }))} />
            </div>
            <div data-twin="money" className="mt-6">
              <p className="text-[14px] text-text">Money: one row per scheme and financial year. No column totals.</p>
              <TableBlock name="money" ctx={ctx} minWidth="90rem"
                cols={[{ key: 'scheme', label: 'Scheme', th: true }, { key: 'state', label: 'State' }, { key: 'party', label: 'Party' }, { key: 'fy', label: 'FY' }, { key: 'entitlement_recorded', label: 'Entitlement per beneficiary as recorded (as of FY end)' }, { key: 'annualised_computed', label: 'Annualised, computed here' }, { key: 'beneficiaries', label: 'Beneficiaries (nearest snapshot not after FY end)' }, { key: 'budgeted_cr', label: 'Budgeted ₹ cr' }, { key: 'actual_cr', label: 'Actual ₹ cr' }, { key: 'state_budget_share', label: 'Share of state budget' }, { key: 'gsdp_share', label: 'Share of GSDP' }, { key: 'source', label: 'Source' }]}
                rows={moneyRows(f).map((r) => ({
                  cells: [r.scheme.name, r.scheme.level === 'central' ? 'Central' : stateName(r.scheme.st), partyText(r.scheme), <Verbatim>{r.fy}</Verbatim>, <Verbatim>{r.recorded}</Verbatim>, <ReasonText text={r.annual} />, r.beneficiaries, r.budgeted, r.actual, r.share, r.gsdp, <Src srcs={r.srcs} />],
                  out: [r.scheme.name, stateName(r.scheme.st), partyText(r.scheme), r.fy, r.recorded, r.annual, r.beneficiaries, r.budgeted, r.actual, r.share, r.gsdp],
                  urls: urlsOf(r.srcs),
                }))}
                empty={<p>No outlay row for the schemes in view.</p>} />
            </div>
          </>
        )}
      </details>

      <details data-twin="scrubber" open={open} className="border-t border-border">
        <summary className={summaryCls}>{EMPTY ? 'Clock as a table · 0 rows · register not yet promoted' : `Clock as a table · ${YEAR_COUNT} years · filters: ${filtersText || 'none'} · as of ${asOfLabel}`}</summary>
        {EMPTY ? empty : (
          <>
            <TableBlock name="scrubber" ctx={ctx}
              cols={[{ key: 'year', label: 'Year', th: true }, { key: 'state_live', label: 'State schemes live' }, { key: 'central_live', label: 'Central live' }, { key: 'launches', label: 'Launches' }, { key: 'assembly_elections', label: 'Assembly elections' }, { key: 'states_with_money_figure', label: moneyColumnLabel(f.mRequested) }]}
              rows={scrubberRows(f).map((r) => ({
                cells: [String(r.year), String(r.stateLive), String(r.centralLive), String(r.launches), String(r.elections), String(r.money)],
                out: [r.year, r.stateLive, r.centralLive, r.launches, r.elections, r.money],
                urls: [],
              }))} />
            <div data-twin="lanes" className="mt-6">
              <p className="text-[14px] text-text">Lanes as a table: every lane on the clock, each event in words</p>
              <TableBlock name="lanes" ctx={ctx} minWidth="56rem"
                cols={[{ key: 'scheme', label: 'Scheme' }, { key: 'event', label: 'Event' }, { key: 'date', label: 'Date' }, { key: 'note', label: 'Note' }, { key: 'source', label: 'Source' }]}
                rows={lanes.flatMap((l) => {
                  const s = l.scheme;
                  // The lane's amount labels shorten the unit; the full recorded unit is here,
                  // marked as the research file's words like every other recorded string.
                  const amountsText = s.benefit ? ` · amounts: ${l.amounts.map((a) => `${a.text} from ${a.date}`).join('; ') || 'none dated'} · unit as recorded: ` : '';
                  const unitNote = s.benefit ? `${amountsText}${s.benefit.unit ?? 'not recorded'}` : '';
                  const base = [{
                    cells: [l.label, s.launched?.date ? 'launched' : 'not launched', s.launched?.date ?? s.announced?.date ?? 'date not located',
                      <>{`${l.where}${s.announced?.date ? ` · announced ${s.announced.date}` : ''}${amountsText}`}{s.benefit ? (s.benefit.unit ? <Verbatim>{s.benefit.unit}</Verbatim> : 'not recorded') : null}</>,
                      <Src srcs={s.launched?.srcs ?? s.srcs} />],

                    out: [l.label, s.launched?.date ? 'launched' : 'not launched', s.launched?.date ?? s.announced?.date ?? null, `${l.where}${unitNote}`],

                    urls: urlsOf(s.launched?.srcs ?? s.srcs),
                  }];
                  const evs = s.status.filter((t) => ['raised', 'cut', 'eligibility-tightened', 'paused', 'discontinued', 'renamed', 'promised-not-enacted'].includes(t.status)).map((t) => {
                    const word = t.status === 'eligibility-tightened' ? EVENT_WORD.tightened : t.status === 'promised-not-enacted' ? EVENT_WORD.promised : t.status;
                    return {
                      cells: [l.label, word, t.date ?? 'undated', t.note ? <Verbatim>{t.note}</Verbatim> : 'no note', <Src srcs={t.srcs} />],
                      out: [l.label, word, t.date, t.note],
                      urls: urlsOf(t.srcs),
                    };
                  });
                  return [...base, ...evs];
                })} />
            </div>
            <div data-twin="elections" className="mt-6">
              <p className="text-[14px] text-text">Elections: every election in the file, records of one poll merged</p>
              <TableBlock name="elections" ctx={ctx} minWidth="90rem"
                cols={[{ key: 'state', label: 'State', th: true }, { key: 'election', label: 'Election' }, { key: 'date', label: 'Date' }, { key: 'incumbent', label: 'Incumbent' }, { key: 'winner', label: 'Winner' }, { key: 'outcome_class', label: 'Outcome class' }, { key: 'fresh_6_12_24', label: 'Fresh @6 / @12 / @24 m' }, { key: 'fresh_schemes', label: 'Schemes counted as fresh (names)' }, { key: 'records_merged', label: 'Records of this poll' }, { key: 'source', label: 'Source' }]}
                rows={elections.map((r) => {
                  const yn = (w: 6 | 12 | 24) => (r.exposedBy[w].length ? 'yes' : 'no');
                  return {
                    cells: [stateName(r.e.st), r.e.election, r.e.date, r.e.incumbentRaw ?? 'not recorded', r.e.winnerRaw ?? 'not recorded', `${r.outcome}${r.e.disagreement ? ` (${r.e.disagreement})` : ''}`, `${yn(6)} / ${yn(12)} / ${yn(24)}`, r.exposedBy[24].map((s) => s.name).join('; ') || 'none', String(r.e.records.length), <Src srcs={r.e.srcs} />],
                    out: [stateName(r.e.st), r.e.election, r.e.date, r.e.incumbentRaw, r.e.winnerRaw, r.outcome, `${yn(6)}/${yn(12)}/${yn(24)}`, r.exposedBy[24].map((s) => s.name).join('; '), r.e.records.length],
                    urls: urlsOf(r.e.srcs),
                  };
                })}
                empty={<p>No election recorded in this file.</p>} />
            </div>
          </>
        )}
      </details>

      <details data-twin="schemes" open={open} className="border-t border-b border-border">
        <summary className={summaryCls}>{EMPTY ? 'Every scheme in view · 0 rows · register not yet promoted' : `Every scheme in view · ${schemes.length} schemes · filters: ${filtersText || 'none'} · as of ${asOfLabel}`}</summary>
        {EMPTY ? empty : (
          <>
            <TableBlock name="schemes" ctx={ctx} minWidth="110rem"
              cols={[
                { key: 'scheme', label: 'Scheme', th: true }, { key: 'state', label: 'State' }, { key: 'level', label: 'Level' }, { key: 'party', label: 'Party' }, { key: 'category', label: 'Category' },
                { key: 'announced', label: 'Announced (date · by)' }, { key: 'approved', label: 'Approved (date · body)' }, { key: 'launched', label: 'Launched' },
                { key: 'benefit', label: `Benefit as of ${f.y ?? AS_OF_YEAR} (amount · unit)` }, { key: 'beneficiaries', label: 'Beneficiaries (count · as of)' },
                { key: 'outlay_latest', label: 'Outlay latest FY (bud / act ₹ cr · budget share)' }, { key: 'next_election', label: 'Next election (date · months computed · recorded · result)' },
                { key: 'latest_status', label: 'Latest status' }, { key: 'findings', label: 'Findings D/R/A/An' }, { key: 'sources', label: 'Sources' },
              ]}
              rows={schemes.map((s) => {
                const y = f.y ?? AS_OF_YEAR;
                const amt = amountInForce(s, y).amount;
                const snap = [...s.beneficiaries].filter((b) => b.count != null).sort((a, b) => ((a.asOf ?? '') < (b.asOf ?? '') ? 1 : -1))[0];
                const o = [...s.outlay].sort((a, b) => (a.fy < b.fy ? 1 : -1))[0];
                const ne = nextElection(s);
                const ec = s.electionContext;
                const nextText = ne
                  ? `${ne.date} · ${monthsBetweenSafe(s.launched?.date, ne.date) ?? 'not computable'} months, computed here · recorded ${ec?.monthsFromLaunch ?? 'not recorded'} · ${ne.winnerRaw ?? 'result not recorded'}`
                  : ec ? `${ec.date ?? 'date not located'} · months not computable here · recorded ${ec.monthsFromLaunch ?? 'not recorded'} · ${ec.result ?? 'result not recorded'}` : 'no later election in the file';
                const latest = latestStatusOf(s);
                const tally = (t: string) => s.results.filter((r) => r.tier === t).length;
                return {
                  cells: [
                    <QLink tabIndex={open ? undefined : -1} search={search({ s: s.id })} className="underline underline-offset-2 hover:text-accent">{s.name}</QLink>,
                    s.level === 'central' ? 'Central' : stateName(s.st), s.level, partyText(s), s.category ?? 'not recorded',
                    `${s.announced?.date ?? 'date not located'} · ${s.announced?.byPersonId ? entityLabel(s.announced.byPersonId) : 'person not stated'}`,
                    <>{`${s.approved?.date ?? 'date not located'} · `}{s.approved?.body ? <Verbatim>{s.approved.body}</Verbatim> : 'body not stated'}</>,
                    s.launched?.date ?? 'not located',
                    <>{amt != null ? `₹${fmtNum(amt)} · ` : 'amount not located · '}{s.benefit?.unit ? <Verbatim>{s.benefit.unit}</Verbatim> : 'unit not recorded'}</>,
                    snap ? `${fmtNum(snap.count!)} · ${snap.asOf ?? 'date not located'}` : 'not located',
                    o ? `FY ${o.fy} · ${o.budgetedCr != null ? fmtNum(o.budgetedCr) : 'not located'} / ${o.actualCr != null ? fmtNum(o.actualCr) : 'not located'} · ${o.pctOfStateBudget != null ? `${fmtNum(o.pctOfStateBudget)} per cent` : 'share not located'}` : 'not located',
                    nextText,
                    latest ? `${latest.status} ${latest.date ?? 'undated'}` : 'none recorded',
                    `${tally('documented')}/${tally('reported')}/${tally('alleged')}/${tally('analytic')}`,
                    <Src srcs={s.srcs} />,
                  ],
                  out: [s.name, stateName(s.st), s.level, partyText(s), s.category, s.announced?.date ?? null, s.approved?.date ?? null, s.launched?.date ?? null, amt, snap?.count ?? null, o ? `${o.fy} ${o.budgetedCr ?? ''}/${o.actualCr ?? ''}` : null, nextText, latest ? `${latest.status} ${latest.date ?? ''}` : null, `${tally('documented')}/${tally('reported')}/${tally('alleged')}/${tally('analytic')}`],
                  urls: urlsOf(s.srcs),
                };
              })} />
          </>
        )}
      </details>
    </section>
    </Tabbable.Provider>
  );
});
