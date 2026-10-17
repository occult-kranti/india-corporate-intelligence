"""Version 3 persistent-decoder resource contract: bounded raw-byte streaming, never external publication approval.

Original ZIP members are not rewritten. Hashes include original line terminators.
CLI entry points apply finite Linux address-space limits; imported helpers are used
only by bounded synthetic tests. The containing Node audit still has 120 seconds.
"""
import hashlib,json,pathlib,time,resource
EXPECTED={'schema': 'world-evidence-budget-v3-persistent-decoder', 'approval': 'RESOURCE_CONTRACT_ACCEPTED_PENDING_PACKAGE_REVIEW', 'outerMemberDefaultBytes': 134217728, 'outerTraceZipBytes': 268435456, 'outerTotalBytes': 536870912, 'traceMemberDefaultBytes': 134217728, 'traceEventStreamBytes': 402653184, 'traceExpandedTotalBytes': 536870912, 'streamChunkBytes': 65536, 'traceLineBytes': 16777216, 'maxEvents': 500000, 'maxCalls': 100000, 'pythonAddressSpaceBytes': 536870912, 'decoderAddressSpaceBytes': 2147483648, 'validatorDeadlineSeconds': 115, 'outerAuditTimeoutMilliseconds': 120000, 'imageTimeoutSeconds': 20, 'pythonHardAddressSpaceBytes': 805306368}
POLICY=json.loads(pathlib.Path(__file__).with_name('EVIDENCE-BUDGET-PROPOSAL.json').read_bytes())
if POLICY!=EXPECTED:raise ValueError('UNREVIEWED_BUDGET_CONFIGURATION')
def require(ok,code):
 if not ok:raise ValueError(code)
def member_limit(name):return POLICY['traceEventStreamBytes'] if name=='trace.trace' else POLICY['traceMemberDefaultBytes']
def apply_runtime_limits():
 # Non-image entry points retain the independent Python hard ceiling.
 # Image/trace entry points fork their admitted child before this parent drop.
 try:
  _,hard=resource.getrlimit(resource.RLIMIT_AS)
  maximum=POLICY['pythonHardAddressSpaceBytes'] if hard==resource.RLIM_INFINITY else min(hard,POLICY['pythonHardAddressSpaceBytes'])
  resource.setrlimit(resource.RLIMIT_AS,(min(POLICY['pythonAddressSpaceBytes'],maximum),maximum))
 except Exception:raise ValueError('RESOURCE_LIMIT_UNAVAILABLE') from None
class Budget:
 def __init__(self,total_limit=None,deadline_seconds=None,event_limit=None,deadline=None):
  self.limit=POLICY['traceExpandedTotalBytes'] if total_limit is None else total_limit
  self.deadline=time.monotonic()+(POLICY['validatorDeadlineSeconds'] if deadline_seconds is None else deadline_seconds)
  if deadline is not None:self.deadline=min(self.deadline,deadline)
  self.event_limit=POLICY['maxEvents'] if event_limit is None else event_limit
  self.bytes=0;self.events=0
 def check(self):require(time.monotonic()<self.deadline,'VALIDATOR_DEADLINE')
 def consume(self,n):
  self.check();self.bytes+=n;require(self.bytes<=self.limit,'TRACE_EXPANSION_BUDGET')
 def event(self):
  self.check();self.events+=1;require(self.events<=self.event_limit,'TRACE_EVENT_COUNT')
class Member:
 def __init__(self,handle,declared_size,limit,budget):
  require(type(declared_size) is int and 0<=declared_size<=limit,'TRACE_MEMBER_BUDGET')
  self.handle=handle;self.declared=declared_size;self.limit=limit;self.budget=budget;self.bytes=0;self.sha=hashlib.sha256();self.eof=False
 def read(self,n):
  require(type(n) is int and 0<n<=POLICY['streamChunkBytes'],'STREAM_READ_BOUND')
  self.budget.check();requested=min(n,self.declared-self.bytes+1,self.limit-self.bytes+1,self.budget.limit-self.budget.bytes+1);require(requested>0,'TRACE_EXPANSION_BUDGET');b=self.handle.read(requested)
  require(isinstance(b,bytes) and len(b)<=n,'STREAM_READ_RESULT')
  self.bytes+=len(b);require(self.bytes<=self.declared and self.bytes<=self.limit,'TRACE_MEMBER_ACTUAL_BUDGET')
  self.budget.consume(len(b));self.sha.update(b)
  if not b:self.eof=True;require(self.bytes==self.declared,'TRACE_MEMBER_SIZE_MISMATCH')
  return b
 def chunks(self):
  while True:
   b=self.read(POLICY['streamChunkBytes'])
   if not b:break
   yield b
 def lines(self,line_limit=None):
  limit=POLICY['traceLineBytes'] if line_limit is None else line_limit;pending=bytearray()
  for chunk in self.chunks():
   start=0
   while True:
    end=chunk.find(b'\n',start)
    if end<0:
     pending.extend(chunk[start:]);require(len(pending)<=limit+1,'TRACE_LINE_BUDGET');break
    pending.extend(chunk[start:end]);line=bytes(pending)
    if line.endswith(b'\r'):line=line[:-1]
    require(len(line)<=limit,'TRACE_LINE_BUDGET');yield line;pending.clear();start=end+1
  if pending:
   line=bytes(pending)
   if line.endswith(b'\r'):line=line[:-1]
   require(len(line)<=limit,'TRACE_LINE_BUDGET');yield line
 def all(self):return b''.join(self.chunks())
 def receipt(self):
  require(self.eof and self.bytes==self.declared,'TRACE_MEMBER_NOT_FULLY_READ')
  return {'bytes':self.bytes,'sha256':self.sha.hexdigest()}
