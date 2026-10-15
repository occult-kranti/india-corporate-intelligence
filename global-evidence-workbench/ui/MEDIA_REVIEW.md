# Media & power implementation review

## Scope delivered

Separate additive route `media.html`, with globe, flat map, focused typed network, relationship table, geographic profile table, entity directory, exact-source inspector, country/sector/relationship/status/date filters, and explicit gap/coverage/method ledgers. Keyboard equivalents accompany visual controls. Mobile selections focus the inspector.

The frozen collection contains 99 source-resolved profiles, 115 typed dated relationships, 70 source records, 19 gaps and nine media cases. It represents ten country/jurisdiction labels; coverage is uneven. Only 31 profiles have explicit map anchors after the source review removed unverified geography. (The validation report is the authoritative machine count.)

## Evidence distinctions verified

- SEC beneficial ownership is not relabeled as an economic stake or voting percentage; class-specific figures and denominators remain visible.
- Palantir's reported 7.9% measure explicitly excludes Class F, and the 49.999999% founder-group measure is collective.
- News Corp's source share-count and percentage-denominator dates remain separate; a voting-class percentage is not all equity.
- Proposals, historical completed transactions, portfolio listings, contracts, services, donations, in-kind receipts and memorandum attributions keep their exact types and dated statuses.
- Per-share merger consideration, whole-round funding, funding ceilings, contract awards, cash prices and multi-stage case amounts are not summed.
- The America PAC in-kind/attribution pair displays a shared non-additive accounting group.
- No election-administration or tabulation contract is inferred from technical capability, government work, political contributions or social-media reach.
- Country points use explicit sourced HQ/jurisdiction basis; no personal residence mapping or inferred operating footprint.

## Automated verification

The test suite checks schema/source/claim/case joins; date precision and overlapping ranges; unknown coverage; entity and edge inspection; class/amount labels; all four views; keyboard focus after rerender; mobile inspector focus; filter/reset/empty/loading/error states; malicious-markup and unsafe-URL handling; shared-nav idempotence and sentinel preservation; and offline execution without runtime fetch. It traverses every production edge and entity and reproduces standalone output deterministically. See `test-results-media.txt` and `validation-media.json` for final run evidence.

Research inputs are pinned as sanitized curated metadata in `research/media-seeds/`. The assembler requires both source packets and fails on missing or unresolved core references. The source-copy/publication boundary excludes acquired originals, raw acquisition extracts and personal-address details.

An independent reviewer checked selected primary-source distinctions and ran a separate production DOM/privacy/offline audit. This is not a claim that every page of every source was independently audited. Claim-level researcher review statuses remain as supplied.

## Not verified here

No pixel-level desktop/mobile browser pass. The environment has an already verified Chromium socket restriction; it was not retried or bypassed. DOM tests are not a substitute for visual review. No push, merge or deployment was performed by this implementation task. The publication lead must verify the exact integrated build/commit and current route before claiming publication.
