# Index

Every file in this repository, what it is, and what depends on it. Read this before
changing anything — several files are load-bearing for the project's editorial
guarantees, not just for its build.

*Updated 2026-09-26, after the energy and welfare fleets landed. Counts below are read
from the files named beside them; where a file and this index disagree, the file is
right and this index is stale.*

---

## 1. Read-me-first, in order

| # | File | Why |
|---|---|---|
| 1 | [`README.md`](../README.md) | What the project is, the four invariants, the stack |
| 2 | [`docs/CUSTOM_PLAN.md`](CUSTOM_PLAN.md) | Why the two source projects merged, the phased plan, what shipped (Phases A–F) |
| 3 | [`.claude/skills/pattern-discipline/SKILL.md`](../.claude/skills/pattern-discipline/SKILL.md) | The anti-apophenia checklist the whole platform exists to enforce |
| 4 | [`.claude/skills/graph-schema/SKILL.md`](../.claude/skills/graph-schema/SKILL.md) | The data model |
| 5 | [`.claude/skills/evidence-tiering/SKILL.md`](../.claude/skills/evidence-tiering/SKILL.md) | How a claim gets a tier |
| 6 | [`docs/INGESTION.md`](INGESTION.md) | How the original raw research becomes graph data (`promote`) |
| 7 | [`docs/research/FLEET_CONTRACT.md`](research/FLEET_CONTRACT.md) | What a research-fleet agent may write, and the gate that rejects it otherwise |
| 8 | [`HANDOFF.md`](../HANDOFF.md) | Pick-up-cold prompt for the next session |
| 9 | [`docs/PLUGINS.md`](PLUGINS.md) | Which plugins and skills the build uses, and how a build fleet is composed |

---

## 2. The graph engine — `src/graph/`

| File | Role | Load-bearing because |
|---|---|---|
| `schema.ts` | Node / edge / motif types, the four tiers, `hasProvenance()`, `validateGraph()` | **The provenance invariant lives here.** Every other module's guarantees reduce to this file |
| `data.ts` | The Money-Trail Atlas subgraph: 59 nodes, 111 edges, 11 motifs | Generated from the reviewed artefact, then extended by hand. Five dated edges were appended on 2026-09-26 for the DOJ, SEC and SEBI outcomes; four older edges carry `supersededBy` and stay addressable. Do not hand-edit census figures |
| `build.ts` | Derives the national graph from the factual datasets | **Never** creates an edge between a person and a company on shared state or shared sector |
| `baseRates.ts` | Published denominators with sources; `computeRate()`; Benjamini–Hochberg FDR | The numbers that kill most proposed edges |
| `nullModel.ts` | Maslov–Sneppen degree-preserving rewiring, motif z-scores, path-length profile, `shortestPath` | Predicate-preserving: a donation edge can never rewire into a family edge. The path finder's median separation is printed beside every path |
| `motifEngine.ts` | Declarative motif templates — chained steps, star steps, negation | Computed, so a motif is allowed to come out empty. Reports `degenerate-null` when the topology makes the test impossible |
| `prospector.ts` | Exhaustive candidate generation; output is ranked questions, not findings | Feeds `/prospector` and the investigative desk |
| `fleet.ts` | Hand-written types for the generated fleet modules (`FleetMeta`, `BenefitRow`, `Void`, `Narrative`, `BaseRateRow`, `EntityIdentity`) | The generator emits data, never types. A shape change is a reviewed edit here that every generated literal must then satisfy under `tsc --strict` |
| `mergeFleet.ts` | Pure function that merges the fleet graphs into the national graph | Composed by `DataContext`; tested by `scripts/merge-fleet.test.mjs`. Every consumer merges the same way |
| `energy.generated.ts` | **Generated, never hand-edit.** The energy fleet: 404 nodes, 711 edges (310 documented, 304 reported, 42 alleged, 55 analytic), 188 benefit rows, 78 voids, 65 narratives, 73 base rates. Run `run-4a86ff2b4fe6`, generator 1.2.0 | Written by `npm run generate`. `npm run validate` §5 fails when it no longer matches a fresh assembly of its inputs, so a hand edit cannot ship. Read by `src/data/energy.ts` and `DataContext` |

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
| `welfare.generated.ts` | **Generated, never hand-edit.** The welfare fleet: 286 nodes (208 entities, 78 scheme nodes), 335 claims (163 documented, 93 reported, 14 alleged, 65 analytic), 78 schemes, 105 elections, 70 coverage declarations, 39 voids, 45 narratives, 50 base rates. Run `run-33317dc6d234`, generator 1.2.0 | Same rules as `energy.generated.ts`. Read by `welfare.ts` and `DataContext` |
| `welfareView.ts` | Every figure, row and denominator `/welfare` shows | A count on screen is the `.length` of an array built here, and each table twin is the same array its graphic was drawn from |
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
| `viz/ForceGraph.tsx` | Force-directed graph; `FAMILY_COLOR`/`FAMILY_LABEL` live here. Ego focus, path finder, semantic labels, minimap, keyboard traversal |
| `viz/GraphExplorer.tsx` | Filter rail + graph + edge card + table twin, with URL-shareable state. The twin reads exactly what the graph draws |
| `viz/camera.tsx` | The one camera for every graph. Maximised view is a dialog with focus moved in and returned on Escape |
| `viz/FlowSankey.tsx`, `viz/Charts.tsx`, `viz/OwnershipTree.tsx`, `viz/WorldMap.tsx` | Flow diagram (band = ₹ crore, dash = tier); the chart layer; the indented ownership tree; the world footprint |
| `energy/*` (14 files) | `/energy` only: `Stage`, `EnergyGraph`, `EnergyStrip`, `SweepStrip`, `EnergyAside`, `Cards`, `Ledger`, `Calibration`, `Missing`, `StackTable`, `TenureLanes`, `EvidenceSection`, `hooks.ts`, `csv.ts`. Read `src/data/energy.ts`; import nothing from `welfare/` |
| `welfare/*` (8 files) | `/welfare` only: `WelfareMap`, `Control`, `TimeLanes`, `Panels`, `Sections`, `StageTwins`, `NarrativeLadder`, `ui.tsx`. Read `src/data/welfareView.ts`; import nothing from `energy/` |

## 5. Pages — `src/pages/` (32 routes)

Routes are declared in `src/App.tsx` and lazily loaded, except the dashboard. The nav
is in `src/components/Layout.tsx`.

**Markets** — `Dashboard` `/` · `MapExplorer` `/map` · `GeoGraph` `/geograph` ·
`IndustryView` `/industries` · `Conglomerates` `/conglomerates` · `GroupDeepDive`
`/conglomerates/:id` · `Interlocks` `/interlocks` · `StateProfile` `/states/:code` ·
`CompanyProfile` `/company/:id`

**Registers** — `Tenders` `/tenders` · `Resources` `/resources` · `PmCares` `/pmcares`
· **`Energy` `/energy`** · **`Welfare` `/welfare`** · `MediaView` `/media` ·
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

`AdaniDeepDive.tsx` and `RelianceDeepDive.tsx` are not routed; `GroupDeepDive`
replaced them.

## 6. Scripts — `scripts/`

| File | Command | Fails when |
|---|---|---|
| `promote.mjs` | `npm run promote` | A record would produce an edge with no source and a tier that is not `alleged`/`analytic`; or a merge would fuse the two Reliance groups |
| `assemble-fleet.mjs` | `npm run generate` | A fleet's assembled claims break an invariant after reconciliation and audit. Writes `src/graph/energy.generated.ts` and `src/data/welfare.generated.ts`; each fleet writes independently, and a failing fleet leaves its module untouched and exits 1. Output is a function of the input bytes only |
| `lib/vocab.mjs` | — | The closed vocabularies (predicates, tiers, node types, families, `ISO_DATE`) shared by the assembler and the validator. One copy, so the two gates cannot drift |
| `validate.mjs` | `npm run validate` | Any of the four invariants is violated; geometry is missing or malformed; a motif census has no denominator. **§4** gates `research/raw/{energy,welfare}/*.json` at the quarantine boundary and checks `indices.json` against the company dataset. **§5** checks each generated module against a fresh in-memory assembly, so a stale module fails |
| `assemble-fleet.test.mjs`, `merge-fleet.test.mjs` | `npm run test:assemble` | The assembler's rules or the graph merge regress, on a synthetic fixture (27 + 3 tests). Research-independent: a red here is a code fault |
| `smoke.mjs` | `npm run smoke` | Any route renders blank or throws; the map draws fewer than 36 state paths; the map is not keyboard-focusable. Serves `dist` itself; visits all 32 routes, several with URL parameters |
| `graph-viewport.mjs` | `npm run viewport` | The graph camera letterboxes, a drag does not move the graph by the drag, auto-fit clips, maximise does not take the window, or selecting and path-finding move the camera |
| `pages/energy.test.mjs`, `pages/welfare.test.mjs` | `npm run test:pages` | A `/energy` or `/welfare` acceptance criterion fails (67 and 85 criteria; headless Playwright against `dist` and a scaffold `dist-empty` it builds itself). **Not in `check` or CI yet** — see `HANDOFF.md` |
| `build-procurement.mjs`, `prospect-procurement.mjs`, `verify-sample.mjs` | — | Offline: the bid-count dataset from the OCDS files, the procurement pattern search, and the Stage 0 verification sampler |

`npm run check` runs `promote → generate → test:assemble → validate → build → smoke →
viewport`, in that order. CI (`.github/workflows/ci.yml`) runs the same steps.

## 7. Agents and skills — `.claude/`

Twelve agents, each with an explicit refusal surface: `graph-cartographer`,
`evidence-auditor`, `base-rate-statistician`, `market-cartographer`, `polity-analyst`,
`viz-engineer`, `interface-designer`, `frontend-developer`, `pattern-prospector`,
`investigative-desk`, and, new with the fleets, **`cross-examiner`** (one claim, one
lens, default refuted) and **`energy-analyst`** (the sector domain map and the
questions in order).

Fourteen skills: `evidence-tiering`, `pattern-discipline`, `india-map`, `graph-schema`,
`source-retrieval`, `investigative-desk`, `pattern-prospecting`, `interface-design`,
`frontend-implementation`, and, new with the fleets:

| Skill | What it is |
|---|---|
| `cui-bono` | "Who benefits" as a ledger row — who, how, amount, rivals, counterfactual, boring explanation, falsifier — with the cross-examination pass that runs before a tier is set |
| `energy-money-trail` | What the energy fleet established, as rules for the next pass: canonical ids, base rates with denominators, the symmetry results, the voids and where each record would live, the retrieval routes that worked, a failure-mode checklist tied to real claim ids |
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
| `raw/{energy,welfare}/RECONCILIATION.json` | By-products, not research. Id mappings, refused merges with reasons, consolidations, predicate fixes. Energy: 29 mappings, 22 refused merges, 43 records consolidated. Welfare: 18 mappings, 23 refused merges, 5 predicate fixes | Read by `generate`; not validated as research |
| `raw/{energy,welfare}/AUDIT.json` | By-products. Cross-examiner verdicts per claim. Energy: 60 (22 refuted). Welfare: 35 (15 refuted) | Read by `generate`: kill on a kill verdict or two refuting lenses; move a tier only downward; add a denial only when found and sourced |
| other `raw/*.json`, `raw/*.md` | Tenders, resources, procurement, PM CARES, media, the group deep dives, the literature reviews | `promote` |
| `promotion-report.json` | Generated. Merges, collision candidates, rejections, run id | — |

## 9. Documents — `docs/`

| Path | What it is |
|---|---|
| `design/ENERGY_PAGE.md`, `design/WELFARE_PAGE.md` | The judged, synthesised page specs. `[UX review]` amendments applied in place; deferred ones listed at the end (energy D1–D47, welfare D1–D35) |
| `design/drafts/*` | The competing designs each spec was judged from: graphic-first, question-first, and a solo draft, per page |
| `design/*_UX_REVIEW.md` | Five synthetic persona seats per spec. Labelled SYNTHETIC: hypotheses, not user research |
| `design/*_ACCEPTANCE.md` | What "done" means, one criterion per test in `scripts/pages/` |
| `design/*_A11Y.md` | WCAG 2.1 AA audits. Energy: 0 critical, 5 serious (fixed), 7 moderate, 9 minor. Welfare: 0 critical, 3 serious (open), 7 moderate, 11 minor |
| `research/FLEET_CONTRACT.md` | The output contract every fleet agent writes to |
| `research/GRAPH_UI_SOTA.md` | Graph-UI state of the art. Keep the model; replace only the renderer (Canvas 2D, d3-force in a worker, an accessibility overlay, zero new runtime dependencies). §5 is the migration plan |
| `research/DATA_SOURCES.md` | Reachability, licence and fields of the open datasets the energy graph can be built from |
| `research/ENERGY_LITERATURE.md`, `research/WELFARE_LITERATURE.md` | Readable twins of the two `literature.json` files |
| `superpowers/plans/2026-09-25-*.md` | The implementation plans the two page builds ran from |
| `PLUGINS.md` | Plugins and skills in use, and the build-fleet shape |
| `PLATFORM_PLAN.md`, `RESEARCH_PLAN.md`, `TASK_INDEX.md`, `MASTER_PLAN.md`, `RECONCILIATION.md`, `BUNDLE.md` | Earlier plans, trackers and the `main`→`master` reconciliation record |
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
