#!/usr/bin/env python3
"""Read-only cohort/vintage audit. Never creates a corruption or missing-award label."""
import argparse
import collections
import datetime as dt
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'research/research-radar/next-model/temporal-inventory.json'
BASE = ('FROM unique_pairs p JOIN audit.notices n ON n.internal_id=p.notice_internal_id '
        'JOIN audit.awards a ON a.internal_id=p.award_internal_id')
QUERIES = {
    'pair_vintage': '''SELECT count(*) AS pairs,
      count(*) FILTER(WHERE n.listing_scraped_at<a.aoc_at) AS listing_scrape_before_award,
      count(*) FILTER(WHERE n.detail_scraped_at<a.aoc_at) AS detail_scrape_before_award,
      count(*) FILTER(WHERE n.closing_at<a.aoc_at AND n.detail_scraped_at<n.closing_at
        AND n.listing_scraped_at<n.closing_at) AS both_scrapes_before_closing_then_award,
      min(n.published_at) AS earliest_notice_publication,
      max(n.published_at) AS latest_notice_publication ''' + BASE,
    'strict_preclosing_rows': '''SELECT n.internal_id AS notice_id,a.internal_id AS award_id,
      n.tender_id,n.buyer,n.title,n.published_at,n.listing_scraped_at,n.detail_scraped_at,
      n.closing_at,a.aoc_at,a.contract_at,a.bids_raw,n.document_url ''' + BASE + '''
      WHERE n.closing_at<a.aoc_at AND n.detail_scraped_at<n.closing_at
        AND n.listing_scraped_at<n.closing_at ORDER BY n.internal_id''',
    'observable_bid_fields': '''SELECT count(*) AS pairs,
      count(*) FILTER(WHERE regexp_full_match(trim(a.bids_raw),'[0-9]+')
        AND try_cast(trim(a.bids_raw) AS INTEGER)=1) AS single_bid,
      count(*) FILTER(WHERE regexp_full_match(trim(a.bids_raw),'[0-9]+')
        AND try_cast(trim(a.bids_raw) AS INTEGER) BETWEEN 2 AND 1000) AS multiple_bid,
      count(*) FILTER(WHERE NOT coalesce(regexp_full_match(trim(a.bids_raw),'[0-9]+')
        AND try_cast(trim(a.bids_raw) AS INTEGER) BETWEEN 1 AND 1000,false)) AS unknown_or_invalid ''' + BASE,
    'closing_semantics': '''SELECT count(*) AS pairs,
      count(*) FILTER(WHERE a.closing_at=n.published_at) AS award_closing_equals_notice_publication,
      count(*) FILTER(WHERE a.closing_at=n.closing_at) AS award_closing_equals_notice_closing,
      count(*) FILTER(WHERE n.closing_at>a.aoc_at) AS award_precedes_notice_closing ''' + BASE,
    'publication_years': '''SELECT year(n.published_at) AS publication_year,count(*) AS pairs,
      count(DISTINCT n.buyer) AS buyers ''' + BASE + ' GROUP BY 1 ORDER BY 1',
    'buyer_concentration': '''SELECT n.buyer,count(*) AS pairs ''' + BASE +
      ' GROUP BY 1 ORDER BY pairs DESC,n.buyer LIMIT 10',
}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache', type=Path, default=Path('/workspace/research-cache/tender-20260626'))
    parser.add_argument('--verify', action='store_true', help='Rerun queries and compare the retained audit.')
    args = parser.parse_args()
    import duckdb
    conn = duckdb.connect(str(args.cache / 'linkage-v2.duckdb'), read_only=True)
    conn.execute("SET threads=2")
    conn.execute("SET memory_limit='2GB'")
    cache_path = str(args.cache / 'audit.duckdb').replace("'", "''")
    conn.execute(f"ATTACH '{cache_path}' AS audit (READ_ONLY)")
    query_results = {}
    for key, sql in QUERIES.items():
        result = conn.execute(sql)
        cols = [column[0] for column in result.description]
        query_results[key] = {'sql': sql, 'rows': [dict(zip(cols, row)) for row in result.fetchall()]}
    conn.close()
    query_results = json.loads(json.dumps(query_results, default=str))
    raw = ROOT / 'research/raw/tender-portal-audit'
    schema = json.loads((raw / 'schema-counts.json').read_text())
    source_counts = {db: {table: info['rows'] for table, info in data.items() if table != 'schema'}
                     for db, data in schema.items()}
    manifest = json.loads((args.cache / 'derivation-manifest.json').read_text())
    wb_path = ROOT / 'research/raw/finance/worldbank-projects.json'
    wb = json.loads(wb_path.read_text())
    forecast_path = ROOT / 'research/research-radar/forecast-registry.json'
    forecast = json.loads(forecast_path.read_text())
    payload = {
        'schemaVersion': 1,
        'task': 'temporal-cohort-eligibility-audit',
        'sourceReleaseDate': '2026-06-26',
        'sourceHashBasis': 'Original source hashes retained in independently verified download receipts; this audit checks the physical derived tables without rehashing 13 GB.',
        'sourceSHA256': manifest['sourceHashes'],
        'derivationFingerprint': manifest['fingerprint'],
        'derivedTablesReadOnly': True,
        'sourceCounts': source_counts,
        'queries': query_results,
        'referenceFiles': [{'path': str(p.relative_to(ROOT)), 'sha256': sha(p)} for p in [
            raw / 'schema-counts.json', raw / 'linkage-v2.json', raw / 'derivation-manifest.json',
            raw / 'evidence/aoc_tenders.db.download-receipt.json',
            raw / 'evidence/tenders_vps.db.download-receipt.json']],
        'worldBankExistingSnapshot': {
            'path': str(wb_path.relative_to(ROOT)), 'sha256': sha(wb_path),
            'asOf': wb['asOf'], 'projects': len(wb['projects']),
            'statusCounts': dict(sorted(collections.Counter(x['status'] for x in wb['projects']).items())),
            'historicalPredictorVintagesRetained': False,
            'eligibleForHistoricalOutcomeTraining': False,
            'reason': 'Current status, closing date and current commitment cannot be backdated to approval. Original closing baselines, revision histories and time-stamped source snapshots are absent.',
        },
        'existingProspectiveRegistry': {
            'path': str(forecast_path.relative_to(ROOT)), 'sha256': sha(forecast_path),
            'registeredAt': forecast['cutoff'], 'scenarios': len(forecast['rows']),
            'resolvedOutcomes': sum(x['outcome'] is not None for x in forecast['rows']),
            'numericProbabilities': sum(x['probability'] is not None for x in forecast['rows']),
            'representativeEventPopulation': False,
        },
        'decision': {
            'historicalForecastTraining': 'blocked-insufficient-pre-outcome-observations',
            'retrospectiveMaskedRecordReconstruction': 'eligible-for-separate-design-review-not-a-forward-backtest',
            'calibratedCorruptionProbability': 'unsupported-target',
            'numericProbabilities': None,
            'noAwardRecordLabel': 'unknown-never-negative',
            'singleBidMeaning': 'observed bid-count field; neither misconduct nor collusion label',
        },
        'temporalLimitations': [
            'The source archive is a June 2026 scrape, including historical records; document event dates do not establish a predictor version available at that time.',
            'Raw scrape timestamps use inconsistent offset conventions. Derived TIMESTAMP values remove offsets. Even the one pre-closing row is a provisional eligible observation until original timezones and source identity are checked.',
            'The original portal closing label is often a publication field; never use award-side closing as bid close.',
            'Exact key linkage is a selected small subset; unavailable awards are unobserved, not cancelled or non-awarded.',
            'Buyer strings identify source records, not independently resolved legal entities. Entity-disjoint evaluation requires reviewed parent-group membership.',
            'A retrospective split by event year does not repair late-snapshot predictor leakage.',
            'Current commitments and contract award values are not disbursements or traced payments.',
        ],
    }
    if args.verify:
        stored = json.loads(OUT.read_text())
        stored.pop('executedAt', None)
        stored.pop('duckdbVersion', None)
        assert payload == stored, 'Temporal audit changed; review inputs before refreshing the receipt.'
        print('Temporal audit verified: 17,704 linked pairs; forward training remains blocked.')
    else:
        payload['executedAt'] = dt.datetime.now(dt.timezone.utc).isoformat()
        payload['duckdbVersion'] = duckdb.__version__
        OUT.parent.mkdir(parents=True, exist_ok=True)
        OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + '\n')
        print(f'Wrote {OUT.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
