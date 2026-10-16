import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

const root=new URL('../',import.meta.url),rootPath=fileURLToPath(root);
const sha=value=>createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex');
const read=path=>readFileSync(new URL(path,root));
const fixtureBytes=read('src/data/jio-ownership-corrections.json');
const fixture=JSON.parse(fixtureBytes);
const pinnedFixtureSha='c0ad7c4100dcbe0a691423c318ee9b42445218e414df40274b9b3fe7b8751e3a';
const exports=`export * from './src/data/investigation.ts';export * from './src/graph/build.ts';export * from './src/data/jioOwnershipCorrections.ts';export * from './src/data/conglomerates.ts';`;
async function loadApi(beforeJio=false){
  const result=await build({stdin:{contents:exports,resolveDir:rootPath,loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,logLevel:'silent',plugins:beforeJio?[{name:'pre-jio-effective-comparison',setup(builder){builder.onLoad({filter:/[/\\]src[/\\]graph[/\\]build\.ts$/},({path})=>{
    const source=readFileSync(path,'utf8'),needle='return applyJioNationalOwnershipHolds(buildRetainedNationalGraph(), GROUPS);';
    assert.equal(source.split(needle).length,2,'Only the explicitly scoped national projection is bypassed for before/after comparison');
    return {contents:source.replace(needle,'return buildRetainedNationalGraph();'),loader:'ts'};
  });}}]:[]});
  const module={exports:{}};new Function('module','exports',result.outputFiles[0].text)(module,module.exports);return module.exports;
}
const api=await loadApi(),beforeApi=await loadApi(true);
const retained=api.buildRetainedInvestigationRegistry(),effective=api.getInvestigationRegistry(),before=beforeApi.getInvestigationRegistry();
const ids=fixture.corrections.map(c=>c.relationshipId),recordIds=fixture.corrections.map(c=>c.recordId);
const edgeKey=edge=>`${edge.s}|${edge.pred}|${edge.t}`;
const rawGraph=api.buildRetainedNationalGraph();
const exactKeys=fixture.corrections.map(c=>edgeKey(c.nationalEdge));
const find=(rows,id)=>rows.find(row=>row.id===id);
const uniqueRows=rows=>[...new Map(rows.map(row=>[row.id,row])).values()];
const targetRegistry={relationships:fixture.corrections.map(c=>c.relationship),records:fixture.corrections.map(c=>c.record),sources:uniqueRows(fixture.corrections.flatMap(c=>c.sources.map(s=>s.original))),entities:uniqueRows(fixture.corrections.flatMap(c=>c.endpoints.map(e=>e.original)))};
const drift=/Jio exact-target .* drift/;

test('review sidecar and every raw object hash are independently pinned',()=>{
  assert.equal(sha(fixtureBytes),pinnedFixtureSha);
  assert.equal(sha(read('research/raw/conglomerates.json')),fixture.rawConglomeratesSha256);
  assert.equal(fixture.baselineSha256,'048f89ffd008a498212ff2ac71d4413aef09b138a50ab77f336a23fec4722064');
  api.assertJioCorrectionManifest();
  for(const c of fixture.corrections){
    for(const key of ['foreignPartner','nationalEdge','relationship','record'])assert.equal(sha(c[key]),c[`${key}JsonStringifySha256`],`${c.id}:${key}`);
    for(const item of [...c.sources,...c.endpoints])assert.equal(sha(item.original),item.jsonStringifySha256);
    assert.equal(c.graphEligible,false);assert.equal(c.pathEligible,false);
  }
});
test('retained registry and every packaged canonical chunk remain byte-pinned',()=>{
  assert.equal(sha(retained),fixture.baselineSha256);
  assert.deepEqual(Object.fromEntries(['entities','relationships','records','sources','held'].map(key=>[key,retained[key].length])),{entities:2469,relationships:4203,records:5617,sources:3314,held:316});
  const base=new URL('spatial-prototype/public/data/registry/',root),manifestBytes=readFileSync(new URL('manifest.json',base)),manifest=JSON.parse(manifestBytes);
  assert.equal(sha(manifestBytes),'d551897418cc8b9db640293863ab04718408a6b3e6e7a9ef2a7c863d072ef323');
  assert.equal(manifest.totalChunks,96);assert.equal(manifest.sourceSnapshot.sha256,fixture.baselineSha256);
  const rebuilt={...manifest.metadata};let chunks=0;
  for(const array of manifest.arrays){const rows=[];for(const chunk of array.chunks){const bytes=readFileSync(new URL(chunk.file,base));assert.equal(bytes.length,chunk.bytes);assert.equal(sha(bytes),chunk.sha256);const parsed=JSON.parse(bytes);assert.equal(parsed.length,chunk.rows);assert.equal(rows.length,chunk.offset);rows.push(...parsed);chunks++;}assert.equal(rows.length,array.count);rebuilt[array.key]=rows;}
  const ordered=Object.fromEntries(manifest.topLevelKeys.map(key=>[key,rebuilt[key]]));
  assert.equal(chunks,96);assert.equal(sha(ordered),fixture.baselineSha256);assert.deepEqual(ordered,retained);
});
test('effective registry has exactly the two additional held pairs and preserves every other object and order',()=>{
  assert.equal(before.relationships.length-effective.relationships.length,2);assert.equal(before.records.length-effective.records.length,2);
  assert.deepEqual(before.relationships.filter(row=>!find(effective.relationships,row.id)).map(row=>row.id),ids);
  assert.deepEqual(before.records.filter(row=>!find(effective.records,row.id)).map(row=>row.id),recordIds);
  assert.deepEqual(effective.relationships,before.relationships.filter(row=>!ids.includes(row.id)));
  assert.deepEqual(effective.records,before.records.filter(row=>!recordIds.includes(row.id)));
  for(const key of Object.keys(before).filter(key=>!['relationships','records','coverage'].includes(key)))assert.deepEqual(effective[key],before[key],key);
  assert.deepEqual(effective.coverage,before.coverage.map(row=>row.namespace==='legacy'?{...row,relationships:row.relationships-2,records:row.records-2}:row));
});
test('national builder removes only the two raw structural IDs, without new nodes, objects or joins',()=>{
  const graph=api.buildNationalGraph();
  assert.deepEqual(graph.nodes,rawGraph.nodes);
  assert.deepEqual(graph.edges,rawGraph.edges.filter(edge=>!exactKeys.includes(edgeKey(edge))));
  assert.equal(rawGraph.edges.length-graph.edges.length,2);
  for(const c of fixture.corrections){assert.deepEqual(rawGraph.edges.find(edge=>edgeKey(edge)===edgeKey(c.nationalEdge)),c.nationalEdge);for(const endpoint of [c.nationalEdge.s,c.nationalEdge.t])assert.ok(graph.nodes.some(node=>node.id===endpoint));}
});
test('normal indexes, searches, directed/both paths and neighborhoods cannot re-admit held IDs',()=>{
  for(const c of fixture.corrections){
    assert.equal(api.getInvestigationItem('relationship',c.relationshipId),undefined);assert.equal(api.getInvestigationItem('record',c.recordId),undefined);
    for(const id of [c.relationshipId,c.recordId]){const view=api.getInvestigationView({q:id});assert.ok(!view.relationships.some(row=>row.id===c.relationshipId));assert.ok(!view.records.some(row=>row.id===c.recordId));}
    for(const direction of ['directed','both'])for(const [from,to]of [[c.relationship.from,c.relationship.to],[c.relationship.to,c.relationship.from]]){
      assert.equal(api.findInvestigationPaths(from,to,{}, {maxDepth:1,direction}).paths.length,0);
      const paths=api.findInvestigationPaths(from,to,{}, {maxDepth:8,direction});assert.ok(paths.paths.every(path=>path.relationshipIds.every(id=>!ids.includes(id))));
    }
    for(const id of [c.relationship.from,c.relationship.to])assert.ok(api.getInvestigationNeighbors(id,3).relationships.every(row=>!ids.includes(row.id)));
  }
});
test('full Meta Outlook plus Inc42 and Google Outlook-only closures remain intact, with no shared-source-wide hold',()=>{
  assert.deepEqual(fixture.corrections.map(c=>c.sourceIds),[['legacy:source:88f95f360cab64d','legacy:source:5ac4722579b9b603'],['legacy:source:88f95f360cab64d']]);
  assert.deepEqual(effective.sources,before.sources);
  const shared=new Set(fixture.corrections.flatMap(c=>c.sourceIds));
  const unaffected=before.relationships.filter(row=>!ids.includes(row.id)&&row.sourceIds.some(id=>shared.has(id)));
  assert.ok(unaffected.some(row=>row.from.includes('public-investment-fund-pif')),'PIF shared-source relationship remains represented');
  for(const row of unaffected)assert.deepEqual(find(effective.relationships,row.id),row);
  for(const c of fixture.corrections){assert.deepEqual(find(retained.relationships,c.relationshipId),c.relationship);assert.deepEqual(find(retained.records,c.recordId),c.record);for(const source of c.sources)assert.deepEqual(api.getInvestigationSource(source.original.id),source.original);}
});
test('all raw partner objects stay intact; exactly the two Reliance rows receive qualified presentation',()=>{
  const group=api.GROUP_BY_ID.get('reliance'),rawBefore=sha(api.GROUPS),rows=api.foreignPartnerPresentations(group);
  assert.equal(group.foreignPartners.length,14);assert.equal(rows.length,14);assert.equal(rows.filter(row=>row.correction).length,2);
  for(const [index,row]of rows.entries()){
    assert.equal(row.partner,group.foreignPartners[index]);
    if(index<2){const c=row.correction;assert.match(c.displayTitle,/^(Meta|Google) \/ Jio report · direct ownership interpretation held$/);assert.match(c.summary,/Outlook Business reported on 21 June 2026/);assert.match(c.summary,/secondary report/);assert.match(c.summary,/current ownership/);assert.match(c.summary,/Reliance-group endpoint is not a reviewed identity match to Jio Platforms/);assert.match(c.notice,/held from factual graphs and paths/);assert.equal(c.sourcePublishedAt,'2026-06-21');assert.doesNotMatch(c.displayTitle,/Adani/);}
    else assert.equal(row.correction,null);
  }
  assert.match(rows[0].correction.summary,/Jaadhu Holdings/);assert.match(rows[1].correction.summary,/Alphabet Inc., Google LLC and Google International LLC remain distinct/);assert.doesNotMatch(JSON.stringify(rows[1].correction),/9\.99|9\.98|Jaadhu/);
  for(const other of api.GROUPS.filter(g=>g.id!=='reliance'))assert.ok(api.foreignPartnerPresentations(other).every(row=>!row.correction));
  const copied={...group,id:'unrelated:copied-wording'};assert.ok(api.foreignPartnerPresentations(copied).every(row=>!row.correction));
  assert.equal(sha(api.GROUPS),rawBefore);
});
test('page emits the correction-aware rows, dated summaries and scoped audit disclosure',()=>{
  const page=read('src/pages/Conglomerates.tsx').toString();
  assert.match(page,/foreignPartnerPresentations\(g\)\.map/);assert.match(page,/data-jio-ownership-hold/);assert.match(page,/correction\.displayTitle/);assert.match(page,/correction\.summary/);assert.match(page,/correction\.notice/);assert.match(page,/correction\.sources\.map/);assert.match(page,/<summary className="cursor-pointer">Superseded audit wording<\/summary>/);
  assert.doesNotMatch(page,/g\.foreignPartners\.map/);
});
test('foreign-partner guards reject one-field identity, wording and exact-source closure drift',()=>{
  for(const index of [0,1])for(const field of Object.keys(fixture.corrections[index].foreignPartner)){
    const groups=structuredClone(api.GROUPS),row=groups.find(g=>g.id==='reliance').foreignPartners[index];
    row[field]=field==='srcs'?row.srcs.slice(1):'drift';assert.throws(()=>api.assertJioForeignPartnerTargets(groups),drift,`${index}:${field}`);
  }
  for(const index of [0,1])for(const mutate of [row=>row.srcs.push(['extra','https://example.com/extra']),row=>row.srcs[0][0]='drift',row=>row.srcs[0][1]='https://example.com/drift',row=>delete row.srcs,row=>row.extra='drift']){
    const groups=structuredClone(api.GROUPS);mutate(groups.find(g=>g.id==='reliance').foreignPartners[index]);assert.throws(()=>api.assertJioForeignPartnerTargets(groups),drift);
  }
  for(const mutate of [group=>group.foreignPartners.shift(),group=>group.foreignPartners.push(structuredClone(group.foreignPartners[0])),group=>group.id='changed']){const group=structuredClone(api.GROUP_BY_ID.get('reliance'));mutate(group);assert.throws(()=>api.assertJioForeignPartnerTargets([group]),drift);}
});
test('national hold fails closed on target drift, duplicate, missing source or added date/amount',()=>{
  for(const c of fixture.corrections)for(const field of [...Object.keys(c.nationalEdge),'id','from','to','a']){
    const graph=structuredClone(rawGraph),row=graph.edges.find(edge=>edgeKey(edge)===edgeKey(c.nationalEdge));row[field]=field==='srcs'?[]:field==='a'?1:'drift';assert.throws(()=>api.applyJioNationalOwnershipHolds(graph,api.GROUPS),drift,`${c.id}:${field}`);
  }
  for(const c of fixture.corrections)for(const mutate of [graph=>graph.edges.splice(graph.edges.findIndex(e=>edgeKey(e)===edgeKey(c.nationalEdge)),1),graph=>graph.edges.push(structuredClone(c.nationalEdge)),graph=>{graph.edges.find(e=>edgeKey(e)===edgeKey(c.nationalEdge)).srcs=undefined;}]){
    const graph=structuredClone(rawGraph);mutate(graph);assert.throws(()=>api.applyJioNationalOwnershipHolds(graph,api.GROUPS),drift);
  }
  const copy={...fixture.corrections[0].nationalEdge,s:'unrelated:copied-wording'},graph={...rawGraph,edges:[...rawGraph.edges,copy]};assert.ok(api.applyJioNationalOwnershipHolds(graph,api.GROUPS).edges.includes(copy));
});
test('retained closure rejects every changed field of target relationships, records, source and endpoint objects',()=>{
  api.assertJioRetainedRegistry(targetRegistry);
  for(const kind of ['relationships','records','sources','entities'])for(const original of targetRegistry[kind])for(const field of Object.keys(original)){
    const changed=structuredClone(targetRegistry);delete find(changed[kind],original.id)[field];assert.throws(()=>api.assertJioRetainedRegistry(changed),drift,`${kind}:${original.id}:${field}`);
  }
  for(const kind of ['relationships','records','sources','entities'])for(const original of targetRegistry[kind])for(const duplicate of [false,true]){
    const changed=structuredClone(targetRegistry);if(duplicate)changed[kind].push(structuredClone(original));else changed[kind]=changed[kind].filter(row=>row.id!==original.id);assert.throws(()=>api.assertJioRetainedRegistry(changed),drift,`${kind}:${original.id}:${duplicate}`);
  }
  for(const kind of ['relationships','records'])for(const original of targetRegistry[kind])for(const sourceIds of [[],['legacy:source:88f95f360cab64d','legacy:source:extra'],[...original.sourceIds].reverse(),[...original.sourceIds,...original.sourceIds]]){
    if(JSON.stringify(sourceIds)===JSON.stringify(original.sourceIds))continue;
    const changed=structuredClone(targetRegistry);find(changed[kind],original.id).sourceIds=sourceIds;assert.throws(()=>api.assertJioRetainedRegistry(changed),drift);
  }
});
test('manifest gates reject baseline, receipt, raw-hash, identity, eligibility and closure mutations',()=>{
  for(const field of Object.keys(fixture).filter(key=>key!=='corrections')){const changed=structuredClone(fixture);changed[field]='drift';assert.throws(()=>api.assertJioCorrectionManifest(changed),drift,field);}
  for(const index of [0,1])for(const field of Object.keys(fixture.corrections[index])){
    const changed=structuredClone(fixture);changed.corrections[index][field]=field==='sources'?[]:field==='sourceIds'?[]:'drift';assert.throws(()=>api.assertJioCorrectionManifest(changed),undefined,`${index}:${field}`);
  }
  for(const index of [0,1])for(const kind of ['sources','endpoints']){const changed=structuredClone(fixture);changed.corrections[index][kind][0].jsonStringifySha256='drift';assert.throws(()=>api.assertJioCorrectionManifest(changed),drift);}
  assert.ok(Object.isFrozen(api.JIO_OWNERSHIP_MANIFEST));assert.ok(Object.isFrozen(api.JIO_OWNERSHIP_CORRECTIONS[0].sources[0].original));
});
test('repeat effective/audit calls do not mutate caches or raw input objects',()=>{
  const groupHash=sha(api.GROUPS),graphHash=sha(rawGraph),effectiveHash=sha(effective);
  for(let round=0;round<3;round++){
    assert.equal(sha(api.buildRetainedInvestigationRegistry()),fixture.baselineSha256);
    assert.equal(sha(api.buildInvestigationRegistry()),effectiveHash);
    assert.equal(sha(api.buildRetainedNationalGraph()),graphHash);
    api.buildNationalGraph();api.foreignPartnerPresentations(api.GROUP_BY_ID.get('reliance'));
  }
  assert.equal(sha(api.getInvestigationRegistry()),effectiveHash);assert.equal(sha(api.GROUPS),groupHash);assert.equal(sha(rawGraph),graphHash);
});
test('unrelated global-workbench dataset payloads remain byte-identical',()=>{
  for(const [name,expected]of [['dataset','0b367110d0571db02c34b0a1c5e5609a6edd2c63265d01833f95164212165d67'],['finance','8a224043fa10fa9e11407c931928d52bf5a9998d1cb23142c90e4562cda1277d'],['media','093efd28d3f1e3ce6db3b45038a3eb53c62174a92dfb36b4396978661f1e5889']])assert.equal(sha(read(`global-evidence-workbench/ui/public/data/${name}.json`)),expected);
});
