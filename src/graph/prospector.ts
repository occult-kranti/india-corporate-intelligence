/**
 * The pattern prospector — exhaustive candidate generation.
 *
 * ============================================================================
 * WHY THIS IS NOT AN APOPHENIA MACHINE
 * ============================================================================
 *
 * A generator that surfaces striking connections is a machine for manufacturing
 * false findings. This one is built the opposite way round, on the single insight
 * that turned genome-wide association studies from a replication catastrophe into
 * one of the most reproducible areas of biology:
 *
 *   **Testing MORE hypotheses makes results MORE reliable — provided you test them
 *   ALL, and you declare how many you tested.**
 *
 * Candidate-gene studies picked a handful of plausible genes and tested those. Almost
 * none replicated. GWAS tests every variant on the genome — millions of hypotheses —
 * applies a threshold calibrated to that number, and demands replication in an
 * independent cohort. The findings hold up. The difference is not caution; it is
 * exhaustiveness, because exhaustiveness is what makes the comparison family knowable.
 *
 * So the rules here are:
 *
 * 1. **Enumeration is exhaustive.** Every candidate of a declared shape is generated.
 *    No ranking, filtering or judgement happens during enumeration. If the engine
 *    could choose what to look at, the family size would be a fiction.
 *
 * 2. **The family size is the output of enumeration, not an afterthought.** It is
 *    fixed before any candidate is scored, which is exactly what the garden-of-
 *    forking-paths problem requires.
 *
 * 3. **Every candidate gets a p-value against a configuration-model null**, computed
 *    analytically from the degree sequence. Hubs connect to things; that is what hubs
 *    do, and the null has to know it.
 *
 * 4. **Benjamini–Hochberg FDR across the whole declared family.** Not per-candidate,
 *    not on the survivors.
 *
 * 5. **Split-half replication.** A candidate that survives on the full graph but not
 *    in both halves is not promoted. This is the replication cohort.
 *
 * 6. **The headline output is a survival RATE, never a gallery.** "N enumerated,
 *    M survived, K replicated" — because a list of survivors without N is precisely
 *    the artefact this platform exists not to produce.
 *
 * Nothing this engine emits is a finding. Everything it emits is a QUESTION, ranked
 * by how much attention it has earned. The hand-off is to the evidence-auditor.
 */

import type { GNode, GEdge, Predicate } from './schema';
import { rewire, rewireStratified, type RawEdge } from './nullModel';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ShapeId = 'multiplex-dyad' | 'closed-triad' | 'concentrated-star' | 'structural-void';

export interface Candidate {
  id: string;
  shape: ShapeId;
  /** Node ids taking part. */
  members: string[];
  /** The edges that instantiate the pattern. */
  edges: GEdge[];
  /** The observed statistic — meaning depends on shape. */
  observed: number;
  /** What the configuration model expects for this specific candidate. */
  expected: number;
  /** Upper-tail probability of the observed statistic under that null. */
  p: number;
  /** Human-readable one-liner. Never causal. */
  describe: string;
}

export interface ScoredCandidate extends Candidate {
  /** BY-adjusted q-value across the declared family. This is the one that decides. */
  q: number;
  /** BH-adjusted, shown only to expose what the weaker independence assumption buys. */
  qBH: number;
  survivesFDR: boolean;
  /** Present in both halves of the split-half test. */
  replicated: boolean | null;
}

export interface ShapeResult {
  shape: ShapeId;
  name: string;
  question: string;
  /** THE FAMILY SIZE. Fixed by enumeration, before any scoring. */
  enumerated: number;
  /** Candidates whose statistic could in principle be surprising (observed > expected). */
  nonTrivial: number;
  survivedFDR: number;
  replicated: number;
  /** Shape-level motif significance against a degree-preserving rewiring. */
  shapeZ: number | null;
  shapeNullMean: number | null;
  /**
   * The same statistic against a null that also preserves the sector x state mixing
   * matrix. Lower than `shapeZ` means part of the signal was co-location, not structure.
   */
  shapeZStratified: number | null;
  shapeNullMeanStratified: number | null;
  /** True when the shape was too large to afford a rewiring ensemble. Reported, not hidden. */
  nullSkipped?: boolean;
  shuffles: number;
  top: ScoredCandidate[];
  /** What this shape can and cannot support. Rendered with every result. */
  caveat: string;
}

export interface ProspectRun {
  q: number;
  shuffles: number;
  totalEnumerated: number;
  totalSurvived: number;
  totalReplicated: number;
  results: ShapeResult[];
  /** Declared before the run. Changing it after seeing results invalidates the FDR. */
  declaredFamily: string;
}

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

/**
 * Poisson upper tail, P(X >= k). The configuration model makes the number of edges
 * between two nodes approximately Poisson with mean d_i·d_j / 2m, which is the
 * standard analytic null for a degree-corrected random graph.
 */
function poissonUpperTail(k: number, lambda: number): number {
  if (k <= 0) return 1;
  if (lambda <= 0) return k > 0 ? 0 : 1;
  // P(X >= k) = 1 - P(X <= k-1), summed with a running term to avoid factorials.
  let term = Math.exp(-lambda);
  let cdf = term;
  for (let i = 1; i <= k - 1; i++) {
    term *= lambda / i;
    cdf += term;
  }
  return Math.max(0, Math.min(1, 1 - cdf));
}

/** Hypergeometric upper tail, for absence/presence tests against a population. */
function hypergeomUpperTail(k: number, K: number, n: number, N: number): number {
  // P(X >= k) where X ~ Hypergeometric(N population, K successes, n draws)
  const logC = (a: number, b: number): number => {
    if (b < 0 || b > a) return -Infinity;
    let s = 0;
    for (let i = 0; i < b; i++) s += Math.log(a - i) - Math.log(i + 1);
    return s;
  };
  const denom = logC(N, n);
  let p = 0;
  const hi = Math.min(K, n);
  for (let i = k; i <= hi; i++) {
    const lp = logC(K, i) + logC(N - K, n - i) - denom;
    if (Number.isFinite(lp)) p += Math.exp(lp);
  }
  return Math.max(0, Math.min(1, p));
}

/**
 * Benjamini–Hochberg across the DECLARED family.
 *
 * `familySize` is passed explicitly rather than derived from the array length,
 * because the family is every candidate enumerated — including the ones whose
 * p-value is 1 and which a careless implementation would drop before correcting.
 * Dropping them inflates every q-value that survives.
 */
export function benjaminiHochbergQ(pValues: number[], familySize: number): number[] {
  const n = Math.max(familySize, pValues.length);
  const idx = pValues.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p);
  const q = new Array<number>(pValues.length).fill(1);
  let prev = 1;
  for (let rank = idx.length; rank >= 1; rank--) {
    const { p, i } = idx[rank - 1];
    prev = Math.min(prev, (p * n) / rank);
    q[i] = Math.min(1, prev);
  }
  return q;
}

/**
 * The BY dependence penalty, c(n) = sum_{i=1..n} 1/i.
 * Grows like ln(n) + 0.577, so a family of 2,180 costs a factor of about 8.2.
 */
export function harmonicPenalty(n: number): number {
  let c = 0;
  for (let i = 1; i <= n; i++) c += 1 / i;
  return c;
}

/**
 * Benjamini–Yekutieli — BH scaled by the harmonic penalty, valid under ARBITRARY
 * dependence between tests.
 *
 * This is the q-value the prospector reports, and plain BH is shown beside it only
 * so the cost of the weaker assumption is visible. BH requires independence or
 * positive dependence, and on a graph neither holds:
 *
 *  - Ginoza & Mugler (2010) show the edge-swapping randomisation ITSELF induces
 *    correlations between subgraph counts, with no guarantee of sign.
 *  - Fodor et al. (2020) measure correlations between motif frequencies reaching
 *    -0.999 in a real network.
 *
 * Negative dependence is exactly the case BH is not proved for, so using it here
 * would be assuming away the one property the literature says is violated.
 */
export function benjaminiYekutieliQ(pValues: number[], familySize: number): number[] {
  const n = Math.max(familySize, pValues.length);
  const c = harmonicPenalty(n);
  return benjaminiHochbergQ(pValues, familySize).map((q) => Math.min(1, q * c));
}

// ---------------------------------------------------------------------------
// Graph helpers
// ---------------------------------------------------------------------------

interface Ctx {
  nodes: GNode[];
  edges: GEdge[];
  byId: Map<string, GNode>;
  deg: Map<string, number>;
  /** Undirected adjacency: node → set of neighbours. */
  adj: Map<string, Set<string>>;
  /** Undirected pair key → edges between them. */
  pairs: Map<string, GEdge[]>;
  m: number;
}

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

function buildCtx(nodes: GNode[], edges: GEdge[]): Ctx {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const deg = new Map<string, number>();
  const adj = new Map<string, Set<string>>();
  const pairs = new Map<string, GEdge[]>();
  const live = edges.filter((e) => byId.has(e.s) && byId.has(e.t) && e.s !== e.t);
  for (const e of live) {
    deg.set(e.s, (deg.get(e.s) ?? 0) + 1);
    deg.set(e.t, (deg.get(e.t) ?? 0) + 1);
    if (!adj.has(e.s)) adj.set(e.s, new Set());
    if (!adj.has(e.t)) adj.set(e.t, new Set());
    adj.get(e.s)!.add(e.t);
    adj.get(e.t)!.add(e.s);
    const k = pairKey(e.s, e.t);
    if (!pairs.has(k)) pairs.set(k, []);
    pairs.get(k)!.push(e);
  }
  return { nodes, edges: live, byId, deg, adj, pairs, m: live.length };
}

const label = (c: Ctx, id: string) => c.byId.get(id)?.label ?? id;

// ---------------------------------------------------------------------------
// Shape enumerators — each MUST be exhaustive over its family
// ---------------------------------------------------------------------------

/**
 * Multiplex dyads: pairs of entities joined by more than one relationship.
 *
 * Family = every connected pair in the graph, not every pair with >1 edge. A pair
 * with one edge is a candidate that scored badly, not a non-candidate; excluding it
 * would shrink the denominator and inflate every q-value.
 */
function enumerateMultiplexDyads(c: Ctx): Candidate[] {
  const out: Candidate[] = [];
  for (const [key, es] of c.pairs) {
    const [a, b] = key.split('|');
    const distinctPreds = new Set(es.map((e) => e.pred)).size;
    const lambda = ((c.deg.get(a) ?? 0) * (c.deg.get(b) ?? 0)) / (2 * Math.max(1, c.m));
    out.push({
      id: `dyad:${key}`,
      shape: 'multiplex-dyad',
      members: [a, b],
      edges: es,
      observed: distinctPreds,
      expected: lambda,
      p: poissonUpperTail(distinctPreds, lambda),
      describe: `${label(c, a)} and ${label(c, b)} are joined by ${distinctPreds} distinct relationship type${distinctPreds === 1 ? '' : 's'} (${[...new Set(es.map((e) => e.pred))].join(', ')})`,
    });
  }
  return out;
}

/**
 * Closed triads: three entities all mutually connected.
 *
 * Family = every connected triple that COULD close, i.e. every path of length two.
 * Enumerating only the closed ones would answer "how many triangles are there"
 * rather than "is closure unusual here", which is the question that matters.
 */
function enumerateClosedTriads(c: Ctx): Candidate[] {
  const out: Candidate[] = [];
  const seen = new Set<string>();
  const ids = [...c.adj.keys()];
  for (const b of ids) {
    const nbrs = [...(c.adj.get(b) ?? [])];
    for (let i = 0; i < nbrs.length; i++) {
      for (let j = i + 1; j < nbrs.length; j++) {
        const a = nbrs[i];
        const cc = nbrs[j];
        const tri = [a, b, cc].sort();
        const key = tri.join('|');
        if (seen.has(key)) continue;
        seen.add(key);
        const closed = c.adj.get(a)?.has(cc) ?? false;
        const edges = [
          ...(c.pairs.get(pairKey(a, b)) ?? []),
          ...(c.pairs.get(pairKey(b, cc)) ?? []),
          ...(closed ? c.pairs.get(pairKey(a, cc)) ?? [] : []),
        ];
        const lambda = ((c.deg.get(a) ?? 0) * (c.deg.get(cc) ?? 0)) / (2 * Math.max(1, c.m));
        out.push({
          id: `triad:${key}`,
          shape: 'closed-triad',
          members: tri,
          edges,
          observed: closed ? 1 : 0,
          expected: Math.min(1, lambda),
          p: closed ? poissonUpperTail(1, lambda) : 1,
          describe: closed
            ? `${label(c, a)}, ${label(c, b)} and ${label(c, cc)} form a closed triangle`
            : `${label(c, a)} and ${label(c, cc)} both connect to ${label(c, b)} but not to each other`,
        });
      }
    }
  }
  return out;
}

/**
 * Concentrated stars: an entity whose edges pile into one relationship type more
 * than its overall degree explains.
 *
 * Family = every node with degree >= 3. Below that the test has no power and
 * including it would only dilute the correction.
 */
function enumerateConcentratedStars(c: Ctx): Candidate[] {
  const out: Candidate[] = [];
  const predTotals = new Map<Predicate, number>();
  for (const e of c.edges) predTotals.set(e.pred, (predTotals.get(e.pred) ?? 0) + 1);
  const totalEdgeEnds = 2 * c.m;

  const byNode = new Map<string, GEdge[]>();
  for (const e of c.edges) {
    for (const side of [e.s, e.t]) {
      if (!byNode.has(side)) byNode.set(side, []);
      byNode.get(side)!.push(e);
    }
  }

  for (const [id, es] of byNode) {
    if (es.length < 3) continue;
    const counts = new Map<Predicate, number>();
    for (const e of es) counts.set(e.pred, (counts.get(e.pred) ?? 0) + 1);
    let bestPred: Predicate | null = null;
    let bestK = 0;
    for (const [p, k] of counts) if (k > bestK) [bestPred, bestK] = [p, k];
    if (!bestPred) continue;
    // Expected share of this node's edges carrying that predicate, if the node drew
    // its edges from the global predicate mix.
    const share = (predTotals.get(bestPred) ?? 0) / Math.max(1, totalEdgeEnds / 2);
    const expected = es.length * share;
    out.push({
      id: `star:${id}`,
      shape: 'concentrated-star',
      members: [id],
      edges: es.filter((e) => e.pred === bestPred),
      observed: bestK,
      expected,
      p: poissonUpperTail(bestK, Math.max(1e-9, expected)),
      describe: `${label(c, id)} has ${bestK} of its ${es.length} relationships as "${bestPred}" (${expected.toFixed(1)} expected from the graph's overall mix)`,
    });
  }
  return out;
}

/**
 * Structural voids: entities that have one relationship type and conspicuously lack
 * another that its peers overwhelmingly have.
 *
 * This is the shape that matters most on this platform, because absence is where the
 * documented void lives — the largest award recipients carrying no traceable
 * donations. A generator that can only find presence systematically overstates.
 *
 * Family = every (node, absent-predicate) pair where the node has the anchor
 * predicate and the absent one is common among anchor-holders.
 */
function enumerateStructuralVoids(c: Ctx): Candidate[] {
  const out: Candidate[] = [];
  const nodePreds = new Map<string, Set<Predicate>>();
  const nodeEdges = new Map<string, GEdge[]>();
  for (const e of c.edges) {
    for (const side of [e.s, e.t]) {
      if (!nodePreds.has(side)) nodePreds.set(side, new Set());
      if (!nodeEdges.has(side)) nodeEdges.set(side, []);
      nodePreds.get(side)!.add(e.pred);
      nodeEdges.get(side)!.push(e);
    }
  }
  const allPreds = [...new Set(c.edges.map((e) => e.pred))];

  for (const anchor of allPreds) {
    const holders = [...nodePreds.entries()].filter(([, s]) => s.has(anchor)).map(([id]) => id);
    if (holders.length < 5) continue; // too small a population to say anything
    for (const absent of allPreds) {
      if (absent === anchor) continue;
      const withBoth = holders.filter((id) => nodePreds.get(id)!.has(absent)).length;
      const rate = withBoth / holders.length;
      // Only interesting if the second predicate is COMMON among anchor-holders.
      if (rate < 0.5 || withBoth < 3) continue;
      const lacking = holders.filter((id) => !nodePreds.get(id)!.has(absent));
      for (const id of lacking) {
        // Probability of a holder lacking `absent`, given the observed rate.
        const p = hypergeomUpperTail(1, holders.length - withBoth, 1, holders.length);
        out.push({
          id: `void:${id}:${anchor}:${absent}`,
          shape: 'structural-void',
          members: [id],
          edges: (nodeEdges.get(id) ?? []).filter((e) => e.pred === anchor),
          observed: 0,
          expected: rate,
          p,
          describe: `${label(c, id)} has "${anchor}" but no "${absent}", where ${withBoth} of ${holders.length} (${(rate * 100).toFixed(0)}%) of "${anchor}" holders do have it`,
        });
      }
    }
  }
  return out;
}

const SHAPES: {
  id: ShapeId;
  name: string;
  question: string;
  caveat: string;
  enumerate: (c: Ctx) => Candidate[];
}[] = [
  {
    id: 'multiplex-dyad',
    name: 'Multiplex ties',
    question: 'Which two entities are connected in more distinct ways than their sizes explain?',
    caveat:
      'A multiplex tie is not a hidden relationship. Two large entities transacting in several registers is ordinary; the test only asks whether the count exceeds what their degrees predict.',
    enumerate: enumerateMultiplexDyads,
  },
  {
    id: 'closed-triad',
    name: 'Closed triangles',
    question: 'Which three entities all connect to each other more than chance predicts?',
    caveat:
      'Triangles are compulsory above a certain density — Ramsey theory guarantees ordered substructure in any sufficiently large graph. Closure is only informative against the null.',
    enumerate: enumerateClosedTriads,
  },
  {
    id: 'concentrated-star',
    name: 'Concentrated roles',
    question: "Whose relationships pile into one type far beyond the graph's overall mix?",
    caveat:
      'A ministry that awards contracts is concentrated in "award" by construction. This shape finds role specialisation, which is usually a description of what an entity is, not a discovery about it.',
    enumerate: enumerateConcentratedStars,
  },
  {
    id: 'structural-void',
    name: 'Structural voids',
    question: 'Who lacks a relationship that almost all of their peers have?',
    caveat:
      'The strongest shape on this platform and the easiest to over-read. An absence in the dataset may be an absence in the world or a gap in coverage, and this engine cannot tell them apart. Every void is a question for the auditor, never a finding.',
    enumerate: enumerateStructuralVoids,
  },
];

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

/** Deterministic split of the edge list into two halves, for replication. */
function splitHalves(edges: GEdge[]): [GEdge[], GEdge[]] {
  const a: GEdge[] = [];
  const b: GEdge[] = [];
  edges.forEach((e, i) => (i % 2 === 0 ? a : b).push(e));
  return [a, b];
}

export interface ProspectOptions {
  /** FDR level. Declared before the run. */
  q?: number;
  /** Rewirings for the shape-level motif z-score. */
  shuffles?: number;
  /** How many survivors to return per shape for display. */
  topN?: number;
  /** Require the candidate to appear in both halves of the split. */
  requireReplication?: boolean;
}

export function prospect(nodes: GNode[], edges: GEdge[], opts: ProspectOptions = {}): ProspectRun {
  const q = opts.q ?? 0.05;
  const shuffles = opts.shuffles ?? 60;
  const topN = opts.topN ?? 12;

  // The stratum is what the second null holds fixed. `fam` is the closest thing this
  // schema has to a sector and `st` is geography, so `fam x state` is the corporate
  // analogue of the spatial clustering Artzy-Randrup showed a plain null is blind to.
  // Nodes with no state (persons, laws, mechanisms) form their own stratum rather
  // than being silently pooled with one.
  const stratumById = new Map(nodes.map((n) => [n.id, `${n.fam}:${n.st ?? 'none'}`]));
  const stratumOf = (id: string) => stratumById.get(id) ?? 'unknown';

  const ctx = buildCtx(nodes, edges);
  const [halfA, halfB] = splitHalves(ctx.edges);
  const ctxA = buildCtx(nodes, halfA);
  const ctxB = buildCtx(nodes, halfB);

  const results: ShapeResult[] = [];

  for (const shape of SHAPES) {
    // 1. ENUMERATE — exhaustively, before anything is scored.
    const candidates = shape.enumerate(ctx);
    const enumerated = candidates.length;
    if (enumerated === 0) {
      results.push({
        shape: shape.id,
        name: shape.name,
        question: shape.question,
        enumerated: 0,
        nonTrivial: 0,
        survivedFDR: 0,
        replicated: 0,
        shapeZ: null,
        shapeNullMean: null,
        shapeZStratified: null,
        shapeNullMeanStratified: null,
        nullSkipped: false,
        shuffles,
        top: [],
        caveat: shape.caveat,
      });
      continue;
    }

    // 2. CORRECT across the whole declared family, under arbitrary dependence.
    const ps = candidates.map((x) => x.p);
    const qs = benjaminiYekutieliQ(ps, enumerated);
    const qsBH = benjaminiHochbergQ(ps, enumerated);

    // 3. REPLICATE — does the candidate survive in both halves independently?
    const inA = new Set(shape.enumerate(ctxA).filter((x) => x.p < q).map((x) => x.id));
    const inB = new Set(shape.enumerate(ctxB).filter((x) => x.p < q).map((x) => x.id));

    const scored: ScoredCandidate[] = candidates.map((cand, i) => ({
      ...cand,
      q: qs[i],
      qBH: qsBH[i],
      survivesFDR: qs[i] <= q,
      replicated: opts.requireReplication === false ? null : inA.has(cand.id) && inB.has(cand.id),
    }));

    // 4. SHAPE-LEVEL motif significance against a degree-preserving rewiring.
    //
    // Each shuffle re-enumerates the whole shape, so cost is (shuffles × enumeration).
    // Above the budget below this runs for minutes in a browser, and a z-score nobody
    // waits for is worth less than an honest "not computed" — so the guard reports
    // that rather than silently thinning the ensemble to something meaningless.
    // Two nulls now, so the budget covers both ensembles.
    const ENUMERATION_BUDGET = 40_000;
    const affordable = enumerated * shuffles * 2 <= ENUMERATION_BUDGET;

    const observedCount = scored.filter((s) => s.p < q).length;
    let plain: { mean: number; sd: number } | null = null;
    let strat: { mean: number; sd: number } | null = null;

    if (affordable) {
      const raw: RawEdge[] = ctx.edges.map((e) => ({ s: e.s, t: e.t, pred: e.pred }));
      const countFn = (es: RawEdge[]) => {
        const fake: GEdge[] = es.map((e) => ({ s: e.s, t: e.t, pred: e.pred as Predicate, tier: 'documented' }));
        return shape.enumerate(buildCtx(nodes, fake)).filter((x) => x.p < q).length;
      };
      const moments = (samples: number[]) => {
        const mean = samples.reduce((a, b) => a + b, 0) / Math.max(1, samples.length);
        const v = samples.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, samples.length - 1);
        return { mean, sd: Math.sqrt(v) };
      };

      const plainSamples: number[] = [];
      const stratSamples: number[] = [];
      for (let i = 0; i < shuffles; i++) {
        plainSamples.push(countFn(rewire(raw, i + 1)));
        stratSamples.push(countFn(rewireStratified(raw, stratumOf, i + 1)));
      }
      plain = moments(plainSamples);
      strat = moments(stratSamples);
    }

    const survivors = scored
      .filter((s) => s.survivesFDR && (s.replicated ?? true))
      .sort((a, b) => a.q - b.q || b.observed - a.observed);

    results.push({
      shape: shape.id,
      name: shape.name,
      question: shape.question,
      enumerated,
      nonTrivial: scored.filter((s) => s.observed > s.expected).length,
      survivedFDR: scored.filter((s) => s.survivesFDR).length,
      replicated: survivors.length,
      shapeZ: !plain || plain.sd === 0 ? null : (observedCount - plain.mean) / plain.sd,
      shapeNullMean: plain ? plain.mean : null,
      shapeZStratified: !strat || strat.sd === 0 ? null : (observedCount - strat.mean) / strat.sd,
      shapeNullMeanStratified: strat ? strat.mean : null,
      nullSkipped: !affordable,
      shuffles,
      top: survivors.slice(0, topN),
      caveat: shape.caveat,
    });
  }

  return {
    q,
    shuffles,
    totalEnumerated: results.reduce((a, r) => a + r.enumerated, 0),
    totalSurvived: results.reduce((a, r) => a + r.survivedFDR, 0),
    totalReplicated: results.reduce((a, r) => a + r.replicated, 0),
    results,
    declaredFamily:
      'Every instance of four declared shapes over the loaded graph: all connected pairs, all length-two paths, all nodes of degree >= 3, and all (node, absent-predicate) pairs where the absent predicate is held by a majority of peers. The family is fixed by enumeration before any candidate is scored.',
  };
}

export const SHAPE_META = SHAPES.map(({ id, name, question, caveat }) => ({ id, name, question, caveat }));
