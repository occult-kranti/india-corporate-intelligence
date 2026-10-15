# India public-asset and financing seeds

Research cut-off: 15 October 2026 (UTC). Seven bounded transaction records, not a complete privatization census.

## Findings

- IDBI: strategic buyer approved on 14 October 2026. Fairfax says definitive agreements have not been signed. Ownership transfer, acquisition lending and cash receipts remain unverified. Conditional consideration covers both Government of India and LIC shares.
- Air India, NINL and FSNL: closing is supported by official completion records. Air India cash proceeds and retained debt, NINL enterprise value and FSNL seller receipts have different accounting scopes.
- CEL, Pawan Hans and BPCL: the specific selected-bid/EOI processes in this packet ended without completed privatization. Later separate processes are outside these historical records unless explicitly added.

## Data files

- cases.json: timeline, amount stages, sellers/buyer, dated institutional roles, financing and explicit missing joins
- entities.json: durable dataset IDs, source-linked legal names and verified identifiers where read; unresolved registry joins remain marked
- relationships.json: directed predicates, dated statements and explicit case_ids; ownership, voting, bidder, advisory and preference-share relationships remain distinct
- claims.json: primary-source assertions, locators and limitations
- sources.json: 24 source records, with 21 retained originals and SHA-256 hashes; three originals were read through the web tool without a retained original-byte copy
- acquisitions.json: successful and failed acquisition attempts, actual retrieval timestamps and hashes
- hypotheses.json: IDBI valuation-change question, competing explanations and discriminating records
- coverage.json: denominator limits, exclusions and prioritized record-acquisition roadmap

Amounts are decimal strings to preserve original precision. INR crore has a multiplier of 10,000,000. No exchange-rate conversion is made. Do not sum enterprise values, cash proceeds, retained debt, advisory scopes or financing subscriptions. Null loan amounts mean unknown, not zero.

The source archive is for evidence review. Publish the compact factual records and public links; do not republish full originals or extracted reports without checking rights.

## Important joins

Fairfax's selected purchaser is linked to Fairfax Financial Holdings by the government naming the legal purchaser and parent, together with the issuer describing its selected subsidiary as wholly owned. Intermediate legal layers have not been reconciled. The March 2026 proxy separately describes Watsa/Sixty Two voting positions. Those percentages are not economic ownership or completed IDBI ownership.

Tata Steel's March 2022 preference-share subscriptions supported TSLP growth including NINL. They are not bank loans and cannot all be allocated to NINL's purchase price. The SBI CAPS record for Air India concerns later refinancing and additional-funding advisory. It does not establish acquisition loan drawdowns.

No transaction-specific NGO/VC finance path or covert link has been established. Directors, advisers, regulated institutions and controlling shareholders must not be merged into a single relationship type.

## Review and limits

Primary records read and self-checked. IDs, source references, entity endpoints, case membership, canonical statuses and precise amount conversions were validated by a script. BPCL's scanned notice was visually checked to resolve imperfect OCR. No blind independent verification has been completed. Minister dates denote the context of dated official records; they do not necessarily denote individual votes, attendance or personal decision dates. Institutional authority is not personal culpability.

Some official pages failed through the web fetch tool but were readable through ordinary public HTTP retrieval. These recoveries are documented. Fairfax raw-archive requests returned 403, and were not retried; web-tool reads already obtained remain the evidence. Unavailable sources are not evidence of concealment.

## Next useful records

1. IDBI executed agreements, regulatory decisions, closing statements and split receipts; lender commitments and drawdowns.
2. Original/revised valuation instructions, reports and contemporaneous approval records. Published FAQ withholds valuers' names. Publicly named transaction/legal advisers are not automatically the unnamed valuation agencies.
3. Reconcile the full DIPAM population, including unsuccessful bids, public-to-public transfers, minority sales and later rounds, before any rate or systemic claim.
4. Expand historical sales, state sales and PPP/concession cohorts; add public registry IDs and dated funding paths before merging external graphs.
