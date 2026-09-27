# /finance (Foreign money — loans, associations, capital) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/finance`: three lenses (`lens=loans|associations|capital`) on one stage, sharing the filter rail, the year control and the URL, every figure derived at module scope from the three generated fleet modules, until the RED suite `scripts/pages/finance.test.mjs` is green on everything the page's own files can decide.

**Architecture:** One pure derivation module, `src/data/financeView.ts`, reads `src/graph/{finance,ngo,capital}.generated.ts`, `src/data/welfare.generated.ts` and `src/data/indices.ts` and exports every population, count and sentence input the page prints (no literal figure anywhere else). `src/pages/Finance.tsx` owns URL state (one parsed `Filters` object from `useSearchParams`, written with `replace`), focus, the single live region and the margin precedence; each lens is a component file under `src/components/finance/`. Every graphic is hand-written SVG in this directory (no change to `viz/*`, `energy/*`, `welfare/*`), each with a `<details data-twin>` twin built from the same rows as the drawing.

**Tech Stack:** React 18, TypeScript (strict), Vite 6, Tailwind v4, react-router-dom 7 `HashRouter`; `GraphExplorer` (canvas ForceGraph, d3-force) for the connection graph. No new dependency.

**Spec:** `docs/design/FINANCE_PAGE.md` (judged, U1–U34 applied, D1–D50); criteria `docs/design/FINANCE_ACCEPTANCE.md` (110); RED suite `scripts/pages/finance.test.mjs` (read-only).

## Global Constraints

- No runtime fetch; every figure derived from the generated modules at module scope or in a `useMemo` keyed on the parsed URL. No numeric literal in `src/pages/Finance.tsx` or `src/components/finance/*` other than layout constants (px, ms, page size 400, the ≥ 10 share floor, the ≥ 4 Band A floor).
- Semantic channels frozen: `strokeDasharray` = tier (`TIERS[t].dash`), node hue = `FAMILY_COLOR[fam]`, node shape = type, node size = declared band. No new dash anywhere; assembly rules solid and lighter.
- Hatch never means zero; the `zero` fill class is never painted. Rose (`--color-rose`) only for a response or denial and in the key; amber for "not recorded".
- Exact strings: `amount not stated / in US$ m`; `No response recorded — asked/not asked unknown`; `Comparison set required`; `No cui-bono row recorded for this rule`; `Register not yet promoted`; `Nothing recorded yet.`; `none in this file`.
- A percentage only beside its `a of b`, and only when b ≥ 10.
- Every filter in the URL (`lens y st lender holder tier rec sel find m scale mid view inc tp`), written with `replace`; defaults elided; unknown values fall back with one amber `ignored an unrecognised {param} value` line and the URL is not rewritten on load.
- The page never writes `q fam ty amt path`; it writes `focus hops sel` only through Show connections and `pred` only through the graph presets.
- British spelling in page prose; no partisan frame in page copy; comments explain why.
- 390 px: no horizontal page scroll; wide tables scroll inside their own `role="region"` container.
- Do not edit: `*.generated.ts`, `research/raw/**`, `scripts/assemble-fleet.mjs`, `src/context/DataContext.tsx`, `src/components/viz/*`, `src/App.tsx`, `src/components/Layout.tsx`, `src/pages/Tenders.tsx`, `src/components/tenders/*`, `src/data/cppp*.ts`, any test, `package.json` `test:pages`. No git commits (task instruction supersedes the skill's commit steps).

## Review Focus

- The census and the researched sample are never summed: the only ₹ loan total is Σ `a` over census rows with a finite `a`; researched per-lender sums must not appear anywhere, including `aria-label`s (AC-24).
- A loan with no numeric `a` is never 0: every surface prints `amount not stated / in US$ m` and counts it in no total (AC-37).
- An enforcement action with no `contra` on `claim:{id}` prints exactly the no-response sentence in the list, the timeline square's title, the card and Contested (AC-48, AC-52).
- `holder` highlights and never filters; Band A (declared `CAPITAL_CONTROLS` roles subject/comparison/domestic-control) always renders, and the grid is withheld below four (AC-62, AC-108).
- A tier filter never separates a claim from its response or an action from its stated ground (AC-50, AC-51).

---

## File map

| file | responsibility |
|---|---|
| `src/data/financeView.ts` (create) | Anchors; `nodeOf`/`labelOf`; loans (`LOANS`, `CENSUS`, `RESEARCHED`, `inclusion`, `placement`, `bodyState`, `fetcherState`, `rupeeTotal`, `projectKey`, `pToken`, `officeOnDate`, `datedActs`); contracts, debarments, rules; associations (`NATIONAL`, `FY_AXIS`, `ACTIONS`, `caseFiles`, `noActionTargets`, `WELFARE_JOIN`, `FC_STATE`); capital (`COLUMNS`, `BAND_A`, `BAND_B`, `OWN_IDX`, `cell`, `MANDATES`, `LICENCES`, `ADVISERS`, `RULES_CAP`); graph (`GRAPH_NODES`, `GRAPH_EDGES`, `famSplits`); `parseFilters`; per-lens `stripFacts`, `reconciliation`, `derivedGaps`; `tsv`. |
| `src/components/finance/ui.tsx` (create) | `Caption`, `Twin` (lazy `<details data-twin>` with summary `{h3} as a table · {n} rows`, caption, Copy/Download TSV), `Src`, `TierWord`, `Dash`, `Amount`, `useNarrow`, `Live` context, `Effect` (`{N} → {k}` with hidden words), `StackCards`. |
| `src/components/finance/Control.tsx` (create) | Strip (`section[aria-label="Denominators"]`), `ReconciliationLine`, active-filter line, `LensTabs`, `Find`, `FilterRail`, `ReadingKey`, `ControlCard`. |
| `src/components/finance/LoanMap.tsx` (create) | Listbox map (`g[role=option]` wrapping `path[data-fill-class]` aria-hidden), pooled bins legend, `UnionBar`, readout, twin. |
| `src/components/finance/LoanFlow.tsx` (create) | Census Sankey `svg[role=group]` with ribbon `<button>`s in `foreignObject`, two ranked lists below 640, band twin. |
| `src/components/finance/LoanClock.tsx` (create) | Lanes (count, lenders, offices), Lok Sabha rules, month histogram, twins `loan-lanes`, `loan-years`, `loan-rules`, `loan-months`. |
| `src/components/finance/LoansLens.tsx` (create) | `RecordsStrip`, `ProjectList` (paged 400, groups under `st`), Contracts, Debarments, Conditions, Debt. |
| `src/components/finance/AssociationsLens.tsx` (create) | `ReceiptsByYear`, `StateReceipts` (P5 table + map), `ActionsTimeline`, aggregate counts, no-action block, `ActionsList`, Grants, Welfare join. |
| `src/components/finance/CapitalLens.tsx` (create) | `HolderMatrix` (grid, bands, guard, transposed below 640, twins), `OutsideIndex`, Mandates + AdviserComparison, Licences, `RulesTimeline`. |
| `src/components/finance/Panels.tsx` (create) | `RecordCard`, `OfficeOnDate`, `StatePanel`, `HolderCard`. |
| `src/components/finance/Sections.tsx` (create) | Base rates, narratives ladder, cannot-show, connection graph, contested, gaps, refusals, source ledger, foot. |
| `src/pages/Finance.tsx` (create) | Composition, URL wiring, lens tabs, margin precedence, focus, empty states. |

## Task 1: Derivations (`financeView.ts`)

**Produces:** the names in the file map; `Filters = { lens, y: [from,to]|null, st, lender, holder, tier: Set<Tier>, rec, sel, find, m, scale, mid, view, inc, tp, bad: string[] }`.

- [ ] Step 1: RED — build and run `FINANCE_DIST=<copy> node --test scripts/pages/finance.test.mjs`; expected: every criterion fails on `article.pb-20` (the page does not exist).
- [ ] Step 2: write the module; every count reads the arrays; anchors checked at load (throw on a missing anchor so the build fails, FG-1).
- [ ] Step 3: `npx tsc -b` clean; a node script prints the §0.5 fixtures from the module and they equal the suite's own.

## Task 2: Chrome (`Finance.tsx`, `Control.tsx`, `ui.tsx`, `Sections.tsx`)

AC-01–09 (EMPTY), 19–23, 25, 27–36, 46, 52, 56–74, 81, 83, 85, 90–93, 95–98, 107, 110.

- [ ] Header, empty callout, strip facts per lens, reconciliation line with `a[data-inclusion]`, active-filter line and `reset`, tabs (manual activation), Find (`ul` results, groups by P-number, empty sentence), rail with `[data-effect]` and hidden words, one live region, Copy link, Table view, skip-to-all-tables link.
- [ ] Shared sections `#baserates #narratives #cannot #connections #contested #gaps #refusals`, ControlCard grouped by pinned domain.
- [ ] Run the suite; expected: the chrome criteria pass.

## Task 3: Loans lens

AC-10–15, 24, 26, 37–40, 44–45, 53, 59–61, 67, 69–70, 75–77, 82, 84, 86, 88–89, 99, 101, 105–106.

- [ ] Map with pooled quantile bins, fetcher class (G1), UnionBar (three segments with G1), readout, StatePanel; flow (sector default with G1); clock and twins; records strip; project list; contracts; debarments; conditions; debt.
- [ ] Run the suite; expected: loans criteria pass.

## Task 4: Associations lens

AC-16–17, 33, 41, 47–51, 54, 78–79, 102.

- [ ] Receipts chart (hatched full-height missing FYs, superseded ticks, bracket), P5 state table and map, timeline squares with rose rule / `[ ]`, aggregates table "never added", no-action block, ActionsList `section#case-{id}` with `dl` rows, grants, welfare join.

## Task 5: Capital lens

AC-05, 18, 34, 42–44, 62, 80, 87, 100, 108–109.

- [ ] `table[role=grid]` with roving tabindex, `th[data-band]`, `[data-cell]` buttons, Σ aggregate cells with the analytic dash border, G3a `{pct}%`, G3b `not-read`, the guard below four, transposed grid below 640 with `also named:` buttons; mandates (`fee not disclosed`), adviser comparison (`in this file:` counts), licences, rules timeline and cards.

## Task 6: Gates

- [ ] `npm run generate && npm run validate && npm run build && npm run smoke && npm run viewport`, then the suite pinned with `FINANCE_DIST`; record the tail of each.

## Ledger (rulings)

- Ruling: the `/finance` route and nav entry are not in `src/App.tsx`/`Layout.tsx` although the brief says they exist; those files are not mine, so the suite runs against a scratch mirror with a two-line route patch, and the return reports the missing lines — cost if wrong: the page is unreachable in the real build until the owner adds them.
- Ruling: `TenureLanes`, `WelfareMap` and `FlowSankey` are not modified (they are other pages' components and `viz/*` is out of bounds); finance draws its own map, flow and lanes — cost: some duplication of drawing code.
- Ruling: the modules carry every prerequisite export (G1, G2, G3a–c, P5), so the build shows the upgrade behaviour throughout (acceptance §0.4).
