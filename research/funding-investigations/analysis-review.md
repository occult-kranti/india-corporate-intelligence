# Discovery and identity review

This is a qualitative review of a **fixed 13-question lexical demonstration**, not a labelled accuracy benchmark or model promotion. Questions were saved before the batch in `analysis-queries.json`. Every source/entity/record candidate, including zero scores and off-topic results, is retained in losslessly compressed raw output. Existing documents were indexed from retained summaries, not all reread in this round. No new model was trained and no probabilities were estimated.

## What the demonstration establishes

The tool can load the complete existing multi-sector registry and five new research streams without changing frozen experiments. Source IDs, source metadata, typed original edges, responses and acquisition questions remain inspectable. It does **not** reliably place every decisive or corrective source in the first five results. Higher scores mean lexical overlap under BM25, not truth, money-flow continuity, public-interest importance or likelihood of wrongdoing.

| Fixed question | Observed candidate behaviour | Required interpretation |
| --- | --- | --- |
| Military skills/DIAV | New CAG PMKVY audit and Ministry response appear first; general older military-budget records follow. | Good acquisition starting points; no amount to a specific training provider is established. |
| Defence offsets | Original historical recovery answer and 2024 committee statement lead; other arms-contract sources follow. | Keep dates and cohorts separate; “disposed”, “accepted”, “imposed” and “collected” must not be exchanged. |
| PM CARES donors/refunds | Prior FY2024–25 and FY2023–24 accounts rank highly, followed by trust-deed and donor context. | Repeated source IDs/URLs can refer to one original; no donor-to-contract allocation is inferred. |
| Smart-meter waterfall | Model guidance, another supplier's ICRA note and the Step-Six CRISIL rationale lead; a Kochi water-contract source also enters the top five. | Generic guidance and another SPV do not prove this contract's terms. Inspect exact borrower and agreement. |
| Airport revenue | Two representations of the same official six-airport receipt material lead; unrelated Tamil Nadu loan material also appears. | Two records of one source are not independent corroboration. Distinguish upfront, annual and passenger-linked fees. |
| BPSL debt | Correct new Supreme Court judgment leads, but a **Bhushan Steel** approval also ranks highly. | Bhushan Steel and Bhushan Power and Steel are different entities/cases; a similar-name ranking is not an identity join. |
| NDTV corrections | 2022–26 corporate transaction disclosures dominate; the new May 2026 SEBI corrective order is outside the top five (source rank 12 in the first complete run). | Serious counterevidence-retrieval limitation. The case reader must explicitly retain the later legal posture. |
| Police Safe City | Delhi PAC/action-taken material and the new MHA status table appear. | Check definitions and dates; the conflicting camera counts require reconciliation, not a loss total. |
| Health payments | PM CARES/RTI and unrelated Michel material crowd the top five; CAG PMJAY claims material appears, while the new Bihar audit is source rank 49 in the first complete run. | Retrieval conflates money/accountability vocabulary across sectors. Do not build a health allegation from the ranking alone. |
| School coverage | An unrelated electoral-bond article ranks first; the official school-count answer ranks second and UDISE release fourth. | Off-topic output is preserved. School stocks are not a closure register or a population-adjusted access measure. |
| Water-contractor trail | DJB bail and ED allegation sources lead; Odisha procurement and unrelated health/PMNRF records also appear. | Use exact parties and proceedings; keep bail, allegations and actual payment records distinct. |
| Border attribution | Generic budget/portal/book records dominate, with a contemporaneous denial but no authoritative finding in the leading set. | This question is inadequately served by lexical retrieval. No staging/false-flag or government-funding conclusion follows. |
| Welfare disbursement | Aasara audit material appears, followed by NGO, tender, disability-grant and food-stock contexts. | Broad discovery only; a coherent scheme-specific entitlement/payment denominator remains unassembled. |

The final batch uses the same question file and scoring rules after source corrections. First-run raw output, summary, hashes and rerun reason are separately retained. A source-capture correction is not a model-selection opportunity; no question or ranking algorithm is adjusted to improve these examples.

## Identity-review candidates

The full-registry pass groups exact casefolded, whitespace-normalized entity labels across namespaces. It does not remove company suffixes, merge acronyms, guess subsidiaries or create edges. All candidate groups carry `approved:false` and `edgeCreated:false`. Most broad cross-sector paths otherwise seem possible merely because CAG, a court, a ministry or a bank appears in many cases. These are shared institutional roles, not evidence the cases form one scheme.

Candidate families involving new research include:

- **GVPR Engineers Limited:** retained Mumbai CCTV and financing records alongside the new police appointment record. Exact company/contract identifiers and corporate filings can support an identity crosswalk, but sharing the company does not join separate projects' payments.
- **NDTV / RRPR / VCPL:** new legal correction alongside existing transaction filings. Join only their exact legal identities; preserve dates and the distinction between lender rights, unexercised warrants and later control.
- **PM CARES / KKC & Associates:** new account/refund gaps and existing finance/justice sources. An audit-firm identity or a fund's public office association is not proof of access, personal benefit or allocation to a contractor.
- **Power Finance Corporation / Asian Development Bank:** lenders recur in multiple sector projects. A shared lender is not a transaction between the projects and cannot establish common misuse.
- **Ministry of Defence / DIAV / HAL:** distinguish the umbrella ministry, a directorate and a company. Shared oversight permits institutional comparison; it does not transfer an audit finding or allegation between entities.
- **CAG / courts / ministries:** widespread repeated labels are useful reader-navigation candidates but weak causal evidence. No “corruption network” is inferred from oversight of several separate cases.

No new cross-namespace identity edge is approved by this automated pass. A lead may approve a separate identity-only crosswalk after checking identifiers, original documents and validity dates; its financial meaning must remain null. Current source-specific networks already contain useful multi-hop documentary paths without asserting these candidate merges.

## Six actual path demonstrations

The raw batch includes bounded three-hop navigations from the Sikkim Power Department, Adani Transmission Step-Six, PM CARES, DIAV, DIAL and the Ministry of Home Affairs. Source assertions and arrow direction are retained, including when the reader traverses backwards. DIAV and DIAL explicitly enable context edges; other examples exclude them. Output caps and truncation flags remain visible. These demonstrations recover authored connections and attached missing-record requests; they are not discoveries of new transactions, proof of a continuous payment chain or estimates of wrongdoing.

## Next improvement justified by these failures

Use source-backed case readers to foreground adverse and corrective records now. Before changing retrieval, construct a new development set with independent relevance review, exact legal-entity distinctions, source-family deduplication and required counterevidence. Evaluate a documented candidate change against the same baseline on fresh reserved questions. Do not silently hand-pick sources and then report that the automated retriever found them, and do not reuse this exposed demonstration as an independent test.

The searchable text is the registered source title/excerpt/summary, entity label/identity basis and retained record title/summary/question fields. It does not index every word of original PDFs, nested claim worksheets or loan agreements. The ranking corpus combines those record kinds; the displayed “top sources” is their source-only subsequence, not a separate source-only BM25 fit. This scope helps explain cross-domain noise and does not excuse it. Improving that design belongs to a new declared experiment, not a silent reranking of the saved demonstration.

## Final frozen-input receipt

The final run completed on 9 October 2026 UTC after the lead explicitly froze all five streams. Every stream hash matches the assembled bundle. The unchanged 13 questions each retain 11,700 candidates: 152,100 ranking rows in total, including zero scores. Six bounded demonstrations return 54 authored paths. The 107 identity candidate groups, including 45 involving new streams, remain unapproved and create no edges. The 53 exact-URL duplicate groups are disclosed; URL differences do not establish independent corroboration.

The final ranking still places the new NDTV corrective source at source rank 12 and the new Bihar PMJAY audit at rank 49. The school query still leads with an unrelated electoral-bond source. These observed failures have not been tuned away. No accuracy, guilt probability, continuous cash trail or aggregate monetary amount is estimated.

`analysis-final-verification.json` records compressed and decompressed output hashes, the query and corpus fingerprints, standalone path citation closure and bundle-hash agreement. Seventy-one adversarial and functional tests passed (43 validator, 17 trace, 11 batch). These checks establish reproducible output and structural controls, not the truth of each source or adequacy of retrieval.
