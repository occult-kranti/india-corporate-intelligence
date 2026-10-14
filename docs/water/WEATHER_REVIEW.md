# Weather and forecast review

Review date: 6 October 2026. Review window: **6 October 2021–6 October 2026**, inclusive.

This is an independent AI weather/hydrology review of the data engineer's assembled artifact, not a licensed expert endorsement. Scope: the 16 `wx-` source records, their four numeric observations, linked investigation leads, forecast logic and relevant presentation in `Water.tsx`. Other research workstreams have separate reviews.

## Round 1: source research and design decisions

The weather workstream reviewed **62 Exa result slots across eight searches** and fetched **19 source pages/PDF extracts**, retaining 16 sources. Counts are search-result slots, not 62 independently validated documents. Source kinds comprise 10 documents, three official portals and three reported news/interview records.

Accepted decisions: separate observations from forecasts and administrative declarations; preserve publication, observation and retrieval dates; retain locality grain; withhold inconsistent extracted district tables; use attributed investigation questions with alternative explanations; show missing data rather than infer village drought or potable supply.

The primary evidence includes IMD climate/drought reports, CWC discovery portals, a Tamil Nadu disaster declaration, NRSC satellite inundation mapping, an IIT Madras assessment filed at NGT and an IMD/ICAR agricultural advisory. Historical Bengaluru reporting supplies local service context. The December 2016 drought manual is outside the five-year window.

## Round 2: implemented artifact audit

Reviewed `src/data/water-research.json`, `src/data/water.ts`, `scripts/water/assemble.mjs` and `src/pages/Water.tsx` against the retained source extraction at `research/raw/water/weather-research.json` and the workstream's Exa fetch evidence.

An executable read-only audit ran **153 assertions successfully**: 16 record IDs/URLs/publishers/publication and retrieval dates; summaries and source limitations; four observation values, units and periods; historical forecast classifications; publication-window classification; unknown-locality empty results; state filtering; and rejection of a drought declaration inferred from rainfall alone. It executes the actual TypeScript module through the repository's TypeScript compiler rather than reimplementing selectors.

| Source ID | Date, scope and interpretation checked | Outcome |
|---|---|---|
| `wx-imd-drought-2023` | Observation June–September 2023; publication unknown; district tables within national report | Pass: undated release status retained, inconsistent extracted table captions not promoted to metrics. |
| `wx-imd-hydroclimate-2026-06` | June 2026 observations; mutable URL and unknown release day | Pass: not represented as October conditions; non-reconciling extracted totals withheld. |
| `wx-imd-climate-2025` | Published 2026-01-01; calendar-year 2025; national/regional | Pass: 1,274 mm remains an India annual measure, not a local value. |
| `wx-imd-rainfall-2024` | Calendar-year 2024 observations; report identifier gives 2025 but exact issue day unavailable | Pass: publication not invented; 1,206.6 mm remains national; session-URL limitation retained. |
| `wx-imd-state-climate-archive` | 2021–2024 archive selectors, no individual state table ingestion | Pass: source directory and partial 2021 observation overlap are explicit. |
| `wx-cwc-reservoir-archive` | Retrieved archive last updated June 2024 | Pass: no 2026 live-storage value fabricated; monitored reservoir coverage limited. |
| `wx-cwc-flood-portal` | Dynamic source directory; no dated station forecast ingested | Pass: classified as a portal, not an issued/current flood warning. |
| `wx-tn-disaster-2023` | Publication 2023-12-29; two December event intervals; named districts | Pass: formal historical affected-district declaration, not a current warning. |
| `wx-nrsc-tn-inundation-2023` | Acquisition 2023-12-07 at 0600, time zone unstated; 10-district aggregate | Pass: 148,360 ha remains mapped standing water, preliminary/no ground verification; no crop-loss inference. |
| `wx-ngt-ennore-2024` | Report month March 2024; December 2023 field work; named Chennai localities | Pass: exact filing day not invented; technical filing not final adjudication or current safety clearance. |
| `wx-bengaluru-shortage-2024` | Reported 2024-03-18 CM statement; city | Pass: 500 MLD is explicitly attributed, not independently audited or current. |
| `wx-bengaluru-bwssb-response-2024` | Interview 2024-03-16; city/basin and peripheral service distinction | Pass: alternative explanations preserved; basin reserves do not establish tap delivery. |
| `wx-bengaluru-community-2024` | Local reporting 2024-03-22; named neighbourhoods/institutions | Pass: city grouping retains local coverage limits and the unverified borewell-depth qualification. |
| `wx-imd-forecast-2024-05-23` | Issued 2024-05-23 14:10 IST; different hazard horizons, no exact single expiry | Pass: actual function returns `unknown-validity`; historical release is not a current warning or observed outcome. |
| `wx-drought-manual-2016` | December 2016 historical methodology | Pass: background outside window, mirror provenance and partial review stated. |
| `wx-agromet-cuttack-2025-07` | Issue day 2025-07-01, clock time unknown; validity through 2025-07-06 08:30 IST; Athagad/Badamba blocks | Pass after revision: actual function returns `expired`; block/district label corrected and exact valid-from retained separately from issue day. |

### Revisions requested from artifact owners

1. **Required geography correction:** the first assembled agromet label said `block: Cuttack, Athagad, Badamba`. Cuttack is the district in this record. Use **Athagad and Badamba blocks, Cuttack district, Odisha**. Structured locality IDs already distinguish the two blocks correctly.
2. **Forecast provenance improvement:** retain `validFrom: 2025-07-01T08:30:00+05:30` in the assembled source, display and export. This forecast-period start is not an issue-clock time; `issuedAt` remains the day-only `2025-07-01`. The current historical expiry classification is already correct.
3. **Aggregate clarity:** explicitly describe the NRSC numeric observation as the **total across the 10 listed districts**. The interface already lists all 10 when filtering to Chennai, but this wording further protects against interpreting the aggregate as a Chennai-only value.

**Status: closed — all three requested revisions verified.** A further 10 assertions passed after the changes: corrected district/block label, preserved valid-from and day-only issuance, before-start/at-start/after-expiry classifications, explicit 10-district total wording, and separate display/CSV fields. No unsupported current-alert or village-hazard inference was found.

The reviewed final weather-source subset contains 16 records within the then-33-source assembled dataset. Its SHA-256 (JSON with sorted keys, UTF-8, weather sources in dataset order) is `2ce9697896e87a40b4d2f05dd13e864480a00579e672d476020b61bead1663e7`. Other workstreams may add records without changing this audited subset.

## Interpretation checks

- National context remains labelled national under state filters. An unknown village returns no recorded source or numeric observation; official discovery routes remain available.
- Every reviewed numeric observation retains its original unit and period. The NRSC hectares are not relabelled as damaged cropland; rainfall millimetres are not a water-service indicator.
- The public interface distinguishes original publication from described period and retrieval. Default in-window filtering is conservative for undated releases; source limitations preserve known report years.
- Forecast status is labelled **at the dataset snapshot**, with a reminder to check the official current bulletin. The CWC directory supplies no live station alert.
- Investigation leads include attribution, alternative explanations and a falsifier. A technical report, press quote, resident account and official declaration are not given interchangeable evidentiary roles.
- Agromet content remains historical context, without converting expired chemical/crop-stage advice into current village instructions.

## Remaining evidence limits

No exhaustive city/village census, complete five-year time series, live hazard ingestion or validated predictive model was established. Some portals are dynamic and some PDF text extraction is incomplete. Direct original-PDF downloads for the two inconsistent IMD tables failed in the research environment; their rendered tables still require visual reconciliation before numerical ingestion. Keeping these values out of the metric layer is the accepted handling.

Weather raw search/fetch evidence is retained in the workstream file `/workspace/weather-research-evidence/exa-search-and-fetch.json`; curated source metadata is in the repository under `research/raw/water/weather-research.json`.
