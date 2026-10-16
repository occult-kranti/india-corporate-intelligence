import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';import {build} from 'esbuild';
import {normalize,visibleRelations,applyProgressiveUpstreamScopeCorrection,PROGRESSIVE_UPSTREAM_GLOBAL_EXPECTED} from '../global-evidence-workbench/ui/src/model.js';
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
async function load(path,plugins=[]){const bundle=await build({entryPoints:[path],bundle:true,platform:'node',format:'cjs',write:false,logLevel:'silent',plugins});const m={exports:{}};new Function('module','exports',bundle.outputFiles[0].text)(m,m.exports);return m.exports;}
const loadEnergyFixture=mutation=>load('src/graph/energyEffective.ts',[{name:'energy-empty-boundary-fixture',setup(builder){
 builder.onLoad({filter:/\/energy\.generated\.ts$/},({path})=>({contents:readFileSync(path,'utf8')+'\n'+mutation,loader:'ts'}));
}}]);
const api=await load('src/data/investigation.ts'),graph=await load('src/graph/data.ts'),energy=await load('src/graph/energy.generated.ts'),display=await load('src/graph/energyEffective.ts');
const raw=api.buildRetainedInvestigationRegistry(),effective=api.getInvestigationRegistry(),upstream='legacy:relationship:e1f6b96bef1be1d5|tata|trust|progressive',c040='legacy:relationship:money:c040|progressive|direct|bjp',overlap='legacy:relationship:20dec4ae286c2b9a|progressive|trust|bjp';
const find=(rows,id)=>rows.find(row=>row.id===id),before=sha(raw),rawGlobal=JSON.parse(readFileSync('global-evidence-workbench/ui/public/data/dataset.json','utf8'));
test('retained registry stays canonical; unsupported upstream edge and mirror cannot enter effective graph or money paths',()=>{
 assert.equal(before,'048f89ffd008a498212ff2ac71d4413aef09b138a50ab77f336a23fec4722064');
 assert.ok(find(raw.relationships,upstream));assert.ok(!find(effective.relationships,upstream));assert.ok(!find(effective.records,upstream.replace('relationship:','record:')));
 assert.ok(!graph.EDGES.some(e=>e.s==='tata'&&e.t==='progressive'&&e.pred==='trust'));assert.ok(graph.RAW_ATLAS_EDGES.some(e=>e.s==='tata'&&e.t==='progressive'&&e.a===757.6));
 assert.ok(api.findInvestigationPaths('legacy:entity:tata','legacy:entity:progressive',{}, {maxDepth:1}).paths.every(p=>!p.relationshipIds.includes(upstream)));
 assert.equal(sha(api.buildRetainedInvestigationRegistry()),before);
});
test('c040 effective prose withdraws exact unsupported parenthetical and chronology without changing amounts, dates or source closure',()=>{
 for(const kind of ['relationships','records']){const id=kind==='relationships'?c040:c040.replace('relationship:','record:'),original=find(raw[kind],id),current=find(effective[kind],id);assert.ok(current);
  const key=kind==='relationships'?'label':'title';const {summary:s0,[key]:t0,...rest0}=original,{summary:s1,[key]:t1,...rest1}=current;assert.deepEqual(rest1,rest0);
  assert.equal(s1,display.PROGRESSIVE_REPORTED_SUMMARY);assert.match(t1,/reported FY2024–25 donation/);assert.doesNotMatch(t1+s1,/834\.97|two donations|in April 2024|weeks after|44,203/);assert.match(s1,/not been independently verified/);assert.match(s1,/does not establish company-to-party earmarking or causation/);assert.equal(current.amounts[0].value,757.6205);
 }
 const changed=display.ENERGY_EDGES.filter((e,i)=>JSON.stringify(e)!==JSON.stringify(energy.ENERGY_EDGES[i]));assert.deepEqual(changed.map(e=>e.id),['money:c040']);assert.equal(display.ENERGY_EDGES.length,energy.ENERGY_EDGES.length);assert.equal(sha(raw),before);
});
test('other recipients, upstream aggregate and overlapping onward representation remain byte-equivalent',()=>{
 for(const id of ['legacy:relationship:money:c039|grp:tata|trust|progressive','legacy:relationship:money:c041|progressive|direct|party:inc',overlap])for(const kind of ['relationships','records']){const key=kind==='relationships'?id:id.replace('relationship:','record:');assert.deepEqual(find(effective[kind],key),find(raw[kind],key));}
 assert.ok(find(effective.relationships,c040));assert.ok(find(effective.relationships,overlap));
});
test('upstream and c040 exact object/source guards fail on every changed field, missing target and duplicate',()=>{
 for(const key of Object.keys(graph.PROGRESSIVE_UPSTREAM_EXPECTED)){const input=structuredClone(graph.RAW_ATLAS_EDGES),row=input.find(e=>e.s==='tata'&&e.t==='progressive'&&e.pred==='trust');row[key]='drift';assert.throws(()=>graph.holdProgressiveUpstream(input),/Progressive upstream object\/source drift/,key);}
 for(const key of Object.keys(energy.ENERGY_EDGES.find(e=>e.id==='money:c040'))){const input=structuredClone(energy.ENERGY_EDGES),row=input.find(e=>e.id==='money:c040');row[key]='drift';assert.throws(()=>display.qualifyProgressiveEnergyEdges(input),/Progressive c040 object\/source drift/,key);}
 assert.throws(()=>display.qualifyProgressiveEnergyEdges(energy.ENERGY_EDGES.filter(e=>e.id!=='money:c040')),/drift/);
 assert.throws(()=>display.qualifyProgressiveEnergyEdges([...energy.ENERGY_EDGES,energy.ENERGY_EDGES.find(e=>e.id==='money:c040')]),/drift/);
 assert.throws(()=>graph.holdProgressiveUpstream(graph.RAW_ATLAS_EDGES.filter(e=>!(e.s==='tata'&&e.t==='progressive'&&e.pred==='trust'))),/drift/);
});
test('declared empty optional energy fleet skips only the projection, preserving the strict c040 guard',async()=>{
 const empty=await loadEnergyFixture('ENERGY_META.empty=true; ENERGY_NODES.length=0; ENERGY_EDGES.length=0;');
 assert.equal(empty.ENERGY_META.fleet,'energy');assert.equal(empty.ENERGY_META.empty,true);
 assert.deepEqual(empty.ENERGY_NODES,[]);assert.deepEqual(empty.ENERGY_EDGES,[]);
 assert.throws(()=>empty.qualifyProgressiveEnergyEdges([]),/Progressive c040 object\/source drift/);
 assert.throws(()=>display.qualifyProgressiveEnergyEdges([]),/Progressive c040 object\/source drift/);
});
test('empty metadata never bypasses c040 checks for undeclared, partial, missing, duplicate or drifted inputs',async()=>{
 const absent='ENERGY_NODES.length=0; ENERGY_EDGES.length=0;';
 for(const [name,mutation] of [
  ['undeclared empty',absent],
  ['missing declaration',absent+' delete ENERGY_META.empty;'],
  ['nonboolean declaration',absent+' ENERGY_META.empty="true";'],
  ['wrong fleet',absent+' ENERGY_META.empty=true; ENERGY_META.fleet="finance";'],
  ['nodes remain','ENERGY_META.empty=true; ENERGY_EDGES.length=0;'],
  ['nonempty missing c040','ENERGY_META.empty=true; ENERGY_EDGES.splice(ENERGY_EDGES.findIndex(row=>row.id==="money:c040"),1);'],
  ['duplicate c040','ENERGY_META.empty=true; ENERGY_EDGES.push(ENERGY_EDGES.find(row=>row.id==="money:c040"));'],
  ['drifted c040','ENERGY_META.empty=true; ENERGY_EDGES.find(row=>row.id==="money:c040").a=0;'],
 ])await assert.rejects(loadEnergyFixture(mutation),/Progressive c040 object\/source drift/,name);
});
test('global counterpart becomes a numeric/path-ineligible reader row; raw data and unaffected rows remain exact',()=>{
 const hash=sha(rawGlobal),expected=PROGRESSIVE_UPSTREAM_GLOBAL_EXPECTED,result=applyProgressiveUpstreamScopeCorrection(rawGlobal),held=find(result.records,expected.id);
 assert.equal(sha(rawGlobal),hash);assert.ok(!result.relations.some(e=>e.id===expected.id));assert.equal(held.pathEligible,false);assert.equal(held.amountOriginal,null);assert.equal(held.amountAggregable,false);assert.equal(held.source,undefined);assert.equal(held.target,undefined);assert.deepEqual(held.original,expected.original);assert.deepEqual(held.sourceIds,expected.sourceIds);assert.match(held.summary,/does not establish the upstream amount/);
 for(const key of ['records','relations'])for(const row of rawGlobal[key].filter(r=>r.id!==expected.id))assert.deepEqual(find(result[key],row.id),row);
 const normalized=normalize(rawGlobal);assert.ok(!visibleRelations(normalized,normalized.records).some(e=>e.id===expected.id));assert.equal(sha(rawGlobal),hash);
});
test('global counterpart rejects changed old values, endpoints, closures, duplicates and source bodies',()=>{
 const id=PROGRESSIVE_UPSTREAM_GLOBAL_EXPECTED.id;
 for(const key of Object.keys(PROGRESSIVE_UPSTREAM_GLOBAL_EXPECTED)){const d=structuredClone(rawGlobal);find(d.relations,id)[key]='drift';assert.throws(()=>applyProgressiveUpstreamScopeCorrection(d),/Progressive upstream global object drift/,key);}
 const d=structuredClone(rawGlobal);d.sources.find(s=>s.id===PROGRESSIVE_UPSTREAM_GLOBAL_EXPECTED.sourceIds[0]).url='https://example.com/drift';assert.throws(()=>applyProgressiveUpstreamScopeCorrection(d),/source drift/);
 const duplicate=structuredClone(rawGlobal);duplicate.relations.push(structuredClone(PROGRESSIVE_UPSTREAM_GLOBAL_EXPECTED));assert.throws(()=>applyProgressiveUpstreamScopeCorrection(duplicate),/object drift/);
});
test('effective import boundaries cover original graphs and energy view; only retained registry selects raw inputs',()=>{
 const context=readFileSync('src/context/DataContext.tsx','utf8'),energyView=readFileSync('src/data/energy.ts','utf8'),registry=readFileSync('src/data/investigation.ts','utf8'),political=readFileSync('src/pages/PoliticalView.tsx','utf8');
 assert.match(context,/from '\.\.\/graph\/energyEffective'/);assert.match(energyView,/from '\.\.\/graph\/energyEffective'/);
 assert.match(registry,/buildInvestigationRegistryFromAtlas\(NODES,EDGES,buildNationalGraph\(\),ENERGY_EDGES\)/);assert.match(registry,/buildInvestigationRegistryFromAtlas\(RAW_ATLAS_NODES,RAW_ATLAS_EDGES,buildRetainedNationalGraph\(\),RETAINED_ENERGY_EDGES\)/);
 assert.match(political,/import \{ NODES, EDGES \} from '\.\.\/graph\/data'/);assert.doesNotMatch(political,/RAW_ATLAS|energy\.generated|energyEffective/);
 assert.match(readFileSync('src/components/investigation/casebookStore.ts','utf8'),/do not add without a shared accounting basis/);
});

test('accepted relation aliases cannot retain an uncorrected upstream mirror or lose unrelated rows',()=>{
 const target=PROGRESSIVE_UPSTREAM_GLOBAL_EXPECTED,source=rawGlobal.sources.find(s=>s.id===target.sourceIds[0]),other={id:'unrelated',source:'a',target:'b',label:'Unrelated',sourceIds:[]};
 for(const aliases of [['edges'],['relations'],['relations','edges']]){
  const input={sources:[structuredClone(source)]};for(const key of aliases)input[key]=[structuredClone(target),structuredClone(other)];
  const before=JSON.stringify(input),corrected=applyProgressiveUpstreamScopeCorrection(input);assert.equal(JSON.stringify(input),before);
  for(const key of aliases)assert.deepEqual(corrected[key],[other]);
  if(!aliases.includes('relations'))assert.equal(corrected.relations,undefined,'do not hide unmodified edge-alias rows behind an added empty relation array');
  const normalized=normalize(input);assert.ok(normalized.relations.some(e=>e.id==='unrelated'));assert.ok(!normalized.relations.some(e=>e.id===target.id));
  const held=normalized.records.find(r=>r.id===target.id);assert.equal(held.amountOriginal,null);assert.equal(held.pathEligible,false);assert.equal(held.source,undefined);assert.doesNotMatch(held.label,/757/);
 }
 const mirror={relations:[structuredClone(target)],edges:[structuredClone(target)],sources:[structuredClone(source)]};mirror.edges[0].amountOriginal=915;assert.throws(()=>applyProgressiveUpstreamScopeCorrection(mirror),/object drift/);
 const duplicate={edges:[structuredClone(target),structuredClone(target)],sources:[structuredClone(source)]};assert.throws(()=>applyProgressiveUpstreamScopeCorrection(duplicate),/object drift/);
});

test('record/event aliases preserve unrelated effective readers and reject drifted mirrors',()=>{
 const target=PROGRESSIVE_UPSTREAM_GLOBAL_EXPECTED,source=rawGlobal.sources.find(s=>s.id===target.sourceIds[0]),other={id:'event-other',label:'Unrelated event',summary:'Unchanged',sourceIds:[]};
 for(const key of ['records','events']){
  const input={[key]:[structuredClone(other),structuredClone(target)],sources:[structuredClone(source)]},before=JSON.stringify(input);
  const corrected=applyProgressiveUpstreamScopeCorrection(input),normalized=normalize(input);assert.equal(JSON.stringify(input),before);
  assert.deepEqual(corrected.records.find(r=>r.id===other.id),other);assert.equal(corrected.records.find(r=>r.id===target.id).amountOriginal,null);
  assert.ok(normalized.records.some(r=>r.id===other.id));assert.equal(normalized.records.find(r=>r.id===target.id).pathEligible,false);
  if(key==='events')assert.equal(corrected.events.find(r=>r.id===target.id).amountOriginal,null);
  const duplicate=structuredClone(input);duplicate[key].push(structuredClone(target));assert.throws(()=>applyProgressiveUpstreamScopeCorrection(duplicate),/object drift/);
 }
 const mixed={relations:[structuredClone(target)],events:[structuredClone(other)],sources:[structuredClone(source)]};assert.ok(normalize(mixed).records.some(r=>r.id===other.id));
 mixed.events.push({...target,amountOriginal:915});assert.throws(()=>applyProgressiveUpstreamScopeCorrection(mixed),/object drift/);
});
