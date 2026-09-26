# /energy — WCAG 2.1 Level AA audit

*Audit A11Y-001 · scope: the `/energy` route of the built `dist` (populated register, run
`run-4a86ff2b4fe6`, as of 2026-09-25) and the scaffold build `dist-empty` · target: WCAG 2.1
AA · date: 2026-09-26 · procedure: the sweetclaude `testing-accessibility` skill's seven
steps, with its state files and issue filing left out. Nothing in this document was edited
into the page: it is a report, and every fix below is a proposal.*

---

## 0. Summary

| severity | count | definition (from the skill) |
|---|---|---|
| **Critical** | **0** | a reader with a disability cannot complete the task at all |
| **Serious** | **5** | significantly difficult — a workaround exists but is painful |
| **Moderate** | **7** | confusing, task completable with effort |
| **Minor** | **9** | small friction |
| total | **21** | |

**Nothing blocks release under the skill's rule** (Critical findings block). The five Serious
findings are, in order of reach: the `--color-text-muted` token fails text contrast on every
denominator, caption, source URL and note (S1); the claim lines — the graphic's whole
content, and the carrier of the frozen tier-dash channel — sit at 1.5:1 against the page at
rest (S2); claims are exposed to assistive technology as images although they are focusable
and Enter-operable (S3); the phone navigation button has no name (S4, shared `Layout`); and
the maximised view is not a dialog, drops keyboard focus on opening and duplicates ids (S5).

What passed is listed in §5 so the next audit does not have to re-derive it. What could not
be tested is in §6, and is not small: no real screen reader, no voice control, no
forced-colours mode.

## 1. Method

**Fixtures.** `npm run generate && npm run validate && npm run build` were run first (all
green — validate `OK` with one warning about `sensex50` having 49 of 50 constituents, which
the page prints). `dist-empty` was rebuilt from a scratch copy without `research/raw/energy/`
exactly as `scripts/pages/energy.test.mjs#ensureDistEmpty` does, so the scaffold state
audited is the current source, not the stale fixture that was on disk.

**Browser.** Playwright 1.62 on the pinned Chromium at `/opt/pw-browsers/chromium`, served
from `dist` by the same one-file HTTP server `scripts/smoke.mjs` uses. Contexts: desktop
1280 × 800; phone 390 × 844 and 320 × 844 (`isMobile`, `hasTouch`); 640 × 400 at
`deviceScaleFactor: 2` as the 200 % zoom stand-in (media queries respond, unlike CSS `zoom`);
and a desktop context with `reducedMotion: 'reduce'`. Probe scripts and screenshots are in
the session scratchpad (`a11y-audit.mjs`, `a11y-probe2.mjs`, `a11y-probe3.mjs`,
`results*.json`); they are not committed.

**Automated scan (skill step 2).** No axe, Lighthouse, WAVE or Pa11y is installed and the
project rule is no new dependencies, so step 2 was replaced by DOM probes written for this
audit: an accessible-name walk over every control, a tab-order walk with computed-style and
pixel checks of the focus ring, a text-contrast sweep over **9,528** text elements
(foreground composited against every ancestor's `background-color` and `opacity`, large-text
threshold applied), a token table computed from `src/index.css`, and a per-encoding
inventory of the SVG. These catch roughly what axe catches for contrast, names and roles;
they do not catch what a screen reader would say.

**Contrast arithmetic.** WCAG relative luminance on the tokens in `src/index.css`. Composited
values (an `rgba` stroke at an `opacity`) are alpha-blended onto `--color-bg` `#0a0a0c`
before the ratio is taken. Text needs 4.5:1 (3:1 at ≥ 24 px, or ≥ 18.66 px bold); graphical
objects and component boundaries need 3:1 (1.4.11).

## 2. Findings by criterion

Each finding: **criterion · severity** — what was observed, where, the evidence, and a fix
that does not touch a frozen channel (edge dash = tier, hue = family, shape = type, size =
declared magnitude). Fixes marked *token* change a value in `src/index.css` and therefore
every page; a page-local alternative is given where one exists.

### 1.4.3 Contrast (Minimum)

**S1 · Serious — `--color-text-muted` (#6b6558) fails on every background it is used on.**
3.42:1 on `--color-bg`, 3.23:1 on `--color-bg-elevated`, 3.00:1 on `--color-bg-card`; the
requirement is 4.5:1 (none of this text is large). The DOM sweep counted **3,546** failing
text elements on `/energy` at 1280 px: the kicker, the byline, both denominator strips, every
`EvidenceSection` denominator, every "What this cannot show" label, every source URL in the
margin and the bibliography, the `NOTE` lines in the rail, the twin's captions and column
headers, the "secondary" tags in Sources, the shape-legend counts, the in-frame status is
exempt only because it is `aria-hidden` — and the `Analytic` tier chip, whose colour is the
same hex. The page's own rule is that the denominator and the limit are findings, not
footers; at 3.4:1 they are the least readable text on the page.
*Fix (token):* raise `--color-text-muted` and `--color-tier-analytic` to `#8a8477`
(5.32:1 on bg, 5.03:1 on bg-elevated, 4.67:1 on bg-card — the smallest warm grey that
clears 4.5:1 on all three). *Fix (page-local):* use `text-text-secondary` for everything
≤ 13 px on `/energy`, which is most of the failing set.

**m1 · Minor — `--color-rose` on `--color-bg-elevated` is 4.45:1.** Rose text ("N responses
recorded", "· 1 response") appears on the elevated background in the hover card and the phone
sheet. 4.70:1 on the page background passes; the elevated surface does not.
*Fix (token):* `--color-rose: #cc6664` (5.32:1 / 5.04:1) — the rose stays reserved for
responses, only its luminance moves; or keep rose text off elevated surfaces.

**m6 · Minor (with M6 below) — placeholder text in `.input-field` is `--color-text-muted`**,
so the search box, the amount field and the company combobox placeholders are at 3.42:1
(placeholders are text). Covered by the S1 token change.

### 1.4.11 Non-text Contrast

**S2 · Serious — claim lines are below 3:1 at rest and when lit by hover.** A claim is drawn
as `stroke: rgba(232,228,220,0.30)` at `opacity` 0.55 at rest → composited `#2f2f2e`,
**1.46:1** against the page; hover-lit (0.95) → **2.17:1**; the arrowhead marker
(`rgba(232,228,220,0.35)` fill) → **1.59:1**. Only a lit-by-selection edge
(`rgba(244,240,232,0.95)`, 14:1) clears the bar. The tier dash is the platform's one
colour-independent channel and the caption tells the reader to "read it before the colour";
at 1.5:1 a low-vision reader cannot see the line, let alone its dash. The greyscale
screenshot (`canvas-rest-grey.png`) shows the four patterns are distinguishable *when lit*;
at rest the lines are texture. The response ticks are not part of this finding: at rest they
are drawn at 0.95 (4.33:1) and drop to 0.2 only when something else is lit, which is the
intended de-emphasis.
*Fix (EnergyGraph, luminance only, dash untouched):* stroke `rgba(232,228,220,0.62)` with
rest opacity 0.75 → 3.97:1; hover-lit 0.95 → 5.78:1; arrow marker fill alpha 0.70 → 3.06:1.
Keep the dimmed state at 0.1 — "not lit" is meant to recede. Re-take the greyscale
screenshot afterwards; the frontend skill asks for it.

**M6 · Moderate — text fields have no perceivable boundary.** `.input-field` uses
`--color-border` `rgba(244,240,232,0.08)` on `--color-bg-elevated`: the border is 1.27:1
against the page and 1.20:1 against the field, and the field's own fill is 1.05:1 against
the page. The search box, the ₹ minimum field, the two date fields and the two comboboxes
are therefore located by their placeholder text alone (which fails S1). The focus state
(accent border + 3 px halo) is fine; the rest state is not.
*Fix (token):* `--color-border-light` at ≥ 0.35 alpha (`rgba(244,240,232,0.35)` → 3.14:1)
for input borders, or a page-local `border-border-light` on the five fields plus a visible
bottom rule.

Native checkboxes and radios render in the light theme (no `color-scheme: dark`), which is
high-contrast and passes; it is noted only because the screenshot (`checkbox.png`) looks
out of place, not because it fails.

### 1.4.1 Use of Colour and 1.1.1 Non-text Content

**M3 · Moderate — two frozen channels have no text equivalent anywhere.** Hue = family and
size = declared magnitude are the graphic's second and fourth channels. The node's
accessible name carries label, `sub`/type, claim and response counts and index membership —
not the family, and not the size band. The hover card names the family, but a tooltip is
not a persistent equivalent. The table twin has no family column and no size column, so a
reader who takes the table instead of the canvas (the skip link invites them to) cannot
recover either encoding. `familyInNodeName` = 0 of 337 nodes. The dash channel is fine:
tier is in every claim name and in the twin's `tier` column.
*Fix (text only, no restyling):* append `FAMILY_LABEL[n.fam]` and `size band n.sz of 4,
declared by the researcher` to `nodeName()`; add `s kind · t kind` (family) and `s size ·
t size` columns to `TWIN_COLUMNS` and `textRow()` so the CSV carries them too.

The rail's family swatches and the in-frame `FamilyKey` decode hue for sighted readers;
`DashKey` and `TierLegend` decode the dash; the shape legend decodes shape. Those pass.

### 1.4.13 Content on Hover or Focus

**M1 · Moderate — the hover card is neither dismissable nor hoverable.** It appears on
pointer hover and on keyboard focus (good, and it is `aria-describedby`-linked). Pressing
Escape does not close it (`hoverCardDismissedByEscape: false`, with pointer and with
focus). It is `pointer-events: none`, so moving the pointer onto it lands on the SVG
beneath, which fires `mouseout` on the node and removes the card
(`stillThereWhenPointerOnCard: false`). Persistence passes.
*Fix:* an Escape handler on the frame that sets `hover`/`hoverEdge` to null without moving
focus; either `pointer-events: auto` on the card with `onMouseEnter` keeping the hovered id,
or place the card so it never overlaps its trigger.

### 2.1.1 Keyboard

Passes for every control found (§5). One observation that is not a failure: the canvas is
337 tab stops at rest and every drawn node is `tabindex="0"`; there is no arrow-key move
between nodes. The three skip links ("go to the margin · go to the table · go to filters")
are the mitigation and they work (hidden at rest, visible on focus, `#twin` receives focus
after the table opens). Recorded as **m9 · Minor** — consider roving tabindex with arrow
keys inside the frame, which would make the frame one tab stop and the reading order the
nearest-neighbour order.

### 2.4.3 Focus Order

**S5 · Serious — the maximised view is not a dialog and drops focus.** Pressing `f` on the
frame or activating "Fill the window" unmounts the inline frame and mounts it inside a
`fixed inset-0 z-50` overlay; `document.activeElement` becomes `body`
(`focusInside: false` both ways). The overlay has no `role="dialog"`, no `aria-modal`, no
name; `main` is neither `inert` nor `aria-hidden`, so Shift+Tab from the overlay's "close"
button lands on the search input underneath the overlay. Escape closes it and leaves focus
on that search input, not on the button that opened it. While maximised the aside is
rendered twice, so `id="energy-margin-heading"` and `id="energy-voids"` are duplicated
(4.1.1) and two `<aside aria-labelledby="energy-margin-heading">` share one label.
*Fix:* `role="dialog" aria-modal="true" aria-label="The power map, maximised"` on the
overlay; on open, focus the frame (`wrapRef.current.focus()` after mount); set `inert` on
`main` (or `aria-hidden` plus a focus trap) while open; on close, return focus to the
maximise button or the frame; render the margin once (portal the inline aside into the
overlay, or `hidden` the inline copy) so the ids stay unique.

**M2 · Moderate — DOM order does not follow the visual order of the stage.** The DOM is
rail → aside → canvas. At 1024–1439 px the aside is placed *below* the canvas by the grid,
so Tab goes rail → margin (below) → canvas (above). At ≥ 1440 px the aside is the right
column and the canvas the centre, so Tab goes left → right → centre. Measured at 1280:
rail x = 288, aside y = −3874, canvas y = −4649 (canvas above aside).
*Fix:* order the DOM rail → canvas → aside and keep the CSS grid placement; the margin's
focus hand-off (`requestMarginFocus`) does not depend on DOM order.

### 2.4.2 Page Titled

**M5 · Moderate — `document.title` is "India Corporate Intelligence Platform" on every
route**, including `/energy`, `/welfare` and `/`. A screen-reader user's tab list and history
cannot tell the pages apart.
*Fix (shared):* set `document.title` per route in `Layout` (from the nav label) or in each
page: "Energy power map — ICIP".

### 2.4.6 Headings and Labels · 1.3.1 Info and Relationships (structure)

**m2 · Minor — the page has two `<h1>`s** ("ICIP" in the sidebar, then the page title) and
the margin's `<h2>` at rest reads "Margin", which is also the name of the complementary
landmark. Heading levels do not skip (checked).
*Fix:* the sidebar wordmark as a `<p>` or `<div>`; at rest name the margin heading for what
it holds ("Margin — how to read the graph, and what the record does not show").

**m3 · Minor — landmarks.** The site `<nav>` has no `aria-label` while a second `<nav
aria-label="Graph filters">` exists; the filter rail is not navigation.
*Fix:* `aria-label="Site"` on the site nav; the rail as `<section aria-label="Graph
filters">` or `role="group"`.

**m4 · Minor — `<th>` without `scope`** on all 91 tables (StackTable, DataTable), and the
per-beneficiary ledger tables have no `<caption>` (an `<h3>` precedes each). Simple
single-header tables are usually associated correctly without `scope`; adding `scope="col"`
in `StackTable` is one line.

### 2.5.3 Label in Name

**M4 · Moderate — visible text is not in the accessible name for eight camera buttons and
every twin id button.** "⤢ maximise" is named "Fill the window", "⤡ shrink" is "Exit full
window"; the ±, arrows and ◎ are symbols (fine). In the twin and the tenure-lanes twin the
visible text is the claim id (e.g. `claim:coal-…`) and the name is "Open claim ‹lab›, ‹tier›,
‹date›", which does not contain the id. A voice-control user saying "click maximise" or the
visible id gets nothing.
*Fix:* `aria-label="Fill the window — maximise"` / `"Exit full window — shrink"`; for id
buttons, `openClaimName()` to include the id, or show the label instead of the id as the
visible text (the id can stay in a mono span beside it).

### 2.4.7 Focus Visible

Passes everywhere (pixel-verified: `ring-*.png`). Two observations:
**m5 · Minor —** the node focus ring is the glyph's own stroke at 2.5 px accent; on a
size-1 glyph (≈ 10 px) it is a small target to find on a 700 px canvas
(`focus-node.png`). A 2 px `outline` on the `<g>` is not rendered by Chromium for SVG
content, which is why the stroke fallback exists; consider also drawing a ring `<circle
r={r+4}>` on focus, as selection already does.
The camera and pan buttons and the site nav links rely on the UA `outline: auto` ring
(white in this theme, visible); `.input-field:focus` sets `outline: none` but replaces it
with an accent border and halo, which passes.

### 4.1.2 Name, Role, Value

**S3 · Serious — claims are `role="img"` yet focusable and Enter-operable.** Every drawn
claim `<g data-claim>` carries `role="img" aria-roledescription="claim"` and becomes
`tabindex="0"` when it touches the selected node or lies on a path (22 in the
`grp:adani` view). The ARIA snapshot exposes them as `img "…"`; a screen reader announces
an image, offers no activation hint, and `img` is not an interactive role. Enter does open
the claim (`enterOnClaimOpens: true`) — the affordance exists and is hidden. The source
comment explains the choice (a `button` role would put claims ahead of entities for a
button-walker), but since claims are tabbable only when adjacent to a selection, that order
concern does not arise in practice.
*Fix:* `role="button"` with `aria-roledescription="claim"` kept (a roledescription is
permitted on `button`, and the reader then hears "claim" rather than "button" or "image"),
plus `aria-pressed` while it is the open claim.

**S4 · Serious (phone) — the navigation toggle in `Layout` has no accessible name, no
`aria-expanded`, no `aria-controls`.** `<button class="w-10 h-10 …"><svg …/></button>` is
the only way to reach the site navigation below 1024 px; it is announced as "button".
Shared component, present on `/energy` at 390 px and 320 px.
*Fix:* `aria-label={mobileMenuOpen ? 'Close navigation' : 'Open navigation'}`,
`aria-expanded`, `aria-controls` on the `<nav>`, and `aria-hidden` on the icon.

**M7 · Moderate — `TenureLanes` is `<svg role="img">` with 124 focusable `role="button"`
descendants.** ARIA gives `img` presentational children; Chromium happens to expose the
buttons (the snapshot shows them, with good names), other user agents may not, and a screen
reader in browse mode will treat the whole SVG as one image with a long name. `EnergyGraph`
already does this correctly with `role="group"`.
*Fix:* `role="group"` on the lanes SVG with the same `aria-label`.

**m7 · Minor — the graph frame is a focusable `<div tabindex="0" aria-label="Graph
viewport…">` with no role**, so its name attaches to a generic element (Chromium reads it;
the role is undefined). `role="group"` (or `application`, if arrow-key handling is to be
declared) makes the name and the key bindings legitimate.

**m8 · Minor — the phone bottom sheet** is a `position: fixed` `<aside>` over the canvas
with "expand" and "close" buttons and no dialog semantics; Escape does not close it (the
close button does, and focus returns to the node — good).
*Fix:* Escape closes the sheet; optionally `role="dialog"` when it covers the canvas.

### 4.1.3 Status Messages

**m10 · Minor — "copy link to this view" → "link copied"** is a text swap on the button with
no live region, so the confirmation is not announced. Everything else that changes is
announced: the visually-hidden `role="status"` carries the denominator, the lit set, the
path result and the search count (verified in the DOM).
*Fix:* a `role="status"` span for the confirmation, or `aria-live="polite"` on the button.

### 1.4.10 Reflow · 1.4.4 Resize Text

Pass at 390 px, 320 px and at 640 × 400 @ 2× (no horizontal document, body or `main`
scroll; no element outside the viewport except inside `overflow-x: auto` containers; the
sidebar collapses; text spacing override produced no clipping).
**m11 · Minor —** at 640 × 400 the sticky denominator strip is 95 px of a 400 px viewport
(24 %), plus the phone header above 1024 is another 56 px. Content is not lost, but a reader
at 200 % has a quarter of the screen fixed. Consider un-sticking the strip below a viewport
height, or collapsing it to one line when the canvas is not on screen.

### 2.3.3 / 2.2.2 Motion

Pass at AA (2.3.3 is AAA). With `prefers-reduced-motion: reduce` emulated the page runs zero
animations before and after interaction; the force layout runs synchronously before first
paint; `scrollIntoView` uses `behavior: 'auto'` under reduce (source, `toStage`). What
remains are 0.15–0.2 s colour transitions on `.btn-ghost`, the camera buttons and nav links
(`transition-duration` unchanged under reduce) — not motion in the WCAG sense. There is no
`@media (prefers-reduced-motion)` rule anywhere in the built CSS; adding one that zeroes
`transition-duration` is cheap and would make the answer unconditional.

## 3. Checklist results (skill steps 3–5)

**Keyboard (step 3)** — 9 of 12 pass.
- [x] Every interactive element reachable by Tab — chips, rail (checkboxes, radios,
      number, dates, buttons), search, combobox, camera and pan buttons, every node, every
      tabbable claim, ledger and twin buttons, section "Show in the graph" buttons, skip
      links, maximise/close, sheet buttons, sources.
- [ ] Tab order follows visual order — **M2** (stage), **S5** (overlay).
- [x] Focus indicator visible on every focused element — pixel-verified.
- [x] No keyboard trap — Escape leaves the maximised view; the frame's own keys stop at the
      frame; the combobox releases on Escape.
- [x] Enter/Space trigger buttons — nodes: Enter selects (`sel=`), Space toggles;
      Shift+Enter sets a path (`path=`); claims: Enter opens (`claim=`).
- [x] Arrow keys — pan the camera on the frame; move the active option in both comboboxes
      (`aria-activedescendant` verified); `+`/`−` zoom; `0` fits; `f` maximises.
- [ ] Dialogs trap focus and return it — **S5**, **m8**.
- [x] Custom widgets operable without a mouse — pan pad and zoom cluster mirror drag and
      wheel; "path to…" combobox mirrors shift-click; ledger group `onFocus` mirrors its
      `onMouseEnter` (source-verified; the probe focused a control outside a group, so it
      is not confirmed in the browser).
- [x] Skip link present and functional — three, page-local, first focusable in `#stage`.
- [ ] Site-level "skip to main content" — none in `Layout`; the 29 sidebar links precede
      the page on every route (advisory, folded into **m9**).
- [x] Escape closes the maximised view and the combobox list; it does not clear a
      selection inline (by design, `escapeInlineChangesUrl: false`).
- [ ] Escape dismisses hover content — **M1**.

**Screen reader (step 4)** — structure probed via the DOM and Playwright's ARIA snapshot;
no real screen reader was run (§6). 8 of 13 pass.
- [x] Decorative SVG hidden — dash-key and tier-legend samples are `aria-hidden`; the
      in-frame status is `aria-hidden` and mirrored in `role="status"`.
- [x] Informative SVG named — `svg[role=group]` "Connection graph: 337 entities, 595
      claims…", tenure lanes and the path histogram carry `aria-label` + `<title>`;
      `TierSamples` are `role="img"` with the tier word; 0 unnamed `role="img"`.
- [ ] Icon-only buttons labelled — **S4** (phone nav).
- [ ] Single `<h1>` — **m2**.
- [x] Heading hierarchy — no level skipped in `main`.
- [ ] Landmarks distinguishable — **m3**.
- [x] Links descriptive — source links show the full URL as text (long, but the platform
      rule is that a URL must be visible); route links are named by their path.
- [x] Form inputs labelled — every input, select and combobox has a name (0 unnamed; none
      named by placeholder alone); fieldsets carry legends; the date fields are "from"/"to"
      inside the "Time window" legend.
- [x] Required fields / errors — none exist (all filters optional; no submission).
- [x] Status messages — `role="status"` present and populated; **m10** for the one
      exception.
- [ ] Modal announced — **S5**.
- [x] Tables have `<th>` — yes; **m4** for `scope` and the ledger captions.
- [ ] Name/role/value on custom controls — **S3**, **M7**, **m7**; `aria-pressed` on nodes,
      chips, hop buttons and the shape legend (360 instances) is correct.

**Visual and cognitive (step 5)** — 8 of 12 pass.
- [ ] Text ≥ 4.5:1 — **S1**, **m1**.
- [x] Large text ≥ 3:1 — the h1 (46 px) and section h2s (24 px) are `--color-text`, 15.6:1.
- [ ] UI components and graphical objects ≥ 3:1 — **S2**, **M6**; node fills pass (3.86:1
      to 6.94:1 at 0.88 fill-opacity), focus ring 8.76:1, lane bars 7.83:1, histogram bars
      3.78:1, response ticks 4.33:1 at rest.
- [ ] Information not by colour alone — the tier passes (dash, and the word in every name);
      **M3** for hue and size.
- [x] Text resizes to 200 % without loss — 640 × 400 @ 2× (**m11** advisory).
- [x] No horizontal scroll at 320 px — verified; also 390 px.
- [x] Text-spacing override — no clipping (1.4.12).
- [x] Reduced motion — pass (§2, Motion).
- [x] No flashing.
- [x] No autoplay.
- [x] No timeouts.
- [x] Orientation not locked.

## 4. The scaffold state (`dist-empty`)

Rendered clean (0 console errors) at 1280 and 390. The page keeps the header, the strip, the
sweep chips (12 disabled, `data-nodata` hatched, each reading "‹sweep› — not yet
researched"), an amber "Not promoted" box with the sentence "The energy register has not
been promoted in this build. Nothing below is zero — it is absent.", a hatched
`<section aria-label="The power map — not loaded">` carrying the same sentence, the "What is
missing" section (Killed / Held out / Orphans / Superseded, each saying what its emptiness
means), Sources ("0 sources · 0 primary"), the tier legend and the footnote. No horizontal
scroll at 390.

Accessibility: the six route links are the only focusable controls in `main` and each has a
ring; disabled chips are correctly out of the tab order and their text is still in the
document; the hatched section is a named region; the text on the hatch is
`--color-text-secondary` on `#101116` (≈ 6.4:1 against the hatch base; the 1.1 px gold
stripes at 1.8:1 against that base are decoration behind the text, which is the intent of
the hatch — see §6 for what was not measured). **S1**, **m2**, **m3** and **M5** apply here
as on the populated page.

One observation that is the house rule rather than WCAG: the strip prints **"0 claims · 0 of
12 sweeps researched"** directly above a callout that says nothing below is zero. The
`EmptyEnergy` facts are literals (`'0 claims'`); the platform's rule is that no-data never
reads as zero. Printing "claims: not loaded" and "sweeps researched: none" would say the
same thing without the digit.

## 5. What passed (so it need not be re-checked)

1.1.1 non-text: named or hidden as appropriate · 1.3.1 lists, fieldsets/legends, `<dl>`
stack on phone (one form exposed at a time), captions on the twin and the lanes twin ·
1.3.2 meaningful sequence in `main` · 1.3.3 the left/right caption explains position and
also says it means nothing · 1.3.4 orientation · 1.3.5 n/a · 1.4.2 n/a · 1.4.4 · 1.4.5 no
images of text · 1.4.10 · 1.4.12 · 2.1.1 (with S3/M1 as qualifications) · 2.1.2 no trap ·
2.1.4 single-key shortcuts (`f`, `0`, `+`, `−`) are active only while the frame has focus,
which is the allowed exception · 2.2.1/2.2.2 n/a · 2.3.1 · 2.4.1 page-local skip links ·
2.4.4 · 2.4.5 (nav + search) · 2.5.1 pointer gestures have single-pointer and keyboard
alternatives (pan pad, zoom cluster, "path to…") · 2.5.2 click on up-event via React
`onClick`; drag is not read as a click (viewport gate) · 2.5.4 n/a · 3.1.1 `lang="en"` ·
3.2.1/3.2.2 filters change the view, never the context; Back leaves the page (replace
navigation, by design) · 3.2.3/3.2.4 consistent · 3.3.1–3.3.4 no errors possible, no legal
or financial submission · 4.1.1 no duplicate ids inline (S5 while maximised) · 4.1.3
`role="status"`.

Colour-independence of the encodings specifically: four distinct `stroke-dasharray` values
on the canvas, one per tier (`solid`, `6 3`, `2 4`, `8 3 2 3`), matching the dash key, the
tier legend and the lane bars; the response tick is a shape (a perpendicular stroke, one
per response tier) as well as a colour; the hatch is a `repeating-linear-gradient` plus the
words "not yet researched" / "not loaded" and a `data-nodata` attribute, never a bare
colour; `contra` lines are rose *and* keep their tier dash (0 were drawable in this build,
so the rose line could not be observed on the canvas).

## 6. What could not be tested

- **A real screen reader.** No NVDA, JAWS, VoiceOver or TalkBack in the container. Names,
  roles and the ARIA snapshot were verified; what is *spoken* — the order in which a node's
  long name is read, whether `aria-roledescription="claim"` is honoured, whether the
  `role="status"` text is interrupted by the next filter change — was not. The skill is
  explicit that DevTools overlays do not substitute; nor do these probes.
- **Voice control** (Dragon, Voice Control). M4 is inferred from the name/label mismatch,
  not observed.
- **Forced-colours / Windows High Contrast.** Chromium's `forced-colors` emulation was not
  run; the SVG fills and the hatch gradient are the likely casualties.
- **Colour-vision deficiency simulation** beyond greyscale. The family hues (blue, gold,
  purple, teal, rose, sage) were not checked pairwise under protanopia/deuteranopia; M3's
  text equivalent is the fix regardless.
- **True browser zoom to 400 %.** 200 % was approximated with a 640 × 400 viewport at
  `deviceScaleFactor: 2`; 320 × 844 covers 1.4.10's 320 px requirement. Chromium's own zoom
  was not driven.
- **Touch.** `hasTouch` contexts rendered the "tap the graph to pan and zoom" mode and
  `touch-action: pan-y` at rest (the page scrolls past the canvas); a pinch and a tap-to-arm
  were not performed. The "done" button that leaves pan mode has a name.
- **Contrast against the hatch stripes.** The sweep skipped 0 elements on background
  images at 1280 (the disabled chips are exempt as inactive components; the scaffold's
  hatched section text was measured against the hatch base colour only).
- **The `contra` line on the canvas.** Zero `contra` edges between drawn nodes exist in
  this build, so "denials render as loudly as claims" could be checked only for response
  ticks and the rose text, not for a rose line.
- **Automated tooling.** No axe/Lighthouse run; the DOM sweeps above are a partial
  substitute. Automated tools catch roughly 30–40 % of failures; the manual steps cover the
  rest and were done as far as the container allows.

## 7. Gates run for this audit

`npm run generate` ✓ · `npm run validate` ✓ (1 warning, `sensex50` 49 of 50) ·
`npm run build` ✓ · `npm run smoke` ✓ (`smoke: OK`, every route, 0 console errors) ·
`npm run viewport` ✓ (`graph-viewport: OK`, 29 of 29 checks). `dist-empty` rebuilt from a
scratch copy; no file under `research/raw/` or any `*.generated.ts` was touched, and no
source file was edited.
