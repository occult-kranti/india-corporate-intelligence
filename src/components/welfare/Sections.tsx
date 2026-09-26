import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Section, Callout } from '../Editorial';
import { ContestedFact, GapsPanel, type Gap } from '../Domain';
import type { GEdge } from '../../graph/schema';
import {
  type WelfareFilters, type ElectionRow, type ControlWindow, type PartyRow, type TurnoverRow,
  aOfB, fmtNum, stateName, partyText, entityLabel, whoLabel, byText, answersTo, isAuditNote, allegationLedger,
  WELFARE_SYMMETRY_LIST, WELFARE_BASE_RATE_LIST, WELFARE_VOID_LIST, WELFARE_CLAIM_LIST,
  timing, partyRows, turnovers, hasCut, ministersRows, ministerActions, completeness, statusRows, afterSummary,
  promisedRows, scrutinyRows, benefitRows, findingsRows, contested, inView, ACTIONS, killedClaims, auditRan,
  type AllegedClaim,
} from '../../data/welfareView';
import { TierWord, Src, Verbatim, Caption, ListDetails, TableBlock, useTab, LazyTwin, type TableCtx, QLink } from './ui';
import { TwoByTwo, TimingChart, StackedBlocks, ElectionItem, binLabel } from './Control';
import { AllegationPair, SchemeResponses, ROSE_KEY, MISSING_RESPONSE, itemResponseText } from './Panels';

type Search = (kv: Record<string, string | null>) => string;

const NOTHING = <p className="text-[14px] text-text-secondary">Nothing recorded yet.</p>;
function SchemeLink({ id, name, search }: { id: string; name: string; search: Search }) {
  const tab = useTab();
  return <QLink tabIndex={tab} search={search({ s: id })} className="text-text underline underline-offset-2 hover:text-accent">{name}</QLink>;
}
const urlsOf = (srcs: [string, string][] | undefined) => (srcs ?? []).map((s) => s[1]);

// ---------------------------------------------------------------------------
// §5.8 The control, long form
// ---------------------------------------------------------------------------

export function ControlSection({ f, empty, rows, windows, ctx, narrow, search }: {
  f: WelfareFilters; empty: boolean; rows: ElectionRow[]; windows: ControlWindow[]; ctx: TableCtx; narrow: boolean; search: Search;
}) {
  const note = 'Party filter and search not applied: this section is the comparison · category and level filters apply';
  if (empty) {
    return (
      <Section id="control" title="The control: every election, with and without a scheme" note={note}>
        {NOTHING}
        <p className="text-[14px] text-text-secondary mt-2">No elections recorded, so the control cannot run. This is the most important gap on the page.</p>
      </Section>
    );
  }
  const w = (m: number) => windows.find((x) => x.months === m)!;
  const dec = (x: ControlWindow['exposed']) => x.retained.length + x.lost.length;
  const sens = `6 m: retained ${w(6).exposed.retained.length} of ${dec(w(6).exposed)} with · ${w(6).notExposed.retained.length} of ${dec(w(6).notExposed)} without — 24 m: retained ${w(24).exposed.retained.length} of ${dec(w(24).exposed)} with · ${w(24).notExposed.retained.length} of ${dec(w(24).notExposed)} without`;
  const t = timing(f);
  const uniform = (t.b / 5).toFixed(1);
  const pr = partyRows(f);
  const tv = turnovers(f);
  const kSchemes = new Set(tv.rows.map((r) => r.scheme.id)).size;
  const kElect = new Set(tv.rows.map((r) => r.e.key)).size;
  const withDated = new Set(tv.rows.filter((r) => r.placed.length).map((r) => r.scheme.id)).size;
  const uncl = tv.rows.filter((r) => r.outcome === 'unclassified').length;
  const ownCut = tv.own.filter(hasCut);
  const rivalCut = tv.rival.filter(hasCut);
  const partyCols = [
    { key: 'party', label: 'Party', th: true },
    { key: 'b_with_later_election', label: 'State schemes with a launch date and a later election (b)' },
    { key: 'launched_within_12m', label: 'Launched within 12 m (a of b)' },
    { key: 'uniform_expectation', label: 'Uniform expectation (b/5, analytic)' },
    { key: 'raised_within_12m', label: 'Raised within 12 m of an election' },
    { key: 'promised_not_enacted', label: 'Promised, not enacted' },
    { key: 'cut_tightened_paused_discontinued', label: 'Cut · tightened · paused · discontinued' },
    { key: 'findings_d_r_a_an', label: 'Findings D / R / A / An' },
    { key: 'alleged_claims_answered', label: 'Alleged claims about its schemes: with a response (k of n)' },
    { key: 'as_incumbent', label: 'As incumbent: retained / lost / unclassified' },
  ];
  const names = (xs: { name: string }[]) => xs.map((s) => s.name);
  const claimNames = (xs: AllegedClaim[]) => xs.map((a) => `${entityLabel(a.claim.s)}: ${a.claim.lab ?? a.claim.d ?? 'no summary'}`);
  const cell = (text: string, items: ReactNode[]) => (
    <>
      <span className="font-mono tabular-nums text-text">{text}</span>
      {items.length > 0 && <ListDetails summary={`which (${items.length})`} items={items} />}
    </>
  );
  const partyRow = (r: PartyRow) => {
    const b = r.withLater.length;
    const inc = r.incumbent;
    const accent = f.party?.has(r.party);
    return {
      className: accent ? '[&>*:first-child]:border-l-2 [&>*:first-child]:border-l-accent [&>*:first-child]:pl-2' : '',
      cells: [
        r.party,
        cell(String(b), names(r.withLater)),
        cell(aOfB(r.within12.length, b), names(r.within12)),
        <span className="font-mono">{`${(b / 5).toFixed(1)} (analytic)`}</span>,
        cell(String(r.raised12.length), names(r.raised12)),
        cell(String(r.promised.length), names(r.promised)),
        cell(String(r.cuts.length), names(r.cuts)),
        <span className="font-mono">{`${r.findings.D} / ${r.findings.R} / ${r.findings.A} / ${r.findings.An}`}</span>,
        cell(aOfB(r.answered.length, r.alleged.length), claimNames(r.answered)),
        cell(`${inc.retained.length} / ${inc.lost.length} / ${inc.unclassified.length}`, [...inc.retained, ...inc.lost, ...inc.unclassified].map((e) => <ElectionItem key={e.key} r={e} />)),
      ],
      out: [r.party, b, aOfB(r.within12.length, b), (b / 5).toFixed(1), r.raised12.length, r.promised.length, r.cuts.length, `${r.findings.D}/${r.findings.R}/${r.findings.A}/${r.findings.An}`, aOfB(r.answered.length, r.alleged.length), `${inc.retained.length}/${inc.lost.length}/${inc.unclassified.length}`],
      urls: [],
    };
  };
  const allRows = [pr.all, ...pr.parties, pr.none, pr.central];
  const blocks = allRows.map((r) => ({
    head: r.party,
    accent: !!f.party?.has(r.party),
    lines: [
      { label: 'launched within 12 m of the next election', value: aOfB(r.within12.length, r.withLater.length), items: names(r.within12) },
      { label: 'alleged claims about its schemes with a response', value: aOfB(r.answered.length, r.alleged.length), items: claimNames(r.answered) },
      { label: 'as incumbent, retained of decided', value: aOfB(r.incumbent.retained.length, r.incumbent.retained.length + r.incumbent.lost.length), items: [...r.incumbent.retained, ...r.incumbent.lost].map((e) => <ElectionItem key={e.key} r={e} />) },
      { label: 'uniform expectation (analytic)', value: `${(r.withLater.length / 5).toFixed(1)} per bin`, items: [] },
      { label: 'raised within 12 m of an election', value: String(r.raised12.length), items: names(r.raised12) },
      { label: 'promised, not enacted', value: String(r.promised.length), items: names(r.promised) },
      { label: 'cut, tightened, paused or discontinued', value: String(r.cuts.length), items: names(r.cuts) },
      { label: 'findings D / R / A / An', value: `${r.findings.D} / ${r.findings.R} / ${r.findings.A} / ${r.findings.An}`, items: [] },
    ],
  }));

  return (
    <Section id="control" title="The control: every election, with and without a scheme" note={note}>
      <Callout label="Symmetry check" tone="note">
        {WELFARE_SYMMETRY_LIST.length ? WELFARE_SYMMETRY_LIST.map((s, i) => (
          <p key={i}><span className="font-mono text-[12px] text-text-muted">{s.domain}</span>{' '}<Verbatim>{s.text}</Verbatim></p>
        )) : <p>No symmetry check recorded in this file.</p>}
      </Callout>

      <h3 className="heading-editorial text-lg text-text mt-6">The two by two, at 12 months</h3>
      <TwoByTwo w={w(12)} ctx={ctx} sensitivity={sens} nLine={`n = ${rows.length}. No significance test is run at this n.`} />

      <h3 className="heading-editorial text-lg text-text mt-8">When launches fell against the next election</h3>
      <div className="grid md:grid-cols-[minmax(0,420px)_1fr] gap-6 items-start mt-3">
        <TimingChart bins={t.bins} b={t.b} />
        <div className="font-mono text-[12px] text-text-secondary space-y-1.5">
          <p>{`n = ${t.b} state schemes binned, of ${t.n} in view`}</p>
          <p>{`${t.noLater.length} schemes have no later election in the file · ${t.noLaunch.length} have no full launch date · ${t.beyond60.length} next election more than 60 months away. None of these are binned.`}</p>
          <p>{`Uniform timing over a 60-month term would put ${uniform} in each bin (analytic).`}</p>
          <p className="text-text-muted">Whole years from launch to the next assembly election in the same state; months are computed from the launch date and the election record, never read from a scheme's own election note.</p>
        </div>
      </div>
      <TableBlock name="timing" ctx={ctx} minWidth="28rem"
        cols={[{ key: 'bin', label: 'Bin', th: true }, { key: 'observed', label: 'Observed' }, { key: 'observed_share_of_b', label: 'Observed share of b' }, { key: 'uniform_expectation_analytic', label: 'Uniform expectation (analytic)' }]}
        rows={Object.entries(t.bins).map(([k, list]) => ({
          cells: [binLabel(k), cell(String(list.length), names(list)), t.b >= 10 ? aOfB(list.length, t.b) : `share not printed (b = ${t.b}, under 10)`, `${uniform} (analytic)`],
          out: [binLabel(k), list.length, t.b >= 10 ? aOfB(list.length, t.b) : 'not printed', uniform],
          urls: [],
        }))} />

      <h3 className="heading-editorial text-lg text-text mt-8">By party, in the same columns</h3>
      {narrow ? <StackedBlocks blocks={blocks} /> : (
        <TableBlock name="by-party" ctx={ctx} minWidth="72rem" caption="By party: the same columns for every party, including incumbents with no recorded scheme; the party rows and the no-single-party row sum to All parties; the filtered party is marked, never isolated" cols={partyCols} rows={allRows.map(partyRow)} />
      )}

      <h3 className="heading-editorial text-lg text-text mt-8">What happened to schemes after the government changed, and after it did not</h3>
      <p className="font-mono text-[12px] text-text-secondary mt-2">{`${kSchemes} state schemes were live at ${kElect} changes of government in the file · ${withDated} of ${kSchemes} have a dated status entry within 24 months · ${uncl} at unclassified (coalition) outcomes`}</p>
      <TableBlock name="turnover" ctx={ctx} minWidth="56rem" caption="Turnover: state schemes live at changes of government, and what the record shows within 24 months"
        cols={[{ key: 'state', label: 'State', th: true }, { key: 'scheme', label: 'Scheme (launched by)' }, { key: 'government_changed', label: 'Government changed (date · from → to)' }, { key: 'status_within_24m', label: 'Within 24 months: status entries (date · status · note)' }, { key: 'source', label: 'Source' }]}
        rows={tv.rows.map((r: TurnoverRow) => ({
          cells: [
            stateName(r.e.st),
            <>{<SchemeLink id={r.scheme.id} name={r.scheme.name} search={search} />}{` (${partyText(r.scheme)})`}</>,
            `${r.e.date} · ${r.e.incumbentRaw ?? 'not recorded'} → ${r.e.winnerRaw ?? 'not recorded'}${r.outcome === 'unclassified' ? ' · unclassified' : ''}`,
            <>
              {r.placed.length ? r.placed.map((p, i) => <span key={i} className="block">{`${p.date} · ${p.status} · `}{p.note ? <Verbatim>{p.note}</Verbatim> : 'no note'}</span>) : <span className="block">no change recorded in 24 months, which is not the same as continued</span>}
              {r.unplaced.length > 0 && <span className="block text-text-muted text-[13px]">{`not placed in the window, date is a month, a year or absent: ${r.unplaced.map((u) => `${u.date ?? 'undated'} ${u.status}`).join('; ')}`}</span>}
            </>,
            <Src srcs={[...r.e.srcs, ...r.placed.flatMap((p) => p.srcs)]} />,
          ],
          out: [stateName(r.e.st), r.scheme.name, `${r.e.date} ${r.e.incumbentRaw ?? ''} -> ${r.e.winnerRaw ?? ''}`, r.placed.map((p) => `${p.date} ${p.status}`).join('; ') || 'none recorded in 24 months'],
          urls: [...urlsOf(r.e.srcs), ...r.placed.flatMap((p) => urlsOf(p.srcs))],
        }))}
        empty={<p>No state scheme in view was live at a change of government in the file.</p>} />
      <div className="text-[14px] text-text-secondary">
        <p>{`After elections the scheme's own party won: ${aOfB(ownCut.length, tv.own.length)} live schemes had a cut, tightening, pause or discontinuation within 24 months · after a rival won: ${aOfB(rivalCut.length, tv.rival.length)}`}</p>
        <ListDetails summary={`which schemes, own party won (${ownCut.length})`} items={ownCut.map((r) => `${r.scheme.name} · ${stateName(r.e.st)} ${r.e.date}`)} />
        <ListDetails summary={`which schemes, rival won (${rivalCut.length})`} items={rivalCut.map((r) => `${r.scheme.name} · ${stateName(r.e.st)} ${r.e.date}`)} />
      </div>

      <h3 className="heading-editorial text-lg text-text mt-8">Recorded base rates</h3>
      <TableBlock name="base-rates" ctx={ctx} minWidth="60rem"
        cols={[{ key: 'property', label: 'Property' }, { key: 'numerator', label: 'Numerator' }, { key: 'denominator', label: 'Denominator' }, { key: 'rate', label: 'Rate' }, { key: 'reference_class', label: 'Reference class' }, { key: 'research_file', label: 'Research file' }, { key: 'source', label: 'Source' }]}
        rows={WELFARE_BASE_RATE_LIST.map((b) => {
          const den = b.denominator;
          const num = b.numerator;
          const rate = den == null || den === 0 || num == null ? 'not computed' : den >= 10 ? aOfB(num, den) : `${num} of ${den} · rate not printed (den < 10)`;
          return {
            // A null count is "not stated" (spec §7.2 rule 11 words), never a blank or a zero.
            cells: [<Verbatim>{b.property}</Verbatim>, num != null ? fmtNum(num) : 'not stated', den != null ? fmtNum(den) : 'not stated', rate, b.label ? <Verbatim>{b.label}</Verbatim> : 'not stated', b.domain, <Src srcs={b.srcs} />],
            out: [b.property, num, den, rate, b.label, b.domain],
            urls: urlsOf(b.srcs),
          };
        })}
        empty={<p>No base rate recorded in this file.</p>} />

      <Caption id="C8">{`Association, not effect. n = ${rows.length}; no test is run. Timing bars are counts of ${t.b} schemes; the uniform line is b/5. Elections entered this file largely because a recorded scheme preceded them, so the no-scheme row is thin by construction. The uniform expectation assumes full five-year terms, and early elections break it. By-party counts measure first how many of a party's schemes the research recorded. The same table is computed for every party, in the same columns.`}</Caption>
      <ol className="list-decimal pl-6 space-y-1.5 text-[14px] text-text-secondary max-w-[72ch]">
        <li>Anti-incumbency.</li>
        <li>Challenger promises: the opposition often promised transfers too, and the contract does not record them.</li>
        <li>Alliances, national waves, delimitation (2008) and candidate choice.</li>
        <li>Selection: elections entered the file largely because a scheme preceded them.</li>
        <li>The budget cycle: February–March budgets land 12–15 months before many polls.</li>
        <li>Exposure is yes or no, not a dose.</li>
      </ol>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// §5.9 Ministers and parties
// ---------------------------------------------------------------------------

export function MinistersSection({ f, empty, ctx, search, onPerson, twinsOpen }: { f: WelfareFilters; empty: boolean; ctx: TableCtx; search: Search; onPerson: (l: string) => void; twinsOpen: boolean }) {
  if (empty) return <Section id="ministers" title="Ministers and parties">{NOTHING}</Section>;
  const c = completeness(f);
  const rows = ministersRows(f);
  const acts = ministerActions(f);
  const unresolved = rows.filter((r) => !r.person.resolved).length;
  return (
    <Section id="ministers" title="Ministers and parties">
      <p className="font-mono text-[12px] text-text-secondary">{`named announcer ${c.a} · dated approval ${c.b} · dated launch ${c.c} · all three ${c.d}, of ${c.n} schemes in view`}</p>
      <p className="font-mono text-[12px] text-text-muted mt-1">{`${new Set(rows.map((r) => r.person.id)).size} persons · ${unresolved} with identity not confirmed · all years · sorted by each person's earliest recorded action, never by a count`}</p>
      <TableBlock name="ministers" ctx={ctx} minWidth="64rem"
        cols={[{ key: 'person', label: 'Person', th: true }, { key: 'office', label: 'Office (with dates)' }, { key: 'party', label: 'Party (as recorded)' }, ...ACTIONS.map((a) => ({ key: a.replace(/ /g, '_'), label: a[0].toUpperCase() + a.slice(1) }))]}
        rows={rows.map((r) => ({
          cells: [
            <>{r.person.href ? <Link to={r.person.href} className="underline underline-offset-2 hover:text-accent">{r.person.label}</Link> : <button type="button" className="text-left underline underline-offset-2 hover:text-accent" onClick={() => onPerson(r.person.label)}>{r.person.label}</button>}{r.person.resolved ? '' : ' (identity not confirmed)'}</>,
            r.person.office ? <Verbatim>{r.person.office}</Verbatim> : 'not recorded',
            r.party,
            ...ACTIONS.map((a) => {
              const xs = r.acts.filter((x) => x.action === a);
              return xs.length ? (
                <>{xs.map((x, i) => (
                  <span key={i} className="block">
                    <SchemeLink id={x.scheme.id} name={x.scheme.name} search={search} />{` · ${x.date ?? 'date not located'}`}
                    {f.y != null && x.date?.startsWith(String(f.y)) ? <span className="ml-1 font-mono text-[12px] text-text-muted">{String(f.y)}</span> : null}
                  </span>
                ))}</>
              ) : 'none recorded';
            }),
          ],
          out: [r.person.label, r.person.office, r.party, ...ACTIONS.map((a) => r.acts.filter((x) => x.action === a).map((x) => `${x.scheme.name} ${x.date ?? ''}`).join('; '))],
          urls: r.acts.flatMap((x) => urlsOf(x.srcs)),
        }))}
        empty={<p>No named office-holder on any scheme in view.</p>} />
      <LazyTwin twin="ministers-actions" open={twinsOpen} summary={`Every action as a row · ${acts.length} rows`}>{() => (
        <TableBlock name="ministers-actions" ctx={ctx} minWidth="60rem"
          cols={[{ key: 'date', label: 'Date' }, { key: 'person_or_body', label: 'Person or body' }, { key: 'office_at_the_time', label: 'Office at the time' }, { key: 'party', label: 'Party' }, { key: 'scheme', label: 'Scheme' }, { key: 'state', label: 'State' }, { key: 'action', label: 'Action' }, { key: 'source', label: 'Source' }]}
          rows={acts.map((a) => ({
            cells: [a.date ?? 'date not located', <Verbatim>{a.who}</Verbatim>, a.office ? <Verbatim>{a.office}</Verbatim> : 'not recorded', a.party ?? 'not recorded', <SchemeLink id={a.scheme.id} name={a.scheme.name} search={search} />, a.scheme.level === 'central' ? 'Central' : stateName(a.scheme.st), a.action, <Src srcs={a.srcs} />],
            out: [a.date, a.who, a.office, a.party, a.scheme.name, stateName(a.scheme.st), a.action],
            urls: urlsOf(a.srcs),
          }))} />
      )}</LazyTwin>
      <Caption id="C9">A row records an action on the record, with the office and party recorded at that date. It is not a tally of credit and is not sorted by one. An announcement is a public statement and an approval is a cabinet or legislative act. Neither shows who designed the scheme or why.</Caption>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// §5.10 After the launch
// ---------------------------------------------------------------------------

export function AfterSection({ f, empty, ctx, search }: { f: WelfareFilters; empty: boolean; ctx: TableCtx; search: Search }) {
  if (empty) return <Section id="after" title="After the launch: changes, cuts, promises">{NOTHING}</Section>;
  const s = afterSummary(f);
  const rows = statusRows(f);
  const prom = promisedRows(f);
  const scr = scrutinyRows(f);
  return (
    <Section id="after" title="After the launch: changes, cuts, promises">
      <p className="font-mono text-[12px] text-text-secondary">{`${s.dated} dated changes across ${s.schemes} of ${s.n} schemes · ${s.undated} undated · ${s.promised} promised, not enacted · ${s.cuts} cut, tightened, paused or discontinued`}</p>
      <TableBlock name="status" ctx={ctx} minWidth="56rem"
        cols={[{ key: 'date', label: 'Date' }, { key: 'scheme', label: 'Scheme' }, { key: 'state', label: 'State' }, { key: 'party', label: 'Party' }, { key: 'status', label: 'Status' }, { key: 'note', label: 'Note' }, { key: 'source', label: 'Source' }]}
        rows={rows.map((r) => ({
          cells: [r.date ?? 'undated', <SchemeLink id={r.scheme.id} name={r.scheme.name} search={search} />, r.scheme.level === 'central' ? 'Central' : stateName(r.scheme.st), partyText(r.scheme), <span className="font-mono text-[12px]">{r.status}</span>, r.note ? <Verbatim>{r.note}</Verbatim> : 'no note', <Src srcs={r.srcs} />],
          out: [r.date, r.scheme.name, stateName(r.scheme.st), partyText(r.scheme), r.status, r.note],
          urls: urlsOf(r.srcs),
        }))}
        empty={<p>No status change recorded for the schemes in view.</p>} />
      <h3 className="heading-editorial text-lg text-text mt-6">Promised versus paid</h3>
      <TableBlock name="promised" ctx={ctx} minWidth="56rem"
        cols={[{ key: 'scheme', label: 'Scheme' }, { key: 'promise', label: 'Promise (note, verbatim)' }, { key: 'promised_on', label: 'Promised on' }, { key: 'by', label: 'By' }, { key: 'paid_per_head', label: `Paid per head as of ${ctx.asOfLabel}` }, { key: 'source', label: 'Source' }]}
        rows={prom.map((r) => ({
          cells: [<SchemeLink id={r.scheme.id} name={r.scheme.name} search={search} />, r.note ? <Verbatim>{r.note}</Verbatim> : 'no note', r.date ?? 'date not located', r.by ?? 'not recorded', <Verbatim>{r.paid}</Verbatim>, <Src srcs={r.srcs} />],
          out: [r.scheme.name, r.note, r.date, r.by, r.paid],
          urls: urlsOf(r.srcs),
        }))}
        empty={<p>No promise recorded as not enacted for the schemes in view.</p>} />
      <p className="text-[13px] text-text-muted">No gap is computed: the promised amount exists only as text in the file.</p>
      <h3 className="heading-editorial text-lg text-text mt-6">Scrutiny drives</h3>
      <TableBlock name="scrutiny" ctx={ctx} minWidth="56rem"
        cols={[{ key: 'scheme', label: 'Scheme' }, { key: 'date', label: 'Tightened on' }, { key: 'note', label: 'Note' }, { key: 'before', label: 'Nearest count before' }, { key: 'after', label: 'Nearest count after' }, { key: 'difference', label: 'Difference' }, { key: 'source', label: 'Source' }]}
        rows={scr.map((r) => ({
          cells: [<SchemeLink id={r.scheme.id} name={r.scheme.name} search={search} />, r.date ?? 'undated', r.note ? <Verbatim>{r.note}</Verbatim> : 'no note', r.before, r.after, r.diff, <Src srcs={r.srcs} />],
          out: [r.scheme.name, r.date, r.note, r.before, r.after, r.diff],
          urls: urlsOf(r.srcs),
        }))}
        empty={<p>No eligibility tightening recorded for the schemes in view.</p>} />
      <Caption id="C10">A cut can come from fiscal limits, a targeting correction, a court order or a political choice. The note records which, where a source says so. A scrutiny drive may remove ineligible or eligible names; the file records counts, not which. A renamed scheme may be continuity or rebranding, and the page does not decide which.</Caption>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// §5.11 Beyond the beneficiaries
// ---------------------------------------------------------------------------

/**
 * A benefits row is answered only through its own claim: a row that came from a claim in
 * the graph is answered by the contras that name that claim. A scheme-record row carries
 * no id, so no response is ever printed in its cell.
 */
function ResponseCell({ schemeId, claimId }: { schemeId: string; claimId: string | null }) {
  const rs = answersTo(claimId ?? undefined);
  if (!rs.length) return <span className="text-amber">{claimId ? MISSING_RESPONSE : itemResponseText(schemeId, 'card')}</span>;
  return <>{rs.map((r, i) => <span key={r.id ?? i} className="block mb-1">{`${entityLabel(r.s)}: `}<Verbatim>{r.lab ?? 'position recorded'}</Verbatim>{' '}<Src srcs={r.srcs} /></span>)}</>;
}

export function BenefitsSection({ f, empty, ctx, search }: { f: WelfareFilters; empty: boolean; ctx: TableCtx; search: Search }) {
  if (empty) return <Section id="benefits" title="Beyond the beneficiaries">{NOTHING}</Section>;
  const rows = benefitRows(f);
  const alleged = rows.filter((r) => r.tier === 'alleged');
  const answered = alleged.filter((r) => answersTo(r.claimId ?? undefined).length > 0);
  const unlinked = alleged.filter((r) => !r.claimId).length;
  return (
    <Section id="benefits" title="Beyond the beneficiaries">
      <p className="font-mono text-[12px] text-text-secondary">{`${rows.length} rows · ${rows.filter((r) => r.amountCr != null).length} with an amount · ${alleged.length} alleged, ${answered.length} of them answered by a response that names the row's claim · ${unlinked} are scheme-record rows with no claim id, which no response can name`}</p>
      <TableBlock name="benefits" ctx={ctx} minWidth="70rem"
        cols={[{ key: 'scheme', label: 'Scheme' }, { key: 'who', label: 'Who' }, { key: 'how', label: 'How' }, { key: 'amount_cr', label: '₹ cr (as stated)' }, { key: 'tier', label: 'Tier' }, { key: 'response', label: 'Response' }, { key: 'from', label: 'From (scheme record / claim id)' }, { key: 'source', label: 'Source' }]}
        rows={rows.map((r) => ({
          cells: [
            <SchemeLink id={r.scheme.id} name={r.scheme.name} search={search} />,
            <Verbatim>{whoLabel(r.who)}</Verbatim>,
            r.how ? <Verbatim>{r.how}</Verbatim> : 'not stated',
            r.amountCr != null ? `₹${fmtNum(r.amountCr)} cr` : 'not stated',
            r.tier ? <TierWord tier={r.tier} /> : 'tier not recorded',
            r.tier === 'alleged' ? <ResponseCell schemeId={r.scheme.id} claimId={r.claimId} /> : 'not an allegation',
            r.from,
            <Src srcs={r.srcs} />,
          ],
          out: [r.scheme.name, whoLabel(r.who), r.how, r.amountCr, r.tier, r.tier === 'alleged' ? (answersTo(r.claimId ?? undefined).map((x) => `${entityLabel(x.s)}: ${x.lab ?? 'position recorded'}`).join('; ') || (r.claimId ? MISSING_RESPONSE : itemResponseText(r.scheme.id, 'card'))) : 'not an allegation', r.from],
          urls: urlsOf(r.srcs),
        }))}
        empty={<p>None recorded under the current filters, which is not the same as none.</p>} />
      <Caption id="C12">A row names a channel through which money or advantage moved, as a source records it. A bank earning correspondent commissions is how direct benefit transfer works. It is an allegation only where the tier says alleged. Amounts are not totalled, because channels differ in kind. A missing row means none was recorded, not that none existed.</Caption>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// §5.12 Findings
// ---------------------------------------------------------------------------

export function FindingsSection({ f, empty, search }: { f: WelfareFilters; empty: boolean; search: Search }) {
  if (empty) return <Section id="findings" title="What was found, and what was answered">{NOTHING}</Section>;
  const pool = inView(f);
  const rows = findingsRows(f, pool);
  const bySch = new Map<string, typeof rows>();
  for (const r of rows) {
    if (!bySch.has(r.scheme.id)) bySch.set(r.scheme.id, []);
    bySch.get(r.scheme.id)!.push(r);
  }
  const tally = (t: string) => rows.filter((r) => r.tier === t).length;
  // Answered is claim-level only (a contra names the claim); findings carry no id, so none is counted as answered.
  const ledger = allegationLedger(f, { respectTier: true, pool });
  const c = contested(f);
  const none = pool.filter((s) => !s.results.length);
  let roseShown = false;
  return (
    <Section id="findings" title="What was found, and what was answered">
      <p className="font-mono text-[12px] text-text-secondary">{`${rows.length} findings across ${bySch.size} of ${pool.length} schemes · D ${tally('documented')} · R ${tally('reported')} · A ${tally('alleged')} · An ${tally('analytic')} · ${ledger.answered.length} of ${ledger.claims.length} allegations answered · ${rows.length} with no date located · allegations are counted over alleged claims in the graph, which a response can name; ${ledger.findings.length} alleged findings carry no id and are not linked to any response in the file`}</p>
      <div className="mt-4 space-y-6">
        {[...bySch.entries()].map(([id, list]) => (
          <div key={id}>
            <h3 className="text-[16px] text-text font-medium"><SchemeLink id={id} name={list[0].scheme.name} search={search} /></h3>
            <ul className="mt-2 space-y-2 text-[14px] text-text-secondary">
              {[...list].sort((a, b) => byText(a.finding, b.finding)).map((r) => {
                const body = <>{'date not located · body not stated · '}<TierWord tier={r.tier} />{' '}<Verbatim>{r.finding}</Verbatim>{' '}<Src srcs={r.srcs} /></>;
                if (r.tier !== 'alleged') return <li key={r.idx}>{body}</li>;
                const key = !roseShown;
                roseShown = true;
                return (
                  <li key={r.idx}>
                    {key && <p className="text-[14px] text-text-secondary">{ROSE_KEY}</p>}
                    <AllegationPair schemeId={id} allegation={body} />
                  </li>
                );
              })}
            </ul>
            {f.tier.has('alleged') && list.some((r) => r.tier === 'alleged') && <SchemeResponses schemeId={id} />}
          </div>
        ))}

        {!rows.length && <p className="text-[14px] text-text-secondary">No finding in view under the current tiers and filters.</p>}
      </div>

      <h3 className="heading-editorial text-lg text-text mt-8">Contested claims</h3>
      <div className="space-y-4 mt-3">
        {c.pairs.map((p) => (
          <ContestedFact key={`${p.claim.id}-${p.contra.id}`}
            question={p.claim.lab ?? p.claim.d ?? 'claim recorded without a summary'}
            positions={[
              { who: entityLabel(p.claim.s), claim: p.claim.d ?? p.claim.lab ?? 'claim recorded without a summary', srcs: p.claim.srcs },
              { who: entityLabel(p.contra.s), claim: p.contra.d ?? p.contra.lab ?? 'response recorded without a summary', srcs: p.contra.srcs },
            ]}
            unresolved={[p.claim.upgradeIf ? `Upgrades if: ${p.claim.upgradeIf}` : null, p.claim.killIf ? `Collapses if: ${p.claim.killIf}` : null].filter(Boolean).join(' ') || undefined} />
        ))}
        {!c.pairs.length && <p className="text-[14px] text-text-secondary">{f.tier.has('alleged') ? 'No alleged claim with a recorded response in this file.' : 'Alleged claims are hidden by the tier filter.'}</p>}
      </div>
      <p className="text-[14px] text-text-secondary mt-4">{`No response located in this file (${c.unanswered.length}) · whether one was sought is not recorded`}</p>
      <ul className="text-[14px] text-text-secondary space-y-1 mt-1">
        {c.unanswered.map((e: GEdge) => <li key={e.id}>{`${entityLabel(e.s)} → ${entityLabel(e.t)}: `}<Verbatim>{e.lab ?? e.d ?? 'no summary'}</Verbatim>{' '}<Src srcs={e.srcs} /></li>)}
      </ul>
      <p className="text-[14px] text-text-secondary mt-4">{none.length ? `No evaluation, audit, court finding or survey located: ${none.map((s) => s.name).join('; ')}` : 'Every scheme in view has at least one recorded finding.'}</p>
      <Caption id="C13">A finding covers the period and sample it studied. A survey showing recipients voted for the incumbent does not show they switched because of the scheme.</Caption>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// §5.14 The claims as a graph
// ---------------------------------------------------------------------------

/**
 * The graph explorer is not mounted here. It keeps its own state in the URL under q,
 * tier, fam, pred, ty, amt, from, to and sel, and on this page q and tier are the page's
 * own filters: typing in the graph's search would re-filter the map, the strip and every
 * table, and its reset would wipe y, st, s, party, cat and view. Until GraphExplorer takes
 * a param namespace (a shared change for viz/GraphExplorer's owner), the claims table is
 * the section, complete on its own.
 */
export function GraphSection({ ctx, twinsOpen }: { ctx: TableCtx; narrow: boolean; twinsOpen: boolean }) {
  const claims = WELFARE_CLAIM_LIST;
  return (
    <Section id="graph" title="The claims as a graph">
      <Caption id="C15">Position carries no meaning. Line dash is evidence tier; hue is entity family. Persons appear only in public roles.</Caption>
      {!claims.length ? <p className="text-[14px] text-text-secondary">No claims recorded in this file.</p> : (
        <>
          <p className="text-[14px] text-text-secondary max-w-[72ch]">
            {`${claims.length} claims. The graph is withheld on this page because its controls share this page's URL keys (q, tier) and would silently re-filter everything above; the table below is complete without it.`}
          </p>
          <LazyTwin twin="claims" open={twinsOpen} summary={`The claims as a table · ${claims.length} rows`}>{() => (
            <TableBlock name="claims" ctx={ctx} minWidth="70rem"
              cols={[{ key: 'source_node', label: 'Source node' }, { key: 'predicate', label: 'Predicate' }, { key: 'target', label: 'Target node' }, { key: 'tier', label: 'Tier' }, { key: 'amount_cr', label: '₹ cr' }, { key: 'from_to', label: 'From–to' }, { key: 'response', label: 'Response' }, { key: 'sources', label: 'Sources' }]}
              rows={claims.map((e) => {
                const answers = claims.filter((x) => x.pred === 'contra' && (x.t === `claim:${e.id}` || x.t === e.id));
                return {
                  cells: [
                    <Verbatim>{entityLabel(e.s)}</Verbatim>, e.pred, <Verbatim>{entityLabel(e.t.replace(/^claim:/, 'claim '))}</Verbatim>, <TierWord tier={e.tier} />,
                    e.a != null && e.a !== 0 ? fmtNum(e.a) : 'not stated',
                    `${e.from ?? 'undated'} to ${e.to ?? 'open'}`,
                    e.tier === 'alleged' ? (answers.length ? <>{answers.map((a, i) => <span key={i} className="block">{isAuditNote(a) ? `audit note (${entityLabel(a.s)}, no respondent named): ` : `${entityLabel(a.s)}: `}<Verbatim>{a.lab ?? 'position recorded'}</Verbatim></span>)}</> : <span className="text-amber">{MISSING_RESPONSE}</span>) : 'not an allegation',

                    <Src srcs={e.srcs} />,
                  ],
                  out: [entityLabel(e.s), e.pred, entityLabel(e.t), e.tier, e.a ?? null, `${e.from ?? ''} ${e.to ?? ''}`, answers.map((a) => a.lab).join('; ')],
                  urls: urlsOf(e.srcs),
                };
              })} />
          )}</LazyTwin>
        </>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------
// §5.15 What the record does not contain
// ---------------------------------------------------------------------------

export function Voids() {
  if (!WELFARE_VOID_LIST.length) return <p className="text-[14px] text-text-secondary">No voids recorded in this file.</p>;
  return (
    <ul className="space-y-3">
      {WELFARE_VOID_LIST.map((v, i) => (
        <li key={i} className="text-[14px] leading-snug">
          <span className="text-text"><Verbatim>{v.what}</Verbatim></span>
          {v.whyItMatters && <span className="block text-text-secondary mt-0.5"><Verbatim>{v.whyItMatters}</Verbatim></span>}
          <span className="block mt-0.5"><Src srcs={v.srcs} /></span>
        </li>
      ))}
    </ul>
  );
}

export function MissingSection({ empty, gaps }: { empty: boolean; gaps: Gap[] }) {
  const killed = killedClaims();
  return (
    <Section id="missing" title="What the record does not contain">
      {empty && NOTHING}
      <h3 className="heading-editorial text-lg text-text mt-2 mb-3">Voids</h3>
      <Voids />
      <h3 className="heading-editorial text-lg text-text mt-8 mb-3">Gaps</h3>
      <GapsPanel gaps={gaps} note="Absence is a result here. Each line bounds what the page above can say." />
      <h3 className="heading-editorial text-lg text-text mt-8 mb-3">Killed in audit</h3>
      {killed.length ? (
        <ul className="space-y-2">
          {killed.map((k) => (
            <li key={k.id} className="border-l-2 border-rose/40 pl-3 text-[14px]">
              <span className="font-mono text-[12px] text-text-muted">{k.id}</span>{' '}
              <Verbatim>{k.lab ?? `${entityLabel(k.s)} → ${entityLabel(k.t)}`}</Verbatim>
              <span className="block text-text-secondary">{'killed by: '}<Verbatim>{k.killedReason}</Verbatim></span>
            </li>
          ))}
        </ul>
      ) : <p className="text-[14px] text-text-secondary">{`No claim was killed in audit, or the audit has not run (${auditRan() ? 'ran' : 'not run'}).`}</p>}
    </Section>
  );
}

