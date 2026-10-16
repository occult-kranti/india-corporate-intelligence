# Geographic evidence adapter

The full-registry scene uses one continuous rectangular Web Mercator world. Original narrative positions are ignored. No evidence object, geography qualifier, citation, source, limitation, response, tier or amount is rewritten. Geographic markers express recorded area **context**, never a verified site, institution address, payment destination or physical route.

## Full-registry admission counts

The original snapshot retains **2,469 entities, 5,617 records, 4,203 relationships, 3,314 sources and 316 held entries**. Of the records, 227 also occur in the held list with `status: "not-drawn"`; these remain readable, including their counter-evidence, but are excluded by the model adapter from scene admission.

Six exact source-scope holds ([review history](source-scope-corrections.md)) exclude the two prior Adani relationships, Leap zero-payment relationship, two Jio endpoint interpretations, and unsupported Progressive upstream amount relationship, together with their mirrored records. Raw evidence objects remain unchanged. The geographic adapter receives 7,853 drawable items:

- 3,856 placed items: 1,757 entities and 2,099 records
- 3,997 unplaced drawable items: 712 entities and 3,285 records
- 1,657 original directed relationships have both endpoints placed
- 42 occupied areas: all 36 retained India state/UT units and six country areas, IN, BD, ES, PH, RU and US
- Of placed items, 827 have country precision and 3,029 have state precision

These replace the earlier reduced-preview counts of 44 placed items, 4 unplaced items and 30 relationships. The additional records and locations are original-registry integration, not new research claims. If all 8,086 entity/record objects are inspected without the drawing admission rule, the same 3,856 qualify for anchors and 4,230 do not; the additional 233 are the 227 preserved held counterparts and six correction records.

The anchor catalog has 269 source-validated representatives: 233 countries with a unique two-letter code already retained in the audited Natural Earth extraction, plus all 36 original India state/UT geometries. Nine world features have ambiguous or non-two-letter source codes and remain render-only: ATC, CYN, FRA, IOA, KAS, KOS, NOR, SOL and TWN. No label lookup or new country-code assignment is used. All six country codes present in the original evidence are supported.

## Precision and rejection rules

1. Every contributing geography needs its own nonempty source citation. A cited sibling cannot rescue an uncited geography. Scene construction additionally checks that citations resolve in the retained source registry.
2. `scope: unknown` or `basis: unknown` always remains unplaced. Familiar institution names, source URLs, office addresses and locality names cannot repair this.
3. Multiple distinct state or country codes, explicit multi-state scope, contradictory foreign-country/Indian-state qualifiers, unsupported codes, or differing area representatives across geography objects remain unplaced. A missing component does not allow choosing one convenient known area.
4. National/country scope is a precision ceiling. Three original rows have national scope alongside one state tag; they retain country precision rather than becoming state pins. Explicit multi-state national rows remain unplaced.
5. City, district, village, block or project scope may retain only its explicitly cited country/state. The adapter does not resolve locality names, synthesize city coordinates or infer a location from a national source's capital.
6. India state codes are exact current-roster codes already recorded by the original adapter. No lowercase or historical alias is introduced. Original legacy JK/DN/DD ambiguity stays unknown; the presence of modern geometry does not reinterpret historical records.

The mixed national-plus-Karnataka Akshaya Patra record is deliberately unplaced: trust-wide figures cannot be moved to its kitchen. Bangladesh lender context remains Bangladesh; India national lender context remains India. These marks describe case context, not institutional headquarters. Foreign regulators in an Indian case may likewise retain the original Indian national **case context**, with no assertion that their offices or jurisdiction are in India.

## Bounded national-context crosswalk

`national-context-crosswalk.json` records an explicit 26-namespace allowlist. It is not a wildcard, namespace-prefix rule or default-country fallback. A future namespace requires review. The crosswalk is applied only to matching national scope and national-context basis without explicit conflicting geography.

The original `src/data/investigation.ts` imports these source slices and preserves their geography qualifiers. `src/data/atlasInvestigation.ts` counts national scope; `src/components/investigation/AtlasCaseFeed.tsx` explicitly describes that count as **Indian national context**. The crosswalk stores the hashes of these three semantic source files and a source path, hash and narrow rationale for every namespace:

- Typed India registers: education, water and public-works
- Explicit central programmes/funds: welfare and pmcares
- Investigation slices: finance-research, justice-research and welfare-research
- Deep slices: deep-corporate, deep-governance, deep-procurement and deep-services
- Atlas slices: atlas-institutions, atlas-international-finance, atlas-oversight and atlas-policy
- Allegations slice: allegations-policy
- Metro slices: metro-defence, metro-delhi-security, metro-mumbai-security, metro-public-finance and metro-tender-scan
- Corporate case slices: money-trails-corporate and money-trails-djb
- CPPP collection adapters: procurement-audit and procurement-trails

This interpretation retains the original context even for a foreign lender, company, regulator or source publisher. It does not geolocate that participant. Explicit country metadata such as Bangladesh, Spain or the US always remains distinct; unknown legacy/crosswalk geographies do not inherit India.

## API and lazy-rendering boundary

The lightweight `src/geography.ts` retains the existing function signatures:

- `getNodeAnchor(node): GeoAnchor | null`
- `getUnplacedReason(node): string`
- `getGeographicScene(preview, worldWidth = 60): GeographicScene`
- `projectLngLat(lng, lat, worldWidth = 60): [x, y, z]`

It also exports geographic types, `GEOGRAPHY_SOURCES`, `NATIONAL_CONTEXT_CROSSWALK`, `NATIONAL_CONTEXT_PROVENANCE`, `GEOGRAPHIC_CAVEAT` and `MERCATOR_MAX_LATITUDE`. It imports only compact anchors and provenance; it imports no world/state polygon coordinates, map renderer or runtime registry.

Heavy polygon exports move to `src/cartography.ts`, which should be imported only by the lazy map renderer/style:

- `WORLD_COUNTRIES`: all 242 audited country features
- `INDIA_STATE_BOUNDARIES`: all 36 unchanged original state/UT features
- `TAMIL_NADU_BOUNDARY`: compatibility subset using the same TN feature reference

Renderer integration: move `WORLD_COUNTRIES` and the old `TAMIL_NADU_BOUNDARY` imports out of `geography.ts`; use `INDIA_STATE_BOUNDARIES.features.filter(f => areaCodes.has("IN-" + f.id))` for supported state overlays. Type-only imports of `GeographicFeature`/`GeographicCollection` can remain in `geography.ts` without pulling runtime data into the UI.

An anchor includes longitude/latitude, country/state precision, original geography citation IDs, basis and label, area bounds, the rounded maximum source-vertex distance, and separate cartographic provenance. `geometryFeatureId` explicitly joins the exact retained source feature; no name matching is required. The retained label says “representative area point, not a verified site or address.” City/site variants remain permitted by the TypeScript interface for compatibility, but this implementation never emits them.

`focusZoom` and `maxEvidenceZoom` remain 4 for country and 7 for state. Fit the full area bounds when necessary. Do not use an area representative as an evidence-backed building destination. `getNodeAnchor` cannot resolve citation existence in isolation because it deliberately imports no registry; `getGeographicScene` performs the registry-aware citation check.

`getGeographicScene` preserves the full registry reference, replaces every placed node position with its geographic projection, clears narrative clusters and retains only original edges with placed endpoints. Unplaced items and reasons are separate; never render their previous narrative coordinates as geography.

## Representatives and duplicate markers

Representatives now use a deterministic validated **point-on-surface** algorithm, replacing the former longitude/latitude polygon centroids. The largest component is selected by planar area, excluding holes. A horizontal scanline is chosen between consecutive vertex latitude levels near that component's vertical midpoint. Its widest interior interval is selected, with stable leftmost tie-breaking, and the midpoint is rounded to nine decimal places. The generator rejects any result outside the original surface or inside a hole. This is a display placement procedure, not a geodesic centroid or surveyed position.

All 269 representatives are independently tested against the retained polygon rings, including holes. Concave, holed and disjoint stress fixtures also exercise the algorithm. Source geometry coordinates are never repaired, simplified again, moved or jittered.

The earlier four representative coordinates change because the algorithm changed:

- IN: 80.231293647° E, 21.7839355° N
- BD: 89.868194726° E, 23.6806885° N
- ES: 3.487145144° W, 39.9065185° N
- IN-TN: 78.349247295° E, 10.81996695° N

Coordinate decimal places describe reproducibility, **not evidence precision**. Markers sharing an area share exactly the same coordinates and projected positions. Use marker stacks, selection lists and screen-space label collision handling; never shift geographic coordinates to separate evidence visually. Same-area relationships cannot justify invented physical routes.

`uncertaintyKm` is the rounded-up great-circle distance to the furthest retained polygon vertex. It is a broad display extent summary, not a statistical confidence interval or certified continuous-area coverage bound. Small UTs may have smaller values than the previous preview's areas.

Projection uses X east, Z south and Y up in one continuous Web Mercator world. Standard ±85.05112878° clipping is used at the poles. No longitude wrapping, per-country rotation, island arrangement or random offset is introduced.

## Cartographic provenance and limitations

### World countries

`world-countries-50m.json` retains 242 features from the previously reviewed [Natural Earth 1:50m Admin 0 Countries dataset](https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-countries-2/). Geometry coordinates and bounding boxes remain unchanged; unused source properties were removed in the earlier audited extraction. The data is [public domain](https://www.naturalearthdata.com/about/terms-of-use/).

The existing source snapshot was retrieved on 2026-10-15 from the [Natural Earth vector repository](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_admin_0_countries.geojson). Its source SHA-256 remains `3e458fc036ad0a66411f2c1e6cac49c5d7bfb81cb1123bc513b22511a2b7fdeb`; the world artifact remains byte-identical at `a97bd58679079eae2bd0c86ec122537dde9c0958bd812eb07c5e60fe13ab690c`. No network research or replacement dataset was used for this extension.

Natural Earth uses generalized, de facto territorial control. It does not adjudicate sovereignty and is not suitable for address resolution, site or parcel boundaries.

### India states and union territories

`india-states-wgs84.json` preserves all 36 features and original provenance from the original application's `india-current36-wgs84.json`. The reviewed original source SHA-256 is `7ae52226dde1e67884903819d48579305d100615bdad54712bbe5991332fe76d`. The original Tamil Nadu-only artifact is preserved unchanged for provenance compatibility, but the renderer need not import it separately.

The existing asset identifies LGD/BharatMaps via ramSeraph/DataMeet, the [government service](https://mapservice.gov.in/gismapservice/rest/services/BharatMapService/Admin_Boundary_GramPanchayat/MapServer/0) and the [upstream snapshot](https://github.com/ramSeraph/indian_admin_boundaries/releases/download/states/LGD_States.geojsonl.7z). Its CC0-1.0 license, 2026-10-06 retrieval, upstream source hash, topology-preserving simplification at 0.001°, and unestablished boundary snapshot date are retained verbatim. The 36-unit post-2020 roster does not establish the age of every boundary vertex.

Upstream India boundary claims, including disputed areas, remain explicit. The India and Natural Earth sources may differ in territorial scope; neither overwrites or “corrects” the other. No historical record is reassigned using current geometry. Existing world and Tamil Nadu source metadata objects are retained, and a separate all-state source object is added.

## Rebuild and verification

Run `python3 scripts/build-geography-data.py --source-root <original-app> --check` for deterministic verification, or omit `--check` to regenerate owned geography assets. The generator uses reviewed local inputs only. If the original world snapshot is absent, it accepts the exact hash-verified existing world extraction. It never downloads or substitutes another source. An unexpected source checksum fails the run for review.

`scripts/geography.test.mjs` contains 16 deterministic tests over the full original registry loaded through `scripts/original-registry.mjs`: explicit counts; evidence/source preservation; every representative inside its exact polygon; identical duplicate coordinates; bounded national crosswalk; country/state precision ceilings; missing citations; unknown/multi-area/conflicting rejection; held-record safety; retained directed edges; projection; immutability; lightweight UI imports; source/artifact hashes; exact original state geometry; and byte-for-byte regeneration plus polygon stress fixtures.

The source-root-dependent checks report a skip when original inputs are unavailable; artifact checks always run. Full validation for this extension used the original read-only application, with no skipped tests. These checks prove transformation and provenance integrity, not the truth of every retained investigation claim or stronger city/site precision. Browser execution, external publication, merge and deployment are outside this change.
