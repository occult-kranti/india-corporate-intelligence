# Independent review log

Review date: 2026-10-14 UTC. Coordinating reviewer saw draft claims; this is not a blinded review. Independent reopening of selected source texts is a factual spot check, not an independent evidentiary origin.

## Round 1: source and coverage baseline

- Recounted baseline: 84 events, 81 country codes, 128 embedded source records; 31 unknown start dates; 66 unknown statuses and 18 historical ended statuses. No duplicate event IDs or broken nested source references found by `audit_artifacts.py`.
- Baseline snapshot is October 2, 2026. The 249 country/territory reference roster is not evidence that 249 jurisdictions were substantively reviewed. Baseline citation metadata lacks explicit access-depth/family fields; adapter must mark inherited citations, not freshly read originals.
- Epstein index inventory contains 525 unique filename entries across 12 first index pages. Counts match arrays, no duplicate names found. Zero payload downloads; corpus totals unknown. Index metadata does not support document-content findings.

## Round 2: adversarial path/data review

- India initial import contained 108 relations, 102 without temporal bounds. No cross-repository joins asserted. Requested explicit temporal-path exclusion for undated imported relations.
- Imported numeric amounts include approximate values representing ranges, as well as awards, donations and pledges. Requested nonaggregable treatment and explicit unknown stage; no cross-sector total is justified.
- Five supersession pointers used original `atlas:*` IDs while displayed relation IDs were ordinal IDs. Requested reversible mapping or explicit unresolved target; this matters to retaining corrected claims.
- Publisher names were used as source-family identifiers; AP syndication must not count as an independent origin. Requested separate publisher and unresolved/known family metadata.
- Imported entity prose contains consequential and negative claims that have not been reverified. Requested prominent inherited/unverified labels rather than implicit factual endorsement.

## Round 3: falsification and code review

### Selected source reconstruction

1. Reopened Indian Express overview, updated October 5, 2026: https://indianexpress.com/article/cities/mumbai/maharashtra-protests-cjp-cockroaches-tribal-students-women-farmers-10907360/ . Article describes preceding weeks/months (paragraphs before thematic sections); Students bullet 2 identifies Pune hostel protest but gives no occurrence day. The supplement initially assigned publication date to occurrence/last-observed date. Correction requested: event date unknown; report publication retained separately. Correction verified in the updated packet.
2. Reopened NYDFS order: https://www.dfs.ny.gov/system/files/documents/2020/07/ea20200706_deutsche_bank_consent_order.pdf . Paragraph 114 orders $150m; paragraph 121 encompasses correspondent-banking matters and Epstein-related conduct; paragraphs 109–111 recognize cooperation and remediation. This supports E-C06 with the stated multi-matter and noncriminal limits. Source was accessed through web text, not downloaded bytes. Only selected passages independently reviewed.
3. Internal consistency check: E-S04 identifies September 30, 2023 as JPMorgan reporting-period end, but draft E-C07/E-C08 used it as publication date. Requested publication date null unless independently established and a separate reporting-period-end field. Payment date must not be inferred from agreement timing. NYDFS July 6 date must retain filename-derived basis until confirmed.

### Code findings sent for repair

- UI source cards need all branch field aliases (family/sourceFamily/source_family; accessDepth/access_depth/access_status; document/publication/retrieval dates).
- Country stats initially excluded `Unknown` but not `UNKNOWN`; mixing country names and codes could double count the same country.
- Relation rows need their own inspector/source trail; initial graph-only edge representation did not expose these.
- Graph line styles must distinguish analytic, alleged, superseded and imported/unverified assertions; mere solid lines can overstate certainty.
- Recorded-year filter must not imply event occurrence, continuous interval coverage or current activity. Unknown dates must remain visible as unknown.
- Independent initial integration unit run: 14 tests passed. Two resource warnings for unclosed test file handles, no failing assertions. These are structural tests, not evidence validation.

## Release gate

Fixes and final test/screenshot results will be appended after the branches freeze. No all-clear is implied by this draft log. Remaining research gaps are explicit in RESEARCH_ROADMAP.md. No external publication or repository writes have been performed by this reviewer.

### Repair verification, 2026-10-14

- Integration rerun: 18/18 tests pass. All 108 initial imported relations now have pathEligible=false and amountAggregable=false; underlying originals remain available. Source families normalize known AP/Reuters/AFP origins and otherwise remain UNKNOWN. Stable identifiers and supersession-resolution tests pass.
- UI rerun: 16/16 model/DOM tests pass; static build succeeds. Tests cover unknown starts, recorded-year semantics, invalid coordinates, source inspection, empty filters, keyboard hooks and executable-link/HTML inertness.
- Screenshot verification was attempted with installed Chromium against localhost. It failed before rendering with process singleton socket permission errors, including the reviewed elevated attempt. No screenshot exists and visual layout QA has not passed. DOM tests are not a substitute for visual review. The ZIP must state this limitation.

### Additional correction round: target paths and document changes

- Independently reopened Supreme Court of India October 9, 2026 order (Diary 63560/2026 with 63544/2026): https://api.sci.gov.in/supremecourt/2026/63560/63560_2026_1_801_74929_Order_09-Oct-2026.pdf . Paragraph 5 states counsel did not represent proposed protesters; paragraph 8 distinguishes regulated services from outright prohibition; paragraph 11 requests reports within four days. This validates the bounded order descriptions, not subsequent compliance.
- The order does not identify the particular electoral protest episode. Initial direct documentary-fact join was rejected. The revised packet creates a separate judicially referenced protest-context node and an attributed-report bridge using a different source. No organizer identity or representation is inferred.
- Document-change records preserve unavailable before/after hashes. Section consolidation is publisher-reported; withdrawal is attributed reporting; access-denied status is a retrieval observation. Requested and verified qualified `observationBasis`/`displayLabel` fields so unqualified enums cannot imply first-hand before/after comparison.
- Found assembly null-ID concatenation and schema mismatch that could erase Epstein event dates. Fixed null handling; raw dates are preserved. Requested separate display of source-reported date sequences/intervals rather than inventing an exact start or continuous period.
- Repository-derived sources, newly opened sources, and original-document hashes remain separate. No removal-motive conclusion or cross-repository culpability path is admitted.

## Final bounded result

Final inspected assembly: 198 base/entity/claim records, 135 typed relationships, 284 source entries, eight document-change cases. The UI additionally exposes relationship inspection rows; its displayed record count is therefore larger than the base record count. Counts are inventory sizes, not independent confirmations or exhaustive real-world coverage.

Independent final rerun: 37 integration tests and 23 UI model/DOM tests passed. Protest validator passed its eight declared structural checks; Epstein validator passed with 11 sources, 16 bounded claims, eight institutional edges and 525 first-page filenames. Zero original Epstein source files were downloaded/hashed. UI input and built-dist JSON were compared byte-for-byte with the final assembled dataset and matched. Selected raw repository cache files are verified against pinned Git blob hashes; research extract hashes are not original-document hashes.

Disposition: suitable for delivery as a bounded, source-aware research prototype, with visual QA incomplete and unresolved original-source/coverage gaps preserved. Not suitable for claiming exhaustive connections, inferred criminality, proven concealment or quantitative causal effects. No external publication/deployment authorized or performed.
