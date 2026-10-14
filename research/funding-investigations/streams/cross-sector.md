# Cross-sector investigation log

Reviewed 8 October 2026, America/New_York. The requested historical window is 8 October 2011–8 October 2026, computed as the review date minus 15 years. The 2009 NDTV contract is explicitly retained as earlier context. Source acquisition timestamps remain in UTC; they are not substituted for publication or event dates.

The completed stream contains six bounded cases, 12 registered source captures in 11 source families, 34 entity records, 30 typed edges and 14 claims. It does not claim to cover every Indian institution or transaction. The JSON also contains 16 coverage rows, with examined, partial and queued work clearly separated.

## What was learned

| Case | Supported bridge | Important challenge / stop |
| --- | --- | --- |
| BPSL insolvency | PNB petition → creditor decision → JSW resolution payment recorded by the Supreme Court → later judgment | ₹19,350 crore payment is recorded in paragraph 114. The September 2025 judgment upholds the resolution outcome; the earlier May liquidation direction is not the final captured result. The Court rejects late EBITDA redistribution claims. No fresh evidence of improper coordination was found. |
| NDTV control and disclosure | Loan options → later exercise/open offer → appellate reversal → May 2026 no-penalty disposal | The 2026 SEBI order applies the unstayed SAT ruling rejecting the earlier control premise. The order describes an appeal pending at that time. This is a narrow disclosure result, not a blanket clearance or a current docket certificate. |
| PMKVY accounts | Ministry → NSDC → Consolidated Fund interest recovery; separate disputed overhead and district allocations | ₹12.16 crore interest recovery, ₹24.13 crore disputed overhead, and ₹32.21 crore earmarked district share are different measures. Ministry explanations and CAG disagreement are retained. Later payment holds exceeding ₹400 crore concern PMKVY 4.0 and are not automatically losses. |
| Defence resettlement training | MSDE/Defence memorandum → DIAV → two named external provider labels | CAG identifies 1,843 candidates in 77 of 81 inspected batches. The broader 264-centre population is different. “IL&FS” is unresolved without a company identifier; it is not merged into the infrastructure debt group. No provider payment amount is invented. |
| Airport concessions and relief | Six concessionaires → AAI reported fee receipts; separate ministry → regulator temporary-charge policy | ₹710.88 crore is a reported fee receipt through October 2022, not an airport asset sale price. April 2026 relief also covers public airports. Future under-recovery adjustment raises a testable incidence question, not proof of favouritism. |
| Delhi airport refinancing | Explicit tariff-timing request → dollar maturity → rated proposed rupee debt → reported subscribers | The February 2025 original operator letter explicitly links requested revenue timing to refinancing. September CARE and October ET records provide follow-up. A rated proposal and anonymously sourced completion report do not establish settlement or redemption. |

The last case is a useful example of tracing incentives without inventing a secret deal. The operator publicly states its refinancing need and requested revenue pattern. The next discriminating records are the regulator’s final calculation model, allotment and trustee documents, use-of-proceeds certificate and dollar-bond redemption notice. Issuer advocacy is not regulatory capture by itself.

## Methods and searches

Applied the Exa Search and source-quality references and the data-quality workflow. Reused the repository’s behavioral-methods, panel, graph-audit and model-card contracts. Those materials draw on hypothesis-led reporting, competing explanations, causal inference and prospective evaluation. They do not validate personal psychological profiles, suspicion scores or guesses about private motives.

The Exa discovery log records 22 successful searches requesting 104 result slots. Four initial calls failed argument validation before returning results; they are not counted as inspected sources. The raw successful responses are retained in `raw/cross-sector/search-results*.json`. Search slots, distinct inspected publications, source families and agent perspectives are separate counts.

Original court, SEBI, AERA-hosted proposal, CARE PDF and PIB HTML bytes were retained where accessible. Direct CAG PDF downloads returned HTTP 503 or timed out; full indexed text was captured and the material paragraphs were inspected. The hash for that source identifies the extraction, not unavailable PDF bytes. The official CAG index was separately inspected to establish the 18 December 2025 tabling date; it shares a source family with the report and supplies no independent substantive corroboration.

The Bihar health report discovered here is handled in the welfare companion stream. Its hospital claims and administrator procurement case were independently reviewed without duplicating the cases. The small Bihar table-of-contents extraction retained in this directory is an acquisition record, not the supporting source for this stream’s findings.

## Decision reconstruction and game-theory limits

Each case includes formal actors, authority, recorded incentives, available information, constrained options, observable outcomes and hindsight limits. These are institutional decision analyses. No numerical payoff, hidden intention or probability of corruption is estimated. A late court judgment or current report cannot be silently treated as a feature available at the earlier decision date.

Ordinary explanations are explicit: legal uncertainty during resolution, commercial loan options, an expense-classification disagreement, legitimate procurement capacity constraints, tariff smoothing, and normal debt refinancing. Adverse possibilities remain falsifiable questions about allocation, compliance, evidence quality or who ultimately bears costs. Source or identifier errors are separately considered.

Attack attribution is outside these financial observations. A policy benefit after a crisis does not establish that the beneficiary caused the crisis. No false-flag or operational-vulnerability conclusion is admitted.

## Roadmaps

1. **Resolve the strongest money gaps.** Obtain NSDC recovery and receipt ledgers, exact DIAV provider contracts, BPSL bank-wise distribution certificates, airport fee and arrears ledgers, DIAL allotment and redemption records. Admit a new payment edge only when the transaction, parties, date, amount and financial stage can be resolved.
2. **Maintain legal state.** Acquire current NDTV appeal orders and original SAT material; capture operative airport tariff orders and any later BPSL rulings. Preserve reversals as dated history. Do not overwrite a current correction with an older adverse report.
3. **Expand by identifiable units.** Banking, tax incentives, ports, railways, land, mining, schools, colleges, charities, CSR, FCRA, food, fertiliser, disaster relief, telecom, advertising, courts and administration remain explicitly queued. Start with contract, grant, institution or instrument identifiers before linking people or companies. Existing graphs are discovery inventories, not automatic proof of every new join.
4. **Evaluate prospective questions separately.** Freeze an observable outcome such as an issue settlement, redemption notice, recovery order or tariff adjustment before its resolution. Missing records remain unknown. Retrieval scores and an AI panel’s agreement are not probabilities.

## Panel challenge and validation

Round one selected documentary bridges and adverse/ordinary explanations. Round two’s police/border reviewer inspected the BPSL, NDTV and defence-skilling primary passages. Corrections made: an unknown exact day became null; the BPSL question was narrowed to approved allocation terms; “prospective” NDTV open-offer wording was clarified as 2022 rather than retrospective 2009 pricing; official metadata was added for the CAG tabling date; dense prose was rewritten with ordinary spacing. See `docs/funding-investigations/reviews/police-reviews-cross-sector.md`.

This author reviewed PM CARES/CSR, ventilator attribution and all 23 hospital rows in the welfare stream. The 139-card, ₹2,525,325 cohort reconciles, while the different observation dates prevent a simple fictitious-patient inference. See `docs/funding-investigations/reviews/cross-sector-reviews-welfare.md`.

`scripts/funding-investigations/validate.py` passes this stream. Its intentional warning identifies the secondary-only DIAL subscription report. Numerical debt stocks and rated face amounts are retained in prose, with `amount: null` on non-payment edges. Exact labelled groups and unresolved legal identities have `resolved: false`. Hashes and acquisition limitations are recorded in `raw/cross-sector/capture-manifest.json`; structural validation is not an independent fact check.

No model was retrained or promoted in this workstream. The previous adapter’s failed promotion result remains unchanged.
