# /welfare: distribution funds, 2000–2026 (design spec)

*Status: the synthesised spec for the build, written 2026-09-25 by the judge. It replaces
the earlier solo spec, which now lives at `docs/design/drafts/welfare-solo.md`. Data
contract: the welfare fleet contract (`schemes`, `entities`, `claims`, `elections`,
`baseRates`, `narratives`, `voids`, `symmetryCheck`, `gaps`) as typed in
`src/data/welfare.ts` over the generated module `src/data/welfare.generated.ts`
(`WELFARE_SCHEMES`, `WELFARE_ENTITIES`, `WELFARE_SCHEME_NODES`, `WELFARE_CLAIMS`,
`WELFARE_BENEFITS`, `WELFARE_ELECTIONS`, `WELFARE_BASE_RATES`, `WELFARE_NARRATIVES`,
`WELFARE_VOIDS`, `WELFARE_SYMMETRY`, `WELFARE_GAPS`, `WELFARE_IDENTITY`, `WELFARE_META`).
The spec is written against the contract, not against any record. **No figure in this
document is data.** Every `{brace}` is derived at module scope or in `useMemo`.*

*The generated module is **empty today** (`WELFARE_META.empty === true`). The first build
renders that state, and smoke must pass in it.*

*[UX review] Revised 2026-09-25 after a five-persona **SYNTHETIC** UX review (journalist,
policy researcher, hostile reader, screen-reader user, phone reader), synthesised in
`docs/design/WELFARE_UX_REVIEW.md`. The 22 must-level amendments, U1–U22, are applied in
place, and each is marked `[UX review] (Un)`. The should- and could-level amendments are
listed under "Deferred amendments" at the end. The review is synthetic: its findings are
hypotheses to validate with real readers.*

---

## 0. How this spec was made

### 0.1 Scores

Three candidates were scored 1–5 on each axis. The drafts are kept in
`docs/design/drafts/`.

| axis | graphic-first | question-first | solo |
|---|---|---|---|
| Honesty (captions, denominators, no-data ≠ zero, denials as loud as claims) | 4 | **5** | 4 |
| Encoding (one meaning per channel, tier dash preserved, nothing decorative) | 4 | 4 | 4 |
| Reader efficiency (brief's questions answered in under two minutes) | **5** | 3 | 3 |
| Buildability with existing components | 3 | 2 | **4** |
| Mobile | **5** | 4 | 3 |
| Fit with the brief (map + 26-year scrubber; ministers, parties, results; skeptical and symmetrical) | **5** | 4 | 3 |
| **Total** | **26** | 22 | 21 |

- **Graphic-first wins. It is the spine of this spec.** It is the only draft where the
  map and the scrubber answer the brief's first three questions without scrolling. It
  puts the control inside the picture: every assembly election in the scrubbed year is
  marked on the map, including the ones no scheme preceded. It keeps three separate
  non-value textures. It has the most concrete mobile plan. Its weaknesses: it inherits
  the solo draft's false-zero rule; its ~1,560px stage cannot fit inside the house
  layout; the party filter narrows the control; and it draws the analytic expectation
  as data.
- **Question-first is the runner-up. It supplies most of the grafts.** It has the most
  honest rules on the page: no zero unless coverage is declared, the party filter never
  touches the comparison, a floor under percentages, the turnover table, challenger
  promises named as a confounder, and promised-versus-paid. Its reader path is long
  (the control is the fifth section). Its universal `Fig`/`CheckDrawer` registry and
  its dependency on a `Questions.tsx` that does not exist make it the most expensive to
  build.
- **Solo is the most buildable.** It changes the fewest files and has the smallest
  `IndiaMap` change. But it puts the control above the map (the brief asks for a
  map-based layout), keeps central schemes in a rail rather than on the time axis, has
  no ministers table across schemes, has no per-head metric, and shares one hatch
  between "not swept" and "partial".

### 0.2 Conflicts resolved

Each line gives the conflict, then the decision. The builder has nothing left to choose.

| # | Conflict | Decision |
|---|---|---|
| K1 | **What counts as zero.** In graphic-first and solo, a state that appears in any record is "swept", so it gets a flat zero fill in every year. Question-first shows zero only for state-years a research file declares it searched. | **Question-first.** Under the "appears anywhere" rule, Madhya Pradesh in 2004 would render as "swept, none live" only because a 2023 scheme put MP in the file. That is a false zero. Flat zero fill is drawn only for a state-year covered by the optional `coverage` field (§3.4). Without that field, the zero class is printed in the legend as **empty**, with the reason. |
| K2 | **How many non-value textures.** Graphic-first uses three: hatch, flat, stipple. Question-first uses one hatch and names reasons in the legend. | **Graphic-first textures plus question-first reasons.** Hatch means *none recorded in this file*. Stipple means *live scheme(s) recorded, but no comparable figure*. Flat means *declared searched, none live*. Each non-value state also carries a named `reason`, shown in the readout and counted in the legend. The textures carry the distinction into a screenshot. The reasons carry the detail. |
| K3 | **Where the control sits.** Solo: above the map. Graphic-first: inside the frame (ballots on the map, a ControlCard in the margin). Question-first: fifth section. | **Graphic-first.** The ballots put the elections that had no scheme in the same frame as the ones that did. The ControlCard shows the counts before any click. The long form follows the stage directly. |
| K4 | **Does the `party` filter reach the control?** Graphic-first and solo: yes. Question-first: no. | **Question-first.** The ControlCard, the TwoByTwo, the by-party table and the turnover table ignore `party`. The selected party's rows are marked with an accent left border and are never isolated. Filtering a symmetry check down to one party deletes the check. On the map, ballots whose incumbent is outside the filter are muted. They are never removed. |
| K5 | **Windows.** Graphic-first and solo: three TwoByTwo tables (6, 12 and 24 months). Question-first: one 12-month table plus a sensitivity row. | **Question-first for the long form.** One TwoByTwo at 12 months, with 6 and 24 months in a sensitivity row at the same type size. The ControlCard at rest prints all three windows as three lines. There is never a window control. |
| K6 | **Rate floor.** Question-first prints no percentage below b = 5. Graphic-first prints none below b = 10. | **b ≥ 10.** `a of b` is always printed, so the count is never lost. The percentage is added only when b ≥ 10. The rule applies on every surface. |
| K7 | **The analytic expectation.** Graphic-first and solo draw "uniform timing" as a second `Distribution` series. | **Neither.** `Distribution` cannot dash a series, so an analytic expectation would render like observed data. The expectation is printed as text under the chart, and as a column in the chart's twin, labelled `analytic`. |
| K8 | **Every figure as a button** (question-first `Fig` + `CheckDrawer` + `chk` param). | **Not built.** The registry would touch every number on the page and depends on a component that does not exist. The property it protects is kept by a cheaper rule: every control-derived count (ControlCard lines, TwoByTwo cells, by-party cells, turnover rows) is the `.length` of an array. A `<details>` beside the count lists that array's rows, with sources. |
| K9 | **`GraphExplorer`.** Graphic-first drops it. Question-first and solo keep it. | **Kept, for the claims only.** `WELFARE_CLAIMS` holds sparse typed relationships: role, enforce, contra, award, analytic. That is what a force graph is for (interface-design, "centre" table). Who-else-benefits stays a ledger, because scheme × channel is bipartite. The graph is lazy and costs about 20 lines. |
| K10 | **Stage width.** Graphic-first breaks out to 1560px. | **Impossible in this layout.** `Layout.tsx` wraps pages in `max-w-7xl` beside a 256px sidebar. At a 1280px viewport the content box is 960px. The stage fills the layout's width. The margin is 22rem, not 26rem. `TimeLanes` has a minimum width of 580px so that it fits beside the margin at 1280. |
| K11 | **Central schemes.** Solo: a rail beside the map. Graphic-first: a band inside the time lanes. Question-first: a separate `CentralBand` sharing the scrubber's axis. | **Graphic-first's band inside `TimeLanes`**, so there is one x-scale and one component. Question-first's amount labels at change points are grafted onto central lanes and the selected lane. |
| K12 | **Per-head metric.** Solo: none. Question-first: `head`, which works without a year or a category. Graphic-first: `perhead`, which needs a year and exactly one category. | **Graphic-first.** A monthly women's transfer and an annual farmer transfer should not share one ramp. The metric is per enrolled beneficiary, never per capita. [UX review] (U5) Renamed "entitlement per beneficiary": nothing is divided by enrolment. |
| K13 | **Bins.** Question-first pools values under the current filters. Graphic-first pools unfiltered values into fixed quantile bins. Solo fixes a min/max domain. | **Graphic-first.** Bins come from every state-year of the metric, pooled with **no** filters, so a shade means the same value in 2006 and 2024 and does not move when the reader filters. |
| K14 | **Ministers table shape.** Graphic-first: one row per (person, party). Question-first: one row per (person, scheme, action). | **Per person on the page, per action in the twin.** The per-person table answers "who put their name to these" at a glance. The per-action table is its `<details>` twin, together with question-first's lifecycle-completeness line. |
| K15 | **Expected share under uniform timing.** Question-first uses the state's actual term length. Graphic-first and solo use 5 years. | **A 60-month uniform term everywhere, labelled analytic.** The previous election is often absent from the file, so a term-length rule would silently mix two definitions. The caption says early elections break the assumption. |
| K16 | **Caption size.** Graphic-first: 13px muted. Question-first: body size. | **Body size (14px, `text-text-secondary`), with a left rule.** "What this cannot show" is a finding here, not a footnote. |

Grafted from question-first without conflict: the active-filter line under the strip,
the turnover table, promised-versus-paid and scrutiny drives, the challenger-promises
and budget-cycle confounders, the page-level findings list, the partial-range caption,
the scrubber twin, and mobile strip trimming.

---

## 1. Page purpose

`/welfare` is a map of India's direct-benefit and distribution schemes from 2000 to 2026,
with a clock beneath it. It covers cash to women, farmers, pensioners and students; free
and subsidised grain; loan waivers; free power; and goods such as cycles and televisions.
For each scheme the page records:

- where and when it was live;
- who announced it and which body approved it, with dates;
- which ministers carried it, for which party;
- what it paid per head and in total, to how many, and at what share of the state budget;
- how many months before which election it launched, and what that election returned;
- what became of it afterwards (raised, cut, tightened, paused, renamed, discontinued,
  or promised and never enacted), recorded as supersession and never overwritten;
- what evaluations, audits, courts and surveys found, with the response beside every
  allegation;
- who gained besides the beneficiaries.

The page holds two hypotheses at equal weight: *cash transfers buy elections*, and *cash
transfers are welfare that happens to be popular*. It gives the reader the control that
tests them in the same frame as the map: every assembly election in the file, whether or
not a scheme preceded it, with every party measured in the same columns. It asserts no
motive. It is a map because a scheme is a jurisdiction: where a scheme applies is set by
who governs that place, and when.

## 2. The reader's questions, in order

Questions 1–3 are answered from the stage at rest, without scrolling, at 1280×800. Each
of questions 4–8 is one click on the stage.

| # | Question | Answered by |
|---|---|---|
| 1 | Where were schemes live, and when? | map fill + scrubber (§5.4, §5.5) |
| 2 | Which states voted that year, did a fresh scheme precede the vote, and did the incumbent keep power? | ballots on the map, readout |
| 3 | Across every election in the file, does a fresh scheme go with keeping power, for every party? | `ControlCard` in the margin at rest (§5.6a); long form §5.8 |
| 4 | What did this state run, when, and under whom? | click a state: `StatePanel` and the state's lanes |
| 5 | For this scheme: who announced and approved it, when, for which party? How much per head and in total, what share of the budget? How many months before which election, with what result? | click a lane or row: `SchemeCard` (§5.6c) |
| 6 | What happened to it afterwards? | status glyphs on the lane; card status block; §5.10 |
| 7 | What did evaluations, audits and courts find, and what was the response? | card findings; §5.12 |
| 8 | Who gained beyond the beneficiaries? | card block; §5.11 |
| 9 | What did the Union run meanwhile? | central band in the clock, not painted on states |
| 10 | Which ministers, from which parties, put their names to these schemes? | §5.9 ministers and parties |
| 11 | Would this look different under a rival party? | by-party table and turnover table (§5.8) |
| 12 | Which circulating narratives hold up? | §5.13 narrative ladder |
| 13 | What is missing? | voids in the margin at rest; §5.15 |

---

## 3. Route, data, URL state

### 3.1 Route

`/welfare` already exists: it is lazy in `src/App.tsx`, the nav entry "Distribution funds"
is in `Layout.tsx`, and `['/welfare','welfare']` is in `scripts/smoke.mjs`. The page
replaces the scaffold body of `src/pages/Welfare.tsx`. The `Suspense` fallback is
unchanged. The page's outer element is `<article className="pb-20">`, with no inner
`max-w`. The stage uses the full layout width. Prose blocks cap at `max-w-[72ch]`.

### 3.2 Data (static, compiled in)

- The page imports only from `src/data/welfare.ts` and a new derivation module,
  `src/data/welfareView.ts` (§6.6). **No literal figure appears in `Welfare.tsx` or in
  any welfare component.**
- `WELFARE_ENTITIES`, `WELFARE_SCHEME_NODES` and `WELFARE_CLAIMS` are already
  `GNode[]`/`GEdge[]`. No converter is needed. (The solo draft's `src/graph/welfare.ts`
  is dropped.)
- `asOfLabel`: `WELFARE_META.asOf`. When `WELFARE_META.files[].asOf` differ, use
  `{min}–{max}`. When null, use `not yet promoted`. Derive it; never pick one date.
- The state × year × metric matrix is at most 36 × 27 × 5 cells. It is recomputed in one
  `useMemo` keyed on the parsed filters.
- **[UX review] (U1) An export is the twin's row array, serialised.** Every twin (§11) and
  every section table offers `Copy as TSV` and `Download .tsv`. Both are built client-side
  from the same `welfareView` row arrays that feed the table, using a `Blob` and an object
  URL: no dependency and no fetch. So an export cannot drift from the graphic. The format
  is §11 item 7.

### 3.3 URL parameters

All params go through `useSearchParams` with `{ replace: true }`, using the same
`setParam` helper as `Resources.tsx`. **Absent = default = unfiltered, nothing
selected.** An unknown value falls back to the default. The param name is added to
`filters.ignored`, and a one-line amber notice under the strip reads
`ignored an unrecognised {param} value`.

| param | values | default | reach | effect shown beside the control |
|---|---|---|---|---|
| `y` | `2000`…`2026` | all years | Map fill, ballots, readout, lane cursor, "live in y" marks. Calendar year for launches, elections and status; **FY `y`–`(y+1)`** for money. | readout `{n} state schemes live of {N} in view · {e} assembly elections` |
| `m` | `live` \| `share` \| `perhead` \| `budgeted` \| `actual` | `live` | Map fill only | Each option shows coverage for the current `y`: `Share of state budget: {k} of {n} live state schemes have a figure for FY {fy}`. Disabled options state the reason on the option: `choose a year` (every metric except `live`), `choose exactly one category` (`perhead`), `too few figures to bin (n = {n})`. |
| `cat` | comma list of the 12 contract categories | all | Everywhere, including the control | chip counts `women-cash (9)`. Zero-count categories are shown **disabled with (0)**, never hidden. `{N} → {k} schemes` |
| `party` | comma list of canonical party labels | all | Map, lanes, tables, ministers, findings, benefits. **Not** the control, the by-party table or the turnover table (K4). | `{N} → {k} schemes`. Never pre-selected. |
| `lvl` | `all` \| `state` \| `central` | `all` | Lanes, tables, central band. The map is state-only whatever this says. | `{N} → {k}` + "the map shows state schemes only" |
| `st` | state code | none | Opens `StatePanel` and expands that state's lanes. **Does not filter** tables; it marks the state's rows. | — |
| `s` | scheme id | none | Opens `SchemeCard`. The lane is drawn in accent. Takes margin precedence over `st`. | — |
| `tier` | comma list of the four tiers | all four | Findings, who-else-benefits rows, contested, graph | `{k} of {n} findings · {j} of {m} benefit rows` + "filters findings, not schemes" |
| `view` | `map` \| `table` | `map` | `table` swaps the stage for its twin (§10) | — |
| `q` | text | empty | Scheme filter on name, alias, or the label of any person in `announced`/`ministers[]` | `{N} → {k}`; when k ≤ 8, the k scheme names as links to `?s={id}`, keeping the other params. A unique match is not auto-selected (R13). [UX review] (U6) |

No window param (K5). No param hides the ballots: they are the denominator. No `chk`
(K8).

**[UX review] (U21) Unavailable options and the live region.**

- Unavailable options (metric options, zero-count category chips) are
  `aria-disabled="true"`, not `disabled`. They stay focusable, and the reason is inside
  the accessible name (`Share of state budget, unavailable: choose a year`). A `disabled`
  control cannot be reached, so its reason would never be heard.
- The page has **exactly one** `aria-live="polite"` region, debounced: about 150 ms for
  the map readout and about 300 ms for `q`. It carries:
  - the `{N} → {k} schemes` effect of every filter change;
  - the active-filter line;
  - the map readout on keyboard focus (U4);
  - panel open and close (U18);
  - `Link copied` and `Table copied, {rows} rows` (U1).
- The tier toggles' dash swatches are `aria-hidden`; the tier word is the label.

### 3.4 Optional contract field: `coverage` (K1)

```jsonc
"coverage": [ { "st": "mp" | "central", "fromYear": 2018, "toYear": 2026,
                "categories": ["women-cash", "farmer-cash"] | "all",
                "method": "what was searched, one sentence", "srcs": [["label","url"]] } ]
```

- `scripts/assemble-fleet.mjs` passes it through as
  `export const WELFARE_COVERAGE: Coverage[]` (empty array when absent). `src/data/welfare.ts`
  adds the `Coverage` type and re-exports it.
- `scripts/validate.mjs` checks its shape.
- **The page must work without it.** Research is in flight, and no file may be
  invalidated.
- A state-year `(st, y)` is *declared* when some entry has `st` equal, `fromYear ≤ y ≤
  toYear`, and `categories === 'all'` or `categories` includes every selected `cat`.
  With no `cat` filter, it requires `'all'`.

---

## 4. Page anatomy

```
┌ Kicker · PageTitle · Standfirst · Byline ──────────────────────────── ≤150px ┐
├ DenominatorStrip (sticky) + active-filter line ─────────────────────────────── ┤
├ [Callout "Register not yet promoted" — only when WELFARE_META.empty]           ┤
├ FilterBar: q · Metric · Category · Party · Level · Tier · Reset · Copy link ·  ┤
│            [Map | Table]                                 {N} → {k} schemes     │
├─────────────────────────────────────────────────┬──────────────────────────────┤
│ MAP  IndiaMap (fixed bins · 3 non-value classes │ MARGIN 22rem, xl:sticky      │
│      · ballots)                                 │ top-14, own scroll,          │
│ in-frame status line (figcaption)               │ max-h calc(100vh − 4rem)     │
│ legend                                          │  rest: ReadingKey            │
├─────────────────────────────────────────────────┤        ControlCard           │
│ CLOCK  TimeLanes                                │        Voids                 │
│  scrubber row · coverage ribbon · all-states    │  st:   StatePanel            │
│  row · hover-preview row · CENTRAL band ·       │  s:    SchemeCard            │
│  SELECTED-STATE lanes · glyph legend            │                              │
├─────────────────────────────────────────────────┴──────────────────────────────┤
│ Stage captions C1–C7 (body size, 72ch)  ·  <details> table twins              │
├ §5.8  The control, long form (id="control")                                    ┤
├ §5.9  Ministers and parties (id="ministers")                                   ┤
├ §5.10 After the launch: changes, cuts, promises (id="after")                   ┤
├ §5.11 Beyond the beneficiaries (id="benefits")                                 ┤
├ §5.12 What was found, and what was answered (id="findings")                    ┤
├ §5.13 Narratives, rated (id="narratives")                                      ┤
├ §5.14 The claims as a graph (id="graph")                                       ┤
├ §5.15 What the record does not contain (id="missing")                          ┤
└ SourceLedger · TierLegend · Footnote ──────────────────────────────────────────┘
```

Stage grid: `xl:grid xl:grid-cols-[minmax(0,1fr)_22rem] xl:gap-6`. The left column holds
the map and TimeLanes stacked. The right column is the margin, `xl:row-span-2`. Below
`xl` (under 1280px), the margin becomes a normal block **between the map and the
clock**, so the selected state or scheme sits next to what was clicked.

[UX review] (U6, U2) The FilterBar opens with `q`, as drawn above. The DOM order inside
the stage is fixed in §5.7; the grid places the margin visually and never reorders the
DOM.

**Fold budget at 1280×800** (content width 960px): header ≤150, strip + filter line ≈56,
filter bar ≈44, map 420 (`height = clamp(420, 100vh − 380, 620)`), scrubber row 44.
That totals ≈714, so the scrubber is in the first viewport. The viewport check (§9)
asserts this.

---

## 5. Section by section

### 5.1 Header (existing `Editorial`)

- `Kicker`: `Distribution funds · cash, grain and goods schemes · 2000–2026`
- `PageTitle`: **Who announced the money, when, and what the voters did next**
- `Standfirst` (fixed copy): "Some say India's cash-transfer schemes buy elections.
  Others say they are welfare that happens to be popular. This page does not choose. Scrub
  the years to see where state schemes ran and where elections fell, including every
  election no scheme preceded. Then click a state or a scheme to see who announced it,
  what it paid and what became of it. Every party is measured in the same columns."
- `Byline`: `{schemes} schemes · {statesWithAny} of 36 states & UTs with a recorded state scheme · {parties} parties · {assembly} assembly elections recorded · as of {asOfLabel} · run {WELFARE_META.runId}`
- **[UX review] (U22)** When `WELFARE_META.empty`, the Byline reads `register not yet
  promoted · nothing below is zero` in place of its six counts. The §9 callout sits above
  it, directly under the Standfirst, on every viewport.

### 5.2 `DenominatorStrip` (existing, sticky)

```ts
<DenominatorStrip
  asOf={asOfLabel}
  filtered={{ from: WELFARE_SCHEMES.length, to: inView.length }}
  facts={narrow ? FACTS.slice(0, 3) : FACTS}
/>
// FACTS, derived in welfareView.stripFacts(filters):
[
  { n: inView.length, of: WELFARE_SCHEMES.length, label: 'schemes in view' },
  { n: statesWithAny, of: 36, label: 'states & UTs with a recorded state scheme' },
  { n: yearsCovered, of: 27, label: 'years with a recorded live scheme' },
  { n: assemblyElections.length, label: 'assembly elections recorded · reference class not in file' },   // [UX review] (U9): reads `of {held}` only once a sourced electionsReference lands (§14); never hand-written
  { n: outlayRowsWithActual, of: outlayRows, label: 'outlay rows with an actual, not only a budget' },
  { n: allegedAnswered, of: allegedAll, label: 'allegations with a response on record' },   // [UX review] (U11): + `· {k} unanswered, whether a response was sought not recorded`, which becomes `of which {j} recorded as sought` once responseSought lands
]
```

Directly under the strip, and inside the same sticky wrapper, is the **active-filter
line**. It is mono 11px and rendered only when any of `y m cat party lvl tier q` is set:
`filters: y=2023 · m=share · party=BJP,INC · reset`. `reset` clears everything except
`view`. On narrow screens, facts 4–6 are printed in a non-sticky mono line under the
`Byline`. They are moved, not hidden.

### 5.3 `FilterBar` (page-local, one row, wraps)

The controls are specified in §7.3. Each shows its live `{N} → {k}` effect.

**[UX review] (U6)** Search `q` is the **first** control, because a reader on deadline
arrives with a name.
- It is an `<input type="search">` with the placeholder `scheme, alias or person` and
  `aria-label="Search schemes by name, alias or person"`.
- Its effect is announced through the live region (U21).
- When `q` narrows the view to k ≤ 8 schemes, the `{N} → {k} schemes` line under the bar
  becomes a list of those k names. Each links to `?s={id}` and keeps the other params.
- A unique match is not auto-selected (R13). The link is one click, and the click is the
  reader's act.

`Copy link` copies `location.href` and announces `Link copied` (U21). When `party` is set, a line under the bar reads: "Showing one
side. The control and the by-party tables below always measure every party." It links to
`#control`.

### 5.4 The map: `IndiaMap`, extended (§6.1)

```ts
<IndiaMap
  data={matrix.data}                       // welfareView.stateYear(filters) → Partial<Record<StateCode, MapDatum>>
  metricLabel={METRIC_LABEL[m]}            // [UX review] (U14, U5): live → y ? 'State schemes live in {y}' : 'State schemes launched 2000–{asOfYear} (cumulative, incl. discontinued)' | 'Share of state budget' | 'Entitlement per beneficiary, per year (as recorded)' | 'Budgeted' | 'Actual'
  unit={METRIC_UNIT[m]}                    // '' | '%' | '₹ per beneficiary-year, entitlement' | '₹ cr' | '₹ cr'
  bins={BINS[m]}                           // fixed; pooled unfiltered (K13)
  classes={{
    zero: hasCoverage ? { label: `searched, none live${y ? ' in ' + y : ''}` }
                      : { label: 'searched, none live', empty: 'no research file declares its coverage, so no state-year is shown as none' },
    stipple: STIPPLE_LABEL[m],             // 'live, no comparable figure'
  }}
  ballots={y ? matrix.ballots : []}
  onHover={setHoverState}                  // drives the TimeLanes preview row only
  selected={st}
  onSelect={(c) => setParam('st', c)}
  showMarks={false}
  height={mapHeight}
  format={METRIC_FORMAT[m]}
/>
```

**`MapDatum` rules.** Each rule is a claim; implement `welfareView.stateYear` exactly as
follows.

- **Live in y**: `schemesLiveInYear(y)` from `welfare.ts`, restricted to `level ===
  'state'` and to the filters. A scheme with a dated `paused` in `y` stays live, and the
  detail says `paused in {y}`. With `y` absent, "live" means ever launched, 2000 to asOf.
  [UX review] (U14) The metric label, the status line and the matrix-twin header say so:
  `State schemes launched 2000–{asOfYear} (cumulative, incl. discontinued)`.
- **`live`**:
  - count > 0 → `value: count`;
  - count 0 and the state-year is declared (§3.4) → `value: 0, fillClass: 'zero'`;
  - otherwise → `value: null, reason: 'none recorded in this file'` (hatch).
- **`share` / `budgeted` / `actual`**: the sum over live schemes of `outlayForFy(s,
  fy(y))` → `pctOfStateBudget` / `budgetedCr` / `actualCr`. Budgeted and actual are never
  mixed and never substituted for each other.
  - If any live scheme lacks the figure → `value: null, fillClass: 'stipple'`, with
    reason `partial` or `not located` and `detail: "partial: {sum} across {k} of {n}
    live schemes; a partial sum is a lower bound and is not shaded"`.
  - No live scheme → as for `live` (zero if declared, hatch otherwise).
- **`perhead`** (needs `y` and exactly one `cat`): for each live scheme in the category,
  `annualPerHead(amountInForce(s, y), s.benefit.unit)` (§6.6).
  - The value is the **largest** of these.
  - **[UX review] (U5)** `detail` lists every live scheme in the category, each with its
    amount and unit as recorded, then the annualised figure, in this order and wording:
    `₹1,500 / month as recorded · ₹18,000 / yr ×12, computed here`. After the list comes
    `larger shown; amounts are not added, they may reach the same person`. The recorded
    amount carries the `Cite`; the computed one never does (§7.2 rule 13).
  - If none can be annualised → `fillClass: 'stipple'`, with reason `unit not
    comparable: {unit}` or `amount not located`.
- **Boundary mirroring** (current geometry, historical data), and nothing else:
  - for `y ≤ 2013`, the `tg` polygon takes the `ap` datum, with detail `undivided Andhra
    Pradesh until 2 June 2014; value is AP's`;
  - for `y ≥ 2020`, `dn` and `dd` both take the datum computed over schemes with `st ∈
    {dn, dd}`, with detail `merged UT since 26 Jan 2020`;
  - `jk` is drawn including Ladakh, with a detail note from 2019-10-31;
  - for `y = 2000`, `ct`, `jh` and `ut` carry the detail `formed Nov 2000`.

  Mirroring is display-only. The control never mirrors.
- Every `detail` ends with the parties of the live schemes as text: `· schemes by: BJP
  (2), INC (1)`.

**Ballots** (only when `y` is set). There is one ballot per `electionRows(filters)` row
with `st != null`, `/assembly/i.test(election)` and a date in `y`. The ControlCard, the
TwoByTwo, the by-party table and the table twin read the same rows, so all four count
the same elections.

- `outcome`:
  - `retained` when `canon(winner) === canon(incumbentParty)`;
  - `lost` when both canonicalise and differ;
  - `unclassified` when either is null or either raw string matches
    `/\+|\/|alliance|front|\bNDA\b|\bUPA\b|\bINDIA\b|mahayuti|\bMVA\b|mahagathbandhan/i`.
- `lid` (**exposure**, the one rule used everywhere): true when some scheme in view has
  `level === 'state'`, `st === e.st`, `canon(party) === canon(e.incumbentParty)`, and an
  **event date** `d` with `0 ≤ monthsBetween(d, e.date) < 12`. Event dates are:
  - `launched.date`;
  - the date of any `benefit.changes[]` entry whose amount is higher than the previous
    amount (the base amount, or the prior change);
  - the date of any `status: 'raised'` entry.

  `monthsBetween` from `welfare.ts` is the only month arithmetic. The rule is declared
  before looking. Do not add clauses.
- `muted`: true when `party` is set and `canon(incumbentParty)` is not in it. A muted
  ballot is drawn in `--color-text-muted`. It keeps its fill and lid and is still
  counted.
- SVG `<title>`: `{State} assembly · {date} · {incumbent} → {winner} · fresh scheme within 12 m: {yes|no}`.

**Readout on hover** (the existing readout, extended): state name; `{metric}: {value}`
with the FY for money metrics, or the `reason`; the `detail` line; then, if an election
fell in `y`, `{date}: {incumbent} → {winner} · fresh scheme within 12 m: yes/no`.

**[UX review] (U4)** Additions to the readout:
- **Sums are labelled.** For `share`, `budgeted` and `actual`, the value is prefixed
  `sum of {k} recorded schemes ·`. The detail ends `· computed here; sources in the state
  panel`, because no source states the summed number.
- **What it follows.** The readout follows `hover ?? focused ?? selected`.
- **Where else it appears.** The same four lines open the `StatePanel` (§5.6b) on every
  viewport, so touch readers, who have no hover, get them on tap. On keyboard focus the
  text is also written to the page's single live region (§6.1, U21).

**In-frame status line.** This is the map's `<figcaption>`. It is always rendered,
directly under the SVG and above the legend, so screenshots carry it.

**[UX review] (U3)** Revised as follows.
- **Size.** Body size (14px, `text-text-secondary`), with mono only for counts and codes.
  This resolves the conflict with §7.2 rule 10; the line was specified as mono 11px.
- **Structure.** A `<ul>` of clauses: one clause per line below 640px, dot-separated by
  CSS above it. The words and their order are the same at every width, and a screen
  reader does not read the separators.
- **Order within a clause.** The meaning first, then the texture.
- **Filters and run id.** It now carries the active filters and the run id, so a cropped
  screenshot of a filtered map cannot pass as the whole picture and can be traced to its
  build:

`{METRIC_LABEL} · {y ?? '2000–' + asOfYear}{money ? ' · FY ' + fy : ''} · {h} of 36: none recorded (hatched) · {p}: live, no comparable figure (stippled) · {z}: searched, none live (flat) · central schemes not painted (band below) · {party ? 'party filter on: every painted scheme is ' + parties + "'s; the map is one side · the control below measures every party" : 'party not encoded'}{anyFilter ? ' · filters: ' + activeFilterString : ''}{y ? ' · ballots: every assembly election in ' + y + '; lid = timing, not cause; elections entered this file largely because a scheme preceded them' : ''} · as of {asOfLabel} · run {WELFARE_META.runId}`

- `activeFilterString` is the same string as the active-filter line under the strip
  (`party=INC · cat=women-cash · q=…`), read from the URL.
- The TimeLanes accessible description ends with the same `· run {runId}`.

**Legend** (IndiaMap's own, extended in §6.1):

1. each bin as `{lo}–{hi} ({count} in {y|all years})`, and `(empty)` for a bin with no
   state;
2. then the zero swatch and count, or `(empty: {reason})`;
3. then the stipple swatch, count and reason breakdown;
4. then `no value ({k} of 36), not zero`, with reason counts;
5. then the ballot key: `■ incumbent kept power · □ lost · ◩ coalition / unclassified ·
   lid = the incumbent's party launched or raised a state scheme there within 12 months
   before`.

With `y` absent, the ballot key reads `choose a year to see its elections`.

### 5.5 The clock: `TimeLanes` (new, §6.2)

`TimeLanes` sits in the map column, directly under the legend. The x-axis runs from
2000-01-01 to asOf, and the last column is labelled `2026 (to {dd Mon})`. There is one
x-scale for every row.

Rows, top to bottom:

1. **Scrubber row** (44px):
   - an `All years` button;
   - a `‹ {y−1}` step button;
   - a mono year readout in `text-2xl`, which also names the money year when a money
     metric is on (`2023 · money: FY 2023-24`);
   - a `{y+1} ›` step button;
   - a native `<input type="range" min=2000 max=2026>`, laid over the axis with padding
     equal to the chart's, so that the thumb and the year column line up.

   With `y` null, the thumb sits at `max` dimmed, and the readout says `All years`.
   **No autoplay.**

   **[UX review] (U20)** A native range cannot hold null, so without the following it
   would announce `2026` while the readout says `All years`:
   - the range has `aria-label="Year"`;
   - its `aria-valuetext` is `All years, 2000 to {asOfYear}` when `y` is null, and
     `{y}{money ? ', money: FY ' + fy : ''}` otherwise;
   - the mono readout is the range's `aria-describedby`;
   - the step buttons carry `aria-label="Previous year, {y−1}"` and `"Next year, {y+1}"`;
   - at the range ends they are `aria-disabled` (not `disabled`), with the reason in the
     name;
   - the mobile pinned copy (§10) shares this contract and is `aria-hidden` while this
     scrubber is in view, so two controls named Year are never exposed at once.
2. **Coverage ribbon** (12px), for `share`, `perhead`, `budgeted` and `actual`. There is
   one cell per year:
   - solid ramp-floor fill: every live state scheme has the figure;
   - stipple: some do;
   - hatch: none do;
   - blank with a hairline border: no live state schemes.

   The right-hand mono label reads `figures for {k} of {n} scheme-years · {full} of 27
   years complete`. For `live`, the ribbon is replaced by `{j} schemes have no launch
   date and are not placed on the clock` (omitted when 0).
3. **All-states row** (56px):
   - launches recorded per calendar year as thin bars above the baseline;
   - assembly elections per year as small ballot squares stacked below it;
   - each half has its own integer scale, with its max printed at the left (`max {a}
     launches`, `max {b} elections`);
   - a year with 0 in both halves prints `0` under its column;
   - clicking a column sets `y`.
4. **Hover-preview row** (22px, always reserved). While a state is hovered on the map, it
   shows that state's launch ticks and ballots on one line, labelled with the state.
   Otherwise it reads `hover a state to preview its clock`, muted. It is not rendered on
   touch devices.
5. **Central band**:
   - The header reads `Central · applies to all states · not painted on the map · {k} schemes`.
   - One lane per central scheme in view, sorted by `launched.date`, then `id`. A scheme
     launched before 2000 starts at the left edge with a `◂ {year}` label.
   - Lok Sabha elections (`st === null`) are vertical rules across the band only. Their
     caps are outcome-classified, and their lids come from the same exposure rule,
     applied to central schemes against the Union incumbent recorded on the election.
   - `lvl=state` collapses the band to its header plus `hidden by Level: state · {k}
     central schemes`.
6. **Selected-state lanes** (when `st` is set):
   - The header reads `{State} · {k} schemes · {e} elections in the file`.
   - One lane per state scheme in view from that state.
   - Assembly election rules run through these lanes, with ballot caps and the 12-month
     analytic band before each election.
   - Without `st`, this area reads `click a state on the map to open its schemes here`.
7. **Glyph legend row**, in text: every glyph, the band, and the ribbon textures.

**Lane grammar** (identical in the central band and state lanes):

- **Lifecycle marks**:
  - a 1px line from `announced.date` to `launched.date`;
  - a 6px bar from `launched.date` to the first dated `discontinued`, or to asOf;
  - an undated discontinuation runs the bar to asOf, ending with a mono `end undated`;
  - with no launch date, there is no bar, only a `○` at the announcement date labelled
    `not launched`.
- **Status glyphs** are Unicode as SVG text, 10px, on the bar: `▲` raised · `▼` cut ·
  `◆` eligibility tightened · `‖` paused · `×` discontinued · `↻` renamed · `◇` promised,
  not enacted.
  - **[UX review] (U13)** The promised glyph was `□`, which is also the lost-ballot glyph
    on the same stage.
    - The ballot-key and lane-glyph character sets must be disjoint, with a dev assert.
    - The glyph legend row prints them as two labelled groups, `ballots` and `scheme
      events`.
    - Because `◆` and `◇` share a shape, the legend spells out both.
  - `live`, `announced` and `launched` statuses are not drawn.
  - Undated statuses are listed in the lane's `<title>` as `undated: …`.
  - A status with empty `srcs` is still drawn. Its `<title>` ends `· no source in file`,
    and it adds a derived gap.
- **Amount labels** (from question-first): on central lanes and on the selected lane
  only, a mono 9px label at `launched.date` and at each `benefit.changes[].date`, giving
  the amount and unit as recorded (`₹6,000/yr`).
- **Colour**: the bar fill is `--color-text-secondary` at 0.55 opacity. **The selected
  scheme (`s`) renders in `--color-accent`. Accent means selection and nothing else.**
- **Year cursor**: when `y` is set, a column band `rgba(201,168,108,0.08)` spans every
  row.
- **Interaction**:
  - The label column (120px, `sticky left-0`) shows the scheme name. Clicking it sets
    `s`.
  - **[UX review] (U20)** Every bar and glyph keeps its `<title>` `{name} · {event} ·
    {date}` for pointer users, and a click on it sets `s`. It is **not** focusable. The
    keyboard and screen-reader path is the label column's buttons (§6.2).

### 5.6 The margin

**[UX review] (U18) Focus and scroll.** Selecting a state or scheme rewrites the margin,
which can be far from the control that was used. Otherwise the reader cannot tell the
panel exists, so:
- **On open.** When `st` or `s` becomes set by a user action, focus moves to the
  panel's `<h2>` (`tabIndex=-1`). The live region (U21) announces `{State} opened: {k}
  state schemes, {e} elections in the file`, or `{scheme} opened`.
- **On close.** Focus returns to the element that opened the panel (the map SVG or the
  lane button). Escape inside the panel closes it.
- **Names.** The back link has `aria-label="Back to {State}"`. The close control is a
  `<button aria-label="Close {State | scheme}">`.
- **Scroll.** Below `xl`, a change of `st` scrolls the `StatePanel` into view, exactly
  as a change of `s` scrolls the `SchemeCard`: once, with `behavior: 'auto'` under
  reduced motion.
- **Pinned stack.** Both panels carry `scroll-margin-top` equal to the pinned-stack
  height (§10), so their headers never land under it.

**(a) At rest (no `st`, no `s`):**

1. **ReadingKey**. Five fixed lines at 13px:
   - "Fill is one metric for state schemes recorded in this file, in the chosen year."
   - "Hatch is none recorded. Stipple is live with no comparable figure. Flat is
     searched and none live. None of the three means zero."
   - "Ballots mark every assembly election that year, including those no scheme
     preceded."
   - "Central schemes run in the band under the map; they are not painted. The Union
     is measured in the control card below and in the band." [UX review] (U10)
   - "Colour never encodes party."
   - **[UX review] (U12)** A sixth line appears when any alleged item is in view: "Rose
     rule = the response of those concerned. It marks the denial's position, not its
     credibility."
2. **`ControlCard`** (§6.3). **[UX review] (U10)** The title is **"Every assembly
   election in the file, with and without a fresh state scheme"**. It used to say "Every
   election", but only assembly rows feed it. It covers all years, whatever `y` is, and
   **ignores `party`** (K4).
   - There are three lines, one per window, always shown together:
     `12 m · retained after a fresh scheme: {a} of {b} · without: {c} of {d} ·
     unclassified: {u}`, then the same for 6 m and 24 m.
   - **The n line.** Under the window lines: `n = {E} assembly elections recorded ·
     reference class not in file · no test is run at this n` [UX review] (U9).
   - **The points line [UX review] (U15).** `one election moves a row by up to
     {⌈100/min(b,d)⌉} points` is printed only when both b and d are ≥ 10. Otherwise it
     reads `one election changes a row by one count; too few to express in points`. A
     points figure is the volatility of a percentage that §7.2 rule 8 does not print.
   - **Selection and challengers [UX review] (U9).** Two mono lines, always rendered:
     `selection: elections are in this file because research reached them, not by
     census` · `challenger promises not recorded: the control measures incumbents only`.
   - **Union block [UX review] (U10).** At rest, below the assembly lines: `Union · {L}
     Lok Sabha elections in the file · 12 m: incumbent retained after a fresh central
     scheme {a} of {b} · without {c} of {d} · unclassified {u}`.
     - It uses the same exposure rule against the Union incumbent recorded on the
       election, as the central band already does (§5.5 row 5).
     - It has its own `which elections` `<details>`.
     - The n line becomes `n = {E} assembly + {L} Lok Sabha`.
     - With no Lok Sabha election in the file, it reads `Union: no Lok Sabha election
       recorded, so the Union is not measured here`.
   - **Foot line [UX review] (U9).** In mono: `computed here from {E} elections in this
     file · rule: fresh = launch or raise by the incumbent's party within 12 whole months
     · run {runId} · association, not effect`. Beside it is a `copy citation` control
     (U1) that copies that line, the three window lines and `location.href`. Nothing new
     is computed; the line names what already is.
   - Each `a of b` is followed by a `<details>` (`which elections`) listing the rows.
   - When `party` is set, one more line reads `{party} as incumbent · 12 m: {a'} of {b'}
     with · {c'} of {d'} without`, with an accent left border.
   - When `y` is set, a second block lists that year's elections: ballot, state,
     `incumbent → winner`, `fresh within 12 m: yes/no`. Each links to `?st=`.
     **[UX review] (U8)** Each carries `Cite` from the election's `srcs`, and so does
     every row in the `which elections` lists (`no source in file` when empty).
   - A foot link goes to `#control`.
3. **What the record does not contain**. Every `WELFARE_VOIDS` entry at 14px: `what` in
   `text-text`, `whyItMatters` beneath, then `Cite`. Nothing is truncated. With none:
   `No voids recorded in this file.`

**(b) `st` set: `StatePanel`** (§6.4):

- The header has the state name, a `Link` to `/states/{st}`, and a close control that
  clears `st`.
- **[UX review] (U4) Readout block, first.** The map readout for `st` under the current
  `y` and `m`: exactly the four lines of §5.4, on every viewport. On narrow screens this
  block is the first thing under the map, before the legend, so a tap and its
  explanation sit together.
- **[UX review] (U4) `{METRIC_LABEL} in FY {fy}`.** Shown when `m` is a money metric and
  `y` is set:
  - one row per live scheme: `scheme · figure as recorded (or not located) · Cite`;
  - then a final line: `sum {value} · computed here from {k} of {n} rows · not a figure
    any source states`.

  For `live`, the block lists the schemes counted, each linking to `?s=`. For `perhead`,
  it gives each scheme's recorded amount beside its annualised figure (U5).
- The line `{k} state schemes in the file · {j} live in {y}`.
- **Scheme rows** (all years), sorted by `launched.date`, then `id`. Each row reads
  name · party · launched · per-head as of `y` with unit · latest status ≤ `y`. Rows
  live in `y` carry a mono `live in {y}` tag. A row click sets `s`.
- **Elections in this state in the file**: ballot · date · incumbent → winner · fresh
  within 12 m yes/no · seat change, if a scheme's `electionContext` records it for that
  date. **[UX review] (U8)** Each row adds `Cite` from the election's `srcs` (`no source
  in file` when empty).
- **Ministers**: persons from these schemes' `announced` and `ministers[]`, with office
  and dates. Each links to `#ministers?q={label}` (sets `q`, scrolls).
- **Gaps touching this state**: `WELFARE_GAPS` entries whose text contains the state
  name or code, at body size.
- **With records, but empty under the filters**: "No scheme from {State} matches the
  current filters. This is a statement about this file."
- **No records**: "{State}: none recorded in this file. Hatched means unknown, not
  none." If coverage declares the state, the text reads instead: "{State} was searched
  for {years}; no scheme recorded."

**(c) `s` set: `SchemeCard`** (§6.5). These are stacked definition rows, sized for the
22rem column (full width below `xl`):

1. **Header**:
   - name;
   - aliases in mono, including non-Latin scripts;
   - state, or `Central · all states`;
   - party (text);
   - category;
   - `← {State}` back link if `st` is set;
   - close.
2. **Lifecycle**. Four stacked cells:
   - **Announced**: date · person · office · `Cite`.
   - **Approved**: date · body · `Cite`.
   - **Launched**: date · `Cite`.
   - **Election**: name · date · `{months} months after launch` · incumbent → result ·
     seat change · `Cite`. Months are **recomputed** as `monthsBetween(launched.date,
     electionContext.date)`. When that differs from the recorded `monthsFromLaunch` by
     more than 1, the cell prints both, `recorded {r} · computed {c}`, and adds a
     derived gap. The page does not choose between them.

   A missing stage reads `not located`, never a bare `—`.
3. **Who carried it**. One row per `ministers[]` entry: person label · role · action ·
   date · party.
   - `pol:` ids link to `/cabinet`.
   - An unresolved person shows the label plus `(identity not confirmed)` and no link.
   - `opposed` rows are shown.
4. **What it pays**. The base amount and unit, then every `benefit.changes[]` in date
   order: date · amount · note · `Cite`. Earlier amounts stay visible and are never
   struck through.
   - **[UX review] (U5)** Where the unit annualises, each amount row adds `· ₹{v} / yr
     ×12, computed here` after the recorded amount. The `Cite` stays with the recorded
     amount.
   - Each `promised-not-enacted` status is a row prefixed `promised:`, beside the amount
     actually recorded. **[UX review] (U13)** It is set in mono text with no colour,
     exactly as the status ledger (§5.10a) sets it. It used to be amber, which
     contradicted §7.2 rule 5: a promise not enacted is a political status, not missing
     data.
5. **How many, how much**:
   - beneficiary snapshots: `as of · count · Cite`;
   - outlay per FY: budgeted · actual · % of state budget · % of GSDP · `Cite`;
   - nulls read `not located`;
   - with `y` set, the matching FY row is marked `← map year`;
   - caption C11.
6. **What happened to it**. `status[]` in date order: `{date} · {status} · {note}` +
   `Cite`. Undated entries come last, marked `undated`. Status labels are mono and not
   colour-coded.
7. **What evaluations found**. `results[]` filtered by `tier`.
   - **[UX review] (U7)** Each finding renders as `{date ?? 'date not located'} · {by ??
     'body not stated'} · TierChip · finding · Cite`.
     - Sorted by date (undated last), then by finding text, so a 2016 audit paragraph
       cannot be read as a 2024 court order.
     - `date` and `by` are new optional fields on `SchemeResult` (§14).
   - **Every `alleged` finding renders as a pair**: the allegation, then **Response**
     under a `border-l-2 border-rose/40` rule at the same size and weight. Responses come
     from `responsesFor(scheme.id)`.
     - **[UX review] (U12)** The pair is structural: one `<dl>` per alleged item,
       `<dt>Allegation</dt><dd>…</dd><dt>Response</dt><dd>…</dd>`, in that DOM order. The
       empty case is structured the same way.
     - Above the first pair, one line at body size: "Rose rule = the response of those
       concerned. It marks the denial's position, not its credibility."
   - **No response.** **[UX review] (U11)** No match reads **"No response linked to this
     item in the file. The file does not record whether one was sought."**
     - [Corrected] A finding or benefit row carries no id, so the file cannot link a
       response to it, and it may hold a reply filed against a differently-named claim
       about the same scheme. "No response located in this file" would then be false of
       the item, so the item's slot says only that none is linked. When the file holds
       responses about the scheme, the sentence continues "It holds {n} response(s) to
       alleged claims about this scheme, printed {where}, none linked to this item."
       "No response located in this file" remains the wording for a *claim* no contra
       names (§5.12 (b)), and for a benefit row that names such a claim by id.
     - It is amber, as a missing-data marker only.
     - It adds two derived gaps: the missing response, and `response sought: not
       recorded`.
     - It used to read "No response on record in this file", which a reader takes as
       "did not deny". The file has not earned that inference: evidence-tiering
       separates denied, asked and did not respond, and never asked.
   - An empty list reads: "No evaluation, audit, court finding or survey located for
     this scheme. Recorded as a gap."
8. **Who else benefits**. `whoElseBenefits[]` filtered by `tier`: who · how · `₹{amountCr}
   cr` or `not stated` · `TierChip` · `Cite`. Alleged rows follow the response rule in
   block 7. An empty list reads: "None recorded, which is not the same as none."
9. **Sources**. Every URL in `scheme.srcs`, in full, via `Cite`.

**[UX review] (U1) Copy citation.** In blocks 2, 4, 5 and 6, and in the Money twin, every
figure row carries a `copy citation` control (mono, 12px). It writes one line to the
clipboard:

`{scheme} · {label}: {value} {unit} · {FY or as-of} · {source label} · {url} · file as of {asOfLabel} · run {runId} · {location.href with s= set}`

- Nothing goes into the string that is not on the row. A `computed here` figure is
  copied with those words.
- Under each `Cite` in the card, the URL host is printed in mono (`cag.gov.in`), so the
  reader can see whether the source is primary without hovering. The full URL stays in
  the anchor.
- `asOfLabel` is replaced by the scheme's own record date once D2 lands.

An unknown `s` reads: "No scheme `{s}` in this file.", with a link that clears `s`. Below
`xl`, a change of `s` fires `scrollIntoView({ block: 'start' })` once, with `behavior:
'auto'` under reduced motion. [UX review] (U18) The card has `scroll-margin-top` equal to
the pinned stack (§5.6, §10).

### 5.7 Stage captions and twins

Captions C1–C7 (§8) sit directly under the stage, full width, capped at 72ch, at body size
(K16). Under them are three `<details>` on every viewport: `Map as a table`, `Clock as a
table`, `Every scheme in view` (§11). [UX review] (U2) The cross-reference said §10.

**[UX review] (U2)** This paragraph used to say that a screen-reader user "never needs
the toggle". That was wrong: a closed `<details>` is a toggle, and here it is the last
thing met in the stage. Therefore:
- **Skip link.** The first focusable element inside the stage is a skip link, `Skip to
  this stage as tables`, pointing at `#stage-tables`.
- **Target.** The twin block has `id="stage-tables"` and a visible `<h3>`.
- **Open by default.** Under `view=table`, or with the hash `#stage-tables`, the three
  `<details>` render `open`.
- **Summaries.** Each `<summary>` names its row count, filters and as-of, for example
  `Map as a table · 36 states · metric: {METRIC_LABEL} · year: {y or all years} ·
  filters: {… or none} · as of {asOfLabel}`.
- **DOM order.** Filter bar → skip link → map → margin → clock → captions → twins. The
  `xl` grid places the margin visually; CSS never reorders the DOM.

### 5.8 Section: "The control, long form" (`id="control"`)

`Section title="The control: every election, with and without a scheme" note="Party filter not applied: this section is the comparison · category and level filters apply"`

- **(a) Symmetry check.** `Callout label="Symmetry check" tone="note"` holds each
  `WELFARE_SYMMETRY` text verbatim, prefixed by its `domain` in mono.
- **(b) The 2×2.** One `TwoByTwo` (§6.3) at 12 months.
  - Rows: `Fresh scheme by the incumbent's party within 12 m` / `No fresh scheme`.
  - Columns: `Incumbent retained` / `Incumbent lost` / `Unclassified`. The third column
    is always shown.
  - Each cell is a `<details>` listing its elections, linking to `?st=&y=`.
  - The **sensitivity row** below, at the same type size: `6 m: retained {a} of {b} with
    · {c} of {d} without — 24 m: …`.
  - Then: `n = {E}. No significance test is run at this n.`
- **(c) Timing distribution.** Existing `Distribution`:

  ```ts
  <Distribution
    xLabel="Whole years from launch to the next assembly election in the same state (0 = fewer than 12 months)"
    series={[{ name: 'State schemes in this file', bins: timing.bins }]}   // keys '0'…'4'
    maxBin={4}
    caption={…C8…}
  />
  ```

  Beside the chart, mono text:
  - **[UX review] (U15)** first, `n = {b} state schemes binned, of {N} in view`;
  - `{k} schemes have no later election in the file · {j} have no launch date · {x} next election more than 60 months away. None of these are binned.`
  - `Uniform timing over a 60-month term would put {b/5, 1 dp} in each bin (analytic).`

  Its twin is `Bin | Observed | Uniform expectation (analytic)` (K7). [UX review] (U15)
  The twin has a header row `n = {b}` and an `Observed share of b` column, printed only
  when b ≥ 10 (K6). Months are
  recomputed from `launched.date` and the next `WELFARE_ELECTIONS` record for the same
  `st`. They are never read from `electionContext`.
- **(d) By-party table** (`DataTable`, alphabetical, ignores `party`, the filtered
  party's rows marked):

  `Party | State schemes with a launch date and a later election (b) | Launched within 12 m (a of b) | Uniform expectation (b/5, analytic) | Raised within 12 m of an election | Promised, not enacted | Cut · tightened · paused · discontinued | Findings D / R / A / An | Alleged findings answered (k of n) | As incumbent: retained / lost / unclassified`

  - An **All parties** row comes first.
  - A **Central (vs Lok Sabha)** group comes after the state rows.
  - Counts are `a of b`, with a percentage only when b ≥ 10 (K6).
  - Each count has a `<details>` listing its schemes or elections.
- **(e) Turnover table** (from question-first). It covers every state scheme that was
  live on the date of an assembly election in its state won by a party other than
  `canon(scheme.party)`:

  `State | Scheme (launched by) | Government changed (date · from → to) | Within 24 months: status entries (date · status · note) | Source`

  - With no entries in the window, the cell reads `no change recorded in 24 months, which
    is not the same as continued`.
  - Rows are sorted by election date, then scheme id.
  - Coalition winners (unclassified) are included and labelled `unclassified`.
  - **[UX review] (U15) Denominator.** A `note` above the table: `{k} state schemes were
    live at {e} changes of government in the file · {j} of {k} have a dated status entry
    within 24 months · {u} at unclassified (coalition) outcomes`.
  - **[UX review] (U15) Mirror.** Directly under the table, derived from the same
    `statusRows`: `After elections the scheme's own party won: {k} of {n} live schemes had
    a cut, tightening, pause or discontinuation within 24 months · after a rival won:
    {k'} of {n'}`.
    - Both are `a of b`, with a percentage only when b ≥ 10.
    - Each has a `which schemes` `<details>`.
    - Without the mirror, the table read cold is a one-sided ledger of what rivals did.
    - The table's heading becomes "What happened to schemes after the government
      changed, and after it did not".
- **(f) Recorded base rates** (`DataTable` over `WELFARE_BASE_RATES`):

  `Property | Numerator | Denominator | Rate | Reference class | Research file | Source`

  - A denominator of null or 0 prints `not computed`, never `0%` or `NaN`.
  - **[UX review] (U15)** K6 applies here too:
    - `Rate` always prints `{num} of {den}`;
    - the percentage is added only when `den ≥ 10`;
    - below that, the cell reads `rate not printed (den < 10)`.
  - When a fleet row and a page-derived figure name the same property and disagree,
    both are shown, and one line under the table lists the disagreement. No
    reconciliation.
- **(g) Caption C8** and the **confounders list** at body size:
  1. anti-incumbency;
  2. **challenger promises**: the opposition often promised transfers too, and the
     contract does not record them;
  3. alliances, national waves, delimitation (2008) and candidate choice;
  4. selection: elections entered the file largely because a scheme preceded them;
  5. the budget cycle: February–March budgets land 12–15 months before many polls;
  6. exposure is yes or no, not a dose.

### 5.9 Section: "Ministers and parties" (`id="ministers"`)

- **Completeness line** (mono): `named announcer {a} · dated approval {b} · dated launch
  {c} · all three {d}, of {N} schemes in view`.
- **`DataTable`**, one row per **(person, party as recorded)** across
  `announced.byPersonId` and `ministers[]` of schemes in view. A person recorded under
  two parties gets two rows. The page never infers a party switch.
  - Columns: `Person | Office (identity.office, with dates) | Party (as recorded) |
    Announced | Approved | Presented budget | Administers | Opposed`.
  - Each action cell lists `{scheme} · {date}`, with the scheme linking to `?s=`. It is
    not a count.
  - **Sort by the date of the person's earliest action, then by label. Never by a
    count.**
  - With `y` set, actions dated in `y` carry a mono `{y}` tag.
  - `pol:` ids link to `/cabinet`. Unresolved persons get `(identity not confirmed)`.
- `note`: `{P} persons · {j} with identity not confirmed · all years`.
- **Twin** (`<details>`): one row per (person or body, scheme, action), including one
  synthetic row per `approved.body`:

  `Date | Person or body | Office at the time | Party | Scheme | State | Action | Source`

  Sorted by date, then scheme id, then person id. Undated rows come last, as `date not
  located`.
- Caption C9.

### 5.10 Section: "After the launch: changes, cuts, promises" (`id="after"`)

Denominator line: `{changes} dated changes across {k} of {N} schemes · {u} undated ·
{p} promised, not enacted · {c} cut, tightened, paused or discontinued`.

- **(a) Status ledger** (`DataTable`): `Date | Scheme | State | Party | Status | Note |
  Source`.
  - It covers every status except `live`, `announced` and `launched`, sorted by date,
    then scheme id.
  - Status labels are mono text with **no colour coding**.
- **(b) Promised versus paid** (`DataTable`), one row per `promised-not-enacted` status:

  `Scheme | Promise (note, verbatim) | Promised on | By (ministers[] entry on that date, if any) | Paid per head as of {asOf} | Source`

  **No gap is computed**, because the promised amount exists only as text. A derived gap
  proposes a structured `promisedAmount`.
- **(c) Scrutiny drives.** For each `eligibility-tightened` status, the beneficiary
  snapshots nearest before and after it are shown side by side, with dates and sources.
  The difference is computed **only when both come from the same source URL**. Otherwise
  the cell reads `different sources, not subtracted`.
- Caption C10.

### 5.11 Section: "Beyond the beneficiaries" (`id="benefits"`)

`DataTable` over the union of every scheme's `whoElseBenefits[]` and `WELFARE_BENEFITS`
rows whose `s` or `t` is a scheme node, de-duplicated by (scheme, who, how):

`Scheme | Who | How | ₹ cr (as stated) | Tier | Response | From (scheme record / claim id) | Source`

- Rows are sorted by scheme launch date, then `who`, and filtered by `tier`.
- **No totals, no per-entity sums, no bars.**
- Alleged rows get the response rule.
- A row naming a party as beneficiary renders only at its recorded tier, with its
  response slot.
- Note: `{n} rows · {k} with an amount · {a} alleged, {r} of them answered`.
- Caption C12.

### 5.12 Section: "What was found, and what was answered" (`id="findings"`)

Denominator line: `{R} findings across {k} of {N} schemes · D {d} · R {r} · A {a} · An
{an} · {aa} of {a} allegations answered · {nd} with no date located` [UX review] (U7). The tier toggles repeat above the list.

- **(a) Findings list**, grouped by scheme in launch-date order. **[UX review] (U7)**
  Each finding shows `{date ?? 'date not located'} · {by ?? 'body not stated'} · TierChip
  · finding · Cite`. Within a scheme, findings sort by date, then text.
  - Every `alleged` finding is a **two-column symmetric block**: the allegation on the
    left, the response on the right. Both columns have equal width, size and weight. The
    right column has a `border-rose/40` rule.
    - **[UX review] (U12)** The two columns are CSS over one `<dl>` per item:
      allegation, then its response, then the next item. Reading order therefore pairs
      them.
    - The rose-rule key line of §5.6c block 7 sits above the first pair.
  - No response → amber **[UX review] (U11)** "No response linked to this item in the
    file. The file does not record whether one was sought." (with the §5.6c block 7
    continuation when the file holds responses about the scheme), plus the two derived
    gaps of §5.6c block 7. [Corrected] from "No response located in this file", which
    is not true of an item that carries no id; see §5.6c block 7.
- **(b) Contested claims.** One `ContestedFact` (existing) per alleged claim in
  `WELFARE_CLAIMS` that has a matching `contra`.
  - `positions[0].who` is the alleging entity's label; `positions[1].who` is the
    responder's label. Both are named, never "critics".
  - `unresolved` holds `upgradeIf` / `killIf`.
  - Entries are sorted by `from` date, then id.
  - Alleged claims with no contra are listed under `No response located in this file
    ({k}) · whether one was sought is not recorded` [UX review] (U11), at the same type
    size.
- **(c)** Schemes with no finding, at body size: "No evaluation, audit, court finding or
  survey located: {names}".
- Caption C13.

### 5.13 Section: "Narratives, rated" (`id="narratives"`)

`NarrativeLadder` (§6.3) has six fixed rungs: established · well-supported · contested ·
speculative · unsupported · debunked.

- **Every rung is drawn**, labelled `{status} ({n})`, with `none in this file` at 0.
- Each narrative shows:
  - the claim in `text-text`;
  - two equal columns, *Strongest case* and *Strongest counter* (the `ContestedFact`
    grid);
  - *What would change this*, full width;
  - `Cite`.
- Rung labels are all one colour.
- Within a rung, entries sort by claim text.
- The words *freebie* and *revdi* appear only inside attributed narratives.
- Caption C14.

### 5.14 Section: "The claims as a graph" (`id="graph"`)

`GraphExplorer` (existing), `React.lazy`:

```ts
<GraphExplorer
  nodes={[...WELFARE_ENTITIES, ...WELFARE_SCHEME_NODES]}
  edges={WELFARE_CLAIMS}
  defaultQuery={selectedScheme?.name ?? ''}
  height={narrow ? 480 : 620}
/>
```

- `Suspense` fallback: a fixed-height `bg-bg-elevated` block with `loading graph…` in
  mono. No spinner.
- With `WELFARE_CLAIMS.length === 0`, the graph is not mounted. The section reads "No
  claims recorded in this file."
- Twin (`<details>`): `Source | Predicate | Target | Tier | ₹ cr | From–to | Response |
  Sources`.
- Caption C15.

### 5.15 Section: "What the record does not contain" (`id="missing"`)

1. **Voids**, repeated in full at body size.
2. **`GapsPanel`** (existing). `WELFARE_GAPS` is mapped to `{ what: text, why: 'recorded
   by the ' + domain + ' sweep' }`, plus `derivedGaps()`:
   - alleged findings or channels with no response;
   - schemes with no launch date;
   - recorded vs computed months differing by more than 1;
   - status or benefit entries with empty `srcs`;
   - unit strings that cannot be annualised (listed);
   - party strings `canon()` did not map (listed);
   - symmetry-list states with no record (`mp mh or as ct dl hr br ka hp tg wb tn ap jh
     pb`);
   - years 2000–2026 with no live state scheme recorded anywhere;
   - `coverage` absent;
   - challenger promises not in the contract;
   - promise amounts stored only as text;
   - the reference class: assembly elections 2000–2026 not in `WELFARE_ELECTIONS`;
   - **[UX review] (U7)** findings with no date, and findings with no body;
   - **[UX review] (U11)** alleged items for which the file does not record whether a
     response was sought.

   `note`: "Absence is a result here. Each line bounds what the page above can say."
3. **Killed in audit**. `WELFARE_META.killed`, in the PM CARES "What the control killed"
   form (`border-l-2 border-rose/40`, id, claim label, `killed by: {reason}`). Empty:
   `No claim was killed in audit, or the audit has not run ({WELFARE_META.audit ? 'ran' :
   'not run'}).`

### 5.16 Sources and foot

- `SourceLedger` (existing) receives the union of every `srcs` across schemes, claims,
  elections, base rates, narratives and voids, plus `WELFARE_META.files`' sources where
  present.
  - De-duplicated by URL and sorted by label.
  - `primary` = `/\.gov\.in|\.nic\.in|eci\.gov\.in|rbi\.org\.in|cag\.gov\.in|indiabudget\.gov\.in|sansad\.in/i`.
  - `establishes: 'See per-row citations above.'`; `retrieved` = the file's `asOf`.
  - Never truncated.
- `TierLegend`.
- `Footnote`: "This page records public schemes, public offices and published claims.
  It asserts no motive and no offence. Allegations are attributed and paired with the
  response of those they concern. Persons appear only in public roles. Beneficiaries
  appear only as classes." + `run {WELFARE_META.runId}`.

---

## 6. Components

### 6.1 MODIFIED `IndiaMap` (`src/components/viz/IndiaMap.tsx`)

All additions are optional props. With them absent, behaviour is unchanged for `/map`,
`/resources` and `/states`.

```ts
export interface MapDatum {
  value: number | null;
  label?: string;
  detail?: string;
  /** NEW. 'zero' = searched, none (flat #15171c). 'stipple' = live, no comparable figure. Absent + null = hatch. */
  fillClass?: 'zero' | 'stipple';
  /** NEW. Why there is no value; shown in the readout and counted in the legend. */
  reason?: string;
}

interface Props {
  // …existing…
  /** NEW. Fixed class breaks. Class index = number of cuts ≤ v. ramp.length === cuts.length + 1 (dev assert). Bypasses scaleMode. */
  bins?: { cuts: number[]; ramp: string[]; format?: (v: number) => string };
  /** NEW. Legend labels. `empty` renders the swatch with "(empty: {text})". */
  classes?: { zero?: { label: string; empty?: string }; stipple?: string };
  /** NEW. Ballot glyphs, drawn after labels. */
  ballots?: MapBallot[];
  /** NEW. Hover enter/leave; the existing readout is unchanged. */
  onHover?: (s: StateCode | null) => void;
}

export interface MapBallot {
  state: StateCode;
  outcome: 'retained' | 'lost' | 'unclassified';
  lid: boolean;
  muted?: boolean;
  title: string;
}
```

- **Fills**:
  - `zero` is a flat `#15171c`.
  - `stipple` is a new `<pattern>`: a `#101116` ground with 1.1-radius dots every 5
    units in `rgba(232,228,220,0.32)`.
  - The hatch (lines), the stipple (dots), the flat zero, the ramp floor `#2e373f` and
    the page `#0a0a0c` must be five visibly distinct fills **in a greyscale screenshot**.
  - **[UX review] (U16) Screen-pixel floors for patterns.**
    - At the `userSpaceOnUse` sizes above, the SVG scales by ~0.585 at 358px. Both
      patterns then rasterise to flat mid-grey and read as low values.
    - So pattern pitch and mark size are set in screen pixels, scaled from the rendered
      width: at 360px, the hatch pitch is ≥ 6px and the stipple dot radius ≥ 1.5px on
      screen.
    - A state under 12px across on screen is exempt from the distinctness check, but its
      class is still counted in the legend.
- **Ramp steps for `bins`**, taken from `DEFAULT_RAMP` (7 steps):
  - 3 classes use indices `[0,3,6]`;
  - 4 classes use `[0,2,4,6]`;
  - 5 classes use `[0,2,3,5,6]`.
- **Legend with `bins`**:
  - each class as `{lo}–{hi} ({count})`, with the last as `{lo}+`, and `(empty)` when
    the count is 0;
  - then the zero, stipple and hatch swatches with counts, and each one's reasons as
    `reason n · reason n`;
  - the hatch count excludes zero and stipple states.
- **Ballot geometry**:
  - a 7×7 square at `(cx, cy + 9)` for full-name labels, or `(cx, cy + 7)` for code
    labels; for leader-label states, 4 units before the gutter text;
  - stroke `var(--color-text)` 1.1, **solid (dash is tier)**, with a 2-unit dark halo
    (`paintOrder: stroke`);
  - `retained` is filled, `lost` hollow, `unclassified` fills the lower-left triangle;
  - `lid` is a 7×1.4 bar 2 units above the square;
  - `muted` switches the colour to `--color-text-muted`.
  - **[UX review] (U16) Screen-pixel floors for ballots.**
    - At 358px the viewBox geometry gives a ~4px square and a ~0.8px lid, so the outcome
      and the lid (reader question 2) are not legible on a phone.
    - Ballots are therefore drawn in a group whose scale is computed from the rendered
      width. From 360px up, the square is ≥ 9px on screen, the lid ≥ 2px tall and the
      stroke ≥ 1px.
    - Where the desktop geometry already exceeds these floors, it is unchanged.
- **Interaction**: every ballot has a `<title>`. Ballots are not separately focusable.
  The ballot's facts are in the state's readout.
  - **[UX review] (U4)** The existing keyboard ring alone does not announce them. The
    readout is a positioned `div` driven by `hover ?? selected`, and in a screen reader's
    browse mode arrow keys never reach the SVG. So:
    1. the visible readout follows `hover ?? focused ?? selected`;
    2. on each `focusIdx` change, the readout text is written to the page's single polite
       live region (U21): `{State}: {metric} {value, unit, FY} | {reason}; {detail};
       {election line if y}`;
    3. the SVG's `aria-label` is dynamic: `Map of India, {metricLabel}, {y or
       2000–asOfYear}, {n} of 36 states with a value; arrow keys move between states,
       Enter opens one; a table version follows`;
    4. `aria-describedby` points at the figcaption status line and the legend.
  - ~~The SVG keeps `role="img"`~~ **Superseded by WELFARE_A11Y S3 (2026-09-26):** an
    image role makes its descendants presentational, so a keyboard-driven chooser cannot be
    one. The SVG is `role="listbox"` with `aria-roledescription="map"`, each state path
    `role="option"`, and `aria-activedescendant` naming the focused state. Ballot `<title>`s
    are still not read twice; the live region and the year-slice twin (§11) carry them.
  - New optional prop: `onFocusState?: (s: StateCode | null) => void`.
- No fill transitions. The existing opacity and stroke-width transition stays.

### 6.2 NEW `TimeLanes` (`src/components/viz/TimeLanes.tsx`)

```ts
type LaneEventKind = 'raised' | 'cut' | 'tightened' | 'paused' | 'discontinued' | 'renamed' | 'promised';
interface LaneEvent { date: string; kind: LaneEventKind; label: string; sourced: boolean }
interface Lane {
  key: string; label: string;
  announced: string | null; launched: string | null; ended: string | null; endUndated: boolean;
  events: LaneEvent[]; undated: string[];
  amounts?: { date: string; text: string }[];      // drawn only for central lanes and the selected lane
}
interface LaneElection { date: string; label: string; outcome: 'retained' | 'lost' | 'unclassified'; lid: boolean; muted?: boolean }
interface CoverageCell { year: number; state: 'full' | 'partial' | 'none' | 'empty'; k: number; n: number }
export interface TimeLanesProps {
  range: [string, string];                 // ['2000-01-01', asOf ?? '2026-12-31']
  year: number | null; onYear: (y: number | null) => void;
  moneyYearLabel?: string | null;          // 'FY 2023-24'
  coverage?: CoverageCell[] | null;        // null for m=live
  unplaced?: number;                       // schemes with no launch date
  allStates: { year: number; launches: number; elections: LaneElection[] }[];
  preview?: { label: string; launches: string[]; elections: LaneElection[] } | null;
  central: { lanes: Lane[]; elections: LaneElection[]; hiddenCount?: number };
  state?: { label: string; lanes: Lane[]; elections: LaneElection[] } | null;
  windowMonths: 12;
  selectedLane?: string | null; onSelectLane: (id: string) => void;
}
```

- **Container and sizes**:
  - the container is `overflow-x-auto`, and the SVG has `min-width: 580px` (K10);
  - row heights: scrubber 44, ribbon 12, all-states 56, preview 22, lane 22.
- **Analytic band**: fill `rgba(232,228,220,0.04)`, 12 months before every election.
  Its left edge is stroked with `TIERS.analytic.dash` (`8 3 2 3`), because the window is
  the page's construct.
- **Accessibility [UX review] (U20).**
  - **What was wrong.** The spec made the drawing `role="img"` with focusable children.
    That is an ARIA conflict: descendants of an image role are presentational, so each
    tab stop announced nothing.
  - **The drawing.** It is now `aria-hidden="true"`. Its accessible description is a
    visually hidden summary of the counts in view, ending `· run {runId}` (U3).
  - **Keyboard and screen-reader path.** Interaction moves to the DOM. The sticky label
    column is a real `<ul>` of `<button>`s, one per lane, each named `{scheme} · {state
    or Central} · launched {date} · {k} status events`.
  - **Bars and glyphs** are not individually focusable. A pointer click on a bar still
    sets `s`.
  - **Glyph meanings** are carried as words in the lanes twin (§11.5): `raised`, `cut`,
    `eligibility tightened`, `paused`, `discontinued`, `renamed`, `promised, not
    enacted`.
- **Status mapping from `status[]`**:
  - `raised→raised`, `cut→cut`, `eligibility-tightened→tightened`, `paused→paused`,
    `discontinued→discontinued` (also sets `ended`), `renamed→renamed`,
    `promised-not-enacted→promised`;
  - `live`, `announced` and `launched` are not drawn.

### 6.3 NEW in `src/components/Domain.tsx` (cross-domain; energy can reuse)

```ts
export interface TwoByTwoCell { n: number; items: { label: string; href?: string }[] }
export function TwoByTwo(p: {
  title: string;                                           // 'Window: 12 months'
  rowLabels: [string, string];
  colLabels: [string, string];
  cells: [[TwoByTwoCell, TwoByTwoCell], [TwoByTwoCell, TwoByTwoCell]];
  unclassified: [TwoByTwoCell, TwoByTwoCell];              // third column, one per row, always rendered
  sensitivity?: ReactNode;                                 // same type size as the table
  caption?: ReactNode;
}): JSX.Element;
```

- `TwoByTwo` is a real `<table>`, so it is its own twin.
- Counts are mono and tabular.
- Each row ends with `retained / (retained + lost)` as `a of b`, with a percentage only
  when b ≥ 10.
- Each cell is a `<details>` listing its items.
- **No cell colouring.**

```ts
export interface ControlWindow {
  months: 6 | 12 | 24;
  exposed: { retained: number; decided: number; items: { label: string; href?: string }[] };
  notExposed: { retained: number; decided: number; items: { label: string; href?: string }[] };
  unclassified: number;
}
export function ControlCard(p: {
  windows: ControlWindow[];                 // always [6, 12, 24] in that order
  n: number;
  union?: ControlWindow | { empty: string } | null;   // [UX review] (U10) Lok Sabha elections vs central schemes, same exposure rule
  partyLine?: { party: string; exposed: [number, number]; notExposed: [number, number] } | null;
  yearList?: { ballot: MapBallot; label: string; href: string }[];
  empty?: string;                           // replaces everything when there are no elections
}): JSX.Element;
```

`ControlCard` is text plus inline ballot SVGs, with no bars. The comparison is carried by
two `a of b` fractions side by side.

```ts
export function NarrativeLadder(p: { rows: Narrative[] }): JSX.Element;   // Narrative from src/graph/fleet.ts
```

The ladder has six fixed rungs, each always rendered. It uses the `ContestedFact`
two-column grid for case and counter. A null field reads `not stated`.

### 6.4 NEW `StatePanel` (`src/components/welfare/StatePanel.tsx`)

```ts
interface StatePanelProps {
  st: StateCode; year: number | null;
  hasRecords: boolean; declaredYears: string | null;       // from coverage, e.g. '2018–2026'
  schemes: Scheme[];                                       // this state's, all years, filtered
  elections: ElectionRow[];
  ministers: { id: string; label: string; office: string | null; resolved: boolean }[];
  gaps: string[];
  readout: { lines: string[]; rows: { id: string; name: string; figure: string; srcs: Source[] }[]; computed: string | null };   // [UX review] (U4) the map readout for st, and its per-scheme breakdown
  onScheme: (id: string) => void; onPerson: (label: string) => void; onClose: () => void;
}
```

### 6.5 NEW `SchemeCard` (`src/components/welfare/SchemeCard.tsx`)

```ts
interface SchemeCardProps {
  scheme: Scheme; year: number | null; tiers: Set<Tier>;
  personOf: (id: string) => { label: string; resolved: boolean; office: string | null; href?: string };
  responsesFor: (schemeId: string) => GEdge[];
  nextElection: Election | null;
  onClose: () => void; backTo?: { label: string; onClick: () => void };
}
```

Both components use `TierChip`, `Cite` and `DataTable` only, with no bespoke heading
styles. A `TurnoverTable` is not a component. It is a `DataTable` in the page, fed by
`turnovers()`.

### 6.6 NEW derivations (`src/data/welfareView.ts`)

```ts
export type Metric = 'live' | 'share' | 'perhead' | 'budgeted' | 'actual';
export interface WelfareFilters {
  y: number | null; m: Metric; cat: Set<SchemeCategory> | null; party: Set<string> | null;
  lvl: 'all' | 'state' | 'central'; st: StateCode | null; s: string | null;
  tier: Set<Tier>; view: 'map' | 'table'; q: string; ignored: string[];
}
export interface ElectionRow {
  e: Election; key: string; outcome: 'retained' | 'lost' | 'unclassified';
  exposedBy: Record<6 | 12 | 24, Scheme[]>;   // empty array = not exposed; .length is the only count
  muted: boolean;
}

export function parseFilters(p: URLSearchParams): WelfareFilters;
export function inView(f: WelfareFilters, opts?: { ignoreParty?: boolean }): Scheme[];
export function canon(party: string | null): string | null;
export function amountInForce(s: Scheme, y: number): { amount: number | null; undatedChanges: number };
export function annualPerHead(amount: number | null, unit: string | null): { value: number | null; reason?: string };
export function isDeclared(st: StateCode, y: number | null, cat: Set<SchemeCategory> | null): boolean;
export function stateYear(f: WelfareFilters): { data: Partial<Record<StateCode, MapDatum>>; ballots: MapBallot[]; counts: { hatch: number; stipple: number; zero: number } };
export const BINS: Record<Metric, { cuts: number[]; ramp: string[] } | { disabled: string }>;
export function electionRows(f: WelfareFilters): ElectionRow[];          // ignores party for exposure; sets muted
export function controlWindows(f: WelfareFilters): ControlWindow[];
export function timing(f: WelfareFilters): { bins: Record<string, number>; noLater: Scheme[]; noLaunch: Scheme[]; beyond60: Scheme[] };
export function partyRows(f: WelfareFilters): PartyRow[];                // ignores party
export function turnovers(f: WelfareFilters): TurnoverRow[];             // ignores party
export function ministersRows(f: WelfareFilters): MinisterRow[];
export function statusRows(f: WelfareFilters): StatusRow[];
export function promisedRows(f: WelfareFilters): PromisedRow[];
export function scrutinyRows(f: WelfareFilters): ScrutinyRow[];
export function benefitRows(f: WelfareFilters): BenefitLedgerRow[];
export function responsesFor(id: string): GEdge[];
export function coverageByYear(m: Metric, f: WelfareFilters): CoverageCell[] | null;
export function lanes(f: WelfareFilters): { central: Lane[]; byState: Map<StateCode, Lane[]>; allStates: TimeLanesProps['allStates'] };
export function stripFacts(f: WelfareFilters): DenominatorFact[];
export function derivedGaps(): Gap[];
```

**`canon`**:
- It is a table in code mapping recorded strings to canonical labels, for example
  `Bharatiya Janata Party→BJP`, `Indian National Congress|Congress|INC→INC`, `All India
  Trinamool Congress|TMC→AITC`, `Dravida Munnetra Kazhagam→DMK`.
- Each mapping carries a source comment.
- Unmapped strings pass through trimmed and are listed as a derived gap.
- It is a resolution surface. Never fuzzy-match.

**`amountInForce(s, y)`**:
- Start from the base amount (in force from `launched.date`).
- Take the latest dated `benefit.changes[]` with a non-null amount at or before
  `min(y-12-31, discontinued date)`.
- Undated changes are not placed. Their count is reported.

**`annualPerHead`** is a whitelist:
- `/per\s*month|\/\s*month|monthly/i` → ×12;
- `/per\s*(year|annum)|\/\s*year|annual|yearly/i` → ×1;
- everything else (per acre, per season, one-time, per instalment, kg, goods) → null,
  with reason `unit not comparable: {unit}`.

Changing the whitelist is a design decision, not a bug fix.

**`BINS`**:
- Computed at module scope from every state-year value of the metric, 2000 to asOf,
  **with no filters**.
- Quantile cuts are rounded to 2 significant figures and de-duplicated: 5 classes when
  pooled n ≥ 20, 3 when n ≥ 6. Below 6, `{ disabled: 'too few figures to bin (n = {n})' }`.
- `live` uses fixed cuts `[2,3,4]`, giving the classes `1 · 2 · 3 · 4+`.

**`timing`**:
- bin key = `Math.floor(monthsBetween(launched, nextElection) / 12)` for months 0–59;
- next election = the earliest `WELFARE_ELECTIONS` record for the same `st`, assembly,
  dated after launch.

**`turnovers`**:
- A scheme is live on `e.date` when it was launched on or before that date and not
  discontinued before it.
- `canon(e.winner) !== canon(s.party)`, or the outcome is unclassified.
- The window is `0 ≤ monthsBetween(e.date, status.date) ≤ 24`.

**Everything**:
- Explicit tiebreaks (`date → id`), through `byText` from `welfare.ts`.
- No `Math.random`, no clock reads, no `localeCompare`.

---

## 7. Visual encodings and filters

### 7.1 Channels

| where | channel | means | never means |
|---|---|---|---|
| map | fill, `DEFAULT_RAMP` steps, fixed bins | value of `m` for state schemes in this file in `y` | party, category, generosity, any computed score |
| map | hatch (warm diagonal lines) | no value: none recorded in this file | zero |
| map | stipple (neutral dots) | live scheme(s), no comparable figure: partial, not located, unit not comparable | zero, low |
| map | flat `#15171c` | declared searched, none live | unknown |
| map | ballot square, filled / hollow / half | assembly election in `y`: incumbent retained / lost / unclassified | margin, vote share, a score |
| map | ballot lid | incumbent's party launched or raised a state scheme there fewer than 12 whole months before | cause |
| map | ballot muted | incumbent outside the `party` filter; still counted | absent |
| map | accent outline | selected state | — |
| lanes | x | date, one scale for every row | — |
| lanes | line → bar | announced → live period | amount |
| lanes | text glyph | status event type | tier |
| lanes | mono amount label | per-head amount as recorded at a change point | a trend |
| lanes | vertical rule + cap | election and its outcome class | — |
| lanes | band with `8 3 2 3` left edge | the 12-month analytic window (the page's construct) | a finding |
| lanes / map / tables | accent | selection (`st`, `s`), filtered party's rows | importance |
| ribbon | solid / stipple / hatch / blank | figure coverage per year for `m` | values |
| everywhere | `strokeDasharray` | evidence tier, and nothing else | style |
| everywhere | `--color-rose` | response / denial rule, killed claims | bad |
| everywhere | `--color-amber` | missing response, partial, filtered-count notice, `no source in file` [UX review] (U2) | suspicious |
| graph | hue / shape / size | family / type / `sz`, as elsewhere | party, category |
| text only | party | as recorded on the record | — |

### 7.2 Frozen (the developer may not adjust these to make it fit)

1. `strokeDasharray` means tier. No ballot, bar, outline or rule is dashed for any other
   reason. The only dash on the stage is the analytic band edge, which *is* analytic.
2. Hatch, stipple, flat zero, ramp floor and page are five distinct fills, verified by a
   greyscale screenshot. [UX review] (U16) The screenshot is taken at 360px and at
   1280px.
3. Bins are pooled unfiltered and fixed across years and filters. No per-year or
   per-filter re-binning.
4. One x-scale for the whole clock.
5. No party hue anywhere. No rose outside response, denial and killed rows. No colour
   for cut, raise, "pre-election" or "suspicious", [UX review] (U13) or
   `promised-not-enacted`.
6. Ballots are drawn for every assembly election in `y`. There is no control to hide
   them.
7. The control ignores `party`. The window is fixed at 12 months, and 6 and 24 are
   always printed beside it.
8. `a of b` is always printed. A percentage appears only when b ≥ 10.
9. Every alleged item has a response slot at equal size and weight, even when empty.
   [UX review] (U12) The pairing is structural (one `<dl>` per item, allegation then
   response in DOM order), not only visual.
10. The in-frame status line and captions C1–C7 are always rendered, at body size.
    [UX review] (U3) §5.4 now agrees. Below 640px, no mono text on the page is smaller
    than 12px.
11. Nulls read `not located` / `not stated` / `not computed`. Never `0`, never a bare
    `—`, never `NaN`. [UX review] (U2) An empty `srcs` on any surface renders as amber
    mono `no source in file`, never a blank cell. These are the same words as the lane
    `<title>`. The rule covers every Source column in §5.8–§5.14 and §11, and SchemeCard
    blocks 2–8.
12. The default view is unfiltered, with no selection and `y` absent.
13. **[UX review] (U5)** A page-computed number is labelled `computed here` or `analytic`
    on the surface where it appears, never only in a caption. This covers a sum, a ×12
    conversion, months between two dates and an `a/b` share. Such a number never carries
    a `Cite`; the recorded figures it was computed from do.

### 7.3 Filters and their denominator effect

| control | type | options | default | shown on the control |
|---|---|---|---|---|
| Search `q` [UX review] (U6) | `type=search`, **first** in the bar | — | empty | `{N} → {k}`; ≤ 8 matches listed as links to `?s=` |
| Metric `m` | segmented (select on mobile) | Schemes live · Share of state budget · Entitlement per beneficiary, per year [UX review] (U5) · Budgeted ₹ cr · Actual ₹ cr | live | coverage per option for current `y`; unavailable options are `aria-disabled` and carry their reason in the accessible name [UX review] (U21) |
| Category `cat` | chips, multi | the 12 contract categories | none | `(count in view)` per chip; zero-count shown disabled `(0)`; bar reads `{N} → {k} schemes` |
| Party `party` | multi-select, alphabetical canonical labels with counts | — | none | `{N} → {k}`, plus the one-side line (§5.3) |
| Level `lvl` | segmented | All · State · Central | All | `{N} → {k}` + "the map shows state schemes only" |
| Tier `tier` | four toggles with tier-dash swatches | documented · reported · alleged · analytic | all on | `{k} of {n} findings · {j} of {m} benefit rows` + "filters findings, not schemes" |
| Year `y` | scrubber (§5.5) | All, 2000…2026 | All | readout |
| Reset | button | — | — | clears all but `view` |
| Copy link | button | — | — | copies `location.href`; announces `Link copied` [UX review] (U21) |
| Copy as TSV · Download .tsv [UX review] (U1) | buttons above every twin and section table | — | — | `{rows} rows`; format in §11 item 7 |
| Map / Table | segmented | `view` | map | — |

---

## 8. Captions the page must carry (what the graphic cannot honestly show)

These render at 14px, `text-text-secondary`, with `border-l-2 border-border-light pl-3`,
capped at 72ch, directly under the graphic they qualify. None goes in the footer.

- **C1 (map, always):** "Colour is {metric} for state schemes recorded in this file, not
  every scheme in India. Central schemes apply to every state and run in the band under
  the map. Painting them would shift every state by the same amount. Colour never
  encodes party."
- **C2 (map, `m=live`):** [UX review] (U14) "With no year chosen, the count is
  cumulative and includes schemes since discontinued. A count measures the research sweep as much as the state. A
  state with more schemes here may have been researched more closely. Records before
  2014 are thinner than recent ones. {If !hasCoverage:} No research file declares which
  state-years it searched completely, so the map cannot show any state as having had no
  scheme. It can only show that none is recorded."
- **C3 (money metrics):** "Financial year {fy}, nominal rupees, not adjusted for
  inflation, so do not compare shades across decades. Budgeted and actual are never
  combined. Where only some live schemes have a figure, the state is stippled, because a
  partial sum is a lower bound. Share of state budget is as each source states it, and
  sources differ on the base (total or revenue expenditure)."
- **C4 (`m=perhead`):** [UX review] (U5) "This is the amount one eligible beneficiary was
  entitled to per year, computed here from the recorded monthly or annual amount. It
  divides nothing by enrolment; enrolment snapshots are in the scheme card and are not a
  series. It is converted only from monthly or annual amounts. Per-acre, per-season, one-time and in-kind benefits are stippled,
  not converted. This is what one person was entitled to, not what reached them. Some
  schemes pay per person, others per household or per farmer family. Where a state runs
  two schemes in the category, the larger is shown and both are named, because adding
  them would count one person twice. Not per capita: the file has no population
  denominator."
- **C5 (ballots, `y` set):** "Every assembly election in the file is marked, not only
  those a scheme preceded. The file holds the elections the research needed, not every
  Indian election. The lid marks timing, not cause. Anti-incumbency, alliances,
  challenger promises, national swings, delimitation and candidates are not controlled.
  Coalition outcomes are not forced into kept or lost."
- **C6 (boundaries, always):** "Current boundaries. Before 2014, Telangana shows
  undivided Andhra Pradesh. Jammu & Kashmir is drawn including Ladakh. From 2020, Dadra &
  Nagar Haveli and Daman & Diu carry the merged UT's value. Chhattisgarh, Jharkhand and
  Uttarakhand, formed in November 2000, are drawn for all of 2000."
- **C7 (clock, always; partial range when `yearsCovered < 27`):** "Every election
  carries the same 12-month band, whether or not a scheme falls in it. There is an
  assembly election somewhere in India almost every year, so a launch in an election
  year is the base case, not a signal. Bars run from launch to a dated discontinuation,
  and an undated end is drawn to today and labelled. The file records a live scheme in
  {yearsCovered} of the 27 years, first in {firstYear}. Before that the map is hatched
  because nothing was recorded, not because nothing was paid."
- **C8 (control):** [UX review] (U15) "Association, not effect. n = {E}; no test is run.
  Timing bars are counts of {b} schemes; the uniform line is b/5. Elections entered
  this file largely because a recorded scheme preceded them, so the no-scheme row is thin
  by construction. The uniform expectation assumes full five-year terms, and early
  elections break it. By-party counts measure first how many of a party's schemes the
  research recorded. The same table is computed for every party, in the same columns."
- **C9 (ministers):** "A row records an action on the record, with the office and party
  recorded at that date. It is not a tally of credit and is not sorted by one. An
  announcement is a public statement and an approval is a cabinet or legislative act.
  Neither shows who designed the scheme or why."
- **C10 (after the launch):** "A cut can come from fiscal limits, a targeting correction,
  a court order or a political choice. The note records which, where a source says so. A
  scrutiny drive may remove ineligible or eligible names; the file records counts, not
  which. A renamed scheme may be continuity or rebranding, and the page does not decide
  which."
- **C11 (scheme card, money):** "Counts are dated snapshots from different sources, not
  a series, and are not interpolated. Enrolled is not paid. Budgeted is what was
  allocated; actual is what was spent, often published two years late."
- **C12 (beyond the beneficiaries):** "A row names a channel through which money or
  advantage moved, as a source records it. A bank earning correspondent commissions is
  how direct benefit transfer works. It is an allegation only where the tier says
  alleged. Amounts are not totalled, because channels differ in kind. A missing row
  means none was recorded, not that none existed."
- **C13 (findings):** "A finding covers the period and sample it studied. A survey
  showing recipients voted for the incumbent does not show they switched because of the
  scheme."
- **C14 (narratives):** "The rating is the research file's judgement of the evidence
  under the tier rules, not a verdict on anyone's intent. 'Cash buys votes' and 'cash is
  welfare' are rated the same way."
- **C15 (graph):** "Position carries no meaning. Line dash is evidence tier; hue is entity
  family. Persons appear only in public roles."

---

## 9. Empty, partial and no-data states

| situation | render |
|---|---|
| **Register not promoted** (`WELFARE_META.empty`, today's state) | Full chrome.<br>**[UX review] (U22)** The callout renders **above the Byline**, directly under the Standfirst, on every viewport. The Byline reads `register not yet promoted · nothing below is zero` in place of its six counts. Without this, a phone reader meets `0 schemes · 0 of 36` for two screens before the explanation.<br>**[UX review] (U22)** The skip link reads `Skip to tables (empty: register not yet promoted)`. The map's `aria-label` ends `0 of 36 states with a value; nothing recorded yet`. Each twin's `<summary>` reads `0 rows · register not yet promoted`. Smoke asserts the `aria-label` text in this state.<br>Strip reads `0 schemes`, `as of not yet promoted`.<br>`Callout label="Register not yet promoted" tone="note"`: "The distribution-funds research has not been promoted into this build. Nothing below is zero. It is unmeasured."<br>All 36 states hatched, reason `none recorded`.<br>The clock axis is drawn, with every row empty-labelled.<br>ControlCard `empty`: "No elections recorded, so the control cannot run."<br>Every section renders one body-size line: "Nothing recorded yet."<br>`GapsPanel` shows derived gaps.<br>**Smoke must pass.** |
| Partial years (the common case) | Axis always 2000 → asOf.<br>C7 partial-range sentence.<br>Coverage ribbon per year.<br>Scrubber columns with `0` printed.<br>No axis ever rescales to the years it has. |
| Partial money | Stipple plus a line above the map: "{k} states with live schemes have a figure for only some of them. They are stippled, with lower bounds in the readout." |
| Money metric, no figure for FY `fy(y)` | Live states stippled, others hatch or zero.<br>Line: "No {metric} figure located for FY {fy} in any state in view." |
| Metric option not honourable | Disabled, with the reason on the option.<br>A stale `m` in the URL falls back to `live`, with the ignored-param notice. |
| Filters → 0 schemes | Strip `filtered N → 0`.<br>States hatched (or zero where declared).<br>Line above the map: "No scheme in this file matches {filters}. This is a statement about the file, not about India." + Reset.<br>The control is unaffected by `party`. |
| `y` with no launches or elections | Normal render: an empty column, and the ballot key reads `no assembly election recorded in {y}`. |
| `st` with no records / empty under filters | §5.6b texts. |
| `s` unknown | §5.6c text. |
| `WELFARE_ELECTIONS` empty | No ballots.<br>ControlCard, TwoByTwo, Distribution and turnover are replaced by: "No elections recorded, so the control cannot run. This is the most important gap on the page." Plus a derived gap.<br>The clock draws launches only. |
| Alleged item, no response | [UX review] (U11) Amber "No response linked to this item in the file. The file does not record whether one was sought." + two derived gaps. [Corrected] from "No response located in this file"; see §5.6c block 7. |
| Base-rate denominator 0 or null | `not computed`. |
| b < 10 | `a of b`, no percentage. |
| Narratives / voids / claims empty | Ladder rungs still drawn with `none in this file`.<br>Voids: `No voids recorded in this file.`<br>Graph not mounted. |
| Loading | Only the lazy route chunk and the lazy graph (fixed-height fallback, no spinner). There is no data-loading state: the data is compiled in. |

---

## 10. Mobile and narrow widths

`useNarrow()` = `matchMedia('(max-width: 639px)')`, a local hook.

- **Header**: Kicker and PageTitle, the Standfirst, and the Byline plus the moved strip
  facts 4–6.
- **Strip**: facts 1–3 plus `as of`, sticky. The active-filter line wraps.
  **[UX review] (U18)** Below 640px:
  - the active-filter line is not sticky, because the status line carries the filters
    (U3);
  - the strip trims to facts 1–2 when it would wrap;
  - the **pinned stack** (the fixed 56px header, a one-line strip and the 44px scrubber)
    is ≤ 140px in total.
- **Filters**: the FilterBar collapses into `<details>` labelled `Filters ({active}) ·
  {N} → {k} schemes`. Inside it, Metric and Level become `<select>`s, and each disabled
  option's reason moves into its label text. Category chips scroll in their own
  `overflow-x-auto` row.
- **Scrubber**: a **scrubber row is pinned above the map**, with a full-width native
  range, `‹ ›`, `All` and a 44px touch height. It duplicates TimeLanes row 1, because the
  clock is below the fold on a phone.
- **Map**: `height=420`, full width. There is no hover. A tap sets `st`, and the
  `StatePanel` renders directly **below the map** (the margin is a normal block). The
  hover-preview row is not rendered. [UX review] (U4) The panel opens with the readout
  block, so the reason for a stipple, a partial sum and a boundary note can be reached
  without hover.
- **Ballots** [UX review] (U16): they obey the screen-pixel floors of §6.1 (square ≥ 9px,
  lid ≥ 2px, stroke ≥ 1px). This replaces "they keep their 7-unit size and scale with
  the SVG". The legend spells out the key in text. On narrow screens, the year's
  election list (the ControlCard `y` block, with `Cite`) is also rendered directly under
  the map figcaption.
- **Clock**: TimeLanes scrolls horizontally inside its own container, with a sticky 96px
  label column.
  **[UX review] (U17)** At 358px and scroll 0, only about 2000–2014 is visible. Those
  are the thinnest years (C2), and nothing said the rest was off-screen. On narrow
  screens:
  1. the container's initial `scrollLeft` puts asOf at the right edge;
  2. whenever `y` changes, the container re-scrolls so the `y` column is in view
     (`behavior: 'auto'`, so reduced motion is respected);
  3. above the container, outside the scroll, a mono line reads `showing
     {firstVisible}–{lastVisible}`, with real buttons `‹ earlier years` and `later years
     ›`, each scrolling one visible width;
  4. left and right edge fades mark clipped content;
  5. the viewport check at 360 asserts that the last axis column is inside the
     container's visible box on load.
- **Mono floor** [UX review] (U3): below 640px, no mono text is under 12px, which covers
  the active-filter line, the completeness line and the ribbon label. The 9px lane
  amount labels are omitted on narrow screens, because SchemeCard block 4 repeats them;
  the glyph legend row says so.
- **SchemeCard**: full width. `scrollIntoView` fires once on a change of `s`.
  [UX review] (U18) The same happens for the `StatePanel` on a change of `st`. Both use
  `scroll-margin-top` equal to the pinned stack.
- **TwoByTwo, graph and tables**: the TwoByTwo and sensitivity row stack. `GraphExplorer`
  is `height=480`. Every table scrolls in its own container.
  **[UX review] (U19)** Scrolling alone showed a phone reader two columns and a hard
  edge. On narrow screens:
  - every `DataTable` has a sticky first column, a mono line above it reading `{k}
    columns · scroll → for the rest`, and a right-edge fade;
  - the scroll wrapper is `role="region"`, with `aria-label` set to the table's caption
    line (§11 item 7);
  - the by-party and turnover tables instead render as one stacked block per row: the
    row label as a heading, then each column as `label: a of b` on its own line with its
    `<details>`. The numbers and their order are unchanged, All parties comes first, and
    this is where reader question 11 is answered;
  - the sensitivity row stacks under the TwoByTwo at the same type size.
- **No horizontal page scroll at 360px.** A viewport check at 360, 768, 1280×800 and
  1440 reuses the `scripts/graph-viewport.mjs` pattern. It asserts no page-level
  horizontal scroll, and the scrubber in the first viewport at 1280×800.
  **[UX review] (U16–U19, U3)** At 360 it also asserts:
  - the pinned stack is ≤ 140px;
  - the clock's last axis column is visible on load;
  - after `?st=mp`, the StatePanel header is below the pinned stack and within the
    viewport;
  - after `?s={fixture scheme id}`, the same holds for the SchemeCard header;
  - with `y` set, every ballot is ≥ 9px on screen;
  - on `/welfare?party=BJP&y=2023`, the status line's `filters:` clause is visible
    without opening the filters.

## 11. Table twin

`view=table` replaces the stage (map + clock + margin). The FilterBar stays. The same
tables also render under the stage in `<details>` on every viewport when `view=map`
(§5.7). All rows come from the same `welfareView` functions as the graphics.
[UX review] (U2) Under `view=table`, or with the hash `#stage-tables`, the `<details>`
render `open`.

1. **[UX review] (U2) The map's twins: a year slice first, then the full matrix.**
   - **(a) Year slice.** This is the primary twin and comes first in reading order. It
     has one row per state (all 36, alphabetical by name), with these columns:

     `State | {METRIC_LABEL} in {y or all years} | Class (value / none recorded / live, no comparable figure / searched, none live) | Reason | Detail | Sources | Assembly election in {y} | Schemes by party (text)`

     - `Detail` is the readout's detail string, so the partial-sum lower bound and the
       boundary notes travel with the row.
     - `Sources` holds the URLs from the contributing rows, or `no source in file`.
     - The election cell reads `date · incumbent {X}, winner {Y} · outcome class · fresh
       scheme within 12 months: yes/no · Cite`. It repeats the ballot's `<title>` text
       verbatim, so reader question 2 can be answered from the table alone.
   - **(b) State × year matrix** for the current metric, in a separately labelled
     `<details>`. It has one row per state and one column per year from 2000 to 2026.
     The header states the metric and the FY rule, and adds one line: "Per-cell figures
     are the sum of the Money table rows for the same state and FY; that table carries
     each row's source."
   - **Cells never hold a bare `—`.** The bare dash contradicted §7.2 rule 11. Cells
     read:
     - `none recorded`, shortened to `<abbr title="none recorded">n.r.</abbr>` only where
       width demands, with the abbreviation expanded in the header;
     - `0 (declared)`, only where declared;
     - the formatted value;
     - `partial {k} of {n}`, `not located` or `unit not comparable`.
   - **In the export** (item 7), each cell yields:
     - `value`: a number, or empty;
     - `status`: one of the closed enum `value | none-recorded | declared-zero | partial |
       not-located | unit-not-comparable | max-of-n` (`max-of-n` is for `perhead`, where
       the larger of several schemes is shown);
     - `reason` and `detail`.
   - The `y` column is outlined, and its header reads `{y} (map year)`.
2. **Schemes**, sorted by `launched.date` (nulls last), then id:

   `Scheme | State | Level | Party | Category | Announced (date · by) | Approved (date · body) | Launched | Benefit as of y (amount · unit) | Beneficiaries (count · as of) | Outlay latest FY (bud / act ₹ cr · % budget) | Next election (date · months computed · recorded · result) | Latest status | Findings D/R/A/An | Sources`

   The name links to `?s=`.
3. **Money**, one row per scheme × FY, sorted by FY, then launch date, then id:

   `Scheme | State | Party | FY | Entitlement per beneficiary as recorded (as of FY end) | Annualised, computed here | Beneficiaries (nearest snapshot not after FY end) | Budgeted ₹ cr | Actual ₹ cr | % state budget | % GSDP | Source`

   No column totals. [UX review] (U5) The recorded and annualised amounts are separate
   columns, and only the recorded one is sourced.
4. **Elections**, sorted by date, then state:

   `State | Election | Date | Incumbent | Winner | Outcome class | Fresh @6 / @12 / @24 m | Schemes counted as fresh (names) | Source` [UX review] (U8)
5. **Clock**. The scrubber twin is `Year | State schemes live | Central live | Launches |
   Assembly elections | States with a money figure`. The lanes twin is `Scheme | Event |
   Date | Note | Source`.
6. Tables already on the page, not repeated: TwoByTwo, by-party, turnover, ministers
   (+ per-action twin), status, promised, scrutiny, benefits, base rates.
7. **[UX review] (U1) Export and caption line.**
   - **Where.** Every twin above and every table in §5.8–§5.14 carries two controls
     above it: `Copy as TSV` and `Download .tsv`. The §5.8–§5.14 tables are the
     TwoByTwo, by-party, turnover, ministers and its per-action twin, status, promised,
     scrutiny, benefits, base rates and claims.
   - **Header row.** Snake_case machine keys, not display labels.
   - **Cells.** Display is split from value:
     - a numeric column holds a number or is empty;
     - a sibling `{col}_status` column holds the closed enum of item 1;
     - a `<details>` list inside a cell exports as a `|`-separated `{col}_items` column.
   - **Fixed trailing columns.** `as_of`, `run_id`, `filters` (the active-filter string,
     or `none`) and `source_urls` (every URL on the row, `|`-separated; `no source in
     file` when empty).
   - **Filename.** `welfare-{table}-{asOf}-{runId}.tsv`.
   - **Caption line.** It is the first line of the file, and is also shown on screen
     above every twin and section table: `{rows} rows · filters: {active-filter string or
     'none'} · {y or 'all years'} · as of {asOfLabel} · run {runId}`. On screen it uses
     the body-size C-caption style, not `DataTable`'s 11px caption prop.
   - **Announcement.** `Copy as TSV` announces `Table copied, {rows} rows` in the live
     region (U21).

## 12. Denominators shown

| where | denominator |
|---|---|
| strip | schemes in view of all · states with a recorded state scheme of 36 · years with a live scheme of 27 · assembly elections · outlay rows with an actual of all · allegations answered of all |
| filter bar | `{N} → {k}` beside every control; metric coverage `{k} of {n}` per option |
| map | status line counts of hatch / stipple / zero; legend bin counts, including empty bins; `no value ({k} of 36)` |
| clock | ribbon `figures for {k} of {n} scheme-years · {full} of 27 years complete`; unplaced schemes; row maxima |
| control | `a of b` for with/without, three windows; unclassified count; `n = {E}`; points moved by one election; uniform expectation |
| by-party | `a of b` per party; the All-parties row first |
| ministers | completeness line `{a}/{b}/{c}/{d} of {N}`; persons unresolved |
| after | changes across `{k} of {N}` schemes; undated count |
| benefits | rows · with an amount · alleged and answered |
| findings | findings across `{k} of {N}` schemes; per tier; answered of alleged |
| base rates | numerator / denominator / reference class, verbatim |

## 13. What the page refuses to show, and why

- **R1. Party as colour**, anywhere. A partisan palette is an editorial frame, and hue is
  frozen to node family.
- **R2. Any ranking or score** of a state, party, minister or scheme: no freebie index,
  no generosity rank, no "most schemes" sort. Tables sort by date or name.
- **R3. A scatter or fitted line of outlay against seats or vote share.** n is in the
  tens and confounded by everything in C5 and C8. The 2×2 with named cells is the
  ceiling.
- **R4. Per-capita values.** There is no population denominator in the contract.
  [UX review] (U5) Entitlement per beneficiary (as recorded, annualised) is a different,
  labelled quantity, and it divides nothing by enrolment.
- **R5. Summed per-head amounts across schemes.** They may reach the same person.
- **R6. Central values painted or added onto states, and arcs from the Union
  (`GeoNetwork`).** Both would draw a constant as a difference, or invent flows.
- **R7. "Ruling party in year y" as a layer.** Inferring it from winners fails in
  exactly the cases readers care about: defections, President's rule and coalition
  collapses.
- **R8. Interpolated beneficiary, outlay or benefit series; `TimeSeries` for benefit
  history; inflation-adjusted amounts.** Benefit is a step function, and there is no
  deflator in the contract.
- **R9. Totals** across schemes, years or channels, or of budgeted with actual. **Bars
  on nominal ₹.**
- **R10. Percentages when b < 10.**
- **R11. An analytic expectation drawn like observed data.** It is printed as text and a
  labelled column.
- **R12. Autoplay, animated scrubbing and fill transitions.** They add motion without
  information and hide the frames in between.
- **R13. A default year, state, party, scheme or category.**
- **R14. A variable window control.** It invites window-shopping.
- **R15. The party filter applied to the control.** That would delete the symmetry
  check.
- **R16. A network of who-else-benefits.** It is bipartite, and a network would show
  degree and hide value. The claims graph is a different object.
- **R17. A colour or badge meaning "pre-election", "suspicious", "cut" or
  "vote-buying".** The lid is a timing fact, with its denominator in the same frame and
  its caveat in the status line.
- **R18. Any private individual.** Beneficiaries are classes.
- **R19. An alleged item without its response slot.**
- **R20. Years before 2000 or after asOf.**

## 14. Build estimate

**Create**

| file | est. lines | contents |
|---|---|---|
| `src/data/welfareView.ts` | 560 | §6.6: filters, canon, liveness, metrics, bins, coverage, exposure, control, timing, party rows, turnovers, ministers, status/promised/scrutiny, benefits, lanes, strip facts, derived gaps |
| `src/components/viz/TimeLanes.tsx` | 380 | §6.2 |
| `src/components/welfare/SchemeCard.tsx` | 270 | §5.6c / §6.5 |
| `src/components/welfare/StatePanel.tsx` | 160 | §5.6b / §6.4 |

**Modify**

| file | change |
|---|---|
| `src/pages/Welfare.tsx` | Replace the scaffold with the page (~680 lines): URL state, FilterBar, stage grid, sections §5.8–5.16, twins |
| `src/components/viz/IndiaMap.tsx` | + `bins`, `MapDatum.fillClass` / `reason`, `classes`, stipple pattern, `ballots`, `onHover`, legend counts (~170 lines). Defaults unchanged. [UX review] (U4, U16) + `onFocusState`, a dynamic `aria-label`, and screen-pixel floors for ballots and patterns. |
| `src/components/Domain.tsx` | + `TwoByTwo`, `ControlCard`, `NarrativeLadder` (~230 lines) |
| `src/data/welfare.ts` | + `Coverage` type, re-export `WELFARE_COVERAGE` (~20 lines). [UX review] (U7) + optional `date?: string \| null` and `by?: string \| null` on `SchemeResult`. They are optional, so no research file is invalidated, and `validate.mjs` checks shape only. |
| `scripts/assemble-fleet.mjs` (+ `.test.mjs`) | Pass optional `coverage` through, emit `WELFARE_COVERAGE` (empty array when absent) (~25 + test) |
| `scripts/validate.mjs` | `coverage` shape. **Warnings, not failures**, while research is in flight: alleged `results[]` / `whoElseBenefits[]` without a matching contra; `ministers[].personId` unresolved; recorded vs computed months differing by more than 1. |
| `scripts/smoke.mjs` | Add `/welfare?y=2023&m=share&st=mp`, `/welfare?y=2019&m=perhead&cat=farmer-cash`, `/welfare?view=table`, `/welfare?s=does-not-exist`, `/welfare?party=BJP&y=2023`. `/welfare` is already listed. [UX review] Also add: `/welfare?q={fixture scheme name}` (U6); `/welfare?party=INC&y=2023&m=live`, asserting the `filters:` clause in the figcaption (U3). On `?view=table`, assert the export controls (U1) and that the skip link is the first focusable element in the stage (U2). In the empty state, assert the map `aria-label` text (U22). |
| `docs/research/FLEET_CONTRACT.md` (welfare section) | Document optional `coverage`; propose `promisedAmount` and `challengerPromises` for the next sweep. [UX review] Also propose optional `SchemeResult.date` and `SchemeResult.by` (U7); `responseSought: 'denied' \| 'no-reply' \| 'not-asked' \| null` on alleged results and claims (U11); and `electionsReference: { held, fromYear, toYear, asOf, srcs }`, sourced from ECI, so the strip can print `{n} of {held}` (U9). |
| `docs/INDEX.md` | Link this spec and the drafts |

`src/App.tsx` and `Layout.tsx` need no change, because the route and the nav entry
already exist.

Total ≈ 2,500 lines.

**Gates:** `npx tsc -b`, `npm run build`, `npm run validate` and `npm run smoke`, each
run **twice**: once against today's empty generated module, and once against the fleet
fixture (`scratchpad/fleet-fixture` pattern) with at least one scheme, election,
alleged result without contra, and stippled state. Then the viewport check (§10), and a
greyscale screenshot of the map legend and of one allegation/response pair to verify
§7.2. [UX review] (U16, U13) The greyscale screenshots are taken at 360px and at 1280px.
At 360 they include one retained, one lost, one unclassified and one lidded ballot, and
the lane glyph legend.

**Build order:**
1. `welfareView.ts` with unit checks against the fixture.
2. The `IndiaMap` props.
3. `Domain.tsx` additions.
4. `TimeLanes`.
5. `SchemeCard` and `StatePanel`.
6. The page.
7. Smoke and viewport.

## 15. Open risks for review

1. **Ballot lids can still be read as a verdict.** Mitigations: every election gets a
   ballot, the status line carries the selection caveat, and the ControlCard shows n at
   rest. If review still reads the lids causally, remove the lid from the map and keep
   it only in the ControlCard and the lanes. That is a one-prop change (`lid: false`).
2. **Until `coverage` lands, no state is ever flat zero.** Early years will look mostly
   hatched. That is the honest picture of the file, not a bug. Do not "fix" it by
   reinstating the appears-anywhere rule.
3. **Sparse money figures make the money and per-head maps mostly stipple.** `live` is
   the default. The ribbon says `k of 27`. Metrics with too few figures are disabled,
   with their n shown. Do not relax the partial rule.
4. **`canon()` is a hand-written resolution table.** Every unmapped string surfaces as a
   gap rather than passing silently.

---

## Deferred amendments ([UX review], SYNTHETIC)

These are the should- and could-level amendments from the five-persona **SYNTHETIC** UX
review (`docs/design/WELFARE_UX_REVIEW.md`). They are **not** applied. Each is a
hypothesis until a real reader confirms it. Seats: J journalist, P policy researcher,
S hostile reader, A screen-reader user, M phone reader. Where a seat's item was folded
into an applied must, the must is named instead and the item is not repeated here.

### Should

| id | section | amendment | from |
|---|---|---|---|
| D1 | §5.6c b5, §11.3, C3, contract `OutlayRow` | **Record budget stage and budget base.** Add optional `stage: 'BE' \| 'RE' \| 'actual' \| null` and `budgetBase: 'total' \| 'revenue' \| 'unstated'`, with the source's own wording in a note, passed through `assemble-fleet.mjs`. Render `budgeted {v} ({stage ?? 'stage not stated'}) · … · {pct}% (base: {budgetBase})`. Add `outlay rows with no stage` to `derivedGaps()`. Once present, stipple states whose live schemes mix bases (`mixed budget base`). **Interim:** block 5's header reads `budgeted = BE or RE as the source gave it; the file does not yet record which`, and the share legend reads `(bases differ by source)`. The two seats proposed different shapes; this merges P's enum with J's `stage`. | J, P |
| D2 | §5.6c header | **Per-scheme record date.** A mono line `record as of {file asOf} · file {id}`, taken from the `WELFARE_META.files[]` entry that holds the scheme; it also feeds U1's citation string. Fallback: `as of {asOfLabel} (page-level)`. | J |
| D3 | §5.16 | **Derive `SourceLedger.establishes` per URL** as the list of schemes, elections, base rates, narratives and voids that cite it. The current fixed string is `See per-row citations above.`. | J |
| D4 | §5.6c b2, contract `SchemeAnnounced` | **Announcement venue.** Add optional `venue: string \| null` (verbatim or absent, never paraphrased), rendered on a second line, or as `venue not stated`. | J |
| D5 | §6.3 TwoByTwo, §5.6a, §5.8d | **State what b excludes.** The row end reads `retained {a} of {b} classified · {u} unclassified not in b`, and §6.3 states that b never includes unclassified. | P |
| D6 | §11.4 Elections twin | **Make the 2×2 reproducible from the twin.** Add `incumbent_canon`, `winner_canon`, `unclassified_reason`, and per window the `event_date`, `event_kind` and `months_between` of the earliest qualifying event (P). Add `Counted in control: yes` and `Incumbent in party filter: yes \| no \| no filter` (A). Under the TwoByTwo: "Recompute this from the Elections table." | P, A |
| D7 | §5.6a ReadingKey | **ReadingKey at body size** (14px, `text-text-secondary`, left rule), placed under the map figcaption on narrow screens. With `party` set, line 5 reads "Colour never encodes party; with the party filter on, only {parties}' schemes are painted." | S, M |
| D8 | §5.1 PageTitle, Standfirst | **Editorial rewrite, for the desk to decide.** A symmetric title, for example "Cash schemes and elections, 2000–2026: welfare, votes, or both" (S). A standfirst that states both hypotheses in one unordered clause (S). Device-neutral copy ("Choose a year …, open a state …"), ending "Every graphic here has a table version." (A). | S, A |
| D9 | §5.6a, C5, §5.15, §5.8d | **Coalition exclusions made visible.** Print `{j} elections with a coalition incumbent are unclassified and cannot be exposed; {k} state schemes whose recorded party is an alliance string are never counted as fresh`. List both as derived gaps, with state names, and add an `Alliances (unclassified)` row group to the by-party table. | S |
| D10 | §5.6a, §5.1 Byline | **Party balance of the research, at rest.** A ControlCard line `schemes recorded by party: AITC {n} · BJP {n} · … · unmapped {n}`, with "a count measures the research sweep as much as the party" and a link to the symmetry check (S). Derive the byline's `{parties}` from the by-party table's rows, adding `({u} party strings unmapped)` (P). | S, P |
| D11 | §10, §5.3, §5.6b, §5.9 | **Filter state on phones, and link names.** Render the one-side line outside the collapsed Filters `<details>`, repeat it in the pinned scrubber's caption when `party` is set, and add a viewport assertion at 360 (S). Label minister links `filter the page to {label} ↓`, and give the ministers note `filtered by q={label} · reset` (M). Give cabinet and filter links distinct accessible names (A). | S, M, A |
| D12 | §5.6a, §6.3 ControlCard | **Assistive-technology details for the ControlCard.** Inline ballot SVGs are `aria-hidden`, with the outcome always also in words. Each `which elections` summary is unique. Write pairs as `incumbent {X}, winner {Y}`. The card has an `<h3>`. | A |
| D13 | Editorial `DataTable` (platform), §5.8d, §11 | **Headers and markers.** `scope="col"` on `<th>`, a one-line change in `Editorial.tsx` that helps every page. Colour- and outline-only markers get a text form and `aria-current` (`(filtered party)`, `(selected state)`, `(selected)`). | A |
| D14 | §5.6c | **SchemeCard markup contract.** `<section aria-labelledby>` with `<h2>`, an `<h3>` per block and `<dl>` rows. Aliases in non-Latin scripts carry `lang`. | A |
| D15 | §5.8d, §11.2–11.4, C5 | **Abbreviations.** Spell out `12 m`, `D/R/A/An`, `bud/act`, `unit n/c`, or wrap them in `<abbr title>`. | A |
| D16 | §5.5 row 4 | **Hover-preview row.** It becomes `aria-hidden`, its idle text reads "hover or focus a state to preview its clock", and it follows the map's focus ring as well as hover. | A |
| D17 | §5.7, §8 | **Tie each caption to its graphic.** Each graphic and its captions sit in a `<figure>`, captions referenced by `aria-describedby`, each caption starting with its subject ("Map: …", "Clock: …") (A). Place C1–C6 under the map legend and C7 under the clock, each with a mono label (M). | A, M |
| D18 | §5.6a (3), §4 below `xl` | **Voids as one line on narrow screens.** Below `xl` at rest, voids become one line, `{n} voids recorded in this file — see What the record does not contain`, linking to `#missing` (moved, not hidden). Promote this if the ControlCard additions (U9, U10) push the clock past D23's budget. | M |
| D19 | §10 Filters | **Category chips wrap** inside the collapsed Filters below 640px. They no longer scroll sideways. | M |
| D20 | §5.5, §10 | **Touch readout for the clock.** Tapping a ballot cap in a lane sets `y` and `st`. A reserved one-line mono readout under the clock prints the last tapped element's `<title>`. (Tap-to-open on bars is already in U20.) | M |
| D21 | §5.14, §9 | **Load the graph on demand.** `GraphExplorer` mounts on intersection. Below 640px it sits behind `Load the graph`, whose label says it is optional and that the twin is complete. | M |
| D22 | §10 Map | **Open a state without tapping it.** An `Open a state` `<select>` (36 entries, with live counts in `y`) under the figcaption on narrow screens, for small states that cannot be tapped. | M |
| D23 | §4, §10 | **Narrow fold budget.** At 390×844, the scrubber row and the top of the map fall within the second viewport (≤ 1,600px). Strip facts 4–6 and the run id move under the map figcaption on narrow screens. Asserted in the viewport check. | M |
| D24 | `src/components/Editorial.tsx` (platform, outside this page) | **Take rose off `Callout tone="warn"`.** It shares `border-rose/40` with the response rule, which teaches readers that rose means warning. Propose amber. | S |

### Could

| id | section | amendment | from |
|---|---|---|---|
| D25 | §5.3 | `copy view` beside `Copy link`: the status-line text plus `location.href`, as a ready-made screenshot caption. | J |
| D26 | §9 empty state | Forward line in the callout: `Research files under research/raw/welfare/: {count} · contract: docs/research/FLEET_CONTRACT.md (welfare)`, then `WELFARE_META.note` verbatim. | J |
| D27 | §5.8d | By-party column `As challenger: won vs exposed incumbent / vs unexposed incumbent`, with `a of b` and the same rules. | S |
| D28 | §5.13 | `as circulated by: {who} · {date}` under each narrative claim (or `proponent not recorded`), and a count of narratives by direction, from a proposed `direction` field. | S |
| D29 | §15 risk 1 | **Make the lid trigger concrete.** Take a greyscale screenshot with the lid on, and ask two reviewers from outside the build to describe a lidded ballot. If either says "bought", "bribed" or "suspicious", ship `lid: false` on the map. Run this after U16 makes the lid legible. | S |
| D30 | §5.2 | DenominatorStrip as a landmark (`<section aria-label="Denominators">`, with a visually hidden `<h2>`). | A |
| D31 | §5.13, §6.3 | NarrativeLadder as `<ol>` of rungs (`<h3>`), narratives as `<h4>`, and case / counter / what-would-change as a `<dl>`. | A |
| D32 | §5.14 | The graph twin opens under `view=table`. Its summary reads `{n} claims as a table · {k} alleged, {r} with a response`. With a scheme selected, a sentence names it as the graph's centre. | A |
| D33 | §14 gates, `scripts/smoke.mjs` | Structural accessibility check with no new dependency: no focusable element inside a `role="img"` subtree (the map is a `role="listbox"` since S3), every `<table>` captioned, `aria-valuetext` on the range, exactly one `[aria-live]`, the skip link first in the stage, and a strictly nested heading outline. | A |
| D34 | §5.5 ribbon, §10 | On narrow screens, the coverage-ribbon label sits above the clock, outside the scroll, at body size. | M |
| D35 | §5.3 | `Share link` through the Web Share API where `navigator.share` exists; otherwise `Copy link`, showing `copied` inline for two seconds. | M |
