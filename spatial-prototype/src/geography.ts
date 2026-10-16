import areaData from "./assets/geography/evidence-area-anchors.json";
import worldData from "./assets/geography/world-countries-50m.json";
import tamilNaduData from "./assets/geography/tamil-nadu-wgs84.json";
import geographySources from "./assets/geography/geography-sources.json";
import type { SceneNode, PreviewData } from "./model";
import type { InvestigationGeography } from "./domain";

export interface GeoAnchor {
  lng: number;
  lat: number;
  precision: "country" | "state" | "city" | "site";
  basis: string;
  label: string;
  /** Original evidence citations supporting the area/context, not a site address. */
  sourceIds: string[];
  /** Conservative display radius to the furthest polygon vertex, not a statistical confidence interval. */
  uncertaintyKm: number;
  bounds?: [number, number, number, number];
  areaCode: string;
  geometrySourceId: string;
  geometrySourceUrl: string;
  /** Requested focus scale and hard evidence-driven zoom cap. Never infer a building. */
  focusZoom: number;
  maxEvidenceZoom: number;
  representativeOnly: boolean;
}
export interface GeographicNode extends SceneNode {
  anchor: GeoAnchor;
}
export interface GeographicScene extends Omit<PreviewData, "nodes"> {
  nodes: GeographicNode[];
  unplacedNodes: SceneNode[];
  unplacedReasons: Record<string, string>;
  projection: "EPSG:3857";
  worldWidth: number;
}
export interface GeographicFeature {
  type: "Feature";
  id: string;
  properties: {
    name: string;
    iso2?: string;
    iso3?: string;
    code?: string;
    lgdCode?: number;
  };
  bbox: [number, number, number, number];
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
}
export interface GeographicCollection {
  type: "FeatureCollection";
  features: GeographicFeature[];
}
export const WORLD_COUNTRIES = worldData as GeographicCollection;
export const TAMIL_NADU_BOUNDARY =
  tamilNaduData as unknown as GeographicCollection;
export const GEOGRAPHY_SOURCES = geographySources.sources;
export const MERCATOR_MAX_LATITUDE = 85.0511287798066;
export const GEOGRAPHIC_CAVEAT =
  "One continuous Web Mercator world. Evidence markers represent only their documented country or state context, never verified headquarters, project sites or cash destinations. Area representatives overlap deliberately; nearby buildings have no inferred evidence connection. Unknown or multi-area evidence is not assigned a false point. Natural Earth country boundaries are generalized and use de facto control; disputed borders are not adjudicated.";

interface Area {
  code: string;
  name: string;
  precision: "country" | "state";
  lng: number;
  lat: number;
  bounds: [number, number, number, number];
  uncertaintyKm: number;
  geometrySourceId: string;
  centerMethod: string;
}
const areas = new Map((areaData as Area[]).map((area) => [area.code, area]));
/** In this original India investigation namespace, "national-context" means India.
 * This is an explicit dataset-semantic crosswalk, not a name/HQ heuristic. No other
 * namespace or unknown geography inherits a country, and source objects stay intact.
 */
export const NATIONAL_CONTEXT_CROSSWALK: Readonly<Record<string, string>> =
  Object.freeze({
    "atlas-international-finance": "IN",
  });

function areaForGeography(
  geo: InvestigationGeography,
  namespace: string,
): string | null {
  if (geo.scope === "unknown" || geo.basis === "unknown") return null;
  const countryCodes = [...new Set(geo.countryCodes ?? [])];
  const stateCodes = [...new Set(geo.stateCodes)];
  // A locality, city or project name does not establish a coordinate. Keep the
  // coarser explicitly retained state if available; never geocode a label.
  if (
    stateCodes.length === 1 &&
    stateCodes[0] === "TN" &&
    (countryCodes.length === 0 ||
      (countryCodes.length === 1 && countryCodes[0] === "IN"))
  )
    return "IN-TN";
  if (stateCodes.length > 0) return null;
  if (countryCodes.length === 1 && areas.has(countryCodes[0]))
    return countryCodes[0];
  if (countryCodes.length > 1) return null;
  if (geo.scope === "national" && geo.basis === "national-context")
    return NATIONAL_CONTEXT_CROSSWALK[namespace] ?? null;
  return null;
}

/** Return a single source-qualified area representative, or null rather than
 * picking an arbitrary country, guessing a headquarters or spreading duplicates.
 */
export function getNodeAnchor(node: SceneNode): GeoAnchor | null {
  const geographies = node.item.geography;
  if (!geographies.length) return null;
  const candidates = geographies.map((geo) =>
    areaForGeography(geo, node.item.namespace),
  );
  if (candidates.some((candidate) => candidate === null)) return null;
  const areaCodes = [...new Set(candidates)];
  if (areaCodes.length !== 1 || areaCodes[0] === null) return null;
  const area = areas.get(areaCodes[0]);
  if (!area) return null;
  const sourceIds = [...new Set(geographies.flatMap((geo) => geo.sourceIds))];
  if (!sourceIds.length) return null;
  const source = GEOGRAPHY_SOURCES.find(
    (source) => source.id === area.geometrySourceId,
  );
  const geometrySourceUrl =
    source && "url" in source
      ? source.url
      : source && "sourceUrl" in source
        ? source.sourceUrl
        : "";
  const focusZoom = area.precision === "country" ? 4 : 7;
  return {
    lng: area.lng,
    lat: area.lat,
    precision: area.precision,
    basis: `${[...new Set(geographies.map((geo) => geo.basis))].join(", ")}; source-bound ${area.precision} context; ${area.centerMethod}`,
    label: `${area.name} ${area.precision} context · representative area center, not a verified site or address`,
    sourceIds,
    uncertaintyKm: area.uncertaintyKm,
    bounds: [...area.bounds],
    areaCode: area.code,
    geometrySourceId: area.geometrySourceId,
    geometrySourceUrl: geometrySourceUrl ?? "",
    focusZoom,
    maxEvidenceZoom: focusZoom,
    representativeOnly: true,
  };
}

export function getUnplacedReason(node: SceneNode): string {
  if (getNodeAnchor(node)) return "";
  if (
    node.item.geography.some(
      (geo) => (geo.countryCodes?.length ?? 0) > 1 || geo.stateCodes.length > 1,
    )
  )
    return "Multiple geographic areas are recorded; no single point or endpoint is asserted.";
  return "No unambiguous source-supported coordinate or supported area context is retained. No location has been guessed.";
}

/** Rectangular, continuous Web Mercator, with X east, Z south and Y up.
 * A normalized world is square at the standard ±85.0511° polar limit. No per-country
 * rotation, island layout, cluster offset, random jitter or longitude wrapping.
 */
export function projectLngLat(
  lng: number,
  lat: number,
  worldWidth = 60,
): [number, number, number] {
  if (
    !Number.isFinite(lng) ||
    !Number.isFinite(lat) ||
    lng < -180 ||
    lng > 180 ||
    lat < -90 ||
    lat > 90 ||
    !Number.isFinite(worldWidth) ||
    worldWidth <= 0
  )
    throw new RangeError("Invalid geographic coordinate or world width");
  const clippedLat = Math.max(
    -MERCATOR_MAX_LATITUDE,
    Math.min(MERCATOR_MAX_LATITUDE, lat),
  );
  const sin = Math.sin((clippedLat * Math.PI) / 180);
  const normalizedY = 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI);
  return [(lng / 360) * worldWidth, 0.35, (normalizedY - 0.5) * worldWidth];
}

export function getGeographicScene(
  preview: PreviewData,
  worldWidth = 60,
): GeographicScene {
  const nodes: GeographicNode[] = [];
  const unplacedNodes: SceneNode[] = [];
  const unplacedReasons: Record<string, string> = {};
  for (const node of preview.nodes) {
    const anchor = getNodeAnchor(node);
    if (!anchor) {
      unplacedNodes.push(node);
      unplacedReasons[node.id] = getUnplacedReason(node);
      continue;
    }
    nodes.push({
      ...node,
      anchor,
      cluster: anchor.areaCode,
      position: projectLngLat(anchor.lng, anchor.lat, worldWidth),
    });
  }
  const ids = new Set(nodes.map((node) => node.id));
  return {
    ...preview,
    nodes,
    edges: preview.edges.filter(
      (edge) => ids.has(edge.from) && ids.has(edge.to),
    ),
    // No narrative zones survive into the geographic scene.
    clusters: [],
    unplacedNodes,
    unplacedReasons,
    projection: "EPSG:3857",
    worldWidth,
    caveat: GEOGRAPHIC_CAVEAT,
  };
}
