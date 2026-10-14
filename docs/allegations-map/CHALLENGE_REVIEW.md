# Independent evidence and map challenge

This ledger records two rounds of independent model-agent review. It does not represent a panel of human legal, accounting or design experts. No skill files or skill workflows were opened or applied for this task. The reviewer's write scope is this document; data and interface corrections belong to the relevant owners.

## Round one: architecture and claim risks

The registry snapshot read on 7 October 2026 contained 2,222 identities, 3,943 relationships, 5,450 records and 3,237 sources. Its existing case feed comprised 27 reviewed cases, two allegation-classified records, 23 findings and 13 proceedings. There were 28 records of kind `investigation-case`; one was classified as an allegation rather than as a reviewed-case card. These are record counts, not unique incidents or rates of wrongdoing.

The 99 alleged-tier relationships comprise 95 inherited legacy relationships, one deep-services relationship and three deep-governance relationships. Ninety-five have unknown incident geography, 28 lack exact event dates and 13 have no linked response record. The existing public-site manifest has one sourced campus point, V. O. Chidambaranar Port. This evidence cannot support a map of 99 incident pins.

| Challenge | Required representation / decision | Owner discussion |
| --- | --- | --- |
| A dedicated allegations page may imply every visible entity is accused | Show the attributed assertion, its exact target and the actor's role. A lender, regulator, employer, hospital purchaser or later property buyer is not automatically an accused participant | Sent to network and researchers |
| A source records an allegation, attachment, FIR or bail order | Document authenticity does not make the underlying wrongdoing proven. Separate assertion tier, source provenance, proceeding stage and final finding | Sent to researchers |
| Legacy tier is `alleged`, but the claim has been superseded or withdrawn | Default new research separately from retained claims; retain correction/status and linked responses. Use exact reviewed ID overrides rather than keyword-based legal-status inference | Network accepted |
| Case and relationship counts overlap | Count reviewed records and retained alleged relationships separately. Do not sum them into unique cases, victims, transactions or a corruption score | Sent to network |
| State or country context lacks a project coordinate | Boundaries and clearly labelled state evidence indexes are acceptable; no invented facility pins, jittered incidents or centroids presented as precise locations | Sent to spatial and network |
| Registered office, constituency or entity association is available | It does not locate the alleged conduct, spending, victim or service. Unknown incident geography remains unplaced with a visible list/count | Sent to spatial and network |
| Popup or compact card omits the response | Keep the dated status and material contrary result close to the allegation. Expansion/export must retain the response even outside current date filters | Final implementation check pending |
| Alleged bribe, invoice, contract, loan, asset attachment and recovery amounts coexist | Keep currency, unit, period and stage; avoid a combined monetary total. Attachment value and restored asset value are not necessarily cash recovered | Sent to researchers |
| A public facility has reliable coordinates | Label point precision and the coordinate source. A mapped public office is context, not evidence that misconduct occurred at that point. Do not locate private individuals or operational military units | Sent to spatial |
| A date slider covers 2011–2026 | Do not substitute publication/retrieval dates for conduct dates or erase later responses. Unknown dates require an explicit treatment; source selection is not proof of current legal status | Final implementation check pending |

### Coverage recommendations

The established cases already cover concessions, corporate refinancing, solar inducement allegations, political finance disputes, PM-JAY clinical claims, welfare audit findings, flood reconstruction, police borrowing and cross-border financing/arms trade. Repeating West Bengal recruitment, NSAP publicity or Khyati would add little without a new exact endpoint or current outcome.

Registry text inspection found no PACL/Pearls, DHFL, ABG Shipyard, Videocon, Nirav Modi/Mehul Choksi or NSEL case. IL&FS appeared only in contractor/JV records. A bounded investor-refund or public-bank credit/recovery trail could fill a financial-sector gap. These are discovery recommendations, not new assertions of guilt or commitments to publish every candidate.

| Candidate | Value and source/control test | Selection status |
| --- | --- | --- |
| PACL investor refund pathway | A discovered original SEBI July 2026 board memorandum includes the Lodha Committee's May 2026 status. Distinguish collected principal, eligible applications, actual disbursed refunds, auction proceeds and bank-deficiency claims. “All eligible claims” does not mean every historical investor has received cash | Selected by policy researcher; independent primary-text review below |
| Lifeline / municipal COVID staffing invoices | Adds the public purchaser → supplier → invoice/claimed staffing pathway. Read Bisure and Patkar bail reasoning, not only the ED case account; bail is not conviction or universal exoneration | Institutions researcher pursuing |
| Haridwar scholarships → named education societies | Adds named institutional recipients beyond the retained general scholarship findings. Keep ₹27.98 crore overall claims, ₹13.83 crore alleged false claims and attachment value distinct; 2,895 unique students across years is not interchangeable with 6,208 claim entries | Institutions researcher pursuing; denominator correction acknowledged |
| SRMF society land → alleged unauthorised sellers → purchaser/resale | Separate society authority, registered conveyance, consideration and criminal knowledge. A purchaser link does not establish knowing participation. The Supreme Court SIT order and conditional protection are material contrary/procedural context | Institutions researcher pursuing |
| MEIL/NMDC/MECON, GVK/MIAL and toll agencies | Potential exact procurement/payment paths, but originals and later judicial findings control inclusion. The existing MEIL and airport cases make an exact allegation and outcome more valuable than a general group-name overlap | Policy researcher evaluating originals |

### Critical inherited correction: Waaree donation claim

The exact relationship `legacy:relationship:7afac8eb483ff991|waaree|direct|bjp` has tier `alleged`, status `allegation`, no exact event date, no amount field and no response record. Its original row in `src/graph/data.ts` is labelled “claimed ₹15cr — KILLED”; its description says the claim was absent from an ADR annexure and superseded. The Waaree entity description repeats “CHECKED AND KILLED”. The registry adapter nonetheless creates an active funding relationship and a matching `relationship-record`. No existing held or correction row for this claim was found.

The cited publisher original was independently downloaded and read:

- URL: `https://adrindia.org/sites/default/files/English_Analysis_of_donations_declared_by_National_Parties_FY_2024-25.pdf`
- Title: *Analysis of Donations Received by National Political Parties – FY 2024–25*; dated 26 March 2026; 33 pages.
- HTTP 200, `application/pdf`, 1,474,308 bytes; SHA-256 `a10e560a995f8d0bba9901ecff6fefc12cfe854e54a03499e5f103fdbfadbc41`.
- Temporary original: `/tmp/allegations-adr-fy2025.pdf`; layout extract: `/tmp/allegations-adr-fy2025.txt`. No additional repository archive is claimed by this reviewer.

The proposed correction also needs correction: **this ADR report does not prove that no ₹15 crore Waaree donation occurred.** Annexure 1, printed page 18, explicitly lists the *top ten* BJP donations; the smallest listed entry is ₹102.265 crore. Annexure 4 begins on printed page 24 and concerns top donors. The ₹0.75 crore item appears in the top-two donor table on printed page 15 for Muthoot Finance's donation to CPI(M), not an exhaustive BJP donor list. No Waaree name was found in the extracted report, but absence from these selected tables cannot resolve all company/affiliate contributions. An initial reviewer message misread the party grouping as NPEP; the complete table was re-read, this detail was corrected and both data owner and root were notified.

The narrow decision sent to root and network is to hold/withdraw the **unsupported retained claim**, preserve its exact saved record address and original citation in correction history, and remove it from current allegation/funding-arrow classification. Wording should say the cited report does not establish the alleged payment. It must not assert that ADR disproved the donation, that no Waaree affiliate ever donated, or that a replacement transaction has been established. An exact original party contribution return, issuer disclosure or other reconciled payment evidence could support a separately reviewed claim.

### Other inherited status risks

Five alleged edges already carry structured status `superseded`: the `people:c003` Gautam Adani indictment entry, `people:c005` Sagar Adani entry, `narratives-literature:c001` Hindenburg/Adani report entry, `narratives-literature:c011` Buch report entry and `rules-regulators:c026` Buch/fund entry. Their historical assertions and existing responses should remain available. “Superseded” must not be relabelled as a blanket merits acquittal or proof that every allegation was false.

Two further entries require qualified historical display rather than presumed current enforcement: `fcra-actions:c027` says Ford Foundation's watch-list order was withdrawn in 2016, while `fcra-actions:c053` says Missionaries of Charity's registration was restored in early 2022. Neither currently has `responseIds`. These inherited summaries are review leads; this round has not independently retrieved their original orders and does not convert restoration into a merits finding on every allegation.

The separate `states:c023|gadani|enforce|seci` legacy entry has an internally inconsistent summary/status discussion: its summary says the criminal case remains open, while its alternative explanation describes dismissal against the Adanis. The previously reviewed deep-governance slice distinguishes defendants and proceedings. Do not use this stale edge as a new current allegation without linking the exact reviewed outcome and preserving the SEC/criminal distinction. The edge direction is also an inherited association, not a verified payment from a person to SECI.

## Round two: final source and rendered challenge

Source challenge proceeds while the researchers construct their final JSON. Rendered verification remains pending the announced integrated build.

| Source challenge | Independent reading / required correction | Disposition |
| --- | --- | --- |
| PACL 2014 SEBI order, printed pp 71–77 and 89–92 | ₹44,736 crore through March 2012 plus ₹4,364.78 crore in February 2013–June 2014 is an incomplete historical aggregate; April 2012–February 2013 is expressly missing. It is not a 2011–2026 loss amount. Paragraph 37 protects sale deeds certified as genuine; paragraphs 38–41 record regulatory findings and directions, not a criminal conviction | Researcher accepted historical scope and genuine-deed qualification; core flow will use exact dated 2013–2014 collection |
| PACL July 2026 board memorandum, pp 1–4 | ₹3,720.67 crore is cumulative refunds to 35,74,401 eligible applications as of 5 May; ₹3,894 crore describes auctioned property value and approximately ₹1,200 crore is an account balance. They cannot be pooled or used as a simple recovery-rate numerator/denominator | Source support verified |
| PACL August and September 2026 documents | Original 3 August notice extends bank-deficiency rectification to 6 October. Original Supreme Court 9 September order pp 19–21 disposes specified property-objection applications and sets further hearing; it does not close the PACL matter | Source support verified |
| PACL Bengaluru Rural auction RFP, dated 30 September 2026, §1.1 | StockHolding Document Management Services assists the committee's auction. The document explicitly says the committee is not the property's owner. It does not identify a successful buyer or establish completed proceeds | Researcher accepted administrative-role edge, no owner or purchaser inference |
| Ganeshgarhia / Chapwa DHC judgment, 11 December 2025 | Official-host indexed text and complete mirror reproduce W.P.(C) 9232/2025. The annual ₹6.821 crore remittance obligation runs from toll contractor toward NHAI; it is not an NHAI payment to the contractor. The disputed ₹50 collection and ₹10 lakh penalty are distinct stages | Source support verified; original direct download remains a disclosed retrieval failure |
| Ganeshgarhia outcome, §§30–41 | Debarment was set aside for the reasons recorded; §34 declines factual conclusions, §36 notes no POS machine was seized, and §41 leaves termination/penalty to contractual or civil remedies. Do not assert all allegations disproved or penalty paid. §§1–2 date the contract 25 July 2024; §41 says 25 July 2025, an internal date discrepancy rather than proof of another contract | Researcher accepted date limitation and narrow outcome |
| Haridwar scholarship ED release, 15 June 2026 | ₹19.74 crore reportedly credited to institution accounts and ₹8.24 crore to student-name accounts comprise ₹27.98 crore. Institution-specific proceeds-of-crime estimates ₹2.44/₹3.95/₹7.44 crore are not necessarily the original direct-disbursement splits. The footnote counts 2,895 students once across years; do not divide it by 6,208 entries as a claims-fraud rate | Correctly retained in final draft; no rate inferred |
| SRMF Supreme Court judgment rescued from original host | Retrieved `https://www.sci.gov.in/sci-get-pdf/?diary_no=92502026&from=latest_judgements_order&order_date=2026-05-12&type=j`: HTTP 200, 740,346-byte PDF, SHA-256 `4516236b6b9440b9c295cc6ba2b9e742b87edb3c803ddfe59b49ff0ee3f4d35a`. Its full normalized text matches the retained 15-page mirror. Temporary bytes `/tmp/srmf-original-response`; text `/tmp/srmf-original.txt` | Original supplied to source owner for retention |
| SRMF proceeding scope | Original §18 protects respondent 2 until the SIT report is submitted and police investigation is complete; §19 expressly declines merits determination. This is distinct from the 15 May ED release's remand of Ram Chandra Mohan/Akash Malviya and freezing allegations involving Pradeep Singh's firm. Similar names and shared company roles cannot merge the persons or extend the protection automatically | Correctly retained; paragraph reference corrected from §20 to §19 |
| SRMF property character | Original §9 clarifies freehold ownership, correcting the court's initial assumption of government-allotted leasehold land. The case does not establish a public grant or government lease | Added to the property relationship and re-read |
| Lifeline / Bisure bail judgment mirror | Read the 12 February 2025 judgment's prosecution submissions and bail-stage analysis. The court's prima facie treatment of the ₹21.6 lakh allegation and the applicant's limited period/invoice role must accompany the accusation. Case-wide ₹38 crore allegations are not his personal receipt; bail is not final exoneration. An official-host PDF was not located in this review | Mirror provenance and individual response retained |
| Lifeline / Patkar July bail transcription | Independently opened the legal transcription. Paragraph 6 distinguishes ₹327,633,861.50 invoiced, ₹3,147,076.60 penalty, ₹324,486,784.90 sanctioned before ₹6,015,149.20 TDS, and printed net credit ₹318,471,635.72. The arithmetic gives ₹318,471,635.70: the two-paise discrepancy stays disclosed. Paragraph 14 supplies the 16 September 2020–24 June 2022 payment period. Prosecution account is not independent bank-ledger proof | Gross/net stages corrected; no invented balancing payment |
| Lifeline municipal response | Independently opened FPJ's reproduction of the 21 January 2023 statement, points 2–4. BMC asserts due process/rate negotiation and ₹3.36 crore NSCI plus ₹29.77 crore Dahisar payments. Its ₹33.13 crore total overlaps the prosecution account and is not an additional payment or a proven difference in losses | Attribution and unreconciled scope retained |
| PACL financial dates in the draft | Commission payments through 31 March 2012 initially carried the later 2014 order date. Seller-payment dates were unknown. These now retain unknown start/31 March 2012 cutoff and unknown transaction dates respectively; 2014 remains source/status date. The case begins with the exact 26 February 2013 collection period | Corrected and independently re-read |
| PACL auction/bank cutoff | Only the refund paragraph expressly supplies 5 May 2026. The memorandum's auction-value and bank-balance paragraphs say “so far” without an exact cutoff; they must not inherit the refund date. The administration edge is now undated, and these values remain in the stage record with an unspecified cutoff | Corrected and independently re-read |
| DHC source provenance | The official-host indexed source and downloaded third-party mirror have different access routes. The mirror source is now reported; documented legal outcomes rely independently on the opened official-host text | Corrected and independently re-read |
| Research artifact hygiene | Commercial news bodies are not needed in the source archive. Requested removal from task caches and retention of retrieval receipts, brief excerpts/structured summaries, with full originals limited to public official/court documents | Institutions owner accepted removal; manifest check pending |
| Strict slice validation | Independently executed `validateDeepSlice` on both drafts after accepted changes. Both passed, with exact local endpoints and source/response references intact | Passed; final artifact hashes pending |
| Frozen policy artifact integrity | Recomputed all 78 manifest entries: 76 repository artifacts and two externally cached official originals. Every byte size and SHA-256 matched. Final raw SHA-256: `62bab54edd4ddeab5795a877871b64ee24303099b1b36ff99769c2ccc49eae70` | Passed |

The revised source claims have no remaining substantive blocker. The subsequent freeze and integrated-development checks below resolve the earlier pending items; they do not claim that unobserved later proceedings or complete transaction ledgers have been obtained.

### Frozen institutions artifact integrity

Independently rehashed all 32 public manifest artifacts and the one locally retained legal transcription. Every recorded byte size and SHA-256 matched. The local-only transcription is identified as such and is not a public article archive. No commercial news body remains in the admitted task archive.

- Raw slice SHA-256: `bfdfc2d79a244100b1d0d0f4066a65dcdd73c486968b4c80c0343eb2c9e4c423`.
- Manifest SHA-256: `6382021a145ff9fe0d1f574cc08005623885cbd5621e30b2a902f86c077dde51`.

### Integrated reader challenge: 7 October 2026

After root announced readiness, one Chromium instance reviewed `http://localhost:5173/#/allegations` against the integrated frozen source slices. The browser was closed on completion. This was a development-server review, not an immutable production-build claim. The temporary harness and captures are under `/tmp/allegations-oversight-browser`; no application or data files were edited by this reviewer.

All **81 assertions passed**, with no browser runtime exceptions and no HTTP 404 responses. The first harness run stopped on an overly narrow wording assertion: it expected “cannot prove” while the correct displayed correction said “cannot disprove”. Reading the actual text confirmed the correction was sound; the assertion was corrected and the complete run passed.

| Rendered challenge | Observed result |
| --- | --- |
| All five exact case selections | PACL, Chapwa, Lifeline, scholarships and SRMF rendered their complete attributed summaries, precise status text, status cutoff and material response. Exactly one evidence reader was open per selection |
| Court outcomes near accusations | Chapwa's title and summary explicitly say debarment was set aside while factual conclusions and contractual remedies remain open. SRMF's summary and response preserve the individual protection, merits reservation and missing SIT follow-up |
| Financial stages | PACL and Chapwa case amounts retain their stages and periods. Separate relationship readers retain Lifeline gross sanction versus net credit; scholarship direct institution credits versus student-name credits, agency-attributed proceeds and provisional attachment value. No combined total was introduced |
| Evidence exports | Every case export had complete source closure, no missing IDs and every relationship's linked response record. The response tab displayed the retained replies/outcomes for all five cases |
| Neutral recovery administrators | StockHolding DMS and C1 India headings describe administrative roles. Their connection lists did not cast these roles as alleged financial participation. The Bengaluru auction record retains the incomplete/future sale stage |
| Withdrawn Waaree assertion | The saved record opens as `withdrawn-unsupported-claim`, explains why absence from top-donor tables cannot disprove a donation, and retains its source gap and falsifier. The old relationship ID is absent from the live registry and export; no funding arrow appears. The correction is outside the default newly reviewed scope |
| Geographic meaning | Visually reviewed desktop captures disclose numbered hubs as state-associated record indexes at schematic positions, and the relationship inset says “Schematic · not locations”. Case geography notes distinguish project/state context from inferred coordinates |
| Mobile and navigation | At 390 × 844, the Chapwa evidence sheet remains within the viewport with no horizontal page overflow. Its response remains in the reader, and Escape closes it and clears the shared selection |

Representative desktop Chapwa, SRMF and Waaree captures, plus the mobile Chapwa capture, were inspected visually after the automated assertions. No evidence-presentation blocker was found. Source dates, legal transcriptions and unverified follow-up remain qualified exactly as recorded in the source review. A later production build requires its separately announced final check; these results must not be represented as that check.

### Announced immutable production check

After root explicitly released a browser slot, the reviewer checked `dist-allegations-release` through `http://127.0.0.1:5184`. The build's `index.html` SHA-256 is `dbef3c193404b34586ecce5f9523b95afd8b2bfb7589a8ff3efc4c002b1bc5d7`. The source slice hashes still matched the accepted freezes above.

The focused production run passed **32 assertions**: all five cases' complete summary, response and status/cutoff matched the frozen source records; case amounts retained stage and period; the Lifeline net-credit and scholarship attachment readers retained stage qualifications and linked responses; the Waaree correction remained withdrawn, explicitly rejected absence-as-disproof, and showed zero connections; the mobile Chapwa reader fit the viewport and Escape cleared selection state. There were no runtime exceptions or failed local asset responses. Temporary acceptance JSON and two focused captures are under `/tmp/allegations-oversight-release`. Chromium closed on completion.

No source or evidence-presentation blocker remains for this inspected build. Root separately noted a possible Back-to-place history refinement; this source-review pass does not claim to validate a subsequent navigation change or rebuilt bundle. Such a change should receive its own targeted check rather than inheriting this build identity.
