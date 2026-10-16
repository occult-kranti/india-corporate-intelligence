import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Kicker, PageTitle, Standfirst, Byline, Section, Callout, StatGrid, TierChip, Footnote, Prose,
} from '../components/Editorial';
import GraphExplorer from '../components/viz/GraphExplorer';
import IndiaMap, { type MapMark } from '../components/viz/IndiaMap';
import { NODES, EDGES, MOTIFS, ATLAS_META } from '../graph/data';
import { validateGraph, TIER_ORDER, type Tier } from '../graph/schema';
import { motifSignificance, medianDegreeSeparation } from '../graph/nullModel';
import { STATE_NAMES } from '../data/geo';
import type { StateCode } from '../graph/schema';

/**
 * The Money-Trail Atlas — the depth case study.
 *
 * Maps public records and published claims. Asserts no guilt. No node adjudicates
 * a quid pro quo. Denials are rendered as prominently as the claims they answer.
 */

export default function Atlas() {
  const [openMotif, setOpenMotif] = useState<string | null>('M10');

  const issues = useMemo(() => validateGraph(NODES, EDGES, MOTIFS), []);
  const tierCounts = useMemo(() => {
    const c: Record<Tier, number> = { documented: 0, reported: 0, alleged: 0, analytic: 0 };
    for (const e of EDGES) c[e.tier]++;
    return c;
  }, []);

  const contras = EDGES.filter((e) => e.pred === 'contra').length;
  const supersedes = EDGES.filter((e) => e.pred === 'supersede').length;
  const sourced = EDGES.filter((e) => (e.srcs?.length ?? 0) > 0).length;

  const mapData = useMemo(() => {
    const d: Partial<Record<StateCode, { value: number | null; detail?: string }>> = {};
    for (const n of NODES) {
      if (!n.st) continue;
      const cur = d[n.st]?.value ?? 0;
      d[n.st] = { value: (cur ?? 0) + 1 };
    }
    return d;
  }, []);

  const marks: MapMark[] = useMemo(
    () =>
      NODES.filter((n) => n.st).map((n) => ({
        id: n.id,
        label: n.label,
        state: n.st as StateCode,
        weight: n.sz * 40000,
        kind: n.fam === 'state' ? 'ministry' : 'company',
      })),
    [],
  );

  // Null-model check on the whole subgraph: how surprising is the observed
  // clustering of award edges among donors, once degree is held fixed?
  const nullResult = useMemo(() => {
    const raw = EDGES.map((e) => ({ s: e.s, t: e.t, pred: e.pred }));
    const donors = new Set(EDGES.filter((e) => ['bond', 'trust', 'direct'].includes(e.pred)).map((e) => e.s));
    return motifSignificance(
      raw,
      (es) => es.filter((e) => e.pred === 'award' && donors.has(e.t)).length,
      400,
    );
  }, []);

  const medianHops = useMemo(
    () => medianDegreeSeparation(EDGES.map((e) => ({ s: e.s, t: e.t, pred: e.pred })), ['joshi', 'coal', 'food']),
    [],
  );

  return (
    <article className="pb-20">
      <header className="pt-2 pb-6 border-b-2 border-border-light">
        <Kicker>Case study · depth · the graph that taught the platform its rules</Kicker>
        <PageTitle>The Money-Trail Atlas</PageTitle>
        <Standfirst>
          {ATLAS_META.subject}. Every edge is a sourced claim with an evidence tier. Facts are superseded,
          never deleted. Denials are first-class. The former M10 donation-absence interpretation
          is held for source-scope review. Missing graph links do not establish zero donations.
        </Standfirst>
        <Byline>
          {ATLAS_META.scope} · compiled {ATLAS_META.compiled} · {NODES.length} entities · {EDGES.length}{' '}
          relationships · {MOTIFS.length} motifs
        </Byline>
      </header>

      <Callout label="Standing" tone="bottomline">
        <p>{ATLAS_META.standing}</p>
        <p>
          There is <strong>no conviction, no charge, no FIR and no enforcement case</strong> against the
          minister personally. The documented story is about <em>decisions taken by ministries</em>, and the
          investigations that obtained the internal correspondence do not name him as the decision-maker or
          allege he benefited. The{' '}
          <Link to="/evidence" className="underline underline-offset-2">
            evidence audit
          </Link>{' '}
          walks that distinction claim by claim.
        </p>
      </Callout>

      <StatGrid
        items={[
          { value: `${sourced}/${EDGES.length}`, label: 'relationships carrying at least one source URL', tone: 'sage' },
          { value: String(contras), label: 'denial edges — rendered as prominently as what they answer' },
          { value: String(supersedes), label: 'superseded facts — retained and addressable, never deleted' },
          { value: issues.filter((i) => i.level === 'error').length === 0 ? 'PASS' : 'FAIL', label: 'provenance invariant across the subgraph', tone: issues.some((i) => i.level === 'error') ? 'rose' : 'sage' },
        ]}
      />

      <Section title="Evidence census" note="What this graph is actually made of">
        <div className="grid gap-3 sm:grid-cols-4">
          {TIER_ORDER.map((t) => (
            <div key={t} className="border border-border rounded-lg p-3">
              <TierChip tier={t} />
              <p className="font-mono text-2xl mt-2">{tierCounts[t]}</p>
              <p className="text-[11.5px] text-text-muted">
                {((tierCounts[t] / EDGES.length) * 100).toFixed(0)}% of relationships
              </p>
            </div>
          ))}
        </div>
        <p className="text-[13.5px] text-text-muted mt-4 max-w-[70ch] leading-relaxed">
          A graph that is overwhelmingly <em>documented</em> is not a graph that proves wrongdoing — it is a
          graph whose individual facts are checkable. The inferential weight sits almost entirely in how
          those facts are arranged, which is why every motif below carries its innocent reading and its kill
          condition.
        </p>
      </Section>

      <Section title="The motifs" note="Patterns over typed edges, each with the boring explanation that also fits">
        <div className="space-y-2.5">
          {MOTIFS.map((m) => {
            const open = openMotif === m.id;
            const isVoid = m.id === 'M10';
            return (
              <div
                key={m.id}
                className={`border rounded-lg overflow-hidden ${isVoid ? 'border-accent/50 bg-accent/[0.04]' : 'border-border'}`}
              >
                <button onClick={() => setOpenMotif(open ? null : m.id)} aria-expanded={open} className="w-full text-left p-4">
                  <div className="flex items-start gap-3">
                    <span className="font-mono text-[10px] text-text-muted pt-1 w-8 flex-shrink-0">{m.id}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-baseline gap-2.5">
                        <h3 className="font-medium text-[15.5px]">{m.name}</h3>
                        <TierChip tier={m.tier} />
                        {isVoid && (
                          <span className="font-mono text-[9.5px] uppercase tracking-wider text-accent border border-accent/50 px-1.5 py-0.5 rounded">
                            integrity check
                          </span>
                        )}
                      </div>
                      <p className="text-[13.5px] text-text-muted mt-1.5 leading-snug max-w-[68ch]">{m.note}</p>
                      <p className="font-mono text-[10px] text-text-muted mt-2">
                        {m.census.members} of {m.census.population} {m.census.label ?? 'edges'}
                      </p>
                    </div>
                  </div>
                </button>

                {open && (
                  <div className="border-t border-border px-4 py-4 space-y-4">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mb-1.5">Pattern</p>
                      <code className="block text-[12px] text-teal bg-bg p-2.5 rounded border border-border overflow-x-auto">
                        {m.pattern}
                      </code>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-sage mb-1.5">
                        Innocent reading — required, and it ships with the claim
                      </p>
                      <p className="text-[14px] text-text-secondary leading-relaxed max-w-[70ch]">{m.innocentReading}</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mb-1.5">Upgrades if</p>
                        <p className="text-[13.5px] text-text-secondary leading-relaxed">{m.upgradeIf}</p>
                      </div>
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-rose mb-1.5">Killed by</p>
                        <p className="text-[13.5px] text-text-secondary leading-relaxed">{m.killIf}</p>
                      </div>
                    </div>
                    <p className="font-mono text-[10.5px] text-text-muted border-t border-border pt-3">
                      Census denominator: {m.census.label}. This is a within-graph count, not a national base
                      rate — for that, see{' '}
                      <Link to="/base-rates" className="underline underline-offset-2">
                        Base Rates
                      </Link>
                      .
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Null-model check" note="Because hubs and short paths are compulsory in networks like this">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="card-surface p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mb-2">
              Award edges landing on donors
            </p>
            <p className="font-mono text-3xl text-accent">{nullResult.observed}</p>
            <p className="text-[13px] text-text-muted mt-1">
              observed, against {nullResult.nullMean.toFixed(1)} ± {nullResult.nullSd.toFixed(1)} expected under{' '}
              {nullResult.shuffles} degree-preserving rewirings
            </p>
            <p className="font-mono text-[13px] mt-3">
              z = {nullResult.zScore.toFixed(2)} · p<sub>emp</sub> = {nullResult.pEmpirical.toFixed(3)}
            </p>
            <p className="text-[12.5px] text-text-muted mt-2 leading-relaxed">
              {Math.abs(nullResult.zScore) < 2
                ? 'Not distinguishable from what the degree sequence alone produces. The apparent clustering of awards on donors is, at this graph size, unsurprising.'
                : 'Beyond what the degree sequence alone produces at this graph size — but note the subgraph is small and hand-assembled, which limits what a z-score here can carry.'}
            </p>
          </div>
          <div className="card-surface p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mb-2">
              Median separation
            </p>
            <p className="font-mono text-3xl text-accent">{medianHops} hops</p>
            <p className="text-[13px] text-text-muted mt-1">
              between the ministry nodes and everything else reachable in this subgraph
            </p>
            <p className="text-[12.5px] text-text-muted mt-3 leading-relaxed">
              Publish this alongside any specific path. "Only three hops from the minister" describes the
              network's density, not the strength of a relationship — in a graph this connected, short paths
              are the norm.
            </p>
          </div>
        </div>
      </Section>

      <Section title="The graph" note="Filter by tier, family and relationship. Click any node for its provenance and sources.">
        <GraphExplorer nodes={NODES} edges={EDGES} height={680} />
      </Section>

      <Section title="Geographic footprint" note="Where the entities in this subgraph are registered">
        <IndiaMap
          data={mapData}
          marks={marks}
          metricLabel="Atlas entities"
          unit="entities"
          scaleMode="linear"
          height={520}
          format={(v) => String(Math.round(v))}
        />
        <p className="text-[13px] text-text-muted mt-3 max-w-[70ch]">
          Heavily weighted to Delhi, because ministries and central agencies are registered there. That is an
          artefact of where the Union government sits, not a finding about Delhi.{' '}
          {Object.keys(mapData).length} of 36 states and UTs appear at all.
        </p>
      </Section>

      {issues.length > 0 && (
        <Section title="Integrity report" note="Run live against the loaded subgraph on every page load">
          <ul className="space-y-1.5">
            {issues.slice(0, 30).map((i, k) => (
              <li key={k} className={`text-[13px] font-mono ${i.level === 'error' ? 'text-rose' : 'text-amber'}`}>
                [{i.level}] {i.where} — {i.message}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="What is still open" note="The dated, checkable watchlist">
        <Prose>
          <ul className="space-y-3 list-none pl-0">
            {[
              ['FY2025-26 electoral-trust and party contribution filings', 'Due roughly Nov 2026 – Feb 2027. The first post-bond full-year picture of trust routing.'],
              ['The ₹500 cr Elevated Avenue donation', 'Reconcile against the donor’s Companies Act s.182 line in its audited accounts. This is the specific test that would close the trust-route chain.'],
              ['ECI alphanumeric bond file', 'Purchaser-to-party matching for the Rungta purchases. Public data; the match has not been published.'],
              ['PPPAC minutes, 13 May 2022', 'The wording of the FCI anti-monopoly clause removal, and who argued for it. RTI-shaped.'],
              ['PM CARES FY24/FY25 statements', 'Accounts have been dark since FY23. RTI-shaped.'],
              ['Coal India and mining-PSU CSR destinations 2019–24', 'The direct analogue of the ONGC finding, inside the relevant ministry. Public reports; nobody has run it. The most answerable item on this list.'],
              ['R. P. Gupta’s post-termination destination', 'Where the terminated official went next.'],
            ].map(([t, b]) => (
              <li key={t} className="border-l-2 border-accent/40 pl-3">
                <strong className="text-text block mb-0.5">{t}</strong>
                <span className="text-[14.5px]">{b}</span>
              </li>
            ))}
          </ul>
        </Prose>
      </Section>

      <Footnote>
        <p>
          <strong>Method.</strong> Built to a graph-engineering discipline: the graph is durable,
          provenance-bearing shared memory. Every edge is a sourced claim with an evidence tier; facts are
          superseded rather than deleted; denials are first-class <code>contra</code> edges; entities are
          resolved to canonical nodes with aliases; and the grounding layer ties every claim to evidence or
          marks it as inference. The provenance invariant — every edge carries sources, or is tier alleged
          or analytic — is enforced in CI, not by author care.
        </p>
        <p>
          <strong>States referenced:</strong>{' '}
          {[...new Set(NODES.map((n) => n.st).filter(Boolean))].map((s) => STATE_NAMES[s as string]).join(' · ')}
        </p>
        <p>
          <strong>Standing.</strong> Everything here concerns published allegations about the conduct of
          public offices, and is a matter of legitimate public interest. Nothing asserts that any named
          person has committed an offence. Allegations are identified as allegations, attributed, and paired
          with the response of those they concern.
        </p>
      </Footnote>
    </article>
  );
}
