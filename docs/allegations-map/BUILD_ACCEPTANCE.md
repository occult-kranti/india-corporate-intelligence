# Flat map and allegations build acceptance

The implementation was reviewed in two panel rounds without using skills. The branch remains `codex/education-funding-intelligence`.

## Accepted scope

- Dedicated `/allegations` page with a geographic map, highlighted exact relationships, a clearly schematic network inset, searchable record index and linked network view.
- Shared flat map and richer evidence readers across the sector workspaces and money trails. No 3D renderer, pitch control, terrain or extrusion layer remains in the map engine.
- Five newly reviewed case files: Lifeline hospital billing, Haridwar scholarship routing, SRMF property authority, PACL recovery and Chapwa toll-contract proceedings.
- The new index contains **23 entries: five case files, two outcome records and 16 separately counted alleged links**. Its evidence closure contains **53 identities, 61 relationships, 18 records and 15 sources**. These are different populations, not 23 proven incidents or 61 payments.
- The complete registry contains 2,275 entities, 4,003 relationships, 5,468 records, 3,253 sources and 316 held items. Inherited claims are not represented as newly investigated or necessarily current.
- The unsupported legacy Waaree donation arrow is held; its exact saved record remains discoverable as a withdrawal/correction. The cited top-ten annexure cannot establish that the donation did not occur.

## Immutable build

`dist-allegations-release` is retained locally as the reviewed production artifact. It is not tracked as source. Its index SHA-256 is `dbef3c193404b34586ecce5f9523b95afd8b2bfb7589a8ff3efc4c002b1bc5d7`. The 243-file manifest and real-service map receipts are retained in [geographic-engine](./geographic-engine/README.md).

Compiled source-map contents for the page, linked-map composition, geographic renderer and shared case classifier were checked against the frozen working files. The build includes the final outcome classification and the search action that reopens the record index.

## Verification

- TypeScript and production build passed.
- New page browser acceptance: **43 checks**, including exact record/neighbor/history selection, linked responses in exports, direct unplaced-record search, withdrawn-claim discovery, map/network switching and 768/390/320px readers.
- Independent evidence review: **81 development checks and 32 immutable-build checks**, with zero runtime exceptions or failed local assets. See [challenge review](./CHALLENGE_REVIEW.md).
- Flat map: **26 browser checks**, **21 Places checks**, and **four geometry/style tests**. Real public-campus capture reached zoom 15.5 at pitch zero with six successful vector-tile responses. The precise site source remains accessible.
- Source validation verifies both new research slices, source manifests, original identity endpoints, response closure and the withdrawn-claim correction.
- All **20 retained data/model gates** passed: 192 Node tests, 44 Python tests and 42 additional public-works controls. No generated baseline was refreshed. See [retained data acceptance](./RETAINED_ACCEPTANCE.md).
- An actual offline MiniLM run processed 359 summaries with eight discovery queries; its separate artifact and execution receipt are in `research/allegations-map`. Model results do not create payment or wrongdoing assertions.

All nine retained browser suites passed on the same immutable build. The shared investigation suite passed 762 assertions across 12 scenarios; the graph, workspace, procurement and deep-investigation suites passed 15, 54, 31 and 37 checks. Education, water, 77 public-works checks and three sector histories with five rapid Back/Forward/reset cycles also passed. The dedicated-route test metadata was updated for `/allegations`; the complete affected suite passed on rerun. Machine-readable receipts are in [acceptance](./acceptance/retained-browsers.json). The [core browser review](./CORE_BROWSER_ACCEPTANCE.md) also passed: 58 network checks, 72 integration checks, 38 independent code-audit checks, 158 route/surface render loads and 60 graph-viewport checks. Deployment and public-byte verification occur after this source snapshot is committed; build acceptance alone is not a claim that the release is already live.

## Deliberate limits

This release adds bounded source-backed cases, not an exhaustive census of corruption, every company, every tender or every institution. Unknown current status remains explicit. State hubs are schematic documentary indexes; only independently sourced public sites receive coordinates. Incomplete or ambiguous geography does not acquire a guessed payment path. The full relationship list remains reachable even when the visual preview is bounded.
