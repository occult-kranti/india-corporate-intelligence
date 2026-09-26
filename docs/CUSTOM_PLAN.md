# ICIP × Money-Trail Atlas — Integrated Build Plan

*Version 2.0 · 2026-08-11 · supersedes the scope in `MASTER_PLAN.md` (which is retained as the breadth roadmap)*

---

## 1. What happened to the plan

Two projects arrived at the same place from opposite ends.

**ICIP** (this repo) started from **breadth**: map every NSE/BSE company, every
state, every industry, every political and media connection. It has a React shell,
a type system, and sample data. Its weakness is that breadth without an evidence
discipline produces exactly the artefact the Money-Trail Atlas work warns about —
a dense, alarming-looking web whose edges are near-universal and therefore measure
nothing.

**The Money-Trail Atlas** started from **depth**: one minister, ~71 nodes, ~117
edges, every one a sourced claim with an evidence tier, built to Karpathy's graph-
engineering method. Its weakness is that it is a single 300 KB HTML file with data,
geometry and render code fused, invariants held by author care rather than by code,
and no path to scale.

**The integration thesis:** ICIP supplies the scale, the Atlas supplies the
epistemics. The Atlas's four invariants — provenance, entity resolution,
supersession, contradiction-as-first-class — become the *schema* of the ICIP graph,
enforced in CI. ICIP's state/company/industry backbone becomes the population that
gives Atlas claims their denominators.

That last point is the whole design. The Atlas repeatedly hit the same wall: *is
this edge unusual?* It could not answer, because it had no population to compare
against. 82.45% of electoral-trust money went to one party; ~100% of responding
PSUs gave to PM CARES; CSR is compulsory by statute. Every one of those base rates
killed an edge. ICIP's several-hundred-company dataset **is** the reference class.
Built together, the base-rate check stops being a manual footnote and becomes a
query.

---

## 2. Non-negotiable guardrails

Carried verbatim from the Atlas hand-off. These are acceptance criteria, not aspirations.

1. **Alleged ≠ proven.** The platform maps public records and published claims. It
   asserts no guilt. No node adjudicates a quid pro quo. No feature may make this
   distinction less legible than it is today.
2. **Provenance invariant.** Every edge carries `srcs` **or** is tier
   `alleged`/`analytic`. Enforced by `scripts/validate.mjs`; CI fails on violation.
   Never invent a source, figure, date, quote, ticker or CIN.
3. **Correlation ≠ causation.** Every `analytic` edge and every motif ships with an
   `innocentReading` — the boring explanation that also fits the data.
4. **Absence is reported as loudly as presence.** The documented void — a top
   beneficiary with zero traceable donations, a decision with no file noting — is
   the integrity check on the whole exercise.
5. **Entity resolution before edges.** Nothing with `resolved: false` takes an
   edge. Name matching at scale is a defamation generator, not a network graph.
6. **Denials are first-class.** `contra` edges render as prominently as what they
   contradict.

---

## 3. Architecture — invariants true by construction

```
                        ┌─────────────────────────────────┐
   research/raw/*.json  │  EXTRACTION                     │  subagents propose
   (agent output)  ───► │  claims with provenance         │  claims, never facts
                        └──────────────┬──────────────────┘
                                       ▼
                        ┌─────────────────────────────────┐
                        │  RESOLUTION                     │  canonical node +
                        │  alias merge, confidence,       │  rationale; unresolved
                        │  collision-risk flag            │  entities quarantined
                        └──────────────┬──────────────────┘
                                       ▼
                        ┌─────────────────────────────────┐
                        │  GROUNDING (evidence-auditor)   │  date test → identity
                        │  tier assignment, falsifier,    │  test → base rate →
                        │  base rate, denial capture      │  falsifier → tier
                        └──────────────┬──────────────────┘
                                       ▼
                        ┌─────────────────────────────────┐
                        │  ASSEMBLY  src/graph/*.ts       │  supersede/contra,
                        │  + scripts/validate.mjs (CI)    │  never overwrite
                        └──────────────┬──────────────────┘
                                       ▼
                        ┌─────────────────────────────────┐
                        │  QUERY  motif engine, base-rate │  computed at build,
                        │  engine, React views            │  not hand-tagged
                        └─────────────────────────────────┘
```

Key departures from the Atlas single-file artefact:

- Data is separated from presentation. `src/data/` (facts) and `src/graph/`
  (claims) are typed TS modules, diffable and reviewable.
- Geometry is an asset (`src/data/india-geo.json`), not 173 KB of inlined JS.
- Motifs are computed from declarative patterns, not hand-tagged on edges.
- The provenance invariant is a build step, not an author's habit.

---

## 4. The agent roster

Defined in `.claude/agents/`. Each is hired for a bounded job with an explicit
refusal surface.

| Agent | Owns | Refuses to |
|---|---|---|
| `graph-cartographer` | `src/graph/` — nodes, edges, aliases, resolution | Create a node on a name match; delete a superseded fact |
| `evidence-auditor` | Tier assignment, falsifiers, denials | Soften a COLLAPSES verdict; publish an allegation without its denial |
| `base-rate-statistician` | Denominators, null models, FDR correction | Report a numerator without a denominator |
| `market-cartographer` | `src/data/companies.ts`, `states.ts` | Conflate registered HQ with operational HQ; conflate the two Ambani groups |
| `polity-analyst` | `src/data/politics.ts` | Record a portfolio without a date range |
| `viz-engineer` | `src/components/viz/` | Draw a state as a rectangle; restyle a tier for aesthetics |

Supporting skills in `.claude/skills/`: `evidence-tiering`, `pattern-discipline`,
`india-map`, `graph-schema`. Later additions — the fleet agents `cross-examiner` and
`energy-analyst`, and the skills `cui-bono`, `energy-money-trail`,
`fact-check-workflow` and `knowledge-graph-construction` — are listed in
`docs/INDEX.md` §7.

**Division of labour:** research agents (with web access) write to
`research/raw/*.json` — a quarantine zone. Nothing there is trusted. The
evidence-auditor and base-rate-statistician promote from `research/raw/` into
`src/data/` and `src/graph/`. This mirrors the extraction → grounding boundary and
means a hallucinating researcher cannot corrupt the graph without passing a gate.

---

## 5. Pages

### Existing, rebuilt
| Route | Change |
|---|---|
| `/` Dashboard | Real aggregates over the full dataset; evidence-tier census |
| `/map` Map Explorer | **Complete rebuild.** Real 36-state geometry, pole-of-inaccessibility labels, quantile choropleth, NSE/BSE toggle, drill-down |
| `/network` Network | Rebuilt on the tiered graph engine, with the full filter rail |
| `/industries`, `/political`, `/media`, `/search`, `/watchlist`, `/company/:id` | Rewired to the real dataset |

### New
| Route | What it is |
|---|---|
| `/patterns` | **Pattern Discipline** — the deep research on apophenia, base-rate neglect, clustering illusion, multiple comparisons, hub and small-world artefacts; the seven traps table; the symmetry check; the documented-conspiracies counterweight. The methodological spine of the project. |
| `/evidence` | **Evidence Audit** — the tier ladder, the date-test timeline, the falsification table, the name-collision trap, "what would change the conclusion". Ported from the audit artefacts. |
| `/base-rates` | **Base Rates** — the discriminating-power bars, the tender ledger, the denominator ledger. Answers "compared to what?" for every edge type. |
| `/cabinet` | **The Cabinet Graph** — Union Council of Ministers, portfolios with date ranges, constituencies, home states, and the ministry→PSU→sector chain. |
| `/conglomerates` | **Ambani & Adani** — group structure graphs for the two largest private groups plus the next tier, with the Mukesh/Anil distinction made structurally impossible to miss. |
| `/states/:code` | **State drill-down** — top listed companies, dominant industries, GSDP, ministers from that state, exchange split. |
| `/atlas` | **Money-Trail Atlas** — the depth case study, now running on the shared engine. |
| `/method` | How the graph is built, the four invariants, the tier definitions, what the project will not do. |

---

## 6. Phases and acceptance criteria

### Phase A — Foundation ✅
- [x] Real 36-state geometry with computed pole-of-inaccessibility anchors
- [x] Agent roster + skills, with refusal surfaces
- [x] `src/graph/schema.ts` + `scripts/validate.mjs` enforcing the invariant
- [x] Rebuilt India map (NSE/BSE, choropleth, drill-down, keyboard navigation)
- [x] Graph engine with the filter rail and the table twin
- [x] `/patterns`, `/evidence`, `/base-rates`, `/cabinet`, `/conglomerates`, `/states/:code`
- [x] CI: validate → typecheck → build → headless render of every route

**Acceptance met.** `npm run validate`, `npm run build` and `npm run smoke` all pass.
No edge violates the provenance invariant. No state renders as a rectangle. Every
tier appears in the legend.

### Phase B — Population and denominators ✅ *(partly)*
- [x] Companies dataset at 259 with per-state coverage; state economy layer for all 36
- [x] Base-rate engine with published denominators; the live rate computed from the dataset
- [x] Motif engine: declarative templates with chained steps, star steps and negation,
      computed at load, each with census + null-model score
- [ ] Motif templates extended beyond the initial five
- [ ] Base rates computed for every edge type rather than the six published

**Acceptance met for the engine:** every motif shows numerator, denominator and a
null-model verdict. No hand-tagged motifs remain in the computed view.

**Finding from this phase, worth carrying forward:** the case-study subgraph is
star-shaped, so degree-preserving rewiring cannot vary it and 4 of 5 templates come
back *untestable*. Testing them properly needs the full award population, which is
on the watchlist as computable-from-public-data-today. The engine surfacing its own
limit is the intended behaviour.

### Phase C — Ingestion ✅ *(pipeline and audit; codegen outstanding)*
- [x] Extractor → resolver → grounder → assembler pipeline over `research/raw/`
- [x] Entity-resolution report: every merge with its rationale and confidence, at `/provenance`
- [x] Reproducible run id, hashed from the inputs rather than read from a clock
- [x] Supersession events and documented voids carried into the report
- [ ] Promotion *generates* `src/data/*.ts` rather than only auditing it
      — **closed for the research fleets** by `npm run generate` (Phase F); **still
      open for the original datasets**, whose `src/data/*.ts` modules remain hand-written

**Acceptance met for the audit:** every published claim traces to a source **and** a
run id. On the current data: 515 canonical entities from 561 records, 46 merges on
strong keys only, **218 collision candidates refused** — including the two Reliance
groups, whose fusion is a structural guard that fails the build — and 100
weakly-identified records quarantined as `resolved: false`, taking no edges.

**Still manual for the original datasets:** `promote` reports; it does not write the
typed data modules. The fleets have codegen (`scripts/assemble-fleet.mjs`); the
companies, cabinet and conglomerate data do not.

### Phase D — Depth and breadth ✅ *(the visual half)*
- [x] Interlocks analysis, with the false-positive demonstration and the family-control frame
- [x] Time-range filter over edge windows, never hiding undated edges
- [x] URL state for share/export; the WCAG-clean table twin of every graphic
- [x] **Geographic network** — the map and the graph as one object, with a state-flow mode
- [x] Flow-direction diagram, money-movement predicates only
- [ ] Director interlocks keyed on DIN rather than declared key people
- [ ] Promoter-holding time series
- [ ] Media-ownership register

**The geographic network is the phase's centrepiece** and its design problem was
honesty, not layout: nothing is geocoded, most of the graph has no place at all, and
registered is not operational. All three are surfaced on the page rather than
quietly handled, and the arcs are fanned by a deterministic per-pair offset because
Delhi originates most of them and a single curvature bundles them into a blob.

### Phase E — What the build learned about itself

Three results that should shape the next phase more than any feature list:

1. **The motif engine reports most of its templates untestable.** The case-study
   subgraph is star-shaped, so degree-preserving rewiring cannot vary it and the
   null model has zero variance. This is not fixable with a better algorithm — it
   needs the full award population.
2. **Interlocks came back zero**, because the data is declared key people rather
   than a directorship register. The fix is DIN-keyed data, not more scraping.
3. **The surname-coincidence count is below chance.** 7 observed against ~19
   predicted across 3,795 pairs. There is no excess to explain — which is exactly
   the kind of result a platform like this exists to be able to report.

### Phase E — The investigative watchlist
Carried from the Atlas analysis, as dated, checkable actions:
- FY2025-26 electoral-trust and party contribution filings (due ~Nov 2026–Feb 2027)
- L&T's Companies Act s.182 line against the ₹500 cr Elevated Avenue donation
- ECI alphanumeric bond file: purchaser → party match for the Rungta purchases
- PPPAC 2022 minutes — the wording of the FCI anti-monopoly clause removal *(RTI-shaped)*
- PM CARES FY24/FY25 statements *(RTI-shaped)*
- Coal India and mining-PSU CSR destinations 2019–24 — the direct analogue of the
  ONGC finding, inside the relevant ministry. Public reports; nobody has run it.
  **The single most answerable open question in the file.**
- A base-rate study of electoral bonds against every coal/mining award 2019–24,
  with a shuffled control. Until someone runs it, the quid-pro-quo claim is
  unproven in both directions.

### Phase F — energy power map, distribution funds, plugin-shaped fleets ✅ *(welfare page closing)*

Two research fleets, a codegen step, two pages, and a repeatable shape for building
them.

- [x] A written fleet contract (`docs/research/FLEET_CONTRACT.md`) and a gate with
      teeth: `validate.mjs` §4 checks every raw fleet file at the quarantine boundary —
      provenance, no edge on an unresolved entity, a denial for every allegation in
      the same file, an innocent reading on every analytic claim, ISO dates at the
      precision written, alias collisions across the whole directory
- [x] `npm run generate` (`scripts/assemble-fleet.mjs`): reconciliation and
      cross-examiner verdicts applied, the invariants checked over what survives, typed
      modules emitted. Kill on a kill verdict or two refuting lenses; move a tier only
      to the more conservative; add a denial only when found and sourced. Killed claims
      are kept in `META` with reasons. Output depends on input bytes only
- [x] `validate.mjs` §5: a generated module that no longer matches its inputs fails
      the build. Vocabulary in one place (`scripts/lib/vocab.mjs`); the merge a pure
      function (`src/graph/mergeFleet.ts`); 30 assembler and merge tests in `check` and CI
- [x] Energy fleet: 12 domains → 404 nodes, 711 edges (310 documented, 304 reported,
      42 alleged, 55 analytic); 60 verdicts, 22 refuted, 1 killed, 15 denials added at
      assembly; 22 refused merges
- [x] Welfare fleet: 7 domains → 286 nodes, 335 claims, 78 schemes, 105 elections, 70
      coverage declarations; 35 verdicts, 15 refuted, 4 killed; 23 refused merges.
      Coverage is declared per state, year and category — never `["all"]` — because it
      is the only thing that may turn "no record" into "searched, none live"
- [x] Index membership (NIFTY 50: 50, SENSEX 30: 30, SENSEX 50: 49 of 50) joined by
      company id, shown on the company, industry, map and dashboard pages
- [x] Graph and geographic network to investigative-tool grade on the shared camera:
      ego focus, path finder with the view's median separation, time scrubber, edge
      card, keyboard traversal, a table twin that reads what the graph draws
- [x] `/energy`: 67 acceptance criteria, 67 passing on three consecutive runs; five
      serious WCAG findings fixed
- [x] `/welfare`: 85 criteria, 70 passing + 15 skipped (9 scaffold, 6 data void), 0
      failing; three serious and four moderate WCAG findings fixed; `test:pages` in the gate
- [ ] Renderer migration per `docs/research/GRAPH_UI_SOTA.md` §5
- [ ] Atlas-vs-national duplicate ids (`gadani`/`per:gautam-s-adani`,
      `joshi`/`pol:pralhad-joshi`)

**The build shape.** Two independent designs per page and a judge; a synthetic
five-seat UX review applied as amendments; acceptance criteria; a test writer who
never saw the implementation; a builder; a five-reviewer caucus plus a house
semantics reviewer (energy 38 findings → 24 by consensus; welfare 39 → 20); a fix
pass; a WCAG 2.1 AA audit. `docs/PLUGINS.md` records where each stage came from.

**What it learned** — about the subject:

1. **Almost every "who benefits" lens over-fires on incumbency.** Run on the other
   party, or on states run by other parties, it returns the same shape. What
   discriminates is process: auction against discretion, auditor and court findings,
   bid counts, margins.
2. **Khavda land is the one asymmetric energy case**, and the files disagree on its
   size (≈61% against ≈38%, on different dates and denominators). Carried, not
   resolved.
3. **Pre-election launch timing is symmetric across the UPA and the NDA**, with
   opposite electoral results in both. It does not discriminate and it predicts
   outcomes poorly.

— and about itself:

4. **Research capacity is a budget.** The WebSearch session cap (200) ran out
   mid-fleet. A "none found" written after that point is weaker than it reads.
5. **Agents drift from the contract in predictable ways**: a tier written as a
   predicate, free-text endpoints, invented days on month-only dates, merges on
   name similarity (45 refused across the two fleets). Each is now a gate, not a
   reminder.
6. **Acceptance criteria can be the defect.** Six `/energy` criteria were wrong,
   not the page. The criteria were amended; the tests were not bent to pass.

---

## 7. What this project will not do

- Assert that any named person committed an offence.
- Publish a private individual's details, or any allegation about a person with no
  public role.
- Link entities on name similarity.
- Render a pattern as a finding without its denominator, its innocent reading, and
  its kill condition.
- Present a self-declared affidavit figure as an audited one, or an asset
  trajectory without its peer baseline.

---

## 8. Open assumptions

1. Market caps and cabinet composition are stamped `asOf` and will drift. Every
   figure in the UI carries its date.
2. Registered HQ is used for state attribution throughout; operational reality is a
   separate, explicitly labelled field.
3. Map marks are positioned *within* a state, not geocoded, except where a real
   city coordinate exists. The UI says so wherever marks appear.
4. GSDP figures, where present, are the most recent verifiable MoSPI/RBI series and
   are labelled with their year.
