# Temporal data audit and prospective outcome collection

Research date: 8 October 2026. This audit separates information available before an event from information collected after it. A document's old event date does not make its current contents a historical predictor.

## Decision

The retained tender and World Bank snapshots do **not** support an honest historical corruption-probability model. The tender archive does support retrospective investigation and separately evaluated masked-record reconstruction. A new complete official World Bank baseline now provides **81 active India projects and 243 prospective metadata targets** for future institutional-outcome evaluation. No probabilities or resolved future outcomes have been invented.

The independent evaluation panel reviewed the prospective design before capture: require complete population, original-byte hashes, explicit resolution window, missing outcomes kept unknown, and no interpretation of a metadata revision as a payment or wrongdoing. The parent research lead owns the full panel record.

## What was actually inspected

The June 26 tender release originally supplied by [tender.sarthaksidhant.com](https://tender.sarthaksidhant.com/) is retained locally as two verified SQLite databases. Its previously derived DuckDB tables were opened read-only and queried again for this audit. No source or derived database was deleted.

| Source grain | Rows | Interpretation |
| --- | ---: | --- |
| Notice listings | 3,952,191 | Portal records, not unique awarded contracts |
| Notice details | 3,178,485 | Detail records; one previously identified orphan/test row |
| Award listings | 4,921,960 | Portal award records, including repeated keys/versions |
| Award details | 4,540,739 | Bid-count/value/winner fields; not a payment ledger |
| Exact unique notice/award pairs | 17,704 | Selected one-to-one portal + buyer + tender ID + reference keys |

The original source hashes are `ec8ef7711a17b7cae9e0414c2403b119a0a31c4dec49ed7055b38ec0df5f7586` (awards) and `b1994cfb6dd2d5da9ed1d9ac8d6bbc7083178f155e92a65628e87a38e4c64d01` (notices). They were verified by the earlier full download receipts. This audit reads derived tables and retains the input/build fingerprints; it does not claim to have rehashed the 13 GB originals again.

### Temporal and semantic findings

- Of 17,704 linked pairs, only **10** have a notice listing scrape before the recorded award; **7** have a notice-detail scrape before it. Only **one** has both retained notice scrapes before bid close and an award after close. That is insufficient for train/development/test cohorts.
- The single provisional observation is tender `2026_HRY_527840_1`, construction of an e-library hall in Kharia, Haryana. Its notice closes 16 June 2026; award/contract date is 17 June; the award reports two bids. The archive's timestamp offsets are inconsistent, so even this record requires original timezone review before treating it as a fully eligible historical example. No wrongdoing inference follows.
- **15,816** award-side fields labelled “closing” equal the notice's *publication* timestamp. **Zero** equal the notice's actual closing timestamp. Treating that field as bid close would contaminate duration or competition models.
- Bid fields across the linked subset contain **4,058 single-bid**, **13,397 multiple-bid**, and **249 missing/invalid** observations under an explicit integer-range parser. These are bid-count observations, **not labels of collusion or corruption**.
- No award match means **unobserved**, not “cancelled,” “no award,” or a negative corruption outcome. The archive is not a complete independently resolved tender population.
- A split by the tender's event year does not repair the fact that nearly all predictor records were collected after the outcomes. Repeated buyer/source identities also require separate grouping review.

The executable [`temporal-audit.py`](../../../scripts/research-radar/next-model/temporal-audit.py) stores exact queries, counts, vintage flags and source fingerprints in [`temporal-inventory.json`](../../../research/research-radar/next-model/temporal-inventory.json). It requires DuckDB; the new read-only audit used version 1.5.0. The earlier derivation used 1.5.6. Re-execution produced the same retained query outputs.

## Fresh official World Bank baseline

The [World Bank Projects API](https://search.worldbank.org/api/v3/projects?format=json&countrycode_exact=IN&rows=500&os=0) was fetched directly on 8 October 2026. All three pages are retained byte-for-byte with request URLs, response headers, retrieval timestamps, hashes, record counts and a completeness check. The API returned **1,117 unique India project IDs**, of which **81** have status exactly `Active`. Pagination is not an atomic database transaction; stable totals and unique IDs were checked.

This differs from the retained September 26 catalog, which contains 82 active projects. Project `P166020`, **West Bengal Inland Water Transport, Logistics and Spatial Development Project**, is `Active` in that catalog and `Closed` in the October 8 API snapshot. This is an observed difference between two retained metadata versions. It does not prove a physical completion date, successful delivery or any improper payment.

The baseline stores original current commitment, closing date, project ID, borrower and implementing agency. It does not backdate current fields to approval. `firstAvailableAt` conservatively uses completion of this capture; original publication time is unknown.

For each of the 81 active projects, three outcomes are preregistered:

1. Whether the API's status at the future checkpoint is exactly `Closed`.
2. Whether its recorded closing date at that checkpoint is later than baseline.
3. Whether its recorded current total commitment at that checkpoint exceeds baseline.

These are **institutional metadata states**, not proof of physical completion, delay, disbursement, beneficial ownership, financial loss or misconduct. Amounts are US dollars, as provided in the commitment fields; they are not summed into traced money.

The resolution window is **6–20 April 2027 UTC**. The preregistered rule chooses the first complete official API capture whose earliest retained page retrieval is on or after April 6 and whose last retained page retrieval is no later than April 20. The outcome describes the state at that capture, not an event necessarily occurring before April 6. Deleted/missing records, unrecognized fields, failed fetches and missing eligible snapshots remain **unknown**. An observed unchanged field can provide an explicit negative. All 243 outcomes and probabilities are currently null.

The collector and resolver are implemented. **No recurring collection job is installed or claimed.** Before scoring, a reviewer must confirm that the chosen resolution capture is the first eligible one and verify source meaning. No calibrated performance can be reported without probabilities fixed before outcomes and sufficient resolved observations.

Files:

- [`prospective-worldbank-cohort.json`](../../../research/research-radar/next-model/prospective-worldbank-cohort.json): frozen cohort and target rules.
- [`worldbank-baseline/receipt.json`](../../../research/research-radar/next-model/worldbank-baseline/receipt.json): original-page provenance.
- [`worldbank-cohort.py`](../../../scripts/research-radar/next-model/worldbank-cohort.py): baseline collector, offline byte verification and window-restricted resolver.
- [`worldbank-cohort.test.py`](../../../scripts/research-radar/next-model/worldbank-cohort.test.py): synthetic semantic checks for unknown outcomes, explicit negatives, window rejection and distinct metadata targets. These are software tests, not prediction performance.
- [`temporal-ui-summary.json`](../../../research/research-radar/next-model/temporal-ui-summary.json): compact source-bound UI projection with all 81 projects, three baseline variables, target definitions, dates and unestimated probabilities.

The independent evaluation review also required URL/country/pagination validation, original project-ID checks, ordered capture timestamps, and an explicit human audit of the first eligible future capture. Those checks were implemented and verified. Before publication, the selection wording was clarified to refer to retained page-retrieval timestamps rather than an unrecorded first-request start time; the target definitions and April window did not change.

## What can improve training now

Train source relevance, exact entity matching, typed graph relationships and explicit abstention on independently reviewed labels. If award fields are masked and reconstructed, evaluate that as **retrospective source-field reconstruction**, with entity/source-family splits and simple baselines. Do not rename it a pre-award forecast.

The existing 23-scenario investigation registry is a purposive research set, not a representative resolved-outcome cohort. It remains useful for dated documentary follow-up. The new World Bank cohort adds a complete, reproducible starting population for one narrow class of observable outcomes. Acquiring original dated tender notices, amendments, evaluation minutes, award notices, treasury vouchers, delivery acceptances and audited recovery records is still necessary for a defensible money-flow forecast.

## Reproduce

From the repository root:

```sh
python scripts/research-radar/next-model/temporal-audit.py --verify
python scripts/research-radar/next-model/worldbank-cohort.py --verify
python scripts/research-radar/next-model/worldbank-cohort.test.py
```

The tender audit needs the preserved local cache and DuckDB. World Bank verification and semantic tests use only the Python standard library and retained source files. The initial `--capture-baseline` command refuses to overwrite the frozen cohort. A future capture can be made with `--capture-resolution research/research-radar/next-model/worldbank-resolution-20270406`, followed by `--resolve` pointing to its receipt; the resolver rejects captures outside the preregistered window.
