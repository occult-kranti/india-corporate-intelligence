# One continuous felt world map: verified building-data route

Verified 15 October 2026. This supersedes the earlier separate-city-plinth presentation. Use one geographic map, one camera and one coordinate system from world view to street-scale extrusion. The corrected 25-polygon civic sample is a regression fixture, not the world's building coverage.

## Recommendation

Use MapLibre GL JS with OpenFreeMap's worldwide OpenMapTiles vector service for the first continuous implementation. Style its land, water and roads as the green felt surface, then reveal its mapped building extrusions as the camera zooms and tilts. Add investigative pins and threads as geographic overlays sharing that camera. No paid API, key, account or new hosting provision is needed for this route.

Live source: https://tiles.openfreemap.org/planet

- Source type: vector; building source-layer: `building`
- Native tiles: z0–14; building layer: z13–14. Overzoom keeps z14 geometry at closer camera zooms; it does not add building detail.
- Fields: `render_height`, `render_min_height`, `hide_3d`, `colour`
- Bounds: longitude ±180°, latitude ±85.05113°. Web Mercator cannot display the polar caps; this is a projected world map, not a complete globe.
- Heights must be labelled “Provider rendering height; may be estimated/default.” The tile fields do not distinguish surveyed heights from estimates or defaults.
- Filter `hide_3d=true`. The provider uses this to suppress building outlines when parts supply the visible geometry.

This endpoint and integration are documented in [OpenFreeMap's quick start](https://openfreemap.org/quick_start/) and MapLibre's own [3D buildings example](https://maplibre.org/maplibre-gl-js/docs/examples/display-buildings-in-3d/). The height semantics are defined by the [OpenMapTiles building schema](https://openmaptiles.org/docs/schema/#building).

## What was actually tested

The style and TileJSON returned HTTP 200 with Access-Control-Allow-Origin: *. Four bounded z14 tile downloads totalled 1,508,709 bytes, with a unique User-Agent, one request at a time. Decoding with the already installed vector-tile/PBF libraries found:

| Location | Tile | Building polygon features | Rendering height present |
|---|---|---:|---:|
| New Delhi | 14/11705/6831 | 45 | 45 |
| London | 14/8186/5448 | 510 | 510 |
| Nairobi | 14/9867/8250 | 188 | 188 |
| New York | 14/4823/6160 | 1,421 | 1,421 |

These are tile feature counts, not independently validated building counts. They include parts, clipping and possibly merged objects. This confirms operational data in four cities across four continents, not completeness for every city. Exact URLs, hashes, response metadata and decoded counts are in `global-tile-probe/requests.json` and `validation.json`. The observed release was `20261011_080001_pt`; use the TileJSON discovery endpoint rather than assuming that dated path remains the current release.

## Licensing and service boundaries

| Route | Coverage / role | Conditions and practical limits |
|---|---|---|
| OpenFreeMap public service | Worldwide OSM-derived contextual map and rough 3D buildings; fastest working route | OSM attribution plus OpenMapTiles schema/design attribution. Project MIT license does not replace map-data rights. No SLA. Normal embedded map use is supported; automated harvesting is restricted. |
| Self-hosted Protomaps PMTiles | Worldwide OSM context; provider-independent hosting option | ODbL Produced Work with OSM attribution; copy to your own hosting rather than hotlink daily downloads. Full planet is approximately 120 GB. Regional extracts are possible. Buildings below z15 may be merged; low-zoom heights may be quantized. |
| Overture-derived custom tiles | Global footprint expansion with source metadata; best controlled long-term pipeline | Buildings theme is ODbL with applicable upstream credit. Build and host versioned tiles from pinned GeoParquet. Official public PMTiles are inspection-only, with changing schema/zoom and no availability commitment; do not use them as production infrastructure. |

Official sources: [OpenFreeMap licenses](https://github.com/hyperknot/openfreemap/blob/main/LICENSE.md), [OpenFreeMap service terms](https://openfreemap.org/tos/), [Protomaps downloads](https://docs.protomaps.com/basemaps/downloads), [Protomaps layer schema](https://docs.protomaps.com/basemaps/layers), [Overture access warning](https://docs.overturemaps.org/getting-data/cloud-sources/), [Overture attribution](https://docs.overturemaps.org/attribution/).

OpenFreeMap's current terms make use an acceptance of the agreement, require an adult/authorized integrator, and provide the service as-is. Its bounded offline-download allowance is at most 3,000 tiles or 50 MB per download, at most four parallel requests and an identifying User-Agent. Use a conservative cap below both byte and tile limits. Larger offline requests need provider agreement. Do not launch bulk harvesting or a blanket prefetch job. The four-tile test was within those bounds. Service terms also disclose possible Cloudflare request processing and arbitration in Budapest.

Keep the source's attribution visible. A suitable line is “© OpenMapTiles · Data from OpenStreetMap”; link OpenMapTiles to https://www.openmaptiles.org/ and OpenStreetMap to https://www.openstreetmap.org/copyright. OpenFreeMap credit is welcomed. For a custom style, preserve data attribution explicitly instead of relying on the default style to add it. If reusing a default style's design/code/assets, retain its listed BSD/CC BY/font notices; an original felt style avoids borrowing that cartography.

## Continuous geographic implementation

1. Initialize a rectangular MapLibre canvas with Mercator projection, `renderWorldCopies:false`, north-up world overview and pitch zero. Keep genuine coastlines/borders from the vector map. No approximate hand-drawn continent replacement.
2. Recolor land/water/roads to a restrained felt palette. Add a subtle procedural fiber pattern to the map surface; never use generated building imagery. Pattern coordinates should remain visually attached to the map while panning.
3. Use one persistent vector source for both context and buildings. At z13 show footprint fill; between roughly z14 and z15, smoothly raise extrusion height from zero to the provider's rendering height and tilt toward 45–60°. This reveals detail without teleporting between city scenes.
4. Add pins and thread curves through a MapLibre custom layer with its shared WebGL context/projection matrix. Convert authoritative longitude/latitude using `MercatorCoordinate.fromLngLat`; use its metre scale for local geometry. Do not position city meshes in arbitrary display slots. [MapLibre coordinate API](https://maplibre.org/maplibre-gl-js/docs/API/classes/MercatorCoordinate/) and [Three.js integration example](https://maplibre.org/maplibre-gl-js/docs/examples/add-3d-tiles-3d-objects-and-models-using-threejs/) provide the supported interface.
5. Treat a thread as a visual relationship path, not an asserted journey. Sample its geographic curve, unwrap longitudes across the dateline, and animate the same camera along it. Pause/cancel on direct user input. Preserve the exact endpoint coordinates and source precision.
6. A country-only source gets a country-context anchor or region highlight. Unknown/multi-country evidence stays unplaced. No city, office or residence is inferred merely because the building layer contains an attractive target.
7. On tile failure, retain the geographic pins/threads and show “Map detail unavailable.” Do not replace missing areas with fictional buildings. Cache only ordinary requested tiles under provider rules. Avoid a second renderer's independent camera, which can cause drift between pins and the map.

The prepared `openfreemap-buildings-layer.json` is a compatible starting layer: it uses the `openfreemap` vector source ID, respects `hide_3d`, interpolates extrusion with zoom, and retains height caveats in metadata. It is a layer specification, not a complete map style. The engine must test it against its installed MapLibre version.

## Requirements and scaling path

For the current route: a WebGL-capable browser, MapLibre workers, outbound HTTPS access to `tiles.openfreemap.org`, visible source attribution, network/error states and the provider's current terms. Keyless does not mean guaranteed availability or universal completeness.

For independent hosting: use immutable PMTiles object versions on a server supporting HTTP Range (206 Partial Content), GET/HEAD, stable ETags and appropriate CORS. If cross-origin, allow Range/If-Match and expose ETag. Test a real byte-range request through the actual deployment CDN. Storage/request/egress charges and any account/API credential setup are separate approvals, not included in this work. [PMTiles hosting requirements](https://docs.protomaps.com/pmtiles/cloud-storage).

A controlled Overture pipeline can filter a pinned release by geographic cell, validate rings, keep original IDs/source-height provenance, and emit a compact building schema into z13–15 tiles. Retain source-height, floor-derived, assumed and provider-rendering categories separately. Use GeoParquet bbox predicate pruning, then exact intersection; a SQL LIMIT caps result rows, not network bytes. Track bytes read and stop at a configured budget. For global production, tile generation/storage is a real infrastructure task; it is not a single browser import of billions of footprints.

Anonymous global context necessarily includes residential footprints because the public building tile layer does not expose a reliable public/private-use filter. Suppress house numbers, resident labels, person tracking and building-evidence joins. If the requirement is to exclude all residential shapes, use a separately classified/allowlisted building dataset; this public tile schema cannot guarantee that restriction.

## Correction to the small sample

Schema 1.1 has 25 polygons, not 26. New Delhi relation/12737019 (New Parliament House) was excluded because its source inner rings overlap/nest. The original validator's relative-error denominator could be negative and missed this. It now rejects non-positive area before division and checks ring self-intersection, exterior crossings and hole overlaps/nesting. No invented polygon repair was applied. Remaining JSON, GLBs and geographic roundtrips passed the stronger tests. Keep these as fixtures or independently navigable geographic context, never as a claim of global coverage.
