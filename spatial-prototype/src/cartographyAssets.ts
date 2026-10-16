import type { GeographicCollection } from "./geography";
/** Vite emits source-identical geometry assets; neither geometry is embedded in JavaScript. */
export const WORLD_MAP_URL = new URL(
  "./assets/geography/world-countries-50m.json",
  import.meta.url,
).href;
export const INDIA_STATE_MAP_URL = new URL(
  "./assets/geography/india-states-wgs84.json",
  import.meta.url,
).href;
let request: Promise<GeographicCollection> | null = null;
export function loadMapBoundaries(): Promise<GeographicCollection> {
  if (!request)
    request = Promise.all(
      [WORLD_MAP_URL, INDIA_STATE_MAP_URL].map(async (url) => {
        const response = await fetch(url);
        if (!response.ok)
          throw new Error(
            "The local geographic boundary asset could not load.",
          );
        return response.json() as Promise<GeographicCollection>;
      }),
    )
      .then(([world, states]) => ({
        type: "FeatureCollection" as const,
        features: [...world.features, ...states.features],
      }))
      .catch((error) => {
        request = null;
        throw error;
      });
  return request!;
}
