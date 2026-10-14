"""Hash original bytes, readable extractions and failed-access/content receipts."""
import hashlib,json,pathlib
B=pathlib.Path(__file__).resolve().parent
ROOT=B.parents[3]
s=json.loads((B.parent/'defence-trade.json').read_text())
extra={'brahmos-contract-2022':['indexed-primary-pages.json'],'brahmos-delivery-2025':['indexed-primary-pages.json'],'mq9-federal-notice-2025':['mq9-dsca-2024-receipt.json','indexed-primary-pages.json']}
sources=[]
for row in s['sources']:
    name=row['id'];paths=list(B.glob(name+'.*'))+[B/(name+'-receipt.json')]+[B/p for p in extra.get(name,[])]
    if (B/(name+'-summary.json')).is_file():paths.append(B/(name+'-summary.json'))
    if name=='c295-count-2026':paths.append(B/'c295-count-2026-p1.png')
    assert all(p.is_file() for p in paths),name
    sources.append({'sourceId':name,'url':row['url'],'artifacts':sorted(set(str(p.relative_to(ROOT)) for p in paths))})
artifacts=[]
for p in sorted(B.iterdir()):
    if p.is_file() and p.name!='sha256-manifest.json':
        raw=p.read_bytes();artifacts.append({'path':str(p.relative_to(ROOT)),'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw)})
external=json.loads((B/'publication-cache-receipt.json').read_text())['externalArtifacts']
(B/'sha256-manifest.json').write_text(json.dumps({'retrievedAt':'2026-10-07','scopeCutoff':'2026-10-06','method':'Hashes verify local integrity, not truth. Original public records, indexed original text, and blocked/unrelated responses are distinguished by receipts. Commercial article captures remain only in external local research cache.','sources':sources,'externalOriginals':external,'artifacts':artifacts},indent=2)+'\n')
print({'sources':len(sources),'artifacts':len(artifacts)})
