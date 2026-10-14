# Research and platform expansion

The current release is a working atlas over a curated retained corpus. This roadmap is an ordered research programme, not a claim that all Indian companies, villages or funding routes have been investigated.

## 1. Close exact financial chains

Priority: reviewed tenders and newly added cases. For each chain, seek the signed award/concession, amendments, named beneficial/legal owners, funding instrument, certified invoices, treasury/PFMS or issuer-reported receipts and audit follow-up. Maintain separate contract, amount, period, payer, payee and currency fields. Preserve an explicit missing-evidence stop at the last supported step.

Acceptance: every displayed payment arrow resolves to a payment source and legal endpoints; commitments and awards remain separate. The procurement mirror at tender.sarthaksidhant.com remains a discovery and corpus-audit source, reconciled with original buyer records where available. Notice, award, listing and detail grains must never be silently joined. Existing DuckDB source audits and retained raw hashes are reused.

## 2. Deepen geography without inventing precision

Prioritise public schools, hospitals, water projects, roads, ports and disaster reconstruction sites for which official asset registers or other reliable spatial records supply exact coordinates. Reconcile stable UDISE, health-facility, project and local-government identifiers. Record historic boundary changes explicitly. Add open building footprints only with a compatible licence and independent correspondence to the public asset.

Acceptance: each research pin exposes coordinate source, date, precision and institutional identity. No private residence or person's whereabouts is inferred from a headquarters. Basemap building heights remain explicitly marked as potentially inferred/default, separate from any measured research asset. District/city/village data gaps remain distinguishable from zero activity. The implemented open street underlay supports navigation, not automatic geocoding of financial claims.

Extend international country context to exact project sites only when loan schedules, implementing-agency records or public asset documents support the location. Keep the creditor, sovereign borrower, sub-borrower, implementing agency and awarded contractor as separate legal identities. Seek actual withdrawal/disbursement and payment records before extending an award into a money-transfer arrow. For defence procurement, reconcile notification ceilings, signed instruments, offsets, suppliers and dated delivery batches without implying operational deployments.

## 3. Test anomalies against proper denominators

- Education: school closures/mergers versus enrolment, child population, travel distance and public/private stock, with stable administrative units and comparable years.
- Water/agriculture: groundwater and surface-water observations, supply coverage, rainfall departures, reservoir capacity and crop/food-chain stages. A hazard indicator is not a deterministic disaster prediction.
- Roads/bridges: repeated scope versus repairs, maintenance and legitimate phase changes; compare work IDs and bills, not similar titles alone.
- Welfare/health: eligibility samples, duplicated claims, actual recoveries and successful delivery; keep sample/population and cumulative/annual cohorts separate.
- Energy/resources/transport: auctions, tariffs, concession amendments, ownership, obligations and revenue actually received.

Acceptance: publish the numerator, denominator, comparable cohort, alternative explanation and falsifying evidence before calling a pattern an irregularity. Preserve successful and negative controls to test selection bias.

## 4. Expand companies and institutions systematically

Use exact CIN/LLPIN/ISIN/LEI/FCRA and programme identifiers where available. Indexing the NSE universe is separate from researching each issuer. For each institution, retain an explicit stage: discovered → identity resolved → source opened → financial chain checked → response/current outcome reviewed. Prioritise public-interest materiality and source availability, not a model-produced guilt score.

Acceptance: no symbol/name-only merger; dated ownership percentages use the right legal perimeter. Public leaks and releases keep original-document identifiers, provenance, response and jurisdiction. An association or correspondence link cannot fill a missing transaction.

## 5. Durable open-source data services

When the retained static corpus materially exceeds practical client memory, move query and source indexes to versioned PostgreSQL/PostGIS (spatial and canonical entities), DuckDB/Parquet (bulk tender audit) and an adjacency index for graph traversal. Keep signed release manifests and downloadable source-closed packets. Add incremental parsers, document hashes, source change detection and a human-review queue before publishing new claims.

Acceptance: reproducible query results match the static reference corpus; caching keys include source version; partial failures expose stale/unknown status; no hidden model promotion. Use open models for OCR-assisted triage and retrieval with pinned revisions, measured extraction error and licence receipts.

## 6. Reader and editorial validation

Test time to first original source, whether readers can distinguish an allegation from a finding, whether a money trail's missing step is visible, keyboard completion and mobile reflow. Use a real consenting reader study before claiming usability or marketing improvements. Keep primary-source refreshes, correction history and unresolved questions public.

Acceptance: each release runs schema/source-closure tests, claim-specific counterexample tests, all-route and casebook regression checks, actual WebGL/fallback tests, visual confirmation and a public deployment byte check. No pooled corruption total or social-network path is substituted for evidence.
