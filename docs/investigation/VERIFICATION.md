# Investigation release verification

Baseline: `11a78e22a9998796c3c90b31fc4b708e98196c9c`.
Review date: 6 October 2026. Publication uses the source branch
`codex/education-funding-intelligence` and the existing GitHub Pages deployment.

## Scope

A shared geographic investigation surface across 40 routes, current 36-unit
geometry, linked typed graph, state/layer/date/tier filters, source inspection,
exact-identity paths, coverage comparison, local casebook, source-bearing
exports and preserved original dossiers. New primary finance, justice and
welfare slices augment the retained education, water, public works and fleets.

## Data and source checks

- Investigation registry and original-source archive validation passes.
- 23 selector/schema/path tests, seven graph/geometry/export tests, six
  casebook import/closure/export tests and four dossier-navigation tests pass.
- All 99 archived research artifacts in the required manifests match their
  recorded sizes and SHA-256 hashes.
- Existing promotion, assembly, assembler tests and data integrity gates pass.
- Existing education, water and public-works provenance, comparison and model
  artifact tests pass. Source retrieval gaps and inherited validator warnings
  remain documented; a passing structural gate does not independently verify
  every inherited claim.
- Finance and welfare original-source cross-reviews, legal-status checks and
  correction histories are retained in the domain research notes.

## Browser and production checks

The release candidate passed three consecutive independent browser runs,
**669 assertions across 12 scenarios per run**, without uncaught browser errors.
The retained reports and artifact fingerprints are in `browser-acceptance.json`
and `BROWSER_REVIEW.md`. These cover all 40 routes, current geometry, shared
filters and history, source and response inspection, local casebook persistence,
capacity rejection, import/export, keyboard use and 320/390/768/1440px layouts.

The focused workspace suite passed three consecutive 54-check runs, including
exact-identity paths, source-equivalent exports and repeated rapid Search/Back
cycles. The graph suite passed three 15-check runs and a further release-candidate
run. Original dossier checks passed for education, water and public works
(77 checks), plus 15 repeated dossier Back/Forward/Reset cycles, 140 route/surface
smoke loads and the graph viewport gate.

The mobile entry change brings an explicitly opened dossier heading into the
reading viewport and cancels pending focus movement on user interaction. The
54-check suite covers entry and no repeated scroll on filter edits. Independent
Energy AC61/64 pass unchanged; an additional probe confirms a focused heading at
approximately 69px on both 320px and 390px phones.

The source review then corrected the retained Atlas PM CARES motif and the scope
and tier of a news-reported implementation audit. The data-only publication
candidate (`dist-publish`, index SHA-256
`2a25a9abafe3baa5156b062ecea25e2cf81660d585484f157581d2ccc4f45592`)
passed the full 669-assertion sweep and a 15-check targeted Atlas/source probe.
Both registry validation and all 40 investigation unit checks pass after that
correction. The main integrity validator also passes; its motif parser receives
the already-read edge array so the corrected motif census stays computed.

The longer energy, finance, welfare and tender acceptance matrix, including
original failures and separately passing reruns, is recorded in
`LEGACY_ACCEPTANCE.md`. Results from different builds are identified explicitly;
a focused rerun does not retroactively make an earlier full run clean.

## Final procurement release candidate

The final source build is `dist-procurement-final`, with index SHA-256
`929d47431973d293a16795a7dbd2195557cb8574d6c7721e02889b7d8b1a4478`
and entry `assets/index-BCw8brm5.js`. It adds 156 reviewed buyer-cohort records
and nine separate corpus-audit records, bringing the registry to 5,313 records
and 3,073 namespaced source citations. Entity and relationship counts are
unchanged. Full databases stay outside Git and browser bundles.

Latest registry validation, 42 investigation tests, 31 public-works tests,
42 accounting/archive controls and pinned model artifact checks pass.
`npm run test:procurement` passes five cohort freshness/join tests, 12
provenance/date-label tests and 12 source-audit invariants using committed
artifacts only. CI and deployment run these gates without downloading databases.

The earlier procurement candidate passed 29 checks in three consecutive runs.
Actual visual review then caught a stale inspector scroll position on artifact
selection; a narrow keyed scroll container fixes it while preserving the reading
position on same-record filter edits. The final artifact passes the full
669-assertion, 12-scenario shared-workspace suite and 15 graph checks with zero
uncaught errors. The procurement suite passes 31 checks in three consecutive final production
runs, including two dedicated scroll regressions. Actual rendered inspection
confirms the newly selected audit heading returns to the inspector viewport. Retained
reports are under `docs/tender-investigation`; broader final shared-workspace
and dossier results are recorded in `PROCUREMENT_RELEASE_ACCEPTANCE.md`.
Earlier reports above remain explicitly tied to their earlier builds.

Source research and its access limits are documented in
[the source audit](../tender-investigation/SOURCE_AUDIT.md),
[the two-round analysis panel](../tender-investigation/ANALYSIS_PANEL.md) and
[the retained notebook](../../research/raw/tender-portal-audit/audit.ipynb).
Seven sampled original procurement cases could not be independently verified
from accessible live documents. They remain research leads, without inferred
payments, physical completion, supplier identity or political influence.

## Material limits

The map shows recorded coverage and associations, not incident rates or a
national assessment of corruption. Locality evidence is bounded. National and
unknown geography are explicit. Legacy dossier maps carry a historical-boundary
notice; ambiguous old territories are not assigned to modern units.

The corpus is a curated static snapshot with a sizeable initial source bundle
(about 11.53 MB JavaScript before compression, 2.64 MB gzip in the final build),
not a continuously refreshed national warehouse. Original documents may be
unavailable or removed after retrieval. Casebooks live in this browser and must
be exported for backup or transfer; authenticated collaboration is future work.

Open-model output is document relevance, never verified extraction or a legal
finding. The roadmap distinguishes the implemented release from later source,
identity, spatial, ingestion, collaboration and query services.

## Deployment checkout correction

The first deployment of source commit `5deffc1` stopped before building or
publishing: Actions checks out a shallow history, while the immutable CPPP
comparison tests read baseline `11a78e22a9998796c3c90b31fc4b708e98196c9c`.
Both CI and deployment now explicitly fetch that single pinned commit with
`--no-tags --depth=1` before the procurement gate. A separate local depth-one
clone reproduced the required checkout shape; after the exact fetch, all 12
provenance/date comparison tests passed. No application or evidence data changed.
