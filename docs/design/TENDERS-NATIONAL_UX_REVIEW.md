# /tenders?section=national spec: synthetic UX review, synthesised [SYNTHETIC]

> **Synthetic research notice [SYNTHETIC].** This review was carried out by AI agents
> instantiated as persona archetypes. No real reader was consulted and no build was
> rendered: the section does not exist yet (there is no `src/data/cppp.ts` and no national
> branch in `src/pages/Tenders.tsx`), so every persona walked the spec text
> (`docs/design/TENDERS_NATIONAL.md`) against the seven files it binds to in
> `research/raw/cppp/`. The findings are hypotheses to validate with real readers, not a
> substitute for testing. Every section below is synthetic.

*Written 2026-09-26. Method: the same synthesis as `WELFARE_UX_REVIEW.md` (task completion,
deal-breakers, consensus, divergence, what worked, priorities, contradictions, verbatims),
applied to five persona reviews supplied by the workflow. Before any amendment was graded,
the synthesiser checked every factual claim in them against the data and the code (§7).
Output: 21 must-level amendments applied in place to the spec, each marked
`[UX review] (Un)`, and 10 should/could amendments listed at the end of the spec under
"Deferred amendments" (D1–D10). Every one of the 83 persona items is either applied,
merged into an applied item, or deferred by id; none is dropped.*

---

## 0. The panel [SYNTHETIC]

| seat | persona | primary task in the walk | amendments returned (must / should / could) |
|---|---|---|---|
| J | Investigative journalist on deadline | one checkable figure and its source in two minutes | 7 / 9 / 3 |
| P | Policy researcher who distrusts any chart without a denominator | find the population and its cuts, then export the tables | 7 / 7 / 2 |
| S | Politically hostile reader who assumes the page is partisan | find the loaded reading the page leaves open | 9 / 7 / 3 |
| A | Screen-reader user (the graphic is invisible; twins and captions are the page) | learn from headings and tables alone that no rate is national, and why | 7 / 7 / 2 |
| M | 390px phone, slow connection, will not scroll sideways | see the verdict and its caveat without sideways scrolling | 5 / 6 / 2 |

Total: 35 must, 36 should and 12 could, 83 in all. Many items overlap, which is why 21 applied
amendments cover 35 persona musts.

### How severity was set in the synthesis [SYNTHETIC]

A persona's own grade is its view from one seat. The synthesis regrades each consolidated
amendment by the rules used for `/welfare`, applied in order:

1. **Deal-breaker.** It stops a persona's primary task outright. → must.
2. **Consensus with a must.** Two or more personas raised the theme, and at least one graded it must. → must.
3. **Broad consensus.** Three or more personas raised the theme, whatever their grades. → must.
4. **Frozen-rule or self-contradiction fix.** One persona found a place where the spec
   breaks a frozen rule or contradicts itself or its data. The frozen rules are: every
   figure carries its as-of date and source; every pattern its denominator; captions state
   what the graphic cannot honestly show; the no-data hatch never means zero; URL search
   params carry every filter; no horizontal page scroll; the dash is the tier. → must,
   however the persona graded it.
5. **WCAG failure.** An amendment that removes an assistive-technology dead end or an
   information-by-appearance-only failure. → must.
6. Everything else keeps its persona grade (should or could) and is deferred.

The rules only promote; none demotes. All 35 persona musts are applied, most merged with one
another. **One persona must was applied in a corrected form:** S's hue-distance colour
gate, because as written it fails the platform's frozen tier palette (§7).

---

## 1. Task completion [SYNTHETIC]

**2 of 5 seats returned an explicit verdict: J and P, both "uncertain".** A returned a
probable outcome in its summary. S and M returned none, and their rows below are the
synthesiser's inference from their walks. None could be observed, because nothing is built.

| seat | returned or inferred outcome | the step that fails |
|---|---|---|
| J | uncertain (returned) | no pooled headline figure, and no citable source name: §3.8 gives digests, not the dataset, licence or scrape date |
| P | uncertain (returned); no, if export is required | no export; four denominators unreconciled; portal year vs AOC year unexplained |
| S | completes the reading, contests the frame (inferred) | no statement on the 2014 slope or the portal gap; "state portal" read as "the states"; the named-buyer table is 24 Union bodies with no response column |
| A | probably completes the core task (returned as probable) | `view=national` silences the register's view switch; focus stays on the link; headings and captions are unspecified; the regex and `₹10¹²` are unreadable when spoken |
| M | probably not within the first screens (inferred) | the caveat sits several screens down, behind 20+ quality rows and 117 spellings; wide twins force horizontal scroll |

## 2. Deal-breakers [SYNTHETIC]

- **P: no export.** "They would not cite a figure they cannot take into a spreadsheet with
  its caveat and denominator attached." The codebase already has `toCsv`, `downloadCsv`
  and `DownloadButton` (`src/components/energy/csv.ts`, `StackTable.tsx`), but the spec
  never invoked them. → **U1**, applied.

No other seat declared a deal-breaker. A's `view` collision (the register below loses its
view) and M's horizontal scroll would stop those readers outright, so rules 1 and 5 treat
them as musts as well.

---

## 3. Consensus themes (raised by two or more personas) [SYNTHETIC]

| # | theme | raised by | synthesis grade | applied as |
|---|---|---|---|---|
| C1 | **Filters named nowhere.** §3.6 "sort by awards; filter by portal" has no params, no defaults and no live denominator; `view` collides with the register's switch. | J (m), P (m), S (m), A (m), M (m) | must | U2 |
| C2 | **No section head.** There is no denominator strip, the verification result is buried at §3.7, and the caveat is a long table caption heard repeatedly or never. | J (m), P (m), M (m), S (s: StatGrid and a route to the rates), A (s: caption; c: DOM order) | must | U3 |
| C3 | **The year axis lies by omission.** 2026 is partial; the state portal's early years and central 2011 are thin; `out-of-range year` and state 2027 (n = 16) have no instruction; §4's n < 30 rule does not fit `byPortalYear`. | J (m), P (m, s), S (m), A (m) | must | U4 |
| C4 | **Portal year and AOC year** differ on 1,374,890 raw rows, and neither table says which it uses. | P (m), S (m, inside the 3.2 caption) | must | U4, U7 |
| C5 | **Verification sample.** "0 match" reads as zero agreement; 40 dead links look like fabricated sources; the links are indistinguishable to AT; `page_gone` reads as "deleted"; there is no "not asked" line. | P (m), J (s), S (s), A (s), M (s) | must | U5 |
| C6 | **Named-buyer table.** It has no n or count columns, no portal comparator, no response column, and an unparsed bucket presented as a body. | S (m), A (m), J (s), P (s) | must | U6 |
| C7 | **Quality table form.** Counts without their base; the dedup range and why one-per-tender-id is wrong; a spoken regex; 117 spellings before the caveat. | A (m), M (m), J (m), P (s), S (c) | must | U7 |
| C8 | **Timing.** The innocent reading sits only beside March; the election-calendar "not computed" sentence is not surfaced; bins are unequal; two different AOC-before-closing counts. | S (m), J (s), A (s), P (s), M (c) | must | U8 |
| C9 | **Four families, four N**, never gathered in one place; the repeat-pair rate sits inside a subset of a subset. | P (m), J (s), A (s: exclusion bases) | must | U9 |
| C10 | **Concentration values and names.** Mis-keyed values read as concentration; the `m/s` soft spot is unrecorded; null HHI renders as 0; names are comma-joined. | S (m: null HHI), A (m: `<ol>`, aria-sort), J (s), P (s), S (s: naming) | must | U10 |
| C11 | **Red-flag cards.** The rate is heard before its family; the innocent reading sits below the fold on a phone; keys are camelCase. | A (m), M (s), J (s) | must | U11 |
| C12 | **Bands and tender types.** The unusable-value band reads as the headline; `Limited` is a method, and its rate is a floor. | S (m), P (s), J (s), S (s) | must | U12 |
| C13 | **Entry link and focus.** "National" contradicts the section's own caveat; focus stays behind; register figures are heard first. | A (m), J (s), S (s) | must | U13 |
| C14 | **Citation.** No dataset name, host, licence or scrape date appears anywhere on the page. | J (m), S (c), P (c) | must | U14 |
| C15 | **Narrow tables and long strings** force the page wider than 390px. | M (m), M (s: SQL), A (s: twins open) | must (rule 4) | U16 |
| C16 | **Portal colour.** Party-adjacent hues; M's proposed dash for the state portal collides with the tier channel. | S (m), M (s) | must | U17 |
| C17 | **Acceptance gates** test honesty but not the reader's path, accessibility, the phone or the refusals. | M (m), J (s), S (s), A (s) | must | U21 |
| C18 | **Terms on first use** (AOC, HHI, Wilson, "marked"). | J (s), A (s) | should | D1 |
| C19 | **Number convention** (Indian grouping, ₹ crore). | M (s), J (c) | should | D2 |
| C20 | **Provenance outputs and README link.** | P (c), A (c), M (c), J (c) | could | D8, D9 |

**Single-seat musts kept as musts** (rules 1, 4 and 5): the payload budget and pending
state (M, U16); the states on the state portal (S, U18); the figure sentence (J, U19); the
structure, captions and header scope (A, U15).

**Single-seat items promoted to must** (rule 4): J's two-date labelling, "scraped" vs
"computed" (as-of → U3); P's "the interval covers sampling only" (what the graphic cannot
show → U4); P's unequal histogram bins (U8); S's no-comparator line, which the
interface-design page contract requires as a gaps panel (U20); A's tier-as-spoken-text and
twins-open items (rule 5 → U15).

---

## 4. Divergent opinions [SYNTHETIC]

| topic | who, and why | resolution in the spec |
|---|---|---|
| **The param name** | A: `view` is the register's switch, so the section needs its own param. S: keep `view=national` for stability. M: add a `national` chip to the existing view row. J, P: assumed `view`. | A is right on the code (`type View = 'ledger' \| 'map' \| 'graph'`, Tenders.tsx line 21). `section=national`, with `view=national` accepted as an alias and rewritten, keeps S's stability and the planned smoke path (**U2**, D6). M's chip would reintroduce the collision; the way back is a `Hide the CPPP section` link. |
| **What goes first** | J: a quotable pooled figure early, because quality-first delays it and hurried readers misquote. S, M: quality-first reads as burying the numbers, so show a route. A: the caveat must precede any `%` in DOM order. D1 (spec): quality first. | Compatible by layering. The head holds counts only (strip, verification line, caveat), then quality, then the figure sentence opening §3.2, before the first chart (**U3**, **U19**). D1 is amended and D5 records the trade-off. J's own D5 proposal, a figure sentence *in the head*, is not taken: it would put a `%` before the caveat. |
| **Where the states table sits** | S: before §3.2, so "state portal" is never read as "the states". J: every table before the rates delays the figure. | It is placed as §3.2a, immediately after the chart and before any state or body is named (§3.5, §3.6). The §3.2 caption carries the one-line coverage sentence and a link (**U18**). |
| **Thin-year threshold** | J: n < 30 is a gap. S: hatch every year with n < 1,000. P: do not plot n < 30 or non-numeric rows. A: never drop a row silently. | Three tiers (**U4**). Not plotted: non-numeric, after the scrape year, or n < 30, each listed with its reason. Thin: below half the portal's median year, drawn hollow with no connecting line. Partial: the scrape year. S's fixed 1,000 is replaced by a relative rule, because the portals differ by an order of magnitude. |
| **Dead links: link or text?** | J: render as text, or visibly "known dead". S: keep them clickable so the reader can see the dead page; hiding them reads as concealment. A, M: unique names that state the result before the tap. | Real links (S), in the no-data style, with the verdict beside them and a unique accessible name stating `returned “Invalid Url” on {date}` (A, M, J's intent). **U5.** |
| **Portal distinction** | S: neutral greys, with portals told apart by dash-with-legend or by marker shape. M: dotted for state. | Marker shape and direct labels, never dash: dash is the frozen tier channel, and a legend that says "this dash is not tier" is the channel overload interface-design forbids. **U17**, D8. |
| **Sort keys** | J, P, S, M proposed sorting §3.6 by HHI or top share, and S proposed opt-in rate sorting of all buyers. | Refused: sorting real bodies by a quantity the platform computes is the ranking interface-design forbids ("Rank by q-value, by declared value, or by count"). The keys are awards, declared value and name. The pipeline's top-25-by-rate table stays as emitted and is flagged for the desk (§9). **U2, U6**, D7. |
| **Card order** | A: definition and family before the rate, so 51% is heard after "of 200,813 pairs". M: rate near the top, family detail collapsed on a phone. | A's DOM order, with the rate line itself carrying `of {familySize}` and the innocent reading adjacent to it at equal weight (M's real concern). Nothing collapses, since the family is the denominator. **U11.** |
| **Payload split** | M: strip `rates.byOrganisation` at generate time because nothing reads it. S, P: show the full `byOrganisation` table (`buyers=all`). | Kept and lazy-loaded (**U16**), because U6 now reads it. |
| **Absent states' reason** | S: print "runs its own e-procurement portal". | Not printed unless sourced (D9); the absence and "coverage, not conduct" are printed. The reason is likely, but it is a factual claim about each state that no file in this repository carries. |
| **The quality lede** | S: a StatGrid of six headline figures. M: one line from `quality.headline`. | The strip carries the population, and `readMeFirst` opens §3.1 (**U3**, **U7**). A StatGrid would put a percentage (`markedWinnerSharePct`) before the caveat. |

---

## 5. What worked [SYNTHETIC]

Items praised or built on by two or more seats:

- **Quality before rates (D1)**: P "would trust the quality-first ordering"; A "what worked:
  quality first"; S accepts it as honest. The dispute is only about the route past it.
- **The caveat verbatim, and `n` and interval on every rate row** (P, A).
- **Names only as emitted (D3), and "pairs counted, never listed"** (P, A, J; nobody asked
  for page-side naming).
- **Innocent readings attached to indicators** (P, S). S's complaint is that one is not
  surfaced, not that they exist.
- **Explicit "not applied", "shown, never dropped", "interval not computed" flags** (A, P).
- **The seed and draw SQL of the verification sample** (P). No seat found any frozen
  semantic channel broken by the spec as written (J explicitly).

---

## 6. Prioritised amendment list [SYNTHETIC]

### 6.1 Must: applied to the spec in place

Order: the deal-breaker first, then consensus by breadth, then single-seat musts by reach.

| id | amendment | from | spec sections edited |
|---|---|---|---|
| U1 | **Export.** `DownloadButton` with `toCsv` on every table: comment lines (caveat, family and N, scraped/computed, generator, digests, active params), a raw value column and a separate status column, `cppp-{table}-{asOf}.csv`. | P, J (deal-breaker) | §3 Export |
| U2 | **URL state.** `section=national` (not `view`), with the `view=national` alias; `portal`, `state`, `sort` (awards/value/buyer), `rows`, `buyers`, each with a default and a live denominator. Add the unrecognised-param note to this page, and `aria-pressed` on the existing View and Scope groups. | all five (C1) | §2, §3.6, §4, §6, §7 D6–D7 |
| U3 | **Section head.** Kicker, `<h2>`, tier chip with reason, a sticky in-section denominator strip (counts only), a verification line, the caveat as a `<p>` referenced by `aria-describedby`, a source line and a jump list; "scraped" vs "computed" labels; a first-viewport budget. | J, P, M, S, A (C2) | §3.0, §3.1, §2, §7 D1, D5 |
| U4 | **Years.** AOC year named everywhere; `portalYearDiffersFromAocYear`; not-plotted, thin and partial rules; §4 reworded; the frozen no-government-marker caption; the sampling-only interval; per-portal composition or its gap; two twins with interval width. | J, P, S, A (C3, C4) | §3.2, §4 |
| U5 | **Verification sample.** Plain reading first; `not checkable` cells, never a numeral or `0%`; finding and redraw verbatim; the not-attempted and not-asked lines; upgrade condition; how to check a row; sample frame; one verdict column; real links with unique names and dead status. | P, J, S, A, M (C5) | §3.7, §4 |
| U6 | **Named buyers.** Not-asked sentence and innocent reading above; note as caption; portal base-rate rows first; count columns; `response: not asked`; unparsed keys shown as such; comma names as emitted; `buyers=all` with a decile summary; no rate sort. | S, A, J, P (C6) | §3.5, §4 |
| U7 | **Quality table.** `readMeFirst`; a key/value table with row headers, the noun counted, base and share; all three dedup readings, the range sentence and the bucket example; year-field row; thresholds in words; long verbatim lists fold, counts never do. | A, M, J, P, S (C7) | §3.1 |
| U8 | **Timing.** Labelled unequal bins; the innocent reading after the ≤ 2-day figure and after the FY table (`aria-describedby`); calendar-month names and portal columns; exclusions with their bases in both places; `role="img"` names with n. | S, J, A, P, M (C8) | §3.4 |
| U9 | **Families used on this page.** One table with each family verbatim, its N, its sections and its reconciling identity; `complement not emitted` where one is missing. | P, J, A (C9) | §3.1a |
| U10 | **Concentration.** Captions verbatim; count columns first, value as reported and unverified; nested `<ol>` for winners; `not computed` for null HHI; the unmarked ≥ 50% note; the `m/s` soft spot; labelled controls with `aria-sort` and a live region; `<wbr>` after `\|\|`. | S, A, J, P (C10) | §3.6, §4, §7 D3 |
| U11 | **Red-flag cards.** `<h4>` human labels; a `<dl>` in the order definition → family (as a share of dedup) → count → rate → innocent reading at equal weight → by portal; floor and field note for Limited. | A, M, J (C11) | §3.5 |
| U12 | **Bands and types.** The unusable-value row as a separate hatched group with its own caption; `Limited` set apart as a method with the note and floor. | S, P, J (C12) | §3.3 |
| U13 | **Entry and focus.** Link text that does not claim "national"; the section placed after the page title; focus moved to the `<h2>`; Byline sentences; a hide link. | A, J, S (C13) | §2, §3.0 |
| U14 | **Source and citation.** A source line in the head and footer and a `Copy citation` button. `provenance.dataset` and `scrapedAt` are proposed as pipeline fields, with gap sentences until they land. | J, S, P (C14) | spec head, §3.0, §3.8, Source line |
| U15 | **Structure.** h2/h3/h4; one-line captions with n, dates and tier; `scope` on every `<th>`; DOM order replaces "above/beside"; twins open; tier as spoken `TierChip`, not a dash on a word. | A (rule 5; C2) | §1, §3, §5 |
| U16 | **Narrow viewports and payload.** Per-table scroll containers with a sticky first column; `<wbr>`; SQL in `<pre>`; lazy per-file imports; a pending state distinct from absence; a 150 KB gzip budget. | M (rules 1, 4), A | §5, §4 |
| U17 | **Neutral marks.** Grey data marks (saturation ≤ 0.10); portals by marker shape and label; hover by stroke weight; no rose; tier colours only in `TierChip`. | S, M (C16) | §3.2, §5, §7 D8 |
| U18 | **States on the state portal.** Emitted prefixes, exact-string alias table, absent states hatched as "coverage, not conduct" with no unsourced reason, spelling variants kept apart, no choropleth; the `state` param. | S | §3.2a, §2, §7 D9 |
| U19 | **Figure sentence.** The pooled single-bidder figure with count, family, interval, portal split, dates and source, before the first `<svg>`, with a copy button. | J | §3.2 |
| U20 | **Gaps panel.** At findings' type size: verification, election calendar, no external comparator, missing composition, state coverage, not asked, pipeline fields absent. | S (rule 4) | §3.9 |
| U21 | **Gates.** 29 added assertions covering order, source, families, years, verification, buyers, verbatim text, marks, accessibility, export, payload and the 390px viewport. | M, J, S, A, P (C17) | §6 |

### 6.2 Should and could: deferred

The full list, D1–D10, is at the end of the spec with source seats. The ones that should be
first in line:

1. **D1** terms on first use, above all "marked", which J predicts a generalist will read as "flagged as suspicious", the opposite of its meaning here;
2. **D2** one number convention, because a wrong-by-a-factor quote is the cheapest misreading to prevent;
3. **D5** the implausible-value marker, once `build.py` can emit a per-buyer ceiling.

---

## 7. Claims checked against the data and code [SYNTHETIC]

The synthesiser verified each load-bearing claim before grading. Where a persona was wrong,
the amendment was corrected, not dropped.

| claim | seat | checked against | result | effect |
|---|---|---|---|---|
| `view` is already the register's View switch | A | `src/pages/Tenders.tsx` lines 21, 47, 223 | **true** | U2 |
| "the page's existing unrecognised-param note" | A | grep of `src/` | **absent from Tenders.tsx** (present in IndustryView and MapExplorer) | U2 adds it |
| state 2027 (n = 16) and `out-of-range year` (n = 175) exist unpooled | A, P | `rates.json.byPortalYear` | **true**; §4's n < 30 rule described `byOrganisation` | U4 |
| portal year ≠ AOC year on 1,374,890 raw rows | P, S | `quality.dates.portalYearDiffersFromAocYear` | **true** | U4, U7 |
| AOC before closing: 16,182 raw vs 10,486 dedup | P, A | `quality.dates`, `timing.excludedAocBeforeClosing` | **true**; both correct on their bases | U8 |
| families reconcile: 3,019,420 + 365,813 and 3,374,747 + 10,486 + 0 = 3,385,233 | P | `rates`, `timing` | **true** | U9 gate |
| dataset name, host, licence in `provenance.json` | J | `provenance.json` | **absent**: README prose only | U14 proposes `provenance.dataset` |
| scrape month June 2026 | J, S | `finding` token grammar; decoded time segment of a row's link, 2026-06-20 | **true, but only as prose** | U3, U4 propose `scrapedAt` |
| "2026 is Jan–Sep" | P | no field | **unsupported**: the token says June; data after that date would be entry errors | the partial label derives from `scrapedAt`, never from a month literal |
| "state portal 2016/17 has 10 rows each" | J | `quality.raw.byPortalYear` (portal year) vs `rates` (AOC year: 12,339 and 778) | two year fields, not a contradiction | U4, U7 (label the year field) |
| Gujarat, Karnataka, Bihar, Chhattisgarh absent; Telangana near-absent | S | state prefixes of `rates.byOrganisation` | **true**; "Telegana" and "Telangana" are separate buckets | U18 (variants kept apart) |
| buyer table is 24 central bodies plus "Telegana / unparsed" | S | `redflags.singleBiddingByBuyer` | **true** (24 central, 1 state) | U6 |
| a buyer name contains a comma | A | `Braithwaite,Burn and Jessop…`, `National Aluminium Company Limited,NALCO` | **true** | §4 extended to buyers |
| null HHI rows | S | `concentration.byBuyer` | **10** buyers with null `hhiMarkedValue`, **10** with null `hhiMarkedCount` | U10 |
| m/s soft spot, 243 of 3,181 | J, S | `scripts/cppp/README.md` | **true, README only** | U10 proposes `msOnlyNamed` |
| "the election-calendar clustering is not computed" | S | `timing.innocentReading` | **true, verbatim** | U8, U20 |
| hue gate: no hue within 20° of #FF9933, #138808, #19AAED | S | `src/index.css` tokens | **fails the frozen palette**: accent 39° and `alleged` 39° are 9° from saffron; `documented` 127° and `reported` 211° are each 12° from the flag green and the sky blue | corrected to saturation ≤ 0.10 on data marks, with `TierChip` exempt (U17, U21) |
| example live counts "central 612 · state 603" | M | `concentration.byBuyer` (426 central, 789 state) | **illustrative, wrong** | the spec derives the counts; no literal |
| "NIC" as the operator not asked | S | `finding` | the finding names no operator | the spec says "the portal's operator" |
| export helpers exist | P | `src/components/energy/csv.ts` | **true** | U1 reuses them; no dependency |

---

## 8. Spec self-contradictions surfaced [SYNTHETIC]

| where | contradiction | fixed by |
|---|---|---|
| §2 "`view` round-trips" | `view` already means ledger/map/graph on this page | U2 |
| §2, §4 "the page's existing unrecognised-param note" | Tenders.tsx has none | U2 |
| §4 "a rate row with n < 30 → pooled row" | `byPortalYear` emits no pooled row; state 2027 (n = 16) would vanish | U4 |
| §3.1 caption = the ~110-word caveat | captions are re-read on every table entry; the caveat is the one thing to read first | U3 |
| §3.2 "tier dash applies to the caption's tier word" | dash is the tier channel for strokes; a word cannot carry it for AT or in text | U15 |
| §3.2 "the accent for the hovered series" | the accent (39°) is a saffron-adjacent hue on a rate mark | U17 |
| §3.6 "sort by awards; filter by portal" | the frozen rule: every filter in the URL, with its effect on the denominator | U2 |
| §1 "the page says so before any rate" | nothing in §3 fixed DOM order; "above the fold" has no meaning for AT | U3, U15 |
| §3.7 "link to `detail_url`" beside a caption that says every link is dead | the link says nothing of its result | U5 |
| interface-design page contract (strip, gaps panel) | the spec had neither | U3, U20 |

---

## 9. Open for the desk, not settled by this panel [SYNTHETIC]

- **The pipeline's top-25-by-rate buyer table** is itself a ranking of real bodies by a
  computed rate. The spec keeps it as emitted, adds the comparator, the response column and
  the full-table toggle, and offers no page-side rate sort (D7). Whether the ranked table
  should ship at all is an editorial call for the investigative desk.
- **The five pipeline fields** (spec head) belong to `scripts/cppp/build.py`. Until they
  land, the page prints gap sentences. That is honest, but it is visibly unfinished.

## 10. Verbatims [SYNTHETIC]

Excerpts from each seat's own summary; no seat returned a separate in-voice line.

- **J:** "I can see this dataset is full of holes before I can see a single number I could quote, and when I reach the number I cannot find who to cite for it."
- **P:** "A denominator-minded reader treats unreconciled counts as a reason to distrust the whole section."
- **S:** "The reader lands on the link 'National (CPPP scrape) →' and immediately reads 'national' as a claim the page then spends §3.1 denying; the contradiction is read as spin."
- **A:** "For this reader the headings list and the tables list ARE the page."
- **M:** "The one sentence the reader is meant to see first — no figure here is a national statistic — is several screens down."

## 11. What to validate with real readers [SYNTHETIC]

In order of how much depends on it:

1. **A journalist, timed from arrival to a pasted citation** of the pooled single-bidder figure. Target: under two minutes. (U3, U14, U19)
2. **Two readers from opposite sides, cold, on the §3.2 chart and the named-buyer table.** Do they read the 2014 slope or the portal gap as a party's doing despite the caption? Do they read "state portal" as "the states"? (U4, U6, U17, U18)
3. **Screen-reader walk** (NVDA with Firefox, VoiceOver with Safari): from the head link, can a user state the caveat, the denominator and the verification result before hearing a percentage? (U3, U13, U15)
4. **Phone walk at 360–414px, throttled:** is the caveat on the first screen, and is there no horizontal page scroll? (U3, U16)
5. **A researcher opening the CSVs** to re-derive the families identities. (U1, U9)
