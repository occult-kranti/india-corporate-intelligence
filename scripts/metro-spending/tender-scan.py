#!/usr/bin/env python3
"""Read-only buyer-cohort analysis of the already verified public tender snapshot.

Run with PYTHONPATH=/workspace/research-cache/tender-tools python3 this_file.py.
The original SQLite files and prior derivations are never mutated. Cohort names
are discovery scopes, not legal-identity joins, project locations or allegations.
"""
import datetime
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import sqlite3
import time
import duckdb

ROOT = Path(__file__).resolve().parents[2]
CACHE = Path('/workspace/research-cache/tender-20260626')
OUT = ROOT / 'research/raw/metro-spending/tender-scan'
OUT.mkdir(parents=True, exist_ok=True)
COHORTS = [
    ('delhi-police', 'Delhi Police buyer names', 'delhi', 'police', r'^(delhi police|prov\. and logistics unit,delhi police)($|[|/])'),
    ('delhi-police-housing', 'Delhi Police Housing Corporation buyer names', 'delhi', 'police', r'^delhi police housing corporation ltd($|[|/])'),
    ('mumbai-police', 'Mumbai Police exact buyer-name probe', 'mumbai', 'police', r'^mumbai police($|[|/])'),
    ('delhi-municipal', 'Delhi municipal buyer-name cohort', 'delhi', 'funds', r'^(municipal corporation of delhi|south delhi municipal corporation|north delhi municipal corporation|east delhi municipal corporation \(edmc\))($|[|/])'),
    ('delhi-development', 'Delhi Development Authority buyer names', 'delhi', 'funds', r'^delhi development authority($|[|/])'),
    ('mumbai-municipal', 'BMC exact buyer-name probe', 'mumbai', 'funds', r'^(municipal corporation of greater mumbai|brihanmumbai municipal corporation|municipal corporation of mumbai)($|[|/])'),
    ('mumbai-port', 'Mumbai Port buyer names', 'mumbai', 'funds', r'^mumbai port (trust|authority)($|[|/])'),
    ('mumbai-shipbuilder', 'Mazagon Dock buyer-name cohort', 'mumbai', 'defence', r'^mazagon dock( shipbuilders)? (limited|ltd\.?)($|[|/])'),
    ('bsf', 'BSF national buyer-name cohort', None, 'defence', r'^(dg,bsf,mha|border security force)($|[|/])'),
    ('itbp', 'ITBP national buyer-name cohort', None, 'defence', r'^(dg, indo-tibetan border police force|indo tibetan border police)($|[|/])'),
    ('ssb', 'SSB national buyer-name cohort', None, 'defence', r'^(dg sashastra seema bal,mha|sashastra seema bal)($|[|/])'),
    ('border-roads', 'Border Roads national buyer-name cohort', None, 'defence', r'^(border roads organisation|dte general border roads organisation|border roads orgn\.)'),
    ('military-engineers', 'Military Engineer Services national buyer-name cohort', None, 'defence', r'^e-in-c branch - military engineer services($|[|/])'),
]


def sha(path):
    with path.open('rb') as handle:
        return hashlib.file_digest(handle, 'sha256').hexdigest()


def literal(text):
    return "'" + text.replace("'", "''") + "'"


def main():
    # Verify inputs against the publisher-hash receipts each execution.
    verification = {}
    for name in ['aoc_tenders.db', 'tenders_vps.db']:
        receipt = json.loads((ROOT / 'research/raw/tender-portal-audit/evidence' / f'{name}.download-receipt.json').read_text())
        path = CACHE / name
        digest = sha(path)
        if receipt['status'] != 'verified-published-sha256' or digest != receipt['sha256']:
            raise ValueError(f'Unverified tender snapshot: {name}')
        verification[name] = {'sha256': digest, 'bytes': path.stat().st_size, 'receipt': f'research/raw/tender-portal-audit/evidence/{name}.download-receipt.json'}
        print(f'Original SHA256 verified: {name}', flush=True)
    spec = importlib.util.spec_from_file_location('tender_cache_contract', ROOT / 'research/raw/tender-portal-audit/cache_contract.py')
    contract = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(contract)
    recipe = contract.contract(ROOT / 'research/raw/tender-portal-audit/analyze.py', {key: row['sha256'] for key, row in verification.items()})
    retained = json.loads((CACHE / 'derivation-manifest.json').read_text())
    if recipe['fingerprint'] != retained['fingerprint']:
        raise ValueError('Retained derivation no longer matches its exact source/build recipe')
    c = duckdb.connect(str(CACHE / 'audit.duckdb'), read_only=True)
    c.execute("SET memory_limit='800MB'; SET threads=2")
    conditions = [f'regexp_matches(lower(trim(buyer)), {literal(row[4])})' for row in COHORTS]
    case = 'CASE ' + ' '.join(f'WHEN {condition} THEN {literal(row[0])}' for row, condition in zip(COHORTS, conditions)) + ' END'
    result = {
        'schemaVersion': 1, 'executedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'scriptSha256': sha(Path(__file__)), 'sourceSnapshots': verification,
        'derivationFingerprint': recipe['fingerprint'], 'duckdbVersion': duckdb.__version__,
        'cohorts': [{'id': row[0], 'label': row[1], 'cityAssociation': row[2], 'topic': row[3], 'buyerRegex': row[4]} for row in COHORTS],
        'scope': 'Explicit buyer-name discovery cohorts in the June 2026 retained snapshot. City names describe buyer associations, not project sites or expenditure allocated to a city. National forces remain national.',
        'limits': [
            'Notice and award listings are different grains. No notice-to-award join or payment trail is inferred.',
            'No prices are summed. Detail bidder labels are not resolved legal-company identities.',
            'Listing counts include historical, undated and date-invalid rows; dated eligible rows are reported separately.',
            'Repeated full buyer/portal/tender/reference keys are repeated source records, not evidence of repeated paid work.',
            'Single-bid observations require the original procurement method, qualification rules, corrigenda and award documents before any adverse conclusion.',
            'Zero matches under the declared buyer-name probe are a coverage gap, not proof that an institution has no tenders.',
            'No contact names, private addresses, bank details or tactical installation locations are extracted.',
        ], 'queries': {},
    }

    def query(name, sql):
        start = time.monotonic()
        cursor = c.execute(sql)
        rows = [dict(zip([column[0] for column in cursor.description], row)) for row in cursor.fetchall()]
        result['queries'][name] = {'sql': sql, 'seconds': round(time.monotonic() - start, 3), 'rows': rows}
        (OUT / 'analysis.json').write_text(json.dumps(result, indent=2, default=str) + '\n')
        print(name, len(rows), 'result rows', flush=True)
        return rows

    query('full_listing_denominators', "SELECT 'notice-listings' AS grain,count(*) AS rows FROM notices UNION ALL SELECT 'award-listings',count(*) FROM awards")
    count_terms = ' + '.join(f'CASE WHEN {condition} THEN 1 ELSE 0 END' for condition in conditions)
    for table in ['notices', 'awards']:
        query(f'{table}_overlap_check', f'SELECT count(*) AS multiply_matched_rows FROM {table} WHERE ({count_terms})>1')
        date = 'published_at' if table == 'notices' else 'aoc_at'
        capture = 'listing_scraped_at' if table == 'notices' else 'scraped_at'
        valid = f"{date}>=TIMESTAMP '2011-10-07' AND {date}<=TIMESTAMP '2026-06-26 23:59:59' AND {date}<={capture}"
        query(f'{table}_cohort_counts', f"WITH scoped AS(SELECT *,{case} AS cohort FROM {table}) SELECT cohort,count(*) AS listing_rows,count(DISTINCT buyer) AS distinct_buyer_strings,count(*) FILTER(WHERE has_details) AS rows_with_details,count(*) FILTER(WHERE detail_id_mismatch) AS mismatched_detail_ids,count(*) FILTER(WHERE {date} IS NULL) AS unparsed_dates,count(*) FILTER(WHERE {valid}) AS date_eligible_rows,count(*) FILTER(WHERE {date}>{capture}) AS date_after_own_capture,count(*) FILTER(WHERE {date}>TIMESTAMP '2026-06-26 23:59:59') AS date_after_snapshot,min({date}) FILTER(WHERE {valid}) AS earliest_eligible,max({date}) FILTER(WHERE {valid}) AS latest_eligible FROM scoped WHERE cohort IS NOT NULL GROUP BY cohort ORDER BY cohort")
        query(f'{table}_repeated_keys', f"WITH scoped AS(SELECT *,{case} AS cohort FROM {table}),keys AS(SELECT cohort,portal,buyer,tender_id,reference,count(*) AS n FROM scoped WHERE cohort IS NOT NULL AND nullif(trim(tender_id),'') IS NOT NULL AND nullif(trim(reference),'') IS NOT NULL GROUP BY ALL) SELECT cohort,count(*) AS nonblank_keys,count(*) FILTER(WHERE n>1) AS repeated_keys,sum(n) FILTER(WHERE n>1) AS rows_under_repeated_keys,max(n) AS maximum_rows_per_key FROM keys GROUP BY cohort ORDER BY cohort")
        query(f'{table}_buyer_names', f"WITH scoped AS(SELECT buyer,{case} AS cohort FROM {table}) SELECT cohort,buyer,count(*) AS rows FROM scoped WHERE cohort IS NOT NULL GROUP BY cohort,buyer ORDER BY cohort,rows DESC,buyer")
    # Strict count lexemes are evaluated independently of the legacy permissive parser.
    strict_bids = "regexp_full_match(trim(bids_raw),'[0-9]+') AND try_cast(trim(bids_raw) AS INTEGER) BETWEEN 1 AND 1000"
    award_valid = "has_details AND NOT detail_id_mismatch AND aoc_at>=TIMESTAMP '2011-10-07' AND aoc_at<=TIMESTAMP '2026-06-26 23:59:59' AND aoc_at<=scraped_at"
    query('award_bid_lexemes', f"WITH scoped AS(SELECT *,{case} AS cohort FROM awards) SELECT cohort,count(*) FILTER(WHERE {award_valid}) AS eligible_detailed_listing_rows,count(*) FILTER(WHERE {award_valid} AND {strict_bids}) AS strict_bid_count_rows,count(*) FILTER(WHERE {award_valid} AND {strict_bids} AND try_cast(trim(bids_raw) AS INTEGER)=1) AS one_bid_listing_rows FROM scoped WHERE cohort IS NOT NULL GROUP BY cohort ORDER BY cohort")
    # Fixed-size exact raw-row samples support inspection, not a representative inference.
    sample = query('bounded_award_inspection_sample', f"WITH scoped AS(SELECT *,{case} AS cohort FROM awards),ranked AS(SELECT cohort,internal_id,portal,buyer,tender_id,reference,aoc_at,scraped_at,bids_raw,value_raw,ROW_NUMBER() OVER(PARTITION BY cohort ORDER BY aoc_at DESC,internal_id) AS position FROM scoped WHERE cohort IS NOT NULL AND {award_valid} AND {strict_bids}) SELECT * FROM ranked WHERE position<=2 ORDER BY cohort,position")
    raw = sqlite3.connect(f'file:{CACHE}/aoc_tenders.db?mode=ro&immutable=1', uri=True)
    for row in sample:
        original = raw.execute('SELECT tender_id,detail_url,aoc_date,closing_date FROM aoc_tenders WHERE internal_id=?', (row['internal_id'],)).fetchone()
        if original is None or original[0] != row['tender_id']:
            raise ValueError('Inspection sample lost original listing identity')
        row.update({'originalDetailUrl': original[1], 'rawAocDate': original[2], 'rawClosingField': original[3]})
    raw.close()
    if any(result['queries'][f'{table}_overlap_check']['rows'][0]['multiply_matched_rows'] for table in ['notices', 'awards']):
        raise ValueError('Cohorts overlap; do not add population counts')
    result['queries']['bounded_award_inspection_sample']['rawLookup'] = 'Read-only SQLite exact internal_id lookup; original tender_id checked. URLs are discovery links, not revalidated original-page facts.'
    result['completedAt'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    (OUT / 'analysis.json').write_text(json.dumps(result, indent=2, default=str) + '\n')
    c.close()
    print('Metro tender cohort analysis complete:', OUT / 'analysis.json', flush=True)


if __name__ == '__main__':
    main()
