# /energy — acceptance criteria

*Written 2026-09-25 from `docs/design/ENERGY_PAGE.md` (the spec, with UX amendments A1–A20
applied). Procedure shape: the sweetclaude `product-user-stories` skill — numbered, one
observable behaviour each, with the acceptance test stated so that a developer can
write it without asking. State files, personas and format prompts from that skill are
not used here; the persona work is in `ENERGY_UX_REVIEW.md`.*

*Each criterion is one behaviour of the **built page in `dist`**, verified by a headless
Playwright check. Nothing here inspects source. The deferred amendments in spec §16 are
not criteria; where one is quoted it is marked as a note, not a gate.*

---

## 0. Conventions every check shares

**Routing.** `HashRouter`, so a parameterised URL is `{base}/#/energy?dom=coal`. Read the
live URL with `new URL(page.url()).hash`, and parse its `?…` part with
`URLSearchParams`. `base` is the local `dist` server that `scripts/smoke.mjs` already
starts.

**Loading.** Every check does `page.goto('about:blank')` first, then `page.goto(url,
{ waitUntil: 'networkidle' })`, then waits 1,800 ms (the force layout runs a fixed tick
count). Every check also collects `console` errors and `pageerror` events with smoke's
`external` allowlist, and **fails on any**.

**Viewports.** `D` = 1280 × 800 (desktop). `M` = 390 × 844 with `isMobile: true,
hasTouch: true` (phone). A criterion names the viewport(s) it runs at; unmarked means `D`.

**Fixtures.** Two builds:

- **`dist`** — the ordinary build from the populated generated module.
- **`dist-empty`** — the scaffold state (zero records). Build it from a scratch copy of
  the repository in which `research/raw/energy/` is absent: `node
  scripts/assemble-fleet.mjs` then writes a module with `ENERGY_META.empty === true` (the
  assembler returns an empty fleet for a missing directory), and `npx vite build
  --outDir dist-empty` follows. Never edit `research/raw/` or `*.generated.ts` in the
  working tree to get this state.

**Data-derived ids.** Checks never hard-code an id, a label or a count. They read
`src/graph/energy.generated.ts` at test time (as `smoke.mjs` does for its parameterised
`/energy` routes) and derive:

| handle | derivation |
|---|---|
| `FIX.D` | the drawable claim count: edges that are not `contra`-to-`claim:` and have no `supersededBy` and both endpoints hydrate |
| `FIX.claim` | the first drawable claim id in code-unit order |
| `FIX.answered` | a drawable claim that has ≥ 1 `contra` edge with `t === 'claim:' + id` |
| `FIX.silentDoc` | a `documented` drawable claim with no response |
| `FIX.alleged` | an `alleged` drawable claim (it has a response by build gate) |
| `FIX.noAmount` | a drawable claim with `a` null or 0 |
| `FIX.company` | a `co:` node that is an endpoint of ≥ 1 drawable claim and a constituent in `research/raw/indices.json` |
| `FIX.a`, `FIX.b` | two nodes joined by a path of ≥ 2 hops in the unfiltered view |
| `FIX.killed` | an id from `ENERGY_META.killed`, if any |
| `FIX.key` | the first key of `research/raw/indices.json` |
| `FIX.sweeps` | the set of `ENERGY_META.files[].domain`; `FIX.absent` = the 12 declared slugs minus that set |
| `FIX.superseded` | the count of edges with `supersededBy` set |

**Test hooks the page must expose.** Plain `data-*` attributes carry no visual channel,
so they do not touch the frozen encodings (spec §6). They are the only additions these
criteria impose on the build:

| attribute | on |
|---|---|
| `data-claim="{id}"` | every individually drawn claim edge in the canvas, and every twin row |
| `data-response-tick` | the rose midpoint tick of an answered claim |
| `data-tenure="{claimId}"` and `data-tick="{claimId}"` | tenure bars and decision ticks in the lanes SVG |
| `data-nodata` | every hatched no-data chip, cell or block |
| `data-denominator` | the one-line denominator of every `EvidenceSection` |
| `data-cannot-show` | the "What this cannot show" block of every `EvidenceSection` |
| `data-effect` | every live `{from} → {to}` effect line (strip, index control, sections) |
| `data-strip-fact="{n}"` | each `DenominatorStrip` fact, numbered as spec §5.2 |

**Section anchors** (spec §4): `#stage`, `#twin`, `#offices`, `#benefit`, `#benchmark`,
`#contested`, `#baserates`, `#missing`.

---

## 1. Render and scaffold state

### AC-01 — The route renders and is error-free
- **Behaviour:** `/energy` renders a document, not a blank frame.
- **Check:** `D`, `dist`, `/#/energy`. Assert `document.body.innerText.length ≥ 200`; assert `h1` text is `Who decides over energy, and who is recorded as gaining`; assert zero console or page errors.

### AC-02 — Zero records still renders a page that says so
- **Behaviour:** With the fleet empty, the page renders at least 200 characters and states that nothing is loaded, without pretending zero.
- **Check:** `D` and `M`, **`dist-empty`**, `/#/energy`. Assert `innerText.length ≥ 200`. Assert a `Callout` (`div` whose first child is the mono uppercase label) contains the text `The energy register has not been promoted in this build. Nothing below is zero — it is absent.` Assert the byline `p` under `h1` contains `0 research sweeps` and `as of —`. Assert the strip contains `0 of 12 sweeps researched`. Assert `#missing` exists and `#benefit`, `#benchmark`, `#offices`, `#contested`, `#baserates` do **not**. Assert no `[role=combobox]` (the company box is not rendered). Assert every sweep chip `button[aria-pressed]` is `disabled` and has `[data-nodata]`. Assert the sources footer contains `0 sources`. Zero console errors.

### AC-03 — The byline carries the run and the as-of span
- **Behaviour:** Every figure on the page hangs off a run id and a date range that the header states.
- **Check:** `/#/energy`. The byline `p` matches `/^\d+ research sweeps · \d+ entities · \d+ claims · run run-[0-9a-f]+ · as of \d{4}-\d{2}-\d{2}( – \d{4}-\d{2}-\d{2})?$/`. Assert the `\d+ claims` figure equals `FIX.D`.

---

## 2. Honesty captions

### AC-04 — The stage caption is always visible, verbatim
- **Behaviour:** The graph never appears without the sentence that says what it is not.
- **Check:** `/#/energy`, and again with `?dom=coal`, `?claim={FIX.claim}`, `?table=1`. In each, an element inside `#stage`, below the shape legend (`[role=group][aria-label="Filter by entity type"]`), contains both `An edge is a sourced claim, not a measure of influence.` and `The dash is the evidence tier and survives greyscale; read it before the colour.` Assert `isVisible()` and that no ancestor is a closed `details`. Run at `M` too.

### AC-05 — The sweep strip says a chip is not a sector
- **Behaviour:** The strip's caption is always on, at 12px.
- **Check:** `/#/energy`. Under the two chip rows, an element with text `A chip selects the research sweep a claim was recorded in, not its sector. A coal company's electoral bond is recorded under Money trail.` is visible with computed `font-size` `12px`. Run at `M` too.

### AC-06 — The voids caption sits under the void list
- **Behaviour:** The margin at rest explains why absences have no line.
- **Check:** `/#/energy`. Inside the `aside`, after the void list, text `Voids have no line in the graph because an absence has no endpoints.` is visible. At `M`, the same text is visible directly under the canvas.

### AC-07 — Every evidence section has a full-size "What this cannot show"
- **Behaviour:** No section below the stage ships without its limit, and the limit is never collapsed.
- **Check:** `/#/energy`. For each of `#offices #benefit #benchmark #contested #baserates #missing`: assert ≥ 1 descendant `[data-cannot-show]` (two in `#contested`: allegations and narratives) whose text length ≥ 40, whose computed `font-size` is `14px`, which has no `details` ancestor, and which contains a 10px mono uppercase label reading `What this cannot show`. Repeat at `M`: same assertions, `isVisible()` true.

### AC-08 — The cannot-show texts are the spec's, with dates interpolated
- **Behaviour:** The captions are the reviewed sentences, not paraphrases.
- **Check:** `/#/energy`. Assert containment, by section: `#offices` → `A gap in a lane is a gap in the record, not a vacancy in the office.`; `#benefit` → `'unknown' is unknown, not zero`; `#benchmark` → `Membership is as of ` followed by a `\d{4}-\d{2}-\d{2}` and `banks and IT firms are absent because this register did not research them`; `#contested` (allegations) → `Its presence does not make the claim false, and its absence does not make it true.`; `#contested` (narratives) → `not the verdict of any court, regulator or auditor`; `#baserates` → `this page has not re-run it`; `#missing` → `What nobody thought to look for leaves no trace here.`

### AC-09 — The company trail keeps its two lists apart, and says why
- **Behaviour:** Opening a listed company shows decisions and money in two lists with the caption between them.
- **Check:** `/#/energy?sel={FIX.company}&focus={FIX.company}&hops=1`. In the `aside`, assert headings `Public decisions touching it` and `Money it sent` exist as separate blocks, and the text `These two lists are kept apart on purpose.` is visible. Assert no single table contains both a `bond|csr|trust|direct|pmin` row and an `award|law|enforce|pmout|role` row.

### AC-10 — A lit claim carries the date-test caveat
- **Behaviour:** Lighting a claim never implies the office-holder acted.
- **Check:** `/#/energy?claim={FIX.claim}`. Assert the in-frame status (bottom-left of the canvas) contains `lit: claim {FIX.claim}` and the caption or `[role=status]` contains `it is not evidence that the office-holder made or influenced the decision`.

### AC-11 — A date window states its undated and coverage caveats
- **Behaviour:** Filtering by time never hides undated claims silently and never presents thin years as clean.
- **Check:** `/#/energy?from=2015-01-01&to=2016-12-31`. Assert text matching `/\d+ undated claims (are )?shown regardless of the window/` is visible, and `[data-strip-fact="10"]` exists and contains either `sweeps declare search years in this window` or `no sweep declares its search years — sparse is not clean`.

### AC-12 — Every figure carries its as-of and its source
- **Behaviour:** A ₹ figure, a membership, a rate or a claim is never shown without the date it is true at and where it comes from.
- **Check:** (a) `/#/energy?claim={FIX.claim}`: the `aside` top line contains a `\d{4}-\d{2}-\d{2}` file date; ≥ 1 `a[href^="http"]` whose visible text is itself an `http(s)://` URL; a mono block containing `claim {FIX.claim}` and `run run-`. (b) `/#/energy`: the index rail control contains `membership as of \d{4}-\d{2}-\d{2}`; `#benchmark [data-denominator]` ends with `lists as of \d{4}-\d{2}-\d{2} · ` and a source label; every `#baserates table tbody tr` has a non-empty sources cell.

### AC-13 — The page's own words carry no partisan frame
- **Behaviour:** Headings, captions, labels and notes never say "opposition", "ruling" or "government of the day".
- **Check:** `/#/energy`. Collect text of `h1, h2, h3, th, caption, label, [data-cannot-show], [data-denominator], .font-mono[class*="uppercase"]`. Assert no match for `/\b(opposition|ruling|government of the day)\b/i`. (Verbatim claim, response and source text is data and is excluded by construction.)

---

## 3. Denominators

### AC-14 — The strip shows n of N in the spec's order
- **Behaviour:** The sticky strip leads with claims shown of claims drawable.
- **Check:** `/#/energy`. Assert `[data-strip-fact="1"]` text matches `/^\d+ of \d+ claims$/` and its `of` figure equals `FIX.D`. Assert `[data-strip-fact="3"]` matches `/^\d+ of \d+ allegations answered$/`. Assert the strip's container has computed `position: sticky`. Assert `as of \d{4}-\d{2}-\d{2}` is in the strip.

### AC-15 — The filtered chip and the in-frame status agree
- **Behaviour:** One number for "what is shown" appears in the strip and in the frame.
- **Check:** `/#/energy?dom=coal`. Read `filtered {a} → {b}` from the strip (`span` containing `filtered`); read status line 1 `{v} of {d} claims` from the canvas status. Assert `a === d === FIX.D` and `b === v`, and `b` equals the numerator of `[data-strip-fact="1"]`.

### AC-16 — Sweep chips carry counts and dated spans that add up
- **Behaviour:** Each researched chip shows its claim count and span; the counts partition the drawable set.
- **Check:** `/#/energy`. For each enabled chip: text contains a mono integer and either `/\d{4}–\d{2,4}/` or `no dated claims`. Let `S` = sum of enabled chip integers, `U` = the integer in any `#missing` gap matching `/claim sweep not recorded for (\d+) claims/` (0 if absent). Assert `S + U === FIX.D`.

### AC-17 — Live effects update and match the strip
- **Behaviour:** Every filter shows `{from} → {to} claims` beside it, and `to` is what the canvas shows.
- **Check:** `/#/energy`. Click the `coal` chip. Assert the strip-row `[data-effect]` reads `/^\d+ → \d+ claims$/` with `from === FIX.D` and `to` equal to `[data-strip-fact="1"]`'s numerator. Choose the `FIX.key` radio in the rail: assert the rail `[data-effect]` updates likewise.

### AC-18 — Every evidence section prints its own denominator
- **Behaviour:** No section renders a pattern without its `n of N`.
- **Check:** `/#/energy`. Assert one `[data-denominator]` in each section with computed `font-family` containing `mono`, matching: `#offices` → `/\d+ institutions with a recorded office-holder · \d+ of \d+ dated decisions fall inside a recorded tenure · \d+ fall between tenures · \d+ undated, not placed/`; `#benefit` → `/\d+ of \d+ visible claims name a beneficiary · \d+ documented amount · \d+ estimated · \d+ unknown · \d+ distinct beneficiaries \(\d+ not nodes in this graph\)/`; `#benchmark` → one line per index key `/{key}: \d+ of \d+ with ≥ 1 direct claim · \d+ via group only · \d+ none · \d+ not in platform dataset/`; `#contested` → `/\d+ of \d+ alleged claims carry a recorded response · \d+ responses to documented or reported claims/` and `/\d+ narratives · established \d+ · well-supported \d+ · contested \d+ · speculative \d+ · unsupported \d+ · debunked \d+/`; `#baserates` → `/\d+ base rates across \d+ sweeps · symmetry check recorded for \d+ of \d+ sweeps/`; `#missing` → `/\d+ gaps \(\d+ recorded by research, \d+ found by the build\) · \d+ killed in audit · \d+ held out · \d+ orphans · \d+ superseded · \d+ sweeps not yet researched/`. If `FIX.absent` is non-empty, every one of them ends `· {k} of 12 sweeps`.

### AC-19 — A base rate is always numerator of denominator
- **Behaviour:** No rate row lacks its denominator or its definition.
- **Check:** `/#/energy`. For every `#baserates table tbody tr`: the second cell matches `/^\d+ of \d+$/` or the row contains `not a rate (denominator ` and has **no** bar element (`svg rect`, or a `div` with a percentage width). The "what the denominator is" cell is non-empty.

### AC-20 — A path is never shown without its count and median
- **Behaviour:** A shortest path is one of many and is judged against the view's median.
- **Check:** `/#/energy?path={FIX.a},{FIX.b}`. Assert the `aside` contains `/\d+ hops · one of \d+ equally short paths/` and `/median separation in this view: \d+ hops \(from \d+ evenly spaced entities\)/`. Assert a `Distribution` `svg[role=img]` renders under the shape legend with a caption matching `/\d+ entities in this view cannot be reached from /`. Assert the histogram's `DataTable` twin has rows `hops · entities · share`.

### AC-21 — The benefit ledger sums nothing and draws nothing
- **Behaviour:** The page adds nothing up and draws nothing: no aggregate row, no computed total, no chart of amounts. Words inside the record itself — a company named "Adani Total Gas", a quoted source "MEIL Rs 966 cr total" — are data, not the page summing.
- **Check:** `/#/energy`. In `#benefit`: **no chart** — no `svg` other than tier-dash samples ≤ 20px wide, no `canvas`, no element with an inline percentage `width`. **No aggregate row** — no `tfoot`; every ledger `tbody tr` holds exactly one button whose accessible name starts `Open claim `; the number of ledger rows equals the drawable claims that carry a benefit record (`ENERGY_BENEFITS`). **No computed total, in the page's own words** — take the section's text and remove every verbatim data string (each string field of the generated module, and the platform's node labels, ≥ 6 characters); the remainder has no match for `/\btotal\b|\bsum\b|\bcombined\b/i`, contains at least one `₹` figure, and every `₹` figure in it equals one benefit record's `amountCr` (en-IN). Every amount cell matches `/^₹[\d,.]+ cr$|^≈ ₹[\d,.]+ cr \(estimate\)$|^amount unknown$/` and none is `₹0 cr` or empty.

### AC-22 — The source ledger counts its primaries
- **Behaviour:** The foot states how many sources and how many are primary.
- **Check:** `/#/energy`. Assert text matching `/^\d+ sources · \d+ primary$/` near the source ledger, and that the primary figure ≤ the sources figure.

---

## 4. No-data is never zero

### AC-23 — An unresearched sweep is hatched, disabled and named, never 0
- **Behaviour:** A sweep with no file cannot be selected and does not read as "0 claims".
- **Check:** `/#/energy`. For each slug in `FIX.absent`: its chip is `disabled`, has `[data-nodata]`, contains `— not yet researched`, and contains no standalone digit. If `FIX.absent` is non-empty, the strip caption contains `/\d+ of 12 sweeps researched; not yet: /` and a note above the canvas matches `/\d+ of 12 planned sweeps are researched: /`. No absent chip appears in `aria-pressed="true"` state after any click.

### AC-24 — Unknown amounts read "unknown", not ₹0
- **Behaviour:** A benefit with no figure is labelled as unknown.
- **Check:** `/#/energy?claim={FIX.noAmount}`. Assert the `aside` contains `no amount recorded` and does not contain `₹0`. In `#twin` (`?table=1`), the row `[data-claim="{FIX.noAmount}"]` amount cell is `—` with `title="no amount recorded"`.

### AC-25 — The benchmark distinguishes zero from unjoinable
- **Behaviour:** A constituent with no claim prints 0; a constituent not in the dataset is hatched and says why.
- **Check:** `/#/energy`. In `#benchmark`: every row with a `co:` id and no tier chip prints `0` in the direct-claims cell; every row with a null id has `[data-nodata]` in its claims cells and text `not in platform dataset — cannot be joined`. Assert rows are in ascending code-unit order by symbol.

### AC-26 — Empty audit tables and absent symmetry checks say what their emptiness means
- **Behaviour:** An empty table stays, and a missing sweep is hatched rather than counted.
- **Check:** `/#/energy`. In `#missing`, the Killed in audit table exists; if it has no rows, it contains `No claim was killed. Either the audit found nothing or it has not run` and `ENERGY_META.audit is `. In `#baserates`, for each slug in `FIX.absent`, a `[data-nodata]` block labelled `Not yet researched` exists and no `Callout` for that sweep prints a count.

### AC-27 — Filters that leave nothing say so and keep the voids
- **Behaviour:** An empty canvas is a message, not a blank, and the margin's absences stay.
- **Check:** `/#/energy?tier=analytic&pred=bond&min=99999`. Assert DOM (not SVG) text over the canvas matches `/^0 of \d+ claims match\./`, a button whose text starts `clear ` naming the single most-removing filter, and a `reset graph filters` button. Assert the `aside` still shows `/\d+ documented voids/`. Assert `[role=status]` text contains `0 of`.

### AC-28 — A void count of zero says "not written down"
- **Behaviour:** The void list never reads an empty scope as clean.
- **Check:** For each sweep slug in `FIX.sweeps`, load `/#/energy?dom={slug}`. The `aside` either contains `/\d+ documented voids — absences that were looked for/` with ≥ 1 entry, or contains `That means none was written down, not that none exists.` Never neither.

### AC-29 — Undeclared coverage prints its "not declared" form
- **Behaviour:** Until the contract carries coverage, every coverage line says so.
- **Check:** `/#/energy?from=2010-01-01&to=2012-12-31`. Assert `[data-strip-fact="10"]` and the canvas status line each contain either `no sweep declares its search years` or `/\d+ of \d+ researched sweeps declare search years/`. Assert the `states` chip contains `/states searched: (not declared|.+)/`.

---

## 5. Denials beside claims

### AC-30 — The claim card gives the response equal space
- **Behaviour:** "Who gained" and "The response" are two equal columns at the same type size and weight.
- **Check:** `/#/energy?claim={FIX.answered}`. In the `aside`, find headings `Who gained` and `The response`. Assert their columns have `getBoundingClientRect().width` within 2px of each other, identical computed `font-size` and `font-weight` on their first paragraph, and the response column has a left border of `2px` in the rose colour. At `M`: both columns are stacked (response `top` > claim `bottom`), equal widths within 2px, same `font-size`.

### AC-31 — A recorded response is shown in full
- **Behaviour:** Each responder, their words, tier and source appear beside the claim.
- **Check:** `/#/energy?claim={FIX.answered}`. In the response column: ≥ 1 responder label, the contra `d` text, a `TierChip` (a `span` whose text is one of `Documented Reported Alleged Analytic`), and a `Cite` with ≥ 1 `a[href^="http"]`. Assert the edge `[data-claim="{FIX.answered}"]` has a sibling `[data-response-tick]`.

### AC-32 — No response is stated as loudly as a response
- **Behaviour:** The empty response column says the register does not record whether the party was asked, at claim size and colour, for every tier.
- **Check:** `/#/energy?claim={FIX.silentDoc}`. The response column text is `No response recorded. The register does not record whether {s label} or {t label} was asked.`; its computed `color` and `font-size` equal the claim column's. For `?claim={FIX.alleged}`, if the response column is empty it also contains `Under this platform's rules this claim should not have shipped.` in amber; otherwise a response is present (AC-31).

### AC-33 — Edges and nodes name their responses in text
- **Behaviour:** A screen reader hears the response count on every edge and node.
- **Check:** `/#/energy`. For every `[data-claim]` in the canvas, `aria-label` or `title` matches `/· (\d+ responses recorded|no response recorded( — listed in Gaps)?)$/`. For every node `g[role=button]`, `aria-label` matches `/, .* · \d+ claims · \d+ responses recorded · /`. Assert `[data-response-tick]` elements have `aria-hidden="true"`.

### AC-34 — Contested lists every allegation with its answer
- **Behaviour:** Each alleged visible claim has a two-position block with the response, or a stated absence at equal size.
- **Check:** `/#/energy`. Let `A` = the `of` figure of `[data-strip-fact="3"]`. In `#contested`, count blocks whose question line ends `Alleged`; assert ≥ `A`. Each has a position beginning `The claim — ` and one beginning `The response — ` or `No response recorded`; in the latter case the text contains `The register does not record whether`. Each has an `open in graph` button; clicking it sets `claim=` in the URL.

### AC-35 — Tier and relation filters never hide the answer to a visible claim
- **Behaviour:** Filtering to `documented` keeps responses to documented claims.
- **Check:** `/#/energy?tier=documented&claim={FIX.answered}` (only if `FIX.answered` is documented; else choose the tier of `FIX.answered`). Assert the `aside` response column lists ≥ 1 responder and `[data-claim="{FIX.answered}"] ~ [data-response-tick]` exists. Assert the rail's tier control shows the note `responses to visible claims are never hidden`.

### AC-36 — Strip and Contested agree on answered allegations
- **Behaviour:** The `answered of alleged` figure is one number.
- **Check:** `/#/energy`. `[data-strip-fact="3"]` numerator and denominator equal the two leading integers of `#contested [data-denominator]`.

---

## 6. URL round-trip of every filter

### AC-37 — Page-owned parameters set their controls on load
- **Behaviour:** A link restores the exact view.
- **Check:** `/#/energy?dom=coal,money&idx={FIX.key}&via=group&bsort=amount&nar=contested&isec=energy&ixf={FIX.key}&sup=1&table=1`. Assert: chips `coal` and `money` have `aria-pressed="true"` and all others `false`; the rail radio for `FIX.key` is `checked`; the `include via group` checkbox is `checked`; the ledger sort control's active option is `amount`; the narrative chip `contested` is pressed; the `energy sectors only` control is checked; the membership filter shows `FIX.key`; the twin checkbox `include superseded` is checked; `#twin` exists.

### AC-38 — Controls write their parameters without a new history entry
- **Behaviour:** Every control writes the URL with `replace`, so Back leaves the page.
- **Check:** `/#/energy`. Record `history.length`. Click chip `coal` → hash has `dom=coal`. Click ledger sort `amount` → `bsort=amount`. Click `include superseded` → `sup=1`. Click `Show table` → `table=1`. Click `energy sectors only` → `isec=energy`. Click narrative chip `speculative` → `nar=speculative`. Choose radio `FIX.key` → `idx={FIX.key}`. Assert `history.length` unchanged throughout.

### AC-39 — Graph parameters round-trip through the rail
- **Behaviour:** `q tier fam pred ty min from to sel focus hops path claim` load into controls and are written by them.
- **Check:** (a) `/#/energy?q=coal&tier=documented,reported&min=100&from=2015-01-01&to=2020-12-31&sel={FIX.company}&focus={FIX.company}&hops=2&claim={FIX.claim}`: `#gq` value is `coal`; only the two tier checkboxes are checked; `#amt` value is `100`; both date inputs hold the dates; the node `[data-id="{FIX.company}"]` has `aria-pressed="true"`; the `2 hops` focus button is active; the `aside` shows `claim {FIX.claim}`. (b) From bare `/#/energy`: type `coal` into `#gq` → `q=coal`; untick `Alleged` → `tier=` excludes `alleged`; click a `ty` legend button → `ty=`; press Enter on a focused node → `sel=`; click a `[data-claim]` edge → `claim=`; use the NodeCard `path to…` combobox → `path=`.

### AC-40 — A reload reproduces the view exactly
- **Behaviour:** The same URL gives the same numbers.
- **Check:** For each of `/#/energy`, `?dom=coal&tier=alleged`, `?idx={FIX.key}&via=group`, `?claim={FIX.claim}`, `?path={FIX.a},{FIX.b}&table=1`: record `[data-strip-fact="1"]` text, the twin caption's row count (if `table=1`), and the `aside` heading text; `page.reload()`; assert all three identical.

### AC-41 — Unknown list values are dropped, not honoured
- **Behaviour:** A bogus value in a list parameter is ignored and the canonical set shows.
- **Check:** `/#/energy?tier=documented,bogus&pred=award,nonsense`. Assert only `Documented` is checked among tier checkboxes and only `award` among predicate checkboxes; assert the hash no longer contains `bogus` or `nonsense` after load; zero console errors.

### AC-42 — A stale or killed id is named in an announced amber line
- **Behaviour:** An unknown id produces a `role=status` sentence and the rest of the URL still applies.
- **Check:** `/#/energy?claim=__missing__&dom=coal`. Assert `[role=status]` above the canvas contains `The linked item \`__missing__\` is not in this version of the register (as of ` and that chip `coal` is pressed. If `FIX.killed` exists: `?claim={FIX.killed}` → `[role=status]` contains `Claim \`{FIX.killed}\` was killed in audit:` and `It is listed under Killed in audit.`

### AC-43 — Reset clears only the graph's own keys
- **Behaviour:** Reset does not wipe page-level filters.
- **Check:** `/#/energy?dom=coal&bsort=amount&tier=alleged&sel={FIX.company}`. Click the rail `reset` button. Assert the hash has no `tier` and no `sel`, and still has `dom=coal` and `bsort=amount`.

### AC-44 — Nothing is selected or filtered by default
- **Behaviour:** The bare route names no sweep, index, company or sort.
- **Check:** `/#/energy`. After load, the hash's search part is empty. No chip has `aria-pressed="true"`; no node has `aria-pressed="true"`; the index radio `none` is checked; the ledger sort shows `name`; the first ledger group's label is ≤ the second's in code-unit order.

---

## 7. Table twin

### AC-45 — The twin's row count equals the drawn graphic
- **Behaviour:** The table lists exactly what the canvas draws.
- **Check:** `/#/energy?table=1`. Let `E` = count of `[data-claim]` edges in the canvas plus the integer in any batch `svg[role=img][aria-label*="further relationships drawn in batches"]` label (0 if absent). Read `n` from the twin footer `/rows \d+–\d+ of (\d+)/`. Assert `n === E` and `n === ` the numerator of `[data-strip-fact="1"]`. Repeat with `?table=1&dom=coal&tier=documented` and `?table=1&focus={FIX.company}&hops=1`.

### AC-46 — Superseded and orphan rows are marked and counted
- **Behaviour:** `sup=1` adds the superseded records, and orphans always close the table.
- **Check:** `/#/energy?table=1` → read `n0`. `/#/energy?table=1&sup=1` → `n1 === n0 + FIX.superseded`; every added row contains `superseded by `. If `#missing` reports orphans > 0, the last rows of the last page contain `not in platform — not drawn`. The twin `[data-effect]` reads `/^\d+ → \d+ rows$/`.

### AC-47 — Nineteen columns, nothing truncated
- **Behaviour:** Every row can be checked against its source without a click.
- **Check:** `/#/energy?table=1`. Assert `#twin thead th` count is 19 with headers in spec §5.7 order (claim id, sweep, file asOf, s → pred → t, lab, d, tier, ₹, from – to, beneficiary, how, benefit ₹, confidence, innocent reading, upgradeIf, killIf, responses, superseded by, sources). Assert no cell has computed `text-overflow: ellipsis`, no text `show more` or `…and \d+ more`, and every non-empty sources cell contains ≥ 1 `a[href^="http"]` whose text is itself a URL.

### AC-48 — Rows open a claim through a real button
- **Behaviour:** The claim id cell is a `<button>` with a spoken name, not a row handler.
- **Check:** `/#/energy?table=1`. For the first 20 rows: the id cell contains a `button` whose accessible name matches `/^Open claim .+, (documented|reported|alleged|analytic), (\d{4}-\d{2}-\d{2}|undated)$/i`; the row text contains `/\d+ responses?/`. Press Enter on the first: hash gains `claim=`; `document.activeElement` is the `aside` heading (AC-53).

### AC-49 — Pagination lives in the URL
- **Behaviour:** Pages of 400 rows are addressable.
- **Check:** `/#/energy?table=1`. If `n > 400`: click `next →` → hash has `tp=2`, footer reads `rows 401–`; `page.goBack()` is not required to work (replace). If `n ≤ 400`: assert no `tp` in the hash and no `next →` control is enabled.

### AC-50 — Download CSV is present, static and complete
- **Behaviour:** The twin can be exported without a network request, with the header block and every page.
- **Check:** `/#/energy?table=1`. Assert a button matching `/^Download CSV — \d+ rows$/` whose figure equals `n`. Register `page.on('request')`; click it with `page.waitForEvent('download')`. Assert no new request was made; the saved file starts with the UTF-8 BOM `﻿`; its first four lines start with `#` and include `run run-` and `as of `; data rows (non-`#` lines beyond the header row) count `=== n` (plus superseded and orphan rows when shown); every cell that begins `=`, `+`, `-`, `@` is prefixed `'`.

### AC-51 — Every twin carries a caption with count and filters in words
- **Behaviour:** No table appears without saying what it counts and under what filters.
- **Check:** `/#/energy?table=1&path={FIX.a},{FIX.b}`. Assert `#twin caption`, the lanes twin `caption` in `#offices`, and the histogram twin `caption` each match `/\d+ rows?/` and contain either `unfiltered` or `filter`. Assert the lanes twin row count equals `#offices svg [data-tenure]` count, and the histogram twin row count equals the number of bins drawn.

---

## 8. Keyboard reachability

### AC-52 — Skip links lead the stage
- **Behaviour:** The first Tab into the stage offers a way past the canvas.
- **Check:** `/#/energy`. `page.focus('#stage')` is not used; instead Tab from the last strip chip. Assert the first focused element inside `#stage` is a link in a group whose text contains `Skip the graph: go to the margin · go to the table · go to filters` and that it is visible while focused. Press Enter on `go to the margin` → `document.activeElement` is the `aside` heading. Press Enter on `go to the table` → hash has `table=1` and focus is inside `#twin`.

### AC-53 — Answers written from outside the canvas move focus to the margin
- **Behaviour:** Ledger rows, constituents, contested blocks and twin rows hand focus to the aside heading.
- **Check:** `/#/energy`. The `aside` heading has `tabindex="-1"` and reads `Margin`. Tab to the first `#benefit` `lab` button and press Enter: the heading now reads the claim's label and `document.activeElement === ` that heading. Repeat via `#benchmark` `open in graph` (heading reads the company) and `#contested` `open in graph`.

### AC-54 — Every actionable control is a focusable element with a visible ring
- **Behaviour:** Nothing on the page is reachable only by mouse.
- **Check:** `/#/energy?path={FIX.a},{FIX.b}&table=1` (the twin, and so its pager, renders only with `table=1`, spec §5.7). For each selector — every `button[aria-pressed]` (sweep chips, shape-legend toggles, narrative chips), rail inputs and buttons, `#benefit button`, `#benchmark button`, `#contested button`, `#offices svg [data-tenure]`, `#offices svg [data-tick]`, the enabled twin pager buttons (a disabled `← previous` on page 1 is not actionable), the `Download CSV` buttons, the narrative chips — assert each is a `button`, `a[href]`, `input`, `select` or has `tabindex="0"`; call `.focus()` and assert `document.activeElement` is it; assert computed `outline-style !== 'none'` or a non-`none` `box-shadow` under `:focus-visible`. Press Enter on one lane tick: hash gains `claim=`.

### AC-55 — Nodes are keyboard operable and keep focus
- **Behaviour:** A node activated by Enter selects itself without stealing focus, and the change is announced.
- **Check:** `/#/energy`. Focus the first `g[role=button][tabindex="0"]` in the canvas; press Enter. Assert hash has `sel=`; `document.activeElement` is still that node; `[role=status]` text contains `Opened ` and ` in the margin`. Assert the node has `aria-describedby` pointing at a visible hover card while focused.

### AC-56 — One status region, before the canvas, that announces filters
- **Behaviour:** A screen reader learns what a filter did.
- **Check:** `/#/energy`. Assert exactly one `[role=status]` or `[aria-live]` region inside `#stage`, and that it precedes the canvas `svg` in `document.compareDocumentPosition`. Click chip `coal`: the region text matches `/\d+ → \d+/`. Assert the region is visually hidden (`clip` or 1px box) while the in-frame status has `aria-hidden="true"`.

### AC-57 — The company box is an ARIA 1.2 combobox
- **Behaviour:** The stock entry point works by keyboard with a live match count.
- **Check:** `/#/energy`. The input has `role="combobox"`, `aria-expanded`, and `aria-controls` naming a `[role=listbox]`. Type the first three characters of `FIX.company`'s symbol: a `[role=status]` reads `/\d+ matching constituents/`; press ArrowDown: `aria-activedescendant` names an `[role=option]`; press Enter: hash has `sel={FIX.company}`, `focus={FIX.company}`, `hops=1`; the `aside` heading is focused and reads the company name.

### AC-58 — The margin stands alone when the canvas is gone
- **Behaviour:** With the SVG hidden, the answer is still on the page in text.
- **Check:** `/#/energy?claim={FIX.claim}`. `page.addStyleTag({ content: '#stage svg{display:none}' })`. Assert the `aside` shows `claim {FIX.claim}`, a ₹ figure or `no amount recorded`, a date or `undated`, an `http` URL as text, and `response` (either `/\d+ responses/` or `No response recorded`). Assert `[role=status]` contains `Lit: claim`.

---

## 9. Mobile at 390 px

### AC-59 — No horizontal page scroll at any width
- **Behaviour:** The page never scrolls sideways.
- **Check:** `M` and `D`, for each of `/#/energy`, `?claim={FIX.claim}`, `?dom=coal&idx={FIX.key}&tier=alleged`, `?path={FIX.a},{FIX.b}&table=1`, `?sel={FIX.company}&focus={FIX.company}&hops=1`, and `dist-empty` `/#/energy`. Assert `document.documentElement.scrollWidth <= window.innerWidth` and `document.body.scrollWidth <= window.innerWidth` after load and again after scrolling to the bottom.

### AC-60 — Below 640 every table stacks and nothing scrolls sideways
- **Behaviour:** Tables become records; the only sideways scroll is the lanes SVG behind its button.
- **Check:** `M`, `/#/energy?table=1`. Assert every `table` inside `main` has computed `display: none` and each is paired with a visible `dl` whose `dt` count per record equals the table's column count. Assert every element inside `main` with `scrollWidth > clientWidth + 1` is the lanes SVG container, and that container is hidden (`aria-expanded="false"` on its button) by default.

### AC-61 — The first phone screen answers "what, how much, as of when, what is missing"
- **Behaviour:** Byline, strip facts and the voids line are above the fold at 390 × 844.
- **Check:** `M`, `/#/energy`. Assert the byline, `[data-strip-fact="1"]`, `[data-strip-fact="3"]`, `[data-strip-fact="6"]` and the line matching `/^What the record does not show: \d+ documented voids$/` each have `getBoundingClientRect().bottom <= 844` without scrolling. Assert `[data-strip-fact="5"]` is not visible at this width. Tap the voids line: the void list is scrolled into view (its `top >= 0` and `< 844`).

### AC-62 — Sweep chips wrap and the caption names what is absent
- **Behaviour:** No strip row scrolls sideways; absent sweeps are in prose.
- **Check:** `M`, `/#/energy`. For each chip row: `scrollWidth <= clientWidth`. Each chip contains only a label and a mono integer (or `not yet researched`). With no chip active, one line under the rows ends `select a sweep for its own breakdown`. If `FIX.absent` is non-empty, the caption contains `/\d+ of 12 sweeps researched; not yet: /`.

### AC-63 — The aside is a non-modal bottom sheet over the canvas
- **Behaviour:** Tapping a claim shows its card on the same screen as the graph.
- **Check:** `M`, `/#/energy?claim={FIX.claim}`. Assert the `aside` has computed `position: fixed`, `getBoundingClientRect().bottom <= 844`, height `<= 0.4 * innerHeight`, and no `aria-modal`. Assert a button with `aria-expanded` (expand/collapse) and a close button exist. Assert the canvas `svg` top `>= ` the strip's bottom and the aside's top `> ` the canvas top (both in view). Tap close: hash has no `claim`; type into search → `q=` persists after close. Scroll so `#stage` leaves the viewport (scroll `main`: the layout scrolls inside it, not the document): the aside's `position` is no longer `fixed`, and stays so for 1.5 s.

### AC-64 — The canvas lets a vertical swipe through at rest
- **Behaviour:** On a coarse pointer the graph does not trap page scroll until the reader chooses to pan.
- **Check:** `M`, `/#/energy`. Assert the canvas element's computed `touch-action` is not `none` (expect `pan-y`) and the in-frame status contains `tap the graph to pan and zoom`. `page.touchscreen.tap` on empty canvas: `touch-action` becomes `none` and a `done` control appears in the status; tap `done`: back to `pan-y`.

### AC-65 — Search sits above the canvas and the rails are closed
- **Behaviour:** Below 640 the search box is outside the rail and the filters and reading key are collapsed.
- **Check:** `M`, `/#/energy`. Assert `#gq` is visible and its `top` < the canvas `svg` top. Assert the rail is a `details` with `open === false`, and a `details` whose `summary` reads `How to read this graph` is closed. At 640–1023 (`768 × 1024`): the rail `details` is open and its summary matches `/^Filters · \d+ active · \d+ → \d+ claims$/`.

### AC-66 — Lanes on a phone: twin first, SVG behind a button
- **Behaviour:** The tenure table is the primary answer at 390; the sideways SVG is opt-in.
- **Check:** `M`, `/#/energy?claim={FIX.claim}`. In `#offices`, the stacked records (`dl`) precede the SVG in DOM order and are visible; a button `Show lanes (scrolls sideways)` has `aria-expanded="false"`; tapping it reveals the `svg` and, while `claim` is set, a caption matching `/axis clipped to \d{4}–\d{4} around the lit claim; the full span is \d{4}–\d{4}/`.

### AC-67 — Every cannot-show block is full size on a phone
- **Behaviour:** The limits are never shrunk or folded on mobile.
- **Check:** `M`, `/#/energy`. For every `[data-cannot-show]`: `isVisible()`, computed `font-size === '14px'`, no `details` ancestor.

---

## 10. Counts

67 criteria: render and scaffold 3 (AC-01–03) · honesty captions 10 (AC-04–13) ·
denominators 9 (AC-14–22) · no-data ≠ zero 7 (AC-23–29) · denials beside claims 7
(AC-30–36) · URL round-trip 8 (AC-37–44) · table twin 7 (AC-45–51) · keyboard 7
(AC-52–58) · mobile 9 (AC-59–67).

Every criterion above is also the RED test for the build step that owns it (spec §14
build order). A criterion that cannot be written as a Playwright assertion against
`dist` does not belong on this list, and none of the spec's deferred amendments (§16) is
promoted to a gate by this document.
