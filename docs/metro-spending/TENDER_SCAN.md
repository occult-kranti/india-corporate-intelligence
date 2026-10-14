# Delhi, Mumbai and security buyer-cohort scan

The two complete SQLite snapshots supplied through [the public tender index](https://tender.sarthaksidhant.com/) were already available in the workspace. This review rehashed all 13,267,697,664 bytes against the publisher's retained SHA256 values before querying them. It did not treat an index-page count as a locally verified dataset.

The archive contains 4,921,960 award-listing rows and 3,952,191 notice-listing rows. Detail-table rows are separate storage, not additional procurements. The original download receipts are retained in `research/raw/tender-portal-audit/evidence`. The parsed-cache recipe fingerprint was checked against those exact source hashes and the retained SQL before read-only access.

Thirteen explicit, nonoverlapping buyer-name probes select **281,999 notice-listing rows** and **464,549 award-listing rows**. These are source-row populations, not unique contracts or city expenditure. The probes cover Delhi Police and its housing corporation, Delhi municipal bodies and DDA, Mumbai Police and BMC name probes, Mumbai Port, Mazagon Dock, BSF, ITBP, SSB, Border Roads and Military Engineer Services.

The source contains 699 notice rows under the declared Delhi Police name probe and no matching award rows. The narrow Mumbai Police and BMC probes have no matching listing names in either stage. Other aliases, state portals and omitted source coverage remain untested. None of these gaps means that the organisations did no procurement.

The large Military Engineer Services cohort is national. A Delhi or Mumbai parent office in a buyer hierarchy does not place its child-office projects or spending in that city. All city labels in the scan mean buyer-name discovery associations, not sourced project coordinates or verified city spending.

## What the executed queries establish

`scripts/metro-spending/tender-scan.py` records full SQL, execution times, source hashes and software version in `research/raw/metro-spending/tender-scan/analysis.json`.

- Notice and award row counts stay separate; there is no cross-stage join.
- Date-eligible rows must be no earlier than 7 October 2011 and no later than their own capture or the June 2026 snapshot cutoff. Missing and contradictory dates remain counted separately.
- Repeated nonblank portal/buyer/tender/reference keys expose repeated source records. They do not establish repeated paid work.
- Bid counts use strict integer lexemes and retained detail-ID/chronology checks. One-bid rows are not deduplicated competitions and do not establish misconduct.
- No contract-value total is computed, no bidder label becomes a verified legal identity, and no raw-data flag becomes an allegation.
- Eighteen bounded award-listing samples preserve original internal IDs, tender IDs, source URLs and raw date fields. The independent reviewer looked them up again in the original SQLite database and reproduced the fields. The URLs are source discovery links; this review does not claim they still render an authenticated original award page.

No contact names, private addresses or bank-account fields are extracted. The full databases stay outside the repository; compact results, reproducible scripts and hash receipts are committed.

## Product integration

`scripts/metro-spending/build-tender-context.py` builds 13 neutral `procurement-context` cards. They appear under Budgets & contracts with the same exact record reader and export controls. The card nodes are typed **source-cohort**, with explicit boundaries; they are not fabricated public bodies or merged companies. There are no generated money edges, vendor accusations or amounts in this slice.

The next admissible step for any apparent pattern is an original tender and corrigendum, lawful procurement-method context, bid-evaluation record, signed award, and verified payment/delivery record. Incomplete mirroring, proprietary compatibility, emergency procurement, market size and repeat captures are among the alternative explanations requiring investigation.
