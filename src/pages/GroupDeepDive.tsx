import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Kicker, PageTitle, Standfirst, Byline, Section, Callout, StatGrid, DataTable,
  TierChip, Cite, Prose, Footnote,
} from '../components/Editorial';
import WorldMap from '../components/viz/WorldMap';
import IndiaMap from '../components/viz/IndiaMap';
import OwnershipTree from '../components/viz/OwnershipTree';
import {
  getDeep, entityCounts, tierCounts, identifierCoverage,
  contractsByLevel, investorsByType, statesTouched, DEEP_GROUP_IDS,
} from '../data/groupDeep';
import { GROUPS } from '../data/conglomerates';
import { facilitiesForGroup, linksForGroup } from '../data/footprint';
import { STATE_NAMES } from '../data/geo';
import type { StateCode } from '../graph/schema';

const fmtCr = (v: number | null) =>
  v == null ? '—' : v >= 100000 ? `₹${(v / 100000).toFixed(2)} lakh cr` : `₹${v.toLocaleString('en-IN')} cr`;

/**
 * Per-group deep dive.
 *
 * Replaces the two hardcoded deep-dive pages from the parallel line with one
 * data-driven route over every group. Groups without a deep dataset render their
 * summary and say the deep map has not been built — an absent group is a coverage
 * gap, stated, not a blank page.
 */
export default function GroupDeepDive() {
  const { id = '' } = useParams<{ id: string }>();
  const deep = getDeep(id);
  const summary = GROUPS.find((g) => g.id === id);
  const [tab, setTab] = useState<'entities' | 'contracts' | 'capital' | 'flows'>('entities');

  const facilities = useMemo(() => facilitiesForGroup(id), [id]);

  /** Deepest holding chain in the group — derived, so the note cannot go stale. */
  const treeDepth = useMemo(() => {
    if (!deep) return 0;
    const byId = new Map(deep.entities.map((e) => [e.id, e]));
    let max = 0;
    for (const e of deep.entities) {
      let d = 0;
      let cur = e;
      const seen = new Set<string>();
      while (cur.parent && byId.has(cur.parent) && !seen.has(cur.id)) {
        seen.add(cur.id);
        cur = byId.get(cur.parent)!;
        d++;
      }
      max = Math.max(max, d);
    }
    return max;
  }, [deep]);

  const stateData = useMemo(() => {
    const d: Partial<Record<StateCode, { value: number | null; detail?: string }>> = {};
    if (!deep) return d;
    for (const e of deep.entities) {
      if (!e.stateCode) continue;
      d[e.stateCode] = { value: (d[e.stateCode]?.value ?? 0) + 1 };
    }
    return d;
  }, [deep]);

  if (!summary) {
    return (
      <article className="pt-4">
        <PageTitle>Unknown group</PageTitle>
        <Prose>
          <p>
            No group matches <code>{id}</code>. The platform carries{' '}
            {GROUPS.map((g) => g.id).join(', ')}.
          </p>
        </Prose>
        <Link to="/conglomerates" className="btn-ghost mt-4 inline-block">
          ← all groups
        </Link>
      </article>
    );
  }

  if (!deep) {
    return (
      <article className="pb-20">
        <header className="pt-2 pb-6 border-b-2 border-border-light">
          <Kicker>
            <Link to="/conglomerates" className="hover:text-accent">
              Conglomerates
            </Link>{' '}
            / deep dive
          </Kicker>
          <PageTitle>{summary.name}</PageTitle>
          <Standfirst>
            The comparative summary for this group is built. The deep entity map — every
            sourced subsidiary, JV and SPV, its government contracts and its foreign
            capital — has not been.
          </Standfirst>
        </header>
        <Callout label="Coverage gap, stated" tone="warn">
          <p>
            Deep datasets exist for {DEEP_GROUP_IDS.length} of {GROUPS.length} groups:{' '}
            {DEEP_GROUP_IDS.join(', ')}. This one is not among them.
          </p>
          <p>
            That is a statement about research coverage, not about the group. Nothing
            should be inferred from the absence — an unmapped group is unmapped, not clean.
          </p>
        </Callout>
        <Link to="/conglomerates" className="btn-ghost mt-4 inline-block">
          ← the comparative view
        </Link>
      </article>
    );
  }

  const kinds = entityCounts(deep);
  const tiers = tierCounts(deep);
  const ids = identifierCoverage(deep);
  const levels = contractsByLevel(deep);
  const invTypes = investorsByType(deep);
  const states = statesTouched(deep);

  return (
    <article className="pb-20">
      <header className="pt-2 pb-6 border-b-2 border-border-light">
        <Kicker>
          <Link to="/conglomerates" className="hover:text-accent">
            Conglomerates
          </Link>{' '}
          / deep dive
        </Kicker>
        <PageTitle>{summary.name}</PageTitle>
        <Standfirst>
          {deep.entities.length} sourced entities, {deep.govtContracts.length} government
          contracts, {deep.foreignInvestors.length} foreign investors. Every row carries a
          source and an evidence tier; every gap is published rather than filled.
        </Standfirst>
        <Byline>
          As of {deep.asOf} · {tiers.documented ?? 0} documented, {tiers.reported ?? 0} reported ·
          registered offices, not operational footprint
        </Byline>
      </header>

      <StatGrid
        items={[
          { value: String(deep.entities.length), label: `entities — ${Object.entries(kinds).map(([k, n]) => `${n} ${k}`).join(', ')}` },
          { value: `${ids.withCin}/${ids.total}`, label: 'carry a registry identifier (CIN). The rest are named but unresolvable', tone: ids.withCin < ids.total / 2 ? 'rose' : 'muted' },
          { value: `${levels.centre}/${levels.state}`, label: 'government contracts — centre / state', tone: 'accent' },
          { value: String(deep.gaps.length), label: 'published gaps', tone: 'muted' },
        ]}
      />

      {deep.disambiguation && Object.keys(deep.disambiguation).length > 0 && (
        <Callout label="Read this first" tone="warn">
          {Object.values(deep.disambiguation).map((v, i) => (
            <p key={i}>{v}</p>
          ))}
        </Callout>
      )}

      <Callout label="What the identifier coverage means" tone="note">
        <p>
          {ids.withCin} of {ids.total} entities carry a CIN. A name in a consolidation
          annexure establishes that an entity <em>exists</em>; without a registry
          identifier it cannot be resolved against other records, joined to a filing, or
          independently checked. The unresolved remainder is real but not yet usable, and
          is counted here rather than presented as if it were.
        </p>
      </Callout>

      {/* ---- tabs ---- */}
      <div className="flex flex-wrap gap-1.5 mt-8 mb-5">
        {([
          ['entities', `Entities (${deep.entities.length})`],
          ['contracts', `Government (${deep.govtContracts.length})`],
          ['capital', `Foreign capital (${deep.foreignInvestors.length})`],
          ['flows', `Flows (${deep.pmCares.length + deep.csr.length})`],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`font-mono text-[11px] px-3 py-1.5 rounded border transition-colors ${
              tab === k ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-muted hover:text-text'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'entities' && (
        <>
          <Section title="Sectors" note="How the group's entities distribute across its businesses">
            <div className="space-y-3">
              {deep.sectors.map((s) => (
                <div key={s.sector} className="border-l-2 border-border-light pl-3">
                  <p className="font-medium text-[15px]">
                    {s.sector} <span className="font-mono text-[11px] text-text-muted">({s.entities.length})</span>
                  </p>
                  <p className="text-[13.5px] text-text-muted mt-1 max-w-[70ch] leading-relaxed">{s.note}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section
            title="The ownership structure"
            note={`${deep.entities.length} entities across ${treeDepth + 1} levels — depth is the structure, so depth is the axis`}
          >
            <Prose>
              <p>
                This is an indented tree rather than a network graph, and that is a deliberate
                correction. A group structure is a strict hierarchy, and depth is the only thing
                such data has — how many holding layers sit between a step-down vehicle and the
                listed parent. A force layout optimises for edge length and node separation,
                neither of which means anything here, and renders {deep.entities.length} entities
                as a hairball in which an SPV and the flagship look alike.
              </p>
              <p>
                Ownership is what the tree shows. It is not control, and it is not liability —
                a joint venture at depth two may be less wholly owned than a subsidiary at depth
                three, which is why the kind glyph sits beside every row.
              </p>
            </Prose>
            <div className="mt-4">
              <OwnershipTree entities={deep.entities} />
            </div>
          </Section>

          <Section title="Every sourced entity" note="Registered office, not operational location">
            <DataTable
              columns={['Entity', 'Kind', 'Sector', 'CIN', 'Registered', 'Status', 'Tier']}
              rows={deep.entities.map((e) => [
                <span key="n">
                  <strong className="text-text">{e.name}</strong>
                  {e.nse && <span className="font-mono text-[10.5px] text-accent ml-2">{e.nse}</span>}
                  {e.notes && <span className="block text-[11.5px] text-text-muted mt-0.5 max-w-[52ch]">{e.notes.slice(0, 190)}{e.notes.length > 190 ? '…' : ''}</span>}
                </span>,
                <span key="k" className="font-mono text-[10.5px] uppercase tracking-wider text-text-muted">{e.kind}</span>,
                <span key="s" className="text-[12.5px]">{e.sector}</span>,
                <span key="c" className={`font-mono text-[10.5px] ${e.cin ? '' : 'text-amber'}`}>{e.cin ?? 'not obtained'}</span>,
                <span key="r" className="text-[12.5px]">{e.stateCode ? STATE_NAMES[e.stateCode] : e.state ?? '—'}</span>,
                <span key="st" className={`font-mono text-[10.5px] ${e.status !== 'active' ? 'text-amber' : 'text-text-muted'}`}>{e.status}</span>,
                <TierChip key="t" tier={e.tier} />,
              ])}
            />
          </Section>

          {states.length > 0 && (
            <Section title="Where the entities are registered" note={`${states.length} states and UTs`}>
              <IndiaMap
                data={stateData}
                metricLabel="Group entities"
                unit="entities"
                scaleMode="linear"
                showMarks={false}
                height={480}
                format={(v) => String(Math.round(v))}
              />
            </Section>
          )}
        </>
      )}

      {tab === 'contracts' && (
        <Section
          title="Government contracts and concessions"
          note="What was awarded, by whom, and through what process — never why"
        >
          {deep.govtContracts.length === 0 ? (
            <Callout label="None recorded" tone="note">
              <p>No government contract is recorded for this group in the dataset. That is a
              coverage statement, not an absence claim.</p>
            </Callout>
          ) : (
            <div className="space-y-4">
              {deep.govtContracts.map((c, i) => (
                <div key={i} className="border border-border rounded-lg p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h3 className="font-medium text-[15.5px] flex-1 min-w-[18rem]">{c.what}</h3>
                    <div className="flex gap-2 items-center">
                      <span className="font-mono text-[9.5px] uppercase tracking-wider px-1.5 py-0.5 border border-border-light rounded text-text-muted">
                        {c.level}
                      </span>
                      <TierChip tier={c.tier} />
                    </div>
                  </div>
                  <p className="text-[13px] text-text-muted mt-1.5">
                    {c.awardingBody} · {c.entity}
                  </p>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 font-mono text-[11px] text-text-muted">
                    <span>{c.awardDate ?? 'date not obtained'}</span>
                    <span>{c.valueCr != null ? fmtCr(c.valueCr) : 'value not obtained'}</span>
                    <span>{c.processType}</span>
                    <span>{c.bidders != null ? `${c.bidders} bidders` : 'bidder count not obtained'}</span>
                  </div>
                  {c.notes && <p className="text-[13px] text-text-secondary mt-2 max-w-[70ch] leading-relaxed">{c.notes}</p>}
                  <Cite srcs={c.srcs} />
                </div>
              ))}
            </div>
          )}
          <Callout label="Bidder counts are the missing denominator" tone="warn">
            <p>
              A sole-bidder award and a twelve-bidder award look identical in a list and are
              completely different facts.{' '}
              {deep.govtContracts.filter((c) => c.bidders != null).length} of{' '}
              {deep.govtContracts.length} contracts here carry a bidder count. Until that
              improves, no concentration claim can be made from this table.
            </p>
          </Callout>
        </Section>
      )}

      {tab === 'capital' && (
        <>
          <Section
            title="Foreign capital"
            note={Object.entries(invTypes).map(([t, n]) => `${n} ${t}`).join(' · ')}
          >
            <DataTable
              columns={['Investor', 'Country', 'Type', 'Into', 'Stake', 'Status', 'Tier']}
              rows={deep.foreignInvestors.map((f, i) => [
                <span key="n">
                  <strong className="text-text">{f.name}</strong>
                  {f.notes && <span className="block text-[11.5px] text-text-muted mt-0.5 max-w-[46ch]">{f.notes.slice(0, 160)}{f.notes.length > 160 ? '…' : ''}</span>}
                </span>,
                <span key="c" className="text-[12.5px]">{f.country}</span>,
                <span key="t" className="font-mono text-[10.5px] uppercase tracking-wider text-text-muted">{f.type}</span>,
                <span key="e" className="text-[12.5px]">{f.entity}</span>,
                <span key="s" className="font-mono text-[11.5px]">{f.stakePct != null ? `${f.stakePct}%` : '—'}</span>,
                <span key="st" className={`font-mono text-[10.5px] ${f.status !== 'current' ? 'text-amber' : 'text-text-muted'}`}>{f.status}</span>,
                <TierChip key={`ti${i}`} tier={f.tier} />,
              ])}
            />
          </Section>

          {facilities.length > 0 && (
            <Section title="Global footprint" note={`${facilities.length} verified facilities`}>
              <div className="card-surface !p-3 overflow-hidden">
                <WorldMap
                  places={facilities.map((f) => ({
                    id: f.id, label: f.label, lon: f.lon, lat: f.lat,
                    kind: f.kind, country: f.country, srcs: f.srcs,
                  }))}
                  links={linksForGroup(id).map((l) => ({
                    from: l.from, to: l.to, label: l.relation, tier: l.tier, srcs: l.srcs,
                  }))}
                  height={420}
                />
              </div>
            </Section>
          )}
        </>
      )}

      {tab === 'flows' && (
        <Section title="PM CARES and CSR" note="Each with the base rate that says what it is worth">
          {[...deep.pmCares.map((f) => ({ ...f, kind: 'PM CARES' })), ...deep.csr.map((f) => ({ ...f, kind: 'CSR' }))].map((f, i) => (
            <div key={i} className="border-l-2 border-border-light pl-3 py-2">
              <span className="flex flex-wrap items-baseline gap-2">
                <TierChip tier={f.tier} />
                <strong className="text-text">{f.entity}</strong>
                <span className="text-text-muted">→ {f.recipient ?? f.kind}</span>
                <span className="font-mono text-[12px] text-accent">{fmtCr(f.amountCr)}</span>
                <span className="font-mono text-[10.5px] text-text-muted">{f.date ?? f.period}</span>
              </span>
              {f.notes && <p className="text-[13px] text-text-muted mt-1 max-w-[70ch]">{f.notes}</p>}
              <Cite srcs={f.srcs} />
            </div>
          ))}
          <Callout label="Why the base rate is the whole story here" tone="bottomline">
            <p>
              A PM CARES contribution is close to information-free at the entity level:
              every public-sector undertaking that responded to an RTI had contributed.
              Rendered without its denominator, this section would be a graph of who
              existed in March 2020.
            </p>
          </Callout>
        </Section>
      )}

      <Section title="Base rates — read before concluding anything" note="What each pattern is worth against peer groups">
        <Prose>
          <ul className="space-y-3 list-none pl-0">
            {deep.baseRateNotes.map((b, i) => (
              <li key={i} className="border-l-2 border-accent/40 pl-3 text-[14px] leading-relaxed">
                {b}
              </li>
            ))}
          </ul>
        </Prose>
      </Section>

      <Section title="Published gaps" note="Every one is a null in the data, not a guess">
        <ul className="space-y-2">
          {deep.gaps.map((g, i) => (
            <li key={i} className="text-[13.5px] border-l-2 border-amber/40 pl-3 text-text-muted leading-relaxed">
              {g}
            </li>
          ))}
        </ul>
      </Section>

      {deep.rejected && deep.rejected.length > 0 && (
        <Section title="Candidates checked and refuted" note="A refutation is a result">
          <ul className="space-y-2">
            {deep.rejected.map((r, i) => (
              <li key={i} className="text-[13.5px] border-l-2 border-rose/40 pl-3">
                <strong className="text-text">{r.candidate}</strong>
                <span className="block text-text-muted mt-0.5">{r.reason}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Footnote>
        <p>
          <strong>Standing.</strong> Corporate structure, contracts and investment facts,
          drawn from filings, prospectuses, rating-agency rationales and registry records.
          No allegation, investigation or wrongdoing claim appears on this page about any
          group or individual. Where a fact is materially disputed it is noted neutrally
          with its source.
        </p>
        <p>
          <strong>Sources.</strong>{' '}
          {deep.sources.slice(0, 6).map(([l, u], i) => (
            <span key={i}>
              {i > 0 && ' · '}
              <a href={u} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                {l}
              </a>
            </span>
          ))}
        </p>
      </Footnote>
    </article>
  );
}
