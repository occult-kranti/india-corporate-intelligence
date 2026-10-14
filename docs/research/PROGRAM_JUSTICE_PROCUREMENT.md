# Justice and defence-procurement research continuation

Research cut-off: 14 October 2026. This contribution adds 9 inspected source records, 19 entities, 17 documentary relationships, 5 executable leads and 7 coverage entries. It maps public relationships and institutional controls. It does not infer hidden coordination from a commercial relationship, an adverse judgment, shared jurisdiction, or an unfilled record request.

## What changed

The previous defence-offset dossier relied on a PRS summary. The original **PAC Fiftieth Report, Eighteenth Lok Sabha, Management of Defence Offsets** is now acquired. This closes a specific source gap and permits separate treatment of contracted obligations, amounts due, submitted claims, credited/rejected claims, and penalties imposed. The report is [available from Sansad](https://sansad.in/getFile/app/lsscommittee/Public%20Accounts/18_Public_Accounts_50.pdf?source=app).

The new relationship map includes the PAC–Ministry–DOMW–CGDA oversight chain; historical AEL–ADSTL–Alpha ownership; and Ministry-reported Alpha links with foreign offset partners and MHA clientele. These are documented institutional/commercial relationships. The necessary next join is award IDs and contemporaneous ownership, not an assumption that a relationship is improper.

The arrest-safeguard corpus now includes the original 2025 **Vihaan Kumar** and **Mihir Rajesh Shah** judgments and the original 21 September 2026 **Jaskaran Jeet Singh Deol** judgment. The latter places re-arrest following constitutional violations under judicial and supervisory controls. These extend the existing Pankaj Bansal / Purkayastha line, with distinct case outcomes and effective dates. State police conduct is not automatically attributable to the Union government.

## Reproducible document extraction

Files:

- `research/investigation-program/justice-procurement.json`: network and lead records.
- `research/investigation-program/extracts/justice-procurement-offsets.json`: 16 numeric rows and 7 calculations.
- `research/investigation-program/tools/extract_justice_procurement.py`: unique-anchor PDF extraction, Decimal arithmetic, fixed source checksum and page-count guard.

The PDF was downloaded from the original Sansad endpoint. SHA-256: `9023d742c0b30dd2c59aa2227ce265e4918ba0065729163993ecb9f238bedfe8`; 3,460,842 bytes; 45 pages. The extracted table pages were visually checked against the original PDF at PDF pages 13 and 16. Printed page numbers are eight lower. The December claim row continues on PDF page 14. Paragraph 18 starts on PDF page 15 and continues on 16.

Reproduce from the public endpoint:

```bash
python research/investigation-program/tools/extract_justice_procurement.py \
  --output /tmp/justice-procurement-offsets-replayed.json
```

For an already acquired exact PDF:

```bash
python research/investigation-program/tools/extract_justice_procurement.py \
  --pdf /tmp/jp-pac50-2026.pdf \
  --output /tmp/justice-procurement-offsets-replayed.json
```

The current extraction was actually run. It fails if the PDF changes; update the source version only after inspection. Numeric facts are retained rather than redistributing the whole report.

Key calculations, all in USD million unless marked otherwise:

| Calculation | Result | Interpretation |
|---|---:|---|
| `20 + 10 + 26` | 56 contracts | Status counts reconcile |
| `9915.38 − 5467.82` | 4,447.56 | Unsubmitted portion of the ongoing-contract total |
| `100 × (9915.38 − 5467.82) / 9915.38` | 44.86% | Denominator is the 26 ongoing contracts; not automatically overdue |
| `9237.64 − 9452.19` | −214.55 | January versus December claim snapshots; explanation needed |
| `13215.00 − (2438.32 + 632.08 + 9915.38)` | 229.22 | Conditional bridge across status figures whose dates/bases may differ |
| `9237.64 − 7242.55` | 1,995.09 | Conditional processing residual, not a rejected-claim or loss estimate |
| `100 × 9237.64 / 10022.93` | 92.17% | January submission/due ratio, not acceptance rate |

The original report says obligations extend to 2033. It also combines **credited and rejected** claims in one disposal total. Therefore neither the 44.86% calculation nor a processing residual is a theft or overdue-loss estimate. The 94.98 penalty figure is imposed, not demonstrated collected. Paragraph 18 does not label its snapshot date. No arithmetic residual here establishes diversion.

The parent dossier now replaces its broad “45% unfulfilled” sentence with the precise ongoing-contract denominator and separate maturity limitation. The snapshot reconciliation lead maps to `defence-offset-delivery`, hypothesis index 1. A fresh versioned register, with withdrawn/revised claims and a table-date crosswalk, is needed to explain the differences.

## Ownership and supplier bridge

The [2018–19 AEL annual report](https://www.adanienterprises.com/-/media/Project/Enterprises/Investors/Investor-Downloads/Annual-Report/AR-FY19.pdf), consolidated entity table, printed pp.205 and 207, entries 105 and 158, records AEL holding 100% of ADSTL and ADSTL holding 26% of Alpha as an associate at 31 March 2019. Printed p.265 dates the associate entry to 13 December 2018. That record does not support calling the 2019 Alpha position wholly owned or controlling. It does not establish 2026 ownership. Current verification is a distinct acquisition task.

The PAC supplier relationships are attributed to Ministry evidence (Part I para54(iv), printed p.26), not independently reconciled procurement records. Keep the foreign company name as printed until its legal identifier is verified. Do not turn MHA clientele into an unsupported direct payment or a claim that every police procurement comes from the supplier.

## Legal version handling

| Source | Primary locator | Meaning for the research design |
|---|---|---|
| [Vihaan Kumar, 7 February 2025](https://api.sci.gov.in/supremecourt/2024/43293/43293_2024_4_1501_59316_Judgement_07-Feb-2025.pdf) | paras24–33 | Informing a relative is not a substitute for informing the arrestee; the Court reserved underlying merits |
| [Mihir Rajesh Shah, 6 November 2025](https://api.sci.gov.in/supremecourt/2024/56321/56321_2024_9_1502_65444_Judgement_06-Nov-2025.pdf) | paras52–58 in the inspected official PDF | Written-ground schedule, specified exceptional oral-first procedure, prospective operation |
| [Jaskaran Jeet Singh Deol, 21 September 2026](https://www.sci.gov.in/sci-get-pdf/?diary_no=350412026&from=latest_judgements_order&order_date=2026-09-21&type=j) | paras24–25.1,36,38–39 | Judicial re-arrest approval, supervisory endorsement, reassignment/inquiry; compensation under para36 is fact-dependent |

The inspected Jaskaran text cites Mihir paragraph numbers 65/66, whereas the retrieved official November 2025 PDF places corresponding operative text at 55/56. Preserve the document-specific locator; do not silently normalize one version to the other. This is a version-resolution task, not evidence of falsification.

The later primary judgment was retrieved through its public `sci-get-pdf` endpoint after the official `view-pdf` page returned only a loading wrapper. The September 2026 order is the latest primary order inspected for this extension; it is not a certification that no subsequent ruling or larger-bench development exists. No minor/victim identifiers or private device contents are copied into the program.

## Next investigation jobs

1. **Offset reconciliation.** Obtain the two snapshot exports, match contract and claim IDs, retain stage transitions, and request an aggregate reconciliation before estimating failures.
2. **Acceptance and penalties.** Freeze the full matured-obligation cohort, including compliant suppliers. Sample acceptance evidence independently and compare assessment, waiver and recovery separately.
3. **Supplier bridge.** Build an award-date corporate crosswalk and comparable tenders. Test lawful commercial explanations before considering influence hypotheses.
4. **Arrest compliance.** Code both upheld and invalidated arrests, using the rule effective on each arrest date. Missing unpublished orders prevent population-wide estimates.
5. **Surveillance oversight.** Obtain the official current docket and lawfully disclosed technical findings. Keep infection, operator, procurement and legal authorization as separate propositions.

For each job the JSON contains needed evidence, alternatives and disconfirming evidence. A negative finding, resolved error or lawful explanation counts as a research result. An absent record remains an acquisition gap.

## Acquired and missing

All nine source records were opened; eight are primary documents or the issuing institution’s account, with one PRS secondary summary. The LiveLaw Pegasus PDF is a reproduced primary order. No source-family independence is claimed between PAC and PRS.

The original CAG20/2019 audit, full PAC hearing minutes, contract-level acceptance/penalty-recovery records, complete current police/judicial denominators, and the full Pegasus technical report remain missing. Attempts to retrieve the current MoD DAP PDFs/catalogue and an older CAG-hosted DAP copy failed in this pass; no legal claim relies on unread draft provisions. The existing Rafale adverse judicial outcome is retained by the parent corpus; it is not overwritten by portfolio-level offset questions.
