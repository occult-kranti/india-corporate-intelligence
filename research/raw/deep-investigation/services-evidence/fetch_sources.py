"""Retrieve selected public service-investigation sources, keeping bytes and receipts.

Run from repository root. Uses the environment's configured proxy/TLS policy.
Indexed court mirrors are archived separately when direct retrieval is denied.
"""
import concurrent.futures, datetime, hashlib, html, json, pathlib, re, subprocess, urllib.request

BASE = pathlib.Path(__file__).resolve().parent
URLS = {
    'akshaya-kitchen-2024': 'https://www.akshayapatra.org/news/akshaya-patra-75th-centralised-kitchen-in-chikkajala',
    'khyati-ie-april2025': 'https://indianexpress.com/article/cities/ahmedabad/chargesheet-ahmedabad-khyati-hospital-pmjay-9946166/',
    'khyati-sc-dec2025': 'https://indiankanoon.org/doc/5649905/',
    'byju-nclat-2026': 'https://indiankanoon.org/doc/152758496/',
    'nsap-cag-2023': 'https://cag.gov.in/uploads/download_audit_report/2023/Report-No.-10-of-2023_NSAP_English_PDF-A-064d229f832dad7.55068084.pdf',
    'nsap-actiontaken-2026': 'https://elibrary.sansad.in/items/b28bdb18-d685-4388-8172-bb4f14d6cb6f',
    'pmjay-nha': 'https://nha.gov.in/PM-JAY',
}

def fetch(item):
    name, url = item
    receipt = {'id':name, 'url':url, 'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0 source verification'}), timeout=35) as response:
            raw=response.read(); ext='pdf' if raw.startswith(b'%PDF') else 'html'
            target=BASE/(name+'.'+ext); target.write_bytes(raw)
            receipt.update(status=response.status, finalUrl=response.url, contentType=response.headers.get('Content-Type'), bytes=len(raw), path=target.name, sha256=hashlib.sha256(raw).hexdigest(), success=True)
            if ext=='pdf':
                subprocess.run(['pdftotext','-layout',str(target),str(BASE/(name+'.txt'))],check=False)
            else:
                clean=re.sub(r'<(script|style)\b[^>]*>.*?</\1>','',raw.decode('utf-8',errors='replace'),flags=re.S|re.I)
                clean=html.unescape(re.sub('<[^>]+>','\n',clean))
                (BASE/(name+'.txt')).write_text(re.sub('\n{3,}','\n\n',clean))
    except Exception as error:
        receipt.update(success=False,error=str(error))
    (BASE/(name+'-receipt.json')).write_text(json.dumps(receipt,indent=2)+'\n')
    return receipt

if __name__=='__main__':
    for receipt in concurrent.futures.ThreadPoolExecutor().map(fetch,URLS.items()):
        print(json.dumps(receipt))
