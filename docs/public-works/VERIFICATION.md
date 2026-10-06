# Public works release verification

Reviewed on 6 October 2026 against baseline
`2a96ec03403463bc8b8f3ac813f97f0818fc480f` on
`codex/education-funding-intelligence`.

## Frozen candidate

- Research JSON SHA-256: `660eceb0704b45498bce89c2c0931a7bdb39a8d4139ef3b743074399bf25e706`.
- Model corpus SHA-256: `ccb10fe4726698621a94b7c29da3e0a01e0db3edb0bbbc20afd464b4879fba84`.
- Production public-works JS: `PublicWorks-D2YN0Dyo.js`, 339.17 kB / 76.74 kB gzip.
- Environment: Node 24.19, Chromium 151 via `/usr/bin/chromium`; no new npm dependency.

## Completed gates

| Gate | Observed result |
| --- | --- |
| Existing `npm run validate` | PASS; existing declared research warnings remain, no new invariant failure. |
| `npm run validate:public-works` | PASS; all references, geography, amounts/dates, deterministic assembly and five required evidence manifests. 57 unique retained/reused artifact hashes and sizes verified. |
| `npm run test:public-works` | PASS; 31 Node tests (25 data/comparison + 6 graph), then 42 archived-source/accounting/office/date controls. |
| `npm run test:public-works:model` | PASS; final 56-source corpus and six queries match the actual local inference artifact. |
| `npm run build` | PASS; TypeScript and Vite production build. The inherited large-chunk advisory remains. |
| `npm run smoke` | PASS; 67 route variants, including every sector and a Karnataka water view, with no application console/page errors. |
| New production browser workflow | Three consecutive PASS runs, 72 assertions each, against the same frozen build. |
| Existing education browser workflow | PASS; export, saved work, filters/history, section navigation, empty locality and district coverage. |
| Existing water browser workflow | PASS; dates/expiry, provenance CSV, isolated reading lists, filter history, discovery and narrow reflow. |

The 72-check new workflow covers all nine sectors, complete exports beyond visible
pagination, citation metadata, rapid state/search changes, Back/Forward, invalid
links, empty geography, saved-source persistence/focus, legal chronology, manual
comparability, full network/table export, keyboard activation and focused mobile
visibility. Layouts at 320, 390, 768 and 1440px have no document or main overflow.
No page errors were captured. It entered CI/deploy gates only after three green
production runs. The graph's internal scroll preserves readable node labels.

Independent panel reviews additionally checked 16 rendered repeat-work scenarios,
15 security/recruitment interactions, four service case/source/subgraph journeys
and nine corrected geographic views. These specialist-agent reviews and source
qualifications are recorded in the adjacent research and review files.

## Visual review and limits

The lead inspected the final desktop/mobile page and focused network screenshots.
The all-sector graph is a navigational overview; focus and the equivalent table
provide readable source-level investigation. Screenshot artifacts:
[desktop](screenshots/desktop.png), [mobile](screenshots/mobile.png),
[focused graph](screenshots/network-desktop.png),
[mobile graph](screenshots/network-mobile.png),
[all-sector graph](screenshots/network-all-sectors.png).

This release does not claim a full rerun of the unrelated legacy page acceptance
and canvas-camera suites, nor a fresh CPPP Arrow scan or live national tender
census. CI retains those existing gates. No production site deployment is part
of this branch publication.

## GitHub Pages deployment follow-up — 6 October 2026

Deployment run `37529332131` passed every configured gate and published source
commit `2c68385` as Pages commit `825b8b46`. The normal public URL served the
exact published index and all four checked application bundles. Education,
water and public works loaded with valid TLS, HTTP 200, expected headings and
no JavaScript or first-party asset errors.

A further live mobile journey (`sector=all&state=KA&networkView=table`) exposed
hidden new-tab annotations escaping the relationship table: the document was
677px wide at a 390px viewport, although its body and main content were 390px.
The absolutely positioned screen-reader spans inherited the body as their
positioning boundary. Adding `position: relative` to `.pw-network-table-wrap`
contains those annotations within the table's existing scroll area.

The added regression failed on the old build, then passed after that single CSS
property changed. The rebuilt production workflow passes 76 checks, including
outer-width containment and preserved local table scrolling at both 390px and
320px. Source data, research claims and model artifacts are unchanged.
