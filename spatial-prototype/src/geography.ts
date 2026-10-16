import areaData from "./assets/geography/evidence-area-anchors.json";
import geographySources from "./assets/geography/geography-sources.json";
import nationalContextData from "./assets/geography/national-context-crosswalk.json";
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
  geometryFeatureId: string;
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
export const GEOGRAPHY_SOURCES = geographySources.sources;
export const MERCATOR_MAX_LATITUDE = 85.0511287798066;
export const GEOGRAPHIC_CAVEAT =
  "One continuous Web Mercator world. Evidence markers represent only their documented country or state context, never verified headquarters, project sites or cash destinations. Area representatives overlap deliberately; nearby buildings have no inferred evidence connection. Unknown or multi-area evidence is not assigned a false point. Natural Earth country boundaries are generalized and use de facto control. India state boundaries retain upstream territorial claims and an unestablished boundary snapshot date; disputed borders are not adjudicated.";

interface Area {
  code: string;
  name: string;
  precision: "country" | "state";
  lng: number;
  lat: number;
  bounds: [number, number, number, number];
  uncertaintyKm: number;
  geometrySourceId: string;
  geometryFeatureId: string;
  centerMethod: string;
}
const areas = new Map((areaData as Area[]).map((area) => [area.code, area]));
/** A bounded semantic crosswalk for reviewed source namespaces in the original
 * India registry. Source paths, hashes and rationales are retained independently.
 * This translates national case context, never a publisher, regulator or lender HQ.
 * No prefix, name, missing geography or future namespace inherits a country.
 */
export const NATIONAL_CONTEXT_PROVENANCE = nationalContextData;
export const NATIONAL_CONTEXT_CROSSWALK: Readonly<Record<string, string>> =
  Object.freeze(
    Object.fromEntries(
      nationalContextData.entries.map((entry) => [
        entry.namespace,
        entry.countryCode,
      ]),
    ),
  );

function areaForGeography(
  geo: InvestigationGeography,
  namespace: string,
): string | null {
  if (geo.scope === "unknown" || geo.basis === "unknown") return null;
  // Each contributing geography needs its own citations. A cited sibling may
  // not silently rescue an uncited geography, even when the area codes agree.
  if (!geo.sourceIds.length || geo.sourceIds.some((id) => !id.trim()))
    return null;
  const countryCodes = [...new Set(geo.countryCodes ?? [])];
  const stateCodes = [...new Set(geo.stateCodes)];
  if (
    countryCodes.length > 1 ||
    stateCodes.length > 1 ||
    geo.scope === "multi-state"
  )
    return null;
  // Contradictory foreign-country / Indian-state qualifiers remain unresolved.
  if (stateCodes.length && countryCodes.length && countryCodes[0] !== "IN")
    return null;
  if (stateCodes.length === 1 && !areas.has(`IN-${stateCodes[0]}`)) return null;
  // Country scope/basis is a precision ceiling even when a state tag is retained.
  if (geo.scope === "country" || geo.basis === "country-context")
    return countryCodes.length === 1 && areas.has(countryCodes[0])
      ? countryCodes[0]
      : null;
  // National scope cannot be strengthened by a state tag on the same source.
  if (geo.scope === "national" || geo.basis === "national-context") {
    if (geo.scope !== "national" || geo.basis !== "national-context")
      return null;
    if (countryCodes.length === 1)
      return areas.has(countryCodes[0]) ? countryCodes[0] : null;
    const code = NATIONAL_CONTEXT_CROSSWALK[namespace];
    return code && areas.has(code) ? code : null;
  }
  // A city, locality or project name supplies no coordinate. Retain only an
  // explicitly recorded modern India state code, without aliasing boundary eras.
  if (stateCodes.length === 1) {
    const code = `IN-${stateCodes[0]}`;
    return areas.has(code) ? code : null;
  }
  if (countryCodes.length === 1 && areas.has(countryCodes[0]))
    return countryCodes[0];
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
    basis: `${[...new Set(geographies.map((geo) => geo.basis))].join(", ")}; source-bound ${area.precision} context; ${geographySources.representativeMethod}`,
    label: `${area.name} ${area.precision} context · representative area point, not a verified site or address`,
    sourceIds,
    uncertaintyKm: area.uncertaintyKm,
    bounds: [...area.bounds],
    areaCode: area.code,
    geometrySourceId: area.geometrySourceId,
    geometryFeatureId: area.geometryFeatureId,
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
      (geo) =>
        new Set(geo.countryCodes ?? []).size > 1 ||
        new Set(geo.stateCodes).size > 1 ||
        geo.scope === "multi-state",
    ) ||
    new Set(
      node.item.geography
        .map((geo) => areaForGeography(geo, node.item.namespace))
        .filter(Boolean),
    ).size > 1
  )
    return "Multiple geographic areas are recorded; no single point or endpoint is asserted.";
  if (
    node.item.geography.some(
      (geo) => !geo.sourceIds.length || geo.sourceIds.some((id) => !id.trim()),
    )
  )
    return "A retained geography is missing its own source citation; no point is asserted.";
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
  const sourceIds = new Set(
    preview.registry.sources.map((source) => source.id),
  );
  for (const node of preview.nodes) {
    const missingSource = node.item.geography.some((geo) =>
      geo.sourceIds.some((id) => !sourceIds.has(id)),
    );
    const anchor = missingSource ? null : getNodeAnchor(node);
    if (!anchor) {
      unplacedNodes.push(node);
      unplacedReasons[node.id] = missingSource
        ? "A geography citation does not resolve to a retained source; no point is asserted."
        : getUnplacedReason(node);
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
