import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Kicker, PageTitle, Standfirst, Byline, Section, Callout, StatGrid, DataTable, TierChip } from '../components/Editorial';
import { useData } from '../context/DataContext';
import { STATE_NAMES } from '../data/geo';
import { hhi } from '../data/companies';
import { TIER_ORDER, type Tier } from '../graph/schema';
import { EDGES } from '../graph/data';
import { INDICES_AS_OF, indexCoverage } from '../data/indices';

/**
 * Index coverage, derived once from the accessor. "49 / 50" is printed as such: a list
 * short of its published size is a declared gap, and rounding it to "complete" here would
 * contradict the map caption it links to.
 */
const INDEX_COVERAGE = indexCoverage();

const fmtCr = (v: number) => (v >= 100000 ? `₹${(v / 100000).toFixed(1)}L cr` : `₹${Math.round(v).toLocaleString('en-IN')} cr`);

export default function Dashboard() {
  const { companies, ministers, groups, nodes, edges, asOf, sectors, stateRollup } = useData();

  const totalMcap = useMemo(() => companies.reduce((a, c) => a + (c.marketCapCr ?? 0), 0), [companies]);
  const unpriced = useMemo(() => companies.filter((c) => c.marketCapCr == null).length, [companies]);
  const states = useMemo(
    () => [...stateRollup.values()].sort((a, b) => b.totalMcapCr - a.totalMcapCr),
    [stateRollup],
  );
  const stateHHI = useMemo(() => hhi(states.map((s) => s.totalMcapCr)), [states]);
  const top3Share = useMemo(
    () => (totalMcap ? (states.slice(0, 3).reduce((a, s) => a + s.totalMcapCr, 0) / totalMcap) * 100 : 0),
    [states, totalMcap],
  );

  const tierCounts = useMemo(() => {
    const c: Record<Tier, number> = { documented: 0, reported: 0, alleged: 0, analytic: 0 };
    for (const e of edges) c[e.tier]++;
    return c;
  }, [edges]);

  const psuCount = companies.filter((c) => c.ownership.startsWith('psu')).length;

  return (
    <article className="pb-20">
      <header className="pt-2 pb-6 border-b-2 border-border-light">
        <Kicker>India Corporate Intelligence Platform</Kicker>
        <PageTitle>Who owns what, who decides what, and how much any of it proves</PageTitle>
        <Standfirst>
          A map of India's listed corporate landscape joined to a provenance-bearing graph of political
          and ownership connections — built so that every claim carries its evidence tier, and every
          pattern carries its denominator. The platform is as interested in what it cannot show as in
          what it can.
        </Standfirst>
        <Byline>
          {companies.length} listed companies · {ministers.length} union ministers · {groups.length}{' '}
          conglomerate groups · {edges.length} relationships · as of {asOf}
        </Byline>
      </header>

      <StatGrid
        items={[
          { value: fmtCr(totalMcap), label: `recorded listed market cap${unpriced ? ` · ${unpriced} companies unpriced, so this is a floor` : ''}` },
          { value: `${top3Share.toFixed(0)}%`, label: `carried by ${states.slice(0, 3).map((s) => STATE_NAMES[s.stateCode]).join(', ')}`, tone: 'rose' },
          { value: String(stateRollup.size), label: 'of 36 states and UTs with a listed headquarters in the dataset' },
          { value: String(psuCount), label: 'public-sector undertakings', tone: 'muted' },
          // Appended to the existing grid rather than a second grid; at four columns
          // they fall on their own row, which is the "Index coverage" group.
          ...INDEX_COVERAGE.map((x) => {
            const missing = x.expected - x.confirmed;
            return {
              value: `${x.confirmed} / ${x.expected}`,
              label:
                `Index coverage · ${x.label} constituents confirmed / expected, as of ${INDICES_AS_OF}` +
                (missing > 0 ? ` · ${missing === 1 ? 'one' : missing} could not be verified` : '') +
                (x.unresolved > 0 ? ` · ${x.unresolved} without a company record` : ''),
            };
          }),
        ]}
      />
      {/* StatGrid tiles take no link, so the route to each filtered map sits directly under them. */}
      <p className="font-mono text-[11px] text-text-muted -mt-3 mb-2">
        Index members on the map:{' '}
        {INDEX_COVERAGE.map((x, i) => (
          <span key={x.key}>
            {i > 0 && ' · '}
            <Link to={`/map?idx=${x.key}`} className="underline underline-offset-2 hover:text-accent">
              {x.label} →
            </Link>
          </span>
        ))}
      </p>

      <Callout label="Start here" tone="bottomline">
        <p>
          If you are here to look for connections, read{' '}
          <Link to="/patterns" className="underline underline-offset-2 text-accent">
            Pattern discipline
          </Link>{' '}
          first. Large networks of powerful entities generate striking patterns <em>by construction</em> —
          tightly interconnected subgroups are mathematically compulsory above a certain size, and in a
          graph of <em>n</em> entities there are <em>n(n−1)/2</em> pairs to find coincidences among.
        </p>
        <p>
          The three most obvious edges in Indian corporate-political data prove almost nothing on their
          own: 82.45% of electoral-trust money went to one party, essentially every responding PSU gave to
          PM CARES, and CSR spending is compulsory by statute.{' '}
          <Link to="/base-rates" className="underline underline-offset-2 text-accent">
            The denominators
          </Link>{' '}
          are published so you can check that yourself.
        </p>
      </Callout>

      <Section title="The geographic concentration" note={`Herfindahl–Hirschman index ${Math.round(stateHHI)} across ${states.length} states — listed capital is not evenly spread`}>
        <div className="space-y-2">
          {states.slice(0, 12).map((s) => (
            <div key={s.stateCode} className="flex items-center gap-3">
              <Link to={`/states/${s.stateCode}`} className="text-[13.5px] w-32 truncate text-text-secondary hover:text-accent">
                {STATE_NAMES[s.stateCode]}
              </Link>
              <span
                className="h-4 bg-teal/60 rounded-sm"
                style={{ width: `${Math.max(1.5, (s.totalMcapCr / (states[0].totalMcapCr || 1)) * 58)}%` }}
              />
              <span className="font-mono text-[11px] text-text-muted whitespace-nowrap">
                {fmtCr(s.totalMcapCr)} · {s.count} co
              </span>
            </div>
          ))}
        </div>
        <p className="text-[13px] text-text-muted mt-4 max-w-[70ch]">
          This distribution is why the map defaults to quantile bins rather than a linear ramp — and it is
          also why "the minister and the company are from the same state" is a weak signal in the largest
          states and a stronger one in the smallest.{' '}
          <Link to="/map" className="underline underline-offset-2">
            Open the map →
          </Link>
        </p>
      </Section>

      <Section title="Sectors by listed market cap" note="Across the whole dataset">
        <DataTable
          columns={['Sector', 'Companies', 'States present', 'Market cap']}
          rows={sectors.slice(0, 14).map((s) => [
            <strong key="s" className="text-text">
              {s.sector}
            </strong>,
            String(s.count),
            String(s.states),
            <span key="m" className="font-mono text-[12px] whitespace-nowrap">
              {fmtCr(s.mcapCr)}
            </span>,
          ])}
        />
      </Section>

      <Section title="What the graph is made of" note="Evidence census across every relationship in the platform">
        <div className="grid gap-3 sm:grid-cols-4">
          {TIER_ORDER.map((t) => (
            <div key={t} className="border border-border rounded-lg p-3">
              <TierChip tier={t} />
              <p className="font-mono text-2xl mt-2">{tierCounts[t]}</p>
              <p className="text-[11.5px] text-text-muted">
                {((tierCounts[t] / edges.length) * 100).toFixed(1)}% of relationships
              </p>
            </div>
          ))}
        </div>
        <p className="text-[13.5px] text-text-muted mt-4 max-w-[70ch] leading-relaxed">
          {nodes.length} entities, {edges.length} relationships. The overwhelming majority are ownership
          and roster facts with a source attached. Only {EDGES.filter((e) => e.tier === 'alleged').length}{' '}
          relationships across the whole platform are allegations, all of them in the{' '}
          <Link to="/atlas" className="underline underline-offset-2">
            case study
          </Link>
          , all attributed, and all paired with the response of the party they concern.
        </p>
      </Section>

      <Section title="Where to go" note="">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ['/map', 'NSE / BSE map', 'Every state and UT drawn from real boundary geometry, shaded by what is listed there.'],
            ['/cabinet', 'Union cabinet', '69 ministers, portfolios with dates, and the map of regulatory reach.'],
            ['/conglomerates', 'Conglomerates', 'Ten groups, 64 listed entities — with the two Ambani groups kept structurally apart.'],
            ['/network', 'Connection graph', 'Everything merged, filterable by evidence tier, with a path finder that reports its baseline.'],
            ['/atlas', 'Money-trail atlas', 'The depth case study, including the documented void — the integrity check on the whole exercise.'],
            ['/method', 'How this is built', 'The four invariants, the agent roster, and a live integrity check.'],
          ].map(([to, title, blurb]) => (
            <Link key={to} to={to} className="card-surface p-4 block">
              <h3 className="heading-editorial font-bold text-lg">{title}</h3>
              <p className="text-[13px] text-text-muted mt-1.5 leading-snug">{blurb}</p>
            </Link>
          ))}
        </div>
      </Section>

      <Callout label="What this platform will not do" tone="warn">
        <p>
          Assert that any named person committed an offence. Publish a private individual's details. Link
          entities on name similarity. Render a pattern as a finding without its denominator, its innocent
          reading, and its kill condition. Draw an edge between a minister and a company on the basis of
          shared state or shared sector.
        </p>
      </Callout>
    </article>
  );
}
