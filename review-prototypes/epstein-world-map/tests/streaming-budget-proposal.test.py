"""Small synthetic controls only. No browser, native capture or real-run artifacts."""
import unittest,importlib.util,pathlib,sys,io,hashlib,zipfile,tempfile,json,subprocess,copy,warnings
sys.dont_write_bytecode=True
ROOT=pathlib.Path(__file__).resolve().parents[1]
def module(name,file):
 s=importlib.util.spec_from_file_location(name,ROOT/'scripts'/file);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
b=module('budget','streaming-budget-proposal.py');t=module('trace','audit-trace.py')
CONTEXT={'version':8,'type':'context-options','origin':'library','browserName':'chromium','playwrightVersion':'1.62.1','options':{'viewport':{'width':1440,'height':1000},'acceptDownloads':'deny','serviceWorkers':'block'},'platform':'linux','wallTime':1,'monotonicTime':1,'sdkLanguage':'javascript','contextId':'browser-context@abc'}
class Recording(io.BytesIO):
 def __init__(self,data):super().__init__(data);self.reads=[]
 def read(self,n=-1):self.reads.append(n);return super().read(n)
class Checks(unittest.TestCase):
 def test_exact_versioned_policy_and_narrow_exception(self):
  self.assertEqual(b.POLICY,b.EXPECTED);self.assertEqual(b.POLICY['approval'],'RESOURCE_CONTRACT_ACCEPTED_PENDING_PACKAGE_REVIEW')
  self.assertEqual(b.member_limit('trace.trace'),384*1024**2)
  for name in ['trace.network','resources/trace.trace','TRACE.TRACE','trace.trace/','trace.trace.part1']:self.assertEqual(b.member_limit(name),128*1024**2)
 def test_raw_byte_hash_and_line_order(self):
  raw=b'{"a":1}\r\n{"b":2}\n{"c":3}';f=Recording(raw);r=b.Member(f,len(raw),100,b.Budget(total_limit=100))
  self.assertEqual(list(r.lines()),[b'{"a":1}',b'{"b":2}',b'{"c":3}']);self.assertEqual(r.receipt(),{'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()});self.assertTrue(all(0<n<=65536 for n in f.reads))
 def test_stream_boundary_and_plus_one(self):
  for raw,declared,limit,expected in [(b'1234',4,4,True),(b'12345',5,4,False),(b'12345',4,4,False),(b'123',4,4,False)]:
   if expected:self.assertEqual(b.Member(io.BytesIO(raw),declared,limit,b.Budget()).all(),raw)
   else:
    with self.assertRaises(ValueError):b.Member(io.BytesIO(raw),declared,limit,b.Budget()).all()
 def test_exact_line_bound_and_plus_one(self):
  for raw,expected in [(b'12345678\n',True),(b'12345678\r\n',True),(b'123456789\n',False),(b'123456789',False)]:
   r=b.Member(io.BytesIO(raw),len(raw),100,b.Budget())
   if expected:self.assertEqual(list(r.lines(line_limit=8)),[b'12345678'])
   else:
    with self.assertRaisesRegex(ValueError,'TRACE_LINE_BUDGET'):list(r.lines(line_limit=8))
 def test_aggregate_counts_actual_bytes(self):
  budget=b.Budget(total_limit=7);self.assertEqual(b.Member(io.BytesIO(b'1234'),4,4,budget).all(),b'1234')
  with self.assertRaisesRegex(ValueError,'TRACE_EXPANSION_BUDGET'):b.Member(io.BytesIO(b'5678'),4,4,budget).all()
 def test_deadline_and_event_count(self):
  with self.assertRaisesRegex(ValueError,'VALIDATOR_DEADLINE'):b.Budget(deadline_seconds=-1).check()
  budget=b.Budget(event_limit=1);budget.event()
  with self.assertRaisesRegex(ValueError,'TRACE_EVENT_COUNT'):budget.event()
 def test_unread_member_cannot_receive_receipt(self):
  with self.assertRaisesRegex(ValueError,'TRACE_MEMBER_NOT_FULLY_READ'):b.Member(io.BytesIO(b'a'),1,1,b.Budget()).receipt()
 def make_trace(self,path,events,extras=()):
  raw=b''.join(json.dumps(x,separators=(',',':')).encode()+b'\n' for x in [CONTEXT]+events)
  with zipfile.ZipFile(path,'w',zipfile.ZIP_STORED) as z:
   z.writestr('trace.trace',raw)
   for name,data in extras:z.writestr(name,data)
  return raw
 def test_complete_small_trace_uses_streams_and_preserves_digest(self):
  with tempfile.TemporaryDirectory() as d:
   path=pathlib.Path(d)/'trace.zip';raw=self.make_trace(path,[{'type':'before','callId':'call@1','startTime':1,'class':'Frame','method':'content','params':{}},{'type':'after','callId':'call@1','endTime':2}])
   original=zipfile.ZipFile.read
   try:
    zipfile.ZipFile.read=lambda *a,**k:(_ for _ in ()).throw(AssertionError('whole ZIP member read forbidden'))
    result=t.audit(path)
   finally:zipfile.ZipFile.read=original
   self.assertEqual(result['actionCalls'],1);self.assertEqual(result['completedCalls'],1);self.assertEqual(result['eventCount'],3);self.assertEqual(result['members'],[{'path':'trace.trace','bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}]);self.assertFalse(result['semanticPrivacyCertified'])
 def test_unchanged_semantic_rejections(self):
  bad=[{'type':'unknown'},dict(CONTEXT,unknown=True),{'type':'after','callId':'call@missing','endTime':2},{'type':'before','callId':'call@1','startTime':1,'class':'Frame','method':'unsupported','params':{}}]
  with tempfile.TemporaryDirectory() as d:
   path=pathlib.Path(d)/'trace.zip'
   for event in bad:
    self.make_trace(path,[event])
    with self.assertRaises(ValueError):t.audit(path)
 def test_crc_corruption_and_duplicate_names_fail(self):
  with tempfile.TemporaryDirectory() as d:
   path=pathlib.Path(d)/'trace.zip';self.make_trace(path,[]);raw=bytearray(path.read_bytes());offset=30+len('trace.trace');raw[offset+10]^=1;path.write_bytes(raw)
   with self.assertRaises(Exception):t.audit(path)
   with warnings.catch_warnings():
    warnings.simplefilter('ignore',UserWarning);self.make_trace(path,[],[('trace.trace',b'{}\n')])
   with self.assertRaises(ValueError):t.audit(path)
 def test_no_new_schema_authority(self):
  policy=(ROOT/'scripts/evidence-policy.mjs').read_text();audit=(ROOT/'scripts/artifact-audit.mjs').read_text()
  self.assertIn('AUTOMATIC_PUBLICATION_ENABLED = true',policy);self.assertIn('requireApprovedEvidenceBudget();',audit);self.assertIn('timeout:120000',audit)
 def test_cli_python_memory_bound_and_small_trace(self):
  code="import importlib.util,resource,json; s=importlib.util.spec_from_file_location('b',"+repr(str(ROOT/'scripts/streaming-budget-proposal.py'))+");b=importlib.util.module_from_spec(s);s.loader.exec_module(b);b.apply_runtime_limits();print(json.dumps(resource.getrlimit(resource.RLIMIT_AS)))"
  result=subprocess.run([sys.executable,'-B','-c',code],capture_output=True,text=True,timeout=5)
  self.assertEqual(result.returncode,0);self.assertEqual(json.loads(result.stdout),[536870912,805306368])
  with tempfile.TemporaryDirectory() as d:
   path=pathlib.Path(d)/'trace.zip';self.make_trace(path,[])
   result=subprocess.run([sys.executable,'-B',str(ROOT/'scripts/audit-raw.py'),str(path),str(ROOT),str(path.stat().st_size),hashlib.sha256(path.read_bytes()).hexdigest()],capture_output=True,text=True,timeout=5)
   self.assertNotEqual(result.returncode,0);self.assertEqual(json.loads(result.stdout)['code'],'IMAGE_RUNTIME_BINDING_REQUIRED')
 def test_no_per_image_fallback_and_independent_parent_hard_limit(self):
  self.assertFalse(hasattr(b,'decoder_run'))
  self.assertEqual(b.POLICY['pythonHardAddressSpaceBytes'],805306368)
  self.assertEqual(b.POLICY['decoderAddressSpaceBytes'],2147483648)
if __name__=='__main__':unittest.main(verbosity=2)
