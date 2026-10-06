"""Validate frozen review joins, field observations and retained response hashes; no network."""
import hashlib
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BASE = ROOT / 'docs/tender-investigation/original-source-review'
PARENT = BASE.parent
results = json.loads((BASE / 'results.json').read_text())
raw = json.loads((BASE / 'selected-raw-rows.json').read_text())
lead_path = ROOT / results['selectionSource']
leads = json.loads(lead_path.read_text())['rows']
assert hashlib.sha256(lead_path.read_bytes()).hexdigest() == results['selectionSourceSha256']
assert len(results['cases']) == 7 and len(raw['rows']) == 5
assert len({case['tenderId'] for case in results['cases']}) == 7
assert {case['leadIndex'] for case in results['cases']} == {0, 1, 3, 7, 9, 10, 11}
for case in results['cases']:
    lead = leads[case['leadIndex']]
    obs = case['rawObservation']
    assert case['tenderId'] == lead['tender_id']
    assert case['reference'] == lead['reference']
    assert obs['derivedLeadProcedure'] == lead['tender_type']
    assert obs['awardListingClosing'] == obs['noticePublished'] != obs['noticeClosing']
    assert obs['contractValueRaw'] == lead['value_raw']
    assert not any(case[k] for k in ['freshOriginalFieldsVerified', 'paymentEstablished', 'physicalCompletionEstablished', 'corrigendaVerified'])
    assert (PARENT / case['originalDocumentFetch']['receipt']).exists()
for row in raw['rows']:
    detail, notice = row['aoc_details'], row['tender_details']
    assert detail['Published Date'] == notice['ePublished Date']
    assert detail['Contract Date'] == row['award_aoc_date']
    assert row['award_closing'] == row['published_at'] != row['notice_closing']
    assert row['tender_type'] == notice['Tender Type']
    assert detail['Tender Type'] in ['Goods', 'Services']
assert Counter(row['tender_type'] for row in raw['rows']) == {'Limited': 4, 'Single': 1}
assert results['rawFieldFindings']['procedureAndCategoryDimensions']['example']['derivedLead'] == 'Single'
assert 'procedureConflict' not in results['rawFieldFindings']
summary = json.loads((BASE / 'original-fetch-summary.json').read_text())
assert len(summary) == 15
assert Counter(row['semanticAccessStatus'] for row in summary) == {'invalid-url-page': 10, 'unauthorized-page': 4, 'http-403': 1}
receipt_count = 0
for path in sorted((BASE / 'receipts').glob('*.json')):
    receipt = json.loads(path.read_text())
    body = path.with_suffix('.body').read_bytes()
    assert receipt['sha256'] == hashlib.sha256(body).hexdigest(), path
    assert receipt['bytes'] == len(body), path
    receipt_count += 1
for stem in ['1122373', '1123989']:
    path = PARENT / 'primary-receipts' / (stem + '.json')
    receipt = json.loads(path.read_text())
    body = path.with_suffix('.html').read_bytes()
    assert receipt['sha256'] == hashlib.sha256(body).hexdigest(), path
    assert receipt['bytes'] == len(body) == 2912, path
    assert receipt['statusCode'] == 200 and 'NoAuthorizationPage' in receipt['result']
    receipt_count += 1
validation = {
    'status': 'PASS', 'validatedAt': datetime.now(timezone.utc).isoformat(),
    'caseJoinsChecked': 7, 'rawDetailCasesChecked': 5,
    'derivedLeadSourceDetailProcedureMatches': 5,
    'directOriginalUrlOutcomesChecked': 17,
    'responseBodyHashesChecked': receipt_count,
    'scope': 'Local retained evidence integrity and result consistency; does not turn failed source access into original verification.'
}
(BASE / 'validation.json').write_text(json.dumps(validation, indent=2) + '\n')
paths = sorted(path for path in BASE.rglob('*') if path.is_file() and path.name != 'sha256-manifest.json')
paths += [PARENT / 'ORIGINAL_SOURCE_REVIEW.md']
paths += [PARENT / 'primary-receipts' / name for name in ['README.md','1122373.json','1122373.html','1123989.json','1123989.html','exa.json']]
manifest = {'generatedAt': validation['validatedAt'], 'algorithm': 'SHA-256', 'files': [{'path': str(path.relative_to(ROOT)), 'bytes': path.stat().st_size, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()} for path in paths]}
(BASE / 'sha256-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps(validation))
print('Manifest artifacts:', len(paths))
