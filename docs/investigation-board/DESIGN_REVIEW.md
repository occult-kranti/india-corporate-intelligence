# Investigation board: design review and implementation direction

Reviewed: 15 October 2026. Scope: desktop presentation, information architecture and preservation of the existing India/global research workflows. This is an independent AI review grounded in repository evidence and published design work. No named author, practitioner or historical figure participated in this review. Recommendations below are our application of the sources, not endorsements or quotations from those people.

## Verdict

Build a **working archive board**: a soft geographic field, source slips pinned above it, tactile wool connections, a quiet navigation cabinet and a clear evidence-reading plane. The board should make the research process understandable while the complete registers remain one click away.

The strongest existing asset is the product's evidence discipline: exact stages, dates, source locators, rival explanations, response records and conspicuous coverage limits. Preserve that discipline. The largest present UX problem is the number of similarly named destinations distributed across several navigation systems. A decorative board alone will not resolve it.

## What the code establishes

- There are 60 React route patterns, three separately built static applications and two different saved-work concepts: tracked companies and a source-backed local Casebook.
- The shared workspace already supports map, connections, evidence, Casebook and original dossier views. It has the right underlying interaction sequence for a board.
- Seven major investigation routes and four research-program routes have independent layouts. A shared shell can improve consistency, but their distinct controls must remain intact.
- The old visual brief is midnight-petrol cartography with paper reserved for source reading. The latest request authorizes a replacement presentation and specifically asks for a desktop-only pin-and-wool world.
- Existing route and saved-work tests encode valuable contracts. A visual rewrite that hides dossiers or rewrites data joins would be a regression.

This review inspected code and existing product/design documentation. It does not claim observed task-completion rates, participant preferences, screenshot-based visual acceptance, or full accessibility certification. Final implementation needs its own build and interaction evidence.

## Visual direction: an architectural evidence archive

### Materials and composition

Use a restrained, convincing material hierarchy rather than a movie-conspiracy collage:

1. **Desk/map plane:** pale sage-grey land, warm stone sea/background, thin legible boundaries and quietly indexed places. The map is the substrate, never a translucent overlay covering text.
2. **Thread plane:** gently curved wool paths, using a dark core and a subtle edge/highlight. Keep the number of visible crossing threads manageable through selection/focus. No constant pulsing, moving particles or animated flow on static evidence.
3. **Pinned paper plane:** ivory evidence slips with readable source type/date, a short serif title, one-sentence excerpt, explicit evidence status and source count. A small brass pin and directional shadow provide depth. Most cards stay square to the reader; tiny rotation is optional ornament, never an accessibility requirement.
4. **Reader plane:** a solid, calm inspection panel with full evidence, source, response and limits. The document is the highest-contrast reading surface. Opening it should not erase the board's position or selection.

Suggested tokens, to be contrast-tested in real contexts: desk `#ddd9cc`, map land `#c9d1c5`, water `#e5e8df`, paper `#fbf7ec`, ink `#24332e`, navigation `#172d28`, analyst wool `#943f42`, brass `#a17b42`, selection `#2f6a58`, focus `#d69b28`. These are a proposal, not new evidence-tier colors. Existing semantic tier and relationship styles retain their meanings.

### Type and rhythm

- Reuse the locally hosted fonts. Inter handles navigation, filters and body copy; Playfair Display gives evidence titles and page openings a documentary voice; IBM Plex Mono handles dates, IDs, figures and small source metadata.
- Recommended desktop body size: 14px with 1.5–1.65 line height. Source reading: 15–16px and approximately 65–78 characters per line. Do not carry the old 11px metadata density into substantive explanatory text.
- Use a 4px rhythm with 12/16/24/32px meaningful spacing. Controls can be compact without being cramped. Keep labels above controls, not solely in placeholder text.
- Avoid headline/eyebrow stacks repeating the same information. One clear page title and one operational explanation suffice.

### Desktop frame

- At 1440–1920px: approximately 216–232px labeled navigation, 64px masthead, an uninterrupted central board, and a 360–420px optional inspector.
- At 1024–1280px: narrow labeled navigation or a deliberate collapse control; let the inspector overlay a stable portion of the board instead of compressing every card.
- Do not introduce a new phone-layout project. Smaller windows may retain an accessible scrollable/stacked fallback and a concise desktop-workspace note; never gate data behind a device warning.
- Avoid three simultaneous vertical scrollbars by keeping one main scroll area and one explicit inspector scroll area. Tables may scroll horizontally in their own named region.
- Shadows must explain plane ordering. A map has the softest shadow, a selected card a stronger one, and the source drawer a distinct edge. Avoid blur-heavy glass and repeated heavy box shadows.

## Information architecture

### One searchable catalog, several short entry paths

Create a single route registry used by the rail, full navigation dialog, search aliases, route titles and tutorial matching. Preserve old URLs; changing labels does not require route migrations. Dynamic profile pages remain discoverable through record search, not a giant enumeration in navigation.

Recommended groups:

| Group | Visible primary choices | Full catalog includes |
|---|---|---|
| Workspace | National atlas, My board, Find records | Original dashboard, Casebook, tracked-company watchlist |
| Investigations | Reviewed cases, Money paths, Research radar | Investigation network, follow-the-money discovery, trace investigations, funding cases, allegations, unresolved leads |
| Sector registers | Public works, Education, Finance, All sectors | All 22 existing sector/dossier routes; preserve the industry-specific wording |
| Companies & power | Companies/map, Groups, Institutions | Industry profiles, conglomerates, cabinet, donations, interlocks, allocation |
| Connection tools | Connections, Geographic network | Money-trail atlas, path finder and original graph tools |
| Research & method | Research program, Test an explanation, Sources | Model/game-theory/hypothesis labs; evidence audit, base rates, motifs, prospector, desk, capture, competition, provenance, method and pattern discipline |
| Global collections | Global evidence, Public assets & finance, Media & power | External ProtestAtlas and source/reproducibility links, visibly identified as external |

This is an organizational proposal; exact route membership is fully recorded in `FEATURE_INVENTORY.md`. Avoid duplicating every catalog entry in the permanent rail. A short rail plus a comprehensive searchable catalog is preferable to 30 equally weighted shortcuts.

### Search behavior

- Label navigation search “Find a page or tool.” Keep it distinct from evidence search, which searches source records and entities.
- Index labels, group names and plain-language aliases: school → Education; roads/contractor → Public works; loan/lender → Finance; red flags → Tenders; sources → Provenance/Evidence; board/pins → Casebook/Board.
- Navigation aliases may be forgiving. Entity identity must continue using the product's explicit identifiers and source-backed resolution; fuzzy navigation is not permission to merge records.
- Every result shows title, short purpose and group. Include static global apps in the same matching logic. Include `/allegations`, currently missing from the old searchable library.
- `Ctrl/Cmd+K` is useful if implemented with a visible hint, native dialog semantics, Escape and focus restoration. It supplements the visible search button.
- A query with no match should offer to clear the filter and suggest the record search when appropriate, without presenting unrelated links as matches.

### Naming collisions to resolve

- `/follow-the-money`: “Case discovery” or “Follow the money,” with description “Explore cases, entities and source documents.”
- `/money-trails`: “Reviewed money paths,” with description “Inspect each documented payer-to-payee stage.”
- `/atlas`: “Money-trail atlas,” retained under connection tools rather than competing with “National atlas.”
- Casebook/Board: saved evidence and analyst questions. Watchlist: tracked companies. Do not label either one merely “Saved research.”

## Core user journey

1. **Find a question or place.** The opening screen offers a map, a few task-oriented routes and one clear search. Keep the research window/coverage qualifier visible.
2. **Inspect a record.** Selecting a map pin or record opens the same evidence reader. Show title, status/date, source basis and geographic precision before explanatory narrative.
3. **Read the source and challenge.** Keep source locator, original link, response/procedural context, alternative explanations and what would change the conclusion together.
4. **Pin to the board.** The action gives immediate, nonblocking confirmation and a route to the board. Existing notes/pins remain unchanged.
5. **Arrange and connect.** Move cards with a clear handle or non-drag controls. Connect two pinned items, choose a thread type and add an optional analyst note. No string appears by itself because two items are geographically close.
6. **Return or export.** Open the source/dossier from a pin; return to the same board position. Export the evidence packet, reading brief, and board layout according to clearly named capabilities.

The tutorial should teach this journey in place. The separate tutorial implementation owns exact step content and anchors.

## Board interaction specification

### Pin anatomy

A pin is an existing saved entity, relationship or record, never a fabricated new claim. Show kind, readable title, date/status when available, source count, a clipped summary and two obvious actions: “Inspect evidence” and “More.” A pin's menu owns remove, move and connection actions. Notes are labeled “Analyst note.” Missing source IDs remain visible with a preserved note and a clear unavailable-record state.

### Wool semantics

The existing board-store types are appropriate:

- Question: why might these records be related?
- Compare: inspect differences under a comparable basis.
- Counter-evidence: this item may challenge that interpretation.
- Follow-up: this record suggests a next research step.

Label the layer “Analyst threads.” Selecting a thread exposes its type, endpoints and note. A permanent short legend explains that user-created threads do not establish a factual relationship. Documented relationships retain their evidence tier, direction, source and dates, ideally in the source inspector or a separately labeled layer. Do not recode an allegation as a red thread, make thread thickness a guilt score, or add proximity-based joins.

### Safe direct manipulation

- Drag from a named handle; interactive inputs and source links must not initiate dragging.
- Provide arrow/move buttons or explicit position controls as a single-pointer non-drag alternative, and a keyboard movement path.
- Restore positions after refresh. Bound coordinates and safely handle malformed storage, unavailable pins, large boards and duplicate links.
- Separate “Arrange board” from “Reset filters”; neither should delete saved evidence. A removal action must not accidentally erase underlying source data.
- Zoom must preserve readable text and usable hit targets. A “Fit board” action should not continually override the researcher's camera.
- Empty board: explain one next step and link to the atlas or record search. Do not preload apparently personal pins or unmarked fictional evidence.

## Contextual help contract

- A consistent “Guide to this page” action follows the current route and relevant surface.
- First-use orientation should be optional and dismissible; it must not obstruct experienced users every visit.
- Explain high-risk semantics at the point of use: source versus analyst thread, financial stage, coverage gap, unplaced record, optional unestablished connection and qualitative model scenario.
- Each step names an action and an expected result. Keep help anchored to a real available control, with a readable fallback if a panel is closed or the selector is absent.
- Maintain Escape, focus order and focus restoration; respect reduced motion. Do not invent progress completion if a user skips a step.
- Separate page guides for the three static apps, or give them an equally discoverable local guide. A React-only help layer cannot automatically cover their HTML documents.

## Published resources and concrete translations

All links below were checked during this audit. These sources support principles; the implementation choices are our synthesis. No claim is made that the complete books were read during this task.

### 1. Human–computer interaction: Shneiderman

[Ben Shneiderman, “The Eyes Have It” (1996), author-hosted paper](https://www.cs.umd.edu/~ben/papers/Shneiderman1996eyes.pdf) describes overview, zoom, filter, detail, relationships, history and extraction as distinct information tasks.

Application: let the national map establish scope, keep filtering close to it, open detail on selection, retain Back/history and export. A full-screen graph without a clear current scope or readable detail plane addresses only part of the task. The table remains essential for finding a known item whose location is unfamiliar.

### 2. Discoverability: Norman

[Don Norman, “Design as Communication”](https://jnd.org/design-as-communication/) and [“Affordances and Design”](https://jnd.org/affordances-and-design/) distinguish what an interface can do from what a person perceives they can do.

Application: a decorative pin does not explain drag, inspect or connect. Add a real handle, visible action labels, connection type selection and immediate state feedback. Preserve familiar native links, buttons and selects inside the physical metaphor. The board's apparent material should reinforce function rather than demand that users guess it.

### 3. HCI evaluation: Nielsen Norman Group

[Ten Usability Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/) and [Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/) provide a practical basis for visible state, recognition, control and staged complexity.

Application: keep the primary rail short, search the entire catalog, show active filter summaries and place advanced filters behind a well-labeled control. Confirm a successful pin or export locally. Reset and close actions must be easy to find. Progressive disclosure must never hide the evidence qualifier necessary to interpret the currently visible claim.

### 4. Information design: Tufte

[Edward Tufte, *Beautiful Evidence*, official book page](https://www.edwardtufte.com/book/beautiful-evidence/) places the quality, relevance and integrity of evidence at the center of visual explanation.

Application: spend the largest reading area on the record and its source, not a generic metric-card grid. Keep dates, units, denominator and accounting stage near each number. Show competing evidence at comparable visual weight. The board is successful when it makes checking easier, not when it merely looks interconnected.

### 5. Cartographic honesty: Monmonier

[Mark Monmonier, *How to Lie with Maps*, publisher page](https://press.uchicago.edu/ucp/books/book/chicago/H/bo27400568.html) discusses how mapmaking choices shape the story a map presents.

Application: name the location basis beside a pin, preserve approximate/unplaced/national records, and never treat an empty region as no activity. Free arrangement on the board must be visibly different from geographic placement. Thread length, card area, pin size, depth and camera angle must not imply money, evidence strength or culpability without a declared encoding.

### 6. Art and perception: Albers

[Josef and Anni Albers Foundation, *Interaction of Color*](https://www.albersfoundation.org/alberses/teaching/interaction-of-color) documents the contextual nature of color perception.

Application: test semantic colors against both map and paper surfaces, not only in an isolated palette. Pair color with label, line style or shape. Reserve the richest wool color for analyst work while keeping source-status badges consistent across pages. Use restrained material contrast to establish hierarchy before adding saturation.

### 7. Ethical marketing psychology: Cialdini

[Influence at Work, seven principles of persuasion](https://www.influenceatwork.com/7-principles-of-persuasion/) and [its distinction between influence and manipulation](https://www.influenceatwork.com/faq/) explain how authority and other social cues affect decisions.

Application: earn confidence with verifiable source identity, dates and reproducibility, rather than invented expert-review badges, popularity counters or urgency. The first action can be small and useful, such as opening one record, but do not turn an allegation into a persuasive onboarding narrative. Saving a pin expresses a research interest, not endorsement.

### 8. Art/technology explanation: Victor

[Bret Victor, “Explorable Explanations”](https://worrydream.com/ExplorableExplanations/) emphasizes explanations whose assumptions and consequences can be examined through interaction.

Application: a tutorial should connect an action to what changed in the evidence view. In model and game-theory pages, keep assumptions visible and resettable; show the scope of the resulting scenario. Do not present a qualitative simulation as a newly validated predictive model. A beautiful interactive picture without a legible question is insufficient.

### 9. Contextual support and accessible manipulation

[Nielsen Norman Group, Help and Documentation](https://www.nngroup.com/articles/help-and-documentation/) supports timely, task-focused help. [W3C's explanation of WCAG 2.2 dragging movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements) requires a non-drag single-pointer alternative where dragging is not essential and separately notes keyboard requirements.

Application: expose page-specific help and provide buttons for repositioning pins. Do not assume desktop-only means mouse-only. Test tutorial focus, dialog close, visible focus, readable zoom and non-drag movement as real interaction paths, not checklist text.

## Risk-based implementation order

1. **Preserve:** route registry, data identity, source semantics, old URLs and Casebook storage/import/export.
2. **Orient:** one searchable navigation model, unambiguous saved-work destinations and full global-app discoverability.
3. **Build the artifact:** board canvas, pin rendering, position persistence, analyst-thread UI, inspector return flow and keyboard/non-drag controls.
4. **Unify materials:** shared shell and reading surfaces, then independent investigation layouts and static global pages. Keep local chart semantics intact.
5. **Teach:** route/surface-specific guides and concise local interpretation help.
6. **Verify:** build, preservation tests, existing regression suites, and a bounded visual/interaction review at 1280×800 and 1600×1000 or comparable desktop sizes. Add 200% browser zoom and reduced-motion checks.

## Completion evidence to request

- Router diff demonstrates every inventory route remains and the three static apps build at the correct paths.
- Existing seeded Casebook pins, notes and saved views survive reload and migration-free use.
- Board links are demonstrably analyst-only; source exports retain responses, limitations, dates and financial stages.
- One end-to-end task works with pointer, keyboard, and non-drag movement controls.
- Navigation finds the formerly missing allegations page and all connected global apps.
- All visible new controls perform an action; no tutorial targets a missing control.
- Desktop screenshots confirm no clipped source titles, overlapping pin text, invisible focus, inaccessible drawer close or unusable dense tables.
- Findings distinguish implemented, tested and proposed items. A successful build alone is not evidence of preserved interaction behavior.
