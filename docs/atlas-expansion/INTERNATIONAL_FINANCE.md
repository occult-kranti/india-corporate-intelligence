# International finance expansion

Research window: **6 October 2011–6 October 2026**. Retrieved 7 October 2026. This is a bounded set of verified routes, not a census of countries, companies, lenders or loans. The slice contains three new investigation cases, three response records and four financing/status records. It supplements retained World Bank research rather than counting the same loan twice.

Raw data: [international-finance.json](../../research/raw/atlas-expansion/international-finance.json). Namespace: `atlas-international-finance`. Integration belongs to the network agent; no UI or package changes were made by this researcher.

## What the routes establish

| Record | Verified chain | Financial boundary |
| --- | --- | --- |
| `tn-urban-sovereign-contract` | IBRD loan 8488-IN → India → Tamil Nadu → TNUDF, with TNUIFSL as a separate implementing company; WRD is the purchaser for a selected flood-monitoring contract | US$400m signed loan commitment; US$352,729,993 programme-wide actual disbursement. One INR763,891,408 contract jointly names Azista Industries Private Limited and SSTECH Salem Commercials Pvt. Ltd. No per-firm split or contractor receipt is verified. |
| `ifc-mahindra-cash` | IFC → Mahindra Last Mile Mobility Limited → compulsory convertible preference shares; parent remains a separate party | Up to ₹600 crore commitment; issuer confirms ₹300 crore first cash tranche and 30,00,000 CCPS allotted on 9 October 2023. The 5.9% voting-instruction right is not ordinary-share ownership. |
| `bangladesh-adb-lt` | ADB loan 3853-BAN → Bangladesh sovereign → required relending to PGCB → package 3 → Larsen & Toubro Limited, India | Signed principal EUR271,838,000; published contract value US$60,232,129.73. US$136.54m is cumulative loan disbursement at 3 August 2026, not L&T’s receipts. AIIB US$200m is a separate cofinancing commitment. |
| `ifc-bajaj-private-debt` | IFC → Bajaj Finance Limited → intended eligible retail/microfinance lending | Up to US$400m senior secured private debt. IFC reports an investment event on 9 September 2024, but no exact drawdown ledger or ultimate customer list is supplied. US$600m mobilisation is other lenders’ intended funding. |
| `ida-budget-support` | IDA credits 68130/68120 → India’s RBI account → Consolidated Fund; DEA implements the programme | SDR77m concessional plus US$291.4m non-concessional principal. The ICR records US$402,601,860 disbursed equivalent; its footnote explains the difference from US$400m approval by SDR/USD movement. General budget support does not identify a contractor recipient. |
| `imf-sdr-allocation` and `imf-india-no-programme-credit` | IMF allocation/financial accounts → India; RBI reports reserve holdings | RBI reports SDR12.57bn allocation on 23 August 2021. IMF says no outstanding purchases or loans at 30 September 2026. Quota, reserve tranche, allocation, holdings and projected charges are separate accounts. No grant or obligation-free claim is made. |

## Primary evidence and controls

The source-retrieval, evidence-tiering and follow-the-money skills guided retrieval and review. The retained World Bank and IMF fleet was inspected before new research. Its source gaps and aggregation shortcuts were treated as leads, not inherited facts. Original source bytes are separately identified from search discovery, indexed retrieval and extracted text.

For Tamil Nadu, the signed loan, project agreement and amendment establish exact legal roles. World Bank notice `OP00187128` names the WRD Superintending Engineer as purchaser. Notice `OP00218737` records the two awarded firms, one signed contract price and competing evaluated bids. Its 13 March 2023 date is the notification date; no same-day contract signature is invented. Programme-level procurement concerns and an unresolved incident-compensation proceeding are not assigned to those firms. The ICR’s overall Satisfactory outcome and more qualified procurement/financial-management ratings are both retained.

For Mahindra, the exchange filing is the primary receipt/allotment disclosure. IFC’s 3 October 2023 investment event and the issuer’s 9 October allotment remain separate milestones. No later tranche, conversion or current ownership percentage is inferred. The parties’ commercial rationale and IFC’s environmental/social diligence requirements are retained without converting expected benefits into results or risk categories into violations.

For Bangladesh, the original signed loan explicitly identifies Bangladesh as borrower and requires a subsidiary financing agreement with PGCB. ADB’s full official-origin project page was opened through indexed retrieval after live HTML returned 403. The original loan and borrower monitoring PDFs downloaded successfully. The contract table says 10 May 2021; the borrower report says signed 9 May. Both dates remain visible. The borrower reports roughly 85% package-3 progress by June 2025 and corrective environmental-reporting work. Package-8 termination belongs to a different contractor. A programme report showing no grievance referrals to court is not a comprehensive no-litigation finding.

The official IMF financial-position HTML closes the retained corpus’s earlier primary-source gap. “None” applies to outstanding purchases and loans as of 30 September 2026. It does not erase SDR-related obligations or establish an absence of IMF policy influence. Table observation dates are not falsely presented as publication dates.

The IDA ICR cover transposes some first-operation instrument labels. The slice uses its correctly identified second-operation financing tables and corroborating original programme document. The programme document expressly states that proceeds become general budget resources and do not finance specifically agreed activities.

## Reproducibility and limitations

[Evidence directory](../../research/raw/atlas-expansion/international-finance-evidence/) contains original PDFs/HTML/JSON, retrieval receipts, page-marked full text, targeted excerpts, discovery-only search receipts and `sha256-manifest.json`. Originals exceeding 3MB are in `/workspace/research-cache/atlas-international-finance`; their exact paths, sizes and SHA-256 digests remain in tracked receipts and the manifest. ADB’s indexed page has a separate receipt and is never labelled original live HTML. Failure bodies, including the initial IMF 404 and ADB 403s, remain archived.

`retrieve.py` reproduces public unauthenticated retrieval. `build_slice.py` reproduces the manually reviewed raw slice. No model output is an evidentiary source. Scanned audits obtained for follow-up are not used to assert unread amounts; unnecessary full-document OCR was stopped to protect the shared workspace’s capacity. No confidential access, whistleblower contact or respondent outreach was attempted.

Reviewed identity bridges are limited to exact existing institutions/entities: IBRD, IDA, IMF, ADB, Larsen & Toubro Limited and RBI. The corporate bridge is to L&T Limited, not a consortium or subsidiary. Foreign geography is explicitly `country-context` for Bangladesh; the Indian contractor’s identity is not rendered as Indian-state project spending. No coordinates were inferred.

Independent review by the oversight agent challenged borrower identity, purchaser identity, joint-award accounting, IFC instrument classification, voting rights, currency, dates and IMF account distinctions. Corrections were incorporated. Internal source/entity/relationship/response closure passed; network integration validates the strict schema and reviewed identity bridges.

Open audit tests are concrete: reconcile withdrawal applications and subsidiary-loan ledgers with contractor invoices/payment certificates; distinguish executed commitments from cash; inspect later allotment/conversion records; obtain accepted monitoring and completion certificates; and check any specific subsequent court order. These are public-interest verification controls, not instructions to evade reporting or move funds covertly.
