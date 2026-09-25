import { Kicker, PageTitle, Standfirst, Byline, Section, Callout, Prose } from '../components/Editorial';

/**
 * Energy and natural resources — the power map.
 *
 * Scaffold. The page is specified in docs/design/ENERGY_PAGE.md and is built from the
 * generated module src/graph/energy.generated.ts once the research fleet's files have
 * cleared the quarantine gate (npm run generate && npm run validate). Until then the
 * route exists so navigation, smoke and the build pipeline can already depend on it,
 * and says plainly that nothing has been loaded.
 */
export default function Energy() {
  return (
    <article className="pb-20">
      <header className="pt-2 pb-6 border-b-2 border-border-light">
        <Kicker>Energy and natural resources</Kicker>
        <PageTitle>The power map</PageTitle>
        <Standfirst>
          Ministers, ministries, public-sector companies, regulators, private groups and promoters in
          coal, mines, oil and gas, hydro, solar and wind, nuclear and the grid — connected by tiered,
          sourced relationships, with a ledger of who benefited and by what mechanism.
        </Standfirst>
        <Byline>No records loaded · the research quarantine has not yet been promoted for this domain</Byline>
      </header>
      <Section title="What this page will hold">
        <Prose>
          The connection graph as the centre, filtered to the energy and resources domains; a who-benefits
          ledger where every row carries an amount or an explicit unknown; the documented voids; the
          circulating narratives calibrated on a six-step ladder; and the base rates that decide whether
          any of it is unusual. Every figure will carry its date and its source.
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
