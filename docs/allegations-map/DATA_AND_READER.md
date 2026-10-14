# Shared evidence scenes and exact readers

This implementation was completed without opening or applying skills. Data,
research, map rendering and independent source review had separate owners.

## Scene contract

`src/data/mapEvidence.ts` exports `buildMapEvidenceScene`. Its source-backed
state hubs are schematic indexes with stable `state:TN` IDs, never entity GPS.
Coverage records and entity-associated records have separate ID arrays and can
overlap. Unknown event geography stays in the unplaced population even when an
entity's constituency or headquarters permits a schematic association. National,
international and unplaced populations carry uncapped record, entity, relationship
and source IDs; their counts are not incidents, guilt or spending totals.

Only `ATLAS_SITES` supplies public facility coordinates. Each site retains source,
precision and its exact case/entity references. No person can anchor a verified
site. Country context and street-map search results do not create facility pins.

Selected identities, hubs and sites produce exact relationship trails. A geographic
line is drawable only when both endpoints have a single supported placement;
multiple-state or missing endpoints remain explicit in the scene and reader.
Original relationship direction and monetary stage remain unchanged. Schematic
relationship insets are distinct from geographic coordinates.

## Reader behavior

`AtlasEvidencePopover` keeps exact identity, source tier, procedural status,
event-date basis, location qualification, financial stage, primary citation and
material response visible before its secondary tabs. A neighbor preview leads
to all exact connections. Search includes source titles and endpoint names;
pagination never caps the underlying connection population. Evidence, responses
and sources also have searchable pages. Exports retain complete response/source
closure beyond current date filters.

Neighbor clicks change exact selection and highlight callbacks, with a local
back stack and optional return to the place index. Tabs support arrow/Home/End
navigation with one tab stop. Escape/close restore the stable opener or parent
fallback. Mobile defaults to a 52dvh bottom sheet; explicit Expand opens a fuller
reader. Map and network displays can pass a full `evidenceRegistry` while keeping
the visualization's registry scoped to the current view.

## Dedicated allegation population

`getAllegationsView` defaults to the newly researched `allegations-policy` and
`allegations-institutions` namespaces. The release contains five case files, two
outcome records and sixteen separately counted alleged links. These overlap and
are not a census of unique incidents. Respondent replies, financial-stage controls
and neutral recovery administration remain linked context, not extra allegations.

Retained archive mode accepts explicit allegation kinds/tiers, audit findings and
legal outcomes. Ordinary loan, acquisition and arms-contract case files do not
become allegations merely because they are connected. Retained current status is
unknown unless an explicit structured supersession or withdrawal is recorded;
superseded never means blanket merits exoneration. Newly reviewed pending stages
still describe procedure, not proven wrongdoing.

The Waaree donation assertion is held at its exact old relationship identifier;
its saved record ID now opens a withdrawal/correction. The cited ADR analysis
contains selected top-donor tables. It does not establish the alleged payment,
and absence from those tables does not prove that no donation occurred. This is
an editorial source-validation correction, not a judicial finding or issuer denial.
The original publisher PDF is retained outside the publication tree with a hash
receipt. The source is ADR analysis, not an original party contribution ledger.

## Actual local discovery model

The pinned open model `sentence-transformers/all-MiniLM-L6-v2` revision
`1110a243fdf4706b3f48f1d95db1a4f5529b4d41` (Apache-2.0, quantized ONNX uint8 AVX2,
384 dimensions) executed on CPUExecutionProvider over 359 public
researcher-authored source summaries. Inputs comprise seventeen research slices
plus the explicit editorial correction receipt, all exact-hashed. Eight queries
rank reading candidates; no public text was uploaded to a model service. Actual
inference time was 10.736 seconds.

- Corpus SHA-256: `e019a1885f18239b9547b01320b0b64e7a0d3909ac4152595d3fde1a07bb9705`
- Output SHA-256: `1d815a6330c7205ec8a933a0bee53e25b3812a3437bed84886fe57222080b0d3`
- Runtime/source-input receipt: `research/allegations-map/execution-receipt.json`

The prior atlas model and archived runs remain unchanged. This model reads source
summaries and limitations, not every original document. Similarity is not
corroboration, an identity join or a financial fact, and output creates no edges.

## Verification

Meaningful guards cover source holes, absence of entity coordinates, ambiguous
placements, explicit national/international/unplaced populations, empty filters,
all 237 fixture connections across pages, endpoint/source-title search, response
closure beyond date filters, new-vs-retained separation, independent outcomes,
exclusion of ordinary finance cases, and the exact withdrawn Waaree identity.
Strict raw-slice/manifest validation and model citation/hash tests are release
requirements. Root owns final rendered route, keyboard, browser-history, responsive
map and deployed-site verification; those outcomes are recorded separately.
