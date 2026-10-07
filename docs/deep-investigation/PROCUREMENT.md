# Procurement: contracts into financing and company transactions

Research snapshot: **6 October 2026, America/New_York**. Actual new retrievals occurred on **7 October 2026 UTC**. This is a finite, curated investigation slice, not a national procurement census.

The exported slice is [`procurement.json`](../../research/raw/deep-investigation/procurement.json). It contains **4 investigation cases, 4 linked response records, 28 discovery leads, 28 entities, 36 relationships and 33 sources**. Graph identities are local and explicit. Only the reviewed L&T and Adani Enterprises identities expose canonical navigation bridges; an identity bridge is not a financial transfer.

## What is new

| Case | Documented chain | Monetary boundary | Current evidence and response |
| --- | --- | --- | --- |
| IRB Ganga Group I | UPEIDA selection → MBEL concession → financing → IRB/Anahera ownership → IRB project-manager consideration → IRB Infrastructure Trust securities acquisition | ₹1,746 crore selected VGF, ₹2,659 crore debt financing and ₹2,133 crore equity/related commitment are a funding plan. The later ₹1,714.92 crore closed acquisition consideration covers **both** 80.4% equity and 80.4% debentures once. | CCI approval 4 June 2024; issuer’s arm’s-length assertion and unitholder approval retained; closing 27 December 2024; toll collection started 17 May 2026. Seller-level receipts and final construction accounts remain absent. |
| Adani Ganga Groups II–IV | UPEIDA → three exact concession SPVs → AEL ownership/equity → SBI senior debt | Per-SPV debt is ₹3,433/3,295/3,510 crore; equity ₹2,289/2,197/2,341 crore; VGF ₹1,720/2,177/2,099 crore. Aggregate and components are the same observations and must not be added twice. | UPEIDA independently identifies lowest-grant selection. SBI underwriting is disclosed by the borrower, not a bank drawdown ledger. AEL’s FY26 report records 29 April 2026 inauguration. |
| L&T / NHSRCL C4 | Public shareholders → NHSRCL → L&T’s exact C4 contract; JICA → sovereign borrower → project executing agency | Official award: INR 21239,95,62,767 **plus** JPY 878,236,238 **plus** USD 495,520,952. No FX conversion. JICA’s cumulative JPY 1,050 billion is a whole-project commitment, already including its JPY 400 billion fifth tranche. | Buyer’s dated tender chronology and process explanation retained. JICA independently confirms the C4 agreement. No package-specific disbursement or final contractor payment reconciliation. |
| MEIL / Polavaram powerhouse | APGENCO → MEIL E&M contract/material payments; REC → APGENCO project finance; CAG → attributed findings and government responses | ₹3,965.11 crore loan, ₹2,810.88 crore contract, ₹30.86 crore steel advances, ₹1.10 crore estimated foregone interest, ₹41.26 crore early equipment procurement, and ₹1.90 crore estimated interest are distinct, potentially overlapping stages. | Government disputes classification of the steel payments as an advance. It **accepted** the separate early-equipment observation at the November 2024 exit conference while explaining design changes/BHEL supply. CAG rejected the justification. The 6 August 2026 parliamentary answer excludes the powerhouse from central irrigation grants; it does not settle the audit findings. |

IRB adds a particularly useful distinction: its 19 October 2022 release separately describes ₹5,279 crore EPC consideration during construction and ₹5,180 crore O&M consideration over the concession, both plus taxes. Neither is presented as money already received. The first equity raise of ₹533.20 crore is a component of the financing plan. The 2025 annual-report borrowing table expressly includes pending disbursement; its ₹26,590 million MBEL row is not proof that all debt had been drawn.

No case infers a donation-for-award bargain, uses family association to infer influence, or treats an issuer’s “arm’s length” description as an independent conclusion. The MEIL findings are specifically attributed to CAG; they are not criminal adjudications. Statements of public authority, issuer disclosures, and independent lender confirmation retain their separate roles.

## Existing evidence and the supplied tender corpus

Before selecting cases, the work searched relevant public-works, energy, capital, CPPP and earlier Adani/Reliance deep records. A targeted existing-corpus extract retains **198 candidate entity/relationship/claim rows across 16 files** in [`existing-corpus-leads.json`](../../research/raw/deep-investigation/procurement-evidence/existing-corpus-leads.json). The prior nine audit findings were read as constraints, not re-presented as new detective results. In particular, the AOC comparison-date field is not used to compute evaluation speed.

Two additional queries read the supplied SQLite snapshot in **read-only mode**:

1. Exact public notice ID `2020_NHIDC_564017_1` or exact reference `NHIDCL/JnK-Ladakh/ Zojila/NH-01/2020`: **0 retained AOC rows**. The original CPPP notice itself returned meaningful HTTP 200 content; NHIDCL’s own project register separately names MEIL and the 25 August 2020 award date. Zero corpus rows therefore cannot mean no contract.
2. Exact references from the **20 displayed NHSRCL register rows**: **0 retained AOC rows**. There was no fuzzy reference join, supplier-name merge or attempt to turn the corpus’s incomplete population into an award census.

Executed SQL, parameters and result counts are in [`zojila-exact-query.json`](../../research/raw/deep-investigation/procurement-evidence/zojila-exact-query.json) and [`nhsrcl-exact-query.json`](../../research/raw/deep-investigation/procurement-evidence/nhsrcl-exact-query.json). Raw database identity points to the existing download hash receipt; the 13.3 GB database was not copied into this change.

## Discovery queue and denominator

The **28 leads** comprise:

- **19** remaining rows from the 20-row NHSRCL page extract after taking C4 into a developed case. This includes **one discharged tender**, which is not an award, and **one tree-disposal auction**, where the likely money direction requires verification. The remaining 17 entries retain exact references and supplier labels pending corporate identity, consortium and payment checks.
- **1** Zojila exact-notice lead, with corpus linkage and price/contract reconciliation unresolved.
- **8** explicitly carried-forward follow-ups from prior research: Dwarka design appraisal, Cherkkala repair cost/debarment, Meachi bridge responsibility, UP manpower overlap, UP duplicate connections/recoveries, Karnataka single bids, Karnataka late/retendered works, and Telangana police-vehicle financing. Their prior findings and responses remain dated; they are not counted as newly discovered irregularities.

An empty amount cell remains empty. Supplier text is not promoted to a resolved legal company. A discharged tender has no winning supplier. Geographic association is not used as a proxy for payment. There is no cross-stage monetary total.

## Source retention and access limits

[`procurement-evidence/manifest.json`](../../research/raw/deep-investigation/procurement-evidence/manifest.json) records **33 original-fetch receipts: 25 HTTP 200 and 8 HTTP 503**. The companion [`sha256-manifest.json`](../../research/raw/deep-investigation/procurement-evidence/sha256-manifest.json) hashes **128 artifacts**, approximately **26 MB**, including original bytes, extracts, search/fetch receipts, query results and generation inputs. A transport success is not automatically content verification.

There were 18 Exa search calls with 98 requested result slots across five research directions. This is a search-effort measure, not 98 unique or independently corroborating sources. Directly fetched original documents were preferred. NHSRCL and CAG content used in the cases is explicitly marked as retained Exa-indexed official text after original-host failures. The selected CAG paragraphs contain legible amounts; unrelated paragraphs with dropped number glyphs were not used to invent values.

The original MBEL interim special-purpose financial statements were located and retained, but are scanned: `pdftotext` produced only 28 characters. No accounting row was inferred from that scan. Its exchange cover letter is separately retained and correctly treated as a pointer to the statements, not the statements themselves. This does not affect the separately accessible acquisition closing filing.

The source files are generated by [`build_slice.py`](../../research/raw/deep-investigation/procurement-evidence/build_slice.py) with explicit [`editorial_overrides.json`](../../research/raw/deep-investigation/procurement-evidence/editorial_overrides.json). Local checks verified all identifiers, source closure, relationship endpoints, response/record links, calendar dates and required case fields. Platform-wide validation is owned by the data integration workstream.

## Independent challenge and correction

The adversarial reviewer independently read IRB’s original approval and closing extracts. It confirmed that ₹1,714.92 crore covers equity **and** debentures, that seller allocation remains unspecified, and that CCI approval and the issuer’s arm’s-length language have narrower meanings than transaction fairness. The final slice preserves those limits.

The services reviewer independently read CAG paragraphs 3.2.2.1 and 3.2.3 and confirmed all six staged MEIL/REC figures. It requested the distinction between government’s contested material-payment classification and its acceptance of the early-equipment observation. The response and case summary were corrected accordingly. Reviewers also identified compressed prose during drafting; all affected case, amount-stage, queue and response text was rewritten before JSON freeze.

## Independent review of the corporate slice

This workstream separately reviewed `corporate.json` against its retained original sources for stage, direction and double counting:

| Check | Independent source comparison | Result |
| --- | --- | --- |
| Air India actual versus estimate | Budget 2023–24 Demand 8, actual FY2021–22 column, items 21.01–21.03: ₹36,254 + ₹12,357 + ₹13,754.40 = ₹62,365.40 crore. Budget 2022–23 revised estimate used ₹13,446 crore for past dues and ₹62,057 crore total. PIB closing records ₹2,700 crore government cash and ₹15,300 crore debt in the sold businesses. | Correctly separated. The ₹308.40 crore revision is attributable to the past-dues line, not an extra buyer payment or loan waiver. |
| Mangaluru versus all-six receipts | PIB 12 December 2022 lists ₹221.88 crore upfront Mangaluru payment and separately ₹710.88 crore concession fees for six airports through October 2022. | Correct perimeter. No conversion of all-six receipts into Mangaluru revenue. |
| PKCL services versus financing | AEL FY26 standalone note 50, “Rendering of Services (incl. reimbursement)” ₹2,032.50 crore; “Loans received back” ₹2,127.14 crore; closing trade receivable ₹648.11 crore. FY25 comparators are separate columns. | Correct flow/stock and financial-year treatment. Receivable is not added as revenue; principal returned is not income or profit. |
| HZL proposal components | Vedanta 27 January 2023 release says US$2,981 million cash proposal **including** US$562 million deferred, milestone-linked consideration. | Correct proposal-only treatment and no component double counting. The target/control arrow initially needed clarification. The author corrected its label, summary and limitation to distinguish the acquired target from the reported shareholder/cash recipient and to deny a completed cash transfer. |

No material financial-stage or double-count error was found in these reviewed corporate amounts. This is a bounded accounting/source review, not verification of every corporate relationship or independent proof of all underlying transactions. The separate corporate reviewer owns its final legal-status and source-access checks.
