# /finance — "Foreign money" — candidate A (evidence-first)

*Status: candidate design A for the `/finance` design duel (Phase G, Task 7), written
2026-09-26. Angle: **evidence-first** — start from what the three generated modules can
honestly show (denominators, voids, tiers), design the tables and captions first, then
the graphics that summarise them. Binding brief: spec
`docs/superpowers/specs/2026-09-26-foreign-money-ngos-tenders-design.md` §4.7 and the
Review Focus of `docs/superpowers/plans/2026-09-26-foreign-money-ngos-tenders.md`.
House form: `docs/design/ENERGY_PAGE.md`, `docs/design/WELFARE_PAGE.md`,
`docs/design/TENDERS_NATIONAL.md`.*

*Data contracts, as assembled by `scripts/assemble-fleet.mjs` (generator 1.2.0):
`src/graph/finance.generated.ts` (run `run-989d2c6a4b16`), `src/graph/ngo.generated.ts`,
`src/graph/capital.generated.ts`, typed by `src/graph/fleet.ts` and `src/graph/schema.ts`;
`WELFARE_SCHEMES` and `WELFARE_ELECTIONS` from `src/data/welfare.generated.ts`; `NIFTY50`,
`INDICES_AS_OF`, `INDEX_CHANGES` and `indexCoverage()` from `src/data/indices.ts`.*

**No figure in this document is page copy.** Every figure the page prints is a `{brace}`
derived at module scope in `src/data/financeView.ts`, or in a `useMemo` keyed on the
parsed URL. The counts in §0.2 are the designer's reading of the modules on 2026-09-26.
They are here to justify decisions. None may be copied into a component.

---

## 0. What the data can honestly show

### 0.1 The angle

The brief asks for eleven graphics across three lenses. Before any of them, this draft
asked one question per graphic: *which export answers it, and what does that export
leave out?* Five of the eleven cannot be drawn honestly from the modules as generated
today, because the fact they need exists only as prose inside `d`, or only in the raw
research file behind the quarantine boundary. For each of those five, this spec does
three things:

1. It names a **reviewed generator change** (§0.3, G1–G5), in the same way that
   `ENERGY_EDGE_DOMAIN` and `WELFARE_COVERAGE` were added for the earlier pages.
2. It specifies the **interim state**: what the component draws without the change.
   Usually this is the table without the graphic, plus a gap line that says why.
3. It **never parses prose** to fill the hole. A percentage pulled by regex from a `d`
   that contains four percentages is a fabricated figure.

The tables are the primary form throughout. Each graphic is specified as a summary of a
named table, and its twin is that same table.

### 0.2 Facts about the modules that decide the design

Read from the generated modules and `research/raw/` on 2026-09-26. These are design
evidence, not page copy.

| # | Fact | Consequence for the design |
|---|---|---|
| F1 | Every World Bank loan leg in `FINANCE_EDGES` runs `fin:ibrd`/`fin:ida` → a borrower that is almost always `min:ministry-of-finance`. For 504 of 849 legs the API leaves the borrower blank and the Union is recorded **by default** (the `d` says so). | "Commitments by **borrowing** state" does not exist in this data: the Union borrows. The map encodes **placement**, meaning the state named by the implementing agency, a state-government borrower, or the project title. This is the fetcher's rule (`scripts/finance/fetch-worldbank.mjs`, `stateCode`). The map title says "placed in", never "borrowed by" (D3). |
| F2 | A node's `st` is its registered office. Union bodies are seated in Delhi, so a map built from `node.st` would paint Delhi with ~660 Union loans. The fetcher refuses to let a Delhi-seated Union body place a project in Delhi. | The page never places a loan from `node.st`. Placement comes from G1 only (D4). |
| F3 | Placement, sector, status, pipeline flag, US$ amount and fx rate exist only as prose in each leg's `d`, and as structured fields in the raw `projects` table of `research/raw/finance/worldbank-projects.json`, which the page may not import. | G1 exports them. Until G1 lands, the map and the census Sankey are not drawn (§5.1, interim states). |
| F4 | 339 of the 773 World Bank lending projects are placed in a state (30 distinct states). The rest are Union-wide or unplaceable. | "Not placed in any state" is a first-class row beside the map, at the same size as the largest state (D5). |
| F5 | 76 World Bank projects are blends, recorded as two legs (IBRD + IDA). 849 legs = 773 projects. | Counts say "projects" or "legs", never "loans" unqualified. The project is the counting unit for counts. The leg is the unit for ₹. |
| F6 | 12 loan edges in the `worldbank` and `literature` files repeat a World Bank project already counted in `worldbank-projects` (same P-number). None is marked superseded. They are the *richer* records: they carry conditions and prior actions. The AIIB CARES co-financing appears in two files with two ₹ figures. Three non-binding MoUs and one portfolio aggregate carry `terms.instrument` of that kind, and three of them carry an `a`. | **A naive ₹ sum over `pred === 'loan'` double-counts, and it counts MoUs as loans.** No ₹ total may be computed over non-census records until G1 carries `countable` and `countedAs` (D6). |
| F7 | The World Bank legs are a **census** (every India project in the API, 1,117 projects, of which 273 were dropped and 69 are grant-only). ADB, AIIB, JICA, NDB, AFD, US DFC and Chinese lenders are a **researched sample** (99 loan edges). | Census and sample are never summed into one figure or drawn in one Sankey. They are two small multiples, each with its own denominator (D7). |
| F8 | ₹ amounts are nominal, converted at the approval-year rate (`PA.NUS.FCRF`). Approvals span 1949–2027. Pre-1960 legs have a US$ amount and no ₹, and pipeline legs have no `a` by design. 53 loan edges carry no `a`. | Every ₹ figure reads "nominal ₹ at the approval-year rate". A loan without `a` prints "amount not stated / in US$ m" and is excluded from every ₹ total (Review Focus 1). The excluded count sits beside every total. |
| F9 | Role edges into `min:ministry-of-finance` mix Finance Ministers, DEA Secretaries and loan signatories. Their windows overlap, one window is open-ended from 1991, and no recorded Finance Minister covers 2008-11-30 → 2009-01-24. Two finance voids record that no loan document opened names a minister. | "Ministers at approval" becomes **office-holders whose recorded window covers the approval date**. Every covering window is listed verbatim. Open-ended windows are marked "end not recorded". The caption says "the date test, not a signature" (D12). |
| F10 | The only structured Union-budget facts are a handful of role edges whose `lab` mentions a budget speech. There is no budget calendar dataset. General elections: `WELFARE_ELECTIONS` has five `Lok Sabha` rows, 2004–2024. | The time lanes draw Lok Sabha elections from 2004 only, with the earlier span marked "not in this register". The budget row prints a void line and draws no marks (D13). |
| F11 | FCRA national totals: `grant` edges `ngo:foreign-sources-aggregate` → `ngo:fcra-associations-aggregate`. There are single-FY values for 10 of the 14 FYs from 2011-12 to 2024-25, three superseded alternatives, and one multi-year total. FY2012-13, 2013-14, 2022-23 and 2023-24 are missing (listed in `NGO_GAPS`). | The bar chart draws FY slots for the full span. The four missing FYs are **hatched and named**. A superseded figure is a tick with its own twin row. Multi-year totals never become bars (D15). |
| F12 | The FCRA **state-wise** table for FY2019-20 → 2021-22 (RS Unstarred Q.3253, Annexure I, 34 rows) was read by the fleet but recorded only as its column sums plus three states in prose and one base-rate row. | The state table is G4. Until it lands, the page prints the absence with the source link. No associations map is drawn (D16). |
| F13 | FCRA enforcement: 65 `enforce` edges from `min:ministry-of-home-affairs` or `ngo:mha-foreigners-division`. 55 name one of 26 associations and 10 are aggregate counts. The aggregates overlap (for example, 20,600 cancelled 2011→2021-02, and 21,983 cumulative). The kind of action (cancel, suspend, refuse renewal, prior permission) is prose in `lab`. 19 named actions have no response attached to that claim, and in 5 case files no response is attached to any claim. 43 of 44 responses are undated. A base-rate row puts the named cases at ~0.1% of all cancellations. | The timeline is one row per association (a "case file"). It never classifies the action kind: `lab` is printed verbatim. Aggregate counts are a separate table that is never summed. The exact no-response sentence prints per claim (Review Focus 4). The ~0.1% denominator is in the frame (D17–D19). |
| F14 | Welfare join: 4 edges touch a `scheme:` id, all `analytic`, covering 3 of the 78 schemes in `WELFARE_SCHEMES`. Further `pmout`/`award` edges to associations exist, but they carry no scheme id. | The welfare join is a table with the denominator "{k} of {N} register schemes". Analytic links are dashed and carry their innocent reading. Scheme-less payments are a second table (D20). |
| F15 | Holder percentages exist only as prose in `d`, and one `d` often carries several (a fund line, a combined figure and an FPI aggregate). 32 holders have a line into 34 of the 50 NIFTY constituents. Lines per mandatory-comparison holder: BlackRock 0, Fidelity 0, KIA 0, ADIA 0, Capital Group 1, Vanguard 6, NBIM 9, GIC 10, and LIC (the domestic control) 29. The comparison set is declared only in the capital SPEC and in base-rate labels. Recorded absences are node-fact prose. Per-company coverage (which filing was read) is not exported. | The matrix needs G3: structured %, the declared comparison set, and coverage. Interim: cells print "named ≥1% — % not structured", and the comparison set falls back to every holder with a recorded line, which excludes BlackRock. So until G3 lands, the matrix prints the "comparison set required" note in place of the grid (D22–D25). |
| F16 | One holder appears under two ids (`cap:temasek` and `cap:temasek-holdings`), and so do OSF (`ngo:` and `cap:`) and Manmohan Singh (`energy:` and `wel:`). | Rows are ids, and the page never merges on a name. The gaps panel states the rule. The pairs go to the reconciliation editor (§17). |
| F17 | Capital `law` edges (21) have **no** `CAPITAL_BENEFITS` row. Their cui-bono text is inside `d`. | The rules timeline prints "{k} of {n} rules carry a structured cui-bono row" and shows the `d` verbatim beside a "no structured row" marker (D27). |
| F18 | Narratives: 70 across the three fleets. The same narrative recurs across files, sometimes with different ratings (for example, a Rothschild-banking claim rated `unsupported` in one file and `debunked` in another). | The ladder lists narratives as recorded, with their file, and the caption says ratings across files are not reconciled. It never de-duplicates by text (D28). |
| F19 | `GraphExplorer` owns the URL params `tier fam pred ty q amt from to sel focus hops path`. 31 edge endpoints (`co:` companies) resolve only through the merged graph from `useData()`. | The page's own params avoid those names. The graph is fed nodes from the merged graph (§3.3, D30). |
| F20 | The 849 World Bank legs all run between two lenders and (mostly) one borrower. In a force layout that is two fans of ~430 parallel edges. | The census is a table, not a graph. It is excluded from the connection graph, and the caption says so with the count (D31). |

### 0.3 Reviewed generator changes this design needs

Each is an edit to `scripts/assemble-fleet.mjs` (and, for G1 and G2, to
`scripts/finance/fetch-worldbank.mjs`) with types in `src/graph/fleet.ts`,
re-checked by `scripts/validate.mjs` §5. The page must build and pass smoke **with or
without** each one. Absence is detected by `typeof EXPORT === 'undefined'` behind a
re-export shim in `src/data/finance.ts`, which exports `null` when the generator has not
emitted it.

| id | Export | Shape | Built from | Page without it |
|---|---|---|---|---|
| G1 | `FINANCE_LOAN_FACTS: Record<ClaimId, LoanFact>` | `{ project: string \| null /* P-number */, status: 'Closed'\|'Active'\|'Pipeline'\|'Dropped'\|null, pipeline: boolean, usdM: number \| null, fxRate: number \| null, fxBasis: string \| null, st: StateCode \| null, stBasis: 'borrower-state' \| 'agency-state' \| 'agency-seat' \| 'title' \| null, majorSector: string \| null, population: 'census' \| 'researched', countable: boolean \| null, countedAs: ClaimId \| null, notCountableReason: string \| null }` | the `projects` table and fetcher rules for census legs. For researched loans, `countable`/`countedAs`/`notCountableReason` come from fields the finance reconciliation editor adds to the research files (non-binding MoU, portfolio aggregate, duplicate of P-number X) | No map, no census Sankey. The project table prints every leg with `st`/sector "not exported in this build". No ₹ total over researched loans at any time |
| G2 | `FINANCE_WB_TOTALS` | the `provenance.totals`, `fieldMap` and `fx` block of `worldbank-projects.json`, verbatim | the same file | The Loans strip prints only counts derivable from `FINANCE_EDGES` (legs, distinct P-numbers). "of 1,117 in the API" and the dropped and grant-only counts are omitted, with the gap line "API population totals not exported" |
| G3 | `CAPITAL_HOLDINGS: Record<ClaimId, { pct: number \| null; shares: number \| null; asOf: string; category: string \| null; line: string \| null }>` · `CAPITAL_COVERAGE: { company: string; asOf: string \| null; read: 'primary' \| 'aggregator' \| 'not-read'; domain: string }[]` · `CAPITAL_CONTROLS: { id: string; role: 'holder-comparison' \| 'holder-control' \| 'adviser-comparison'; declaredIn: string }[]` | structured fields the capital fleet adds per `own` claim; the batch table the fleet already keeps (`holder-batches.json`), promoted to `research/raw/capital/`; the SPEC's control lists, promoted to a research file | Matrix interim state (§5.3 C2) |
| G4 | `NGO_FC_STATE: { st: StateCode; fy: string; receivedCr: number; utilisedCr: number \| null; srcs: Source[] }[]` | the Annexure I rows the NGO fleet opened (RS Q.3253), transcribed into a research-file table | State table void panel (§5.2 A3) |
| G5 | `FINANCE_EDGE_DOMAIN` etc. already exist. No change | — | — |

G1–G4 are listed in §15 as D1 and in the acceptance gates as *conditional* criteria:
each criterion states the EMPTY-export behaviour and the FULL-export behaviour.

---

## 1. Purpose and reader

`/finance` is the register of foreign money in India's public life, in three kinds:

- money **lent** to the Union, the states and their companies by multilateral, bilateral
  and Chinese official lenders, with the contracts it paid for and the firms debarred
  under it;
- money **given** to Indian associations under the FCRA, and the Home Ministry's actions
  against those associations, with each association's response;
- money **invested** in listed India by foreign holders, with the mandates foreign advisers
  won on disinvestments and the SEBI/RBI rules that changed the terms.

The reader arrives with a narrative ("the World Bank dictates policy", "FCRA silences
critics", "BlackRock owns India", "the Rothschilds control Indian banking"). The page
answers in the same order every time. First, what the record contains and what it
leaves out. Second, the same measure run on the comparison set. Third, the narrative's
rating on the six-step ladder, with its strongest case and strongest counter.

The page records **institutions**. Rothschild & Co and BlackRock Inc. are companies shown
beside comparison companies. A narrative that names a family, a religion or an
ethnicity appears only on the ladder, as a claim about the world with its rating. It
never appears as a node, an edge or a filter.

The page asserts no motive. It takes no view on whether foreign money is legitimate.

## 2. The reader's questions, in order

Questions 1–3 of each lens are answered from the stage at rest at 1280×800, in the
table view if the reader chooses it.

| # | Lens | Question | Answered by |
|---|---|---|---|
| L1 | Loans | How much has been lent, by whom, and how much of that does the record actually cover? | Loans strip · `PlacementLedger` (§5.1 L1) |
| L2 | Loans | Where did it go? | `LoansMap` + "not placed" row (L2) |
| L3 | Loans | Into which sectors, from which lender? | census `FlowSankey` (L3); researched sample table (L4) |
| L4 | Loans | When, against which general elections, and under which office-holders? | `ApprovalLanes` (L5); project table column (L6) |
| L5 | Loans | What did it pay for, who won the contracts, and who was debarred? | `ProjectTable` awards (L6); `DebarmentTable` (L7) |
| L6 | Loans | Against what? | external-debt context table (L8) |
| A1 | Associations | How much foreign contribution came in, each year? | `ReceiptsLedger` + bars (A1, A2) |
| A2 | Associations | Where? | state table (A3), a void until G4 |
| A3 | Associations | Whom did the Home Ministry act against, on what stated ground, and what did they say? | `ActionsTimeline` + `CaseFileTable` (A4, A5) |
| A4 | Associations | How does that compare with all cancellations? | aggregate-count table + base rates (A4) |
| A5 | Associations | Who gives to whom? | connection graph, associations preset (§5.4) |
| A6 | Associations | Which welfare schemes run through associations? | `WelfareJoin` (A7) |
| C1 | Capital | Who holds ≥1% of NIFTY 50 companies, compared with the comparison set? | `CoverageTable` + `HolderMatrix` (C1, C2) |
| C2 | Capital | Who advised on disinvestments, and what was paid? | `MandatesTable` (C3) |
| C3 | Capital | Which licences and JVs, on what timeline against comparators? | `LicencesTable` (C4) |
| C4 | Capital | Which rules moved the terms, and who benefited? | `RulesTimeline` (C5) |
| all | — | Which narratives hold up? | `NarrativeLadder` (§5.5) |
| all | — | What is missing? | `GapsPanel` (§5.7), at the same size as findings |

---

## 3. Route, data, URL contract

### 3.1 Route

- New lazy route `/finance` in `src/App.tsx`, and a nav entry "Foreign money" in
  `Layout.tsx` (icon `Landmark`). `scripts/smoke.mjs` gains `/finance`,
  `/finance?lens=loans&y=2019`, `/finance?lens=associations`, `/finance?lens=capital`
  and `/finance?lens=capital&holder=cap:blackrock`.
- Outer element: `<article className="pb-20">`, no inner `max-w`. Prose caps at
  `max-w-[72ch]`. Tables, the map, the Sankey and the matrix use the full layout width
  and scroll horizontally **inside their own container** only.
- `Suspense` fallback: the PageTitle and Standfirst text (energy D32), so a slow phone
  sees what the page is before the modules parse.

### 3.2 Data (static, compiled in)

The page imports only from:

- `src/data/finance.ts` (new): re-exports every name listed below, and the G1–G4
  shims (`null` when not generated).
- `src/data/financeView.ts` (new): every derivation, pure and at module scope, with
  a filter-keyed memo for the rest. **No literal figure appears in `src/pages/Finance.tsx`
  or in any `src/components/finance/*` file.**
- `useData()` from `src/context/DataContext.tsx`: the merged node set, used only to
  resolve labels for endpoints that live outside the three fleets (`co:` companies,
  `pol:`/`wel:` persons).

| Module | Exports read |
|---|---|
| `src/graph/finance.generated.ts` | `FINANCE_NODES`, `FINANCE_EDGES`, `FINANCE_EDGE_DOMAIN`, `FINANCE_BENEFITS`, `FINANCE_VOIDS`, `FINANCE_NARRATIVES`, `FINANCE_BASE_RATES`, `FINANCE_SYMMETRY`, `FINANCE_GAPS`, `FINANCE_IDENTITY`, `FINANCE_META`; G1 `FINANCE_LOAN_FACTS`, G2 `FINANCE_WB_TOTALS` |
| `src/graph/ngo.generated.ts` | `NGO_NODES`, `NGO_EDGES`, `NGO_EDGE_DOMAIN`, `NGO_BENEFITS`, `NGO_VOIDS`, `NGO_NARRATIVES`, `NGO_BASE_RATES`, `NGO_SYMMETRY`, `NGO_GAPS`, `NGO_IDENTITY`, `NGO_META`; G4 `NGO_FC_STATE` |
| `src/graph/capital.generated.ts` | `CAPITAL_NODES`, `CAPITAL_EDGES`, `CAPITAL_EDGE_DOMAIN`, `CAPITAL_BENEFITS`, `CAPITAL_VOIDS`, `CAPITAL_NARRATIVES`, `CAPITAL_BASE_RATES`, `CAPITAL_SYMMETRY`, `CAPITAL_GAPS`, `CAPITAL_IDENTITY`, `CAPITAL_META`; G3 `CAPITAL_HOLDINGS`, `CAPITAL_COVERAGE`, `CAPITAL_CONTROLS` |
| `src/data/welfare.generated.ts` | `WELFARE_SCHEMES` (the join), `WELFARE_ELECTIONS` (rows with `election === 'Lok Sabha'` only) |
| `src/data/indices.ts` | `NIFTY50`, `INDICES_AS_OF`, `INDEX_CHANGES`, `indexCoverage()`, `INDEX_SOURCES` |
| `src/graph/schema.ts` | `TIERS` (dash, label, weight) |
| `src/components/viz/ForceGraph.tsx` | `FAMILY_COLOR`, `FAMILY_LABEL`, `PRED_LABEL` |

**Named derivations in `financeView.ts`** (each is unit-tested in
`scripts/finance-view.test.mjs` against a fixture, and each returns rows *and* the
denominator sentence that goes with them):

| function | returns | reads |
|---|---|---|
| `loanRows()` | one `LoanRow` per `pred === 'loan'` edge in `FINANCE_EDGES` and `CAPITAL_EDGES` | edges, `FINANCE_EDGE_DOMAIN`, `FINANCE_BENEFITS` (implementing entity), G1 |
| `projectOf(e)` | P-number: `FINANCE_LOAN_FACTS[e.id].project` when G1 is present, otherwise `/^P\d{6}\b/.exec(e.lab)` **only for `worldbank-projects` legs** (the fetcher writes the P-number first in `lab` by construction) | G1, `lab` |
| `projectGroups(f)` | census legs grouped by P-number | `loanRows` |
| `placement(f)` | `{ byState: Map<StateCode, {projects, legs, cr, usdM, excludedNoInr}>, notPlaced: {…}, bases: Record<stBasis, number> }` | G1 |
| `censusFlows(f)` | `{ nodes: GNode[]; edges: GEdge[] }` view objects for `FlowSankey` (§5.1 L3) | G1 |
| `officeAt(date)` | role edges into `min:ministry-of-finance` whose `[from, to ?? ∞]` contains `date`, each with `openEnded: boolean` | `FINANCE_EDGES` `pred === 'role'` |
| `awardsByProject()` | `award` edges keyed by the P-number in their `lab` (`/\bP\d{6}\b/`), plus an `unkeyed` list | `FINANCE_EDGES` |
| `debarments()` | `enforce` edges with `s === 'fin:world-bank-sanctions-system'`, with responses | `FINANCE_EDGES` |
| `responsesTo(id)` | every `contra` edge with `t === 'claim:' + id`, across all three fleets | edges |
| `fcraNational()` | `{ years: FYSlot[]; multiYear: GEdge[]; byCountry: GEdge[]; named: GEdge[]; registrations: GEdge[] }` | `NGO_EDGES` |
| `fcraCases()` | one `CaseFile` per association target of an `enforce` edge from `min:ministry-of-home-affairs` or `ngo:mha-foreigners-division`, excluding targets whose id contains `aggregate`; plus `aggregates: GEdge[]` | `NGO_EDGES`, `NGO_NODES` |
| `welfareJoin()` | `{ linked: Row[]; schemeCount; registerSize: WELFARE_SCHEMES.length; unkeyed: GEdge[] }` | `NGO_EDGES`, `NGO_EDGE_DOMAIN`, `WELFARE_SCHEMES` |
| `holderMatrix(f)` | `{ rows: HolderRow[]; cols: ConstituentCol[]; cells; outside: GEdge[]; note: string \| null }` | `CAPITAL_EDGES` `own`, `NIFTY50`, G3 |
| `mandates()` | `award` edges in `CAPITAL_EDGES` whose `CAPITAL_EDGE_DOMAIN` is `mandates-ventures` and whose target is not a licensee of `sebi`, with `CAPITAL_BENEFITS` rows | capital |
| `licences()` | `award` edges with `s === 'sebi'`, `own`/`pmin` edges into `cap:jio-blackrock-*`, and `law` edges in `mandates-ventures` | capital |
| `rules()` | `law` edges in `CAPITAL_EDGES` (domains `rules-regulators`, `narratives-literature`), each with `CAPITAL_BENEFITS` row or null | capital |
| `derivedGaps(f)` | gap lines generated by the derivations (missing exports, unplaced counts, open-ended windows, un-reconciled duplicates) | all |

`asOfLabel` per lens: `{META.asOf}` of the lens's fleet; for the capital lens also
`indices as of {INDICES_AS_OF}`. Per-file `asOf` values that differ print as
`{min}–{max}`. Nothing picks one date silently.

### 3.3 URL parameters

All params go through `useSearchParams` with `{ replace: true }` and the house
`setParam` helper. **Absent = default = unfiltered, nothing selected, no entity
pre-selected.** An unknown value falls back to the default and is named in one amber
line under the strip: `ignored an unrecognised {param} value`.

| param | values | default | reach | effect shown beside the control |
|---|---|---|---|---|
| `lens` | `loans` \| `associations` \| `capital` | `loans` | which stage renders; the strip's facts; the graph preset | the tab carries its record count: `Loans ({legs} legs · {researched} researched)` |
| `y` | a year `1949`…`{maxYear}` \| absent | all years | **loans**: calendar year of approval (`from`) · **associations**: financial year starting in `y` (FY y–y+1) for receipts, calendar year for actions · **capital**: holding lines whose quarter date falls in `y`, and rules dated in `y` | `{N} → {k} {unit}` with the lens's unit, and the definition in words ("approval year", "FY 2019-20", "quarter ending in 2026") |
| `st` | state code | none | **loans**: filters the project table and Sankey to projects placed in `st`, highlights the state on the map · **associations**: marks case files whose association's registered office is `st` ("registered office, not where the money was spent") · **capital**: not applicable — the control shows "does not apply to this lens" and the param is kept, not dropped | `{N} → {k}` |
| `lender` | a lender node id present in `loanRows()` | none | loans lens only | `{N} → {k} legs`. When the lender is in the researched sample: "{label} is a researched sample of {n} records, not its India portfolio" |
| `holder` | a holder node id present in `holderMatrix` rows | none | capital lens: **emphasises** the row (accent left rule, "(selected)"), scrolls it into view. **Never removes a row** (D23) | "{label}: named ≥1% in {a} of {r} constituents whose filing was read" |
| `m` | `inr` \| `usd` \| `n` | `inr` | loans map fill and ledger sort only | each option shows its coverage: `₹ crore: {k} of {n} placed projects carry a ₹ amount` |
| `sel` | a node id | none | opens the connection graph (§5.4) with that node in focus; shared with `GraphExplorer` | — |
| `view` | `stage` \| `table` | `stage` | `table` swaps every graphic in the lens for its twin | — |
| `tp` | integer ≥ 1 | 1 | project-table page (400 rows per page; energy C15) | `rows {a}–{b} of {n}` |

**Reserved for `GraphExplorer`, never read or written by the page:** `tier fam pred ty q
amt from to focus hops path`. Changing `lens` clears `sel` and these reserved params in
the same `replace`, and the live region says `graph filters cleared with the lens`.

No param pre-selects a party, a company or a named person. There is no `party` param:
party is text on this page and nowhere a filter (D32).

### 3.4 Live region and unavailable options

- Exactly one `aria-live="polite"` region, debounced to about 150 ms. It carries every
  `{N} → {k}` effect, lens changes, `graph filters cleared`, `Link copied`, and
  `Table copied, {rows} rows`.
- Unavailable options are `aria-disabled="true"`, never `disabled`. The reason is
  inside the accessible name, for example `US$ million, unavailable: US$ amounts not
  exported in this build (G1)`.

---

## 4. Page anatomy

```
┌ Kicker · PageTitle · Standfirst · Byline ─────────────────────────────── ≤160px ┐
├ DenominatorStrip (sticky; facts change with lens) + active-filter line ─────────┤
├ LensTabs: Loans · Associations · Capital          [Stage | Table]  Copy link    ┤
├ FilterRail (one row, wraps): Year (+coverage ribbon) · State · Lender|Holder ·  ┤
│            Metric (loans) · Reset                         {N} → {k} {unit}      │
├──────────────────────────────────────────────────────────────────────────────────┤
│ LENS STAGE — tables first, the summarising graphic beside or under each          │
│   loans:        L1 PlacementLedger │ L2 LoansMap + NotPlaced                     │
│                 L3 census FlowSankey · L4 researched-sample table                │
│                 L5 ApprovalLanes · L6 ProjectTable · L7 Debarments · L8 Context  │
│   associations: A1 ReceiptsLedger │ A2 ReceiptBars · A3 StateTable (void→G4)     │
│                 A4 ActionsTimeline + aggregate counts · A5 CaseFileTable         │
│                 A7 WelfareJoin                                                   │
│   capital:      C1 CoverageTable · C2 HolderMatrix · holdings outside NIFTY 50   │
│                 C3 MandatesTable · C4 LicencesTable · C5 RulesTimeline           │
├ §5.4 The connection graph (id="graph") — GraphExplorer, lens preset ──────────────┤
├ §5.5 Narratives, rated (id="narratives") — ladder for the lens's fleet ──────────┤
├ §5.6 Contested (id="contested") — alleged claims beside their responses ─────────┤
├ §5.7 Same lens, other side (id="symmetry") — symmetry texts + base rates ────────┤
├ §5.8 What the record does not contain (id="missing") — same type as findings ────┤
└ §5.9 SourceLedger · TierLegend · standing note ─────────────────────────────────┘
```

The chrome is constant across lenses: strip, tabs, rail, graph, ladder, contested,
symmetry, gaps and sources are the same components fed by the lens's fleet. Only the
stage changes. A reader learns the page once.

Stage grid at ≥1280px: each pair `table │ graphic` is
`xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:gap-6`, **table first in the DOM
and on the left**. Below `xl` the pairs stack, table first. The graphic is the summary.
The table is the record.

Fold budget at 1280×800: header ≤160, strip + filter line ≈56, tabs ≈40, rail ≈44. That
leaves ≈500px, enough for the head of L1 and the map (height `clamp(360, 100vh − 360,
560)`).

---

## 5. Components, lens by lens

Every component block gives: **reads** (exact export), **encodes**, **caption** (what
the graphic cannot show), **twin**, and **empty / void / partial** state. Captions are
body size (14px, `text-text-secondary`, left rule; welfare K16). They sit in a
`<figure>` and are referenced by `aria-describedby`.

### 5.0 Chrome

**Header (existing `Editorial`)**

- Kicker: `Foreign money · loans, foreign contributions, foreign capital`
- PageTitle: **What foreign lenders, donors and investors put into India, and what the record leaves out**
- Standfirst (fixed copy, no figures): "Three kinds of foreign money, on one page:
  loans to the Union and the states, contributions to Indian associations, and holdings
  in the NIFTY 50. Each is shown as the record has it, with what the record does not
  cover counted beside it. Institutions are compared with institutions of the same
  kind. Narratives about who controls whom are rated, not drawn."
- Byline: `{FINANCE_META.counts.nodes + NGO… + CAPITAL…} entities · {edges} relationships · {voids} voids · research files read to {asOfLabel} · register versions {runIds}`.
  When a module is `META.empty`, its segment reads `{fleet}: register not yet promoted`.
- A standing line under the Byline, at body size: "Rothschild & Co and BlackRock Inc.
  appear here as companies, beside comparison companies. No family, religion or
  ethnicity is a node, an edge or a filter on this page."

**`DenominatorStrip` (existing, `src/components/Domain.tsx`, sticky)**

`filtered={{ from: lensPopulation, to: inView }}`. Facts per lens (derived in
`financeView.stripFacts(lens, f)`):

| lens | facts |
|---|---|
| loans | `{legs} of {censusLegs} World Bank legs` · `{projects} projects` + G2 `of {api} in the API ({dropped} dropped, {grantOnly} grant-only: not loans)` · `{placed} of {projects} placed in a state` · `₹{cr} cr nominal · {noInr} legs with no ₹ amount excluded` · `{researched} researched records from {lenders} other lenders (a sample)` |
| associations | `{fyWithValue} of {fySpan} financial years with a national total` · `{cases} case files · {named} actions against named associations` · `{answered} of {named} actions with a response to that claim` · `{welfareLinked} of {WELFARE_SCHEMES.length} register schemes linked to an association` |
| capital | `{read} of 50 NIFTY constituents with a filing read` (G3; interim: `{withLine} of 50 with ≥1 recorded line — reading not declared`) · `{holders} holders · {controls} in the comparison set` · `{mandates} mandates · {feeKnown} with a disclosed fee` · `{rulesWithBenefit} of {rules} rules with a structured cui-bono row` |

Active-filter line, mono 11px, inside the sticky wrapper, only when a param is set:
`filters: lens=loans · y=2019 · st=tn · reset`. Below 640px the strip keeps its first two
facts and the filtered chip. Facts 3 onwards move under the Byline. They are moved, not
hidden.

**`LensTabs` (new, `src/components/finance/LensTabs.tsx`)**: a `role="tablist"` with
three tabs that write `lens`. Arrow keys move between tabs and Enter or Space activates
(URL-driven, so no automatic activation on focus). Each tab name carries its record
count. Beside the tabs are the `Stage | Table` toggle (writes `view`) and `Copy link`.

**`FilterRail` (new, `src/components/finance/FilterRail.tsx`)**: §7.

### 5.1 Loans lens

#### L1 `PlacementLedger` — the record first (new, `src/components/finance/PlacementLedger.tsx`)

- **Reads:** `financeView.placement(f)` over census legs (G1 `st`, `stBasis`, `usdM`,
  `pipeline`, `countable`), `loanRows()`.
- **Table, one row per state plus four fixed rows, in this order:**
  1. **Not placed in any state (Union-wide or unplaceable)**: projects, legs, ₹ cr, US$ m.
     This is always the first row, set at the same weight as the others.
  2. One row per state with ≥1 placed project, sorted by the `m` metric descending.
     Ties break by state name. The sort is by a declared, external quantity: commitments
     as the lender published them.
  3. **Pipeline (not yet approved)**: projects and US$ m. "Excluded from every ₹ total."
  4. **No ₹ amount (US$ only, before the fx series begins)**: projects and US$ m.
     "Excluded from ₹ totals, included in US$ totals."
  5. **Totals**: ₹ total = the sum of the rows above it that carry ₹. The footer prints
     `= {a} in the API totals block` (G2 `croreExclPipeline`). If the two differ, it
     prints the difference in amber. Agreement is expected, and a mismatch is a finding.
- **Columns:** state · projects · legs · ₹ crore (nominal, approval-year rate) · US$ m ·
  placement basis split (`borrower-state` / `agency-state` / `agency-seat` / `title`
  counts). The basis column tells the reader how many rows rest on the weakest rule,
  which is a project title.
- **Caption (verbatim template):** "Placed, not borrowed: the Union borrows almost every
  World Bank loan. A project is placed in a state when a state government borrows, when
  the implementing agency is a state body, or when the title names one state. Union
  bodies seated in Delhi never place a project in Delhi. {notPlaced} of {projects}
  projects are not placed. ₹ figures are nominal, converted at the approval-year rate.
  A 1985 crore and a 2024 crore are different quantities."
- **Twin:** the ledger is the twin of L2 and L3. Row arrays are shared.
- **Empty (G1 absent):** the table renders only rows 3–5 from `loanRows()`. It
  prints "State placement is not exported in this build (G1). The fetcher computed
  it, but the page cannot read it without the export." That sentence also enters the
  gaps panel.
- **Filtered to nothing (`y` with no approvals):** "No World Bank project was approved in
  {y}. {prev} and {next} have approvals." With links, and `y` is not changed
  automatically.

#### L2 `LoansMap` (existing `IndiaMap`, extended)

- **Reads:** the L1 row array. `data[st] = { value: metric(row), label, detail: '{projects} projects · {legs} legs · basis {…}' }`.
  States with no placed project are **absent** from `data`, so they render as the hatch.
- **Encodes:** sequential ramp on the `m` metric, **quantile bins pooled over all years
  with no filters** (welfare K13), so a shade does not change meaning when the reader
  filters. `scaleMode="quantile"` by default, with a log toggle. Hatch = "no project
  placed here in this file", never zero. Legend classes that are empty in the current
  view are named "(none in view)", not dropped.
- **Beside the map, same height as the map's largest bar in the legend: the
  `NotPlacedBox`.** A rectangle labelled "Not placed in any state", filled with the same
  ramp step as its value would take. It says "Union-wide or unplaceable. Not a place on
  this map." It is a button that filters the project table to unplaced projects.
- **Extension to `IndiaMap` (backward compatible):**
  - an optional `a11y="listbox"` prop porting the WelfareMap pattern (the map is a
    `role="listbox"` of 36 state options in north-to-south order, each option's name
    carrying the readout). This supersedes `role="img"` for the WCAG finding already
    fixed on `/welfare`.
  - the hatch pitch computed in screen pixels (WelfareMap `TexturePatterns` rule), so
    at 390px the hatch does not rasterise to a flat grey that reads as a low value.
- **Caption:** the L1 caption's first sentence, plus "The map shows the World Bank census
  only. Other lenders are a researched sample (see below) and are not painted."
- **Twin:** L1.
- **Empty (G1 absent):** the map is not drawn. In its place is a panel at map height:
  "Map not drawn: state placement is not exported in this build (G1). Drawing it from
  each body's registered office would paint Delhi with every Union loan." This is the
  honest reason, stated where the map would be.
- **Selected `st`:** outline lifts. The readout reads `{state}: {projects} projects ·
  ₹{cr} cr nominal · {noInr} without ₹ · basis {…}`.
- **Mobile:** an `Open a state` `<select>` under the figcaption (welfare D22).

#### L3 Census `FlowSankey` — World Bank lender → major sector → placement (existing `FlowSankey`, extended)

- **Reads:** `censusFlows(f)`, which builds view objects from G1 over **countable census
  legs with `a`**:
  - Lender nodes: the real `fin:ibrd` / `fin:ida` nodes from `FINANCE_NODES`.
  - Sector nodes: `view:sector:{majorSector}`, `ty: 'industry'`, `fam: 'market'`. This
    is the same type and family the platform already gives sector-class nodes
    (`cap:fpi-industry`). No new hue is introduced.
  - Placement nodes: `view:st:{code}`, `ty: 'state'`, `fam: 'state'`, and
    `view:st:unplaced` labelled "Not placed in any state".
  - View edges `view:{lender}>{sector}` and `view:{sector}>{st}`, `pred: 'loan'`,
    `a = Σ a` of the legs they aggregate, `tier` = the weakest tier among them. They
    carry `lab: '{n} legs'` and the list of source claim ids. They exist only inside
    this component and never enter the graph, the twin's claim counts, or any export.
- **Extension to `FlowSankey` (backward compatible):** `FLOW_PRED_LABEL.loan =
  'Loan commitment'` and `grant = 'Grant / foreign contribution'`; an optional
  `captionExtra: ReactNode` rendered at body size after its own caption.
- **Encodes:** band = ₹ crore nominal. Dash = tier (all `documented` here, and the
  component still draws whatever tier arrives). Ribbon hue = source node family
  (FlowSankey's rule, unchanged).
- **Sector strings are the API's `major_sector_name`, verbatim.** The World Bank changed
  its sector taxonomy in FY2017. "Transportation" and "FY17 - Transportation" are
  different strings and **are not merged**. Only exact string matches share a node (D9).
- **Caption:** "World Bank (IBRD and IDA) only: the one lender whose every India
  project is in this register. Sector is the Bank's own single major-sector field, as
  the API names it, and the taxonomy changed in 2017, so older and newer labels sit
  apart. {droppedNoAmount} legs without a ₹ amount are not drawn. Position is the order
  money moved, not influence."
- **Twin:** FlowSankey's own DataTable (bands) plus the L1 ledger. Clicking a band
  filters the project table to its legs (`onSelectFlow` → the table's in-page filter,
  not a URL param, announced in the live region).
- **Empty (G1 absent):** not drawn. "Not drawn: sector and placement are not exported
  in this build (G1)."
- **Mobile (<640):** the twin table renders by default. `Show the diagram` renders the
  SVG inside a horizontally scrolling container with `min-width: 720px`.

#### L4 Researched lenders — a sample, as a table (new `SampleLoans` in `src/components/finance/Loans.tsx`)

- **Reads:** `loanRows()` where `population === 'researched'` (with G1) or
  `FINANCE_EDGE_DOMAIN[id] !== 'worldbank-projects'` (without G1), plus the one
  `CAPITAL_EDGES` loan.
- **Table, grouped by lender (lender label as a group header with "{n} records in this
  register, a researched sample, not {lender}'s India portfolio"):** record (`lab`
  verbatim, linked to its first source) · borrower · approved · closes · amount
  (`₹{a} cr` + the fx basis from `d`'s first clause; or **"amount not stated / in US$
  m"**, D8) · instrument (`terms.instrument` verbatim) · rate / tenor / grace (the
  numbers, or "not published") · conditions (`terms.conditions[]`, each on its own
  line) · counting status · tier · response.
- **Counting status column (G1):** `counted` · `not a commitment: {notCountableReason}`
  · `counted under {countedAs → P-number or record}`. Without G1 every row reads
  "counting status not recorded (G1)", and **no ₹ subtotal is printed for this table**.
- **Graphic (G1 present only):** a second, smaller `FlowSankey`, lender → placement,
  over `countable === true` rows with `a`, captioned "A researched sample: {n} records
  from {k} lenders. It is not comparable with the census above, and the two are never
  added." Without G1, no graphic.
- **Empty:** "No researched loan records in this build."

#### L5 `ApprovalLanes` (new, `src/components/finance/ApprovalLanes.tsx`)

`TimeLanes` from `/welfare` is bound to `welfareView` types (`Lane`, `ElectionRow`,
`CoverageCell`). This is a new, smaller SVG with one x-scale from the first approval
year to `FINANCE_META.asOf`. The drawing is `aria-hidden`, and everything it says is in
its twin.

| row | reads | draws |
|---|---|---|
| 1 World Bank approvals | census `projectGroups(f)` by `from` year | bars of **project count** per year (not ₹, so the heavy tail of large DPLs does not dominate a timing question). Pipeline years are hatched |
| 2 Researched lenders | `loanRows()` researched | one tick per record at its `from`. Dash = tier. Undated records are counted at the row end as `undated ({n})` |
| 3 General elections | `WELFARE_ELECTIONS.filter(e => e.election === 'Lok Sabha')` | a hairline at each date, with `winner` verbatim as text. The span before the first recorded row is shaded and labelled "general elections before {firstYear} not in this register" |
| 4 Union budgets | nothing | the text line "Union budget dates are not a dataset in this build. No marks are drawn." (D13). No marks |
| 5 Office-holders at the Ministry of Finance | `FINANCE_EDGES` role edges into `min:ministry-of-finance` | one bar per role edge over `[from, to]`, labelled with the person's label and `lab` verbatim. Dash = tier. A bar with no `to` ends in an arrow and "end not recorded". A bar with no `from` is listed under the row as "undated ({n})". No party colour: party is text in the tooltip only if the node carries it |

- **Small multiple beside the lanes:** "Month of approval" — a 12-bar histogram of census
  project approvals by calendar month. Caption: "Lenders approve on their board
  calendars. Any clustering by month is one boring explanation for clustering by
  anything else." No figure is asserted. The reader sees the months.
- **Caption:** "Approvals are drawn against elections because readers ask. The drawing
  cannot show intent, and nothing here tests it. Office-holders are those whose recorded
  window covers a date. No loan document opened in this register names a minister as
  signatory ({voidCount} voids)."
- **Twin:** a table, year · World Bank projects approved · researched records ·
  general election that year (winner text) · office-holders whose window covers 1 July of
  that year. That column is labelled "(mid-year test)" and the per-project date test is
  in L6.
- **Partial:** rows 3 and 5 have a first date later than row 1's. The axis shades the
  uncovered span per row. It does not clip the axis to the covered span.

#### L6 `ProjectTable` — the project list with contracts and office-holders (new, `src/components/finance/ProjectTable.tsx`, via energy `StackTable`)

- **Reads:** `projectGroups(f)`, `loanRows()`, `awardsByProject()`, `officeAt()`,
  `FINANCE_BENEFITS` (implementing entity), `responsesTo()`.
- **One row per census project (legs folded) and one per researched record.** Default
  sort: approval date, newest first. It is never sorted by amount by default (energy
  C4). Other sorts: amount, placement, status.
- **Columns:**
  1. Project (`lab` verbatim) + P-number + first source link
  2. Lender leg(s): `IBRD ₹{a}` / `IDA ₹{a}`, each with its tier
  3. Approved · closes (or "closing date not stated")
  4. Status (G1, or "not exported")
  5. Amount: `₹{Σa} cr nominal` + `US${usdM} m` (G1). A leg without `a` prints exactly
     **"amount not stated / in US$ m"**, followed by the US$ m value when G1 has it. The
     project's ₹ cell then reads `₹{partial} cr + {k} leg(s) without ₹` and never
     treats the missing leg as 0.
  6. Placement: state + basis (G1), or "not placed"
  7. Implementing: the `FINANCE_BENEFITS` row's `who`, resolved to a label. A plain
     name is shown in quotes ("not a node")
  8. Borrower: label, and **"(API blank — Union recorded by default)"** when `d`'s
     borrower clause says so. That is a structured marker the fetcher writes, and G1
     carries it as `stBasis === null && borrower default`. Until G1, the clause is shown
     verbatim from `d`
  9. Terms: instrument · rate · tenor · grace, or "not in the API"
  10. Conditions: `terms.conditions.length` with the list expandable. `0` prints as
      "none recorded: the Projects API carries no conditions (void)"
  11. Contract awards: count, expandable to a nested table (awardee label · contract
      `lab` verbatim · ₹ `a` or "amount not stated" · signed `from` · bidders and prices
      as the `d` states them, **verbatim, never parsed** · tier · awardee's debarment
      status if any). Denominator line under the column header: "Contracts are
      recorded for {projectsWithAwards} of {projects} projects. Award notices publish a
      bid count for {k} of {n} sampled notices (base rate, `contracts`)."
  12. Office-holders at approval: every `officeAt(from)` row, as `{person} — {lab}
      [{tier}]`, open-ended ones with "end not recorded". An empty cell reads "no
      recorded window covers {date}"
  13. Tier(s)
- **Awards not keyed to a World Bank project id** (no P-number in `lab`): a second
  table under the first, same columns 11a–f, headed by its count.
- **Caption:** "One row per project. Blended projects carry an IBRD leg and an IDA leg.
  Amounts are the lender's commitment at approval, not disbursement. Contract awards
  are a sample the fleet researched, not every contract. Office-holders are those whose
  recorded window covers the approval date: the date test, not a signature."
- **Twin:** the table itself. `Copy as TSV` / `Download .tsv` from the same row array
  (welfare U1). The TSV's first line is the view URL.
- **Pagination:** 400 rows, page in `tp`. After a page change focus goes to the caption.
- **Empty:** "No project matches {filters}." with the most-removing filter named and a
  one-click reset of that filter (energy empty state).

#### L7 `DebarmentTable` (new, in `Loans.tsx`)

- **Reads:** `debarments()`, `responsesTo()`, `FINANCE_BASE_RATES` where
  `domain === 'contracts'` (selected by domain, never by matching text).
- **Columns:** firm (label + `sub`) · debarred from · to (the `to`, or "open: no end
  date in the feed", taken from the edge, never from a sentinel date) · ground (`d`
  verbatim) · tier · response. A row without a response prints **"No response recorded —
  asked/not asked unknown"** at the same size as the ground.
- **Line above the table:** "{inRegister} debarments recorded here. {k} of them are
  awardees in this register's contract sample." The `contracts` base-rate rows print
  beneath it verbatim, numerator and denominator, including the Indian-entries-on-the-
  sanctions-list row, so the reader sees the recorded rows against the list.
- **Caption:** "A debarment is the World Bank's sanction. It is not a court finding. The
  feed rarely names the project."
- **Empty:** "No debarment recorded in this build."

#### L8 Context: India's external debt (new `DebtContext` in `Loans.tsx`)

- **Reads:** `FINANCE_BASE_RATES` where `domain === 'debt-imf-people'`, and
  `FINANCE_VOIDS` of the same domain.
- **Energy `BaseRateTable`, verbatim rows.** A row whose numerator or denominator is
  `null` prints "not computed in this file", never a dash that reads as zero.
- **Caption:** "What the loans above are part of. The official external-debt status
  reports were unreachable from this environment. These rows come from World Bank
  series."
- **Empty:** "No external-debt context rows in this build."

### 5.2 Associations lens

#### A1 `ReceiptsLedger` (new, `src/components/finance/Associations.tsx`)

- **Reads:** `fcraNational()` over `NGO_EDGES`:
  - `years`: `pred === 'grant' && s === 'ngo:foreign-sources-aggregate' && t === 'ngo:fcra-associations-aggregate'`,
    and the window is exactly one FY (`from` = `YYYY-04-01`, `to` = `(YYYY+1)-03-31`).
    One slot per FY from the earliest to the latest such FY. `current` = the row with no
    `supersededBy`, and `superseded[]` = the rest.
  - `multiYear`: the same s/t with any other window.
  - `byCountry`: `s` starting `ngo:foreign-sources-` and not the aggregate.
  - `named`: every other `grant` edge whose `t` is an association (`ty === 'trust'` or
    `fam === 'recipient'`).
  - `registrations`: `analytic` edges with `s === t === 'ngo:fcra-associations-aggregate'`
    (filer and registration counts).
- **Table, one row per FY slot:** FY · ₹ crore received (current) · source (label + link)
  · tier · superseded figures (each `₹{a}` + source + "superseded by {id}") ·
  registrations/filers that year (verbatim `lab` where a registrations row's window
  touches the FY). A slot with no row prints **"not in this file"** and links to the
  gap line that names the missing FYs (`NGO_GAPS`, domain `fcra-receipts`).
- **Below:** "Multi-year totals (not a year)": the `multiYear` rows verbatim. Then "By
  donor country, where a source gives it": `byCountry`, grouped by FY. Then "Named
  donors and recipients (a sample, not a ranking)": `named`, sorted by FY, then label.
- **Caption:** "The FCRA portal is unreachable from this environment. National totals
  come from Parliament answers and press reports of MHA statistics, and the tier says
  which. Where two figures exist for a year, both are kept: the drawn one is current, the
  other is marked superseded."

#### A2 `ReceiptBars` (new)

- **Reads:** A1 `years`.
- **Encodes:** one bar per FY slot. Height = ₹ crore (current figure). **Bar outline
  dash = tier.** A superseded figure is a short horizontal tick across the slot at its
  value, with `title` "superseded: {source}". A missing FY is a full-height **hatched
  slot** with the label "not in this file" (never a zero-height bar). Nominal ₹, and the
  axis says so.
- **Caption:** "{fyWithValue} of {fySpan} financial years carry a national total. The
  hatched years are missing from the record, not years with no money. Totals from
  different sources are not always the same quantity (returns filed by a date, portal
  snapshots): the twin names each source."
- **Twin:** A1.
- **Empty:** no `years` rows → "No national FC total in this build."

#### A3 `StateTable` — FCRA receipts by state, FY2019-20 → 2021-22 (new)

- **Reads:** G4 `NGO_FC_STATE`.
- **With G4:** a table with state · FY2019-20 · FY2020-21 · FY2021-22 (₹ crore received;
  utilised where given) · source. Its column sums are checked against the three national
  rows in A1 whose source is the same Parliament answer. The footer prints `sum of rows
  = {x}; national row = {y}` and flags any difference. There is still no map: 34
  values over 3 FYs sit in a table without loss, and the registered office of an
  association says little about where money was spent (D16).
- **Without G4 (today):** a void panel at the same size as a finding:
  "The state-wise table exists in the source: Rajya Sabha Unstarred Q.3253 (29 March
  2023), Annexure I, {rows} state and UT rows for three financial years. This build
  records only its column sums (above) and one state's share (base rate below). The rows
  were not transcribed (G4)." With the source link taken from the national rows' `srcs`
  and the `NGO_BASE_RATES` rows whose `domain === 'fcra-receipts'` printed beneath.
  `{rows}` comes from `NGO_FC_STATE` when present. Without G4 the sentence omits the
  number.

#### A4 `ActionsTimeline` — the Home Ministry's actions, with ground, response and tier (new)

- **Reads:** `fcraCases()` over `NGO_EDGES`, `responsesTo()`, `NGO_BASE_RATES` where
  `domain === 'fcra-actions'`, `WELFARE_ELECTIONS` (`Lok Sabha` rows).
- **Rows:** one lane per **case file** (association), labelled with the association's
  label and `sub`. The order is by first action date, never by count.
- **Marks per action edge:** a square at `from`, outline dash = tier. A claim with
  ≥1 response gets a **rose rule** directly beneath the square, the same length as the
  square. The rose rule marks the response's position, not its credibility (welfare
  `ROSE_KEY`). A claim with no response gets an open bracket `[ ]` beneath, and its
  `title` and twin cell carry the exact sentence. Alleged-ground edges (`tier ===
  'alleged'`) are drawn as squares like any other claim. Their dash (alleged) is the
  distinction.
- **Context:** Lok Sabha election hairlines with `winner` verbatim (A4 shares L5's
  rule). No party colour.
- **Beside the timeline: "Counts the Ministry and Parliament have given"**: the
  `aggregates` rows (`enforce` edges into `…aggregate` ids), one row each, `lab` and
  window verbatim, tier, source. The header reads: "These counts overlap and use
  different windows. They are never added." The `fcra-actions` and `fcra-receipts`
  base-rate rows sit beneath, including the row that sets the named case files against
  all cancellations.
- **Caption:** "{cases} associations, {named} recorded actions. These are the cases the
  record names, a small fraction of all cancellations (base rate beside). Most
  cancellations were for not filing returns. The kind of action (suspension,
  cancellation, refusal to renew) is quoted from the record, not classified by this
  page."
- **Twin:** A5.
- **Empty:** "No named FCRA action in this build."

#### A5 `CaseFileTable` — the timeline's twin (new)

- **Reads:** same as A4.
- **One block per case file**, `<section aria-labelledby>` with an `h3` of the
  association's label. Inside, a table with one row per claim about that association,
  ordered by date:

| Date | What the record says (`lab` verbatim) | Stated ground (`d` verbatim) | Tier | Response |
|---|---|---|---|---|

  The **Response** column has the same width and type size as the ground column
  (denials beside claims at equal size). Each response reads `Response from {responder}
  [{tier}], {date or "undated response"}:` followed by its `d` verbatim, including
  audit contras whose text says no denial applies. **A claim with no `contra` answering
  it prints exactly: "No response recorded — asked/not asked unknown".** When other
  claims in the same case file do carry responses, a second line follows: `{k}
  response(s) recorded to other claims in this case, shown above/below.`
- **Case-file header line:** registered office `st` (the node's own, labelled
  "registered office"), `{actions} actions · {responded} with a response to that claim`,
  and a link that sets `sel={association id}` to open the graph.
- **Filters:** `y` keeps case files with ≥1 action dated in `y` (all their rows still
  show, with the in-year rows marked). `st` marks case files by registered office and
  never hides the others (the page does not ask "which states' NGOs were hit", which
  registered office cannot answer).
- **Empty:** as A4.

#### A6 Donor → association graph

This is the shared connection graph (§5.4), with the associations preset. A
`Show donors and associations in the graph` button above A5 sets `sel` to the first
case file's association **only on click**. It is never a default.

#### A7 `WelfareJoin` — which schemes run through associations (new)

- **Reads:** `welfareJoin()`: `NGO_EDGES` with `s` or `t` starting `scheme:`, joined to
  `WELFARE_SCHEMES` by `id`. Also `NGO_EDGES` whose `NGO_EDGE_DOMAIN` is
  `darpan-welfare-join` with `pred` in `pmout | award | grant` into an association
  (these carry no scheme id).
- **Table 1, "Linked to a scheme in the welfare register":** scheme (name from
  `WELFARE_SCHEMES`, link to `/welfare?s={id}`) · association · relationship
  (`PRED_LABEL`) · tier · innocent reading (verbatim, at full size, because every row
  here is `analytic`) · source.
- **Table 2, "Paid or awarded under a government programme, not keyed to a register
  scheme":** payer · association · ₹ `a` or "amount not stated" · window · tier ·
  response.
- **Denominator line:** "{schemeCount} of {WELFARE_SCHEMES.length} schemes in the welfare
  register have a recorded link to an association. {analytic} of {links} links are our
  own inference (analytic), each with its innocent reading."
- **Caption:** "A link here says an association sits in a scheme's delivery chain. It
  does not say the association was paid for that, unless a payment row says so."
- **Empty:** "No association is linked to a register scheme in this build."

### 5.3 Capital lens

#### C1 `CoverageTable` — which filings were read (new, `src/components/finance/Capital.tsx`)

- **Reads:** G3 `CAPITAL_COVERAGE` and `NIFTY50`. Interim: `CAPITAL_EDGES` `own` into
  each constituent.
- **One row per NIFTY 50 constituent** (from `NIFTY50`, in its file order): company ·
  NSE · sector · filing read (`primary` / `aggregator` / `not read`) · as of (quarter) ·
  research batch (domain) · named foreign lines recorded · LIC line recorded (yes/no).
  A constituent with `existingId === null` prints "not in the company dataset" and is a
  hatched column in C2.
- **Interim (no G3):** the "filing read" column reads `≥1 line recorded (quarter {q})` or
  **"no line recorded: whether the filing was read is not declared"**. That second
  state is hatch in C2. It is never "not named ≥1%".
- **Header line:** "{read} of 50 constituents have a shareholding filing read.
  Constituent list as of {INDICES_AS_OF}." Announced changes from `INDEX_CHANGES` print
  as "announced, not applied: {out} → {in}, effective {date} [{tier}]".

#### C2 `HolderMatrix` (new, `src/components/finance/HolderMatrix.tsx`)

- **Reads:** `holderMatrix(f)`: `CAPITAL_EDGES` `pred === 'own'` whose `t` is a NIFTY 50
  `existingId`; G3 `CAPITAL_HOLDINGS` (pct, asOf), `CAPITAL_COVERAGE`,
  `CAPITAL_CONTROLS`; `NIFTY50`.
- **Rows (holders):**
  1. The **comparison set** from `CAPITAL_CONTROLS` with `role === 'holder-comparison'`,
     in declared order. BlackRock is a row whether or not it has a line.
  2. The **domestic control** (`role === 'holder-control'`), last in the set, with its
     own label "domestic control".
  3. Every other holder with ≥1 line into a constituent, **alphabetical**. There is no
     row order by holdings. A leaderboard of foreign owners is not a denominator.
- **Columns:** the 50 constituents, in `NIFTY50` order, with sticky company headers.
- **Cell states. Five, each distinct in greyscale and each spoken in words:**

| state | when | drawn as | words (in the cell's accessible name and in the twin) |
|---|---|---|---|
| value | a line exists and G3 gives `pct` | the % in mono (`2.27%`), fill from a fixed sequential ramp with bins [1–2), [2–5), [5–10), [10–25), [25–100] (empty bins named in the legend), and a 2px bottom rule whose **dash = tier** | `{holder} {pct}% of {company}, as of {asOf}, {tier}` |
| named, % not structured | a line exists, G3 absent or `pct === null` | `≥1%` in mono, no fill, tier-dash bottom rule | `named as a ≥1% holder; percentage not structured in this build — see the claim` |
| read, not named | coverage says the filing was read and no line exists for this holder | a centred `—` on a dotted ground | `not named ≥1% in the filing read ({asOf}): below 1% or not separately named` |
| not read | coverage says not read, or no coverage declared (interim) | hatch | `filing not read in this register` |
| not in dataset | constituent without `existingId` | hatch + `n/d` | `constituent not in the company dataset` |

  The cell is a button that opens the claim (`sel={holder}` + scroll to the claim row in
  the twin). With several lines for one holder×company (fund lines, combined), the cell
  shows the G3 line the fleet marked as the holder's own line. The twin lists all
  lines.
- **Row header:** label · `sub` · "named ≥1% in {a} of {r} constituents whose filing was
  read". For BlackRock this reads, from data, "named ≥1% in 0 of {r}". That is the
  finding, stated in the frame.
- **Guard (Review Focus 5): the matrix never renders fewer than four holders.**
  - `holder=` emphasises a row and never removes rows.
  - `y=` blanks cells outside the quarter-year. Rows persist, and a row with no cell in
    view shows "no line in {y}".
  - If the holder set to render has fewer than 4 rows (for example G3 absent and the
    fallback set is small, or a future filter), the grid is **not drawn**. In its place:
    **"Comparison set required: this matrix is shown only with at least four named
    holders, so that no single institution is displayed alone. {n} available in this
    view."** The twin still lists every line.
  - **Interim (no G3 `CAPITAL_CONTROLS`):** there is no declared comparison set to
    guarantee BlackRock's row. The grid is not drawn. The note above prints, followed by
    "The declared comparison set is not exported in this build (G3). Without it,
    BlackRock, which has no recorded line, would silently drop out of the picture." The
    per-holder table (twin) still renders, with every holder that has a line. The
    capital symmetry texts and base rates (which name the comparison set's results)
    render in §5.7.
- **Caption:** "SEBI shareholding patterns name a public shareholder only at 1% or
  more. A blank means not named, not zero ownership. Fund families file under many
  names, and the lines are recorded as filed. Strategic and promoter holders (a parent
  company, a depositary) sit in the same grid because the filing puts them there. The
  line's category is in the twin. {read} of 50 filings were read, in batches, and the
  checked companies are not a random sample."
- **Twin:** a long table: holder · company · % (or "not structured") · shares · category
  · line as filed (G3 `line`) · as of · tier · source · claim id. Plus, per holder, the
  count sentence from the row header. `Copy as TSV`.
- **Holdings outside the NIFTY 50:** a short table under the matrix. It lists `own`
  edges whose target is not a constituent (JV stakes, advisory subsidiaries, AMCs), with
  "{n} recorded holdings are outside the NIFTY 50 and not in the matrix."
- **Mobile (<640):** the grid is not drawn. It renders as **holder cards** (comparison
  set first): holder, count sentence, and a list of `company — pct/state`. There is also
  a `Show the grid` button that renders the table in a horizontally scrolling container.

#### C3 `MandatesTable` (new)

- **Reads:** `mandates()` over `CAPITAL_EDGES` (`award`, domain `mandates-ventures`),
  `CAPITAL_BENEFITS` by `claimId`, G3 `CAPITAL_CONTROLS` (`role === 'adviser-comparison'`),
  `CAPITAL_BASE_RATES` where `domain === 'mandates-ventures'`, `responsesTo()`.
- **Table, one row per mandate:** adviser · client (DIPAM/Ministry of Finance or other) ·
  deal (`lab` verbatim) · role · date · fee (`benefitAmount()` from the energy `Cards`:
  `₹{amountCr} cr ({confidence})`, `Re 1 bid (estimated)` as recorded, or **"fee not
  disclosed"** when `amountCr === null`) · tier · response.
- **Adviser comparison block (G3):** one row per declared comparison adviser, Rothschild
  & Co among them: "{k} mandates recorded" or **"no mandate recorded in this file"**,
  plus the base-rate rows (league-table appearances and so on) verbatim. Without G3:
  "The declared adviser comparison set is not exported in this build (G3). The
  symmetry text below names it."
- **Caption:** "A mandate is a public appointment. It is not a finding about the
  adviser. Fees are shown only where disclosed."
- **Empty:** "No mandate recorded in this build."

#### C4 `LicencesTable` — licences, JVs and the comparator timeline (new)

- **Reads:** `licences()`; `CAPITAL_BASE_RATES` where `domain === 'mandates-ventures'`.
- **Table:** licensee · licence (`lab`) · regulator · applied (the `law` edge's `from`
  where a sponsor-application claim exists) · approved (`award.from`) · months between
  (computed only when both dates exist, else "one date not recorded") · tier ·
  response. Comparator rows (other MF sponsors in the same file) sit beside the JV rows,
  with the same columns and no emphasis.
- **Caption:** "Months from application to approval, for every sponsor the file dates
  at both ends. A row with one date is shown and not timed."

#### C5 `RulesTimeline` — the rules and their cui-bono record (new)

- **Reads:** `rules()`: `CAPITAL_EDGES` `pred === 'law'`, `CAPITAL_BENEFITS` by
  `claimId`, `supersededBy`, `innocentReading`.
- **Graphic:** one lane, x = time. One mark per rule at `from`, outline dash = tier, and
  a bar to `to` where the rule has an end. Superseded rules draw at reduced opacity
  **and** with the word "superseded" in the label, so greyscale does not lose it.
- **Table (the twin, primary):** rule (`lab`) · in force from–to · reaches (`t` label) ·
  who benefits (the `CAPITAL_BENEFITS` row: `who`, `how`, amount + confidence) ·
  innocent reading · superseded by · tier · sources. **When no benefit row exists, the
  cell reads "no structured cui-bono row" and the rule's `d` is printed verbatim
  beneath, at the same size.** The research text often says who asked and who
  benefits. The page shows it as text and does not turn it into a row.
- **Denominator line:** "{withBenefit} of {rules} rules carry a structured cui-bono row."
- **Caption:** "A rule that benefits someone is not evidence that it was written for
  them. The record gives who asked where it is known, and the innocent reading."
- **Empty:** "No rule recorded in this build."

### 5.4 The connection graph (shared, `id="graph"`)

- **Component:** existing `GraphExplorer` (canvas `ForceGraph` + `GraphA11y`), mounted
  on intersection, and behind `Load the graph` below 640px (welfare D21).
- **Data by lens preset** (`financeView.graphFor(lens)`):
  - loans: `FINANCE_NODES` + `FINANCE_EDGES` **minus** legs whose `FINANCE_EDGE_DOMAIN`
    is `worldbank-projects` (D31);
  - associations: `NGO_NODES` + `NGO_EDGES`;
  - capital: `CAPITAL_NODES` + `CAPITAL_EDGES`;
  - endpoints outside the fleet's node array are resolved from `useData()` graph nodes.
    An endpoint that resolves nowhere is dropped with its edge, and the count is
    printed.
- **Caption above the canvas (body size):** loans preset: "{hidden} World Bank project
  legs are not drawn. They all run from IBRD or IDA to the Union, which would draw as two
  fans of parallel lines. They are rows in the project table. {n} relationships drawn."
  Every preset: "Identity across the three research registers is joined only where ids
  match. The same institution can appear under two ids until reconciled."
- **Labels:** `PRED_LABEL.loan = 'Loan'` and `grant = 'Grant / foreign contribution'`
  already exist. Both are directed money predicates (arrowheads).
- **Opening with focus:** clicking a lender (L4 group header, L6 leg), an association
  (A5 header), an adviser (C3) or a contractor (L6 award row) writes `sel={id}` and,
  when the id is not in the current preset, `lens` changes first. The graph section
  scrolls into view and focus moves to its heading. GraphExplorer's jump-to (SOTA §6.4)
  handles a `sel` hidden by the graph's own filters by naming the filter.
- **A `sel` that is not drawable** (a node reached only by census legs, for example a
  state implementing agency): the graph heading line reads "{label} appears only in the
  World Bank project table, which is not drawn in the graph. Show its projects →", which
  sets `st` or filters the table. It is never a silent no-op.
- **Additions this page relies on from SOTA §6** (built in the shared explorer, per the
  plan's Task 9): jump-to, the "as of" date mode, and the why-drawn line. Until Task 9
  lands, `sel` still focuses (it round-trips today). Jump-to and why-drawn are absent,
  and nothing on this page depends on them for honesty.

### 5.5 Narratives, rated (shared, `id="narratives"`)

- **Reads:** `FINANCE_NARRATIVES` (loans), `NGO_NARRATIVES` (associations),
  `CAPITAL_NARRATIVES` (capital). A control shows all three: `show every register's
  narratives ({n})` (in-page state, not a URL param).
- **Component:** existing welfare `NarrativeLadder`. It draws six fixed rungs, and an
  empty rung reads "none in this file". All rungs are one colour, strongest case and
  strongest counter sit side by side at equal size, and the research file is named.
- **Caption:** "Narratives are claims about the world, rated on the evidence the
  registers hold. The same narrative can appear in more than one research file with a
  different rating. They are listed as recorded, not reconciled. A narrative that names
  a family or a people is rated here and nowhere else on the page."
- **Denominator:** energy `narrativeDenominator(ns)`.

### 5.6 Contested (shared, `id="contested"`)

- **Reads:** the lens fleet's edges with `tier === 'alleged'`, and `responsesTo()`.
- **Component:** energy `ContestedList` + `contestedDenominator`. Every allegation sits
  beside its response or the exact no-response sentence, at equal size, as a
  `ContestedFact` (`Domain.tsx`) pair.

### 5.7 Same lens, other side (shared, `id="symmetry"`)

- **Reads:** `{FLEET}_SYMMETRY` (verbatim, by domain) and `{FLEET}_BASE_RATES`
  (energy `BaseRateTable`, with the Wilson whisker where the denominator is ≥ 10;
  energy D11).
- **Caption:** "Each research sweep ran its lens on the other side too: UPA against NDA,
  critics against aligned associations, BlackRock against Vanguard, NBIM, GIC and LIC.
  The texts are the sweeps' own words."

### 5.8 What the record does not contain (shared, `id="missing"`)

- **Component:** `GapsPanel` (`Domain.tsx`), rendered at the same type size as the
  findings above it (14–15px body), never as a footer.
- **Reads:** `{FLEET}_VOIDS` (what, why it matters, sources) and `{FLEET}_GAPS` for the
  lens, plus `derivedGaps(f)`, which generates lines such as:
  - "State placement not exported (G1)" / "Holder percentages not structured (G3)" /
    "FCRA state table not transcribed (G4)", present only while the export is absent;
  - "{notPlaced} of {projects} projects not placed in any state";
  - "{openEnded} office-holder windows at the Ministry of Finance have no recorded end";
  - "{uncovered} approvals fall where no recorded office-holder window exists";
  - "{dupes} researched loan records repeat a counted World Bank project and are not
    counted" (G1), or "Whether researched loan records duplicate each other is not
    recorded (G1)";
  - "Union budget dates are not a dataset in this build";
  - "{fyMissing} financial years have no national FC total";
  - "{noResponseCases} case files carry no recorded response to any claim".
- **Header line:** "{v} voids and {g} gaps recorded by the research, and {d} derived by
  this page." Each void keeps its `whyItMatters` at full size.

### 5.9 Foot

`SourceLedger` (`Domain.tsx`): entries derived from the `srcs` of every row rendered in
the lens, grouped by domain, each tagged primary or secondary where the energy §5.14
regex applies. `TierLegend`. Standing note (HANDOFF "Standing", verbatim).

---

## 6. Encodings

### 6.1 Channels

| channel | means | where |
|---|---|---|
| `strokeDasharray` | evidence tier (`TIERS[t].dash`) | ribbons, bar outlines, timeline squares, matrix cell rule, lane bars, graph edges |
| node hue (`FAMILY_COLOR[fam]`) | node family | graph, Sankey nodes and ribbons (source family) |
| node shape (`ty`) | entity type | graph only |
| node size (`sz`) | declared magnitude band | graph only |
| sequential fill | the named quantity of that graphic only (₹ crore on the map; % on the matrix) | map, matrix |
| hatch | **not in this record**: no project placed, FY not in file, filing not read | map, bars, matrix |
| dotted ground + `—` | **looked and not named** (read, not ≥1%) | matrix only |
| rose rule | position of a response | timeline, case files, contested |
| open bracket `[ ]` | no response recorded | timeline |
| position (x) | date | lanes, timeline, rules |
| text | party, election winner, office title, action kind, ground | everywhere |

### 6.2 Frozen: the developer may not adjust these to make it fit

1. Tier is carried by dash on every mark that stands for a claim, including view
   aggregates, which take their weakest constituent tier. `alleged` and `documented`
   never render alike, in any theme, in greyscale or in a screenshot.
2. Family hue, type shape and declared size band are unchanged from `ForceGraph`. Sector
   and placement view nodes use `industry/market` and `state/state`, the platform's
   existing assignments. No new hue.
3. Hatch ≠ zero, and hatch ≠ "read, not named". Three textures, three meanings. None may
   be merged for looks.
4. No colour encodes party, religion, a verdict, or "foreign". Rose is response only.
5. Census and researched sample are never summed, stacked or drawn in one Sankey.
6. A loan without `a` is never coerced to 0, in any total, bar, band or sort.
7. The holder matrix never draws with fewer than four holder rows, and the comparison
   set rows are never removed by a filter.
8. Response cells are the same width and size as ground or claim cells.
9. Default sorts are by date or by a declared external quantity, never by a page-computed
   score, and never by money in the benefit or mandate tables.
10. The map's quantile bins are pooled over every year with no filters, and they do not
    move when the reader filters.
11. Captions are body size. The gaps panel is body size.
12. The exact strings: "amount not stated / in US$ m" and "No response recorded —
    asked/not asked unknown".

---

## 7. Filters and their effect on the denominator

| control | type | options | default | effect line | honours? |
|---|---|---|---|---|---|
| Lens | tabs | 3 | loans | tab counts | — |
| Year | `<select>` + coverage ribbon (one tick per year with ≥1 record in the lens, hatched years named) | years present in the lens | all | `{N} → {k} {unit} ({definition})` | loans: census legs all dated; researched undated records are named as "undated, shown under all years only". Capital: lines without a quarter date are named the same way |
| State | `<select>` of 36 with live counts | states | none | loans `{N} → {k} projects placed in {st}`; associations `{k} case files with registered office in {st} (marked, not filtered)`; capital "does not apply" | the control states "placement, not borrower" (loans) and "registered office" (associations) on its label |
| Lender | `<select>` grouped "World Bank (census)" / "Researched sample" | lenders in `loanRows()` | none | `{N} → {k} legs`; sample lenders add the sample sentence | — |
| Holder | `<select>` grouped "Comparison set" / "Domestic control" / "Other holders" | matrix rows | none | the row's count sentence | emphasises only; the control says "highlights a row — every holder stays in view" |
| Metric (`m`) | radio | ₹ crore · US$ m · projects | ₹ crore | coverage per option | `usd` is `aria-disabled` without G1, with the reason in its name |
| Stage/Table | toggle | 2 | stage | — | — |
| Reset | button | — | — | clears everything but `lens` and `view` | — |

There are no `party`, `religion`, `tier` or `amount` filters at page level. Tier and
amount filtering live inside the graph, which owns them (D32). A rail foot line reads:
"Not offered: party, religion and verdict filters, and why →", linking to §13.

---

## 8. Interactions

| action | result |
|---|---|
| Click a state (map, listbox, select) | sets `st`. The ledger row, Sankey and project table follow, and the readout updates. Clicking the selected state clears it |
| Click `NotPlacedBox` | filters the project table to unplaced projects (in-page), announced |
| Click a Sankey band | in-page filter of the project table to that band's legs, announced. It writes no URL param, because the band is a view object |
| Click a lender group header / leg | `sel={lender}` → graph opens focused (§5.4) |
| Click an award row's awardee | `sel={awardee}` |
| Click an A5 case-file header link | `sel={association}` |
| Click a matrix cell | opens the claim row in the twin, focus moves to it. `Show in graph` beside it sets `sel` |
| Click a C3 adviser | `sel={adviser}` |
| Change lens | clears `sel` and the graph's reserved params; focus goes to the lens heading |
| `Copy link` | copies `location.href` → `Link copied` |
| `Copy as TSV` on any table | the row array serialised, with the view URL as the first line |
| Escape | closes the open expandable row, then clears the latest selection (`sel` before `st`) |

On coarse pointers the first tap on a Sankey band, a timeline mark or a lane bar shows
its `title` text in a reserved one-line readout under the graphic, and a second tap
acts (energy D30). Device-neutral copy is used throughout ("open", "choose"), never
"hover" or "click" in captions (energy D33).

---

## 9. Loading, empty, partial and no-data states

| state | where | behaviour |
|---|---|---|
| Loading | route | Suspense fallback with PageTitle + Standfirst |
| Loading | graph | mounts on intersection; the placeholder states the node/edge counts it will draw |
| `META.empty` for a fleet | that lens | the stage prints "{fleet} register not yet promoted. Nothing below is zero." Strip facts read "not promoted". Tabs stay enabled |
| Export absent (G1–G4) | named components | the specific interim state in §5, and a derived gap line |
| Partial range | lanes, bars, timeline | the uncovered span is shaded and labelled per row. Axes are never clipped to the covered span |
| Partial amounts | ledgers, Sankey, project table | the excluded count sits beside every total |
| Filter empties a table | any | the most-removing filter is named, with a one-click reset for it |
| Unknown param | page | amber `ignored an unrecognised {param} value` |

---

## 10. Edge cases

| # | case | behaviour |
|---|---|---|
| E1 | Loan with no `a` (pre-1960 US$ only, JICA yen, aggregate) | prints **"amount not stated / in US$ m"** (+ US$ m when G1 has it). Excluded from every ₹ total, band, ramp and ₹ sort. Counted in "{k} with no ₹ amount excluded" beside each total (Review Focus 1) |
| E2 | Pipeline leg | "pipeline, not yet approved": excluded from ₹ and US$ totals, hatched in the lanes, its own ledger row |
| E3 | Blend project (IBRD + IDA legs) | one project row with two legs. Counts of projects count it once, ₹ sums both legs |
| E4 | Researched record duplicating a census project (same P-number) | G1: "counted under {P-number}", excluded from sums, row kept with its conditions. Without G1: no ₹ subtotal for researched records at all |
| E5 | Non-binding MoU or portfolio aggregate with an `a` | G1 `countable: false`: "not a commitment: {reason}", excluded. Without G1: as E4 |
| E6 | Borrower blank in the API | "(API blank — Union recorded by default)" |
| E7 | Implementing agency is a Union body seated in Delhi | not placed. Counted in "not placed" |
| E8 | Placement by project title only | basis `title` counted in the basis column. The map readout shows the basis split |
| E9 | State with no placed project | hatch, "no project placed here in this file". Never zero |
| E10 | `y` with no approvals | empty state naming adjacent years. `y` unchanged |
| E11 | `lender` is a sample lender while viewing the map | map note: "{lender} is not painted: the map shows the World Bank census" |
| E12 | Sector label differs only by taxonomy prefix | separate nodes (D9) |
| E13 | Office-holder window open-ended | listed with "end not recorded", sorted last. Counted in derived gaps |
| E14 | No window covers an approval date | "no recorded window covers {date}" |
| E15 | Award without a P-number | "awards not keyed to a World Bank project id" table |
| E16 | Debarment with open end | "open: no end date in the feed" |
| E17 | FY with two national totals | current drawn, superseded tick + twin row |
| E18 | FY with none | hatched slot "not in this file" |
| E19 | Multi-year FC total | listed under "Multi-year totals (not a year)", never a bar |
| E20 | FCRA action with no response to that claim | exactly **"No response recorded — asked/not asked unknown"**, plus the other-claims line when the case has responses elsewhere (Review Focus 4) |
| E21 | Response whose text says no denial applies (audit contra) | shown verbatim as a response record. The response count counts it, and its text says what it is |
| E22 | Undated response | "undated response" |
| E23 | Aggregate cancellation counts | separate table, never summed, header says they overlap |
| E24 | Association with registered office `null` | "registered office not recorded". `st` marking skips it and says so |
| E25 | Welfare join to a scheme id missing from `WELFARE_SCHEMES` | row kept, scheme shown as its id with "not in the welfare register" |
| E26 | Holder filter to BlackRock | row emphasised with "named ≥1% in 0 of {r}". Every other row stays (Review Focus 5) |
| E27 | Matrix would render < 4 holders | grid replaced by the "comparison set required" note. Twin still renders |
| E28 | Holder recorded under two ids | two rows, as recorded. Gaps line states the rule |
| E29 | Several lines for one holder × company | cell shows G3's own-line; twin lists all |
| E30 | `own` edge into a non-constituent | "Holdings outside the NIFTY 50" table |
| E31 | Constituent without `existingId` | hatched column `n/d` |
| E32 | Announced, not effective index change | printed, not applied |
| E33 | Rule with no benefit row | "no structured cui-bono row" + `d` verbatim |
| E34 | Mandate fee null / zero / Re 1 | "fee not disclosed" / as recorded with confidence. Never blank |
| E35 | Same narrative in two files with different ratings | both on the ladder, file named |
| E36 | `sel` not in the lens preset | lens switches first, then focus |
| E37 | `sel` reachable only through census legs | heading line + "Show its projects →" |
| E38 | Graph endpoint resolves nowhere | edge dropped from the graph only. Count printed under the canvas |
| E39 | 390px | §11. No horizontal page scroll |

---

## 11. Mobile at 390px

- No horizontal scroll of the page (`document.scrollingElement.scrollWidth ≤
  innerWidth`). Tables and the grid scroll only inside their own `overflow-x-auto`
  container, which carries a visible "scroll table →" cue and `tabindex="0"` with an
  accessible name.
- Tabs wrap to two lines if needed. They never become a hidden menu.
- The strip keeps two facts and the filtered chip. The rest move under the Byline.
- The rail collapses into a `<details>` "Filters ({active})", open when any filter is set.
  The one-line effect `{N} → {k}` stays **outside** the collapsed block.
- The map uses `height: clamp(300px, 70vw, 420px)` + `Open a state` select, with hatch
  pitch in screen pixels. `NotPlacedBox` sits under the map at full width.
- The Sankey, matrix and timeline render their twins by default, each with a `Show the
  diagram` button that renders the graphic in a scrolling container.
- The project table renders as stacked cards (energy `StackTable`): project, amount,
  placement and awards count first, with the other columns in a disclosure.
- The graph sits behind `Load the graph` (welfare D21).
- Viewport check: at 390×844 the strip, tabs, rail summary and the first ledger row are
  within the first 844px.

---

## 12. Accessibility

- **Outline:** `h1` PageTitle. Each lens stage has an `h2` (the lens name). Components
  are `h3`, and each case file is an `h3` in A5. Landmarks: `main`, `nav` (filters), the
  strip as `<section aria-label="Denominators">` with a hidden `h2`, and `footer`.
- **Tabs:** WAI-ARIA tabs pattern with manual activation. `aria-controls` points to
  the stage panel.
- **Map:** `role="listbox"` of state options (the WelfareMap pattern). Each option's name
  carries the readout. Enter selects and Escape clears. The SVG shapes are
  `aria-hidden`.
- **Sankey:** `role="img"` with a name stating the denominator ("{bands} bands, ₹{x}
  crore across {legs} legs; {excluded} legs without ₹ not drawn; a table follows").
  Ribbons stay focusable buttons (existing). A skip link reads "Skip the diagram to its
  table".
- **Matrix:** a real `<table>` with `<caption>`, `th scope="col"` on companies and
  `th scope="row"` on holders. Every cell's text includes its state in words (§5.3
  table). Selection state is `aria-current="true"` plus the visible "(selected)".
- **Lanes and timeline:** `aria-hidden` drawings. The twin tables are the accessible
  content. The label column holds buttons that open the row in the twin.
- **Graph:** canvas + `GraphA11y` overlay (existing). When `sel` opens it, focus moves to
  the graph section heading.
- **Text:** `<abbr title="crore">cr</abbr>` on first use per table. Numbers are
  `font-mono tabular-nums`. Contrast ≥ 4.5:1 for text and ≥ 3:1 for the hatch, dotted
  ground and dash strokes against `--color-bg`. The darkest ramp step is ≥ `#2e373f`.
- **Motion:** `prefers-reduced-motion`: no transitions on fills, no animated scroll, and
  the graph settles without animation.
- **Live region:** one, as §3.4.
- **Unavailable options:** `aria-disabled`, with the reason in the accessible name.

---

## 13. What the page refuses to show, and why

- **A ₹ total over all loans.** Census and sample, duplicates and MoUs make it false
  (F6, F7).
- **A map of loans by borrower**, or placement from a registered office (F1, F2).
- **A holder ranking.** Rows are the comparison set, then alphabetical.
- **BlackRock, or any holder, alone.** The four-row floor and the declared set.
- **A family, a religion or an ethnicity as a node, edge, filter or colour.** Narratives
  that name one are rated on the ladder only.
- **A classification of FCRA actions by keyword** (cancel, suspend), or of associations
  by religion or stance. `lab` is quoted verbatim.
- **A sum of overlapping cancellation counts.**
- **An FCRA receipts map by registered office.**
- **Party colour anywhere.** Party is text.
- **Budget marks invented from a calendar the data does not hold.**
- **A correlation or test between approvals and elections.** The lanes show both, and
  the month histogram shows the boring explanation.

---

## 14. Acceptance gates (for the blind RED suite, `scripts/pages/finance.test.mjs`)

Run against a pinned `FINANCE_DIST`, in two builds: FULL (current modules) and EMPTY
(`META.empty` modules). Criteria marked (G) have an interim and a post-export
expectation. Both are asserted, whichever the build has.

| id | criterion |
|---|---|
| FA-1 | `/finance` renders with no param. The Loans tab is selected. No `sel`, `st`, `lender` or `holder` is set, and no entity is highlighted |
| FA-2 | Each lens renders the strip, rail, graph section, ladder, contested, symmetry, gaps and sources sections in that DOM order |
| FA-3 | For a loan edge without `a`, its project-table cell contains exactly `amount not stated / in US$ m`. The ₹ total in L1 equals the sum of `a` over countable census legs with `a`, and never includes it (Review Focus 1) |
| FA-4 | Every ₹ total on the page has, within the same element, a count of excluded legs or records |
| FA-5 | (G) G1 absent: no map `svg` and no census Sankey `svg`, and the text "not exported in this build (G1)" appears. G1 present: the map listbox has 36 options, and states absent from placement carry the hatch fill and the word "no project placed" |
| FA-6 | No element in the loans lens prints a ₹ subtotal over researched records without G1 |
| FA-7 | The Sankey's caption names "World Bank (IBRD and IDA) only". No researched lender id appears as a Sankey node |
| FA-8 | The lanes twin has a general-elections column populated only from `Lok Sabha` rows, and the text "Union budget dates are not a dataset in this build" appears |
| FA-9 | For an approval date covered by an open-ended window, the office-holder cell contains "end not recorded" |
| FA-10 | A5: for every FCRA claim without a `contra` answering it, its response cell contains exactly `No response recorded — asked/not asked unknown` (Review Focus 4) |
| FA-11 | A5 response cells have a computed width ≥ 0.9 × the ground cells' width, and the same font size |
| FA-12 | The FC receipts bars render a hatched slot, labelled "not in this file", for every FY between the first and last recorded FY that has no current total |
| FA-13 | No multi-year FC total renders as a bar |
| FA-14 | The aggregate-counts table header contains "never added". No element prints their sum |
| FA-15 | The welfare join's denominator line reads `{k} of {WELFARE_SCHEMES.length}`, and every analytic row shows its innocent reading |
| FA-16 | (G) Matrix: with `holder=cap:blackrock`, ≥ 4 holder rows render (or, G3 absent, the grid is absent and the "Comparison set required" note is present). The BlackRock row's header contains "0 of" (Review Focus 5) |
| FA-17 | No matrix render path yields 1–3 rows. Fuzzed filters (`y` over every year present) never produce a grid with < 4 rows |
| FA-18 | Matrix cells are distinguishable in greyscale: the hatch, dotted-ground and value cells differ in pattern, not only in hue (pixel test on a screenshot converted to greyscale) |
| FA-19 | C5: the "{k} of {n} rules carry a structured cui-bono row" line is present, and each rule without one shows its `d` |
| FA-20 | The narrative ladder shows six rungs for each lens, with empty rungs reading "none in this file" |
| FA-21 | The gaps panel's font size equals the findings' body size, and it lists every `*_VOIDS` entry of the lens |
| FA-22 | Changing `lens` removes `sel` and every GraphExplorer-reserved param from the URL |
| FA-23 | `sel=fin:ibrd` opens the graph with the loans preset. The graph caption states the number of World Bank legs not drawn |
| FA-24 | 390×844: `scrollWidth ≤ innerWidth` on all three lenses, and with `holder=cap:blackrock` |
| FA-25 | No element's inline style or class maps party to a colour. The words "Rothschilds" and "family" appear only inside narrative claim text or the standing line |
| FA-26 | EMPTY build: every lens renders its "not yet promoted" line and no figure reads 0 where a count is unavailable |
| FA-27 | Every table offers `Copy as TSV`, and the TSV's first line is the current URL |
| FA-28 | Keyboard only: from the page top, the map listbox, the matrix table and the graph heading are each reachable in ≤ 25 tab stops at 1280 |

---

## 15. Decisions

| # | decision | alternative rejected | why |
|---|---|---|---|
| D1 | Ask for four reviewed generator exports (G1–G4) and specify every interim state | draw from `d` prose by regex; import `research/raw` | Prose holds several candidates per figure. The raw directory is quarantine |
| D2 | Tables first, graphic second, in DOM and at ≥1280 left of the graphic | graphic-first stage | The audience reads filings, and the table is the record the graphic summarises |
| D3 | The map title says "placed in", not "borrowed by" | "by borrowing state" as briefed | The Union borrows almost every loan (F1). The briefed title would be false |
| D4 | Placement only from G1's fetcher rule | `node.st` | Registered office paints Delhi with Union loans (F2) |
| D5 | "Not placed in any state" as the first ledger row and a box beside the map | footnote count | The majority of projects is the denominator of the map |
| D6 | No ₹ total over researched records until G1 marks countability and duplicates | sum all `loan` edges | Double counts and MoUs (F6) |
| D7 | Census and sample as two small multiples, never summed | one Sankey of all lenders | A census beside a sample always makes the census lender look dominant (F7) |
| D8 | The exact string "amount not stated / in US$ m", and exclusion from every ₹ figure | 0, or a blank cell | Review Focus 1. A blank reads as nil |
| D9 | Sector strings verbatim, with no taxonomy merge | map pre-FY17 onto FY17 labels | A merge rule is a hand-written crosswalk that no source supplies |
| D10 | Map metric default ₹ crore (house unit), US$ and project count offered, bins pooled and fixed | count default; per-filter bins | The brief asks for commitments. Fixed bins keep a shade's meaning |
| D11 | Lanes count projects, not ₹ | ₹ per year | Timing questions should not be dominated by a few large DPLs |
| D12 | "Office-holders whose window covers the date", with every window listed | "the minister at approval" | Role edges mix offices, and no loan names a minister (F9) |
| D13 | No budget marks; a void line in the lanes | infer budget dates from role-edge labels or a calendar rule | Nothing hand-written. Six anchors are not a calendar |
| D14 | Elections only from `WELFARE_ELECTIONS` Lok Sabha rows, earlier span shaded | a hand list of 1952–1999 elections | Nothing hand-written |
| D15 | FC receipts in FY slots with hatched missing years and superseded ticks | a line through the available points | A line interpolates across four missing years |
| D16 | No associations map. The state table waits for G4 | a hatched map of 36 states | A map of nothing but hatch says less than one gap line |
| D17 | Timeline lanes are case files ordered by first date | ordered by number of actions | Count ordering is a leaderboard of the accused |
| D18 | Action kind quoted, never classified | keyword chips (cancel/suspend) | Classifying prose is an assertion the fleet did not make |
| D19 | The no-response sentence is per claim, with an other-claims line | per case file | Review Focus 4 is about the claim. The case line prevents the misleading "silent" reading |
| D20 | Welfare join as two tables (scheme-keyed analytic; unkeyed payments) | one graph | Four analytic links do not make a network. The denominator is 78 schemes |
| D21 | A5 response column equal in width and size to the ground column | responses in an expandable row | Denials beside claims at equal size |
| D22 | Matrix rows: declared comparison set, control, then alphabetical | sorted by number of holdings | No computed ranking of real entities |
| D23 | `holder=` emphasises and never filters | filter to one row | Review Focus 5. Filtering to one holder displays it alone |
| D24 | Five distinct cell states, including "read, not named" ≠ "not read" | blank for both | An unread filing and a sub-1% holding are different facts |
| D25 | Without G3 the grid is not drawn, and the note plus the twin render | fallback rows from recorded lines | The fallback silently excludes BlackRock, the one row the brief requires |
| D26 | Mandate fee cells always say something ("fee not disclosed") | blank | A blank fee reads as free |
| D27 | Rules show `d` verbatim where no cui-bono row exists, and count the rows | derive a benefit line from text | The page does not write research |
| D28 | Narratives listed per file, never de-duplicated | merge by text similarity | Name/text matching is refused platform-wide. Rating disagreements are information |
| D29 | Year param semantics per lens, stated on the control | one calendar year everywhere | FCRA is by FY, and holdings by quarter |
| D30 | Page params avoid GraphExplorer's reserved names; a lens change clears them | a `g_` prefix inside GraphExplorer | No change to a shared component's URL contract |
| D31 | World Bank census legs excluded from the graph, with the count in the caption | draw them | ~430 parallel edges per lender show degree and hide everything else (F20) |
| D32 | No page-level party, religion, tier or amount filters | as on /welfare | Party is text. Tier and amount belong to the graph that owns them |
| D33 | The comparison set's standing line in the header | only in the capital lens | The trope protection is structural and belongs to the page, not one lens |
| D34 | Below 640 the Sankey, matrix and timeline show twins by default | shrink the SVG | A 960-unit viewBox at 390px halves every label |

---

## 16. Deferred items

| # | item | why deferred |
|---|---|---|
| X1 | A Union budget calendar dataset (`research/raw/budgets.json` with sources) to draw lane 4 | no source in the register |
| X2 | Lok Sabha elections 1952–1999 in `WELFARE_ELECTIONS` (or a shared elections file) so lanes cover pre-2004 approvals | research, not design |
| X3 | Loan conditions for the census (prior actions, DLIs) from Program Documents | Projects API void |
| X4 | Disbursement, not only commitment | not in the API fields fetched |
| X5 | Real-terms ₹ (deflated) as a metric option | needs a declared deflator series in the register |
| X6 | FCRA association-level receipts by year (FC-4 returns) | portal unreachable |
| X7 | A structured `action` field on FCRA enforce claims (cancel/suspend/refuse/prior-permission) so the timeline can use glyphs | contract change for the NGO fleet |
| X8 | An `asked` field on contra (asked, no reply / not asked) | contract change (energy C14) |
| X9 | Cross-fleet identity reconciliation (Temasek, OSF, Manmohan Singh pairs) | reconciliation editor |
| X10 | KfW, IMF programme data | blocked sources, recorded as voids |
| X11 | SEBI licence comparators beyond the file's three | research |
| X12 | The SOTA §6 path strip and tenure strip inside the graph card | shared explorer work (plan Task 9) |

---

## 17. Risks for review

1. **This design depends on four generator changes for five graphics.** If the judge wants
   graphics on day one, the fallback is to draw the map from G1 alone (the smallest
   change: the fetcher already computes every G1 census field) and ship C2 as its twin.
   What this spec will not accept is drawing from prose.
2. **The comparison-set guarantee rests on G3 `CAPITAL_CONTROLS`.** The capital SPEC that
   declares the set lives in the session scratchpad, not the repository. It must be
   promoted to `research/raw/capital/` before G3 can be built.
3. **The Manmohan Singh 1991 FM window is open-ended** (`energy:manmohan-singh`,
   `1991-06..`). Under the "covers the date" rule it covers every later approval. The
   page marks it "end not recorded", but the research record should gain a `to`.
4. **Twelve researched loan records duplicate census projects, and AIIB CARES appears
   twice with two ₹ figures.** Until reconciliation marks them, the researched table has
   no subtotal. A reader may take that as a missing feature, and the gap line says why.
5. **Holder ids split one institution across two rows** (`cap:temasek` /
   `cap:temasek-holdings`). The matrix shows two rows until reconciled. This is honest,
   and it looks like a bug.
6. **The FCRA named cases are ~0.1% of cancellations.** A timeline of 26 case files can
   still read as "the crackdown". The aggregate table and the base-rate row sit in the
   same frame to prevent that. The UX review should test whether they do.
7. **Sector taxonomy split (D9)** doubles the middle column of the Sankey. If readers find
   it unreadable, the remedy is a sourced crosswalk from the World Bank, not a
   hand-written one.
8. **The census ₹ total mixes 75 years of nominal rupees.** The caption says so. A
   deflated option is X5.
9. **Scratchpad hygiene.** While preparing this draft, designer A's probe scripts were
   first written to the shared session scratchpad under generic names (`a1.mjs`–`a9.mjs`,
   `b1.mjs`, `b2.mjs`, `data.mjs`, `entry.ts`), which may have overwritten earlier
   throwaway files of the same names. Later probes were moved to `scratchpad/designA/`.
   No repository file was touched besides this spec.
