"""Retain public official records; commercial news bodies stay in a local cache."""
import concurrent.futures,datetime,hashlib,html,json,pathlib,re,subprocess,urllib.parse,urllib.request
B=pathlib.Path(__file__).resolve().parent
C=pathlib.Path('/workspace/research-cache/allegations-institutions')
PUBLIC_HOSTS=('enforcementdirectorate.gov.in','api.sci.gov.in','sci.gov.in','bombayhighcourt.nic.in')
def fetch(i,url,public_document=False):
    host=urllib.parse.urlparse(url).hostname or ''
    external=not(public_document or any(host.endswith(h) for h in PUBLIC_HOSTS));dest=C if external else B;dest.mkdir(parents=True,exist_ok=True)
    r={'id':i,'url':url,'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}
    try:
        with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 source verification'}),timeout=35) as response:
            raw=response.read();ext='pdf' if raw.startswith(b'%PDF') else 'html';p=dest/(i+'.'+ext);p.write_bytes(raw)
            r.update(success=True,status=response.status,finalUrl=response.url,contentType=response.headers.get('Content-Type'),path=str(p) if external else p.name,bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest(),storage='external-local-cache' if external else 'public-official-document-or-court-mirror')
            txt=dest/(i+'.txt')
            if ext=='pdf':subprocess.run(['pdftotext','-layout',str(p),str(txt)],check=True)
            else:
                text=re.sub(r'<(script|style)\b[^>]*>.*?</\1>','',raw.decode('utf-8',errors='replace'),flags=re.S|re.I);text=html.unescape(re.sub('<[^>]+>','\n',text));txt.write_text(re.sub('\n{3,}','\n\n',text))
            data=txt.read_bytes();r['textArtifact']={'path':str(txt) if external else txt.name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
    except Exception as e:r.update(success=False,error=str(e))
    if external and r.get('success'):
        p.unlink(missing_ok=True);txt.unlink(missing_ok=True)
        r['path']=None;r['textArtifact']['path']=None;r['storage']='not-retained-commercial-body'
        r['retentionNote']='Commercial body discarded after extraction; retain source metadata and authored summary only.'
    (B/(i+'-receipt.json')).write_text(json.dumps(r,indent=2)+'\n');return r
