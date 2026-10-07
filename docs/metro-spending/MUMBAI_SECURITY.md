# Mumbai and Maharashtra police: scoped evidence expansion

Reviewed on 7 October 2026. No skills used. The city commissionerate is the starting point, with state and national context explicitly separated. This is a curated expansion, not all police procurement or a corruption census.

## Retained material

`research/raw/metro-spending/mumbai-security.json` contains 8 sources, 26 entities, 29 relationships, 19 records and one city locality. There are two investigation case files, two historical audit findings, two analytic review questions, two procedural outcomes, four responses and seven ordinary budget/procurement/funding records. Only two relationships are alleged: payroll ID fabrication and a reported bank payment route. Ordinary procurement, judicial oversight and neutral bank roles must not acquire allegation styling automatically.

- **Mumbai citywide CCTV:** Original Home Department GR of 15 April 2026, accepted negotiated GVPR Engineers Limited appointment price ₹2,098.92 crore including GST. The separate ₹2,140.90 crore administrative ceiling includes contingency; it is not an additional payment. Four bids and two technically qualified bidders are recorded. The award is QCBS H1, not necessarily price L1. The government records four extensions of L&T's Phase I maintenance contract for continuity/coordination. A review question asks for contract, invoice and asset-schedule reconciliation across phases; no duplicate billing or corruption is claimed.
- **Mumbai police housing:** Original GR of 30 January 2026 estimates ₹20,000 crore and 40,000–45,000 service homes. The framework proposes ₹6,000 crore state participation and ₹14,000 crore government-backed institutional borrowing through MSIDC, with a ₹100 crore seed provision. Separate release orders and signed loans were not obtained. Land monetisation is an expressly planned repayment mechanism, not an identified private sale or corrupt beneficiary. This MSIDC programme is distinct from the older MSPHWC programme.
- **Police-station CCTV legal trail:** Bombay HC WP 692/2022 accepted State and Javi Systems India Private Limited / Sujata Computers Private Limited representatives' undertakings on 21 March 2022. The later Kokane WP 1196/2026, CNR HCBM010109552026, order of 15 July 2026 calls for statewide DGP fact-finding following the Ghatkopar footage-preservation dispute. These are separate proceedings linked by express citation and institutional obligation. The court did not attribute Ghatkopar's work to either vendor or find corruption. The 10 August 2026 follow-up report was not found. The system is kept separate from citywide L&T/GVPR CCTV.
- **Mumbai payroll allegations:** TOI on 12 August 2026 and Mid-Day on 13 August report former DDO Ramkishan Ganesh Goswami's arrest in a ₹6.41 crore inquiry concerning alleged fabricated service IDs and 2019–20 payments. TOI reports an Axis Bank payment channel and a 163-account cohort. No bank complicity, verified beneficiary identities, personal receipt of the whole amount, continuing custody or final guilt is asserted. FIR, bank ledger, defence response and later court disposition remain missing.
- **Historical Maharashtra MPF:** CAG Report 4/2017, covering 2011–16, recorded combined releases ₹491.96 crore and expenditure ₹187.07 crore through September 2016. The buildings component records ₹289.46 crore released, ₹83.70 crore spent and nine of 117 planned mixed residential/administrative buildings completed. These amounts are statewide, nested and non-additive. Government explanations about approval timing and technical staff appear alongside the observations. Only indexed official-report text was accessible; original PDF downloads repeatedly failed with upstream 503s. Tier remains `reported`, and current persistence is not claimed.
- **Coastal procurement context:** Original PIB parliamentary answer of 23 February 2011 distinguishes state scheme context from national direct boat procurement. Prose-explicit approximate payments of ₹173 crore to Goa Shipyard and ₹91 crore to GRSE remain nationally scoped. No city share is calculated, and no fleet readiness or current operational weakness is mapped.

## Source preservation and review

The evidence directory contains directly retrieved original Marathi GRs, text extraction, visually checked numeric pages, the official police-hosted copy of the housing GR, original PIB HTML, access receipts and a SHA-256 manifest. `indexed-and-reported-extracts.json` contains researcher paraphrases and short excerpts for blocked/indexed court/audit material and commercial news; it is explicitly not an original-document capture. No commercial article body is redistributed.

An automated OrgPedia English rendering was inspected as a discovery aid. It contains obvious date and amount corruption, including the Phase I revised-cost paragraph; it is **not** an authority for any structured claim. The original Marathi GR controls. The housing and CCTV amounts were visually checked against PDF pages 4 and 3 respectively.

Court mirror text was cross-read with the six-page PDF indexed on Legal Republic. Direct downloads from Indian Kanoon and Legal Republic returned 403, recorded in receipts. The 2026 order inconsistently recites affidavit/communication dates; those have not been silently repaired. The stable court order dates, CNR and directions are used.

## Searches and rejected or held leads

Searches covered CAG Maharashtra modernisation/coastal/security reports and PAC indices; Mumbai CCTV award/contract challenges; police housing financing; court follow-up for Somnath Laxman Giri and Kokane; and payroll arrest, bail, acquittal and response searches. Search cut-off is 7 October 2026. Lack of a search result does not prove no later order exists.

1. Old bulletproof-jacket narratives were excluded: 2001–05 NTB jackets, 2009–10 Techno Trade bomb suits, and the 2017 MKU procurement are different cohorts and cannot be merged into one vendor/amount or causally attached to a named death.
2. CAG 2015 coastal implementation audit was discovered but full originals and sufficient financial/context responses were not successfully retrieved. No adverse finding from it was promoted.
3. The 2015 citywide CCTV award challenge and ₹36 crore trench penalty coverage lacked an authenticated current disposition in this pass; no legal guilt or irregularity edge was promoted.
4. The 2026 payroll report inconsistently counts other named employees. Those private/uncertain identities and purported beneficiary names are omitted. Only the former public DDO consistently identified in both reports is retained.
5. Tender aggregators label the 2026 city CCTV award as L1 and some show a zero amount. The primary GR explicitly uses QCBS H1 and ₹2,098.92 crore; aggregator fields do not override it.
6. A headline ₹2,140 crore project figure is rounded administrative approval, not the exact accepted bid or cash paid.
7. The recent Home Department CAG Report 1/2025 mainly concerns excise; it was not misclassified as police funding merely because the parent department matches.
8. No named lender, land buyer, developer, transaction adviser or contract beneficiary was invented for the housing framework.
9. Existing force records already hold Maharashtra budget/custodial aggregates. They were not duplicated as new cases. Existing claims that city budgets are categorically unpublished should be read as old corpus gaps: the GRs here provide explicit city-specific capital approvals.

## Identity joins for integration

The `mumbai-police` node has an identity-only `canonicalId` to `legacy:entity:force:mumbai-police` (Mumbai Police Commissionerate). The original city CCTV GR explicitly names Commissioner of Police, Mumbai and the original housing GR identifies Mumbai Police. This bridge must not import allegation status into the entire force. It must not join Mumbai Police to `legacy:entity:force:mh-police` (the statewide force).

Other potential joins (Union MHA, Maharashtra Police, L&T, Goa Shipyard, GRSE) remain local for root review; exact canonical IDs must be checked before adding bridges. MSIDC and MSPHWC are separate legal institutions. No link to any similarly named “Force One” commercial catering company is supported.

## Verification

The standalone `validateMetroSlice` check passed after closure validation. All alleged edges link an explicit response/gap record. Money has currency, unit, period and accounting stage. National nodes/edges contain no Maharashtra/Mumbai tags. City records name local locality `mumbai`; historical statewide CAG observations do not. The source manifest validates retained bytes, not unavailable originals.

Point-dated GR approvals and court directions now carry explicit `fromDate`/`toDate` values with a date basis separating the instrument date from paid work, loan drawdown or conduct. Historic MPF financial records carry the stated fiscal/reporting interval. Broad alleged payroll transactions remain undated in exact-day fields because no bank ledger was obtained.
