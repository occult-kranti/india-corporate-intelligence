# Education release verification

Branch: `codex/education-funding-intelligence`, based on
`76c0c3548a833ffad37fcb00c3c7ab4a781cd2d7`. Research and implementation reviewed
6 October 2026. The final release also includes the subsequently requested water
and food extension; its scope is recorded separately under `docs/water`.

## Evidence and deterministic checks

- Existing promotion, generation and graph validation passed. Existing warning
  and quarantine records remain visible; no legacy generated graph changed.
- Assembler and merge suite: 65 tests passed.
- Education integrity: 38 sources, 112 series / 560 values, 36 monetary
  observations and three archived PDF hashes passed.
- Education behavioral suite: 17 tests passed, including strict locality/state
  matching and rejection of incompatible population comparisons.
- Independent public-source audit matched all 560 school-count values and their
  state/national control totals.
- Pinned local-model artifact verification and 12 guard tests passed. Actual
  CPU inference, revision, licence and hashes are in `MODELS.md`.

## Interface and regression checks

Education browser coverage includes complete source export and provenance,
reading-list persistence and recovery, filter history, rapid state/search updates,
route-preserving section jumps, unknown locality handling and all 75 UP district
rows. Design review covered 320, 390, 768 and 1440 CSS pixels and actual legacy
finance/map pages, mobile menu reachability, keyboard focus and reduced motion.

The graph viewport gate passed 59 assertions, including 945 glyph sampling
points. Two harness assumptions were corrected without changing graph behavior:
CSS-pixel-to-SVG conversion must use the inverse screen transform, and an Atlas
tooltip check must identify the sampled glyph rather than a centre hidden below
the instruction footer. The tooltip now exposes its existing node identifier.

Legacy page tests exposed lazy-route readiness races and external Google Fonts
503 responses under parallel load. Route readiness now waits for the actual page
content with an explicit navigation budget. Existing external-host exclusions
inspect the console resource URL as well as its message; local resource failures
remain failures. Assertions, action timeouts and settle periods were preserved.
The product's existing font families are bundled locally to remove that runtime
dependency. Old interrupted runs are not counted as successful checks.

Final candidate checks:

| Gate | Result |
| --- | --- |
| TypeScript and Vite production build | Passed; existing large shared graph bundle warning retained and documented |
| Route smoke | 56 URLs passed, covering 36 routes and parameterised variants |
| Education and water workflow gates | Each passed three consecutive production-build runs |
| Graph viewport | Passed, 59 assertions including 945 glyph sample points |

## Completed legacy suite and targeted follow-up

The completed `npm run test:pages` run covered **348 cases: 323 passed, seven
failed and 18 were skipped**. This was not a clean full-suite run. The seven
failures were Finance AC-70/97/103 and Welfare AC-43/53/54/70. All seven passed
focused reruns after the following corrections.

| Cases | Correction and final result |
| --- | --- |
| Finance AC-70 | Wait explicitly for the reset URL and project caption after the existing click. The 30-second route-readiness budget leaves the 5-second action timeout and assertions unchanged. Focused rerun: 1 passed, zero failures or skips. |
| Finance AC-97/103 | Recover 20px through mobile vertical-spacing changes so the rail summary fits the 844px viewport; increase mobile footer mono text to 12px. Final-build rerun of AC-96/97/98/103/105: 5 passed, zero failures or skips. |
| Welfare AC-43/53/54/70 | Scope close-control selectors to the page article so the hidden mobile navigation dialog's close button and heading are not mistaken for Welfare controls or its panel. Expected assertions remain unchanged. Final-build rerun of AC-43/46/53/54/69/70/71: 7 passed, zero failures or skips; AC-68 also passed separately. |

These focused reruns close all seven failures from the completed full run and
check adjacent cases. The entire 348-case suite was not rerun after these final
CSS and test-selector corrections. The final production build, 56-URL smoke and
six education/water workflow runs passed after the product changes.

The 18 skips are not passes: nine Welfare criteria require an EMPTY build; six
Welfare criteria require share-of-state-budget figures matched to financial
years, which this register lacks; one Finance criterion needs a recorded
zero-amount loan; and two Tender criteria need absent fixtures (an in-range year
with fewer than 30 observations, and a row missing a Wilson interval). These
reasons are emitted by the acceptance suites and remain visible.

Design-review captures: [desktop](screenshots/desktop.png) and
[mobile](screenshots/mobile.png).

## Limits

This verifies transcription, arithmetic, filters and observed browser behavior.
It is not a census of every school, college, NGO, funding flow or closure order,
nor participant usability or screen-reader certification. Missing age-specific
population and closure-event data prevent a confirmed closure-versus-demand
finding. The existing eagerly loaded graph remains the main bundle-size limit;
its measured follow-up is in `ROADMAP.md`.
