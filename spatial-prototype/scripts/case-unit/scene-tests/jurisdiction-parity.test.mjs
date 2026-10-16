import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
import {dir,load,renderModule,pins,assertSourcePin}from'./test-tools.mjs';
const {getCaseCatalog}=await load('catalog-bridge.ts'),{CaseController}=await load('controller.ts');
const {CASE_WARNING}=await load('contract.ts'),{render}=await renderModule();
const files=getCaseCatalog().cases;
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#x27;');

test('exact research-jurisdiction label and no-inference qualification remain ordinary DOM across all 19 cases, both views and three zoom levels',()=>{
 let fixtures=0;
 for(const f of files)for(const view of ['scene','list'])for(const zoom of [.7,1.5,4]){
  const c=new CaseController(f,true);c.dispatch({type:'set-view',view},0);c.dispatch({type:'camera',patch:{zoom}},1);const html=render(f,c.model,c.state);
  const paragraph=`<p>Research jurisdiction: ${escape(f.researchJurisdiction.label)}. ${escape(f.researchJurisdiction.qualification)}</p>`;
  assert.ok(html.includes(paragraph),`${f.id}/${view}/${zoom}`);assert.equal(html.split(paragraph).length-1,1);
  const index=html.indexOf(paragraph);assert.ok(index>html.indexOf('Case layout · not world locations.'));assert.ok(index<html.indexOf('<ul aria-label="Case qualifications">'));
  assert.ok(f.researchJurisdiction.qualification.length>0);fixtures++;
 }
 assert.equal(fixtures,114);
});

test('all 19 controlled views retain case title, historical/layout warning, jurisdiction, constraints and complete node identity qualifications',()=>{
 for(const f of files)for(const view of ['scene','list']){
  const c=new CaseController(f,true);c.dispatch({type:'set-view',view},0);const html=render(f,c.model,c.state);
  for(const value of [f.label,CASE_WARNING,f.researchJurisdiction.label,f.researchJurisdiction.qualification,...f.constraints,...f.nodes.flatMap(n=>[n.label,n.kind,n.qualification])])assert.ok(html.includes(escape(value)),`${f.id}/${view}: ${value}`);
  assert.equal(html.includes('data-main-view="scene"'),view==='scene');assert.equal(html.includes('data-main-view="list"'),view==='list');
  assert.deepEqual(c.model.caseFile.researchJurisdiction,f.researchJurisdiction);
 }
});

test('correction is exactly one verified-field DOM paragraph; all other runtime files, source semantics and Ellison advisory wording remain unchanged',()=>{
 for(const name of Object.keys(pins.runtimeSources).filter(name=>name.startsWith('case-scene/')))assertSourcePin(name);
 const ellison=files.find(f=>f.id==='case:usa-ellison');assert.ok(ellison.sharedBlocks.some(b=>b.qualification?.startsWith('Non-addition safeguard only: differently dated person/trust reports may overlap.')));
});
