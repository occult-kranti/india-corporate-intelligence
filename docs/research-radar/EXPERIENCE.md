# Research radar experience and review ledger

Baseline: `d1948b89e2a4a6410f9f76ea27bf69c5ad9ce94f`. Research cutoff: 2026-10-07 (America/New_York).

Applied skill: [panel-led-product-redesign](skill://user/6aa73b7da6fc8191b7f577f4499916fc/panel-led-product-redesign/SKILL.md). These are AI review perspectives, not licensed endorsements, interviews, or observed human success rates. Root moderates independent research, engine, experience and challenge agents. Experience owns the rendered product and browser checks; challenge owns independent source-meaning and model criticism.

## Loop 1: baseline → implementation

The baseline money-trail page was inspected in Chromium at 1440×1000 from the accepted `dist-money-trails-release` artifact, served locally at port 5199. Screenshot captured to `/tmp/radar-baseline.png`. The earlier port 5198 was unavailable; no claim of inspecting that server is made. Code inspection covered App/Layout, MoneyTrails, LinkedEvidenceMap, InvestigationMap, the pinned current36 boundaries and Lambert projection helper.

Baseline task: choose a geographic starting point, inspect a specific sourced relationship, distinguish an allegation from a recorded fact, and identify the next missing record. The existing map and documentary paths support that task, but the baseline has no forward institutional outcome, national capital acquisition plan, or dedicated chronology reader. This is a new research route; the existing money-trail page and saved URLs remain intact.

| Finding and impact | Decision / owner | Acceptance check | Result |
| --- | --- | --- | --- |
| Baseline is a five-investigation cash-path reader, not a national research work queue. | Experience adds one `/research-radar` route with a flat map, case queue, retained evidence, and next observable outcome. Root integrates route/navigation. | Map is default; authored cases are searchable; source details and next holders remain accessible. | Implemented; 326-check browser acceptance passed. |
| Missing research could be read as low risk on a national map. | Coverage pins encode only retained-case vs acquisition-pending; all states use neutral geometry, with selection emphasis. | Every city with no retained case yields a neutral acquisition gap; no fabricated risk color or percent. | Implemented. |
| Place counts can imply incidents and capital jurisdiction can be mistaken for a facility address. | Separate capital jurisdiction from physical state, approximate city navigation anchor, and national administrative context. Reuse pinned LGD current36 paths and projection. | 36 state paths and all planned anchors; provenance adjacent to map and all-city queue. | Implemented. |
| New numeric forecasts would be unsupported without outcome history and calibration. | Visible “Untrained / uncalibrated” state and “Probability: not estimated”; show measurable target, evaluation date, alternative, falsifier, required data. | Every case retains authored null probability and exact future target. | Implemented. |
| A dense graph can hide what each edge actually means. | Exact case-only nodes and edges; click node for all authored links, then edge for kind/status and sources. No inferred cross-case identity joins. | Node/link counts equal authored objects; role links are explicitly not transfers. | Implemented. |
| Historical records can look like fresh reporting if retrieval date is used. | Recent filter uses source publication date in Jul 7–Oct 7 2026; show latest retained publication, authored review and discovery window separately. | Results equal data-engine publication-date filtering. | Implemented. |
| A long page can bury the selected question, especially on a phone. | Visible “Read selected investigation” jump moves focus to actual case heading; map, case queue and reader remain separate but URL-linked. | Keyboard jump and URL Back/Forward/reload verified at desktop and narrow sizes. | Implemented; desktop and 768/390/320px interaction checks passed. |

## Loop 2: implemented artifact → independent challenge → revision

Independent challenge agent inspected the implemented `ResearchRadar.tsx` and identified two promotions of evidence status: the blanket reader eyebrow “DOCUMENTED RELATIONSHIP SCOPE” and heading “The documented relationship map” applied to alleged/reported links too. Experience changed these to “SOURCE-LINKED RELATIONSHIP SCOPE” and “The source-linked relationship map”; each authored edge retains its original status. No edge was upgraded. This was a change to the implemented artifact, not a second report of the unchanged baseline.

| Finding / evidence | Revision / owner | Acceptance check | Result |
| --- | --- | --- | --- |
| Blanket “documented” labels could promote a reported or alleged edge; independent challenge, TSX. | Replace blanket labels with “source-linked”; retain exact edge-status badges. Experience. | Open reported/alleged link and inspect label/status/caution. | Fixed; rendered source-meaning and edge-status checks passed. |
| Source modal must preserve exact limitations, not just source title. | Native dialog includes access status, date, family, exact locator, original URL and every limitation. | Browser opens first source of every case and compares exact locator, link and limitation text. | Implemented. |
| Forecast/model description could be read as a trained prediction. | Add explicit “Untrained / uncalibrated research scenarios” in the first-screen status strip. | Visible before selecting a case; no percentage risk ranking. | Fixed in source. |

The first integrated run deliberately failed exact export comparison when the south-east author changed five BMRCL edge statuses from documented to reported after the build. This exposed an outdated artifact, not a reason to relax the check. Root froze all four authored catalogs; the candidate was rebuilt against those exact sources and sector aliases.

The visual review then identified a presentation risk: in a compact single-column graph, a long straight edge could pass through unrelated identity cards and resemble a multi-hop chain. Experience replaced those segments with curved side lanes; every edge still uses only its authored source and target. The narrow graph scrolls at legible label size rather than shrinking all nodes to fit. A map caption now states that pin counts cover the full corpus while filters narrow the adjacent case queue.

Root’s final visual review identified city-label collisions for Bengaluru/Chennai, Ahmedabad/Gandhinagar and Chandigarh/Dehradun. Experience applied deterministic left/right label offsets with short leaders; all city pin coordinates and accessible names remain unchanged. Twelve added rendered bounding-box checks verify these three pairs do not overlap at all four accepted widths.

The rebuilt `dist-research-radar-candidate` passed **326 browser assertions**, with **zero runtime exceptions**, using all 23 retained cases. Every downloaded packet matched `exportRadarCase` exactly. Checks include all case summaries, observations and counterevidence; each null-probability scenario and evaluation date; next documents/holders/purposes; exact graph node/connection counts; source locator, original URL and all limitations; publication-date filtering; URL Back/Forward/reload; stale selections; neutral empty cities; native dialog Escape; keyboard graph activation; reader jump focus; and 1440/768/390/320px overflow/modal geometry. Source assets were not edited during this accepted run.

Accepted candidate index SHA-256: `4bfcfc60e41939c3c88aa1fc9ccb4391af1bdbd8153e4a38be72c0aaab8b7a91`. [Browser receipt](acceptance/browser.json), [desktop map](acceptance/map-1440.png), [390px case](acceptance/case-390.png), [320px source reader](acceptance/reader-320.png). Full screenshot set remains in `/tmp/research-radar-final`. Build succeeds; the inherited large main-chunk warning remains. Independent challenger and dedicated shared-route harness results are recorded by their owners; deployment verification belongs to root.

## State and reader contract

`rr_city`, `rr_state`, `rr_sector`, `rr_status`, `rr_recency`, `rr_q`, `rr_case`, `rr_reader` persist in the hash-router query. City and state selection clear incompatible place selection and case/reader context; changing evidence reader preserves scope. Search uses replacement history per keystroke, while case/filter/reader choices create navigable entries. Invalid saved case or reader IDs are disclosed; the reader never substitutes an entity identity.

Native `<dialog>` provides modal focus containment and Escape handling. Closing returns focus to the originating control where still mounted. City selection has a native select alternative; all city SVG nodes are keyboard-operable. The map is flat; zoom centers on the selected navigation anchor. All-source and all-connection lists provide exact text alternatives to graphical placement. Public actor chronologies retain each dated office/decision/allegation/response/outcome separately. Case-related actors share exact source references only, which the UI explicitly labels as co-reference rather than an identity or benefit inference.

## Verification scope

`scripts/research-radar/browser.mjs` targets a built artifact or explicit deployed base URL. It checks complete case/counterevidence/scenario rendering, source provenance, exact authored graph nodes and links, export equivalence, no-research cities, dated recent filtering, URL history, keyboard activation, stale URLs, all 36 retained paths, all planned city anchors, no runtime exceptions, and no horizontal overflow at 1440/768/390/320px. Screenshots include map, case reading position and source modal. These are automated interaction checks, not human usability research.
