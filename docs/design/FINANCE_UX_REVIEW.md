# /finance spec: synthetic UX review, synthesised `[SYNTHETIC]`

> **Synthetic research notice `[SYNTHETIC]`.** This review was carried out by AI agents,
> each playing one persona archetype. No real reader was consulted and no page was
> rendered: `src/pages/Finance.tsx` and `src/components/finance/` do not exist yet, so
> every persona walked the spec text (`docs/design/FINANCE_PAGE.md`) against the
> generated modules and the shared components it binds to. Its findings are hypotheses to
> validate with real readers, not a substitute for that testing. Every heading, finding
> and recommendation below carries the `[SYNTHETIC]` label, and the label must not be
> dropped when any of it is quoted.

*Written 2026-09-26. Method: the `design-ux-review` synthesis used for `/energy` and
`/welfare` (task completion, deal-breakers, consensus, divergence, what worked,
priorities, verbatims), applied to five persona reviews supplied by the workflow. Output:
34 must-level amendments, U1–U34, applied in place to the spec, each marked
`[UX review] (Un)`; 41 should- and could-level amendments, UD1–UD41, listed at the end of
the spec under "Deferred amendments"; two research items added to the spec's existing
deferred table as X17 and X18. Each of the 104 persona items is applied, merged into an
applied item, or deferred by id. None is dropped. Deferred ids are `UD` rather than `D`
because the spec's §15 already uses D1–D47 for its decisions.*

---

## 0. The panel `[SYNTHETIC]`

| seat | persona | primary task in the walk | returned (must / should / could) |
|---|---|---|---|
| J | Investigative journalist on deadline | one checkable figure and its source within two minutes | 6 / 9 / 4 |
| P | Policy researcher who distrusts any chart without a denominator and exports the table | verify each denominator, then export rows that re-derive the graphic | 6 / 9 / 4 |
| S | Politically hostile reader, either direction | find the missing control, the missing denial, the loaded colour | 6 / 12 / 5 |
| A | Screen-reader user (the graphics are invisible; twins and captions are the page) | answer the lens questions from headings, tables and text alone | 6 / 10 / 5 |
| M | 390 px phone on a slow connection, will not scroll sideways | open a name, a state and a denial on a phone | 8 / 11 / 3 |

Total: 32 must, 51 should, 21 could, 104 in all. P's summary says "7 must, 8 should", but
the list P returned grades six items must. This synthesis uses the returned grades.

### How severity was set `[SYNTHETIC]`

A persona's grade is its view from one seat. The synthesis regrades each consolidated
amendment by the rules used for `/welfare`, in order:

1. **Deal-breaker.** The amendment removes something that stops a persona's primary
   task outright. → must.
2. **Consensus with a must.** Two or more seats raised the theme, and at least one graded
   it must. → must.
3. **Broad consensus.** Three or more seats raised the theme, whatever their grades. → must.
4. **Frozen-rule fix or self-contradiction.** The spec breaks one of its own frozen rules
   (§8.2; "every figure carries its as-of date and source"; "every pattern its
   denominator"; "no-data never means zero"), contradicts itself, or leaves the builder a
   choice when §15 promises there is none. → must, however the seat graded it.
5. **WCAG failure.** The house rule is a WCAG table twin for every graphic. An amendment
   that removes an assistive-technology dead end → must.
6. Everything else keeps its seat's grade and is deferred.

The rules only promote. Every one of the 32 persona musts is applied, most merged with
others. The promotions are listed in §3 and §6.

---

## 1. Task completion `[SYNTHETIC]`

| seat | outcome | returned or inferred | the step that fails |
|---|---|---|---|
| J | L-J uncertain; A-J not in three steps; C-J leaves with no quotable sentence | inferred from J's walk | Find's record rows carry no date or amount (`Kerala` matches 19 loan labels); Find's entity verbs never reach a case file; the citation string carries no amount, date or link back |
| P | **uncertain** | returned | the TSV holds display strings, not a dataset; "record" and "project" share one word; FG-22 and 400-row paging contradict each other |
| S | **completes L-S, A-S and C-S, and stops trusting at six points** | returned | the incumbency asymmetry in `OfficeOnDate`; C9's "government-aligned and critical alike"; controls printed apart from their caveats; the tier filter parting a cancellation from its stated ground; party nodes in two family hues; `StatePanel` unspecified |
| A | first 30 seconds good; the Loans stage then goes silent | inferred from A's walk | no headings inside the lens panel; the flow is `role="img"` with focusable buttons inside; twins behind closed `<details>`; missing financial years have no twin row |
| M | **L-J with uncertainty; C-J not at 390** | returned | BlackRock is neither a row nor a column in the transposed matrix; denials sit off-screen in side-scrolling tables; a RecordCard can be closed only with Escape |

## 2. Deal-breakers `[SYNTHETIC]`

- **M: the page paints late on a slow connection.** §10 puts the three modules in the main
  bundle, and the entry chunk is already 1.51 MB gzipped. → **U1**, applied in a
  corrected form (see §6).
- **M: denials render off-screen on a phone.** §12 lets every table except `ProjectList`
  scroll sideways, which parks the Response columns of Debarments, Mandates, Licences
  and the rule cards 600–900 px to the right. This breaks frozen rule 8 on the device most
  likely to be screenshotted. → **U2**.
- **P, conditional:** "not triggered, provided the machine-readable export columns and
  the legs/projects unit are fixed before build". Both are treated as deal-breakers.
  → **U13** and **U8**.

No other seat declared a deal-breaker. A's silent Loans stage (no headings, a flow
announced as an image) is functionally blocking for that reader, and rules 1 and 5 treat
it as must (U15, U16, U19).

---

## 3. Consensus themes (raised by two or more seats) `[SYNTHETIC]`

| # | theme | raised by (seat grade) | synthesis grade | applied as |
|---|---|---|---|---|
| C1 | **Find does not reach what the reader came for.** Record rows are undated and unpriced, the same project appears three times ungrouped, entity verbs never open a case file, and a result from another lens opens a "go there" card. | J (must ×2, should), M (must), S (could) | must | U3 |
| C2 | **The citation cannot stand alone.** It has no amount, no date and no link back, it is clipboard-only, and ActionsList rows have no source cell at all. | J (must), A (could) | must | U4 |
| C3 | **`StatePanel` is named in §3.4, §4, §7 and §17 but never specified**, and the list under `st` drops loans that the map stipples. | J (must), S (must) | must | U5 |
| C4 | **The ₹ figure's basis is not beside it.** It is converted from US$ at the approval-year rate and it is nominal across 1949–2026, but both facts sit screens away from the sticky headline. | J (must), P (should) | must | U6 |
| C5 | **House words are unglossed**: census, researched, placed, analytic, aggregate, run id, and "record" meaning a leg. | J (must), P (must) | must | U7 |
| C6 | **Denominators in the wrong unit**: projects over legs (§5.1.8), firms over contracts (§5.1.9), and page-computed counts not labelled `computed here` (§5.3.3). | P (must, should), J (could) | must | U8 |
| C7 | **The month-of-approval histogram has no n and no twin.** | P (must), A (should) | must | U9 |
| C8 | **Captions C1 and C2 print shares without their fractions and bases**, and bury the figure the reader wants. | P (must, should), S (should), M (could) | must (rules 2 and 3) | U10 |
| C9 | **`OfficeOnDate` reads as partisan.** Every incumbent falls in the softer open-ended block, and "Tenure covers" invites "approved under FM X". | S (must), J (should, could) | must | U11 |
| C10 | **C9 and the Associations timeline's frame**: the "government-aligned and critical alike" claim, a numerator wider than its denominator, and a denominator that falls after dozens of case files on a phone. | S (must), P (should), M (should) | must | U12 |
| C11 | **Exports are pictures of the screen, not datasets**, and six identical Download buttons do not name their table. | P (must ×2, should), A (must: captions name the table) | must | U13, U20 |
| C12 | **A phone has no Escape.** The RecordCard has no pointer close; Escape "anywhere" fires on a screen-reader mode switch; a `rec` from a shared link has no opener on screen. | M (must), A (should), J (should) | must | U14 |
| C13 | **Twins are the page for A and the export for P**, but closed twins are unspecified and missing axis positions have no row. | A (must ×2), P (must) | must | U15, U17 |
| C14 | **Controls apart from their caveats**: base-rate rows without their symmetry text, `political-trusts` not pinned, debt rows whose labels carry era figures. | S (must, should: FG-RF5) | must | U22 |
| C15 | **The Associations strip counts the wrong response population.** Fact 3 counts allegations answered, while the timeline is about enforcement actions answered; "answered" also overstates denials. | P (should), S (could) | should (no must, two seats) | UD8 |
| C16 | **The UnionBar's structure on a phone and for a screen reader.** The denominator comes after the bars, and the segment button's name is unstated. | A (should), M (could) | should | UD29 |
| C17 | **The HolderMatrix is dense on a phone.** Cell text does not fit at 32 px, and names repeat every header. | A (should, promoted by rule 5), M (could) | must for A's grid semantics (U33); M's glyph-only cells deferred (UD40) | U33, UD40 |

**Single-seat musts kept as musts:** U1, U2 (M, deal-breakers); U16–U20 (A); U21 (P);
U23, U24 (S); U25–U28 (M).

**Items promoted by rule 4 (frozen rule or self-contradiction):** `HolderCard`
unspecified (J should → U29); the §3.5 and §6 live-region wording that disagree (A should
→ U18); the debarments denominator (P should → U8); AdviserComparison counts not marked
`computed here` (J could → U8); the receipts readout with no source (J should → U30);
§12's sticky label column for a chart that has none (M should → U30); the one-line map
readout that truncates the "not zero" clause, and the undefined `({y})` (M should, J
could → U34); C1's bare percentage (P should → U10); the timeline's denominator placed
after the case files below `xl` (M should → U12).

**Items promoted by rule 5 (WCAG):** the class tokens in twin cells (A should → U31); the
in-view mark in ActionsList (A should → U31); the focusable brush axis inside an
`aria-hidden` drawing (A should → U32); arrow interception on a plain `<table>` (A
should → U33).

---

## 4. Divergent opinions `[SYNTHETIC]`

| topic | who, and why | resolution in the spec |
|---|---|---|
| **How much a Find row carries** | J wants date, lender, amount or the exact no-amount text, tier chip and population on every record row, so the right one can be chosen from eight. M wants rows compact at 390 with the software keyboard open (about 400 px left), with the whole row as the primary action and other verbs behind an overflow button. | J's content applied (U3): choosing the right record is the task. M's layout is deferred (UD34) and should be tested on the built page. The two do not conflict at 1280. |
| **Where a RecordCard opens on a phone** | M offers an inline card after the invoking row or a bottom sheet (energy A17). J: a `rec` with no opener on screen (shared link, cross-lens Find) must render under the Find block. A: every panel needs a visible Close, and Escape must be scoped to focus. | Inline after the invoking row (StackTable model), no bottom sheet; a `rec` without an opener renders under the Find block; a Close button and a Back link at every width; Escape scoped (U14, D49). A bottom sheet adds a focus trap and a second scroll context, and nothing requires it. |
| **The fold budget at 390** | M offers (a) move the byline and moved strip facts under the map figcaption and keep FG-33 at 844 px, or (b) relax the gate to two viewports as welfare did. | Both (U27, D50). The synthesiser's estimate with (a) applied is still about 900 px to the bottom of the UnionBar at 390, so (a) alone cannot pass an 844 px gate. The strip, tabs and rail summary stay within 844 px; the UnionBar within 1,688 px. |
| **The keyboard brush** | A offers (a) a slider pair outside the `aria-hidden` subtree, or (b) a pointer-only brush with the rail's Year selects as the keyboard route. | (b) (U32, D48). Two keyboard controls for one parameter is the second-visible-control problem welfare's U20 avoided. |
| **Opening a record from another lens** | J: the reader's click is explicit, so Find should switch lens. The spec (E54, D44) never switches lens itself. | J applied for Find results only (U3); E54 still governs a shared link that arrives with a mismatched `lens`. The reader's act switches the lens, and the page never does. |
| **The ControlCard heading** | S: "the other side" presupposes two sides and places the reader on one. M and A write amendments that use the current heading (an anchor link, a named landmark). | S's rename is deferred (UD9) as an editorial call. The applied amendments refer to the card, not its heading text, so the rename costs nothing later. |
| **The standing line** | S: name party and country in the disowning sentence, and move the Rothschild/BlackRock sentence to the Capital lens. D46 keeps it in the header on every lens. M: the header is already too tall at 390. | Deferred (UD11). S's version is longer and M's budget is shorter; the desk should settle the wording with both constraints in view. |
| **Per-record assembly-election winners in `StatePanel`** | S asks for them as text, labelled "(date test, not a finding)", so the reader need not assemble them. S also flags that party text on lane headers reads as the page's voice (UD15). | Applied with the label and with no count or total per party (U5). The tension is real: if readers take the winner line as attribution, drop it. It is the first thing to test with two readers from opposite sides (§9). |
| **Grounds and the tier filter** | S: re-admit stated-ground rows whenever an action in the case file is shown. P: under a tier filter, say what is hidden rather than silently blanking (matrix row summary). | Compatible. U23 re-admits grounds with their action, in their own dash. P's matrix wording is deferred (UD5). |
| **The map's count metric** | P: `m=n` must count census records only, or the second toggle of one control breaks D4. J wants researched records visible where a Kerala reader acts. | Both: the fill counts census only (U21); researched records naming the state are counted in the readout, the `StatePanel` and the third `ProjectList` group (U5). |
| **The bundle** | M's premise is that the finance modules would enter the entry chunk. The repository shows their node and edge arrays are already there through `DataContext`. | U1 is rewritten to what the page controls (§6). |

---

## 5. What worked (named by two or more seats) `[SYNTHETIC]`

- **The `ReconciliationLine` at rest, and "a of b" everywhere** (P explicitly; S: "the
  honesty apparatus is unusually strong"; A found the strip and its `section` label
  first).
- **The `UnionBar` in the map's frame, and hatch that never means zero** (P, S; M's
  complaints are about where the key sits on a phone, not what it says).
- **Refusing any researched subtotal**, and superseded figures kept as ticks (P, S).
- **Exact null strings**: `amount not stated / in US$ m`, `No response recorded —
  asked/not asked unknown` (A: "worked, as specified"; J's and P's amendments build on
  them rather than against them).
- **One `<dl>` per claim/response pair, the response never hidden, equal size** (A, S).
- **"Comparison set required", and twins exported even when the matrix is withheld**
  (P, S; M's C-J amendment keeps Band A on the phone rather than replacing it).
- **The map as a listbox with class and value in each option's name**, from the welfare
  supersession (A, M).
- **Rose for response and amber for not-recorded, with no party-coded colour.** S checked
  the ramp, rose and amber and found none party-coded.

---

## 6. Where the synthesiser checked or adapted an amendment `[SYNTHETIC]`

Each premise below was checked against the repository on 2026-09-26.

| item | what the seat said | what the repository shows | what was applied |
|---|---|---|---|
| M1 (bundle) | adding the three modules to the entry delays first paint | `src/context/DataContext.tsx` already imports `FINANCE_NODES/EDGES`, `NGO_NODES/EDGES` and `CAPITAL_NODES/EDGES` into the merged graph for every route. The entry chunk `dist/assets/index-BPWZxzGJ.js` is 6.47 MB raw and 1.51 MB gzipped. | A bundler puts each module in one chunk. So the page-only exports (`_BENEFITS`, `_NARRATIVES`, `_VOIDS`, …) of a module already in the entry will land there too, unless the generator splits each fleet module into a graph part and a page part. U1 adds that split as prerequisite **G5**, keeps all page code out of the entry, and adds FG-50, which reports the growth and fails on page code in the entry. Moving the nodes and edges out of `DataContext` would change every route; it is recorded as a platform risk in §18, not a page change. |
| J1 (Find grouping) | P169907 appears twice, at ₹1,735 cr and ₹1,739 cr, grouped by `projectKey` | Three records carry P169907: the census leg `worldbank:c0741` (₹1,760.51 cr, domain `worldbank-projects`) and two researched records, `worldbank:c010` (₹1,739 cr, borrower `fin:state-kerala`) and `literature:c015` (₹1,735 cr). `projectKey` does not scan researched labels (§3.2). | U3 groups Find rows by the `P######` token in `lab` across both populations (the scan behind `dupTokens`), for display only and never for a sum. The FG-40 fixture uses a token shared by a census and a researched record. |
| J1 (count) | `Kerala` matches 19 loan labels | 19 confirmed. | as proposed |
| S1 (incumbency) | Sitharaman has three open-ended MoF role edges | three `role` edges from `pol:nirmala-sitharaman`, dated 2019-05-30, 2019-05-31 and 2019-07-05, none with `to`. | as proposed. Grouping by `(s, t, lab)` is display grouping: E20 still lists each record with its tier and source. |
| S2 ("examined, no action") | list nodes with no enforce edge as "searched, not cleared" | A node in `NGO_NODES` means the research met it, not that it was searched for enforcement actions. `ty` values present: trust 39, fund 15, group 13, party 3, sangh 2, among others. | U12 lists them under "In this register, no enforcement action recorded" with the line "not a finding that none occurred". It does not claim a search. |
| S5 (party hue) | `bjp` fam `recipient`, `party:inc` fam `state`, `rss` fam `recipient` | confirmed in `src/graph/ngo.generated.ts`. | as proposed, derived at build, never hand-listed |
| M5 (fold budget) | option (a) keeps FG-33 at 844 px | the synthesiser's estimate at 390 with (a) applied: site header 56 + kicker, title, standfirst and one-line standing line ≈ 350 + strip 32 + tabs 44 + Find 44 + rail summary 44 + map 300 ≈ 870 px before the UnionBar | both (a) and (b); see §4 |
| P1 (TSV BOM) | `tsv()` should mirror `src/components/energy/csv.ts` | the file exists | deferred as UD4, first in line (§7.2) |

---

## 7. Prioritised amendment list `[SYNTHETIC]`

### 7.1 Must: applied to the spec in place

Order: the deal-breakers first, then consensus musts by breadth, then single-seat musts
by reach, then promotions.

| id | amendment | from | spec sections edited |
|---|---|---|---|
| U1 | **Page code and page-only exports stay out of the entry chunk.** §10 states what is true today; prerequisite G5 splits each fleet module into graph and page parts; FG-50 prints the entry's growth and fails on page code in the entry. | M | §3.3, §10, §16, §18 |
| U2 | **Responses never sit off-screen on a phone.** Below 640 px, every table with a Response, Sources, Innocent-reading or Who-benefits column renders as `StackTable` cards, the response directly under the claim at the same size. FG-12 covers Debarments, Mandates, Licences and Rules at 390. | M | §12, §16 |
| U3 | **Find reaches the record and the case file.** Record rows carry date, lender, amount or exact text, tier and population, grouped by P-number token; entity rows offer `Go to case file`, `Show loans placed here` and an "appears in" line; opening a result from another lens switches the lens as the reader's act; case files get stable ids and a copy-link. FG-40 and FG-41 gain "checkable" assertions. | J, M, S | §2.2, §3.4, §5.0.5, §5.2.4, §7, E54, §16 |
| U4 | **A citation that stands alone.** Amount with kind, approval date, endpoints, tier, first source, and an absolute deep link built at copy time; rendered as visible read-only text too; ActionsList rows gain a Sources cell and a per-row citation. | J, A | §5.1.6, §5.2.4, §16 |
| U5 | **`StatePanel` specified (§5.1.12), and `ProjectList` under `st` in three labelled groups** whose counts equal the readout's. It carries assembly winners as text labelled "(date test, not a finding)" and no party count. | J, S | §5.1.5, §5.1.12 (new), §16 |
| U6 | **The ₹ basis travels with the figure.** RecordCard block 2 carries a conversion line; ProjectList column 7 carries it too; strip fact 2 reads "nominal, from the World Bank projects table, {min}–{max}"; the TSV header gains `# amounts:`. | J, P | §5.0.2, §5.1.5, §5.1.6, §3.2, §16 |
| U7 | **Words the page uses.** `<dfn>` on first use of census, researched, placed, analytic, aggregate; a fourth ReadingKey block; tier chips carry their definition; "record" is defined once as a lending leg. | J, P | §5.0.2, §5.0.3, §5.0.6, §5.1.5 |
| U8 | **Denominators count the unit they divide.** `censusProjects` and `blendProjects`; §5.1.8 "of {censusProjects}"; debarments over distinct firms and distinct contractors; AdviserComparison counts labelled `computed here`; a gate. | P, J | §3.2, §5.0.3, §5.1.8, §5.1.9, §5.3.3, §16 |
| U9 | **The month histogram gets n, a heading and a twin.** | P, A | §5.1.3, §16 FG-21 |
| U10 | **C1 and C2 print fractions and bases.** C1 leads with `₹{unplaced} cr of ₹{rupeeTotal} cr`; C2 names both populations and currencies and says they are not comparable, and quotes the `worldbank-projects` symmetry sentence on state income category when it exists. No caption prints a percentage without its fraction. | P, S, M | §5.1.1, §5.2.3 |
| U11 | **Office windows without the incumbency tilt.** Open-ended block reworded; the date-test sentence first; open-ended bars outline-only and labelled at every Lok Sabha rule; same-office records grouped, not merged; C4 counts open-ended windows and disclaims any election interval; column 12 renamed; a derived gap. X17 requests a structured end. | S, J | §5.1.3, §5.1.5, §5.1.7, §5.5.3, E19, §16 FG-11, deferred X17 |
| U12 | **C9 and the timeline's frame.** "Government-aligned and critical alike" is dropped; C9 says the numerator is wider than the denominator; the in-register-no-action block and the symmetry texts sit under the lanes; below `xl` the population row, the never-added table and the base rate come before the first case file. | S, P, M | §5.2.3, §16 FG-RF2 |
| U13 | **Exports are datasets.** Machine columns (ids, numeric `a_cr`, date precision, placement code and rule, and more); the export covers every page, and FG-22 is corrected to match; buttons and files name their table and row count. | P, A | §3.2, §5.1.5, §7, §16 FG-22 |
| U14 | **Close, return and Escape.** Visible Close and Back link on every panel; inline after the invoking row below 640; a `rec` with no opener renders under Find; Escape scoped to focus; FG-39 and FG-31 amended. | M, A, J | §4, §5.1.6, §7, §12, §16 |
| U15 | **The twin contract.** A closed twin exposes nothing; tabbability follows the real open state; skip links open the twin; summaries name the graphic and its rows; one stage-level "show them all" link. FG-49 adds structural checks. | A, P | §5 intro, §13, §16 |
| U16 | **The flow is a labelled group, not an image**, with named ribbon buttons. | A | §13, §16 FG-49 |
| U17 | **Axis-driven twins iterate the full axis.** Missing FYs and empty years have rows with the null words. | A | §5.1.3, §5.2.1, §16 FG-21 |
| U18 | **Accessible names carry the row subject; announcements use words, not arrows.** §3.5 and §6 now agree. | A | §3.5, §6, §13, §16 FG-49 |
| U19 | **Every stage component has a visible `h3`.** | A | §5 intro, §13, §16 FG-49 |
| U20 | **Every table has a caption naming its population and filters, `th scope`, and `aria-sort`.** | A | §13, §16 FG-49 |
| U21 | **`m=n` counts census records only.** | P | §5.1.1, §6, §16 FG-6 |
| U22 | **Controls stay with their caveats.** Base-rate rows and the domain's symmetry text share one card; `political-trusts` is pinned; DebtContext prints its symmetry text; null rows are chipped as research wording. FG-RF5. | S | §5.0.7, §5.1.11, §5.4.1, §16 |
| U23 | **Stated grounds stay with their action under a tier filter.** D35 is extended. FG-RF6. | S | §3.4, §5.2.4, §6, §15 D35, §16 FG-36 |
| U24 | **Party nodes in two family hues are disclosed.** A derived gap, a ReadingKey sentence and a graph status sentence appear when one `ty` carries two `fam`. FG-RF7; X18 requests the upstream fix. | S | §5.0.6, §5.5.1, §5.5.3, §16, deferred X18 |
| U25 | **The margin's rest state below `xl` is placed.** Texture key under the map, ControlCard after the centre with an anchor, CannotShowCard as one line. | M | §4, §12, §16 FG-33 |
| U26 | **The pinned stack fits at 390.** The ReconciliationLine is not sticky below 640 and renders as a list under the UnionBar; the sticky strip holds fact 1 and the date. | M | §5.0.2, §5.0.3, §12, §16 FG-33 |
| U27 | **The 390 fold budget is decided.** Byline and moved facts go under the map figcaption; strip, tabs and rail summary within 844 px; UnionBar within 1,688 px. | M | §4, §12, §15 D50, §16 FG-33 |
| U28 | **C-J works at 390.** Also-named labels are buttons; a selected Band B holder adds one accented column after Band A. | M | §2.2, §5.3.1, §16 FG-42 |
| U29 | **`HolderCard` specified (§5.3.6)**, with each holding's `d` verbatim and its first source, so J leaves with a quotable sentence and no parsed percentage. | J (promoted, rule 4) | §5.3.6 (new), §16 FG-42 |
| U30 | **Receipts: every bar carries its source, and the chart fits a phone without sideways scroll.** | J, M (promoted, rule 4) | §5.2.1, §12, §16 FG-13 |
| U31 | **Visual classes and marks have words.** Twin cells print meanings, never `hatch`/`stipple`/`hollow`/`value`; ActionsList in-view rows say so in text. | A (promoted, rule 5) | §5.1.1, §5.2.4, §16 FG-21 |
| U32 | **The brush is pointer-only; the rail's Year selects are the keyboard route.** | A (promoted, rule 5) | §5.1.3, §7, §13, §15 D48 |
| U33 | **The matrix declares itself a grid**, and cell names state only the cell. | A (promoted, rule 5) | §13 |
| U34 | **The map readout is a block, not a line**, clause per line, with `({y})` defined; no on-map labels below 640. | M, J (promoted, rule 4) | §5.1.1, §7 |

### 7.2 Should and could: deferred

The full list, UD1–UD41, is at the end of the spec under "Deferred amendments", with
source seats. The five to take first when the build has room:

1. **UD4**, the TSV byte-level properties (BOM, quoting, formula guard) from
   `src/components/energy/csv.ts`: agent-written `d` and `lab` can begin with `-` or `=`.
2. **UD8**, the Associations strip's response fact over enforcement actions, worded as "a
   recorded response of any kind".
3. **UD1**, RecordCard block order, so J's four needs (figure, date, source, response)
   sit in the first screen of the card.
4. **UD33**, "Show connections" loading the graph on a phone. The "any" path in §2.2
   otherwise ends on an unloaded placeholder at 390.
5. **UD2**, the no-₹ cell's first sentence of `d` in the `title`, which removes the
   "the US$ figure is somewhere" misreading.

---

## 8. Spec self-contradictions surfaced `[SYNTHETIC]`

Defects in the spec, not reader preferences. Each is fixed by the amendment named.

| where | contradiction | fixed by |
|---|---|---|
| §3.5 "carries every `{N} → {k}`" | §6: "announces `from {N} to {k}`" | U18 |
| §16 FG-22 "data rows equal the on-screen twin rows" | §5.1.5: pages at 400 and exports every filtered row | U13 |
| §5.1.8 "under {projects} projects of {census} census projects" | `{census}` counts legs, not projects | U8 |
| §5.1.1 C1 bare `{unplacedPct}` | §8.2 rule 11: "`a of b` is always printed" | U10 |
| §5.3.3 AdviserComparison record counts | §8.2 rule 11: a page-computed number is labelled `computed here` | U8 |
| §12 receipts "sticky 96 px label column" | the receipts chart has no label column | U30 |
| §13 flow `role="img"` with focusable ribbons | an image role makes its children presentational (welfare D33) | U16 |
| §13 clock drawing `aria-hidden` | §7: "Shift+arrows on the focused axis" | U32 |
| §4, §7, §17 name `StatePanel` and `HolderCard` | no section specifies either; §15 says "the builder has nothing left to choose" | U5, U29 |
| §2.2 A-J "type Oxfam → the block in ActionsList" | §5.0.5: no Find verb reaches a case file | U3 |
| §2.2 C-J and FG-42 at 390 | §5.3.1 mobile: BlackRock is neither row nor column | U28 |
| §12 pinned stack ≤ 140 px | §5.0.3 ReconciliationLine "in the sticky wrapper, always rendered" (5–6 lines at 390) | U26 |
| §16 FG-33 at 390×844 | the header specified above it is about 700–900 px | U27 |
| §8.2 rule 8 (responses at equal size) | §12: side-scrolling tables with the Response column off-screen | U2 |
| §5.1.1 `m=n` counts census and researched | D4: the two populations are never summed | U21 |
| §5.2.1 receipts twin "every NATIONAL row" | "no-data never means zero": a missing FY has no row | U17 |
| §5.0.6 "Hue is only the kind of actor" | two party nodes carry different `fam` in the NGO module | U24 |
| §5.2.3 C9 "government-aligned and critical alike" | the `fcra-actions` symmetry text: aligned associations were not examined in that file | U12 |
| §7 "Escape anywhere" | a phone has no Escape; screen readers use Escape to leave forms mode | U14 |
| §5.1.1 readout `({y})` | undefined | U34 |
| §5.1.3 month histogram | "every pattern its denominator" and a WCAG twin for every graphic | U9 |

---

## 9. What to validate with real readers `[SYNTHETIC]`

In order of how much depends on it:

1. **Two readers from opposite sides, cold, on the Loans clock and `StatePanel`.** Do they
   read an open-ended bar or an assembly-winner line as attribution ("approved under FM
   X", "a BJP state got it")? (U5, U11) If they do, drop the winner line.
2. **A journalist timed from arrival to a pasted citation** for `Kerala` and for
   `Oxfam`. Target: under two minutes, with the right one of three P169907 records.
   (U3, U4)
3. **Screen-reader walk of the built page** (NVDA with Firefox, VoiceOver with Safari):
   can a user answer L2, A1 and C1 from headings, captions and twins alone? (U15–U20, U31)
4. **Phone walk at 360–414 px on a throttled connection**: time to first paint, and
   whether a reader finds a denial in Debarments without scrolling sideways. (U1, U2, U26,
   U27)
5. **A researcher opening the ProjectList TSV** to re-derive the map twin and the year
   table. (U13; UD4)
6. **The map misreading in §18 risk 2**: does a reader say "little went to states"?
   (U10, U25, U34)

---

## 10. Verbatims `[SYNTHETIC]`

Excerpts from each seat's own summary. No seat returned an in-voice line.

- **J:** "J cannot tell which of eight undated, unpriced rows is the 2019 DPO, and will
  open the first one, so FG-40's 'choose the first record' passes while the real task
  fails."
- **P:** "The export is a picture of the screen, not a dataset."
- **S:** "Both are honest and both look partisan."
- **A:** "Inside the Loans panel there are no headings between the lens h2 and
  'Contracts', so the H key skips straight past the map, flow, clock, strip and list; the
  stage is structurally invisible."
- **M:** "The page is honest but folded from the desktop; the things this reader needs
  first (a name, a state, a denial) are each behind something."

---

## 11. What this review cannot show `[SYNTHETIC]`

- **No page was rendered.** Every layout figure (fold heights, line counts at 390, chunk
  growth) is an estimate from the spec, except the entry-chunk size and the module facts
  checked in §6.
- **The seats are archetypes written by the same kind of agent.** Agreement between them
  is weaker evidence than agreement between five real readers, and it may be the
  consensus of one model with itself.
- **No assistive technology was run.** A's findings are structural readings of the
  specified ARIA, not observed behaviour in NVDA, JAWS, VoiceOver or TalkBack.
- **Severity regrading is the synthesiser's.** It follows the rules in §0 and promotes
  only. A reader may still find a deferred item more serious than an applied one.
