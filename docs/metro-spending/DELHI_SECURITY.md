# Delhi police funding and procurement: reviewed expansion

Reviewed on 7 October 2026 without skills. This is a source-backed city slice, not an exhaustive list of police corruption. Source and status dates remain visible; ordinary budgets, project announcements and tender leads are not adverse claims.

The completed slice contains 9 sources, 26 entities, 24 relationships, 22 records and one city locality. It includes six substantive investigation networks (radio procurement, legacy CCTV, Himmat, MV Theft, Safe & Secure Delhi, Safe City), one further CCTNS audit finding, two current court/procedural records, response records, and ordinary funding/procurement context. The app should use actual source IDs and relationship labels; no political-beneficiary, illicit-payment or supplier-owner relationship has been manufactured.

## Evidence and financial distinctions

| Network | Source-supported issue | Necessary counterevidence / boundary |
| --- | --- | --- |
| Radio upgrades | CAG criticized tender specifications, unreasoned changes and repeated single-bid procurement. PAC32 identifies a ₹185 crore quote against a ₹120 crore estimate. | A technology-neutral tender was attempted. Both figures include taxes. Quote is not an award, payment or ₹65 crore loss. No latest award was found. Motorola and Mobile Communication India are separate named bidders; exact legal subsidiary/suffix resolution remains limited. |
| Legacy CCTV | CAG called ₹5.61 crore pilot expenditure wasteful after omission of connectivity provision. | Police explained delayed approval/third-party damage; later phases included the provision. PAC140 reports 84–87% functionality in 2023 and PAC32 maintenance committees. Historic failure is not a claim of present operational blind spots. |
| Himmat | Nomination purchase, independently unsupported requirement assessment and undelivered features. | Police said comparative evaluation/testing occurred, explained console roles, and proposed recovery. ₹83.5 lakh development/AMC and ₹6.82 crore publicity are different expenditure classes; publicity recipients are unknown. Neither is a proved loss. |
| MV Theft | Thirteen separately bid works to PC Solutions, same-day award/completion certification, extended hosting without renewed tender discovery. | Initial core procurement had three bids and PC Solutions was lowest. Real services can coexist with procedural defects. ₹14.10 lakh hosting is a component of the ₹44.50 lakh cohort, not additive loss. Specific supplier/procurement rebuttal remains missing. |
| Safe & Secure Delhi | Project closure recommended after integrator-selection delay; CAG describes lost grant opportunity. | ₹40 crore is estimated foregone support, not money disbursed or stolen. ₹14.75 crore is administrative approval. Phase footnote sums to ₹40.03 crore; prose rounds to ₹40 crore. No direct World Bank disbursement, loan identity or private beneficiary is established. |
| Safe City | Surveillance-heavy design/impact-assessment concerns and missed/revised implementation targets. | Police describe community measures. PIB 16 February 2026 announces first-phase inauguration. About ₹857 crore in that announcement and ₹858 crore older sanction are not reconciled final accounts or additive amounts. No full-completion assertion. |
| CCTNS | Implementation delay, extended consultant role and weak handover planning. | Audit attributes part of delay to central core-software rollout. Police say consultant engagement ended September 2019, followed by in-house monitoring/training. Tech Mahindra and Deloitte have documented roles, not personal corruption allegations. |

PAC32's classification of all twelve recommendations as accepted by Government is preserved. It means neither criminal exoneration nor that all projects were completed. Its January 2025 final replies still describe pending implementation and negotiation.

## Ordinary city funding and procurement

The existing `research/raw/force/union-home.json` corpus already contains Delhi Police's Union budget series. The new reader explicitly links that lineage: Demand51 item5 BE2026–27 ₹12,503.65 crore and actual2024–25 ₹12,133.16 crore. Separate infrastructure item14.02 provides ₹342.50 crore BE2026–27. The Union Police demand total, national border-force budgets and the Delhi government's residual Police head are not treated as city police expenditure.

DPHCL's 30 May 2025 ongoing-project list supplies three selected ordinary tender-value leads: public-facility lift works and aggregate water-line replacement. The list does not identify awardees, disbursements or repeated-work irregularities. Similar project titles alone are not a duplicate-work finding. Residential quarter numbers were removed from retained artifacts. PIB's separate ₹368 crore Special Cell headquarters announcement is project-cost context, without detailed operational plans or exact sites.

## Provenance, retrieval and reproduction

- `research/raw/metro-spending/delhi-security-evidence/retrieval-index.json` records URLs, retrieval dates, bytes, SHA-256 values and external-only originals.
- Original PAC140, PAC32 and Police Budget PDFs are retained with `pdftotext -layout` extracts. PAC140 was submitted to Speaker 29 April 2024 and tabled in Parliament 24 July 2024; those dates are deliberately distinguished.
- CAG chapter URLs returned HTTP503 on repeated direct attempts. The source-host indexed text retrieved through Exa is labelled accordingly, with chapter/section locators. It is not represented as a locally downloaded original PDF.
- PIB's government HTML and indexed text are retained; the latter is a bounded excerpt and includes duplicated source-page material. Use original HTML/URL for complete provenance.
- The DPHCL original PDF/text are external-only because they contain residential quarter identifiers. A sanitized selection and the original-byte hash are retained. Full original is reproducibly downloadable from the public URL; exclusion is intentional.
- `build-slice.py` deterministically writes the reviewed JSON and validates unique IDs, sources, geography, endpoints, record references and response closure. It makes no automatic allegation or inferred payment edge.
- `sha256-manifest.json` hashes retained artifacts. Do not normalize whitespace in source text; it breaks reproducibility.

Run from the repository root:

```sh
python3 research/raw/metro-spending/delhi-security-evidence/build-slice.py
```

## Two challenge rounds

Round1 tested money stages and roles: budget versus actuals; radio bid versus award; pilot expenditure versus theft; publicity versus developer receipts; grant opportunity versus disbursement; project sanction versus invoice. It removed unsupported legal-suffix identity merges and all inferred political/ownership connections.

Round2 tested adverse claims against later official progress: PAC2024/2025 CCTV improvement, Government acceptance of recommendations, CCTNS handover, and the February2026 first-phase Safe City inauguration. The original official Supreme Court order of 28 September 2026 was retrieved: §8 excludes individual culpability determination and §9(v)(c), printed page8, requests actual Safe City functioning. The 5 October hearing and police assurances are independently reported by The Hindu; that hearing is not mislabeled a retrieved written order. No survivor, minor, private residential address or current operational weakness is made a map node.

Final date review corrected inherited response-period text. Budget records now carry the exact fiscal-year boundaries, expressly as appropriation/accounting periods rather than payment dates. Retrieved court-order and reported-hearing records carry their actual point-event dates. Official launch, project-announcement and project-list snapshot dates are distinguished from completion/award dates. January 2025 Ministry response dates remain distinct from the August 2025 parliamentary publication date. Broad historical cases remain undated intervals rather than invented continuous conduct.

Five vendor labels are `source-mention` evidence objects: Motorola, Mobile Communication India, Smart Cloud Infotech, PC Solutions and Deloitte. `resolved:true` resolves only the precise cited textual mention; it does **not** resolve a legal company. Each visible node says “source-named vendor; legal entity unverified”, carries the alias/legal-identity limitations and has no canonical bridge. Connected edges are `attributed-procurement-mention` with explicit attribution; the quoted/awarded expenditure information is not represented as verified bank payments to a legally identified corporation. This preserves usable source evidence without concealing corporate-identity gaps.

## Next evidence needed

1. Radio: exact CPPP tender IDs, full bids, estimate basis, negotiation minutes, award/cancellation and subsequent payments. The ₹185/₹120 comparison is only a screening question until like-for-like scope and final price are known.
2. CCTV: phase contracts, reserve-camera and connectivity amendments, maintenance deductions/recoveries, third-party damage settlement ledgers and independent service acceptance.
3. Himmat/MV Theft: nomination approval and market comparison, source-code/feature acceptance, developer invoices, advertiser recipients, recovery records and later action on procurement findings.
4. Safe & Secure: World Bank/e-delivery facility identity, sanction/release/reversal ledger, closure order and amounts actually received, if any. Do not substitute later Safe City funding.
5. Safe City: final accepted project cost, C-DAC subcontract awards, installation/acceptance certificates, independently evaluated safety outcomes and latest court compliance. Inauguration is not completion certification.
6. DPHCL: stable tender/award IDs, named contractor/CIN, BOQs, work periods, measurement books, change orders and payment certification before suggesting repeated works.

Two identity-only bridges are explicitly reviewed and included: new `delhi-police` to `legacy:entity:force:delhi-police` (same institution and exact Demand51 source), and `mha` to `atlas-policy:entity:home-ministry` (exact Ministry of Home Affairs, Government of India). The bridge carries no money and does not transfer allegations. CAG/PAC/MeitY/C-DAC remain candidates for a later exact institutional review. Do not automatically bridge Motorola, Deloitte, Smart Cloud Infotech, PC Solutions or the Mobile Communication India legal-suffix variant.
