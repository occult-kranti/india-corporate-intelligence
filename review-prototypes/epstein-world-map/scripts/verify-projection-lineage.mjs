// Optional read-only comparison with an explicitly supplied retained historical UI.
// No source body or machine-specific path is copied into the publication package.
import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {resolve} from 'node:path';
import {ROOT,sha} from './contract.mjs';
import {verifyControllerDelta} from './verify-projection.mjs';
assert(process.argv[2],'Supply the retained historical UI directory explicitly');
const old=resolve(process.argv[2]),read=(root,path)=>readFile(resolve(root,path)),p=JSON.parse(await read(ROOT,'PUBLIC-PROJECTION.json')),proof=JSON.parse(await read(ROOT,'PROJECTION-CONSERVATION.json'));
assert.equal(sha(await read(old,'manifest.json')),p.sourceHashes.acceptedUIManifest);
const operations=p.allowlistedOperations.filter(x=>['remove','replace','add'].includes(x.operation));
const exact={
 'data/anchor-candidates.json':{remove:['/prepared_by','/sources/1/layer_cache','/sources/1/geometry_cache','/sources/2/layer_cache','/sources/2/geometry_cache',...Array.from({length:5},(_,i)=>'/sources/'+(i+4)+'/cache'),'/validation_command','/validation_result_file'],replace:['/corpus/path','/sources/0/path'],add:['/public_projection']},
 'data/anchor-review.json':{remove:['/reviewer_id','/notes'],replace:[],add:['/verification_scope','/public_projection']}
};
let checked=0;
for(const row of proof.projectedDocuments){
 const b=await read(old,row.path);assert.equal(sha(b),row.historicalSha256);const source=JSON.parse(b),value=structuredClone(source);
 for(const kind of ['remove','replace','add'])assert.deepEqual(operations.filter(x=>x.file===row.path&&x.operation===kind).map(x=>x.pointer),exact[row.path][kind]);
 for(const op of operations.filter(x=>x.file===row.path)){const parts=op.pointer.slice(1).split('/'),last=parts.pop();let v=value;for(const k of parts)v=v[k];if(op.operation==='add'){assert(!Object.hasOwn(v,last));v[last]=op.afterValue;}else{assert.equal(sha(JSON.stringify(v[last])),op.beforeValueSha256);if(op.operation==='remove')delete v[last];else{assert.equal(op.afterValue,'data/packet.json');v[last]=op.afterValue;}}}
 const projected=JSON.parse(await read(ROOT,row.path));assert.equal(JSON.stringify(value),JSON.stringify(projected),'Every non-allowlisted value, type and property/array order must be conserved');
 if(row.path.endsWith('anchor-review.json'))assert.deepEqual(projected.verification_scope,[source.notes[1],source.notes[2],source.notes[4]]);checked++;
}
for(const row of proof.unchangedMembers){const before=await read(old,row.path),after=await read(ROOT,row.path);assert.deepEqual(after,before,row.path);assert.equal(sha(before),row.sha256);}
assert.equal(verifyControllerDelta(await read(ROOT,'src/world-ui.ts'),proof.controllerDelta),(await read(old,'src/world-ui.ts')).toString('utf8'));
const before=(await read(old,'src/world-model.ts')).toString(),after=(await read(ROOT,'src/world-model.ts')).toString();
assert.equal(sha(before),proof.modelBindingDelta.historicalSha256);assert.equal(sha(after),proof.modelBindingDelta.projectedSha256);
const expression=/ if\(table\.packet_sha256.*?throw Error\('Map admission conjunction failed'\);/;
const original=before.match(expression);assert(original);const start=after.indexOf(' // Historical acceptance remains'),marker="throw Error('Map admission conjunction failed');",end=after.indexOf(marker,start)+marker.length;assert(start>=0&&end>start);
let normalized=after.slice(0,start)+original[0]+after.slice(end);
normalized=normalized.replace("candidates:'"+p.projectedHashes.candidate+"'","candidates:'"+p.sourceHashes.candidate+"'").replace("review:'"+p.projectedHashes.review+"'","review:'"+p.sourceHashes.review+"'");assert.equal(normalized,before);
console.log(JSON.stringify({status:'PASS_EXACT_HISTORICAL_PROJECTION_LINEAGE',orderedDocuments:checked,unchangedMembers:proof.unchangedMembers.length,modelDelta:'Only two projected pins and the declared historical/pending admission conjunction',distinctReview:'pending',publicationApproved:false,nativeExecuted:false}));
