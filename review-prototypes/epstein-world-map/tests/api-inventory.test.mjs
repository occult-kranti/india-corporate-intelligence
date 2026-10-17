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
