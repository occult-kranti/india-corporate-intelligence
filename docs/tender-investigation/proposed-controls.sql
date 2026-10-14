-- Candidate DuckDB controls over scripts/cppp/build.py's `base` and `dedup` views.
-- NOT executed against the newly downloaded SQLite databases by this reviewer.
-- No names, addresses, portal tokens or individual supplier rows are emitted.
-- Record original file hash and exact per-source scrape cutoff before execution.

-- 1. Can the existing dedup key merge distinct scopes or conflicting payloads?
WITH groups AS (
 SELECT tender_id, bidder_norm, aoc_at, count(*) AS n,
        count(DISTINCT portal_type) AS portals,
        count(DISTINCT struct_pack(portal := portal_type, buyer := buyer)) AS scopes,
        count(DISTINCT struct_pack(bids := bids_received, value := contract_value_amount,
              closing := closing_at, kind := tender_type)) AS payloads
 FROM base GROUP BY 1,2,3
)
SELECT count(*) AS candidate_keys,
       count(*) FILTER (WHERE portals > 1) AS cross_portal_keys,
       count(*) FILTER (WHERE scopes > 1) AS cross_scope_keys,
       count(*) FILTER (WHERE payloads > 1) AS conflicting_payload_keys,
       sum(n) FILTER (WHERE scopes > 1) AS rows_in_cross_scope_keys,
       sum(n) FILTER (WHERE payloads > 1) AS rows_in_conflicting_payload_keys
FROM groups;

-- 2. Scoped-key sensitivity. This does not validate either key as a true contract identifier.
WITH old_keys AS (
 SELECT tender_id,bidder_norm,aoc_at FROM base GROUP BY ALL
), scoped_keys AS (
 SELECT portal_type,buyer,tender_id,bidder_norm,aoc_at FROM base GROUP BY ALL
)
SELECT (SELECT count(*) FROM base) AS raw_rows,
       (SELECT count(*) FROM old_keys) AS old_key_groups,
       (SELECT count(*) FROM scoped_keys) AS scoped_key_groups;

-- 3. Date integrity. Provisional exclusive cutoff June25 spans the reported June19–24 scrape.
-- Replace with verified per-record/per-file retrieval timestamp where available.
SELECT portal,
 count(*) AS rows,
 count(*) FILTER(WHERE aoc_at < TIMESTAMP '2011-01-01') AS implausibly_early_aoc,
 count(*) FILTER(WHERE aoc_at >= TIMESTAMP '2026-06-25') AS aoc_after_scrape_window,
 count(*) FILTER(WHERE closing_at > aoc_at) AS aoc_before_closing,
 count(*) FILTER(WHERE year(aoc_at) <> portal_year) AS portal_year_differs,
 count(*) FILTER(WHERE aoc_at IS NULL OR closing_at IS NULL) AS missing_date
FROM base GROUP BY portal;

-- 4. Comparator cells: report category/procedure limitations; reject tiny cells.
-- Do not infer an exact rolling five-year rate from the already aggregated calendar-year JSON.
SELECT portal, aoc_year, tender_type_norm, value_band,
 count(*) AS eligible_awards,
 count(*) FILTER(WHERE bids_received=1) AS single_bid_awards,
 count(*) FILTER(WHERE contract_value_amount IS NULL) AS value_missing,
 count(*) FILTER(WHERE tender_type_norm='Other/unknown') AS kind_unknown
FROM dedup
WHERE bids_received BETWEEN 1 AND 1000
  AND aoc_at >= TIMESTAMP '2021-01-01' AND aoc_at < TIMESTAMP '2026-01-01'
GROUP BY ALL;

-- 5. Concentration eligibility: old all-named threshold versus marked subset.
WITH buyers AS (
 SELECT portal,buyer,count(*) AS all_named,
        count(*) FILTER(WHERE marked) AS marked_n
 FROM dedup
 WHERE NOT junk_org AND selected_bidder IS NOT NULL
   AND contract_value_amount>0 AND contract_value_amount<=1e12
 GROUP BY 1,2 HAVING count(*)>=50
)
SELECT count(*) AS old_eligible_buyers,
 count(*) FILTER(WHERE marked_n<50) AS marked_below50,
 count(*) FILTER(WHERE marked_n<10) AS marked_below10,
 count(*) FILTER(WHERE marked_n*2<all_named) AS marked_coverage_below_half,
 count(*) FILTER(WHERE marked_n>=50 AND marked_n*4>=all_named*3) AS marked_ge50_coverage_ge75pct
FROM buyers;

-- 6. Publication lag / default-date sensitivity before calling any interval a decision window.
SELECT portal, count(*) AS rows,
 count(*) FILTER(WHERE closing_at=aoc_at) AS exact_timestamp_equal,
 count(*) FILTER(WHERE cast(closing_at AS DATE)=cast(aoc_at AS DATE)) AS same_calendar_day,
 count(*) FILTER(WHERE date_diff('day',closing_at,aoc_at) BETWEEN 0 AND 2) AS day_boundary_gap_le2,
 count(*) FILTER(WHERE date_diff('second',closing_at,aoc_at) BETWEEN 0 AND 172800) AS actual_elapsed_le48h
FROM dedup
WHERE aoc_at>=TIMESTAMP '2011-01-01' AND aoc_at<TIMESTAMP '2026-06-25'
  AND closing_at<=aoc_at
GROUP BY portal;
