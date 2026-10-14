# Coordination hypotheses: research contract

Review date: 2026-10-14. Primary scope: Modi Union administrations from 2014-05-26 to review date; earlier material is explicitly dated context. This is a selected investigation, not complete coverage or a discovery of secret crimes.

Sources are public material actually inspected. Do not infer guilt, secret intent, coordinated wrongdoing, a transfer, or attack sponsorship from officeholding, benefit, common timing, or association. Do not manufacture accusations by attaching “alleged”. Keep Union and state authority distinct. Do not provide operational instructions for committing or concealing wrongdoing. Analyze institutional choices and the records that distinguish them. Preserve prior data and frozen model receipts.

Each researcher owns one stream JSON, matching MD log, and raw subdirectory in `research/hypothesis-lab/`. IDs begin `hl:<track>:`. Tracks: `political-finance`, `resources-contracts`, `oversight-services`. Target three deeply sourced files each, with at least one newly inspected original per file and contrary evidence/current disposition. Actual inspection beats quantity. No borrowed claims silently promoted from the old corpus. Exa Search and source-quality guidance apply. Search window ends 14 October 2026; log later-date or inaccessible results as excluded. Save exact acquired extracts/bytes with SHA-256, URL, access time and inspection scope; short excerpts only from copyrighted reporting. Never call retrieval of a whole PDF full reading unless it was read.

## JSON schema

Use the existing `FundingSource`, `FundingEntity`, `FundingEdge`, `FundingCase` shapes from `src/data/fundingInvestigations.ts`, with all their required fields. `resolved:true` only for source-supported identities. Amounts may be null; preserve stage, currency, unit, period and response. Entities/edges/sources referenced by a case must exist in its stream. Every case requires `decisionAnalysis`. Top-level:

```
{ schemaVersion:1, track, reviewDate:"2026-10-14", scope, searchLog:[], sources:[], entities:[], edges:[], cases:[], coverage:[], rejectedJoins:[], roadmap:[] }
```

Each case adds REQUIRED `hypothesis`:

```
{
  proposition: "A precise, unproved structural hypothesis, not an assertion of conspiracy",
  assessment: "open|narrowed|contradicted|supported-pattern",
  assessmentReason: "What the examined records establish and do not establish",
  jurisdiction: "Formal authority / Union versus state responsibility",
  rules: [{title, operativePeriod, requirement, sourceIds:[]}],
  alternatives: [{id, label, explanation, discriminatingRecord}],
  tests: [{id, question, expectedIfTrue, expectedIfAlternative, observation, result:"unresolved|supports|narrows|contradicts", sourceIds:[], nextRecord, holder}],
  proposedLinks: [{id, from, to, question, missingEvidence, disconfirmingEvidence, sourceIds:[]}],
  chronology: [{date:"YYYY-MM-DD", event, knowledge:"contemporaneous|later-outcome", sourceIds:[]}],
  comparison: "Explicit matched comparison/baseline needed; avoid selection on outcome",
  nextReview: "YYYY-MM-DD",
  inferenceLimits: ["Retrospective reconstruction, not a preregistered prediction", "..."]
}
```

At least three alternatives: coordination/misconduct mechanism as an explicitly unproved proposition; lawful institutional explanation; data/identity/measurement error. At least two discriminating tests. `supported-pattern` means a narrow observable pattern, never proof of conspiracy. Proposed links are separate from recorded edges, must have missing and disconfirming evidence, carry no financial amount, and are hidden from the evidence map unless a reader explicitly enables a question layer. Do not duplicate a documented edge as a proposed link. Actors and decision options describe authority, incentives and observable implications, not secret intent or evasion tactics. Prefer institutional nodes over speculative personal blame. Date rules in force at the decision; don't apply later law retroactively. All nested source references must resolve; claim-level citations retain attributions and responses.

## Panel and publication

Round 1: research lead sets the contract; specialists propose themes; adversarial reviewer identifies causal/identity/chronology traps; designer shapes the page. Round 2: independently challenge the completed strongest propositions and rendered workflow. Record real AI roles and findings, never fictional human expertise. Queries/tests created after outcomes are retrospective, not preregistered. Future reviews have no invented probabilities or claimed model calibration. Source-closed downloads preserve questions separately from facts.

Definition of done: selected files researched, contrary evidence retained, explicit remaining sector gaps, responsive map/network page with sources and export, schema/source-hash/closure/adversarial tests, browser acceptance, reviewed commit and deployment. Exhaustive access to all Indian records is not available.
