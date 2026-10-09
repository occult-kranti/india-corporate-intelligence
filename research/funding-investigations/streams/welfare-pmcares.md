# Welfare and PM CARES: investigation log

Review date: **8 October 2026, America/New_York**. Intended historical window: 8 October 2011–8 October 2026 (15 years). The selected records actually inspected primarily concern 2018–2026; earlier years and other programmes remain coverage gaps. Retrieval receipts preserve their actual UTC timestamps, including captures after midnight UTC, rather than backdating them to a document date.

The paired JSON contains **five bounded dossiers, 13 inspected document families, 51 entities and 49 typed relationships**. Eleven source families are official documents, court copies, original-document indexed text or a company’s own disclosure; two are attributed news accounts. **93 search-result slots** were requested across 17 Exa searches. That number is discovery effort, not a claim that 93 distinct documents were read. Current source files and hashes are independently checked by `raw/welfare-pmcares/validation.json`.

## What is new or materially deeper

| Dossier | Supported trail | Necessary stop |
| --- | --- | --- |
| PM CARES agency returns | Fresh official FY2024–25 PDF and account index; ₹324.66 crore returned by unidentified implementing agencies, ₹87.85 lakh total cash payments, ₹8,452.07 crore closing bank stock. Separately inspected FY2022–23 ventilator-programme refund and BEL’s own CSR disclosure. | Note 11, accompanying notes and the audit report are not in the one-page PDF. The agency/project behind each FY2024–25 return cannot be named. A refund is not proof of faulty goods, evasion or diversion. |
| Aurangabad Dhaman-III ventilators | Central allocation → Jyoti CNC goods → government hospital → stated relocations; Ministry technical response, 2 June court order and later repair reporting. | The Ministry expressly says the supplier/batch was not PM CARES-funded. That proposed funding join is rejected. No actual cash amount, final warranty settlement or final court outcome was obtained. |
| Bihar PM-JAY implementation agencies | NHA procurement advice → BSSS → both clusters awarded to Family Health Plan Insurance TPA; ₹1.19 crore paid, of which CAG estimates ₹8.80 lakh avoidable. Earlier Medsave scope and separate Vidal deployment contract are identified. | Preserve Bihar’s rule/staffing rebuttal. No bribery, ownership overlap, political influence or net bank receipt is established. The avoidable estimate is inside the payment, never an additional cash flow. |
| Bihar unmatched beneficiary cards | All 23 named Appendix 1.8 hospital rows reconcile to **139 card records and ₹25,25,325**. This gives a finite, document-supported network to investigate. | Payments through March 2024 were compared with August/November 2024 datasets. Migration, deletion, replacement or erroneous extraction may explain some mismatches. An unmatched card is not necessarily a fictitious patient. |
| PM-KISAN controls and exclusion | Government-reported ₹416.75 crore recovered by December 2025; March 2026 verification-exclusion categories; July 2026 grievance and official-access control updates. | No complete recoverable denominator or claimant-level restoration outcome. Pending verification is not a fraud label. Overlapping categories and portal complaints are not summed. |

## Methods and panel round one

Applied the Exa Search skill and its searching/source-quality references, plus the repository’s behavioral methods, graph audit, panel and executed model-card limitations. The previous fine-tuning candidate failed promotion. Its similarity scores were not used to admit relationships, assign intent or invent transfers. No model or frozen experiment files were edited.

The forensic-accounting perspective separated commitment, gross accounting payment, net recipient receipt, return, recovery, stock balance and rejected claim. The public-health perspective asked whether payment controls also deny valid treatment. The procurement perspective tested operative contract scope against model instructions and identified the actual counterparty. The legal perspective preserved interim order versus final ruling. The skeptical reviewer demanded a normal-process explanation, an identity/data explanation and a concrete falsifier for each adverse inference.

Each dossier includes a qualitative `decisionAnalysis`: actual decision period, institutional authority, possible ordinary incentives, observable alternatives, later outcome and hindsight limits. These are research hypotheses about institutional choices, not evidence of an actor’s private motives. Later audit text and current graph structure are never described as information available before the decision.

## Important counterevidence and rejected joins

1. **No PM CARES → Jyoti CNC Aurangabad refund edge.** The 14 May 2021 original Ministry release expressly denies the funding attribution; the later hearing account repeats that clarification. Defect evidence and funding identity are separate issues.
2. **Fresh original beats stale search extraction.** The current official FAQ names KKC & Associates LLP. Exa’s indexed FAQ still named SARC; that stale text was rejected for current-auditor identity.
3. **Hospital mismatch does not establish fabricated patients.** CAG’s TMS/BIS/portal snapshots have different dates. Retrieve the valid-at-treatment card lifecycle before assigning a loss or false-claim finding.
4. **Deaths and preauthorisation can be out of administrative order.** Bihar’s reply says emergency treatment preceded the paperwork; actual mortality/clinical records are the discriminating evidence.
5. **Agency service contracts are not the insurance pool.** Bihar operates the assurance/trust model. The three named administrators do not thereby receive all hospital reimbursement funds.
6. **CSR donation is not contract consideration.** BEL reports a donation; no quid-pro-quo evidence was inspected.
7. **Oral privacy remarks are not a final RTI ruling.** The latest inspected PM CARES legal item is a January 2026 hearing report. Searches did not establish a later final disposition; that gap is explicit.

## Sources and access limits

Five originals were downloaded successfully: PM CARES index, FAQ and two statements, plus the mirrored 2 June 2021 court-order PDF. The FY2024–25 statement was visually inspected and confirmed to be one page; FY2022–23 refund rows were visually inspected on page 1. CAG’s Bihar PDF returned HTTP 503 and two Parliament PDF downloads returned HTTP 502. Their indexed original-document text was retained and specific passages inspected, with hashes of the retained text rather than an invented original-PDF hash. Source metadata distinguishes selected pages, web text and secondary reporting.

The Bihar report’s title says 2025. A secondary report places tabling on 26 February 2026; this has not been independently checked in the official catalogue, so `publishedAt` remains null. The draft uses exact section locators. The original PDF availability and formatted tables should be checked before escalating any named hospital allegation. Public institution names are retained; private patient identifiers and account numbers are not put into graph records.

## Roadmaps

**Now:** publish the finite evidence graph, response text, rejected joins and accounting-stage distinctions; enforce source closure and reconcile all 23 hospital rows.

**Next — cash:** obtain PM CARES note 11 and agency-wise original-release/use/return records; match the Aurangabad purchase sanction and payment head; reconstruct BSSS invoices, withholding and penalty entries.

**Next — outcomes:** obtain the NHA response for the 139-card cohort, final disabled-card investigations, serial-level ventilator acceptance/warranty records, final court orders and deidentified PM-KISAN reinstatement/arrears outcomes.

**Later — coverage:** extend the existing NSAP, nutrition and DBT audit work with action-taken notes, not duplicate allegations. Build a state/programme/year coverage matrix spanning the stated 15 years and disclose unexamined cells. Only after collecting authentic time-valid cohorts should future recovery/disclosure/control targets be frozen for prospective evaluation; unresolved outcomes remain null.

## Validation and challenge status

Local validation passed ID/source/edge closure, case edge endpoints, all 13 capture hashes and the complete 23-row arithmetic. This verifies artifact consistency, not the truth of underlying hospital payments or agency replies. Cross-track Round 2 review checked the PM CARES cash figures, ventilator funding correction and court scope, all 23 hospital rows, separate disabled-card denominators and the ISA calculation. The review found no substantive blocker; seven spacing defects were corrected. Its file-bound receipt is retained in `docs/funding-investigations/reviews/cross-sector-reviews-welfare.md`.


For graph integration, 48 exact source-scoped institutions, programmes and named facilities are explicitly marked resolved. This only resolves their identity within the retained record; it does not resolve beneficial owners, prove an allegation or merge namespaces. The unnamed implementing agencies, scheduled-bank aggregate and State/UT authority aggregate remain unresolved. Source text, edge direction, amount stages and claims were unchanged by this annotation.
