# Bitcoin growth: isolated noncommercial publication candidate

Target repository: `occult-kranti/india-corporate-intelligence`. Candidate branch: `feature/bitcoin-growth-map`. Future route: `/bitcoin-growth/` under the site's existing base path. This additive candidate contains no deploy action or root-route/navigation change.

## Immutable serving unit

Only the six files in `public/bitcoin-growth/` are site assets. This focus-correction serving unit is pinned by release manifest SHA-256 `1b6ccf1df0060ce191b6c52497b5802b77fd1072d84a907bfbc271c26f80e528`. Its `app.mjs` adds explicit source-dialog Tab/Shift+Tab endpoint wrapping and open-dialog focus containment after the predecessor's B15 native failure. The other five public files, all source/data content, geography and attribution retain their reviewed bytes from package SHA-256 `5189ff45604402c95e4ccbf09a412d2400c47cf191a832f4f1570ebad3085bd2`. The predecessor release was `789fbc25d98709a29b093b7312c49c7db79e321163066278a434e8554679de29`. The runner, acceptance matrix and served-integrity module remain byte-for-byte unchanged. The unchanged B15 assertion and remaining native/manual gates must pass before acceptance.

The board is intended for publicly viewable **noncommercial research**, with no advertising, paywall or monetization. Coin Metrics Community data is attributed under CC BY-NC 4.0; monthly aggregation and unit conversions are disclosed. No commercial permission or provider endorsement is claimed. See THIRD-PARTY-NOTICES.md and the in-page source/method drawer. No source-document mirrors, internal receipts, local cache paths or private history are included.

Canonical source projection SHA-256: `96664aad77414e2a6663f1b4c54dfecbd747d4202513991491c5d40a004202d1`; claim-decision SHA-256: `aa997ae1ed226adede017ff89debb32cd5b67eca5c315ce87c77e9dd0ec67a5b`. The published projection preserves all 32 qualified events, 22 nodes and 16 typed relationships, and excludes held stronger inferences. The 214 monthly observations describe global provider measurements, not geographic adoption, mining, users or wallet locations. Last refresh and units remain visible in the board.

## Narrow CI review, no automatic deployment

The additive workflow runs only for the candidate branch (or explicit dispatch on that same branch), in `occult-kranti/india-corporate-intelligence`, and permits one run attempt. It has read-only repository permission. It checks out the exact triggering commit without persisting credentials. It makes no push, merge, Pages, Vercel, Sites or deployment call. Existing workflows are unchanged. The release owner must not merge this route into an automatically deploying branch before actual manual acceptance.

CI uses the existing repository lockfile's official npm Playwright and playwright-core **1.62.1**. `npm ci --ignore-scripts --no-audit --no-fund` installs only the existing locked project dependencies; it adds no dependency, package or browser. Browser downloads are disabled. The installed Google Chrome channel must already be present. Missing runtime fails closed. Chromium's sandbox remains enabled. No arbitrary executable path or browser flag is accepted by the wrapper.

`publication-source-manifest.json` pins all six public files and the necessary support files; its independent hash is in the workflow. The workflow itself and repository lockfile are bound by SHA-256 in the report, alongside exact commit, branch, repository, run ID and attempt. The wrapper checks the tracked checkout is clean and re-verifies source bytes after native execution. Its in-memory HTTP fixture binds only `127.0.0.1:8769` and serves only the six approved paths under `/bitcoin-growth/`; no directory listing or other repository tree is reachable. The runner checks all six served lengths/hashes before and after the browser flows. Runtime external-origin requests are blocked and counted; any attempt fails acceptance.

## Evidence envelope and useful failures

Raw browser stdout/stderr are discarded, never copied to logs/artifacts. A raw report may remain only in a uniquely named runner-temporary quarantine directory. On failure, the wrapper emits a fixed diagnostic code, phase, matrix case ID, owned `browser-flow.mjs` line number when identifiable, passed-case count and actual child exit/signal. No DOM/source excerpt, arbitrary request URL, stack path or raw error message is emitted. A failed child retains its nonzero exit code; wrapper failures exit 1. No failure becomes a green check.

Artifact upload is allowed only after an automated native pass, complete exact inventory, source recheck, byte/hash verification and a second envelope check. Partial or failed runs have the bounded diagnostic summary but **no artifact upload**. The upload contains exactly these three files, no glob or directory upload:

- `browser-flow-result.json`: allowlisted sanitized fields only, at most 256 KiB.
- `desktop-initial.png`: at most 8 MiB, native width 1440, height at most 20,000.
- `mobile-initial.png`: at most 8 MiB, native width 390, height at most 20,000.

Total cap: 16.25 MiB. The report binds both PNG hashes and sizes; its own SHA and PNG SHAs are checked immediately before upload and logged as fixed CI outputs. Artifacts expire after 7 days. No trace, video, profile, raw logs, extra screenshots or source documents are allowed. PNG header/identity validation does not replace human pixel inspection.

The sanitized report preserves all automated/manual gate states and explicitly keeps `release_acceptance: false`. Screen-reader behavior, real browser 200% zoom, touch ergonomics, rendered contrast and visual/geography inspection remain manual gates, as do exact remote/CI/deployed revision and existing-route regression checks. A passing workflow is evidence for review, never deployment authorization or manual clearance. Status fields in immutable release metadata describe the original candidate; do not silently rewrite them after testing.

## Targeted local checks

Run `node --test scripts/bitcoin-growth/ci-contract.test.mjs scripts/bitcoin-growth/served-integrity.test.mjs` for portable wrapper/serving contract tests. These use synthetic PNG headers and do not constitute browser/render acceptance. The CI wrapper is intentionally restricted to the exact GitHub context; do not fake its context locally or disable a sandbox to force execution. The native runner has not been executed in this author stage.

The existing Vite public-directory copy convention is the intended later integration. After all manual gates, the sole release owner should verify the six resulting `dist/bitcoin-growth/` file hashes, existing-route regressions, exact pushed commit and deployed revision. This candidate does not run the full repository build or mutate its deployment workflow.

Pinned official workflow action sources: [checkout v4.2.2](https://github.com/actions/checkout/releases/tag/v4.2.2), [setup-node v4.4.0](https://github.com/actions/setup-node/releases/tag/v4.4.0), [upload-artifact v4.6.2](https://github.com/actions/upload-artifact/releases/tag/v4.6.2).
