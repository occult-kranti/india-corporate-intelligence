import { useCallback, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Kicker, PageTitle, Standfirst, Byline, Section, Callout, StatGrid, DataTable,
  TierChip, Cite, Prose, Footnote,
} from '../components/Editorial';
import IndiaMap from '../components/viz/IndiaMap';
import GeoNetwork, { type GeoFilter } from '../components/viz/GeoNetwork';
import { ConcentrationCurve } from '../components/Domain';
import {
  CENTRE, STATES_TENDERS, ALL_AWARDS, TENDERS_AS_OF, bidderCoverage, valueCoverage,
  winnerTally, sectorTally, transparencyScore, TRANSPARENCY_LABEL, COVERAGE_BY_STATE,
  competitionEvidence, disclosureBySector,
  type Award,
} from '../data/tenders';
import { STATES, STATE_NAMES } from '../data/geo';
import { TIER_ORDER } from '../graph/schema';
import type { GNode, GEdge, StateCode, NodeFamily } from '../graph/schema';

type Scope = 'centre' | 'states' | 'both';
type View = 'ledger' | 'map' | 'graph';

const fmtCr = (v: number | null) =>
  v == null ? '—' : v >= 100000 ? `₹${(v / 100000).toFixed(2)}L cr` : `₹${Math.round(v).toLocaleString('en-IN')} cr`;

/**
 * Government awards — the ledger, the transparency map, and the award network.
 *
 * The page leads with bidder-count coverage rather than with who won most, because
 * every concentration claim depends on it and the coverage is poor: 16 of 88
 * centrally, and zero of 37 at state level. A ranked list of winners without that
 * context is the exact artefact this platform exists not to produce.
 */
export default function Tenders() {
  const [params, setParams] = useSearchParams();
  const setParam = useCallback(
    (k: string, v: string | null) => {
      const next = new URLSearchParams(params);
      if (v == null || v === '') next.delete(k);
      else next.set(k, v);
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  const scope = (params.get('scope') ?? 'both') as Scope;
  const view = (params.get('view') ?? 'ledger') as View;
  const sector = params.get('sector') ?? 'all';
  const query = params.get('q') ?? '';
  const [selected, setSelected] = useState<string | null>(null);

  const scoped = useMemo(
    () => (scope === 'centre' ? CENTRE.awards : scope === 'states' ? STATES_TENDERS.awards : ALL_AWARDS),
    [scope],
  );

  const awards = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scoped.filter(
      (a) =>
        (sector === 'all' || a.sector === sector) &&
        (!q || `${a.winner} ${a.what} ${a.awardingBody} ${a.sector}`.toLowerCase().includes(q)),
    );
  }, [scoped, sector, query]);

  const bidders = bidderCoverage(awards);
  const values = valueCoverage(awards);
  const winners = useMemo(() => winnerTally(awards), [awards]);
  const sectors = useMemo(() => sectorTally(scoped), [scoped]);

  // Competitive tension — all derived, never literal, so the prose below cannot
  // drift from the register when a row is added.
  const evidence = useMemo(() => competitionEvidence(scoped), [scoped]);
  const disclosure = useMemo(() => disclosureBySector(scoped), [scoped]);
  const fullDisclosure = useMemo(
    () => disclosure.filter((d) => d.total >= 3 && d.soleKnown === d.total),
    [disclosure],
  );
  const zeroDisclosure = useMemo(
    () => disclosure.filter((d) => d.total >= 3 && d.soleKnown === 0),
    [disclosure],
  );
  const valueCov = useMemo(() => valueCoverage(scoped), [scoped]);
  const winnerValues = useMemo(
    () => winnerTally(scoped.filter((a) => a.valueCr != null)).map((w) => w.valueCr),
    [scoped],
  );

  /** Transparency choropleth — what each state publishes, not what it awarded. */
  const transparencyData = useMemo(() => {
    const d: Partial<Record<StateCode, { value: number | null; detail?: string }>> = {};
    for (const s of STATES) {
      const score = transparencyScore(s.id);
      if (score == null) continue;
      d[s.id] = { value: score, detail: TRANSPARENCY_LABEL[score] };
    }
    return d;
  }, []);

  /** Award-count choropleth for state awards. */
  const awardData = useMemo(() => {
    const d: Partial<Record<StateCode, { value: number | null; detail?: string }>> = {};
    for (const r of STATES_TENDERS.byState) {
      d[r.stateCode] = { value: r.awardCount, detail: `${r.distinctWinners ?? '?'} distinct winners` };
    }
    return d;
  }, []);

  /** The award network: awarding body → winner, as a geographic graph. */
  const graph = useMemo((): { nodes: GNode[]; edges: GEdge[] } => {
    const nodes = new Map<string, GNode>();
    const edges: GEdge[] = [];
    const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60);

    for (const a of awards) {
      const bodyId = `body:${slug(a.ministry ?? a.awardingBody)}`;
      const winId = `win:${slug(a.winner)}`;
      if (!nodes.has(bodyId)) {
        nodes.set(bodyId, {
          id: bodyId,
          label: a.ministry ?? a.awardingBody,
          sub: a.stateCode ? `state body · ${STATE_NAMES[a.stateCode]}` : 'union ministry',
          ty: a.stateCode ? 'agency' : 'ministry',
          fam: 'state' as NodeFamily,
          st: a.stateCode ?? 'dl',
          sz: 3,
          resolved: true,
          srcs: a.srcs,
        });
      }
      if (!nodes.has(winId)) {
        nodes.set(winId, {
          id: winId,
          label: a.winner,
          sub: a.winnerNse ? `NSE ${a.winnerNse}` : a.winnerGroup ?? 'winner',
          ty: 'company',
          fam: 'capital' as NodeFamily,
          st: a.stateCode ?? null,
          sz: 2,
          resolved: true,
          srcs: a.srcs,
        });
      }
      edges.push({
        s: bodyId,
        t: winId,
        pred: 'award',
        tier: a.tier,
        a: a.valueCr ?? 0,
        lab: a.processType,
        from: a.awardDate ?? undefined,
        d: `${a.what}${a.bidders != null ? ` · ${a.bidders} bidders` : ' · bidder count not published'}`,
        srcs: a.srcs,
      });
    }
    return { nodes: [...nodes.values()], edges };
  }, [awards]);

  const geoFilter: GeoFilter = useMemo(
    () => ({
      tiers: new Set(TIER_ORDER),
      families: new Set<NodeFamily>(['state', 'capital']),
      preds: new Set<string>(),
      query: '',
    }),
    [],
  );

  const noPortal = STATES_TENDERS.coverage.filter((c) => !c.portalFound).length;
  const machineReadable = STATES_TENDERS.coverage.filter((c) => c.machineReadable).length;

  return (
    <article className="pb-20">
      <header className="pt-2 pb-6 border-b-2 border-border-light">
        <Kicker>Government awards · who won what, by which process</Kicker>
        <PageTitle>The procurement register, and what it cannot tell you</PageTitle>
        <Standfirst>
          {CENTRE.awards.length} central awards across seven ministries and{' '}
          {STATES_TENDERS.awards.length} state awards across eleven states. The most
          important number on this page is not who won most — it is how many awards
          disclose how many parties competed, because without that a ranked list of
          winners measures nothing.
        </Standfirst>
        <Byline>
          As of {TENDERS_AS_OF} · every award carries a source · no causal language anywhere
          in this dataset
        </Byline>
      </header>

      <StatGrid
        items={[
          { value: `${bidders.withCount}/${bidders.total}`, label: `awards disclosing a bidder count (${bidders.pct.toFixed(0)}%)`, tone: bidders.pct < 25 ? 'rose' : 'muted' },
          { value: `${values.withValue}/${values.total}`, label: 'awards with a sourced rupee value', tone: 'muted' },
          { value: `${machineReadable}/${STATES_TENDERS.coverage.length}`, label: 'states publishing machine-readable procurement data', tone: 'rose' },
          { value: String(winners.length), label: 'distinct winners in view' },
        ]}
      />

      <Callout label="What this register can and cannot support" tone="bottomline">
        <p>
          <strong>It can tell you who won what, when, and by which process.</strong> Every
          row is sourced and tiered.
        </p>
        <p>
          <strong>It cannot, on its own, tell you whether any of that is unusual.</strong>{' '}
          A sole-bidder award and a twelve-bidder award are identical in a table and
          completely different facts. Centrally, {bidderCoverage(CENTRE.awards).withCount} of{' '}
          {CENTRE.awards.length} awards publish a bidder count. At state level it is{' '}
          <strong>zero of {STATES_TENDERS.awards.length}</strong> — every state award here
          was reconstructed from the winner's own disclosures, never from the awarding state.
        </p>
        <p>
          So the state view below is a <strong>coverage map</strong>, not a concentration
          analysis. Anything stronger would assert structure the data cannot carry.
        </p>
      </Callout>

      {/* ---- controls ---- */}
      <div className="flex flex-wrap gap-4 mt-8 mb-5">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mb-1.5">View</p>
          <div className="flex gap-1.5">
            {(['ledger', 'map', 'graph'] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setParam('view', v)}
                className={`font-mono text-[11px] px-2.5 py-1.5 rounded border transition-colors ${
                  view === v ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-muted hover:text-text'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mb-1.5">Scope</p>
          <div className="flex gap-1.5">
            {(['both', 'centre', 'states'] as Scope[]).map((s) => (
              <button
                key={s}
                onClick={() => setParam('scope', s)}
                className={`font-mono text-[11px] px-2.5 py-1.5 rounded border transition-colors ${
                  scope === s ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-muted hover:text-text'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mb-1.5">Sector</p>
          <select value={sector} onChange={(e) => setParam('sector', e.target.value)} className="input-field !py-1.5 !text-[12px] !w-auto">
            <option value="all">All sectors</option>
            {sectors.map((s) => (
              <option key={s.sector} value={s.sector}>
                {s.sector} ({s.count})
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[12rem]">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mb-1.5">Search</p>
          <input value={query} onChange={(e) => setParam('q', e.target.value)} placeholder="winner, project, body…" className="input-field !py-1.5 !text-[12px]" />
        </div>
      </div>

      {/* ---- LEDGER ---- */}
      {view === 'ledger' && (
        <>
          <Section title={`${awards.length} awards`} note="Every row carries its process type, its bidder count where published, and its source">
            <DataTable
              columns={['What', 'Winner', 'Awarding body', 'Value', 'Bidders', 'Process', 'Tier']}
              rows={awards.map((a: Award) => [
                <span key="w">
                  <span className="text-text">{a.what.slice(0, 120)}{a.what.length > 120 ? '…' : ''}</span>
                  <span className="block font-mono text-[10.5px] text-text-muted mt-0.5">
                    {a.awardDate ?? 'date not published'} · {a.sector}
                    {a.stateCode ? ` · ${STATE_NAMES[a.stateCode]}` : ' · centre'}
                  </span>
                </span>,
                <span key="n">
                  <strong className="text-text">{a.winner}</strong>
                  {a.winnerNse && <span className="font-mono text-[10.5px] text-accent ml-1.5">{a.winnerNse}</span>}
                </span>,
                <span key="b" className="text-[12.5px]">{a.ministry ?? a.awardingBody}</span>,
                <span key="v" className="font-mono text-[11.5px] whitespace-nowrap">{fmtCr(a.valueCr)}</span>,
                <span key="bd" className={`font-mono text-[11.5px] ${a.bidders == null ? 'text-amber' : ''}`}>
                  {a.bidders ?? 'not published'}
                </span>,
                <span key="p" className="font-mono text-[10.5px] uppercase tracking-wider text-text-muted">{a.processType}</span>,
                <TierChip key="t" tier={a.tier} />,
              ])}
            />
          </Section>

          <Section title="Winners by award count" note="A count, not a claim. Read it against the concentration notes below.">
            <div className="space-y-2">
              {winners.slice(0, 14).map((w) => (
                <div key={w.winner} className="flex items-center gap-3">
                  <span className="text-[13px] w-56 truncate text-text-secondary">{w.winner}</span>
                  <span className="h-3.5 bg-accent/50 rounded-sm" style={{ width: `${(w.count / winners[0].count) * 45}%` }} />
                  <span className="font-mono text-[11px] text-text-muted">{w.count}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section
            title="Competitive tension, and why it cannot be measured here"
            note="The one statistic that would settle most questions about an award — and the register that refuses to publish it"
          >
            <Prose>
              <p>
                One number decides whether an auction was an auction: <strong>how many bidders
                showed up</strong>. It is neutral — a low count is as consistent with an
                unattractive asset, a heavy capex threshold or a narrow qualified-bidder pool as
                with anything else — which is exactly why it can be published without a caveat
                wrapped around it, unlike any score attached to a company.
              </p>
              <p>
                Across {evidence.total} awards in this register, a bid count is published for{' '}
                <strong className="text-text">{evidence.bidderKnown}</strong>. Bid <em>position</em>{' '}
                — whether the winner was the only bidder — is recoverable for{' '}
                <strong className="text-text">{evidence.soleKnown}</strong>. So the sole-bidder rate
                that ought to lead this page does not exist, and the honest thing is to say so
                rather than compute it on the fraction that happens to be visible.
              </p>
            </Prose>

            <div className="mt-5">
              <Callout label="The missingness is not random, and its direction is known" tone="warn">
                Disclosure tracks whether a regulator publishes a round-result document.{' '}
                {fullDisclosure.length > 0 && (
                  <>
                    {fullDisclosure.map((d) => d.sector).join(', ')} disclose bid position for every
                    award recorded here.{' '}
                  </>
                )}
                {zeroDisclosure.length > 0 && (
                  <>
                    <strong className="text-text">
                      {zeroDisclosure.map((d) => `${d.sector} (${d.total} awards)`).join(', ')}
                    </strong>{' '}
                    {zeroDisclosure.length === 1 ? 'discloses' : 'disclose'} it for none.
                  </>
                )}{' '}
                A round that drew one bidder has every reason not to advertise it, and the sectors
                with the worst disclosure are among the largest. That makes{' '}
                {evidence.soleRateAmongKnown != null && (
                  <>
                    the {(evidence.soleRateAmongKnown * 100).toFixed(0)}% sole-bidder rate among the{' '}
                    {evidence.soleKnown} disclosed awards{' '}
                  </>
                )}
                a <strong className="text-text">floor on competition, not a measurement of it</strong>.
                The bias has a known sign and an unknown size.
              </Callout>
            </div>

            <div className="mt-5">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-text-muted mb-3">
                bid-position disclosure by sector
              </p>
              <div className="space-y-1.5">
                {disclosure.map((d) => {
                  const pct = d.total ? d.soleKnown / d.total : 0;
                  return (
                    <div key={d.sector} className="flex items-center gap-3 text-[12.5px]">
                      <span className="w-52 shrink-0 truncate text-text-secondary" title={d.sector}>
                        {d.sector}
                      </span>
                      <span className="flex-1 h-3 bg-bg-elevated rounded-sm overflow-hidden max-w-[220px]">
                        <span
                          className={`block h-full ${pct === 0 ? 'bg-rose/60' : pct === 1 ? 'bg-sage/60' : 'bg-amber/60'}`}
                          style={{ width: `${pct * 100}%` }}
                        />
                      </span>
                      <span className="font-mono text-[11px] text-text-muted tabular-nums">
                        {d.soleKnown}/{d.total}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-text-muted mb-2">
                concentration of awarded value
              </p>
              {valueCov.withValue >= 5 ? (
                <>
                  <ConcentrationCurve values={winnerValues} label="awarded value" />
                  <p className="text-[13px] text-text-muted mt-2 max-w-[72ch] leading-relaxed">
                    Computed over the {valueCov.withValue} of {valueCov.total} awards that carry a
                    rupee value. The rest are auctions whose bid parameter was a revenue-share
                    percentage or a per-passenger fee, for which no rupee value exists to take a
                    share of — they are absent from this curve, not zero in it.
                  </p>
                </>
              ) : (
                <p className="text-[13.5px] text-amber">
                  Not drawn — only {valueCov.withValue} of {valueCov.total} awards in this scope
                  carry a rupee value, which is too few for a concentration curve to mean anything.
                </p>
              )}
            </div>
          </Section>

          <Section title="Concentration, with denominators" note="Each entry states what the share is OF">
            <div className="space-y-4">
              {CENTRE.concentration.map((c, i) => (
                <div key={i} className="border-l-2 border-accent/40 pl-3">
                  <p className="font-medium text-[15px]">
                    {c.sector} — {c.topWinner}
                  </p>
                  <p className="text-[13.5px] text-text-secondary mt-1 max-w-[70ch] leading-relaxed">
                    <strong className="text-text">Of:</strong> {c.denominator}
                  </p>
                  {c.note && <p className="text-[13px] text-text-muted mt-1 max-w-[70ch] leading-relaxed">{c.note}</p>}
                  <Cite srcs={c.srcs} />
                </div>
              ))}
            </div>
          </Section>

          <Section title="Base rates" note="Including the one this dataset deliberately does not compute">
            <div className="space-y-4">
              {[...CENTRE.baseRates, ...STATES_TENDERS.baseRates].map((b, i) => (
                <div key={i} className="border-l-2 border-border-light pl-3">
                  <p className="font-medium text-[14.5px]">“{b.claim}”</p>
                  <p className="text-[13.5px] text-text-muted mt-1 max-w-[70ch] leading-relaxed">{b.reading}</p>
                  <p className="font-mono text-[10.5px] text-text-muted mt-1">
                    {b.rate == null
                      ? 'rate not computed'
                      : `${(b.rate * 100).toFixed(1)}% — ${b.numerator} of ${b.denominator}`}{' '}
                    · {b.denominatorLabel}
                  </p>
                  <Cite srcs={b.srcs} />
                </div>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ---- MAP ---- */}
      {view === 'map' && (
        <>
          <Section
            title="What each state publishes"
            note="The transparency map — this shades by disclosure, not by activity"
          >
            <div className="card-surface !p-4">
              {/*
                A two-colour categorical scale, not a sequential ramp. The measure has
                three classes but only two occur — no state reaches machine-readable —
                so a three-step ramp would render a class that does not exist and flatten
                the two that do.
              */}
              <IndiaMap
                data={transparencyData}
                metricLabel="What the state publishes"
                unit=""
                scaleMode="linear"
                ramp={['#c45b5a', '#d4a03d']}
                showMarks={false}
                height={560}
                format={(v) => TRANSPARENCY_LABEL[Math.round(v)] ?? String(v)}
              />
              <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-2 text-[11px] text-text-muted">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-4 h-2.5 rounded-sm" style={{ background: '#d4a03d' }} />
                  portal found, web UI only ({STATES_TENDERS.coverage.filter((c) => c.portalFound).length})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-4 h-2.5 rounded-sm" style={{ background: '#c45b5a' }} />
                  not reachable — could not check ({noPortal})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-4 h-2.5 rounded-sm border border-border" style={{ background: 'transparent' }} />
                  machine-readable (<strong className="text-rose">0</strong>) — the class exists in the
                  scale and is empty in the data
                </span>
                <span className="italic">hatched = outside the 13-state survey scope, not measured</span>
              </div>
            </div>
            <Callout label="Zero states publish machine-readable procurement data" tone="warn">
              <p>
                Eight state portals were reached and every one runs the same NIC GePNIC
                build: tender-by-tender web UI, an MIS-report link, no API, no bulk export.{' '}
                {noPortal} more could not be reached at all and are recorded as{' '}
                <strong>could not check</strong> — never as "no portal", which would be an
                absence claim the survey cannot make.
              </p>
              <p>
                Telangana and West Bengal show zero awards below, and that is a{' '}
                <strong>disclosure fact rather than an activity fact</strong>: Telangana
                announces allotments to "70 companies" without naming one, and WBIDC
                publishes application counts rather than allottees.
              </p>
            </Callout>
          </Section>

          <Section title="State awards recovered" note="Reconstructed from winners' disclosures — this is not what states awarded, it is what could be found">
            <div className="card-surface !p-4">
              <IndiaMap
                data={awardData}
                metricLabel="Awards recovered"
                unit="awards"
                scaleMode="linear"
                showMarks={false}
                height={520}
                format={(v) => String(Math.round(v))}
              />
            </div>
            <DataTable
              columns={['State', 'Awards', 'Distinct winners', 'Portal', 'Note']}
              rows={STATES_TENDERS.byState.map((r) => {
                const cov = COVERAGE_BY_STATE.get(r.stateCode);
                return [
                  <Link key="s" to={`/states/${r.stateCode}`} className="text-text hover:text-accent">
                    {r.state}
                  </Link>,
                  String(r.awardCount),
                  String(r.distinctWinners ?? '—'),
                  <span key="p" className={`font-mono text-[10.5px] ${cov?.portalFound ? 'text-text-muted' : 'text-amber'}`}>
                    {cov ? (cov.machineReadable ? 'machine-readable' : cov.portalFound ? 'web UI only' : 'not reachable') : '—'}
                  </span>,
                  <span key="n" className="text-[12px] text-text-muted">{r.note.slice(0, 160)}{r.note.length > 160 ? '…' : ''}</span>,
                ];
              })}
            />
          </Section>
        </>
      )}

      {/* ---- GRAPH ---- */}
      {view === 'graph' && (
        <Section
          title="The award network"
          note="Awarding bodies to winners, drawn in place. Edge thickness is value where published."
        >
          <div className="card-surface !p-3 overflow-hidden">
            <GeoNetwork
              nodes={graph.nodes}
              edges={graph.edges}
              filter={geoFilter}
              mode="entities"
              selected={selected}
              onSelect={setSelected}
              height={720}
            />
          </div>
          <Callout label="Why this graph is not a concentration analysis" tone="warn">
            <p>
              A ministry that awards many contracts is a hub by construction, and this
              graph would show that regardless of how competitive each award was. With{' '}
              {bidders.withCount} of {bidders.total} awards disclosing a bidder count, the
              structure here cannot be scored against a null model in any meaningful way.
            </p>
            <p>
              Read it as a map of <em>who deals with whom</em>, and take the concentration
              question to the denominators in the ledger view — where the airports entry
              (6 of 6, against 32 bids from 10 companies) and the coal entry (top winner
              at 9 of 125 across 91 winners) point in opposite directions.
            </p>
          </Callout>
        </Section>
      )}

      <Section title="Published gaps" note="Sectors and sources that are missing, named rather than omitted">
        <Prose>
          <ul className="space-y-2 list-none pl-0">
            {[...CENTRE.gaps, ...STATES_TENDERS.gaps].slice(0, 24).map((g, i) => (
              <li key={i} className="border-l-2 border-amber/40 pl-3 text-[13.5px] text-text-muted leading-relaxed">
                {g}
              </li>
            ))}
          </ul>
        </Prose>
      </Section>

      <Footnote>
        <p>
          <strong>Standing.</strong> This register records who won what, when, and by which
          process. It does not assert why, and contains no causal language. An award is not
          evidence of anything on its own — most large listed companies hold government
          contracts, and the share that do is recorded on this page as{' '}
          <strong>not measured</strong>, with the specific sources that would settle it,
          rather than estimated.
        </p>
        <p>
          <strong>Coverage.</strong> The central register is assembled from ten priority
          sectors and is not a census; ports, railways and FCI silos have no rows and are
          listed as gaps. The state register covers eleven of thirteen states in scope, and
          the two zeros are disclosure facts rather than activity facts.{' '}
          <Link to="/patterns" className="underline underline-offset-2">
            Why the denominator comes first
          </Link>
          .
        </p>
      </Footnote>
    </article>
  );
}
