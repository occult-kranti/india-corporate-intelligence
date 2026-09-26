/**
 * ICIP knowledge-graph schema.
 *
 * The graph is durable, provenance-bearing shared memory. Every edge is a sourced
 * claim with an evidence tier. Facts are superseded, never deleted. Denials are
 * first-class. Entities are resolved to canonical nodes with aliases.
 *
 * The invariants below are enforced by `scripts/validate.mjs`, which CI runs.
 * They are not conventions.
 */

export type Source = [label: string, url: string];

export type StateCode =
  | 'an' | 'ap' | 'ar' | 'as' | 'br' | 'ch' | 'ct' | 'dn' | 'dd' | 'dl'
  | 'ga' | 'gj' | 'hr' | 'hp' | 'jk' | 'jh' | 'ka' | 'kl' | 'ld' | 'mp'
  | 'mh' | 'mn' | 'ml' | 'mz' | 'nl' | 'or' | 'py' | 'pb' | 'rj' | 'sk'
  | 'tn' | 'tg' | 'tr' | 'up' | 'ut' | 'wb';

// ---------------------------------------------------------------------------
// Evidence tiers — the grounding layer
// ---------------------------------------------------------------------------

export type Tier = 'documented' | 'reported' | 'alleged' | 'analytic';

export interface TierMeta {
  id: Tier;
  label: string;
  bar: string;
  /** SVG stroke-dasharray. Semantic, not decorative — never restyle for looks. */
  dash: string;
  colorVar: string;
  weight: number;
}

export const TIERS: Record<Tier, TierMeta> = {
  documented: {
    id: 'documented',
    label: 'Documented',
    bar: 'A primary record says so — gazette, filing, court order, audit report, RTI reply, official portal. Or two independent credible sources.',
    dash: '',
    colorVar: '--tier-documented',
    weight: 1,
  },
  reported: {
    id: 'reported',
    label: 'Reported',
    bar: 'A credible outlet with named sourcing or published underlying documents. Not yet in a primary record.',
    dash: '6 3',
    colorVar: '--tier-reported',
    weight: 0.7,
  },
  alleged: {
    id: 'alleged',
    label: 'Alleged',
    bar: 'A named party asserts it. Attributed and unproven. Ships with the denial alongside.',
    dash: '2 4',
    colorVar: '--tier-alleged',
    weight: 0.45,
  },
  analytic: {
    id: 'analytic',
    label: 'Analytic',
    bar: 'Our own comparison or inference. Carries no causal claim and no implication of wrongdoing. Ships with an innocent reading.',
    dash: '8 3 2 3',
    colorVar: '--tier-analytic',
    weight: 0.3,
  },
};

export const TIER_ORDER: Tier[] = ['documented', 'reported', 'alleged', 'analytic'];

// ---------------------------------------------------------------------------
// Nodes
// ---------------------------------------------------------------------------

export type NodeType =
  | 'ministry' | 'psu' | 'agency' | 'company' | 'shell' | 'person'
  | 'party' | 'fund' | 'trust' | 'sangh' | 'law' | 'mechanism'
  | 'state' | 'industry' | 'exchange' | 'group';

/** Drives hue. Three orthogonal visual channels: ty→shape, fam→hue, sz→size. */
export type NodeFamily =
  | 'state'      // public power: ministries, agencies, politicians, parties
  | 'capital'    // private capital: companies, groups, promoters
  | 'recipient'  // where money lands: trusts, funds, NGOs
  | 'instrument' // mechanisms: bonds, laws, tender rules
  | 'enforce'    // regulators, auditors, courts
  | 'market';    // exchanges, sectors, geography

export interface GNode {
  id: string;
  label: string;
  sub?: string;
  ty: NodeType;
  fam: NodeFamily;
  /** Map state; null means the node is network-only (persons, laws, mechanisms). */
  st?: StateCode | null;
  sz: 1 | 2 | 3 | 4;
  /** Aliases — the entity-resolution surface. Search and dedupe run over this. */
  al?: string[];
  /**
   * false = identity not confirmed against DIN / constituency / office / DOB.
   * Unresolved nodes render with a warning and MAY NOT be an endpoint of any edge.
   * Name matching at scale is a defamation generator, not a network graph.
   */
  resolved?: boolean;
  collisionRisk?: string;
  d?: string[];
  srcs?: Source[];
}

// ---------------------------------------------------------------------------
// Edges
// ---------------------------------------------------------------------------

export type Predicate =
  | 'award'     // contract, block, licence awarded
  | 'bond'      // electoral bond purchase
  | 'trust'     // electoral trust routing
  | 'direct'    // direct declared donation
  | 'pmin'      // money into a fund
  | 'pmout'     // money out of a fund
  | 'csr'       // CSR disbursement
  | 'own'       // ownership / shareholding
  | 'family'    // family relation
  | 'role'      // office, directorship, portfolio
  | 'law'       // statute or rule governs
  | 'enforce'   // investigation, proceeding, audit
  | 'hq'        // registered headquarters in state
  | 'listed'    // listed on exchange
  | 'sector'    // belongs to sector
  | 'contra'    // DENIAL or counter-evidence — first-class, never suppressed
  | 'supersede' // fact update — target is RETAINED and addressable
  | 'analytic'  // non-causal comparison
  | 'loan'      // lender → borrower; a = ₹ crore at the source's rate (stated in d); terms carry conditions
  | 'grant';    // donor → recipient association; a = ₹ crore for the FY named in d

/**
 * A loan's terms as the lender's document states them. Every field is optional —
 * only what the source says is recorded — and a number the source does not give is
 * null, never 0.
 */
export interface LoanTerms {
  /** The lender's instrument name, verbatim (IPF, PforR, DPL, sovereign loan…); null when the source does not name it. */
  instrument?: string | null;
  ratePct?: number | null;
  tenorYears?: number | null;
  graceYears?: number | null;
  /** Conditions attached to the money, one per entry, as the source words them. */
  conditions?: string[];
}

export interface GEdge {
  id?: string;
  s: string;
  t: string;
  pred: Predicate;
  tier: Tier;
  /** ₹ crore. 0 or undefined when not monetary. */
  a?: number;
  lab?: string;
  d?: string;
  /** ISO dates bounding the window in which this edge is true. */
  from?: string;
  to?: string;
  srcs?: Source[];
  /** REQUIRED when tier === 'analytic' — the boring explanation that also fits. */
  innocentReading?: string;
  upgradeIf?: string;
  killIf?: string;
  /** Set when this edge has been replaced. The edge itself is retained. */
  supersededBy?: string;
  m?: string[];
  /** `loan` (and any claim whose source states terms): the terms as written. */
  terms?: LoanTerms;
}

// ---------------------------------------------------------------------------
// Motifs — computed from patterns, never hand-tagged
// ---------------------------------------------------------------------------

export interface MotifCensus {
  /** How many entities in the population match the pattern. */
  members: number;
  /** The population the numerator is drawn from. A numerator alone is not a finding. */
  population: number;
  /**
   * What the denominator actually is. A within-subgraph census is NOT a base rate
   * against the national population — saying which one this is prevents the most
   * common way a census gets over-read.
   */
  label?: string;
}

export interface Motif {
  id: string;
  name: string;
  tier: Tier;
  /** Declarative path pattern over typed edges + time window. */
  pattern: string;
  note: string;
  /** REQUIRED. The boring explanation that also fits the data. */
  innocentReading: string;
  census: MotifCensus;
  /** vs a degree-preserving null model, >= 1000 rewirings. Absent = not yet tested. */
  zScore?: number;
  upgradeIf?: string;
  killIf?: string;
}

// ---------------------------------------------------------------------------
// The invariant
// ---------------------------------------------------------------------------

/**
 * Every edge carries sources OR is tier alleged/analytic.
 * This is the single rule the whole project rests on.
 */
export function hasProvenance(e: GEdge): boolean {
  return (e.srcs?.length ?? 0) > 0 || e.tier === 'alleged' || e.tier === 'analytic';
}

export function edgeId(e: GEdge, i = 0): string {
  return e.id ?? `${e.s}~${e.pred}~${e.t}~${i}`;
}

export interface GraphIssue {
  level: 'error' | 'warn';
  where: string;
  message: string;
}

/** Shared by the build-time validator and the in-app integrity panel. */
export function validateGraph(nodes: GNode[], edges: GEdge[], motifs: Motif[] = []): GraphIssue[] {
  const issues: GraphIssue[] = [];
  const byId = new Map<string, GNode>();
  const aliasOwner = new Map<string, string>();

  for (const n of nodes) {
    if (byId.has(n.id)) {
      issues.push({ level: 'error', where: `node:${n.id}`, message: 'duplicate node id' });
    }
    byId.set(n.id, n);
  }

  for (const n of nodes) {
    for (const a of n.al ?? []) {
      const key = a.trim().toLowerCase();
      const prior = aliasOwner.get(key);
      if (prior && prior !== n.id) {
        issues.push({
          level: 'error',
          where: `node:${n.id}`,
          message: `alias "${a}" already claimed by node "${prior}" — resolve the collision before drawing edges`,
        });
      }
      aliasOwner.set(key, n.id);
      const clash = byId.get(key);
      if (clash && clash.id !== n.id) {
        issues.push({ level: 'error', where: `node:${n.id}`, message: `alias "${a}" collides with node id "${clash.id}"` });
      }
    }
    if (n.resolved === false && !n.collisionRisk) {
      issues.push({ level: 'warn', where: `node:${n.id}`, message: 'unresolved node should explain its collisionRisk' });
    }
  }

  const seenEdge = new Set<string>();
  edges.forEach((e, i) => {
    const id = edgeId(e, i);
    if (seenEdge.has(id)) issues.push({ level: 'warn', where: `edge:${id}`, message: 'duplicate edge id' });
    seenEdge.add(id);

    if (!hasProvenance(e)) {
      issues.push({
        level: 'error',
        where: `edge:${id}`,
        message: 'PROVENANCE INVARIANT: edge has no srcs and is not tier alleged/analytic',
      });
    }
    if (e.tier === 'analytic' && !e.innocentReading) {
      issues.push({ level: 'error', where: `edge:${id}`, message: 'analytic edge must carry an innocentReading' });
    }
    if (!TIER_ORDER.includes(e.tier)) {
      issues.push({ level: 'error', where: `edge:${id}`, message: `unknown tier "${e.tier}"` });
    }
    for (const side of ['s', 't'] as const) {
      const target = byId.get(e[side]);
      if (!target) {
        issues.push({ level: 'error', where: `edge:${id}`, message: `endpoint "${e[side]}" does not resolve to a node` });
      } else if (target.resolved === false) {
        issues.push({
          level: 'error',
          where: `edge:${id}`,
          message: `endpoint "${e[side]}" is unresolved — unresolved entities take no edges`,
        });
      }
    }
    if (e.pred === 'supersede' && !byId.has(e.t)) {
      issues.push({ level: 'error', where: `edge:${id}`, message: 'supersede target must remain addressable' });
    }
    if (e.tier === 'alleged' && !e.srcs?.length && !e.d) {
      issues.push({ level: 'warn', where: `edge:${id}`, message: 'alleged edge should name who alleges it' });
    }
  });

  for (const m of motifs) {
    if (!m.innocentReading) {
      issues.push({ level: 'error', where: `motif:${m.id}`, message: 'motif must carry an innocentReading' });
    }
    if (!m.census || m.census.population <= 0) {
      issues.push({
        level: 'error',
        where: `motif:${m.id}`,
        message: 'motif census needs population > 0 — a numerator without a denominator is not a finding',
      });
    }
  }

  return issues;
}
