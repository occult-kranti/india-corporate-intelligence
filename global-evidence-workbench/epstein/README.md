# Epstein institutional evidence: bounded audit

Snapshot: 2026-10-14. This is not a complete analysis of the Epstein files or a global financial network. It covers eleven selected official, corporate and reporting sources, all twelve DOJ disclosure first-page indexes, and a separate change-provenance supplement. Index access is not PDF-content review.

## Read first

- `claims.jsonl` contains the findings and their procedural status, amount stage, exact locators, source families, responses and limitations.
- `sources.json` identifies inspected sources. `extracts/` contains short screened excerpts only. No victim identities, minor identities, private contact details, graphic descriptions or raw release documents are included.
- `institutional_edges.json` admits only explicitly documented service, ownership, settlement or regulatory relationships. An edge does not imply guilt. Southern Financial's ownership is regulator-described, not separately registry-verified.
- `corpus_inventory.json` distinguishes observed first-page file labels from unknown total document counts. None of the linked disclosure PDFs were downloaded. Endpoint IDs are not page counts, and numbered gaps are not proof that records were deleted.

## Reproduce

Run `python epstein/validate.py` from the repository root. It checks identifiers, claim references, privacy-safe edge flags, excerpt word limits and inventory counts. It hashes the actual curated JSON bytes, then normalizes selected excerpt text for exact-extract deduplication. It writes `artifact_hashes.json` and `validation_report.json`.

These are extract hashes, not source hashes. Original-source hashes remain null. The web tool exposed selected text, not original PDF bytes. A direct NYDFS PDF download returned HTTP 403. A separate direct SDNY order download was cancelled by automatic approval review; it was not retried. Last-page index requests returned 403. No authentication, age-verification or anti-bot checks were bypassed. The pipeline does not download external content, undo redactions, extract hidden PDF text or infer identities.

## Interpret money correctly

Do not add penalties, settlements, projected annual revenue, balances or transaction flows into one alleged illicit-money total. The NYDFS penalty is multi-matter. The JPMorgan corporate report distinguishes a fund payment and a settlement agreement. A payment to a settlement fund is not proof of payment to each beneficiary. A civil settlement is not a criminal conviction or necessarily an admission of liability. The Q3 report is historical and does not independently establish later final approval; a later search-only lead was withheld from the claim ledger.

## Competing institutional explanations

These are hypotheses, not findings of intent. No numerical payoffs or equilibrium have been estimated.

1. Commercial incentives impaired risk controls. Predicted records: contemporaneous revenue forecasts preceding exceptional approval, unresolved risk escalations and inconsistent treatment of comparably risky clients. Weakened by a complete contemporaneous record showing consistent risk thresholds and independently justified decisions. NYDFS material supports a bounded control-failure finding, but the comparison cohort is not acquired.
2. Operational fragmentation and inadequate systems explain failures without coordinated criminal intent. Predicted records: cross-team information gaps, inconsistent training and similar exceptions among non-Epstein clients. Weakened by explicit coordinated instructions knowingly facilitating crimes. Neither a large penalty nor a famous client's presence distinguishes these mechanisms alone.
3. Lawful disclosure constraints and victim protection explain some removals. Predicted records: dated correction requests, redaction revisions and reinstatement logs. Weakened by unexplained selective loss of non-sensitive material under otherwise comparable handling. Absent public logs, intent remains unresolved.
4. Political or institutional self-protection influenced publication decisions. Predicted records: authenticated contemporaneous directions tied to the sensitivity of public officials rather than lawful exemptions. Weakened by consistently applied documented criteria across comparable records. Current missing-page observations cannot establish this explanation.

## Preregistered comparison and next records

For onboarding decisions, the comparison population would be all similarly risk-rated private-wealth clients considered in the same business unit during 2012–2014, with exposure defined before examining outcomes. Required fields: risk rating, revenue forecast, onboarding decision, escalation timestamps, approval chain and later control findings. This cohort is not public in the inspected packet; no causal effect is estimated.

For release changes, the unit is a stable document ID plus version and source family. Compare withdrawn/reinstated records against retained records by document type, privacy flag, legal basis and release date; do not use named-person counts as a guilt metric. Needed next: an official version manifest, lawful redacted correction log, exact docket filing for the February 2 correction letter, and reproducible safe before/after hashes. Do not retrieve removed victim-identifying material.

## Exclusions and unresolved matches

- No address-book, flight-log or social-photo relationship is admitted to the institutional graph.
- No match from NYDFS's anonymized `US BANK-1` or employee labels to a named person/institution is made here.
- No India, protest, election or geopolitical connection is inferred.
- Named entities sharing tokens do not automatically merge; legal subsidiaries remain distinct.
- Allegations mentioned in releases, complaints or news reports remain allegations unless a specified adjudication establishes them.
- Current litigation and corpus coverage are incomplete. The January 2026 Maxwell order describes a then-pending collateral petition; this audit does not establish its current disposition.

## Revision history

2026-10-14: Initial screened packet. Independent reviewer corrected date semantics: Q3 reporting-period end is not publication date; preliminary approval month is not payment date; NYDFS filename date is not established publication date. Incorporated in the ledger. Further reviewer findings should be retained rather than silently overwriting disputed evidence.
