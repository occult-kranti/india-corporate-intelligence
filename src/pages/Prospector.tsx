import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Kicker, PageTitle, Standfirst, Byline, Section, Callout, StatGrid, DataTable, Prose, Footnote,
} from '../components/Editorial';
import { useData } from '../context/DataContext';
import { NODES, EDGES } from '../graph/data';
import { buildNationalGraph } from '../graph/build';
import { prospect, SHAPE_META, type ProspectRun, type ShapeResult } from '../graph/prospector';
import type { GNode, GEdge } from '../graph/schema';

/**
 * The prospector.
 *
 * An exhaustive candidate generator. Its output is a survival funnel and a ranked
 * list of QUESTIONS — never findings. The page is built so that the denominator is
 * impossible to read past.
 */

type Layer = 'atlas' | 'capital' | 'all';

const LAYERS: { id: Layer; label: string; note: string }[] = [
  { id: 'atlas', label: 'Case study', note: 'The tiered, sourced subgraph — small enough for the full null ensemble.' },
  { id: 'capital', label: 'Capital', note: 'Conglomerate groups, listed entities, promoters and foreign capital.' },
  { id: 'all', label: 'Everything', note: 'The merged graph. Large shapes skip the rewiring ensemble and say so.' },
];

function Funnel({ run }: { run: ProspectRun }) {
  const steps = [
    { label: 'enumerated', value: run.totalEnumerated, note: 'the declared family' },
    { label: 'survived FDR', value: run.totalSurvived, note: `at q = ${run.q}` },
    { label: 'replicated', value: run.totalReplicated, note: 'in both halves of the split' },
  ];
  const max = Math.max(1, run.totalEnumerated);
  return (
    <div className="space-y-2 my-6">
      {steps.map((s) => (
        <div key={s.label} className="flex items-center gap-3">
          <span className="font-mono text-[11px] w-28 text-text-muted text-right">{s.label}</span>
          <span
            className="h-7 rounded-sm flex items-center px-2"
            style={{
              width: `${Math.max(3.5, (s.value / max) * 62)}%`,
              background: s.label === 'replicated' ? 'var(--color-accent, #c9a86c)' : 'rgba(122,158,126,0.45)',
            }}
          >
            <span className="font-mono text-[12px] text-bg font-semibold">{s.value.toLocaleString('en-IN')}</span>
          </span>
          <span className="font-mono text-[10.5px] text-text-muted">{s.note}</span>
        </div>
      ))}
    </div>
  );
}

function ShapeBlock({ r }: { r: ShapeResult }) {
  const survivalPct = r.enumerated ? (r.replicated / r.enumerated) * 100 : 0;
  return (
    <div className="border border-border rounded-lg p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="font-medium text-[15.5px]">{r.name}</h3>
        <span className="font-mono text-[10.5px] text-text-muted">
          {r.enumerated.toLocaleString('en-IN')} enumerated → {r.survivedFDR} survived → {r.replicated} replicated
          {r.enumerated > 0 && ` (${survivalPct.toFixed(2)}%)`}
        </span>
      </div>
      <p className="text-[13.5px] text-text-muted mt-1 max-w-[72ch]">{r.question}</p>

      <p className="font-mono text-[10.5px] mt-2">
        {r.nullSkipped ? (
          <span className="text-amber">
            shape-level null not computed — {r.enumerated.toLocaleString('en-IN')} candidates × {r.shuffles} rewirings
            exceeds the budget. Reported rather than thinned to a meaningless ensemble.
          </span>
        ) : r.shapeZ == null ? (
          <span className="text-amber">
            null model degenerate — every rewiring reproduced the observed count, so no z-score is defined
          </span>
        ) : (
          <span className={Math.abs(r.shapeZ) >= 2 ? 'text-accent' : 'text-text-muted'}>
            shape z = {r.shapeZ.toFixed(2)} against {r.shuffles} degree-preserving rewirings (null mean{' '}
            {r.shapeNullMean?.toFixed(1)})
          </span>
        )}
      </p>

      {/* The second null is the one that matters most on corporate data, so it is not
          tucked into a tooltip. A drop from the plain z to the stratified z is the
          share of the signal that was sector and geography. */}
      {r.shapeZ != null && r.shapeZStratified != null && (
        <p className="font-mono text-[10.5px] mt-1">
          <span className={Math.abs(r.shapeZStratified) >= 2 ? 'text-accent' : 'text-sage'}>
            stratified z = {r.shapeZStratified.toFixed(2)} holding the sector × state mixing matrix fixed
            (null mean {r.shapeNullMeanStratified?.toFixed(1)})
          </span>
          {Math.abs(r.shapeZ) >= 2 && Math.abs(r.shapeZStratified) < 2 && (
            <span className="block text-amber mt-0.5">
              ↳ significant under the plain null and not under the stratified one — co-location
              explains it, not structure
            </span>
          )}
        </p>
      )}

      <p className="text-[12.5px] text-text-muted mt-2.5 border-l-2 border-border-light pl-3 max-w-[72ch] leading-relaxed">
        {r.caveat}
      </p>

      {r.top.length === 0 ? (
        <p className="text-[13.5px] text-sage mt-3">
          Nothing survived. On this shape the graph's structure is explained by its degree
          sequence — which is the expected result, and the one a selective search could never
          give you.
        </p>
      ) : (
        <ol className="mt-3 space-y-2">
          {r.top.map((cand) => (
            <li key={cand.id} className="text-[13.5px] leading-snug">
              <span className="font-mono text-[10.5px] text-accent mr-2">q={cand.q.toExponential(1)}</span>
              {cand.describe}
              <span className="block font-mono text-[10px] text-text-muted mt-0.5">
                observed {cand.observed} · expected {cand.expected.toFixed(2)} · {cand.edges.length} edge
                {cand.edges.length === 1 ? '' : 's'}
                {cand.replicated === true ? ' · replicated in both halves' : ''}
                {' · '}q<sub>BY</sub> {cand.q.toExponential(1)} vs q<sub>BH</sub> {cand.qBH.toExponential(1)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default function Prospector() {
  const { nodes: allNodes, edges: allEdges } = useData();
  const [params, setParams] = useSearchParams();
  const layer = (params.get('layer') ?? 'atlas') as Layer;
  const q = Number(params.get('q') ?? 0.05);
  const [running, setRunning] = useState(false);
  const [run, setRun] = useState<ProspectRun | null>(null);
  const [control, setControl] = useState<ProspectRun | null>(null);

  const national = useMemo(() => buildNationalGraph(), []);

  const graph = useMemo((): { nodes: GNode[]; edges: GEdge[] } => {
    if (layer === 'atlas') return { nodes: NODES, edges: EDGES };
    if (layer === 'capital') {
      const keep = new Set(national.nodes.filter((n) => n.fam === 'capital').map((n) => n.id));
      return {
        nodes: national.nodes.filter((n) => keep.has(n.id)),
        edges: national.edges.filter((e) => keep.has(e.s) && keep.has(e.t)),
      };
    }
    return { nodes: allNodes, edges: allEdges };
  }, [layer, national, allNodes, allEdges]);

  const doRun = () => {
    setRunning(true);
    // Yield a frame so the button state paints before the synchronous work starts.
    setTimeout(() => {
      const main = prospect(graph.nodes, graph.edges, { q, shuffles: 20, requireReplication: true });
      // The control: the same enumeration on a fully rewired graph. If the control
      // produces a comparable survivor count, the method is generating the pattern.
      const shuffledEdges = graph.edges.map((e, i) => ({
        ...e,
        t: graph.edges[(i * 7 + 3) % graph.edges.length].t,
      }));
      const ctrl = prospect(graph.nodes, shuffledEdges, { q, shuffles: 8, requireReplication: true });
      setRun(main);
      setControl(ctrl);
      setRunning(false);
    }, 20);
  };

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    next.set(k, v);
    setParams(next, { replace: true });
    setRun(null);
    setControl(null);
  };

  return (
    <article className="pb-20">
      <header className="pt-2 pb-6 border-b-2 border-border-light">
        <Kicker>Prospector · exhaustive candidate generation</Kicker>
        <PageTitle>Endless patterns, and the only way to trust them</PageTitle>
        <Standfirst>
          This generates candidate patterns from the graph without stopping — every
          multiplex tie, every triangle, every concentrated role, every structural void.
          Then it throws almost all of them away. The discarding is the point: a generator
          that surfaces striking connections is a machine for manufacturing false findings,
          and the only known defence is to generate <em>everything</em> and correct for how
          much you generated.
        </Standfirst>
        <Byline>
          Nothing on this page is a finding. Every survivor is a question, ranked by how much
          attention it has earned.
        </Byline>
      </header>

      <Callout label="Why testing more hypotheses makes results more reliable" tone="bottomline">
        <p>
          <strong>Candidate-gene studies</strong> picked a handful of biologically plausible
          genes and tested those against a trait. Thousands of papers, and almost nothing
          replicated — a re-examination of the 18 most-studied candidate genes for depression
          found support for none of them.
        </p>
        <p>
          <strong>Genome-wide association studies</strong> test <em>every</em> variant —
          millions of hypotheses, most of them implausible — apply a threshold calibrated to
          that number, and demand replication in an independent cohort. The findings hold up.
        </p>
        <p>
          The difference is not that GWAS was more careful. It tested vastly more.{' '}
          <strong>
            Exhaustive testing is what makes the comparison family knowable, and a knowable
            family can be corrected for.
          </strong>{' '}
          A selective search cannot be, because you can never reconstruct how many hypotheses
          you would have entertained. That is the whole design of this page: endless is fine,{' '}
          <em>selective</em> is fatal.
        </p>
      </Callout>

      {/* controls */}
      <div className="flex flex-wrap gap-4 items-end my-8">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mb-1.5">Graph</p>
          <div className="flex gap-1.5">
            {LAYERS.map((l) => (
              <button
                key={l.id}
                onClick={() => setParam('layer', l.id)}
                title={l.note}
                className={`font-mono text-[11px] px-2.5 py-1.5 rounded border transition-colors ${
                  layer === l.id ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-muted hover:text-text'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mb-1.5">
            FDR level q — declared before the run
          </p>
          <div className="flex gap-1.5">
            {['0.01', '0.05', '0.1'].map((v) => (
              <button
                key={v}
                onClick={() => setParam('q', v)}
                className={`font-mono text-[11px] px-2.5 py-1.5 rounded border transition-colors ${
                  String(q) === v ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-muted hover:text-text'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <button onClick={doRun} disabled={running} className="btn-primary disabled:opacity-50">
          {running ? 'enumerating…' : run ? 'run again' : 'run the prospector'}
        </button>
      </div>

      <p className="text-[13px] text-text-muted max-w-[72ch] -mt-4 mb-6">
        {graph.nodes.length} entities, {graph.edges.length} relationships. {LAYERS.find((l) => l.id === layer)!.note}
      </p>

      {!run && (
        <Callout label="Before you run it" tone="note">
          <p>
            Changing q <em>after</em> seeing a disappointing result and reporting the second
            run as if it were the first is optional stopping, and it invalidates the
            correction. The level is a control here so you can see how the funnel responds —
            not so you can shop for a threshold that produces survivors.
          </p>
        </Callout>
      )}

      {run && (
        <>
          <Section title="The funnel" note="This is the result. The survivors below are an appendix to it.">
            <Funnel run={run} />
            <StatGrid
              items={[
                { value: run.totalEnumerated.toLocaleString('en-IN'), label: 'candidates enumerated — the declared family' },
                { value: String(run.totalSurvived), label: `survived FDR at q = ${run.q}`, tone: run.totalSurvived ? 'accent' : 'sage' },
                { value: String(run.totalReplicated), label: 'also replicated in both halves', tone: run.totalReplicated ? 'accent' : 'sage' },
                {
                  value: control ? String(control.totalReplicated) : '—',
                  label: 'survivors in the rewired control — if this matches, the method is generating the pattern',
                  tone: control && control.totalReplicated >= run.totalReplicated ? 'rose' : 'muted',
                },
              ]}
            />

            {run.totalReplicated === 0 && (
              <Callout label="Zero survivors is a successful run" tone="good">
                <p>
                  {run.totalEnumerated.toLocaleString('en-IN')} candidates were enumerated and
                  none survived correction and replication. That means the structure in this
                  graph is explained by its degree sequence — which is the honest answer most
                  of the time, and the one a search that only looked at striking connections
                  could never produce.
                </p>
              </Callout>
            )}

            {control && run.totalReplicated > 0 && control.totalReplicated >= run.totalReplicated && (
              <Callout label="The control matched — treat these survivors as artefacts" tone="warn">
                <p>
                  The same enumeration on a rewired version of this graph produced{' '}
                  {control.totalReplicated} survivors against {run.totalReplicated} on the real
                  one. When a control with the theory removed performs as well, the method is
                  generating the pattern rather than detecting it.
                </p>
              </Callout>
            )}
          </Section>

          <Section title="By shape" note="Each with its own family size, null-model score, and what it cannot support">
            <div className="space-y-3">
              {run.results.map((r) => (
                <ShapeBlock key={r.shape} r={r} />
              ))}
            </div>
          </Section>

          <Section title="The declared family" note="Fixed by enumeration, before any candidate was scored">
            <Prose>
              <p>{run.declaredFamily}</p>
            </Prose>
          </Section>
        </>
      )}

      <Section title="The shapes" note="Declared in advance. Adding one after seeing results would be a new family.">
        <DataTable
          columns={['Shape', 'The question it asks', 'What it cannot support']}
          rows={SHAPE_META.map((s) => [
            <strong key="n" className="text-text">
              {s.name}
            </strong>,
            <span key="q" className="text-[13px]">
              {s.question}
            </span>,
            <span key="c" className="text-[12.5px] text-text-muted">
              {s.caveat}
            </span>,
          ])}
        />
      </Section>

      <Section title="What happens to a survivor" note="">
        <Prose>
          <p>
            A survivor earns exactly one thing: <strong>someone's time</strong>. It goes to the
            evidence auditor, which runs the date test, the identity test, the base rate and the
            denial capture before anything can be published. Most do not survive that either.
          </p>
          <p>
            The correct verb for anything on this page is <em>worth asking about</em>. Not
            "shows", not "reveals", not "suggests a link". A structural regularity in a graph
            built from public records is a reason to look, and looking is what the rest of the
            platform is for.
          </p>
        </Prose>
      </Section>

      <Footnote>
        <p>
          <strong>Method.</strong> Enumeration is exhaustive over each declared shape, including
          candidates that will score badly — they are part of the denominator, and dropping them
          before correction inflates every q-value that survives. Per-candidate p-values come
          from a configuration-model null computed from the degree sequence; correction is{' '}
          <strong>Benjamini–Yekutieli</strong> across the whole declared family; replication is a
          deterministic split-half requiring the candidate to clear the threshold in both halves
          independently.
        </p>
        <p>
          <strong>Why Yekutieli and not plain Hochberg.</strong> BH is valid under independence
          or positive dependence. Neither holds on a graph: the edge-swapping randomisation
          itself induces correlations between subgraph counts, of unknown sign, and measured
          correlations between motif frequencies in real networks reach −0.999. Negative
          dependence is precisely the case BH is not proved for, so using it would mean assuming
          away the one property the literature says is violated. BY pays a harmonic-number
          penalty — a factor of about 8 on a family of 2,000 — and holds under arbitrary
          dependence. Both q-values are printed on every survivor so the cost is visible.
        </p>
        <p>
          <strong>Two nulls, because one is not a control.</strong> A degree-preserving null
          rules out "this is just hubs" and nothing else. Artzy-Randrup and colleagues built a
          purely spatial random network with no rule selecting for any motif and recovered the
          same "significant" motifs that had been reported in <em>C. elegans</em>. The corporate
          analogue is exact — firms sharing a state and a sector share directors, auditors and
          counterparties at elevated rates with no coordination whatever. So every shape is also
          scored against a null that holds the sector × state mixing matrix fixed. A candidate
          significant under the first and not the second has been explained by co-location, and
          that is reported on the shape, not buried.
        </p>
        <p>
          <strong>An honest limit.</strong> No published method establishes FDR control over a
          subgraph census; faced with the dependence problem the motif literature moved to
          description-length and ERGM approaches rather than correcting per-subgraph tests. The
          correction here is standard in spirit and not directly validated for this object, which
          is the main reason the evidential weight sits on replication and on documents rather
          than on the q-value.
        </p>
        <p>
          <strong>Structural voids carry a specific warning.</strong> An absence in the dataset
          may be an absence in the world or a hole in coverage, and this engine cannot tell them
          apart. Every void it emits is a question about coverage as much as about the entity.
        </p>
        <p>
          <strong>Standing.</strong> Nothing here asserts intent, coordination or wrongdoing. It
          reports structure in a graph assembled from public records.{' '}
          <Link to="/patterns" className="underline underline-offset-2">
            Why the discipline exists
          </Link>{' '}
          ·{' '}
          <Link to="/motifs" className="underline underline-offset-2">
            the hand-specified motifs
          </Link>
          .
        </p>
      </Footnote>
    </article>
  );
}
