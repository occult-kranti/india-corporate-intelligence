# Index

Every file in this repository, what it is, and what depends on it. Read this before
changing anything — several files are load-bearing for the project's editorial
guarantees, not just for its build.

*Updated 2026-09-27, after the finance, ngo and capital fleets, the CPPP award pipeline and
the `/finance` page landed. Counts below are read
from the files named beside them; where a file and this index disagree, the file is
right and this index is stale.*

---

## 1. Read-me-first, in order

| # | File | Why |
|---|---|---|
| 1 | [`README.md`](../README.md) | What the project is, the four invariants, the stack |
| 2 | [`docs/CUSTOM_PLAN.md`](CUSTOM_PLAN.md) | Why the two source projects merged, the phased plan, what shipped (Phases A–G) |
| 3 | [`.claude/skills/pattern-discipline/SKILL.md`](../.claude/skills/pattern-discipline/SKILL.md) | The anti-apophenia checklist the whole platform exists to enforce |
| 4 | [`.claude/skills/graph-schema/SKILL.md`](../.claude/skills/graph-schema/SKILL.md) | The data model |
| 5 | [`.claude/skills/evidence-tiering/SKILL.md`](../.claude/skills/evidence-tiering/SKILL.md) | How a claim gets a tier |
| 6 | [`docs/INGESTION.md`](INGESTION.md) | How the original raw research becomes graph data (`promote`) |
| 7 | [`docs/research/FLEET_CONTRACT.md`](research/FLEET_CONTRACT.md) | What a research-fleet agent may write, and the gate that rejects it otherwise |
| 8 | [`HANDOFF.md`](../HANDOFF.md) | Pick-up-cold prompt for the next session |
| 9 | [`docs/PLUGINS.md`](PLUGINS.md) | Which plugins and skills the build uses, and how a build fleet is composed |
| 10 | [`docs/superpowers/specs/2026-09-26-foreign-money-ngos-tenders-design.md`](superpowers/specs/2026-09-26-foreign-money-ngos-tenders-design.md) | Phase G: foreign loans, NGOs and the national tender record — the reconnaissance, the stance (institutions, not bloodlines; loans are contracts with terms; identical fields for every side) and the decisions |

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
| `fleet.ts` | Hand-written types for the generated fleet modules (`FleetMeta`, `BenefitRow`, `Void`, `Narrative`, `BaseRateRow`, `EntityIdentity`) | The generator emits data, never types. A shape change is a reviewed edit here that every generated literal must then satisfy under `tsc --strict` |
| `mergeFleet.ts` | Pure function that merges the fleet graphs into the national graph | Composed by `DataContext`; tested by `scripts/merge-fleet.test.mjs`. Every consumer merges the same way |
| `energy.generated.ts` | **Generated, never hand-edit.** The energy fleet: 404 nodes, 711 edges (310 documented, 304 reported, 42 alleged, 55 analytic), 188 benefit rows, 78 voids, 65 narratives, 73 base rates. Run `run-ac2b087e866e`, generator 1.4.1 (the run id moved on 2026-09-26 when the cross-fleet mappings for `party:inc`, `wel:manmohan-singh` and the courts were applied; the counts did not) | Written by `npm run generate`. `npm run validate` §5 fails when it no longer matches a fresh assembly of its inputs, so a hand edit cannot ship. Read by `src/data/energy.ts` and `DataContext` |
| `finance.generated.ts` | **Generated, never hand-edit.** External finance: 353 nodes, 1,168 edges (1,077 documented, 54 reported, 9 alleged, 28 analytic), 1,003 benefit rows, 38 voids, 27 narratives, 75 base rates, 6 killed. `FINANCE_LOAN_FACTS` (945 loan facts with terms, one per World Bank commitment or hand-researched loan), `FINANCE_WB_TOTALS` (the census totals the sample is compared to). Run `run-e10a8edef94a` | Seven domain files; `worldbank-projects.json` is fetcher output (`scripts/finance/fetch-worldbank.mjs`), so its hand fixes live in the fetcher's tables, not in the file. Read by `src/data/financeView.ts` and `DataContext` |
| `ngo.generated.ts` | **Generated, never hand-edit.** NGOs and foreign contributions: 138 nodes, 292 edges (95 documented, 128 reported, 51 alleged — each with its `contra` — 18 analytic), 37 benefit rows, 30 voids, 23 narratives, 27 base rates, 14 killed. `NGO_FC_STATE` (102 state-year FCRA receipt rows, each summing to its national figure or declaring why not). Run `run-169c3129a1ec` | The FCRA portal was unreachable from the sandbox; every receipt and action is routed through Parliament answers, MHA annual reports and PIB, and says so. The contra for an unanswered allegation is the fixed wording `No response recorded — asked/not asked unknown` |
| `capital.generated.ts` | **Generated, never hand-edit.** Foreign capital in listed India: 133 nodes, 221 edges (153 documented, 34 reported, 12 alleged, 22 analytic), 14 benefit rows, 64 voids, 21 narratives, 43 base rates, 15 killed. `CAPITAL_HOLDINGS` (96 `own` edges with `holding {pct, shares, asOf, category, line, aggregate}`), `CAPITAL_COVERAGE` (the 50 NIFTY constituents: 38 read, 12 not read), `CAPITAL_CONTROLS` (19 comparison holders shown whenever BlackRock is). Run `run-916d30d537ff` | BlackRock's ETF aggregates in NIFTY 50 companies read 0.49–1.78%; the module carries Norway's GPFG, GIC, LIC and the promoter as controls on the same filings, so the page can never show one holder alone |

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
| `cppp.ts`, `cpppConcentration.ts` | Typed accessors over the six CPPP JSON files for the national section of `/tenders` | Import the JSON as compiled data; the pipeline that writes it is Python and offline. `cpppConcentration.ts` lists at most five marked winners per buyer and nobody else |
| `promotion.ts` | Typed accessor over the ingestion report | |

`src/context/DataContext.tsx` builds the merged graph once — national layer, Atlas,
then the fleets through `mergeFleet.ts` — and memoises it.

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
| `tenders/*` | The national section of `/tenders`: quality table first, single-bidder rates by portal and year with Wilson ribbons, decision-window histogram, concentration by buyer (HHI on value and on count), red-flag indicators as rates over their declared family, the live-verification sample, gaps and provenance footer. Read `src/data/cppp.ts`. Every graphic is `role="img"` with an n in its name and a table twin below |

## 5. Pages — `src/pages/` (33 routes)

Routes are declared in `src/App.tsx` and lazily loaded, except the dashboard. The nav
is in `src/components/Layout.tsx`.

**Markets** — `Dashboard` `/` · `MapExplorer` `/map` · `GeoGraph` `/geograph` ·
`IndustryView` `/industries` · `Conglomerates` `/conglomerates` · `GroupDeepDive`
`/conglomerates/:id` · `Interlocks` `/interlocks` · `StateProfile` `/states/:code` ·
`CompanyProfile` `/company/:id`

**Registers** — `Tenders` `/tenders` · `Resources` `/resources` · `PmCares` `/pmcares`
· **`Energy` `/energy`** · **`Welfare` `/welfare`** · **`Finance` `/finance`** · `MediaView` `/media` ·
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
denominator, and the 40-page live verification whose every page was gone.

`AdaniDeepDive.tsx` and `RelianceDeepDive.tsx` are not routed; `GroupDeepDive`
replaced them.

## 6. Scripts — `scripts/`

| File | Command | Fails when |
|---|---|---|
| `promote.mjs` | `npm run promote` | A record would produce an edge with no source and a tier that is not `alleged`/`analytic`; or a merge would fuse the two Reliance groups |
| `assemble-fleet.mjs` | `npm run generate` | A fleet's assembled claims break an invariant after reconciliation and audit. Writes the five generated modules (`energy`, `finance`, `ngo`, `capital` under `src/graph/`, `welfare` under `src/data/`) from the `FLEETS` table in `lib/vocab.mjs`; each fleet writes independently, and a failing fleet leaves its module untouched and exits 1. Derives loan facts from the World Bank census, FCRA state rows and holdings when a fleet declares them. Output is a function of the input bytes only |
| `lib/vocab.mjs` | — | The closed vocabularies (predicates incl. `loan`/`grant`, `MONEY_PREDS`, tiers, node types, families, `ISO_DATE`, `TERMS_KEYS`) and the `FLEETS` table (directory, output module, id prefixes, per-fleet derivations) shared by the assembler and the validator. One copy, so the two gates cannot drift |
| `lib/fleet-refs.mjs` | — | Resolves a fleet-prefixed id (`fin:`, `ngo:`, `cap:`, `energy:`, `wel:`, `scheme:`) to the fleet that must define it. §4 rejects a claim whose endpoint is a prefixed id that no file in that fleet defines |
| `validate.mjs` | `npm run validate` | Any of the four invariants is violated; geometry is missing or malformed; a motif census has no denominator. **§4** gates `research/raw/{energy,welfare,finance,ngo,capital}/*.json` at the quarantine boundary (provenance, contra for every allegation, innocent reading, amounts, `holding.pct` in 0–100, FCRA state rows summing to their national figure, prefixed ids defined in their fleet; warns when a court ruling modelled as `enforce` does not begin `Judicial ruling on <claim id>:`) and checks `indices.json` against the company dataset. **§5** checks each generated module against a fresh in-memory assembly and re-derives every ₹ figure from its US$ and the stated rate, so a stale or hand-edited module fails |
| `assemble-fleet.test.mjs`, `merge-fleet.test.mjs` | `npm run test:assemble` | The assembler's rules or the graph merge regress, on a synthetic fixture. Research-independent: a red here is a code fault |
| `finance/fetch-worldbank.mjs`, `finance/fetch-worldbank.test.mjs`, `finance/mark-loans.mjs` | offline | Fetches the World Bank Projects API for India (1,117 projects) and writes `research/raw/finance/worldbank-projects.json`: one entity per borrower and implementing agency, one `loan` claim per IBRD/IDA commitment (849), each with a `projectId`, `countable`/`countedAs`/`notCountableReason`, and the placement rule's branch; hand resolutions live in its tables so a re-fetch reproduces the file. 25 tests on fixtures. `mark-loans.mjs` marks which hand-researched loans are already in the census so nothing is counted twice |
| `cppp/build.py`, `cppp/verify_sample.py`, `cppp/test_build.py`, `cppp/test_verify.py`, `cppp/README.md` | offline, Python 3.11 + duckdb + pyarrow, **not in CI** | The CPPP award pipeline over the 4.92 M-row Hugging Face scrape (two Arrow IPC stream files, 3.45 GB, digests recorded): quality first, then rates, timing, concentration, red flags, and a seeded 40-row live verification. Writes the six JSON files in `research/raw/cppp/`, each with the exact SQL of every table in its `provenance`. `SET threads TO 1` and paise rounding make a rebuild byte-identical; 21 + 28 tests on a synthetic fixture where every name is invented |
| `smoke.mjs` | `npm run smoke` | Any route renders blank or throws; the map draws fewer than 36 state paths; the map is not keyboard-focusable. Serves `dist` itself; visits all 33 routes, 49 URLs in all, several with URL parameters |
| `graph-viewport.mjs` | `npm run viewport` | The graph camera letterboxes, a drag does not move the graph by the drag, auto-fit clips, maximise does not take the window, or selecting and path-finding move the camera. Since the canvas renderer: canvas backing store ≠ frame × DPR, no ink under the largest node, pin ring absent (with a before-pin control), any in-fill point of any glyph class fails to hover its glyph, stale hit-testing after a focus change, a same-pair denial hiding its claim, keyboard cursor not announced |
| `pages/energy.test.mjs`, `pages/welfare.test.mjs` | `npm run test:pages` | A `/energy` or `/welfare` acceptance criterion fails (67 and 85 criteria; headless Playwright against `dist`; the energy suite builds its scaffold `dist-empty` itself, the welfare suite takes `WELFARE_DIST` and skips its 9 scaffold criteria on a FULL build). Last in `check` and CI. The script names its files explicitly because Node 20's `--test` does not expand a glob |
| `pages/finance.test.mjs`, `pages/tenders.test.mjs` | `FINANCE_DIST=… node --test scripts/pages/finance.test.mjs`, `TENDERS_DIST=… node --test scripts/pages/tenders.test.mjs` | A `/finance` (110 criteria) or `/tenders` national-section (86 criteria) acceptance criterion fails. Written blind to the implementation. Not yet in `test:pages`: they join the gate once green on three consecutive runs |
| `build-procurement.mjs`, `prospect-procurement.mjs`, `verify-sample.mjs` | — | Offline: the bid-count dataset from the OCDS files, the procurement pattern search, and the Stage 0 verification sampler |

`npm run check` runs `promote → generate → test:assemble → validate → build → smoke →
viewport → test:pages`, in that order. CI (`.github/workflows/ci.yml`) runs the same steps.

## 7. Agents and skills — `.claude/`

Fourteen agents, each with an explicit refusal surface: `graph-cartographer`,
`evidence-auditor`, `base-rate-statistician`, `market-cartographer`, `polity-analyst`,
`viz-engineer`, `interface-designer`, `frontend-developer`, `pattern-prospector`,
`investigative-desk`, **`cross-examiner`** (one claim, one lens, default refuted),
**`energy-analyst`** (the sector domain map and the questions in order), and, new with
Phase G, **`finance-analyst`** (foreign loans and their conditions, FCRA, foreign holders,
mandates and rules — refuses a family or ethnicity as an edge, a holder alone, a ₹ total
over loans) and **`procurement-analyst`** (owns `scripts/cppp/` and the six JSON files —
refuses an unmarked name, a rate without its family, a rebuild that is not byte-identical).

Fifteen skills: `evidence-tiering`, `pattern-discipline`, `india-map`, `graph-schema`,
`source-retrieval`, `investigative-desk`, `pattern-prospecting`, `interface-design`,
`frontend-implementation`, and, new with the fleets:

| Skill | What it is |
|---|---|
| `cui-bono` | "Who benefits" as a ledger row — who, how, amount, rivals, counterfactual, boring explanation, falsifier — with the cross-examination pass that runs before a tier is set |
| `energy-money-trail` | What the energy fleet established, as rules for the next pass: canonical ids, base rates with denominators, the symmetry results, the voids and where each record would live, the retrieval routes that worked, a failure-mode checklist tied to real claim ids |
| `foreign-money-trail` | What the finance, ngo and capital fleets established: canonical ids for lenders, donors and holders; the controls that must be shown beside any named institution; the denominators; the retrieval routes that worked when the IMF, FCRA and BSE portals did not; `references/ledger.md` (every who-benefits row) and `references/narratives.md` (the ladder for BlackRock, Rothschild, Soros, IMF/World Bank, FCRA and "China money" claims, each with its strongest counter) |
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
| `raw/cppp/*.json` | 6 aggregate files written by `scripts/cppp/build.py`: quality, rates, timing, concentration, redflags, sample-verification (+ provenance). Aggregates only; no award row and no unmarked name is committed | Compiled in by `src/data/cppp.ts`; rebuilt offline, checked byte-for-byte by `test_build.py` |
| `raw/*/RECONCILIATION.json` | By-products, not research. Id mappings, refused merges with reasons, consolidations, predicate fixes. Energy: 29 mappings, 22 refused merges, 43 records consolidated. Welfare: 18 mappings, 23 refused merges, 5 predicate fixes. Finance: 13 mappings, 36 refused merges, 15 loans marked as already in the census, 6 not countable. NGO: 4 mappings, 23 refused merges, 10 predicate fixes, 2 contras added. Capital: 7 mappings, 25 refused merges, 96 holder records consolidated, 11 killed | Read by `generate`; not validated as research |
| `raw/*/AUDIT.json` | By-products. Cross-examiner verdicts per claim, one lens each. Energy: 60 (22 refuted). Welfare: 35 (15 refuted). Finance: 84 (40 refuted, 7 kill). NGO: 142 (63 refuted, 14 kill). Capital: 61 (19 refuted, 4 kill). The Phase G audits predate their reconciliations, so a verdict's claim id may have moved; the assembler applies the mapping first | Read by `generate`: kill on a kill verdict or two refuting lenses; move a tier only downward; add a denial only when found and sourced |
| other `raw/*.json`, `raw/*.md` | Tenders, resources, procurement, PM CARES, media, the group deep dives, the literature reviews | `promote` |
| `promotion-report.json` | Generated. Merges, collision candidates, rejections, run id | — |

## 9. Documents — `docs/`

| Path | What it is |
|---|---|
| `design/ENERGY_PAGE.md`, `design/WELFARE_PAGE.md`, `design/FINANCE_PAGE.md`, `design/TENDERS_NATIONAL.md` | The judged, synthesised page specs. `[UX review]` amendments applied in place; deferred ones listed at the end (energy D1–D47, welfare D1–D35). `FINANCE_PAGE.md` carries 47 decisions and its §3.3 generator prerequisites G1–G4; `FINANCE_JUDGEMENT.md` and the two `FINANCE_PAGE.candidate-*.md` are the duel it was judged from |
| `design/drafts/*` | The competing designs each spec was judged from: graphic-first, question-first, and a solo draft, per page |
| `design/*_UX_REVIEW.md` | Five synthetic persona seats per spec. Labelled SYNTHETIC: hypotheses, not user research |
| `design/*_ACCEPTANCE.md` | What "done" means, one criterion per test in `scripts/pages/` (energy 67, welfare 85, finance 110, tenders national 86) |
| `design/*_A11Y.md` | WCAG 2.1 AA audits. Energy: 0 critical, 5 serious (fixed), 7 moderate, 9 minor. Welfare: 0 critical, 3 serious (fixed), 7 moderate (M1–M4 fixed), 11 minor. Tenders national: 0 critical, 0 serious, 8 moderate, 13 minor |
| `research/FLEET_CONTRACT.md` | The output contract every fleet agent writes to |
| `research/GRAPH_UI_SOTA.md` | Graph-UI state of the art. Keep the model; replace only the renderer (Canvas 2D, d3-force in a worker, an accessibility overlay, zero new runtime dependencies). §5 is the migration plan |
| `research/DATA_SOURCES.md` | Reachability, licence and fields of the open datasets the graph can be built from: the energy sweep of 2026-09-25 and the Phase G sweep of 2026-09-26 (World Bank API, ADB, AIIB, JICA, AidData, the IMF and FCRA portals that were unreachable, the CPPP scrape) |
| `research/ENERGY_LITERATURE.md`, `research/WELFARE_LITERATURE.md`, `research/FINANCE_LITERATURE.md`, `research/NGO_LITERATURE.md`, `research/CAPITAL_LITERATURE.md` | Readable twins of the fleets' literature files |
| `superpowers/plans/2026-09-25-*.md` | The implementation plans the two page builds ran from |
| `superpowers/specs/2026-09-26-foreign-money-ngos-tenders-design.md`, `superpowers/plans/2026-09-26-*.md` | Phase G: the design (reconnaissance, stance, architecture, risks, decisions), its ten-task plan, and the `/finance` page plan |
| `PLUGINS.md` | Plugins and skills in use, and the build-fleet shape |
| `BUNDLE.md` | The hand-off snapshot: layout, how to run `dist/`, the gate table at the moment it was cut |
| `PLATFORM_PLAN.md`, `RESEARCH_PLAN.md`, `TASK_INDEX.md`, `MASTER_PLAN.md`, `RECONCILIATION.md` | Earlier plans, trackers and the `main`→`master` reconciliation record |
| `legacy/` | Superseded, retained so nothing is lost: the original ICIP master plan, the two pre-`.claude` skill notes, and the original type model |

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
