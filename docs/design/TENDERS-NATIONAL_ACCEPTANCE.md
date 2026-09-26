# /tenders — the national section (CPPP scrape) — acceptance criteria

*Written 2026-09-26 from `docs/design/TENDERS_NATIONAL.md` (the judged spec with UX
amendments U1–U21 applied). Procedure shape: the sweetclaude `product-user-stories` skill —
numbered ids, one observable behaviour each, the acceptance test stated so that a developer
can write it without asking. That skill's state files, manifest, persona prompts and format
prompts are not used; the five **synthetic** seats of `TENDERS-NATIONAL_UX_REVIEW.md` are
referred to only to say whom a group serves.*

*Each criterion is one behaviour of the **built page in `dist`**, verified by a headless
Playwright check the way `scripts/smoke.mjs` and `scripts/pages/energy.test.mjs` already
work. Nothing here inspects `src/`. Where a criterion depends on a record being present, the
check derives its fixture from `research/raw/cppp/*.json` at test time; when the record does
not exist in the data under test the check reports `SKIPPED: <reason>` — never a pass. A
criterion that cannot be written as a Playwright assertion against `dist` does not belong on
this list. The spec's deferred amendments (D1–D10 at its end) are not criteria.*

*Two of the spec's §6 gates are **not** promoted here, and the reason is stated so nobody
reads their absence as an oversight: gate 24 (axe-core) needs a dependency the repository
forbids, so its structural content is spelt out as AC-64–AC-68 and AC-74–AC-79 instead; gate
17's saturation rule is kept (AC-55) but measured on computed styles, not on source.*

---

## 0. Conventions every check shares

**Routing.** `HashRouter`, so a parameterised URL is `{base}/#/tenders?section=national`.
Read the live URL with `new URL(page.url()).hash`; parse its `?…` part with `URLSearchParams`;
read the in-page fragment (the jump list, spec §2 U3) as the part after the second `#`.
`base` is the local `dist` server that `scripts/smoke.mjs` already starts. The section's
canonical entry is `?section=national`; **`?view=national` is the alias the task named** and
AC-02 proves it lands on the canonical URL. Every other check opens the canonical URL.

**Loading.** Every check does `page.goto('about:blank')` first, then `page.goto(url,
{ waitUntil: 'networkidle' })`, then waits for `#cppp` to exist **and** for no element
inside `#cppp` to contain the word `loading` (the section's files are dynamic imports, spec
§5 U16), then settles 700 ms. Every check collects `console` errors and `pageerror` events
with smoke's `external` allow-list and **fails on any**.

**Viewports.** `D` = 1280 × 800. `M` = 390 × 844 with `isMobile: true, hasTouch: true`.
Every context has `reducedMotion: 'reduce'` and `permissions: ['clipboard-read',
'clipboard-write']`. A criterion names the viewport(s) it runs at; unmarked means `D`.

**Numbers.** The page formats counts with its number helper (en-IN grouping). A check
compares numbers after removing `,`, thin spaces and NBSP, never by string equality with a
raw JSON value. A percentage on the page is compared to one decimal.

**Fixtures.** Two builds:

- **`dist`** — the ordinary build, with `research/raw/cppp/*.json` present (today: six files,
  `asOf 2026-09-26`, `generatedBy scripts/cppp/build.py@9e80f75`; those values are read, never
  written into a check).
- **`dist-empty`** — the scaffold state (zero records). Built from a scratch copy of the
  repository in which `research/raw/cppp/` is absent, with `npx vite build --outDir dist-empty`.
  The build must succeed without the directory (the accessor's imports are discovered, not
  listed). Never edit `research/raw/` or `*.generated.ts` in the working tree to get this
  state. `TENDERS_DIST` pins the suite to one copy of a build so a concurrent rebuild cannot
  poison it.

**Data-derived handles.** Checks never hard-code an id, a label, a name or a count. They read
`research/raw/cppp/*.json` at test time and derive:

| handle | derivation |
|---|---|
| `FIX.rows`, `FIX.tids`, `FIX.dedup` | `provenance.provenance.rows`, `.distinctTenderIds`, `.afterDedupRows` |
| `FIX.asOf`, `FIX.gen` | `provenance.provenance.asOf`, `.generatedBy` |
| `FIX.digests` | `provenance.provenance.inputs[].sha256_16` (two today) |
| `FIX.dataset`, `FIX.scrapedAt` | `provenance.provenance.dataset`, `.scrapedAt` — **both absent today**; a criterion states its form for each case |
| `FIX.caveat` | `rates.caveat` verbatim |
| `FIX.denomN`, `FIX.denomText`, `FIX.excl` | `rates.denominatorN`, `rates.denominator`, `rates.excludedFromDenominator.bidsNullOrZeroOrOver1000` |
| `FIX.years[p]` | `rates.byPortalYear` rows for portal `p` (`central`, `state`), in emitted order |
| `FIX.scrapeYear` | `FIX.scrapedAt.value`'s year when the field exists; otherwise **[Fixed here]** the largest numeric `year` in `rates.byPortalYear` with `n ≥ 30` that is ≤ the year of `FIX.asOf` (today 2026). The spec leaves the fallback open; this document fixes it so the `partial` label (AC-40) has one answer |
| `FIX.notPlotted[p]` | rows of `FIX.years[p]` whose `year` is non-numeric, or > `FIX.scrapeYear`, or `n < 30` |
| `FIX.plotted[p]` | the rest of `FIX.years[p]` |
| `FIX.hatchYears[p]` | rows of `FIX.notPlotted[p]` whose year is numeric, ≤ `FIX.scrapeYear`, with `n < 30` (none today) |
| `FIX.thin[p]` | rows of `FIX.plotted[p]` whose `n` is below half of the median `n` of `FIX.plotted[p]` |
| `FIX.ind[key]` | `redflags.indicators` entry by `indicator` key (four today) |
| `FIX.buyers25` | `redflags.singleBiddingByBuyer` (25 rows); `FIX.unparsed25` = those whose `buyer` ends `/ unparsed` (one today) |
| `FIX.byOrg` | `rates.byOrganisation`; `FIX.pooled` = its row whose `key` starts `pooled`; `FIX.stateKeys` = distinct prefixes before ` / ` of state-portal keys |
| `FIX.states` | `STATES` names from `src/data/india-states.json` (36) |
| `FIX.conc` | `concentration.byBuyer`; `FIX.nullHhi` = rows with a `null` `hhiMarkedValue` or `hhiMarkedCount`; `FIX.mostlyUnmarked` = rows with `unmarkedShareOfAwardsPct ≥ 50` |
| `FIX.winners` | the set of every `topMarkedWinners[].name` across `FIX.conc`; `FIX.markerRegex` = `provenance.provenance.markerRegex` |
| `FIX.timing` | `timing.json`: `n`, `excludedAocBeforeClosing`, `excludedDateMissing`, `daysClosingToAoc` (11 bins), `shareLe2Days`, `aocByFinancialYearMonth` (12), `innocentReading` |
| `FIX.quality` | `quality.json` |
| `FIX.sample` | `sample-verification.json`: `rows` (40), `agreement`, `finding`, `redraw`, `verdictRule`, `seed`, `rng`, `strata`, `strataShortfall`; `FIX.matchSum` = Σ `agreement.*.match`; `FIX.fetchDate` = the `fetch.fetchedAt` date of the rows (one date today) |
| `FIX.data` | the set of every string value in the six files (for "the page's own words" exclusions), plus every `FIX.states` name |

**Test hooks the page must expose.** Plain `data-*` attributes carry no visual channel and do
not touch the frozen encodings. They are the only additions these criteria impose on the
build beyond what the spec fixes:

| attribute | on |
|---|---|
| `data-strip-fact="1".."6"` | each fact of the §3.0 denominator strip, in spec order |
| `data-figure` | the §3.2 figure sentence |
| `data-mark="point\|hatch\|bar"` with `data-portal`, `data-year` or `data-key`, and `data-flag="plotted\|thin\|partial\|nodata"` | every data mark in every chart |
| `data-nodata` | every hatched no-data slot, cell, row or block |
| `data-twin="quality\|families\|rates-central\|rates-state\|composition\|states\|bands\|types\|hist\|fymonth\|buyers\|tenths\|concentration\|agreement\|sample\|provenance"` | each `<table>` |
| `data-not-plotted` | each rates-twin row listed under `not plotted` |
| `data-effect` | every live `{N} → {k} …` or `showing {k} of {N} …` effect line |
| `data-innocent` | every innocent-reading element |
| `data-rate` | every `{count} of {familySize} ({pct}%, 95% interval {lo} to {hi})` sentence |
| `data-gap` | each line of the §3.9 gaps panel |
| `data-source-line` | the §3.0 and §3.8 source lines |
| `data-pending` | any placeholder rendered while a file's import is pending |

**Section anchors** (spec §2 U3): `#cppp`, `#cppp-quality`, `#cppp-families`, `#cppp-rates`,
`#cppp-states`, `#cppp-bands`, `#cppp-timing`, `#cppp-redflags`, `#cppp-concentration`,
`#cppp-sample`, `#cppp-gaps`, `#cppp-provenance`. `SEC` below means the element with
`id="cppp"`'s enclosing `<section>`.

**Verbatim strings** are quoted from the spec. Where the spec interpolates a value, the check
computes it from `FIX` and asserts the sentence with that value.

---

## 1. Render, entry and scaffold state

### AC-01 — The section renders, error-free, above the registers
- **Behaviour:** `section=national` renders the CPPP section directly after the page head, and the registers and OCDS section still render below it.
- **Check:** `/#/tenders?section=national`. Assert `h2#cppp` exists with text `The CPPP award scrape — a different dataset from the registers below` and is the **first `h2` in the document**; the element before it in `SEC` reads `National · CPPP award scrape`. Assert `document.body.innerText.length ≥ 200`. Assert the page `h1` is unchanged (`The procurement register, and what it cannot tell you`) and that, **after** `SEC` in DOM order, the register's `Byline`, a `StatGrid`, the View/Scope controls and ≥ 1 further `h2` all exist. Zero console or page errors.

### AC-02 — `view=national` lands on `section=national` with every other param kept
- **Behaviour:** The alias the first spec named is rewritten with `replace`, so old links and the smoke path still land.
- **Check:** Record `history.length`, then `/#/tenders?view=national&scope=centre`. After load, the hash's params are exactly `section=national` and `scope=centre` (no `view`); `history.length` is unchanged; `h2#cppp` exists; the Scope button `centre` has `aria-pressed="true"`.

### AC-03 — The default view is unchanged except for one head link and one byline sentence
- **Behaviour:** Without `section`, no CPPP content renders; the reader is told the scrape exists and how it differs.
- **Check:** `/#/tenders`. Assert `#cppp` does not exist and no element contains `FIX.caveat`. Assert a link in the header reads `The CPPP award scrape — {FIX.rows} award rows, reported, not a national statistic` (with `FIX.rows` en-IN formatted) followed by an arrow element with `aria-hidden="true"`, and its `href` resolves to `?section=national`. Assert the `Byline` contains `A separate national award scrape (reported, unverified) is in the CPPP section.` and that sentence contains a link to `?section=national`. Assert the `h2` count and the StatGrid text equal those of the same URL in the last green smoke run of the register (they are compared to a snapshot of `/#/tenders` taken by the same suite on `dist`, not to a literal).

### AC-04 — Zero records still renders a page that says so
- **Behaviour:** With the pipeline outputs absent, the section prints the absence sentence and nothing else — no rate, no table, no chart, no zero.
- **Check:** `D` and `M`, **`dist-empty`**, `/#/tenders?section=national`. Assert `innerText.length ≥ 200`. Assert `SEC` contains `CPPP pipeline outputs not present in this build`. Assert inside `SEC`: zero `table`, zero `svg`, zero `[data-mark]`, no text containing `%`, no `[data-strip-fact]`, no `[data-figure]`, no digit followed by ` award`. Assert the registers still render below (AC-01's "after" assertions). Zero console or page errors.

### AC-05 — The scaffold head link never says `0 award rows`
- **Behaviour:** No-data never reads as zero, in the header either.
- **Check:** **`dist-empty`**, `/#/tenders`. Assert the head link (AC-03) either is absent or contains `not present in this build`, and that no element in the header matches `/\b0 award rows\b/`. The byline sentence, if present, does not contain a digit.

### AC-06 — A pending import shows a named placeholder, never the absence sentence
- **Behaviour:** A lazily loaded file still loading is `loading`, not `absent`.
- **Check:** `/#/tenders?section=national` with `page.route('**/*.js', …)` delaying by 4 s any response whose body contains `hhiMarkedValue` (the concentration chunk). During the delay, assert `#cppp-concentration [data-pending]` exists, contains `loading` and names the table (`concentration`), and that `SEC` does **not** contain `CPPP pipeline outputs not present in this build`. After the delay, `[data-pending]` is gone and `[data-twin="concentration"]` exists.

### AC-07 — Quality comes before any rate, in DOM order
- **Behaviour:** A reader arriving by heading or table navigation meets the head, the caveat and the quality table before any percentage.
- **Check:** `/#/tenders?section=national`. Let `caveat = #cppp-caveat`. Assert `caveat.compareDocumentPosition(x) & FOLLOWING` for the first element `x` in the document whose own text node contains `%`. Assert the first `h3` in the document is inside `SEC` and reads the §3.0 name, and the first `table` in the document is `[data-twin="quality"]`. Assert `#cppp-quality` precedes `#cppp-rates` and `#cppp-rates` precedes the first `svg` in `SEC`.

### AC-08 — Heading levels run h2 → h3 → h4 with no skips
- **Behaviour:** The outline is the spec's outline.
- **Check:** `/#/tenders?section=national`. Collect `SEC h2, h3, h4` in order; assert the first is `h2#cppp`, that no step increases by more than one level, that there are ≥ 10 `h3` (§3.0–§3.9), and exactly `FIX.ind` count of `h4` inside `#cppp-redflags` reading, for the mapped keys, `Single bidding`, `Non-open tender type (Limited)`, `Short decision window (two days or fewer)`, `Repeat single-bidder pairs (marked winners)`; an unmapped key, if any, appears as its raw key inside `<code>`.

### AC-09 — Hide removes `section` and keeps every other param
- **Behaviour:** The section can be dismissed without losing the register's state.
- **Check:** `/#/tenders?section=national&view=map&scope=states`. Click the link `Hide the CPPP section`. Assert the hash's params are exactly `view=map` and `scope=states`; `#cppp` is gone; the map view renders (the View button `map` has `aria-pressed="true"`).

---

## 2. Honesty captions

### AC-10 — The caveat is a body paragraph, verbatim, before any rate, and every rates table points at it
- **Behaviour:** `rates.caveat` is read as prose, not as a caption, and screen readers hear it with each rates table.
- **Check:** `/#/tenders?section=national`. Assert `p#cppp-caveat` text equals `FIX.caveat`; its computed `font-size` equals that of the first `Prose p` on the page and is ≥ 14px; it has no `caption` or `details` ancestor; it is preceded in DOM order by the `Read this first` label. Assert `[data-twin="quality"]`, `[data-twin="rates-central"]`, `[data-twin="rates-state"]`, `[data-twin="bands"]`, `[data-twin="types"]` and `[data-twin="buyers"]` each have `aria-describedby` containing `cppp-caveat`. Run at `M` too.

### AC-11 — The verification line states what could be checked, and links to the sample
- **Behaviour:** Before any figure, the page says the dataset's agreement with the portal is unknown.
- **Check:** `/#/tenders?section=national`. Assert an element between `h2#cppp` and `#cppp-caveat` reads `Verification: {FIX.matchSum} of {FIX.sample.rows.length} sampled rows could be checked against the portal on {FIX.fetchDate} (every stored link returned the portal's “Invalid Url” page). Every figure below is dataset-only.` and contains `a[href$="#cppp-sample"]`. Assert a `TierChip` reading `Reported` precedes it, followed by `the portal is the primary record; this scrape's agreement with it is unknown (see verification)`.

### AC-12 — Tier is spoken text on every table and chart
- **Behaviour:** No caption relies on a chip's colour to say `reported`.
- **Check:** `/#/tenders?section=national&rows=all&buyers=all`. For every `SEC table`: its `caption` text, or the text of the element its `aria-describedby` names, contains `tier: reported (dataset-only; portal agreement unknown)` and the word `reported`. For every `SEC svg[role="img"]`: the same holds of its caption or described-by element. Assert every `TierChip` in `SEC` has visible text `Reported` and no `stroke-dasharray` on any element inside it.

### AC-13 — The rates chart carries its three frozen caption lines
- **Behaviour:** The small multiples never appear without the sentences that say what a slope is not.
- **Check:** `/#/tenders?section=national`. In `#cppp-rates`, assert an element after the `svg` and before `[data-twin="rates-central"]` contains, verbatim, `No change of government is marked. The scrape's composition by year (which bodies, which states, which tender types) is not constant, and the two portals are not the same population; a difference between the lines or a slope within one is a fact about the scrape before it is a fact about procurement.`, then `The interval covers sampling variation only. It does not cover the scrape's agreement with the portal, which is unknown (verification).`, then `The state portal is not India's states: {k} of {FIX.states.length} states and UTs appear (see §3.2a).` where `k` equals the number of `[data-twin="states"] tbody tr` without `[data-nodata]` and not under `spellings that match no state name`. Assert `isVisible()`, no `details` ancestor. Run at `M` too.

### AC-14 — Years are AOC years, said so, and the two year fields are reconciled
- **Behaviour:** Every year header says which year, and the caption states how many rows differ between the two.
- **Check:** `/#/tenders?section=national`. Every `th` in `[data-twin="rates-central"]`, `[data-twin="rates-state"]` that names a year column reads `AOC year`; every per-year `th[scope="row"]` in `[data-twin="quality"]` contains `portal year`. The `#cppp-rates` caption contains `portal year` and the figure `FIX.quality.dates.portalYearDiffersFromAocYear` (en-IN). The caption also states the thin-coverage rule (contains `half`, `median`) and the count `FIX.notPlotted.central.length + FIX.notPlotted.state.length` with `not plotted`.

### AC-15 — Bands and types carry their captions and the floor sentence
- **Behaviour:** The unusable-value group says what it is a rate over; the type axis says it mixes category and method.
- **Check:** `/#/tenders?section=national`. In `#cppp-bands`: a caption contains `This is a rate over rows the pipeline could not value, not over a value band. In this scrape a missing value and a single bid travel together (median bids {m}).` with `m` = the `medianBids` of the last `rates.byValueBand` row; `FIX.quality.contractValue.implausibleRule` is printed beside the group; the axis label of the types chart reads `category, and one method`; `FIX.quality.tenderType.note` appears verbatim under the types chart; beside `Limited` the text `FIX.ind.nonOpenTenderType.note` appears with the figure `nonOpenLabelsLeftInOtherUnknown.n`. If composition by portal and type is not emitted (`rates.byPortalTenderType` absent), the bands caption says so.

### AC-16 — Timing captions: unequal bins, and the innocent reading at the same size
- **Behaviour:** The histogram's caption stops the reader taking heights as densities; the two-day figure never travels without its boring explanation.
- **Check:** `/#/tenders?section=national`. In `#cppp-timing`: caption contains `Bins are unequal widths; bar heights are counts, not densities.`; an element `[data-rate]` reads `{count} of {n} ({pct}%, 95% interval {lo} to {hi})` with the four values of `FIX.timing.shareLe2Days`; the **next element sibling** is `[data-innocent]` with text `FIX.timing.innocentReading` and identical computed `font-size`; the FY-month table's `note` cell on the row whose calendar month is March reads `see the financial-year reading`; `[data-twin="fymonth"]` has `aria-describedby` naming a `p` whose text is `FIX.timing.innocentReading`.

### AC-17 — The state portal is not India's states, and there is no map
- **Behaviour:** The states table is captioned honestly and is never a choropleth.
- **Check:** `/#/tenders?section=national`. `#cppp-states` caption contains `The state portal is not India's states. It is the states and UTs whose bodies publish on one portal.` Assert `#cppp-states` contains no `svg` with ≥ 30 `path` elements and no `[role="listbox"]`; `SEC` contains no element whose accessible name starts `Map of India`.

### AC-18 — Concentration prints its family, definition, naming rule and reading verbatim
- **Behaviour:** An HHI is never shown without what it is over and who could be named.
- **Check:** `/#/tenders?section=national`. `[data-twin="concentration"]`'s caption, or its described-by element, contains verbatim `concentration.family`, `concentration.hhiDefinition`, `concentration.namingRule`, `concentration.innocentReading`; the sentence `{FIX.conc.length} of {c + s} buyers` with `c + s` = `FIX.quality.organisations.centralDistinctBuyers + stateDistinctBuyers`; the sentence `{FIX.quality.winnerMarkers.unmarked} unmarked award rows ({base}) are counted, never named.`; the 50% rule (contains `most winners here are unnamed`); and the `M/s` sentence — with `winnerMarkers.msOnlyNamed` absent, `Some names shown are admitted by “M/s” alone and may be trading names of individuals; the count is recorded in scripts/cppp/README.md and is not yet a field.`; when present, `{n} of {of} names shown are admitted by “M/s” alone and may be trading names of individuals.`

### AC-19 — The verification section leads with its plain reading and says what would upgrade it
- **Behaviour:** The order is reading → agreement → rule and finding → not attempted → upgrade → how to check → frame → rows.
- **Check:** `/#/tenders?section=national`. In `#cppp-sample`, assert these appear in DOM order: `The portal answered “Invalid Url” to every stored link; the finding below gives the reason it appears to be a validity window on the link token. Nothing was checked, and nothing was contradicted.` → `[data-twin="agreement"]` whose caption contains `Agreement with the portal is unknown, not zero.` → `FIX.sample.verdictRule` entries, `FIX.sample.finding` and `FIX.sample.redraw` verbatim (the token pattern `<b64 numeric id>A13h1<b64 key>A13h1<b64 unix time>` inside `<code>`) → `The portal's operator and the dataset's publisher were not asked about link validity.` → `a fresh sample from a scrape whose links resolve, meeting the agreement threshold stated in the finding.` → `tender_id and buyer are enough for a manual search of the portal's Results of Tenders page, which sits behind an image captcha; scripts/cppp/build.py re-derives every number from the named dataset.` → seed `FIX.sample.seed`, `FIX.sample.rng`, `strataShortfall` and a full-width `pre` holding the draw SQL → `[data-twin="sample"]`.

### AC-20 — The source line is derived, printed twice, copied verbatim, and never a literal
- **Behaviour:** The dataset's origin comes from `provenance.dataset` or is declared missing; the page source holds no dataset name.
- **Check:** `/#/tenders?section=national`. Assert two `[data-source-line]`, one in `SEC`'s head (before `#cppp-quality`) and one in `#cppp-provenance`, with identical text. With `FIX.dataset` absent, the text is `Dataset origin not yet in provenance.json (recorded in scripts/cppp/README.md)` and `[data-gap]` lines include it. With `FIX.dataset` present, the text matches `Source: {name} ({url}), licence {licence}; scraper {scraper}; scraped {…}; pipeline {FIX.gen}; computed {FIX.asOf}. Tier: reported.` Click `Copy citation`: `navigator.clipboard.readText()` equals the line's text and a `[role="status"]` or `aria-live` region announces success. **Source guard:** read every `dist/assets/*.js`; with `FIX.dataset` absent, none contains `rumourscape`; with it present, the only chunks containing `dataset.name` also contain `sha256_16` (they are data chunks).

### AC-21 — The gaps panel is at findings size, before the footer, and each line is derived
- **Behaviour:** Absence is a result and is set like one.
- **Check:** `/#/tenders?section=national`. `#cppp-gaps` precedes `#cppp-provenance`; it is not inside a `footer`; its `[data-gap]` lines have computed `font-size` equal to `[data-rate]`'s. Lines present: `{FIX.matchSum} of {n}` fields checkable; the sentence of `FIX.timing.innocentReading` beginning `Election-calendar clustering` (verbatim; or the whole reading if it cannot be isolated); `No external comparator is shown. EU and OECD single-bidding shares are computed over above-threshold contracts with different tender-type mixes and are not comparable to this denominator; the comparison offered is the scrape against itself, by portal, type and value band.`; per-portal tender-type composition not emitted (while `rates.byPortalTenderType` is absent); `{k} states and UTs are absent from the state portal` with a link to `#cppp-states` and `k` equal to the `[data-nodata]` row count in `[data-twin="states"]`; the comment line (`no body named in this section was asked for comment`); one line per prerequisite field still absent (`provenance.dataset`, `provenance.scrapedAt`, `winnerMarkers.msOnlyNamed`, `redflags.singleBiddingByBuyerFamily`, `rates.byPortalTenderType` today). Assert the `Election-calendar clustering is not computed` sentence also appears in `#cppp-timing`.

### AC-22 — The page's own words carry no party or leader
- **Behaviour:** Headings, captions, labels and notes never name a party or a leader; data strings are data.
- **Check:** `/#/tenders?section=national&rows=all&buyers=all`. Take `SEC.innerText`, remove every string in `FIX.data` (≥ 6 characters) and assert the remainder has no match for `/\b(BJP|Congress|UPA|NDA|Modi|Gandhi)\b/` and none for `/\b(opposition|ruling|government of the day)\b/i`. (A buyer named `Mahatma Gandhi Institute of Medical Sciences` is in the data today and is excluded by construction.)

### AC-23 — Two dates, always labelled
- **Behaviour:** `asOf` is never printed as if it were the data's currency.
- **Check:** `/#/tenders?section=national`. For every text node in `SEC` containing `FIX.asOf`, its nearest block ancestor's text contains `computed` before that date. Every `caption` in `SEC` contains `scraped ` and `computed {FIX.asOf}`; with `FIX.scrapedAt` absent, every `scraped ` is followed by `scrape date not yet a field` (or, in the strip, `scrape date not yet a field (see verification finding)`), and no `caption` contains a second `\d{4}-\d{2}-\d{2}` other than `FIX.asOf`.

---

## 3. Denominators

### AC-24 — The strip carries counts only, in order, and releases where the registers begin
- **Behaviour:** The sticky strip reads award decisions, raw rows, denominator, distinct ids, scraped, computed — no percentage.
- **Check:** `/#/tenders?section=national`. `[data-strip-fact="1"]` = `{FIX.dedup} award decisions after dedup`; `"2"` = `from {FIX.rows} raw rows`; `"3"` = `{FIX.denomN} in the single-bidder denominator`; `"4"` = `{FIX.tids} distinct tender ids`; `"5"` = `scraped {FIX.scrapedAt.value}` or `scrape date not yet a field (see verification finding)`; `"6"` = `computed {FIX.asOf}`. The strip's text contains no `%`. Its container has computed `position: sticky`. Scroll so that the first register `h2` after `SEC` is at the top of the viewport: the strip's `getBoundingClientRect().bottom ≤ 0` (it did not follow into the registers).

### AC-25 — The figure sentence comes first, matches the data, and copies with its citation
- **Behaviour:** One mono sentence with count, family, rate and interval opens the rates, before any chart.
- **Check:** `/#/tenders?section=national`. `[data-figure]` precedes the first `svg` in `SEC`; its text is `{count} of {familySize} award decisions ({ratePct}%, 95% interval {lo} to {hi}) received one bid. Central portal: {c.count} of {c.familySize} ({c.ratePct}%); state portal: {s.count} of {s.familySize} ({s.ratePct}%). Dataset-only; scraped {…}; computed {FIX.asOf}; source: {…}.` with every value from `FIX.ind.singleBidding` and its `byPortal`; it matches `/\d of \d.*%.*interval.*computed/` after de-grouping; its computed `font-family` contains `mono`. Click `Copy figure`: clipboard text starts with the sentence and ends with the `[data-source-line]` text.

### AC-26 — The denominator sentence sits under the chart
- **Behaviour:** The rates chart states what it is over and what it excludes.
- **Check:** `/#/tenders?section=national`. Under the `#cppp-rates svg` and before `[data-twin="rates-central"]`, an element contains `FIX.denomText`, the figure `FIX.denomN` and the figure `FIX.excl` (both en-IN), and the word `excluded`.

### AC-27 — Families: one row per family, every identity sums exactly, every caption links to its row
- **Behaviour:** The reader can reconcile each family to the dedup count or see that the complement is not emitted.
- **Check:** `/#/tenders?section=national`. `[data-twin="families"]` has one `tbody tr` for each of: the rates denominator, each `FIX.ind[*].familyDefinition` (distinct), the timing family, the concentration family. Columns read `family definition`, `N`, `used in`, `reconciles to {FIX.dedup}`. For every row whose reconciliation cell contains `=`, parse it as `a + b (+ c) = d` and assert the arithmetic holds and `d === FIX.dedup` (today: `{FIX.denomN} + {FIX.excl} = {FIX.dedup}` and `{FIX.timing.n} + {excludedAocBeforeClosing} + {excludedDateMissing} = {FIX.dedup}`); every other row's cell reads `complement not emitted`. The concentration row's `N` equals Σ `FIX.conc[].awards` and its cell contains `{FIX.conc.length} of {c + s}` (AC-18). Every `caption` in `#cppp-rates`, `#cppp-bands`, `#cppp-timing`, `#cppp-redflags`, `#cppp-concentration` contains `a[href*="#cppp-families"]`.

### AC-28 — Every rate row shows n and an interval
- **Behaviour:** No row anywhere prints a percentage without its n and its Wilson interval.
- **Check:** `/#/tenders?section=national&buyers=all&rows=all`. For every `tbody tr` in `[data-twin="rates-central"]`, `[data-twin="rates-state"]`, `[data-twin="bands"]`, `[data-twin="types"]`, `[data-twin="buyers"]` that contains a `%`: an `n` cell holding an integer ≥ 1, and an interval cell matching `/^\d+(\.\d)? to \d+(\.\d)?$/` or reading `interval not computed`. The interval cell's header contains `95% interval (Wilson), %`.

### AC-29 — Each indicator card is a labelled list with its family share
- **Behaviour:** Definition, family with share of dedup, count, rate, innocent reading, by-portal table — in that order.
- **Check:** `/#/tenders?section=national`. For each `#cppp-redflags section` with an `h4`: a `dl` whose `dt` texts in order start `Definition`, `Family`, `Count`, `Rate`, `Innocent reading`, `By portal`; the Family `dd` contains `FIX.ind[key].familyDefinition` verbatim and `{familySize}, which is {share}% of the {FIX.dedup} award decisions after dedup` with `share = 100 × familySize / FIX.dedup` to one decimal; the Rate `dd` `[data-rate]` reads `{count} of {familySize} ({ratePct}%, 95% interval {lo} to {hi})` from `FIX.ind[key]`; the By-portal `dd` holds a `table` with exactly 2 `tbody tr` (`central`, `state`) whose counts equal `byPortal[]`.

### AC-30 — The named-buyer table leads with portal base rates and states its frame
- **Behaviour:** Each buyer is read against its portal, and the table says how it was selected.
- **Check:** `/#/tenders?section=national`. `[data-twin="buyers"]`: the first two `tbody tr` read `central portal, every award in the family` and `state portal, every award in the family`, with `n`, single-bidder count and `%` equal to `FIX.ind.singleBidding.byPortal`. Headers are `portal`, `buyer`, `awards in denominator`, `single-bidder awards`, `single-bidder %`, `95% interval`, `response`. The caption contains `redflags.singleBiddingByBuyerNote` verbatim and either `25 of {eligibleBuyers} buyers with at least {threshold} awards` (when `singleBiddingByBuyerFamily` exists) or `the number of eligible buyers is not yet a field`.

### AC-31 — Every filter shows its effect on the denominator, live
- **Behaviour:** `{N} → {k} buyers` beside the control; `showing {k} of {N} buyers`; an announced region.
- **Check:** `/#/tenders?section=national`. Beside the `portal` group in `#cppp-concentration`, `[data-effect]` reads `{FIX.conc.length} → {FIX.conc.length} buyers`. Click `state`: it reads `{FIX.conc.length} → {k} buyers` with `k` = count of `FIX.conc` rows with `portal === 'state'`; the `aria-live="polite"` region's text contains `{k} buyers` and `showing {min(25,k)}`; `[data-twin="concentration"] tbody tr` count = `min(25, k)`. In `#cppp-redflags`, the `buyers` control's `[data-effect]` reads `25 of {eligible} buyers` or the gap form, and after `buyers=all` reads `{FIX.byOrg.length − 1} buyers and the pooled row`.

### AC-32 — Exclusions are printed with their base, here and in the quality table
- **Behaviour:** The two exclusion counts (raw and after dedup) are never conflated.
- **Check:** `/#/tenders?section=national`. `#cppp-timing` contains `AOC dated before closing: {FIX.quality.dates.aocBeforeClosing} raw rows (quality table); {FIX.timing.excludedAocBeforeClosing} award decisions after dedup, excluded here. A date-order defect, excluded, not read as conduct.` and a sentence of the same shape for the missing date count with `{FIX.timing.excludedDateMissing} award decisions`. `[data-twin="quality"]` has a row whose `th[scope="row"]` contains `AOC dated before closing` with count `FIX.quality.dates.aocBeforeClosing` and base `raw rows`. Every `svg[role="img"]` in `#cppp-timing` has an accessible name containing `n = {FIX.timing.n}` and both exclusion figures.

### AC-33 — The quality table is a key/value table with three dedup readings and thresholds in words
- **Behaviour:** Every fact has count, what is counted, base and share; the dedup range is stated.
- **Check:** `/#/tenders?section=national`. `[data-twin="quality"]`: the first paragraph before it reads `FIX.quality.readMeFirst` under a visible label `Read this first about the data`; headers `count`, `what is counted`, `base`, `share of base`; every `tbody tr` has a `th[scope="row"]`, a `what is counted` cell reading `rows`, `tender ids` or `award decisions`, and a share matching `/^\d+(\.\d)?%$/` or `—`. Rows exist with headers containing `Alternative rule, NOT applied — {alternativeOnePerTenderId.rule}` and `Alternative rule, NOT applied — {alternativeOnePerTenderBidder.rule}`. A sentence follows: `How many award decisions the scrape holds depends on the rule: between {min} and {FIX.dedup}. This page uses {FIX.dedup}. The smallest reading counts year/organisation buckets such as {heaviestTenderIds[0].tender_id} ({rows} rows, {distinct_bidders} bidders) as one tender.` with `min` = the least of the three `rows` figures. No text in the table matches `/10\^12|10¹²/` except inside `<code>`, and the phrase `over ₹1 lakh crore (10^12 rupees)` appears. The five `normalisedCounts` classes are visible outside any `details`; a `details > summary` reads `{FIX.quality.tenderType.rawValues.length} raw spellings → 5 normalised classes`; another summary names the marker regex with its term count; the dedup SQL and heaviest-id list are in `details` as `pre`.

### AC-34 — States on the state portal are counted exactly as emitted
- **Behaviour:** Σ n per state equals the data, spellings are never merged, unmatched spellings are listed.
- **Check:** `/#/tenders?section=national`. For each prefix `p` in `FIX.stateKeys`: a `[data-twin="states"] tbody tr` whose first cell text is exactly `p`, whose `award decisions in the denominator` cell equals Σ `n` of state-portal `FIX.byOrg` rows with that prefix, and whose `buyers with n ≥ 30` cell equals their count. Rows whose prefix matches no `FIX.states` name (after the page's exact alias table) sit under a heading `spellings that match no state name` and are still counted. If two prefixes render with the same state name (the alias table maps both), both rows exist with their own counts. The rows are followed by one `[data-nodata]` row per `FIX.states` name matched by no prefix.

---

## 4. No-data is never zero

### AC-35 — Every `byPortalYear` row is in a twin: plotted, or listed as not plotted with its reason
- **Behaviour:** Nothing is dropped silently.
- **Check:** `/#/tenders?section=national`. For each portal `p`: `[data-twin="rates-{p}"] tbody tr` count = `FIX.years[p].length`; the rows with `[data-not-plotted]` = `FIX.notPlotted[p].length`, each under a heading row or `th` reading `not plotted`, each with a reason cell reading one of `out-of-range year`, `after the scrape year`, `n < 30`; every row header is `th[scope="row"]` reading `{p} {year}`. The `#cppp-rates svg` has `[data-mark="point"][data-portal="{p}"]` count = `FIX.plotted[p].length`.

### AC-36 — An in-range year with n < 30 keeps a hatched slot labelled `n < 30`
- **Behaviour:** A thin year is a hatched slot, never a zero point and never absent.
- **Check:** `/#/tenders?section=national`. For each portal `p` and each row in `FIX.hatchYears[p]`: a `[data-mark="hatch"][data-portal="{p}"][data-year="{year}"]` exists with `[data-nodata]`, a visible label `n < 30`, and no `[data-mark="point"]` for that year. If `FIX.hatchYears` is empty for both portals (true today), assert zero `[data-mark="hatch"]` in `#cppp-rates` and report `SKIPPED: no in-range year with n < 30 in this data` for the positive half.

### AC-37 — Thin coverage is hollow and disconnected
- **Behaviour:** A year with n below half the portal's median is a hollow marker with no line into or out of it, and the twin flags it.
- **Check:** `/#/tenders?section=national`. For each `p` and each row in `FIX.thin[p]`: the mark `[data-mark="point"][data-portal="{p}"][data-year="{year}"]` has `data-flag` containing `thin`, computed `fill` of `none` or fully transparent, and no `line`/`path` segment whose endpoints include that mark's `cx, cy` (read the polyline's points and assert the mark's x is not a vertex). The twin row for that year contains `thin coverage: interval shown, slope not to be read`.

### AC-38 — The scrape year is labelled partial
- **Behaviour:** The last year is drawn hollow and named partial, in the axis and in the twin.
- **Check:** `/#/tenders?section=national`. The axis label for `FIX.scrapeYear` and the twin row header for each portal's `FIX.scrapeYear` contain `{FIX.scrapeYear} (partial, to {month})` when `FIX.scrapedAt` exists, else `{FIX.scrapeYear} (partial; scrape date not yet a field)`; the mark for that year has `data-flag` containing `partial` and a hollow fill.

### AC-39 — Absent states are hatched, named, and given no reason
- **Behaviour:** A state not on the state portal is coverage, not conduct, and no unsourced reason is printed.
- **Check:** `/#/tenders?section=national`. In `[data-twin="states"]`, the `[data-nodata]` rows' names, as a set, equal `FIX.states` minus the states the page matched; each reads `not present on the state portal in this scrape; absence here is coverage, not conduct` and contains no other text after the name apart from that sentence (no `runs its own`, no `portal` other than in that sentence). Their count equals `k` in AC-13 and AC-21.

### AC-40 — A null HHI reads `not computed`, is hatched, sorts last and is never 0
- **Behaviour:** Not computed is not zero.
- **Check:** `/#/tenders?section=national&rows=all`. For each buyer in `FIX.nullHhi` (10 today): its row's HHI cells read `not computed` with `[data-nodata]` and never `0` or `0.0`. Under `sort=awards`, `sort=value` and `sort=buyer` the null-HHI rows keep their place by the sort key (HHI is not a sort key), and no cell in an HHI column reads `0` for a buyer whose JSON value is `null`. If `FIX.nullHhi` is empty, `SKIPPED`.

### AC-41 — Agreement cells are `not checkable`, and `0%` never appears in §3.7
- **Behaviour:** Unknown agreement is not zero agreement.
- **Check:** `/#/tenders?section=national`. When `FIX.sample.pageGone === FIX.sample.rows.length` (true today): every `match`, `mismatch`, `missing` cell of `[data-twin="agreement"]` reads `not checkable` with `[data-nodata]`, contains no digit and no `%`; every `page_gone` cell reads `{pageGone} of {n}`. `#cppp-sample`'s `innerText` contains no `0%`.

### AC-42 — An unparsed buyer key is not shown as a public body
- **Behaviour:** `{state} / unparsed` renders as a hatched coverage note with the raw key visible.
- **Check:** `/#/tenders?section=national`. For each buyer in `FIX.unparsed25` (`Telegana / unparsed` today): its `[data-twin="buyers"]` row has `[data-nodata]`, reads `{state as emitted} state portal · department code unparsed`, and contains a mono element whose text is the raw key exactly. The same holds for every `/ unparsed` key in `[data-twin="concentration"]` under `rows=all` and in `buyers=all`.

### AC-43 — The unusable-value rows are a separate hatched group, not a sixth bar
- **Behaviour:** The rows the pipeline could not value are shown so they cannot be said to have been dropped, but not on the band scale.
- **Check:** `/#/tenders?section=national`. In `#cppp-bands`: `[data-mark="bar"][data-key]` for the five `valueBandsInr` bands share one parent `g`; the last `rates.byValueBand` row's mark has `data-flag="nodata"`, `[data-nodata]`, sits in a different parent headed `rows with no usable value`, and shows `n = {n}` and its interval. `[data-twin="bands"]` has 6 `tbody tr`, the last flagged `not a value band`.

### AC-44 — A row without `wilson95` is flagged, never drawn with a band
- **Behaviour:** A missing interval is stated.
- **Check:** `/#/tenders?section=national&buyers=all`. For every rate row in the data whose `wilson95` is absent or `null`: its twin cell reads `interval not computed` and its mark (if any) has no ribbon element. If none exists in the data (true today), assert no twin cell reads `interval not computed` and report `SKIPPED: every emitted row carries wilson95`.

### AC-45 — An unmatched `state` prints its sentence, never an empty table
- **Behaviour:** A filter the data cannot honour says so.
- **Check:** `/#/tenders?section=national&state=Nowhere`. Assert text `“Nowhere” does not appear on the state portal in this scrape; absence here is coverage, not conduct` in `#cppp-concentration` and in `#cppp-redflags`; `[data-twin="concentration"]` either is absent or has ≥ 1 `tbody tr` (never a `tbody` with zero rows and no message); the `[role="status"]` note (AC-58) is **not** triggered for `state` (an unmatched state is not an unrecognised value).

---

## 5. Denials beside claims

### AC-46 — The innocent reading sits beside every rate, at the same size and weight
- **Behaviour:** No rate is louder than its boring explanation.
- **Check:** `D` and `M`, `/#/tenders?section=national`. For every `[data-rate]` in `SEC`: the nearest following `[data-innocent]` has identical computed `font-size`, `font-weight` and `color`; no `details` ancestor; `isVisible()`; and `innocent.top − rate.bottom ≤ 1.5 × rate lineHeight` (separated by at most one line). Every `FIX.ind[*].innocentReading`, `FIX.timing.innocentReading` and `concentration.innocentReading` appears verbatim in a `[data-innocent]`.

### AC-47 — The named-buyer table says nobody was asked, above the table
- **Behaviour:** The weakness is stated before the names.
- **Check:** `/#/tenders?section=national`. In `#cppp-redflags`, an element preceding `[data-twin="buyers"]` in DOM order reads `No body listed here has been asked for comment. That is a weakness of this table, not a neutral fact. Each figure is a rate over the body's own awards, not a finding about it.` and is followed, still before the table, by `[data-innocent]` = `FIX.ind.singleBidding.innocentReading`. Both are visible at `M`.

### AC-48 — Every named-buyer row carries `not asked`
- **Behaviour:** The response column exists and records the absence on every row.
- **Check:** `/#/tenders?section=national`, then `&buyers=all`. In `[data-twin="buyers"]`, a `th` reads `response`; every `tbody tr` has that cell reading `not asked`. The CSV of that table (AC-71) has a `response` column reading `not asked` on every data row.

### AC-49 — The verification says nothing was contradicted, and who was not asked
- **Behaviour:** Zero checks is not zero agreement, and the two parties not asked are named.
- **Check:** `/#/tenders?section=national`. `#cppp-sample` contains `Nothing was checked, and nothing was contradicted.` as its first sentence in DOM order (AC-19), and `The portal's operator and the dataset's publisher were not asked about link validity.`; the finding's own sentence about the captcha search and token re-signing (`was not attempted; no token was re-signed or re-timestamped`) appears verbatim from `FIX.sample.finding`.

### AC-50 — Repeat pairs are counted, never listed; winners never appear in red flags
- **Behaviour:** The card prints counts and its refusal.
- **Check:** `/#/tenders?section=national`. The `Repeat single-bidder pairs (marked winners)` card contains `pairs counted, never listed`, `pairs {FIX.ind.repeat…pairs}` and `repeat pairs {repeatPairs}` (en-IN). No string from `FIX.winners` appears in `#cppp-redflags`. The `Non-open tender type (Limited)` card contains its `note` and `The state portal's tender_type field carries almost no Limited labels; its rate is a fact about the field before it is a fact about tendering.`

### AC-51 — Rendered winner names are only the JSON's, and every component matches the marker rule
- **Behaviour:** The page never composes a name.
- **Check:** `/#/tenders?section=national&rows=all`. Every `li` inside a `topMarkedWinners` `ol` in `[data-twin="concentration"]` has a name (text before the first ` · `) that is in `FIX.winners`; split each on `,` or `;` and assert every non-empty component matches `new RegExp(FIX.markerRegex, 'i')`. Assert `SEC.innerText` does not contain `selected_bidder_address`. Take `SEC.innerText`, remove every string in `FIX.data`, and assert the remainder contains no run of two to four capitalised tokens that ends a `td` or `span`'s text (a bare personal-name shape).

### AC-52 — Mostly-unmarked buyers say so
- **Behaviour:** An HHI over a minority is labelled.
- **Check:** `/#/tenders?section=national&rows=all`. For every buyer in `FIX.mostlyUnmarked`: its row contains `most winners here are unnamed; the HHI covers the marked minority`; for every other row, that text is absent.

### AC-53 — Denials are not muted: no `--color-rose` on a rate, no dash on a mark
- **Behaviour:** The contradiction colour and the tier dash are reserved.
- **Check:** `/#/tenders?section=national`. For every `[data-mark]` and every `svg` `line, path, rect, circle` in `SEC` outside a `TierChip`: computed `stroke-dasharray` is `none`; computed `stroke` and `fill` are not the value of `--color-rose` (read via `getComputedStyle(document.documentElement).getPropertyValue('--color-rose')`).

### AC-54 — Portals are told apart by shape and label, in greys
- **Behaviour:** Circle for central, square for state, direct end labels; no hue.
- **Check:** `/#/tenders?section=national`. Every `[data-mark="point"][data-portal="central"]` is a `circle` and every `[data-mark="point"][data-portal="state"]` is a `rect`; the chart contains `text` end labels `central` and `state` adjacent to the last plotted mark of each series.

### AC-55 — Every chart mark is a neutral grey
- **Behaviour:** Saturation ≤ 0.10 on every computed stroke and fill, `TierChip` exempt.
- **Check:** `/#/tenders?section=national`. For every `[data-mark]`, ribbon (`path[data-ribbon]` or the ribbon `path` inside the rates `svg`), and bar in `SEC`: convert computed `fill` and `stroke` (when not `none`) to HSL; assert `s ≤ 0.10`. Hover one point (`page.hover`): its `stroke-width` increases and its `stroke` HSL saturation stays ≤ 0.10.

---

## 6. URL round-trip of every filter

### AC-56 — Every param loads into its control
- **Behaviour:** A link restores the exact view.
- **Check:** `/#/tenders?section=national&portal=state&sort=value&rows=100&buyers=all&state={encodeURIComponent(FIX.stateKeys[0])}`. In `#cppp-concentration`: the `portal` group button `state` has `aria-pressed="true"` and the others `false`; the `value` header has `aria-sort="descending"` and the others `none`; the `rows` control shows `100` selected; every `[data-twin="concentration"] tbody tr`'s buyer starts with `FIX.stateKeys[0] / `. In `#cppp-redflags`: the `buyers` control shows `all` pressed and `[data-twin="buyers"]` has more than 27 rows.

### AC-57 — Controls write params with `replace`
- **Behaviour:** Every control writes the URL and Back still leaves the page.
- **Check:** `/#/tenders?section=national`. Record `history.length`. Click portal `central` → `portal=central`; click header `buyer` → `sort=buyer`; choose rows `all` → `rows=all`; click buyers `all` → `buyers=all`; click a state name link in `[data-twin="states"]` → `state={that name}` and `portal=state`. `history.length` unchanged throughout; `section=national` present throughout.

### AC-58 — Unknown values fall back to the default with an announced note
- **Behaviour:** A bogus value is named and replaced.
- **Check:** `/#/tenders?section=national&portal=bogus&sort=hhi&rows=7&buyers=some`. Assert one `[role="status"]` paragraph placed after the page header and before any StatGrid, containing `Unrecognised value “bogus” for portal, showing all.`, and one such sentence per bad param (`sort` → `awards`, `rows` → `25`, `buyers` → `top25`). The controls show the defaults; `sort=hhi` is **not** honoured (no `aria-sort` on an HHI header; there is none). Zero console errors.

### AC-59 — `state` implies `portal=state`
- **Behaviour:** Naming a state fixes the portal.
- **Check:** `/#/tenders?section=national&state={encodeURIComponent(FIX.stateKeys[0])}`. The `portal` group shows `state` pressed; every `[data-twin="concentration"] tbody tr` is a state-portal row; `[data-effect]` reads `{FIX.conc.length} → {k} buyers` with `k` = the `FIX.conc` rows whose `portal === 'state'` and whose `buyer` starts with `FIX.stateKeys[0] / `.

### AC-60 — The register's `view` and `scope` still round-trip beside `section`
- **Behaviour:** The two parameter sets do not collide.
- **Check:** `/#/tenders?section=national&view=graph&scope=centre`. `h2#cppp` exists; below `SEC`, the View group (`[role="group"][aria-label]`) has `graph` `aria-pressed="true"` and the Scope group has `centre` pressed; the graph view renders (its container exists). Click View `ledger`: hash has `view=ledger` and `section=national`.

### AC-61 — The jump list writes the router fragment and scrolls
- **Behaviour:** In-section links work under HashRouter.
- **Check:** `/#/tenders?section=national`. Click the jump-list link `Rates`: `new URL(page.url()).hash` ends `#cppp-rates`, `#cppp-rates.getBoundingClientRect().top` is within `[0, 120]`, and `history.length` is unchanged. Load `/#/tenders?section=national#cppp-sample` fresh: `#cppp-sample` top is within `[0, 120]` after settle.

### AC-62 — Defaults are unfiltered and unnamed
- **Behaviour:** The bare section pre-selects nothing.
- **Check:** `/#/tenders?section=national`. After load the hash's params are exactly `section=national`. `portal` shows `all` pressed; `awards` header has `aria-sort="descending"`; rows `25`; buyers `top25`; no `state`. The first `[data-twin="concentration"]` row has the largest `awards` in `FIX.conc`; ties are in `localeCompare` order of buyer.

### AC-63 — A reload reproduces the view exactly
- **Behaviour:** The same URL gives the same numbers.
- **Check:** For each of `?section=national`, `?section=national&portal=state&rows=100`, `?section=national&buyers=all&sort=buyer`, `?section=national&state={FIX.stateKeys[0]}`: record every `[data-effect]` text, every `data-twin` row count and the `[data-figure]` text; `page.reload()`; assert all identical.

---

## 7. Table twin

### AC-64 — Every table has a caption, scoped headers, and lives in a labelled scroll region
- **Behaviour:** Twins are readable by a screen reader and never hidden.
- **Check:** `/#/tenders?section=national&rows=all&buyers=all`. For every `SEC table`: a non-empty `caption` naming what the table is of, containing `n` or `rows`, `scraped`, `computed {FIX.asOf}` and `reported`; every `th` has `scope` (`col` or `row`); its nearest scrolling ancestor has computed `overflow-x: auto`, `role="region"`, a non-empty `aria-label` and `tabindex="0"`; it has no `details` ancestor with `open === false`. The `details` elements in `SEC` contain no `table` and no bare count outside their `summary`.

### AC-65 — The rates twins list exactly what the multiples draw
- **Behaviour:** Rows = plotted marks + not-plotted rows, with the spec's columns.
- **Check:** `/#/tenders?section=national`. For each portal `p`: `[data-twin="rates-{p}"] tbody tr:not([data-not-plotted])` count = `[data-mark][data-portal="{p}"]` count (points plus hatched slots); headers in order `AOC year`, `n`, `share of the portal's plotted n`, `single-bidder awards`, `single-bidder %`, `95% interval (Wilson), %`, `interval width, points`, `mean bids`, `median bids`, `flag`; the `share` column of plotted rows sums to 100.0 ± 0.2; interval width equals `hi − lo` to one decimal.

### AC-66 — Histogram, FY-month, bands and types twins match their bars
- **Behaviour:** One row per bar; the type order is fixed.
- **Check:** `/#/tenders?section=national`. `[data-twin="hist"] tbody tr` count = `#cppp-timing [data-mark="bar"]` count = `FIX.timing.daysClosingToAoc.length` (11), each bar labelled with its bin and `n`, headers `bin`, `width in days`, `n`, `share`. `[data-twin="fymonth"] tbody tr` = 12, headers `FY month`, `calendar month`, `n`, `%`, `central`, `state`, `note`. `[data-twin="bands"]`: 6 rows (AC-43). `[data-twin="types"] tbody tr` row headers in order `Works`, `Goods`, `Services`, then a rule row or `tr[role="separator"]`, then `Limited`, then `Other/unknown`; `Other/unknown` is present with its `n`.

### AC-67 — The buyer table's row counts follow `buyers`
- **Behaviour:** `top25` is 2 + 25; `all` is 2 + every `byOrganisation` row, sorted by n, pooled last, with a tenths summary.
- **Check:** `/#/tenders?section=national`: `[data-twin="buyers"] tbody tr` = `2 + FIX.buyers25.length`. `&buyers=all`: `= 2 + FIX.byOrg.length`; rows after the two base rows are in non-increasing `n` with ties by `key` code-unit order, except the last, which is `FIX.pooled` (`pooled (n<30)`); a `[data-twin="tenths"]` table with exactly 10 `tbody tr` whose counts sum to `FIX.byOrg.length − 1`; no header in the buyer table offers a rate sort (no `aria-sort` on `single-bidder %`).

### AC-68 — Concentration rows follow `rows`, `portal` and `state`; the export ignores `rows`
- **Behaviour:** `showing {k} of {N} buyers` is exactly the table.
- **Check:** `/#/tenders?section=national` → `[data-twin="concentration"] tbody tr` = 25 and `[data-effect]` contains `showing 25 of {FIX.conc.length} buyers`. `&rows=100` → 100. `&rows=all` → `FIX.conc.length`. `&portal=central&rows=all` → count of `FIX.conc` with `portal === 'central'`. Download the concentration CSV under `portal=central` and default `rows`: data rows = the central count, not 25.

### AC-69 — Top winners are a nested list, one item per emitted name
- **Behaviour:** Names with commas are not split; lists are never joined.
- **Check:** `/#/tenders?section=national&rows=all`. For every `[data-twin="concentration"] tbody tr`: the winners cell holds an `ol` whose `li` count equals that buyer's `topMarkedWinners.length` in `FIX.conc`, each `li` reading `{name} · {awards} · {valueInr as reported}`; for the buyers whose winner names contain a comma (231 names today), the `li` text still contains the comma. Buyer cells containing `||` have a `wbr` after each `||` and unchanged `textContent`.

### AC-70 — The sample rows are complete, collapsed honestly, and their links are real
- **Behaviour:** 40 rows, one verdict column when all four agree, a legend, and 40 dead links you can follow.
- **Check:** `/#/tenders?section=national`. `[data-twin="sample"] tbody tr` (excluding the legend row) = `FIX.sample.rows.length`. When every row's four verdicts are identical (true today), the table has one column `verdict (all fields)` reading `page gone`; a legend row reads `page gone: the stored link returned the portal's “Invalid Url” page; the field could not be checked`. Each row's `organisation_name` cell has `textContent` equal to the emitted string with a `wbr` after each `||`; the caption explains that `||` separates organisation, department and division. Each row has `a[href="{detail_url}"]` whose accessible name is `Portal page for tender {tender_id}, returned “Invalid Url” on {fetchedAt date}`; the 40 names are distinct; beside each link are its verdict and its `fetch.sha256_16`.

### AC-71 — Every table downloads as a CSV with its header block, and no request is made
- **Behaviour:** Export is static, complete, and carries the caveat and family.
- **Check:** `/#/tenders?section=national&portal=central`. For every `data-twin` table: a `DownloadButton` exists in its section. Register `page.on('request')`; click each with `page.waitForEvent('download')`; assert no new network request; the saved filename matches `/^cppp-[a-z-]+-\d{4}-\d{2}-\d{2}\.csv$/` ending `{FIX.asOf}.csv`; the leading `#` comment lines contain `FIX.caveat`, the table's family definition and `N`, `scraped`, `computed {FIX.asOf}`, `FIX.gen`, every `FIX.digests` value, and `portal=central`; data rows = the table's `tbody tr` count (for concentration: the filtered count, AC-68); a numeric column never contains `not computed` or `not checkable` — those appear in a `status` column; values are raw (no `,` grouping, no `%`).

### AC-72 — Provenance footer matches `provenance.json`
- **Behaviour:** Inputs, digests, counts, rule, generator and as-of are the file's.
- **Check:** `/#/tenders?section=national`. `#cppp-provenance` lists each `provenance.provenance.inputs[]` with `file`, `bytes` and `sha256_16` exactly; `FIX.rows`, `FIX.tids`, `FIX.dedup`, `dedupRule`, `FIX.gen` and `FIX.asOf` as text; a link whose text contains `scripts/cppp/README.md`; the second `[data-source-line]` (AC-20).

---

## 8. Keyboard reachability

### AC-73 — The head link moves focus to the section heading
- **Behaviour:** Activating the head link lands a keyboard reader on the `h2`.
- **Check:** `/#/tenders`. Tab to the head link (AC-03) and press Enter. Assert hash has `section=national`; after settle `document.activeElement === h2#cppp`; `h2#cppp.tabIndex === -1`; its `getBoundingClientRect().top` is within `[0, 120]`.

### AC-74 — Every table region is reachable by Tab and shows a focus ring
- **Behaviour:** Wide tables can be scrolled by keyboard.
- **Check:** `/#/tenders?section=national`. For every `SEC [role="region"][tabindex="0"]`: `.focus()` → `document.activeElement` is it; computed `outline-style !== 'none'` or a non-`none` `box-shadow` under `:focus-visible`; press `ArrowRight` on one whose `scrollWidth > clientWidth` at `M` → `scrollLeft > 0`.

### AC-75 — Every control is a real control and works by Enter or Space
- **Behaviour:** Nothing is mouse-only.
- **Check:** `/#/tenders?section=national`. For each: the portal `role="group"` buttons, the `rows` and `buyers` controls, the sortable headers (each a `button` inside `th`), the jump-list links, `Copy figure`, `Copy citation`, every `DownloadButton`, the `Hide the CPPP section` link, every `details > summary`, and the state links in `[data-twin="states"]`: assert it is a `button`, `a[href]`, `input`, `select`, `summary` or has `tabindex="0"`; `.focus()` puts it in `document.activeElement`; a focus ring is visible. Focus portal `state` and press Enter → `portal=state`; focus the `value` header button and press Space → `aria-sort="descending"` on it and `sort=value` in the hash.

### AC-76 — Folded material has summaries that name content and count, and nothing counted is folded
- **Behaviour:** A `details` never hides a number.
- **Check:** `/#/tenders?section=national`. Every `SEC details > summary` text matches `/\d+ (raw spellings|terms|tender ids|lines)/` or names its content (`SQL`); pressing Enter on a focused summary toggles `open`; with every `details` closed, every `[data-strip-fact]`, `[data-rate]`, `[data-effect]`, `[data-figure]` and `table` in `SEC` is visible.

### AC-77 — Copy actions announce, and status regions are single
- **Behaviour:** A screen reader hears the copy and the filter effect.
- **Check:** `/#/tenders?section=national`. Click `Copy citation`: a `[role="status"]` or `[aria-live="polite"]` element in `SEC` gains text containing `copied`. Exactly one `aria-live="polite"` region exists in `#cppp-concentration`; after clicking portal `state`, its text contains `→ {k} buyers` (AC-31) and it precedes `[data-twin="concentration"]` in DOM order.

### AC-78 — Every `role="img"` name states the measure, n and `table follows`; hover carries nothing extra
- **Behaviour:** The SVG is described, not required.
- **Check:** `/#/tenders?section=national`. Every `SEC svg[role="img"]` has an accessible name containing `n =` and `table follows`; the rates chart's name is `Single-bidder rate by AOC year, central and state portals, n = {FIX.denomN} award decisions; {k} rows not plotted; table follows.` with `k = FIX.notPlotted.central.length + FIX.notPlotted.state.length`. For every `[data-mark]` with a `title` child or `aria-label`, its text (numbers de-grouped) appears in the matching twin row's text. No `[data-mark]` has `tabindex` unless it also has an accessible name; `page.addStyleTag({ content: '#cppp svg{display:none}' })` leaves every `[data-rate]`, `[data-figure]` and twin visible.

### AC-79 — View and Scope groups are labelled groups with pressed state
- **Behaviour:** The register's button rows are announced, not colour-only.
- **Check:** `/#/tenders?section=national`. Two `[role="group"]` elements with `aria-label` (`View`, `Scope`) exist below `SEC`; each button has `aria-pressed` and exactly one per group is `"true"`.

---

## 9. Mobile at 390 px

### AC-80 — No horizontal page scroll at any width
- **Behaviour:** The document never scrolls sideways.
- **Check:** `M` and `D`, for each of `?section=national`, `?section=national&portal=state&rows=all`, `?section=national&buyers=all`, `?section=national&state={FIX.stateKeys[0]}`, `?section=national#cppp-sample`, and **`dist-empty`** `?section=national`: after load and again after `window.scrollTo(0, document.body.scrollHeight)`, `document.documentElement.scrollWidth === window.innerWidth` (390 at `M`) and `document.body.scrollWidth <= window.innerWidth`.

### AC-81 — Every table scrolls inside its own container with a sticky first column and a hint
- **Behaviour:** Wide tables are usable on a phone.
- **Check:** `M`, `/#/tenders?section=national&rows=all&buyers=all`. For every `SEC table` whose `scrollWidth > clientWidth`: its region has computed `overflow-x: auto`; the first `th`/`td` of each row has computed `position: sticky` with `left: 0px`; a visible `scrolls →` hint or an edge-fade element is present beside the region. No element in `SEC` outside a `[role="region"]` has `scrollWidth > clientWidth + 1`.

### AC-82 — The first phone screen carries the verification line and the start of the caveat
- **Behaviour:** The hurried reader meets the honesty before any number.
- **Check:** `M`, `/#/tenders?section=national`. Without scrolling, the verification line (AC-11) has `getBoundingClientRect().bottom ≤ 844` and `#cppp-caveat.getBoundingClientRect().top < 844`.

### AC-83 — Long strings wrap; SQL is a full-width `pre`, never in a cell
- **Behaviour:** Hashes, regexes and SQL do not force width.
- **Check:** `M`, `/#/tenders?section=national`. Every `code` and every cell containing a 16-hex digest or the marker regex has computed `white-space: pre-wrap` and `overflow-wrap: anywhere`; every `pre` in `SEC` has no `td` ancestor and `getBoundingClientRect().width ≤ 390 − 32`; every `details` opened by the check keeps `documentElement.scrollWidth === 390`.

### AC-84 — Stacked rows, when used, keep every column
- **Behaviour:** Below 480px a twin may render as key–value records, never fewer fields.
- **Check:** `M`, `/#/tenders?section=national`. For `[data-twin="rates-central"]`, `[data-twin="rates-state"]` and `[data-twin="buyers"]`: either the `table` is visible (AC-81 holds), or it has `display: none` and is paired with a visible `dl` per row whose `dt` count equals the table's column count and whose `dd` texts equal the row's cells; the caption remains visible in both forms.

### AC-85 — Innocent readings, the gaps panel and the captions are full size on a phone
- **Behaviour:** Nothing honest shrinks at 390.
- **Check:** `M`, `/#/tenders?section=national`. Every `[data-innocent]`, `[data-gap]` and rates-caption line (AC-13): `isVisible()`, computed `font-size ≥ 14px`, no `details` ancestor; AC-46's one-line rule holds at this width. The jump list wraps (`scrollWidth ≤ clientWidth`).

### AC-86 — The initial national chunk is within budget and the data is split, never fetched
- **Behaviour:** Compiled-in data is code-split; no runtime fetch.
- **Check:** `/#/tenders` then `/#/tenders?section=national` in the same context with `page.on('response')`. Let `A` = JS responses first requested on the second load. No response of any type has content-type `application/json` or a URL ending `.json`. The chunks in `A` whose body contains `hhiMarkedValue` (concentration) or `byOrganisationPooling` (`byOrganisation`) are separate files from the rest; gzip the remaining bodies of `A` with node `zlib` and assert the total ≤ 150 × 1024 bytes.

---

## 10. Counts

86 criteria: render, entry and scaffold 9 (AC-01–09) · honesty captions 14 (AC-10–23) ·
denominators 11 (AC-24–34) · no-data ≠ zero 11 (AC-35–45) · denials beside claims 10
(AC-46–55) · URL round-trip 8 (AC-56–63) · table twin 9 (AC-64–72) · keyboard 7 (AC-73–79)
· mobile and payload 7 (AC-80–86).

Coverage the task named: honesty captions → §2; denominators → §3; no-data ≠ zero → §4;
denials beside claims → §5; URL round-trip of every filter (`section`, `view` alias, `portal`,
`state`, `sort`, `rows`, `buyers`, the register's `view`/`scope`, the fragment) → §6; twin row
count = visible graphic → AC-35, AC-43, AC-65–AC-68; scaffold state → AC-04–AC-06; keyboard →
§8; mobile at 390px → §9.

Every criterion above is the RED test for the build step that owns it. Where this document
fixes a point the spec leaves open it says `[Fixed here]` (the scrape-year fallback, AC-38 and
`FIX.scrapeYear`). If the build shows a criterion to be wrong, amend the criterion here with a
`[Corrected]` note, as `ENERGY_ACCEPTANCE.md` and `WELFARE_ACCEPTANCE.md` do; never bend the
test to pass.
