/** Heavy map geometry stays behind the lazy map renderer. UI/detail panels should
 * import geography.ts, never this module. Source coordinates are unchanged.
 */
import worldData from "./assets/geography/world-countries-50m.json";
import indiaStateData from "./assets/geography/india-states-wgs84.json";
import type { GeographicCollection } from "./geography";

export const WORLD_COUNTRIES = worldData as GeographicCollection;
export const INDIA_STATE_BOUNDARIES =
  indiaStateData as unknown as GeographicCollection;
/** Compatibility subset: reuse the exact TN feature without a second asset import. */
export const TAMIL_NADU_BOUNDARY: GeographicCollection = {
  type: "FeatureCollection",
  features: INDIA_STATE_BOUNDARIES.features.filter(
    (feature) => feature.id === "TN",
  ),
};
