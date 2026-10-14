# Water register: design review

Reviewed 6 October 2026 by an independent AI design reviewer. These two panel rounds are expert-style critique, not participant research or an accessibility certification.

## Round 1: composition and evidence boundaries

Accepted a place-first workbench followed by an eight-stage seed-to-distribution index. The stages organize independent documents; their arrows do not trace a shipment or establish causation. The existing reading-room shell, serif document headings, fine rules and restrained teal accent give the water desk continuity with education.

Required distinctions are visible in the interface: publication date versus observed period versus retrieval date; national/state/district/city/village geography; connections versus functioning safe supply; rainfall versus drought declarations; estimates versus awards and payments; production versus market arrivals. Background and imprecisely dated sources are separate from the 6 October 2021–6 October 2026 publication window. Bulletin validity refers to the compiled snapshot and does not imply a live warning service.

## Round 2: rendered candidate

Chromium at `/usr/bin/chromium`, against the Vite development server. Overview and filter views were captured and inspected at 1440×1000, 768×1024, 390×844 and 320×760; source rows were also inspected at desktop and mobile widths. Every checked width had one page h1, the expected document title, and no document or main horizontal overflow. Sources retain their visible geographic level, measurement period and publication-window label. Small-screen form controls reflow into a readable single column.

The panel identified and the UI owner addressed ambiguous select accessible names and stage counts that omitted reading-list filtering. A rapid sequence—select Maharashtra, type `rice`, press Enter—also exposed stale URL-state composition that could drop the state filter. The UI owner repaired that race by composing edits from the current HashRouter URL. Final keyboard confirmation passed after the repair.

Shared integration adds a Registers navigation entry and a compact home link. Frame widths, graph styling and the completed education design are unchanged.

Retained final font-delivery captures: [desktop](screenshots/desktop.png) and [mobile](screenshots/mobile.png). Additional working artifacts: `/tmp/icip-water-design/`. Functional gate and research-validation results are recorded by the implementation lead.

## Confirmed interaction checks

All 15 bounded browser checks passed: state context; keyboard topic submission; stage filtering without losing place/query; visible stage focus; rendered browser Back restoration; an unknown-village empty state with official discovery routes and disabled empty export; explicit all-date/background wording; saved-source filtering; five section/coverage jumps preserving the URL and focusing visible headings without outer-page scroll; mobile navigation reachability and Escape focus restoration. No page JavaScript errors occurred.

The release also self-hosts the existing font families and requested weights to remove an unreliable external stylesheet dependency. Chromium loaded all 12 requested family/weight combinations from local WOFF2 assets, including rupee text, with zero external Google font requests or asset errors. Desktop/mobile captures after that change retained the reviewed composition. Source revisions and OFL licenses are under `public/fonts/`; this changes delivery, not the typeface design.

Machine-readable review result: `/tmp/icip-water-design/report.json`. This pass did not include a screen reader, other browser engines or participant usability testing.
