# Independent technical review of the Public Record Atlas

Reviewed by a separate code-audit agent on 7 October 2026 UTC. This is an AI technical review, not an external human audit. Scope: changed React composition, registry filters, network/record selection, geographic context and release checks. The initial pass used current source and loaded the actual registry; it did not rebuild the app while implementation was underway.

## Findings sent to the implementation lead

### 1. Explicit sector overlays survived actions labelled as broadening scope

**Severity:** medium. **Initial references:** `src/components/investigation/Workspace.tsx:70`, `:225`, `:316`, `:351`.

`iw_domains` has precedence over `iw_scope`. Selecting an Energy overlay on the homepage, then choosing All topics, submitting a global search, or clicking Broaden the view, retained `iw_domains=energy`. The interface said the scope was broad while the actual registry remained restricted. The lead has reported fixing all three actions to clear explicit overlays and adding a Selected sectors option to the scope control. Source reinspection confirms the three actions now clear overlays and the control names the explicit overlay. The frozen-build browser audit passed all three broadening transitions.

### 2. Atlas case/network filters and the shared evidence filters searched different evidence

**Severity:** high for investigation completeness. **Initial references:** `src/data/atlasInvestigation.ts:22–32`, `:53–59`, `:74–77`; shared implementation in `src/data/investigation.ts:210–242`.

The new atlas matcher searched only the record/relationship's own ID, title, label and summary. Shared search also searched exact endpoint names and source titles. Thus one submitted query could leave the evidence ledger and case/network panels showing inconsistent populations. This matters because it could omit exculpatory records as well as allegations.

Actual-registry reproduction on the source snapshot during review:

| Filters | Shared eligible cases | Atlas cases | Example omitted from atlas |
| --- | ---: | ---: | --- |
| `q=Adani` | 11 | 4 | Adicorp and Milestone/Rehvar SEBI outcomes; Mangaluru airport concession |
| `q=CAG` | 27 | 26 | Chhattisgarh pension effective-date audit finding |
| Karnataka, associations, no national context | 3 | 1 | Mangaluru concession; Akshaya Patra meals/related parties |
| Tamil Nadu, associations, no national context | 3 | 0 | Housing-name replacement, Byju's loan/escrow, Tuticorin concession |

For `q=Adani`, shared relationships numbered 273, while the advanced atlas network retained 220. The state discrepancy arose because the shared matcher retained explicitly labelled entity associations, while the atlas matcher accepted only geography on the row itself. Counts above are snapshot observations and may change with new research; they are not intended as invariant release totals.

**Correction inspected:** `src/data/investigationFilters.ts` now provides one registry-aware matcher for the shared view and atlas selectors. It includes exact endpoint/source-title search and consistent geographic modes. The case feed now labels entity-association placement. Independent execution against the five-namespace frozen source passed exact case-ID and edge-ID equality for Adani, CAG, World Bank, Karnataka/Tamil Nadu association views, international finance and defence trade. The corrected Adani search retained 11 cases and 273 relationships at this snapshot. The final browser run also confirmed the rendered Adani case count matches that shared population.

### 3. Dedicated case index retained a separate state-matching rule

**Severity:** medium. **Reference:** `src/pages/FollowTheMoney.tsx:116`.

The dedicated page still filtered its left reviewed-case index using only each case's own state geography plus national context. Its map, case feed and discovery use the shared association-aware matcher. This can exclude a case from the index while the same selected-state feed retains it through an exact entity association. The lead changed the index to use `createInvestigationMatcher(registry, atlasFilters)`. Source reinspection confirms the correction. The independent browser script passed exact rendered index-ID comparison against shared state matches for Tamil Nadu and Karnataka, including the association-only Byju’s record in the Tamil Nadu index.

## Source checks without a finding

- Direction-aware traversal retains original arrows; identity crosswalks are symmetric navigation rather than monetary flow. Amount-bearing filtering does not manufacture cash stages.
- Evidence closure recursively includes explicitly linked responses beyond an active event-date filter. Export does not silently drop those responses.
- Country-context records have explicit country codes and are not inserted into Indian state coverage or plotted at invented foreign points.
- The online places map uses OpenStreetMap/OpenFreeMap and explains its provenance, present-day basemap, approximate render heights and distinction between a searched place and research evidence. It preserves a local 2D fallback.
- Only sourced public research locations become research markers; generic mapped footprints do not imply ownership, occupancy, payments or misconduct.

## Final-build verification

Passed **38 independent checks** against the frozen `dist-atlas-verified` production build, with zero runtime exceptions. The browser run used Chromium and reduced motion at 1440px desktop and 390px mobile widths.

Verified:

- Exact case and relationship population parity for seven meaningful search/sector/geography combinations.
- Explicit sector overlays clear on All topics, global search and Broaden the view.
- The rendered Adani case population agrees with shared search, including outcomes.
- Desktop and mobile map record readers receive focus; Escape dismisses the reader and restores its triggering case title.
- International finance and defence-trade routes render reviewed cases and correct country-context counts without invented coordinates.
- Tamil Nadu and Karnataka case indexes agree with shared matching, including the association-only Byju’s record in Tamil Nadu.
- No horizontal overflow in the checked routes and mobile reader flow.

The first two audit attempts exposed test synchronization mistakes: inspecting the old DOM immediately after scope/navigation changes. The harness now waits for the updated notice/state selection before asserting. These were corrected in the audit script; no product fix was needed for those timing failures.

The places/WebGL worker, live map services, search and offline fallback are covered by the separate spatial/places suites. This review does not claim to have independently exercised those network-dependent flows. It does not establish completeness of investigations, nationwide village coverage, or the truth of every source assertion.

Reproduce:

```sh
INVESTIGATION_DIST=dist-atlas-verified PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium node scripts/atlas-expansion/code-audit.mjs
```

Structured acceptance and source-parity receipts are retained beside this report. The checked build's index SHA-256 is `8f0a4455e9368495c5b860a4207af8087ecfda2eae8bc98354f6ec97f562e6d9`.
