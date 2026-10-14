# Follow the money: implementation review

Scope: the dedicated `/follow-the-money` route. Design engineering review by an AI assistant; this is not a user study or a human editorial sign-off. The root agent coordinates independent model-agent review of the frozen production artifact.

## Direction and invariants

The primary artifact is a sourced investigation, not a pooled money total. The first view opens a real research case alongside selectable current India boundaries and the casefile index. A warm document accent marks the selected case geography; map filter selection is separate. The source-backed brief names financial stages before the reader follows individual relationship steps.

Existing routes retain their shared Workspace. New URL state uses `ftm_*`; existing URL parameters, local notes and saved casebook formats are retained. The map's new optional highlight and index-label props leave existing map behavior unchanged.

## Confirmed changes

- Dedicated route and rail/full-navigation entry; no dossier toggle required to see the new work.
- Searchable case index, state selection and explicit national context; map shades are global retained counts, with declared selected-case geography outlined independently.
- Dated, typed trail steps keep awards, commitments, ownership, allegations and judgments distinct. Currency, unit, stage, period and evidence tier remain visible.
- Exact edge and record inspection supplies its own source-closed graph context, including when an old URL also carries a selected node. Entity inspection explores retained cross-register links.
- Source inspection preserves publisher, locator, publication/retrieval dates and limitations. Citation wording includes mirrors without presenting them as originals.
- Responses, alternative explanations, closure tests and held-response records remain inspectable. Source-closed casebook JSON and Markdown preserve responses; the narrower relationship CSV is explicitly described.
- Evidence discovery follows the selected state plus national context and field. Official NSE securities remain a global listing with no invented geography or name-only joins. Exact ISIN matching is distinguished from reviewed case coverage.
- Shared local casebook, source-closed case export, native history, recoverable unknown IDs, meaningful empty states and reduced-motion behavior.

## React review

The route is lazily imported. Source indexes use maps; expensive graph highlights, case closure, scoped discovery and exact entity connections are memoized. The held appendix defers its large response list until opened. No dependency was added. The existing casebook's versioned storage and event subscription remain unchanged.

## Executed checks before final artifact

- TypeScript `npx tsc --noEmit` passed after the final graph-context correction.
- Actual Chromium desktop and mobile render inspection: 1440 and 390 CSS px; no horizontal document overflow observed. Mobile places the map before the full case brief.
- Independent model-agent interim task review exercised geographic selection, the Khyati record, typed money step, source and later procedural response, native history, reload, JSON/Markdown closure, verified/unmatched ISIN discovery, and mobile keyboard navigation. Final independent review is owned by the root agent.
- The new browser harness independently checks scoped discovery counts, outside-case edge/record and stale-node graph context, source/response export closure, persisted notes, empty and unavailable states, keyboard geometry, and 320/390/768 reflow.

Final frozen production check passed: `INVESTIGATION_DIST=dist-deep-release npm run test:deep-investigation:browser` — **37 assertions**, no browser runtime exceptions. The production bundle entry is `index-DP0q_fdz.js`. Screenshots are retained at `/tmp/follow-the-money-review` (1440, 768, 390 and 320 px); stdout is `/tmp/follow-money-browser-release.log`. Checks cover source and response closure, persisted notes, exact-ISIN matching, native history, outside-case graph context, stale-node URL precedence, keyboard map selection, reflow, and reduced motion. The reduced-motion assertion respects the application’s existing 0.01 ms `!important` safeguard rather than requiring literal zero duration. A Playwright exact `getByLabel` lookup did not match a populated wrapped textarea after reload even though its accessible textbox name and stored value were correct; the harness now queries the actual textbox role and name.

## Limits

No screen-reader or cross-browser certification is claimed. The case sample is purposive. Security-list coverage is not research completion. The map does not invent project coordinates from headquarters or other associations. Diagram layout and connectivity do not prove influence or wrongdoing.
