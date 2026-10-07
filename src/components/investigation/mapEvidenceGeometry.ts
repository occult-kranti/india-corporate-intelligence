import type { MapEvidenceScene, MapEvidenceSelection } from '../../data/mapEvidence';
import boundaries from './assets/india-current36-bounds.json';

/** Display anchors locate aggregates, never people, incidents or payments. */
export function buildMapEvidenceGeometry(scene: MapEvidenceScene | undefined, selection: MapEvidenceSelection | null) {
  const coordinates = new Map<string, [number, number]>();
  for (const hub of scene?.stateHubs ?? []) {
    const boundary = boundaries.find(row => row.code === hub.stateCode);
    if (boundary) coordinates.set(hub.id, boundary.schematicHub as [number, number]);
  }
  for (const site of scene?.sites ?? []) coordinates.set(site.id, [site.lon, site.lat]);
  const entityId = selection?.kind === 'entity' ? selection.id : scene?.selectedEntityId;
  const placementId = selection?.kind === 'state' || selection?.kind === 'site' ? selection.id : scene?.selectedPlacementId;
  const incident = (trail: NonNullable<MapEvidenceScene>['trails'][number]) =>
    (selection?.kind === 'relationship' && selection.id === trail.id) ||
    (!!entityId && (trail.fromEntityId === entityId || trail.toEntityId === entityId)) ||
    (!!placementId && [...trail.fromPlacementIds, ...trail.toPlacementIds].includes(placementId));
  const selectedPlacementIds = new Set<string>(placementId ? [placementId] : []);
  let ambiguous = 0, withinHub = 0;
  const trails = [];
  for (const trail of scene?.trails ?? []) {
    const highlighted = incident(trail);
    if (highlighted) [...trail.fromPlacementIds, ...trail.toPlacementIds].forEach(id => selectedPlacementIds.add(id));
    const from = trail.fromPlacementId && coordinates.get(trail.fromPlacementId);
    const to = trail.toPlacementId && coordinates.get(trail.toPlacementId);
    if (!from || !to) { ambiguous++; continue; }
    if (from[0] === to[0] && from[1] === to[1]) { withinHub++; continue; }
    trails.push({ ...trail, from, to, highlighted });
  }
  return { coordinates, trails, ambiguous, withinHub, selectedPlacementIds };
}
