# Qualified source-collection reader

This reader is an independent opt-in narrative surface. It never creates, appends,
normalizes or promotes an `InvestigationRegistry` entity, record, relationship,
source, held row, geographic mark, search result or path. The existing atlas uses
its exact original registry object throughout.

## Integration contract

- Import `sectorReviewRequested(search, enabled, dataset)` from
  `src/sector-reader/adapter.ts`. Only one exact `review=sector-2026-10` value,
  the full dataset and an enabled feature can select the gate. Duplicate review
  or dataset selectors, unknown review values, mixed readers and preview fail
  closed. Unrelated navigation parameters are retained.
- Mount lazy `SectorReaderGate` with `{ base, href }` only after the complete base
  registry passes its existing loader verification. Wrap it with
  `SectorReaderBoundary`, also receiving `{ href }`. Keep the base application
  independently mounted.
- The gate initially loads no projection or panel. A fresh **Open sector reader**
  requests the separate `loadSectorReader` chunk; the panel is requested only
  after verification succeeds. Reopening runs verification again.
- Only `loadSectorReader.ts` imports the raw public projection and separate
  reader-admission manifest. There is no persistent opt-in or status-coercion
  switch.
- `buildSectorReaderOverlay(base, projectionText, admissionText, optIn)` verifies
  exact hashes, validates all structures and references, freezes only new objects,
  and returns an overlay with `graphRegistry === base`. It has no reader registry.
- `registryForSectorSurface(overlay, 'factual' | 'search' | 'paths')` accepts only
  a verified overlay identity and returns the exact base. Unknown surfaces and
  forged overlays fail closed.

## Pins and retained holds

- Original serialized baseline SHA-256:
  `048f89ffd008a498212ff2ac71d4413aef09b138a50ab77f336a23fec4722064`
- Exact reviewed projection SHA-256:
  `83f4f8f016ea0e734095c43c2e1c46b2d1f080747265fef846cccc1f11d85a44`
- Separate reader-admission SHA-256:
  `adb923b208dd07c1c652cd77a9e1b48fd2a0d37a8d5d2f3a84414e57840ab34b`

The projection is copied byte for byte. Its `local-reader-stage` mode and
`awaiting-parent-content-review` statuses remain verbatim provenance. The separate
`sector-2026-10-reader-v1` exact-ID manifest grants reader admission only. It pins
all packet, claim, source and response IDs, source-content hashes, the projection
and baseline hashes, and every financial-context source reference. Unknown statuses,
missing references, extra fields, changed holds or any byte drift fail closed.

Graph/path eligibility and aggregation permission remain false in both layers.
The public module contains no private review receipt, original local acquisition
manifest, private paths, raw PDFs, HTML, OCR or images. External original source
URLs and retained hashes are displayed as metadata, with no asset mirroring or
source-content embedding.

## Reading contract

Every panel is expanded. Each full qualified paraphrase includes dates and their
roles, source locators, all qualifications and unresolved fields, and any monetary
stages. Null dates are displayed as unknown rather than inferred from URLs or
retrieval times. The renderer neither reformats the source timestamps nor calculates
financial totals, ownership products, receipt totals or organizational counts.

Every linked criticism and its response are adjacent inside the relevant claim.
All packet financial notes are shown ahead of the claims with their citations.
All retained source metadata is expanded in each packet's source collection,
including contextual sources not cited by the selected claims. Source-family
dependence remains explicit. HTTP(S) links retain their exact original spelling.
React text rendering escapes content; no raw-HTML rendering is used.

Important retained distinctions include:

- Europe–China: separate March and December dates, deemed-interest overlap,
  unestablished immediate parenthood, no continuous chain inference.
- Welfare: grant approval versus proposal, report bounds versus signing/transfer
  dates, negative predicates, inferred IDA financier-to-payer attribution,
  administrative settlement versus final utilization, different M&E assessments.
- Energy: announcement versus funds-receipt date, commitment/cash/principal/carrying
  value, GM cash versus credit support, unresolved closing date, environmental
  criticism beside agency/court scope-limited responses, 2026 events outside the
  December 2025 snapshot.
- RSS: team members attending, families included in attendance, conflicting event
  dates, no count conversion or national-income sum, and a bounded statement about
  financial records not located in the inspected file.

## Accessibility and interruption

A native labelled modal dialog provides focus containment. Escape or Close returns
focus to the persistent Open button. Collection buttons scroll and focus the target
section without changing the URL. Back/Forward, hash changes, pagehide and persisted
pageshow invalidate the session. Dismissal, verification cancellation, unmount and
prop changes discard late results. Verification failures provide explicit Retry;
chunk/render failures retain the independently mounted base atlas and a base-only
return link.

## Portable verification

Run from the application checkout:

    node --test scripts/sector-reader.test.mjs
    npx tsc --noEmit

The tests reconstruct the baseline through the real loader using shipped public
chunks. They do not depend on a private parent checkout or registry bundle. Coverage
includes exact hashes, source closure, retained holds, negative predicates, adjacent
responses, dates, financial-stage distinctions, text escaping, safe URLs, expanded
SSR output, modal semantics, collection jumps, cancellation, retry, stale results,
navigation invalidation, base immutability and deferred imports.

Node/SSR tests cannot prove browser visual layout or live focus behavior. Browser
render, mobile reflow, all-panel/citation screenshots, focus/navigation and release
verification remain separate integration gates. This module does not launch or
install a local browser, publish, deploy or alter a previous release.

## Browser-test selectors

- Prompt: `data-testid="sector-reader-prompt"`
- Open: `data-testid="sector-reader-open"`
- Dialog: `data-testid="sector-reader-dialog"`, heading `sector-reader-title`
- Claims: `[data-sector-claim]`, exact claim ID in attribute
- Exact paraphrase: `[data-sector-claim-text]`
- Pairs: `[data-sector-pair]`, containing adjacent `[data-sector-criticism]` and
  `[data-sector-response]`
- Financial notes: `[data-sector-financial-context]`
- Complete appendix source cards: `[data-sector-source-collection] [data-sector-source]`
- Collection navigation: `nav[aria-label="Source collections"] button`

Source cards and pairs intentionally repeat beside relevant claim/context text;
count unique IDs or use the appendix selector when asserting source totals.
