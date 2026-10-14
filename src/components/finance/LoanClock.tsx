import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { TIERS, type GEdge } from '../../graph/schema';
import {
  type Filters, LOANS, CENSUS, isCensus, loanPass, LANE_ROLES, LOK_SABHA, assemblyFor, FIRST_LOAN_YEAR, ASOF_YEAR_F, yearOf, labelOf,
  approvalsByYear, approvalsByMonth, officeOnDate, MOF, datedActs, FINANCE_ASOF, isPipeline, stateName, lokSabhaIn, shareOf, FIRST_LOK_SABHA_YEAR,
  NO_START_WINDOWS,
} from '../../data/financeView';
import { Caption, Twin, Table, Exports, usePage, SkipLinks, captionLine, OpenRecord, RowActions, type Row, ScrollBox } from './ui';

/**
 * When (spec §5.1.3): a project-count lane, one tick per loan record by lender, one bar
 * per recorded office window, Lok Sabha rules from the register only. A bar covering an
 * approval is the date test, not a finding; no interval to an election is computed.
 * Drawn here rather than by energy's TenureLanes so that component stays byte-identical
 * for /energy.
 */

export const CLOCK_H3 = 'When: approvals against elections and office';
export const YEARS_H3 = 'Approvals and office by year';
export const RULES_H3 = 'Election rules on the clock';
export const MONTHS_H3 = 'Month of approval';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const ROW = 14;

const frac = (d: string) => {
  const y = Number(d.slice(0, 4));
  const m = d.length >= 7 ? Number(d.slice(5, 7)) - 1 : 6;
  const day = d.length >= 10 ? Number(d.slice(8, 10)) - 1 : 14;
  return y + (m + day / 31) / 12;
};

interface Lane { key: string; label: string; entity: string | null; kind: 'count' | 'lender' | 'office'; recs: GEdge[] }

export default function LoanClock({ f, captionId, narrow }: { f: Filters; captionId: string; narrow: boolean }) {
  const { filters: filterText, empty, showConnections, patch } = usePage();
  const uid = useId().replace(/:/g, '');
  const [showDiagram, setShowDiagram] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const loans = useMemo(() => LOANS.filter((e) => loanPass(f, e, { inc: true })), [f]);
  const census = loans.filter(isCensus);
  const lsYears = LOK_SABHA.map((e) => yearOf(e.date)).filter((y): y is number => y != null);
  const start = FIRST_LOAN_YEAR ?? (lsYears.length ? Math.min(...lsYears) : null);
  const end = ASOF_YEAR_F ?? (lsYears.length ? Math.max(...lsYears) : null);
  const x0 = start ?? 0;
  // One x-scale for every lane (§8.2-9): it runs past the register date far enough to hold
  // the records dated after it, which sit in their own shaded strip.
  const lastDated = Math.max(...LOANS.map((e) => yearOf(e.from) ?? -Infinity), end ?? x0);
  const x1 = Math.max(end ?? x0, lastDated) + 1;
  const LABEL_W = narrow ? 96 : 190;
  // A labelled gutter at the right edge holds undated records, apart from the dated axis.
  const GUT = 52;
  const PLOT_W = Math.max(narrow ? 560 : 640, (x1 - x0) * 9) + GUT;
  const AXIS_W = PLOT_W - GUT - 16;
  const sx = (v: number) => ((v - x0) / Math.max(1, x1 - x0)) * AXIS_W + 8;
  const invX = (px: number) => x0 + ((px - 8) / AXIS_W) * (x1 - x0);
  const asOfX = FINANCE_ASOF ? sx(frac(FINANCE_ASOF)) : sx(x1);
  const axisEnd = sx(x1);
  const gutX = PLOT_W - GUT + 6;

  const lanes: Lane[] = useMemo(() => {
    const out: Lane[] = [{ key: 'count', label: 'Census projects approved per year', entity: null, kind: 'count', recs: census }];
    const lenders = [...new Set(loans.map((e) => e.s))].sort((a, b) => Number(!CENSUS.some((e) => e.s === a)) - Number(!CENSUS.some((e) => e.s === b)) || (labelOf(a) < labelOf(b) ? -1 : 1));
    for (const l of lenders) out.push({ key: `l:${l}`, label: labelOf(l), entity: l, kind: 'lender', recs: loans.filter((e) => e.s === l) });
    const byOffice = new Map<string, GEdge[]>();
    for (const e of LANE_ROLES) {
      if (!f.tiers.has(e.tier)) continue;
      const k = `${e.s}|${e.t}|${e.lab ?? ''}`;
      if (!byOffice.has(k)) byOffice.set(k, []);
      byOffice.get(k)!.push(e);
    }
    for (const [k, es] of byOffice) out.push({ key: `o:${k}`, label: `${labelOf(es[0].s)} — ${es[0].lab ?? labelOf(es[0].t)}`, entity: es[0].s, kind: 'office', recs: es });
    return out;
  }, [loans, census, f.tiers]);
  const shown = empty ? [
    { key: 'count', label: 'Census projects approved per year', entity: null, kind: 'count' as const, recs: [] },
    { key: 'lenders', label: 'Lenders', entity: null, kind: 'lender' as const, recs: [] },
    { key: 'office', label: 'Ministry of Finance office windows', entity: null, kind: 'office' as const, recs: [] },
  ] : lanes;

  const perYear = useMemo(() => approvalsByYear(census), [census]);
  const pipelineYears = useMemo(() => new Set(census.filter(isPipeline).map((e) => yearOf(e.from)).filter((y): y is number => y != null)), [census]);
  const undatedN = loans.filter((e) => !e.from).length;
  const afterN = loans.filter((e) => e.from && FINANCE_ASOF && e.from > FINANCE_ASOF).length;
  const maxPer = Math.max(1, ...perYear.values());
  const rules = useMemo(() => [
    ...LOK_SABHA.map((e) => ({ date: e.date, kind: 'lok-sabha' as const, label: `Lok Sabha: ${e.winner ?? 'winner not recorded'}` })),
    ...assemblyFor(f.st).map((e) => ({ date: e.date, kind: 'assembly' as const, label: `${stateName(e.st ?? '')} assembly: ${e.winner ?? 'winner not recorded'}` })),
    ...(FINANCE_ASOF ? [{ date: FINANCE_ASOF, kind: 'asof' as const, label: 'register date' }] : []),
  ].sort((a, b) => (a.date < b.date ? -1 : 1)), [f.st]);
  const H = shown.length * ROW + 34;

  useLayoutEffect(() => {
    const el = box.current;
    if (el) el.scrollLeft = el.scrollWidth - el.clientWidth;
  }, [showDiagram, narrow, PLOT_W]);

  const openWindows = LANE_ROLES.filter((e) => e.from && !e.to);
  const months = useMemo(() => approvalsByMonth(census), [census]);
  const noData = empty || f.tiers.size === 0;
  const tickYears = start != null && end != null ? Array.from({ length: end - start + 1 }, (_, i) => start + i).filter((y) => y % 10 === 0 || y === start || y === end) : [];

  // ---- twins
  const laneRows: Row[] = noData ? [] : shown.flatMap((l): Row[] => {
    // A lane head names the tiers its records carry, never a tier it does not hold.
    const tiers = [...new Set(l.recs.map((r) => r.tier))].join(', ') || 'no record in view';
    const head: Row = { cells: [l.label, l.kind === 'count' ? 'census project count per year (bars)' : `${l.recs.length} records`, start != null ? String(start) : 'no date', FINANCE_ASOF ?? 'register date not recorded', tiers, 'lane'], out: [l.label, l.kind, start, FINANCE_ASOF, tiers, ''] };
    if (l.kind === 'count') return [head];
    return [head, ...l.recs.map((r): Row => ({
      cells: [l.label, <RowActions key="r"><OpenRecord id={r.id!} lab={r.lab ?? r.id!}>{r.lab ?? r.id}</OpenRecord></RowActions>, r.from ?? (l.kind === 'office' ? 'start not recorded' : 'undated'), r.to ?? (l.kind === 'office' ? 'end not recorded' : 'no end date in the record'), r.tier, r.srcs?.[0]?.[0] ?? 'no source in file'],
      out: [l.label, r.id, r.from ?? '', r.to ?? '', r.tier, r.srcs?.[0]?.[1] ?? ''],
    }))];
  });
  const yearRows: Row[] = noData || start == null || end == null ? [] : Array.from({ length: end - start + 1 }, (_, i) => start + i).map((y) => {
    const n = perYear.get(y) ?? 0;
    const res = loans.filter((e) => !isCensus(e) && yearOf(e.from) === y).length;
    const ls = lokSabhaIn(y);
    const mid = officeOnDate(`${y}-07-01`, [MOF]);
    const holders = [...mid.covers, ...mid.openEnded].map((e) => `${labelOf(e.s)} — ${e.lab ?? ''}${e.to ? '' : ' (end not recorded)'}`);
    const pipe = census.some((e) => yearOf(e.from) === y && isPipeline(e));
    return {
      current: f.yFrom != null && y >= f.yFrom && y <= (f.yTo ?? f.yFrom),
      cells: [String(y), n ? `${n} projects approved${pipe ? ' (pipeline year)' : ''}` : '0 approvals in the census', res ? `${res} researched records` : 'no researched record',
        ls.length ? ls.map((e) => `Lok Sabha: ${e.winner ?? 'winner not recorded'}`).join('; ') : 'no general election in the register',
        holders.length ? holders.join('; ') : `no recorded window covers ${y}-07-01`],
      out: [y, n, res, ls.map((e) => e.winner ?? '').join('; '), holders.join('; ')],
    };
  });
  const ruleRows: Row[] = noData ? [] : rules.map((r) => ({ cells: [r.date, r.kind === 'lok-sabha' ? 'general election' : r.kind === 'assembly' ? 'assembly election' : 'register date', r.label], out: [r.date, r.kind, r.label] }));
  const monthRows: Row[] = noData || !months.projects ? [] : months.counts.map((n, i) => ({
    cells: [MONTHS[i], `${n} census projects approved`, `of ${months.projects}`, shareOf(n, months.projects) ?? 'share not printed below ten projects'],
    out: [i + 1, n, months.projects],
  }));

  const diagram = (
    <div>
      <div ref={box} style={{ overflowX: 'auto' }} className="relative">
        <div className="flex" style={{ width: LABEL_W + PLOT_W }}>
          <ul className="list-none p-0 m-0 sticky left-0 z-10 bg-bg shrink-0" style={{ width: LABEL_W, paddingTop: 22 }} aria-label="Lanes" aria-describedby={captionId}>
            {shown.map((l) => {
              const undated = l.recs.filter((r) => !r.from && l.kind === 'lender').length;
              const text = `${l.label}${l.recs.length ? '' : ' — none recorded'}${undated ? ` · ${undated} undated` : ''}`;
              return (
                <li key={l.key} style={{ height: ROW }} className="flex items-center min-w-0">
                  <button type="button" data-lane="" title={text} aria-label={`${text}${l.entity ? ' — show connections' : ''}`}
                    onClick={(e) => { if (l.entity) showConnections(l.entity, e.currentTarget); }}
                    className="truncate text-left font-mono text-[12px] leading-none text-text-secondary hover:text-accent w-full">{text}</button>
                </li>
              );
            })}
          </ul>
          <svg width={PLOT_W} height={H} aria-hidden="true" className="shrink-0 block"
            onPointerDown={(e) => { (e.currentTarget as SVGSVGElement).dataset.brush = String(e.nativeEvent.offsetX); }}
            onPointerUp={(e) => {
              const a = Number((e.currentTarget as SVGSVGElement).dataset.brush);
              const b = e.nativeEvent.offsetX;
              if (!Number.isFinite(a) || Math.abs(b - a) < 12) return;
              const ya = Math.floor(invX(Math.min(a, b)));
              const yb = Math.floor(invX(Math.min(Math.max(a, b), axisEnd)));
              patch({ y: ya === yb ? String(ya) : `${ya}-${yb}`, tp: null });
            }}>
            {FIRST_LOK_SABHA_YEAR != null && (
              <g>
                <rect x={0} y={20} width={Math.max(0, sx(frac(LOK_SABHA[0].date)) - 1)} height={H - 20} fill="rgba(140,140,140,0.08)" />
                <text x={4} y={H - 4} fontSize="9" fill="rgb(150,150,150)">{`general elections before ${FIRST_LOK_SABHA_YEAR} not in this register`}</text>
              </g>
            )}
            <defs>
              <pattern id={`pipe-${uid}`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="4" stroke="rgb(10,10,12)" strokeWidth="1.6" />
              </pattern>
            </defs>
            {/* After the register date: shaded and labelled, so a future-dated approval is never read as a past one. */}
            <rect x={asOfX} y={16} width={Math.max(0, axisEnd - asOfX)} height={H - 16} fill="rgba(140,140,140,0.10)" />
            {afterN > 0 && <text x={Math.min(asOfX + 3, axisEnd - 4)} y={H - 4} fontSize="9" fill="rgb(160,160,160)">{`after the register date: ${afterN}`}</text>}
            {/* The undated gutter: records with no approval date, apart from every dated mark. */}
            <line x1={PLOT_W - GUT} x2={PLOT_W - GUT} y1={16} y2={H} stroke="rgba(150,150,150,0.35)" />
            <text x={PLOT_W - GUT + 3} y={11} fontSize="9" fill="rgb(170,170,170)">{`undated${undatedN ? ` (${undatedN})` : ''}`}</text>
            {tickYears.map((y) => (
              <g key={y}><line x1={sx(y)} x2={sx(y)} y1={16} y2={H} stroke="rgba(150,150,150,0.18)" /><text x={sx(y)} y={11} fontSize="10" textAnchor="middle" fill="rgb(170,170,170)">{y}</text></g>
            ))}
            {!noData && rules.map((r) => (
              <g key={`${r.kind}${r.date}`} data-election={r.kind === 'lok-sabha' ? '' : undefined} data-assembly={r.kind === 'assembly' ? '' : undefined}>
                <line x1={sx(frac(r.date))} x2={sx(frac(r.date))} y1={16} y2={H - 12} stroke={r.kind === 'assembly' ? 'rgba(200,200,200,0.35)' : 'rgb(200,200,200)'} strokeWidth={1} />
              </g>
            ))}
            {shown.map((l, i) => {
              const y = 22 + i * ROW;
              if (l.kind === 'count') {
                return (
                  <g key={l.key}>
                    {[...perYear.entries()].map(([yr, n]) => {
                      const bx = sx(yr); const bw = Math.max(2, sx(yr + 1) - sx(yr) - 1); const bh = (ROW - 4) * (n / maxPer); const by = y + ROW - 2 - bh;
                      return (
                        <g key={yr}>
                          <rect x={bx} y={by} width={bw} height={bh} fill="rgb(160,160,160)" />
                          {pipelineYears.has(yr) && <rect x={bx} y={by} width={bw} height={bh} fill={`url(#pipe-${uid})`}><title>{`${yr}: includes pipeline projects, not yet approved`}</title></rect>}
                        </g>
                      );
                    })}
                  </g>
                );
              }
              if (l.kind === 'lender') {
                return (
                  <g key={l.key}>
                    {l.recs.map((r, j) => {
                      const x = r.from ? sx(frac(r.from)) : gutX + (j % 6) * 7;
                      return <line key={r.id} data-mark="" x1={x} x2={x} y1={y + 2} y2={y + ROW - 2} stroke="rgb(210,210,210)" strokeWidth={1.2} strokeDasharray={TIERS[r.tier].dash || undefined} />;
                    })}
                  </g>
                );
              }
              return (
                <g key={l.key}>
                  {l.recs.map((r) => {
                    // No recorded start: a mark at the recorded end, never a span from the axis
                    // start, which would invent coverage of every earlier approval.
                    if (!r.from && r.to) {
                      const xe = sx(frac(r.to));
                      return (
                        <g key={r.id}>
                          <line data-mark="" x1={xe} x2={xe} y1={y + 1} y2={y + ROW - 1} stroke="rgb(200,200,200)" strokeWidth={2} strokeDasharray={TIERS[r.tier].dash || undefined} />
                          <text x={Math.max(2, xe - 3)} y={y + ROW - 4} fontSize="9" textAnchor="end" fill="rgb(160,160,160)">start not recorded</text>
                        </g>
                      );
                    }
                    const a = r.from ? sx(frac(r.from)) : 8;
                    const b = r.to ? sx(frac(r.to)) : asOfX;
                    const open = !r.to;
                    return (
                      <g key={r.id}>
                        <rect data-mark="" x={a} y={y + 3} width={Math.max(2, b - a)} height={ROW - 6} fill={open ? 'none' : 'rgba(170,170,170,0.35)'} stroke="rgb(200,200,200)" strokeWidth={1} strokeDasharray={TIERS[r.tier].dash || undefined} />
                        {open && <text x={Math.min(b + 3, PLOT_W - 60)} y={y + ROW - 4} fontSize="9" fill="rgb(160,160,160)">end not recorded</text>}
                      </g>
                    );
                  })}
                </g>
              );
            })}
            <line x1={asOfX} x2={asOfX} y1={16} y2={H} stroke="rgb(200,200,200)" strokeWidth={1} />
          </svg>
        </div>
      </div>
      {narrow && (
        <p className="font-mono text-[12px] text-text-muted mt-1 flex gap-3 items-center">
          <span>{`showing ${start ?? ''}–${end ?? ''}`}</span>
          <button type="button" className="underline" onClick={() => { if (box.current) box.current.scrollLeft -= 200; }}>‹ earlier</button>
          <button type="button" className="underline" onClick={() => { if (box.current) box.current.scrollLeft += 200; }}>later ›</button>
        </p>
      )}
    </div>
  );

  const monthsFig = (
    <>
    <figure className="m-0 mt-6">
      <h3 className="text-[15px] font-semibold text-text">{MONTHS_H3}</h3>
      <SkipLinks twins={[{ twin: 'loan-months', title: MONTHS_H3 }]} />
      <svg width="100%" height="70" viewBox="0 0 240 70" preserveAspectRatio="none" aria-hidden="true" className="max-w-[420px] block">
        {months.counts.map((n, i) => { const mx = Math.max(1, ...months.counts); const h = 56 * (n / mx); return <rect key={i} x={i * 20 + 2} y={60 - h} width={16} height={h} fill="rgb(160,160,160)" />; })}
      </svg>
      <p className="text-[13px] text-text-secondary max-w-[72ch]">{`n = ${months.projects} census projects with an approval month recorded; ${months.undated} projects with no month recorded are not drawn. Lenders approve on their board calendars. Any clustering by month is one boring explanation for clustering by anything else.`}</p>
    </figure>
      <Twin twin="loan-months" title={MONTHS_H3} rowCount={monthRows.length} open={f.view === 'table'}>
        {() => (
          <ScrollBox label={`${MONTHS_H3} — table`}>
            <Exports name={MONTHS_H3} twin="loan-months" meta={{ table: MONTHS_H3, population: 'census projects in view by calendar month of approval', lens: 'loans', filters: filterText, rows: monthRows.length }} header={['month', 'projects', 'of_projects']} rows={() => monthRows.map((r) => r.out)} />
            <Table caption={captionLine(monthRows.length, 'census projects in view by month of approval', 'loans', filterText)} cols={[{ key: 'm', label: 'Month', th: true }, { key: 'n', label: 'Census projects approved' }, { key: 'of', label: 'Of projects' }, { key: 's', label: 'Share' }]}
              rows={monthRows.length ? monthRows : [{ cells: ['Nothing recorded yet.'], out: [] }]} />
          </ScrollBox>
        )}
      </Twin>
    </>
  );

  return (
    <>
    <figure className="m-0 mt-10 min-w-0" aria-labelledby={`${uid}-h`}>
      <h3 id={`${uid}-h`} className="text-[16px] font-semibold text-text mb-1">{CLOCK_H3}</h3>
      <SkipLinks twins={[{ twin: 'loan-lanes', title: CLOCK_H3 }, { twin: 'loan-years', title: YEARS_H3 }, { twin: 'loan-rules', title: RULES_H3 }]} />
      {narrow && !showDiagram ? (
        <button type="button" className="font-mono text-[13px] underline my-2 min-h-[44px]" onClick={() => setShowDiagram(true)}>Show the diagram</button>
      ) : diagram}
      <p className="text-[13.5px] text-text-secondary my-2 max-w-[72ch]">{`Union budget dates are not a dataset in this build. ${datedActs.length} dated Finance Ministry acts are drawn as ticks; no other budget mark is drawn.`}</p>
      <Caption id={captionId} cap="C4" as="figcaption">
        {`General elections recorded in the register: ${LOK_SABHA.map((e) => yearOf(e.date)).join(', ') || 'none'}. Earlier ones are absent from the file, not from history. Dated Finance Ministry acts recorded: ${datedActs.length}; every other budget and signature is absent from this file. A tenure bar covering a loan's date is the date test, not a finding: no record here says a minister approved a loan. ${openWindows.length} of ${LANE_ROLES.length} recorded windows have no end date and are drawn to the register date, outline only, with that label; every current office-holder is one of them by construction, because a sitting holder's record has no end. ${NO_START_WINDOWS.length} of ${LANE_ROLES.length} have an end and no recorded start, and are drawn as a mark at their end labelled "start not recorded": they cover no earlier approval. Hatched year bars include pipeline projects; the shaded strip after the register date holds ${afterN} records dated later than it, and the right-hand gutter holds ${undatedN} undated records. This page computes no interval between an approval and an election; the month histogram beside the lanes shows that approvals cluster on board calendars in every year.${f.st ? ' An assembly election falls somewhere in India almost every year; timing is not cause.' : ''}`}
      </Caption>
    </figure>
      <Twin twin="loan-lanes" title={CLOCK_H3} rowCount={laneRows.length} open={f.view === 'table' || (narrow && !showDiagram)}>
        {() => (
          <ScrollBox label={`${CLOCK_H3} — table`}>
            <Exports name={CLOCK_H3} twin="loan-lanes" meta={{ table: CLOCK_H3, population: 'one row per lane, then one per record drawn in it', lens: 'loans', filters: filterText, rows: laneRows.length }} header={['lane', 'record', 'from', 'to', 'tier', 'source']} rows={() => laneRows.map((r) => r.out)} />
            <Table caption={captionLine(laneRows.length, 'lanes and the records drawn in them', 'loans', filterText)} className="min-w-[48rem]"
              cols={[{ key: 'lane', label: 'Lane' }, { key: 'rec', label: 'Holder or record' }, { key: 'from', label: 'From' }, { key: 'to', label: 'To' }, { key: 'tier', label: 'Tier' }, { key: 'src', label: 'Source' }]}
              rows={laneRows.length ? laneRows : [{ cells: ['Nothing recorded yet.'], out: [] }]} />
          </ScrollBox>
        )}
      </Twin>
      <h3 className="text-[14px] font-semibold text-text mt-4">{YEARS_H3}</h3>
      <Twin twin="loan-years" title={YEARS_H3} rowCount={yearRows.length} open={f.view === 'table' || (narrow && !showDiagram)}>
        {() => (
          <ScrollBox label={`${YEARS_H3} — table`}>
            <Exports name={YEARS_H3} twin="loan-years" meta={{ table: YEARS_H3, population: 'every year from the first loan record to the register date', lens: 'loans', filters: filterText, rows: yearRows.length }} header={['year', 'census_projects', 'researched_records', 'general_election', 'office_mid_year']} rows={() => yearRows.map((r) => r.out)} />
            <Table caption={captionLine(yearRows.length, 'every year from the first loan record to the register date', 'loans', filterText)} className="min-w-[48rem]"
              cols={[{ key: 'y', label: 'Year', th: true }, { key: 'n', label: 'Census projects approved' }, { key: 'r', label: 'Researched records' }, { key: 'e', label: 'Election that year (winner as text)' }, { key: 'o', label: 'Office-holders whose window covers 1 July (mid-year test)' }]}
              rows={yearRows.length ? yearRows : [{ cells: ['Nothing recorded yet.'], out: [] }]} />
          </ScrollBox>
        )}
      </Twin>
      <h3 className="text-[14px] font-semibold text-text mt-4">{RULES_H3}</h3>
      <Twin twin="loan-rules" title={RULES_H3} rowCount={ruleRows.length} open={f.view === 'table'}>
        {() => (
          <ScrollBox label={`${RULES_H3} — table`}>
            <Exports name={RULES_H3} twin="loan-rules" meta={{ table: RULES_H3, population: 'general elections in the register, assembly elections for the selected state, the register date', lens: 'loans', filters: filterText, rows: ruleRows.length }} header={['date', 'kind', 'label']} rows={() => ruleRows.map((r) => r.out)} />
            <Table caption={captionLine(ruleRows.length, 'rules drawn on the clock', 'loans', filterText)} cols={[{ key: 'd', label: 'Date', th: true }, { key: 'k', label: 'Kind' }, { key: 'l', label: 'Label' }]}
              rows={ruleRows.length ? ruleRows : [{ cells: ['Nothing recorded yet.'], out: [] }]} />
          </ScrollBox>
        )}
      </Twin>
      {monthsFig}
    </>
  );
}
