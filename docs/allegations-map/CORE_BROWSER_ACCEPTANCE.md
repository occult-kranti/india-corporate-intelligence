# Frozen-release core browser acceptance

Verified 7 October 2026 against the immutable `dist-allegations-release` build,
served at `http://127.0.0.1:5184`. Its served and on-disk index bytes matched
SHA-256 `dbef3c193404b34586ecce5f9523b95afd8b2bfb7589a8ff3efc4c002b1bc5d7` before the gates; the on-disk hash was unchanged afterward.
The shared data snapshot includes the 72-record case/finding/proceeding feed.
No skill files were opened or applied for this verification task.

All five gates ran sequentially with `PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium`.
Application files were not edited. The network browser harness was made to honor
`ATLAS_ARTIFACTS`, preserving its default while directing fresh screenshots away
from historical tracked images.

| Gate | Result | Measured population |
| --- | --- | --- |
| Exact network/reader/export workflow | Passed | 58 checks; no runtime errors |
| Route, timeline and scope integration | Passed | 72 checks |
| Independent shared-data/UI audit | Passed | 38 checks |
| Full route smoke | Passed | 158 loads: 79 routes on map and dossier surfaces, plus map keyboard check |
| Graph viewport and interaction | Passed | 60 checks, including glyph hit-testing, keyboard movement and camera behavior |

Counts have different units and are not added into a single acceptance score.
No test failure or application correction was required in this sequence.

Artifacts, logs and hash receipt are under `/tmp/allegations-core-browser/`:
`network.log`, `integration.log`, `code-audit.log`, `smoke.log`, `viewport.log`
and `receipt.json`. Screenshots use its `network/`, `integration/` and
`code-audit/` subdirectories. The saved mobile reader was visually checked:
exact identity, geographic qualification, citation and connected identities
remain readable without horizontal clipping.

This record covers the frozen local build. The new dedicated allegations-page,
independent source challenge, retained-dossier workflow, street-map acceptance
and eventual public deployment checks are separate owner-run gates; no result
for those is inferred here.
