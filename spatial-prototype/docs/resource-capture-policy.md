# Scenario 46 evidence capture policy

This is a test-observer change. It does not change renderer code, application data, source qualification, native observation schemas, the resource oracle, or any product control.

## Reason and retained failures

PR15 head `6ea92299d21ac5ab92686b714420d363de08fa99` passed the 36-check native zoom gate, combined review and original CI. Spatial run `38961866373` failed scenario 46's 300-second limit on two attempts. Those failures remain failures. Work continuing after the uncancelled Promise.race deadline cannot count toward acceptance.

Separate diagnostic run `38972793695` used baseline `85702ec5f553415e009a37e89d7333c96c952c66` and candidate `6ea92299d21ac5ab92686b714420d363de08fa99`, identical harness hash `5535e3f8ba1e9136f190b584fa3e9fcd3293cf0749e8e8802608428800ccb7f5`, separate fresh browsers and unchanged runtime/build manifests. Both failed 300 seconds. The synchronous deadline records show 28 baseline and 29 candidate completed cycles, each with five completed native pairs. Later persisted arrays are diagnostic only.

Independent sampling attributed 66.185198 s baseline and 64.856135 s candidate to the union of Playwright snapshot traversal stacks. Probe read/compact projection stacks were 154.356 ms and 150.199 ms. Driver tObject self samples were 33.082910 s and 36.073716 s. Sample attribution across processes is not additive wall time, GPU time, proof of no product regression or a predicted speedup. Driver signed negative deltas were retained (-11 and -5 microseconds total). CPU profiling, runner load and run order are confounders.

## Narrow policy

Only the exact `46-thirty-cycle-native-resource-handle-plateau` scenario disables automatic per-action trace DOM snapshots. All other scenarios retain their original trace options. Screenshots, action timing, console and source collection remain enabled. No native transport serialization was changed.

The pinned installed Playwright 1.62.1 implementation also disables trace HAR recording when snapshots are false. Therefore a separate supported full HAR recorder starts before page creation/navigation, without URL filtering, with attached response bodies. It exports before context teardown on success and failure. Validation checks observed request/response/failure coverage, headers/timings, every body reference and archive integrity. A companion record preserves request identity, redirects, frame URL, clocks, failure events and any WebSocket frames. This HAR is separate network evidence, not equivalent Trace Viewer frame/monotonic linkage.

Nine explicit checkpoint captures follow the existing same-instant native full/compact pairs: warmed baseline; cycles 1, 15 and 30 before and after Close; timing active and closed. Each preserves Chromium DOMSnapshot full document/shadow trees, layout/paint order and a declared computed-style set; per-frame live forms/focus/scroll/CSSOM, full markup/source text and URLs; and viewport pixels. Missing frame coverage and closed author shadow-root live state fail closed. Modal versus nonmodal dialog state is explicit. Checkpoint screenshots keep the existing animation policy; they do not cancel or fast-forward animations. Each file has a byte count/hash, phase, clock range and native sequence/file correlation. DOM, state and screenshot capture are sequential and do not claim atomicity with the native pair. A full failure/final capture is required even when a planned checkpoint is never reached. New CDP/HAR operations and scenario46 terminal native preservation/screenshot/page diagnostics/trace/context teardown have a separate 15-second evidence-operation bound; a stuck export fails and does not block later retention. This does not extend the 300-second scenario budget. Pending HAR entries without an explicit failure outcome fail validation; failed/aborted entries preserve their failure text and available timing.

This deliberately reduces intermediate DOM replay granularity. It cannot recreate every action's pre/post DOM. HTML alone is not described as full replay equivalence. Cross-origin CSSOM access restrictions remain explicit in captured state; source response bytes remain in the HAR. Unexpected out-of-process frame coverage fails rather than silently omitting that frame.

## Unchanged acceptance requirements

- Three disclosed warmups, all 30 measured lifecycle cycles and all 120 input-driven frame opportunities.
- All nine full/compact pairs, all eleven handle kinds and identities, native geographic recovery, lease/boundary checks, retired/poisoned-context and terminal assertions.
- The same 300000 ms scenario deadline and full mandatory suite. A focused diagnostic is never full-suite acceptance.
- Existing screenshots, native final/failure exports, source/focus interaction assertions and artifact size caps.
- Missing or failed checkpoint, HAR or terminal evidence fails the scenario. The synchronous deadline counter snapshot cannot be overwritten by late array mutations. Before accepting completion, a monotonic elapsed check independently enforces 300000 ms even if a delayed timer callback loses the Promise.race.

No browser performance or hardware FPS claim follows from a faster test observer.

## Primary references

- https://playwright.dev/docs/api/class-tracing
- https://github.com/microsoft/playwright/blob/v1.62.1/packages/playwright-core/src/server/trace/recorder/tracing.ts
- https://github.com/microsoft/playwright/blob/v1.62.1/packages/playwright-core/src/server/trace/recorder/snapshotterInjected.ts
- https://chromedevtools.github.io/devtools-protocol/tot/DOMSnapshot/
