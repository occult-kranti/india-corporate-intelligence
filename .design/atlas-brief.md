# Public Record Atlas redesign

Mode: Operate. This is an AI design engineering proposal and review, not participant research. The user rejected the incumbent surface and authorized a bold replacement across routes. Data truth, saved work, historical URLs, evidence qualification and all existing workflows remain product invariants.

## Direction contract

THESIS: Make location the primary research artifact, with a readable case or allegation immediately beside it. A national map leads the viewport; sector switching changes the investigation scope rather than sending the researcher to a disconnected mini-site.

OWN-WORLD: Committed midnight petrol cartography, jade selection, ivory type, and warm paper reserved for opened source material. Precise boundaries and directional relationship marks carry data; offset soft shadows separate the navigation, map, and reading planes. UI text is the locally hosted Inter; case titles retain the locally hosted document serif. Dates and coordinates use tabular monospace.

STORY: Choose a place and sector, move through institutions and dated records, then follow exact relationship steps to their sources, responses, and saved evidence. Source coverage is never a map of guilt.

FIRST VIEWPORT: A 168px labeled desktop sector rail and 64px context masthead frame a large geographic canvas and adjacent case dock. Map/time controls sit with their artifact. At narrow widths a 47px horizontal sector strip follows the 60px masthead, and map, case feed, and source reading recompose vertically.

FORM: Code-led public record atlas, rooted in the authorized geographic research workflow. No concept seed was available: the local Impeccable launcher was absent; direct project context and official upstream references supplied the documented fallback. The coordination agent accepted this direction before implementation.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Reference inspection

Visited with actual Chromium on 7 October 2026; screenshots retained in `/tmp/atlas-design/` during development. These are interaction/layout references, not sources for India research.

- https://kepler.gl/ — visible dimensional geospatial layers and time playback. Translate into an explicit time control and honest height encoding rather than ornamental extrusion. The marketing hero itself is not the working layout.
- https://earth.nullschool.net/ — near-full-viewport spatial field, stable geographic orientation and continuously visible movement. Translate into a large uninterrupted map and user-controlled camera transitions; do not copy continuous animation onto static source evidence.
- https://www.globalforestwatch.org/map/ — layer rail, local legend/analysis, date intervals, and the visible caveat “Tree cover loss is not always deforestation.” Translate into local evidence qualifiers and source-scoped time. Do not import its blocking welcome overlay.

## Shared implementation contract

- `Layout.tsx`, `shell.css`, and global tokens: navigation, colors, browser surfaces, responsive frame, and legacy dossier integration.
- Workspace owns `.atlas-workbench`, `.atlas-map-stage`, `.atlas-evidence-dock`, `.atlas-sector-strip` composition and all evidence behavior.
- Spatial and network components consume `--atlas-ocean`, `--atlas-land`, `--atlas-boundary`, `--atlas-jade`, `--atlas-paper`, `--atlas-ink`, `--atlas-shadow`.
- `--atlas-header-height` describes only the masthead; `--atlas-shell-height` includes the mobile/tablet sector strip. Main remains the scroll container.
- Geometry, layer counts, severity, status, date intervals, and uncertainty always come from retained data. Shadows, camera angle, and node proximity establish no evidential meaning.
