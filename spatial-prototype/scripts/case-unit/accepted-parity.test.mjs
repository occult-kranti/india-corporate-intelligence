import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {helpers,pins,fixtures,host,hash,semanticHash,acceptedCatalog,assertSourcePin} from './test-tools.mjs';
const {load,renderModule}=helpers('case-scene');
const {getCaseCatalog}=await load('catalog-bridge.ts'),{CaseController}=await load('controller.ts'),{render}=await renderModule();
const files=getCaseCatalog().cases;
test('retained runtime-unimported canonical raw source remains exact accepted bytes',()=>{
 const retained=fs.readFileSync(path.join(host,'src/case-data/reviewed-transport.json'));
 assert.equal(retained.byteLength,334950);assert.equal(hash(retained),'2ca8ae35ef4a02c252e8a1109bb98afd86d7c104b010e90e981a95891a32476c');
});
test('assembled catalog matches independently pinned expanded semantics and canonical transport',async()=>{
 assert.deepEqual(getCaseCatalog(),await acceptedCatalog());assert.equal(semanticHash(getCaseCatalog()),pins.expandedCatalogSha256);
 assert.deepEqual([files.length,files.flatMap(f=>f.claims).length,files.flatMap(f=>f.nodes).length,files.flatMap(f=>f.edges).length,files.flatMap(f=>f.readerFactIds).length],[19,72,91,73,13]);
});
test('all 19 controllers and DOM match frozen accepted source across 348 explicit actions',()=>{
 let steps=0;
 for(const file of files){const controller=new CaseController(file,true),expected=pins.transitions[file.id];assert.equal(semanticHash(controller.model),expected.modelSha256,file.id);let wall=0;
  for(const step of expected.steps){controller.dispatch(step.action,wall+=10);assert.equal(semanticHash(controller.state),step.stateSha256,`${file.id}/${step.action.type}/state`);assert.equal(hash(render(controller.file,controller.model,controller.state)),step.domSha256,`${file.id}/${step.action.type}/DOM`);steps++;}
 }
 assert.equal(steps,348);
});
test('approved runtime sources remain pinned with only the reviewed transport import and host lease adaptation',()=>{
 for(const name of Object.keys(pins.runtimeSources))assertSourcePin(name);
});
test('chooser includes exact approved fields and no wealth observations',()=>{
 const index=JSON.parse(fs.readFileSync(path.join(host,'src/profile-host/case-index.json'),'utf8'));
 assert.deepEqual(index,files.map(f=>({id:f.id,label:f.label,profileId:f.profileId,researchJurisdiction:{label:f.researchJurisdiction.label,qualification:f.researchJurisdiction.qualification},claimCount:f.claims.length})));
 for(const row of index){assert.deepEqual(Object.keys(row),['id','label','profileId','researchJurisdiction','claimCount']);assert.deepEqual(Object.keys(row.researchJurisdiction),['label','qualification']);}
 assert.equal(index.length,19);assert.equal(index.reduce((n,f)=>n+f.claimCount,0),72);
});
