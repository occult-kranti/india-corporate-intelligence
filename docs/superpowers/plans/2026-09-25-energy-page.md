# /energy page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/energy` scaffold with the power map specified in `docs/design/ENERGY_PAGE.md`, green against `scripts/pages/energy.test.mjs`, rendering honestly in both the populated and the empty-fleet state.

**Architecture:** One data accessor (`src/data/energy.ts`) turns the generated module into partitioned, hydrated, module-scope sets and pure selectors of the parsed URL state. The page (`src/pages/Energy.tsx`) owns the URL and composes components under `src/components/energy/`. The centre is a page-specific canvas (`EnergyGraph`) built on the shared camera (`viz/camera.tsx`) and ForceGraph's exported pure helpers (`FAMILY_COLOR`, `shapeClassOf`, `edgeWidth`, `PRED_LABEL`, `SHAPE_CLASSES`) — because every behaviour the acceptance tests require of the canvas (per-claim `data-claim`, rose response ticks, response counts in accessible names, `touch-action: pan-y` at rest, a claim-writing edge click, a node hover card on focus) needs new ForceGraph/GraphExplorer props, and `src/components/viz/*` belongs to another agent in this run.

**Tech Stack:** React 18, TypeScript strict, Vite 6, Tailwind v4, react-router-dom HashRouter, d3-force (layout only). No new dependency.

**Spec:** `docs/design/ENERGY_PAGE.md`; criteria `docs/design/ENERGY_ACCEPTANCE.md`; RED tests `scripts/pages/energy.test.mjs` (read-only).

## Global Constraints

- No runtime fetch; the page imports only compiled modules (`src/graph/energy.generated.ts`, `src/data/indices.ts`, `src/data/companies.ts`, `src/graph/data.ts`).
- Never edit `*.generated.ts`, `research/raw/*`, `scripts/assemble-fleet.mjs`, `src/context/DataContext.tsx`, `src/components/viz/*`, `src/App.tsx`, `src/components/Layout.tsx`, or any test.
- Every figure derived at module scope or from URL state; no literal counts.
- Frozen channels: dash = tier (`TIERS[t].dash`), hue = family (`FAMILY_COLOR`), shape = type (`shapeClassOf`), size = `sz`. Rose (`#c45b5a` / `--color-rose`) only for responses.
- Every sort breaks ties on id with code-unit comparison.
- Every URL write uses `replace: true`. Defaults unset = unfiltered; bare `/energy` writes nothing.
- No partisan frame in the page's own words; British spelling; no decorative effects; no sums of benefit amounts.
- `ENERGY_META.empty` renders the scaffold state described in spec §9 and passes smoke.

## Review Focus

- A claim id in `claim=` that is superseded (not drawn): the aside must still open its ClaimCard, marked superseded, not the stale-link line.
- Filters that hide the `sel` node while `claim` is set: aside keeps the ClaimCard; the path-to combobox still lists every entity.
- Data text that contains "Total"/"sum" (e.g. "Adani Total Gas"): the ledger must not add a total of its own; the words in verbatim data are data.
- Very long URLs in sources at 390px: every text container wraps (`overflow-wrap:anywhere`) so no element scrolls sideways.
- Empty fleet (`dist-empty`): no section other than `#missing` and the source list renders; every chip is disabled and hatched; nothing prints `0` as if it were a count of researched claims except the explicit "0 of 12 sweeps researched".

---

### Task 1: Data accessor `src/data/energy.ts`

**Files:** Create `src/data/energy.ts`.

**Interfaces — Produces:** `EMPTY`, `NODES: Map<string,GNode>`, `NODE_LIST`, `DRAWABLE: GEdge[]` (id-sorted), `ANSWERS: Map<string,GEdge[]>`, `SUPERSEDED`, `ORPHANS`, `responsesOf(e)`, `SWEEP_OF(id)`, `BENEFIT_OF(id)`, `ASOF {oldest,newest}`, `SWEEPS` (sector + lens rows with labels), `RESEARCHED`, `ABSENT`, `FILE_ASOF(sweep)`, `ENERGY_SECTORS`, `companyOf(id)`, `membershipWords(id)`, `constituentRows()`, `viaGroupOf(id)`, `INDEX_KEYS`, `tenureLanes()`, `sourceLedger()`, `derivedGaps()`, and `applyFilters(state) → {claims, nodes, …}` with `mostRemovingFilter`.

- [ ] Step 1: hydrate endpoints exactly as the acceptance fixtures do — `ENERGY_NODES`, then `graph/data.ts NODES`, then `companies.ts` company ids (labels from `buildNationalGraph()`); an endpoint that hydrates nowhere makes the claim an orphan.
- [ ] Step 2: partition edges: `contra` with `t` starting `claim:` → `ANSWERS`; `supersededBy` → `SUPERSEDED`; unhydrated → `ORPHANS`; rest → `DRAWABLE`.
- [ ] Step 3: `npx tsc -b` → Expected: no errors.

### Task 2: Shared energy primitives

**Files:** Create `src/components/energy/EvidenceSection.tsx`, `StackTable.tsx` (table ≥640, `<dl>` records <640, optional CSV download with BOM, RFC 4180 quoting and the formula guard), `hooks.ts` (`useMedia`, `useParamsPatch`, focus-the-margin helper).

- [ ] Step 1: EvidenceSection renders title → `[data-denominator]` mono → children → `[data-cannot-show]` at 14px with a 10px mono uppercase label → optional "Show in the graph".
- [ ] Step 2: `npx tsc -b` → no errors.

### Task 3: Strip, sweep chips, company box

**Files:** Create `src/components/energy/EnergyStrip.tsx`, `SweepStrip.tsx`, `CompanyBox.tsx`.

- [ ] Step 1: strip facts carry `data-strip-fact={n}`; the strip is sticky; the filtered chip reads `filtered {from} → {to}`.
- [ ] Step 2: chips are `button[aria-pressed]`, absent ones disabled with `[data-nodata]` hatch; the effect line carries `[data-effect]`; the caption is 12px and verbatim.
- [ ] Step 3: the company box follows the ARIA 1.2 combobox pattern with a live `{n} matching constituents` status.
- [ ] Step 4: run AC-05, AC-14–AC-17, AC-57 → PASS.

### Task 4: The canvas `EnergyGraph`

**Files:** Create `src/components/energy/EnergyGraph.tsx`.

- [ ] Step 1: deterministic layout — one d3-force run over the whole drawable graph, fixed tick count, computed once; filters hide, never re-lay-out.
- [ ] Step 2: every drawn claim is one `<g data-claim>` with an accessible name ending in its response phrase, followed by a sibling `aria-hidden` `[data-response-tick]` when answered; nodes are `g[role=button][tabindex=0][data-id]` with `aria-pressed` and `aria-describedby` pointing at the hover card while focused.
- [ ] Step 3: coarse pointer: `touch-action: pan-y` at rest, a tap on empty canvas arms pan mode (`none`) and shows a `done` control.
- [ ] Step 4: run AC-31, AC-33, AC-55, AC-64 → PASS.

### Task 5: Stage — rail, status region, aside, twin, histogram

**Files:** Create `src/components/energy/Stage.tsx`, `EnergyAside.tsx`, `Twin.tsx`, `PathHistogram.tsx`.

- [ ] Step 1: rail as `<details>` (open ≥640, closed <640) with `#amt` reading `min`, tier checkboxes named by tier word, predicate checkboxes valued by predicate, dates, index radio group with its `[data-effect]`, include-via-group, Show table, copy link, reset (own keys only).
- [ ] Step 2: one visually hidden `role=status` region before the canvas; the in-frame status is `aria-hidden`.
- [ ] Step 3: aside precedence path > claim > sel > rest; ClaimCard top line carries the file date; two equal columns; Cite-as block; CompanyTrail keeps decisions and money in separate blocks.
- [ ] Step 4: twin outside `#stage`, 19 columns, 400 per page with `tp`, superseded with `sup`, orphans last, CSV of every row.
- [ ] Step 5: run AC-04, AC-09–AC-12, AC-20, AC-24, AC-27, AC-30–AC-32, AC-35, AC-39–AC-51, AC-53, AC-58 → PASS.

### Task 6: Sections below the stage

**Files:** Create `TenureLanes.tsx`, `BenefitLedger.tsx`, `ConstituentTable.tsx`, `Calibration.tsx` (contested, narratives, base rates, symmetry), `Missing.tsx`, `Sources.tsx`.

- [ ] Step 1: each section is an EvidenceSection with the spec's denominator and verbatim cannot-show text.
- [ ] Step 2: run AC-07, AC-08, AC-13, AC-18, AC-19, AC-21–AC-23, AC-25, AC-26, AC-28, AC-34, AC-36, AC-37, AC-38, AC-54, AC-60, AC-66, AC-67 → PASS.

### Task 7: Page composition and empty state

**Files:** Replace `src/pages/Energy.tsx`.

- [ ] Step 1: header (byline as the first `p` sibling of `h1`), strip, sweep strip, stale-link line, stage, twin, sections, foot.
- [ ] Step 2: empty state per spec §9.
- [ ] Step 3: run AC-01–AC-03, AC-59, AC-61–AC-63, AC-65 → PASS.

### Task 8: Gates

- [ ] `npm run generate && npm run validate && npm run build && npm run smoke && npm run viewport`, then `node --test scripts/pages/energy.test.mjs`; record the tails.

## Rulings recorded before execution

- No commits: the dispatching brief forbids them; each task ends on its test run instead.
- The canvas is page-specific (see Architecture); the reason is file ownership, not preference, and the cost if wrong is one duplicated render loop that a later change to ForceGraph can absorb.
