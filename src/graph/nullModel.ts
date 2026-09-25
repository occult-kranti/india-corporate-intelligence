/**
 * Degree-preserving null model (Maslov–Sneppen double-edge swap).
 *
 * Hubs are expected in preferential-attachment networks. Short paths between any
 * two large entities are expected in small worlds. Neither is a finding on its
 * own. The only way to know whether a motif is surprising is to count it in an
 * ensemble of graphs that share the observed degree sequence but are otherwise
 * random — and report a z-score, not a raw count.
 *
 * Reference: Milo et al., "Network motifs: simple building blocks of complex
 * networks", Science 298 (2002) 824-827.
 */

export interface RawEdge {
  s: string;
  t: string;
  pred?: string;
}

/** Mulberry32 — small, seeded, deterministic. Reproducible z-scores matter here. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Rewire by repeated double-edge swaps, preserving every node's degree exactly.
 * Swaps that would create a self-loop or a duplicate edge are rejected.
 * Predicate labels travel with the edge, so typed-path motifs stay meaningful.
 */
export function rewire(edges: RawEdge[], seed = 1, swapsPerEdge = 10): RawEdge[] {
  const out = edges.map((e) => ({ ...e }));
  const rand = rng(seed);
  const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const present = new Set(out.map((e) => key(e.s, e.t)));
  const attempts = out.length * swapsPerEdge;

  // A rejected swap MUST consume a step and leave the chain where it is. Redrawing
  // until a legal swap is found samples from the wrong distribution — the rejected
  // draws are what keep the chain in detailed balance (Milo et al., arXiv:cond-mat/
  // 0312028, which is a preprint and never was journal-published; cite it as one).
  // Every `continue` below is therefore load-bearing. Do not "optimise" it into a
  // retry loop.
  for (let n = 0; n < attempts; n++) {
    const i = Math.floor(rand() * out.length);
    const j = Math.floor(rand() * out.length);
    if (i === j) continue;
    const a = out[i];
    const b = out[j];
    // Only swap between edges of the same predicate, so a `bond` edge can never
    // be rewired into a `family` edge — that would compare against a null model
    // the observed graph could not have produced.
    if (a.pred !== b.pred) continue;
    const [s1, t1, s2, t2] = [a.s, a.t, b.s, b.t];
    if (s1 === t2 || s2 === t1) continue;
    const k1 = key(s1, t2);
    const k2 = key(s2, t1);
    if (present.has(k1) || present.has(k2)) continue;
    present.delete(key(s1, t1));
    present.delete(key(s2, t2));
    a.t = t2;
    b.t = t1;
    present.add(k1);
    present.add(k2);
  }
  return out;
}

/**
 * Degree-preserving AND block-preserving rewiring — the stratified null.
 *
 * WHY THIS EXISTS. Artzy-Randrup et al. (2004, Science 305:1107) built a purely
 * spatial random network — a 30x30 lattice with edge probability falling off with
 * distance, and no rule whatsoever selecting for any motif — and recovered the same
 * "significant" motifs Milo et al. had reported in C. elegans. Their conclusion is
 * the one that matters here: a degree-preserving null "is not null to this form of
 * localized aggregation."
 *
 * The corporate analogue is exact. Companies sharing a state and a sector share
 * directors, auditors, addresses and counterparties at elevated rates for reasons
 * involving no coordination at all — they hire from the same pool and are regulated
 * by the same body. A plain degree-preserving null reports that as a motif.
 *
 * So this null preserves the mixing matrix as well as the degree sequence: an edge
 * may only be swapped with another edge spanning the SAME unordered pair of strata.
 * Both rewired edges therefore stay in their original block, and the count of edges
 * between every pair of strata is invariant.
 *
 * Read the two nulls together, never alone. A candidate significant under the plain
 * null and NOT under this one has been explained by sector and geography — which is
 * a result, and belongs in the report rather than in a footnote.
 */
export function rewireStratified(
  edges: RawEdge[],
  stratumOf: (nodeId: string) => string,
  seed = 1,
  swapsPerEdge = 10,
): RawEdge[] {
  const out = edges.map((e) => ({ ...e }));
  const rand = rng(seed);
  const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const block = (e: RawEdge) => {
    const [x, y] = [stratumOf(e.s), stratumOf(e.t)].sort();
    return `${e.pred ?? ''}::${x}::${y}`;
  };
  const present = new Set(out.map((e) => key(e.s, e.t)));

  // Swaps are only ever legal inside a block, so draw both edges from the same one.
  // Drawing globally and rejecting would spend almost every step on a cross-block
  // pair and leave the chain barely mixed.
  const blocks = new Map<string, number[]>();
  out.forEach((e, i) => {
    const b = block(e);
    if (!blocks.has(b)) blocks.set(b, []);
    blocks.get(b)!.push(i);
  });
  const pools = [...blocks.values()].filter((p) => p.length >= 2);
  if (!pools.length) return out;

  const attempts = out.length * swapsPerEdge;
  for (let n = 0; n < attempts; n++) {
    const pool = pools[Math.floor(rand() * pools.length)];
    const i = pool[Math.floor(rand() * pool.length)];
    const j = pool[Math.floor(rand() * pool.length)];
    if (i === j) continue;
    const a = out[i];
    const b = out[j];
    const [s1, t1, s2, t2] = [a.s, a.t, b.s, b.t];
    if (s1 === t2 || s2 === t1) continue;
    // The block is defined on the unordered stratum pair, so a swap that would move
    // an edge into a different block is rejected — same detailed-balance rule as above.
    if (stratumOf(t1) !== stratumOf(t2)) continue;
    const k1 = key(s1, t2);
    const k2 = key(s2, t1);
    if (present.has(k1) || present.has(k2)) continue;
    present.delete(key(s1, t1));
    present.delete(key(s2, t2));
    a.t = t2;
    b.t = t1;
    present.add(k1);
    present.add(k2);
  }
  return out;
}

export interface NullResult {
  observed: number;
  nullMean: number;
  nullSd: number;
  zScore: number;
  shuffles: number;
  /** Fraction of shuffles that matched or beat the observed count. */
  pEmpirical: number;
}

/**
 * Score a motif counter against the degree-preserving ensemble.
 * `count` must be a pure function of the edge list.
 */
export function motifSignificance(
  edges: RawEdge[],
  count: (e: RawEdge[]) => number,
  shuffles = 1000,
): NullResult {
  const observed = count(edges);
  const samples: number[] = [];
  for (let i = 0; i < shuffles; i++) samples.push(count(rewire(edges, i + 1)));
  const nullMean = samples.reduce((a, b) => a + b, 0) / shuffles;
  const variance = samples.reduce((a, b) => a + (b - nullMean) ** 2, 0) / Math.max(1, shuffles - 1);
  const nullSd = Math.sqrt(variance);
  const atLeast = samples.filter((s) => s >= observed).length;
  return {
    observed,
    nullMean,
    nullSd,
    zScore: nullSd === 0 ? 0 : (observed - nullMean) / nullSd,
    shuffles,
    pEmpirical: (atLeast + 1) / (shuffles + 1),
  };
}

/**
 * Path-length distribution. Publish this instead of the single short path you
 * found — in a network of large Indian entities, two or three hops between any
 * two nodes is the norm, not a discovery.
 */
export function pathLengthProfile(edges: RawEdge[], from: string): Map<string, number> {
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    if (!adj.has(e.s)) adj.set(e.s, []);
    if (!adj.has(e.t)) adj.set(e.t, []);
    adj.get(e.s)!.push(e.t);
    adj.get(e.t)!.push(e.s);
  }
  const dist = new Map<string, number>([[from, 0]]);
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const nxt of adj.get(cur) ?? []) {
      if (!dist.has(nxt)) {
        dist.set(nxt, dist.get(cur)! + 1);
        queue.push(nxt);
      }
    }
  }
  return dist;
}

export function medianDegreeSeparation(edges: RawEdge[], sampleSeeds: string[]): number {
  const all: number[] = [];
  for (const s of sampleSeeds) {
    for (const d of pathLengthProfile(edges, s).values()) if (d > 0) all.push(d);
  }
  if (!all.length) return 0;
  all.sort((a, b) => a - b);
  return all[Math.floor(all.length / 2)];
}
