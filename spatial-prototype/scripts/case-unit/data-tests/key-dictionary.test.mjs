import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { sha256 } from '../../../src/case-data/transport-key-dictionary/sha256.mjs';
import { decodeKeyDictionary,decodeReviewedTransport,KEY_DICTIONARY_LIMITS as limits } from '../../../src/case-data/transport-key-dictionary/decoder.mjs';
import { encodeNormalizedJson } from './key-dictionary-encoder.mjs';
import { ORIGINAL_RAW_SHA256,NORMALIZED_STRINGIFY_SHA256,NORMALIZED_CANONICAL_SHA256 } from '../../../src/case-data/transport-key-dictionary/pins.mjs';
import { dir,root,host,readSource,canonical,hash,loadRuntime } from './key-dictionary-tools.mjs';
import {acceptedCatalog} from '../test-tools.mjs';
const raw=readSource(),original=JSON.parse(raw),encoded=JSON.parse(fs.readFileSync(path.join(dir,'transport.kd.json'),'utf8'));
const clone=x=>JSON.parse(JSON.stringify(x));
const originalAdapter=await loadRuntime('adapter.ts'),candidateAdapter=await loadRuntime('adapter.ts',true);
const {expandTransport}=await loadRuntime('expand-transport.ts');
const catalog=originalAdapter.getCaseCatalog(),awaitedCatalog=await acceptedCatalog();
const wrap=(body,keys=['x'])=>['olympus.key-dictionary.1',keys,body];

test('approved source pin, deterministic encoding, exact stringify bytes and canonical hash',()=>{
  assert.equal(Buffer.byteLength(raw),334950);assert.equal(hash(raw),ORIGINAL_RAW_SHA256);
  assert.equal(JSON.stringify(encodeNormalizedJson(raw)),JSON.stringify(encoded));
  const decoded=decodeReviewedTransport(encoded);
  assert.deepEqual(decoded,original);
  assert.equal(JSON.stringify(decoded),JSON.stringify(original));
  assert.equal(hash(JSON.stringify(decoded)),NORMALIZED_STRINGIFY_SHA256);
  assert.equal(hash(canonical(decoded)),NORMALIZED_CANONICAL_SHA256);
  assert.equal(hash(JSON.stringify(decoded)+'\n'),hash(JSON.stringify(original)+'\n'));
  assert.equal(Object.getPrototypeOf(decoded),Object.prototype);
});

test('synchronous SHA-256 matches independent Node crypto on vectors, Unicode and accepted payload',()=>{
  for(const value of ['', 'abc', 'a'.repeat(1000000), '🧭 æ\u2028\ud800', JSON.stringify(original), canonical(original)])assert.equal(sha256(value),hash(value));
});

test('unchanged expansion and unchanged adapter preserve all 19 complete case closures and exact counts',()=>{
  const decoded=decodeReviewedTransport(encoded),expanded=expandTransport(decoded);
  const frozen=awaitedCatalog;
  assert.deepEqual(expanded,frozen);assert.deepEqual(expanded,catalog);
  assert.deepEqual(originalAdapter.adaptReviewedInput(expanded),catalog);
  assert.deepEqual(candidateAdapter.getCaseCatalog(),catalog);
  const counts={cases:expanded.cases.length,claims:expanded.cases.flatMap(f=>f.claims).length,nodes:expanded.cases.flatMap(f=>f.nodes).length,roles:expanded.cases.flatMap(f=>f.edges).length,readerFacts:expanded.cases.flatMap(f=>f.readerFactIds).length};
  assert.deepEqual(counts,{cases:19,claims:72,nodes:91,roles:73,readerFacts:13});
  for(let i=0;i<19;i++){
    const file=expanded.cases[i];originalAdapter.assertCaseFile(file);
    assert.equal(JSON.stringify(file),JSON.stringify(catalog.cases[i]));
    assert.deepEqual(candidateAdapter.getSceneCompatibility(file),originalAdapter.getSceneCompatibility(file));
    for(const field of ['sources','claims','nodes','edges','readerFactIds','sharedBlocks'])assert.deepEqual(file[field],catalog.cases[i][field]);
    for(const entity of [file,...file.nodes,...file.edges]){
      assert.equal(entity.canonicalEntityId,null);assert.deepEqual(entity.countryAssociations,[]);
      for(const key of ['publicationEligible','publicGraphEligible','pathEligible','aggregateEligible','researchExportEligible'])assert.equal(entity[key],false);
    }
  }
});

test('reject unknown envelopes, tags, raw objects, missing/duplicate/unknown object keys and noncanonical dictionary',()=>{
  const invalid=[null,{},[],[...encoded,0],['wrong',...encoded.slice(1)],wrap([]),wrap([2]),wrap([0,0]),wrap([0,0,null,0,true]),wrap([0,1,null]),wrap([0,-1,null]),wrap([0,.5,null]),wrap([0,-0,null]),wrap([0,'0',null]),wrap([0,0,{}]),wrap([0,0,null],['x','x']),wrap([0,0,null],['x','unused']),wrap([0,0,null],['']),wrap([0,0,null],[7]),wrap([0,0,null],['constructor']),wrap([0,0,null],['prototype']),wrap([0,0,null],['__proto__']),wrap([0,0,null,1,null],['z','a']),wrap([0,0,null,1,null],['2','1'])];
  for(const x of invalid)assert.throws(()=>decodeKeyDictionary(x));
  assert.equal({}.polluted,undefined);
});

test('reject array holes, accessors, hidden/symbol/custom keys, exotic prototypes and cycles without getter execution',()=>{
  let touched=0;
  const fixtures=[];
  const sparse=wrap([0,0,null]);delete sparse[2][2];fixtures.push(sparse);
  const getter=wrap([0,0,null]);Object.defineProperty(getter[2],'2',{enumerable:true,get(){touched++;return null;}});fixtures.push(getter);
  const hidden=wrap([0,0,null]);Object.defineProperty(hidden[2],'2',{enumerable:false,value:null});fixtures.push(hidden);
  const extra=wrap([0,0,null]);extra[2].extra=0;fixtures.push(extra);
  const symbol=wrap([0,0,null]);symbol[2][Symbol('extra')]=0;fixtures.push(symbol);
  const proto=wrap([0,0,null]);Object.setPrototypeOf(proto[2],null);fixtures.push(proto);
  const cycle=wrap([0,0,null]);cycle[2][2]=cycle[2];fixtures.push(cycle);
  const dictionaryGetter=wrap([0,0,null]);Object.defineProperty(dictionaryGetter[1],'0',{enumerable:true,get(){touched++;return 'x';}});fixtures.push(dictionaryGetter);
  for(const bad of [NaN,Infinity,-Infinity,-0,undefined,()=>0,1n,new Date(),new String('x')])fixtures.push(wrap([0,0,bad]));
  for(const value of fixtures)assert.throws(()=>decodeKeyDictionary(value));
  assert.equal(touched,0);
});

test('all explicit budgets and reference-expansion bombs fail closed',()=>{
  const cases=[];
  cases.push(wrap([0,0,'x'.repeat(limits.stringUnits+1)]));
  cases.push(wrap([0,0,null],['x'.repeat(limits.keyUnits+1)]));
  cases.push(wrap([0,0,null],Array.from({length:limits.dictionaryKeys+1},(_,i)=>'x'+i)));
  cases.push(wrap([0,0,[1,...Array(limits.arraySlots).fill(null)]]));
  let deep=null;for(let i=0;i<limits.depth+1;i++)deep=[1,deep];cases.push(wrap([0,0,deep]));
  // 20,000 value visits is reached before any slot/output/depth ceiling.
  cases.push(wrap([0,0,[1,...Array.from({length:101},()=>[1,...Array(200).fill(null)])]]));
  cases.push(wrap([0,0,[1,...Array(101).fill('x'.repeat(4096))]]));
  // Snapshot 2,048 slots at each level before walking the other children.
  // This reaches 50,000 aggregate slots with fewer than 30 value visits.
  let broad=null;for(let i=0;i<25;i++)broad=[1,broad,...Array(2046).fill(null)];cases.push(wrap([0,0,broad]));
  for(const value of cases)assert.throws(()=>decodeKeyDictionary(value));
  const objects=['x'];for(let i=1;i<30;i++)objects.push([{$o:i-1},{$o:i-1}]);
  const bomb={schemaVersion:'olympus.case-diagram-transport.2',strings:[],objects,root:{$o:29}};
  const bombEncoded=encodeNormalizedJson(JSON.stringify(bomb));
  assert.throws(()=>expandTransport(decodeKeyDictionary(bombEncoded)),/budget/);
  assert.throws(()=>decodeReviewedTransport(bombEncoded),/digest/);
});

test('validly encoded semantic mutations fail the runtime digest before existing validation',()=>{
  const changes=[x=>x.strings[0]+=' altered',x=>x.schemaVersion='unknown',x=>x.root.extra=true,x=>x.objects.pop(),x=>x.strings.reverse()];
  for(const change of changes){const altered=clone(original);change(altered);const candidate=encodeNormalizedJson(JSON.stringify(altered));assert.throws(()=>decodeReviewedTransport(candidate),/digest/);}
  const alteredCatalog=clone(catalog);alteredCatalog.cases[0].claims[0].statement+=' altered';assert.throws(()=>originalAdapter.adaptReviewedInput(alteredCatalog));
  for(const root of [{$s:0,extra:true},{$o:0},{$s:-1},{$o:0.5}]){
    const bad={schemaVersion:'olympus.case-diagram-transport.2',strings:[],objects:[],root};
    assert.throws(()=>expandTransport(decodeKeyDictionary(encodeNormalizedJson(JSON.stringify(bad)))));
  }
});

test('re-encoding 64 distributed original string changes cannot acquire the approved runtime pin',()=>{
  const sample=Array.from({length:64},(_,i)=>Math.floor(i*(original.strings.length-1)/63));
  for(const index of sample){const altered=clone(original);altered.strings[index]+='!';assert.throws(()=>decodeReviewedTransport(encodeNormalizedJson(JSON.stringify(altered))),/digest/);}
});

test('independent calls and repeated encoded aliases yield independent reconstructed containers',()=>{
  const one=decodeReviewedTransport(encoded),two=decodeReviewedTransport(encoded),seen=new WeakSet();
  const walk=x=>{if(x&&typeof x==='object'){assert.ok(!seen.has(x));seen.add(x);Object.values(x).forEach(walk);}};walk(one);
  one.strings[0]='changed';assert.deepEqual(two,original);
  const shared=[0,0,null],out=decodeKeyDictionary(wrap([1,shared,shared]));assert.notEqual(out[0],out[1]);
  assert.notEqual(originalAdapter.getCaseCatalog(),candidateAdapter.getCaseCatalog());
});

test('decoder sources have no network, evaluation or new dependency hooks',()=>{
  for(const file of ['decoder.mjs','sha256.mjs'])assert.doesNotMatch(fs.readFileSync(path.join(dir,file),'utf8'),/eval\(|new Function|fetch\(|XMLHttpRequest|node:|https?:/);
});
