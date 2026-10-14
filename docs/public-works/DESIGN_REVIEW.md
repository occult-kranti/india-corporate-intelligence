# Public works interface review

Design direction: the existing ICIP public-record reading room, extended into a procurement investigation workspace. The primary artifact is a record with provenance and accounting stage. A relationship graph supports sparse recorded connections; it does not replace the procurement denominator or imply influence.

## Round 1 — structure and evidence semantics

The frontend/design agent inspected `DESIGN.md`, `Water.tsx`, `Education.tsx`, the tender register and shared editorial primitives. It applied the Design Partner skill and the repository's interface-design and frontend-implementation skills. The lead reviewed the proposal against the actual procurement data contract.

Decisions implemented:

- `/public-works` opens the explicitly labelled roads and bridges lens. Nine sectors and an all-sector view share the same evidence workspace.
- The current workspace holds buyer-level aggregates from a historical government-portal scrape. The centre is therefore a buyer ledger with usable-bid-count denominators, classification basis and source links; it is not an invented row-level tender or payment ledger.
- Geography uses recorded locality metadata. A buyer address is not a work site. All states and union territories remain navigable, with local coverage gaps visible.
- Repeat-work review first states why the available aggregates cannot establish repeated physical work. A separate manual comparability check accepts unverified user-entered records and preserves correction, cancellation, accounting-stage and identity boundaries.
- Each case displays attribution and response with equal visual weight, then alternative explanations and the evidence that would resolve the issue.
- Legal records display effective dates, jurisdiction and applicability. The optional event-date check establishes temporal eligibility only.
- The network has URL-addressable entity, depth, view and relationship selection; a full relationship table and provenance CSV provide alternatives to the graph.
- Source CSV and buyer CSV export the complete filtered population, including records beyond the displayed page. Reading-list filtering affects source rows and source exports only.

## Round 2 — rendered candidate and adversarial review

The lead, frontend/design agent, data engineer and graph engineer reviewed the implemented candidate and exchanged concrete corrections. These are AI-agent reviews, not participant usability research or endorsement by human domain experts.

Corrections implemented:

1. A verification sample with unavailable stored URLs originally risked reading as measured disagreement. The page now displays the check date, unavailable URL count and sample denominator, and explicitly states that agreement with official records is unknown.
2. Case graph filtering by shared source IDs can include separate matters from one broad report. The control and explanation now say “shared-source context”; they do not present this as a case-specific allegation network.
3. Buyer exports now retain citation URLs, locators, retrieval information, sample date, unavailable sample URLs, the deduplication rule and dataset limitations. This evidence boundary travels with the downloaded counts.
4. Implicit select labels included all option text in browser label matching. State, source type and graph-context selects now use explicit labelled spans. The graph and manual-check authors applied the same correction to their controls. Exact-name workflow assertions were retained.
5. Sector controls became a balanced grid. Narrow search controls preserve 16px text, while local table/graph scrolling preserves the page width.
6. Multiple case amounts retain currency, period, unit and accounting stage separately. There is no grand total across allocations, awards, audit estimates and expenditure.
7. A long semicolon-delimited financial-statement locator caused 390px horizontal overflow. Record metadata now wraps without truncating the locator.
8. CSV exports compose against the latest URL, including a rapid saved/filter action followed by export, rather than relying on the prior concurrent render.
9. The recurring-winner pair denominator is explicitly the whole retained dataset, independent of selected sector, state or place.
10. A malformed event-date URL is disclosed and cannot silently become a valid retrospective rule test.

## Verification scope

Initial Chromium inspection at 1440 and 390 CSS pixels found no document or main horizontal overflow. The heading, sector controls and persistent field labels were inspected in screenshots. TypeScript compilation passed after integration. The completed development workflow subsequently passed 71 checks against the 56-source, 156-buyer, 58-relationship corpus, including the corrected 320px and 390px layouts.

The browser workflow in `scripts/public-works/browser.mjs` exercises source and buyer exports, all sector lenses, source scopes, URL history and rapid consecutive actions, reading-list persistence, unknown locality handling, date applicability, manual comparability, graph/table alternatives and keyboard node activation. Final executed gate counts and screenshots are recorded by the release lead in `VERIFICATION.md` after the research corpus is frozen.

This is bounded Chromium verification. Screen-reader testing, other browser engines and human participant research have not been performed.
