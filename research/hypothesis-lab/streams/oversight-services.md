# Oversight and services: research log

Review cutoff: **14 October 2026**. Primary political scope is **26 May 2014–14 October 2026**. Earlier accumulated grant balances are explicitly identified; the earliest reported UC balance is FY1985–86. A publication, event, accounting snapshot and access date are separate fields.

This stream supplies three selected, falsifiable institutional hypotheses. It does not announce newly discovered crimes. Some underlying audit material was already present as a pointer or summary in the wider repository; the originals named below were newly acquired and the specified passages re-read for this release. The new work is the structured scrutiny test, competing explanations, decision reconstruction and separation of documented versus proposed relations.

## Acquisition and scope

The first three Exa searches each requested six results and all failed with HTTP 402 (credit limit exceeded). **No Exa source was obtained.** The research lead was notified; the user’s authorization to use other public resources supported explicit alternate web search and direct primary retrieval. Failed searches remain in `searchLog`. The 18 requested result slots are not 18 inspected sources. Alternate search has no requested-results parameter, so its logged value is zero, not an absence of search results.

Eight source entries support the cases:

| Source | Actual inspection | Retained material |
| --- | --- | --- |
| CAG Bharatmala Report 19/2023 | Printed pp.27–34 and 77–82; scope/preface/executive-summary checks | Full acquired PDF and extracted text; only selected sections read |
| PIB Package 4 award, 13 March 2018 | Both substantive release paragraphs | Acquired official HTML and derived text |
| PMO Dwarka opening, 17 August 2025 | Relevant opening paragraphs and background section | Acquired official HTML and derived text; other speech assertions not adopted |
| CAG Union Accounts Report 6/2026 | Printed pp.64–65, Annexure 4.12 p.128, signature, tabling-date landing | Full acquired PDF and extracted text; only selected sections read |
| Supreme Court order, 27 October 2021 | Paras 12–18, 38–55, 59–64 | Official API PDF and derived text |
| Union limited affidavit, 16 August 2021 | All six pages including Annexure R-1 | Original party document mirrored by Supreme Court Observer, PDF and derived text |
| Indian Express, 25 August 2022 hearing | Hearing findings, Union response and confidentiality qualifications | Research note with a 19-word exact excerpt, not the full article or sealed report |
| Supreme Court Observer, 29 April 2025 hearing | Report-access dispute, security objection and device-specific route | Research note with an 18-word exact excerpt, not a signed 2025 order |

Every source entry includes an exact capture SHA-256 and repository-relative capture path. A digest proves byte identity only. The two hearing-note digests authenticate the notes, **not** the full webpages or original sealed report. `raw/oversight-services/acquisition.json` records attempted direct URLs, successful original captures and HTTP failures. The old `cag.gov.in` PDF URLs now returned 404. Official CAG detail pages link to `d7i5wg8xwe4hf.cloudfront.net`; those linked originals were obtained. The Bharatmala landing was inspected through the web tool, while a direct shell request to it returned 403; this is disclosed rather than represented as a successful local HTML capture. The Union Accounts landing was captured locally. A PIB February 2024 programme page was acquired during discovery but is not used as a case source.

## Round 1: proposed theme

The oversight specialist proposed that accountability gaps can make claims difficult to test without themselves proving coordinated wrongdoing. Three institutional settings offer distinct tests: project approvals, repeated grant releases and surveillance disclosure. UIDAI audit work was initially considered, then left queued in favour of a current, well-documented grant-certification case. No UIDAI finding was inferred from a search result.

### 1. Bharatmala appraisal

The stronger finding is about **who reviewed which commitment and when**, rather than a sensational unit-cost ratio. The acquired audit records non-separated execution/appraisal/approval roles and an undefined project-versus-package distinction. It contrasts internal NHAI EPC approvals with other agencies and identifies a HAM aggregation issue.

The dataset explicitly preserves four restraints:

- The ₹250.77 crore/km Dwarka sanctioned civil cost and ₹18.20 crore/km programme-category norm are not a same-scope loss calculation.
- The HAM ₹2,000 crore approval threshold is not automatically the rule for Dwarka EPC approvals.
- MoRTH’s reasons about traffic segregation, safety and EPC-contractor design duties remain visible, alongside CAG’s rejoinder about alternatives and the December 2017 SOP.
- Later government opening announcements are evidence against a simple non-delivery story; they do not independently settle value for money.

The observed graph retains the Package 4 award to Larsen and Toubro Ltd. It contains no illicit-benefit edge. The optional question link asks whether any appraisal departure specifically advantaged that awardee, with the bid evaluation and contemporaneous records required to answer it. The same-scope design and payment join remains absent.

### 2. Grant utilisation certificates

The FY2025 CAG table is an **outstanding certification stock**. It is not a private-beneficiary ledger or a quantified loss. A meaningful misconduct test needs a grant-ID join from a required prior certificate to the next recurring release, and then checks for applicable lawful authority or exceptions. This join has not been obtained.

The original annexure materially narrows careless comparisons: AYUSH uses 16 September 2025, although the table heading says 31 March 2025; Agriculture and AYUSH do not furnish separate recent-cohort subtotals. Fifteen reporting ministries are not a census of all ministries. The most recent separately reported cohort is FY2021–22 to FY2023–24, whereas older balances extend back decades. Rule 238 is applied here to the post-2017 cohort only. Earlier grants need their own rules and sanction terms.

The graph uses nonfinancial audit-observation edges with null monetary amounts. Ministry-level certificate values remain in labels as context. The unidentified grantee population is explicitly unresolved; no NGO, university, contractor or state is silently assigned the amount. Education’s IT-monitoring response, other ministries’ follow-up and CAG’s PFMS recommendation are retained.

### 3. Pegasus oversight

The original Court order establishes an inquiry, insufficient specificity in the Union’s response and the need to justify confidentiality. It does **not** establish the identity of a domestic operator. The acquired original Union affidavit denies allegations and describes interception safeguards. The 2022 hearing account reports both inconclusive device results and a non-cooperation observation; neither is dropped to make a preferred story easier.

The report described five possible malware/poor-cyber-hygiene cases among 29 examined phones, not five proven Pegasus infections. The sealed report itself was not inspected. The April 2025 hearing account describes a disclosure debate and possible individual answers, not a final holding on operator identity, legality or procurement. Searches through the review cutoff did not produce a later signed disposition. That search failure is not evidence that no later proceeding exists.

One proposed link asks about a verified Union–NSO acquisition/operator connection. It remains explicitly unproved, with no financial amount. MeitY’s affidavit role does not identify it as an operator. Search results about Pegasus Holdings III and Pegasus Assets Reconstruction were excluded as unrelated name collisions.

## Decision and test method

Actors describe formal authority and plausible institutional incentives, including lawful delivery and confidentiality goals. Options identify records expected under different choices; they do not instruct anyone how to commit or hide corruption. No private motives, payoffs, equilibrium, guilt probability or forecast calibration are inferred. Each case has three competing explanations, at least two discriminating tests, a dated chronology, a matched-comparison requirement and a future review date.

All tests are retrospective propositions formed after reviewing outcomes. Future review on 14 January 2027 is a research checkpoint, not a claimed prediction. New evidence must be matched on identity, date, legal authority, financial stage and source family before an assessment changes.

## Self-check and handoff

The per-stream validator `validateStream()` returned **zero structural/provenance errors** after writing this draft. Counts: **3 cases, 8 sources, 22 entities, 18 observed edges, 9 rejected joins, 6 coverage rows**. Source hashes and all nested references resolved. This is not independent fact verification. Round 2 specialist challenge was requested after draft completion; findings and responses should be recorded by the research lead in the overall panel log.

Remaining gaps are concrete: NHAI decision files and payment reconciliation; recipient-level UC/release data and common-cutoff denominators; current certified Pegasus orders, legally released report material and operator attribution. Police, defence, UIDAI and state-level health/school systems are not exhaustively investigated by these three cases.

### Round 2 correction applied

The independent methods reviewer checked the original audit and Court paragraphs. They identified that the first road test incorrectly used post-award/commitment wording even though CAG's cited counts concern **tender notices**, not award dates. The test now asks about pre-tender appraisal/approval and explicitly states that award/commitment dates remain unjoined. A chronology phrase implying the whole January–March 2018 approval cohort was complete before 13 March was also removed. These corrections narrow the inference without removing the documented scrutiny issue.
