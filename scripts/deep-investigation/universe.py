#!/usr/bin/env python3
"""Derive an official security universe and conservative identity coverage."""
import argparse
import csv
import hashlib
import io
import json
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def derive():
    folder = ROOT / 'research/raw/deep-investigation/universe'
    payload = (folder / 'EQUITY_L.csv').read_bytes()
    receipt = json.loads((folder / 'receipt.json').read_text())
    digest = hashlib.sha256(payload).hexdigest()
    if digest != receipt['sha256'] or len(payload) != receipt['bytes']:
        raise ValueError('Official universe receipt does not match retained bytes')
    rows = [{k.strip(): v.strip() for k, v in row.items()} for row in csv.DictReader(io.StringIO(payload.decode('utf-8-sig')))]
    required = {'SYMBOL', 'NAME OF COMPANY', 'SERIES', 'ISIN NUMBER'}
    if not rows or not required.issubset(rows[0]):
        raise ValueError('Unexpected NSE CSV schema')
    company_path = ROOT / 'research/raw/companies-by-state.json'
    company_bytes = company_path.read_bytes()
    companies = json.loads(company_bytes)['companies']
    isins, symbols = defaultdict(list), defaultdict(list)
    for company in companies:
        if company.get('isin'):
            isins[company['isin']].append(company)
        if company.get('nse'):
            symbols[company['nse']].append(company)
    securities, held = [], []
    for row in rows:
        isin, symbol = row['ISIN NUMBER'], row['SYMBOL']
        if len(isin) != 12 or not isin.isalnum():
            raise ValueError(f'Invalid ISIN for {symbol}')
        exact = isins.get(isin, [])
        # Even exact keys are held if the retained registry has multiplicity.
        accepted = exact if len(exact) == 1 else []
        candidates = [c for c in symbols.get(symbol, []) if c not in accepted]
        if len(exact) > 1:
            held.append({'symbol': symbol, 'isin': isin, 'reason': 'ambiguous-exact-isin', 'companyIds': [c['id'] for c in exact]})
        for candidate in candidates:
            held.append({'symbol': symbol, 'isin': isin, 'companyIds': [candidate['id']], 'retainedIsin': candidate.get('isin'), 'reason': 'symbol-only-missing-isin' if not candidate.get('isin') else 'symbol-match-isin-conflict'})
        securities.append({'symbol': symbol, 'name': row['NAME OF COMPANY'], 'isin': isin, 'series': row['SERIES'], 'listingDateRaw': row['DATE OF LISTING'], 'registryEntityIds': [f"legacy:entity:co:{c['id']}" for c in accepted], 'matchBasis': 'exact-isin' if accepted else 'unmatched'})
    unique_isins = len({s['isin'] for s in securities})
    if unique_isins != len(securities):
        raise ValueError('Repeated ISIN in current security file; review its grain before promotion')
    return {
        'schemaVersion': 1, 'retrievedAt': receipt['retrievedAt'], 'publishedAt': None,
        'sourceUrl': receipt['sourceUrl'], 'sha256': digest, 'sourceBytes': len(payload),
        'publisher': receipt['publisher'], 'title': receipt['title'], 'accessBasis': receipt['accessBasis'],
        'totalSecurities': len(securities), 'uniqueIsins': unique_isins,
        'matchedRegistryCompanies': sum(bool(s['registryEntityIds']) for s in securities),
        'unmatchedSecurities': sum(not s['registryEntityIds'] for s in securities),
        'retainedCompanyCount': len(companies), 'retainedCompaniesWithIsin': sum(bool(c.get('isin')) for c in companies),
        'seriesCounts': dict(sorted(Counter(s['series'] for s in securities).items())),
        'companyInput': {'path': 'research/raw/companies-by-state.json', 'sha256': hashlib.sha256(company_bytes).hexdigest()},
        'limitations': [
            'This is the complete retained NSE EQUITY_L.csv snapshot, not a claim that every NSE security has been investigated.',
            'The file covers its published EQ, BE and BZ series. It is not all Indian companies, SME securities, every exchange instrument or historical/delisted issuers.',
            'Retrieved date is not a publisher-certified as-of date. The response supplies no explicit publication date.',
            'Registry coverage uses an exact nonduplicated ISIN only. Symbol-only candidates and conflicting ISINs are held, including changes potentially caused by corporate actions.',
            'A matched security establishes identifier continuity with the retained company record; it does not freshly verify its historical claims, map a subsidiary, or establish misconduct.',
            'Listing and registered-headquarters metadata are not contracts, public payments, beneficial ownership or project locations.',
        ],
        'heldCandidates': held, 'securities': securities,
    }


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--verify', action='store_true')
    args = parser.parse_args()
    output = ROOT / 'src/data/deep-universe.json'
    result = derive()
    text = json.dumps(result, ensure_ascii=False, indent=2) + '\n'
    if args.verify:
        if output.read_text() != text:
            raise ValueError('Universe artifact differs from retained original inputs')
    else:
        output.write_text(text)
    print(f"{'Verified' if args.verify else 'Derived'} {result['totalSecurities']} NSE securities; {result['matchedRegistryCompanies']} exact-ISIN links; {len(result['heldCandidates'])} held symbol candidates.")
