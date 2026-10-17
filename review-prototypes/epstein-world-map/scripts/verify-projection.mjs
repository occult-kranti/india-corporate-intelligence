import assert from 'node:assert/strict';
import {readFile,readdir,lstat} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
import {pathToFileURL} from 'node:url';
import {ROOT,sha,typed} from './contract.mjs';
const privateMarker=/(?:\/(?:workspace|root|Users|tmp)\/|(?:source|review)_epstein_map_(?:anchors|inputs))/;
export function scanDocument(value,label='document'){
 const values=typed(value);for(const row of values)if(row.kind==='string')assert(!privateMarker.test(row.value),label+' private metadata at '+row.path);
 return {label,typedValues:values.length,strings:values.filter(x=>x.kind==='string').length};
}
export function verifyControllerDelta(bytes,delta){
 assert.equal(delta.path,'src/world-ui.ts');assert.equal(delta.historicalBytes,21183);
 assert.equal(delta.historicalSha256,'a4f687e80147b0148d8a394e750e5f2b8e73a4cd43f5319eb345b624d3d26b1b');
 assert.equal(bytes.length,delta.currentBytes);assert.equal(sha(bytes),delta.currentSha256);
 assert.equal(delta.replacements.length,4);let historical=bytes.toString('utf8');
 for(const edit of [...delta.replacements].reverse()){
  assert.equal(typeof edit.before,'string');assert.equal(typeof edit.after,'string');assert(edit.before.length&&edit.after.length);assert.notEqual(edit.before,edit.after);
  assert.equal(historical.split(edit.after).length-1,1,'Each declared replacement must occur exactly once');historical=historical.replace(edit.after,edit.before);
 }
 assert.equal(Buffer.byteLength(historical),delta.historicalBytes);assert.equal(sha(historical),delta.historicalSha256);
 return historical;
}
export async function verifyProjection(){
 const get=async f=>readFile(resolve(ROOT,f)),json=async f=>JSON.parse(await get(f));
 const p=await json('PUBLIC-PROJECTION.json'),proof=await json('PROJECTION-CONSERVATION.json');
 assert.equal(proof.schema,'public-projection-source-conservation-v2');assert.equal(proof.unchangedMembers.length,23);assert(!proof.unchangedMembers.some(x=>x.path==='src/world-ui.ts'));
 verifyControllerDelta(await get('src/world-ui.ts'),proof.controllerDelta);
 assert.equal(p.status,'PENDING_DISTINCT_CONSERVATION_REVIEW');assert.equal(p.publicationApproved,false);
 assert.equal(p.allowlistedOperations.length,38);
 const seen=new Set();for(const x of p.allowlistedOperations){const k=x.file+'#'+x.pointer;assert(!seen.has(k),k);seen.add(k);assert(['data/anchor-candidates.json','data/anchor-review.json'].includes(x.file));assert(['add','add-descendant','remove','replace','removed-container-descendant'].includes(x.operation));}
 for(const r of proof.unchangedMembers){const b=await get(r.path);assert.equal(b.length,r.bytes,r.path);assert.equal(sha(b),r.sha256,r.path);}
 for(const r of proof.projectedDocuments){const b=await get(r.path);assert.equal(sha(b),r.projectedSha256);assert.equal(sha(JSON.stringify(JSON.parse(b))),r.orderedProjectionObjectSha256);}
 assert.equal(sha(await get(proof.modelBindingDelta.path)),proof.modelBindingDelta.projectedSha256);
 const mapping={packet:'data/packet.json',anchors:'data/anchors.json',candidates:'data/anchor-candidates.json',review:'data/anchor-review.json',root:'data/anchor-root-acceptance.json'};
 const scans=[],decoded=[];
 for(const f of [...Object.values(mapping),'assets/world-countries-50m.json','assets/world-geography-provenance.json'])scans.push(scanDocument(await json(f),f));
 const candidate=await json(mapping.candidates),review=await json(mapping.review),root=await json(mapping.root),anchors=await json(mapping.anchors);
 assert.equal(candidate.public_projection.source_sha256,p.sourceHashes.candidate);assert.equal(review.public_projection.source_receipt_sha256,p.sourceHashes.review);assert.equal(review.public_projection.source_candidate_sha256,p.sourceHashes.candidate);
 assert.equal(sha(await get(mapping.candidates)),p.projectedHashes.candidate);assert.equal(sha(await get(mapping.review)),p.projectedHashes.review);
 for(const x of [candidate,review]){assert.equal(x.public_projection.conservation_review,'pending');assert.equal(x.public_projection.publication_authorized,false);}
 assert.equal(root.packet_sha256,p.sourceHashes.candidate);assert.equal(root.review_receipt_sha256,p.sourceHashes.review);assert.equal(root.public_data_publication_approval,false);assert.equal(anchors.packet_sha256,p.sourceHashes.candidate);
 assert.equal(candidate.corpus.path,'data/packet.json');assert.equal(candidate.sources[0].path,'data/packet.json');
 for(const x of p.allowlistedOperations.filter(x=>x.operation==='remove')){const parts=x.pointer.slice(1).split('/');let v=x.file===mapping.candidates?candidate:review;for(const part of parts.slice(0,-1))v=v[part];assert(!Object.hasOwn(v,parts.at(-1)),x.pointer);}
 assert.deepEqual(review.verification_scope,p.allowlistedOperations.find(x=>x.file===mapping.review&&x.pointer==='/verification_scope').afterValue);
 let geometry;
 for(const f of ['dist/index.html','dist/controller-fixture.html']){
  const html=(await get(f)).toString();assert(!privateMarker.test(html),f+' plain text');const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];assert.equal(scripts.length,7,f);
  const executable=scripts.filter(x=>!x[1].includes('type='));assert.equal(executable.length,1);const {createHash}=await import('node:crypto');assert(html.includes("script-src 'sha256-"+createHash('sha256').update(executable[0][2]).digest('base64')+"'"));
  for(const [key,path]of Object.entries(mapping)){const m=scripts.filter(x=>x[1].includes('id="input-'+key+'"'));assert.equal(m.length,1);const b=Buffer.from(m[0][2],'base64');assert.equal(b.toString('base64'),m[0][2]);assert.deepEqual(b,await get(path),f+' decoded '+key);scans.push(scanDocument(JSON.parse(b),f+'#input-'+key));decoded.push({document:f,input:key,bytes:b.length,sha256:sha(b)});}
  const m=scripts.find(x=>x[1].includes('id="world-geometry"'));assert(m);const b=Buffer.from(m[2],'base64');assert.equal(b.toString('base64'),m[2]);assert(!privateMarker.test(b.toString()));assert(!/<(?:script|a|image|foreignObject)\b/i.test(b.toString()));if(geometry)assert.deepEqual(b,geometry);else geometry=b;decoded.push({document:f,input:'world-geometry',bytes:b.length,sha256:sha(b)});
 }
 const fallback=(await get('dist/readable.html')).toString();assert(!privateMarker.test(fallback));assert(!/<script\b/i.test(fallback));
 return {status:'PASS_COMPLETE_DECODED_INPUT_SCAN_AND_EXACT_CONSERVATION',distinctReview:'pending',publicationApproved:false,decoded,scans,unchangedMembers:proof.unchangedMembers.length,controllerDelta:1,nativeExecuted:false,limitation:'Marker scanning and exact comparison are reproducible checks, not arbitrary-content privacy certification. Independent review must inspect the full public tree.'};
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)console.log(JSON.stringify(await verifyProjection(),null,2));
