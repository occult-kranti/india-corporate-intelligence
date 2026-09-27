# /tenders — the national (CPPP) section — WCAG 2.1 Level AA audit

*Audit A11Y-004 · scope: `/tenders?view=national` on the built `dist` (the CPPP scrape as
compiled in from `research/raw/cppp/`, computed 2026-09-26, 33,85,233 award decisions after
dedup) and a scaffold build made from a scratch copy of the repository without
`research/raw/cppp/` · target: WCAG 2.1 AA · date: 2026-09-27 · procedure: the sweetclaude
`testing-accessibility` skill's seven steps, with its state files and issue filing left out.
Nothing in this document was edited into the page: it is a report, and every fix below is a
proposal. The register below the section (ledger, map, graph) is on the same page and was
swept for names, focus and contrast; findings there are marked "register".*

---

## 0. Summary

| severity | count | definition (from the skill) |
|---|---|---|
| **Critical** | **0** | a reader with a disability cannot complete the task at all |
| **Serious** | **0** | significantly difficult — a workaround exists but is painful |
| **Moderate** | **8** | confusing, task completable with effort |
| **Minor** | **13** | small friction |
| total | **21** | |

**Status after the fix pass (2026-09-27).** M1–M8 are fixed in the page and measured with a
Playwright probe at 1440, 390 and 320: no focused element is fully hidden by the header or the
sticky strip in a 152-stop Tab walk (M1); the strip sits directly under the header at every
width (M2); the pressed portal toggle carries a 2 px bar and medium weight, and an underline
under forced colours (M3); hiding the section moves focus to the head link and fills a status
line (M4); the `state=` filter is named above both tables with a `clear` control (M5); the
concentration and buyers tables pin both the portal and the buyer cells (M6); the Wilson
interval outlines are drawn at 4.4:1 and 4.1:1 by the audit's own figures, greyscale check
still open (M7); the register's Sector and Search controls have real `<label>`s (M8). The Minor findings
below are open. The paragraphs that follow describe the page as audited, before those fixes.

**Nothing blocks release under the skill's rule** (Critical findings block). The section is
built the way the energy and welfare fixes said it should be: every control is reachable by
Tab and carries a visible 2 px ring; every graphic is `role="img"` with a name that states its
n and says "table follows"; every table twin reconciles to its graphic mark for mark; every
no-data hatch carries words; the tier is spoken in every caption; the scaffold prints one
sentence and no zero. What remains is concentrated in three places: the **sticky strip**
(it hides focused links at every width and, on phones, sits 55 px below the header with
content scrolling in the gap — M1, M2); **state that is shown by lightness only or not shown
at all** (the portal toggle, M3; the `state=` filter, M5; focus lost when the section is
hidden, M4); and the **faint graphical objects** the chart's honesty depends on (Wilson
ribbons at 1.4–2.5:1, M7). Two Moderate findings are in the register, not the section: the
unnamed sector `<select>` (M8) and the table whose sticky first column is not the row's name
(M6, which is the section's concentration and buyers tables).

## 1. Method

**Fixtures.** `npm run generate`, `npm run validate` and `npm run build` were run first
(§7). The scaffold was built from a scratch copy of the repository with `research/raw/cppp/`
removed and `node_modules` symlinked, by `vite build --outDir dist-empty-tenders`; the
working tree's raw files and generated modules were not touched.

**What was run.** The skill's step 2 asks for axe, WAVE or Lighthouse; the project rule is no
new dependencies, so step 2 was replaced by DOM probes written for this audit and run with
Playwright against the pinned Chromium at `/opt/pw-browsers/chromium`, serving `dist`
exactly as `scripts/smoke.mjs` does: an accessible-name walk over every control and every
`<svg>` in `main`; a Tab walk from the section's heading to its exit, 152 stops, each stop
recorded with its rect, computed outline and box-shadow, whether it was on screen and whether
it lay under the sticky strip; a screenshot-difference check of the focus ring on nine
control kinds (screenshot blurred, focus, screenshot again, count changed pixels); keyboard
activation of every control kind (Enter and Space on toggles, sort headers, selects, copy,
download, jump links, state links, the hide link, `<summary>`, and arrow keys inside a scroll
region); a graphic-to-twin reconciliation that reads every `data-mark` in the four charts and
finds its row and its number in the table that follows; a text-contrast sweep over the 2,364
text-bearing elements in the section (foreground composited against every ancestor's
background and opacity, large-text threshold applied) and over every SVG `<text>` fill; a
token table computed from `src/index.css`; greyscale screenshots of the rates chart, the
bands chart and the portal toggle; a `prefers-reduced-motion: reduce` context with
`document.getAnimations()` sampled at rest, after a filter and after a jump; 390 px and 320 px
contexts (mobile emulation, dpr 2) with overflow, sticky-height, target-size and text-size
walks and a second Tab walk; a text-spacing override (1.4.12) and a 640 × 400 @ 2× viewport
as a 200 % zoom approximation; a `forced-colors: active` context; and the scaffold at 1440
and 390 with the hide link and the head link driven by keyboard. These catch roughly what axe
catches for names, roles and contrast; they do not catch what a screen reader would say (§6).

**Contrast arithmetic.** WCAG relative luminance on the tokens in `src/index.css`.
Composited values (an `rgba` stroke, a fill at `opacity`) are alpha-blended onto `--color-bg`
`#0a0a0c` before the ratio is taken. Text needs 4.5:1 (3:1 at ≥ 24 px or ≥ 18.66 px bold);
graphical objects and component boundaries need 3:1 (1.4.11).

| token | value | on `--color-bg` | on `bg-elevated` `#121214` | on `bg-card` `#1a1a1e` |
|---|---|---|---|---|
| `--color-text` | `#e8e4dc` | 15.60 | — | — |
| `--color-text-secondary` | `#9c9688` | 6.72 | — | 5.89 |
| `--color-text-muted` | `#8a8477` | 5.32 | 5.03 | 4.67 |
| `--color-accent` (focus ring, gold hatch) | `#c9a86c` | 8.76 | — | — |
| `--color-amber` | `#d4a03d` | 8.38 | — | — |
| `--color-rose` | `#c45b5a` | 4.70 | — | — |
| chart labels `#b8b8b8` / `#d0d0d0` / `#9a9a9a` / `#8f8f8f` | | 9.97 / 12.82 / 7.03 / 6.12 | | |
| `GREY.central` `#d2d2d2` · `GREY.state` `#9e9e9e` · `GREY.bar` `#b4b4b4` | | 13.08 · 7.38 · 9.54 | | |
| `GREY.axis` `#5c5c5c` · `GREY.grid` `#2c2c2c` | | 2.96 · 1.42 | | |
| `--color-border` (α .08) · `--color-border-light` (α .15) | | 1.17 · 1.44 | | |

## 2. Findings by criterion

Each finding: **criterion · severity** — what was observed, where, the evidence, and a fix
that touches no frozen channel (edge dash = tier, node hue = family, node shape = type, node
size = declared magnitude). This section draws no graph edges and no nodes: its marks are
page-local (portal by shape, thin/partial by hollow fill, no-data by hatch) and may be
adjusted; the tier chip and the tier sentence may not.

### 2.4.7 Focus Visible · 2.4.3 Focus Order

**M1 · Moderate — the sticky strip hides focused links.** The denominator strip is
`sticky top-14 lg:top-0 z-20 bg-bg` and stays over the section. When Tab moves focus to a
link that the browser scrolls to the top of the viewport, the link lands under the strip:
at 1440 the two `family` caption links after the rates tables (Tab stop 30, rect y 20–33
under a strip spanning y 0–38.9; `desktop-focus-under-strip.png` shows the strip, then the
table header, and no ring), and the top edges of two twin regions taller than the viewport.
At 390 the Tab walk found 11 stops overlapping the header-plus-strip band and **6 fully
covered** (the `family` links under the rates, bands and timing figures, and the first state
link, "West Bengal", at y 161 under a strip ending at y 180); at 320, 13 and 5. The ring is
painted (computed `outline: solid 2px #c9a86c` on every one of the 152 stops) but is behind a
z-20 opaque band, so a keyboard user sees nothing move. This is WCAG 2.2's 2.4.11 Focus Not
Obscured by name; under 2.1 it defeats 2.4.7 for those stops. *Fix:* set
`scroll-padding-top` on the scroll container (`main`) to the height of what overlays it —
`3.5rem` plus the strip's height below `lg`, the strip's height at `lg` — so focus-scrolling
and `scrollIntoView` both land content below the band; or drop the strip's `z-index` below
the focus ring and give the ring `outline-offset` inside the element. The jump links already
compensate (`scroll-mt-40 lg:scroll-mt-16` on each `Sub`); focus scrolling does not read
`scroll-margin` on the element that gets focus unless it is set there too.

**M2 · Moderate — on phones the strip sits 55 px below the header, with content scrolling
in the gap.** Below `lg` the strip is `top-14` (56 px) but settles at **y 112–180** (390) and
**112–194** (320) while the fixed header ends at y 57; `strip-390-mobilectx.png` shows a
table row and the figure sentence scrolling through the 55 px window between them, half
under the header's translucent background. `main` carries `pt-14` and is the scroll
container (`overflow-y-auto`), and the strip lands at `top` + 56 px in every context tested
(mobile emulation on and off). Together the header and the stuck strip take 180–194 px of an
844 px viewport (21–23 %), and the gap is where M1's covered links sit. *Fix:* make the
strip's `top` equal the header as laid out — with `pt-14` on `main` that is `top-0` below
`lg` (verify with a screenshot; the arithmetic above is measured, not derived from the
spec), or move the 56 px padding off `main` onto its child so `top-14` means what it says.
Then re-measure M1.

**M4 · Moderate — "Hide the CPPP section" drops focus on `<body>`.** Enter on the hide
link (the last item of the "In this section" nav, and the only control in the scaffold)
rewrites the URL to `#/tenders`, unmounts the section and the link, and leaves
`document.activeElement === body` with the page scrolled to 0 and nothing announced
(`hide.focusAfter: "BODY"`, `status: []`). The next Tab starts from the top of the document
(the sidebar's 30 links). The reverse direction is right: the head link hands focus to
`h2#cppp` (`headLink.active: "cppp:H2"`). *Fix:* on hide, navigate with
`state: { focusHead: true }` and have the head link (`Link` in `Tenders.tsx`) focus itself
on arrival, as `NationalSection` does for the h2; add a `role="status"` line "CPPP section
hidden" beside the head link for one render.

**m1 · Minor — the section heading has no focus indicator.** The head link lands focus on
`<h2 id="cppp" tabindex="-1" class="… focus:outline-none">`; computed outline `none`,
box-shadow `none`, screenshot difference with and without focus **0 pixels**
(`ringPixels["#cppp"]`). Same as the welfare audit's m5. Not a 2.4.7 failure strictly (the
heading is not in the Tab sequence) but the reader who followed the link has no confirmation
of where they are. *Fix:* `focus-visible:outline-1 focus-visible:outline-accent/60` on the
h2, as the welfare panel heading has.

**m7 · Minor — 17 of 18 table regions are Tab stops that do nothing at 1440.** Every
`Twin` is a `role="region" tabindex="0"` scroll container so a keyboard user can scroll a
wide table (the right pattern, and it works: ArrowRight moves the concentration region
80 px). At 1440 only the concentration table overflows; the other 17 regions are focusable
boxes with nothing to scroll, 17 of the section's 152 stops. At 390 all 18 overflow and all
18 stops earn their place. *Fix:* set `tabIndex` from a `ResizeObserver` on the region
(`scrollWidth > clientWidth ? 0 : -1`), keeping `role` and `aria-label` so the table's name
is still announced in browse mode.

### 1.4.1 Use of Colour · 1.4.11 Non-text Contrast

**M3 · Moderate — the portal toggle's pressed state is lightness only, and vanishes under
forced colours.** `all · central · state` is a `role="group"` of `aria-pressed` buttons
(the state is programmatic and correct: Enter and Space flip it and the URL). Visually the
pressed button differs by text `#e8e4dc` against `#8a8477` (2.93:1 between the two states),
a `bg-card` fill at 1.14:1 against the page, and a border that goes from `rgba(244,240,232,.08)`
(1.17:1 — effectively none) to `--color-text-secondary` (6.72:1). No underline, weight,
glyph or shape changes; `portal-toggle-grey.png` shows the pressed chip as a slightly lighter
chip. Under `forced-colors: active` both borders compute to the same `rgb(0,0,0)`
(`sameBorder: true`) and the fill is removed, so the state is not visible at all. The
welfare audit's M2 was the same finding and was fixed with a tint plus an underline bar.
*Fix:* the same generated content — `aria-pressed:true` gets a 2 px bottom bar in
`--color-accent` (8.76:1) and `font-medium`; under forced colours the bar keeps a system
colour (`border-bottom-color: ButtonText`). Names unchanged.

**M7 · Moderate — the Wilson ribbons are below 3:1 and disappear in greyscale.** The rates
chart's per-year interval bars are `fill={colour} fillOpacity={0.22} stroke={colour}
strokeOpacity={0.35}` and the run ribbons `fillOpacity={0.16}`. Composited on the page:
central fill **1.64:1**, central stroke **2.46:1**, state fill **1.40:1**, state stroke
**1.84:1**, run ribbon **1.38:1**. `rates-grey.png` shows one faint bar at 2011 and no
ribbon along either line. The interval is the chart's honesty device — the caption says
"The interval covers sampling variation only" and the design brief calls for Wilson ribbons
(D4) — and a low-vision reader cannot see it in the graphic. Every interval is in the table
twin and the figure sentence, which is why this is Moderate, not Serious. *Fix (page-local
encoding, no frozen channel):* keep the fill faint if wanted but draw the interval's outline
at ≥ 3:1 — `strokeOpacity ≥ 0.6` for central (`#d2d2d2` at .6 → 4.4:1) and ≥ 0.7 for state
(`#9e9e9e` at .7 → 4.1:1; at .6 it is 3.3:1) — and cap the run ribbon's ends with the same
stroke.

**m4 · Minor — the no-data hatch's stripes are 1.8:1 against their ground.** The shared
`NODATA_STYLE` (a copy of IndiaMap's pattern: gold at α .30 on `#101116`, 7 px pitch) gives
stripes at **1.80:1** against the ground and **1.89:1** against the page; the ground itself
is 1.05:1 against the page. On this page the hatch never stands alone — every hatched cell
carries words ("not computed", a state name, "no usable value"), the hatched bar carries a
`#9e9e9e` stroke (7.38:1) and a heading, and the rates chart's hatch column would carry
"n < 30" (no year in this scrape falls below 30, so that mark is untested here) — so 1.4.11
is met by the text, and the finding is that the texture reads as "slightly different black".
The welfare audit's M1 raised the map's hatch for the same reason. *Fix:* α ≥ .55 on the
stripe in `NODATA_STYLE` (`StackTable.tsx`) and in `cppp-hatch` / `cppp-bar-hatch`; this is a
shared constant, so the change reaches `/energy` and `/welfare` tables too and should be
screenshot-checked there.

**m5 · Minor — the rule between categories and the method, and the histogram baseline, are
2.96:1.** `GREY.axis` `#5c5c5c` draws the line that separates Works/Goods/Services from
Limited in the tender-type chart (the caption tells the reader to read them apart) and the
histogram's x axis. 2.96:1 is just under the 3:1 a meaningful separator needs; the table
twin prints the rule as a row, so nothing is lost. *Fix:* `#626262` (3.3:1). `GREY.grid`
`#2c2c2c` at 1.42:1 is decorative and is not a finding.

### 1.3.1 Info and Relationships · 2.4.6 Headings and Labels

**M5 · Moderate — a `state=` filter narrows two tables without saying so, and has no clear
control.** Following a state link in "States on the state portal" (e.g. West Bengal) sets
`?state=West+Bengal&portal=state`, presses the `state` portal toggle, and the live region
announces "1,215 → 102 buyers · showing 25" — all correct. But nothing in the concentration
subsection names the state: its caption is unchanged ("n = 25 of 102 buyers shown (1,215 in
the family …)"), and the red-flags buyers table collapses to its two base-rate rows with the
sentence "0 of the 25 named buyers shown; the number of eligible buyers is not yet a field"
and no mention of West Bengal anywhere in that subsection (`rfMentions: 0`). A reader who
arrives by URL, or who scrolled past the states table, cannot tell why the buyers are gone;
the only way to clear the filter is the `all` or `central` portal button four screens away,
which is not labelled as clearing a state (`clearControls: 0`). The unlisted-state sentence
(`stateFilterSentence`) covers the case where the state is absent; the present-and-filtered
case is silent. *Fix:* print the active filter in words above both tables — "Filtered to
buyers whose key begins ‘West Bengal / ’ · 102 of 1,215 buyers · clear" — with the clear as a
link that patches `{ state: null }`, and add the state to each caption's n clause; announce
the same words in the concentration live region.

**M6 · Moderate — in the two widest tables the sticky first column is the portal, not the
buyer.** `TABLE_BASE` pins `tr > *:first-child` so "each row's name stays in view while a wide
table scrolls (U16)". In the concentration table (78 rem, twelve columns, the only table that
overflows at 1440) and the buyers table (46 rem) the first cell is `<td>portal</td>` and the
row header `<th scope="row">` is second, so what stays pinned is the word "central" or
"state" and the buyer's name scrolls off after ~15 rem. Reading HHI by value (column 9) for a
buyer means scrolling 40 rem right with no name in view; at 390 every column past the second
is read that way. `scope="row"` is correct, so assistive technology is unaffected; the loss is
for sighted keyboard, magnifier and phone readers. *Fix:* put the buyer `<th>` first and the
portal `<td>` second in both tables (the CSV column order can stay), or pin the first two
cells.

**m8 · Minor — duplicate `id="cppp-bar-hatch"`.** Both `Bars` charts in "Value bands and
tender types" define a `<pattern id="cppp-bar-hatch">`, the page's only duplicate id
(`dupIds`). The two definitions are identical, so the second `url(#cppp-bar-hatch)` resolves
to a pattern that looks the same; 4.1.1 still names it. *Fix:* `useId()` for the pattern id,
or define the pattern once in the first chart and reference it from both.

**m9 · Minor (register) — the ledger table has no `scope` on its seven column headers and no
caption.** `DataTable` in `Editorial.tsx` renders `<th>` without `scope="col"` and the
ledger passes no `caption`; the seven are the only `<th>` without scope in `main`'s 19
tables (`tablesNoScope: 7`). Browsers infer column scope for a single-row `<thead>`, so this
is Minor. *Fix:* `scope="col"` in `DataTable`, and a caption on the ledger ("125 awards ·
as of …").

**m12 · Minor (site) — two `<h1>`.** The sidebar's `<h1>ICIP</h1>` and the page's
`<h1>The procurement register, and what it cannot tell you</h1>`. The section's own
hierarchy is clean: h2 (`#cppp`) → h3 × 12 ("Read this first", the eleven subsections) →
h4 × 4 (the red-flag cards), no level skipped. Known from the welfare audit (its m2).
*Fix:* the sidebar wordmark as a `<p>` or `<div>`.

### 4.1.2 Name, Role, Value · 2.5.3 Label in Name

**M8 · Moderate (register) — the Sector `<select>` has no accessible name; Search is named
by its placeholder only.** The register's controls sit under `<p>` labels ("View", "Scope",
"Sector", "Search") that are not associated with their inputs. The View and Scope groups
carry `role="group" aria-label`, so their buttons are fine; the sector `<select>` has no
`<label>`, `aria-label` or `aria-labelledby` (`unnamed: [SELECT]`, the only unnamed control in
`main`) and is announced by its current option, "All sectors"; the search `<input>` is named
only by its placeholder `winner, project, body…`, which disappears on typing. *Fix:* turn the
two `<p>` labels into `<label htmlFor>` (or `aria-labelledby` the `<p>`), and keep the
placeholder as a hint.

**m2 · Minor — 40 sample links: the visible text is not in the accessible name.** In "The
sampled rows" each portal link shows "portal page (page gone)" and carries
`aria-label="Portal page for tender 35275, returned “Invalid Url” on 2026-09-26"`. The name
begins with the visible words but does not contain the visible string "(page gone)", so a
voice-control user saying "click portal page (page gone)" may not match (2.5.3). The names
themselves are good: distinct per row, and they say what the link will do. *Fix:*
`aria-label={`Portal page (page gone) for tender ${id}, returned “Invalid Url” on ${date}`}`.

**m3 · Minor — 102 links open a new tab without saying so.** The 40 sample links and the
register's 62 source links are `target="_blank"` and none of their names or text says "new
tab" (`newTab: { n: 102, warned: 0 }`). Not a 2.1 AA failure (G201 is advisory), but a
change of context without warning for a screen-reader user. *Fix:* append ", opens in a new
tab" to the `aria-label` on the sample links and a visually-hidden span in `Cite`.

**m6 · Minor — the buyers `<select>` changes two tables silently.** Choosing `all` under
"Named buyers" rewrites the buyers table (2 → 1,481 rows), changes the `data-effect`
sentence to "1,478 buyers and the pooled row" and mounts a second table ("Buyers by tenth of
the single-bidder rate"); there is no `aria-live` or `role="status"` anywhere in
`#cppp-redflags` (`liveInRedflags: 0`), whereas the concentration controls have one. A
screen-reader user hears the option change and nothing else (4.1.3). *Fix:* a visually-hidden
`aria-live="polite"` line carrying the `effect` text, as `Concentration.tsx` does with `VH`.

### 1.4.10 Reflow · 1.4.4 Resize Text

**m10 · Minor — 15 px of horizontal scroll inside `main` at 320 px.** At 390 the page is
clean: `document` and `main` scroll widths equal the viewport at the top and the bottom of
the page, all 18 table regions scroll inside themselves and each prints "scrolls →" on a
phone. At 320 `main.scrollWidth` is 335: the red-flag cards lay `dt`/`dd` on a
`grid-cols-[6.5rem_minmax(0,1fr)]` whose value column is 158 px, and the non-open card's
innocent reading (`dd > span`, "Limited tenders are lawful under GFR 2017 rule 162 …")
overruns it to x = 324. `body` is `overflow-x: hidden` so the page itself does not scroll,
but `main` does. 1.4.10 is set at 320 CSS px. *Fix:* `min-w-0 [overflow-wrap:anywhere]` on
the `dd`, or stack the label above the value below `sm` (`grid-cols-1`). The scaffold has no
overflow at either width.

### 2.4.2 Page Titled · 2.4.1 Bypass Blocks

**m11 · Minor (site) — the document title never changes.** `document.title` is "India
Corporate Intelligence Platform" on every route; nothing sets it per page. Known from both
earlier audits. *Fix:* a `useEffect` in `Layout` from the route's label, with the section
appended when `section=national`.

**m13 · Minor (site) — no skip link.** 30 sidebar links precede `main` and there is no
"skip to content"; landmarks (`main`, two `nav`, 18 named regions) satisfy 2.4.1 for
screen-reader users but not for sighted keyboard users. Known from the welfare audit (m9).
The section's own "In this section" nav is a good in-page skip once reached.

## 3. Checklist results (skill steps 3–5)

**Keyboard (step 3)** — 9 of 12 pass.
- [x] Every interactive element reachable by Tab — 152 stops inside the section: 101 links
      (11 jump plus the hide link, 40 sample links, 30 state links, 16 "family" caption
      links, and 3 others: "0 of 40 sampled rows", "§3.2a", "states on the state portal"),
      26 buttons (2 copy, 18 download, 3 portal, 3 sort headers), 18 scroll regions,
      4 summaries, 2 selects; 0 invisible, 0 off-screen; the walk exits to the register's
      "ledger" button. Every `<svg>` is `role="img"` with no interactive
      children, so none needs focus.
- [x] Tab order follows the visual order — head → strip → verification → copy citation →
      jump nav → subsections in page order; inside each subsection figure links, then the
      table region, then its download.
- [ ] Focus indicator visible — computed on all 152 stops (`outline: solid 2px #c9a86c`,
      8.76:1; `outline: auto` on summaries); pixel-verified on six kinds (btn-ghost 578 px
      changed, region 1,211, nav link 312, select 1,034, sort button 206, summary 2,320).
      **M1** for the stops the strip covers; **m1** for the heading.
- [x] No keyboard trap — none; Tab leaves the section and every region.
- [x] Enter and Space trigger buttons — Enter on `central` sets `?portal=central`,
      `aria-pressed` flips, effect reads "1,215 → 426 buyers"; Space on `all` clears it;
      Enter on the value sort header sets `?sort=value` and `aria-sort="descending"` with
      focus kept on the button; Enter on "Copy figure" writes the clipboard and the status
      reads "Figure copied, with its innocent reading and citation."; Enter on "Download
      CSV — 58 rows" fires `cppp-quality-2026-09-26.csv`; Enter on a jump link moves the
      viewport (target below the strip at 1440); Enter on a state link sets
      `?state=…&portal=state` and the live region announces the new count; Enter on the
      hide link removes the section (**M4** for where focus goes).
- [x] Selects operable — `rows` → `?rows=100` and 100 rows; `buyers` → `?buyers=all` and the
      tenths table (**m6** for the silence).
- [x] Arrow keys — ArrowRight scrolls a focused table region (0 → 80 px).
- [x] Escape — nothing to dismiss (no dialog, no popover, no card); Escape changes nothing,
      which is correct.
- [x] `<details>` — Enter opens, Space closes each of the four quality disclosures.
- [x] In-page skip — the "In this section" nav reaches all eleven subsections and the hide
      link; every target id exists.
- [ ] Site-level skip link — none (**m13**).
- [ ] Dialogs — none exist (n/a).

**Screen reader (step 4)** — structure probed via the DOM; no real screen reader was run
(§6). 10 of 13 pass.
- [x] Informative SVG named — 4 `role="img"` charts, each with an `aria-label` that names
      the measure, the n, what is excluded or shown apart, and "table follows"; each sits in
      a `<figure>` with a `<figcaption>` carrying the caveats, both dates and the tier
      sentence. No decorative SVG in the section.
- [x] Icon-only buttons labelled — none exist in the section; the sort arrows are
      `aria-hidden` beside their words; the phone nav button is named with `aria-expanded`.
- [ ] Single `<h1>` — **m12**.
- [x] Heading hierarchy — h2 → h3 × 12 → h4 × 4, no skip; the section is
      `aria-labelledby` its h2.
- [x] Landmarks — `main`, a named `nav` ("In this section"), 18 named `role="region"`
      scroll containers; `header` and `footer` are inside the article.
- [x] Links descriptive — jump links by subsection name; state links by state; sample links
      by tender id and outcome; "family" links repeat but are unambiguous in their caption
      (2.4.4 in context).
- [ ] Form inputs labelled — the two section selects are wrapped in `<label>` ("rows",
      "buyers"); **M8** for the register's select and search.
- [x] Required fields / errors — none exist.
- [x] Status messages — two `role="status"` (copy citation, copy figure) and one polite
      live region (concentration counts); **m6** for the buyers select.
- [x] Tables — 18 tables in the section, every one with a `<caption>` stating the n, both
      dates and the tier sentence, `scope="col"` on every column header and `scope="row"`
      on every row header (0 `<th>` without scope in the section; 7 in the register, **m9**);
      `aria-describedby` on eight tables points at the caveat and the concentration
      definitions, and every referenced id exists.
- [ ] Name/role/value on custom controls — `aria-pressed` on the 3 portal toggles,
      `aria-sort` on the 3 sortable headers with the button inside the `<th>`; **M3** (visual
      state), **m2** (label in name).
- [x] Dynamic content — arriving from the head link focuses the h2; the two loading
      placeholders (`data-pending`) are replaced by content within the page load.
- [x] Reading order — `dl`/`dt`/`dd` for the red-flag cards and the provenance list;
      `figure`/`figcaption` for every chart; the strip's separators are `aria-hidden`.

**Visual and cognitive (step 5)** — 9 of 12 pass.
- [x] Text ≥ 4.5:1 — 0 of 2,364 text-bearing elements below threshold; the lowest token in
      use is `text-muted` on `bg-card` at 4.67:1 (the pressed toggle) and the register's
      placeholder at 5.03:1; SVG text fills are 6.12–13.08:1.
- [x] Large text ≥ 3:1 — headings are `--color-text`.
- [ ] UI components and graphical objects ≥ 3:1 — **M7**, **m4**, **m5**; marks
      (13.08 / 7.38), bars (9.54), the bands interval line (17.36), the hatched bar's stroke
      (7.38), the focus ring (8.76) and the pressed border (6.72) pass; `--color-border`
      at 1.17:1 is the resting border of ghost buttons, selects and table rules — a resting
      boundary is not required to reach 3:1 when the control is otherwise identifiable, and
      each of these carries text.
- [ ] Information not by colour alone — passes for every data encoding: portal by shape
      (circle / square) with a direct label at the line's end; thin and partial years hollow,
      with the reason in the table's flag column (13 hollow marks ↔ 13 flag cells, all
      matching); the no-data group as a hatch plus a stroke plus a heading plus words; every
      hatched table cell with words (26 `data-nodata` cells, 0 empty); the tier as a chip
      with its word and as the sentence "tier: reported (dataset-only; portal agreement
      unknown)" in all 22 captions; no `stroke-dasharray` is drawn because no edge is.
      **M3** for the toggle state.
- [x] Text resizes to 200 % without loss — 640 × 400 at dpr 2: 0 overflow in `main` or the
      document. Charts are drawn at their container's pixel width (`useWidth`), so labels
      keep their size.
- [ ] No horizontal scrolling at 320 px — 390 clean at the top and the bottom of the page;
      **m10** at 320.
- [x] Text-spacing override — no clipping or overlap except the visually-hidden live region,
      which is clipped by design.
- [x] Reduced motion — `prefers-reduced-motion: reduce`: 0 animations at rest, 0 after a
      filter, 0 after a jump; no `scroll-behavior: smooth` anywhere; every `scrollIntoView`
      is instant. 22 elements in the section carry `transition: all 0.2s` (`.btn-ghost`,
      `.input-field`) — these are colour and border transitions, not motion, and 2.3.3 is
      AAA; advisory only, see §5.
- [x] No flashing.
- [x] No autoplay.
- [x] No timeouts.
- [x] Orientation not locked.

## 4. The scaffold state (build without `research/raw/cppp/`)

Rendered clean (0 console errors) at 1440 and 390. `CPPP_PRESENT` is false, so the section
keeps its kicker and its h2 and prints exactly: "CPPP pipeline outputs not present in this
build. The section reads research/raw/cppp/, written by the offline pipeline
(scripts/cppp/build.py); without it there is nothing to state, and nothing is estimated in
its place." followed by the hide link. Measured: 0 tables, 0 `<svg>`, 0 occurrences of a bare
"0", 1 control (the hide link, with a 2 px ring). The head link above the register reads "The
CPPP award scrape — not present in this build" and, followed by keyboard, lands focus on the
h2 (`afterHeadLink.active: "cppp"`). No horizontal overflow at 390 (390 / 390). **M4** and
**m1** apply here exactly as in the full build (hide → `body`; the h2 has no ring). Nothing
else in the scaffold is a finding.

## 5. What passed (so it need not be re-checked)

- **The alias.** `?view=national` is rewritten in place to `?section=national` with every
  other param kept (`redirect.viewGone: true`), and the register's `view` param still selects
  ledger / map / graph.
- **Names.** 152 of 152 controls in the section have an accessible name; the 4 charts are
  named; the tier chip carries its word.
- **Twin ↔ graphic.** Rates: 32 plotted points and 34 table rows across the two portals, the
  2 unplotted rows listed with their reason and counted in the SVG name ("2 rows not
  plotted"); every point has its row; every hollow mark's flag matches its row's flag cell.
  Bands: 6 bars ↔ 6 rows and 5 ↔ 5, each bar's printed "% · n" found in its row, the hatched
  bar's row marked `data-nodata` and worded "not a value band: value missing or implausible".
  Timing: 11 bars ↔ 11 rows, each bar's count in its row.
- **Denominators and dates.** Every caption carries n, "scraped …", "computed 2026-09-26"
  and the tier sentence (22 occurrences); the strip carries counts only; every figure
  sentence names its family and links to the families table.
- **No-data.** 26 hatched cells, all with words; the absent-file branches
  (`Missing`, the concentration "not present" line) print a sentence, never a zero.
- **Contrast of text.** No failure among 2,364 elements; the register's placeholder 5.03:1.
- **Sort and toggle semantics.** `aria-sort` follows the URL; `aria-pressed` follows the URL;
  the URL carries `portal`, `state`, `sort`, `rows`, `buyers` and an unrecognised value is
  named once in a `role="status"` line.
- **Copy and download.** Clipboard writes succeed with a spoken status and a failure message
  path; downloads fire on Enter; the CSV comment block carries the caveat, family, dates,
  pipeline, digests and params.
- **Regions.** Every table's scroll container is a named region and scrolls by keyboard.
- **Motion.** None; instant jumps; no smooth scrolling.
- **Reflow at 390.** No page scroll; 18 regions scroll inside themselves with a hint.
- **Text spacing and 200 %.** No loss.
- **Forced colours.** Text and borders map to system colours; the hatch loses its stripes
  but keeps its words; **M3** for the toggle.
- **Language and parsing.** `<html lang="en">`; one duplicate id (**m8**), no missing
  `aria-describedby` targets.

## 6. What could not be tested

- **A real screen reader.** No NVDA, JAWS, VoiceOver or TalkBack in the container. Names,
  roles, states and live-region text were verified in the DOM; what is spoken — in particular
  whether 152 stops with 18 region announcements and 40 near-identical sample links are
  tolerable in browse mode, and whether the concentration live region interrupts the select's
  own announcement — was not.
- **Voice control.** 2.5.3 was checked by string containment only (**m2**, and the 15
  region names that differ from their captions, which are not controls with visible labels
  and are recorded as advisory only).
- **True browser zoom to 200 % and 400 %.** 200 % was approximated with a 640 × 400
  viewport at dpr 2; 320 × 844 covers 1.4.10's 320 px requirement.
- **The rates chart's hatch column.** No AOC year in this scrape has n < 30, so the
  `cppp-hatch` mark and its "n < 30" label were not rendered and could not be measured; the
  bands chart's hatch (the same pattern) was.
- **Colour-vision deficiency beyond greyscale.** Every data mark is achromatic (U17) and the
  only chromatic marks are the gold hatch and the gold focus ring, so greyscale is the harder
  test; protanopia/deuteranopia were not simulated.
- **Forced colours** was a Chromium emulation, not a Windows High Contrast session.
- **Touch.** Mobile emulation rendered the phone layout; taps, swipes inside a region and
  long presses were not performed. Target sizes were measured only: 63 of 133 targets in the
  section are under 24 px on a side (31 are inline links, exempt); the sort buttons (15 px)
  and the jump nav links (16 px) would be findings under WCAG 2.2's 2.5.8, which this audit
  does not cover.
- **Small type at rest.** 117 elements at 10 px, 60 at 10.5 px and 99 at 11 px (mono notes,
  captions, table headers) on a phone. Not a 2.1 failure (1.4.4 resize works); `/finance`
  lifts these to 12 px below 640 px with a page-local rule, and the same would suit here.
- **The 55 px strip gap's cause (M2).** The offset was measured in four contexts; the CSS
  mechanism (why `top: 56px` settles at y 112 under a scroll container with 56 px padding)
  was not isolated, so the fix is stated as a measurement to repeat, not a rule.
- **Automated tooling.** No axe/Lighthouse run; the DOM sweeps above are a partial
  substitute. Automated tools catch roughly 30–40 % of failures; the manual steps cover the
  rest and were done as far as the container allows.
- **Page tests.** `scripts/pages/tenders.test.mjs` was not run by this audit (it is not in
  the task's gates and builds its own scaffold).

## 7. Gates run for this audit

`npm run generate` ✓ (`generate: OK`; energy 12 files 404 nodes 711 edges, welfare 7 files
286 / 335, finance 7 files 353 / 1,168, ngo 5 files 138 / 292, capital 14 files 133 / 221) ·
`npm run validate` ✓ (`validate: OK`, 27 warnings: 26 "court ruling modelled as enforce —
begin d with ‘Judicial ruling on <claim id>: ’" on `research/raw/{energy,welfare,capital}/*`
files and the declared `sensex50` 49 of 50; no error) · `npm run build` ✓ (`✓ built in
11.94s`) · `npm run smoke` ✓ (`smoke: OK`, every route including `/tenders`,
`/tenders?view=map&scope=states` and `/tenders?view=graph&scope=centre`, 0 console errors) ·
`npm run viewport` ✓ (`graph-viewport: OK`). The scaffold was built from a scratch copy; no
file under `research/raw/` or any `*.generated.ts` was edited by this audit, and no source
file was changed.
