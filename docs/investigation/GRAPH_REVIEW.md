# Linked map and graph review

Reviewed 2026-10-06 against the integrated workspace at 1440×1100 and 390×844. Mobile-width component screenshots use a taller capture viewport after the 390×844 interaction assertions, preserving the full legend below scroll ancestors. The final targeted development-browser run passed 15 checks with no uncaught browser errors. The final production build subsequently passed three consecutive runs of the same workflow, using its default owned static server.

## First-panel architecture decisions

The legacy map was found to contain an older 36-unit roster: undivided Jammu and Kashmir, no Ladakh and separate western union territories. The new workspace therefore uses a separately sourced current-roster LGD/BharatMaps asset. Its 36 states/UTs and all 832 polygon components are retained. The adjacent asset README records CC0 licence, attribution, pinned archive hash, projection and boundary limitations. No legacy numerical observation is silently redistributed onto current units.

Map shading represents distinct matching record cards at their stated geographic precision. Activity/programme/institution coverage is separable from headquarters, constituency and other association. National context and unknown geography remain explicitly counted outside subnational attribution. A hatched state means no matching records in this corpus, not no activity. Multi-state records are not additive national totals.

The unified inventory exceeds 2,000 entities and 3,600 relationships. A deterministic preview therefore draws at most 80 entities/180 relationships, discloses drawn and available counts, and retains every matching relationship in the paged ledger and CSV export. Ordering uses stable IDs, not influence, centrality or a corruption score. Selected path edges are prioritized and explicitly disclosed when they extend beyond the focus neighborhood; any unavailable or capped requested edge is reported.

One/two-hop discovery traverses incoming and outgoing adjacency while retaining each relationship's original direction. Analytic comparisons, denials, responses and superseding records do not expand a path. Such evidence remains inspectable among retained endpoints. Invalid identities and unavailable source references cannot become drawable links. Legal entity namespaces remain separate unless a reviewed explicit identity crosswalk exists.

## Second-panel rendered findings and corrections

1. **The initial camera clipped the graph.** A fixed 72% zoom showed only part of the overview and spread a three-node mobile focus outside the pane. The final camera observes actual pane dimensions and auto-fits. Small neighborhoods use a compact layout; the selected identity is fixed at its center. The selected mobile focus is checked within 45 pixels of both pane-center axes. Manual pan/zoom remains available.
2. **Mobile inspection could hide the graph without remounting it.** A resize observer now re-centers after the graph is revealed. The browser test opens a fresh mobile deep link, returns from the inspector, and verifies that the chosen entity is visible and centered.
3. **Similar visible names obscured namespace boundaries.** Duplicate labels now include their namespace. The rendered Amit Shah example shows separate public-works and legacy identities joined by an explicitly labelled identity-crosswalk edge, alongside the source-backed office relationship. This is navigation, not a money-flow claim.
4. **A dense overview needed identity discovery.** Hover and keyboard focus now display a full identity readout and the focused label. Small focused graphs show predicate labels; larger previews retain full identity names and source-backed relationships in the ledger. Existing entity-family hues and evidence dash patterns are preserved, including a distinct self-reported tier.
5. **Parallel edges could overlap or escape the canvas.** Parallel, reciprocal and self-loop curves are deterministic and separated. Curve spread is bounded. Keyboard users can inspect every relationship through the ledger even when a dense diagram is visually crowded.
6. **A heading overstated evidence.** “Trace a documented connection” was replaced with “Recorded connections”, since the view can include reported, alleged, analytic and self-reported records.

The map remains a real geographic view at both sizes. Its state selector has an exact accessible name; the SVG offers arrow-key movement, Enter/Space selection and Escape clearing. Small union territories remain accessible through the same complete state selector. The selected Ladakh outline, state label and URL were verified without treating Ladakh as a legacy Jammu and Kashmir tag.

## Validation and retained views

- `node --test scripts/investigation/graph.test.mjs`: seven tests cover source/identity gates, discovery exclusions, deterministic bounded preview with complete ledger, priority paths, explicit unavailable focus, separate curves, export provenance and the current 36-unit geometry.
- `node scripts/investigation/graph-browser.mjs`: 15 checks cover current 36-unit SVG boundaries, exact control labels, keyboard state selection, URL restoration, actual-pane auto-fit, graph caps, keyboard entity focus, hop depth, ledger pagination/CSV, source inspection and reload, mobile focus and page overflow. The script serves `dist` itself by default; `INVESTIGATION_BASE_URL` selects a running server.
- Full TypeScript compilation passed after the component changes; the integration lead owns final production build and route-suite acceptance.
- `screenshots/map-graph-desktop.png`: linked desktop canvases with explicit preview counts.
- `screenshots/graph-mobile-focus.png`: compact, centered mobile neighborhood with namespace and predicate labels.
- `screenshots/map-mobile-ladakh.png`: separate current Ladakh geometry and evidence counts.

A development-only stale-module error occurred while Vite observed a regenerated finance fleet file. A fresh server resolved it; it was not a map/graph exception or a source claim. Final release acceptance should use the built application, avoiding generated-file/HMR races.

Remaining limits are stated in the interface: the corpus is curated, geographic coverage is incomplete, default graph previews are bounded, diagrams are not influence measures, and a sourced connection is not proof of wrongdoing. The relationship CSV preserves endpoint identity bases, evidence tier, status/as-of date, relationship dates, date basis, limits, alternative readings, response IDs, geographic metadata, separately typed money amounts and full citation locators/dates.

## Final production gate

Completed 2026-10-06T22:22:33.946342+00:00 against `dist/assets/index-DDprgRLJ.js` (11,349,233 bytes; SHA-256 `ebb95d90816ee723c7b3feb498ecc6c9eb8e957c34c4afd79f5e8fad8aab61e3`).

| Consecutive run | Checks passed | Uncaught browser errors | Outcome |
| --- | ---: | ---: | --- |
| 1 | 15 | 0 | PASS |
| 2 | 15 | 0 | PASS |
| 3 | 15 | 0 | PASS |

Each run executed `node scripts/investigation/graph-browser.mjs`, created its own static HTTP server over the final `dist`, exercised the full linked workflow, and closed the server afterward. No development server was used, and no production implementation changed during the gate. The three retained screenshots were refreshed by the third production pass. Machine-readable outcomes and the exact asset fingerprint are in `graph-production-acceptance.json`.
