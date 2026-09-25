import { Kicker, PageTitle, Standfirst, Byline, Section, Callout, Prose } from '../components/Editorial';

/**
 * Distribution funds — cash-transfer schemes 2000–2026.
 *
 * Scaffold. The page is specified in docs/design/WELFARE_PAGE.md and is built from the
 * generated module src/data/welfare.generated.ts once the research fleet's files have
 * cleared the quarantine gate (npm run generate && npm run validate). Until then the
 * route exists so navigation, smoke and the build pipeline can already depend on it,
 * and says plainly that nothing has been loaded.
 */
export default function Welfare() {
  return (
    <article className="pb-20">
      <header className="pt-2 pb-6 border-b-2 border-border-light">
        <Kicker>Distribution funds</Kicker>
        <PageTitle>Cash-transfer schemes, 2000–2026</PageTitle>
        <Standfirst>
          Ladli Behna and its lineage: direct-benefit and distribution schemes by state and centre —
          who announced and approved each, which party, how much per head and in total, how many months
          before which election, what the result was, and what happened to the scheme afterwards.
        </Standfirst>
        <Byline>No records loaded · the research quarantine has not yet been promoted for this domain</Byline>
      </header>
      <Section title="What this page will hold">
        <Prose>
          A map of India with a year scrubber from 2000 to 2026 showing which states had a live cash scheme
          and at what outlay; a state panel with schemes, ministers, election outcome and status history;
          the election-timing check with its denominator; who benefited beyond the beneficiaries; and the
          narratives — "cash transfers buy elections" among them — calibrated against the evidence, with
          the same lens applied to every party.
        </Prose>
        <Callout label="Scaffold" tone="note">
          Nothing here is an allegation. Until the data lands, this page shows its scaffold rather than a
          placeholder graphic — an empty chart reads as a finding of nothing, which is not what absence of
          data means.
        </Callout>
      </Section>
    </article>
  );
}
