#!/usr/bin/env python3
"""Fetch public policy originals, retain response receipts and extract original bytes."""
import concurrent.futures, datetime, hashlib, json, pathlib, urllib.request, urllib.error
from pypdf import PdfReader
ROOT=pathlib.Path(__file__).resolve().parent
CACHE=pathlib.Path('/workspace/research-cache/atlas-policy')
CACHE.mkdir(parents=True,exist_ok=True)

def fetch(item):
    key,url=item
    receipt={'id':key,'url':url,'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'accessBasis':'Public unauthenticated HTTP GET; no confidential or personal access','extraction':'pypdf page-marked text for PDF; original HTML retained otherwise'}
    try:
        req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 (public-interest evidence archival)'})
        with urllib.request.urlopen(req, timeout=50) as r:
            body=r.read();receipt.update(status=r.status,finalUrl=r.url,headers=dict(r.headers))
    except urllib.error.HTTPError as e:
        body=e.read();receipt.update(status=e.code,error=str(e),headers=dict(e.headers))
    except Exception as e:
        receipt.update(status='failed',error=str(e));(ROOT/(key+'.receipt.json')).write_text(json.dumps(receipt,indent=2));return receipt
    receipt.update(bytes=len(body),sha256=hashlib.sha256(body).hexdigest())
    pdf=body.startswith(b'%PDF'); suffix='.pdf' if pdf else '.html'
    dest=(CACHE if len(body)>3000000 else ROOT)/(key+suffix)
    dest.write_bytes(body);receipt['originalArtifact']=str(dest)
    if pdf:
        try:
            reader=PdfReader(dest);receipt['pages']=len(reader.pages)
            lines=['\n--- PDF PAGE '+str(i+1)+' ---\n'+(p.extract_text() or '') for i,p in enumerate(reader.pages)]
            text=ROOT/(key+'.txt');text.write_text('\n'.join(lines));receipt['fulltextArtifact']=str(text);receipt['fulltextSha256']=hashlib.sha256(text.read_bytes()).hexdigest()
        except Exception as e: receipt['extractionError']=str(e)
    (ROOT/(key+'.receipt.json')).write_text(json.dumps(receipt,indent=2))
    return {k:receipt.get(k) for k in ['id','status','bytes','pages','originalArtifact','error','extractionError']}

if __name__=='__main__':
    import sys
    jobs=json.load(open(sys.argv[1]))
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        for r in pool.map(fetch,jobs.items()):print(json.dumps(r),flush=True)
