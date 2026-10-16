import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {loadEffectiveGraph,evaluateEffectiveGraph} from './lib/load-effective-graph.mjs';
import {normalize,visibleRelations,applyDisclosureScopeCorrection} from '../global-evidence-workbench/ui/src/model.js';
const root=new URL('../',import.meta.url);
const bundle=await build({entryPoints:[new URL('src/data/investigation.ts',root).pathname],bundle:true,platform:'node',format:'cjs',write:false,logLevel:'silent'});
const module={exports:{}};new Function('module','exports',bundle.outputFiles[0].text)(module,module.exports);
const api=module.exports,normal=api.getInvestigationRegistry(),audit=api.buildRetainedInvestigationRegistry();
const targets=['legacy:relationship:f34361dbb8642b3|adani|direct|bjp','legacy:relationship:652dbd2bc25b312f|sec182|law|adani'];
const globalTargets=['india-corporate-intelligence:edge-e7605f62f7476da5f3e1','india-corporate-intelligence:edge-b3d60e32fb42932af025'];
const raw=JSON.parse(readFileSync(new URL('global-evidence-workbench/ui/public/data/dataset.json',root),'utf8'));
const sha=d=>createHash('sha256').update(JSON.stringify(d)).digest('hex');
test('audit builder retains immutable canonical registry; normal builder and indexes exclude both exact claims',()=>{
 assert.equal(sha(audit),'048f89ffd008a498212ff2ac71d4413aef09b138a50ab77f336a23fec4722064');
 assert.equal(audit.relationships.length-normal.relationships.length,2);assert.equal(audit.records.length-normal.records.length,2);
 for(const id of targets){assert.ok(audit.relationships.some(r=>r.id===id));assert.ok(!normal.relationships.some(r=>r.id===id));assert.equal(api.getInvestigationItem('relationship',id),undefined);}
 assert.deepEqual(normal.relationships,audit.relationships.filter(r=>!targets.includes(r.id)));
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
 assert.deepEqual(d.relations,raw.relations.filter(e=>!globalTargets.includes(e.id)));
 assert.match(d.records.find(r=>r.id==='india-corporate-intelligence:adani').summary,/\nDenies wrongdoing\.\n/);
});
test('disclosure selector requires exact source and claim identity',()=>{
 for(const field of ['id','source','target','type','label','description']){const x=structuredClone(raw),e=x.relations.find(e=>e.id===globalTargets[1]);e[field]='different';assert.ok(applyDisclosureScopeCorrection(x).relations.includes(e));}
 const x=structuredClone(raw);x.sources.find(s=>s.id==='india-corporate-intelligence:24f8ed8219f004a0').url='https://example.com/other';assert.equal(applyDisclosureScopeCorrection(x),x);
});
test('runtime money-trail audit uses corrected projection while all five authored trails and raw snapshot stay pinned',()=>{
 const receipt=JSON.parse(readFileSync(new URL('research/money-trails/cross-source-audit.json',root),'utf8'));
 assert.deepEqual(receipt.registry,{entities:2469,relationships:4201,records:5615,sources:3314});
 const projection=normal.relationships.map(({id,from,to,kind,sourceIds})=>({id,from,to,kind,sourceIds}));
 assert.equal(receipt.relationshipProjectionSha256,sha(projection));
 assert.equal(receipt.relationshipProjectionSha256,'77e42b6970651f4073b68ad3e03830f66172a5601cf366c1893c690f33482747');
 assert.equal(receipt.trails.length,5);
 assert.equal(sha(receipt.trails),'fc48197881a4d6efe1fb7065495d7e846deee7650568873871046561108d758e');
 assert.equal(sha(audit),'048f89ffd008a498212ff2ac71d4413aef09b138a50ab77f336a23fec4722064');
});
