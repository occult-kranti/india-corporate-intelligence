"""Local integrated candidate. Independent package review is still required.

Linux, single-threaded, dedicated auditor process only. Caller must use `with`;
no result constitutes acceptance until finish() proves done, EOF, and exit 0.
"""
import ctypes, hashlib, json, os, pathlib, resource, selectors, signal, subprocess, threading, time

SCHEMA='world-image-frame-proposal-v1'
CODEC='580f571bf063e2256b51b3946a035bc452fc0e22808d5547b198baea39923a32'
from image_runtime_binding import load_binding
WORKER=pathlib.Path(__file__).with_name('persistent-image-worker.mjs')
WORKER_SHA='4ab0daec585aa9884b6111a9183e49568405680ef5002bef9bc4da29e16b6b5d'
MIB=1024**2
PARENT_SOFT=512*MIB; PARENT_HARD=768*MIB; CHILD_AS=2048*MIB
GLOBAL_SECONDS=115; CPU_SECONDS=115; IMAGE_SECONDS=20; OUTER_SECONDS=120
MAX_INPUT=32*MIB; MAX_REPLY=512; MAX_STDERR=16384; MAX_IMAGES=49999
LIBC=ctypes.CDLL(None,use_errno=True)

class DecoderDenied(Exception): pass
def need(value,code):
 if not value: raise DecoderDenied(code)
def digest_file(path):
 h=hashlib.sha256()
 with open(path,'rb') as f:
  for chunk in iter(lambda:f.read(65536),b''):h.update(chunk)
 return h.hexdigest()
def canonical(value):return json.dumps(value,separators=(',',':'),ensure_ascii=True).encode('ascii')
def strict_object(pairs):
 out={}
 for k,v in pairs:
  need(k not in out,'DUPLICATE_RESPONSE_KEY');out[k]=v
 return out
def child_setup(expected_parent):
 need(LIBC.prctl(1,signal.SIGKILL,0,0,0)==0,'PARENT_DEATH_GUARD')
 if os.getppid()!=expected_parent:os._exit(125)
 resource.setrlimit(resource.RLIMIT_AS,(CHILD_AS,CHILD_AS))
 resource.setrlimit(resource.RLIMIT_CORE,(0,0))
 # A persistent worker has a global CPU ceiling; each image retains wall 20 s.
 _,hard=resource.getrlimit(resource.RLIMIT_CPU)
 ceiling=CPU_SECONDS if hard==resource.RLIM_INFINITY else min(hard,CPU_SECONDS)
 resource.setrlimit(resource.RLIMIT_CPU,(ceiling,ceiling))

class WorkerProcess:
 def __init__(self,stdin,stdout,stderr):
  self.pid=None;self.stdin=stdin;self.stdout=stdout;self.stderr=stderr
  self.returncode=None;self.usage=None;self.wait_ownership_lost=False
 def poll(self):
  previous=signal.pthread_sigmask(signal.SIG_BLOCK,{signal.SIGALRM,signal.SIGINT,signal.SIGTERM,signal.SIGHUP,signal.SIGQUIT})
  try:
   if self.pid is not None and self.returncode is None:
    try:pid,status,usage=os.wait4(self.pid,os.WNOHANG)
    except ChildProcessError:
     self.wait_ownership_lost=True
     raise DecoderDenied('WAIT_OWNERSHIP_LOST')
    if pid:self.returncode=os.waitstatus_to_exitcode(status);self.usage=usage
   return self.returncode
  finally:signal.pthread_sigmask(signal.SIG_SETMASK,previous)
 def kill(self):
  if self.pid is not None and self.poll() is None:os.kill(self.pid,signal.SIGKILL)
 def wait(self,timeout):
  end=time.monotonic()+timeout
  while self.poll() is None:
   if time.monotonic()>=end:raise subprocess.TimeoutExpired('pinned-worker',timeout)
   time.sleep(.002)
  return self.returncode

class Decoder:
 def __init__(self,deadline=None):
  self.started=time.monotonic();self.deadline=self.started+GLOBAL_SECONDS
  if deadline is not None:
   need(type(deadline) in (int,float) and deadline==deadline and abs(deadline)!=float('inf'),'SHARED_DEADLINE_REQUIRED')
   self.deadline=min(self.deadline,deadline)
  self.process=None;self.selector=selectors.DefaultSelector();self.buffer=bytearray();self.stderr_bytes=0
  self.count=0;self.closed=False;self.accepted=False;self.out_eof=False;self.err_eof=False
  self.old_alarm=None;self.alarm_owned=False;self.cleanup_failed=False;self.unreaped_pid=None
  self.cleanup_errors=[];self.cleanup_unconfirmed_pid=None;self.deadline_expired=False
  try:
   need(threading.current_thread() is threading.main_thread() and len(os.listdir('/proc/self/task'))==1,'DEDICATED_SINGLE_THREAD_REQUIRED')
   need(signal.getsignal(signal.SIGCHLD)==signal.SIG_DFL,'INHERITED_SIGCHLD_UNSUPPORTED')
   need(signal.getitimer(signal.ITIMER_REAL)==(0.0,0.0),'EXISTING_ALARM_UNSUPPORTED')
   need(signal.SIGALRM not in signal.pthread_sigmask(signal.SIG_BLOCK,set()),'BLOCKED_ALARM_UNSUPPORTED')
   _,hard=resource.getrlimit(resource.RLIMIT_AS)
   need(hard==resource.RLIM_INFINITY or hard>=CHILD_AS,'INHERITED_CHILD_CEILING_TOO_LOW')
   self.old_alarm=signal.signal(signal.SIGALRM,self._alarm);self.alarm_owned=True
   self._check(self.deadline)
   signal.setitimer(signal.ITIMER_REAL,self.deadline-time.monotonic())
   # Trusted implementation/runtime reads only; no raw artifact is opened here.
   self.runtime=load_binding()
   self.node=pathlib.Path(self.runtime['nodeExecutable']);self.workspace=self.runtime['workspace']
   need(digest_file(self.node)==self.runtime['nodeExecutableSha256'],'QUALIFIED_NODE_PIN')
   need(digest_file(WORKER)==WORKER_SHA,'PROPOSED_WORKER_PIN')
   self._launch()
   for kind,stream in [('stdout',self.process.stdout),('stderr',self.process.stderr)]:
    os.set_blocking(stream.fileno(),False);self.selector.register(stream,selectors.EVENT_READ,kind)
   os.set_blocking(self.process.stdin.fileno(),False)
   ready=self._line(min(self.deadline,self.started+IMAGE_SECONDS))
   need(ready=={'schema':SCHEMA,'type':'ready','codec':CODEC},'READY_SCHEMA')
   self._idle_output_check()
  except BaseException:self.abort();raise
 def _launch(self):
  # Own the PID before asynchronous cancellation can interrupt startup. There
  # is no blocking exec handshake between fork and parent ownership.
  raw=set();streams=[]
  try:
   pairs=[]
   for _ in range(3):
    pair=os.pipe2(os.O_CLOEXEC);pairs.append(pair);raw.update(pair)
   for fd,mode in [(pairs[0][1],'wb'),(pairs[1][0],'rb'),(pairs[2][0],'rb')]:
    streams.append(os.fdopen(fd,mode,buffering=0));raw.remove(fd)
   self.process=WorkerProcess(*streams)
   expected_parent=os.getpid()
   blocked={signal.SIGALRM,signal.SIGINT,signal.SIGTERM,signal.SIGHUP,signal.SIGQUIT}
   old_mask=signal.pthread_sigmask(signal.SIG_BLOCK,blocked)
   try:
    pid=os.fork()
    if pid==0:
     try:
      child_setup(expected_parent)
      for source,dest in [(pairs[0][0],0),(pairs[1][1],1),(pairs[2][1],2)]:os.dup2(source,dest)
      for name in os.listdir('/proc/self/fd'):
       fd=int(name)
       if fd>2:
        try:os.close(fd)
        except OSError:pass
      signal.pthread_sigmask(signal.SIG_SETMASK,old_mask)
      os.execve(str(self.node),[str(self.node),'--jitless','--max-old-space-size=128',str(WORKER)],{'GITHUB_WORKSPACE':self.workspace,'LANG':'C','LC_ALL':'C','TZ':'UTC'})
     except BaseException:os._exit(126)
    self.process.pid=pid
    for fd in list(raw):os.close(fd);raw.remove(fd)
    # No raw artifact or readiness read occurs before this irreversible drop.
    resource.setrlimit(resource.RLIMIT_AS,(PARENT_SOFT,PARENT_HARD))
    self.parent_limits=resource.getrlimit(resource.RLIMIT_AS)
   finally:signal.pthread_sigmask(signal.SIG_SETMASK,old_mask)
  finally:
   for fd in raw:
    try:os.close(fd)
    except OSError:pass
   if self.process is None:
    for stream in streams:stream.close()
 def _alarm(self,*_):
  self.deadline_expired=True
  self.abort()
  raise DecoderDenied('GLOBAL_DEADLINE')
 def _check(self,deadline):need(time.monotonic()<min(deadline,self.deadline),'DECODER_DEADLINE')
 def _pump(self,deadline,write=None):
  self._check(deadline)
  events=self.selector.select(max(0,min(deadline,self.deadline)-time.monotonic()))
  self._check(deadline)
  wrote=0
  for key,mask in events:
   if key.data=='stdin':
    if write is not None:
     try:wrote=os.write(key.fd,write[:65536])
     except BlockingIOError:pass
    continue
   try:b=os.read(key.fd,65536 if key.data=='stderr' else MAX_REPLY+1)
   except BlockingIOError:continue
   if not b:
    self.selector.unregister(key.fileobj)
    if key.data=='stdout':self.out_eof=True
    else:self.err_eof=True
   elif key.data=='stderr':
    self.stderr_bytes+=len(b);need(self.stderr_bytes<=MAX_STDERR,'STDERR_BUDGET')
   else:
    self.buffer.extend(b);need(len(self.buffer)<=MAX_REPLY,'STDOUT_BUDGET')
  return wrote
 def _line(self,deadline):
  while b'\n' not in self.buffer:
   need(not self.out_eof,'PREMATURE_STDOUT_EOF');self._pump(deadline)
  line,rest=self.buffer.split(b'\n',1);self.buffer=bytearray(rest)
  need(not rest,'EXTRA_STDOUT')
  try:out=json.loads(line.decode('ascii'),object_pairs_hook=strict_object,parse_constant=lambda _:(_ for _ in ()).throw(DecoderDenied('NONFINITE_RESPONSE')))
  except (ValueError,UnicodeError) as e:raise DecoderDenied('RESPONSE_JSON') from e
  need(type(out) is dict and canonical(out)==line,'RESPONSE_CANONICAL_OBJECT')
  return out
 def _idle_output_check(self):
  need(not self.buffer,'UNSOLICITED_OUTPUT')
  # Drain only currently ready pipes; any stdout outside a pending reply is fatal.
  for key,_ in self.selector.select(0):
   if key.data=='stdin':continue
   b=os.read(key.fd,MAX_REPLY+1 if key.data=='stdout' else MAX_STDERR+1)
   if key.data=='stdout':need(not b,'UNSOLICITED_OUTPUT');need(False,'EARLY_WORKER_EXIT')
   if not b:self.err_eof=True;self.selector.unregister(key.fileobj)
   else:self.stderr_bytes+=len(b);need(self.stderr_bytes<=MAX_STDERR,'STDERR_BUDGET')
 def _write(self,parts,deadline):
  self.selector.register(self.process.stdin,selectors.EVENT_WRITE,'stdin')
  try:
   for part in parts:
    data=memoryview(part)
    while data:
     n=self._pump(deadline,data);data=data[n:]
     need(not self.buffer and not self.out_eof,'REPLY_BEFORE_REQUEST_COMPLETE')
  finally:
   try:self.selector.unregister(self.process.stdin)
   except KeyError:pass
 def decode(self,data):
  try:
   need(not self.closed and type(data) is bytes and 0<len(data)<=MAX_INPUT and self.count<MAX_IMAGES,'REQUEST_BOUNDS')
   self._idle_output_check();deadline=min(self.deadline,time.monotonic()+IMAGE_SECONDS)
   sha=hashlib.sha256(data).hexdigest();header=canonical({'schema':SCHEMA,'index':self.count,'bytes':len(data),'sha256':sha})
   need(len(header)<=256,'HEADER_BUDGET');self._write([len(header).to_bytes(4,'big'),header,data],deadline)
   result=self._line(deadline)
   need(list(result)==['schema','type','index','bytes','sha256','ok','width','height'],'RESULT_KEYS')
   need(result['schema']==SCHEMA and result['type']=='result' and type(result['index']) is int and result['index']==self.count and type(result['bytes']) is int and result['bytes']==len(data) and result['sha256']==sha and type(result['ok']) is bool,'RESULT_IDENTITY')
   need(result['ok'],'IMAGE_INVALID')
   w,h=result['width'],result['height'];need(type(w) is int and type(h) is int and 0<w<=4096 and 0<h<=4096 and w*h<=16*MIB,'RESULT_DIMENSIONS')
   self.count+=1;self._idle_output_check();return {'width':w,'height':h}
  except BaseException:self.abort();raise
 def finish(self):
  try:
   need(not self.closed,'ALREADY_CLOSED');self._idle_output_check();self.process.stdin.close()
   deadline=min(self.deadline,time.monotonic()+IMAGE_SECONDS)
   done=self._line(deadline);need(done=={'schema':SCHEMA,'type':'done','count':self.count} and type(done['count']) is int,'DONE_SCHEMA_COUNT')
   while not(self.out_eof and self.err_eof):
    self._pump(deadline);need(not self.buffer,'TRAILING_STDOUT')
   self._check(deadline);returncode=self.process.wait(timeout=max(.001,min(deadline,self.deadline)-time.monotonic()))
   need(returncode==0,'WORKER_EXIT');self.closed=True;self._cleanup()
   need(not self.cleanup_failed,'CLEANUP_FAILED');need(not self.deadline_expired,'GLOBAL_DEADLINE')
   self._check(deadline)
   self.accepted=True;return self.count
  except BaseException:self.abort();raise
 def _cleanup_error(self,code):
  self.cleanup_failed=True
  if code not in self.cleanup_errors and len(self.cleanup_errors)<8:self.cleanup_errors.append(code)
 def _discard_owned_alarm(self):
  # No pre-existing timer was admitted. Drain only our blocked pending alarm,
  # never another signal, before restoring the predecessor disposition.
  if self.alarm_owned:
   if signal.sigtimedwait({signal.SIGALRM},0) is not None:self.deadline_expired=True
 def _teardown(self,kill):
  previous=signal.pthread_sigmask(signal.SIG_BLOCK,{signal.SIGALRM,signal.SIGINT,signal.SIGTERM,signal.SIGHUP,signal.SIGQUIT})
  try:
   if self.alarm_owned:
    try:signal.setitimer(signal.ITIMER_REAL,0);self._discard_owned_alarm()
    except Exception:self._cleanup_error('ALARM_DISARM_FAILED')
   try:
    if kill and self.process and self.process.pid is not None:
     try:self.process.kill()
     except ProcessLookupError:pass
     except Exception:
      self.cleanup_unconfirmed_pid=self.process.pid;self._cleanup_error('KILL_OR_POLL_FAILED')
     try:self.process.wait(timeout=1)
     except subprocess.TimeoutExpired:
      self.unreaped_pid=self.process.pid;self._cleanup_error('REAP_TIMEOUT')
     except Exception:
      self.cleanup_unconfirmed_pid=self.process.pid;self._cleanup_error('WAIT_OWNERSHIP_OR_WAIT_FAILED')
   finally:
    # Each resource is attempted independently, even if another close fails.
    if self.process:
     for stream in (self.process.stdin,self.process.stdout,self.process.stderr):
      try:
       if stream and not stream.closed:stream.close()
      except Exception:self._cleanup_error('PIPE_CLOSE_FAILED')
    try:self.selector.close()
    except Exception:self._cleanup_error('SELECTOR_CLOSE_FAILED')
    if self.alarm_owned:
     try:
      signal.setitimer(signal.ITIMER_REAL,0);self._discard_owned_alarm()
      signal.signal(signal.SIGALRM,self.old_alarm);self.alarm_owned=False
     except Exception:self._cleanup_error('ALARM_RESTORE_FAILED')
  finally:signal.pthread_sigmask(signal.SIG_SETMASK,previous)
 def _cleanup(self):self._teardown(False)
 def abort(self):
  self.closed=True;self.accepted=False
  self._teardown(True)
 def __enter__(self):return self
 def __exit__(self,kind,*_):
  if kind is not None or not self.accepted:self.abort()
