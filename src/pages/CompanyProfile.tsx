import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Kicker, PageTitle, Standfirst, Section, Callout, StatGrid, DataTable, Prose, TierChip, Cite } from '../components/Editorial';
import { useData } from '../context/DataContext';
import { STATE_NAMES, STATE_BY_ID, STATES } from '../data/geo';
import { ministersByState, RANK_LABEL } from '../data/politics';
import { INDEX_CHANGES, INDEX_LABEL, INDICES_AS_OF } from '../data/indices';
import { IndexChips } from '../components/Domain';

const fmtCr = (v: number) => (v >= 100000 ? `₹${(v / 100000).toFixed(2)} lakh cr` : `₹${Math.round(v).toLocaleString('en-IN')} cr`);

export default function CompanyProfile() {
  const { id } = useParams<{ id: string }>();
  const { companies, groups, nodes, edges, isWatched, toggleWatch, asOf } = useData();

  const c = companies.find((x) => x.id === id);
  const group = useMemo(() => (c?.group ? groups.find((g) => g.name.toLowerCase().includes(c.group!.toLowerCase()) || g.id === c.group!.toLowerCase()) : null), [c, groups]);

  const peers = useMemo(
    () =>
      c
        ? companies
            .filter((x) => x.sector === c.sector && x.id !== c.id)
            .sort((a, b) => (b.marketCapCr ?? 0) - (a.marketCapCr ?? 0))
            .slice(0, 8)
        : [],
    [companies, c],
  );

  const sectorTotal = useMemo(
    () => (c ? companies.filter((x) => x.sector === c.sector).reduce((a, x) => a + (x.marketCapCr ?? 0), 0) : 0),
    [companies, c],
  );

  // Anything the graph knows about this company, matched on node id or alias.
  const graphNode = useMemo(() => {
    if (!c) return null;
    const needles = [c.name, c.shortName, c.nse ?? ''].filter(Boolean).map((s) => s.toLowerCase());
    return (
      nodes.find((n) => n.id === `co:${c.id}`) ??
      nodes.find((n) => needles.some((needle) => n.label.toLowerCase() === needle || (n.al ?? []).some((a) => a.toLowerCase() === needle))) ??
      null
    );
  }, [c, nodes]);

  const graphEdges = useMemo(
    () => (graphNode ? edges.filter((e) => e.s === graphNode.id || e.t === graphNode.id) : []),
    [graphNode, edges],
  );

  const stateMinisters = useMemo(() => (c ? ministersByState().get(c.stateCode) ?? [] : []), [c]);

  if (!c) {
    return (
      <article className="pt-4">
        <PageTitle>Company not found</PageTitle>
        <Prose>
          <p>
            No company in the dataset has the identifier <code>{id}</code>. The platform currently carries{' '}
            {companies.length} listed companies — coverage is deliberately incomplete and expanding, and an
            absent company is a gap in the dataset rather than a statement about the company.
          </p>
        </Prose>
        <Link to="/search" className="btn-ghost mt-4 inline-block">
          search the dataset →
        </Link>
      </article>
    );
  }

  const geo = STATE_BY_ID.get(c.stateCode);
  const share = sectorTotal && c.marketCapCr ? (c.marketCapCr / sectorTotal) * 100 : 0;

  // Join on the company id only — `co:<id>` is how the index file resolved its rows.
  const coId = `co:${c.id}`;
  // An announced review names this company on one side or the other. It is reported,
  // dated and tiered — and deliberately NOT folded into the membership chips.
  const indexChanges = INDEX_CHANGES.filter((ch) => ch.out.existingId === coId || ch.in.existingId === coId).sort(
    (a, b) => a.effective.localeCompare(b.effective) || a.index.localeCompare(b.index) || a.out.name.localeCompare(b.out.name),
  );

  return (
    <article className="pb-20">
      <header className="pt-2 pb-6 border-b-2 border-border-light">
        <Kicker>
          <Link to="/map" className="hover:text-accent">
            Markets
          </Link>{' '}
          /{' '}
          <Link to={`/states/${c.stateCode}`} className="hover:text-accent">
            {STATE_NAMES[c.stateCode]}
          </Link>{' '}
          / company
        </Kicker>
        <div className="flex flex-wrap justify-between gap-4 items-start">
          <div className="flex-1 min-w-[18rem]">
            <PageTitle>{c.shortName || c.name}</PageTitle>
            <Standfirst>
              {c.name}. {c.industry}, registered in {c.hqCity}, {STATE_NAMES[c.stateCode]}
              {c.founded ? `, founded ${c.founded}` : ''}.
              {c.group ? ` Part of the ${c.group} group.` : ''}
            </Standfirst>
          </div>
          <button onClick={() => toggleWatch(c.id)} className={isWatched(c.id) ? 'btn-primary' : 'btn-ghost'}>
            {isWatched(c.id) ? 'tracked ✓' : '+ track'}
          </button>
        </div>
        <p className="font-mono text-[11px] text-text-muted mt-4 tracking-wide">
          {c.nse ? `NSE ${c.nse}` : ''}
          {c.nse && c.bse ? ' · ' : ''}
          {c.bse ? `BSE ${c.bse}` : ''}
          {c.isin ? ` · ${c.isin}` : ''} · figures as of {asOf}
        </p>
        {/* No chip row at all for a company in no index: an absent chip is not a claim. */}
        <IndexChips companyId={c.id} withCoverageNote />
        {indexChanges.map((ch) => {
          const leaving = ch.out.existingId === coId;
          const other = leaving ? ch.in : ch.out;
          const otherName = other.existingId ? (
            <Link to={`/company/${other.existingId.replace(/^co:/, '')}`} className="text-text hover:text-accent">
              {other.name}
            </Link>
          ) : (
            <>
              <strong className="text-text font-medium">{other.name}</strong> (not yet a record in the company dataset)
            </>
          );
          return (
            <div key={`${ch.index}-${ch.effective}-${ch.out.name}-${ch.in.name}`} className="mt-3 border-l-2 border-border-light pl-3 max-w-[74ch]">
              <p className="text-[13.5px] text-text-secondary leading-relaxed">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mr-2">Announced index change</span>
                <TierChip tier={ch.tier} />{' '}
                {INDEX_LABEL[ch.index]}:{' '}
                {leaving ? (
                  <>announced to leave the index, with {otherName} entering in its place</>
                ) : (
                  <>announced to enter the index, replacing {otherName}</>
                )}{' '}
                — announced, effective <span className="font-mono">{ch.effective}</span>.
              </p>
              <p className="text-[12px] text-text-muted mt-1 leading-relaxed">
                An announced review is not membership: index membership on this page is the constituent list as of{' '}
                <span className="font-mono">{INDICES_AS_OF}</span>, and this change is not applied to it.
              </p>
              <Cite srcs={ch.srcs} />
            </div>
          );
        })}
      </header>

      <StatGrid
        items={[
          { value: c.marketCapCr != null ? fmtCr(c.marketCapCr) : 'not recorded', label: 'market cap — as of the dataset date, not live', tone: c.marketCapCr == null ? 'muted' : 'accent' },
          { value: `${share.toFixed(1)}%`, label: `of listed ${c.sector} market cap in the dataset`, tone: 'muted' },
          { value: c.ownership.replace('-', ' '), label: 'ownership class' },
          { value: c.employees != null ? c.employees.toLocaleString('en-IN') : 'not recorded', label: 'employees', tone: 'muted' },
        ]}
      />

      {c.notes && (
        <Callout label="Note on this record" tone="note">
          <p>{c.notes}</p>
        </Callout>
      )}

      <Callout label="Registered, not operational" tone="note">
        <p>
          This company is attributed to <strong>{STATE_NAMES[c.stateCode]}</strong> because that is where its{' '}
          <em>registered</em> office sits. Registered and operational headquarters diverge frequently in
          India — several large public-sector companies are Delhi- or Kolkata-registered while operating
          principally elsewhere, and several well-known private names carry a registered office in a state
          most people would not associate them with. Conflating the two is the most common error in
          state-wise corporate maps.
        </p>
      </Callout>

      <Section title="Where it sits" note="">
        <div className="flex flex-wrap gap-6 items-start">
          {geo && (
            <svg
              viewBox={`${geo.bbox[0] - 10} ${geo.bbox[1] - 10} ${geo.bbox[2] - geo.bbox[0] + 20} ${geo.bbox[3] - geo.bbox[1] + 20}`}
              className="w-40"
              role="img"
              aria-label={`Outline of ${geo.name}`}
            >
              {STATES.filter((s) => s.id !== geo.id).map((s) => (
                <path key={s.id} d={s.path} fill="none" stroke="rgba(232,228,220,0.09)" strokeWidth="0.5" />
              ))}
              <path d={geo.path} fill="rgba(201,168,108,0.16)" stroke="var(--color-accent,#c9a86c)" strokeWidth="0.9" />
              <circle cx={geo.cx} cy={geo.cy} r="2" fill="var(--color-accent,#c9a86c)" />
            </svg>
          )}
          <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-[14px]">
            {[
              ['Sector', c.sector],
              ['Industry', c.industry],
              ['Registered city', c.hqCity],
              ['State', STATE_NAMES[c.stateCode]],
              ['Exchanges', [c.nse ? 'NSE' : null, c.bse ? 'BSE' : null].filter(Boolean).join(' + ') || 'not recorded'],
              ['Promoter group', c.group ?? 'none recorded'],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted">{k}</dt>
                <dd className="text-text-secondary mt-0.5">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <Cite srcs={c.srcs} />
      </Section>

      {group && (
        <Section title={`Group: ${group.name}`} note="Ownership structure — descriptive only">
          <p className="text-[14.5px] text-text-secondary max-w-[70ch] leading-relaxed">
            {group.holdingEntity}
          </p>
          <DataTable
            columns={['Sister entity', 'NSE', 'Sector', 'Market cap', 'Promoter %']}
            rows={group.listedEntities.map((e) => [
              e.name,
              <span key="t" className="font-mono text-[11.5px]">
                {e.nse ?? '—'}
              </span>,
              <span key="s" className="text-[12.5px]">
                {e.sector}
              </span>,
              <span key="m" className="font-mono text-[11.5px] whitespace-nowrap">
                {e.mcapCr != null ? fmtCr(e.mcapCr) : '—'}
              </span>,
              <span key="p" className="font-mono text-[11.5px]">
                {e.promoterHoldingPct != null ? `${e.promoterHoldingPct}%` : '—'}
              </span>,
            ])}
          />
          <Link to="/conglomerates" className="btn-ghost !text-[12px] inline-block mt-2">
            full group structure →
          </Link>
        </Section>
      )}

      {graphEdges.length > 0 && (
        <Section title="In the graph" note="Every relationship carries its evidence tier and its source">
          <ul className="space-y-3">
            {graphEdges.slice(0, 20).map((e, i) => {
              const otherId = e.s === graphNode!.id ? e.t : e.s;
              const other = nodes.find((n) => n.id === otherId);
              return (
                <li key={i} className="border-l-2 border-border-light pl-3">
                  <span className="flex flex-wrap items-baseline gap-2 text-[14px]">
                    <TierChip tier={e.tier} />
                    <span className="text-text-muted">{e.s === graphNode!.id ? '→' : '←'}</span>
                    <strong className="text-text">{other?.label ?? otherId}</strong>
                    <span className="text-text-muted">{e.pred}</span>
                    {e.a ? <span className="font-mono text-[12px] text-accent">₹{e.a.toLocaleString('en-IN')} cr</span> : null}
                  </span>
                  {e.d && <p className="text-[13px] text-text-muted mt-1">{e.d}</p>}
                  {e.innocentReading && (
                    <p className="text-[12.5px] text-text-muted italic mt-1">Innocent reading: {e.innocentReading}</p>
                  )}
                  <Cite srcs={e.srcs} />
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      <Section title={`Peers in ${c.sector}`} note="By recorded market cap — the reference class for any claim about this company">
        <DataTable
          columns={['Company', 'Ticker', 'Market cap', 'State']}
          rows={peers.map((p) => [
            <Link key="n" to={`/company/${p.id}`} className="text-text hover:text-accent">
              {p.shortName || p.name}
            </Link>,
            <span key="t" className="font-mono text-[11.5px]">
              {p.nse ?? p.bse ?? '—'}
            </span>,
            <span key="m" className="font-mono text-[11.5px] whitespace-nowrap">
              {p.marketCapCr != null ? fmtCr(p.marketCapCr) : '—'}
            </span>,
            <Link key="s" to={`/states/${p.stateCode}`} className="text-[12.5px] hover:text-accent">
              {STATE_NAMES[p.stateCode]}
            </Link>,
          ])}
        />
      </Section>

      {stateMinisters.length > 0 && (
        <Section title="Union ministers seated in the same state" note="Context only — never drawn as a relationship">
          <p className="text-[14px] text-text-secondary max-w-[70ch] leading-relaxed">
            {stateMinisters.map((m) => `${m.name} (${RANK_LABEL[m.rank]})`).join(', ')}.
          </p>
          <Callout label="Why there is no line here" tone="note">
            <p>
              {STATE_NAMES[c.stateCode]} has both this company's registered office and{' '}
              {stateMinisters.length} union minister{stateMinisters.length === 1 ? '' : 's'}. Joining those
              two facts would create an edge in every large state by construction — Maharashtra alone
              carries a large plurality of listed headquarters, so co-location there is close to expected.
              Co-location is shown here as context and is never rendered as a relationship.
            </p>
          </Callout>
        </Section>
      )}
    </article>
  );
}
