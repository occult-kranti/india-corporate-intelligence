# Follow-the-money release acceptance

Branch: `codex/education-funding-intelligence`. Baseline: `031558e8234463666b703ba3dfc2def06b3718ef`.

The release adds a dedicated `/follow-the-money` atlas while preserving the existing sector routes. It integrates thirteen purposive casefiles, 87 new entity records, 103 new relationships and 71 source records. The official NSE snapshot contains 2,599 securities, 155 exact-ISIN registry matches and 101 held symbol candidates; three securities have explicit reviewed-case identity bridges. These are different coverage measures.

## Frozen production artifact

- Build: `npm run build -- --outDir dist-deep-release` — passed.
- Index SHA-256: `dfe2e8b2fafecb3ed3b23b4d7034e632c0619c05f23e08d87a44218d493d3e8a`.
- Entry JS: `index-DP0q_fdz.js`; SHA-256 `8803d583bd19124c7e658d1f0a40e4e270b89ca7afb3ec733d76e401a4d17aa8`.
- New page assets: `FollowTheMoney-hfNwMoRp.js` and `FollowTheMoney-DQObnE3D.css`.
- Main entry is 11.91 MB uncompressed / 2.70 MB gzip, compared with 11.53 MB uncompressed in the preceding release. The inherited large-bundle warning remains; no claim of a complete loading-performance redesign is made.

## Verification

| Check | Result |
| --- | --- |
| Existing promotion, generation and data validation | Passed |
| Assembly and merge tests | 65 passed |
| Existing investigation graph, casebook and navigation tests | 42 passed |
| Existing procurement invariant suites | Passed: 5 Node tests, 12 attribution/date tests and 12 audit tests |
| New data integrity and official-universe tests | 10 passed |
| New model integrity and guard tests | 4 passed; actual pinned MiniLM inference retained |
| Archive verification | 257 artifacts / 69,712,742 bytes verified |
| Existing map and dossier render smoke | 140 route/surface renders passed, plus keyboard-map check |
| Frozen new-page browser workflow | 37 assertions passed; 320/390/768/1440 layouts and reduced motion |
| Independent model-agent UI/presentation panel | 24 checks across 4 complete scenarios, zero page errors |
| Independent senior technical review | 39 targeted checks, zero page errors |

The [panel report](PANEL.md), [browser log](browser-release.log), [independent receipt](panel-browser/review.json), [technical receipt](panel-browser/technical-review.json), and [data-platform report](DATA_PLATFORM.md) retain the exact scope. These are agent reviews and automated browser tasks, not observed human user research.

A preliminary workflow assertion expected literal zero animation duration; the existing global reduced-motion safeguard uses 0.01 ms. The assertion was corrected to that documented threshold and the complete 37-check suite passed on the unchanged production build. A local smoke launch initially lacked Playwright’s cached browser; it was rerun using the installed `/usr/bin/chromium`. Neither issue was suppressed as a successful test.

## Material corrections before acceptance

The release withdraws the incorrect Aurobindo-to-MNRE Penicillin-G award while preserving its old record as an inspectable correction. It fixes proposed-versus-entered SEC consent language; retains later criminal dismissals and bail orders; avoids a false alleged-payment arrow to Andhra Pradesh purchasers; distinguishes the Byju facility agent from its lenders; fixes current airport direct ownership; separates Hindustan Zinc’s acquisition target from its proposed cash recipient; and preserves currency, accounting stage and reporting perimeter throughout.

UI review corrected geographic search scope, mobile map order, exact graph context for outside-case record/relationship links, stale-node URL precedence and CSV labelling. Relationship CSV is explicitly a ledger; complete casebook JSON and reading briefs retain responses and evidence context.

## Release scope and remaining limits

The corpus is not a census of corruption or a complete investigation of every security, institution, city or village. Indexed extracts and blocked originals remain labelled. Missing transaction records are not zero payments. The open model ranks source summaries only; it supplies no verified allegation, identity join or corruption probability. Original archives and large cached originals are kept out of frontend assets.

CI and deployment now run the new provenance, universe, model and browser gates alongside the existing checks. Public publication and live-byte verification are performed from the committed branch after local acceptance.

## Deployment contract correction

Deployment run `37554719471` stopped before publication because the older browser
harness assumed every registered route used the shared dossier wrapper. The new
atlas intentionally has its own geographic surface. The corrected all-route
loop still tests all 41 routes: the 40 shared routes retain their original
assertions and the atlas positively verifies its marker, absence of a nested
wrapper, 36 current geographic shapes, 37-option selector and overflow. All 37
applicable original dossier routes remain tested. An independent technical
review confirmed that no original route coverage was removed.

The full command `INVESTIGATION_DIST=dist-deep-release npm run
test:investigation:browser` then passed 675 assertions across 12 scenarios,
15 graph checks and 54 workspace checks. See [follow-up log](shared-browser-followup.log)
and [receipt](shared-browser-followup.json). New graph screenshots were copied
to `shared-graph-browser/`; the preceding release's screenshots were preserved.
No production code or build artifact changed for this correction.
