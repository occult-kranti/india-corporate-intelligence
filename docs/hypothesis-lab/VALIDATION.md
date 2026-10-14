# Coordination hypotheses: validation record

Review date: 14 October 2026. Scope: the new `/hypothesis-lab` route, its reviewed research bundle and the shared reader changes required by that route. This is an implementation and evidence-integrity record, not a finding that an unestablished connection occurred.

## Evidence and deterministic checks

The final research bundle contains 8 cases, 32 sources, 61 scoped identities, 54 recorded links, 11 proposed questions, 19 discriminating tests and 18 rejected joins. The separate continuation register contains 20 sectors. All 32 source entries retain captures and byte hashes; 4 explicitly depend on secondary reporting. The substantive two-round review is recorded in [PANEL.md](PANEL.md).

The deterministic assembly/hash validation passed. The 37 hypothesis unit tests passed, including malformed-source and invalid-reference rejection, exact case/export closure, source-family handling, question-layer separation and actual recorded-path non-traversal. The per-case tests also verify that all 54 recorded edges and all proposed question edges select their own response records. Existing atlas tests passed 17/17 and map tests passed 4/4.

Research promotion, generation and data validation passed. Existing quarantine warnings remain recorded rather than silently promoted. The production typecheck/build passed; Vite retains its large-chunk warnings. No new dependency, local model training or claim of predictive calibration is part of this release.

## Browser and release acceptance

The accepted new-page run passed **234 checks**, including all **8 actual downloaded case packets**, on the final production build. Desktop, 390px and 320px journeys passed with no browser, console, failed-request or HTTP errors. The receipt is `/workspace/icip-hypothesis-release/browser-final/acceptance.json`; it records exact bundle, source and test fingerprints. The bundle SHA-256 is `9c4b6e4f161d1a5f1ac284e1226d299fb553f3843e5bd4804842373a908120c3`.

The final stable-build shared regression run passed **836 assertions across 12 scenarios**, **15 graph checks** and **54 workspace checks**, after the selected-response fix. Its receipts are in `shared-release/`, `shared-release-graph/` and `shared-release-workspace/` under the external release directory. The unchanged prior full legacy page suite remains a separate exception below.

Acceptance exercises source dialogs, keyboard navigation, URL/history state, question-layer behavior, exact response attribution, real downloads and mobile layouts against built bytes. The flat offline map is covered; external cartographic tile availability is outside this run. It does not establish universal accessibility or support in every browser. A bounded visual review accepted desktop and mobile readers without another edit, retaining two polish limits: the mobile map sits below introductory controls and compact reader tabs wrap tightly.

Publication uses the branch's required deployment gates. The accepted build is frozen outside the repository, bound to the source commit, compared with all published Git blobs, and checked again through the public route. Release receipts are external so recording a successful publication does not change the very source commit being verified.

## Problems discovered and corrected

- The first browser attempt correctly rejected a bundle whose stream hash changed during source review. The final data was reassembled before acceptance.
- The question checkbox updates through hash navigation. The test now clicks and awaits the committed checkbox, URL and graph state; it still checks dashed rendering and non-traversal. Repeated observed commits took approximately 160–370 ms locally.
- The graph/ledger state persists across same-document hash navigation. The keyboard journey now explicitly selects Graph before testing SVG nodes.
- The shared reader could preview a response from another edge in the same case. It now prioritizes the selected edge's explicit response IDs and omits a relationship preview when that relationship has no direct response. Unit and browser checks retain the exact expected response assertion.
- An early shared-browser run overlapped a production rebuild and lost served assets. That interrupted run is not accepted. Subsequent regression runs use a stable copied build.
- Source review corrected tender-notice versus award timing, contemporaneous decision authority and the ordering of the airport cap recommendation. These changes are detailed in the panel record and research logs.

## Boundaries and inherited exceptions

This selected review does not cover every government department, establish private coordination, resolve all current court dispositions or join every payment to a recipient. Agent agreement is not independent corroboration. Administrative anchors on the map are schematic associations; they do not establish a person's physical location. Question edges carry no amounts and cannot create a recorded financial trail.

The earlier full legacy `test:pages` run reported 325 passes, 5 failures and 18 skips. It was not rerun in full for this release. Its remaining exceptions concern Energy AC39 checkbox timing, Finance AC58 Loans timing, Finance AC63 reset latency, Tender AC07 a whole-body percentage assertion and Tender AC73 its fixed keyboard-tab budget. Earlier isolated passes do not erase those failures. The deployment workflow has separate explicit gates; a successful deployment must not be described as proof that the complete legacy page suite is green.

External release receipts are kept in `/workspace/icip-hypothesis-release/`, including prior failed attempts. Prior funding/model release receipts and the retained tender databases were not overwritten. Publication verification compares all published Git blobs with the accepted local build and separately checks ordinary unauthenticated HTTP delivery of the index and critical assets; it does not claim every asset was fetched over HTTP.
