# Geographic investigation workspace

## Product decision

The user explicitly selected a geographic India map linked to a relationship graph and requested a deeper investigation workflow across every page. The previous article-first reading room exposed separate registers and long introductions; the home viewport had no investigative canvas. The new shared workspace makes selection, geography, relationships and evidence the first task surface. Existing dossiers remain accessible as complete reference material.

This is a redesign within the current React/TypeScript/static-data stack. It preserves evidence tiers, citation provenance, source responses, identity-resolution boundaries, saved lists and old route query parameters.

## Panel round 1 — architecture

Participants are the coordinating agent, design/frontend agent, data-registry agent and graph/cartography agent. These are synthetic specialist reviews, not human user research.

Accepted decisions:

1. **One shared workspace on every route.** The route becomes the initial investigation topic. The root layout provides a compact navigation rail and full navigation drawer. The workspace fills the remaining viewport; it does not prepend a decorative map to the existing article.
2. **Geography plus relationships.** At wide widths the main canvas presents the India map beside a bounded relationship graph, with a source/evidence inspector on the right. A state changes the shared query. A node, relationship, case or source opens an inspectable artifact. Neither proximity nor graph degree implies influence.
3. **Current geography.** The cartography agent identified that the previous geometry predates the current Ladakh and merged Dadra and Nagar Haveli/Daman and Diu boundaries. The shared map requires current 36-state/UT geometry. Work location, programme coverage, headquarters and other state associations remain separate geographic bases; national and unknown geography are shown outside state coverage totals.
4. **Progressive layers.** People, organisations, funding, procurement, legal records, welfare, services, policy and review questions are explicit layer controls. Evidence tiers, date range, undated inclusion and geographic basis are available in an advanced filter panel. Controls change all linked surfaces and expose the resulting denominator.
5. **Cross-domain search.** Search accepts people, companies, schemes and case terms. A submitted global search can broaden from the current route topic to the full registry, visibly declaring that scope. An empty result is a coverage result, never a statement that activity or relationships do not exist.
6. **Trace and inspect.** Analysts can choose two resolved identities, inspect a bounded recorded path, read the sources and responses for each step, pin evidence into a local casebook and export a source packet. A missing path only describes the searched corpus, filters and depth limit.
7. **Complete dossiers remain reachable.** A Dossier mode opens the existing route content in its own scrolling area while retaining a geographic context rail. All routes default to the geographic workspace unless the URL explicitly asks for a dossier.
8. **Shareable, independent state.** Workspace state uses `iw_*` URL parameters. Existing route parameters are preserved verbatim. Selection, scope, layer, dates, map state, graph view/depth and path endpoints survive reload and history navigation. Existing education, water and public-works reading-list storage keys remain untouched.
9. **Mobile recomposition.** Map, Connections, Evidence, Casebook and Dossier are explicit surfaces on a small screen, with persistent selected context and shared filters. The mobile experience does not compress three desktop panes into a narrow row. Every map state has a keyboard/list alternative; every graph has a relationship ledger.
10. **Frozen semantic channels.** Tier labels and strokes remain distinct; roles and relationship types retain their meaning. Counts measure recorded evidence coverage. No synthetic risk, influence or corruption scores are introduced.

## Interface contract

`Workspace({ children, routeTitle, routeKey })` owns shared composition, `iw_*` URL controls, state comparison, path controls and the selected-artifact inspector. `children` is the complete existing route dossier. Root owns Layout/App and navigation integration.

The registry provides typed entities, relationships, records, sources, geographic bases and current state metadata. It exposes filtered views, state coverage, neighborhoods, bounded paths and review questions. Map and graph components consume these typed artifacts; they do not independently infer geography or join names.

The casebook is browser-local. Pins identify a typed registry artifact, notes remain visibly analyst-authored, and exports include the sources and limitations needed to interpret the packet.

## Panel round 2 — candidate review

The second synthetic panel reviewed the implemented interface, rendered desktop/mobile layouts and exact source exports. Participants were the coordinating advisor, frontend designer, cartography/graph engineer, registry engineer, independent browser reviewer and provenance auditor. The review used the design-partner foundations/modes/accessibility guidance and a React performance/accessibility checklist.

Concrete findings and changes:

- **A working surface replaced the article landing.** A compact route/search header and persistent geographic query now lead into map, relationship canvas and evidence inspector. The complete previous route is an explicit Dossier surface with its own scroll area. The 1440px render places all three working panes in the first viewport.
- **Small screens require a different composition.** At 390px and 320px, Map and Connections are separate surfaces. Selecting a record, source or identity opens a readable inspector; returning restores focus to the current surface button and preserves the selected artifact. A later 768px screenshot exposed compressed Place/Topic selectors despite no document overflow; the filter controls now occupy their own row at tablet widths.
- **Explicit mobile dossiers need a reading origin.** Energy’s original phone checks exposed a real entry issue: workspace chrome and map context placed the dossier byline below the first screen and the graph below a valid touch coordinate. The canvas gesture itself still worked when visible. A mobile-only, one-time entry effect now waits for the lazy dossier heading, focuses it and scrolls the existing reading container. Map-first defaults and the context map remain intact. A user pointer/key/wheel/touch interaction cancels pending focus; route/surface changes clean it up, and filter edits do not rerun it. The original Energy AC61/AC64 then passed unchanged.
- **Geographic context must be precise.** Unambiguous state-profile routes select their modern state by default. Choosing All India writes an explicit override instead of immediately restoring the route state. Ambiguous legacy `jk`, `dn` and `dd` routes remain unplaced until an explicit modern selection. Original dossier maps carry a historical-boundary note; the shared map uses the current 36-unit geometry.
- **Specific entity routes need a clear action.** Company and group routes offer an explicit “Focus … in connections” control only when their exact `co:` or `grp:` identifier resolves. No name matching or automatic influence focus is performed. Their complete dossiers remain one action away.
- **The first record list needs an explainable order.** Starter and ledger records use latest known event-window dates, with undated records last. The visible label explains that this is chronological order, not a significance or risk ranking.
- **Linked selections can outlive filters.** A shared or saved artifact outside the current filters remains inspectable with an explicit notice and a Broaden action. It is not counted as a matching result. Malformed dates, layers, identifiers and other URL controls have visible notices; workspace reset preserves every legacy route parameter.
- **History must restore committed query state.** A rapid global Search → Back probe reproduced a stale input in four of five cycles: the URL had already lost `iw_q` while a skipped intermediate React render left the draft intact. The shared native-history draft hook now supplements ordinary query synchronization. The same five-cycle probe then restored URL and input in all five cases without browser exceptions. The permanent workflow repeats this regression.
- **Financial and geographic provenance must survive export.** A live CSV audit found an independently cited geography source missing from record exports. CSV and inspector citations now include both direct and geographic source IDs. Exact linked responses are retained outside the active filters with full source metadata, while currency, unit, accounting stage and observation period remain separate. Exports include endpoint/relationship IDs, query context and snapshot date.
- **Inspection must not trigger expensive re-querying.** Registry filtering and state coverage use separate memo keys from graph focus, surface and source selection. Global text input remains a draft until explicit submission; graph previews stay bounded and the complete ledger remains available.
- **Path identity is an explicit choice.** The picker requires selecting a resolved canonical identifier; text similarity never merges identities. Directed/bidirectional traces state their depth, visit and path caps. The highlighted path is a source-backed connection to inspect, not evidence of causation or influence.

Rendered review evidence: an initial desktop render and 390px/320px checks had no uncaught browser exceptions or horizontal document overflow. Independent provenance review reproduced and then verified the geography-source and linked-denial CSV fixes; its 390px PM CARES record → source → return flow also passed. An earlier production candidate passed all 42 then-current focused checks. State-context navigation and rapid-history regressions subsequently expanded the suite to 52 checks. The completed production workflow is retained in `scripts/investigation/workspace-browser.mjs`; the final repeated-run results follow.

The dedicated workflow uses an owned static server over the built application by default, with `INVESTIGATION_BASE_URL` available for development review. It covers workspace/legacy URL isolation, browser history, modern-state overrides, exact company/group route controls, malformed/empty filters, geography-source closure, filtered response closure, casebook export, resolved-identity path selection, outside-filter inspection and keyboard return at 390px/320px. The independent graph and whole-route browser suites cover their own surfaces rather than duplicating those checks.


### History and state candidate acceptance

On 6 October 2026, the history and state candidate passed the focused workflow **three consecutive times, 52 checks per run**, with no uncaught browser exceptions. The artifact index SHA-256 was `70b710558f84be342c3e6e0ff66894443d0040396d18199e97b6d55b058088f4`.

Executed command: `INVESTIGATION_DIST=dist-release node scripts/investigation/workspace-browser.mjs` (three consecutive runs). The script owns its static server and isolated browser, and can run against the normal `dist` build without an override.

The final checks include five rapid global Search/Back cycles per run; preservation of implicit modern-state context across lenses, source dossiers and the method page; an explicit All India negative control; the tablet select-width regression; a same-task scope change followed by export of all matching records beyond the visible page; independent geographic source metadata; exact linked responses retained outside filters; canonical company/group and path endpoints; saved casebook source closure; and mobile inspector/focus/overflow at 390px and 320px.

Harness readiness waits for the actual route, visible query/state/selection and the registry-derived committed result count before asserting. This addresses concurrent route updates without weakening the independent empty-layer, identity or export assertions. The production fix for rapid history restoration remains covered separately.


### Mobile dossier UI acceptance

The updated UI candidate `dist-final` passed the focused workflow **three consecutive times, 54 checks per run**, with zero uncaught browser exceptions. Its entry asset was `index-B8R4qcK1.js`; index SHA-256: `3323f576d49e808f4ebeee79637af5e6f0af58738bbb726137d358931d769d29`.

Executed command: `INVESTIGATION_DIST=dist-final node scripts/investigation/workspace-browser.mjs` (three consecutive runs). The two added assertions verify that an explicit mobile dossier focuses its lazy reading heading within the first screen, then preserves the reader’s scroll position and active input when a native dossier filter changes. Independent unchanged Energy criteria AC61 and AC64 also passed on this artifact: first-screen facts/voids remain readable and a tap correctly arms the visible canvas.

These results identify the exact UI artifact tested. The coordinator subsequently prepared a separate data-only Atlas/PM CARES wording correction; verification of that publication candidate belongs in the overall release ledger, not under this earlier artifact hash.
