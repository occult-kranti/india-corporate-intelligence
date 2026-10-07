# Corporate trace: Mumbai procurement into dated project-finance disclosures

Review cutoff: 7 October 2026. This slice adds three traceable branches, not a corruption conclusion: 12 source entries, 14 documentary/legal entities, 13 explicit relationships, 9 records, 17 hops and 3 disconfirmation plans. The existing Mumbai CCTV approval is reused without changing its accounting stage or source.

The strongest new join is **GVPR Engineers Limited → 94%-held Honnavar Port Private Limited → named PFC loan sanction**, alongside an **aggregate sponsor contribution**. A second exact disclosed ownership join reaches **100%-held Vijaya WB Smart Meters Private Limited → WBSEDCL contract and consumer-payment priority mechanism**. Political-finance records are a separate branch: ten serial-level bond matches exist under a similar donor label, but the legal-contractor identity and source-of-cash bridge remain held.

## What the documents establish

| Step | Evidence and exact locator | What it establishes | What it does not establish |
|---|---|---|---|
| Mumbai CCTV | Original Maharashtra Home Department GR dated 15 April 2026, retained metro-spending source; PDF pp.2–4 | GVPR appointment approved at negotiated ₹2,098.92 crore including GST | Payment, executed work order, delivery, overcharge or corruption |
| Subsidiary perimeter | Original ICRA rationale, **26 November 2025**, PDF p.6 Annexure II | GVPR: 94% Honnavar Port; 100% Vijaya WB Smart Meters | Current ultimate beneficial ownership, shared bank accounts, or a transfer between entities |
| Public ownership | PFC original investor presentation, PDF pp.4,26; shareholder snapshot 30 June 2025 | President of India institutional holding 55.99%; issuer describes government majority ownership | Personal ownership of an office-holder, ministerial direction of this facility or sovereign guarantee |
| Lending-scope policy | PFC original FY 2022–23 Board report, PDF p.1 / printed p.42 | Government approval in August 2022 for logistics/infrastructure finance; subsequent entry into ports, desalination and metro rail | Proof that a particular loan complied with all limits; underlying MoA/government instrument not retained |
| Public-sector lending | Original CARE Honnavar rationale, **31 March 2026**, pp.1–3 | Financial closure 24 September 2025; **PFC ₹540.64 crore sanctioned** | Drawn loan: the same source explicitly says drawal was pending at 31 December 2025 |
| Sponsor support | Same CARE report p.2 | **₹79.48 crore cumulative equity plus unsecured loans** from the promoters at 31 December 2025 | Amount attributable to GVPR alone, to a person, or to a particular government receipt |
| Earlier sponsor snapshot | Original CARE report **22 January 2025**, p.1–2 | Earlier cumulative ₹61.86 crore at 31 October 2024 | An additional amount that can be summed with the later snapshot |
| Meter contract | Original ICRA Vijaya rationale **5 March 2025**, pp.1–3 | ₹857.05 crore estimated AMISP contract, 7.78 lakh meters; award 10 January 2024 and parent-signed agreement 20 February 2024 | Actual receipts or ₹857.05 crore installation cost; the underlying signed agreement/assignment is not retained |
| Meter payment controls | Same ICRA report pp.1–2 | DDF routes assigned consumer online receipts to SPV payments first; monthly inflow requirement is at least 5× estimated monthly AMISP payment | Actual customer debits, compliant or noncompliant operation, theft or diversion |
| Meter financing | Same ICRA report pp.1–3 | ₹151 crore tied-up term loan; ₹110 crore sanctioned bridge loan; ₹101.87 crore rated bridge scope; disclosed parent guarantee | Disbursements or additive ₹110 + ₹101.87 crore loans; interchangeable LC is not another ₹151 crore loan |

The ratings are primary publications of the rating agencies, based partly on issuer-supplied information. They are **not underlying audited ledgers, bank advice, signed procurement agreements or an independent audit of all stated facts**. ICRA explicitly discloses its non-audit limitation. Company-wide operating income, order book, available cash and contingent bank guarantees are kept apart.

The CARE 2026 report itself prints both ₹789.58 and ₹789.59 crore for project cost, and September/October 2027 for completion. These differences are retained as source precision/status issues. Their cause is not invented. Both CARE URL filenames also differ from the date in their document headers; the headers control.

## Electoral-bond reproduction and the deliberate identity stop

`reproduce-bonds.py` downloads two pinned public mirrors of SBI/ECI original-form PDFs, extracts them with `pdftotext -layout`, scans the entire purchase text for the **exact** label `GVPR ENGINEERS LTD`, and joins **prefix + bond number**, requiring equal denominations and exactly one selected redemption per instrument. It does not join on dates, values or similar names.

| Purchase | Selected purchase PDF page/row | Bond serials | Redemption PDF page/row | Recipient |
|---|---|---|---|---|
| 7 October 2023 | p.315, rows 15399–15403 | OC 15936, 15928, 15932, 15930, 15934 | p.472, rows 17457–17461; 16 October 2023 | Bharatiya Janata Party: five ₹1 crore bonds |
| 10 January 2024 | p.379, rows 18559–18563 | OC 16996, 16994, 16988, 16992, 16990 | p.543, rows 20072–20076; 16 January 2024 | President, All India Congress Committee: five ₹1 crore bonds |

Pinned mirror commit: `9ff9171f5f14dc3796bd0fbc9b950b8f7e035559` in `anagri/electoral-bond-analysis`.

- Purchase PDF SHA-256: `91d0f83d9c8fd872891071161af3e1497fb519489a95c48674106d98ee273520`.
- Redemption PDF SHA-256: `ee03f4bf5453ee5f114b33984db4538aeae64484e8e3bfade6c0717552828c75`.

The original ECI index returned HTTP 406. Original-host byte identity was **not** established. ADR's retrieved HTML independently agrees with **eight** selected serial rows; it omits OC15934 and OC16990. The two omitted rows are established only by the PDF mirror join, not ADR. ADR is not used to resolve legal identity. Mirror rows retain `reported` source and relationship tiers; their financial hops use `reported-transfer`, never `documented-transfer`. Published extracts exclude bank-account suffixes and operational teller identifiers; full mirrors stay in the external evidence cache.

The drawable donor node is a resolved **documentary label object** of type `source-mention`, explicitly labelled “legal entity unverified.” It has **no canonical company ID or identity-crosswalk to GVPR**. No amount is attributed to the contractor until an audited company donation disclosure or another lawful exact-identity source closes that gap. Even a valid identity bridge would not identify the underlying cash source or establish an exchange for a contract. Both political recipients and the more-than-two-year gap before Mumbai's CCTV approval are retained as counterevidence against an automatic recent award-for-donation theory.

## Requests that would advance the investigation

1. **Mumbai Police/Home Department:** executed Phase III work order, milestone invoices, acceptance certificates, variation orders and treasury payment advice.
2. **Honnavar Port/GVPR/PFC:** contributor-resolved equity and unsecured-loan schedules, PFC sanction and subsequent disbursement ledger, certified end-use and related-party ledgers. Reconcile sources and uses without assuming that a parent holding proves movement of cash.
3. **WBSEDCL/SPV/escrow bank:** signed AMISP and DDF agreements, assignment to SPV, aggregated monthly collections, approved bills, milestone/SLA performance, deductions, grants and payment reconciliations. Aggregate records suffice; household bank details are unnecessary.
4. **Disclosed bond purchaser:** audited political-contribution note and exact registered-identity confirmation. A specified tender-to-donation hypothesis additionally needs lawful company payment reconciliation and decision records.

No external messages, document requests or allegations were sent. No source claims a corrupt transaction in these new corporate branches. Dated promoter names are contextual only, and ministerial influence, public-office patronage, MEIL/NCC family links and unseen bank transfers are not inferred.

## Reproduction and integration

```sh
python research/raw/money-trails/corporate/reproduce-bonds.py
python research/raw/money-trails/corporate/build.py
```

The first command requires network access to pinned public mirrors and `pdftotext`; original-form mirrors are stored outside the public repository. The second rebuilds the curated slice, catalog and exact source-to-artifact hash manifest. Repeating network retrieval updates retrieval timestamps, so regenerate the manifest after any such run. The independent deep-slice validator passes. Final whole-registry and browser acceptance is owned by the integration/review agents.

## Frozen release inventory

Frozen after independent review corrections on 7 October 2026. New compared with source base `3d6ec88`: **3 corporate traces, 17 explicit hops, 3 testable hypotheses, 14 documentary/legal nodes, 13 relationships, 9 records and 11 new source entries**. The slice has **12** source entries because it also binds the already reviewed Mumbai CCTV GR. The registry additionally generates one deliberately reviewed contractor identity bridge; that bridge is navigation, not a fourteenth financial relationship.

Existing and reused: the Mumbai CCTV GR, its GVPR legal-contractor identity, the `metro-mumbai-security:relationship:city-cctv-gvpr` approval and its unchanged ₹2,098.92 crore commitment. The two procurement-rooted trails reuse that same step; they do not create two awards or two payments. Existing allegations, procurement snapshots and retained donation claims are not expanded through name matching.

Newly read: seven original rating/company PDFs (two GVPR ICRA, two Honnavar CARE, one Vijaya ICRA, PFC investor presentation and PFC Board report), the original ICRA lender table, two selected mirror-derived SBI/ECI source objects, and ADR's secondary rendering. Every source row explicitly states its role and limits. The mirrored donor object remains legally unresolved; the public-lender and parent/subsidiary connections are documented context with no corrupt-exchange claim.

The final archive manifest binds **36 artifacts / 9,902,044 bytes** through **13 source bindings**. The extra binding points to the existing metro GR source ID reused by the approval hop. All artifact hashes verified successfully.

- Manifest SHA-256: `f8f00d5169cc95527a1838346a461aca2fee50698bab98096804af79ff779fd8`.
- Slice SHA-256: `0c2e9bdbbac26314ff9fff99f5073c4a1d617785ef777d73f310581fe25e0f1f`.
- Catalog SHA-256: `21478acf4f49dbd8b81ead625fd497ca71333a03ed94c3b798a3e71232883222`.

Independent review also reproduced all ten bond rows from the cached full PDF text without using the producer parser; its receipt is `docs/money-trails/bond-challenge-receipt.json`. The corporate deep-slice validator passed, and the integrated money-trail validator reported no corporate errors at freeze (the independently owned DJB catalog was still being finalized).

Final date-metadata correction: PFC sanction remains dated 24 September 2025, the undrawn balance is a 31 December 2025 snapshot, and the reporting/status assertion is dated 31 March 2026. The cumulative promoter contribution uses the same explicit snapshot-versus-report distinction; no single-day infusion is implied.
