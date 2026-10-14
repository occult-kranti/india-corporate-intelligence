# Procurement release acceptance

Verified on 6 October 2026 using Chromium 151.0.7922.173 through Playwright, pinned to `/usr/bin/chromium`. This report covers the procurement extension after the map-first baseline in [LEGACY_ACCEPTANCE.md](LEGACY_ACCEPTANCE.md). Earlier reports remain historical evidence.

## Results

| Workflow | Artifact | Result |
|---|---|---|
| Complete shared workspace | `dist-procurement` | **669 assertions, 12/12 scenarios, zero browser exceptions**; 40 routes |
| Complete shared workspace, after inspector scroll fix | `dist-procurement-final` | **669 assertions, 12/12 scenarios, zero browser exceptions**; independently executed by the integration lead; retained report inspected |
| Public Works dossier | `dist-procurement` | **77 checks passed**; 56 sources, 156 buyer aggregates, 58 relationships |
| Rapid Search → Back → Forward → reset | `dist-procurement` | **15/15 cycles passed**: five each for Education, Water and Public Works; URL, drafts and workspace context agree |
| Complete Tenders suite, before harness reconciliation | `dist-procurement` | 86 criteria: **69 passed, 15 failed, 2 skipped**; 550.7 seconds |
| All 15 failed Tenders criteria, corrected harness | `dist-procurement-final` | **15/15 passed**, no skips; 72.8 seconds |
| Reconciled Tenders coverage | Both frozen artifacts, as specified above | **84 passed, 2 explicit fixture skips, zero unresolved failures** |

The reconciled Tenders result combines the complete run and its focused rerun. It is not a claim that the original 86-criterion run was clean, or that the entire suite was repeated on the final artifact. No mismatch in underlying buyer values, counts, sort order, HHI, source-derived figures or exports was found. The relevant exact comparisons remain in the tests.

The two Tenders skips are unchanged fixture limits: AC36 has no in-range year with fewer than 30 records, and AC44 has no emitted row missing its Wilson interval. Neither is counted as a pass.

## Artifact boundaries

The first artifact remained frozen throughout the full Tenders, Public Works and history workflows. The final artifact adds the narrowly scoped inspector remount keyed by selected artifact kind/ID, so switching from a scrolled procurement cohort to a corpus finding begins at the new heading. The lead reran the entire shared-workspace workflow on that final artifact. The legacy dossier implementations and retained data did not change between these builds.

| File | SHA-256 |
|---|---|
| `dist-procurement/index.html` | `3534a5ed0ab199fa7c56cc0e1c9139638e44aab31173477acf6822676e03e045` |
| `dist-procurement/assets/index-Drc0P6Ym.js` | `0e738bcdfdd28d3413da858ba230c00df270f1fe91f6266a88543fcf339545b5` |
| `dist-procurement-final/index.html` | `929d47431973d293a16795a7dbd2195557cb8574d6c7721e02889b7d8b1a4478` |
| `dist-procurement-final/assets/index-BCw8brm5.js` | `e410c948a6656207d2bab84d2d83363217c8bf0ddfc84309a4c1189200a0dd8c` |
| Shared `index-BJ02K20T.css` | `e9752a9c90919721e040698834ab2a7fd535d90562dc9009a1786236d11799ca` |

## Harness reconciliation

The release verifier changed no production source. The integration lead reviewed and approved each adaptation to the existing Tenders harness. The focused final-artifact run covered **AC07, 08, 16, 21, 25, 29, 32, 40, 46, 52, 62, 69, 76, 83 and 85**.

- **AC07/25:** The first data chart is selected with `svg[role="img"]`; decorative arrows in the newly added audit links no longer count as quantitative charts. Quality and the figure sentence must still precede that chart.
- **AC08/29/32:** Expected headings and exclusion labels now say “recorded dataset-date gap” and “stored-field ordering difference.” The previous “short decision window” and event-order interpretation are contradicted by the bounded source-field investigation. All original numeric exclusions, bases and chart accessibility counts remain exact.
- **AC16/21:** The complete current source-derived innocent reading must be visible in the Timing section, after the rate and before its chart, at the rate's font size. The immediate position is reserved for the new field-semantics caveat. The Gaps checks continue to compare with the current source reading; the removed historical Election-calendar sentence is no longer required as a literal.
- **AC40/52/62/69:** The shared table reader excludes only the new `[data-procurement-trail-link]` navigation action from the buyer value. Existing raw-key handling remains. Buyer names, winner labels, amounts, null-HHI rendering, row counts, sorting, wrapping markers and coverage notes still compare exactly with the retained data.
- **AC46/85:** The nearest explicit limitation may be either the innocent reading or the new field-semantics warning. The original 1.5-line spacing budget, visibility, color, font size and weight checks remain. Every full source-derived innocent reading is still required verbatim, and AC16 independently constrains its local placement.
- **AC76:** The new source-audit disclosure names its content in the summary and must show its exact reviewed-findings count visibly above the collapsed list. The count must equal the list length. Original disclosure keyboard behavior and the prohibition on hidden counted figures/tables remain unchanged.
- **AC83:** Only the two short inline field labels `aoc_at` and `closing_at` use measured containment instead of forced long-code wrapping. Both were checked at **320, 390, 768 and 1440 pixels**. Every other code/digest/regex target retains the original wrapping rule; SQL blocks still must occupy and fit their real content box, with no internal or document overflow.

## Commands

Executed from the repository root; output directories were never rebuilt underneath active tests:

```bash
INVESTIGATION_DIST=dist-procurement INVESTIGATION_BROWSER_ARTIFACTS=/tmp/investigation-browser-procurement PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium node scripts/investigation/browser.mjs
PUBLIC_WORKS_DIST=dist-procurement PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium node scripts/public-works/browser.mjs
DOSSIER_HISTORY_DIST=dist-procurement PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium node scripts/pages/dossier-history.browser.mjs
TENDERS_DIST=dist-procurement PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium node --test --test-concurrency=1 scripts/pages/tenders.test.mjs
TENDERS_DIST=dist-procurement-final PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium node --test --test-name-pattern='AC-(07|08|16|21|25|29|32|40|46|52|62|69|76|83|85)' scripts/pages/tenders.test.mjs
```

The integration lead's complete final-artifact shared-workspace run used `INVESTIGATION_DIST=dist-procurement-final` and `INVESTIGATION_BROWSER_ARTIFACTS=/tmp/investigation-browser-procurement-final` with the same browser script and Chromium path.

The complete Tenders run rebuilt its missing-CPPP fixture in a scratch copy, with no mutation of the research inputs or either frozen release directory. Its empty-state criteria passed. The final harness also passes `node --check`; `git diff --check` was clean for the verifier's changes.

## Execution receipts

These are workspace execution artifacts, not hosted downloads. Their hashes identify the exact reports/logs inspected during this release review.

| Artifact | SHA-256 |
|---|---|
| `/tmp/investigation-browser-procurement/results.json` | `4d6cb31c486c7286f142a8132c6646e8727e242a7b440240316f7ae91b41c2fe` |
| `/tmp/investigation-browser-procurement-final/results.json` | `ecd93c9d657fb9027d5c35a5c3091646d1cf97b53b6c78c1c82a0130fca2948b` |
| `/tmp/public-works-procurement-release.log` | `62c7e123ca454bc504f55c6a152ad4a45efb2e8d191b5aec556f1195e278f341` |
| `/tmp/dossier-history-procurement-release.log` | `6efa4fad0972f8c36e9a53ebff2a1e8eff1c317126bb1c7e8fe8f4968b66b705` |
| `/tmp/tenders-procurement-release.log` | `2104fbae9a1df0c2fbb23dea01b91c05c67e13590877684cfb35d7229a3069f6` |
| `/tmp/tenders-procurement-final-focused.log` | `17a0145b7b66500153b3d289e6570fce8c0cda071f2a46f2cf21bd060dd86204` |
| Unchanged shared-workspace browser harness | `4366075ba36e191c10a483fe7640b8133cb2cb3f83fe67f88b664a1ca04b901a` |
| Tenders harness at the complete run's start | `94176da6941b36e9d8cbe2818cbbcfec2c59b591b88e6ed550fc39b63a75dd54` |
| Tenders harness used by the passing focused rerun | `c3fe3b8b67d27033e3e139165caca07b4d000ef7e5e0a69c1fd9c263aaac435c` |

This verifies browser behavior and faithful use of the curated inputs. It does not establish the truth of every source claim, complete Indian procurement coverage, beneficial ownership, a payment trail or misconduct. The supplied-database audit and independently reviewed procurement workflows have their own research and UI receipts under [tender-investigation](../tender-investigation/).
