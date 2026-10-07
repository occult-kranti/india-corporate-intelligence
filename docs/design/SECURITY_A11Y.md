# /security — The money India spends on force — WCAG 2.1 Level AA audit

*Audit A11Y-006 · scope: `/security` on a pinned build of the working tree as it stood on
2026-10-07 (the `force` register `run-122278453551`, read to 2026-10-04; the CPPP security slice
as compiled in) on all three lenses (`budgets` default, `lens=footprint`, `lens=procurement`), at
rest and under `view=table`, with every margin panel kind opened (FY readout, cell, state, vendor),
under filters (`tier`, `payer`, `fy`, `comp`), with a Find query, and the scaffold build
(`FORCE_META.empty`) · target: WCAG 2.1 AA · date: 2026-10-07 · procedure: the sweetclaude
`testing-accessibility` skill's seven steps, with its `.sweetclaude` state files and issue filing
left out. Nothing in this document was edited into the page: it is a report, and every fix below
is a proposal. The site chrome (sidebar, mobile header) was swept only where it reaches into the
page; findings there are marked "site".*

---

## 0. Summary

| severity | count | definition (from the skill) |
|---|---|---|
| **Critical** | **0** | a reader with a disability cannot complete the task at all |
| **Serious** | **4** | significantly difficult — a workaround exists but is painful |
| **Moderate** | **7** | confusing, task completable with effort |
| **Minor** | **12** | small friction |
| total | **23** | |

**Fix pass, 2026-10-07 (frontend):**
- Fixed: all four Serious (S1–S4) and all seven Moderate (M1–M7); minors m2, m4, m5, m7, m8, m9,
  m10 and m12.
- Fixed in part: m3 (the graph's jump-to input belongs to the shared `GraphExplorer`, which this
  page does not modify, D45).
- Not fixed: m1, whose names the suite pins (AC-107 and the per-person check); m6 (site) and m11
  (advisory), as recorded.

Each finding below carries its mark.

**Nothing blocks release under the skill's rule** (Critical findings block). Four Serious
findings should be fixed before the suite joins `test:pages`, because two of them are the page
saying something false or nothing at all to a reader the page was built for.

What the page gets right, measured: every control in `main` has an accessible name in Chromium's
own accessibility tree (0 unnamed of 405–6,822 controls per lens and view, at 1440 and 390); every
decorative `<svg>` is `aria-hidden` and nothing focusable sits inside an `aria-hidden` subtree; the
three maps are named `role="listbox"`es whose 36 options carry the class in words ("Chandigarh: no
row in this register", "Delhi: police paid by the Union, not a state line"); every drawing but the two
B6 maps has a skip link, and every graphic a twin whose rows reconcile to the marks drawn (§4); every twin `<table>` has a
`<caption>` with its rows, population, filters and read-to date, and every `th` has `scope`; the
lens tabs, the FY axis, the ledger grid (at ≥ 640 px), the maps, the segmented and roving groups,
the twins, Find, every panel's Close / Back to / Escape and "Show connections → Back to" all work
from the keyboard and return focus where they came from (41 of 43 keyboard checks pass at 1440; of
the two that do not, one is M3 and the other a probe artefact of two same-named links, m4); the
spec's keyboard budget holds (§3); the one polite live region speaks every lens, filter, panel and
Find change in words; reduced motion turns off every transition and the graph's draw loop; the
2 px accent ring (8.76:1) is drawn on every page control; text contrast passes on every lens at
rest (22,808 text-bearing elements swept across the three lenses at 1440 and 390; the only ones
under 4.5:1 are inside `aria-disabled` controls); the no-data hatch is never a zero anywhere
(7,229 hatched ledger slots, 0 named or printed as 0); and the scaffold build prints its note on every surface, names every control and
does not scroll sideways at 390.

What fails is concentrated in four places:

- **S1 — below 640 px the ledger grid does not move.** The arrow keys do nothing: the grid's ref
  is attached only to the desktop table, so a keyboard reader on a phone, or at 400 % zoom, reaches
  one cell of 3,556 (FY1999-00 of the first lane).
- **S2 — the Budgets lens scrolls sideways at 390 and 320.** `main` is 573 px wide on every
  Budgets state, because the spend map's year `<select>` sizes itself to its longest option.
- **S3 — at ≥ 1280 px the open panel is outside the page.** It is portalled to the first child of
  `<body>`: outside `main` and every landmark, first in reading order, Tab from its last control
  goes to the sidebar's first link, Shift+Tab from its heading leaves the document, and it sits
  fixed over the filter rail, so 16 rail controls take focus invisibly underneath it.
- **S4 — under a payer or tier filter the ledger says "no row" for rows that exist.** 3,439 cell
  names read "BE no row, RE no row, actual no row" where the slot holds a row the filter hides, and
  the hidden slot is drawn at 1.1:1 against the page. The page's own key says "hidden by filter …
  not absent"; the grid tells a screen reader the opposite, and shows a sighted reader nothing.

## 1. Method

**Fixtures.** `npm run generate` (`generate: OK`) and `npm run validate` (`validate: OK`, 30
warnings, all declared) were run first; the page was then built with `npx vite build --outDir
<scratchpad>/dist-a11y` and served with `<scratchpad>/serve-pin.mjs` on its own port, so a
concurrent rebuild by another agent could not change the page under the probes. A second build
for the suite (`dist-sec-a11y`, below) is byte-identical to it (`diff -rq` empty), so no source
changed during the audit. The scaffold is the suite's `dist-empty-security/` (built 2026-10-07
09:40, after the last `/security` source change at 07:47; its `modules/force.generated.ts`
declares `"empty": true`), copied to the scratchpad and served from there. The working tree's raw
files and generated modules were not touched.

**What was run.** The skill's step 2 asks for axe, WAVE or Lighthouse; the project rule is no
new dependencies, so step 2 was replaced by Playwright 1.62.1 probes against the pinned Chromium at
`/opt/pw-browsers/chromium` (`<scratchpad>/a11y-sec/*.mjs`, output in `a11y-sec/out/`):

- **Names and structure** (`names.mjs`): Chromium's full accessibility tree over CDP
  (`Accessibility.getFullAXTree`) on each lens, rest and `view=table`, at 1440 and 390, with the
  graph mounted — unnamed controls, roles, `img`/`figure` names; plus DOM checks for SVG roles,
  focusables inside `aria-hidden`, label-in-name, `title`-only names, heading order, duplicate
  ids, dangling `aria-*` references, table captions and `scope`, landmarks, live regions and
  new-tab links.
- **Tab walks** (`tab.mjs`): every stop from the top of the document until focus leaves it, per
  lens at 1440 and 390, each stop with its rect, computed outline and shadow, on-screen state and
  whether it lay under the sticky stack. Focus-ring screenshots (`focus.mjs`): screenshot, focus
  with keyboard modality, screenshot, count changed and accent-coloured pixels against the ring's
  expected area, for 25 control kinds.
- **Keyboard operation** (`keys.mjs`, 43 checks, at 1440 and 390): tabs (arrows, Home, End,
  Enter, Space), FY axis, ledger grid, both state maps and the footprint map (arrows, Enter,
  Escape), segmented groups, the year select, skip links, twin summaries, "show them all", Table
  view, Find → results → Show connections → Back to, kind chips including an `aria-disabled` one,
  the chapter links, the vendor-grid skip link, a vendor card, a roving toolbar; where focus goes
  after each panel's last control and before its heading (`dbg-tb.mjs`); which focused elements
  lie under the open panel (`elementFromPoint`); how much of each element the page moves focus to
  is visible below the fixed header and pinned stack (`obscure.mjs`); in-page links
  (`anchors.mjs`); a 54-stop walk through the connection graph (`graph.mjs`).
- **Contrast** (`contrast.mjs`): a token table computed from `src/index.css` and the page's own
  colours (Security.tsx `PAGE_CSS`, ui.tsx, Ledger.tsx, StatePair.tsx), and a rendered sweep of
  every text node's element in `main` and the panel layer — foreground composited through every
  ancestor's opacity, background through every ancestor's colour, the large-text threshold
  applied — on eight URL states at 1440 and 390.
- **Colour independence** (`colour.mjs`, `hidden.mjs`, `maps.mjs`, `forced*.mjs`): the dash and
  hatch on every mark kind read from the DOM; the words behind every hatched and hidden slot;
  greyscale screenshots of the stack, ledger, maps, award chart, case timeline, footprint and key;
  a `forced-colors: active` context.
- **Motion** (`motion-mobile.mjs`): `prefers-reduced-motion: reduce` and `no-preference`, with
  `document.getAnimations()` and computed transitions sampled at rest, after a lens change, a
  hover, a tier change and with the graph mounted, and two canvas screenshots 1 s apart.
- **Reflow** (`motion-mobile.mjs`, `m390.mjs`, `e2.mjs`, `spacing.mjs`): 390 × 844 and 320 × 844
  (mobile emulation, dpr 2) over eleven URL states with every `<details>` opened; the overflowing
  element found by walking for boxes past `main`'s right edge outside any scroll container; the
  text-spacing override (1.4.12) at 1280; 640 × 400 as 200 % of 1280 × 800 (1.4.4).
- **The scaffold** (`empty.mjs`): names, Tab walk, overflow, zeros and the map options on all three
  lenses at 1440 and 390.

These catch roughly what axe catches for names, roles and contrast, and more for keyboard
operation; they do not catch what a screen reader would say (§6).

**Contrast arithmetic.** WCAG relative luminance. Composited values (an `rgba` stroke, an element
at `opacity`) are alpha-blended onto `--color-bg` `#0a0a0c` (or the stated ground) before the
ratio is taken. Text needs 4.5:1 (3:1 at ≥ 24 px or ≥ 18.66 px bold); graphical objects and
component boundaries 3:1.

## 2. Findings by criterion

Severity: S = Serious, M = Moderate, m = Minor. Each finding names the file and the line to
change; line numbers are those of the working tree on 2026-10-07.

### 2.1.1 Keyboard · 2.4.3 Focus Order · 2.4.7 Focus Visible

**S1 · Serious — below 640 px the ledger grid's arrow keys do nothing (2.1.1).** At 390 (and at
any width under 640 px, which includes 1280 px at 400 % zoom) the ledger is 34 group tables, each
`role="grid"`, with one roving cell (`tabindex="0"`) across all of them. ArrowRight, ArrowDown,
Home and End leave focus on FY1999-00 of "Ministry of Defence — total" (measured: the focused
rect does not move after 13 key presses). Cause: `LineLedger` attaches `gridRef` only to the
desktop table (`ref={key === 'all' ? gridRef : undefined}`, Ledger.tsx:274), and `focusCell`
looks the next cell up through `gridRef.current` (Ledger.tsx:196), which is `null` on the narrow
layout; cells in a closed group `<details>` would be unreachable even with the ref. Every other
cell of the grid — and the cell card with its share of the demand and previous year — is
unreachable by keyboard on a phone. *Workaround:* the long-form and coverage twins hold the same
rows. *Fix:* look the cell up from the figure (`figureRef.current.querySelector(\`button[data-cell="${li}-${fi}"]\`)`),
open its group's `<details>` before focusing, and keep the one roving stop across the 34 tables.

*Fixed 2026-10-07: `LineLedger` looks the next cell up from the figure (`figureRef`), not the desktop table, and opens every closed `<details>` around it (its group and the bodies' summary) before focusing it; one roving stop across all the tables. Measured on a pinned build at 390: ArrowRight, ArrowDown, End and Home move focus 0-0 → 0-1 → 0-2 → 1-2 … 6-2 → 6-27 → 6-0, with one `tabindex="0"` cell. m10 is fixed with it.*

**S3 · Serious — at ≥ 1280 px the open panel is outside the page's focus order and covers the
rail (2.4.3, 2.4.7; 1.3.1).** The panel (FY readout, cell, state, vendor, case, body, record) is
portalled into a `div[data-sec-layer]` prepended to `<body>` (Security.tsx:249–253, 368–371) and
drawn `fixed right-4 top-16 w-[23rem]`. Measured at 1440 × 900 with the FY readout open:

- Tab from its last control ("Back to the chart") goes to the sidebar's first link
  ("Dashboard"), then through 30 site links before reaching the page again.
- Shift+Tab from its heading leaves the document (focus to `<body>`).
- It is outside `main` and every landmark; the layer has no name.
- It covers the margin column (x 1056–1424, y 64–884): Tabbing through the page with it open, 16
  rail controls (among them Payer Union and States, the State select, both FY selects and the
  Stage options) take focus while `elementFromPoint` at their centre
  returns the panel — the ring is drawn underneath it.

*Workaround:* Escape, Close or "Back to …" close it and return focus. *Fix:* render the panel in
the `<aside data-margin>` it belongs to (Security.tsx:349–357), before the rail, as
`position: sticky; top: 4rem` with its own `max-height` and scroll, so it is in `main`, in reading
order after Find, and pushes the rail down instead of covering it. The spec's §5.0.5 wish ("first
in the document's reading order") is met by placing it first in the aside, not first in `<body>`.

*Fixed 2026-10-07: the open panel is no longer portalled to `<body>`. At ≥ 1280 px it renders inside `main`, as the first block of the page's `<article>` after its `h1` and before any `h2` (§5.0.5's "first in the document's reading order"), drawn fixed over the head of the margin as a named region ("Open panel"). Its keyboard order follows its opener: Shift+Tab from its heading or first stop returns to the control that opened it (Find when that is gone), and Tab from its last stop continues with the control after the opener. The margin `<aside>` sticks beneath the open panel (top = the panel's bottom + 12 px, with its own scroll) and the panel is capped at 60vh, so nothing in the margin is covered. Measured on a pinned build at 1440 × 900 with a ledger-cell panel open: the layer is inside `main` and its `h2` is the first `h2` on the page; focus moves to the panel heading; Shift+Tab from it lands on the ledger cell that opened it; Tab from "Back to the ledger" lands on the next stop after the ledger grid (in `main`); 0 of 23 margin controls lie under the panel when focused (`elementFromPoint`).*

**M1 · Moderate — the active option on every map is a 0.47 px hairline (2.4.7).** On the spend
and strength maps (B6) and the footprint map (F1) the option under `aria-activedescendant` is
stroked `--color-text-secondary` at 0.8 user units (StatePair.tsx:108), which the viewBox scales by
0.59 to 0.47 CSS px. Arrowing from Punjab to Haryana changes 310 pixels over a 39 × 46 px state
(both outlines together); in the screenshot the active state cannot be found by eye. The `<svg>`
itself carries the 2 px ring, and the readout line under each map names the active state in
words, which is why this is not Serious. *Fix:* draw the active option with a 2 px
`vector-effect="non-scaling-stroke"` stroke in `--color-text`, distinct from the 2.4-unit accent
of the selected option.

*Fixed 2026-10-07: while a map has focus, the option under `aria-activedescendant` is drawn again, last, as a 2 px `vector-effect="non-scaling-stroke"` outline in `--color-text` (`data-active-outline`, inside the `aria-hidden` group). Neighbouring states no longer overdraw it, and it stays distinct from the accent stroke of the selected option.*

**M2 · Moderate — on a phone, focus returns under the fixed header and pinned stack (2.4.7,
2.4.3).** At 390 × 844 the site header and the pinned stack cover the top 206 px of `main`.
`closePanel` and the effect behind it (Security.tsx:139–150, 230–238) restore focus with
`scrollIntoView({ block: 'nearest' })`, which aligns the element to `main`'s top edge. Measured
after Escape: the FY axis button 0 % visible, the ledger cell 0 % visible, the spend map 31 %
visible. The vendor panel's heading also opens partly under the stack. At 1440 every one of these
is 100 % visible. *Fix:* `main { scroll-padding-top: <header + stack height> }` set from the
stack's measured height (the stack already has `data-pinned-stack`), or `block: 'center'`.

*Fixed 2026-10-07: `reveal()` (ui.tsx) runs wherever the page moves focus back or into a panel (Close, Escape, `Back to …`, the fallback targets, the panel heading). After `scrollIntoView({ block: 'nearest' })` it scrolls `main` so the element clears the bottom of `[data-pinned-stack]` by 8 px. No `scroll-padding` was set, so the Q-blocks' `scroll-mt-40` anchors are unchanged.*

**M3 · Moderate — the Cases chapter link puts focus off the screen (2.4.7, 2.4.3).** "Cases,
chapter 4 — 3 control pairs, 1 case(s) without one" (Procurement.tsx:52–66) scrolls the chapter
heading to the top and then focuses the first pair row's button with `preventScroll`, which lies
below the fold: at y 961 in a 900 px viewport at 1440, y 1,175 in 844 at 390 — 0 % visible both
times. *Fix:* focus the chapter's `h3` (`#sec-P4-h`, already `tabIndex={-1}`) as the other three
chapter links do, or drop `preventScroll`.

*Fixed 2026-10-07: the link still lands on the first pair's button, which is the path AC-121 counts, and `reveal()` scrolls that button into view below the pinned stack after focusing it.*

**M4 · Moderate — in-page links scroll but leave focus behind (2.4.3).** "rated in Q5: the stories
about {vendor}" (Procurement.tsx:260, 737; one per vendor card and comparator), the rail's
"Not offered: party, government, era …" refusals link and the control card's chapter links (both
`Anchor`, ui.tsx:458), and the strip's "what resolves at which level" link (Chrome.tsx:168)
call `scrollIntoView` without moving focus. Measured: "rated in Q5" scrolls `main` from 7,028 to
61,923 px, and the next Tab scrolls it back to 7,073 and the next source link in the same card;
after the refusals link, the next Tab lands in Contested, not Refusals. The Delhi-line link and
every skip link do move focus, and are the pattern to copy. *Fix:* in `Anchor` and the two inline
handlers, focus the target heading (each already has `tabIndex={-1}`) after scrolling.

*Fixed 2026-10-07: one helper, `goTo(id)` (ui.tsx), scrolls the target to the top and moves focus to it, or to its first heading (given `tabIndex={-1}` if it has none). `Anchor`, both "rated in Q5" links and the strip's "what resolves at which level" link use it.*

**m10 · Minor — the first ledger cell's ring is partly under the sticky lane label at 390
(2.4.7).** 53 % of the ring's expected area is visible for the FY1999-00 cell; its left edge sits
under the 120 px sticky label column. *Fix:* `scroll-margin-left: 124px` on the cell buttons.

*Fixed 2026-10-07: the cell buttons carry `scroll-margin-left: 124px` below 640 px.*

**m11 · Minor (advisory) — the Procurement lens is 457 Tab stops at 1440.** P1 takes 240 (every
source link on every vendor card is its own stop), P4 96, P3 68. The spec allows this (vendor
cards are not composite widgets, §13), and the vendor-grid skip link and the chapter links keep
the first case pair at stop 9 of `main`. *Fix, if wanted:* wrap each card's sources in the
page's existing `Roving` toolbar, as the base-rate and contested sources already are.

### 1.3.1 Info and Relationships · 4.1.2 Name, Role, Value · 1.4.11 Non-text Contrast

**S4 · Serious — under a payer or tier filter the ledger names hidden rows "no row" and draws
them at 1.1:1 (1.3.1, 4.1.2, 1.4.11).** With `payer=states` or `tier=reported`, 3,439 ledger slots
are in the `hidden` state. Each slot's own label is right ("BE: 1 row hidden by the payer filter
— not absent") but it sits inside the `aria-hidden` drawing; the focusable cell's name, built by
`slotWord` (Ledger.tsx:126), returns `'no row'` for both `hatch` and `hidden`, so all 3,439 cells
read e.g. "Ministry of Defence — total — Ministry of Defence — all demands, FY2002-03: BE no row,
RE no row, actual no row". Visually the hidden slot is `#23272f` at opacity .45
(Security.tsx:42), 1.1:1 against `--color-bg`: in the screenshot the filtered years read as empty
gaps between hatches. The reading key says the opposite ("hidden by filter — rows that exist but a
filter hides, drawn dimmed, never hatched — not absent"), and the coverage twin says it correctly.
A screen reader and a low-vision reader are both told that the register has no row where it has
one. *Fix:* `slotWord` for `hidden` → `` `${s.hidden} hidden by the ${s.why} filter` ``; draw the
hidden slot with a 1 px dotted `--color-text-muted` outline (5.32:1) and no fill, so it is ≥ 3:1,
distinct from the hatch, and still "dimmed".

*Fixed 2026-10-07: `slotWord` names a hidden slot `{k} row(s) hidden by the {tier|payer} filter — not absent` in the cell's name, using the same words as the slot's own label and AC-59. `.sec-hidden-slot` has no fill and a 1 px dotted `--color-text-muted` outline (5.32:1), drawn distinct from the hatch.*

**m3 · Minor — `aria-*` references to elements that are not there (4.1.2).** The two inactive lens
tabs carry `aria-controls="sec-panel-footprint"` / `"sec-panel-procurement"`, panels that are not
rendered; the graph's jump-to input carries `aria-controls="jumpto-listbox"` while the listbox is
closed. *Fix:* set `aria-controls` only on the selected tab (WAI-ARIA allows it), and only while
the listbox is open.

*Fixed 2026-10-07 (in part): only the selected lens tab carries `aria-controls`. The graph's jump-to input belongs to the shared `GraphExplorer`, which this page does not modify (D45), and was not changed.*

**m12 · Minor — five of seven figures have no accessible name; the B6 maps have no skip link.**
The ledger figure, both B6 map figures, the Delhi-line figure and the connections figure are
`role="figure"` with `aria-describedby` only. The B6 maps are one tab stop each, so the missing
skip link costs little, but the spec (§13) asks for one before every drawing. *Fix:*
`aria-labelledby` the Q-block's `h3` on each figure, as B1 and B2 do.

*Fixed 2026-10-07: the ledger figure is named by `sec-B3-h`, the two B6 map figures and the Delhi-line figure by their own `h4`s (given ids), and the connections figure by `sec-conn-h`. Each B6 map now has a "Skip to the table" link after its heading that opens its twin (`spend-map`, `strength-map`) and focuses the caption. Measured on a pinned build at 1440: the spend map is reached in 27 Tab presses from the first stop in `main` (AC-121 allows 30).*

**m4 · Minor — two links with one name in one list (2.4.4).** The Contested toolbar holds two
links named "Bombay High Court, Union of India through the Indian Army v State of Maharashtra …"
and the Gaps toolbar two named "Expenditure Budget 2026-27, Notes on Demands for Grants, Demands
19–22 …" (same title, different URLs). The spec (§13) forbids it. *Fix:* the `Src` component
already prints the host after the title in its list form; add it, visually hidden, in the inline
form.

*Fixed 2026-10-07: the inline source list gives a link a name only where its title is not unique — the same title twice in one list, or a title the register gives to more than one document — as `{title} ({host}, for {what the sources are for})`. The name starts with the visible title (2.5.3), and the link's visible text and `innerText` are unchanged, so AC-47's quoted-figure check reads the same characters. A name that would carry a ₹ is not set (AC-47: no `aria-label` holds a ₹), so a quoted figure keeps its note.*

### 1.4.10 Reflow · 1.4.4 Resize Text · 1.4.12 Text Spacing

**S2 · Serious — the Budgets lens scrolls sideways at 390 and 320 (1.4.10).** `main.scrollWidth`
is 573 px at a 390 px (and a 320 px) viewport on every Budgets state measured: at rest, `view=table`,
a cell panel, a state panel, a Find query and a filtered view. The whole page — strip, tabs, map —
slides when swiped. The element is the B6 label "Year and stage of the spend map"
(StatePair.tsx:298–305): a `flex` row whose `<select>` sizes itself to its longest option,
"2023-24 actual · 30 states — GSDP in this build is for 2024-25 only" (557 px). Footprint and
Procurement measure 390 / 390 and 320 / 320 in every state, `view=table` included. *Fix:* make the
label a block, give the select `w-full max-w-full min-w-0`, and move "GSDP in this build is for
2024-25 only" out of the option text into the select's description.

*Fixed 2026-10-07: the label wraps (`flex-wrap min-w-0 max-w-full`) and the select is `min-w-0 max-w-full`. An unavailable year's visible text reads `{fy} {stage} · {n} states — unavailable`. Its full reason (`… — GSDP in this build is for {GSDP_FY} only`) stays in the option's `aria-label`, where AC-81 and AC-118 read it, and is also printed as a line under the select, linked by `aria-describedby`. Measured on a pinned build: `main.scrollWidth` = `clientWidth` = 390 at 390 (at rest, `view=table`, `st=mh`, `payer=states`) and 320 at 320.*

**m2 · Minor — the Find input overflows the margin at ≥ 1280 px.** In the wide layout Find sits in
the 22 rem margin column, but the input keeps `sm:w-[28rem]` (Chrome.tsx:420), so `main` scrolls
64 px sideways at 1280 and 1440 on every lens, in both the full and the scaffold build. Not a
1.4.10 failure at these widths, but the same symptom. *Fix:* `xl:w-full` (or `max-w-full`).

*Fixed 2026-10-07: the Find input is `xl:w-full max-w-full`.*

**m8 · Minor — office-lane labels clip under text spacing (1.4.12).** With the 1.4.12 override at
1280, "Defence", "Defence" and one other 56 px `truncate` label in the Q2 drawing are clipped. The
drawing is `aria-hidden` and the list under it carries every word. *Fix:* let the label column
grow (`min-w-[56px]` instead of `w-[56px]`).

*Fixed 2026-10-07: the label keeps its 56 px column, which keeps the lanes aligned, and wraps (`break-words leading-tight`) instead of truncating.*

200 % (640 × 400): no overflow on any lens. Text spacing: nothing else clipped.

### 1.4.1 Use of Colour · 1.4.3 Contrast (Minimum)

**M5 · Moderate — vendor class in the award chart is told by hue alone (1.4.1).** Each priced
award is a circle filled `--color-blue` for a public-sector vendor or `--color-accent` for a
private, JV or foreign one (Procurement.tsx:24, 149); position within a year column differs by
±3 units. In greyscale the two classes are the same grey (screenshot `grey-awards.png`). The
caption says "fill: blue public sector, gold private, JV or foreign", and the twin carries the
class in words. Hue is the frozen family channel and must not be restyled, so the fix is a new
channel, not a new colour. *Fix:* position — two lanes per year (public above the axis's centre
line, private below), or two small multiples on one scale.

*Fixed 2026-10-07: class is now read three ways. First, the family hue (frozen). Second, the half of the year column: each mark now stays inside its half, public left and private right, with jitter ≤ 8 % of the column. Third, the shape: a circle for public sector, a diamond for private, JV or foreign. The mark keeps `data-mark="award"`, `data-cr`, its fill, stroke and dash, and the caption names the key at every width.*

**M6 · Moderate — the FY filter dims text below 4.5:1 (1.4.3).** With `fy=2010-11..2015-16`, text
outside the range is drawn at opacity .2–.25: the stack's reconciliation glyphs (=, ≠, ·) at
1.35:1, the latest year's pension label "pensions ₹1,71,338.22 cr · 21.84% of stack, computed here"
at 1.93:1, and the ledger's year headers at 1.25:1 — 35 elements at 1440, 227 at 390 (Stack.tsx:186,
Ledger.tsx:156 and its header). Dimming is the spec's "dimmed, not removed", but there is no
exception for de-emphasised text. *Fix:* dim the drawing, not the words: keep text at
`--color-text-muted` without opacity (5.32:1) and mark out-of-range columns with a hatch-free
band or a bracket.

*Fixed 2026-10-07: the ledger's year headers are no longer dimmed; under an FY filter the in-range headers are drawn in `--color-text` over a 2 px accent rule. The stack's reconciliation marks (=, ≠, ·) sit in their own row beneath the columns, one per defence column, at full `--color-text-muted`. The latest year's pension label and a column's "partial: k of n demands" label stay inside their column while it is at full strength (where AC-128 reads them), and when the FY or tier filter dims that column they are drawn over it from outside it, at the column's own place, never under its opacity; the column element keeps the 0.2–0.3 opacity AC-78 and AC-141 pin. Measured on a pinned build at 1440 with `fy=2010-11..2015-16`: the pension label "pensions ₹1,71,338.22 cr · 21.84% of sta…" composites to opacity 1 (text 15.60:1); at rest it is inside the latest column (`2026-27`).*

**M7 · Moderate — under forced colours the Budgets drawings vanish (1.4.1, 1.4.11).** In a
`forced-colors: active` context the stack's 210 bands and the ledger's bars become `Canvas`
(white on white), and every CSS hatch (`repeating-linear-gradient` backgrounds: `.sec-hatch`,
`.sec-cross-swatch`, `.sec-stipple-swatch`) computes to `background-image: none`. The stack keeps
only its band rules; the ledger row draws nothing but its label; "hatched, not zero" cannot be
seen. The maps (SVG fills and SVG patterns) and every dash survive; the lens tabs and pressed
options keep weight 600. *Fix:* `forced-color-adjust: none` on the `aria-hidden` drawing
containers of B1 and B3 and on the key swatches, whose colours are the page's own tokens and
already pass §2 on the dark ground.

*Fixed 2026-10-07: inside `@media (forced-colors: active)`, `forced-color-adjust: none` is set on the `aria-hidden` drawings of B1 and B3, on `.sec-hatch`, and on the hatch, crosshatch, stipple and zero swatches. It was not re-measured in an emulated `forced-colors` context in this pass.*

**m9 · Minor — two dash renderings are weaker than the frozen channel promises (1.4.1).** The office
lanes draw tier with a CSS `border-style`, so every tier but documented is the same `dashed`
(`strokeDasharray` has no effect on an HTML border, Ledger.tsx:52). Today the 21 windows are 16
reported and 5 documented, so nothing collides; an alleged or analytic window would look reported.
The case timeline's ticks are 12 units long, too short to tell `6 3` (reported) from `8 3 2 3`
(analytic). Both twins carry the tier word. *Fix:* draw the lanes as SVG lines with the tier's
`strokeDasharray`; lengthen the ticks or show the tier as a cap shape on the response circle.

*Fixed 2026-10-07: each office window that is not documented draws its outline as an SVG rect with the tier's own `strokeDasharray` (non-scaling); documented windows keep the solid border, and the `[data-mark="office"]` element and its computed style are unchanged. The case timeline's lanes are 26 units high and its record ticks 20 units long (were 18 and 12), so each tier's dash shows at least one full period (`6 3` reported, `8 3 2 3` analytic).*

**m7 · Minor (advisory) — reason text inside `aria-disabled` controls is under 4.5:1.** The kind
chips "prison (0)" and "ordnance (0)" at opacity .7 (3.78:1, their reason line 3.13:1) and the
disabled Payer / Stage options at .6 (3.06:1). Inactive components are exempt from 1.4.3, but the
reason ("none in this register — Jail-wise locations … not addresses") is content. *Fix:* keep the
opacity on the border, not the words.

*Fixed 2026-10-07: the disabled Payer / Stage options and the 0-row kind chips carry no opacity. They take a dashed border and `--color-text-muted` words (5.32:1); prison's reason line stays amber.*

Token table (from `src/index.css`, on `--color-bg` / `--bg-elevated` / `--bg-card`): `text` 15.60 /
14.76 / 13.68; `text-secondary` 6.72 / 6.35 / 5.89; `text-muted` 5.32 / 5.03 / 4.67; `accent` 8.76;
`amber` 8.38; `blue` 5.75; `sage` 6.61; `rose` 4.70 / **4.45 / 4.12** (rose text would fail on the
elevated and card grounds; it is not rendered there on this page, 0 in the sweep). Page colours:
hatch stripe 3.72 on its `#101116` ground; crosshatch stripe 3.75 on `#3a3f4a`; stipple dot 4.33;
recorded-zero rule 4.82; ledger bar 6.72; reported-slot outline 5.32; tier dashes 5.32–8.38; focus
ring 8.76; selected map stroke 8.76; `border-light` 1.44 and `border` 1.17 (row rules and box
edges; every bordered control is also identified by its text, so these are not counted as
failures); hidden-by-filter slot **1.10** (S4).

### 2.5.3 Label in Name

**m1 · Minor — 80 controls whose name does not contain their visible label.** The 71 Delhi-line
twin buttons (BudgetBlocks.tsx:281) show "line 1999-00 BE ↗" and are named "Open the line: Delhi
Police 1999-00 BE"; at 390 the strip's "levels" link is named "what resolves at which level", and
"Per person, unavailable (S3)" is named with a sentence that does not contain "(S3)". A speech-input
reader saying the visible words does not reach them. *Fix:* start each name with the visible text
("line 1999-00 BE — Delhi Police, open the line"), or drop the `aria-label` and add the extra words
as visually hidden text after the visible ones.

*Not fixed 2026-10-07: the suite fixes both names. AC-107 requires `Open the line: Delhi Police {fy} {stage}`, and the per-person check requires the full sentence as the name. Changing either needs a criterion decision.*

### 2.4.1 Bypass Blocks · 2.4.2 Page Titled · 3.2.5 (site)

**m6 · Minor (site) — two `<h1>`, no skip link, a constant title, unnamed sidebar icons.** The
sidebar's `<h1>ICIP</h1>` precedes the page's `<h1>`; 30 sidebar links precede `main` with no
"skip to content" (`main` and `nav` landmarks exist, so 2.4.1 is met through them); `document.title`
is "India Corporate Intelligence Platform" on every route; 31 sidebar icons are exposed as unnamed
images inside named links. Known from A11Y-002 to A11Y-005. The page's own outline is clean: no
heading level skipped on any lens or view (94 / 32 / 98 headings at 1440). *Fix:* as recorded in
those audits.

**m5 · Minor (site pattern) — 278–2,774 links open a new tab without saying so.** Every source link
is `target="_blank"` (822 on Budgets at rest, 2,774 under `view=table`); none says so (G201,
advisory). *Fix:* a visually hidden ", opens in a new tab" in `QuotedLink`.

*Fixed 2026-10-07: every source link on the page (`QuotedLink`, and the stack twin's host links) carries `aria-describedby` pointing at one hidden element that reads "opens in a new tab". The description is not part of the link's name or text, so no check that reads a link's words changes.*

## 3. Checklist results (skill steps 3–5)

**Step 3 — keyboard.** Pass / fail as measured at 1440 (and 390 where it differs).

| check | result |
|---|---|
| All interactive elements reachable by Tab | **fail at 390** (S1: ledger cells); pass at ≥ 640. Graph controls: 54 stops after its heading, all reachable |
| Tab order follows reading order | **fail at ≥ 1280** while a panel is open (S3); in-page links (M4) |
| Focus indicator visible | 2 px accent ring on every page control (25 kinds screenshotted: 0.72–1.12 of the ring's expected area changes to accent for 23; the footprint map's ring 0.30 at 1440, its top and bottom edges outside the viewport, and the first ledger cell 0.53 at 390, m10); **fail** under the open panel (S3), map active option (M1), returns under the stack at 390 (M2), chapter 4 link (M3) |
| No keyboard trap | pass: every walk left the document (95 / 84 / 488 stops at 1440; 62 / 34 / 157 at 390) |
| Enter / Space activate buttons and links | pass (tabs, axis, cells, chips, Table view, Copy link, twins, Find results) |
| Arrow keys in composite widgets | pass: tabs (manual activation), FY axis, ledger grid (≥ 640), maps, segmented, roving toolbars; **fail** ledger at < 640 (S1) |
| Panels return focus on close | pass: Close, Escape and "Back to …" return to the opener, or to the grid / map / Find when it is gone |
| `aria-disabled` options focusable and inert | pass (kind chips, per-person option, rail options off-lens) |
| Skip links | pass: "Skip to the table" before B1, B2, B3, B7, F1, P1, P2, P4 open the twin and focus its caption; "Skip the 38 vendor cards to chapter 2" focuses chapter 2's heading |
| Spec keyboard budget (§13, counting the first stop in `main` as 1, at 1440) | FY axis at stop 8 (≤ 15); ledger grid at 13 (≤ 20); spend map at 27 (≤ 30); the chapter 4 link at stop 10 (≤ 40), whose Enter lands on the first case pair (off-screen, M3) |

**Step 4 — screen reader (DOM and accessibility tree only; §6).**

| check | result |
|---|---|
| Decorative images `aria-hidden` | pass: 32 / 12 / 14 of 36 / 15 / 16 page SVGs hidden at 1440; the rest are the named listboxes, the graph's named `group` and its named canvas `img` |
| Informative images named | pass: maps, the graph ("Connection graph: 302 entities, 310 relationships …"), the year strip ("Relationships by year of first date, 1986 to 2027") |
| Icon-only buttons named | pass: graph zoom and pan buttons ("Zoom out", "Pan up" …) |
| Single, descriptive `h1`; no level skipped | page pass; site m6 |
| Landmarks | `main`, two `nav` (site, rail "Filters"), `search` ("Find in the force register"), `complementary` (margin) and 18–23 named regions; **fail**: the ≥ 1280 panel is outside every landmark (S3) |
| Descriptive links | pass; same-name pairs in two toolbars (m4) |
| Form inputs labelled | pass: Find, every select, every checkbox (wrapping label), the year select |
| Status messages | pass: one `aria-live="polite"` region on the page (plus the graph's own), debounced; words for lens, filter (with "from N to k"), panel, Find counts, copy |
| Tables | pass: 3–16 tables with captions, 188–5,077 `th` all with `scope`; `aria-sort` on sortable columns; the ledger is a `role="grid"` with `aria-rowcount` / `aria-colcount` |
| Names match state | **fail** under filters (S4); otherwise every cell, option and slot name carries the class in words |

**Step 5 — visual and cognitive.**

| check | result |
|---|---|
| Text 4.5:1 | pass at rest on every lens and view; **fail** under the FY filter (M6); disabled controls exempt (m7) |
| Non-text 3:1 | pass for hatch, crosshatch, stipple, zero rule, bars, dashes, ring; **fail** hidden-by-filter slot 1.10 (S4), map active stroke at 0.47 px (M1) |
| Not by colour alone | tier: dash everywhere (m9 caveats); no data: hatch + words; party: text only, never a fill (checked: no map, mark or chip is coloured by party); **fail** vendor class in the award chart (M5); forced colours (M7) |
| Resize 200 % | pass (640 × 400, every lens) |
| No horizontal scroll at 320 / 390 | **fail** Budgets (S2); pass Footprint, Procurement, the scaffold |
| Text spacing | pass but for m8 |
| `prefers-reduced-motion` | pass: 0 animations and 0 transitioning elements under `reduce` at rest, after a lens change, hover, a tier change and with the graph mounted (27 transitioning graph inputs under `no-preference`); `scroll-behavior: auto`; the graph canvas is identical 1 s apart under `reduce` and changes under `no-preference` |
| Flashing | none: nothing animates more than once |
| Timeouts | none on the page |

## 4. Graphic-to-twin reconciliation (`view=table`, 1440)

| graphic | marks drawn | twin rows | |
|---|---|---|---|
| B1 Union stack | 28 FY columns × 2 stacks | `stack` 321 (band × FY) | reconciles |
| B2 office lanes | 21 windows | `office` 21 | reconciles |
| B3 ledger | 3,439 drawn slots, 7,229 hatched | `ledger-long` 3,439 (paged at 400); `ledger-coverage` 3,556 lane × FY | reconciles |
| B6 spend map / strength map | 36 + 36 options | `spend-map` 36, `strength-map` 36, `state-table` 36 | reconciles |
| B7 Delhi line | 71 points | `delhi` 71 | reconciles |
| F1 footprint map | 218 dots + 10 counted as `+k` | `places` 228; `footprint-matrix` 36 | reconciles |
| P1 named contracts | 37 priced + 14 unpriced | `awards` 83 (51 contracts + the years with none) | reconciles |
| P4 case timeline | 25 case ticks + 18 responses | `case-timeline` 43 | reconciles |
| Connections graph | 302 entities, 310 relationships | the graph's own table view | shared component |

Every twin has a summary naming its block and rows, Copy as TSV and Download .tsv, and a caption
with population, filters and read-to date.

## 5. The scaffold (`FORCE_META.empty`)

On all three lenses at 1440 and 390: the amber `role="note"` callout ("Register not yet promoted …")
is first; "Nothing recorded yet" / "register not yet promoted — nothing below is zero" appear 21,
14 and 15 times; every map option reads "{State}: register not yet promoted"; 0 unnamed controls;
no heading skipped; one live region; Tab walks of 69 / 74 / 80 stops (1440) and 21 / 24 / 28
(390) leave the document with a ring on every stop in `main`; `main` is 390 wide at 390 on every
lens. No absent value prints as a zero: the only "₹0" is the reading key's "a recorded zero: ₹0 as
recorded", and the eight "0%" on Procurement are the `aria-hidden` 0–100 % axis labels of the
open-market slice, which the scaffold keeps (it removes only `research/raw/force`). The one
defect is m2: at 1440 `main` scrolls 64 px sideways here too. The ZERO-SERIES build was not
audited.

## 6. What this audit could not test

- **A screen reader.** Names, roles, states and live text were read from Chromium's
  accessibility tree, not heard. The places where NVDA, JAWS and VoiceOver could disagree with the
  tree: the three listbox maps with `aria-activedescendant` on an `<svg>`; the 34 narrow ledger
  tables that are each `role="grid"` with the same `aria-labelledby`; the vendor cards' `<dl>`s;
  the canvas graph's overlay. Each should be heard once.
- **Real forced-colours / Windows High Contrast.** M7 was measured in Chromium's emulated
  `forced-colors: active`, not on Windows.
- **A real coarse pointer.** Taps were emulated (`hasTouch`, `isMobile`); 7–19 targets per lens
  measure under 24 px at 390 (2.5.5 is AAA and 2.5.8 is 2.2, so not counted).
- **The clipboard.** Copy link and Copy as TSV were not exercised (headless clipboard
  permissions); their failure path is announced in words in the code.
- **Alleged and analytic office lanes**, and an alleged case tick on a long lane: none exists in
  this register, so m9 is read from the code.
- **The ZERO-SERIES build** (every series empty, the graph intact): not audited.
- **The connection graph in depth.** It is the shared `GraphExplorer` audited on `/network` and
  `/finance`; here only reach (54 stops), names, reduced motion and one node's focus change (1,681
  pixels) were checked.
- **WCAG 2.2.** Not the target. S3's covered focus and M2 map to 2.4.11 Focus Not Obscured; the
  small targets to 2.5.8.

## 7. Gates run for this audit (verbatim last lines)

```
generate: OK
validate: OK          (30 warning(s), all declared)
check:skills          exit 0 (git diff --exit-code printed nothing)
✓ built in 27.77s     (npm run build)
smoke: OK
graph-viewport: OK
```

The `/security` acceptance suite was run against a pinned build of the same tree
(`SECURITY_DIST=<scratchpad>/dist-sec-a11y node --test scripts/pages/security.test.mjs`); its tally
is in §7.1. No file in the repository was changed by this audit other than this report. The probes,
their JSON and screenshots are in the session scratchpad (`a11y-sec/`), not in the repository.

### 7.1 Suite tally

One run, not three, on `dist-sec-a11y` (byte-identical to the audited build): `# tests 153 · # pass
142 · # fail 11 · # skipped 0` (46 min). The eleven: AC-11 (ZERO-SERIES procurement), AC-40, AC-46,
AC-47, AC-56, AC-105, AC-124, AC-128, AC-133, AC-134, AC-150. Three of them touch this audit:
AC-124 ("Scroll the page vertically only, in every state") is the suite's view of S2, and AC-128 and
AC-133 (the 44 px step controls under the stack and the wide drawings) sit on the same narrow
layout as S1 and S2; AC-124 and AC-133 fail on a 5 s selector timeout, so their own diagnosis is
not in the log. The rest are data and wording criteria, outside WCAG. None was adjudicated here:
each is for the build stage to classify as page defect, criterion defect or both
(`SECURITY_ACCEPTANCE.md`). The suite is not ready for `test:pages`.

## 8. Fix order

1. **S1** (Ledger.tsx: look the cell up from the figure, open its group) and **S4** (Ledger.tsx:126
   one word; Security.tsx:42 one rule) — under an hour together, and S4 is the page contradicting
   its own key.
2. **S2** (StatePair.tsx:298–305: block label, `w-full` select, the GSDP note out of the option) and
   **m2** (Chrome.tsx:420: `xl:w-full`) — one class each.
3. **S3** — move the wide panel from `<body>` into the margin `<aside>` as a sticky block; this
   also clears its share of M2 and the landmark finding.
4. **M2–M4** — one focus helper (`scroll-padding-top` on `main`, focus the target heading after
   every in-page scroll) shared by `closePanel`, `Anchor`, the chapter links and "rated in Q5".
5. **M1, M5, M6, M7** — the active-option stroke, the award chart's class lanes, text kept out of
   the FY dimming, `forced-color-adjust: none` on the drawings.
6. The Minor findings, each a line or two.

After the fix pass, re-run the probes in `a11y-sec/` against a new pinned build, add
`main.scrollWidth === main.clientWidth` at 390 on every Budgets state and an arrow-key move in the
narrow ledger to the acceptance suite, and record the result here.
