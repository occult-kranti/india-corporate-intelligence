# Water and food release verification

Snapshot: 6 October 2026. Branch: `codex/education-funding-intelligence`.
Review the [research scope](RESEARCH.md), [panel ledger](PANEL.md) and source
reviews before interpreting the figures.

## Data and model checks

- Integrity gate passed: 52 sources, 355 observations, 14 discovery routes,
  16 findings/questions, original date classifications and three PDF hashes.
- All 19 behavioral tests passed. They exercise actual TypeScript selectors,
  incompatible geography/units/denominators/accounting stages, invalid dates,
  forecast time zones and expiry, source links and CSV formula escaping.
- Public-source audit independently matched 301 curated observations, 272
  administrative table cells, 140 original survey percentages and 15 city
  programme counts. The food review checked all 50 observation value/unit/period
  triples; the weather review checked all four measurements and 16 source records.
- Independent implementation review passed 142 water assertions. It found and
  verified the fix for place searches leaking topic/publisher text into locality
  results. Education's corresponding fix passed 29 independent assertions.
- The pinned Apache-2.0 MiniLM model ranked 52 public summaries over six queries
  locally on CPU. Artifact verification passed, including rejection of the wrong
  corpus. It does not promote suggestions to evidence or issue safety scores.

## Browser and design checks

The production build passed TypeScript and Vite. Both the education and water
browser workflows passed **three consecutive runs** against this frozen build.
The water workflow verifies:

- Exact publication-window boundaries, undated/background access and expired
  bulletin labels.
- Complete filtered CSV export beyond pagination, with geography, citations,
  original periods, retrieval status, locators and forecast validity.
- Persistent water reading lists isolated from education, including corrupted
  storage recovery and explicit saved-list scope.
- State/subject/stage filters, rendered browser history and an immediate
  state-to-topic submission without losing either value.
- Route-preserving section jumps with heading focus, invalid URL parameters,
  unknown-village empty evidence with retained official discovery routes and
  disabled empty export.
- Narrow layouts at 390 and 320 CSS pixels with provenance expanded.

Independent design review passed 15 interaction checks and visually inspected
320, 390, 768 and 1440 CSS pixel layouts. Local font delivery was verified for all
12 requested family/weight combinations without external font requests. This is
not cross-browser, screen-reader or participant usability certification.

Route smoke passed all 56 URLs across 36 routes and parameterised views. The
graph viewport gate passed 59 assertions, including 945 glyph sample points.

The completed legacy page run recorded **323 passes, seven initial failures and
18 documented skips across 348 cases**. All seven failures passed focused reruns
after mobile spacing/text corrections and route-readiness/selector fixes; adjacent
cases also passed. The entire legacy suite was not rerun after those final
corrections, so this is not a clean full-suite pass. The skips comprise nine EMPTY-build-only
Welfare criteria, six Welfare data gaps, one absent Finance fixture and two
absent Tender fixtures. They are not counted as passes. Shared-shell corrections
and final regression outcomes are recorded in the
[education release verification](../education/VERIFICATION.md).

## Remaining scope

All 36 states/UTs are navigable; only named localities have extracted local
evidence. There is no exhaustive village census, complete five-year local series,
live hazard ingestion, verified water-safety prediction or comprehensive tender
award/payment register. Missing sources remain explicit. The next evidence joins
and acceptance criteria are in [the roadmap](ROADMAP.md).
