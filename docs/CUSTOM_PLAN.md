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

### Phase F — energy power map, distribution funds, plugin-shaped fleets ✅

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
- [x] Renderer migration per `docs/research/GRAPH_UI_SOTA.md` §5 — Canvas 2D + worker +
      a11y overlay; frozen channels pixel-identical; §5.5 edge contrast and §6 additions open
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

### Phase G — foreign loans, NGOs and foreign capital; the national tender record ✅

Design: `docs/superpowers/specs/2026-09-26-foreign-money-ngos-tenders-design.md`. Plan:
`docs/superpowers/plans/2026-09-26-foreign-money-ngos-tenders.md`. The ask named the
Rothschilds and BlackRock, the World Bank and the IMF, NGOs and ministers, and a tender
dataset. The stance the work took, written before any research ran: **institutions, not
bloodlines** (Rothschild & Co and BlackRock as companies with comparison sets; a family,
religion or ethnicity is never a node, edge, filter or colour); **loans are contracts with
terms** (instrument, rate, tenor, grace, conditions), not favours; **identical fields for
every side**, so the same lens runs on the other party and on the declared control.

- [x] Schema: `loan` (lender → borrower, ₹ crore, `terms`) and `grant` predicates; `projectId`,
      `countable`/`countedAs`, `holding` on an edge. Assembler generalised to N fleets from one
      `FLEETS` table; `validate.mjs` §4 gates every fleet directory and §5 re-derives ₹ from US$
- [x] **CPPP award pipeline** (`scripts/cppp/`, Python, offline): the Hugging Face scrape of the
      Central Public Procurement Portal, 4,921,960 rows over two Arrow files (3.45 GB, digests
      recorded). Quality table first: 2,923,713 distinct tender ids, 1,998,247 rows sharing one;
      the dedup rule "one row per (tender id, normalised winner, award date)" leaves 3,385,233
      award decisions. Then the rates over their declared denominators: single bidding 11.22 %
      [11.19, 11.26] of 3,019,420 awards with a bid count (central 17.67 %, state 7.59 %);
      non-open tender type 4.29 %; award within two days of closing 2.04 % (median 68 days);
      the same marked winner winning again as sole bidder 51.28 % of 200,813. Concentration by
      buyer as HHI on value and on count, at most five marked winners named per buyer and
      nobody else. A seeded 40-row live verification against the portal: **40 of 40 pages gone**,
      so every field stays `reported` and the page says so. Byte-identical rebuilds; 49 tests
- [x] **Three research fleets**, cross-examined claim by claim, reconciled per fleet and then
      across fleets, assembled by `npm run generate`:
      - finance — 353 nodes, 1,168 edges (1,077 documented, 54 reported, 9 alleged, 28 analytic),
        945 loan facts with terms; the World Bank census (1,117 projects, 849 commitments) fetched
        by script and kept beside the hand-researched sample, never summed. 84 verdicts, 40
        refuted, 6 killed; 36 refused merges
      - ngo — 138 nodes, 292 edges (95 documented, 128 reported, 51 alleged each with its answer,
        18 analytic); 102 FCRA state-year rows, each summing to its national figure. 142 verdicts,
        63 refuted, 14 killed; 23 refused merges. The FCRA portal was unreachable: every figure is
        routed through Parliament answers, MHA reports and PIB, and says so
      - capital — 133 nodes, 221 edges (153 documented, 34 reported, 12 alleged, 22 analytic);
        96 holdings across 38 of the 50 NIFTY constituents read, 19 controls. 61 verdicts, 19
        refuted, 15 killed; 25 refused merges
- [x] Cross-fleet reconciliation: `pol:shivraj-singh-chouhan`, `party:inc`, `wel:manmohan-singh`,
      `co:larsen-toubro` and `ngo:open-society-foundations` chosen as survivors; seven High Court
      nodes added to the Atlas; `rss` retyped party → sangh with a supersession note. Energy and
      welfare run ids moved; their counts did not
- [x] `/finance` — "Foreign money": one route, three lenses (loans, associations, capital), a
      judged spec (two candidates and a judge, 47 decisions), a five-seat synthetic UX review,
      110 acceptance criteria and a RED suite written blind. First pass 82 / 27 / 1 of 110; adjudication found 24 criterion defects, 2 both (AC-79 placeholder responses headed "Response from", AC-94 the flow's 606 ribbon tab stops), 1 environment (Chromium's own favicon re-fetch), plus AC-20's quotation rule widened to source titles and property statements; verified 109 pass / 0 fail / 1 skipped (AC-38, no zero-amount loan exists) on three consecutive runs against a pinned build, with WCAG S1, S2 and M1–M6 fixed and re-measured; in `test:pages` and CI.
- [x] `/tenders?section=national`: the CPPP record as a section of the existing register — the
      quality table before any rate, Wilson ribbons, decision-window histogram, concentration,
      red flags as rates over their family, the verification sample, gaps and provenance. 86
      criteria; WCAG audit 0 critical, 0 serious, 8 moderate (M1–M8 fixed), 13 minor. Verified 84 pass / 0 fail / 2 skipped ("not in this data") of 86 on three consecutive runs against a pinned build after the adjudication (15 criterion defects, 1 page defect, 2 both); in `test:pages` and CI since `9c03db7`.
- [x] Skill `foreign-money-trail` (with the ledger and the narratives ladder as references);
      agents `finance-analyst` and `procurement-analyst`
- [x] Explorer additions: jump-to combobox (lists every matching entity, never resolves a
      name itself), as-of date (`asof=`; caption "As of {d}: {shown} of {total} edges drawn;
      {undated} undated edges kept"; graph and twin fed one array), and a "why drawn" line
      under the edge card; three viewport checks; the frozen renderer untouched
- [x] Roster entities joined to the companies dataset by symbol in `src/graph/build.ts`
      (34 of 64 had been minted as second nodes; national graph 583 → 552 nodes)
- [ ] Open from reconciliation: 29 court rulings modelled as `enforce`
      in the frozen fleets without the `Judicial ruling on` prefix; one West Bengal FCRA row
      that does not reconcile; the Phase G audits predate their reconciliations

**What it found** — about the subject:

1. **Every actor-selecting lens produced an equally alarming picture on its control.**
   "BlackRock owns India" becomes "Norway, Singapore and LIC own India" on the same
   filings (BlackRock's ETF aggregates in NIFTY 50 companies read 0.49–1.78 %). "The
   Rothschilds run Indian banking" is one adviser among several on DIPAM and private
   mandates, with fees undisclosed for all of them. Neither survives as an edge; both are
   on the ladder with their strongest counter.
2. **The state-share lens over foreign loans shows no party alignment.** Run by state and
   by ruling party over the World Bank census, the distribution follows population and
   project pipeline, not incumbency.
3. **The FCRA record is symmetric where it is loudest.** Retrospective FCRA amendments
   were made by BJP and Congress governments and are recorded identically; the ₹905 crore
   "foreign funding of NGOs" reading collapses on inspection of the table it was read
   from; the "USAID $21 m for turnout" claim was killed as an edge for want of a record.
4. **The tender dataset's defects are larger than any pattern in it.** Forty-one per cent
   of rows share a tender id, a tenth of bid counts are null or zero, and the winner field
   holds hundreds of thousands of personal names. The dedup rule moves the single-bidder
   rate from 13.2 % to 11.22 %; the pipeline states its rule and its family beside every
   rate for that reason.

— and about itself:

5. **A census beside a sample cannot be summed.** Facilities beside tranches, MoUs beside
   agreements, a fetched register beside hand research. `countable`/`countedAs` exists so
   the page can say "already in the census" instead of adding.
6. **A fetcher's output is not a research file.** Hand fixes to `worldbank-projects.json`
   were ported into the fetcher's tables and proven by a byte-identical re-fetch; a
   reconciliation that had merged hand facts into it was undone.
7. **Verification can fail honestly.** Forty of forty award pages were gone from the
   portal. The pipeline records the class of every miss, and the page keeps every field at
   `reported` rather than promoting on a scrape alone.
8. **Byte-identical is a gate, not a hope.** Parallel float sums and a runtime field made
   two rebuilds differ; a single thread and paise rounding fixed it, and the test asserts it.

### Phase H — the money India spends on force: military and police budgets, tenders, pay ✅ *(research, slice, spec, tests, skill and agent; the page build outstanding)*

Design: `docs/superpowers/specs/2026-10-04-force-finance-design.md`. Plan:
`docs/superpowers/plans/2026-10-04-force-finance.md`. Page build plan:
`docs/superpowers/plans/2026-10-04-security-page.md`. Twenty-four commits from `447e854` to
the build checkpoint `878edcd` (`git log --oneline 447e854..878edcd`).

**What was asked (2026-10-04).** A page for military and police budgets, for each city and
state and for the extra departments; tenders, funding and salaries checked; connections
found with skills, plugins and sub-models. The spec read each word before the fleet ran
(§0): "military" is the Union defence establishment, funded by the Union alone; "police" is
three payers — the Union's own police, the state police, and the city commissionerates inside
the state budgets; "extra departments" are Home Guards, Civil Defence, fire, prisons,
forensic laboratories, the ED, the CBI, the NIA, the NCB, the SPG and the Cabinet
Secretariat's intelligence lines; "tenders" is the CPPP award scrape sliced to security buyers,
plus the Defence Acquisition Council approvals and signed contracts PIB publishes, because
defence capital acquisition is not on CPPP; "salaries" is pay scales and pensions, never a named person's pay;
"connections" are documented joins, each with a denominator and an innocent reading. The
stance (§3): spending on force is a policy choice, not a scandal; pay and pensions are
contracts with people; vendors are vendors, with identical fields and never alone; outcomes
are rates, with party as text; cases are records with their counter, Bofors beside Rafale.

**What resolves at which level, and why.** The reconnaissance critic's reading (spec §2),
kept by the judge from candidate A (`e0e7119`) and set as fixed copy for the page
(`docs/design/SECURITY_PAGE.md` §5.0.1):

- **Union → the budget line.** Every Union demand is a text-extractable PDF on
  indiabudget.gov.in with Actual, BE and RE per line (spec §2). `FORCE_BUDGETS` holds 3,906
  Union rows over 35 bodies, FY1999-00 to FY2026-27. No defence demand is printed by place
  (`union-defence.json → voids[0]`), so there is no state or city defence figure.
- **State → the Police head.** Each state's police money resolves to its Police major head
  (MH 2055) from RBI State Finances and no further. Five states' budget documents did not open;
  only Uttar Pradesh's Grant 26 did (`state-police.json → voids[2]`). `FORCE_BUDGETS` holds
  191 state rows for 30 states and UTs; 70 are Uttar Pradesh's, 65 of them its own Grant 26
  series from FY2008-09. Strength comes through secondary transcriptions while BPR&D is unreachable, and says so
  (`state-police.json → voids[0]`); `FORCE_STRENGTH` holds 142 rows.
- **City → the footprint only.** No city police budget is published except Delhi's. Every
  other commissionerate's money sits inside its state's MH 2055 (`state-police.json →
  voids[1]`). Cities appear through what is located in them: `FORCE_FOOTPRINT` holds 228 rows
  across 124 state–city pairs, 18 of them commissionerates.
- **Delhi Police is the one published city budget**, and it is a Union demand line under the
  Home Ministry: 177 rows, FY1999-00 to FY2026-27.

The reason is the skill's rule on city money. Published means printed by the paying
government in its own budget document or accounts; a city figure from the press, PRS or RBI is
not a row under any tier (`force-money-trail/SKILL.md`, Refusals). The spec has the page print
"inside the state's police head" in place of a number (spec §1).
*(Row counts by payer, body, year and kind are counted over `FORCE_BUDGETS`,
`FORCE_STRENGTH` and `FORCE_FOOTPRINT` in `src/graph/force.generated.ts`.)*

- [x] **H0 — spec and plan** (`dfeab6c`). Reconnaissance on 2026-10-04: seven source-family
      probes, a critic and three fills. Every reachable route and every blocked one is named,
      with its secondary. The plan, Tasks 0 to 10, follows the spec.
- [x] **H1 — tabular `series`** (`6a99f11`). A fleet may declare budgets, strength and
      footprint rows beside its graph. Each row has exact keys in order, a body the graph
      knows, closed lists, a financial-year label and ₹ crore ≥ 0; a footprint row carries its
      state and city. `validate.mjs` §4 gates the rows; §5 re-assembles and compares. Tests 55
      → 64; a 65th covers chunked emission (`8671e8d`)
- [x] **H2 — CPPP security slice** (`1e37783`). `scripts/cppp/security.py` writes
      `research/raw/cppp/security.json` in the same run as the six sibling files. 558,291 raw rows
      (11.34 % of the file) become 411,943 award decisions after the dedup rule, in eight buyer
      classes. Single bidding 3.17 % [3.11, 3.22] of 365,600, against 11.22 % for the whole
      file. That is a works rate: the Military Engineer Services is 74.41 % of the slice's award
      decisions and the works class single-bids at 0.42 %. Without works the slice reads
      12.20 % [11.98, 12.42] of 85,108. By class: stores 12.87 %, research 18.49 %, dpsu
      11.33 %, capf 9.53 %, intelligence-investigation 10.11 % of 178, state-police 8.11 %
      (state portal, whole file 7.59 %), other-security 37.83 % of 304. The file's first field
      says what is not here: defence capital acquisition, GeM, and most state police buying.
      Every field is dataset-only; the 40-row live sample found every stored link expired.
      Tests 21 → 27. `/tenders?section=national` gains one "security buyers" line beside the
      whole-file rates, linking to `/security?lens=procurement` (`76c0c35`); `/network` gains no
      force layer, because its layers are cut by entity family, not by fleet
- [x] **H3 — research fleet `force`**, eight domains (union-defence, union-home,
      state-police, procurement-industry, footprint, money-people, pay-pensions, literature),
      cross-examined claim by claim, reconciled, corrected and assembled (`d648a26`, `8671e8d`,
      `8dc2a68`, `3cb37ed`, `08062a9`, `d9bc302`, `76e265d`). Run `run-122278453551`: 359 claims
      in, 266 nodes, 394 edges (187 documented, 82 reported, 79 analytic, 46 alleged), 22 killed
      and held, 57 contras added, 13 benefit rows, 67 voids, 46 narratives, 307 base rates;
      series 4,097 budgets, 142 strength, 228 footprint. `AUDIT.json` holds 214 verdicts, both
      lenses, 47 refuted; `RECONCILIATION.json → auditCorrections` records an outcome for all
      214: 196 applied, 15 refused, 3 deferred. 7 id mappings, 34 refused merges, 64 entity
      records consolidated. The 22 killed are 21 duplicates and one claim on an audit kill verdict
      (`footprint:c014`)
- [x] **H4 — `/security`, "Security spend" under Registers.** Done: the route scaffold, which
      prints what is loaded and draws no placeholder (`0073a0f`); the design duel, candidate A
      graphic-first and candidate B question-first, the judgement and the judged spec
      (`e0e7119`); a five-seat synthetic UX review, 95 items, 33 must-level amendments applied
      and UD1–UD46 deferred, and 152 acceptance criteria (`7e100e7`); the RED suite, written
      blind, 152 of 152 failing against the scaffold, each on a missing element and none on a
      test error (`fdcfedc`, `7e2e474`, `2f922b2`); the builder's plan (`956952c`); a build
      checkpoint (`878edcd`). Build, caucus, fix, verify three times on a pinned build, WCAG
      audit, adjudication, and the suite into `test:pages` and CI: done. The slim slice file
      `security-page.json` carries no winner-bearing field and is what `loadSecurity()` reads
      (`f9e8656`, `836e841`); 143 of 153 with the audit and caucus fixes and the WCAG audit
      (`836e841`); 152 of 153 on three runs after adjudication (`a0d3156`); Procurement's
      whole-pair folds at 390 px, 31,965 px to 18,098 px (`81c970c`); then the lead's AC-134
      decision for Procurement (an `On this lens` jump list, AC-134a, per-block allowances for
      what the spec keeps open, a 19,000 px regression cap), and 153 of 153 on three
      independent pinned runs. The suite is the fifth file in `test:pages`, and
      `test:security-view` (19 tests) runs in `check`. WCAG (`SECURITY_A11Y.md`): 0 critical,
      4 serious and 7 moderate, all fixed; 12 minor, 8 fixed, 1 in part, 3 not. G5, the split
      of `force.generated.ts`, was not done
- [ ] **H5 — skill, agent, documents, full check, bundle.** Done: the `force-money-trail`
      skill and the `security-analyst` agent (`657f895`, `7e2e474`, `4a6e079`). Six pressure
      testers acted as the agent on requests the house rules forbid; two held, four held in
      part; 54 gaps found, 51 closed and 3 closed in part. A figure check sampled 506 figures:
      494 matched; the 12 that did not were written against an older run and now read the
      current one. The skill is generated by `scripts/skills/force-money-trail/gen.mjs` with no
      figure typed by hand, and `npm run check:skills` fails the build on any difference, in
      `check` and in CI (`67f27ab`). The fleet brief, contract addendum and reconnaissance
      moved into `docs/research/force/` (`4a6e079`). The `DATA_SOURCES` sweep (8,751
      references, 746 distinct URLs, 137 hosts), `FORCE_LITERATURE.md` and the `PLUGINS`
      entry (`3a7ff00`). Outstanding: the documents that record the built page, the full
      `npm run check`, and the bundle re-cut
- [ ] Open from reconciliation and review: three deferred audit corrections
      (`literature:c007`, `c014`, `c028`); G5; UD1–UD46; the `/security` WCAG minors not fixed
      (m1, m6, m11; m3 in part). Closed: `literature.json` now quotes the published slice
      (`75f339f`, `4b620c6`), and the five test interpretations are adjudicated (`cbcc935`,
      `836e841`)

**What was refused, and why.** Spec §1 non-goals, `docs/design/SECURITY_PAGE.md` §14, and
the refusals that open `.claude/skills/force-money-trail/SKILL.md`. Six pressure testers
tried each one (`4a6e079`).

- **City police budgets that are not published.** No number, share of a state head,
  estimate or per-capita figure for any city but Delhi. None is published; §14 has the page
  print where the money sits. A map of defence money by state or city is refused for the same
  reason (`union-defence.json → voids[0]`).
- **CPPP winner names.** No CPPP winner is a node, a fact or an edge, and this register names
  none. The slice is dataset-only and its verification links were all dead
  (`security.json → caveat`); a winner string cannot be held to the comparator rule this page
  holds vendors to. The pipeline never writes an unmarked name (`security.json →
  provenance.refusal`). A list of the firms with the most single-bid awards is a list of
  culprits; indicators are rates over a family, and repeat pairs are counted, never listed.
- **Operational detail.** No unit, deployment, order of battle, stock, depot, readiness
  state, forward or border site, or procurement the Ministry has not announced. Only
  published budgets, awards, lists of installations and court and audit records. A refusal
  is not a void: these are out of scope by rule, not unreached.
- **Persons below public rank.** A person is named only while holding, or for an act done
  in, an office on a closed list: minister, legislator, party office-bearer, Secretary or
  Chief Secretary, service chief, Director General of a CAPF, the DRDO or a state police,
  head of a Union agency, Commissioner of Police heading a commissionerate, a Supreme Court or
  High Court judge or the CAG acting in office, a listed-company director. Everyone else is named by office and force. No private individual; no salary of
  a named person.
- **Party colour.** Party is text: never a colour, a filter, a sort or a government-era
  toggle. The symmetry check runs the same lens on states and governments of each party and
  prints what it finds.
- With them: a "security spending" grand total that adds overlapping rows; DAC approvals by
  vendor (approvals name no vendor and no value); a vendor shown alone; any ranking, score or
  index of states, forces, vendors, officers or cases.

**What it found** — about the subject:

1. **Defence's falling share of GDP is the denominator.** The MoD total grew 11.0 % a year
   nominal under UPA-II while GDP grew 15.3 %; under the NDA 8.8 % against 10.0 %
   (`union-defence.json → symmetryCheck`).
2. **Pensions are the line that grew.** Defence Pensions actuals rose from ₹45,499.54 crore
   (2013-14) to ₹157,653.65 crore (2024-25), 3.47×, against 2.33× for service pay and 2.02×
   for capital (`pay-pensions.json`).
3. **The security slice's low single-bid rate is a works rate.** Read by buyer class, never
   for the slice as a whole (H2).
4. **The cases are records with a thin result.** Of seven named cases — Bofors, Rafale,
   AgustaWestland, Tatra, Adarsh, Sukna, Pegasus — none has a final conviction in the records
   opened (`money-people.json → baseRates[5]`).
5. **The footprint does not follow the party in office.** Over the 177 footprint rows of the
   first pass, 0.12 installations per million residents on BJP-run large states against 0.14
   on opposition-run ones, party as the file records it (`footprint.json → symmetryCheck`).

— and about itself:

6. **Supersede, never edit.** A changed fact is a new claim with `supersededBy` on the old one.
   Fourteen money-people corrections were refused because they fell on held duplicates; the
   survivors already carried the fixes (`08062a9`).
7. **A schema rule can meet a printed negative.** The Ordnance Factories demand printed
   negative nets in several years. They are kept as a void with every value as printed, never
   forced into a row; the series rule (₹ crore ≥ 0) keeps them out (`union-defence.json →
   voids[3]`).
8. **Scale reached the type checker.** TypeScript rejected one 4,096-row literal; any series
   above 1,000 rows is now emitted as chunks the export spreads, and the five older modules
   stayed byte-identical (`8671e8d`).
9. **Research capacity is still a budget.** The corrections pass stopped on a usage limit
   after five of eight domains (`3cb37ed`). It was resumed with completed agents replayed from
   cache, and the last three domains landed in `08062a9` (`docs/PLUGINS.md`).
10. **A skill can go stale like a module.** The agent's register block quoted 12 figures from
    an older run. The skill is now generated from the files and gated in CI (`4a6e079`,
    `67f27ab`).

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
