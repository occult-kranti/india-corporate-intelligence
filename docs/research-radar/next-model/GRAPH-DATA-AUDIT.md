# Graph and money-trace data contract

Audited 8 October 2026 against source commit `4976bca93f15eddb565abaf9de2339127496366f`. This is a new audit of retained data, not a new verification of every cited original. The machine-readable counts, input hashes, exact question references and evaluation-family exclusions are in [`graph-inventory.json`](../../../research/research-radar/next-model/graph-inventory.json).

## What can actually be learned

The existing MiniLM experiment used 64 researcher-authored source summaries. The larger repository contains a much broader evidence graph. Its immediate supervised target should be **retrieve the sources and exact typed relationships needed to answer an investigative question**, preserve counterevidence, and state where the available money trace ends. This is a measurable improvement over source-only similarity. It does not turn incomplete financial records into observed cash flows or estimate whether a person is criminal.

The graph can support three distinct outputs:

1. **Historical reconstruction:** source-described events and transactions, with financial stage, date basis and response. It is reconstruction from retained records, not a claim that a model predicted the past without seeing it.
2. **Investigative acquisition:** an explicit missing record, holder and disconfirmation test. An absent edge becomes a question, never a generated factual edge.
3. **Future institutional scenarios:** a dated observable target, eligible input snapshot, alternative outcomes and eventual adjudication. Training a probability model requires a representative resolved outcome cohort; the current graph does not provide one.

## Inventory

| Retained object | Count | Meaning |
|---|---:|---|
| Entities | 2,469 | Namespaced records; not necessarily 2,469 different legal entities |
| Relationships | 4,202 | Typed assertions, roles and financial links, not unique transactions |
| Records | 5,616 | Case, source-derived, service, policy and other records |
| Source rows | 3,314 | Includes multiple summaries of the same original |
| Distinct exact source URLs | 3,258 | URL uniqueness does not establish independent provenance |
| Held objects | 316 | Excluded from normal graph connectivity for recorded identity/source reasons |
| Nonlegacy source rows | 435 | Better starting set for richer source-summary retrieval |
| Nonlegacy, non-crosswalk edges | 605 | More explicitly curated relationship packets |
| Such edges with at least one event date | 342 | Dates alone do not establish historical input availability |
| All relationships with amount cells | 1,453 | Mixed currencies, units, periods and stages |

Relationship tiers are 3,116 documented, 678 reported, 253 analytic, 136 alleged and 19 self-reported. These are inherited editorial tiers, not an independent truth judgment from this audit. Of all source rows, **2,992 lack a structured publication date and 2,880 lack a retrieval date**; only 322 have both. **1,363 relationships lack both start and end dates.** A broad historical time split over this graph would therefore be misleading without source-by-source availability reconstruction.

The 2,879 legacy source rows are mostly inherited citations with short titles and missing structured dates. They remain useful discovery pointers and identity context. Do not claim to have trained on 3,314 original documents merely by embedding their citation summaries. Water and education observations also have different units of analysis: school stock is not a closure event; water coverage is not household service continuity.

### Money trails

Five authored trails contain **43 steps and 12 investigative hypotheses**. Their step states are:

| Step state | Count |
|---|---:|
| Alleged transfer | 13 |
| Non-transaction context | 13 |
| Commitment | 7 |
| Missing transaction evidence | 7 |
| Reported transfer | 2 |
| Documented transfer | 1 |

The editorial sequence is not necessarily a continuous payment path. Seven explicit stops are particularly valuable abstention examples. Ownership and directorship can explain the legal participants but cannot supply a missing bank transaction. Court-recorded prosecution allegations remain allegations; bail, attachment and procedural decisions are not criminal-conviction labels.

### Retained public datasets

The tender archive at `/workspace/research-cache/tender-20260626` occupies 16,047,567,371 bytes. Its derivation manifest records source hashes and SQL, including distinct notice and award joins. The directory is evidence lineage, not disposable model-cache clutter. It was **not deleted or re-downloaded** in this audit. A temporal-data reviewer is separately examining award/notice dates and observability; one June 2026 snapshot does not by itself supply historical feature snapshots.

Original corporate documents under `deep-corporate-originals` and `money-trails-corporate` were preserved. No private bank records or confidential beneficial-ownership register was acquired. Public statement summaries must retain those limits.

## Retrieval and graph packet schema

Start with canonical source IDs, not generated prose about a person's character. A source document text comprises its title, publisher, locator, retained summary and limitations. Dates, original URL, tier, source family and input hash travel as metadata. Do not embed evaluation queries or case answers into the candidate document text.

For each result, return a deterministic graph packet:

- Retrieved source IDs and exact case IDs.
- Exact entities and relationships, retaining direction, kind, tier, status, event-date basis, source IDs and response IDs.
- Amount cells with value, currency, unit, financial stage, period and source relationship ID.
- Counterevidence and response records, including those outside an active date or UI filter.
- A bounded case-local path and any explicit unsupported stop.
- Needed record, likely public holder, purpose and a disconfirmation test.
- Input hashes and an explicit distinction between publication date, retrieval date and known historical availability.

Use exact retained crosswalks for identity context. A duplicate-source exclusion used in evaluation is not a new identity crosswalk. Similarity may retrieve a possible document; it must never create a factual person/company edge. A graph traversal must not use response, comparison, supersession or analytic edges as a missing causal hop.

### Variables worth measuring

| Variable | Unit and check | Common failure to prevent |
|---|---|---|
| Financial stage | Sanction, commitment, invoice, release, recipient receipt, debt service, recovery or attachment | Calling a sanction cash spent, or attachment cash recovered |
| Amount scope | Currency, unit, period, population, overlap group | Adding a gross contract, subcontract and overlapping allegation |
| Entity identity | Exact legal ID where retained; source-scoped group otherwise | Conflating similar company names or splitting a cohort into invented people |
| Route continuity | Every directed leg has an explicit relationship and source | Treating parent ownership as proof of upstream cash origin |
| Source independence | Original document family, not merely URL count | Treating copied reporting as independent corroboration |
| Temporal eligibility | Documented availability at query cutoff | Using a later judgment to claim an earlier successful forecast |
| Procurement denominator | Eligible comparable tenders, exclusions and bid count semantics | Calling a curated high-profile sample a population risk rate |
| Response coverage | Adverse claim has a searched and retained response/counterexample | Training only allegation-supporting relevance labels |
| Legal posture | Allegation, audit observation, proceeding and disposition separately | Treating bail, attachment or unresolved charges as conviction |
| Record-acquisition value | Which missing document would distinguish alternatives | Generating an ominous missing link without a test |

Ratios or residuals should be computed only after matching compatible stage, period and population. An unreconciled remainder is an accounting question, not an automatic corruption amount.

## Baselines and promotion contract

Benchmark BM25/token retrieval and the frozen base MiniLM against the existing adapter and any new adapter. Test both source ranking and **valid evidence packet retrieval**. A graph step should be checked against exact IDs, financial-stage preservation, required responses and source completeness. A long but unsupported path is worse than an explicit stop.

Useful reported measures include nDCG@5, relevant-source recall@5, exact supported-path coverage, counterevidence recall, unsupported-edge count and financial-stage violations. Include answerability/abstention cases. Do not use absent unreviewed relationships as negative facts. A future link prediction benchmark must distinguish “not observed” from “shown not to exist.”

Dense retrieval, lexical retrieval and graph closure can be evaluated separately. If lexical retrieval already solves exact-name questions, fine-tuning must show value on unfamiliar paraphrases, source ambiguity, competing explanations and multi-record synthesis. A 256-token source limit must disclose truncation; silently truncating the limitations or response can reverse the meaning of an allegation.

The prior 20-question test is exhausted for promotion decisions. It may be a clearly labelled regression set. New test questions must be frozen before training and evaluated once after development-only checkpoint/model selection. Small gains need per-query and per-family disclosure; do not dress a small selected-corpus retrieval test as a validated nationwide predictive model.

## Independent holdout reservation

The independent evaluation reviewer reserved these six fresh families before new training:

| Family | Primary retained case |
|---|---|
| Telangana police borrowing | `atlas-oversight:record:ov-ts-police-loan` |
| Bihar PM-KISAN recovery | `atlas-oversight:record:ov-bihar-pmkisan` |
| Akshaya Patra / ISKCON | `deep-services:record:akshaya-meals-related-parties` |
| NSAP / DAVP publicity | `deep-services:record:nsap-davp-earmarking` |
| IFC / Mahindra equity | `atlas-international-finance:record:ifc-mahindra-cash` |
| Tamil Nadu urban / flood procurement | `atlas-international-finance:record:tn-urban-sovereign-contract` |

The inventory conservatively reserves 39 substantive entity IDs, 180 relationships, 174 records and 61 source IDs across 57 normalized URL keys. Twenty of the reserved source rows are nonlegacy, leaving **415 nonlegacy source rows outside this first reservation**. This is a candidate pool, not a final training count or a guarantee that every remaining row is eligible. The final evaluator must also check different-URL versions, paraphrases and source families.

All reserved source text, derived answers, substantive entity neighborhoods and labels stay out of gradient updates and development selection. Common sovereign, lender and ministry roles alone do not merge every connected case. The deliberately broad Mahindra corporate-family exclusion serves leakage prevention; it asserts no legal identity merger or misconduct relationship. Existing exact crosswalks connect TAPF and TSPHCL to earlier namespaces and are included.

For matching source URLs, the exclusion key removes a fragment and scheme/`www` differences but preserves query parameters. This is a conservative leakage guard, not proof that content or document vintages match. Multiple summaries of one PDF can expose different passages. Grade their actual supplied text, group the original family, and avoid treating a same-PDF candidate as a confidently irrelevant training negative merely because one summary omits a passage.

## Ten development questions grounded in retained nodes

These illustrative questions are **not the independent test**. Their exact edge/source IDs, source-derived answer basis, responses, variables and next verification are in the inventory. They do not overlap the six reserved families under the initial exact-source/edge exclusion.

1. **DJB → NKG → Integral:** distinguish the contract face value, asserted release and subcontract receipts; identify GST and bank-exhibit limits before reconstructing any onward payment.
2. **Mumbai BMC food routes:** reconcile the two prime-contractor paths, caterer receipts, overlapping individual allegation and attachment valuation without double counting.
3. **GVPR → Honnavar / PFC:** distinguish debt sanction from drawdown and promoter funding from its upstream cash origin.
4. **GVPR → Vijaya meter SPV:** retrieve the contractual payment waterfall and state whether actual consumer collections and loan disbursements are evidenced.
5. **Bond purchaser → BJP / AICC:** retrieve serial-backed redemption records and the legal-identity evidence missing before joining the purchaser label to the CCTV contractor.
6. **MoD → Airbus → Tata consortium:** separate C295 project cost, contract, industrial participation, delivery and acceptance; stop before assigning the whole project cost to Tata receipts.
7. **DRDO / NPOM → BrahMos → Philippines:** distinguish joint-venture roles, award, signed contract, shipment and final supplier payment.
8. **Tata / Bamnipal → Bhushan / creditors:** reconcile acquisition financing and plan-realizable recovery without treating a claim haircut as cash paid to the buyer.
9. **VCPL / RRPR → NDTV / sellers:** separate payments to selling shareholders from new issuer capital and distinguish an equalising-consideration promise from completed settlement.
10. **Coal authority → Vedanta / Radhikapur:** distinguish a performance-guarantee appropriation order from actual recovery and final termination, retaining later appeal scope.

Each case already names the needed contract, ledger, payment advice, award, acceptance, statutory filing or controlling disposition. The model's useful work is to surface that precise evidentiary need and competing explanation, then help verify newly acquired public records. The existing evidence cannot establish the source of every income stream or an entire hidden network.

## Executed dataset build

The frozen source-only dataset contains **435 documents**: 305 training, 98 development and 32 test-family documents. The initial 20 nonlegacy held-out source rows expanded to 32 through complete reviewed-case, exact-URL and substantive-party grouping. Development reserves education/water source families and their connected evidence families. Its retrieval candidate population is 403 training/development sources; all 32 test-family sources are masked until final evaluation.

The data agent manually authored **129 training questions and 35 development questions**, with explicit query-specific contrast sources. Their positive IDs cover 129 distinct training and 38 development summaries. Counterevidence requirements are explicitly annotated for 17 training and five development queries, including respondent explanations, legal limits and alternative factual explanations. These are agent-authored relevance labels, not a representative human search log or corruption labels. Some hard negatives still supply part of the wider case context; they are contrasts for the complete narrow information need.

The builder indexes no case answer or query inside source text. `sourceLineageId` identifies the original normalized URL for duplicate-aware evaluation; `groupId`/`family` is the broader case/entity split-isolation group. These have different purposes. All publication/retrieval dates remain inherited values, including 113 unknown publication dates and one unknown retrieval date. The split is not a historical forecasting backtest.

Frozen dataset SHA-256: `9bc1b278e3ee76444c047baa74a50cb2f491f2603db1533f3e72fc2b5c4b0f67`.

Authored train/development labels SHA-256: `02e3a1aade862140d40e227f354ccc314edde56fa040cf953efdf04b01bb79b8`.

Rebuild or verify with `node scripts/research-radar/next-model/build-dataset.mjs --verify`. Seven dataset tests cover exact source-only projection, duplicate-lineage separation, held-out gradient/development exclusion, contrast closure, explicit counterevidence, input hashes and unknown-date preservation.
