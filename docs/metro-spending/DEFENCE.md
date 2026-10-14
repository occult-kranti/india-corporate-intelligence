# Border and defence spending: Delhi / Mumbai starting points

Reviewed 7 October 2026. No skills were used. This is a source-backed extension of the existing force and defence-trade registries, not an inventory of every public contract or an allegation-generation exercise.

The slice is `research/raw/metro-spending/defence.json`, namespace `metro-defence`, route `/allegations`. It contains **35 entities, 37 relationships, 13 records and 9 primary sources**: nine audit-finding records, one court investigation case, one later court outcome, and two ordinary procurement records. Counts overlap; they are not amounts of proven corruption or independent criminal cases.

## Newly examined trails

| Trail | Financial or legal distinction | Response / counterevidence retained |
| --- | --- | --- |
| Mumbai MDL → CAG disclosure → Department of Defence Production | ₹20.81 crore production-value reversal is an accounting correction, not a cash loss. Project is anonymised. | MDL's 0.22% materiality argument; government responsibility for board appointments; no named-contract join. |
| Delhi Navy payroll → source-defined recipient cohort → recovery authority | ₹10.24 lakh identified as incorrectly paid and recoverable, not verified recovered. | Navy approved recovery and considered it adequate administrative action; no disciplinary action then contemplated. No individual recipient identities published. |
| Mumbai naval procurement → Dharti → repeat dredging | ₹80.24 crore commitment and ₹33.91 crore payment are overlapping stages. Historical 2010 work, 2011 repetition, 2013 responses, 2014 audit. | Public buyer's procedural-delay and necessity explanation; CAG's disagreement; no vendor corruption conclusion. |
| BRO → first bidders → separate retender awardees | ₹6.47 crore audit differential; rejected bid values are not payments. | IFA/DGBR explanations; no inference of common ownership or bidder collusion. |
| Bihar DPR procurement → ICEAP quote → five-consultant award cohort | Audit describes apparent rate manipulation; ₹97.92 lakh computed excess and ₹4.80 crore aggregate paid are different quantities. | State's RFP and rate-negotiation defence; no per-consultant allocation or legal-name expansion. Initial December 2010 tender is explicitly an older precursor. |
| MHA border-road programme → Bihar / UP advance cohorts | Disbursed principal, outstanding principal and accrued interest remain separate, with different 2019/2020 cut-offs. | Bihar tribunal-recovery explanation and UP contractual defence; no current balance inferred. |
| ITBP → NPCCL → anonymised pilot building | ₹17.21 crore sanction, ₹15.94 crore downstream contract and ₹14.57 crore release are not added. | No-extra-cost rectification requirement; latest retained work status is May 2025. No site or anonymous contractor reconstructed. |
| ITBP → EPIL → D Thakkar Construction → staff housing | ₹8.37 crore award, ₹6.93 crore construction expenditure, ₹1.16 crore avoidable HRA are distinct. | March 2025 response says June 2024 takeover and allotment underway. Do not say housing remains wholly unused. Audit faults public planning, not necessarily the named contractor. |
| MHA → SSB → land-acquisition officer | ₹80.91 lakh original deposit, ₹16.18 lakh later deposit and ₹4.10 lakh lapsed-process expense retain their stages. | Government explains delayed external information and renewed acquisition; latest retained reply is February 2024. Delhi headquarters is not the Uttarakhand land location. |
| BSF electrical procurement → named receipts → GSFC → Delhi HC → Supreme Court | Charges 2 and 3 upheld; **charge 1 acquitted**. ₹10,000 and ₹2,000 are court-reviewed receipts, distinct from the ₹10,000 sentence fine. | Jurisdiction, privacy, electronic-evidence and sweets-payment defences retained. Supreme Court SLP(Crl)15322/2025, diary52884/2025, dismissed 7 October 2025; two weeks to surrender. No current custody inferred. |
| MHA notice → BSF beneficiary / Cochin Shipyard order | ₹8 crore EMD is a bank guarantee; ₹270 crore is an accepted order value. | Ordinary procurement context. The notice and award share buyer, quantity and purpose, but exact award-reference reconciliation and actual payment ledger remain open. |

## Provenance and dates

Five original PDFs were obtained: MDL AGM filing, BSF Delhi High Court judgment, Supreme Court order, MHA procurement notice, and Cochin Shipyard award filing. Original bytes, extracted text, retrieval receipts and SHA-256 digests are retained in `research/raw/metro-spending/defence-evidence/`.

Four CAG reports were read at their original government URLs through full-text retrieval. Direct original-file downloads returned HTTP 503, including both download-path variants and the alternate CAG host. Their retained financial-section extracts and hashes are explicitly labelled **extractions**, with no invented original-PDF hash. Catalogue pages independently establish tabling dates: Report 4/2014 on 8 July 2014; Report 15/2017 on 21 July 2017; Report 23/2021 on 6 April 2022; Report 22/2025 on 18 December 2025. A report year is not automatically its publication date.

Notice, acceptance disclosure and court-order records have their actual point dates. Broad historical audit narratives keep null start/end dates and a stated conduct period. Source publication/status dates do not silently become offence or payment dates.

## Two review rounds

First, the research pass separated each financial stage, read the adjacent department replies, and checked the existing corpus. C295, BrahMos, MQ-9B, Rafale, Tatra, Adarsh, Union defence/CAPF budget series and previously retained MDL awards were not repackaged as new cases. The 2025 ITBP housing response materially changes the older non-use narrative. The MDL correction does not identify a named ship or supplier.

Second, independent `metro_challenge` review found and obtained the later Supreme Court order, checked the split BSF result, audited geography and amounts, and challenged prose/date handling. The main BSF record is a real investigation case with a linked later outcome; normal vessel procurement remains outside allegations. No adverse relationship to the acquitted Sujatha charge is drawn. Exact public-institution bridges to retained MoD, MHA and MDL identities are explicitly justified; no personal or corporate name-only merge is enabled.

The JSON passes `validateDeepSlice` and `validateMetroSlice`; every local entity, source, response, record and locality reference closes. The evidence manifest passes `validateManifestRows` with byte counts and SHA-256 checks.

## Remaining document requests and rejected joins

- Obtain final recovery ledgers / ATNs for Delhi Dip Money, Mumbai dredging, BRO retenders and border-road advances; historical CAG findings are not current unpaid-loss balances.
- Obtain the latest NPCCL pilot handover certificate and Jabalpur occupancy ledger before changing May/March 2025 status.
- Obtain original DPR bid versions, correction authority, five-consultant contracts and payment vouchers before assigning aggregate payments to individuals or expanding consultant acronyms.
- Reconcile the BSF vessel tender against its exact acceptance instrument and invoices; ordinary eligibility restrictions or high award values are not corruption evidence.
- Media leads concerning ITBP rations and Mizoram BSF land were not promoted: this pass did not retrieve an adequate original FIR/inquiry plus current outcome and exact recipient identity. They supply no allegation edges.
- No links to politicians, relatives, donors or beneficial owners were inferred from ministry supervision, geography, bidder appearance, a public-company name, or shared court representation.

The retained map geography is city/state or national. Delhi can mean a public procuring office, a company association, or a court venue; these are explicitly distinguished from where the underlying money was spent. Mumbai MDL headquarters does not locate every national defence contract in Mumbai.
