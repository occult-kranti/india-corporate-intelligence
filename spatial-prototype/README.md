# Fieldwork: a continuous felt evidence atlas

Experimental, additive review prototype. One continuous rectangular Web Mercator map moves from a felt world overview into actual, geographically aligned building footprints. This package is not deployed or a replacement for the live research application.

## Run

```sh
npm ci
npm run dev
npm test
npm run build
```

The repository package lives at `spatial-prototype/`. Its review artifact is served at `/india-corporate-intelligence/spatial/`; Vite uses a relative base and CI checks this exact subpath. Existing root routes, CSS and deployment workflows are untouched. The review workflow uploads artifacts only.

Provenance tests read the original parent registry from `../src/data/investigation.ts`. In an isolated checkout set `FIELDWORK_SOURCE_ROOT` to the original application's directory. An extracted local reference bundle is development-only and is not published.

## Implemented

- One MapLibre geographic camera and canvas, with a Three.js custom layer for raised brass/red pins, paper record stacks and source-linked curved threads
- Seeded felt material across a recognizable world map, with public-domain offline country geometry and progressively loaded worldwide OpenStreetMap street/building tiles
- Continuous pan, zoom, tilt and rotation; Home, Fit, Back, top-down, focus, thread travel, Pause/Resume/Stop, Escape and manual-interaction interruption
- World-to-city context flights to public locations in New Delhi, Mumbai and London; native vector-footprint extrusions appear at zoom 14–15 and remain in the same coordinate system
- Upright DOM source reader with pinning, source links, counter-context, original financial/date qualifiers and explicit geographic precision
- 4D=time interval and 5D=facet layers, clearly labelled interface metaphors
- Shared original Casebook schema/storage key, additive pins, notes, source-closed export and reused tutorial progress logic
- Manual browser narration using only `localService` voices, with transcript, Pause and Stop; no automatic speech or external speech service
- Keyboard-readable 2D mode, WebGL-failure fallback and an independent offline country base if remote tiles fail

## Evidence and geographic limits

The preview retains exactly 36 entities, 12 records, 33 original relationships and 24 source records from the original registry. The evidence snapshot is not refreshed by loading current map tiles. Source IDs, relationship predicates, geography, amounts/stages, dates, limitations, responses and counter-evidence are preserved.

The current evidence supports **four country/state areas, not institution addresses**. Forty-four items share four exact area representatives (India, Bangladesh, Spain and Tamil Nadu); four multi-country items remain in a clearly labelled unplaced tray. Duplicate area coordinates deliberately overlap. No artificial headquarters, building joins, random city offsets or evidence routes within the same area are created. Evidence focus stops at country/state scale. The separately labelled city controls demonstrate geographic exploration, not an evidence-backed address. See [geographic adapter](docs/geographic-evidence-adapter.md).

Thread color denotes the original relationship facet. Thickness is distinct cited-source count capped at five; the exact count remains in the reader. It does not measure accuracy, publisher independence, wrongdoing or completeness. Cross-area threads show original connectivity, not money movement or physical travel.

Natural Earth boundaries are generalized and use de facto control; neither they nor the other cartographic sources adjudicate disputed sovereignty. Web Mercator distorts area and clips the poles at approximately ±85.0511°.

## Worldwide buildings, service terms and licenses

The runtime vector source is the live TileJSON alias `https://tiles.openfreemap.org/planet`, using the [official OpenFreeMap setup](https://openfreemap.org/quick_start/). It needs no account or API key. Coverage and detail vary; no promise is made that every building or city is complete. The `building` layer's `render_height` and `render_min_height` are rendering approximations, potentially derived from tags, storeys or defaults, not verified measurements. Missing heights use an explicitly documented 12 m rendering default. See the [OpenMapTiles building schema](https://openmaptiles.org/docs/schema/#building).

Ordinary map use makes viewport tile requests to OpenFreeMap and is subject to its [terms of service](https://openfreemap.org/tos/). This public service is as-is and has no SLA. This prototype performs no bulk/offline tile download, account creation or credential handling. It sends no evidence content in tile URLs. The provider still receives ordinary network request metadata. No house-number/person layer is shown and buildings are never automatically joined to evidence.

Visible credits link OpenFreeMap, © OpenMapTiles and © OpenStreetMap contributors. OSM-derived data is licensed under [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/). The independently downloadable `public/data/city-buildings.json` is a **25-polygon validation sample**, not the worldwide runtime dataset; its notice is beside it. The invalid Parliament relation was excluded without invented repair, as recorded in [the correction](docs/city-data-correction.md). Country geometry is Natural Earth public domain; state geometry retains original source/license metadata. Investigation evidence and geographic derivative data are kept separate.

## Rendering budget

Targets, not measured consumer-device guarantees: 60 fps / 16.7 ms in high mode, 30 fps / 33.3 ms in balanced mode. Pixel ratio is capped at 1.5 and drops to 1.0 after sustained low moving-frame rates. Geographic tiles provide native level-of-detail; paper cards hide at high zoom, long-range threads fade before city scale, and screen labels are collision-filtered and capped at 12. Camera motion stays outside React and idle views do not request animation repaints. Hidden tabs stop camera updates. The diagnostic draw count covers the Three.js overlay only, not MapLibre's whole render pass.

The bundled generalized world geometry keeps the basic atlas available if the optional live tile service fails. It increases the initial package size; the current build is a prototype budget, not a production loading-performance result.

## Validation and review

`npm test` checks source equality/closure, geography, coordinates, style validity, camera primitives, local polygon holes and narration restrictions. Production TypeScript/build also run. The separate GitHub **Spatial prototype review** workflow exercises the nested route and captures desktop overview, travel, filters, reading mode, world-to-city extrusions, tile failure, reduced motion and WebGL failure.

No local Chromium is used. CI uses software rendering and is not a consumer-GPU benchmark. Do not call visual review complete until current-head screenshots are inspected. No merge or deployment is part of this review package.
