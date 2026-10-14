/**
 * Merge the research-fleet graphs into the national graph.
 *
 * A pure function, outside the React tree, so the rules can be tested without
 * rendering anything and every consumer merges the same way:
 *
 *   - Nodes: the base graph is kept as it is, then fleet nodes are appended in the
 *     order given, and the FIRST record of an id wins. A fleet that reuses `co:ntpc`
 *     or `pol:…` extends the existing node through its edges; it never replaces the
 *     sourced roster record.
 *   - Base duplicates: the base is two hand-kept sources (the Atlas and the derived
 *     roster) and may name one entity twice under one id (`co:larsen-toubro`). Those
 *     records are one node: the first record's typing and label stand, the later
 *     record's aliases, facts and sources are appended. Neither input is mutated.
 *   - Edges: de-duplicated on `s|pred|t|id`, so two distinct claims between the same
 *     pair both survive while a repeated claim does not.
 *   - Held edges: a fleet edge whose endpoint is not a node in the merged graph is
 *     returned in `heldEdges`, never in `edges`. That is how a denial answering
 *     `claim:<id>` arrives, and a renderer must not be handed a dangling link.
 */

import type { GEdge, GNode } from './schema';

export interface GraphPart {
  nodes: GNode[];
  edges: GEdge[];
}

export interface MergedGraph extends GraphPart {
  heldEdges: GEdge[];
}

const edgeKey = (e: GEdge) => `${e.s}|${e.pred}|${e.t}|${e.id ?? ''}`;

const union = <T,>(a: T[] | undefined, b: T[] | undefined): T[] | undefined => {
  if (!a && !b) return undefined;
  const seen = new Set((a ?? []).map((x) => JSON.stringify(x)));
  return [...(a ?? []), ...(b ?? []).filter((x) => !seen.has(JSON.stringify(x)))];
};

/** Two base records of one id, folded: first typing, unioned aliases, facts and sources. */
function foldBase(first: GNode, later: GNode): GNode {
  return { ...first, al: union(first.al, later.al), d: union(first.d, later.d), srcs: union(first.srcs, later.srcs) };
}

export function mergeFleet(base: GraphPart, fleets: GraphPart[]): MergedGraph {
  const nodes: GNode[] = [];
  const at = new Map<string, number>();
  for (const n of base.nodes) {
    const i = at.get(n.id);
    if (i === undefined) {
      at.set(n.id, nodes.length);
      nodes.push(n);
    } else {
      nodes[i] = foldBase(nodes[i], n);
    }
  }
  const edges = [...base.edges];
  const nodeIds = new Set(nodes.map((n) => n.id));
  for (const f of fleets) {
    for (const n of f.nodes) {
      if (nodeIds.has(n.id)) continue;
      nodeIds.add(n.id);
      nodes.push(n);
    }
  }
  // Edges are placed only after every fleet's nodes are in, so an energy claim may
  // land on a welfare scheme node.
  const seen = new Set(edges.map(edgeKey));
  const heldEdges: GEdge[] = [];
  for (const f of fleets) {
    for (const e of f.edges) {
      const k = edgeKey(e);
      if (seen.has(k)) continue;
      seen.add(k);
      if (nodeIds.has(e.s) && nodeIds.has(e.t)) edges.push(e);
      else heldEdges.push(e);
    }
  }
  return { nodes, edges, heldEdges };
}
