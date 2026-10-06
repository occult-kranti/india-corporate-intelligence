# ICIP design system

Direction: a public-record reading room. Warm ink surfaces and fine rules give the dense evidence room to breathe; brass identifies actions and editorial context. Serif headings introduce documents, sans-serif text explains them, and monospace numerals and dates support comparison.

The existing evidence tier colors, graph encodings and data semantics remain distinct from the shell's decorative language. No visual density, connection or color establishes wrongdoing. Sources, coverage limits, denials and alternative explanations retain their place.

Shared system:

- `src/index.css`: semantic color tokens, global interaction states, responsive shell and home composition.
- `src/components/Layout.tsx`: grouped, searchable navigation; education under Registers; desktop context; native modal mobile navigation; skip link and page titles.
- `src/components/Editorial.tsx`: editorial title scale, ruled sections, tabular figures and labelled scrolling tables.
- `src/pages/Dashboard.tsx`: orientation, featured education desk, task-based exploration, corporate metrics and evidence census.

Navigation stays compact on desktop and becomes a bounded, independently scrolling modal on small screens. Main remains the page scroll container to preserve graph and register behavior. Tables may scroll locally when two-dimensional comparison requires it. Primary controls remain at least 44px high on mobile; narrow-screen inputs use 16px text. Focus indicators and reduced motion apply across the site.

Panel review is synthetic expert critique, not user research. Acceptance checks are build and existing route/page gates, viewport inspection at 320–1440px, mobile menu reachability, keyboard/Escape/focus behavior, and evidence display preservation. Record the actual verification result in the implementation handoff rather than treating these intentions as certification.

## Observed verification — 6 October 2026

Two synthetic panel rounds were completed: first a code-grounded audit and design decision, then a rendered candidate review. The second round corrected education HashRouter section jumps and two instances of visually hidden source text escaping their scroll container.

Chromium at `/usr/bin/chromium`, against the Vite development server:

- Home and education were inspected at 1440, 768, 390 and 320 CSS pixels; finance and the corporate map at 1440 and 390. Final checked views had no document or main horizontal overflow. Education's school tables retain local horizontal scrolling.
- All 32 primary destinations are present in mobile navigation, including the last link. Page filtering, its empty state, initial modal focus, Escape restoration, route selection and skip-to-content passed. Native dialog keyboard navigation retained background inertness; browser chrome remains reachable as expected.
- All five education section/coverage jumps preserved a state-filtered URL, focused the target heading and kept the outer window at scroll position zero.
- Route titles match the actual lazy-loaded pages. The selected reduced-motion setting removes transitions. No JavaScript page errors occurred in the screenshot/interaction batch.
- Core text tokens measure at least 6.29:1 on the three shared dark surfaces; action brass at least 8.50:1. These token measurements are not a comprehensive contrast audit of every legacy chart.

This is a bounded Chromium visual and keyboard review. Screen-reader use, other browser engines and participant usability research were not performed. Repository build, data and regression gate outcomes are recorded separately by the implementation lead.

## Water and food-security extension

The water register reuses the reading-room frame and introduces a restrained teal domain accent. Geography and evidence filters precede an eight-stage seed-to-distribution index. Source rows retain visible geographic level, publication date, observation period and retrieval date; dated hazards carry validity context. The shared navigation and a compact home entry expose the new register without changing frame widths or graph styling. Water-specific review evidence is recorded in `docs/water/DESIGN_REVIEW.md`.

## Roads and public-works extension

The public-works desk uses a ruled procurement ledger as its main view, with nine
sector lenses. Case files place attribution and the response side by side; the
legal timeline states jurisdiction and applicability beside dates. Sparse typed
subgraphs preserve relationship direction and evidence tiers, with a matching
table and source export. A collapsible two-record checker makes comparability
requirements explicit without fabricating sample contracts. Implementation and
rendered-review findings are recorded in `docs/public-works/PANEL.md` and
`docs/public-works/VERIFICATION.md`.
