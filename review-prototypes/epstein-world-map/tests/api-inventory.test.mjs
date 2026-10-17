import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {ROOT} from '../scripts/contract.mjs';
test('every declared actual harness API/option family is accepted as a source-shaped scenario',()=>{const code=`import pathlib,json,sys,tempfile,zipfile,importlib.util
sys.dont_write_bytecode=True
r=pathlib.Path(${JSON.stringify(ROOT)});inv=json.loads((r/'NATIVE-API-INVENTORY.json').read_bytes());s=importlib.util.spec_from_file_location('audit',r/'scripts/audit-trace.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
context={'version':8,'type':'context-options','origin':'library','browserName':'chromium','channel':'chrome','playwrightVersion':'1.62.1','options':{'viewport':{'width':1440,'height':1000},'acceptDownloads':'deny','serviceWorkers':'block'},'platform':'linux','wallTime':1,'monotonicTime':1,'sdkLanguage':'javascript','contextId':'browser-context@abc'}
results=[]
for row in inv['rows']:
 with tempfile.TemporaryDirectory() as d:
  f=pathlib.Path(d)/'trace.zip';events=[context,{'type':'before','callId':'call@1','startTime':1,'class':row['traceClass'],'method':row['traceMethod'],'params':row['params']},{'type':'after','callId':'call@1','endTime':2}]
  with zipfile.ZipFile(f,'w') as z:z.writestr('trace.trace',''.join(json.dumps(e)+'\\n' for e in events))
  result=m.audit(f);assert result['actionCalls']==1 and result['completedCalls']==1;results.append({'api':row['api'],'accepted':True})
print(json.dumps({'nativeExecuted':False,'scenarioCount':len(results),'results':results}))
`;const r=spawnSync('python3',['-c',code],{encoding:'utf8'});assert.equal(r.status,0,r.stdout+'\n'+r.stderr);const result=JSON.parse(r.stdout);assert.equal(result.scenarioCount,35);console.log(JSON.stringify(result));});


import {failureDiagnostic,DIAGNOSTIC_SOURCE_FILES} from '../scripts/failure-diagnostic.mjs';
const diagnosticIds=Array.from({length:503},(_,i)=>'fixture:'+i),diagnosticGroups=Array.from({length:17},(_,i)=>'group:'+i);
const diagnosticOptions={plannedIds:diagnosticIds,groupNames:diagnosticGroups,root:'/fixture/approved',sourceLineCounts:Object.fromEntries(DIAGNOSTIC_SOURCE_FILES.map(x=>[x,100]))};
function diagnosticReport(){return {status:'failed',completedCases:264,plannedCases:diagnosticIds.map((id,i)=>({id,status:i<264?'passed':'not-run'})),plannedCheckGroups:diagnosticGroups.map((name,i)=>({name,status:i<1?'passed':i===1?'failed':'not-run'})),error:'AssertionError [ERR_ASSERTION]: secret raw text\n    at file:///fixture/approved/scripts/native-review.mjs:57:4'};}
test('diagnostic emits only bounded enum/index/location values, never text or record identifiers',()=>{const r=diagnosticReport(),d=failureDiagnostic(r,diagnosticOptions);assert.deepEqual(d,{schema:'world-native-bounded-diagnostic-v1',status:'failed',passedCases:264,totalCases:503,failedGroupIndices:[1],failedCaseIndices:[],errorKind:'assertion',ownedSourceLocation:{scriptIndex:0,line:57,column:4},nativeAcceptance:false,artifactApproval:false});assert(!JSON.stringify(d).includes('secret'));assert(!JSON.stringify(d).includes('fixture'));r.plannedCases[264].status='failed';assert.deepEqual(failureDiagnostic(r,diagnosticOptions).failedCaseIndices,[264]);});
test('diagnostic rejects altered coverage, status, counts and malformed input rather than printing it',()=>{const mutations=[r=>r.plannedCases.pop(),r=>r.plannedCases[0].id='SECRET',r=>r.plannedCases[0].status='SECRET',r=>r.plannedCheckGroups[1].name='SECRET',r=>r.plannedCheckGroups[1].status='SECRET',r=>r.completedCases=265,r=>r.completedCases=NaN,r=>r.status='SECRET',r=>r.status='automated-native-checks-passed-manual-gates-open'];for(const mutate of mutations){const r=diagnosticReport();mutate(r);assert.equal(failureDiagnostic(r,diagnosticOptions).status,'unavailable');}for(const r of [null,{},[],new Proxy({},{get(){throw Error('SECRET')}})])assert.equal(failureDiagnostic(r,diagnosticOptions).status,'unavailable');assert.equal(failureDiagnostic(diagnosticReport(),{...diagnosticOptions,plannedIds:['SECRET']}).status,'unavailable');});
test('diagnostic cannot emit arbitrary error text, paths, filenames, huge locations or control characters',()=>{for(const error of ['SECRET','Error: SECRET\n    at file:///other/private/native-review.mjs:1:2','Error: SECRET\n    at file:///fixture/approved/scripts/secret.mjs:1:2','Error: SECRET\n    at file:///fixture/approved/scripts/native-review.mjs:101:2','Error: SECRET\n    at file:///fixture/approved/scripts/native-review.mjs:1:999999','Error: SECRET\n    at file:///fixture/approved/scripts/native-review.mjs:0:2','Error: SECRET\n    at file:///fixture/approved/scripts/native-review.mjs:1:2 SECRET','x'.repeat(65537),{secret:'SECRET'}]){const r=diagnosticReport();r.error=error;const d=failureDiagnostic(r,diagnosticOptions);assert.equal(d.ownedSourceLocation,null);assert(!/SECRET|fixture|private|secret/.test(JSON.stringify(d)));assert.equal(d.nativeAcceptance,false);assert.equal(d.artifactApproval,false);}const r=diagnosticReport();r.error='TimeoutError: SECRET';assert.equal(failureDiagnostic(r,diagnosticOptions).errorKind,'timeout');});
test('AX diagnosis splits rejection reasons without accepting duplicate or ill-typed node identities',()=>{const code=`import pathlib,json,sys,tempfile,importlib.util
sys.dont_write_bytecode=True
r=pathlib.Path(${JSON.stringify(ROOT)});s=importlib.util.spec_from_file_location('raw',r/'scripts/audit-raw.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
valid={'nodeId':'1','ignored':False}
cases=[([valid],None),([valid,{'nodeId':'2','ignored':True}],None),([valid,valid],'AX_NODE_DUPLICATE_ID'),([{'nodeId':1,'ignored':False}],'AX_NODE_ID_TYPE'),([{'nodeId':None,'ignored':False}],'AX_NODE_ID_TYPE'),([{'nodeId':[],'ignored':False}],'AX_NODE_ID_TYPE'),([{'nodeId':'1','ignored':'false'}],'AX_IGNORED_TYPE'),([{'nodeId':'1','ignored':0}],'AX_IGNORED_TYPE'),([{'nodeId':'1','ignored':None}],'AX_IGNORED_TYPE')]
with tempfile.TemporaryDirectory() as d:
 p=pathlib.Path(d)/'01-initial.ax.json'
 for nodes,expected in cases:
  p.write_text(json.dumps({'nodes':nodes}));actual=None
  try:m.inspect(p,r)
  except ValueError as e:actual=str(e)
  assert actual==expected,(expected,actual)
print(json.dumps({'cases':len(cases),'acceptances':2,'rejections':7,'rawBodiesLogged':False}))
`;const r=spawnSync('python3',['-c',code],{encoding:'utf8'});assert.equal(r.status,0,r.stdout+'\n'+r.stderr);assert.deepEqual(JSON.parse(r.stdout),{cases:9,acceptances:2,rejections:7,rawBodiesLogged:false});});
