import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {evaluateEffectiveGraph} from './lib/load-effective-graph.mjs';
import {normalize,visibleRelations,applyInheritedAbsenceScopeCorrections} from '../global-evidence-workbench/ui/src/model.js';
import {INHERITED_ABSENCE_GLOBAL_SPECS} from '../global-evidence-workbench/ui/src/model.js';
const bundle=await build({entryPoints:['src/data/investigation.ts'],bundle:true,platform:'node',format:'cjs',write:false,logLevel:'silent'});
const m={exports:{}};new Function('module','exports',bundle.outputFiles[0].text)(m,m.exports);
const api=m.exports,raw=api.buildRetainedInvestigationRegistry(),effective=api.getInvestigationRegistry();
const spatial=JSON.parse(readFileSync('spatial-prototype/src/source-correction-inherited-absence.json','utf8'));
const graphText=readFileSync('src/graph/data.ts','utf8');
const globalRaw=JSON.parse(readFileSync('global-evidence-workbench/ui/public/data/dataset.json','utf8'));
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const leap='legacy:relationship:d28b0cf3ca30f78d|leap|direct|bjp',sarda='legacy:relationship:95bc13ffc3aa7ef5|coal|award|sarda';
const priorHolds=['legacy:relationship:f34361dbb8642b3|adani|direct|bjp','legacy:relationship:652dbd2bc25b312f|sec182|law|adani'];
const find=(rows,id)=>rows.find(row=>row.id===id);
const jio=JSON.parse(readFileSync('src/data/jio-ownership-corrections.json','utf8')).corrections;
const progressive=JSON.parse(readFileSync('spatial-prototype/src/source-correction-progressive.json','utf8'));
const upstream=progressive.find(c=>!c.graphEligible),c040=progressive.find(c=>c.graphEligible);
const allHolds=[leap,...priorHolds,...jio.map(c=>c.relationshipId),...upstream.targetIds.filter(id=>id.includes(':relationship:'))];
const fields=id=>spatial.find(c=>c.fields[id])?.fields[id]??(c040.targetIds.includes(id)?{summary:c040.summary,title:id.includes(':relationship:')?c040.displayTitle:`${find(raw.entities,'legacy:entity:progressive').label} · ${c040.displayTitle} · ${find(raw.entities,'legacy:entity:bjp').label}`}:undefined);
test('raw canonical remains pinned; effective original registry has exactly six accepted holds and stable Sarda addresses',()=>{
 assert.equal(sha(raw),'048f89ffd008a498212ff2ac71d4413aef09b138a50ab77f336a23fec4722064');
 assert.deepEqual(Object.fromEntries(['entities','relationships','records','sources','held'].map(k=>[k,effective[k].length])),{entities:2469,relationships:4197,records:5611,sources:3314,held:316});
 assert.equal(allHolds.length,6);assert.equal(new Set(allHolds).size,6);
 assert.deepEqual(allHolds.slice().sort(),['legacy:relationship:f34361dbb8642b3|adani|direct|bjp','legacy:relationship:652dbd2bc25b312f|sec182|law|adani','legacy:relationship:d28b0cf3ca30f78d|leap|direct|bjp','legacy:relationship:4d8d2645c8158165|for:meta-platforms|own|grp:reliance','legacy:relationship:46b943139aaf3743|for:google-alphabet-|own|grp:reliance','legacy:relationship:e1f6b96bef1be1d5|tata|trust|progressive'].sort());
 assert.deepEqual(raw.relationships.filter(row=>!find(effective.relationships,row.id)).map(row=>row.id).sort(),allHolds.slice().sort());
 assert.deepEqual(raw.records.filter(row=>!find(effective.records,row.id)).map(row=>row.id).sort(),allHolds.map(id=>id.replace('relationship:','record:')).sort());
 for(const key of ['relationships','records'])for(const row of effective[key]){
   const original=find(raw[key],row.id);assert.ok(original,`No new ${key} ID: ${row.id}`);
   const qualified=fields(row.id);
   assert.deepEqual(row,qualified?{...original,summary:qualified.summary,...(key==='relationships'?{label:qualified.title}:{title:qualified.title})}:original);
 }
 for(const row of effective.entities){const original=find(raw.entities,row.id);if(row.id==='legacy:entity:adani')continue;assert.deepEqual(row,fields(row.id)?{...original,summary:fields(row.id).summary}:original);}
 assert.deepEqual(effective.sources,raw.sources);assert.deepEqual(effective.held,raw.held);
 for(const id of [leap,leap.replace('relationship:','record:')])assert.equal(api.getInvestigationItem(id.includes(':relationship:')?'relationship':'record',id),undefined);
 assert.match(find(effective.relationships,sarda).summary,/9 November 2020/);
 assert.equal(find(effective.relationships,sarda).label,'66.75% closing bid');assert.equal(find(effective.relationships,sarda).kind,'award');
 assert.equal(find(effective.relationships,sarda).fromDate,null,'No source-date field migration is silently admitted');
});
test('held claim cannot enter paths; Sarda procurement remains without a new giving relation',()=>{
 const result=api.findInvestigationPaths('legacy:entity:leap','legacy:entity:bjp',{}, {maxDepth:1});assert.ok(result.paths.every(path=>!path.relationshipIds.includes(leap)));
 assert.deepEqual(effective.relationships.filter(row=>[row.from,row.to].includes('legacy:entity:sarda')).map(row=>row.id),[sarda]);
 const graph=evaluateEffectiveGraph(graphText);assert.ok(!graph.edges.some(e=>e.s==='leap'&&e.t==='bjp'&&e.pred==='direct'));assert.ok(!graph.motifs.some(row=>row.id==='M10'));assert.ok(!graph.edges.some(e=>e.s==='adani'&&e.t==='bjp'&&e.pred==='direct'));
});
test('graph guards reject reviewed old-value, source and endpoint drift before effective use',()=>{
 for(const [before,after]of [['₹0 — no footprint','₹0 — drift'],['The ₹6,173cr silo winner has no traceable political giving','Changed ₹6,173cr silo winner has no traceable political giving'],['s:"leap", t:"bjp", pred:"direct"','s:"leap", t:"party:inc", pred:"direct"'],['s:"coal", t:"sarda", pred:"award"','s:"coal", t:"sarda", pred:"direct"'],['record 66.75% bid','record 66.76% bid'],['Never bought bonds — but Progressive','Sometimes bought bonds — but Progressive'],['https://coal.gov.in/sites/default/files/2020-12/Result-of-e-auction-for-coal-mines-under-11th-Tranche_0.pdf','https://example.com/drift']]){
  assert.ok(graphText.includes(before),before);assert.throws(()=>evaluateEffectiveGraph(graphText.replace(before,after)),/Inherited absence .* drift/,before);
 }
});
test('government response and unrelated trust stages stay exact while accepted upstream hold and c040 text-only delta remain bounded',()=>{
 const ids=['legacy:relationship:e1f6b96bef1be1d5|tata|trust|progressive','legacy:relationship:20dec4ae286c2b9a|progressive|trust|bjp','legacy:relationship:money:c039|grp:tata|trust|progressive','legacy:relationship:money:c041|progressive|direct|party:inc','legacy:relationship:money:c040|progressive|direct|bjp','legacy:relationship:505d5ae2c50aa73c|food|award|leap'];
 for(const id of ids){const original=find(raw.relationships,id);assert.ok(original,id);
  if(upstream.targetIds.includes(id)){assert.equal(find(effective.relationships,id),undefined);assert.equal(find(effective.records,id.replace('relationship:','record:')),undefined);}
  else if(c040.targetIds.includes(id)){const current=find(effective.relationships,id);assert.deepEqual(current,{...original,label:c040.displayTitle,summary:c040.summary});assert.equal(current.amounts[0].value,757.6205);}
  else assert.deepEqual(find(effective.relationships,id),original);
 }
 const counter=raw.relationships.filter(row=>row.kind==='contra'||row.kind==='denial'||row.kind==='response');assert.ok(counter.length>0);for(const row of counter)assert.deepEqual(find(effective.relationships,row.id),row);
 const graph=evaluateEffectiveGraph(graphText);const m4=graph.motifs.find(row=>row.id==='M4');assert.match(m4.innocentReading,/FCI's own answer is that restricting participation would have reduced competition/);assert.equal(graph.motifs.filter(row=>row.id==='M4').length,1);
 assert.match(find(effective.entities,'legacy:entity:adani').summary,/Denies wrongdoing\./);
});
test('global presentation/export qualifies exact targets and holds only the zero-payment endpoints',()=>{
 const before=sha(globalRaw),d=normalize(globalRaw),projected=applyInheritedAbsenceScopeCorrections(globalRaw);assert.equal(sha(globalRaw),before);
 const held=INHERITED_ABSENCE_GLOBAL_SPECS.find(s=>s.held),record=find(d.records,held.original.id);
 assert.equal(record.status,'HELD_SOURCE_SCOPE');assert.equal(record.pathEligible,false);assert.equal(record.amountOriginal,null);assert.equal(record.source,undefined);assert.equal(record.target,undefined);assert.ok(!visibleRelations(d,d.records).some(e=>e.id===record.id));
 assert.match(record.sourceScopeCorrection.notice,/superseded audit material/);assert.deepEqual(record.original,held.original.original);
 for(const spec of INHERITED_ABSENCE_GLOBAL_SPECS.filter(s=>!s.held)){
  const row=find(projected[spec.kind],spec.original.id),{sourceScopeCorrection,provenance,...rest}=row;
  assert.deepEqual(rest,Object.fromEntries(Object.entries({...spec.original,...spec.changes}).filter(([k])=>k!=='provenance')));assert.deepEqual(row.original,spec.original.original);assert.match(sourceScopeCorrection.notice,/No purchase or recipient/);
 }
 const changedIds=new Set(INHERITED_ABSENCE_GLOBAL_SPECS.map(s=>s.original.id));for(const kind of ['records','relations'])for(const row of globalRaw[kind].filter(r=>!changedIds.has(r.id)))assert.deepEqual(find(projected[kind],row.id),row);
 assert.equal(sha(globalRaw),before);
});
test('global strict source/endpoint/old value/duplicate guards reject drift and ignore unrelated IDs',()=>{
 for(const spec of INHERITED_ABSENCE_GLOBAL_SPECS)for(const field of spec.kind==='relations'?['source','target','type','label','description','sourceIds']:['summary','sourceIds']){
  const d=structuredClone(globalRaw),row=find(d[spec.kind],spec.original.id);row[field]=field==='sourceIds'?['unrelated:source']:'drift';assert.throws(()=>applyInheritedAbsenceScopeCorrections(d),/Inherited absence .* drift/,`${spec.original.id}:${field}`);
 }
 for(const spec of INHERITED_ABSENCE_GLOBAL_SPECS){const d=structuredClone(globalRaw);d[spec.kind].push(structuredClone(spec.original));assert.throws(()=>applyInheritedAbsenceScopeCorrections(d),/Inherited absence object drift/);}
 const d=structuredClone(globalRaw);find(d.sources,'india-corporate-intelligence:a7b73ce4632fc2cf').url='https://example.com/drift';assert.throws(()=>applyInheritedAbsenceScopeCorrections(d),/source drift/);
 const unrelated={...INHERITED_ABSENCE_GLOBAL_SPECS[0].original,id:'unrelated:entity'};const partial={records:[unrelated],relations:[],sources:[]};assert.equal(applyInheritedAbsenceScopeCorrections(partial),partial);
});
test('original-page JSON and Markdown exports consume the effective registry with held pins explicitly unavailable',async()=>{
 const built=await build({entryPoints:['src/components/investigation/casebookStore.ts'],bundle:true,platform:'node',format:'cjs',write:false,logLevel:'silent'}),m={exports:{}};new Function('module','exports',built.outputFiles[0].text)(m,m.exports);
 const pins=[leap,sarda,...spatial.map(c=>c.entityPresentationId)].map(id=>({kind:id.includes(':relationship:')?'relationship':'entity',id,addedAt:'2026-10-16T07:00:00Z',note:''}));
 const packet=m.exports.buildCasebookPacket({...m.exports.emptyCasebook(),pins},effective),md=m.exports.casebookMarkdown(packet);
 assert.deepEqual(packet.unavailablePins.map(p=>p.id),[leap]);assert.ok(!packet.relationships.some(row=>row.id===leap));
 assert.equal(packet.relationships.find(row=>row.id===sarda).label,'66.75% closing bid');assert.match(md,/9 November 2020/);assert.doesNotMatch(md,/ZERO political footprint|paid nothing|winner who didn't pay|gave no donations|Never bought bonds|never bought bonds|₹0 — no footprint/);
});
