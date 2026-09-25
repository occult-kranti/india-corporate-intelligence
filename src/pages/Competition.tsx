import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Kicker, PageTitle, Standfirst, Byline, Section, Callout, StatGrid, DataTable,
  Prose, Footnote,
} from '../components/Editorial';
import { GapsPanel, SourceLedger, type Gap, type LedgerEntry } from '../components/Domain';
import { Distribution, Scatter } from '../components/viz/Charts';
import {
  PROCUREMENT, JURISDICTIONS, PROC_AS_OF, SCATTER, LIKE_FOR_LIKE, pooled, valueGradient, comparisons,
} from '../data/procurement';

/**
 * The base rate for competition in Indian public procurement.
 *
 * Every competition question on this platform reduces to "how many bidders showed
 * up", and until now none of them could be answered — the coal register publishes
 * bid counts for 0 of 133 blocks. This page is the first real denominator, and its
 * most important property is that the two states in it disagree by a factor of five,
 * which is the strongest possible argument against quoting either as an Indian rate.
 */
export default function Competition() {
  const p = useMemo(() => pooled(), []);
  const comps = useMemo(() => comparisons(), []);

  const gaps: Gap[] = useMemo(
    () =>
      PROCUREMENT.gaps.map((g) => ({
        what: g.length > 200 ? `${g.slice(0, 200)}…` : g,
        why: g.length > 200 ? g.slice(200) : 'Recorded at build time.',
      })),
    [],
  );

  const ledger: LedgerEntry[] = useMemo(
    () =>
      PROCUREMENT.sources.map((s) => ({
        label: `${s.publisher} — ${s.title}`,
        url: s.url,
        establishes: `${s.readAs}. ${s.bytes.toLocaleString('en-IN')} bytes, sha256 ${s.sha256_16}.`,
        doesNot:
          'Establishes nothing about any individual tender until that tender is opened on the issuing portal. This is a transformation of a scrape, not the portal.',
        primary: false,
        retrieved: s.retrieved,
      })),
    [],
  );

  return (
    <div className="max-w-[1180px]">
      <Kicker>Competition · the missing denominator</Kicker>
      <PageTitle>How many bidders actually show up</PageTitle>
      <Standfirst>
        Every question this platform asks about whether a process was competitive reduces to one
        number, and no Indian government publishes it in bulk. Two states do, and their rates
        differ — but not by the factor of five this page first reported. What the gap actually is,
        once the two are made comparable, is the most useful thing here.
      </Standfirst>
      <Byline>
        {p.tenders.toLocaleString('en-IN')} tenders with bid counts across {p.states} states ·
        tier reported, not yet verified · as of {PROC_AS_OF}
      </Byline>

      <Section title="Correction, 12 August 2026" note="Three claims on this page did not survive the desk">
        <Callout label="The 4.8× ratio was not a like-for-like comparison" tone="warn">
          This page reported Assam as roughly five times less competitive than Himachal Pradesh.
          The desk killed it on the control: <strong className="text-text">the two files do not
          observe the same object.</strong> Himachal Pradesh is tender data joined to award data —
          every record carries an award and a supplier. Assam is tender-stage, with only about 30%
          of records reaching acceptance of contract, and the registry reports zero awards and zero
          suppliers for it. Inside Assam alone the single-bidder rate runs from 4.58% to 42.79%
          depending on which stage you measure.
          <br />
          <br />
          Narrowed to comparable ground the ratio falls from{' '}
          <strong className="text-text">{LIKE_FOR_LIKE.headlineRatio}×</strong> to{' '}
          <strong className="text-text">{LIKE_FOR_LIKE.matchedRatio}×</strong>. Himachal's own rate
          moves 0.04 points across that whole ladder; Assam's moves 7.83. A gap survives and it is
          real — it is just half
          the size, and the version this page shipped was an artefact of comparing a completed
          auction to an open one.
        </Callout>

        <div className="mt-4 space-y-1.5">
          {LIKE_FOR_LIKE.ladder.map((l) => (
            <div key={l.basis} className="flex items-center gap-3 text-[13px]">
              <span className="w-56 shrink-0 text-text-secondary">{l.basis}</span>
              <span
                className="h-3 bg-accent/60 rounded-sm"
                style={{ width: `${(l.ratio / LIKE_FOR_LIKE.headlineRatio) * 200}px` }}
              />
              <span className="font-mono text-[11.5px] tabular-nums text-text">{l.ratio}×</span>
            </div>
          ))}
        </div>

        <div className="mt-5">
          <Callout label="Two more corrections" tone="note">
            <strong className="text-text">Assam does publish its own data.</strong> This page said
            neither state did. Assam's publisher is the state Finance Department, via AS-CFMS on
            data.gov.in under the GODL-India licence. Only Himachal Pradesh is a CivicDataLab
            transformation.
            <br />
            <br />
            <strong className="text-text">The 3,644 "zero-bid" Assam tenders are mostly not
            failed tenders.</strong> In 92.34% of cases they are simply <em>unopened</em> — a stage
            that had not completed when the file was exported, rather than a tender nobody bid for.
          </Callout>
        </div>
      </Section>

      <Section title="What was found" note="And the reason it took this long to find anything">
        <Callout label="The headline, computed rather than written" tone="bottomline">
          {PROCUREMENT.headline}
        </Callout>

        <Prose>
          <p className="mt-5">
            The Central Public Procurement Portal publishes no bulk award export — its results
            page returns zero rows behind a captcha and its dashboard feeds return empty bodies.
            GeM refuses the connection outright. Railways disabled anonymous search deliberately.
            State portals publish open tenders freely and put awards behind a captcha that also
            requires a tender ID you would only have if you already knew the answer.
          </p>
          <p>
            So the entire national record of <em>how many people bid for public work in India</em>{' '}
            comes down to two state datasets — one published by the Assam Finance Department, one
            transformed by {PROCUREMENT.provenance.transformedBy} — and both are frozen.
          </p>
        </Prose>
      </Section>

      <Section
        title="The shape of the distribution"
        note="Two means that sound alike, describing two different markets"
      >
        <Distribution
          xLabel="bidders per tender"
          highlight={1}
          series={JURISDICTIONS.map((j) => ({ name: j.jurisdiction, bins: j.histogram }))}
          caption={
            <>
              Shown as shares, because the two populations differ in size by a factor of nine and
              raw counts would make Himachal Pradesh invisible. The mean bid counts —{' '}
              {JURISDICTIONS.map((j) => `${j.meanBidsWhereContested} in ${j.jurisdiction}`).join(' and ')}{' '}
              — sound similar and describe different markets: one has its mode at 3 with almost
              nothing at 1, the other carries a visible spike at exactly one bidder. A summary
              statistic hides the only feature that matters here.
            </>
          }
        />
      </Section>

      <Section
        title="Does competition thin out as the money gets bigger?"
        note="Contract value against bidders received — the question the aggregate bands cannot answer"
      >
        <Scatter
          logX
          xLabel="contract value (₹, log scale)"
          yLabel="bidders"
          xFormat={(v) =>
            v >= 1e7 ? `${(v / 1e7).toFixed(0)} cr` : v >= 1e5 ? `${(v / 1e5).toFixed(0)} lakh` : String(Math.round(v))
          }
          yFormat={(v) => String(Math.round(v))}
          points={SCATTER.flatMap((s) =>
            s.points.map((p) => ({ x: p.valueInr, y: p.bids, group: s.jurisdiction })),
          )}
          caption={
            <>
              A seeded random sample of {SCATTER.map((s) => s.sampled).reduce((a, b) => a + b, 0)}{' '}
              tenders from {SCATTER.map((s) => s.population.toLocaleString('en-IN')).join(' and ')}{' '}
              eligible records — sampled rather than truncated, because taking the first N would be
              taking whatever the portal exported first. The x-axis is logarithmic: contract values
              span six orders of magnitude and a linear axis would stack almost every point against
              zero. What the cloud shows is that the single-bidder points do not concentrate at the
              high-value end in either state; they run the length of the range.
            </>
          }
        />
      </Section>

      <Section title="The two states" note="Measured identically, and disagreeing by a factor of nearly five">
        <div className="grid md:grid-cols-2 gap-5">
          {JURISDICTIONS.map((j) => {
            const grad = valueGradient(j);
            return (
              <article key={j.jurisdiction} className="border border-border rounded-lg p-4">
                <h3 className="font-medium text-[16px]">{j.jurisdiction}</h3>
                <p className="font-mono text-[10.5px] text-text-muted mt-0.5">
                  {j.withBidCount.toLocaleString('en-IN')} tenders carry a bid count (
                  {j.bidCountCoveragePct}% of the file)
                </p>

                <p className="font-mono text-[2rem] leading-none text-accent mt-4">
                  {j.singleBidderPctOfContested}%
                </p>
                <p className="text-[13px] text-text-muted mt-1.5 leading-snug">
                  single-bidder — {j.singleBidder.toLocaleString('en-IN')} of{' '}
                  {j.tendersThatDrewBids.toLocaleString('en-IN')} tenders that drew at least one bid
                </p>

                <dl className="mt-4 space-y-1.5 text-[12.5px]">
                  <div className="flex justify-between gap-3">
                    <dt className="text-text-muted">drew no bid at all</dt>
                    <dd className="font-mono tabular-nums">
                      {j.zeroBidTenders.toLocaleString('en-IN')}
                      {j.zeroBidPct ? (
                        <span className="text-text-muted"> ({j.zeroBidPct}%)</span>
                      ) : null}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-text-muted">mean bids where contested</dt>
                    <dd className="font-mono tabular-nums">{j.meanBidsWhereContested}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-text-muted">median</dt>
                    <dd className="font-mono tabular-nums">{j.medianBidsWhereContested}</dd>
                  </div>
                </dl>

                <div className="mt-4 pt-3 border-t border-border">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mb-2">
                    single-bidder rate by contract value
                  </p>
                  <div className="space-y-1">
                    {j.byValueBand.map((b) => (
                      <div key={b.band} className="flex items-center gap-2 text-[12px]">
                        <span className="w-32 shrink-0 text-text-secondary truncate">{b.band}</span>
                        <span className="flex-1 h-2.5 bg-bg-elevated rounded-sm overflow-hidden max-w-[90px]">
                          <span
                            className="block h-full bg-accent/70"
                            style={{ width: `${Math.min(100, (b.singleBidderPct ?? 0) * 3)}%` }}
                          />
                        </span>
                        <span className="font-mono text-[10.5px] tabular-nums text-text w-12 text-right">
                          {b.singleBidderPct}%
                        </span>
                        <span className="font-mono text-[9.5px] tabular-nums text-text-muted w-14 text-right">
                          n={b.tenders}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p
                    className={`text-[12.5px] mt-2 leading-snug ${
                      grad.direction === 'rises' ? 'text-amber' : 'text-sage'
                    }`}
                  >
                    {grad.direction === 'rises' &&
                      `Rate RISES with value — ${grad.deltaPoints} points from ${grad.low?.band} to ${grad.high?.band}.`}
                    {grad.direction === 'falls' &&
                      `Rate FALLS with value — ${grad.deltaPoints} points from ${grad.low?.band} to ${grad.high?.band}.`}
                    {grad.direction === 'flat' &&
                      `Rate is flat across value bands (${grad.deltaPoints} points end to end).`}
                    {grad.direction === 'insufficient' && 'Too few tenders per band to say.'}
                  </p>
                </div>
              </article>
            );
          })}
        </div>

        <Callout label="Why the value gradient is the test worth running" tone="note">
          High-value work has fewer qualified bidders for entirely ordinary reasons — bonding
          capacity, plant, prior-experience thresholds — so a <em>rising</em> rate is suggestive at
          best and never conclusive. A <em>flat or falling</em> rate is the cleaner result, because
          it rules out the version of the story where the largest contracts are the arranged ones.
          In Himachal Pradesh the highest value band contains{' '}
          <strong className="text-text">zero</strong> single-bidder tenders. In Assam the rate rises
          modestly and is roughly flat across the top three bands, which are also where most of the
          money is.
        </Callout>
      </Section>

      <Section
        title="What the base rate does to everything else on this platform"
        note="A single observation only means something against a population"
      >
        <DataTable
          columns={['Register', 'Single-bid rate', 'Denominator', 'Reading']}
          rows={comps.map((c) => [
            <span key="r" className="text-[13.5px] text-text">
              {c.register}
            </span>,
            <span
              key="p"
              className={`font-mono text-[13px] tabular-nums ${c.singleBidPct == null ? 'text-amber' : 'text-accent'}`}
            >
              {c.singleBidPct == null ? 'cannot be computed' : `${c.singleBidPct}%`}
            </span>,
            <span key="d" className="font-mono text-[11px] text-text-muted">
              {c.denominator}
            </span>,
            <span key="n" className="text-[12.5px] text-text-muted max-w-[42ch] inline-block leading-snug">
              {c.note}
            </span>,
          ])}
        />
        <Prose>
          <p className="mt-4">
            This is what a base rate is <em>for</em>. An 85.7% single-bid share in one hydrocarbon
            round is a striking number in isolation and an almost meaningless one — until it can be
            set against state public works running between 3% and 16%. The comparison does not
            establish anything improper about the hydrocarbon round: exploration acreage and road
            contracts attract completely different fields, and that is precisely why the honest
            move is to publish the comparison and its caveat together rather than either alone.
          </p>
        </Prose>
      </Section>

      <Section title="Provenance, and why nothing here is documented" note="Read before quoting any figure above">
        <Callout label={`Tier: ${PROCUREMENT.provenance.tier}`} tone="warn">
          {PROCUREMENT.provenance.tierReason}
        </Callout>
        <div className="mt-4">
          <Callout label={`Verification: ${PROCUREMENT.verification.status}`} tone="warn">
            {PROCUREMENT.verification.why}
            <br />
            <br />
            <strong className="text-text">What that costs.</strong>{' '}
            {PROCUREMENT.verification.consequence}
          </Callout>
        </div>
        <p className="text-[13.5px] text-text-muted mt-4 max-w-[76ch] leading-relaxed">
          {PROCUREMENT.freshness.warning} {PROCUREMENT.whatIsMissing.liveData}
        </p>
      </Section>

      <Section title="What is still missing" note="Including the field that would change the most">
        <StatGrid
          items={[
            { value: String(p.states), label: 'states of 28 with published bid counts', tone: 'rose' },
            { value: '0', label: 'winner CINs in either dataset', tone: 'rose' },
            {
              value: p.zeroBid.toLocaleString('en-IN'),
              label: 'tenders that drew no bid at all',
              tone: 'amber',
            },
            { value: '0', label: 'central government tenders included', tone: 'rose' },
            {
              value: '65',
              label: 'coal mine bid counts recoverable from PIB releases — not zero, as first reported',
              tone: 'accent',
            },
          ]}
        />
        <Prose>
          <p>{PROCUREMENT.whatIsMissing.winnerIdentifier}</p>
          <p>{PROCUREMENT.whatIsMissing.nationalCoverage}</p>
        </Prose>
      </Section>

      <Section title="Gaps" note="At the same size as the findings, because they bound them">
        <GapsPanel gaps={gaps} />
      </Section>

      <Section title="Sources" note="Two files, with their byte counts and digests">
        <SourceLedger entries={ledger} />
      </Section>

      <Footnote>
        <p>
          <strong>Two states is not India.</strong> The most likely misuse of this page is quoting
          one of these rates as a national figure. They differ from each other by a factor of
          nearly five over identical measurement, which is the strongest available argument that
          neither generalises. No national single-bidder rate is computed here, because none can be.
        </p>
        <p>
          <strong>Standing.</strong> Nothing here asserts wrongdoing by any procuring body or any
          bidder. A single-bidder tender is a tender one party bid for, which happens constantly
          for reasons that have nothing to do with anyone's conduct.{' '}
          <Link to="/tenders" className="underline underline-offset-2">
            The awards register
          </Link>{' '}
          ·{' '}
          <Link to="/capture" className="underline underline-offset-2">
            Capture pathways
          </Link>{' '}
          ·{' '}
          <Link to="/base-rates" className="underline underline-offset-2">
            Other base rates
          </Link>
        </p>
      </Footnote>
    </div>
  );
}
