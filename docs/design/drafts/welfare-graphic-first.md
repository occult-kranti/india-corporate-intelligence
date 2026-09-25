# /welfare — distribution funds, 2000–2026 · design draft, graphic-first

*Draft, 2026-09-25. Angle: **graphic first**. The map and its clock are the page, and
everything else is an annotation in their margin. Data contract:
`scratchpad/welfare/SPEC.md` (fleet files `research/raw/welfare/*.json`), as typed and
assembled on disk today: `src/data/welfare.ts` (`Scheme`, `Election`, `schemesLiveInYear`,
`monthsBetween`, `outlayForFy`, `latestStatus`, `schemesByState`) over
`src/data/welfare.generated.ts` (`WELFARE_SCHEMES`, `WELFARE_ENTITIES`, `WELFARE_CLAIMS`,
`WELFARE_BENEFITS`, `WELFARE_ELECTIONS`, `WELFARE_BASE_RATES`, `WELFARE_NARRATIVES`,
`WELFARE_VOIDS`, `WELFARE_SYMMETRY`, `WELFARE_GAPS`, `WELFARE_IDENTITY`, `WELFARE_META`).
The generated module is **empty today** (`WELFARE_META.empty === true`). The page must
build, render and pass smoke in that state. Where this draft agrees with
`docs/design/WELFARE_PAGE.md` (the judge's spec), it says so and does not repeat the
detail. Where it differs, it gives the reason.*

---

## 0. The central idea, and where it departs from WELFARE_PAGE.md

**One stage: a map with a clock under it and a margin beside it.** The year scrubber
is also the x-axis of a lane chart. That chart holds the central schemes (as a band),
an all-states summary row, and the selected state's scheme lifelines, so one cursor
moves the map and the timeline together. In the scrubbed year, **every assembly
election in the file is drawn on the map as a ballot glyph**: filled if the incumbent
kept power, hollow if it lost, half if the outcome was a coalition. A lid on the glyph
means the incumbent's party launched or raised a scheme in that state in the 12 months
before. This puts the control inside the picture. A reader cannot see a pre-election
launch without also seeing the elections that had none, and the ones the incumbent
lost anyway.

At rest the margin holds a reading key, the control's counts for every election in the
file, and the documented voids. When the reader clicks, it holds the state or scheme
they clicked. Nothing below the stage introduces a fact that cannot also be reached by
clicking in it. The sections below are either the long form of a margin card or an
index into the stage.

Departures from WELFARE_PAGE.md:

1. **The control moves into the frame instead of above it.** The judge put the 2×2
   before the map so the reader meets the elections-without-schemes first. This draft
   gets the same protection in place: ballot glyphs on the map for every election that
   year, with the counts at rest in the margin. The full 2×2 tables still render below,
   unchanged.
2. **A per-head metric is added (`m=perhead`)**, because the brief asks for it. It means
   the ₹ per enrolled beneficiary per year, annualised only from whitelisted units, and
   it is enabled only when exactly one category is selected. It is **not** per capita:
   the judge's refusal R6 (no population denominator) still stands.
3. **Fixed bins, not a fixed domain.** The colour thresholds are computed once from the
   pooled state-years and never recomputed per year. The legend prints each bin's range
   and its count *in the current year*, and names empty bins as empty.
4. **Three non-value fills, not two.** *Not swept* (hatch) · *swept, none live* (flat) ·
   *live, but no comparable figure* (stipple: partial sums, unlocated figures,
   non-comparable units). "The fleet never looked" and "the fleet looked and the
   figure is not public" are different findings and must not share a texture.
5. **The timeline is the scrubber's track**, not a separate section, and it carries a
   coverage ribbon so that 4 of 27 years with figures reads as 4 of 27.
6. **The scheme record opens in the margin**, beside the map, as a stacked card. The
   judge's full-width dossier tables survive in the table twin.
7. **No `GraphExplorer` on this page.** Who-else-benefits is scheme × channel, a
   bipartite population, so it gets a ledger and not a network (interface-design
   §centre). The claims stay reachable in the contested panel and the ledger.

Unchanged from the judge: the route and params (`y m cat party lvl st s tier view q`),
state-only map fill, party never encoded as colour, coalition outcomes unclassified,
no window control (6/12/24 months shown together), benefit history as a step table and
not a line, alleged items always paired with a response slot, and the boundary
mirroring rules.

---

## 1. Page purpose

`/welfare` is an explorable map of India's direct-benefit and distribution schemes from
2000 to 2026. It covers cash for women, farmers, the elderly and students, free grain,
loan waivers, free power, and goods such as cycles and TVs. For every year it shows
where a state scheme was live, what it cost as a share of the state budget or per
beneficiary, and which states held an election. The reader scrubs the years and clicks
states and schemes. For whatever they touch, the margin answers:

- who announced it and who approved it, on what dates, and for which party;
- what it paid per head and in total;
- how many months before which election it launched, and what that election returned;
- what happened to it afterwards (raises, cuts, scrutiny drives, renames, promises
  never enacted, all recorded as history and never overwritten);
- what evaluations, audits and courts found, with the response beside every allegation;
- who gained beyond the beneficiaries.

The page holds two hypotheses at equal weight: *cash transfers buy elections* and
*cash transfers are welfare that happens to be popular*. It measures every party in the
same columns and asserts no motive.

---

## 2. The reader's questions, in order

Questions 1–3 are answerable from the stage at rest, without scrolling, at 1280×800.

1. **Where were schemes live, and when?** → map fill + scrubber (§5.4, §5.5).
2. **Which states voted that year, did a fresh scheme precede the vote, and did the
   incumbent keep power?** → ballot glyphs (§5.4), readout.
3. **Across every election in the file, does a fresh scheme go with keeping power, for
   every party?** → margin at rest: `ControlCard` (§5.6a); long form §5.9.
4. **What did this state run, when, and under whom?** → click a state: `StatePanel` +
   the state's lanes (§5.6b, §5.5).
5. **For this scheme:** who announced it and who approved it, with dates and party? How
   much per head and in total, and what share of the budget? How many months before
   which election, and with what result? → click a lane: `SchemeCard` (§5.6c).
6. **What happened to it afterwards?** → status glyphs on the lane; card status history.
7. **What did evaluations find?** → card results, tiered, with allegations beside their
   responses.
8. **Who gained beyond the beneficiaries?** → card block; long form §5.10.
9. **What did the Union run meanwhile?** → central band (§5.5), not painted on states.
10. **Which ministers, from which parties, put their names to these schemes?** →
    ministers-and-parties table (§5.8).
11. **Which of the circulating narratives hold up?** → narratives ladder (§5.11).
12. **What is missing?** → voids (margin at rest), gaps and killed claims (§5.13).

---

## 3. Route, data and URL state

### 3.1 Route
`/welfare`, loaded with `React.lazy` in `src/App.tsx` beside `/pmcares`. Nav label in
`src/components/Layout.tsx` is **"Distribution funds"**, in the same group as PM CARES
and Resources. The `Suspense` fallback is a `bg-bg-elevated` block of the stage's
height with `loading the register…` in mono. No spinner.

### 3.2 Data (static, compiled in)
The page imports only from `src/data/welfare.ts`, plus a new derivation module
`src/data/welfareView.ts` (§6.5, §13) that imports from it. No literal figure appears in
`Welfare.tsx` or any welfare component. Everything is derived at module scope or in
`useMemo` keyed on the parsed filter object. The state × year × metric matrix is at
most 36 × 27 × 5 = 4,860 cells and is recomputed per filter change inside one `useMemo`.

### 3.3 URL parameters
All go through `useSearchParams` with `{ replace: true }`, using the same `setParam`
helper as `Resources.tsx`. An unknown value falls back to the default. The strip then
shows the unfiltered state, and a one-line amber notice reads
`ignored an unrecognised {param} value`.

| param | values | default (absent) | effect |
|---|---|---|---|
| `y` | `2000`…`2026` | **all years** | Year slice for map fill, ballots, readout, cursor on lanes, state panel "live in y" markers. Calendar year for launches, elections and status. **FY `y`–`y+1`** for money. |
| `m` | `live` \| `share` \| `perhead` \| `budgeted` \| `actual` | `live` | Map fill metric (§6.1). All but `live` require `y`. `perhead` also requires exactly one `cat`. A disabled option says why *on the option itself* (§4). |
| `cat` | comma list of contract categories | all | Scheme filter, applied everywhere. |
| `party` | comma list of canonical party labels | all | Scheme filter, applied everywhere. **Never pre-selected.** Also scopes the control to elections where that party was the incumbent. |
| `lvl` | `state` \| `central` \| `all` | `all` | Applies to lanes, tables and the central band. The map is state-only whatever the value. |
| `st` | state code | none | Selected state: margin shows `StatePanel`, lanes expand that state. |
| `s` | scheme id | none | Selected scheme: margin shows `SchemeCard`, and its lane glyphs render in accent. Takes margin precedence over `st`. |
| `tier` | comma list of tiers | all four | Filters results, who-else-benefits rows and the contested panel. |
| `view` | `map` \| `table` | `map` | `table` swaps the stage for its twin (§8). |
| `q` | text | empty | Scheme filter on name, alias, or the label of any person in `announced`/`ministers`. |

There is no window-length parameter (judge D3 and R13): 6, 12 and 24 months are always
shown together. There is also no parameter that hides the ballots. They are the
denominator, and a control that hides the denominator is not offered.

---

## 4. Page anatomy

Desktop ≥ 1280px. The stage breaks out of the house `max-w-[1180px]` to
`max-w-[1560px]`, and prose stays at 72ch.

```
┌ Kicker · PageTitle · one-line Standfirst · Byline ─────────────────────── ≤150px ┐
├ DenominatorStrip (sticky) ──────────────────────────────────────────────────────── ┤
├ FilterBar: Metric[live|share|per head|budgeted|actual] · Category chips · Party ·  ┤
│            Level · Tier · q · Reset · Copy link · [Map|Table]    1,204 → 37 schemes│
├──────────────────────────────────────────────────────┬─────────────────────────────┤
│ MAP  IndiaMap (bins, classes, ballots)               │ MARGIN 26rem, sticky,       │
│ height clamp(420px, 100vh − 380px, 640px)            │ own scroll, max-h = stage   │
│ in-frame status line (figcaption, screenshot-safe)   │ rest:  ReadingKey (5 lines) │
│ legend: bins with counts · 3 null classes · ballots  │        ControlCard          │
├──────────────────────────────────────────────────────┤        Voids                │
│ CLOCK  TimeLanes (shares x with scrubber)            │ st:    StatePanel           │
│  scrubber row  [All] ‹ 2023 ›  ─────●──────          │ s:     SchemeCard           │
│  coverage ribbon (money/per-head metrics)            │                             │
│  all-states row: launches ▮ / elections ▢ per year   │                             │
│  hover-preview row (fixed height)                    │                             │
│  CENTRAL band: one row per central scheme + LS rules │                             │
│  SELECTED STATE lanes (when st): one row per scheme  │                             │
├──────────────────────────────────────────────────────┴─────────────────────────────┤
│ Map captions C1–C6 (in place, under the stage, full width, 72ch)                  │
├ The control, long form — three TwoByTwo · timing Distribution · by-party base rates┤
├ Ministers and parties — table                                                      ┤
├ Beyond the beneficiaries — who-else-benefits ledger                                ┤
├ Narratives ladder                                                                  ┤
├ Contested — allegations beside their responses (ContestedFact)                     ┤
├ What the record does not contain — voids · Gaps (GapsPanel) · Killed in audit      ┤
└ Sources (SourceLedger) · TierLegend · Footnote (standing note)                     ┘
```

**Fold budget at 1280×800:** header ≤150px, strip ≈36px, filter bar ≈44px (one row),
map ≥420px, then scrubber row, coverage ribbon and all-states row ≈90px. The scrubber
must be visible without scrolling. The viewport check (§10) asserts this.

---

## 5. Section by section

### 5.1 Header (existing `Editorial`)
- `Kicker`: `Distribution funds · cash, grain and goods schemes · 2000–2026`
- `PageTitle`: **Who announced the money, when, and what the voters did next**
- `Standfirst` (one sentence, fixed copy): "Scrub the years to see where state schemes
  ran and where elections fell, including every election no scheme preceded, then
  click a state or a scheme for who announced it, what it paid and what became of it."
- `Byline`: `{schemes} schemes · {swept} of 36 states & UTs swept · {elections} elections recorded · {parties} parties · as of {WELFARE_AS_OF ?? 'not yet promoted'}`

### 5.2 `DenominatorStrip` (existing, sticky)
```ts
<DenominatorStrip
  asOf={WELFARE_AS_OF ?? 'not yet promoted'}
  filtered={{ from: WELFARE_SCHEMES.length, to: inView.length }}
  facts={[
    { n: inView.length, of: WELFARE_SCHEMES.length, label: 'schemes in view' },
    { n: sweptStates.size, of: 36, label: 'states & UTs swept' },
    { n: assemblyElections.length, label: 'assembly elections recorded' },
    { n: outlayRowsWithActual, of: outlayRows, label: 'outlay rows with an actual, not only a budget' },
    { n: resultsDocumented, of: resultsAll, label: 'findings from a primary record' },
    { n: allegedAnswered, of: allegedAll, label: 'allegations with a response on record' },
  ]}
/>
```
If the files carry different `asOf` values, the strip reads `as of {min}–{max}`
(`WELFARE_META.files[].asOf`). Derive that range; never choose one of the dates.

### 5.3 `FilterBar` (page-local, one row, wraps)
Each control shows its live effect on the scheme denominator, e.g.
`1,204 → 37 schemes`, beside it. Spec per control in §7.

### 5.4 The map: `IndiaMap`, extended (§6.1)
```ts
<IndiaMap
  data={stateYear[m][y ?? 'all']}      // Record<StateCode, MapDatum> from welfareView.stateYearMatrix(filters)
  metricLabel={METRIC_LABEL[m]}        // 'State schemes live' | 'Share of state budget' | 'Per-head benefit' | 'Budgeted' | 'Actual'
  unit={METRIC_UNIT[m]}                // '' | '%' | '₹ / beneficiary / yr' | '₹ cr' | '₹ cr'
  bins={BINS[m]}                       // NEW: fixed across all years (§6.1)
  classes={{ zero: ZERO_LABEL(y), stipple: STIPPLE_LABEL[m] }}  // NEW
  ballots={y ? ballotsFor(y, filters) : []}                      // NEW
  onHover={setHoverState}              // NEW: drives the TimeLanes preview row only
  selected={st}
  onSelect={(c) => setParam('st', c)}
  showMarks={false}
  height={mapHeight}
  format={METRIC_FORMAT[m]}
/>
```

**`MapDatum` per state (rules, implemented exactly in `welfareView.stateYearMatrix`):**

- **Swept** = the state appears in any scheme's `st` or any `WELFARE_ELECTIONS.st`.
  A state that is not swept gets no entry, which renders as **hatch**.
- **Live in y** = `schemesLiveInYear(y)` from `welfare.ts`, restricted to `level ===
  'state'` and the current filters. With `y` absent, "live" means ever launched from
  2000 to asOf.
- `live`: the count of live state schemes. Swept with 0 gives `value: 0,
  fillClass: 'zero'`.
- `share`: the sum of `pctOfStateBudget` across live schemes, from each scheme's
  `outlayForFy(s, fy(y))`. **If any live scheme lacks the figure**, the result is
  `value: null, fillClass: 'stipple'`, with
  `detail: "partial — {sum}% across {k} of {n} live schemes; a partial sum is a lower bound and is not shaded"`.
- `budgeted` / `actual`: the same rule on `budgetedCr` / `actualCr`. The two are never
  mixed and never substituted for each other.
- `perhead` (requires one `cat`): for each live scheme in that category, take
  `annualPerHead(amountInForce(s, y), s.benefit.unit)` (§6.5). The value is the largest
  of these. `detail` names every live scheme in the category with its annualised figure,
  and says `larger shown; amounts are not added — they may reach the same person`. If
  every live scheme's unit is non-comparable or its amount is null, the result is
  `fillClass: 'stipple'` with `detail: "unit not comparable: {unit}"` or
  `"amount not located"`.
- **Boundary mirroring**, as judge §4.3 and nothing else. Telangana takes Andhra
  Pradesh's value before 2014-06-02. From 2020-01-26, `dn` and `dd` take the merged
  UT's value. `jk` includes Ladakh.
- Every `detail` ends with the party labels of the live schemes, as text:
  `· schemes by: BJP (2), INC (1)`.

**Ballots (only when `y` is set):** one per record in `WELFARE_ELECTIONS` with a
non-null `st`, `election` matching `/assembly/i`, and a date in year `y`. The fields
come from `welfareView.electionRows(filters)`, which the ControlCard, the TwoByTwo
tables and the table twin also read, so all four count the same rows.
- `outcome`: `retained` when `canon(winner) === canon(incumbentParty)`, `lost` when both
  are canonicalised and they differ, `unclassified` when either is null or when either
  string matches `/\+|\/|alliance|front|NDA|UPA|INDIA|Mahayuti|MVA|Mahagathbandhan/i`.
- `exposed12`: true when a state scheme in view with `st === e.st` and
  `canon(party) === canon(e.incumbentParty)` has a `launched.date` or a raise (a
  `benefit.changes[]` entry whose amount is higher than the previous one, or a
  `status: raised`) inside `[e.date − 12 months, e.date]`. `monthsBetween` from
  `welfare.ts` is the only month arithmetic.
- `muted`: true when `party` is set and `canon(incumbentParty)` is not in it. A muted
  ballot is drawn in `--color-text-muted`, keeps its fill state, and is still counted
  as an election that happened.
- `title` (SVG `<title>`): `{State} assembly · {date} · {incumbent} → {winner} · fresh scheme ≤12 m: {yes|no}`.

**Readout on hover** (existing IndiaMap readout, extended with `detail`): the state
name; `{metric}: {value}` with the FY for money metrics; the detail line; then, if an
election fell in `y`, `{date}: {incumbent} → {winner} · fresh scheme ≤12 m: yes/no`.

**In-frame status line.** This is the map's `<figcaption>`, directly under the SVG and
before the legend. It is screenshot-safe and always rendered, in mono 11px:
`{METRIC_LABEL} · {y ?? '2000–' + asOfYear}{money ? ' · FY ' + fy : ''} · {swept} of 36 swept · {h} hatched = not swept · {z} flat = swept, none live · {p} stippled = live, no comparable figure · central schemes not painted (band below) · party not encoded · this file as of {asOf}`

**Legend** (IndiaMap's own legend, extended, §6.1): each bin as `{lo}–{hi} ({count} in {y})`,
with an empty bin printed as `{lo}–{hi} (empty in {y})`. Then the three null-class
swatches with counts. Then the ballot key: `■ incumbent kept power · □ lost · ◩ coalition / unclassified · lid = the incumbent's party launched or raised a scheme here ≤12 months before`.
When `y` is absent the ballot key reads `choose a year to see its elections`.

### 5.5 The clock: `TimeLanes` (new, §6.2)
Full width of the map column, directly under the legend. The x-axis runs from
2000-01-01 to asOf. The last column is labelled `2026 (to {dd Mon})`.

Rows, top to bottom:
1. **Scrubber row.** An `All years` button, then `‹ {y−1}`, a mono year readout
   (`text-2xl`), `{y+1} ›`, and a native `<input type="range" min=2000 max=2026>` laid
   exactly over the axis. Its padding matches the chart's, so thumb and year column
   line up. The readout also names the money year when a money metric is on:
   `2023 · money: FY 2023-24`. There is no autoplay (judge R10).
2. **Coverage ribbon.** Shown for `share` / `perhead` / `budgeted` / `actual`. One cell
   per year:
   - **solid ramp-floor fill**: every live state scheme has the figure;
   - **stipple**: some do;
   - **hatch**: none do;
   - **blank with a hairline border**: no live state schemes.
   The textures are the map's own, so one legend serves both. A right-hand mono label
   reads `figures for {k} of {n} scheme-years · {full} of 27 years complete`. For `live`
   the ribbon is replaced by the line
   `{j} schemes have no launch date and are not placed on the clock` (0 → omitted).
3. **All-states row.** Above the baseline, launches recorded per calendar year as thin
   bars. Below it, assembly elections per year as small ballot squares stacked
   downward. Each half has its own integer scale with its max printed at the left
   (`max 6 launches`, `max 5 elections`). Clicking a year column sets `y`.
4. **Hover-preview row** (fixed 22px, always reserved so hovering never shifts the
   layout). While a map state is hovered, it shows that state's launch ticks and
   ballots on one line, labelled with the state name. Otherwise it reads
   `hover a state to preview its clock` in muted mono.
5. **Central band.** Header: `Central · applies to all states · not painted on the map`.
   One row per central scheme in view, sorted by `launched.date` then `id`. A scheme
   launched before 2000 starts at the left edge with a `◂ {year}` label. Each row
   carries its bar and status glyphs. Lok Sabha elections (`st === null`) are drawn as
   vertical rules across the band only, with ballot caps outcome-classified as above.
   Their "exposed" is computed from central schemes and the Union incumbent recorded
   on the election. If `lvl=state`, the band collapses to its header plus
   `hidden by Level: state · {k} central schemes`.
6. **Selected-state lanes** (when `st` is set). Header: `{State} · {k} schemes · {e} elections in the file`,
   then one row per state scheme in view from that state, sorted by `launched.date`
   then `id`. Assembly election rules run through all of these rows, with ballot caps
   and the 12-month analytic band in front of each. If `st` is not set, this area
   reads `click a state on the map to open its schemes here`.

**Lane grammar** (identical in the central band and in state lanes):
- Announced → launched: a 1px line from `announced.date` to `launched.date`. A 6px bar
  from `launched.date` to the first dated `discontinued`, or to asOf. If a
  discontinuation is undated, the bar runs to asOf and ends with a mono
  `end undated` label. No launch date gives no bar: just a `○` at the announcement date
  labelled `not launched`.
- Status glyphs (Unicode rendered as SVG text, 10px, on the bar): `▲` raised · `▼` cut ·
  `◆` eligibility tightened · `‖` paused · `×` discontinued · `↻` renamed ·
  `□` promised, not enacted. `live`, `announced` and `launched` statuses are not drawn,
  because the bar already carries them. Undated statuses are listed in the lane's
  `<title>` as `undated: …` and not placed.
- Bar fill is `--color-text-secondary` at 0.55 opacity. **The selected scheme renders
  in `--color-accent`; accent means selection and nothing else.**
- Year cursor: when `y` is set, a column band `rgba(201,168,108,0.08)` spans every row.
- Each row's label column (140px, sticky left) shows the scheme name, and clicking it
  sets `s`. Each bar and glyph is focusable (`tabIndex=0`, Enter sets `s`) with
  `<title>` `{name} · {event} · {date}`.

### 5.6 The margin (26rem, sticky at `top: strip height`, own scroll)

**(a) At rest (no `st`, no `s`).**
1. `ReadingKey`: five fixed lines in 13px.
   "Fill is one metric for state schemes recorded in this file, in the chosen year." ·
   "Hatch is not swept. Flat is swept, none live. Stipple is live but no comparable
   figure. None of the three means zero." · "Ballots mark every election that year,
   including those no scheme preceded." · "Central schemes run in the band under the
   map; they are not painted." · "Colour never encodes party."
2. `ControlCard` (§6.3). Its title is
   **"Every election in the file, with and without a fresh scheme"**, and it covers all
   years regardless of `y`. There is one line per window, and they are always shown
   together:
   `12 m · retained after a fresh scheme: {a} of {b} · without: {c} of {d} · unclassified: {u}`
   (and the same for 6 m and 24 m). Beneath: `n = {E} assembly elections · no test is run at this n · one election moves a row by up to {100/min(b,d)} points`.
   When `y` is set, a second block lists that year's elections as ballot + state +
   `incumbent → winner` + `fresh ≤12 m: yes/no`, each linking to `?st=`. A link at the
   foot goes to `#control` (the long form). If `party` is set, the title gains
   `— elections where {party} was the incumbent`, and a line reads
   `Showing one side. The by-party table below measures every party in the same columns.`
3. **What the record does not contain.** Every `WELFARE_VOIDS` entry at 14px:
   `what` in `text-text`, `whyItMatters` beneath, and `Cite`. Nothing is truncated.
   If there are none: `No voids recorded in this file.`

**(b) `st` set: `StatePanel`** (§6.4).
- Header: the state name, a `Link` to `/states/{st}`, and a close control (clears `st`).
- The line `{k} state schemes in the file · {j} live in {y}`.
- Scheme rows (all years), sorted by `launched.date` then `id`. Each row reads
  name · party · launched · per-head as of `y` (with unit) · latest status ≤ `y`, and
  rows live in `y` carry a mono `live in {y}` tag. Clicking a row sets `s`.
- **Elections in this state in the file**: ballot · date · incumbent → winner ·
  fresh ≤12 m yes/no · seat change if recorded on a scheme's `electionContext`.
- **Gaps touching this state**: entries from `WELFARE_GAPS` whose text contains the
  state's name or code, at body size.
- A swept state that is empty under the current filters shows:
  "No scheme from {State} matches the current filters. The state is in the sweep; this
  is a statement about this file."
- A state that was not swept shows:
  "{State} was not swept by the research fleet. Hatched means unknown, not none."

**(c) `s` set: `SchemeCard`** (§6.4). The blocks are the judge's dossier blocks
1–9 (§4.5 of WELFARE_PAGE.md), in that order, re-laid as stacked definition rows for a
26rem column instead of wide tables:
1. **Header**: name; aliases in mono (including non-Latin scripts); state or
   `Central · all states`; party (text); category. Then a `← {State}` back link if
   `st` is set, and close.
2. **Lifecycle**: four stacked cells, Announced (date · person · office · `Cite`),
   Approved (date · body · `Cite`), Launched (date · `Cite`), and Election. The
   Election cell reads name · date · `{months} months after launch` · incumbent → result
   · seat change · `Cite`. Months are **recomputed** with `monthsBetween(launched.date,
   electionContext.date)`. If that differs from the recorded `monthsFromLaunch` by more
   than 1, both are printed: `recorded {r} · computed {c}`. A missing stage reads
   `not located`.
3. **Who carried it**: one row per `ministers[]` entry: person label, then role,
   action, date and party. A `pol:` id links to `/cabinet`. An unresolved person
   renders the label plus `(identity not confirmed)` with no link. `opposed` actions are
   shown, not filtered.
4. **What it pays**: the base amount and unit, then every `benefit.changes[]` entry in
   date order: date · amount · note · `Cite`. Earlier amounts stay visible and are never
   struck through. A `promised-not-enacted` status appears as a row prefixed
   `promised:` in amber text, beside the amount actually recorded.
5. **How many, how much**: beneficiary counts as dated snapshots (`as of · count · Cite`),
   then outlay per FY: budgeted · actual · % of state budget · % of GSDP · `Cite`.
   Nulls read `not located`. When `y` is set, the FY row for `y` is marked
   `← map year`.
6. **What happened to it**: `status[]` in date order: `{date} · {status} · {note}` +
   `Cite`. Undated entries come last, marked `undated`.
7. **What evaluations found**: `results[]` filtered by `tier`, each with `TierChip`,
   the finding and `Cite`. Every `alleged` finding renders as a two-row pair: the
   allegation, then **Response** with a `border-l-2 border-rose/40` rule (rose is the
   denial colour, its reserved meaning). The response comes from
   `welfareView.responsesFor(scheme.id)`, i.e. `WELFARE_CLAIMS` with `pred === 'contra'`
   targeting the scheme node or `claim:<id>` of a claim about it. No match reads
   **"No response on record in this file"** in amber, and the item becomes a derived
   gap. An empty list reads: "No evaluation, audit, court finding or survey located for
   this scheme. Recorded as a gap."
8. **Who else benefits**: `whoElseBenefits[]` filtered by `tier`, as who · how ·
   `₹{amountCr} cr` or `not stated` · `TierChip` · `Cite`. Alleged rows follow the same
   response rule. An empty list reads: "None recorded — which is not the same as none."
9. **Sources**: every URL in `scheme.srcs`, in full, via `Cite`.

If `s` names an id that is not in the file, the card reads: "No scheme `{s}` in this
file." Below it is a link that clears `s`.

### 5.7 Captions under the stage
C1–C6 (§8), full width at 13px `text-text-muted`, max 72ch, **directly under the stage
and above the first section**. They are not footnotes.

### 5.8 Section: "Ministers and parties" (`id="ministers"`)
A `DataTable` with one row per **(person, party-as-recorded)** pair across
`announced.byPersonId` and `ministers[]` of the schemes in view. A person recorded under
two parties at different dates gets two rows. The page never infers a party switch.

Columns: `Person | Office (identity.office, with dates) | Party (as recorded) | Announced | Approved | Presented budget | Administers | Opposed | Schemes`.
Each action cell lists `{scheme} · {date}`, with the scheme name linking to `?s=`, and
is not a count. **Rows sort by the date of the person's earliest action, then by label.
They never sort by the number of schemes.** When `y` is set, actions dated in `y` carry
a mono `{y}` tag. The `note` line reads:
`{P} persons · {j} with identity not confirmed · all years; filtered by category, party, level, state and search`.

### 5.9 Section: "The control, long form" (`id="control"`)
- `Callout label="Symmetry check" tone="note"`: each `WELFARE_SYMMETRY` text verbatim,
  prefixed with its `domain` in mono.
- Three `TwoByTwo` tables (§6.3) side by side, for 6, 12 and 24 months, with an always
  visible *unclassified* column. Each cell is a `<details>` listing its elections and
  linking `?st=&y=`. The derivation is the same `electionRows` as the ballots.
- `Distribution` (existing, `Charts.tsx`) of months from launch to the next assembly
  election in the same state. Bins are 0–12, 12–24, 24–36, 36–48 and 48–60. There are
  two series: observed, and an analytic uniform expectation (20% per bin). Unbinned
  counts are printed beside it. This is the judge's §4.2(c), adopted as written.
- **By-party base rates**: a `DataTable` sorted alphabetically by party, with columns
  `Party | State schemes with a launch date | …with a later assembly election in the file (b) | launched ≤12 m before it (a of b) | uniform-term expectation (0.2 × b, analytic) | raised ≤12 m before an election | promised, not enacted | cut · tightened · paused · discontinued | alleged findings answered (k of n) | elections as incumbent: retained / lost / unclassified`.
  Rates are printed as `a of b`, with a percentage only when `b ≥ 10`.
- **Recorded base rates**: a `DataTable` over `WELFARE_BASE_RATES` with columns
  `Property | Numerator | Denominator | Rate | Reference class | Domain | Source`.
  A `denominator` of 0 or null prints `not computed`. It never prints `0%` or `NaN`.
- Caption C7.

### 5.10 Section: "Beyond the beneficiaries" (`id="benefits"`)
A `DataTable` that unions every scheme's `whoElseBenefits[]` with `WELFARE_BENEFITS`
(claim-borne `benefit` rows whose `s` or `t` is a scheme node). Columns are
`Scheme | Who | How | ₹ cr | Tier | Response | From (scheme record / claim id) | Source`.
Rows sort by scheme launch date, then `who`, and are filtered by `tier`. **There are
no totals and no per-entity sums.** The note reads
`{n} rows · {k} with an amount · {a} alleged, {r} of them answered`. Caption C10.

### 5.11 Section: "Narratives ladder" (`id="narratives"`)
`NarrativeLadder` (new, §6.3) has six fixed rungs, top to bottom: established ·
well-supported · contested · speculative · unsupported · debunked. **Every rung is drawn
even when empty** and labelled `{status} — {n}`, with `— none in this file` when
n = 0. Each narrative on a rung shows the claim, then two equal columns (Strongest case
| Strongest counter, the `ContestedFact` symmetry rule), then *What would change this*
full width, then `Cite`. All rung labels are one colour, with no traffic-light
colouring. Within a rung, entries sort by claim text.

### 5.12 Section: "Contested"
One `ContestedFact` (existing) per alleged claim in `WELFARE_CLAIMS` that has a matching
`contra` claim. `positions[0].who` is the label of the alleging entity (`s`) and
`positions[1].who` is the label of the responding entity. Both are named, never
"critics". `unresolved` holds the claim's `upgradeIf` / `killIf`. Entries sort by
`from` date, then id. Alleged claims with no contra are listed under
`No response on record (k)` at the same type size, each linking to its scheme. Tier
filter applies.

### 5.13 Section: "What the record does not contain"
- Voids repeated in full, at body size.
- `GapsPanel` (existing) receives `WELFARE_GAPS` mapped to `{ what: text, why: 'recorded by the ' + domain + ' sweep' }`,
  plus the derived gaps:
  - alleged items with no response;
  - schemes with no launch date;
  - recorded-versus-computed month mismatches;
  - benefit units not normalised (`unit` strings outside the whitelist);
  - party strings not canonicalised;
  - states in the contract's symmetry list (MP, MH, OR, AS, CT, DL, HR, BR, KA, HP,
    TG, WB, TN, AP, JH, PB) that were not swept;
  - years 2000–2026 with no state scheme recorded in any swept state.
  `note`: "Absence is a result here; each line bounds what the stage above can say."
- **Killed in audit**: `WELFARE_META.killed` as the PM CARES "What the control killed"
  list (`border-l-2 border-rose/40`, id, claim label, `killed by: {killedReason}`).
  An empty list reads `No claim was killed in audit — or the audit has not run
  ({WELFARE_META.audit ? 'ran' : 'not run'}).`

### 5.14 Sources and foot
`SourceLedger` receives the union of `srcs` across all records, de-duplicated by URL and
sorted by label. `primary` is set by
`/\.gov\.in|\.nic\.in|rbi\.org\.in|cag\.gov\.in|indiabudget\.gov\.in|sansad\.in/i`.
`retrieved` is the file's `asOf`. Then `TierLegend`, then a `Footnote` with the
standing note: "This page records public schemes, public offices and published claims.
It asserts no motive and no offence. Allegations are attributed and paired with the
response of those they concern. Persons appear only in public roles; beneficiaries
appear only as classes."

---

## 6. Components

### 6.1 MODIFIED `IndiaMap` (`src/components/viz/IndiaMap.tsx`). Additive; every other caller is unchanged.
```ts
export interface MapDatum {
  value: number | null;
  label?: string;
  detail?: string;
  /** NEW. Overrides the fill when value is 0 or null. Absent + null = hatch (not swept / no data). */
  fillClass?: 'zero' | 'stipple';
}

interface Props {
  // …existing…
  /** NEW. Fixed thresholds; ramp.length must equal cuts.length + 1 (dev-time assert). Bypasses scaleMode. */
  bins?: { cuts: number[]; ramp: string[]; format?: (v: number) => string };
  /** NEW. Legend labels for the two extra classes; a class with no label is not drawn in the legend. */
  classes?: { zero?: string; stipple?: string };
  /** NEW. Ballot glyphs, drawn after labels; leader states get theirs in the gutter beside the label. */
  ballots?: MapBallot[];
  /** NEW. Fires on hover enter/leave; readout behaviour unchanged. */
  onHover?: (s: StateCode | null) => void;
}

export interface MapBallot {
  state: StateCode;
  outcome: 'retained' | 'lost' | 'unclassified';
  lid: boolean;          // fresh scheme ≤12 m by the incumbent's party
  muted?: boolean;
  title: string;
}
```
- `zero` fill is a flat `#15171c`. `stipple` is a new `<pattern>`: `#101116` ground
  with 1.1-radius dots every 5 units in `rgba(232,228,220,0.32)`. It must be
  distinguishable **in greyscale** from the existing warm diagonal hatch, which is lines
  where this is dots, and from the ramp floor `#2e373f`.
- With `bins`, the legend prints each bin as `{lo}–{hi} ({count})` from the current
  `data`, prints `(empty)` for a bin with no state, then a zero swatch with its count,
  a stipple swatch with its count, and the existing `no data ({k} of 36) — not zero`.
  **The no-data count excludes zero and stipple states.**
- Ballot geometry: a 7×7 square at `(cx, cy + labelOffset)`, where `labelOffset` is
  9 for full-name labels and 7 for code labels. For leader states the ballot sits 4
  units before the gutter text. Stroke is `var(--color-text)`, 1.1, **solid**, never
  dashed, because dash is tier. There is a 2-unit dark halo (`paintOrder: stroke`).
  `retained` is filled, `lost` is hollow, and `unclassified` fills the lower-left
  triangle. `lid` is a 7×1.4 bar 2 units above. `muted` switches the colour to
  `--color-text-muted`. Every ballot carries a `<title>`, and ballots join the map's
  existing keyboard ring (Enter on the state opens its panel).
- No fill transitions, under any motion setting.

### 6.2 NEW `TimeLanes` (`src/components/viz/TimeLanes.tsx`)
```ts
type LaneEventKind = 'raised' | 'cut' | 'tightened' | 'paused' | 'discontinued' | 'renamed' | 'promised';
interface LaneEvent { date: string; kind: LaneEventKind; label: string }
interface Lane {
  key: string;                 // scheme id
  label: string;
  announced: string | null; launched: string | null; ended: string | null; endUndated: boolean;
  events: LaneEvent[]; undated: string[];
}
interface LaneElection { date: string; label: string; outcome: 'retained' | 'lost' | 'unclassified'; lid: boolean; muted?: boolean }
interface CoverageCell { year: number; state: 'full' | 'partial' | 'none' | 'empty'; k: number; n: number }
interface TimeLanesProps {
  range: [string, string];              // ['2000-01-01', WELFARE_AS_OF]
  year: number | null; onYear: (y: number | null) => void;
  moneyYearLabel?: string | null;       // 'FY 2023-24'
  coverage?: CoverageCell[] | null;     // null for m=live
  unplaced?: number;                    // schemes with no launch date
  allStates: { year: number; launches: number; elections: LaneElection[] }[];
  preview?: { label: string; launches: string[]; elections: LaneElection[] } | null;
  central: { lanes: Lane[]; elections: LaneElection[]; hiddenCount?: number };
  state?: { label: string; lanes: Lane[]; elections: LaneElection[] } | null;
  windowMonths: 12;                     // the analytic band; fixed
  selectedLane?: string | null; onSelectLane: (id: string) => void;
}
```
The container is `overflow-x-auto`, and the SVG has `min-width: 760px`. There is one
x-scale for every row (no row gets its own time axis). Row heights are fixed: scrubber
44, ribbon 12, all-states 56, preview 22, lane 22. The analytic band is
`rgba(232,228,220,0.04)`, and its left edge is stroked with the **analytic tier dash
`8 3 2 3`**, because the window is our construct. A legend row under the chart names
every glyph, the band, and the ribbon textures. The SVG has `role="img"` and a `<title>`
summarising the counts in view.

### 6.3 NEW in `src/components/Domain.tsx` (cross-domain)
- `TwoByTwo`: as judge §6.3, verbatim. It renders a real `<table>`, with no cell
  colouring.
- `ControlCard`: `{ windows: { months: 6|12|24; exposed: {a:number;b:number}; notExposed: {c:number;d:number}; unclassified: number }[]; n: number; yearList?: {ballot: MapBallot; label: string; href: string}[]; scopeNote?: string }`.
  It is text plus inline ballot SVGs, with no bars. The comparison is carried by two
  `a of b` fractions side by side, not by a picture that would imply an effect size.
- `NarrativeLadder`: `{ rows: Narrative[] }` (type from `src/graph/fleet.ts`), with six
  fixed rungs, each always rendered.

### 6.4 NEW `src/components/welfare/StatePanel.tsx`, `src/components/welfare/SchemeCard.tsx`
`SchemeCard` props: `{ scheme: Scheme; year: number | null; tiers: Set<Tier>; personOf: (id: string) => { label: string; resolved: boolean; office: string | null; href?: string }; responsesFor: (schemeId: string) => GEdge[]; onClose: () => void; backTo?: { label: string; onClick: () => void } }`.
`StatePanel` props: `{ st: StateCode; swept: boolean; schemes: Scheme[]; year: number | null; elections: ElectionRow[]; gaps: string[]; onScheme: (id: string) => void; onClose: () => void }`.
Both use `TierChip`, `Cite` and `DataTable` only for the widest block, and no bespoke
heading styles.

### 6.5 Derivations (`src/data/welfareView.ts`)
- `parseFilters(params)` → `WelfareFilters`; `inView(filters)`.
- `canon(party)`: this is a table of recorded strings mapped to canonical labels
  (e.g. `Bharatiya Janata Party → BJP`, `Indian National Congress|Congress → INC`,
  `All India Trinamool Congress → AITC`). Unmapped strings pass through trimmed and are
  listed as a derived gap. The table lives in code, with a comment giving the source of
  each mapping.
- `amountInForce(s, y)`: the base amount from `launched.date`, then the latest dated
  `benefit.changes[]` at or before `min(y-12-31, discontinuation date)`. Undated changes
  are not placed, and their count is reported in `detail`.
- `annualPerHead(amount, unit)`: a whitelist. `/per month/i` gives ×12;
  `/per (year|annum)/i` gives ×1. Everything else (`per acre`, `per season`, `one-time`,
  `per instalment`, `kg`, goods) returns `null` with a reason. Changing the whitelist is
  a design decision, not a bug fix.
- `stateYearMatrix(filters)`, `BINS` (pooled over all state-years of that metric under
  **no** filters, so the scale does not move when the reader filters). Bins are
  quantile cuts rounded to 2 significant figures: 5 bins if the pooled n ≥ 20, 3 if
  n ≥ 6. Below that the metric's option is disabled with `too few figures to bin (n = {n})`.
  `live` uses fixed classes `1 · 2 · 3 · 4+`.
- `electionRows(filters)`, `controlTable(window, filters)`, `timingBins()`,
  `partyBaseRates(filters)`, `ministersRows(filters)`, `responsesFor(id)`,
  `benefitRows(filters)`, `coverageByYear(m, filters)`, `derivedGaps()`.
- Every sort has an explicit tiebreak on `id`.

---

## 7. Visual encodings and filters

### 7.1 Channels

| where | channel | means | never means |
|---|---|---|---|
| map | fill, sequential ramp (DEFAULT_RAMP steps) | value of `m` for state schemes in this file in `y`, fixed bins across 27 years | party, category, "generosity", anything computed about an entity |
| map | hatch (warm diagonal lines) | not swept, so unknown | zero |
| map | flat `#15171c` | swept, no state scheme live | unknown |
| map | stipple (neutral dots) | live scheme(s) but no comparable figure: partial, not located, or non-comparable unit | zero, or low |
| map | ballot square, filled / hollow / half | assembly election in `y`: incumbent retained / lost / coalition-unclassified | vote share, margin, any score |
| map | ballot lid | incumbent's party launched or raised a state scheme there ≤12 m before | causation |
| map | accent outline | selected state | — |
| lanes | x | date | — |
| lanes | thin line → bar | announced → live period | amount |
| lanes | text glyph | status event type (§5.5) | tier |
| lanes | vertical rule + ballot cap | election and its outcome class | — |
| lanes | band with `8 3 2 3` left edge | the 12-month analytic window (our construct) | a finding |
| lanes | accent | selected scheme | "important" |
| ribbon | solid / stipple / hatch / blank | figure coverage per year for `m` | values |
| everywhere | `strokeDasharray` | evidence tier, and nothing else | style |
| everywhere | `--color-rose` | a denial / response rule, and killed claims | "bad" |
| text only | party | as recorded on the record | — |

### 7.2 Frozen (the developer may not adjust these to make things fit)
- `strokeDasharray` = tier. No ballot, bar, outline or rule is dashed for any other
  reason. The only dash on the stage is the analytic band edge, which *is* analytic.
- Hatch, stipple, flat zero and the ramp floor are four visibly distinct fills. Verify
  with a greyscale screenshot, not by reasoning.
- Bins are fixed across years and filters. Per-year or per-filter re-binning is
  forbidden.
- One x-scale for the whole clock.
- No party hue anywhere. No rose outside denial, response and killed claims.
- Ballots are drawn for every election in `y`, and there is no control to hide them.
- `TierChip` beside every finding and benefit row. Allegations always have a response
  slot.
- The in-frame status line is always rendered, whatever the metric or filter.

### 7.3 Filters and their denominator effect

| control | type | options | default | effect shown on the control |
|---|---|---|---|---|
| Metric `m` | segmented (select on mobile) | live · share · per head · budgeted · actual | live | Each option shows its coverage for the current `y`, e.g. `Share — 7 of 19 live schemes have a figure for FY 2023-24`. Disabled options carry their reason inline: `choose a year` / `choose one category` / `too few figures to bin (n = 4)`. |
| Category `cat` | chips, multi | the 12 contract categories | none | Each chip shows `(count in view)`. Zero-count categories are shown disabled with `(0)`, never hidden. The bar reads `{N} → {k} schemes`. |
| Party `party` | multi-select | canonical labels alphabetical, with counts | none | `{N} → {k}`, plus the one-side notice in the ControlCard and above the stage. Ballots for other incumbents are muted, not removed. |
| Level `lvl` | segmented | all · state · central | all | `{N} → {k}`, plus `map is state-only whatever this says`. |
| Tier `tier` | four toggles with tier dash swatches | documented · reported · alleged · analytic | all on | `{k} of {n} findings · {j} of {m} benefit rows`. It does not change the scheme count, and says so: `filters findings, not schemes`. |
| Search `q` | text | — | empty | `{N} → {k}`. |
| Year `y` | scrubber | All, 2000…2026 | All | Readout: `{n} state schemes live of {N} in view · {e} elections`. |
| Reset | button | — | — | Clears every param except `view`. |
| Copy link | button | — | — | Copies `location.href`. |

---

## 8. Captions the page must carry (what the graphic cannot honestly show)

These sit under the stage, in place, at 13px (§5.7), except for C7–C10, which sit under
their sections.

- **C1 (map scope, always):** "Colour is {metric} for state schemes recorded in this
  file, which is not all schemes in India. Central schemes apply to every state and run
  in the band under the map; painting them would shift every state by the same amount.
  Colour never encodes party."
- **C2 (`m=live`):** "A count measures the research sweep as much as the state. A state
  with more schemes here may have been researched more closely. Pre-2014 records are
  thinner than recent ones."
- **C3 (money metrics):** "Financial year {fy}, nominal rupees. Amounts are not adjusted
  for inflation, so do not compare shades across decades. Budgeted and actual are never
  combined. Where a figure exists for only some live schemes, the state is stippled,
  because a partial sum is a lower bound. 'Share of state budget' is as each source
  states it, and sources differ on the base."
- **C4 (`m=perhead`):** "The amount one enrolled beneficiary is entitled to per year,
  converted only from monthly or annual amounts. Per-acre, per-season, one-time and
  in-kind benefits are stippled, not converted. This is what one person was entitled to,
  not what reached them. Eligibility differs by state. Where a state runs two schemes in
  the category, the larger is shown and both are named, because adding them would count
  one person twice. Not per capita: the file carries no population denominator."
- **C5 (ballots, `y` set):** "Every assembly election in the file is marked, not only
  those a scheme preceded. The file holds the elections the research needed, not every
  Indian election. The lid marks timing, not cause. Anti-incumbency, alliances, national
  swings, delimitation and candidates are not controlled. Coalition outcomes are not
  forced into kept or lost."
- **C6 (boundaries, always):** "Current boundaries. Before 2 June 2014 Telangana shows
  undivided Andhra Pradesh. Jammu & Kashmir is drawn including Ladakh. Dadra & Nagar
  Haveli and Daman & Diu carry the merged UT's value from 26 January 2020. Chhattisgarh,
  Jharkhand and Uttarakhand, formed in November 2000, are drawn for all of 2000."
- **C7 (control, long form):** "Association, not effect. n = {E}; no test is run.
  Elections entered this file largely because a recorded scheme preceded them, so the
  no-scheme row is thin by construction. The uniform expectation assumes full
  five-year terms, and early elections break it. By-party counts measure first how many
  of a party's schemes the research recorded."
- **C8 (clock, under TimeLanes):** "Every election carries the same 12-month band,
  whether or not a scheme falls in it. There is an assembly election somewhere in India
  almost every year, so a launch in an election year is the base case, not a signal.
  Bars run from launch to a dated discontinuation. An undated end is drawn to today and
  labelled."
- **C9 (ministers):** "A row records an action on the record, with the party recorded at
  that date. It is not a tally of credit, and it is not sorted by one."
- **C10 (beyond the beneficiaries):** "A row names a channel through which money or
  advantage moved, as a source records it. It is an allegation only where the tier says
  alleged. Amounts are not totalled, because channels differ in kind."
- **C11 (scheme card, money block):** "Counts are dated snapshots from different
  sources, not a series, and are not interpolated. Enrolled is not paid."

---

## 9. Empty, partial, loading and no-data states

| situation | render |
|---|---|
| **Fleet not promoted** (`WELFARE_META.empty`, which is today's state) | Full chrome. Strip `0 schemes`, `as of not yet promoted`. `Callout label="Register not yet promoted" tone="note"`: "The distribution-funds research has not been promoted into the build. Nothing below is zero — it is unmeasured." All 36 states are hatched. Clock axis drawn, with every row empty-labelled. The ControlCard reads `No elections recorded — the control cannot run.` `GapsPanel` has one gap. **Smoke must pass in this state.** |
| Partial years (the common case) | Axis always 2000→asOf. The coverage ribbon shows hatch or stipple per year, and the status line reads `figures for {k} of {n} scheme-years · {full} of 27 years complete`. A metric never rescales its axis to the years it has. |
| Filters give 0 schemes | Strip `filtered N → 0`. Swept states flat, others hatch. A line above the map reads "No scheme in this file matches {filters}. This is a statement about the file, not about India." plus Reset. |
| `y` with no launches or elections | Normal render: the empty column is visible in the all-states row, and the ballot key reads `no election recorded in {y}`. |
| Money metric, no figure anywhere for `fy(y)` | Swept states with live schemes stippled; the others flat or hatched. The line reads "No {metric} figure located for FY {fy} in any state in view." |
| Metric option not honourable | Disabled with the reason on the option (§7.3). A stale `m` in the URL falls back to `live`, with the notice from §3.3. |
| `st` not swept / swept-empty | Texts in §5.6b. |
| `s` unknown | Text in §5.6c. |
| No `WELFARE_ELECTIONS` | Ballots absent. ControlCard and TwoByTwo are replaced by "No elections recorded — the control cannot run. This is the most important gap on the page." Derived gap added. |
| Alleged item, no response | Amber "No response on record in this file", plus a derived gap. |
| Base rate denominator 0 or null | `not computed`. |
| Narratives / voids empty | Every ladder rung still drawn with `— none in this file`. Voids: `No voids recorded in this file.` |
| Loading | Only the lazy route chunk (§3.1 fallback). There is no data loading state, because the data is compiled in. |

---

## 10. Mobile and narrow widths (< 640px, `useNarrow()` = `matchMedia('(max-width: 639px)')`)

- The header standfirst drops to the Kicker and PageTitle only. The strip wraps to two
  lines and stays sticky.
- The FilterBar collapses into `<details>` labelled `Filters ({active}) · {N} → {k} schemes`.
  Inside it, Metric becomes a `<select>`, and each disabled option's reason moves into
  its label text.
- A **scrubber row is pinned above the map**: full-width native range, `‹ ›`, `All`,
  44px touch height. It stays in view because the clock is below the fold on a phone.
- The map is 420px high and full width. There is no hover: a tap sets `st`, and the
  StatePanel renders directly **below the map** (the margin becomes a normal block).
  The hover-preview row is not rendered.
- TimeLanes scrolls horizontally inside its own container with a sticky 96px label
  column. The page itself never scrolls horizontally at 360px.
- The SchemeCard renders full width below the clock, and `scrollIntoView` fires once on
  `s` change (`behavior: 'auto'` under reduced motion).
- Ballots keep their 7-unit size. The SVG scales with the map, and the legend spells
  out the key in text, so a reader never has to read the glyph alone.
- Viewport check at 360, 768, 1280×800 and 1560, reusing the
  `scratchpad/geo-e2e.mjs` pattern. Assertions: no horizontal page scroll, and the
  scrubber in the first viewport at 1280×800.

---

## 11. Table twin

`view=table` replaces the stage (map + clock + margin) while the FilterBar stays. The
same tables also render on every viewport inside `<details>` under the stage when
`view=map`, so a screen-reader user never needs the toggle. All rows come from the
same `welfareView` functions as the graphics.

1. **State × year matrix, for the current metric.** This is the map's true twin. There
   is one row per state (all 36, alphabetical by name) and one column per year from
   2000 to 2026. Cells contain `—` for not swept, `0` for swept-none, the formatted
   value, or `partial {k}/{n}`, `no figure` or `unit n/c` for stipple. The selected `y`
   column is outlined, and the header states the metric and FY rule.
2. **Schemes** (judge §8 columns, adopted as written): Scheme | State | Level | Party |
   Category | Announced | Approved | Launched | Benefit as of `y` | Beneficiaries |
   Outlay latest FY | Next election (date · months · result) | Latest status | Findings
   D/R/A/An | Sources. Rows sort by `launched.date`, nulls last, then id.
3. **Elections**: State | Election | Date | Incumbent | Winner | Outcome class | Fresh
   scheme @6 / @12 / @24 m | Schemes counted as fresh (names). Rows sort by date, then
   state.
4. **Lanes**: Scheme | Event | Date | Note | Source. One row per bar start, status glyph
   and undated status.

---

## 12. What the page refuses to show, and why

- **R1. Party as colour** on the map, lanes, ballots or tables. A partisan palette is
  an editorial frame, and family hue is frozen for other meanings.
- **R2. Any ranking or score of a state, party or person**: no "freebie index", no
  generosity rank, no "most schemes" sort. Tables sort by date or name.
- **R3. A scatter or fitted line of outlay against seats or vote share.** n is in the
  tens and confounded by everything in C5. The 2×2 with named cells is the ceiling.
- **R4. Per-capita values.** There is no population denominator in the contract, and
  per-head per beneficiary is a different, labelled quantity.
- **R5. Summed per-head amounts across schemes.** They may reach the same person.
- **R6. Central values painted or added onto states, and arcs from the Union to states
  (`GeoNetwork`).** Both would draw a constant as a difference, or invent flows.
- **R7. "Ruling party in year y" as a layer.** Inferring it from winners fails in
  exactly the cases readers care about: defections, President's rule and coalition
  collapses.
- **R8. Interpolated beneficiary or outlay series, and inflation-adjusted amounts.**
  There is no deflator in the contract.
- **R9. Autoplay, animated scrubbing and fill transitions.** They add motion without
  information and hide the frames between.
- **R10. A default year, state, party, scheme or category.** The default is all years,
  unfiltered, with nothing selected.
- **R11. A network graph of who-else-benefits.** It is bipartite (scheme × channel),
  and a network would show degree and hide value.
- **R12. Totals of who-else-benefits amounts.** The channels differ in kind: a bank
  float, a BC commission, a vendor contract and party mobilisation are not additive.
- **R13. A colour or badge meaning "pre-election", "suspicious" or "vote-buying".** The
  lid is a timing fact with its denominator in the same frame.
- **R14. Any private individual.** Beneficiaries are classes, and persons appear only in
  public roles.
- **R15. An alleged item without its response slot**, even when the slot is empty.

---

## 13. Build estimate

**Create**

| file | est. lines | contents |
|---|---|---|
| `src/pages/Welfare.tsx` | 520 | page, URL state, FilterBar, stage grid, sections §5.8–5.14 |
| `src/data/welfareView.ts` | 460 | §6.5 derivations, `canon`, `BINS`, `electionRows`, `stateYearMatrix`, coverage, derived gaps |
| `src/components/viz/TimeLanes.tsx` | 360 | §6.2 |
| `src/components/welfare/SchemeCard.tsx` | 260 | §5.6c |
| `src/components/welfare/StatePanel.tsx` | 150 | §5.6b |

**Modify**

| file | change |
|---|---|
| `src/components/viz/IndiaMap.tsx` | + `bins`, `fillClass`/`classes`, stipple pattern, `ballots`, `onHover`, legend counts (~140 lines). Defaults unchanged, so `/map`, `/resources` and `/states` are unaffected. |
| `src/components/Domain.tsx` | + `TwoByTwo`, `ControlCard`, `NarrativeLadder` (~200 lines) |
| `src/App.tsx` | lazy route `/welfare` |
| `src/components/Layout.tsx` | nav "Distribution funds" |
| `scripts/smoke.mjs` | `/welfare`, `/welfare?y=2023&m=share&st=mp`, `/welfare?y=2019&m=perhead&cat=farmer-cash`, `/welfare?view=table`, `/welfare?s=does-not-exist` |
| `docs/INDEX.md` | link this draft beside WELFARE_PAGE.md |

Total ≈ 2,150 lines. Gates: `npx tsc -b`, `npm run build`, `npm run validate` and
`npm run smoke`, **run once against today's empty generated module and once against a
fixture fleet file**. Then a greyscale screenshot of the map legend to verify §7.2.

---

## 14. Open risks for review

1. **Ballots can be read as a verdict at a glance.** A filled square with a lid next
   to a hollow square without one invites a causal read, and the file's elections are
   selected *because* a scheme preceded them. Mitigation: C5 in place, the ControlCard
   at rest with n and "no test is run", and ballots for every election. If review finds
   this still reads as causal, drop the lid from the map and keep it only in the
   ControlCard and the lanes.
2. **Sparse figures make the money and per-head maps mostly stipple.** That is honest,
   but it may make the default-adjacent views look broken. Mitigation: `live` is the
   default, the coverage ribbon says `k of 27`, and a metric with too few figures to
   bin is disabled with its n on the option. Do not "fix" this by relaxing the partial
   rule.
3. `canon()` is a hand-written party table. It is a resolution surface, so it lives in
   code with a source comment per mapping, and unmapped strings surface as gaps rather
   than silently passing.
