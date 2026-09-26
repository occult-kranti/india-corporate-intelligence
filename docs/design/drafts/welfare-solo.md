# /welfare — distribution funds, 2000–2026: design spec

*Status: synthesised spec for the build. Author role: designer / judge. As of 2026-09-25.*
*Data contract: the welfare fleet contract (`schemes`, `entities`, `claims`, `elections`,
`baseRates`, `narratives`, `voids`, `symmetryCheck`, `gaps`), files at
`research/raw/welfare/*.json`. Design against the contract, not against any record.*

> **Judging note.** The judge was handed an empty list of designer specs (`[]`). No
> competing specs existed to score or graft from, so this document is written from first
> principles against the skills (`interface-design`, `frontend-implementation`,
> `pattern-discipline`, `india-map`, `cui-bono`), `HANDOFF.md`, the shared components and
> the two register pages (`Resources.tsx`, `PmCares.tsx`). Every point where two
> reasonable designs would diverge is resolved explicitly in §13 so the builder has
> nothing left to choose.

---

## 1. Purpose (one paragraph)

The page records who put cash, grain, power and goods into citizens' hands through state
and central distribution schemes from 2000 to 2026 — Ladli Behna, Ladki Bahin, Lakshmir
Bhandar, Gruha Lakshmi, Rythu Bandhu, KALIA, Orunodoi, Maiya Samman, PM-KISAN, PMGKAY and
the rest — where and when each one ran, which minister announced it and which cabinet
approved it, what it paid and to how many, how close to which election it launched, what
happened in that election, and what became of the scheme afterwards. It holds two
hypotheses at equal weight — *"cash transfers buy elections"* and *"cash transfers are
welfare, not bribes"* — and gives the reader the control that tests them: every election
in the file, whether or not a scheme preceded it, with every party measured in the same
columns. It asserts no motive. The map is the centre because a scheme is a jurisdiction:
where a scheme applies is set by who governs that place.

## 2. The reader's questions, in order

The layout answers these top to bottom. A first-time reader should get answers to 1–5
from the header, the control and the map alone, in under two minutes.

1. **How much of this is there, and how much has been recorded?** → header + denominator strip.
2. **Does launching a scheme before an election go with keeping power — for every party?** → §4.2 the control (three 2×2 tables + timing distribution).
3. **Where and when did schemes run, year by year, 2000–2026?** → §4.3 map + year scrubber.
4. **For one scheme: who announced it, who approved it, which ministers carried it, which party?** → §4.5 scheme dossier.
5. **How much per head, to how many, what share of the budget — and how close to which election, with what result?** → dossier lifecycle + money blocks.
6. **What happened to it afterwards — raised, cut, tightened, renamed, stopped, promised and never paid?** → dossier status history; timeline glyphs.
7. **What did evaluations, audits, courts and surveys find?** → dossier results, tiered, allegations beside their answers.
8. **Who else gained — banks, correspondents, vendors, the party?** → §4.8 who-else-benefits ledger + scheme graph.
9. **Does the same lens produce the same picture on every party?** → §4.6 party ledger + symmetry check.
10. **Which narratives hold up?** → §4.7 narrative ledger.
11. **What is missing?** → voids, gaps, sources.

## 3. Route, data module, URL state

- **Route:** `/welfare`, lazy-loaded (`React.lazy`) in `src/App.tsx`. Nav label in
  `Layout.tsx`: **"Distribution funds"**, in the same group as PM CARES and Resources.
- **Data:** `src/data/welfare.ts`. It imports the merged fleet output from
  `./welfare.generated` (produced by `npm run generate`, in flight). If the codegen has
  not landed when the page is built, `welfare.ts` instead does
  `import.meta.glob('../../research/raw/welfare/*.json', { eager: true, import: 'default' })`
  and merges in the same shape. **One or the other, never both.** Zero files must yield
  empty arrays, not a crash (see §9).
- **Every figure on the page is derived in `welfare.ts` at module scope or in `useMemo`.
  No literal figures in `Welfare.tsx`.**

### URL parameters (all via `useSearchParams`, `replace: true`, same `setParam` helper as `Resources.tsx`)

| param | values | default (absent) | effect |
|---|---|---|---|
| `y` | `2000`…`2026` | absent = **all years** | Year slice for the map, state panel, central rail. Calendar year for launches/elections/status; FY `y`–`y+1` for money. |
| `m` | `live` \| `budgeted` \| `actual` \| `share` | `live` | Map fill metric (§5.1). `budgeted`/`actual`/`share` require `y`; with `y` absent those options are disabled and the control says "choose a year — money is per financial year and is never summed across years". |
| `cat` | comma list of contract categories | absent = all | Filters schemes everywhere (map, rail, timeline, dossier list, tables, party ledger, 2×2). |
| `party` | comma list of party strings as recorded | absent = all | Same reach as `cat`. Never pre-selected. |
| `lvl` | `state` \| `central` \| `all` | `all` | Filters the table twin, timeline and rail. The map is state-only regardless (§13 D2). |
| `st` | state code | absent | Selected state → state panel. Set by map click, Enter on keyboard, or timeline lane label. |
| `s` | scheme id | absent | Opens the dossier for that scheme. Deep-linkable. |
| `tier` | comma list of `documented,reported,alleged,analytic` | absent = all four | Filters results and who-else-benefits rows. The control shows "k of n results" live. |
| `view` | `map` \| `table` | `map` | Swaps the map centre for its table twin (§8). |
| `q` | free text | empty | Filters the table twin by scheme name / alias / person label. |

No window-length parameter: the pre-election window is shown at 6, 12 and 24 months
simultaneously (§13 D3). Unknown values of any param fall back to the default silently
and the denominator strip shows the unfiltered state.

## 4. Layout, top to bottom

Page container `max-w-[1180px]`, same as PM CARES. Chrome identical to the other
register pages; only the centre differs.

### 4.0 Header

- `Kicker`: `Distribution funds · cash, grain and goods schemes · 2000–2026`
- `PageTitle`: **Who announced the money, when, and what happened next**
- `Standfirst` (fixed copy):
  "Two readings of India's cash-transfer schemes compete: that they are bought votes, and
  that they are welfare that happens to be popular. This page does not choose. It records
  who announced and approved each scheme, what it paid, how close to an election it
  launched and what that election did — and then runs the same count on every election
  in the file, including the ones no scheme preceded, for every party that governed."
- `Byline`: `{SCHEMES.length} schemes · {statesWithAny} states and UTs · {parties} parties · {assemblyElections} assembly elections recorded · as of {WELFARE_AS_OF}`

### 4.1 `DenominatorStrip` (sticky, existing, `src/components/Domain.tsx`)

```ts
<DenominatorStrip
  asOf={WELFARE_AS_OF}
  filtered={{ from: SCHEMES.length, to: inView.length }}
  facts={[
    { n: inView.length, of: SCHEMES.length, label: 'schemes in view' },
    { n: statesInView, of: 36, label: 'states & UTs with a state scheme in view' },
    { n: partiesInView, label: 'parties' },
    { n: assemblyElections, label: 'assembly elections recorded' },
    { n: outlayRowsWithActual, of: outlayRows, label: 'outlay rows with an actual, not a budget' },
    { n: documentedResults, of: totalResults, label: 'results from a primary record' },
  ]}
/>
```

`WELFARE_AS_OF` = the latest `asOf` across files (ISO string max). If files carry
different `asOf`s, the strip's `as of` reads `{min}–{max}` (derive; do not pick one).

### 4.2 Section — **"The control: every election, with and without a scheme"**

`Section title="The control: every election, with and without a scheme" note="Run first, because it decides what the map can mean"` — placed **before** the map, as PM CARES
places its control first.

**(a) `Callout label="Symmetry check" tone="note"`** — renders each file's
`symmetryCheck` string verbatim, prefixed with the domain name in mono. No editing.

**(b) Three `TwoByTwo` tables side by side (new component, §6.3)** for windows of 6, 12
and 24 months. Grid `sm:grid-cols-3`, stacked on mobile.

Derivation, in `welfare.ts` as `electionControl(windowMonths, filters)`:

- Unit: each record in `ELECTIONS` with `election` matching `/assembly/i`. Lok Sabha
  elections are excluded here (different unit; listed in the table twin).
- **Exposed** = there exists a state-level scheme `s` in view with `s.st === e.st`,
  `s.party === e.incumbentParty`, and either `s.launched.date` or a `benefit.changes[]`
  date with a higher amount than the previous one (a raise), falling in
  `[e.date − windowMonths, e.date]`. Declared before looking; do not add clauses.
- **Retained** = `norm(e.winner) === norm(e.incumbentParty)` where `norm` lowercases and
  trims.
- **Unclassified** (a third column, never folded into either): `incumbentParty` or
  `winner` null, or either string contains `+`, `/`, `alliance`, `front`, `NDA`, `UPA`,
  `INDIA`, `Mahayuti`, `MVA` (case-insensitive) — coalition outcomes are not forced into
  retained/lost. Also: an election whose only candidate scheme has `launched: null`
  counts as not-exposed and is listed under the table as "announced but no launch date
  recorded: n".
- Cells: counts. Row rates: `retained / (retained + lost)` printed as `a of b`, never as a
  bare percentage. Under each table: `one election moves this row by up to {100/min(rowN)} points`.
- Each cell is a `<details>`: expanding lists every election in it as
  `{State} · {date} · {incumbent} → {winner}`, linking to `?st=`.
- **No significance test is run.** Print: `n = {E}. No test is run at this n.`

**(c) Timing distribution** — existing `Distribution` from `src/components/viz/Charts.tsx`.

```ts
<Distribution
  xLabel="Months from launch to the next assembly election in the same state"
  series={[
    { name: 'Schemes in this file', bins: observedBins },
    { name: 'Expected if launch timing were uniform across a 5-year term (analytic)', bins: uniformBins },
  ]}
  caption={…see §7 C5…}
/>
```

Bins: `0–12`, `12–24`, `24–36`, `36–48`, `48–60`. Schemes with no later election in the
file, or no `launched.date`, are **not** binned; their count is printed beside the chart
("{k} schemes have no later election in the file · {j} have no launch date"). `uniformBins`
= binned count × 0.2 per bin. Months are **recomputed** from `launched.date` and the next
`ELECTIONS` record for that state — not read from `electionContext.monthsFromLaunch`;
where the two disagree by more than 1, list the scheme under the chart as
"recorded vs computed months differ".

### 4.3 Section — **"Where and when"** (the centre)

`Section title="Where and when" note="A scheme is a jurisdiction: where it applies is set by who governs that place"`

**Control bar (above the map, full width, wraps):**

1. **`YearScrubber`** (new, §6.1) — `min=2000 max=2026 value={y ?? null}`; an **All years**
   button that clears `y`; step buttons `‹ {y-1}` / `{y+1} ›`. Beneath the slider, a
   27-column tick histogram in two rows: *launches recorded* (above) and *assembly
   elections recorded* (below), each row on its own fixed integer scale, filtered by
   `cat`/`party`/`lvl`. Readout: `{y}: {n} schemes live of {N} in view · {e} elections`.
   **No autoplay.**
2. **Metric** — segmented control bound to `m`. Each option shows its coverage live:
   `Live schemes` · `Budgeted ₹ cr — {k} of {n} live schemes have a figure for FY {y}` ·
   `Actual ₹ cr — {k} of {n}` · `Share of state budget — {k} of {n}`.
3. **Category** — chip row bound to `cat`; each chip shows its count in view, e.g.
   `women-cash (9)`. Categories with zero schemes in the file are **shown disabled with
   (0)**, not hidden.
4. **Party** — multi-select bound to `party`, options alphabetical with counts. When
   active, a line under the bar reads: "Showing one side. The party ledger below measures
   every party in the same columns." (link to `#party-ledger`).
5. **Level** — `State / Central / All`, bound to `lvl`, with the note
   "central schemes are listed beside the map, not painted".
6. **Reset** — clears every param except `view`.

**Grid:** `lg:grid-cols-[7fr_5fr] gap-6`; single column below `lg`.

**Left: `IndiaMap`** (existing, with two small additive props — §6.5):

```ts
<IndiaMap
  data={stateValues}                 // welfare.ts: stateValues(y, m, filters)
  metricLabel={METRIC_LABEL[m]}      // 'Schemes live' | 'Budgeted, ₹ cr' | 'Actual, ₹ cr' | 'Share of state budget'
  unit={METRIC_UNIT[m]}              // '' | '₹ cr' | '₹ cr' | '%'
  scaleMode={m === 'live' || m === 'share' ? 'linear' : 'log'}
  domain={METRIC_DOMAIN[m]}          // NEW: fixed across all 27 years (§6.5)
  zero={{ label: y ? `swept — none live in ${y}` : 'swept — none recorded' }}  // NEW
  selected={st}
  onSelect={(c) => setParam('st', c)}
  showMarks={false}
  height={narrow ? 440 : 620}
  format={METRIC_FORMAT[m]}
/>
```

`stateValues` rules (every one is a claim; implement exactly):

- **Swept states** = every `st` appearing in any scheme or any `ELECTIONS` record in the
  file. A state not swept gets **no entry** → hatch ("no data — not zero").
- `live`: count of state-level schemes in view with `launched.date ≤ {y}-12-31` and no
  `discontinued` status dated `< {y}-01-01`. With `y` absent: count of state-level schemes
  in view ever launched. Swept with count 0 → `value: 0` (renders the `zero` fill).
- `budgeted` / `actual` / `share`: sum over live schemes of the FY `{y}-{(y+1)%100}` row's
  `budgetedCr` / `actualCr` / `pctOfStateBudget`. **If any live scheme lacks the figure,
  the state gets `value: null`** with
  `detail: "partial — ₹{sum} cr across {k} of {n} live schemes; not plotted, a partial sum is a lower bound"`.
  Swept with no live schemes → `value: 0`. Budgeted and actual are never mixed.
- **Boundary mirroring** (current geometry, historical data): before 2014-06-02 the `tg`
  polygon takes `ap`'s value with `detail: "undivided Andhra Pradesh until 2 June 2014 — value is AP's"`;
  from 2020-01-26 `dn` and `dd` take the merged UT's value (whichever code the data uses)
  with `detail: "merged UT since 26 Jan 2020"`. `jk` is drawn including Ladakh; detail
  notes it from 2019-10-31. Nothing else is mirrored.
- Every `MapDatum.detail` ends with the party/parties of the live schemes as text:
  `"· launched by: BJP (2), INC (1)"`. **Party is text, never fill.**

Below the map: `Caption C1–C3` (§7), then the frozen legend from `IndiaMap` itself.

**Right panel (sticky on `lg`, `top` below the strip):**

- **No `st` selected → "Central schemes"** rail: every central scheme in view live in
  `y` (or ever, if `y` absent), one row each: name · launching party · launched date ·
  benefit as of `y` · latest status. Click → `s`. Header line:
  `{k} central schemes · applies to all states · not painted on the map`.
- **`st` selected → State panel**: state name; `Link` to `/states/{st}`; list of every
  state-level scheme in view for that state, **all years**, ordered by `launched.date`
  then `id`, with the rows live in `y` marked `live in {y}` in mono. Each row: name ·
  party · launched · per-head benefit as of `y` (latest `benefit.changes` ≤ `y`, else base)
  · latest status ≤ `y`. Click → `s`. Then **Elections in this state in the file**: date ·
  incumbent → winner · exposed@12m yes/no. Then a close button (clears `st`).
- State swept but empty under filters: "No scheme from {State} matches the current
  filters. The state is in the sweep; this is a statement about this file."
- State not swept: "{State} was not swept by the research fleet. Hatched means unknown,
  not none." Plus the relevant `gaps` entries if any mention the state name.

**When `s` is set, the `SchemeDossier` (§4.5) renders directly beneath this grid**, full
width, and the page scrolls it into view once (`scrollIntoView({block:'start'})`,
`behavior:'auto'` under reduced motion).

### 4.4 Section — **"Launches, changes and elections on one clock"**

`Section title="Launches, changes and elections on one clock" note="Every election in the file carries the same window, whether or not a scheme falls in it"`

`ElectionTimeline` (new, §6.2) — lanes: **Central** first, then every swept state
alphabetical by name. Never sorted by a count. Bound to `cat`, `party`, `lvl`; clicking a
launch glyph sets `s`; clicking a lane label sets `st`. Selected scheme's glyphs render in
`--color-accent`, all others in `--color-text-secondary`. Captions C4.

### 4.5 `SchemeDossier` (new, §6.4) — opens on `s`

Full-width article, border `border-border`, header strip `bg-bg-elevated`. Blocks in
this order:

1. **Header** — name; aliases (`al`, including Devanagari etc.) in mono; state name or
   `Central · all states`; party (text); category; close link (clears `s`).
2. **Lifecycle row** — four equal cells: *Announced* (date · person label · office ·
   `Cite`), *Approved* (date · body · `Cite`), *Launched* (date · `Cite`), *Election*
   (name · date · months from launch · incumbent · result · seat change · `Cite`). A
   missing stage reads `not located` in mono muted — never `—` alone.
3. **Who carried it** — `DataTable` columns `Person | Role | Action | Date | Party | Source`
   from `scheme.ministers`, sorted by date then personId. Person label from `ENTITIES`;
   `pol:` ids link to `/cabinet`; an unresolved entity renders its label plus
   `(identity not confirmed)` and no link. `action: opposed` rows are shown, not filtered.
4. **What it pays** — `DataTable` `Date | Amount | Unit | Note | Source`: base benefit
   first, then every `benefit.changes[]`. Earlier amounts stay visible; nothing is struck
   through. Any `promised-not-enacted` status appears here as a row with Amount prefixed
   `promised:` in amber text.
5. **How many, how much** — two `DataTable`s: *Beneficiaries* `As of | Count | Source`
   and *Outlay* `FY | Budgeted ₹ cr | Actual ₹ cr | % of state budget | % of GSDP | Source`.
   Nulls render `not located`. Caption C6.
6. **What happened to it** — `status[]` as an ordered list by date:
   `{date} · {status} · {note}` + `Cite`. Mono status label, no colour coding.
7. **What evaluations found** — `results[]` filtered by `tier`. Each: `TierChip` +
   finding + `Cite`. **Every `alleged` result renders as a two-column symmetric block**:
   left the allegation, right the matching `contra` claim(s) from `CLAIMS`
   (`pred === 'contra'` and `t` or `s` equal to the scheme id or to `claim:<id>` of a claim
   about this scheme), each column the same width and weight. The right column's border
   is `border-rose/40` (rose = denial, its reserved meaning). No match → right column reads
   **"No response on record in this file"** in `text-amber`, and `welfare.ts` adds a gap
   (§9). Empty results: "No evaluation, audit, court finding or survey located for this
   scheme. Recorded as a gap."
8. **Who else benefits** — `DataTable` `Who | How | ₹ cr | Tier | Response | Source` from
   `whoElseBenefits`, filtered by `tier`. `amountCr: null` → `not stated`. Alleged rows
   follow the same response rule as (7). Empty: "None recorded — which is not the same as
   none." Caption C9.
9. **Sources** — `Cite` of `scheme.srcs`.

### 4.6 Section — **"Every party, same columns"** (`id="party-ledger"`)

`DataTable`, one row per party in view, **alphabetical**. Columns (all derived):

`Party | Schemes (state / central) | States | Launched or raised ≤12 m before an assembly election | Promised, not enacted | Cut · tightened · paused · discontinued | Results D / R / A / An | Alleged results answered (k of n) | Elections as incumbent: retained / lost / unclassified`

Caption C8. Below it, `ContestedFact` is **not** used here (it requires named holders);
the symmetry text is already in §4.2.

### 4.7 Section — **"Narratives, rated"**

`NarrativeLedger` (new, §6.3) over `NARRATIVES`, ordered by status
(`established → well-supported → contested → speculative → unsupported → debunked`)
then claim text. Status labels are mono text, all the same colour.

### 4.8 Section — **"Who else gains"** and the scheme graph

- Aggregate `DataTable` across all schemes in view: `Scheme | Who | How | ₹ cr | Tier | Response | Source`,
  sorted by scheme launch date then `who`. Filtered by `tier`. Caption C9.
- **Scheme graph** — `GraphExplorer` (existing, lazy) with `nodes`/`edges` from
  `src/graph/welfare.ts` (fleet entities + claims converted to `GNode`/`GEdge`),
  `defaultQuery={selectedScheme?.name ?? ''}`, `height={narrow ? 480 : 620}`. Tier dash
  and family hue exactly as elsewhere. Caption C10.

### 4.9 Section — **"Base rates"**

`DataTable` over `BASE_RATES`: `Property | Numerator | Denominator | Rate | Reference class | Source`.
`denominator === 0` → Rate cell `not computed` (never `0%`, never `NaN`). Rates printed as
`a of b (x%)`.

### 4.10 Section — **"What the record does not contain"**

`VOIDS` rendered at body size: each `what` in `text-text`, `whyItMatters` beneath,
`Cite`. Same visual weight as findings.

### 4.11 Section — **"Gaps"** → `GapsPanel` (existing)

`gaps` from all files (as `{what, why: domain}`), plus derived gaps: alleged items with
no response; schemes with no `launched.date`; recorded-vs-computed month mismatches;
states in the contract's symmetry list (MP, MH, OR, AS, CT, DL, HR, BR, KA, HP, TG, WB,
TN, AP, JH, PB) that are not swept. `note`: "Absence is a result here; each line bounds
what the sections above can say."

### 4.12 Section — **"Sources"** → `SourceLedger` (existing)

Union of every file's `sources`, deduped by URL, sorted by label. `primary` =
`/\.gov\.in|\.nic\.in|eci\.gov\.in|rbi\.org\.in|cag\.gov\.in|indiabudget\.gov\.in|sansad\.in/i.test(url)`.
PRS, press and Wikipedia are secondary.
`establishes: 'See per-claim citations above.'`, `retrieved` = the file's `asOf`.

### 4.13 `Footnote`

`TierLegend` (existing) + standing note: "This page records public schemes, public
offices and published claims. It asserts no motive and no offence. Allegations are
attributed and paired with the response of those they concern. Persons appear only in
public roles."

## 5. Visual encodings — what each channel means

### 5.1 Map (`IndiaMap`)

| channel | means | notes |
|---|---|---|
| fill, sequential ramp (`DEFAULT_RAMP`) | value of metric `m` for schemes **in this file** in year `y` | fixed `domain` across all years so scrubbing is comparable; `linear` for counts and %, `log` for ₹ cr |
| hatch (existing no-data pattern) | not swept, or a figure not located / partial | legend reads `no data ({k} of 36) — not zero` |
| flat `#15171c` fill (new `zero`) | swept, value is genuinely 0 | legend entry uses the `zero.label` text |
| accent stroke | selected state | existing |
| party | **not encoded** | text in readout and panel only |
| marks | **none** | `showMarks={false}` |

### 5.2 Year scrubber tick histogram

| channel | means |
|---|---|
| bar height, upper row | launches recorded in that calendar year (filtered) |
| bar height, lower row | assembly elections recorded in that year (filtered by `party` = incumbent party) |
| accent outline on a column | the selected `y` |

The two rows have **separate** integer scales, each labelled with its max.

### 5.3 `ElectionTimeline`

| channel | means |
|---|---|
| x | date (month precision), 2000-01 → 2026-12 |
| lane | jurisdiction (Central, then states alphabetical) |
| glyph shape | event type: `■` launch · `□` promised, not enacted · `▲` raised · `▼` cut · `◆` eligibility tightened · `‖` paused · `×` discontinued · `↻` renamed |
| vertical 1px rule | assembly (or Lok Sabha, in the Central lane) election |
| cap on the rule | filled circle = incumbent retained · hollow = lost · none = unclassified |
| faint band `rgba(232,228,220,0.04)`, 12 months before each election | the analytic window; its left edge is stroked with the **analytic tier dash `8 3 2 3`** because the window is our construct |
| accent colour | selected scheme's glyphs only |

No hue carries party, category or outcome.

### 5.4 Frozen (the builder may not adjust these to make things fit)

- `strokeDasharray` = evidence tier everywhere, including the timeline band edge (analytic).
- Family hue and node shape in `GraphExplorer`.
- Hatch ≠ zero fill ≠ lowest ramp step: three visibly distinct states.
- `--color-rose` only on denial/response columns.
- Fixed map domain across years.

## 6. Components

### 6.1 NEW `YearScrubber` — `src/components/viz/YearScrubber.tsx`

```ts
interface YearScrubberProps {
  min: number;                 // 2000
  max: number;                 // 2026
  value: number | null;        // null = all years
  onChange: (y: number | null) => void;
  rows: { label: string; counts: Record<number, number> }[];   // [launches, elections]
  allLabel?: string;           // 'All years'
}
```

Native `<input type="range">` (keyboard for free), 44px touch height, mono year readout
at `text-2xl`. Histogram is an inline SVG `role="img"` with `<title>` summarising both
rows. When `value === null` the slider thumb renders at `max` but dimmed and the readout
says `All years`; moving it sets a value. No animation, no autoplay.

### 6.2 NEW `ElectionTimeline` — `src/components/viz/ElectionTimeline.tsx`

```ts
type TimelineEventKind = 'launch' | 'promised' | 'raised' | 'cut' | 'tightened' | 'paused' | 'discontinued' | 'renamed';
interface TimelineEvent { schemeId: string; date: string; kind: TimelineEventKind; label: string }
interface TimelineElection { date: string; label: string; outcome: 'retained' | 'lost' | 'unclassified' }
interface TimelineLane { key: string; label: string; events: TimelineEvent[]; elections: TimelineElection[] }
interface ElectionTimelineProps {
  lanes: TimelineLane[];
  range: [number, number];          // [2000, 2026]
  windowMonths: number;             // 12, fixed
  selectedSchemeId?: string | null;
  onSelectScheme?: (id: string) => void;
  onSelectLane?: (key: string) => void;
}
```

Mapping from `status[]`: `raised → raised`, `cut → cut`, `eligibility-tightened →
tightened`, `paused → paused`, `discontinued → discontinued`, `renamed → renamed`,
`promised-not-enacted → promised`; `live`, `announced`, `launched` statuses are not
drawn (the lifecycle already has them). Lane height 22px; state label column 120px,
`position: sticky; left: 0`. Container `overflow-x-auto`, SVG `min-width: 760px`.
Launch glyphs are `<a>`-like focusable (`tabIndex=0`, Enter selects); every glyph has a
`<title>` `{label} · {date}`. Election rules carry `<title>` `{label} · {outcome}`.
Legend row under the chart lists every glyph with its meaning, plus the band.

### 6.3 NEW in `src/components/Domain.tsx` (cross-domain; energy can use them)

```ts
export interface TwoByTwoCell { n: number; items: { label: string; href?: string }[] }
export function TwoByTwo(props: {
  title: string;                                     // 'Window: 12 months'
  rowLabels: [string, string];                       // ['Launched or raised in window', 'Neither']
  colLabels: [string, string];                       // ['Incumbent retained', 'Incumbent lost']
  cells: [[TwoByTwoCell, TwoByTwoCell], [TwoByTwoCell, TwoByTwoCell]];
  unclassified: TwoByTwoCell;                        // always rendered as a third column
  caption?: ReactNode;
}): JSX.Element;
```

Renders a real `<table>` (so it is its own table twin), mono tabular counts, each row's
`a of b` at the row end, each cell a `<details>` listing its items. No cell colouring.

```ts
export interface NarrativeRow {
  claim: string;
  status: 'established' | 'well-supported' | 'contested' | 'speculative' | 'unsupported' | 'debunked';
  strongestCase: string; strongestCounter: string; whatWouldChangeThis: string;
  srcs?: Source[];
}
export function NarrativeLedger(props: { rows: NarrativeRow[] }): JSX.Element;
```

Each row: claim in `text-text`; status mono label; **two equal columns** "Strongest case"
/ "Strongest counter" (the `ContestedFact` grid, same symmetry rule); "What would change
this" in a full-width footer; `Cite`.

### 6.4 NEW `SchemeDossier` — `src/components/welfare/SchemeDossier.tsx`

```ts
interface SchemeDossierProps {
  scheme: WelfareScheme;                       // type exported from src/data/welfare.ts
  personLabel: (id: string) => { label: string; resolved: boolean; href?: string };
  responsesFor: (schemeId: string) => WelfareClaim[];   // contra claims, precomputed
  tiers: Set<Tier>;                            // from `tier` param
  asOfYear: number | null;                     // from `y`, to mark the benefit row current in that year
  onClose: () => void;
}
```

Uses `DataTable`, `TierChip`, `Cite` only. Blocks exactly as §4.5.

### 6.5 MODIFIED `IndiaMap` — two optional props, backward compatible

```ts
/** Fix the colour domain so a value maps to the same shade across calls (a scrubber). Linear/log only. */
domain?: [number, number];
/** Render value === 0 as a distinct flat fill with this legend label, instead of the lowest ramp step. */
zero?: { label: string };
```

- With `domain`, `colorOf` uses it in place of `min/max(present)`; values outside clamp.
  Legend prints `{fmt(domain[0])} → {fmt(domain[1])}` instead of `low → high`.
- With `zero`, `value === 0` fills `#15171c` (distinct from `#0a0a0c` background, the
  `#101116` hatch ground and `#2e373f` ramp floor) and the legend adds a swatch with
  `zero.label`. The no-data count excludes zero-valued states.
- Absent props → current behaviour unchanged. Other pages untouched.

### 6.6 Existing, used as-is

`Kicker`, `PageTitle`, `Standfirst`, `Byline`, `Section`, `Prose`, `Callout`,
`DataTable`, `TierChip`, `TierLegend`, `Cite`, `Footnote` (Editorial); `DenominatorStrip`,
`GapsPanel`, `SourceLedger` (Domain); `Distribution` (Charts); `GraphExplorer`.
**Not used:** `GeoNetwork` (§10 R4), `ConcentrationCurve`, `RegimeSplit`,
`CompetitiveTension`, `TimeSeries` (benefit is a step function; `TimeSeries` joins
points linearly, which would draw amounts nobody paid — the table is used instead).

## 7. Captions the page must carry (what the graphic cannot honestly show)

Rendered as `text-[13px] text-text-muted max-w-[72ch]` directly under the graphic they
qualify, never in the footer.

- **C1 (map, always):** "Colour is {metric} for schemes recorded in this file, not all
  schemes in India. Central schemes are listed beside the map and not painted — they
  apply to every state. Hatched means not swept or no figure located, not zero. Party is
  not shown in colour."
- **C2 (map, `m=live`):** "A count measures the research sweep as much as the state: a
  state with more schemes here may have been researched more closely."
- **C3 (map, money metrics):** "Financial year {y}–{y+1}, nominal rupees, not adjusted
  for inflation — do not compare shades across decades. Budgeted and actual are never
  summed together. A state with a figure for only some of its live schemes is hatched,
  because a partial sum is a lower bound." **(boundaries, always):** "Current boundaries.
  Before 2 June 2014 Telangana shows undivided Andhra Pradesh's value. Jammu & Kashmir is
  drawn including Ladakh. Dadra & Nagar Haveli and Daman & Diu are drawn separately and
  carry the merged UT's value from 2020."
- **C4 (timeline):** "Every election in the file carries the same 12-month band, whether
  or not a scheme falls in it. There is an assembly election somewhere in India almost
  every year, so a launch in an election year is the base case, not a signal. This file
  records the elections the research needed, not every Indian election 2000–2026."
- **C5 (2×2 and distribution):** "Association, not effect. n = {E}; no test is run.
  Elections entered this file largely because a recorded scheme preceded them, so the
  'neither' row is thin by construction. Anti-incumbency, alliances, national waves,
  delimitation and candidate choice are not controlled. The uniform expectation assumes
  full five-year terms; early elections break it."
- **C6 (dossier money):** "Counts are dated snapshots from different sources, not a
  series — they are not interpolated. Enrolled is not the same as paid."
- **C7 (dossier results):** "Each finding carries its tier. An alleged finding is shown
  beside the response to it, at the same size."
- **C8 (party ledger):** "Every column measures, first, how many of a party's schemes
  the research recorded. A higher count is not a finding about the party until it is
  divided by the schemes that party could have launched, which this file does not hold."
- **C9 (who else benefits):** "A row names a channel through which money or advantage
  moved, as a source records it. It is an allegation only where the tier says alleged."
- **C10 (graph):** "Position carries no meaning. Line dash is evidence tier; hue is
  entity family. Persons appear only in public roles."

## 8. Table twin

`view=table` replaces the map + side panel (the control bar stays). Also rendered on
every viewport under a `<details>` "Table of every scheme in view" beneath the map when
`view=map`, so screen-reader users never need the toggle.

`DataTable` columns:

`Scheme | State | Level | Party | Category | Announced (date · by) | Approved (date · body) | Launched | Benefit (amount · unit · as of y) | Beneficiaries (count · as of) | Outlay latest FY (budgeted / actual ₹ cr · % budget) | Next election (date · months · result) | Latest status (date) | Results D/R/A/An | Sources`

Rows: schemes in view (all filters + `q`), sorted by `launched.date` ascending (nulls
last) then `id`. Nulls read `not located`. The scheme name links to `?s=`.

Second table (under the timeline, `<details>` "Every election in the file"):
`State | Election | Date | Incumbent | Winner | Exposed @6 / @12 / @24 m | Outcome class`,
sorted by date then state.

## 9. Empty, partial and no-data states

| situation | render |
|---|---|
| **No welfare files at all** (fleet not promoted) | Full chrome. Strip shows `0 schemes`. `Callout label="Register not yet promoted" tone="note"`: "The distribution-funds research has not been promoted into the build. Nothing below is zero — it is unmeasured." Map renders all 36 hatched. Timeline, 2×2, ledgers render their own empty lines. `GapsPanel` shows one gap. Smoke must pass in this state. |
| Filters leave 0 schemes | Strip `filtered N → 0`. Map: swept states at `zero`, others hatch. Line above the map: "No scheme in this file matches {filters}. This is a statement about the file, not about India." + Reset. |
| `y` with no launches | Normal render; the scrubber histogram shows the empty column. |
| Money metric without `y` | Options disabled; message in §3. |
| Money metric, all figures missing for `y` | Every swept state with live schemes hatched; line above map: "No {metric} figure located for FY {y} in any state in view." |
| `s` points at an unknown id | Dossier slot: "No scheme `{s}` in this file." + link clearing `s`. |
| `st` not swept | §4.3 text. |
| Election data missing for a scheme | Lifecycle Election cell: "no later election in this file". |
| `ELECTIONS` empty | 2×2 tables replaced by: "No elections recorded — the control cannot run. This is the most important gap on the page." and a derived gap. |
| Alleged item with no response | amber "No response on record in this file" + derived gap. |
| `baseRates` denominator 0 | `not computed`. |
| Narratives / voids empty | "None recorded in this file." |

Loading: none — static data, no async. `GraphExplorer` is lazy; its `Suspense` fallback
is a fixed-height `bg-bg-elevated` block with "Loading graph…" in mono (no spinner).

## 10. What the page refuses to show, and why

- **R1. Party as colour** — on the map or anywhere. A partisan palette is an editorial
  frame, and family hue is frozen.
- **R2. A ranking of states or parties by generosity, "freebie index" or any computed
  score.** Tables sort by date or name. Counts and declared ₹ only.
- **R3. A scatter or regression of outlay against seat change or vote share.** n is in
  the tens, confounded by everything in C5; a fitted line would carry a causal claim the
  data cannot. The 2×2 with named cells is the ceiling.
- **R4. Arcs from central ministries to states (`GeoNetwork`).** A central scheme
  applies everywhere; arcs would draw 36 identical lines from Delhi and read as flow.
- **R5. Central and state values summed on the map.** It would shift every state by the
  same amount and read as state generosity.
- **R6. Per-capita metrics.** The contract carries no population denominator; a
  per-head map built on an imported population series of a different year would mix
  vintages silently. Proposed for a later contract, not improvised.
- **R7. "Ruling party in year Y"** derived from election winners. Mid-term defections,
  President's rule and coalition collapses make that inference wrong in exactly the
  cases readers care about. The page shows only the party recorded on each scheme.
- **R8. Interpolated beneficiary or outlay series**, and budgeted mixed with actual.
- **R9. Inflation-adjusted amounts** — no deflator in the contract; nominal is stated.
- **R10. Autoplay / animated scrubbing.** It adds motion without information and
  hides the frames between keyframes.
- **R11. Any private individual** — beneficiaries are classes, never persons.
- **R12. An alleged item without its response slot**, even when the response is absent.
- **R13. A variable window control.** Letting the reader pick 6/12/24 invites
  window-shopping; all three are shown at once.
- **R14. Years before 2000 or after the file's `asOf`.**

## 11. Mobile (< 640px; `narrow` = `matchMedia('(max-width: 639px)')` in a small `useNarrow()` hook local to the page)

- Header and strip as elsewhere; strip wraps to two lines, stays sticky.
- 2×2 tables stack vertically; distribution full width.
- Control bar: scrubber full width first; metric becomes a `<select>`; category chips
  scroll horizontally in their own `overflow-x-auto` row; party a `<select multiple>`
  in a `<details>`; level a `<select>`.
- Map `height=440`, full width; hover readout is not relied on — tap sets `st` and the
  state panel renders **below** the map (not sticky).
- Dossier: lifecycle cells stack 1-up; all tables scroll inside their own containers.
- Timeline: horizontal scroll inside its container, sticky 96px lane-label column.
- `GraphExplorer` `height=480`.
- No horizontal page scroll at 360px. Verify with the viewport script
  (`scripts/graph-viewport.mjs` pattern) at 360, 768, 1280.

## 12. Build estimate

**Create**

| file | est. lines | contents |
|---|---|---|
| `src/data/welfare.ts` | 380 | types (`WelfareScheme`, `WelfareClaim`, `WelfareElection`, …), merge of fleet files (dedupe by id; duplicate id with differing content is a validator error, not a runtime pick), `WELFARE_AS_OF`, `inView(filters)`, `isLive(s,y)`, `stateValues(y,m,filters)`, boundary mirroring, `electionControl(w,filters)`, `timingBins()`, `partyLedger()`, `responsesFor()`, `derivedGaps()`, `METRIC_*` tables |
| `src/graph/welfare.ts` | 90 | fleet entities/claims → `GNode`/`GEdge`, schemes → `mechanism` nodes |
| `src/pages/Welfare.tsx` | 650 | the page |
| `src/components/viz/YearScrubber.tsx` | 130 | §6.1 |
| `src/components/viz/ElectionTimeline.tsx` | 280 | §6.2 |
| `src/components/welfare/SchemeDossier.tsx` | 280 | §6.4 |

**Modify**

| file | change |
|---|---|
| `src/components/Domain.tsx` | + `TwoByTwo`, `NarrativeLedger` (~160 lines) |
| `src/components/viz/IndiaMap.tsx` | + `domain`, `zero` props (~35 lines), defaults unchanged |
| `src/App.tsx` | lazy route `/welfare` |
| `src/components/Layout.tsx` | nav entry "Distribution funds" |
| `scripts/smoke.mjs` | `['/welfare', 'welfare']`, plus `/welfare?y=2023&m=budgeted&st=mp` and `/welfare?view=table` as extra smoke URLs |
| `scripts/validate.mjs` (§4 fleet block) | add: alleged `results[]` and alleged `whoElseBenefits[]` need a contra in the same file; `ministers[].personId` and `announced.byPersonId` resolve to an entity with `identity.office` or a known prefix; `electionContext.monthsFromLaunch` within ±1 of the value recomputed from `launched.date`; scheme ids unique across the whole welfare directory |
| `docs/INDEX.md` | link this spec and the route |

Total ≈ 2,000 lines. Gates: `npx tsc -b`, `npm run build`, `npm run validate`,
`npm run smoke` — including the zero-files state (run smoke once with the welfare
directory empty).

## 13. Decisions resolved (so the builder does not have to)

- **D1. The control leads, the map follows.** The 2×2 × three windows and the timing
  distribution sit above the map, as PM CARES puts PMNRF first. A map of scheme
  launches, read without the elections that had no scheme, is the illusory-correlation
  trap in picture form.
- **D2. The map is state-only; central schemes live in a rail.** Painting central
  schemes would add a constant to every state; drawing them as arcs would invent flow.
- **D3. Windows are fixed and shown together (6/12/24 months), not a control.** A reader
  who can slide the window will find the one that tells the story they came with.
- **D4. The map's colour domain is fixed across all 27 years**, via a new `domain` prop.
  Per-year re-binning (the current quantile default) would make a scrubber show false
  constancy.
- **D5. Partial money sums are hatched, not plotted**, with the partial figure in the
  readout. A lower bound on a ramp reads as a value.
- **D6. Zero is its own fill** (new `zero` prop), distinct from the hatch and from the
  ramp floor, because "swept, none" and "not swept" are different claims.
- **D7. Party is text only** — never hue, never a default filter, never inferred
  year-by-year from election winners.
- **D8. Coalition outcomes are unclassified**, in their own always-visible column,
  rather than forced into retained/lost.
- **D9. Benefit history is a table, not a line.** `TimeSeries` interpolates; a per-head
  amount is a step function and the steps are the record.
- **D10. Alleged items always render a response column**; an absent response is shown in
  amber and becomes a gap, and the validator is extended so that state cannot ship
  silently.
