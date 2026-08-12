import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Kicker, PageTitle, Standfirst, Byline, Section, Callout, StatGrid, DataTable,
  Prose, Cite, Footnote, TierChip,
} from '../components/Editorial';
import { GapsPanel, SourceLedger, type Gap } from '../components/Domain';
import {
  MEDIA, OUTLETS, MEDIA_AS_OF, ratingCoverage, byOwnerGroup,
  ownershipLeanCounterexamples, mediumTally, languageTally,
} from '../data/media';

/**
 * Media ownership.
 *
 * The brief was a Ground News-style left / centre / right coverage bar per company.
 * The research came back saying that cannot be built honestly for Indian outlets,
 * and this page ships the reason at the top rather than the bar.
 *
 * What it ships instead is OWNERSHIP distribution, which is documented, checkable
 * against filings, and the thing that actually varies. Any lean rating appears only
 * attributed to its rater, with its date and its methodology link — never as an
 * unattributed badge.
 */
export default function MediaView() {
  const coverage = useMemo(() => ratingCoverage(), []);
  const owners = useMemo(() => byOwnerGroup(), []);
  const counterexamples = useMemo(() => ownershipLeanCounterexamples(), []);
  const media = useMemo(() => mediumTally(), []);
  const languages = useMemo(() => languageTally(), []);

  const multiOutletOwners = owners.filter((o) => o.outlets.length > 1);
  const crossMedium = owners.filter((o) => o.media.length > 1);
  const listedOwners = owners.filter((o) => o.listed);

  const gaps: Gap[] = useMemo(
    () => MEDIA.gaps.map((g) => ({ what: g, why: 'Recorded during retrieval.' })),
    [],
  );

  return (
    <div className="max-w-[1180px]">
      <Kicker>Media · ownership register</Kicker>
      <PageTitle>Who owns the outlet, because who leans which way cannot be answered</PageTitle>
      <Standfirst>
        The plan for this page was a left / centre / right coverage bar per company, the way
        Ground News shows an American story. That was researched properly, and it does not
        survive contact with the Indian media landscape. What replaces it is the question that
        can be answered from documents: who owns what, across how many media, in how many
        languages.
      </Standfirst>
      <Byline>
        {OUTLETS.length} outlets · {owners.length} owner groups · as of {MEDIA_AS_OF}
      </Byline>

      <Section
        title="Why there is no left/right bar on this page"
        note="The verdict from the availability research, stated before anything else"
      >
        <Callout label={`Lean-rating availability: ${MEDIA.leanRatingAvailability.verdict}`} tone="warn">
          <strong className="text-text">AllSides</strong> — the more methodologically transparent
          rater, with blind bias surveys and multi-partisan editorial panels — has negligible
          Indian coverage and states its ratings reflect the American political spectrum.{' '}
          <strong className="text-text">Zero</strong> outlets here carry an AllSides rating.
          <br />
          <br />
          <strong className="text-text">Media Bias/Fact Check</strong> does rate{' '}
          {coverage.rated} of {coverage.total} outlets here, which is why the verdict is
          "partial" rather than "none". But its own methodology page states the framework
          "remains primarily tailored to the political landscape of the United States", 70% of
          the score comes from axes drawn from US politics, one editor holds final authority,
          and it is not peer reviewed.
          <br />
          <br />
          <strong className="text-text">
            {coverage.multiRated} of {coverage.total} outlets have a second, independent rating.
          </strong>{' '}
          Nothing here can be cross-checked. A single unreplicated rater, on a scale calibrated
          for a different country's politics, rendered as a confident coloured bar, would be the
          most misleading element on this platform.
        </Callout>

        <Prose>
          <p className="mt-5">{MEDIA.leanRatingAvailability.summary}</p>
        </Prose>
        <Cite srcs={MEDIA.leanRatingAvailability.srcs} />
      </Section>

      {counterexamples.length > 0 && (
        <Section
          title="The rating data argues against its own use"
          note="Owners whose outlets do not fall on the same side of centre"
        >
          <Prose>
            <p>
              If ownership determined lean, outlets under one owner would rate together. Here is
              every case in this register where they do not — generated from the ratings
              themselves, not asserted.
            </p>
          </Prose>
          <div className="mt-4 space-y-4">
            {counterexamples.map((c) => (
              <div key={c.ownerGroup} className="border-l-2 border-rose/40 pl-3">
                <p className="font-medium text-[15px]">{c.ownerGroup}</p>
                <ul className="mt-1.5 space-y-1">
                  {c.outlets.map((o) => (
                    <li key={o.name} className="text-[13.5px] text-text-secondary">
                      <span className="text-text">{o.name}</span> —{' '}
                      <a
                        href={o.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-2 decoration-border-light hover:decoration-accent"
                      >
                        {o.rating}
                      </a>
                      <span className="font-mono text-[10.5px] text-text-muted ml-2">
                        {o.system}, {o.asOf}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="text-[13.5px] text-text-muted mt-4 max-w-[72ch] leading-relaxed">
            Adjacent gradations are not counted as disagreement — Right and Right-Center sit on
            the same side of centre, and treating them as a split would manufacture
            counter-examples out of rounding.
          </p>
        </Section>
      )}

      <Section title="What this register does establish" note="Counts, each with its denominator">
        <StatGrid
          items={[
            { value: String(OUTLETS.length), label: 'outlets catalogued' },
            { value: String(owners.length), label: 'distinct owner groups' },
            {
              value: String(multiOutletOwners.length),
              label: `owners holding more than one outlet, of ${owners.length}`,
              tone: 'accent',
            },
            {
              value: String(crossMedium.length),
              label: 'owners spanning more than one medium',
              tone: 'accent',
            },
            { value: String(listedOwners.length), label: 'owner groups with a listed entity' },
            {
              value: `${coverage.rated}/${coverage.total}`,
              label: 'carry any lean rating, from one rater',
              tone: 'muted',
            },
          ]}
        />

        {/* The register's own skew, stated rather than left for the reader to infer
            from a list. It bears directly on the rating verdict: coverage runs
            inverse to reach, so the languages with the largest audiences are the
            ones this register — and every rater — knows least about. */}
        <div className="grid sm:grid-cols-2 gap-6 mt-6">
          {[
            { title: 'by medium', rows: media.map((m) => ({ k: m.medium, n: m.count })) },
            { title: 'by language', rows: languages.map((l) => ({ k: l.language, n: l.count })) },
          ].map((block) => (
            <div key={block.title}>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-text-muted mb-2">
                {block.title}
              </p>
              <div className="space-y-1">
                {block.rows.map((r) => (
                  <div key={r.k} className="flex items-center gap-2 text-[12.5px]">
                    <span className="w-24 shrink-0 truncate text-text-secondary">{r.k}</span>
                    <span
                      className="h-2.5 bg-accent/50 rounded-sm"
                      style={{ width: `${(r.n / OUTLETS.length) * 160}px`, minWidth: '2px' }}
                    />
                    <span className="font-mono text-[10.5px] text-text-muted tabular-nums">{r.n}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[13px] text-text-muted mt-3 max-w-[72ch] leading-relaxed">
          This skew is itself a limitation on everything above. India's largest newspaper
          audiences are Hindi and regional-language, and they are the least represented here —
          which is the same direction the rating coverage runs.
        </p>
      </Section>

      <Section
        title="Ownership distribution"
        note="Grouped by owner rather than listed by title — concentration is the thing that varies"
      >
        <div className="space-y-3">
          {owners.map((g) => (
            <div key={g.ownerGroup ?? 'independent'} className="border border-border rounded-lg p-3.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium text-[15px]">
                  {g.ownerGroup ?? 'No common owner — independent'}
                  {g.listed && (
                    <span className="font-mono text-[9.5px] text-accent ml-2 tracking-wider">LISTED</span>
                  )}
                </p>
                <span className="font-mono text-[10.5px] text-text-muted">
                  {g.outlets.length} outlet{g.outlets.length === 1 ? '' : 's'} ·{' '}
                  {g.media.join(', ')} · {g.languages.join(', ')}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {g.outlets.map((o) => (
                  <span
                    key={o.id}
                    className="font-mono text-[10.5px] px-1.5 py-0.5 rounded border border-border-light text-text-secondary"
                    title={o.ownerEntity}
                  >
                    {o.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Cross-media holdings"
        note="One owner, several media — the concentration measure that does not need a rater"
      >
        <div className="space-y-4">
          {MEDIA.crossMediaHoldings.map((h) => (
            <div key={h.owner} className="border-l-2 border-accent/40 pl-3">
              <p className="font-medium text-[15px]">{h.owner}</p>
              <p className="font-mono text-[10.5px] text-text-muted mt-0.5">
                {h.media.join(' · ')}
              </p>
              <p className="text-[13.5px] text-text-secondary mt-1 max-w-[72ch] leading-relaxed">
                {h.note}
              </p>
              <Cite srcs={h.srcs} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Concentration, with denominators" note="Each figure states what it is a share OF">
        <div className="space-y-4">
          {MEDIA.concentration.map((c, i) => (
            <div key={i} className="border-l-2 border-border-light pl-3">
              <p className="font-medium text-[14.5px]">
                {c.measure}
                {c.value != null && (
                  <span className="font-mono text-accent ml-2">{c.value}%</span>
                )}
              </p>
              <p className="text-[13px] text-text-secondary mt-1 max-w-[72ch] leading-relaxed">
                <strong className="text-text">Of:</strong> {c.denominator}
              </p>
              <p className="text-[13px] text-text-muted mt-1 max-w-[72ch] leading-relaxed">{c.note}</p>
              <Cite srcs={c.srcs} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Every outlet" note="Ownership chain first; any rating shown only with its rater and date">
        <DataTable
          columns={['Outlet', 'Medium / language', 'Owner', 'Rating, attributed', 'Tier']}
          rows={OUTLETS.map((o) => [
            <span key="n">
              <strong className="text-text">{o.name}</strong>
              {o.launched && (
                <span className="block font-mono text-[10px] text-text-muted mt-0.5">
                  launched {o.launched}
                </span>
              )}
            </span>,
            <span key="m" className="text-[12.5px]">
              {o.medium} · {o.language}
            </span>,
            <span key="o" className="text-[12.5px]">
              {o.ownerEntity}
              {o.ownerNse && (
                <span className="font-mono text-[10px] text-accent ml-1.5">{o.ownerNse}</span>
              )}
              {o.ownershipNotes && (
                <span className="block text-[11.5px] text-text-muted mt-0.5 max-w-[46ch]">
                  {o.ownershipNotes.slice(0, 200)}
                  {o.ownershipNotes.length > 200 ? '…' : ''}
                </span>
              )}
            </span>,
            o.leanRatings.length ? (
              <span key="r" className="text-[12px]">
                {o.leanRatings.map((r) => (
                  <a
                    key={r.url}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block underline underline-offset-2 decoration-border-light hover:decoration-accent"
                  >
                    {r.rating}
                    <span className="block font-mono text-[9.5px] text-text-muted">
                      {r.system}, {r.asOf}
                    </span>
                  </a>
                ))}
              </span>
            ) : (
              <span key="r" className="font-mono text-[10.5px] text-amber">
                not rated
              </span>
            ),
            <TierChip key="t" tier={o.tier} />,
          ])}
        />
      </Section>

      {MEDIA.rejected?.length > 0 && (
        <Section title="Sources checked and rejected" note="A rejection is a result, and names what failed">
          <div className="space-y-3">
            {MEDIA.rejected.map((r, i) => (
              <div key={i} className="border-l-2 border-rose/40 pl-3">
                <p className="font-medium text-[14px]">
                  {(r as { candidate?: string; claim?: string }).candidate ?? r.claim}
                </p>
                <p className="text-[13px] text-text-muted mt-1 max-w-[72ch] leading-relaxed">
                  {(r as { reason?: string; finding?: string }).reason ?? r.finding}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Gaps" note="Named, at the same size as everything above">
        <GapsPanel gaps={gaps} />
      </Section>

      <Section title="Sources" note="Every one opened, with what it establishes">
        <SourceLedger
          entries={MEDIA.sources.map(([label, url]) => ({
            label,
            url,
            establishes: 'See the per-claim citations above; this is the retrieval list.',
            primary: /gov\.in|sebi|nseindia|bseindia|mom-gmr|trai/i.test(url),
            retrieved: MEDIA_AS_OF,
          }))}
        />
      </Section>

      <Footnote>
        <p>
          <strong>What was refused, and why.</strong> A left / centre / right distribution bar per
          company was the original brief. Building it would have required treating one
          unreplicated rater's US-calibrated scale as ground truth for {coverage.total} Indian
          outlets, {coverage.total - coverage.rated} of which it does not rate at all. Lean
          coverage also runs inverse to reach here — the largest-audience Indian-language titles
          are the least rated — so the bar would have been most confident exactly where it was
          least informed.
        </p>
        <p>
          <strong>Ownership is not lean, either.</strong> Nothing on this page implies that who
          owns an outlet determines what it publishes. The counter-examples above exist precisely
          to prevent that reading, and they were generated from the rating data rather than
          asserted against it.
        </p>
        <p>
          <strong>Standing.</strong> Ownership is reported from filings and public records. No
          claim is made about the editorial conduct of any outlet, journalist or owner.{' '}
          <Link to="/patterns" className="underline underline-offset-2">
            Why the discipline exists
          </Link>
        </p>
      </Footnote>
    </div>
  );
}
