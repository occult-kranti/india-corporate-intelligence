"""Typed metadata admitted by the pinned local Playwright HAR/trace producer.

Application/body/network policy stays in the callers. These validators do not
supply a new URL, body, cookie, method or publication permission.
"""
import datetime,math,re

def require(ok,code):
 if not ok:raise ValueError(code)
def keys(v,allowed,required=()):
 require(isinstance(v,dict) and set(v)<=set(allowed) and set(required)<=set(v),'HAR_METADATA_FIELDS')
def text(v,limit=8192):
 require(isinstance(v,str) and len(v)<=limit and '\x00' not in v,'HAR_METADATA_STRING')
def number(v,minimum=-1):
 require(type(v) in (int,float) and math.isfinite(v) and v>=minimum,'HAR_METADATA_NUMBER')
def integer(v,minimum=-1,maximum=None):
 require(type(v) is int and v>=minimum and (maximum is None or v<=maximum),'HAR_METADATA_INTEGER')
def timestamp(v):
 text(v,40);require(bool(re.fullmatch(r'\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?(?:Z|[+-]\d\d:\d\d)',v)),'HAR_METADATA_TIME')
 try:datetime.datetime.fromisoformat(v.replace('Z','+00:00'))
 except ValueError:raise ValueError('HAR_METADATA_TIME')
def runtime_id(v,prefix):
 text(v,128);require(bool(re.fullmatch(prefix+r'@[a-f0-9]+',v)),'HAR_METADATA_RUNTIME_ID')
def security_details(v):
 fields=['protocol','subjectName','issuer','validFrom','validTo'];keys(v,fields,fields if v else [])
 for k in ['protocol','subjectName','issuer']:
  if k in v:text(v[k])
 for k in ['validFrom','validTo']:
  if k in v:number(v[k],0)
 if v:require(v['validFrom']<=v['validTo'],'HAR_SECURITY_VALIDITY_ORDER')
def log_metadata(log):
 keys(log,['version','creator','browser','pages','entries'],['version','creator','entries']);text(log['version'],20)
 keys(log['creator'],['name','version'],['name','version']);text(log['creator']['name'],100);text(log['creator']['version'],100)
 if 'browser' in log:
  keys(log['browser'],['name','version'],['name','version']);text(log['browser']['name'],100);text(log['browser']['version'],100)
 if 'pages' in log:
  require(isinstance(log['pages'],list) and len(log['pages'])<=10000,'HAR_PAGES_LIST');ids=set()
  for page in log['pages']:
   keys(page,['startedDateTime','id','title','pageTimings'],['startedDateTime','id','title','pageTimings']);timestamp(page['startedDateTime']);runtime_id(page['id'],'page');text(page['title'],65536);require(page['id'] not in ids,'HAR_DUPLICATE_PAGE');ids.add(page['id']);keys(page['pageTimings'],['onContentLoad','onLoad'])
   for n in page['pageTimings'].values():number(n)
 require(isinstance(log['entries'],list),'HAR_ENTRIES_LIST')
def entry_metadata(e):
 # Field membership is checked by each scope-specific caller; this function
 # validates the admitted optional and required metadata without broadening it.
 for k in ['_wasContinued']:
  if k in e:require(type(e[k]) is bool,'HAR_CONTINUED_BOOLEAN')
 if '_securityDetails' in e:security_details(e['_securityDetails'])
 if '_serverPort' in e:integer(e['_serverPort'],1,65535)
 for k in ['time','_monotonicTime']:
  if k in e:number(e[k],-1 if k=='time' else 0)
 if 'startedDateTime' in e:timestamp(e['startedDateTime'])
 for k,prefix in [('pageref','page'),('_frameref','frame')]:
  if k in e:runtime_id(e[k],prefix)
 for k in ['serverIPAddress','connection','_resourceType']:
  if k in e:text(e[k],256)
 if 'timings' in e:
  keys(e['timings'],['blocked','dns','connect','send','wait','receive','ssl'])
  for n in e['timings'].values():number(n)
 if 'cache' in e:keys(e['cache'],[])
 for side in ['request','response']:
  if side not in e:continue
  value=e[side];require(isinstance(value,dict),'HAR_MESSAGE_OBJECT')
  for k in ['httpVersion','statusText','redirectURL','_failureText']:
   if k in value:text(value[k])
  for k in ['headersSize','bodySize','_transferSize']:
   if k in value:integer(value[k])
  if 'status' in value:integer(value['status'],-1,599)
  if 'headers' in value:
   require(isinstance(value['headers'],list),'HAR_HEADERS_LIST')
   for h in value['headers']:keys(h,['name','value'],['name','value']);text(h['name'],128);text(h['value'])
  if 'cookies' in value:require(isinstance(value['cookies'],list),'HAR_COOKIES_LIST')
  if 'queryString' in value:
   require(isinstance(value['queryString'],list),'HAR_QUERY_LIST')
   for pair in value['queryString']:keys(pair,['name','value'],['name','value']);text(pair['name']);text(pair['value'])
  if 'content' in value:
   content=value['content'];require(isinstance(content,dict),'HAR_CONTENT_OBJECT')
   for k in ['size','compression']:
    if k in content:integer(content[k],-1 if k=='size' else 0)
   for k in ['mimeType','encoding','_sha1']:
    if k in content:text(content[k],256)
   if 'text' in content:require(isinstance(content['text'],str),'HAR_CONTENT_TEXT')
