# Funding investigation roadmaps

Review date: **8 October 2026, America/New_York**. These are parallel work packages with observable gates, not a claim that queued research has been completed. Historical scope is the previous 15 years; older law, company origins and cases can supply dated context. An “all sectors” roadmap covers the repository's domains while case evidence remains uneven and bounded.

## Roadmap 1 — acquire institutions and reconcile financial stages

| Phase | Work package / evidence holder | Deliverable | Completion gate |
| --- | --- | --- | --- |
| Now | Defence, police/border, utilities, welfare/PM CARES specialist streams; wider-sector bridge stream | Source-located cases, responses, rejected joins and exact funding graph | Every published assertion has a reading locator, inspection scope, status and source family; validator passes; another specialist challenges adverse findings. |
| Next | Union Defence Services/MoD, Home Affairs, state police, CAPFs, coast guard and civilian border works | Ministry → demand/grant → appropriation/actual → implementing agency crosswalk for each FY | All stated totals reconcile to the same year and accounting classification; pensions, civil defence, capital, revenue, grants and loans not double counted. |
| Next | Delhi and Mumbai procurement authorities; expand other metros and state capitals from a jurisdiction roster | Fixed buyer × sector × FY coverage matrix, including empty cells and unavailable records | Denominator fixed before reporting coverage; every cell marked examined/partial/queued/unavailable. A missing website document is not non-expenditure. |
| Next | Water boards, power utilities, DISCOMs, urban local bodies, scheme ministries | Tender → award → amendment → payment → acceptance ledgers, first for selected exact IDs | Stage transitions joined by contract/package/transaction identifiers; currency, quantity, tax, period and revision reconciled; missing hop remains a record request. |
| Next | PM CARES/public fund accounts, donor annual reports, public grants, audited programme statements | Separate donor disclosures, fund receipts, allocation, refund, implementation and beneficiary/service delivery paths | Donor fiscal periods match receipts or mismatch remains explicit; no unsupported donor-to-vendor allocation or claim that common recipients prove diversion. |
| Later | Additional states, district implementing agencies, state PSUs and public concessions | Comparable coverage over the historical window | Coverage and source availability measured per jurisdiction/year; no extrapolation of selected controversial cases to national prevalence. |

## Roadmap 2 — extend every existing sector without turning context into cash

| Existing domain | Highest-value next records | Rival explanation / gate |
| --- | --- | --- |
| Roads, bridges and railways | Original estimates, design variations, measurement books, acceptance, defect-liability and rectification payments | Repeated work may be another scope/package or a warranty correction; exact location, chainage, contractor and paid line items required. |
| Ports, airports, mining and natural resources | Original and amended concession deeds, concession fees, royalty/revenue statements, performance obligations and related-party disclosures | Privatisation/lease value, enterprise valuation and annual revenue share are different quantities. Missing clause comparison blocks a benefit/loss calculation. |
| Electricity, renewables and water | Tariff orders, subsidies, performance-linked contracts, escrow/collection waterfalls, project lending and commissioning records | Cost overruns, tariff revisions and vendor concentration may be lawful; identify the operative rule and consumer/service outcomes. |
| Schools, colleges, health and hospitals | Institution-level opening/closure/change registers, grant releases, empanelment claims, payment and patient/service statistics | A lower school stock is not a closure list; a claim is not payment; population/eligibility/time/geography must align. |
| Welfare, NGOs, religious/charitable trusts and disaster relief | Scheme ledgers, audited utilisation, FCRA/charity filings, bank-supported public disclosures and procurement acceptance | Exemption status, lawful donations and inter-fund transfers do not prove laundering; do not publish private beneficiaries or account identifiers. |
| Corporate lending, tax and financial supervision | Vintage-matched write-offs/recoveries, NCLT orders, lender disclosures, tax judgments and effective policy instruments | Write-off ≠ waiver, debt ≠ equity, tax estimate ≠ tax assessed, a stay ≠ exoneration; retain dispositions and appeals. |
| Media and political/corporate connections | Dated control/ownership changes, exchange disclosures, loan instruments, correction and review orders | Common ownership or political proximity is not editorial control or a payment; source-backed public role validity is required. |
| Police, military, recruitment and border events | Budget grants, procurement agreements, recruitment rules/results, audit/action-taken, public inquiry and judicial outcomes | Funding accountability, recruitment legality and incident attribution are separate questions. Publicly unavailable operational records do not create a false-flag inference. |
| International loans, arms suppliers and foreign governments | Signed loan/credit terms, sovereign guarantees, disbursement, delivery/acceptance and end-use public disclosures | Commitment ≠ disbursement; government-to-government intermediary ≠ final manufacturer; domestic production shares and offsets require actual records. |

## Roadmap 3 — decision histories, institutional incentives and counterfactuals

For each selected decision, construct `authority → contemporaneous information → feasible options → recorded action → later outcome`. Preserve the effective law and source availability separately from event dates. Use the Osborne/Rubinstein actor/history framework and causal-method discipline described in [METHODS.md](METHODS.md).

- **Now:** each author supplies an adverse theory, an ordinary-process theory and a data/identity-error explanation where plausible. Another specialist identifies the strongest disconfirming record. Gate: a specific falsifier and holder are named, not merely “more research”.
- **Next:** reconstruct dated decision sequences for several ordinary comparison cases as well as disputed ones. Gate: options and authority are supported by operative documents; unknown private preferences and incomplete information are explicit.
- **Later:** only where assumptions and comparison data support it, preregister a causal question and suitable design. Gate: population, exposure/intervention, outcome, time zero, confounders, selection, negative controls and sensitivity checks are reviewable before an effect is claimed.

No game-theoretic utility, person-level corruption propensity or hidden strategy is inferred from one observed outcome. Records may distinguish explanations without uniquely identifying intent. Reverse engineering targets documentary traces and oversight checks; it does not provide an operational fraud or concealment guide.

## Roadmap 4 — reliable graph and acquisition operations

| Phase | Tool or infrastructure | Gate |
| --- | --- | --- |
| Now, implemented | Standard-library contract validator; SHA-256 captures; full-registry BM25 and exact-edge path CLI | Adversarial tests cover citation/endpoint breakage, tampering, invalid amounts, prohibited totals, context paths and direction; saved runs disclose caps and input fingerprints. |
| Next | Acquisition queue from authored missing records, organized by holder and source family | Deduplicate documents, not hypotheses; record exact query and access attempt; prioritisation labels are editorial categories, never estimated guilt probabilities. |
| Next | Read-only SQLite queries over existing tender data, with exact portal/tender IDs and bounded output | Query plans, schema/grain and date semantics checked before indicators; never copy 13 GB into JSON or presume that a scrape timestamp is original publication. |
| Next | Extraction/OCR with original-page citations; legally available original notices, gazettes and judgments | Independently review a stratified sample, including Indian-language documents and corrections; preserve original and extraction hashes separately. |
| Later | Optional DuckDB/Parquet for verified analytical slices, NetworkX/igraph for descriptive structure, public OCDS exports | Adopt only for measured workload; version and licence checked before installation; graph statistics cannot be shown as corruption scores. These packages are options, not all installed/executed in this release. |
| Later | Scheduled capture and release checks | Existing scripts do not imply monitoring is scheduled. A scheduler requires actual configuration, credentials, retries, failure logging and a verified first run. |

Storage is finite and audited. Preserve originals, model weights, independent-test labels and user work. Delete only verified reproducible duplicates with exact hashes and a receipt; no deletion occurred in this round. New databases and larger models are not substitutes for missing authoritative records.

## Roadmap 5 — retrieval, extraction and model evaluation

1. Keep the failed LoRA run immutable and the exhausted 24-question holdout as a regression artifact. No post-test selection.
2. Create a larger, independently checked source-passage corpus with correct legal/accounting states, counterevidence, multilingual/OCR difficulties and insufficient-evidence cases. Split by source family, case/entity neighbourhood and time before tuning.
3. Compare deterministic lexical retrieval, retained encoder, matched untuned/fused baselines and any new adapter on identical candidate sets. Record recall of responses/corrections, source-family macro metrics and per-sector failures as well as averages.
4. Independently evaluate extraction: exact party ID, amount stage/currency/unit, dates, operative legal disposition, quoted locator, response retrieval and abstention. A retrieval score is not an extraction score.
5. Only train or scale when a frozen development protocol, new independent holdout and hardware budget exist. Gate: measured gain without increased unsupported joins, counterevidence loss or subgroup collapse. The earlier failed result remains visible even if a later model improves.

The May 2026 procurement paper supplies useful positive–unlabelled cautions, but India lacks the population, selected-label audit and time-respecting source coverage needed to transfer that model. Unlabelled does not mean clean; sanctioned does not mean all contracts corrupt. Network features computed with future edges are prohibited in a forward test.

## Roadmap 6 — prospective outcomes and correction

The existing 81-project/243-target World Bank register remains a prospective metadata cohort with null probabilities/outcomes and an April 2027 observation window. It is not reinterpreted as a successful prediction. For new tender/public-finance targets:

- Freeze the population, entry rule, `asOf` information, event-versus-publication target, horizon, authoritative resolution source, grace period and withdrawal/missing-data rules.
- Collect ordinary outcomes, not only newsworthy cases. Preserve every failed acquisition and source revision. Unknown and right-censored outcomes are not negative events.
- Start with observable events: contract amendment, cancellation, acceptance record, audit recovery response or final judicial disposition. Do not use intent, corruption or a false flag as a label inferred from spending.
- Once enough independently resolved targets exist, compare a declared reference-class baseline on the same questions using Brier/log scores, calibration and abstention coverage. Report case clustering and uncertainty. No probabilities are currently estimated.
- Publish correction history and challenge outcomes. Gate: a withdrawn source, contradicted claim or corrected amount updates both graph and UI while preserving its provenance and prior state.

## Next publication gate

The lead assembles streams only after structural validation and the second panel's passage challenges. The UI must distinguish documented relationships, attributed allegations, audit observations, unanswered questions and rejected joins; each has a working source reader and exact export. Counts must separate existing inventory, newly inspected documents, source families, assertions and search result slots. Public maps show documented associations, not invented transaction or incident coordinates. A publication with known gaps is acceptable when it states them plainly; “complete” national coverage or proven guilt is not an admissible claim.
