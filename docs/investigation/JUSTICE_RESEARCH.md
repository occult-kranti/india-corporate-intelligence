# Justice and institutional accountability research

Snapshot: **6 October 2026 UTC**. The recent window is **6 October 2021–6 October 2026**. The 18 August 2020 PM CARES judgment is explicitly historical background. Transaction periods, judgment dates, retrieval dates and later procedural status are separate.

The retained investigation slice contains **12 primary sources, 43 resolved entities, 50 documented relationships, 12 records and one project locality**. Eight relationships identify judicial authorship; none links a judge to a donor, political party or alleged corrupt transaction. All five named judges are identified by court, original judgment and decision date. The figures describe this curated slice, not nationwide coverage or all available litigation.

## Panel round 1: what the existing corpus can and cannot establish

The review read `research/raw/energy/enforce.json`, `research/raw/pmcares.json`, the finance literature/reconciliation/contract records and the local evidence-tiering, source-retrieval and pattern-discipline skills. The Exa Search plugin supported discovery, followed by direct downloads from courts, SEBI and Parliament.

- The enforcement file already held 42 entities and 46 claims, but its sources included regulator orders, press accounts, investigation status and later dispositions. A generic enforcement edge cannot convey whether an allegation was proved, a case was closed or an appeal concerns an interim issue.
- The PM CARES corpus distinguished trust constitution, financial statements, announced allocations and RTI disputes. Its Delhi High Court record-retrieval gap could not be treated as a merits outcome. The Supreme Court's 2020 fund-transfer ruling answers a different question from a blanket determination of later transparency or expenditure compliance.
- The finance corpus's Kerala litigation concerns interim relief and a constitutional reference. A refusal of interim relief is not a final determination of the original suit, nor proof of financial wrongdoing.
- Existing SEBI coverage listed the Milestone/Rehvar final order as not opened. The present pass downloaded the issuing regulator's original and closed that particular source gap. The specific disposition must accompany historical allegations.

The panel recommendation was to model the **institutional action, legal stage, exact docket/order, decision date, jurisdiction and response**. Complaint, inquiry, investigation, show-cause notice, criminal charge, interim relief, trial judgment, appeal, settlement, discharge, acquittal and closure are distinct. No inferred guilt score is appropriate. A primary document can reliably establish that an allegation was made without proving the allegation itself.

## Primary records retained

| Record | Date and locator | Established outcome and limits |
|---|---|---|
| Electoral-bonds constitutional judgment, 2024 INSC 113 | 15 February 2024; lead opinion paras 216–221, original PDF pp.149–152; Khanna concurrence begins p.159 | Scheme and specified amendments invalidated; disclosure directed. Individual donor/contractor culpability not adjudicated. |
| SBI disclosure extension, 2024 INSC 195 | 11 March 2024; paras 8–17, pp.5–10 | Extension to 30 June refused; 12/15 March deadlines directed. Contempt jurisdiction not exercised at that stage. |
| Common Cause electoral-bonds SIT petitions | 2 August 2024; paras 8–22, pp.5–8 | Omnibus Article 32 intervention declined while ordinary remedies remained available. Temporal proximity was an assumption needing evidence, not a proved quid pro quo. |
| Vishal Tiwari, 2024 INSC 3 | 3 January 2024; paras 30–38 and 67–71 | Investigation-transfer threshold not met; SEBI directed to complete remaining matters. Court expressly did not interfere with investigation outcomes. |
| SEBI Adicorp final order, 31671/2025–26 | 18 September 2025; paras 88–90, pp.60–63 | Specified SCN allegations not established; proceedings disposed without directions. Historical related-party rules and the prospective amendment matter. Not a criminal acquittal or group-wide clearance. |
| SEBI Milestone/Rehvar final order, 31672/2025–26 | 18 September 2025; paras 54–61, pp.39–44 | Same limited regulatory disposition for this separate set of transactions/noticees. Repayment and absence of independent fraud evidence are recorded as the order's reasoning. |
| PM CARES / NDRF, W.P.(C) 546/2020 | 18 August 2020; paras 57–59 and 67–75 | Compulsory transfer refused; fund/audit regimes distinguished. Historical ruling is not an audit of each expenditure or a decision on all RTI issues. |
| Sita Soren, 2024 INSC 161 | 4 March 2024; paras 188–190, pp.131–135 | Seven-judge bench rejects legislative immunity for bribery prosecution. A constitutional answer does not convict the appellant. |
| Kerala borrowing, 2024 INSC 253 | 1 April 2024; paras 5–10 and 37–40 | Interim injunction refused; constitutional issues referred. Paragraph 39 expressly reserves the suit's final outcome. |
| Kejriwal arrest review, 2024 INSC 512 | 12 July 2024; paras 76–88, pp.59–64 | Interim bail and larger-bench reference concerning necessity of arrest. Paragraph 88 reserves criminal merits. Separate CBI proceedings and present custody/trial status are not inferred. |
| Lok Sabha unstarred Q.2191 | 31 July 2026; answer (a)–(c), pp.1–2 | Ministry identifies CAG-linked CBI RC33/2022 and closure-report filing on 31 March 2025. No court acceptance or acquittal is established; one agency's identified case is not all India audit follow-up. |
| Delhi HC W.P.(C) 4353/2025, SWAMIH/Gayatri Aura | 12 March 2026; paras 1–2 and 5–8 | Information petition declined on forum grounds, with liberty to approach the jurisdictional High Court. All rights/contentions remain open. No funding amount, misuse or final RTI merits finding. |

Full primary URLs, source-level limitations and issuing authorities are in `research/raw/investigation/justice-research.json`. The eight authorship links concern five judges: Dhananjaya Y. Chandrachud, Sanjiv Khanna, Ashok Bhushan, Surya Kant and Purushaindra Kumar Kaurav. Khanna's separate electoral-bonds reasoning is identified as a concurrence rather than attributed to the lead opinion.

## Panel round 2: challenge the proposed graph

This is a documented AI-agent research contribution to the project panel, not a claim that human judges, lawyers or oversight officials reviewed or endorsed the product.

1. **Separate a claimant from the decision-maker.** Common Cause/ADR petition edges record participation. The judgment node carries what the court held. No petitioner allegation is relabelled as the court's finding.
2. **Keep an adverse disposition with the allegation history.** Both SEBI orders expressly find the specified allegations unestablished. Their company edges use `regulatory-disposition` and display that result. The orders are not left as apparently active accusations, and they are not expanded into a blanket exoneration of unrelated matters.
3. **Do not backdate law.** The SEBI orders discuss the earlier related-party definition and prospective 2021 amendment. A newer definition cannot mechanically determine breach in an older transaction.
4. **Do not turn a procedural result into a merits verdict.** The SWAMIH forum dismissal leaves rights/contentions open; the Kejriwal judgment expressly reserves merits; Kerala's interim ruling reserves the final suit; the Sita Soren reference answers immunity. These receive distinct status text.
5. **Distinguish filing from acceptance.** The 2026 parliamentary reply says a CBI closure report was filed. The investigation edge uses the actual 12 July 2022 registration date; the status observation is dated to the 31 July 2026 answer. A court's acceptance, objections or further-investigation order remains a research gap.
6. **Constrain geography to the evidence.** Gayatri Aura is in Greater Noida West, Uttar Pradesh. Delhi is the judicial forum; Mumbai appears in the information office's caption. They are not three project locations. Kerala, Jharkhand and Delhi associations describe the underlying cases, not local corruption prevalence. National court decisions are not geocoded as Delhi projects.
7. **Constrain identities.** The named SWAMIH CPIO is not merged with SBI, the fund or SBICAP Ventures. Companies are identified as the exact named noticees; no parent/subsidiary or external same-name merge is made. Judge identity is tied to authored decisions, and no continuing tenure is inferred from a point observation.
8. **Avoid amount aggregation.** The slice intentionally contains no financial amount totals. Borrowing ceilings, requested interim borrowing, bond denominations, bail bonds, transaction loans and purported losses are incompatible accounting stages. The sources remain available for a later structured ledger with those stages preserved.

## Search, preservation and verification

Discovery used **18 Exa searches requesting 90 result slots** across overlapping passes. Those are requested search candidates, including duplicates and rejected results, not 90 independently read documents. Direct issuing-authority PDFs were subsequently downloaded and the cited operative passages, parties, signatures and response sections read.

All twelve retained sources have original-byte SHA-256 hashes and one-based PDF page maps in `evidence/investigation/justice/archive-index.json`. The archive stores labelled derived PDF excerpts and text extracts. A separate cover-identity receipt retains exact SEBI noticee names with personal tax identifiers omitted. It is labelled as a redacted derivation, not an unaltered original cover. The full original URLs and hashes permit a future verifier to re-fetch the complete records.

Reference checks cover unique IDs, every source/entity/relationship/record reference, explicit geography, resolved identity bases and dates. An authorship review checked the original judgment headings and signatures. No alleged-tier relationships are published in this slice. Interpretation limits and case responses remain record fields rather than hidden methodological footnotes.

The Delhi HC SWAMIH binary initially returned an incomplete HTTP read; a direct retry retrieved a parseable four-page original. The retained judgment date is 12 March 2026, not a web retrieval date. The incidental PM CARES listing order carries a server download stamp in Indian local time, while this research uses UTC retrieval dates; neither is mistaken for the order's 9 April 2024 date.

## Gaps and next steps

- **Lokpal:** press discovery surfaced the 28 May 2025 Buch complaint dismissal, but the primary order was not retrieved. The indexed official order directory returned entries only through April 2025 in this pass, and direct directory access returned HTTP 503. No press summary was promoted as a new primary finding or a new judge relationship.
- **CVC:** the official site returned HTTP 503; annual-report statistics surfaced through secondary sources. No complaint, prosecution-sanction or conviction number was imported without the underlying official table and its denominator.
- **PM CARES RTI:** an original Delhi HC 9 April 2024 two-page listing order was inspected. It only lists the matter for 23 August 2024, so it does not close the merits/status gap. It is not counted among the twelve substantive retained sources.
- **Later proceedings:** retrieve the later Kerala constitutional-bench docket, the Kejriwal larger-bench and trial/appeal records, and any appeals from the specific SEBI orders before claiming their present comprehensive legal status. The current slice deliberately records dated outcomes rather than saying a 2024 procedural stage remains the latest.
- **CAG/CBI:** obtain the actual closure report and the court's ensuing order for RC33/2022. Add full CAG report/ATN/PAC chains with matched report and paragraph identifiers, rather than extrapolating from the parliamentary reply.
- **SWAMIH:** retrieve the underlying CIC decision, a subsequent jurisdictional-court filing/order and an authenticated disclosure response. Only then add actual fund sanction/disbursement and delivery records for the named project.
