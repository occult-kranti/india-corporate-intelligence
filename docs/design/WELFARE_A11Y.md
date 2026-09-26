# /welfare — WCAG 2.1 Level AA audit

*Audit A11Y-002 · scope: the `/welfare` route of the built `dist` (populated register, run
`run-33317dc6d234`, as of 2026-09-25, 78 schemes) and a scaffold build made from a scratch copy
without `research/raw/welfare/` (run `run-8254dd58f780`, `EMPTY = true`) · target: WCAG 2.1 AA ·
date: 2026-09-26 · procedure: the sweetclaude `testing-accessibility` skill's seven steps, with
its state files and issue filing left out. Nothing in this document was edited into the page:
it is a report, and every fix below is a proposal.*

---

## Status (2026-09-26, after the fix batch)

| id | finding | status |
|---|---|---|
| S1 | twin controls unreachable after opening from the summary | fixed — every twin's controls tabbable once open (386/133/457/597/505 of each) |
| S2 | tabbable controls inside a closed `<details>` | fixed — 0 tabbable in every closed twin; real Tab walks never land inside one |
| S3 | the map is `role="img"` while being the keyboard widget | fixed — `role="listbox"` + `aria-roledescription="map"`, 36 `role="option"` paths, `aria-activedescendant`; spec §6.1 and AC-05/65 amended |
| M1 | darkest map fills 1.1–1.6:1 | fixed — painted classes start at RAMP[2] (3.1:1); searched-none class gets an edge |
| M2 | toggle state by colour alone | fixed — pressed state adds a tint and an underline bar (generated content, names unchanged) |
| M3 | year slider rests at 2.3:1 | fixed — resting opacity .7 |
| M4 | readout card covers the focused state | fixed — card moves to a non-overlapping corner; Escape hides it before clearing `st` |
| M5–M7, m1–m11 | | open |

Verified by an independent agent on a pinned build (keyboard walks, accessibility tree,
contrast probe) and by the acceptance suite: 70 pass / 0 fail / 15 skipped (FULL),
9 / 0 / 76 (EMPTY). Everything below is the audit as filed.

## 0. Summary

| severity | count | definition (from the skill) |
|---|---|---|
| **Critical** | **0** | a reader with a disability cannot complete the task at all |
| **Serious** | **3** | significantly difficult — a workaround exists but is painful |
| **Moderate** | **7** | confusing, task completable with effort |
| **Minor** | **11** | small friction |
| total | **21** | |

**Nothing blocks release under the skill's rule** (Critical findings block). The three Serious
findings share a root and a reader: the keyboard user. A table twin opened from its own
disclosure keeps all 386 of its controls at `tabindex="-1"`, so the export buttons, the
horizontal scroll region and every state and source link are visible and unreachable (S1);
the inverse case — a twin closed after the skip link, or either lazy twin closed after being
opened — leaves 386–597 tabbable controls inside a one-pixel, clip-path-hidden container, so
Tab walks hundreds of stops through a blank viewport (S2); and the map is `role="img"` while
being the page's arrow-key widget, a role that tells a screen reader there is nothing here to
operate (S3). The Moderate findings are mostly about contrast of things that are not text:
the map's darkest fills sit at 1.1–1.6:1 against the page (M1), toggle state is colour alone
(M2), the year slider rests at 2.3:1 (M3), and the readout card covers the state the keyboard
just focused (M4).

What is good is substantial and is listed in §5 so it need not be re-derived: the text
contrast sweep found **0 failures in 10,072 text elements** (the `--color-text-muted` token
raised after the energy audit holds), all 4,150 controls have names, the map and its table twin
agree count for count, the evidence tier is legible without colour everywhere it appears, the
live region announces every filter, selection and copy, and the page reflows to 320 px with no
horizontal scroll.

## 1. Method

**Fixtures.** `npm run generate && npm run validate && npm run build` were run first (all
green; validate `OK` with its one standing warning, `sensex50` 49 of 50). The existing
`dist-empty` on disk predates the welfare page (its bundle does not contain the scaffold
callout), so the scaffold was rebuilt from a scratch copy of the tree with
`research/raw/welfare/` removed and `node_modules` linked, through `assemble-fleet` → `tsc -b`
→ `vite build`. Nothing under `research/raw/`, no `*.generated.ts` and no source file was
touched.

**Browser.** Playwright 1.62 on the pinned Chromium 141 at `/opt/pw-browsers/chromium`, served
from `dist` by the one-file HTTP server `scripts/smoke.mjs` uses. Contexts: desktop 1280 × 800;
phone 390 × 844 and 320 × 844 (`isMobile`, `hasTouch`, dpr 2); 640 × 400 at dpr 2 as the 200 %
zoom stand-in; a desktop context with `reducedMotion: 'reduce'`; one with
`forcedColors: 'active'`. Chromium 141 supports `::details-content`, so the page's rule that
keeps a closed twin readable to assistive technology is live in this browser and was tested as
such. Probe scripts, JSON results and screenshots are in the session scratchpad
(`a11y-welfare.mjs`, `a11y-probe2.mjs`, `results-*.json`, `shots-full/`, `shots-empty/`); they
are not committed.

**Automated scan (skill step 2).** No axe, Lighthouse, WAVE or Pa11y is installed and the
project rule is no new dependencies, so step 2 was replaced by DOM probes written for this
audit: an accessible-name walk over every control and every `<svg>`; a 260-stop Tab walk with
computed-style and pixel-difference checks of the focus ring (screenshot with focus, blur,
screenshot again, compare); a text-contrast sweep over every element with its own text
(foreground composited against every ancestor's `background-color` and `opacity`, large-text
threshold applied); a token table computed from `src/index.css`; an inventory of the map's
fill classes, patterns and ballots against the legend, the figcaption and the table twin;
greyscale pixel sampling inside state fills and legend swatches; and overflow, sticky-height
and target-size walks at phone widths. These catch roughly what axe catches for contrast,
names and roles; they do not catch what a screen reader would say.

**Contrast arithmetic.** WCAG relative luminance on the tokens in `src/index.css`. Composited
values (an `rgba` stroke, an element at `opacity`) are alpha-blended onto `--color-bg`
`#0a0a0c` before the ratio is taken. Text needs 4.5:1 (3:1 at ≥ 24 px or ≥ 18.66 px bold);
graphical objects and component boundaries need 3:1 (1.4.11). Greyscale figures are mean
luminance of pixels sampled inside the shape from a screenshot taken under
`filter: grayscale(1)`.

## 2. Findings by criterion

Each finding: **criterion · severity** — what was observed, where, the evidence, and a fix
that touches no frozen channel (edge dash = tier, node hue = family, node shape = type, node
size = declared magnitude; on this page the map fill, the textures and the ballot shapes are
page-local encodings and may be adjusted, the tier dash may not).

### 2.1.1 Keyboard

**S1 · Serious — a twin opened from its own summary keeps every control unreachable.**
`StageTwins` wraps its three disclosures in `<Tabbable.Provider value={open}>`, where `open`
is the prop (`view=table`, `#stage-tables`, or the skip link). When a keyboard user presses
Enter on "Map as a table" the `<details>` opens natively (960 px wide, fully visible) but the
prop has not changed, so all **386** controls inside stay at `tabindex="-1"`: "Copy as TSV",
"Download .tsv", the `role="region"` scroll container (the only way to scroll a 72 rem table
sideways by keyboard), 36 state links, every source link. Tab from the summary lands on the
next summary, "Clock as a table" (`twinOpenedBySummary`: `open: true, tabbable: 0,
tabindexMinus1: 386`; `tabFromOpenedSummary.insideTwin: false`). The same holds for the
matrix, money, lanes and elections tables nested in the first two twins. A sighted keyboard
user sees a table with buttons and links and cannot reach any of them; the only route is the
skip link or `?view=table`, which they have no way to discover from the summary.
*Fix:* bind `Tabbable` to the disclosure's real state, per disclosure:
`const [isOpen, setIsOpen] = useState(open); useEffect(() => setIsOpen(open), [open]);
<details open={isOpen} onToggle={(e) => setIsOpen(e.currentTarget.open)}>` and
`<Tabbable.Provider value={isOpen}>` inside each `<details>`, in `StageTwins` and in
`LazyTwin` (which currently provides no `Tabbable` at all). The `QLink tabIndex={open ? …}`
literals in `StageTwins` should read the same state.

### 2.4.7 Focus Visible · 2.4.3 Focus Order

**S2 · Serious — a closed twin can hold hundreds of tabbable, invisible controls.** The
inverse of S1. The page stylesheet keeps a closed `details[data-twin]` rendered for assistive
technology by giving `::details-content` a 1 × 1 px, `clip-path: inset(50%)` box. After the
skip link (`forceTables`) or under `?view=table`, closing "Map as a table" from its summary
leaves **386** controls at `tabindex="0"` inside that box; opening then closing "Every action
as a row" (a `LazyTwin`, which renders its table once and never provides `Tabbable`) leaves
**597**, and "The claims as a table" likewise. Measured with real keyboard input: Tab from the
closed summary goes "Copy as TSV" (rect 47 × 64 inside the clip) → "Download .tsv" → a
1 × 42,903 px scroll region → "Andaman and Nicobar Islands" → … , none visible on screen;
the browser scrolls the viewport to follow focus into blank page
(`lazy-twin-closed-focus.png` is 1280 × 800 of `--color-bg`). Tab does eventually leave, so
this is not a hard trap under 2.1.2, but a reader must press it several hundred times with no
focus indicator and no idea where they are.
*Fix:* the S1 fix resolves this for `StageTwins`; `LazyTwin` needs the same provider. If the
`::details-content` rule is kept (see M7), every twin must provide `Tabbable` from its live
open state, which is the invariant the `Tabbable` comment in `components/welfare/ui.tsx`
already states and the code does not enforce.

**m5 · Minor — the skip target has no focus indicator.** "Skip to this stage as tables" moves
focus to `<h3 tabindex="-1" class="… outline-none">` ("This stage as tables"); computed
`box-shadow: none`, pixel difference with and without focus 0 (`stageH3.ringPixels`). The
panel heading it is modelled on carries `focus-visible:ring-1` and renders a 1 px accent ring
(`panelH2.ringPixels.meanDelta 8.06`). Not a 2.4.7 failure strictly (the heading is not in
the Tab sequence) but a keyboard user who activated the skip link has no confirmation of where
they landed. *Fix:* the same `focus-visible:ring-1 focus-visible:ring-accent/60` as `PanelShell`.

### 4.1.2 Name, Role, Value

**S3 · Serious — the map is `role="img"` and is the page's keyboard widget.** The `<svg>`
carries `tabindex="0"`, walks 36 states with the arrow keys in a north-to-south order, opens a
state on Enter or Space, clears the selection on Escape, and names itself "…arrow keys move
between states, Enter opens one; a table version follows". All of that works in the browser
(`afterArrow`, `afterEnter: activeIsPanelH2 true`, `afterEscape: activeIsMap true`). But `img`
is a non-interactive role: its descendants are presentational (the 36 `<path><title>` are not
exposed), it does not put a screen reader into forms/focus mode, and in browse mode the arrow
keys are taken by the virtual cursor, so the walk the name promises is unreachable until the
reader guesses to switch modes. The energy audit made the same point about focusable claims
(its S3). The table twin is the workaround, and it is a good one, hence Serious not Critical.
*Fix (least change):* `role="application"` with `aria-roledescription="map"` on the `<svg>`,
keeping the name and `aria-describedby`; add `aria-activedescendant` pointing at the focused
state's `<path id=…>` given `role="option"` (SVG elements take ARIA roles in Chromium and
Firefox) so the reader hears the state without depending on the live region. *Fix (fuller):*
a roving-tabindex `role="listbox"` over the state paths, which also gives each state a real
accessible name and selected state.

**m8 · Minor — "← Back to ‹state›" is a link that acts as a button.** `PanelShell` renders
`<a href="#" aria-label="Back to Maharashtra" onClick={preventDefault…}>` (`backLink.href:
"#"`). Under `HashRouter` a bare `#` resolves to the `/` route if the handler does not run, and
middle-click opens the dashboard. *Fix:* `<button type="button">`.

**m11 · Minor (scaffold) — disabled chips give no reason.** In the empty build 16
`aria-disabled` category chips stay in the Tab order (an acceptable pattern) and each is
announced "women-cash (0)" with nothing to say why, while the metric buttons say "unavailable:
choose a year". The map's name in the empty build also drops the keyboard instruction
("…0 of 36 states with a value; nothing recorded yet") although the arrow keys and Enter still
work (`afterEnter: "#/welfare?st=pb"`, "Punjab opened: 0 state schemes, 0 elections in the
file"). *Fix:* `aria-label={`${c}, none in this file`}` on a zero-count chip; keep the
instruction in the empty name or disable the walk.

### 1.4.11 Non-text Contrast

**M1 · Moderate — the map's darkest fills do not separate from the page or from each other.**
Token arithmetic and greyscale pixels agree:

| fill | means | vs page `#0a0a0c` | vs hatch ground `#101116` | vs flat zero `#15171c` | greyscale mean L (sampled inside states) |
|---|---|---|---|---|---|
| ramp floor `#2e373f` (RAMP[0]) | "1" scheme (8 states); also the floor of every money ramp | 1.63:1 | 1.56:1 | 1.48:1 | 0.0351 |
| flat `ZERO_FILL #15171c` | searched, none live | 1.10:1 | 1.05:1 | — | 0.0188 |
| hatch (gold lines at α .34 on `#101116`) | none recorded | 2.09:1 (line) | 1.99:1 (line) | 1.89:1 | 0.0066 |
| stipple (dots at α .32) | live, no comparable figure | 2.64:1 (dot) | 2.52:1 (dot) | 2.39:1 | 0.0268 |
| page background | — | — | — | — | 0.0030 |

So "1 scheme" versus "none recorded" is a 1.50:1 step (greyscale), "searched, none live"
versus "none recorded" is 1.22:1 and versus the page 1.10:1: the flat class is the page colour
with the hatch lines missing, which is exactly what `map-grey-y_2023_cat_women_cash_m_budgeted.png`
shows for Chhattisgarh and Telangana. The state boundary stroke (`rgba(10,10,12,.85)`) and
the gold outline (α .22, 1.45:1) do not separate a dark state from the page either. The
interface-design skill's own floor — "anything below roughly `#2e373f` disappears into the
page" — is met by the ramp exactly at the boundary and undercut by `ZERO_FILL`. The
information is recoverable from the legend counts, the figcaption and the table twin, which
is why this is Moderate; the map itself, for a low-vision reader, does not show its three
non-value classes or its lowest value class as regions. The four ramp steps are separated from
one another by 1.37–1.40:1, which is normal for a sequential ramp and is not the finding.
*Fix (page-local encodings; no frozen channel):* start every painted ramp at RAMP[2]
(`#3d6668`, 3.11:1 vs page) — e.g. `RAMP_STEPS[4] = [2, 3, 5, 6]` — or lift RAMP[0] to
≥ 3:1; raise the hatch stroke to α ≥ .6 and the stipple dot to α ≥ .6 so the textures
themselves clear 3:1 against their ground; and give the flat zero an edge — a 0.8-unit
stroke in `--color-text-muted` (5.3:1) — or a third texture (cross-hatch), so "searched, none
live" is identified by a boundary or a pattern rather than a 1.1:1 flat. Re-take the
greyscale legend screenshot AC-83 asks for afterwards.

**M3 · Moderate — the year slider rests at 2.26:1.** With no year chosen (the default view)
the range input is `opacity-40`, so its accent thumb and track composite to **2.26:1** against
the page (`slider.accentVsPageAtOpacity`; 8.76:1 at full opacity). It is the page's primary
control and is dimmed in its default state. *Fix:* `opacity-[.62]` (3.0:1) or no dimming; the
readout beside it already says "All years", which is what the dimming was for.

**m4 · Minor — text fields have a 1.43:1 boundary.** The search input and the three selects
(Metric, Party, Level on a phone) use `border-border-light` (`rgba(244,240,232,.15)`,
1.43:1 vs page) on a fill at 1.06:1. Each is identifiable by its placeholder or option text
and the selects by their native arrow, so this is Minor here where the energy audit's five
fields were Moderate. *Fix (token or page-local):* a border at ≥ α .35 (3.1:1).

### 1.4.1 Use of Colour

**M2 · Moderate — toggle state is conveyed by colour alone.** 25 `aria-pressed` buttons
(metric 5, category 12, level 3, evidence tier 4, view 2, "All years") show pressed as accent
text and border, unpressed as `--color-text-secondary` text and the 0.15-alpha border. The
two text colours are **1.30:1** apart, there is no fill, weight, underline or glyph change
(`nonText.pressed`), and in forced-colours emulation pressed and unpressed render identically
(black text, black border; `forced-colors.png`). The programmatic state is correct
(`aria-pressed` verified on every toggle), so screen-reader users are fine; colour-blind and
low-vision sighted users are not. *Fix:* pressed adds a fill (`bg-accent/15`) and a leading
mark (`■` or `✓`), or a 2 px bottom rule; the tier toggles keep their dash swatch either way.

### 1.4.13 Content on Hover or Focus

**M4 · Moderate — the readout card covers the map, including the state under keyboard
focus, and cannot be dismissed.** The card (`pointer-events-none absolute top-2 left-2`,
288 × 191 px) appears on pointer hover and on keyboard focus and sits over the map's north-west,
overlapping 12 states (`ch ct dl gj hr hp jk mp pb rj ut up`). Jammu and Kashmir is the first
state in the keyboard walk, and `state-focus-circle.png` shows its focus circle hidden behind
the card's text. Escape does not close the card (`hoverCardAfterEscape: true`); it clears the
URL selection instead. The card is not hoverable (moving onto it lands on the state beneath,
which changes the card). The readout text is also in the live region and the state panel, so
nothing is lost, only obscured. *Fix:* render the card outside the drawing — under the
figcaption, or in the margin column at ≥ 1280 px — or anchor it to the gutter opposite the
focused/hovered state; Escape hides it without touching `st`.

### 1.4.10 Reflow · 1.4.4 Resize Text

**M5 · Moderate — half the viewport is pinned at 200 %.** The sticky stack (facts + year
scrubber) measures 149 px of 800 at 1280 (19 %); 113 px plus the 57 px fixed phone header of
844 at 390 (20 %); 131 + 57 of 844 at 320 (22 %); and **201 px of 400 at the 200 % stand-in
(50 %)**. No content is lost and nothing overflows — `document`, `body` and `main` scroll
widths equal the viewport at every width, with 0 offending elements outside `overflow-x: auto`
containers — so 1.4.10 passes; the reading experience at 200 % does not. *Fix:* below a
viewport height (`max-height: 520px`) make the stack `position: static`, or collapse it to
the year readout and slider when the map is off screen.

### 2.4.2 Page Titled

**M6 · Moderate (shared) — `document.title` is "India Corporate Intelligence Platform" on
every route.** Unchanged since the energy audit (its M5). *Fix:* `useEffect(() => {
document.title = 'Distribution funds — ICIP'; })` in the page, or per route in `Layout`.

### 4.1.2 · 1.3.2 Meaningful Sequence

**M7 · Moderate — closed twins are announced collapsed and read anyway.** With
`::details-content` supported, the three stage twins expose **97,194 + 28,425 + 76,717
characters** of table content to assistive technology while their summaries report
"collapsed" (`twins[].exposedTextChars`, `open: false`, inner width 1 px). A screen-reader
user reading linearly meets three closed disclosures followed by roughly 200,000 characters
of tables they were just told are closed; seven of the page's seventeen `role="region"`
landmarks are in the landmark list while visually absent. The source comment says this is
"under review" pending the acceptance tests, which read closed twins through `innerText`.
The spec's own preference (U2) is that closed twins are closed to everyone and the skip link
and `?view=table` open them. *Fix:* drop the `::details-content` rule and open the twins in
the tests via `#stage-tables` (or read `textContent`); S1/S2's `Tabbable` fix is still needed
so that a twin the reader opens is usable.

### 2.4.6 Headings and Labels · 1.3.1 Info and Relationships

**m1 · Minor — heading levels skip from h1 to h3.** Reading order after the page h1: "Every
assembly election in the file…" (h3, the control card), "What the record does not contain"
(h3, the margin voids), "This stage as tables" (h3), then the first h2 ("The control…"). The
same in the scaffold. Elsewhere the hierarchy holds (h2 → h3 → h4 in Narratives, h3 → h4 in the
phone by-party blocks). *Fix:* the three stage-level headings as h2, or an h2 "The stage"
wrapping map, margin, legend and clock.

**m2 · Minor (shared) — two `<h1>`s** ("ICIP" in the sidebar and the page title). Unchanged
since the energy audit (its m2).

### 1.4.3 Contrast (Minimum)

Passes on every text element (see §5): 0 of 10,072 fail at 1280, 0 at 390 and 320, and 0
inside an open scheme card. One residue:

**m3 · Minor — the search placeholder is 4.44:1.** Tailwind v4's preflight sets
`::placeholder` to `currentcolor` at 50 %, which over `--color-bg-elevated` measures 4.44:1
(pixel-sampled max luminance 0.199 in the field), just under 4.5:1 at 14 px. *Fix:*
`placeholder:text-text-muted` (5.03:1 on the elevated surface).

The scaffold's sweep reports 22 elements at 2.46:1: the 12 category chips, the 4 money
metrics and the year buttons at `opacity-50` because they are `aria-disabled`. Inactive
components are exempt under 1.4.3 and this is not counted; see m11 for what they announce.

### 4.1.3 Status Messages

**m6 · Minor — two changes are not announced.** The single `aria-live="polite"` region
announces filter effects ("78 → 21 schemes"), the state readout on every arrow key, "Punjab
opened: 4 state schemes, 5 elections in the file", "Panel closed", "Link copied" and
"Citation copied" (all verified). Toggling an evidence tier changes the findings line
("148 of 231 findings · 71 of 113 benefit rows") and toggling Map/Table removes the map and
opens the twins, and neither says anything (`tierToggleLive.live: ""`, `viewToggle.live:
""`) because both go through `patch()` rather than `set()`. *Fix:* announce the findings line
on tier change and "shown as tables" / "shown as map" on view change.

### 1.4.12 Text Spacing · 1.4.4

**m7 · Minor — lane labels are truncated, at default spacing and more so under the
override.** The clock's label column is 120 px (96 px on a phone) with `truncate`: 12 of 14
central lane names are cut at rest ("National Social Assis…"), and 16 elements clip under the
1.4.12 override. The full name is in each button's `aria-label` (which contains the visible
text, so 2.5.3 passes) and in the lanes twin; a sighted reader has neither a tooltip nor a way
to widen the column. *Fix:* let rows grow to two lines (the row model already positions by
`y`), or show a visible full name on hover and focus.

### 2.4.1 Bypass Blocks

**m9 · Minor (partly shared) — no site-level skip link, and 63 stops before the map.** The 29
sidebar links precede the page on every route (`Layout`, as in the energy audit's m9). On
this page the strip and filter controls are 34 more stops before the in-page skip link, and
the page as a whole has **4,150** tab stops, 3,860 of them source links — a consequence of
the rule that no source list is ever truncated, and not a finding in itself. The in-page skip
link goes only to the tables. *Fix:* "Skip to content" as the first focusable in `Layout`; on
this page a one-line jump list of the eight `Section` ids under the standfirst.

### Forced colours (best practice, not a 2.1 criterion)

**m10 · Minor — the legend stops keying the map in forced-colours mode.** Under
`forced-colors: active` the four ramp swatches (`<span style="background: …">`) are painted
Canvas white while the SVG path fills keep their author colours (`forcedColors.pathFill
rgb(61,102,104)`, `legendSwatchBg rgb(255,255,255)`). The texture swatches, being `<svg>`,
survive. *Fix:* `forced-color-adjust: none` on the ramp swatch spans.

## 3. Checklist results (skill steps 3–5)

**Keyboard (step 3)** — 8 of 12 pass.
- [x] Every interactive element reachable by Tab — strip buttons, slider, search, metric,
      category, level, tier, reset, copy link, view, skip link, map, control-card disclosures
      and copy, voids and source links, lane buttons, section tables' buttons, links and
      scroll regions, twin summaries, ledger. **Except S1**: controls inside a twin opened
      from its summary.
- [ ] Tab order follows visual order — passes for the stage (map → margin → legend → clock
      matches the two-column reading at ≥ 1280 and the stacked order below); **S2** for
      hidden stops.
- [x] Focus indicator visible — pixel-verified on 14 kinds (UA `outline: auto` on buttons,
      links, inputs, selects, summaries; `outline: 1px solid accent` on scroll regions; the
      map's 2 px `accent/60` ring at 3.74:1 (`map-ring-keyboard.png`); the panel heading's
      1 px ring; the focused state's accent circle, 21.8 px across at ~1 px, `state-focus-
      circle.png`). **m5** for the skip target.
- [ ] No keyboard trap — no hard trap; **S2** is a soft one (hundreds of invisible stops).
- [x] Enter and Space trigger buttons — Space toggles a chip (`?cat=women-cash`, "78 → 21
      schemes", `aria-pressed` flips), Enter toggles it back; Enter on a tier toggle rewrites
      `?tier=`; Enter on "Previous year" sets `?y=2024`; Enter on the lane button opens the
      scheme card and moves focus to its heading; Enter/Space on the map open the focused
      state.
- [x] Arrow keys — move the map's focus north to south with the live region reading each
      state; move the slider a year at a time with `aria-valuetext` updated.
- [x] Escape — inside the panel closes it and returns focus to the map (or the opener);
      on the map clears the selection. **M4**: does not dismiss the readout card.
- [x] Custom widgets operable without a mouse — every pointer action on the drawing (click a
      state, click a lane, click a year on the "all states" row, hover a state) has a
      keyboard or control equivalent (arrow keys + Enter, lane buttons, the slider and
      prev/next, the focus readout).
- [x] In-page skip link present and functional — "Skip to this stage as tables" opens the
      three twins and moves focus to the heading (`afterSkip: twinsOpen all true, hash
      #stage-tables`).
- [ ] Site-level skip link — none (**m9**).
- [ ] Dialogs — none exist (the panel is inline and not modal; n/a).
- [ ] Modal focus return — n/a; the inline panel's return-to-opener works.

**Screen reader (step 4)** — structure probed via the DOM; no real screen reader was run
(§6). 9 of 13 pass.
- [x] Decorative SVG hidden — the clock, the timing chart, the tier-legend samples, the
      tier-toggle dashes, the texture swatches and the ballot glyphs are `aria-hidden`; each
      has a text or table equivalent (the lane buttons and lanes twin, "N schemes binned" plus
      the timing table, the legend words).
- [ ] Informative SVG named and correctly roled — the map is named, described by the
      figcaption and legend (`aria-describedby="wf-status wf-legend"`, both present), and is
      the only `role="img"` (0 unnamed); **S3** for its role.
- [x] Icon-only buttons labelled — "‹ 2026" is "Previous year, 2026"; the phone nav button
      is "Open navigation" with `aria-expanded` (the energy audit's S4 is fixed).
- [ ] Single `<h1>` — **m2**.
- [ ] Heading hierarchy — **m1**.
- [x] Landmarks — `main`, `nav`, `header`, `footer`, and 17 named `role="region"` scroll
      containers; **M7** for the seven inside closed twins.
- [x] Links descriptive — every source link shows its label and host; state and scheme
      links are named by the entity.
- [x] Form inputs labelled — slider ("Year", `aria-describedby` the readout,
      `aria-valuetext` "All years, 2000 to 2026"), search, party select, phone metric and
      level selects; none named by placeholder alone.
- [x] Required fields / errors — none exist.
- [x] Status messages — one polite live region; **m6** for two silent changes.
- [x] Tables — 17 tables, `scope="col"` on every column header and `scope="row"` on every
      row header (0 `<th>` without scope); each in a named region carrying the row count,
      filters, year, as-of date and run id.
- [ ] Name/role/value on custom controls — `aria-pressed` correct on all 25 toggles,
      `aria-disabled` with a reason on unavailable metrics; **S3**, **m8**, **m11**.
- [x] Dynamic content — opening a state or scheme moves focus to its heading and announces
      it; closing returns focus and announces "Panel closed".

**Visual and cognitive (step 5)** — 8 of 12 pass.
- [x] Text ≥ 4.5:1 — 0 of 10,072 elements fail (token table: `text` 15.6:1,
      `text-secondary` 6.72:1, `text-muted` 5.32:1, `amber` 8.38:1, `accent` 8.76:1,
      `sage` 6.61:1, `blue` 5.75:1 on `--color-bg`; the lowest in use on this page is
      `text-muted` on `bg-card` at 4.67:1). **m3** for the placeholder.
- [x] Large text ≥ 3:1 — the h1 and section h2s are `--color-text`.
- [ ] UI components and graphical objects ≥ 3:1 — **M1**, **M3**, **m4**; the map's focus
      ring (3.74:1), the focused-state circle (accent, 8.76:1), ballot ink (`--color-text`,
      15.6:1), lane bars (`--color-text-secondary` at .55 → 3.9:1 at rest, 8.76:1 selected),
      the clock's axis and hairlines pass.
- [ ] Information not by colour alone — the tier passes (four distinct `stroke-dasharray`
      values — solid, `6 3`, `2 4`, `8 3 2 3` — on the toggles and the legend, the tier
      word beside every chip in every table, the analytic dash on the clock's 12-month
      band); the ballots pass (filled, hollow, half-filled, and the lid bar are shapes;
      the same glyphs `■ □ ◩` are printed in the legend and the glyph row); party is never
      encoded; the map's non-value classes are textures. **M2** for toggle state.
- [x] Text resizes to 200 % without loss — 640 × 400 at dpr 2, 0 overflow; **M5**
      advisory.
- [x] No horizontal scroll at 320 px — verified at 320 and 390, at the top and the bottom
      of the page, with a state panel open, and in the scaffold; wide tables scroll inside
      their own labelled regions with "8 columns · scroll → for the rest" printed above
      them on a phone; the clock scrolls inside its own container with "earlier years /
      later years" buttons and a "showing 2018–2026" readout.
- [ ] Text-spacing override — no overlap or hidden text except **m7** (the truncated lane
      labels, which are truncated at rest too).
- [x] Reduced motion — 0 animations at rest, after a filter and after a selection under
      `prefers-reduced-motion: reduce`; no CSS transition on any element in `main`; state
      paths set `transition-property: none` explicitly; every `scrollIntoView` in the page
      uses `behavior: 'auto'`; `scroll-behavior: auto`. There is still no
      `@media (prefers-reduced-motion)` rule anywhere in the built CSS; nothing on this page
      needs one.
- [x] No flashing.
- [x] No autoplay.
- [x] No timeouts (the 280 ms search debounce is not a time limit on the user).
- [x] Orientation not locked.

## 4. The scaffold state (empty build)

Rendered clean (0 console errors) at 1280 and 390. The page keeps the header, the "Register
not yet promoted" box ("The distribution-funds research has not been promoted into this
build. Nothing below is zero. It is unmeasured."), the byline ("register not yet promoted ·
nothing below is zero"), the strip, the scrubber, the filters, the skip link ("Skip to tables
(empty: register not yet promoted)"), a map with all 36 states hatched and named "…0 of 36
states with a value; nothing recorded yet", the legend ("1 (empty)" … "no value (36 of 36),
not zero"), a figcaption ending "as of not yet promoted · run run-8254dd58f780", the control
card ("No elections recorded, so the control cannot run."), the voids, the clock with 27 empty
years, three twins whose summaries read "… · 0 rows · register not yet promoted" and whose
bodies say "Nothing recorded yet.", every section with "Nothing recorded yet." and the
Narratives ladder with all six rungs drawn at "(0) … none in this file", the gaps panel,
Sources ("No source recorded yet.") and the tier legend. 70 controls, all named; no horizontal
scroll at 390 (strip 79 px); the map is focusable, walks and opens states (each "0 state
schemes, 0 elections in the file"); Escape returns focus to the map; text contrast passes
except the exempt disabled chips.

**S3**, **M1** (all-hatch), **M2**, **M3**, **M6**, **m1**, **m2**, **m4**, **m9** and
**m11** apply here as on the populated page; S1/S2 do not arise because the twins have no
controls.

One observation that is the house rule rather than WCAG: the strip prints **"0 schemes"**,
the filter summary "Filters (0) · 0 → 0 schemes", the effect line "0 → 0 schemes" and the
figcaption "0: live, no comparable figure (stippled) · 0: searched, none live (flat)"
directly beneath a box that says nothing below is zero. The energy audit made the same
remark about its strip. "schemes: not loaded" would say the same thing without the digit.

## 5. What passed (so it need not be re-checked)

1.1.1 non-text: every drawing hidden or named with an equivalent (§3) · 1.3.1 lists, `<dl>`
pairs for allegation/response, `<q>` for verbatim research strings, `<abbr title>` for
"n.r." with the expansion also printed in prose, captions C1–C15 present as `data-caption`
paragraphs at body size · 1.3.2 meaningful sequence in `main` (except M7) · 1.3.3 the
figcaption and legend put every encoding into words · 1.3.4 orientation · 1.4.2 n/a · 1.4.3
(§3) · 1.4.4 · 1.4.5 no images of text · 1.4.10 · 1.4.12 (m7 aside) · 2.1.1 (S1 aside) ·
2.1.2 no hard trap · 2.1.4 no single-key shortcuts · 2.2.1/2.2.2 n/a · 2.3.1 · 2.4.1
page-local skip link · 2.4.4 link purpose · 2.4.5 (nav + search) · 2.5.1 no path gestures
· 2.5.2 click on up-event · 2.5.3 label in name: every `aria-label` contains its visible text
(`labelInName` flagged only symbols and the region names, which are captions) · 2.5.4 n/a ·
3.1.1 `lang="en"` · 3.2.1/3.2.2 filters change the view, never the context, and the URL
carries every one of them (`y m cat party lvl tier q st s view`), verified by reading
`location.hash` after each keyboard action · 3.2.3/3.2.4 consistent · 3.3.1–3.3.4 no errors
possible; an unrecognised URL value prints "ignored an unrecognised ‹param› value" and an
unavailable metric prints why and what is shown instead · 4.1.1 no duplicate ids at load,
with a state open, or with every twin open · 4.1.3 (m6 aside).

**Table twin ↔ graphic**, checked count for count at `?y=2003` (the year with the most
recorded elections): map paints 36 `hatch` → twin's Class column 36 "none recorded" → legend
"no value (36 of 36)" → figcaption "36 of 36: none recorded (hatched)"; 5 ballots drawn → 5
non-empty "Assembly election in 2003" cells holding 5 election spans; 14 lane buttons on the
clock → 14 distinct scheme names in the lanes twin; the twin's region name and caption line
carry "36 rows · filters: y=2003 · 2003 · as of 2026-09-25 · run run-33317dc6d234". At
`?y=2024&m=budgeted` the legend, figcaption and above-map note agree on 19 hatched, 15
stippled ("not located 13 · partial 2"), 2 valued and "2 states with live schemes have a
figure for only some of them". Every twin export carries the caption line, as-of, run id,
filters and source URLs.

**Colour-independence of the encodings**: tier dash, four values, identical on the toggles,
the legend and the clock band; the tier word printed lowercase beside every chip (382 on the
page); ballots by shape; the three non-value map classes by texture (hatch, stipple, flat)
with the same `<pattern>` drawn in the legend swatches and the clock's coverage ribbon;
"searched, none live" never rendered as a value; party never encoded; the rose rule reserved
for the response slot and printed with its key ("Rose rule = the response of those
concerned…") wherever an alleged item appears; denials printed as `<dl>` pairs beside the
claim, and "No response located in this file. The file does not record whether one was
sought." in amber where none is.

## 6. What could not be tested

- **A real screen reader.** No NVDA, JAWS, VoiceOver or TalkBack in the container. Names,
  roles, states and the live region's text were verified in the DOM; what is *spoken* — in
  particular whether an `application` role would cure S3 in practice, how ~4,000 `<q>`
  elements are voiced, and whether the live region's readout interrupts the slider's own
  value announcement — was not.
- **Voice control.** 2.5.3 was checked by string containment only.
- **True browser zoom to 200 % and 400 %.** 200 % was approximated with a 640 × 400
  viewport at dpr 2; 320 × 844 covers 1.4.10's 320 px requirement.
- **Colour-vision deficiency beyond greyscale.** The ramp is single-hue and the textures are
  achromatic, so greyscale is the harder test here; protanopia/deuteranopia were not
  simulated.
- **Forced colours** was a quick emulation (m10), not a Windows High Contrast session.
- **Touch.** `hasTouch` contexts rendered the phone layout; a tap on a state, a swipe on the
  clock and a long press were not performed. The phone metric and level `<select>`s and the
  phone "earlier / later years" buttons were checked for names only.
- **The `zero` texture at small sizes.** Legend swatches were sampled at 16 × 12 CSS px; a
  flat swatch and a hatched swatch differ there by 0.0006 in mean luminance and by the
  stripes' standard deviation only. Whether a reader at arm's length can tell them apart on
  a phone was not tested with people.
- **A screen-reader user's path through S1.** The finding is measured (`tabindex="-1"` on
  386 controls in a visibly open twin); how a reader who reaches the table by browse mode
  rather than Tab fares was not observed.
- **Automated tooling.** No axe/Lighthouse run; the DOM sweeps above are a partial
  substitute. Automated tools catch roughly 30–40 % of failures; the manual steps cover the
  rest and were done as far as the container allows.

## 7. Gates run for this audit

`npm run generate` ✓ (welfare `run-33317dc6d234`, 7 files, 286 nodes, 335 edges, 78 schemes) ·
`npm run validate` ✓ (`validate: OK`, 1 warning: `sensex50` 49 of 50, declared) ·
`npm run build` ✓ · `npm run smoke` ✓ (`smoke: OK`, every route, `/welfare` 732,293 chars,
0 console errors) · `npm run viewport` ✓ (`graph-viewport: OK`) ·
`node --test scripts/pages/welfare.test.mjs`: **85 tests · 65 pass · 5 fail · 15 skipped**
(the failing and skipped criteria are listed below; none was caused by this audit, which
edited no source file). The scaffold was rebuilt from a scratch copy; no file under
`research/raw/` or any `*.generated.ts` was touched.

**Page tests, full build (`node --test scripts/pages/welfare.test.mjs`, identical on two runs).**
Failing: AC-25 (assertion "rate is a of b: not computed" — a base-rate row's rate text is not the form the
test expects), AC-37 and AC-40 (the benefits ledger prints "No
response linked to this item in the file. The file does not record whether one was sought." where
the test still expects the older `MISSING_RESPONSE` wording with a citation), AC-44 (`?y=1999`
round-trips as 2000 — the page clamps to `FIRST_YEAR` where the test expects the value kept),
AC-63 (the TwoByTwo's "No fresh scheme" row reads "No fresh scheme 18 31 36 18 of 49 (37%)", which is
not what the test expects; the expected value is not printed in the TAP output). All five are acceptance-wording disagreements between the tests and the
current page, not accessibility regressions, and none was introduced by this audit. Skipped (15):
AC-01 to AC-08 and AC-80 (EMPTY-build criteria, which this dist is not — they were exercised by hand
in §4 against the scratch scaffold) and AC-11, 12, 20, 33, 45, 56 (fixture `Y_MONEY` not present in
this build). The page tests were not run against the scratch scaffold.
