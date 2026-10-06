# State, security and recruitment research

Snapshot: **6 October 2026**. Recent publication window: **6 October 2021–6 October 2026**, inclusive. Observation periods and legal effective dates remain separate.

This workstream supplies **17 sources, 21 explicitly resolved public entities, 17 documented relationships, six attributed case dossiers, eight legal/policy records and three named localities** in `research/raw/public-works/state-research.json`. Sixteen sources are primary records; the examination-rules transcription is explicitly **reported**, because the original Gazette binary was not retrieved. Seven source publication days remain unknown and are not manufactured from a report title, budget year or consolidation date.

The search used the Exa plugin: 32 successful search calls requested 195 result slots across overlapping passes. That means search candidates including duplicates and rejected hits, **not 195 independently verified sources**. Selected documents were then fetched and read in full or at the cited paragraphs. Original PDFs and extraction receipts are inventoried in `evidence/state/sha256-manifest.json`.

## Panel round 1: define the comparison correctly

The state/security researcher reviewed the existing `research/raw/force`, CPPP security slice and `src/pages/Security.tsx` before expanding research. The team-lead panel received these constraints:

- The existing security route is a scaffold over substantial research; a new cross-sector desk must link to it without implying it already renders the full series.
- Existing CPPP security aggregates are a historical, incomplete open-market slice. They exclude capital acquisition through the defence procedure, GeM and most state-police portals. MES works comprise 74.41% of its 411,943 award decisions. A pooled rate is dominated by that buyer class.
- Pay, pensions, allocation, loan, signed award, payment, delivered asset and recruitment appointment are different stages. Union police budgets do not equal all state police spending.
- Repeated supplier names, similar work titles and ministerial presence are context. A repeat-work finding needs an asset identifier, scope/BoQ, measurement book, bill, payment and maintenance/defect-liability chronology.
- Public political-role records can enter the graph with office/date identity. Name-only politician/director/contractor joins cannot.

No model-generated network motif is published as a wrongdoing finding, and no operational military or police vulnerabilities are mapped.

## Panel round 2: changes made after reading the evidence

1. **Legal version correction.** IndiaCode's Public Examinations Act PDF is consolidated as on 31 July 2026. It records Act 10 of 2026 amendments effective that day. The new source and separate rule capture the changed penalties/service-provider debarment and sections 12A/12B. A 2024 explainer would otherwise be stale at this snapshot.
2. **Draft versus operative rule.** PIB's 10 February 2026 DAP record is a consultation draft; its effective date remains null. DPM 2025 is revenue procurement, effective 1 November 2025 with an RFP/reissue-based transition. DAP capital acquisitions must not be tested against DPM revenue rules.
3. **Individual culpability correction.** Supreme Court 2025 INSC 437 explicitly distinguishes specifically tainted from not-specifically-tainted recruits and preserves independent criminal proceedings in paragraph 50. The graph records selection-process review and service-provider identity, not guilt of all affected recruits.
4. **Budget denominator correction.** Hyderabad Safe City had ₹1 crore original plus ₹176 crore supplementary provision: ₹177 crore total. The reply that funds were revalidated is shown with CAG's counterpoint, and later payment reconciliation remains missing.
5. **Rule exceptions retained.** Rule 149's ₹50,000/₹10 lakh thresholds have competition/rate conditions and an automobiles exception. Outside-GeM purchases and scientific-body exceptions are separate. Below-threshold purchases cannot be flagged mechanically.
6. **Response gaps visible.** The CAG Army press release is primary but does not reproduce ministry responses. The accommodation and warehouse dossiers state this gap. Planned November 2024 warehouse completion is not represented as actual completion.
7. **Identity joins restricted.** Ministries, the listed Larsen & Toubro Limited counterparty and Defence Minister Rajnath Singh may be merged only against the corresponding exact public identities in other workstreams. Nysa stays a court-record identity without an external CIN-backed company join.
8. **Exact locality discipline.** Hyderabad city, Chennai city and Kamgaon locality in Bargarh are sourced geography. Publication in New Delhi does not create a Delhi work-site. The state-wide West Bengal selection case is not arbitrarily assigned to Kolkata.

These are an AI researcher's contributions to the team panel, not advice or endorsement from human public officials.

## Dossiers and practical limits

| Dossier | Primary record and locator | What is established | Response or limitation |
|---|---|---|---|
| Telangana police vehicle loan | CAG State Finances Report 2/2023, Box 2.4, para 2.7.2 | ₹500 crore borrowing; ₹328 crore budget-funded repayment through March 2022; CAG-estimated ₹13 crore incremental interest | Corporation confirmed borrowing for Government; later repayment reconciliation not retrieved. Loan and interest are not additive loss measures. |
| Hyderabad Safe City | Same report, para 3.5.3.1(ii) | ₹177 crore total provision and ₹12 crore expenditure in FY2021-22 | Commissioner cited revalidation/release; CAG questioned the next-year original provision. Later actual payments remain unverified. |
| MoD hired offices | CAG Report 11/2024 press release, item 2 | 42% of 45,278.31 square feet used by March 2023; audit-attributed ₹44.26 crore wasteful rent/renovation | Original hiring had safety reasons. Full ministry reply not retrieved. |
| Chennai warehouse | Same release, item 5 | 441 weeks against a 48-week pre-sanction norm; ₹17.43 crore rent paid October 2018–December 2022 | Processing, sanction and fund-release delays distinguished. Scheduled completion is not verified completion. |
| Odisha procurement preference | CAG Odisha Report 1/2025, para 2.7.2, printed p.16 | One tested five-bid tender awarded at ₹3.32 lakh instead of the applicable ₹3.04 lakh; ₹0.28 lakh extra obligation | Department said configuration existed; audit said full rule mapping was still absent. No prevalence or bidder-community inference. |
| West Bengal school selection | Supreme Court 2025 INSC 437, paras 20–27 and 45–52 | Dated civil judgment on selection validity, outsourcing and record preservation | Relief distinguishes candidates. Later implementation orders are not exhaustively tracked; criminal liability remains separate. |

The five MoD contract records signed on 1 March 2024 total **₹39,125.39 crore** across three named counterparties. Two awards each to L&T and BrahMos cover different named scopes. Those records demonstrate why repeated vendor counts alone cannot establish repeated physical work. The Minister's presence establishes a public-role connection only.

## Source preservation and verification

- Four full original PDFs retained: Supreme Court judgment and Union Budget Demands 20, 21 and 51.
- GFR was downloaded as an original PDF; an explicitly labelled five-page excerpt is retained with the complete original's SHA-256 and page mapping in the evidence README.
- Selected primary text receipts retain Telangana, Odisha and CAG Army audit passages, IndiaCode legal version, official policy/contract announcements and MHA priority announcement.
- The Rules 2024 receipt is a secondary transcription and is labelled accordingly.
- Direct CAG downloads returned HTTP 503 in this pass; Exa supplied readable indexed primary text. Unrelated or obsolete search hits were rejected. A mistakenly surfaced 4 April 2025 Supreme Court judgment concerned a different teacher-qualification case and was **not included**.
- Local checks cover all IDs, source references, resolved identities, dates, arithmetic and evidence-file hashes. The central assembler validates cross-workstream integration separately.

## Follow-up research roadmap

1. Obtain full Army audit paragraphs and action-taken notes, occupancy/rent ledgers, completion certificates and later CAG/PAC dispositions.
2. Reconcile Safe City revalidation orders, supplementary appropriations and actual bills; retain dates and funding stages.
3. Retrieve the original examination Rules Gazette and latest implementation notifications; continue tracking later Supreme Court orders without overwriting the dated judgment.
4. Acquire site/asset-level procurement and payment records for the same geography, period and work scope. Publish a reproducible matched cohort before any repeat-work or concentration inference.
5. Expand state/local police and administration records through their own portals. No nationwide-complete or district-complete coverage claim follows from this curated release.

## Independent connections review in panel round 2

The state/security researcher separately reviewed the connections workstream's raw records, preserved primary excerpts and assembled graph on 6 October 2026. This is a second AI-agent review within the project panel, not an external audit or a panel of human specialists.

- **Archive integrity:** all 11 entries in `evidence/public-works-connections/sha256-manifest.json` matched their retained files. The review read the original IRB, MRM, IRBMP and NHAI PDF excerpts and the retained Prime Minister's Office roster HTML/text, rather than relying only on graph summaries. Excerpt page maps preserve their locations within the original reports.
- **Disclosure perimeter:** IRB's consolidated Note 46 records ₹676.20 million: ₹360.00 million of electoral bonds with no recipient specified in that note, ₹300.00 million to BJP and ₹16.20 million to Balasahebanchi Shivsena. The standalone Note 45 has nil political-party contribution. The graph correctly originates the contribution records from the consolidated reporting-group node, not the listed legal parent's standalone node. MRM's ₹350 million is not added again to the consolidated amount, and IRBMP's donation expense is not reclassified as a political contribution without evidence. These remain company disclosures, not government findings about influence.
- **Chronology:** the NHAI excerpt's Gujarat Package 7 award date is 31 July 2020; commencement, target completion and progress observations are separately dated. The award predates the FY2023–24 contribution disclosures. The PMO roster explicitly says “As on 25.07.2026”, although its page carries an earlier date. All eight roster-based role edges are point observations on 25 July 2026; they do not backfill ministerial tenure at an earlier award. The Defence Minister's separately sourced presence on 1 March 2024 remains a distinct dated edge.
- **Identity:** the four explicit integration aliases were checked: Union Ministry of Defence, Union Ministry of Home Affairs, Rajnath Singh as the identified Defence Minister, and Larsen & Toubro Limited as the named legal parent. No service/department, state ministry, subsidiary or same-name person was substituted. The reporting-group node remains separate from IRB's legal award recipient; Nysa retains only its court-record identity.
- **Claim scope:** an official award record establishes the named award and its date, a company filing establishes a disclosure, and a government roster establishes an office observation. A path among them does not establish influence, collusion, a procurement breach or an unlawful donation. The retained evidence does not supply those missing causal links.

### Browser review

The reviewer opened the actual development application in Chromium at `/#/public-works?sector=military` and `/#/public-works?sector=recruitment`, including the case, rule and relationship-table sections. The 1440 × 1000 desktop views rendered without page errors or horizontal overflow. The military view contained the two accommodation/warehouse dossiers plus the explicitly methodological recurrence question; the recruitment view contained the civil-judgment dossier plus that recurrence question. Responses, alternative explanations, paragraph locators and unresolved evidence appeared with the findings. Missing ministry replies and unverified scheduled completion remained visible, as did the Supreme Court's paragraph 50 limit concerning criminal proceedings.

Two presentation issues were returned to the data/UI authors and corrected: the court decision now has the distinct “Judicial finding” label, and the generic recurrence dossier explicitly states that its 7,777 / 74,940 denominator covers the whole retained dataset rather than the selected sector. Loan, appropriation, award, rental expenditure and audit-estimated loss were not pooled into a single financial total in the reviewed views.
