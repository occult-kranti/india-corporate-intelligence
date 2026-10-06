# Verified corporate and public-office connections

Five primary publisher records were downloaded and read. Four PDF excerpts preserve original pages with a page map, original-file hashes and retained-file hashes. Two scanned subsidiary statements were OCR'd for retrieval, then the cited pages were visually read. The original page image is authoritative: OCR mistook one prior-year `2023` as `2028`, and that error is explicitly recorded.

## What the records support

- The official NHAI March2023 package table names IRB Infrastructure Developers Limited as concessionaire for Delhi–Mumbai Expressway Gujarat Package7, chainage190.000–217.500. Its award date is31July2020, commencement10December2021, target completion30June2024 and progress28% at31March2023. These are separate events; the target is not an assertion of completed work. Package length28km is source rounding, not a discrepancy against27.5km chainage.
- IRB FY2023-24 BRSR identifies Modern Road Makers Private Limited and IRB MP Expressway Private Limited as100% subsidiaries. The snapshot is31March2024; this is not continuous historical ownership. The annual report identifies chairman/managing director Virendra D.Mhaiskar by DIN00183554.
- Consolidated Note46 reports political donations of ₹67.62crore: ₹30crore BJP, ₹1.62crore Balasahebanchi Shivsena and ₹36crore unspecified electoral bonds. A separate **consolidated reporting group** node carries these contributions. This is an accounting perimeter, not a separate legal person or identified individual payer.
- Standalone parent Note45 reports **NIL political donations**. Modern Road Makers Note43 reports ₹35crore political donations without recipient names. IRB MP Expressway Note24 reports ₹25crore donations without a political-party label in that note. No graph edge assigns these subsidiary figures to a party or adds them to the consolidated total.
- The official PrimeMinister page is dated10June2024 but explicitly states its roster is **as on25July2026**. Eight portfolio-role edges use25July2026 as a point-in-time observation. The role record does not backfill2024 tenure, attribute an award decision, or replace state/local responsibility.

This yields a useful project → contractor → consolidated reporting group → disclosed party path with separately sourced corporate ownership and office context. Direction is relationship-specific, not a universal cash-flow arrow. No connection establishes misconduct, illegality or preferential award influence. No allegation is made against the disclosed parties and no response was solicited.

## Rejected joins and gaps

The original ECI purchase/redemption files were not obtained from its current JavaScript disclosure page during this pass. Secondary sites surfaced a possible IRB MP Expressway bond-recipient match; it was **not imported**. A common amount is not a transaction key, and no serial-number matching is claimed.

The original listed-company universe does not include IRB. No company canonicalId was invented to force a join. Only exact official-person IDs that exist in the inherited public-office roster are retained as identifiers; their inherited claims or dates are not imported. The data engineer explicitly reconciles identical Union MoD/MHA/Rajnath entities using their source-backed office identities; no general alias matching is enabled.

The four PDF excerpts and full official-roster HTML/text are in `research/raw/public-works/connection-evidence/`. A standard retained-file integrity manifest is in `evidence/public-works-connections/sha256-manifest.json`. Run `python3 scripts/public-works/audit-connections.py` for accounting scope, no-inferred-payer, role-snapshot, exact-package-date and archive integrity controls. Publicly downloadable reports are not represented as openly licensed datasets; copyright remains with each publisher.
