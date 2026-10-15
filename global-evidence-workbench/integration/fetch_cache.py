"""Explicit opt-in network refresh of immutable pinned public repository blobs.
Use --destination NEW_DIRECTORY. Refuses overwrite and validates every blob.
Original publisher citations are not fetched and are not thereby verified.
"""
import argparse,json,pathlib,urllib.request,hashlib
ROOT=pathlib.Path(__file__).parent
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--destination',required=True);a=p.parse_args();dest=pathlib.Path(a.destination)
 if dest.exists():raise SystemExit('Use a new destination; existing cache is immutable')
 manifest=json.loads((ROOT/'cache-manifest.json').read_text());dest.mkdir(parents=True)
 for row in manifest['files']:
  req=urllib.request.Request(row['fetchUrl'],headers={'Accept':'application/vnd.github.raw+json','User-Agent':'global-evidence-cache/1'})
  with urllib.request.urlopen(req,timeout=40) as response:data=response.read()
  sha=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
  if sha!=row['gitBlobSha1']:raise SystemExit('Blob mismatch: '+row['path'])
  out=dest/row['cachePath'];out.parent.mkdir(parents=True,exist_ok=True);out.write_bytes(data)
  print(row['path'],sha)
