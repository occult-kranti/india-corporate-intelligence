import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {loadEffectiveGraph,evaluateEffectiveGraph} from './lib/load-effective-graph.mjs';
import {normalize,visibleRelations,applyDisclosureScopeCorrection,applyInheritedAbsenceScopeCorrections} from '../global-evidence-workbench/ui/src/model.js';
const root=new URL('../',import.meta.url);
const bundle=await build({entryPoints:[new URL('src/data/investigation.ts',root).pathname],bundle:true,platform:'node',format:'cjs',write:false,logLevel:'silent'});
const module={exports:{}};new Function('module','exports',bundle.outputFiles[0].text)(module,module.exports);
const api=module.exports,normal=api.getInvestigationRegistry(),audit=api.buildRetainedInvestigationRegistry();
const targets=['legacy:relationship:f34361dbb8642b3|adani|direct|bjp','legacy:relationship:652dbd2bc25b312f|sec182|law|adani'];
const inherited=JSON.parse(readFileSync(new URL('spatial-prototype/src/source-correction-inherited-absence.json',root),'utf8'));
const leap='legacy:relationship:d28b0cf3ca30f78d|leap|direct|bjp';
const jio=JSON.parse(readFileSync(new URL('src/data/jio-ownership-corrections.json',root),'utf8')).corrections;
const progressive=JSON.parse(readFileSync(new URL('spatial-prototype/src/source-correction-progressive.json',root),'utf8'));
const upstream=progressive.find(c=>!c.graphEligible),c040=progressive.find(c=>c.graphEligible);
const allTargets=[...targets,leap,...jio.map(c=>c.relationshipId),...upstream.targetIds.filter(id=>id.includes(':relationship:'))];
const globalTargets=['india-corporate-intelligence:edge-e7605f62f7476da5f3e1','india-corporate-intelligence:edge-b3d60e32fb42932af025'];
const raw=JSON.parse(readFileSync(new URL('global-evidence-workbench/ui/public/data/dataset.json',root),'utf8'));
const sha=d=>createHash('sha256').update(JSON.stringify(d)).digest('hex');
test('audit builder retains immutable canonical registry; normal builder and indexes exclude both exact claims',()=>{
 assert.equal(sha(audit),'048f89ffd008a498212ff2ac71d4413aef09b138a50ab77f336a23fec4722064');
 assert.equal(allTargets.length,6);assert.equal(new Set(allTargets).size,6);
 assert.deepEqual(allTargets.slice().sort(),['legacy:relationship:f34361dbb8642b3|adani|direct|bjp','legacy:relationship:652dbd2bc25b312f|sec182|law|adani','legacy:relationship:d28b0cf3ca30f78d|leap|direct|bjp','legacy:relationship:4d8d2645c8158165|for:meta-platforms|own|grp:reliance','legacy:relationship:46b943139aaf3743|for:google-alphabet-|own|grp:reliance','legacy:relationship:e1f6b96bef1be1d5|tata|trust|progressive'].sort());
 assert.equal(audit.relationships.length-normal.relationships.length,6);assert.equal(audit.records.length-normal.records.length,6);
 assert.deepEqual(audit.relationships.filter(r=>!normal.relationships.some(row=>row.id===r.id)).map(r=>r.id).sort(),[...allTargets].sort());
 assert.deepEqual(audit.records.filter(r=>!normal.records.some(row=>row.id===r.id)).map(r=>r.id).sort(),allTargets.map(id=>id.replace('relationship:','record:')).sort());
 for(const id of targets){assert.ok(audit.relationships.some(r=>r.id===id));assert.ok(!normal.relationships.some(r=>r.id===id));assert.equal(api.getInvestigationItem('relationship',id),undefined);}
 assert.deepEqual(normal.relationships,audit.relationships.filter(r=>!allTargets.includes(r.id)).map(r=>{const fields=inherited.find(c=>c.fields[r.id])?.fields[r.id];return fields?{...r,label:fields.title,summary:fields.summary}:c040.targetIds.includes(r.id)?{...r,label:c040.displayTitle,summary:c040.summary}:r;}));
 const before=sha(normal);api.buildRetainedInvestigationRegistry();assert.equal(sha(api.getInvestigationRegistry()),before);
 assert.match(normal.entities.find(r=>r.id==='legacy:entity:adani').summary,/Denies wrongdoing\./);
});
test('normal path admission does not use either held relationship',()=>{
 for(const [from,to]of [['legacy:entity:adani','legacy:entity:bjp'],['legacy:entity:sec182','legacy:entity:adani']]){
  const result=api.findInvestigationPaths(from,to,{}, {maxDepth:1});assert.ok(result.paths.every(p=>p.relationshipIds.every(id=>!targets.includes(id))));
 }
});
test('effective loader evaluates presentation exports and fails closed',()=>{
 const graph=loadEffectiveGraph(new URL('src/graph/data.ts',root));
 assert.ok(!graph.edges.some(e=>e.s==='adani'&&e.t==='bjp'&&e.pred==='direct'));
 assert.ok(!graph.edges.some(e=>e.s==='sec182'&&e.t==='adani'&&e.pred==='law'));
 assert.ok(!graph.motifs.some(m=>m.id==='M10'));
 assert.throws(()=>evaluateEffectiveGraph('export const RAW_ATLAS_NODES=[];'),/Missing effective array export/);
 assert.throws(()=>evaluateEffectiveGraph("import {x} from './unknown';export const NODES=x;"),/require is not defined/);
});
test('global views hold both records, preserve snapshot and denial, and exclude both from relations',()=>{
 const before=JSON.stringify(raw),d=normalize(raw);
 assert.equal(JSON.stringify(raw),before);
 for(const id of globalTargets){const r=d.records.find(r=>r.id===id);assert.ok(r);assert.equal(r.status,'HELD_SOURCE_SCOPE');assert.equal(r.pathEligible,false);assert.equal(r.amountOriginal,null);assert.equal(r.source,undefined);assert.equal(r.target,undefined);assert.ok(!visibleRelations(d,d.records).some(e=>e.id===id));}
 assert.deepEqual(d.relations,applyInheritedAbsenceScopeCorrections(raw).relations.filter(e=>![...globalTargets,'india-corporate-intelligence:edge-290870791c720e40b543'].includes(e.id)));
 assert.match(d.records.find(r=>r.id==='india-corporate-intelligence:adani').summary,/\nDenies wrongdoing\.\n/);
});
test('disclosure selector requires exact source and claim identity',()=>{
 for(const field of ['id','source','target','type','label','description']){const x=structuredClone(raw),e=x.relations.find(e=>e.id===globalTargets[1]);e[field]='different';assert.ok(applyDisclosureScopeCorrection(x).relations.includes(e));}
 const x=structuredClone(raw);x.sources.find(s=>s.id==='india-corporate-intelligence:24f8ed8219f004a0').url='https://example.com/other';assert.equal(applyDisclosureScopeCorrection(x),x);
});
test('runtime money-trail audit uses corrected projection while all five authored trails and raw snapshot stay pinned',()=>{
 const receipt=JSON.parse(readFileSync(new URL('research/money-trails/cross-source-audit.json',root),'utf8'));
 assert.deepEqual(receipt.registry,{entities:2469,relationships:4197,records:5611,sources:3314});
 const projection=normal.relationships.map(({id,from,to,kind,sourceIds})=>({id,from,to,kind,sourceIds}));
 assert.equal(receipt.relationshipProjectionSha256,sha(projection));
 assert.equal(receipt.relationshipProjectionSha256,'eefd91de4272f8b947c2691767e67b7a7c90848f3cb9067d879836dd853e5f48');
 assert.equal(receipt.trails.length,5);
 assert.equal(sha(receipt.trails),'fc48197881a4d6efe1fb7065495d7e846deee7650568873871046561108d758e');
 assert.equal(sha(audit),'048f89ffd008a498212ff2ac71d4413aef09b138a50ab77f336a23fec4722064');
});
