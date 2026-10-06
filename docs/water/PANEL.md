# Water and food security: two-round panel

Extension requested while the education release was being verified. Same working
branch: `codex/education-funding-intelligence`. Research window: **6 October 2021
through 6 October 2026**, inclusive. Earlier laws, manuals and observation periods
must retain their dates and be identified as background where appropriate.

The reviewers are independent AI role perspectives, not licensed expert
endorsements or interviews with affected communities. Roles: drinking water and
groundwater; weather and disaster evidence; agriculture and food systems;
procurement and audit interpretation; data engineering; UX; lead/advisor.

## Round 1: accepted decisions

| Evidence / concern | Decision | Owner / acceptance |
| --- | --- | --- |
| A tap connection is distinct from sufficient, regular, potable supply. | Keep administrative connection counts, sampled functionality and tested water-quality parameters separate. | Water researcher and data engineer: no connection count is labelled a safe-water outcome. |
| State groundwater averages hide stressed assessment units and cannot locate a city's aquifer. | Preserve assessment-unit grain, source year and local coverage gaps. | Water researcher: no village risk inferred from a national or state average. |
| Rainfall, reservoir storage, groundwater and drinking-water service measure different things. | Display dated indicators and explicit missing evidence; no synthetic live disaster score. | Weather reviewer: historical observations and expired forecasts cannot become current alerts. |
| The five-year publication window differs from the period audited or observed. | Store publication, reference period, retrieval and forecast validity separately; older background is explicit. | Data engineer and UX: filters and exports preserve all relevant dates. |
| Government tender estimates, awards, payments and delivered service are different stages. | Link original procurement records and the existing tender register; keep award evidence separate from completion and supply. | Procurement review: an estimate is never represented as expenditure or a completed water connection. |
| Seed, inputs, irrigation, growing, harvest, markets, storage and distribution are linked but have different datasets. | Build a supply-chain navigator with independent domain/stage/geography filters. | Food researcher and UX: crop output, mandi arrivals, procurement, stocks and household food access are not interchangeable. |
| A city name can also denote a district; rural dashboards may omit urban-only jurisdictions. | All 36 states/UTs are navigable; city/district/village grain and official local discovery routes remain visible. | UX and data engineer: unknown locality means unrecorded evidence, never zero service or zero food. |
| Audits, local reporting and resident discussions have different evidentiary roles. | Attribute each finding, preserve sampled scope and departmental responses; discussions identify questions. | Researchers: analytic leads require alternative explanations and a concrete falsifier. |
| A second page should preserve existing education work and navigation habits. | Use the shared design system, separate saved-reading-list storage, route-safe section jumps, shareable filters and CSV. | UX: education state stays intact; water filters and source qualifications survive export and history navigation. |

Deferred: claims of an exhaustive village/city census, automatic attribution of
misconduct, undated “current” drought warnings, and agricultural loss or famine
predictions from rainfall alone. These require evidence not established merely
by combining publicly accessible links.

## Round 2

Reviewed artifact: the implemented `/water` route and assembled register of 52
sources and 355 observations, with shared navigation and the new home-page entry.

| Finding from the implemented artifact | Revision / decision | Evidence of review |
| --- | --- | --- |
| Recent observation tables may have no verified report release date. Strict date filtering can obscure their availability. | Preserve null release dates and expose clickable within-window, background and undated counts beside the filters. | No date is inferred from a report title, URL folder or retrieval date. |
| Cuttack was included in a label describing all places as blocks. | Label Athagad and Badamba as blocks and Cuttack as their district. | Weather reviewer checked structured geography and visible label. |
| A historical agromet bulletin had a validity start distinct from its day-only issue date. | Retain and display/export `validFrom`, `issuedAt` and `validUntil` independently. | Forecast checks cover before-start, at-start and after-expiry states. |
| The NRSC mapped-water estimate covered ten districts and could be read as a local figure. | State the aggregate scope in the observation itself; preserve preliminary mapping and no-ground-verification limits. | Weather audit verified all four numeric weather observations and 16 source records. |
| JJM household quality tests and source-water chemistry are separate samples. | Say the displayed household series is microbial tests plus pH; preserve the separate source chemistry context. | Public researcher independently checked 140 survey percentages and the original method. |
| Karnataka's cited tender deadline could be misread as a works-completion deadline. | Correct to tender-award deadline and preserve the audit rejoinder and government's explanation. | Public reviewer checked all 301 integrated observations and attributed audit cases. |
| Food-stage figures can appear comparable even when their units and accounting concepts differ. | Retain production vintages, market/stock/capacity distinctions and historical audit periods with responses. | Food reviewer checked all 17 source date/URL pairs and 50 value/unit/period triples. |
| Full-text place matching admitted publisher locations and commodity names as locality evidence. | Separate structured locality matching from topic search; match the selected state to the same locality. | Independent implementation reviewer supplied Pune, Mandi and Rice counterexamples; regression checks required. |
| A fast state selection followed by a topic submission could overwrite the new state with stale query parameters. | Compose updates from the current route query; sync drafts independently; test the immediate state-to-search sequence. | The complete browser probe preserves state and topic together and verifies Back/Forward against rendered controls. |
| A saved-documents toggle could suggest that every measurement and question was restricted to saved sources. | State the saved-list scope beside the toggle; document cards, stage counts and CSV respect it, while measures and questions retain research filters. | Independent semantics review and browser isolation checks passed. |
| External font requests returned HTTP 503 during regression checks. | Bundle the same font families and revisions locally with licences and a version/hash manifest. | Removes the external runtime dependency; final browser gates check the bundled build. |

Final interaction review, corrections and release checks are recorded in
`DESIGN_REVIEW.md`, `QUALITY_REVIEW.md` and `VERIFICATION.md` after completion.
The source reviews are `PUBLIC_RESEARCH.md`, `WEATHER_REVIEW.md` and
`FOOD_RESEARCH.md`.
