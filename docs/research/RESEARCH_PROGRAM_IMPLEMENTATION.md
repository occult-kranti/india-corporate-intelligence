# Research-program desk implementation and verification

Reviewed 2026-10-14. This report describes the implemented interface and its bounded verification, not the truth of any untested research hypothesis.

## Implemented workflow

`/research-program` is a dedicated, lazy-loaded route in the existing investigation navigation, desktop rail, mobile shortcuts and all-register library. Existing geographic routes and dossiers remain intact. The new route exposes five views:

- Connection desk: intersecting text, sector, status, relation and exact entity filters; a deterministic relation drawing paginated at 16 records; an equivalent keyboard-operable relation ledger; deep links; original-source inspector; source-specific amount stage and basis; filtered JSON export.
  Evidence paths in the connection desk: directed or explicitly reversed traversal of recorded entity IDs, at most four steps and three displayed paths; every step retains its status, period and sources. The UI and export explain that temporal overlap is not enforced and a path is not evidence of a contemporaneous chain, common intent or wrongdoing.
- Testable leads: editorial priority, feasibility, needed and disconfirming evidence, filtered export, and per-lead browser-local planning. Explicit validated case/question crosswalks open the existing game-theory worksheet; names never create a crosswalk.
- Coverage and gaps: inspected-record counts and acquisition limits, plus reviewed theme aliases. Selected foreign-influence disclosures do not imply comprehensive transnational, BJP or RSS coverage.
- Historical comparisons: six subject-specific legal comparisons with structured evidence chains and proposed tests. Historical analogy supplies no evidence against current actors.
- Methods: nine workflows with procedures, required outputs, failure modes, maturity labels and benchmark limits.

## Ingestion and validation

Only the five agreed corpus filenames under `research/investigation-program/` are imported. Extraction results, tools, raw PDFs and unrelated JSON cannot accidentally enter the display. The current assembled inventory has **57 sources, 54 entities, 56 connections, 16 leads, 17 coverage rows, six case comparisons and nine methods**. The sources have 45 declared families: 47 full-text, four PDF-visual, five index-only and one search-excerpt record. These are inspected inventory counts, not population denominators or independent corroboration counts.

The typed schema rejects malformed values, duplicate IDs, dangling endpoints and citations, unsupported status/read-depth enums, invalid dates, definitively reversed date windows, negative/nonfinite amounts, malformed hash receipts, unresolved registry crosswalks, and out-of-range existing question indices. Nested historical evidence-step citations must also belong to that case. A failure withholds the assembled corpus and exposes precise errors instead of drawing a partial graph. The CLI additionally requires all five files and nonempty core collections.

Source precision is preserved: year/month dates are not padded into invented day dates; amounts retain currency, unit, stage, basis and optional exact/raw wording without aggregation; source locators, read-scope notes, SHA-256 receipts and byte counts survive normalization and exports. A receipt identifies retained bytes, not independent authenticity. Text-or-array prose is normalized with nonempty checks; rich historical evidence/test objects remain structured.

## Local plan behavior

Storage key: `icip-research-program-plans-v1`. Plans use the existing validated test-plan model, while storage remains separate from existing case worksheets. Draft changes merge only the active lead into fresh local storage so another lead’s draft/history is preserved. Malformed storage recovers safely. Captured revisions copy and freeze the worksheet and plan; later draft edits cannot mutate them. Export includes the current draft, all captured revisions, lead metadata and citations. Timing defaults to exploratory; “before new search” is self-reported. The interface and exports explicitly state that local timestamps and timing are not independently registered or validated, and browser storage itself remains editable.

## Verification evidence

- `node --test scripts/research-program/research-program.test.mjs`: **11/11 passed**. Tests execute the actual schema/filter/path/export functions, with explicit synthetic test fixtures. They cover malformed inputs, identity separation, source dependence/read scope, amount/date semantics, exact crosswalks, directed/reversed paths, citation closure, source receipts and rich historical evidence boundaries.
- `node scripts/research-program/validate.mjs`: passed on all five production files with the inventory above.
- `npm run build`: passed; log `/tmp/icip-research-program-build.log`. Existing large-chunk warnings remain.
- `PLAYWRIGHT_CHROMIUM_PATH=/tmp/icip-browser/chromium node --test scripts/research-program/browser.test.mjs`: **8/8 passed**, 10.3 seconds; log `/tmp/icip-research-program-browser-final.log`. Browser server copies `dist` into a temporary directory before serving, preventing concurrent-build races.

The first browser pass exposed wrapping-label lookup instability and a view-readiness race in the new tests. Explicit input/select/textarea accessible names now match their visible labels, and view counts wait for the requested view. The final plan-reload harness uses an explicit browser context, allowing a second page to verify actual storage persistence. Export operations and revision isolation were verified from downloaded JSON, not merely from button visibility.

Screenshots were inspected at 1440px and 390px: `/tmp/icip-research-program-review/hero-*.png`, `network-*.png`, `plan-*.png`, `coverage-*.png`, and `path-1440.png`. Graph and inspector are visible together on desktop; mobile preserves the ledger and readable 16px form controls. No document-level horizontal overflow was observed. This is focused Chromium verification, not cross-browser or assistive-technology certification.

## Remaining boundaries

The graph is a navigational view over explicitly recorded relations; it computes no guilt, corruption or exhaustive-coverage probabilities. Its fixed force layout carries no evidentiary score. The first page of the graph is only 16 relations and the page counter makes this bound visible. Historical and current records can appear in one path; dates and the noncontemporaneous-chain warning remain explicit. Source-family labels disclose possible dependence but do not certify independence. Research priorities and proposed historical tests are not executed causal analyses.

Final accessibility refinement: the horizontally scrollable coverage table is now a named, keyboard-focusable region with a mobile swipe/arrow-key hint. The focused browser suite adds real focus + ArrowRight + positive scroll-offset assertions at 390px. All eight scenarios including this assertion passed in remote CI on commit `f144528c7bdb8108ae5e6062eb9f452cc3bbcbbd`. The full retained CI suite remains a separate publication gate.
