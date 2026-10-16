/**
 * Motif engine.
 *
 * Replaces hand-tagged motif membership with declarative path templates matched
 * over typed edges at load time. A hand-tagged motif is an assertion wearing the
 * costume of a query: the analyst decides which edges "belong" to the pattern,
 * which means the pattern can never fail to be found.
 *
 * A computed motif can come out empty. That is the point.
 *
 * Every template carries:
 *   - a census with a real denominator (a numerator alone is not a finding),
 *   - a z-score against a degree-preserving null model (hubs and short paths are
 *     compulsory in networks like this — see Milo et al. 2002),
 *   - a mandatory innocent reading, and
 *   - explicit upgrade and kill conditions.
 */

import type { GEdge, GNode, Predicate, Tier } from './schema';
import { motifSignificance, type RawEdge } from './nullModel';

export interface Step {
  /** Any of these predicates satisfies the step. */
  preds: Predicate[];
  /** 'out' follows s→t, 'in' follows t→s, 'either' ignores direction. */
  dir?: 'out' | 'in' | 'either';
  /** Optional constraint on the node this step lands on. */
  landsOn?: (n: GNode) => boolean;
  /**
   * Where this step departs from.
   *
   * 'prev' (default) chains: the step continues from wherever the last one landed.
   * 'start' branches: the step departs from the origin node again.
   *
   * This distinction matters more than it looks. "A company received an award AND
   * that company donated" is a STAR centred on the company, not a path — chaining
   * it instead would follow the award edge back to the ministry and then look for
   * a donation from the ministry, which is a different and meaningless question.
   */
  from?: 'prev' | 'start';
  label?: string;
}

export interface MotifTemplate {
  id: string;
  name: string;
  tier: Tier;
  /** Which nodes the pattern may start from. Also defines the denominator. */
  startsAt: (n: GNode) => boolean;
  startLabel: string;
  steps: Step[];
  /**
   * Negation: the start node must have NO edge matching this.
   *
   * This is what lets the engine compute an absence rather than only a presence.
   * A graph that can only match what exists systematically overstates its case, so
   * the void motifs matter at least as much as the flow motifs.
   */
  mustNotHave?: { preds: Predicate[]; dir?: 'out' | 'in' | 'either'; landsOn?: (n: GNode) => boolean; label: string };
  /**
   * Maximum span in days between the first and last dated edge on the path.
   * Undated edges never fail a window — absence of a date is not evidence of
   * proximity, and pretending otherwise manufactures the finding.
   */
  windowDays?: number;
  note: string;
  innocentReading: string;
  upgradeIf: string;
  killIf: string;
}

export interface MotifInstance {
  path: string[];
  edges: GEdge[];
  /** Days between the earliest and latest dated edge, or null if under-dated. */
  spanDays: number | null;
  /** Weakest tier on the path — a chain is only as good as its weakest link. */
  weakestTier: Tier;
}

export interface MotifResult {
  template: MotifTemplate;
  instances: MotifInstance[];
  census: { members: number; population: number; label: string };
  /** Null-model comparison. Absent when the observed count is zero. */
  significance?: { observed: number; nullMean: number; nullSd: number; zScore: number; pEmpirical: number; shuffles: number };
  /** Verdict, derived — never asserted by hand. */
  verdict: 'not-found' | 'unremarkable' | 'notable' | 'under-powered' | 'degenerate-null';
}

const TIER_RANK: Record<Tier, number> = { documented: 3, reported: 2, alleged: 1, analytic: 0 };

function daysBetween(a: string, b: string): number {
  return Math.abs((Date.parse(a) - Date.parse(b)) / 86400000);
}

function adjacency(edges: GEdge[]) {
  const out = new Map<string, GEdge[]>();
  const inc = new Map<string, GEdge[]>();
  for (const e of edges) {
    if (!out.has(e.s)) out.set(e.s, []);
    if (!inc.has(e.t)) inc.set(e.t, []);
    out.get(e.s)!.push(e);
    inc.get(e.t)!.push(e);
  }
  return { out, inc };
}

/**
 * Enumerate every match of the template.
 *
 * Matches are deduplicated by their edge set, so a step declared `dir: 'either'`
 * cannot count the same relationship twice by traversing it in both directions.
 */
export function matchTemplate(nodes: GNode[], edges: GEdge[], t: MotifTemplate): MotifInstance[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const { out, inc } = adjacency(edges);
  const results: MotifInstance[] = [];
  const seen = new Set<string>();
  const edgeKey = (e: GEdge) => `${e.s}|${e.pred}|${e.t}`;

  const walk = (origin: string, current: string, stepIdx: number, path: string[], used: GEdge[]) => {
    if (stepIdx === t.steps.length) {
      const key = used.map(edgeKey).sort().join('#');
      if (seen.has(key)) return;
      seen.add(key);
      const dates = used.map((e) => e.from ?? e.to).filter(Boolean) as string[];
      const span = dates.length >= 2 ? Math.max(...dates.map((d) => Math.max(...dates.map((o) => daysBetween(d, o))))) : null;
      if (t.windowDays != null && span != null && span > t.windowDays) return;
      const weakest = used.reduce<Tier>((w, e) => (TIER_RANK[e.tier] < TIER_RANK[w] ? e.tier : w), 'documented');
      results.push({ path: [...path], edges: [...used], spanDays: span, weakestTier: weakest });
      return;
    }
    const step = t.steps[stepIdx];
    const departFrom = step.from === 'start' ? origin : current;
    const dir = step.dir ?? 'out';
    const candidates: { e: GEdge; next: string }[] = [];
    if (dir === 'out' || dir === 'either') for (const e of out.get(departFrom) ?? []) candidates.push({ e, next: e.t });
    if (dir === 'in' || dir === 'either') for (const e of inc.get(departFrom) ?? []) candidates.push({ e, next: e.s });

    for (const { e, next } of candidates) {
      if (!step.preds.includes(e.pred)) continue;
      if (next === departFrom) continue; // no self-loops
      if (used.some((u) => edgeKey(u) === edgeKey(e))) continue; // no edge reuse
      const node = byId.get(next);
      if (!node) continue;
      if (step.landsOn && !step.landsOn(node)) continue;
      path.push(next);
      used.push(e);
      walk(origin, next, stepIdx + 1, path, used);
      path.pop();
      used.pop();
    }
  };

  const violatesNegation = (id: string): boolean => {
    const neg = t.mustNotHave;
    if (!neg) return false;
    const dir = neg.dir ?? 'out';
    const candidates: { e: GEdge; other: string }[] = [];
    if (dir === 'out' || dir === 'either') for (const e of out.get(id) ?? []) candidates.push({ e, other: e.t });
    if (dir === 'in' || dir === 'either') for (const e of inc.get(id) ?? []) candidates.push({ e, other: e.s });
    return candidates.some(({ e, other }) => {
      if (!neg.preds.includes(e.pred)) return false;
      const node = byId.get(other);
      return !neg.landsOn || (node ? neg.landsOn(node) : false);
    });
  };

  for (const n of nodes) {
    if (!t.startsAt(n)) continue;
    if (violatesNegation(n.id)) continue;
    walk(n.id, n.id, 0, [n.id], []);
  }
  return results;
}

/**
 * Run a template and score it against a degree-preserving null model.
 *
 * `shuffles` is deliberately modest by default — this runs in the browser, and an
 * under-powered but honest z-score beats a precise one nobody waits for. The
 * shuffle count is reported alongside the score so it can be read correctly.
 */
export function runMotif(nodes: GNode[], edges: GEdge[], t: MotifTemplate, shuffles = 200): MotifResult {
  const instances = matchTemplate(nodes, edges, t);
  const population = nodes.filter(t.startsAt).length;
  const members = new Set(instances.map((i) => i.path[0])).size;

  const census = {
    members,
    population,
    label: `${t.startLabel} in this graph`,
  };

  if (instances.length === 0) {
    return { template: t, instances, census, verdict: 'not-found' };
  }

  // Count paths, not distinct starts, so the null comparison is like-for-like.
  const raw: RawEdge[] = edges.map((e) => ({ s: e.s, t: e.t, pred: e.pred }));
  const nodeIndex = new Map(nodes.map((n) => [n.id, n]));
  const counter = (es: RawEdge[]) => {
    const asEdges: GEdge[] = es.map((e) => ({ s: e.s, t: e.t, pred: e.pred as Predicate, tier: 'documented' }));
    return matchTemplate(nodes, asEdges, { ...t, windowDays: undefined }).length;
  };
  void nodeIndex;

  const sig = motifSignificance(raw, counter, shuffles);

  const verdict: MotifResult['verdict'] =
    // A null model with zero variance has told you nothing. This happens when the
    // degree sequence pins the pattern exactly — e.g. when every award edge in the
    // graph shares one source, so a double-edge swap between two of them returns
    // the same edge set. Say so rather than presenting a meaningless z = 0.00.
    sig.nullSd === 0
      ? 'degenerate-null'
      : population < 10
        ? 'under-powered'
        : Math.abs(sig.zScore) >= 2 && sig.pEmpirical <= 0.05
          ? 'notable'
          : 'unremarkable';

  return { template: t, instances, census, significance: sig, verdict };
}

export const VERDICT_META: Record<MotifResult['verdict'], { label: string; note: string; tone: 'sage' | 'muted' | 'accent' | 'rose' }> = {
  'not-found': {
    label: 'Not found',
    note: 'The pattern does not occur in this graph. A computed motif that can come out empty is the only kind worth trusting.',
    tone: 'muted',
  },
  unremarkable: {
    label: 'Unremarkable',
    note: 'The pattern occurs, but no more often than a degree-preserving rewiring of the same graph produces. It is a property of the network’s shape, not a finding.',
    tone: 'muted',
  },
  notable: {
    label: 'Beyond the null model',
    note: 'The pattern occurs more often than the degree sequence alone explains. That makes it worth investigating — it does not make it evidence of anything in particular.',
    tone: 'accent',
  },
  'under-powered': {
    label: 'Under-powered',
    note: 'Too few candidate entities for a z-score to carry weight. Reported rather than hidden, because a confident number from a tiny population is worse than no number.',
    tone: 'rose',
  },
  'degenerate-null': {
    label: 'Null model degenerate',
    note: 'Every degree-preserving rewiring reproduced the observed count exactly, so the null model has zero variance and can distinguish nothing. This happens when the graph’s topology pins the pattern — for instance when every award edge shares a single ministry as its source, so swapping two of them returns the same edge set. The honest report is that this graph cannot test this pattern, not a z-score of 0.00.',
    tone: 'rose',
  },
};

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

const isCompanyLike = (n: GNode) => n.ty === 'company' || n.ty === 'shell' || n.ty === 'group';
const isPartyLike = (n: GNode) => n.ty === 'party' || n.ty === 'trust' || n.ty === 'fund';

export const TEMPLATES: MotifTemplate[] = [
  {
    id: 'T1',
    name: 'Award then donation',
    tier: 'analytic',
    startsAt: (n) => isCompanyLike(n),
    startLabel: 'companies, shells and groups',
    steps: [
      { preds: ['award'], dir: 'in', label: 'received an award' },
      { preds: ['bond', 'trust', 'direct'], dir: 'out', from: 'start', landsOn: isPartyLike, label: 'and sent money to a party or trust' },
    ],
    note: 'A star centred on one company: it received an award, and it is also a source of political money. Both legs depart from the same entity — this is not a chain.',
    innocentReading:
      'Large industrial groups bid on everything and donate continuously. With enough of both, co-occurrence is guaranteed — and 82.45% of electoral-trust money went to one party regardless of who won anything. Order in the graph is not order in time, and neither is causation.',
    upgradeIf: 'Award winners show this pattern at a materially higher rate than matched non-winners of comparable size in the same sector.',
    killIf: 'A degree-preserving rewiring produces the pattern as often, which would mean the network’s shape explains it entirely.',
  },
  {
    id: 'T2',
    name: 'Money into a fund, benefit out of a ministry',
    tier: 'analytic',
    startsAt: (n) => isCompanyLike(n) || n.ty === 'psu',
    startLabel: 'companies and public-sector undertakings',
    steps: [
      { preds: ['pmin', 'csr'], dir: 'out', label: 'contributed to a fund or CSR recipient' },
      { preds: ['award'], dir: 'in', from: 'start', label: 'and separately received an award' },
    ],
    note: 'A star: an entity that contributed to a fund or CSR recipient and separately received an award.',
    innocentReading:
      'Essentially every responding public-sector undertaking contributed to PM CARES, and CSR spending is compulsory by statute for qualifying companies. Both legs of this pattern are near-universal among large entities, so the conjunction carries almost no information.',
    upgradeIf: 'Contributors show awards at a rate above the base rate among comparable non-contributors.',
    killIf: 'The contribution base rate approaches 100%, which makes the left leg of the pattern uninformative by construction.',
  },
  {
    id: 'T3',
    name: 'Foreign capital into a group holding an award',
    tier: 'analytic',
    startsAt: (n) => n.fam === 'capital' && n.st === null,
    startLabel: 'entities with no Indian registered state (foreign partners)',
    steps: [
      { preds: ['own'], dir: 'out', label: 'holds a stake in' },
      { preds: ['own', 'award'], dir: 'out', label: 'which holds or received' },
    ],
    note: 'Foreign capital two steps from an award or a group entity.',
    innocentReading:
      'Foreign strategic and development-finance investors take stakes in large Indian groups as a matter of ordinary portfolio construction. In the FCI silo case the second-largest beneficiary is funded substantially by Western development finance institutions — which cuts against, not for, a domestic-capture reading.',
    upgradeIf: 'The foreign stake postdates the award and cannot be explained by the investor’s general India allocation.',
    killIf: 'The same investors hold comparable stakes in groups with no awards.',
  },
  {
    id: 'T4',
    name: 'Denial attached to a claim',
    tier: 'documented',
    startsAt: () => true,
    startLabel: 'all entities',
    steps: [{ preds: ['contra'], dir: 'either', label: 'denies or contradicts' }],
    note: 'Every denial or counter-evidence edge in the graph. Counted so that the ratio of claims to captured denials is visible.',
    innocentReading:
      'This motif is not an allegation pattern at all — it is an audit of whether the graph is doing its job. A graph carrying allegations with no denials attached is failing the contradiction invariant.',
    upgradeIf: 'Not applicable — this is an integrity measure.',
    killIf: 'Not applicable — this is an integrity measure.',
  },
  {
    id: 'T5',
    name: 'Donation coverage gaps',
    tier: 'analytic',
    startsAt: (n) => isCompanyLike(n),
    startLabel: 'companies, shells and groups',
    steps: [{ preds: ['award'], dir: 'in', label: 'received an award' }],
    mustNotHave: {
      preds: ['bond', 'trust', 'direct'],
      dir: 'out',
      landsOn: isPartyLike,
      label: 'and has no displayed donation edge in this graph',
    },
    note: 'Award recipients without displayed donation links in this collection. Missing graph links are coverage gaps, not evidence of zero donations.',
    innocentReading:
      'This collection is incomplete. A missing or held relationship cannot establish that donations did not occur, nor imply hidden payments. The Adani universal-absence claim is held for source-scope correction.',
    upgradeIf: 'Review the relevant donor entities, channels and periods against original filings before making any donation-history claim.',
    killIf: 'A sourced donation edge changes this graph-coverage result; it does not by itself establish an all-channel donation history.',
  },
];
