# Bounded atlas field guide

The atlas Help launcher now opens a 13-step field guide for existing atlas controls. It replaces the former five-step Help dialog. The guide is a central reading dialog, with no anchored spotlight or automatic navigation.

## Interaction contract

- Back and Next change only the reading note. Finish explicitly records completion; closing the last note does not.
- Close, Escape and Pause to try this preserve the current step as paused and return focus to the connected visible invoker, or the Help launcher if the invoker has disappeared.
- Skip records a skipped state. Restart returns to the first note. Reopening Help retains the current step.
- The native dialog has a named heading and description, focuses the heading, contains Tab/Shift+Tab, and prevents its keys from reaching atlas camera or narration shortcuts.
- A target selector is checked only to describe whether a section is uniquely visible, absent or ambiguous. Missing or ambiguous targets remain reading notes. No arbitrary substitute element is chosen.
- Opening or advancing the guide never moves the map, scrolls or focuses a target, changes filters, selects evidence, opens links, starts speech or writes Casebook research. The user pauses the guide to operate page controls themselves.
- Narration retains its separate manual controls with explicit Pause narration and Resume narration names. The guide adds no animation, travel or audio.

## Progress isolation

The atlas guide uses the versioned key `fieldwork-guide:v2:atlas-source-reading-v2` and the shape `{ version: 2, step, status }`. Its 13 steps use indexes 0–12; status is `active`, `paused`, `skipped` or `completed`. Invalid or inaccessible storage falls back safely. Failed writes show a warning while retaining the state in the current tab. Reloading an active step yields paused progress.

This key is independent of the existing Casebook, the old atlas tutorial key and the preserved original application's tutorial storage. Existing evidence objects, original routes and full-registry loading guards are unchanged by this integration.

## Integration provenance

The four files in `src/guidance/` began as exact copies of the approved atlas guidance manifest. A bounded mobile CSS repair subsequently keeps the existing Help launcher visible and touch-accessible after the first browser run exposed the legacy hidden-button rule. A later visual check found the global dark-theme hover rule washing out the paper guide button text; a more-specific guide-only color rule fixes it, with actual browser contrast checks. The guide model and renderer are unchanged. `src/App.tsx` received only its minimal integration patch, after verifying its base SHA-256:

`7ea36d506979ac781d6b74c9e4860a640b0c001fd59cb3b5e200e85baf0737e8`

The resulting App SHA-256 is:

`c5f56d85ec25178e9bd933948727d3b75687f81bdbe1ad7a68a891117eb1d8c7`

## Validation and limits

Run `node --test scripts/guidance.test.mjs` for the 13 portable Node/server-rendering tests. They cover the 13-step catalog, transition boundaries and explicit completion, Skip/Restart, corrupt or blocked storage, Casebook/progress isolation, target classification, keyboard focus-index behavior, focus-return fallback, dialog attributes and controls, the no-camera/audio/research-mutation integration boundary, and the mobile launcher CSS contract. Bundles are generated in unique temporary directories and cleaned up; imports resolve from this repository rather than a staging workspace.

Run `npm test`, strict TypeScript, and both default and `VITE_HISTORICAL_REVIEW=true` production builds on the final combined candidate. The browser harness must verify actual native modal behavior, Tab/Shift+Tab/Escape, focus return, conditional targets, reload/denied-storage behavior, visual overlap and all 13 atlas notes on the exact review build. Node/server-rendering tests do not establish these browser results, screen-reader behavior or visual acceptance.

This integration covers the atlas only. The 59 original-route guides and three static-page guides remain separate runtime-pending work. It does not claim all-page tutorial completion, alter the historical review reader, or admit any historical research into the factual graph.
