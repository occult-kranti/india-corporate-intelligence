# Delhi and Mumbai spending review experience

This release extends the existing flat Allegations atlas. It does not introduce a second map renderer, replace the shared evidence reader, or convert ordinary budgets and procurement into accusations. No skills were used.

## Review round 1: investigation and geography

The first design decision was to preserve the current geographic map and exact-ID evidence reader while making Delhi and Mumbai reachable in one action. The parent and implementation agent agreed on:

- An explicit `All reviewed` default, with `Delhi + Mumbai`, `Delhi`, and `Mumbai` city controls. Existing links and retained-archive research continue to work.
- City membership based only on the evidence record or relationship's explicit locality IDs. The locality must identify Delhi/New Delhi or Mumbai. Maharashtra-only records, Pune records, unknown locations, and an endpoint's headquarters do not qualify as Mumbai.
- Optional national context, with national-only entries labeled `National context · no city allocation`. A national force's headquarters does not make its national procurement Delhi Police spending.
- Optional statewide context, off by default for city lenses: DL for Delhi, MH for Mumbai, and both for the combined lens. Statewide records retain their own labels and counts; they never become direct city membership. All reviewed already contains statewide geography.
- A separate `Budgets & contracts` drawer for ordinary allocations, expenditure reports, notices, awards, releases and financial statements. These seed the map/network and evidence export, but never inflate the allegation index.
- Police, border/defence and public-funds topic controls based on the explicitly reviewed research namespaces. Neutral tender-scan cohorts use their declared domains; titles and matching names are not topic or identity evidence.

City choice clears an active state filter, avoiding an invisible contradictory state selection. A subsequently chosen state filter intersects the city lens and is disclosed in the scope text. Reset filters clears city, topic, national and context-search filters as well as the pre-existing search/sector/state controls. A empty result remains empty; it does not silently restore the full registry.

## Review round 2: map prominence and reader continuity

The expanded toolbar retains the current palette, fine borders, serif headings and compact documentary labels. The ordinary-context drawer occupies the existing record-index position rather than adding a tall dashboard above the map. Selecting any context record opens the same source-backed reader and connected network used for claims. Only one evidence reader is opened.

The first 320-pixel rendering put the map below 509 pixels. The second iteration kept the national-context checkbox visible beside the review title and made the longer geographic scope note expandable on narrow screens. This moved the map to approximately 473 pixels without truncating the city controls. At 1440 pixels the map begins around 286 pixels. Neither measured preview had horizontal page overflow. These are development preview measurements, not immutable deployment receipts.

All source and response closure survives the city/topic display filter. Readers can therefore display a response or identity outside the current geographic selection; these are not counted as additional matching accusations. Context amount lines retain currency, unit, stage and period. Additional observations are available in the complete reader. The interface supplies no pooled money total.

## URL and evidence contract

| URL key | Meaning |
| --- | --- |
| `al_city` | `both`, `delhi`, `mumbai`; absent/invalid means all reviewed geography |
| `al_topic` | `police`, `defence`, `funds`; absent/invalid means all topics |
| `al_national` | `0` excludes national-only display seeds; linked responses remain in closure |
| `al_state_context` | `1` includes the relevant statewide context in a city lens; independent of national context |
| `al_context` | `1` opens the ordinary budget/contract drawer |
| `al_cq` | Search within the displayed ordinary-context records |
| Existing `al_*` keys | Cohort, claim kind, state, sector, query, selection and map/network view retain their meanings |

The ordinary-context drawer searches its current display list. The top-level query applies to the complete view, including ordinary context. Claim-kind controls filter claims; they do not relabel or reclassify financial context. The downloaded evidence packet includes the geographic/topic choices and the exact ordinary-context seed IDs under `metroScope`; the complete source and response closure is retained.

Supported ordinary kinds: `budget-allocation`, `budget-expenditure`, `procurement-notice`, `contract-award`, `financial-statement`, `funding-release`, `procurement-context`, and compatibility alias `expenditure-report`.

The neutral tender cohorts describe source-buyer cohorts and their documented coverage limitations. Their row counts are not counts of wrongdoing, successful awards or actual payments. A notice is not an award, a contract value is not spending, and a budget estimate is not expenditure.

## Verification

`node --test scripts/metro-spending/experience.test.mjs` exercises twelve meaningful conditions: Maharashtra/Pune false positives, headquarters non-propagation, optional national context, preservation of the default claim population, exact topic classification, ordinary-context exclusion from allegations, out-of-scope response closure, separate accounting stages, filter intersections, declared neutral tender cohorts, exact agency/source search, and independent optional statewide scope.

`scripts/metro-spending/browser.mjs` requires populated source-backed Delhi and Mumbai entries and ordinary financial context. It tests the rendered counts against the data selector, URL reload and Back/Forward behavior, national exclusion, optional statewide context and its independent history, ordinary-context search and exact reader IDs, map/network continuity, source-closed export and 1440/768/390/320-pixel layouts. Use `INVESTIGATION_DIST` for an immutable build, or `INVESTIGATION_BASE_URL` for a deployed URL; `METRO_ARTIFACTS` controls its output directory. Final release receipts belong in the release acceptance documentation rather than being inferred from these development checks.

Development regression result: all 43 existing Allegations browser checks passed against the Vite preview after the URL composition correction (`/tmp/metro-existing-allegations-v2/acceptance.json`). The preceding run caught a real rapid close-reader → Network race: a second URL action composed against stale React search parameters and restored the just-closed selection. The page now composes changes from the current HashRouter URL, matching the established Water/PublicWorks approach. The complete affected suite was rerun; no forced clicks or weakened assertions were used. TypeScript and authored-file whitespace checks also passed at this stage. Data integration and immutable release verification are separate later gates.

The populated development run passed 42 checks, then visual review caught an additional mobile usability issue: opening `Budgets & contracts` left its below-map drawer offscreen. An effect now scrolls to the actual drawer only when it opens on a narrow screen. It uses instant movement, including for reduced-motion users, and does not run for ordinary filter changes. The expanded full browser suite passed **44 checks**, including explicit 390- and 320-pixel assertions that both the context heading and search input lie within the viewport (`/tmp/metro-experience-mobile-fix/acceptance.json`). The application was frozen after this correction; immutable build verification follows under the release process.
