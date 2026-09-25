import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Kicker, PageTitle, Standfirst, Byline, Section, Callout, StatGrid, DataTable,
  Prose, Footnote,
} from '../components/Editorial';
import { DenominatorStrip, GapsPanel, ContestedFact, SourceLedger, type LedgerEntry } from '../components/Domain';
import {
  PMCARES, PM_AS_OF, PM_FINANCIALS, PM_CONTROL, PM_CONTESTED,
  coverage, statementCompleteness, auditLag, identicalCount, gapList, sourceById,
  receiptsCr, printedTotalCr,
} from '../data/pmcares';

const cr = (v: number | undefined | null) =>
  v == null ? '—' : `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 2 })} cr`;

/**
 * PM CARES — a fund.
 *
 * The centre is a flow ledger with financial years as columns and the unpublished
 * years drawn as holes rather than omitted. But the page does not open with it,
 * because the investigation's own headline is that a CONTROL governs everything
 * said here: the 1948 PMNRF, administered from the same office, is identical on the
 * two properties most often presented as PM CARES-specific.
 *
 * An unusual property that a comparable institution also has is a fact about the
 * category, not about the institution. So the control leads.
 */
export default function PmCares() {
  const cov = useMemo(() => coverage(), []);
  const completeness = useMemo(() => statementCompleteness(), []);
  const lag = useMemo(() => auditLag(), []);
  const identical = useMemo(() => identicalCount(), []);
  const gaps = useMemo(() => gapList(), []);
  const srcMap = useMemo(() => sourceById(), []);
  const agg = PMCARES.aggregates as Record<string, number | string | undefined>;

  const ledger: LedgerEntry[] = useMemo(
    () =>
      PMCARES.sources
        .filter((s) => s.url)
        .map((s) => ({
          label: `${s.publisher ?? ''}${s.publisher && s.title ? ' — ' : ''}${s.title ?? s.id}`,
          url: s.url!,
          establishes: s.readAs ? `Read as: ${s.readAs}` : 'See per-claim citations above.',
          primary: /gov\.in|nic\.in|sci\.gov\.in|indiacode|sansad/i.test(s.url!),
          retrieved: s.retrieved ?? PM_AS_OF,
        })),
    [],
  );

  const cite = (ids?: string[]) =>
    (ids ?? [])
      .map((id) => srcMap.get(id))
      .filter(Boolean)
      .map((s) => [s!.title ?? s!.id, s!.url ?? ''] as [string, string]);

  const maxLag = Math.max(1, ...lag.map((l) => l.days));

  return (
    <div className="max-w-[1180px]">
      <Kicker>PM CARES · a fund</Kicker>
      <PageTitle>What the record establishes, and what a control does to it</PageTitle>
      <Standfirst>
        Two claims are made about this fund more often than any others: that it was created to
        escape the Right to Information Act, and that its accounts have gone dark. Both were
        tested against the only proper comparator — the 1948 Prime Minister's National Relief
        Fund, run from the same office — and neither survived. What does survive is narrower,
        better sourced, and largely unreported.
      </Standfirst>
      <Byline>
        {cov.published} of {cov.elapsed} elapsed financial years published · as of {PM_AS_OF}
      </Byline>

      <div className="mt-6">
        <DenominatorStrip
          asOf={PM_AS_OF}
          facts={[
            { n: cov.published, of: cov.elapsed, label: 'financial years published' },
            { n: completeness.withAuditorsReport, of: cov.published, label: 'with an auditor’s report' },
            { n: Number(agg.namedDisbursementHeadsAcrossFourYears ?? 0), label: 'named payment heads' },
            { n: Number(agg.recipientNamesPublished ?? 0), label: 'recipients named' },
          ]}
        />
      </div>

      <Section title="The control governs this page" note="Run first, because it decides what the rest of the evidence can mean">
        <Callout label={`Comparator: ${PM_CONTROL.comparator}`} tone="bottomline">
          {PMCARES.headline}
        </Callout>

        <Prose>
          <p className="mt-5">{PM_CONTROL.whyThisComparator}</p>
        </Prose>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-[13.5px] border-collapse min-w-[620px]">
            <thead>
              <tr className="border-b border-border-light text-left">
                <th className="py-2 pr-4 font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted font-normal">
                  property
                </th>
                <th className="py-2 pr-4 font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted font-normal w-24">
                  PM CARES
                </th>
                <th className="py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted font-normal w-24">
                  PMNRF
                </th>
              </tr>
            </thead>
            <tbody>
              {PM_CONTROL.resultsIdentical.map((r, i) => (
                <tr key={i} className="border-b border-border align-top">
                  <td className="py-2.5 pr-4">
                    <span className="text-text">{r.property}</span>
                    {r.note && (
                      <span className="block text-[12.5px] text-text-muted mt-0.5 max-w-[62ch] leading-snug">
                        {r.note}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-[11px]">
                    <span className={r.pmcares ? 'text-amber' : 'text-text-muted'}>
                      {r.pmcares ? 'yes' : 'no'}
                    </span>
                  </td>
                  <td className="py-2.5 font-mono text-[11px]">
                    <span className={r.pmnrf ? 'text-amber' : 'text-text-muted'}>
                      {r.pmnrf ? 'yes' : 'no'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[13px] text-text-muted mt-3 max-w-[74ch] leading-relaxed">
          Identical on {identical} of {PM_CONTROL.resultsIdentical.length} properties tested. A
          property shared with the comparator cannot be evidence about PM CARES specifically — it
          is evidence about how relief funds administered from the Prime Minister's Office are
          run, which is a different and much older question.
        </p>
      </Section>

      <Section title="What the control killed" note="A killed claim is a result, and it names the check that killed it">
        <div className="space-y-4">
          {PMCARES.rejected.map((r) => (
            <div key={r.id} className="border-l-2 border-rose/40 pl-3">
              <p className="font-medium text-[14.5px]">
                <span className="font-mono text-[10.5px] text-rose mr-2">{r.id}</span>“{r.claim}”
              </p>
              <p className="font-mono text-[10.5px] text-text-muted mt-1">killed by: {r.killedBy}</p>
              <p className="text-[13.5px] text-text-muted mt-1 max-w-[76ch] leading-relaxed">
                {r.reason}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="The four departures that survive the control"
        note="Narrower than the claims that died, and better sourced"
      >
        <div className="space-y-5">
          {PM_CONTROL.departuresThatSurvive.map((d) => (
            <article key={d.id} className="border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border bg-bg-elevated">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-accent">
                  {d.id}
                </p>
                <p className="text-[15px] text-text mt-1 max-w-[76ch]">{d.departure}</p>
              </div>
              {(d.pmnrf || d.pmcares) && (
                <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
                  <div className="p-4">
                    <p className="font-mono text-[10.5px] text-text-muted tracking-wide mb-1.5">PMNRF</p>
                    <p className="text-[13.5px] leading-relaxed text-text-secondary">{d.pmnrf}</p>
                  </div>
                  <div className="p-4">
                    <p className="font-mono text-[10.5px] text-accent tracking-wide mb-1.5">PM CARES</p>
                    <p className="text-[13.5px] leading-relaxed text-text-secondary">{d.pmcares}</p>
                  </div>
                </div>
              )}
              <div className="p-4 border-t border-border space-y-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mb-1">
                    why it matters
                  </p>
                  <p className="text-[13.5px] text-text-secondary leading-relaxed max-w-[76ch]">
                    {d.significance}
                  </p>
                </div>
                {d.innocentReading && (
                  <div className="border-l-2 border-sage/40 pl-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-sage mb-1">
                      the innocent reading
                    </p>
                    <p className="text-[13.5px] text-text-secondary leading-relaxed max-w-[76ch]">
                      {d.innocentReading}
                    </p>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section
        title="The ledger, with the holes drawn"
        note="Unpublished years are rendered, not omitted — the gap in the series is the most informative thing in it"
      >
        <div className="space-y-2">
          {PM_FINANCIALS.map((f) => {
            const total = receiptsCr(f) ?? 0;
            const printed = printedTotalCr(f);
            const max = Math.max(...PM_FINANCIALS.map((x) => receiptsCr(x) ?? 0), 1);
            return (
              <div
                key={f.fy}
                className={`flex items-center gap-3 text-[13px] py-1.5 px-2 rounded ${
                  f.published ? '' : 'bg-amber/[0.05] border border-amber/25'
                }`}
              >
                <span className="w-20 shrink-0 font-mono text-[11.5px] text-text-secondary">
                  {f.fy}
                </span>
                {f.published ? (
                  <>
                    <span className="flex-1 max-w-[300px] h-4 bg-bg-elevated rounded-sm overflow-hidden">
                      <span
                        className="block h-full bg-accent/70"
                        style={{ width: `${(total / max) * 100}%`, minWidth: '2px' }}
                      />
                    </span>
                    <span className="font-mono text-[11.5px] tabular-nums text-text">
                      {cr(total)} in
                    </span>
                    <span className="font-mono text-[11.5px] tabular-nums text-text-muted">
                      {cr(f.payments?.totalCr)} out
                    </span>
                    {printed != null && (
                      <span
                        className="font-mono text-[10px] text-text-muted"
                        title="The statement's printed Total line includes the opening balance carried forward. It is not the year's receipts."
                      >
                        (printed total {cr(printed)})
                      </span>
                    )}
                    {f.auditLagDays != null && (
                      <span className="font-mono text-[10.5px] text-text-muted ml-auto">
                        audit lag {f.auditLagDays}d
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    {/* A hole, drawn at the same size as a bar. A missing year that renders
                        as blank space reads as a year with no money, which is a false
                        statement — this reads as a year with no statement. */}
                    <span className="flex-1 max-w-[300px] h-4 rounded-sm border border-dashed border-amber/50" />
                    <span className="font-mono text-[11.5px] text-amber">not published</span>
                    {f.daysOverdue != null && (
                      <span className="font-mono text-[10.5px] text-text-muted ml-auto">
                        {f.daysOverdue} days past the comparable prior-year publication
                      </span>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        <StatGrid
          items={[
            { value: cr(Number(agg.totalContributionsCr)), label: 'contributions, FY20 to FY23' },
            { value: cr(Number(agg.totalPaymentsCr)), label: 'payments over the same period' },
            {
              value: cr(Number(agg.closingBalanceAt31Mar2023Cr)),
              label: 'closing balance at 31 Mar 2023 — the last published figure',
              tone: 'accent',
            },
            {
              value: `${completeness.withNotes}/${completeness.years}`,
              label: 'published years including the notes their own statements reference',
              tone: 'rose',
            },
          ]}
        />

        <Callout label="Published is not the same as readable" tone="warn">
          Every one of the {completeness.years} published years is a single-page Receipts and
          Payments Account. Each references accompanying notes — and{' '}
          <strong className="text-text">
            none of the {completeness.years} publishes them
          </strong>
          . No auditor's report and no balance sheet has been published for any year. Across all
          four statements there are {String(agg.namedDisbursementHeadsAcrossFourYears)} named
          payment heads, {String(agg.recipientNamesPublished)} named recipients and{' '}
          {String(agg.transactionDatesPublished)} transaction dates. The same is true of the
          control, which is why this is a fact about the format rather than about the fund.
        </Callout>

        {lag.length > 1 && (
          <div className="mt-6">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-text-muted mb-2">
              audit lag by year — days from year end to the auditor's signature
            </p>
            <div className="space-y-1.5">
              {lag.map((l) => (
                <div key={l.fy} className="flex items-center gap-3 text-[12.5px]">
                  <span className="w-20 shrink-0 font-mono text-[11px] text-text-muted">{l.fy}</span>
                  <span
                    className={`h-3 rounded-sm ${l.days > 300 ? 'bg-amber/70' : 'bg-accent/60'}`}
                    style={{ width: `${(l.days / maxLag) * 260}px`, minWidth: '2px' }}
                  />
                  <span className="font-mono text-[11px] tabular-nums text-text-muted">
                    {l.days} days
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      <Section
        title="Announced against audited"
        note="Where a press figure and a statement figure differ, both are carried"
      >
        <div className="space-y-4">
          {PMCARES.disbursements.map((d) => (
            <div key={d.id} className="border border-border rounded-lg p-4">
              <p className="font-medium text-[15px] capitalize">{d.id.replace(/-/g, ' ')}</p>
              <div className="grid sm:grid-cols-2 gap-4 mt-2.5">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mb-1">
                    announced
                  </p>
                  <p className="text-[13.5px] text-text-secondary leading-relaxed">
                    {d.announced?.amountCr != null && (
                      <span className="text-text">
                        {d.announced.amountQualifier ? `${d.announced.amountQualifier} ` : ''}
                        {cr(d.announced.amountCr)}
                      </span>
                    )}
                    {d.announced?.date && (
                      <span className="font-mono text-[10.5px] text-text-muted ml-2">
                        {d.announced.date}
                      </span>
                    )}
                    {d.announced?.quantity && (
                      <span className="block text-[12.5px] text-text-muted mt-0.5">
                        {d.announced.quantity}
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-accent mb-1">
                    audited
                  </p>
                  <p className="font-mono text-[12px] text-text-secondary leading-relaxed">
                    {d.audited
                      ? Object.entries(d.audited)
                          .filter(([, v]) => v != null)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(' · ')
                      : 'no corresponding head in any published statement'}
                  </p>
                </div>
              </div>
              {d.difference && (
                <p className="text-[13px] text-text-muted mt-2.5 max-w-[76ch] leading-relaxed border-l-2 border-border-light pl-3">
                  {d.difference}
                </p>
              )}
              {d.unresolved && (
                <p className="text-[13px] text-amber mt-2 max-w-[76ch] leading-relaxed">
                  Unresolved: {d.unresolved}
                </p>
              )}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Contested" note="Both positions, each sourced, neither adjudicated here">
        <div className="space-y-5">
          {PM_CONTESTED.map((c) => (
            <div key={c.id}>
              <ContestedFact
                question={c.question}
                unresolved={c.status}
                positions={[
                  { who: c.positionA.holder, claim: c.positionA.statement, srcs: cite(c.positionA.srcs) },
                  { who: c.positionB.holder, claim: c.positionB.statement, srcs: cite(c.positionB.srcs) },
                ]}
              />
              {c.innocentReading && (
                <p className="text-[13px] text-text-muted mt-2 max-w-[76ch] leading-relaxed border-l-2 border-sage/40 pl-3">
                  <span className="text-sage">Innocent reading.</span> {c.innocentReading}
                </p>
              )}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Timeline" note="Chronology first, because most bad work is true facts attached to the wrong year">
        <DataTable
          columns={['Date', 'Event']}
          rows={PMCARES.timeline.map((t) => [
            <span key="d" className="font-mono text-[11px] text-text-muted whitespace-nowrap">
              {t.date}
            </span>,
            <span key="e" className="text-[13.5px]">
              {t.event}
              {t.note && (
                <span className="block text-[12px] text-text-muted mt-0.5 max-w-[70ch]">{t.note}</span>
              )}
            </span>,
          ])}
        />
      </Section>

      <Section title="Gaps" note="At the same size as the findings, because they bound them">
        <GapsPanel gaps={gaps} />
        {PMCARES.unreachable?.length > 0 && (
          <div className="mt-4">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-text-muted mb-2">
              documents that could not be reached, and why
            </p>
            <ul className="space-y-1.5">
              {PMCARES.unreachable.map((u, i) => (
                <li key={i} className="text-[13px] text-text-muted leading-snug max-w-[80ch]">
                  {typeof u === 'string' ? u : `${u.what} — ${u.why}`}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      <Section title="Sources" note="Every one opened, with how it was read">
        <SourceLedger entries={ledger} />
      </Section>

      <Footnote>
        <p>
          <strong>Every figure here was read off a page image.</strong> The published statements
          are scans without a text layer. FY2022-23 casts exactly in both directions; FY2020-21
          receipts and FY2021-22 payments each land ₹1 away from their printed totals, which is
          almost certainly one misread digit in a scan. The printed totals are carried as
          authoritative and the discrepancy is recorded rather than quietly patched.
        </p>
        <p>
          <strong>Standing.</strong> Nothing on this page asserts misappropriation, intent or
          wrongdoing. It reports what the published record establishes, what it does not, and
          what a control does to the claims most commonly made. Where a question is live before a
          court, both positions are carried and neither is adjudicated here.{' '}
          <Link to="/desk" className="underline underline-offset-2">
            How the desk works
          </Link>{' '}
          ·{' '}
          <Link to="/base-rates" className="underline underline-offset-2">
            Base rates
          </Link>
        </p>
      </Footnote>
    </div>
  );
}
