"""Inspect retained classes without editing/extracting them or granting publication."""
import sys,json,pathlib,hashlib,base64,importlib.util,re
from html.parser import HTMLParser
spec=importlib.util.spec_from_file_location('trace_audit',pathlib.Path(__file__).with_name('audit-trace.py'));trace=importlib.util.module_from_spec(spec);sys.dont_write_bytecode=True;spec.loader.exec_module(trace)
require=trace.require;keys=trace.keys;bounded=trace.bounded
def axvalue(v,depth=0):
 require(depth<20,'AX_VALUE_DEPTH');keys(v,['type','value','relatedNodes','sources'],['type']);require(v['type'] in ['boolean','tristate','booleanOrUndefined','idref','idrefList','integer','node','nodeList','number','string','computedString','token','tokenList','domRelation','role','internalRole','valueUndefined'],'AX_VALUE_TYPE')
 if 'value' in v:require(v['value'] is None or isinstance(v['value'],(str,bool,int,float)),'AX_VALUE_SCALAR')
 if 'relatedNodes' in v:
  require(isinstance(v['relatedNodes'],list),'AX_RELATED_NODES')
  for n in v['relatedNodes']:keys(n,['backendDOMNodeId','idref','text'],['backendDOMNodeId']);require(isinstance(n['backendDOMNodeId'],int),'AX_BACKEND_ID')
 if 'sources' in v:
  require(isinstance(v['sources'],list),'AX_VALUE_SOURCES')
  for source in v['sources']:
   keys(source,['type','value','attribute','attributeValue','superseded','nativeSource','nativeSourceValue','invalid','invalidReason'],['type']);require(source['type'] in ['attribute','implicit','style','contents','placeholder','relatedElement'],'AX_SOURCE_TYPE')
   for key in ['value','attributeValue','nativeSourceValue']:
    if key in source:axvalue(source[key],depth+1)
class DOM(HTMLParser):
 def __init__(self):super().__init__(convert_charrefs=True);self.tags=[];self.bad=False
 def handle_starttag(self,tag,attrs):
  self.tags.append(tag);require(len(attrs)==len({k for k,v in attrs}),'DOM_DUPLICATE_ATTRIBUTE');require(tag not in ['iframe','object','embed','form','img','audio','video','link'],'DOM_UNEXPECTED_RESOURCE');require(not any(k.lower().startswith('on') or k in ['srcdoc','src'] for k,v in attrs),'DOM_ACTIVE_ATTRIBUTE')
def inspect(path,root):
 name=path.name;b=path.read_bytes();require(len(b)<=128*1024**2,'RAW_MEMBER_BUDGET')
 if name.endswith('.png'):return {'class':'png','structure':trace.png(b),'decoded':trace.image_decode(b),'status':'BOUNDED_PNG_SCHEMA','boundedSchemaSupported':True,'semanticPrivacyCertified':False}
 if name.endswith('.html'):
  text=b.decode('utf-8');require('<html' in text.lower() and '<body' in text.lower() and '</html>' in text.lower(),'DOM_DOCUMENT_SCHEMA');d=DOM();d.feed(text);d.close();require(d.tags.count('html')==1 and d.tags.count('body')==1,'DOM_DOCUMENT_ROOTS');digest=hashlib.sha256(b).hexdigest();return {'class':'dom','status':'EXACT_APPROVED_INPUT' if digest in trace.HTML_HASHES else 'BOUNDED_PRODUCER_DOM_SCHEMA','tagCount':len(d.tags),'boundedSchemaSupported':True,'semanticPrivacyCertified':False}
 if name.endswith('.ax.json'):
  v=json.loads(b);keys(v,['nodes'],['nodes']);require(isinstance(v['nodes'],list) and 0<len(v['nodes'])<=100000,'AX_NODES');ids=set()
  for node in v['nodes']:
   keys(node,['nodeId','ignored','ignoredReasons','role','chromeRole','name','description','value','properties','parentId','childIds','backendDOMNodeId','frameId'],['nodeId','ignored']);require(isinstance(node['nodeId'],str) and node['nodeId'] not in ids and isinstance(node['ignored'],bool),'AX_NODE_SCHEMA');ids.add(node['nodeId']);bounded(node)
   for k in ['role','chromeRole','name','description','value']:
    if k in node:axvalue(node[k])
   for k in ['properties','ignoredReasons']:
    if k in node:
     require(isinstance(node[k],list),'AX_PROPERTIES')
     for prop in node[k]:keys(prop,['name','value'],['name','value']);require(isinstance(prop['name'],str),'AX_PROPERTY_NAME');axvalue(prop['value'])
   if 'childIds' in node:require(isinstance(node['childIds'],list) and all(isinstance(i,str) for i in node['childIds']),'AX_CHILD_IDS')
  return {'class':'ax','status':'BOUNDED_PRODUCER_AX_SCHEMA','nodes':len(v['nodes']),'boundedSchemaSupported':True,'semanticPrivacyCertified':False}
 if name=='network.har':
  v=json.loads(b);keys(v,['log'],['log']);log=v['log'];keys(log,['version','creator','browser','pages','entries'],['version','creator','entries']);trace.har_schema.log_metadata(log);require(log['version']=='1.2','HAR_VERSION');keys(log['creator'],['name','version'],['name','version']);require(log['creator']['name']=='Playwright' and log['creator']['version']=='1.62.1','HAR_CREATOR');require(isinstance(log['entries'],list) and len(log['entries'])<=10000,'HAR_ENTRIES')
  for e in log['entries']:
   keys(e,['pageref','startedDateTime','time','request','response','cache','timings','serverIPAddress','connection','_frameref','_monotonicTime','_resourceType','_serverPort','_securityDetails','_wasContinued'],['startedDateTime','time','request','response','cache','timings']);trace.har_schema.entry_metadata(e);trace.request_check(e['request']);q=e['request'];r=e['response'];keys(q,['method','url','httpVersion','cookies','headers','queryString','headersSize','bodySize'],['method','url','cookies','headers','queryString']);require(q['queryString']==[],'HAR_QUERY');keys(r,['status','statusText','httpVersion','cookies','headers','content','headersSize','bodySize','redirectURL','_transferSize','_failureText'],['status','cookies','headers','content']);require(not r['cookies'] and r['status']==200 and r.get('redirectURL','')=='','HAR_RESPONSE');keys(r['content'],['size','mimeType','compression','text','encoding'],['size','mimeType','text']);c=r['content'];require(c['mimeType'].split(';')[0]=='text/html','HAR_MIME');payload=base64.b64decode(c['text'],validate=True) if c.get('encoding')=='base64' else c['text'].encode('utf-8');require(c.get('encoding') in [None,'base64'],'HAR_ENCODING');expected=(root/'dist'/q['url'].rsplit('/',1)[1]).read_bytes();require(payload==expected and c['size']==len(payload),'HAR_BODY_NOT_EXACT_APPROVED_INPUT');bounded(e)
   for header in q['headers']+r['headers']:
    keys(header,['name','value'],['name','value']);require(isinstance(header['name'],str) and isinstance(header['value'],str) and len(header['value'])<8192,'HAR_HEADER_SCHEMA');name=header['name'].lower();value=header['value'];allowed={'accept','accept-encoding','accept-language','connection','host','sec-fetch-dest','sec-fetch-mode','sec-fetch-site','sec-fetch-user','upgrade-insecure-requests','user-agent','sec-ch-ua','sec-ch-ua-mobile','sec-ch-ua-platform','cache-control','content-length','content-type','date','keep-alive','x-content-type-options','referrer-policy','content-security-policy','referer'};require(name in allowed,'HAR_HEADER_UNSUPPORTED');require('\r' not in value and '\n' not in value,'HAR_HEADER_NEWLINE')
    if name in ['host','referer']:require(bool(re.fullmatch(r'127\.0\.0\.1:[1-9]\d{0,4}',value)) if name=='host' else bool(trace.ALLOWED_URL.fullmatch(value)),'HAR_HEADER_ORIGIN')
   keys(e['cache'],[]);keys(e['timings'],['blocked','dns','connect','send','wait','receive','ssl']);require(all(isinstance(n,(int,float)) and n>=-1 for n in e['timings'].values()),'HAR_TIMING');require(e.get('serverIPAddress','127.0.0.1')=='127.0.0.1','HAR_REMOTE_ADDRESS')
   require(not any(h['name'].lower() in ['authorization','cookie','set-cookie','proxy-authorization'] for h in q['headers']+r['headers']),'HAR_CREDENTIAL_HEADER')
  return {'class':'har','status':'EXACT_HTML_BODIES_BOUNDED_HAR_SCHEMA','entries':len(log['entries']),'boundedSchemaSupported':True,'semanticPrivacyCertified':False}
 if name=='trace.zip':return trace.audit(path)
 raise ValueError('UNSUPPORTED_RAW_CLASS')
if __name__=='__main__':
 try:print(json.dumps(inspect(pathlib.Path(sys.argv[1]),pathlib.Path(sys.argv[2])),separators=(',',':')))
 except Exception as e:
  code=str(e) if isinstance(e,ValueError) and re.fullmatch('[A-Z_]+',str(e)) else 'MALFORMED_RAW_EVIDENCE'
  print(json.dumps({'status':'DENY_RAW_STRUCTURE_OR_CONTENT','code':code,'publicationApproved':False}));sys.exit(1)
