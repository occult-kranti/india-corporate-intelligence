# Independent source and browser cross-review

Reviewer: services research agent, reviewing the roads workstream rather than its own research. Review date: 6 October 2026. This is a specialist-agent panel review, not a professional engineering inspection or human endorsement.

## Source review

I read the retained Bharatmala and West Bengal CAG indexed extracts, the original bridge-annexure PDF/text, the original Works Manual excerpts, the QCBS OCR, and the original-source release receipts. Ten road-evidence file hashes/byte counts matched the manifest. CAG binary access failures and repeated OCR blocks were retained as retrieval limitations; repeated extracted paragraphs were not counted as separate observations.

The reviewed monetary and sampling claims match their cited record:

| Record | Cross-check |
| --- | --- |
| Dwarka | ₹7,287.29 crore sanctioned civil cost, ₹250.77 crore/km and ₹18.20 crore/km are present in the audit. The dataset correctly rejects their ratio as a measured like-for-like overrun and preserves the ministry's design/cost response. Package 4's ₹1,047.007 crore award announcement remains separate from whole-project costs and actual payments. |
| Jagatpur–Dharampota | ₹48.64 crore completed-work cost, ₹7.17 crore characterised as unfruitful on affected stretches and ₹12.85 crore unapproved restoration estimate are distinct. The department's 917 m/1,145 m account and the CAG rejoinder are present. No second paid contract is invented. |
| Bridge utility interfaces | The 15-of-67 new-bridge sample, five old bridges in a separate 30-bridge visit sample, and 14 PHED-pipeline bridges are kept distinct. Mansai's cable permission in July 2022 is not conflated with the separate unauthorised-pipeline observation. |
| Cherkkala | The 17 June 2025 NHAI release announces debarment and a separate show-cause notice proposing one year/up to ₹9 crore. It states 15-year HAM maintenance and own-cost reconstruction. The dataset does not claim a collected penalty, final present debarment status, or a second public payment. |
| Meachi | The release supports approximately 600 mm settlement, pier P3 at chainage 24+461, and a 222 m bridge under construction. Preliminary scour/constriction attribution, temporary personnel action and missing final inquiry/contractor response stay qualified. |
| Procurement guidance | The retained 2025 final-manual foreword supports limited-engineering-capacity scope, ₹60 lakh small-repair guidance and approved specialist frameworks. QCBS OCR supports the works QOP route and the distinct NCS ₹10 crore procedures. Publication/republication is not assigned as one effective date for every underlying rule. |

## Corrections raised and accepted

1. **False locality aliases:** Chengala and Neeleshwaram were aliases of Kasaragod district. They are separate localities/corridor endpoints, not alternate district names. The roads owner removed them; free-text corridor discovery remains available.
2. **Bridge versus corridor geography:** Meachi's source identifies a corridor and chainage, not a bridge physically inside both endpoint localities. Exact bridge/source/case/consultant/concessionaire records now remain Bihar state-level pending verified geolocation. The endpoint locality records were removed.
3. **Relationship geography lost during assembly:** Road relationships omitted geographic arrays and were silently classified as national. A real Chromium journey showed the West Bengal Mansai relationship in an electricity/Uttar Pradesh view and West Bengal utility relationships in a water/Karnataka view. The roads owner supplied explicit scope/state/locality metadata; the data engineer made missing dimensions fail validation. Only intentional national context may cross state filters.
4. **Publication date presented as relationship commencement:** The graph printed “From [date]” for ongoing roles whose only known date was a press release. Road authority/promoter/concessionaire/engineer roles now leave relationship dates unknown and put the observation date in prose. Award/debarment announcement events use the same start/end day and explicitly identify the date as the announcement.

The reciprocal independent roads review found two services corrections, which I applied: the electricity Rule 8A immediate-after-smart-meter-installation clause, and Karnataka JJM's separate 15 March 2024 in-village versus 31 March 2024 multi-village award deadlines. Services corporate announcement edges were likewise bounded to their announcement day, and the Karnataka-specific RTE rule received explicit state scope instead of an implicit national default.

## Rendered journey checks

Chromium `/usr/bin/chromium`, development app `http://localhost:5173/#/public-works`, 1440 × 1000 viewport. These observations are browser evidence from the assembled application; source-code inspection alone is not counted as a passed workflow.

Four journeys selected a service sector and state, read the case and response, inspected its primary-source link, clicked **Explore shared-source context**, switched to the relationship table, and reloaded the deep link:

| View and case | Shared-source result | Key qualification visible |
| --- | --- | --- |
| Electricity / UP / duplicate connections | 8 entities, 4 relationships/table rows | PuVVNL's reported ₹4.54 crore recovery stays beside the headline audit amount. |
| Water / KA / late tenders | 3 entities, 2 relationships/table rows | Government re-tender explanation and CAG's 13-of-33 rejoinder are adjacent. |
| Hospitals / AP / public-reserved packages | 2 entities, 1 relationship/table row | COVID temporary-permission response is visible. |
| Schools / KA / RTE reimbursement | 2 entities, 1 relationship/table row | The government statement that reimbursement is timely is visible. |

Every focused view displayed the warning that a shared source may cover separate matters and is **not a case-specific allegation network**. Table counts and selected case survived reload. No page errors were captured in the four-journey run. Source links retain the actual primary URLs; clicking the electricity audit opened a separate tab without changing the research route. The origin returned an upstream connection timeout, consistent with the documented indexed-text/original-binary access distinction; this review does not claim live origin availability.

The first state-network observation exposed the geography defect above. A separate post-correction rerun is recorded below; the initial unscoped network counts are not called a pass.

## Post-correction rerun

**PASS — 6 October 2026, 19:56 UTC.** The frozen assembled corpus SHA-256 was `660eceb0704b45498bce89c2c0931a7bdb39a8d4139ef3b743074399bf25e706`. Nine fresh Chromium pages tested the final geography against actual rendered node identities, case IDs and rule cards. No page errors were captured.

| Rendered view | Observed final result |
| --- | --- |
| Electricity / Uttar Pradesh | 10 entities / 5 relationships: the eight UP service entities plus the separately identified Manohar Lal–Ministry of Power national-office context. No West Bengal entity or case. Duplicate-connection shared-source context narrows to 8 / 4. |
| Water / Karnataka | 5 entities / 3 relationships: the three Karnataka service entities plus C R Patil–Ministry of Jal Shakti national-office context. No West Bengal entity or case. Late-tender shared-source context narrows to 3 / 2. |
| Schools / UP and AP | Karnataka-specific RTE rule absent in both views. |
| Schools / Karnataka | Karnataka-specific RTE rule present. |
| Roads / Chengala, Neeleshwaram, Galgalia and Bahadurganj | Each exact locality search returns zero local case files and zero network entities; no district or corridor-endpoint evidence is promoted into a local asset assertion. |

The extra national-office nodes are labelled public-role context and remain separate from the focused service-case subgraphs. Their presence is not interpreted as an award decision or improper influence. Larger unfocused counts after the political-role dataset was added were therefore checked by identity, rather than compared to obsolete counts.

This closes the geographic and publication-date-as-commencement findings raised in this review. Production-build validation and the full workflow gate remain the root integrator's separate responsibility; these results describe the development application actually reviewed.
