import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {dir,load,build,pins,semanticHash,acceptedCatalog} from './test-tools.mjs';
const a=await load('adapter.ts'),catalog=a.getCaseCatalog(),copy=x=>JSON.parse(JSON.stringify(x));
const candidate=pins.candidate;
const input=await acceptedCatalog();
const all=catalog.cases.flatMap(f=>f.claims);
const oldCatalog={...pins.legacyCatalogHeader,cases:input.cases.slice(0,14)};
assert.equal(semanticHash(oldCatalog),pins.legacyCatalogSha256);

test('explicit v2 schema: all 19 cases, 91 nodes, 72 claims, 73 relation roles, 13 reader-only',()=>{
 assert.equal(catalog.schemaVersion,'olympus.case-diagram.2');assert.deepEqual(catalog.counts,{A:32,B:27,R:13});assert.equal(catalog.cases.length,19);assert.equal(all.length,72);assert.equal(catalog.cases.flatMap(f=>f.nodes).length,91);assert.equal(catalog.cases.flatMap(f=>f.edges).length,73);assert.equal(catalog.cases.flatMap(f=>f.readerFactIds).length,13);assert.equal(catalog.renderReviewComplete,false);
 assert.deepEqual(catalog.cohorts,[{id:'frozen_v1',cases:14,claims:50,relations:50,nodes:69},{id:'reviewed_v2_additions',cases:5,claims:22,relations:23,nodes:22}]);
});
test('every v1 case, node, edge ID and all 50 complete claim records are exactly unchanged',()=>{
 assert.deepEqual(catalog.cases.slice(0,14),oldCatalog.cases);
 for(const file of catalog.cases.slice(0,14)){a.assertCaseFile(file);assert.equal(semanticHash(file),pins.legacyCaseHashes[file.id]);assert.equal(a.getSceneCompatibility(file).mode,'frozen_v1_model');}
 assert.equal(semanticHash(input.cases.slice(0,14)),pins.legacyCasesSha256);assert.equal(oldCatalog.schemaVersion,'olympus.case-diagram.1');
 for(const file of catalog.cases.slice(14)){assert.equal(file.v2.legacySceneSupport,'held_use_complete_v2_reader');assert.equal(a.getSceneCompatibility(file).mode,'reader_only_until_scene_review');}
});
test('all 22 complete reader and original records, exact source types and explicit 23 relations preserved',()=>{
 for(const c of candidate.claims){const file=catalog.cases.find(f=>f.profileId===c.profileId),actual=file.claims.find(x=>x.claimId===c.claimId);
  for(const [field,value] of Object.entries({originalClaimRecord:actual.v2.originalClaimRecord,readerClaimRecord:actual.v2.readerClaimRecord,flags:actual.v2.flags,sourceDateFields:actual.v2.sourceDateFields,exclusions:actual.exclusions,dateFields:actual.dates,recursiveDependencySourceIds:actual.sourceIds,recursiveDependencyClaimIds:actual.v2.recursiveDependencyClaimIds}))assert.equal(semanticHash(value),c.fields[field],`${c.claimId}/${field}`);
  for(const source of file.sources)assert.equal(semanticHash(source),candidate.sources[source.id],source.id);
  for(const expected of c.relations){const e=file.edges.find(x=>x.id===expected.id),r=e.v2;assert.equal(semanticHash(r),expected.sha256,expected.id);assert.equal(e.kind,r.predicate);assert.equal(e.from,r.fromNodeId);assert.equal(e.to,r.toNodeId);assert.equal(e.role,r.label);assert.equal(e.width,1.5);}
 }
});
test('source/context closure includes companion sources, signature context, negatives and cycles without new edges',()=>{
 for(const file of catalog.cases.slice(14))for(const c of file.claims){assert.ok(c.sourceIds.every(id=>file.sources.some(s=>s.id===id)));for(const id of c.v2.recursiveDependencyClaimIds){const dep=file.claims.find(x=>x.claimId===id);assert.ok(dep);assert.ok(dep.sourceIds.every(s=>c.sourceIds.includes(s)));}}
 const find=id=>all.find(c=>c.claimId.endsWith(':'+id));assert.equal(find('AF-C09').sourceIds.length,4);assert.ok(find('AF-C03').v2.recursiveDependencyClaimIds.includes(find('AF-C08').claimId));assert.deepEqual(find('LE-C01').v2.recursiveDependencyClaimIds,[find('LE-C02').claimId]);
 for(const id of ['TH-C03','AF-C05','AF-C06','AF-C10']){const c=find(id);assert.equal(c.classCode,'R');assert.equal(c.v2.relationIds.length,0);assert.ok(!catalog.cases.flatMap(f=>f.edges).some(e=>e.claimId===c.claimId));}
});
test('Blue Origin and Ellison trust identities remain source-qualified and disconnected; no inferred bridge',()=>{
 const bezos=a.getCase('profile:usa-bezos'),blue=bezos.nodes.filter(n=>n.label.startsWith('Blue Origin'));assert.equal(blue.length,2);assert.notEqual(blue[0].id,blue[1].id);assert.ok(!bezos.edges.some(e=>blue.every(n=>[e.from,e.to].includes(n.id))));
 const ellison=a.getCase('profile:usa-ellison'),trusts=ellison.nodes.filter(n=>n.kind==='trust');assert.equal(trusts.length,2);assert.ok(!ellison.edges.some(e=>trusts.every(n=>[e.from,e.to].includes(n.id))));assert.equal(ellison.sharedBlocks[0].aggregation,'non_additive_potentially_overlapping_dated_reports');
 const af=a.getCase('profile:usa-alphabet-founders');assert.equal(af.edges.filter(e=>e.v2.predicate==='sole_trustee').length,1);assert.ok(!af.nodes.some(n=>/recipient|founder total/i.test(n.label)));
 for(const file of catalog.cases)for(const item of [file,...file.nodes,...file.edges]){assert.equal(item.canonicalEntityId,null);assert.deepEqual(item.countryAssociations,[]);for(const key of ['publicationEligible','publicGraphEligible','pathEligible','aggregateEligible','researchExportEligible'])assert.equal(item[key],false);}
});
test('all direct case-record fields reject deletion and unknown extras; every v2 envelope field is required',()=>{
 let rejects=0;
 // Every direct required field on every case/claim/relation/source plus nested v2 metadata.
 for(const [i,f]of input.cases.entries())for(const collection of ['claims','edges','sources'])for(const [j,record]of f[collection].entries()){for(const key of Object.keys(record)){const bad=copy(input);delete bad.cases[i][collection][j][key];assert.throws(()=>a.adaptReviewedInput(bad));rejects++;}const bad=copy(input);bad.cases[i][collection][j].unknownRequiredField='invented';assert.throws(()=>a.adaptReviewedInput(bad));rejects++;}
 for(const [i,f]of input.cases.entries()){const bad=copy(input);bad.cases[i].inventedEdge=[];assert.throws(()=>a.adaptReviewedInput(bad));rejects++;if(f.v2){for(const [j,c]of f.claims.entries())for(const key of Object.keys(c.v2)){const bad=copy(input);delete bad.cases[i].claims[j].v2[key];assert.throws(()=>a.adaptReviewedInput(bad));rejects++;}}}
 assert.ok(rejects>3000,`${rejects} failures rejected`);console.log(`Rejected ${rejects} mandatory-field and extra-field fixtures.`);
});
test('semantic failure fixtures reject source drift, extra edges, enum coercion, overlap assertion, omissions and invalid JSON',()=>{
 const mutations=[x=>x.cases[14].sources[0].url='https://example.com/forged',x=>x.cases[14].edges.push(copy(x.cases[14].edges[0])),x=>x.cases[15].edges[1].kind='holding',x=>x.cases[17].sharedBlocks[0].aggregation='non_additive_same_reported_block',x=>x.cases[18].claims[0].v2.recursiveDependencyClaimIds=[],x=>x.cases[18].claims[8].sourceIds.pop(),x=>x.cases[18].claims[7].v2.flags.signatureDiscrepancyUnresolved=false,x=>x.cases[14].claims[2].classCode='A',x=>x.cases[15].edges[2].v2.amount=NaN,x=>x.cases[14].claims[0].v2.flags=new Date(),x=>x.cases[14].nodes[0].latitude=35,x=>x.cases[17].nodes[0].canonicalEntityId='global:person'];
 for(const mutation of mutations){const bad=copy(input);mutation(bad);assert.throws(()=>a.adaptReviewedInput(bad));}
 const sparse=copy(input);delete sparse.cases[0];assert.throws(()=>a.adaptReviewedInput(sparse));
 assert.throws(()=>a.adaptReviewedInput(oldCatalog));assert.throws(()=>a.adaptReviewedInput(candidate));
 const output=a.getCaseCatalog();output.cases[0].claims[0].statement='changed';assert.throws(()=>a.assertCaseCatalog(output));assert.notEqual(a.getCaseCatalog().cases[0].claims[0].statement,'changed');
});
