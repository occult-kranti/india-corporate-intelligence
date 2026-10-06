# /security page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 52-line scaffold at `/security` with the judged three-lens page (Budgets · Footprint · Procurement and people) until `node --test scripts/pages/security.test.mjs` is green on the FULL, EMPTY and ZERO-SERIES builds, then pass every repository gate.

**Architecture:** One pure derivation module (`src/data/securityView.ts`) holds every figure the page prints, each computed at module scope from `src/graph/force.generated.ts`, `STATE_ECONOMY` and `src/data/geo.ts`; the open-market slice is read after mount through `loadSecurity()` in `src/data/cppp.ts` (types extended in place). The page (`src/pages/Security.tsx`) owns the URL, focus, the one live region and the margin; components under `src/components/security/` render one Q-block each and receive parsed filters. No shared component is modified (spec D45): the maps follow the finance `LoanMap` pattern on the welfare texture primitives.

**Tech Stack:** React 18, TypeScript (strict), Vite 6, Tailwind v4, react-router-dom HashRouter, hand-written SVG; d3-force only inside the existing `GraphExplorer`.

**Spec:** `docs/design/SECURITY_PAGE.md` (judged spec, UX amendments applied), `docs/design/SECURITY_ACCEPTANCE.md` (152 criteria), `scripts/pages/security.test.mjs` (READ ONLY; the RED suite at `2f922b2`).

## Global Constraints

- No runtime fetch; no new dependency; no edit to `*.generated.ts`, `scripts/assemble-fleet.mjs`, `src/context/DataContext.tsx`, `src/components/viz/*`, `src/App.tsx`, `src/components/Layout.tsx`.
- No literal figure in `src/pages/Security.tsx` or `src/components/security/*`: every count, ₹ and share is derived in `securityView.ts` (anchors of spec §3.2 are the only literals).
- Frozen channels: dash = tier (`documented` none, `reported` `6 3`, `alleged` `2 4`, `analytic` `8 3 2 3`); hue = family; shape = type; size = declared band. Stage is never a dash or hue. Rose = response only; amber = not recorded.
- Hatch never means zero; `₹0 cr — as recorded` on `ZERO_FILL`; `{k} rows hidden by the {filter} filter — not absent` for filtered rows.
- Every ₹ sits in a `[data-cr]` element whose text carries a denominator and a comparison (CR-CONTEXT, acceptance §0.7).
- No city ₹ except Delhi Police; the exact sentence `inside {State}'s police head (MH 2055) — no city budget is published`.
- No party word, ranking word or American spelling in page-authored strings (`[data-page-copy]`, headings, `aria-label`s, TSV `#` lines).
- URL params via `useSearchParams` with `replace`; defaults elided; unknown value → one amber `ignored an unrecognised {param} value`.
- 390 px without horizontal page scroll; mono ≥ 12 px below 640; 44 px coarse targets.
- British spelling in prose; comments explain why.

## Review Focus

1. A filter combination that empties a lens (`tier=none`, `fy` of a missing year): every block keeps its heading, axis, 36 rows and pair rows, and says which filter removed what — pinned by AC-59/AC-60.
2. Run drift (a regenerated module with merged ids or moved counts): nothing on screen may hold a number not derived from the module — pinned by SG-3 practice (no literals) and AC-31/32/33 re-derivation.
3. The slice file absent or slow (`loadSecurity()` → null or pending): P2 prints the loading line, then the absence sentence; strip fact 6 reads `open-market slice not built in this copy` — pinned by AC-24 S8-absent branch.
4. A deep link with an unknown id (`rec`, `vendor`, `body`, `cell`): one honest line, no crash — pinned by AC-84, AC-86, AC-88, AC-94.
5. A phone reader (390 × 844, touch): no sideways page scroll in any URL state, panels inline under their opener — pinned by AC-124, AC-135.

---

## File structure

| file | responsibility |
|---|---|
| `src/data/securityView.ts` | anchors (§3.2), every derivation, formatting helpers, `crContext`, `rowCitation`, `tsv`, filter parsing (`parseFilters`, `PAGE_PARAMS`) |
| `src/data/cppp.ts` (extend types only) | `SecurityFile.quality.byClass` / `total` typed fields the page reads (dedupRows, rawRows) |
| `src/components/security/ui.tsx` | page context, Caption, Twin, Table/Cards (StackTable form at 390), Exports, Effect, Src, Q, TierWord, Dash, SkipLink, useNarrow |
| `src/components/security/Chrome.tsx` | ResolutionStatement, Strip, ReconciliationLine, ActiveFilters, Notices, LensTabs, FilterRail, Find, ReadingKey, ControlCard |
| `src/components/security/Stack.tsx` | Budgets Q1 DemandStack (+ FYReadout content) |
| `src/components/security/Ledger.tsx` | Budgets Q2 OfficeLanes, Q3 LineLedger |
| `src/components/security/StatePair.tsx` | Budgets Q6 maps, StateTable, map primitive shared with Footprint |
| `src/components/security/BudgetBlocks.tsx` | Q4 CompareBlock, Q5 PayTerms + ContractCards, Q7 DelhiLine + CityLedger, Q8 Grants |
| `src/components/security/Footprint.tsx` | F1–F4 |
| `src/components/security/Procurement.tsx` | P0–P4: contents, awards, vendor grid, slice, bonds, board roles, cases |
| `src/components/security/Shared.tsx` | NarrativesBlock, CannotShow, Connections, Contested, Gaps, Refusals, SourceLedger, response chains |
| `src/components/security/Panels.tsx` | CellCard, FYReadout, StatePanel, BodyCard, VendorCard, RecordCard |
| `src/pages/Security.tsx` | URL state, focus, live region, margin precedence, lens mounting |

---

### Task 1: Data layer (`securityView.ts`, cppp types)

**Files:** Create `src/data/securityView.ts`; Modify `src/data/cppp.ts` (types in `SecurityFile.quality`).

**Interfaces — Produces:**
- `FY_AXIS: string[]`, `fyStart(fy)`, `UNION_ROWS`, `STATE_ROWS`, `isDemandLevel(r)`, `defenceStack(stage): StackCol[]` (`{fy, missing, rows, bands, sum, published, recon: 'equal'|'differs'|'none', delta, partial: {k,n}|null}`), `policeStack(stage)`, `DELHI_BY`, `payBracket(stage)`, `agnipathTicks(stage)`, `DEFAULT_STAGE`, `coveredFys(stage)`, `LANES: Lane[]` (`{key, body, component, line, group: 'published'|'body'|'city', rows, cells: Map<fy, Record<stage,BudgetRow[]>>, max}`), `crContext(row): {denom, compare}`, `rowCitation(row)`, `STATE_PAIRS`, `defaultStatePair(m)`, `stateSpend(pair,m)`, `STRENGTH_YEARS`, `DEFAULT_SY`, `stateStrength(sy)`, `SPEND_BINS`, `STRENGTH_BINS`, `UNITS` (north → south), `COMMISSIONERATES`, `CITY_BODIES`, `KINDS`, `EMPTY_KINDS`, `AWARDS`, `VENDORS`, `vendorClass`, `comparatorsOf`, `vendorFields`, `CASES`, `CASE_PAIRS`, `UNPAIRED`, `caseFile`, `caseFields`, `responsesTo`, `responseChain`, `ALLEGED`, `ROLE_WINDOWS`, `BOARD_PAIRS`, `BONDS`, `PAY_LAWS`, `CONTRACTS`, `derivedGaps()`, `tsv(meta, header, rows)`, `parseFilters(params): Filters`, `PAGE_PARAMS`.

- [ ] **Step 1: Failing check** — `npx tsc -b` with the page importing names that do not exist yet. Expected: TS2305 errors.
- [ ] **Step 2: Implement** each derivation to the definitions of spec §3.2 and acceptance §0.5 (the test's own rules: demand-level regex, Summary fallback, POLICE rule, LANE_KEY, CAPF sample, VENDORS union, CASE_PAIRS order by first record).
- [ ] **Step 3: Verify** — a scratch node script prints `defenceStack('BE')` for the latest FY, `VENDORS.length`, `CASE_PAIRS[0]` and compares with the suite's fixtures. Expected: identical.

### Task 2: UI primitives and the page shell (EMPTY build criteria, chrome)

**Files:** Create `src/components/security/ui.tsx`, `Chrome.tsx`; Modify `src/pages/Security.tsx`.

**Interfaces — Consumes:** Task 1 `parseFilters`, `PAGE_PARAMS`. **Produces:** `Page` context `{announce, f, patch, narrow, empty, openRecord, showConnections, openCell, openFy, selectState, …}`; `QBlock({id, n, question, children})` emitting `section[data-q][aria-labelledby]` with one `h3`.

- [ ] **Step 1: Run the RED subset** — `SECURITY_BUILD=full SECURITY_DIST=<copy> node --test --test-name-pattern="AC-(28|31|32|33|37|38|39|74|94|95|96|111|117|118)" scripts/pages/security.test.mjs`. Expected: FAIL (missing #resolution, strip, rail).
- [ ] **Step 2: Implement** head copy (§4.1), callout, `#resolution` (C1), strip (section aria-label Denominators, hidden h2), reconciliation line, active-filter line `filters: …`, tabs (manual activation, arrows), Find (grouped results, seven verbs), rail (Payer, State, FY from/to, Stage, Component, Tier, Reset, refusal foot), one debounced live region, notices for unknown params.
- [ ] **Step 3: Run the subset again.** Expected: PASS.
- [ ] **Step 4: EMPTY/ZERO** — `node --test --test-name-pattern="AC-(0[1-9]|1[0-2]) "` without `SECURITY_BUILD` (builds the scratch dists). Expected: PASS.

### Task 3: Budgets Q1 — DemandStack and FYReadout

**Files:** Create `src/components/security/Stack.tsx`, `Panels.tsx` (FYReadout).

- [ ] **Step 1: RED** — `AC-(15|30|34|35|49|50|97|112|128|140|141|148)`. Expected: FAIL.
- [ ] **Step 2: Implement** two panels on one FY axis and one ₹ scale; bands by component (lightness steps of one hue); published tick; glyph row (`data-glyph`); pay bracket, Agnipath tick, Delhi bracket, police-pay ticks; hatched and partial columns; axis buttons (roving tabindex, names per AC-112 regex); answer sentence first; denominator line; C2; twin `stack` (band rows, 2 × FY published-total rows, hatched rows, bracket rows; caption = answer sentence); 390 step control; FYReadout with per-row Copy citation and `<output>`.
- [ ] **Step 3: GREEN** — same pattern. Expected: PASS.

### Task 4: Budgets Q2 OfficeLanes, Q3 LineLedger, CellCard, BodyCard

**Files:** Create `src/components/security/Ledger.tsx`; extend `Panels.tsx`.

- [ ] **Step 1: RED** — `AC-(16|17|36|51|59|79|80|84|85|93|98|99|113|130|149)`.
- [ ] **Step 2: Implement** office lanes on the FY grid (`data-mark="office"`, one fill, twin with `party as recorded`); ledger `role="grid"` with roving tabindex, `th[scope=row][data-lane][data-lane-group]`, three `data-slot`s per FY (state row/two/zero/hatch/hidden), lane max, denominator line, C4/C4b, long-form twin paged at 400, coverage twin; CellCard (rows, CR-CONTEXT, note, tier, sources, `read to … · document: …`, Copy citation + `<output>`); BodyCard with `Go to its {k} lanes in the ledger`.
- [ ] **Step 3: GREEN.**

### Task 5: Budgets Q4–Q8

**Files:** Create `BudgetBlocks.tsx`, `StatePair.tsx`; extend `Panels.tsx` (StatePanel).

- [ ] **Step 1: RED** — `AC-(18|19|20|21|29|40|41|42|43|52|53|54|55|63|64|69|70|77|81|82|100|101|102|107|114|131|145|150)`.
- [ ] **Step 2: Implement** CompareBlock (cards `a of b`/`a and b`/null chip, symmetry text in the same section, `wording: {domain} research file`); PayTerms + ContractCards (two equal `<dl>`s, responder rule, nested replies `li[data-reply-depth]`); two listbox maps (`path[data-fill-class]`, pooled bins, legend edges, crosshatch Delhi, stipple counts-only, reported-dash frame, dot strips, `Open a state` selects at 390); StateTable 36 rows + two TSVs; StatePanel; DelhiLine (`data-mark="delhi"`, segments never across a gap); CityLedger (`data-city-body`); Grants (`₹0 cr — as recorded`, C10).
- [ ] **Step 3: GREEN.**

### Task 6: Footprint lens

**Files:** Create `Footprint.tsx` (reusing the StatePair map primitive).

- [ ] **Step 1: RED** — `AC-(22|44|56|83|103)` and the footprint halves of 32/33/38/77.
- [ ] **Step 2: Implement** kind chips (eleven, counts, 0-row `aria-disabled` with the void's words), dot map (`data-dot`, `data-overflow`), option names `{State}: {k} installations in {c} cities`, KindMatrix twin (36 × kinds + cities), PlaceList twin (paged 400, ordered state → city → label), CityLedger second mount, CompareBlock(footprint), C11/C12.
- [ ] **Step 3: GREEN.**

### Task 7: Procurement lens

**Files:** Create `Procurement.tsx`; extend `Panels.tsx` (VendorCard).

- [ ] **Step 1: RED** — `AC-(23|24|25|26|45|46|57|58|64|65|68|71|73|86|87|104|105|106|123|132|142|151|152)`.
- [ ] **Step 2: Implement** SymmetryContents; per-chapter symmetry block; AwardsByClass (log-y marks in family hue, tier dash, unpriced hollow squares + per-year counts, joint bracket, AoN card); VendorGrid (two class bands + unclassified, 13 identical `dt[data-field]`, skip link, 390 `<details>` summaries); VendorCard (`{vendor} beside {comparators}`); SliceBesideFile (Form A rows `data-class`, reference rows, Form B `data-rate` dots n ≥ 10); BondTable; BoardRoles; CaseTimeline (`data-mark="case"|"response"`); CasePairs (`data-pair`, two `dl[data-case]` with 11 identical fields, responses `data-response`, unpaired sentence).
- [ ] **Step 3: GREEN.**

### Task 8: Shared sections and RecordCard

**Files:** Create `Shared.tsx`; extend `Panels.tsx` (RecordCard).

- [ ] **Step 1: RED** — `AC-(27|62|66|67|70|71|88|89|90|146|147)`.
- [ ] **Step 2: Implement** NarrativesBlock (`#narratives`, six rungs), CannotShow (last Q-block, findings size), Connections (`#connections`, status line `{drawn} edges …`, `Apply {fy} to the graph`, GraphExplorer on intersection, `Load the graph` at 390), Contested (`#contested`, denominator sentence, response slots), Gaps (`#gaps`, header + derived gaps with conditions), Refusals (`#refusals`, fourteen items), SourceLedger; RecordCard with citation `<output>`.
- [ ] **Step 3: GREEN.**

### Task 9: Cross-cutting criteria

- [ ] **Step 1: RED** — `AC-(13|14|47|48|60|61|108|109|110|115|116|119|120|121|122|124|125|126|127|129|133|134|135|136|137|138|139|143|144)`.
- [ ] **Step 2: Fix** each failure at its component (captions, TSV headers, mobile forms, greyscale textures, outline).
- [ ] **Step 3: GREEN** — whole suite: `npm run build && cp -r dist <scratch>/dist-sec && SECURITY_DIST=<scratch>/dist-sec node --test scripts/pages/security.test.mjs`. Expected: 152 pass (or a criterion recorded as a defect with its reason).

### Task 10: Gates

- [ ] `npm run generate && npm run validate && npm run build && npm run smoke && npm run viewport`; read each `OK` line; report validate errors verbatim if they are only the fleet files the brief names.
