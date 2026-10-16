# Fieldwork: a continuous felt evidence atlas

Experimental, additive review prototype. One continuous rectangular Web Mercator map moves from a felt world overview into actual, geographically aligned building footprints. This next-review candidate is not deployed; the atlas remains additive to the original research application.

## Run

```sh
npm ci
npm run dev
npm test
npm run build
```

The repository package lives at `spatial-prototype/`. Its review artifact is served at `/india-corporate-intelligence/spatial/`; Vite uses a relative base and CI checks this exact subpath. Original routes, data and analytic CSS remain intact. A bounded navigation link and additive Pages build copy place the reviewed atlas beside them. The two spatial review workflows upload artifacts only; deployment still runs through the original release gates.

Provenance tests read the original parent registry from `../src/data/investigation.ts`. In an isolated checkout set `FIELDWORK_SOURCE_ROOT` to the original application's directory. An extracted local reference bundle is development-only and is not published.

## Implemented

- One MapLibre geographic camera and canvas, with a Three.js custom layer for raised brass/red pins, paper record stacks and source-linked curved threads
- Seeded felt material across a recognizable world map, with public-domain offline country geometry and progressively loaded worldwide OpenStreetMap street/building tiles
- Continuous pan, zoom, tilt and rotation; Home, Fit, Back, top-down, focus, thread travel, Pause/Resume/Stop, Escape and manual-interaction interruption
- World-to-city context flights to public locations in New Delhi, Mumbai and London; native vector-footprint extrusions appear at zoom 14–15 and remain in the same coordinate system
- Upright DOM source reader with pinning, source links, counter-context, original financial/date qualifiers and explicit geographic precision
- 4D=time interval and 5D=facet layers, clearly labelled interface metaphors
- Shared original Casebook schema/storage key, additive pins, notes and source-closed export
- A 13-step atlas field guide with explicit Skip/Restart/Finish, pausing to try controls, keyboard focus return and versioned progress; it never moves the camera, starts audio or changes evidence automatically
- Manual browser narration using only `localService` voices, with transcript, Pause and Stop; no automatic speech or external speech service
- Keyboard-readable 2D mode, WebGL-failure fallback and an independent offline country base if remote tiles fail

## Evidence and geographic limits

The default route loads the complete original India application registry dated 2026-10-07: **2,469 entities, 5,617 records, 4,203 relationships and 3,314 source records**, plus every locality, coverage row, methodology entry and all **316 held entries**. Ninety-six same-origin chunks must pass individual and full-snapshot integrity checks before the interface opens. A failed load cannot silently become a partial dataset. `?dataset=preview` is an explicitly labelled 36-entity/12-record/33-relationship/24-source subset used for continuity review. See [full-registry data](docs/full-registry-data.md).

There are 8,086 retained entity/record items in the reader. Of these, 227 retained responses/review records overlap the held queue and are not drawn. The factual map therefore starts with 7,859 eligible items: **3,856 country/state-context items in 42 geographic groups and 4,003 unplaced items**. The 316 held entries keep their original reasons and remain a separate review catalogue; no proposed held edge is admitted. Search, subject/time/facet/area lenses and pagination do not alter the source objects. The reader has dedicated entity/record, relationship, source and held tabs; every original item retains its source trail and route.

Country/state representatives identify documented case areas, not institution addresses. The world view summarizes these as six labelled country display stacks. Expand a stack or zoom past level 3.2 to see the 42 original areas; selected original endpoints remain at their retained anchors. Display groups add no entity, source citation or relationship. Duplicate area coordinates remain unchanged. No artificial headquarters, building joins, random city offsets or evidence routes within the same area are created. National context stays national even when a state tag exists; mixed or ambiguous locations remain unplaced. Evidence focus stops at country/state scale. The separately labelled city controls demonstrate geographic exploration. See [geographic adapter](docs/geographic-evidence-adapter.md).

Thread color denotes the original relationship facet. Thickness is distinct cited-source count capped at five; the exact count remains in the reader. It does not measure accuracy, publisher independence, wrongdoing or completeness. Cross-area threads show original connectivity, not money movement or physical travel.

Natural Earth boundaries are generalized and use de facto control; neither they nor the other cartographic sources adjudicate disputed sovereignty. Web Mercator distorts area and clips the poles at approximately ±85.0511°.

## Worldwide buildings, service terms and licenses

The runtime vector source is the live TileJSON alias `https://tiles.openfreemap.org/planet`, using the [official OpenFreeMap setup](https://openfreemap.org/quick_start/). It needs no account or API key. Coverage and detail vary; no promise is made that every building or city is complete. The `building` layer's `render_height` and `render_min_height` are rendering approximations, potentially derived from tags, storeys or defaults, not verified measurements. Missing heights use an explicitly documented 12 m rendering default. See the [OpenMapTiles building schema](https://openmaptiles.org/docs/schema/#building).

Ordinary map use makes viewport tile requests to OpenFreeMap and is subject to its [terms of service](https://openfreemap.org/tos/). This public service is as-is and has no SLA. This prototype performs no bulk/offline tile download, account creation or credential handling. It sends no evidence content in tile URLs. The provider still receives ordinary network request metadata. No house-number/person layer is shown and buildings are never automatically joined to evidence.

Visible credits link OpenFreeMap, © OpenMapTiles and © OpenStreetMap contributors. OSM-derived data is licensed under [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/). The independently downloadable `public/data/city-buildings.json` is a **25-polygon validation sample**, not the worldwide runtime dataset; its notice is beside it. The invalid Parliament relation was excluded without invented repair, as recorded in [the correction](docs/city-data-correction.md). Country geometry is Natural Earth public domain; state geometry retains original source/license metadata. Investigation evidence and geographic derivative data are kept separate.

## Rendering budget

Targets, not measured consumer-device guarantees: 60 fps / 16.7 ms in high mode, 30 fps / 33.3 ms in balanced mode. Pixel ratio is capped at 1.5 and drops to 1.0 after sustained low moving-frame rates. Geographic tiles provide native level-of-detail; paper cards hide at high zoom, long-range threads fade before city scale, and screen labels are collision-filtered and capped at 12. Camera motion stays outside React and idle views do not request animation repaints. Hidden tabs stop camera updates. The diagnostic draw count covers the Three.js overlay only, not MapLibre's whole render pass.

World scale draws country display stacks and at most 24 representative original threads; the current snapshot has three unselected cross-country representatives. Area detail draws original area stacks and at most 60 original threads from 765 cross-area candidates (1,659 original links have both endpoints area-anchored, including same-area links). World representatives are selected by directed country pair and original facet, but retain the original edge ID, evidence endpoints, coordinates and citations. Same-country threads remain available through selection and detail zoom. A selected original edge is prioritized, including its exact endpoint pins; selected detail overlays do not inflate the unique country membership counts. No aggregate relationship or citation union is fabricated. All 4,203 relationships stay in the reader. Exact filtered, placed, unplaced and drawn counts remain visible.

Per-build raw and estimated-gzip sizes are recorded in `dist/build-budget.json`; the initial static JavaScript closure is capped at 220 KB. MapLibre/Three load only when exploration starts. `?mode=reading` never imports the map runtime. The 23.2 MB raw registry is separately chunked; map geometry is emitted as source-identical JSON assets rather than JavaScript. The local country base remains available if the optional remote tile service fails. `npm run build` enforces bounded JavaScript chunks and writes `dist/build-budget.json`. These are build sizes, not measured real network transfers or consumer-device FPS results.

## Validation and review

`npm test` checks complete source equality/closure and hashes, held exclusions, transport failures/cancellation/retry, startup gating, geographic precision, display caps, original routes, coordinates, style validity, camera primitives, local polygon holes and narration restrictions. Production TypeScript/build also run. The separate GitHub **Spatial prototype review** workflow exercises the nested route and captures desktop overview, travel, filters, reading mode, world-to-city extrusions, tile failure, reduced motion and WebGL failure.

No local Chromium is used. CI uses software rendering and is not a consumer-GPU benchmark. Do not call visual review complete until current-head screenshots are inspected. Merge and deployment require all exact-head original, spatial and combined-route gates plus screenshot review.

## Historical review candidate

A separate nine-claim historical reader is integrated behind three deliberate gates: build with `VITE_HISTORICAL_REVIEW=true`, use exactly one `?review=historical-2025` parameter on the full dataset, then choose **Open historical review reader**. Default/full behavior and explicit preview stay unchanged. The flag controls entry only; it is not authentication, a publication decision or a source-access restriction.

The full base registry remains the only factual-graph input. The reader retains the original nine source holds, adds nine hold-to-target sidecars and 27 exact-ID exclusion guards, and keeps `PUBLIC_GRAPH_BLOCKED`. All payload/base bytes are pinned and all added sources, original IDs, identity/date/denominator/control qualifications and overview-only fallbacks remain explicit. See [historical review integration](docs/historical-review.md) for loading boundaries, portable safety tests and required next-head rendering review.

## Separate follow-on work

The atlas does not yet federate the separate retained global-current, finance or media workbench datasets. Their original pages remain linked and intact. Future federation must preserve original IDs, path-eligibility, uncertainty/currentness and review queues. This candidate adds the separately gated historical inspection reader and the 13-step atlas guide; it does not admit research additions into the factual graph. The 59 original app-route and three static-page guides remain separate runtime-pending work, as do wider research imports. See [atlas tutorial](docs/atlas-guidance.md) for the bounded guide scope and interaction checks.
