# Bounded original-source review of seven tender leads

Snapshot: **6 October 2026**. This review is frozen at seven cases from the actual researcher-supplied notice/award databases. Five cases received an independent raw-detail and original-URL review here; the graph reviewer checked the two IRCTC single-bid leads in parallel. [Structured results](original-source-review/results.json) preserve those separate denominators.

**Fresh original procurement fields were verified in 0 of 7 cases.** The seven supplied document URLs produced six HTTP-200 unauthorized pages and one HTTP-403 response. Ten additional, unmodified CPPP notice/AOC URLs for the five-case subset returned HTTP 200 with **“Invalid Url.Please Check”**. These are retained access failures, not successful document verification. Indexed retrieval of the seven original document URLs exposed only the generic “eTender System” title. No captcha, login or expired-token workaround was attempted.

## What the retained records actually show

The five raw detail records opened by this reviewer distinguish **ePublished Date**, **Bid Submission End Date**, **Published Date**, and **Contract Date**. In all five, the award-listing value named `closing_date` matches the retained AOC detail's **Published Date**, which also matches the notice publication value. All five retained **Contract Date** values match the listing's AOC date. These observations support a field-mapping concern; they do not independently establish the original portal's semantics, signing date, upload date or evaluation duration.

Across the selected seven lead rows, the disputed award-listing “closing” equals notice publication in 7/7 and differs from notice closing in 7/7. This is a purposive sample. The separately reported **1,709/1,714** result concerns an older, heavily Neyveli 2013–18 listing-only population; its rate must not be generalised to these later reference-fallback leads or the full corpus.

The dates and values below are **retained dataset observations**. Timestamps have no independently established timezone. The amount is a raw field labelled **Contract Value**; its currency, tax basis, cash direction and actual payment remain unverified.

| Tender ID | Buyer / scope | Notice publication → scheduled closing | Listed hours / bids | Listing AOC date | Raw Contract Value |
| --- | --- | --- | --- | --- | --- |
| `2025_IRCTC_817462_1` | IRCTC; three-month TSV catering | 31 Oct 2025 13:00 → 3 Nov 2025 12:00 | 71 / 1 | 10 Nov 2025 | `117999` |
| `2025_IRCTC_819046_1` | IRCTC; three-month TSV catering | 15 Nov 2025 13:00 → 18 Nov 2025 12:00 | 71 / 1 | 21 Nov 2025 | `109859` |
| `2024_JPL_221354_2` | Jhabua Power; high-pressure drain valves | 3 Jan 2025 11:00 → 6 Jan 2025 18:00 | 79 / 3 | 14 Jun 2025 | `626250` |
| `2025_CONCR_806999_1` | CONCOR; KONE RST spares | 28 Jul 2025 17:30 → 1 Aug 2025 13:00 | 91.5 / 1 | 18 Aug 2025 | `1921826` |
| `2024_JPL_199619_1` | Jhabua Power; SS designed shield | 27 Jun 2024 16:15 → 1 Jul 2024 13:00 | 92.75 / 1 | 4 Jul 2024 | `952500` |
| `2024_JPL_193146_1` | Jhabua Power; LT dry-type transformer | 9 Apr 2024 18:00 → 13 Apr 2024 18:00 | 96 / 1 | 15 May 2024 | `5801250` |
| `2025_IRCTC_817795_1` | IRCTC; three-month TSV catering comparison | 4 Nov 2025 11:00 → 6 Nov 2025 12:00 | 49 / 3 | 12 Nov 2025 | `152303` |

The comparison is unflagged **only under the joint under-72-hour plus single-bid screen**. It shares the buyer, broad procedure/category, month and amount order with the November IRCTC lead, but differs in exact train/service scope and date. Three bids in a shorter listed interval do not establish normality, adequate competition, equal opportunity or the legitimacy of another tender.

## Procedure and money boundaries

For `2024_JPL_193146_1`, the derived lead-extract value and its source same-internal-ID notice-detail field both say **Single**; its award detail says **Goods**. The five derived lead-extract procedure values match their source notice-detail fields; this is one lineage, not independent listing/detail corroboration. Goods is a procurement category, not a competition method. Preserve the separately labelled fields and do not compare this record with open-competition tenders on the assumption that Goods describes the invitation method.

The other four independently opened notice details say Limited; the award details say Goods for the equipment cases and Services for the IRCTC case. The actual invitation rules, eligibility restrictions, approval and exceptions could not be checked against an original RFP. A limited or single-source label and a single bid are not findings of illegality.

The IRCTC titles describe temporary catering arrangements. The opened material does not establish whether the selected value is a licence payment to IRCTC, a payment by IRCTC, or another contractual amount. The equipment awards likewise have no matched invoice, payment voucher, acceptance or commissioning record. **Payment and physical completion were established in 0/7 cases; this is an evidence count, not evidence of zero payments or unfinished work.** The five retained completion fields are blank. A blank corrigendum link is not proof that no amendment occurred.

## Other source routes checked

- [Sigma Tenders' CONCOR page](https://sigmatenders.com/tender/rBgREYvgGJx6BUfWi9BMto) matches the exact tender ID and reference and links to the same CPPP document URL. It is secondary, shared-lineage discovery. Its displayed start time is 23:00 versus the retained 17:30 on 28 July, a 5.5-hour difference; no timezone conversion was assumed. It supplies no verified contract price or payment.
- [Jhabua Power's tender page](https://jhabuapower.co.in/tenders.php) was available through indexed retrieval and says NTPC-JPL tenders are published on CPP Portal. Direct access returned HTTP 406. The corporate page's Seoni address does not establish each delivery location; “Jhabua” in the buyer name must not be treated as a district geocode.
- [IRCTC's official award page](https://www.irctc.com/tender-awarded.php), active tender page and [procurement-policy index](https://www.irctc.com/procurement-office-order-policy-notice.php) opened directly. No exact selected reference was identified in the opened content. Older hotel, Rail Neer and static-unit records were not substituted for the selected 2025 TSV tenders. The policy index's stores-contract single-effective-offer entry cannot automatically be applied to a catering licence.
- Exact-ID and exact-reference searches often returned different tenders or unrelated acronym/number matches. These were rejected. The query receipts preserve that outcome; one irrelevant people-search result was omitted with its original text hash retained. No information from it is used.

## Receipts and reproducibility

[Results](original-source-review/results.json) include all seven IDs/references, raw stage-specific values, source-database hashes, source URL outcomes and unresolved fields. [Five selected raw rows](original-source-review/selected-raw-rows.json) retain the SQL and only relevant identifiers, dates, procedures, categories and financial/completion labels. Supplier and contact details are omitted. The exact selection SQL remains in [field-semantics-leads.json](../../research/raw/tender-portal-audit/field-semantics-leads.json).

The five-case direct receipts and HTML bodies are under `original-source-review/receipts/`; [fetch summary](original-source-review/original-fetch-summary.json) distinguishes HTTP status from page content. `fetch_originals.py` records supplied URLs without rewriting or re-signing them. The original two-database hashes were verified by the procurement engineer; a mirror of the same researcher publication is not independent corroboration.

The parallel IRCTC checks are retained in [primary-receipts/README.md](primary-receipts/README.md), `1122373.json/.html`, `1123989.json/.html` and `exa.json`. Both direct responses are 2,912-byte unauthorized pages with HTML SHA-256 `1f549d09364564210967ff9bda7baf603d29f60735d8d964aaa3bece8c86ba7b`.

`original-source-review/sha256-manifest.json` inventories this review's artifacts. The finite sample is complete; no source-backed supplier, politician or misconduct connection follows from it. Further substantive verification requires the original notice/RFP, amendment history, signed award, payment evidence and completion records with matched identifiers.
