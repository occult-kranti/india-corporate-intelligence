# /finance — judgement on the two design candidates

*Judge's record for the `/finance` design duel (Phase G, Task 7), 2026-09-26. The two
candidates stay as files: `FINANCE_PAGE.candidate-A.md` (evidence-first, 34 decisions)
and `FINANCE_PAGE.candidate-B.md` (reader-journey-first, 45 decisions). The judged spec is
`FINANCE_PAGE.md`. Nothing was deleted.*

*Every export both candidates name was grepped in the generated modules before scoring
(§3). Every count below is the judge's reading of the modules on 2026-09-26 and is design
evidence, not page copy.*

---

## 1. Verdict

**Base: candidate B.** Its page draws the map, the flow, the clock, the receipts and the
holder matrix today from structured fields, with the denominator in the frame of each
(UnionBar, ReconciliationLine, Band A always on), and it names the reader who needs each
component and how many interactions they spend to reach a checkable figure. Candidate A
holds five of the eleven briefed graphics back until four generator exports land, and its
interim for the holder matrix is a note instead of a grid, which does not satisfy "the
holder matrix never renders fewer than four holders" so much as avoid the test.

**A's grafts are substantial** and are listed in §4: the placement basis column and
"not placed" as the first ledger row (once G1 lands), sector strings verbatim with no
taxonomy crosswalk, the census/sample small-multiple rule, the aggregate-counts table
headed "never added", the per-claim no-response sentence with the other-claims line, the
month-of-approval histogram, the Union-budget void line, the external-debt context table,
the licence-timing comparator table, the standing line about institutions in the header,
the generator-change table with exact export shapes, the lens-change hygiene for a
`sel` that only census legs can reach, and eleven acceptance criteria.

**Neither candidate is fully current.** Both profiled finance run `run-989d2c6a4b16`; the
module is now `run-c94694294b1f` (1,171 edges, 947 loans, 12 responses). The capital
module gained a `holders-aggregates` domain after both were written, which changes the
matrix's cell vocabulary (§3.2). The judged spec prints module counts only and adds a
decision for the new domain.

## 2. Scores by section

Six axes, each 1–5: **F** fidelity to spec §4.7 and the Review Focus; **H** honesty
(denominators, voids, tiers, no summed benefits, comparison set); **B** buildability on
the existing components and data exports; **T** reader time-to-checkable-figure; **A**
accessibility; **M** mobile at 390 px. A dash means the section does not bear on the axis.

| section | A: F H B T A M | B: F H B T A M | taken |
|---|---|---|---|
| 0 method and data profile | 4 5 4 – – – | 4 5 5 – – – | B's profile (more of it is structural); A's F-table for the World Bank census facts |
| 1 purpose and readers | 4 5 – 3 – – | 5 5 – 5 – – | B (three readers, must-leave-with table); A's institutions paragraph |
| 2 questions / paths | 4 4 – 3 – – | 5 4 – 5 – – | B's nine scripted paths; A's per-lens question table kept as the index |
| 3 route, data, derivations | 4 5 3 – – – | 5 5 4 – – – | B's named exports and anchors; A's G1–G4 shapes merged into the prerequisites table |
| 3 URL contract | 4 4 4 3 – – | 5 4 4 5 – – | B (`rec`, `find`, `view`, `inc`, shared `tier`); A's clearing rule only for a `sel` not drawable |
| 4 anatomy | 3 4 4 3 4 4 | 5 4 4 5 4 4 | B (margin with RecordCard; UnionBar in first viewport) |
| 5 Loans: map | 3 5 2 3 4 4 | 5 5 5 4 5 4 | B's WelfareMap reuse, strict rule, UnionBar, stipple; A's basis column and NotPlaced row on G1 |
| 5 Loans: flow | 3 5 2 3 4 3 | 5 4 5 4 4 5 | B's instrument column today; A's sector-verbatim rule (D9) when exported; B's mobile bar lists |
| 5 Loans: clock | 4 5 3 3 4 3 | 4 5 4 4 4 4 | B's extended TenureLanes and OfficeOnDate; A's budget void line, month histogram, pre-2004 shading, project-count lane |
| 5 Loans: sample, list, contracts, debarments | 5 5 4 3 4 4 | 5 5 5 5 4 4 | B's RecordsStrip, ProjectList, RecordCard, citation; A's DebtContext, base-rate rows under debarments, blank-borrower marker |
| 5 Associations: receipts | 5 5 5 4 4 4 | 5 5 5 5 4 4 | B (source-class chip, bracket for multi-FY); A's registrations rows |
| 5 Associations: state | 4 5 5 – – – | 5 5 5 – – – | B's void card (derived text) |
| 5 Associations: actions | 5 5 4 3 4 3 | 4 5 4 5 4 4 | B's lanes and ActionsList; A's aggregates table "never added", first-action ordering, other-claims line |
| 5 Associations: grants, welfare join | 4 5 5 3 – – | 5 5 5 4 – – | B's presets and unlinked rows; A's "{k} of {78}" denominator |
| 5 Capital: matrix | 3 5 2 2 4 3 | 4 4 4 4 4 5 | B's Band A / Band B, transposed mobile, fail-closed; judged cell vocabulary for aggregates (§3.2); A's five-state distinction deferred to coverage export |
| 5 Capital: mandates, licences, rules | 5 5 5 4 – – | 4 4 5 4 – – | A's licence-timing table and "fee not disclosed"; B's AdviserComparison and rule cards |
| shared: graph | 4 5 4 3 4 4 | 4 4 5 4 4 4 | B's union graph and status line; A's census-only `sel` handling and identity caption |
| shared: narratives, contested, gaps | 5 5 5 4 4 – | 5 5 5 4 4 – | B's derived gaps list plus A's; A's "show every register" toggle |
| 6 encodings / frozen | 5 5 – – 4 – | 5 5 – – 5 – | B's table (with "never means" column); A's items 5, 6, 9, 10, 12 |
| 7 filters and denominator effect | 4 5 4 3 4 – | 5 5 4 5 4 – | B; A's map-bin rule (pooled) restored |
| 8 interactions | 4 – 4 3 4 4 | 5 – 5 5 4 4 | B; A's Escape order |
| 9 states (empty, partial) | 5 5 4 – – – | 5 5 5 – – – | both, merged |
| 10 edge cases | 5 5 – – – – | 5 5 – – – – | merged (39 + 40 → 52, de-duplicated) |
| 11 mobile | 4 – 4 3 4 5 | 4 – 4 4 4 5 | B's transposed matrix and bar lists; A's viewport first-844px check |
| 12 accessibility | 4 – 4 – 5 – | 4 – 4 – 5 – | both; A's tab-stop budget, B's grid roving tabindex |
| 13 refusals | 5 5 – – – – | 4 5 – – – – | A's list, B's rail-foot link |
| 14 acceptance gates | 5 5 4 – 4 4 | 5 5 5 – 4 4 | B's independent-computation rule; A's FA-3, 4, 6, 8, 9, 11, 12, 13, 14, 25, 28 |
| 15 decisions | 5 5 – – – – | 5 5 – – – – | rewritten as one table, D1–D47 |
| 16 deferred / risks | 5 – – – – – | 5 – – – – – | merged |
| **totals (sum of scored cells)** | **A 386** | **B 421** | |

Where the two tie on honesty, B is taken because its component ships. Where A is stricter
on a channel or a denominator, A's rule is grafted in.

## 3. Facts checked against the repository

### 3.1 Exports (every name both candidates read)

All eleven `FINANCE_*`, `NGO_*` and `CAPITAL_*` exports exist (`NODES`, `EDGES`,
`EDGE_DOMAIN`, `BENEFITS`, `VOIDS`, `NARRATIVES`, `BASE_RATES`, `SYMMETRY`, `GAPS`,
`IDENTITY`, `META`). `WELFARE_SCHEMES` (78) and `WELFARE_ELECTIONS` (5 `Lok Sabha` rows,
2004–2024; 98 assembly rows) exist. `NIFTY50`, `INDICES_AS_OF`, `INDEX_CHANGES`,
`INDEX_SOURCES`, `indexCoverage()` exist; every NIFTY 50 constituent has an `existingId`.
`PRED_LABEL.loan` and `.grant` exist in `ForceGraph.tsx`, both directed. `GraphExplorer`
reads `tier fam pred ty q amt from to sel focus hops path`. None of A's G1–G4 or B's P1–P7
exports exists yet (`FINANCE_LOAN_FACTS`, `FINANCE_WB_TOTALS`, `CAPITAL_HOLDINGS`,
`CAPITAL_COVERAGE`, `CAPITAL_CONTROLS`, `NGO_FC_STATE`, `pct`, `projectId`, `place`,
`sector1`).

### 3.2 What changed after the candidates were written

| # | fact (2026-09-26, current modules) | consequence |
|---|---|---|
| J1 | Finance is `run-c94694294b1f`: 353 nodes, 1,171 edges, 947 `loan` (849 census + 98 researched), 53 without `a` (44 census, 9 researched), 34 `award` (28 carry a `P######` token; 6 RRTS packages do not), 24 debarments from `fin:world-bank-sanctions-system`, 22 `role` edges into `min:ministry-of-finance`, 12 open-ended windows, 5 point-dated acts, 12 `contra`. Twelve researched records still repeat a census P-number; none is marked superseded. | The page prints module counts. Both candidates' figures (948 / 99 / 3 contras) are stale. |
| J2 | Capital is 133 nodes, 231 edges; 116 `own` from 41 holders into 48 targets. A new domain `holders-aggregates` (19 claims) adds **analytic** `own` edges: BlackRock into 10 NIFTY companies, Vanguard into 5, NBIM into 1, each a **lower-bound aggregate of US-listed ETF holdings files** (not a SEBI filing line; the largest single fund line is below 1%), with an innocent reading, plus one analytic LIC-vs-BlackRock comparison and a `law` edge for the 1% threshold. LIC (`co:life-insurance-corporation`) has 29 lines and no `CAPITAL_IDENTITY` entry. | A's "BlackRock 0 lines" is stale. The matrix must distinguish a **filing line** from an **aggregate (analytic)** by `CAPITAL_EDGE_DOMAIN`, never merge them in a row count, and draw the analytic dash. Spec D24. |
| J3 | `CAPITAL_IDENTITY` entries whose `publicRole` begins `Mandatory comparison control` are **six**: ADIA, Capital Group, Fidelity, GIC, KIA, NBIM. BlackRock's and Vanguard's roles do not carry the phrase. | B's "8 rows in Band A" is wrong as written. Band A is the six declared controls (≥ 4, so the floor holds); BlackRock and Vanguard sit in Band B on their recorded lines. A structured controls export (G3c) is requested so the narrative's subjects and LIC can be pinned. Spec D22. |
| J4 | NGO is `run-9d6a4ce89975`: 138 nodes, 292 edges; 92 `enforce` (65 from MHA or its Foreigners Division; the rest from courts, CAG, the Supreme Court and agencies), 76 `contra` all targeting `claim:` ids, 64 undated; 43 enforce edges have no response to that claim; 46 `grant`; 14 national FC rows (4 FYs missing: 2012-13, 2013-14, 2022-23, 2023-24); 2 edges touch a `scheme:` id. | Both candidates' join and response rules hold. Counts are derived. |
| J5 | `research/raw/finance/worldbank-projects.json` `projects[]` (1,117 rows) already carries `state` (454 rows, the fetcher's rule: state borrower, state agency, or title), `major_sector_name` (977), `sector1` (780), `lendinginstr` (860), `pipeline` (21), `borrower_id`, `impagency_ids`; `provenance` carries `totals`, `byYear`, `byState`, `byLender`, `eras`. | A's G1 and G2 are an assembler **copy** of fields the fetcher already computes, not new research. The judged spec makes G1 the first prerequisite and B's strict rule the interim. |
| J6 | `WelfareMap` reads only `r?.cls` from its row map (plus the state key); `TenureLanes` imports `ASOF` and `EDGE_BY_ID` from `src/data/energy.ts`; `GapsPanel`, `DenominatorStrip`, `NarrativeLadder`, `StackTable`, `BaseRateTable`, `ContestedList`, `SourceLedger`, `IndexChips` exist with the props both candidates assume. | B's reuse of `WelfareMap` needs a five-line type loosening; its `TenureLanes` extension needs two props (`asOf`, `edgeById`) plus `rules`; the energy suite is the gate. |

## 4. What was taken from where

**From B (the base):** readers and two-minute paths; anatomy with margin; `Find`;
`ReconciliationLine`; `RecordCard` with citation and amount kind from `pred`;
`OfficeOnDate` in three sub-blocks; `LoanMap` on `WelfareMap` with the strict rule,
stipple class and `UnionBar`; `LoanFlow` on instrument; `LoanClock` on extended
`TenureLanes`; `RecordsStrip`; `ProjectList`; `ReceiptsByYear` with source-class chips and
the multi-FY bracket; `StateReceipts` void card; `ActionsTimeline` and `ActionsList`;
grant presets; `HolderMatrix` bands, fail-closed floor, transposed mobile form; two
matrix twins; `AdviserComparison`; rule cards with the amber line; union connection graph
and status line; derived gaps; TSV `#` header; shared `tier`; refusals list at `#refusals`;
independent-computation acceptance rule; scripted reader-path gates.

**From A (grafted):** the standing line in the header; the `worldbank-projects` F-table
(F1, F7, F8, F9, F13, F15–F20 as re-verified); G1–G4 export shapes into the prerequisites
table; "Not placed in any state" as the first ledger row and the placement-basis column
(on G1); sector strings verbatim, no crosswalk (D9); the census/sample rule that the two
are never drawn in one Sankey; the Union-budget void line, month-of-approval histogram,
pre-2004 shading and project-count lane; "(API blank — Union recorded by default)"
marker; `DebtContext`; base-rate rows under debarments; registrations rows under
receipts; the aggregate-counts table headed "never added"; timeline lane order by first
action; the other-claims line under the no-response sentence; `LicencesTable`;
"fee not disclosed"; "{k} of {n} rules carry a structured cui-bono row"; "show every
register's narratives" toggle; a `sel` reachable only through census legs → "Show its
projects"; pooled fixed map bins (welfare K13); 400-row pagination in `tp`; Escape order;
response cells equal in width; the tab-stop budget; FA-3/4/6/8/9/11/12/13/14/25/28 as
gates; refusals list.

**Judge's own additions (from §3.2):** D24 on `holders-aggregates`; D22 correcting Band A
to the six declared controls; the prerequisites table's note that G1 is a copy; the
run-drift rule.

## 5. The three biggest risks for the build

1. **The matrix's honesty now rests on a domain string.** With `holders-aggregates` in the
   module, a cell can be a SEBI filing line (documented/reported) or a computed lower
   bound from ETF holdings files (analytic). The dash carries the tier, but the row
   summary and the "named ≥1%" wording must split the two by `CAPITAL_EDGE_DOMAIN`, or
   the page will say BlackRock is "named" in ten filings when no filing names it. Gate
   FG-19 asserts the split; a fixture with one aggregate and one line per holder is the
   test. If the assembler ever renames the domain, the anchor check fails the build.
2. **The strict placement rule places about a quarter of counted census ₹**, and the
   fetcher's rule (which the map can only use after G1) places more by reading state
   agencies and titles. Until G1 lands the map is the page's most misreadable graphic;
   after G1 it shows two labelled classes on one map. The UnionBar, caption C1 and the
   sensitivity caption C2 carry the reason, and FG-7 asserts that no company or Union
   body ever fills a state. The UX review should test whether readers read "little went
   to states" off the interim map despite the bar.
3. **Two shared components change under other pages.** `TenureLanes` gains `asOf`,
   `edgeById`, `rules` and `onRange`; `WelfareMap` loosens its row type. `/energy` (67/67)
   and `/welfare` (70 pass, 15 skip) are the regression gates and must run on a pinned
   build before and after. The token join for contracts (`P######` in `lab`) and the
   `publicRole` prefix for Band A are the two places the page reads text the fleet wrote;
   each has a gate that fails when the text drifts (FG-5, FG-20), and each has a structured
   export requested to replace it (P1, G3c).

Secondary: the researched loan duplicates (12 records repeat a census P-number; AIIB
CARES at two ₹ figures) stay unreconciled, so no researched subtotal exists anywhere;
`energy:manmohan-singh`'s 1991 window has no end and is listed under "end not recorded"
beside every later approval; `cap:temasek` and `cap:temasek-holdings` render as two rows
until the reconciliation editor merges them; nominal ₹ across 1949–2026 dominate any
all-years view.
