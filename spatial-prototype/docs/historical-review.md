# Historical nine-claim review candidate

PUBLIC_GRAPH_BLOCKED. Local integration is not approval to merge, deploy, publish the graph or clear research holds.

## Entry and loading

- The existing full registry is loaded and verified normally. Preview uses its existing explicit subset behavior.
- The historical prompt requires `VITE_HISTORICAL_REVIEW=true`, the full dataset and exactly one `review=historical-2025` query value.
- The payload loader is a separate dynamic import requested only after **Open historical review reader**. The reader is another lazy boundary. No historical payload, reader or map-runtime chunk belongs to the initial shell or prompt's static import closure.
- This build flag is an entry gate, not authentication or a promise that review assets are private. Emitted assets must be reviewed before any authorized publication.
- Repeated clicks cannot duplicate an in-flight load. Verification failure leaves the base available and offers explicit retry. Dismissal, unmount, history navigation and page lifecycle events cancel stale results. Back/Forward or BFCache restoration cannot resurrect an old opt-in.
- Close/Escape returns to the still-mounted Open button. Reopening requires a fresh click and fresh verification. Dismissing the prompt hides it for that mounted session. Return links remove only `review` and preserve the remaining path/query/hash.

## Admission and provenance

The pinned base stays 2,469 entities / 4,203 relationships / 5,617 records / 3,314 sources. The reader alone is additive: 2,478 / 4,212 / 5,626 / 3,317. Original objects, source dependencies, routes and metadata are retained by reference; states, localities and methodology retain their original arrays.

SHA-256 pins:

- Base: `048f89ffd008a498212ff2ac71d4413aef09b138a50ab77f336a23fec4722064`
- Additions: `5cd5c36de9dd98609c948cf526595a175f30fd29457fa1c7db9cf29b978eaf45`
- Source provenance: `7ad1b6269af516d7f88dbee5687a6f3ba2cd0ac2f3b97318931d248c382eebf0`

No hash is automatically repinned. Unknown policies/statuses, forged overlays, invalid surfaces, duplicate/colliding IDs, changed holds, missing source closure and changed base bytes fail closed. All nine original `:hold:` records stay byte-equivalent. Nine sidecars map their exact targets; 27 separate exact-ID guard holds prevent every new entity, record and relationship entering factual marks/paths even if the reader is accidentally sent to the scene adapter. The retained original IRB is reused without suppression or identity rewriting.

The claim reader expands every qualification: issuer/self-reported attribution, source-family dependence, reporting versus document/publication/retrieval dates, incorporation-only CA/MU/IN geography, percentage denominator and gross/diluted limits, the direct bypass, Developers versus Private InvIT, minority ownership and Rafael-to-Rijn-only control. No amounts, payment path, current ownership, propagated control or wrongdoing finding is inferred. Unknown first-publication dates remain unknown. Exact source destinations use the existing safe-source URL validator without rewriting citations. Generic `/investigate` fallbacks are labelled **Browse original investigation overview**.

## Reproducible checks

Run `npm test` and `npm run build` from this package, then repeat the build as `VITE_HISTORICAL_REVIEW=true npm run build`. The portable `scripts/historical-review.test.mjs` uses the existing original-registry helper; it needs no stage folder, frozen research directory or absolute local path. As with the existing full-registry tests, the retained parent source must be available at the normal parent repository location or via `FIELDWORK_SOURCE_ROOT`.

Twenty focused tests cover pinned byte integrity, additive/source closure, original IRB reuse, exact-ID exclusion, immutable base behavior, unknown/tampered admission, build/query/full/preview gates, SSR source/qualification semantics, actual raw-loader verification, cancellation/retry and history lifecycle invalidation. These are static/SSR checks, not browser or layout approval.

Build budgets retain all existing limits and add 12 KB for the prompt, 20 KB for the reader and 100 KB for its raw payload chunk. The actual emitted module graph must preserve dynamic boundaries and an initial static closure no larger than 220 KB. `dist/build-budget.json` records the result. Gzip figures are estimates, not measured transfers.

## Required before a release decision

Inspect actual next-head browser artifacts separately: identity/date/qualifier rendering, every primary-source destination, exact original IRB route versus overview-only fallbacks, default/full and preview, flag/query/click gates, repeat/retry/cancel/Escape/focus, Back/Forward, mobile wrapping, timeline independence, no-WebGL reader and unchanged factual marks/paths and base denominators. Static success does not clear PUBLIC_GRAPH_BLOCKED. No local browser review is claimed by this integration.
