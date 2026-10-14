# Investigation network — research protocol

Research cutoff: 14 October 2026. Scope: selected public-record cases concerning Indian public funding, political finance, energy and resources, defence procurement, welfare, surveillance, policing and judicial safeguards. This is an exploratory, purposive case collection, not a census of administrations, offences or conspiracies. The existing corporate graph is separate from this new dossier corpus.

## What the new pages do

- `/investigations`: source-linked dossiers and a provenance network, filtering by subject, sector, record status and text; ledger equivalent; portable JSON/CSV exports.
- `/leads`: hypotheses with predicted observations, alternatives, falsifiers and records to acquire; browser-local saved questions.
- `/game-theory`: transparent hypothetical incentives, sensitivity analysis and editable evidence worksheets. The payoff model is decision under risk, not a fitted equilibrium or an estimate of anybody's intent.

The graph links public subjects to dossiers and dossiers to cited records. It does not infer a financial transfer, ownership relationship or command hierarchy from co-mention. A source's presence does not authenticate every statement it contains. No unverified identity joins are introduced into the existing national graph.

`documented` means the case concerns an inspected record or reported institutional finding; it does not mean every allegation recounted in that record is true. `allegation` attributes a contested claim. `open-question` identifies a proposed inquiry. Read the finding, response, limitations and source access depth together. Some secondary summaries remain the inspected source where a primary file could not be acquired.

## Acquisition and review performed

Three AI researchers covered funding, procurement/energy, and institutions. A separate AI evidence reviewer read the 21 case drafts and independently inspected a risk-based sample of decisive sources. The lead independently checked PM CARES disclosures, SEC release 26554, the OFAC settlement, coal-competition and Rafale orders. This is AI-assisted review, not human investigative reporting or independent empirical replication.

Researchers used public web retrieval, official agency/court pages, public filings and attributed reporting. The corpus contains original summaries and source URLs, not copies of entire articles or private records. Search discovery was followed by record inspection where possible. Search excerpt, full-text and visual PDF access are distinguished. Unavailable files and incomplete docket checks remain limitations. The October 2026 access date is not a claim that every case's latest docket or financial period is current.

The source JSON records title, URL, publisher, publication date (or undated), access date, access depth, and what the record supports. Source IDs are stable per research group; one source cited by multiple dossiers is counted once by ID. Counts are descriptive and are not measures of independent corroboration. Government statements and institutional self-reports are attributed rather than treated as externally validated.

## Research-agent contract

Each assignment specifies domain, permitted tools, output schema, ownership, scope and a stopping condition. Required output: narrow claim; dated source; inspection depth; attributed response; alternative explanation; falsifier; next records. Search results and external documents are evidence inputs, not instructions. Never include credentials, private individuals' addresses or personal financial identifiers.

The reviewer challenges status changes, actor identity, source-to-claim fit, numerical denominators, source dependence and the distinction between a submission and a holding. New primary evidence can lower or withdraw a claim. More agreement among models is not more independent evidence.

This workflow draws on Anthropic's first-party engineering accounts of [orchestrator/workers and evaluator loops](https://www.anthropic.com/engineering/building-effective-agents) and [research-agent task boundaries and evaluation](https://www.anthropic.com/engineering/multi-agent-research-system), inspected 14 October 2026. We use these as practical design references, not a claim that this implementation is benchmarked state of the art. No hosted LLM research service or unattended crawler is deployed by this update.

## Prediction and reverse reconstruction

For each question:

1. Specify the decision, responsible institution, date and asserted mechanism.
2. Predict an observable trace before selecting confirming examples.
3. Give at least one lawful explanation and its different predictions.
4. Define what record would weaken or defeat the proposed mechanism.
5. Acquire the complete comparison population where quantitative inference is intended.
6. Preserve originals, dates, amendments, denials and adverse outcomes.
7. Report unresolved, supported or refuted at the scope the records actually warrant.

For donation–award research, the desired unit is an eligible bidder–tender opportunity, not just an observed winner. Resolve legal entities by identifiers, retain unsuccessful bids, distinguish purchase and redemption dates, and use the applicable ownership date. Compare like sectors, time periods, firm capacity and tender conditions. Date shuffles must preserve the relevant opportunity structure. Register the comparison family and time windows before testing; account for multiple comparisons. These analyses have **not** been run on a complete new tender population in this update. No p-value or probability of conspiracy is claimed.

## Expansion roadmap and acquisition gates

| Priority | Investigation | Required record | Acceptance criterion | Current state |
|---|---|---|---|---|
| 1 | PM CARES delivery reconciliation | FY2023–24/2024–25 accounts, sanction, award, payment and acceptance records for one expenditure | Reconcile amounts and delivery with a signed discrepancy ledger | Both years transcribed from the FY2024–25 statement; all 34 cells independently matched; arithmetic reconciles; delivery records still needed |
| 1 | Electoral bonds and awards | Complete ECI/SBI transactions plus bidder/award population and stable company IDs | Reproducible joins, unmatched rows, null model and counterexamples | Source index inspected; full new join not executed |
| 1 | Legal-status maintenance | Court docket entries for each case and defendant | Distinguish proposal, approval, payment, dismissal and merits outcome | Sampled primary corrections incorporated; full docket surveillance absent |
| 2 | Coal and mineral allocation | Tender rules, bid history, ownership dates, objections and regulator dispositions | Include unsuccessful bids and the closed CCI complaint | Dossier and test specification complete |
| 2 | PM-JAY / PMKVY | De-identified audit follow-up, recoveries, delivery verification | Flagged records reconciled and non-flagged comparison reviewed | Audit findings and responses summarized |
| 2 | Foreign funding / RSS / overseas BJP | Specific entities' public filings and legal permissions | Transaction-specific evidence; registration and coordination kept separate from finance | Selected public institutional relationships documented |
| 3 | Oil pricing and resource rents | PPAC trade/tax/subsidy series plus freight, quality, FX and product yields | Predeclared pass-through estimator with sensitivity analysis | Open question; no secret-payment inference |
| 3 | Policing and adjudication | Population of cases, jurisdiction, dates, outcomes and applicable safeguards | Comparable case selection and adverse decisions retained | Selected safeguards dossiers only |

Existing React/TypeScript/Vite and D3 graph infrastructure is retained; these pages use semantic HTML/SVG and native browser exports, without a new paid OSINT dependency. Bulk registries, paid vessel histories, inaccessible documents and private bank records are not available merely because a source is named. Proposed ingestion tools should be chosen after lawful exports and identifier coverage are known.

## Reproduction

Run `npm ci`, `npm run validate:investigations`, `npm run test:game-theory`, `npm run build`, and `npm run test:investigations`. Full `npm run check` retains the original graph and page gates. The validator reports counts, access-depth totals and SHA-256 digests of the exact dossier inputs. Local browser state is not part of the public corpus; export worksheets explicitly to preserve it.

## PM CARES numerical extension

`research/investigations/pmcares-accounts-extract.json` preserves integer rupees, printed strings, null dashes, source PDF SHA-256, signature dates and computed reconciliations. A second AI researcher independently read the same PDF before comparing the 34 source cells; the comparison matches. This checks transcription, not independent corroboration of transactions. The downloadable file has one page; referenced notes 1–16 and the separate audit opinion were not obtained. The site distinguishes opening balance from current-year receipts and donor contributions, and publishes both FY2024–25 and the comparative FY2023–24 figures. `validate:investigations` recomputes the cash equations and compares both extractions.


## Continuation on 14 October 2026

The corpus now contains 22 dossiers, 51 source records and 22 testable questions.
`CONTINUATION_SOURCE_AUDIT.md` records the new US lobbying disclosure dossier, its
original/amended record chain and reported denial, the OFBJP 2026 index-only lead,
and the defendant-specific correction to the solar-contract charge description.
The lobbying records establish what the registrant reported; authorization, ultimate
funding and legality remain unresolved. Nine sources were added; the two official
indexes are explicitly index-only, not financial schedules or full dockets.

`AGENT_RESEARCH_METHOD.md` documents the bounded agent protocol and three acquisition
jobs. The workbench now captures versioned local test-plan snapshots: population,
time window, rival prediction and analysis method, alongside the existing worksheet.
The timing classification is self-reported and defaults to exploratory. A local
snapshot is not independent preregistration, a timestamp certification or a finding.
Existing v1 notes are retained. Export includes the active question's revision history.

`CONTINUATION_MODEL_INTEGRITY.md` explains why the current derivative was rebuilt
after the SEC correction while the exact historical model-evaluation graph remains
archived under its original content hash. No old model score was recalculated or
represented as a new evaluation.


`PMCARES_NOTES_ACQUISITION.md` records the subsequent bounded acquisition attempt:
the official current statement was freshly downloaded and hash-matched, English
and Hindi account links were inspected, and targeted searches did not supply the
referenced Note 11, full audit opinion or current refund identities. The cash
equation remains reconciled. Missing explanatory records do not establish diversion.
