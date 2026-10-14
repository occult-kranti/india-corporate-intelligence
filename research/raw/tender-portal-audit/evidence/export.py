#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = [
#   "duckdb>=1.1.0",
# ]
# ///
"""
Tender DB export utility.

This is the single-file distribution script for turning the upstream tender
SQLite snapshots into analysis-ready DuckDB and Parquet artifacts.

Expected input files, by default in the same directory as this script:

    tenders_vps.db
    aoc_tenders.db

Default command:

    uv run --script export.py

Default outputs:

    tender_archive.duckdb
    export/entity_records.parquet
    export/tenders_core.parquet
    export/awards_core.parquet

Output formats:

    tender_archive.duckdb
        Best for interactive SQL analysis and DuckDB UI. Contains normalized
        tables, metadata, warnings, and convenience views.

    export/entity_records.parquet
        Single-file portable dataset. This is a union of tender and award rows
        with an entity_type column. It is compact and easy to mirror.

    export/tenders_core.parquet + export/awards_core.parquet
        Split Parquet tables. This is usually the best shape for Python/R
        workflows because tender and award entities remain separate.

Why there is no joined one-row-per-tender file:

    tender_id is not unique enough across both source tables. A direct join
    between tenders and awards creates billions of rows on the current snapshot,
    so this script avoids producing a misleading or enormous flat join.

Useful commands:

    uv run --script export.py --build-duckdb
    uv run --script export.py --parquet-single
    uv run --script export.py --parquet-split
    uv run --script export.py --all --out-dir release
    uv run --script export.py --build-duckdb --with-indexes
    uv run --script export.py --ui

Notes:

    - The generated DuckDB omits the raw details_json columns after extracting
      stable fields into typed columns.
    - The source SQLite files remain the provenance/raw layer.
    - The known test row internal_id='test_id_1' is removed from the generated
      analysis tables and recorded in build_warnings.
    - Secondary indexes are omitted by default to keep the archive compact.
"""
from __future__ import annotations

import argparse
import os
from pathlib import Path

import duckdb


ROOT = Path(__file__).resolve().parent
DEFAULT_TENDERS_DB = ROOT / "tenders_vps.db"
DEFAULT_AOC_DB = ROOT / "aoc_tenders.db"
DEFAULT_DUCKDB = ROOT / "tender_archive.duckdb"
DEFAULT_OUT_DIR = ROOT / "export"
BUILD_SQL_TEMPLATE = r"""
LOAD sqlite;

ATTACH '__TENDERS_DB__' AS tender_src (TYPE sqlite);
ATTACH '__AOC_DB__' AS aoc_src (TYPE sqlite);

CREATE OR REPLACE MACRO parse_portal_ts(x) AS try_strptime(x, '%d-%b-%Y %I:%M %p');
CREATE OR REPLACE MACRO clean_amount(x) AS try_cast(
  nullif(regexp_replace(coalesce(x, ''), '[^0-9.-]', '', 'g'), '') AS DOUBLE
);
CREATE OR REPLACE MACRO clean_int(x) AS try_cast(
  nullif(regexp_replace(coalesce(x, ''), '[^0-9-]', '', 'g'), '') AS INTEGER
);
CREATE OR REPLACE MACRO empty_to_null(x) AS nullif(trim(coalesce(x, '')), '');

CREATE OR REPLACE TABLE build_metadata AS
SELECT 'build_archive_schema_version' AS key, '1' AS value
UNION ALL SELECT 'source_tenders_db', '__TENDERS_DB__'
UNION ALL SELECT 'source_aoc_db', '__AOC_DB__'
UNION ALL SELECT 'source_tenders_rows', count(*)::VARCHAR FROM tender_src.tenders
UNION ALL SELECT 'source_tender_details_rows', count(*)::VARCHAR FROM tender_src.tender_details
UNION ALL SELECT 'source_aoc_tenders_rows', count(*)::VARCHAR FROM aoc_src.aoc_tenders
UNION ALL SELECT 'source_aoc_details_rows', count(*)::VARCHAR FROM aoc_src.aoc_details;

CREATE OR REPLACE TABLE tenders_core AS
WITH details AS (
  SELECT
    internal_id,
    tender_id,
    json_extract_string(details_json, '$."Tender Type"') AS tender_type,
    json_extract_string(details_json, '$."Tender Category"') AS tender_category,
    json_extract_string(details_json, '$."Name"') AS contact_name,
    json_extract_string(details_json, '$."Address"') AS contact_address,
    json_extract_string(details_json, '$."Location"') AS location,
    json_extract_string(details_json, '$."Product Category"') AS product_category,
    json_extract_string(details_json, '$."Product Sub-Category"') AS product_sub_category,
    json_extract_string(details_json, '$."Work Description"') AS work_description,
    json_extract_string(details_json, '$."Organisation Name"') AS detail_organisation_name,
    json_extract_string(details_json, '$."Organisation Type"') AS organisation_type,
    json_extract_string(details_json, '$."Tender Document"') AS tender_document_url,
    json_extract_string(details_json, '$."Tender Reference Number"') AS detail_reference_number,
    json_extract_string(details_json, '$."Tender Title"') AS detail_title,
    coalesce(
      json_extract_string(details_json, '$."EMD *"'),
      json_extract_string(details_json, '$."EMD"')
    ) AS emd_raw,
    coalesce(
      json_extract_string(details_json, '$."Tender Fee *"'),
      json_extract_string(details_json, '$."Tender Fee"')
    ) AS tender_fee_raw,
    json_extract_string(details_json, '$."ePublished Date"') AS detail_published_at_raw,
    json_extract_string(details_json, '$."Bid Opening Date"') AS detail_bid_opening_at_raw,
    json_extract_string(details_json, '$."Bid Submission Start Date"') AS bid_submission_start_at_raw,
    json_extract_string(details_json, '$."Bid Submission End Date"') AS detail_bid_submission_end_at_raw,
    json_extract_string(details_json, '$."Document Download Start Date"') AS document_download_start_at_raw,
    json_extract_string(details_json, '$."Document Download End Date"') AS document_download_end_at_raw
  FROM tender_src.tender_details
  WHERE internal_id <> 'test_id_1'
)
SELECT
  t.internal_id,
  coalesce(empty_to_null(t.tender_id), empty_to_null(d.tender_id)) AS tender_id,
  t.portal_type,
  t.partition_id,
  t.status,
  t.serial_number,
  coalesce(empty_to_null(t.organisation_name), empty_to_null(d.detail_organisation_name)) AS organisation_name,
  d.organisation_type,
  coalesce(empty_to_null(t.title), empty_to_null(d.detail_title)) AS title,
  coalesce(empty_to_null(t.reference_number), empty_to_null(d.detail_reference_number)) AS reference_number,
  d.tender_type,
  d.tender_category,
  d.product_category,
  d.product_sub_category,
  d.work_description,
  d.location,
  d.contact_name,
  d.contact_address,
  d.emd_raw,
  clean_amount(d.emd_raw) AS emd_amount,
  d.tender_fee_raw,
  clean_amount(d.tender_fee_raw) AS tender_fee_amount,
  parse_portal_ts(coalesce(empty_to_null(t.e_published_date), empty_to_null(d.detail_published_at_raw))) AS published_at,
  parse_portal_ts(d.bid_submission_start_at_raw) AS bid_submission_start_at,
  parse_portal_ts(coalesce(empty_to_null(t.bid_submission_closing_date), empty_to_null(d.detail_bid_submission_end_at_raw))) AS bid_submission_end_at,
  parse_portal_ts(coalesce(empty_to_null(t.tender_opening_date), empty_to_null(d.detail_bid_opening_at_raw))) AS bid_opening_at,
  parse_portal_ts(d.document_download_start_at_raw) AS document_download_start_at,
  parse_portal_ts(d.document_download_end_at_raw) AS document_download_end_at,
  t.detail_url,
  d.tender_document_url,
  t.corrigendum_url
FROM tender_src.tenders t
LEFT JOIN details d ON d.internal_id = t.internal_id
WHERE t.internal_id <> 'test_id_1';

CREATE OR REPLACE TABLE awards_core AS
WITH details AS (
  SELECT
    internal_id,
    tender_id,
    json_extract_string(details_json, '$."Tender Type"') AS tender_type,
    json_extract_string(details_json, '$."Contract Date"') AS contract_date_raw,
    json_extract_string(details_json, '$."Contract Value"') AS contract_value_raw,
    json_extract_string(details_json, '$."Tender Document"') AS tender_document_url,
    json_extract_string(details_json, '$."Tender Ref. No."') AS detail_ref_no,
    json_extract_string(details_json, '$."Organisation Name"') AS detail_organisation_name,
    json_extract_string(details_json, '$."Tender Description"') AS tender_description,
    json_extract_string(details_json, '$."Number of bids received"') AS bids_received_raw,
    json_extract_string(details_json, '$."Name of the selected bidder(s)"') AS selected_bidder,
    json_extract_string(details_json, '$."Address of the selected bidder(s)"') AS selected_bidder_address,
    json_extract_string(details_json, '$."Date of Completion/Completion Period in Days"') AS completion_period_raw,
    coalesce(
      json_extract_string(details_json, '$."Award Published Date"'),
      json_extract_string(details_json, '$."Published Date"')
    ) AS award_published_at_raw
  FROM aoc_src.aoc_details
)
SELECT
  a.internal_id,
  coalesce(empty_to_null(a.tender_id), empty_to_null(d.tender_id)) AS tender_id,
  a.portal_type,
  a.year AS portal_year,
  a.partition_id,
  a.sl_no,
  coalesce(empty_to_null(a.org_name), empty_to_null(d.detail_organisation_name)) AS organisation_name,
  a.title,
  coalesce(empty_to_null(a.ref_no), empty_to_null(d.detail_ref_no)) AS reference_number,
  d.tender_type,
  d.tender_description,
  parse_portal_ts(a.aoc_date) AS aoc_at,
  parse_portal_ts(a.closing_date) AS closing_at,
  parse_portal_ts(d.contract_date_raw) AS contract_at,
  parse_portal_ts(d.award_published_at_raw) AS award_published_at,
  d.contract_value_raw,
  clean_amount(d.contract_value_raw) AS contract_value_amount,
  d.bids_received_raw,
  clean_int(d.bids_received_raw) AS bids_received,
  d.selected_bidder,
  d.selected_bidder_address,
  d.completion_period_raw,
  a.detail_url,
  d.tender_document_url
FROM aoc_src.aoc_tenders a
LEFT JOIN details d ON d.internal_id = a.internal_id;

CREATE OR REPLACE TABLE build_warnings AS
SELECT
  'removed_test_row' AS warning_type,
  'tender_details' AS source_table,
  internal_id,
  tender_id,
  details_json AS note
FROM tender_src.tender_details
WHERE internal_id = 'test_id_1'

UNION ALL

SELECT
  'invalid_document_download_start_at' AS warning_type,
  'tender_details' AS source_table,
  internal_id,
  tender_id,
  json_extract_string(details_json, '$."Document Download Start Date"') AS note
FROM tender_src.tender_details
WHERE internal_id <> 'test_id_1'
  AND json_extract_string(details_json, '$."Document Download Start Date"') IS NOT NULL
  AND parse_portal_ts(json_extract_string(details_json, '$."Document Download Start Date"')) IS NULL

UNION ALL

SELECT
  'invalid_document_download_end_at' AS warning_type,
  'tender_details' AS source_table,
  internal_id,
  tender_id,
  json_extract_string(details_json, '$."Document Download End Date"') AS note
FROM tender_src.tender_details
WHERE internal_id <> 'test_id_1'
  AND json_extract_string(details_json, '$."Document Download End Date"') IS NOT NULL
  AND parse_portal_ts(json_extract_string(details_json, '$."Document Download End Date"')) IS NULL;

CREATE OR REPLACE TABLE organisations AS
SELECT
  row_number() OVER (ORDER BY organisation_name) AS organisation_id,
  organisation_name
FROM (
  SELECT DISTINCT organisation_name
  FROM (
    SELECT organisation_name FROM tenders_core
    UNION ALL
    SELECT organisation_name FROM awards_core
  )
  WHERE organisation_name IS NOT NULL AND trim(organisation_name) <> ''
);

CREATE OR REPLACE VIEW tender_award_matches AS
SELECT
  t.internal_id AS tender_internal_id,
  a.internal_id AS award_internal_id,
  t.tender_id,
  coalesce(a.organisation_name, t.organisation_name) AS organisation_name,
  coalesce(a.title, t.title) AS title,
  t.published_at,
  t.bid_submission_end_at,
  a.contract_at,
  a.award_published_at,
  a.contract_value_amount,
  a.bids_received,
  a.selected_bidder
FROM tenders_core t
JOIN awards_core a ON a.tender_id = t.tender_id
WHERE t.tender_id IS NOT NULL;

CREATE OR REPLACE VIEW entity_records AS
SELECT
  'tender' AS entity_type,
  internal_id,
  tender_id,
  portal_type,
  partition_id,
  status,
  serial_number,
  NULL::BIGINT AS portal_year,
  NULL::VARCHAR AS sl_no,
  organisation_name,
  organisation_type,
  title,
  reference_number,
  tender_type,
  tender_category,
  product_category,
  product_sub_category,
  work_description,
  NULL::VARCHAR AS tender_description,
  location,
  contact_name,
  contact_address,
  emd_raw,
  emd_amount,
  tender_fee_raw,
  tender_fee_amount,
  published_at,
  bid_submission_start_at,
  bid_submission_end_at,
  bid_opening_at,
  document_download_start_at,
  document_download_end_at,
  NULL::TIMESTAMP AS aoc_at,
  NULL::TIMESTAMP AS closing_at,
  NULL::TIMESTAMP AS contract_at,
  NULL::TIMESTAMP AS award_published_at,
  NULL::VARCHAR AS contract_value_raw,
  NULL::DOUBLE AS contract_value_amount,
  NULL::VARCHAR AS bids_received_raw,
  NULL::INTEGER AS bids_received,
  NULL::VARCHAR AS selected_bidder,
  NULL::VARCHAR AS selected_bidder_address,
  NULL::VARCHAR AS completion_period_raw,
  detail_url,
  tender_document_url,
  corrigendum_url
FROM tenders_core

UNION ALL

SELECT
  'award' AS entity_type,
  internal_id,
  tender_id,
  portal_type,
  partition_id,
  NULL::VARCHAR AS status,
  NULL::VARCHAR AS serial_number,
  portal_year,
  sl_no,
  organisation_name,
  NULL::VARCHAR AS organisation_type,
  title,
  reference_number,
  tender_type,
  NULL::VARCHAR AS tender_category,
  NULL::VARCHAR AS product_category,
  NULL::VARCHAR AS product_sub_category,
  NULL::VARCHAR AS work_description,
  tender_description,
  NULL::VARCHAR AS location,
  NULL::VARCHAR AS contact_name,
  NULL::VARCHAR AS contact_address,
  NULL::VARCHAR AS emd_raw,
  NULL::DOUBLE AS emd_amount,
  NULL::VARCHAR AS tender_fee_raw,
  NULL::DOUBLE AS tender_fee_amount,
  NULL::TIMESTAMP AS published_at,
  NULL::TIMESTAMP AS bid_submission_start_at,
  NULL::TIMESTAMP AS bid_submission_end_at,
  NULL::TIMESTAMP AS bid_opening_at,
  NULL::TIMESTAMP AS document_download_start_at,
  NULL::TIMESTAMP AS document_download_end_at,
  aoc_at,
  closing_at,
  contract_at,
  award_published_at,
  contract_value_raw,
  contract_value_amount,
  bids_received_raw,
  bids_received,
  selected_bidder,
  selected_bidder_address,
  completion_period_raw,
  detail_url,
  tender_document_url,
  NULL::VARCHAR AS corrigendum_url
FROM awards_core;

CREATE OR REPLACE TABLE table_counts AS
SELECT 'tenders_core' AS table_name, count(*) AS rows FROM tenders_core
UNION ALL SELECT 'awards_core', count(*) FROM awards_core
UNION ALL SELECT 'organisations', count(*) FROM organisations
UNION ALL SELECT 'build_warnings', count(*) FROM build_warnings;

CHECKPOINT;
"""


def sql_quote(path: Path) -> str:
    """Return a string safely usable inside a single-quoted DuckDB SQL literal."""
    return str(path).replace("'", "''")


def human_size(path: Path) -> str:
    """Format a file size using compact binary units."""
    size = path.stat().st_size
    units = ["B", "K", "M", "G", "T"]
    value = float(size)
    for unit in units:
        if value < 1024 or unit == units[-1]:
            return f"{value:.1f}{unit}" if unit != "B" else f"{int(value)}B"
        value /= 1024
    return f"{size}B"


def connect(path: Path) -> duckdb.DuckDBPyConnection:
    """Open a DuckDB database file."""
    return duckdb.connect(str(path))


def build_archive(tenders_db: Path, aoc_db: Path, duckdb_path: Path, with_indexes: bool) -> None:
    """Build the normalized DuckDB archive from the two upstream SQLite files."""
    if not tenders_db.exists():
        raise SystemExit(f"Missing tenders DB: {tenders_db}")
    if not aoc_db.exists():
        raise SystemExit(f"Missing AOC DB: {aoc_db}")
    for suffix in ("", ".wal"):
        candidate = Path(str(duckdb_path) + suffix)
        if candidate.exists():
            candidate.unlink()

    sql = BUILD_SQL_TEMPLATE
    sql = sql.replace("__TENDERS_DB__", sql_quote(tenders_db))
    sql = sql.replace("__AOC_DB__", sql_quote(aoc_db))

    print(f"Building DuckDB archive: {duckdb_path}")
    con = connect(duckdb_path)
    try:
        con.execute(sql)
        if with_indexes:
            print("Creating optional indexes")
            con.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_tenders_core_internal_id ON tenders_core(internal_id);
                CREATE INDEX IF NOT EXISTS idx_tenders_core_tender_id ON tenders_core(tender_id);
                CREATE INDEX IF NOT EXISTS idx_awards_core_internal_id ON awards_core(internal_id);
                CREATE INDEX IF NOT EXISTS idx_awards_core_tender_id ON awards_core(tender_id);
                CHECKPOINT;
                """
            )
        counts = con.execute("SELECT * FROM table_counts ORDER BY table_name").fetchall()
    finally:
        con.close()

    print_counts(counts)
    print(f"Built {duckdb_path} ({human_size(duckdb_path)})")


def print_counts(rows: list[tuple[str, int]]) -> None:
    """Print table row counts in a readable form."""
    print("Table counts:")
    for table_name, count in rows:
        print(f"  {table_name}: {count:,}")


def export_parquet(
    duckdb_path: Path,
    out_dir: Path,
    parquet_single: bool,
    parquet_split: bool,
) -> None:
    """Export single-file and/or split Parquet artifacts from the DuckDB archive."""
    if not duckdb_path.exists():
        raise SystemExit(f"Missing DuckDB archive: {duckdb_path}")

    out_dir.mkdir(parents=True, exist_ok=True)
    con = connect(duckdb_path)
    try:
        if parquet_single:
            output = out_dir / "entity_records.parquet"
            print(f"Exporting {output}")
            con.execute(
                f"""
                COPY entity_records
                TO '{sql_quote(output)}'
                (FORMAT PARQUET, COMPRESSION ZSTD);
                """
            )

        if parquet_split:
            tenders_output = out_dir / "tenders_core.parquet"
            awards_output = out_dir / "awards_core.parquet"
            print(f"Exporting {tenders_output}")
            con.execute(
                f"""
                COPY tenders_core
                TO '{sql_quote(tenders_output)}'
                (FORMAT PARQUET, COMPRESSION ZSTD);
                """
            )
            print(f"Exporting {awards_output}")
            con.execute(
                f"""
                COPY awards_core
                TO '{sql_quote(awards_output)}'
                (FORMAT PARQUET, COMPRESSION ZSTD);
                """
            )
    finally:
        con.close()

    for path in sorted(out_dir.glob("*.parquet")):
        print(f"{human_size(path)} {path}")


def parse_args() -> argparse.Namespace:
    """Parse command-line options for the single-file export utility."""
    parser = argparse.ArgumentParser(
        description=(
            "Build and export analysis-ready tender datasets from upstream SQLite files. "
            "Run with no mode flags to build DuckDB plus single and split Parquet outputs."
        ),
        epilog=(
            "Examples:\n"
            "  uv run --script export.py\n"
            "  uv run --script export.py --build-duckdb\n"
            "  uv run --script export.py --parquet-single\n"
            "  uv run --script export.py --parquet-split\n"
            "  uv run --script export.py --all --out-dir release\n"
            "  uv run --script export.py --build-duckdb --with-indexes\n"
            "  uv run --script export.py --ui\n"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--tenders-db",
        type=Path,
        default=DEFAULT_TENDERS_DB,
        help="source tenders SQLite DB (default: ./tenders_vps.db)",
    )
    parser.add_argument(
        "--aoc-db",
        type=Path,
        default=DEFAULT_AOC_DB,
        help="source award-of-contract SQLite DB (default: ./aoc_tenders.db)",
    )
    parser.add_argument(
        "--duckdb",
        type=Path,
        default=DEFAULT_DUCKDB,
        help="DuckDB archive path (default: ./tender_archive.duckdb)",
    )
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=DEFAULT_OUT_DIR,
        help="directory for Parquet exports (default: ./export)",
    )
    parser.add_argument(
        "--build-duckdb",
        action="store_true",
        help="build only the normalized DuckDB archive unless combined with Parquet flags",
    )
    parser.add_argument(
        "--with-indexes",
        action="store_true",
        help="add internal_id/tender_id indexes to the DuckDB archive; larger but better for point lookups",
    )
    parser.add_argument(
        "--parquet-single",
        action="store_true",
        help="export entity_records.parquet, a single-file union of tender and award rows",
    )
    parser.add_argument(
        "--parquet-split",
        action="store_true",
        help="export tenders_core.parquet and awards_core.parquet for Python/R workflows",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="build DuckDB and export both single and split Parquet outputs",
    )
    parser.add_argument(
        "--ui",
        action="store_true",
        help="print the DuckDB UI command after build/export",
    )
    return parser.parse_args()


def main() -> None:
    """Run the requested build/export workflow."""
    args = parse_args()

    mode_selected = args.build_duckdb or args.parquet_single or args.parquet_split or args.all
    build_duckdb = args.build_duckdb or args.all or not mode_selected
    parquet_single = args.parquet_single or args.all or not mode_selected
    parquet_split = args.parquet_split or args.all or not mode_selected

    tenders_db = args.tenders_db.resolve()
    aoc_db = args.aoc_db.resolve()
    duckdb_path = args.duckdb.resolve()
    out_dir = args.out_dir.resolve()

    if build_duckdb:
        build_archive(tenders_db, aoc_db, duckdb_path, args.with_indexes)

    if parquet_single or parquet_split:
        export_parquet(duckdb_path, out_dir, parquet_single, parquet_split)

    if args.ui:
        print(f"Open the DuckDB UI with:\n  duckdb {duckdb_path} -ui")


if __name__ == "__main__":
    os.chdir(ROOT)
    main()
