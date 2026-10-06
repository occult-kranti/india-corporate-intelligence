# Independent repeat-work and services review

Reviewed on **6 October 2026** by the roads engineering/procurement role during panel round 2. This review used retained primary-document extracts and the running interface at `http://localhost:5173/#/public-works`, with Chromium 151 at `/usr/bin/chromium`. No services research records were edited by the reviewer; findings were sent to the owning researcher and team lead.

## Services evidence checks

| Record | Independent check | Result |
| --- | --- | --- |
| UP electricity manpower overlap | CAG paragraph 3.3.4; four DISCOM amounts ₹16.73 + ₹15.44 + ₹6.85 + ₹7.25 crore | Sum is ₹46.27 crore paid. ₹73.47 crore is agreement value. The government’s distinct-role explanation and CAG’s rejection are retained. Scope overlap is not asserted to prove the same worker-hour was paid twice. |
| UP duplicate connections | CAG paragraphs 3.3.8–3.3.9 and February 2024 management response | Grid categories total ₹22.2351 crore; adding the separately stated ₹4.41 crore solar category yields ₹26.6451 crore, rounding to the ₹26.65 crore headline. The UI dataset does not add solar twice. ₹4.54 crore recovered is explicitly PuVVNL’s reported amount, not a net-state outstanding calculation. |
| Karnataka JJM late tenders | Original retained indexed report, section 3.5 | 33 tenders / ₹251.75 crore and the 13-recalled-tender rejoinder are supported. **Correction requested and verified:** distinguish the 15 March 2024 in-village extension from the 31 March 2024 MVS extension. The 33 tenders were after the latter date, so the observed late-tender set does not change. |
| PMJAY public-reserved packages | CAG chapter V, paragraph 5.4 | ₹1.37 crore / 458 Andhra Pradesh cases and ₹3.61 crore / 1,080 Punjab cases match the extract. Private-teaching-hospital and referral exceptions plus NHA’s COVID response are retained. These are treatment claims, not hospital-building contracts. |
| Azamgarh KGBV rework | CAG paragraph 2.2 | ₹1.17 crore historical expenditure is separate from ₹2.01 crore demolition/reconstruction and ₹1.46 crore revised repair/completion estimates. The later technical recommendation changed the remedy. January 2022 release and pending transfer are not conflated with certified work. Transit-campus teaching means an unfinished building is not a closed school. |
| Karnataka private-school reimbursement | Original parliamentary PDF, page 2 | ₹156.10 crore sanctioned minus ₹148.68 crore reimbursed equals ₹7.42 crore. The answer says reimbursement is timely; no overdue debt or diversion is inferred from that subtraction. The state table is not Bengaluru spending. |
| AMISP model | REC model guidance, sections 7, 9 and 11–13 | DBFOOT, meter-month operation payments, separate auxiliary-component amounts, change orders and payment-security arrangements justify the lifecycle-cost warning. Model guidance is not an automatic tariff or identical tender scope. |
| Electricity consumer rules | Retained original Gazette, rule 8A | Threshold is maximum demand **more than 10 kW** for the commercial/industrial deadline. **Correction requested and verified:** the data now also states ToD applies immediately after smart-meter installation, alongside the 2024/2025 category deadlines and State Commission/subsequent-amendment caveats. |

The review verifies agreement with retained evidence, not the underlying payment or household ledger. CAG primary-host indexed text has retrieval/OCR limitations documented by the source records. Recovery orders, final receipts and current compliance remain distinct follow-up evidence.

## Rendered comparator checks

The running React form was exercised through labels, selects, checkboxes and submit controls; this was not solely a unit-level review of `assessRepeatedWork`. Desktop viewport was 1440×1000, with a separate 390×844 mobile check and visual inspection of the rendered result.

| Input scenario | Observed behaviour |
| --- | --- |
| Distinct contracts; exact same authority, site, asset, scope, stage and overlapping dates | “Overlapping scope needs review”; explicit statement that overlap is not proof of repeated physical work, duplicate payment or misconduct. |
| Same contract identifier | No comparable overlap established. Text explains separate instalments/lots; the introduction explicitly says duplicate invoices within one contract need a separate payment-ledger check. |
| Different authority, site, asset, scope or accounting stage | No comparable overlap established. |
| Non-overlapping work periods | No comparable overlap established. |
| Tender notice | Excluded: a notice does not establish an award, payment or completed work. |
| Cancelled record, correction or amendment stage | Excluded with the corresponding explanation. |
| Missing asset identity or reversed dates | Excluded with actionable requirements. |
| Hypothetical concessionaire-funded repair entered alongside another matching contract | Remains a review question; result requires payment responsibility, bills of quantities, maintenance cycles and certificates before any duplicate-payment conclusion. The comparator cannot infer that a recorded payment came from government. |
| Change an input after calculating a result | Prior result clears immediately. |

The initial browser run passed 13 recorded checks, including result clearing. The extended run passed **16 recorded checks**, adding different-authority, different-site and amendment-stage cases. Both produced no page errors; document-level horizontal overflow was absent at 390 px. The extended run used the updated introduction that explicitly distinguishes within-contract duplicate-invoice checks.

The rendered result is readable on the mobile viewport and keeps the qualification adjacent to the outcome. The inspector uses exact identifiers supplied by the user; it does not automatically resolve names, validate source documents, scan the retained CPPP aggregates, assess structural safety or detect all forms of duplicate invoicing. A negative result means this narrow comparison has not established an overlap, not that the underlying works are sound.

## Cross-review corrections to roads records

The services role independently identified two geography problems in the roads slice. Both were corrected: Chengala and Neeleshwaram are no longer aliases of Kasaragod district, and Galgalia/Bahadurganj corridor endpoints are no longer used as physical locality tags for the Meachi bridge at chainage 24+461. The Bihar records now retain state-level geography until the asset is geolocated. Corridor names remain searchable as text.

The services reviewer also found actual rendered cross-state graph leakage because road edges lacked explicit geography and were being defaulted to national. Every road relationship now has reviewed state/locality/scope fields; all sources, entities, cases and rules also declare their scope explicitly. Role-observation dates were removed from relationship commencement fields. Award/debarment announcement events retain same-day start/end dates and explicit announcement labels. Reassembly and the owning browser reviewer’s filter check are required to verify the final rendered graph.

No model-generated association, shared road name or repeat appearance of a contractor is promoted to a corruption finding by these checks.
