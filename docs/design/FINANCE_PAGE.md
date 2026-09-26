# /finance: Foreign money (design spec, judged)

*Status: judged spec for `/finance`, 2026-09-26, synthesised from two candidates that stay
on file: `FINANCE_PAGE.candidate-A.md` (evidence-first) and `FINANCE_PAGE.candidate-B.md`
(reader-journey-first). The scores and the record of what came from where are in
`FINANCE_JUDGEMENT.md`. Binding brief: spec
`docs/superpowers/specs/2026-09-26-foreign-money-ngos-tenders-design.md` §4.7 and the
Review Focus of `docs/superpowers/plans/2026-09-26-foreign-money-ngos-tenders.md`. House
form: `ENERGY_PAGE.md`, `WELFARE_PAGE.md`. Skills: `interface-design`, `india-map`,
`graph-schema`, `cui-bono`; `docs/research/GRAPH_UI_SOTA.md` §6.*

*Data contract: `src/graph/finance.generated.ts`, `src/graph/ngo.generated.ts`,
`src/graph/capital.generated.ts` (each exporting `{FLEET}_NODES`, `_EDGES`, `_EDGE_DOMAIN`,
`_BENEFITS`, `_VOIDS`, `_NARRATIVES`, `_BASE_RATES`, `_SYMMETRY`, `_GAPS`, `_IDENTITY`,
`_META`); `WELFARE_SCHEMES` and `WELFARE_ELECTIONS` from `src/data/welfare.generated.ts`;
`NIFTY50`, `INDICES_AS_OF`, `INDEX_CHANGES`, `INDEX_SOURCES`, `indexCoverage()` from
`src/data/indices.ts`; `TIERS` from `src/graph/schema.ts`; `FAMILY_COLOR`, `FAMILY_LABEL`,
`PRED_LABEL` from `src/components/viz/ForceGraph.tsx`; the merged graph from `useData()`
only to resolve endpoint labels outside the three modules.*

**No figure in this document is page copy.** Every `{brace}` the page prints is derived at
module scope in `src/data/financeView.ts`, or in a `useMemo` keyed on the parsed URL. The
counts in §0.2 are the judge's reading of the modules on 2026-09-26. They justify
decisions and may not be copied into a component. The modules were regenerated after both
candidates were written (§0.2), and will be again: **the page prints module counts only**.

---

## 0. Judge's note

### 0.1 Scores

Full per-section scores are in `FINANCE_JUDGEMENT.md` §2. In summary (sum of six axes,
fidelity · honesty · buildability · time-to-figure · accessibility · mobile, over 30
sections): **A 386, B 421. B is the base.** B draws every briefed graphic today from
structured fields with the denominator inside each frame, and names the reader and the
interaction count for every component. A withholds five graphics until four generator
exports land; its interim for the holder matrix is a note in place of a grid. A is
stricter on several channels and denominators, and those rules are grafted in (§0.3).

### 0.2 Facts about the modules that decide the design

Read from the generated modules and `research/raw/` on 2026-09-26, after commits
`2c78af4`, `78a8dcb` and `bbafdfb`, which post-date both candidates. Design evidence, not
page copy.

| # | Fact | Consequence |
|---|---|---|
| F1 | Finance is `run-c94694294b1f`: 1,171 edges, 947 `loan`, of which 849 are the scripted World Bank projects table (`FINANCE_EDGE_DOMAIN[id] === 'worldbank-projects'`) and 98 were researched by hand in four domains (`adb-aiib`, `bilateral-china`, `worldbank`, `literature`). Both candidates profiled `run-989d2c6a4b16`. | Two loan populations: a **census** and a **researched sample**. They are never summed or drawn in one Sankey (D4, D5). Every count is derived (D2). |
| F2 | 53 loan edges carry no `a`: pre-1960 US$-only records (the FX series starts 1960), pipeline records, and records whose amount is not stated. Each `d` says which. No loan has `a === 0`. | "amount not stated / in US$ m", in no ₹ total, counted beside every total (Review Focus 1, D6). |
| F3 | Twelve researched records repeat a census project (same `P######` in `lab`) with no `supersededBy`. AIIB's CARES loan appears in two files at two ₹ figures; an ADB facility sits beside its tranches; three records are non-binding MoUs, one is a portfolio aggregate. | Researched records are listed and drawn one mark each, never summed, even after reconciliation (D5). |
| F4 | The borrower `t` is `min:ministry-of-finance` for 865 loans; the API leaves the borrower blank for 504 of 849 census legs and the fetcher records the Union by default, saying so in `d`. State governments (`ty: 'state'`) are the borrower on 12 loans; state bodies (`psu`/`agency` with an `st`) on a few dozen. **No per-loan state or sector field is exported**, but `research/raw/finance/worldbank-projects.json` `projects[]` already carries `state` (454 of 1,117 rows under the fetcher's rule), `major_sector_name` (977), `sector1` (780), `lendinginstr` (860), `pipeline`, `borrower_id`, `impagency_ids`, and `provenance.totals`. | The map is titled "placed in", never "borrowed by" (D7). Interim placement is the strict structural rule; G1 (an assembler **copy** of `projects[]` fields, not new research) adds the fetcher's rule as a second labelled class and the sector column (D8, D9). |
| F5 | Under the strict rule (a `ty: 'state'` node as borrower or as the benefit `who`), roughly a quarter of counted census ₹ is placed. The fetcher's rule places about 37% of US$ (base-rate rows, domain `worldbank-projects`). A registered-office rule would put SIDBI in Uttar Pradesh and every Union body in Delhi. | The UnionBar puts placed vs Union-or-not-placed in the map's frame. State bodies are a stipple class. Registered office is never used for placement (D7, D8). |
| F6 | `terms.instrument` is set on 857 loans; `terms.conditions` is non-empty on 66; every census leg has null rate, tenor and grace (Projects API void). | The flow's middle column is the instrument until sector is exported (D9). Conditions coverage is a strip fact; an empty list prints "none recorded" (D16). |
| F7 | 34 `award` edges; 28 carry a `P######` token in `lab` (World Bank projects), 6 (RRTS packages, ADB-financed) do not. 24 debarments from `fin:world-bank-sanctions-system`. | Contracts join loans by token until `projectId` is exported; unattached awards attach to their awarder (D12). |
| F8 | 22 `role` edges into `min:ministry-of-finance` mix Finance Ministers, DEA Secretaries and budget acts; 12 role windows across the fleet are open-ended (`energy:manmohan-singh` from 1991-06 among them); 5 are point-dated acts. Two voids record that no loan document opened names a minister as signatory. | "Ministers at approval" becomes **office-holders whose recorded window covers the date**, in three sub-blocks (covers / start recorded, end not / acts on the date), with the date-test sentence (D17). |
| F9 | `WELFARE_ELECTIONS` has 5 `Lok Sabha` rows (2004–2024) and 98 assembly rows. There is no Union-budget dataset; budgets appear only as a handful of point-dated role claims. | Lok Sabha rules from 2004; the earlier span is shaded "not in this register"; a budget void line and no invented marks (D18). |
| F10 | NGO is `run-9d6a4ce89975`: 292 edges; 92 `enforce` (65 from MHA or `ngo:mha-foreigners-division`, the rest from courts, CAG, the Supreme Court and agencies), 76 `contra` every one targeting `claim:{id}`, 64 undated; 43 enforce edges have no response to that claim. Stated grounds are separate `alleged` enforce edges on the same target. Ten enforce edges target aggregate ids (population counts that overlap: 20,600 cancelled to 2021-02; 21,983 cumulative). | One lane per target; grounds render as their own rows; responses join by `claim:` id; the exact no-response sentence per claim (Review Focus 4, D23); aggregate counts are annotations and a table headed "never added" (D24). |
| F11 | 14 national FC rows (`grant`, `ngo:foreign-sources-aggregate → ngo:fcra-associations-aggregate`): single-FY values for 10 of the 14 FYs 2011-12 → 2024-25, three superseded alternatives, one three-FY total. FY2012-13, 2013-14, 2022-23 and 2023-24 have none. The FY2019-20 → 2021-22 state-wise annexure (RS Q.3253) is recorded only as its column sums, three states in prose and one base-rate row. | FY axis with hatched missing years, superseded ticks, the multi-FY bracket (D21). No FCRA state map or table until state rows are records (D22). |
| F12 | Two NGO edges touch a `scheme:` id (both `analytic`); the `darpan-welfare-join` domain holds further rows about associations in welfare delivery with no scheme id. | The welfare join prints linked and unlinked rows with "{k} of {WELFARE_SCHEMES.length}" (D25). |
| F13 | Capital is `run-8d96ad5f346d` regenerated at `78a8dcb`: 231 edges; 116 `own` from 41 holders into 48 targets; `a` is set on 4; the percentage is prose in `d` (109 of 116), often with several figures per record. | No percentage is parsed from prose; a cell reads its state in words (D26). |
| F14 | A domain `holders-aggregates` (19 claims) adds **analytic** `own` edges: BlackRock into 10 NIFTY 50 companies, Vanguard into 5, NBIM into 1, each a **lower-bound aggregate of US-listed ETF holdings files** whose largest single fund line is below the 1% naming threshold, each with an innocent reading; plus an analytic LIC-vs-BlackRock comparison and a `law` edge (`cap:sebi-shp-1pct-threshold → cap:blackrock`). | A cell is either a **filing line** or an **aggregate (analytic)**, by `CAPITAL_EDGE_DOMAIN`, never merged in any count or wording (D24). |
| F15 | `CAPITAL_IDENTITY` entries whose `publicRole` begins `Mandatory comparison control` are six: ADIA, Capital Group, Fidelity, GIC, KIA, NBIM. BlackRock's and Vanguard's roles do not carry the phrase. LIC (`co:life-insurance-corporation`, 29 lines) has no identity entry; the `holders` symmetry text names it as the domestic control. `cap:temasek` and `cap:temasek-holdings` are two ids. | Band A is the six declared controls (≥ 4, so the floor holds); BlackRock and Vanguard sit in Band B on their lines; a structured controls export (G3c) is requested to pin subjects and the control (D22, D23). Ids are never merged by name (D41). |
| F16 | All 22 capital `law` edges lack a `CAPITAL_BENEFITS` row; 8 carry an `innocentReading`. 28 `award` edges (mandates, sales, licences) with 14 benefit rows; fees are `null`, `0` (Re 1 bids) or absent. Awards from `sebi` are licences. | Rule cards print the amber "no cui-bono row" line and the `d`; the count line "{k} of {n}" is in the frame (D34). Licences are their own table by awarder id (D30). |
| F17 | 70 narratives across the three modules; the same claim recurs across files with different ratings. | Per-lens ladders, listed as recorded, never de-duplicated by text (D42). |
| F18 | `GraphExplorer` owns `tier fam pred ty q amt from to sel focus hops path`. 849 census legs run between two lenders and one borrower. | The page shares `tier` and `sel` by design and never writes the rest except through "Show connections" (D35); the census is excluded from the graph with the count in the status line (D36). |
| F19 | `WelfareMap` reads only `r?.cls` from its row map; `TenureLanes` imports `ASOF` and `EDGE_BY_ID` from `src/data/energy.ts`; `GapsPanel`, `DenominatorStrip`, `NarrativeLadder`, `StackTable`, `BaseRateTable`, `ContestedList`, `SourceLedger`, `IndexChips`, `Callout` exist with the props assumed here. | Reuse over new components, with two bounded changes (D20, D39). |

### 0.3 What was taken from where

B supplies the spine (readers, paths, anatomy, margin, `Find`, `ReconciliationLine`,
`RecordCard`, `OfficeOnDate`, `LoanMap` on `WelfareMap` with the UnionBar, `LoanFlow` on
instrument, `LoanClock` on `TenureLanes`, `RecordsStrip`, `ProjectList`, `ReceiptsByYear`,
the void card, `ActionsTimeline`/`ActionsList`, `HolderMatrix` bands and mobile transpose,
`AdviserComparison`, rule cards, the union graph, derived gaps, TSV `#` header, shared
`tier`, refusals at `#refusals`, gates computed independently of `financeView.ts`).

A supplies: the standing line in the header; "Not placed in any state" as the first
ledger row and the placement-basis column on G1; sector strings verbatim with no crosswalk;
the census/sample small-multiple rule; the Union-budget void line, the month-of-approval
histogram, the pre-2004 shading and a project-count lane; the "(API blank — Union recorded
by default)" marker; `DebtContext`; base-rate rows under debarments; registrations rows
under receipts; the aggregate-counts table headed "never added"; lane order by first
action; the other-claims line under the no-response sentence; `LicencesTable`; "fee not
disclosed"; "{k} of {n} rules carry a structured cui-bono row"; the "show every register's
narratives" toggle; the handling of a `sel` only census legs reach; pooled fixed map bins;
400-row pagination in `tp`; Escape order; equal-width response cells; the tab-stop budget;
eleven acceptance criteria; the refusals list.

The judge adds D24 (aggregates), the correction of Band A to six (D22), the prerequisites
table that marks G1 as a copy, and the run-drift rule. Every conflict is resolved in §15.

---

## 1. Purpose and readers

### 1.1 Purpose

`/finance` records foreign money in three forms, on one stage:

- **Loans:** sovereign and sub-sovereign external lending (World Bank census; ADB, AIIB,
  NDB, JICA, AFD, US DFC and Chinese official lenders as a researched sample), the
  contracts it paid for, the firms debarred under it, and the office-holders whose
  recorded windows cover each approval.
- **Associations:** foreign contributions to Indian associations under the FCRA, national
  totals with their Parliament-answer sources, and the Home Ministry's actions with each
  association's response.
- **Capital:** foreign holders in NIFTY 50 filings beside a declared comparison set, the
  mandates foreign advisers won on disinvestments, SEBI and RBI licences and rules with
  their cui-bono record, and the circulating narratives on the six-step ladder.

The page records **institutions**. Rothschild & Co and BlackRock Inc. are companies shown
beside comparison companies. A narrative that names a family, a religion or an ethnicity
appears only on the ladder, as a claim about the world with its rating; never as a node,
an edge, a filter or a colour. The page asserts no motive and takes no view on whether
foreign money is legitimate. Its claim about itself is narrow: *this is what the register
holds, how much of it can be summed, and what it cannot show.*

### 1.2 The three readers

| Reader | Arrives with | Must leave with | Distrusts the page when |
|---|---|---|---|
| **J**, journalist on deadline | a name: a state, a lender, an association, "BlackRock" | one record: amount with its kind, date, tier, source, response, and a citation copied | the figure has no source; the response is missing or smaller than the claim; the thing cannot be found in two tries |
| **P**, policy researcher who exports | a population question: "World Bank lending by state since 2014", "FCRA receipts by year" | a TSV whose rows and columns reproduce the graphic, with the population definition, the exclusions and the run id | a total mixes populations; an export differs from the screen; a filter changed the denominator silently |
| **S**, hostile skeptic hunting the missing control | a suspicion, in either direction | the control in the same frame; the exclusion ledger; the boring explanation; the narrative's strongest counter | one holder appears without its peers; one era without the other; a duplicate is summed; "none" means "not searched" |

---

## 2. The reader's questions and the two-minute paths

### 2.1 Questions, in order (answered at rest at 1280×800 unless a step is named)

| # | Lens | Question | Answered by |
|---|---|---|---|
| L1 | Loans | How much has been lent, by whom, and how much of that can the record sum? | strip, `ReconciliationLine` (§5.0), `UnionBar` (§5.1.1) |
| L2 | Loans | Where was it placed, and how much could not be placed? | `LoanMap` + `UnionBar` (§5.1.1) |
| L3 | Loans | Through which instruments (sectors, once exported), from which lender? | `LoanFlow` (§5.1.2) |
| L4 | Loans | When, against which general elections, under which office-holders? | `LoanClock` (§5.1.3), `OfficeOnDate` (§5.1.7) |
| L5 | Loans | Which other lenders are recorded, and why are they not summed? | `RecordsStrip` (§5.1.4) |
| L6 | Loans | What did it pay for, who won, who was debarred? | `ContractsTable`, `DebarmentsTable` (§5.1.8–9) |
| L7 | Loans | Against what? | `DebtContext` (§5.1.11) |
| A1 | Associations | How much came in each year, and which years are missing? | `ReceiptsByYear` (§5.2.1) |
| A2 | Associations | Where? | `StateReceipts` void card (§5.2.2) |
| A3 | Associations | Whom did the Ministry act against, on what stated ground, and what did they say? | `ActionsTimeline`, `ActionsList` (§5.2.3–4) |
| A4 | Associations | How does that compare with all cancellations? | aggregate-counts table and base rates (§5.2.3) |
| A5 | Associations | Who gives to whom? | `GrantsNamed` and the graph presets (§5.2.5) |
| A6 | Associations | Which welfare schemes run through associations? | `WelfareJoin` (§5.2.6) |
| C1 | Capital | Which named foreign holders cross 1% in which NIFTY 50 filings, beside the comparison set? | `HolderMatrix` (§5.3.1) |
| C2 | Capital | Who advised on disinvestments, and what was paid? | `MandatesTable`, `AdviserComparison` (§5.3.3) |
| C3 | Capital | Which licences and JVs, on what timeline against comparators? | `LicencesTable` (§5.3.4) |
| C4 | Capital | Which rules moved the terms, and who is recorded as benefiting? | `RulesTimeline` (§5.3.5) |
| all | — | Which narratives hold up? | `NarrativeLadder` (§5.4.2) |
| all | — | What is missing? | "What this lens cannot show" and the Gaps panel (§5.4.3, §5.5.3) |

### 2.2 The two-minute paths

Interaction counts are clicks, taps or typed submissions from a cold load of `/finance`.
Gates FG-40–42 script six of them at 1280×800 and 390×844.

| # | Reader, question | Path | Steps |
|---|---|---|---|
| L-J | J: "Did the World Bank lend to Kerala, how much, when, who held the Finance Ministry?" | type `Kerala` in Find → pick the project from ≤ 8 results → `RecordCard`: amount with kind, approval date, lender, borrower, implementing body, `OfficeOnDate`, conditions, sources → Copy citation | 3 |
| L-P | P: "World Bank lending by state since 2014, as a table" | rail Year From = 2014 → Table view → Download .tsv (population, placement rule and inclusion columns included) | 3 |
| L-S | S: "You summed things twice and you only show one party's states" | at rest: `ReconciliationLine` gives census counted / not stated / researched not summed; `UnionBar` gives placed vs Union-or-not-placed; `ControlCard` quotes the UPA-vs-NDA symmetry text; caption C1 says why only {placedPct} is on the map | 0 |
| A-J | J: "Was Oxfam India's FCRA cancelled, on what ground, what did Oxfam say?" | tab Associations → type `Oxfam` → the block in `ActionsList`: each action with date, actor, stated ground, tier, and the response beside it at equal size → Copy citation | 3 |
| A-P | P: "National FCRA receipts by year, with sources" | tab Associations → `ReceiptsByYear` at rest → Download .tsv | 2 |
| A-S | S: "You only show one government's cancellations of critics" | tab Associations → the timeline at rest shows every recorded action from the first dated one, with Lok Sabha rules; the earlier government's actions sit in the same frame; `ControlCard` quotes the `fcra-actions` symmetry text and the base rate "{named} named case files of {all} cancellations" | 1 |
| C-J | J: "Does BlackRock own a big slice of Indian companies?" | tab Capital → click the row label "BlackRock": the row is accented, never isolated; its summary reads "{lines} filing line(s) · {aggs} aggregate(s), analytic, in {r} companies with a named holder"; Band A sits above; a cell quotes the record; the ladder rung "BlackRock and Vanguard own India" is one link away | 2 |
| C-P | P: "Named ≥1% foreign holders in NIFTY 50, long form" | tab Capital → Download .tsv under the matrix | 2 |
| C-S | S: "Rothschild runs Indian privatisations" | tab Capital → `AdviserComparison` at rest: Rothschild & Co beside every adviser the fleet declared as a control, same columns → the ladder rung with strongest case, strongest counter, what would change it | 1–2 |
| any | J or S: "Who is connected to {lender / association / adviser / contractor}?" | click the name → "Show connections" → the graph opens with the node in focus, one hop, `loan` and `grant` labelled | 1 |

---

## 3. Route, data, URL contract

### 3.1 Route

- Lazy route `/finance` in `src/App.tsx`; nav entry "Foreign money" in `Layout.tsx`
  (icon `Landmark`). `scripts/smoke.mjs` gains `/finance`, `/finance?lens=loans&y=2019`,
  `/finance?lens=associations`, `/finance?lens=capital`,
  `/finance?lens=capital&holder=cap:blackrock`, `/finance?view=table`.
- Outer element `<article className="pb-20">`, no inner `max-w`. Prose caps at
  `max-w-[72ch]`. Tables, the map, the flow and the matrix take the layout width and
  scroll horizontally **inside their own container** only.
- `Suspense` fallback: the PageTitle and Standfirst text (energy D32).

### 3.2 Data (static, compiled in)

The page imports only from `src/data/finance.ts` (re-exports of the eleven names per
module and the prerequisite shims, each `null` when the generator has not emitted it),
`src/data/financeView.ts` (every derivation, pure, at module scope or memoised on the
parsed filters), and `useData()` for labels of endpoints outside the three modules
(`co:`, `pol:`, `wel:`, `energy:` ids). **No literal figure appears in
`src/pages/Finance.tsx` or `src/components/finance/*`** (FG-3).

**Anchors** (the only literals the derivations hold; checked at module load, and a missing
one fails `scripts/pages/finance.test.mjs` FG-1):

```ts
export const CENSUS_DOMAIN = 'worldbank-projects';          // FINANCE_EDGE_DOMAIN value
export const AGGREGATES_DOMAIN = 'holders-aggregates';      // CAPITAL_EDGE_DOMAIN value (D24)
export const AGG_SOURCE = 'ngo:foreign-sources-aggregate';  // NGO_NODES id
export const AGG_RECIPIENT = 'ngo:fcra-associations-aggregate';
export const MOF = 'min:ministry-of-finance';
export const SANCTIONS = 'fin:world-bank-sanctions-system';
export const CONTROL_ROLE_PREFIX = 'Mandatory comparison control'; // CAPITAL_IDENTITY.publicRole (interim, D22)
```

**Named derivations in `financeView.ts`** (each unit-tested in
`scripts/finance-view.test.mjs` against a fixture; each returns rows *and* the denominator
sentence that goes with them):

| export | reads | definition |
|---|---|---|
| `nodeOf(id)` | the three node arrays, then `useData().nodes` | first hit wins; unresolved → `{id} (not in the register)` in amber mono, never blank |
| `LOANS` / `CENSUS` / `RESEARCHED` | `FINANCE_EDGES`, `FINANCE_EDGE_DOMAIN` | `pred === 'loan'`; census = domain `CENSUS_DOMAIN`; researched = the rest (plus the one `CAPITAL_EDGES` loan, listed under researched) |
| `hasRupee(e)` | `e.a` | `typeof a === 'number' && Number.isFinite(a)`. **Zero is a number and prints as recorded; `undefined`/`null` is never 0** |
| `inclusion(e)` | the above | `census-counted` · `census-no-rupee` · `researched-listed` · `researched-no-rupee` |
| `rupeeTotal(rows)` | rows | Σ `a` over `census-counted` rows only. **The only ₹ summation for loans on the page** |
| `projectKey(e)` | G1 `project` when present, else the first `/\bP\d{6}\b/` in `lab` (**census legs and awards only**; researched labs are not scanned) | `null` when neither exists |
| `projectGroups(f)` | census legs by `projectKey` | one project row per key; blend projects fold IBRD and IDA legs |
| `placement(e)` | `nodeOf(e.t)`, `FINANCE_BENEFITS` by `claimId`, `nodeOf(who)`; G1 `st`/`stBasis` | interim `{st, rule}`: `t.ty === 'state'` → (`t.st`, `state government is the borrower`); else `who.ty === 'state'` → (`who.st`, `state government implements`); else `null` with the rule `Union body` / `corporate borrower — head office is not where the money went` / `no state government named`. With G1: a second class `fetcher` = G1 `st` when the strict rule gives `null`, with `stBasis` (`borrower-state` · `agency-state` · `agency-seat` · `title`) as the basis column (D8) |
| `bodyState(e)` | the same | a state body's registered state when `who.ty ∈ {psu, agency, fund}` and `who.st ∉ {null, 'dl'}`; the stipple class only |
| `instrumentOf`, `conditionsOf`, `yearOf`, `isFutureDated`, `lenderOf` | `terms`, `from`, `FINANCE_META.asOf` | as recorded; `null` instrument → `instrument not in the record`; `[]` → `none recorded`; `from > asOf` → "approval date after the register date" |
| `sectorOf(e)` | G1 `majorSector` | `null` until G1; **strings verbatim, no crosswalk across the FY2017 taxonomy change** (D9) |
| `CONTRACTS`, `contractsFor(loan)`, `unattachedContracts` | `pred === 'award'` in `FINANCE_EDGES`, `projectKey` | joined by key; no key → grouped by awarder `s` |
| `DEBARMENTS` | `pred === 'enforce' && s === SANCTIONS` | with `responsesTo` |
| `RULES_FIN` | `pred === 'law'` in `FINANCE_EDGES` | each with its benefit row or `null` |
| `responsesTo(id)` | the three modules' edges | `pred === 'contra' && t === 'claim:' + id` |
| `officeOnDate(date, nodeIds)` | `role` edges from `FINANCE_EDGES` ∪ `useData().edges` with `t ∈ nodeIds` | three groups: **covers** (`from ≤ date ≤ to`), **openEnded** (`from ≤ date`, no `to`), **sameDay** (`from === to === date`). Dates compare at the record's precision (`YYYY` ≤ any date in that year) |
| `datedActs` | `role` edges with `from === to` into `MOF` | drawn on the clock with `lab` verbatim |
| `LOK_SABHA`, `assemblyFor(st)` | `WELFARE_ELECTIONS` | `election === 'Lok Sabha'`; `election === 'assembly' && st` |
| `approvalsByYear(f)`, `approvalsByMonth(f)` | census `projectGroups` by `from` | project counts, not ₹ (D18) |
| `NATIONAL`, `fyOf`, `FY_AXIS`, `SECTOR_DONORS`, `NAMED_GRANTS`, `REGISTRATIONS` | `NGO_EDGES` | national: `grant`, `AGG_SOURCE → AGG_RECIPIENT`; `fyOf` single FY when `from` is `YYYY-04(-01)` and `to` is in `(YYYY+1)-03`, else a span; `FY_AXIS` every FY from min to max start year, **missing FYs included**; registrations: `analytic` edges with `s === t === AGG_RECIPIENT` |
| `STATE_ROWS` | `NGO_EDGES` | `grant` from `AGG_SOURCE` into a node with `ty === 'group'` and `st` (empty until P5) |
| `ACTIONS`, `POPULATION_ACTIONS`, `caseFiles()` | `NGO_EDGES` `pred === 'enforce'` | grouped by `t`; `t === AGG_RECIPIENT` or an id containing `aggregate` → population; `nodeOf(t).ty === 'ministry'` → the "Courts and oversight" lane; the rest → one case file per target, ordered by first dated action, then label (D23) |
| `WELFARE_JOIN` | `NGO_EDGES`, `NGO_EDGE_DOMAIN`, `WELFARE_SCHEMES` | linked: an endpoint starts `scheme:` and is in `WELFARE_SCHEMES`; unlinked: domain `darpan-welfare-join` and not linked; a `scheme:` id absent from the register prints "scheme id not in the welfare register" |
| `COLUMNS` | `NIFTY50` | every constituent, sorted by `name`; column id `existingId`; a `null` id is a hatched column "no company record" |
| `OWN_IDX`, `OWN_OUTSIDE` | `CAPITAL_EDGES` `pred === 'own'` | targets in / not in `COLUMNS` |
| `lineKind(e)` | `CAPITAL_EDGE_DOMAIN` | `'aggregate'` when the domain is `AGGREGATES_DOMAIN`, else `'filing'` (D24) |
| `BAND_A` | `CAPITAL_IDENTITY` (interim) / G3c `CAPITAL_CONTROLS` | interim: ids whose `publicRole` starts with `CONTROL_ROLE_PREFIX`, sorted by label; with G3c: rows with `role ∈ {comparison, subject, domestic-control}` in declared order |
| `BAND_B` | `OWN_IDX` | distinct `s` not in `BAND_A`, sorted by label |
| `columnStatus(c)`, `quarters(c)`, `cell(h, c)` | `OWN_IDX` | `researched` if any edge targets `c` else `no-record`; distinct `from`; `{state: 'line' \| 'aggregate' \| 'not-named' \| 'no-record', edges}` |
| `pctOf(e)` | P4 `pct` | `null` until P4. **Never parsed from `d`** |
| `AWARDS_CAP`, `MANDATES`, `LICENCES` | `CAPITAL_EDGES` `pred === 'award'`, `CAPITAL_BENEFITS` | licences: `s === 'sebi'` (awarder id, structural); mandates: the rest (D30) |
| `licenceTiming(l)` | `LICENCES`, `law` edges naming the same licensee | months between the application claim's `from` and the award's `from`, **only when both exist** |
| `ADVISERS` | `CAPITAL_IDENTITY` | ids whose `publicRole` matches `/adviser/i`, sorted by label |
| `RULES_CAP` | `CAPITAL_EDGES` `pred === 'law'`, `CAPITAL_BENEFITS` | each with benefit row or `null`, `supersededBy`, `innocentReading`, `upgradeIf`, `killIf` |
| `moduleFor(lens)` | — | `{nodes, edges, domainOf, benefits, voids, narratives, baseRates, symmetry, gaps, identity, meta}` |
| `GRAPH_NODES`, `GRAPH_EDGES` | all three modules | edges = `FINANCE_EDGES` minus `CENSUS` ∪ `NGO_EDGES` ∪ `CAPITAL_EDGES`; nodes = `nodeOf` over every endpoint plus the modules' nodes; an endpoint resolving nowhere drops its edge, and the count is printed (D36) |
| `derivedGaps(f)` | all | §5.5.3 |
| `tsv(rows, header, meta)` | — | `Blob`, no dependency; the first lines are `#` comments: page URL, lens, filters, population definition, exclusions, `runId` and `asOf` per module (D39) |
| `sourceClass(src)` | `srcs` | `parliament` when the label or URL matches `/sansad|rajya sabha|lok sabha|\bRS\b|\bLS\b|rsdebate|\/Par20\d\d\//i`; else energy §5.14's primary regex; else `secondary` |
| `asOfLabel(lens)` | `META.asOf` per module; `INDICES_AS_OF` | one date when the values agree, else `{min}–{max}`; capital adds `indices as of {INDICES_AS_OF}` |

### 3.3 Prerequisites (reviewed generator changes; the page works without each, and gets better with it)

Each is a change to `scripts/assemble-fleet.mjs` (and for G1/G2 `scripts/finance/fetch-worldbank.mjs`),
`research/raw/*` or `RECONCILIATION.json`, with types in `src/graph/fleet.ts`, re-checked
by `scripts/validate.mjs` §5. Absence is detected by the `null` shim in `src/data/finance.ts`.
The acceptance gates marked (G) assert both the interim and the post-export behaviour.

| id | export / field | shape | built from | interim (today) | upgrade |
|---|---|---|---|---|---|
| **G1** | `FINANCE_LOAN_FACTS: Record<ClaimId, LoanFact>` | `{ project, status, pipeline, usdM, fxRate, fxBasis, st, stBasis: 'borrower-state'\|'agency-state'\|'agency-seat'\|'title'\|null, majorSector, sector1, population: 'census'\|'researched', countable, countedAs, notCountableReason }` | a **copy** of `projects[]` fields the fetcher already writes (F4); `countable`/`countedAs` from marks the finance reconciliation adds | strict placement rule; instrument as the flow's middle column; no US$ metric; the basis column reads "not exported" | fetcher-rule class on the map with the basis column; `mid=sector` becomes the default (D9); `m=usd`; the counting-status column |
| **G2** | `FINANCE_WB_TOTALS` | `provenance.totals`, `fieldMap`, `fx` verbatim | the same file | strip omits "of {api} in the API ({dropped} dropped, {grantOnly} grant-only)" and prints the gap line "API population totals not exported" | the API population in the strip; the ledger's footer check `= {croreExclPipeline}` |
| **P1** | `projectId` on `loan` and `award` claims | string \| null | fetcher and contracts research file | `projectKey` token rule (D12) | exact join; the token rule is removed only after a gate shows both agree |
| **G3a** | `CAPITAL_HOLDINGS: Record<ClaimId, {pct, shares, asOf, category, line}>` (or `pct` on the claim, P4) | `pct` validated 0–100 | structured fields the capital fleet adds per `own` claim | cell reads its state in words (D26) | cell prints `{pct}%` in mono; still no colour ramp |
| **G3b** | `CAPITAL_COVERAGE: {company, asOf, read: 'primary'\|'aggregator'\|'not-read', domain}[]` | — | the fleet's batch table (`holders-b*.json`) promoted | `no-record` columns are hatched "no named holder recorded" | "read, not named" (hollow) separated from "not read" (hatch) (A's five states) |
| **G3c** | `CAPITAL_CONTROLS: {id, role: 'comparison'\|'subject'\|'domestic-control'\|'adviser-comparison', declaredIn}[]` | — | the capital SPEC's declared sets promoted to `research/raw/capital/` | Band A = `publicRole` prefix rule (six rows); LIC in Band B; advisers by `/adviser/i` | Band A pins subjects (BlackRock, Vanguard) and the domestic control (LIC) in declared order; advisers by role |
| **P5 / G4** | `NGO_FC_STATE` or per-state `grant` rows (`ty: 'group'`, `st`) | `{st, fy, receivedCr, utilisedCr, srcs}` | RS Q.3253 Annexure I transcribed | void card (D21) | state × FY table (all 36, hatch = no row) and a `WelfareMap` for the selected FY |
| **P7** | `supersededBy` on cross-file duplicate loans | — | finance reconciliation | researched records never summed (D5) | unchanged; the duplicate-count gap line disappears |
| **P6** | LIC declared as domestic control | via G3c | — | LIC in Band B; the symmetry text names it | a labelled "domestic control" row in Band A |

The smallest first step is G1 alone: the fetcher computes every census field already.

### 3.4 URL parameters

All through `useSearchParams` with `{replace: true}` and the house `setParam` helper.
**Absent = default = unfiltered, nothing selected.** An unknown value falls back to the
default and one amber line under the strip reads `ignored an unrecognised {param} value`.

| param | values | default | written by | reach |
|---|---|---|---|---|
| `lens` | `loans` \| `associations` \| `capital` | `loans` (never written) | tabs | which lens panel is mounted; the strip's facts |
| `y` | `YYYY` \| `YYYY-YYYY` | all years | rail From/To; clock brush | **loans**: approval year (`from`) of loans, awards and acts · **associations**: FY starting in `y` for money, calendar year of `from` for actions · **capital**: `from` year of awards and rules; **the matrix is not reached** (one filing per company) and its caption says so while `y` is set. The control states the lens's definition in words |
| `st` | state code | none | rail select; map | **loans**: filters `ProjectList`, clock ticks, `RecordsStrip`, `ContractsTable` to records placed in `st`; the map marks `st` and the flow highlights its bands without removing others; opens `StatePanel` · **associations**: filters lanes to targets whose recorded `st` is `st` ("registered in, not where it works") · **capital**: inactive, reason "holdings are not placed by state"; the param is kept |
| `lender` | a node id among `LOANS` sources | all | rail select with counts | loans lens: every loan surface; a sample lender adds "{label}: a researched sample of {n} records, not its India portfolio". Inactive elsewhere, with the reason |
| `holder` | a node id in `BAND_A ∪ BAND_B`, or any `cap:` node | none | matrix row label; Find | capital: accent plus `HolderCard`; **never filters rows** (D33) |
| `tier` | comma list of the four tiers, or `none` | all four | rail toggles | **shared with `GraphExplorer`** (same name, same format): every lens surface and the graph (D35). A response is re-admitted whenever the claim it answers is shown (D35) |
| `rec` | an edge id in any module | none | "Open record" | `RecordCard`; an id from another lens opens with "belongs to the {lens} lens — go there" |
| `sel` | a node id | none | "Show connections"; the graph | `GraphExplorer`'s selection, shared by design; persists across lenses because the graph is one set (D36) |
| `find` | text | empty | `Find` | the results list only; filters nothing |
| `m` | `cr` \| `n` (\| `usd` with G1) | `cr` | map control | map class and value; `usd` is `aria-disabled` without G1 with the reason in its name |
| `scale` | `quantile` \| `log` | `quantile` | map control | bins (pooled, D10) |
| `mid` | `instrument` \| `sector` | `instrument` (→ `sector` once G1 is present, D9) | flow control | the flow's middle column; the unavailable option is `aria-disabled` with its reason |
| `view` | `stage` \| `table` | `stage` | "Table view" | swaps the lens centre for its twins, all open |
| `inc` | one `inclusion` term | none | `ReconciliationLine` links | `ProjectList` filter, shown as a chip with `{N} → {k}` |
| `tp` | integer ≥ 1 | 1 | table pagination | 400 rows per page (energy C15); `rows {a}–{b} of {n}` |

**`GraphExplorer` owns** `q`, `fam`, `pred`, `ty`, `amt`, `from`, `to`, `focus`, `hops`,
`path`. The page writes them only through "Show connections" (`focus`, `hops=1`, `sel`),
"Apply {y} to the graph" (`from`, `to`) and the grant presets (`pred`). It never reads them
for its own surfaces. Switching lens keeps `y`, `st`, `tier`, `find`, `sel`; clears `rec`;
keeps `lender` and `holder` inactive with a reason (D44). No param pre-selects a party, a
company or a person; there is no `party` param (D40).

### 3.5 Live region and unavailable options

Exactly one `aria-live="polite"` region, debounced (150 ms for map and filters, 300 ms for
Find). It carries every `{N} → {k} {unit}`, lens changes, panel open and close, `Link
copied`, `Citation copied`, `Table copied, {rows} rows`. Unavailable options are
`aria-disabled="true"`, focusable, with the reason inside the accessible name
(`Sector, unavailable: sector is not exported in this build (G1)`).

---
## 4. Page anatomy

```
┌ Kicker · PageTitle · Standfirst · Byline (runs, read-to) · standing line ─────── ≤160px ┐
├ DenominatorStrip (sticky; facts per lens) + ReconciliationLine + active-filter line ───┤
├ LensTabs  [ Loans | Associations | Capital ]        Find ⌕  · Copy link · Table view    ┤
├───────────────────────────────────────────────────────────┬───────────────────────────┤
│ FILTER RAIL (row, wraps): Year from–to · State · Lender   │ MARGIN 22rem (xl sticky)  │
│   | Holder · Tier · Reset   each with {N} → {k}           │  rest: ReadingKey         │
├───────────────────────────────────────────────────────────┤        ControlCard        │
│ LENS CENTRE                                               │        CannotShowCard     │
│  Loans:   LoanMap + UnionBar → LoanFlow → LoanClock →     │  rec:    RecordCard       │
│           RecordsStrip → ProjectList                      │  st:     StatePanel       │
│  Assoc.:  ReceiptsByYear + StateReceipts (void) →         │  holder: HolderCard       │
│           ActionsTimeline (+ aggregate counts) → ActionsList                          │
│  Capital: HolderMatrix → OutsideIndex                     │                           │
├───────────────────────────────────────────────────────────┴───────────────────────────┤
│ Stage captions (body size) · <details> twins (open under view=table)                   │
├ LENS SECTIONS                                                                          ┤
│  Loans:   Contracts · Debarments · Conditions and rules · Debt context ·               │
│           Would this lens alarm us elsewhere? · Narratives · What this lens cannot show │
│  Assoc.:  Grants named · Welfare join · Would this lens… · Narratives · Cannot show     │
│  Capital: Mandates + AdviserComparison · Licences · Rules timeline · Would this lens… · │
│           Narratives · Cannot show                                                     │
├ SHARED: Connection graph (id="connections") · Contested (id="contested") ·             ┤
│         Gaps (id="gaps") · Refusals (id="refusals") · Source ledger · TierLegend ·      │
│         Standing note                                                                  │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Stage grid:** `xl:grid xl:grid-cols-[minmax(0,1fr)_22rem] xl:gap-6` (welfare K10: at
  a 1280 viewport the content box is 960 px). Below `xl` the margin renders as a block
  directly under the component that opened it. DOM order is fixed: centre, then margin.
- **Fold budget at 1280×800 (Loans):** header ≤160, strip and lines ≈64, tabs ≈44, rail ≈44,
  map `clamp(420px, 100vh − 380px, 560px)` with the `UnionBar` inside the figure (28). The
  `UnionBar` is in the first viewport (FG-33).
- **Chrome is constant across lenses.** Strip, tabs, rail, graph, contested, gaps, refusals
  and sources are the same components fed by the lens's module. Only the centre and the
  lens sections change.
- **Lenses:** `role="tablist"`, three `role="tab"` buttons, arrow keys move, Enter or Space
  activates (URL-driven, no activation on focus). Only the active panel is mounted. Loans
  is first because the brief orders it first; the order is not a claim about importance.
- **Margin precedence:** `rec` (highest) > `st` (Loans, Associations) or `holder` (Capital)
  > rest (`ReadingKey`, `ControlCard`, `CannotShowCard`). When a panel opens, focus moves
  to its `h2` and the live region announces it; Escape closes it and returns focus to the
  invoking control.

---

## 5. Section by section

Each component gives, in order: **Reads** (exact exports), **Encoding**, **Caption** (body
size, 14 px `text-text-secondary`, left rule, ≤72ch, directly under the graphic, referenced
by `aria-describedby`), **Twin**, **Empty / void / partial**.

### 5.0 Chrome

#### 5.0.1 Header (existing `Editorial`)

- `Kicker`: `Foreign money · loans, foreign contributions, foreign capital`
- `PageTitle`: **Who lent, who gave, who holds, and what the record can show**
- `Standfirst` (fixed copy, no figures): "Money from abroad reaches India in three ways this
  page records: loans to governments and public bodies, contributions to associations, and
  holdings in listed companies. Each is drawn from a register with sources and evidence
  tiers. Each total says which records it counts and which it cannot. Institutions are
  shown against their peers, never alone."
- `Byline`: `finance {FINANCE_META.runId} · ngo {NGO_META.runId} · capital
  {CAPITAL_META.runId} · records read up to {asOfLabel}`. When a module is `META.empty`, its
  segment reads `{fleet}: register not yet promoted`.
- Header line (energy D21): "Built from {files} research files to a published contract and
  cross-examined ({verdicts} audit verdicts). It asserts no offence by any named person."
  `files` = Σ `META.counts.files`; `verdicts` = Σ `META.audit.verdicts.length` where present.
- **Standing line** (body size, from A D33): "Rothschild & Co and BlackRock Inc. appear here
  as companies, beside comparison companies. No family, religion or ethnicity is a node, an
  edge, a filter or a colour on this page."

#### 5.0.2 `DenominatorStrip` (existing, sticky; facts per lens)

`filtered={{from, to}}` is the lens population before and after filters. Each fact is
`{n, of?, label}`. `asOf` reads `read to {asOfLabel}` (energy D2).

| lens | facts |
|---|---|
| Loans | 1 `{rows} of {LOANS.length} loan records` · 2 `₹{rupeeTotal} cr counted — {cc} of {census} census records carry ₹` · 3 `₹{placed} cr of ₹{rupeeTotal} cr placed in a state government` · 4 `{researched} researched records, {lenders} lenders — listed, not summed` · 5 `{withCond} of {rows} records state conditions` · 6 `{noRupee} records: amount not stated / in US$ m` · (G2) `{projects} projects of {api} in the API ({dropped} dropped, {grantOnly} grant-only: not loans)` |
| Associations | 1 `{fyWith} of {FY_AXIS.length} financial years with a national receipts total` · 2 `{actions} enforcement actions, {caseFiles} named case files` · 3 `{answered} of {alleged} allegations with a recorded response` · 4 `{NAMED_GRANTS.length} named grant records, {donors} donors` · 5 `{linked} of {WELFARE_SCHEMES.length} register schemes linked to an association` |
| Capital | 1 `{researchedCols} of {COLUMNS.length} NIFTY 50 companies with a named holder recorded` · 2 `{BAND_A.length} comparison holders always shown` · 3 `{dates} filing dates across columns ({min}–{max})` · 4 `{AWARDS_CAP.length} awards by the Union and regulators` · 5 `{withBenefit} of {RULES_CAP.length} rules with a cui-bono row` |

Below 640 px the strip keeps facts 1 and 2 and the date; the rest move to a non-sticky mono
line under the Byline (moved, not hidden; welfare U18).

#### 5.0.3 `ReconciliationLine` (new; in the sticky wrapper; energy D6)

Mono 12 px, always rendered: it answers the skeptic's first question at rest (D41).

- **Loans:** `{LOANS.length} loan records = {census-counted} census counted + {census-no-rupee}
  census, amount not stated / in US$ m + {researched-listed} researched with ₹ (listed, not
  summed) + {researched-no-rupee} researched, amount not stated`. The four terms are the
  `inclusion` counts under the current filters; each is a link that sets
  `view=table&inc={term}`.
- **Associations:** `{NGO_EDGES.length} records = {grant} grant + {enforce} enforcement +
  {contra} responses + {role} office + {other} other`, by `pred`.
- **Capital:** `{CAPITAL_EDGES.length} records = {own} holdings ({filing} filing lines +
  {aggregate} aggregates) + {award} awards + {law} rules + {contra} responses + {other} other`.

#### 5.0.4 Active-filter line

Mono 11 px (12 below 640), only when a page filter is set:
`filters: y=2014–2026 · st=kl · lender=IDA · reset`. `reset` clears every page param except
`lens` and `view`; it never touches the graph's own params.

#### 5.0.5 `Find` (new; the journalist's entry, first control after the tabs)

- **Reads:** `nodeOf` over `GRAPH_NODES` (`label`, `sub`, `al`), and `lab` of `LOANS`,
  `CONTRACTS`, `ACTIONS`, `OWN_IDX`.
- `<input type="search">`, placeholder `name, alias, project or place`, URL `find`,
  debounced 300 ms. Results grouped as **Entities** (verbs: "Show connections"; "Use as
  lender filter" or "Highlight holder" where the entity is one) and **Records** ("Open
  record"). Each row names its lens. k ≤ 8 lists all; above 8, the first 8 by the stable
  order plus `{k} matches — refine` and "list all {k}". Order: exact label, alias, label
  substring, `lab` substring; ties by label. **Never by amount or degree.** A unique match
  is not auto-selected (welfare R13).
- **Empty:** `No entity or record in the three registers matches "{find}". This is a
  statement about the register, not about the world.`

#### 5.0.6 `ReadingKey` (margin at rest)

The four tier dash swatches with their words; family hue swatches with labels; the shape
key; three texture swatches (`TextureSwatch` from `WelfareMap.tsx`): hatch "no record names
this", stipple "records name a body registered here, not a state government", hollow "not
named ≥1% in a filing the register holds"; then energy D14's line: "No colour on this page
stands for a party, a country, a religion or a verdict. Hue is only the kind of actor."
Then: "Rose marks a response or denial, never 'bad'. Amber marks something not recorded."

#### 5.0.7 `ControlCard` (margin at rest; the skeptic's panel)

- **Reads:** the lens module's `SYMMETRY` (every `FleetText`, verbatim, headed by domain)
  and `BASE_RATES` (pinned domains first: Loans `worldbank-projects`, `worldbank`;
  Associations `fcra-actions`, `fcra-receipts`; Capital `holders`, `mandates-ventures`).
- Heading "The same lens on the other side". Each base rate prints `{numerator} of
  {denominator} — {label}`; a percentage only when the denominator ≥ 10 (welfare K6); a
  `null` prints `not computed`.
- **Empty:** `No symmetry check recorded for this lens — the control has not been run.
  This is a gap, not a pass.` in amber.

#### 5.0.8 Filter rail

§6. Each control carries its live `{N} → {k}`.

### 5.1 Loans lens

#### 5.1.1 `LoanMap` + `UnionBar`

- **Reuses** `WelfareMap` with `ballots={[]}`; its `rows` prop is loosened to
  `Map<StateCode, { cls: FillClass } & Record<string, unknown>>` (it reads only `cls`; F19).
  `financeView.loanStateRows(filters)` builds the rows. The listbox keyboard model,
  north-to-south order, hatch and stipple textures with pitch in screen pixels, and the
  readout come with it.
- **Reads:** `CENSUS` (for `m=cr`), `LOANS` (for `m=n`), `placement`, `bodyState`, filters;
  G1 for the `fetcher` class.
- **Encoding:**

  | class | condition | meaning |
  |---|---|---|
  | `value` | ≥ 1 record placed by the strict rule in view | `m=cr`: ₹ crore of census-counted placed records; `m=n`: count of placed records, census and researched |
  | `value` (G1, second texture: a fine diagonal overlay on the ramp fill, named in the legend "placed by the fetcher's rule: state agency or title") | 0 strict, ≥ 1 by G1 `st` | the fetcher's rule, with `stBasis` in the readout (D8) |
  | `stipple` | 0 placed, ≥ 1 record whose `bodyState` is this state | a state body registered here implements a loan; not in the fill |
  | `hatch` | none of the above | no loan record names this state; **never zero** |
  | `zero` | **never used** | the register declares no coverage |

  - Ramp `DEFAULT_RAMP`, **quantile bins pooled over every census-counted placed record with
    no filters** (welfare K13; D10), so a shade means the same ₹ in every view and does not
    move when the reader filters. `scale=log` offers log bins. The legend prints each bin's
    ₹ edges and names an empty bin "(none in view)" rather than dropping it.
  - Selected `st`: accent outline. Label anchors and outboard leaders per `india-map`.
- **`UnionBar`** (new, inside the same `<figure>`, under the map): one full-width bar, two
  neutral segments separated by a 2 px gap, widths proportional to ₹: `placed in a state
  government ₹{placed} cr` · `Union body or not placed ₹{unplaced} cr`. Beneath, mono: `of
  ₹{rupeeTotal} cr counted from {cc} census records · {cnr} census records carry no ₹ and
  are in no total · researched records are not on this bar`. With G1 a third segment
  appears between them: `placed by the fetcher's rule ₹{fetcherPlaced} cr`. The bar is the
  denominator in the frame (D7). It is never optional.
- **`NotPlacedBox`** (from A D5): the "Union body or not placed" segment is a button that
  filters `ProjectList` to unplaced records (in-page, announced). It says "Not a place on
  this map."
- **Readout** (hover, focus): `{State}: ₹{v} cr in {k} census records ({y}) · {j} records
  name a body registered here (not in fill) · {r} researched records from other lenders
  name this state government (count only)`; with G1 ` · {f} placed by the fetcher's rule
  ({basis split})`.
- **Caption C1 (always):** "A loan is placed in a state only when the record names that
  state's government as borrower or implementer. Most World Bank lending to India is
  borrowed by the Union and spent through national programmes, so most of it cannot be
  placed: {unplacedPct} of counted ₹ here. A state body's registered office is not where
  the money went, so bodies are stippled, not filled. Head offices of companies and the
  seats of Union bodies are never used. ₹ are at each loan's approval-year rate, as its
  record states, and are not adjusted for inflation: totals across decades mix rupees of
  very different value."
- **Caption C2 (sensitivity, when domain `worldbank-projects` base rates exist):** "The
  research file's own rule, which also places by a state agency or a state named in the
  project title, attributes {num} of {den} US$ m to a state. This page's strict rule places
  {placedPct} of counted ₹." `num`/`den` come from the base-rate rows of that domain that
  share one `label`. With G1 the sentence becomes "The fetcher's rule places a further
  ₹{fetcherPlaced} cr, shown as the overlaid texture."
- **Twin** (`<details>`, open under `view=table`): one row per state, all 36 in
  north-to-south order, then `Union body or not placed` as the last row. Columns: State ·
  Class · ₹ cr placed (strict) · Census records placed · (G1) ₹ cr by fetcher's rule ·
  basis split · Body-registered records (not in fill) · Researched records naming the
  state government · Rule · Detail. TSV export.
- **Mobile:** an `Open a state` `<select>` under the figcaption (welfare D22).
- **Empty:** `FINANCE_META.empty` → every state hatched, the bar reads `Register not yet
  promoted — nothing below is zero`. Filters leave no census rows → every state hatched, the
  bar reads `No census record matches {filters}`, Reset offered.

#### 5.1.2 `LoanFlow` (existing `FlowSankey`, extended)

- **Reads:** `CENSUS` rows with `inclusion === 'census-counted'` under the filters;
  `instrumentOf`; G1 `sectorOf`.
- **Built** from synthetic `GNode`s and `GEdge`s (`financeView.flowParts(filters, mid)`):
  lender nodes are the real `nodeOf(e.s)` (`fin:ibrd`, `fin:ida`); middle nodes are
  `ins:{slug}` (`ty: 'mechanism'`, `fam: 'instrument'`) for instruments or `sector:{slug}`
  (`ty: 'industry'`, `fam: 'market'`, the family the platform already gives sector-class
  nodes) for sectors; place nodes `place:{st}` (`ty: 'state'`, `fam: 'state'`) and
  `place:union` "Union body or not placed". Each counted record contributes two edges
  (`{rec.id}#1`, `#2`) with `pred: 'loan'`, its `tier`, its `a`. Passed with
  `flowPreds={['loan']}`; FlowSankey sums parallel edges at the weakest tier. View edges
  never enter the graph, the twin's claim counts or any export.
- **Extension to `FlowSankey` (backward compatible):** `FLOW_PRED_LABEL.loan = 'Loan
  commitment'`, `grant = 'Grant / foreign contribution'`; optional `captionExtra: ReactNode`.
- **Encoding (frozen):** band width = ₹ crore; ribbon `strokeDasharray` = tier (the census
  is all `documented`, so every ribbon is solid, and the caption says why); node hue =
  family; left-to-right = the order money moved.
- **`mid`:** `instrument` today; `sector` `aria-disabled` with the name "Sector, unavailable:
  sector is not exported in this build (G1)". With G1 the default becomes `sector` (the
  brief's lender → sector → state) and instrument stays an option (D9). **Sector strings are
  the API's `major_sector_name` verbatim.** "Transportation" and "FY17 - Transportation" are
  different strings and are not merged; only exact matches share a node.
- **Caption C3:** "The World Bank census only: {cc} records, ₹{rupeeTotal} cr. Other
  lenders' records were researched rather than enumerated, and some describe the same
  money twice (a facility and its tranches; one loan in two research files), so they are
  drawn one mark each below and never added here. Every census record is documented from
  the Bank's own API, so every ribbon is solid. {midSentence} Band position is flow order,
  not influence. {droppedNoAmount} records without a ₹ amount are not drawn." `midSentence`
  is "The instrument is the Bank's own name for the lending type; conditions attach to the
  development-policy and programme types." or "Sector is the Bank's single major-sector
  field as the API names it; the taxonomy changed in 2017, so older and newer labels sit
  apart."
- **Twin:** FlowSankey's band table (from · to · ₹ · records merged · tier) plus
  `ProjectList` filtered to the same rows. Clicking a band filters `ProjectList` in-page
  (no URL param, announced).
- **Below 640 px:** not drawn. Two ranked bar lists from the same bands (lender × middle,
  and place), same hue and dash, ranked by declared ₹, with the note "the flow diagram
  needs a wider screen; these are the same bands as lists" (D38). The band table sits
  beneath.
- **Empty:** `No census record with a ₹ amount matches these filters.`

#### 5.1.3 `LoanClock` (energy `TenureLanes`, extended)

- **Component change (bounded, D20):** `TenureLanes` gains optional props `asOf` (replaces
  the `ASOF` import), `edgeById` (replaces the `EDGE_BY_ID` import), `rules: {date, label,
  kind: 'lok-sabha' \| 'assembly' \| 'asof'}[]`, `shadeBefore?: {date, label}`,
  `onRange(from, to)` (the brush writes `y`), and `extraLanes?: {id, label, bars: {year,
  n}[]}[]` for count lanes. Energy passes none and renders byte-identically; the energy
  suite at 67/67 is the regression gate (FG-38).
- **Reads:** `approvalsByYear` (a project-count lane), `LOANS` (ticks by lender lane, `date
  = from`, dash = tier), `officeOnDate`'s role edges for span lanes (`MOF`, `wel:rbi`,
  `fin:ibrd`, `fin:imf`, plus any institution with ≥ 1 dated role edge in `FINANCE_EDGES`,
  derived not listed), `datedActs`, `LOK_SABHA`, `assemblyFor(st)` when `st` is set.
- **Encoding:** one linear x-scale from the earliest `from` in `LOANS` to `FINANCE_META.asOf`;
  a bar per year in the count lane (**project count, not ₹**, so a few large DPLs do not
  dominate a timing question; pipeline years hatched); a tick per record, dash = tier; a
  bar per tenure outlined in its role claim's dash, an open-ended tenure drawn to `asOf`
  with the trailing label "end not recorded"; party as text only; Lok Sabha rules 1 px
  solid, assembly rules solid and 50% lighter (dotted is the analytic dash; D19); the span
  before the first recorded Lok Sabha row shaded "general elections before {firstYear} not
  in this register"; future-dated records beyond the `asOf` rule in a shaded "after the
  register date" strip.
- **Union budgets:** the text line "Union budget dates are not a dataset in this build.
  {datedActs.length} dated Finance Ministry acts are drawn as ticks; no other budget mark
  is drawn." No marks are invented (D18).
- **Small multiple beside the lanes: "Month of approval"** — a 12-bar histogram of census
  approvals by calendar month (`approvalsByMonth`). Caption: "Lenders approve on their board
  calendars. Any clustering by month is one boring explanation for clustering by anything
  else." No figure is asserted (D18).
- **No computed window.** The page counts no "months before an election". The lending-
  follows-the-party narrative sits on the ladder with its rating.
- **Caption C4:** "General elections recorded in the register: {years}. Earlier ones are
  absent from the file, not from history. Dated Finance Ministry acts recorded:
  {datedActs.length}; every other budget and signature is absent from this file. A tenure
  bar covering a loan's date is the date test, not a finding: no record here says a
  minister approved a loan. {openEnded} tenures have no recorded end date and are drawn to
  the register date with that label."
- **Twin:** lanes twin (lane · holder or record · from · to or "end not recorded" · tier ·
  source), the year table (year · projects approved · researched records · election that
  year, winner as text · office-holders whose window covers 1 July, labelled "(mid-year
  test)"), and the rules list.
- **Partial:** rows whose first date is later than the axis start shade the uncovered span
  per row. The axis is never clipped to the covered span.
- **Empty:** axis drawn; each lane reads `none recorded`.

#### 5.1.4 `RecordsStrip` (new; researched lenders, one mark per record)

- **Reads:** `RESEARCHED`, `nodeOf(e.s)`; G1 `countable`, `countedAs`, `notCountableReason`.
- **Encoding:** one row per lender, alphabetical; x = ₹ crore on a log axis for records
  with `hasRupee`; records without ₹ in a left gutter labelled `amount not stated / in US$ m`;
  each record a 16 px tick, dash = tier; **no totals and no bars**. With G1, a record with
  `countable === false` or a `countedAs` draws hollow, and its readout gives the reason
  ("not a commitment: {reason}" / "counted under {P-number}").
- **Caption C5:** "Each mark is one record as researched. Records are not added up: the
  research found facilities beside their tranches, non-binding memoranda, a portfolio
  aggregate and one loan recorded in two files. The instrument column in the table says
  which is which. World Bank rows here were researched by hand for their conditions, and
  the same project may also be in the census above ({dupTokens} share a project id with a
  census record)."
- **Twin:** `ProjectList` filtered to `RESEARCHED`, grouped by lender with the header "{n}
  records in this register, a researched sample, not {lender}'s India portfolio".
- **Empty:** `No researched records from other lenders match these filters.`

#### 5.1.5 `ProjectList` (new; the table readers act on; energy `StackTable` below 640)

- **Reads:** `LOANS` under the filters, `inclusion`, `placement`, `instrumentOf`,
  `conditionsOf`, `contractsFor`, `officeOnDate`, `nodeOf`, `FINANCE_BENEFITS`; G1.
- **Columns:** 1 Approved (`from`, or `undated`; "after register date" chip when
  future-dated) · 2 Lender (button: Show connections) · 3 Record (`lab` verbatim; button:
  Open record; P-number shown) · 4 Borrower, with **"(API blank — Union recorded by
  default)"** when `d`'s borrower clause says so (G1: `stBasis === null && borrower
  default`; until then the clause verbatim) · 5 Implementing (benefit `who` resolved; a
  plain name in quotes "(not a node)") · 6 Placed in (state and rule, or the null rule's
  words; G1 adds the basis) · 7 **₹ cr** in mono, or the exact text `amount not stated / in
  US$ m` (G1 appends `US${usdM} m`); a blend project reads `₹{partial} cr + {k} leg(s)
  without ₹` and never treats the missing leg as 0 · 8 In totals (`counted` · `listed, not
  summed` · `in no total`; G1: `not a commitment: {reason}` · `counted under {P}`) · 9
  Instrument · 10 Conditions (count, or `none recorded: the Projects API carries no
  conditions (void)` for census legs) · 11 Contracts (count, or `none linked`) · 12
  Office-holders at approval (`{person} — {lab} [{tier}]`, open-ended ones with "end not
  recorded"; empty: `no recorded window covers {date}`) · 13 Tier · 14 Sources (`Cite`;
  empty → `no source in file` in amber).
- **Sort:** approval date descending by default; offered: ₹ declared (rows without ₹ last
  and labelled), lender, place. Never a computed ranking (D14).
- **Paging:** 400 rows per page, page in `tp` (energy C15); `rows {a}–{b} of {k}`, Previous
  / Next; after a page change focus goes to the caption. Paged, never truncated.
- **Export:** every filtered row with all columns plus `id`, `domain`, `terms` JSON and
  `d`; TSV `#` header (D39).
- **Caption:** "One row per record. Blended projects carry an IBRD leg and an IDA leg.
  Amounts are the lender's commitment at approval, not disbursement. Contracts are a
  sample the research opened, not every contract. Office-holders are those whose recorded
  window covers the approval date: the date test, not a signature."
- **Empty:** `No loan record matches {filters}.` naming the most-removing filter with a
  one-click reset of it (energy empty state).

#### 5.1.6 `RecordCard` (margin; one per `rec`)

Serves loans, contracts, debarments, actions, grants, holdings, awards and rules. Fixed
blocks; a block with nothing prints its "none recorded" line; it never disappears.

1. **Header:** `lab`; `s → t` as two buttons ("From: {s}", "To: {t}"); tier chip; lens;
   record id; copy-citation button. Citation: `{lab} — {tier} — {first source label} {url}
   — ICIP /finance record {id}, read to {asOf}`.
2. **Amount:** `₹{a} cr — {kind}`, kind from `pred`, never from `d` (energy D1): `loan` "loan
   commitment at the rate stated in the record"; `award` "contract value recorded for the
   award"; `grant` "foreign contribution for the year in the record"; `own` no amount;
   `enforce` "amount attached, fined or alleged". No `a` on a `loan`: exactly **`amount not
   stated / in US$ m`**, then the record's own words from `d`. `a === 0`: `₹0 cr — as
   recorded` plus "read the record text".
3. **Inclusion** (loans): `Counted in the census ₹ total` / `Listed, not summed —
   researched record` / `In no ₹ total — amount not stated / in US$ m`; (G1) `Not a
   commitment: {reason}` / `Counted under {P-number}`.
4. **Dates:** approved and closes, or `window open: end not recorded`.
5. **Place** (loans): `{State} — {rule}` or `Not placed — {rule}`; G1 adds the basis.
6. **Terms** (loans): instrument, rate, tenor, grace, each `not stated` when null, never 0;
   conditions as a list or `No conditions recorded in this record.`; the domain's
   conditions void quoted beneath when one exists.
7. **Who benefits:** the `BenefitRow`: `who` (button), `how`, `₹{amountCr} cr ({confidence})`
   or `amount unknown`; none → `No cui-bono row recorded for this record.` in amber.
8. **Office on the date** (loans): `OfficeOnDate` (§5.1.7).
9. **Contracts under this project** (loans): `contractsFor(e)` rows or `No contract in the
   register is linked to this project.`
10. **Responses:** `responsesTo(id)`, each `Response from {responder} [{tier}], {date or
    "undated response"}` with `lab` and `d`; none → exactly **`No response recorded —
    asked/not asked unknown`**, at equal size and weight to the claim block, one `<dl>` per
    item (welfare U12). A contra whose own `d` begins with that sentence prints it once.
11. **Record text:** `d`, verbatim.
12. **Sources:** each tagged `primary`, `secondary` or `parliament`; `upgradeIf` and `killIf`
    when present.
13. **Superseded by / supersedes:** links, when present.

#### 5.1.7 `OfficeOnDate` (inside `RecordCard`; also column 12 of `ProjectList`)

- **Reads:** `officeOnDate(e.from, [e.s, e.t, benefit.who, placedStateNodeId, MOF])`.
- **Three sub-blocks, always rendered:** "Tenure covers {date}" · "Start recorded, end not
  recorded — the record does not say whether they held office on {date}" · "Acts recorded
  on {date}". Each row: holder, office (`lab`), from–to, tier. An empty sub-block reads
  `none recorded`.
- **Fixed sentence:** "Holding office on the approval date is the date test, not a finding.
  No World Bank record in this register names a minister as signatory; the research file
  records that agreements are signed by officials of the Department of Economic Affairs."
  The void it summarises (`FINANCE_VOIDS`, domain `worldbank`) is linked.

#### 5.1.8 `ContractsTable` (section `id="contracts"`)

- **Reads:** `CONTRACTS`, `FINANCE_BENEFITS`, `contractsFor`, `unattachedContracts`,
  `DEBARMENTS`, `FINANCE_BASE_RATES` domain `contracts`.
- **Columns:** Signed · Awarder (button) · Contractor (button; `IndexChips` for a `co:` id)
  · Package (`lab`; Open record) · ₹ cr (kind: contract value; or `amount not stated`) ·
  Project (link to the loan record, or `project not identified in the record`) · Bidders
  and prices **as the `d` states them, verbatim, never parsed** · How it benefited (`how`) ·
  Debarment status of the contractor if any · Tier · Sources.
- **Second table:** "Awards not keyed to a World Bank project id ({n})", grouped by awarder.
- **Denominator line:** `{CONTRACTS.length} contract awards recorded, under {projects}
  projects of {census} census projects · {unattached} not linked to a project. Award
  notices publish a bid count for {k} of {n} sampled notices (base rate, contracts).`
- **Caption C6:** "These are contracts the research opened, not every contract under these
  loans. After 2016 the World Bank publishes only the winning firm for most notices, so
  losing bids are usually absent. A contractor winning several packages is shown in the
  rows, not scored."
- **Empty:** `No contract awards in the register.`

#### 5.1.9 `DebarmentsTable` (section `id="debarments"`)

- **Reads:** `DEBARMENTS`, `responsesTo`, the award targets in `CONTRACTS`,
  `FINANCE_BASE_RATES` domain `contracts`.
- **Columns:** Debarred from · Until (`to`, or `open: no end date in the feed`, from the
  edge, never a sentinel) · Firm (button; label + `sub`) · Ground as recorded (`lab`, `d`) ·
  Also an awardee in this register (yes / no) · Tier · Response (joined, or the exact
  sentence at the same size as the ground) · Sources.
- **Denominator line:** `{DEBARMENTS.length} World Bank debarments of India-based firms
  recorded · {overlap} of them also appear as awardees in this register's
  {CONTRACTS.length} contracts`. The `contracts` base-rate rows print beneath, verbatim
  (Indian entries on the sanctions list, affiliate rows), so the reader sees the recorded
  rows against the list.
- **Caption C7:** "A debarment is the Bank's own sanctions decision, not a court finding.
  The feed rarely names the project. The overlap with awardees is computed here over a
  sample of contracts; zero here is a statement about the sample."
- **Empty:** `No debarments in the register.`

#### 5.1.10 `ConditionsAndRules` (section `id="conditions"`)

- **Reads:** `RULES_FIN`; `LOANS` with non-empty `conditionsOf`.
- Two tables: **Loan conditions** (loan · condition · tier · source; one row per condition)
  and **Rules and orders on external finance** (`RULES_FIN`: rule · governed entity · dates ·
  benefit row or `No cui-bono row recorded` · innocent reading · upgrade/kill · sources).
- **Denominator:** `Conditions recorded for {withCond} of {LOANS.length} loan records. The
  World Bank API carries none: see What this lens cannot show.`

#### 5.1.11 `DebtContext` — India's external debt (section `id="debt"`; from A L8)

- **Reads:** `FINANCE_BASE_RATES` and `FINANCE_VOIDS` where `domain === 'debt-imf-people'`.
- Energy `BaseRateTable`, rows verbatim; a `null` numerator or denominator prints `not
  computed in this file`, never a dash.
- **Caption:** "What the loans above are part of. The official external-debt status reports
  were unreachable from this environment; these rows come from World Bank series."
- **Empty:** `No external-debt context rows in this build.`

### 5.2 Associations lens

#### 5.2.1 `ReceiptsByYear` (new)

- **Reads:** `NATIONAL`, `fyOf`, `FY_AXIS`, `sourceClass`, `SECTOR_DONORS`, `REGISTRATIONS`.
- **Encoding:** x = `FY_AXIS`; y = ₹ crore, linear from zero; bar = the current
  (unsuperseded) single-FY row, neutral fill, outline dash = tier; an FY with no current
  row is a **full-height hatched column** labelled `no national total recorded` (never a
  zero-height bar; D21); a superseded figure is a short horizontal tick across the slot at
  its value, dashed per its tier, `<title>superseded by {id}</title>`; a multi-FY row is a
  bracket spanning its years labelled `₹{a} cr, {fyStart}–{fyEnd}, one figure`, never a
  bar; a mono source-class chip (`parliament` / `primary` / `secondary`) under each bar;
  two current rows for one FY draw as two thin bars with "two current figures for {fy} —
  see the table". Nominal ₹, and the axis says so.
- **Caption C8:** "What registered associations reported receiving from abroad, as totals
  for the whole sector. {fyWith} of {FY_AXIS.length} financial years carry a total. Years
  without one are hatched because a total was not found, not because nothing arrived.
  Figures differ between sources for the same year (returns filed late, different cut-off
  dates), so a superseded figure is kept and marked. The FCRA portal is unreachable from
  this environment; totals come from Parliament answers and press reports of Ministry
  statistics, and the tier says which."
- **Twin:** every `NATIONAL` row, superseded included: FY · ₹ cr · Tier · Status (current,
  or `superseded by {id}`) · Source class · Sources · Record text. Second table:
  `SECTOR_DONORS` ("Donors to the sector as a whole, where the record names them": donor ·
  FY · ₹ cr · tier · sources). Third table (from A): `REGISTRATIONS` — registrations and
  filers by FY, `lab` verbatim, tier, source.
- **Empty:** axis with every FY hatched and `No national receipts total in the register.`

#### 5.2.2 `StateReceipts` (void card now; table plus map after P5)

- **Reads:** `STATE_ROWS`; the `srcs` of `NATIONAL` rows whose record text cites the
  state-wise annexure; `NGO_BASE_RATES` domain `fcra-receipts`.
- **When `STATE_ROWS` is empty (today), a card at the findings' type size:** "State-wise
  receipts for {fyRange} are published as an annexure to a Rajya Sabha answer ({source
  links}). This register sums them into the three national totals above. Its state rows
  are not separate records here, so no state is drawn or ranked. The few state figures
  quoted in the records' text are readable in those records, and the one recorded share
  is below." The `fcra-receipts` base-rate rows print beneath (the Delhi share). The FY
  range is derived from `fyOf` of the citing rows. No row count is printed until P5.
- **After P5:** a state × FY table (all 36; hatch = no row) whose column sums are checked
  against the national rows from the same answer (footer `sum of rows = {x}; national row
  = {y}`, any difference in amber), and a `WelfareMap` for the selected FY with the same
  classes as `LoanMap`. `st` then selects.
- **Derived gap:** "FCRA state-wise receipts are not in the register as records".

#### 5.2.3 `ActionsTimeline` (new; lanes, one per target)

- **Reads:** `caseFiles()`, `POPULATION_ACTIONS`, `responsesTo`, `LOK_SABHA`, `nodeOf`,
  `NGO_BASE_RATES` domain `fcra-actions`.
- **Lanes:** one per case file (association, donor, party) **ordered by first dated action,
  then label** (D23: a time chart reads in time; count ordering would be a leaderboard of
  the accused), then "Courts and oversight on the government's actions" (`t` a ministry).
  The lane label is the target's label and `sub`, with its recorded `st` as "registered
  office" and a "Show connections" button.
- **Encoding:** a square per enforce edge at `from`, outline dash = tier; a claim with ≥ 1
  response gets a **rose rule** directly beneath the square, the same length as the square
  (rose = position of a response, not its credibility; welfare `ROSE_KEY`); a claim with no
  response gets an open bracket `[ ]` beneath, and its `title` and twin cell carry the
  exact sentence; alleged-ground edges draw as squares like any claim, their dash the
  distinction; undated events in a right gutter labelled `undated`, counted in the lane
  label; x from the earliest dated action to `NGO_META.asOf`; Lok Sabha rules with
  `winner` as text; no party colour.
- **Population row** (above the lanes, not a lane): `POPULATION_ACTIONS` as mono
  annotations, each `lab` with date and tier. Never ticks (D24).
- **Beside the timeline: "Counts the Ministry and Parliament have given"** (from A): the
  aggregate `enforce` rows, one each, `lab` and window verbatim, tier, source. Header:
  "These counts overlap and use different windows. They are never added." The
  `fcra-actions` base-rate rows sit beneath, including the row that sets the named case
  files against all cancellations.
- **Caption C9:** "Every enforcement action on the record, against every association the
  research examined, government-aligned and critical alike. The named cases are a small,
  chosen set: {named} named case files against {all} cancellations counted by the
  Ministry (base rate beside). Most cancellations were for not filing returns. A square is
  an action, not a finding of wrongdoing. The kind of action (suspension, cancellation,
  refusal to renew) is quoted from the record, not classified by this page." `named`/`all`
  come from the `fcra-actions` base-rate row with both values non-null; otherwise that
  sentence is omitted.
- **Twin:** `ActionsList`.
- **Empty:** axis plus `No enforcement action recorded.`

#### 5.2.4 `ActionsList` (the reading surface; the timeline's twin)

- One `<section aria-labelledby>` per lane with an `h3` (target label; `(registered in
  {st})` when recorded; "Show connections"). Rows date-ordered, one `<dl>` each:
  - **Action:** date · actor (`s` label) · `lab` · tier chip · `d`.
  - **Stated ground:** the alleged-ground edges render in the same row form with their own
    tier and dash; nothing collapses them into the action they explain.
  - **Response:** each joined contra (`Response from {responder} [{tier}], {date or
    "undated response"}:` + `lab`, `d`), including audit contras whose text says no denial
    applies. None → exactly **`No response recorded — asked/not asked unknown`**. When
    other claims in the same case file carry responses, a second line follows: `{k}
    response(s) recorded to other claims in this case, shown above/below.` (D23).
  The two halves render side by side from 640 px, stacked below it, **at the same width,
  size and weight** (FG-11).
- **Case-file header line:** `{actions} actions · {responded} with a response to that claim`.
- **Filters:** `st` (recorded state), `tier`, `y` (calendar year of `from`); a case file
  with any action in view keeps all its rows, the in-view rows marked.
- **Export:** one row per action, responses concatenated with `‖`.

#### 5.2.5 `GrantsNamed` (section `id="grants"`) and the donor → association graph

- **Reads:** `NAMED_GRANTS`, `nodeOf`.
- **Table:** Donor (button; `sub` beneath, so a domestic control reads as what it is) ·
  Recipient (button) · FY or window · ₹ cr (kind "foreign contribution for the year in the
  record", or `amount not stated`) · Tier · Superseded · Sources. The page does not
  classify donors as foreign or domestic (D26).
- **Graph presets** (links above the table, each writing the graph's own params and
  scrolling to `#connections`): "Donors and associations" → `pred=grant`; "Enforcement and
  responses" → `pred=enforce,contra`; "Everything in this lens" clears `pred`. The default
  graph is unfiltered; a preset is the reader's act (D37). A "Show donors and associations
  in the graph" button sets `sel` to the first case file's target **only on click**.
- **Empty:** `No named grant records.`

#### 5.2.6 `WelfareJoin` (section `id="welfare-join"`)

- **Reads:** `WELFARE_JOIN`, `WELFARE_SCHEMES`.
- **Linked table:** Scheme (name, level, state; link `/welfare?s={id}`) · Association or
  body · Relationship (`PRED_LABEL`) · Tier · Innocent reading (every analytic row has one,
  at full size) · Record · Sources.
- **Unlinked table:** "Rows about associations in welfare delivery not linked to a scheme
  record ({n})": payer · association · ₹ `a` or `amount not stated` · window · tier ·
  response · sources.
- **Denominator:** `{schemeCount} of {WELFARE_SCHEMES.length} schemes in the welfare
  register have a recorded link to an association · {linked} of {linked + unlinked} rows
  are linked to a scheme · {analytic} of {linked} links are our own inference, each with
  its innocent reading.`
- **Caption C10:** "A link here says an association sits in a scheme's delivery chain, and
  an association that delivers a scheme is paid to do so. That is how the scheme works. It
  is an allegation only where the tier says alleged."
- **Empty:** `No association is linked to a register scheme in this build.`

### 5.3 Capital lens

#### 5.3.1 `HolderMatrix` (new)

- **Reads:** `COLUMNS`, `BAND_A`, `BAND_B`, `OWN_IDX`, `columnStatus`, `cell`, `lineKind`,
  `pctOf`, `CAPITAL_SYMMETRY` domain `holders`, `nodeOf`, `IndexChips`; G3a–c.
- **Orientation:** holder rows × company columns from 640 px; transposed below (D32).
- **Band A — "Comparison set, always shown ({BAND_A.length})":** every row rendered
  whatever the filters say. Interim: the six holders whose `CAPITAL_IDENTITY.publicRole`
  begins `Mandatory comparison control` (F15). With G3c: the declared rows in declared
  order, including the subjects (BlackRock, Vanguard) and the domestic control (LIC), each
  labelled with its role (D22).
- **Band B — "Other holders with a recorded line ({BAND_B.length})":** alphabetical. There
  is no row order by holdings (D14). BlackRock and Vanguard sit here until G3c.
- **Column header:** short company name (vertical at ≥ 640); filing date(s) in mono; a
  hatched header for `no-record` columns; a company without `existingId` is a hatched
  column "no company record".
- **Cell encoding (no colour ramp until G3a, and even then the value is text):**

  | state | when | drawn as | words (accessible name and twin) |
  |---|---|---|---|
  | `line` | ≥ 1 `own` edge with `lineKind === 'filing'` | solid neutral square, border dash = weakest tier; text `≥1%` (or `{pct}%` after G3a); `×{n}` when several lines | `{holder}, {company}: {n} filing line(s) recorded at ≥1%, filing {date}, {tier}` |
  | `aggregate` | only `own` edges with `lineKind === 'aggregate'` | hollow square with the **analytic dash** border and the glyph `Σ`; text `agg.` | `{holder}, {company}: aggregate of {n} fund holdings files, lower bound, computed by the research (analytic), as of {date}; no filing names this holder at ≥1%` (D24) |
  | `not-named` | the column is researched and no edge exists for this holder | hollow square, hairline border | `{holder}, {company}: not named ≥1% in the filing recorded` |
  | `no-record` | the column has no `own` edge at all | hatch (column-wide) | `{company}: no named holder recorded for this company` |
  | (G3b) `not-read` / `read, not named` | coverage says not read / read and no line | hatch / hollow with a dotted ground | the two are distinct once coverage is exported |

  A cell with both a filing line and an aggregate draws as `line` and lists the aggregate
  in its name. The cell is a button that opens the claim (`rec`).
- **Row summary** (right edge, mono): `{lines} filing line(s) in {k} of {researchedCols}
  companies · {aggs} aggregate(s), analytic`. The two counts are **never added** (D24), and
  rows are never sorted by either.
- **`holder`:** accents the row (left border, `aria-current="true"`, "(selected)"), scrolls
  it into view, opens `HolderCard`; **never removes rows**. When set, a note at body size
  sits above the matrix: **"Comparison set required: {holder} is shown with the
  {BAND_A.length} holders the research measured with the same lens, and with every other
  holder named in these filings. This page does not display one holder alone."** When
  `holder` is in neither band (e.g. `cap:rothschild-co`), the note adds "{holder} has no
  recorded line in a NIFTY 50 filing; its recorded holdings are in its card".
- **Fail-closed guard (Review Focus 5):** if `BAND_A.length < 4`, the matrix is **not
  drawn**. In its place: "Comparison set required. This build declares {n} comparison
  holders; the matrix needs at least four to be read fairly and is withheld." The twins
  still render (D33; FG-RF3, FG-21).
- **`y`:** does not reach the matrix (one filing per company); the caption says so while
  `y` is set. `tier` blanks cells outside the tiers but never removes rows.
- **Beside the matrix** (above it below `xl`): the `holders` symmetry texts verbatim, headed
  "The same lens on every holder".
- **Caption C11:** "A holding enters a company's shareholding filing by name only at 1% or
  more, and each fund line counts separately; a manager with many funds each under 1% is
  not named at all. **An empty cell means 'not named', never 'not held'.** An aggregate
  cell is the research's own sum of a manager's fund holdings files, a lower bound, drawn
  with the analytic dash: no filing names that holder. Columns are read from filings of
  different dates ({dates} dates, {min} to {max}), so a row is not one moment. {noRecord}
  of the {COLUMNS.length} companies have no named holder recorded in this register and are
  hatched: not researched to that depth, not empty. The checked companies are not a random
  sample."
- **Twins (both exported):** (a) **Lines, long form:** one row per `own` edge in `OWN_IDX`:
  holder · band · kind (filing / aggregate) · company · filing or file date · tier · record
  text (`d`, which carries the percentage as filed) · innocent reading (aggregates) ·
  sources. (b) **Column status:** company · status · filing date(s) · named holders
  recorded · comparison-set holders named · aggregates recorded. The wide grid with state
  words is a TSV only.
- **Mobile (< 640):** transposed to company rows × Band A columns (`{BAND_A.length}` × 32 px
  + a 110 px sticky label); Band B as a per-row mono line `also named: {labels}`; holder
  short labels rotated 90° with full names in the accessible names (D32).
- **Empty:** `CAPITAL_META.empty` hatches every column, keeps Band A's rows, reads
  `Register not yet promoted`.

#### 5.3.2 `OutsideIndex` (under the matrix)

- **Reads:** `OWN_OUTSIDE`. Table: Owner · Owned · Share as recorded (record text) · Date ·
  Tier · Sources. Holds the joint ventures (Jio BlackRock), asset-manager stakes, and the
  Union's ownership of the RBI. Caption: "{n} recorded holdings and joint ventures outside
  the NIFTY 50 matrix."

#### 5.3.3 `MandatesTable` + `AdviserComparison` (section `id="mandates"`)

- **Reads:** `MANDATES`, `CAPITAL_BENEFITS`, `ADVISERS`, `CAPITAL_BASE_RATES` domain
  `mandates-ventures`, `responsesTo`; G3c adviser-comparison rows.
- **MandatesTable columns:** Date · Awarder (Union, DIPAM, other) · Awardee (button) · What
  (`lab`) · Fee or value: energy `benefitAmount` — `₹{amountCr} cr ({confidence})`, `Re 1
  bid (estimated)` as recorded, or **`fee not disclosed`** when `amountCr` is `null`; never
  blank (D31) · Who benefits (`who`, `how`) · Tier · Response · Sources. Heading "Awards by
  the Union: mandates and sales". Sales and mandates are not split (no field distinguishes
  them; `lab` says which).
- **AdviserComparison:** rows = `ADVISERS` alphabetical, Rothschild & Co among them (G3c:
  the declared adviser-comparison set); columns: awards recorded as awardee · analytic
  records naming it · narratives about it on the ladder (by node id in narrative sources,
  else `not linked`) · "no mandate recorded in this file" where zero · Show connections. The
  `mandates-ventures` base-rate rows print beneath (league-table appearances).
- **Caption C12:** "A mandate is a public appointment; it is not a finding about the
  adviser. Fees are shown only where disclosed. Counts of records in this register measure
  the research's attention as much as the firm's work; league tables in the records' text
  rank by fees and deal value; this table ranks nothing."
- **Empty:** `No awards recorded.`

#### 5.3.4 `LicencesTable` (section `id="licences"`; from A C4)

- **Reads:** `LICENCES` (`award` edges with `s === 'sebi'`), `licenceTiming`, `own`/`pmin`
  edges into the JV nodes, `law` edges in `mandates-ventures`.
- **Table:** licensee · licence (`lab`) · regulator · applied (the application claim's
  `from`, where one exists) · approved (`award.from`) · months between (**only when both
  dates exist**, else `one date not recorded`) · tier · response. Comparator sponsors in
  the same file sit beside the JV rows with the same columns and no emphasis.
- **Caption:** "Months from application to approval, for every sponsor the file dates at
  both ends. A row with one date is shown and not timed. The comparators are those the
  research recorded, not every licence the regulator granted."
- **Empty:** `No licence recorded.`

#### 5.3.5 `RulesTimeline` (section `id="rules"`)

- **Reads:** `RULES_CAP`, `responsesTo`.
- **Encoding:** one bar per rule from `from` to `to`; an open end drawn to
  `CAPITAL_META.asOf` labelled `in force, end not recorded`; outline dash = tier;
  `supersededBy` drawn as a thin connector to the successor bar, and the superseded bar
  carries the word "superseded" so greyscale keeps it; rows chronological by `from`.
- **Rule cards (the reading surface):** `lab` · dates · tier · governed entity · record
  text · **Who benefits**: the benefit row (`who`, `how`, amount, confidence), or the amber
  line **`No cui-bono row recorded for this rule`** with the rule's `d` printed verbatim
  beneath at the same size (the research text often says who asked; the page shows it as
  text and does not turn it into a row) · Boring explanation (`innocentReading`, or `not
  recorded`) · Upgrade if / Kill if · responses (or the exact sentence) · sources.
- **Denominator line:** `{withBenefit} of {RULES_CAP.length} rules carry a cui-bono row ·
  {withIR} carry an innocent reading.`
- **Caption C13:** "A rule changes terms for everyone it covers. A rule that benefits
  someone is not evidence that it was written for them. Who gained is recorded only where
  the research filled a cui-bono row; where it did not, the record's own text is shown and
  the gap is counted in What this lens cannot show."
- **Empty:** `No rule recorded in this build.`

### 5.4 Per-lens sections (every lens)

#### 5.4.1 Would the same lens alarm us elsewhere? (`id="baserates"`)

The lens module's `BASE_RATES`, one energy base-rate card per row grouped by `domain`;
`{numerator} of {denominator}`, a Wilson 95% whisker only when both are integers and the
denominator ≥ 10 (energy D11); label verbatim; `null` → `not computed`. The lens module's
`SYMMETRY` texts follow, verbatim, headed by domain.

#### 5.4.2 Narratives, rated (`id="narratives"`)

`NarrativeLadder` with the lens module's `NARRATIVES`; six rungs always drawn, an empty
rung reads `none in this file`; one colour; strongest case and strongest counter side by
side at equal size; the research file named on each. A control `show every register's
narratives ({n})` (in-page state) adds the other two modules' ladders with a module
column (D42). Denominator: energy `narrativeDenominator`. Caption C14: "A narrative is a
claim about the world. It is rated, with its strongest case, its strongest counter and
what would change the rating. It is never drawn as an edge. The same narrative can appear
in more than one research file with a different rating; they are listed as recorded, not
reconciled. A narrative that names a family, a religion or an ethnicity as the actor is
recorded here in the words it circulates in, and is tested against the institutions the
record holds."

#### 5.4.3 What this lens cannot show (`id="cannot"`)

The lens module's `VOIDS` and `GAPS` plus the lens's derived gaps (§5.5.3), in full, at the
findings' type size (`GapsPanel`), directly after the lens's sections. Each void keeps its
`whyItMatters` at full size (D43).

### 5.5 Shared sections

#### 5.5.1 Connection graph (`id="connections"`; existing `GraphExplorer`)

- **Reads:** `GRAPH_NODES`, `GRAPH_EDGES` (the three modules minus the census; D36).
  `height=620` (480 below 640). Mounted on intersection; behind `Load the graph` below 640
  (welfare D21).
- **Opening it:** every "Show connections" writes `focus={id}&hops=1&sel={id}`, scrolls to
  `#connections` and moves focus to the graph's detail heading; a "Back to {origin}" link
  returns. `PRED_LABEL.loan` ("Loan") and `.grant` ("Grant / foreign contribution")
  already exist; both directed.
- **Status line (body size, above the explorer):** "{GRAPH_EDGES.length} relationships
  across the three registers. The World Bank census ({census} loan records) is not drawn
  here: two lenders to one borrower, {census} times, would draw two fans of parallel lines
  that show degree and hide value. It is in the map, the flow and the list. Identity across
  the three registers is joined only where ids match; the same institution can appear
  under two ids until reconciled. {dropped} edges with an endpoint outside every register
  are not drawn. This graph's own filters (`q`, `pred`, `from`–`to`) are its own; the
  page's year control does not reach it." A button "Apply {y} to the graph" writes the
  graph's `from`/`to`.
- **A `sel` that only census legs reach** (a state implementing agency): the heading line
  reads "{label} appears only in the World Bank project table, which is not drawn in the
  graph. Show its projects →" (sets `st` or filters `ProjectList`). Never a silent no-op.
- **Caption C15:** "Position carries no meaning. Line dash is evidence tier; hue is the kind
  of actor; shape is entity type; size is a declared band. Persons appear only in public
  roles."
- **Twin:** GraphExplorer's own table twin.
- **Depends on** plan Task 9 (jump-to, "as of" mode, why-drawn) for convenience only;
  nothing on this page depends on them for honesty. Without them the explorer works as on
  `/network`.

#### 5.5.2 Contested (`id="contested"`)

The lens module's edges with `tier === 'alleged'` (excluding `contra`), each with
`responsesTo`, as energy `ContestedList` / `ContestedFact` pairs: claim (who alleges, `lab`,
`d`, tier, sources) beside response(s), equal width, size and weight, no verdict slot; none
→ the exact sentence. Denominator: `{alleged} alleged claims in this lens · {answered}
with a recorded response · {unanswered} without — whether a response was sought is not
recorded.` Empty: `No alleged claims in this lens.`

#### 5.5.3 Gaps (`id="gaps"`; existing `GapsPanel`)

- **Reads:** the three modules' `VOIDS` (`what`, `whyItMatters` → `why`, `srcs`) and `GAPS`
  (`text` → `what`; `why` = `recorded as a research gap by the {domain} file`), plus the
  **derived gaps**, each shown only when its condition holds:
  - "Loan state is not a field: {unplaced} of {cc} counted census records cannot be placed
    in a state government from the register" (G1 absent) / "{fetcherOnly} records are
    placed only by the fetcher's rule (state agency or title)" (G1 present)
  - "Loan sector is not exported" (G1 absent)
  - "{noRupee} loan records have no ₹ amount: amount not stated / in US$ m"
  - "{dupTokens} researched records share a World Bank project id with a census record and
    are not marked superseded" (P7 absent)
  - "Whether researched loan records duplicate each other is not recorded" (G1 absent)
  - "API population totals not exported" (G2 absent)
  - "Conditions recorded for {withCond} of {LOANS.length} loan records"
  - "{openEnded} office windows at the Ministry of Finance have no recorded end"
  - "{uncovered} approvals fall where no recorded office window exists"
  - "Union budget dates are not a dataset in this build"
  - "{fyMissing} financial years in {FY_AXIS range} have no national FCRA total"
  - "FCRA state-wise receipts are not in the register as records" (P5 absent)
  - "{unlinked} welfare-join rows are not linked to a scheme"
  - "{noResponseCases} case files carry no recorded response to any claim"
  - "Holder percentages are not a field" (G3a absent); "Which filings were read is not
    declared" (G3b absent); "The comparison set is read from identity prose; a structured
    declaration is not exported" (G3c absent)
  - "{aggs} holder cells are research aggregates of fund holdings files, not filing lines"
  - "{noRecord} of {COLUMNS.length} NIFTY 50 companies have no named holder recorded"
  - "{RULES_CAP.length − withBenefit} of {RULES_CAP.length} rules carry no cui-bono row"
  - "{unansweredAll} alleged claims carry no recorded response"
  - "{splitIds} institutions appear under two ids ({pairs}) and are not merged by name"
- Header line: "{v} voids and {g} gaps recorded by the research, and {d} derived by this
  page." Grouped by lens, then domain. Same type size as findings. Never collapsed.

#### 5.5.4 Refusals (`id="refusals"`)

§14 rendered as a list, linked from the rail foot (D40).

#### 5.5.5 Source ledger and foot

`SourceLedger` over the `srcs` of every edge and node in the lens module, deduplicated by
URL; `establishes` = `cited by {n} records, e.g. {first lab}`; `primary` from `sourceClass`;
`retrieved` = `cited in a file dated {META.asOf}` (energy D2). The full list is always
shown. Then `TierLegend` and the standing note from HANDOFF "Standing", verbatim.

---
## 6. Filter rail and its effect on the denominator

| control | type | shown beside it | honours? |
|---|---|---|---|
| Find | `type=search`, first after the tabs | `{k} matches` | filters nothing |
| Year From / To | two `<select>` + "All years", with a coverage ribbon (one tick per year with ≥ 1 record in the lens; hatched years named) | Loans `{N} → {k} records (approval year)`; Associations `{N} → {k} actions · {fy} FYs`; Capital `{N} → {k} awards and rules · matrix unaffected` | undated records are named as "undated, shown under all years only" |
| State | `<select>`, 36 states alphabetical with counts in the active lens; zero-count shown `(0)` and `aria-disabled`, never hidden | `{N} → {k}`, plus "placed by state government only" (Loans) or "registered state, not where it works" (Associations); "does not apply to this lens" (Capital) | the control states the placement rule on its label |
| Lender | `<select>` grouped "World Bank (census)" / "Researched sample", with counts | `{N} → {k} records`; a sample lender adds the sample sentence | — |
| Holder | `<select>`: Band A first, then Band B, with line and aggregate counts | "highlights; never isolates" | emphasises only (D33) |
| Tier | four toggles with dash swatches (`aria-hidden`; the word is the label) | `{N} → {k}` for the lens population, plus "also filters the connection graph" | responses are re-admitted when their claim is shown (D35) |
| Map metric / scale | segmented | per option: `₹ counted: {cc} records` / `records placed: {n}` / (G1) `US$ m: {k} records` | `usd` `aria-disabled` without G1 |
| Flow middle | segmented | `instrument` / `sector` with its coverage | `sector` `aria-disabled` without G1 |
| Reset | button | clears page params except `lens` and `view` | never touches the graph's params |
| Copy link · Table view | button · toggle (`aria-pressed`) | `Link copied` | — |

Every change announces `from {N} to {k} {unit}` through the one live region (welfare
U21). **The rail refuses** (a fixed muted line at its foot, energy D19): "Not offered:
party, religion, donor-country and 'risk' filters — why →", linking to `#refusals`.

---

## 7. Interactions

| verb | trigger | writes | result | focus |
|---|---|---|---|---|
| Open record | a record label anywhere | `rec` | `RecordCard` in the margin | the card's `h2`; Escape returns |
| Show connections | an entity button anywhere (lender, association, adviser, contractor, holder) | `focus`, `hops=1`, `sel` | scroll to `#connections`, node in focus | the graph detail heading; "Back to {origin}" |
| Filter | rail controls | the param | `{N} → {k}` announced | stays on the control |
| Highlight holder | matrix row label; Find | `holder` | row accent, `HolderCard`, the comparison note | the card's `h2` |
| Select state | map (click, or Enter on an option); select | `st` | `StatePanel`; list filtered; clicking the selected state clears it | the panel `h2`; Escape clears |
| Not placed | `UnionBar` segment | in-page | `ProjectList` filtered to unplaced records, announced | stays |
| Band | a flow ribbon | in-page | `ProjectList` filtered to the band's records, announced | stays |
| Brush years | clock drag, or Shift+arrows on the focused axis | `y` | all lens surfaces | stays |
| Copy citation | `RecordCard` | — | clipboard; `Citation copied` | stays |
| Export | "Copy as TSV" / "Download .tsv" above every twin | — | `Table copied, {rows} rows` | stays |
| Change lens | tab | `lens`; clears `rec` | the lens panel mounts; `y`, `st`, `tier`, `find`, `sel` persist | the lens heading |
| Escape | anywhere | — | closes the open expandable row, then the margin panel, then clears the latest selection (`rec`, then `holder`/`st`) | the invoking control |

Coarse pointers: the first tap on a map state, a ribbon, a timeline square or a lane bar
shows its `title` text in a reserved one-line readout under the graphic; a second tap, or
the "Open state" button, acts (energy D30). Copy is device-neutral ("open", "choose"),
never "hover" or "click" (energy D33). Reduced motion: no transitions on fill, no animated
scroll, no graph warm-up beyond what `GraphExplorer` already honours.

---

## 8. Encodings

### 8.1 Channels

| where | channel | means | never means |
|---|---|---|---|
| everywhere | `strokeDasharray` | evidence tier, and nothing else | style, era, party |
| graph, flow | node hue (`fam`) | family: state / capital / recipient / instrument / enforce / market | party, country, verdict |
| graph | shape (`ty`) | entity type | — |
| graph | size (`sz`) | declared band | importance, degree |
| map | ramp fill | ₹ counted or records placed, in fixed pooled bins | party, generosity, a score |
| map | hatch | no record names this state | zero |
| map | stipple | only a state body registered here is named | zero, low |
| map (G1) | fine overlay | placed by the fetcher's rule, not by a state government | a lesser amount |
| flow | band width | ₹ crore (census) | share of anything else |
| clock, timelines | x | date on one linear scale | — |
| clock | tick · bar · count bar | one record · a tenure · projects in a year | amount · party · ₹ |
| receipts | bar height · hatch column · tick · bracket | ₹ crore for one FY · no national total recorded · a superseded figure · a multi-FY figure | growth · zero · — |
| timeline | square · rose rule · `[ ]` | an action · position of a response · no response recorded | wrongdoing · credibility |
| matrix | filled · hollow `Σ` (analytic dash) · hollow · hatch | filing line · aggregate (lower bound, research-computed) · not named · no named holder recorded | size of holding (text only, and only after G3a) |
| everywhere | `--color-rose` | response or denial | bad |
| everywhere | `--color-amber` | not recorded (response, source, cui-bono row) | suspicious |
| everywhere | accent | selection (`st`, `rec`, `holder`) | importance |
| text only | party, election winner, country, religion, action kind, ground, basis | as recorded | — |

### 8.2 Frozen (the developer may not adjust these to make it fit)

1. `strokeDasharray` means tier on every mark that stands for a claim, including view
   aggregates, which take their weakest constituent tier. `alleged` and `documented` never
   render alike, in any theme, greyscale or screenshot. Assembly rules are solid and
   lighter, never dotted.
2. Family hue, type shape and declared size band are unchanged from `ForceGraph`. Synthetic
   flow nodes take `instrument/instrument`, `industry/market`, `state/state`. No new hue.
3. Hatch, stipple, hollow, the G1 overlay, ramp floor and page ground are distinct fills,
   verified by a greyscale screenshot at 390 and 1280 (FG-30). Hatch ≠ zero; hatch ≠
   "read, not named"; three textures, three meanings, none merged for looks.
4. **No ₹ total sums anything but census-counted rows.** No grand total across lenders,
   modules or populations exists anywhere, including export headers and `aria-label`s.
   Census and researched sample are never summed, stacked or drawn in one Sankey.
5. **No loan without a numeric `a` is coerced to 0** in any total, bar, band, ramp or sort.
   Its cell reads exactly `amount not stated / in US$ m`.
6. No percentage is parsed from `d`. The matrix has no colour ramp.
7. Band A is always rendered, with at least four rows or the matrix withheld. `holder`
   highlights and never filters. Filing lines and aggregates are never added.
8. Every enforce, alleged and award item has a response slot at equal width, size and
   weight, and the exact sentence `No response recorded — asked/not asked unknown` when
   empty.
9. One x-scale per timeline; no axis rescales to the years that happen to have data.
10. Party, country and religion are text, never colour, never a filter. Rose is response
    only.
11. `a of b` is always printed; a percentage appears only when b ≥ 10. A page-computed
    number is labelled `computed here` where it appears (welfare U5).
12. Nulls read `not stated`, `not recorded`, `none linked`, `not computed`. Never `0`, never a
    bare `—`, never `NaN`. An empty `srcs` reads `no source in file` in amber.
13. Default sorts are by date or by a declared external quantity, never by a page-computed
    score, and never by money in the benefit, mandate or holder tables.
14. Map bins are pooled over every year with no filters and do not move when the reader
    filters.
15. The default view is unfiltered with no selection; Loans is the default lens.
16. Captions C1–C15 and the gaps panel render at body size, directly under their graphic.
    None goes in the footer.
17. The exact strings: `amount not stated / in US$ m`, `No response recorded — asked/not
    asked unknown`, `Comparison set required`, `No cui-bono row recorded`.

---

## 9. Captions the page must carry

C1, C2 `LoanMap` · C3 `LoanFlow` · C4 `LoanClock` · C5 `RecordsStrip` · C6 `ContractsTable`
· C7 `DebarmentsTable` · C8 `ReceiptsByYear` · C9 `ActionsTimeline` · C10 `WelfareJoin` ·
C11 `HolderMatrix` · C12 `AdviserComparison` · C13 `RulesTimeline` · C14 Narratives · C15
Graph; plus the `ProjectList`, `DebtContext`, `LicencesTable`, `OutsideIndex` and
`StateReceipts` captions in §5. Each `{brace}` is derived; hand-written copy states method,
never a figure. Every caption says what the graphic cannot show.

---

## 10. Loading, empty, partial and no-data states

| state | render |
|---|---|
| Loading | Only the lazy route chunk and the lazy graph; the modules are in the main bundle through `DataContext`. Route fallback: PageTitle + Standfirst. Graph fallback: a 620 px block "Drawing the connection graph…" stating the node and edge counts it will draw |
| A module `META.empty` | Full chrome. A `Callout label="Register not yet promoted"` under the Standfirst when the active lens's module is empty; the strip reads `register not yet promoted · nothing below is zero`; maps hatched; the matrix hatched with Band A rows kept; every section `Nothing recorded yet.` Smoke passes (FG-2) |
| Export absent (G1–G3c, P5) | the specific interim state named per component in §5, and the derived gap line |
| Partial years (common) | Loans: the clock runs from the first record to `asOf`, years with no approvals are empty columns and rows with later first dates shade their uncovered span. Associations: `FY_AXIS` includes the missing FYs as hatch. Every partial caption states the covered range inside the drawn range |
| Partial amounts (common) | the exact text, in no total, counted in strip fact 6 and the `ReconciliationLine`; the excluded count sits beside every total |
| Partial placement (common) | `UnionBar` and C1 carry it in the frame |
| Partial matrix (common) | hatched columns; C11 |
| Filters → 0 | strip `N → 0`; the centre shows `No record in this register matches {filters}. This is a statement about the register, not about India.` naming the most-removing filter, with a one-click reset of it. The matrix keeps its rows |
| Unknown `rec` / `sel` / `holder` / `lender` / `st` / `y` | the default, with `ignored an unrecognised {param} value`; `rec` unknown: `No record {id} in the three registers.` |

---

## 11. Edge cases

| # | case | where | behaviour |
|---|---|---|---|
| E1 | Loan with no `a` (pre-1960 US$ only, JICA yen, pipeline, aggregate) | every amount cell | exactly `amount not stated / in US$ m` (+ `US${usdM} m` with G1); in no ₹ total, band, ramp or ₹ sort; counted in "{k} with no ₹ amount excluded" beside each total (Review Focus 1) |
| E2 | Loan with `a === 0` | card, list | `₹0 cr — as recorded` and "read the record text"; counted as a number |
| E3 | Pipeline leg | list, clock | "pipeline, not yet approved": excluded from ₹ and US$ totals; hatched in the count lane |
| E4 | Blend project (IBRD + IDA legs) | list, flow | one project row with two legs; project counts count it once, ₹ sums both legs; a leg without ₹ reads `+ {k} leg(s) without ₹` |
| E5 | Researched record repeating a census P-number | strip, list, gaps | without G1: listed, never summed, counted in the duplicate gap line; with G1: `counted under {P-number}`, hollow mark |
| E6 | Non-binding MoU or portfolio aggregate with an `a` | strip, list | listed, never summed; with G1 `not a commitment: {reason}` |
| E7 | Facility beside its tranches | strip | one mark each, never summed; C5 says so |
| E8 | The same loan in two files at two ₹ figures | strip, list | both listed as recorded; the gap line counts the pair; reconciliation, not the page, resolves it |
| E9 | Borrower blank in the API | list, card | "(API blank — Union recorded by default)" |
| E10 | Implementing body a Union bank registered outside Delhi (SIDBI, `st` up) | map | stipple in that state, never fill; the readout says why |
| E11 | Implementing body a Union body seated in Delhi | map | not placed; counted in "Union body or not placed"; Delhi is filled only by a `ty: 'state'` node with `st: 'dl'` |
| E12 | Census loan implemented by several states | map | the benefit row names one `who`; placed only if that `who` is a state government; the card shows `d`, which lists every implementer; counted in the derived gap |
| E13 | Placement by project title only (G1) | map, list | overlay texture; basis `title` in the basis column and readout |
| E14 | Corporate borrower (`ty` company) | map | never placed; rule "corporate borrower — head office is not where the money went" |
| E15 | State with no placed project | map | hatch, "no loan record names this state"; never zero |
| E16 | `y` with no approvals | list | empty state naming adjacent years with links; `y` unchanged |
| E17 | `lender` is a sample lender while viewing the map | map | note "{lender} is not painted: the map fills from the World Bank census; its {n} records naming a state government are counted in the readout" |
| E18 | Sector label differing only by taxonomy prefix (G1) | flow | separate nodes (D9) |
| E19 | Open-ended tenure from 1991 overlaps a 2020 approval | `OfficeOnDate`, clock | listed under "Start recorded, end not recorded", never under "Tenure covers"; bar to `asOf` with its label; the fix belongs in the research file |
| E20 | Two role edges for the same person and office from two files | clock, card | both drawn and listed, each with its tier and source; not merged |
| E21 | No window covers an approval date | list, card | `no recorded window covers {date}`; counted in the derived gap |
| E22 | Lok Sabha elections before 2004 | clock | the span is shaded "not in this register"; no rules invented |
| E23 | `st` set and the state has assembly elections | clock | lighter solid rules for that state; the caption adds "an assembly election falls somewhere in India almost every year; timing is not cause" |
| E24 | Award without a P-number token | contracts | the "not keyed to a World Bank project id" table, grouped by awarder |
| E25 | Debarment with an open end | debarments | `open: no end date in the feed` |
| E26 | FY with two national totals (one superseded) | receipts | the current one drawn in its own dash; the superseded a tick; both in the twin. A documented figure superseded by a reported one draws the reported (supersession is the reconciliation editor's call; the page does not re-rank) |
| E27 | FY with no national total | receipts | hatched column `no national total recorded`; the derived gap counts it |
| E28 | Three-FY national figure | receipts | bracket, never a bar; excluded from any per-FY reading |
| E29 | Enforce event with no contra | list, card, contested | exactly `No response recorded — asked/not asked unknown` (Review Focus 4) |
| E30 | Other claims in the same case file carry responses | list | the second line `{k} response(s) recorded to other claims in this case, shown above/below.` |
| E31 | Contra whose own `d` begins with the sentence | list | printed once; the contra's tier chip shown |
| E32 | Contra that says "Not applicable" (an audit-added contra) | list | printed verbatim as the response; never suppressed; counted as a response |
| E33 | Undated response | list | "undated response" |
| E34 | Enforce event targeting the aggregate of all registrations | timeline | population annotation and the aggregates table; never a tick; never summed with another count |
| E35 | Court ruling targeting MHA rather than the association | timeline | lane "Courts and oversight on the government's actions"; the association named in `lab`, not joined |
| E36 | Undated enforce event | timeline | right gutter `undated`, counted in the lane label |
| E37 | Association with `st` null | list, filters | "registered office not recorded"; `st` filtering skips it and says so |
| E38 | Welfare-join row with a `scheme:` id missing from `WELFARE_SCHEMES` | join | listed as linked; scheme cell `scheme id not in the welfare register` |
| E39 | `holder=cap:blackrock` from a shared link | matrix | full matrix; BlackRock accented in its band; the "Comparison set required" note; `HolderCard` open (Review Focus 5) |
| E40 | `holder` set to an adviser with no holdings (`cap:rothschild-co`) | matrix | full matrix; the note plus "no recorded line in a NIFTY 50 filing"; `HolderCard` lists its outside-index `own` edges and mandates |
| E41 | `tier=reported` leaves Band A with no lines | matrix | Band A rows still drawn; cells not-named or hatch; the note reads "tier filter: reported only"; rows are never removed |
| E42 | A holder has both a filing line and an aggregate in one company | matrix | drawn as `line`; the aggregate named in the cell's accessible name and listed in the twin; the two never added |
| E43 | A holder has only aggregates (BlackRock today) | matrix | hollow `Σ` cells with the analytic dash; row summary `0 filing lines · {n} aggregates, analytic`; never described as "named" |
| E44 | A holder has two fund lines in one company | matrix | one cell `≥1% ×2`; two rows in the twin; no sum computed |
| E45 | Constituent with `existingId` null | matrix | hatched column `no company record` |
| E46 | Announced, not yet effective index change (`INDEX_CHANGES`) | matrix header | printed "announced, not applied: {out} → {in}, effective {date} [{tier}]"; not applied |
| E47 | Holder recorded under two ids (`cap:temasek`, `cap:temasek-holdings`) | matrix | two rows, as recorded; the gap line states the rule |
| E48 | Own edge dated at a non-quarter date | column header | the date as recorded; counted in `{dates}` |
| E49 | Rule with `supersededBy` | rules | both bars, connector, the word "superseded"; the superseded bar keeps its dash |
| E50 | Rule with no benefit row and no innocent reading | rules | both amber lines; counted in the derived gap |
| E51 | Mandate fee null / zero / Re 1 | mandates | `fee not disclosed` / `₹0 cr — as recorded` / `Re 1 bid (estimated)` as recorded; never blank |
| E52 | Licence with one date | licences | shown and not timed: `one date not recorded` |
| E53 | Same narrative in two files with different ratings | ladder | both listed, file named; never de-duplicated |
| E54 | `rec` belongs to another lens | margin | the card opens with "belongs to the {lens} lens — go there"; the page does not switch lens itself |
| E55 | `sel` reachable only through census legs | graph | the heading line and "Show its projects →" (§5.5.1) |
| E56 | `focus` id not in `GRAPH_NODES` | graph | GraphExplorer's own message plus the status line's census sentence |
| E57 | Graph endpoint resolving in no register | graph | the edge is dropped from the graph only; the count is in the status line |
| E58 | `y=2031` or `y=abc` | rail | falls back to all years with the ignored notice |
| E59 | `lender` set while Associations is active | rail | inactive control with its reason; the param kept |
| E60 | Two lenders with the same label from two modules | Find, rail | disambiguated by `sub` and id suffix |
| E61 | Node id unresolved in any graph | every label | `{id} (not in the register)`, amber mono |
| E62 | Export while filtered | every TSV | the `#` header carries the filters and the population definition; rows equal what is drawn (FG-22) |
| E63 | Module regenerated with different counts | everywhere | every figure is derived; no test or caption carries a count from a brief |
| E64 | 390 px | page | §12; no horizontal page scroll |

---

## 12. Mobile at 390 px (no horizontal page scroll)

`useNarrow()` = `matchMedia('(max-width: 639px)')`.

- **Header:** Kicker, title, standfirst, byline, standing line; strip facts 3–6 move to a
  mono line under the byline.
- **Pinned stack:** site header + one-line strip + tabs ≤ 140 px (welfare U18). The
  active-filter line is not sticky.
- **Tabs:** full-width segmented control, 44 px targets; they wrap to two lines if needed and
  never become a hidden menu.
- **Find:** full width, directly under the tabs.
- **Rail:** collapses into `<details>` labelled `Filters ({active}) · {N} → {k}`; the
  effect line stays outside the collapsed block; native selects.
- **`LoanMap`:** full width, `clamp(300px, 70vw, 420px)`; hatch pitch in screen pixels; tap →
  readout → "Open state"; the `Open a state` select under the figcaption; the `UnionBar`
  stacks as two labelled rows; legend swatches ≥ 12 px.
- **`LoanFlow`:** replaced by the two ranked bar lists (D38), band table beneath.
- **`LoanClock`, `ActionsTimeline`, `RulesTimeline`, receipts:** each scrolls horizontally
  inside its own container with a sticky 96 px label column; initial `scrollLeft` puts
  `asOf` at the right edge; a mono line `showing {a}–{b}` with "‹ earlier" / "later ›"
  buttons; edge fades. The twin renders by default under each, with the graphic behind a
  `Show the diagram` button where its labels would otherwise halve (D38).
- **`RecordsStrip`:** rows stack; the log axis spans the full width.
- **`HolderMatrix`:** transposed (company rows × Band A columns, 32 px each + a 110 px sticky
  label); Band B as a per-row mono line; rotated short labels with full names in the
  accessible names (D32).
- **Tables:** `StackTable` cards for `ProjectList` (project, amount, placement, awards first;
  the rest in a disclosure); other tables keep a sticky first column with `{k} columns ·
  scroll → for the rest`, a right-edge fade, and a wrapper `role="region"` with
  `aria-label` = the table caption. `ActionsList` and the `RecordCard` response halves
  stack, same size.
- **Margin panels:** render directly under the component that opened them, with one
  `scrollIntoView` and `scroll-margin-top` = the pinned stack.
- **Graph:** behind `Load the graph` (welfare D21).
- **Mono floor:** nothing below 12 px.
- **Gates:** at 360 and 390, `document.scrollingElement.scrollWidth ≤ innerWidth` on every
  lens, with `view=table`, with `rec` open, and with `holder=cap:blackrock` (FG-31); at
  390×844 the strip, tabs, rail summary and the `UnionBar` are within the first 844 px
  (FG-33).

---

## 13. Accessibility

- **Landmarks and outline:** `h1` PageTitle; `nav` (filters); `main`; an `h2` per lens panel
  and per section; `aside` (margin) with card titles as `h2` and sub-blocks as `h3`; each
  case file an `h3` in `ActionsList`; `footer`. The strip is `<section aria-label="Denominators">`
  with a hidden `h2`.
- **Tabs:** WAI-ARIA tabs pattern, manual activation; the panel `aria-labelledby` its tab.
- **Map:** the `WelfareMap` listbox model (`role="listbox"` of 36 state options, north to
  south; each option's name carries the class and the value; Enter selects, Escape clears;
  SVG shapes `aria-hidden`). This keeps the welfare supersession of `role="img"`.
- **Flow:** `role="img"` with a name stating the denominator ("{bands} bands, ₹{x} crore
  across {records} records; {excluded} records without ₹ not drawn; a table follows");
  ribbons stay focusable buttons; a skip link "Skip the diagram to its table".
- **Clock, timelines, receipts, strip:** the drawing is `aria-hidden`; everything it says is
  in the label column's buttons and the twin; a skip link "Skip to the table" before each.
- **Matrix:** a real `<table>` with `<caption>`, `th scope="col"` on companies, `th
  scope="row"` on holders, band headers as `<th colspan>` rows; cells are buttons with the
  §5.3.1 accessible names; roving tabindex inside the grid (arrows move, Enter opens) and
  Tab leaves it; selection is `aria-current="true"` plus the visible "(selected)".
- **Response pairs:** one `<dl>` per item; the response is never `aria-hidden` or collapsed.
- **Graph:** canvas + `GraphA11y` overlay (existing); when `sel` opens it, focus moves to the
  graph section heading.
- **Live region:** exactly one, polite, debounced (FG-47).
- **Unavailable options:** `aria-disabled="true"`, focusable, reason in the accessible name.
- **Text:** `<abbr title="crore">cr</abbr>` on first use per table; numbers `font-mono
  tabular-nums`; contrast ≥ 4.5:1 for text, ≥ 3:1 for hatch, stipple, dotted ground and dash
  strokes against `--color-bg`; the ramp floor ≥ `#2e373f`.
- **Targets:** 44 px on coarse pointers; 24 px on fine.
- **Keyboard budget:** from the page top, the map listbox, the matrix table and the graph
  heading are each reachable in ≤ 25 tab stops at 1280; the `ProjectList`'s first row in
  ≤ 12 (FG-46).
- **Motion:** `prefers-reduced-motion` honoured everywhere.

---

## 14. What the page refuses to show, and why (`id="refusals"`)

- **A ₹ total over all loans**, or any subtotal over researched records. Census and sample,
  duplicates, facilities beside tranches and MoUs make it false (F1, F3).
- **A map of loans by borrower**, or placement from a registered office or head office (F4,
  F5).
- **A holder ranking, a "most connected", an influence or risk score.** Rows are the
  comparison set, then alphabetical; counts are of records, and the caption says they
  measure research attention.
- **BlackRock, or any holder, alone.** Band A always renders; below four rows nothing
  renders.
- **A percentage parsed from prose.** A cell says its state in words until the field exists.
- **A family, a religion or an ethnicity as a node, edge, filter or colour.** Narratives that
  name one are rated on the ladder only.
- **A classification of FCRA actions by keyword** (cancel, suspend), of associations by
  religion or stance, or of donors as foreign or domestic. `lab` and `sub` are quoted.
- **A sum of overlapping cancellation counts.**
- **An FCRA receipts map** by registered office, or from prose-quoted state figures.
- **Party colour anywhere.** Party is text. No party, religion, donor-country or era filter.
- **Budget marks invented from a calendar the data does not hold**, or elections the
  register does not carry.
- **A correlation or window between approvals and elections.** The lanes show both; the
  month histogram shows the boring explanation.
- **A merge of two ids by name** (Temasek, OSF, Manmohan Singh pairs).

---
## 15. Decisions

Every conflict between the two candidates, and every judge's addition, resolved here. The
builder has nothing left to choose.

| # | decision | alternative rejected | why |
|---|---|---|---|
| D1 | **B is the base.** Every briefed graphic draws today from structured fields, with its denominator inside the frame; the reader paths and interaction counts are gates | A's evidence-first base, which withholds the map, the census flow and the holder grid until G1–G4 land | A page that ships tables plus "not exported" lines fails the brief's first reading; B's fallbacks are honest without waiting. A's stricter rules are grafted where they were stricter |
| D2 | Derivations hold only anchor ids (§3.2), checked at load; no figure is a literal; **the page prints module counts only** | figures from either candidate's profile or the brief (285 / 948 / 34 of 50) | The modules were regenerated after both candidates were written and will be again |
| D3 | `Find` is the first control, searching all three registers, never auto-selecting | a per-lens search inside each table (A) | J arrives with a name (welfare U6) |
| D4 | **Two loan populations.** The census is the only summable population; researched records are listed and drawn one mark each | one ₹ total over all loans; per-lender sums of researched records | Duplicate P-numbers, facility and tranches, one loan in two files, MoUs (F3) |
| D5 | **No researched subtotal, ever**, even after reconciliation marks duplicates (A's G1 `countable` flags still produce no sum or sample Sankey) | A's second small Sankey over `countable` researched rows | A sample's flow measures research attention; "listed, not summed" is the only reading a sample supports. A's countability marks are kept as the counting-status column and hollow marks |
| D6 | A loan without a numeric `a` prints exactly `amount not stated / in US$ m`, is in no ₹ total, and is counted beside every total; zero is a number | coerce to 0; hide the row; a blank | Review Focus 1; a blank reads as nil |
| D7 | **Strict placement** (a `ty: 'state'` node as borrower or benefit `who`) with the `UnionBar` in the map's frame; the map is titled "placed in", never "borrowed by" | the brief's "by borrowing state" (the Union borrows); registered-office placement (paints Delhi and puts SIDBI in UP); parsing `→ id` tokens from `d` | The denominator must sit in the frame; only structural fields are read |
| D8 | With G1, the fetcher's rule (state agency, seat, title) is a **second labelled class** with a basis column, a third `UnionBar` segment and A's "Not placed" as the first ledger row | silently swapping to the looser rule; leaving the map at the strict rule forever | The undercount is shown without asserting a false placement; the reader sees which rows rest on a title |
| D9 | Flow middle column: `terms.instrument` today; with G1, **sector becomes the default** (the brief's lender → sector → state) with instrument as an option; sector strings **verbatim, no crosswalk** across the FY2017 taxonomy change | first-listed sector from `d` (an alphabetical artefact); B's "instrument stays default after P3"; a hand-written pre/post-2017 sector mapping | The brief asks for sector; a merge rule no source supplies is hand-written research |
| D10 | Map bins are **quantiles pooled over every census-counted placed record with no filters**, fixed; legend prints ₹ edges and names empty bins | B's per-view quantiles ("comparable within this view only") | Welfare K13: a shade must mean the same ₹ in two screenshots; per-view bins make a shared link say different things. The log toggle and `m=n` mitigate single-year views |
| D11 | The flow is census-only; other lenders are the `RecordsStrip`, one mark each on a log axis | a mixed-population Sankey | D4; a band for researched records is a sum |
| D12 | Contracts join loans by the first `P######` token in both `lab`s until `projectId` is exported; awards without a token attach to their awarder under "not keyed to a World Bank project id" | joining by implementing agency; dropping unkeyed awards | The token is machine-written by the fetcher in census labs; a gate fails if a census lab lacks it |
| D13 | Debarments are their own table with an "also an awardee" column and the `contracts` base-rate rows beneath; no score | a "risky contractor" flag | The overlap is the skeptic's question; a score is forbidden |
| D14 | Default sorts: date for lists, alphabetical for holders and advisers; ₹ declared offered as an option; never a computed ranking | default by ₹ or by count | A leaderboard of named entities the reader did not ask for |
| D15 | Amount kinds come from `pred`; the `RecordCard` builds a pasteable citation | kind parsed from `d` | Energy D1; J's exit action |
| D16 | Conditions coverage is a strip fact; an empty list prints `none recorded`, census legs add "(the Projects API carries no conditions: void)" | a blank cell | Conditionality is the political question (brief §3.2); its absence must be loud |
| D17 | `OfficeOnDate` separates covering tenures, open-ended tenures and same-day acts, with the date-test sentence; the list column prints every covering window verbatim with "end not recorded" | "the minister at approval"; treating an open end as still in office | Role edges mix offices; no loan names a minister (F8); an open 1991 window would otherwise sit beside every later approval |
| D18 | The clock draws Lok Sabha rules from the register only, shades the earlier span, prints a Union-budget void line, counts projects (not ₹) per year, and shows the month-of-approval histogram; it computes no pre-election window | a hand list of 1952–1999 elections; a budget calendar rule; ₹ per year; a "months before election" band | Nothing hand-written; a few large DPLs would dominate a timing question; welfare found timing symmetric, and the narrative sits on the ladder as `unsupported` |
| D19 | Assembly rules are solid and lighter, never dotted | dotted rules | Dotted is the analytic dash (frozen) |
| D20 | `LoanClock` is energy `TenureLanes` with optional `asOf`, `edgeById`, `rules`, `shadeBefore`, `onRange`, `extraLanes`; energy renders byte-identically | A's new `ApprovalLanes` component | Reuse over a new component; the energy suite is the gate |
| D21 | Receipts: FY axis from min to max, hatched missing FYs, superseded ticks, the multi-FY bracket, a source-class chip per bar; registrations as a third twin table | a line through the available points; plotting only years with data | A line interpolates across four missing years |
| D22 | **Band A is the declared comparison set read from `CAPITAL_IDENTITY.publicRole` (prefix `Mandatory comparison control`; six rows today)**; BlackRock and Vanguard sit in Band B on their recorded lines until G3c pins them as subjects; LIC likewise until declared | B's "eight rows including BlackRock and Vanguard" (their roles do not carry the phrase, F15); A's withheld grid until `CAPITAL_CONTROLS` exists; hard-coding ids in page code | The fleet's declaration is the only structural set; six ≥ four so the floor holds; hard-coded ids are hand-written; G3c replaces the prose prefix |
| D23 | Timeline lanes are case files ordered by **first dated action, then label**; grounds render as their own rows; responses join by `claim:` id; the exact sentence per claim with the other-claims line | ordering by number of actions (a leaderboard of the accused); alphabetical lanes (B); merging ground into action by date matching | A time chart reads in time; Review Focus 4 is about the claim, and the case line prevents the misleading "silent" reading |
| D24 | **Filing lines and aggregates are distinct** by `CAPITAL_EDGE_DOMAIN === 'holders-aggregates'`: an aggregate cell is hollow with the analytic dash and `Σ`, its words say "lower bound, computed by the research; no filing names this holder", the row summary counts the two separately, and they are never added | treating an analytic aggregate as a filing line; hiding aggregates | F14: the aggregates arrived after both candidates; calling BlackRock "named" in ten filings when no filing names it would be false |
| D25 | Population-level FCRA counts are annotations above the lanes **and** a table headed "These counts overlap and use different windows. They are never added.", with the base-rate row that sets named cases against all cancellations | drawing them as a lane; summing them; a caption alone | A count of 21,000 cancellations is not one event; the ~0.1% denominator belongs in the frame |
| D26 | No percentage is parsed from prose; cells say their state in words; the twin quotes the filing text | regex the first `%` in `d` | Records hold several percentages; the first is wrong in several cases |
| D27 | Capital columns are the full NIFTY 50 from `indices.ts`, alphabetical; a column with no named holder is hatched | only researched columns | The index is the declared population; the unresearched columns are the denominator |
| D28 | Donors are not classified as foreign or domestic; the node's `sub` is printed | a "foreign" flag inferred from name | No field supports it; controls include Union ministries and Indian foundations |
| D29 | The welfare join prints linked and unlinked rows with `{k} of {WELFARE_SCHEMES.length}` and the analytic count | showing only linked rows; a graph | Two analytic links do not make a network; 78 schemes is the denominator |
| D30 | Licences are their own table by awarder id (`s === 'sebi'`) with application→approval months where both dates exist; mandates and sales stay one table | B's single awards table for everything; splitting mandates from sales (no field) | The awarder id is structural; the licence-timing comparison is the question the JV narrative raises |
| D31 | Fee cells always say something: `fee not disclosed`, `₹0 cr — as recorded`, `Re 1 bid (estimated)` | a blank | A blank fee reads as free |
| D32 | Below 640 px the matrix is transposed (company rows × Band A columns) with Band B as a text line | 50 columns scrolling in a container; A's holder cards | Keeps the grid semantics and the four-row floor visible on a phone |
| D33 | `holder` highlights and never filters; the "Comparison set required" note appears whenever it is set; fewer than four Band A rows withholds the matrix and the twins still render | a holder filter guarded by a minimum; A's interim that withholds the grid whenever `CAPITAL_CONTROLS` is absent | Review Focus 5 must be structural, not a guard a URL can bypass; the declared set exists today |
| D34 | Every rule card has a Who-benefits slot; an empty slot reads `No cui-bono row recorded for this rule` in amber with the rule's `d` verbatim beneath; `{k} of {n}` in the frame | hiding the slot; deriving a benefit line from `d` | 0 of 22 rules carry a row; the page does not write research |
| D35 | The page's `tier` **shares name and format with `GraphExplorer`**, so one tier filter covers every surface; a response is **re-admitted whenever the claim it answers is shown**; the page never reads the graph's other params | A's no page-level tier filter; a separate page tier param | One evidence filter should mean one thing; a tier filter that separates a claim from its denial would break "denials beside claims" |
| D36 | The connection graph is the union of the three modules minus the census; `sel` persists across lenses; the status line gives the census count and the identity caveat; a `sel` only census legs reach gets "Show its projects →" | A's per-lens graph presets with `sel` cleared on lens change; feeding the census to the force graph | One selection model; 849 legs from two lenders to one borrower draw two fans that hide value |
| D37 | Graph presets are links that write the graph's `pred`; the default graph is unfiltered | opening the Associations graph pre-filtered | A pre-filtered default is a silent claim |
| D38 | Below 640 the Sankey becomes two ranked bar lists from the same bands, band table beneath; other diagrams show their twin by default with `Show the diagram` | scaling the 960 viewBox down | Labels halve; the page must not scroll horizontally |
| D39 | Every twin exports TSV with a `#` header (URL, filters, population definition, exclusions, run ids, asOf) | A's URL-only first line; CSV without provenance | P must reproduce the screen (welfare U1) |
| D40 | Refusals are a rail-foot line and a `#refusals` section (§14); no `party` param exists | silent absence | S reads refusals as evidence of method (energy D19) |
| D41 | Ids are never merged by name; split pairs render twice and the gap line states the rule | merging `cap:temasek` with `cap:temasek-holdings` on the page | Resolution is the assembler's job (HANDOFF invariant 2) |
| D42 | Each lens has its own ladder from its own module; a toggle shows every register's narratives with a module column; never de-duplicated by text | one merged ladder; merge by text similarity | Rating disagreements across files are information |
| D43 | Voids are listed per lens directly after its sections, and again in the page Gaps panel, at findings size | voids only in the footer | "Voids and gaps are printed, not hidden" |
| D44 | Lens switching keeps `y`, `st`, `tier`, `find`, `sel`; clears `rec`; keeps `lender`/`holder` inactive with a reason | resetting on tab change (A) | The reader learns the page once; the graph is one set, so `sel` stays valid |
| D45 | Tables paginate at 400 rows with `tp` (energy C15) | B's 100; A's cap-and-narrow | House precedent; a cap is truncation |
| D46 | The standing line about institutions sits in the header on every lens | only in the Capital lens | The trope protection is structural and belongs to the page |
| D47 | Prerequisites are one table (§3.3) merging A's export shapes with B's fallbacks; G1 is marked as a copy of fields the fetcher already writes and is the smallest first step | two lists; asking for research the fetcher already did | `projects[]` already carries state, sector, instrument, pipeline and totals (F4) |

---

## 16. Acceptance gates

For `scripts/pages/finance.test.mjs`, run against a pinned `FINANCE_DIST` in two builds:
FULL (current modules) and EMPTY (`META.empty` fixtures). **Every expected value is computed
by the test from the generated modules independently of `financeView.ts`.** Criteria marked
(G) assert both the interim and the post-export behaviour, whichever the build has.

**Review Focus**

- **FG-RF1.** Every loan edge without a numeric `a` renders, in `ProjectList` and
  `RecordCard`, the exact text `amount not stated / in US$ m`. The strip's ₹ counted equals
  the test's own sum over census edges with numeric `a` (±0.5). Adding every no-amount
  record's US$ figure changes no ₹ on the page. No researched record's `a` appears in any
  total, export header or `aria-label`.
- **FG-RF2.** For every `NGO_EDGES` enforce edge with no `contra` whose `t === 'claim:' + id`,
  its `ActionsList` row and its `RecordCard` contain the exact string `No response recorded
  — asked/not asked unknown` (U+2014). Where another claim in the same case file has a
  response, the other-claims line follows.
- **FG-RF3.** For every URL in {`/finance?lens=capital`, `…&holder=cap:blackrock`,
  `…&holder=cap:rothschild-co`, `…&tier=reported`, `…&tier=none`, `…&find=BlackRock`, `…&y=2020`},
  the matrix renders ≥ 4 holder rows and every `BAND_A` row; when `holder` is set the text
  `Comparison set required` is visible. Fuzzed `y` over every year present never yields a
  grid with < 4 rows. With a fixture of 3 Band A holders, the grid is absent and the callout
  and both twins are present.

**Data integrity**

- **FG-1.** Every anchor id (§3.2) exists; removing one fails the build.
- **FG-2.** With each module's `META.empty` forced, smoke passes and the lens shows `Register
  not yet promoted`; no figure reads 0 where a count is unavailable.
- **FG-3.** No numeric literal other than layout constants appears in `src/components/finance/*`
  or `src/pages/Finance.tsx` (grep with a px/ms allow-list).
- **FG-4.** Every ₹ total on the page has, within the same element, a count of excluded
  records; no ₹ figure exceeds the census-counted total.
- **FG-5.** Every census loan `lab` carries a `P######` token (the token join's precondition);
  the `ReconciliationLine`'s four loan terms sum to `LOANS.length`.
- **FG-6.** Map fill ₹ + `UnionBar` unplaced ₹ (+ fetcher-rule ₹ with G1) = strip ₹ counted,
  under five filter combinations.
- **FG-7.** No map state is filled by a record whose placement rule is not a state government
  (a fixture with a company borrower in Maharashtra leaves Maharashtra hatched; a Union
  bank registered in UP stipples UP).
- **FG-8.** (G) No matrix cell text contains a digit before G3a, apart from `1` in `≥1%` and
  the `×n` count; with G3a the cell prints `{pct}%` and still has no fill ramp.
- **FG-9.** (G) G1 absent: the `mid=sector` control is `aria-disabled` and the map has no
  overlay class; G1 present: `mid` defaults to `sector`, sector labels are exact API strings
  (a fixture with "Transportation" and "FY17 - Transportation" yields two nodes), and the
  basis column is populated.
- **FG-10.** The lanes twin's general-elections column is populated only from `Lok Sabha`
  rows; the text "Union budget dates are not a dataset in this build" is present; no rule is
  drawn before the first Lok Sabha row.
- **FG-11.** For an approval covered by an open-ended window, `OfficeOnDate` lists it under
  "Start recorded, end not recorded" and the list cell contains "end not recorded".
- **FG-12.** `ActionsList` response cells have a computed width ≥ 0.9 × the claim cells'
  width and the same font size at 1280; stacked at equal size at 390.
- **FG-13.** The receipts chart renders a hatched column labelled "no national total
  recorded" for every FY between the first and last recorded FY with no current row; no
  multi-FY row renders as a bar; every superseded row renders as a tick.
- **FG-14.** The aggregate-counts table header contains "never added"; no element prints
  their sum.
- **FG-15.** The welfare join's denominator reads `{k} of {WELFARE_SCHEMES.length}`; every
  analytic row shows its innocent reading.
- **FG-16.** Every rule card with no benefit row shows `No cui-bono row recorded for this
  rule` and the rule's `d`; the `{k} of {n}` line is present.
- **FG-17.** Every mandate row's fee cell is non-empty (`fee not disclosed`, `₹0 cr — as
  recorded`, or a figure with its confidence).
- **FG-18.** Every alleged edge in the active lens appears in Contested with a response slot.
- **FG-19.** For every `own` edge whose `CAPITAL_EDGE_DOMAIN` is `holders-aggregates`, its
  cell's accessible name contains "aggregate" and "analytic" and never "filing line"; the
  row summary's filing-line count excludes it; a fixture with one aggregate and one filing
  line per holder yields `1 filing line · 1 aggregate`.
- **FG-20.** `BAND_A` equals the set of identity ids whose `publicRole` starts with the
  anchored prefix (or, with G3c, the declared rows); the test computes it independently.

**Twins and exports**

- **FG-21.** For each graphic, twin row count = drawn marks (map 36 + 1; flow bands; clock
  ticks + bars; strip marks; receipts bars + ticks + brackets + hatches; timeline squares;
  matrix `(BAND_A + BAND_B) × COLUMNS` cells; rules bars).
- **FG-22.** Every TSV's first lines begin `#` and include `runId` and `asOf`; its data rows
  equal the on-screen twin rows under the same URL, including when filtered.
- **FG-23.** The `FY_AXIS` includes every FY between min and max.
- **FG-24.** The lanes twin's "(mid-year test)" column is populated for every year with ≥ 1
  covering window, and reads "no recorded window covers" otherwise.

**Encoding**

- **FG-30.** Greyscale screenshots at 390 and 1280 on each lens: hatch, stipple, hollow, the
  G1 overlay (when present), ramp floor and ground are pairwise distinguishable (ΔL ≥ 8);
  the four tier dashes are distinct; matrix `line`, `aggregate`, `not-named` and `no-record`
  cells differ in pattern, not only hue.
- **FG-31.** At 360 and 390, on each lens, with `view=table`, with `rec` open, and with
  `holder=cap:blackrock`, `document.scrollingElement.scrollWidth ≤ innerWidth`.
- **FG-32.** No element's fill or stroke is keyed to party, country or religion text; the
  words "Rothschilds" and "family" appear only inside narrative claim text or the standing
  line.
- **FG-33.** At 1280×800 on Loans the `UnionBar` is within the first viewport; at 390×844 the
  strip, tabs, rail summary and `UnionBar` are within the first 844 px.

**URL and interaction**

- **FG-34.** Every param round-trips; an unknown value produces `ignored an unrecognised
  {param} value`; defaults are elided from the URL; no param pre-selects an entity.
- **FG-35.** "Show connections" on a lender writes `focus`, `hops=1`, `sel`; focus lands on the
  graph detail heading; `sel=fin:ibrd` opens the graph and the status line states the
  census count not drawn.
- **FG-36.** Changing `tier` on the rail changes the graph's drawn edge count; a claim shown
  under a tier filter keeps its response visible whatever the response's tier.
- **FG-37.** The page never writes `q`, `fam`, `ty`, `amt` or `path`; changing `lens` keeps
  `y`, `st`, `tier`, `sel` and removes `rec`.
- **FG-38.** The energy suite stays at 67/67 and the welfare suite at its pinned counts on a
  pinned build after the `TenureLanes` and `WelfareMap` changes.
- **FG-39.** Every table offers `Copy as TSV`; Escape closes the open row, then the panel, then
  clears the latest selection, returning focus to the invoking control.

**Reader paths (scripted, 1280 and 390)**

- **FG-40.** L-J: type a census record's state fragment, choose the first record; the
  `RecordCard` shows a ₹ with its kind (or the exact no-amount text), a date, a lender, an
  http source, the office block and a response or the exact sentence, in ≤ 3 interactions.
- **FG-41.** A-J: type a named association from `ACTIONS`; its block shows each action with a
  response or the exact sentence, in ≤ 3 interactions.
- **FG-42.** C-J: activate Associations, then Capital, then the BlackRock row label; Band A is
  visible, the row is accented, the note is visible, and the row summary distinguishes
  filing lines from aggregates, in ≤ 3 interactions.

**Accessibility**

- **FG-45.** axe: 0 serious or critical on each lens and each panel state.
- **FG-46.** Tabs, map listbox and matrix grid are keyboard-complete; from the page top the
  map listbox, the matrix and the graph heading are each reachable in ≤ 25 tab stops and the
  `ProjectList`'s first row in ≤ 12, at 1280.
- **FG-47.** Exactly one `aria-live` region.
- **FG-48.** The gaps panel's font size equals the findings' body size, and it lists every
  `*_VOIDS` entry of the lens.

---

## 17. Build estimate

**Create**

| file | contents | est. lines |
|---|---|---|
| `src/data/finance.ts` | re-exports and the prerequisite shims (`null` when absent) | 60 |
| `src/data/financeView.ts` | every derivation in §3.2, `derivedGaps`, `tsv`, `sourceClass`, `stripFacts` | 520 |
| `src/pages/Finance.tsx` | composition, URL wiring, lens tabs, margin precedence, all states | 380 |
| `src/components/finance/Control.tsx` | `Find`, `FilterRail`, `ReconciliationLine`, active-filter line, `ControlCard`, `ReadingKey` | 300 |
| `src/components/finance/LoansLens.tsx` | `LoanMap` + `UnionBar`, `LoanFlow` parts, `LoanClock` wiring, `RecordsStrip`, `ProjectList`, `ContractsTable`, `DebarmentsTable`, `ConditionsAndRules`, `DebtContext` | 620 |
| `src/components/finance/AssociationsLens.tsx` | `ReceiptsByYear`, `StateReceipts`, `ActionsTimeline`, `ActionsList`, `GrantsNamed`, `WelfareJoin` | 480 |
| `src/components/finance/CapitalLens.tsx` | `OutsideIndex`, `MandatesTable`, `AdviserComparison`, `LicencesTable`, `RulesTimeline` | 340 |
| `src/components/finance/HolderMatrix.tsx` | bands, cells, guard, transposed form, twins | 300 |
| `src/components/finance/Panels.tsx` | `RecordCard`, `OfficeOnDate`, `StatePanel`, `HolderCard`, `CannotShowCard` | 360 |
| `src/components/finance/Sections.tsx` | per-lens base rates, narratives toggle, cannot-show, contested, gaps, refusals, foot | 220 |
| `src/components/finance/ui.tsx` | hatch column, tick, bracket, `Σ` cell, month histogram, TSV buttons | 160 |
| `scripts/finance-view.test.mjs` | derivations against fixtures (inclusion, placement, `lineKind`, `BAND_A`, `officeOnDate`, `fyOf`, token join) | 220 |
| `scripts/pages/finance.test.mjs` | §16, RED first | 700 |
| `docs/design/FINANCE_UX_REVIEW.md`, `FINANCE_ACCEPTANCE.md`, `FINANCE_A11Y.md` | per plan Task 7 | — |

**Modify**

| file | change | est. lines |
|---|---|---|
| `src/components/welfare/WelfareMap.tsx` | loosen `rows` to `Map<StateCode, {cls: FillClass} & Record<string, unknown>>`; export `FillClass` from `welfareView` unchanged | 5 |
| `src/components/energy/TenureLanes.tsx` | optional `asOf`, `edgeById`, `rules`, `shadeBefore`, `onRange`, `extraLanes`; energy call sites unchanged | 90 |
| `src/components/viz/FlowSankey.tsx` | `FLOW_PRED_LABEL.loan/grant`; optional `captionExtra` | 10 |
| `src/App.tsx`, `src/components/Layout.tsx` | route and nav entry | 8 |
| `scripts/smoke.mjs` | the six routes in §3.1 | 8 |
| `package.json` | `test:pages` gains `finance.test.mjs` | 1 |
| `scripts/assemble-fleet.mjs`, `scripts/finance/fetch-worldbank.mjs`, `src/graph/fleet.ts`, `scripts/validate.mjs` | G1 and G2 (copy of `projects[]` fields and `provenance.totals`); later G3a–c, P1, P5 | 120 |
| `docs/INDEX.md`, `HANDOFF.md` | a paragraph on the page and a pointer to this spec | 10 |

---

## 18. Open risks for review

1. **Aggregates versus filing lines** (D24). The matrix's honesty rests on
   `CAPITAL_EDGE_DOMAIN === 'holders-aggregates'`. If the assembler renames the domain the
   anchor check fails the build (FG-1); if a future batch records an aggregate under another
   domain it would draw as a filing line. The reconciliation editor should give aggregates a
   structured `kind` (deferred, X4).
2. **The strict placement rule places about a quarter of counted census ₹.** Until G1 the
   map is the page's most misreadable graphic; C1, C2 and the `UnionBar` carry the reason,
   and FG-7 forbids the wrong fills. The UX review should test whether readers read "little
   went to states" off it.
3. **Two shared components change** (`TenureLanes`, `WelfareMap`). `/energy` 67/67 and
   `/welfare` pinned counts are the gates (FG-38).
4. **Two places read text the fleet wrote:** the `P######` token (D12) and the `publicRole`
   prefix (D22). Each has a gate (FG-5, FG-20) and a structured replacement requested (P1,
   G3c).
5. **Twelve researched records repeat a census P-number and AIIB CARES sits at two ₹ figures.**
   No researched subtotal exists anywhere; the gap line says why; readers may take it for a
   missing feature.
6. **`energy:manmohan-singh`'s 1991 window has no end.** It is listed under "end not
   recorded" beside every later approval until the research file gains a `to`.
7. **Split ids** (`cap:temasek` / `cap:temasek-holdings`; `ngo:` / `cap:` OSF; `energy:` /
   `wel:` Manmohan Singh) render twice until reconciled. Honest, and it looks like a bug.
8. **Nominal ₹ across 1949–2026** dominate any all-years view; the default is unfiltered as
   the house requires; a deflated option is deferred (X5).
9. **The FCRA named cases are ~0.1% of cancellations.** A timeline of a few dozen case files
   can still read as "the crackdown"; the aggregates table and base-rate row sit in the same
   frame to prevent that. The UX review should test whether they do.
10. **Sector taxonomy split (D9)** roughly doubles the flow's middle column once G1 lands;
    the only acceptable fix is a crosswalk the World Bank publishes.
11. **The graph excludes the census**, so "Show connections" on a census-only borrower opens a
    thin ego graph; the status line and "Show its projects →" explain why.

---

## Deferred amendments

*Not applied. Hypotheses to test with real readers, or research and assembler work that is
not design. Each needs a decision before it is built. The synthetic five-seat UX review
(plan Task 7, Step 1) will add its own should/could items here, as for energy and welfare.*

| # | item | why deferred |
|---|---|---|
| X1 | G1–G3c, P1, P5, P7 (§3.3) | reviewed generator and research changes; the page's fallbacks are specified and gated |
| X2 | A Union-budget calendar dataset (`research/raw/budgets.json`, sourced) to draw the budget lane | no source in the register; nothing hand-written |
| X3 | Lok Sabha elections 1952–1999 in `WELFARE_ELECTIONS` or a shared elections file, so the clock covers pre-2004 approvals | research, not design |
| X4 | A structured `kind: 'filing' \| 'aggregate'` on `own` claims, replacing the domain anchor of D24 | contract change for the capital fleet |
| X5 | Real-terms ₹ (deflated) as a metric option, and per-capita or per-GSDP state lending | needs a declared deflator and denominator series in the register |
| X6 | US$ view for loans (`m=usd`) beyond census records | `a` is ₹ at the approval-year rate; US$ is prose on researched records |
| X7 | Loan conditions for the census (prior actions, DLIs) from Program Documents; disbursement beside commitment | Projects API voids |
| X8 | FCRA association-level receipts by year (FC-4 returns); receipts by purpose | portal unreachable; a void in the register |
| X9 | A structured `action` field on FCRA enforce claims (cancel / suspend / refuse / prior permission) so the timeline can use glyphs; an `asked` field on contra (asked, no reply / not asked) | contract changes for the NGO fleet (energy C14) |
| X10 | Cross-fleet identity reconciliation (Temasek, OSF, Manmohan Singh pairs) | reconciliation editor |
| X11 | Matrix history across quarters; SEC 13F ADR holdings as a second, labelled source | one filing per company today; research |
| X12 | Contract bidder counts as a structured field, allowing a single-bid rate over lender-funded awards beside the CPPP national rate on `/tenders` | in record text only |
| X13 | UPA/NDA era toggle | probably refused: the symmetry texts carry the era comparison, and a party-era filter is a party lens |
| X14 | KfW and IMF programme data; SEBI licence comparators beyond the file's three | blocked sources, recorded as voids; research |
| X15 | SOTA §6 items beyond plan Task 9 (label occupancy, `contraWidth`, path strip, tenure strip in the graph card) | shared explorer work |
| X16 | A merged "all narratives" ladder as the default | D42 keeps per-lens ladders; the toggle exists |
