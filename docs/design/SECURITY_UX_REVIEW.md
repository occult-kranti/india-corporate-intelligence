# /security spec: synthetic UX review, synthesised `[SYNTHETIC]`

> **Synthetic research notice `[SYNTHETIC]`.** This review was carried out by AI agents,
> each playing one persona archetype. No real reader was consulted and no page was
> rendered: `src/pages/Security.tsx` is still the 52-line scaffold and
> `src/components/security/` does not exist, so every persona walked the spec text
> (`docs/design/SECURITY_PAGE.md`) against the generated force module and the shared
> components it binds to. Its findings are hypotheses to validate with real readers, not a
> substitute for that testing. Every heading, finding and recommendation below carries the
> `[SYNTHETIC]` label, and the label must not be dropped when any of it is quoted.

*Written 2026-10-04. Method: the synthesis used for `/energy`, `/welfare` and `/finance`
(task completion, deal-breakers, consensus, divergence, what worked, priorities, verbatims),
applied to five persona reviews supplied by the workflow. Output: 33 must-level amendments,
U1–U33, applied in place to the spec, each marked `[UX review] (Un)`; 46 should- and
could-level amendments, UD1–UD46, listed at the end of the spec under "Deferred amendments";
one new decision, D61. Every one of the 95 persona items is applied, merged into an applied
item, or deferred by id (Appendix A). None is dropped. Deferred ids are `UD` because the
spec's §15 already uses D1–D61.*

---

## 0. The panel `[SYNTHETIC]`

| seat | persona | primary task in the walk | returned (must / should / could) |
|---|---|---|---|
| J | Investigative journalist on deadline | one checkable figure and its source within two minutes | 4 / 8 / 2 |
| P | Policy researcher who distrusts any chart without a denominator and exports the table | verify each denominator, then export rows that reproduce the graphic | 5 / 9 / 4 |
| S | Politically hostile reader, either side | find the missing control, the missing denial, the loaded colour | 3 / 7 / 3 |
| A | Screen-reader user (the graphics are invisible; captions, names and twins are the page) | answer each lens's questions from headings, tables and text alone | 4 / 11 / 7 |
| M | 390 px phone on a slow connection, will not scroll sideways | reach a figure, a state and the Find box on a phone | 11 / 12 / 5 |

Total: 27 must, 47 should, 21 could, 95 in all. M's summary says "11 must, 13 should, 5
could", but the list M returned holds 12 should-level items; this synthesis uses the returned
items.

### How severity was set `[SYNTHETIC]`

A persona's grade is its view from one seat. The synthesis regrades each consolidated
amendment by the house rules used for `/welfare` and `/finance`, in order:

1. **Deal-breaker.** The amendment removes something that stops a persona's primary task
   outright. → must.
2. **Consensus with a must.** Two or more seats raised the theme, and at least one graded it
   must. → must.
3. **Broad consensus.** Three or more seats raised the theme, whatever their grades. → must.
4. **Frozen-rule fix or self-contradiction.** The spec breaks one of its own frozen rules
   (§8.2; "every figure carries its as-of date and source"; "every pattern its denominator";
   "no-data hatch never means zero"; "a WCAG table twin for every graphic"), contradicts
   itself, or leaves the builder a choice when §15 promises there is none. → must, however the
   seat graded it.
5. **WCAG failure.** An amendment that removes an assistive-technology dead end, or structure
   conveyed only visually (WCAG 1.3.1). → must.
6. Everything else keeps its seat's grade and is deferred.

The rules only promote. Every one of the 27 persona musts is applied, several merged with
others. The promotions are listed in §3.

---

## 1. Task completion `[SYNTHETIC]`

| seat | outcome | returned or inferred | the step that fails |
|---|---|---|---|
| J | B-J1 reaches a figure but not a deliverable; B-J2 completes with an undefined citation; B-J3 completes; P-J completes with a likely misreading | returned | the `CellCard` citation has no defined format; the `FYReadout` has no copy action; the RBI ₹ crore figure will not match the ₹ lakh source; Adani's card reads `none named` with nowhere to show PLR Systems |
| P | **uncertain**: the paths complete, the exports do not reproduce the graphics | returned | the stack twin cannot hold four bands in one row; finance's `tsv()` writes finance's run ids; the StateTable export drops the derived flag and the note; `tier=documented` hatches rows that exist |
| S | **completes B-S and P-S, and stops trusting at three points** | returned | a base-rate card would print `1727 of 1458` (118 %) with a whisker, a page-computed comparison of two party groups; the Sukna–Pegasus pair header reads "UPA beside NDA"; analytic text that names parties is quoted without its innocent reading |
| A | first 30 seconds good (the resolution statement, the city ledger, paired `<dl>`s); Q1 then goes silent | returned | Q1's figure is only on an `aria-hidden` band label; each lens switch closes every twin; selection is a border with no state; interactive marks sit inside `aria-hidden` drawings |
| M | **stuck before the first paint, then lost in length** | returned | a 2.3 MB gzipped entry chunk; the head is ~1,100 px against an 844 px gate; 11 px columns are the only route to a year; open twins, groups and ~40 cards put Q7 tens of thousands of pixels down |

## 2. Deal-breakers `[SYNTHETIC]`

- **M: nothing paints on a slow connection.** The entry chunk is 9.8 MB raw and 2.3 MB
  gzipped today, and the three series are already in it through `DataContext`. → **U1**.
- **M: the 390 fold gate is red by construction.** SG-33 asks for the strip within 844 px
  under a head of about 1,100 px that D1 forbids shortening. → **U2**.
- **J, functionally:** the pasteable citation, which is J's deliverable, is undefined for a
  budget row. → **U12**, **U14**.
- **A, functionally:** the block's own question (Q1) cannot be answered from the table. →
  **U10**, **U11**.

No other seat declared a deal-breaker. S's base-rate card (U19) is the item S expects to be
screenshotted; it is applied as a must on S's own grade.

---

## 3. Consensus themes (raised by two or more seats) `[SYNTHETIC]`

| # | theme | raised by (seat grade) | synthesis grade | applied as |
|---|---|---|---|---|
| C1 | **The pension share is printed on two bases.** The band label is a share of the page's stack; the readout's `crContext` is a share of the published total; in the five FYs where the two differ (F7) a reader sees two percentages for one figure. Strip fact 2 has no basis word and no branch for a latest FY with no published total. | P (must), A (must: the answer sentence), J (should ×2), S (could: C2) | must | U9 |
| C2 | **Q1's headline is not in text.** The pension ₹ and share exist on an `aria-hidden` band label and in axis-button names; at 390 strip fact 2 moves below the chart. | A (must), M (should) | must | U10 |
| C3 | **The stack twin cannot reproduce the stack.** "One row per (FY, panel)" with per-band columns; SG-21 pins that grain; reconciliation glyphs in cells; open by default at 390. | P (must), A (should), M (must) | must | U11, U6 |
| C4 | **Adani's card has nowhere to show what Adani owns.** Field 3 reads `own` edges into the vendor; field 4 prints `none named`; the PLR Systems contract is on another card. Read as a whitewash from one side and a hidden link from the other. | J (must), S (should) | must | U15 |
| C5 | **What leaves the page does not carry its provenance.** The row citation is undefined; the as-of date is not on the element; finance's `tsv()` writes finance's run ids; the StateTable export drops the note. | J (must ×2, should), P (must ×2) | must | U12, U16, U17 |
| C6 | **Find does not meet the reader where they arrive.** Its position at 390 is unspecified; the commissionerate verb promises a budget line that does not exist; J's natural queries carry a year. | M (must), A (should), J (should ×3) | must for placement and the verb | U4, U29; UD3–UD5 |
| C7 | **A drawing is the only route to an action.** Award marks are buttons, the Agnipath tick a link and DelhiLine points buttons inside `aria-hidden` drawings; the stack's 11 px columns are the only way to choose a year on a phone. | A (must), M (must) | must | U25, U5 |
| C8 | **Base-rate cards render figures the page should not compute.** Two party-group medians would print as a share with a whisker; the Q4 twin loses the FY and kind in `property`. | S (must), P (should) | must for the rendering | U19; UD14 |
| C9 | **The dot strip, "the comparison instrument", has no text and does not fit a phone.** | A (should), M (should) | must (rule 5: a graphic with no twin) | U30; UD38 |
| C10 | **Units and bases of state figures do not travel.** RBI's ₹ lakh source against the page's ₹ crore; the per-lakh population base; GSDP's price basis; the map's metric below the map. | J (must), P (should ×2), M (should) | must for the unit | U13; UD13, UD18, UD37 |
| C11 | **Response structure and wording.** Replies nested by indentation only; audit-added denials read as the platform's own. | A (should), S (should) | must for structure (rule 5) | U27; UD20 |
| C12 | **The readout shows one stage, so BE passes for spend.** §1.2 names this as the thing J distrusts. | J (should), S (should) | should (two seats, no must) | UD1, first in line |
| C13 | **Copy and citation at the point of reading.** | J (must), M (could) | must | U12, U14; UD46 |

**Single-seat musts kept as musts:** U1–U8 (M); U18 (P); U20, U21 (S); U23, U24 (A).

**Items promoted by rule 4 (frozen rule or self-contradiction):**
- the row-level as-of date (J should → U12: the frozen rule "every figure carries its as-of
  date and source" is met on the page, not on the figure);
- `m=cr`'s `{share}% of the {k} drawn states' sum` (P should → U33: D4 rejects "a share of a
  page-computed total", and §8.2.3 lists the only sums the page computes; the states' sum is not
  one of them);
- C18's "each government's case" and the hand-written partisan list (S should → U22: §9
  forbids a partisan frame in the page's own words, and the gate could not catch C18's phrase);
- the commissionerate verb `Show its budget line` (A should → U29: §3.4 says `body` takes only
  `LANES` bodies, and no commissionerate has a lane);
- the vendor-card widget "one tab stop, inner buttons by Enter" (A should → U28: unspecified, so
  the builder would choose);
- two `h3`s per graphic block (A should → U26: §5 says every figure has a visible `h3`, and the
  answer-block contract gives the block an `h3`);
- ledger cell names that voice ₹ without a denominator (A could → U32: §13 specifies the names,
  SG-9 forbids them);
- footprint kind chips becoming one `<select>` (M should, merged into U8: `kind` is a list).

**Items promoted by rule 5 (WCAG):** reply nesting (A should → U27); the dot strip without a
twin (A should → U30); the slice twin without Form A's share (A should → U31).

**Items merged into an applied amendment:** J5, J6, S13 into U9; M12 into U10; A5 into U11;
S8 into U15; M23 into U5; M24 into U3; M18, M20 and the `KindMatrix` half of M19 into U8; M22
into U6.

---

## 4. Divergent opinions `[SYNTHETIC]`

| topic | who, and why | resolution in the spec |
|---|---|---|
| **Twins open or closed at 390** | A names "open-by-default twins below 640 px" among what works for a screen-reader user. M: open twins, open body groups and ~40 always-open cards put Q7 tens of thousands of pixels down. | M's closed default applied (U6), with A's access kept three ways: `view` survives a lens switch (U23), the "show them all" link after the tabs, and Q1's answer sentence (U10). Test with real screen-reader users on a phone (§9). |
| **Where Find sits** | J: in the sticky wrapper at every width, with a `/` shortcut. M: at 390 first under the tabs and never pinned, because the pinned stack is already 140 px. | M at 390 (U4). J's sticky Find at ≥ 640 is deferred (UD3): it changes the 1280 pinned height, which must be re-measured first. |
| **The basis of the pension share** | P and J: of the published total where one exists, else of the stack, labelled. A's draft sentence and S's C2 sentence both say "of the stack". | P and J's rule applied everywhere (U9); A's sentence and S's sentence rewritten to it. |
| **The published total in the stack twin** | A: on the pensions row only, `see pensions row` elsewhere. P: its own `published total` row per (FY, panel). | P's (U11): no cell is a pointer to another row, and a machine reader filters by `kind`. A's reconciliation words and banned glyphs are applied. |
| **Rows hidden by a filter** | P keeps the hatch texture and changes only the words. | Adapted (§6): the hidden element is dimmed as `fy` already dims, never hatched, so hatch keeps its one meaning (U18). |
| **Adani's holdings** | J: field 3b `Recorded holdings` beside the owner field. S: field 4b `Named awards to recorded owned bodies`. | One field, J's position, S's wording `listed, not added to this vendor` (U15). The card grows from twelve fields to thirteen on every card. |
| **The 390 fold** | M offers (a) move the standfirst's later sentences and the standing line below the first figure, or (b) re-budget SG-33 from a measured prototype. | (b) (U2). The standing line is the page's non-partisan pledge, which S relies on; D1 keeps the resolution statement whole. The gate becomes a measured ceiling, not an aspiration. |
| **The vendor-card keyboard model** | A offers a named composite widget (`role="group"`, Enter in, Escape out) or natural tab order with a stated keyboard cost. | Natural tab order, a skip link over the grid, and the chapter contents links for the budget (U28). A composite widget is a second interaction model for one card. |
| **All stages in the readout** | J and S both ask; S adds `actual was {k}% of BE, computed here`. | Deferred together (UD1). S's ratio is a new page-computed figure and needs an SG-4 allow-list entry before it can be built. |
| **S8 before build** | P: P-Q2 is P's one named question and the file is in the repository. The spec keeps S8 optional. | Deferred (UD10), second in line. |

---

## 5. What worked (named by two or more seats) `[SYNTHETIC]`

- **`crContext` on every ₹, with its denominator and the previous year** (J, P).
- **The exact city sentence**, which stops the Mumbai misquote and reads as text (J, A).
- **Missing years visible as missing**: `FY_AXIS` with gaps, three stage slots by position,
  hatch never zero, `₹0 cr — as recorded` distinct (P; S found no absent row that reads as zero).
- **Cases as paired records**: Bofors beside Rafale by a date rule with a gate, an answer slot on
  every record, an empty column kept for the unpaired case; paired `<dl>`s with identical `dt`s
  (S, A).
- **No hue carries a party**: party is text, the state family is blue, the map ramp is
  teal-grey, the bands are neutral steps (S; A found the map options carry class in words).
- **The `ResolutionStatement` and `ReconciliationLine` at rest** (P; A reached them first; M's
  complaint is their height, not their content).
- **Derived defaults** for stage, state pair and strength year (P, M).

---

## 6. Where the synthesiser checked or adapted an amendment `[SYNTHETIC]`

Each premise below was checked against the repository on 2026-10-04.

| item | what the seat said | what the repository shows | what was applied |
|---|---|---|---|
| Run | the seats read run-92066c7bcf73 | `src/graph/force.generated.ts` now carries `run-09adb15b87be`; `research/raw/force/*` and `RECONCILIATION.json` have uncommitted changes from the reconciliation in flight | no amendment copies a count; every figure in U1–U33 is a brace or a gate computed from the module (D60) |
| S1 (base rates) | two party-group medians stored as numerator / denominator | confirmed: `numerator: 1727, denominator: 1458, label: "BJP-run median ₹ / opposition-run median ₹; …"` and `numerator: 20.7, denominator: 15.5` (vacancy %) | as proposed (U19), drawn in a security wrapper so finance's `BaseRateLine` is unchanged (D45) |
| S2 (pair header) | the Sukna–Pegasus pair edge's `lab` names two governments | confirmed: `money-people:c093` `lab` "Cases by government at the decision date: UPA beside NDA, same fields"; its `innocentReading` begins "Seven hand-picked cases cannot rank two governments" | as proposed (U20) |
| S6 (rose) | `--color-rose` equals the enforce family hue | confirmed: `#c45b5a` at `src/index.css:23` and `FAMILY_COLOR.enforce` at `src/components/viz/ForceGraph.tsx:61` | deferred (UD21); a house-level coincidence, not this page's to change |
| P3 (`tsv`) | finance's helper hard-codes finance's provenance | confirmed: `src/data/financeView.ts:993` writes each finance lens's fleet and run id; `:995` the loan amounts sentence; `src/components/finance/ui.tsx:257` the `finance-` file prefix; the cell rule `cleanCell` is not exported | option (b): security's own `tsv` and `Exports`, finance's helper untouched (U16, D45) |
| J2 (₹ lakh) | every RBI state row's note records a lakh-to-crore conversion | confirmed: 120 budget rows carry "RBI Appendix II prints ₹ lakh; converted to ₹ crore (÷100)." as the start of `note` | an anchored prefix `LAKH_NOTE` with an SG-5 gate (U13), retired by a unit field |
| J4 (Adani) | Adani Defence owns PLR Systems | confirmed: `procurement-industry:c047`, `own`, `reported`, "Adani Defence → PLR Systems 51%" | as proposed (U15) |
| M1 (bundle) | the series ride in the entry | confirmed: `src/context/DataContext.tsx:13` imports `FORCE_NODES`/`FORCE_EDGES` from the one module that also holds the series; `dist/assets/index-Bp_P7S4Y.js` is 9,845,132 bytes raw and 2,324,188 gzipped | G5 becomes a build prerequisite (U1). No page decision can take the series out of the entry without the split |
| P5 (hidden by filter) | keep the hatch texture, change the words | the frozen channel table gives hatch one meaning, no row; `fy` already dims and never removes | adapted: dimmed as `fy` dims, words `{k} rows hidden by the {filter} filter — not absent`, never hatch (U18) |
| M10 (vendor cards at 390) | each card behind a `<details>` | the house rule is "never truncate a source list behind 'show more'" | adapted: the whole record is the disclosure, the summary has an identical form on every card, an open card shows every field including sources (U6, D61) |
| M2 (fold) | ~1,100 px of head before the strip at 390 | an estimate from the spec: kicker, two-line title, five-sentence standfirst, three-sentence standing line, then the three-row statement with its mono lines | measured ceilings, recorded on the first build (U2) |

---

## 7. Prioritised amendment list `[SYNTHETIC]`

### 7.1 Must: applied to the spec in place

Order: the deal-breakers first, then consensus musts by breadth, then single-seat musts by
reach, then promotions.

| id | amendment | from | spec sections edited |
|---|---|---|---|
| U1 | **G5 before build.** The module splits into graph and page parts before the page is built; SG-50 fails, not prints, on a series string in the entry; the route fallback renders the resolution statement's fixed words. | M | §3.3, §10, §16 SG-50, §18 |
| U2 | **The 390 fold budget is measured.** Ceilings: strip, tabs, Find and rail summary within 1,688 px; top of the stack within 2,110 px; recorded in the acceptance doc. D1, D58 and §12 agree. | M (rule 4) | §4, §12, §15 D58, §16 SG-33 |
| U3 | **The pinned stack fits.** One tab row at 390 (`Budgets · Footprint · Procurement`, full names as accessible names); strip fact 1 on one line with a `levels` link. | M | §5.0.2, §12, SG-33 |
| U4 | **Find at 390** is first under the tabs, outside the rail, never pinned, results inline. | M | §5.0.4, §6, §12, SG-33 |
| U5 | **The stack is reachable by thumb.** A 44 px step control under the chart; a second tap acts only on the same target, anywhere on the page. | M | §5.1.1, §7, §12, SG-33 |
| U6 | **The phone page has a length.** Q1 twin closed (cards when opened); ledger groups closed except published totals and the accented body; StateTable closed with the selected state's card inline; vendor cards behind identical whole-record summaries (D61); a page-length gate. | M | §5.1.3, §5.3.1, §12, §15 D61, §16 SG-53 |
| U7 | **OfficeLanes at 390** keep unlabelled bars for alignment and list each office's holders beneath. | M | §12 |
| U8 | **Every twin, table and inner scroll has a named 390 form**, never swipe-only; `KindMatrix` one card per state; footprint kinds as checkboxes. | M | §5.2.1, §6, §12, SG-31 |
| U9 | **One basis for the pension share**: of the published total where one exists, else of the stack, labelled; strip fact 2's no-published-total branch points to the latest published figure; C2 says which. | P, A, J, S | §2.2, §3.2, §5.0.2, §5.0.4, §5.1.1, §9 C2, SG-6 |
| U10 | **An answer sentence leads Q1**, inside the figure, first in `aria-describedby`, repeated in the twin's caption; the answer-block contract allows it. | A, M | §2.2, §5, §5.1.1, §13, SG-40 |
| U11 | **The stack twin reproduces the stack**: one row per drawn band row, published-total rows, hatched rows, pay/Agnipath/Delhi rows by `kind`, reconciliation in words, no glyphs in cells. | P, A | §5.1.1, SG-21 |
| U12 | **`rowCitation` defined**, visible as `<output>`; `read to {asOf} · document:` beneath every ₹ in the cards and readout. | J | §3.2, §5.1.1, §5.1.3, §5.1.6, §7, SG-9, SG-41 |
| U13 | **The source's unit travels**: `as published: {x} ₹ lakh; shown here in ₹ crore` on converted rows, in the citation; anchor `LAKH_NOTE`. | J | §3.2, §5.0.4, §5.1.3, §5.1.6, SG-5, SG-9 |
| U14 | **The readout is a deliverable**: `Copy citation` per demand row and `Copy this year as text`. | J | §2.2, §5.1.1, §7, SG-40 |
| U15 | **Field 3b, recorded holdings**, on every card, with the owned body's award count and `listed, not added to this vendor`; field 4's null words name the releases read; thirteen fields. | J, S | §2.2, §3.2, §5.3.1, §8.2.8, §8.2.19, E19, SG-43 |
| U16 | **Security's own `tsv` and export buttons** with force provenance and a `security-` file name; no finance run id in an export. | P (rule 4) | §3.2, §15 D59, §17, SG-22 |
| U17 | **The StateTable exports two machine tables**, spend and strength, with `note` and `derived_counts`. | P | §5.1.6, SG-22 |
| U18 | **Hidden by a filter is not absent.** Dimmed as `fy` dims, never hatched, with `{k} rows hidden by the {filter} filter — not absent`; legend class; denominator lines say so. | P (frozen hatch rule) | §3.2, §5.0.4, §5.1.3, §5.1.6, §6, §8.2.5, §8.2.19, §10, SG-52 |
| U19 | **Two figures are not a share.** `{a} and {b}` with a chip where the numerator exceeds the denominator or a figure is not an integer; no percentage, whisker or `of`. | S | §3.2, §5.0.4, §5.1.4, §8.2.15, §17, SG-RF7 |
| U20 | **Pair headers are the page's, the pair edge's words are quoted with their innocent reading.** `{earlier} beside {later}` as the `h4`. | S | §5.3.4, SG-RF5 |
| U21 | **Every analytic text shows its innocent reading** beneath, at the same size: state records, vendor field 6, the board control, the pair header. | S | §3.2, §5.1.6, §5.3.1, §5.3.3, SG-RF8 |
| U22 | **The partisan-word gate is derived** from party nodes plus fixed words, over every page-authored string; C18 no longer assigns cases to governments. | S (rule 4) | §8.2.10, §9 C18, SG-RF4 |
| U23 | **`view` survives a lens switch.** | A | §3.4, §11 E40, §15 D48, SG-38 |
| U24 | **Selection has state and words**: `aria-current` / `aria-selected`, `selected body` etc., and `Go to …` links from each margin card. | A | §5.1.3, §5.3.1, §5.3.4, §13, SG-51 |
| U25 | **No interactive element inside an `aria-hidden` drawing.** Award marks, the Agnipath tick and DelhiLine points become twin and readout controls; DelhiLine, the dot strips and the AoN chart frame join §13's list. | A (rule 4) | §5.1.1, §5.1.7, §5.3.1, §7, §13, SG-46 |
| U26 | **One `h3` per Q-block**; figure titles are `h4` or plain text. | A (rule 4) | §5, §13, SG-49 |
| U27 | **Replies are nested lists** beginning `in reply to {responder}`. | A (rule 5) | §5.1.5, §5.3.4, §11 E32, §13, SG-49 |
| U28 | **Vendor cards are not composite widgets**: natural tab order, a skip link, the chapter links for the keyboard budget. | A (rule 4) | §13, SG-46 |
| U29 | **No city body is offered a budget line**: its Find verb is `Where its police money sits`, after the fixed sentence. | A (rule 4) | §2.2, §5.0.4, §8.2.19, SG-42 |
| U30 | **The dot strip has text**: the median in each denominator line and the StateTable caption; sort buttons on declared-value columns. | A (rule 5) | §5.1.6, SG-21 |
| U31 | **The slice twin carries Form A's share.** | A (rule 5) | §5.3.2, SG-21 |
| U32 | **Ledger cell names are the one sanctioned ₹ without a denominator**, ending `— open for its share of the demand and the previous year`; SG-9 says so. | A (rule 4) | §5.1.3, §13, SG-9 |
| U33 | **No share of the drawn states' sum** under `m=cr`. | P (rule 4) | §3.2, §5.1.6, §8.2.3, §15 D18 |

### 7.2 Should and could: deferred

The full list, UD1–UD46, is at the end of the spec under "Deferred amendments", with source
seats and grades. The five to take first when the build has room:

1. **UD1**, every stage in the `FYReadout`: two seats, and the one misreading §1.2 names
   outright (BE passed off as spend).
2. **UD10**, S8 before build, so P-Q2 is not an absence sentence at launch.
3. **UD20**, audit-added denials worded as found in the public record, with every response
   count split by origin; 42 of the 59 responses are audit-added (F26).
4. **UD8**, the ledger's level and parent columns, so a spreadsheet reader cannot add a demand to
   its own lines.
5. **UD21**, the response glyph that survives the rose/enforce coincidence.

---

## 8. Spec self-contradictions surfaced `[SYNTHETIC]`

Defects in the spec, not reader preferences. Each is fixed by the amendment named.

| where | contradiction | fixed by |
|---|---|---|
| §16 SG-33 at 390×844 (strip within 844 px) | D1 keeps a ~1,100 px head before the strip | U2 |
| §12 pinned stack ≤ 140 px | §12 tabs "wrap to two lines" at 44 px | U3 |
| §13 targets 44 px on coarse pointers | §12 stack columns ~11 px, the only route to a year | U5 |
| §12 `OfficeLanes` labels "when the stack scrolls (it does not, so none)" | §15 "the builder has nothing left to choose" | U7 |
| §5.1.1 pension label "share of that column's stack" | §3.2 `crContext` share of the published total, for the same row | U9 |
| §5.0.2 fact 2 `published total ₹{pub} cr` | the latest BE FY has no published total (F7) | U9 |
| §5.1.1 twin "one row per (FY, panel)" with per-band columns | four to eight bands per column | U11 |
| §17 and D59 reuse finance's `tsv` "unchanged" | SG-22 asks for the force run id; finance's writes three finance run ids | U16 |
| §3.2 `stateSpend` `{share}% of the {k} drawn states' sum` | D4 rejects a share of a page-computed total; §8.2.3 lists the only sums | U33 |
| §9 C18 "each government's case" | §9: no partisan frame in the page's own words | U22 |
| §5.0.4 and §2.2 B-J3: `Show its budget line` on a commissionerate | §3.4 `body` takes only `LANES` bodies; D17: no city budget | U29 |
| §5.3.1 award marks are buttons; §5.1.1 Agnipath tick is a link; §7 DelhiLine points open `cell` | §13 those drawings are `aria-hidden`; SG-46 nothing focusable inside | U25 |
| §5 "every graphic a figure with a visible `h3`" | the answer-block contract gives the block its `h3` | U26 |
| §13 ledger cell names voice ₹ alone | SG-9 every ₹ element carries its denominator | U32 |
| §13 vendor cards "one tab stop, inner buttons by Enter" | no role, hint or exit key: the builder would choose | U28 |
| §12 footprint chips "become a `<select>`" | `kind` is a comma list | U8 |
| frozen rule "every figure carries its as-of date and source" | the `CellCard` lists every field but the date | U12 |
| frozen channel: hatch means no row | `tier=documented` would hatch every reported row that exists | U18 |
| frozen rule: a WCAG twin for every graphic | the dot strips have none; the slice twin lacks Form A's bar | U30, U31 |

---

## 9. What to validate with real readers `[SYNTHETIC]`

In order of how much depends on it:

1. **Two readers from opposite sides, cold, on Q4's base-rate cards, the `StatePanel` for Uttar
   Pradesh and the case pairs.** Do they read the two-figure cards, the quoted state records or
   the pair rows as the page taking a side? (U19, U20, U21, U22; UD22, UD23)
2. **A journalist timed from arrival to a pasted citation** for "defence pensions 2025-26", "CRPF
   2024-25" and "Mumbai Police budget". Target: under two minutes, the right stage, the right
   unit. (U9, U12–U14, U29; UD1, UD4)
3. **A phone walk at 360–414 px on a throttled connection**: time to first paint after G5, and
   whether a reader reaches Q7 without giving up. (U1–U8)
4. **A screen-reader walk of the built page** (NVDA with Firefox, VoiceOver with Safari), with
   twins closed at 390: is the "show them all" link found, and does `view=table` survive the
   tabs as intended? This settles the open-or-closed divergence. (U6, U10, U23–U28)
5. **A researcher reproducing the stack and the StateTable from the exports.** (U11, U16, U17;
   UD8, UD9)
6. **§18 risk 3**: does a reader carry the `% of GSDP` map away as a per-person figure? (UD37)
7. **The Adani card**: with field 3b, does either side still read the card as hiding or as
   implying? (U15)

---

## 10. Verbatims `[SYNTHETIC]`

Excerpts from each seat's returned text. No seat returned an in-voice line.

- **J:** "J's deliverable — the pasteable citation — is undefined for the surface J actually
  reaches, and a developer would have to invent it."
- **P:** "One row cannot hold them, and SG-21 pins stack twin rows to FY_AXIS × panels. P cannot
  reproduce the stack from the export."
- **S:** "That is a page-computed BJP-versus-opposition comparison — the first thing a hostile
  reader screenshots — and it is arithmetically meaningless."
- **A:** "The screen-reader reader cannot answer the block's own question from the table."
- **M:** "Deal-breakers: the entry weight and the resolution-statement/SG-33 contradiction."

---

## 11. What this review cannot show `[SYNTHETIC]`

- **No page was rendered.** Every layout figure (the ~1,100 px head, card heights, page length
  at 390) is an estimate from the spec, except the entry-chunk size and the module facts checked
  in §6.
- **The seats are archetypes written by the same kind of agent.** Agreement between them is
  weaker evidence than agreement between five real readers, and it may be the consensus of one
  model with itself.
- **No assistive technology was run.** A's findings are structural readings of the specified
  ARIA, not observed behaviour in NVDA, JAWS, VoiceOver or TalkBack.
- **The module is moving.** The seats read run-92066c7bcf73; the module now carries
  run-09adb15b87be and the reconciliation is uncommitted. The amendments name no count, so they
  should survive it; the §6 confirmations should be re-read after reconciliation.
- **Severity regrading is the synthesiser's.** It follows the rules in §0 and only promotes. A
  reader may find a deferred item more serious than an applied one.

---

## Appendix A. Every persona item, and where it went `[SYNTHETIC]`

Item ids follow each seat's returned order.

| seat | items → applied | items → deferred |
|---|---|---|
| J (14) | J1 citation → U12 · J2 ₹ lakh → U13 · J3 readout copy → U14 · J4 Adani holdings → U15 · J5 band-label basis → U9 · J6 latest published total → U9 · J12 as-of on the element → U12 | J7 stages in the readout → UD1 · J8 change Δ → UD2 · J9 sticky Find → UD3 · J10 Find tokens → UD4 · J11 Bodies coverage → UD5 · J13 StatePanel order → UD6 · J14 case field 8 → UD7 |
| P (18) | P1 pension basis → U9 · P2 stack twin grain → U11 · P3 `tsv` provenance → U16 · P4 StateTable export → U17 · P5 hidden by filter → U18 · P10 `m=cr` share → U33 | P6 ledger machine columns → UD8 · P7 export caveat headers → UD9 · P8 S8 before build → UD10 · P9 slice coverage → UD11 · P11 pair on metric change → UD12 · P12 per-lakh base → UD13 · P13 Q4 `property` → UD14 · P14 grants totals → UD15 · P15 Union mono line → UD16 · P16 body export → UD17 · P17 GSDP basis → UD18 · P18 `countOf` → UD19 |
| S (13) | S1 two-figure base rates → U19 · S2 pair header → U20 · S3 innocent readings → U21 · S5 partisan list and C18 → U22 · S8 owned bodies' awards → U15 · S13 C2 pension sentence → U9 | S4 audit-added denials → UD20 · S6 rose glyph → UD21 · S7 stages in the readout → UD1 · S9 symmetry preface → UD22 · S10 case selection → UD23 · S11 case voids → UD24 · S12 offices without a role record → UD25 |
| A (22) | A1 Q1 answer → U10 · A2 `view` on lens switch → U23 · A3 selection state → U24 · A4 interactives in hidden drawings → U25 · A5 twin grain → U11 · A8 dot strip text → U30 · A10 reply nesting → U27 · A11 commissionerate verb → U29 · A12 vendor-card widget → U28 · A13 one `h3` → U26 · A14 slice share → U31 · A19 ledger cell names → U32 | A6 glossary and `abbr` → UD26 · A7 office FYs → UD27 · A9 roving start → UD28 · A15 rail landmark → UD29 · A16 arrows in names → UD30 · A17 middle dots → UD31 · A18 reconciliation link names → UD32 · A20 coverage twin → UD33 · A21 standfirst → UD34 · A22 double announcement → UD35 |
| M (28) | M1 bundle → U1 · M2 head fold → U2 · M3 pinned stack → U3 · M4 Find → U4 · M5 stack targets → U5 · M6 Q1 twin → U6 · M7 office lanes → U7 · M8 ledger groups → U6 · M9 StateTable → U6 · M10 vendor cards → U6 · M11 every twin's 390 form → U8 · M12 fact 2 above the stack → U10 · M18 kind chips → U8 · M19 `KindMatrix` → U8 · M20 award and case scroll → U8 · M22 page-length gate → U6 · M23 second tap → U5 · M24 fact 1 → U3 | M13 police panel text → UD36 · M14 map metric line → UD37 · M15 vertical dot strip → UD38 · M16 base-rate groups → UD39 · M17 grants groups → UD40 · M19 `PlaceList` groups → UD41 · M21 graph chunk → UD42 · M25 caption order → UD43 · M26 contract headings → UD44 · M27 sticky pair header → UD45 · M28 copy order → UD46 |

M19 is split: its `KindMatrix` half is applied in U8 and its `PlaceList` half deferred as UD41.
J7 and S7 are one deferred amendment, UD1.
