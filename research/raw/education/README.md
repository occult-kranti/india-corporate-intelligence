# Education evidence inputs

This directory retains the research inputs and originals for the education desk, dated **6 October 2026**. It uses the education schema, not the corporate graph's entity/edge schema. Its gate is `scripts/education/validate.mjs`.

- `public-research.json`: official school/college datasets, public funding, RTE reimbursements, policy and reported school-access cases. Includes 23 source records.
- `funding-research.json`: 15 CSR, NGO, foreign-contribution, multilateral and private-capital source records. Research bookkeeping distinguishes search requests, attempted URLs and extracted pages. Large-document extracts are not represented as complete document readings.
- `evidence/`: three original parliamentary PDFs, extracted text and a download manifest recording URLs, dates, bytes and SHA-256 hashes. The manifest also retains failed origin retrievals; a cached/indexed document extract is not a successful live-origin fetch.

`scripts/education/assemble.mjs` is an explicit, deterministic adapter from these inputs to `src/data/education-research.json`. It preserves original values, applies reviewed geography and funding-stage classifications, and makes minor typography corrections only in the display output. It does not promote arbitrary raw claims or generate graph relationships. The original research JSON and source PDFs remain available for review.

The compiled desk includes 38 source records, 13 funding programmes/mechanisms, 36 monetary observations at distinct accounting stages, 12 investigation/context leads, and 112 government-school stock series: India, all 36 states/UTs and all 75 Uttar Pradesh districts. Each series has five academic-year observations. State sums reconcile to India, and district sums reconcile to Uttar Pradesh for every year. The original PDF re-extraction independently matched all 560 values.

Locality records distinguish districts and cities. Bengaluru South is a reported-policy district without a compiled school-count series. City mentions elsewhere describe documented programme/platform presence, not a city funding ledger. National programme eligibility, organisation-wide receipts and a company's registered office do not establish a local allocation. Government-aided and private unaided are separate management categories. Programme-relevance filters do not split an aggregate amount between its eligible categories.

Money is intentionally **not aggregated** into a total. The records distinguish allocations, releases, reimbursement, expenditure, receipt, commitment and multi-year outlay. Original currencies and rupees/lakh/crore/million units remain explicit. `includedInFlowId` marks nested amounts; `financialEnvelope` links observations belonging to the same programme or account. Donor and recipient disclosures can describe the same transfer.

School stocks are not closure-event counts. Net count differences may include opening, merger, recoding, reclassification or boundary changes. No matched observed local school-age population series is loaded. Reported school-access cases retain the government's explanation, missing evidence and a concrete outcome that would disconfirm the concern.

Reproduce the main checks from the repository root:

```sh
node scripts/education/assemble.mjs
node scripts/education/validate.mjs
node --test scripts/education/education.test.mjs
```

The optional original-PDF extraction check requires `pypdf`:

```sh
python3 scripts/education/audit-public-source.py research/raw/education/evidence/ls-school-counts-2026.pdf
```

If source text changes, regenerate the separate model corpus and its research-only ranking artifact; its SHA validation deliberately rejects stale results. The source registry and reviewed numeric data remain authoritative for the page.
