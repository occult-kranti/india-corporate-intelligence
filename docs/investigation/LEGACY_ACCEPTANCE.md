# Legacy dossier acceptance

Reviewed on 6 October 2026 with `/usr/bin/chromium`. The original route surfaces now require `iw_view=dossier`; default route visits are tested separately as the linked investigation workspace. Browser tests retain the original behavioural assertions, fixture-empty states, evidence rules and geometry budgets.

## Navigation and regression fixes

- A shared browser helper adds `iw_view=dossier` without losing original queries or section anchors. Selectors for legacy reset buttons, state controls, live regions and typography are scoped to the dossier, preventing the new workspace controls from satisfying or intercepting those checks.
- Legacy replacement-query navigation and reset actions retain only the existing `iw_*` workspace context alongside their intended new legacy parameters. Four focused unit checks cover reset, record links, explicit overrides and route encoding.
- A rapid Search → Back sequence reproduced stale query drafts when React skipped an intermediate render. The shared native-history hook restores query/place drafts from the committed URL; ordinary parameter synchronization remains in place. Five consecutive Back/Forward/reset cycles passed for each of Education, Water and Public Works (15 total), checking URL, both drafts, visible state and retained workspace context.
- Public Works navigation readiness waits for the visible sector/state/place description as well as control values. It does not wait for an expected record count, so empty-locality and coverage assertions still independently test the data.
- The mobile workspace initially placed the Energy heading/byline and graph below the first screen. The UI reviewer added focus/scroll on explicit mobile dossier entry. Energy AC61 and AC64 then passed unchanged on `dist-final`: the byline fits and a real visible graph tap enables gestures. The workspace suite separately checks heading focus/visibility and that ordinary edits do not repeat the entry scroll.
- Finance AC67 exposed a test snapshot taken after the URL changed but before the visible instrument control/diagram committed. Its picker now waits for the visible control value before independently comparing all figure text with a fresh URL. The focused final-build rerun passes.
- Finance AC107 scans only the article and recognises both its neutral foreground and the shared prose neutral foreground; it still rejects any other nongreyscale political hue, prohibited filter, and money-based sort. The focused final-build rerun passes.
- Finance fold tests AC97/105 retain the 844/1688/800-pixel limits and original header/map dimension limits. Their coordinates are measured from the embedded Finance article's reading origin; the shared workspace context is outside those legacy measurements. The independent entry-focus checks remain separate.

- Welfare AC81 uses the same dossier-origin approach: its 800-pixel scrubber limit and 420–620-pixel figure-height limits are unchanged, and the focused final-build check passes.
- Tenders AC20 inspects the built source-map contents of the legacy implementation, requiring the expected modules to be present. Independent investigation evidence can legitimately name the same dataset in shared bundles; all dynamic provenance-line and copied-citation assertions remain.
- Tenders fragment/head-link landing tests retain the 120-pixel budget against the actual scrolling viewport and retain visible-target, keyboard-focus and history checks. SQL blocks must fit their real content box and have no internal or document overflow. Its first-phone-screen criterion passed unchanged on the mobile-entry build.

## Builds and execution

The complete legacy page run uses frozen `dist` (`index-DDprgRLJ.js`) with fresh empty/three-holder fixtures. Smoke, Education, Water and graph-viewport workflows use that same frozen artifact. The native-history stress and full Public Works workflow use `dist-next` (`index-Br1wvCFs.js`). Focused Finance harness reruns use `dist-release`; the changed page implementations are the same. The actual mobile entry regression is verified on final `dist-final` (`index-B8R4qcK1.js`). Production artifacts were not replaced underneath running suites.

## Reconciled results

The original concurrent run completed all 356 reported criteria: **250 passed, 103 failed, 3 skipped**. Eighty-five failures came from a single Welfare before-hook timeout while waiting for its heading; those test bodies never ran. The complete isolated Welfare rerun completed with 69 passes, one old-origin fold failure, and 15 explicit skips. That fold criterion subsequently passed with its original budgets measured from the dossier origin.

All original non-Welfare failures have passing focused reruns. The resulting criterion-level evidence is **338 passed, 18 skipped, no unresolved failure**. This combines the original run and the specified reruns; it is not a claim that the original run was clean.

| Suite | Criteria | Original pass / fail / skip | Reconciled pass / fail / skip |
|---|---:|---:|---:|
| Navigation unit | 4 | 4 / 0 / 0 | 4 / 0 / 0 |
| Energy | 67 | 65 / 2 / 0 | 67 / 0 / 0 |
| Finance review | 4 | 4 / 0 / 0 | 4 / 0 / 0 |
| Finance | 110 | 103 / 6 / 1 | 109 / 0 / 1 |
| Tenders | 86 | 74 / 10 / 2 | 84 / 0 / 2 |
| Welfare | 85 | 0 / 85 / 0 | 70 / 0 / 15 |

Additional completed workflows:

| Workflow | Verified scope | Result |
|---|---|---|
| Smoke | 140 route/surface loads, including map-first and explicit dossiers | Pass |
| Graph viewport | 59 geometry, gesture, accessibility and evidence checks | Pass |
| Education | Complete export, persistence, filters/history, discovery and district-coverage workflow | Pass |
| Water | Complete provenance/export, reading-list, history, discovery and responsive workflow | Pass |
| Public Works | 77 checks | Pass |
| Rapid dossier history | 15 consecutive cycles across Education, Water and Public Works | Pass |

## Explicit coverage limits

- Finance AC38 has no recorded zero-amount loan fixture.
- Tenders AC36 has no in-range year with fewer than 30 records; AC44 has no row missing its Wilson interval.
- Welfare AC01–08 and AC80 are empty-build-only criteria and were not executed by the full-build run. AC11, AC12, AC20, AC33, AC45 and AC56 lack a matching financial-year money-coverage fixture: the relevant column is zero throughout 2000–2026. These 15 cases are skips, never passes.
- Welfare also reports that no zero-count chip fixture was discovered, so the corresponding filtered-panel sentence remains unchecked within AC34.
- This verifies the curated local corpus and browser behaviour, not exhaustive Indian geographic coverage or the truth of underlying allegations.

Per-case outcomes, reasons, build boundaries and SHA-256 hashes of the original and focused logs are recorded in [legacy-acceptance.json](legacy-acceptance.json). Chromium was 151.0.7922.173 on Debian 13. The integration lead reduced page-file concurrency to two to avoid repeating the startup failure under concurrent fixture builds.

This is the map-first baseline before the subsequent procurement-trail extension. That extension requires its own targeted verification against its new production build; these frozen results do not silently cover later changes.
