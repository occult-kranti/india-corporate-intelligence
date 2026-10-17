"""Bounded structural inspection, never a semantic-privacy or publication certificate.

This inspector is only one component of an exact producer/current-run envelope.
It does not authenticate the process or infer that pixels/text contain no sensitive
material. The externally approved raw-evidence scope and frozen producer are the
provenance model; unsupported structures are held intact, not stripped.
"""
import sys,json,re,zipfile,stat,hashlib,struct,zlib,binascii,subprocess,base64,pathlib,os,importlib.util
_bspec=importlib.util.spec_from_file_location('streaming_budget_proposal',pathlib.Path(__file__).with_name('streaming-budget-proposal.py'));budget_module=importlib.util.module_from_spec(_bspec);sys.dont_write_bytecode=True;_bspec.loader.exec_module(budget_module)
_aspec=importlib.util.spec_from_file_location('bound_trace_archive_proposal',pathlib.Path(__file__).with_name('bound-trace-archive-proposal.py'));archive_module=importlib.util.module_from_spec(_aspec);_aspec.loader.exec_module(archive_module)
_active_budget=None
_active_decoder=None
_hspec=importlib.util.spec_from_file_location("har_schema",pathlib.Path(__file__).with_name("har-schema.py"));har_schema=importlib.util.module_from_spec(_hspec);sys.dont_write_bytecode=True;_hspec.loader.exec_module(har_schema)
ALLOWED_URL=re.compile(r'^http://127\.0\.0\.1:[1-9]\d{0,4}/review-prototypes/epstein-world-map/(index|readable|controller-fixture)\.html$')
MEMBER=re.compile(r'^(trace\.(trace|network|stacks)|resources/(?!src@)[A-Za-z0-9@_.-]+)$')
HTML_HASHES={'df94482b42c13c0aebdcea5fcdf92244aae06924a6dfb48b8e99fcd7e574b1a4','5db4a1567b88fbe2fbe81d4e1e47cf62e904b436bab0681ebf00c79153d54b21','d6dd8bd6af2c768c2549a46a40d6bf7f6f904e65457a79fe899afaab41577b27'}
# Only canonical hashes of the exact 112 reviewed record pointers are supported.
from urllib.parse import quote
_PACKET=json.loads((pathlib.Path(__file__).resolve().parent.parent/'data/packet.json').read_bytes())
_RECORD_FRAGMENTS={'#record='+quote(f'{prefix}/{collection}/{i}',safe="~()*!.'") for prefix,packet in [('/baseline',_PACKET['baseline'])]+[(f'/extensions/{i}',p) for i,p in enumerate(_PACKET['extensions'])] for collection in ['milestones','procedural_relations'] for i in range(len(packet[collection]))}
def frame_url(value):
 if not isinstance(value,str):return False
 if ALLOWED_URL.fullmatch(value):return True
 base,sep,fragment=value.partition('#')
 return bool(sep and ALLOWED_URL.fullmatch(base) and not base.endswith('readable.html') and '#'+fragment in _RECORD_FRAGMENTS)
def require(ok,code):
 if not ok: raise ValueError(code)
def keys(v,allowed,required=()):
 require(isinstance(v,dict) and set(v)<=set(allowed) and set(required)<=set(v),'UNKNOWN_OR_MISSING_FIELDS')
def bounded(v,depth=0):
 require(depth<100,'JSON_DEPTH')
 if isinstance(v,str):require(len(v)<=8*1024*1024,'STRING_BUDGET')
 elif isinstance(v,list):
  require(len(v)<=100000,'ARRAY_BUDGET')
  for x in v:bounded(x,depth+1)
 elif isinstance(v,dict):
  require(len(v)<=10000,'OBJECT_BUDGET')
  for k,x in v.items():require(isinstance(k,str),'OBJECT_KEY');bounded(x,depth+1)
 else:require(v is None or isinstance(v,(bool,int,float)),'JSON_TYPE')
def png(b):
 require(b.startswith(b'\x89PNG\r\n\x1a\n'),'PNG_SIGNATURE');p=8;data=[];seen=[];width=height=channels=None
 while p<len(b):
  require(p+12<=len(b),'PNG_TRUNCATED');n=struct.unpack('>I',b[p:p+4])[0];t=b[p+4:p+8];require(n<=32*1024*1024 and p+n+12<=len(b),'PNG_CHUNK_LENGTH');v=b[p+8:p+8+n];crc=struct.unpack('>I',b[p+8+n:p+12+n])[0];require(binascii.crc32(t+v)&0xffffffff==crc,'PNG_CRC');seen.append(t)
  require(t in [b'IHDR',b'IDAT',b'IEND',b'sRGB',b'gAMA',b'pHYs'],'PNG_UNSUPPORTED_CHUNK')
  if t==b'IHDR':
   require(len(seen)==1 and n==13,'PNG_IHDR');width,height,depth,color,compression,filter_,interlace=struct.unpack('>IIBBBBB',v);require(0<width<=4096 and 0<height<=4096 and width*height<=16*1024*1024,'PNG_DIMENSIONS');require(depth==8 and color in [2,6] and compression==filter_==interlace==0,'PNG_UNSUPPORTED_ENCODING');channels=3 if color==2 else 4
  if t==b'IDAT':data.append(v)
  p+=n+12
  if t==b'IEND':require(n==0 and p==len(b),'PNG_TRAILING_CONTENT');break
 require(seen.count(b'IHDR')==1 and seen[-1:]==[b'IEND'] and data,'PNG_REQUIRED_CHUNKS');expected=(width*channels+1)*height;d=zlib.decompressobj();decoded=d.decompress(b''.join(data),expected+1);require(len(decoded)==expected and d.eof and not d.unused_data and not d.unconsumed_tail,'PNG_DECODE_LENGTH');stride=width*channels+1;require(all(decoded[i] in range(5) for i in range(0,len(decoded),stride)),'PNG_FILTER');return {'width':width,'height':height,'decodedBytes':len(decoded),'semanticPrivacyCertified':False}
def headers(values):
 require(isinstance(values,list) and len(values)<=100,'HEADER_LIST')
 for h in values:
  keys(h,['name','value'],['name','value']);require(isinstance(h['name'],str) and isinstance(h['value'],str) and len(h['name'])<=128 and len(h['value'])<=8192 and '\r' not in h['value'] and '\n' not in h['value'],'HEADER_SCHEMA');require(h['name'].lower() not in ['authorization','cookie','set-cookie','proxy-authorization'],'REQUEST_CREDENTIALS')
def request_check(q):
 keys(q,['method','url','httpVersion','cookies','headers','queryString','headersSize','bodySize'],['method','url','cookies','headers']);require(bool(ALLOWED_URL.fullmatch(q.get('url',''))),'REQUEST_URL');require(q.get('method')=='GET','REQUEST_METHOD');require(q.get('cookies')==[] and q.get('queryString',[])==[],'REQUEST_PRIVATE_STATE');headers(q['headers'])
def serialized(v,depth=0):
 require(depth<100,'SERIALIZED_DEPTH');keys(v,['n','s','b','v','d','u','bi','e','r','a','o','h','id','ref']);require(v,'SERIALIZED_EMPTY')
 for k,x in v.items():
  if k=='a':require(isinstance(x,list),'SERIALIZED_ARRAY');[serialized(y,depth+1) for y in x]
  elif k=='o':
   require(isinstance(x,list),'SERIALIZED_OBJECT')
   for pair in x:keys(pair,['k','v'],['k','v']);require(isinstance(pair['k'],str),'SERIALIZED_KEY');serialized(pair['v'],depth+1)
  elif k in ['id','ref','h']:require(isinstance(x,int) and x>=0,'SERIALIZED_ID')
  elif k=='b':require(isinstance(x,bool),'SERIALIZED_BOOLEAN')
  elif k=='n':require(isinstance(x,(int,float)),'SERIALIZED_NUMBER')
  elif k=='e':keys(x,['n','m','s'],['n','m','s']);require(all(isinstance(a,str) for a in x.values()),'SERIALIZED_ERROR')
  elif k=='r':keys(x,['p','f'],['p','f']);require(all(isinstance(a,str) for a in x.values()),'SERIALIZED_REGEX')
  else:require(isinstance(x,str),'SERIALIZED_STRING')
def parameters(p):
 bounded(p)
 for k,v in p.items():
  if k=='arg':keys(v,['value','handles'],['value','handles']);serialized(v['value']);require(isinstance(v['handles'],list) and not v['handles'],'SERIALIZED_HANDLES_UNSUPPORTED')
  elif k in ['selector','expression','url','waitUntil','state','key','type','scale','caret','animations','world','encoding','path','name','method']:require(isinstance(v,str),'PARAMETER_STRING')
  elif k in ['strict','force','noWaitAfter','trial','isFunction','omitBackground','fullPage','omitReturnValue','isFallback']:require(isinstance(v,bool),'PARAMETER_BOOLEAN')
  elif k in ['timeout','quality','width','height','clickCount','delay']:require(isinstance(v,(int,float)) and v>=0,'PARAMETER_NUMBER')
  elif k=='params':require(v is None or isinstance(v,dict),'CDP_PARAMS');require(not v,'CDP_PARAMS_UNSUPPORTED')
  elif k in ['viewportSize','position','clip']:require(isinstance(v,dict) and set(v)<={'x','y','width','height'} and all(isinstance(n,(int,float)) for n in v.values()),'PARAMETER_GEOMETRY')
  elif k=='payloads':
   require(isinstance(v,list) and len(v)<=1,'FILE_FIXTURE_COUNT')
   for f in v:keys(f,['name','mimeType','buffer'],['name','mimeType','buffer']);require(f['name'] in ['corrupt.json','unsupported.json','changed.json','empty.json','packet.json'] and f['mimeType']=='application/json' and f['buffer']=='<Buffer>','FILE_FIXTURE_UNSUPPORTED')
  elif k=='options':
   require(isinstance(v,list),'SELECT_OPTIONS')
   for item in v:keys(item,['value','label','index']);require(all(isinstance(x,(str,int)) for x in item.values()),'SELECT_OPTION')
  elif k in ['elements','localPaths','localDirectory','streams','mask']:require(v==[] or v is None,'PARAMETER_EXTERNAL_RESOURCE_UNSUPPORTED')
  elif k=='modifiers':require(isinstance(v,list) and all(x in ['Alt','Control','Meta','Shift','ControlOrMeta'] for x in v),'KEY_MODIFIER')
  else:require(v is None or isinstance(v,(str,int,float,bool,list,dict)),'PARAMETER_TYPE')
def image_decode(b):
 require(len(b)<=32*1024**2,'IMAGE_BUDGET')
 if b.startswith(b'\x89PNG\r\n\x1a\n'):png(b)
 else:require(b.startswith(b'\xff\xd8\xff') and b.endswith(b'\xff\xd9'),'JPEG_FRAMING')
 require(_active_decoder is not None,'QUALIFIED_IMAGE_DECODER_REQUIRED')
 return {'ok':True,**_active_decoder.decode(b)}


def tree(node,depth=0):
 require(depth<150,'FRAME_TREE_DEPTH')
 if isinstance(node,str):require(len(node)<=8*1024**2,'FRAME_TEXT_BUDGET');return
 require(isinstance(node,list) and len(node)>0,'FRAME_TREE_NODE')
 if isinstance(node[0],list):require(len(node)==1 and len(node[0])==2 and all(isinstance(n,int) and n>=0 for n in node[0]),'FRAME_TREE_REFERENCE');return
 require(isinstance(node[0],str) and re.fullmatch(r'[A-Za-z][A-Za-z0-9:_-]*',node[0]),'FRAME_TAG')
 i=1
 if len(node)>1 and isinstance(node[1],dict):
  for k,v in node[1].items():require(isinstance(k,str) and isinstance(v,str) and len(v)<=8*1024**2,'FRAME_ATTRIBUTE')
  i=2
 for child in node[i:]:tree(child,depth+1)

def audit(path,expected=None,budget=None,decoder=None):
 global _active_budget,_active_decoder
 _active_budget=budget if budget is not None else budget_module.Budget()
 _active_decoder=decoder
 if decoder is not None:require(budget is not None and decoder.deadline==budget.deadline,'SHARED_DECODER_DEADLINE_REQUIRED')
 rows=[];events=0;types=set();resources={};image_refs=set();html_refs=set();html_sizes={};calls=set();after=set();context_seen=False;frame_seen=False;network_seen=False
 with archive_module.Archive(path,_active_budget,budget_module.POLICY,expected) as z:
  infos=z.infolist();require(len(infos)<50000,'TRACE_MEMBER_COUNT');require(len({i.filename for i in infos})==len(infos),'DUPLICATE_TRACE_MEMBER');require(sum(i.file_size for i in infos)<=512*1024**2,'TRACE_EXPANSION_BUDGET')
  for i in infos:
   require(bool(MEMBER.fullmatch(i.filename)),'TRACE_MEMBER_NAME');require(not stat.S_ISLNK(i.external_attr>>16),'TRACE_SYMLINK');require(i.file_size<=budget_module.member_limit(i.filename),'TRACE_MEMBER_BUDGET');require(not i.flag_bits&1,'TRACE_ENCRYPTED');reader=budget_module.Member(z.open(i),i.file_size,budget_module.member_limit(i.filename),_active_budget)
   if not i.filename.endswith(('.trace','.network')):b=reader.all()
   if i.filename.endswith(('.trace','.network')):
    for line in reader.lines():
     _active_budget.event();require(len(line)<=16*1024**2,'TRACE_LINE_BUDGET');event=json.loads(line);bounded(event);require(isinstance(event,dict),'TRACE_EVENT_OBJECT');kind=event.get('type');events+=1;types.add(kind)
     shapes={
      'context-options':(['version','type','origin','browserName','playwrightVersion','options','platform','wallTime','monotonicTime','sdkLanguage','testIdAttributeName','contextId','channel','title'],['version','type','origin','browserName','playwrightVersion','options','platform','wallTime','monotonicTime','sdkLanguage','contextId']),
      'before':(['type','callId','startTime','title','class','method','params','stepId','pageId','parentId','beforeSnapshot'],['type','callId','startTime','class','method','params']),
      'after':(['type','callId','endTime','error','result','afterSnapshot','point'],['type','callId','endTime']),
      'input':(['type','callId','point','inputSnapshot'],['type','callId']),
      'log':(['type','callId','time','message'],['type','callId','time','message']),
      'console':(['type','messageType','text','args','location','time','pageId'],['type','messageType','text','args','location','time']),
      'event':(['type','time','class','method','params','pageId'],['type','time','class','method','params']),
      'frame-snapshot':(['type','snapshot'],['type','snapshot']),
      'resource-snapshot':(['type','snapshot'],['type','snapshot']),
      'screencast-frame':(['type','pageId','sha1','width','height','timestamp','frameSwapWallTime'],['type','pageId','sha1','width','height','timestamp'])}
     require(kind in shapes,'TRACE_EVENT_UNSUPPORTED');keys(event,*shapes[kind])
     for k in ['startTime','endTime','time','timestamp','wallTime','monotonicTime','frameSwapWallTime']:
      if k in event:require(isinstance(event[k],(int,float)) and event[k]>=0,'TRACE_CLOCK')
     for k in ['callId','pageId','parentId','stepId','contextId']:
      if k in event:require(isinstance(event[k],str) and re.fullmatch(r'[a-z-]+@[a-zA-Z0-9-]+',event[k]),'TRACE_RUNTIME_ID')
     if kind=='context-options':
      require(not context_seen and event['version']==8 and event['playwrightVersion']=='1.62.1' and event['browserName']=='chromium' and event['origin']=='library' and event['platform']=='linux' and event['sdkLanguage']=='javascript','TRACE_CONTEXT_IDENTITY');require(event.get('channel') in [None,'chrome'],'TRACE_BROWSER_CHANNEL');context_seen=True;o=event['options'];keys(o,['viewport','noDefaultViewport','deviceScaleFactor','isMobile','hasTouch','locale','timezoneId','reducedMotion','forcedColors','colorScheme','acceptDownloads','serviceWorkers','recordHar','selectorEngines'],['viewport','acceptDownloads','serviceWorkers']);require(o['viewport']=={'width':1440,'height':1000} and o['acceptDownloads'] in [False,'deny'] and o['serviceWorkers']=='block','TRACE_CONTEXT_CONFINEMENT');require(o.get('selectorEngines',[])==[],'TRACE_CUSTOM_ENGINE');
      if 'recordHar' in o:keys(o['recordHar'],['path','content','mode','omitContent','urlFilter']);require(o['recordHar'].get('content','embed')=='embed' and o['recordHar'].get('mode','full')=='full','TRACE_HAR_MODE')
     elif kind=='resource-snapshot':
      snap=event['snapshot'];keys(snap,['pageref','startedDateTime','time','request','response','cache','timings','serverIPAddress','connection','_frameref','_monotonicTime','_resourceType','_serverPort','_securityDetails','_wasContinued'],['startedDateTime','time','request','response','cache','timings']);har_schema.entry_metadata(snap);request_check(snap.get('request'));keys(snap['response'],['status','statusText','httpVersion','cookies','headers','content','headersSize','bodySize','redirectURL','_transferSize','_failureText'],['status','cookies','headers','content']);headers(snap['response']['headers']);keys(snap['cache'],[]);keys(snap['timings'],['blocked','dns','connect','send','wait','receive','ssl']);require(all(isinstance(n,(int,float)) and n>=-1 for n in snap['timings'].values()),'TRACE_TIMINGS');require(not snap['response'].get('cookies') and snap['response'].get('status')==200,'TRACE_RESPONSE');require(snap.get('serverIPAddress','127.0.0.1')=='127.0.0.1','TRACE_REMOTE_ADDRESS');require(snap.get('_resourceType','document')=='document','TRACE_RESOURCE_TYPE');c=snap['response']['content'];keys(c,['size','mimeType','compression','_sha1'],['size','mimeType','_sha1']);require(c['mimeType'].split(';')[0]=='text/html','TRACE_CONTENT_TYPE');require(re.fullmatch(r'[a-f0-9]{40}\.html',c['_sha1']),'TRACE_CONTENT_REFERENCE');require(c['size']>=0,'TRACE_DOCUMENT_SIZE');html_refs.add(c['_sha1']);html_sizes.setdefault(c['_sha1'],set()).add(c['size']);network_seen=True
     elif kind=='frame-snapshot':
      v=event['snapshot'];keys(v,['callId','snapshotName','pageId','frameId','frameUrl','doctype','html','viewport','timestamp','wallTime','collectionTime','resourceOverrides','isMainFrame'],['snapshotName','pageId','frameId','frameUrl','html','viewport','timestamp','resourceOverrides','isMainFrame']);require(v['frameUrl']=='about:blank' or frame_url(v['frameUrl']),'TRACE_FRAME_URL');require(v['isMainFrame'] is True and v['resourceOverrides']==[],'TRACE_FRAME_RESOURCES_UNSUPPORTED');require('doctype' not in v or v['doctype']=='html','TRACE_DOCTYPE');tree(v['html']);require(isinstance(v['viewport'],dict) and set(v['viewport'])=={'width','height'} and all(isinstance(n,int) and 0<n<=4096 for n in v['viewport'].values()),'TRACE_FRAME_VIEWPORT');frame_seen=True
     elif kind=='screencast-frame':
      require(isinstance(event['width'],int) and isinstance(event['height'],int) and 0<event['width']<=4096 and 0<event['height']<=4096,'TRACE_IMAGE_DIMENSIONS');require(isinstance(event['sha1'],str) and re.fullmatch(r'page@[a-f0-9]+-[0-9]+\.jpeg',event['sha1']),'TRACE_IMAGE_REFERENCE');image_refs.add(event['sha1'])
     elif kind=='before':
      methods={'BrowserContext':{'newPage','newCDPSession'},'Page':{'goto','screenshot','setViewportSize','emulateMedia','keyboardPress','mouseMove','mouseWheel','goBack','goForward','close','content'},'Route':{'continue','abort'},'Frame':{'content','goto','waitForSelector','queryCount','querySelector','querySelectorAll','selectOption','click','evaluateExpression','evaluateExpressionHandle','evalOnSelector','evalOnSelectorAll','getAttribute','innerText','innerHTML','focus','setInputFiles'},'ElementHandle':{'scrollIntoViewIfNeeded','evaluateExpression','evaluateExpressionHandle'},'CDPSession':{'send','detach'}}
      require(event['class'] in methods and event['method'] in methods[event['class']],'TRACE_METHOD_UNSUPPORTED');require(isinstance(event['params'],dict),'TRACE_PARAMS_OBJECT');parameters(event['params']);allowed={'url','waitUntil','referer','timeout','selector','strict','state','expression','isFunction','arg','options','force','noWaitAfter','trial','button','modifiers','clickCount','delay','position','values','elements','payloads','localPaths','localDirectory','streams','key','width','height','viewportSize','media','colorScheme','reducedMotion','forcedColors','contrast','type','quality','omitBackground','fullPage','clip','scale','caret','animations','mask','maskColor','style','name','method','params','page','frame','world','encoding','path','x','y','deltaX','deltaY','steps','omitReturnValue','isFallback','errorCode'};require(set(event['params'])<=allowed,'TRACE_PARAMS_UNSUPPORTED');
      for field,pair in {'omitReturnValue':('Frame','waitForSelector'),'payloads':('Frame','setInputFiles'),'isFallback':('Route','continue'),'errorCode':('Route','abort')}.items():
       if field in event['params']:require((event['class'],event['method'])==pair,'TRACE_PARAMETER_METHOD_SCOPE')
      if event['class']=='Page' and event['method'] in ['mouseMove','mouseWheel','goBack','goForward']:
       required={'mouseMove':['x','y'],'mouseWheel':['deltaX','deltaY'],'goBack':['waitUntil'],'goForward':['waitUntil']}[event['method']]
       allowed_new=required+(['steps'] if event['method']=='mouseMove' else [])
       keys(event['params'],allowed_new,required)
       for field,value in event['params'].items():
        if field=='waitUntil':require(value in ['load','domcontentloaded','networkidle','commit'],'NAVIGATION_WAIT_UNSUPPORTED')
        else:require(isinstance(value,(int,float)) and not isinstance(value,bool) and abs(value)<=100000,'NATIVE_INPUT_NUMBER')
      for field in ['x','y','steps','deltaX','deltaY']:
       if field in event['params']:require(event['class']=='Page' and event['method']==('mouseWheel' if field in ['deltaX','deltaY'] else 'mouseMove'),'NATIVE_INPUT_METHOD_SCOPE')
      if event['class']=='Frame' and event['method']=='content':keys(event['params'],[])
      if event['class']=='Route':
       if event['method']=='continue':keys(event['params'],['isFallback'],['isFallback']);require(event['params']['isFallback'] is False,'ROUTE_OVERRIDE_UNSUPPORTED')
       else:keys(event['params'],['errorCode'],['errorCode']);require(event['params']['errorCode']=='blockedbyclient','ROUTE_ABORT_CODE_UNSUPPORTED')
      require(event['class']!='CDPSession' or event['method']!='send' or event['params'].get('method')=='Accessibility.getFullAXTree','CDP_METHOD_UNSUPPORTED');require(event['callId'] not in calls,'TRACE_DUPLICATE_CALL');calls.add(event['callId']);require(len(calls)<=budget_module.POLICY['maxCalls'],'TRACE_CALL_COUNT')
     elif kind=='after':
      require(event['callId'] in calls and event['callId'] not in after,'TRACE_AFTER_WITHOUT_BEFORE');after.add(event['callId'])
      if 'result' in event:keys(event['result'],['value','values','element','elements','response','result','session','page','count','handle','disposable','binary','matches','log','file','noReply']);bounded(event['result'])
      if 'error' in event:keys(event['error'],['name','message','stack'],['message']);require(all(isinstance(x,str) for x in event['error'].values()),'TRACE_ERROR_SCHEMA')
     elif kind in ['input','log']:require(event['callId'] in calls,'TRACE_CALL_REFERENCE');require(kind!='log' or isinstance(event['message'],str),'TRACE_LOG_MESSAGE')
     elif kind=='console':
      require(event['messageType'] in ['error','warning','log','info','debug','assert','trace','startGroup','endGroup','startGroupCollapsed'],'TRACE_CONSOLE_TYPE');require(isinstance(event['text'],str) and isinstance(event['args'],list),'TRACE_CONSOLE_SCHEMA');keys(event['location'],['url','lineNumber','columnNumber'],['url','lineNumber','columnNumber']);require(event['location']['url']=='' or frame_url(event['location']['url']),'TRACE_CONSOLE_LOCATION');
      for a in event['args']:keys(a,['preview','value'],['preview']);require(isinstance(a['preview'],str),'TRACE_CONSOLE_ARGUMENT')
     elif kind=='event':
      require(event['class']=='BrowserContext' and event['method'] in ['page','pageClosed','pageError'],'TRACE_BROWSER_EVENT_UNSUPPORTED');keys(event['params'],['pageId','openerPageId'] if event['method']!='pageError' else ['error','location']);require(event['method']=='pageError' or 'pageId' in event['params'],'TRACE_PAGE_EVENT')
   elif i.filename=='trace.stacks':
    v=json.loads(b);keys(v,['files','stacks'],['files','stacks']);require(isinstance(v['files'],list) and isinstance(v['stacks'],list),'TRACE_STACKS_SCHEMA');require(len(v['files'])<1000 and len(v['stacks'])<50000,'TRACE_STACKS_BUDGET')
    for f in v['files']:require(isinstance(f,str) and re.fullmatch(r'(?:async file://)?/home/runner/work/india-corporate-intelligence/india-corporate-intelligence/review-prototypes/epstein-world-map/scripts/[a-z-]+\.mjs',f),'TRACE_STACK_FILE')
    for call in v['stacks']:
     require(isinstance(call,list) and len(call)==2 and isinstance(call[0],int) and isinstance(call[1],list),'TRACE_STACK_CALL')
     for frame in call[1]:require(isinstance(frame,list) and len(frame)==4 and isinstance(frame[0],int) and 0<=frame[0]<len(v['files']) and all(isinstance(x,int) and x>=0 for x in frame[1:3]) and isinstance(frame[3],str) and len(frame[3])<256,'TRACE_STACK_FRAME')
   elif i.filename.startswith('resources/'):
    name=i.filename.split('/',1)[1]
    if b.startswith((b'\x89PNG\r\n\x1a\n',b'\xff\xd8\xff')):resources[name]={'kind':'image','decoded':image_decode(b)}
    else:require(hashlib.sha256(b).hexdigest() in HTML_HASHES,'TRACE_RESOURCE_NOT_APPROVED_INPUT');require(name==hashlib.sha1(b).hexdigest()+'.html','TRACE_HTML_RESOURCE_NAME');resources[name]={'kind':'html','bytes':len(b)}
   rows.append({'path':i.filename,**reader.receipt()});reader.handle.close()
  require('trace.trace' in {i.filename for i in infos},'TRACE_STREAM_MISSING');require(events>0 and context_seen,'TRACE_CONTEXT_MISSING');require(image_refs=={n for n,r in resources.items() if r['kind']=='image'},'TRACE_IMAGE_REFERENCE_CLOSURE');require(html_refs=={n for n,r in resources.items() if r['kind']=='html'},'TRACE_HTML_REFERENCE_CLOSURE');require(all(sizes=={resources[name]['bytes']} for name,sizes in html_sizes.items()),'TRACE_DOCUMENT_SIZE')
 _active_budget.check()
 return {'status':'BOUNDED_TRACE_SCHEMA','archive':z.receipt,'members':rows,'eventCount':events,'eventTypes':sorted(types),'frameSnapshots':frame_seen,'networkObserved':network_seen,'actionCalls':len(calls),'completedCalls':len(after),'screencastImages':len(image_refs),'boundedSchemaSupported':True,'semanticPrivacyCertified':False,'provenanceRequirement':'outer exact producer receipt and current-run manifest binding required'}
if __name__=='__main__':
 from persistent_decoder import Decoder,DecoderDenied
 try:
  budget=budget_module.Budget()
  with Decoder(deadline=budget.deadline) as decoder:
   result=audit(sys.argv[1],budget=budget,decoder=decoder);decoder.finish();budget.check()
  print(json.dumps(result,separators=(',',':')))
 except Exception as e:
  code=str(e) if isinstance(e,(ValueError,DecoderDenied)) and re.fullmatch('[A-Z_]+',str(e)) else 'MALFORMED_TRACE'
  print(json.dumps({'status':'DENY_TRACE_STRUCTURE_OR_UNSUPPORTED_SCHEMA','code':code,'boundedSchemaSupported':False}));sys.exit(1)
