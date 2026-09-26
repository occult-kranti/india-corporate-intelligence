# /welfare (Distribution funds) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/welfare` scaffold with the map-based page specified in
`docs/design/WELFARE_PAGE.md`, so that `node --test scripts/pages/welfare.test.mjs`
passes against both the FULL build and an EMPTY build, and every repository gate stays green.

**Architecture:** One pure derivation module (`src/data/welfareView.ts`) turns the
generated welfare register plus the parsed URL into row arrays; every graphic, twin,
export and denominator on the page reads those same arrays, so a table can never
disagree with its picture. Presentation lives in `src/components/welfare/*` (map, clock,
control, panels, table block); `src/pages/Welfare.tsx` owns URL state, focus and layout.

**Tech Stack:** React 18, TypeScript (strict), Vite 6, Tailwind v4, HashRouter
`useSearchParams`, hand-written SVG. No new dependency.

**Spec:** `docs/design/WELFARE_PAGE.md` (binding), `docs/design/WELFARE_ACCEPTANCE.md`
(criteria), `scripts/pages/welfare.test.mjs` (read-only tests).

## Global Constraints

- No runtime fetch; data compiled in from `src/data/welfare.generated.ts` (never edited).
- No literal figure in `Welfare.tsx` or any welfare component: every count is `.length` or a sum over a `welfareView` array.
- No `Math.random`, no clock read, no `localeCompare`; sorts are `date → id` via code-unit comparison.
- Frozen channels: dash = tier only (the analytic band edge `8 3 2 3` is the one dash on the stage); hue never encodes party; party appears as text.
- No-data hatch (`url(#nodata-…)`, lines) ≠ stipple (dots) ≠ flat zero `#15171c` ≠ ramp floor `#2e373f` ≠ page `#0a0a0c`; no fill transition.
- `a of b` always; a percentage only when b ≥ 10; recorded percentages print as `per cent` so no bare `\d%` can be read as a computed rate.
- Every alleged item is one `<dl>`: `Allegation` / `Response`, response at equal size and weight under a rose rule; missing response is the amber sentence `No response located in this file. The file does not record whether one was sought.`
- Every filter in the URL (`y m cat party lvl st s tier view q`) written with `{ replace: true }`; absent = default = unfiltered.
- British spelling in prose; verbatim research text is wrapped in `<q>` (no quote marks drawn) so it is quoted, not restyled.
- Exactly one `aria-live="polite"` region on the page.
- Files owned: `src/pages/Welfare.tsx`, `src/components/welfare/*`, `src/data/welfareView.ts`. Not touched: `*.generated.ts`, `src/components/viz/*`, `Domain.tsx`, `Editorial.tsx`, `App.tsx`, `Layout.tsx`, `scripts/*`.
- Gates: `npm run generate && npm run validate && npm run build && npm run smoke && npm run viewport`, plus the page test on the FULL dist and on an EMPTY dist built in the scratchpad.

## Rulings taken before building (spec vs. constraints of this assignment)

1. **Map component.** `IndiaMap` lives in `src/components/viz/*`, which this assignment may not edit, and the spec's `bins/classes/ballots/onFocusState` props do not exist. Build `src/components/welfare/WelfareMap.tsx` on the same `geo.ts` geometry, the same ramp and the same `nodata-` hatch.
2. **`TimeLanes`, `TwoByTwo`, `ControlCard`, `NarrativeLadder`** go under `src/components/welfare/` (spec paths `viz/` and `Domain.tsx` are not ours).
3. **One scrubber.** AC-66 requires exactly one `Year` range on desktop and AC-81 the scrubber inside the first 800px; the header alone is ~250px, so the scrubber sits in the sticky pinned stack with the strip (above the map) at every width. TimeLanes keeps the year cursor and clickable year columns but no second range.
4. **Timing chart.** `Charts.tsx` `Distribution` renders a `<figure>` with a `role="img"` SVG and `%` tick labels (including a bare `0%`), which breaks AC-43/52 (`figure` count) and AC-22/32. Build a small `TimingChart` (aria-hidden SVG + table twin, counts only).
5. **Graph.** `GraphExplorer` reads and writes the page's own `q` and `tier` params, renders its own live region and uncaptioned tables. Mount it on demand behind a button; its twin is our own claims table.
6. **Elections.** The register records some polls more than once (phases, counting day, three research files for WB 2026). Records with the same state, both assembly, dated within 90 days are merged into one election (earliest full date, all sources kept); every merge is listed as a derived gap.
7. **Partial dates.** `2024` / `2024-06` locate a scheme in a calendar year (liveness) but never enter month arithmetic; `monthsBetween` is only fed full ISO dates. Counts of excluded partial dates are derived gaps.
8. **`canon()`** is an exact-string table covering every party string in today's file; alliance, coalition, hung and President's-rule strings map to `null` (→ unclassified). Unmapped strings pass through and are listed.
9. **n line.** AC-21 fixes `n = {E} assembly elections recorded …`; Lok Sabha elections are counted inside the Union block instead of the spec's `assembly + L Lok Sabha` n line.
10. **TwoByTwo row end** is a `<th>` so AC-26 can count every `td` as a cell; it carries `(x%)` when b ≥ 10 (K6/AC-22). The test's `/(\d+) of (\d+)$/` end anchor in AC-63 contradicts AC-22 for b ≥ 10; the criterion text has no anchor, so we build to the criterion.

## Review Focus

1. A state with two elections in one year (Bihar 2005): the year-slice cell lists both; the map offsets the second ballot. Pinned by the twin/ballot equality check on y=2000 and a manual look at y=2005.
2. A URL with a recognised but unavailable metric (`?m=share` with no year): the fill is `live`, the option is `aria-disabled` with `choose a year`, and an amber line says why.
3. Filters that leave zero schemes (`?q=zzzz`): strip `filtered N → 0`, the map hatched, a line above the map saying so, the control unchanged.
4. Scheme ids containing `:` in `?s=`: links are built through `URLSearchParams` so they round-trip.
5. EMPTY register: every section renders its sentence, smoke and the page test's AC-01…08/80 pass on a scratchpad dist.

---

### Task 1: Derivation module `src/data/welfareView.ts`

**Files:** Create `src/data/welfareView.ts`.

**Interfaces (produces):**
- `type Metric = 'live'|'share'|'perhead'|'budgeted'|'actual'`; `METRICS`, `METRIC_LABEL`, `CATEGORIES` (12, contract order), `TIER_LIST`.
- `interface WelfareFilters { y; m; mRequested; cat: Set|null; party: Set|null; lvl; st; s; tier: Set<Tier>; view; q; ignored: string[]; unavailable: string|null }`
- `parseFilters(p: URLSearchParams): WelfareFilters`, `activeFilterString(p, opts?): string`
- `canon(raw): string|null`, `outcomeOf(inc, win)`, `inView(f, {ignoreParty?, ignoreLvl?, ignoreQ?, ignoreCat?})`
- `liveInYear(s, y)`, `amountInForce(s, y)`, `annualPerHead(amount, unit)`, `isDeclared(st, y, cat)`
- `ELECTIONS` (merged), `electionRows(f)`, `controlWindows(f)`, `unionWindow(f)`, `partyLine(f)`
- `stateYear(f)` → `{ rows: StateYearRow[36]; ballots; counts; bins }`, `BINS`, `metricAvailability(f)`
- `timing(f)`, `partyRows(f)`, `turnovers(f)`, `turnoverMirror(f)`, `ministersRows(f)`, `ministerActions(f)`, `statusRows(f)`, `promisedRows(f)`, `scrutinyRows(f)`, `benefitRows(f)`, `findingsRows(f)`, `contested(f)`, `responsesFor(id)`, `lanes(f)`, `scrubberRows(f)`, `matrix(f)`, `moneyRows(f)`, `stripFacts(f)`, `derivedGaps()`, `sourceLedger()`.

- [ ] Step 1: write the module with the rules of spec §5.4, §5.8–§5.15 and §6.6, plus rulings 6–8.
- [ ] Step 2: `npx tsc -b` → expect no errors.
- [ ] Step 3: sanity script in the scratchpad printing `stripFacts`, `controlWindows`, `stateYear` class counts for `y=2000`, checking class counts sum to 36 and every control count equals its item list length.

### Task 2: Presentation primitives `src/components/welfare/ui.tsx`

`TierWord` (lowercase chip text, no text-transform, so a reader and a check both see the tier word), `Src` (Cite or amber `no source in file`, host in mono), `Verbatim` (`<q>`), `Caption` (`data-caption`, 14px, `border-l-2`, `max-w-[72ch]`), `TableBlock` (caption line `{rows} rows · filters: … · … · as of … · run …`, `Copy as TSV` / `Download .tsv` above, mono `{k} columns · scroll → for the rest`, `role="region"` wrapper labelled with the caption line), `useNarrow`, `ListDetails`.

- [ ] Step 1: implement; export TSV = caption line, snake_case header ending `as_of run_id filters source_urls`, one line per row.
- [ ] Step 2: `npx tsc -b`.

### Task 3: `WelfareMap.tsx` (map, ballots, legend, readout, keyboard)
- [ ] `data-fill-class` on every path; hatch `nodata-` lines pattern, stipple circles pattern, flat `#15171c`; fixed bins; ballots `<g data-ballot data-outcome data-lid data-muted>` with square first, solid stroke `var(--color-text)`; screen-pixel floor via a scale computed from rendered width.
- [ ] Dynamic `aria-label`, `aria-describedby` = figcaption id + legend id; arrow keys move focus; the readout text is published to the page's single live region synchronously.

### Task 4: `TimeLanes.tsx`
- [ ] aria-hidden SVG (min-width 580px) inside an `overflow-x-auto` box; label column `ul > li > button[data-lane]`; central band header and count; state lanes with `data-election` rules; accent only on the selected lane's `<g>`; narrow: opens at the right edge, `showing a–b`, `‹ earlier years` / `later years ›`.

### Task 5: Control, panels, ladder, timing chart
- [ ] `ControlCard.tsx`, `TwoByTwo.tsx`, `NarrativeLadder.tsx`, `TimingChart.tsx`, `StatePanel.tsx`, `SchemeCard.tsx` per spec §5.6, §5.8, §5.13, with the structural `<dl>` pairing.

### Task 6: `src/pages/Welfare.tsx`
- [ ] URL state, FilterBar (desktop row / phone `<details>`), pinned stack, stage grid (DOM order: FilterBar → skip link → figure → legend → margin → clock → captions → twins), sections §5.8–§5.16, empty state (§9), focus management (U18), live region (U21).

### Task 7: Verification
- [ ] `npm run build` then `node --test scripts/pages/welfare.test.mjs` (FULL) → green except fixture skips.
- [ ] EMPTY dist: copy repo to scratchpad, `node scripts/assemble-fleet.mjs --dir <empty> --out <copy>`, `vite build`, `WELFARE_DIST=<copy>/dist node --test …` → AC-01…08, AC-80 green.
- [ ] Gates: `npm run generate && npm run validate && npm run build && npm run smoke && npm run viewport`.
- No commit: the harness forbids commits for this assignment.

## Execution ledger (rulings taken while building)

- Ruling: closed table twins stay rendered for assistive technology (`details[data-twin]:not([open])::details-content` is kept in layout, visually hidden; nothing inside takes keyboard focus via the `Tabbable` context) — `innerText` of a closed disclosure is empty, and AC-30/31/57/58/59/60/61 read the twins at the default view where AC-43 requires them closed — cost if wrong: screen-reader users meet three long tables inline; revert the one CSS rule and those criteria cannot be checked at the default view.
- Ruling: in-page links are plain anchors navigated by one shared function (`QLink`) — React Router's `createHashHref` runs `querySelector('base')` over the whole document for every `<Link>`, and ~5,000 links made a filter change take 2 s — cost: none known; modifier-clicks still follow the href.
- Ruling: the page keeps a synchronous copy of the URL params beside the router's — the HashRouter commits navigation in a transition, so focus could not move to a panel in the same event that opened it — cost: a brief overwrite if two transitions race; the copy re-syncs from the router.
- Ruling: the ministers-actions and claims twins render their rows only once opened (they are also opened by `view=table` and `#stage-tables`).
- Ruling: TimeLanes' visible-range state only changes on a changed range — an unconditional set in an effect was a render loop that starved the router's transition.
- Ruling: election caps get their own row under each band header.
- Ruling: a research field holding only a dash renders as `not stated`; units quoted after `unit not comparable:` stay in `<q>`.
- Test defects found (tests not edited): AC-25 (a null denominator must read as '', 'null' or '0'; the page prints `not recorded` per §7.2 rule 11), AC-44 (the discovered year is 2000, the range minimum, so ArrowLeft cannot reach 1999), AC-63 (`/(\d+) of (\d+)$/` contradicts AC-22's required `(x%)` when b ≥ 10), AC-02/AC-80 (`text=` is case-insensitive substring, so it also matches the byline, skip link and three summaries that AC-03/04/06 require).
