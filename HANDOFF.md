# Hand-off — India Corporate Intelligence Platform

*You are picking this project up cold. Read this file, then `docs/INDEX.md`, then start.*

---

## What this is

A map of India's listed corporate landscape joined to a **provenance-bearing
knowledge graph** of political and ownership connections. Every claim carries an
evidence tier; every pattern carries its denominator. The platform is as interested
in what it cannot show as in what it can.

It is a React + TypeScript + Vite single-page app with no runtime dependencies, no
backend, and no network calls. All data is compiled in. `npm install && npm run dev`.

## Why it is built the way it is

Two projects merged. **ICIP** had breadth — every NSE/BSE company, every state — and
no evidence discipline, which produces the exact artefact this project exists to
avoid: a dense, alarming-looking web whose edges are near-universal and therefore
measure nothing. **The Money-Trail Atlas** had depth — every edge a sourced claim
with a tier — and kept hitting one wall: *is this edge unusual?* It could not
answer, because it had no population to compare against.

The Atlas supplies the epistemics. ICIP supplies the population. The Atlas's four
invariants became the graph schema, enforced in CI; ICIP's company dataset became
the reference class that gives Atlas claims their denominators.

---

## The four invariants — do not weaken these

Enforced by `npm run validate` and `npm run promote`, which CI runs. They are build
steps, not conventions.

1. **Provenance.** Every edge carries `srcs`, **or** is tier `alleged`/`analytic`.
   Never invent a source, figure, date, quote, ticker or CIN. If you cannot verify
   it, `null` it and record the gap.
2. **Resolution.** One real-world entity, one canonical node, aliases on the node.
   Identity is confirmed by DIN, constituency, office-with-dates or DOB — **never**
   by name match. A node with `resolved: false` may not be an endpoint of any edge.
3. **Supersession.** When a fact changes, the old claim is retained and stays
   addressable. Nothing is ever deleted from the graph.
4. **Contradiction.** Denials are first-class `contra` edges, rendered as
   prominently as the claims they answer.

## What this platform will not do

- Assert that any named person committed an offence.
- Publish a private individual's details, or an allegation about a person with no
  public role.
- Link entities on name similarity.
- Render a pattern as a finding without its denominator, its innocent reading, and
  its kill condition.
- Present a self-declared affidavit figure as audited, or an asset trajectory
  without its peer baseline.
- Draw an edge between a minister and a company on the basis of shared state or
  shared sector. Co-location is context; it is never a relationship.

If a request would require breaking one of these, say so and propose the nearest
thing that does not.

---

## State of play

**Shipped and tested.** 34 routes, all rendering clean under a headless smoke test
that visits every route (52 URLs), several with URL parameters. The 34th is `/security`
(Phase H, below), added as a scaffold in `0073a0f`. 36-state boundary geometry with pole-of-inaccessibility label
anchors. A choropleth map, a geographic network, a force-directed graph with ego
focus, a path finder and a table twin, a layered flow diagram, a computed motif
engine, and two ingestion pipelines with reproducible run ids. 259 companies, 69
ministers, 10 conglomerate groups. The Money-Trail Atlas: 59 nodes, 111 edges.

**The research fleets** (generator 1.4.1; the first five as of 2026-09-26, `force` as of
2026-10-04, its audit as of 2026-10-06):

| fleet | module | run | nodes | edges | verdicts | killed |
|---|---|---|---|---|---|---|
| energy | `src/graph/energy.generated.ts` | `run-ac2b087e866e` | 404 | 711 | 60 (22 refuted) | 1 |
| welfare | `src/data/welfare.generated.ts` | `run-e3cc0f891306` | 286 | 335 | 35 (15 refuted) | 4 |
| finance | `src/graph/finance.generated.ts` | `run-e10a8edef94a` | 353 | 1,168 | 84 (40 refuted) | 6 |
| ngo | `src/graph/ngo.generated.ts` | `run-169c3129a1ec` | 138 | 292 | 142 (63 refuted) | 14 |
| capital | `src/graph/capital.generated.ts` | `run-916d30d537ff` | 133 | 221 | 61 (19 refuted) | 15 |
| force | `src/graph/force.generated.ts` | `run-122278453551` | 266 | 394 | 214 (47 refuted) | 22 |

Energy edges: 310 documented, 304 reported, 42 alleged, 55 analytic; 12 domain
files; 29 id mappings and 22 refused merges. Welfare: 78 schemes, 105 elections, 70
coverage declarations; 163 documented, 93 reported, 14 alleged (each answered), 65
analytic (each with an innocent reading); 7 domain files; 18 mappings and 23 refused
merges. Killed claims are kept in `META.killed` with their reasons. Nothing was
deleted.

Phase G (2026-09-26) added the three foreign-money fleets. Finance: 1,077 documented,
54 reported, 9 alleged, 28 analytic; 945 loan facts with terms; the World Bank census of
1,117 India projects and 849 commitments fetched by `scripts/finance/fetch-worldbank.mjs`
and kept beside the hand-researched loans, never summed (15 hand loans are marked as
already in the census, 6 as not countable). NGO: 95 documented, 128 reported, 51 alleged
(each with its answer; the fixed contra wording for an unanswered allegation is
`No response recorded — asked/not asked unknown`), 18 analytic; 102 FCRA state-year rows.
Capital: 153 documented, 34 reported, 12 alleged, 22 analytic; 96 holdings across 38 of
the 50 NIFTY constituents read, with 19 comparison holders that render whenever a named
holder does. Cross-fleet survivors: `pol:shivraj-singh-chouhan`, `party:inc`,
`wel:manmohan-singh`, `co:larsen-toubro`, `ngo:open-society-foundations`; seven High Court
nodes added to the Atlas; `rss` retyped party → sangh with a supersession note.

**The national tender record.** `scripts/cppp/` (Python, offline, not in CI) reduces the
4,921,960-row CPPP award scrape to 3,385,233 award decisions by a stated dedup rule and
writes six aggregate JSON files to `research/raw/cppp/` (a seventh, `security.json`, since
Phase H) — quality first, then rates over
declared denominators (single bidding 11.22 % [11.19, 11.26] of 3,019,420; central 17.67 %,
state 7.59 %), timing (median 68 days closing → award; 2.04 % within two days),
concentration (HHI by buyer, at most five marked winners named), red flags, and a seeded
40-row live verification of which **all 40 pages were gone**, so every field stays
`reported`. Rebuilds are byte-identical and the tests assert it. No award row and no
unmarked name is committed.

**Index membership.** NIFTY 50: 50 of 50. SENSEX 30: 30 of 30. SENSEX 50: 49 of 50 —
the fiftieth could not be confirmed from two independent captures and is a recorded
gap. Membership joins by company id, never by name.

**Two new pages.** `/energy` (the power map) and `/welfare` (distribution funds,
2000–2026), each built to a judged spec against a RED acceptance suite written
without sight of the implementation. `/energy`: 67 of 67 criteria pass, on three
consecutive runs; its five serious WCAG findings are fixed. `/welfare`: at its
commit 65 of 85 passed and 5 failed on criteria the build showed to be wrong; after
the corrections 70 of 85 pass, 0 fail and 15 skip (9 scaffold criteria, which pass on
the EMPTY build; 6 share-of-budget criteria skipped as a documented data void). Its
three serious WCAG findings (keyboard reach inside the table twins; the map's
`role="img"`) and M1–M4 are fixed; the map is now a `role="listbox"` of state
options, and the spec and criteria record that supersession. `test:pages` is in
`check` and CI.

**Phase G pages.** `/finance` ("Foreign money": loans, associations and capital as three
lenses on one route; judged from two candidate designs, 47 decisions, 110 criteria written
blind) and the national section of `/tenders` (`?section=national`, 86 criteria, WCAG audit
0 critical / 0 serious / 8 moderate, M1–M8 fixed / 13 minor). The tenders section: Verified 84 pass / 0 fail / 2 skipped ("not in this data") of 86 on three consecutive runs against a pinned build after the adjudication (15 criterion defects, 1 page defect, 2 both); in `test:pages` and CI since `9c03db7`. The finance page: First pass 82 / 27 / 1 of 110; adjudication found 24 criterion defects, 2 both (AC-79 placeholder responses headed "Response from", AC-94 the flow's 606 ribbon tab stops), 1 environment (Chromium's own favicon re-fetch), plus AC-20's quotation rule widened to source titles and property statements; verified 109 pass / 0 fail / 1 skipped (AC-38, no zero-amount loan exists) on three consecutive runs against a pinned build, with WCAG S1, S2 and M1–M6 fixed and re-measured; in `test:pages` and CI.
Both suites are in `test:pages` (explicit file list — Node 20 does not expand a glob),
each after three consecutive green runs on a pinned build.

**Phase H (2026-10-04 to 2026-10-06): the money India spends on force.** One research
fleet, one CPPP slice, one page. Spec `docs/superpowers/specs/2026-10-04-force-finance-design.md`;
ten-task plan `docs/superpowers/plans/2026-10-04-force-finance.md`. 23 commits from `447e854` to `7564bab`
(`git log --oneline 447e854..7564bab`); the build's commits and these documents come after them.
Everything except the page build is committed.

- **The `force` fleet.** Eight domain files in `research/raw/force/` — union-defence,
  union-home, state-police, procurement-industry, footprint, money-people, pay-pensions,
  literature — with `AUDIT.json` and `RECONCILIATION.json`, assembled as `run-122278453551`
  into `src/graph/force.generated.ts`. `FORCE_META.counts`: 359 claims in, 266 nodes, 394
  edges, 22 killed, 0 excluded, 57 contras added, 13 benefits, 67 voids, 46 narratives, 307
  base rates. Edges by tier, counted over `FORCE_EDGES`: 187 documented, 82 reported, 79
  analytic, 46 alleged. The 22 killed are held, not deleted (`FORCE_META.killed`): 21
  duplicates — 16 minister-tenure edges in money-people, `pay-pensions:c027` and four
  literature claims — and `footprint:c014` on its own `killIf`. `AUDIT.json` holds 214
  cross-examiner verdicts, 47 refuted. `RECONCILIATION.json → auditCorrections` records an
  outcome for all 214: 196 applied, 15 refused, 3 deferred, each with its reason. 7 id
  mappings; 34 refused merges.
- **Three tabular series.** New in Phase H (`6a99f11`): `BUDGET_KEYS`, `STRENGTH_KEYS` and
  `FOOTPRINT_KEYS` in `scripts/lib/vocab.mjs`, emitted as `FORCE_BUDGETS`, `FORCE_STRENGTH`
  and `FORCE_FOOTPRINT`. `FORCE_META.series`: 4,097 budget rows, 142 strength rows, 228
  footprint rows. The Union defence budget rows run FY2000-01 to FY2026-27 and the Union home
  rows FY1999-00 to FY2026-27 (`union-defence.json`, `union-home.json`).
- **The CPPP security slice.** `research/raw/cppp/security.json`, written by
  `scripts/cppp/security.py` inside the same `build.py` run as the six sibling files
  (`1e37783`). 558,291 raw rows (11.34 % of the file) become 411,943 award decisions after the
  dedup rule, in eight buyer classes. Single bidding: 3.17 % [3.11, 3.22] of 365,600, against
  11.22 % for the whole file. That is a works rate. MES alone is 74.41 % of the slice's award
  decisions, and the works class single-bids at 0.42 %. Without works the slice reads 12.20 %
  [11.98, 12.42] of 85,108. By class: stores 12.87 %, research 18.49 %, dpsu 11.33 %, capf
  9.53 %, intelligence-investigation 10.11 % (of 178), state-police 8.11 % (same portal
  7.59 %), other-security 37.83 % (of 304). Defence capital acquisition and GeM are not on
  CPPP; the file's first field says so. Every figure is dataset-only: in the live sample all 40
  stored links returned the portal's invalid-URL page (`security.json → caveat`). Naming follows `concentration.json`'s marked-winner rule,
  unchanged; red flags count pairs and never list them.
- **`/tenders` joins it.** The national section carries one "security buyers" line beside the
  whole-file rates, linking to `/security?lens=procurement`
  (`src/components/tenders/SecurityBuyers.tsx`; `loadSecurity()` in `src/data/cppp.ts`;
  `76c0c35`). `/network` gains no force layer: its layers are cut by entity family, not by
  fleet (plan, Task 8).
- **The page, designed.** Two candidates (graphic-first, question-first), a judgement and
  the judged spec (`docs/design/SECURITY_PAGE.candidate-{A,B}.md`, `SECURITY_JUDGEMENT.md`,
  `SECURITY_PAGE.md`). A synthetic five-seat UX review (`SECURITY_UX_REVIEW.md`): 33
  must-level amendments, U1–U33, applied in place; 46 deferred, UD1–UD46; one new decision,
  D61. 152 acceptance criteria, AC-1 to AC-152 (`SECURITY_ACCEPTANCE.md`). The RED suite,
  `scripts/pages/security.test.mjs`, written blind: 152 of 152 fail against the scaffold, each
  on a missing element, none on a test error (`2f922b2`). The route scaffold: lazy route,
  "Security spend" under Registers, three smoke URLs (`0073a0f`). The builder's plan:
  `docs/superpowers/plans/2026-10-04-security-page.md`.
- **The page, built.** `src/pages/Security.tsx`, ten files in `src/components/security/`
  and `src/data/securityView.ts` (checkpoints `878edcd`, `c5eb5f1`). The data layer's
  derivations have 19 tests of their own, `scripts/security-view.test.mjs` (`npm run
  test:security-view`, in `check` after `test:assemble`). `loadSecurity()` reads the slim
  slice file `research/raw/cppp/security-page.json` (`f9e8656`), and `security.json` is out of
  the glob, so no chunk carries a winner list. The data-layer audit's majors and the caucus's
  54 findings (26 by consensus) were fixed; the suite then stood at 143, 142 and 139 of 153 on
  three pinned builds (`836e841`). Two judges per failure, spec fidelity and reader harm,
  classed each as a page, test or criterion defect; amended criteria carry `[Adjudicated
  2026-10-07]` marks in `SECURITY_ACCEPTANCE.md` (`5cfff34`; `a0d3156`, 152 of 153 on three
  runs). At 390 px Procurement folds each case pair whole, claim and response together (AC-65
  amended), from 31,965 px to 18,098 px (`81c970c`). The lead then decided AC-134 for
  Procurement only: its 10,128 px last-heading ceiling cannot be met by the content the spec
  keeps open (11,327 px measured), so the lens gains an `On this lens` jump list within its
  first 844 px (AC-134a), per-block allowances for what stays open, and a 19,000 px regression
  cap on P6's heading (measured 18,432 px); Budgets and Footprint keep every ceiling. Result:
  153 of 153 (the 152 criteria and the §0.6 keyed-hooks check) on three independent pinned
  runs of 46 to 49 minutes each, and the suite joined `test:pages`, so CI runs it. WCAG 2.1 AA
  (`docs/design/SECURITY_A11Y.md`): 0 critical, 4 serious, 7 moderate, 12 minor; S1–S4 and
  M1–M7 fixed, minors m2, m4, m5, m7, m8, m9, m10 and m12 fixed, m3 in part, m1, m6 and m11
  not.
- **Skill and agent.** `.claude/skills/force-money-trail/` (`SKILL.md`, `references/ledger.md`,
  `narratives.md`, `tables.md`) is generated. `scripts/skills/force-money-trail/gen.mjs` fills
  four templates (`*.src.md`) from the raw files, `FORCE_META` and `security.json`, stops on
  any placeholder that does not resolve, and is byte-identical on a re-run. `npm run
  check:skills` regenerates it and fails on any difference; it runs in `check` and in CI after
  `validate` (`67f27ab`). `.claude/agents/security-analyst.md` owns the fleet, the slice
  (shared with `procurement-analyst`) and the page's data layer. Six pressure testers: two
  held, four held in part; 54 gaps found, 51 closed, 3 closed in part (`4a6e079`).
- **Documents.** `docs/research/force/` (the fleet contract addendum, brief and reconnaissance);
  `docs/research/FORCE_LITERATURE.md`, the literature by question; the Phase H sweep in
  `docs/research/DATA_SOURCES.md` (8,751 references, 746 distinct URLs, 137 hosts); the Phase H
  entry in `docs/PLUGINS.md` (`3a7ff00`).

**Three older results worth knowing before you start**, because they still shape
what is worth doing next:

1. **The motif engine reports that most of its templates are untestable.** The
   case-study subgraph is star-shaped — nearly every award edge shares one ministry
   as its source — so a degree-preserving swap between two award edges returns the
   same edge set. The null model has zero variance and any z-score against it is
   meaningless. The engine says `degenerate-null` rather than printing `z = 0.00`.
   **Fixing this needs the full award population, not a better algorithm.**
2. **Interlocks came back zero.** No name in the dataset holds two roles, because
   the data is each group's declared key people, not a directorship register. The
   page says which of those two things the zero means, and pivots to the frame the
   data does support — family control span across separately listed entities.
3. **The false-positive demonstration is the most important thing on the platform.**
   A naive surname matcher would draw 7 minister-to-office-holder edges from this
   dataset. The comparison family is 69 × 55 = 3,795 pairs; at a conservative
   1-in-200 shared-surname rate, chance predicts ~19. We found 7 — *fewer* than
   chance. There is no excess to explain.

### What the fleets found about "who benefits"

- **Almost every "who benefits" lens over-fires on incumbency.** "Donor wins the
  coal block", "law written for the vendor", "audit, then reprisal, then a favoured
  champion" — each shows the same shape under the other party, or in states run by
  other parties. What discriminates is **process**: auction against discretion,
  auditor and court findings, bid counts, margins.
- **Khavda land is the one asymmetric energy case.** About 61% of the park to one
  group after 2023 with no recorded bidding — but the files disagree on its size
  (≈61% of 72,600 ha against ≈38% of the five named developer zones). The
  disagreement is carried, not resolved.
- **Pre-election launch timing is symmetric.** The same lens run on the UPA and the
  NDA returns the same pattern, with opposite electoral results. Timing does not
  discriminate between parties and is a poor predictor of outcomes.
- **The lead's own denominator was wrong.** Coal single-bid allocations are 11 of
  91 mines to Nov 2023, not 11 of 140. Recorded in the energy-money-trail skill.
- **Every actor-selecting lens over foreign money produced an equally alarming picture
  on its control.** "BlackRock owns India" becomes "Norway, Singapore and LIC own India"
  on the same filings (BlackRock's ETF aggregates in NIFTY 50 companies: 0.49–1.78 %).
  "The Rothschilds run Indian banking" is one adviser among several on DIPAM mandates,
  fees undisclosed for all. Neither is an edge; both sit on the narratives ladder with
  their strongest counter. Recorded in the foreign-money-trail skill.
- **The state-share lens over World Bank loans shows no party alignment**; the
  distribution follows population and project pipeline.
- **The FCRA record is symmetric where it is loudest.** Retrospective amendments by BJP
  and Congress governments are recorded identically; the ₹905 crore misreading collapses
  on its own table; the "USAID $21 m for turnout" claim was killed as an edge.
- **The tender dataset's defects are larger than any pattern in it.** Forty-one per
  cent of rows share a tender id; the dedup rule moves the single-bidder rate from
  13.2 % to 11.22 %, which is why every rate prints its rule and its family.
- **The security slice's single-bid rate is a works rate.** The slice reads 3.17 % against
  11.22 % for the file. Most of it is MES and BRO, whose works tenders draw many local
  contractors (0.42 %). The headquarters stores buyers read 12.87 %; a proprietary spare
  draws one bid by procedure. DRDO reads 18.49 %; few vendors qualify for laboratory items.
  Every class sits beside the whole file (`research/raw/cppp/security.json → headline`), with
  its own innocent reading (`→ classes`).
- **No city police budget is published except Delhi's, and it is a Union demand.** Every
  other commissionerate's money sits inside its state's Police head (MH 2055). The fleet
  records that as a void with each state's figure (`state-police.json → voids[1]`). The judged
  spec allows a non-Delhi city budget cell one fixed sentence, never a number (`SECURITY_PAGE.md`, D17).

### What the build learned about itself

- **The WebSearch session cap is 200 and it ran out mid-fleet.** Several agents
  record `200/200` and fell back to direct fetches of known URLs; several denials
  are "none found" partly because of it. A "none found" in those files is weaker
  than it reads.
- **A per-workflow concurrency cap on agents** — two at a time in this session —
  made the fleets slower than their plans assumed. This is an observation from the
  session, not recorded in any repository file.
- **A tier used as a predicate.** Agents wrote a tier into `pred`. The assembler
  now excludes such a claim with its reason and never coerces it; `analytic` is the
  one word that is legitimately both.
- **Free-text endpoints.** "State officials" and "Adani group" as `s`/`t`. Welfare
  replaced them with declared beneficiary-class nodes.
- **Month-only dates.** A researcher who knows only the month must not invent a
  day. The contract and `vocab.mjs` now accept ISO 8601 at reduced precision.
- **Roster entities joined by symbol, never by name.** The graph builder had minted a
  second node for 34 of the 64 conglomerate roster entities (`co:lt` beside
  `co:larsen-toubro`); they now resolve to the companies dataset by NSE symbol, then
  BSE code, and the national graph lost 31 nodes and 45 edges that were duplicates.
- **Name-similar merges refused.** 45 across the two fleets — Reliance Industries
  against Reliance Power/ADAG, JSPL against JSW, Ladli Laxmi 2007 against Ladli
  Behna 2023, five distinct Reddys — each with its reason in `RECONCILIATION.json`.
- **Acceptance criteria can be wrong.** Six `/energy` criteria were defective, not
  the page. The criteria document is amended where the criterion was wrong; the
  test was not bent to pass.
- **A fetcher's output is not a research file.** Hand fixes to
  `worldbank-projects.json` were ported into the fetcher's tables and proven by a
  byte-identical re-fetch; a reconciliation that had merged hand facts into it was
  undone and the facts moved to `adb-aiib.json`.
- **Byte-identical is a gate.** Two CPPP rebuilds differed on parallel float sums and
  a runtime field; a single thread and paise rounding fixed it, and the test asserts it.
- **Check exit strings, not exit codes, in a gate chain.** One commit landed with a red
  gate because a `grep` pipeline masked the failure; the gates now assert on the
  `generate: OK` / `validate: OK` lines.
- **The Phase G audits predate their reconciliations.** A verdict's claim id may have
  moved; the assembler applies the mapping before the verdict.

Phase H added four rules, each because it bit (`.claude/skills/force-money-trail/references/tables.md` §9):

- **Supersede, never edit.** A changed fact is a new claim, and the old one gets
  `supersededBy`: `pay-pensions:c014` → `c015`, `union-home:c026` → `c027`,
  `procurement-industry:c050` → `c051` and `c052` → `c053`, `union-defence:c016` → `c047`,
  `money-people:c024` → `c095`. The audit's reason for the last: an undated rule number
  presented a superseded rule as current law. The same holds for killed copies: edit the
  survivor, never the held copy. Fourteen money-people corrections were refused for that
  reason.
- **`cr` ≥ 0.** `scripts/lib/vocab.mjs` rejects a budget row whose `cr` is not a number ≥ 0.
  The Ordnance Factories demand printed negative nets in several years. They are kept as a
  void with every value listed (`union-defence.json → voids[3]`), never forced into a row and
  never zeroed.
- **Chunked emission above 1,000 rows.** TypeScript gave up on one array literal at 4,096
  budget rows (TS2590). The assembler now emits any series above `CHUNK_ROWS = 1000` as
  unexported chunks (`FORCE_BUDGETS_0` to `_4`) that the export spreads; below the threshold
  the output is unchanged, so the five older modules stay byte-identical. `validate.mjs`
  reads the chunks back. Never hand-join them.
- **City money only for Delhi Police.** `npm run validate` accepts a city budget row, so the
  check is the author's. Delhi Police is the one city budget line, a Union demand; every other
  city's money is inside its state's Police head (`state-police.json → voids[1]`).

---

## Where to pick up

### Parallel branches (as of 2026-10-07)

Another agent works on `codex/education-funding-intelligence`. It forked from this branch at
`76c0c35` and adds the education, water and food, and public-works pages; `gh-pages` is a deploy of
its head. `master` has not moved since `9a5dc18`, and `main` is an older ancestor of this branch.
Neither line of work pushes to the other's branches. A dry merge (`git merge-tree --write-tree
HEAD origin/codex/education-funding-intelligence`) conflicts in two files only, `package.json` and
`.github/workflows/ci.yml`: both sides added scripts and CI steps, so keep both lists. `README.md`
and `docs/INDEX.md` changed on both sides as well and need the same union. That branch also
reworks `src/components/Layout.tsx` and `src/index.css`, so after any merge re-run
`scripts/pages/security.test.mjs` (its 390 px and navigation checks read the shared chrome) and the
other page suites. Which branch merges first is the owner's call.


### Phase H — open, in order

1. **A credential was exposed in a session transcript.** The owner must revoke it. Nothing
   in the repository depends on it.
2. **G5: split `force.generated.ts`.** The judged spec makes it a build prerequisite
   (`SECURITY_PAGE.md` §3, G5): a graph part (`FORCE_NODES`, `FORCE_EDGES`) for the entry and
   a page part for the `/security` chunk. It was not done. `DataContext` imports the module, so
   the three series and every page-only export still ride in the entry chunk on every route:
   13.19 MB raw, 2.84 MB gzipped (Vite) in the 2026-10-08 build. SG-50, which would fail on a string
   unique to the series in the entry, is not promoted to the suite (`SECURITY_ACCEPTANCE.md`
   preamble, "not promoted"). The split belongs in the generator, after which `securityView.ts`
   imports the page part.
3. **Deferred UX amendments UD1–UD46**, at the end of `docs/design/SECURITY_PAGE.md` under
   "Deferred amendments". Synthetic; test with real readers first. UD1 (every stage in the
   readout, so BE is not read as spend) is first in line; it adds a page-computed ratio that
   needs an allow-list entry before it is built (`SECURITY_UX_REVIEW.md` §4, §7.2).
4. **The `/security` WCAG findings not fixed** (`docs/design/SECURITY_A11Y.md`): m1, 80
   controls whose name does not contain their visible label, which the suite pins (AC-107 and
   the per-person check), so it needs a criterion decision first; m6, a site finding (two
   `<h1>`, no skip link, a constant title, unnamed sidebar icons); m11, advisory, 457 Tab stops
   on the Procurement lens at 1440; and m3 in part, the graph's jump-to input in the shared
   `GraphExplorer`, which this page does not modify (D45). M7's forced-colours fix was not
   re-measured in an emulated `forced-colors` context.
5. **The as-of filter on the DAC awards** (Task 8 of the Phase H plan, its one unticked box).
   `/security` mounts the shared `GraphExplorer`, whose as-of cut applies to the force graph's
   dated award edges, but no criterion exercises it on the DAC awards; tick the box once one
   does.
6. **Three deferred audit corrections** (`RECONCILIATION.json → auditCorrections`,
   `outcome: deferred`): `literature:c007` needs a split into two new claim ids and its
   ruling re-pointed; `literature:c014` is held killed and its corrections
   belong on its survivor, `money-people:c089`; `literature:c028` is held killed, its
   corrections are realised on `money-people:c086` and `c087`, and its tier raise was not taken.
7. **The force voids.** 67 in `FORCE_VOIDS`, each with where the record would live. The
   widest: BPR&D's *Data on Police Organisations*, the one national table of state and
   commissionerate strength and police spend, was unreachable on 2026-10-04
   (`state-police.json → voids[0]`). The 90 strength rows in `state-police.json` derive
   their absolute counts from per-lakh ratios and say so in `note`.

### Highest value, in order

1. **Full award population.** Every coal and mining award 2019–24 against every
   donor, with a date-shuffled control holding donation volume fixed. This is the
   one piece of work that unblocks the motif engine, settles the quid-pro-quo
   question in *both* directions, and is computable from public data today. Nobody
   has published it. The fleets confirm the gap: **per-block bidder counts are not
   published**; the Ministry publishes only single-bid allocations.
2. **Coal India and mining-PSU CSR destinations 2019–24.** Still open. The fleet
   found no itemised destination list: the MoC annual report's PSU chapter is an
   image-only PDF and CIL's CSR table renders client-side. The annexures are the
   record.
3. **The voids the fleets could not fill**, each with where the record would live
   in the fleet's `voids` array:
   - ICIJ Offshore Leaks entries for Vinod Adani — the database returned nothing
     readable through the proxy.
   - PM CARES after FY2022-23 — no audited statement for FY2023-24 or FY2024-25 as
     at 25 Sep 2026, and no CAG audit exists.
   - Bank-wise DBT share, float and fee income — the largest intermediary in the
     DBT flow, with no split published for SBI, Bank of Baroda or the RRBs.
   - Lokniti-CSDS cross-tabs by beneficiary status — booth- or constituency-level
     beneficiary density against vote change is absent for every scheme but one.
4. **DIN-keyed directorships.** The only reliable join key for Indian directorships.
   Until every person node carries one, every interlock claim is provisional.
5. **Companies to ~600.** Nine large recent listings were deliberately omitted
   rather than risk a fabricated ticker — see `research/raw/companies-by-state.json`
   gaps.
6. **World Bank Major Contract Awards (catalog 0037796).** The join from loans to
   contractors; the API rate-limited (429) during Phase G and only the hand-researched
   contracts landed. A scripted fetch would complete the loans lens.
7. **FCRA at source.** `fcraonline.nic.in` and the MHA common-content pages were
   unreachable from the sandbox; every FCRA figure is routed through Parliament
   answers, MHA annual reports and PIB. A direct pull would let receipts move from
   `reported` to `documented`.
8. **The other 12 NIFTY constituents' shareholding** (`CAPITAL_COVERAGE` lists which
   were not read) and the tender-notice side of the CPPP data (bid windows,
   `ghalibluvr/tender_dbs_parquet`), which would let single bidding be read against
   notice period.

**Last full `npm run check`:** green at `b09ca5b` + docs (2026-09-27): promote, generate (five modules, byte-identical), 55 assembler tests, validate (30 declared warnings: 29 court rulings modelled as `enforce` in the frozen fleets, SENSEX 50 at 49 of 50), build, smoke over 49 URLs, viewport (with the explorer's jump-to / as-of / why-drawn checks), page suites 330 pass / 0 fail / 18 skipped of 348 (energy 67, welfare 85, tenders national 86, finance 110). `docs/BUNDLE.md` describes the snapshot cut from that tree.
That check predates Phase H. `check` now also runs `check:skills` after `validate`, and
`generate` writes six modules. The next full check records Phase H with the page.
[/security build status: pending — filled when the build stage reports]

### Queued work

- **`/welfare` leftovers.** WCAG M5–M7 and the minor findings in
  `docs/design/WELFARE_A11Y.md`; the one share-of-state-budget figure in the register
  (Karnataka guarantees, fy `2023-24 (Jul–Mar)`) is rejected by `normaliseFy` for its
  suffix, so the money-year twin reads 0 everywhere — decide whether a part-year figure
  is painted as partial or left out.
- **Renderer follow-ups.** The canvas renderer shipped (Canvas 2D, d3-force in a
  worker, `GraphA11y` overlay; layout digests identical to the SVG build; /network
  settle 3.5 s → 2.0 s with 0 long tasks; a 1,500-node graph 14.3 s → 3.7 s). Still
  open, listed in the "Not done" table of
  `docs/superpowers/plans/2026-09-26-canvas-renderer.md`: the §5.5 lit-edge contrast
  decision (a lit claim measures 1.46:1; reaching 3:1 needs base alpha ≈ 0.69 and
  changes every edge in both renderers), `graphSemantics.ts` and a shared
  `contraWidth`, pinch zoom and `flyTo` in `camera.tsx`, a `graph-perf.mjs` gate,
  the §6 explorer additions. Hover cost rose (24 px targets hit on most moves →
  repaint), 9.3 ms/move at 1,500 nodes against the 8 ms target.
- **Index follow-ups.** The fiftieth SENSEX 50 constituent; MapExplorer's other
  filters into the URL (at `b24eb27` only `idx` lived there; an uncommitted change in
  the working tree moves the rest — check before starting); apply the announced NIFTY 50
  review only once it is membership.
- **Deferred UX amendments** — energy D1–D47 and welfare D1–D35, listed at the end
  of each page spec; `/security` UD1–UD46 (Phase H, above). Synthetic; test with real
  readers before building.
- **Atlas-vs-national duplicate ids.** `gadani` and `per:gautam-s-adani`; `joshi`
  and `pol:pralhad-joshi` (also `agarwal` and `per:anil-agarwal`). The fleets reused
  the Atlas ids as the contract says. Merging them is a repository-level decision
  for `src/graph/data.ts`, and it must keep the old ids addressable.
- **Phase G leftovers.** 29 court rulings in the frozen energy, welfare and
  capital fleets are modelled as `enforce` without the `Judicial ruling on <claim id>:`
  prefix the validator now warns for. One West Bengal FCRA state row does not reconcile
  to its national figure and is declared. `docs/design/FINANCE_PAGE.md` §3.3 lists the
  generator prerequisites G1–G4 the page renders without and improves with. The
  explorer's as-of filter cannot dim an edgeless node (the frozen canvas has one per-node
  opacity channel), so such a node stays drawn at full opacity. Deferred UX
  amendments for both Phase G pages are listed at the end of their specs.

### Known gaps, stated plainly

- Promotion writes a report; it does not *generate* `src/data/*.ts` for the original
  datasets. `npm run generate` does generate the two fleet modules.
- Media ownership is thin and the page says so. It needs an RNI/MIB register.
- Base rates are published for six edge types in `baseRates.ts`; the fleets add
  their own (73 energy, 50 welfare), not yet joined to the engine.
- No time-resolved tenures on corporate roles, so no time-resolved interlocks.

### Do not

- Add a motif template without an innocent reading and a kill condition.
- Add an allegation without finding the denial first.
- "Fix" the untestable motifs by loosening the null model.
- Add a dependency to draw something that can be drawn with SVG and arithmetic.
- Hand-edit a `*.generated.ts` file. Change the research file, `RECONCILIATION.json`
  or `AUDIT.json`, and re-run `npm run generate`.
- Read a "none found" denial in a fleet file as proof of silence. Check whether the
  search budget was spent.
- Hand-edit `.claude/skills/force-money-trail/`. Change a template in
  `scripts/skills/force-money-trail/` or the raw files, and re-run its generator;
  `check:skills` fails on a hand edit.
- Print a city police budget other than Delhi's, name a person below the public rank, or
  name a CPPP winner outside `concentration.json`'s marked-winner rule. Party is text, never
  colour.

---

## Working on it

```bash
npm install
npm run dev            # vite dev server
npm run promote        # research/raw → resolution + grounding report
npm run generate       # research fleets → the six *.generated.ts modules (energy, finance, ngo, capital, force; welfare)
npm run test:assemble  # assembler and merge rules on a synthetic fixture (30 tests)
npm run validate       # the four invariants; §4 raw fleet files, §5 generated modules
npm run check:skills   # regenerate force-money-trail and fail on any difference from the committed copy
npm run build          # tsc -b && vite build
npm run smoke          # headless render of all 34 routes (52 URLs); serves dist itself
npm run viewport       # the graph camera gate
npm run check          # promote, generate, test:assemble, validate, check:skills, build, smoke, viewport, test:pages
npm run test:pages     # the page acceptance suites (explicit file list; in check and CI)
node scripts/skills/force-money-trail/gen.mjs   # rewrite the force-money-trail skill from the raw files, FORCE_META and security.json
npm run build && SECURITY_DIST=<pinned dist copy> node --test scripts/pages/security.test.mjs   # the /security suite; not in test:pages yet

# offline, Python 3.11 + duckdb + pyarrow; not in CI — see scripts/cppp/README.md
python3 scripts/cppp/build.py --arrow-dir <dir> --out research/raw/cppp --as-of 2026-09-26
#   the same run calls scripts/cppp/security.py and writes security.json, the seventh file;
#   security.py has no command line of its own (README, "The security slice")
node scripts/finance/fetch-worldbank.mjs   # re-fetch the World Bank census (byte-identical modulo runId)
```

`generate`, `test:assemble` and `test:pages` are in `check` and in CI. A page suite
joins `test:pages` only once green on three consecutive runs: a gate that is red for a
known reason teaches people to ignore it. Every suite pins its run to a copy of `dist`
(`ENERGY_DIST`, `WELFARE_DIST`, `FINANCE_DIST`, `TENDERS_DIST`, and `SECURITY_DIST` for the
`/security` suite) so a concurrent rebuild cannot poison it. In a gate chain assert on the
printed `OK` line, never on a piped exit code.

**The gates by exit string.** `promote: OK` (or `promote: FAILED`), `generate: OK`,
`validate: OK`, `smoke: OK`, `graph-viewport: OK`. `check:skills` prints no `OK` line: it
passes when the regenerated skill matches the committed copy and `git diff --exit-code`
prints nothing, and it fails by printing the diff. The page suites report through
`node --test`; in the welfare, tenders, finance and security suites a skip prints
`SKIPPED: <reason>` and is never a pass.

`npm run smoke` needs a Chromium. It uses the environment's pinned binary if one
exists; override with `PLAYWRIGHT_CHROMIUM_PATH`, or `npx playwright install chromium`.

### The agents

Fifteen are defined in `.claude/agents/`, each with a bounded job and an explicit
refusal. `cross-examiner` (one claim, one lens, default refuted) and
`energy-analyst` came with the first fleets; `finance-analyst` (foreign loans, FCRA,
foreign holders — refuses a family as an edge, a holder alone, a ₹ total over loans)
and `procurement-analyst` (owns `scripts/cppp/` — refuses an unmarked name or a rate
without its family) with Phase G; `security-analyst` with Phase H (owns `research/raw/force/`,
the CPPP security slice with `procurement-analyst`, and the `/security` data layer; refuses
operational detail, a person below the public rank or a private individual, and city money
that is not published). Use them — they encode the rules above so you do not have to re-derive
them. `evidence-auditor` and `base-rate-statistician` in particular exist to tell
you "no", and a COLLAPSES verdict from them is a successful output, not a setback.

### House voice

The pages are documents, not dashboards. Precise, non-sensational, and willing to
say what they do not know. Every page that shows a number shows its denominator.
Every page that shows a pattern shows the boring explanation that also fits. Read
`src/pages/Patterns.tsx` and `src/pages/Interlocks.tsx` before writing a new page —
they are the register to match.

---

## Standing

This platform maps public records and published claims about the conduct of public
offices, and is a matter of legitimate public interest. It asserts no guilt.
Allegations are identified as allegations, attributed, and paired with the response
of those they concern. No node adjudicates a quid pro quo.

The **documented void** — the largest beneficiaries in the case-study graph carrying
no traceable political donations at all — is rendered as loudly as any flow. A graph
that can only show what exists systematically overstates the case. Keep it that way.
