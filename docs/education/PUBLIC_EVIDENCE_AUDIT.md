# Public education evidence audit

Research and retrieval date: **6 October 2026**. This audit distinguishes official reported figures, press reports, and our own comparisons. It does not establish any case of unlawful closure, misuse of money, or closure despite rising local child population.

## Research scope

The public education workstream ran 11 Exa searches requesting 76 result slots: six broad searches × 8, three closure-reporting searches × 6, and two targeted PAB/RTE searches × 5. Result slots are not unique sources. Relevant sections from 23 unique source URLs were fetched; PDF extracts were sometimes capped, so this is not a claim to have read every page of every document. Three original parliamentary PDFs were downloaded and extracted independently with `pypdf`.

The release includes five-year government-school stock series for all 36 states/UTs and all 75 Uttar Pradesh districts, plus India; three-year approved/released central shares for two Uttar Pradesh programmes; and five-year Karnataka private unaided RTE sanctioned/reimbursed figures. The source register is broader than these extracted numeric series. City funding allocations, comprehensive private-school accounts, and local school-age population comparisons are not assembled.

## Original-document checks

| Record | Original URL | Exact location | Download SHA-256 |
| --- | --- | --- | --- |
| State government-school series | [Lok Sabha Q1374, 27 July 2026](https://sansad.in/getFile/lsapps/loksabhaquestions/annex/188/AU1374_a5h0CI.pdf) | Annexure I, PDF page 4 | `181e6dc39011994dd0054c92adb9c40b39aca3571d6ee4f2c4f41067fa7c016e` |
| Uttar Pradesh district series | Same Q1374 | Annexure II, PDF pages 5–6 | Same PDF |
| Uttar Pradesh funding | [Lok Sabha Q2445, 3 August 2026](https://sansad.in/getFile/lsapps/loksabhaquestions/annex/188/AU2445_SjCYU3.pdf) | Answer (e), PDF page 1 | `ce26cb0d55d898008ab020633537135f896892ce5bbe8ab62cc3f89cdbec3c04` |
| Karnataka RTE funding | [Lok Sabha Q1260, 27 July 2026](https://sansad.in/getFile/lsapps/loksabhaquestions/annex/188/AU1260_aW0kcJ.pdf) | PRABANDH table and state response, PDF page 2 | `5fa57b3f8080b2f9774a5ffd3f566da8607aa052496b245c9ea766608f358d83` |

Independent original-PDF comparison found **zero mismatches across 112 school series and 560 numeric observations**. In each of the five years, the 36 state/UT rows sum exactly to India and the 75 district rows sum exactly to Uttar Pradesh. These checks establish transcription and arithmetic consistency, not independent accuracy of each school's submitted data.

Reproduce the table comparison after downloading the original Q1374 PDF above:

```sh
python scripts/education/audit-public-source.py /path/to/AU1374_a5h0CI.pdf
```

The script requires `pypdf` and performs no network access. It compares the independently extracted original table with the generated frontend dataset and fails on a changed/missing value or unreconciled total. Preserve the downloaded PDF hash when refreshing data.

## Funding arithmetic and meaning

Q2445 reports Samagra values in **lakh rupees**. The curated crore values divide those figures by 100. PM SHRI figures in that same answer are already in crore rupees. Six paired records provide 12 monetary observations, not 12 separate funding pools. Approved central share and released central share refer to different stages of the same fiscal envelope; neither is audited school expenditure.

Q1260 separately reports Karnataka **sanctioned** and **reimbursed to schools** amounts in crore rupees. The five pairs are 199.98/199.98, 191.80/191.80, 199.99/199.99, 200.00/85.11 and 156.10/148.68 for FY2021–22 through FY2025–26. The answer explicitly says the state reports timely reimbursement. The arithmetic difference does not establish an overdue obligation. State totals include Bengaluru but are not Bengaluru city allocations. This RTE channel sits within Samagra support and must not be added to central Samagra releases as an independent pool of money.

[RTE section 12](https://dsel.education.gov.in/sites/default/files/rte/RTE_Ac_%202009_amendments.pdf) establishes a conditional reimbursement mechanism for eligible private unaided schools; it is not an unrestricted grant to every private school. The reviewed consolidated copy is marked updated 26 July 2021. State rules, statutory applicability and pre-existing free-education obligations must be checked before evaluating an individual school's entitlement.

## Counterclaims and falsification

| Investigation | Observation that survives | Counterevidence / innocent explanation | Evidence required to strengthen or reject the lead |
| --- | --- | --- | --- |
| Ghaziabad and Jhansi | District government-school stocks declined in the official series | Mergers, recoding, management changes or boundary changes can change the count | School-code continuity, closure/merger orders, receiving-school seats and same-boundary child population |
| Meghalaya and Telangana | Sharp one-year reductions in reported government-school stock | Management reclassification or reporting changes could explain much of the step | Cross-management reconciliation and original school-level status records |
| Uttar Pradesh pairing | [31 July 2025 reporting](https://www.newindianexpress.com/india/2025/Jul/31/no-merger-for-schools-with-50-or-more-students-as-uttar-pradesh-government-revises-plan) describes policy clarification and parental concerns | Minister says UDISE codes remain, difficult routes are exempt, staff posts are retained, and original classes may resume | Pairing/restoration orders, physical class locations and travel/attendance outcomes |
| Sitapur litigation | [21 August 2025 court reporting](https://www.hindustantimes.com/cities/lucknow-news/up-govt-tells-hc-no-merger-if-school-has-over-50-students-1-km-distance-101755794177822.html) describes an interim status quo | Interim district order was reported not to affect the overall state policy | Latest appellate orders; do not label the historical stay as operative today |
| Honganuru KPS pilot | [The Hindu](https://www.thehindu.com/news/national/karnataka/karnataka-rolls-out-project-to-merge-govt-schools-with-kps-magnet-schools/article70270577.ece) reports a seven-school pilot and quoted transport instructions | [Later reporting](https://www.thehindu.com/news/national/karnataka/government-urged-to-withdraw-order-allowing-merger-of-low-enrolment-schools/article70372549.ece) quotes the minister saying no government schools will be shut | Original BEO circular, transfers, transport delivery and capacity; distinguish a school code from teaching premises |
| Himachal rationalisation | [The Tribune](https://www.tribuneindia.com/news/himachal/100-schools-with-zero-enrolment-denotified-120-merged/) reports 100 denotifications and 120 mergers | Official rationale reported is zero/very low enrolment; difficult-terrain and tribal-area schools were exempted | Original notifications, receiving-school access and attendance; keep the two types of administrative action separate |

These are reported events or analytic questions. The alleged causal conclusion “schools closed where the local school-age population increased” remains **not established** for every loaded record. Total population growth is not the relevant denominator. National population projections allow rising total population alongside falling ages 5–14. A district name that matches a city does not make a district statistic a municipal-city statistic.

## Retrieval and version limitations

- The [state/UT PAB index](https://dsel.education.gov.in/en/pab-minutes) was retrieved through Exa and exposes minutes, supplementary approvals, revisions and addenda. It is the discovery route for expanding state funding coverage, not proof that all those documents have been extracted.
- The Chhattisgarh `CG2526.pdf` indexed extract was readable through Exa, but direct origin retrieval returned **HTTP 404**. Retain that access limitation. Its section headed “Actual Release” says the central share is “to be released”; this is a plan, not an actual-disbursement observation.
- The original Allahabad High Court URL supplied an indexed text extract; direct download returned **HTTP 429** and was not repeatedly retried. Only the reviewed early judgment text is used for the challenged-order identity. Subsequent appeal status is separately attributed to reporting.
- The population projection report circulated in multiple mirrored copies with differing summary totals. Numerical population claims were omitted from this release pending edition reconciliation. The demographic distinction between total and child population is supported by the reviewed official report.
- UDISE student-level collection beginning in 2022–23 limits comparison with earlier school-aggregate reporting for several indicators. A stock series that reconciles arithmetically can still contain legitimate definitional changes.
- AISHE 2023–24 was released on 8 July 2026. Registered colleges, responding colleges, and estimated enrolment have different denominators. The percentages 17.1% government, 12.9% private aided and 70.0% private unaided refer to **responding colleges** and do not measure funding shares.

No private person is accused, no missing retrieval is interpreted as zero funding, and no accusation follows from a count difference or funding-stage gap.

## Round-two curated-data review

The independent review checked the assembled 38-source register after the news and RTE additions. News and court reporting are labelled reported, while the original judgment is labelled primary with its limited extraction and retrieval status. Karnataka and Himachal reports are scoped to their relevant states/districts. The three reported case leads preserve government responses and explicit ways to reject or resolve the concern. RTE monetary observations remain state-level and keep reimbursement separate from approval. No loaded record asserts verified local population growth or converts a stock difference into a closure-event count.

Two presentation follow-ups were sent to the implementation team: expose retrieval status and exact document locators in source details/exports, and clean spacing in several source descriptions. These do not change the validated figures.
