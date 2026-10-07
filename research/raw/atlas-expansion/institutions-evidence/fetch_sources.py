"""Retrieve selected public institution-investigation sources, keeping bytes and receipts.

Run from repository root. Uses the environment's configured proxy/TLS policy.
Indexed court mirrors are archived separately when direct retrieval is denied.
"""
import concurrent.futures, datetime, hashlib, html, json, pathlib, re, subprocess, urllib.request, urllib.parse

BASE = pathlib.Path(__file__).resolve().parent
CACHE = pathlib.Path('/workspace/research-cache/atlas-institutions')
COMMERCIAL_HOSTS = ('thehindu.com','reuters.com','indianexpress.com','thenewsminute.com','theprint.in','globalbankingandfinance.com')
URLS = {'ndtv-warrant-2022': 'https://drop.ndtv.com/uploads/convergence/images/disclosure23082022_200979.pdf', 'ndtv-response-2022': 'https://drop.ndtv.com/uploads/convergence/images/disclosure24082022v2_0648359.pdf', 'ndtv-completion-2022': 'https://drop.ndtv.com/uploads/convergence/images/disclosureunderregulation30changeindirectors_30122022_2318556.pdf', 'ael-price-2022': 'https://www.adanienterprises.com/-/media/Project/Enterprises/Investors/Corporate-Announcement/486-Intimation-for-acquisition-of-2726-stake-in-New-Delhi-Television30122022.pdf', 'ael-response-2022': 'https://www.bseindia.com/xml-data/corpfiling/AttachHis/59ee7699-0b02-4f2d-98da-96463e0a0d2c.pdf', 'padma-sc-2020': 'https://api.sci.gov.in/supremecourt/2011/10179/10179_2011_32_1501_22898_Judgement_13-Jul-2020.pdf', 'padma-sc-2021': 'https://www.advocatekhoj.com/library/judgments/index.php?go=2021%2Fseptember%2Fsri-marthanda-varma-d-through-lrs-vs-state-of-kerala-91', 'padma-latest-2022': 'https://www.thehindu.com/news/national/sc-extends-time-to-complete-special-audit-of-padmanabhaswamy-temple-trusts/article65653342.ece', 'epstein-doj-pitch': 'https://www.justice.gov/epstein/files/DataSet%209/EFTA00688056.pdf', 'epstein-reuters-response': 'https://www.reuters.com/world/india/indias-oil-minister-denies-wrongdoing-epstein-links-2026-02-11/', 'epstein-tnm': 'https://www.thenewsminute.com/news/a-businessman-a-minister-and-a-guru-the-indians-in-epsteins-web-of-power-and-access', 'epstein-doj-library': 'https://www.justice.gov/epstein'}

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
