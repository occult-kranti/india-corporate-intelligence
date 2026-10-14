# Procurement trail interface review

Date: 6 October 2026. This records agent-led design and verification, not human user research.

## First panel: close the inspection gap

The supplied publication at `https://tender.sarthaksidhant.com/` belongs to the source lineage of the already retained Hugging Face award data. It is not an independent corroborating source. The previous national tender dossier already exposed rates, quality, concentration, verification and SQL provenance, but its concentration rows offered no inspection action. Public Works exposed 156 reviewed buyer aggregates, which likewise could not enter the shared evidence inspector or casebook.

The accepted addition uses the existing workspace rather than another route. An exact `(portal, buyer)` key opens its namespaced `procurement-trails` record. The current pathname, ordinary dossier filters and research context are retained. Only the displayed surface and conflicting artifact selection change. The 156 reviewed cohorts remain an explicitly selected subset; the other national concentration rows remain accessible without an inferred identity link.

The inspector separates bid-count eligibility from the named/plausible-value family and its marked-label subset. HHI appears with its actual marked denominator and coverage, including an explicit warning below 50 marked awards. Award values are not described as payments. Notice, asset, payment and completion gaps remain visible. Supplier strings stay unresolved labels; no automatic corporate or political edges are created.

Casebook pins retain the source-backed summary and important cohort figures. An explicitly labelled full-trail JSON export also preserves lazy supplier details, source chain, populations, accounting stages and missing evidence. The component offers a separate label CSV with the same interpretive boundaries.

## Second panel: targeted review and corrections

- The graph reviewer confirmed the HHI subset display and the source-backed NHAI → Gujarat Package 7 → IRB wording. This guided trail is explicitly independent of any CPPP row match and contains no procurement payment record.
- The independent development integration review passed 13 checks with zero browser exceptions (`guided-trail-review.mjs` and `.json` in this directory): 43/101 marked coverage, missing payment/completion, exact graph identifiers, award/reporting dates, old-path clearing and the preserved-state outside-filter notice.
- The advisor and graph reviewer identified that an earlier active path could remain highlighted after opening the guided project trail. The action now clears path endpoints, selected path, traversal direction and a previous table view while preserving geographic, date and evidence filters. The browser regression first establishes a valid unrelated path.
- Returning from a selected cohort to the same dossier could previously lose its native buyer filters. Same-path dossier navigation now retains these keys; explicit target parameters still take precedence. Cross-route dossier behavior is unchanged.
- Supporting provenance, supplier labels and follow-up records use disclosure sections. The two populations, marked denominator and observed/missing stages remain visible. The 390px screenshot was inspected for readable controls and complete stage labels; both 390px and 320px passed overflow and keyboard-return checks.
- Corpus-level notice/award findings have a separate namespace and entry. They must never inherit the selected buyer's denominator or imply a buyer-specific finding. Their source records, exact queries and limitations are inspected through the normal evidence interface.
- The completed raw audit identified a stored-date meaning problem in bounded matched subsets. The Timing, short-gap indicator, family labels and quality label now describe recorded dataset-date differences and retain the original numbers. They do not call the result evaluation speed. Exact subset sizes and the separate fallback variant live in the linked `procurement-audit:record:closing-field-semantics` record. The producer separately corrected explanatory metadata without recomputing quantities or changing the original calculation date.

## Verification boundary

Initial development acceptance passed **26 checks**, with zero uncaught browser exceptions:

`INVESTIGATION_BASE_URL=http://localhost:5173 node scripts/investigation/procurement-trail-browser.mjs`

Checks cover exact selection and lazy joins, preservation of native and workspace query parameters, outside-filter inspection, full JSON and casebook provenance, unavailable concentration, small marked subsets, source-return behavior, reload/history, clearing unrelated path selection and mobile inspector focus/overflow. The harness uses an owned static server over `dist` by default; `INVESTIGATION_DIST` selects an isolated completed production artifact. Final source-audit integration and production acceptance are recorded separately when complete.

After the completed nine-record source audit and date-field correction landed, the same development workflow passed **29 checks**, with zero uncaught browser exceptions. Added checks require the full-trail packet to retain separately scoped corpus findings and source metadata, preserve the historical timing numerator while correcting its meaning, and open the exact semantic finding without losing native Tenders parameters. This is development acceptance, not a claim about a later production build.

## Final production acceptance and visual correction

The first isolated production candidate, `dist-procurement` (`index-Drc0P6Ym.js`, index SHA-256 `3534a5ed0ab199fa7c56cc0e1c9139638e44aab31173477acf6822676e03e045`), passed the then-current **29 checks three consecutive times** with no browser exceptions. A subsequent actual desktop review found a real defect: selecting a corpus finding after scrolling deep inside a cohort preserved the previous inspector offset. The new title was above the visible reading region. That candidate is superseded.

The reading region is now keyed only by the selected artifact or source identity. New selections start at their heading; changes to filters on the same selection preserve the reading position. Two focused regressions cover both behaviors. The separate existing source-return and browser-history checks remain intact.

The final artifact, `dist-procurement-final`, passed **31 checks in three consecutive production runs**, with **zero uncaught browser exceptions** in each run:

```sh
INVESTIGATION_DIST=dist-procurement-final node scripts/investigation/procurement-trail-browser.mjs
```

- Index SHA-256: `929d47431973d293a16795a7dbd2195557cb8574d6c7721e02889b7d8b1a4478`.
- Entry asset: `assets/index-BCw8brm5.js`; SHA-256 `e410c948a6656207d2bab84d2d83363217c8bf0ddfc84309a4c1189200a0dd8c`.
- Harness SHA-256: `e59bfce0630056037093f55d929c838b2e91afdfadee1eff7b9b1e8676ffe74a`.

An ordinary desktop click from a cohort scrolled to 1,960px now opens the corpus finding at scroll position 0. The inspector begins at y301 and the new title appears at y371–423. The final desktop and 320px screenshots were inspected. The mobile accounting stages and unresolved supplier labels remain readable, with no document overflow. The workflow also checks 390px overflow and keyboard focus restoration.

The first attempted final run stopped after 15 checks because activating a date adds “Filters active” to the advanced-filter button's accessible name. The harness now targets the specific toggle control, preserving all behavioral assertions; the full three-run sequence above ran after that test-only correction. No additional production change was required.

The machine-readable receipt is [`ui-production-acceptance.json`](ui-production-acceptance.json). These are tests of a completed local production build, not a claim that the release is already deployed.
