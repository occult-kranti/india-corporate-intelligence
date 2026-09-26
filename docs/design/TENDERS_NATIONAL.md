# /tenders — the national section (CPPP scrape) — judged spec

*Phase G · 2026-09-26 · extends `src/pages/Tenders.tsx`; the central and state registers and the two-state OCDS section are unchanged. Data: `research/raw/cppp/*.json` through a new accessor `src/data/cppp.ts`. Source of the numbers: `scripts/cppp/build.py` (offline; every table's SQL and the input digests travel in `provenance`).*

*[UX review] Revised 2026-09-26 after a five-persona **SYNTHETIC** UX review (journalist,
policy researcher, hostile reader, screen-reader user, phone reader), synthesised in
`docs/design/TENDERS-NATIONAL_UX_REVIEW.md`. The 21 must-level amendments, U1–U21, are
applied in place, and each is marked `[UX review] (Un)`. The should- and could-level
amendments are listed under "Deferred amendments" at the end. The review is synthetic:
its findings are hypotheses to validate with real readers, not results.*

*[UX review] (U4, U10, U14, U18, U6) **Pipeline prerequisites.** The amended page needs
fields that `scripts/cppp/build.py` does not emit today. They are added in the pipeline,
never hand-written in the page (a literal in a page drifts from its dataset within a
commit). Until each lands, the place that needs it prints the gap sentence given there,
and the gaps panel (§3.9) lists it:*

| field (proposed) | holds | today it exists only as | used by |
|---|---|---|---|
| `provenance.dataset` `{name, url, licence, scraper}` | the dataset's origin | prose in `scripts/cppp/README.md` | §3.0 source line, §3.8, citation copy (U14) |
| `provenance.scrapedAt` `{value, method}` | the scrape timestamp, decoded from the link token's time segment | prose inside `sample-verification.json.finding` | strip, "scraped" labels, partial-year rule (U3, U4) |
| `winnerMarkers.msOnlyNamed` `{n, of}` | names in `concentration.json` admitted by `m/s` alone | prose in the README ("Known soft spot") | §3.6 note (U10) |
| `redflags.singleBiddingByBuyerFamily` `{threshold, eligibleBuyers}` | the buyer-table threshold and how many buyers meet it | prose inside `singleBiddingByBuyerNote` | §3.5 "25 of N" (U6) |
| `rates.byPortalTenderType` | tender-type composition per portal | not emitted | §3.2 composition table (U4) |

## 1. Purpose and reader

The reader wants to know whether Indian public procurement is competitive, and whether the only national dataset that says so can be trusted. The section answers the second question first. Nothing here is an Indian national statistic: the scrape is `reported` (anonymous, unpublished scraper), its 40-row live verification came back 40/40 `page_gone`, and the page says so before any rate.

[UX review] (U15) "Before" means DOM order and heading order, not only visual order. A reader
who arrives by heading or table navigation meets §3.0 as the first `<h2>` content, §3.1 as the
first `<h3>` and the first `<table>`, and the caveat paragraph before any element containing
a percentage.

## 2. Placement and URL

*As first judged (superseded in place, kept for the record):* ~~Reached as `/tenders?view=national` and from a link in the page head ("National (CPPP scrape) →"). The default view is unchanged.~~ ~~The section renders above the central and state registers when `view=national`; the registers remain reachable below it. `view` round-trips; unknown values fall back to the default with the page's existing unrecognised-param note.~~

- **[UX review] (U2)** Reached as `/tenders?section=national`.
  `view` is already the register's switch on this page (`type View = 'ledger' | 'map' | 'graph'`),
  so `view=national` would leave the registers below with no valid view and no pressed button.
  `view=national`, the value this spec first named, is accepted as an alias. On load it is rewritten
  with `replace` to `section=national`, with `view` removed and every other param kept, so the
  links and the smoke path written against the first spec still land.
- **[UX review] (U13)** The page-head link reads `The CPPP award scrape — {rows} award rows, reported, not a national statistic`, with a trailing arrow marked `aria-hidden`. `{rows}` comes from `provenance.rows`, formatted by the page's number helper. The register's Byline gains one line in the default view: `A separate national award scrape (reported, unverified) is in the CPPP section.`, linking to `?section=national`. The default view is otherwise unchanged.
- **[UX review] (U13)** With `section=national`, the section renders **directly after the page's Kicker, Title and Standfirst**. The register's Byline, StatGrid, controls, registers and OCDS section follow it, so no register figure is heard between the page title and the section. The Byline gains the sentence `Showing the national CPPP scrape (reported, unverified) above the register.` Activating the head link moves focus to the section's `<h2>` (`tabIndex={-1}`) after render and scrolls it into view. A `Hide the CPPP section` link removes `section` and keeps every other param.
- **[UX review] (U2) Every filter in this section is a search param.** Each round-trips. An unknown value falls back to its default and triggers the unrecognised-param note.

| param | values | default | applies to | effect printed beside the control |
|---|---|---|---|---|
| `section` | `national` | absent: section not rendered | whole section | — |
| `portal` | `all` \| `central` \| `state` | `all` | §3.5 buyer table, §3.6 | `{N} → {k} buyers` |
| `state` | a state string exactly as emitted in a state-portal buyer key (URL-encoded) | absent | §3.5 buyer table, §3.6 state-portal rows; implies `portal=state` | `{N} → {k} buyers`. A value that matches no emitted key prints `“{v}” does not appear on the state portal in this scrape; absence here is coverage, not conduct` and never an empty table. |
| `sort` | `awards` \| `value` \| `buyer` | `awards`; ties by buyer (`localeCompare`) | §3.6 | — (see D7 for why HHI and share are not sort keys) |
| `rows` | `25` \| `100` \| `all` | `25` | §3.6 | `showing {k} of {N} buyers` |
| `buyers` | `top25` \| `all` | `top25` | §3.5 buyer table | `25 of {eligible} buyers` / `{all} buyers and the pooled row` |

- **[UX review] (U2)** The note does not exist on this page today (`IndustryView.tsx` and `MapExplorer.tsx` have one; `Tenders.tsx` has none), so this work adds it. It is a `role="status"` paragraph placed immediately after the page header, before any StatGrid: `Unrecognised value “{v}” for {param}, showing {default}.` The existing View and Scope button groups gain `role="group"` with an `aria-label`, and `aria-pressed` on each button; their pressed state is currently shown by colour alone.
- **[UX review] (U3) Jump list and fragments.** HashRouter owns the document hash. The in-section jump list therefore writes the router's fragment (`navigate({ hash }, { replace: true })`, giving `/#/tenders?section=national#cppp-rates`) and calls `scrollIntoView`. On load, an effect scrolls to `location.hash` when it names a section id. Ids: `cppp`, `cppp-quality`, `cppp-families`, `cppp-rates`, `cppp-states`, `cppp-bands`, `cppp-timing`, `cppp-redflags`, `cppp-concentration`, `cppp-sample`, `cppp-gaps`, `cppp-provenance`.

## 3. Components, in order

**[UX review] (U15) Structure.** The section is one `<Section>` with an `<h2>`. Each of §3.0–§3.9
is an `<h3>` carrying the name given here, and each red-flag indicator is an `<h4>`, with no
skipped levels. Every "above", "under" and "beside" in this section means **precedes or follows
in DOM order**, and the visual order matches it. Every `<table>` has a one-line `<caption>`
naming what the table is *of*, its n, `scraped {…} · computed {asOf}`, and the tier word. Every
table twin is rendered **open and visible**: none sits inside a closed `<details>`. Only long
verbatim material (spelling lists, the regex, SQL) may fold, and a count never folds.

### 3.0 Section head — [UX review] (U3)
DOM order:
1. Kicker `National · CPPP award scrape`. `<h2 id="cppp">`: `The CPPP award scrape — a different dataset from the registers below` (U13).
2. `TierChip reported`, followed by one clause: `the portal is the primary record; this scrape's agreement with it is unknown (see verification)`.
3. **Denominator strip**, sticky *within the section only*, so it releases where the registers begin: `{afterDedupRows} award decisions after dedup · from {rows} raw rows · {denominatorN} in the single-bidder denominator · {distinctTenderIds} distinct tender ids · scraped {scrapedAt} · computed {asOf}`. The values come from `provenance`, `rates` and `quality`. The strip carries counts only, never a percentage. The unit throughout is the *award row* or *award decision*; "tender" is used only for `tender_id`. Without `scrapedAt` the strip reads `scrape date not yet a field (see verification finding)`.
4. **Verification line**, from `sample-verification.json`: `Verification: {Σ match} of {rows.length} sampled rows could be checked against the portal on {fetch date} (every stored link returned the portal's “Invalid Url” page). Every figure below is dataset-only.` It links to `#cppp-sample`.
5. **Read this first**: `<p id="cppp-caveat">` holding `rates.json.caveat` verbatim, at body size. It is no longer a table caption. The quality table and every rates table in §3.2–§3.5 carry `aria-describedby="cppp-caveat"`.
6. **Source line** (U14).
7. **Jump list** (§2).

Two dates are in play, and they are always labelled: **scraped** is the data's cut-off, and **computed** is `asOf`, the build. The page never prints `asOf` alone as if it were the data's currency.

Budget (U21): at 390×844 the verification line and the start of the caveat paragraph lie within the first viewport.

### 3.1 Quality table — first and above the fold
Reads `quality.json`. Rows: raw rows; distinct tender ids; the dedup rule verbatim and the rows it removed (and the one-per-tender-id alternative count, labelled "not applied"); `bids_received` null / zero / one / >1000; `contract_value_amount` null / ≤0 / >₹10¹²; AOC dated before closing; AOC years outside 2011–2027; `tender_type` raw spellings → the normalised map with counts; junk organisations; marked-winner share and the marker rule. ~~Caption: the sentence from `rates.json.caveat`~~ **[UX review] (U3)** The caveat is the §3.0 paragraph. The caption is one line: `Dataset quality, stated before any rate · {rows} raw rows · scraped {…} · computed {asOf} · reported`. Table twin = the table itself (it is the primary form). Empty state: if `quality.json` is absent the section prints "CPPP pipeline outputs not present in this build" and nothing else.

**[UX review] (U7) Form of the table.**
- The first paragraph is `quality.json.readMeFirst`, under the visible label `Read this first about the data`.
- The table is a key/value table: `<th scope="row">` for the fact, then **count**, **what is counted** (rows / tender ids / award decisions; never a bare number), **base** (raw rows unless stated), and **share of base** to one decimal.
- **Dedup, all three readings as emitted.** The applied `afterDedup.rule` gives its rows and the count removed. `alternativeOnePerTenderId` and `alternativeOnePerTenderBidder` each get their own row header, `Alternative rule, NOT applied — {rule}`. A required sentence follows: `How many award decisions the scrape holds depends on the rule: between {min of the three} and {afterDedupRows}. This page uses {afterDedupRows}. The smallest reading counts year/organisation buckets such as {duplicates.heaviestTenderIds[0]} ({rows} rows, {distinct bidders} bidders) as one tender.`
- **The two year fields.** A row gives `dates.portalYearDiffersFromAocYear` with its share of raw rows, and the header of every per-year row says `portal year`. The rates in §3.2 use the AOC year (U4).
- **Thresholds in words**, never in superscript: `over ₹1 lakh crore (10^12 rupees)`.
- **Folding.** The five normalised `tender_type` classes and their counts stay visible. The raw spellings go in a `<details>` whose `<summary>` reads `{k} raw spellings → {c} normalised classes`. The marker rule appears first as the plain `winnerMarkers.rule` sentence; the regex follows in `<code>` inside a `<details>` headed with its term count. The dedup SQL and the heaviest-tender-id list go in `<details>` as full-width `<pre>` (U16).

### 3.1a Families used on this page — [UX review] (U9)
There is one row per family that any rate on the page is computed over: the rates denominator (§3.2, §3.3), each `redflags` indicator family, the timing family (§3.4) and the concentration family (§3.6). Columns: family definition **verbatim from its JSON**, N, sections using it, and the identity that reconciles it to `afterDedupRows` wherever the JSON emits both parts (for example `denominatorN + excludedFromDenominator.bidsNullOrZeroOrOver1000 = afterDedupRows`; `timing.n + excludedAocBeforeClosing + excludedDateMissing = afterDedupRows`). Where a complement is not emitted, the cell reads `complement not emitted` and nothing is inferred. The concentration family's N is the sum of `byBuyer[].awards`, with the buyer count `{buyers} of {central + state distinct buyers}` taken from `quality.organisations`. Every chart caption in §3.2–§3.6 links to its family row.

### 3.2 Rates by portal × year
**[UX review] (U19) Figure sentence, first.** Before the first `<svg>` in the section comes one sentence built from `redflags.indicators[singleBidding]`: `{count} of {familySize} award decisions ({ratePct}%, 95% interval {lo} to {hi}) received one bid. Central portal: {c.count} of {c.familySize} ({c.ratePct}%); state portal: {s.count} of {s.familySize} ({s.ratePct}%). Dataset-only; scraped {…}; computed {asOf}; source: {dataset.name}.` It is set in `--font-mono`, tabular, with a `Copy figure` button that copies the sentence followed by the citation string (U14).

Reads `rates.json.byPortalYear`. A small-multiples line (central, state) of single-bidder % by year with the Wilson 95% band drawn as a lighter ribbon; the denominator sentence (`rates.json.denominator`, `denominatorN`, `excludedFromDenominator`) printed under the chart; the table twin lists year, portal, n, single-bidder, %, interval, mean and median bids. ~~No colour carries meaning beyond portal (two greys plus the accent for the hovered series); tier dash applies to the caption's tier word.~~ **[UX review] (U17, U15)** Marks and tier are set as below.

**[UX review] (U4) Years, stated honestly.**
- **Which year.** Every header reads `AOC year`. The caption says the quality table uses portal year and that `{portalYearDiffersFromAocYear}` raw rows differ between the two.
- **Not plotted.** A row is not plotted if its year is non-numeric (`out-of-range year`), later than the scrape year, or has n < 30. It is listed in the twin under the heading `not plotted`, with the reason. The caption states how many rows are not plotted and why. An in-range year with n < 30 keeps its slot, painted with the no-data hatch and labelled `n < 30`. It is never dropped silently and never drawn as zero.
- **Thin coverage.** A year whose n is below half of that portal's median n over its plotted years is drawn as a hollow marker, and no line segment enters or leaves it. The twin flags it `thin coverage: interval shown, slope not to be read`, and the caption states the rule. (Today this covers the early years of both portals. That is the point: those years are scrape coverage, not procurement.)
- **Partial year.** The scrape year is drawn hollow and labelled on the axis and in the twin as `{year} (partial, to {scrapedAt month})`. Without `scrapedAt` the label reads `(partial; scrape date not yet a field)`.
- **Caption, verbatim and frozen:** `No change of government is marked. The scrape's composition by year (which bodies, which states, which tender types) is not constant, and the two portals are not the same population; a difference between the lines or a slope within one is a fact about the scrape before it is a fact about procurement.` A second line: `The interval covers sampling variation only. It does not cover the scrape's agreement with the portal, which is unknown (verification).` A third line: `The state portal is not India's states: {k} of {STATES.length} states and UTs appear (see §3.2a).`
- **Composition.** When `rates.byPortalTenderType` is emitted, a three-row table under the chart gives each portal's share of Works / Goods / Services / Limited / Other-unknown. Until then the caption reads `Tender-type composition per portal is not emitted by the pipeline`, and the gap is listed (§3.9).
- **Twin.** There are two tables, one per portal, matching the multiples. Each row header is `<th scope="row">{portal} {year}</th>`. Columns: AOC year, n, share of the portal's plotted n, single-bidder awards, single-bidder %, `95% interval (Wilson), %` written `{lo} to {hi}`, interval width in points, mean bids, median bids, flag.
- **`role="img"` name:** `Single-bidder rate by AOC year, central and state portals, n = {denominatorN} award decisions; {k} rows not plotted; table follows.`

### 3.2a States on the state portal — [UX review] (U18)
Derived from the state-portal keys of `rates.byOrganisation`: the prefix before ` / `, **exactly as emitted**. Columns: state as emitted, buyers with n ≥ 30 (smaller buyers sit in the pooled row), and award decisions in the denominator (Σ n). Then comes a row for every state and UT in `src/data/geo` `STATES` whose name no emitted prefix matches. Matching uses a reviewed, exact-string alias table in `cppp.ts`, with no fuzzy matching. Each such row is painted with the no-data hatch: `not present on the state portal in this scrape; absence here is coverage, not conduct`. **No reason for an absence is printed unless it is sourced.** Emitted prefixes that match no state name are listed as emitted under `spellings that match no state name`. Two emitted spellings that the alias table maps to one state keep their own rows and counts; the page never merges them. Caption: `The state portal is not India's states. It is the states and UTs whose bodies publish on one portal.` There is no choropleth: a tender is not a place. The `state` param (§2) filters §3.5 and §3.6 from here.

### 3.3 Value bands and tender types
Reads `byValueBand` and `byTenderType`. Two bar groups with n and interval; the band thresholds printed in rupees from provenance; "Other/unknown" shown, never dropped.

**[UX review] (U12)**
- **The unusable-value row.** The last `byValueBand` row is not a sixth bar in the band scale. It is a separate, hatched group headed `rows with no usable value`, with its n and interval, and with `quality.contractValue.implausibleRule` printed beside it. Caption: `This is a rate over rows the pipeline could not value, not over a value band. In this scrape a missing value and a single bid travel together (median bids {medianBids}). It is shown so it cannot be said to have been dropped.` Nothing causal is composed. If its composition by portal and type is not emitted, the caption says so.
- **Tender types.** The order is Works, Goods, Services, then a rule, then `Limited`, then `Other/unknown`. The axis reads `category, and one method`. `quality.tenderType.note` is printed verbatim under the chart. Beside `Limited` sits the floor sentence from `redflags.indicators[nonOpenTenderType].note`, with `nonOpenLabelsLeftInOtherUnknown.n`.

### 3.4 Timing
Reads `timing.json`: closing → AOC days histogram, the share ≤ 2 days, AOC by month of financial year; the excluded counts (date order, missing) printed. Innocent reading printed beside the March cluster (fiscal-year spending rules).

**[UX review] (U8)**
- **Histogram.** Each bar is labelled with its bin in days and its n. Caption: `Bins are unequal widths; bar heights are counts, not densities.` The twin lists bin, width in days, n and share.
- **Two days or fewer:** `{count} of {n} ({pct}%, 95% interval {lo} to {hi})`. It is followed immediately, at the same type size, by `timing.innocentReading` verbatim.
- **Exclusions, each with its base, here and in §3.1:** `AOC dated before closing: {quality.dates.aocBeforeClosing} raw rows (quality table); {timing.excludedAocBeforeClosing} award decisions after dedup, excluded here. A date-order defect, excluded, not read as conduct.` The missing-date count follows the same pattern.
- **Financial-year months.** The table has FY month, calendar month name (from `calendarMonth`), n, %, central and state (from `byPortal`). A `note` column carries `see the financial-year reading` on the March row. `timing.innocentReading` follows the table as a `<p>` referenced by `aria-describedby`. That text includes the sentence `Election-calendar clustering is not computed here…`, which is repeated verbatim in the gaps panel (§3.9).
- **`role="img"` names** state n and both exclusion counts.

### 3.5 Red flags over their families
Reads `redflags.json.indicators`: each indicator as a card — name, family definition, family size, rate with interval, innocent reading — and `singleBiddingByBuyer` as a table of public bodies (buyers may be named). Winners are never listed here; the repeat-pair indicator prints "pairs counted, never listed".

**[UX review] (U11) Each indicator.** Each indicator is a `<section>` with an `<h4>` label mapped from its key: `singleBidding` → Single bidding; `nonOpenTenderType` → Non-open tender type (Limited); `shortDecisionWindow` → Short decision window (two days or fewer); `repeatSingleBidderMarkedWinners` → Repeat single-bidder pairs (marked winners). An unmapped key is shown as emitted, in `<code>`, and is never dropped. Then comes a `<dl>` with visible `<dt>` labels in this DOM order:
1. Definition.
2. Family: the definition verbatim, and `{familySize}, which is {share}% of the {afterDedupRows} award decisions after dedup`.
3. Count.
4. Rate: `{count} of {familySize} ({ratePct}%, 95% interval {lo} to {hi})`.
5. Innocent reading: immediately after the rate, at the **same type size and weight**, never muted and never collapsed. At no width are the two separated by more than one line.
6. By portal: a two-row table.

`nonOpenTenderType` adds the floor sentence (its `note`) and `The state portal's tender_type field carries almost no Limited labels; its rate is a fact about the field before it is a fact about tendering.` The repeat-pair card keeps `pairs counted, never listed`, with `pairs` and `repeatPairs`.

**[UX review] (U6) The named-buyer table.**
- **Above the table:** `No body listed here has been asked for comment. That is a weakness of this table, not a neutral fact. Each figure is a rate over the body's own awards, not a finding about it.` Then the single-bidding innocent reading.
- **Caption:** `singleBiddingByBuyerNote` verbatim. When `singleBiddingByBuyerFamily` lands, the caption adds `25 of {eligibleBuyers} buyers with at least {threshold} awards`. Until then it adds `the number of eligible buyers is not yet a field`.
- **First rows**, fixed and labelled `{portal} portal, every award in the family`: the portal base rates from `singleBidding.byPortal`, so each buyer reads against its portal.
- **Columns:** portal, buyer, awards in denominator, single-bidder awards, single-bidder %, 95% interval, response. The `response` column reads `not asked` on every row. Evidence-tiering step 6 treats "never asked" as a weakness that is recorded.
- **Buyer keys ending `/ unparsed`** render as `{state as emitted} state portal · department code unparsed`, hatched, with the raw key printed visibly beneath in mono. The key is not a public body, and it must not read as one.
- **Buyer names** are rendered as emitted. A comma inside a buyer name is not a list boundary (§4).
- **`buyers=all`** shows the whole of `rates.byOrganisation`, sorted by n descending with ties by key, and the pooled row last as emitted. It adds a ten-row summary of how many buyers fall in each tenth of the rate, so the mass near 0% is visible. No rate sort is offered (D7).

### 3.6 Concentration
Reads `concentration.json.byBuyer`: HHI by value and by count among marked winners, top-winner share, unmarked share, for buyers with ≥ 50 awards; the top marked winners as emitted (marked, ≥ 5 awards) — the page renders only names present in the JSON and never composes one. ~~Sort by awards; filter by portal.~~ **[UX review] (U2)** Sort, filter and rows are set by `sort`, `portal`, `state` and `rows` (§2).

**[UX review] (U10)**
- **Caption:** `family`, `hhiDefinition`, `namingRule` and `innocentReading`, all verbatim. Then `{buyers} of {central + state distinct buyers} buyers`, and `{quality.winnerMarkers.unmarked} unmarked award rows ({base}) are counted, never named.` The caption also states the page's 50% note rule (below).
- **Columns.** Count-based columns come first, because `hhiDefinition` itself calls the count HHI robust to mis-keyed values: portal, buyer, awards, marked awards, unmarked share of awards, `HHI by count (0–10,000)`, top marked winner's share of count. Then a column group headed `Value, as reported and unverified (see quality: contract value)`: value sum, `HHI by value (0–10,000)`, top marked winner's share of value. Last, the top marked winners.
- **Top marked winners** are a nested `<ol>` inside the cell, one `<li>` per name as emitted (`name · awards · value as reported`), never joined into one string.
- **Null HHI.** A `null` `hhiMarkedValue` or `hhiMarkedCount` prints `not computed` with the hatch, sorts last and is never shown as 0.
- **Mostly unmarked winners.** When `unmarkedShareOfAwardsPct ≥ 50`, the row carries `most winners here are unnamed; the HHI covers the marked minority`.
- **The `m/s` soft spot:** `{msOnlyNamed.n} of {msOnlyNamed.of} names shown are admitted by “M/s” alone and may be trading names of individuals.` Until that field lands: `Some names shown are admitted by “M/s” alone and may be trading names of individuals; the count is recorded in scripts/cppp/README.md and is not yet a field.`
- **Controls.** `portal` is a labelled `role="group"` of `aria-pressed` buttons. The sortable headers (awards, value, buyer) carry `aria-sort`. One `aria-live="polite"` region gives the denominator effect (`{N} → {k} buyers · showing {r}`). A `<wbr>` follows each `||` in buyer strings, which adds a break opportunity without changing the text (D3 holds).

### 3.7 Verification sample
Reads `sample-verification.json`: the seed, the draw SQL, per-field agreement counts, the `finding` block verbatim (token validity window), and the 40 rows (tender id, portal, year, buyer, bidder as emitted, verdict per field, link to `detail_url`). Caption: every field stays `reported`; what would upgrade it.

**[UX review] (U5) DOM order and form.**
1. **Plain reading**, first: `The portal answered “Invalid Url” to every stored link; the finding below gives the reason it appears to be a validity window on the link token. Nothing was checked, and nothing was contradicted.`
2. **Agreement table**, before the rows. When `page_gone` equals the sample size, the match, mismatch and missing cells read `not checkable` with the no-data hatch: no numeral and no percentage. The `page_gone` cell reads `{page_gone} of {n}`. Caption: `Agreement with the portal is unknown, not zero.`
3. `verdictRule`; `finding` and `redraw`, verbatim as paragraphs, with the token pattern in `<code>`.
4. **Not attempted, and not asked:** the finding's own sentence on the captcha search and token re-signing, then `The portal's operator and the dataset's publisher were not asked about link validity.`
5. **What would upgrade it:** `a fresh sample from a scrape whose links resolve, meeting the agreement threshold stated in the finding.`
6. **How to check a row yourself:** `tender_id and buyer are enough for a manual search of the portal's Results of Tenders page, which sits behind an image captcha; scripts/cppp/build.py re-derives every number from the named dataset.`
7. **Sample frame:** seed, rng, strata, `strataShortfall`, and the draw SQL in a full-width `<pre>`.
8. **The rows.** When a row's four verdicts are identical, one column `verdict (all fields)` carries the words `page gone`. Otherwise there are four columns. A legend row defines `page gone`: `the stored link returned the portal's “Invalid Url” page; the field could not be checked`. The raw `organisation_name` is kept as emitted with `<wbr>` after each `||`, and the caption explains that `||` separates organisation, department and division.
9. **Links stay real links**, so a reader can see the dead page for themselves. Each is set in the no-data style, with its verdict and the fetch `sha256_16` beside it and a unique accessible name: `Portal page for tender {tender_id}, returned “Invalid Url” on {fetchedAt date}`.

### 3.8 Footer: provenance
Input files with bytes and sha256_16, rows, distinct tender ids, dedup rule, generator and as-of, from `provenance.json`; a link to `scripts/cppp/README.md`. **[UX review] (U14)** The source line (below) is printed here once more.

### 3.9 Gaps panel — [UX review] (U20)
It is placed before the footer and set at the same type size as the findings. It is not a disclaimer and not a footer. Each line is derived or verbatim and disappears when its cause does:
- **Verification:** `{Σ match} of {n}` fields checkable (from `agreement`).
- **Election-calendar clustering:** the sentence beginning `Election-calendar clustering` in `timing.innocentReading`, verbatim. If that sentence cannot be isolated, the whole reading is printed.
- **No external comparator:** `No external comparator is shown. EU and OECD single-bidding shares are computed over above-threshold contracts with different tender-type mixes and are not comparable to this denominator; the comparison offered is the scrape against itself, by portal, type and value band.`
- **Per-portal tender-type composition** is not emitted.
- **State coverage:** `{k}` states and UTs are absent from the state portal (link to §3.2a).
- **Comment:** no body named in this section was asked for comment.
- **Pipeline fields not yet emitted:** each prerequisite field from the head of this spec, while it is absent.

### Source line and citation — [UX review] (U14)
In §3.0 and in §3.8: `Source: {dataset.name} ({dataset.url}), licence {dataset.licence}; scraper {dataset.scraper}; scraped {scrapedAt}; pipeline {generatedBy}; computed {asOf}. Tier: reported.` A `Copy citation` button copies the same text as plain text (`navigator.clipboard`, no dependency), with a polite announcement on success. While `provenance.dataset` is absent, the line reads `Dataset origin not yet in provenance.json (recorded in scripts/cppp/README.md)`, the copied text carries the same words, and the gaps panel lists the gap. The origin is never written into the page as a literal.

### Export — [UX review] (U1)
Every table in the section, twins included, carries the existing `DownloadButton`, and the file is built with the existing `toCsv` / `downloadCsv` (`src/components/energy/csv.ts`). No new dependency. Comment lines at the head of each file carry:
- the caveat;
- the table's family definition and N;
- `scraped` and `computed`;
- `generatedBy`;
- the input `sha256_16` digests;
- the active params.

Values are exported raw and unformatted. A status word such as `not computed` or `not checkable` goes in its own `status` column, so a numeric column stays numeric. The concentration export carries every row under the current `portal` and `state`, whatever `rows` is set to. Filename: `cppp-{table}-{asOf}.csv`.

## 4. Edge cases

| case | behaviour |
|---|---|
| `research/raw/cppp/*.json` missing | section prints the absence sentence; no rates |
| ~~a rate row with n < 30~~ **[UX review] (U4)** a `byOrganisation` buyer with n < 30 | shown only as the pooled row, as emitted |
| **[UX review] (U4)** a `byPortalYear` row with n < 30, a non-numeric year, or a year after the scrape year | never dropped: listed in the twin under `not plotted` with its reason. An in-range year keeps a hatched slot labelled `n < 30`. |
| a winner name containing a comma | rendered as emitted; the page never splits or re-joins names. **[UX review] (U10, U6)** The same applies to buyer names (some emitted buyers contain commas). Lists of names are `<ol>`, never comma-joined. |
| `wilson95` absent on a row | row shown without a band and flagged "interval not computed" |
| ~~`view=national` on a build with the section disabled~~ **[UX review] (U2)** `section=national` on a build with the section disabled | falls back to the default view with the unrecognised-param note |
| **[UX review] (U2)** `view=national` | rewritten with `replace` to `section=national`, keeping every other param |
| **[UX review] (U2)** an unknown value of `portal`, `state`, `sort`, `rows` or `buyers` | falls back to that param's default, with the note; an unmatched `state` prints its absence sentence (§2) |
| **[UX review] (U10)** `hhiMarkedValue` or `hhiMarkedCount` is `null` | `not computed`, hatched, sorts last, never 0 |
| **[UX review] (U10)** `unmarkedShareOfAwardsPct ≥ 50` | row note `most winners here are unnamed; the HHI covers the marked minority` |
| **[UX review] (U6)** a buyer key ending `/ unparsed` | `{state} state portal · department code unparsed`, hatched, raw key visible |
| **[UX review] (U5)** `page_gone` equals the sample size | agreement cells read `not checkable`, hatched; no percentage |
| **[UX review] (U16)** a lazily loaded file still pending | a placeholder naming the table and `loading`, never the absence sentence, which renders only after the import has settled with no data |
| **[UX review] (U14, U4)** a prerequisite field absent (see head of spec) | its gap sentence, and a gaps-panel line; never a literal |

## 5. Accessibility
Every chart has a `<table>` twin with a caption; the histogram and small multiples are `role="img"` with names that state the denominator; keyboard reach to every table and link; contrast ≥ 4.5:1 for text, ≥ 3:1 for the ribbon against the background; no information by colour alone.

**[UX review] (U15)**
- **Tier is spoken text.** Every caption, or its `aria-describedby` paragraph, includes `tier: reported (dataset-only; portal agreement unknown)`, rendered with `TierChip`, whose accessible name is the tier word. The dash pattern stays on the graph's edges, where it is frozen; it is not applied to a word.
- **Every `role="img"` name** states the measure, n and `table follows`.
- **Hover and tap** carry nothing that the table does not.
- **Table headers.** `DataTable` adds `scope="col"` to every `<th>` (a platform-wide, harmless change). Key/value tables use `<th scope="row">`.
- **The long verbatim `<details>` of §3.1** have summaries that name their content and count.

**[UX review] (U17) Marks, and the reason there is no party hue.**
- **Marks are neutral greys.** Every data mark in the section (lines, points, ribbons, bars) is a neutral grey, with HSL saturation ≤ 0.10. The two portals are told apart by **marker shape** (circle for central, square for state) and by direct end labels, never by dash, since `strokeDasharray` is the frozen tier channel. The greys also differ in lightness, at ≥ 3:1 against the background.
- **Hover, focus and rose.** Hover and focus thicken the stroke; they add no hue, and the page accent is not used on a rate. `--color-rose` never appears on a rate mark. Tier colours appear only in `TierChip`.
- **Why.** Saffron, green and sky blue read as party colours, and a coloured portal line is read as a side.

**[UX review] (U16) Narrow viewports.**
- **Table containers.** Every table sits in its own `overflow-x: auto` container, a `role="region"` with an `aria-label` and `tabIndex={0}`. The first column (year or buyer) is sticky, with a visible `scrolls →` hint or edge fade.
- **No horizontal page scroll** at 390px.
- **Long strings.** Code, SQL and hash cells take `white-space: pre-wrap; overflow-wrap: anywhere`. SQL renders as a full-width `<pre>`, never in a cell.
- **Stacked rows.** Below 480px the rates twin and the buyer table may render as stacked key–value rows.

**[UX review] (U16) Payload.**
- **One dynamic import per file.** `src/data/cppp.ts` exposes one `import()` per file. This is code-splitting of compiled-in data, like the lazy routes; there is still no runtime fetch.
- **The initial national chunk** carries `quality`, `provenance`, `sample-verification`, `redflags`, and `rates` without `byOrganisation`, which is taken by named import so that `byOrganisation` is split out.
- **Loaded on demand.** `concentration.json` loads after the section mounts. `rates.byOrganisation` loads when §3.2a or `buyers=all` needs it.
- **Budget:** the initial national chunk is ≤ 150 KB gzipped.

## 6. Acceptance gates
`scripts/pages/tenders.test.mjs` (Playwright against a pinned `TENDERS_DIST`): the quality table appears above any rate; every rate row shows n and an interval; the caveat sentence is present verbatim; the denominator sentence is present; no `<td>`/`<span>` text in the section matches a bare two-to-four-token capitalised personal name that is not in the JSON; `selected_bidder_address` never appears; the provenance digests match `provenance.json`; the registers and the OCDS section still render; ~~`view` round-trips~~ **[UX review] (U2)** `section`, `view` (the register's), `portal`, `state`, `sort`, `rows` and `buyers` round-trip; `view=national` lands on `section=national`.

**[UX review] (U21) Added gates.**
- **Order.**
  1. The caveat paragraph's DOM index is lower than that of the first element whose text contains `%`.
  2. The §3.2 figure sentence precedes the first `<svg>` in the section and matches `/\d of \d.*%.*interval.*computed/`.
  3. At 390×844 the verification line and the start of the caveat lie within the first viewport.
- **Source.**
  4. The citation string contains `provenance.dataset.name` and `.licence` when the field exists, and the gap sentence otherwise. The page source holds no literal dataset name.
- **Families and years.**
  5. Every identity in §3.1a sums exactly.
  6. No `byPortalYear` row is missing from the rates twin.
  7. Every in-range year with n < 30 carries the hatch and `n < 30`.
  8. The scrape year is labelled `partial`.
- **Verification.**
  9. The string `0%` does not appear in §3.7.
  10. The 40 sample links have 40 distinct accessible names.
  11. No sample link lacks its dead-status text.
- **Buyers and names.**
  12. Every named-buyer table has a `response` column reading `not asked`.
  13. Every null HHI reads `not computed`, never `0`.
  14. Every rendered winner name is present in the JSON, and every one of its components matches `markerRegex`.
- **Verbatim and absent text.**
  15. The `Election-calendar clustering is not computed` sentence is present in §3.4 and §3.9.
  16. No text in the section matches `/\b(BJP|Congress|UPA|NDA|Modi|Gandhi)\b/`.
- **Marks.**
  17. Every computed stroke and fill on chart marks has saturation ≤ 0.10, with `TierChip` exempt.
- **Accessibility.**
  18. Every `<table>` has a non-empty `<caption>`.
  19. Every `<th>` has `scope`.
  20. Heading levels run h2 → h3 → h4 with no skips.
  21. Every `role="img"` name contains `n =` and `table follows`.
  22. After the head link is clicked, `document.activeElement` is the section `<h2>`.
  23. The aria-live text contains the filtered count after `portal=state`.
  24. axe-core reports zero serious or critical findings on the section.
- **Export and payload.**
  25. Every table has a download control, and its CSV text contains the caveat and the family sentence.
  26. The initial national chunk is within the payload budget.
  27. The pending-state text is never the absence sentence.
- **Narrow viewport.**
  28. At 390×844, `document.documentElement.scrollWidth === 390`.
  29. Every table container has `overflow-x: auto`.

## 7. Decisions
| # | decision | alternative rejected |
|---|---|---|
| D1 | Quality first, above the fold. **[UX review] (U3)** "Quality first" now means the section head (strip, verification line, caveat) and then the quality table, before any rate. | rates first — hides the dataset's defects behind a headline number |
| D2 | A section on `/tenders`, not a new route | `/procurement` — splits the procurement story across two pages |
| D3 | Names rendered only as emitted by the pipeline. **[UX review] (U10)** The `m/s` soft spot (sole proprietorships trading under a personal name) is known and printed. A stricter allow-list belongs in `build.py`, not in the page. | page-side marker logic — duplicates the refusal in two places |
| D4 | Wilson ribbons on small multiples | bare lines — would invite reading noise as signal |
| D5 | **[UX review] (U3)** Denominator strip, verification line and caveat in a section head; quality table next; one figure sentence opening the rates | quality table alone above the fold — honest readers scroll past it and hurried readers misquote |
| D6 | **[UX review] (U2)** A `section` param for the national section | `view=national` — collides with the register's `view`, leaving the registers with no valid view |
| D7 | **[UX review] (U2, U6)** Sort keys are count, declared value and name only. The pipeline's top-25-by-rate table is shown as emitted, and no page-side rate or HHI sort is offered. | sorting bodies by HHI, top share or rate — a ranking of real entities by a quantity the platform computes, which interface-design forbids |
| D8 | **[UX review] (U17)** Portals are told apart by marker shape and direct label, in neutral greys | dash for the state portal (collides with the frozen tier channel); party-adjacent hues |
| D9 | **[UX review] (U18)** Absent states are named without a reason unless the reason is sourced | "runs its own e-procurement portal" printed per state — an unsourced claim, however likely |

## Deferred amendments ([UX review], SYNTHETIC)

These are the should- and could-level amendments from the five-persona **SYNTHETIC** UX
review (`docs/design/TENDERS-NATIONAL_UX_REVIEW.md`). They are **not** applied. Each is a
hypothesis until a real reader confirms it. Seats: J journalist, P policy researcher,
S hostile reader, A screen-reader user, M phone reader. Where a seat's item was folded
into an applied must, the must is named in the review's §6 and the item is not repeated here.

### Should

| id | section | amendment | from |
|---|---|---|---|
| D1 | §3.1–§3.7 | **Terms on first use.** Gloss each abbreviation and term in plain English on first use in each subsection (award of contract (AOC), Central Public Procurement Portal (CPPP), Herfindahl–Hirschman index (HHI), Wilson interval, dedup), with `<abbr title>` and in prose, never by hover alone. Add a `means` column to the quality table. Define **marked** explicitly as "the name matches the corporate-marker rule and may be shown", because a generalist reads "marked" as "flagged as suspicious", the opposite of its meaning. Print the HHI reference thresholds with their source beside the first HHI figure. Spell arrows and inequalities in prose. | J, A |
| D2 | §3.1–§3.6 | **One number convention.** Use Indian digit grouping for counts and ₹ crore for money through the page's existing `fmtCr`, with raw INR in the CSV only. Print the band thresholds once both ways (`₹10 lakh = ₹0.1 crore = ₹1,000,000`). No tabular figure longer than 12 characters without a unit at 390px. | M, J |
| D3 | §3.2 | **Small multiples on a phone.** Below 640px, stack the panels with a shared y-axis and a minimum plot height of 180px. Give the ribbon a border stroke as well as a fill, so it survives low contrast. Replace hover with tap-to-focus; the legend is the primary key. | M |
| D4 | §3.3 | **Twin headers for bands and types.** `band (₹, lower–upper)`, `awards (n)`, `single-bidder awards`, `single-bidder %`, `95% interval, %`, `mean bids`, `median bids`. Expand `L` and `cr` to lakh and crore once in the caption. Add both bar groups to the §5 `role="img"` list. | A |
| D5 | §3.6 | **Implausible-value marker.** Mark a buyer row whose top winner's value exceeds a stated plausibility ceiling (for example that buyer's p99.9 award value) as `implausible value, see quality`. This needs a per-buyer ceiling emitted by `build.py`; the page cannot compute one from the aggregates. | J |
| D6 | §3.6, §2 | **Name lookup.** Add a `q` param matching only names present in the JSON. A miss prints `not in the emitted names (unmarked, fewer than 5 awards for any buyer, or absent)`. | S |

### Could

| id | section | amendment | from |
|---|---|---|---|
| D7 | twins | **Copy as CSV** to the clipboard beside each download button (same `toCsv` text). | J |
| D8 | §3.8 | **Outputs and their digests.** List `provenance.outputs` with their digests, and offer each compiled JSON as emitted for download beside the CSV controls. | P, J |
| D9 | §3.8 | **README link.** Point the link at the repository URL of the README at the build's commit, labelled `Pipeline README (source repository, opens the code host)`. Add `Digests shown here are checked against provenance.json at build time`. Render provenance as key–value cards on narrow viewports. | A, M |
| D10 | §1 | **Attribution stance.** Add `The section attributes nothing to any government or party; where a reader could (the 2014 slope, the portal gap, the named central bodies), the page says why it does not.` | S |
