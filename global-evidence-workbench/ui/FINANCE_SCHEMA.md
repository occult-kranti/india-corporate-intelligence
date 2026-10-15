# Public assets & finance data contract

Additive static page: `finance.html`; data: `public/data/finance.json`.

## Root

`{meta, cases, entities, relationships, claims, sources, coverage, researchQueue, rejectedJoins, counterhypotheses}`.

All records use stable, namespaced IDs. Sources are referenced by exact IDs; unresolved source or entity references fail validation. Source fields preserve title, URL, publisher, date, access depth, source-family and limitations. Original research payloads remain in the ingestion archive and `original` metadata where used.

## Cases

- `id`, `title`, `countryCode`, `countryCodes[]`, `sectors[]`, `instrument`, `classification`, `summary`
- `stage`: exactly `announced`, `bidding`, `signed`, `closed`, `cancelled`, or `unknown`
- `reportedStatus`: original granular reported status; never replaced with an inferred closing
- `eventDate`, `statusAsOf`: distinguish the event from the date the source supports the status
- `sourceIds[]`, `claimIds[]`, `limitations[]`, `missingJoins[]`
- `parties[]`: `{name, entityId?, role, countryCode?, stakePercent?, note?, sourceIds[]}`
- `authorities[]`: `{name, person?, role, date, note?, sourceIds[]}`. Officeholding is institutional context, never personal attribution.
- `amounts[]`: `{value, currency, unit, type, stage, date?, scope?, note?, sourceIds[]}`. Value can be an exact string or null for unresolved. No conversion or aggregation. Enterprise value, equity price, assumed debt, loan commitment, disbursement and pledges remain different amounts.
- `timeline[]`: `{date, label, stage?, sourceIds[]}`
- `ownership[]`: `{statement, sourceIds[], ...}`; `beneficialOwnershipStatus`; `financingSummary`

A sale, concession, lease, public-private partnership, minority investment, loan, guarantee and charitable pledge must remain distinct instruments. A comparator can be included with explicit classification; it is not reclassified as privatization.

## Relationships

`{id, caseId, sourceEntity, targetEntity, role, statement, date, sourceIds, limitations, claimId?}`.

Endpoints must resolve in `entities[]`: `{id, name, countryCode?, ...}`. Every edge needs sources. No automatic name-only resolution, no inferred financing from ownership, no ultimate-beneficial-owner inference from a parent, and no multi-hop propagation between cases. Roles include buyer, seller, lender, guarantor, shareholder, parent, beneficial_owner, investor, fund_manager, concessionaire, grantor, recipient and institutional_authority; additional source-specific role labels remain intact.

## Coverage

`{countryCode, status, scope, gaps[], sourceIds?}`. `selected_cases` never means comprehensive. The 249-country/territory selector exposes unresearched states when a reviewed coverage record is missing. A covered counterparty jurisdiction does not imply a country-wide research review. Regions and country names are navigation labels, not recognition claims.

Globe points are explicitly schematic country reference coordinates for orientation, not sourced asset, event or personal locations. Unsupported countries and individual relationship records remain unplaced. The accessible register exposes everything independent of geographic placement.

## Review boundary

`financeValidation` is a structural integrity check, not an independent historical-source audit. Research packets and source-scope limitations must be reviewed before importing. Test fixtures are fictional and stay in tests. Production payloads contain only research records.
