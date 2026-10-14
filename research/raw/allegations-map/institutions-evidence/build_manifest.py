"""Hash public source evidence and metadata; no commercial-news bodies retained."""
import hashlib,json,pathlib
B=pathlib.Path(__file__).resolve().parent;ROOT=B.parents[3]
raw=json.loads((B.parent/'institutions.json').read_text())
extra={'lifeline-patkar-court-2025':['lifeline-patkar-indexed-receipt.json'],'srmf-sc-original-2026':['srmf-sc-mirror-2026-receipt.json'],'scholarship-ed-www-2026':['scholarship-ed-2026-receipt.json']}
sources=[]
for source in raw['sources']:
    ident=source['id'];paths=[p for p in B.glob(ident+'.*') if p.is_file()]+[B/(ident+'-receipt.json'),B/(ident+'-summary.json')]+[B/x for x in extra.get(ident,[])]
    assert all(p.is_file() for p in paths),ident
    sources.append({'sourceId':ident,'url':source['url'],'artifacts':sorted({str(p.relative_to(ROOT)) for p in paths})})
artifacts=[]
for p in sorted(B.iterdir()):
    if p.is_file() and p.name!='sha256-manifest.json':
        data=p.read_bytes();artifacts.append({'path':str(p.relative_to(ROOT)),'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)})
external=json.loads((B/'lifeline-patkar-indexed-receipt.json').read_text())
(B/'sha256-manifest.json').write_text(json.dumps({'retrievedAt':'2026-10-07','scopeCutoff':'2026-10-06','namespace':'allegations-institutions','method':'Official source bytes, court mirror and authored summaries are distinct. Commercial news bodies and mixed search bodies were discarded after review; hashes are retrieval receipts, not publicly archived article text. A legal transcription containing private address/account fields is retained only locally. No skill was used.','sources':sources,'externalOriginals':[external],'artifacts':artifacts},indent=2)+'\n')
print({'sources':len(sources),'publicArtifacts':len(artifacts),'externalLegalTranscriptions':1})
