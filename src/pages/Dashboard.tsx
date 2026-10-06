import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowRight, Map, Network, BookOpen, Droplets } from 'lucide-react';
import { Kicker, PageTitle, Section, Callout, StatGrid, DataTable, TierChip } from '../components/Editorial';
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
      <header className="home-intro">
        <div>
          <Kicker>India / Public-record intelligence</Kicker>
          <PageTitle>Follow the money.<br />Understand the evidence.</PageTitle>
          <p className="home-deck">
            Explore India's companies, public funding and political connections.
            Every relationship carries an evidence tier. Every pattern needs a denominator.
          </p>
        </div>
        <div className="home-edition"><span>THE PUBLIC RECORD</span>Listed-company data<br />as of {asOf}<br />Other registers dated separately</div>
      </header>

      <section className="home-feature" aria-labelledby="education-feature-title">
        <div>
          <p className="eyebrow">New research desk / Education</p>
          <h2 id="education-feature-title">Schools, colleges &amp; the money behind them.</h2>
          <p>
            Follow education funding across states and cities. Compare government programmes,
            private funding and NGO records, then examine school closures against the evidence
            needed to explain them.
          </p>
          <Link to="/education" className="feature-link">Explore education funding <ArrowRight size={17} aria-hidden="true" /></Link>
        </div>
        <dl className="feature-index">
          <div><dt>01 / Institutions</dt><dd>Government &amp; private · Schools &amp; colleges</dd></div>
          <div><dt>02 / Funding channels</dt><dd>Public budgets · CSR · NGOs · Foreign finance</dd></div>
          <div><dt>03 / Questions to test</dt><dd>Access, school closures &amp; population change</dd></div>
        </dl>
      </section>

      <Link to="/water" className="group mt-5 flex items-start gap-4 border-b border-border-light px-1 py-5">
        <Droplets size={23} strokeWidth={1.5} className="mt-1 shrink-0 text-teal" aria-hidden="true" />
        <div>
          <h2 className="heading-editorial text-xl group-hover:text-accent">Water &amp; food security</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-text-muted">Water, weather, public works and the food chain — a five-year evidence register, from source to plate.</p>
        </div>
        <ArrowUpRight size={18} className="ml-auto mt-1 shrink-0 text-accent" aria-hidden="true" />
      </Link>

      <nav className="home-paths" aria-label="Start exploring">
        {[
          { to: '/map', icon: Map, title: 'Explore the corporate map', text: 'Listed capital, state by state, with coverage in view.' },
          { to: '/network', icon: Network, title: 'Trace a connection', text: 'Ownership and public power, joined by sourced claims.' },
          { to: '/patterns', icon: BookOpen, title: 'Read a pattern carefully', text: 'Start with the baseline and the alternative explanation.' },
        ].map(({ to, icon: Icon, title, text }) => (
          <Link key={to} to={to} className="home-path"><Icon size={20} strokeWidth={1.5} aria-hidden="true" /><div><h2>{title}</h2><p>{text}</p></div><ArrowUpRight size={15} aria-hidden="true" /></Link>
        ))}
      </nav>

      <section aria-labelledby="corporate-record-title">
      <div className="home-section-label"><h2 id="corporate-record-title">The corporate record</h2><p>{companies.length} companies · {ministers.length} ministers · {groups.length} groups · as of {asOf}</p></div>
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
              // The tile is the route to the map filtered to this index.
              to: `/map?idx=${x.key}`,
              label:
                `Index coverage · ${x.label} constituents confirmed / expected, as of ${INDICES_AS_OF}` +
                (missing > 0 ? ` · ${missing === 1 ? 'one' : missing} could not be verified` : '') +
                (x.unresolved > 0 ? ` · ${x.unresolved} without a company record` : ''),
            };
          }),
        ]}
      />
      </section>
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
        <div>
          {states.slice(0, 12).map((s) => (
            <div key={s.stateCode} className="concentration-row">
              <div className="concentration-label">
                <Link to={`/states/${s.stateCode}`}>{STATE_NAMES[s.stateCode]}</Link>
                <span>{fmtCr(s.totalMcapCr)} · {s.count} companies</span>
              </div>
              <div className="concentration-track" aria-hidden="true">
                <span style={{ width: `${Math.max(1, (s.totalMcapCr / (states[0]?.totalMcapCr || 1)) * 100)}%` }} />
              </div>
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
                {(edges.length ? (tierCounts[t] / edges.length) * 100 : 0).toFixed(1)}% of relationships
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
        <div className="home-directory">
          {[
            ['/map', 'NSE / BSE map', 'Every state and UT drawn from real boundary geometry, shaded by what is listed there.'],
            ['/cabinet', 'Union cabinet', '69 ministers, portfolios with dates, and the map of regulatory reach.'],
            ['/conglomerates', 'Conglomerates', 'Ten groups, 64 listed entities — with the two Ambani groups kept structurally apart.'],
            ['/network', 'Connection graph', 'Everything merged, filterable by evidence tier, with a path finder that reports its baseline.'],
            ['/atlas', 'Money-trail atlas', 'The depth case study, including the documented void — the integrity check on the whole exercise.'],
            ['/method', 'How this is built', 'The four invariants, the agent roster, and a live integrity check.'],
          ].map(([to, title, blurb]) => (
            <Link key={to} to={to}><div><h3>{title}</h3><p>{blurb}</p></div><ArrowUpRight size={18} aria-hidden="true" /></Link>
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
