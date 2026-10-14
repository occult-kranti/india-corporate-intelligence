# Places map release evidence

The 03:06 UTC production snapshot rendered real OpenFreeMap street tiles, mapped building footprints, and the retained Indian Ports Association campus coordinate. Screenshots below use the public map service; none use the controlled browser-test background.

| Retained image | What was inspected |
| --- | --- |
| [Port street view](places-live-voc-port-street.png) | Actual street tiles at zoom 15.5 and pitch 50°, with a sourced campus marker and visible provider attribution. |
| [Port coordinate provenance](places-live-voc-port-provenance.png) | Campus precision, the original coordinate-source link, building-height caveat, and separation between a research marker and nearby OSM buildings. |
| [Money trails at 390px](places-live-money-390.png) | Actual Places tiles, collapsed mobile place search, and a 400px stage with 208.75px visible in the initial 390×844 viewport. |

The desktop screenshots were captured on 2026-10-07 at 03:05:26 UTC using Chromium 151.0.7922.173 with SwiftShader, at 1440×1100. The independent mobile confirmation was captured at 03:04:03 UTC. These checks used `dist-atlas-production`; [release-manifest.json](release-manifest.json) retains SHA-256 hashes for all 250 emitted files, map sources, test scripts, and review evidence. The canonical build-file manifest digest is `c6199b6881fd1412809b2d1a5fe0ffc6d3f6b230965244f2336ae608b7d10699`.

The later release adjusts only the finance dossier desktop header grid. These original map receipts retain their exact build and script hashes; they are not relabelled as captures of that later artifact. The final emitted-file manifest is [finance-final-release/release-manifest.json](../finance-final-release/release-manifest.json). Map source and research data did not change.

## Attribution and geographic meaning

Street/place context is provided by [OpenFreeMap](https://openfreemap.org), using [OpenMapTiles](https://www.openmaptiles.org/) and © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright). OpenStreetMap data is available under the ODbL. MapLibre GL renders the map; this is not a Google map. The selected style is `https://tiles.openfreemap.org/styles/liberty`. The observed public tile snapshot was `20261004_113936_pt`; its retained [TileJSON](openfreemap-tilejson.json) includes attribution and vector-layer metadata. Remote coverage and labels depend on community-maintained data and provider availability.

Building shapes use mapped vector footprints where available. Provider `render_height` values may be inferred or default values; they are not a survey, an ownership determination, or a measure of funding. The [sampled street tile](street-tile-14-11750-7791.pbf) containing the campus coordinate had one building footprint with `render_height: 5`. That is one sampled tile, not a total of buildings visible in the screenshot. [Decoded evidence](street-tile-evidence.json) records the tile URL, digest, layers and interpretation.

The research marker is V. O. Chidambaranar Port Authority at latitude `8.75637793296619`, longitude `78.1790887243492`, from the [Indian Ports Association profile](https://ipa.org.in/port/8). Its precision is **campus**. It locates the public authority premises at Barathi Nagar, Tuticorin. It does not locate TICT berth 9, a payment destination or a private person's address. Nearby buildings do not establish ownership or a relationship to the investigation. The retained [site manifest](../../../research/raw/atlas-expansion/sites.json), [source receipt](../../../research/raw/atlas-expansion/policy-evidence/port-ipa-location.receipt.json), and [browser evidence](voc-browser-evidence.json) preserve that distinction.

The 36 research-state boundaries use original LGD/BharatMaps geometry via ramSeraph/DataMeet, released as CC0 by the upstream distributor. All 832 polygon components are retained. Places uses WGS84 longitude/latitude simplified at 0.001° with topology preserved; it does not reuse projected SVG coordinates as latitude/longitude. The pinned original archive SHA-256 is `1b8a2f0bd908c10dc1229d2a7c5bcd3d433bb3fa013865163b21f4f61780e911`. Geometry metadata retains source and license URLs. Boundary vintage is not established beyond the verified post-2020 36-unit roster; upstream territorial claims are preserved and are not adjudicated by this interface.

The recorded-time filter affects research evidence. It does not reconstruct historical OSM streets, administrative borders, or buildings. The 3D atlas's state height represents record counts; arcs show recorded associations. Neither represents money volume or evidence of misconduct. International country-context records remain contextual counts until an explicit public-facility coordinate is sourced.

## Validation and reproduction

[checks.json](checks.json) records the executed commands and outcomes. The Places suite passed 20 checks, including the MapLibre worker, camera, world navigation, layers, explicit-submit geocoder, precision/provenance, responsive widths, offline-service recovery, lost WebGL context, and reduced motion. Its deterministic checks intercept only a test basemap and geocoder response. The separate live check rendered actual OpenFreeMap vectors.

The Spatial suite passed 18 checks for the retained 3D/2D engine, including selection, camera interactions, keyboard behavior, and fallback. It ran before the last mobile Places stage adjustment. The complete Places suite ran against `dist-atlas-shipping`; the final production difference was the money-page mobile title reduced by 1px. Engine logic was unchanged. The final production street capture and the independent [10-check mobile confirmation](mobile-production-checks.json) ran again against the final emitted build. Both reported no uncaught runtime errors.

From the repository root, reproduce with a current production build:

```sh
npm run build
INVESTIGATION_DIST=dist PLACES_LIVE=1 npm run test:places:browser
INVESTIGATION_DIST=dist npm run test:spatial:browser
INVESTIGATION_DIST=dist node scripts/atlas-expansion/capture-places-release.mjs
```

The capture script requires the real public service and waits for the campus street tile before saving images. External services can change or fail; Places then explains the failure and returns to the offline 2D map. The bundled 3D atlas and source records remain usable without street tiles. These checks establish the inspected Chromium desktop/mobile behavior, not exhaustive cross-browser, assistive-technology, provider uptime, or geographic-accuracy certification.
