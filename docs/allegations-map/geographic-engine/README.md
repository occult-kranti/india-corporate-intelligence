# Flat geographic evidence map verification

The frozen `dist-allegations-release` build passed 26 map checks and 21 Places checks. Four geometry/style tests passed. The independent live street capture rendered six real OpenFreeMap vector tiles at zoom 15.5, with pitch **0.0** and no uncaught runtime errors. [checks.json](checks.json) records the exact commands.

| Actual public-service capture | Verified behavior |
| --- | --- |
| [National state hubs](places-live-national-hubs.png) | Flat OSM geography, retained boundaries, numbered schematic evidence hubs and distinct sourced-campus marker. |
| [Port street context](places-live-voc-port-street.png) | Flat mapped building footprints, sourced campus point, selected documented connections, schematic network inset and rich evidence reader. |
| [Campus provenance](places-live-voc-port-provenance.png) | Original coordinate-source link, campus precision, numeric coordinate and explicit scope limits. |

The 36 state display anchors are representative interior points of the retained LGD polygons. They locate **schematic state evidence indexes**, never people, incidents, buildings or payment destinations. Tests verify every anchor lies inside its correct retained geometry. All 36 original SVG state selectors and their keyboard behavior remain in the offline view.

Geographic connection lines use singular, supported endpoint placements only. Ambiguous/unplaced endpoints and connections inside one hub are counted explicitly instead of being assigned guessed lines. A selected relationship inset makes these connections inspectable independently of geographic placement. It states “Schematic · not locations”, shows at most 12 identities and 18 edges, preserves original direction and exact identifiers, and exposes its full searchable connection population. Browser checks verify the preview bounds, complete list, and exact relationship-to-identity navigation.

The former 3D renderer and its dependencies were removed. Places enforces zero pitch and Mercator projection, rejects provider extrusion layers, and removes terrain/sky styling. The provider's flat building layer is extended beyond its usual zoom-14 cutoff so street-scale footprints remain available. The test injects a provider extrusion layer and verifies its removal. Camera gestures, source outage, lost/unavailable WebGL, reduced motion, and 1440/390/320px layouts were checked.

Street and place context is [OpenFreeMap](https://openfreemap.org/) / [OpenMapTiles](https://www.openmaptiles.org/), using © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), available under ODbL. The style is `https://tiles.openfreemap.org/styles/liberty`; the observed tile snapshot was `20261004_113936_pt`. Attribution remains visible. There are no Google tiles or required map keys. Coverage reflects the public provider and community-maintained source, not an accuracy or completeness guarantee.

The public site is V. O. Chidambaranar Port Authority at latitude `8.75637793296619`, longitude `78.1790887243492`, from the [Indian Ports Association profile](https://ipa.org.in/port/8). The retained source supports the public campus, not TICT berth 9 or a private address. Nearby OSM footprints establish neither ownership nor a connection to an allegation. Time filters apply to research evidence, not historical versions of the street map. International and unknown evidence remains in contextual lists and schematic diagrams until a specific public-site coordinate is sourced.

[voc-browser-evidence.json](voc-browser-evidence.json) records the live capture at 2026-10-07 07:51:54 UTC. [manifest.json](manifest.json) retains hashes of all 243 emitted build files, map code/data, tests, and screenshots. Its canonical build-file manifest SHA-256 is `bd99b1ac0a4afc493c081d0a288496d33f8b484078a1702509a29e311df0e3f6`.

The controlled browser suites use a disclosed test basemap/geocoder for deterministic engine checks; none of those synthetic background screenshots is presented here as real geography. All three retained images use actual public-service data. Validation covers the inspected Chromium/SwiftShader environment; it is not exhaustive cross-browser or assistive-technology certification.
