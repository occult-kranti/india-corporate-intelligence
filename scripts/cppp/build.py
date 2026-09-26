#!/usr/bin/env python3
"""CPPP award pipeline: quality first, then rates, concentration, timing and red flags.

    python3 scripts/cppp/build.py --arrow-dir <dir with *.arrow> --out research/raw/cppp --as-of 2026-09-26

Reads every *.arrow file in --arrow-dir (Arrow IPC stream or file format, memory-mapped),
registers the concatenated table in duckdb and writes six JSON files. Every file carries a
`provenance` block with the input digests, raw and deduplicated row counts, the dedup rule
and the exact SQL of every table (the module-level constants in SQL below, verbatim), so a
reader can re-derive any number.

THE REFUSAL. The scrape holds hundreds of thousands of personal names of small contractors.
No output names a winner unless the name carries a legal-form or trade marker (MARKER_RE) and,
where a winner is listed per buyer, only with >= 5 awards for that buyer. The portal joins
several winners of one tender into one comma-separated selected_bidder string, so the marker
test is applied to EVERY comma/semicolon-separated component (MARKED_RULE): one marked firm
in the list does not license the bare names beside it. Unmarked names are counted as
"unmarked" and never written. selected_bidder_address is never read.

Not in CI (needs duckdb + pyarrow; inputs are 3.45 GB). Tests: python3 -m unittest scripts/cppp/test_build.py
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import subprocess
import sys
import time
from pathlib import Path

import duckdb
import pyarrow as pa
import pyarrow.ipc as ipc

# --------------------------------------------------------------------------------------
# Rules, stated once and written into every provenance block
# --------------------------------------------------------------------------------------
DEDUP_RULE = "one row per (tender_id, selected_bidder_norm, aoc_at) — the first by internal_id"
DEDUP_RULE_DETAIL = (
    "selected_bidder_norm = lower(trim(selected_bidder)); NULL bidders compare equal within a tender_id; "
    "internal_id is a 32-hex string so 'first' is lexicographic. The alternative rule 'one row per tender_id' "
    "is counted alongside so the reader sees the range; it is NOT applied because a tender with several lots "
    "awarded to different bidders is several award decisions."
)
DENOMINATOR = "awards after dedup with bids_received >= 1 and <= 1000"
BUYER_RULE = (
    "central portal: the first '||' segment of organisation_name, then the first '/' segment of that, trimmed (the "
    "portal encodes organisation||department||division, and 772 organisations write the same hierarchy with '/' — "
    "'Bharat Petroleum Corporation Limited/RETAIL (LOG)/RETAIL (LOG)-WR'; the first segment is the public body); "
    "state portal: organisation_name is the STATE, so the buyer is "
    "'<state> / <department code>' with the code parsed from tender_id (^\\d{4}_([A-Za-z][A-Za-z0-9]*)_\\d+_\\d+$), "
    "or '<state> / unparsed' where the id carries no code"
)
RATES_CAVEAT = (
    "No rate here is an Indian national statistic. The live verification sample (scripts/cppp/verify_sample.py, "
    "research/raw/cppp/sample-verification.json) was drawn and fetched on 2026-09-26: all 40 stored detail_url links "
    "returned the portal's 'Invalid Url.Please Check' page (the links carry a June-2026 validity token), so not one field "
    "could be checked against the portal. bids_received, selected_bidder, contract_value and aoc_at remain 'reported' "
    "(dataset-only) for every row and the dataset's agreement with the portal is unknown. Every number describes this "
    "scrape after the stated dedup rule, over the stated denominator, and nothing else."
)
POOL_MIN_N = 30
CONCENTRATION_MIN_AWARDS = 50
NAME_MIN_AWARDS = 5
SHORT_DECISION_DAYS = 2

MARKER_RE = (
    r"ltd|limited|pvt|private|llp|m/s|infra|construct|enterprise|corporation|company|co\.|associates|traders|"
    r"agencies|industries|technolog|solutions|services|builders|engineers|contractors|suppliers|&|and sons|"
    r"society|samiti|sangh|mandal|federation|trust|bank|udyog|nigam|pariyojana"
)
_MARKER_PY = re.compile(MARKER_RE, re.I)
# The portal lists several winners of one tender in one selected_bidder string, separated by ','
# (1,205,994 of 4,540,739 named rows on 2026-09-26) — 'ABRAHAM P M,VIJAY CONSTRUCTIONS'. A row is
# marked only when EVERY non-empty component matches; a list holding one bare name is unmarked.
COMPONENT_SEP = "[,;]"
MARKED_RULE = (
    "a selected_bidder is 'marked' only when every non-empty component of the string split on ',' or ';' matches "
    "markerRegex (case-insensitive); a joined list holding one bare personal name is unmarked as a whole and never written"
)
_COMPONENTS_SQL = f"list_filter(string_split_regex(lower(selected_bidder), '{COMPONENT_SEP}'), lambda x: trim(x) <> '')"
MARKED_SQL = (f"selected_bidder IS NOT NULL AND len({_COMPONENTS_SQL}) > 0 AND "
              f"len(list_filter({_COMPONENTS_SQL}, lambda x: NOT regexp_matches(x, '{MARKER_RE}'))) = 0")


def name_components(name) -> list[str]:
    """The non-empty ',' / ';'-separated components of a selected_bidder string."""
    if name is None:
        return []
    return [c.strip() for c in re.split(COMPONENT_SEP, str(name)) if c.strip()]


def is_marked(name) -> bool:
    """Python twin of MARKED_SQL: every component carries a marker."""
    parts = name_components(name)
    return bool(parts) and all(_MARKER_PY.search(p) for p in parts)


VALUE_BANDS = [
    {"band": "<₹10 L", "lo": 0, "hi": 1_000_000},
    {"band": "₹10 L–1 cr", "lo": 1_000_000, "hi": 10_000_000},
    {"band": "₹1–10 cr", "lo": 10_000_000, "hi": 100_000_000},
    {"band": "₹10–100 cr", "lo": 100_000_000, "hi": 1_000_000_000},
    {"band": ">₹100 cr", "lo": 1_000_000_000, "hi": None},
]
VALUE_BAND_OTHER = "value missing or implausible"
IMPLAUSIBLE_VALUE = "contract_value_amount IS NULL OR contract_value_amount <= 0 OR contract_value_amount > 1e12"
TENDER_TYPE_CLASSES = ["Works", "Goods", "Services", "Limited", "Other/unknown"]
YEAR_MIN, YEAR_MAX = 2011, 2027

# --------------------------------------------------------------------------------------
# SQL — every string here is written verbatim into provenance.sql
# --------------------------------------------------------------------------------------
LIMITED_RE = "^(limited|lt|lmtd|limted|closed limited)($|[^a-z])"  # 'Limited', 'LIMITED TENDER-SRM', 'Limited.', 'LT', 'Limited Tender(Mtrl)', ...
NON_OPEN_LABEL_RE = "single|nomination|nom($|[^a-z])|ste($|[^a-z])|rate contract|repeat order|committee|closed|pac|oem|proprietary"
_TENDER_TYPE_NORM = f"""CASE WHEN lower(trim(tender_type)) = 'works' THEN 'Works' WHEN lower(trim(tender_type)) = 'goods' THEN 'Goods'
        WHEN lower(trim(tender_type)) IN ('services', 'service') THEN 'Services'
        WHEN regexp_matches(lower(trim(tender_type)), '{LIMITED_RE}') THEN 'Limited' ELSE 'Other/unknown' END"""

SQL: dict[str, str] = {}

SQL["base"] = f"""CREATE OR REPLACE VIEW base AS
SELECT internal_id, tender_id, portal_type,
       CASE portal_type WHEN 0 THEN 'central' WHEN 1 THEN 'state' ELSE 'unknown' END AS portal,
       portal_year, organisation_name, tender_type, aoc_at, closing_at, contract_at,
       contract_value_raw, contract_value_amount, bids_received_raw, bids_received, selected_bidder,
       lower(trim(selected_bidder)) AS bidder_norm,
       ({MARKED_SQL}) AS marked,
       {_TENDER_TYPE_NORM} AS tender_type_norm,
       CASE WHEN portal_type = 0 THEN trim(split_part(split_part(organisation_name, '||', 1), '/', 1))
            ELSE organisation_name || ' / ' || coalesce(nullif(regexp_extract(tender_id, '^\\d{{4}}_([A-Za-z][A-Za-z0-9]*)_\\d+_\\d+$', 1), ''), 'unparsed')
       END AS buyer,
       CASE WHEN {IMPLAUSIBLE_VALUE} THEN '{VALUE_BAND_OTHER}'
            WHEN contract_value_amount < 1e6 THEN '{VALUE_BANDS[0]["band"]}'
            WHEN contract_value_amount < 1e7 THEN '{VALUE_BANDS[1]["band"]}'
            WHEN contract_value_amount < 1e8 THEN '{VALUE_BANDS[2]["band"]}'
            WHEN contract_value_amount < 1e9 THEN '{VALUE_BANDS[3]["band"]}'
            ELSE '{VALUE_BANDS[4]["band"]}' END AS value_band,
       date_diff('day', closing_at, aoc_at) AS days_to_aoc,
       year(aoc_at) AS aoc_year,
       ((month(aoc_at) + 8) % 12) + 1 AS fy_month,
       organisation_name IS NULL OR trim(organisation_name) = '' OR lower(organisation_name) LIKE 'test%' AS junk_org
FROM t"""

SQL["dedup"] = """CREATE OR REPLACE VIEW dedup AS
SELECT * EXCLUDE (rn) FROM (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY tender_id, bidder_norm, aoc_at ORDER BY internal_id) AS rn FROM base
) WHERE rn = 1"""

SQL["rated"] = "CREATE OR REPLACE VIEW rated AS SELECT * FROM dedup WHERE bids_received >= 1 AND bids_received <= 1000"

SQL["quality_raw"] = """SELECT count(*) AS rows, count(DISTINCT tender_id) AS distinct_tender_ids,
       count(DISTINCT internal_id) AS distinct_internal_ids,
       count(*) FILTER (WHERE portal_type = 0) AS central_rows, count(*) FILTER (WHERE portal_type = 1) AS state_rows,
       count(*) FILTER (WHERE portal_type NOT IN (0, 1) OR portal_type IS NULL) AS unknown_portal_rows
FROM base"""

SQL["quality_by_portal_year"] = """SELECT portal, portal_year, count(*) AS rows FROM base GROUP BY 1, 2 ORDER BY 1, 2"""

SQL["quality_duplicates"] = """WITH per_tender AS (SELECT tender_id, count(*) AS k FROM base GROUP BY 1)
SELECT count(*) FILTER (WHERE k > 1) AS tender_ids_with_multiple_rows,
       sum(k) FILTER (WHERE k > 1) AS rows_sharing_a_tender_id,
       count(*) FILTER (WHERE k = 1) AS k1, count(*) FILTER (WHERE k = 2) AS k2,
       count(*) FILTER (WHERE k BETWEEN 3 AND 5) AS k3_5, count(*) FILTER (WHERE k BETWEEN 6 AND 10) AS k6_10,
       count(*) FILTER (WHERE k > 10) AS k_over_10, max(k) AS max_rows_per_tender_id
FROM per_tender"""

SQL["quality_tender_id_shapes"] = """SELECT regexp_replace(tender_id, '[0-9]+', '9', 'g') AS shape, portal, count(*) AS n, count(DISTINCT tender_id) AS distinct_ids
FROM base GROUP BY 1, 2 ORDER BY n DESC, shape, portal LIMIT 15"""
SQL["quality_heaviest_tender_ids"] = """SELECT tender_id, portal, count(*) AS rows, count(DISTINCT bidder_norm) AS distinct_bidders, count(DISTINCT aoc_at) AS distinct_aoc
FROM base GROUP BY 1, 2 ORDER BY rows DESC, tender_id, portal LIMIT 10"""
SQL["quality_dedup_counts"] = """SELECT (SELECT count(*) FROM base) AS raw_rows, (SELECT count(*) FROM dedup) AS dedup_rows,
       (SELECT count(DISTINCT tender_id) FROM base) AS one_per_tender_id_rows,
       (SELECT count(*) FROM (SELECT tender_id, bidder_norm FROM base GROUP BY ALL)) AS one_per_tender_bidder_rows"""

SQL["quality_nulls"] = """SELECT
  count(*) FILTER (WHERE organisation_name IS NULL) AS organisation_name_null,
  count(*) FILTER (WHERE trim(organisation_name) = '') AS organisation_name_blank,
  count(*) FILTER (WHERE tender_type IS NULL) AS tender_type_null,
  count(*) FILTER (WHERE trim(tender_type) = '') AS tender_type_blank,
  count(*) FILTER (WHERE aoc_at IS NULL) AS aoc_at_null, count(*) FILTER (WHERE closing_at IS NULL) AS closing_at_null,
  count(*) FILTER (WHERE contract_at IS NULL) AS contract_at_null,
  count(*) FILTER (WHERE contract_value_raw IS NULL) AS contract_value_raw_null,
  count(*) FILTER (WHERE trim(contract_value_raw) = '') AS contract_value_raw_blank,
  count(*) FILTER (WHERE contract_value_amount IS NULL) AS contract_value_amount_null,
  count(*) FILTER (WHERE bids_received_raw IS NULL) AS bids_received_raw_null,
  count(*) FILTER (WHERE trim(bids_received_raw) = '') AS bids_received_raw_blank,
  count(*) FILTER (WHERE bids_received IS NULL) AS bids_received_null,
  count(*) FILTER (WHERE selected_bidder IS NULL) AS selected_bidder_null,
  count(*) FILTER (WHERE trim(selected_bidder) = '') AS selected_bidder_blank,
  count(*) FILTER (WHERE selected_bidder IS NULL AND bids_received IS NULL AND contract_value_amount IS NULL AND tender_type IS NULL) AS all_award_fields_null
FROM base"""

SQL["quality_bids"] = """SELECT count(*) FILTER (WHERE bids_received IS NULL) AS null_, count(*) FILTER (WHERE bids_received = 0) AS zero,
       count(*) FILTER (WHERE bids_received = 1) AS one, count(*) FILTER (WHERE bids_received BETWEEN 2 AND 10) AS two_to_10,
       count(*) FILTER (WHERE bids_received BETWEEN 11 AND 100) AS eleven_to_100,
       count(*) FILTER (WHERE bids_received BETWEEN 101 AND 1000) AS hundred01_to_1000,
       count(*) FILTER (WHERE bids_received > 1000) AS over_1000, count(*) FILTER (WHERE bids_received < 0) AS negative,
       max(bids_received) AS max_, count(*) FILTER (WHERE bids_received_raw IS NOT NULL AND bids_received IS NULL) AS raw_present_amount_null
FROM base"""

SQL["quality_value"] = """SELECT count(*) FILTER (WHERE contract_value_amount IS NULL) AS null_,
       count(*) FILTER (WHERE contract_value_amount <= 0) AS lte_zero, count(*) FILTER (WHERE contract_value_amount > 1e12) AS over_1e12,
       count(*) FILTER (WHERE contract_value_amount > 0 AND contract_value_amount < 1000) AS under_1000,
       count(*) FILTER (WHERE contract_value_raw IS NOT NULL AND contract_value_amount IS NULL) AS raw_present_amount_null,
       count(*) FILTER (WHERE contract_value_raw IS NOT NULL AND regexp_matches(contract_value_raw, '[^0-9.]')) AS raw_non_numeric,
       max(contract_value_amount) AS max_, sum(contract_value_amount) FILTER (WHERE contract_value_amount > 0 AND contract_value_amount <= 1e12) AS plausible_sum
FROM base"""

SQL["quality_value_magnitude"] = """SELECT floor(log10(contract_value_amount))::INTEGER AS pow10, count(*) AS n,
       count(*) FILTER (WHERE regexp_matches(contract_value_raw, '^[0-9]+$')) AS raw_integer,
       count(*) FILTER (WHERE regexp_matches(contract_value_raw, '^[0-9]+\\.[0-9]+$')) AS raw_decimal,
       count(*) FILTER (WHERE contract_value_raw IS NULL OR NOT regexp_matches(contract_value_raw, '^[0-9]+(\\.[0-9]+)?$')) AS raw_other
FROM base WHERE contract_value_amount > 0 GROUP BY 1 ORDER BY 1"""

SQL["quality_dates"] = f"""SELECT count(*) FILTER (WHERE aoc_at < closing_at) AS aoc_before_closing,
       count(*) FILTER (WHERE contract_at < aoc_at) AS contract_before_aoc,
       count(*) FILTER (WHERE aoc_year < {YEAR_MIN} OR aoc_year > {YEAR_MAX}) AS aoc_year_out_of_range,
       count(*) FILTER (WHERE year(closing_at) < {YEAR_MIN} OR year(closing_at) > {YEAR_MAX}) AS closing_year_out_of_range,
       count(*) FILTER (WHERE portal_year <> aoc_year) AS portal_year_differs_from_aoc_year,
       min(aoc_at) AS min_aoc, max(aoc_at) AS max_aoc, min(closing_at) AS min_closing, max(closing_at) AS max_closing
FROM base"""

SQL["quality_tender_type_raw"] = """SELECT tender_type AS raw, tender_type_norm AS normalised, count(*) AS n FROM base GROUP BY 1, 2 ORDER BY 3 DESC, 1 NULLS FIRST, 2"""
SQL["quality_tender_type_norm"] = """SELECT tender_type_norm, count(*) AS n FROM base GROUP BY 1 ORDER BY 2 DESC, 1"""

SQL["quality_orgs"] = """SELECT count(*) FILTER (WHERE junk_org) AS junk_rows,
       count(*) FILTER (WHERE organisation_name IS NULL) AS junk_null, count(*) FILTER (WHERE trim(organisation_name) = '') AS junk_blank,
       count(*) FILTER (WHERE lower(organisation_name) LIKE 'test%') AS junk_test_prefix,
       count(DISTINCT organisation_name) FILTER (WHERE portal_type = 0) AS central_distinct_organisation_name,
       count(DISTINCT buyer) FILTER (WHERE portal_type = 0) AS central_distinct_buyers,
       count(DISTINCT organisation_name) FILTER (WHERE portal_type = 1) AS state_distinct_organisation_name,
       count(DISTINCT buyer) FILTER (WHERE portal_type = 1) AS state_distinct_buyers,
       count(*) FILTER (WHERE portal_type = 1 AND buyer LIKE '% / unparsed') AS state_rows_without_department_code
FROM base"""

SQL["quality_markers"] = """SELECT count(selected_bidder) AS named, count(*) FILTER (WHERE marked) AS marked,
       count(*) FILTER (WHERE selected_bidder IS NOT NULL AND NOT marked) AS unmarked,
       count(DISTINCT bidder_norm) FILTER (WHERE marked) AS distinct_marked, count(DISTINCT bidder_norm) FILTER (WHERE NOT marked) AS distinct_unmarked
FROM base"""

_RATE_COLS = """count(*) AS n, count(*) FILTER (WHERE bids_received = 1) AS single, avg(bids_received) AS mean_bids,
       median(bids_received) AS median_bids"""

SQL["rates_by_portal_year"] = f"""SELECT portal, CASE WHEN aoc_year BETWEEN {YEAR_MIN} AND {YEAR_MAX} THEN aoc_year::VARCHAR ELSE 'out-of-range year' END AS year,
       {_RATE_COLS} FROM rated GROUP BY 1, 2 ORDER BY 1, 2"""
SQL["rates_by_tender_type"] = f"""SELECT tender_type_norm AS key, {_RATE_COLS} FROM rated GROUP BY 1 ORDER BY n DESC, key"""
SQL["rates_by_value_band"] = f"""SELECT value_band AS key, {_RATE_COLS} FROM rated GROUP BY 1"""
SQL["rates_by_buyer"] = f"""SELECT portal, buyer AS key, {_RATE_COLS} FROM rated WHERE NOT junk_org GROUP BY 1, 2 ORDER BY n DESC, 1, 2"""
SQL["rates_junk_buyer_rows"] = """SELECT count(*) AS n FROM rated WHERE junk_org"""

SQL["concentration"] = f"""WITH fam AS (
  SELECT buyer, portal, bidder_norm, selected_bidder, marked, contract_value_amount AS v FROM dedup
  WHERE NOT junk_org AND selected_bidder IS NOT NULL AND NOT ({IMPLAUSIBLE_VALUE})
), buyers AS (
  SELECT buyer, portal, count(*) AS awards, sum(v) AS value_sum,
         count(*) FILTER (WHERE marked) AS marked_awards, sum(v) FILTER (WHERE marked) AS marked_value,
         count(*) FILTER (WHERE NOT marked) AS unmarked_awards, sum(v) FILTER (WHERE NOT marked) AS unmarked_value,
         count(DISTINCT bidder_norm) FILTER (WHERE marked) AS distinct_marked_winners
  FROM fam GROUP BY 1, 2 HAVING count(*) >= {CONCENTRATION_MIN_AWARDS}
), winners AS (
  SELECT f.buyer, f.portal, f.bidder_norm, arg_max(f.selected_bidder, (f.v, f.selected_bidder)) AS display_name, count(*) AS awards, sum(f.v) AS value_sum
  FROM fam f JOIN buyers b USING (buyer, portal) WHERE f.marked GROUP BY 1, 2, 3
), hhi AS (
  SELECT w.buyer, w.portal, sum(power(10000.0 * w.value_sum / b.marked_value, 2)) / 10000.0 AS hhi,
         sum(power(10000.0 * w.awards / b.marked_awards, 2)) / 10000.0 AS hhi_count,
         max(w.value_sum) / b.marked_value AS top_share, max(w.awards) * 1.0 / b.marked_awards AS top_share_count
  FROM winners w JOIN buyers b USING (buyer, portal) GROUP BY 1, 2, b.marked_value, b.marked_awards
)
SELECT b.*, h.hhi, h.hhi_count, h.top_share, h.top_share_count,
       (SELECT list(struct_pack(name := display_name, awards := awards, value := value_sum) ORDER BY value_sum DESC, bidder_norm)
        FROM (SELECT * FROM winners w WHERE w.buyer = b.buyer AND w.portal = b.portal AND w.awards >= {NAME_MIN_AWARDS} ORDER BY value_sum DESC, bidder_norm LIMIT 5)) AS top_marked_winners
FROM buyers b LEFT JOIN hhi h USING (buyer, portal) ORDER BY b.awards DESC, b.portal, b.buyer"""

SQL["timing_hist"] = """SELECT CASE WHEN days_to_aoc = 0 THEN '0' WHEN days_to_aoc = 1 THEN '1' WHEN days_to_aoc = 2 THEN '2'
         WHEN days_to_aoc <= 7 THEN '3–7' WHEN days_to_aoc <= 14 THEN '8–14' WHEN days_to_aoc <= 30 THEN '15–30'
         WHEN days_to_aoc <= 60 THEN '31–60' WHEN days_to_aoc <= 90 THEN '61–90' WHEN days_to_aoc <= 180 THEN '91–180'
         WHEN days_to_aoc <= 365 THEN '181–365' ELSE '>365' END AS bin,
       min(days_to_aoc) AS lo, count(*) AS n FROM dedup WHERE days_to_aoc >= 0 GROUP BY 1 ORDER BY lo"""
SQL["timing_summary"] = f"""SELECT portal, count(*) AS n, count(*) FILTER (WHERE days_to_aoc <= {SHORT_DECISION_DAYS}) AS le2,
       median(days_to_aoc) AS median_days, avg(days_to_aoc) AS mean_days, quantile_cont(days_to_aoc, 0.9) AS p90_days
FROM dedup WHERE days_to_aoc >= 0 GROUP BY GROUPING SETS ((portal), ()) ORDER BY portal NULLS FIRST"""
SQL["timing_excluded"] = """SELECT count(*) FILTER (WHERE days_to_aoc < 0) AS aoc_before_closing,
       count(*) FILTER (WHERE days_to_aoc IS NULL) AS date_missing FROM dedup"""
SQL["timing_fy_month"] = """SELECT portal, fy_month, count(*) AS n FROM dedup WHERE days_to_aoc >= 0 GROUP BY GROUPING SETS ((portal, fy_month), (fy_month)) ORDER BY portal NULLS FIRST, fy_month"""

SQL["redflag_single"] = """SELECT portal, count(*) AS family, count(*) FILTER (WHERE bids_received = 1) AS flagged FROM rated GROUP BY GROUPING SETS ((portal), ()) ORDER BY portal NULLS FIRST"""
SQL["redflag_non_open"] = """SELECT portal, count(*) AS family, count(*) FILTER (WHERE tender_type_norm = 'Limited') AS flagged FROM dedup WHERE tender_type_norm <> 'Other/unknown' GROUP BY GROUPING SETS ((portal), ()) ORDER BY portal NULLS FIRST"""
SQL["redflag_non_open_labels"] = f"""SELECT count(*) AS n, count(DISTINCT tender_type) AS distinct_labels FROM dedup
WHERE tender_type_norm = 'Other/unknown' AND regexp_matches(lower(trim(tender_type)), '{NON_OPEN_LABEL_RE}')"""
SQL["redflag_short"] = f"""SELECT portal, count(*) AS family, count(*) FILTER (WHERE days_to_aoc <= {SHORT_DECISION_DAYS}) AS flagged FROM dedup WHERE days_to_aoc >= 0 GROUP BY GROUPING SETS ((portal), ()) ORDER BY portal NULLS FIRST"""
SQL["redflag_repeat"] = f"""WITH single AS (SELECT portal, buyer, bidder_norm FROM rated WHERE bids_received = 1 AND marked AND NOT junk_org),
pairs AS (SELECT portal, buyer, bidder_norm, count(*) AS k FROM single GROUP BY 1, 2, 3)
SELECT portal, sum(k) AS family, sum(k) FILTER (WHERE k >= {NAME_MIN_AWARDS}) AS flagged,
       count(*) AS pairs, count(*) FILTER (WHERE k >= {NAME_MIN_AWARDS}) AS repeat_pairs
FROM pairs GROUP BY GROUPING SETS ((portal), ()) ORDER BY portal NULLS FIRST"""
SQL["redflag_single_by_buyer"] = f"""SELECT portal, buyer, count(*) AS n, count(*) FILTER (WHERE bids_received = 1) AS single
FROM rated WHERE NOT junk_org GROUP BY 1, 2 HAVING count(*) >= {CONCENTRATION_MIN_AWARDS} ORDER BY single * 1.0 / n DESC, n DESC, portal, buyer LIMIT 25"""


# --------------------------------------------------------------------------------------
# helpers
# --------------------------------------------------------------------------------------
def wilson95(k: int, n: int) -> list[float]:
    """Wilson score interval for k/n at z = 1.96, in percent, rounded to 2 dp."""
    if n <= 0:
        return [0.0, 100.0]
    z = 1.959963984540054
    p = k / n
    denom = 1 + z * z / n
    centre = (p + z * z / (2 * n)) / denom
    half = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / denom
    return [round(100 * max(0.0, centre - half), 2), round(100 * min(1.0, centre + half), 2)]


def pct(k: int, n: int) -> float | None:
    return None if not n else round(100.0 * k / n, 2)


def _num(x):
    if x is None:
        return None
    if isinstance(x, float):
        return None if math.isnan(x) else (int(x) if x.is_integer() and abs(x) < 1e15 else round(x, 4))
    if hasattr(x, "isoformat"):
        return x.isoformat()
    return x


def rows_of(con, sql: str) -> list[dict]:
    rel = con.sql(sql)
    cols = rel.columns
    return [{c: _num(v) for c, v in zip(cols, r)} for r in rel.fetchall()]


def one(con, sql: str) -> dict:
    return rows_of(con, sql)[0]


def sha256_16(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 24), b""):
            h.update(chunk)
    return h.hexdigest()[:16]


def load_tables(arrow_dir: Path) -> tuple[pa.Table, list[Path]]:
    files = sorted(p for p in Path(arrow_dir).glob("*.arrow"))
    if not files:
        raise SystemExit(f"no *.arrow files in {arrow_dir}")
    tabs = []
    for f in files:
        with pa.memory_map(str(f)) as mm:
            try:
                tabs.append(ipc.open_stream(mm).read_all())
            except pa.ArrowInvalid:
                tabs.append(ipc.open_file(mm).read_all())
    return pa.concat_tables(tabs), files


def git_sha() -> str:
    try:
        return subprocess.check_output(["git", "rev-parse", "--short", "HEAD"], cwd=Path(__file__).parent,
                                       stderr=subprocess.DEVNULL, text=True).strip()
    except Exception:
        return "nogit"


def rate_row(r: dict, key_fields: tuple[str, ...]) -> dict:
    out = {k: r[k] for k in key_fields}
    n, k = int(r["n"]), int(r["single"])
    out.update({"n": n, "singleBidder": k, "singleBidderPct": pct(k, n), "wilson95": wilson95(k, n),
                "meanBids": None if r["mean_bids"] is None else round(float(r["mean_bids"]), 2),
                "medianBids": r["median_bids"]})
    return out


def indicator(name: str, definition: str, family_def: str, rows: list[dict], innocent: str, extra: dict | None = None) -> dict:
    total = next(r for r in rows if r["portal"] is None)
    fam, cnt = int(total["family"] or 0), int(total["flagged"] or 0)
    by_portal = [{"portal": r["portal"], "familySize": int(r["family"] or 0), "count": int(r["flagged"] or 0),
                  "ratePct": pct(int(r["flagged"] or 0), int(r["family"] or 0)),
                  "wilson95": wilson95(int(r["flagged"] or 0), int(r["family"] or 0))}
                 for r in rows if r["portal"] is not None]
    out = {"indicator": name, "definition": definition, "familyDefinition": family_def, "familySize": fam, "count": cnt,
           "ratePct": pct(cnt, fam), "wilson95": wilson95(cnt, fam), "byPortal": by_portal, "innocentReading": innocent}
    if extra:
        out.update(extra)
    return out


# --------------------------------------------------------------------------------------
# the run
# --------------------------------------------------------------------------------------
def run(arrow_dir, out_dir, as_of: str, log=print) -> dict:
    t_start = time.time()
    arrow_dir, out_dir = Path(arrow_dir), Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    table, files = load_tables(arrow_dir)
    log(f"opened {len(files)} file(s), {table.num_rows:,} rows in {time.time() - t_start:.1f}s")
    inputs = [{"file": f.name, "bytes": f.stat().st_size, "sha256_16": sha256_16(f)} for f in files]
    log(f"digests in {time.time() - t_start:.1f}s")

    con = duckdb.connect()
    # Single-threaded aggregation: parallel floating-point SUMs change the last digits from run
    # to run, and this pipeline promises byte-identical rebuilds from identical inputs.
    con.execute("SET threads TO 1")
    con.register("t", table)
    for v in ("base", "dedup", "rated"):
        con.execute(SQL[v])

    # ---- quality (first, before any rate) ------------------------------------------
    raw = one(con, SQL["quality_raw"])
    dup = one(con, SQL["quality_duplicates"])
    dd = one(con, SQL["quality_dedup_counts"])
    bids = one(con, SQL["quality_bids"])
    val = one(con, SQL["quality_value"])
    dates = one(con, SQL["quality_dates"])
    orgs = one(con, SQL["quality_orgs"])
    mk = one(con, SQL["quality_markers"])
    tt_raw = rows_of(con, SQL["quality_tender_type_raw"])
    tt_norm = rows_of(con, SQL["quality_tender_type_norm"])

    provenance = {
        "inputs": inputs, "rows": raw["rows"], "distinctTenderIds": raw["distinct_tender_ids"],
        "afterDedupRows": dd["dedup_rows"], "dedupRule": DEDUP_RULE, "dedupRuleDetail": DEDUP_RULE_DETAIL,
        "buyerRule": BUYER_RULE, "markerRegex": MARKER_RE, "markedRule": MARKED_RULE, "valueBandsInr": VALUE_BANDS,
        "sql": dict(SQL), "generatedBy": f"scripts/cppp/build.py@{git_sha()}", "asOf": as_of,
        "refusal": (f"winner names are emitted only when they are marked — {MARKED_RULE} — and, per buyer, only with >= "
                    f"{NAME_MIN_AWARDS} awards; unmarked names are counted and never written; the bidder address column is never read"),
    }

    quality = {
        "readMeFirst": ("These are the dataset's own defects, stated before any rate. Every rate in the sibling files is "
                        "computed after the dedup rule below and over the denominator it declares."),
        "raw": {"rows": raw["rows"], "distinctTenderIds": raw["distinct_tender_ids"], "distinctInternalIds": raw["distinct_internal_ids"],
                "internalIdUnique": raw["distinct_internal_ids"] == raw["rows"],
                "byPortal": {"central": raw["central_rows"], "state": raw["state_rows"], "unknown": raw["unknown_portal_rows"]},
                "byPortalYear": rows_of(con, SQL["quality_by_portal_year"])},
        "duplicates": {"tenderIdsWithMultipleRows": dup["tender_ids_with_multiple_rows"], "rowsSharingATenderId": dup["rows_sharing_a_tender_id"] or 0,
                       "rowsPerTenderIdHistogram": {"1": dup["k1"], "2": dup["k2"], "3-5": dup["k3_5"], "6-10": dup["k6_10"], ">10": dup["k_over_10"]},
                       "maxRowsPerTenderId": dup["max_rows_per_tender_id"],
                       "heaviestTenderIds": rows_of(con, SQL["quality_heaviest_tender_ids"]),
                       "tenderIdShapes": rows_of(con, SQL["quality_tender_id_shapes"])},
        "afterDedup": {"rule": DEDUP_RULE, "rows": dd["dedup_rows"], "removed": dd["raw_rows"] - dd["dedup_rows"],
                       "alternativeOnePerTenderId": {"rule": "one row per tender_id (NOT applied; shown for range)", "rows": dd["one_per_tender_id_rows"],
                                                     "removed": dd["raw_rows"] - dd["one_per_tender_id_rows"]},
                       "alternativeOnePerTenderBidder": {"rule": "one row per (tender_id, selected_bidder_norm) ignoring aoc_at (NOT applied)",
                                                         "rows": dd["one_per_tender_bidder_rows"], "removed": dd["raw_rows"] - dd["one_per_tender_bidder_rows"]}},
        "nulls": one(con, SQL["quality_nulls"]),
        "bidsReceived": {"null": bids["null_"], "zero": bids["zero"], "one": bids["one"], "2-10": bids["two_to_10"], "11-100": bids["eleven_to_100"],
                         "101-1000": bids["hundred01_to_1000"], "over1000": bids["over_1000"], "negative": bids["negative"], "max": bids["max_"],
                         "rawPresentParsedNull": bids["raw_present_amount_null"]},
        "contractValue": {"null": val["null_"], "lteZero": val["lte_zero"], "over1e12": val["over_1e12"], "under1000": val["under_1000"],
                          "rawPresentParsedNull": val["raw_present_amount_null"], "rawNonNumeric": val["raw_non_numeric"], "max": val["max_"],
                          "plausibleSumInr": _money(val["plausible_sum"]), "implausibleRule": IMPLAUSIBLE_VALUE,
                          "magnitudeHistogram": [{"pow10": r["pow10"], "n": r["n"], "rawInteger": r["raw_integer"], "rawDecimal": r["raw_decimal"], "rawOther": r["raw_other"]}
                                                 for r in rows_of(con, SQL["quality_value_magnitude"])]},
        "dates": {"aocBeforeClosing": dates["aoc_before_closing"], "contractBeforeAoc": dates["contract_before_aoc"],
                  "aocYearOutOfRange": dates["aoc_year_out_of_range"], "closingYearOutOfRange": dates["closing_year_out_of_range"],
                  "portalYearDiffersFromAocYear": dates["portal_year_differs_from_aoc_year"], "yearRange": [YEAR_MIN, YEAR_MAX],
                  "minAoc": dates["min_aoc"], "maxAoc": dates["max_aoc"], "minClosing": dates["min_closing"], "maxClosing": dates["max_closing"]},
        "tenderType": {"rawValues": tt_raw, "normalisedCounts": {r["tender_type_norm"]: r["n"] for r in tt_norm},
                       "note": "Works/Goods/Services label the category, Limited the method; '1', '2', '', NULL, 'Open' and variants fall in Other/unknown"},
        "organisations": {"junkRows": orgs["junk_rows"], "junkNull": orgs["junk_null"], "junkBlank": orgs["junk_blank"], "junkTestPrefix": orgs["junk_test_prefix"],
                          "centralDistinctOrganisationName": orgs["central_distinct_organisation_name"], "centralDistinctBuyers": orgs["central_distinct_buyers"],
                          "stateDistinctOrganisationName": orgs["state_distinct_organisation_name"], "stateDistinctBuyers": orgs["state_distinct_buyers"],
                          "stateRowsWithoutDepartmentCode": orgs["state_rows_without_department_code"], "buyerRule": BUYER_RULE},
        "winnerMarkers": {"regex": MARKER_RE, "rule": MARKED_RULE, "named": mk["named"], "marked": mk["marked"], "unmarked": mk["unmarked"],
                          "markedSharePct": pct(mk["marked"], mk["named"]), "distinctMarked": mk["distinct_marked"], "distinctUnmarked": mk["distinct_unmarked"],
                          "note": "unmarked winners are private individuals with no public role; counted here, never named anywhere"},
        "bidderAddressColumn": "never read by this pipeline",
        "provenance": provenance,
    }
    quality["headline"] = {
        "rows": raw["rows"], "distinctTenderIds": raw["distinct_tender_ids"], "rowsSharingATenderId": quality["duplicates"]["rowsSharingATenderId"],
        "afterDedupRows": dd["dedup_rows"], "dedupRemoved": dd["raw_rows"] - dd["dedup_rows"], "onePerTenderIdRows": dd["one_per_tender_id_rows"],
        "bidsNull": bids["null_"], "bidsZero": bids["zero"], "bidsOne": bids["one"], "bidsOver1000": bids["over_1000"],
        "valueNull": val["null_"], "valueLteZero": val["lte_zero"], "valueOver1e12": val["over_1e12"],
        "aocBeforeClosing": dates["aoc_before_closing"], "junkOrganisationRows": orgs["junk_rows"],
        "markedWinnerSharePct": pct(mk["marked"], mk["named"]), "unmarkedWinnerRows": mk["unmarked"],
    }
    _write(out_dir / "quality.json", quality)
    log(f"quality.json in {time.time() - t_start:.1f}s")

    # ---- rates -----------------------------------------------------------------------
    by_py = [rate_row(r, ("portal", "year")) for r in rows_of(con, SQL["rates_by_portal_year"])]
    by_tt = [rate_row(r, ("key",)) for r in rows_of(con, SQL["rates_by_tender_type"])]
    band_rows = {r["key"]: r for r in rows_of(con, SQL["rates_by_value_band"])}
    by_band = [rate_row(band_rows[b["band"]], ("key",)) for b in VALUE_BANDS if b["band"] in band_rows]
    if VALUE_BAND_OTHER in band_rows:
        by_band.append(rate_row(band_rows[VALUE_BAND_OTHER], ("key",)))
    buyer_rows = rows_of(con, SQL["rates_by_buyer"])
    by_buyer = [rate_row(r, ("portal", "key")) for r in buyer_rows if r["n"] >= POOL_MIN_N]
    small = [r for r in buyer_rows if r["n"] < POOL_MIN_N]
    junk_n = one(con, SQL["rates_junk_buyer_rows"])["n"]
    if small or junk_n:
        n = sum(int(r["n"]) for r in small) + junk_n
        k = sum(int(r["single"]) for r in small) + 0
        # the pooled mean is the award-weighted mean over the pooled groups; junk-organisation awards are pooled too
        mean = (sum(float(r["mean_bids"]) * int(r["n"]) for r in small) / sum(int(r["n"]) for r in small)) if small else None
        if junk_n:
            jr = one(con, "SELECT count(*) FILTER (WHERE bids_received = 1) AS single, avg(bids_received) AS mean_bids FROM rated WHERE junk_org")
            k += int(jr["single"])
            mean = ((mean or 0) * (n - junk_n) + float(jr["mean_bids"]) * junk_n) / n if n else None
        by_buyer.append({"portal": "all", "key": f"pooled (n<{POOL_MIN_N})", "pooledGroups": len(small), "junkOrganisationRows": junk_n,
                         "n": n, "singleBidder": k, "singleBidderPct": pct(k, n), "wilson95": wilson95(k, n),
                         "meanBids": None if mean is None else round(mean, 2), "medianBids": None})
    denominator_n = sum(r["n"] for r in by_py)
    rates = {
        "denominator": DENOMINATOR, "denominatorN": denominator_n,
        "excludedFromDenominator": {"afterDedupRows": dd["dedup_rows"], "bidsNullOrZeroOrOver1000": dd["dedup_rows"] - denominator_n},
        "rateDefinition": "singleBidderPct = 100 * awards with bids_received = 1 / n; wilson95 = Wilson score interval at 95%, in percent",
        "byPortalYear": by_py, "byTenderType": by_tt, "byValueBand": by_band,
        "byOrganisation": by_buyer, "byOrganisationPooling": f"buyers with n < {POOL_MIN_N} and junk organisations are pooled under 'pooled (n<{POOL_MIN_N})'",
        "caveat": RATES_CAVEAT,
        "provenance": provenance,
    }
    _write(out_dir / "rates.json", rates)
    log(f"rates.json in {time.time() - t_start:.1f}s")

    # ---- concentration ---------------------------------------------------------------
    conc_rows = []
    for r in rows_of(con, SQL["concentration"]):
        winners = r["top_marked_winners"] or []
        conc_rows.append({
            "portal": r["portal"], "buyer": r["buyer"], "awards": r["awards"], "valueSumInr": _money(r["value_sum"]),
            "markedAwards": r["marked_awards"], "unmarkedAwards": r["unmarked_awards"],
            "unmarkedShareOfAwardsPct": pct(r["unmarked_awards"], r["awards"]),
            "unmarkedShareOfValuePct": pct(r["unmarked_value"] or 0, r["value_sum"]) if r["value_sum"] else None,
            "distinctMarkedWinners": r["distinct_marked_winners"],
            "hhiMarkedValue": None if r["hhi"] is None else round(float(r["hhi"]), 1),
            "hhiMarkedCount": None if r["hhi_count"] is None else round(float(r["hhi_count"]), 1),
            "topMarkedWinnerSharePct": None if r["top_share"] is None else round(100 * float(r["top_share"]), 2),
            "topMarkedWinnerShareOfCountPct": None if r["top_share_count"] is None else round(100 * float(r["top_share_count"]), 2),
            "topMarkedWinners": [{"name": w["name"], "awards": int(w["awards"]), "valueInr": _money(w["value"])} for w in winners],
        })
    concentration = {
        "family": f"awards after dedup with a named winner and a plausible value (NOT ({IMPLAUSIBLE_VALUE})), for buyers with >= {CONCENTRATION_MIN_AWARDS} such awards",
        "hhiDefinition": "hhiMarkedValue: sum over marked winners of (share of the buyer's marked award VALUE × 10000)^2 / 10000, on the 0–10000 scale; hhiMarkedCount: the same over award COUNTS, which is robust to the mis-keyed values that pass the 1e12 ceiling; unmarked winners are excluded from both and reported as a share",
        "namingRule": f"topMarkedWinners lists at most 5 winners per buyer, each matching markerRegex and with >= {NAME_MIN_AWARDS} awards for that buyer; nobody else is named",
        "innocentReading": "A buyer with a thin local contractor pool, specialised work or framework contracts concentrates awards for reasons that involve nobody's conduct; a high HHI is a question, not a finding.",
        "buyers": len(conc_rows), "byBuyer": conc_rows, "provenance": provenance,
    }
    _write(out_dir / "concentration.json", concentration)
    log(f"concentration.json in {time.time() - t_start:.1f}s")

    # ---- timing ------------------------------------------------------------------------
    hist = [{"bin": r["bin"], "n": r["n"]} for r in rows_of(con, SQL["timing_hist"])]
    summ = rows_of(con, SQL["timing_summary"])
    total = next(r for r in summ if r["portal"] is None)
    excl = one(con, SQL["timing_excluded"])
    excluded, date_missing = excl["aoc_before_closing"], excl["date_missing"]
    fy = rows_of(con, SQL["timing_fy_month"])
    fy_all = {r["fy_month"]: r["n"] for r in fy if r["portal"] is None}
    fy_n = sum(fy_all.values()) or 1
    timing = {
        "definition": ("days = date_diff('day', closing_at, aoc_at) on dedup rows; rows with aoc_at < closing_at, and rows where either "
                       "date is NULL, are excluded and counted below so that n + excludedAocBeforeClosing + excludedDateMissing = dedup rows"),
        "n": total["n"], "excludedAocBeforeClosing": excluded, "excludedDateMissing": date_missing,
        "daysClosingToAoc": hist,
        "shareLe2Days": {"count": total["le2"], "n": total["n"], "pct": pct(total["le2"], total["n"]), "wilson95": wilson95(total["le2"], total["n"])},
        "medianDays": total["median_days"], "meanDays": total["mean_days"], "p90Days": total["p90_days"],
        "byPortal": [{"portal": r["portal"], "n": r["n"], "le2Days": r["le2"], "le2DaysPct": pct(r["le2"], r["n"]), "wilson95": wilson95(r["le2"], r["n"]),
                      "medianDays": r["median_days"], "meanDays": r["mean_days"], "p90Days": r["p90_days"]} for r in summ if r["portal"] is not None],
        "aocByFinancialYearMonth": [{"fyMonth": m, "calendarMonth": ((m + 2) % 12) + 1, "n": fy_all.get(m, 0), "pct": round(100 * fy_all.get(m, 0) / fy_n, 2),
                                     "byPortal": {r["portal"]: r["n"] for r in fy if r["portal"] is not None and r["fy_month"] == m}} for m in range(1, 13)],
        "innocentReading": ("Very short closing→AOC windows are consistent with e-procurement auto-evaluation of small works and single-bid tenders; "
                            "clustering before March reflects financial-year spending rules, not conduct. Election-calendar clustering is not "
                            "computed here: it needs the state election dates from the welfare fleet joined per state."),
        "provenance": provenance,
    }
    _write(out_dir / "timing.json", timing)
    log(f"timing.json in {time.time() - t_start:.1f}s")

    # ---- red flags ---------------------------------------------------------------------
    rep = rows_of(con, SQL["redflag_repeat"])
    _nonopen = one(con, SQL["redflag_non_open_labels"])
    rep_total = next(r for r in rep if r["portal"] is None)
    redflags = {
        "stance": "Fazekas-style indicators computable from these fields, each as a rate over its declared family with the family size. Rates over a family, never a list of culprits.",
        "indicators": [
            indicator("singleBidding", "bids_received = 1", DENOMINATOR, rows_of(con, SQL["redflag_single"]),
                      "Single bidding is common for small works in thin local markets and for specialised supply; the national base rate is the comparison, not zero."),
            indicator("nonOpenTenderType", "tender_type normalises to 'Limited'", "awards after dedup whose tender_type normalises to Works, Goods, Services or Limited (Other/unknown excluded)",
                      rows_of(con, SQL["redflag_non_open"]),
                      "Limited tenders are lawful under GFR 2017 rule 162 below stated thresholds and for urgent or proprietary purchases; the field mixes category (Works/Goods/Services) with method (Limited), so this rate is a floor on non-open procedures, not a measure of them.",
                      {"limitedLabelRegex": LIMITED_RE, "nonOpenLabelsLeftInOtherUnknown": _nonopen, "nonOpenLabelRegex": NON_OPEN_LABEL_RE,
                       "note": "Single/Nomination/STE/Rate Contract labels are non-open methods too but are not 'Limited'; they sit in Other/unknown, outside this family, and are counted here so the rate is read as a floor"}),
            indicator("shortDecisionWindow", f"days from closing_at to aoc_at <= {SHORT_DECISION_DAYS}",
                      "awards after dedup with aoc_at >= closing_at (rows with aoc_at < closing_at or either date NULL are excluded and counted in timing.json)",
                      rows_of(con, SQL["redflag_short"]),
                      "Same-day or next-day awards follow from automated bid opening and single-bid or two-envelope tenders with a pre-set technical evaluation; the window says nothing about the evaluation's quality."),
            indicator("repeatSingleBidderMarkedWinners", f"single-bidder awards to a (buyer, marked winner) pair with >= {NAME_MIN_AWARDS} single-bidder awards from that buyer",
                      "single-bidder awards after dedup to MARKED winners (unmarked winners cannot be counted as repeat winners without identifying private individuals)", rep,
                      "Repeat single-bidder winners are what a rate-contracted supplier, an OEM, or the only qualified contractor in a district looks like; the pair count is a question for the verification sample, not a finding.",
                      {"pairs": int(rep_total["pairs"] or 0), "repeatPairs": int(rep_total["repeat_pairs"] or 0), "noNames": "pairs are counted, never listed"}),
        ],
        "singleBiddingByBuyer": [{"portal": r["portal"], "buyer": r["buyer"], "n": r["n"], "singleBidder": r["single"], "singleBidderPct": pct(r["single"], r["n"]), "wilson95": wilson95(r["single"], r["n"])}
                                 for r in rows_of(con, SQL["redflag_single_by_buyer"])],
        "singleBiddingByBuyerNote": (f"the 25 buyers (public bodies) with the highest single-bidder rate among those with >= {CONCENTRATION_MIN_AWARDS} awards in the "
                                     "denominator; buyers are public bodies and may be named; a buyer is the body under the buyer rule, so '/'- and '||'-separated "
                                     "central sub-units are folded into their parent body"),
        "provenance": provenance,
    }
    _write(out_dir / "redflags.json", redflags)
    # runtimeSeconds deliberately NOT written: it is the one field that cannot be reproduced.
    _write(out_dir / "provenance.json", {"provenance": provenance, "outputs": ["quality.json", "rates.json", "concentration.json", "timing.json", "redflags.json"]})
    log(f"done in {time.time() - t_start:.1f}s → {out_dir}")
    return {"quality": quality, "rates": rates, "concentration": concentration, "timing": timing, "redflags": redflags, "provenance": provenance}


def _money(x):
    """Rupee amounts as floats rounded to the paise, so an integral sum and a fractional sum
    serialise the same way on every run (85847020.0, never 85847020 on one run and
    85847020.0 on the next)."""
    return None if x is None else round(float(x), 2)


def _write(path: Path, doc: dict) -> None:
    path.write_text(json.dumps(doc, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--arrow-dir", required=True, help="directory holding the *.arrow files")
    ap.add_argument("--out", required=True, help="output directory, e.g. research/raw/cppp")
    ap.add_argument("--as-of", required=True, help="asOf date written into provenance, e.g. 2026-09-26")
    a = ap.parse_args(argv)
    run(a.arrow_dir, a.out, a.as_of)
    return 0


if __name__ == "__main__":
    sys.exit(main())
