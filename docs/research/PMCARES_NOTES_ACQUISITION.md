# PM CARES audit notes and refund acquisition log

Access date: **14 October 2026**. Question: can the official public documents identify the implementing agencies, projects, original release periods or reasons behind the FY2024–25 refund receipt, or supply referenced Note 11 and the separate auditor report?

**Result: the acquisition attempt did not obtain Note 11, the complete FY2024–25 notes, the separate auditor opinion or a current agency/project refund breakdown.** The official English and Hindi account indexes link to the same six annual statements and trust deed. Their actual HTML contained no separate notes/opinion link. The FY2024–25 PDF is unchanged from the repository's independently transcribed source. This is a bounded public-disclosure gap, not proof that records do not exist, that access was deliberately withheld or that funds were diverted.

No request was submitted, no person or institution was contacted, and no existing data was changed. The existing cash reconciliation already balances; this task sought explanation and attribution, not an invented arithmetic discrepancy.

## Official records examined

| Accessed URL | Result and evidentiary scope |
| --- | --- |
| [Official home](https://pmcares.gov.in/en/) | Public page retrieved; followed its About and FAQ links. |
| [English About/account index](https://pmcares.gov.in/en/web/page/about_us) | Web text and direct HTML retrieved. HTTP 200; 20,296 bytes. Lists FY2019–20 through FY2024–25. Extracted all `href`/`src` values: six annual account PDFs, the trust deed and a PDF icon; no separately linked notes or opinion. |
| [Hindi About/account index](https://pmcares.gov.in/hi/web/page/about_us) | Web text and direct HTML retrieved. HTTP 200; 25,617 bytes. Same document links as the English page. It is another language view of the same publisher, not independent corroboration. |
| [Official FAQ](https://pmcares.gov.in/en/web/page/faq) | Web text and direct HTML retrieved. HTTP 200; 50,958 bytes. Q15 directs users to the About page's receipts/payments accounts; Q19 names KKC & Associates LLP as auditor. No separate PDF/notes/opinion link found in the HTML. These are the fund's own statements. |
| [FY2024–25 statement](https://pmcares.gov.in/assets/donation/pdf/Audited_Statement_2024_25.pdf) | Retrieved through web and a fresh direct GET. One page, HTTP 200, 142,737 bytes. SHA-256 exactly matches the existing extraction. The refund receipt is ₹3,24,65,80,919, associated with Note 11; the comparative FY2023–24 figure is ₹84,31,07,673. The file references accompanying notes 1–16 and an auditor report but does not include them. It does not identify the refunding agencies, projects or original disbursement periods. |
| [FY2023–24 statement](https://pmcares.gov.in/assets/donation/pdf/Audited_Statement_2023_24.pdf) | Retrieved through web and a fresh direct GET. One page, HTTP 200, 120,220 bytes. It provides another annual statement, not the missing FY2024–25 notes. No agency breakdown was acquired from it. |
| [FY2022–23 statement](https://pmcares.gov.in/assets/donation/pdf/Audited_Statement_2022_23.pdf) | Official PDF opened, two pages. The repository copy was visually inspected on both pages. Page 1 distinguishes refund categories, including ₹2,02,88,62,043 associated with the 50,000-ventilator procurement. Page 2 is closing balance/signatures and refers to notes 1–11; it does not contain those notes. This older project category cannot identify the source of the FY2024–25 refund. |
| [FY2021–22 statement](https://pmcares.gov.in/assets/donation/pdf/Audited_Statement_2021_22.pdf) | Official PDF opened; two pages. Used only as an earlier linked-document check; no current Note 11 or FY2024–25 refund identity was obtained. |
| `https://pmcares.gov.in/en/web/page/annual-audit` | A guessed, non-index-linked route was not accessible through the web tool. This failure is not evidence that an audit or notes are absent. The actual About index was subsequently followed and its raw link set inspected. |

The PDF link inventory on both About pages was:

- `https://pmcares.gov.in/assets/donation/pdf/Audited Statement.PDF` — FY2019–20 index entry; not needed for the current-note test.
- `https://pmcares.gov.in/assets/donation/pdf/Audited_Statement_2020_21.pdf` — older index entry; not a FY2024–25 note.
- `https://pmcares.gov.in/assets/donation/pdf/Audited_Statement_2021_22.pdf`
- `https://pmcares.gov.in/assets/donation/pdf/Audited_Statement_2022_23.pdf`
- `https://pmcares.gov.in/assets/donation/pdf/Audited_Statement_2023_24.pdf`
- `https://pmcares.gov.in/assets/donation/pdf/Audited_Statement_2024_25.pdf`
- `https://pmcares.gov.in/assets/donation/pdf/Trust_Deed.pdf` — constitutive document, not the annual explanatory notes.

The inventory exhausts the current account-index links; it is not a crawl of every government or agency website. Older documents were not treated as substitutes for current notes.

## Targeted search record

Queries were run on public web search, using both available search engines across separate calls. Results below describe this search run, not guaranteed global absence.

| Queries | Result |
| --- | --- |
| `site:pmcares.gov.in "2024-25" "notes"`; `site:pmcares.gov.in "refund" "implementing"` | Returned the official FY2024–25/FY2023–24 statement PDFs. No separate explanatory note. |
| `site:pmcares.gov.in "Note 11"`; `site:pmcares.gov.in "auditor" "report" "2024"` | Returned the annual statements, older statements, trust deed or About page; no current auditor-opinion document. |
| `"PM CARES" "implementing agencies" refund "2024"`; `"PM CARES" "324.65" refund` | Returned reporting and social posts discussing the aggregate. No acquired primary record identifying FY2024–25 refunding agencies. Reporting was used for discovery, not as a substitute for Note 11. |
| `site:gov.in "PM CARES" "324" "refund"`; `site:gov.in "PM CARES" "2024-25" "unspent"` | Returned annual reports and unrelated accounting/benefit material alongside the statement. None established the target refund's identity or original period. |
| `site:pmcares.gov.in "notes" "2024"`; `site:pmcares.gov.in "Note 11" "agencies"` | Returned the same statement or no newly relevant primary document. |
| `site:pmcares.gov.in "Notes" "2024_25"`; `site:pmcares.gov.in "3,24,65,80,919"`; `site:gov.in "PM CARES" "refund" "implementing agencies"`; `site:gov.in "PM CARES" "324.66"` | Second-engine cross-check produced no additional source satisfying the acquisition target. Unrelated results were rejected. |

## Retrieval fingerprints

These hashes identify responses obtained in this attempt; HTML can change between visits. Originals already present in the repository were not overwritten.

| Response | SHA-256 |
| --- | --- |
| English About HTML | `8a9399b428b994c6f8c83b751e73a76f5500cdc8ebafeb9bf2d0405cf1b30fe3` |
| Hindi About HTML | `c5f09e75829aaff619080a0dd17e85be957267566dcbfafb2ede760230230ebd` |
| FAQ HTML | `db055233007ac2026b4960ba45946230349efbe23cfa837be2d9be0e33582985` |
| FY2024–25 PDF | `b854546de57c70e457b5a46acaa640983ab514930139a685135aa5ce86b60cfc` |
| FY2023–24 PDF | `26695e684cac53e0240c7d626a7184d8fe0f3e3e810c2b1bf8cfa737a2aba862` |

## What can be concluded

The acquired annual record establishes an aggregate implementing-agency refund receipt, and the earlier statement demonstrates that some historical refunds were described by project category. Neither establishes which agency returned the FY2024–25 money, why, whether it was principal or included interest, or when it was originally advanced. Do not assign the latest aggregate to ventilators or any named agency based on the older statement.

The next decisive record remains the FY2024–25 Note 11 schedule, with agency/project identifiers, original releases, refund dates, principal/interest distinctions and linked utilization/acceptance records, plus the complete auditor report and notes. Those records could support routine return of unspent balances, an accounting correction or a substantive irregularity, depending on their contents. The present acquisition does not discriminate between them.

Stopping condition met for this bounded pass: the official English/Hindi account link sets and FAQ were inspected, relevant linked annual PDFs were checked, the current PDF version was verified, and targeted official-domain and exact-amount searches produced no qualifying explanatory record. Status: **attempted; missing explanation remains unresolved**.
