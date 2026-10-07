# Services and welfare money trails

As of **6 October 2026, America/New_York**. Retrieval on 7 October UTC falls within that New York date. The slice is `research/raw/deep-investigation/services.json`, imported as `deep-services`: four investigation cases, 23 entities, 22 relationships, 12 sources and three localities. It extends the existing education, NGO and welfare research without counting a repeated finding as another loss.

## Case inventory and strongest evidence

| Raw case ID | Trace established | Accounting/legal boundary |
| --- | --- | --- |
| `khyati-pmjay-claims` | PM-JAY in Gujarat → Khyati Hospital → named holding company Ahmedabad Bariatrics and Cosmetics Pvt Ltd → clinical prosecution and later bail/discharge steps | ₹16.64 crore is earnings reported in a sessions-court account covering 3,578 claims, not independently reconciled receipts or proved fraud. ₹8 crore alleged bank-loan use is not additional loss. |
| `byju-credit-bcci` | Lenders’ facility administered by GLAS → BYJU’S Alpha borrower → Think & Learn guarantee → separate BCCI operational debt → ₹158 crore protected by escrow order | GLAS is the agent, not the sole source of the $1.2 billion facility. Dollar loan and rupee sponsorship settlement are distinct obligations. Indian procedural judgments do not establish guilt or the merits of US transfer litigation. |
| `akshaya-meals-related-parties` | State support → The Akshaya Patra Foundation → named Chikkajala kitchen; Thakkar Family Foundation patronage; audited related-party rent/other-expense payment to ISKCON Bangalore | ₹42,093.64 lakh support income differs from ₹36,788.98 lakh support receipts. ₹1,351.66 lakh kitchen capital expenditure is not the donor’s donation. ₹275.76 lakh related-party payment is disclosed; no restricted grant is traced into it and no misconduct finding is asserted. |
| `nsap-davp-earmarking` | Ministry authorisations → DAVP work orders → ₹2.83 crore charged to NSAP IEC → missing work-confirmation and displaced awareness purpose | ₹39.15 lakh and ₹2.44 crore sanctions overlap the rounded expenditure amount. CAG identifies an expenditure-head and verification failure, not personal enrichment. This re-examines existing `welfare-research:nsap-publicity`. |

The scheme/organisation/case records are navigable evidence joins. No link was created from a minister attending an inauguration, a shared surname or an unverified corporate brand. The only canonical bridges are the exact Akshaya Patra legal trust and Union Ministry of Rural Development. The Bangalore ISKCON counterparty is scoped to the trust’s audited note; it is not treated as all organisations using that name.

## Later outcomes and counter-evidence

**Khyati.** Gujarat High Court R/CR.MA/6649/2025, 8 May 2025, §§3–3.4 preserves the doctor’s case that clinical indications, authorisation and procedural risks explained treatment. §§4–13 preserves the prosecutors’ contrary case, expert review and the court’s prima facie reasoning. The subsequent Supreme Court order, SLP(Crl) Diary 70302/2025, **11 December 2025**, §§3–7 grants the chairman bail after noting bail for all co-accused. The case must not present the May/June custody position as current. A 9 May 2026 Times of India report records renewed discharge refusals following a High Court rehearing direction. Neither bail nor refusal of discharge is a verdict on guilt. No final conviction, acquittal, hospital-specific recovery or lender ledger was retrieved. Patient-level names and residential addresses are not structured entities.

**Byju’s.** [2024 INSC 811](https://api.sci.gov.in/supremecourt/2024/35406/35406_2024_1_1502_56620_Judgement_23-Oct-2024.pdf), §§6–10 establishes the finance/guarantee and operational-debt background. §§16–21 includes Riju Ravindran’s personal-funds undertaking and GLAS’s objections. **§§86–87 expressly decline a merits finding on stakeholder conduct; §88 orders escrow protection.** The 17 August 2026 NCLAT order, CA(AT)(CH)(Ins)383/2026, §§1–5 dismisses an appeal from a listing order as non-maintainable and leaves underlying disputes open. No US damages/recovery figure, current unicorn valuation or taxpayer subsidy is inferred.

**Akshaya Patra.** The FY2024–25 annual report includes audited financial statements signed **7 October 2025**, as well as programme narrative. Printed pp129–130 contain Walker Chandiok & Co LLP’s unmodified opinion and emphasis on the trust’s adopted accounting basis. Printed p133 verifies state-support income; pp154–156 verifies the receipts-and-payments account and Schedule B reconciliation. Printed pp147–150, note 2.25, identifies common-trustee counterparties and the ₹275.76 lakh rent/other-expense payment to **International Society for Krishna Consciousness, Bangalore**. Those pages were rendered and visually inspected; imperfect OCR is retained only as a finding aid. Printed pp75–76 and81 provide the trustee summary and capital spending. The launch’s 35,000-meal/200-plus-school planned capacity is not substituted for the FY2025 table’s 30,000 children/192 schools or treated as an independently verified nutrition outcome.

**NSAP.** CAG Report 10/2023 **§5.5.1, printed p41** names the sanctions, intended head, DAVP work orders, actual NSAP expenditure and December 2022 response that the Ministry had referred the issue to its IEC division. A later [31st parliamentary action-taken report, 2 April 2026](https://elibrary.sansad.in/server/api/core/bitstreams/f2af3284-ac25-4d40-9671-d10b728827d0/content), was downloaded and searched. It concerns the Committee’s ninth report and does not establish settlement of this specific CAG paragraph. This limited non-observation is not represented as proof that no remediation happened elsewhere.

## Archives and reproducibility

`research/raw/deep-investigation/services-evidence/sha256-manifest.json` maps every source ID to archived bytes, text and/or a receipt, and hashes every retained evidence file. The final delivered raw slice and documentation are outside this evidence-file manifest. `build_slice.py` deterministically regenerates the raw slice from the reviewed assertions. `fetch_sources.py` demonstrates the public retrieval method using inherited proxy and TLS configuration.

Successful originals include the Supreme Court Byju’s PDF, Akshaya Patra report and kitchen statement, PIB reply, parliamentary follow-up PDF and dated news pages. HTTP503 from the original CAG NSAP PDF is recorded; its existing indexed original text was copied with original 6 October retrieval provenance. Direct Indian Kanoon calls returned403; indexed primary court-mirror text is preserved with explicit fallback receipts. The NHA overview also returned403; it was replaced for policy claims by the dated Ministry/PIB parliamentary reply. These failures are not labelled successful original retrievals. The parliamentary landing page’s initially failing web-tool lookup was recovered using its public same-host bitstream URL.

The large downloaded report contains public programme stories, but the structured slice does not create personal profiles of schoolchildren, patients or private representatives. Irrelevant residential-address lines were omitted from the indexed NCLAT mirror extract, and that redaction is declared in the receipt. SHA256 protects local integrity; it does not by itself authenticate the publisher or a disputed claim.

## Independent challenge and corrections

The adversarial reviewer challenged three implementation details, all corrected before data freeze:

1. The GLAS→Alpha relationship is `credit-facility-agent`, explicitly distinguishing the lender cohort from its agent.
2. Generic relationship status says “source-retained” so a reported or self-reported edge is never upgraded by an inconsistent “documented” status.
3. Geography is assigned per entity and per edge. US entities have no Indian headquarters; Riju’s residential geography is not mapped; NCLAT marks the Chennai forum; trust-wide financial flows use national context, while Chikkajala alone has project geography. Neither the Supreme Court nor the ministry is located at the hospital by association.

The raw slice passed local uniqueness, source/entity/relationship/response/locality referential-integrity checks and mandatory case-field checks. All four cases retain a dated status, respondent account, alternatives and a concrete falsifier. No new application tests were written for the research-only slice; the platform owner runs the integrated registry checks.

## Independent procurement cross-review

Reviewed `deep-procurement:record:meil-polavaram-working-capital` against `procurement-evidence/fetch-polavaram-ch3-full.json`, the indexed original CAG chapter, **§§3.2.2.1 and 3.2.3, printed pp57–59 and footnotes 147–148**. This is independent of the procurement author’s summary.

- ₹2,810.88 crore is the E&M contract price; ₹3,965.11 crore is the REC term loan obtained by APGENCO, with the audit stating an 11% rate. Neither is a direct loan from REC to MEIL.
- ₹30.86 crore was paid as steel-material advances in December 2021–October 2022. CAG calculates ₹1.10 crore foregone interest for December 2021–November 2022. The government’s Board-approved price-split defence and CAG’s contrary finished-work requirement are both retained.
- ₹41.26 crore concerns a separate early-equipment procurement observation, with ₹1.90 crore estimated financing interest as of February 2024. These values, the loan, contract and steel advances cannot be summed as losses or payments to one recipient.
- One response nuance was sent to the owner for correction: at the **November 2024 exit conference the government accepted the early-equipment observation**, while explaining design changes and BHEL’s early supply. That differs from its rejection of characterising the steel payments as an interest-free advance.
- The August 2026 parliamentary funding answer separates the state-funded powerhouse from central irrigation/land-acquisition/rehabilitation grants. It does not settle either CAG observation. No unsupported political-bond or private-beneficiary link is introduced.

A readability defect in concatenated procurement prose was also reported; the owner confirmed that its editorial overrides corrected it. The retained stages, audit attribution, alternatives, later-funding boundary and absence of a criminal verdict otherwise passed this cross-examination. Exact loan drawdowns, installation/payment ledgers and a paragraph-specific accepted action-taken closure remain the decisive missing evidence.
