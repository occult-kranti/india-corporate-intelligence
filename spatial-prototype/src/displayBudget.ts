import type { PreviewData, SceneEdge, SceneNode } from "./model";
import { getNodeAnchor, type GeoAnchor } from "./geography";
export const MAX_THREAD_MESHES = 60;
export interface AreaGroup {
  anchor: GeoAnchor;
  records: SceneNode[];
}
/** One paper group per documented area; representative original edges, never invented aggregate links. */
export function planGeographicDisplay(data: PreviewData, selected = "") {
  const anchors = new Map<string, GeoAnchor>();
  const groups = new Map<string, AreaGroup>();
  for (const node of data.nodes) {
    const anchor = getNodeAnchor(node);
    if (!anchor) continue;
    anchors.set(node.id, anchor);
    const prior = groups.get(anchor.areaCode);
    if (prior) prior.records.push(node);
    else groups.set(anchor.areaCode, { anchor, records: [node] });
  }
  const candidates = data.edges.filter((edge) => {
    const from = anchors.get(edge.from),
      to = anchors.get(edge.to);
    return from && to && from.areaCode !== to.areaCode;
  });
  const rendered: SceneEdge[] = [];
  const seen = new Set<string>();
  const add = (edge: SceneEdge) => {
    const from = anchors.get(edge.from)!,
      to = anchors.get(edge.to)!;
    const key = JSON.stringify([
      from.areaCode,
      to.areaCode,
      edge.relationship.layers[0],
    ]);
    if (seen.has(key) || rendered.length >= MAX_THREAD_MESHES) return;
    seen.add(key);
    rendered.push(edge);
  };
  const active = candidates.find((edge) => edge.id === selected);
  if (active) add(active);
  for (const edge of candidates) add(edge);
  return { anchors, groups, candidates, rendered };
}
