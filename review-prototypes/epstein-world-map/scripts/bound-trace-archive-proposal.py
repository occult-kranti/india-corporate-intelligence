"""Unapproved bounded ZIP reader. No ZipExtFile length-limited EOF is trusted.

One no-follow regular-file descriptor binds physical SHA256, headers and bodies.
No extraction, rewriting, alternative codec, ignored compressed tail or ZIP64.
Directory descriptors remain open and their identities are checked on exit.
"""
import os,stat,pathlib,hashlib,struct,zlib,binascii,types

def require(ok,code):
 if not ok:raise ValueError(code)
def identity(s):return (s.st_dev,s.st_ino,s.st_size,s.st_mtime_ns,s.st_ctime_ns)
class Archive:
 def __init__(self,path,budget,policy,expected=None):
  self.path=pathlib.Path(os.path.abspath(path));self.budget=budget;self.policy=policy;self.expected=expected;self.dirs=[];self.fd=None;self.members=[];self.receipt=None
 def __enter__(self):
  try:
   # Walk every component from a held / descriptor; never follow directory links.
   parts=self.path.parts;parent=os.open('/',os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW);self.dirs.append((None,'/',parent,os.fstat(parent)))
   for name in parts[1:-1]:
    child=os.open(name,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW,dir_fd=parent);self.dirs.append((parent,name,child,os.fstat(child)));parent=child
   self.parent=parent;self.name=parts[-1];self.fd=os.open(self.name,os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK,dir_fd=parent);self.initial=os.fstat(self.fd)
   require(stat.S_ISREG(self.initial.st_mode),'TRACE_ARCHIVE_NOT_REGULAR');require(22<=self.initial.st_size<=self.policy['outerTraceZipBytes'],'TRACE_ARCHIVE_BUDGET')
   if self.expected is not None:
    require(isinstance(self.expected,dict) and set(self.expected)=={'bytes','sha256'} and type(self.expected['bytes']) is int and self.expected['bytes']==self.initial.st_size and isinstance(self.expected['sha256'],str) and len(self.expected['sha256'])==64 and all(c in '0123456789abcdef' for c in self.expected['sha256']),'TRACE_ARCHIVE_EXPECTATION')
   digest=hashlib.sha256();offset=0
   while offset<self.initial.st_size:
    self.budget.check();chunk=os.pread(self.fd,min(self.policy['streamChunkBytes'],self.initial.st_size-offset),offset);require(chunk,'TRACE_ARCHIVE_TRUNCATED');digest.update(chunk);offset+=len(chunk)
   self.receipt={'bytes':offset,'sha256':digest.hexdigest(),'inventoryBound':self.expected is not None}
   if self.expected is not None:require(self.receipt['sha256']==self.expected['sha256'],'TRACE_ARCHIVE_DIGEST_MISMATCH')
   self.check_identity();self._headers();self.check_identity();return self
  except BaseException:self.close();raise
 def check_identity(self):
  self.budget.check();require(identity(os.fstat(self.fd))==identity(self.initial),'TRACE_ARCHIVE_CHANGED')
  require(identity(os.stat(self.name,dir_fd=self.parent,follow_symlinks=False))==identity(self.initial),'TRACE_ARCHIVE_REPLACED')
  # Directory content mtimes can change harmlessly; names must still denote the
  # same opened directory in the original anchored chain, not a swapped parent.
  for parent,name,fd,old in self.dirs:
   now=os.stat(name,dir_fd=parent,follow_symlinks=False) if parent is not None else os.stat('/')
   require(stat.S_ISDIR(now.st_mode) and (now.st_dev,now.st_ino)==(old.st_dev,old.st_ino)==(os.fstat(fd).st_dev,os.fstat(fd).st_ino),'TRACE_ARCHIVE_PARENT_REPLACED')
 def close(self):
  if self.fd is not None:os.close(self.fd);self.fd=None
  for _,_,fd,_ in reversed(self.dirs):os.close(fd)
  self.dirs=[]
 def __exit__(self,kind,value,tb):
  try:
   if kind is None:self.check_identity()
  finally:self.close()
 def read_at(self,pos,n):
  self.budget.check();require(type(n) is int and 0<=n<=16*1024**2 and 0<=pos<=pos+n<=self.initial.st_size,'TRACE_HEADER_EXTENT');b=os.pread(self.fd,n,pos);require(len(b)==n,'TRACE_ARCHIVE_TRUNCATED');return b
 def extra(self,b):
  at=0
  while at<len(b):
   require(at+4<=len(b),'TRACE_ZIP_EXTRA');kind,n=struct.unpack_from('<HH',b,at);at+=4;require(kind!=1 and at+n<=len(b),'TRACE_ZIP_EXTRA');at+=n
 def _headers(self):
  size=self.initial.st_size;tail=self.read_at(max(0,size-65557),min(size,65557));at=tail.rfind(b'PK\x05\x06');require(at>=0 and at+22<=len(tail),'TRACE_ZIP_EOCD')
  _,disk,cd_disk,disk_count,count,cd_size,cd_offset,comment=struct.unpack_from('<4s4H2IH',tail,at)
  require(at+22+comment==len(tail) and disk==cd_disk==0 and disk_count==count and count<50000 and cd_size<=16*1024**2 and cd_offset+cd_size==size-len(tail)+at,'TRACE_ZIP_DIRECTORY')
  require(count!=65535 and cd_size!=0xffffffff and cd_offset!=0xffffffff,'TRACE_ZIP_UNSUPPORTED')
  central=self.read_at(cd_offset,cd_size);pos=0;seen=set();ranges=[];expanded_total=0
  for _ in range(count):
   self.budget.check();require(pos+46<=len(central),'TRACE_ZIP_CENTRAL');h=struct.unpack_from('<4s6H3I5H2I',central,pos);require(h[0]==b'PK\x01\x02','TRACE_ZIP_CENTRAL');flags,method,crc,compressed,expanded=h[3],h[4],h[7],h[8],h[9];nl,xl,cl,disk_start=h[10:14];offset=h[16]
   require(not flags&~0x080e and method in (0,8) and disk_start==0 and all(v!=0xffffffff for v in (compressed,expanded,offset)),'TRACE_ZIP_UNSUPPORTED')
   require(0<nl<=4096 and pos+46+nl+xl+cl<=len(central),'TRACE_ZIP_NAME');name=central[pos+46:pos+46+nl];self.extra(central[pos+46+nl:pos+46+nl+xl]);require(b'\0' not in name,'TRACE_ZIP_NAME');text=name.decode('utf-8' if flags&0x800 else 'cp437');pos+=46+nl+xl+cl
   require(text not in seen,'DUPLICATE_TRACE_MEMBER');seen.add(text);require(offset+30<=cd_offset,'TRACE_ZIP_LOCAL');lh=struct.unpack('<4s5H3I2H',self.read_at(offset,30));require(lh[0]==b'PK\x03\x04' and lh[2]==flags and lh[3]==method,'TRACE_ZIP_LOCAL');ln,lx=lh[9:11];start=offset+30+ln+lx;end=start+compressed
   require(ln==nl and end<=cd_offset and self.read_at(offset+30,ln)==name,'TRACE_ZIP_LOCAL');self.extra(self.read_at(offset+30+ln,lx))
   if flags&8:
    require(lh[6:9] in [(0,0,0),(crc,compressed,expanded)],'TRACE_ZIP_DESCRIPTOR')
    require(end+12<=cd_offset,'TRACE_ZIP_DESCRIPTOR');prefix=self.read_at(end,4)
    # Signature and signature-less 32-bit data descriptors only. Ambiguous
    # signature-like CRC is rejected rather than guessing another boundary.
    n=16 if prefix==b'PK\x07\x08' else 12;require(end+n<=cd_offset,'TRACE_ZIP_DESCRIPTOR');dd=self.read_at(end,n);values=struct.unpack('<III',dd[-12:]);require(values==(crc,compressed,expanded),'TRACE_ZIP_DESCRIPTOR');end+=n
   else:require(lh[6:9]==(crc,compressed,expanded),'TRACE_ZIP_LOCAL')
   require(method!=0 or compressed==expanded,'TRACE_ZIP_STORED_SIZE');require(not stat.S_ISLNK(h[15]>>16),'TRACE_SYMLINK')
   ranges.append((offset,end));expanded_total+=expanded;require(expanded_total<=self.policy['traceExpandedTotalBytes'],'TRACE_EXPANSION_BUDGET')
   self.members.append(types.SimpleNamespace(filename=text,file_size=expanded,compress_size=compressed,compress_type=method,CRC=crc,flag_bits=flags,external_attr=h[15],data_offset=start))
  require(pos==len(central),'TRACE_ZIP_CENTRAL');ranges.sort();cursor=0
  for start,end in ranges:require(start==cursor and end>=start,'TRACE_ZIP_OVERLAP_OR_GAP');cursor=end
  require(cursor==cd_offset,'TRACE_ZIP_OVERLAP_OR_GAP')
 def infolist(self):return self.members
 def open(self,info):return FullMember(self,info)
class FullMember:
 def __init__(self,archive,info):
  self.archive=archive;self.info=info;self.pos=info.data_offset;self.remaining=info.compress_size;self.pending=b'';self.decompressor=zlib.decompressobj(-15) if info.compress_type==8 else None;self.count=0;self.crc=0;self.done=False
 def _finish(self):
  require(self.count==self.info.file_size,'TRACE_MEMBER_SIZE_MISMATCH');require(self.crc==self.info.CRC,'TRACE_MEMBER_CRC');self.done=True
 def read(self,n):
  require(type(n) is int and 0<n<=self.archive.policy['streamChunkBytes'],'STREAM_READ_BOUND');self.archive.budget.check()
  if self.done:return b''
  if self.decompressor is None:
   data=self.archive.read_at(self.pos,min(n,self.remaining));self.pos+=len(data);self.remaining-=len(data)
  else:
   while True:
    if not self.pending and self.remaining:
     size=min(self.archive.policy['streamChunkBytes'],self.remaining);self.pending=self.archive.read_at(self.pos,size);self.pos+=size;self.remaining-=size
    data=self.decompressor.decompress(self.pending,n);self.pending=self.decompressor.unconsumed_tail
    if self.decompressor.eof:require(not self.decompressor.unused_data and not self.pending and self.remaining==0,'TRACE_COMPRESSED_TAIL')
    if data or self.decompressor.eof:break
    require(self.pending or self.remaining,'TRACE_DEFLATE_INCOMPLETE')
  self.count+=len(data);self.crc=binascii.crc32(data,self.crc)&0xffffffff
  require(self.count<=self.info.file_size,'TRACE_MEMBER_SIZE_MISMATCH')
  if (self.decompressor is None and self.remaining==0) or (self.decompressor is not None and self.decompressor.eof):self._finish()
  return data
 def close(self):pass # The archive owns the sole descriptor; no reopened handles.
