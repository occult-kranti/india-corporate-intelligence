# Research radar: working contract

Baseline: `d1948b89e2a4a6410f9f76ea27bf69c5ad9ce94f`. Research cutoff: 2026-10-07, America/New_York. Latest discovery window: 2026-07-07 through 2026-10-07; historical baseline 2011–2026. Dates describe document/event coverage, not guaranteed completeness.

This is a public-record investigation and testable forecast workbench. Scenarios model observable procurement, financing, oversight and service-delivery outcomes. Allegations, connectedness, public office and historical accusations do not establish criminal intent or a person's propensity for crime. A missing record is an acquisition gap. No personal guilt probabilities, invented links, operational evasion instructions or private-person dossiers.

## Research handoff

Each regional owner writes `research/raw/research-radar/<region>.json` and a concise `docs/research-radar/<REGION>.md`. JSON top level: `schemaVersion: 1`, `region`, `cutoff: '2026-10-07'`, `searchLog`, `sources`, `cases`, `actors`.

Sources: `id`, `title`, `url`, `publisher`, `publishedAt` (ISO date or null), `retrievedAt` (ISO date), `family`, `kind` (`official`, `judicial`, `corporate`, `news`, `dataset`, `methodology`), `summary`, `locator`, `limitations` (array), `access` (`full-text`, `original-file`, `indexed-extract`, `unavailable`). Keep query results separate from sources actually inspected. Save retrieval receipts and hashes where originals are downloaded; do not publish private bank/account/address details. News summaries are original paraphrases. Prefix all IDs with `radar-<region>:`.

Cases: `id`, `title`, `cityIds` (lowercase hyphenated names), `stateCodes` (registry codes), `sectors` (array), `question`, `summary`, `status` (`documented-development`, `audit-finding`, `reported-allegation`, `open-question`), `sourceIds`, `observations` (array of `{text, sourceIds}`), `counterevidence` (array of `{text, sourceIds}`), `nextRecords` (array of `{record, holder, purpose}`), `entities`, `links`, `scenario`, `updatedAt`.

Case entities: `{id,label,kind,role,sourceIds}`; kind is `institution`, `company`, `public-official`, `project`, `policy`, or `source-mention`. Links: `{id,from,to,kind,label,sourceIds,status}`. Endpoints must be present in the case; kind is `contract`, `payment`, `ownership`, `oversight`, `policy`, `appointment`, or `allegation`; status is `documented`, `reported`, or `alleged`. Role/ownership/oversight are never money transfers. Do not infer minister-to-company benefits from departmental responsibility. No fuzzy cross-case identity merge.

Scenario: `{target, horizonDays, evaluationAt, baseline, triggers, alternatives, falsifiers, probability:null, probabilityReason, requiredData}`. Targets must be measurable future institutional/project outcomes, not predicted guilt; dates must follow the cutoff. Triggers/alternatives/falsifiers/requiredData are arrays of strings. No made-up base rates or probabilities. Describe what would strengthen and defeat the concern. All research remains distinguishable from a statistically trained forecast.

Actors: `{id,label,kind,identityNote,sourceIds,timeline}` for selected public decision makers or corporate decision roles. Timeline entries: `{date,label,category,sourceIds,outcome,limitations}`; category `office`, `decision`, `allegation`, `response`, `judicial-outcome`, `corporate-role`. Preserve historical effective dates and later outcomes; unknown latest status stays unknown. No character score or prediction of individual offending.

Search log entries: `{query,tool,requestedResults,inspectedUrls,notes}`. Requested search-result slots are not independently reviewed sources. Both recent material and older historical context may be admitted; show dates and gaps honestly.

## Product and ownership

New route `/research-radar`: flat map with city nodes, linked case networks, source details, scenario cards, actor history and coverage/backlog. Preserve the existing money-trail and all-sector pages. Agent roles are AI review perspectives, not human professional endorsements. Six bounded parallel workstreams: three regional investigators, data/engine, product/experience, and independent model/method challenge. Lead owns memory, national coverage, skill and integration.

Numeric forecasting stays disabled until a defined event population, observation windows, censoring, leakage-safe temporal validation and empirical calibration exist. Discovery embeddings are retrieval aids. Executed and planned model work must be labeled separately.
