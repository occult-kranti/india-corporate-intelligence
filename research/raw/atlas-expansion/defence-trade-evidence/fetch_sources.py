"""Retrieve selected public defence-trade investigation sources, keeping bytes and receipts.

Run from repository root. Uses the environment's configured proxy/TLS policy.
Indexed court mirrors are archived separately when direct retrieval is denied.
"""
import concurrent.futures, datetime, hashlib, html, json, pathlib, re, subprocess, urllib.request, urllib.parse

BASE = pathlib.Path(__file__).resolve().parent
CACHE = pathlib.Path('/workspace/research-cache/atlas-defence-trade')
COMMERCIAL_HOSTS = ('thehindu.com','reuters.com','economictimes.indiatimes.com','fdassociates.net')
URLS = {'c295-contract-2021': 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=1757634', 'c295-project-2022': 'https://www.pib.gov.in/PressReleaseIframePage.aspx?PRID=1871267', 'c295-first-2023': 'https://www.airbus.com/en/newsroom/press-releases/2023-09-airbus-delivers-first-c295-to-india', 'c295-count-2026': 'https://mediaassets.airbus.com/pm_38_916_916227-fbdjtmjdm1.pdf?fileName=military-aircraft-orders-and-deliveries-jun-2026.pdf', 'c295-test-2026': 'https://economictimes.indiatimes.com/news/defence/tata-advanced-systems-limited-airbus-conduct-first-test-flight-of-maiden-made-in-india-c295-military-transport-aircraft/articleshow/131640131.cms', 'brahmos-contract-2022': 'https://www.pna.gov.ph/articles/1166596', 'brahmos-jv': 'https://www.brahmos.com/about-jv', 'brahmos-delivery-2025': 'https://www.pna.gov.ph/articles/1248536', 'brahmos-award-2022': 'https://www.thehindu.com/news/national/in-the-first-brahmos-missile-export-order-philippines-approves-374-mn-contract/article38272238.ece', 'mq9-dsca-2024': 'https://www.dsca.mil/press-media/major-arms-sales/india-mq-9b-remotely-piloted-aircraft', 'mq9-signed-2024': 'https://newsonair.gov.in/india-us-deal-for-procurement-of-31-mq-9b-predator-drones/', 'mq9-reuters-signed': 'https://www.reuters.com/world/india-signs-deal-with-us-procure-31-mq-9b-drones-ministry-says-2024-10-15/', 'mq9-dsca-links': 'https://fdassociates.net/february-2024-export-control-regulations-updates/'}

def fetch(item):
    name, url = item
    receipt = {'id':name, 'url':url, 'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}
    external=any(urllib.parse.urlparse(url).hostname.endswith(host) for host in COMMERCIAL_HOSTS)
    destination=CACHE if external else BASE
    destination.mkdir(parents=True,exist_ok=True)
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0 source verification'}), timeout=35) as response:
            raw=response.read(); ext='pdf' if raw.startswith(b'%PDF') else 'html'
            target=destination/(name+'.'+ext); target.write_bytes(raw)
            receipt.update(status=response.status, finalUrl=response.url, contentType=response.headers.get('Content-Type'), bytes=len(raw), path=str(target) if external else target.name, sha256=hashlib.sha256(raw).hexdigest(), success=True)
            if external:receipt['storage']='Commercial article original and fulltext retained only in external local research cache.'
            if ext=='pdf':
                subprocess.run(['pdftotext','-layout',str(target),str(destination/(name+'.txt'))],check=False)
            else:
                clean=re.sub(r'<(script|style)\b[^>]*>.*?</\1>','',raw.decode('utf-8',errors='replace'),flags=re.S|re.I)
                clean=html.unescape(re.sub('<[^>]+>','\n',clean))
                (destination/(name+'.txt')).write_text(re.sub('\n{3,}','\n\n',clean))
    except Exception as error:
        receipt.update(success=False,error=str(error))
    (BASE/(name+'-receipt.json')).write_text(json.dumps(receipt,indent=2)+'\n')
    return receipt

if __name__=='__main__':
    for receipt in concurrent.futures.ThreadPoolExecutor().map(fetch,URLS.items()):
        print(json.dumps(receipt))
