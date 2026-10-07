# Research radar schema and evaluation contract

The canonical research contract is [CONTRACT.md](CONTRACT.md). The four authored regional catalogs are `north.json`, `west.json`, `south-east.json` and `national.json`; the coverage registry is `coverage.json`. All are under `research/raw/research-radar/`. The research cutoff is **2026-10-07**, with a latest-source discovery window beginning **2026-07-07**. This is a bounded source review, not a claim that every recent record has been discovered.

## Evidence invariants

`node scripts/research-radar/validate.mjs` checks real calendar dates, publication/retrieval cutoff, exact source references, namespace uniqueness, graph endpoints, evidence status and complete case source lists. Every observation and counterevidence statement needs a retained source. An inaccessible URL alone cannot substantiate a graph edge or claim. A documented edge needs an inspected official, judicial, corporate or dataset source; a news-only relationship remains reported. An allegation edge remains alleged even when an original court document records it. Schema checks cannot certify the truth or interpretation of an allegation; source-level challenge remains necessary.

Relationships preserve their authored kind. `ownership`, `appointment`, `oversight`, `policy` and `contract` do not become `payment`. No text similarity, shared city, public office, shared source or geographic proximity creates an edge. `buildRadarCaseGraph` returns only the selected case's authored entities and links. No amounts are aggregated by this engine.

Case source lists include sources used by entities, links, observations and counterevidence. Actor timelines keep separate dated office, decision, allegation, response and judicial-outcome entries. An actor displayed beside a case is explicitly a **shared-source-reference** association, not a merged legal identity or a payment inference. The export preserves the full case, original scenario, all counterevidence, related actor timelines and all their source references. Missing source references fail validation and are additionally exposed in exports.

Source publication date, source retrieval date, case update date and future scenario evaluation date have separate meanings. The recency filter uses the **source publication date**, never the date we accessed an old document. Null publication dates remain visible outside the recent filter. Several retained sources from a single source family do not count as independent confirmations.

## Geography and coverage

City IDs are lowercase labels; state codes use the existing 36-jurisdiction uppercase investigation vocabulary, not legacy aliases. Coordinates are city planning centroids. They are not alleged transaction coordinates, building locations, asset locations or a person's residence. `city.stateCodes` describes physical jurisdiction; optional `capitalFor` describes the jurisdiction served by a capital. Chandigarh's geography therefore remains CH even when its capital role serves PB and HR. These are distinct filters and concepts.

`getRadarCoverage` derives matching case and source counts from the current selected scope, with the full planning list as denominator. A listed city with no retained matching case is unresearched in that selected view. One retained case does not establish comprehensive coverage, and an empty city is not evidence of good governance. City/sector coverage is a research backlog, never a corruption-rate map.

## Scenarios and future scoring

Every production scenario has `probability: null` and the exported engine status is **untrained-uncalibrated**. Its horizon is the exact calendar-day interval from the fixed cutoff to `evaluationAt`. Targets concern measurable institutional or project outcomes. Triggers, alternatives, falsifiers and required records support prospective adjudication. There is no individual guilt score, personal propensity score, estimated corruption rate or numeric forecast generated from allegation frequency.

`scripts/research-radar/forecast.mjs` provides infrastructure, not a trained predictor:

- `buildForecastRegistry(cases, cutoff)` creates unresolved institutional-outcome registry rows with null probabilities and resolutions.
- `scoreForecasts(rows, { asOf, bins })` computes binary mean Brier score and proper logarithmic loss only for sourced, resolved, prospectively timestamped institutional outcomes. It reports unknown and censored exclusions separately; they are never converted to negative labels. The event must occur after prediction and no later than the deadline. A negative outcome cannot resolve before the observation window ends. A resolution must be published no earlier than the observed outcome and be available by `asOf`. Wrong certainty has infinite log loss; no hidden epsilon clips it. `logLossStatus` explicitly distinguishes infinite, finite and unscored results even when a JSON serializer turns non-finite numbers into null.
- Reliability bins expose sample count, mean forecast and observed frequency. Empty bins return null values. Neither Brier score nor an observed frequency alone demonstrates calibration: Brier combines calibration, discrimination and uncertainty.
- `validateTemporalSplit({ train, evaluation, cutoff, asOf })` checks each historical training sample has feature availability no later than its own prediction, followed by the observed outcome and then its reporting date, with all training labels available by the training cutoff, evaluation predictions follow that cutoff, evaluation features were available at prediction time, observed evaluation outcomes follow prediction and precede their reporting dates, which must be known by `asOf`, and entity groups do not overlap the train/evaluation sets. It rejects empty populations and reused target IDs.

A scored prediction row contains `id`, `targetType: 'institutional-outcome'`, `probability`, `status`, `outcome`, `predictedAt`, `evaluationAt`, `latestFeatureAt`, `outcomeObservedAt`, `resolvedAt`, and `resolutionSourceIds`. Date fields are ISO calendar dates. The availability field must represent when a feature could actually have been read, not the underlying event's earlier date. `unknown`/`censored` rows carry null outcome and resolution dates and no resolution source IDs.

These gates are necessary, not sufficient. Enabling numeric public forecasts would also require a preregistered eligible event population; reliable positive, negative, unknown and censored labels; source-level publication/event timestamp reconciliation; a frozen temporal holdout; independent entity grouping; baseline comparison; adequate sample sizes; calibration with uncertainty; subgroup performance; and an independently reviewed calibration bundle. The current catalogs do not provide that bundle. Synthetic test fixtures validate rejection behavior and score arithmetic only, never predictive accuracy.

The source-bound prospective registry is materialized with `node scripts/research-radar/forecast-registry.mjs`; `--verify` fails if it no longer matches the reviewed case catalogs. Its calibration gate lists unmet requirements and remains disabled.

## Frontend API

`src/data/researchRadar.ts` exports `RESEARCH_RADAR_DATA`, `RADAR_CITIES`, `RADAR_SECTORS`, `RADAR_STATUS_LABELS`, cutoff constants and public TypeScript types. `filterRadarCases` accepts optional `cityId`, `stateCode`, `sector`, `status`, `recency` and `query`. Filters intersect; unknown IDs return no cases rather than falling back to unrelated data. `caseHasRecentSource`, `radarSourceById`, `radarCaseById`, `getRadarRelatedActors`, `getRadarCoverage`, `buildRadarCaseGraph` and `exportRadarCase` preserve exact authored IDs.

The data loader bundles this same TypeScript module for node-based tests so tests and the browser inspect the same adapters. Files absent during collaborative authoring are build errors; they are not replaced with synthetic production records.

Sector filtering uses a small declared editorial alias table (`power` → `energy`, `schools` → `education`, `courts`/`law` → `justice`, `government-administration` → `administration`, `natural-resources` → `resources`, `ports`/`roads-infrastructure` → `infrastructure`, `consumer-welfare` → `welfare`, `public-finance` → `public-funds`). This normalizes navigation facets only. Original case tags and exports are retained verbatim, and no entity matching or claim inference uses this table.
