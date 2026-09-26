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

export function mergeFleet(base: GraphPart, fleets: GraphPart[]): MergedGraph {
  const nodes = [...base.nodes];
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
