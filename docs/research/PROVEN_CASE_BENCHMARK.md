# Proven-case benchmark and relation audit

Reviewed 14 October 2026. The companion data is [`proven-cases.json`](../../research/investigation-program/proven-cases.json): six historical cases, 15 inspected sources and 12 proposed tests. It is a research and evaluation design, not a completed blind experiment or a finding against any Indian actor.

The selection deliberately contains cases with established wrongdoing at a specified legal stage. That makes it useful for studying evidence development, but unsuitable for estimating how common wrongdoing is, the probability that a new actor is guilty, or a system's false-positive rate. The tests below are our proposed methods; they were not necessarily the methods historically used by investigators.

## What the records actually establish

| Case | Bounded legal anchor | Investigation lesson | Boundary that must survive a summary |
|---|---|---|---|
| Watergate cover-up | The appellate majority affirmed Mitchell, Haldeman and Ehrlichman on 12 October 1976. | Compare witness accounts with authenticated contemporaneous records. | The same record reports Parkinson's acquittal. Association with convicted participants is insufficient. [W1–W3] |
| Siemens | Different corporate defendants entered different pleas on 15 December 2008. | Reconcile intermediary services, approvals and payment purposes. | Siemens AG's criminal counts concerned accounting and controls; subsidiary anti-bribery counts must not migrate to the parent. [S1–S2] |
| Odebrecht | Odebrecht S.A. entered a corporate anti-bribery conspiracy plea on 21 December 2016. | Establish operational direction and each payment leg. | Braskem's plea was separate; combined announced penalties were not proof of completed payment. [O1–O2] |
| Roger Ng / 1MDB | Ng was sentenced on 9 March 2023 following his 2022 jury conviction. | Connect records of control, transfer, benefit and knowing conduct. | The Goldman Sachs parent DPA and GS Malaysia plea were distinct outcomes. [M1–M3] |
| Volkswagen | Volkswagen AG's guilty plea was accepted and sentence imposed on 21 April 2017. | An anomaly can become a testable investigation through replication and competing explanations. | Regulatory noncompliance and fraudulent intent are different propositions. [V1–V3] |
| Glencore Energy UK | The company was sentenced on 3 November 2022 after guilty pleas. | Tie commodity arrangements to the specific payments and their purpose. | The judge expressly excluded findings about specific individuals' culpability. [G1–G2] |

These dates describe historical legal anchors, not a claim to have checked every later appeal, related defendant or foreign proceeding. In particular, the Watergate criminal anchor is a court opinion reproduced by Justia, not a newly acquired certified court copy. The other cases use official-hosted records, but official publication does not make a prosecutor's summary equivalent to reviewing every trial exhibit.

## Discovery pathways and missing links

**Watergate.** The Senate's institutional history records a progression from arrests and reporting to testimony and demands for recordings. The archival catalogue provides conversation identifiers, but we did not listen to the audio. The appellate opinion is stronger for the bounded outcome and describes testimony, recordings and notes. A researcher should reproduce the claimed instruction in full context before asserting what a recording proves. [W1–W3]

**Siemens.** The DOJ account places Munich searches before disclosure and the cooperating internal inquiry. The admitted statement supplies mechanisms to test, while retaining an unknown-purpose payment category. That distinction is especially useful: unexplained outflow is an unresolved classification, not an automatic addition to a bribery total. The initial lead behind the searches is not established by the inspected sources. [S1–S2]

**Odebrecht.** The selected plea pages document forensic collection and cooperation, and stipulate to company-directed intermediary arrangements. They do not reconstruct the original discovery trigger. A separate ledger or communication system can suggest a record request; control over it and its connection to particular disbursements require evidence. [O1–O2]

**1MDB.** The 2016 forfeiture announcement is an allegation-stage waypoint. The subsequent Ng verdict account identifies testimony and several record categories; the sentencing account adds concealment details. We have not independently inspected the bank exhibits or cross-examination. A narrative of transactions should therefore retain the attribution to the prosecution's account, even where the jury outcome is established. [M1–M3]

**Volkswagen.** The EPA notice describes road-test anomalies, recall follow-up, investigation of technical explanations and a reported admission. The OIG report explicitly explains that an illegal defeat device need not itself demonstrate fraud. A strong measurement finding and a strong intent finding require different evidence. Neither the vehicle experiments nor code analysis were independently replicated here. [V1–V3]

**Glencore.** Judicial remarks describe internal review, document production and formal admissions; the SFO dates the public investigation announcement. Neither source identifies the first tip. Records admitted through cooperation are not evidence that an open-source researcher could have reconstructed the entire scheme from public filings alone. [G1–G2]

Where an opening trigger is unknown, the JSON says so. We do not substitute a familiar scandal narrative, or retrospectively claim that all the clues were available to an investigator at the beginning.

## Contract for an auditable relation

A network edge is a proposition with a scope, not an implication produced by a line on a screen. At minimum, retain:

| Field | Required treatment |
|---|---|
| Actor identity | Stable legal identifier where available; dated name and ownership; unresolved candidates remain separate. |
| Relation type | Distinguish identity, ownership, authority, communication, transfer, benefit, allegation and adjudication. |
| Evidence | Source ID, document version, exact page/paragraph, access depth, supported proposition and exclusions. |
| Time | Separate event, document creation, first public availability, retrieval and amendment dates. |
| Money | Direction, amount, currency, period, transaction stage and purpose classification for each leg. |
| Legal scope | Jurisdiction, defendant, count, procedural stage, date and qualifications. |
| Challenge | Rival explanation, disconfirming record, comparison population and reason to stop or withdraw. |

A path A → B → C does not automatically establish that A paid C, controlled C, knew C's conduct, or agreed with C. For an asserted transfer chain, each arrow must be supported and amounts reconciled; a shared source document is not a transfer. For an asserted coordination chain, add evidence of communication or agreement and the relevant act. Ownership can support an authority inquiry but is not itself a finding of individual intent.

Financial totals need a stage ledger. A commitment, award, payment, onward transfer, recovery and penalty cannot simply be added. Track unmatched entries, reversals and unknown purposes. Keep account holder, beneficial owner, controller and ultimate recipient distinct. Do not publish private account identifiers merely to make a diagram look precise.

Each source has a `sourceFamily`. A press release, its attached plea and five reports repeating it are not seven independent confirmations. Even separate agencies may share the same bank record or witness. Independence belongs to the evidence-generation process, not to the number of URLs or AI reviewers.

The graph should preserve denials, adverse decisions, amendments and withdrawals as first-class records. An acquittal means the charge was not proved; it is not a general certificate that every surrounding fact is false. A settlement or DPA has its own terms and must not be silently promoted to a guilty plea. An appellate dissent must not be presented as the holding.

## Comparisons that can defeat a proposed mechanism

The companion JSON gives two tests per case, each with required records, comparator, rival explanation, falsifier and stopping rule. They cover:

- Communication–act corroboration and individual attribution.
- Actual intermediary services and transaction-purpose classification.
- Operational control and noncircular resolution of coded identities.
- Transfer-leg reconciliation and knowing control circumvention.
- Independent performance measurement and remedy retesting.
- Commodity price/service reconciliation and corporate-versus-individual responsibility.

Before executing any analogous Indian inquiry, specify the observational unit and eligible population. A procurement analysis needs unsuccessful eligible bidders and comparable opportunities, not only donors who won contracts. A resource-price comparison needs quality, delivery, freight, credit and contract terms. A welfare discrepancy needs definitions, reporting lags, reversals and delivery verification. Keep missing records explicit instead of assuming they were deliberately suppressed.

Game theory can help articulate rival predictions: a lawful actor, an opportunistic actor and an actor protecting a reputation may produce overlapping public behaviour. Specify which accessible record would discriminate those accounts. A plausible incentive, matching timing or a post-hoc strategy narrative does not establish agreement. The objective of an investigation is to discriminate explanations, including clearing a suspected link, rather than to make a selected conspiracy “win.”

## Proposed blind evaluation

This benchmark has not been evaluated. A defensible evaluation should proceed as follows:

1. Freeze case packets with a declared information cutoff, content hashes and source lineage. Keep subsequent evidence and outcome keys outside the researcher's access.
2. Add separately labelled lawful, unresolved, acquitted/dismissed and misleading-association controls matched on sector and observable complexity. Do not treat all these labels as equivalent factual negatives.
3. Randomize packets and hide names where practical. Famous cases create recognition and pretraining leakage; anonymization alone does not make them a true forward test. Use genuinely later, previously unseen records for prospective claims.
4. Require a bounded claim, typed evidence chain, missing links, lawful rival, discriminating prediction, falsifier, acquisition request and abstention decision for every packet.
5. Score source entailment, entity resolution, legal-stage correctness, unsupported asserted relations and willingness to withdraw a contradicted claim. Separately score whether proposed record requests would distinguish the hypotheses.
6. Use independent review with adjudication of disagreement. Report denominators, abstentions, unresolved cases and stage-specific errors. Multiple AI judgments are not additional documentary corroboration.

Known positive cases alone cannot establish specificity or calibration. No probability-of-guilt, “conspiracy score,” claim of state-of-the-art performance or numerical accuracy estimate follows from this document. The useful deliverable here is a testable review contract and source-bounded examples.

## Inspected source register

The JSON records publication/access dates, exact inspection depth, supported propositions, limitations and source families. “Selected” means only the named sections were examined. Search discovery and an accessible URL are not counted as full reading.

| Key / JSON source ID | Record and access |
|---|---|
| W1 / `watergate-senate-history` | [Senate institutional history](https://www.senate.gov/about/powers-procedures/investigations/watergate.htm), historical narrative read. Undated page. |
| W2 / `watergate-haldeman-opinion` | [Haldeman appellate opinion](https://law.justia.com/cases/federal/appellate-courts/cadc/4104248/559-f2d-31.html), selected majority sections read. Primary text on third-party host. |
| W3 / `watergate-nara-tape-index` | [NARA trial-tape catalogue](https://www.nixonlibrary.gov/watergate-trial-tapes), introduction and selected abstracts read; audio not reviewed. Undated page. |
| S1 / `siemens-doj-pleas` | [DOJ plea announcement](https://www.justice.gov/archive/opa/pr/2008/December/08-crm-1105.html), full release read. |
| S2 / `siemens-statement-offense` | [Admitted statement of offense](https://www.justice.gov/archive/opa/documents/siemens-ag-stmt-offense.pdf), selected paragraphs and pages read. |
| O1 / `odebrecht-doj-plea` | [DOJ plea announcement](https://www.justice.gov/archives/opa/pr/odebrecht-and-braskem-plead-guilty-and-agree-pay-least-35-billion-global-penalties-resolve), relevant full release text read. |
| O2 / `odebrecht-plea-agreement` | [Plea and Attachment B](https://www.justice.gov/media/870651/dl?inline=), downloaded and selected pages OCR-read; Attachment B opening page visually checked. |
| M1 / `1mdb-2016-forfeiture` | [2016 forfeiture announcement](https://www.justice.gov/archives/opa/pr/united-states-seeks-recover-more-1-billion-obtained-corruption-involving-malaysian-sovereign), full release read; complaints not independently reviewed. |
| M2 / `1mdb-ng-verdict` | [Ng verdict announcement](https://www.justice.gov/usao-edny/pr/former-goldman-sachs-investment-banker-convicted-massive-bribery-and-money-laundering), release read. |
| M3 / `1mdb-ng-sentence` | [Ng sentencing announcement](https://www.justice.gov/usao-edny/pr/former-goldman-sachs-managing-director-sentenced-10-years-prison-his-role-massive), release read. |
| V1 / `vw-epa-notice` | [EPA notice](https://www.epa.gov/sites/default/files/2015-10/documents/vw-nov-caa-09-18-15.pdf), downloaded; pages 4–5 OCR-read, page 4 visually checked. |
| V2 / `vw-epa-oig` | [OIG report 18-P-0181](https://nepis.epa.gov/Exe/ZyPURL.cgi?Dockey=P100UHV8.TXT), introduction and printed pages 1–7 read. |
| V3 / `vw-doj-sentence` | [DOJ sentencing announcement](https://www.justice.gov/archives/opa/pr/volkswagen-ag-sentenced-connection-conspiracy-cheat-us-emissions-tests), full release read. |
| G1 / `glencore-uk-sentencing` | [Official sentencing remarks](https://www.judiciary.uk/wp-content/uploads/2022/11/Sentencing-Remarks-Glencore.pdf), selected paragraphs read. |
| G2 / `glencore-sfo-case` | [SFO case timeline](https://www.gov.uk/sfo-cases/glencore-group-of-companies), full case page read. |

Two source inconsistencies are retained rather than silently normalized: the Ng verdict and sentencing releases describe trial duration differently, so duration is unused; the SFO page's prose compresses plea and penalty chronology, so the dated timeline and judicial remarks control. Publication dates are document dates, distinct from later website update dates. No archived PDF bytes are committed in this package; exact inspected file hashes for the two locally downloaded scans are recorded in the JSON for future acquisition checks, not as a promise that every live URL is immutable.

## Validation completed

A focused structural check passed for required schema fields, unique source/case IDs, date syntax, source-reference closure, legal-outcome fields, all 12 test contracts, and report/source-register parity. The three most consequential corporate outcome boundaries were reread against the Siemens announcement, Volkswagen sentencing announcement and Glencore judicial remarks. These checks validate this research package's structure and selected source fit; they do not constitute the proposed blind evaluation.
