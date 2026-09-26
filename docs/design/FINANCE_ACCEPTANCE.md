# /finance: acceptance criteria

*Written 2026-09-26 against `docs/design/FINANCE_PAGE.md` (the judged spec, with UX
amendments U1–U34 applied and decisions D1–D50 resolved). Procedure shape: the SweetClaude
`product-user-stories` skill — a defined scope, numbered ids, a short verb-phrase title per
item, and acceptance criteria stated as observable behaviour — in the generic (not Gherkin)
format, scoped to **everything** the brief asked to cover. That skill's state files,
manifest, personas prompts and log steps are not used: this repository has no
`.sweetclaude/`, and the criteria live here, next to the spec they test. There is no
`personas.yaml`; the five **synthetic** seats of `FINANCE_UX_REVIEW.md` (J journalist, P
policy researcher, S hostile reader, A screen-reader user, M phone reader) are named only
to say whom a group serves.*

*Every criterion is one observable behaviour of the **built** page, verified by a headless
Playwright check against `dist`, the way `scripts/smoke.mjs`, `scripts/pages/energy.test.mjs`
and `scripts/pages/welfare.test.mjs` already work: the check serves `dist` itself, opens
`${base}/#/finance…` (HashRouter, so search params sit inside the hash) and reads the DOM.
No criterion reads `src/pages/`, `src/components/` or `src/data/financeView.ts`. Expected
values are computed by the check from the **generated modules** (`src/graph/finance.generated.ts`,
`ngo.generated.ts`, `capital.generated.ts`, `src/data/welfare.generated.ts`,
`research/raw/indices.json`), as spec §16 requires, and never from a brief, a caption or
this document. Where a criterion depends on a record being present, the check derives the
fixture from those modules; when the module under test holds none it reports `SKIPPED:
<reason>` — never a pass. A criterion that cannot be written as a Playwright assertion
against `dist` does not belong on this list.*

*Four of the spec's §16 gates are **not** promoted here, and the reason is stated so nobody
reads their absence as an oversight: FG-1 (anchor ids), FG-3 (no numeric literal in page
source) and FG-50 (chunk contents) read source or the bundler's output, not the page, and
belong in `scripts/finance-view.test.mjs` or a build script; FG-38 is the energy and welfare
suites themselves, which stay their own gates. FG-45 (axe-core) needs a dependency the
repository forbids; its structural content is spelt out in §8 instead. The spec's deferred
amendments (X1–X18, UD1–UD41) are not criteria.*

---

## 0. Conventions every check shares

### 0.1 Routing, loading, errors

- `HashRouter`: a parameterised URL is `${base}/#/finance?lens=capital&holder=cap:blackrock`.
  Read the live URL with `new URL(page.url()).hash` and parse its `?…` part with
  `URLSearchParams`.
- Every navigation goes through `about:blank` first (smoke's rule: hash-only navigation does
  not reload), then `page.goto(url, { waitUntil: 'networkidle' })`, then waits for
  `article.pb-20` and for the `h1`, then settles 700 ms. A check that opens the connection
  graph waits a further 1,800 ms (fixed tick count).
- `console` errors and `pageerror` events are collected on every route with smoke's
  `EXTERNAL` allow-list, verbatim; **any other error fails the criterion under way**.

### 0.2 Browser contexts

| name | viewport | flags |
|---|---|---|
| `D` | 1440 × 900 | — |
| `FOLD` | 1280 × 800 | — |
| `M` | 390 × 844 | `isMobile: true`, `hasTouch: true` |
| `M360` | 360 × 780 | `isMobile: true`, `hasTouch: true` |

Every context: `reducedMotion: 'reduce'` (instant, deterministic scrolls),
`permissions: ['clipboard-read', 'clipboard-write']`. A criterion names the context(s) it
runs at; unmarked means `D`.

### 0.3 Two builds

Data is compiled in, so a check cannot switch data at runtime. The criteria run twice.

| build | how | used by |
|---|---|---|
| **EMPTY** | `dist-empty`, built from a scratchpad copy of the repository in which `research/raw/finance/`, `research/raw/ngo/` and `research/raw/capital/` are absent, so `node scripts/assemble-fleet.mjs` writes the three modules with `META.empty === true`, then `npx vite build --outDir dist-empty`. `research/raw/` and `*.generated.ts` in the working tree are **never** edited to get this state. | §1, AC-104 |
| **FULL** | `dist` from the current generated modules (`npm run generate && npm run build`). | everything else |

The build is detected from the DOM (the EMPTY build carries the `Register not yet promoted`
callout); `FINANCE_BUILD=empty|full` overrides, `FINANCE_DIST=<dir>` points at a
scratchpad copy of `dist` so a concurrent rebuild cannot poison a run.

### 0.4 Prerequisite exports — the (G) branches

Spec §3.3 names generator exports the page works without and gets better with. **The
generated modules on 2026-09-26 already carry every one of them** (`FINANCE_LOAN_FACTS`,
`FINANCE_WB_TOTALS`, `NGO_FC_STATE`, `CAPITAL_HOLDINGS`, `CAPITAL_COVERAGE`,
`CAPITAL_CONTROLS`), so today's FULL build must show the **upgrade** behaviour. A criterion
marked **(G)** states both branches; the check reads the module at test time and asserts the
branch that applies:

| handle | true when | governs |
|---|---|---|
| `G1` | `FINANCE_LOAN_FACTS` is exported and non-empty | fetcher-rule map class, basis column, `m=usd`, `mid=sector` default, counting-status column |
| `G2` | `FINANCE_WB_TOTALS` is non-null | strip fact 7 (API population) |
| `G3a` | `CAPITAL_HOLDINGS` is exported and non-empty | `{pct}%` in matrix cells |
| `G3b` | `CAPITAL_COVERAGE` is exported and non-empty | `not-read` vs `read, not named` |
| `G3c` | `CAPITAL_CONTROLS` is exported and non-empty | Band A from declared roles |
| `P5` | `NGO_FC_STATE` is exported and non-empty | state × FY receipts table and map |

### 0.5 Fixtures derived from the generated modules (FULL build)

Computed once before the run, independently of `financeView.ts`, from the module arrays.
Nothing below is a literal in any check.

| handle | derivation |
|---|---|
| `ASOF_F`, `ASOF_N`, `ASOF_C`, `RUN_F`, `RUN_N`, `RUN_C` | `{FLEET}_META.asOf` and `.runId` for finance, ngo, capital |
| `LOANS` | `FINANCE_EDGES` with `pred === 'loan'`, plus `CAPITAL_EDGES` with `pred === 'loan'` |
| `CENSUS` / `RESEARCHED` | `LOANS` with `FINANCE_EDGE_DOMAIN[id] === 'worldbank-projects'` / the rest |
| `CC`, `RUPEE_TOTAL` | census rows whose `a` is a finite number; Σ `a` over them |
| `NO_RUPEE` | loan ids whose `a` is not a finite number (`undefined`/`null`) |
| `REC_CENSUS` | the first census loan (code-unit order of `id`) with finite `a` and a `/\bP\d{6}\b/` token in `lab` |
| `REC_NO_A` | the first loan in `NO_RUPEE`; skip criteria needing it when none |
| `REC_RESEARCHED` | the first researched loan with finite `a` |
| `P_SHARED` | a `P\d{6}` token present in both a census `lab` and a researched `lab`; skip when none |
| `STATE_PLACED` | a state code `st` of a node with `ty === 'state'` that is `t` of ≥ 1 census loan, or the `who` of a `FINANCE_BENEFITS` row whose `claimId` is a census loan; the first by code |
| `STATE_NONE` | a state code named by no loan under the strict rule, by no body-registered implementer, and (G1) by no `FINANCE_LOAN_FACTS.st`; skip when none |
| `LENDER_SAMPLE` | the `s` of `REC_RESEARCHED` |
| `YEAR_APPROVALS`, `YEAR_NONE` | a calendar year with ≥ 1 census approval (`from`); a year between the earliest `from` and `ASOF_F` with none, skip when none |
| `FY_AXIS`, `FY_MISSING` | every FY from the earliest to the latest start year among national `grant` rows (`s === 'ngo:foreign-sources-aggregate'`, `t === 'ngo:fcra-associations-aggregate'`); an FY with no current (unsuperseded) single-FY row, skip when none |
| `CASE_TARGET`, `CASE_LABEL` | the `t` of the first dated `enforce` edge in `NGO_EDGES` whose target is not an aggregate id and whose `nodeOf(t).ty !== 'ministry'`; its label |
| `ENFORCE_NO_CONTRA` | an `enforce` edge id with no `contra` edge whose `t === 'claim:' + id`; skip when none |
| `ENFORCE_WITH_CONTRA` | an `enforce` edge id with ≥ 1 such `contra`; skip when none |
| `NO_ACTION_TARGETS` | `NGO_NODES` with `ty ∈ {trust, fund, group, sangh, party}`, id not containing `aggregate`, target of no `enforce` edge |
| `ALLEGED_L`, `ALLEGED_A`, `ALLEGED_C` | the `alleged` non-`contra` edge ids per module; skip per lens when none |
| `COLUMNS` | `research/raw/indices.json` NIFTY 50 constituents sorted by `name`; `existingId` may be null |
| `BAND_A` | (G3c) `CAPITAL_CONTROLS` rows with `role ∈ {comparison, subject, domestic-control}` and non-null `id`, in declared order; else `CAPITAL_IDENTITY` ids whose `publicRole` starts `Mandatory comparison control`, sorted by label |
| `OWN_IDX` | `CAPITAL_EDGES` with `pred === 'own'` whose `t` is a `COLUMNS` `existingId` |
| `BAND_B` | distinct `s` of `OWN_IDX` not in `BAND_A`, sorted by label |
| `HOLDER_B` | the first of `BAND_B` |
| `AGG_IDS` | `own` edge ids with `CAPITAL_EDGE_DOMAIN[id] === 'holders-aggregates'` |
| `RULE_NO_BENEFIT` | a `law` edge in `CAPITAL_EDGES` with no `CAPITAL_BENEFITS` row; skip when none |
| `MANDATE_FEE_NULL` | an `award` edge in `CAPITAL_EDGES` with `s !== 'sebi'` whose benefit row has `amountCr === null` or no row; skip when none |
| `GRAPH_EDGES_N` | `|FINANCE_EDGES − CENSUS| + |NGO_EDGES| + |CAPITAL_EDGES|` minus edges with an endpoint resolving in none of the three node arrays nor `src/graph/data.ts` nodes |

### 0.6 Test hooks the build must emit

The spec fixes most text and roles. Where it fixes none, the build emits these attributes.
They carry no style and no meaning (spec §8.2 rule 2: no new channel) and exist only so a
check can count things the way a reader sees them.

| hook | on | why |
|---|---|---|
| `data-caption="C1"…"C15"` | each spec caption element (§9) | a caption is found by id, not by matching prose whose `{braces}` vary |
| `data-fill-class="value|stipple|hatch|zero|fetcher"` | each state `<path>` in `LoanMap` and the P5 receipts map (`WelfareMap` already emits the first four) | legend counts and twin classes are compared to painted counts |
| `data-twin="loan-map|loan-flow|loan-lanes|loan-years|loan-rules|loan-months|records-strip|project-list|receipts|receipts-donors|receipts-registrations|state-receipts|actions|matrix-lines|matrix-columns|rules"` | each twin `<details>` | twins are found by name, not position |
| `data-effect` | every `{N} → {k}` filter-effect element | the `k` every twin row count is compared with |
| `data-inclusion="census-counted|census-no-rupee|researched-listed|researched-no-rupee"` | each `ProjectList` row and each `ReconciliationLine` term | inclusion is counted per row without parsing prose |
| `data-mark` | each record tick in `RecordsStrip` and each record tick in `LoanClock` | mark counts against twin rows |
| `data-square` with `data-response="true|false"` | each `ActionsTimeline` enforce square | squares against `ActionsList` rows and the `[ ]` marks |
| `data-cell="line|aggregate|not-named|no-record|not-read|read-not-named"` | each `HolderMatrix` cell button | cell states against the column-status twin and FG-19 |
| `data-band="A|B"` | each matrix holder row (`th scope="row"`), or each column below 640 | Band A floor and accent |
| `data-lane` | each `LoanClock` and `ActionsTimeline` lane label button | lane counts |
| `data-pinned-stack` | the wrapper of site header + one-line strip + tabs below 640 | the ≤ 140 px budget |
| `data-page-copy` | the `Standfirst`, the standing line, each `[data-caption]`, the rail-foot refusal line, the "cannot show" headings | the British-spelling and partisan-frame checks read only page-authored prose, never quoted research text |

### 0.7 Shared procedures

- **ROUND-TRIP(param=value)** — (1) load `/#/finance?{param}={value}` and assert the control
  state named; (2) change the control once through the UI and assert `history.length` is
  unchanged (`replace`, not push) and the URL now carries the new value; (3) open
  `page.url()` in a fresh page and assert the `innerText` of the strip, of every
  `<figure>` and of the active-filter line equals the first page's; (4) the active-filter
  line contains `{param}=`; (5) set the control back to its default and assert `{param}`
  leaves the URL (defaults are elided).
- **TWIN(name)** — `details[data-twin="{name}"]`: opened by clicking its `summary`, or
  already open under `view=table`; row count = `tbody tr` inside it.
- **TEXT(el)** — `innerText` after `reducedMotion` settle; exact-string comparisons use the
  Unicode the spec prints (`—` U+2014, `→` U+2192, `≥` U+2265, `·` U+00B7).

---

## 1. Scaffold state — EMPTY build (seats M, A, J)

*Why: a page with zero records that renders an empty chart has published a finding of
nothing. The page must render fully and say, before any number, that nothing below is zero.*

### AC-01 — Render the empty page with ≥ 200 characters and no errors
- **Behaviour:** With all three registers empty, `/finance` renders its chrome, not a blank.
- **Check:** `goto('/#/finance')`, then `?lens=associations`, then `?lens=capital`: on each,
  `document.body.innerText.length >= 200`; `article.pb-20` exists; `h1` text is `Who lent,
  who gave, who holds, and what the record can show`; zero console errors, zero page errors.
  Repeat at `M`.

### AC-02 — Say the register is not promoted, before any figure
- **Behaviour:** A `Register not yet promoted` callout follows the standfirst on every lens.
- **Check:** Exactly one element whose own text is `Register not yet promoted` (the callout
  label; substring matches in the byline and strip are excluded) exists; by
  `compareDocumentPosition` it follows the `Standfirst` and precedes the sticky strip. The
  byline contains `finance: register not yet promoted`, `ngo: register not yet promoted`
  and `capital: register not yet promoted`.

### AC-03 — Replace the strip counts with the empty wording, never 0
- **Check:** The sticky strip (`section[aria-label="Denominators"]`) contains `register not
  yet promoted · nothing below is zero`; its text matches none of `/\b0 of\b/`, `/₹0 cr/`,
  `/\b0 loan records/`. The `ReconciliationLine` element is present and contains `register
  not yet promoted`, not a `=` sum.

### AC-04 — Hatch every map state and label the bar as unmeasured
- **Check (`lens=loans`):** `path[data-fill-class="hatch"]` count = 36; `[data-fill-class="zero"]`
  and `[data-fill-class="value"]` count = 0. The `UnionBar` text is `Register not yet promoted
  — nothing below is zero`. `[data-caption="C1"]` is present.

### AC-05 — Keep Band A rows and hatch every column in the matrix
- **Check (`lens=capital`):** `BAND_A` is computed from the EMPTY module. When it has ≥ 4
  rows: `[data-band="A"]` count = `BAND_A.length`, every `[data-cell]` is `no-record`, and
  the matrix region contains `Register not yet promoted`. When the empty module declares
  fewer than four (the usual case, since the controls export is empty with the fleet), no
  grid is drawn, the guard text `Comparison set required. This build declares {n}
  comparison holders; the matrix needs at least four to be read fairly and is withheld.` is
  present with `n` = `BAND_A.length`, and `TWIN(matrix-lines)` and `TWIN(matrix-columns)`
  still render (with their `0 rows` summaries). In neither case does any cell or count read
  `0` as a holding.

### AC-06 — Mark every twin and section empty, not as zero rows
- **Check:** On each lens under `view=table`: every `details[data-twin] > summary` text
  contains `0 rows`; every twin `tbody` has no `tr` or exactly one reading `Nothing
  recorded yet.`. Each of the lens's section ids (`#contracts #debarments #conditions
  #debt` on Loans; `#grants #welfare-join` on Associations; `#mandates #licences #rules` on
  Capital; `#baserates #narratives #cannot #contested #gaps` on all) contains `Nothing
  recorded yet.`. `#narratives` still lists six rungs, each reading `none in this file`.

### AC-07 — Say the control cannot run
- **Check:** The `ControlCard` contains exactly `No symmetry check recorded for this lens —
  the control has not been run. This is a gap, not a pass.` and its computed `color`
  equals the page's amber token (`getComputedStyle` of an `.text-amber` element).

### AC-08 — Draw the axes anyway and list the derived gaps
- **Check (`lens=loans`):** The `LoanClock` axis renders a first and last year label; each
  lane label reads `none recorded`. `lens=associations`: the receipts axis is drawn with
  `No national receipts total in the register.`; the timeline reads `No enforcement action
  recorded.`. `#gaps` header matches `/0 voids and 0 gaps recorded by the research, and
  (\d+) derived by this page/` with the derived count ≥ 1 (`API population totals not
  exported` or `Union budget dates are not a dataset in this build` is present).

### AC-09 — Answer Find honestly on an empty register
- **Check:** Type `Kerala` into `input[type="search"]`, wait 400 ms: the results region reads
  exactly `No entity or record in the three registers matches "Kerala". This is a statement
  about the register, not about the world.`; the URL carries `find=Kerala`.

---

## 2. Honesty captions — FULL build (seats S, J, A)

*Why: every caption states what the graphic cannot honestly show, at body size, directly
under its graphic, with every figure derived and every percentage beside its `a of b`.*

### AC-10 — Render C1–C15 at body size, under their graphic, referenced by the graphic
- **Check:** Across the three lenses (graph loaded), `[data-caption]` ids C1…C15 are each
  present exactly once (C2 only when the `worldbank-projects` base-rate domain exists in
  `FINANCE_BASE_RATES`; otherwise absent and the skip says so). Each caption's computed
  `font-size` equals that of a `Prose` paragraph in `#gaps`; its `max-width` resolves to ≤ 72
  `ch` of its font; it is the next `figcaption`/sibling after the graphic's `<figure>` or
  table it describes; the graphic's `aria-describedby` resolves to it. No `[data-caption]`
  is inside `footer`.

### AC-11 — Lead C1 with the unplaced ₹ as `a of b`, and state the placement rule
- **Check (`lens=loans`):** `[data-caption="C1"]` text matches
  `/^₹[\d,.]+ cr of ₹[\d,.]+ cr counted \([\d.]+%\) cannot be placed in a state government\./`;
  the two ₹ figures equal the `UnionBar`'s unplaced and counted figures; it contains `A
  state body's registered office is not where the money went`, `Head offices of companies
  and the seats of Union bodies are never used` and `not adjusted for inflation`.

### AC-12 — Say in C3 why every ribbon is solid and how many records are not drawn
- **Check (`lens=loans`):** `[data-caption="C3"]` contains `The World Bank census only:`,
  `never added here`, `so every ribbon is solid`, `Band position is flow order, not
  influence`, and matches `/(\d+) records without a ₹ amount are not drawn/` with the figure
  = census rows in view whose `a` is not finite (= `NO_RUPEE ∩ CENSUS` unfiltered). (G) The
  `midSentence` is the sector sentence (`the taxonomy changed in 2017`) when `mid=sector`,
  else the instrument sentence.

### AC-13 — Say in C4 that a tenure bar is the date test and that no window is computed
- **Check (`lens=loans`):** `[data-caption="C4"]` contains `A tenure bar covering a loan's date
  is the date test, not a finding`, `This page computes no interval between an approval and
  an election`, and matches `/(\d+) of (\d+) recorded windows have no end date/` with the
  second figure = role edges into `min:ministry-of-finance` ∪ the drawn institutions and the
  first = those with no `to`. The lanes region contains `Union budget dates are not a
  dataset in this build.`.

### AC-14 — Say in C5 that researched marks are never added, with the duplicate count
- **Check:** `[data-caption="C5"]` contains `Records are not added up` and matches
  `/\((\d+) share a project id with a census record\)/`; the figure = the number of
  researched labs whose first `P\d{6}` token appears in a census lab.

### AC-15 — Say in C6, C7, C12 and C13 what a contract, a debarment, a mandate and a rule are not
- **Check:** `[data-caption="C6"]` contains `not every contract under these loans` and `shown
  in the rows, not scored`; `[data-caption="C7"]` contains `not a court finding` and `zero
  here is a statement about the sample`; `[data-caption="C12"]` contains `it is not a
  finding about the adviser` and `this table ranks nothing`; `[data-caption="C13"]` contains
  `A rule that benefits someone is not evidence that it was written for them`.

### AC-16 — Say in C8 that a hatched year is a total not found, not nothing arrived
- **Check (`lens=associations`):** `[data-caption="C8"]` matches `/(\d+) of (\d+) financial
  years carry a total/` with the second figure = `FY_AXIS.length` and the first = FYs with a
  current single-FY row; contains `not because nothing arrived` and `a superseded figure is
  kept and marked`.

### AC-17 — Put the base rate and the upper-bound reading in C9, and withdraw the banned phrase
- **Check:** `[data-caption="C9"]` matches `/Case files are the (\d+) targets with a recorded
  action; (\d+) further entities in the register have none recorded/` with the second figure
  = `NO_ACTION_TARGETS.length`; when the `fcra-actions` base-rate row with both values
  non-null exists, it also matches `/(\d+) named case files against ([\d,]+) cancellations/`
  and contains `the share is an upper bound on named cancellations`; it contains `A square
  is an action, not a finding of wrongdoing` and does **not** contain `government-aligned
  and critical alike`.

### AC-18 — Say in C11 that an empty cell means not named, never not held
- **Check (`lens=capital`):** `[data-caption="C11"]` contains the exact sentence `An empty
  cell means 'not named', never 'not held'.`, `no filing names that holder`, `The checked
  companies are not a random sample`, and matches `/(\d+) of the (\d+) companies have no
  named holder recorded/` with the second = `COLUMNS.length` and the first = columns with no
  `own` edge. While `y` is set the caption also contains `the year control does not reach
  this matrix` (or the spec's equivalent clause naming `y`).

### AC-19 — Carry the standing line and the fixed standfirst on every lens
- **Check:** On each lens the header contains the exact standfirst (`Money from abroad reaches
  India in three ways this page records…never alone.`) and the standing line `Rothschild &
  Co and BlackRock Inc. appear here as companies, beside comparison companies. No family,
  religion or ethnicity is a node, an edge, a filter or a colour on this page.`; the header
  line matches `/Built from (\d+) research files to a published contract and cross-examined
  \((\d+) audit verdicts\)\. It asserts no offence by any named person\./` with the figures =
  Σ `META.counts.files` and Σ `META.audit.verdicts.length` over the three modules.

### AC-20 — Print no percentage without its `a of b` in the same sentence
- **Check:** For every element matching `/\d+(\.\d+)?%/` inside `[data-page-copy]`, the
  `ControlCard`, `#baserates` and the strip: the same sentence (split on `. `) matches
  `/\d[\d,.]* (cr )?of \d[\d,.]*/`. Every `{a} of {b}` where `b < 10` has **no** `%` in its
  sentence. (Matrix cells and record text are excluded: their `%` is a filed value or a
  quotation.)

### AC-21 — Label every page-computed count as computed here
- **Check (`lens=capital`):** The `AdviserComparison` column-group header contains `records in
  this register (computed here)` and every count cell begins `in this file:`. On every lens
  a `ControlCard` or base-rate row whose numerator or denominator is null reads `not computed
  in this file` and carries the chip `figure in the research file's wording, not computed by
  this page`.

### AC-22 — Carry every figure's as-of and source
- **Check:** The strip's date reads `read to {asOfLabel}` where `asOfLabel` is `ASOF_x` for
  the lens when the three agree, else `{min}–{max}`; Capital adds `indices as of
  {INDICES_AS_OF}`. Every `Cite` in `ProjectList`, `ActionsList`, `MandatesTable` and the
  rule cards is `a[href^="http"]`; a row whose edge has empty `srcs` reads `no source in
  file` in amber instead. Every `[data-twin] table caption` contains `as of` and `run-`.

---

## 3. Denominators — FULL build (seats P, S)

*Why: a total that does not say what it excludes, and a pattern without its population,
are how honest people mislead themselves.*

### AC-23 — Show the strip facts for each lens with their populations
- **Check:** Loans: the strip contains `{n} of {LOANS.length} loan records`, `₹{x} cr counted,
  nominal, from the World Bank projects table`, `{CC} of {CENSUS.length} census records carry
  ₹`, `placed in a state government`, `researched records, {lenders} lenders — listed, not
  summed`, `records state conditions`, `records: amount not stated / in US$ m`; (G2) `{projects}
  projects of {api} in the API` with `api` = `FINANCE_WB_TOTALS`' API row count, else the gap
  line `API population totals not exported` appears in `#gaps`. Associations: `of
  {FY_AXIS.length} financial years with a national receipts total`, `enforcement actions`,
  `named case files`, `of {alleged} allegations with a recorded response`, `named grant
  records`, `of {WELFARE_SCHEMES.length} register schemes linked`. Capital: `of
  {COLUMNS.length} NIFTY 50 companies with a named holder recorded`, `{BAND_A.length}
  comparison holders always shown`, `filing dates across columns`, `awards by the Union and
  regulators`, `of {n} rules with a cui-bono row`. Every `{n}` equals the check's own count.

### AC-24 — Equate the strip's ₹ counted to the census sum and nothing else
- **Check (`lens=loans`):** The strip's `₹{x} cr counted` = `RUPEE_TOTAL` ± 0.5. The same
  figure appears in the `UnionBar` mono line (`of ₹{x} cr counted from {CC} census
  records`) and in C3. No ₹ figure anywhere on the page (all elements matching
  `/₹[\d,.]+ cr/`) exceeds `RUPEE_TOTAL` + 0.5, and `RESEARCHED`'s `a` values, summed per
  lender or in total, appear in no element, `aria-label` or TSV `#` header.

### AC-25 — Print the reconciliation line whose four terms sum to the loan count
- **Check (`lens=loans`):** The `ReconciliationLine` matches `/(\d+) loan records = (\d+)
  census counted \+ (\d+) census, amount not stated \/ in US\$ m \+ (\d+) researched with ₹
  \(listed, not summed\) \+ (\d+) researched, amount not stated/`; term 1 = `LOANS.length`;
  terms 2–5 sum to it; each of the four terms is a link with `data-inclusion` whose `href`
  sets `view=table&inc={term}`; the line ends `/(\d+) census projects, (\d+) with two legs/`
  where the first = distinct `P` tokens among census labs. Associations: `/(\d+) records =
  (\d+) grant \+ (\d+) enforcement \+ (\d+) responses \+ (\d+) office \+ (\d+) other/` summing
  to `NGO_EDGES.length`. Capital: `/(\d+) records = (\d+) holdings \((\d+) filing lines \+
  (\d+) aggregates\)/` with aggregates = `AGG_IDS.length`, summing to `CAPITAL_EDGES.length`.

### AC-26 — Put the `UnionBar` denominator in the map's frame, and make it add up
- **Check (`lens=loans`, unfiltered, then `y=YEAR_APPROVALS`, `st=STATE_PLACED`,
  `lender=fin:ida`, `tier=documented`):** Inside the map's `<figure>`: two (three with G1)
  segments labelled `placed in a state government ₹{p} cr`, (G1) `placed by the fetcher's rule
  ₹{f} cr`, `Union body or not placed ₹{u} cr`; `p (+ f) + u` = the strip's ₹ counted under
  the same filters ± 0.5; the mono line contains `{cnr} census records carry no ₹ and are in
  no total · researched records are not on this bar`. Under `m=n`: Σ of state readouts'
  `{k} census records` + the Union row's count = census rows under the filters.

### AC-27 — Show the live effect of every rail control as `{N} → {k}` in words
- **Check:** Each rail control (Year From/To, State, Lender, Holder, Tier) has a
  `[data-effect]` sibling matching `/(\d+) → (\d+)/` whose arrow glyph is inside an
  `aria-hidden="true"` span and whose `aria-describedby` target text matches `/from (\d+) to
  (\d+)/`. Loans' Year effect ends `records (approval year)`; Associations' ends
  `/actions · (\d+) FYs/`; Capital's ends `awards and rules · matrix unaffected`. State on
  Capital reads `does not apply to this lens`; Holder reads `highlights; never isolates`;
  Tier ends `also filters the connection graph` and, on Associations, `grounds and responses
  stay with their action`.

### AC-28 — Count every State option, show zero as `(0)` disabled, never hidden
- **Check:** The State `<select>` has 36 options plus `All states`, alphabetical; each option
  text matches `/\((\d+)\)$/`; options with `(0)` have `aria-disabled="true"` and are still
  present; Σ of the 36 counts ≤ the lens population and, on Loans, = the number of loans with
  a strict-rule placement. The control's label contains `placed by state government only`
  (Loans) or `registered state, not where it works` (Associations).

### AC-29 — Group the Lender select by population, with counts that sum to the loans
- **Check (`lens=loans`):** `select` for Lender has two `<optgroup>`s labelled `World Bank
  (census)` and `Researched sample`; the counts in the first sum to `CENSUS.length`, in the
  second to `RESEARCHED.length`. Choosing `LENDER_SAMPLE` renders `{label}: a researched
  sample of {n} records, not its India portfolio` with `n` = its edges.

### AC-30 — Head every section with its denominator line
- **Check (`lens=loans`):** `#contracts` matches `/(\d+) contract awards recorded, under (\d+) of
  (\d+) census projects · (\d+) not linked to a project/` (third figure = distinct census `P`
  tokens, never `CENSUS.length`) and `/bid count for (\d+) of (\d+) sampled notices/`;
  `#debarments` matches `/(\d+) World Bank debarments of India-based firms recorded · (\d+) of
  (\d+) debarred firms appear among the (\d+) distinct contractors/` (firms over firms, the
  fourth = distinct `t` of award edges); `#conditions` matches `/Conditions recorded for
  (\d+) of (\d+) loan records/` with the second = `LOANS.length`. `lens=associations`:
  `#welfare-join` matches `/(\d+) of (\d+) schemes in the welfare register have a recorded
  link/` with the second = `WELFARE_SCHEMES.length`, then `/(\d+) of (\d+) rows are linked/`,
  then `/(\d+) of (\d+) links are our own inference/`. `lens=capital`: `#rules` matches
  `/(\d+) of (\d+) rules carry a cui-bono row · (\d+) carry an innocent reading/` with the
  second = `law` edges in `CAPITAL_EDGES`; `#contested` on each lens matches `/(\d+) alleged
  claims in this lens · (\d+) with a recorded response · (\d+) without/`.

### AC-31 — Print each base rate as numerator of denominator, grouped with its symmetry text
- **Check:** In `#baserates` on each lens every card matches `/(\d[\d,]*) of (\d[\d,]*)/` or
  reads `not computed`; a Wilson whisker (an element with `data-ci` or the text `95%`) is
  present only where both are integers and the denominator ≥ 10. For every `domain` with a
  `{FLEET}_SYMMETRY` entry, that text appears verbatim inside the **same section element**
  as its cards, directly after them; `political-trusts` is present in the Associations
  `ControlCard`; no separate "symmetry" list exists elsewhere on the lens.

### AC-32 — Pin the control card's domains and quote them verbatim
- **Check:** The `ControlCard` heading is `The same lens on the other side`; its first blocks
  are, on Loans `worldbank-projects` then `worldbank`; Associations `fcra-actions`,
  `fcra-receipts`, `political-trusts`; Capital `holders`, `mandates-ventures` (only those
  present in the module, in that order); each block's `SYMMETRY` `text` appears verbatim.

### AC-33 — Show the population counts as a table headed never added, and sum none of them
- **Check (`lens=associations`):** Beside the timeline a table heading contains `Counts the
  Ministry and Parliament have given`; its header line contains `These counts overlap and use
  different windows. They are never added.`; row count = enforce edges whose `t` is
  `ngo:fcra-associations-aggregate` or contains `aggregate`; the sum of those rows' `a`
  values (where numeric) appears in no element on the page; no `[data-square]` exists for
  those edges.

### AC-34 — Give every matrix row a summary that keeps filing lines and aggregates apart
- **Check (`lens=capital`):** Every `[data-band]` row's summary cell matches `/(\d+) filing
  line\(s\) in (\d+) of (\d+) companies · (\d+) aggregate\(s\), analytic/`; the filing count
  = that holder's `own` edges in `OWN_IDX` not in `AGG_IDS`; the aggregate count = those in
  `AGG_IDS`; their sum appears nowhere in the row. Rows in Band B are in alphabetical label
  order; no control offers a sort by either count.

### AC-35 — State the population in every table caption, with the active filters
- **Check:** Every `<table>` on each lens (twins and section tables included) has a non-empty
  `<caption>` matching `/(\d+) of (\d+) .+ · filters: .+/` or `/(\d+) rows · .+/`, ending `as
  of {date} · run-{id}`; under `?y=2014-2026&st=kl` the caption contains `y=2014–2026` and
  `st=kl`; a paged table's caption contains `page {tp}`.

### AC-36 — Back every filter effect with exactly that many rows
- **Check:** For the unfiltered view, then `y=YEAR_APPROVALS`, then `lender=LENDER_SAMPLE`,
  then `tier=documented`: the Loans `k` of `[data-effect]` beside the changed control =
  `TWIN(project-list)`'s row count summed over every `tp` page = the strip's `{n} of
  {LOANS.length}`.

---

## 4. No-data ≠ zero — FULL build (seats S, P, A)

*Why: the register cannot see everything. A hatch, a hollow, an amber line and the exact
no-amount text are the page's only honest ways to say so; a zero would be a finding.*

### AC-37 — Print the exact text for every loan without a ₹ amount, and sum none of them
- **Check (`lens=loans&view=table`):** For every id in `NO_RUPEE`, its `TWIN(project-list)`
  row's `₹ cr` cell text equals exactly `amount not stated / in US$ m` (G1 may append
  ` US${usdM} m` after it) and its `In totals` cell reads `in no total`; opening its record
  (`rec={id}`) shows the same exact text in the `RecordCard` amount block, followed by the
  record's `d`. The strip's ₹ counted, the `UnionBar` and every ribbon are unchanged between
  a build with those records and the check's own sum without them (i.e. equal to
  `RUPEE_TOTAL`). `SKIPPED` when `NO_RUPEE` is empty.

### AC-38 — Print a zero amount as recorded, never as blank
- **Check:** For any loan with `a === 0`, the row reads `₹0 cr — as recorded` and the card adds
  `read the record text`; `SKIPPED: no zero-amount loan` when none exists (the spec's F2 says
  none does today — the skip is the expected result).

### AC-39 — Hatch every state no record names, and never paint a flat zero
- **Check (`lens=loans`):** `path[data-fill-class="zero"]` count = 0 on every filter
  combination in AC-26. `STATE_NONE`'s path is `hatch` and its listbox option name contains
  `no loan record names this state`; a state whose only named entity is a body registered
  there is `stipple`, its option containing `not in the fill`. The legend names every bin's
  ₹ edges and prints `(none in view)` for an empty bin rather than dropping it (legend item
  count = bin count, constant across filters).

### AC-40 — Show the never-zero words in the readout and the state panel
- **Check (`st=STATE_NONE`):** The `StatePanel` reads `No loan record names {State}. This is a
  statement about the register.`. For `st=STATE_PLACED` the panel's three counts are always
  rendered — `/(\d+) census records placed/`, `/(\d+) name a body registered here — not
  placed, not in the fill/`, `/(\d+) researched records name this state government — listed,
  not summed/` — and equal the `ProjectList` group headings' three counts (AC-72) and the
  map readout's three counts.

### AC-41 — Hatch every missing financial year as a full-height column, never a zero bar
- **Check (`lens=associations`):** For `FY_MISSING` the receipts chart has a hatched column
  whose accessible name or `<title>` contains `no national total recorded`, of height equal
  to the plot height ± 1 px, and no `rect` of height 0 exists in the chart; the twin row for
  that FY prints `no national total recorded` in the ₹ cell and `not in the register` in
  Status. Multi-FY rows render as a bracket (no `rect` bar for them); superseded rows render
  as a tick whose `<title>` starts `superseded by`.

### AC-42 — Hatch unresearched matrix columns and word every cell state
- **Check (`lens=capital`):** For every `COLUMNS` entry with no `own` edge, its column header
  is hatched and every cell in it is `[data-cell="no-record"]` with accessible name ending
  `no named holder recorded for this company`; a constituent with `existingId === null` has a
  column headed `no company record`. Cells in a researched column with no edge for the row
  are `not-named` with the name `not named ≥1% in the filing recorded`. (G3b) When
  `CAPITAL_COVERAGE` marks a company `not-read`, its cells are `not-read` and differ in
  `data-cell` from `read-not-named`. No cell's text is `0`, `—` or empty.

### AC-43 — Word aggregates as analytic lower bounds, never as named holdings
- **Check:** For every id in `AGG_IDS`, the cell that lists it has `data-cell="aggregate"`
  (or `line` when a filing line shares the cell), an accessible name containing `aggregate`,
  `analytic` and `lower bound` and not containing `filing line`, a `Σ` glyph, and a border
  whose `stroke-dasharray`/`border-style` is the analytic dash of the `TierLegend`. The
  BlackRock row (or any holder with only aggregates) has a summary beginning `0 filing
  line(s)` and is nowhere described as `named`.

### AC-44 — Render null terms, fees and cui-bono rows as words, never as 0 or a dash
- **Check:** In `RecordCard` for `REC_CENSUS`: rate, tenor and grace read `not stated`;
  conditions read `No conditions recorded in this record.` with the `worldbank` conditions
  void quoted beneath. For `MANDATE_FEE_NULL` the fee cell is `fee not disclosed`; every
  mandate fee cell is non-empty and none is `—`. For `RULE_NO_BENEFIT` the card reads `No
  cui-bono row recorded for this rule` in amber with the rule's `d` beneath at the same
  computed `font-size`. Across the page no `td`, `dd` or `[data-caption]` has text exactly
  `—`, `0` (except inside `₹0 cr — as recorded`), `NaN`, `null` or `undefined`.

### AC-45 — Say `none recorded` for empty office blocks and `no recorded window covers`
- **Check:** For `REC_CENSUS` the `OfficeOnDate` block renders the fixed sentence `Holding
  office on the approval date is the date test, not a finding.` **before** three sub-blocks
  headed `Recorded office window covers {date} — the date test, not a signature`, `Start
  recorded, no end recorded — held office from`, `Acts recorded on {date}`; an empty
  sub-block reads `none recorded`. Any `ProjectList` row whose date no role window covers
  reads `no recorded window covers {date}` in column 12.

### AC-46 — Answer an unknown id plainly
- **Check:** `rec=nope:000` renders `No record nope:000 in the three registers.` and the amber
  line `ignored an unrecognised rec value`; `sel=nope:000` opens the graph with
  GraphExplorer's own not-found message and the status line's census sentence; a `nodeOf`
  miss anywhere renders `{id} (not in the register)` in mono amber (found by the class the
  page uses for amber mono and the text `(not in the register)`), never an empty label.

### AC-47 — Void the state receipts honestly (G) and name the derived gaps
- **Check (`lens=associations`):** (P5 absent) a card at findings size reads `State-wise
  receipts for {fyRange} are published as an annexure to a Rajya Sabha answer` with ≥ 1
  `a[href^="http"]`, and `#gaps` contains `FCRA state-wise receipts are not in the register as
  records`. (P5 present, today) a state × FY table with 36 state rows whose cells read a
  `₹` figure or the hatch words `no row for this state in the annexure`, a footer `sum of
  rows = {x}; national row = {y}` (any difference in amber), and a `WelfareMap` for the
  selected FY whose hatched paths = states with no row; `#gaps` does not contain that gap
  line. In both cases `#gaps` header matches `/(\d+) voids and (\d+) gaps recorded by the
  research, and (\d+) derived by this page/` with the first two = `NGO_VOIDS.length` and
  `NGO_GAPS.length` (per-lens block) and lists every `NGO_VOIDS[].what` verbatim.

---

## 5. Denials beside claims — FULL build (seats S, A, J)

*Why: an allegation shown without the response of those it concerns is an accusation. The
response slot is always rendered, at equal size, and an empty one says so in fixed words.*

### AC-48 — Print the exact no-response sentence for every unanswered action
- **Check (`lens=associations`):** For `ENFORCE_NO_CONTRA` its `ActionsList` row's Response
  cell text is exactly `No response recorded — asked/not asked unknown` (U+2014); its
  `RecordCard` (`rec={id}`) block 10 reads the same; where another claim in the same case
  file has a response, a second line matches `/(\d+) response\(s\) recorded to other claims
  in this case, shown (above|below)\./`. The timeline square for it has
  `data-response="false"` and an `[ ]` mark beneath whose `<title>` carries the sentence.

### AC-49 — Show every recorded response in full, at the claim's size and weight
- **Check:** For `ENFORCE_WITH_CONTRA` the Response cell begins `Response from {responder}
  [{tier}], {date|undated response}:` and contains the contra's `lab` and `d` in full; the
  square has `data-response="true"` and a rose rule (`stroke`/`background` equal to the
  `--color-rose` token) beneath, the same width as the square ± 1 px. At `D` the Response
  cell's `getBoundingClientRect().width ≥ 0.9 ×` the Action cell's and its computed
  `font-size` and `font-weight` equal the Action cell's; at `M` the two are stacked, same
  width ± 2 px, same `font-size`.

### AC-50 — Keep a stated ground as its own row in its own dash
- **Check:** For a case file with an `alleged` enforce edge on the same target, its row
  renders as a **Stated ground** row with its own tier chip and dash and is not merged into
  the action row; under `tier=documented` every visible action row in that case file still
  shows its ground row, and its `<dl>` begins `Filter: outside tier — shown for context`.

### AC-51 — Re-admit a response whenever its claim is shown
- **Check:** For `ENFORCE_WITH_CONTRA` whose contra's tier differs from the claim's, load
  `tier={claim tier}`: the row and its Response are both visible; the `#contested` list and
  the graph's drawn edge count include the contra. Load `tier={contra tier only}`: the
  claim is not rendered and neither is its orphaned response (a response never appears
  without its claim).

### AC-52 — List every alleged claim in Contested with a response slot, no verdict
- **Check:** On each lens `#contested` has one claim/response pair per id in `ALLEGED_x`
  (excluding `contra`), each side with `lab`, `d`, tier chip and `Cite`; a pair with no
  response reads the exact sentence; the two halves have equal computed width ± 2 px at `D`;
  no element inside `#contested` contains `verdict`, `guilty` or `proven`. Empty lens: `No
  alleged claims in this lens.`.

### AC-53 — Pair debarments and contracts with their response cell
- **Check (`lens=loans`):** Every `#debarments` row has a Response cell reading either a
  joined response or the exact sentence, at the same computed `font-size` as the Ground
  cell; every `#contracts` row has a `How it benefited` cell and, where a debarment names the
  contractor, a Debarment status cell reading `yes`; none reads `0`.

### AC-54 — List the entities with no recorded action as an absence, not a clearance
- **Check (`lens=associations`):** Under the lanes a block headed `/In this register, no
  enforcement action recorded \((\d+)\)/` lists exactly `NO_ACTION_TARGETS` (label and `sub`,
  sorted by label), each row reading `no enforcement action recorded in the register — not a
  finding that none occurred` with a `Show connections` button; beneath it the
  `fcra-actions` and `political-trusts` symmetry texts appear verbatim.

### AC-55 — Render the response block inside every record card, never collapsed
- **Check:** For `REC_CENSUS`, `REC_RESEARCHED`, `ENFORCE_WITH_CONTRA`, `RULE_NO_BENEFIT` and
  `MANDATE_FEE_NULL` opened by `rec=`: block 10 `Responses` is present as a `<dl>` outside any
  `<details>`, not `aria-hidden`, reading either `Response from …` or the exact sentence; the
  amount block reads the `pred`-derived kind (`loan commitment at the rate stated in the
  record`, `contract value recorded for the award`, `foreign contribution for the year in the
  record`, `amount attached, fined or alleged`) and never a kind parsed from `d`.

### AC-56 — Show the rose rule's meaning in the key, and use rose for nothing else
- **Check:** The `ReadingKey` contains `Rose marks a response or denial, never 'bad'. Amber
  marks something not recorded.`. Every element whose computed `color`, `background-color`,
  `stroke` or `fill` equals the `--color-rose` token is inside a Response cell, a
  `[data-response="true"]` rule, a `contra` row or the key itself.

---

## 6. URL round-trip of every filter — FULL build (seats J, P)

*Why: a reader must be able to send someone the exact view. Absent = default = unfiltered.
Every control writes with `replace`, and every URL reproduces the view.*

### AC-57 — Default to Loans, unfiltered, nothing selected, nothing in the URL
- **Check:** `/#/finance`: the `Loans` tab has `aria-selected="true"`; Year From/To read `All
  years`; State `All states`; Lender all; all four tier toggles `aria-pressed="true"`; Find
  empty; `m=cr`, `scale=quantile` and (G) `mid=sector` (G1) / `mid=instrument` selected;
  `view` is stage (`details[data-twin]` all closed); no `RecordCard`, `StatePanel` or
  `HolderCard`; no active-filter line; `new URL(page.url()).hash` is exactly `#/finance`.
  No param names a party: `party` is not in any control's `name` or in any URL the page
  writes across §6.

### AC-58 — Round-trip `lens`, keeping the shared params and dropping `rec`
- **Check:** ROUND-TRIP(`lens=associations`), then `lens=capital`. Load
  `?lens=loans&y=2014-2020&st=kl&tier=documented,reported&find=bank&sel=fin:ibrd&rec={REC_CENSUS}`
  and press the Associations tab: the URL keeps `y`, `st`, `tier`, `find`, `sel`, has
  `lens=associations`, and has no `rec`; `lender` and `holder` controls read `does not apply
  to this lens` (their params, if set, are kept). `lens=loans` is never written (pressing
  Loans removes `lens`).

### AC-59 — Round-trip `y` as a year or a range, with the lens's definition on the control
- **Check:** ROUND-TRIP(`y=YEAR_APPROVALS`) on Loans: From = To = the year; `TWIN(loan-years)`
  marks that row; `TWIN(project-list)` rows all have `Approved` starting with the year or
  `undated` (undated rows appear under all years only — assert none under a set `y`).
  ROUND-TRIP(`y=2014-2020`): From 2014, To 2020, URL `y=2014-2020`. On Associations the
  control's label contains `FY starting in` and `calendar year of`; on Capital the matrix is
  unchanged between `y` set and unset (same `[data-cell]` sequence) and C11 says so.

### AC-60 — Round-trip `st` and open the panel on a user act, not on load focus
- **Check:** ROUND-TRIP(`st=STATE_PLACED`): the map path has the accent outline
  (`data-selected` or `aria-selected="true"` on its listbox option), the `StatePanel h2` is
  the state's label, `ProjectList` renders the three groups of AC-72, the clock adds
  assembly rules for the state and C4 gains `timing is not cause`. Clicking the selected
  state again removes `st`. On Capital `st` is kept in the URL and the control reads
  `holdings are not placed by state`.

### AC-61 — Round-trip `lender`, and explain a sample lender on the map
- **Check:** ROUND-TRIP(`lender=LENDER_SAMPLE`): the map's figure contains `{label} is not
  painted: the map fills from the World Bank census`; `TWIN(project-list)` rows all have
  Lender = the label; `[data-effect]` beside Lender = row count. ROUND-TRIP(`lender=fin:ida`):
  the flow shows only IDA ribbons.

### AC-62 — Round-trip `holder`, highlight and never filter
- **Check:** ROUND-TRIP(`lens=capital&holder=cap:blackrock`): the BlackRock row has
  `aria-current="true"` and visible `(selected)`; `[data-band]` row count is unchanged from
  the unfiltered load; the note `Comparison set required: … This page does not display one
  holder alone.` is visible above the matrix; `HolderCard h2` is BlackRock's label.
  `holder=cap:rothschild-co`: the note adds `has no recorded line in a NIFTY 50 filing` and
  the card lists its outside-index `own` edges and mandates. Clicking the accented label
  again removes `holder`.

### AC-63 — Round-trip `tier` as a comma list shared with the graph
- **Check:** ROUND-TRIP(`tier=documented,reported`): the two toggles pressed, the other two
  not; `TWIN(project-list)` rows' Tier cells ∈ the set; the live region reads `/tier filter:
  documented, reported; from (\d+) to (\d+) records/` after a toggle; the graph's drawn edge
  count (its own status/twin count) differs from the unfiltered count. `tier=none`: every
  twin reads 0 rows, the matrix keeps every `[data-band]` row, the centre reads `No record in
  this register matches` … `This is a statement about the register, not about India.` with a
  one-click reset of `tier`.

### AC-64 — Round-trip `rec`, and refuse to switch lens silently
- **Check:** ROUND-TRIP(`rec=REC_CENSUS`): the `RecordCard` opens with `h2` = its `lab`, focus
  is **not** moved on load (`document.activeElement === body`); `Close` removes `rec`.
  `lens=capital&rec=REC_CENSUS`: the card reads `belongs to the loans lens — go there` and
  the URL keeps `lens=capital`; the link writes both `lens` and `rec`.

### AC-65 — Round-trip `sel` across lenses through Show connections
- **Check:** Click `Show connections for {IBRD label}` on a Loans row: the URL gains
  `focus=fin:ibrd`, `hops=1`, `sel=fin:ibrd`; the page scrolls to `#connections` and
  `document.activeElement` is the graph's detail heading; the status line matches `/The World
  Bank census \((\d+) loan records\) is not drawn here/` with the figure = `CENSUS.length`.
  Press Associations: `sel` persists. `sel={a census-only implementing agency id}`: the
  heading reads `appears only in the World Bank project table` with a `Show its projects →`
  link. `SKIPPED` when no census-only endpoint exists.

### AC-66 — Round-trip `find`, list ≤ 8, never auto-select, group by project id
- **Check:** ROUND-TRIP(`find=Kerala`): the input value is `Kerala`; results are a `<ul>` whose
  `li` count ≤ 8 or whose last line matches `/(\d+) matches — refine/` with `list all`;
  ordering is exact label, alias, label substring, `lab` substring (assert the first result
  for `find={REC_CENSUS label}` is that record); no `rec`, `sel`, `st` or `holder` is written
  by typing; each Record row matches `/(\d{4}(-\d{2}){0,2}|undated) · .+ · (₹[\d,.]+ cr|amount
  not stated \/ in US\$ m) · (documented|reported|alleged|analytic) · (census|researched)/`.
  `find={P_SHARED}`: one heading `/{P_SHARED}: (\d+) records \(census and researched\)/`
  groups ≥ 2 rows. The live region reads `/(\d+) matches for Kerala/`.

### AC-67 — Round-trip `m`, `scale` and `mid`, disabling what the build cannot honour (G)
- **Check:** ROUND-TRIP(`m=n`): the map option `records placed` is selected and its coverage
  reads `/records placed: (\d+) census/`; `[data-fill-class="value"]` counts are from record
  counts (readouts read `in {k} census records`). ROUND-TRIP(`scale=log`). (G1 absent) the
  `usd` map option and the `sector` flow option are `aria-disabled="true"`, focusable, named
  `Sector, unavailable: sector is not exported in this build (G1)` / `US$ m, unavailable …`;
  `?mid=sector` falls back to `instrument` with `ignored an unrecognised mid value` **or** the
  disabled reason (either is accepted for a stale value; the drawn middle column must be
  instruments). (G1 present, today) `mid` defaults to `sector` and is elided from the URL;
  ROUND-TRIP(`mid=instrument`); ROUND-TRIP(`m=usd`) with the coverage `/US\$ m: (\d+)
  records/`; middle-column node labels are exact `majorSector` strings from
  `FINANCE_LOAN_FACTS` (a pair differing only by the `FY17 - ` prefix yields two nodes).

### AC-68 — Round-trip `view`, opening every twin and moving focus to the first caption
- **Check:** ROUND-TRIP(`view=table`): every `details[data-twin]` on the lens is `open`; the
  `Table view` toggle has `aria-pressed="true"`; the live region reads `shown as tables`.
  Click the link `Every graphic on this lens has a table; show them all`: URL `view=table`,
  `document.activeElement` is the first twin's `<caption>` (or the element carrying
  `tabindex="-1"` inside it). Toggle off: `view` leaves the URL, twins close, live region
  `shown as stage`.

### AC-69 — Round-trip `inc` from the reconciliation line as a chip
- **Check:** Click the `census, amount not stated / in US$ m` term: URL has `view=table` and
  `inc=census-no-rupee`; a chip reads `/(\d+) → (\d+)/` with `k` = `TWIN(project-list)` rows,
  each `[data-inclusion="census-no-rupee"]`; ROUND-TRIP(`inc=researched-listed`) likewise.

### AC-70 — Round-trip `tp`, paging at 400 without truncation
- **Check (`lens=loans&view=table`):** `TWIN(project-list)` shows ≤ 400 rows and the line
  `/rows (\d+)–(\d+) of (\d+)/` with the third = `LOANS.length`; `Next` writes `tp=2`, focus
  moves to the twin's `<caption>`; ROUND-TRIP(`tp=2`); the union of rows over every `tp`
  equals `LOANS.length` and has no duplicate `id` (read from the row's Open-record button
  name). `SKIPPED` when `LOANS.length ≤ 400`.

### AC-71 — Ignore unknown values with a visible notice and fall back
- **Check:** For each of `y=2031`, `y=abc`, `st=zz`, `lender=nope`, `holder=nope`, `tier=huge`,
  `m=x`, `scale=x`, `mid=x`, `view=x`, `inc=x`, `tp=0`, `lens=x`: the page renders the
  default for that param and exactly one amber line under the strip reads `ignored an
  unrecognised {param} value`; the URL is not rewritten to remove the value on load (the
  reader's link is preserved). `y=YEAR_NONE`: the list reads `No loan record matches` and
  names adjacent years as links; `y` unchanged.

### AC-72 — Reset everything but `lens` and `view`, and never touch the graph's params
- **Check:** Load `?lens=capital&view=table&y=2020&holder=cap:blackrock&tier=documented&find=x&focus=fin:ibrd&hops=2&q=abc&pred=own`;
  click `reset` in the active-filter line: URL params are exactly `lens=capital`,
  `view=table`, `focus=fin:ibrd`, `hops=2`, `q=abc`, `pred=own`. Across every interaction in
  §6 the page never writes `q`, `fam`, `ty`, `amt` or `path` (assert none appears unless it
  was in the loaded URL).

### AC-73 — Copy the exact link and announce it
- **Check:** Load `?y=2014-2020&st=STATE_PLACED`, click `Copy link`: clipboard text =
  `location.href`; the live region reads `Link copied`. The active-filter line reads
  `filters: y=2014–2020 · st={code} · reset` (en dash in the display, hyphen in the URL).

### AC-74 — Reproduce the whole view from a URL built through the controls
- **Check:** From `/#/finance`, through the UI only: set From 2014, choose `STATE_PLACED`,
  un-press `alleged`, type `bank` in Find, open `REC_CENSUS`. Read `page.url()`; open it in a
  new page; assert the strip, every `<figure>`, `TWIN(project-list)` (opened), the
  `RecordCard` and the active-filter line have identical `innerText`, and
  `[data-fill-class]` sequences over the 36 paths are identical.

---

## 7. Table twin = visible graphic — FULL build (seats A, P)

*Why: a twin that disagrees with the picture by one row has published two findings. Rows
and marks come from the same arrays, and every export reproduces the screen.*

### AC-75 — Match the map twin to the 36 painted states plus the Union row, class for class
- **Check (`lens=loans`, unfiltered and `y=YEAR_APPROVALS`):** `TWIN(loan-map)` row count =
  37; the first 36 `State` cells are north-to-south; the last row is `Union body or not
  placed`. Per class the rows whose `Class` reads `no loan record names this state` / `a
  state body registered here implements a loan; not counted in the fill` / `placed by the
  state government rule` / (G1) `placed by the fetcher's rule ({basis})` equal
  `path[data-fill-class="hatch|stipple|value|fetcher"]` respectively. No `Class` cell
  contains the bare tokens `hatch`, `stipple`, `hollow` or `value`. The `Researched records
  naming the state government` column is present and Σ of `Census records placed` excludes
  it (Σ = census rows placed). The summary reads `/Where the census loans were placed as a
  table · 37 rows/`.

### AC-76 — Match the flow twin to the ribbons, and the strip twin to the marks
- **Check:** `TWIN(loan-flow)` band-table row count = the number of ribbon `<button>`s in the
  flow SVG; Σ of the ₹ column = `RUPEE_TOTAL` under the filters ± 0.5 (each record
  contributes to two bands, so Σ over one column-pair only). `TWIN(records-strip)` row count
  = `[data-mark]` count inside the strip = `RESEARCHED.length` under the filters; rows are
  grouped under `/(\d+) records in this register, a researched sample, not .+'s India
  portfolio/` headings.

### AC-77 — Give the clock twins one row per lane item and one row per year
- **Check:** `TWIN(loan-lanes)` row count = `[data-lane]` bars + `[data-mark]` ticks in the
  clock; each open-ended row's `to` reads `end not recorded`. `TWIN(loan-years)` row count =
  `ASOF_F` year − earliest loan year + 1, first `Year` = the earliest, last = `ASOF_F`'s year;
  a year with no approvals reads `0 approvals in the census` and `no researched record`;
  the `(mid-year test)` column is non-empty for every year with a covering window and reads
  `no recorded window covers` otherwise. `TWIN(loan-months)` has 12 rows, `of {projects}` in
  each, a share only when `projects ≥ 10`. `TWIN(loan-rules)` rows = drawn Lok Sabha rules
  + assembly rules (when `st` is set), the elections column populated only from `Lok Sabha`
  rows of `WELFARE_ELECTIONS`, and no rule dated before the first `Lok Sabha` row.

### AC-78 — Give the receipts twin one row per FY plus every other national row
- **Check (`lens=associations`):** `TWIN(receipts)` row count = `FY_AXIS.length` + (superseded
  rows) + (multi-FY rows) = bars + hatched columns + ticks + brackets drawn; each FY row's
  Status is `current`, `superseded by {id}` or `not in the register`; `TWIN(receipts-donors)`
  rows = `grant` edges from a named donor into the sector aggregate; `TWIN(receipts-registrations)`
  rows = analytic edges with `s === t === 'ngo:fcra-associations-aggregate'`.

### AC-79 — Match the actions list to the timeline, square for square
- **Check:** The number of `<section id^="case-"]` = `[data-lane]` count in the timeline minus
  the `Courts and oversight` lane; Σ of action `<dl>` rows (not response rows) across
  `ActionsList` = `[data-square]` count + undated events in the right gutter (`/undated/` in
  lane labels summed); rows with the exact sentence = `[data-response="false"]` count; each
  case section's header matches `/(\d+) actions · (\d+) with a response to that claim/` and
  its rows equal the first figure. Under `st` or `y` the header gains `/(\d+) in view under
  the current filters/` and every row's `<dl>` begins `Filter: in view` or `Filter: outside`.

### AC-80 — Match the matrix twins to the grid
- **Check (`lens=capital`):** `[data-cell]` count = `[data-band]` row count × `COLUMNS.length`;
  `[data-band="A"]` count = `BAND_A.length` and `[data-band="B"]` = `BAND_B.length`;
  `TWIN(matrix-lines)` row count = `OWN_IDX.length`, each with `kind` ∈ {`filing`,
  `aggregate`} and aggregates carrying an `innocent reading` cell; `TWIN(matrix-columns)`
  row count = `COLUMNS.length` with `status` ∈ {`researched`, `no-record`} (G3b adds
  `not-read`). `Copy as TSV — Named holders in NIFTY 50 filings (grid)` yields
  `[data-band]` rows × `COLUMNS.length` data cells, each a state word (never a bare token).
  Rules: `#rules` card count = bars drawn in `RulesTimeline` = `TWIN(rules)` rows.

### AC-81 — Export exactly what is drawn, with the provenance header first
- **Check:** For every `[data-twin]` and every section table on each lens: a `Download .tsv —
  {table name}, {rows} rows` and a `Copy as TSV — {table name}` button sit above it with
  `{rows}` = its row count (all pages for `project-list`). Click `Copy as TSV`: clipboard
  lines beginning `#` come first and include `# table: {name} — `, `# rows: {k}` (with `(all
  pages; screen shows {a}–{b})` when paged), `runId`/`run-`, `asOf`, the page URL, `lens`,
  the filters, and, wherever a `₹` appears in the rows, `# amounts: ₹ crore, nominal, at each
  record's approval-year rate as recorded; not deflated`; the header line follows, then
  exactly `k` data rows; the live region reads `{table name} copied, {rows} rows`. `Download
  .tsv` fires a `download` whose `suggestedFilename()` matches
  `/^finance-(loans|associations|capital)-[a-z0-9-]+-\d{4}-\d{2}-\d{2}-run-[0-9a-f]+\.tsv$/`.

### AC-82 — Type the machine columns, and export the same rows when filtered
- **Check (`project-list`, unfiltered then `y=2014-2020&st=STATE_PLACED`):** the header ends with
  the machine columns `id domain inclusion project_key lender_id borrower_id a_cr from to
  date_precision approval_year placement_st placement_rule body_st tier instrument
  conditions_n contracts_n source_urls`; every `a_cr`, `approval_year`, `conditions_n`,
  `contracts_n` value parses as a number or is empty (never `amount not stated…`, which stays
  in `amount_display`); `date_precision` ∈ {`year`, `month`, `day`}; the data-row count
  under the filtered URL = the filtered twin's rows over all pages. The receipts twin's
  machine columns include `fy_start` (integer) and `status`; the map twin's include `st`.

### AC-83 — Give every twin a summary that names its graphic and its rows
- **Check:** Every `details[data-twin] > summary` text matches `/^.+ as a table · (\d+) rows$/`
  and the `{h3}` part equals the visible `h3` of its graphic (`Where the census loans were
  placed`, `Lender, instrument and place`, `When: approvals against elections and office`,
  `Month of approval`, `Other lenders, one mark each`, `Every loan record`, `National
  receipts by financial year`, `State-wise receipts`, `The Ministry's actions and the
  responses`, `Named holders in NIFTY 50 filings`, `Holdings outside the index`).

### AC-84 — Open the same record from the twin as from the graphic
- **Check:** In `TWIN(project-list)` the row for `REC_CENSUS` has a button named `Open record:
  {lab}`; clicking writes `rec={id}` and the card's `From:`/`To:` buttons name `nodeOf(s)` and
  `nodeOf(t)` labels; the citation `<output>` text matches `/^.+ — (₹[\d,.]+ cr — .+|amount
  not stated \/ in US\$ m) — approved (\d{4}(-\d{2}){0,2}|undated) — .+ → .+ —
  (documented|reported|alleged|analytic) — .+ https?:\/\/.+ — ICIP https?:\/\/.+#\/finance\?lens=loans&rec=.+, read to \d{4}-\d{2}-\d{2}$/`
  and `Copy citation` puts the same string on the clipboard with `Citation copied` announced.

---

## 8. Keyboard reachability — FULL build (seat A)

*Why: every graphic is reachable by a real control, nothing focusable hides inside a
hidden drawing, and one live region says what changed in words.*

### AC-85 — Drive the lens tabs with arrows and activate on Enter, not on focus
- **Check:** `[role="tablist"]` holds three `[role="tab"]`; focus Loans, press `ArrowRight`:
  focus is on Associations, `aria-selected` unchanged, URL unchanged; press `Enter`: URL
  `lens=associations`, the panel `aria-labelledby` the tab, focus on the lens heading.
  `Space` on Capital does the same.

### AC-86 — Drive the map as a listbox and announce each state
- **Check:** `svg[role="listbox"]` with 36 `[role="option"]` in north-to-south order; `Tab`
  into it, `ArrowDown` moves `aria-activedescendant`; each option's name contains the state,
  its class words and value (`₹{v} cr in {k} census records` or `no loan record names this
  state`); `Enter` writes `st` and moves focus to the `StatePanel h2`; `Escape` with focus in
  the panel clears `st` and returns focus to the option. No `path` inside is focusable and
  every shape is `aria-hidden`.

### AC-87 — Drive the matrix as a grid with a roving tabindex
- **Check (`lens=capital`):** The matrix is a `<table role="grid">` with `aria-rowcount` and
  `aria-colcount`, a `<caption>`, `th[scope="col"]` per company, `th[scope="row"]` per holder,
  band headers as `th[colspan]`. `Tab` into it lands on one cell; `ArrowRight`/`ArrowDown`
  move focus without leaving; `Enter` on a cell writes `rec`; `Tab` leaves the grid in one
  stop. A cell's accessible name is one of the four §5.3.1 forms and does not repeat the
  holder or company (the headers carry them).

### AC-88 — Reach the flow's ribbons as buttons, and skip the diagram to its table
- **Check:** The flow SVG has `role="group"`, `aria-labelledby` its `h3`, `aria-describedby` a
  sentence matching `/(\d+) bands, ₹[\d,.]+ crore across (\d+) records; (\d+) records without
  ₹ not drawn/`; every ribbon is a `<button>` named `/.+ to .+: ₹[\d,.]+ cr across (\d+)
  records, (documented|reported|alleged|analytic); filters the project list/`; paths and
  labels are `aria-hidden`; no `role="img"` ancestor. A link `Skip the diagram to its table`
  precedes it and, when activated, opens `TWIN(loan-flow)` and focuses its caption.

### AC-89 — Put nothing focusable inside a hidden drawing, and keep the brush pointer-only
- **Check:** On every lens and panel state (`rec`, `st`, `holder`, `view=table`):
  `[aria-hidden="true"] :is(a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"]))`
  count = 0 and `[role="img"] :is(…)` count = 0. The clock's brush has no `tabindex` and is
  not reached by tabbing through the lens; the rail's Year From/To selects change `y`.

### AC-90 — Keep every closed twin out of the accessibility tree, and open it from the skip link
- **Check:** For every `details[data-twin]:not([open])`: `innerText` of its content is empty
  and it contains 0 tabbable descendants (per AC-89's selector); after clicking its summary
  every control inside is tabbable. Before each graphic a link `Skip to the table` opens
  that twin and moves focus to its `<caption>`.

### AC-91 — Name every repeated control by its row, uniquely within its section
- **Check:** Within each `<table>`, `<ul>` and `<section>`: no two enabled `button`/`a[href]`
  share an accessible name; row controls are named `Open record: {lab}`, `Show connections
  for {label}`, `Cite {lab}`, `Copy citation for {lab}`, `From: {label}`, `To: {label}`. Every
  `aria-describedby` id resolves to an element. Heading levels never skip within `main` or
  `aside` (`h1` → `h2` → `h3`, computed over DOM order).

### AC-92 — Give every panel a Close and a Back that return focus, and scope Escape
- **Check:** Open `rec` from a `ProjectList` row: `Close` is the first tab stop after the card's
  `h2`; activating it clears `rec` and `document.activeElement` is the row's Open-record
  button; `Back to {origin}` at the foot does the same. Open `st` from the map: `Escape` with
  focus in the panel clears `st`; `Escape` with focus in the rail's State select or in Find
  changes no param (URL identical before and after).

### AC-93 — Keep exactly one live region and speak in words
- **Check:** `[aria-live]` count = 1, `aria-live="polite"`. After each of: a tier toggle, a
  State change, a lens change, `Copy link`, `Copy as TSV`, `Table view`, typing in Find, its
  text contains none of `→`, `≥`, `Σ`; filter effects read `/from (\d+) to (\d+) /`. Every
  `aria-describedby` text and every option name contains no `→`.

### AC-94 — Reach the stage inside the tab-stop budget
- **Check (`FOLD`):** Counting `Tab` presses from `document.body` (page top): the map listbox in
  ≤ 25; the first `ProjectList` row's first control in ≤ 12 after the `Every loan record`
  twin is open under `view=table`; on Capital the matrix grid in ≤ 25; the graph section
  heading (`#connections h2`) in ≤ 25 after `Load the graph`/intersection. Each `[role="tab"]`,
  `Find`, each rail control and each twin summary is a stop; the unavailable options are
  stops (`aria-disabled="true"`, focusable) with the reason in their name.

---

## 9. Mobile at 390 px — FULL build (seat M)

*Why: a page that scrolls sideways has hidden a column; a diagram whose labels halve has
hidden a word. Everything moves; nothing is hidden.*

### AC-95 — Scroll the page vertically only, in every state
- **Check (`M` and `M360`):** For each of `/#/finance`, `?lens=associations`, `?lens=capital`,
  `?view=table` on each lens, `?rec=REC_CENSUS` (arriving by URL, no opener),
  `?lens=capital&holder=cap:blackrock`: `document.scrollingElement.scrollWidth <=
  window.innerWidth`; after scrolling to the bottom in 600 px steps the same holds at every
  step; no element's `getBoundingClientRect().right` exceeds `innerWidth` except inside an
  ancestor with `overflow-x: auto`.

### AC-96 — Pin one line of strip and the tabs within 140 px, and move the rest under the map
- **Check (`M`):** `[data-pinned-stack]` height ≤ 140 px and is `position: sticky|fixed`;
  the strip inside it shows fact 1 and the date only; facts 2–6, the byline and the `Built
  from…` line appear whole in a mono list directly after the map's `figcaption`, with the
  word `nominal` still beside the ₹ figure; the `ReconciliationLine` is a `<ul>` under the
  `UnionBar` and is not sticky; the active-filter line is not sticky.

### AC-97 — Keep the strip, tabs and rail summary in the first screen and the bar in two
- **Check (`M`, `lens=loans`):** At `scrollY = 0` the bottom of the rail summary (`details >
  summary` reading `/Filters \((\d+)\) · (\d+) → (\d+)/`) ≤ 844 px; the `UnionBar`'s bottom
  ≤ 1,688 px; the texture key (`ReadingKey` swatches under the figcaption) is within 844 px
  of the map's bottom edge. (`FOLD`, D50 twin) the `UnionBar` is within the first 800 px.

### AC-98 — Collapse the rail into a labelled details block with the effect outside it
- **Check (`M`):** The rail is a `<details>` whose summary matches `/Filters \((\d+)\) · (\d+) →
  (\d+)/`; the `[data-effect]` line for the last change sits outside the collapsed block and
  stays visible while closed; the selects inside are native `<select>`s; the rail foot's
  refusal line is present and links to `#refusals`.

### AC-99 — Replace the flow by two ranked lists, and put twins first elsewhere
- **Check (`M`, `lens=loans`):** No flow SVG is rendered; two lists (lender × middle; place)
  render the same bands ranked by ₹ with the note `the flow diagram needs a wider screen;
  these are the same bands as lists`, and `TWIN(loan-flow)` sits beneath. `LoanClock`,
  `ActionsTimeline` and `RulesTimeline` render their twin by default with a `Show the
  diagram` button; once shown, each scrolls inside its own container with a sticky 96 px
  label column, initial `scrollLeft` placing `asOf` at the right edge, and a line `/showing
  .+–.+/` with `‹ earlier` / `later ›` buttons. `ReceiptsByYear` draws every FY at full width
  with no horizontal scroll and a legend line `/hatched: no national total recorded — .+/`.

### AC-100 — Transpose the matrix, keep Band A, and make also-named a route
- **Check (`M`, `lens=capital`):** The grid has one row per `COLUMNS` entry and one column per
  `BAND_A` (32 px each ± 1) after a 110 px sticky label; Band B appears as a per-row mono
  line beginning `also named:` whose every name is a `<button>`; tapping the BlackRock (or
  `HOLDER_B`) button writes `holder` and adds **one** accented column labelled `(selected)`
  after Band A, Band A unchanged; `HolderCard` renders directly under the grid with each
  `own` edge's `d` verbatim and an `http` source. Rotated short labels carry full names in
  the accessible names. `scrollWidth ≤ innerWidth` throughout.

### AC-101 — Show a readout first on tap, then act, with the state select as the route
- **Check (`M`, `lens=loans`):** Tapping `STATE_PLACED`'s path shows a readout block under the map
  of up to four lines (`{State}: ₹{v} cr in {k} census records ({y})` first, ending `— open
  the state for the list`) and writes no param; a second tap, or `Open state`, writes `st`;
  a `<select>` labelled `Open a state` sits under the figcaption; no on-map state label text
  is drawn. The `StatePanel` renders directly under the map with one `scrollIntoView` and
  `Close` / `Back to {origin}`.

### AC-102 — Render every response-bearing table as cards with the response under the claim
- **Check (`M`):** `ProjectList`, Contracts, Debarments, Conditions and rules, GrantsNamed,
  WelfareJoin, Mandates, Licences, the rule cards, OutsideIndex and Contested render as
  `StackTable` cards: one `<dl>` per row, the Response block directly after the claim block
  at the same computed `font-size`, never inside a `<details>`, and no Sources list inside a
  `<details>`; every Response and Sources cell's `right ≤ innerWidth`. Only DebtContext, the
  matrix column-status twin and the flow band table keep a scrolling `role="region"` with
  `aria-label` = the caption and the line `/(\d+) columns · scroll → for the rest/`.

### AC-103 — Keep mono text at or above 12 px, hide the graph behind a button, honour reduced motion
- **Check (`M`):** Every element whose computed `font-family` contains the mono face has
  `font-size ≥ 12px`. `#connections` shows a `Load the graph` button and no canvas until it
  is pressed; with `sel` in the URL the graph still waits for the button. With
  `reducedMotion: 'reduce'` no element has a non-zero `transition-duration` on `fill`,
  `stroke` or `background-color`, and `scroll-behavior` is not `smooth`.

### AC-104 — Explain the empty state before any number on a phone (EMPTY build)
- **Check (`M`, EMPTY):** AC-01, AC-02, AC-03 and AC-04 hold at 390; the callout precedes the
  strip in DOM order and its top is above the map; `scrollWidth ≤ innerWidth` on all three
  lenses.

---

## 10. Frozen channels, fold and house rules — FULL build (seats S, A, J)

### AC-105 — Keep the `UnionBar` in the first viewport at 1280×800
- **Check (`FOLD`, `lens=loans`):** At `scrollY = 0` the `UnionBar`'s `getBoundingClientRect().bottom
  ≤ 800`; the header (`h1` block) height ≤ 160 px; the map's height is within `[420, 560]`.

### AC-106 — Dash only for tier, and never render alleged like documented
- **Check:** For every SVG element with a non-empty `stroke-dasharray` on the page: it is a
  ribbon, a tick, a tenure outline, a square, a bar outline, a matrix cell border or a key
  swatch, and its dash equals the `TierLegend` swatch of its record's tier (read the tier
  from its accessible name or twin row). Assembly rules have no `stroke-dasharray` and a
  lighter stroke than Lok Sabha rules. A `documented` and an `alleged` mark on the same
  surface never share a dash. Screenshots in greyscale (`page.emulateMedia({ forcedColors:
  'none' })` + a CSS `filter: grayscale(1)` injected for the shot) at 390 and 1280 on each
  lens are saved when `FINANCE_SHOTS` is set; the check computes, from the legend swatches'
  rendered pixels, that hatch, stipple, hollow, (G1) overlay, ramp floor and page ground are
  pairwise distinguishable (mean luminance difference ≥ 8 on a 0–255 scale) and that the
  four tier dashes differ in on/off period.

### AC-107 — Colour nothing by party, country or religion; rank nothing the page computes
- **Check:** Collect every `fill`, `stroke`, `color` and `background-color` on elements whose
  text or accessible name contains a party name from `WELFARE_ELECTIONS[].winner`, a country
  name from any node `sub`, or `Hindu|Muslim|Christian|Sikh`: each equals the page's text
  colour or ground, never a hue token. No `<select>` or toggle offers `party`, `country`,
  `religion`, `era` or `risk`; the rail foot reads `Not offered: party, religion,
  donor-country and 'risk' filters — why →` linking to `#refusals`, and `#refusals` lists ≥
  12 items including `A holder ranking`, `BlackRock, or any holder, alone` and `Party colour
  anywhere`. No sort control on the mandate, benefit or holder tables sorts by money; the
  default sort of `ProjectList` is approval date descending (`aria-sort="descending"` on
  `Approved`).

### AC-108 — Draw Band A always, and withhold the grid below four
- **Check (`lens=capital`):** For each URL in {`?lens=capital`, `&holder=cap:blackrock`,
  `&holder=cap:rothschild-co`, `&tier=reported`, `&tier=none`, `&find=BlackRock`, `&y=2020`}
  and for `y` = every year present in any capital edge's `from`: `[data-band="A"]` count =
  `BAND_A.length` ≥ 4, and every `BAND_A` id's label is a row header; when `holder` is set
  the text `Comparison set required` is visible. The fail-closed guard is exercised against
  a scratch build whose `CAPITAL_CONTROLS`/identity export declares three controls (built
  the EMPTY way, from a scratchpad copy of the raw files): the grid is absent, the text
  `Comparison set required. This build declares 3 comparison holders; the matrix needs at
  least four to be read fairly and is withheld.` is present, and both matrix twins render.

### AC-109 — Print no digit in a matrix cell before G3a, and no ramp after (G)
- **Check:** (G3a absent) every `[data-cell]` text matches `/^(≥1%( ×\d+)?|agg\.|)$/`. (G3a
  present, today) a `line` cell prints `/^\d+(\.\d+)?%( ×\d+)?$/` from `CAPITAL_HOLDINGS[id].pct`
  (never a figure parsed from `d`; assert equality with the export for five cells); in both
  branches every `line` cell has the same `background-color` (no ramp: the set of distinct
  cell backgrounds among `line` cells has size 1).

### AC-110 — Use British spelling in page-authored prose, and no partisan frame
- **Check:** Concatenate `innerText` of every `[data-page-copy]` element, every `h2`/`h3`
  inside `main` and `aside`, every twin `summary`, the rail's labels and the live region's
  messages over §6: none matches
  `/\b(colors?|center|centered|favor|favorite|honor|labeled|organization|analyze|programs?|catalog|gray|license)\b/i`
  — in plain words: `color`, `center`, `favor`, `honor`, `labeled`, `organization`,
  `analyze`, `program`, `catalog`, `gray` and the noun `license` are each a failure
  (the API's verbatim sector strings, `lab`, `d`, `sub`, `FleetText` and narrative text are
  excluded, being quoted), and none contains `UPA`, `NDA`, `BJP`, `Congress`, `ruling`,
  `opposition` or `government of the day` (those words may appear only inside quoted
  research text, `lab`, `d`, `sub` or narrative claims). `Rothschilds` and `family` appear
  only inside narrative claim text or the standing line.

---

## 11. Coverage matrix

| brief requirement | criteria |
|---|---|
| honesty captions | AC-10 … AC-22 |
| denominators | AC-23 … AC-36, AC-75, AC-79, AC-80 |
| no-data ≠ zero | AC-04, AC-05, AC-37 … AC-47, AC-109 |
| denials beside claims | AC-48 … AC-56 |
| URL round-trip of every filter | AC-57 … AC-74 (`lens y st lender holder tier rec sel find m scale mid view inc tp`; unknown values; Reset; Copy link; graph params never written) |
| table twin row count = visible graphic | AC-75 … AC-84 |
| scaffold state (≥ 200 chars, says so) | AC-01 … AC-09, AC-104 |
| keyboard reachability | AC-85 … AC-94, AC-68, AC-92 |
| mobile at 390 px, no horizontal page scroll | AC-95 … AC-104 |
| frozen channels, fold and house rules | AC-105 … AC-110 |
| spec Review Focus FG-RF1 … RF7 | AC-24, AC-37 (RF1); AC-48, AC-54, AC-17 (RF2); AC-108, AC-62 (RF3); AC-31 (RF5); AC-50 (RF6); the `famSplits` sentence is asserted inside AC-47's gap listing and the ReadingKey when the check finds a `ty` with two `fam`s, otherwise its absence (RF7) |

## 12. How to run

The criteria are written to be implemented as `scripts/pages/finance.test.mjs`, one
`node --test` case per criterion named by its AC id, following `scripts/pages/welfare.test.mjs`
(own static server over `dist`, pinned Chromium, fixtures derived from the generated
modules before the run, `SKIPPED: <reason>` for a fixture the build does not contain, never
counted as passed). `FINANCE_DIST` pins the `dist` copy; `FINANCE_BUILD=empty|full`
overrides detection; `FINANCE_SHOTS=<dir>` saves the greyscale screenshots of AC-106. The
EMPTY build and the three-control build of AC-108 are made in a scratchpad copy of the
repository, never by editing `research/raw/` or `*.generated.ts`. Nothing in the script
imports from `src/pages/`, `src/components/` or `src/data/financeView.ts`; it reads the
generated modules the way `energy.test.mjs` does, and the criteria document is the whole
contract. Add the file to `test:pages` once the suite is green on three consecutive runs
(HANDOFF: a gate that is red for a known reason teaches people to ignore it).
