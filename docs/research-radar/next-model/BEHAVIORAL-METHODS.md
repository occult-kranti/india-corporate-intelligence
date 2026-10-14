# Behavioral methods for an investigative evidence model

Research reviewed **8 October 2026, America/New_York**. This is an AI methods-panel synthesis, not an assessment by hired human psychologists or a claim that the model has absorbed entire books. The companion [source register](../../../research/research-radar/next-model/method-sources.json) records 13 inspected works, reading scope, dates, locators and access limits. The proposals below are implementation requirements and evaluation ideas; a proposal is not evidence that a feature has shipped.

The useful psychological objective is to improve the investigator's reasoning: resist confirmation bias, ask questions that discriminate between explanations, preserve uncertainty and record mistakes. A person's previous allegations do not establish that they committed them, possess a criminal disposition or will commit a future offense. Role histories can identify legally relevant responsibilities, signed decisions and conflicts disclosed in records. They cannot justify personality, mental-health or guilt scores.

## Panel round 1: what the literature supports

| Perspective | Evidence and recommendation | Transfer limit |
| --- | --- | --- |
| Cognitive psychology | Heuer's *Psychology of Intelligence Analysis* (1999), chapters 5, 8 and 13, and Nickerson's confirmation-bias review (1998): record rival explanations, diagnostic evidence and the analyst's original view before learning the outcome. | These works explain human reasoning problems; naming a bias does not demonstrate that an AI prompt removes it. |
| Experimental challenge | Dhami, Belton and Mandel (2019) randomly assigned 50 intelligence analysts to an ACH condition or comparison condition. Their results found mixed evidence of debiasing and possible increased inconsistency/error. | Do not turn an ACH consistency matrix into a supposedly validated probability or simply add up suspicion marks. |
| Forecasting | Mellers et al. (2014) found benefits from probability training, teaming and tracking in a geopolitical tournament. *Superforecasting* (2015; authorized publisher summary inspected) translates these ideas into accessible practice. | Parallel agents sharing one base model, corpus and prompt family are not independent forecasters; a vote is not independent corroboration. |
| Prospective evaluation | ForecastBench (ICLR 2025) evaluates unresolved future questions. Its October 2025 methodology addendum addresses comparisons when question sets differ. | Its current benchmark results are not performance measurements of this Indian public-finance model. Its difficulty adjustment has assumptions and is unnecessary for our small identical-question comparisons. |
| Causal methods | Hernán and Robins, *Causal Inference: What If*, author-hosted **19 August 2026** edition, sections 1.5, 3.6, 22.4: distinguish association from intervention effects; align eligibility, start of follow-up and outcomes. | A relationship graph or chronological sequence does not establish causal influence. A target-trial description alone does not satisfy identification assumptions. |
| Journalism | UNESCO's *Story-Based Inquiry* (2011), chapter 2 and quality-control chapter: break a story hypothesis into claims and attempt to verify or disprove each. | A coherent narrative is a reporting plan, not additional evidence. Neither confident prose nor a dense network should change a claim's status. |
| Procurement integrity | OCP's 2024 guide and OECD's 2025 bid-rigging detection guidance define measurable warning signs and explicitly distinguish them from proof. | The source universe, procurement rules and ordinary market explanations must be checked before computing or interpreting a flag. |

## Decisions after the literature challenge

1. **Separate four tasks.** Retrieval asks which records answer a question; extraction asks what a record actually says; reconstruction proposes explanations of past observations; forecasting estimates a precisely defined future observation. A retrieval improvement does not validate the other three.
2. **Make competing explanations auditable, without a suspicion sum.** For each disputed mechanism retain an ordinary-process explanation, a data/identity-error explanation where plausible, and the adverse explanation. Mark evidence as supports, challenges, nondiagnostic or unknown with a reason. Different explanations need not be mutually exclusive. Do not normalize scores across a non-exhaustive hypothesis list.
3. **Use observable targets.** A dated tender cancellation, contract amendment, recovery statement or delivery acceptance can be resolved against named records. Hidden intent, whether someone is a puppet, an undisclosed bribe or a universal source of all income cannot be resolved from our corpus and are not prediction labels.
4. **Do not train a truth or guilt classifier from allegations.** Use allegations, responses, findings, reversals and missing records as distinct evidence states. Train retrieval to recover the right state and timestamp, including counterevidence and legal/accounting distinctions. Unknown is not a negative example.
5. **Prioritize the next discriminating record.** Prefer an award order, acceptance certificate or beneficiary ledger that can distinguish two live explanations over another article copying the same statement. Record acquisition cost and accessibility separately. This is a qualitative research priority, not a calculated expected monetary value or probability of wrongdoing.
6. **Keep a genuinely forward ledger.** Freeze question, feature availability, model version and resolution rules before the outcome. Never silently convert a reconstruction performed after the event into a successful forecast. The previous exposed retrieval test remains a regression set for subsequent work.
7. **Publish actual failure cases.** Count missed counterevidence, incorrect identity joins, legal-stage confusion, post-cutoff leakage and unsupported causal language separately from nDCG. A model with better average retrieval but more unsupported joins is not suitable for automatic graph publication.

## Model contract: evidence, alternatives and time

Each analytic record should support the following fields. These names describe the methods contract; adapters can map them to the repository's existing schema.

```json
{
  "questionId": "stable-versioned-id",
  "task": "reconstruction | prospective-forecast | evidence-retrieval",
  "targetUnit": "contract | project | program | institutional-decision",
  "populationDefinition": "specified procurement category, jurisdiction and entry window",
  "predictionAsOf": "ISO-8601 timestamp",
  "hypotheses": [
    {"id": "ordinary-process", "claim": "testable explanation", "disproof": ["specific observation"]},
    {"id": "adverse-mechanism", "claim": "testable explanation", "disproof": ["specific observation"]}
  ],
  "observations": [{
    "sourceId": "registered-source-id",
    "sourceLocator": "page, paragraph, table or record identifier",
    "sourceFamilyId": "common original statement or document lineage",
    "eventAt": null,
    "publishedAt": null,
    "firstAvailableAt": null,
    "availabilityBasis": "archive capture | dated original release | unknown",
    "retrievedAt": "ISO-8601 timestamp",
    "assessment": "supports | challenges | nondiagnostic | unknown",
    "hypothesisId": "ordinary-process",
    "reason": "what this observation distinguishes and what it cannot"
  }],
  "resolutionRule": "unambiguous observable event and authoritative record",
  "resolutionDeadline": "ISO-8601 timestamp",
  "publicationGracePeriodDays": null,
  "outcome": "unknown",
  "probability": null,
  "nextRecord": {"record": "specific document", "holder": "institution", "discriminates": ["hypothesis IDs"]}
}
```

`eventAt` is when an action occurred; `publishedAt` is the document's asserted publication date; `firstAvailableAt` is the earliest availability supported by a dated release/archive; `retrievedAt` is when our system acquired it. They are not interchangeable. A later article reporting an earlier event is not available at the earlier date. A printed date alone does not prove that a mutable webpage contained the same text then. Preserve document hashes and corrected versions. If historical availability is unknown, exclude the feature from a strict historical backtest or explicitly label the whole exercise retrospective and exploratory. Never invent an early availability time from an event date.

Multiple websites repeating one ministry release contribute one underlying source family. Independent publishers do not automatically supply independent information. Independence of sources, independence of statistical cases and independence of agent reasoning are three different claims.

## Variables worth collecting and verifying

Variables below are candidate institutional measurements, **not measurements already computed for the whole country**. Use `null` plus a missingness reason when the inputs are unavailable. A missing value is not zero. Specify the legal rules effective on the decision date; later rules must not be applied retroactively without legal support.

| Variable | Operational definition and required record | Rival explanation / verification |
| --- | --- | --- |
| `eligibleBidCount` | Number of eligible bids under the published evaluation rules, with tender ID and bid-opening/evaluation record. Retain total received separately. | Specialized capacity requirements, lawful exclusions or incomplete publication. Verify the evaluation report. |
| `singleBid` | Whether the complete bid-opening record reports one submitted bid; define the counting stage explicitly. | A thin market or urgent need is not necessarily manipulation. Compare same-category opportunities. |
| `noticeDays` | Closing timestamp minus original publication timestamp; preserve extensions and time zone. | Lawful emergency route or correction. Check the applicable minimum and actual public notice history. |
| `noncompetitiveProcedureShare` | Count or value share within a complete, fixed buyer/category/time denominator; report each separately. | Framework call-offs and lawful single-source provisions. Read method justifications. |
| `supplierAwardShare` | Supplier's awarded amount divided by all observed awarded amount in a stated comparable market/window. | Expertise, capacity or incomplete coverage. Require stable legal IDs and comparable units/currencies. |
| `marketConcentration` | Sum of squared supplier award-value shares in that same defined market. | Market structure and project size can explain concentration. This is not a corruption probability. |
| `repeatPairOutcome` | Repeated winner/loser patterns for the same verified bidder pair across comparable tenders. | Unequal capabilities or geography; compare participation opportunities and scope. |
| `sharedBidMetadata` | Original-file author, IP, timestamp or formatting matches, preserving acquisition and exact match rule. | A common filing agent, gateway, standard template or public computer. A shared IP does not establish common control. |
| `verifiedCommonOwner` | Overlapping beneficial owner/director IDs in authoritative filings, with ownership-validity dates and exact entity matches. | Lawful group structure; overlap alone does not prove collusion or improper influence. |
| `awardToContractDelta` | Contract value minus award value, same scope/currency/tax basis and version. | Negotiated scope, taxes, quantity or indexation. Require change orders and original documents. |
| `amendmentValueRatio` | Cumulative net monetary amendments divided by original contract amount, with cancellations and revisions deduplicated. | Inflation, approved scope changes or unforeseen engineering conditions. Check approval authority and quantities. |
| `paymentStageGap` | Budget authorization, commitment, invoice, actual disbursement and accepted delivery recorded as separate states. | Approval is not expenditure; a lease commitment is not aircraft purchase price. Do not join stages without IDs. |
| `deliveryDelayDays` | Actual acceptance date minus the valid contractual milestone date; retain revisions. | Force majeure, site access, import restrictions or buyer delay. Missing acceptance is unknown, not failed delivery. |
| `quantityAcceptanceGap` | Contracted, invoiced and independently accepted quantities in the same unit and reporting period. | Partial shipments, commissioning lag or corrections. Require acceptance/measurement records. |
| `recoveryByVintage` | Recoveries linked to the same underlying receivable/loan/write-off vintage. | Annual recoveries and annual write-offs may concern different cohorts; their ratio is not a recovery rate. |
| `beneficiaryCoverageGap` | Eligible population minus delivered services, with aligned date, geography and eligibility criteria. | Demographic shifts, migration, changed criteria or stale registers. No individual welfare/fraud score. |
| `auditResponseLagDays` | Response or action-taken publication date minus the specified audit recommendation date. | Publication lag and different response deadlines. An absent website copy is not proof of noncompliance. |
| `legalDisposition` | Dated procedural state: allegation, charge, interim order, bail, acquittal, quashing or final finding, with scope. | Bail and FIR quashing have different legal meanings; do not generalize one case's disposition to others. |
| `ruleVersion` | Gazette instrument ID, notification date, publication/commencement date and transition provisions. | Proposal, draft, notification and effective rule may differ. Preserve the original operative text. |
| `publicRoleOverlap` | A person's documented official role at the specific decision date and explicit signing/approval authority. | Attendance, shared party affiliation or a meeting does not establish that person approved or benefited from an award. |
| `publicationCoverage` | Share of expected records actually obtained under a declared acquisition plan. | Sources may be nonpublic, removed or delayed. Coverage describes our evidence, not the institution's honesty. |
| `contradictionStatus` | Two sourced claims about the same entity/event/unit disagree; retain both with version dates. | Units, scope, rounding or later corrections can resolve apparent conflict. Train to retrieve the correction. |

Sources OCP and OECD support the procurement-indicator families; the exact fields and cautious interpretations here are proposed local design choices. No threshold is universal. Use procurement-law/category baselines and independently reviewed examples before setting thresholds, and disclose population coverage.

## Following money and reconstructing the past

Treat money flows as typed transactions with a payer, payee, amount, currency, date or period, instrument, accounting stage and source locator. Ownership/control links are separate from money transfers. A valid chain might be `budget authority → award → executed contract → disbursement → named subcontractor invoice → accepted work`, but each arrow requires its own evidence. A missing arrow stays a documented gap. A common director, an office visit or embedding similarity does not fill it.

For each candidate path ask four questions: (1) are the endpoints exact legal entities, (2) does the source establish this relation rather than merely name both parties, (3) was the relation valid at the event date, and (4) do amounts and accounting stages reconcile? Never sum an award, its contract and its invoice as three separate transfers. Aggregate transfers only when identifiers, scope, currency conversion and exclusions prevent double counting.

Abduction asks which explanations could account for known observations. Historical reconstruction can produce ranked **questions to investigate**, not a recovered hidden fact. Causal claims require an identified intervention/exposure, outcome, confounders, selection mechanism, assumptions and a suitable design. The author-hosted 2026 *What If* text is useful precisely because it distinguishes these tasks.

Institutional perspective-taking is a search aid: what records would a procurement officer, auditor, supplier, treasury official or affected community normally hold; what ordinary incentives and constraints could explain the result; and which records would contradict that explanation? It does not simulate a named person's mind or teach concealment. Hypotheses should expose audit traces and oversight gaps, not provide instructions to evade controls.

## Forward targets and honest resolution

| Candidate target | Resolution evidence | What does not resolve it |
| --- | --- | --- |
| A specified tender receives a cancellation order within 90 days. | Matching procurement ID, official cancellation publication, preserved version. | A press allegation, a missing search result or a different tender. |
| A specified contract receives a published value amendment by its next milestone. | Dated executed amendment linked to that contract and scope. | Proposed approval or a new unrelated package. |
| A regulator publishes a final disposition for a named proceeding by a date. | The identified proceeding's operative final order. | Hearing dates, bail in another proceeding or commentary about likely relief. |
| A buyer records acceptance of a specified quantity by a deadline. | Signed/public acceptance record with the agreed counting rule. | Dispatch, manufacture, inauguration or a promised delivery. |
| A published audit response reports a specified recovery by a date. | Action-taken/recovery record identifying the same finding and vintage. | A commitment to recover, gross annual recoveries or an unmatched amount. |
| A welfare program publishes reconciled district payment totals for a specified period. | Versioned program statement and reconciliation scope. | A budget allocation, beneficiary application count or a national figure. |
| A concession extension becomes legally executed by a specified date. | Signed/operative concession instrument and effective term. | A comfort letter, processing recommendation or negotiation report. |
| An official rule change comes into force by a specified date. | Operative gazette instrument and commencement provision. | A consultation, draft circular, press speculation or notification whose effect is deferred. |

Fix whether the target is **the event itself** or **public publication of a record**. If the target is actual payment, absence of a payment record does not prove nonpayment. If the target is publication by a named official channel, a preregistered archive/completeness protocol may permit a negative resolution. Otherwise unresolved, inaccessible, ambiguous, withdrawn and right-censored outcomes remain distinct. Any grace period for delayed publication is chosen in advance.

A selected collection of 23 interesting cases has no defensible national base rate. Establish a prospectively enrolled reference class, including ordinary outcomes, before estimating calibrated local probabilities. Pre-register jurisdiction, category, entry rule, horizon, observation process and exclusion reasons. Avoid selecting only contracts already in the news or under investigation. A model's confidence, a panel majority or embedding similarity is not a replacement denominator.

## Validation and research priority

Use paired comparisons on the same future questions and feature-availability dates. If probabilities become estimable, report binary Brier score `mean((p-y)^2)`, log loss with a declared numerical convention, calibration/reliability plots, resolution/abstention coverage and a matching reference-class baseline. Count correlated questions or repeated monthly predictions as clustered observations. With few cases, report raw per-case errors and the uncertainty rather than precise-looking calibration curves. Never score unknown outcomes as zero.

ForecastBench's difficulty-adjusted Brier method is relevant when different models answer different evolving sets; its own section 6 notes domain-skill and estimation assumptions. Do not copy that adjustment onto a tiny selected corpus to make a leaderboard appear rigorous. For this project, identical-question comparisons and prospective capture are the first requirements. Halawi et al. (2024) supplies a useful retrieval → reasoning → aggregation architecture, but its historical language-model results do not transfer to MiniLM, which is an embedding encoder.

For acquisition planning, record **which rival explanations a document could separate**, whether an authoritative record is likely available, the acquisition effort, and expected public-interest value. Initially use these as transparent editorial categories. Formal expected information gain would require defensible hypothesis probabilities and likelihood models; those do not currently exist. Do not label a hand-weighted priority score as expected information gain.

Training examples should include paired questions that differ only in a meaningful condition: committed versus paid, past versus current disposition, dispatch versus acceptance, parent versus subsidiary, approval versus executed concession, same-year totals versus matched loan vintage. Include counterevidence and insufficient-evidence answers. Verify actual source passages before creating labels; model-generated labels need a separate review record. Run adversarial cases for name collisions, duplicate press releases, later corrections and missing dates. Preserve a new independent holdout before training, and keep any test-driven revisions explicitly exploratory.

## Reading and access decisions

- **Heuer (1999)** and **UNESCO (2011)** were inspected from legally public full texts; selected relevant chapters were read, not memorized or wholesale inserted into training.
- **Hernán and Robins** was checked against the author page and its **19 August 2026** PDF; the title page confirms this edition. The April 2024 search-index copy was superseded for the methods review. The book is freely readable but copyrighted; no full text is committed or relicensed.
- **Superforecasting** uses the authorized publisher description only. The book was not downloaded or claimed as fully read. Empirical claims rely on the original Mellers paper's inspected abstract rather than publisher endorsements.
- **ForecastBench** was checked against official current documentation and the original methodology PDF. A `2026/02` university upload path was not treated as a new 2026 paper. The separate `/changelog/` URL did not yield a usable result; no claim relies on it.
- No clinical diagnoses, psychological profiles of named actors, private banking records or undisclosed intelligence are used by this methods work. No external interview, information request or contact with an authority was sent.

For precise source URLs, reading scope and limits, see [method-sources.json](../../../research/research-radar/next-model/method-sources.json). The strongest next improvement is an audited temporal evidence and outcome dataset; training longer cannot substitute for it.
