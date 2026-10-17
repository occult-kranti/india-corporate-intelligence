import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {caseLifecycleObservationInitSource} from './case-lifecycle-observation.mjs';
import {lifecyclePairTransportInitSource} from './lifecycle-pair-transport.mjs';

function fixture() {
 const realm=vm.createContext({});
 vm.runInContext(`globalThis.calls=[];globalThis.reads=0;
 globalThis.value={sequence:11,contexts:[],renderers:[],errors:[],exact:{n:1.234e-100,text:'\\u0000 → "quote"',empty:[],nil:null}};
 globalThis.window={__caseGraphicsProbe:{read(){calls.push('raw');reads++;return value;}}};
 globalThis.document={querySelector(){calls.push('active');return{dataset:{geographicWorkspaceActive:'true'}}},querySelectorAll(){calls.push('workspaceCount');return[1]}};`,realm);
 vm.runInContext(caseLifecycleObservationInitSource(),realm);
 const originalRead=realm.window.__caseGraphicsProbe.read,originalPair=realm.window.__caseGraphicsProbe.readLifecyclePair;
 vm.runInContext(lifecyclePairTransportInitSource(),realm);
 return {realm,probe:realm.window.__caseGraphicsProbe,originalRead,originalPair};
}
test('one native instant, metadata order, every value and original independent pair are conserved',()=>{
 const {realm,probe,originalRead,originalPair}=fixture();
 const actual=JSON.parse(probe.readLifecyclePairJSON());
 assert.equal(realm.reads,1);assert.deepEqual([...realm.calls],['active','workspaceCount','raw']);
 const source=JSON.parse(vm.runInContext('JSON.stringify(value)',realm));
 assert.deepEqual(actual,{active:'true',workspaceCount:1,full:source,compact:source});
 assert.equal(probe.read,originalRead);assert.equal(probe.readLifecyclePair,originalPair);
 assert.equal(probe.readLifecyclePair().full,realm.value);assert.equal(realm.reads,2);
 assert.equal(Object.getOwnPropertyDescriptor(probe,'readLifecyclePairJSON').writable,false);
});
test('later raw reads cannot overwrite an already serialized instant',()=>{
 const {realm,probe}=fixture(),before=probe.readLifecyclePairJSON();
 vm.runInContext('value.sequence=12;value.exact.text="later"',realm);
 const after=probe.readLifecyclePairJSON();assert.equal(JSON.parse(before).full.sequence,11);assert.equal(JSON.parse(after).full.sequence,12);
 assert.equal(JSON.parse(before).full.exact.text,'\u0000 → "quote"');assert.equal(realm.reads,2);
});
test('duplicate installation and missing original observer fail closed',()=>{
 const {realm}=fixture();assert.throws(()=>vm.runInContext(lifecyclePairTransportInitSource(),realm),/original independent raw-pair observer/);
 for(const initial of [{},{readLifecyclePair:1},{readLifecyclePair(){},readLifecyclePairJSON:undefined}])
  assert.throws(()=>vm.runInNewContext(lifecyclePairTransportInitSource(),{window:{__caseGraphicsProbe:initial}}),/original independent raw-pair observer/);
});
test('unsupported full values or metadata cannot be silently omitted or coerced',()=>{
 for(const expression of ['undefined','NaN','Infinity','-Infinity','-0','2n','Symbol("field")','()=>1','new Date()','new Uint8Array([1])','new Map()','new Set()','Object.create(null)','new Array(1)']){
  const {realm,probe}=fixture();vm.runInContext(`value.exact.bad=${expression}`,realm);assert.throws(()=>probe.readLifecyclePairJSON(),/Lifecycle transport/);assert.equal(realm.reads,1);
 }
 const {realm,probe}=fixture();vm.runInContext('document.querySelector=()=>null',realm);assert.throws(()=>probe.readLifecyclePairJSON(),/cannot omit or coerce/);
});
test('full source aliases and hidden failures survive or visibly reject',()=>{
 const {realm,probe}=fixture();vm.runInContext('value.alias=value.exact;value.__proto__extra=17;value.exact.failed=false',realm);
 const parsed=JSON.parse(probe.readLifecyclePairJSON());assert.deepEqual(parsed.full.alias,parsed.full.exact);assert.equal(parsed.full.exact.failed,false);assert.equal(parsed.full.__proto__extra,17);
 for(const setup of ['value.loop=value','Object.defineProperty(value,"hidden",{value:1})','Object.defineProperty(value,"getter",{enumerable:true,get(){throw Error("getter executed")}})','value.toJSON=()=>({})','value[Symbol("hidden")]=1']){
  const f=fixture();vm.runInContext(setup,f.realm);assert.throws(()=>f.probe.readLifecyclePairJSON(),/Lifecycle transport|getter executed/);
 }
});
test('no browser launcher, timer, frame, GL call, projection or raw observer replacement is added',async()=>{
 const source=await readFile(new URL('./lifecycle-pair-transport.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(source,/launch\(|requestAnimationFrame|setTimeout|setInterval|getParameter|readPixels|\.read\s*=|\.readLifecyclePair\s*=/);
 assert.equal((source.match(/probe\.readLifecyclePair\(\)/g)||[]).length,1);
});
