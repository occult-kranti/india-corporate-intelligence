import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Kicker, PageTitle, Standfirst, Byline, Section, Callout, StatGrid, DataTable, TierChip, Cite, Footnote } from '../components/Editorial';
import FlowSankey from '../components/viz/FlowSankey';
import { NODES, EDGES } from '../graph/data';
import { BASE_RATES } from '../graph/baseRates';
import type { GEdge, Predicate } from '../graph/schema';

/**
 * Retained political-money claims and explicit collection-coverage limits.
 * Exact source-scope holds are excluded from the displayed money graph.
 */

const MONEY_PREDS: Predicate[] = ['bond', 'trust', 'direct', 'pmin', 'pmout', 'csr'];

const PRED_LABEL: Record<string, string> = {
  bond: 'Electoral bond',
  trust: 'Electoral trust',
  direct: 'Direct donation',
  pmin: 'Into a fund',
  pmout: 'Out of a fund',
  csr: 'CSR disbursement',
};

export default function PoliticalView() {
  const [pred, setPred] = useState<Predicate | 'all'>('all');
  const [picked, setPicked] = useState<GEdge[] | null>(null);

  const byId = useMemo(() => new Map(NODES.map((n) => [n.id, n])), []);

  const flows = useMemo(
    () =>
      EDGES.filter((e) => MONEY_PREDS.includes(e.pred))
        .filter((e) => pred === 'all' || e.pred === pred)
        .sort((a, b) => (b.a ?? 0) - (a.a ?? 0)),
    [pred],
  );

  const totals = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of EDGES.filter((x) => MONEY_PREDS.includes(x.pred))) {
      m.set(e.pred, (m.get(e.pred) ?? 0) + (e.a ?? 0));
    }
    return m;
  }, []);

  const totalTraced = [...totals.values()].reduce((a, b) => a + b, 0);
  const sourced = flows.filter((e) => (e.srcs?.length ?? 0) > 0).length;

  // The anti-motif: beneficiaries with awards but no traceable donation edge.
  const beneficiaries = useMemo(() => {
    const awarded = new Set(EDGES.filter((e) => e.pred === 'award').map((e) => e.t));
    const donors = new Set(EDGES.filter((e) => ['bond', 'trust', 'direct'].includes(e.pred)).map((e) => e.s));
    return [...awarded]
      .filter((id) => !donors.has(id))
      .map((id) => byId.get(id))
      .filter(Boolean);
  }, [byId]);

  return (
    <article className="pb-20">
      <header className="pt-2 pb-6 border-b-2 border-border-light">
        <Kicker>Money to parties and funds</Kicker>
        <PageTitle>The flows, and what they are worth</PageTitle>
        <Standfirst>
          Retained political-money claims in this graph, with their sources. Missing edges describe
          collection coverage only. They do not establish zero donations or hidden payments.
        </Standfirst>
        <Byline>
          {flows.length} money edges · {sourced} carrying a source URL · figures in ₹ crore as published
        </Byline>
      </header>

      <Callout label="Read this before the numbers" tone="bottomline">
        <p>
          Three of the four edges people most want to draw here are close to universal.{' '}
          <strong>82.45%</strong> of electoral-trust money went to one party in FY2024-25;{' '}
          <strong>every</strong> public-sector undertaking that responded to an RTI had contributed to PM
          CARES; and CSR spending is <strong>compulsory by statute</strong> for qualifying companies.
        </p>
        <p>
          Drawing those edges produces a dense, alarming-looking web — and it would look identical if you
          fed in a random sample of large Indian companies that never won anything.{' '}
          <Link to="/base-rates" className="underline underline-offset-2 text-accent">
            The full arithmetic
          </Link>
          .
        </p>
      </Callout>

      <StatGrid
        items={[
          { value: `₹${Math.round(totalTraced).toLocaleString('en-IN')} cr`, label: 'total traced across all money edges in the case study' },
          { value: String(beneficiaries.length), label: 'award recipients without a displayed donation edge', tone: 'accent' },
          { value: '82.45%', label: 'ruling-party share of electoral-trust money, FY2024-25 — the base rate any donation edge must beat', tone: 'muted' },
          { value: `${sourced}/${flows.length}`, label: 'money edges carrying a source URL', tone: 'sage' },
        ]}
      />

      <Section title="Donation coverage gaps" note="Missing graph links are not findings of donation absence">
        <Callout label="Benefit ≠ payment" tone="warn">
          <p>
            These award recipients have no currently displayed donation edge in this collection.
            This is not a comprehensive donor audit. The Adani zero-donation claim has been held:
            its source reports only a name absence in bond data released in March 2024, not a
            BJP-specific payment relationship or an all-channel donation total.
          </p>
          <p>
            A separate source-scope review also holds the inherited Adani-specific Section 182
            disclosure claim. Its cited report discusses 30 Sensex companies and FY19–FY23;
            it does not establish an Adani FY20–FY25 filing survey, concealment or non-compliance.
          </p>
          <ul className="space-y-1.5 mt-2">
            {beneficiaries.map((n) => (
              <li key={n!.id} className="text-[14px]">
                <strong className="text-text">{n!.label}</strong>
                {n!.sub && <span className="text-text-muted"> — {n!.sub}</span>}
              </li>
            ))}
          </ul>
        </Callout>
      </Section>

      <Section
        title="Flow direction"
        note="Money moving left to right. Left-to-right is flow of funds, not influence — and every band is an aggregate, so click one for its underlying relationships."
      >
        <div className="card-surface !p-3 overflow-hidden">
          {/*
            Money-movement predicates only. Awards are deliberately excluded: a
            contract value is not a transfer from the ministry to the winner, and
            putting a ₹20,000 cr contract on the same thickness scale as a ₹25 cr
            donation would make the donations invisible and imply a transfer that
            never happened. Awards appear in the ledger below instead.
          */}
          <FlowSankey
            nodes={NODES}
            edges={EDGES}
            flowPreds={MONEY_PREDS}
            height={560}
            onSelectFlow={setPicked}
          />
        </div>
        {picked && picked.length > 0 && (
          <div className="card-surface mt-4 p-4">
            <div className="flex items-baseline justify-between gap-4 mb-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted">
                {picked.length} underlying relationship{picked.length === 1 ? '' : 's'} in that band
              </p>
              <button onClick={() => setPicked(null)} className="btn-ghost !py-1 !px-2 !text-[11px]">
                close
              </button>
            </div>
            <ul className="space-y-2.5">
              {picked.map((e, i) => (
                <li key={i} className="text-[13.5px] leading-snug">
                  <span className="flex flex-wrap items-baseline gap-2">
                    <TierChip tier={e.tier} />
                    <strong className="text-text">{byId.get(e.s)?.label ?? e.s}</strong>
                    <span className="text-text-muted">→ {byId.get(e.t)?.label ?? e.t}</span>
                    <span className="text-text-muted">{PRED_LABEL[e.pred] ?? e.pred}</span>
                    {e.a ? <span className="font-mono text-[11.5px] text-accent">₹{e.a.toLocaleString('en-IN')} cr</span> : null}
                  </span>
                  {e.d && <span className="block text-text-muted mt-1">{e.d}</span>}
                  <Cite srcs={e.srcs} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      <Section title="Traced flows" note="Filter by instrument. Every row carries its tier and its source.">
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button
            onClick={() => setPred('all')}
            className={`font-mono text-[11px] px-2.5 py-1.5 rounded border transition-colors ${
              pred === 'all' ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-muted hover:text-text'
            }`}
          >
            All ({EDGES.filter((e) => MONEY_PREDS.includes(e.pred)).length})
          </button>
          {MONEY_PREDS.filter((p) => EDGES.some((e) => e.pred === p)).map((p) => (
            <button
              key={p}
              onClick={() => setPred(p)}
              className={`font-mono text-[11px] px-2.5 py-1.5 rounded border transition-colors ${
                pred === p ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-muted hover:text-text'
              }`}
            >
              {PRED_LABEL[p]} ({EDGES.filter((e) => e.pred === p).length})
            </button>
          ))}
        </div>

        <DataTable
          columns={['From', 'Instrument', 'To', '₹ cr', 'Tier', 'Source']}
          rows={flows.map((e, i) => [
            <strong key="s" className="text-text">
              {byId.get(e.s)?.label ?? e.s}
            </strong>,
            <span key="p" className="text-[12.5px]">
              {PRED_LABEL[e.pred] ?? e.pred}
              {e.lab && <span className="block text-[11.5px] text-text-muted">{e.lab}</span>}
            </span>,
            byId.get(e.t)?.label ?? e.t,
            <span key="a" className="font-mono text-[12px] whitespace-nowrap">
              {e.a ? e.a.toLocaleString('en-IN') : '—'}
            </span>,
            <TierChip key={`t${i}`} tier={e.tier} />,
            e.srcs?.length ? (
              <a key="src" href={e.srcs[0][1]} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 text-[12px]">
                {e.srcs[0][0]}
              </a>
            ) : (
              <span key="src" className="text-[12px] text-text-muted">
                unsourced by design — {e.tier}
              </span>
            ),
          ])}
        />
      </Section>

      <Section title="What each edge type is worth" note="Discriminating power, with published denominators">
        <div className="space-y-4">
          {BASE_RATES.filter((b) => b.id !== 'br-shared-state').map((b) => (
            <div key={b.id} className="border-l-2 border-border-light pl-4">
              <p className="font-medium text-[15px]">“{b.claim}”</p>
              <p className="text-[13.5px] text-text-muted mt-1 max-w-[68ch] leading-relaxed">{b.reading}</p>
              <p className="font-mono text-[10.5px] mt-1.5">
                <span className={b.discrimination === 'high' ? 'text-sage' : b.discrimination === 'moderate' ? 'text-teal' : 'text-text-muted'}>
                  {(b.rate * 100).toFixed(1)}% base rate · {b.discrimination} discriminating power
                </span>
              </p>
              <Cite srcs={b.srcs} />
            </div>
          ))}
        </div>
      </Section>

      <Footnote>
        <p>
          <strong>Coverage.</strong> Donation edges exist only in the case-study subgraph, which covers the
          ministries of one Union minister. There is no platform-wide donations dataset yet — that is a
          coverage gap, and treating this page as a national picture would be a category error.
        </p>
        <p>
          <strong>Standing.</strong> Money flows between corporate entities, parties and funds are recorded
          as published. Nothing here asserts a quid pro quo, and no edge on this page adjudicates one.
        </p>
      </Footnote>
    </article>
  );
}
