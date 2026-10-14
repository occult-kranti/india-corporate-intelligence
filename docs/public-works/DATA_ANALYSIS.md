# Procurement data review and reproducible derivations

The new desk reuses recorded evidence and adds a narrowly defined analysis. It does not claim a new national tender download. The workspace contains the CPPP pipeline's committed output, not its 3.45 GB Arrow inputs.

## Panel round 1: establish the unit before looking for a pattern

- Retained scrape: 4,921,960 rows, 2,923,713 distinct tender ID strings, and 3,385,233 rows after `(tender_id, normalised selected bidder, AOC date)` deduplication. These are alternative data grains, not competing estimates of completed physical assets.
- Some tender IDs are organisation/year buckets: `2018_BHEL_EDN` alone carries 42,339 raw rows and 1,046 distinct bidder labels. Deduplicating to one row per tender ID would discard real distinct decisions. Repeated IDs do not establish repeat work.
- Bid-count analysis includes 3,019,420 post-dedup rows with recorded counts between 1 and 1,000. Nulls, zeros and implausible counts remain outside this denominator. An award notice is not a completion or payment.
- All 40 stored portal URLs in the earlier verification sample had expired. Agreement between the scrape and official records is unknown. The corpus remains `reported`, even though the original scraped pages were government pages.
- Existing aggregate recurrence: 7,777 buyer–marked-winner text pairs with at least five single-bidder awards among 74,940 observed pairs. The related award-count denominator is 200,813; neither denominator is a census of suppliers or sites. No contractor is named by this indicator.
- The curated legacy award register contains 125 sourced awards, but its amounts include public grants, project costs and concession parameters. This extension does not pool them into the CPPP buyer-count analysis. It also does not merge its winner names into the reviewed political/corporate graph.

## What is newly computed

`scripts/public-works/assemble.mjs` classifies existing central-portal buyer aggregate rows using published regular expressions over explicit body labels. The selected rows retain the exact original counts and Wilson intervals. Unknown state department codes, ambiguous acronyms, heavy-water procurement and inland waterways do not become roads or drinking-water records by broad keyword matching.

There are 156 distinct selected buyer rows. Lenses overlap: for example Border Roads Organisation appears in roads and military. The initial label rules select 11 roads, 22 electricity, 8 water, 17 healthcare, 57 education, 10 police, 22 military, 2 recruitment and 9 administration rows. These counts describe selected historical public-body procurement. They do not describe the number of assets, a population of private providers, or comparable sector performance.

The scope of every such buyer row is labelled national context. A public body's name or postal address does not locate every contract it issued. State and locality filters operate on explicit research geography. A village with no retained local evidence receives an empty result and official discovery instructions.

## Repeat-work comparison gate

The interactive checker uses records entered by its user. It does not import fictional example records or pretend to rescan the raw CPPP files. To open a review question it requires distinct contracts with the same exact authority, location, asset, work-scope identifier, accounting stage and overlapping calendar-valid periods.

It excludes duplicate extracts, cancelled processes, corrigenda, notice-stage rows, records with missing identity/comparability fields, different lots/assets/work scopes, different accounting stages and non-overlapping maintenance periods. Multiple payments under one contract do not become separate physical-work flags. Any remaining overlap is a question requiring original bills of quantities, measurement books, changes, completion and payment evidence.

## Identity and law controls

Research graph entities have explicit source-backed identity bases and an explicit reviewed resolution status. Four cross-slice identities are reconciled only by an auditable fixed map confirmed by both researchers: the Union ministries of Defence and Home Affairs, Defence Minister Rajnath Singh, and legal parent Larsen & Toubro Limited. Combined source lists and original IDs are retained; official-role dates stay on their separate edges. Ministry departments, subsidiaries and consolidated reporting groups remain distinct. Unresolved entities cannot receive edges. No fuzzy name matching joins buyer strings to corporate groups or politicians. Institutional authority, corporate ownership, investment, political contribution and parliamentary oversight carry distinct typed edges. They are not all financial flows, and none alone establishes award influence.

Rules preserve publication and effective dates separately. Missing or month-only commencement dates block exact-day applicability inference. Temporal eligibility is not a finding of breach: procurement category, jurisdiction, emergency exceptions, delegated powers and the contract's own terms still require review.

## Acceptance criteria and checks

The data gate checks source joins, identity resolution, localities within declared states, graph endpoints and date ordering, case replies/alternatives/falsifiers, monetary stages, exact buyer metrics, reproducible classification, input and archived-evidence SHA-256 hashes, nine sector coverage rows and all 36 state/UT navigation entries. Tests actively alter numeric fields, identities and hashes; they test false-positive exclusions, not just successful cases.

`node scripts/public-works/assemble.mjs --check` checks byte-for-byte freshness. `node scripts/public-works/validate.mjs` requires all four reviewed research slices and checks the assembled evidence. `node --test scripts/public-works/public-works.test.mjs` verifies data integrity and comparison boundaries. The original CPPP raw pipeline remains separately reproducible with its published input digests and instructions in `scripts/cppp/README.md`.

## Panel round 2: changes made after reading the built evidence

The second review found that omitted geographic dimensions could turn a West Bengal bridge relationship into national context. The raw input gate now requires explicit reviewed scope, state codes and locality IDs for every research record. Road relationships received their actual geography; the Karnataka RTE rule now stays in Karnataka. Regression checks exclude West Bengal bridge edges from Uttar Pradesh electricity and Karnataka water views. Place queries still use only declared locality metadata.

Other changes removed automatic source-tier and resolved-identity defaults; added mandatory dated retrieval metadata; required explicitly linked responses for allegations; preserved multiple monetary amounts with their own accounting stages; and escaped spreadsheet formulas even when preceded by whitespace. Four exact cross-slice identity reconciliations replaced duplicated public-body, minister and legal-parent nodes without fuzzy matching. Corpus-wide recurring-winner counts now explicitly say they are not the selected sector's counts.

Final data checks at this handoff: 25 passing tests, a passing source/identity/geography/numeric validation, byte-identical assembly freshness, and independent SHA-256/size checks on 57 unique retained or reused artifacts in five required manifests (12,918,790 bytes). The assembled release contains 56 sources, 75 canonical entities, 58 relationships, 20 cases/questions, 17 rules and 14 named localities. These are curated coverage counts, not a national inventory.
