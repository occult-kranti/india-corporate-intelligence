# /finance: Foreign money (candidate spec B, reader-journey-first)

*Status: candidate B for the design duel, written 2026-09-26. Binding brief:
`docs/superpowers/specs/2026-09-26-foreign-money-ngos-tenders-design.md` §4.7 and the Review
Focus of `docs/superpowers/plans/2026-09-26-foreign-money-ngos-tenders.md`. House form:
`docs/design/ENERGY_PAGE.md` and `docs/design/WELFARE_PAGE.md`.*

*Data contract: three generated graph modules and two joins.*
- `src/graph/finance.generated.ts`: `FINANCE_NODES`, `FINANCE_EDGES`, `FINANCE_EDGE_DOMAIN`,
  `FINANCE_BENEFITS`, `FINANCE_VOIDS`, `FINANCE_NARRATIVES`, `FINANCE_BASE_RATES`,
  `FINANCE_SYMMETRY`, `FINANCE_GAPS`, `FINANCE_IDENTITY`, `FINANCE_META`.
- `src/graph/ngo.generated.ts`: `NGO_*`, with the same eleven names.
- `src/graph/capital.generated.ts`: `CAPITAL_*`, with the same eleven names.
- `src/data/welfare.generated.ts`: `WELFARE_SCHEMES` and `WELFARE_ELECTIONS`.
- `src/data/indices.ts`: `NIFTY50` and `INDICES_AS_OF`.
- The merged graph from `useData()` in `src/context/DataContext.tsx`, used only to resolve
  endpoint labels that live outside the three modules.

**No figure in this document is page copy.** Every `{brace}` is derived at module scope in
`src/data/financeView.ts`, or in a `useMemo` keyed on the parsed URL. §0.2 profiles the modules
as they stood on 2026-09-26, so that the judge can see why the design takes the shape it does.
The page derives the same numbers itself and must never hard-code them.

---

## 0. How this candidate was made

### 0.1 The angle

The design starts from the readers, not the graphic. I named three readers, wrote the path
each would take through each lens in under two minutes (§1.3), and then kept only the
components those nine paths need. Where the brief asks for a graphic that no path needs, it
is kept, and the reason is given. Where a path needs something the data cannot honour, the
page says so on the control and in the gaps panel. It does not draw it.

The three readers:

- **J, the journalist on deadline.** Arrives with a name: a state, a lender, an association,
  "BlackRock". Needs one record with its amount, date, tier, source and response, and a
  citation to paste. They will not scroll to a methods section.
- **P, the policy researcher who exports.** Arrives with a question about a population:
  "World Bank lending by state since 2014", "FCRA receipts by year". Needs the full table,
  the definition of the population, what was excluded and why, as TSV that reproduces
  what the page drew.
- **S, the hostile skeptic hunting for the missing control.** Arrives believing the page is
  rigged, in either direction. Tests it by asking: Where is Vanguard? Where are the UPA-era
  cancellations? Did you add the same loan twice? What does an empty cell mean? The page
  must answer each of these in the frame where the question arises, not in a footnote.

### 0.2 What the modules actually hold (profiled 2026-09-26; for the judge, not page copy)

Runs: finance `run-989d2c6a4b16`, ngo `run-9d6a4ce89975`, capital `run-8d96ad5f346d`. Each
item below overturns an assumption in the brief, and each is answered by a decision in §13.

**Finance**

| # | Fact | Consequence |
|---|---|---|
| F1 | 948 `loan` edges. 849 are the scripted World Bank projects table (`FINANCE_EDGE_DOMAIN[id] === 'worldbank-projects'`). The other 99 were researched by hand across five domains. | There are two populations. One is a census; the other is a sample. They are never summed together (D4). |
| F2 | 53 loan edges carry no `a`: 19 pipeline records, 25 pre-1960 records in US$ only (no exchange rate), and 9 with the amount not stated. The record's `d` text says which in every case. | "amount not stated / in US$ m", in no ₹ total (D6, RF1). |
| F3 | 12 hand-researched records (domains `worldbank`, `literature`) describe the same project as a census record (same `P######` in `lab`), and no `supersededBy` links them. Researched records also duplicate each other across files: the same JICA MAHSR tranche is at two ₹ figures, the AIIB COVID loans appear in two files, and the 1991 IMF financing appears in two files at two figures. | Summing across files counts money twice. The census is the only summable population (D4, D5). |
| F4 | Among the researched loans, 2 ADB multitranche *facility* records sit beside their own tranche records. Three records have a non-binding MoU instrument, including a US$12 bn framework recorded at ₹53,400 cr. One is a portfolio aggregate. | Researched records are drawn one mark each and never summed (D5). |
| F5 | Borrower `t` is `min:ministry-of-finance` for 873 loans. **No per-loan state field exists in the module.** The raw `projects[]` array has a `state`, but it is not exported. | State placement must be derived from structured fields only (D7). This gives a strict rule and a known undercount (P2). |
| F6 | Under the strict rule (a node with `ty: 'state'` as borrower, or as the benefit row's `who`), 123 of the 805 census records with ₹ are placed, which is 24.4% of census ₹. A looser rule (a state body's registered state) places 34.7%, but it would put SIDBI, a Union bank, in Uttar Pradesh. The fleet's own title-based rule gives about 37%. | The map shows the strict rule. The looser rule's extra records are a separate texture. The fleet's figure is printed as a sensitivity (D7, D8). |
| F7 | **Sector is not a field.** It appears only as an alphabetical list inside `d`, with no shares. | The flow's middle column is the lending instrument (`terms.instrument`), which is structured. Sector is a declared gap (D9, P3). |
| F8 | `terms.conditions` is non-empty on 67 of the 948 loans. All 849 census records have null rate, tenor and grace. | Conditions coverage is a strip fact. A missing condition prints "none recorded", never blank (D16). |
| F9 | Finance-ministry tenures come from `role` edges in two domains. One tenure (Manmohan Singh, from 1991-06) has no end date. | "In office on the approval date" separates closed tenures from tenures whose end is not recorded (D17). |
| F10 | General elections are in `WELFARE_ELECTIONS` (`election === 'Lok Sabha'`) for 2004–2024 only. Union budget dates appear only as point-dated `role` claims. | The clock prints which elections and acts are recorded, and says the rest are absent from the file, not from history (D18). |

**NGO**

| # | Fact | Consequence |
|---|---|---|
| N1 | 291 edges. The brief says 285; `NGO_META.counts` records 271 claims in, 27 contras added and 7 killed. | The page prints `NGO_EDGES.length` and never repeats a count from a brief. |
| N2 | National receipts totals are 14 `grant` edges from `ngo:foreign-sources-aggregate` to `ngo:fcra-associations-aggregate`. Three are superseded. One spans three financial years. FY2012-13, FY2013-14, FY2022-23 and FY2023-24 have no total. | A financial-year strip with a hatch for missing years, superseded figures as ticks, and the multi-year figure as a bracket (D21). |
| N3 | **The FY2019-20 → 2021-22 state-wise table (RS Q.3253 Annexure I) is summed into three national totals.** Its 34 state rows are not records. A few state figures appear only as prose in `d`. | No FCRA map and no state table in this build. A void card names the annexure. The map and table switch on automatically when state rows land (D22, P5). |
| N4 | 93 `enforce` edges. The stated grounds are separate `alleged` enforce edges on the same target. Responses are `contra` edges with `t === 'claim:' + id`. | The timeline groups by association and pairs every event with its responses. Where no response exists it prints the exact sentence (D23, RF2). |
| N5 | The welfare join is 4 edges with a `scheme:` endpoint (all `analytic`), plus 38 rows in domain `darpan-welfare-join` that carry no scheme id. | The join table prints both groups and counts the unlinked rows (D25). |

**Capital**

| # | Fact | Consequence |
|---|---|---|
| C1 | 101 `own` edges. **The percentage is only in `d` prose**, and some records hold two fund lines. `a` is empty on 97 of them. | No percentage is parsed from prose. A cell reads "≥1% line recorded" and quotes the record until a structured `pct` lands (D28, P4). |
| C2 | The comparison set is declared structurally: the 8 nodes whose `CAPITAL_IDENTITY[id].publicRole` begins "Mandatory" (ADIA, BlackRock, Capital Group, Fidelity, GIC, KIA, NBIM, Vanguard). LIC is the fleet's domestic control, but it is not a capital node. | Band A is those 8 rows, always rendered. LIC appears in band B because it has a recorded line. The symmetry text, which names LIC, sits beside the matrix (D29, D30, P6). |
| C3 | 34 of the 50 NIFTY 50 constituents have at least one `own` edge. Each has exactly one filing date, and there are 7 distinct dates across all columns. | A column with no named holder is hatched. The caption says a row is not one moment (D31). |
| C4 | None of the 20 `law` edges has a `CAPITAL_BENEFITS` row. Some carry cui-bono prose in `d` or an `innocentReading`. | Every rule card prints "No cui-bono row recorded for this rule" in amber and quotes the record. This is a derived gap (D34). |

### 0.3 Data prerequisites (the page works without them, and gets better with them)

Each prerequisite is a change to research files, `RECONCILIATION.json` or
`scripts/assemble-fleet.mjs`, never to page code. Until it lands, the page renders the stated
fallback. When it lands, only `financeView.ts` changes.

| id | Prerequisite | Fallback until it lands | Upgrade |
|---|---|---|---|
| P1 | `projectId` as a structured field on `loan` and `award` claims (assembler copies it from `projects[].id` and from the award's source record) | The join uses the first `/\bP\d{6}\b/` token in `lab`. Awards with no token attach to their awarder as "project not identified" (D12). | Exact join. The gate test in §14 asserts that token join and field agree before the token rule is removed. |
| P2 | `place: { st, rule }` exported per census loan from `projects[].state` | Strict structural rule (D7) | The map may add the fleet's rule as a second, labelled class. It never silently swaps rules. |
| P3 | `sector1` (v2 primary sector) exported per census loan | Flow middle column = instrument. The `mid=sector` option is `aria-disabled` with its reason. | `mid=sector` becomes available. The default stays `instrument` (D9). |
| P4 | `pct: number` on `own` claims (schema field, validated 0–100) | Cell prints "≥1% line recorded" and quotes `d` | Cell prints `{pct}%` in mono. Still no colour ramp (D28). |
| P5 | FCRA state rows as `grant` edges from `ngo:foreign-sources-aggregate` to per-state aggregate nodes (`ty: 'group'`, `st` set), one per FY | Void card (D22) | State × FY table plus a map, hatch = no row |
| P6 | LIC declared as domestic control (an `IDENTITY` entry whose `publicRole` begins "Domestic control") | LIC appears in band B with its recorded lines. The symmetry quote names it. | Band A gains a labelled "domestic control" row. |
| P7 | Cross-file duplicates reconciled with `supersededBy` (F3) | Researched records are never summed (D5) | Unchanged: a researched record is still never summed with the census |

---

## 1. Purpose and readers

### 1.1 Purpose

`/finance` records foreign money in three forms, on one stage:

- **Loans:** sovereign and sub-sovereign external lending, and the contracts it paid for.
- **Associations:** foreign contributions to Indian associations under FCRA, and the
  government's actions against them.
- **Capital:** foreign holders, advisers and joint ventures in listed India, and the rules
  that moved their terms.

It holds the circulating narratives on the six-step ladder, never as edges. It treats
Rothschild & Co and BlackRock as companies, measured against a comparison set that is always
on screen. It asserts no motive. The page's claim about itself is narrow: *this is what the
register holds, how much of it can be summed, and what it cannot show.*

### 1.2 What each reader arrives with and must leave with

| Reader | Arrives with | Must leave with | Distrusts the page when |
|---|---|---|---|
| J | a name | one record: amount with its kind, date, tier, source, response, and a citation copied | the figure has no source; the response is missing or smaller; they cannot find the thing in two tries |
| P | a population question | a TSV whose rows and columns reproduce the graphic, with the population definition, exclusions and run id | a total mixes populations; an export differs from the screen; a filter changed the denominator silently |
| S | a suspicion | the control, in the same frame; the exclusion ledger; the boring explanation; the narrative's strongest counter | one holder appears without its peers; one era appears without the other; a duplicate is summed; "none" means "not searched" |

### 1.3 The two-minute paths

Interaction counts are clicks, taps or typed submissions, counted from a cold load of
`/finance`. The gates in §14 (A40–A42) script six of these paths and assert the counts at
1280×800 and at 390×844.

**Loans lens (default)**

| # | Reader and question | Path | Steps | Answered by |
|---|---|---|---|---|
| L-J | J: "Did the World Bank lend to Kerala, how much, when, and who was Finance Minister?" | Type `Kerala` in Find → pick the project from ≤ 8 results → the RecordCard shows the amount and its kind, the approval date, the lender, borrower and implementing body, the office-holders on the date, conditions, sources → Copy citation | 3 | `Find` §4.0.5, `RecordCard` §4.1.6, `OfficeOnDate` §4.1.7 |
| L-P | P: "World Bank lending by state since 2014, as a table" | Rail year From = 2014 → Table view (`view=table`) → Download .tsv (the table carries population, placement rule and inclusion columns) | 3 | `LoanMap` twin §4.1.1, `ProjectList` §4.1.5 |
| L-S | S: "You summed things twice, and you only show BJP states" | At rest: the reconciliation line under the strip gives census counted / not stated / researched (not summed). The map's in-frame bar gives ₹ placed in a state government vs Union or not placed. The margin ControlCard quotes the UPA-vs-NDA symmetry text. Click "Why only {p}% is on the map?" → the placement caption | 0–1 | `ReconciliationLine` §4.0.3, `UnionBar` §4.1.1, `ControlCard` §4.0.7 |

**Associations lens**

| # | Reader and question | Path | Steps | Answered by |
|---|---|---|---|---|
| A-J | J: "Was Oxfam India's FCRA cancelled, on what ground, and what did Oxfam say?" | Tab Associations → type `Oxfam` in Find → the result "Oxfam India, 3 actions" opens its block in `ActionsList`: each action with date, actor, stated ground and tier, and the response beside it at equal size → Copy citation | 3 | `ActionsList` §4.2.4 |
| A-P | P: "National FCRA receipts by year, with sources" | Tab Associations → `ReceiptsByYear` at rest → Download .tsv (FY, ₹, tier, current or superseded, source class, sources) | 2 | `ReceiptsByYear` §4.2.1 |
| A-S | S: "You only show NDA-era cancellations of critics" | Tab Associations → the timeline at rest shows every recorded action 2011→, with Lok Sabha dates as rules. The UPA-era actions (2012–2013) sit in the same frame. The ControlCard quotes the fcra-actions symmetry text and the base rate "{named} named cases of {all} cancellations". | 1 | `ActionsTimeline` §4.2.3, `ControlCard` |

**Capital lens**

| # | Reader and question | Path | Steps | Answered by |
|---|---|---|---|---|
| C-J | J: "Does BlackRock own a big slice of Indian companies?" | Tab Capital → click the row label "BlackRock". The row is accented, never isolated. Its summary says "≥1% line recorded in {k} of {r} companies with a named holder". The comparison rows sit directly under it. Cell detail quotes the filing. The ladder entry "BlackRock and Vanguard own India" is one link away. | 2 | `HolderMatrix` §4.3.1, `NarrativeLadder` §4.3.6 |
| C-P | P: "Named ≥1% foreign holders in NIFTY 50, long form" | Tab Capital → Download .tsv under the matrix (holder × company, one row per recorded line, plus column status) | 2 | `HolderMatrix` twins |
| C-S | S: "Rothschild runs Indian privatisations" | Tab Capital → `AdviserComparison` at rest: Rothschild & Co beside every adviser declared as control, the same columns for each → the ladder rung for the narrative, with its strongest case, strongest counter and what would change it | 1–2 | `AdviserComparison` §4.3.3, ladder |

**Every lens, a fourth path (J or S):** click any lender, association, adviser or contractor
name → "Show connections" → the connection graph opens with that node in focus, one hop, and
the lens's predicates labelled (§4.4.1). One step.

### 1.4 Questions answered at rest (no click) at 1280×800, per lens

- **Loans:**
  - How much of the census can be summed, and how much of that can be placed in a state? (strip and `UnionBar`)
  - Where did placed lending go? (map)
  - Through which instruments? (flow, first screen below the map)
  - Which lenders besides the World Bank are recorded, and why are they not summed? (`RecordsStrip`)
- **Associations:**
  - What did the sector receive, by year, and which years are missing? (`ReceiptsByYear`)
  - Which associations faced action, when, and who responded? (timeline)
- **Capital:**
  - Which named foreign holders cross 1% in which NIFTY 50 companies, beside the comparison set? (matrix)

---

## 2. The stage and the lenses

### 2.1 Route

- Route: `/finance`, lazy in `src/App.tsx`. The nav entry "Foreign money" goes in `Layout.tsx`.
- Smoke routes: `/finance`, `/finance?lens=loans&y=2019`, `/finance?lens=associations`,
  `/finance?lens=capital&holder=cap:blackrock`, `/finance?view=table`.
- The outer element is `<article className="pb-20">`, with no inner `max-w`. Prose is capped
  at `max-w-[72ch]`. Tables and graphics take the full width and scroll inside their own
  containers.

### 2.2 Anatomy

```
┌ Kicker · PageTitle · Standfirst · Byline (runs, as-of) ─────────────────────── ≤150px ┐
├ DenominatorStrip (sticky; facts per lens) + ReconciliationLine + active-filter line ──┤
├ LensTabs  [ Loans | Associations | Capital ]        Find ⌕  · Copy link · Table view   ┤
├───────────────────────────────────────────────────────────┬──────────────────────────┤
│ FILTER RAIL (row, wraps): Year from–to · State · Lender   │ MARGIN 22rem (xl sticky) │
│   · Holder · Tier · Reset   each with {N} → {k}           │  rest: ReadingKey        │
├───────────────────────────────────────────────────────────┤        ControlCard       │
│ LENS CENTRE                                               │        "Cannot show" (n) │
│  Loans:  LoanMap + UnionBar → LoanFlow → LoanClock →      │  rec: RecordCard         │
│          RecordsStrip → ProjectList                       │  st:  StatePanel         │
│  Assoc.: ReceiptsByYear + StateReceipts(void) →           │  holder: HolderCard      │
│          ActionsTimeline → ActionsList                    │                          │
│  Capital: HolderMatrix → OutsideIndex                     │                          │
├───────────────────────────────────────────────────────────┴──────────────────────────┤
│ Stage captions (body size) · <details> twins (open under view=table)                  │
├ LENS SECTIONS                                                                         ┤
│  Loans:  Contracts · Debarments · Conditions and rules · Would this lens alarm us     │
│          elsewhere? · Narratives · What this lens cannot show                         │
│  Assoc.: Grants named · Welfare join · Would this lens… · Narratives · Cannot show    │
│  Capital: Mandates + AdviserComparison · Rules timeline · Would this lens… ·          │
│          Narratives · Cannot show                                                     │
├ SHARED: Connection graph (id="connections") · Contested (id="contested") ·            ┤
│         Gaps (id="gaps") · Source ledger · TierLegend · Standing note                 │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

**Stage grid.** `xl:grid xl:grid-cols-[minmax(0,1fr)_22rem] xl:gap-6`. This is the welfare K10
constraint: at a 1280 viewport the content box is 960px. Below `xl`, the margin becomes a
normal block directly under the component that was clicked. The DOM order is fixed:
centre, then margin.

**Fold budget at 1280×800 (Loans):** header ≤150, strip and lines ≈64, tabs ≈44, rail ≈44,
map 420 (`clamp(420, 100vh − 380, 560)`) with the UnionBar inside the figure (28). That is
≈750, so the UnionBar is in the first viewport. The viewport gate asserts it (A33).

### 2.3 Lenses

- `role="tablist"` with three `role="tab"` buttons. Arrow keys move between tabs and Enter
  activates. Only the active lens panel is mounted. Every lens reads compiled-in data;
  §9 covers the loading state.
- Switching lens keeps `y`, `st`, `tier` and `find`. It clears `rec`. `lender` and `holder`
  stay in the URL, and when their lens is not active their controls show as inactive with
  the reason "applies to the Loans lens" or "applies to the Capital lens". A reader who
  switches back finds the view they left.
- Absent `lens` means Loans. The page never writes `lens=loans`. Loans is first because the
  brief orders it first; the order is not a claim about importance.

### 2.4 The margin

| State | Renders | Precedence |
|---|---|---|
| rest | `ReadingKey` (§4.0.6), `ControlCard` for the lens (§4.0.7), `CannotShowCard` (counts of voids, gaps and derived gaps, with a link to `#gaps` and the derived gaps listed in full) | lowest |
| `st` set (Loans, Associations) | `StatePanel`, for either lens | over rest |
| `holder` set (Capital) | `HolderCard`: the holder's `sub`, identity, every `own` line, every mandate, "Show connections" | over rest |
| `rec` set | `RecordCard` for that edge id, in whichever lens owns it | highest |

When a panel opens, focus moves to its `h2` and the live region announces it. Escape closes
the panel and returns focus to the invoking control (§6).

---

## 3. Data: populations and derivations (`src/data/financeView.ts`)

Everything below is a named export of `financeView.ts`. Static sets are computed at module
scope. Filtered views are pure functions of a parsed `Filters` object.

### 3.1 Anchors (declared constants, checked at module load)

```ts
export const CENSUS_DOMAIN = 'worldbank-projects';          // FINANCE_EDGE_DOMAIN value
export const AGG_SOURCE = 'ngo:foreign-sources-aggregate';  // NGO_NODES id
export const AGG_RECIPIENT = 'ngo:fcra-associations-aggregate';
```

A missing anchor throws at import in dev and fails `scripts/pages/finance.test.mjs` (A1).
Anchors are ids, not figures. They are the only literals the derivations may hold (D2).

### 3.2 Node lookup

`nodeOf(id)`: `FINANCE_NODES`, then `NGO_NODES`, then `CAPITAL_NODES`, then
`useData().nodes`. The first hit wins. An unresolved id prints `{id} (not in the register)` in
amber mono. It never prints a blank.

### 3.3 Loans

| Export | Reads | Definition |
|---|---|---|
| `LOANS` | `FINANCE_EDGES`, `FINANCE_EDGE_DOMAIN` | edges with `pred === 'loan'` |
| `CENSUS` | `LOANS`, `FINANCE_EDGE_DOMAIN` | `FINANCE_EDGE_DOMAIN[e.id] === CENSUS_DOMAIN` |
| `RESEARCHED` | `LOANS` | not in `CENSUS` |
| `hasRupee(e)` | `e.a` | `typeof e.a === 'number' && Number.isFinite(e.a)`. **A zero is a number and prints as recorded. `undefined` is never coerced to 0.** |
| `inclusion(e)` | the above | `'census-counted'` (census and `hasRupee`) · `'census-no-rupee'` · `'researched-listed'` (researched and `hasRupee`) · `'researched-no-rupee'` |
| `rupeeTotal(rows)` | rows | sums `a` over rows whose `inclusion === 'census-counted'` only. **This is the only ₹ summation for loans on the page.** |
| `placement(e)` | `nodeOf(e.t)`, `FINANCE_BENEFITS` (by `claimId`), `nodeOf(benefit.who)` | `{st, rule}`: `t.ty === 'state'` → `(t.st, 'state government is the borrower')`; else `who.ty === 'state'` → `(who.st, 'state government implements')`; else `{st: null, rule}`. The `null` rule reads `'Union body'` (`ty` ministry), `'corporate borrower — head office is not where the money went'` (`ty` company, group or shell), or `'no state government named'`. |
| `bodyState(e)` | the same | a state body's registered state when `who.ty ∈ {psu, agency, fund}` and `who.st ∉ {null, 'dl'}`, used only for the stipple class (D8) |
| `instrumentOf(e)` | `e.terms?.instrument` | as recorded; `null` → `'instrument not in the record'` |
| `conditionsOf(e)` | `e.terms?.conditions` | `[]` → `none recorded` |
| `yearOf(e)` | `e.from` | `Number(from.slice(0,4))`; no `from` → `undated` |
| `isFutureDated(e)` | `e.from`, `FINANCE_META.asOf` | `from > asOf`, shown as "approval date after the register date" |
| `lenderOf(e)` | `e.s` | node id |
| `projectKey(e)` | P1 field or `/\bP\d{6}\b/` on `lab` | `null` when neither exists |

### 3.4 Contracts, debarments, conditions, office-holders

| Export | Reads | Definition |
|---|---|---|
| `CONTRACTS` | `FINANCE_EDGES`, `FINANCE_EDGE_DOMAIN`, `FINANCE_BENEFITS` | `pred === 'award'` |
| `contractsFor(loan)` | `projectKey` | awards whose `projectKey` equals the loan's; else none |
| `unattachedContracts` | the above | awards with no `projectKey`, grouped by awarder `s` |
| `DEBARMENTS` | `FINANCE_EDGES`, `FINANCE_EDGE_DOMAIN` | `pred === 'enforce' && FINANCE_EDGE_DOMAIN[id] === 'contracts'` |
| `RULES_FIN` | `FINANCE_EDGES`, `FINANCE_BENEFITS` | `pred === 'law'`, each with its benefit row or null |
| `responsesTo(id, edges)` | the module's edges | `edges.filter(c => c.pred === 'contra' && c.t === 'claim:' + id)` |
| `officeOnDate(date, nodeIds)` | `role` edges from `FINANCE_EDGES` ∪ `useData().edges`, target ∈ `nodeIds` | Three groups. **covers**: `from ≤ date ≤ to`. **openEnded**: `from ≤ date` and no `to`. **sameDay**: `from === to === date`. Dates compare at the precision the record has (`YYYY` ≤ any date in that year). |
| `datedActs` | `FINANCE_EDGES` | `role` edges with `from && from === to` and `t === 'min:ministry-of-finance'`, drawn on the clock with `lab` verbatim |
| `LOK_SABHA` | `WELFARE_ELECTIONS` | `election === 'Lok Sabha'` |
| `assemblyFor(st)` | `WELFARE_ELECTIONS` | `st === st && election === 'assembly'` |

### 3.5 Associations

| Export | Reads | Definition |
|---|---|---|
| `NATIONAL` | `NGO_EDGES` | `pred === 'grant' && s === AGG_SOURCE && t === AGG_RECIPIENT` |
| `fyOf(e)` | `from`, `to` | single FY when `from` is `YYYY-04-01` or `YYYY-04` and `to` falls in `(YYYY+1)-03`; else a span `[fyStart, fyEnd]` |
| `FY_AXIS` | `NATIONAL` | every FY from the minimum to the maximum start year among `NATIONAL`. **An FY with no current single-FY row is in the axis.** |
| `SECTOR_DONORS` | `NGO_EDGES` | `pred === 'grant' && t === AGG_RECIPIENT && s !== AGG_SOURCE` |
| `NAMED_GRANTS` | `NGO_EDGES` | `pred === 'grant' && t !== AGG_RECIPIENT` |
| `STATE_ROWS` | `NGO_EDGES` | `pred === 'grant' && s === AGG_SOURCE && nodeOf(t).ty === 'group' && nodeOf(t).st` (empty until P5) |
| `ACTIONS` | `NGO_EDGES` | `pred === 'enforce'`, grouped by `t`. `t === AGG_RECIPIENT` goes to `POPULATION_ACTIONS`. `nodeOf(t).ty === 'ministry'` goes to lane "Courts and oversight on the government's actions". |
| `WELFARE_JOIN` | `NGO_EDGES`, `NGO_EDGE_DOMAIN`, `WELFARE_SCHEMES` | linked: `s` or `t` starts `scheme:` and the id is found in `WELFARE_SCHEMES`. Unlinked: `NGO_EDGE_DOMAIN[id] === 'darpan-welfare-join'` and not linked. A `scheme:` id missing from `WELFARE_SCHEMES` prints "scheme id not in the welfare register". |

### 3.6 Capital

| Export | Reads | Definition |
|---|---|---|
| `COLUMNS` | `NIFTY50` | every constituent, sorted by `name`. Column id `existingId`; a null id is a hatched column labelled "no company record" |
| `OWN_IDX` | `CAPITAL_EDGES` | `pred === 'own' && COLUMNS has t` |
| `OWN_OUTSIDE` | `CAPITAL_EDGES` | `pred === 'own'` and not in `OWN_IDX` |
| `BAND_A` | `CAPITAL_IDENTITY` | ids whose `publicRole` starts with `Mandatory`, sorted by label |
| `BAND_B` | `OWN_IDX` | distinct `s` not in `BAND_A`, sorted by label |
| `columnStatus(c)` | `OWN_IDX` | `'researched'` if any edge targets `c`, else `'no-record'`; `quarters(c)` = distinct `from` |
| `cell(h, c)` | `OWN_IDX` | `{state: 'line' \| 'not-named' \| 'no-record', edges}` |
| `pctOf(e)` | `e.pct` (P4) | `null` until P4. **Never parsed from `d`.** |
| `AWARDS_CAP` | `CAPITAL_EDGES`, `CAPITAL_BENEFITS` | `pred === 'award'` |
| `ADVISERS` | `CAPITAL_IDENTITY` | ids whose `publicRole` matches `/adviser/i`, sorted by label |
| `RULES_CAP` | `CAPITAL_EDGES`, `CAPITAL_BENEFITS` | `pred === 'law'`, each with its benefit row or null, `supersededBy`, `innocentReading`, `upgradeIf`, `killIf` |

### 3.7 Shared

- **Lens module.** `moduleFor(lens)` returns `{nodes, edges, domainOf, benefits, voids,
  narratives, baseRates, symmetry, gaps, identity, meta}` for FINANCE, NGO or CAPITAL.
- **Graph set.** `GRAPH_EDGES`: `FINANCE_EDGES` minus the census, ∪ `NGO_EDGES` ∪
  `CAPITAL_EDGES`. `GRAPH_NODES`: `nodeOf` over every endpoint, plus the nodes of the three
  modules. The census is kept out for the reason in D36.
- **Exports.** `tsv(rows, header)` builds every export with a `Blob`: no dependency and no
  fetch. The first lines are `#`-comments: page URL, lens, filters, population definition,
  exclusions, `runId` and `asOf` per module. Welfare U1 set the precedent.
- **Source class.** `sourceClass(src)` returns `parliament` when the label or URL matches
  `/sansad|rajya sabha|lok sabha|\bRS\b|\bLS\b|rsdebate|\/Par20\d\d\//i`. Otherwise it
  applies energy §5.14's primary regex. What is left is `secondary`.

---

## 4. Components

Each component entry gives, in order: **Reads** (the exact exports), **Encoding**, **Caption**
(body size, 14px `text-text-secondary`, left rule, ≤72ch, directly under the graphic),
**Twin**, and **Empty / void**.

### 4.0 Chrome

#### 4.0.1 Header (existing `Editorial`)

- `Kicker`: `Foreign money · loans, foreign contributions, foreign capital`
- `PageTitle`: **Who lent, who gave, who holds, and what the record can show**
- `Standfirst` (fixed copy): "Money from abroad reaches India in three ways this page records:
  loans to governments and public bodies, contributions to associations, and holdings in
  listed companies. Each is drawn from a register with sources and evidence tiers. Each
  total says which records it counts and which it cannot. Institutions are shown against
  their peers, never alone."
- `Byline`: `finance {FINANCE_META.runId} · ngo {NGO_META.runId} · capital
  {CAPITAL_META.runId} · records read up to {asOfLabel}`. `asOfLabel` is the single date
  when the three `META.asOf` values agree, else `{min}–{max}`.
- Header line, as energy D21 does: "Built from {files} research files to a published
  contract and cross-examined ({verdicts} audit verdicts). It asserts no offence by any named
  person." `files` is the sum of `META.counts.files`. `verdicts` is the sum of
  `META.audit.verdicts` where present.

#### 4.0.2 `DenominatorStrip` (existing, sticky; facts per lens)

`filtered={{from, to}}` is the lens population before and after filters. Each fact is
`{n, of?, label}`.

| Lens | Facts |
|---|---|
| Loans | 1 `{rows} of {LOANS.length} loan records` · 2 `₹{rupeeTotal} cr counted — {cc} of {census} census records carry ₹` · 3 `₹{placed} cr of ₹{rupeeTotal} cr placed in a state government` · 4 `{researched} researched records, {lenders} lenders — listed, not summed` · 5 `{withCond} of {rows} records state conditions` · 6 `{noRupee} records: amount not stated / in US$ m` |
| Associations | 1 `{fyWith} of {FY_AXIS.length} financial years with a national receipts total` · 2 `{actions} enforcement actions, {assoc} named associations` · 3 `{answered} of {alleged} allegations with a recorded response` · 4 `{NAMED_GRANTS} named grant records, {donors} donors` · 5 `{linked} of {joinRows} welfare-join rows linked to a scheme` |
| Capital | 1 `{researchedCols} of {COLUMNS.length} NIFTY 50 companies with a named ≥1% holder recorded` · 2 `{BAND_A.length} comparison holders always shown` · 3 `{dates} filing dates across columns ({min}–{max})` · 4 `{AWARDS_CAP.length} awards by the Union and regulators` · 5 `{withBenefit} of {RULES_CAP.length} rules with a cui-bono row` |

The strip's `asOf` reads `read to {asOfLabel}`, following energy D2. Below 640px the strip
keeps facts 1 and 2 and the date. The rest move to a non-sticky mono line under the Byline;
they are moved, not hidden (welfare U18).

#### 4.0.3 `ReconciliationLine` (new, in the sticky wrapper; energy D6)

- **Loans:** `{LOANS.length} loan records = {census-counted} census counted + {census-no-rupee}
  census, amount not stated / in US$ m + {researched-listed} researched with ₹ (listed, not
  summed) + {researched-no-rupee} researched, amount not stated`. The four terms are the
  `inclusion` counts under the current filters. Each term is a link that sets
  `view=table&inc={term}` (§5.1).
- **Associations:** `{NGO_EDGES.length} records = {grant} grant + {enforce} enforcement +
  {contra} responses + {role} office + {other} other`, by `pred`.
- **Capital:** `{CAPITAL_EDGES.length} records = {own} holdings + {award} awards + {law} rules
  + {contra} responses + {other} other`.

The line is mono 12px. It is always rendered, because it is the skeptic's first question.

#### 4.0.4 Active-filter line

Mono 11px (12px below 640), rendered only when a page filter is set:
`filters: y=2014–2026 · st=kl · lender=IDA · reset`. `reset` clears every page param
except `lens` and `view`. It never touches the graph's own params.

#### 4.0.5 `Find` (new; the journalist's entry, first control after the tabs)

- **Reads:** `nodeOf` over `GRAPH_NODES` (`label`, `sub`, `al`), `LOANS`, `CONTRACTS`,
  `ACTIONS` and `OWN_IDX` (`lab`).
- `<input type="search">` with placeholder `name, alias, project or place`. URL `find`,
  debounced 300ms.
- Results are grouped as **Entities** (verb: "Show connections"; also "Use as lender filter"
  or "Highlight holder" where the entity is one) and **Records** (verb: "Open record"). Each
  row names its lens. When k ≤ 8, all k are listed. Above 8, the list shows the first 8 by
  the stable order below and states `{k} matches — refine`. Nothing is hidden: the full list
  opens with "list all {k}".
- Order: exact label match, then alias, then label substring, then `lab` substring; ties by
  label. **Never by amount or degree.**
- A unique match is not auto-selected (welfare R13).
- Empty: `No entity or record in the three registers matches "{find}". This is a statement
  about the register, not about the world.`

#### 4.0.6 `ReadingKey` (margin at rest)

Six lines: the four tier dash swatches, each with its word. Family hue swatches with
labels. Shape key. Then three texture swatches (`TextureSwatch` from `WelfareMap.tsx`):
hatch "no record names this", stipple "records name a body here, not a state government",
hollow "not named ≥1% in a filing the register holds". Then energy D14's line: "No colour on
this page stands for a party, a country, a religion or a verdict. Hue is only the kind of
actor." Then: "Rose marks a response or denial, never 'bad'."

#### 4.0.7 `ControlCard` (margin at rest; the skeptic's panel)

- **Reads:** the lens module's `SYMMETRY` (every `FleetText`, verbatim, headed by its domain)
  and `BASE_RATES` (the lens's pinned rows first, then the rest; see below).
- Heading: "The same lens on the other side".
- **Pinned base rates.** Loans pins domain `worldbank-projects`. Associations pins
  `fcra-actions` and `fcra-receipts`. Capital pins `holders` and `mandates-ventures`.
- Each base rate prints as `{numerator} of {denominator} — {label}`. A percentage appears
  only when the denominator is ≥ 10 (welfare K6). A null prints `not computed`.
- No rows: `No symmetry check recorded for this lens — the control has not been run. This
  is a gap, not a pass.` Amber.

#### 4.0.8 Filter rail

Specified in §5. Each control carries its live `{N} → {k}`.

### 4.1 Loans lens

#### 4.1.1 `LoanMap` + `UnionBar`

- **Reuses** `WelfareMap` (`src/components/welfare/WelfareMap.tsx`) with `ballots={[]}`. It
  already carries the hatch and stipple textures, the listbox keyboard model, north-to-south
  order and the readout. Rows are built as `StateYearRow`-compatible objects by
  `financeView.loanStateRows(filters)`.
- **Reads:** `CENSUS` (for `m=cr`), `LOANS` (for `m=n`), `placement`, `bodyState`, the filters.
- **Encoding.**

  | Class (`FillClass`) | Condition | Meaning |
  |---|---|---|
  | `value` | ≥ 1 placed record in view | `m=cr`: ₹ crore of census-counted placed records. `m=n`: count of placed loan records, census and researched |
  | `stipple` | 0 placed, ≥ 1 record whose `bodyState` is this state | a state body registered here implements a loan; not in the fill |
  | `hatch` | neither | no loan record names this state |
  | `zero` | **never used** | the register declares no coverage, so no state is ever "searched, none" |

  - Ramp: `DEFAULT_RAMP`, 7 quantile bins over the states in view. `scale=log` offers log
    bins.
  - The legend prints the ₹ edges of every bin, and states that "bins are recomputed for
    this view; a shade compares states within this view only" (D10).
  - Selected state: accent outline.
- **`UnionBar`** (new, inside the same `<figure>`, under the map). One horizontal bar,
  full width, two segments:
  - `placed in a state government ₹{placed} cr`
  - `Union body or not placed ₹{unplaced} cr`

  Beneath it, in mono: `of ₹{rupeeTotal} cr counted from {cc} census records · {cnr}
  census records carry no ₹ and are in no total · researched records are not on this bar`.
  - Segments are neutral fills separated by a 2px gap. Their widths are proportional to ₹.
  - The bar is the denominator in the frame (D7). It is never optional.
- **Readout** (hover or keyboard focus): `{State}: ₹{v} cr in {k} census records ({y}) ·
  {j} records name a body registered here (not in fill) · {r} researched records from other
  lenders name this state government (count only)`.
- **Caption C1 (always):** "A loan is placed in a state only when the record names that
  state's government as borrower or implementer. Most World Bank lending to India is
  borrowed by the Union and spent through national programmes, so most of it cannot be
  placed: {unplacedPct} of counted ₹ here. A state body's registered office is not where the
  money went, so bodies are stippled, not filled. Head offices of companies are never used.
  ₹ are at each loan's approval-year rate, as its record states, and are not adjusted for
  inflation. Totals across decades mix rupees of very different value."
- **Caption C2 (sensitivity, when domain `worldbank-projects` base rates exist):** "The
  research file's own rule, which also places by a state named in the project title,
  attributes {num} of {den} US$ m to a state. This page's rule places {placedPct} of
  counted ₹." Here `num` and `den` come from the base-rate rows of that domain that share
  one `label`.
- **Twin** (`<details>`, open under `view=table`): one row per state (all 36,
  alphabetical). Columns: State · Class · ₹ cr placed (census) · Census records placed ·
  Body-registered records (not in fill) · Researched records naming the state government ·
  Rule · Detail. A final row reads `Union body or not placed`. TSV export.
- **Empty.** When `FINANCE_META.empty` is true, every state is hatched, the UnionBar is
  replaced by `Register not yet promoted — nothing below is zero`, and the §9 callout
  renders. When filters leave no census rows: every state is hatched, the UnionBar reads
  `No census record matches {filters}`, and Reset is offered.

#### 4.1.2 `LoanFlow` (existing `FlowSankey`)

- **Reads:** `CENSUS` rows with `inclusion === 'census-counted'` under the filters.
- **Built with** synthetic `GNode`s and `GEdge`s from `financeView.flowParts(filters)`:
  - lender nodes are the real `nodeOf(e.s)`;
  - instrument nodes `ins:{slug}` have `ty: 'mechanism'`, `fam: 'instrument'`, `sz: 2`, and
    the instrument as label;
  - place nodes `place:{st}` have `ty: 'state'`, `fam: 'state'` and the state name as label;
    `place:union` is labelled "Union body or not placed";
  - each counted census record contributes two edges, `{s: lender, t: ins}` and `{s: ins,
    t: place}`, with `pred: 'loan'`, the record's `tier` and `a`, and id `{rec.id}#1` or
    `#2`.

  Passed as `flowPreds={['loan']}`. FlowSankey sums parallel edges at the weakest tier.
- **Encoding (frozen):**
  - band width = ₹ crore;
  - ribbon `strokeDasharray` = tier (the census is all `documented` today, so every ribbon
    is solid, and the caption says why);
  - node hue = family (capital, instrument, state);
  - left-to-right = the order money moved.
- **`mid` param:** `instrument` is the default and the only live option. `sector` is
  `aria-disabled` with the name "Sector, unavailable: sector is not a field in this build's
  register (it is an unshared list in the record text)" until P3 lands (D9).
- **Caption C3:** "The World Bank census only: {cc} records, ₹{rupeeTotal} cr. Other lenders'
  records were researched rather than enumerated, and some describe the same money twice
  (a facility and its tranches; one loan in two research files), so they are drawn one
  mark each below and never added here. Every census record is documented from the Bank's
  own API, so every ribbon is solid. The instrument is the Bank's own name for the lending
  type, and conditions attach to the development-policy and programme types. Band position
  is flow order, not influence."
- **Twin:** FlowSankey's built-in band table (every band: from, to, ₹, records merged, tier),
  plus `ProjectList` filtered to the same rows.
- **Below 640px:** the Sankey is not drawn (it needs 640px). It is replaced by two ranked
  bar lists built from the same bands: lender × instrument, and place. Hue and dash are the
  same, and ranking is by declared ₹. The note reads "the flow diagram needs a wider
  screen; these are the same bands as lists" (D38).
- **Empty:** `No census record with a ₹ amount matches these filters.`

#### 4.1.3 `LoanClock` (energy `TenureLanes`, extended)

- **Component change (bounded):** `TenureLanes` gains three optional props:
  - `asOf` (replaces the `ASOF` import from `src/data/energy.ts`);
  - `rules: {date, label, kind}[]` (vertical dated rules drawn across all lanes);
  - `onRange(from, to)` (the brush writes `y`).

  Energy passes none of them and must render byte-identically. The energy suite at 67/67 is
  the regression gate (A38).
- **Reads:**
  - `LOANS` (events by lender lane, `date = from`, `tier`);
  - `officeOnDate`'s role edges for lanes with spans: `min:ministry-of-finance`, `wel:rbi`,
    `fin:ibrd`, `fin:imf`, plus any institution with ≥ 1 dated `role` edge in
    `FINANCE_EDGES` (derived, not listed);
  - `datedActs` (a "Dated acts recorded for the Finance Ministry" lane);
  - `LOK_SABHA` (rules);
  - `assemblyFor(st)` (rules, only when `st` is set).
- **Encoding:**
  - one linear x-scale from the earliest `from` in `LOANS` to `FINANCE_META.asOf`;
  - a tick per record, whose dash = tier;
  - a bar per tenure, outlined in its role claim's dash;
  - an open-ended tenure is drawn to `asOf` with a trailing label "end not recorded";
  - party is text only;
  - rules are 1px, Lok Sabha solid and assembly dotted. Dotted is the analytic dash, so
    assembly rules are instead drawn solid and 50% lighter (D19);
  - future-dated records sit beyond the asOf rule, in a shaded "after the register date"
    strip.
- **No computed window.** The page counts no "months before an election". The fleet's own
  narrative on lending following the party is on the ladder, rated `unsupported` (D18).
- **Caption C4:** "General elections recorded in the register: {years}. Earlier ones are
  absent from the file, not from history. Dated Finance Ministry acts recorded:
  {datedActs.length}; every other budget and signature is absent from this file. A tenure
  bar covering a loan's date is the date test, not a finding: no record here says a
  minister approved a loan. {openEnded} tenures have no recorded end date and are drawn to
  the register date with that label."
- **Twin:** lanes twin (lane · holder or record · from · to or "end not recorded" · tier ·
  source), plus a list of rules.
- **Empty:** axis drawn; each lane reads `none recorded`.

#### 4.1.4 `RecordsStrip` (new; researched lenders, one mark per record)

- **Reads:** `RESEARCHED`, `nodeOf(e.s)`.
- **Encoding:**
  - one row per lender, alphabetical;
  - x = ₹ crore on a log axis, for records with `hasRupee`;
  - records without ₹ sit in a left gutter labelled `amount not stated / in US$ m`;
  - each record is a 16px vertical tick whose dash = tier;
  - no totals and no bars.
- **Caption C5:** "Each mark is one record as researched. Records are not added up: the
  research found facilities beside their tranches, non-binding memoranda, a portfolio
  aggregate and one loan recorded in two files. The instrument column in the table below
  says which is which. World Bank rows here were researched by hand for their conditions,
  and the same project may also be in the census above."
- **Twin:** `ProjectList` filtered to `RESEARCHED`.
- **Empty:** `No researched records from other lenders match these filters.`

#### 4.1.5 `ProjectList` (new; the table readers act on)

- **Reads:** `LOANS` under the filters, plus `inclusion`, `placement`, `instrumentOf`,
  `conditionsOf`, `contractsFor`, `nodeOf`, `FINANCE_BENEFITS`.
- **Columns:**
  1. Approved (`from`, or "undated"; future-dated rows carry the chip "after register date")
  2. Lender (a button: Show connections)
  3. Record (`lab`, a button: Open record)
  4. Borrower
  5. Implementing (benefit `who`)
  6. Placed in (state, or the null rule's words)
  7. **₹ cr**: `₹{a} cr` in mono, or the exact text `amount not stated / in US$ m`
  8. In totals (`counted`, `listed, not summed`, or `in no total`)
  9. Instrument
  10. Conditions (count, or `none recorded`)
  11. Contracts (count, or `none linked`)
  12. Tier (chip)
  13. Sources (`Cite`; empty shows `no source in file` in amber)
- **Sort:** approval date, descending by default. Offered alternatives: ₹ declared
  (descending, rows without ₹ last and labelled), lender, place. No computed ranking.
- **Paging:** 100 rows per page, with `rows {a}–{b} of {k}` and Previous page / Next page
  (energy D22). Paged, never truncated.
- **Export:** every filtered row, with all columns plus `id`, `domain`, `terms` JSON and
  `d`.
- **Empty:** `No loan record matches {filters}.` + Reset.

#### 4.1.6 `RecordCard` (margin; one per `rec`)

Serves loans, contracts, debarments, actions, grants, holdings, awards and rules. It has
fixed blocks, and a block with nothing to show prints its "none recorded" line. It never
disappears.

1. **Header:** `lab`; `s → t` as two buttons ("From: {s}", "To: {t}", energy D22); tier
   chip; lens; record id with a copy-citation button. The citation is
   `{lab} — {tier} — {first source label} {url} — ICIP /finance record {id}, read to
   {asOf}`.
2. **Amount:** `₹{a} cr — {kind}`. The kind comes from `pred`, never from `d` (energy D1):
   - `loan`: "loan commitment at the rate stated in the record";
   - `award`: "contract value recorded for the award";
   - `grant`: "foreign contribution for the year in the record";
   - `own`: no amount;
   - `enforce`: "amount attached, fined or alleged".

   No `a` on a `loan`: the exact text **`amount not stated / in US$ m`**, then the record's
   own words from `d`. Where `a === 0`, the card prints `₹0 cr — as recorded` and adds
   "read the record text".
3. **Inclusion** (loans): `Counted in the census ₹ total` / `Listed, not summed — researched
   record` / `In no ₹ total — amount not stated / in US$ m`.
4. **Dates:** approved and closes, or `window open: end not recorded`.
5. **Place** (loans): `{State} — {rule}`, or `Not placed — {rule}`.
6. **Terms** (loans): instrument, rate, tenor, grace. A null prints `not stated`, never 0.
   Then conditions as a list, or `No conditions recorded in this record.` When the record's
   domain has a void mentioning conditions, the void is quoted beneath.
7. **Who benefits** (the `BenefitRow` for the claim): `who` (button), `how`, `₹{amountCr} cr
   ({confidence})` or `amount unknown`. With no row: `No cui-bono row recorded for this
   record.` in amber.
8. **Office on the date** (loans): `OfficeOnDate`, §4.1.7.
9. **Contracts under this project** (loans): `contractsFor(e)` rows, or `No contract in the
   register is linked to this project.`
10. **Responses:** `responsesTo(id)`, each shown as `Response from {responder} [{tier}],
    {date or "undated response"}` with its `lab` and `d`. None: the exact sentence **`No
    response recorded — asked/not asked unknown`**. It has equal size and weight to the
    claim block, and the pairing is structural: one `<dl>` per item (welfare U12).
11. **Record text:** `d`, verbatim.
12. **Sources:** each tagged `primary`, `secondary` or `parliament`. `upgradeIf` and
    `killIf` are shown when present.
13. **Superseded by / supersedes:** links, when present.

#### 4.1.7 `OfficeOnDate` (inside RecordCard)

- **Reads:** `officeOnDate(e.from, [e.s, e.t, benefit.who, placedStateNodeId])`.
- **Three sub-blocks, always rendered:**
  - "Tenure covers {date}": the holder, office (`lab`), from–to, tier.
  - "Start recorded, end not recorded — the record does not say whether they held office on
    {date}": the same fields.
  - "Acts recorded on {date}": point-dated role claims.

  An empty sub-block reads `none recorded`.
- **Fixed sentence under the block:** "Holding office on the approval date is the date test,
  not a finding. No World Bank record in this register names a minister as signatory; the
  research file records that agreements are signed by officials of the Department of
  Economic Affairs." This sentence is page copy summarising a recorded void. The void
  itself (from `FINANCE_VOIDS`, domain `worldbank`) is linked, so the reader can check it.

#### 4.1.8 `ContractsTable` (section `id="contracts"`)

- **Reads:** `CONTRACTS`, `FINANCE_BENEFITS`, `contractsFor`, `unattachedContracts`,
  `DEBARMENTS`.
- **Columns:** Signed (`from`) · Awarder (button) · Contractor (button; `IndexChips` when a
  `co:` id) · Package (`lab`, Open record) · ₹ cr (kind: contract value) · Project (a link to
  the loan record, or `project not identified in the record`) · How it benefited (`how`) ·
  Tier · Sources.
- **Denominator line:** `{CONTRACTS.length} contract awards recorded, under {projects}
  projects of {census} census projects · {unattached} not linked to a project`.
- **Caption C6:** "These are contracts the research opened, not every contract under these
  loans. After 2016 the World Bank publishes only the winning firm for most notices, so
  losing bids are usually absent. A contractor winning several packages is shown in the
  rows, not scored."
- **Empty:** `No contract awards in the register.`

#### 4.1.9 `DebarmentsTable` (section `id="debarments"`)

- **Reads:** `DEBARMENTS`, `responsesTo`, the award targets in `CONTRACTS`.
- **Columns:** Debarred from (`from`) · Until (`to`, or `no end recorded`) · Firm (button) ·
  Ground as recorded (`lab`) · Also an awardee in this register (yes / no) · Tier ·
  Response (joined, or the exact sentence) · Sources.
- **Denominator line:** `{DEBARMENTS.length} World Bank debarments of India-based firms
  recorded · {overlap} of them also appear as awardees in this register's {CONTRACTS.length}
  contracts`.
- **Caption C7:** "A debarment is the Bank's own sanctions decision. The overlap with
  awardees is computed here over a sample of contracts; zero here is a statement about the
  sample."
- **Empty:** `No debarments in the register.`

#### 4.1.10 `ConditionsAndRules` (section `id="conditions"`)

- **Reads:** `RULES_FIN`, and `LOANS` with non-empty `conditionsOf`.
- Two tables:
  - **Loan conditions**: loan · condition · tier · source. One row per condition.
  - **Rules and orders on external finance**: `RULES_FIN` rows showing the rule, the
    governed entity, the dates, the benefit row or "No cui-bono row recorded", the
    innocent reading, and upgrade/kill.
- **Denominator:** `Conditions recorded for {withCond} of {LOANS.length} loan records. The
  World Bank API carries none: see What this lens cannot show.`

### 4.2 Associations lens

#### 4.2.1 `ReceiptsByYear` (new)

- **Reads:** `NATIONAL`, `fyOf`, `FY_AXIS`, `sourceClass`, `SECTOR_DONORS`.
- **Encoding:**
  - x = financial years (`FY_AXIS`);
  - y = ₹ crore, linear from zero;
  - bar = the current (not superseded) single-FY row, with a neutral fill and an outline
    dash = tier;
  - an FY with no current row is a hatched column labelled `no national total recorded`
    (D21);
  - a superseded figure is a short horizontal tick, dashed per its tier, with
    `<title>superseded by {id}</title>`;
  - a multi-FY row is a bracket spanning its years, labelled `₹{a} cr, {fyStart}–{fyEnd},
    one figure`;
  - under each bar, a mono source-class chip (`parliament`, `primary` or `secondary`);
  - two current rows for one FY are drawn as two thin bars, with the note "two current
    figures for {fy} — see the table".
- **Caption C8:** "What registered associations reported receiving from abroad, as totals
  for the whole sector. Financial years without a total in the register are hatched,
  because a total was not found, not because nothing arrived. Figures differ between
  sources for the same year (returns filed late, different cut-off dates), so a superseded
  figure is kept and marked. Nominal rupees."
- **Twin:** every `NATIONAL` row, superseded included. Columns: FY · ₹ cr · Tier · Status
  (current, or `superseded by {id}`) · Source class · Sources · Record text. A second
  table holds `SECTOR_DONORS`: donor · FY · ₹ cr · tier · sources, under the heading
  "Donors to the sector as a whole, where the record names them".
- **Empty:** axis with every FY hatched, and `No national receipts total in the register.`

#### 4.2.2 `StateReceipts` (void card now, table plus map after P5)

- **Reads:** `STATE_ROWS`, and the `srcs` of the `NATIONAL` rows whose record text cites the
  state-wise annexure.
- **When `STATE_ROWS` is empty (today), a card at the same type size as the findings:**
  "State-wise receipts for FY2019-20 to FY2021-22 are published as an annexure to a Rajya
  Sabha answer ({source links from those rows}). This register sums them into the three
  national totals above. Its 34 state rows are not separate records here, so no state is
  drawn or ranked. The few state figures quoted in the records' text are readable in those
  records." The FY range and the row count here are derived from `fyOf` of the rows citing
  the annexure. The "34" comes from those records only if P5 lands; until then the card
  says `its state rows`, and prints no count.
- **When non-empty (after P5):** a state × FY table (all 36 states; hatch = no row), and a
  `WelfareMap` for the selected FY with the same three classes as LoanMap. `st` then
  selects.
- **Derived gap:** "FCRA state-wise receipts are not in the register as records".

#### 4.2.3 `ActionsTimeline` (new; lanes, one per target)

- **Reads:** `ACTIONS`, `POPULATION_ACTIONS`, `responsesTo`, `LOK_SABHA`, `nodeOf`.
- **Lanes:** associations and donors (`t` with `ty ∈ {trust, fund, sangh, group}` minus
  `AGG_RECIPIENT`), alphabetical. Then parties (`ty` party), alphabetical. Then "Courts and
  oversight on the government's actions" (`t` with `ty` ministry).
- **Encoding:**
  - one tick per enforce edge at `from`, dash = tier;
  - undated events sit in a right gutter labelled `undated`;
  - a response is a rose hairline cap on the tick (rose = response, frozen);
  - an event with no response has no cap, and in the list below it carries the exact
    sentence;
  - x-scale from the earliest dated action to `NGO_META.asOf`;
  - Lok Sabha dates as rules.
- **Population row** (above the lanes, not a lane): `POPULATION_ACTIONS` as mono
  annotations, each `lab` with its date and tier. These are counts across all registrations
  and are never drawn as ticks.
- **Caption C9:** "Every enforcement action on the record, against every association the
  research examined, 2011 onward, government-aligned and critical alike. The named cases
  are a small, chosen set: {named} named case files against {all} cancellations counted by
  the ministry (base rate below). Most cancellations are for not filing returns. A tick is
  an action, not a finding of wrongdoing. Where the record gives a ground, it is shown as
  the government stated it or as it was reported, with its tier." `named` and `all` come
  from the `fcra-actions` base-rate row whose numerator and denominator are both non-null;
  otherwise this sentence is omitted.
- **Twin:** `ActionsList`.
- **Empty:** axis, plus `No enforcement action recorded.`

#### 4.2.4 `ActionsList` (the reading surface)

- **Reads:** the same as the timeline.
- One block per lane: an `h3` with the target label, `(registered in {st name})` when `st`
  is set, and "Show connections".
- Rows are date-ordered. Each row is one `<dl>`:
  - **Action:** date · actor (`s` label) · `lab` · tier chip · record text `d`.
  - **Response:** each joined contra (responder, tier, date or "undated response", `lab`,
    `d`). With none, the exact sentence **`No response recorded — asked/not asked
    unknown`**. A contra whose `d` itself begins with that sentence prints it once, not
    twice.

  The two halves are rendered side by side from 640px up and stacked below it, at the same
  size and weight.
- `alleged` rows (stated grounds) render in the same row form, with tier `alleged` and its
  dash. Nothing collapses them into the action they explain (D23).
- **Filters:** `st` (association's recorded state), `tier`, `y` (calendar year of `from`).
- **Export:** one row per action, with every response concatenated with `‖`.

#### 4.2.5 `GrantsNamed` (section `id="grants"`) and the donor → association graph

- **Reads:** `NAMED_GRANTS`, `nodeOf`.
- **Table:** Donor (button) · Recipient (button) · FY or window · ₹ cr (kind "foreign
  contribution for the year in the record", or `amount not stated`) · Tier · Superseded ·
  Sources. The donor's `sub` is printed under its label, so a domestic control (a ministry,
  an Indian foundation) reads as what it is. The page does not classify donors as foreign
  or domestic (D26).
- **Graph presets** (links above the table, each writing the graph's own params and
  scrolling to `#connections`):
  - "Donors and associations" writes `pred=grant`;
  - "Enforcement and responses" writes `pred=enforce,contra`;
  - "Everything in this lens" clears `pred`.

  A preset is the reader's act; the default graph is unfiltered (D37).
- **Empty:** `No named grant records.`

#### 4.2.6 `WelfareJoin` (section `id="welfare-join"`)

- **Reads:** `WELFARE_JOIN` (the linked and unlinked groups), `WELFARE_SCHEMES`.
- **Linked table:** Scheme (name, level, state; link `/welfare?s={id}`) · Association or body
  · Relationship (`PRED_LABEL`) · Tier · Innocent reading (every analytic row has one) ·
  Record · Sources.
- **Unlinked table:** heading "Rows about associations in welfare delivery not linked to a
  scheme record ({n})", with the same columns minus Scheme.
- **Denominator:** `{linked} of {linked + unlinked} rows linked to one of
  {WELFARE_SCHEMES.length} schemes in the welfare register.`
- **Caption C10:** "An association that delivers a scheme is paid to do so. That is how the
  scheme works, and it is an allegation only where the tier says alleged."

### 4.3 Capital lens

#### 4.3.1 `HolderMatrix` (new)

- **Reads:** `COLUMNS`, `BAND_A`, `BAND_B`, `OWN_IDX`, `columnStatus`, `cell`, `pctOf`,
  `CAPITAL_SYMMETRY` (domain `holders`), `nodeOf`, `IndexChips`.
- **Orientation:** holder rows × company columns from 640px up. Below 640 it is transposed
  (company rows × holder columns), with the same cells and the same order (D32).
- **Band A:** "Comparison set, always shown ({BAND_A.length})". Every row is rendered
  whatever the filters say.
- **Band B:** "Other named holders ≥1% in these filings ({BAND_B.length})". Alphabetical.
- **Column header:** short company name, vertical at ≥ 640; the filing date(s) in mono; a
  hatched header for `no-record` columns.
- **Cell encoding (no colour ramp):**

  | State | Draw | Accessible name |
  |---|---|---|
  | `line` | solid neutral square, border dash = weakest tier among its edges; text `≥1%` (or `{pct}%` after P4); `×{n}` when more than one line | `{holder}, {company}: {n} line(s) recorded ≥1%, filing {date}, {tier}` |
  | `not-named` | hollow square, hairline border | `{holder}, {company}: not named ≥1% in the filing recorded` |
  | `no-record` | hatch (column-wide) | `{company}: no named holder recorded for this company` |

- **Row summary** (right edge, mono): `{k} of {researchedCols}`, meaning the companies with a
  named holder in which this holder has a line. **Rows are never sorted by it.**
- **`holder` param:** accents the row (left border, `aria-current="true"`). It never removes
  rows. When set, a note sits above the matrix at body size: **"Comparison set required:
  {holder} is shown with the {BAND_A.length} holders the research measured with the same
  lens, and with every other holder named in these filings. This page does not display one
  holder alone."** When `holder` is not in either band (for example Rothschild & Co, which
  has no line in a NIFTY 50 filing), the note adds "{holder} has no recorded ≥1% line in a
  NIFTY 50 filing; its recorded holdings are in its card", and the `HolderCard` opens.
- **Fail-closed guard:** if `BAND_A.length < 4`, the matrix is withheld and replaced by a
  callout: "Comparison set required. This build declares {n} comparison holders; the
  matrix needs at least four to be read fairly and is withheld." This can happen only
  after a data change, and A21 asserts the guard.
- **Beside the matrix** (above it below `xl`): the `holders` domain symmetry text
  (`CAPITAL_SYMMETRY`), verbatim, headed "The same lens on every holder".
- **Caption C11:** "A holding enters a company's shareholding filing by name only at 1% or
  more, and each fund line counts separately. A manager with many funds each under 1% is
  not named at all. **An empty cell means 'not named', never 'not held'.** Columns are read
  from filings of different dates ({dates} dates, {min} to {max}), so a row is not one
  moment. {noRecord} of the {COLUMNS.length} companies have no named holder recorded in
  this register and are hatched: not researched to that depth, not empty."
- **Twins (two, both exported):**
  - (a) **Lines, long form:** one row per `own` edge in `OWN_IDX`. Columns: holder · band ·
    company · filing date · tier · record text (`d`, which carries the percentage as filed)
    · sources.
  - (b) **Column status:** one row per `COLUMNS` entry. Columns: company · status ·
    filing date(s) · named holders recorded (count) · comparison-set holders named.

  The wide holder × company grid, with state words, is available as a TSV only.
- **Empty:** `CAPITAL_META.empty` hatches every column, keeps Band A's rows, and reads
  `Register not yet promoted`.

#### 4.3.2 `OutsideIndex` (under the matrix)

- **Reads:** `OWN_OUTSIDE`.
- **Table:** Owner · Owned · Share as recorded (record text) · Date · Tier · Sources. It
  holds the joint ventures (Jio BlackRock), asset-manager stakes, and the Union's ownership
  of the RBI.
- **Caption:** "Holdings and joint ventures outside the NIFTY 50 matrix."

#### 4.3.3 `MandatesTable` + `AdviserComparison` (section `id="mandates"`)

- **Reads:** `AWARDS_CAP`, `CAPITAL_BENEFITS`, `ADVISERS`, `CAPITAL_EDGES`.
- **MandatesTable columns:** Date · Awarder (Union, SEBI…) · Awardee (button) · What (`lab`)
  · Value (`₹{a} cr — value recorded for the award`, or `₹0 cr — as recorded`, or `not
  stated`) · Who benefits (`who`, `how`, amount, confidence) · Tier · Response · Sources.
  - Heading: "Awards by the Union and regulators: mandates, sales and licences". The table
    does not split mandates from sales from licences, because no field distinguishes them.
    The `lab` says which.
- **AdviserComparison:**
  - rows = `ADVISERS` (Rothschild & Co among them), alphabetical;
  - columns: awards recorded as awardee (count) · analytic records naming it (count) ·
    narratives about it on the ladder (count, by node id in narrative sources, else
    `not linked`) · Show connections.
  - Caption C12: "Counts of records in this register: they measure the research's
    attention as much as the firm's work. League tables in the records' text rank by fees
    and deal value; this table ranks nothing."
- **Empty:** `No awards recorded.`

#### 4.3.4 `RulesTimeline` (section `id="rules"`)

- **Reads:** `RULES_CAP`, `responsesTo`.
- **Encoding:**
  - one bar per rule from `from` to `to`; an open end is drawn to `CAPITAL_META.asOf`,
    labelled `in force, end not recorded`;
  - bar outline dash = tier;
  - `supersededBy` is drawn as a thin connector to the successor bar;
  - rows are chronological by `from`.
- **Rule card list (the reading surface):** `lab` · dates · tier · the governed entity ·
  record text · **Who benefits** (the benefit row, or the amber line **`No cui-bono row
  recorded for this rule`**) · Boring explanation (`innocentReading`, or `not recorded`) ·
  Upgrade if / Kill if · responses (or the exact sentence) · sources.
- **Denominator:** `{withBenefit} of {RULES_CAP.length} rules carry a cui-bono row · {withIR}
  carry an innocent reading.`
- **Caption C13:** "A rule changes terms for everyone it covers. Who gained is recorded only
  where the research filled a cui-bono row. Where it did not, the record's own text is
  shown, and the gap is counted in What this lens cannot show."

#### 4.3.5 Would the same lens alarm us elsewhere? (every lens; section `id="baserates"`)

- **Reads:** the lens module's `BASE_RATES`.
- One card per row, grouped by `domain`, reusing energy's base-rate card.
  - Each card prints `{numerator} of {denominator}`, and a Wilson 95% whisker only when both
    are integers and the denominator is ≥ 10 (energy D11).
  - The label prints verbatim. A null prints `not computed`.

#### 4.3.6 Narratives, rated (every lens; section `id="narratives"`)

- **Reuses** `NarrativeLadder` (`src/components/welfare/NarrativeLadder.tsx`) with the lens
  module's `NARRATIVES`.
- Six rungs, always drawn; an empty rung reads `none in this file`. All rungs are one
  colour.
- **Caption C14:** "A narrative is a claim about the world. It is rated, with its strongest
  case, its strongest counter and what would change the rating. It is never drawn as an
  edge. A narrative that names a family, a religion or an ethnicity as the actor is recorded
  here in the words it circulates in, and is tested against the institutions the record
  holds."

#### 4.3.7 What this lens cannot show (every lens; section `id="cannot"`)

- **Reads:** the lens module's `VOIDS` and `GAPS`, plus the lens's derived gaps (§4.4.3).
- The voids are listed in full, at the same type size as the findings (`GapsPanel`). They
  sit directly after the lens's sections, not at the page foot.

### 4.4 Shared sections

#### 4.4.1 Connection graph (`id="connections"`; existing `GraphExplorer`)

- **Reads:** `GRAPH_NODES`, `GRAPH_EDGES`. `height = 620` (480 below 640).
- **Opening it:** every "Show connections" writes `focus={id}&hops=1&sel={id}`. It then
  scrolls to `#connections` and moves focus to the graph's detail heading. A "Back to
  {origin}" link returns to the invoking control.
- **Predicates:** `loan` and `grant` are labelled through `PRED_LABEL` ("Loan", "Grant /
  foreign contribution"). They already exist.
- **Status line (added above the explorer, body size):** "{GRAPH_EDGES.length}
  relationships across the three registers. The World Bank census ({census} loan records)
  is not drawn here: two lenders to one borrower, {census} times, would draw a star that
  shows degree and hides value. It is in the map, the flow and the list above. This
  graph's own filters (`q`, `tier`, `pred`, `from`–`to`) are its own; the page's year
  control does not reach it." A button reads "Apply {y} to the graph", and writes the
  graph's `from`/`to`.
- **Caption C15:** "Position carries no meaning. Line dash is evidence tier; hue is the kind
  of actor; shape is entity type; size is a declared band. Persons appear only in public
  roles."
- **Twin:** GraphExplorer's own table twin.
- **Depends on** plan Task 9 (jump-to, as-of, why-drawn). Without it, the explorer works as
  it does on `/network`.

#### 4.4.2 Contested (`id="contested"`)

- **Reads:** the lens module's edges with `tier === 'alleged'` (excluding `contra`), each
  with `responsesTo`.
- A two-column list, one `<dl>` per pair: claim (who alleges, `lab`, `d`, tier, sources)
  beside response(s) (the same fields). With no response, the exact sentence. The two sides
  have equal width, size and weight, and there is no "verdict" slot (ContestedFact rule).
- **Denominator:** `{alleged} alleged claims in this lens · {answered} with a recorded
  response · {unanswered} without — whether a response was sought is not recorded.`
- **Empty:** `No alleged claims in this lens.`

#### 4.4.3 Gaps (`id="gaps"`; existing `GapsPanel`)

- **Reads:** `FINANCE_VOIDS`, `NGO_VOIDS`, `CAPITAL_VOIDS` (`what` → `what`, `whyItMatters`
  → `why`, `srcs`); `FINANCE_GAPS`, `NGO_GAPS`, `CAPITAL_GAPS` (`text` → `what`, `why` =
  `recorded as a research gap by the {domain} file`); and the **derived gaps** below.
- **Derived gaps**, each shown only when its condition holds:
  - "Loan state is not a field: {unplaced} of {cc} counted census records cannot be placed
    in a state government from the register" (F5)
  - "Loan sector is not a field" (P3 absent)
  - "{noRupee} loan records have no ₹ amount: amount not stated / in US$ m" (F2)
  - "{dupTokens} researched records share a World Bank project id with a census record"
    (computed via `projectKey`; P7 absent)
  - "Conditions recorded for {withCond} of {LOANS.length} loan records" (F8)
  - "{openEnded} office tenures have no end date" (F9)
  - "{fyMissing} financial years in {FY_AXIS range} have no national FCRA total" (N2)
  - "FCRA state-wise receipts are not records" (N3; P5 absent)
  - "{unlinked} welfare-join rows are not linked to a scheme" (N5)
  - "Holder percentages are not a field" (C1; P4 absent)
  - "{noRecord} of {COLUMNS.length} NIFTY 50 companies have no named holder recorded" (C3)
  - "{RULES_CAP.length − withBenefit} of {RULES_CAP.length} rules carry no cui-bono row"
    (C4)
  - "{unansweredAll} alleged claims carry no recorded response"
- Grouped by lens, then module domain. Same type size as findings. Never collapsed.

#### 4.4.4 Source ledger and foot

- **Reads:** the `srcs` of every edge and node in the lens module, deduplicated by URL.
- Existing `SourceLedger`. `establishes` = `cited by {n} records, e.g. {first lab}`.
  `primary` comes from `sourceClass`. `retrieved` = `cited in a file dated {META.asOf}`
  (energy D2). The full list is always shown; nothing sits behind "show more".
- Then `TierLegend`, and the standing note from HANDOFF "Standing", verbatim.

---

## 5. Filter rail and URL contract

### 5.1 Parameters

All are read and written through `useSearchParams` with `{replace: true}`. **Absent =
default = unfiltered, nothing selected.** An unknown value falls back to its default, and a
one-line amber notice under the strip reads `ignored an unrecognised {param} value`
(welfare pattern).

| Param | Values | Default | Written by | Reach |
|---|---|---|---|---|
| `lens` | `loans` \| `associations` \| `capital` | `loans` (never written) | tabs | which lens panel is mounted |
| `y` | `YYYY` \| `YYYY-YYYY` | all years | rail From/To; clock brush | Loans: `from` year of every loan, award and act. Associations: FY start year for money, calendar year of `from` for actions. Capital: `from` year of awards and rules. **The matrix is not reached** (one filing per company); its caption says so while `y` is set. |
| `st` | state code | none | rail select; map | Loans: filters the ProjectList, clock ticks, RecordsStrip and Contracts to records placed in `st`, and opens `StatePanel`. The map marks `st` and the flow highlights its bands, never removing others. Associations: filters lanes to targets whose recorded `st` is `st` (labelled "registered in"). Capital: inactive, with the reason "holdings are not placed by state". |
| `lender` | a node id among `LOANS` sources | all | rail select (with counts) | Loans lens: every loan surface. Inactive elsewhere, with its reason. |
| `holder` | a node id in `BAND_A ∪ BAND_B`, or any `cap:` node | none | matrix row label; Find | Capital: highlight plus `HolderCard`; **never filters rows**. |
| `tier` | comma list of the four tiers, or `none` | all four | rail toggles | **Shared with GraphExplorer (same name, same format):** every lens surface and the graph (D35) |
| `rec` | an edge id in any of the three modules | none | "Open record" | `RecordCard`. An id not in the active lens opens the card with "belongs to the {lens} lens — go there". |
| `sel` | a node id | none | "Show connections"; the graph | GraphExplorer's selection (shared by design) |
| `find` | text | empty | `Find` | results list only; filters nothing |
| `m` | `cr` \| `n` | `cr` | map control | LoanMap class and value |
| `scale` | `quantile` \| `log` | `quantile` | map control | LoanMap bins |
| `mid` | `instrument` \| `sector` | `instrument` | flow control | `sector` is unavailable until P3 |
| `view` | `stage` \| `table` | `stage` | "Table view" | swaps the lens centre for its twins, all open |
| `inc` | one `inclusion` term | none | ReconciliationLine links | Loans ProjectList filter, shown as a chip with `{N} → {k}` |

**GraphExplorer owns** `q`, `fam`, `pred`, `ty`, `amt`, `from`, `to`, `focus`, `hops` and
`path`. The page writes them only through "Show connections" (`focus`, `hops`, `sel`), "Apply
{y} to the graph" (`from`, `to`) and the grant presets (`pred`). It never reads them for its
own surfaces (D35).

### 5.2 Controls and their denominator effect

| Control | Type | Shown beside it |
|---|---|---|
| Find | `type=search`, first after the tabs | `{k} matches` |
| Year From / To | two `<select>` + "All years" | Loans `{N} → {k} records`; Associations `{N} → {k} actions · {fy} FYs`; Capital `{N} → {k} awards and rules · matrix unaffected` |
| State | `<select>`, 36 states alphabetical with counts in the active lens; zero-count shown `(0)`, `aria-disabled`, never hidden | `{N} → {k}`, plus "placed by state government only" (Loans) or "registered state, not where it works" (Associations) |
| Lender | `<select>` with counts | `{N} → {k} records` |
| Holder | `<select>`: band A first, then band B, with line counts | "highlights; never isolates" |
| Tier | four toggles with dash swatches (`aria-hidden`; the word is the label) | `{N} → {k}` for the lens population, plus "also filters the connection graph" |
| Map metric / scale | segmented | per option: `₹ counted: {cc} records` / `records placed: {n}` |
| Reset | button | clears page params except `lens` and `view` |
| Copy link | button | announces `Link copied` |
| Table view | toggle, `aria-pressed` | — |

Every change announces `from {N} to {k} {unit}` through the single polite live region
(welfare U21).

### 5.3 What the rail refuses to offer

A fixed muted line at the foot of the rail (energy D19): "Not offered: party, religion,
country-of-donor and 'risk' filters — why →". It links to `#refusals` (§13, D40).

---

## 6. Interactions

| Verb | Trigger | Writes | Result | Focus |
|---|---|---|---|---|
| Open record | a record label anywhere | `rec` | RecordCard in the margin | the card's `h2`; Escape returns |
| Show connections | an entity button anywhere | `focus`, `hops=1`, `sel` | scroll to `#connections`, node in focus | the graph detail heading; "Back to {origin}" |
| Filter | rail controls | the param | `{N} → {k}` announced | stays on the control |
| Highlight holder | matrix row label | `holder` | row accent, HolderCard, the comparison note | the card's `h2` |
| Select state | map (click, or Enter on an option) | `st` | StatePanel; list filtered | the panel `h2`; Escape clears |
| Brush years | clock drag, or Shift+arrows on the focused axis | `y` | all lens surfaces | stays |
| Copy citation | RecordCard | — | clipboard; `Citation copied` | stays |
| Export | "Copy as TSV" / "Download .tsv" above every twin | — | `Table copied, {rows} rows` | stays |

- **Coarse pointers:** the first tap on a map state shows the readout. The "Open state"
  button, or a second tap, writes `st` (energy D30).
- **Reduced motion:** no transitions on fill, no animated scroll (`behavior: 'auto'`) and no
  graph warm-up animation beyond what GraphExplorer already honours.

---

## 7. Encodings

### 7.1 Channels

| Where | Channel | Means | Never means |
|---|---|---|---|
| everywhere | `strokeDasharray` | evidence tier, and nothing else | style, era, party |
| graph and flow | node hue (`fam`) | family: state / capital / recipient / instrument / enforce / market | party, country, verdict |
| graph | shape (`ty`) | entity type | — |
| graph | size (`sz`) | declared band | importance, degree |
| map | ramp fill | ₹ counted, or records placed, in view | party, generosity, a score |
| map | hatch | no record names this state | zero |
| map | stipple | only a state body registered here is named | zero, low |
| flow | band width | ₹ crore (census) | share of anything else |
| clock / timeline | x | date on one linear scale | — |
| clock | tick | one record | amount |
| clock | bar | tenure | party |
| receipts | bar height | ₹ crore, national total for an FY | growth rate |
| receipts | hatch column | no national total recorded | zero |
| matrix | filled / hollow / hatch | line recorded / not named / no named holder recorded | size of holding (until P4, and even then text only) |
| everywhere | `--color-rose` | response or denial | bad |
| everywhere | `--color-amber` | missing response, missing source, not recorded | suspicious |
| everywhere | accent | selection (`st`, `rec`, `holder`) | importance |
| text only | party, country, religion | as recorded | — |

### 7.2 Frozen (the developer may not adjust these to make it fit)

1. `strokeDasharray` means tier. Nothing is dashed for any other reason. Assembly rules on
   the clock are drawn solid and lighter, not dotted.
2. Family hue, type shape and declared size band are unchanged from `ForceGraph`.
   Synthetic flow nodes take the family whose meaning fits (lender capital, instrument
   instrument, place state) and nothing else.
3. Hatch, stipple, hollow, ramp floor and page ground are five distinct fills, verified by
   a greyscale screenshot at 390 and 1280 (A30).
4. **No ₹ total sums anything but census-counted rows.** No grand total across lenders,
   modules or populations exists anywhere on the page, in any export header, or in any
   `aria-label`.
5. **No loan without a numeric `a` is coerced to 0.** Its amount cell reads exactly
   `amount not stated / in US$ m`.
6. No percentage is parsed from `d`. The matrix has no colour ramp.
7. Band A is always rendered, with at least four rows or the matrix withheld. `holder`
   highlights and never filters.
8. Every enforce, alleged and award item has a response slot at equal size and weight, and
   the exact sentence `No response recorded — asked/not asked unknown` when empty.
9. One x-scale per timeline. No axis rescales to the years that happen to have data.
10. Party, country and religion are text, never colour, never a filter.
11. `a of b` is always printed; a percentage appears only when b ≥ 10. A page-computed
    number is labelled `computed here` where it appears (welfare U5).
12. Nulls read `not stated`, `not recorded`, `none linked` or `not computed`. Never `0`,
    never a bare `—`, never `NaN`. An empty `srcs` reads `no source in file` in amber.
13. The default view is unfiltered and has no selection. No party, company, holder or
    lender is pre-selected. Loans is the default lens.
14. Captions C1–C15 render at body size, directly under their graphic. None goes in the
    footer.

---

## 8. Captions

The captions are specified with their components, and every one is required:

- C1, C2: LoanMap
- C3: LoanFlow
- C4: LoanClock
- C5: RecordsStrip
- C6: Contracts
- C7: Debarments
- C8: Receipts
- C9: Actions
- C10: WelfareJoin
- C11: HolderMatrix
- C12: AdviserComparison
- C13: Rules
- C14: Narratives
- C15: Graph

Each `{brace}` in a caption is derived. Hand-written copy states method, never a figure.

---

## 9. Loading, empty, partial and no-data states

| State | Render |
|---|---|
| **Loading** | Only the lazy route chunk and the lazy graph. The three modules are already in the main bundle through `DataContext`, so there is no data-loading state. Route fallback: the fixed-height skeleton `Loading the foreign-money register…`, with no spinner. Graph fallback: a 620px block, `Drawing the connection graph…`. |
| **A module empty** (`META.empty`) | That lens renders its full chrome. A `Callout label="Register not yet promoted"` sits directly under the Standfirst when the active lens's module is empty. The strip reads `register not yet promoted · nothing below is zero`. Maps are hatched, the matrix is hatched with Band A rows kept, and every section reads `Nothing recorded yet.` Smoke passes (A2). |
| **Partial years (common)** | Loans: the clock axis runs from the first record to `asOf`, and years with no approvals are empty columns. Associations: `FY_AXIS` includes the missing FYs as hatch. Every partial caption states the range the data covers inside the range drawn. |
| **Partial amounts (common)** | Loans with no ₹: the exact text, in no total, counted in strip fact 6 and the reconciliation line. |
| **Partial placement (common)** | UnionBar and C1 carry it in the frame. |
| **Partial matrix (common)** | Hatched columns, C11. |
| **Filters → 0** | Strip `N → 0`; the lens centre shows `No record in this register matches {filters}. This is a statement about the register, not about India.` + Reset. The matrix keeps its rows. |
| **Unknown `rec` / `sel` / `holder` / `lender`** | Fallback with the ignored-param notice. `rec` unknown: `No record {id} in the three registers.` |
| **No responses at all** | Every slot prints the exact sentence. The Contested denominator reads `0 with a recorded response`. |
| **No symmetry or base rates** | ControlCard amber line (§4.0.7). |

---

## 10. Edge-case table

| # | Case | Where | Behaviour |
|---|---|---|---|
| E1 | Loan with `a` undefined (US$ only, pre-1960) | all loan surfaces | Amount cell reads `amount not stated / in US$ m`. `inclusion` is census-no-rupee, so it is in no total, not in the map fill and not in the flow. It is still a tick on the clock and a row in the list. |
| E2 | Loan with `a` undefined and pipeline wording in `d`, approval date after `asOf` | list, clock | The same text, plus the chip "approval date after the register date"; the tick sits beyond the asOf rule. |
| E3 | Pipeline record whose approval date is before `asOf` (one exists) | list | Only E1 applies. `d`, shown verbatim in the card, says "PIPELINE". The page does not parse it. |
| E4 | Loan with `a === 0` | card, list | `₹0 cr — as recorded`. Counted if census (it adds nothing). Never shown as "not stated". |
| E5 | Researched record duplicates a census project | list, RecordsStrip | Both rows listed. The researched row is not summed. The derived gap counts shared project tokens. The card shows "also in the census as {rec}" when `projectKey` matches. |
| E6 | Facility record beside its tranche records | RecordsStrip | Separate marks, not summed. The instrument column shows which is the facility. |
| E7 | Non-binding MoU recorded as `loan` | RecordsStrip, list | One mark, not summed, and the instrument says "non-binding" as recorded. The page adds no interpretation. |
| E8 | Loan borrower is a company (for example, a China Development Bank loan to Reliance Communications) | map, flow | Not placed: `corporate borrower — head office is not where the money went`. Researched, so never in the flow. |
| E9 | Census loan implemented by several states (dam rehabilitation across 13 states) | map | The benefit row names one `who`. Placed only if that `who` is a state government; the other states are not credited. The card shows `d` verbatim, which lists every implementer. Covered by C1 and the derived gap. |
| E10 | Implementing body is a Union bank registered outside Delhi (SIDBI, `st` up) | map | Stipple in Uttar Pradesh (body registered here), never fill. The readout says why. |
| E11 | Delhi as a state vs the Union in Delhi | map | Filled only by a `ty: 'state'` node with `st: 'dl'`. Ministries (`st: 'dl'`) are "Union body". |
| E12 | Open-ended tenure from 1991 overlaps a 2020 approval | OfficeOnDate, clock | Listed under "Start recorded, end not recorded", never under "Tenure covers". The bar is drawn to asOf with its label. The fix belongs in the research file (supersession or an end date), not the page. |
| E13 | Two role edges for the same person and office from two files | clock, card | Both drawn and listed, each with its own tier and source. Not merged (resolution is the assembler's job). |
| E14 | Lok Sabha elections before 2004 absent | clock | C4 names the years recorded. There are no rules before 2004. |
| E15 | `st` set and the state has assembly elections | clock | Lighter solid rules for that state only. The caption adds "an assembly election falls somewhere in India almost every year; timing is not cause". |
| E16 | National FCRA total superseded by a lower-tier figure (the documented PIB figure superseded by the reported MHA-to-JPC figure, FY2024-25) | receipts | The bar is the current row, drawn in its own (reported) dash. The superseded documented figure is a tick. The twin shows both. The page does not re-rank tiers against supersession; supersession is the reconciliation editor's call. |
| E17 | Three-FY national figure | receipts | Bracket, not a bar. Excluded from any per-FY reading. |
| E18 | FY with no national total | receipts | Hatch column `no national total recorded`; the derived gap counts it. |
| E19 | Enforce event with no contra | ActionsList, RecordCard, Contested | The exact sentence `No response recorded — asked/not asked unknown`. |
| E20 | Contra whose own `d` is that sentence | the same | Printed once. The contra's tier chip is shown. |
| E21 | Contra that says "Not applicable" (an audit-added contra) | the same | Printed verbatim as the response. The page does not suppress it. |
| E22 | Enforce event targeting the aggregate of all registrations | timeline | Population row annotation, never a lane tick. |
| E23 | Court ruling that targets MHA rather than the association | timeline | Lane "Courts and oversight on the government's actions". The association is named in `lab`, not joined. |
| E24 | Undated enforce event | timeline | Right gutter `undated`, counted in the lane label. |
| E25 | Welfare-join row with a `scheme:` id missing from `WELFARE_SCHEMES` | WelfareJoin | Listed as linked, and the scheme cell reads `scheme id not in the welfare register`. |
| E26 | `holder=cap:blackrock` from a shared link | matrix | Full matrix; BlackRock accented; the "Comparison set required" note at body size; HolderCard open. |
| E27 | `holder` set to an adviser with no holdings (`cap:rothschild-co`) | matrix | Full matrix; the note plus "no recorded ≥1% line in a NIFTY 50 filing"; HolderCard lists its `own` edges outside the index and its mandates. |
| E28 | `tier=reported` leaves Band A with no lines | matrix | Band A rows still drawn; cells not-named or hatch; the note reads "tier filter: reported only". Rows are never removed. |
| E29 | A holder has two fund lines in one company | matrix | One cell, `≥1% ×2`. The twin has two rows. No sum is computed (a sum would be "computed here" and is left to the record text). |
| E30 | NIFTY 50 constituent with `existingId` null | matrix | Hatched column labelled `no company record`. |
| E31 | Own edge dated at a non-quarter date (a filing as on 11 Dec 2025) | column header | Prints the date as recorded. It is counted in `{dates}`. |
| E32 | Rule with `supersededBy` | rules | Both bars drawn, with a connector. The superseded bar keeps its dash. |
| E33 | Rule with no benefit row and no innocent reading | rules | Both amber lines. Counted in the derived gap. |
| E34 | `rec` belongs to another lens | margin | The card opens, with a "belongs to {lens}" link. The page does not switch lens itself (the reader's act). |
| E35 | `focus` id not in `GRAPH_NODES` (a census-only borrower) | graph | GraphExplorer's own message, plus the page's status line explaining that census records are not drawn. |
| E36 | `y=2031` or `y=abc` | rail | Falls back to all years, with the ignored notice. |
| E37 | `lender` set while the Associations lens is active | rail | Inactive control with its reason. The param is kept. |
| E38 | Two lenders with the same label from two modules | Find, rail | Disambiguated by `sub` and id suffix in the option text. |
| E39 | Node id unresolved in any graph | every label | `{id} (not in the register)`, amber mono. |
| E40 | Export while filtered | every TSV | The header comment carries the filters and the population definition. Rows equal what is drawn (A26). |

---

## 11. Mobile at 390px (no horizontal page scroll)

`useNarrow()` = `matchMedia('(max-width: 639px)')`.

- **Header:** Kicker, title, standfirst, byline; strip facts 3–6 move to a mono line under
  the byline.
- **Pinned stack:** site header + one-line strip + tabs ≤ 140px (welfare U18). The active
  filter line is not sticky.
- **Tabs:** full-width segmented control, 44px targets.
- **Find:** full width, directly under the tabs.
- **Rail:** collapses into `<details>` labelled `Filters ({active}) · {N} → {k}`. Selects are
  native.
- **LoanMap:** full width, 420 high. No hover. Tap → readout → "Open state".
  - The UnionBar stacks as two labelled rows: text over bar.
  - Legend swatches ≥ 12px.
- **LoanFlow:** replaced by the two ranked bar lists (D38).
- **LoanClock / ActionsTimeline / RulesTimeline:**
  - each scrolls horizontally inside its own container, with a sticky 96px label column;
  - initial `scrollLeft` puts `asOf` at the right edge;
  - a mono line `showing {a}–{b}` with "‹ earlier years" / "later years ›" buttons;
  - edge fades.
- **RecordsStrip:** rows stack, and the log axis spans the full width.
- **HolderMatrix:** transposed to company rows (50) × holder columns (Band A, 8 × 32px + a
  110px sticky label = 366px). Band B is a per-row mono line `also named: {labels}`. The
  column headers are the holders' short labels, rotated 90°, and the full names are in the
  headers' accessible names.
- **Tables:** sticky first column; `{k} columns · scroll → for the rest`; right-edge fade;
  the wrapper is `role="region"` with `aria-label` = the table caption. ActionsList and the
  RecordCard response halves stack.
- **Margin panels:** render directly under the component that opened them, with
  `scrollIntoView` once and `scroll-margin-top` = the pinned stack.
- **Mono floor:** nothing below 12px.
- **Gate:** at 390 and 360, `document.scrollingElement.scrollWidth ≤ innerWidth` on every
  lens, with `view=table` and with `rec` open (A31).

---

## 12. Accessibility

- **Landmarks and outline:** `h1` title; `nav` (filters); `main`; an `h2` per section and per
  lens panel; `aside` (margin), with card titles as `h2` and sub-blocks as `h3`; `footer`
  (energy D23).
- **Tabs:** WAI-ARIA tabs pattern. The panel is `aria-labelledby` its tab.
- **Map:** the `WelfareMap` listbox model (`role="listbox"` of state options, north to south;
  each option's name carries the class and the value). This keeps the welfare supersession
  of `role="img"`.
- **Flow, clock, timelines, receipts, strip:** the drawing is `aria-hidden`. Everything it
  says is in the labelled buttons of the label column and in the twin. A skip link "Skip to
  the table" goes before each graphic.
- **Matrix:** a real `<table>` with `<th scope="col">` and `<th scope="row">`. Cells are
  buttons with the §4.3.1 accessible names. Band headers are `<th colspan>` rows. The
  roving tabindex goes inside the grid (arrows move, Enter opens) and Tab leaves the grid.
- **Response pairs:** one `<dl>` per item. The response is never `aria-hidden` or collapsed.
- **Live region:** exactly one, polite, debounced (150ms for the map, 300ms for find). It
  carries filter effects, panel open and close, "Link copied", "Citation copied" and "Table
  copied".
- **Unavailable options:** `aria-disabled="true"`, focusable, with the reason inside the
  accessible name (welfare U21).
- **Contrast:** text ≥ 4.5:1; tier dashes and textures ≥ 3:1 against their ground. The ramp
  floor `#2e373f` is distinguishable from the page ground.
- **Targets:** 44px on coarse pointers; 24px minimum on fine pointers.

---

## 13. Decisions

| D | Decision | Why | Rejected alternative | Serves |
|---|---|---|---|---|
| D1 | The page is designed from nine two-minute paths (§1.3). A component no path needs is kept only where the brief requires it. | The angle. It keeps the stage to what the readers use. | Graphic-first stacking of every chart the data allows | J P S |
| D2 | Derivations hold only anchor ids (`CENSUS_DOMAIN`, `AGG_SOURCE`, `AGG_RECIPIENT`), checked at load. No figure is a literal. | "Nothing hand-written"; an anchor is structure, not data. | Matching node labels such as "aggregate" | P S |
| D3 | `Find` is the first control, above every graphic. It searches all three registers and never auto-selects. | J arrives with a name. The welfare U6 lesson applies. | A per-lens search inside each table | J |
| D4 | **Two loan populations.** The census (the World Bank API table) is the only summable population. Researched records are listed and drawn one mark each, never summed, never in the flow or the map fill. | F1, F3, F4: summing across files double-counts (duplicate projects, facility and tranche, non-binding MoUs, one loan in two files). | One ₹ total over all loans, or per-lender sums of researched records | P S |
| D5 | No grand total across lenders, modules or populations exists anywhere, including export headers and `aria-label`s. | A single big number is what gets screenshotted. It would be wrong by construction. | A "total foreign money" headline | S |
| D6 | A loan without a numeric `a` prints exactly `amount not stated / in US$ m`, is in no ₹ total, and is counted in the strip and the reconciliation line. Zero is a number and prints as recorded. | Review Focus 1; F2. | Coerce to 0, or hide the row | P S |
| D7 | **Strict placement:** a loan is placed in a state only when a `ty: 'state'` node is the borrower or the benefit `who`. The UnionBar puts placed vs Union-or-not-placed in the map's frame. | F5, F6: HQ and registered-office placement would put Union banks and companies in the wrong state. The denominator must sit in the frame. | Loose placement by any node's `st`; parsing `→ id` tokens from `d` | S P |
| D8 | State bodies registered in a state are a stipple class, not fill. The fleet's own rule is printed as a sensitivity (C2). | It shows the undercount without asserting a false placement. | Silently adopting the looser rule | S |
| D9 | The flow's middle column is `terms.instrument`, as recorded. Sector is offered but unavailable, with its reason on the control, until P3. | F7: sector is not a field; an alphabetical list without shares cannot apportion ₹. Instrument is structured and is where conditionality lives. | First-listed sector (alphabetical artefact) | S P |
| D10 | Map bins are quantiles recomputed per view; the legend prints ₹ edges and says "comparable within this view". | `y` is a range and ₹ are nominal across decades, so fixed pooled bins (welfare K13) would render any single-year view as the floor. | Welfare's fixed pooled bins | P |
| D11 | The flow is census-only. Other lenders are the RecordsStrip, one mark per record on a log axis. | D4. A band for researched records would be a sum. | Mixed-population Sankey | S |
| D12 | Contracts join loans by P1's `projectId`, and until then by the first `P######` token in both `lab`s. Awards without a token attach to their awarder as "project not identified". | This is the only join the data supports. The token is machine-written by the fetch script in census `lab`s. | Joining by implementing agency alone, which misattributes across that agency's several loans | J |
| D13 | Debarments are their own table with an "also an awardee" column; no score. | The overlap is the question a skeptic asks; a score is forbidden. | A "risky contractor" flag | S |
| D14 | `ProjectList` defaults to approval date descending. Sorting by declared ₹ is offered. | Date is neutral; ₹ is declared, so it is allowed as an option. | Default by ₹ (foregrounds the largest as if important) | J P |
| D15 | The RecordCard's amount kind comes from `pred`. The citation button builds a pasteable line. | Energy D1; J's exit action. | Kind parsed from `d` | J |
| D16 | Conditions coverage is a strip fact, and each record prints `none recorded`. | F8: conditionality is the political question (brief §3.2), so its absence must be loud. | A blank conditions cell | S |
| D17 | `OfficeOnDate` separates covering tenures, open-ended tenures and same-day acts, and carries the "date test, not a finding" sentence. | F9: an open-ended 1991 tenure would otherwise sit beside every later approval. | Treating an open end as "still in office" | S J |
| D18 | The clock draws Lok Sabha rules and dated acts, and computes no pre-election window. Assembly rules appear only with `st`. | Welfare found timing symmetric. The lending-follows-party narrative is `unsupported` on the ladder, so a computed window would re-assert it visually. | A "months before election" band | S |
| D19 | Assembly rules are solid and lighter, not dotted. | Dotted is the analytic dash (frozen channel). | Dotted rules | — |
| D20 | `TenureLanes` is extended with optional `asOf`, `rules` and `onRange`. Energy renders identically. | Reuse over a new component. Its `ASOF` import from energy data blocks reuse today. | A new LoanClock component | build |
| D21 | Receipts: FY axis from data min to max, hatch for missing FYs, superseded figures as ticks, the multi-year figure as a bracket, and a source-class chip on each bar. | N2; the brief asks for "national totals with their Parliament-answer sources". | Plotting only the years with data | P S |
| D22 | **No FCRA state map or table in this build.** A void card names the annexure. The map and table switch on automatically when `STATE_ROWS` exist (P5). | N3: the rows are not records. Reading state figures out of prose would be hand-work. | A map from prose-quoted top states | S |
| D23 | Actions are grouped by target, one lane each. Stated grounds (`alleged` edges) render as their own rows. Responses are joined by `claim:` id and shown at equal size. | N4; the Review Focus sentence; responses are as loud as claims. | Merging ground into action by date matching | J S |
| D24 | Population-level actions (all registrations) are annotations above the lanes, never ticks. | A count of 21,000 cancellations is not one event. | Drawing them as a lane | S |
| D25 | The welfare join prints linked and unlinked rows and counts the unlinked ones. | N5: only 4 rows carry a scheme id. | Showing only the linked rows | P |
| D26 | Donors are not classified as foreign or domestic. The node's `sub` is printed. | No field supports it, and the grant set includes Union ministries and Indian foundations as controls. | A "foreign" flag inferred from name | S |
| D27 | Capital columns are the full NIFTY 50 from `src/data/indices.ts`, alphabetical. A column with no named holder is hatched. | The index is the declared population, so 34 researched columns out of 50 must be visible. | Only researched columns | S P |
| D28 | **No percentage is parsed from prose.** A cell shows "≥1% line recorded", and the twin quotes the filing text until P4. | C1. Records can hold two lines; parsing the first "%" would be wrong in several cases. | Regex the first percentage in `d` | S |
| D29 | Band A is derived from `CAPITAL_IDENTITY` (`publicRole` begins "Mandatory"): 8 rows, always rendered. | C2: the fleet declared its comparison set structurally. | A hand-listed comparison set | S |
| D30 | LIC appears where its data puts it (band B). The symmetry text naming it as domestic control sits beside the matrix. P6 would promote it. | No structured declaration exists; hard-coding its id would be a hand-written claim. | Hard-coding LIC as a control row | S |
| D31 | Each column prints its filing date; the caption says a row is not one moment. | C3: 7 distinct dates. | A single "as of" for the matrix | P |
| D32 | Below 640px the matrix is transposed (company rows × comparison holders), with band B as a text line. | 50 columns cannot be read on a phone; horizontal page scroll is forbidden. | 50 columns scrolling inside the container | J |
| D33 | `holder` highlights and never filters. The "Comparison set required" note appears whenever it is set. Fewer than four Band A rows withholds the matrix. | Review Focus 5: structural, not a guard that can be bypassed by URL. | A holder filter guarded by a minimum | S |
| D34 | Every rule card has a Who-benefits slot. An empty slot reads `No cui-bono row recorded for this rule` and is counted as a derived gap. | C4: 0 of 20 rules carry a row. | Hiding the slot when empty | S |
| D35 | The page's `tier` shares name and format with GraphExplorer's `tier`, so one tier filter covers every surface including the graph. The page never reads the graph's other params. | One evidence filter should mean one thing. Name collisions elsewhere would be silent bugs. | A separate page tier param | S |
| D36 | The connection graph is the union of the three modules minus the census. The status line says why and gives the count. | 849 edges from two lenders to one borrower draw a star that hides value. The census is table-shaped and is drawn in the map, flow and list. | Feeding the census to the force graph | S |
| D37 | Graph presets (grants, enforcement) are links that write the graph's `pred`. The default graph is unfiltered. | A pre-filtered default is a silent claim; a preset click is the reader's act. | Opening the Associations graph pre-filtered | S |
| D38 | Below 640 the Sankey becomes two ranked bar lists from the same bands. | 28 place labels at 390px are unreadable, and the page must not scroll horizontally. | Scaling the 960 viewBox down | J |
| D39 | Every twin exports TSV with a `#` header carrying URL, filters, population definition, exclusions, run ids and asOf. | P must reproduce the screen, and the export must not drift from the graphic (welfare U1). | CSV without provenance | P |
| D40 | Refusals are stated in the rail foot and in a `#refusals` list: no party, religion, donor-country or risk filters; no influence ranking; no "most connected"; no grand total; no percentage from prose; no state placement by head office. | S reads refusals as evidence of method; energy D19. | Silent absence of those filters | S |
| D41 | The ReconciliationLine sits in the sticky wrapper on every lens, and its terms are links to the matching rows. | The skeptic's first question ("what did you leave out?") is answered at rest, and each exclusion is inspectable. | A methods paragraph | S P |
| D42 | Each lens has its own narrative ladder, from its own module's `NARRATIVES`. | Each module rates its own narratives. The Capital ladder (the brief's) is where Rothschild and BlackRock live. | One merged ladder | S |
| D43 | Voids are listed per lens directly after its sections, and again in the page Gaps panel. | "Voids and gaps are printed, not hidden"; the gaps panel is at findings prominence. | Voids only in the footer | S |
| D44 | Lens switching keeps `y`, `st`, `tier` and `find`, clears `rec`, and keeps `lender`/`holder` inactive with a reason. | The reader learns the page once; state survives the tabs. | Resetting on tab change | J |
| D45 | No data-loading state beyond route and graph chunks. | The modules are already in the main bundle through `DataContext`. | Per-lens dynamic import (would duplicate the modules) | build |

---

## 14. Acceptance gates

These are for `scripts/pages/finance.test.mjs`, run against a pinned `FINANCE_DIST`. Every
expected value is computed by the test from the generated modules independently of
`financeView.ts`.

**Review Focus**

- **A-RF1.** Every loan edge without a numeric `a` renders, in ProjectList and RecordCard,
  the exact text `amount not stated / in US$ m`. The strip's ₹ counted equals the test's
  own sum over census edges with numeric `a` (±0.5 for rounding). Adding every
  `amount not stated` row's US$ figure changes no ₹ on the page.
- **A-RF2.** For every enforce edge in `NGO_EDGES` with no `contra` whose `t === 'claim:' +
  id`, its ActionsList row contains the exact string `No response recorded — asked/not asked
  unknown` (U+2014 em dash).
- **A-RF3.** For every URL in {`/finance?lens=capital`, `…&holder=cap:blackrock`,
  `…&holder=cap:rothschild-co`, `…&tier=reported`, `…&tier=none`, `…&find=BlackRock`}, the
  matrix renders ≥ 4 holder rows and all `BAND_A` rows. When `holder` is set, the text
  `Comparison set required` is visible.

**Data integrity**

- **A1.** Every anchor id exists. Removing one fails the build.
- **A2.** With each module's `META.empty` forced (fixture), smoke passes and the lens shows
  `Register not yet promoted`.
- **A3.** No numeric literal other than layout constants appears in
  `src/components/finance/*` or `src/pages/Finance.tsx` (a grep with an allow-list of
  px/ms/layout constants).
- **A4.** No ₹ figure on the page, in any export header or in any `aria-label` exceeds the
  census-counted total, and no element carries a sum over researched records.
- **A5.** The reconciliation line's four loan terms sum to `LOANS.length`.
- **A6.** Map fill ₹ + UnionBar unplaced ₹ = strip ₹ counted, under five filter
  combinations.
- **A7.** No map state is filled by a record whose placement rule is not state government
  (a fixture with a company borrower in Maharashtra leaves Maharashtra hatched).
- **A8.** No matrix cell text contains a digit before P4 lands, apart from `1` in `≥1%` and
  the `×n` count.

**Twins and exports**

- **A20.** For each graphic, twin row count = drawn marks: map states 36 + 1, flow bands,
  clock ticks + bars, strip marks, receipts bars + ticks + brackets + hatches, timeline
  ticks, matrix cells (`BAND_A + BAND_B` rows × `COLUMNS`), rules bars.
- **A21.** With a fixture of 3 Band A holders, the matrix is withheld and the callout shows.
- **A22.** Every TSV's first lines begin `#` and include `runId` and `asOf`. Its data rows
  equal the on-screen twin rows under the same URL.
- **A23.** The FY axis includes every FY between min and max, and missing FYs render the
  hatch text.
- **A24.** Every rule card with no benefit row shows `No cui-bono row recorded for this
  rule`.
- **A25.** Every alleged edge in the active lens appears in Contested with a response slot.
- **A26.** Filtered exports carry the filters in the header.

**Encoding**

- **A30.** Greyscale screenshots at 390 and 1280 on each lens: hatch, stipple, hollow, ramp
  floor and ground are pairwise distinguishable (ΔL ≥ 8), and the four tier dashes are
  distinct.
- **A31.** At 360 and 390, on each lens, with `view=table`, and with `rec` open,
  `scrollWidth ≤ innerWidth`.
- **A32.** No element's fill or stroke is keyed to party, country or religion text (a DOM
  check for style attributes on elements whose text is a party label).
- **A33.** At 1280×800 on Loans, the UnionBar is within the first viewport.

**URL and interaction**

- **A34.** Every param round-trips. An unknown value produces `ignored an unrecognised
  {param} value`, and the defaults are elided from the URL.
- **A35.** "Show connections" on a lender writes `focus`, `hops=1` and `sel`, and focus lands
  on the graph detail heading.
- **A36.** Changing `tier` on the rail changes the graph's drawn edge count.
- **A37.** The page never writes `q`, `fam`, `ty`, `amt` or `path`.
- **A38.** The energy suite stays at 67/67 on a pinned build after the `TenureLanes`
  extension.

**Reader paths (scripted, 1280 and 390)**

- **A40.** L-J: type a census record's state fragment, choose the first record, and the
  RecordCard shows a ₹ with its kind (or the exact no-amount text), a date, a lender, an
  http source, the office block and a response or the exact sentence. At most 3
  interactions.
- **A41.** A-J: type a named association from `ACTIONS`; its block shows each action with a
  response or the exact sentence. At most 3 interactions.
- **A42.** C-J: activate `Associations`, then `Capital`, then the BlackRock row label. Band
  A is visible and the note is visible. At most 3 interactions.

**Accessibility**

- **A45.** axe: 0 serious or critical on each lens and each panel state.
- **A46.** Tabs, map listbox and matrix grid are keyboard-complete. The number of Tab stops
  from the top to the ProjectList's first row is ≤ 12.
- **A47.** Exactly one `aria-live` region.

---

## 15. Deferred items

1. **P1–P7 upgrades** (§0.3). Each is a research or assembler change. The page's fallbacks
   are specified and tested.
2. **UPA/NDA era toggle.** Deferred and probably refused. The symmetry texts carry the era
   comparison. A party-era filter would be a party lens, and the page shows both eras in
   one frame already.
3. **Per-capita or per-GSDP state lending.** No population or GSDP series is joined here.
   Deferred until a sourced denominator module exists.
4. **US$ view for loans.** `a` is ₹ at the approval-year rate. US$ is prose only, so a US$
   view needs a structured `usdM` field on census claims.
5. **FCRA receipts by purpose (religious, social, and so on).** A void in the register.
6. **Matrix history across quarters.** One filing per company today. A time dimension needs
   multiple quarters per company.
7. **Contract bidder counts.** In the record text only. A structured `bidders` field would
   allow a single-bid rate over the lender-funded family, beside the CPPP national rate on
   `/tenders`.
8. **Graph §6 items** (label occupancy, `contraWidth`, path strip, tenure strip) beyond the
   three plan Task 9 builds.
9. **A merged "all narratives" ladder** across lenses, with a lens column.
10. **Synthetic UX review** (five seats) to be applied as amendments, as for energy and
    welfare. The three readers here are hypotheses, and real readers should test the
    two-minute paths.

---

## 16. Open risks for the judge

- **Token joins.** D12 (`P######` in `lab`) and the duplicate-token count depend on text the
  fetch script writes. Mitigation: P1, plus a test that fails if a census `lab` lacks its
  token.
- **The strict placement rule undercounts** heavily (about a quarter of census ₹ is placed).
  A reader may read the map as "little went to states". C1 and the UnionBar put the reason
  in the frame, but it is the page's most misreadable graphic.
- **Nominal ₹ across 1949–2026.** Any all-years ₹ view is dominated by recent years. The
  caption says so, but the default is all years, as house rule requires (unfiltered).
- **LIC** cannot be declared as the domestic control without P6. Band B placement weakens
  the skeptic path C-S slightly.
- **`TenureLanes` extension** touches an energy component. The energy suite is the gate.
- **The graph excludes the census**, so "Show connections" on a census-only borrower opens a
  thin ego graph. The status line explains why.
- **The brief's edge counts differ from the modules** (NGO 285 vs 291). The page prints
  module counts only.
