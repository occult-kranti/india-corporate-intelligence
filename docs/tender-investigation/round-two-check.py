#!/usr/bin/env python3
"""Independent read-only checks after the audit DuckDB writer has closed.
PYTHONPATH=/workspace/research-cache/tender-tools python3 docs/tender-investigation/round-two-check.py
Does not modify source databases, cached tables, production, or the procurement engineer's results.
"""
import datetime
import hashlib
import json
import os
from pathlib import Path
import duckdb

ROOT = Path(__file__).resolve().parents[2]
AUDIT = ROOT / 'research/raw/tender-portal-audit'
CACHE = Path(os.environ.get('TENDER_AUDIT_DB', '/workspace/research-cache/tender-20260626/audit.duckdb'))
c = duckdb.connect(str(CACHE), read_only=True)
c.execute("SET memory_limit='700MB'; SET threads=1")
queries = {
    'notice_observation_strata': """SELECT portal,status,
      CASE WHEN closing_at>listing_scraped_at THEN 'closing after listing capture'
           WHEN closing_at<=listing_scraped_at THEN 'closing at/before listing capture'
           ELSE 'comparison unknown' END AS closing_observation,
      count(*) AS rows,
      count(*) FILTER(WHERE published_at<=closing_at AND published_at<=listing_scraped_at AND year(published_at)>=2011) AS existing_window_family,
      count(*) FILTER(WHERE published_at<=closing_at AND published_at<=listing_scraped_at AND year(published_at)>=2011
                       AND date_diff('minute',published_at,closing_at)<4320) AS listed_under72h
      FROM notices GROUP BY ALL ORDER BY ALL""",
    'award_bid_lexical_profile': r"""SELECT portal,count(*) AS rows,
      count(*) FILTER(WHERE nullif(trim(bids_raw),'') IS NULL) AS missing_or_blank,
      count(*) FILTER(WHERE regexp_full_match(trim(bids_raw),'[0-9]+')) AS unsigned_integer_text,
      count(*) FILTER(WHERE nullif(trim(bids_raw),'') IS NOT NULL AND NOT regexp_full_match(trim(bids_raw),'[0-9]+')) AS other_nonempty_text,
      count(*) FILTER(WHERE bids IS NOT NULL AND NOT regexp_full_match(trim(bids_raw),'[0-9]+')) AS extracted_from_noninteger_lexeme
      FROM awards GROUP BY portal ORDER BY portal""",
    'award_value_lexical_profile': r"""SELECT portal,count(*) AS rows,
      count(*) FILTER(WHERE nullif(trim(value_raw),'') IS NULL) AS missing_or_blank,
      count(*) FILTER(WHERE regexp_full_match(trim(value_raw),'[0-9]+(\.[0-9]+)?')) AS unsigned_plain_decimal_text,
      count(*) FILTER(WHERE nullif(trim(value_raw),'') IS NOT NULL AND NOT regexp_full_match(trim(value_raw),'[0-9]+(\.[0-9]+)?')) AS other_nonempty_text,
      count(*) FILTER(WHERE value_amount IS NOT NULL AND NOT regexp_full_match(trim(value_raw),'[0-9]+(\.[0-9]+)?')) AS extracted_from_nonplain_lexeme
      FROM awards GROUP BY portal ORDER BY portal""",
    'notice_amount_lexical_profile': r"""WITH cells AS (
      SELECT portal,'emd' AS field,emd_raw AS raw,emd_amount AS amount FROM notices
      UNION ALL SELECT portal,'fee',fee_raw,fee_amount FROM notices
      ) SELECT portal,field,count(*) AS rows,
      count(*) FILTER(WHERE nullif(trim(raw),'') IS NULL) AS missing_or_blank,
      count(*) FILTER(WHERE regexp_full_match(trim(raw),'[0-9]+(\.[0-9]+)?')) AS unsigned_plain_decimal_text,
      count(*) FILTER(WHERE regexp_matches(coalesce(raw,''),'[A-Za-z%]')) AS contains_letter_or_percent,
      count(*) FILTER(WHERE amount IS NOT NULL AND NOT regexp_full_match(trim(raw),'[0-9]+(\.[0-9]+)?')) AS extracted_from_nonplain_lexeme
      FROM cells GROUP BY ALL ORDER BY ALL""",
    'source_link_presence': r"""SELECT portal,count(*) AS rows,
      count(*) FILTER(WHERE nullif(trim(document_url),'') IS NOT NULL) AS nonblank_document_field,
      count(*) FILTER(WHERE regexp_matches(trim(document_url),'^https?://')) AS document_http_url_syntax,
      count(*) FILTER(WHERE nullif(trim(corrigendum_url),'') IS NOT NULL) AS nonblank_corrigendum_field,
      count(*) FILTER(WHERE regexp_matches(trim(corrigendum_url),'^https?://')) AS corrigendum_http_url_syntax
      FROM notices GROUP BY portal ORDER BY portal""",
}
report = {'completedAt': None, 'scope': 'Independent read-only aggregate checks over the hash-verified snapshots derived in audit.duckdb. No row-level source truth or completed procurement outcome verified.',
          'duckdbVersion': duckdb.__version__, 'sourceHashes': json.loads((AUDIT/'analysis.json').read_text())['sourceHashes'],
          'reviewedScriptSha256': hashlib.sha256((AUDIT/'analyze.py').read_bytes()).hexdigest(),
          'queries': {}, 'interpretationLimits': [
              'Future closing dates in active notices are normal planned activity, not anomalies by themselves.',
              'Unsigned decimal syntax is only a lexical check: currency, scale, accounting stage and correctness remain unverified.',
              'HTTP URL syntax does not establish retrieval success, content correctness or lawful reuse.',
              'Cached derived fields use the earlier permissive parser; raw lexeme counts are computed independently here.']}
try:
    for name, sql in queries.items():
        result=c.execute(sql)
        report['queries'][name]={'sql':sql,'rows':[dict(zip([column[0] for column in result.description],row)) for row in result.fetchall()]}
finally:
    c.close()
report['completedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat()
output=Path(__file__).with_name('round-two-check.json')
output.write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
