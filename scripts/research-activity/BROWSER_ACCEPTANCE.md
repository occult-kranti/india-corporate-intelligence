# Browser acceptance

**Not run by this staging task.** Automated model/DOM checks passed, but they do not establish rendered appearance, screen-reader behavior, contrast, navigation, or actual host MIME handling. Record only observed results in an authorized browser; no browser launch or installation was performed here.

## Expected interface

- Nine work-item cards and four milestone rows.
- All work 9; Done 1; Working on 5; Next 1; Blocked 2.
- Working on cards have a visible “Review pending” or “Source review pending” qualification. No Running filter, live status pulse, or automatic scheduling claim.
- Snapshot: 16 October 2026, 03:49 UTC. Per-item checked dates can be older.
- PR9 is Done with its completion note and public PR9 link. PR10 is draft, unmerged, and review pending. New source packets remain candidates awaiting review.
- Back navigation: Evidence atlas → `../spatial/`; Original workbench → `../#/investigate`.

## Checklist

- [ ] Desktop 1440×1000: visible dates, count groups, sidebar links, clear next steps; no clipping or horizontal page overflow.
- [ ] Laptop 1024×768: sidebar and return navigation remain accessible; filters wrap; source and question text remain readable.
- [ ] Mobile 390×844 and narrow 320 CSS-pixel width: header/navigation and search reflow; no sideways scrolling or inaccessible controls.
- [ ] 200% zoom and, where supported, 400%/320 CSS-pixel reflow: controls remain operable without overlap.
- [ ] Keyboard: skip link, return links, milestone link, filters, search, reset, and evidence links are reachable with visible focus. No trap. Enter/Space work on buttons; reset returns focus to search.
- [ ] Screen reader: one main landmark/h1; task headings and filter pressed states are announced; result count updates politely; load failure uses alert semantics.
- [ ] Click all four status groups and All work. Combine status and case-insensitive search, try an empty-result query, reset repeatedly, and switch groups repeatedly. Counts always match visible cards.
- [ ] Back links resolve under the actual site base. Public evidence links resolve to the intended PRs; browser Back restores access to the console. Filter persistence is not promised.
- [ ] Title-only references are plainly not links. Runtime source/network/DOM contain no private chat URLs, source excerpts, unreviewed allegations, or private data.
- [ ] Block the local snapshot request and test malformed/invalid local fixtures: a readable recovery message appears; no partial or misleading ledger is shown. Restore the real snapshot.
- [ ] Older/future-dated local fixtures show stale/device-clock warnings. Label screenshots of fixtures; never alter production dates for apparent freshness.
- [ ] Reduced motion disables transitions and smooth scrolling. No animated activity indicators.
- [ ] Check text, controls, focus, and badges for appropriate contrast.
- [ ] Before navigation, network requests are local runtime modules, CSS, and snapshot only. No CSP errors, external dependencies, or unexpected requests.
- [ ] Actual `/research-activity/` directory index, `.mjs` MIME type, JSON MIME type, and caching behavior work on the intended host.

## Optional screenshot record

If authorized, capture overview, Working on, Blocked, empty search/reset, narrow/mobile, stale fixture, and load-error fixture in one bounded pass. Record browser/version, viewport, actual snapshot date, and observed outcomes. Avoid private browser chrome. No screenshots are included in this staged deliverable.
