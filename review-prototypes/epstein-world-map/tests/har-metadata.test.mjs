import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {ROOT} from '../scripts/contract.mjs';
test('optional HAR metadata uses typed schemas and rejects unknown or malformed values',()=>{
 const source=`import importlib.util,copy,sys
sys.dont_write_bytecode=True
spec=importlib.util.spec_from_file_location('har_schema',${JSON.stringify(resolve(ROOT,'scripts/har-schema.py'))});m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
log={'version':'1.2','creator':{'name':'Playwright','version':'1.62.1'},'browser':{'name':'chromium','version':'155.0.8059.39'},'pages':[{'startedDateTime':'2026-10-17T00:00:00.000Z','id':'page@abc','title':'Fixture','pageTimings':{'onContentLoad':1,'onLoad':2}}],'entries':[]}
m.log_metadata(log)
entry={'startedDateTime':'2026-10-17T00:00:00.000Z','time':1,'_wasContinued':True,'_securityDetails':{},'_serverPort':1234,'timings':{'send':0,'wait':1,'receive':0}}
m.entry_metadata(entry)
failures=0
def deny(fn,obj):
 global failures
 try:fn(obj)
 except ValueError:failures+=1;return
 raise AssertionError('Malformed metadata accepted')
for field,bad in [('pages',{}),('pages',[{'unknown':'bad'}]),('browser',{}),('browser',{'name':7,'version':'1'}),('browser',{'name':'chromium','version':[]})]:
 x=copy.deepcopy(log);x[field]=bad;deny(m.log_metadata,x)
for field,bad in [('_securityDetails',{'unknown':'bad'}),('_securityDetails',[]),('_wasContinued','true'),('_wasContinued',1),('_serverPort',True),('time','1'),('startedDateTime','2026-02-30T00:00:00.000Z'),('timings',{'wait':True})]:
 x=copy.deepcopy(entry);x[field]=bad;deny(m.entry_metadata,x)
assert failures==13
print('13 typed metadata negatives and 2 positive controls passed')
`;
 const r=spawnSync('python3',['-c',source],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);assert(r.stdout.includes('13 typed metadata negatives'));
});
