"""Tiny synthetic S1/S3 controls; never native capture or actual-run raw data."""
import unittest,importlib.util,pathlib,sys,io,hashlib,zipfile,tempfile,json,struct,zlib,binascii,os,copy
from unittest.mock import patch
sys.dont_write_bytecode=True
ROOT=pathlib.Path(__file__).resolve().parents[1]
def module(name,file):
 s=importlib.util.spec_from_file_location(name,ROOT/'scripts'/file);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
t=module('trace_correction','audit-trace.py');a=t.archive_module;b=t.budget_module
CONTEXT={'version':8,'type':'context-options','origin':'library','browserName':'chromium','playwrightVersion':'1.62.1','options':{'viewport':{'width':1440,'height':1000},'acceptDownloads':'deny','serviceWorkers':'block'},'platform':'linux','wallTime':1,'monotonicTime':1,'sdkLanguage':'javascript','contextId':'browser-context@abc'}
RAW=json.dumps(CONTEXT,separators=(',',':')).encode()+b'\n'
def deflate(raw):
 c=zlib.compressobj(wbits=-15);return c.compress(raw)+c.flush()
def archive(raw,*,compressed=None,declared=None,crc=None,method=8,descriptor=None):
 name=b'trace.trace';compressed=(deflate(raw) if method==8 else raw) if compressed is None else compressed;declared=len(raw) if declared is None else declared;crc=binascii.crc32(raw)&0xffffffff if crc is None else crc;flags=8 if descriptor is not None else 0
 local=struct.pack('<4s5H3I2H',b'PK\x03\x04',20,flags,method,0,0,*( (0,0,0) if flags else (crc,len(compressed),declared)),len(name),0)+name+compressed
 if flags:local+=(b'PK\x07\x08' if descriptor=='signature' else b'')+struct.pack('<III',crc,len(compressed),declared)
 cd=struct.pack('<4s6H3I5H2I',b'PK\x01\x02',20,20,flags,method,0,0,crc,len(compressed),declared,len(name),0,0,0,0,0,0)+name
 return local+cd+struct.pack('<4s4H2IH',b'PK\x05\x06',0,0,1,1,len(cd),len(local),0)
def expected(path):
 data=path.read_bytes();return {'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
class Checks(unittest.TestCase):
 def audit_bytes(self,data):
  with tempfile.TemporaryDirectory() as d:
   p=pathlib.Path(d)/'trace.zip';p.write_bytes(data);return t.audit(p,expected(p))
 def test_exact_reviewer_prefix_crc_fixture_is_denied(self):
  p=ROOT/'tests/fixtures/reviewer-hidden-expanded-suffix.zip';data=p.read_bytes()
  self.assertEqual(hashlib.sha256(data).hexdigest(),'2689606a75826acc074e46b85e460c605c25cca84c579976e6847252cbde1ebb');self.assertEqual(len(data),379);self.assertEqual(len(zlib.decompress(data[41:41+int.from_bytes(data[18:22],'little')],-15)),369)
  with self.assertRaisesRegex(ValueError,'TRACE_MEMBER_SIZE_MISMATCH'):t.audit(p,expected(p))
 def test_valid_stored_deflate_lf_crlf_keep_original_hash(self):
  for method in (0,8):
   for raw in [RAW,RAW.replace(b'\n',b'\r\n')]:
    result=self.audit_bytes(archive(raw,method=method));self.assertEqual(result['members'][0]['sha256'],hashlib.sha256(raw).hexdigest());self.assertEqual(result['eventCount'],1);self.assertTrue(result['archive']['inventoryBound'])
 def test_declared_shorter_longer_and_prefix_crc(self):
  for declared in [len(RAW)-1,len(RAW)+1]:
   with self.assertRaisesRegex(ValueError,'TRACE_MEMBER_SIZE_MISMATCH'):self.audit_bytes(archive(RAW,declared=declared))
  suffix=b'{"type":"UNSUPPORTED"}\n'
  with self.assertRaisesRegex(ValueError,'TRACE_MEMBER_SIZE_MISMATCH'):self.audit_bytes(archive(RAW+suffix,declared=len(RAW),crc=binascii.crc32(RAW)&0xffffffff))
 def test_honest_unsupported_event_remains_denied(self):
  with self.assertRaisesRegex(ValueError,'TRACE_EVENT_UNSUPPORTED'):self.audit_bytes(archive(RAW+b'{"type":"UNSUPPORTED"}\n'))
 def test_unfinished_deflate_and_compressed_tails(self):
  with self.assertRaisesRegex(ValueError,'TRACE_DEFLATE_INCOMPLETE'):self.audit_bytes(archive(RAW,compressed=deflate(RAW)[:-1]))
  for tail in [b'ignored',deflate(b'{}\n')]:
   with self.assertRaisesRegex(ValueError,'TRACE_COMPRESSED_TAIL'):self.audit_bytes(archive(RAW,compressed=deflate(RAW)+tail))
 def test_crc_mismatch_and_stored_length(self):
  for method in (0,8):
   with self.assertRaisesRegex(ValueError,'TRACE_MEMBER_CRC'):self.audit_bytes(archive(RAW,method=method,crc=0))
  with self.assertRaisesRegex(ValueError,'TRACE_ZIP_STORED_SIZE'):self.audit_bytes(archive(RAW,method=0,declared=len(RAW)-1))
 def test_data_descriptors_exact_or_deny(self):
  for kind in ['signature','no-signature']:
   self.assertEqual(self.audit_bytes(archive(RAW,descriptor=kind))['eventCount'],1)
   data=bytearray(archive(RAW,descriptor=kind));cd=data.index(b'PK\x01\x02');data[cd-12]^=1
   with self.assertRaisesRegex(ValueError,'TRACE_ZIP_DESCRIPTOR'):self.audit_bytes(bytes(data))
 def test_overlaps_gaps_and_extra_local_content_fail(self):
  data=bytearray(archive(RAW));cd=data.index(b'PK\x01\x02');struct.pack_into('<I',data,cd+42,1)
  with self.assertRaises(ValueError):self.audit_bytes(bytes(data))
  data=archive(RAW);cd=data.index(b'PK\x01\x02');data=bytearray(data[:cd]+b'ignored'+data[cd:]);struct.pack_into('<I',data,len(data)-6,cd+7)
  with self.assertRaisesRegex(ValueError,'TRACE_ZIP_OVERLAP_OR_GAP'):self.audit_bytes(bytes(data))
 def test_high_compression_actual_member_and_aggregate_bounds(self):
  raw=b'x'*(1024*1024);data=archive(raw)
  with tempfile.TemporaryDirectory() as d:
   p=pathlib.Path(d)/'trace.zip';p.write_bytes(data);budget=b.Budget(total_limit=32)
   with a.Archive(p,budget,b.POLICY,expected(p)) as z:
    reader=b.Member(z.open(z.members[0]),len(raw),len(raw),budget)
    with self.assertRaisesRegex(ValueError,'TRACE_EXPANSION_BUDGET'):reader.read(65536)
    self.assertEqual(reader.bytes,33);self.assertEqual(budget.bytes,33)
   p.write_bytes(archive(raw,declared=32,crc=binascii.crc32(raw[:32])&0xffffffff))
   with a.Archive(p,b.Budget(),b.POLICY,expected(p)) as z:
    reader=b.Member(z.open(z.members[0]),32,32,b.Budget())
    with self.assertRaisesRegex(ValueError,'TRACE_MEMBER_SIZE_MISMATCH'):reader.read(65536)
 def test_inventory_digest_size_and_unbound_helper_receipt(self):
  with tempfile.TemporaryDirectory() as d:
   p=pathlib.Path(d)/'trace.zip';p.write_bytes(archive(RAW));e=expected(p)
   for invalid,code in [(dict(e,sha256='0'*64),'TRACE_ARCHIVE_DIGEST_MISMATCH'),(dict(e,bytes=e['bytes']+1),'TRACE_ARCHIVE_EXPECTATION')]:
    with self.assertRaisesRegex(ValueError,code):t.audit(p,invalid)
   self.assertFalse(t.audit(p)['archive']['inventoryBound'])
 def test_no_path_reopen_between_header_and_body(self):
  with tempfile.TemporaryDirectory() as d:
   p=pathlib.Path(d)/'trace.zip';p.write_bytes(archive(RAW));e=expected(p)
   with patch.object(pathlib.Path,'open',side_effect=AssertionError('path reopened')):self.assertEqual(t.audit(p,e)['eventCount'],1)
 def mutate_after_headers(self,action,pattern='TRACE_ARCHIVE_'):
  with tempfile.TemporaryDirectory() as d:
   p=pathlib.Path(d)/'trace.zip';p.write_bytes(archive(RAW));e=expected(p);original=a.Archive._headers
   def headers(z):original(z);action(p)
   with patch.object(a.Archive,'_headers',headers):
    with self.assertRaisesRegex(ValueError,pattern):t.audit(p,e)
 def test_replacement_after_headers_denied(self):
  def replace(p):q=p.with_name('replacement');q.write_bytes(archive(RAW));os.replace(q,p)
  self.mutate_after_headers(replace)
 def test_same_size_mutation_growth_truncation_denied(self):
  def same(p):data=bytearray(p.read_bytes());data[50]^=1;p.write_bytes(data)
  for action in [same,lambda p:p.write_bytes(p.read_bytes()+b'x'),lambda p:p.write_bytes(p.read_bytes()[:-1])]:self.mutate_after_headers(action)
 def test_replacement_during_body_denied_on_exit(self):
  with tempfile.TemporaryDirectory() as d:
   p=pathlib.Path(d)/'trace.zip';p.write_bytes(archive(RAW));e=expected(p);original=a.Archive.open;changed=[]
   def open_member(z,info):
    if not changed:q=p.with_name('replacement');q.write_bytes(archive(RAW));os.replace(q,p);changed.append(True)
    return original(z,info)
   with patch.object(a.Archive,'open',open_member):
    with self.assertRaisesRegex(ValueError,'TRACE_ARCHIVE_(CHANGED|REPLACED)'):t.audit(p,e)
 def test_symlink_leaf_parent_and_directory_replacement_denied(self):
  with tempfile.TemporaryDirectory() as d:
   root=pathlib.Path(d);folder=root/'folder';folder.mkdir();p=folder/'trace.zip';p.write_bytes(archive(RAW));e=expected(p);(root/'link.zip').symlink_to(p);(root/'linkdir').symlink_to(folder,target_is_directory=True)
   for link in [root/'link.zip',root/'linkdir/trace.zip']:
    with self.assertRaises(OSError):t.audit(link,e)
   original=a.Archive._headers
   def headers(z):original(z);folder.rename(root/'old-folder');folder.mkdir();(folder/'trace.zip').write_bytes(archive(RAW))
   with patch.object(a.Archive,'_headers',headers):
    with self.assertRaisesRegex(ValueError,'TRACE_ARCHIVE_PARENT_REPLACED'):t.audit(p,e)
 def test_chunk_boundary_roundtrip_and_regular_file_requirement(self):
  raw=bytes(range(256))*1025
  with tempfile.TemporaryDirectory() as d:
   p=pathlib.Path(d)/'trace.zip'
   for method in (0,8):
    p.write_bytes(archive(raw,method=method))
    with a.Archive(p,b.Budget(),b.POLICY,expected(p)) as z:
     reader=b.Member(z.open(z.members[0]),len(raw),len(raw),b.Budget());self.assertEqual(reader.all(),raw);self.assertEqual(reader.receipt()['sha256'],hashlib.sha256(raw).hexdigest())
   p.unlink();os.mkfifo(p)
   with self.assertRaisesRegex(ValueError,'TRACE_ARCHIVE_NOT_REGULAR'):t.audit(p)
 def test_raw_dispatch_requires_inventory_binding(self):
  r=module('raw_correction','audit-raw.py')
  with tempfile.TemporaryDirectory() as d:
   p=pathlib.Path(d)/'trace.zip';p.write_bytes(archive(RAW))
   with self.assertRaisesRegex(ValueError,'TRACE_ARCHIVE_INVENTORY_BINDING_REQUIRED'):r.inspect(p,ROOT)
   self.assertTrue(r.inspect(p,ROOT,expected(p))['archive']['inventoryBound'])
 def test_wrapper_passes_digest_and_no_release_authority(self):
  wrapper=(ROOT/'scripts/artifact-audit.mjs').read_text();self.assertIn('ROOT,String(r.bytes),r.sha256]',wrapper);self.assertIn('requireApprovedEvidenceBudget();',wrapper);self.assertIn('timeout:120000',wrapper)
if __name__=='__main__':unittest.main(verbosity=2)
