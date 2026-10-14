# Exact IRCTC source checks

Checked 6 October 2026. These are access results for two **dataset-derived discovery leads**, not verified irregularities. The source hashes, exact-key selection and raw listing fields are retained by the procurement engineer in `research/raw/tender-portal-audit/field-semantics-leads.json`.

| Exact source identity | Dataset-only screening observations | Original document access |
|---|---|---|
| `2025_IRCTC_817462_1`; `2025/IRCTC/TSV/06/OCTOBER/76` | Listed publication 31 October 2025 13:00; listed close 3 November 12:00; 71 hours; reported bids `1`; raw award value `117999`; Limited, temporary onboard catering | [Exact ePublish URL](https://eprocure.gov.in/epublish/app?page=FrontEndTenderDetailsExternal&service=page&tnid=1122373): direct GET redirected to `NoAuthorizationPage`, HTTP 200. |
| `2025_IRCTC_819046_1`; `2025/IRCTC/TSV/06/NOVEMBER/26` | Listed publication 15 November 2025 13:00; listed close 18 November 12:00; 71 hours; reported bids `1`; raw award value `109859`; Limited, temporary onboard catering | [Exact ePublish URL](https://eprocure.gov.in/epublish/app?page=FrontEndTenderDetailsExternal&service=page&tnid=1123989): direct GET redirected to `NoAuthorizationPage`, HTTP 200. |

Both direct responses are 2,912 bytes with SHA-256 `1f549d09364564210967ff9bda7baf603d29f60735d8d964aaa3bece8c86ba7b`. Their displayed message is “You are attempting to access an unauthorized area.” The returned bodies and per-request receipts are retained here. Incidental redirect session identifiers are omitted from the receipt URLs. No login, captcha interaction or access-token rewriting was attempted.

Exa extraction of these exact URLs returned only “eTender System”; [exa.json](exa.json) records that limited result. Exact-reference searches returned other tenders and broad IRCTC pages, which were not substituted for the requested records. No publication date, closing date, bidder count, price, amendment or payment direction was independently verified from the original documents in this check.

The 72-hour boundary is an analyst-defined discovery screen, **not a legal deadline**. Both observed windows are 71 hours; any eventual analysis should report sensitivity to alternate cutoffs and distinguish calendar from working days. “Limited” describes the recorded procedure and is not inherently unlawful. A temporary catering licence can involve consideration paid **to** IRCTC; the two raw values cannot be labelled government spending or cash paid without the applicable contract, licence-fee schedule and actual payment evidence. The recipient, train/lot scope, invited-bidder population, source date fields and any amendments remain verification targets.
