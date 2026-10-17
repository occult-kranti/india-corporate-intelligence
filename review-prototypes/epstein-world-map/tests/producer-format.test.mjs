import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {ROOT} from '../scripts/contract.mjs';
test('measured producer trace shapes are admitted narrowly and malformed extensions denied',()=>{
 const source=`import importlib.util,sys,json,zipfile,tempfile,copy,hashlib,pathlib
sys.dont_write_bytecode=True
root=pathlib.Path(${JSON.stringify(ROOT)});spec=importlib.util.spec_from_file_location('audit_trace',root/'scripts/audit-trace.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
context={'version':8,'type':'context-options','origin':'library','browserName':'chromium','playwrightVersion':'1.62.1','options':{'viewport':{'width':1440,'height':1000},'acceptDownloads':'deny','serviceWorkers':'block'},'platform':'linux','wallTime':1,'monotonicTime':1,'sdkLanguage':'javascript','contextId':'browser-context@abc'}
positive=[('Frame','content',{}),('Frame','waitForSelector',{'selector':'#packet','omitReturnValue':True}),('Route','continue',{'isFallback':False}),('Route','abort',{'errorCode':'blockedbyclient'})]
for name in ['corrupt.json','unsupported.json','changed.json','empty.json','packet.json']:positive.append(('Frame','setInputFiles',{'selector':'#packet','payloads':[{'name':name,'mimeType':'application/json','buffer':'<Buffer>'}]}))
negative=[('Frame','content',{'unknown':True}),('Frame','waitForSelector',{'omitReturnValue':'true'}),('Frame','waitForSelector',{'omitReturnValue':1}),('Frame','click',{'omitReturnValue':True}),('Route','continue',{'isFallback':True}),('Route','continue',{'isFallback':'false'}),('Route','continue',{'isFallback':False,'url':'https://example.invalid'}),('Route','continue',{}),('Route','abort',{'errorCode':'failed'}),('Route','abort',{'errorCode':7}),('Frame','click',{'errorCode':'blockedbyclient'}),('Frame','content',{'payloads':[]}),('Frame','setInputFiles',{'files':[]}),('Frame','setInputFiles',{'payloads':[{'name':'unknown.json','mimeType':'application/json','buffer':'<Buffer>'}]}),('Frame','setInputFiles',{'payloads':[{'name':'packet.json','mimeType':'text/plain','buffer':'<Buffer>'}]}),('Frame','setInputFiles',{'payloads':[{'name':'packet.json','mimeType':'application/json','buffer':'arbitrary'}]}),('Frame','unsupportedMethod',{})]
counts={'positive':0,'negative':0}
def run(events,expected,network=None,resource=None):
 with tempfile.TemporaryDirectory() as d:
  f=pathlib.Path(d)/'trace.zip'
  with zipfile.ZipFile(f,'w',zipfile.ZIP_DEFLATED) as z:
   z.writestr('trace.trace',''.join(json.dumps(e)+'\\n' for e in [context]+events))
   if network is not None:z.writestr('trace.network',json.dumps({'type':'resource-snapshot','snapshot':network})+'\\n')
   if resource:z.writestr('resources/'+resource[0],resource[1])
  try:m.audit(f);ok=True
  except ValueError:ok=False
  assert ok==expected,(events,network,expected)
  counts['positive' if expected else 'negative']+=1
for expected,cases in [(True,positive),(False,negative)]:
 for cls,method,params in cases:run([{'type':'before','callId':'call@1','startTime':1,'class':cls,'method':method,'params':params},{'type':'after','callId':'call@1','endTime':2}],expected)
snap={'snapshotName':'after@call@1','pageId':'page@abc','frameId':'frame@abc','frameUrl':'about:blank','html':['HTML',{},['BODY']],'viewport':{'width':1440,'height':1000},'timestamp':1,'resourceOverrides':[],'isMainFrame':True}
run([{'type':'frame-snapshot','snapshot':dict(snap,doctype='html')}],True)
for bad in [True,{},'svg']:run([{'type':'frame-snapshot','snapshot':dict(snap,doctype=bad)}],False)
html=(root/'dist/index.html').read_bytes();name=hashlib.sha1(html).hexdigest()+'.html';url='http://127.0.0.1:1234/review-prototypes/epstein-world-map/index.html'
entry={'startedDateTime':'2026-10-17T00:00:00.000Z','time':1,'request':{'url':url,'method':'GET','cookies':[],'headers':[]},'response':{'status':200,'cookies':[],'headers':[],'content':{'size':len(html),'mimeType':'text/html','_sha1':name}},'cache':{},'timings':{},'_wasContinued':True}
run([],True,entry,(name,html))
for bad in ['true',1,None]:
 x=copy.deepcopy(entry);x['_wasContinued']=bad;run([],False,x,(name,html))
for bad in [-1,1,'1',True]:
 x=copy.deepcopy(entry);x['response']['content']['size']=bad;run([],False,x,(name,html))
print(json.dumps(counts))
`;
 const r=spawnSync('python3',['-c',source],{encoding:'utf8',timeout:60000});assert.equal(r.status,0,r.stderr);assert.deepEqual(JSON.parse(r.stdout),{positive:11,negative:27});
});
