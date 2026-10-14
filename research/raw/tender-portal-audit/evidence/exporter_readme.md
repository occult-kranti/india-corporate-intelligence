# Tender DB Research Exporter

This is a small, self-contained exporter for turning the upstream tender SQLite snapshots into analysis-ready DuckDB and Parquet files.

The upstream dataset currently comes as two large SQLite databases:

```text
tenders_vps.db
aoc_tenders.db
```

Those files are useful as raw scrape artifacts, but they are not the most convenient shape for researchers. Important fields are stored inside `details_json`, dates and money values are text, and the dataset is split across tender listings and award-of-contract records.

This exporter builds a cleaner research layer:

- stable JSON fields are extracted into normal columns
- dates are parsed into timestamp columns
- money and bid-count fields are parsed into numeric columns where possible
- the known test row is removed from the analysis tables
- raw SQLite files remain the provenance layer
- DuckDB and Parquet outputs are generated for different analysis workflows

## Inputs

Place these files next to `export.py`:

```text
export.py
tenders_vps.db
aoc_tenders.db
```

Make the script executable if needed:

```bash
chmod +x export.py
```

The script uses `uv` inline dependency metadata, so it can be run directly:

```bash
./export.py
```

or:

```bash
uv run --script export.py
```

## Build Everything

```bash
./export.py
```

This creates:

```text
tender_archive.duckdb
export/entity_records.parquet
export/tenders_core.parquet
export/awards_core.parquet
```

Approximate output sizes from a local run:

```text
tender_archive.duckdb       ~2.8 GB
entity_records.parquet      ~1.5 GB
```

## Which Output Should I Use?

Use `tender_archive.duckdb` if you want interactive SQL exploration:

- best for DuckDB UI
- good for ad hoc research
- includes tables, views, metadata, and warnings
- no Python/R setup needed

Use split Parquet if you are working in Python/R:

```text
export/tenders_core.parquet
export/awards_core.parquet
```

This is usually the best shape for Polars, pandas, Arrow, R, and Spark because tenders and awards remain separate entities.

Use single Parquet if you want one portable file:

```text
export/entity_records.parquet
```

This is a union table with an `entity_type` column. It is compact and easy to distribute, but slightly less ergonomic than split Parquet for analysis.

## DuckDB UI Quick Start

Build only the DuckDB archive:

```bash
./export.py --build-duckdb
```

Open it in DuckDB UI:

```bash
duckdb tender_archive.duckdb -ui
```

Then try:

```sql
SELECT * FROM table_counts;
```

Preview tender records:

```sql
SELECT
  internal_id,
  tender_id,
  organisation_name,
  title,
  published_at,
  bid_submission_end_at,
  emd_amount
FROM tenders_core
LIMIT 20;
```

Preview award records:

```sql
SELECT
  internal_id,
  tender_id,
  organisation_name,
  title,
  contract_at,
  contract_value_amount,
  bids_received,
  selected_bidder
FROM awards_core
LIMIT 20;
```

Top organisations by number of awards:

```sql
SELECT
  organisation_name,
  count(*) AS awards,
  round(sum(contract_value_amount), 2) AS total_value
FROM awards_core
GROUP BY organisation_name
ORDER BY awards DESC
LIMIT 25;
```

Single-bid awards:

```sql
SELECT
  organisation_name,
  title,
  contract_at,
  contract_value_amount,
  selected_bidder,
  detail_url
FROM awards_core
WHERE bids_received = 1
ORDER BY contract_value_amount DESC NULLS LAST
LIMIT 50;
```

Search for a topic:

```sql
SELECT
  organisation_name,
  title,
  published_at,
  detail_url
FROM tenders_core
WHERE lower(title || ' ' || coalesce(work_description, '')) LIKE '%school%'
ORDER BY published_at DESC
LIMIT 50;
```

## Python / Polars Quick Start

Export split Parquet:

```bash
./export.py --parquet-split
```

Install Polars if needed:

```bash
uv pip install polars
```

Analyze awards lazily:

```python
import polars as pl

awards = pl.scan_parquet("export/awards_core.parquet")

top_orgs = (
    awards
    .group_by("organisation_name")
    .agg(
        pl.len().alias("award_count"),
        pl.sum("contract_value_amount").alias("total_value"),
    )
    .sort("award_count", descending=True)
    .limit(20)
    .collect()
)

print(top_orgs)
```

Find large single-bid awards:

```python
import polars as pl

awards = pl.scan_parquet("export/awards_core.parquet")

single_bid = (
    awards
    .filter(pl.col("bids_received") == 1)
    .select([
        "organisation_name",
        "title",
        "contract_at",
        "contract_value_amount",
        "selected_bidder",
        "detail_url",
    ])
    .sort("contract_value_amount", descending=True)
    .limit(50)
    .collect()
)

print(single_bid)
```

Analyze the single-file Parquet export:

```bash
./export.py --parquet-single
```

```python
import polars as pl

records = pl.scan_parquet("export/entity_records.parquet")

awards = records.filter(pl.col("entity_type") == "award")

result = (
    awards
    .group_by("organisation_name")
    .agg(
        pl.len().alias("award_count"),
        pl.sum("contract_value_amount").alias("total_value"),
    )
    .sort("award_count", descending=True)
    .limit(20)
    .collect()
)

print(result)
```

## Available Commands

Build the DuckDB archive:

```bash
./export.py --build-duckdb
```

Build with indexes for faster point lookups:

```bash
./export.py --build-duckdb --with-indexes
```

Export one Parquet file:

```bash
./export.py --parquet-single
```

Export split Parquet tables:

```bash
./export.py --parquet-split
```

Build and export everything:

```bash
./export.py --all --out-dir release
```

Print the DuckDB UI command after running:

```bash
./export.py --build-duckdb --ui
```

## Output Tables

`tenders_core`

Tender listing records with normalized detail fields such as:

- `organisation_name`
- `title`
- `reference_number`
- `tender_type`
- `tender_category`
- `product_category`
- `work_description`
- `published_at`
- `bid_submission_end_at`
- `emd_amount`
- `tender_fee_amount`
- `detail_url`

`awards_core`

Award-of-contract records with normalized detail fields such as:

- `organisation_name`
- `title`
- `reference_number`
- `contract_at`
- `award_published_at`
- `contract_value_amount`
- `bids_received`
- `selected_bidder`
- `detail_url`

`entity_records`

A single-table union of tenders and awards:

- `entity_type = 'tender'`
- `entity_type = 'award'`

This is useful when a single Parquet file is required.

`build_warnings`

Rows removed or values that could not be normalized cleanly. The source SQLite files remain the raw reference.

## Why Not One Joined Flat Table?

`tender_id` is not unique enough to safely join tenders and awards into one row per tender.

On the current snapshot, a direct join between `tenders_core` and `awards_core` produces billions of rows because duplicated `tender_id` values create many-to-many matches. That would be misleading and much larger than the source data.

Instead, this exporter provides:

- separate `tenders_core` and `awards_core` tables for correct analysis
- `entity_records` for a compact single-file export
- `tender_award_matches` as a convenience view for users who explicitly want to inspect tender-award matches

## Notes

- `details_json` is not copied into the generated research tables.
- The original SQLite databases remain the provenance/raw layer.
- Secondary indexes are omitted by default to keep `tender_archive.duckdb` smaller.
- DuckDB is recommended for interactive exploration.
- Split Parquet is recommended for Python/R workflows.
- Single Parquet is recommended for compact distribution.
