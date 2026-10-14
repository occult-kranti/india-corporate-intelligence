# Resources, oil and welfare investigation programme

Reviewed 14 October 2026. This batch adds 10 source records, 24 entities, 25 documented relationships and eight research leads. Two catalogue records share source families with their reports; they are acquisition provenance, not independent corroboration. The bundle is `research/investigation-program/resources-welfare.json`.

The substantive additions are recovered original records and executed numerical checks. They establish administrative and financial connections across oil companies, welfare programmes, emergency relief, coal allocation and electricity regulation. They do not establish a government-wide conspiracy.

## What changed

| Executed analysis | Result | What it establishes |
|---|---|---|
| CAG PMUY tables 7.2 and 7.3, all nine company rows | ₹548.54 crore contributions − ₹226.69 crore PMUY use − ₹60 crore previous-BPL allocation = ₹261.85 crore idle at March 2019; residual ₹0.00 | The apparent ₹60 crore discrepancy disappears when footnote 20 is included. Subsequent disposition remains a specific acquisition target. |
| Rajya Sabha answer 4116, Annexure B, all 36 State/UT rows and national aggregate | FY2024–25 PMUY consumption is lower than non-PMUY consumption in every row; national 4.47 versus 6.64 equivalent cylinders, a 2.17 gap | A distributional outcome needing explanation. Household differences prevent a causal inference of fraud or programme failure. |
| CAG coal-auction Annexure IV, all 11 selected auction rows | 60 qualified bidder entries, 39 independent entries reported by CAG, 12 entries with zero bid actions, 2,938 actions; every printed action total reconciles | A bounded design/competition question. These are not 60 unique companies or a representative sample of all auctions. |
| ONGC official retrospective announcement | Company-reported PM CARES contributions: ₹300 crore in April 2020, ₹70 crore during FY2021–22, ₹100 crore on 31 March 2023 | The same public company participated in different welfare/relief funding programmes in different periods. No transfer from the earlier PMUY pool is traced. |

The refill source's FY2025–26 columns are explicitly prorated from April 2025–January 2026. They are preserved as published but excluded from complete-year trend calculations. This does not supersede later full-year government reporting retained elsewhere in the site. An unweighted average of states is never substituted for the published national average.

The historical CSR result must not be presented as money currently missing. The ministry's May 2019 response said IOCL had been advised to return excess funds. The relevant next evidence is the return/use ledger and acknowledgments.

## Why the connections matter

Six oil PSUs contributed to an IOCL-administered welfare pool. IOCL therefore had both contributor and administrator roles. ONGC also made later emergency-relief contributions. These links identify where board approvals, CSR obligations, programme outcomes and recipient records can be reconciled. They do not show that one programme's money funded another. Existing entity bridges were verified against the runtime registry, with exact institution names or source-defined company abbreviations. A bridge does not re-verify older claims attached to the same entity.

LPG financing also has distinct payment stages. The August 2025 Cabinet announcements authorized ₹30,000 crore supplier compensation and ₹12,000 crore targeted PMUY subsidy. The former concerns under-recoveries at three OMCs; the latter concerns household support. Neither approval establishes disbursement. An investigation should compare company accruals, treasury releases and household credits for consistent periods before claiming a discrepancy. Domestic LPG import costs cannot be replaced with Russian crude discounts in that reconciliation.

The coal-to-electricity link identifies an observable benefit pathway: allocation, coal delivery to power plants, fuel-cost accounting, regulatory notice and tariff true-up. The CAG record identifies Sarisatolli, CESC and a notification interval. Destination plants and the consumer-benefit calculation remain unresolved in this batch.

## Counterevidence and rejected joins

- CCI Case 02/2025 closed the coal-auction complaint under section 26(2), finding no prima facie contravention. Its reasoning includes limitation, insufficient evidence and active independent participation. The investigation must retain that disposition. No current appeal outcome was acquired.
- The CAG narrative case study is anonymized, while Annexure IV separately lists named bidder entries. Do not say the entire public report contains no names, or silently map every anonymous role to a company. The source spelling “CESE Ltd” remains in the numeric extract; CESC's allottee identity is independently explicit in paragraph 8.6.1.
- Current ownership must not be applied retroactively to the 2015 bidder groups. A zero-action entry is not itself cover bidding. The other successful auctions have not been acquired as a matched control group.
- Duplicate, inactive and fake/non-existent LPG connections are different categories. The government's aggregate deactivation figure is not a count of proven fraud cases, and a grievance marked resolved is not necessarily a successful benefit transfer.
- No ONGC/IOCL CSR pool → PM CARES routing edge is drawn. No party-finance edge is manufactured from a shared PSU or ministry.
- IOCL's FY2020–21 annual-report search results mentioned ₹225 crore to PM CARES, but both inspected original full-report URLs returned 404. That snippet was not promoted into a new payment edge. The ONGC article was acquired in full from the company's site instead.

## Mechanism tests

The actor model is a set of rival explanations, not an assignment of malicious intent. A ministry may seek rapid coverage; a supplier may seek reimbursed costs; households may respond to affordability and delivery conditions; an auditor seeks verifiable use. A perverse output incentive could favor connections over sustained use, but it predicts patterns that must survive comparison with income, household size, alternative fuels and payment timing. Verified household clean-fuel use would weaken that explanation.

For auctions, multiple related entries could reduce independent participation under a qualification cap. The appropriate test freezes auction-date identities and rules, then compares complete action logs and outcomes across the entire offered cohort with mine characteristics held constant. Independent competitive bidding, commercial reasons for withdrawal, or disappearance of differences after matching would weaken the mechanism. This programme has not fitted that model or assigned misconduct probabilities.

## Reproduce and extend

Run:

```bash
python research/investigation-program/raw/resources-welfare/analyze.py
```

The script uses exact decimal strings for money, independently checks all row and annual totals, incorporates the separate footnote allocation, checks bidder-group arithmetic and bid-action totals, and computes complete-year refill differences. `computed-findings.json` records input hashes. The raw files retain source locators, scope and original-PDF hashes. No individual beneficiary identifiers were collected.

`extract_refills.py /path/to/AU4116_Jq69sG.pdf` independently re-extracts the original parliamentary PDF and compares all 37 rows / 148 numeric cells with the saved table. It passed on the downloaded original and refuses a PDF with different bytes until the new version has been reviewed.

Original report downloads were recovered by following each official CAG catalogue's current CloudFront link; older `cag.gov.in/uploads/...` links returned 404. The PMUY PDF was downloaded and its table page rendered for visual comparison. All three coal annexure pages and the parliamentary refill table were also rendered and inspected. The parliamentary table was extracted from the actual PDF with PyMuPDF and a four-column numeric regex; CSR and coal numbers were manually transcribed and checked against original text and page images.

| Original | SHA-256 | Inspected locator |
|---|---|---|
| CAG PMUY report 14/2019 | `7139d432ab5515e721b4aa3cafbf073203e0aff7e2601691453dffb7550dc9b2` | Printed pp43–47; table page44 = PDF75 |
| CAG coal report 20/2016 | `be75c4426d837b800b77db64b1b29483bb9770d92210051871975d8dc510249a` | Paragraph5.1, AnnexureIV/PDF90–92, paragraph8.6.1 |
| Rajya Sabha answer4116,30March2026 | `025268813b2a446f0ea3114e4f60933d76f8392e95a936c4f7c83f40c92219d2` | AnnexureB/PDF4 |

Priority acquisitions are: (1) historical CSR return/use ledgers; (2) OMC compensation allocation and actual releases; (3) complete-year district refill distributions and exclusion outcomes; (4) all offered 2015 mine action logs and dated ownership; (5) plant-level coal diversion and tariff true-ups. Existing Bharatmala, water, electricity, public-works and procurement-cohort registers were inspected to avoid padding this batch with duplicate cases. No new public-works misconduct finding was made.
