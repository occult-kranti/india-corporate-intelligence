# Public funding research desk

Review date: 8 October 2026. Historical scope: 8 October 2011–8 October 2026, with older background labelled. This release adds a research desk at `/#/funding-investigations` to the existing India Corporate Intelligence application.

## What was added

Five research tracks contribute **28 curated case files, 62 attributable claims or research propositions, 73 source entries, 200 scoped entity records and 196 documentary relationships**. The sources represent 73 distinct URLs and 70 declared source families; neither count means independent corroboration. Nine entries are explicitly secondary-only. Original PDFs, selected extracts, indexed official text and reporting are distinguished by inspection scope and retained-byte hashes.

The files address defence budgets and offsets, arms-contract proceedings, police procurement, border-event attribution records, water and power finance, public health procurement, welfare controls, PM CARES, skills programmes, corporate insolvency, media control and airport concessions/refinancing. Seventeen selected cases contain structured institutional decision analyses. The existing atlas's other sectors remain searchable and navigable with their own source dates; this release does not claim to have re-investigated every inherited record.

The flat geographic map shows case associations rather than transaction addresses. It links to a relationship graph, evidence readers, contrary explanations, falsifiers, next-record requests and exact JSON exports. The coverage register contains 113 entries; the rejected-connection register contains 33 proposed joins that were not admitted. These are deliberately visible research boundaries.

## Examples where scrutiny changed the story

- **Defence offsets:** the original committee report describes US$6.71 billion in claims as *disposed of*, not accepted discharge, and US$88.60 million in penalties as *imposed*, not collected. The missing acceptance and recovery ledgers are separate acquisition targets.
- **Delhi Safe City:** a February 2026 announcement and an August parliamentary table use different camera-integration counts. Reconciling scope, timing and definitions precedes any inference of a loss.
- **PM CARES:** the FY2024–25 receipts/payments page reports ₹324.6580919 crore in implementing-agency refunds, but does not identify those agencies in the retained one-page statement. The referenced accompanying notes are the next record to obtain. A separate Aurangabad ventilator case preserves the Union's denial that the batch was funded by PM CARES.
- **Power and water:** project debt, public royalty escrow, smart-meter payment priority, compensation billed and actual recoveries are different relationships. Later NTPL recovery evidence qualifies the earlier audit picture.
- **Corporate and media cases:** the September 2025 BPSL judgment and May 2026 NDTV adjudication prevent older adverse narratives from being presented as the current legal outcome.
- **Defence-linked skills:** a CAG passage connects DIAV training to named private facilitators and observed subcontracting. The exact legal identity behind the audit's “IL&FS” label remains unresolved; it is not merged with a different corporate scandal.

Each example's complete source, scope, response and missing-record list is in its case packet. The research proposes testable institutional explanations, not private motives or person-level guilt probabilities. Attack attribution, attack financing and procurement oversight remain distinct evidence questions.

## Reproduce

```sh
npm run assemble:funding
npm run validate:funding
npm run test:funding
npm run build
npm run test:funding:browser
python3 scripts/funding-investigations/trace.py --query 'offset claims acceptance penalties recovery'
python3 scripts/funding-investigations/trace.py --from-id fi:utilities:entity:pds --depth 3
```

The fixed 13-question acquisition search spans the full existing registry plus the new files. All rankings, including irrelevant and zero-score results, are preserved in compressed JSON. Six exact-edge navigation exercises retain direction, stage and citations. Repeated-name groups are an unapproved review queue; no name-based merges or new transfers were inferred. Read the [retrieval review](../../research/funding-investigations/analysis-review.md) before interpreting these results.

The local model weights, failed adapter experiment, holdouts and prospective cohort are unchanged. This work is new evidence acquisition and graph analysis, not a new fine-tuning run or a validated forecasting model.

## Continue the project

- [Panel decisions and reciprocal reviews](PANEL.md)
- [Research memory and working rules](MEMORY.md)
- [Parallel roadmaps and completion gates](ROADMAPS.md)
- [Methods and supporting literature](METHODS.md)
- [Machine-readable evidence contract](CONTRACT.md)
- [Current source-backed research streams](../../research/funding-investigations/streams)

No contacts, messages or information requests were sent to third parties. Listed acquisition tasks are future work, not obtained documents or scheduled monitoring. Coverage is purposive, uneven and incomplete across years, jurisdictions and sectors.
