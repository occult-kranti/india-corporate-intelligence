# Round two: welfare specialist challenges police/border stream

Review date: 8 October 2026, America/New_York; source-reading UTC timestamps remain in receipts. This is an AI cross-review of evidence handling, not independent human testimony.

Reviewed `research/funding-investigations/streams/police-border.json`, SHA-256 **cd1a9d84d5838f607788c94f378df87b9f3c44d9d25ae7334601a1a7ac13dec1**. The author may subsequently revise this file; the fingerprint identifies exactly which draft was challenged. All 13 registered capture hashes matched local files at review time.

## Required corrections

1. **Separate two legal entities.** `entity:lettrf` was labelled “LeT / TRF as charged organisational entity” and claimed exact institutional identity. The independently re-fetched [6 July 2026 Hindu report](https://www.thehindu.com/news/national/nia-names-let-founder-hafiz-saeed-as-accused-in-pahalgam-terror-attack/article71188788.ece) says LeT and TRF were charged as “legal entities.” That is plural, not evidence of a single legal entity. Split the nodes and preserve the proxy/relationship description as an attributed allegation, or explicitly label a composite display group without an exact-identity claim. Splitting is preferable for future entity joins. Neither entity should inherit a Government of Pakistan funding edge.
2. **Identify the announcement source accurately.** `edge:delhi-feb` originates at Delhi Police, but the retained original PIB paragraph explicitly attributes the announcement to the Union Home Minister. Use MHA as the announcement-source node, or a relation that makes the police/project association distinct from who made the statement. The case already includes MHA, so this should not require widening geography or inventing an entity.

## Direct checks and retained uncertainty

| Question | Source checks performed | Assessment |
| --- | --- | --- |
| Delhi Safe City metrics | Reread original PIB HTML, stripped markup; extracted original MHA UQ1999 PDF. Annexure PDF page 6 gives 6,709 fixed/PTZ and 1,265 ANPR installed, plus 5,852 existing cameras integrated against a 15,000 target. PIB says over 15,000 existing cameras integrated, separately from 2,100 new cameras live. | The unresolved discrepancy is supported. Different populations, configured connections, accepted live feeds and reporting lags remain possible. The 7,974 installed sum is arithmetic over two stated new-camera categories, not a comparison with the 5,852 existing-camera figure. No money loss should be calculated from either gap. |
| CISF land | Read retained indexed CAG §2.10, including March 2016 payment, November 2016 handover, February 2020 construction sanction, 2022 litigation discovery and May 2025 alternate-land process. | ₹6.53 crore is the paid land leg to MoHUA. ₹261.24 crore is a separate approval; no payment proved. Proposed adjustment is not actual recovery. CISF’s non-disclosure defence and CAG’s due-diligence rebuttal are correctly retained. |
| Pahalgam legal stage | Read NIA register capture and independently fetched full [5 May Daily Excelsior story](https://www.dailyexcelsior.com/nia-court-frames-charges-against-let-trf-handler-harbourers/) and 6 July Hindu story. | The articles support a reported charge-framing stage and agency allegations, not conviction. The Daily Excelsior report distinguishes the local defendants from actual execution and attributes the ₹3,000 cash assertion to prosecution. No upstream bank/source-of-funds evidence is supplied. |

The CISF text says land was handed over on an **“as is where is basis”** in November 2016, yet the audit also characterises the later outcome as non-possession. Add that distinction to the user-facing timeline: formal handover occurred, whereas unencumbered usable possession remained disputed. This clarifies the administrative mechanism without turning a missing record into proof of intentional misconduct. It also prevents the misleading shorthand that nothing at all was handed over after payment.

The Pahalgam `claim:pahalgam-roles` is worded as a statement about a newspaper report. Its documented status must apply only to **the existence/content of that report**; the alleged defendants’ conduct and the trial merits remain alleged/unresolved. The graph’s court edge should keep “reported charge framing” in the label and retain secondary-only limits. If the UI cannot make that distinction conspicuous, downgrade the edge/claim to unresolved pending the certified order. No actual charge sheet, signed charge-framing order, forensic exhibits, cross-examination or final judgment was available for this review.

## Rejected joins endorsed

- A budget rise, procurement benefit or security failure does not establish that an attack was staged or government-funded.
- A reported ₹3,000 attacker-to-local-person cash payment does not identify its upstream funder, and no new cash edge should be created without a traceable source.
- Mumbai CCTV Phase III and Safe City cannot be treated as duplicate payment for identical assets without a bill-of-quantities, asset-ID, scope and funding crosswalk.
- A ₹261.24 crore construction sanction cannot be added to ₹6.53 crore paid to label both as cash lost.

## Discriminating next records

Safe City: dated metric definitions, asset/configuration/acceptance crosswalks and milestone certificates. CISF: formal handover note, non-encumbrance and Board-assessment files, alternate-land allotment, adjustment voucher and actual possession evidence. Pahalgam: certified charge-framing order, original/supplementary filings, defence merits submissions and later docket. These are evidence-acquisition questions; there is no need to publish operational deployments, site vulnerabilities, private residences or tactical routes.

Findings were sent to the police/border author and project lead. The author owns corrections; this reviewer did not edit another stream’s data or captures.

## Author response and closure

The author accepted the three changes. Re-read corrected JSON SHA-256 **946e17aaef34fdbcfaab1c8f0c821d08849292b7a723a02cf85a6b03ecf20d44**: MHA is the February announcement origin; LeT and TRF have separate source-scoped nodes and attributed edges; the CISF timeline explicitly distinguishes formal November 2016 handover from unobstructed usable possession. These corrections are verified. The lack of original Pahalgam filings, the secondary-only court account and unknown cash origin remain unresolved evidence limits, not closed findings of guilt.

## Final graph integration recheck

Re-inspected final police JSON SHA-256 **be768e6a9feae8e6c133b2e905f423a89b36fd03d3b7c91b5163dc426267eb88** after the author added explicit graph-eligibility flags and corrected Telangana's state code to `TS`. All 34 resolved identities are qualified as source-scoped named institutions, persons, organisations, counterparties or display categories. The budget/programme categories expressly do not claim separate legal identity or a recipient bank account; company rows expressly leave CIN and beneficial ownership unverified. The LeT and TRF labels remain separate and their NIA relationships remain attributed allegations. The named-person flag resolves the reporting label only, not conduct or guilt. All retained source-capture hashes still match. The integration annotations do not close the evidentiary gaps or admit previously rejected attack-funding joins.
