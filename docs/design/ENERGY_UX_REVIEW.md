# /energy — synthetic UX review of the design spec `[SYNTHETIC]`

> **Synthetic research notice `[SYNTHETIC]`.** This review was carried out by AI agents,
> each playing one persona archetype. Its findings are hypotheses, not validated user
> research. Use them to decide what to test with real readers. They are not a substitute
> for that testing. Every heading, finding and recommendation below carries the
> `[SYNTHETIC]` label, and the label must not be dropped when any of it is quoted.

*Written 2026-09-25. Target: `docs/design/ENERGY_PAGE.md` (the /energy spec), reviewed as
a document. `src/pages/Energy.tsx` is still the scaffold, so no reviewer watched a built
page. Method: the sweetclaude `design-ux-review` synthesis (task completion,
deal-breakers, consensus, divergence, priorities), applied to five persona reviews that
were produced independently. The repository has no `.sweetclaude/` state, so no
assumption register or session log was written. The must-level amendments have been
applied to the spec and are marked `[UX review] A{n}` there. The should- and could-level
amendments are listed under "Deferred amendments" (§16) at the end of the spec.*

---

## 0. The panel `[SYNTHETIC]`

| seat | goal given to the persona | reviewed against |
|---|---|---|
| **Journalist** on deadline | one checkable figure and its source within two minutes | the spec, `energy.generated.ts` (419 claims, 31 alleged, 37 contras, 53 role claims mostly sourced to Wikipedia at `reported`), `Editorial.tsx` `Cite` |
| **Policy researcher** | trusts nothing without a denominator; wants to export the table | the spec, `DataTable`, `GraphExplorer`, the generated module (6 of 12 sweeps present) |
| **Politically hostile reader** | suspects the page is partisan | the spec, the frozen channels, the evidence-tiering and cui-bono skills, `FAMILY_COLOR` |
| **Screen-reader user** | for them the canvas does not exist; captions, margin and twins are the page | the spec, `ForceGraph.tsx` focus and ARIA, `GraphExplorer` live region |
| **Phone reader**, 390px wide on a slow connection, will not scroll sideways | the same questions on a phone | the spec, `ForceGraph.tsx` `touchAction`, `DataTable` minimum width, the 1440-only gates, the 1.29 MB index chunk |

**What the synthesiser checked in the repository** before relying on the reviews:

- `touchAction: 'none'` in the canvas's `style` in `ForceGraph.tsx`;
- `tabIndex={0}` on every drawn node, and edge tabbing only for `tabEdges` (edges on a
  path or touching `sel`);
- `min-w-[34rem]` on `DataTable`, and `Cite`, which prints labels only (`Editorial.tsx`);
- both gates open a 1440px-wide page (`smoke.mjs`, `graph-viewport.mjs`);
- `filterGraph` matches `q` against node `label`, `sub` and `al` only;
- the existing `aria-live=polite` block in `GraphExplorer.tsx`.

Symbols are cited instead of line numbers, because another agent was editing
`ForceGraph.tsx` during this review and its line numbers moved while it was being
written.

Two premises in the reviews **did not hold** and were adapted (§6):

- `ENERGY_META.files[]` carries no `coverage`. The assembler reads `coverage` for the
  welfare fleet only.
- A node's `st` is its registered office (the Coal ministry is `dl`, Coal India `wb`), so
  it cannot group lanes by state.

## 1. Task completion `[SYNTHETIC]`

| seat | would complete the task | confidence |
|---|---|---|
| Journalist | uncertain | "not triggered, but close on the figure → source path" |
| Policy researcher | uncertain | deal-breaker triggered (no export) |
| Hostile reader | not stated | four must-level amendments |
| Screen-reader user | not stated | five must-level amendments |
| Phone reader | uncertain | deal-breaker triggered |

**0 of 5 seats said they would complete their task with confidence.** Three said
"uncertain" and two gave no completion verdict. A spec cannot be completed, only read,
so every verdict is a prediction about a page that does not exist yet.

## 2. Deal-breakers `[SYNTHETIC]`

1. **Policy researcher: no export anywhere.** The spec has eleven table twins, a 400-row
   pager and a copy-link button, but no way to get the rows out. The persona's stated
   goal, taking the table into their own tools, cannot be met. → **A3** (applied).
2. **Phone reader: the three honest forms of the page are out of reach.** The voids, the
   table twins and the tenure lanes all sit two screens down or scroll sideways. The WCAG
   twin is therefore unusable by the reader who most needs it. The canvas also captures
   every vertical swipe. → **A15–A20** (applied).
3. **Journalist, near miss: figure → source.** The source is a 10.5px label, and the URL
   appears only on hover. There is no citation to lift as text. → **A1** (applied).

## 3. Consensus themes (raised by two or more seats) `[SYNTHETIC]`

| # | theme | raised by | applied | deferred |
|---|---|---|---|---|
| T1 | **The answer is out of reach unless the reader is a sighted desktop mouse user.** The margin sits beside the canvas at ≥1280, two screens down on a phone, and after hundreds of tab stops for a screen reader. Every "scroll into view" is silent to assistive technology. | journalist, phone, screen reader | A9, A12, A15, A17 | D13, D28 |
| T2 | **The tables are the honest fallback, yet they are hard to reach, incomplete, and cannot be taken away.** "Show table" is the ninth rail control, and on phones it is inside a closed `<details>`. The twin omits `d`, the innocent reading and the kill conditions. Every table scrolls sideways at 390. Rows act through an `onClick` a keyboard cannot reach. | policy, journalist, phone, screen reader | A3, A4, A10, A19 | D12, D13, D25, D44 |
| T3 | **Denials are not equally loud in every channel.** The ClaimCard uses muted "No response recorded" text for reported and documented claims. Accessible names carry no response count. "Equal size" is defined only visually. Responses are undated. An entity's own responses are not gathered. | hostile reader, screen reader, journalist | A7, A11 | D4, D16, D20, D24 |
| T4 | **Absence cannot be told from omission where the reader looks.** The page does not say which years or states were searched, and the "party" and "group" fields are left blank rather than marked "not recorded". Voids are off the first phone screen, absent-sweep chips are off-screen, killed claims are invisible to search, and unplaced lane decisions have no twin row. | hostile reader, phone, journalist, policy | A2, A5, A6, A15, A18 | D5, D7, D12, D18 |
| T5 | **There is no entry point except the hairball.** `q` narrows the picture but does not find claims. The canvas swallows swipes. On phones the company box scrolls to a bare canvas, and it neither moves focus nor announces anything. | journalist, phone, screen reader | A2, A12, A16 | D30, D34 |
| T6 | **Figures can be lifted without their kind, date or base.** One claim can carry two ₹ figures. "As of" reads as the date of the fact. "Claims" has three silent bases. The contested denominator is N of N by construction. Base-rate bars draw 2 of 3 the same as 670 of 1000. | journalist, policy | A1, A4 | D1, D2, D3, D6, D10, D11, D37 |
| T7 | **Acceptance checks are desktop and visual only.** The gates run at 1440 wide only. The two-minute test is asserted but never measured. Nothing checks the page with the canvas removed. | phone, journalist, screen reader | A14 (the criterion) | D27 (the gates) |
| T8 | **Copy and glyphs assume a sighted reader with a pointer.** "Click", "margin", "beside" and "shift-click" appear in the copy. `●`, `—`, `→` and `◌` are read aloud as symbol names. Some content appears only on hover. | phone, screen reader | A11 | D22, D33 |
| T9 | **The page could be read as contradicting or overstating its own rules.** `bsort=count` sits against §13's refusal of count rankings. "Allegations answered" could be quoted as a finding about the parties. "Opposition-governed control" presupposes who governs. | policy, journalist, hostile reader | A8 | D8, D10 |

## 4. Divergent opinions `[SYNTHETIC]`

1. **Graph first or list first on a phone.**
   - *Position:* the journalist would collapse the canvas behind "Show graph" whenever
     `q` or `claim` is set. The phone reader keeps the canvas but makes it inert to
     swipes and opens answers in a bottom sheet over it. The brief and the judge's note
     (§0.1) make the graph the page.
   - *Resolved:* the phone reader's shape (A16, A17). The journalist's collapse is
     deferred (D34), to revisit only if the sheet fails the 390 test.
2. **What a search does to the margin.**
   - *Position:* the journalist wanted "Matching claims" to *replace* the rest state. The
     hostile reader and the phone reader both treat voids-in-view as the page's central
     honesty move, and §9 already keeps the voids visible when filters empty the graph.
   - *Resolved in A2:* the list goes *above* the voids and never displaces them.
3. **How loud a response is on the canvas.**
   - *Position:* the hostile reader wants every responder → claim connector drawn when
     only allegations are shown. §6 draws a midpoint tick at rest to avoid a rose web.
     The screen-reader user wants the rose marks `aria-hidden` and the text to carry the
     response.
   - *Resolved:* the text half is applied (A11). The visual half is deferred (D20)
     because it reopens a decision the judge made on purpose.
4. **`bsort=count`.**
   - *Position:* the policy researcher wants it kept, with a caveat on the control. §13
     refuses count-based rankings of institutions or companies. The interface-design
     skill allows ranking "by count" for quantities that exist outside the app, but a
     claim count is research attention (§13), which is not such a quantity.
   - *Deferred (D8):* a decision for the designer, with the tension stated.
5. **Killed claims.**
   - *Position:* the journalist wants them searchable and quotable ("the register killed
     this because …"). The hostile reader wants them visibly disowned: reason first,
     headed "not asserted by this platform".
   - *Resolved:* the two positions are compatible and merged in D5. A2 already counts
     killed matches in search.
6. **Tables on phones.**
   - *Position:* the phone reader's stacked records conflict with the interface-design
     skill's "wide tables scroll horizontally inside their own container".
   - *Resolved:* applied (A19), below 640 only. The departure is stated in the spec with
     its reason: at 390 the sources column sits about 500px to the right, and sources
     are what the platform says must never be hidden.
7. **DOM order against visual order.** *Synthesiser's note; no persona raised this.*
   - *Position:* the screen-reader seat's A9 puts the aside before the canvas in the
     DOM. A sighted keyboard-only reader, who is not on the panel, would then tab into
     the margin before reaching the canvas it describes (WCAG 2.4.3).
   - *Resolved:* the skip links are the primary fix. The order question is recorded as
     §15 risk 6, to test.
8. **Detail on the sweep chips below 640.**
   - *Position:* the phone reader asked for a detail line per chip when none is active.
     With twelve chips that pushes the canvas below the fold, against the same seat's
     first-screen goal.
   - *Resolved in A18:* one line of totals, plus a line for each active chip.
9. **The strip on phones.**
   - *Position:* the phone reader's own should-level "one-line strip" (D28) and its
     must-level "voids count on the first screen" (A15) overlap.
   - *Resolved:* D28 carries fact 6 into the collapsed line.

## 5. What worked (named by two or more seats) `[SYNTHETIC]`

- **The response column at equal size.** The journalist names it, and the hostile reader
  counts it among the partisan tells the spec already refuses.
- **No sums, no default selection, and ledger sorted by name.** The hostile reader and
  the policy researcher both name this.
- **"Amount unknown" and the no-data hatch never read as zero.** The journalist and the
  policy researcher both name this.
- **The honesty apparatus survives without the graphic.** The screen-reader user
  (tier chips, `DataTable`, `ContestedFact` carry meaning in text) and the policy
  researcher ("n of N" nearly everywhere) both say so. The phone reader notes that none
  of their changes touches a frozen channel.

## 6. Where the synthesiser adapted a must-level amendment `[SYNTHETIC]`

| amendment | reviewer's text | what was applied instead | why |
|---|---|---|---|
| A2 (journalist) | the list replaces the aside's rest state | the list goes above the voids | the voids stay in view (§4 item 2) |
| A2 (journalist) | extend `q` in `GraphExplorer` | an opt-in `claimSearch` prop | four other callers share `GraphExplorer` |
| A5 (hostile reader) | read `ENERGY_META.files[].coverage` | a new generator export, `ENERGY_COVERAGE`, reusing `coverageShape`; until it lands, every line prints its "not declared" form | the field does not exist for energy |
| A6 (hostile reader) | group state institutions under their state name | group only by a recorded `jurisdiction`; never by `st` | `st` is the registered office, and grouping by it is the error §7 refuses |
| A12 (screen reader) | move focus on any `sel`, `claim` or `path` write from outside the aside | move focus only for writes from outside the stage; inside the canvas focus stays and the status region announces | moving focus off the graph on every node press would break keyboard exploration |
| A16 (phone) | — | a new optional ForceGraph prop, `coarseScrollThrough`, Energy only | the other graph pages are unchanged |
| A18 (phone) | a detail line for every chip when none is active | one line of totals | §4 item 8 |
| A19 (phone) | drop `min-width` | `DataTable` gains `stacked` and renders a `<dl>` per row below 640, switched with `display: none` | changing `display` on table elements strips table semantics in some browsers; `display: none` makes assistive technology read exactly one form |
| A1, A3 (journalist, policy) | — | the "Cite as" block uses "research file dated {asOf}", not "sources last read" | the file date is not a per-source retrieval date (D2) |
| A1, A3 (journalist, policy) | — | the CSV adds UTF-8 with BOM, RFC 4180 quoting and a formula-injection guard | cells come from research text written by agents |

## 7. Prioritised amendment list `[SYNTHETIC]`

### Must — applied to the spec (21 reviewer amendments, merged into 20)

| # | amendment | seat | spec sections |
|---|---|---|---|
| A1 | Sources as visible URLs; a plain-text "Cite as" block and a "copy citation" button in the ClaimCard; a smoke assertion | journalist | §5.5, §14 |
| A2 | Search finds claims: `claimSearch` widens `q` to claim text and source titles; "Matching claims" (drawn, superseded, killed, held out) above the voids; search above the canvas on phones | journalist | §2, §3.3, §5.4, §5.5, §9, §10 |
| A3 | "Download CSV" on every table (client-side `Blob`; all pages, not `tp`; header block with run, as-of, filters in words and cannot-show; formula-injection guard) | policy (journalist: could) | §5.7, §11, §14 |
| A4 | Twin columns complete: file `asOf`, `lab`, `d`, `innocentReading`, `upgradeIf`, `killIf`, response text, sources as visible URLs | policy | §5.7 |
| A5 | Search coverage inside a date window: strip fact 10, status line 7, the lanes denominator and a derived gap; "sparse is not clean" | hostile reader | §0.2, §5.2, §5.4, §5.8, §5.13, §9, §14, §15 |
| A6 | `states` relabelled "Offices: union & state"; "states searched" on the chip; lanes grouped by recorded jurisdiction only | hostile reader | §0.2, §3.2, §5.3, §5.8 |
| A7 | "No response recorded" at claim size for every tier, plus "the register does not record whether … was asked"; the contract gap is recorded | hostile reader | §0.3 C14, §5.4, §5.5, §5.11, §15 |
| A8 | No "opposition", "ruling", "government of the day" or party name as a frame on the page; symmetry callouts in strip order, each with a standing line | hostile reader | §5.12, §8, §13 |
| A9 | Aside before the canvas in the DOM; skip-link group; conditional "table view" label | screen reader | §4, §5.4, §15 |
| A10 | Every row that opens a claim does so through a real button, with a spoken name | screen reader | §5.5, §5.7 |
| A11 | Edge and node accessible names carry response counts; rose marks `aria-hidden` | screen reader | §5.4, §6 |
| A12 | Focus follows an answer written from outside the stage; ARIA 1.2 combobox; company box goes to the CompanyTrail below 1280 (merges the phone reader's company-box contradiction) | screen reader, phone | §3.4, §5.3, §5.10 |
| A13 | Status lines duplicated as a DOM `role=status` region; zero state and stale link as DOM | screen reader | §3.3, §5.4, §9 |
| A14 | A 390×844 column in §2 and a mobile two-minute test | phone | §2, §14 |
| A15 | Voids on the first phone screen: strip fact 6, a one-tap line, VoidList under the canvas, the reading key above it | phone | §5.2, §5.5, §10 |
| A16 | The canvas does not capture vertical swipes at rest on coarse pointers | phone | §6, §10, §14 |
| A17 | The aside is a bottom sheet below 1024 | phone | §5.4, §10 |
| A18 | Sweep chips wrap below 640; absence named in prose | phone | §5.3, §10 |
| A19 | Below 640 every table stacks, with every field | phone | §10, §11, §14 |
| A20 | Lanes on a phone: twin first, SVG behind a button, axis clipped around the lit claim | phone | §5.5, §5.8, §10 |

### Should and could — deferred

The deferred list is in the spec as §16, "Deferred amendments": 34 should-level and 13
could-level items, D1–D47, each with its source seats. Several merge amendments from
different seats:

- D12 lanes: policy, screen reader, hostile reader;
- D13 table toggle: policy, phone;
- D27 acceptance gates: phone, journalist, screen reader.

The deferred items most worth doing next, in order:

1. **D27**, the 390 and no-canvas acceptance gates, because without them A14–A20 can
   regress silently.
2. **D1**, amount kinds, because A1's citation still carries a ₹ figure without its kind
   word.
3. **D6**, one reconciled N for "claims".
4. **D7**, the reference-class comparison for index constituents. It is the one question
   the benchmark section exists to answer (HANDOFF: the company dataset *is* the
   reference class).
5. **D12**, the lanes' unplaced decisions and a party marked "not recorded".

## 8. Verbatims `[SYNTHETIC]`

The persona outputs returned summaries and amendments, not the `verbatim` field that the
sweetclaude template asks for. No quote has been made up to fill the gap. Paraphrased
one-line positions:

- **Journalist:** the claim card holds everything they need, but nothing on the page
  gets them to it quickly, and nothing lets them carry it away as a citation.
- **Policy researcher:** they would trust the denominators within a minute, then leave,
  because they cannot export a row.
- **Hostile reader:** the page refuses most partisan tells, but a greyed-out "no
  response" and a thin earlier window with no stated coverage would be their
  screenshot.
- **Screen-reader user:** the page is legible in text, but in the wrong order. The
  answers arrive after the graph, and nothing is announced.
- **Phone reader:** they get the desktop page folded. The honest parts sit two screens
  down or scroll sideways, and the canvas will not let them scroll past it.

## 9. What this review cannot show `[SYNTHETIC]`

- **No real reader took part.** Five personas from one model family, synthesised by the
  same family, are not five independent witnesses. Agreement between them is weaker
  evidence than it looks.
- **The page was not built.** The reviewers read a spec. Timings such as "two minutes",
  "700px jump" and "hundreds of tab stops" are estimates from the spec and the
  components, not measurements.
- **Seats not on the panel:** a sighted keyboard-only reader, a low-vision reader
  zooming to 200–400%, a reader in Hindi or another Indian language, an editor on a data
  desk, and the named parties themselves. §4 item 7 is the first gap this left.
- **Nothing here says the register's content is right.** The review is about
  presentation. Tiers, sources and audit verdicts are for the evidence auditor.

## 10. What to test with real readers first `[SYNTHETIC]`

1. **Two reporters, one of them on a phone.** Task: "find the ₹ figure for {a named
   award} and cite it". Time it and count the interactions (A1, A2, A17).
2. **Two policy researchers.** Task: "export every alleged claim with its response".
   Open the CSV in a spreadsheet and check that the ₹ sign, names and sources survive
   (A3, A4).
3. **Two readers who distrust the platform.** Task: "set the window to 2004–2014 and
   tell us what you conclude". Record whether the coverage line changes that conclusion
   (A5).
4. **One NVDA user and one VoiceOver user.** Task: "open the company Coal India, then
   the first allegation about it, then its response". Count tab stops and note what is
   announced (A9–A13).
5. **One sighted keyboard-only reader.** Test the DOM-before-canvas order (§15 risk 6).

## 11. An observation outside the persona findings `[SYNTHETIC]`

Spec §0.2 fact 1 still says the generated module "ships empty today
(`ENERGY_META.empty === true`)". It no longer does: six sweep files are present and
`empty` is `false`. The empty state still has to pass smoke, but it is no longer the
state that ships first. This was not changed in the spec, because it is not a UX-review
amendment.
