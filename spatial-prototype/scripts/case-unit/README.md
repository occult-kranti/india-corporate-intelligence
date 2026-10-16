# Case workspace portable regression suite

Run from `spatial-prototype` with the dependencies in `package-lock.json` installed:

```sh
NODE_OPTIONS=--max-old-space-size=384 node --test --test-reporter=tap --test-concurrency=1 \
  scripts/case-unit/*.test.mjs \
  scripts/case-unit/data-tests/*.test.mjs \
  scripts/case-unit/scene-tests/*.test.mjs \
  scripts/case-unit/host-tests/*.test.mjs
```

These Node tests require no browser, network, package installation, or frozen sibling source tree. Paths are anchored to the test files, so an absolute test-file invocation also works from another current directory. All runtime modules are bundled from this repository's `src`; browser/MapLibre/WebGL boundaries are mocked where explicitly identified.

## Protected content and behavior

- Exact 334,950-byte original normalized transport at `src/case-data/reviewed-transport.json`, SHA-256 `2ca8ae35ef4a02c252e8a1109bb98afd86d7c104b010e90e981a95891a32476c`. It serves as the canonical read-only test input and is forbidden from the runtime reader dependency closure.
- Independent accepted semantic hashes for the full expanded catalog, all original 14 cases and layouts, every new evidence/source/relation envelope, and 348 controller/DOM transitions over 19 cases. Expected hashes are not generated from current runtime output during a test run.
- Exact 19 cases / 72 claims / 91 case-local nodes / 73 authored relation roles / 13 reader-only facts; all jurisdiction/source/date/capacity/non-addition qualifications and graph/admission holds.
- Exhaustive required-field and extra-field rejection, mutation isolation, ordinary-accessor/prototype/cycle defenses, expansion budgets, reviewed compact digest, Unicode/SHA vectors, and semantic mutation rejection.
- Controlled navigation, camera interruption, reduced motion, input disposal, shared-renderer failures, exact geography snapshot restoration, and 30-cycle mock resource accounting.
- Chooser-only rendering, explicit reader/scene loading, one state owner, source-dialog survival/Escape ordering, compact-viewport reader fallback, and low-quality semantic identity.
- Exact accepted source pins and one packed runtime transport with no raw/review/test data or graphics implementation in the complete reader closure.

`fixtures/accepted-pins.json` contains hashes and test actions, not expanded evidence records. `fixtures/accepted-baseline-sizes.json` contains historical comparison measurements. They are review baselines, not values to update automatically after a failure. Test-only encoding is outside runtime.

## Limits

Mock lifecycle tests do not establish real GPU memory, WebGL state, visual layout, accessibility/focus geometry, frame time, or actual network loading. Historical isolated bundle ceilings are not host release-budget acceptance. Real-browser and integrated host-budget gates remain separate.
