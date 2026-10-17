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
test('AX diagnosis supports only identical repeated rows and rejects ill-typed node identities',()=>{const code=`import pathlib,json,sys,tempfile,importlib.util
sys.dont_write_bytecode=True
r=pathlib.Path(${JSON.stringify(ROOT)});s=importlib.util.spec_from_file_location('raw',r/'scripts/audit-raw.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
valid={'nodeId':'1','ignored':False}
cases=[([valid],None),([valid,{'nodeId':'2','ignored':True}],None),([valid,valid],None),([{'nodeId':1,'ignored':False}],'AX_NODE_ID_TYPE'),([{'nodeId':None,'ignored':False}],'AX_NODE_ID_TYPE'),([{'nodeId':[],'ignored':False}],'AX_NODE_ID_TYPE'),([{'nodeId':'1','ignored':'false'}],'AX_IGNORED_TYPE'),([{'nodeId':'1','ignored':0}],'AX_IGNORED_TYPE'),([{'nodeId':'1','ignored':None}],'AX_IGNORED_TYPE')]
with tempfile.TemporaryDirectory() as d:
 p=pathlib.Path(d)/'01-initial.ax.json'
 for nodes,expected in cases:
  p.write_text(json.dumps({'nodes':nodes}));actual=None
  try:m.inspect(p,r)
  except ValueError as e:actual=str(e)
  assert actual==expected,(expected,actual)
print(json.dumps({'cases':len(cases),'acceptances':3,'rejections':6,'rawBodiesLogged':False}))
`;const r=spawnSync('python3',['-c',code],{encoding:'utf8'});assert.equal(r.status,0,r.stdout+'\n'+r.stderr);assert.deepEqual(JSON.parse(r.stdout),{cases:9,acceptances:3,rejections:6,rawBodiesLogged:false});});

import {readFile} from 'node:fs/promises';
import {readInputs,records,at,typed,ownerPaths,ownerKind} from '../scripts/contract.mjs';
import {assertContext} from '../scripts/assert-context.mjs';
import {axDuplicateDiagnostic} from '../scripts/failure-diagnostic.mjs';
test('owner total counts the exact independently audited observations, retaining the 37/152/50 oracles',async()=>{
 const {raw,fixture}=await readInputs(),source=await readFile(resolve(ROOT,'scripts/native-review.mjs'),'utf8');
 const fn=source.match(/^async function audit\(r,m=null\)\{.*\}$/m)?.[0];assert(fn);
 assert(source.includes('const observed=await audit(r,m);owners+=observed.owners.length;'));
 assert(source.includes('assert.equal(count,152);assert.equal(owners,37);assert.equal(capacities,50);'));
 assert(!source.includes('owners+=m.contextOwners.length'));
 let actual,focused=0;const page={locator:s=>s==='#evidence-content'?{evaluate:async()=>actual}:{focus:async()=>{focused++;}},evaluate:async()=>({modal:true,backgroundFocus:false})};
 const audit=new Function('page','assertContext','inspectContext','raw','assert','return ('+fn+')')(page,assertContext,()=>{},raw,assert);
 const rs=records(raw);let observedTotal=0,legacyTotal=0,capacityTotal=0;
 for(const m of fixture.mappings){const r=rs.find(r=>r.recordPointer===m.recordPointer);assert(r);const ref=at(raw,m.referencePointer);
  actual={claim:typed(r.record,r.recordPointer),claimOpen:true,claimLabel:'Complete selected-claim context (all supplied record fields)',claimExplanation:'record dates are not assigned to an individual reference',activeId:'drawer-title',dialogLabel:'drawer-title',inert:true,rawAndContextMerged:false,reference:typed(ref,m.referencePointer),sourceDateBlock:false,owners:ownerPaths(raw,m.referencePointer,m.recordPointer).map(path=>{const kind=ownerKind(at(raw,path));return {path,kind,label:{'date-owner':'Reference-owning date','condition-owner':'Reference-owning condition','observation-owner':'Enclosing observation and as-of context','enclosing-owner':'Enclosing source-scoped context'}[kind],fields:typed(at(raw,path),path)};}),links:[]};
  if(r.record.qualifying_observations!==undefined)actual.qualifying=typed(r.record.qualifying_observations,r.recordPointer+'/qualifying_observations');
  if(r.collection==='procedural_relations')actual.endpoints=['source','target'].map(side=>({side:side==='source'?'Source':'Target',identity:r.component==='baseline'?r.recordPointer+'/'+side+'_endpoint':r.component+':'+r.record[side+'_node_id'],label:r.component==='baseline'?r.record[side+'_endpoint']:r.packet.nodes.find(n=>n.id===r.record[side+'_node_id']).label,capacity:r.component==='baseline'?'no separate endpoint-capacity field is supplied':r.record[side+'_legal_capacity']}));
  const observed=await audit(r,m);assert.equal(observed,actual);observedTotal+=observed.owners.length;legacyTotal+=m.contextOwners.length;if(r.component!=='baseline'&&r.collection==='procedural_relations')capacityTotal++;
  if(actual.owners.length){const saved=actual.owners;actual.owners=[];await assert.rejects(audit(r,m));actual.owners=saved;}
 }
 assert.deepEqual({observedTotal,legacyTotal,capacityTotal,focused,sources:fixture.mappings.length},{observedTotal:37,legacyTotal:33,capacityTotal:50,focused:152,sources:152});
 // The DOM/native observation producer is not simulated by this counter-unit test.
});
test('AX duplicate counts never grant acceptance or disclose row values and reject malformed counters',()=>{
 const good={nodes:4,uniqueNodes:2,duplicateRows:2,identicalRows:1,conflictingRows:1};
 assert.deepEqual(axDuplicateDiagnostic(good),{schema:'world-ax-duplicate-counts-v1',...good,nativeAcceptance:false,artifactApproval:false});
 for(const v of [null,[],{}, {...good,nodeId:'SECRET'}, {...good,nodes:'SECRET'}, {...good,nodes:100001}, {...good,nodes:NaN}, {...good,nodes:Infinity}, {...good,nodes:4.5}, {...good,nodes:true}, {...good,nodes:0}, {...good,uniqueNodes:0}, {...good,duplicateRows:0}, {...good,identicalRows:-1}, {...good,conflictingRows:2},new Proxy({},{ownKeys(){throw Error('SECRET')}})])assert.equal(axDuplicateDiagnostic(v),null);
});
test('only exact complete AX repeats are supported, with raw rows and all conflict/budget refusals retained',()=>{
 const code=`import pathlib,json,sys,tempfile,importlib.util,copy,hashlib
sys.dont_write_bytecode=True
r=pathlib.Path(${JSON.stringify(ROOT)});s=importlib.util.spec_from_file_location('raw',r/'scripts/audit-raw.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
base={'nodeId':'opaque-fixture-id','ignored':False,'name':{'type':'computedString','value':'synthetic-only-secret'},'role':{'type':'role','value':'generic'},'value':{'type':'integer','value':1},'childIds':['child-a','child-b'],'properties':[{'name':'focusable','value':{'type':'boolean','value':True}}]}
variants=[]
for key,value in [('name',{'type':'computedString','value':'different-secret'}),('value',{'type':'integer','value':2}),('role',{'type':'role','value':'button'}),('childIds',['other']),('childIds',['child-b','child-a']),('ignored',True),('properties',[{'name':'focusable','value':{'type':'boolean','value':False}}]),('value',{'type':'integer','value':True}),('value',{'type':'integer','value':1.0})]:
 n=copy.deepcopy(base);n[key]=value;variants.append(n)
with tempfile.TemporaryDirectory() as d:
 p=pathlib.Path(d)/'01-initial.ax.json'
 def run(nodes):
  p.write_text(json.dumps({'nodes':nodes}));before=hashlib.sha256(p.read_bytes()).hexdigest();code=None;counts=None
  try:
   result=m.inspect(p,r);counts={'nodes':result['nodes'],'uniqueNodes':result['uniqueNodes'],'duplicateRows':result['identicalDuplicateRows'],'identicalRows':result['identicalDuplicateRows'],'conflictingRows':0}
  except ValueError as e:code=str(e);counts=getattr(e,'ax_duplicate_counts',None)
  assert hashlib.sha256(p.read_bytes()).hexdigest()==before
  return code,counts
 for variant in [copy.deepcopy(base),dict(reversed(list(base.items())))]:
  code,counts=run([base,variant]);assert code is None;assert counts=={'nodes':2,'uniqueNodes':1,'duplicateRows':1,'identicalRows':1,'conflictingRows':0}
 for variant in variants:
  code,counts=run([base,variant]);assert code=='AX_NODE_DUPLICATE_ID';assert counts['conflictingRows']==1 and counts['identicalRows']==0
 code,counts=run([base,copy.deepcopy(base),variants[0],{'nodeId':'second','ignored':False}]);assert code=='AX_NODE_DUPLICATE_ID';assert counts=={'nodes':4,'uniqueNodes':2,'duplicateRows':2,'identicalRows':1,'conflictingRows':1}
 # Later rows must still pass every original schema/budget check before counts escape.
 bad=[{**base,'unexpected':'SECRET'},{**base,'ignored':'false'},{**base,'name':{'type':'unsupported','value':'SECRET'}},{**base,'properties':[{'name':1,'value':{'type':'string','value':'SECRET'}}]},{**base,'childIds':[1]},{**base,'childIds':['x']*100001}]
 for row in bad:
  code,counts=run([base,copy.deepcopy(base),row]);assert code!='AX_NODE_DUPLICATE_ID' and counts is None
 code,counts=run([{'nodeId':'x','ignored':False}]*100001);assert code=='AX_NODES' and counts is None
 # Object cycles cannot be JSON input; the retained recursion bound fails closed in memory.
 cycle={};cycle['cycle']=cycle
 try:m.bounded(cycle);raise AssertionError('Cycle accepted')
 except ValueError as e:assert str(e)=='JSON_DEPTH'
print(json.dumps({'equalDuplicateProbes':2,'conflictingDuplicateProbes':len(variants),'mixedDuplicateProbes':1,'laterInvalidRowProbes':len(bad),'nodeCapProbes':1,'cycleBoundProbes':1,'onlyIdenticalDuplicatesAccepted':True,'rawRowsUnchanged':True,'rawBodiesLogged':False}))
`;
 const r=spawnSync('python3',['-c',code],{encoding:'utf8'});assert.equal(r.status,0,r.stdout+'\n'+r.stderr);assert(!r.stdout.includes('SECRET'));const result=JSON.parse(r.stdout);assert.equal(result.conflictingDuplicateProbes,9);assert.equal(result.onlyIdenticalDuplicatesAccepted,true);assert.equal(result.rawRowsUnchanged,true);
});

import {evidenceSizeDiagnostic} from '../scripts/failure-diagnostic.mjs';
const row=(path,bytes)=>({path,bytes,sha256:'a'.repeat(64),gitBlob:'b'.repeat(40)});
test('size diagnostic identifies only fixed member classes and exact bytes',()=>{
 const out=evidenceSizeDiagnostic([row('trace.zip',134217729),row('report.json',12),row('failure.ax.json',42)]);
 assert.deepEqual(out,{schema:'world-evidence-size-diagnostic-v1',memberCount:3,totalBytes:134217783,memberLimitBytes:134217728,totalLimitBytes:536870912,members:[{memberIndex:0,memberClass:'report',bytes:12},{memberIndex:3,memberClass:'trace',bytes:134217729},{memberIndex:37,memberClass:'accessibility',bytes:42}],nativeAcceptance:false,artifactApproval:false});
 assert(!JSON.stringify(out).includes('trace.zip'));assert(!JSON.stringify(out).includes('a'.repeat(64)));
});
test('size diagnostic covers the complete closed 38-member inventory without a grant',()=>{
 const names=['report.json','summary.md','producer-receipt.json','trace.zip','network.har',...['01-initial','02-source-narrow-320','02-source-narrow-390','03-forced-colors-capacities','04-anchor-scotus','05-anchor-nydfs','06-anchor-usvi','07-critical-petition','08-schematic-relations','09-desktop-1024','failure'].flatMap(p=>['png','html','ax.json'].map(s=>p+'.'+s))];
 const out=evidenceSizeDiagnostic(names.map((p,i)=>row(p,i)));assert.equal(out.memberCount,38);assert.equal(out.totalBytes,703);assert.deepEqual(out.members.map(r=>r.memberIndex),Array.from({length:38},(_,i)=>i));assert.equal(out.artifactApproval,false);
});
test('unknown, duplicate or excessive members produce no diagnostic',()=>{
 for(const rows of [[row('/private/SECRET',1)],[row('trace.zip',1),row('trace.zip',2)],Array.from({length:39},()=>row('trace.zip',1)),[],null,{}])assert.equal(evidenceSizeDiagnostic(rows),null);
});
test('invalid numeric sizes never reach public diagnostics',()=>{
 for(const size of [-1,.5,NaN,Infinity,-Infinity,'SECRET',true,null,Number.MAX_SAFE_INTEGER+1])assert.equal(evidenceSizeDiagnostic([row('trace.zip',size)]),null);
 assert.equal(evidenceSizeDiagnostic([row('trace.zip',Number.MAX_SAFE_INTEGER),row('report.json',1)]),null);
 assert.equal(evidenceSizeDiagnostic([row('trace.zip',0)]).totalBytes,0);
});
test('malformed inventory rows and unexpected data never escape',()=>{
 for(const bad of [null,[],{}, {...row('trace.zip',1),body:'SECRET'}, {...row('trace.zip',1),sha256:'SECRET'}, {...row('trace.zip',1),gitBlob:'SECRET'}, {path:'trace.zip',bytes:1,sha256:'a'.repeat(64)}])assert.equal(evidenceSizeDiagnostic([bad]),null);
 const throwing={...row('trace.zip',1),get bytes(){throw Error('SECRET')}};assert.equal(evidenceSizeDiagnostic([throwing]),null);
});

import {focusBoundaryDiagnostic} from '../scripts/failure-diagnostic.mjs';
const focusFlags=()=>({hasRect:true,visible:true,disabled:false,hidden:false,inert:false,closedDetails:false});
const focusValue=()=>({phase:'forward-wrap',controlCount:3,expectedOrdinal:0,activeOrdinal:2,activeContained:true,first:focusFlags(),last:focusFlags(),active:focusFlags()});
test('focus diagnostic emits only fixed phase, ordinals and boolean flags',()=>{const v=focusValue(),out=focusBoundaryDiagnostic(v);assert.deepEqual(out,{schema:'world-focus-boundary-diagnostic-v1',...v,nativeAcceptance:false,artifactApproval:false});assert.deepEqual(Object.keys(out),['schema','phase','controlCount','expectedOrdinal','activeOrdinal','activeContained','first','last','active','nativeAcceptance','artifactApproval']);});
test('reverse and off-list focus metadata remain observational without admission',()=>{const v=focusValue();v.phase='reverse-wrap';v.expectedOrdinal=2;v.activeOrdinal=-1;v.activeContained=false;v.active.hasRect=false;v.last.inert=true;assert.deepEqual(focusBoundaryDiagnostic(v),{schema:'world-focus-boundary-diagnostic-v1',...v,nativeAcceptance:false,artifactApproval:false});});
test('focus diagnostic refuses unknown phase, field, raw error and nonobject input',()=>{for(const v of [null,[],{},'SECRET',{...focusValue(),phase:'SECRET'},{...focusValue(),error:'SECRET'},{...focusValue(),selector:'#SECRET'},{...focusValue(),path:'/private/SECRET'}])assert.equal(focusBoundaryDiagnostic(v),null);});
test('focus count and ordinal boundaries are strict safe integers',()=>{for(const count of [0,-1,10001,.5,NaN,Infinity,'SECRET',true])assert.equal(focusBoundaryDiagnostic({...focusValue(),controlCount:count}),null);for(const active of [-2,3,Number.MAX_SAFE_INTEGER,.5,NaN,'SECRET'])assert.equal(focusBoundaryDiagnostic({...focusValue(),activeOrdinal:active}),null);for(const expected of [1,-1,'0',NaN])assert.equal(focusBoundaryDiagnostic({...focusValue(),expectedOrdinal:expected}),null);assert.equal(focusBoundaryDiagnostic({...focusValue(),activeContained:false}),null);});
test('focus flags require exact boolean schema and never leak arbitrary strings',()=>{for(const name of ['first','last','active'])for(const flags of [null,[],{...focusFlags(),text:'SECRET'},{...focusFlags(),visible:'SECRET'},{...focusFlags(),visible:1},{...focusFlags(),visible:null}])assert.equal(focusBoundaryDiagnostic({...focusValue(),[name]:flags}),null);const v=focusValue();delete v.first.inert;assert.equal(focusBoundaryDiagnostic(v),null);});
test('focus diagnostic bounds are inclusive and getters fail closed',()=>{assert(focusBoundaryDiagnostic({...focusValue(),controlCount:10000,activeOrdinal:9999}));assert(focusBoundaryDiagnostic({...focusValue(),controlCount:1,activeOrdinal:0}));assert.equal(focusBoundaryDiagnostic({...focusValue(),get active(){throw Error('SECRET')}}),null);});
test('actual failure probe logs only a validated observation and swallows probe errors',async()=>{
 const source=await readFile(new URL('../scripts/native-review.mjs',import.meta.url),'utf8'),probe=source.slice(source.indexOf('async function logFocusFailure(phase)'));
 const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor,run=new AsyncFunction('page','focusBoundaryDiagnostic','console',probe+';await logFocusFailure("forward-wrap");');
 const logs=[],v=focusValue();delete v.phase;delete v.expectedOrdinal;
 await run({locator:()=>({evaluate:async()=>v})},focusBoundaryDiagnostic,{log:s=>logs.push(JSON.parse(s))});assert.equal(logs.length,1);assert.equal(logs[0].activeOrdinal,2);
 await run({locator:()=>({evaluate:async()=>({...v,text:'SECRET'})})},focusBoundaryDiagnostic,{log:s=>logs.push(s)});
 await run({locator:()=>({evaluate:async()=>{throw Error('SECRET')}})},focusBoundaryDiagnostic,{log:s=>logs.push(s)});assert.equal(logs.length,1);
});
test('each actual wrapper retains its original assertion and rethrows that same failure',async()=>{
 const source=await readFile(new URL('../scripts/native-review.mjs',import.meta.url),'utf8'),AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
 for(const [which,phase]of [['first','forward-wrap'],['last','reverse-wrap']]){
  const body=`try{assert.equal(await ${which}.evaluate(e=>document.activeElement===e),true);}catch(error){await logFocusFailure('${phase}');throw error;}`;assert(source.includes(body));
  const original=Error('original assertion'),phases=[],run=new AsyncFunction('assert',which,'logFocusFailure',body);
  await assert.rejects(run({equal:()=>{throw original}},{evaluate:async()=>false},async p=>phases.push(p)),e=>e===original);assert.deepEqual(phases,[phase]);
  await run(assert,{evaluate:async()=>true},async()=>{throw Error('must not diagnose a pass')});
 }
});
