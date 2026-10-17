"""Failure-only bounded ZIP metadata. The bounded EOCD tail can include surrounding
compressed bytes; no member body is opened, decompressed or interpreted.
Classifications describe names, not verified body content. Duplicate counts concern
member names only. This diagnostic never authorizes native or artifact acceptance.
"""
import sys, json, pathlib, struct, hashlib, re
PHYSICAL_LIMIT=512*1024**2
EXPANDED_LIMIT=512*1024**2
CENTRAL_LIMIT=16*1024**2
ENTRY_LIMIT=49999
CLASSES=('trace_stream','network_stream','stacks_stream','image_resource_by_name','pinned_html_name','other')
HTML_PINS={'index.html':'5db4a1567b88fbe2fbe81d4e1e47cf62e904b436bab0681ebf00c79153d54b21','controller-fixture.html':'df94482b42c13c0aebdcea5fcdf92244aae06924a6dfb48b8e99fcd7e574b1a4','readable.html':'d6dd8bd6af2c768c2549a46a40d6bf7f6f904e65457a79fe899afaab41577b27'}
CODES={'archive_budget','header_budget','entry_budget','expanded_budget','malformed','unsupported','input_pin','unavailable'}
class HeaderFailure(Exception):pass
def require(ok,code='malformed'):
 if not ok:raise HeaderFailure(code)
def exact_keys_extra(extra):
 pos=0
 while pos<len(extra):
  require(pos+4<=len(extra));kind,n=struct.unpack_from('<HH',extra,pos);pos+=4
  require(kind!=1,'unsupported');require(pos+n<=len(extra));pos+=n
 require(pos==len(extra))
def local_html_names(root):
 names=set()
 for name,pin in HTML_PINS.items():
  f=root/'dist'/name;require(f.is_file() and f.stat().st_size<=8*1024**2,'input_pin');b=f.read_bytes();require(hashlib.sha256(b).hexdigest()==pin,'input_pin');names.add('resources/'+hashlib.sha1(b).hexdigest()+'.html')
 return names
def inspect(path,html_names):
 size=path.stat().st_size;require(22<=size<=PHYSICAL_LIMIT,'archive_budget')
 rows=[{'classIndex':i,'entryCount':0,'compressedBytes':0,'uncompressedBytes':0,'duplicateMemberNameCount':0} for i in range(len(CLASSES))]
 with path.open('rb') as f:
  f.seek(max(0,size-65557));tail=f.read(65557);at=tail.rfind(b'PK\x05\x06');require(at>=0 and len(tail)-at>=22)
  sig,disk,cd_disk,disk_count,count,cd_size,cd_offset,comment=struct.unpack_from('<4s4H2IH',tail,at)
  require(at+22+comment==len(tail));require(disk==cd_disk==0 and disk_count==count,'unsupported');require(count!=65535 and cd_size!=0xffffffff and cd_offset!=0xffffffff,'unsupported')
  require(count<=ENTRY_LIMIT,'entry_budget');require(cd_size<=CENTRAL_LIMIT,'header_budget');require(cd_offset+cd_size==size-len(tail)+at)
  f.seek(cd_offset);central=f.read(cd_size);require(len(central)==cd_size)
  pos=0;seen=set();ranges=[];total_expanded=0
  for _ in range(count):
   require(pos+46<=len(central));h=struct.unpack_from('<4s6H3I5H2I',central,pos);require(h[0]==b'PK\x01\x02');flags,method=h[3],h[4];compressed,expanded=h[8],h[9];nl,xl,cl,disk_start=h[10:14];offset=h[16]
   require(not flags&~0x080e and method in (0,8) and disk_start==0,'unsupported');require(all(v!=0xffffffff for v in (compressed,expanded,offset)),'unsupported')
   require(0<nl<=4096 and pos+46+nl+xl+cl<=len(central),'header_budget');name=central[pos+46:pos+46+nl];extra=central[pos+46+nl:pos+46+nl+xl];exact_keys_extra(extra)
   require(b'\0' not in name);text=name.decode('utf-8' if flags&0x800 else 'cp437');pos+=46+nl+xl+cl
   require(offset+30<=cd_offset);f.seek(offset);local=f.read(30);require(len(local)==30);lh=struct.unpack('<4s5H3I2H',local);require(lh[0]==b'PK\x03\x04' and lh[2]==flags and lh[3]==method);ln,lx=lh[9:11];require(ln==nl and lx<=65535 and offset+30+ln+lx+compressed<=cd_offset);require(f.read(ln)==name);exact_keys_extra(f.read(lx))
   if not flags&8:require(lh[6:9]==(h[7],compressed,expanded))
   require(method!=0 or compressed==expanded)
   ranges.append((offset,offset+30+ln+lx+compressed));total_expanded+=expanded;require(total_expanded<=EXPANDED_LIMIT,'expanded_budget')
   kind={'trace.trace':0,'trace.network':1,'trace.stacks':2}.get(text)
   if kind is None:kind=3 if re.fullmatch(r'resources/[A-Za-z0-9@_.-]+\.(?:png|jpe?g)',text) else 4 if text in html_names else 5
   row=rows[kind];row['entryCount']+=1;row['compressedBytes']+=compressed;row['uncompressedBytes']+=expanded;row['duplicateMemberNameCount']+=int(name in seen);seen.add(name)
  require(pos==len(central));ranges.sort();require(all(a[1]<=b[0] for a,b in zip(ranges,ranges[1:])))
 return {'status':'headers_only','archiveBytes':size,'entryCount':count,'centralDirectoryBytes':cd_size,'compressedBytes':sum(r['compressedBytes'] for r in rows),'uncompressedBytes':total_expanded,'duplicateMemberNameCount':count-len(seen),'classes':rows}
def main():
 try:
  require(len(sys.argv)==3,'unavailable');root=pathlib.Path(sys.argv[2]);out=inspect(pathlib.Path(sys.argv[1]),local_html_names(root))
 except HeaderFailure as e:out={'status':'unavailable','code':str(e) if str(e) in CODES else 'unavailable'}
 except Exception:out={'status':'unavailable','code':'unavailable'}
 print(json.dumps(out,separators=(',',':')))
if __name__=='__main__':main()
