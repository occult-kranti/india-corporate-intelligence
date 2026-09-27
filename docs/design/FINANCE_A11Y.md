# /finance — Foreign money — WCAG 2.1 Level AA audit

*Audit A11Y-005 · scope: `/finance` on the built `dist` (the three registers as compiled in:
finance `run-e10a8edef94a`, ngo `run-169c3129a1ec`, capital `run-916d30d537ff`, records read
to 2026-09-26) on all three lenses (`lens=loans` default, `lens=associations`, `lens=capital`),
with `view=table`, a record panel, a state panel and a highlighted holder, and the scaffold
build `dist-empty-finance/` (a scratch copy of the repository with `research/raw/{finance,ngo,
capital}` absent, built 2026-09-27 02:46 after the last finance source change at 02:45) ·
target: WCAG 2.1 AA · date: 2026-09-27 · procedure: the sweetclaude `testing-accessibility`
skill's seven steps, with its state files and issue filing left out. Nothing in this document
was edited into the page: it is a report, and every fix below is a proposal. The site chrome
(sidebar, mobile header) was swept for the criteria that reach into the page; findings there
are marked "site".*

---

## 0. Summary

| severity | count | definition (from the skill) |
|---|---|---|
| **Critical** | **0** | a reader with a disability cannot complete the task at all |
| **Serious** | **2** | significantly difficult — a workaround exists but is painful |
| **Moderate** | **6** | confusing, task completable with effort |
| **Minor** | **12** | small friction |
| total | **20** | |

**Status after the fix pass (2026-09-27).** S1, S2 and M1–M6 are fixed in the page and
re-measured by an independent Playwright probe at 1440, 390 and 320 (59 checks): the roving
grid cell paints a solid 2 px accent outline (S1); `document` and `main` scroll widths equal
the viewport on every lens, every table view, with a holder chosen and with a record open,
because quoted research text now breaks anywhere and every wide twin sits in its own scroll
box (S2); the flow's 606 ribbons are one tab stop with arrow, Home and End movement and the
count in the group's description, and the map listbox and matrix are reached in 20 and 18
stops from `main` (M1); selected tabs, the pressed Table view and pressed segmented options
carry weight 600 and a 2 px bar that survives forced colours (M2); ribbon edges measure 4.04:1
and the documented fill 2.59:1 (M3); the 11 twins that overflow at 1440 are named regions that
scroll by arrow key, and boxes that do not overflow are not tab stops (M4); the phone strip
wraps and keeps its as-of date (M5); captions and headings the page moves focus to paint a
2 px ring (M6). The Minor findings below are open. The paragraphs that follow describe the
page as audited, before those fixes.

**Nothing blocks release under the skill's rule** (Critical findings block). The page is
built the way the energy, welfare and tenders fixes said a page should be: every control in
`main` carries an accessible name (0 unnamed of 1,139–2,528 per lens); no two enabled controls
in one list, table, section or figure share a name; every graphic has a table twin whose rows
reconcile to the marks drawn (36 map options and the Union row against 37 rows, 606 ribbons
against 606 band rows, 64 lanes against 64 lane heads, 73 squares and 9 diamonds against 82
action rows, 21 rule bars against 21 rows); every twin has a `<caption>` with its population,
filters, as-of date and run id and `scope` on every header but one; the tier is a dash in
every swatch, ribbon, tick and bar and its word in every cell; the no-data hatch carries words
in every option name and twin row and never a zero; the map is a keyboard listbox whose arrow
keys, Enter and Escape do what the spec says and return focus where it came from; every panel
has Close, "Back to", and Escape, and each returns focus to its opener; the one page live
region announces every filter, panel and lens change in words; reduced motion turns every
transition in the document off; text contrast passes everywhere (26,690 text-bearing elements
swept on the loans lens, one disabled control the only element under 4.5:1); and the scaffold
prints its note, names every control and traps nobody.

What remains is concentrated in four places. **The capital lens's matrix grid has no visible
focus** (S1): its cells carry `outline-none` beside `focus-visible:outline`, and under
Tailwind v4 the first wins, so the page's only roving-tabindex grid — 1,750 cells — gives a
keyboard user no sign of where they are. **On a phone the page scrolls sideways** (S2):
`main` is 867 px wide at 390 on every lens because two research strings in "What this lens
cannot show" and "Gaps" hold unbreakable URLs, and 1,042 px on the associations table view
because the actions twin is a 1,026 px table with no scroll container and no card layout. **The
flow diagram is 606 Tab stops** at 640 px and above (M1), each an 8 × 8 px button, with a skip
link before it that a reader must know to take. And **three states are shown by hue or
lightness alone** (M2): the selected lens tab, the pressed Table view button and the pressed
segmented options, which under forced colours are indistinguishable from their neighbours.
The rest is the faintness of graphical objects the words already carry (M3, m6), wide tables
that scroll only by pointer (M4), the phone strip clipping its own as-of date (M5), and the
focus targets of the page's own focus moves — twin captions, panel headings, the connections
heading — drawing no ring (M6).

## 1. Method

**Fixtures.** `npm run generate` (`generate: OK`), `npm run validate` (`validate: OK`, 30
warnings, all declared: 29 court rulings modelled as `enforce` in the frozen energy, welfare
and capital fleets and the SENSEX 50 gap) and `npm run build` (`✓ built in 11.45s`) were run
first, then `dist` was copied to a scratch directory and served from there so a concurrent
rebuild by another agent could not change the page under the probes (the `FINANCE_DIST`
pattern of the page suite). The scaffold is the suite's cached `dist-empty-finance/`, whose
three modules declare `"empty": true`; it postdates every finance source file. The working
tree's raw files and generated modules were not touched. `npm run smoke` (`smoke: OK`, 49 URLs)
and `npm run viewport` (`graph-viewport: OK`) were run on the same build afterwards.

**What was run.** The skill's step 2 asks for axe, WAVE or Lighthouse; the project rule is no
new dependencies, so step 2 was replaced by DOM probes written for this audit
(`scratchpad/a11y/probe.mjs`, `probe2.mjs`) and run with Playwright 1.62 against the pinned
Chromium at `/opt/pw-browsers/chromium`, serving `dist` exactly as `scripts/smoke.mjs` does.
They cover: an accessible-name walk over every control and every `<svg>` in `main` on each
lens with the graph mounted, with a label-in-name comparison, a duplicate-name check scoped to
each list, table, section, figure and nav, duplicate ids, heading order, landmarks, live
regions, new-tab links and `title`-only content; a Tab walk of 420 stops from the page `h1` at
1440 on the loans and capital lenses and 150 stops at 390, each stop recorded with its rect,
computed outline and box-shadow, whether it was on screen and whether it lay under the sticky
stack; a screenshot-difference check of the focus ring on twenty control kinds (screenshot,
focus with `focusVisible`, screenshot, count changed pixels); keyboard activation of the lens
tabs (arrows, Home, End, Enter, Space), the Table view and tier toggles (Space, Enter), the
skip links, twin summaries, the map listbox (arrows, Enter, Escape, Tab out), a flow ribbon,
Open record → Close / Escape / "Back to", Find, Show connections, the graph overlay (Tab, Enter,
Escape), the inclusion links, the segmented map metric, the year selects, and the matrix grid
(arrows, Enter, Close, Tab out); a graphic-to-twin reconciliation on every figure of every
lens; a text-contrast sweep over every text-bearing element in the article (foreground
composited through every ancestor's background and opacity, large-text threshold applied) and
every SVG `<text>` fill; a token table computed from `src/index.css` and the page's own
colours; greyscale screenshots of the tabs, map, map key, union bar, rail, flow, clock,
receipts, actions timeline, reading key and toolbar; a `forced-colors: active` context; a
`prefers-reduced-motion: reduce` context with `document.getAnimations()` sampled at rest,
after a lens change, a hover, a tier change and with the graph mounted, and the same in
`no-preference`; 390 and 320 px contexts (mobile emulation, dpr 2) with overflow, sticky-stack,
target-size and mono-size walks over eight URL states, a Tab walk, the rail disclosure, and the
two-tap map; a text-spacing override (1.4.12) at 1280 and a 640 × 500 viewport as the 200 %
zoom of 1280 (1.4.4), with 700, 800, 1000 and 1279 as further widths; and the scaffold at 1440
and 390 on all three lenses with a Tab walk. These catch roughly what axe catches for names,
roles and contrast; they do not catch what a screen reader would say (§4, §6).

**Contrast arithmetic.** WCAG relative luminance. Composited values (an `rgba` stroke, a fill
at `opacity`) are alpha-blended onto `--color-bg` `#0a0a0c` before the ratio is taken. Text
needs 4.5:1 (3:1 at ≥ 24 px or ≥ 18.66 px bold); graphical objects and component boundaries
need 3:1 (1.4.11). The page maps the house greys onto two neutral greys of its own.

| colour | where | ratio on `--color-bg` |
|---|---|---|
| `--color-text` `#e8e4dc` | body, quoted research (`.fin-q`) | 15.60 |
| `--fin-grey-secondary` `rgb(176,176,176)` | secondary text, captions, table cells | 9.12 |
| `--fin-grey-muted` `rgb(150,150,150)` | mono labels, skip links, twin captions | 6.69 (6.33 on `bg-elevated`, 6.48 on the panel's `bg-elevated/60`) |
| `--color-accent` `#c9a86c` | selected tab text, pressed borders, focus outline | 8.76 |
| `--color-amber` `#d4a03d` | "no source in file", the register-not-promoted note | 8.38 (7.84 on the note's `amber/6`) |
| `--color-rose` `#c45b5a` · `--color-sage` `#7a9e7e` · `--color-blue` `#5a8ec4` | reading key, tier words | 4.70 · 6.61 · 5.75 |
| `--color-text-muted` `#8a8477` | analytic tier word (house token, unmapped) | 5.32 |
| `--color-border-light` (α .15) · `--color-border` (α .08) | control and table borders | 1.43 · 1.17 |
| map ramp `#34424a` `#4b5f66` `#667f85` `#8aa1a4` `#b9c9c8` | map fills | 1.91 · 2.95 · 4.5 · 7.27 · 10.9; adjacent steps 1.55 |
| hatch ink `rgba(201,168,108,.6)` on ground `#101116` · stipple `rgba(232,228,220,.5)` | no-data textures | 3.71 · 4.44 (3.74 on the page) |
| matrix column hatch `rgba(201,168,108,.45)` | "no named holder recorded" heads | 2.57 |
| flow ribbon fill `#8aa1a4` at `.35 × weight + .08` | documented .43 · reported .325 · alleged .2375 · analytic .185 | 2.20 · 1.73 · 1.43 · 1.29; stroke at .5: 2.59 |
| union bar `#8aa1a4` · `#667f85` (striped) · `#3a3f44` | placed · fetcher's rule · not placed | 7.27 · 3.7 · 1.86; placed vs fetcher 1.56 |
| clock ticks `rgb(210,210,210)` · year bars `rgb(160,160,160)` · office fill `rgba(170,170,170,.35)` | marks | 13.08 · 7.56 · 1.97 (outline `rgb(200,200,200)` 11.82) |
| clock rules: general `rgb(200,200,200)` · assembly at .35 · shaded strip at .10 | | 11.82 · 2.33 · 1.10 |
| SVG labels `rgb(220,220,220)` 9 px · `rgb(170,170,170)` 10 px · `rgb(160,160,160)` 9 px · `rgb(150,150,150)` 9 px | flow, clock, receipts | 14.42 · 8.51 · 7.56 · 6.69 |
| map labels `rgb(236,236,236)` on stroke `rgb(12,12,12)` | | 16.56 |
| receipts hatched column stroke `rgba(201,168,108,.4)` on `rgb(22,22,22)` · stripes at .55 | | 2.07 · ≈3.1 |
| actions square fill `rgb(120,120,120)` · stroke `rgb(230,230,230)` | | 4.48 · 15.85 |
| Wilson track `rgba(150,150,150,.35)` · bar `rgb(200,200,200)` | base rates | 1.77 · 11.82 |
| lens tab selected: text accent vs unselected `rgb(176,176,176)` · fill `accent/8` vs page | | 1.04 · 1.10 |
| focus ring `accent/60` on the page · on ramp `#8aa1a4` | map | 3.74 · 1.95 |

## 2. Findings by criterion

Each finding: **criterion · severity** — what was observed, where, the evidence, and a fix
that touches no frozen channel (edge dash = tier, node hue = family, node shape = type, node
size = declared magnitude). Page-local marks (ramp, hatch, stipple, ribbon fill, union bar
segments, selection tints) may be adjusted; the dash, the family hue, the shape and the size
band may not.

### 2.4.7 Focus Visible · 2.4.3 Focus Order · 2.1.1 Keyboard

**S1 · Serious — the holder matrix's grid cells have no visible focus.** The capital lens's
centre is a `role="grid"` of 1,750 `role="gridcell"` cells with one roving tab stop (correct:
Tab enters at stop 19 from the page top, leaves in one stop to "Copy as TSV", arrows move,
Enter opens the record, Close returns focus to the cell). Every cell's class is
`… outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent …`.
In the built CSS, `.outline-none{--tw-outline-style:none;outline-style:none}` and
`.focus-visible\:outline:focus-visible{outline-style:var(--tw-outline-style);…}` — so on
focus the outline style is read back from the variable that `outline-none` set to `none`.
Measured on the focused cell: `:focus-visible` **matches**, computed `outline: none 0px
rgb(201,168,108)`, `box-shadow: none`, screenshot difference with and without focus **0
pixels** (`ring-1440-capital-gridcell.png`, `matrix-focus.png`: the cursor is on a cell and
nothing marks it). The Tab walk's one no-ring stop on the capital lens is this cell (stop 18).
A keyboard user moving through 35 × 50 cells has no sign of position; the only cue is the
screen reader's row/column headers, which a sighted keyboard user does not have. The twin
below (94 rows) is the workaround, which is why this is Serious, not Critical. *Fix:* remove
`outline-none` from the cell class (the `CellFrame` SVGs, not the outline, draw the cell's
frame, so nothing else depends on it), or use `focus-visible:outline-solid` which sets the
style directly; the same `LinkButton` pattern without `outline-none` renders a `solid 2px`
accent outline (956 changed pixels on "Open record"). Verify by screenshot, as this audit did.

**M1 · Moderate — the flow diagram is 606 Tab stops of 8 × 8 px.** At ≥ 640 px every ribbon
of "Lender, instrument and place" is a real `<button>` in a `<foreignObject>` (the spec's
choice, §13, so a ribbon's words are reachable): 606 buttons, each 10 × 10 CSS px drawn at 8 × 8
on screen. They sit in the natural Tab order between the map's segmented controls (stop 27)
and the clock (stop ≈ 651). The 420-stop Tab walk from the page top never left them: BUTTON
stops 402 of 420. The "Skip the diagram to its table" link and the "Skip to the table" link
precede the diagram and work (Enter opens the twin and focuses its caption), and Enter on a
ribbon narrows the project list and announces it ("the project list is narrowed to the 29
records of IBRD to FY17 - Transportation"), so this is operable; but a reader who does not
know to take the skip link presses Tab 606 times, and the spec's keyboard budget ("the graph
heading reachable in ≤ 25 tab stops at 1280", §13) cannot be met on the loans lens. Two of the
stops (260, 267, rows near the top of the drawing) land under the sticky stack (y 36 and 90
against a 98 px band) and are invisible while focused. *Fix:* keep every ribbon reachable but
make the diagram one tab stop — `tabIndex={-1}` on all but the first ribbon, arrow keys moving
between ribbons (the same roving pattern the matrix uses), Home/End to the first and last, and
the ribbon count in the group's description — or move the ribbon buttons into the twin's rows
and leave the drawing pointer-only as the clock's brush is. Either way keep the skip links.

**M4 · Moderate — wide tables scroll only by pointer.** Every table twin sits in a
`div.overflow-x-auto` with no `tabindex` and no `role`; at 1440 with the margin, twelve boxes
on the loans lens overflow their 744 px column (the project list at 1,760 px, contracts at
1,132, the map twin at 960), six on associations (the welfare-join twin at 1,137), six on
capital (the matrix at 2,325); at 390 five overflow. Chromium makes a scroller keyboard-focusable
only when it holds no focusable child, and these hold links in every row, so a keyboard user
reaches the cells that carry a control (the browser scrolls them into view) and cannot reach a
text-only column past the fold — "Record text", "Rule", "Detail", the Wilson intervals — except
by pointer. One table does it right: "India's external debt, for context" is a
`role="region" aria-label tabIndex={0}` scroller, and ArrowRight moves it. *Fix:* give the twin's
scroll box `role="region"`, `aria-label` = the table's name and a `tabIndex` set from a
`ResizeObserver` (`scrollWidth > clientWidth ? 0 : -1`), so a box that does not overflow is not
a stop (the tenders audit's m7).

**M6 · Moderate — the page's own focus targets draw no ring.** The page moves focus
deliberately and correctly: a skip link to a twin's `<caption>`, Open record, Enter on a map
option and Enter on a matrix cell to the panel's `<h2>`, Show connections to `h2#fin-conn-h`,
a lens tab to the lens heading. Measured after a real Tab + Enter on the map's skip link: the
caption is `document.activeElement`, `:focus-visible` **matches**, and its box-shadow layers
are all `rgba(0,0,0,0) 0px` — the `focus-visible:ring-1 focus-visible:ring-accent` pair produces
no visible ring (`caption-ring.png`); the same on the record panel's `h2` (`focus-visible:ring-1`,
transparent layers); `h2#fin-conn-h` is `outline-none` with no focus utility at all, and the
case-file `h4`s are `outline-none` likewise. The map's `focus-visible:ring-2 ring-accent/60`
does render (4,478 changed pixels), so the ring machinery works on this page; why `ring-1` on
these two elements does not was not isolated, and the fix should be verified by screenshot.
Not strictly a 2.4.7 failure for the headings (they are not in the Tab sequence) but the
reader who followed the link has no confirmation of where they landed, and this is every panel
and every twin on the page. *Fix:* use the outline pair that renders (`focus-visible:outline
focus-visible:outline-2 focus-visible:outline-accent`, without `outline-none`) on `caption`,
the panel `h2`, `#fin-conn-h`, the lens `h2` and the case-file `h4`; add a `role="status"`-free
confirmation is not needed — the live region already says "Record … opened".

**m7 · Minor — no `scroll-padding-top` for the sticky stack.** The stack (`sticky top-0
z-30`, 98 px at 1440 including the reconciliation line; 78 px at 390 under a 57 px header) sits
over content, and browser focus-scrolling ignores it: the two ribbon stops above landed fully
under it. Sections carry `scroll-mt-40`, so jump links compensate; Tab stops do not. Only 2 of
420 stops at 1440 and 0 of 150 at 390 were affected, so Minor. *Fix:* `scroll-padding-top` on
`main` equal to the stack's height (plus `3.5rem` below `lg`).

### 1.4.10 Reflow · 1.4.4 Resize Text · 1.4.12 Text Spacing

**S2 · Serious — `main` scrolls horizontally on every lens at 390 and 320 px.** `body` is
`overflow-x: hidden`, but `main` is the scroll container, and `main.scrollWidth` is **867 px**
at 390 on the loans lens, with `view=table`, and with a record open; **810** on associations
and capital; **1,042** on the associations table view; the same at 320, and 867 at 640, 700 and
800. Two causes. (1) Quoted research text in "What this lens cannot show" (`#cannot`) and the
shared "Gaps" panel (`#gaps`, which lists every lens's voids, so every lens is affected):
`.fin-q` spans whose text holds an unbroken URL — "datasets: AidData Global Chinese Development
Finance Dataset v3.0 — https://www.aiddata.or…" (right edge 867), "Infosys' FY2026 Form 20-F on
SEC EDGAR (https://www.sec.gov/Archives/edgar/data/0001067491…" (603), "Kentikelenis, Stubbs &
King…" (551) — with `overflow-wrap: normal`. (2) On the associations lens with `view=table`, the
actions twin ("The Ministry's actions and the responses") is a real `<table>` 1,026 px wide in a
wrapper whose `overflow-x` is `visible`, not the card layout the spec gives every table with a
Response column below 640 (§12) and not a scroll box. The page therefore pans sideways by up to
120 % of the viewport, the sticky stack slides with it, and the phone screenshot's right margin
is the left edge of a much wider page. 1.4.10 is set at 320 CSS px; this fails at 390, and FG-31
("`scrollWidth ≤ innerWidth` on every lens" at 360 and 390) with it. *Fix:* `[overflow-wrap:
anywhere]` (or `break-words`) on `.fin-q` in `PAGE_CSS` — the class already exists for exactly
this text — and on the `li`s of `CannotShow` and `GapBlock`; render the actions twin as `Cards`
below 640 like the contested pairs, or at least wrap it in the same `overflow-x-auto` box as the
other twins; then assert `main.scrollWidth` as well as `document.scrollingElement.scrollWidth`
in FG-31, since `main` is the element that scrolls.

**M5 · Moderate — the phone strip clips its own as-of date.** Below 640 the strip keeps fact
1 and the as-of date on one `p.truncate` line. On the loans lens it fits (358 px in 358). On
associations the line is 549 px in 358 and on capital 751 in 358, and the ellipsis falls inside
fact 1 — "10 of 14 financial years with a national…", "35 of 50 NIFTY 50 companies with a named…"
— so the as-of date, the one thing the spec says stays pinned with the fact, is not on screen on
two of three lenses; on capital "indices as of 2026-09-25" goes with it. The text is in the DOM
for a screen reader, so this is loss of visible content, not of programmatic content. *Fix:*
let the line wrap to two (the stack has room: 78 px of a 140 px budget), or pin the as-of date
first and truncate the fact; or shorten the phone facts ("10 of 14 FYs with a total").

**1.4.12 — pass.** With line height 1.5, letter spacing 0.12 em, word spacing 0.16 em and
paragraph spacing 2 em at 1280, nothing is clipped that was not already `truncate` (the clock's
lane labels, which carry `title` and a full accessible name). **1.4.4 — pass at 200 %** except for
S2: at 640 × 500 the narrow layout engages and only the two `.fin-q` strings overflow.

### 1.4.1 Use of Colour · 1.4.11 Non-text Contrast

**M2 · Moderate — three pressed states are hue or lightness only, and vanish under forced
colours.** (a) The **lens tabs**: the selected tab is `border-accent text-accent bg-accent/[0.08]`
against `border-border-light text-text-secondary`. Between the two texts the luminance ratio is
**1.04:1** (gold against grey at the same lightness — pure hue), the fill is 1.10:1 against the
page, weight 400 on both, no underline, bar or glyph; the 1 px border is the only lightness cue
(`grey-tabs.png`: the selected tab is a slightly lighter box). Under `forced-colors: active` all
three tabs compute to the same border (`rgb(0,0,0)`), the same colour and a fill of `rgba(255,
255,255,0.08)` against `0` — not visible. `aria-selected` is programmatic and correct. (b) The
**Table view** button: pressed is `border-accent text-text` against `border-border-light`
(the border is 8.76:1 against 1.43:1 — a lightness cue only; under forced colours the borders
differ only by an alpha the browser flattens). (c) The **segmented** map metric, scale and flow
middle options: the same border-only cue, and identical black borders under forced colours. The
tier toggles are done right (line-through when off, which survives greyscale and forced colours)
and are the model. *Fix:* on `aria-selected="true"` and `aria-pressed="true"`, add
`font-medium` and a 2 px bottom bar in `--color-accent` (8.76:1) via a pseudo-element, with
`border-bottom-color: ButtonText` under `forced-colors`; this is the fix the welfare and tenders
pages took (welfare M2, tenders M3). Names unchanged; no frozen channel involved.

**M3 · Moderate — the flow ribbons are below 3:1 and the weaker tiers would be invisible.**
Ribbon fill is `#8aa1a4` at `0.35 × weight + 0.08`: documented **2.20:1**, reported 1.73,
alleged 1.43, analytic 1.29 on the page; the stroke at `.5` is 2.59:1 and 1.18:1 against the
documented fill it edges. Every ribbon in this build is documented (606 of 606, all solid), so
the alleged and analytic renderings are untested here; the arithmetic says a reported ribbon
would be under 2:1 and its dash under 3:1. `grey-flow.png` shows a legible but faint sheaf. The
words are all in the buttons and the twin, which is why this is Moderate. *Fix (page-local
encoding):* raise the stroke to ≥ 3:1 (`strokeOpacity ≥ .6` gives 3.3:1; `.7` gives 3.9:1) so
the dash — the frozen tier channel — is readable at every tier, and lift the fill floor so
analytic is ≥ 1.5:1 (`0.3 × weight + 0.2`); keep the relative weights.

**m6 · Minor — faint graphical objects whose words carry them.** The union bar's "not
placed" segment `#3a3f44` is **1.86:1** against the page — the bar's largest segment, the
documented void the spec says to render loudly, is its faintest (`grey-unionbar.png`: a dark
band); the fetcher's-rule segment at 1.56:1 against the placed segment is told apart by its
stripes. The clock's office-window fill (1.97:1) has an 11.8:1 outline; its assembly-election
rules are 2.33:1 while general elections are 11.8:1, so the caption's "assembly election falls
somewhere in India almost every year" is a faint line; the post-register shaded strip is 1.10:1
with a label. The matrix's "no named holder recorded" column hatch is 2.57:1 (`th.hatch`,
`rgba(201,168,108,.45)`) but the head carries the words in its name and `title`. The Wilson
track is 1.77:1 with an 11.8:1 bar. Each value is in a list, twin or name. *Fix:* `#4a5056`
(≥ 3:1) for the unplaced segment; assembly rules at `.5`; matrix hatch at `.6`.

**1.4.1 elsewhere — pass.** Tier is a dash in every swatch (`solid`, `6 3`, `2 4`,
`8 3 2 3`), in every ribbon, tick, bar and cell frame (`grey-clock.png`, `grey-actions.png`,
`grey-receipts.png`); the no-data hatch and stipple are textures at 3.7:1 and 4.4:1 against
their ground with words in every option name, key row and twin row; placed-but-no-amount
states are drawn as the page ground with an 11.5:1 outline and named in the key; the ramp
steps are told apart in greyscale (`grey-map.png`); rose is used only for the reading key's
response mark; no party, country or verdict colour exists; `--tier-*` hues appear only beside
the tier word. Links are underlined (0 un-underlined links on any lens).

### 1.3.1 Info and Relationships · 4.1.2 Name, Role, Value · 4.1.3 Status Messages

**m1 · Minor — the visible text of two link kinds is not in the accessible name (2.5.3).**
(a) The Sources ledger: each link shows "*label* *host*" (the host in a mono span inside the
`<a>`) and is named `${label} (${url})` — 773 links on the loans lens, 565 on capital; the name
begins with the visible label but does not contain the visible host string. (b) The 34 case-file
links "Copy link to this case" are named "Copy link to the case file *X*" — the visible words
are not a substring. A voice-control user saying the visible text may not match. *Fix:* name
the ledger link `${label} ${host} (${url})` and the case link `Copy link to this case file: X`.
Matrix cells ("○", "·", "Σ agg.") and the graph's "−", "+", arrow buttons are symbols and exempt.

**m2 · Minor — the `Effect` description is attached to a non-focusable span.** `Effect`
renders `946 <span aria-hidden>→</span> 946 records` with `aria-describedby` to an sr-only "from
946 to 946 records"; `aria-describedby` on a plain `<span>` is not announced in browse mode, so
a screen reader reads "946 946 records". The project list's inline effect does it right (a
visible arrow hidden and an sr-only "from … to …" in flow). *Fix:* put the sr-only sentence in
flow after the visible one, as `ProjectList` does, and drop `aria-describedby`.

**m3 · Minor — three polite live regions once the graph mounts.** The page's one region
(`article > div[aria-live]`), `GraphA11y`'s `p[aria-live]` and `GraphExplorer`'s
`div[aria-live]` ("21 of 418 entities shown — 1 hop from IBRD"). The spec asks for exactly one
(§3.5); nothing double-announced was observed, but two regions can. *Fix:* route the graph's
messages through the page's `announce`, or leave the graph's own and drop `GraphA11y`'s.

**m4 · Minor — one `<th>` without `scope`.** The matrix's corner cell "Holder" in the
`role="grid"` table, the only header of 19 tables on the capital lens without one. *Fix:*
`scope="col"`.

**m5 · Minor — a record panel is titled by its id (2.4.6).** Enter on a matrix cell opens
`RecordCard` with `h2` = `holders-b1:c005`: holding lines carry no `lab`, so the panel's name,
the live message and the citation lead with the id. *Fix:* fall back to
`${holderLabel(e.s)} in ${labelOf(e.t)}` for `own` edges.

**m8 · Minor — words inside hidden drawings.** 77 `aria-label`/`<title>` attributes sit on
elements inside `aria-hidden` SVGs (the receipts chart's four hatched columns "FY2012-13: no
national total recorded", the action squares); they reach no one. On the desktop receipts chart
the hatched years are named only by the axis label under each column, the caption's "10 of 14
financial years carry a total" and the twin ("no national total recorded" rows for 2012-13,
2013-14, 2022-23, 2023-24); the phone layout prints the list ("hatched: no national total
recorded — …"). *Fix:* print that phone line on the desktop too, and drop the dead attributes.

**m12 · Minor — "Back to the list" is `<a href="#">`.** Every panel's foot link is a link that
acts as a button (it prevents default and closes the panel; under HashRouter a bare `#` would
otherwise be read as a route). Works with Enter; announced as a link to nowhere. *Fix:* a
`<button type="button">` styled as the link.

**4.1.2 — pass.** 0 unnamed controls per lens; tabs are WAI-ARIA tabs with manual activation and
the panel `aria-labelledby` its tab; the map is `role="listbox"` with `aria-activedescendant`,
`aria-posinset`/`setsize`, `aria-selected`, and no focusable descendant; the flow is
`role="group"` with a heading and a denominator description ("606 bands, ₹6,47,521.56 crore
across 805 records; 44 records without ₹ not drawn"); the clock, receipts, timelines and strip
are `aria-hidden` with their words in lane buttons and twins and nothing focusable inside; the
grid carries `aria-rowcount`/`colcount`; every pressed and selected state is programmatic;
unavailable selects say why in their label ("Lender — does not apply to this lens").
**4.1.3 — pass**: every filter, panel, lens, copy and twin action fills the live region in words
("from 946 to 927 records", "Record P177856 — Rail Logistics Project opened", "panel closed",
"shown as tables").

### 2.4.1 Bypass Blocks · 2.4.2 Page Titled · 1.3.1 (site)

**m10 · Minor (site) — two `<h1>`, no skip link, a constant document title.** The sidebar's
`<h1>ICIP</h1>` precedes the page's `<h1>`; 30 sidebar links precede `main` with no "skip to
content"; `document.title` is "India Corporate Intelligence Platform" on every route. Known
from A11Y-002 (m2, m9) and A11Y-004 (m11–m13). The page's own outline is clean: `h1` → `h2` ×
14–16 (Denominators, the lens heading, the sections) → `h3` × 26–33 → `h4` × 26–63, no level
skipped on any lens. *Fix:* as recorded in those audits.

**m9 · Minor (site pattern) — 565–678 links open a new tab without saying so.** Every `Cite`,
ledger and record source link is `target="_blank"`; none is named "opens in a new tab" (G201,
advisory). *Fix:* a visually hidden ", opens in a new tab" in `Src` and the ledger.

### 2.5.5 Target Size (AAA, advisory)

**m11 · Minor (advisory) — small targets.** The 606 ribbon buttons are 8 × 8 px on screen; at
390 (a coarse pointer) 500 of 1,059 targets are under 24 px and 765 under 44 px on the
associations lens — skip links, row actions, lane buttons, twin summaries (18–20 px high); the
lens tabs are 44 px and the "Show the diagram" / "Load the graph" buttons 44 px. WCAG 2.1 AA has
no target-size criterion; the spec's own §13 ("44 px on coarse pointers; 24 px on fine") does.
*Fix:* `min-h-[24px]` with `py-0.5` on row actions and skip links; the ribbon fix in M1.

## 3. Checklist results (skill steps 3–5)

**Keyboard (step 3)** — 8 of 12 pass.
- [x] Every interactive element reachable by Tab — 1,098 focusables on the loans lens; the
      map at stop 21 (8 at 390), the matrix at 19, the project list's first row inside the
      budget; no control inside a hidden drawing; nothing unreachable found.
- [ ] Tab order follows reading order — yes, but 606 ribbon stops in the middle of it (M1).
- [ ] Focus indicator visible — 19 of 20 control kinds paint a ring (the browser's `auto 1px`
      ring or a `solid 2px` accent outline, 300–4,500 changed pixels); the matrix cell paints
      none (S1); focus targets of the page's own moves paint none (M6).
- [x] No keyboard trap — 420-stop walks end inside the article without repeating; Tab leaves
      the map, the grid and the graph in one stop; Escape peels the graph's focus one layer
      at a time; Find's Escape is intentionally inert (the spec keeps it from clearing `st`).
- [x] Buttons and links act on Enter and Space — tabs, Table view, tiers, skip links,
      summaries, inclusion links, segmented options, ribbons, Open record, Close, Back to,
      Show connections, the map's Enter, the grid's Enter: all verified.
- [x] Arrow keys — tabs (ArrowRight moves focus without activating; Enter activates and lands
      on the lens `h2`), the map listbox (`aria-activedescendant` `ri-st-jk` → `ri-st-pb`,
      announced), the grid, the graph camera.
- [x] Panels return focus — Close, "Back to" and Escape each return to the exact opener
      (`returned: true` ×3); the map's Escape returns to the listbox; the live region says
      "panel closed".
- [ ] Custom widgets operable without a mouse — the clock's brush is pointer-only by design
      (the year selects are the keyboard route); wide tables scroll only by pointer (M4).
- [ ] Skip link — none to `main` (m10); in-page skip links before every graphic work.
- [x] Disclosure: the phone rail `<details>` opens on Enter with five native selects inside.
- [x] Modal dialogs — none on the page.
- [x] Time limits — none.

**Screen reader (step 4)** — 11 of 14 pass by DOM inspection; **not run with a screen reader**
(§6).
- [x] Decorative graphics hidden — 105 / 54 / 1,787 `aria-hidden` SVGs per lens.
- [x] Informative graphics named — the map listbox, the flow group, the canvas graph
      ("Connection graph: 21 entities, 41 relationships … A table view of the same data is
      available below"), the examined-set overlay, the year histogram `role="img"`.
- [x] Icon-only buttons named — the graph's zoom and pan buttons; the site menu button.
- [ ] One `<h1>` — two (site, m10).
- [x] Heading hierarchy — no skipped level on any lens.
- [x] Landmarks — `main`, `nav` (site, Filters), `aside` (Margin, the graph's panel),
      `header`, `search` ("Find in the three registers"), `section` "Denominators", the
      external-debt `region`, 34 named case-file sections.
- [ ] Descriptive link text — "Skip to the table" ×8 and "Cite" links are disambiguated by
      `aria-label`; the ledger and case-file names diverge from their visible text (m1).
- [x] Form inputs labelled — Find (`<label for>`), the year selects (`aria-label` inside a
      `<fieldset>` with a legend), State / Lender / Holder (`<label for>`), every select on
      the phone rail; no unnamed control on any lens.
- [x] Required fields / error messages — none on the page.
- [ ] Status messages — announced (4.1.3 pass) but through three regions once the graph mounts
      (m3).
- [x] Tables — every `<table>` has a `<caption>`; `scope` on every header but one (m4);
      `th[scope="row"]` on the map, months, years, rules twins.
- [x] Response pairs — one `<dl>` per claim on phones; the response through the same wrapper
      as the claim; "No response recorded — asked/not asked unknown" printed where none.
- [ ] Definitions — the strip's three `<dfn title>` (census, placed, researched) are
      tooltip-only, repeated in the reading key's "Words this page uses" (pass by repetition).
- [x] Dynamic loading — the graph prints "Drawing the connection graph: … nodes" while its
      chunk loads; the phone's "Load the graph" and "Show the diagram" are named buttons.

**Visual and cognitive (step 5)** — 10 of 13 pass.
- [x] Text contrast ≥ 4.5:1 — 26,690 / 5,524 / 7,315 text-bearing elements per lens; the only
      element under threshold is the disabled "Previous" pager at opacity .5 (exempt). Lowest
      passing classes: the reported tier word 5.75:1, the analytic tier word 5.32:1, mono grey
      on the graph's card 5.87:1.
- [x] Large text — n/a (all headings pass at the normal threshold).
- [ ] Non-text contrast ≥ 3:1 — ribbons (M3), the unplaced segment, assembly rules, matrix
      hatch (m6); passes: hatch 3.71, stipple 4.44, ramp from step 3 up, ticks, bars, outlines,
      focus rings (3.74 on the page), the tier-toggle border 6.13 between states.
- [ ] Information not by colour alone — tabs, Table view, segmented (M2); everything else
      passes (§2, 1.4.1).
- [x] 200 % zoom — the narrow layout engages at 640; content and function kept (S2's overflow
      aside).
- [ ] No horizontal scroll at 320 — fails in `main` at 320, 390 and up to 800 (S2).
- [x] Text spacing — pass.
- [x] Reduced motion — `document.getAnimations()` is 0 at rest, after a lens change, a hover
      and a tier change under `reduce`; every transition in the document computes to `0s`
      (the sidebar's 0.15 s included, which the page's rule removes while mounted);
      `scroll-behavior: auto`; the graph's overlay positions are stationary 2.5 s after mount
      in both modes. The canvas draw loop itself is not observable through `getAnimations`
      (§6).
- [x] No flashing content.
- [x] No auto-playing media.
- [x] No timeouts.
- [x] Phone layout — strip + tabs 78 px under a 57 px header (135 of the 140 px budget), the
      stack sits directly under the header at rest and when stuck (no gap, unlike tenders M2),
      rail summary within the first screen (y 769–795), union bar within the second (y 1,264),
      no mono text below 12 px (0 elements), map 300 px, one-tap readout then "Open state",
      panels inline under their opener with focus on the heading.
- [ ] Strip legible on the phone — clipped on two lenses (M5).

## 4. Graphic-to-twin reconciliation (all lenses, `view=table`)

| graphic | marks | twin rows | agreement |
|---|---|---|---|
| Where the census loans were placed (map) | 36 options: 26 value, 3 value without amount, 1 fetcher's rule, 6 hatch, 0 stipple | 37 (36 + Union row) | every option name equals its row's Detail cell; 6 hatch options ↔ 6 "no loan record names this state" rows, each with "never zero" in the key and words in the row |
| Lender, instrument and place (flow) | 606 ribbon buttons | 606 | every button's ₹, count and tier found in a row; description "606 bands, ₹6,47,521.56 crore across 805 records; 44 records without ₹ not drawn" |
| When: approvals against elections and office (clock) | 64 lane buttons, 996 ticks and bars | 1,060 (64 lane heads + 996 records) | lane titles match head rows; 78 year rows; 6 rules; 12 months |
| Other lenders, one mark each | 97 marks | 97 | |
| Every loan record | 946 records, 3 pages | 400 shown on page 1, caption "946 of 946 … page 1 of 3" | |
| National receipts by financial year | 10 bars, 4 hatched columns, ticks and a bracket | 18 (14 FYs + superseded and multi-year rows) | 4 hatched ↔ 4 "no national total recorded" rows plus one superseded row |
| The Ministry's actions and the responses | 73 squares + 9 diamonds | 82 | |
| State-wise receipts | 36 state paths | 36 | |
| Named holders in NIFTY 50 filings (matrix) | 1,750 cells: 80 line, 10 aggregate, 525 no-record, 1,135 not named; 15 hatched column heads | 94 line rows, 50 column rows | 90 line/aggregate cells ↔ 94 rows (cells holding two filings) |
| Rules on foreign capital | 21 bars | 21 | |
| Connection graph | 21 entities and 32 relationships in the examined-set overlay (of 418 / 722) | "Show table view" → 41 rows, 7 scoped headers, caption "Table view — the accessible twin of the graph above" | the twin is behind a toggle, which the canvas's name announces |

Every twin: `<caption>` with rows, population, filters, "as of 2026-09-26" and the run id; Copy
as TSV and Download .tsv from the same rows; `scope` on every header (bar m4). Every caption
C1–C15 states what its graphic cannot show (C2 and C15 state the encoding's limits rather than
an absence).

## 5. The scaffold (`dist-empty-finance`)

Every lens prints the `role="note"` "Register not yet promoted — The finance | ngo | capital
register has not been promoted into this build: every surface on this lens says so, and nothing
below is a zero."; the strip reads "register not yet promoted · nothing below is zero · read to
not promoted"; the map is 36 hatched options each named "…: no loan record names this state";
the union bar prints "Register not yet promoted — nothing below is zero"; "Nothing recorded
yet." appears 10–12 times per lens; 46 / 29 / 24 controls, all named; a 45-stop Tab walk at 1440
and 38 at 390 with no trap and no ring lost; no horizontal overflow at 390 (`main` 390 in 390);
heading levels intact.

**House-rule observations, not WCAG** (the task asked for the scaffold state; these are the
page's own rule that a no-data surface never prints a zero): caption **C2** prints "This page's
strict rule places ₹0.00 cr of ₹0.00 cr across 0 census-counted records"; the rail's effect
lines print "0 → 0 records"; the segmented notes print "₹ counted · 0 records" and "records
placed · 0 census"; every twin summary prints "· 0 rows"; the connections paragraph prints "The
World Bank census (0 loan records) is not drawn here"; the derived gap "0 of 0 counted census
records cannot be placed" prints on every lens; the narratives denominator prints "0 narratives
in this register". Each is a computed figure rendered over an empty register. *Fix:* gate C2,
the segmented notes and the derived gaps on `isEmpty(lens)` as the strip and union bar are, and
let `Twin` print "no rows: register not yet promoted".

## 6. What this audit could not test

- **A screen reader.** Names, roles, states and live text were read from the DOM, not heard.
  The listbox map with `aria-activedescendant`, the `role="grid"` matrix (which tells a screen
  reader to expect grid navigation), the `<foreignObject>` buttons inside an SVG group and the
  canvas graph's overlay are the four places where NVDA, JAWS and VoiceOver could disagree with
  the DOM; each should be heard once.
- **Alleged and analytic ribbons.** All 606 flow bands are documented in this register, so the
  reported, alleged and analytic ribbon renderings (M3) are arithmetic, not screenshots.
- **The unavailable-option pattern** (`aria-disabled` with the reason in the name): G1 is
  present, so the US$ map metric and the Sector middle column are enabled and the pattern
  never rendered.
- **The stipple texture on the map.** No state in view is body-only (0 stipple options), so
  the stipple is verified from its key swatch and its token arithmetic only.
- **The canvas draw loop under reduced motion.** `getAnimations()` cannot see a `requestAnimationFrame`
  loop; the overlay's stationary positions after settle are the evidence.
- **Why `focus-visible:ring-1` renders no shadow** on the caption and the panel heading while
  `ring-2` on the map does (M6): measured, not explained.
- **A real coarse pointer**: taps were emulated (`hasTouch`, `isMobile`).
- **WCAG 2.2** (2.4.11 Focus Not Obscured, 2.5.8 Target Size Minimum) is not the target; where
  a 2.1 finding maps to a 2.2 criterion it is named.

## 7. Gates run for this audit (verbatim last lines)

```
generate: OK
validate: OK          (30 warning(s): 29 "court ruling modelled as enforce", 1 SENSEX 50 gap — all declared)
✓ built in 11.45s     (npm run build)
smoke: OK             (49 URLs)
graph-viewport: OK
```

No file in the repository was changed by this audit other than this report. The probes and
their JSON and screenshots are in the session scratchpad (`a11y/probe.mjs`, `a11y/probe2.mjs`,
`a11y/out/`), not in the repository.

## 8. Fix order

S1 (one class), S2 (one CSS rule and one wrapper), M2 (one pseudo-element shared by tabs,
Table view and Segmented), M6 (one focus utility pair on five elements) are each under an hour
and remove the two Serious and two of the six Moderate findings. M1 and M4 are the same roving /
region patterns the page already uses in the matrix and the debt table. M3, M5 and the Minor
findings are single-line changes. The scaffold's zeros are a guard on `isEmpty(lens)` in four
places. After the fix pass, re-run the probes against a pinned `dist` and the acceptance suite's
FG-31 with `main.scrollWidth` added.
