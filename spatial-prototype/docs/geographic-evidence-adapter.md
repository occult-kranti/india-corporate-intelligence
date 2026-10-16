# Geographic evidence adapter

This is the current rendering contract. The scene uses one continuous rectangular Web Mercator world. The earlier narrative-layout coordinates in the raw model are ignored and never used as geographic positions. No source evidence object was changed.

## What the source supports

The retained preview supplies country or Tamil Nadu state context, not verified institutional addresses, building coordinates or payment destinations. Therefore 44 items can be placed at four explicitly labeled area representatives. They overlap exactly by design:

- India country context
- Bangladesh country context
- Spain country context
- Tamil Nadu state context

Four multi-country items remain unplaced: the L&T entity mention, the C295 project entity, the C295 case and its response. Each spans multiple recorded countries and has no uniquely justified point. They remain available in the complete evidence registry and an explicit unplaced list.

A country-context lender mark describes the case geography, not the lender's headquarters. ADB and AIIB retain Bangladesh context from their original metadata. The international-finance namespace's India-wide `national-context` is translated through an explicit namespace-to-IN semantic crosswalk; no institution name, company label, capital city or headquarters lookup determines a position. Unknown namespaces and unknown geography do not inherit India.

## API

`src/geography.ts` exports:

- `getNodeAnchor(node): GeoAnchor | null`
- `getUnplacedReason(node): string`
- `getGeographicScene(preview, worldWidth = 60): GeographicScene`
- `projectLngLat(lng, lat, worldWidth = 60): [x, y, z]`
- `WORLD_COUNTRIES`, `TAMIL_NADU_BOUNDARY`, `GEOGRAPHY_SOURCES`
- `GEOGRAPHIC_CAVEAT`, `MERCATOR_MAX_LATITUDE`

An anchor includes longitude, latitude, precision, original evidence source IDs, explanatory basis/label, conservative area radius, bounds and separate cartographic source provenance. Every currently emitted anchor has country/state precision and `representativeOnly: true`. The API permits future city/site types, but no current implementation fabricates them.

`focusZoom` and `maxEvidenceZoom` are 4 for country and 7 for state. A renderer should fit the full area bounds when necessary and never use an area representative as an evidence-backed building destination. City-context navigation can be offered separately, clearly labeled and without claiming an evidence connection.

`getGeographicScene` preserves the full registry, replaces every placed node's display position with its geographic projection, clears narrative clusters, and includes only original edges with placed endpoints. Unplaced items and reasons are returned separately. They must not be rendered using their old raw-model positions.

Coordinates use X east, Z south, Y up. The world has no per-country transforms or random offsets; the full standard Mercator extent is square at the ±85.05112878° latitude limit. Longitude is not wrapped into repeated worlds. The projection clips the poles and preserves one continuous coordinate system.

## Duplicate markers and relationships

Several evidence items share each broad source area. They deliberately have identical longitude/latitude and identical projected positions. Use marker stacks, screen-space label collision handling or an accessible list for selection; never move their geographic anchors to make the scene look more varied.

Same-area relationships are still original source relationships, but a coincident pair cannot support a fabricated geographic route. Cross-area lines depict retained connectivity only. They do not establish physical movement, payment routing, an institution's address, or a link to an unrelated city building.

## Cartographic provenance

### World countries

The checked-in `world-countries-50m.json` contains 242 country geometries from the [Natural Earth 1:50m Admin 0 Countries dataset](https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-countries-2/). The original geometry coordinates and bounding boxes are preserved exactly; unused descriptive/statistical properties were removed. The data is [public domain](https://www.naturalearthdata.com/about/terms-of-use/).

The source snapshot was retrieved on 2026-10-15 from the [Natural Earth vector repository](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_admin_0_countries.geojson). Its source SHA-256 and local artifact checksums are retained in `geography-sources.json`.

Natural Earth is generalized cartographic data at 1:50 million scale, not site/building geometry. It uses de facto territorial control and is not an adjudication of disputed sovereignty. Country outlines must not be advertised as survey-accurate or used for address resolution.

### Tamil Nadu

The TN feature is extracted unchanged from the preserved application's WGS84 India state asset, including its original source provenance. Its source is LGD/BharatMaps, via ramSeraph/DataMeet, with the [government service](https://mapservice.gov.in/gismapservice/rest/services/BharatMapService/Admin_Boundary_GramPanchayat/MapServer/0) and [upstream snapshot](https://github.com/ramSeraph/indian_admin_boundaries/releases/download/states/LGD_States.geojsonl.7z) identified in metadata. The existing asset records CC0, a 2026-10-06 retrieval, topology-preserving simplification at 0.001°, and an unestablished boundary snapshot date. These qualifiers are retained. The source reflects upstream territorial claims and does not settle them.

### Representative coordinates

Representatives are area-weighted polygon centroids computed in longitude/latitude. They are display summaries of the identified source polygon, never factual site addresses. Tests verify that the four retained representatives lie inside their corresponding polygons. `uncertaintyKm` is the rounded-up great-circle distance to the furthest polygon vertex; it is a conservative display radius, not a statistical confidence interval.

## Verification

`npm test` includes ten geographic tests covering exact duplicate coordinates, no unknown placements, no invented addresses/building joins, country/state zoom caps, geometry membership, provenance checksums, retained directed edges, Mercator axes/clipping and immutability. A standalone TypeScript check also passes.

The original source-preserving model and registry tests remain in place. Structural tests demonstrate provenance/geometry integrity; they do not independently verify every source claim or upgrade area evidence into site evidence.
