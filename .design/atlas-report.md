# Public Record Atlas implementation review

Review date: 7 October 2026. Scope: shared shell, sector navigation, global tokens, dossier reading surfaces, and the rendered atlas composition. This is an AI design engineering review, not participant research or a legal/editorial assessment of the cases.

## Direction and implementation

The prior surface was inspected in a running Chromium browser before editing. It compressed the map to a narrow left pane and gave the map, node cloud, and record inspector similar emphasis. The replacement direction is recorded in `atlas-brief.md`; the coordinating implementation agent accepted it before code.

Changes owned by this design pass:

- `src/components/Layout.tsx`: 168px labeled sector rail, 80px intermediate rail, mobile sector strip with active route reveal, new destinations for health/NGOs/disaster relief/transport/public funds/policy/public records, source-aware page titles, and a refreshed searchable navigation library. All 44 library destinations remain ordinary links.
- `src/components/investigation/shell.css` and `src/index.css`: unified petrol/jade/paper tokens, tactile control states, directional elevation, responsive frame, caret/selection/scrollbar/focus styling, and reduced-motion behavior.
- `src/pages/investigation-dossier.css`: continuous source register instead of equal repeated cards; opened response/interpretation/source content gains a distinct paper reading plane.
- `PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json`, and this brief/report preserve the authorized scope, implemented tokens, evidence constraints, and review history.

Map geometry, 3D rendering, investigation data, shared workspace composition, network behavior, and money-trail composition were implemented by parallel agents. This report does not take ownership of their separate verification.

## Actual references

Chromium visits and captured images covered https://kepler.gl/, https://earth.nullschool.net/, and https://www.globalforestwatch.org/map/. Transfer decisions are recorded in `atlas-brief.md`. The references contributed operational choices (time controls, canvas scale, local qualifiers), not evidence about India.

## First combined inspection

Executed at 1440×1000 and 390×844 on `/`, `/energy`, `/follow-the-money`, and `/debt?iw_view=dossier`, plus `/justice` at 320×760. Captures and structured checks: `/tmp/atlas-design/review/`. The first money-trail mobile capture was a lazy-loading state and is not accepted as visual evidence; it is marked for valid recapture in the confirmation batch.

Observed shell checks:

- No document or main-container horizontal overflow on the captured routes and widths.
- All 44 navigation-library destinations rendered. Initial dialog focus landed on Close navigation; Escape restored the actual opener.
- Navigation search returned the policy destination and a useful empty state for an unmatched query.
- Selecting Health preserved `iw_state=GJ`. The active mobile shortcut remained visible at 320px.
- Reduced-motion produced a computed `0s` transition duration. No browser page exceptions occurred in the interaction batch.
- Contrast calculations for new shared foreground/background pairs: primary text 11.33:1, secondary text 8.01:1, muted text 6.11:1 on the raised dark surface; selected navigation 9.32:1; paper body 6.91:1; paper citation metadata 4.67:1.
- `git diff --check` passed for owned changes.

Material findings handed to the coordinating implementation agent in one batch:

| Finding | Evidence | Requested correction |
| --- | --- | --- |
| Map absent from useful mobile opening | Home390 showed no map in 844px; desktop home canvas began at y≈814 | Compress title/sector/time controls, remove redundant map state select, move map into first useful viewport |
| Money-trail case brief below map at ordinary desktop width | 1440px breakpoint rendered case index beside map and moved source brief below | Keep a readable case/claim brief adjacent to the map |
| Case dock lacked reading margins | Heading, tabs and records touched dock edge | Add consistent 18–22px inset |
| Dates too faint on paper dock | Child time color retained dark-surface token | Apply paper-appropriate metadata color |
| Mobile dossier title too far below context chrome | Debt dossier title began near y820 | Compress the contextual map/filters in mobile reading mode |

## Tooling and review boundary

The requested local Impeccable context launcher was absent. The cloud skill's linked reference resources could not be read; official upstream `new-work.md`, `craft-floor.md`, `mode-operate.md`, and `document.md` were read through the project's documented fallback. The detector executable was also absent; no detector result is claimed. Existing product/design context was read directly, and the user's broad implementation authorization governed the replacement work.

This was a bounded Chromium visual, route, and keyboard inspection. Screen-reader, cross-engine, 200% browser-zoom and participant testing were not performed in this pass. Full release tests and independent review are coordinated separately. A final confirmation record follows after the single correction batch.

## Confirmation after the correction batch

The same viewport matrix was captured once more after root's composition changes. One Vite hot-reload destroyed the JavaScript evaluation context while fonts were settling; the interrupted money capture was resumed after route readiness. All listed confirmation images were opened and checked. Product screenshots retained at `docs/atlas/design-review/` include a provenance manifest; the complete temporary matrix is `/tmp/atlas-design/confirmation/`. These are correction-review artifacts, not frozen production captures.

| Finding | Confirmed disposition |
| --- | --- |
| Home/sector map too low at desktop | Resolved in this review: home canvas moved from y≈814 to y≈529; energy from y≈665 to y≈474. A recognizable full mainland is now visible beside cases in the desktop opening. |
| Mobile map below useful opening | Improved, partially resolved: home and energy canvases begin at y571 at 390px, with northern/central geography visible. The full map still requires scrolling. |
| Money-trail case not beside map | Resolved at 1440px: the paper case brief now sits beside the map, after a horizontal case index. |
| Money-trail opening dominated by controls | Still material: the 1440px canvas begins at y842; at 390px it begins at y793. The title/search/edition/time/index/map-heading stack still pushes the geography below the useful opening. Handed to root and the fresh independent reviewer. |
| Paper case dock lacks inset | Resolved: computed dock padding is 18px desktop / 17px mobile. |
| Dock dates faint on paper | Resolved in rendered confirmation: date text now uses paper-appropriate dark ink. The separate money-brief tier label remains pale and was handed to root. |
| Mobile dossier title too low | Resolved: debt title moved from y≈820 to y515 at 390px; source context and content are visible in the opening. |

The confirmation matrix had no document/main horizontal overflow at 1440, 390, or 320 pixels and no browser page exceptions. Root's compact mobile scope selects use 11px text; a 16px native-control text correction was handed back to avoid iOS focus zoom.

Disposition at this pass's scope: **fix** for the remaining money-trail framing and small control/contrast issues; the design-owned shell and dossier changes passed their bounded review. No further self-polish round was run. The coordinating agent and a fresh independent reviewer own final corrections and release verification. Do not restate this limited result as whole-site certification.
