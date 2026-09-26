# /welfare spec: synthetic UX review, synthesised [SYNTHETIC]

> **Synthetic research notice [SYNTHETIC].** This review was conducted by AI agents
> instantiated as persona archetypes. No real reader was consulted and no build was
> rendered: the page is still the scaffold and `WELFARE_META.empty === true`, so every
> persona walked the spec text (`docs/design/WELFARE_PAGE.md`) against the components it
> binds to. Findings are hypotheses to validate with real readers, not a substitute for
> testing. Every section below is synthetic.

*Written 2026-09-25. Method: the SweetClaude `design-ux-review` synthesis (task
completion, deal-breakers, consensus, divergence, what worked, priorities, verbatims),
applied to five persona reviews supplied by the workflow. Output of the synthesis: 22
must-level amendments applied in place to the spec, each marked `[UX review] (Un)`, and
35 should/could amendments listed at the end of the spec under "Deferred amendments"
(D1–D35). Every one of the 91 persona items is either applied, merged into an applied
item, or deferred by id; none is dropped.*

---

## 0. The panel [SYNTHETIC]

| seat | persona | primary task in the walk | amendments returned (must / should / could) |
|---|---|---|---|
| J | Investigative journalist on deadline | one checkable figure and its source in two minutes | 5 / 7 / 2 |
| P | Policy researcher who distrusts any chart without a denominator | verify a denominator, then export the rows and re-derive the 2×2 | 2 / 9 / 4 |
| S | Politically hostile reader | find the missing control, the missing denial, the loaded colour | 4 / 9 / 4 |
| A | Screen-reader user (the graphic is invisible; twins and captions are the page) | answer the brief's questions from text alone | 8 / 11 / 6 |
| M | 390px phone, slow connection, will not scroll sideways | see the map and a year, open a state | 7 / 10 / 3 |

Total: 26 must, 46 should, 19 could, 91 in all. Several items overlap, which is why the
synthesis is shorter than the sum.

### How severity was set in the synthesis [SYNTHETIC]

A persona's own severity is its view from one seat. The synthesis re-grades each
consolidated amendment by these rules, in order:

1. **Deal-breaker.** It stops a persona's primary task outright. → must.
2. **Consensus with a must.** Two or more personas raised the theme, and at least one
   graded it must. → must.
3. **Broad consensus.** Three or more personas raised the theme, whatever their grades. → must.
4. **Frozen-rule or self-contradiction fix.** A single persona found a place where the
   spec breaks one of its own frozen rules (§7.2, K6, "every figure carries its as-of
   date and source", "every pattern its denominator", "no-data never means zero") or
   contradicts itself. → must, however the persona graded it.
5. **WCAG failure.** The house rule is a WCAG table twin for every graphic. An amendment
   that removes an assistive-technology dead end → must.
6. Everything else keeps its persona grade (should or could) and is deferred.

The rules only promoted. Promotions: P's `live`-label, timing-n, base-rate and
points-moved items (rule 4); M's and A's empty-state items (rule 3); S's lane-glyph
collision (rule 4: one mark with two meanings on one stage). Demotions: none. All 26
persona musts are applied, several merged with each other.

---

## 1. Task completion [SYNTHETIC]

**1 of 5 personas returned an explicit completion verdict:** the policy researcher,
*would not complete* (confidence "no", deal-breaker triggered). The other four returned
amendment lists without a verdict. The synthesiser's reading of their walks is inferred,
not returned:

| seat | inferred outcome | the step that fails |
|---|---|---|
| J | not within two minutes | four interactions and a hover to reach a figure, and the first figure reached (a state sum or a ×12 per-head) is one no source states |
| P | **no (returned)** | no export path; twin cells are not machine-readable |
| S | completes the reading, contests the frame | the in-frame caveat omits active filters; the headline control reads assembly rows only; "no response on record" reads as "did not deny" |
| A | no | the map's facts are never announced; the twins are closed toggles at the end of the stage; TimeLanes is an image role with focusable children |
| M | no | the readout is hover-only; ballots are ~4px; the clock opens on 2000–2014 with no cue that 2015–2026 is off-screen |

## 2. Deal-breakers [SYNTHETIC]

- **P: no export.** "Step three is impossible." The persona's workflow is to read the
  2×2, distrust it, pull the elections rows into a spreadsheet and re-derive the 2×2.
  Nothing in the codebase (a grep of `src/` for csv, download or Blob) or the spec lets
  a table leave the page with its provenance. → **U1**, applied.

No other persona declared a deal-breaker. A's and M's failures are functionally
blocking for those readers (the map readout cannot be reached at all), and rules 1 and
5 treat them as musts.

---

## 3. Consensus themes (raised by two or more personas) [SYNTHETIC]

| # | theme | raised by | synthesis grade | applied as |
|---|---|---|---|---|
| C1 | **A single figure cannot leave the page with its provenance.** There is no export or citation copy, and `Cite` shows labels, not URLs. | J (must), P (must, deal-breaker), A (should: table captions) | must | U1 |
| C2 | **The map's readout carries no source and is unreachable without a mouse.** It shows sums no source states, is hover-only, and has no live region. | J (must), P (should), A (must), M (must) | must | U4 |
| C3 | **Page-computed numbers read as recorded ones:** ×12 per-head, sums, the word "enrolled". | J (must), P (should) | must | U5, U4 |
| C4 | **The matrix twin's bare `—` and blank Source cells.** Both contradict §7.2 rule 11 and read as zero or as an omission. | J (should), P (must), S (should), A (must) | must | U2 |
| C5 | **The in-frame status line.** It omits the active filters and the run id, conflicts on size (11px mono against rule 10's body size), and runs as one unbroken string. | S (must), M (must), A (should), J (could) | must | U3 |
| C6 | **The control's own denominator is unnamed.** The elections reference class is not stated, and the selection and challenger caveats sit below the fold. | J (should), P (should), S (should) | must (rule 3) | U9 |
| C7 | **Denials legible without the rose rule.** The pairing is visual only, and rose also means "warning" in the house `Callout`. | S (should), A (must) | must | U12 |
| C8 | **Search-first path.** `q` is the sixth control, and a unique match leaves nothing to click. | J (must), A (could: label and announcement) | must | U6 |
| C9 | **Empty state reads as a finding of zero** for two screens before the callout. | M (should), A (should), J (could) | must (rule 3; also rule 4, since no-data never means zero) | U22 |
| C10 | **Selection, focus and scroll after a tap or click:** the panel lands off-screen or under the pinned stack, and focus is lost. | M (must), A (must) | must | U18 |
| C11 | **Per-figure source for elections:** there is no `Cite` on election rows and no Source column in the elections twin. | J (should), P (should: per-cell sources) | must (rule 4: every figure carries its source) | U8, U2 |
| C12 | **Turnover table:** it has no denominator (P) and no same-party mirror (S). | P (should), S (should) | must (rule 4: every pattern its denominator) | U15 |
| C13 | **Budget stage (BE/RE/actual) and budget base** are not recorded per outlay row. | J (should), P (should) | should | D1 |
| C14 | **ReadingKey at 13px** sits below body size, on the surface that says "none of the three means zero". | S (could), M (should) | should | D7 |
| C15 | **Standfirst rewrite.** S: the hypotheses are ordered and the title is causal. A: the copy is device-bound ("scrub", "click") and never mentions tables. | S (should), A (should) | should (editorial) | D8 |
| C16 | **Elections twin cannot reproduce the control:** it lacks canonicalised parties, event dates and a "counted in control" column. | P (should), A (should) | should | D6 |
| C17 | **Filter state invisible on phones;** minister links that silently set `q`. | S (should), M (should), A (could) | should (partly met by U3) | D11 |
| C18 | **Captions not tied to their graphic,** in one block after both graphics. | A (should), M (could) | should | D17 |
| C19 | **Unclassified and coalition rows:** they are excluded from b, and alliance-string schemes are never exposed. | P (should), S (should) | should | D5, D9 |

**Single-persona musts kept as musts** (rules 4 and 5): dated findings (J, U7); the
Union in the control (S, U10); "no response" wording (S, U11); promised rows without
colour (S, U13); map legibility on phones (M, U16); clock initial scroll (M, U17);
narrow tables (M, U19); TimeLanes and scrubber ARIA (A, U20); unavailable options and
the live region (A, U21).

**Single-persona items promoted to must** (rule 4): the `live` label with no year (P,
U14); the timing chart's n, the base-rate floor and the points-moved floor (P, U15); the
lane glyph `□` shared with the lost ballot (S, U13).

---

## 4. Divergent opinions [SYNTHETIC]

| topic | who, and why | resolution in the spec |
|---|---|---|
| **Status-line typography** | S: body size (14px), per rule 10, because the caveat has to be read. M: a 12px mono floor, split one clause per line on a phone. J: keep 11px mono, add the run id. A: meaning before texture ("none recorded (hatched)", not "hatched = none recorded"), as a list, not a dotted string. | Body size with mono only for counts (satisfies S, M and rule 10); a `<ul>` of clauses, one per line below 640px (M, A); meaning first (A); run id added (J). J's 11px is overruled by the spec's own frozen rule. **U3.** |
| **How much the ControlCard carries at rest** | S, J and P add lines: selection, challenger, rule and run id, the Union block. M wants the margin shorter on a phone, so the clock is not three screens below the map. | The additions are one line each and apply at every width; M's relief comes from moving the voids to one line below `xl`, which is deferred (D18). The tension is real: if the card still pushes the clock past the narrow fold budget (D23), D18 should be promoted. |
| **Are lane bars focusable?** | A: no. They sit inside an image role, so each tab stop announces nothing; the keyboard path should be DOM buttons. M: tapping a bar should open the scheme, because `<title>` never shows on touch. The original spec: every bar focusable. | Compatible: bars are not focusable but a pointer click on a bar sets `s`; the DOM label buttons are the keyboard and screen-reader path. **U20.** M's tapped-element readout line is deferred (D20). |
| **Ballot lid: bigger or gone?** | M: the lid must be ≥ 2px on screen or the lid (reader question 2) is illegible. S: the lid is read as a flag on "their" wins; make the drop-the-lid trigger concrete. | Legibility is applied (U16), because an illegible honest mark is not a neutral mark. S's trigger is deferred (D29) and should run *after* U16, on the legible version. |
| **Replacing the bare `—`** | S: `n.r.`, with the abbreviation expanded in the header. A: the words `none recorded`, since screen readers read "em dash" hundreds of times. P: a closed status enum, since text in a numeric column breaks spreadsheets. | All three, by layer: `none recorded` on screen (A), `<abbr>n.r.</abbr>` only where width demands (S), `none-recorded` in the export's `_status` column (P). **U2.** |
| **Per-head naming** | J: keep the metric, but print the recorded amount beside the ×12 figure. P: rename it, because "per enrolled beneficiary" implies a division by enrolment that never happens. | Both applied; they do not conflict. **U5.** |
| **Budget base field shape** | J: free-text `budgetBase: string \| null` plus `stage: 'BE' \| 'RE' \| 'actual' \| null`. P: a closed enum, `'total' \| 'revenue' \| 'unstated'`. | Deferred (D1). The contract proposal should take P's enum (filterable) and keep J's `stage`, and record the source's own wording in a note field. |
| **Where the rose problem lives** | S: rose on the response side reads as "warning" because the house `Callout tone="warn"` also uses `border-rose/40` (confirmed in `src/components/Editorial.tsx`). A: rose is invisible anyway; pair the items structurally. | Both are right about different readers. The key sentence and the `<dl>` structure are applied (U12). Moving `Callout warn` off rose is a platform change outside this page (D24). |
| **Page title** | S alone: the title is a causal sentence ("what the voters did next"). J, P, A and M did not raise it. | Deferred (D8), paired with A's standfirst rewrite. A title is an editorial call and should go to the desk, not be settled by a synthetic panel. |
| **Deadline speed vs refusal R13** | J wants the fastest path to a scheme card, but explicitly keeps R13 (no auto-select on a unique match). | No real divergence: U6 lists the matches as links, one click by the reader. |

---

## 5. What worked [SYNTHETIC]

Items praised or relied on by two or more seats:

- **`a of b` everywhere, with no percentage below b = 10** (P explicitly; J and S build
  amendments on top of it rather than against it).
- **Hatch never means zero; the zero class printed as `empty` until `coverage` lands**
  (P, A: "none of the three means zero" is the sentence A wanted first).
- **The DenominatorStrip with `filtered N → k`, and the as-of in the header** (P, A: "the
  questions 'how much is here and how old is it' are answered at once").
- **The third `unclassified` column, always shown; coalition outcomes not forced**
  (P, S).
- **The analytic expectation printed as text, never drawn as data** (P, J; J's U5
  extends the same rule, R11, to computed sums and conversions).
- **The ballots on the map include the elections no scheme preceded** (S accepts the
  control's shape and argues only about its scope and caveats).
- **Downstream sections are tables and text** (A: "largely work well").

---

## 6. Prioritised amendment list [SYNTHETIC]

### 6.1 Must: applied to the spec in place

Order: the deal-breaker first, then consensus musts by breadth, then single-seat musts
by reach (how many readers the failure touches).

| id | amendment | from | spec sections edited |
|---|---|---|---|
| U1 | **Export and citation.** `Copy as TSV` and `Download .tsv` on every twin and section table, serialised from the same row arrays. Snake_case keys, split value and status columns, trailing `as_of`, `run_id`, `filters`, `source_urls`, and a caption line. `copy citation` on every SchemeCard figure row; the URL host printed under each `Cite`. | P, J (C1) | §3.2, §5.6c, §7.3, §11.7, §14 |
| U2 | **Twins that can be reached and read.** A year-slice twin first, with the election in `y` and per-row sources, and the full matrix second. No bare `—`; a closed status enum in the export. Skip link, `id="stage-tables"`, twins `open` under `view=table`, summaries naming rows, filters and as-of; a fixed DOM order. `no source in file` for any empty `srcs`. | A, P, S, J (C4) | §4, §5.7, §7.1, §7.2 r11, §11 |
| U3 | **Status line.** Active filters, and wording that names the party filter when it is on; the run id; body size (resolving §5.4 against rule 10); a `<ul>` of clauses, meaning first; a 12px mono floor below 640px. | S, M, A, J (C5) | §5.4, §7.2 r10, §10, §14 |
| U4 | **The readout, reachable and decomposed.** It opens the StatePanel on every viewport. It gives a per-scheme breakdown of any summed money value, with `Cite` and a `computed here` sum. It is mirrored to a live region on keyboard focus; the `aria-label` is dynamic. | J, P, A, M (C2) | §5.4, §5.6b, §6.1, §6.4, §10 |
| U5 | **Computed here.** A new frozen rule 13: a page-computed number is labelled on its surface and never carries `Cite`. Recorded amounts are printed beside ×12 figures. The metric is renamed "Entitlement per beneficiary, per year (as recorded)"; C4 and R4 reworded. | J, P (C3) | §0.2 K12, §5.4, §5.6c b4, §7.2 r13, §7.3, §8 C4, §11.3, §13 R4 |
| U6 | **Search first.** `q` is the first control, with a placeholder, a label and a live announcement; k ≤ 8 matches are listed as links to `?s=`; no auto-select. | J, A (C8) | §3.3, §4, §5.3, §7.3, §14 |
| U7 | **Dated findings.** Optional `date` and `by` on `SchemeResult`; rendered as `date · body · tier · finding · Cite`, sorted by date; undated findings counted as a derived gap and in the §5.12 denominator; a contract proposal. | J | §5.6c b7, §5.12, §5.15, §14 |
| U8 | **Elections cited.** `Cite` on election rows in the StatePanel, the ControlCard lists and the elections twin. | J, P (C11) | §5.6a, §5.6b, §11.4 |
| U9 | **The control's denominator named.** The strip fact reads `· reference class not in file`; the ControlCard carries selection and challenger lines and a rule, run id and "association, not effect" foot line with a citation copy. `electionsReference` proposed. | J, P, S (C6) | §5.2, §5.6a, §14 |
| U10 | **The Union measured in the control.** The ControlCard is retitled to assembly elections and gains a Lok Sabha block under the same exposure rule; ReadingKey line 4 extended; `ControlCard` props. | S | §5.6a, §6.3 |
| U11 | **"No response located in this file. The file does not record whether one was sought."** Two derived gaps; the strip label extended; `responseSought` proposed. | S | §5.2, §5.6c b7, §5.12, §5.15, §9, §14 |
| U12 | **Denial pairing is structural.** One `<dl>` per alleged item, in allegation → response order; a one-line key saying what the rose rule means; a ReadingKey line when an alleged item is in view. | A, S (C7) | §5.6a, §5.6c b7, §5.12, §7.2 r9 |
| U13 | **Promised rows get no colour; the promised glyph changes** from `□` to `◇`. Ballot-key and lane glyphs are kept disjoint and printed as two labelled groups. | S (A on glyph words) | §5.5, §5.6c b4, §7.2 r5 |
| U14 | **The `live` label depends on `y`:** "State schemes launched 2000–{asOfYear} (cumulative, incl. discontinued)" when no year is chosen. | P | §5.4, §8 C2 |
| U15 | **Denominators completed.** The timing chart gets `n = {b} binned`. The turnover table gets a denominator note and a same-party mirror line. The base-rate percentage is printed only when den ≥ 10; the points-moved line only when b, d ≥ 10. | P, S (C12) | §5.6a, §5.8c, §5.8e, §5.8f, §8 C8 |
| U16 | **Map legible on a phone.** Ballots ≥ 9px square, lid ≥ 2px and stroke ≥ 1px on screen; hatch pitch ≥ 6px and dot radius ≥ 1.5px; greyscale gate at 360px and 1280px; the year's election list under the map on narrow screens. | M | §6.1, §7.2 r2, §10, §14 |
| U17 | **Clock opens at asOf on narrow screens,** with a visible-range line, earlier/later buttons, edge fades and a viewport assertion. | M | §10 |
| U18 | **Focus and scroll.** Focus moves to the panel heading and returns on close, with an announcement and Escape; a change of `st` scrolls like `s`; `scroll-margin-top`; the pinned stack is ≤ 140px; viewport assertions. | M, A (C10) | §5.6, §5.6c, §10 |
| U19 | **Narrow tables.** Sticky first column, a column-count hint, fades and a labelled region; by-party and turnover stacked per row. | M | §10 |
| U20 | **TimeLanes and scrubber ARIA.** The drawing is `aria-hidden`, with a DOM button per lane. The range gets `aria-valuetext` for "All years", and the step buttons get names and `aria-disabled`; there is never a second visible "Year" control. | A (M on touch) | §5.5, §6.2 |
| U21 | **Unavailable options** are `aria-disabled` and keep their reason in the accessible name; exactly one polite live region carries filter effects, readout, panel and copy announcements. | A | §3.3, §7.3 |
| U22 | **Empty state.** The callout sits above the byline, and the byline reads "register not yet promoted · nothing below is zero"; empty-state skip-link, `aria-label` and summary text; a smoke assertion. | M, A, J (C9) | §5.1, §9, §14 |

### 6.2 Should and could: deferred

The full list, D1–D35, is at the end of the spec under "Deferred amendments", with its
source seats. The five that should be first in line when the build has room:

1. **D1** budget stage and base, which C3 already admits pools unlike figures;
2. **D6** the elections-twin reproducibility columns, which let P re-derive the 2×2 from
   the export alone;
3. **D7** ReadingKey at body size, since K16's logic already covers it;
4. **D17** captions tied to their graphic;
5. **D18** voids as one line below `xl`, if the fold budget fails.

---

## 7. Spec self-contradictions surfaced [SYNTHETIC]

These are defects in the spec, not reader preferences. Each is fixed by the amendment
named.

| where | contradiction | fixed by |
|---|---|---|
| §5.4 status line "mono 11px" | §7.2 rule 10: "at body size" | U3 |
| §11.1 cells "`—` for none recorded" | §7.2 rule 11: "never a bare `—`" | U2 |
| §5.6c block 4 promised rows "in amber" | §7.2 rule 5: no colour for cut, raise, … | U13 |
| §5.7 "a screen-reader user never needs the toggle" | the twins are closed `<details>`: a toggle, and last in reading order | U2 |
| §5.7 "(§10)" for the twins | the twins are §11 | U2 |
| §6.1 "the existing keyboard ring reaches" the ballot facts | the readout is driven by `hover ?? selected` and is not a live region | U4 |
| §5.4 `METRIC_LABEL.live` "State schemes live" | §5.4: "With `y` absent, live means ever launched" | U14 |
| §5.6a "Every election in the file" | the card reads `/assembly/i` rows only | U10 |
| §5.5 `□` = promised, not enacted | §5.4 ballot key `□` = lost | U13 |
| §5.6a "moves a row by up to … points" when b < 10 | §7.2 rule 8: no percentage below b = 10 | U15 |
| §6.2 `role="img"` with `tabIndex=0` children | an image role makes its children presentational | U20 |

---

## 8. Verbatims [SYNTHETIC]

One per seat. P's is the in-voice line the persona returned; the other four are
excerpts from the persona's own summary, since those seats returned no in-voice line.

- **J:** "The spec's honesty rules are strong on what the graphic cannot show, but thin
  on making a single figure quotable with its provenance in one motion."
- **P:** "This is the first Indian welfare page I have seen that prints `a of b`
  everywhere and refuses percentages under ten. I trust it more for that. Now let me get
  the numbers out of it — and I cannot."
- **S:** "The strongest single amendment is to print every active filter in the
  in-frame status line, because that is the one surface built to survive a cropped,
  partisan screenshot."
- **A:** "The sentence 'so a screen-reader user never needs the toggle' is inverted: a
  closed details is a toggle, and it is the last thing encountered."
- **M:** "What this reader looks for first: the map and a year. What they get: roughly
  two screens of header, byline facts and strip before the scrubber."

---

## 9. What to validate with real readers [SYNTHETIC]

In order of how much depends on it:

1. **Screen-reader walk of the built page** (NVDA with Firefox, VoiceOver with Safari):
   can a user answer questions 1–3 from the skip link and the year-slice twin alone?
   (U2, U4, U20, U21)
2. **Phone walk at 360–414px on a throttled connection:** can a reader find a state's
   readout, see 2019–2026 on the clock, and read a ballot's outcome? (U16–U19)
3. **Two readers from opposite sides, cold, with a `party=` screenshot:** does the status
   line stop the "one side as the whole" misreading? Do they describe a lidded ballot as
   "bought"? (U3; D29)
4. **A journalist timed from arrival to a pasted citation** of one scheme figure.
   Target: under two minutes. (U1, U4, U6)
5. **A researcher opening the TSV in a spreadsheet** to re-derive the 2×2. (U1; D6)
