#!/usr/bin/env python3
"""Retain a new official NSE security snapshot without overwriting an earlier one."""
import argparse
import datetime
import hashlib
import json
from pathlib import Path
import urllib.error
import urllib.request

URL = 'https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output', type=Path, required=True, help='New snapshot directory; existing receipts/files are never overwritten')
args = parser.parse_args()
if args.output.exists() and any(args.output.iterdir()):
    parser.error('Choose a new empty snapshot directory; retain historical originals')
args.output.mkdir(parents=True, exist_ok=True)
at = datetime.datetime.now(datetime.timezone.utc).isoformat()
request = urllib.request.Request(URL, headers={'User-Agent': 'Mozilla/5.0', 'Accept': 'text/csv,*/*'})
try:
    with urllib.request.urlopen(request, timeout=45) as response:
        body, status, final, headers = response.read(), response.status, response.url, dict(response.headers)
    if status != 200 or not body.startswith(b'SYMBOL,NAME OF COMPANY'):
        raise ValueError('Response is not the expected official security CSV; do not promote it')
    path = args.output / 'EQUITY_L.csv'
    path.write_bytes(body)
    receipt = {
        'sourceUrl': URL, 'finalUrl': final, 'retrievedAt': at, 'httpStatus': status,
        'responseHeaders': headers, 'path': str(path), 'bytes': len(body), 'sha256': hashlib.sha256(body).hexdigest(),
        'publisher': 'National Stock Exchange of India',
        'title': 'Securities available for trading in the Equity segment — EQUITY_L.csv',
        'scope': 'Entire returned official security file; retrieval date is not a publisher-certified as-of date. Not all issuers, instruments or historical/delisted securities.',
        'accessBasis': 'Public original publisher download; source rights retained, no open-data licence asserted.',
    }
    (args.output / 'receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
    print(f'Retained {len(body)} original bytes; SHA-256 {receipt["sha256"]}. Review before replacing the active snapshot.')
except (urllib.error.URLError, ValueError) as error:
    (args.output / 'access-failure.json').write_text(json.dumps({'url': URL, 'retrievedAt': at, 'error': str(error)}, indent=2) + '\n')
    raise SystemExit(f'Official snapshot retrieval failed: {error}')
