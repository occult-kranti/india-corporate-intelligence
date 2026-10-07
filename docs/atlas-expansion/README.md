# The Public Record Atlas

A geographic interface for inspecting India's institutions, public money and private control. The homepage combines sector layers; each sector opens its own map, case feed, evidence ledger, relationship network and original dossier. The 15-year research window is **6 October 2011–6 October 2026**. Older retained records remain available through All history. Retrieval dates may be 7 October UTC.

This is an evidence catalogue and research workbench, not a complete national census or a list of guilty people. Retained historical claims are not freshly verified just because they appear in the new interface. Documented transactions, allegations, audit findings, procedural decisions, responses and analytical questions retain different meanings.

## What a reader can do

1. Start on the India map, select a state, overlay sectors, or open a sector destination.
2. Explore the Places map from country scale to cities, villages and streets, submit a place search, tilt the camera and toggle names, buildings and research overlays. Select the separate 3D research atlas or keyboard-accessible offline 2D view. Present-day map context remains fixed when the evidence timeline changes.
3. Browse cases, allegations and findings for that place and field. Read exact financial stages, dates, sources, responses and the evidence that would change the assessment.
4. Search an exact institutional identity. Explore incoming, outgoing or both-direction connections to five hops. Follow a source-backed trail to a second identity. Graph previews are bounded; the matching ledger and response-closed export retain all results.
5. Open a node or edge reader, continue to its endpoints, examine the original source and export evidence. Existing local casebooks, notes, watchlists and saved links remain available.

The new sector routes are `/health`, `/ngo`, `/disaster-relief`, `/transport`, `/public-funds`, `/policy`, `/public-records`, `/international-finance` and `/defence-trade`. They join the existing energy, water/food, education, roads, finance, welfare, security, media, public-office, resources, justice, debt and PM CARES pages. The dedicated `/follow-the-money` page includes both the previous reviewed cases and this expansion.

The five new research slices contain **15 reviewed cases**, **91 sources**, **126 entity records**, **122 relationships** and **52 typed records**, including responses, policy changes and financial context. Integrated with the retained corpus and reviewed identity bridges, the registry contains **2,222 entities, 3,943 relationships, 5,450 records and 3,237 sources**, with **315 held items** excluded from publication. There are **28 reviewed money-trail cases** across the old and new case sets. These are different counting units, not corruption incidents. The international-finance lens also classifies 961 existing lender-linked records using exact canonical lender IDs, preserving their original evidence grades; classification is not a fresh review.

## Research and reproducibility

- [Policy instruments and transaction chains](POLICY.md)
- [Institutional, media, trust and public-release research](INSTITUTIONS.md)
- [Disaster, police and welfare oversight](OVERSIGHT.md)
- [International lenders, sovereign borrowing and corporate investment](INTERNATIONAL_FINANCE.md)
- [Defence contracts and cross-border suppliers](DEFENCE_TRADE.md)
- [Research challenges and corrections](PANEL_RESEARCH.md)
- [Product and engineering panel](PANEL_PRODUCT.md)
- [Expansion roadmap and acceptance gates](ROADMAP.md)

Raw slices live under `research/raw/atlas-expansion`. Each relationship needs exact endpoints, source references, geography basis, dates, status, amount stages, alternatives and response closure. Archive receipts distinguish retrieved originals, mirrors, indexed publisher text and failed retrievals. Public Epstein-related material is treated as documentary evidence at its actual scope: a mention or meeting does not establish criminal participation, and a proposal does not establish a payment.

The Places map uses MapLibre with OpenFreeMap / OpenMapTiles and OpenStreetMap data, with visible attribution. It provides worldwide geographic context, place names and mapped building footprints where available. Place search uses Nominatim on explicit submission, with throttling and a small session cache. These public services require network access and can fail independently of the retained investigation; the offline 2D view remains available. This is an open geographic underlay, not Google imagery or a guarantee of complete village/building coverage. Building heights may be measured, inferred or provider defaults and do not establish ownership or funding.

Research geography uses the repository's pinned current 36-state/UT geometry, also exported to WGS84 for the Places map. Three.js renders the same retained geometry locally. Facility markers are schematic symbols with explicit coordinate precision, separate from basemap buildings. Only records with independent location support receive markers. Country-context records retain ISO country identities and are counted separately from Indian state records; they are not assigned invented coordinates. No unverified financial flow is drawn between geographic points.

International chains distinguish lender commitments, signed loans, borrower obligations, procurement awards, corporate subscriptions and reported cash receipts. IMF quota and SDR allocations are separate instruments from loans. Defence records distinguish sale notifications and ceilings from signed contracts and dated delivery milestones. A foreign supplier, lender or national affiliation does not by itself establish wrongdoing.

A pinned open-source MiniLM model ranks public source summaries for research discovery. Similarity proposes reading priorities; it does not create graph edges or findings. Execution metadata, model licence, revision and corpus/output hashes are retained separately from publisher evidence. See the atlas model artifacts and validation scripts.
