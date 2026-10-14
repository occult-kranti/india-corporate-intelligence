# Continuation integration review

Date: 2026-10-14. Reviewed the pending merge of `ed2dd949` into `987e4bfe`, using the merged working tree and its production build. The initial read-only review was followed by authorization to fix the two navigation issues and implement the case-linked test-plan extension below. No staging or commits were performed by this agent.

## Result

All 60 route paths are retained. Neither parent route set has missing routes in the merged `src/App.tsx`: the first parent contains 36 paths, the incoming branch 57, and the union contains 60. The investigation network, unresolved leads and game-theory lab render independently of the atlas workspace wrapper. Their desktop rail and navigation-dialog entries are present.

The initial focused browser suite passed **6/6**, and the strategy-model unit suite passed **8/8**. The two navigation integration defects found in the audit have been patched and browser-verified. The combined strategy and new test-plan unit suite passes **13/13**. On the parent's fresh build with 22 cases and 51 sources, the extended browser suite passes **9/9** in approximately 11 seconds.

## Navigation corrections implemented

### 1. Existing-register links did not open their records directly

- Location: `src/components/investigations/shared.tsx`, `LegacyLinks`.
- Reproduction: open `/investigations`, click the PM CARES link under “Go deeper in the existing registers”.
- Observed: URL becomes `#/pmcares`; the visible container is `iw-surface-map`; the current accounts table `#current-pm-accounts` is absent.
- Cause: merged `Layout` mounts these routes inside `Workspace`, which defaults to the map surface and renders its route children only for `iw_view=dossier`.
- Exact fix: set the five register targets to `/pmcares?iw_view=dossier`, `/energy?iw_view=dossier`, `/welfare?iw_view=dossier`, `/atlas?iw_view=dossier`, and `/network?iw_view=dossier`.
- Verification after fix: the PM CARES link should display `#current-pm-accounts` without requiring an additional Dossier-tab action; the other links should mount their corresponding original register content.
- Source status: applied to all five links; the passing browser regression follows the PM CARES link and confirms the current accounts panel.

### 2. Returning from a selected strategy case discards case context

- Location: `src/pages/GameTheory.tsx`, link inside `.gt-case-context`.
- Reproduction: select `fund-pmcares-foreign`, then click “Open the investigation desk”.
- Observed: URL becomes `#/investigations`; there are zero `#inv-dossier-title` elements because the selected case is not carried across.
- Exact fix: replace `to="/investigations"` on that contextual link with `to={`/investigations?case=${encodeURIComponent(selectedCase.id)}`}`.
- Verification after fix: the returned network should show the source dossier selected with its finding, response, limitation and citations.
- Source status: applied; the passing browser regression exercises the exact lead → worksheet → source-dossier round trip.

## Case-linked test plans implemented

- Every lead has a “Plan this test” link with its exact case and hypothesis index. The lab validates both query parameters and explains invalid links rather than inventing a case.
- A collapsible test-plan editor captures the unit/comparison population, time window, alternative's predicted observation, and analysis method (including controls and multiple testing where relevant).
- Timing defaults to “Exploratory / records already seen”. The alternative, “Before new search”, is explicitly self-reported.
- A revision freezes a copy of the complete worksheet and plan with the browser clock timestamp. Later edits create a new draft; previous revisions have no editing controls and their objects are frozen on creation and reload.
- Histories are separate for each case/question and each generic role. The JSON export includes only the active worksheet's plan and complete revision history, with the browser-local/self-reported limitation.
- The existing `icip-strategy-lab-v1` storage key is retained, with a version-2 payload. Valid v1 drafts survive migration. Malformed model settings do not discard valid notes; malformed plan/history entries are rejected independently.
- No probability of guilt, conspiracy or intent is generated. The existing hypothetical incentive model is unchanged.

## Small follow-ups, not release blockers

- Mobile sector shortcuts in `Layout.tsx` omit the three new investigation routes. They remain accessible through the navigation dialog, and the network/leads pages have their own subnavigation. Adding the new routes to the shortcut strip would make mobile discovery consistent with the desktop rail.
- The game-theory page has no matching investigation subnavigation. Adding the shared subnavigation would make returning to network/leads easier on mobile. This is an optional consistency improvement, not a broken route.
- The original game-theory controls computed to 13px at 390px. A mobile 16px `select`/`textarea` rule has now been applied, consistent with `DESIGN.md`.

## Evidence

Commands run:

```sh
PLAYWRIGHT_CHROMIUM_PATH=/tmp/icip-browser/chromium node --test scripts/pages/investigations.test.mjs
node --test scripts/game-theory.test.mjs
node --test scripts/test-plan.test.mjs scripts/game-theory.test.mjs
```

The six browser checks cover network filtering/source ledger/deep-link reload; JSON/CSV provenance exports; saved lead reload and removal; hash-safe strategy navigation and persisted worksheet export; mobile overflow and runtime exceptions; and the current PM CARES accounts table, unit-preserving export and mobile layout.

A separate browser probe confirmed the two navigation defects above. It also measured page/main/document widths at 390px, 768px and 1440px for all three new pages without horizontal overflow. The network and leads pages also fitted at 320px. One reused-page probe at 320px raced the game-theory route transition, so that particular measurement is excluded rather than treated as a pass.

The five new pure tests compile and execute the actual TypeScript functions. They check v1 migration, immutable snapshot isolation, malformed-storage recovery, valid exact deep links, and invalid capture rejection. Three browser regressions were added for the round trip through leads/registers, persisted migration and revision isolation/export, and corrupted storage/invalid query handling.

After the final build, an expanded-plan visual review covered desktop (1440 × 1050) and mobile (390 × 1000). The 390px main container measured 390px scroll width, and plan textarea text measured 16px. A further screenshot confirmed that the new RSS lobbying-disclosure dossier opens with its finding, denial, limitations and source trail. Temporary review artifacts were preserved at `/tmp/icip-integration-review/`: `test-plan-desktop.png`, `test-plan-mobile.png`, `test-plan-revision-mobile.png`, `rss-lda-dossier-desktop.png`, `test-plan-export.json`, and `browser-local-state-fixture.json`. The plan/export fixture explicitly identifies itself as UI verification, not a research finding.

No full `npm check` was run by this agent; the parent agent owns the full merged regression run. This report does not certify remote deployment or the factual correctness of the research corpus.

## Retained tenders integration follow-up

The parent's earlier retained-page run completed with **348 tests: 308 passed, 22 failed, 18 skipped**. It began before the optional-fleet fix and overlapped local builds while its servers read `dist` dynamically. It is not a clean final verification. Finance AC65, AC66 and AC89 later passed unchanged in focused runs; AC64–66 also passed together. The parent separately verified the remaining energy and welfare timeout cases.

The tenders investigation first copied the then-current production build to a frozen directory and ran AC07, AC73, AC80, AC81 and AC85 unchanged. AC80 passed; the other four failures reproduced. Their causes and corrections were:

- **AC07:** the test's global tree walker encountered an unrelated atlas context record (“Government of Telangana · 51% of SCCL”) before entering the tender article. The test now inspects the complete tender article, preserving the requirement that its caveat precede every tender percentage, quality table and data chart. It does not narrow the check to a favorable paragraph or filter quantitative content out.
- **AC73:** the link was keyboard reachable at global Tab 93; the old test stopped at 80 while still traversing the new atlas map's state controls. The corrected route test starts at the existing focusable `.iw-dossier-content` entry, then still uses real Tab and Enter and checks heading focus, URL state and reading position. It does not programmatically click or focus the destination link.
- **AC81:** two unchanged source-citation strings contained a long URL that overflowed a 356px reading surface to 378px. Their parent div/section also registered that overflow, producing four leaking elements. The shared tender metadata-note class now uses `overflow-wrap:anywhere`, retaining the exact source text and allowing visual line breaks. No overflow clipping or data removal was introduced.
- **AC85:** its jump-list probe actually selected the enclosing body div of the verification sentence's first subsection link. It now measures the existing `nav[aria-label="In this section"]`. The separate AC81 check continues to reject overflowing content anywhere outside an approved table region.

Changed files: `src/components/tenders/ui.tsx` and `scripts/pages/tenders.test.mjs`. The project build passed (`/tmp/icip-tenders-fix-build.log`). On a fresh frozen build, all eight focused checks passed in 74.9 seconds: the five original failures plus jump navigation, table keyboard focus and the first-screen evidence boundary (AC61, AC74, AC82). Results are recorded in `/tmp/icip-tenders-fixed-focused.log`; no acceptance check was skipped. The full PR CI result remains the merge gate.
