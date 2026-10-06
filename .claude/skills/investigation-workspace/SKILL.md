---
name: investigation-workspace
description: Extend ICIP's geographic investigation workspace, primary-record research slices, relationship graph and reproducible casebook without losing source, identity, geography or legal-stage context.
---

# Source-backed investigation workspace

Read `docs/investigation/ARCHITECTURE.md`, `DATA.md`, `PANEL.md` and the
relevant source research note before changing the shared registry or workspace.

## Research and review

1. Inspect the live original publisher record; a stale search result is not a
   current publication inventory. Retain original bytes or explicit access
   failure, retrieval date, locator, licence/access basis and SHA-256.
2. Record who says what, exact reporting period and procedural/financial stage.
   Do not convert write-off to waiver, approved plan to cash recovery, closure
   filing to acquittal, or audit sample to a population estimate.
3. Preserve the respondent's reply and later final outcome. Keep superseded
   versions recoverable and write a before/after correction ledger.
4. Use a first panel to challenge scope, comparability and identity. Use a second
   independent review against original documents and the actual rendered UI.
   Record findings and corrections, not an unsupported expert-consensus claim.

## Integration

- Namespaced IDs are stable. Legacy claim IDs recur across fleets: include the
  original endpoint/predicate tuple and fleet context when resolving responses.
- A name match alone is not an identity crosswalk. Unresolved edges remain held
  and their counter-evidence remains inspectable.
- Use the current geometry in the `india-map` skill. Do not assign undivided
  historical territories mechanically to current units.
- Geography must state project/programme/institution location, headquarters,
  constituency, other association, national context or unknown. Never invent
  point coordinates from a state label.
- Keep `iw_*` URL context separate from dossier filters and local saved lists.
  Preserve route history, selections and explicit empty filters.
- Bounded graph previews expose their full population and equivalent ledger.
  Analytic, contra, response and superseding edges are inspectable but do not
  expand discovery paths. A path is not evidence of causation or misconduct.
- Casebook exports retain explicit response closure, source and geography
  citations, dates, amount stages, alternatives and falsifiers. Label notes as
  user-entered. Test unavailable identifiers and additive imports.

## Verify

Run investigation validation, selector/graph/casebook tests, typecheck/build,
and browser workflows against the built artifact. Inspect map→identity→edge→
source→casebook and mobile/deep-link/history behavior, plus original dossier
regressions. Validate pinned model/corpus hashes if model output changes.

Open models may prioritize documents or propose reviewed extraction candidates.
Record actual model revision, licence, corpus hash and execution. Do not treat
similarity as evidence or publish an opaque corruption score.

## Procurement source audits

Keep notice listings, notice details, award listings and award details at their
actual grain. Count join multiplicity before materializing cross-stage matches;
internal IDs only join each database’s own listing/detail tables. Preserve raw
amount strings and reject destructive numeric cleaning. Verify date-field
semantics before calling a gap evaluation time. Buyer rate, named-value and
marked-winner concentration cohorts have separate denominators. Mirrors and
converters of one scrape are one lineage, not independent corroboration. Run
`npm run test:procurement` after changing retained inputs or compact audit cards.
