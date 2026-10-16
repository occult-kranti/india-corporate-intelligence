# CI browser review

The browser review is intentionally restricted to GitHub Actions. Do not run or install Chromium locally for this task. Local static syntax checks and the existing model tests are separate from browser verification.

## Repository placement

Publish this standalone package at `spatial-prototype/` and copy `workflow/spatial-review.yml` to repository-root `.github/workflows/spatial-review.yml`. Pull-request path filters include those paths plus the original layout, combined spatial release scripts, deployment workflow and combined release-review workflow. An explicit manual run is also supported. This artifact-only workflow does not modify routes, styles or deployment configuration. There is no deploy step and the token has only `contents: read` permission.

The job uses Node 20, the committed lockfile, the package's unit tests and production build, then [Playwright's CI browser installation](https://playwright.dev/docs/ci). It has a 12-minute job limit. A failed command remains a failure even when its output is captured in a log.

## What runs

`scripts/browser-review.mjs` launches CI Chromium with ANGLE SwiftShader and a loopback-only, read-only static server. The built app is served only at:

`/india-corporate-intelligence/spatial/`

There is no root asset alias or SPA fallback to mask broken relative asset URLs. Path traversal and symlink escapes are rejected. Each scenario gets a fresh browser context, including empty browser storage. Spatial assertions require actual WebGL draw calls, the MapLibre/Three Mercator renderer marker, and host/canvas rectangles filling at least 90% of the viewport. A nonzero drawing buffer in a collapsed or off-screen host is insufficient. An unexpected reading-mode fallback fails the main spatial checks. Software rendering is only a reproducible CI review environment, not a representative GPU benchmark.

The review has fifteen independently reported scenarios. Cases 1–11 explicitly select `?dataset=preview`; cases 12–15 use the full default dataset without a preview query:

1. A 1440 × 1000 overview; moving and paused source trail; a pinned reading panel that stays open after camera movement and Escape; an exported casebook checked against exact retained evidence objects and stable source IDs.
2. Keyboard-opened help, Escape dismissal, focus restoration, keyboard record selection, and inspector dismissal.
3. Timeline, unknown-date inclusion, facet selection, exact source-qualified area-anchor/reading-tray counts, the first 40 accessible record entries plus full-reader access, empty-state reset, and preservation of the source-backed model.
4. System reduced-motion preference, source inspection, no animated travel, zero long-range threads at the close-up destination, and a geographic label that moves with the camera.
5. Reading during an active journey cancels travel; the same 48 preview records remain available across 40-item and 8-item pages, response provenance and limitations survive, and returning to the map does not resume stale travel.
6. Deliberately unavailable WebGL with usable reading mode and source inspection. This is reported separately and cannot substitute for a spatial pass.
7. OSM/OpenFreeMap context and retained city-source links, height limitations, context-only disclaimer, building toggle, retained derivative JSON and license notice below the same repository subpath.
8. A continuous world-to-New Delhi flight: the same canvas, geographic destination center, city zoom/tilt and nonzero rendered building-feature count, with world, transit and city captures.
9. The equivalent continuous flight and building check for Mumbai.
10. The equivalent continuous flight and building check for London.
11. An explicitly blocked OpenFreeMap tile origin: the independently bundled Natural Earth country base still renders, the app distinguishes network degradation from WebGL failure, and the complete reading records and provenance remain usable.
12. The full default registry: a deliberately delayed chunk exposes accessible loading progress; all 96 chunks must verify before opening. The resulting 8,086 searchable items include 7,859 factual-map-eligible items, with 3,856 area-anchored and 4,003 unplaced. The 227 retained held/not-drawn reader-only records and the separate 316-entry held queue remain explicitly distinguished. Exact area groups and the 60-thread rendering cap are checked, followed by full-reader pagination. A separately delayed map import captures the interface before and after lazy graphics loading.
13. `?mode=reading` loads the complete registry without requesting deferred Three/MapLibre/worker JavaScript or creating a WebGL context. Exact original entity-ID search, source IDs/URLs/locators, original repository HashRouter links, retained relationships and held counter-context are inspected. Held-only searches cannot indirectly add factual entity marks.
14. A deliberately blocked registry chunk refuses the whole dataset rather than opening a partial result. The explicit retry restores the complete reader after the failed chunk becomes available; switching to preview is offered only as a deliberate link.
15. A deliberately blocked emitted `SpatialWorld` JavaScript chunk cannot evict the independently loaded complete reader. Full counts and source provenance survive with a concise graphics-failure notice; disabled graphics actions cannot pretend the map loaded, and no preview substitution occurs.

The live-building checks require successful provider responses and positive MapLibre `queryRenderedFeatures` counts for the building layer. Missing network data fails that review and remains visible in diagnostics; the separate network-failure scenario cannot substitute for live buildings. Render diagnostics expose center, zoom, pitch, source-qualified placement counts, country-base feature count and building feature count. None of these counts proves pixel quality. The downloaded bounded city sample is checked as a retained derivative, not treated as the worldwide rendered dataset.

Preview expectations come from `src/registry.json` through the existing model. Full expectations reconstruct the built manifest's declared chunks, checking their SHA-256 hashes and the complete snapshot hash before comparison. The reader and factual map are filtered independently, so held context cannot make a factual-map query match indirectly. The source trail uses the same first source-qualified cross-area relationship as the UI. Visible source cards are checked for exact title, URL, publisher, locator and distinct-source count; raw IDs are checked in the casebook export and full source catalogue. The unit suite separately checks retained objects against the original registry fixture. Neither stage invents evidence or treats a link as proof of guilt or causation.

## Review artifacts

The workflow preserves these artifacts with `if: always()` for 14 days:

- `spatial-browser-review-<run>-<attempt>`: screenshots, per-scenario JSON, aggregate `diagnostics.json`, DOM snapshots, Playwright trace ZIPs, exported casebook and command logs.
- `spatial-static-preview-<run>-<attempt>`: the production `dist/` directory for inspection; uploading it does not publish a site.

Every attempted scenario captures its final state, including failures, as long as Chromium remains responsive. Setup failures are recorded in aggregate diagnostics. A runner cancellation, browser crash, or job timeout may prevent some captures; inspect preserved logs instead of assuming that a missing image passed. External font failures are recorded but do not establish a local app-asset failure. Vector-tile responses and failures are recorded separately; world/city controls load public provider map data, while the network-failure case deliberately intercepts those requests. No external evidence link is opened or sent data by the review.

Every screenshot also records host/canvas bounding rectangles, computed position and dimensions, and loaded stylesheet order in `layoutSamples`; final rectangles are retained in `viewportGeometry`. The full-default scenario records the pre-import state with no host, then the rendered state after the deferred map module and CSS arrive. This guards the observed lazy-CSS regression where MapLibre's later `.maplibregl-map` rule overrode host positioning and produced a blank viewport despite nonzero WebGL draws. Failing geometry diagnostics remain useful even when image capture fails.

The workflow summary lists pass/fail status, with screenshots and traces in its artifacts. Review the captured image pixels before judging layout, clipping, visual quality or fidelity. No screenshot baseline comparison, pixel-quality approval, hardware FPS measurement, source-truth revalidation, or live deployment is claimed by this check.

## Safe checks without a browser

From the package directory:

- `node --check scripts/browser-review.mjs`
- `npm test`
- `npm run build`

Actual browser-review status remains unverified until the GitHub Actions run for the published revision finishes. The script rejects ordinary local invocation before starting a server or browser.
