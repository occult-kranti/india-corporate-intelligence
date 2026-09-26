# /tenders — the national section (CPPP scrape) — judged spec

*Phase G · 2026-09-26 · extends `src/pages/Tenders.tsx`; the central and state registers and the two-state OCDS section are unchanged. Data: `research/raw/cppp/*.json` through a new accessor `src/data/cppp.ts`. Source of the numbers: `scripts/cppp/build.py` (offline; every table's SQL and the input digests travel in `provenance`).*

## 1. Purpose and reader

The reader wants to know whether Indian public procurement is competitive, and whether the only national dataset that says so can be trusted. The section answers the second question first. Nothing here is an Indian national statistic: the scrape is `reported` (anonymous, unpublished scraper), its 40-row live verification came back 40/40 `page_gone`, and the page says so before any rate.

## 2. Placement and URL

- Reached as `/tenders?view=national` and from a link in the page head ("National (CPPP scrape) →"). The default view is unchanged.
- The section renders above the central and state registers when `view=national`; the registers remain reachable below it. `view` round-trips; unknown values fall back to the default with the page's existing unrecognised-param note.

## 3. Components, in order

### 3.1 Quality table — first and above the fold
Reads `quality.json`. Rows: raw rows; distinct tender ids; the dedup rule verbatim and the rows it removed (and the one-per-tender-id alternative count, labelled "not applied"); `bids_received` null / zero / one / >1000; `contract_value_amount` null / ≤0 / >₹10¹²; AOC dated before closing; AOC years outside 2011–2027; `tender_type` raw spellings → the normalised map with counts; junk organisations; marked-winner share and the marker rule. Caption: the sentence from `rates.json.caveat` (no figure here is a national statistic; why). Table twin = the table itself (it is the primary form). Empty state: if `quality.json` is absent the section prints "CPPP pipeline outputs not present in this build" and nothing else.

### 3.2 Rates by portal × year
Reads `rates.json.byPortalYear`. A small-multiples line (central, state) of single-bidder % by year with the Wilson 95% band drawn as a lighter ribbon; the denominator sentence (`rates.json.denominator`, `denominatorN`, `excludedFromDenominator`) printed under the chart; the table twin lists year, portal, n, single-bidder, %, interval, mean and median bids. No colour carries meaning beyond portal (two greys plus the accent for the hovered series); tier dash applies to the caption's tier word.

### 3.3 Value bands and tender types
Reads `byValueBand` and `byTenderType`. Two bar groups with n and interval; the band thresholds printed in rupees from provenance; "Other/unknown" shown, never dropped.

### 3.4 Timing
Reads `timing.json`: closing → AOC days histogram, the share ≤ 2 days, AOC by month of financial year; the excluded counts (date order, missing) printed. Innocent reading printed beside the March cluster (fiscal-year spending rules).

### 3.5 Red flags over their families
Reads `redflags.json.indicators`: each indicator as a card — name, family definition, family size, rate with interval, innocent reading — and `singleBiddingByBuyer` as a table of public bodies (buyers may be named). Winners are never listed here; the repeat-pair indicator prints "pairs counted, never listed".

### 3.6 Concentration
Reads `concentration.json.byBuyer`: HHI by value and by count among marked winners, top-winner share, unmarked share, for buyers with ≥ 50 awards; the top marked winners as emitted (marked, ≥ 5 awards) — the page renders only names present in the JSON and never composes one. Sort by awards; filter by portal.

### 3.7 Verification sample
Reads `sample-verification.json`: the seed, the draw SQL, per-field agreement counts, the `finding` block verbatim (token validity window), and the 40 rows (tender id, portal, year, buyer, bidder as emitted, verdict per field, link to `detail_url`). Caption: every field stays `reported`; what would upgrade it.

### 3.8 Footer: provenance
Input files with bytes and sha256_16, rows, distinct tender ids, dedup rule, generator and as-of, from `provenance.json`; a link to `scripts/cppp/README.md`.

## 4. Edge cases

| case | behaviour |
|---|---|
| `research/raw/cppp/*.json` missing | section prints the absence sentence; no rates |
| a rate row with n < 30 | shown only as the pooled row, as emitted |
| a winner name containing a comma | rendered as emitted; the page never splits or re-joins names |
| `wilson95` absent on a row | row shown without a band and flagged "interval not computed" |
| `view=national` on a build with the section disabled | falls back to the default view with the unrecognised-param note |

## 5. Accessibility
Every chart has a `<table>` twin with a caption; the histogram and small multiples are `role="img"` with names that state the denominator; keyboard reach to every table and link; contrast ≥ 4.5:1 for text, ≥ 3:1 for the ribbon against the background; no information by colour alone.

## 6. Acceptance gates
`scripts/pages/tenders.test.mjs` (Playwright against a pinned `TENDERS_DIST`): the quality table appears above any rate; every rate row shows n and an interval; the caveat sentence is present verbatim; the denominator sentence is present; no `<td>`/`<span>` text in the section matches a bare two-to-four-token capitalised personal name that is not in the JSON; `selected_bidder_address` never appears; the provenance digests match `provenance.json`; the registers and the OCDS section still render; `view` round-trips.

## 7. Decisions
| # | decision | alternative rejected |
|---|---|---|
| D1 | Quality first, above the fold | rates first — hides the dataset's defects behind a headline number |
| D2 | A section on `/tenders`, not a new route | `/procurement` — splits the procurement story across two pages |
| D3 | Names rendered only as emitted by the pipeline | page-side marker logic — duplicates the refusal in two places |
| D4 | Wilson ribbons on small multiples | bare lines — would invite reading noise as signal |
