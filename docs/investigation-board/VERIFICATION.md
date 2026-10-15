# Investigation board verification

Last checked: 15 October 2026 (UTC).

## Status

- **Passed:** 34 focused board model, storage, component-DOM and route-retention tests.
- **Passed:** 10 existing casebook and dossier-navigation tests, plus 41 tutorial tests (85 total in the final combined invocation). Tutorial/component DOM tests simulate the DOM and do not prove browser geometry or native focus containment.
- **Passed:** TypeScript `--noEmit --incremental false` against the current working tree.
- **Passed:** Node syntax check of the Playwright acceptance script.
- **CI browser result, corrections pending:** PR8 head `fbcaf2d26ffe80d0a1b689368b1b326c664ea4e3`, run [38802988587](https://github.com/occult-kranti/india-corporate-intelligence/actions/runs/38802988587), passed 24 of 25 board scenarios with 301 checks and all 31 then-required screenshots. Exact accessible select names blocked the typed-thread scenario. Independent visual review found stale List/one Money paths capture, a tutorial/target overlap, small low-contrast metadata and an unclassified full-page overflow region. These are acceptance holds, not a completed visual pass. The next revision adds regression checks and a 32nd screenshot showing real wool threads. Local Chromium remains blocked; it must not be retried.
- **Additional checks:** Production build and baseline validation passed; additional retained checks are listed below.
- **Not claimed:** A complete final-head CI pass, legacy browser-suite completion or deployment. The initial board CI failure prevented the later legacy browser gates from running. Final-commit results must be recorded separately.

The tests establish the stated model/storage contracts. They do not establish that an unexecuted browser interaction or visual layout passes.

## Added test files

- `scripts/board/model.test.mjs`: pure board state, parser, positioning and additive restoration.
- `scripts/board/dom.test.mjs`: actual React board behavior under DOM simulation, including removal/re-pin, concurrent delayed restore and query-preserving saved views.
- `scripts/board/retention.test.mjs`: retained route manifest, source-semantics contracts and the real shared Casebook API with controlled storage.
- `scripts/board/legacy-routes.json`: fixed inventory of the 60 pre-board route patterns.
- `scripts/board/load.mjs`: bundles the existing TypeScript modules for Node tests; it does not rewrite production code.
- `scripts/board/browser.mjs`: deferred Playwright acceptance suite, including both 1280px and 1600px desktop sizes.
- `scripts/tutorial/offline.test.mjs`: all three independent standalone generators embed real research, archive styling and working Help without runtime fetches, and rebuild deterministically.

## Executed checks

```sh
node --test scripts/board/*.test.mjs scripts/investigation/casebook.test.mjs scripts/pages/dossier-navigation.test.mjs scripts/tutorial/*.test.mjs
node --check scripts/board/browser.mjs
./node_modules/.bin/tsc --noEmit --incremental false
```

The final combined test invocation passed **85/85**, with no skipped or TODO tests. The local Playwright check was syntax-only; the separate CI result above records actual browser execution. DOM fixtures use mocked native dialog/geometry APIs and must not be treated as rendered browser QA.

### Model and preservation coverage

- Separate versioned board and casebook storage keys; independent default state.
- Pin-key namespaces and all four supported analyst-thread types.
- Horizontal/narrow-stage clamping and distinct reading-order positions for all 250 pins at one, three and four columns.
- Unsupported versions, malformed envelopes, array-shaped position maps, invalid/empty pin keys, nonfinite coordinates and invalid thread rows.
- Explicit rejection of more than 250 stored positions or 500 threads, without silent array truncation.
- Stable JSON persistence; bounded notes; unknown saved identifiers retained.
- Self-thread, invalid type, duplicate ID and duplicate typed endpoint rejection; reverse directed endpoints and different purposes remain distinct.
- Long-ID normalization cannot create duplicate IDs.
- 500-thread exact capacity and atomic failures.
- Additive merge keeps current positions and notes, retains new entries and is idempotent.
- Collision-safe imported IDs remain unique after reload.
- Combined position and thread limits reject without mutating the current layout.
- Casebook imports retain current title, question, falsifier and notes; unavailable identifiers remain present.
- Real Casebook API shares the established browser storage and does not mutate the board key.
- 251st-pin and over-capacity import rejection is atomic; component tests verify 251-pin and 41-view raw/packet backups reject with clear feedback and byte-for-byte unchanged saved state.
- Denied storage writes preserve in-tab work for subsequent recovery/export.
- Original source registry remains unchanged; analyst threads are exported separately from sourced relationships and source assertions.
- Exactly 60 original route patterns survive, with `/board` as the additive 61st route.
- Shared workspace and independently rendered route families remain wired.
- Existing source closure, linked response cycles, geographic sources, escaped analyst notes, saved views and dossier-query preservation tests still pass.
- Real React board component (DOM simulation): Notebook removal prunes stale positions without deleting thread notes; re-pin/move reuses capacity; a delayed restore keeps a movement made during the read; saved List/search views retain their actual query; unreadable casebook storage cannot automatically erase intact board positions.
- Tutorial model, source/catalog, React DOM and static-app DOM tests pass, including all route-guide coverage, no automatic popup, separate progress, pause/resume/replay and research-state preservation.

## Additional working-tree checks

The following checks completed in the same working tree:

- `npm run build` passed (Vite 15.18 seconds). Existing >500kB chunk-size warnings remain warnings; this is not a bundle-size reduction claim.
- `npm run validate` passed.
- `npm run test:investigation` passed, 47/47 tests.
- Global integration Python tests passed; static applications passed 83/83 tests; three integration guards passed after their navigation-link check was adapted to the declared navigation data.
- The retained-gate report `/tmp/board-retained-gates.json` was inspected: **26 commands exited successfully**. These cover assembly; education, water and public-works validation/tests; atlas validation/tests; map geometry; allegations; metro; money-trails including its source audit; research radar; funding; hypotheses; game theory; and research-program validation/tests.
- The 27th command, `test:atlas:audit`, exited 1 because its code-audit wrapper launches Chromium and hit the known socket permission failure. It is **BLOCKED**. No browser success is inferred from any preceding non-browser checks, and that denied launch must not be retried locally.

These are working-tree checks, not a record of CI passing for a published commit.

## CI integration correction

The first PR8 CI run stopped at the existing media offline assertion because direct standalone generation left the new Help script external. The root production post-pass had embedded it, but the independent exporter path did not. A shared inlining helper now runs in all three generators and the root post-pass. The original assertion is unchanged. Full global-workbench tests now pass: 50 Python, 83 UI and 3 integration tests, plus 32 tutorial tests. Three new regressions execute each direct generator, render research and Help with runtime fetch disabled, and check byte-identical rebuilds. Final-head CI and rendered desktop review are still required.

## Rendered review corrections

The first rendered review was a hold. The revised batch adds explicit accessible names to From/To/Purpose selectors, uses measured tutorial placement with a 20px anchor gap, raises key evidence metadata to 12px and at least 4.5:1 contrast, waits for stable URL/DOM/pressed-state agreement before List captures, and requires real page roots rather than loading headings. A successful wool-thread capture is mandatory. `layout-diagnostics.json` records viewport/root geometry, computed metadata contrast and tutorial geometry before assertions; it must establish whether the earlier empty dark area was true document overflow. No assertion is weakened to hide these findings.

The next CI run ([38805728422](https://github.com/occult-kranti/india-corporate-intelligence/actions/runs/38805728422), head `dcc15d06eebb719f5df5685cc1df33d17c85a4ec`) confirmed genuine root scroll overflow: the document measured 1254px while body, root and shell remained 1000px; large boards amplified the same defect. Its strict root-height check correctly prevented final capture acceptance. The board now establishes a local positioning context for absolutely positioned screen-reader labels/import controls, so they remain inside the main scroller rather than contributing to document overflow. The unchanged runtime gate must validate this correction.

## Defects identified and corrected during this review

Model fixes have executed regression tests. Most UI scenarios ran in CI, but the exact revised build still requires a complete pass and renewed visual review.

| Finding | Resolution | Verification |
| --- | --- | --- |
| An 8000px y ceiling could collapse the default positions of large boards | 90000px ceiling accommodates a full single-column arrangement at a 360px stride | Model test passed |
| Default 260px rows and 245px canvas allowance could clip long, annotated cards | 360px row spacing and bottom allowance preserve room for title, source status, date and note | Original geometry scenarios passed in CI; larger-metadata revision requires renewed browser/screenshot review |
| Position imports silently truncated after 250 entries | Oversized position maps reject | Model test passed |
| IDs were de-duplicated before truncation, creating collisions | Overlong IDs are rejected before acceptance | Model test passed |
| Duplicate typed endpoint rows entered through imports | Parser de-duplicates pairs; UI restore rejects lossy parsed imports | Model passed; browser pending |
| Merge-generated IDs could collide with an existing generated ID | Current and incoming IDs are reserved during suffix generation | Model test passed |
| Merge could create more than 250 positions, then fail on reload | Combined capacity rejects atomically | Model test passed |
| Large asynchronous restore could overwrite a newer movement | Latest layout ref is read at the restore action boundary | Component DOM regression passed; browser pending |
| Picker dismissal returned to a fixed header button | Actual opening control is retained for focus restoration | Source inspected; browser pending |
| List sourced links were limited to the first 60 canvas pins | List uses all listed identities for sourced connections | Source inspected; browser pending |
| Board saved views omitted query/list state | Embedded Casebook receives the complete current board URL | Component DOM regression passed; browser pending |
| Notebook/shared-casebook removal left stale positions that could exceed capacity | Latest shared casebook pins are used to prune removed positions; annotations remain | Removal → re-pin component DOM regression passed; browser pending |
| Fallback empty pins after an unreadable casebook caused passive layout deletion | Automatic pruning is disabled while casebook storage has a warning | Reproduced failure, then component DOM regression passed after fix; browser pending |

## Final-head browser acceptance

Only run this in a browser environment explicitly authorized by the task owner. Setting an environment variable does **not** grant authorization and must never be used to evade an existing local denial.

Against an already deployed authorized review build:

```sh
BOARD_ALLOW_BROWSER=1 \
BOARD_BASE_URL=https://approved-review-build.example \
BOARD_ARTIFACTS=/tmp/investigation-board-review \
node scripts/board/browser.mjs
```

Alternatively, an explicitly authorized CI runner can omit `BOARD_BASE_URL` to serve its freshly built `dist/`. `PLAYWRIGHT_CHROMIUM_PATH` is optional and should name only a browser executable already approved/installed for that runner. The script deliberately refuses to start without `BOARD_ALLOW_BROWSER=1` and does not install a browser, change sandbox flags, request escalation, or retry a denied launch.

The suite writes `results.json`, `screenshots.json`, named failure screenshots, and **32 required desktop screenshots**, plus one supplementary 390px tutorial screenshot. It asserts that every required screenshot was captured in this run and exists with nonzero bytes. Missing artifacts fail the suite. The manifest records filename, byte size, viewport and route; artifact presence is not a substitute for visual review. A failed scenario does not stop other independent scenarios; the script exits nonzero if any scenario fails. Each scenario uses an isolated browser context and the suite records uncaught page exceptions.

### Browser scenarios prepared

1. Empty board at 1280px and 1600px; genuine empty-state action, disabled insufficient-pin connection control, picker focus containment/Escape/actual-opener restoration and no horizontal page/main/board overflow.
2. Search by exact registry identifier, pin once, inspect source and independent geographic provenance, edit note, follow exact evidence-workspace URL, reload and export.
3. Shared Notebook question/falsifier editing, retained list/search saved view, original Markdown reading brief and inspect/focus round trip.
4. Cross-tab casebook and layout events update the current board.
5. Arrow-key movement, larger Shift movement, pointer drag, inspector arrow buttons and reload persistence.
6. Self/duplicate typed-thread rejection; explicit analyst labeling, separate export and note persistence.
7. Sourced relationship inspection and visibility toggle do not create analyst assertions.
8. List-view sourced connections include identities after the first 60 pins.
9. Additive/idempotent restore preserves existing authorship and arrangements; malformed JSON, unsupported layout, excess positions and >16MiB backups leave existing state unchanged.
10. A deliberately delayed file read cannot overwrite a newer pin movement.
11. Unavailable identifiers retain notes; explicit inspector and Notebook removals clean stale position storage.
12. All 250 long-title cards with analyst notes can be shown in canvas and list at 1280px and 1600px. Arrange must produce no pairwise card overlap or stage clipping, preserve Casebook data, avoid horizontal overflow and retain browser-history mode restoration.
13. Denied local-storage writes display a warning while exports retain in-tab layout.
14. An unreadable saved layout does not overwrite its raw stored value on initial read or erase the casebook; casebook remains exportable. An unreadable casebook cannot passively erase intact layout positions or thread notes.
15. Board Help opens only on request, guides the current page, pauses on Escape, restores focus, resumes, finishes, replays, skips and removes highlights without changing research. Reduced-motion disables board animation, transitions and smooth scrolling.
16. A supplementary 390px tutorial check preserves viewport bounds and target readability where a separate popup can fit.
17. Every retained legacy route renders content using verified example IDs for parameterized routes; legacy routes do not become the board, and board query Back/Forward remains intact.
18. Representative retained React pages at both widths: shared atlas, Education dossier, Money trails and Research program. Each is checked for horizontal overflow and captured.
19. All three retained static applications at both widths: actual data register populated, no visible load error, no horizontal overflow, main-view screenshot, contextual-Help screenshot, Escape and opener-focus restoration.

### Required screenshot review set

- At both 1280px and 1600px: empty board, record picker, populated canvas and full-pin list.
- At 1280px: source inspector, a successfully created and visibly separated wool thread, board Help index and active board tutorial.
- At both widths: retained atlas, Education dossier, Money trails and Research program.
- At both widths: global evidence, finance and media static applications, plus each application's Help dialog.

CI must upload the complete artifact directory even when the suite fails. A reviewer must actually open all 32 expected desktop images (and check the supplementary narrow-screen tutorial capture) and record any clipping, overlap, illegible contrast, misleading evidence semantics, clipped dialogs, missing content or unexpected layout changes. Record the exact CI commit/run and artifact location. Do not approve based only on a nonempty-file check.

### Remaining release gate

Run the acceptance suite against the final built commit in the approved environment, inspect the desktop screenshots (including dialogs and populated board), then record the actual scenario/check counts, artifact location and CI URL here. Do not mark final acceptance passed based on a source review, an earlier partial run or a successful syntax check.


## Legacy dynamic route-inventory correction

On head `96201679bf9bdc099fce334ae4c71fe6bf490565`, CI run 38807588556 passed the new board suite (26 scenarios, 436 checks, all 33 images) and independent visual review cleared the corrected states. A later shared-investigation browser gate exposed an inventory omission: its dynamic App route scan included `/board`, but its independent-surface map did not, so it incorrectly waited for a geographic Workspace and Dossier there. The board is now registered with its real heading, surface marker and toolbar contract. Every original route assertion is retained; a focused source regression guards the added declaration. This revision changes tests/documentation only and still requires complete exact-head CI before merge.
