# Fieldwork: global evidence workbench

Static, dependency-free runtime with source provenance, explicit unknowns and a research ledger. This is a separate additive artifact; no repositories or deployments were overwritten.

## Run

Node 20+: `npm ci`, `npm run dev` (port 4173), `npm run test:all`, `npm run build`, `npm run standalone`.

`dist/` can be served by any static HTTP server. `dist/fieldwork-offline.html` embeds data and code for a network-free local preview. Original-source links still require internet. No paid services, tracking, remote fonts or map services.

## Data and semantics

The integration dataset is copied from `../integration/output/dataset.json` to `public/data/dataset.json`. Recopy and rebuild after a reviewed integration update. All raw record metadata remains in the JSON.

- Globe and flat map show only valid supplied coordinates. City-reference positions are not event coordinates; multi-location and missing-location records stay unplaced. Schematic continental outlines provide orientation only, not political boundaries. No geographic arcs imply a relation.
- Network edges come only from supplied `relations`; endpoint proximity never creates an edge. Each relation becomes an inspectable record with its own sources. Imported, analytic, uncertain and superseded lines are dashed. This is a status cue, not a probability or guilt score.
- “Recorded / observed year” matches explicitly recorded years, including observation years. It does not interpolate intervals or turn an observation/retrieval date into an event onset. The inspector separately preserves unknown start dates and observation dates. Filtering an aggregate does not create an annual subtotal.
- Imported original sources are labeled unverified where applicable. Source-family information prevents a syndication being mistaken for independent reporting. Multiple source records are not a count of independent confirmations.
- Unknown country, status and outcome remain explicit. Allegations, settlements, findings and historical status must be read within each record’s scope. No implied involvement from association.
- Queue, coverage gaps, rejected joins and counterhypotheses remain separate from sourced records. No automated cross-repository joins.

## Verification

26 focused model and JSDOM tests cover integration, views, filters/reset, empty/error states, provenance, relation inspection, unknown dates, coordinate rejection, injected markup/URLs and semantic keyboard controls. JSDOM does not validate pixels, actual screen-reader output or browser rendering. Pixel QA was attempted but blocked by a runtime socket restriction when launching Chromium. No rendered screenshots or pixel-level pass are claimed. Independent reviewer reran model/DOM tests.

## Extension contract

Dataset shape: `{meta,sources,records,relations,researchQueue,rejectedJoins,counterhypotheses,coverageGaps?}`. Record IDs and source IDs must be stable and namespaced. Preserve source URLs, retrieval/access limitations, temporal basis, supported locations and caveats. Never resolve identity by name alone or expose victims, minors or private addresses. Source-backed unknowns are preferable to false precision.

## Round 4 extension, reviewed in Round 5

This release includes bounded-review journalist-case records and document-change accounts. The earlier release is preserved separately. Claim IDs, relation limitations, contrary evidence, acquittal/procedural statuses and attributed before/after accounts remain visible. No document bytes or comparative hashes are fabricated. Independent Round 5 evidence and replay audit passed with the documented limitations.
