# ICIP Task Index

The single authoritative tracker. `docs/CUSTOM_PLAN.md` holds the *why*; this holds
the *what next*.

**Legend**

| Mark | Meaning |
|---|---|
| `[ ]` | Not started |
| `[~]` | In progress |
| `[x]` | Complete |
| `[b]` | Blocked |
| `[-]` | **Superseded or deliberately not done** — with the reason. Not a failure; a decision. |

**Priority:** P0 critical · P1 high · P2 medium · P3 low

*Statuses were re-audited against the codebase on 2026-08-11, after the `main`→`master`
reconciliation. Several tasks previously marked complete were built on the parallel line
and did not survive it — see `docs/RECONCILIATION.md` for the reasoning on each.*

---

## Section A: Infrastructure & Setup

| ID | Task | Pri | Status | Notes |
|----|------|-----|--------|-------|
| A001 | Create `icip-data-pipeline` repository | P0 | [x] | |
| A002 | Create `icip-network-engine` repository | P0 | [x] | |
| A003 | Create `icip-docs` repository | P1 | [x] | |
| A004 | Set up main repo CI/CD for auto-deploy | P1 | [x] | `.github/workflows/deploy.yml` — gates then publishes to `gh-pages` |
| A005 | Configure repo branch protection rules | P2 | [ ] | Require the `check` job before merge to `master` |
| A006 | Set up issue templates | P2 | [ ] | |
| A007 | Create shared npm package for types | P1 | [-] | Not while there is one app. `src/graph/schema.ts` is the contract; extract only when a second consumer exists |
| A008 | Monorepo tooling / workspace links | P2 | [ ] | Blocked on A007 being justified |

## Section B: Data Architecture

| ID | Task | Pri | Status | Notes |
|----|------|-----|--------|-------|
| B001 | Master schema (companies, persons, edges) | P0 | [x] | `src/graph/schema.ts` — nodes, edges, tiers, the provenance invariant |
| B002 | PostgreSQL migrations | P0 | [-] | No backend. The app compiles its data in and has no runtime dependencies; revisit only if a server appears |
| B003 | DuckDB for embedded analytics | P1 | [ ] | Worth it past ~5k companies; unnecessary at 259 |
| B004 | Parquet structure for time-series | P1 | [ ] | Blocked on there being any time series (see K001) |
| B005 | Data validation pipeline | P0 | [x] | `scripts/validate.mjs` + `scripts/promote.mjs`, both gating CI |
| B006 | Data versioning (DVC / git-lfs) | P2 | [ ] | |
| B007 | Sample datasets for development | P0 | [-] | Superseded — the app runs on the real datasets, not samples |
| B008 | API contract (REST + GraphQL) | P1 | [ ] | Blocked on B002 |

## Section C: Frontend — Core

| ID | Task | Pri | Status | Notes |
|----|------|-----|--------|-------|
| C001 | React 18 + TS + Vite scaffold | P0 | [x] | |
| C002 | Dark theme design system | P0 | [x] | Tokens in `src/index.css` |
| C003 | Layout with navigation | P0 | [x] | Grouped sidebar, mobile menu |
| C004 | Dashboard | P0 | [x] | Real aggregates + evidence census |
| C005 | Company profile | P0 | [x] | Peers as reference class, graph neighbourhood, sources |
| C006 | Map explorer | P0 | [x] | 36 real states, quantile choropleth, exchange/sector filters |
| C007 | Network graph | P0 | [x] | Force layout, tier-encoded edges, filter rail |
| C008 | Industry clustering | P0 | [x] | HHI, per-sector map |
| C009 | Political connections | P0 | [x] | Flow diagram + base rates + the documented void |
| C010 | Media ownership | P0 | [~] | Page exists and states its own coverage gap. Needs H001-H003 |
| C011 | Search | P0 | [x] | Literal substring, grouped by kind — never fuzzy |
| C012 | Watchlist | P0 | [x] | Open questions + local tracking |
| C013 | Mobile responsive | P1 | [x] | Verified 0px horizontal overflow at 390×844 |
| C014 | Deploy to GitHub Pages | P0 | [x] | Automated in A004 |
| C015 | HashRouter for static hosting | P0 | [x] | |
| C016 | PWA manifest + service worker | P2 | [ ] | |
| C017 | Offline data caching | P2 | [-] | Already offline — all data is compiled in, no runtime fetches |
| C018 | Skeleton loading states | P2 | [-] | Nothing loads asynchronously; there is no state to skeleton |
| C019 | Error boundaries | P2 | [ ] | Worth adding — a thrown render currently blanks the route |
| C020 | Keyboard shortcuts | P3 | [ ] | Map already has arrow/Enter/Escape |
| C021 | NIFTY 50 index page | P1 | [-] | Reverted — depended on unsourced `exchangeData.ts`. Rebuild on the sourced dataset |
| C022 | NIFTY 50 cards with sparklines | P1 | [-] | Reverted — series was `Math.random()` |
| C023 | Sector allocation pie chart | P2 | [-] | Reverted — 20 sectors is past the ~6 a part-to-whole circle can carry; already a sorted bar list |
| C024 | Reliance deep-dive | P1 | [~] | Rebuilding data-driven over all 10 groups rather than hardcoded |
| C025 | Adani deep-dive | P1 | [~] | As C024 |
| C026 | Sparkline component | P1 | [-] | Reverted — no real time series exists to draw. Recover from git when one does |
| C027 | Per-group deep-dive route | P1 | [~] | `/conglomerates/:id`, replaces C024+C025 |

## Section D: Frontend — Advanced Maps

| ID | Task | Pri | Status | Notes |
|----|------|-----|--------|-------|
| D001 | Integrate Mapbox GL JS | P1 | [-] | Not doing. Hand-written SVG gives full control, no token, no runtime dependency, and works offline |
| D002 | India GeoJSON state boundaries | P1 | [x] | 36 states/UTs, real paths, 171 sub-polygons |
| D003 | Choropleth for company density | P1 | [x] | Quantile-binned; no-data hatch distinct from zero |
| D004 | City-level clustering | P1 | [ ] | Needs F005 geocoding. Marks are currently state-anchored, and say so |
| D005 | Industry heatmap overlay | P2 | [x] | Sector filter on `/map`, per-sector map on `/industries` |
| D006 | Resource maps (mines, ports, SEZs) | P2 | [~] | Ports/mines arriving via `global-footprint.json` |
| D007 | Drill-down State → City → Company | P1 | [~] | State → company works; city tier needs F005 |
| D008 | FDI flow visualisation | P2 | [~] | World map rebuilt; FDI series not yet sourced |
| D009 | Port connection lines | P2 | [~] | Ownership links only — trade routes were unsourced and were dropped |
| D010 | Trade route visualisation | P3 | [b] | **Blocked on evidence.** Needs a real shipping/trade dataset; will not be asserted |
| D011 | Dedicated NSE map page | P1 | [-] | Superseded by D013 |
| D012 | Dedicated BSE map page | P1 | [-] | Superseded by D013 |
| D013 | Exchange filter on map explorer | P2 | [x] | NSE / BSE / both |
| D014 | RealisticIndiaMap | P1 | [-] | Reverted — its "accurate boundaries" were bounding boxes. D002 is the real thing |
| D015 | WorldMap with connection lines | P1 | [~] | Rebuilt declaratively; the original drove `document.createElementNS` from inside React |
| D016 | Geographic network (map × graph) | P1 | [x] | `/geograph` — entities in place, arcs between, state-flow aggregation |

## Section E: Frontend — Network & Graph

| ID | Task | Pri | Status | Notes |
|----|------|-----|--------|-------|
| E001 | D3 force simulation | P0 | [x] | |
| E002 | Node clustering by sector | P1 | [~] | Family-band positioning; true sector clustering pending |
| E003 | Relationship type filters | P1 | [x] | Plus tier, family, amount, time-range — all URL-shareable |
| E004 | Path finding | P2 | [x] | Reports hop count **against the graph median**, never alone |
| E005 | Community detection | P2 | [ ] | Needs J002 |
| E006 | Time-slider for temporal network | P2 | [x] | Undated edges are never hidden by it |
| E007 | Mobile touch gestures | P1 | [ ] | |
| E008 | Zoom and pan | P1 | [ ] | |
| E009 | Node size by market cap | P1 | [x] | |
| E010 | Mini-map overview | P3 | [ ] | |

## Section F: Data Collection — Companies

| ID | Task | Pri | Status | Notes |
|----|------|-----|--------|-------|
| F001 | NSE listed companies | P0 | [~] | 259 sourced; ~1,700 to go |
| F002 | BSE listed companies | P0 | [~] | As F001 |
| F003 | Cross-reference for duplicates | P0 | [x] | `promote.mjs` — strong keys only, 218 collisions refused |
| F004 | Company basic info (CIN, ISIN, sector) | P0 | [~] | ISIN/ticker present; CIN largely missing |
| F005 | Geocode company addresses | P1 | [ ] | **Unblocks D004, D007.** Marks are state-anchored until then |
| F006 | Shareholding patterns | P1 | [~] | Promoter % for group entities, stamped by quarter |
| F007 | Director information | P1 | [b] | **Blocked on DIN.** Name-matched directorships are a defamation generator — see `/interlocks` |
| F008 | Subsidiary information | P1 | [~] | Group entities mapped; full subsidiary trees not |
| F009 | Financial data | P1 | [~] | Market cap only. No revenue/profit series |
| F010 | Annual reports (top 500 × 5y) | P1 | [ ] | |
| F011 | Expand company dataset to ~600 | P1 | [ ] | Nine large recent listings were omitted rather than risk a fabricated ticker |

## Section G: Data Collection — Political

| ID | Task | Pri | Status | Notes |
|----|------|-----|--------|-------|
| G001 | Electoral bonds data (ECI) | P0 | [ ] | **Highest-value open item.** Public and unprocessed |
| G002 | Bond purchaser → company mapping | P0 | [ ] | The alphanumeric file match nobody has published |
| G003 | MP/MLA asset declarations | P1 | [ ] | Must ship with a peer baseline or not at all |
| G004 | Business interests from affidavits | P1 | [ ] | |
| G005 | Company → party donation flow | P1 | [~] | Case-study subgraph only, not national |
| G006 | Policy change ↔ donation correlation | P2 | [b] | **Blocked on G001+G002 and a shuffled control.** Unproven in both directions until then |
| G007 | Lobbying disclosures | P3 | [ ] | |
| G008 | Full award population, 2019–24 | P0 | [ ] | **Unblocks the motif engine** — see O005 |
| G009 | Coal India / mining-PSU CSR destinations | P1 | [ ] | Public reports; the most answerable open question in the file |

## Section H: Data Collection — Media

| ID | Task | Pri | Status | Notes |
|----|------|-----|--------|-------|
| H001 | Media house ownership database | P1 | [ ] | `/media` states this gap explicitly |
| H002 | RNI + MIB registration data | P1 | [ ] | |
| H003 | Cross-media holdings | P1 | [ ] | The concentration question that actually matters |
| H004 | Owner political affiliations | P2 | [ ] | |
| H005 | Ad spend data | P2 | [b] | Not public. Likely a permanent gap — better said than filled with inference |
| H006 | Ad spend ↔ coverage sentiment | P3 | [b] | Blocked on H005 **and** a control group of non-owned outlets |
| H007 | Establish whether citable lean ratings exist for Indian outlets | P0 | [~] | **Gates the whole coverage-distribution UI.** "None exists" is an acceptable answer — see PLATFORM_PLAN §8b |
| H008 | Per-company citation and article index | P1 | [ ] | Extends the existing `srcs` into a deduplicated per-company index |
| H009 | Wire-copy and syndication deduplication | P0 | [ ] | **Prerequisite, not a refinement.** PTI/ANI copy under 15 mastheads is not 15 articles |
| H010 | Coverage-tone double-difference measure | P1 | [ ] | Outlet house style AND company newsworthiness both controlled — PLATFORM_PLAN §8b.1 |
| H011 | Sentiment classifier validated on Indian financial news | P1 | [ ] | A model validated on product reviews is not validated here |
| H012 | Byline concentration per company, desk-level | P2 | [ ] | Aggregate only. Named-journalist tone is not rendered per person absent a documented conflict |
| H013 | Coverage distribution UI (Ground News-style bar) | P1 | [b] | Blocked on H007. Falls back to **ownership** distribution, which may be the better metric |

## Section I: Document Analysis

| ID | Task | Pri | Status | Notes |
|----|------|-----|--------|-------|
| I001 | LLM pipeline | P1 | [ ] | |
| I002 | Annual report text extraction | P1 | [ ] | Blocked on F010 |
| I003–I010 | Summarisers, RPT extraction, liabilities, peer compare | P2–P3 | [ ] | All blocked on I002 |

## Section J: Network Analytics

| ID | Task | Pri | Status | Notes |
|----|------|-----|--------|-------|
| J001 | Centrality metrics | P1 | [~] | Degree only, and reported as a *size* measure, not influence |
| J002 | Community detection | P1 | [ ] | |
| J003 | Network density by sector | P2 | [ ] | |
| J004 | Identify key nodes | P2 | [-] | Reframed. "Key" implies influence; the platform reports degree with its null-model expectation instead |
| J005 | Anomaly detection | P2 | [ ] | Needs a time series |
| J006 | Predict mergers | P3 | [-] | Out of scope. The platform reports records, not forecasts |
| J007 | Political influence scores | P2 | [-] | **Will not build.** A composite "influence score" is an unfalsifiable number with a decimal point |
| J008 | Narrative graph | P3 | [b] | Blocked on H006 |

## Section K: Timeline & Alerts

| ID | Task | Pri | Status | Notes |
|----|------|-----|--------|-------|
| K001 | Event schema | P1 | [~] | Edges carry `from`/`to`; no first-class event entity yet |
| K002 | Company event tracker | P1 | [ ] | |
| K003 | Director appointments/removals | P1 | [b] | Blocked on F007 |
| K004 | Shareholding changes | P1 | [ ] | Needs repeated F006 snapshots |
| K005 | Credit rating changes | P2 | [ ] | |
| K006–K008 | Alerts, preferences, webhooks | P1–P3 | [ ] | Needs a backend |

## Section L: Skills & Agents

| ID | Task | Pri | Status | Notes |
|----|------|-----|--------|-------|
| L001 | `data-scout` → `market-cartographer` | P1 | [x] | `.claude/agents/` |
| L002 | `doc-analyzer` | P1 | [ ] | Blocked on I001 |
| L003 | `network-mapper` → `graph-cartographer` | P1 | [x] | |
| L004 | `political-analyst` → `polity-analyst` | P1 | [x] | |
| L005 | `media-tracker` | P1 | [ ] | |
| L006 | `frontend-dev` → `viz-engineer` | P1 | [x] | |
| L007 | `backend-dev` | P1 | [-] | No backend |
| L008 | Skill documentation | P2 | [x] | 4 skills in `.claude/skills/` |
| L009 | Agent coordination protocol | P2 | [x] | Quarantine → promote → validate; documented in `INGESTION.md` |
| L010 | Agent task queue | P2 | [ ] | |
| L011 | `evidence-auditor` | P0 | [x] | |
| L012 | `base-rate-statistician` | P0 | [x] | |

## Section M: Testing & QA

| ID | Task | Pri | Status | Notes |
|----|------|-----|--------|-------|
| M001 | Unit testing (Vitest) | P2 | [ ] | Highest-value targets: `motifEngine`, `nullModel`, `promote` resolution |
| M002 | Component tests | P2 | [ ] | |
| M003 | E2E tests (Playwright) | P2 | [x] | `scripts/smoke.mjs` — 22 routes, geometry + keyboard assertions, self-hosting |
| M004 | Data accuracy validation | P1 | [x] | `validate.mjs` |
| M005 | Cross-reference validation | P1 | [~] | Strong-key resolution in `promote.mjs`; no MCA cross-check yet |
| M006 | Performance (Lighthouse 90+) | P2 | [ ] | Bundle is ~1.2 MB; code-splitting not yet done |
| M007 | Mobile device testing | P2 | [~] | Verified headless at 390×844; no real-device pass |
| M008 | Accessibility audit (WCAG 2.1) | P2 | [~] | Table twins, keyboard nav, reduced-motion in place; no formal audit |

## Section N: Documentation & Research

| ID | Task | Pri | Status | Notes |
|----|------|-----|--------|-------|
| N001 | API documentation | P2 | [b] | Blocked on B008 |
| N002 | Data source documentation | P2 | [x] | Sources carried per record; gaps published |
| N003 | User guide | P3 | [ ] | |
| N004 | Legal compliance | P2 | [~] | Standing notes on every allegation-bearing page; no formal review |
| N005 | Methodology papers | P3 | [x] | `/patterns` + `research/raw/pattern-matching-epistemics.md` |
| N006 | Focus group transcripts | P2 | [ ] | |
| N007 | Research ethics guidelines | P2 | [x] | The six refusals in `HANDOFF.md` and `/method` |
| N008 | Deployment procedures | P2 | [x] | `docs/BUNDLE.md` + `deploy.yml` |
| N009 | Comprehensive README | P1 | [x] | |
| N010 | Repository index | P1 | [x] | `docs/INDEX.md` |
| N011 | Hand-off prompt | P1 | [x] | `HANDOFF.md` |
| N012 | Reconciliation record | P1 | [x] | `docs/RECONCILIATION.md` |

## Section O: Evidence & Provenance *(new — the discipline layer)*

| ID | Task | Pri | Status | Notes |
|----|------|-----|--------|-------|
| O001 | Provenance invariant enforced in CI | P0 | [x] | Every edge sourced, or tier `alleged`/`analytic` |
| O002 | Four evidence tiers, semantic in the UI | P0 | [x] | Line style carries the tier everywhere |
| O003 | Base-rate engine with published denominators | P0 | [x] | Six rates; not yet computed for every edge type |
| O004 | Degree-preserving null model | P0 | [x] | Predicate-preserving Maslov–Sneppen |
| O005 | Computed motif engine | P0 | [x] | **4 of 5 templates report `degenerate-null`** — the subgraph is star-shaped. Needs G008, not a better algorithm |
| O006 | Ingestion: extract → resolve → ground → assemble | P0 | [x] | Reproducible run id; 218 collisions refused |
| O007 | Promotion *generates* `src/data/*.ts` | P1 | [ ] | Today it audits; the codegen is the gap |
| O008 | Base rates computed for every edge type | P1 | [ ] | |
| O009 | Supersession rendered as a visible changelog | P2 | [ ] | Data model supports it; no UI |
| O010 | Entity resolution keyed on DIN/CIN | P1 | [ ] | **Unblocks F007, K003** |

---

## What to do next — in order

The ordering is by *what unblocks the most*, not by ease.

1. **G008 — the full award population, 2019–24.** One dataset. It unblocks the motif
   engine (O005), settles G006 in both directions, and is computable from public data
   today. Nothing else on this list moves as much.
2. **G001 + G002 — the ECI bond file, purchaser to party.** Public, unprocessed, and
   the precondition for any national donation claim.
3. **G009 — Coal India and mining-PSU CSR destinations.** The direct analogue of the
   published ONGC finding, inside the ministry that matters. Public reports.
4. **O010 → F007 — DIN-keyed resolution.** Until every person carries a DIN, the
   interlock page stays a caveat with a table attached.
5. **F005 — geocoding.** Unblocks city-level drill-down (D004, D007) and removes the
   "positioned within state, not geocoded" caveat from every map.
6. **O007 — promotion codegen.** Closes the last manual step in the ingestion chain.
7. **F011 — companies to ~600.** Widens the reference class, which sharpens every base rate.
8. **M001 — unit tests** on `motifEngine`, `nullModel` and `promote` resolution. These
   three carry the platform's guarantees and are currently covered only end-to-end.

## Standing rules for anything added here

- A task that would require inventing a figure is `[b]`, not `[~]`.
- A task dropped on principle is `[-]` with the reason, never deleted.
- Do not mark `[x]` on the strength of a component existing. It ships when it is
  wired to real data and passes the gates.

---

*Last audited: 2026-08-11 against `master` @ post-reconciliation*
