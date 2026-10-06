# Water and food evidence register

Snapshot: 6 October 2026. Publication review window: **6 October 2021 through
6 October 2026**, inclusive. Built on the same branch as the education register.

## Coverage

| Component | Curated coverage |
| --- | --- |
| Sources | 52 records: 28 documents, 16 portals, three datasets, three news records and two attributed discussions |
| Publication dates | 21 within the window; 30 undated or without sufficient date precision; one older background source |
| Measurements | 355 observations retaining original units, periods, geographic grain, accounting stages and limitations |
| Geography | All 36 states/UTs selectable; 42 named city, district, block and village localities; national context identified separately |
| Research tools | 14 official discovery routes and 16 attributed findings, research questions or methodology leads |
| Food chain | Seeds, farm inputs, irrigation, crop growth, harvest, markets, storage and distribution |

Navigation coverage is not evidence coverage. This is not an exhaustive inventory
of every document, tender, village, city or five-year time series. A missing local
record means unrecorded evidence in this collection. It does not mean no service,
no crops, no spending or no risk.

The default view uses verified original publication dates. Choosing **All dates**
also reveals recent observations from reports whose release dates could not be
established. A report's reference year, a refreshed portal footer and the date of
retrieval are not substitutes for its original publication date. Historical
forecasts retain issue, validity-start and expiry fields and snapshot status.

## Independent research streams

- [Public water](PUBLIC_RESEARCH.md): 19 sources and 301 observations, including
  34 rural state/UT administrative rows, 34 states/UTs plus India in the sampled
  functionality table, 15 selected urban programme examples and an identified
  village audit with the government's response.
- [Weather and hazards](WEATHER_REVIEW.md): 16 sources and four observations;
  historical climate reports, disaster declarations, preliminary inundation
  mapping, service reporting and an expired agricultural bulletin.
- [Agriculture and food](FOOD_RESEARCH.md): 17 official sources and 50
  observations; crop estimates, programme and market discovery, storage and
  distribution, with two attributed CAG findings and responses.

The three streams requested 161 search-result slots across 24 searches. These
are retrieval counts, not counts of complete documents read or independent facts.
Relevant methods, tables, findings and responses were reviewed. Source-specific
access failures and indexed-extract use remain in each record.

## Rules that affect interpretation

The JJM published functionality index is the **minimum of three marginal
percentages**, not a measured joint household success rate. Administrative taps,
sampled regularity, sampled quantity and tested household quality remain separate.
Groundwater extraction classifications describe assessment units and do not
certify drinking-water safety. National rainfall and mapped standing water do
not establish local drought, crop damage or current danger.

A notice, tender estimate, award, completed work and payment require separate
records. Production, market arrivals, storage capacity, stocks, procurement,
allocation, offtake and household food access measure different stages. Values
from those stages are not combined into a synthetic total or risk score.

Investigation leads preserve attribution, alternative explanations, the relevant
response and evidence that could weaken or resolve the concern. The panel uses
independent AI roles; it does not claim professional or community endorsement.
See [panel decisions](PANEL.md), [roadmap](ROADMAP.md) and the source reviews.

## Reproducibility

Raw workstream payloads and retained evidence are under `research/raw/water`.
Run `node scripts/water/assemble.mjs` to regenerate the curated JSON, then
`npm run validate:water` and `npm run test:water`. The built-page workflow is
`npm run test:water:browser`; it accepts `WATER_DIST` for an isolated build.
Source reading lists remain in local browser storage. Exports retain dates,
grain, limitations, citations, retrieval status and forecast validity.

The optional [local open-model workflow](MODELS.md) ranked all 52 public source
summaries across six research queries on CPU. Its pinned, hash-verified output is
a reading suggestion, not extracted evidence, a water-safety verdict or a risk
score. `npm run test:water:model` verifies the saved artifact without downloading
weights or invoking a hosted model.
