import { useMemo, useState } from 'react';
import {
  Kicker, PageTitle, Standfirst, Byline, Section, Callout, StatGrid, DataTable, Footnote, Prose,
} from '../components/Editorial';
import GraphExplorer from '../components/viz/GraphExplorer';
import IndiaMap from '../components/viz/IndiaMap';
import WorldMap from '../components/viz/WorldMap';
import {
  FACILITIES, FOOTPRINT_AS_OF, FOOTPRINT_GAPS, FOOTPRINT_REJECTED,
  facilitiesForGroup, linksForGroup, statusCounts, COUNTRIES_FOR,
} from '../data/footprint';
import {
  GROUPS, GROUPS_AS_OF, GROUP_GAPS, GROUP_SOURCES, DISAMBIGUATION, groupTotals, sectorOverlap,
  type Group,
} from '../data/conglomerates';
import { buildNationalGraph } from '../graph/build';
import type { StateCode } from '../graph/schema';

/**
 * Conglomerate structure.
 *
 * Descriptive ownership only. No allegations live on this page — that is the
 * Atlas's job, under tiering. The Mukesh/Anil Ambani distinction is enforced
 * structurally in the data layer, and stated prominently here, because conflating
 * them is a factual error that discredits everything near it.
 */

const fmtCr = (v: number | null) =>
  v == null ? '—' : v >= 100000 ? `₹${(v / 100000).toFixed(2)} lakh cr` : `₹${v.toLocaleString('en-IN')} cr`;

function GroupCard({ g, open, onToggle }: { g: Group; open: boolean; onToggle: () => void }) {
  const anil = g.separateAnilAmbaniGroup;
  const anilEntities = Array.isArray(anil) ? anil : anil?.entities ?? [];
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button onClick={onToggle} aria-expanded={open} className="w-full text-left p-4 hover:bg-bg-card transition-colors">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="heading-editorial font-bold text-lg leading-tight">{g.name}</h3>
            <p className="text-[12.5px] text-text-muted mt-1">
              {g.promoterFamily} · {g.hqCity}, {g.state} · founded {g.foundedYear}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-mono text-[15px] text-accent">{fmtCr(g.combinedMcapCr)}</p>
            <p className="font-mono text-[10px] text-text-muted uppercase tracking-wider mt-0.5">
              {g.listedEntities.length} listed
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {g.sectors.slice(0, 8).map((s) => (
            <span key={s} className="font-mono text-[9.5px] uppercase tracking-wider px-1.5 py-0.5 border border-border rounded text-text-muted">
              {s}
            </span>
          ))}
          {g.sectors.length > 8 && <span className="font-mono text-[9.5px] text-text-muted">+{g.sectors.length - 8}</span>}
        </div>
      </button>

      {open && (
        <div className="border-t border-border p-4 space-y-6 bg-bg-elevated/40">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mb-2">Control structure</p>
            <p className="text-[14px] text-text-secondary leading-relaxed max-w-[70ch]">{g.holdingEntity}</p>
            {g.notes && <p className="text-[13px] text-text-muted mt-2 italic max-w-[70ch]">{g.notes}</p>}
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mb-2">Listed entities</p>
            <DataTable
              columns={['Entity', 'NSE', 'Sector', 'Market cap', 'Promoter %', 'HQ']}
              rows={g.listedEntities.map((e) => [
                <span key="n">
                  <strong className="text-text text-[13.5px]">{e.name}</strong>
                  {e.notes && <span className="block text-[11.5px] text-text-muted mt-0.5">{e.notes}</span>}
                </span>,
                <span key="t" className="font-mono text-[11.5px]">
                  {e.nse ?? '—'}
                </span>,
                <span key="s" className="text-[12.5px]">
                  {e.sector}
                </span>,
                <span key="m" className="font-mono text-[11.5px] whitespace-nowrap">
                  {fmtCr(e.mcapCr)}
                </span>,
                <span key="p" className="font-mono text-[11.5px]">
                  {e.promoterHoldingPct != null ? `${e.promoterHoldingPct}%` : '—'}
                  {e.asOfQuarter && <span className="block text-[9.5px] text-text-muted">{e.asOfQuarter}</span>}
                </span>,
                <span key="h" className="font-mono text-[11px] uppercase">
                  {e.hqState}
                </span>,
              ])}
            />
          </div>

          {g.formerListedEntities?.length ? (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mb-2">
                Former listed entities — retained, not deleted
              </p>
              <ul className="space-y-1.5">
                {g.formerListedEntities.map((e) => (
                  <li key={e.name} className="text-[13px] text-text-muted">
                    <strong className="text-text-secondary">{e.name}</strong> — {e.status ?? e.notes ?? 'no longer listed'}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {anilEntities.length > 0 && (
            <Callout label="A different group entirely" tone="warn">
              <p>
                {typeof anil === 'object' && !Array.isArray(anil) && anil.note
                  ? anil.note
                  : 'These entities belong to the separate Anil Ambani group and share no common promoter entity with the group above.'}
              </p>
              <ul className="space-y-1">
                {anilEntities.map((e) => (
                  <li key={e.name} className="text-[13.5px] font-mono">
                    {e.name} {e.nse ? `(${e.nse})` : ''}{' '}
                    {e.promoterHoldingPct != null && <span className="text-text-muted">promoter {e.promoterHoldingPct}%</span>}
                  </li>
                ))}
              </ul>
              <p className="text-[13px]">
                They are held outside <code>listedEntities</code> in the data layer and excluded from the
                combined market cap above, so no downstream aggregation can conflate the two groups.
              </p>
            </Callout>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mb-2">
                Key people ({g.keyPeople.filter((p) => p.family).length} family, {g.keyPeople.filter((p) => !p.family).length} professional)
              </p>
              <ul className="space-y-2">
                {g.keyPeople.map((p) => (
                  <li key={p.name + p.entity} className="text-[13.5px]">
                    <strong className="text-text">{p.name}</strong>
                    {p.family && <span className="ml-2 font-mono text-[9.5px] uppercase tracking-wider text-accent">family</span>}
                    <span className="block text-text-muted text-[12.5px]">
                      {p.role} — {p.entity}
                      {p.since ? ` · since ${p.since}` : ''}
                    </span>
                    {p.notes && <span className="block text-[12px] text-text-muted italic mt-0.5">{p.notes}</span>}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-6">
              {g.foreignPartners.length > 0 ? (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mb-2">Foreign partners</p>
                  <ul className="space-y-2">
                    {g.foreignPartners.map((f) => (
                      <li key={f.name + f.entity} className="text-[13.5px]">
                        <strong className="text-text">{f.name}</strong>{' '}
                        <span className="text-text-muted">({f.country})</span>
                        <span className="block text-text-muted text-[12.5px]">
                          {f.stake} — {f.entity}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-[13px] text-text-muted italic border-l-2 border-amber/40 pl-3">
                  No foreign partners recorded. This means <strong>not researched</strong>, not "none exist" —
                  absence here is a gap in coverage, not a finding.
                </p>
              )}

              {g.notableSubsidiaries.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mb-2">Notable subsidiaries</p>
                  <ul className="space-y-1.5">
                    {g.notableSubsidiaries.map((s) => (
                      <li key={s.name} className="text-[13px]">
                        <strong className="text-text-secondary">{s.name}</strong>
                        <span className="text-text-muted"> — {s.activity}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Conglomerates() {
  const [open, setOpen] = useState<string | null>('reliance');
  const [footprintGroup, setFootprintGroup] = useState<string>('adani');
  const totals = useMemo(() => groupTotals(), []);

  const capitalGraph = useMemo(() => {
    const g = buildNationalGraph();
    const keep = new Set(g.nodes.filter((n) => n.fam === 'capital' || n.fam === 'market').map((n) => n.id));
    return {
      nodes: g.nodes.filter((n) => keep.has(n.id)),
      edges: g.edges.filter((e) => keep.has(e.s) && keep.has(e.t)),
    };
  }, []);

  const mapData = useMemo(() => {
    const d: Partial<Record<StateCode, { value: number | null; detail?: string }>> = {};
    for (const g of GROUPS) {
      const cur = d[g.stateCode]?.value ?? 0;
      d[g.stateCode] = {
        value: (cur ?? 0) + (g.combinedMcapCr ?? 0),
        detail: `${GROUPS.filter((x) => x.stateCode === g.stateCode).map((x) => x.name.split('(')[0].trim()).join(', ')}`,
      };
    }
    return d;
  }, []);

  const reliance = GROUPS.find((g) => g.id === 'reliance');
  const adani = GROUPS.find((g) => g.id === 'adani');
  const overlap = reliance && adani ? sectorOverlap(reliance, adani) : [];

  const totalMcap = totals.reduce((a, t) => a + (t.mcapCr ?? 0), 0);
  const totalEntities = totals.reduce((a, t) => a + t.entities, 0);
  const totalFamily = totals.reduce((a, t) => a + t.familyPeople, 0);

  return (
    <article className="pb-20">
      <header className="pt-2 pb-6 border-b-2 border-border-light">
        <Kicker>Capital layer · descriptive ownership structure</Kicker>
        <PageTitle>Ambani, Adani, and the eight groups behind them</PageTitle>
        <Standfirst>
          Who owns what, who sits where, and which foreign capital sits behind each. This is the clean
          ownership backbone the rest of the platform reasons over — structure only, with no allegation
          attached to any of it. Allegation-shaped material lives in the Atlas, under tiering, and is not
          permitted here.
        </Standfirst>
        <Byline>
          As of {GROUPS_AS_OF} · market caps and promoter percentages stamped with the quarter they come
          from · every entity carries a source · nothing estimated or inferred
        </Byline>
      </header>

      <Callout label="Two Ambani groups, not one" tone="warn">
        <p>{DISAMBIGUATION.twoAmbaniGroups}</p>
        <p>
          This distinction is enforced <strong>structurally</strong>, not just in prose: the Anil Ambani
          entities are held outside the Reliance group's <code>listedEntities</code> array and are excluded
          from its combined market cap, so no aggregation anywhere downstream can silently merge them.
          Conflating the two is a factual error that discredits everything sitting next to it.
        </p>
      </Callout>

      <StatGrid
        items={[
          { value: `₹${(totalMcap / 100000).toFixed(1)}L cr`, label: 'combined market cap across the ten groups (partial where entities are unpriced)' },
          { value: String(totalEntities), label: 'listed entities mapped' },
          { value: String(totalFamily), label: 'promoter-family office-holders', tone: 'muted' },
          { value: String(GROUP_GAPS.length), label: 'documented gaps carried through rather than filled with guesses', tone: 'rose' },
        ]}
      />

      <Section title="Where the groups are seated" note="Shaded by combined market cap of groups registered in that state">
        <IndiaMap
          data={mapData}
          metricLabel="Group market cap"
          unit="₹ cr"
          scaleMode="log"
          showMarks={false}
          height={520}
          format={(v) => `${(v / 100000).toFixed(1)}L cr`}
        />
        <p className="text-[13px] text-text-muted mt-3 max-w-[70ch]">
          Registered headquarters, not operational footprint. A group seated in Gujarat may run ports in
          five states and mines in three more; a group seated in Maharashtra may have almost no physical
          operations there. The map answers "where is the registered office", which is a narrower question
          than it looks.
        </p>
      </Section>

      <Section
        title="Global footprint"
        note={`${FACILITIES.length} verified facilities across ${new Set(FACILITIES.map((f) => f.country)).size} countries · as of ${FOOTPRINT_AS_OF} · ports, plants, mines and offices — not a complete inventory`}
      >
        <div className="flex flex-wrap gap-1.5 mb-4">
          {['adani', 'reliance'].map((gid) => (
            <button
              key={gid}
              onClick={() => setFootprintGroup(gid)}
              className={`font-mono text-[11px] px-2.5 py-1.5 rounded border transition-colors ${
                footprintGroup === gid ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-muted hover:text-text'
              }`}
            >
              {gid === 'adani' ? 'Adani' : 'Reliance'} ({facilitiesForGroup(gid).length})
            </button>
          ))}
        </div>

        <div className="card-surface !p-3 overflow-hidden">
          <WorldMap
            places={facilitiesForGroup(footprintGroup).map((f) => ({
              id: f.id,
              label: f.label,
              lon: f.lon,
              lat: f.lat,
              kind: f.kind,
              country: f.country,
              srcs: f.srcs,
            }))}
            links={linksForGroup(footprintGroup).map((l) => ({
              from: l.from,
              to: l.to,
              label: l.relation,
              tier: l.tier,
              srcs: l.srcs,
            }))}
            height={430}
            caption={`Ownership and operation links only. The list this replaces asserted trade routes between terminals with invented strength values; shipping volumes between specific private terminals are not published.`}
          />
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 font-mono text-[10.5px] text-text-muted">
          {Object.entries(statusCounts(footprintGroup)).map(([s, n]) => (
            <span key={s} className={s === 'cancelled' || s === 'divested' ? 'text-amber' : ''}>
              {n} {s}
            </span>
          ))}
          <span className="ml-auto">{COUNTRIES_FOR(footprintGroup).join(' · ')}</span>
        </div>

        <Callout label="Cancelled and divested facilities are shown, not filtered out" tone="note">
          <p>
            A withdrawn concession is a fact about a group's reach, and a map showing only
            what succeeded overstates it. Two Adani entries here are cancelled — the Jomo
            Kenyatta airport concession and the Mannar wind project — and one is divested.
          </p>
          <p>
            This footprint was re-verified rather than inherited. The previous version
            asserted a Mombasa port facility that does not exist; Adani's 2024 Kenya
            involvement was the Jomo Kenyatta concession and a KETRACO transmission PPP,
            both cancelled in November 2024, and the group has publicly stated it never
            signed an agreement to operate the airport. Five coordinates were also
            materially wrong, the worst by roughly 19 km.
          </p>
        </Callout>

        <details className="mt-4">
          <summary className="font-mono text-[11px] text-text-muted cursor-pointer hover:text-text">
            {FOOTPRINT_REJECTED.length} candidates checked and refuted · {FOOTPRINT_GAPS.length} gaps
          </summary>
          <ul className="mt-3 space-y-2">
            {FOOTPRINT_REJECTED.map((r, i) => (
              <li key={i} className="text-[13px] border-l-2 border-rose/40 pl-3">
                <strong className="text-text">{r.candidate}</strong>
                <span className="block text-text-muted mt-0.5">{r.reason}</span>
              </li>
            ))}
            {FOOTPRINT_GAPS.map((g, i) => (
              <li key={`g${i}`} className="text-[13px] border-l-2 border-amber/40 pl-3 text-text-muted">
                {g}
              </li>
            ))}
          </ul>
        </details>
      </Section>

      <Section title="The ten groups" note="Click to expand — entities, people, foreign partners, gaps">
        <div className="space-y-3">
          {totals.map((t) => {
            const g = GROUPS.find((x) => x.id === t.id)!;
            return <GroupCard key={g.id} g={g} open={open === g.id} onToggle={() => setOpen(open === g.id ? null : g.id)} />;
          })}
        </div>
      </Section>

      {overlap.length > 0 && (
        <Section title="Where Reliance and Adani coexist" note="A descriptive measure of sector overlap — it carries no claim about coordination">
          <Prose>
            <p>
              The two groups share {overlap.length} declared sector{overlap.length === 1 ? '' : 's'}:{' '}
              <strong>{overlap.join(', ')}</strong>. Two of India's largest diversified conglomerates
              operating in the same sectors is what "diversified conglomerate" means. Sector overlap is a
              structural fact about the market, not evidence of anything, and this platform will not render
              it as an edge between them.
            </p>
          </Prose>
        </Section>
      )}

      <Section title="The ownership graph" note="Groups, their listed entities, the people, the sectors, and foreign capital">
        <GraphExplorer nodes={capitalGraph.nodes} edges={capitalGraph.edges} height={660} defaultQuery="" />
      </Section>

      <Section title="Known gaps" note="Every one of these is a null in the data, not a guess">
        <Prose>
          <ul className="space-y-2.5 list-none pl-0">
            {GROUP_GAPS.map((g, i) => (
              <li key={i} className="border-l-2 border-amber/40 pl-3 text-[14px]">
                {g}
              </li>
            ))}
          </ul>
        </Prose>
      </Section>

      <Footnote>
        <p>
          <strong>Sourcing.</strong> Company filings, investor-relations pages and exchange disclosures, with
          shareholding percentages reproducing SEBI/exchange quarterly filings and stamped with their
          quarter.{' '}
          {GROUP_SOURCES.slice(0, 6).map(([l, u], i) => (
            <span key={i}>
              {i > 0 && ' · '}
              <a href={u} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                {l}
              </a>
            </span>
          ))}
        </p>
        <p>
          <strong>Standing.</strong> Descriptive corporate structure drawn from public filings. No
          allegation, investigation or wrongdoing claim appears on this page about any group or individual.
          Where a corporate event is materially disputed, it is noted neutrally with its source.
        </p>
      </Footnote>
    </article>
  );
}
