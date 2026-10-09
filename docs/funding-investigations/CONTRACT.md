# Funding investigations: shared research contract

Review date: 8 October 2026 (America/New_York). Historical research window: 8 October 2011–8 October 2026 (review date minus 15 years). Older records may supply explicitly dated context. This is a continuing, bounded investigation, not a census of all Indian spending or a verdict about any person.

Each specialist owns `research/funding-investigations/streams/<track>.json`, a matching `<track>.md` research log, and `research/funding-investigations/raw/<track>/`. Tracks: `defence`, `police-border`, `utilities`, `welfare-pmcares`, `cross-sector`. Cross-sector work also covers finance, transport, health, education, media, NGOs, justice and natural resources through the existing repository networks. Do not edit another track, frozen model experiments, shared app files, or earlier evidence. Retain exact source bytes/extracts and SHA-256 receipts for newly inspected originals where practical. Public official documents and public company filings are preferred; access failures and secondary-only leads remain visible. Do not publish private account numbers, personal addresses, or operational military vulnerabilities.

## Research procedure

Read the Exa Search skill (`c4/Search`) and its `references/searching.md` and `references/source-quality.md` through skills.read. Reuse the methods in `docs/research-radar/next-model/BEHAVIORAL-METHODS.md`, `PANEL.md`, `GRAPH-DATA-AUDIT.md`, and `MODEL-CARD.md`. Those model experiments failed promotion; do not change them or claim their rankings establish a relationship. Model assistance suggests documents to inspect, not facts.

First inventory relevant existing evidence and missing joins. Search budgets/appropriation accounts, CAG/PAC, parliamentary answers, tender/award/amendment/payment records, judgments, regulator and exchange filings; then seek the named parties' responses and later outcomes. Search results are discovery leads; inspect the material passages before admitting a claim. Log requested search result slots separately from distinct documents actually inspected. A repeated press release is one source family.

For every adverse hypothesis include an ordinary-process alternative, a data/identity-error alternative where applicable, the strongest contrary evidence, a concrete disconfirmation test, and the next document/holder. Distinguish agency allegation, audit observation, charge, interim ruling, acquittal/conviction, and contract/accounting facts. A court repeating an agency allegation does not make the alleged transfer court-proven. Missing documents and common owners do not prove diverted money. Attack attribution and procurement criticism are separate questions: do not infer a staged attack from a beneficiary, delay, budget rise or security failure.

## JSON shape

All fields below are required unless marked optional. IDs must be globally unique and begin `fi:<track>:`. Sources, entities and edges are top-level arrays. No fuzzy cross-track identity merges.

```json
{
  "schemaVersion": 1,
  "track": "defence",
  "reviewDate": "2026-10-08",
  "scope": "What was actually examined and what remains uncovered",
  "searchLog": [{"query":"...","requestedResults":10,"date":"2026-10-08"}],
  "sources": [{"id":"fi:defence:src:...","title":"...","publisher":"...","url":"https://...","publishedAt":null,"accessedAt":"ISO timestamp","kind":"official|court|audit|filing|reporting|methods","sourceFamily":"original document identity","inspection":"full-document|selected-pages|web-text|secondary-only","locator":"page/paragraph/table/section","excerpt":"short relevant passage or faithful labelled paraphrase","limitations":["..."],"capturePath":null,"sha256":null}],
  "entities": [{"id":"fi:defence:entity:...","label":"...","kind":"institution|company|person|fund|programme|country","identityBasis":"Exact document-supported identity; no namesake assumption","sourceIds":["..."]}],
  "edges": [{"id":"fi:defence:edge:...","from":"entity id","to":"entity id","relation":"plain typed relation","label":"...","status":"documented|alleged|audit-finding|unresolved|contradicted","stage":"budget|approval|award|payment|receipt|recovery|attachment|ownership|office|oversight|alleged-transfer|context","date":null,"amount":null,"sourceIds":["..."],"response":"response or explicit unavailability","limits":["..."]}],
  "cases": [{"id":"fi:defence:case:...","title":"...","question":"...","sector":"defence","period":"...","status":"documented|alleged|audit-finding|unresolved|contradicted","finding":"Narrow supported conclusion","geography":[{"label":"Delhi","stateCode":"DL","basis":"administrative association, not payment/incident coordinates"}],"entityIds":["..."],"edgeIds":["..."],"sourceIds":["..."],"claims":[{"id":"fi:defence:claim:...","text":"attributed and scoped assertion","status":"documented|alleged|audit-finding|unresolved|contradicted","sourceIds":["..."],"response":"...","alternative":"...","falsifier":"...","missingRecords":["..."]}],"whatWeKnow":["..."],"whatWeDoNotKnow":["..."],"nextRecords":[{"record":"...","holder":"...","purpose":"..."}],"limits":["..."]}],
  "coverage": [{"institution":"...","jurisdiction":"...","period":"...","status":"examined|partial|queued|unavailable","sourceIds":["..."],"gap":"...","nextRecord":"..."}],
  "rejectedJoins": [{"from":"name/id","to":"name/id","proposed":"hypothesis","reason":"why not admitted","sourceIds":["..."]}],
  "roadmap": [{"phase":"now|next|later","task":"...","deliverable":"...","acceptance":"observable completion criterion"}]
}
```

An optional edge amount is `{ "value": 123, "currency": "INR", "unit": "crore", "period": "FY2025-26", "basis": "budget estimate / contract face value / etc", "overlapGroup": null }`. Preserve original currency and scope. No graph-wide financial total. Unknown is null, not zero. Cash tracing stops at the last supported hop; no gap is filled by a made-up edge. Every reference must resolve within the assembled bundle, and each important assertion must be supported by a specific inspected locator.

## Panel and publication

Selected cases add `decisionAnalysis: {decisionDate, actors: [{entityId, authority, incentive, evidenceSourceIds}], informationThen: string[], options: [{label, expectedObservableOutcome, sourceIds}], observedOutcome, sourceIds, hindsightLimits: string[]}`. This is a retrospective institutional decision analysis. Formal authority and observable constraints need citations; incentives and counterfactual options are labelled analytical possibilities, not private intent. Compare lawful, administrative-error and adverse explanations against later recorded outcomes. Do not manufacture numerical utilities, equilibrium probabilities or backdated forecasts. Later documents cannot be treated as knowledge available when a decision was taken. The 15-year window is a research scope, not a claim of complete annual coverage.

Round one establishes questions, evidence and proposed joins. Round two assigns another specialist to challenge a different track's strongest claims and amounts. Authors correct or withdraw unsupported joins while retaining the challenge log. The lead reviews cross-track identities and findings. The website will distinguish verified documentary relationships, attributed allegations, audit findings, unanswered questions and rejected joins. Source/map links and exports must work on desktop and mobile. Agent perspectives are not independent human testimony or proof of comprehensive coverage.
