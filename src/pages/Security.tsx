import { Kicker, PageTitle, Standfirst, Byline, Section, Callout, Prose } from '../components/Editorial';
import { FORCE_META } from '../graph/force.generated';

/**
 * The money India spends on force — scaffold.
 *
 * The page is specified in docs/design/SECURITY_PAGE.md and is built from the generated
 * module src/graph/force.generated.ts (budgets, strength and footprint series beside the
 * claims). Until the judged spec is built, the route exists so navigation, smoke and the
 * build pipeline can depend on it, and it says what has been loaded rather than drawing
 * a placeholder graphic: an empty chart reads as a finding of nothing, which is not what
 * absence of a page means.
 */
export default function Security() {
  const s = FORCE_META.series ?? {};
  const loaded = `${(s.budgets ?? 0).toLocaleString('en-IN')} budget rows, ${(s.strength ?? 0).toLocaleString('en-IN')} strength rows, ${(s.footprint ?? 0).toLocaleString('en-IN')} footprint rows`;
  return (
    <article className="pb-20">
      <header className="pt-2 pb-6 border-b-2 border-border-light">
        <Kicker>Security spend</Kicker>
        <PageTitle>The money India spends on force</PageTitle>
        <Standfirst>
          Defence, the central armed police, state and city police, intelligence and investigation,
          prisons and allied bodies: what each payer budgets, who is paid, who is awarded, where it
          sits by state and city, and who sits on both sides of the money. Every figure beside its
          denominator and its comparison set.
        </Standfirst>
        <Byline>
          {FORCE_META.empty
            ? 'No records loaded · the research quarantine has not yet been promoted for this domain'
            : `Research loaded (${loaded}; run ${FORCE_META.runId}) · the page is being built to its judged spec`}
        </Byline>
      </header>
      <Section title="What this page will hold">
        <Prose>
          Three lenses on one route. Budgets: the Union defence and police demands by year with
          pensions and pay called out, state police spending per capita with the no-data hatch, and
          Delhi Police as the one city budget that is published. Footprint: cantonments, laboratories,
          factories, headquarters, training centres and commissionerates placed in their states and
          cities from official lists. Procurement and people: approvals by category and vendor class,
          the open-market slice of the tender record beside the whole file, vendors with identical
          fields and never one alone, bonds, board roles under the cooling-off rule, and the cases as
          dated records with their counters.
        </Prose>
        <Callout label="Scaffold" tone="note">
          Spending on force is a policy choice, not a scandal. A city police budget other than Delhi
          is not published and will be shown as such, never as a number.
        </Callout>
      </Section>
    </article>
  );
}
