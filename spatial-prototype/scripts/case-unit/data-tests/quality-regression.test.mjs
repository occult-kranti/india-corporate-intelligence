import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {dir,load,renderModule,build,require,host} from './test-tools.mjs';
const adapter=await load('adapter.ts');
const {render,renderEvidence}=await renderModule();
const profile='profile:usa-bezos';
const marker='Synthetic unreviewed fixture text';

// These synthetic fixtures exercise the supported local data contract only.
function ownGetter(object,key,read){Object.defineProperty(object,key,{enumerable:true,configurable:true,get:read});}
function fresh(){return adapter.getCase(profile);}
function assertRejectedWithoutRead(make){
 for(const consumer of ['assertion','panel','evidence']){
  const file=fresh(),claimId=file.claims[0].claimId;let calls=0;
  make(file,()=>{calls++;});
  if(consumer==='assertion')assert.throws(()=>adapter.assertCaseFile(file));
  if(consumer==='panel'){
   const html=render(file,'list');assert.match(html,/diagram is withheld/);assert.ok(!html.includes(marker));assert.doesNotMatch(html,/data-edge-id=/);
  }
  if(consumer==='evidence')assert.throws(()=>renderEvidence(file,claimId));
  assert.equal(calls,0,consumer+' evaluated unsupported input');
 }
}

test('ordinary array accessors are rejected without evaluation by adapter and both component boundaries',()=>{
 for(const collection of ['claims','nodes','edges','sources']){
  assertRejectedWithoutRead((file,onRead)=>{const original=file[collection][0];ownGetter(file[collection],'0',()=>{onRead();return original;});});
 }
 assertRejectedWithoutRead((file,onRead)=>{const original=file.claims[0].qualifications[0];ownGetter(file.claims[0].qualifications,'0',()=>{onRead();return original;});});
 assertRejectedWithoutRead((file,onRead)=>{const original=file.claims[0].sourceIds[0];ownGetter(file.claims[0].sourceIds,'0',()=>{onRead();return original;});});
});

test('unsupported getter values cannot change between validation and rendering',()=>{
 assertRejectedWithoutRead((file,onRead)=>{
  const original=file.claims[0];let reads=0;
  ownGetter(file.claims,'0',()=>{onRead();reads++;return reads===1?original:{...original,statement:marker,alwaysVisibleQualification:marker,mandatoryBoundary:marker};});
 });
 for(const key of ['id','profileId']){
  assertRejectedWithoutRead((file,onRead)=>{const original=file[key];ownGetter(file,key,()=>{onRead();return original;});});
 }
});

test('nonstandard array prototypes and supplied methods are rejected without invoking them',()=>{
 assertRejectedWithoutRead((file,onRead)=>{
  const prototype=Object.create(Array.prototype);
  prototype.map=function(){onRead();return [];};
  Object.setPrototypeOf(file.claims,prototype);
 });
 assertRejectedWithoutRead((file,onRead)=>{Object.setPrototypeOf(file.claims,null);void onRead;});
 assertRejectedWithoutRead((file,onRead)=>{ownGetter(file.claims,'map',()=>{onRead();return Array.prototype.map;});});
 assertRejectedWithoutRead((file,onRead)=>{ownGetter(file.claims,Symbol.iterator,()=>{onRead();return Array.prototype[Symbol.iterator];});});
});

test('sparse, extra, hidden, and symbol array shapes are rejected while ordinary and frozen JSON copies work',()=>{
 for(const modify of [
  file=>{delete file.claims[0];},
  file=>{file.claims.extra='unsupported';},
  file=>{Object.defineProperty(file.claims,'0',{value:file.claims[0],enumerable:false});},
  file=>{file.claims[Symbol('extra')]=true;},
 ]){const file=fresh();modify(file);assert.throws(()=>adapter.assertCaseFile(file));assert.match(render(file,'list'),/diagram is withheld/);}
 const ordinary=fresh();adapter.assertCaseFile(ordinary);const pinned=adapter.getVerifiedCaseFile(ordinary);adapter.assertCaseFile(pinned);assert.match(render(pinned,'list'),/data-edge-id=/);
});

const built=await build({stdin:{contents:`import{renderToStaticMarkup}from'react-dom/server';import{CaseDiagramPanel,CaseEvidenceDetails}from'./CaseDiagramPanel';export function preparePanel(file){return CaseDiagramPanel({caseFile:file,initialView:'list'});}export function prepareEvidence(file,claimId){return CaseEvidenceDetails({caseFile:file,claimId});}export{renderToStaticMarkup};`,resolveDir:dir,loader:'tsx'},bundle:true,write:false,format:'cjs',platform:'node',jsx:'automatic',nodePaths:[path.join(host,'node_modules')],loader:{'.css':'empty'}});
const evaluated={exports:{}};
new Function('require','module','exports',built.outputFiles[0].text)(require,evaluated,evaluated.exports);
const {preparePanel,prepareEvidence,renderToStaticMarkup}=evaluated.exports;
function assertDeeplyFrozen(value){if(value&&typeof value==='object'){assert.equal(Object.isFrozen(value),true);for(const child of Object.values(value))assertDeeplyFrozen(child);}}

test('panel renders its immutable pinned copy when the normal caller input changes after validation',()=>{
 for(const original of adapter.getCaseCatalog().cases){
  const file=JSON.parse(JSON.stringify(original)),element=preparePanel(file);
  assert.notEqual(element.props.caseFile,file);assertDeeplyFrozen(element.props.caseFile);
  file.claims[0].alwaysVisibleQualification=marker;file.claims[0].statement=marker;file.label=marker;
  const html=renderToStaticMarkup(element);assert.ok(!html.includes(marker));assert.ok(html.includes(original.label.replaceAll('&','&amp;')));assert.match(html,/data-edge-id=/);
  assert.throws(()=>{element.props.caseFile.claims[0].statement=marker;},TypeError);
 }
});

test('evidence renders its immutable pinned copy when caller data changes before child rendering',()=>{
 for(const original of adapter.getCaseCatalog().cases){
  const file=JSON.parse(JSON.stringify(original)),id=file.claims[0].claimId,element=prepareEvidence(file,id);
  assert.notEqual(element.props.file,file);assertDeeplyFrozen(element.props.file);assertDeeplyFrozen(element.props.claim);
  file.claims[0].statement=marker;file.claims[0].qualifications.push(marker);file.sources[0].title=marker;
  const html=renderToStaticMarkup(element);assert.ok(!html.includes(marker));assert.throws(()=>{element.props.claim.statement=marker;},TypeError);
 }
});

test('fallback and compatibility outputs remain pinned independent copies',()=>{
 const file=fresh();file.claims[0].statement=marker;const fallback=adapter.getPinnedReaderFallback(file);assert.ok(fallback);assertDeeplyFrozen(fallback);assert.notEqual(fallback.claims[0].statement,marker);
 const unknown=fresh();unknown.id='unknown';assert.equal(adapter.getPinnedReaderFallback(unknown),null);
 for(const original of adapter.getCaseCatalog().cases){const result=adapter.getSceneCompatibility(original);assert.notEqual(result.caseFile,original);assertDeeplyFrozen(result.caseFile);assert.equal(result.mode,original.v2?'reader_only_until_scene_review':'frozen_v1_model');}
});
