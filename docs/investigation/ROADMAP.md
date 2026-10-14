# Programme roadmap

This is a multi-system public-record research programme. The current release
builds the shared map investigation workflow and connects retained datasets;
the following workstreams define how it grows without manufacturing completeness.

| Workstream | Deliverable | Completion evidence |
| --- | --- | --- |
| Shared investigation workspace | Geographic map on every route, linked graph, source/record inspector, layered filters, dated status, casebook and preserved sector dossiers. | Real state geometry; consistent filters; source-equivalent table/export; keyboard, mobile and deep-link workflow checks. |
| Source archive and refresh | Publisher-specific collectors, immutable originals, retrieval receipts, revision comparisons and availability histories. | Repeatable retrieval within publisher access rules, hashes, licences/terms, dated failures and measured coverage. |
| Entity identity service | Legal company/CIN, professional public-office identities, scheme/project/asset IDs, court case identifiers and reviewed crosswalks. | Match evidence, rejected candidates, versioned merges/splits and no automatic name-only connections. |
| Procurement and delivery | Notice→amendment→award→work order→measurement→payment→completion for roads, bridges, water, power, hospitals and schools. | Stable asset/chainage, lot and contract IDs; location and period matches; variations and maintenance obligations. |
| Public finance and benefits | Budget→sanction→release→recipient→service outcome across ministries, states, welfare and emergency funds. | Accounting-stage reconciliation, denominators, comparable periods, undisbursed balances and auditee responses. |
| Banking and corporate debt | Lending, secured claims, write-offs, waivers, settlements, insolvency plans and actual recovery. | Borrower-level lawful public evidence; banking secrecy gaps retained; mixed-vintage recovery and plan/cash distinctions. |
| Justice and oversight | Orders, bench/authorship, parties, regulator proceedings, charges, trials, appeals, stays and dispositions. | Case-number identity, order-level citations and explicit as-of status; closure filing not equated with acceptance. |
| Political and corporate networks | Dated offices, directors, ownership, disclosed contributions, contracts and relevant legal relationships. | Exact legal entities and reporting perimeter; bond serial joins only when validated; no influence inference from proximity. |
| Local access and resilience | School/hospital access, water service, groundwater, food supply and infrastructure condition at supported local granularity. | Versioned geography, population/service denominators, distinct observation/forecast periods and independently sourced outcomes. |
| Document intelligence | Multilingual OCR, tables, amendment comparison and reviewed entity/relation candidates using open models. | Pinned model/licence and corpus, held-out extraction evaluation, source-page locators and human review before publication. |
| Investigation analysis | Comparable-contract review, chronology conflicts, accounting reconciliation, negative controls and reproducible network queries. | Stated hypotheses, comparison family, uncertainty, alternatives and falsifiers; no opaque corruption score. |
| Analyst collaboration | Shared casebooks, review queues, comments, permissions, audit history and correction workflows. | Authenticated access model, conflict-safe edits, provenance-preserving exports, retention/deletion controls and recoverability. |
| Scalable infrastructure | Object archive, relational evidence store, spatial index, graph query service, full-text search and asynchronous ingestion. | Measured workloads and service-level targets, resumable jobs, observability, schema migrations and tested recovery. |

Prioritise correctness of identifiers, dates and accounting stages before adding
more visual encodings. Expand geography only when there is actual local evidence.
The largest corpus is not automatically the most useful: a matched contract,
asset, payment and audit chain has more investigative value than thousands of
unjoined name mentions.

The deployment remains a static public evidence application until authenticated
services are implemented and verified. Planned systems above are explicitly
future work, not implied capabilities of the published interface.

## Delivery order and scale gates

| Stage | Build next | Gate before expansion |
| --- | --- | --- |
| A — current release | Shared 36-unit map, typed graph, primary-source dossiers, review questions, portable local casebook, actual open-model relevance run, 156 reviewed buyer trails and a reproducible two-database procurement audit. | Registry/source/archive integrity, source-equivalent exports, response closure, rendered panel review and regression workflows. |
| B — traceable pilot districts | Select a small set of districts with available identifiers; ingest one procurement lifecycle plus one school, water and welfare outcome series. | Every published relationship has a source locator and identity basis; report the eligible document population, fetched proportion, freshness and unresolved share. No inferred village coverage. |
| C — evidence services | Immutable object archive, PostgreSQL/PostGIS evidence and geography tables, full-text index, asynchronous fetch/OCR jobs and a read-only query API. | Reproducible refresh, schema migrations, rollback/recovery drill and measured p95 query/startup performance. Split static source bundles when observed mobile cost warrants it. |
| D — reviewed local expansion | Expand states and sectors using the same contract/asset, accounting and geography rules; add court/tribunal identifiers and verified entity crosswalks. | Independently reviewed join precision, extraction error analysis by language/document type, clear coverage denominators and a correction queue. |
| E — shared investigations | Authenticated projects, review assignments, versioned casebooks and source-anchored annotations. | Permission tests, concurrent-edit recovery, audit history, portable exports and documented retention/deletion behavior. |

The current browser corpus is deliberately finite. It downloads a substantial
static source bundle to support local cross-domain queries; this is not yet the
service architecture for millions of documents. Measure cold startup and memory
on representative mobile hardware before increasing it materially. A graph
preview cap controls rendering, not corpus completeness.

## Open-source implementation choices for the next stages

- **PostgreSQL + PostGIS** for document/claim/identity versions, administrative
  boundary vintages and location queries. Start with explicit edge tables;
  introduce a separate graph engine only after measured multi-hop workloads
  justify another operational system.
- **S3-compatible object storage** for immutable original files and extraction
  artifacts; hashes and retrieval receipts remain in the relational ledger.
- **OpenSearch or PostgreSQL full-text search** for source discovery; choose using
  measured multilingual retrieval and operational cost on the pilot corpus.
- **Ollama/vLLM-compatible open models**, with model licences reviewed per exact
  revision, for proposed extraction; multilingual OCR and table extraction must
  be benchmarked against scanned Hindi/regional-language originals. MiniLM is
  used now for bounded English-summary relevance, with observed misses retained.
- **Versioned jobs and queues** for publisher collectors, retries, OCR, source
  change detection and review preparation. Website access restrictions and
  unavailable originals are recorded, never bypassed or silently filled in.
- **MapLibre/deck.gl** only when genuine geocoded assets or larger spatial layers
  warrant them; the current self-contained SVG map works offline after loading
  and has no paid map or tile dependency.

No provider account, paid service or unbuilt backend is required by the current
release. These are architectural options with entry gates, not deployed claims.
