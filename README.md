# India Corporate Intelligence Platform

A map of India's listed corporate landscape joined to a **provenance-bearing knowledge graph** of
political and ownership connections — built so that every claim carries its evidence tier, and every
pattern carries its denominator.

The platform is as interested in what it cannot show as in what it can.

---

## Why it is built this way

Two projects merged here from opposite ends.

**ICIP** started from **breadth** — map every NSE/BSE company, every state, every industry, every
political and media connection. Breadth without an evidence discipline produces exactly the artefact
this project exists to avoid: a dense, alarming-looking web whose edges are near-universal and
therefore measure nothing.

**The Money-Trail Atlas** started from **depth** — one minister, ~70 entities, ~106 relationships,
every one a sourced claim with an evidence tier. Its limit was that it kept hitting the same wall:
*is this edge unusual?* It could not answer, because it had no population to compare against.

**The integration:** the Atlas supplies the epistemics, ICIP supplies the population. The Atlas's four
invariants become the *schema* of the graph, enforced in CI. ICIP's several-hundred-company dataset
**is** the reference class that gives Atlas claims their denominators. The base-rate check stops being
a manual footnote and becomes a query.

Full reasoning: [`docs/CUSTOM_PLAN.md`](docs/CUSTOM_PLAN.md).

---

## The four invariants

Enforced by `npm run validate`, which CI runs. These are build steps, not conventions.

| Invariant | Meaning |
|---|---|
| **Provenance** | Every edge carries `srcs`, **or** is tier `alleged`/`analytic`. No exceptions. Never invent a source, figure, date, quote, ticker or CIN. |
| **Resolution** | One real-world entity, one canonical node, aliases on the node. Identity is confirmed by DIN, constituency, office-with-dates or DOB — never by name match. A node with `resolved: false` **may not be an endpoint of any edge**. |
| **Supersession** | When a fact changes, the old claim is retained and stays addressable. Nothing is ever deleted from the graph. |
| **Contradiction** | Denials and counter-evidence are first-class `contra` edges, rendered as prominently as the claims they answer. |

### Evidence tiers

Line style in every graph carries the tier. It is semantic and is never restyled for looks.

| Tier | Bar |
|---|---|
| `documented` | A primary record says so — gazette, filing, court order, audit report, RTI reply, official portal. Or two independent credible sources. |
| `reported` | A credible outlet with named sourcing or published underlying documents. |
| `alleged` | A named party asserts it. Ships with the denial alongside. |
| `analytic` | Our own comparison. Carries no causal claim. Ships with a mandatory `innocentReading`. |

---

## Pages

Full file-by-file index: [`docs/INDEX.md`](docs/INDEX.md). Picking this up cold:
[`HANDOFF.md`](HANDOFF.md).

34 routes, grouped as the sidebar groups them.

**Markets** — `/` dashboard · `/map` the NSE/BSE map, with an index filter (`idx=nifty50|sensex30|sensex50`)
· `/geograph` the geographic network · `/industries` sector concentration · `/conglomerates` the ten
largest groups, and `/conglomerates/:id` each group in depth · `/interlocks` who sits on more than one
board · `/states/:code` per-state drill-down · `/company/:id`

**Registers** — `/tenders` government awards · `/resources` coal, minerals, hydrocarbons and spectrum
· `/pmcares` PM CARES against its PMNRF control · `/energy` the energy power map · `/welfare`
distribution funds, 2000–2026 · `/finance` foreign money: loans, associations, capital · `/security` the
money India spends on force: budgets, footprint, procurement and people · `/media` ownership ·
`/allocation` every register on one graph

**Power** — `/cabinet` the Union Council of Ministers · `/network` the merged connection graph ·
`/atlas` the Money-Trail case study

**Method** — `/patterns` why every large network looks like a conspiracy · `/motifs` the computed
motif engine · `/prospector` candidate patterns as ranked questions · `/desk` the investigative desk ·
`/capture` capture pathways · `/evidence` the tiering procedure applied claim by claim · `/base-rates`
compared to what? · `/competition` bidder counts · `/provenance` the ingestion ledger · `/method` how
this is built, with a live integrity check

**Tools** — `/search` · `/political` donations, with the flow diagram · `/watchlist`

### The energy power map and distribution funds

`/energy` draws the merged graph filtered to the energy layer: coal, mines, oil and gas, hydro,
solar and wind, nuclear, grid, the money trail, promoters, enforcement and the state layer. Beside
it, a who-benefits ledger that sums nothing, every allegation next to its answer, base rates as
numerator of denominator, and the documented voids shown at rest. `/welfare` maps cash-transfer and
distribution schemes from 2000 to 2026 with a year scrubber, a ballot mark for every assembly election
in the scrubbed year, and three different fills for three different absences: none recorded,
no comparable figure, and declared searched with none live. Party is text, never a colour.

Both pages read generated modules, never the raw research. Both render honestly with zero records.

### Foreign money and the national tender record

`/finance` puts external loans, foreign contributions and foreign capital on one route as three lenses.
A loan is a contract with terms — lender, borrower, instrument, rate, tenor, grace, conditions — and the
World Bank census (1,117 India projects) sits beside the hand-researched sample and is never summed with
it. FCRA receipts and actions are shown with every allegation beside its answer and no classification by
keyword, religion or stance. Foreign holders of NIFTY 50 companies are a grid that always shows the
comparison set — Norway's fund, Singapore's, LIC, the promoter — beside BlackRock, and renders nothing
below four rows. Institutions, not bloodlines: a family, religion or ethnicity is never a node, edge,
filter or colour; a narrative that names one is rated on the ladder with its strongest counter.

`/tenders?section=national` is the Central Public Procurement Portal award record: 4.92 million scraped
rows reduced to 3.39 million award decisions by a stated dedup rule, the dataset's own defects printed
before any rate, single-bidder rates with Wilson intervals over their declared denominator (11.22 %
overall; central 17.67 %, state 7.59 %), decision windows, concentration by buyer, and the live
verification in which all 40 sampled portal pages were gone — so every field stays `reported`. The
pipeline names at most five marked winners per buyer and nobody else.

Beside the whole-file rates, one "security buyers" line reads the CPPP security slice
(`research/raw/cppp/security.json`) and links to `/security?lens=procurement`. The slice is what the
forces, the DPSUs and the police bodies bought on the open market and published on CPPP: 411,943
award decisions after the same dedup rule, 12.17 % of the file's. Its single-bidder rate is 3.17 % of
365,600 against 11.22 % for the whole file. The Military Engineer Services works buyer alone is
74.41 % of the slice. Without the works class the rate is 12.2 %. Defence capital acquisition is not
on CPPP, so the slice is not India's security procurement.

### The money India spends on force

The judged spec designs `/security` to record what India's governments spend on force, on three
lenses that share one filter rail. Budgets: the Union's defence and police lines by demand, year and stage, with pensions and pay
called out; each state's Police head beside its police strength; Delhi Police as the one published city
budget. Footprint: cantonments, laboratories, plants, headquarters and commissionerates, placed in
their states. Procurement and people: named defence contracts by vendor class, the CPPP security
slice by buyer class, electoral bonds, retired officers' board roles, and the cases in their control
pairs, Bofors beside Rafale. Spending on force is a policy choice. A large number is not a finding. The
spec has the page refuse a city police budget other than Delhi's in any form, a total that adds rows from two
levels, a vendor alone or ranked, the names of open-market winners, party as a colour, filter or sort,
and operational detail. The questions in order and the full refusal list are in the judged spec,
[`docs/design/SECURITY_PAGE.md`](docs/design/SECURITY_PAGE.md) §2 and §14.

The design record is committed: two candidates, a judgement, a synthetic five-seat UX review whose 33
must-level amendments are applied, 152 acceptance criteria, and a RED suite of 152 Playwright checks
(`scripts/pages/security.test.mjs`), all 152 failing on the scaffold.

The page is built (`src/pages/Security.tsx`, `src/components/security/`,
`src/data/securityView.ts`), and its suite now runs in `test:pages`: 153 tests, the 152 criteria
and the §0.6 keyed-hooks check, passed 153 of 153 on three independent runs against pinned
builds. Each failure on the way was classed as a page, test or criterion defect, and every
amended criterion carries an `[Adjudicated]` mark and its reason in
`docs/design/SECURITY_ACCEPTANCE.md`. The page reads `research/raw/cppp/security-page.json`, a
slim projection of the slice with no winner-bearing field, so no open-market winner's name
reaches the browser (`f9e8656`, `836e841`). At 390 px the Procurement lens folds each case pair
whole, claim and response together, which took it from 31,965 px to 18,098 px (`81c970c`). The
content the spec keeps open on that lens already measures 11,327 px, so the lead replaced its
10,128 px ceiling with an `On this lens` jump list at the head of the lens and a 19,000 px
regression cap (AC-134, AC-134a); Budgets and Footprint keep theirs. The WCAG 2.1 AA audit,
[`docs/design/SECURITY_A11Y.md`](docs/design/SECURITY_A11Y.md), found 0 critical, 4 serious, 7
moderate and 12 minor: every serious and moderate finding is fixed, eight minors are fixed, one
in part, and three are not.

### The geographic network

`/geograph` draws the graph in place rather than making the reader join a map and a
force-directed layout in their head. Two modes: entities placed in their registered state and
connected by arcs, or relationships aggregated into arcs between states.

Three things it cannot honestly show, all surfaced rather than quietly handled:

- **Nothing is geocoded.** A mark sits on a golden-angle spiral inside its state; its position
  there carries no information.
- **Most of the graph has no place.** People, rules, parties and sectors are not geographic.
  Dropping them would silently delete most of the network; scattering them over the map would
  invent locations. They sit in a labelled side column.
- **Registered ≠ operational.** An arc records where two registered offices are.

Arc curvature is jittered deterministically per pair — Delhi originates most arcs in every view, and
one fixed curvature bundles them into an unreadable blob. Same pair, same curve, so the picture is
reproducible.

### Ingestion

```
research/raw/*.json ──► promote ──► research/promotion-report.json      (the original datasets)
                        resolution · grounding · run id                  src/data/*.ts still hand-written

research/raw/energy/*.json ─┐
research/raw/welfare/*.json ┤ validate §4 ──► generate ──► src/graph/energy.generated.ts
  + RECONCILIATION.json     │ (raw gate)      reconcile ·    src/data/welfare.generated.ts
  + AUDIT.json              ┘                 audit · gate   (never hand-edit; validate §5
                                                              fails a stale module)
                                   ▼
          src/graph/mergeFleet.ts ──► DataContext ──► pages
```

The fleets write to `docs/research/FLEET_CONTRACT.md`. `npm run generate` applies each fleet's
reconciliation (id mappings, refused merges) and its cross-examiner verdicts, checks the four
invariants over what survives, and emits typed modules. A killed claim is kept in the module's
`META` with its reason. The energy fleet assembles to 404 nodes and 711 edges; the welfare fleet to
286 nodes, 335 claims and 78 schemes. The force fleet (`run-122278453551`) assembles to 266 nodes and
394 edges from eight domain files, with 22 claims killed and held, and carries three tabular
series: 4,097 budget rows, 142 strength rows and 228 footprint rows.

`research/raw/` is a quarantine zone. `npm run promote` runs extraction → resolution → grounding →
assembly with a run id derived from a hash of the inputs, not a clock, so it is reproducible.

On the current data it resolves **515 canonical entities** from 561 records, merges **46 on strong
keys only** (ticker, scrip code, state code, exact corroborated name), and refuses **218 collision
candidates** — including "Reliance Group (Anil Dhirubhai Ambani Group)" against "Reliance Industries
Group (Mukesh Ambani)". Fusing those two is a structural guard that fails the build. 100
weakly-identified records are quarantined as `resolved: false` and take no edges; that is the gate
working, so it does not fail the build. The ledger is at `/provenance`.

### The motif engine

Motifs are **computed from declarative templates** at load time, not hand-tagged on edges. A
hand-tagged motif is an assertion wearing the costume of a query — the analyst decides which edges
belong to the pattern, so the pattern can never fail to be found. These can, and several do.

Templates support chained steps, **star** steps (both legs departing from the same entity), and
**negation** — which is how the documented void became a query rather than a curated list. Every result
is scored against a predicate-preserving Maslov–Sneppen rewiring.

The engine's most useful output so far is about itself: **4 of 5 templates are untestable** on the
case-study subgraph. It is star-shaped — nearly every award edge shares one ministry as its source — so
a degree-preserving swap between two award edges returns the same edge set, the null model has zero
variance, and any z-score against it is meaningless. The engine reports *null model degenerate* and
says why, rather than printing a confident-looking `z = 0.00`.

The **symmetry check** runs the identical templates against the national layer, which contains no
award, donation or enforcement edges at all. A template that fires there anyway is matching on
something structural rather than on the substance it claims to detect.

---

## The map

`src/data/india-geo.json` — 36 real state and UT boundary paths at `viewBox 0 0 612 696`.

- Label anchors are the **pole of inaccessibility** of each state's largest sub-polygon — the interior
  point furthest from any edge. Bounding-box centres fall outside Gujarat, Kerala, Odisha and West
  Bengal, so they are not used anywhere.
- `clearance` is the label-fit budget. Below 8 units a state gets an outboard label with an elbowed
  leader line into the nearest gutter.
- West Bengal has 63 sub-polygons, Gujarat 17, the Andamans 36. Islands and enclaves are drawn.
- Choropleth defaults to **quantile** bins: Indian state market cap is extremely heavy-tailed, and a
  linear ramp renders thirty states identical.
- **No data ≠ zero.** Unmeasured states render as an unmistakable hatch with an explicit legend entry.
  The lowest colour step is deliberately well clear of the page background so "small" can never be
  confused with "unmeasured".
- Entity marks are placed on a golden-angle spiral **within** a state — not geocoded, and the UI says
  so wherever marks appear.

---

## Data

`research/raw/` is a **quarantine zone**. Research agents with web access write there; nothing in it is
trusted. Promotion into `src/data/` and `src/graph/` happens only after the grounding checks pass,
which means a hallucinating researcher cannot corrupt the graph without passing a gate.

| Dataset | Records | Notes |
|---|---|---|
| `cabinet.json` | 69 ministers | Portfolios date-ranged; departures recorded, not deleted |
| `companies-by-state.json` | 259 companies | 26 states covered; 10 states explicitly recorded as having no listed HQ |
| `state-economy.json` | 36 states/UTs | GSDP where verifiable, null otherwise |
| `conglomerates.json` | 10 groups, 64 listed entities | The two Ambani groups separated **structurally**, not just in prose |
| `pattern-matching-epistemics.md` | literature review | Every citation checked; unverifiable items listed and not asserted |
| `indices.json` | NIFTY 50 (50), SENSEX 30 (30), SENSEX 50 (49 of 50) | Joined to companies by id only; the unconfirmed fiftieth is a gap, not a guess |
| `energy/*.json` | 12 domain files + `RECONCILIATION.json`, `AUDIT.json` | 60 cross-examiner verdicts; 1 claim killed |
| `welfare/*.json` | 7 domain files + `RECONCILIATION.json`, `AUDIT.json` | 35 cross-examiner verdicts; 4 claims killed |
| `finance/*.json` | 7 domain files + `RECONCILIATION.json`, `AUDIT.json` | 84 verdicts; 6 killed. `worldbank-projects.json` is fetched by script (1,117 projects, 849 commitments) |
| `ngo/*.json` | 5 domain files + `RECONCILIATION.json`, `AUDIT.json` | 142 verdicts; 14 killed. FCRA figures routed through Parliament answers, MHA reports and PIB |
| `capital/*.json` | 16 domain files + `RECONCILIATION.json`, `AUDIT.json` | 61 verdicts; 15 killed. 96 holdings across 38 of 50 NIFTY constituents, 19 controls |
| `force/*.json` | 8 domain files + `RECONCILIATION.json`, `AUDIT.json` | 214 verdicts; 22 killed; 214 audit corrections recorded. Series: 4,097 budget, 142 strength, 228 footprint rows. Fleet documents in `docs/research/force/` |
| `cppp/*.json` | 7 aggregate files from `scripts/cppp/build.py` | 4,921,960 rows → 3,385,233 award decisions; aggregates only, no award row and no unmarked name. `security.json` is the security-buyer slice: 558,291 rows → 411,943 award decisions |

Every figure is stamped `asOf` and is as-of-a-date, never current. Companies are attributed to their
**registered** headquarters — Coal India is Kolkata-registered though the coal is in Jharkhand and
Chhattisgarh. Conflating registered with operational HQ is the most common error in state-wise
corporate maps.

---

## Agents and skills

`.claude/agents/` — fifteen agents, each hired for a bounded job with an explicit refusal surface.
The six the graph was built on:

| Agent | Refuses to |
|---|---|
| `graph-cartographer` | Create a node on a name match; delete a superseded fact |
| `evidence-auditor` | Soften a COLLAPSES verdict; publish an allegation without its denial |
| `base-rate-statistician` | Report a numerator without a denominator |
| `market-cartographer` | Conflate registered with operational HQ; conflate the two Ambani groups |
| `polity-analyst` | Record a portfolio without a date range |
| `viz-engineer` | Draw a state as a rectangle; restyle a tier for aesthetics |

The others: `interface-designer`, `frontend-developer`, `pattern-prospector`, `investigative-desk`,
`cross-examiner` (one claim, one lens, default refuted), `energy-analyst`, `finance-analyst` (refuses a
family or ethnicity as an edge, a holder shown alone, a ₹ total over loans), `procurement-analyst`
(refuses an unmarked name, a rate without its family, a rebuild that is not byte-identical) and
`security-analyst` (refuses operational detail, any person below the public rank or any private
individual, and city money that is not published).

`.claude/skills/` — fifteen, including `evidence-tiering`, `pattern-discipline`, `india-map`,
`graph-schema`, `cui-bono` (who benefits, as a ledger row with a falsifier), `energy-money-trail`,
`foreign-money-trail` (what the three foreign-money fleets established, with the narratives ladder) and
`force-money-trail` (what the force fleet established; generated from the raw files by
`scripts/skills/force-money-trail/gen.mjs`, and `npm run check:skills` fails on any difference).
Full list: [`docs/INDEX.md`](docs/INDEX.md) §7.

Plugins (SweetClaude, superpowers) are installed at user scope and referenced, never vendored. Which
stages of a build they supply: [`docs/PLUGINS.md`](docs/PLUGINS.md).

---

## Development

```bash
npm install
npm run dev            # vite dev server
npm run promote        # research/raw → resolution + grounding report
npm run generate       # research fleets → the six *.generated.ts modules
npm run test:assemble  # assembler and merge tests, synthetic fixture
npm run validate       # data-integrity gate — the four invariants
npm run build          # tsc -b && vite build
npm run check:skills   # regenerate force-money-trail and fail on any difference
npm run smoke          # headless render of all 34 routes; serves dist itself
npm run viewport       # the graph camera gate
npm run check          # promote + generate + test:assemble + validate + check:skills + build + smoke + viewport + test:pages
npm run test:pages     # the page acceptance suites (explicit file list)
```

The CPPP pipeline is Python and offline: `scripts/cppp/README.md` has the rebuild command and the tests.
CI does not install duckdb or pyarrow; the seven JSON files it writes are committed and compiled in.

`npm run smoke` serves `dist` on an ephemeral port itself — there is no preview server to start or
wait on. Pass a base URL as the first argument to point it somewhere else. It uses the environment's
pinned Chromium; override with `PLAYWRIGHT_CHROMIUM_PATH`, or `npx playwright install chromium`.

All four page suites (energy, welfare, tenders national, finance) are in `test:pages`; each
joined only after three consecutive green runs on a pinned build. The `/security` suite is not in
`test:pages` and joins on the same rule. See [`HANDOFF.md`](HANDOFF.md).

### Stack

React 18 · TypeScript · Vite 6 · Tailwind CSS v4 · d3-force · hand-written SVG cartography.
No map SDK, no external runtime dependencies, no network calls at runtime. Fonts are progressive
enhancement — every family has a system fallback, so the platform renders correctly offline.

---

## What this platform will not do

- Assert that any named person committed an offence.
- Publish a private individual's details, or any allegation about a person with no public role.
- Link entities on name similarity.
- Render a pattern as a finding without its denominator, its innocent reading, and its kill condition.
- Present a self-declared affidavit figure as an audited one, or an asset trajectory without its peer
  baseline.
- Draw an edge between a minister and a company on the basis of shared state or shared sector.
  Co-location is context; it is never a relationship.

---

## Standing

This platform maps public records and published claims about the conduct of public offices, and is a
matter of legitimate public interest. It asserts no guilt. Allegations are identified as allegations,
attributed, and paired with the response of those they concern. No node adjudicates a quid pro quo.

The **documented void** — the largest beneficiaries in the case-study graph carrying no traceable
political donations at all — is rendered as loudly as any flow. A graph that can only show what exists
systematically overstates the case.

## Licence

MIT.
