# Release verification

The checks below concern this atlas expansion, not the completeness of India's public records or a finding about every entity in the registry. Independent reviewers were delegated AI agents. Browser observations use Chromium; they are not a human usability study or an all-browser certification.

## Accepted implementation and evidence

- TypeScript and production builds pass. The final artifact is `dist-atlas-production`; its index SHA-256 is `483635e3937ebe446caf5d5bd12e1a50484ab19bac993775e378e08e7d620792`.
- Shared registry/graph/casebook/navigation, atlas, deep-investigation and model suites passed 75 focused tests. Strict canonical identity and source/response closure remain enabled.
- The final pinned MiniLM run actually executed locally: 343 public source summaries, 15 exact-hashed inputs, 12 discovery queries, 5.402 seconds of CPU inference. Its receipt is in `research/atlas-expansion/runs/final-343`. Model similarity does not create graph facts.
- Independent technical audit: 38 checks, including exact search/filter parity, overlay broadening, country counts, association-only case index matches and keyboard return focus. See `CODE_REVIEW.md` and its acceptance/parity JSON receipts.
- Independent international/defence review: 39 rendered checks covering six cases, four financial-context records, IMF response/export closure, mobile behavior and exclusion of foreign spending from unrelated Indian states. See `PANEL_RESEARCH.md` and `oversight-browser/international-review.json`.
- Independent product review: source, allegation, time, country and export workflows passed; the final corrections were checked on separate immutable builds. At 320px the home and money maps expose 223px and 214.2px of actual geography in the first viewport. Final 390px title/map confirmation passed 10 checks. See `FINAL_REVIEW.md` and its hashed release artifacts.
- Places engine: 20 checks, with actual live OpenFreeMap vector rendering, explicit search, attribution, mobile reflow, country-scale navigation and failed-service/graphics recovery. Extruded 3D atlas: 18 checks. The final source-backed campus capture separately verifies street-scale zoom and coordinate provenance.
- Advanced network: 58 checks. Integrated map/sector/time/site workflow: 72 checks. Dedicated money-trail workflow: 37 checks. Source-backed procurement workflow: 31 checks.
- Shared browser acceptance: 756 assertions across 12 scenarios, including every registered route, context history, sources, casebooks and responsive views. The separate graph regression passes 15 checks and the workspace regression passes 54 checks.
- Education, water/food and public-works research workflows pass; public works includes 77 checks. Rapid search/Back/Forward/reset passes five consecutive cycles for each of the three desks.
- Full smoke test: 158 map and dossier route/surface renders pass. Remaining page and graph-viewport results are appended after their final acceptance run.

## Corrections and reproducibility

Review found and corrected inconsistent contextual search, overlay filters surviving scope-broadening actions, case-index geography drift, empty-sector semantics, copied graph date limits, reader focus restoration, and narrow-screen map visibility. MapLibre's worker is explicitly bundled so it resolves under both Vite and the deployed project subpath. The dependency scanner is restricted to the real app entry, avoiding archived HTML receipts. CI and deployment use Node 24, compatible with the installed map dependencies.

Older browser assumptions were updated to use the new visible Places/2D and Connections controls and to close the floating reader before opening the global casebook. Assertions now wait for the actual rendered scope after hash navigation. An initial history run accidentally used the old default `dist`; it is discarded and superseded by the explicit accepted-build run. No failing old snapshot is relabelled as a pass.

Publisher evidence bytes retain their hashes and original whitespace. Commercial news full captures stay in local research caches; public source packets retain URLs, hashes, receipts and authored summaries. Large original PDFs also use explicit external-cache receipts. These archived originals are reproducible from their public source URLs when those publishers remain available; inaccessible sources and mirrors keep their limitations.

The corpus is still a sizeable static client download. Map and 3D engines are lazy loaded; the main entry is about 2.8 MB compressed. Source coverage, current legal outcomes, place names and OSM buildings remain bounded by the retained records and upstream datasets. Provider-default building heights are not surveyed heights or evidence of ownership. See `ROADMAP.md` for measurable next-stage data and performance work.
