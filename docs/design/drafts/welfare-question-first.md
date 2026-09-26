# /welfare — design spec, question-first draft

*Draft written 2026-09-25 against the welfare fleet contract
(`scratchpad/welfare/SPEC.md`: `schemes` with announced/approved/launched, `benefit`,
`beneficiaries`, `outlay`, `electionContext`, `status`, `results`, `ministers`,
`whoElseBenefits`; plus `entities`, `claims`, `elections`, `baseRates`, `narratives`,
`voids`, `symmetryCheck`, `gaps`). It is built on the typed module that already exists,
`src/data/welfare.ts` (types `Scheme`, `Election`; helpers `schemesByState`,
`schemesLiveInYear`, `monthsBetween`, `outlayForFy`, `latestStatus`; exports
`WELFARE_*` from `welfare.generated.ts`). It is designed against the contract, not
against any record. **Nothing in this file is a figure.** Every `{brace}` is derived at
module scope or in `useMemo` from the generated data.*

*Relation to `docs/design/WELFARE_PAGE.md` (the judge-written spec): this draft keeps
its liveness rule, boundary mirroring, `YearScrubber`, `ElectionTimeline`,
`SchemeDossier`, `TwoByTwo` and most of its refusals. It uses the `QuestionSection`
anatomy from `drafts/energy-question-first.md`, so the two pages read the same way. It
differs in nine places, listed in §0.3. Each difference can be taken or left on its own.*

---

## 0. The idea in one screen

### 0.1 Central idea

The page asks **eleven skeptical questions in the order a doubtful reader would ask
them**. Each section answers one question with the **smallest graphic that answers it
honestly**, which is very often a table. Every section has the same anatomy: the
question as its heading, the denominator line, the graphic, **"What this cannot show"**
at body size, and a table twin. One time axis, 2000 to 2026, runs through the three
temporal graphics: the map's year scrubber, the central-scheme band under it, and the
election strip. Year *y* means the same thing in all three.

The second idea is what makes the page checkable. **Every derived number on the page is
a button (`Fig`).** Pressing it opens, directly under the section, the rule that
produced the number, the rows it counted, and the rows it left out with the reason for
each. A reader who wants to check "7 of 19" sees the seven, the nineteen and the three
left out for having no launch date, each with its source link, without leaving the
page. The figure and the drawer come from the same function (§6.2), so they cannot
disagree.

### 0.2 Why this order

The questions run *where/when → who → how much → how close to an election → is that
unusual → would a rival look different → what happened after → what was found → who
else gained → which stories hold → what is missing*. The denominator question (Q5)
comes **immediately after** the timing question (Q4). It does not wait at the bottom.
A reader who stops after the election strip has already seen launches cluster before
polls. The next thing they must see is how often that happens anyway. That is the
PM CARES rule of putting the control first, applied inside a question sequence.

### 0.3 Where this draft departs from WELFARE_PAGE.md

| # | This draft | WELFARE_PAGE.md | Why |
|---|---|---|---|
| D1 | **No "zero" fill unless coverage is declared.** A state-year is shown as "none" only if a research file declares that it swept that state for that year (optional contract field `coverage`, §3.4). Without it, a state with no recorded live scheme is hatched as "none recorded in this file", and the zero class is named in the legend as **empty (0 states)** with the reason. | "Swept" = the state appears in any record, so it gets a zero fill for every year | Under that rule, Madhya Pradesh in 2004 would render as "swept, none live" only because a 2023 scheme put MP in the file. That is a false zero, and it would show the 2000s as empty when they are only unresearched. |
| D2 | **Per-head map metric** (`m=head`): annual cash per enrolled unit, annualised only where the unit string allows it. Anything else goes to a named null reason, "not comparable per head". | No per-head metric (R6 there bans per-capita, which is a different thing) | The brief asks for per-head. Per-head uses the scheme's own `benefit.amount` and `unit`, so no imported population series is needed. |
| D3 | **Central band**: central schemes are drawn as horizontal lanes on the scrubber's own time axis, directly under it, with the year cursor running through them. | Central schemes listed in a side rail | The brief asks for a band. Sharing the axis shows MGNREGA 2006→, PM-KISAN 2019→ and PMGKAY 2020→ against the same years as the map, and nothing is painted onto the states. |
| D4 | **`Fig` + `CheckDrawer`**: every derived number opens its rule and its rows (URL param `chk`). | Some cells are `<details>` | The reader wants to check every figure. One mechanism for all of them. |
| D5 | **Q5 comes directly after Q4**, before party, status and findings | The control leads, above the map | The brief asks for a map-based page. Putting the map first and the control at the first point where a timing pattern becomes visible meets both requirements. |
| D6 | **One declared window (12 months), with a sensitivity row at 6 and 24 months at the same type size.** Rates are printed only when the denominator is ≥ 5. Below that, counts only. | Three 2×2 tables side by side, rates everywhere | The brief names 12 months. Printing the other two windows beside it stops window-shopping without tripling the tables. The n ≥ 5 floor stops "1 of 1 = 100%" from appearing on a page. |
| D7 | **The party filter does not apply to Q5 or Q6.** Those sections are the comparison. Their headers say so, and the filtered party's rows are marked instead of the others being removed. | `party` filters the 2×2 and the party ledger | Filtering a symmetry check down to one party deletes the check. |
| D8 | **Turnover table (Q6)**: for every scheme live when its state's government changed hands, what the successor did within 24 months, as dated status entries. | — | This is the most direct evidence in the file for "would it look different under a rival". It comes from the supersession history the contract already records. |
| D9 | **Challenger promises named as a confounder, and logged as a gap.** The contract does not record the losing side's cash promises, and in several elections both sides promised transfers. | Not mentioned | Without this, "incumbent with a scheme retained" reads as a contrast with an opponent who offered nothing, which is often false. |

---

## 1. Page purpose

`/welfare` records the direct-benefit and distribution schemes that Indian state and
Union governments ran from 2000 to 2026: cash to women, farmers, the elderly and
students; free and subsidised grain; loan waivers; free power; cycles and televisions.
It shows, for each scheme: where and when it was live; who announced it and which body
approved it, with dates; which party; what it paid per head and in total, to how many,
and at what share of the state budget; how many months before which election it
launched; what that election did; and what happened to the scheme afterwards (raised,
cut, tightened, renamed, stopped, promised and never paid), recorded as supersession and
never as deletion. It also shows what evaluations, audits and courts found, and who
gained besides the beneficiaries: banks, correspondent networks, vendors and the party.
The page holds two hypotheses at equal weight, *"cash transfers buy elections"* and
*"cash transfers are welfare that happens to be popular"*, and runs the same count on
every party. It asserts no motive. It is a map because a scheme is a jurisdiction:
where a scheme applies is set by who governs that place and when.

## 2. The reader's questions, in order

Each question is one `QuestionSection`. The one-liner is shown in `QuestionIndex`
(§5.3) and is derived. The wording below is a template, not copy.

| Q | Question | Smallest honest graphic | Derived one-liner |
|---|---|---|---|
| Q1 | **Where and when was money being paid?** | `IndiaMap` + `YearScrubber` + `CentralBand` + state panel | `{stateSchemes} state and {centralSchemes} central schemes · recorded live in {yearsCovered} of 27 years · {statesWithAny} of 36 states and UTs` |
| Q2 | **Who announced it, who approved it, and for which party?** | Ministers-and-parties table (one row per person × scheme × action) | `{persons} office-holders across {parties} parties · {withApproval} of {schemes} schemes have a dated approval` |
| Q3 | **How much per head, to how many, at what share of the budget?** | Money table, one row per scheme-FY, with nulls printed | `{outlayRows} outlay rows · {withActual} with an actual · {withShare} with a budget share` |
| Q4 | **How many months before which election, and what did that election do?** | `ElectionTimeline`, every election drawn with the same window | `{launchedWithNext} of {launchedDated} dated launches have a later election in the file` |
| Q5 | **Is that unusual? What is the denominator?** | Launch-timing table by party + pooled `TwoByTwo`, with sensitivity row | `{within12} of {launchedWithNext} launched within 12 months · {expected} expected if timing were uniform` |
| Q6 | **Would this look different under a rival party?** | Party ledger (same columns, every party) + turnover table + symmetry check | `{partiesWithSchemes} parties · {turnovers} schemes outlived a change of government` |
| Q7 | **What happened afterwards?** | Status ledger + promised-versus-paid table | `{changes} dated changes · {promisedNotEnacted} promised, not enacted · {cuts} cut, tightened, paused or discontinued` |
| Q8 | **What did evaluations, audits and courts find?** | Findings by tier; every allegation beside its response | `{results} findings · {documented} documented · {allegedAnswered} of {alleged} allegations answered` |
| Q9 | **Who benefited beyond the beneficiaries?** | Channel ledger + scheme graph | `{wobRows} channels named · {wobWithAmount} with an amount · {wobAlleged} alleged` |
| Q10 | **Which stories hold up?** | Narrative ladder | `{narratives} narratives on 6 rungs` |
| Q11 | **What is missing?** | Voids, then `GapsPanel` | `{voids} documented absences · {gaps} gaps ({derivedGaps} found by the page itself)` |

## 3. Route, URL state, data

### 3.1 Route

`/welfare`, lazy-loaded in `src/App.tsx` (`const Welfare = lazy(() => import('./pages/Welfare'))`,
inside the existing `Suspense`). Nav label in `Layout.tsx`: **Distribution funds**, in the
same group as PM CARES and Resources. Page container `max-w-[1180px]`.

### 3.2 URL params

All go through `useSearchParams`, using the same `setParam(k, v)` helper as
`Resources.tsx` (`replace: true`). **Default = absent = unfiltered, no selection.**
Unknown values fall back to the default, and the strip shows the unfiltered state.

| param | values | default | reach | denominator effect shown beside the control |
|---|---|---|---|---|
| `y` | `2000`…`2026` | absent = **all years** | Map fill, central-band cursor, state panel "live in y" marks, Q1 twin. Calendar year for launches, elections and status. **Financial year `y`–`(y+1)` for money**, stated on the control. | `{liveInY} of {inView} schemes live in {y}` |
| `m` | `live` \| `share` \| `head` \| `bud` \| `act` | `live` | Map fill only | each option shows its coverage: `Share of state budget — {k} of {n} live state schemes have a figure for FY {y}`. `share`/`bud`/`act` need `y`. With `y` absent they are disabled, with the reason written on the control: "choose a year — money is per financial year and is never summed across years". `head` works without `y` (it then uses the launch amount). |
| `cat` | comma list of the 12 contract categories | all | Q1–Q4, Q7–Q9 | chip counts `women-cash (9)`. Zero-count categories are shown **disabled with (0)**, not hidden. |
| `party` | comma list of party strings as recorded | all | Q1–Q4, Q7–Q9. **Not Q5 or Q6** (D7). | `{all} → {n} schemes`. Never pre-selected. |
| `lvl` | `all` \| `state` \| `central` | `all` | Everything except the map. The map is always state-only. | `{all} → {n}` |
| `tier` | comma list `documented,reported,alleged,analytic` | all four | Q8, Q9 rows; graph | `{k} of {n} findings` |
| `st` | state code | absent | Opens the state panel (Q1) and marks that state's rows in every table. **Does not filter.** | — |
| `s` | scheme id | absent | Opens `SchemeDossier` under Q1 and marks the scheme's rows and glyphs everywhere | — |
| `chk` | derivation key (§6.2) | absent | Opens the `CheckDrawer` under the section that owns the key | — |
| `view` | `map` \| `table` | `map` | Q1 centre swaps to its table twin | — |
| `q` | text | empty | Q1 table twin and Q2 table: name, alias, person label | `{all} → {n} rows` |

There is no window parameter. The 12-month window is declared, and 6 and 24 months are
always printed beside it (D6).

### 3.3 Data plumbing

- Read only from `src/data/welfare.ts` and a new `src/data/welfareDerive.ts` (§6.2).
  **No figure is written as a literal in `Welfare.tsx`.**
- The graph data already has the right shapes: `WELFARE_ENTITIES`, `WELFARE_SCHEME_NODES`
  and `WELFARE_CLAIMS` are `GNode[]` / `GEdge[]`. No converter is needed.
- `WELFARE_META.asOf` is the strip's `asOf`. When `WELFARE_META.files` carry different
  `asOf` values, the strip reads `as of {min}–{max}`.
- `WELFARE_META.runId` is printed in every `CheckDrawer` and in the footnote. A reader
  can reproduce any figure from the commit.

### 3.4 Optional contract addition: `coverage` (D1)

```jsonc
"coverage": [ { "st": "mp" | "central", "fromYear": 2018, "toYear": 2026,
                "categories": ["women-cash", "farmer-cash"] | "all",
                "method": "what was searched, one sentence", "srcs": [...] } ]
```

`assemble-fleet.mjs` passes it through as `WELFARE_COVERAGE`. `validate.mjs` checks the
shape. **The page must work when it is absent.** In that case the zero class is empty
and the legend says so (§4.1). The field is optional so that no research file is
invalidated mid-flight.

---

## 4. Visual encodings — what each channel means

### 4.1 Map (`IndiaMap`, state-level schemes only)

| channel | means | notes |
|---|---|---|
| fill, `DEFAULT_RAMP` (7 steps, `#2e373f` → `#b7cbb0`) | value of metric `m` in year `y`, for schemes **recorded in this file** | Bins come from **pooled values across all 27 years** (new `domainValues` prop), so a shade means the same amount in 2006 and 2024. `live`: linear, ramp truncated to `min(maxPooled, 7)` steps. `share`: linear. `head`, `bud`, `act`: quantile over pooled values. The legend prints the cut values. |
| existing no-data hatch | no value, for a **named reason** (new `nullReasons` prop): `none recorded in this file` · `figure not located` · `partial — {k} of {n} live schemes have a figure` · `not comparable per head` | One hatch. Reasons appear in the readout and as counts in the legend: `no value (21 of 36) — none recorded 14 · not located 4 · partial 3`. **Never zero.** |
| flat `#15171c` (new `zero` prop) | declared swept for this state-year, and no live scheme | Only with `coverage` (§3.4). Without it, the legend shows the swatch with **"swept, none live — empty: the research files declare no coverage, so no state-year is shown as none"**. |
| accent stroke | selected state (`st`) | existing |
| party | **not encoded** | text in the readout and panel only |
| marks | **none** | `showMarks={false}` |

### 4.2 `YearScrubber` histogram (three rows, shared x = years 2000–2026)

| row | bar height means | scale |
|---|---|---|
| 1 | state schemes live that year (after filters) | own integer scale, max labelled |
| 2 | assembly elections recorded that year | own integer scale, max labelled |
| 3 | **coverage**: states with ≥1 outlay figure for FY `y` | own integer scale, labelled "states with a money figure" |

An accent outline marks the selected year. A year with a zero-height bar has its count
`0` printed under the column, so an empty year is not mistaken for a missing column.

### 4.3 `CentralBand` (under the scrubber, same x)

| channel | means |
|---|---|
| lane | one central scheme, ordered by `launched.date` then `id` |
| bar | live span: launch → dated `discontinued`, or → `asOf` with an open right end (no cap) |
| bar fill | neutral `rgba(232,228,220,0.14)`, 1px `--color-text-secondary` edge. Accent only on the scheme selected by `s`. |
| mono text at change points | per-head amount + unit as recorded (`₹6,000/yr`), written at `launched.date` and at each `benefit.changes[].date` |
| status glyphs on the bar | same glyph set as the timeline (§4.4) |
| thin vertical ticks on the axis | Lok Sabha elections in `WELFARE_ELECTIONS` |
| accent vertical rule | the selected `y`, through the scrubber and the band |

A central scheme with no launch date is not drawn. It is listed under the band as
"{k} central schemes with no launch date: …".

### 4.4 `ElectionTimeline` (Q4; also reused inside the state panel with one lane)

| channel | means |
|---|---|
| x | month, 2000-01 → 2026-12 |
| lane | jurisdiction: Central first, then states **alphabetical by name**. Never sorted by a count. |
| glyph shape | `■` launch · `□` promised, not enacted · `▲` raised · `▼` cut · `◆` eligibility tightened · `‖` paused · `×` discontinued · `↻` renamed |
| vertical 1px rule | assembly election (Lok Sabha in the Central lane) |
| cap on the rule | filled = incumbent retained · hollow = lost · no cap = unclassified (coalition or null) |
| faint band 12 months before **every** election | the analytic window. Left edge stroked with the **analytic tier dash** (`TIERS.analytic.dash`), because the window is our construct. |
| accent | glyphs of the selected scheme `s` only |

No hue carries party, category or outcome. Glyphs from status entries with empty `srcs`
are still drawn (supersession, never deletion). Their `<title>` reads `… · no source in
file`, and each one adds a derived gap.

### 4.5 Evidence tier (everywhere)

`strokeDasharray` from `TIERS` in the timeline window edge, the `TierLegend`, the graph
and `TierChip`. `alleged` and `documented` differ by dash **and** label on every
surface, so they stay distinct in greyscale. `--color-rose` appears only on the
response column of an allegation (§5.13).

---

## 5. Section by section

### 5.0 Page skeleton

```
max-w-[1180px]
├─ Kicker · PageTitle · Standfirst · Byline · "Covered elsewhere" line
├─ DenominatorStrip (sticky) + active-filter line
├─ Empty-register Callout (only when WELFARE_META.empty)
├─ QuestionIndex (Q1–Q11, whole-register one-liners)
├─ Q1  filter bar · YearScrubber · CentralBand · IndiaMap | StatePanel · captions · twin
│      └─ SchemeDossier (when s is set)
├─ Q2  MinistersTable
├─ Q3  MoneyTable
├─ Q4  ElectionTimeline · twin
├─ Q5  LaunchTimingTable · TwoByTwo (12 m) · sensitivity row · fleet baseRates · confounders
├─ Q6  PartyLedger · TurnoverTable · Symmetry Callout
├─ Q7  StatusLedger · PromisedVsPaid
├─ Q8  FindingsList (allegation | response)
├─ Q9  ChannelLedger · GraphExplorer (lazy)
├─ Q10 NarrativeLadder
├─ Q11 VoidList · GapsPanel
└─ SourceLedger · TierLegend · Footnote (standing note, runId)
```

Against the house chrome, the order is: title → strip → **centre (Q1)** → filters (Q1's
bar, echoed in the strip) → contested (Q8, Q10) → gaps (Q11) → source ledger. The
chrome is unchanged. The questions are the centre, extended downward.

### 5.1 Header

- `Kicker`: `Distribution funds · cash, grain and goods schemes · 2000–2026`
- `PageTitle`: **Who paid, when, and what the record can and cannot say about why**
- `Standfirst` (fixed copy, ≤ 68ch): "State and Union governments have paid women,
  farmers, pensioners and students in cash, and handed out grain, power and goods.
  Some say these schemes buy elections. Others say they are welfare that happens to be
  popular. This page does not choose between them. It asks eleven questions of the
  record, in the order a doubtful reader would ask them, and asks them the same way of
  every party. Every number opens to show the rows it was counted from."
- `Byline`: `{schemes} schemes · {files} research files · {parties} parties · {elections} elections · as of {asOf} · run {runId}`
- **Covered elsewhere** (mono 11px): `State profiles → /states/:code · Union ministers →
  /cabinet · PM CARES → /pmcares · Base rates across the platform → /base-rates`.

### 5.2 `DenominatorStrip` (existing, sticky)

```ts
<DenominatorStrip asOf={asOfLabel} filtered={{ from: WELFARE_SCHEMES.length, to: inView.length }} facts={[
  { n: inView.length, of: WELFARE_SCHEMES.length, label: 'schemes in view' },
  { n: statesWithAnyInView, of: 36, label: 'states & UTs with a recorded state scheme' },
  { n: yearsCovered, of: 27, label: 'years with a recorded live scheme' },
  { n: assemblyElections, label: 'assembly elections recorded' },
  { n: outlayWithActual, of: outlayRows, label: 'outlay rows with an actual' },
  { n: allegedAnswered, of: alleged, label: 'allegations answered' },
]} />
```

Directly under it, inside the same sticky container, a mono 11px **active-filter line**
appears when any of `y m cat party lvl tier q` is set:
`filters: y=2023 · party=BJP,INC · reset`. `reset` clears everything except `view`. A
reader deep in Q8 can then see the filters Q1 applied.

**Mobile (< 640px):** the sticky strip shows facts 1–3 and `as of`. Facts 4–6 move into
the non-sticky `Byline`. They are not hidden. Every section also carries its own
denominator line.

### 5.3 `QuestionIndex` (new, shared with the energy draft)

An `ol` of eleven rows: `Q{n}` in mono, the question as a link to `#q{n}`, and the §2
one-liner in `font-mono text-[11px] text-text-muted`. The one-liners describe the
**whole register**. The header reads "whole register · filters do not apply here".

### 5.4 `QuestionSection` anatomy (shared, `src/components/Questions.tsx`)

The same component as `drafts/energy-question-first.md` §5.0, with its `ask` prop
generalised:

```ts
export function QuestionSection(p: {
  n: number; id: string; question: string;
  denominator: ReactNode;        // REQUIRED, one mono line
  answeredBy: string;            // contract fields, e.g. "schemes[].ministers[], schemes[].announced"
  cannotShow: ReactNode;         // REQUIRED, body size, amber left rule
  scope?: string;                // e.g. "party filter not applied — this section is the comparison"
  ask?: { params: Record<string, string | null>; label: string; target: string; effect: { from: number; to: number } };
  checkKeys?: string[];          // derivation keys this section owns; CheckDrawer renders here
  children: ReactNode;
}): JSX.Element;
```

Render order: h2 `Q{n} · {question}` → denominator → `scope` (if any, in amber mono) →
`answeredBy` → graphic → **What this cannot show** → `ask` button (`{label} — {from} →
{to}`; merges params into the URL and scrolls to `target`) → `CheckDrawer` when `chk`
is one of `checkKeys`.

### 5.5 Q1 — Where and when was money being paid? (the centre)

- **denominator**: `{inView} of {all} schemes · {state} state · {central} central (not painted) · {liveInY} live in {y|all years} · {noLaunch} with no launch date (never counted live)`
- **answeredBy**: `schemes[].st, level, launched.date, status[], outlay[], benefit`

**Filter bar** (full width above the scrubber, wraps; each control shows its `{all} → {n}`):
1. **Metric**: segmented control bound to `m`. Labels: `Schemes live` · `Share of state
   budget` · `Cash per head, per year` · `Budgeted ₹ cr` · `Actual ₹ cr`. Coverage is
   printed under each (§3.2).
2. **Category**: chip row bound to `cat`.
3. **Party**: multi-select bound to `party`, alphabetical, with counts. When set, a line
   reads: "Showing one side. Q5 and Q6 always show every party." (links).
4. **Level**: `All / State / Central`, bound to `lvl`. Note: "the map shows state
   schemes only; central schemes are in the band".
5. **Reset**.

**`YearScrubber`** (new, §6.3). Full width. `All years` button, `‹ {y-1}` / `{y+1} ›`
step buttons, native range input, mono readout at `text-2xl`: `{y}: {liveInY} state
schemes live · {centralLiveInY} central · {electionsInY} elections`. The three-row
histogram (§4.2). **No autoplay.**

**`CentralBand`** (new, §6.4). Directly under the scrubber, same x, `overflow-x-auto` in
the same scroll container as the scrubber, so the two scroll together. Header:
`{k} central schemes · apply to every state · not painted on the map`. Click a lane →
`s`.

**Grid** `lg:grid-cols-[7fr_5fr] gap-6`:

*Left: `IndiaMap`*

```ts
<IndiaMap
  data={stateValues}                        // welfareDerive.stateValues(y, m, filters)
  nullReasons={stateNullReasons}            // same call
  domainValues={pooledValues[m]}            // welfareDerive.pooled(m, filters): all state-years, 2000–2026
  zero={hasCoverage ? { label: `swept, none live in ${y ?? 'any year'}` } : { label: ZERO_EMPTY_LABEL, empty: true }}
  metricLabel={METRIC_LABEL[m]} unit={METRIC_UNIT[m]} scaleMode={METRIC_SCALE[m]}
  selected={st} onSelect={(c) => setParam('st', c)}
  showMarks={false} height={narrow ? 420 : 620} format={METRIC_FORMAT[m]}
/>
```

`stateValues` rules. Each one is a claim, so implement exactly this:

- **Live**: `schemesLiveInYear(y)` (existing), restricted to `level === 'state'` and the
  filters. A scheme with a dated `paused` status in `y` stays live, and the readout says
  `paused in {y}`. With `y` absent, "live" means "ever launched".
- `live`: count of live schemes. If 0 and the state-year is declared in `coverage` →
  `value: 0` (zero fill). If 0 and not declared → `null`, reason `none recorded in this
  file`.
- `share`: sum over live schemes of `outlayForFy(s, fy(y)).pctOfStateBudget`. If any live
  scheme lacks it → `null`, reason `partial — {k} of {n} live schemes have a figure;
  lower bound {sum}%` (the lower bound goes in the readout, never in the fill).
- `bud` / `act`: the same, with `budgetedCr` / `actualCr`. **Never mixed.**
- `head`: the largest `annualisedPerHead(s, y)` (§6.2) among live schemes. If no live
  scheme's unit can be annualised → `null`, reason `not comparable per head`. The readout
  lists **every** live scheme's amount and unit as recorded, and names the one that set
  the fill.
- **Boundaries** (current geometry, historical data), as in WELFARE_PAGE.md: before
  2014-06-02 the `tg` polygon takes `ap`'s value; `jk` includes Ladakh; `dn`/`dd` carry
  the merged UT's value from 2020-01-26; `jh`, `ct`, `ut` existed only from Nov 2000,
  and for `y=2000` their readout says so. No other mirroring.
- Every `MapDatum.detail` ends `· launched by: BJP (2), INC (1)` as text.

*Right: `StatePanel`* (new, §6.6)
- No `st` → a short prompt: "Choose a state to see its schemes, the ministers who
  announced them, and its elections." Below it, the `QuestionIndex` shortcut for Q2–Q4.
  It never pre-selects a state.
- `st` set → state name + link `/states/{st}`; **scheme list, all years**, ordered by
  `launched.date` then `id`, rows live in `y` marked `live in {y}`. Each row shows name ·
  party · launched · per-head as of `y` · latest status ≤ `y`, and links to `s`. Then an
  **`ElectionTimeline` with one lane** (this state) for "status timeline + elections".
  Then **Elections in this file for {state}**: date · incumbent → winner · a fresh scheme
  within 12 m? yes/no (a `Fig`, key `q5.exposed.{st}.{date}`). Then **Ministers**:
  persons from those schemes' `ministers[]`, with office and dates, linking to Q2 with
  `?q={label}`. Close button clears `st`.
- State with no records: "{State}: none recorded in this file. Hatched means unknown,
  not none." Any `gaps` entries that mention the state name are listed underneath.

**`SchemeDossier`** (from WELFARE_PAGE.md §6.4, unchanged apart from two additions)
renders full width under the grid when `s` is set, and is scrolled into view once. The
additions: (a) its benefit block is a **step table**, not a line; (b) each block ends
with the `Fig` for its count, so the dossier is checkable in the same way as the page.

- **cannotShow** (body size): "The colour is {metric} for schemes recorded in this file,
  not for every scheme in India. Central schemes apply to every state and are drawn in
  the band above, not painted. A hatched state has no value, for the reason named in its
  readout. It does not mean zero. Party is not shown in colour. A state with more
  schemes here may simply have been researched more closely. {If !hasCoverage:} No
  research file declares which state-years it searched completely, so the map cannot
  show any state as having had no scheme."
- Money-metric addition: "Financial year {y}–{y+1}, nominal rupees, not adjusted for
  inflation. Do not compare shades across decades. Budget shares come from different
  sources, which may define 'the budget' differently (total or revenue expenditure). A
  state where only some live schemes have a figure is hatched, because a partial sum is
  a lower bound."
- Per-head addition: "Per enrolled unit as each scheme defines it: some schemes pay per
  person, others per household or per farmer family. Where a state runs several
  schemes, the shade is the largest single one, not a sum. Nobody receives the sum of
  all schemes. Payments per acre, per season, one-off payments and in-kind goods are not
  comparable per head, and are listed rather than shaded."
- Boundaries: as in WELFARE_PAGE.md C3.
- **ask**: none. Q1 is the target of other sections' asks.

### 5.6 Q2 — Who announced it, who approved it, and for which party?

- **denominator**: `{rows} actions by {persons} office-holders across {schemes} schemes · {withAnnounced} of {schemes} have a named announcer · {withApproval} a dated approval · {unresolved} persons unresolved`
- **answeredBy**: `schemes[].announced, approved, launched, ministers[]; entities[].identity.office`
- **Graphic — `MinistersTable`** (`DataTable`). One row per (person, scheme, action),
  plus one synthetic row per `announced` and per `approved` (body, not person) that is
  not already present in `ministers[]`. Columns:
  `Date | Person | Office at the time (identity.office) | Party | Scheme | State | Action | Source`.
  Sorted by date, then scheme id, then person id. **Never sorted by a count of schemes
  per person.** `pol:` ids link to `/cabinet`. Unresolved → label + `(identity not
  confirmed)`, no link. `opposed` rows are shown. Undated rows appear last, with `date
  not located`. `q` filters by person label or scheme name.
- Above the table, a compact **lifecycle completeness line** of `Fig`s:
  `announced {a} · approved {b} · launched {c} · all three dated {d} — of {schemes}`.
- **cannotShow**: "An announcement is a public statement, and an approval is a cabinet
  or legislative act. Neither shows who designed the scheme or why. How often a person
  appears here reflects how many schemes the research recorded, not their influence.
  Office and party are as of the action's date. Later defections are not read backwards
  into it."
- **ask**: `Show {person}'s schemes on the map` (only when `q` matches exactly one
  person) → `{ party: null, q: null, s: null }` + highlights. Omitted otherwise.

### 5.7 Q3 — How much per head, to how many, at what share of the budget?

- **denominator**: `{outlayRows} outlay rows across {schemesWithOutlay} of {schemes} schemes · {withBudgeted} budgeted · {withActual} actual · {withShare} share of state budget · {withGsdp} share of GSDP`
- **answeredBy**: `schemes[].benefit, beneficiaries[], outlay[]`
- **Graphic — `MoneyTable`** (`DataTable`), one row per scheme × FY:
  `Scheme | State | Party | FY | Per head (amount · unit, as of FY end) | Beneficiaries (count · as of) | Budgeted ₹ cr | Actual ₹ cr | % state budget | % GSDP | Source`.
  Sorted by FY, then scheme launch date, then id. Nulls read `not located`. The
  beneficiaries cell shows the snapshot **nearest to, and not after, the FY end**, with
  its date. It never interpolates. Numbers are in mono, tabular, right-aligned. **No
  column totals** anywhere: a total across schemes, FYs or budgeted/actual adds unlike
  things.
- An inline bar in the `% state budget` cell only (a declared quantity), with a fixed
  0 → `{maxShare}` scale across all rows and years, printed in the header. There are no
  bars on the ₹ columns, because rupees across 26 years are nominal and the bar would
  compare 2005 rupees with 2025 rupees.
- **cannotShow**: "Beneficiary counts are dated snapshots from different sources, not a
  series. Enrolled is not the same as paid. Budgeted is what was allocated. Actual is
  what was spent, and is often published two years late. Amounts are nominal. Budget
  share is as published by the source, and the base (total or revenue expenditure) is
  not always stated. There is no total, because none of these columns can be added
  across rows."

### 5.8 Q4 — How many months before which election, and what did that election do?

- **denominator**: `{launchedDated} schemes with a launch date · {launchedWithNext} with a later election in the file · {elections} elections drawn, {withScheme} of them preceded by a scheme within 12 months`
- **answeredBy**: `schemes[].launched.date, benefit.changes[], status[], electionContext; elections[]`
- **Graphic — `ElectionTimeline`** (from WELFARE_PAGE.md §6.2, props unchanged), with all
  lanes. Months are **recomputed** with `monthsBetween(launched.date, nextElection.date)`,
  where `nextElection` = the earliest `WELFARE_ELECTIONS` record for the same `st` (or
  Lok Sabha, for central schemes) dated after launch. If the recomputed value differs
  from `electionContext.monthsFromLaunch` by more than 1, the scheme gets a `≠` mark in
  the twin and a derived gap. The page does not choose which value is right.
- **Twin** (`<details>` open by default on desktop, closed on mobile): `Scheme | State | Party | Announced | Launched | Next election | Months (computed) | Months (recorded) | Incumbent | Winner | Seat change | Source`.
- **cannotShow**: "Every election in the file has the same 12-month band, whether or not
  a scheme falls inside it. Assembly elections are staggered, so some state is always
  within a year of a poll, and a launch in an election year is the normal case, not a
  signal. State budgets are presented in February and March, and many polls fall 12 to
  15 months later, so budget-cycle launches land inside the band mechanically. The
  file records the elections the research needed, not every election from 2000 to 2026.
  Q5 gives the count this picture needs."
- **ask**: `Is that unusual? →` scrolls to `#q5` (no params).

### 5.9 Q5 — Is that unusual? What is the denominator?

- **scope** (amber mono): `party filter not applied — this section is the comparison · category and level filters apply`
- **denominator**: `{E} elections in the file · {Eneither} with no recorded scheme in the window · reference class: elections in this file, not all Indian elections`
- **answeredBy**: `schemes[].launched, benefit.changes, party, st; elections[]; baseRates[]`

**(a) `LaunchTimingTable`** (`DataTable`). One row per party (alphabetical), with a pooled
**All parties** row first and a **Central (vs Lok Sabha)** group after the state rows:

`Party | Dated launches with a later election (b) | Launched ≤ 12 m before it (a) | a of b | Expected if timing were uniform (analytic) | Raised ≤ 12 m before | Sensitivity: ≤ 6 m · ≤ 24 m`

- `a of b` is a `Fig`. **When b < 5 the rate cell reads `n < 5 — count only`** and no
  percentage is printed. When b ≥ 5: `a of b (x%)`.
- Expected = `b × 12 / termMonths`, where `termMonths` = months from the state's
  previous election in the file to the next one, falling back to 60 when there is no
  previous election. It is printed to one decimal and labelled `analytic`, with an
  `innocentReading` tooltip: "This is what timing unrelated to elections would produce
  on a full term."
- Rows are marked (accent left border) when `party` is set. They are never removed.

**(b) `TwoByTwo`** (from WELFARE_PAGE.md §6.3), pooled, 12-month window. Rows are "Fresh
scheme (launched or raised by the incumbent party, ≤ 12 m before)" / "No fresh scheme".
Columns are "Incumbent retained" / "Incumbent lost" / **"Unclassified"** (coalition, or
null). Each cell is a `Fig` that opens its elections. Under it, at the same type size:
**sensitivity row** `≤ 6 m: retained {a} of {b} with · {c} of {d} without — ≤ 24 m: …`.
Then: `n = {E}. No significance test is run at this n.`

**(c) Retention by party** (`DataTable`):
`Party (as incumbent) | Elections | With fresh scheme: retained a of b | Without: retained c of d`.
Same n < 5 rule. Alphabetical.

**(d) Fleet base rates, verbatim** (`DataTable`):
`Property | Numerator | Denominator | Rate | Reference class | Research file | Source`.
`denominator` null or 0 → `not computed`. When a fleet row and a page-derived number
name the same property and disagree, **both** are shown, and a line under the table
lists the disagreement. No reconciliation.

**(e) Confounders** (part of `cannotShow`, rendered as a list at body size):
1. Anti-incumbency. Indian state incumbents lose often whatever they spend. The "no
   fresh scheme" row is the baseline, and it is thin.
2. **Challenger promises.** In many elections the opposition also promised cash
   transfers. The contract does not record them, so "fresh scheme" is not a contrast with
   "nothing offered" (D9, logged as a gap).
3. Alliance changes, national waves in Lok Sabha years, delimitation (2008), and changes
   of leader or candidate.
4. Selection. Elections entered this file mostly because a scheme preceded them.
5. The budget cycle (see Q4).
6. Several schemes per state. Exposure is yes or no, not a dose.

- **cannotShow** lead sentence: "These are associations in a small, selected set. They
  show neither that schemes win elections nor that they do not. The same table is
  computed for every party, in the same columns."

### 5.10 Q6 — Would this look different under a rival party?

- **scope**: `party filter not applied — this section is the comparison`
- **denominator**: `{parties} parties with ≥1 scheme · {statesMultiParty} states with schemes recorded under ≥2 parties · {turnovers} schemes live when their state changed government`
- **answeredBy**: `schemes[].party, status[], results[], whoElseBenefits[]; elections[]; symmetryCheck`

**(a) `PartyLedger`** (`DataTable`), every party, **alphabetical**, same columns:
`Party | State schemes | Central schemes | States | Launched ≤12 m before an election (a of b) | Promised, not enacted | Cut · tightened · paused · discontinued | Findings D / R / A / An | Allegations answered (k of n) | Other-beneficiary channels named`.
Every count is a `Fig`. The filtered party's row is marked, not isolated.

**(b) `TurnoverTable`** (new, §6.7). For every state-level scheme that was live on the
date of an assembly election in its state won by a party other than `scheme.party`:
`State | Scheme (launched by) | Government changed (date · from → to) | Within 24 months: status entries (date · status · note) | Source`.
If there are no status entries in the window, the cell reads `no change recorded in 24
months`. That does not mean "continued": the research may not have looked. Sorted by
election date. This shows what each rival actually did with the other side's scheme.

**(c) `Callout label="Symmetry check" tone="note"`**: each file's `WELFARE_SYMMETRY`
text, verbatim, prefixed by its domain in mono. Nothing is edited.

- **cannotShow**: "A party with more rows here governed more states or was researched
  more closely. A count is not a finding about a party until it is divided by the
  schemes that party could have launched, which this file does not hold. The turnover
  table records what successors did, not why. A renamed scheme may be continuity or
  rebranding, and the page does not decide which."

### 5.11 Q7 — What happened afterwards?

- **denominator**: `{changes} dated changes across {schemesWithChanges} of {schemes} schemes · {undatedChanges} undated (listed last)`
- **answeredBy**: `schemes[].status[], benefit.changes[], beneficiaries[]`

**(a) `StatusLedger`** (`DataTable`): `Date | Scheme | State | Party | Status | Note | Source`.
All statuses except `live`, `announced` and `launched` are included, sorted by date and
then scheme id. The status label is mono text, **with no colour coding**. A cut is not
"bad" and a raise is not "good". Superseded amounts stay as rows. Nothing is struck
through.

**(b) `PromisedVsPaid`** (`DataTable`). One row per `promised-not-enacted` status:
`Scheme | Promise (status note, verbatim) | Promised on | By (from ministers[] on that date, if any) | Paid per head as of {asOf} (benefit + latest change) | Source`.
**The page does not compute a gap.** The promise amount exists only as text in `note`,
so no subtraction is made from it. A gap is logged proposing a structured
`promisedAmount`.

**(c) Scrutiny drives.** For each `eligibility-tightened` status, the beneficiary
snapshots dated before and after it are shown side by side, with their dates and
sources. No difference is computed when the two snapshots come from different sources.
In that case the row reads `different sources — not subtracted`.

- **cannotShow**: "A cut can come from fiscal limits, a targeting error being corrected,
  a court order or a political choice. The status note records which, where a source
  says so. An eligibility drive that removes names may remove ineligible recipients or
  eligible ones. The file records counts, not which."

### 5.12 Q8 — What did evaluations, audits and courts find?

- **denominator**: `{results} findings across {schemesWithResults} of {schemes} schemes · D {d} · R {r} · A {a} · An {an} · {allegedAnswered} of {alleged} allegations answered · {schemesNoResult} schemes with no finding located`
- **answeredBy**: `schemes[].results[]; claims[] where pred = contra`
- **Tier filter** (`tier`) sits directly above the list and shows `{k} of {n} findings`.
- **Graphic — `FindingsList`**, grouped by scheme (in launch-date order). Each finding:
  `TierChip` + finding + `Cite`. **Every `alleged` finding renders as the two-column
  symmetric block from WELFARE_PAGE.md §4.5(7)**: the allegation on the left and its
  response on the right, at equal width, size and weight, with a `border-rose/40` right
  column. No response → amber "No response on record in this file", plus a derived gap.
- Schemes with no finding are listed at the end of the section at body size: "No
  evaluation, audit, court finding or survey located: {names}".
- **cannotShow**: "A finding covers the period and sample it studied. An evaluation of
  2019 enrolment says nothing about 2024 payments. A survey reporting that recipients
  voted for the incumbent does not show that they switched because of the scheme."

### 5.13 Q9 — Who benefited beyond the beneficiaries?

- **denominator**: `{wobRows} channels across {schemesWithWob} of {schemes} schemes · {wobWithAmount} with an amount · tiers D {…} R {…} A {…} An {…}`
- **answeredBy**: `schemes[].whoElseBenefits[]; WELFARE_BENEFITS (claims[].benefit)`
- **Graphic — `ChannelLedger`** (`DataTable`):
  `Scheme | Who | How | ₹ cr (as stated) | Tier | Response | Source`. The rows are the union
  of `whoElseBenefits` and `WELFARE_BENEFITS`, deduplicated by (scheme, who, how). They
  are sorted by scheme launch date and then **`who` alphabetically**, never by amount.
  `amountCr: null` → `not stated`. **No sum, no bar.** Amounts mix commissions, contract
  values and outlays. Alleged rows follow the Q8 response rule. A row naming a party as
  a beneficiary ("political mobilisation") renders only at its recorded tier, with its
  response slot.
- **`GraphExplorer`** (existing, `React.lazy`), under the table: `nodes={[...WELFARE_ENTITIES, ...WELFARE_SCHEME_NODES]}`,
  `edges={WELFARE_CLAIMS}`, `defaultQuery={selectedScheme?.name ?? ''}`,
  `height={narrow ? 480 : 620}`. Suspense fallback: a fixed-height `bg-bg-elevated`
  block with `loading graph…` in mono. Caption: "Position carries no meaning. Dash is
  evidence tier. Hue is entity family. Persons appear only in public roles."
- **cannotShow**: "A row names a channel through which money or advantage moved, as a
  source records it. A bank earning correspondent commissions on a transfer is how
  direct benefit transfer works. It is not an allegation unless the tier says alleged.
  Absence of a row means none was recorded, not none existed."

### 5.14 Q10 — Which stories hold up?

- **denominator**: `{narratives} narratives · established {…} · well-supported {…} · contested {…} · speculative {…} · unsupported {…} · debunked {…}`
- **Graphic — `NarrativeLadder`** (new in `Domain.tsx`, §6.8). Six rungs, top to bottom:
  established → debunked. Each rung is a mono label with its count. Rungs with zero
  narratives are shown, labelled `(0)`. Each narrative is a row with the claim in
  `text-text`, and under it the `ContestedFact`-style **two equal columns** "Strongest
  case" / "Strongest counter", then a full-width "What would change this", then `Cite`.
  All rung labels are the same colour. The rung is text, not a hue.
- **cannotShow**: "The rating is the research file's judgement of the evidence, made
  under the tier rules. It is not a verdict on anyone's intent. Both 'cash buys votes'
  and 'cash is welfare' are rated in the same way."

### 5.15 Q11 — What is missing?

- **denominator**: `{voids} documented absences · {gaps} gaps · {derivedGaps} found by the page`
- **Graphic**:
  1. **`VoidList`**: each `what` in `text-text` at body size, `whyItMatters` under it,
     `Cite`.
  2. **`GapsPanel`** (existing) over `WELFARE_GAPS` (as `{what: text, why: domain}`) +
     **derived gaps** from `welfareDerive.derivedGaps()`:
     - alleged findings or channels with no response;
     - schemes with no `launched.date` (never counted live);
     - recorded vs computed months that differ by more than 1;
     - status or benefit entries with empty `srcs`;
     - units that could not be annualised (the unit strings are listed);
     - contract symmetry-list states not recorded in any file
       (`mp mh or as ct dl hr br ka hp tg wb tn ap jh pb`);
     - `coverage` absent (D1);
     - challenger promises not in the contract (D9);
     - promise amounts stored only as text (Q7);
     - every assembly election 2000–2026 absent from `elections` (the reference class,
       Q5).
  `note`: "Absence is a result here. Each line limits what the sections above can say."

### 5.16 Sources and footnote

- `SourceLedger` (existing): the union of every file's `sources` plus every `srcs` in
  schemes, deduplicated by URL, sorted by label. `primary` =
  `/\.gov\.in|\.nic\.in|rbi\.org\.in|cag\.gov\.in|indiabudget|sansad\.in|eci\.gov\.in/i`.
  `establishes: 'See per-row citations above.'`, `retrieved` = the file's `asOf`. **Never
  truncated.**
- `Footnote`: `TierLegend` + standing note: "This page records public schemes, public
  offices and published claims. It asserts no motive and no offence. Allegations are
  attributed and paired with the response of those they concern. Persons appear only in
  public roles. Beneficiaries are classes, never individuals." + `run {runId}`.

---

## 6. Components

### 6.1 Existing, used as-is
`Kicker, PageTitle, Standfirst, Byline, Section, Callout, DataTable, TierChip,
TierLegend, Cite, Footnote` (Editorial); `DenominatorStrip, GapsPanel, SourceLedger,
ContestedFact` (Domain; `ContestedFact`'s grid is the model for the ladder's columns);
`GraphExplorer`. **Not used:** `TimeSeries` (it joins points linearly, which draws
per-head amounts nobody paid; benefit is a step function, so it goes in a table);
`GeoNetwork` (arcs from Delhi to 36 states would read as flow); `ConcentrationCurve`
(there is no awarder × winner population here); `RegimeSplit` (no single rule-change
boundary spans the file); `CompetitiveTension`.

### 6.2 NEW `src/data/welfareDerive.ts`: every figure and its check

```ts
export interface Filters { y: number | null; m: Metric; cat: Set<SchemeCategory> | null; party: Set<string> | null; lvl: 'all'|'state'|'central'; tier: Set<Tier>; q: string }
export type Metric = 'live' | 'share' | 'head' | 'bud' | 'act';
export type NullReason = 'none-recorded' | 'not-located' | 'partial' | 'not-comparable';

export function parseFilters(p: URLSearchParams): Filters;               // unknown values → defaults
export function inView(f: Filters, opts?: { ignoreParty?: boolean }): Scheme[];
export function stateValues(f: Filters): { data: Partial<Record<StateCode, MapDatum>>; reasons: Partial<Record<StateCode, NullReason>> };
export function pooled(m: Metric, f: Filters): number[];                  // all state-years 2000–2026
export function annualisedPerHead(s: Scheme, y: number | null): { value: number | null; unitRaw: string | null; reason?: 'unit' | 'amount' };
export function nextElection(s: Scheme): Election | null;
export function launchTiming(windowMonths: 6 | 12 | 24, f: Filters): LaunchTimingRow[];   // ignores party
export function retention(windowMonths: 6 | 12 | 24, f: Filters): { cells: TwoByTwoCells; byParty: RetentionRow[] };
export function partyLedger(f: Filters): PartyLedgerRow[];
export function turnovers(f: Filters): TurnoverRow[];
export function derivedGaps(): Gap[];

/** The check registry. Every Fig on the page names one of these keys. */
export interface Check { rule: string; included: CheckRow[]; excluded: { row: CheckRow; reason: string }[] }
export interface CheckRow { id: string; label: string; st: StateCode | null; dates: string; srcs: Source[] }
export function check(key: string, f: Filters): Check | null;          // null → unknown key
```

- **Unit annualisation** (declared; no other conversions): regex on `benefit.unit`,
  case-insensitive. `/per\s*month|\/\s*month|monthly|p\.?\s*m\.?$/` → ×12.
  `/per\s*(year|annum)|\/\s*year|annual|yearly|p\.?\s*a\.?$/` → ×1. Everything else →
  `null`, reason `unit`. Amount as of year `y` = the last `benefit.changes[]` with a date
  ≤ `y-12-31` and a non-null amount, otherwise `benefit.amount` when launched ≤ `y`.
- **Fresh scheme** (Q5): state-level, `scheme.party` equal (normalised: lowercase, trim)
  to `election.incumbentParty`, and a `launched.date` or a raising `benefit.changes[]`
  date (amount greater than the previous amount) in `[election.date − w, election.date]`.
  Declared before looking. Do not add clauses.
- **Unclassified outcome**: `incumbentParty` or `winner` null, or either matches
  `/\+|\/|alliance|front|\bNDA\b|\bUPA\b|\bINDIA\b|mahayuti|\bMVA\b|mahagathbandhan/i`.
- **Keys** follow the pattern `q{n}.{metric}[.{party|st|scheme}][.{window}]`, e.g.
  `q5.launch.BJP.12`, `q5.cell.fresh.retained.12`, `q2.approved`, `q1.live.mp.2023`.
  Each figure is `check(key).included.length`, so the figure and its drawer come from
  the same function and cannot drift.
- Sort everything with explicit tiebreaks (`date → id`). Use no `Math.random`, no clock,
  and no locale-dependent comparison (use the `byText` helper in `welfare.ts`).

### 6.3 NEW `YearScrubber`: `src/components/viz/YearScrubber.tsx`

As WELFARE_PAGE.md §6.1, with `rows` allowed to hold three entries (§4.2) and one
addition:

```ts
interface YearScrubberProps {
  min: number; max: number; value: number | null; onChange: (y: number | null) => void;
  rows: { label: string; counts: Record<number, number> }[];
  /** Pixel x of each year, exported so CentralBand aligns exactly. */
  onLayout?: (xOf: (year: number) => number, width: number) => void;
}
```

The native `<input type="range">` gives keyboard support. The touch target is 44px.
There is no animation and no autoplay.

### 6.4 NEW `CentralBand`: `src/components/viz/CentralBand.tsx`

```ts
interface CentralBandProps {
  schemes: { id: string; name: string; from: string; to: string | null; amounts: { date: string; text: string }[];
             events: TimelineEvent[] }[];            // TimelineEvent from ElectionTimeline
  lokSabha: { date: string; label: string }[];
  range: [number, number];                           // [2000, 2026]
  cursor: number | null;                             // y
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}
```

The SVG shares its width with `YearScrubber`. Each lane is 20px tall, with the label
column 140px wide and `sticky left-0`. Every bar is focusable (`tabIndex=0`, Enter →
`onSelect`) and carries a `<title>`: `{name} · {from}–{to|asOf} · {latest amount}`.
Twin: `Scheme | Launched | Ended | Amount history | Latest status | Source`.

### 6.5 REUSED from WELFARE_PAGE.md
`ElectionTimeline` (§6.2 there), `TwoByTwo` (§6.3), `SchemeDossier` (§6.4, plus the
two additions in §5.5). Props are unchanged.

### 6.6 NEW `StatePanel`: `src/components/welfare/StatePanel.tsx`

```ts
interface StatePanelProps {
  st: StateCode | null; year: number | null; schemes: Scheme[];            // this state's, all years, filtered
  elections: Election[]; personLabel: (id: string) => { label: string; resolved: boolean; href?: string };
  gapsMentioning: string[]; onSelectScheme: (id: string) => void; onClose: () => void;
  fig: (key: string, n: number, of?: number) => ReactNode;                 // renders a Fig bound to chk
}
```

### 6.7 NEW `TurnoverTable`: in `src/components/welfare/TurnoverTable.tsx`
`{ rows: TurnoverRow[]; windowMonths: 24 }` → a `DataTable`.
`TurnoverRow = { schemeId, name, st, launchedBy, election: Election, statuses: SchemeStatus[] }`.

### 6.8 NEW in `src/components/Domain.tsx`: `NarrativeLadder`
`{ rows: Narrative[] }`. Rung order is fixed. It uses the `ContestedFact` two-column
grid for case and counter. Energy can reuse it.

### 6.9 NEW in `src/components/Questions.tsx`: `Fig` and `CheckDrawer`

```ts
export function Fig(p: { n: number; of?: number; check: string; pct?: boolean; minN?: number }): JSX.Element;
// A mono button: "7 of 19" (+ " (37%)" only when pct && of >= (minN ?? 5)).
// aria-controls the section's drawer; click → setParam('chk', key), or clears it if already open.

export function CheckDrawer(p: { check: Check; runId: string; onClose: () => void }): JSX.Element;
// Inline block, not a modal. Shows: rule (body size), "counted: n", a DataTable of included rows
// (label · state · dates · Cite), "left out: k" with a table of excluded rows and reasons,
// and a footer line "derived in src/data/welfareDerive.ts · run {runId}".
```

`QuestionSection` and `QuestionIndex` are as in the energy draft. If that draft lands
first, only `Fig` and `CheckDrawer` are added here.

### 6.10 MODIFIED `IndiaMap`: three optional props, backward compatible

```ts
/** Values used to compute bins or min/max, in place of this call's values — pooled across years. */
domainValues?: number[];
/** Reason for each null state; the legend counts reasons, the readout names the state's reason. */
nullReasons?: Partial<Record<StateCode, string>>;
/** value === 0 renders as a flat #15171c with this legend label. `empty: true` shows the swatch labelled as an empty class. */
zero?: { label: string; empty?: boolean };
```

- `domainValues` is used by `quantileBins`, and by min/max for log and linear. Values
  outside the range clamp. The legend prints the cut values in place of `low → high`.
- `#15171c` is distinct from the page (`#0a0a0c`), the hatch ground (`#101116`) and the
  ramp floor (`#2e373f`). Check this in the greyscale screenshot (§12).
- With all props absent, behaviour is unchanged. Other pages are not affected.

---

## 7. Captions the page must carry

Each section's `cannotShow` (§5.5–5.15) is the caption. It renders at body size (14px,
`text-text-secondary`) directly under the graphic, never in the footer. Additionally:

- **Scrubber** (always): "Bars count what this file recorded, not what India paid. Row 3
  shows how many states have any money figure that year. Where it is low, the map above
  is mostly hatched for that reason."
- **Partial range** (whenever `yearsCovered < 27`): "The file records a live scheme in
  {yearsCovered} of the 27 years 2000–2026, first in {firstYear}. Before {firstYear} the
  map is hatched because nothing was recorded, not because nothing was paid."
- **Central band**: "Central schemes apply in every state. Their spending in a given
  state is not added to that state's shade."
- **Timeline and TwoByTwo**: "Association, not effect. n = {E}. No test is run."

## 8. Empty, partial and no-data states

The generated file is empty today (`WELFARE_META.empty === true`). **The first build
will render this state, and smoke must pass in it.**

| situation | render |
|---|---|
| **Register empty** | Full chrome. Strip shows `0 schemes in view` etc. A `Callout label="Register not yet promoted" tone="note"` above the index: "The distribution-funds research has not been promoted into this build. Nothing below is zero. It is unmeasured." The index shows `—` one-liners. Q1: all 36 states hatched, reason `none recorded`; the scrubber shows zero bars with `0` printed; the band reads "no central schemes recorded". Each Q renders one body-size line: "Nothing recorded yet for this question." `GapsPanel` shows one derived gap. |
| **Partial years** (common) | Partial-range caption (§7). Years with no records keep their scrubber columns, with `0` printed. |
| **Partial money** | Per-state `partial` reason (§5.5), plus a line above the map: "{k} states with live schemes have a figure for only some of them. They are hatched, with lower bounds in the readout." |
| Money metric, no figures for FY `y` | All states with live schemes are hatched `not located`. Line: "No {metric} figure located for FY {y} in any state in view." |
| Filters → 0 schemes | Strip `filtered N → 0`. Line above the map: "No scheme in this file matches {filters}. This is a statement about the file, not about India." + Reset. Q5/Q6 unaffected by `party`, as declared. |
| `st` with no records | §5.5 panel text. |
| `s` unknown | Dossier slot: "No scheme `{s}` in this file." + clear link. |
| `chk` unknown or out of scope | No drawer. The section shows "That figure is not on this page." + clear link. |
| `elections` empty | Q4 draws launches only, with "No elections recorded — the timing cannot be measured." Q5 is replaced by "No elections recorded — the control cannot run. This is the most important gap on the page." + a derived gap. |
| Denominator < 5 | `n < 5 — count only`. |
| `baseRates` denominator 0 or null | `not computed`. |
| Narratives / voids empty | "None recorded in this file." at body size. |
| Loading | None. The data is static. The only async piece is the lazy `GraphExplorer` (fixed-height fallback, no spinner). |

## 9. Mobile behaviour (`narrow` = `matchMedia('(max-width: 639px)')`, local `useNarrow()` hook)

- Strip: facts 1–3 + `as of`, sticky. The active-filter line wraps.
- Q1: filter bar controls become `<select>`s (metric, level) and a `<details>` for
  category and party. The scrubber and band are full width in one `overflow-x-auto`
  container with `min-width: 640px`, so year labels never collide. The map is
  `height=420`, full width. The **state panel renders below the map**, not sticky. Tap
  sets `st`. The hover readout is not relied on, because every readout field is also in
  the panel.
- `CheckDrawer`s render full width inline. Their tables scroll inside their own
  containers.
- Every `DataTable` scrolls horizontally inside its own container, with the first
  column sticky.
- Timeline: sticky 96px lane-label column.
- `GraphExplorer` `height=480`.
- Q5 `TwoByTwo` and sensitivity row stack.
- No horizontal page scroll at 360px. Verify at 360, 768 and 1280 using the
  `scripts/graph-viewport.mjs` pattern.

## 10. Table twins

| graphic | twin | where |
|---|---|---|
| Map (per `y`, `m`) | `State | Value | Reason if none | Live schemes (names) | Launched by (party text)`, 36 rows, alphabetical | `view=table`, and always in a `<details>` under the map |
| Scheme list (Q1) | `Scheme | State | Level | Party | Category | Announced (date · by) | Approved (date · body) | Launched | Per head (as of y) | Beneficiaries (count · as of) | Latest outlay FY (bud / act · % budget) | Next election (date · months · result) | Latest status | Findings D/R/A/An | Sources`, sorted by launch date, then id | `view=table` |
| Scrubber | `Year | State schemes live | Central live | Elections | States with a money figure` | `<details>` under the scrubber |
| Central band | §6.4 | `<details>` under the band |
| Timeline | §5.8 | under Q4 |
| TwoByTwo | it is a `<table>` | — |
| Graph | `Source | Predicate | Target | Tier | ₹ cr | From–to | Response | Source links` | `<details>` under the graph |

Q2, Q3, Q5, Q6, Q7 and Q9 are tables already.

## 11. What the page refuses to show, and why

- **Party as colour**, anywhere. A partisan palette is an editorial frame, and hue is
  frozen to node family.
- **Any ranking of states, parties, ministers or schemes** by generosity, "freebie
  index", "populism score" or electoral "effectiveness". Tables sort by date or name.
  The words *freebie* and *revdi* appear only inside quoted narratives, attributed.
- **A scatter or fitted line of outlay against seats or vote share.** The n is in the
  tens and confounded by everything in Q5(e). A line would carry a causal claim the data
  cannot support.
- **Percentages at n < 5.**
- **Totals** across schemes, years, or budgeted and actual together. **Bars on nominal ₹.**
- **Central values painted onto states**, or arcs from Delhi.
- **Per-capita (per resident) metrics.** There is no population series in the contract.
  Per head means per enrolled unit, as §5.5 states.
- **"Ruling party in year y"** inferred from election winners. Defections, President's
  rule and coalition collapses make that wrong in the cases readers care about.
- **Interpolated beneficiary, outlay or benefit series.** `TimeSeries` is not used for
  benefit history.
- **Inflation-adjusted amounts.** There is no deflator in the contract.
- **Autoplay or animated scrubbing.** Motion adds no information and hides the frames in
  between.
- **A default state, scheme or party selection.**
- **Any private individual.** Beneficiaries are classes.
- **An allegation without its response slot**, even when the slot is empty.
- **A colour that means cut, fraud, suspicious or bad.** Rose is for responses only.
- **Years before 2000 or after `asOf`.**

## 12. Frozen — the developer may not adjust these to make it fit

1. Tier = `strokeDasharray` from `TIERS`. Never replaced by colour alone.
2. Graph node hue = family, shape = type, size = `sz`. No party ring, no category tint.
3. The hatch, the zero fill and the lowest ramp step are three visibly distinct states,
   and are checked in a greyscale screenshot.
4. Map bins are pooled across all years (`domainValues`), never re-binned per year.
5. Party is text only.
6. `cannotShow`, voids and gaps render at body size. Never collapsed, never smaller.
7. The response column is the same width, size and weight as the allegation column.
   Rose only there.
8. Every derived number is a `Fig` backed by `check()`. No literal figures.
9. Q5 and Q6 ignore the `party` filter. The 12-month window is fixed, and 6 and 24
   months are always printed beside it.
10. The default view is unfiltered, with no selection and `y` absent.
11. Nulls read `not located` / `not stated` / `not computed`. Never `0`, never `—`
    alone, never `NaN`.
12. Every filter shows its `{all} → {n}` effect beside the control.

## 13. Build estimate

**Create**

| file | est. lines | contents |
|---|---|---|
| `src/pages/Welfare.tsx` | 750 | the page (§5) |
| `src/data/welfareDerive.ts` | 520 | §6.2: filters, liveness per year, metrics, annualisation, next election, timing, retention, party ledger, turnovers, check registry, derived gaps |
| `src/components/Questions.tsx` | 220 | `QuestionSection`, `QuestionIndex` (shared with energy), `Fig`, `CheckDrawer` |
| `src/components/viz/YearScrubber.tsx` | 150 | §6.3 |
| `src/components/viz/CentralBand.tsx` | 190 | §6.4 |
| `src/components/viz/ElectionTimeline.tsx` | 280 | WELFARE_PAGE.md §6.2 |
| `src/components/welfare/SchemeDossier.tsx` | 290 | WELFARE_PAGE.md §6.4 + §5.5 additions |
| `src/components/welfare/StatePanel.tsx` | 170 | §6.6 |
| `src/components/welfare/TurnoverTable.tsx` | 60 | §6.7 |

**Modify**

| file | change |
|---|---|
| `src/components/viz/IndiaMap.tsx` | + `domainValues`, `nullReasons`, `zero` (~60 lines); defaults unchanged |
| `src/components/Domain.tsx` | + `TwoByTwo`, `NarrativeLadder` (~170 lines) |
| `src/data/welfare.ts` | + `Coverage` type and `WELFARE_COVERAGE` re-export (empty array when absent) |
| `scripts/assemble-fleet.mjs` | pass through optional `coverage` |
| `scripts/validate.mjs` | `coverage` shape; alleged `results[]` / `whoElseBenefits[]` need a matching contra; `ministers[].personId` resolves; months recorded vs computed within ±1 → warning, not failure (the page shows both) |
| `src/App.tsx` | lazy route `/welfare` |
| `src/components/Layout.tsx` | nav "Distribution funds" |
| `scripts/smoke.mjs` | `/welfare`, `/welfare?y=2023&m=share&st=mp`, `/welfare?view=table`, `/welfare?chk=q5.launch.all.12`, and one run with the register empty |
| `scratchpad/welfare/SPEC.md` → `docs/research/FLEET_CONTRACT.md` | document optional `coverage` (and propose `promisedAmount`, `challengerPromises` for the next sweep) |
| `docs/INDEX.md` | link this spec and the route |

Total ≈ 3,100 lines. Gates: `npx tsc -b`, `npm run build`, `npm run validate`,
`npm run smoke`, plus a greyscale screenshot of the Q1 legend and a Q8 allegation block.
