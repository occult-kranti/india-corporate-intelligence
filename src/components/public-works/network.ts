import type { PublicWorksEntity, PublicWorksRelationship, PublicWorksSource } from '../../data/publicWorks';

/** Traversal treats a recorded relationship as adjacent in either direction.
 * This is discovery topology only: the original direction always stays on edges. */
export function publicWorksNeighbourhood(nodes: PublicWorksEntity[], edges: PublicWorksRelationship[], selectedId: string, hops: 1 | 2) {
  const available = new Set(nodes.filter(node => node.resolved).map(node => node.id));
  const validEdges = edges.filter(edge => available.has(edge.from) && available.has(edge.to));
  if (!selectedId || !available.has(selectedId)) return { nodes: nodes.filter(node => node.resolved), edges: validEdges, invalidSelection: !!selectedId };
  const keep = new Set([selectedId]);
  let frontier = new Set([selectedId]);
  for (let step = 0; step < hops; step++) {
    const next = new Set<string>();
    for (const edge of validEdges) {
      if (frontier.has(edge.from) && !keep.has(edge.to)) next.add(edge.to);
      if (frontier.has(edge.to) && !keep.has(edge.from)) next.add(edge.from);
    }
    for (const id of next) keep.add(id);
    frontier = next;
  }
  return { nodes: nodes.filter(node => node.resolved && keep.has(node.id)), edges: validEdges.filter(edge => keep.has(edge.from) && keep.has(edge.to)), invalidSelection: false };
}

export function relationshipDate(edge: PublicWorksRelationship) {
  if (edge.fromDate && edge.toDate && edge.fromDate === edge.toDate) return edge.fromDate;
  if (edge.fromDate && edge.toDate) return `${edge.fromDate} to ${edge.toDate}`;
  if (edge.fromDate) return `From ${edge.fromDate}; end not established`;
  if (edge.toDate) return `Start not established; to ${edge.toDate}`;
  return 'Relationship dates not established';
}

/** A direction is grammatical (holder → office, owner → company), not necessarily money. */
export function relationshipIsDirected(kind: string) {
  return !['family', 'related', 'association', 'comparison', 'analytic'].includes(kind);
}

const csvCell = (value: unknown) => {
  let text = value == null ? '' : String(value);
  if (/^[\s]*[=+@-]/u.test(text)) text = `'${text}`;
  return `"${text.replace(/"/gu, '""')}"`;
};
export function publicWorksNetworkCsv(nodes: PublicWorksEntity[], edges: PublicWorksRelationship[], sources: PublicWorksSource[]) {
  const nodeById = new Map(nodes.map(node => [node.id, node]));
  const sourceById = new Map(sources.map(source => [source.id, source]));
  const header = ['relationship_id', 'from_id', 'from_label', 'from_identity_basis', 'kind', 'direction', 'to_id', 'to_label', 'to_identity_basis', 'evidence_tier', 'from_date', 'to_date', 'summary', 'limitations', 'source_ids', 'source_urls', 'source_publication_dates', 'source_observation_periods', 'source_locators', 'source_retrieval_status', 'source_retrieved_at'];
  const rows = edges.map(edge => [edge.id, edge.from, nodeById.get(edge.from)?.label, nodeById.get(edge.from)?.identityBasis, edge.kind, relationshipIsDirected(edge.kind) ? 'from-to' : 'undirected', edge.to, nodeById.get(edge.to)?.label, nodeById.get(edge.to)?.identityBasis, edge.tier, edge.fromDate, edge.toDate, edge.summary, edge.limitations.join(' | '), edge.sourceIds.join(' | '), edge.sourceIds.map(id => sourceById.get(id)?.url ?? '').join(' | '), edge.sourceIds.map(id => sourceById.get(id)?.publishedAt ?? 'unknown').join(' | '), edge.sourceIds.map(id => sourceById.get(id)?.period ?? 'unknown').join(' | '), edge.sourceIds.map(id => sourceById.get(id)?.locator ?? 'unknown').join(' | '), edge.sourceIds.map(id => sourceById.get(id)?.retrievalStatus ?? 'unknown').join(' | '), edge.sourceIds.map(id => sourceById.get(id)?.retrievedAt ?? 'unknown').join(' | ')]);
  return [header, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
}
