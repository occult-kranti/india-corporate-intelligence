# Metro spending release acceptance

Review date: 7 October 2026. Source base: `528948966c1015ea25bcf2539004561e8fd68963`. Working branch: `codex/education-funding-intelligence`. No skills were used.

## Research and counting contract

Five new strict slices add 143 entity/documentary-cohort rows, 131 researcher-authored relationships, 80 typed records and 38 source rows. Seven separately sourced, identity-only bridges add seven navigation relationships and seven bridge records. The integrated change is therefore 143 entities, 138 relationships, 87 records and 38 sources. Totals after integration: 2,418 entities, 4,141 relationships, 5,555 records and 3,291 sources; 316 retained held records remain held.

The additions expose 13 case files, 12 audit findings (including two honestly reported findings), five outcome records and 13 alleged relationships. Thirty ordinary funding/procurement records remain outside allegation counts. Cases, findings, outcomes and links overlap; they are not additive counts of corruption incidents. The original 23 newly reviewed entries remain; the expanded reviewed index contains 66 entries.

The tender scan used both complete June 2026 publisher-hash-verified SQLite snapshots: 3,952,191 notice listings and 4,921,960 award listings. Thirteen disjoint, declared buyer-name cohorts select 281,999 notice rows and 464,549 award rows. These are listing populations, with duplicates and limited mirror coverage disclosed, not distinct contracts or payments. No amount total, notice-award join, supplier identity join or new allegation was inferred from these rows. See `TENDER_SCAN.md` and the retained SQL/analysis receipt.

## Immutable build

`npm run build -- --outDir dist-metro-release` passed TypeScript and Vite production compilation. The final index SHA-256 is `ffe0ad93c809ca12b33257e21aa932f2d25c0a5db8494a1954bed3f1a2b115ae`. All 177 mapped repository source contents matched the frozen working files. All 243 build-file hashes are retained in `acceptance/build-manifest.json`. Tailwind source discovery is explicitly scoped to application source so research prose cannot accidentally change generated utilities.

The existing large-bundle warning remains: the main JavaScript entry is approximately 13.25 MB uncompressed / 2.92 MB gzip. This release expands data and navigation without replacing the existing loading architecture.

## Data and model checks

All 12 retained/new data gates passed, including 114 JavaScript assertions and the existing procurement Python checks. Gate timestamps and exit codes are retained in `acceptance/retained-data.json`. The existing 30 declared warnings remain; no retained baselines were regenerated. Authored-file whitespace checks passed.

The pinned Apache-2.0 MiniLM model was actually executed locally over 397 public authored summaries with eight discovery queries. The CPU inference took 16.35 seconds. Its corpus, suggestions, revision and execution receipt are retained under `research/metro-spending/`; the four model integrity tests passed. Similarity was used for discovery only and did not create a graph edge or allegation automatically.

## Browser acceptance

The frozen build passed 44 metro spending checks, 43 retained Allegations checks, 72 shared atlas integration checks and 32 independent source-meaning checks: 191 browser assertions with zero runtime errors. The metro suite covers city/topic filters, separate national/state context, funding search, exact evidence readers, map/network continuity, exports, URL history and 1440/768/390/320-pixel layouts. The retained suite preserves all earlier allegation workflows. Shared integration checks cover the home atlas, fourteen sector destinations, case readers, policy timeline, sourced sites, mobile layouts and dedicated money trails.

Receipts are in `acceptance/metro-browser.json`, `acceptance/allegations-browser.json`, `acceptance/browser-release.json` and `acceptance/atlas-integration.json`. The independent receipt is `acceptance/challenge-browser.json`; it verifies visible replies, acquittal scope, unresolved legal identities, reported-source limitations and city/state accounting boundaries. An initial browser attempt encountered a stopped local static server before assertions ran; the server was restored and complete suites were rerun against the unchanged artifact.

## Publication

Local acceptance and public deployment are separate. The GitHub deployment workflow will run the complete existing site gates plus the new metro data, model and browser gates. After publication, the public index, repository-hosted artifact tree and live browser workflows must be checked against this accepted build; a local pass alone is not a publication receipt.
