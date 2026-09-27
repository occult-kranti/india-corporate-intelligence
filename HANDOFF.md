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

**Shipped and tested.** 33 routes, all rendering clean under a headless smoke test
that visits every route (49 URLs), several with URL parameters. 36-state boundary geometry with pole-of-inaccessibility label
anchors. A choropleth map, a geographic network, a force-directed graph with ego
focus, a path finder and a table twin, a layered flow diagram, a computed motif
engine, and two ingestion pipelines with reproducible run ids. 259 companies, 69
ministers, 10 conglomerate groups. The Money-Trail Atlas: 59 nodes, 111 edges.

**The research fleets** (as of 2026-09-26, generator 1.4.1):

| fleet | module | run | nodes | edges | verdicts | killed |
|---|---|---|---|---|---|---|
| energy | `src/graph/energy.generated.ts` | `run-ac2b087e866e` | 404 | 711 | 60 (22 refuted) | 1 |
| welfare | `src/data/welfare.generated.ts` | `run-e3cc0f891306` | 286 | 335 | 35 (15 refuted) | 4 |
| finance | `src/graph/finance.generated.ts` | `run-e10a8edef94a` | 353 | 1,168 | 84 (40 refuted) | 6 |
| ngo | `src/graph/ngo.generated.ts` | `run-169c3129a1ec` | 138 | 292 | 142 (63 refuted) | 14 |
| capital | `src/graph/capital.generated.ts` | `run-916d30d537ff` | 133 | 221 | 61 (19 refuted) | 15 |

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
writes six aggregate JSON files to `research/raw/cppp/` — quality first, then rates over
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

---

## Where to pick up

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

**Last full `npm run check`:** green at `a9b9f35` + docs (2026-09-26): promote, generate, 30 assembler tests, validate (one declared warning), build, smoke over 46 URLs, viewport, page suites 137 pass / 0 fail / 15 skipped of 152. `docs/BUNDLE.md` describes the snapshot cut from that tree.

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
  of each page spec. Synthetic; test with real readers before building.
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

---

## Working on it

```bash
npm install
npm run dev            # vite dev server
npm run promote        # research/raw → resolution + grounding report
npm run generate       # research fleets → the five *.generated.ts modules (energy, finance, ngo, capital; welfare)
npm run test:assemble  # assembler and merge rules on a synthetic fixture (30 tests)
npm run validate       # the four invariants; §4 raw fleet files, §5 generated modules
npm run build          # tsc -b && vite build
npm run smoke          # headless render of all 33 routes (49 URLs); serves dist itself
npm run viewport       # the graph camera gate
npm run check          # promote, generate, test:assemble, validate, build, smoke, viewport
npm run test:pages     # the page acceptance suites (explicit file list; in check and CI)

# offline, Python 3.11 + duckdb + pyarrow; not in CI — see scripts/cppp/README.md
python3 scripts/cppp/build.py --arrow-dir <dir> --out research/raw/cppp --as-of 2026-09-26
node scripts/finance/fetch-worldbank.mjs   # re-fetch the World Bank census (byte-identical modulo runId)
```

`generate`, `test:assemble` and `test:pages` are in `check` and in CI. A page suite
joins `test:pages` only once green on three consecutive runs: a gate that is red for a
known reason teaches people to ignore it. Every suite pins its run to a copy of `dist`
(`ENERGY_DIST`, `WELFARE_DIST`, `FINANCE_DIST`, `TENDERS_DIST`) so a concurrent rebuild
cannot poison it. In a gate chain assert on the printed `OK` line, never on a piped exit
code.

`npm run smoke` needs a Chromium. It uses the environment's pinned binary if one
exists; override with `PLAYWRIGHT_CHROMIUM_PATH`, or `npx playwright install chromium`.

### The agents

Fourteen are defined in `.claude/agents/`, each with a bounded job and an explicit
refusal. `cross-examiner` (one claim, one lens, default refuted) and
`energy-analyst` came with the first fleets; `finance-analyst` (foreign loans, FCRA,
foreign holders — refuses a family as an edge, a holder alone, a ₹ total over loans)
and `procurement-analyst` (owns `scripts/cppp/` — refuses an unmarked name or a rate
without its family) with Phase G. Use them — they encode the rules above so you do not have to re-derive
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
