# Media & power data contract

`public/data/media.json` is a curated combination of two independently researched packets. `scripts/assemble-media.mjs` requires both `media` and `musk-thiel`, fails on duplicate IDs or unresolved references, and never joins entities by name.

## Core arrays

- `entities`: exact `id`, `name`, `type`, source-resolved `country` (ISO2 or null), `sector` string/array, `summary`, `source_ids`; optional aliases, registry IDs, identity resolution/provisional flags and explicit location
- `edges`: exact `id`, `from`, `to`, typed `type`, source-native `status`, explicit `date` (`YYYY`, `YYYY-MM`, `YYYY-MM-DD`, or null), `summary`, `source_ids`; optional claim IDs, case ID and bounded figures
- `sources`: `id`, `title`, verified original/custodian URL, publisher, publication date, source locator and actual review/access depth
- `claims`: assertions with source IDs and claim-specific limitations; join to edge through `claim_ids`, `edge_id` or `edge_ids`
- `cases`: contextual transaction packages, each with independent amounts/stages, source IDs and limitations
- `gaps`: explicit topic/detail, open questions and source references where applicable

No synthetic entity or relation belongs in this payload. Fictional fixtures occur only in test source.

## Dates and status

A closed historical acquisition is not automatically a current holding. Source-native statuses stay visible. Date filters select source event/snapshot dates, not ownership as-of reconstruction. `valid_from`, `valid_to`, `date_basis`, and `observation_date` preserve role intervals and retrieval-time snapshots. Incomplete dates match overlapping date-filter intervals. Undated entries are included only when the checkbox allows them in a date-filtered view.

## Location

`location` must have finite lat/lon, an explicit `basis` of `headquarters`, `jurisdiction` or `domicile`, and a human-readable label. Source IDs support the HQ or jurisdiction assertion; coordinates are approximate orientation points. Absent evidence means unmapped. People are not assigned inferred private locations. Geography never creates relationship edges or a map of operating/electoral influence.

## Measures

- `ownership_pct` is labeled by the source meaning. Beneficial ownership may include exercisable options or other deemed holdings and is not automatically economic equity.
- `voting_pct`, `voting_basis`, `voting_pct_upper_bound`, class-specific shares/percentages, denominators, qualifiers and collective-group measures stay separate.
- `amount` retains original currency, unit and `amount_stage`. A per-share price is not a total transaction price. A funding ceiling, consideration, contract value, receipt and cash payment differ.
- `round_amount` / `round_total_usd` are entire-round amounts, never an investor allocation.
- `dedup_group` identifies non-additive accounting entries. An in-kind receipt and memorandum attribution can describe the same item. No sums or currency conversions are computed.
- Case amounts retain calculation notes, components and aggregation warnings; separate stages cannot be summed.

## Security and provenance boundary

All data-derived HTML is escaped; source links allow only HTTP/HTTPS and use `noopener noreferrer`. Raw acquired originals and local paths are excluded. Source review-depth labels distinguish selected text, retained originals and broader review; a source link does not claim exhaustive review. There is no analytics, account login, third-party map tile request, graph inference service or runtime network dependency in the offline file.
