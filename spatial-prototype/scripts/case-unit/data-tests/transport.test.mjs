import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {dir,load,fixtures,canonicalSource,acceptedCatalog}from'./test-tools.mjs';
const {expandTransport,TRANSPORT_LIMITS}=await load('expand-transport.ts');
const raw=JSON.parse(fs.readFileSync(canonicalSource,'utf8'));const expected=await acceptedCatalog();
const simple=(root,objects=[],strings=[])=>({schemaVersion:'olympus.case-diagram-transport.2',root,objects,strings});
test('normalized transport reconstructs all exact claims, source/context records and every unchanged v1 case',()=>{assert.deepEqual(expandTransport(raw),expected);assert.ok(fs.statSync(canonicalSource).size<=350000);const one=expandTransport(raw),two=expandTransport(raw);one.cases[0].claims[0].statement='mutated';assert.deepEqual(two,expected);});
test('decoder rejects unknown schemas/fields, missing fields, invalid references and mixed refs',()=>{
 for(const value of [null,[],{}, {...raw,unknown:true},{...raw,strings:null},simple({$s:0}),simple({$o:0}),simple({$o:-1}),simple({$o:0.5}),simple({$o:NaN}),simple({$o:'0'}),simple({$o:0,claim:'invented'},[{}]),simple({$s:0},[],[7]),simple({$o:0},[{$o:0}]),simple({$o:0},[{$o:1},{}])])assert.throws(()=>expandTransport(value));
});
test('decoder rejects input/reference cycles, prototype keys, accessors, exotic values and excessive expansion',()=>{
 const root={};root.self=root;assert.throws(()=>expandTransport(simple(root)));
 const cycle=[];cycle.push(cycle);assert.throws(()=>expandTransport(simple(cycle)));
 for(const key of ['__proto__','constructor','prototype']){const object=JSON.parse(`{"${key}":{"polluted":true}}`);assert.throws(()=>expandTransport(simple(object)));}
 assert.equal({}.polluted,undefined);
 const accessor={};Object.defineProperty(accessor,'x',{enumerable:true,get(){throw Error('must not execute');}});assert.throws(()=>expandTransport(simple(accessor)),/Unsafe transport/);
 for(const value of [new Date(),NaN,Infinity,undefined,()=>0])assert.throws(()=>expandTransport(simple(value)));
 const deep=[];let node=deep;for(let i=0;i<100;i++){const next=[];node.push(next);node=next;}assert.throws(()=>expandTransport(simple(deep)),/budget/);
 const objects=['x'];for(let i=1;i<30;i++)objects.push([{$o:i-1},{$o:i-1}]);assert.throws(()=>expandTransport(simple({$o:29},objects)),/budget/);
 assert.throws(()=>expandTransport(simple(null,Array(TRANSPORT_LIMITS.objects+1).fill(null))),/budget/);
 const sparse=[];sparse.length=1;assert.throws(()=>expandTransport(simple(sparse)));
 const code=fs.readFileSync(path.join(dir,'expand-transport.ts'),'utf8');assert.doesNotMatch(code,/eval\(|new Function|fetch\(|XMLHttpRequest/);
});

test('decoded records are de-aliased within and across cases; immutable baseline and UI state stay separate',async()=>{
 const decoded=expandTransport(raw),seen=new WeakSet();
 const visit=value=>{if(value&&typeof value==='object'){assert.ok(!seen.has(value),'Shared mutable decoded container');seen.add(value);for(const child of Object.values(value))visit(child);}};
 visit(decoded);
 const first=decoded.cases[14].claims[0],untouched=JSON.parse(JSON.stringify(first.v2.readerClaimRecord));assert.notEqual(first.dates,first.v2.readerClaimRecord.dates);first.dates.asOf='changed';first.qualifications.push('invented');assert.deepEqual(first.v2.readerClaimRecord,untouched);
 const a=await load('adapter.ts'),n=await load('navigation.ts'),catalog=a.getCaseCatalog(),before=a.getCaseCatalog();catalog.cases[0].claims[0].statement='changed';catalog.cases[0].sources[0].dateFields.forged='changed';assert.deepEqual(a.getCaseCatalog(),before);assert.deepEqual(catalog.cases.slice(1),before.cases.slice(1));assert.throws(()=>a.assertCaseCatalog(catalog));
 const file=a.getCase('profile:usa-alphabet-founders'),saved=JSON.parse(JSON.stringify(file));n.navigateCase(file,n.initialNavigation(file),{type:'select-node',id:file.nodes[0].id});assert.deepEqual(file,saved);
 const code=fs.readFileSync(path.join(dir,'adapter.ts'),'utf8');assert.match(code,/const trusted=freezeReviewedData\(expandTransport\(reviewedTransport\)/);assert.match(code,/Object.freeze\(value\)/);
});
