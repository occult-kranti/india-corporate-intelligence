import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Kicker, PageTitle, Standfirst, Byline, Section, Callout, StatGrid, Prose, Footnote,
} from '../components/Editorial';
import { capturePathways, verdictTally, captureScope, VERDICT_META, type Verdict } from '../data/capture';

/**
 * Capture pathways.
 *
 * The adversarial half of the method, and the one that needs its framing stated in
 * the first screen rather than in a footnote: this is fraud-risk assessment, the
 * technique every procurement auditor uses. Assume someone wants to capture the
 * process, enumerate how, work out what trace each method would leave, then look.
 *
 * The discipline that makes it rigorous rather than paranoid is that every pathway
 * arrives with its own falsifier attached, and most of them come back negative or
 * untestable. A page where every pathway showed "signature present" would be a page
 * that was not testing anything.
 */
export default function Capture() {
  const pathways = useMemo(() => capturePathways(), []);
  const tally = useMemo(() => verdictTally(), []);
  const scope = useMemo(() => captureScope(), []);
  const [filter, setFilter] = useState<Verdict | 'all'>('all');

  const shown = filter === 'all' ? pathways : pathways.filter((p) => p.verdict === filter);

  return (
    <div className="max-w-[1180px]">
      <Kicker>Method · adversarial generation</Kicker>
      <PageTitle>How you would capture these processes, and whether the record shows it</PageTitle>
      <Standfirst>
        Every procurement auditor works the same way: assume someone wants to rig the process,
        write down how they would do it, work out what trace each method would leave in the
        published record, then go and look for the trace. The discipline is that each pathway
        arrives with its own falsifier attached — and most of them come back negative.
      </Standfirst>
      <Byline>
        {scope.pathways} pathways · tested against {scope.registers.join(', ')} · every verdict
        derived from the registers, not asserted
      </Byline>

      <Section title="Read this first" note="What this page is, and the two things it is not">
        <Prose>
          <p>
            "Someone rigged this" is not a hypothesis — nothing could show it false, so nothing
            can support it either. <strong>"If someone rigged it this way, the bid count would be
            one, and here is the bid count"</strong> is a hypothesis, because it can come back
            negative. That difference is the entire content of this page.
          </p>
          <p>
            <strong>It names nobody.</strong> A signature being present means a mechanism is
            consistent with the record — never that it happened, and never that a particular
            person did it. Every pathway below carries an innocent explanation that fits the same
            evidence, at the same prominence, because in most cases that explanation is the more
            likely one.
          </p>
          <p>
            <strong>The most valuable verdict is "cannot be tested."</strong> A pathway nobody can
            check against published data is a hole in the disclosure regime. Naming those holes
            precisely — and naming the single field that would close each one — is worth more than
            any individual finding here.
          </p>
        </Prose>

        <div className="mt-5">
          <Callout label="Why the adversary's view finds things the defender's view misses" tone="bottomline">
            Auditing from the record outward asks "does anything look odd?", and the answer is
            always yes, because large registers are full of odd-looking things. Auditing from the
            mechanism inward asks "what would this specific method have to leave behind?", which
            fixes the test before the data is seen. That is the same discipline the{' '}
            <Link to="/prospector" className="underline underline-offset-2">
              prospector
            </Link>{' '}
            applies statistically — declare the shapes before you look — applied here in prose.
          </Callout>
        </div>
      </Section>

      <Section title="The distribution of verdicts" note="A page where everything came back positive would be a page testing nothing">
        <StatGrid
          items={tally.map((t) => ({
            value: String(t.n),
            label: VERDICT_META[t.verdict].label.toLowerCase(),
            tone: VERDICT_META[t.verdict].tone,
          }))}
        />
        <div className="flex flex-wrap gap-2 mt-5">
          <button
            onClick={() => setFilter('all')}
            className={`font-mono text-[11px] px-2.5 py-1 rounded border transition-colors ${
              filter === 'all' ? 'border-accent text-accent' : 'border-border text-text-muted hover:border-border-light'
            }`}
          >
            all {pathways.length}
          </button>
          {tally.map((t) => (
            <button
              key={t.verdict}
              onClick={() => setFilter(t.verdict)}
              disabled={t.n === 0}
              className={`font-mono text-[11px] px-2.5 py-1 rounded border transition-colors ${
                filter === t.verdict
                  ? 'border-accent text-accent'
                  : t.n === 0
                    ? 'border-border text-text-muted/40 cursor-not-allowed'
                    : 'border-border text-text-muted hover:border-border-light'
              }`}
            >
              {VERDICT_META[t.verdict].label.toLowerCase()} {t.n}
            </button>
          ))}
        </div>
      </Section>

      <Section title="The pathways" note="Mechanism → the trace it would leave → what the record actually shows">
        <div className="space-y-6">
          {shown.map((p) => {
            const meta = VERDICT_META[p.verdict];
            const toneClass =
              meta.tone === 'rose' ? 'border-rose/40'
              : meta.tone === 'sage' ? 'border-sage/40'
              : meta.tone === 'amber' ? 'border-amber/40'
              : 'border-border-light';
            const textClass =
              meta.tone === 'rose' ? 'text-rose'
              : meta.tone === 'sage' ? 'text-sage'
              : meta.tone === 'amber' ? 'text-amber'
              : 'text-text-muted';
            return (
              <article key={p.id} className={`border ${toneClass} rounded-lg overflow-hidden`}>
                <div className="px-4 py-3 border-b border-border bg-bg-elevated">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-medium text-[16px]">{p.name}</h3>
                    <span className={`font-mono text-[10.5px] uppercase tracking-[0.14em] ${textClass}`}>
                      {meta.label}
                    </span>
                  </div>
                  <p className="font-mono text-[10px] text-text-muted mt-1">
                    {p.registers.join(' · ')}
                  </p>
                </div>

                <div className="p-4 space-y-3.5">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mb-1">
                      the mechanism
                    </p>
                    <p className="text-[14px] text-text-secondary leading-relaxed max-w-[76ch]">
                      {p.mechanism}
                    </p>
                  </div>

                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mb-1">
                      what it would leave behind
                    </p>
                    <p className="text-[14px] text-text leading-relaxed max-w-[76ch]">{p.signature}</p>
                  </div>

                  <div className={`border-l-2 ${toneClass} pl-3`}>
                    <p className={`font-mono text-[10px] uppercase tracking-[0.14em] ${textClass} mb-1`}>
                      what the record shows
                    </p>
                    <p className="text-[14px] text-text-secondary leading-relaxed max-w-[76ch]">
                      {p.evidence}
                    </p>
                  </div>

                  {/* Equal prominence is the whole point — a claim and its innocent reading
                      rendered at different weights is an editorial verdict delivered via CSS. */}
                  <div className="border-l-2 border-sage/40 pl-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-sage mb-1">
                      the innocent reading, which fits the same evidence
                    </p>
                    <p className="text-[14px] text-text-secondary leading-relaxed max-w-[76ch]">
                      {p.innocentReading}
                    </p>
                  </div>

                  <div className="border-l-2 border-accent/40 pl-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-accent mb-1">
                      what would settle it
                    </p>
                    <p className="text-[14px] text-text-secondary leading-relaxed max-w-[76ch]">
                      {p.whatWouldSettleIt}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </Section>

      <Section title="What the distribution says" note="Read across the pathways rather than down any one of them">
        <Prose>
          <p>
            Two of these pathways cannot be tested at all, and both fail for the same reason: the
            registers publish outcomes and withhold process. A bid count and a winner's CIN are
            each one column. Their absence makes the two most consequential questions in the whole
            exercise — <em>was there competition</em> and <em>are these winners actually distinct</em>{' '}
            — unanswerable, and no amount of analysis on this side can substitute for them.
          </p>
          <p>
            The pathways where a signature IS present are, without exception, also the ones with a
            strong innocent reading. A missing press release is consistent with concealment and
            with administrative drift. A declared winner who never vests is consistent with a
            favour and with a forfeiture that worked exactly as designed. Nothing here
            distinguishes between those, and this page does not pretend otherwise.
          </p>
          <p>
            The negative results matter as much. The one re-auction traceable end to end ran the
            wrong way for the annul-and-re-offer pathway — the state received nearly double on the
            second attempt. Winning offers are not clustered at the reserve floor. Where bid
            position is disclosed in the awards register, no award was sole-bidder. Those are
            findings, and a page that reported only the positive column would be lying by
            selection.
          </p>
        </Prose>
      </Section>

      <Footnote>
        <p>
          <strong>Scope and standing.</strong> Every figure on this page is computed from the
          registers at build time, so a verdict cannot drift from the data behind it — if a
          ministry starts publishing bid counts, the verdicts change with the next build. Nothing
          here asserts that any mechanism was used, and no individual or company is named as an
          actor in any pathway. Signature-present means consistent-with, and consistent-with is
          not evidence of.
        </p>
        <p>
          <strong>Why this is published rather than kept internal.</strong> Every mechanism
          described here is documented in the standard procurement-integrity literature and in
          published audit methodology; none of it is novel, and describing it publicly tells a
          would-be captor nothing they do not already know. What it does do is tell a reader
          exactly which disclosure would make each one detectable — which is the only part of this
          that changes anything.{' '}
          <Link to="/patterns" className="underline underline-offset-2">
            Why the discipline exists
          </Link>{' '}
          ·{' '}
          <Link to="/desk" className="underline underline-offset-2">
            The investigative desk
          </Link>{' '}
          ·{' '}
          <Link to="/resources" className="underline underline-offset-2">
            The registers being tested
          </Link>
        </p>
      </Footnote>
    </div>
  );
}
