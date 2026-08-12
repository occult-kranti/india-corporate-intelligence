import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Kicker, PageTitle, Standfirst, Byline, Section, Callout, StatGrid, DataTable,
  Prose, Footnote, TierChip,
} from '../components/Editorial';
import GraphExplorer from '../components/viz/GraphExplorer';
import {
  allocationWinners, allocationGraph, crossRegisterBaseRate, REGISTER_META,
  type RegisterId,
} from '../data/allocation';

/**
 * The allocation graph.
 *
 * Four registers, run by four different bodies under different statutes, joined on
 * the one field they share: the winner's name. That join is the finding AND the
 * weakness, and the page leads with the weakness because the reader cannot evaluate
 * the finding without it.
 */
export default function Allocation() {
  const [params, setParams] = useSearchParams();
  const minRegisters = Number(params.get('min') ?? 2);

  const winners = useMemo(() => allocationWinners(), []);
  const base = useMemo(() => crossRegisterBaseRate(), []);
  const graph = useMemo(() => allocationGraph({ minRegisters }), [minRegisters]);
  const [showAll, setShowAll] = useState(false);

  const multi = winners.filter((w) => w.registers.length >= 2);
  const shown = showAll ? winners : multi;

  const setMin = (n: number) => {
    const next = new URLSearchParams(params);
    if (n === 2) next.delete('min');
    else next.set('min', String(n));
    setParams(next, { replace: true });
  };

  return (
    <div className="max-w-[1180px]">
      <Kicker>Allocation · cross-register network</Kicker>
      <PageTitle>The same company, in more than one queue</PageTitle>
      <Standfirst>
        Coal blocks, mineral concessions, hydrocarbon acreage and government contracts are
        allocated by four different bodies under different statutes, and nothing joins them.
        This graph joins them on the only field they share — the winner's name — which is both
        the reason it can be built and the reason every edge on it is tier analytic.
      </Standfirst>
      <Byline>
        {base.winners} distinct winners across four registers · {base.inTwoPlus} appear in more
        than one · {base.withCin} carry a CIN anywhere
      </Byline>

      <Section title="Read the base rate before the names" note="The number that decides what an overlap means">
        <StatGrid
          items={[
            { value: String(base.winners), label: 'distinct winners across all four registers' },
            {
              value: `${base.ratePct.toFixed(1)}%`,
              label: `appear in two or more registers (${base.inTwoPlus} of ${base.winners})`,
              tone: 'accent',
            },
            { value: String(base.inThreePlus), label: 'appear in three or more' },
            {
              value: `${base.withCin}/${base.winners}`,
              label: 'carry a CIN in any register',
              tone: 'rose',
            },
          ]}
        />

        <Callout label="What this graph is, and why every edge on it is analytic" tone="warn">
          The platform's entity-resolution rule is that entities join on CIN or DIN and{' '}
          <strong className="text-text">never on a name</strong>. This page breaks that rule
          deliberately and says so, because there is no alternative: 60 of 126 coal rows carry no
          CIN, the mineral register prints winners as free text, and DGH publishes operator names
          without identifiers. Name normalisation is the only join available.
          <br />
          <br />
          The errors run in <strong className="text-text">both directions</strong>. Two genuinely
          distinct companies sharing a normalised name become one node — "Adani New Industries
          Limited" exists twice with different CINs. And one company printed differently across
          registers stays two nodes, which means{' '}
          <strong className="text-text">
            a group bidding through separately-named subsidiaries is invisible here
          </strong>
          . That second error is the larger one, so {base.inTwoPlus} is a floor on cross-register
          appearance, not a measurement of it.
        </Callout>

        <div className="mt-5">
          <Callout label="The innocent reading, which explains most of this list" tone="bottomline">
            Winning lots in two allocation processes is what a vertically integrated industrial
            firm <em>is</em>. A cement company holding a limestone concession and a coal block is
            describing its own supply chain — limestone is the input, coal fires the kiln. A steel
            company holding iron ore and coking coal is doing the same thing. Several of the
            three-register names below are cement and steel producers, and for them the overlap
            carries no information at all beyond what industry they are in.
            <br />
            <br />
            <strong className="text-text">
              What would make an overlap interesting is an entity with no operational reason for
              the second register
            </strong>{' '}
            — and establishing that requires knowing what the company does, which is a separate
            piece of work this page does not do.
          </Callout>
        </div>
      </Section>

      <Section
        title="The network"
        note="Four awarding bodies, and the winners attached to more than one of them"
      >
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted">
            show winners in
          </span>
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              onClick={() => setMin(n)}
              className={`font-mono text-[11px] px-2.5 py-1 rounded border transition-colors ${
                minRegisters === n
                  ? 'border-accent text-accent'
                  : 'border-border text-text-muted hover:border-border-light'
              }`}
            >
              {n === 1 ? 'every register' : `${n}+ registers`}
              <span className="text-text-muted ml-1.5">
                {winners.filter((w) => w.registers.length >= n).length}
              </span>
            </button>
          ))}
          {minRegisters === 1 && (
            <span className="font-mono text-[10px] text-amber">
              all {base.winners} winners — dense; use the focus control
            </span>
          )}
        </div>

        <GraphExplorer nodes={graph.nodes} edges={graph.edges} height={560} />
      </Section>

      <Section
        title={`The ${multi.length} winners in more than one register`}
        note="Every one, with the lots it took where — and its CIN, or the absence of one"
      >
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => setShowAll((s) => !s)}
            className="font-mono text-[11px] px-2.5 py-1 rounded border border-border text-text-muted hover:border-border-light hover:text-accent"
          >
            {showAll ? `show only the ${multi.length} multi-register winners` : `show all ${winners.length} winners`}
          </button>
          <span className="font-mono text-[10.5px] text-text-muted">
            {shown.length} rows · the single-register tail is the denominator, not filler
          </span>
        </div>

        <DataTable
          columns={['Winner', 'Registers', 'Coal', 'Minerals', 'Hydro', 'Contracts', 'CIN', 'Tier']}
          rows={shown.slice(0, 320).map((w) => [
            <span key="n">
              <strong className="text-text">{w.name}</strong>
            </span>,
            <span key="r" className="font-mono text-[10.5px]">
              <span className={w.registers.length >= 3 ? 'text-accent' : 'text-text-muted'}>
                {w.registers.length}
              </span>
              <span className="block text-[9.5px] text-text-muted mt-0.5">
                {w.registers.map((r) => REGISTER_META[r as RegisterId].label.split(' ')[0]).join(' · ')}
              </span>
            </span>,
            ...(['coal', 'minerals', 'hydrocarbons', 'awards'] as RegisterId[]).map((r) => (
              <span
                key={r}
                className={`font-mono text-[11.5px] tabular-nums ${w.lots[r] ? 'text-text' : 'text-text-muted/30'}`}
              >
                {w.lots[r] || '—'}
              </span>
            )),
            <span
              key="c"
              className={`font-mono text-[10px] ${w.cin ? 'text-text-muted' : 'text-amber'}`}
            >
              {w.cin ?? 'none published'}
            </span>,
            <TierChip key="t" tier="analytic" />,
          ])}
        />
      </Section>

      <Section title="What this does and does not support" note="Written before the reader draws their own conclusion">
        <Prose>
          <p>
            <strong>It supports:</strong> the observation that {base.inTwoPlus} of {base.winners}{' '}
            name-normalised winners appear in more than one allocation register, and{' '}
            {base.inThreePlus} in three or more. It supports the observation that only{' '}
            {base.withCin} of {base.winners} carry a company identifier anywhere in the four
            registers combined.
          </p>
          <p>
            <strong>It does not support</strong> any claim that a particular company was favoured,
            coordinated with anyone, or received anything improperly. Every edge here is a name
            match between two public result documents. The overlap has an ordinary industrial
            explanation for most of the names on it, and this page cannot distinguish the names
            where that explanation fails from the names where it holds.
          </p>
          <p>
            <strong>The most useful thing on the page is the CIN column.</strong> An allocation
            network that cannot resolve its own nodes is a network whose shape is partly an
            artefact of spelling. Publishing a CIN against each winner — a single column in
            documents that already exist — would convert this from an analytic sketch into a
            documented graph, and would settle the shell-layering question that{' '}
            <Link to="/capture" className="underline underline-offset-2">
              capture pathways
            </Link>{' '}
            currently reports as untestable.
          </p>
        </Prose>
      </Section>

      <Footnote>
        <p>
          <strong>Standing.</strong> Every node and edge on this page is derived at build time
          from four published registers. No edge is tiered above <em>analytic</em>, no node
          without a CIN is treated as resolved, and nothing here asserts intent, coordination or
          wrongdoing by any named company.{' '}
          <Link to="/resources" className="underline underline-offset-2">
            The resource registers
          </Link>{' '}
          ·{' '}
          <Link to="/tenders" className="underline underline-offset-2">
            The awards register
          </Link>{' '}
          ·{' '}
          <Link to="/patterns" className="underline underline-offset-2">
            Why the discipline exists
          </Link>
        </p>
      </Footnote>
    </div>
  );
}
