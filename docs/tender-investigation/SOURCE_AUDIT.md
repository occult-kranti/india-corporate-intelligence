# Tender source audit and bounded investigation leads

Reviewed 6 October 2026. The requested [Sarthak Sidhant tender publication](https://tender.sarthaksidhant.com/) is already the upstream origin of the award-only [rumourscape/tenders conversion](https://huggingface.co/datasets/rumourscape/tenders) used by this repository. It is not independent corroboration. The newly inspected material is the original SQLite notice database and its detailed relationship to the original award database.

Both complete SQLite files were downloaded from the publisher's public R2 archive, without bypassing access controls, outside the repository. Streaming extraction verified their full published SHA-256, uncompressed bytes and ZIP CRC. The alternate S3 endpoint returned 403; this failure is retained.

| Original file | Bytes | SHA-256 |
|---|---:|---|
| aoc_tenders.db | 6,594,818,048 | `ec8ef7711a17b7cae9e0414c2403b119a0a31c4dec49ed7055b38ec0df5f7586` |
| tenders_vps.db | 6,672,879,616 | `b1994cfb6dd2d5da9ed1d9ac8d6bbc7083178f155e92a65628e87a38e4c64d01` |

The HF snapshot inspected is commit `401d093cc74d7a05e7d48326c1bc11edb289d7bb`, updated 27 June 2026. Its reported shard sizes and hash prefixes match the archived pipeline provenance; remote full LFS hashes were recorded, not misrepresented as local Arrow rehashes. The converter gist revision is `593ed6da09866ca75bd016fecd863546a4c48df2`. HF labels its conversion CC-BY-4.0; no explicit licence for every underlying original document was established. Source receipts, versions, schemas and exact SQL are retained under [research/raw/tender-portal-audit](../../research/raw/tender-portal-audit/).

## What the actual computation establishes

| Check | Result | Interpretation |
|---|---|---|
| Source grain | 4,921,960 award listings; 4,540,739 award details; 3,952,191 notice listings; 3,178,485 notice details | The 16,593,375 table rows are not distinct tenders. One notice detail is an orphan test record. |
| State notice coverage | 41,825 state notice listings, all collected as active; 39,104 close after capture | This slice cannot supply historical state-award outcome rates. |
| Tender-ID-only join | 2,730,656,872 candidate pairs | Reused generic IDs cause a many-to-many explosion; never create a contract or payment graph from this join. |
| Exact listing-only contextual key | 2,625 shared keys; 1,714 unique pairs | Portal + exact buyer label + ID + reference limits ambiguity but does not prove a contract/lot/version match. |
| Separate detail-reference fallback | 24,809 shared keys; 17,704 unique pairs; 118,342 nonblank award listing/detail reference conflicts | Missing references may be recovered within the award's own internal ID. Conflicts remain unresolved. The two join variants overlap. |
| Closing-field semantics | 1,709/1,714 selected pairs have award closing equal to notice publication; zero equal notice closing | All pairs are central, dated 2013–2018, and 1,632 belong to Neyveli Lignite. This is not a representative estimate for all awards. |
| Fallback semantic population | 15,816/17,704 unique candidate pairs share publication timestamps; zero share exact closing timestamps | Supports further field interpretation review, not a general estimate of evaluation speed. |
| Scheduled short windows | 36/39,104 future-closing state notices and 10/2,721 notices at/before scheduled closing are under 72 hours | The 72-hour threshold is an analyst screen, not a claimed legal minimum. Corrigenda and procedure must be checked. |
| Deduplication scope | Historical key: 3,385,233 groups; adding portal/buyer: 3,385,618; adding reference: 3,386,584 | Small total sensitivity, meaningful exact-identity limitation. No repeated physical work or duplicate payment is proved. |
| Raw payload conflicts | 1,757 old-key groups vary in raw amount; 928 in raw bid count, counting null versus present | Retain versions until authoritative records resolve them. |
| Chronology | 748 award timestamps after the 26 June publication cutoff | Treat as source-quality conflicts. Timezone-naive observations within 24 hours of individual capture are separated from larger offsets. |
| Numeric transformation | 14 notice EMD and one fee string use scientific notation; stripping turns `1e17` into `117` | A converter-rule defect also present in our initial exploratory macro. Original SQLite strings are intact. All nonblank award numeric lexemes fit their observed strict forms. |

Every statement above has query IDs, full SQL, source hashes and result rows in `analysis.json`, `followup.json`, `closing-field-semantics.json`, `linkage-v2.json`, or the independent `amount-lexemes.json`. The notebook [audit.ipynb](../../research/raw/tender-portal-audit/audit.ipynb) presents the exact SQL and retained results, with optional read-only rerun cells. Notebook cells deliberately have no invented execution outputs.

## Product integration and bounded detective work

Nine compact analytical records expose these findings in the common inspector and casebook, with denominators, alternatives, next documents and limitations. They add no supplier entities, political edges or payment amounts. Separately, 156 reviewed central-buyer cohorts expose exact `(portal, buyer, snapshot, buyerRule)` joins to retained bid-rate records; 133 also have retained concentration summaries. The three rate/named-award/marked-award denominators remain distinct. Supplier strings in lazy details are dataset labels, not resolved legal identities.

The historical timing and short-gap numbers, SQL, dates and generator metadata remain intact. Their presentation now says **recorded dataset-date gap**, and includes the selected-subset semantic caveat. No claim of suspiciously fast evaluation is supported by an unverified comparison-date field.

The original strict candidate pool, requiring compatible closing timestamps, is empty. A separate declared detail-reference fallback identifies 2,071 exact-key rows meeting canonical ID, lexical and ordered notice/AOC criteria, of which two meet the short-window/single-bid screen. All 2,071 still have the award comparison timestamp equal to notice publication, so they remain field-semantics leads. A finite seven-case follow-up selected the two IRCTC observations, three Jhabua Power records, one CONCOR record and an illustrative IRCTC multi-bid comparison. The comparison shares buyer, category, procedure family and year; route/lot differences remain, and this is not a randomized or statistically matched control.

The two IRCTC government-document links returned HTTP 200 unauthorized redirects; the other five supplied notice/AOC pages returned HTTP 200 “Invalid Url” pages. Their document endpoints returned unauthorized pages or HTTP 403. Thus fresh original-field verification is **0 of 7 cases**; successful HTTP transport is not document verification. Exact receipts and primary-response hashes are in [primary-receipts](primary-receipts/) and [original-source-review](original-source-review/). The retained raw AOC details in the five-case review separately label Published Date and Contract Date, matching the listing's comparison timestamp and AOC timestamp respectively. The five derived lead-extract procedure values match their source notice-detail fields; this is one lineage, not independent listing/detail corroboration. AOC Tender Type carries category labels Goods/Services. IRCTC licence/revenue direction is unresolved, so nominal figures are not called government spending.

Required next evidence is an accessible original notice, applicable procurement rule, all amendments, exact scope/lot/asset identifiers, award/contract, bills, payments and completion records. Buyer address is not asset geography, ownership is not award influence, and an award value is not payment. This audit makes no corruption, private-name identity, repeated-work or political-influence inference.

## Reproduction and release gates

No database download, DuckDB installation or network access is needed for release validation:

```bash
node --test scripts/cppp/trails.test.mjs
python3 -m unittest scripts/cppp/test_provenance.py scripts/cppp/test_date_semantics.py
python3 research/raw/tender-portal-audit/test_audit.py
node scripts/investigation/validate.mjs
node --test scripts/investigation/investigation.test.mjs
```

The compact audit builder supports `python3 research/raw/tender-portal-audit/build_cards.py --check`; it fails on stale inputs or output. Cohort tests likewise compare input fingerprints and the full generated artifact. `strict_parse.py` is a tested forward-use parser: it preserves raw values, accepts reviewed rupee prefixes and comma grouping, quarantines scientific notation, and does not round bid counts. The initial cached EMD/fee numeric-extraction fields and historical monetary aggregates were not silently recomputed. The follow-up profiles original lexical strings; linkage v2 separately applies explicit strict lexical eligibility.

Full offline replay uses the external cache at `/workspace/research-cache/tender-20260626` and DuckDB 1.5.6 with its SQLite extension. `fetch_databases.py` downloads verified public entries; `analyze.py`, `followup.py`, `semantic_probe.py` and `linkage_v2.py` retain executed statements and results. The main cache's source/build/macro fingerprint prevents silent reuse after derivation changes. Linkage v2 rebuilds its own versioned derivative. Originals remain read-only. The initial cache registration occurred at handoff after checking the four retained executed build statements; it does not claim the later guard existed before the initial exploratory run.

`followup.json.inputAnalysisSHA256` is the original analysis artifact's execution-time hash. The only later append was `derivationFingerprint`; removing that key and serializing with indent=2 reproduces the execution-time bytes and hash. SQL and rows did not change. This distinction is tested rather than replacing a historical receipt.

Two panel rounds and independent read-only checks are documented in [ANALYSIS_PANEL.md](ANALYSIS_PANEL.md). Current reports do not reinterpret historical acceptance runs as verification of this new slice.
