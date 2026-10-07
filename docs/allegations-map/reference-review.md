# Flat allegations map — reference review and first design proposal

Reference: https://archivegenocide.com/geolocation/

Observed in actual Chromium through the repository's existing Playwright installation on 7 October 2026. Desktop: 1440×1000. Mobile: 390×844. This inspection used no skills, skill files, or skill workflows. No application source files were edited during the reference inspection. Screenshots are retained only as reference evidence; no reference imagery, branding, claims, or dataset is proposed for reuse.

## Observed behavior

### The map is the first surface

The desktop toolbar is 56px tall; the map occupies the remaining 944px. Mobile uses two compact toolbar rows totaling 104px, leaving a 740px map. The opening does not place a hero, summary metrics, filter form, or tall timeline above the map.

The cartography is flat and readable: low-emphasis land, water, roads, and place names carry location; saturated outlined evidence markers carry attention. The overview remains dense. Small faint dots, stronger outlined dots, rings, labeled places, numbered groups, and dashed geographic areas distinguish different spatial conditions. Its legend explicitly separates exact, approximate, and disputed location categories. This is an interface observation, not independent validation of its data.

On desktop the legend sits over the lower-right map and zoom/layers controls sit near the lower-left. A floating Filters control opens a roughly 320px left panel over the map. That panel groups location precision, a dated histogram and time controls, places, source attribution, and categories. Filtering does not require leaving geography.

### A click preserves the geographic context

Clicking a visible grouped location marker recentered/zoomed the map, retained a small location-anchored label, and opened a 420px-wide reader along the right edge. The panel began at y68 and occupied roughly 920px in the desktop capture. The group reader presents:

1. Geographic precision and source basis.
2. Place/event title.
3. A prominent explanation of what the point does and does not locate, with a source link.
4. An action to open the same material in the Node Map.
5. A counted, dated list of individual records, with thumbnails and short excerpts.

Clicking an individual marker opened a richer record reader: source/precision label, title, paused media, caption, date semantics, original-source attribution, stable record ID, copy-link and copy-citation controls, source/geolocation links, and separate actions for the network and archive. Media was not played during the review.

Some individual selections also opened an embedded network pane on the left, leaving the map between two large panels. This provides context, but can compress the working map. The proposed ICIP interface will use one evidence reader and an explicit network switch instead.

Multiple dashed purple connectors and outlined endpoints were visible in a selected geographic view. This inspection did not establish every connector's underlying meaning. ICIP must derive each displayed edge and its label from the retained relationship record rather than borrowing the reference's color semantics.

### Mobile keeps a map above the reader

The selected-reader panel becomes a bottom sheet with rounded upper corners. In the observed 390×844 view it started at y437 and occupied 407px, leaving the upper map visible. Long content scrolls within the sheet. The close action remains at its upper-right corner. A brief first-visit explanation of the dots is also present; in an early capture it overlapped the selected sheet, an interaction we should avoid.

### Focus and dismissal

- The canvas is focusable and labeled “Map”. Individual drawn markers were not separate DOM buttons in the inspected canvas.
- Opening either a grouped or individual record moved focus to its `h2` title. The next Tab on an individual media record reached the video controls.
- The close button has an accessible “Close” name. Close and Escape dismissed the selected reader in the exercised paths.
- Both exercised close paths left focus on `BODY`, rather than restoring the map selection or an equivalent evidence-list trigger. ICIP should improve this with explicit focus restoration.
- The floating reader has no `role=dialog` or `aria-modal` in the inspected DOM. Its map remains part of the active operating surface.
- Filters keep focus on their trigger when opened. A mobile Done control is present. This is a limited keyboard inspection, not a screen-reader or cross-browser audit.

## Proposed ICIP composition

The user asks for a flat map, many evidence nodes, highlighted relationship overlays, rich click popups, and a dedicated allegations/connections page. The design should make those actions visible immediately.

| Area | Proposed behavior |
| --- | --- |
| Dedicated page | `/allegations` opens directly into a flat map. One compact tool row holds search, current place, filters, and Map/Connections mode. Target map origin: no lower than about 150px desktop or 190px mobile. |
| Geographic canvas | Existing ICIP branding remains in the shell; the map uses a restrained flat geographic field. Accurate sites use point markers. State-associated records use explicitly labeled regional hubs, rather than invented precise coordinates. National and unknown geography stay in accessible collections. |
| Dense evidence | Use many visible nodes and numbered co-located groups. Active selection and its immediate relationships gain contrast; unrelated marks fade without disappearing. Retain a searchable, paginated equivalent list for the complete result set. |
| Connection overlays | Draw only retained typed relationships. Show direction and relationship label; distinguish direct evidence from analytic/disputed context using text and line pattern. A displayed path does not establish causation or wrongdoing. |
| Click reader | Desktop: a roughly 400–440px right reader with the selected place still visible. Mobile: a bounded bottom sheet with map context above. Keep the title, current legal/procedural status, evidence tier, geography basis, date semantics, primary source and recorded response visible before secondary tabs. |
| Rich detail | Place the claim and any amount stage first. Follow with source/citation, response/current outcome, related identities and typed incident connections. Offer save, copy citation, open full source, and open the focused connections page. |
| Network view | The dedicated Connections mode carries the same selected entity/record, filters and source context. Add selected-path breadcrumbs, neighbor navigation, Back, and an equivalent edge ledger. Do not automatically place a second wide network panel over the map. |
| Time and filters | Keep visible scope summaries on the tool row. Expand date/histogram and sector controls on demand; do not put another tall control stack above the geographic artifact. |
| Keyboard and motion | Focus the reader title on open; restore the exact trigger on close. Provide list-based access to every marker. Escape closes the top dismissible surface. Use short, interruptible map movement and reduced-motion equivalents. |

## Decisions and limits

This is a first design proposal, based on observed browser behavior. It does not recommend reproducing the reference's subject matter, red branding, media, source claims, numerical totals, or legal language. We should retain ICIP's source qualification and responses, and make allegations, documented relationships, findings, and final outcomes distinguishable everywhere.

The inspector, flat map renderer, dedicated page composition, and data mappings have separate implementation owners. No application edits belong to this reference-review task until the coordinating agent confirms the plan.

## Captures

Files under `reference/` are development-only browser screenshots:

- `desktop-map.png`, `mobile-map.png`: opening geographic canvas.
- `desktop-filters.png`: floating filter layout.
- `desktop-group.png`: grouped location reader and small anchored label.
- `desktop-marker.png`, `mobile-marker.png`: individual record reader.
- `desktop-node-map.png`, `mobile-node-map.png`: dedicated network entry.

The exact reference pages can change. Some transient external tile gaps and an embedded graph-loading state appeared during inspection; they were not treated as intended design elements. See `provenance.json` for capture context.

## Approved implementation scope

The coordinating agent approved this direction and the dedicated `/allegations` page. This owner then implemented the reusable `MapEvidenceHubPanel.tsx` and its isolated stylesheet. The panel uses the retained map scene's complete entity, record and source ID sets, with eight entries per page and contextual search. State hubs retain coverage/association overlap and placement qualifications. Verified sites retain their coordinate precision, source links and coordinate caveat. Desktop uses a 420px reader; mobile uses a 52dvh bottom sheet with an explicit expansion control. Opening focuses the title, arrow keys operate the three evidence tabs, and dismissal restores the previous trigger or map fallback. No skills, reference media, branding or reference data were used in the implementation.

## Integrated design verification

The coordinating agent subsequently assigned `src/pages/allegations.css` for composition polish. The title and search now share one desktop row. Places/2D mode and geographic controls overlay the geographic canvas instead of stacking additional full-width rows above it. The map-search helper has a solid contrasting surface. The side record index closes on selection, leaving one main reader and the explicitly schematic connection inset.

At 1440×1000, the geographic canvas starts at y177; the earlier integrated composition started at y373. At 390×844, it starts at y306, down from y455. The mobile shell, visible investigation title, search, cohort selector, filters and mode switch are retained. This is a larger control footprint than the reference; the desktop reaches the map sooner, while mobile keeps the controls visible and puts the index below the map.

The existing Playwright installation and Chromium verified:

- Desktop and mobile title focus on open; Escape restores the exact HTML map-hub button.
- Two complete pages of the selected Andhra Pradesh population: eight then three distinct records, with no repeated IDs.
- A no-match search state, with the underlying full population count retained.
- SVG fallback activation with Enter and exact SVG `g` hub focus restoration after Escape.
- Arrow-key tab selection, the mobile expansion control, and no document overflow at 320px.
- No JavaScript page errors in the desktop/mobile composition captures.

Screenshots and measured browser results are under `implementation/`: `desktop-first.png`, `mobile-first.png`, `desktop-hub.png`, `mobile-hub.png`, `mobile-320-hub.png`, `review-measurements.json`, and `keyboard-verification.json`. Live data changed during the coordinated merge; captured counts describe those snapshots. The final helper-contrast adjustment and SVG focus extension followed the first four captures; SVG verification exercises the final component. Application files are frozen for the coordinating agent's build and release checks.
