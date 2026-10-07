# Index

Every file in this repository, what it is, and what depends on it. Read this before
changing anything — several files are load-bearing for the project's editorial
guarantees, not just for its build.

*Updated 2026-09-27, after the finance, ngo and capital fleets, the CPPP award pipeline and
the `/finance` page landed. Updated 2026-10-06 for Phase H (the money India spends on force):
the `force` fleet and its three series, the CPPP security slice, the `/security` spec, its
acceptance criteria and RED suite, the `force-money-trail` skill and the `security-analyst`
agent. The `/security` page itself was still being built. Counts below are read
from the files named beside them; where a file and this index disagree, the file is
right and this index is stale.*

---

## 1. Read-me-first, in order

| # | File | Why |
|---|---|---|
| 1 | [`README.md`](../README.md) | What the project is, the four invariants, the stack |
| 2 | [`docs/CUSTOM_PLAN.md`](CUSTOM_PLAN.md) | Why the two source projects merged, the phased plan, what shipped (Phases A–H) |
| 3 | [`.claude/skills/pattern-discipline/SKILL.md`](../.claude/skills/pattern-discipline/SKILL.md) | The anti-apophenia checklist the whole platform exists to enforce |
| 4 | [`.claude/skills/graph-schema/SKILL.md`](../.claude/skills/graph-schema/SKILL.md) | The data model |
| 5 | [`.claude/skills/evidence-tiering/SKILL.md`](../.claude/skills/evidence-tiering/SKILL.md) | How a claim gets a tier |
| 6 | [`docs/INGESTION.md`](INGESTION.md) | How the original raw research becomes graph data (`promote`) |
| 7 | [`docs/research/FLEET_CONTRACT.md`](research/FLEET_CONTRACT.md) | What a research-fleet agent may write, and the gate that rejects it otherwise |
| 8 | [`HANDOFF.md`](../HANDOFF.md) | Pick-up-cold prompt for the next session |
| 9 | [`docs/PLUGINS.md`](PLUGINS.md) | Which plugins and skills the build uses, and how a build fleet is composed |
| 10 | [`docs/superpowers/specs/2026-09-26-foreign-money-ngos-tenders-design.md`](superpowers/specs/2026-09-26-foreign-money-ngos-tenders-design.md) | Phase G: foreign loans, NGOs and the national tender record — the reconnaissance, the stance (institutions, not bloodlines; loans are contracts with terms; identical fields for every side) and the decisions |
| 11 | [`docs/superpowers/specs/2026-10-04-force-finance-design.md`](superpowers/specs/2026-10-04-force-finance-design.md) | Phase H: the money India spends on force — the reconnaissance, what resolves at which level (Union to the budget line, state to the Police head, city to the footprint, Delhi Police the one city budget), the five stance rules (spending is a policy choice, not a scandal; pay and pensions are contracts with people; vendors are vendors; outcomes are rates, party as text; cases are records with their counter) and the decisions |

---

## 2. The graph engine — `src/graph/`

| File | Role | Load-bearing because |
|---|---|---|
| `schema.ts` | Node / edge / motif types, the four tiers, `hasProvenance()`, `validateGraph()`; since Phase G the `loan` and `grant` predicates, `LoanTerms` (`instrument`, `ratePct`, `tenorYears`, `graceYears`, `conditions[]`), `projectId` and `holding` on an edge | **The provenance invariant lives here.** Every other module's guarantees reduce to this file |
| `data.ts` | The Money-Trail Atlas subgraph: 66 nodes, 111 edges, 11 motifs | Generated from the reviewed artefact, then extended by hand. Five dated edges were appended on 2026-09-26 for the DOJ, SEC and SEBI outcomes; four older edges carry `supersededBy` and stay addressable. The cross-fleet reconciliation of 2026-09-26 added seven High Court nodes (`delhi-hc`, `bombay-hc`, `madras-hc`, `jharkhand-hc`, `ap-hc`, `allahabad-hc`, `sikkim-hc`), renamed `lnt` to `co:larsen-toubro` (the roster id) and retyped `rss` from party to sangh with a supersession note. Do not hand-edit census figures |
| `build.ts` | Derives the national graph from the factual datasets | **Never** creates an edge between a person and a company on shared state or shared sector |
| `baseRates.ts` | Published denominators with sources; `computeRate()`; Benjamini–Hochberg FDR | The numbers that kill most proposed edges |
| `nullModel.ts` | Maslov–Sneppen degree-preserving rewiring, motif z-scores, path-length profile, `shortestPath` | Predicate-preserving: a donation edge can never rewire into a family edge. The path finder's median separation is printed beside every path |
| `motifEngine.ts` | Declarative motif templates — chained steps, star steps, negation | Computed, so a motif is allowed to come out empty. Reports `degenerate-null` when the topology makes the test impossible |
| `prospector.ts` | Exhaustive candidate generation; output is ranked questions, not findings | Feeds `/prospector` and the investigative desk |
| `fleet.ts` | Hand-written types for the generated fleet modules (`FleetMeta`, `BenefitRow`, `Void`, `Narrative`, `BaseRateRow`, `EntityIdentity`); since Phase H the tabular series rows `BudgetRow`, `StrengthRow` and `FootprintRow` (`6a99f11`) | The generator emits data, never types. A shape change is a reviewed edit here that every generated literal must then satisfy under `tsc --strict` |
| `mergeFleet.ts` | Pure function that merges the fleet graphs into the national graph | Composed by `DataContext`; tested by `scripts/merge-fleet.test.mjs`. Every consumer merges the same way |
| `energy.generated.ts` | **Generated, never hand-edit.** The energy fleet: 404 nodes, 711 edges (310 documented, 304 reported, 42 alleged, 55 analytic), 188 benefit rows, 78 voids, 65 narratives, 73 base rates. Run `run-ac2b087e866e`, generator 1.4.1 (the run id moved on 2026-09-26 when the cross-fleet mappings for `party:inc`, `wel:manmohan-singh` and the courts were applied; the counts did not) | Written by `npm run generate`. `npm run validate` §5 fails when it no longer matches a fresh assembly of its inputs, so a hand edit cannot ship. Read by `src/data/energy.ts` and `DataContext` |
| `finance.generated.ts` | **Generated, never hand-edit.** External finance: 353 nodes, 1,168 edges (1,077 documented, 54 reported, 9 alleged, 28 analytic), 1,003 benefit rows, 38 voids, 27 narratives, 75 base rates, 6 killed. `FINANCE_LOAN_FACTS` (945 loan facts with terms, one per World Bank commitment or hand-researched loan), `FINANCE_WB_TOTALS` (the census totals the sample is compared to). Run `run-e10a8edef94a` | Seven domain files; `worldbank-projects.json` is fetcher output (`scripts/finance/fetch-worldbank.mjs`), so its hand fixes live in the fetcher's tables, not in the file. Read by `src/data/financeView.ts` and `DataContext` |
| `ngo.generated.ts` | **Generated, never hand-edit.** NGOs and foreign contributions: 138 nodes, 292 edges (95 documented, 128 reported, 51 alleged — each with its `contra` — 18 analytic), 37 benefit rows, 30 voids, 23 narratives, 27 base rates, 14 killed. `NGO_FC_STATE` (102 state-year FCRA receipt rows, each summing to its national figure or declaring why not). Run `run-169c3129a1ec` | The FCRA portal was unreachable from the sandbox; every receipt and action is routed through Parliament answers, MHA annual reports and PIB, and says so. The contra for an unanswered allegation is the fixed wording `No response recorded — asked/not asked unknown` |
| `capital.generated.ts` | **Generated, never hand-edit.** Foreign capital in listed India: 133 nodes, 221 edges (153 documented, 34 reported, 12 alleged, 22 analytic), 14 benefit rows, 64 voids, 21 narratives, 43 base rates, 15 killed. `CAPITAL_HOLDINGS` (96 `own` edges with `holding {pct, shares, asOf, category, line, aggregate}`), `CAPITAL_COVERAGE` (the 50 NIFTY constituents: 38 read, 12 not read), `CAPITAL_CONTROLS` (19 comparison holders shown whenever BlackRock is). Run `run-916d30d537ff` | BlackRock's ETF aggregates in NIFTY 50 companies read 0.49–1.78%; the module carries Norway's GPFG, GIC, LIC and the promoter as controls on the same filings, so the page can never show one holder alone |
| `force.generated.ts` | **Generated, never hand-edit.** The money India spends on force, eight domains: 266 nodes, 394 edges (187 documented, 82 reported, 46 alleged, 79 analytic), 13 benefit rows, 67 voids, 46 narratives, 307 base rates, 22 killed (held, not deleted), 57 contras added. Three tabular series beside the graph: `FORCE_BUDGETS` (4,097 rows, each a payer, body, head, component, financial year, stage and ₹ crore), `FORCE_STRENGTH` (142 police strength rows), `FORCE_FOOTPRINT` (228 rows: cantonments, plants, laboratories and other installations, each with its state and city). Run `run-122278453551`, generator 1.4.1. `FORCE_META.audit` carries the 214 verdicts: 168 on claims, 46 on narratives (`unmatched`) | The first fleet with `series` (Phase H, `6a99f11`). Every series row has its exact keys in order and a body the graph knows; a budget row also a payer (the Union or a state code), component and stage from closed lists, a financial-year label and ₹ crore ≥ 0; a footprint row its state and city. One row per key across the directory. Read by `DataContext`, which merges it after capital. `docs/design/SECURITY_PAGE.md` names it as the `/security` data contract |

## 3. Data — `src/data/`

| File | Role | Notes |
|---|---|---|
| `geo.ts` | 36-state geometry accessor, label modes, `spiralWithin`, name→code resolution | Anchors are poles of inaccessibility, not bbox centres |
| `india-geo.json` | The geometry itself, with `cx`/`cy`/`clearance`/`bbox`/`parts` per state | Generated offline from `india-states.json`; regenerate rather than hand-edit |
| `india-states.json` | Upstream `@svg-maps/india` paths, kept for provenance | Source of truth for the derived file above |
| `world-geo.ts` | A hand-typed schematic world outline | Not a surveyed map, and says so |
| `companies.ts` | 259 listed companies, state rollups, sector totals, HHI | **Registered** HQ, never operational |
| `politics.ts` | 69 union ministers, portfolios with date ranges, ministry→sector reach | A portfolio without dates is useless — the date test is the primary falsifier |
| `conglomerates.ts` | 10 groups, 64 listed entities, key people, foreign partners | Anil Ambani's entities sit outside `listedEntities` **structurally** |
| `groupDeep.ts`, `footprint.ts` | The per-group entity, contract and investor maps; the re-verified global facility footprint | Feed `/conglomerates/:id` |
| `tenders.ts`, `resources.ts`, `procurement.ts`, `allocation.ts`, `capture.ts`, `pmcares.ts`, `media.ts` | The allocation registers, bid counts, the allocation graph, capture pathways, PM CARES with its PMNRF control, media ownership | Each file's header states what it deliberately is not |
| `indices.ts` | Typed accessor over `research/raw/indices.json`: NIFTY 50 (50), SENSEX 30 (30), SENSEX 50 (49 of 50 confirmed) | **Membership joins by company id only, never by name.** `indexCoverage()` makes every page print "49 of 50 confirmed". The announced NIFTY 50 review is kept apart from membership. Read by `/`, `/map`, `/industries`, `/company/:id`, `Domain.tsx`, `energy/Ledger.tsx`, `energy.ts` |
| `energy.ts` | The `/energy` data layer: filters the merged graph to the energy layer, pairs every contested claim with its answer, derives the ledger, lanes and base rates | Imports only compiled modules — never `research/raw/energy` directly. Pure functions of the parsed URL state. Never sums benefit amounts |
| `welfare.ts` | Typed access to the welfare fleet; the `Scheme`, `Election` and `Coverage` shapes (the contract's scheme record) | The shapes the generated module must satisfy |
| `welfare.generated.ts` | **Generated, never hand-edit.** The welfare fleet: 286 nodes (208 entities, 78 scheme nodes), 335 claims (163 documented, 93 reported, 14 alleged, 65 analytic), 78 schemes, 105 elections, 70 coverage declarations, 39 voids, 45 narratives, 50 base rates. Run `run-e3cc0f891306`, generator 1.4.1 | Same rules as `energy.generated.ts`. Read by `welfare.ts` and `DataContext` |
| `welfareView.ts` | Every figure, row and denominator `/welfare` shows | A count on screen is the `.length` of an array built here, and each table twin is the same array its graphic was drawn from |
| `financeView.ts` | Every figure, row and denominator `/finance` shows, for its three lenses (loans, associations, capital) | Reads the three generated modules and `mergeFleet`; never `research/raw`. Anchors are checked at load so a missing section fails the build. Sums nothing over loans: census beside sample, facilities beside tranches, so no ₹ total is ever true |
| `cppp.ts`, `cpppConcentration.ts` | Typed accessors over the CPPP JSON files for the national section of `/tenders`; since Phase H, `loadSecurity()` reads the seventh, `security.json` (headline, rates by class and year, bands, timing, concentration, red flags), for the "security buyers" line (`76c0c35`) | Import the JSON as compiled data; the pipeline that writes it is Python and offline. `cpppConcentration.ts` lists at most five marked winners per buyer and nobody else. When `security.json` is absent the "security buyers" line is absent |
| `securityView.ts` | The `/security` data layer named by `docs/design/SECURITY_PAGE.md` | [/security build status: pending — filled when the build stage reports] |
| `promotion.ts` | Typed accessor over the ingestion report | |

`src/context/DataContext.tsx` builds the merged graph once — national layer, Atlas,
then the fleets through `mergeFleet.ts`, the force fleet last — and memoises it. The
force series do not enter the graph; they ride beside it in the generated module.

## 4. Visual components — `src/components/`

| File | Role |
|---|---|
| `Editorial.tsx` | Page primitives — `Kicker`, `PageTitle`, `Standfirst`, `Section`, `Callout`, `StatGrid`, `DataTable`, `TierChip`, `TierLegend`, `Cite`, `Footnote` |
| `Domain.tsx` | Shared chrome for the register pages: one chrome, four centres |
| `Layout.tsx` | Grouped sidebar navigation (Markets, Registers, Power, Method, Tools), mobile menu with a named, `aria-expanded` toggle, live dataset counts |
| `viz/IndiaMap.tsx` | The choropleth map — quantile bins, no-data hatch, leader lines, keyboard ring |
| `viz/GeoNetwork.tsx` | **The geographic network** — entities in place, arcs, state-flow aggregation, ego focus, click-a-state filtering, time scrubber |
| `viz/ForceGraph.tsx` | Force-directed graph, drawn on a **Canvas 2D** since 2026-09-26 (`docs/superpowers/plans/2026-09-26-canvas-renderer.md`); `FAMILY_COLOR`/`FAMILY_LABEL` and every other export unchanged. Frozen channels (tier dash, family hue, type shape, size band) byte-identical to the SVG renderer; same-pair claim and denial drawn side by side; hit-testing on the drawn `Path2D`; forced-colors palette. Ego focus, path finder, semantic labels, minimap |
| `viz/GraphA11y.tsx` | The SVG overlay on the canvas: the element `camera.tsx` reads and every pointer event hits; real focusable elements only for the examined set (selection, neighbours, path, card edge, denials, cursor; ≤200); arrow-key cursor with a live region. `segOf` gives the same line positions to canvas and overlay |
| `viz/layoutCore.ts`, `viz/layout.worker.ts`, `viz/useLayout.ts` | d3-force in an inline worker (lazy Blob), same forces and 300-tick cold start so a shared URL still reproduces the layout; main-thread fallback runs the identical code; one settled frame under reduced motion |
| `viz/GraphExplorer.tsx` | Filter rail + graph + edge card + table twin, with URL-shareable state. The twin reads exactly what the graph draws |
| `viz/camera.tsx` | The one camera for every graph. Maximised view is a dialog with focus moved in and returned on Escape |
| `viz/FlowSankey.tsx`, `viz/Charts.tsx`, `viz/OwnershipTree.tsx`, `viz/WorldMap.tsx` | Flow diagram (band = ₹ crore, dash = tier); the chart layer; the indented ownership tree; the world footprint |
| `energy/*` (14 files) | `/energy` only: `Stage`, `EnergyGraph`, `EnergyStrip`, `SweepStrip`, `EnergyAside`, `Cards`, `Ledger`, `Calibration`, `Missing`, `StackTable`, `TenureLanes`, `EvidenceSection`, `hooks.ts`, `csv.ts`. Read `src/data/energy.ts`; import nothing from `welfare/` |
| `welfare/*` (8 files) | `/welfare` only: `WelfareMap`, `Control`, `TimeLanes`, `Panels`, `Sections`, `StageTwins`, `NarrativeLadder`, `ui.tsx`. Read `src/data/welfareView.ts`; import nothing from `energy/` |
| `finance/*` | `/finance` only: the chrome (lens tabs, filter rail, Find, one live region), the loans lens (map with pooled quantile bins and the fetcher class, the census-against-sample union bar, flow, clock, project list, contracts, debarments, conditions, debt), the associations lens (receipts chart with hatched missing years, state table and map, FCRA actions timeline with every case's `dl`, grants, welfare join), the capital lens (a `role="grid"` of holders × companies with roving tabindex, the Σ aggregate cells, the below-four guard, mandates, adviser comparison, rules). Read `src/data/financeView.ts`; import nothing from `energy/` or `welfare/` |
| `tenders/*` | The national section of `/tenders`: quality table first, single-bidder rates by portal and year with Wilson ribbons, decision-window histogram, concentration by buyer (HHI on value and on count), red-flag indicators as rates over their declared family, the live-verification sample, gaps and provenance footer. Read `src/data/cppp.ts`. Every graphic is `role="img"` with an n in its name and a table twin below. Since Phase H, `SecurityBuyers.tsx` prints one "security buyers" line beside the whole-file rates: the slice's award decisions and share of the file, its single-bidder rate with and without the works class, the sentence that defence capital acquisition is not on CPPP, and a link to `/security?lens=procurement` (`76c0c35`) |
| `security/*` | `/security` only. [/security build status: pending — filled when the build stage reports] |

## 5. Pages — `src/pages/` (34 routes)

Routes are declared in `src/App.tsx` and lazily loaded, except the dashboard. The nav
is in `src/components/Layout.tsx`.

**Markets** — `Dashboard` `/` · `MapExplorer` `/map` · `GeoGraph` `/geograph` ·
`IndustryView` `/industries` · `Conglomerates` `/conglomerates` · `GroupDeepDive`
`/conglomerates/:id` · `Interlocks` `/interlocks` · `StateProfile` `/states/:code` ·
`CompanyProfile` `/company/:id`

**Registers** — `Tenders` `/tenders` · `Resources` `/resources` · `PmCares` `/pmcares`
· **`Energy` `/energy`** · **`Welfare` `/welfare`** · **`Finance` `/finance`** · **`Security`
`/security`** (nav label "Security spend") · `MediaView` `/media` ·
`Allocation` `/allocation`

**Power** — `Cabinet` `/cabinet` · `NetworkView` `/network` · `Atlas` `/atlas`

**Method** — `Patterns` `/patterns` · `Motifs` `/motifs` · `Prospector` `/prospector`
· `Desk` `/desk` · `Capture` `/capture` · `EvidenceAudit` `/evidence` · `BaseRates`
`/base-rates` · `Competition` `/competition` · `Provenance` `/provenance` · `Method`
`/method`

**Tools** — `Search` `/search` · `PoliticalView` `/political` · `Watchlist` `/watchlist`

`/energy` is the power map: the merged graph filtered to the energy layer, a sweep
strip, a margin that shows the documented voids at rest, a who-benefits ledger that
sums nothing, the contested list with every allegation beside its answer, the base
rates as numerator of denominator, the narratives ladder, tenure lanes, a company trail
from any index constituent (by id only), and a paginated table twin with CSV.
`/welfare` is the distribution-funds map, 2000→2026: fixed colour classes across all
years, three distinct non-value fills, a ballot mark for every assembly election in the
scrubbed year, central schemes listed beside the map and never painted on states, the
election-timing check as three 2×2 tables with n stated, party as text and never as a
colour. Both render honestly with zero records.

`/finance` is "Foreign money", three lenses on one route (`?lens=loans|associations|capital`):
external loans as contracts with terms (lender, borrower, instrument, rate, tenor, grace,
conditions), the World Bank census beside the researched sample and never summed; FCRA
receipts, actions and donors with every allegation beside its answer and no classification
by keyword, religion or stance; foreign holders of NIFTY 50 companies as a grid that always
shows the comparison set (Norway, Singapore, LIC, the promoter) beside BlackRock and
renders nothing below four rows. Institutions, not bloodlines: a family, religion or
ethnicity is never a node, edge, filter or colour; narratives that name one are rated on
the ladder only. `/tenders?section=national` is the CPPP award record: 4.92 million rows
reduced to 3.39 million award decisions by a stated dedup rule, the dataset's defects
printed before any rate, single-bidder rates with Wilson intervals over their declared
denominator, and the 40-page live verification whose every page was gone. Since Phase H it
carries one "security buyers" line that links to `/security?lens=procurement`.

`/security` is "The money India spends on force". The judged spec
(`docs/design/SECURITY_PAGE.md`) gives it three lenses on one route
(`?lens=budgets|footprint|procurement`): Union budget lines, state police spend and strength,
and pay and pensions; the footprint by state and city; and procurement, people and the
cases. The route, the nav entry and a scaffold landed in `0073a0f`; the scaffold printed
the loaded series counts and run id from `FORCE_META` instead of drawing a placeholder.
A checkpoint of the build in progress replaced it in `878edcd`.
[/security build status: pending — filled when the build stage reports]

`AdaniDeepDive.tsx` and `RelianceDeepDive.tsx` are not routed; `GroupDeepDive`
replaced them.

## 6. Scripts — `scripts/`

| File | Command | Fails when |
|---|---|---|
| `promote.mjs` | `npm run promote` | A record would produce an edge with no source and a tier that is not `alleged`/`analytic`; or a merge would fuse the two Reliance groups |
| `assemble-fleet.mjs` | `npm run generate` | A fleet's assembled claims break an invariant after reconciliation and audit. Writes the six generated modules (`energy`, `finance`, `ngo`, `capital`, `force` under `src/graph/`, `welfare` under `src/data/`) from the `FLEETS` table in `lib/vocab.mjs`; each fleet writes independently, and a failing fleet leaves its module untouched and exits 1. Derives loan facts from the World Bank census, FCRA state rows and holdings when a fleet declares them. Since Phase H a fleet may declare tabular `series`: the force fleet's budgets, strength and footprint rows are read from every file in its directory, mapped through the reconciliation, checked row by row and emitted beside the graph (`6a99f11`). Output is a function of the input bytes only |
| `lib/vocab.mjs` | — | The closed vocabularies (predicates incl. `loan`/`grant`, `MONEY_PREDS`, tiers, node types, families, `ISO_DATE`, `TERMS_KEYS`) and the `FLEETS` table (directory, output module, id prefixes, per-fleet derivations; since Phase H the `force` row and its `series`, with the `SERIES` key lists and the budget, strength and footprint row rules) shared by the assembler and the validator. One copy, so the two gates cannot drift |
| `lib/fleet-refs.mjs` | — | Resolves a fleet-prefixed id (`fin:`, `ngo:`, `cap:`, `energy:`, `wel:`, `scheme:`, `force:`) to the fleet that must define it. §4 rejects a claim whose endpoint is a prefixed id that no file in that fleet defines |
| `validate.mjs` | `npm run validate` | Any of the four invariants is violated; geometry is missing or malformed; a motif census has no denominator. **§4** gates `research/raw/{energy,welfare,finance,ngo,capital,force}/*.json` at the quarantine boundary (provenance, contra for every allegation, innocent reading, amounts, `holding.pct` in 0–100, FCRA state rows summing to their national figure, prefixed ids defined in their fleet; warns when a court ruling modelled as `enforce` does not begin `Judicial ruling on <claim id>:`) and checks `indices.json` against the company dataset; since Phase H it applies the series row rules and rejects a key written twice across a fleet directory. **§5** checks each generated module against a fresh in-memory assembly and re-derives every ₹ figure from its US$ and the stated rate, so a stale or hand-edited module fails; it re-assembles the force series and compares them too |
| `assemble-fleet.test.mjs`, `merge-fleet.test.mjs` | `npm run test:assemble` | The assembler's rules or the graph merge regress, on a synthetic fixture. Research-independent: a red here is a code fault. The series tests took the count from 55 to 64, written RED first on a synthetic force fixture (`6a99f11`) |
| `finance/fetch-worldbank.mjs`, `finance/fetch-worldbank.test.mjs`, `finance/mark-loans.mjs` | offline | Fetches the World Bank Projects API for India (1,117 projects) and writes `research/raw/finance/worldbank-projects.json`: one entity per borrower and implementing agency, one `loan` claim per IBRD/IDA commitment (849), each with a `projectId`, `countable`/`countedAs`/`notCountableReason`, and the placement rule's branch; hand resolutions live in its tables so a re-fetch reproduces the file. 25 tests on fixtures. `mark-loans.mjs` marks which hand-researched loans are already in the census so nothing is counted twice |
| `cppp/build.py`, `cppp/security.py`, `cppp/verify_sample.py`, `cppp/test_build.py`, `cppp/test_verify.py`, `cppp/README.md` | offline, Python 3.11 + duckdb + pyarrow, **not in CI** | The CPPP award pipeline over the 4.92 M-row Hugging Face scrape (two Arrow IPC stream files, 3.45 GB, digests recorded): quality first, then rates, timing, concentration, red flags, and a seeded 40-row live verification. Writes the JSON files in `research/raw/cppp/`, each with the exact SQL of every table in its `provenance`. Since Phase H, `security.py` writes the seventh, `security.json`, in the same run over the same connection and dedup view: the security-buyer slice in eight buyer classes, every rate beside the whole file (`1e37783`). `SET threads TO 1` and paise rounding make a rebuild byte-identical; 27 + 28 tests on a synthetic fixture where every name is invented (`test_build.py` had 21 before the slice) |
| `smoke.mjs` | `npm run smoke` | Any route renders blank or throws; the map draws fewer than 36 state paths; the map is not keyboard-focusable. Serves `dist` itself; visits all 34 routes, 52 URLs in all, several with URL parameters. Phase H added `/security`, `/security?lens=footprint` and `/security?lens=procurement` (`0073a0f`) |
| `graph-viewport.mjs` | `npm run viewport` | The graph camera letterboxes, a drag does not move the graph by the drag, auto-fit clips, maximise does not take the window, or selecting and path-finding move the camera. Since the canvas renderer: canvas backing store ≠ frame × DPR, no ink under the largest node, pin ring absent (with a before-pin control), any in-fill point of any glyph class fails to hover its glyph, stale hit-testing after a focus change, a same-pair denial hiding its claim, keyboard cursor not announced |
| `pages/energy.test.mjs`, `pages/welfare.test.mjs` | `npm run test:pages` | A `/energy` or `/welfare` acceptance criterion fails (67 and 85 criteria; headless Playwright against `dist`; the energy suite builds its scaffold `dist-empty` itself, the welfare suite takes `WELFARE_DIST` and skips its 9 scaffold criteria on a FULL build). Last in `check` and CI. The script names its files explicitly because Node 20's `--test` does not expand a glob; the finance and tenders suites joined it on 2026-09-27 |
| `pages/finance.test.mjs`, `pages/tenders.test.mjs`, `pages/finance-review.test.mjs` | `npm run test:pages` (the first two); `FINANCE_DIST=… node --test scripts/pages/finance-review.test.mjs` | A `/finance` (110 criteria; 109 pass, AC-38 skips for want of a zero-amount loan) or `/tenders` national-section (86; 84 pass, 2 skip as "not in this data") acceptance criterion fails. Both written blind to the implementation, both adjudicated criterion by criterion after the first build (`[Adjudicated]` marks in the acceptance documents), both in the gate since green on three consecutive runs. The review suite (R1–R4) holds the caucus's own checks apart from the blind suite |
| `pages/security.test.mjs` | `node --test scripts/pages/security.test.mjs`; **not in `test:pages` or CI** | A `/security` acceptance criterion fails (152 criteria, one Playwright check each; fixtures re-derived at start from the force module, `security.json`, `india-geo.json` and `state-economy.json`). It reads `dist` and the data files and imports nothing from `src/pages/`, `src/components/` or `securityView.ts`; one block reads the `FAMILY_COLOR` literal of `src/components/viz/ForceGraph.tsx` as text, never by import. RED on the scaffold: 152 of 152 fail, each on a missing element, none on a test error (`2f922b2`). It joins `test:pages` and CI only after three green runs on a pinned build. [/security build status: pending — filled when the build stage reports] |
| `skills/force-money-trail/gen.mjs`, `skills/force-money-trail/*.src.md` | `node scripts/skills/force-money-trail/gen.mjs`; gated by `npm run check:skills` | Fills every placeholder in the four skill templates (`SKILL`, `ledger`, `narratives`, `tables`) from the force raw files, `FORCE_META` and `security.json`; stops on a placeholder that does not resolve; byte-identical on a re-run (`4a6e079`). `check:skills` regenerates the skill and fails on any difference from the committed copy, so a research change that leaves the skill quoting stale figures fails the build (`67f27ab`) |
| `build-procurement.mjs`, `prospect-procurement.mjs`, `verify-sample.mjs` | — | Offline: the bid-count dataset from the OCDS files, the procurement pattern search, and the Stage 0 verification sampler |

`npm run check` runs `promote → generate → test:assemble → validate → check:skills → build →
smoke → viewport → test:pages`, in that order; `check:skills` joined in Phase H (`67f27ab`).
CI (`.github/workflows/ci.yml`) runs the same steps, "Skill freshness" after "Data integrity".

## 7. Agents and skills — `.claude/`

Fifteen agents, each with an explicit refusal surface: `graph-cartographer`,
`evidence-auditor`, `base-rate-statistician`, `market-cartographer`, `polity-analyst`,
`viz-engineer`, `interface-designer`, `frontend-developer`, `pattern-prospector`,
`investigative-desk`, **`cross-examiner`** (one claim, one lens, default refuted),
**`energy-analyst`** (the sector domain map and the questions in order), and, new with
Phase G, **`finance-analyst`** (foreign loans and their conditions, FCRA, foreign holders,
mandates and rules — refuses a family or ethnicity as an edge, a holder alone, a ₹ total
over loans) and **`procurement-analyst`** (owns `scripts/cppp/` and the six JSON files —
refuses an unmarked name, a rate without its family, a rebuild that is not byte-identical),
and, new with Phase H, **`security-analyst`** (owns the `force` fleet, its three series, its
audit and reconciliation, and the CPPP security slice). It refuses first: no operational
detail, no person below the public rank and no private individual, no city money that is not
published (Delhi Police is the one city budget, and it is a Union demand). Six pressure
testers tried to break those refusals; two held, four held in part, and 51 of the 54 gaps
found were closed outright and 3 in part (`4a6e079`).

Fifteen skills: `evidence-tiering`, `pattern-discipline`, `india-map`, `graph-schema`,
`source-retrieval`, `investigative-desk`, `pattern-prospecting`, `interface-design`,
`frontend-implementation`, and, new with the fleets (the last, `force-money-trail`, with Phase H):

| Skill | What it is |
|---|---|
| `cui-bono` | "Who benefits" as a ledger row — who, how, amount, rivals, counterfactual, boring explanation, falsifier — with the cross-examination pass that runs before a tier is set |
| `energy-money-trail` | What the energy fleet established, as rules for the next pass: canonical ids, base rates with denominators, the symmetry results, the voids and where each record would live, the retrieval routes that worked, a failure-mode checklist tied to real claim ids |
| `foreign-money-trail` | What the finance, ngo and capital fleets established: canonical ids for lenders, donors and holders; the controls that must be shown beside any named institution; the denominators; the retrieval routes that worked when the IMF, FCRA and BSE portals did not; `references/ledger.md` (every who-benefits row) and `references/narratives.md` (the ladder for BlackRock, Rothschild, Soros, IMF/World Bank, FCRA and "China money" claims, each with its strongest counter) |
| `force-money-trail` | What the force fleet established: the refusals and the three-level resolution statement first, then a refuse-and-reshape table; ids, denominators, controls, voids, sources and failure modes in `references/tables.md`; `references/ledger.md` (counting rules, base rates, the refuted and killed register, the 214 audit corrections by domain) and `references/narratives.md` (every narrative in the eight files with its strongest case and counter). Generated: no figure is typed by hand (`scripts/skills/force-money-trail/gen.mjs`, gated by `check:skills`). A figure check sampled 506 figures across the four skill files and the agent against the raw files: 494 matched; the 12 that did not were in the agent's register block, written against an older run, and now read `run-122278453551` (`4a6e079`) |
| `fact-check-workflow` | Vendored. Claim log → research → evidence → rating |
| `knowledge-graph-construction` | Vendored. Layered-tier KG design and validation checklist |

`.claude/skills/VENDORED.md` records where the two vendored skills came from and the
candidates reviewed and not adopted.

## 8. Research quarantine — `research/`

`research/raw/` is **untrusted**. Research agents write there; nothing is believed
until a gate has passed it.

| File | Records | Gate |
|---|---|---|
| `raw/cabinet.json` | 69 ministers | `promote` |
| `raw/companies-by-state.json` | 259 companies, 26 states covered, 10 states explicitly recorded as having none | `promote` |
| `raw/state-economy.json` | 36 states/UTs | `promote` |
| `raw/conglomerates.json` | 10 groups, 64 listed entities | `promote` |
| `raw/indices.json` | NIFTY 50 (50), SENSEX 30 (30), SENSEX 50 (49 — the fiftieth is a recorded gap), one announced change, 6 gaps | `validate` §4 against the company dataset |
| `raw/energy/*.json` | 12 domain files: coal, mines, oilgas, hydro, solarwind, nuclear, grid, money, people, enforce, states, literature | `validate` §4, then `generate` |
| `raw/welfare/*.json` | 7 domain files: central, women-cash, state-cash-other, fiscal-results, elections-timing, vendors, literature | `validate` §4, then `generate` |
| `raw/finance/*.json` | 7 domain files: worldbank, worldbank-projects (fetcher output, 1,117 projects, 849 loan claims), adb-aiib, bilateral-china, contracts, debt-imf-people, literature | `validate` §4, then `generate` |
| `raw/ngo/*.json` | 5 domain files: fcra-receipts, fcra-actions, political-trusts, donors-narratives, darpan-welfare-join | `validate` §4, then `generate` |
| `raw/capital/*.json` | 16 domain files: holders and holders-b1…b9 (one batch per set of NIFTY 50 filings), holders-aggregates, mandates-ventures, rules-regulators, narratives-literature, controls, coverage | `validate` §4, then `generate` |
| `raw/force/*.json` | 8 domain files: union-defence, union-home, state-police, procurement-industry, footprint, money-people, pay-pensions, literature. Besides entities and claims they carry the three series: budgets in pay-pensions (17), state-police (187), union-defence (1,151) and union-home (2,742); strength in state-police (90) and union-home (52); footprint in footprint (184), procurement-industry (24), state-police (17) and union-home (3) | `validate` §4, then `generate` |
| `raw/cppp/*.json` | 7 aggregate files written by `scripts/cppp/build.py`: quality, rates, timing, concentration, redflags, sample-verification (+ provenance), and since Phase H `security.json` from `security.py`: 558,291 raw rows (11.34 % of the file), 411,943 award decisions after the dedup rule (12.17 %), in eight buyer classes; single bidding 3.17 % of 365,600 against 11.22 % for the whole file, 12.2 % without the works class. Its first field says what it is not: defence capital acquisition is not on CPPP. Aggregates only; no award row and no unmarked name is committed | Compiled in by `src/data/cppp.ts`; rebuilt offline, checked byte-for-byte by `test_build.py` |
| `raw/*/RECONCILIATION.json` | By-products, not research. Id mappings, refused merges with reasons, consolidations, predicate fixes. Energy: 29 mappings, 22 refused merges, 43 records consolidated. Welfare: 18 mappings, 23 refused merges, 5 predicate fixes. Finance: 13 mappings, 36 refused merges, 15 loans marked as already in the census, 6 not countable. NGO: 4 mappings, 23 refused merges, 10 predicate fixes, 2 contras added. Capital: 7 mappings, 25 refused merges, 96 holder records consolidated, 11 killed. Force: 7 mappings, 34 refused merges, 64 entity records consolidated, 4 predicate fixes, 2 contras added, 22 killed (duplicates, held), 27 other fixes, 17 critic items, and 214 audit corrections, one recorded outcome per verdict | Read by `generate`; not validated as research |
| `raw/*/AUDIT.json` | By-products. Cross-examiner verdicts per claim, one lens each. Energy: 60 (22 refuted). Welfare: 35 (15 refuted). Finance: 84 (40 refuted, 7 kill). NGO: 142 (63 refuted, 14 kill). Capital: 61 (19 refuted, 4 kill). Force: 214 (47 refuted, 1 kill), both lenses on each; 168 are on claims and 46 on narratives, which `FORCE_META.audit.unmatched` lists apart. The Phase G audits predate their reconciliations, so a verdict's claim id may have moved; the assembler applies the mapping first | Read by `generate`: kill on a kill verdict or two refuting lenses; move a tier only downward; add a denial only when found and sourced |
| other `raw/*.json`, `raw/*.md` | Tenders, resources, procurement, PM CARES, media, the group deep dives, the literature reviews | `promote` |
| `promotion-report.json` | Generated. Merges, collision candidates, rejections, run id | — |

## 9. Documents — `docs/`

| Path | What it is |
|---|---|
| `design/ENERGY_PAGE.md`, `design/WELFARE_PAGE.md`, `design/FINANCE_PAGE.md`, `design/TENDERS_NATIONAL.md` | The judged, synthesised page specs. `[UX review]` amendments applied in place; deferred ones listed at the end (energy D1–D47, welfare D1–D35). `FINANCE_PAGE.md` carries 47 decisions and its §3.3 generator prerequisites G1–G4; `FINANCE_JUDGEMENT.md` and the two `FINANCE_PAGE.candidate-*.md` are the duel it was judged from |
| `design/SECURITY_PAGE.md`, `design/SECURITY_JUDGEMENT.md`, `design/SECURITY_PAGE.candidate-A.md`, `design/SECURITY_PAGE.candidate-B.md` | Phase H. The judged `/security` spec carries 61 decisions (D1–D61), prerequisites S1–S13 and the build prerequisite G5, and the deferred UX amendments UD1–UD46. Candidate A is graphic-first, candidate B question-first; the judge kept A's resolution statement and its three levels (Union to the line, state to the Police head, city to the footprint and Delhi) and grafted B's question framing onto each lens (`e0e7119`) |
| `design/drafts/*` | The competing designs each spec was judged from: graphic-first, question-first, and a solo draft, per page |
| `design/*_UX_REVIEW.md` | Five synthetic persona seats per spec. Labelled SYNTHETIC: hypotheses, not user research. `SECURITY_UX_REVIEW.md`: 95 persona items; 33 must-level amendments (U1–U33) applied in place, 46 deferred (UD1–UD46), one new decision (D61), none dropped (`7e100e7`) |
| `design/*_ACCEPTANCE.md` | What "done" means, one criterion per test in `scripts/pages/` (energy 67, welfare 85, finance 110, tenders national 86, security 152). `SECURITY_ACCEPTANCE.md` computes every expected value from the force module and `security.json`, never a literal; five source-reading spec gates are left to a module test and say why (`7e100e7`) |
| `design/*_A11Y.md` | WCAG 2.1 AA audits. Energy: 0 critical, 5 serious (fixed), 7 moderate, 9 minor. Welfare: 0 critical, 3 serious (fixed), 7 moderate (M1–M4 fixed), 11 minor. Tenders national: 0 critical, 0 serious, 8 moderate (M1–M8 fixed), 13 minor. Finance: 0 critical, 2 serious (fixed), 6 moderate (M1–M6 fixed), 12 minor. Security: [/security build status: pending — filled when the build stage reports] |
| `research/FLEET_CONTRACT.md` | The output contract every fleet agent writes to; since Phase H the `force` row and the series section (`6a99f11`) |
| `research/force/` | Phase H: `SPEC.md` (the fleet brief), `CONTRACT-force.md` (the fleet's addendum to the contract), `recon.json` (the reconnaissance: probes, critic, fills) and `recon-notes.md` (the reconciliation notes, applied or refused in `RECONCILIATION.json` `criticItems`). Moved into the repository from a session scratchpad (`4a6e079`) |
| `research/GRAPH_UI_SOTA.md` | Graph-UI state of the art. Keep the model; replace only the renderer (Canvas 2D, d3-force in a worker, an accessibility overlay, zero new runtime dependencies). §5 is the migration plan |
| `research/DATA_SOURCES.md` | Reachability, licence and fields of the open datasets the graph can be built from: the energy sweep of 2026-09-25 and the Phase G sweep of 2026-09-26 (World Bank API, ADB, AIIB, JICA, AidData, the IMF and FCRA portals that were unreachable, the CPPP scrape) and the Phase H sweep of 2026-10-04 to 06 (every host the force fleet probed or cites: 8,751 URL references, 746 distinct URLs, 137 hosts, counted by script; recipes for the five routes that carried the fleet; the voids and what each would settle) (`3a7ff00`) |
| `research/ENERGY_LITERATURE.md`, `research/WELFARE_LITERATURE.md`, `research/FINANCE_LITERATURE.md`, `research/NGO_LITERATURE.md`, `research/CAPITAL_LITERATURE.md`, `research/FORCE_LITERATURE.md` | Readable twins of the fleets' literature files. `FORCE_LITERATURE.md` (Phase H, `3a7ff00`) is organised by question, cites only works the force files cite, and quotes the published CPPP slice where `literature.json` still carries the spec's first-cut probe figures |
| `superpowers/plans/2026-09-25-*.md` | The implementation plans the two page builds ran from |
| `superpowers/specs/2026-09-26-foreign-money-ngos-tenders-design.md`, `superpowers/plans/2026-09-26-*.md` | Phase G: the design (reconnaissance, stance, architecture, risks, decisions), its ten-task plan, and the `/finance` page plan |
| `superpowers/specs/2026-10-04-force-finance-design.md`, `superpowers/plans/2026-10-04-force-finance.md`, `superpowers/plans/2026-10-04-security-page.md` | Phase H: the design (assumptions, reconnaissance, what resolves at which level, stance, architecture, decisions) and its ten-task plan (`dfeab6c`); the `/security` build plan, written by the page builder before it started (`956952c`) |
| `PLUGINS.md` | Plugins and skills in use, and the build-fleet shape; since Phase H a section on which skills and agents ran Phase H, each step tied to its commit (`3a7ff00`) |
| `BUNDLE.md` | The hand-off snapshot: layout, how to run `dist/`, the gate table at the moment it was cut |
| `PLATFORM_PLAN.md`, `RESEARCH_PLAN.md`, `TASK_INDEX.md`, `MASTER_PLAN.md`, `RECONCILIATION.md` | Earlier plans, trackers and the `main`→`master` reconciliation record |
| `legacy/` | Superseded, retained so nothing is lost: the original ICIP master plan, the two pre-`.claude` skill notes, and the original type model |

**Phase H, by commit** (`git log --oneline 447e854..HEAD`; 26 commits at `377e016`).
Schema: tabular series per fleet and the empty force module (`6a99f11`). CPPP security slice
(`1e37783`). Force fleet: the first two domains, 101 verdicts (`d648a26`); six more domains
(`8671e8d`); reconciled, 22 duplicate claims killed and held (`8dc2a68`); corrections, five
domains (`3cb37ed`) and the last three (`08062a9`); eleven verdicts on the added records,
214 in all (`d9bc302`); the eleven applied, 214 of 214 corrections recorded,
`run-122278453551` (`76e265d`). Design: the spec and ten-task plan (`dfeab6c`); the design
duel and judged spec (`e0e7119`); the synthetic UX review and 152 acceptance criteria
(`7e100e7`). Page: the route scaffold (`0073a0f`); the `/tenders` "security buyers" line
(`76c0c35`); the RED suite (`fdcfedc`, `7e2e474`), complete at 152 of 152 failing on the
scaffold (`2f922b2`); the build plan (`956952c`); a build-in-progress checkpoint (`878edcd`).
Skill and agent: drafts (`7e2e474`, `657f895`); pressure-tested, with the generator and
`docs/research/force/` (`4a6e079`); the skill freshness gate (`67f27ab`). Documents:
DATA_SOURCES, FORCE_LITERATURE and PLUGINS (`3a7ff00`); drafts of this index, HANDOFF,
CUSTOM_PLAN Phase H, README and BUNDLE (`e403818`); a checkpoint of HANDOFF fixes and the
acceptance criteria's adjudication in progress (`377e016`). Housekeeping: `.claude/worktrees/`
ignored (`7564bab`). [/security build status: pending — filled when the build stage reports]

---

## Invariants that live in more than one place

If you change any of these, change **all** the listed sites together.

| Invariant | Sites |
|---|---|
| Provenance: every edge sourced or `alleged`/`analytic` | `schema.ts:hasProvenance`, `validate.mjs` (§2, §4, §5), `promote.mjs`, `assemble-fleet.mjs` gate, `/method` live check |
| Unresolved entities take no edges | `schema.ts:validateGraph`, `validate.mjs` (§2, §4), `promote.mjs`, `assemble-fleet.mjs` gate, `GraphExplorer` detail panel |
| Analytic edges and motifs carry an innocent reading | `schema.ts`, `validate.mjs` (§2, §4), `assemble-fleet.mjs` gate, `motifEngine.ts`, every page that renders a motif |
| Every `alleged` claim ships with its `contra` | `validate.mjs` §4 (same file), `assemble-fleet.mjs` gate (after audit), `src/data/energy.ts` pairing and the `/energy` contested list, the `/welfare` response slot |
| Dates are ISO 8601 at reduced precision (`YYYY`, `YYYY-MM`, `YYYY-MM-DD`); never invent a day | `scripts/lib/vocab.mjs:ISO_DATE`, `docs/research/FLEET_CONTRACT.md` |
| One alias, one entity | `validate.mjs` §4 (across the whole fleet directory, schemes included) and §5 (generated modules), `assemble-fleet.mjs` (records collapsing onto one id merge their aliases; refused merges stay apart) |
| Closed vocabularies (predicates, tiers, types, families) | `scripts/lib/vocab.mjs`, `src/graph/schema.ts`, `src/data/welfare.ts` |
| No edge from co-location | `build.ts` (by omission), `/states/:code`, `/company/:id`, `/geograph` — all three say so in prose |
| Registered ≠ operational HQ | `companies.ts`, `market-cartographer` agent, `/map`, `/company/:id`, `/geograph` |
| The two Ambani groups never merge | `conglomerates.ts` type shape, `promote.mjs` structural guard, `/conglomerates`, energy `RECONCILIATION.json` refused merges |
| Index membership is an id join | `src/data/indices.ts`, `validate.mjs` §4, every page that shows membership |
| Institutions, not bloodlines: a family, religion or ethnicity is never a node, edge, filter or colour | `docs/superpowers/specs/2026-09-26-*.md` §3, `finance-analyst` agent, `foreign-money-trail` skill, `/finance` refusals section |
| A named holder or lender is never shown alone; the comparison set renders with it | `CAPITAL_CONTROLS` in `capital.generated.ts`, `src/data/financeView.ts`, `/finance` capital lens (nothing renders below four rows) |
| No ₹ total over loans: census beside sample, facility beside tranche | `FINANCE_WB_TOTALS` + `countable`/`countedAs` in the assembler, `validate.mjs` §5 (₹ re-derived from US$ × fx), `/finance` loans lens |
| A fleet-prefixed id is defined in its own fleet | `scripts/lib/fleet-refs.mjs`, `validate.mjs` §4, `assemble-fleet.mjs` |
| A series row is a closed shape: exact keys in order, a body the graph knows, closed lists for component, stage and kind, a financial-year label and ₹ crore ≥ 0 where the row has them, state and city on a footprint row, one row per key across a fleet directory (Phase H) | `scripts/lib/vocab.mjs` (`SERIES`, the row rules), `assemble-fleet.mjs`, `validate.mjs` §4 and §5, `src/graph/fleet.ts` |
| A city police budget is shown as a number only for Delhi Police, a Union demand; every other city's police money is inside its state's Police head | `docs/superpowers/specs/2026-10-04-force-finance-design.md`, `docs/design/SECURITY_PAGE.md`, `force-money-trail` skill, `security-analyst` agent. No validator rule catches a city row; the agent's brief says so and makes the agent the gate |
| A CPPP winner is named only when marked, at most five per buyer with ≥ 5 awards (and in `security.json` at most ten per buyer class); indicators are rates over a family, never a list | `scripts/cppp/build.py` (`markerRegex`, `refusal`, `namingRule`) and `security.py` (`markerRegex`, `namingRule`; its refusal is build.py's), `src/data/cpppConcentration.ts`, `force-money-trail` skill, `security-analyst` and `procurement-analyst` agents |
| Party is text: never a colour, a filter, a sort or the subject of an edge (Phase H) | `force-money-trail` skill, `security-analyst` agent, `docs/design/SECURITY_PAGE.md` |
