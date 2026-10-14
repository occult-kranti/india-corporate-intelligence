"""Hash retained artifacts and map each admitted source to retrievable evidence."""
import hashlib,json,pathlib
B=pathlib.Path(__file__).resolve().parent
ROOT=B.parents[3]
slice=json.loads((B.parent/'institutions.json').read_text())
extra={
'ndtv-warrant-2022':['indexed-fetch.json','discovery-receipts.json'],
'ndtv-response-2022':['indexed-fetch.json'],
'ndtv-completion-2022':['ndtv-completion-indexed-excerpt.json'],
'ndtv-equalisation-2023':['ndtv-equalisation-indexed.json'],
'ndtv-annual-2026':['ndtv-annual-2026-excerpts.txt','ndtv-annual-2026-page115.png','extraction-receipt.json'],
'ipi-kpmg-2020':['ipi-kpmg-2020-page9.png','extraction-receipt.json'],
'epstein-reuters-response':['indexed-fetch.json','discovery-receipts.json'],
'epstein-pitch-mirror':['epstein-doj-pitch-receipt.json','epstein-doj-pitch.html','epstein-doj-library-receipt.json','epstein-doj-library.html','epstein-tnm-receipt.json','epstein-tnm-summary.json'],
}
sources=[]
for source in slice['sources']:
    ident=source['id'];paths=[p for p in B.glob(ident+'.*') if p.is_file()]+[B/(ident+'-receipt.json')]
    if (B/(ident+'-summary.json')).is_file():paths.append(B/(ident+'-summary.json'))
    paths += [B/x for x in extra.get(ident,[])]
    assert all(p.exists() for p in paths),ident
    sources.append({'sourceId':ident,'url':source['url'],'artifacts':sorted({str(p.relative_to(ROOT)) for p in paths})})
artifacts=[]
for p in sorted(B.iterdir()):
    if p.is_file() and p.name!='sha256-manifest.json':
        raw=p.read_bytes();artifacts.append({'path':str(p.relative_to(ROOT)),'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw)})
external=[json.loads((B/'ndtv-annual-2026-receipt.json').read_text())]+json.loads((B/'publication-cache-receipt.json').read_text())['externalArtifacts']
manifest={'retrievedAt':'2026-10-07','scopeCutoff':'2026-10-06','method':'Original bytes, failed-content/access receipts and authored public summaries are separate artifacts; commercial article captures remain only in external local research cache. Hashes show local integrity.','sources':sources,'externalOriginals':external,'artifacts':artifacts}
(B/'sha256-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print({'artifacts':len(artifacts),'sources':len(sources)})
