# /welfare: acceptance criteria

*Written 2026-09-25 against `docs/design/WELFARE_PAGE.md` (the synthesised spec, with UX
amendments U1–U22 applied). Procedure: the SweetClaude `product-user-stories` shape —
a defined scope, numbered ids, a short verb-phrase title per item, and acceptance
criteria stated as observable behaviour — in the generic (not Gherkin) format, scoped to
**everything** the brief asked to cover. The skill's state, manifest and log steps are
not used: this repository has no `.sweetclaude/` and the criteria live here, next to the
spec they test. There is no `personas.yaml`; the five **synthetic** seats of
`docs/design/WELFARE_UX_REVIEW.md` (J journalist, P policy researcher, S hostile reader,
A screen-reader user, M phone reader) are used only to say who each group serves.*

*Every criterion is one observable behaviour of the **built** page, verified by a headless
Playwright check against `dist`, the way `scripts/smoke.mjs` and
`scripts/graph-viewport.mjs` already work: the check serves `dist` itself, opens
`${base}/#/welfare…` (HashRouter, so search params sit inside the hash), and reads the
DOM. No criterion reads application internals or `src/`. Where a criterion depends on a
record being present, the check finds its fixture in the DOM of the page under test, and
when none exists it reports `SKIPPED: <reason>` — never a pass. A criterion that cannot be
verified is a failure of the criterion, not of the page.*

---

## 0. Preconditions, fixtures and test hooks

### 0.1 Two builds

The data is compiled in, so a check cannot switch data at runtime. The gates in the spec
(§14) run twice, and so do these criteria:

| build | how | used by |
|---|---|---|
| **EMPTY** | `dist` built from a generated module with `WELFARE_META.empty === true` (the assembler run over an input set with no welfare files, into a scratchpad copy — `research/raw` and `*.generated.ts` are never edited by hand). | AC-01 … AC-08, AC-80 |
| **FULL** | `dist` built from the current generated module (`npm run generate && npm run build`). Today: 54 schemes, `WELFARE_ELECTIONS` non-empty, `asOf 2026-09-25`, `runId run-7ad370465f28`. Those numbers are **not** written into any check; they are read from the page. | everything else |

### 0.2 Browser contexts

- Desktop: `viewport 1440×900`; fold-budget criterion at `1280×800`.
- Phone: `viewport 390×844`, `hasTouch: true`, `isMobile: true`.
- Every context: `reducedMotion: 'reduce'` (so scrolls are instant and deterministic),
  `permissions: ['clipboard-read', 'clipboard-write']` (for the copy criteria).
- Every navigation goes through `about:blank` first, as smoke does, then
  `page.goto(url, { waitUntil: 'networkidle' })` and `waitForTimeout(700)`.
- Console errors and page errors are collected on every route; any criterion fails if one
  fires that is not in smoke's external allow-list.

### 0.3 Fixtures discovered from the DOM (FULL build)

The check derives these before running, from `/#/welfare?view=table` (all twins open):

| name | how found | fallback |
|---|---|---|
| `SCHEME_ID` | `href` of the first `a[href*="s="]` inside the `Every scheme in view` twin, parsed for `s=` | fail — a full build always has one scheme |
| `SCHEME_NAME` | that link's text | — |
| `STATE_WITH_VALUE` | first row of the `Map as a table` year slice whose `Class` cell is a value; its state code from the row's `?st=` link | skip criteria needing it |
| `STATE_NONE` | first row whose `Class` is `none recorded` | skip criteria needing it |
| `Y_WITH_BALLOTS` | first `Year` in the scrubber twin whose `Assembly elections` cell > 0 and which is neither the first nor the last `Year` of the twin [Corrected: the first year with ballots can be the range minimum, where AC-44's `ArrowLeft` cannot move] | skip ballot criteria |
| `Y_MONEY` | first year where the coverage ribbon for `m=share` is not `empty`, read from the scrubber twin's `States with a money figure` > 0 | skip money criteria; when that column reads 0 in every year, the skip says it is a documented void (no share-of-state-budget figure in the register is matched to any financial year), not a missing test |
| `ALLEGED_SCHEME` | first `TierChip` reading `alleged` inside `#findings`; the scheme heading above it | skip denial criteria with reason |
| `PARTY` | first canonical label in the Party multi-select | — |

### 0.4 Test hooks the build must emit

The spec fixes most text and roles. Where it fixes none, the build emits these
attributes, which carry no style and no meaning and exist only so a check can count
things the way a reader sees them:

| hook | on | why |
|---|---|---|
| `data-caption="C1"…"C15"` | each caption element | a caption is identified by its id, not by matching its full text, which the spec allows to vary (`{fy}`, `{yearsCovered}`) |
| `data-ballot` with `data-outcome`, `data-lid="true|false"`, `data-muted="true|false"` | each ballot `<g>` on the map | the twin's row count must equal the glyph count; a glyph needs a countable handle |
| `data-fill-class="value|hatch|stipple|zero"` | each state `<path>` | the legend counts must equal the painted counts, and reading `fill="url(#…)"` back is fragile across builds |
| `data-twin="year-slice|matrix|schemes|money|elections|scrubber|lanes|ministers-actions|claims"` | each twin `<details>` | twins are found by name, not by position |
| `data-lane="central|state"` | each lane label `<button>` | lane counts against the band header |
| `data-effect` | every `{N} → {k}` filter-effect element | the k that every twin row count is compared to |
| `data-pinned-stack` | the wrapper of header + strip + pinned scrubber below 640px | the ≤ 140px budget |

---

## 1. Scaffold state — EMPTY build (seats M, A, J)

*Why: a page with zero records that renders an empty chart has published a finding of
nothing. The page must render fully and say, before any number, that nothing below is
zero.*

### AC-01 — Render the empty page with ≥ 200 characters and no errors
- **Behaviour:** With no records loaded, `/welfare` renders its full chrome, not a blank.
- **Check:** `goto('/#/welfare')`. `document.body.innerText.length >= 200`. Zero console
  errors, zero page errors. `article.pb-20` exists.

### AC-02 — Say the register is not promoted, above the byline
- **Behaviour:** The `Register not yet promoted` callout is the first thing after the
  standfirst, on every viewport, and says nothing below is zero.
- **Check:** `locator('text="Register not yet promoted"')` (exact, case-sensitive: the
  callout's title line) count = 1; its container contains
  the text `The distribution-funds research has not been promoted into this build. Nothing
  below is zero. It is unmeasured.` In DOM order (`compareDocumentPosition`) the callout
  precedes the `Byline` element and follows the `Standfirst`. Repeat at 390×844 (AC-80).
  [Corrected] The substring locator `text=Register not yet promoted` also matched the
  byline, the skip link and the three twin summaries, which AC-03, AC-04 and AC-06
  require to carry those words; the count of 1 is of the callout's own title line.

### AC-03 — Replace the byline counts and the strip with the empty wording
- **Behaviour:** No `0 schemes · 0 of 36` byline appears; the strip states the absence.
- **Check:** Byline text contains `register not yet promoted · nothing below is zero` and
  does **not** match `/\d+ schemes/`. The sticky strip (`.sticky.top-0`) contains
  `0 schemes` and `as of not yet promoted`.

### AC-04 — Name the empty state in the skip link
- **Behaviour:** The stage's first focusable element is the skip link, worded for the
  empty state.
- **Check:** `a[href="#stage-tables"]` text = `Skip to tables (empty: register not yet
  promoted)`. Focus the last control in the FilterBar, press `Tab`: `document.activeElement`
  is that link.

### AC-05 — Hatch all 36 states and say so in the map's name
- **Behaviour:** Every state is no-data, none is zero, and the accessible name says so.
- **Check:** `svg[role="listbox"][tabindex="0"]` (S3 amendment, see WELFARE_A11Y.md) `aria-label` starts `Map of India` and ends
  `0 of 36 states with a value; nothing recorded yet`. `path[data-fill-class="hatch"]`
  count = 36; `path[data-fill-class="zero"]` count = 0; `path[data-fill-class="value"]`
  count = 0.

### AC-06 — Label every twin as empty, not as zero rows of data
- **Check:** Each of the three `<details>` under `#stage-tables` has a `<summary>` whose
  text contains `0 rows · register not yet promoted`. Each twin's `<table>` has no
  `tbody tr` or exactly one row reading `Nothing recorded yet.`

### AC-07 — Say the control cannot run, and mark every section empty
- **Check:** The margin contains `No elections recorded, so the control cannot run.`
  Each of `#control #ministers #after #benefits #findings #narratives #missing` contains
  the exact line `Nothing recorded yet.` `#graph` contains `No claims recorded in this
  file.` and contains no `svg[data-tick]` (graph not mounted). `#narratives` still lists
  all six rungs, each reading `none in this file`.

### AC-08 — Draw the clock axis and the derived gaps anyway
- **Check:** The TimeLanes axis shows `2000` and a last label matching `/^2026 \(to /`.
  `input[type="range"][aria-label="Year"]` exists with `aria-valuetext` starting
  `All years`. `#missing` contains a `GapsPanel` line containing `coverage` (the
  `coverage absent` derived gap) and the note `Absence is a result here.`

---

## 2. Honesty captions — FULL build (seats S, J, A)

*Why: the caption states what the graphic cannot honestly show. It is a finding, so it is
always rendered, at body size, under the graphic it qualifies — never in the footer.*

### AC-09 — Always render the in-frame status line as a list of clauses
- **Check (at `/#/welfare` and `/#/welfare?y=Y_WITH_BALLOTS&m=share`):**
  `figure figcaption ul li` count ≥ 6. Clauses present (regex): `/of 36: none recorded
  \(hatched\)/`, `/live, no comparable figure \(stippled\)/`, `/searched, none live
  \(flat\)/`, `central schemes not painted (band below)`, `/as of /`, `/run run-[0-9a-f]+/`.
  Without `party`: clause `party not encoded`. Computed `font-size` of a clause = `14px`.

### AC-10 — Render C1 and C6 on every view at body size, capped at 72ch
- **Check (at `?view=map` and `?view=table`):** `[data-caption="C1"]` text contains
  `Colour never encodes party.`; `[data-caption="C6"]` text starts `Current boundaries.`
  For each: computed `font-size` = `14px`, `border-left-width` ≥ `2px`, `max-width` equals
  `72ch` resolved (≤ 72 × the element's `ch` width, measured against a `<span>ch</span>` probe).
  Neither caption is inside the `<footer>` / after `TierLegend`.

### AC-11 — Show C2 only for the live metric, with the no-coverage sentence when undeclared
- **Check:** At `/#/welfare` (m=live): `[data-caption="C2"]` present and contains `With no
  year chosen, the count is cumulative`. If the legend's zero swatch reads `(empty: no
  research file declares its coverage` then C2 also contains `so the map cannot show any
  state as having had no scheme`. At `?y=Y_MONEY&m=share`: `[data-caption="C2"]` count = 0.

### AC-12 — Swap C3 and C4 with the money and per-head metrics
- **Check:** `?y=Y_MONEY&m=share`: `[data-caption="C3"]` present, contains `Financial year`
  and `Budgeted and actual are never combined`; `[data-caption="C4"]` absent.
  `?y=Y_MONEY&m=perhead&cat=<first category chip with count > 0>`: `[data-caption="C4"]`
  present, contains `divides nothing by enrolment` and `Not per capita`; C3 absent.
  At `m=live`: both absent.

### AC-13 — Show C5 and the ballot key only when a year is set
- **Check:** `/#/welfare`: `[data-caption="C5"]` count = 0; legend contains `choose a year
  to see its elections`; `[data-ballot]` count = 0. `?y=Y_WITH_BALLOTS`: C5 present,
  contains `The lid marks timing, not cause.`; legend contains `incumbent kept power` and
  `lid = the incumbent's party launched or raised`.

### AC-14 — State the partial range in C7 with a figure that matches the strip
- **Check:** `[data-caption="C7"]` contains `Every election carries the same 12-month
  band` and matches `/records a live scheme in (\d+) of the 27 years, first in (\d{4})/`.
  The captured `(\d+)` equals the strip fact `{n} of 27 years with a recorded live
  scheme`. Only when the strip's n = 27 may the partial sentence be absent.

### AC-15 — Carry C8–C15 in their sections
- **Check:** `#control [data-caption="C8"]` contains `Association, not effect.` and
  `no test is run`; `#ministers [data-caption="C9"]` contains `not a tally of credit`;
  `#after [data-caption="C10"]` contains `the page does not decide which`;
  `#benefits [data-caption="C12"]` contains `A missing row means none was recorded`;
  `#findings [data-caption="C13"]` contains `does not show they switched`;
  `#narratives [data-caption="C14"]` contains `rated the same way`;
  `#graph [data-caption="C15"]` contains `Position carries no meaning`;
  `?s=SCHEME_ID` → the SchemeCard money block has `[data-caption="C11"]` containing
  `Enrolled is not paid.`

### AC-16 — Declare a one-sided view when the party filter is on
- **Check:** `?party=PARTY&y=Y_WITH_BALLOTS`: a line under the FilterBar reads `Showing
  one side. The control and the by-party tables below always measure every party.` and
  contains `a[href$="#control"]`. The figcaption contains `party filter on:` and a clause
  starting `filters: ` whose text contains `party=PARTY` — the same string as the
  active-filter line under the strip.

---

## 3. Denominators — FULL build (seats P, S)

*Why: a number without its population is not a fact here. Every count is `a of b`, every
filter shows what it removed, and no percentage exists under b = 10.*

### AC-17 — Show the six strip facts with their populations and as-of
- **Check:** The sticky strip contains ≥ 5 spans matching `/^\d[\d,]* of \d[\d,]* /` and
  the labels `schemes in view`, `of 36 states & UTs with a recorded state scheme`,
  `of 27 years with a recorded live scheme`, `assembly elections recorded`, `outlay rows
  with an actual`, `allegations with a response on record`, and `as of ` followed by a
  date or range. Unfiltered, fact 1 reads `N of N schemes in view` where N equals the
  `tbody tr` count of `[data-twin="schemes"]`.

### AC-18 — Show the live effect of every filter as `{N} → {k}`
- **Check:** `[data-effect]` text matches `/(\d+) → (\d+) schemes/`. Unfiltered, N = k.
  Click the first category chip with a count > 0: `[data-effect]` k equals that chip's
  count, the strip shows `filtered N → k` in amber, and `[data-twin="schemes"] tbody tr`
  count = k.

### AC-19 — Count every category chip, and keep zero-count chips present
- **Check:** Every chip in the Category control matches `/\((\d+)\)$/`. Chips with `(0)`
  have `aria-disabled="true"`, **not** the `disabled` attribute, and `tabIndex` ≥ 0 (they
  can be focused with `.focus()` and become `document.activeElement`). The chip set has
  12 entries.

### AC-20 — Show metric coverage per option and say why an option is unavailable
- **Check:** `/#/welfare` (no y): the Metric options for share/perhead/budgeted/actual
  have `aria-disabled="true"` and accessible names (via `getByRole`) containing
  `unavailable: choose a year`. `?y=Y_MONEY`: the Share option's accessible name matches
  `/(\d+) of (\d+) live state schemes have a figure for FY \d{4}-\d{2}/`; perhead's name
  contains `choose exactly one category`.

### AC-21 — Print the control's three windows, n, points, selection and foot lines at rest
- **Check:** In the margin at `/#/welfare`, the ControlCard titled `Every assembly election
  in the file, with and without a fresh state scheme` contains, in this order, lines
  starting `12 m ·`, `6 m ·`, `24 m ·`, each matching
  `/retained after a fresh scheme: (\d+) of (\d+) · without: (\d+) of (\d+) · unclassified: (\d+)/`;
  a line matching `/^n = (\d+) assembly elections recorded/` and containing `no test is
  run at this n`; a points line matching either `/one election moves a row by up to \d+
  points/` (only if both b and d ≥ 10) or `one election changes a row by one count; too
  few to express in points`; the two lines `selection: elections are in this file because
  research reached them, not by census` and `challenger promises not recorded`; a foot
  line containing `association, not effect` and `run run-`. A `Union ·` block or the line
  `Union: no Lok Sabha election recorded, so the Union is not measured here` is present.

### AC-22 — Print no percentage under b = 10, and always print `a of b`
- **Check:** Over the text of the ControlCard, `#control` (TwoByTwo, sensitivity row,
  by-party, turnover, base rates), the SchemeCard and every twin: for every match of
  `/(\d+) of (\d+)(?:\s*\((\d+(?:\.\d+)?)%\))?/`, if the second capture < 10 then the
  third capture is absent. No element's text matches `/\d%/` without a preceding
  `\d+ of \d+` with b ≥ 10 in the same cell. For any `a of b` with b ≥ 10 in the TwoByTwo
  row ends, a percentage **is** present.

### AC-23 — Count every legend class, including empty ones, and total 36
- **Check:** The legend lists every bin as `/^\S.* \((\d+|empty)/`, then a zero swatch
  with a count or `(empty: …)`, a stipple line with a count, and a line matching
  `/no value \((\d+) of 36\), not zero/`. Sum of bin counts + zero count + stipple count +
  hatch count = 36, and equals `path[data-fill-class]` counts per class.

### AC-24 — Head every section with its denominator line
- **Check:** `#ministers` contains `/named announcer \d+ · dated approval \d+ · dated
  launch \d+ · all three \d+, of \d+ schemes in view/`; `#after` contains `/\d+ dated
  changes across \d+ of \d+ schemes · \d+ undated · \d+ promised, not enacted/`;
  `#findings` contains `/\d+ findings across \d+ of \d+ schemes · D \d+ · R \d+ · A \d+ ·
  An \d+ · \d+ of \d+ allegations answered · \d+ with no date located/`; `#benefits`
  contains `/\d+ rows · \d+ with an amount · \d+ alleged, \d+ of them answered/`; the
  turnover table's note matches `/\d+ state schemes were live at \d+ changes of
  government/`; beside the timing chart `/n = \d+ state schemes binned, of \d+ in view/`
  and `/Uniform timing over a 60-month term would put [\d.]+ in each bin \(analytic\)/`.

### AC-25 — Never print a rate from a missing or tiny denominator
- **Check:** In the base-rates `DataTable` in `#control`, every `Denominator` cell is a
  number or one of the §7.2 rule 11 words (`not stated`, `not computed`, `not located`)
  — never empty, never a bare `—`, never `null`. Every `Rate` cell is one of:
  `not computed` (when `Denominator` is a rule-11 word or `0`), `{num} of {den}` followed
  by a percentage only when den ≥ 10, or `{num} of {den}` plus `rate not printed (den <
  10)`. No `Rate` cell contains `NaN`, `Infinity` or `0%` with den = 0.
  [Corrected] The criterion previously expected a null denominator to print as empty,
  `null` or `0`, which rule 11 forbids; the build prints `not stated` → `not computed`.

### AC-26 — Back every control count with a list of exactly that many rows
- **Check:** For each `a of b` in the ControlCard's 12 m line, the adjacent `<details>`
  whose summary is `which elections` contains `li` count = b (and the retained subset
  count = a where the list marks outcome). For each TwoByTwo cell, its `<details>` `li`
  count equals the cell's number. For the 12 m row: b + d + (both unclassified cells) =
  the `n = E` figure.

---

## 4. No-data ≠ zero — FULL build (seats S, P, A)

*Why: a hatched state that a reader takes as zero is a false statement. Three non-value
textures, each with a reason, and zero drawn only where a file declared its search.*

### AC-27 — Hatch every state without a value, and count them in the status line
- **Check:** `path[data-fill-class="hatch"]` count equals the `{h}` captured from the
  figcaption clause `/(\d+) of 36: none recorded \(hatched\)/`. Each hatched path's `fill`
  attribute starts `url(#nodata-` (the existing IndiaMap pattern) and the pattern element
  contains `<line>` or `<path>` children, not a flat colour.

### AC-28 — Paint no flat zero unless a coverage declaration exists
- **Check:** If the legend's zero line reads `(empty: no research file declares its
  coverage, so no state-year is shown as none)` then `path[data-fill-class="zero"]` count
  = 0 and no state path has `fill="#15171c"`. Otherwise each zero-class state's readout
  (AC-29 procedure) contains `searched, none live`.

### AC-29 — Say `none recorded in this file` in the readout, never `0`
- **Check:** Focus the map svg, press `ArrowRight` until the live region text starts with
  the name of `STATE_NONE` (bounded at 40 presses). The `[aria-live="polite"]` text
  contains `none recorded in this file` and does not match `/:\s*0\b/`. The visible
  readout shows the same words.

### AC-30 — Class hatched states as `none recorded` in the year-slice twin
- **Check:** In `[data-twin="year-slice"]`, every row whose `Class` cell is `none
  recorded` has a metric cell that is not `0` and a non-empty `Reason` cell. Rows whose
  `Class` is `live, no comparable figure` have `Reason` in {`partial`, `not located`,
  `unit not comparable: …`, `amount not located`}. Row count = 36.

### AC-31 — Fill every matrix cell with a word or a value, never a bare dash
- **Check:** In `[data-twin="matrix"]`, every `tbody td` text is one of: a formatted
  number, `none recorded`, an `<abbr title="none recorded">n.r.</abbr>`, `0 (declared)`,
  `/^partial \d+ of \d+$/`, `not located`, `unit not comparable`. No cell is `—`, `-`,
  empty, `NaN` or `undefined`. The header for column `y` reads `{y} (map year)` when `y`
  is set.

### AC-32 — Never render a bare null anywhere on the page
- **Check:** Over every text node in `article` (all views: map, table, `?s=SCHEME_ID`,
  `?st=STATE_NONE`), no node's trimmed text is exactly `—`, `–`, `-`, `NaN`, `undefined`,
  `null`, `0%`, `Infinity`. Every `Source` / `Sources` cell in every table is either a
  `Cite` anchor or the amber mono text `no source in file`, never empty.

### AC-33 — Stipple partial money, and state the lower bound
- **Check:** `?y=Y_MONEY&m=share`: if `path[data-fill-class="stipple"]` count > 0, the
  stipple `<pattern>` contains `<circle>` children (dots, not lines), the figcaption's
  `{p}: live, no comparable figure (stippled)` figure equals that count, and the readout
  for the first stippled state (AC-29 procedure) contains `partial:` and `a partial sum
  is a lower bound and is not shaded`, or `not located`. If a line above the map reads
  `/\d+ states with live schemes have a figure for only some of them/`, its figure equals
  the stipple count. **SKIP with reason** if no stippled state exists in this build.

### AC-34 — Say in the key and the panel that no texture means zero
- **Check:** The ReadingKey at rest contains `None of the three means zero.`
  `?st=STATE_NONE`: the StatePanel contains `STATE_NAME: none recorded in this file.
  Hatched means unknown, not none.` **or** `/was searched for .*; no scheme recorded/`
  (when coverage declares it). `?st=STATE_WITH_VALUE&cat=<a chip with (0)>`: the panel
  reads `No scheme from {State} matches the current filters. This is a statement about
  this file.`

---

## 5. Denials beside claims — FULL build (seats S, A, J)

*Why: an allegation without its response slot is a verdict. The pairing is structural
(one `<dl>` per item) so it survives CSS, screen readers and screenshots alike.*

### AC-35 — Pair every alleged finding with a Response in DOM order
- **Check:** In `#findings` (a) list, count `TierChip` elements reading `alleged` = A.
  Count `dl` elements whose children are, in order, `dt` = `Allegation`, `dd`, `dt` =
  `Response`, `dd` = A. Every alleged chip is a descendant of exactly one such `dl`.
  **SKIP with reason** if A = 0.

### AC-36 — Render the response at the same size and weight as the allegation
- **Check:** For each pair from AC-35, `getComputedStyle` of the allegation `dd` and the
  response `dd`: equal `font-size`, equal `font-weight`, and the response `dd`'s
  `border-left-width` ≥ 2px with a `border-left-color` that is the rose token (compare to
  `getComputedStyle(document.documentElement).getPropertyValue('--color-rose')`). Above
  the first pair, one line reads `Rose rule = the response of those concerned. It marks
  the denial's position, not its credibility.`

### AC-37 — Mark a missing response as missing data, and record two gaps
- **Check:** Every response `dd` from AC-35 either has non-empty text with a `Cite`, or
  is amber and reads exactly `No response linked to this item in the file. The file does
  not record whether one was sought.`, optionally followed by exactly ` It holds {n}
  response(s) to alleged claims about this scheme, printed {where}, none linked to this
  item.` Each such item records two gaps: `#missing` contains a gap line containing
  `response sought: not recorded`, and, for each such item, its own gap line beginning
  `No response linked to an allegation about` that contains the item's allegation text.
  The number of those per-item gap lines equals the number of such `dd`s in `#findings`
  plus the number of `#benefits` alleged rows whose Response cell carries the same
  sentence. The words `No response on record` appear nowhere.
  [Corrected] The sentence was `No response located in this file. …`. A finding or
  benefit row has no id, so the file cannot link a response to it while it may hold one
  for a differently-named claim about the same scheme; "located" was false of the item
  (WELFARE_PAGE §5.6c block 7). `No response located in this file` stays the wording for
  a claim no contra names (AC-39).

### AC-38 — Add the rose-rule line to the ReadingKey when an alleged item is in view
- **Check:** At `/#/welfare`, if `TierChip` `alleged` count on the page > 0, the ReadingKey
  has six lines, the sixth starting `Rose rule = the response of those concerned`. At
  `?tier=documented,reported,analytic` (alleged off) the ReadingKey has five lines.

### AC-39 — Name both sides in every contested claim, never "critics"
- **Check:** In `#findings` (b), each `ContestedFact` shows two position headers; neither
  matches `/critics|opponents|sources say/i`; both are non-empty. Below, a line matching
  `/No response located in this file \((\d+)\) · whether one was sought is not recorded/`
  lists exactly that many alleged claims without a contra (or the count is 0 and the
  list is empty). **SKIP with reason** if `#findings` (b) has no entries.

### AC-40 — Keep a Response column in the benefits ledger
- **Check:** `#benefits table thead` has a `th` reading `Response`, and `Tier`. Every row
  whose Tier cell reads `alleged` has a non-empty Response cell. When its `From` cell
  reads `scheme record` (the row has no id), the Response cell is either text with a
  `Cite` or the AC-37 sentence (with its optional continuation). When `From` names a
  claim id, the Response cell is either text with a `Cite`, or `No response located in
  this file. The file does not record whether one was sought.` (true of a claim no
  contra names). No `th` reads `Total`; no cell text matches `/^total/i`.
  [Corrected] to the AC-37 sentence; see AC-37.

### AC-41 — Pair allegations in the SchemeCard, and refuse to imply none
- **Check:** `?s=ALLEGED_SCHEME`: block 7 contains the same `dl` structure as AC-35 for
  each alleged finding; block 8 either lists rows with a `TierChip` or reads `None
  recorded, which is not the same as none.`; block 7 with no findings reads `No
  evaluation, audit, court finding or survey located for this scheme. Recorded as a gap.`

### AC-42 — Filter findings by tier without filtering schemes
- **Check:** `?tier=documented`: `TierChip` `alleged` count in `#findings` = 0; the tier
  control's effect line matches `/(\d+) of (\d+) findings · (\d+) of (\d+) benefit rows/`
  and contains `filters findings, not schemes`; `[data-effect]` N → k is unchanged from
  the unfiltered page; the strip shows no `filtered`.

---

## 6. URL round-trip of every filter — FULL build (seats J, P)

*Why: a reader must be able to send someone the exact view. Absent = default = unfiltered.
Every control writes the URL with `replace`, and every URL reproduces the view.*

Procedure shared by AC-44 … AC-53, called **ROUND-TRIP(param)**: (1) load the URL with
the param; assert the control state named; (2) `history.length` before and after a
control change differ by 0 (replace, not push); (3) read `page.url()`, open it in a new
page, and assert `innerText` of the stage (`figure`, TimeLanes, margin) and the strip is
identical to the first page; (4) the active-filter line under the strip contains
`{param}=…`.

### AC-43 — Default to unfiltered, nothing selected, no year
- **Check:** `/#/welfare`: `input[aria-label="Year"]` `aria-valuetext` matches
  `/^All years, 2000 to \d{4}$/`; the year readout reads `All years`; Metric selected =
  `Schemes live`; Level = `All`; all four tier toggles `aria-pressed="true"`; no category
  chip pressed; Party has no selection; no `StatePanel`, no `SchemeCard`; `view` = map
  (the `figure` is present, `#stage-tables` details are closed); no active-filter line is
  rendered.

### AC-44 — Round-trip `y`
- **Check:** ROUND-TRIP(`y=Y_WITH_BALLOTS`): range `value` = y, `aria-valuetext` starts
  with y, the mono readout shows y, `[data-ballot]` count > 0. Focus the range and press
  `ArrowLeft`: URL now has `y=Y−1` (Y_WITH_BALLOTS is never the range minimum, §0.3). Click `All years`: `y` leaves the URL and the readout
  reads `All years`.

### AC-45 — Round-trip `m`, and fall back when it cannot be honoured
- **Check:** ROUND-TRIP(`y=Y_MONEY&m=share`): Share selected; figcaption clause starts
  `Share of state budget` and contains `FY`; readout names `money: FY`. Load `?m=share`
  alone: metric renders as `Schemes live`, and an amber line reads `ignored an
  unrecognised m value` **or** the metric option is `aria-disabled` with `choose a year`
  and the fill is the live metric (the spec allows either wording for a stale `m`; the
  fill must be `live`).

### AC-46 — Round-trip `cat` as a comma list
- **Check:** ROUND-TRIP(`cat=<c1>,<c2>` for the first two chips with count > 0): both
  chips `aria-pressed="true"`; `[data-effect]` k = sum of their counts (de-duplicated
  by the twin: `[data-twin="schemes"] tbody tr` = k). Un-press c2: URL `cat=c1`.
  Un-press c1: `cat` leaves the URL.

### AC-47 — Round-trip `party`, and prove the control ignores it
- **Check:** Capture the ControlCard text, the TwoByTwo text, the by-party table text and
  the turnover table text at `?y=Y_WITH_BALLOTS`. ROUND-TRIP(`party=PARTY&y=Y_WITH_BALLOTS`):
  all four texts are **identical** to the capture, except for one added ControlCard line
  matching `/^PARTY as incumbent · 12 m:/` with an accent left border and the by-party
  row for PARTY carrying an accent left border. `[data-ballot]` count is unchanged;
  `[data-ballot][data-muted="true"]` count ≥ 0 and + unmuted = total. Party is never
  pre-selected on `/#/welfare`.

### AC-48 — Round-trip `lvl` without touching the map
- **Check:** Capture `path[data-fill-class]` values per state at `/#/welfare`.
  ROUND-TRIP(`lvl=state`): the same per-state values; the central band reads
  `/hidden by Level: state · \d+ central schemes/`; the effect line contains `the map
  shows state schemes only`. `lvl=central`: `[data-lane="state"]` count = 0 and the
  central band shows lanes.

### AC-49 — Round-trip `st` and move focus to the panel on a user action
- **Check:** ROUND-TRIP(`st=STATE_WITH_VALUE`): the margin shows a `StatePanel` whose `h2`
  contains the state name, a `Link` to `/states/{st}`, and a `button[aria-label^="Close "]`.
  Then, from `/#/welfare`: focus the map svg, `ArrowRight` to a state, press `Enter`: URL
  gains `st=`, `document.activeElement` is the panel `h2` (`tabIndex=-1`), the live region
  text matches `/opened: \d+ state schemes, \d+ elections in the file/`. Press `Escape`:
  `st` leaves the URL and `document.activeElement` is the map svg.

### AC-50 — Round-trip `s`, and answer an unknown scheme plainly
- **Check:** ROUND-TRIP(`s=SCHEME_ID`): the margin shows a `SchemeCard` whose header
  contains `SCHEME_NAME`; the lane for that scheme has `stroke`/`fill` equal to the accent
  token (`--color-accent`); no other lane does. `?s=does-not-exist` renders `` No scheme
  `does-not-exist` in this file. `` with a link that, when clicked, removes `s` from the
  URL. `?st=STATE_WITH_VALUE&s=SCHEME_ID`: the margin shows the SchemeCard (not the
  StatePanel) and a back link `aria-label="Back to {State}"`.

### AC-51 — Round-trip `tier`
- **Check:** ROUND-TRIP(`tier=documented,reported`): exactly those two toggles
  `aria-pressed="true"`; toggling `alleged` on writes `tier=documented,reported,alleged`
  (order as the spec lists tiers); turning all four on removes `tier` from the URL.

### AC-52 — Round-trip `view`, and open the twins under the table view or the hash
- **Check:** ROUND-TRIP(`view=table`): no `figure` map svg is rendered; `#stage-tables`
  `details[data-twin]` all have the `open` attribute; the FilterBar is still present;
  `Copy as TSV` and `Download .tsv` buttons are present above each twin. Reset does **not**
  clear `view`. `/#/welfare#stage-tables` (map view with hash): the three details are
  `open`. Under `view=map` on plain load they are closed.

### AC-53 — Round-trip `q`, list ≤ 8 matches as links, and never auto-select
- **Check:** ROUND-TRIP(`q=<first 6 characters of SCHEME_NAME>`): the search input
  (`input[type="search"][aria-label="Search schemes by name, alias or person"]`) has that
  value; if k ≤ 8 the effect line becomes k links each `href` containing `s=` **and** the
  existing `q=`; no `SchemeCard` is open even when k = 1. Typing in the input updates the
  URL after ≤ 400 ms and the live region announces `/\d+ → \d+ schemes/`.

### AC-54 — Ignore unknown values with a visible notice, and fall back to defaults
- **Check:** `?m=bogus&lvl=nope&view=chart&tier=x`: four amber lines under the strip read
  `ignored an unrecognised m value`, `… lvl value`, `… view value`, `… tier value`; the
  page renders exactly as `/#/welfare` (AC-43 assertions all hold).

### AC-55 — Reset everything but `view`, and copy the exact link
- **Check:** From `?y=Y_WITH_BALLOTS&m=live&cat=<c1>&party=PARTY&lvl=state&st=STATE_WITH_VALUE&tier=documented&view=map&q=a`,
  click `Reset`: URL search is empty or only `view=map`. Click `Copy link`: `await
  navigator.clipboard.readText()` equals `location.href`; live region text = `Link copied`.

### AC-56 — Reproduce the whole view from a URL built through the controls
- **Check:** Starting at `/#/welfare`, set every filter through the UI (range, metric,
  two chips, party, level, tier toggle, map click, lane click, search). Capture
  `page.url()` and the `innerText` of the strip, active-filter line, figcaption, margin
  and TimeLanes. Open the URL in a fresh context: the five texts are byte-identical, and
  the active-filter line lists every set param.

---

## 7. Table twin = visible graphic — FULL build (seats A, P)

*Why: every graphic has a WCAG twin, and a twin that disagrees with the picture by one
row has published two findings. Rows and glyphs come from the same arrays.*

### AC-57 — Match the year-slice twin to the 36 painted states, class for class
- **Check (`?y=Y_WITH_BALLOTS` and `/#/welfare`):** `[data-twin="year-slice"] tbody tr`
  count = 36 = `path[data-fill-class]` count. Per class, the number of rows whose `Class`
  is `none recorded` / `live, no comparable figure` / `searched, none live` / a value
  equals `path[data-fill-class="hatch|stipple|zero|value"]` respectively. The summary
  reads `/Map as a table · 36 states · metric: .+ · year: .+ · filters: .+ · as of .+/`.

### AC-58 — Count the same elections on the map, in the card, and in the twins
- **Check (`?y=Y_WITH_BALLOTS`):** `[data-ballot]` count = E. Rows in
  `[data-twin="year-slice"]` whose `Assembly election in {y}` cell is non-empty = E. The
  ControlCard's `{y}` block lists E entries, each with a `Cite` or `no source in file`.
  `[data-twin="elections"] tbody tr` whose `Election` contains `assembly` and `Date`
  starts with `{y}` = E. Each ballot `<title>` text appears verbatim in one year-slice
  election cell. **SKIP with reason** if `Y_WITH_BALLOTS` is undefined.

### AC-59 — Match the schemes twin to the filter effect and the strip
- **Check (unfiltered, then `?cat=<c1>`, then `?party=PARTY`, then `?q=<q>`):**
  `[data-twin="schemes"] tbody tr` count = k of `[data-effect]` = the strip's `{n} schemes
  in view`. Every row's `Scheme` cell is a link with `s=`.

### AC-60 — Match lane counts to their headers and the lanes twin
- **Check:** The central band header matches `/Central · applies to all states · not
  painted on the map · (\d+) schemes/` and `[data-lane="central"]` count = that number.
  `?st=STATE_WITH_VALUE`: the state header matches `/(\d+) schemes · (\d+) elections in
  the file/`, `[data-lane="state"]` count = the first figure, and the number of election
  rules in the state lanes = the second. The distinct `Scheme` values in
  `[data-twin="lanes"]` ⊇ every lane label text.

### AC-61 — Give the scrubber twin one row per year, agreeing with the readout
- **Check:** `[data-twin="scrubber"] tbody tr` count = 27, first `Year` = `2000`, last =
  `2026`. For `?y=Y_WITH_BALLOTS`: the row for y has `State schemes live` equal to the
  `{n}` in the map readout `/(\d+) state schemes live of (\d+) in view · (\d+) assembly
  elections/` and `Assembly elections` equal to `{e}` = `[data-ballot]` count.

### AC-62 — Export exactly the rows on screen, with the caption line first
- **Check:** For each `[data-twin]` and each section table: a `Copy as TSV` and a
  `Download .tsv` button sit above it; the on-screen caption line matches `/(\d+) rows ·
  filters: .+ · .+ · as of .+ · run run-/` and its `{rows}` = that table's `tbody tr`.
  Click `Copy as TSV`: clipboard text has `rows + 2` lines (caption, header, rows); line 1
  equals the caption line; line 2 is snake_case (`/^[a-z0-9_]+(\t[a-z0-9_]+)*$/`) and ends
  with `as_of\trun_id\tfilters\tsource_urls`; the live region reads `Table copied, {rows}
  rows`. `Download .tsv` triggers a `download` event whose `suggestedFilename()` matches
  `/^welfare-[a-z-]+-\d{4}-\d{2}-\d{2}-run-[0-9a-f]+\.tsv$/`.

### AC-63 — Make the TwoByTwo its own twin
- **Check:** `#control table` (the TwoByTwo) has two data rows plus header, three data
  columns (`Incumbent retained`, `Incumbent lost`, `Unclassified`), each cell a `<details>`
  whose `li` count = its number; each row ends `/(\d+) of (\d+)( \(\d+(\.\d+)?%\))?$/`, the
  percentage present exactly when b ≥ 10 (AC-22) and equal to a/b to within one point
  [Corrected: the row end was anchored at `of b`, which AC-22's required `(x%)` for b ≥ 10
  could never satisfy]; the sensitivity row
  below has the same computed `font-size` as the table cells and matches `/6 m: retained
  \d+ of \d+ with · \d+ of \d+ without — 24 m:/`; then `/n = \d+\. No significance test is
  run at this n\./`.

---

## 8. Keyboard reachability — FULL build (seat A)

*Why: the drawing is invisible to a screen reader; the DOM is the page. Nothing that
changes the view may be reachable only by pointer.*

### AC-64 — Put the skip link first in the stage, and make it work
- **Check:** `a[href="#stage-tables"]` text = `Skip to this stage as tables`. Focus the
  last FilterBar control, press `Tab`: `activeElement` is the skip link. Press `Enter`:
  `location.hash` ends `#stage-tables`, `#stage-tables h3` is visible and the three
  details are `open`. `#stage-tables` has a visible `h3`.

### AC-65 — Drive the map by keyboard and announce each state
- **Check:** `svg[role="listbox"][tabindex="0"]` with `aria-roledescription="map"`, 36 `path[role="option"]` children and `aria-activedescendant` naming the focused option (S3 amendment) `aria-label` matches `/^Map of India, .+, .+,
  \d+ of 36 states with a value; arrow keys move between states, Enter opens one; a
  table version follows$/` and has `aria-describedby` naming the figcaption and legend
  ids. Focus it; press `ArrowRight` three times: the live region text changes each time
  and begins with a state name; the visible readout shows the same text. No element
  inside the svg has `tabindex` ≥ 0.

### AC-66 — Name the scrubber for assistive technology, including the null year
- **Check:** `input[type="range"][aria-label="Year"]` has `min=2000`, `max=2026`,
  `aria-describedby` pointing at the mono readout element, and `aria-valuetext` per
  AC-43/AC-44. Step buttons: `aria-label` matches `/^Previous year, \d{4}$/` and `/^Next
  year, \d{4}$/`. At `?y=2026`: the next button has `aria-disabled="true"`, no `disabled`
  attribute, remains focusable, and its accessible name states the reason. At `?y=2000`
  likewise for the previous button.

### AC-67 — Reach every lane by a real button, and nothing inside the drawing
- **Check:** The TimeLanes drawing `svg` has `aria-hidden="true"` and contains no
  focusable descendant. The label column is `ul > li > button` with accessible names
  matching `/ · (Central|[A-Z].+) · launched (\d{4}-\d{2}-\d{2}|not launched) · \d+ status
  events$/`. Focus the first `[data-lane="central"]` button, press `Enter`: URL gains
  `s=`, the SchemeCard `h2` is focused, and the live region reads `/opened$/`. Press
  `Escape`: `s` leaves the URL and focus returns to that button.

### AC-68 — Name the close and back controls
- **Check:** `?st=STATE_WITH_VALUE`: `button[aria-label="Close {State}"]` exists.
  `?st=STATE_WITH_VALUE&s=SCHEME_ID`: `[aria-label="Back to {State}"]` exists and
  `button[aria-label^="Close "]` exists. Each is reachable by `Tab` from the panel `h2`.

### AC-69 — Keep exactly one live region, and hide decorative swatches
- **Check:** `[aria-live]` count = 1 on every route in this document, with
  `aria-live="polite"`. Every dash swatch in the tier toggles and `TierLegend` has
  `aria-hidden`; each toggle's accessible name is the tier word.

### AC-70 — Keep the DOM order the reader hears
- **Check:** Using `compareDocumentPosition`: FilterBar precedes the skip link, which
  precedes the map `figure`, which precedes the margin (`ReadingKey`/`ControlCard` or
  panel), which precedes the TimeLanes, which precedes `[data-caption="C1"]`, which
  precedes `#stage-tables`. The order is the same at 1440 and 390 (CSS may place, DOM
  never reorders).

### AC-71 — Caption or label every table
- **Check:** Every `table` in `article` has a non-empty `<caption>` **or** is inside a
  `[role="region"][aria-label]`; every `<th>` has non-empty text. Every `details >
  summary` can receive focus via `Tab` in sequence (no `tabindex=-1`).

---

## 9. Mobile at 390 px — FULL build (seat M)

*Why: the brief's phone reader will not scroll sideways, meets the strip before the
explanation, and has no hover. The page must fit, explain first, and open on tap.*

Context: `390×844`, `hasTouch`, `isMobile`, `reducedMotion: 'reduce'`.

### AC-72 — Scroll the page vertically only
- **Check:** For each of `/#/welfare`, `?y=Y_WITH_BALLOTS&m=share&st=STATE_WITH_VALUE`,
  `?s=SCHEME_ID`, `?view=table`, `?party=PARTY&y=Y_WITH_BALLOTS`, `?st=STATE_NONE`:
  `document.documentElement.scrollWidth <= window.innerWidth` **and**
  `document.body.scrollWidth <= window.innerWidth` (390), after scrolling to the bottom and
  back. Every `overflow-x-auto` container that has `scrollWidth > clientWidth` is a table
  wrapper or the TimeLanes container, never `body` or `article`.

### AC-73 — Collapse the filters into a labelled details block
- **Check:** A `details > summary` matches `/^Filters \(\d+\) · \d+ → \d+ schemes$/`. Inside
  it, Metric and Level are `<select>` elements; unavailable metric `<option>`s carry
  their reason in the option text (e.g. `/unavailable: choose a year/`). Category chips
  live in an `overflow-x-auto` row that does not widen the page (AC-72 still holds).

### AC-74 — Pin one scrubber above the map within the 140 px budget
- **Check:** `[data-pinned-stack]` `getBoundingClientRect().height <= 140`. Exactly one
  `input[type="range"][aria-label="Year"]` is **not** `aria-hidden` while the pinned copy
  is in view (the TimeLanes copy has `aria-hidden="true"` or lives inside an
  `aria-hidden` ancestor). The pinned range's bounding height ≥ 44. Its
  `aria-valuetext` follows AC-66.

### AC-75 — Open the state panel directly under the map on tap, readout first
- **Check:** `page.tap` the centre of the path for `STATE_WITH_VALUE` (from its
  `getBoundingClientRect`). URL gains `st=`. The `StatePanel` element's top ≥ the map
  `figure`'s bottom and < the TimeLanes container's top. The panel header's top ≥
  `[data-pinned-stack]` bottom and < 844 (within the viewport after the scroll). The
  panel's first block is the readout: its first line begins with the state name and its
  second matches the metric line or a reason.

### AC-76 — Scroll the clock inside its own box, opened on the latest years
- **Check:** The TimeLanes container has `scrollWidth > clientWidth` and its svg
  `min-width` ≥ 580px. On load the last axis label (`/^2026/`) has `getBoundingClientRect().
  right <= container.right + 1`. A mono line above it matches `/^showing \d{4}–\d{4}$/`;
  buttons `‹ earlier years` and `later years ›` exist; clicking `‹ earlier years`
  decreases `scrollLeft` by about one `clientWidth` (± 8px). Setting `y=2003` via the
  pinned range re-scrolls so the 2003 column is within the visible box.

### AC-77 — Scroll each table in its own region, with a column count
- **Check:** Every `DataTable` wrapper on the page is `[role="region"][aria-label]` whose
  `aria-label` equals the table's caption line, has `overflow-x: auto`, and a mono line
  above it matching `/^\d+ columns · scroll → for the rest$/`. The by-party and turnover
  tables render instead as stacked blocks: for each party a heading followed by lines
  matching `/^.+: \d+ of \d+/` with their `<details>`; `All parties` is the first block.

### AC-78 — Keep mono text at or above 12 px, and move strip facts rather than hide them
- **Check:** For every element whose computed `font-family` contains `mono` and which has
  a non-empty own text node, `parseFloat(font-size) >= 12`. The sticky strip shows ≤ 3
  facts; the labels `outlay rows with an actual` and `allegations with a response on
  record` still appear in `article` (in a non-sticky line under the Byline). The 9px lane
  amount labels are absent and the glyph legend row says so (`/amount labels .* (omitted|
  in the scheme card)/`).

### AC-79 — Make ballots legible and the filter clause visible on a phone
- **Check:** `?y=Y_WITH_BALLOTS`: every `[data-ballot] rect, [data-ballot] path`
  bounding box width and height ≥ 9px; each `[data-lid="true"]` ballot's lid element
  height ≥ 2px. `?party=PARTY&y=Y_WITH_BALLOTS`: the figcaption `li` containing
  `filters:` is visible (`isVisible()`, and the Filters `<details>` is closed). The year's
  election list (ballot · state · incumbent → winner · `fresh within 12 m`) is rendered
  directly under the figcaption, each entry with a `Cite` or `no source in file`.

### AC-80 — Explain the empty state before any number on a phone (EMPTY build)
- **Check (EMPTY, 390×844):** AC-01 … AC-03 hold (the callout is AC-02's exact title
  line, `text="Register not yet promoted"`, count 1); the callout's `getBoundingClientRect().
  top` < the Byline's top; the first visible number-bearing line in `article` below the
  callout is the strip's `0 schemes`. No horizontal page scroll (AC-72 procedure).

---

## 10. Frozen channels, fold and house rules — FULL build (seats S, A, J)

*Why: on this platform the encoding is part of the claim. A dash that is not a tier, a
colour that is a party, or a caption pushed below the fold is a false statement.*

### AC-81 — Keep the scrubber in the first viewport at 1280×800
- **Check (`1280×800`, `/#/welfare`):** the TimeLanes scrubber row (`input[aria-label=
  "Year"]` closest row) has `getBoundingClientRect().bottom <= 800` on load with `scrollY
  === 0`. The map `figure` height is within `[420, 620]`.

### AC-82 — Dash only for tier, and one analytic edge
- **Check:** Within the stage (`figure` svg and TimeLanes svg), every element with a
  `stroke-dasharray` attribute or computed style is either the analytic band's left edge
  (`8 3 2 3`) or a tier swatch inside `TierLegend`/tier toggles. No `[data-ballot]`
  descendant, no state `path`, no lane bar has a dash. Every `[data-ballot]` stroke is the
  text token or, when `data-muted="true"`, the muted token — never a third colour.

### AC-83 — Keep the five fills distinct and never transition them
- **Check:** The declared fills of hatch (`url(#nodata-…)`), stipple (`url(#…)` with
  circles), zero (`#15171c`), the darkest ramp step and the page background
  (`--color-bg`) are five distinct values, and the two patterns have different child
  element types. Computed `transition-property` of every state `path` does not include
  `fill`. The check saves greyscale screenshots of the legend at 360 and 1280
  (`--shots`) for the human pass the spec requires (§7.2 rule 2); the automated part is
  the DOM distinctness.

### AC-84 — Label every page-computed figure, and source none of them
- **Check:** Every element containing `computed here` or `analytic` has no `Cite` anchor
  as a direct child of the same row/cell. In `?s=SCHEME_ID` block 4, every row with `/ yr
  ×12` also contains `computed here`, and its `Cite` sits with the recorded amount. The
  Distribution chart renders one `series` only (one legend entry), and the uniform
  expectation appears as text containing `(analytic)` and as a twin column headed
  `Uniform expectation (analytic)`.

### AC-85 — Use British spelling in prose and no motion
- **Check:** Over the visible text of `article` (excluding `code`, `Cite` labels and
  quoted narrative claims), no match for `/\b(color|center|organiz\w*|favor|analyz\w*|
  program(?!me)\b)/`. No element in the stage has an `animation-name` other than `none`,
  and no autoplay control exists (`getByRole('button', { name: /play/i })` count = 0).

---

## 11. Coverage matrix

| brief requirement | criteria |
|---|---|
| honesty captions | AC-09 … AC-16 |
| denominators | AC-17 … AC-26, AC-63 |
| no-data ≠ zero | AC-05, AC-27 … AC-34 |
| denials beside claims | AC-35 … AC-42 |
| URL round-trip of every filter | AC-43 … AC-56 (`y m cat party lvl st s tier view q`, unknown values, Reset, Copy link) |
| table twin row count = visible graphic | AC-57 … AC-63 |
| scaffold state (≥ 200 chars, says so) | AC-01 … AC-08, AC-80 |
| keyboard reachability | AC-04, AC-49, AC-64 … AC-71 |
| mobile at 390px, no horizontal scroll | AC-72 … AC-80 |
| frozen channels and house rules | AC-81 … AC-85 |

## 12. How to run

The criteria are written to be implemented as `scripts/welfare-acceptance.mjs`, following
`scripts/graph-viewport.mjs` (own static server over `dist`, pinned Chromium, `check(name,
ok, detail)` lines, non-zero exit on any failure). It takes `--build empty|full` so the
two builds are run separately, and prints `SKIPPED: <reason>` for a fixture the build does
not contain. A skipped criterion is reported in the run summary; it is never counted as
passed. Nothing in the script imports from `src/`.
