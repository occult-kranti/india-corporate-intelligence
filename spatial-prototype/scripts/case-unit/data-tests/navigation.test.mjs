import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {dir,load}from'./test-tools.mjs';
const a=await load('adapter.ts'),n=await load('navigation.ts'),focus=await load('focus.ts');
test('all 19 cases select node/relation/fact, Back, Reset and bounded reveal retain source order and direction',()=>{
 for(const file of a.getCaseCatalog().cases){const initial=n.initialNavigation(file);assert.deepEqual(initial.visibleEdgeIds,file.edges.slice(0,4).map(e=>e.id));
  for(const node of file.nodes){const state=n.navigateCase(file,initial,{type:'select-node',id:node.id});assert.equal(state.nodeId,node.id);assert.deepEqual(state.visibleEdgeIds,file.edges.filter(e=>e.from===node.id||e.to===node.id).slice(0,4).map(e=>e.id));assert.deepEqual(n.navigateCase(file,state,{type:'back'}),initial);}
  for(const edge of file.edges){let state=n.navigateCase(file,initial,{type:'select-edge',id:edge.id});assert.equal(state.edgeId,edge.id);state=n.navigateCase(file,state,{type:'reveal-more'});assert.ok(state.visibleEdgeIds.includes(edge.id));assert.ok(state.visibleEdgeIds.length<=12);assert.deepEqual(n.navigateCase(file,state,{type:'reset'}),initial);}
  for(const fact of file.readerFactIds){const prior=n.navigateCase(file,initial,{type:'select-node',id:file.nodes[0].id});const state=n.navigateCase(file,prior,{type:'select-fact',id:fact});assert.equal(state.edgeId,null);assert.equal(state.nodeId,null);assert.equal(state.factId,fact);assert.deepEqual(n.navigateCase(file,state,{type:'back'}),prior);}
  for(const type of ['select-node','select-edge','select-fact'])assert.throws(()=>n.navigateCase(file,initial,{type,id:'unknown:global'}));
  let state=initial;for(let i=0;i<80;i++)state=n.navigateCase(file,state,{type:'select-node',id:file.nodes[i%file.nodes.length].id});assert.ok(state.history.length<=32);
  for(const node of file.nodes)for(const e of a.neighbors(file,node.id)){const source=file.edges.find(x=>x.id===e.edgeId);assert.equal(e.direction,source.from===node.id?'outgoing':'incoming');}
 }
});
test('selection focus runs after state commit; evidence focus restores exact connected opener once',()=>{
 const order=[],detail=focus.createDetailFocus(),file=a.getCaseCatalog().cases[18];const target={isConnected:true,focus:()=>order.push('focus')};
 detail.request();order.push('requested');let state=n.navigateCase(file,n.initialNavigation(file),{type:'select-edge',id:file.edges[0].id});order.push(state.edgeId);assert.deepEqual(order,['requested',file.edges[0].id]);assert.equal(detail.commit(target),true);assert.equal(detail.commit(target),false);assert.deepEqual(order,['requested',file.edges[0].id,'focus']);
 const evidence=focus.createEvidenceFocus();evidence.capture(target);assert.equal(evidence.restore(),true);assert.equal(evidence.restore(),false);evidence.capture({isConnected:false,focus(){throw Error('detached opener');}});assert.equal(evidence.restore(),false);
 const code=fs.readFileSync(path.join(dir,'CaseDiagramPanel.tsx'),'utf8');assert.match(code,/useEffect\(\(\)=>\{detailFocus.current.commit\(detailHeading.current\);\},\[state\]\)/);assert.match(code,/if\(dialog.current\?\.open\)return/);assert.match(code,/key=\{verified.id\}/);assert.match(code,/onCancel=\{e=>\{e.preventDefault\(\);closeEvidence\(\);\}\}/);
});
test('case switch clears stale state and reader-only facts never become endpoints',()=>{
 const files=a.getCaseCatalog().cases;const state=n.navigateCase(files[0],n.initialNavigation(files[0]),{type:'select-edge',id:files[0].edges[0].id});assert.deepEqual(n.navigateCase(files[18],state,{type:'back'}),n.initialNavigation(files[18]));for(const f of files)for(const id of f.readerFactIds)assert.ok(!f.edges.some(e=>[e.from,e.to,e.claimId].includes(id)));
});
