# Field guide and source-bound tutorials

## What ships

The tutorial layer is opt-in. Ordinary first visits, existing deep links, saved research and browser history do not trigger an onboarding modal. Help offers:

- A contextual guide for the current page, or the shared map/workspace and the full dossier when both are available.
- A searchable index of every retained route, all 52 page modules (including nested and superseded modules), and the three connected static workbenches.
- A five-step cross-page introduction: board → identity search → casefile → evidence method.
- A seven-step Fairfax / IDBI evidence exercise with source links, exact retained locators and optional knowledge checks.
- Pause via Close or Escape, Skip tour, Back, Next, Finish, Replay and Resume.
- An explicit “Try this control” action that pauses the modal, focuses the related control and leaves the research editable.

The help index describes controls actually retained in the code. It never fabricates a live alert subscription, a new transaction edge, a completed deal or a model’s forecasting accuracy.

## React integration

Import `TutorialProvider` and `TutorialLauncher` from `src/tutorial`.

Place the provider **inside HashRouter**, around the routes. Put a launcher in the Layout header. The mounted header launcher suppresses the optional floating fallback automatically. A caller can also set `floatingLauncher={false}`.

The `useTutorial()` hook exposes `openHelp`, `startTour`, `startPageGuide`, `close` and `progress`. `startTour(id, true)` restarts; omission resumes an unfinished guide. The provider owns its native dialog and CSS, so individual pages do not need invasive tutorial markup.

Stable board hooks are `data-tour="board"`, `board-search`, `board-sources`, `board-tools` and `board-nav`. Existing page selectors are optional progressive enhancements: if a target is absent, hidden, lazy-loading or outside the current scope, the guide still reads normally. No step waits indefinitely or invents a target. The highlight is removed on dismissal.

`src/tutorial/catalog.json` is the editorial content source. `catalog.ts` adds the shared workspace and cross-page tour. `model.ts` owns tested matching, destination, search and persistence rules.

### Route coverage and legacy modules

The pre-redesign app has 60 explicit route patterns. The guide catalog has 60 entries including the new `/board`; the `/investigate` alias shares the overview guide, yielding coverage of 61 route patterns once the board is integrated. The 11 domain dossiers use one retained component but have separate topic guides.

`FundingSearches.tsx` is nested in the funding-investigations analysis section, not an invented standalone route. `AdaniDeepDive.tsx` and `RelianceDeepDive.tsx` are superseded modules; the active group guide covers their data-driven replacement, `GroupDeepDive.tsx`. Company and group example destinations use existing IDs, not guessed IDs from filenames.

### Storage and safe resumption

React uses `fieldwork-tutorial:v1`. Each known tour stores a bounded step, status, update time and (for a page guide) its internal destination. Parsing discards malformed values and unknown tour IDs, clamps steps and converts a previously active guide into a paused guide. It never auto-opens after a reload. Routes beginning with `//` cannot be restored from storage.

Static workbenches use `fieldwork-static-tutorial:v1`. Tutorial progress is separate from board layout, casebook and watchlist data. Storage errors leave the guide usable and disclose that progress may not survive a reload. No tutorial key contains research notes or personal data.

A cross-page tour remembers its starting URL while open and offers an explicit return there when finished. It navigates only through user-started tutorial actions. It does not modify evidence or casebook contents. Opening a dossier guide preserves that route’s existing query parameters.

## Static workbench integration

The source HTML for global evidence, public assets & finance and media & power includes:

- A `data-tutorial-page` body identifier.
- `src/tutorial.css` and the shared `src/archive.css` theme.
- `src/tutorial.js`, which imports the generated `src/tutorial-content.js`.
- A visible `../#/board` Case board link.

The scripts use their actual Search, filters, Globe, Flat map, Network, Table, inspector, register and research-ledger controls. Ordinary visits stay quiet. Explicit `?help=1` or `?tutorial=<known id>` links are the only entry-triggered open requests. The script does not send network requests or submit forms.

Run `node scripts/tutorial/sync-static.mjs` before copying static sources into a build. Run `node scripts/tutorial/sync-static.mjs --inline-dist` **after all three standalone exporters and before copying their dist folder to the root distribution**. This inlines tutorial data, script, CSS and the new archive theme into the standalone HTML files. `--check` verifies generated data freshness without changing it.

In the IDBI exercise, “Show the retained IDBI case” explicitly resets only the finance form’s reversible filters, searches IDBI, and selects the exact existing record. It reports missing/loading records instead of creating an example or substitute record. Reset returns to the full collection. The tutorial does not claim to independently re-fetch or audit the case’s sources.

## Fairfax / IDBI: factual boundaries

Case: `IN-IDBI-2022` in the retained finance dataset.
Status as of **14 October 2026**; retained research date **15 October 2026**. These are snapshot dates, not an assertion of current transaction status.

1. **Already-reported findings.** This is a worked reading exercise, not a newly discovered conspiracy or accusation.
2. **Approval is not closing.** The selected-buyer approval and Fairfax’s statement that there were “no binding definitive agreements” leave agreement, conditions, closing, title transfer and receipts unestablished.
3. **Two sellers and one scoped price.** The 60.72% scope comprises GoI’s 30.48% and LIC’s 30.24%. INR 52,878.0806181 crore is combined approved consideration, not all government revenue or verified cash received.
4. **Votes are not equity.** The 6 March 2026 proxy’s 41.9% Sixty Two voting rights and 43.3% aggregate Watsa owned/controlled votes are overlapping voting measures. They cannot be added or converted into personal IDBI economic ownership.
5. **Plans are not disbursements.** Expected cash, existing credit and potential asset sales are an attributed forward-looking funding plan. No named acquisition lender, committed amount or drawdown is established. Proposed Digit and IIFL Capital contributions are separate proposals.
6. **Valuation needs a reproducible comparison.** The initial INR 94.42 reserve, later INR 75.99 benchmark and INR 81 winning bid are government-reported figures. The tutorial calls for valuation methods, comparables, adjustments and revision authority before making an undervaluation claim.
7. **Missing steps stay open.** No unverified NGO, venture-capital, resource-project, lender or personal-benefit relationship is added.

The exercise maps to existing claim IDs IN-C01–IN-C06 and sources IN-S01, IN-S02, IN-S03 and IN-S19. Source URLs, dates and locators are copied exactly from the retained finance dataset. Tests fail if these diverge.

## Accessibility and interaction

Both implementations use named native modal dialogs, an explicit Close button, Escape handling and focus restoration. React focuses each new step heading; static help does the same. Background interaction is deliberately paused while the dialog is open. “Try this control” closes the modal before focusing the real page control.

Progress is expressed as text and a named progress element. Source links identify the supporting document and open with `noopener noreferrer`. Knowledge checks are optional radio groups with a legend and live feedback. Every help input has an accessible name. The CSS includes small-screen reflow, visible focus and reduced-motion handling; the highlighted target is not the only way to understand a step.

A hidden/missing target is not described as visible. Help does not intercept global keystrokes outside its dialog, and the page’s existing controls retain their handlers.

## Verification

- `node --test scripts/tutorial/tutorial.test.mjs`: route/module coverage, source and claim mapping, status/denominator boundaries, persistence validation, search, destination scope and integration hooks.
- `node --test scripts/tutorial/static-dom.test.mjs`: all three opt-in entry points, Escape/focus restoration, pause/resume/skip/replay, progress across reload, source-linked exercise, search, storage denial, “Try” focus, missing-case behavior and completion.
- `node --test scripts/tutorial/react-dom.test.mjs`: header/floating launcher coordination, quiet startup, board help, Escape/focus, skip/replay, cross-page navigation, return to origin and retained research inputs.
- `node scripts/tutorial/sync-static.mjs --check`: generated static content freshness.
- `npx tsc --noEmit`: integration typecheck.

The DOM suites use JSDOM and a mocked native dialog API. They do **not** certify browser-native focus containment, actual layout, contrast or screenshot quality. Browser regression coverage belongs to the authorized browser/CI run; no local browser was launched by this tutorial task. Test results and any remaining verification limits should be reported separately from implementation completion.
