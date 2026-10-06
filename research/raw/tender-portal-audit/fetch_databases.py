"""Retrieve exact public ZIP entries over HTTP Range; retain DBs outside the repository.
The publisher's full database SHA-256 is checked, not just ZIP metadata. No portal
sessions, CAPTCHA, private endpoints or access-control workarounds are used.
"""
import concurrent.futures, datetime, hashlib, json, pathlib, struct, time, urllib.request, zlib
ROOT=pathlib.Path(__file__).resolve().parent
CACHE=pathlib.Path('/workspace/research-cache/tender-20260626');CACHE.mkdir(parents=True,exist_ok=True)
URL='https://pub-d54d867feaba4a6db3cdd1f7c617b85f.r2.dev/aoc_tenders.zip'
EXPECTED={'aoc_tenders.db':'ec8ef7711a17b7cae9e0414c2403b119a0a31c4dec49ed7055b38ec0df5f7586','tenders_vps.db':'b1994cfb6dd2d5da9ed1d9ac8d6bbc7083178f155e92a65628e87a38e4c64d01'}
entries=json.loads((ROOT/'evidence/archive-directory.json').read_text())
def req(start,end):return urllib.request.Request(URL,headers={'Range':f'bytes={start}-{end}','User-Agent':'India-public-procurement-research/1.0'})
def expected_size(entry):
 extra=bytes.fromhex(entry['extraHex']);i=0
 while i<len(extra):
  kind,n=struct.unpack_from('<HH',extra,i);i+=4
  if kind==1:return struct.unpack_from('<Q',extra,i)[0]
  i+=n
 return entry['uncompressedBytes']
def fetch(entry):
 name=entry['name'];target=CACHE/name;receipt={'url':URL,'entry':entry,'expectedUncompressedBytes':expected_size(entry),'expectedSHA256':EXPECTED[name],'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'outputPath':str(target)}
 if target.exists():
  receipt['status']='already-present-needs-explicit-recheck';return receipt
 try:
  offset=entry['localHeaderOffset']
  with urllib.request.urlopen(req(offset,offset+29),timeout=60) as r:
   header=r.read(31)
   if r.status!=206 or len(header)!=30:raise ValueError('Server did not respect bounded local-header Range')
  fields=struct.unpack('<4s5H3I2H',header)
  if fields[0]!=b'PK\x03\x04' or fields[3]!=8:raise ValueError('Unexpected archive header/compression')
  start=offset+30+fields[9]+fields[10];end=start+entry['compressedBytes']-1
  receipt['requestedRange']=f'bytes={start}-{end}';compressed=written=crc=0;digest=hashlib.sha256();decoder=zlib.decompressobj(-15);last=time.monotonic()
  with urllib.request.urlopen(req(start,end),timeout=90) as r, target.with_suffix('.db.partial').open('wb') as out:
   receipt['statusCode']=r.status;receipt['responseHeaders']=dict(r.headers)
   if r.status!=206 or not r.headers.get('Content-Range','').startswith(f'bytes {start}-{end}/'):raise ValueError('Server did not respect exact entry Range')
   while chunk:=r.read(1024*1024):
    compressed+=len(chunk);plain=decoder.decompress(chunk);out.write(plain);digest.update(plain);crc=zlib.crc32(plain,crc);written+=len(plain)
    if written>receipt['expectedUncompressedBytes']:raise ValueError('Uncompressed data exceeds ZIP directory size')
    if time.monotonic()-last>20:print(f'{name}: {compressed:,}/{entry["compressedBytes"]:,} compressed bytes; {written:,} output',flush=True);last=time.monotonic()
   plain=decoder.flush();out.write(plain);digest.update(plain);crc=zlib.crc32(plain,crc);written+=len(plain)
  receipt.update(compressedBytesRead=compressed,uncompressedBytes=written,sha256=digest.hexdigest(),crc32=hex(crc),deflateEOF=decoder.eof)
  if compressed!=entry['compressedBytes'] or written!=receipt['expectedUncompressedBytes'] or hex(crc)!=entry['crc32'] or not decoder.eof or digest.hexdigest()!=EXPECTED[name]:raise ValueError('Archive entry length, CRC or published full SHA-256 mismatch')
  target.with_suffix('.db.partial').rename(target);receipt['status']='verified-published-sha256';print(name,receipt['status'],written,flush=True)
 except Exception as e:receipt.update(status='failed',error=f'{type(e).__name__}: {e}');print(name,receipt['error'],flush=True)
 (ROOT/'evidence'/f'{name}.download-receipt.json').write_text(json.dumps(receipt,indent=2));return receipt
if __name__=='__main__':
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(fetch,entries))
 if any(r['status']!='verified-published-sha256' for r in results):raise SystemExit(1)
