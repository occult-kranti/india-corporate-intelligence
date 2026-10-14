"""Read original public URLs as supplied; never rewrite/re-sign tokenized URLs."""
import concurrent.futures, datetime, hashlib, json, pathlib, urllib.request, urllib.error

ROOT = pathlib.Path(__file__).resolve().parent
OUT = ROOT / 'receipts'
OUT.mkdir(exist_ok=True)
rows = json.loads((ROOT / 'selected-raw-rows.json').read_text())['rows']

def fetch(task):
    row, field = task
    url = row[field]
    key = f"lead-{row['leadIndex']}-{field.replace('_url','')}"
    receipt = {'url': url, 'leadIndex': row['leadIndex'], 'tenderId': row['tender_id'], 'urlField': field, 'retrievedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'method': 'GET original supplied URL without rewriting or re-signing', 'headers': {}}
    data = b''
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (compatible; public-record source verification)'})
        with urllib.request.urlopen(req, timeout=40) as response:
            receipt.update(status=response.status, finalUrl=response.url, headers=dict(response.headers))
            data = response.read(5 * 1024 * 1024 + 1)
    except urllib.error.HTTPError as error:
        receipt.update(status=error.code, finalUrl=error.url, headers=dict(error.headers), error=str(error))
        data = error.read(5 * 1024 * 1024 + 1)
    except Exception as error:
        receipt.update(status=None, error=str(error))
    receipt.update(bytes=len(data), sha256=hashlib.sha256(data).hexdigest(), truncated=len(data)>5*1024*1024)
    text = data.decode('utf-8', errors='replace')
    receipt['containsExactTenderId'] = row['tender_id'] in text
    receipt['containsExactReference'] = row['reference'] in text
    receipt['accessMarker'] = next((marker for marker in ['Invalid Url.Please Check', 'NoAuthorizationPage', 'Access Denied', 'Session Expired', 'Captcha', 'captcha', 'Internal Server Error'] if marker in text or marker in receipt.get('finalUrl', '')), None)
    receipt['semanticAccessStatus'] = 'invalid-url-page' if 'Invalid Url.Please Check' in text else 'unauthorized-page' if 'NoAuthorizationPage' in receipt.get('finalUrl', '') or 'Unauthorized Page' in text else 'http-403' if receipt.get('status') == 403 else 'unverified-body'
    (OUT / f'{key}.body').write_bytes(data)
    (OUT / f'{key}.json').write_text(json.dumps(receipt, indent=2)+'\n')
    return receipt

tasks = [(row, field) for row in rows for field in ['notice_document_url', 'notice_detail_url', 'award_detail_url']]
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    receipts = list(pool.map(fetch, tasks))
(ROOT / 'original-fetch-summary.json').write_text(json.dumps(receipts, indent=2)+'\n')
for receipt in receipts:
    print(json.dumps({key: receipt.get(key) for key in ['leadIndex', 'urlField', 'status', 'finalUrl', 'bytes', 'containsExactTenderId', 'containsExactReference', 'accessMarker']}))
