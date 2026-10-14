# Procurement cohort trails

`src/data/procurementTrails.ts` adapts a compact exact-key projection into inspectable and pinnable investigation records. The scope is the **156 reviewed public-works buyer classifications**, all central buyers in the current retained input. It is not an exhaustive buyer register. The existing national tender tables retain all 1,215 concentration rows.

Regenerate with `node scripts/cppp/build-trails.mjs` after changing retained CPPP metadata or running the public-works assembler. The generator reads `src/data/public-works-research.json` plus the retained rates, concentration and provenance JSON. It records full SHA-256 hashes of these inputs and fails on duplicate buyer keys, missing rate joins, rate disagreement or incompatible snapshots. `node --test scripts/cppp/trails.test.mjs` checks the join and evidence boundaries without rebuilding the site or downloading data.

Each trail ID hashes the exact tuple `[portal, buyer, snapshot, buyerRule]`; the snapshot includes the original computation date and Arrow digest prefixes. No spelling normalization, name similarity or corporate identity inference participates in a join. The stored `reviewedBuyerId` connects to the source classification. The investigation registry namespace is `procurement-trails`, with record IDs `procurement-trails:record:<trail.id>`. Register `PROCUREMENT_TRAIL_SLICE` using the existing raw-slice adapter. The module imports investigation types only, avoiding a runtime registry cycle.

`getProcurementTrailByBuyer(portal, buyer)` finds only reviewed exact keys. `getProcurementTrailForRecord(recordId)` handles registry selections. `procurementTrailHref(id)` supplies a new standalone dossier URL; navigation within an existing dossier must merge its `trail` parameter into the current query so filters, saved-workspace `iw_*` parameters and other selections survive.

The three populations are separate:

- `bidRate.n`: deduplicated awards with reported bids between 1 and 1,000. `singleBidder` and its interval use this denominator.
- `concentration.namedPlausibleAwards`: deduplicated awards with a named winner and value above zero and no greater than ₹10¹², for buyers with at least 50 such awards. `namedPlausibleValueInr` is their reported award-value sum, not a payment total.
- `concentration.markedAwards`: awards whose winner label passes the component-level naming rule. HHIs and top-label shares use this subset. It may have fewer than 50 observations and is not a complete supplier market. `markedSharePct` and `unmarkedShareOfValuePct` expose selection coverage.

There are 133 concentration joins. The remaining 23 trails carry `concentration: null` and an explicit unavailable status. Missing is never rendered as zero. Display the original value/count HHIs together where concentration is discussed; values and marked-name coverage are sensitive to source parsing and selection.

`loadProcurementTrailDetails(id)` loads the existing concentration module only on selection. At most five retained marked labels appear per buyer, each with at least five awards. These strings remain **dataset labels**, including possible joint lists or trading names. They create no graph entities, directors, political links or identity bridges. The compact cohort artifact contains no supplier names.

Trail records have no entity or relationship links and `amounts: []`. The attached source-backed counts do not create transfers or payments in the graph. Missing stages remain visible: notice/corrigenda, stable lot and asset IDs, bills of quantities, measurement books, payment and completion records. Repeated labels are not evidence of repeated physical work or duplicate payment.

Geography is collection context. Central buyers remain national context; any future reviewed state buyer must have an explicit state association. Neither buyer addresses, supplier addresses nor sector labels imply work sites or delivery coverage. Dates remain undated in event filtering: the computed date is retained separately and is not an award, payment or completion date.

Source lineage is the original CPPP portal, Sarthak Sidhant's publication, the conversion recipe linked by the HF card, the observed `rumourscape/tenders` revision, retained Arrow digest prefixes, and local SQL. The recipe joins award listings to award details within the award stage, not notices to awards. The lineage audit is dated 2026-10-06 and does not change the 2026-10-04 computation date or claim a re-run. HF asserts CC-BY-4.0; underlying source licensing remains unresolved. Remotely reported full LFS hashes match the retained byte sizes and SHA-256 prefixes; the absent historical Arrow inputs were not locally rehashed in full. The observed recipe is not proof that its exact version produced those bytes. All 40 stored verification links were unavailable; every trail remains dataset-only.

Saved records and ordinary investigation CSV exports retain the Wilson interval, all three populations, marked coverage, count/value HHIs and the explicitly staged named-family award-value sum in their summaries. Limitations retain the exact snapshot, buyer rule, deduplication and concentration-family definitions, so pinning a trail does not strip its denominators. Generic accounting amounts remain empty.
