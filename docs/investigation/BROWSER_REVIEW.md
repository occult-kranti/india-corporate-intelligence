# Investigation workspace: independent rendered review

Reviewed on 6 October 2026 using Playwright and the installed `/usr/bin/chromium`. The acceptance suite is `scripts/investigation/browser.mjs`; it serves the production `dist` directory on its own temporary local port by default. `INVESTIGATION_BASE_URL` supports an explicitly selected external preview, and `INVESTIGATION_BROWSER_ARTIFACTS` controls the report directory.

## Scope

The suite exercises every static route in `App.tsx` and representative state, company and conglomerate routes. Each route exposes the shared map with 36 distinct current state/UT codes. It checks route lenses, state selection, date and national-context filters, history and reload, original-source access, adjoining government responses, separate accounting stages, and retained dossier access.

The casebook journey covers pinning, questions and falsifiers, analyst notes, saved views, JSON and Markdown exports, additive import, malformed imports, reload persistence and return to the exact source record. A relationship with explicitly linked counter-evidence verifies that its responses survive export. Capacity checks reject an entire import when the combined casebook would exceed its pin or saved-view limit, preserving existing local work.

Responsive checks render map, evidence, casebook and dossier surfaces for welfare, education, justice and PM CARES at 320, 390, 768 and 1440 pixels. They check body overflow and usable main-filter widths. Screenshots are inspected separately: a programmatic overflow pass alone does not establish usability. Graph pathfinding, node gestures, zoom, pan and keyboard traversal are covered by the graph owner's separate suite.

## Panel round two findings

The first frozen production render passed the source, response, accounting-stage, casebook, invalid-URL and dossier journeys. The complete responsive sweep had no horizontal body overflow and produced no uncaught browser exceptions. Three early failures were harness errors: a state dossier correctly defaulted to Karnataka, controlled checkbox updates required an event-commit wait, and CSS capitalized a response heading that the test compared case-sensitively. The harness was corrected rather than treating those as product defects.

Visual inspection identified a real tablet defect at 768 pixels: Place and Topic scope were compressed to approximately 53 and 31 pixels because the surface tabs shared the same row. Their selected labels were unreadable despite the absence of overflow. The UI owner added a wrapping breakpoint. The suite now requires each select to retain at least 100 pixels of width. The final release passes that check, and visual inspection confirms readable tablet selections.

Additional state-route checks distinguish a current boundary from an ambiguous historical dossier. They exercise Karnataka's default, an explicit All India override surviving reload and surface changes, lowercase historical `jk`, `dn` and `dd` dossiers with no inferred current boundary, and an explicitly selected modern Ladakh override.

A focused production-browser probe found a second product defect: opening `/#/states/ka` selected Karnataka, but clicking Education changed the place to All India. Navigation forwarded explicit query filters while omitting the route-derived default. The captured before/after values were `KA` and an empty state, with the destination `/#/education`. This was reported to the workspace owner and added as a regression assertion. The final release includes the navigation correction and passes the added regression.

The corrected navigation candidate passed 13 targeted browser assertions with no exceptions, including both inherited Karnataka and explicit All India behavior. The UI reviewer then identified a separate search-history race: immediately reversing a submitted search could restore the URL while leaving the input draft stale. The UI owner corrected history synchronization; this suite adds three immediate Search → Back cycles to verify that the input and URL return together in the final candidate.

## Final candidate acceptance

**The final publication candidate passed all 669 assertions and 12 scenarios on 6 October 2026**, with zero uncaught browser exceptions. It was served from `dist-publish` using Chromium 151.0.7922.173 through Playwright. Three earlier consecutive full passes remain retained as stability evidence for `dist-release`; the final candidate received one complete sweep after the bounded mobile-entry and source-summary corrections.

| Run | Candidate | Completed (UTC) | Assertions | Scenarios passed | Scenario duration | Browser exceptions |
| --- | --- | --- | --- | --- | --- | --- |
| Prior stable 1 | `dist-release` | 2026-10-06T22:39:51.176Z | 669 | 12 / 12 | 157.64s | 0 |
| Prior stable 2 | `dist-release` | 2026-10-06T22:41:48.539Z | 669 | 12 / 12 | 110.56s | 0 |
| Prior stable 3 | `dist-release` | 2026-10-06T22:43:14.961Z | 669 | 12 / 12 | 83.15s | 0 |
| Final publication | `dist-publish` | 2026-10-06T22:57:37.562Z | 669 | 12 / 12 | 85.75s | 0 |

Final publication `index.html` SHA-256: `2a25a9abafe3baa5156b062ecea25e2cf81660d585484f157581d2ccc4f45592`.

Final acceptance harness SHA-256: `4366075ba36e191c10a483fe7640b8133cb2cb3f83fe67f88b664a1ca04b901a`.

Prior stable `index.html` SHA-256: `70b710558f84be342c3e6e0ff66894443d0040396d18199e97b6d55b058088f4`. The three prior runs used harness SHA-256 `39d672e7258e76f22a18b88ea3a3af9c6ae784f2cb4b2b9079a934d449c9dace`; both stayed unchanged throughout that sequence.

The complete reports and their original SHA-256 hashes are retained in [browser-acceptance.json](browser-acceptance.json). It separates the final publication acceptance, three prior stability runs, mobile-entry probe and interim harness diagnostic. Final screenshots and exported casebooks are under `/tmp/investigation-browser-publish-final`; the earlier artifacts remain in their report-listed directories.

The mobile-entry probe independently checked Energy at 320×844 and 390×844 on the immediately preceding `dist-final` build. After opening Dossier, its h1 had focus and appeared at approximately 69 pixels from the top, with its bottom below 159 pixels. Both widths had zero body overflow and no exceptions. The subsequent source-summary revision preserves this UI correction; its full responsive suite passed.

An interim `dist-final` sweep passed 11 of 12 scenarios and exposed a source-inspector timing issue in the harness: the URL changed before the matching inspector DOM committed. Its failure screenshot already contained the correct CAG locator. The harness now waits for the matching rendered source ID before reading the locator; the final complete sweep passes that assertion. This diagnostic remains archived.

Coverage includes 40 static/representative dynamic routes, all 37 static dossiers, 36 distinct current geographic shapes and 64 responsive route/surface/width combinations. Run the suite after building with `node scripts/investigation/browser.mjs`; `INVESTIGATION_DIST` selects an alternate build directory. `INVESTIGATION_BROWSER_SCENARIO` is a substring filter for focused probes; it was empty in all complete acceptance runs.

One nonblocking copy detail was recorded for later cleanup: imported official-role text contains `at25July2026` / `on25July2026` without spaces. Its meaning is clear; this does not affect date metadata or source attribution. No production data was changed by this reviewer during acceptance.

## Limits

This is acceptance of the curated published corpus and the local browser workflow. It does not establish comprehensive geographic data coverage, the truth of every underlying allegation, live availability of every external government server, or safety of an untested deployment. Source matching and accounting interpretation were reviewed independently in the welfare and finance research notes. Historical records, unknown dates and missing local coordinates remain explicit data limitations.
