import test,{after} from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {pathToFileURL} from 'node:url';import {createHash} from 'node:crypto';import {build} from 'esbuild';import {loadOriginalRegistry} from './original-registry.mjs';
const tmp=await mkdtemp(join(tmpdir(),'absence-correction-'));after(()=>rm(tmp,{recursive:true,force:true}));
async function load(path,name){const outfile=join(tmp,name+'.mjs');await build({entryPoints:[path],outfile,bundle:true,platform:'node',format:'esm',logLevel:'silent'});return import(pathToFileURL(outfile).href);}
const c=await load('src/sourceCorrections.ts','corrections'),model=await load('src/model.ts','model'),geo=await load('src/geography.ts','geography'),narration=await load('src/narrationTranscript.ts','narration'),book=await load('src/casebookWithCorrections.ts','book');
const raw=await loadOriginalRegistry(),hash=()=>createHash('sha256').update(JSON.stringify(raw)).digest('hex'),before=hash(),scene=model.buildEvidenceScene(raw),factual=model.factualScene(scene);
const entries=c.INHERITED_ABSENCE_CORRECTIONS,leap=entries.find(row=>row.subjectLabel==='Leap India'),sarda=entries.find(row=>row.subjectLabel==='Sarda Energy');
const additionalHolds=[...c.JIO_HOLD_CORRECTIONS,...c.PROGRESSIVE_CORRECTIONS.filter(entry=>!entry.graphEligible)],c040=c.PROGRESSIVE_CORRECTIONS.find(entry=>entry.graphEligible),upstream=c.PROGRESSIVE_CORRECTIONS.find(entry=>!entry.graphEligible);
const allHoldIds=[...leap.targetIds,...c.SOURCE_CORRECTION.targetIds,...c.SECTION182_CORRECTION.targetIds,...additionalHolds.flatMap(entry=>entry.targetIds)];
const all=[...raw.entities,...raw.relationships,...raw.records],item=id=>all.find(row=>row.id===id);
const makeBook=ids=>({version:1,title:'Inherited source scope',question:'',falsifier:'',pins:ids.map(id=>({kind:id.includes(':relationship:')?'relationship':id.includes(':record:')?'record':'entity',id,addedAt:'2026-10-16T07:00:00Z',note:''})),views:[]});
test('immutable raw data survives; exactly six accepted correction pairs are held',()=>{
 assert.equal(before,'048f89ffd008a498212ff2ac71d4413aef09b138a50ab77f336a23fec4722064');assert.equal(scene.registry,raw);assert.equal(scene.nodes.length,8086);assert.equal(scene.edges.length,4203);assert.equal(raw.held.length,316);
 assert.equal(factual.nodes.length,7853);assert.equal(factual.edges.length,4197);const geographic=geo.getGeographicScene(factual);assert.equal(geographic.nodes.length,3856);assert.equal(geographic.unplacedNodes.length,3997);
 assert.equal(allHoldIds.length,12);assert.equal(new Set(allHoldIds).size,12);
 const originallyEligibleNodes=scene.nodes.filter(node=>!raw.held.some(row=>row.id===node.id)&&node.item.status!=='not-drawn');
 const originallyEligibleEdges=scene.edges.filter(edge=>!raw.held.some(row=>row.id===edge.id)&&edge.relationship.status!=='not-drawn');
 assert.deepEqual(originallyEligibleNodes.filter(node=>!factual.nodes.includes(node)).map(node=>node.id).sort(),allHoldIds.filter(id=>id.includes(':record:')).sort());
 assert.deepEqual(originallyEligibleEdges.filter(edge=>!factual.edges.includes(edge)).map(edge=>edge.id).sort(),allHoldIds.filter(id=>id.includes(':relationship:')).sort());
 for(const id of allHoldIds){assert.equal(model.isHeldItem(raw,id),true);assert.ok(!factual.nodes.some(row=>row.id===id));assert.ok(!factual.edges.some(row=>row.id===id));assert.ok(!geographic.edges.some(row=>row.id===id));}
 for(const id of sarda.targetIds){assert.equal(model.isHeldItem(raw,id),false);assert.ok([...factual.nodes,...factual.edges].some(row=>row.id===id));}
 for(const entry of entries){assert.equal(model.isHeldItem(raw,entry.entityPresentationId),false);assert.equal(entry.amount,null);for(const finding of entry.findings)assert.match(finding,/^Does not establish: /,'Negation must survive the adapter');}
 assert.equal(hash(),before);
});
test('reader titles, summaries, search and narration carry only qualified effective prose',()=>{
 for(const entry of entries)for(const original of entry.expectedItems){const row=item(original.id);assert.deepEqual(row,original);const text=c.presentationSummary(row);assert.equal(text,entry.fields[row.id].summary);assert.doesNotMatch(text,/ZERO political footprint|paid nothing|winner who didn't pay|gave no donations|Never bought bonds|never bought bonds/);assert.doesNotMatch(narration.buildNarrationTranscript(row,model.isHeldItem(raw,row.id)),/ZERO political footprint|paid nothing|winner who didn't pay|gave no donations|Never bought bonds|never bought bonds/);}
 assert.equal(c.presentationTitle(item(leap.targetIds[0])),'Leap India · Political donation history unverified');assert.doesNotMatch(c.presentationTitle(item(leap.targetIds[1])),/BJP|₹0/);
 for(const id of sarda.targetIds){assert.match(c.presentationTitle(item(id)),/66\.75% closing bid/);assert.match(c.presentationSummary(item(id)),/9 November 2020/);assert.equal(c.presentationTier(item(id)),item(id).tier);}
 assert.ok(model.filterScene(factual,{query:'66.75% closing bid'}).edges.some(row=>row.id===sarda.targetIds[0]));assert.ok(!model.filterScene(factual,{query:'gave no donations'}).edges.some(row=>row.id===sarda.targetIds[0]));
 assert.equal(hash(),before);
});
test('spatial JSON is raw audit plus exact sidecars; Markdown qualifies texts and retains Sarda procurement status',()=>{
 const ids=entries.flatMap(entry=>[entry.entityPresentationId,...entry.targetIds]),packet=book.buildCasebookPacket(makeBook(ids),raw);
 assert.equal(packet.sourceCorrections.length,4);
 for(const key of ['entities','relationships','records'])for(const row of packet[key])assert.deepEqual(row,item(row.id));
 assert.equal(packet.relationships.find(row=>row.id===sarda.targetIds[0]).kind,'award');assert.equal(packet.relationships.find(row=>row.id===sarda.targetIds[0]).status,'retained-claim');
 assert.ok(packet.sourceCorrections.find(row=>row.id===leap.id).graphEligible===false);assert.ok(packet.sourceCorrections.find(row=>row.id===sarda.id).graphEligible===true);
 const md=book.casebookMarkdown(packet);assert.match(md,/SOURCE-SCOPE CORRECTION/);assert.match(md,/66\.75% closing bid/);assert.match(md,/9 November 2020/);assert.doesNotMatch(md,/ZERO political footprint|paid nothing|winner who didn't pay|gave no donations|Never bought bonds|never bought bonds|₹0 — no footprint/);
 assert.match(md,/Type: award/);assert.match(md,/Status: retained-claim/);assert.equal(hash(),before);
});
test('strict item, endpoint, source, duplicate and post-read mutation guards fail before map/export use',()=>{
 for(const entry of entries)for(const expected of entry.expectedItems){const clone=structuredClone(raw);let row=[...clone.entities,...clone.relationships,...clone.records].find(row=>row.id===expected.id);row.summary+=' drift';assert.throws(()=>model.buildEvidenceScene(clone),/Inherited absence object drift/);assert.throws(()=>book.buildCasebookPacket(makeBook([row.id]),clone),/Inherited absence object drift/);}
 for(const field of ['from','to','kind','label','sourceIds']){const clone=structuredClone(raw),row=clone.relationships.find(row=>row.id===leap.targetIds[0]);row[field]=field==='sourceIds'?['unrelated:source']:'drift';assert.throws(()=>model.buildEvidenceScene(clone),/Inherited absence object drift/);}
 for(const entry of entries){const clone=structuredClone(raw);clone.sources.find(row=>row.id===entry.sourceId).url='https://example.com/drift';assert.throws(()=>model.buildEvidenceScene(clone),/Inherited absence source drift/);}
 const clone=structuredClone(raw),parsed=model.buildEvidenceScene(clone);clone.records.find(row=>row.id===leap.targetIds[1]).summary+=' drift';assert.throws(()=>model.factualScene(parsed),/Inherited absence object drift/);
 const duplicated=structuredClone(raw);duplicated.records.push({...item(leap.targetIds[1])});assert.throws(()=>model.buildEvidenceScene(duplicated),/duplicate target/);
});
test('unrelated prose and trust stages stay exact; accepted upstream hold and c040 text-only qualification preserve raw amounts',()=>{
 const unrelated={...item(leap.targetIds[1]),id:'unrelated:record'};assert.equal(c.presentationSummary(unrelated),unrelated.summary);assert.equal(c.sourceCorrection(unrelated.id),null);
 for(const id of ['legacy:relationship:money:c040|progressive|direct|bjp','legacy:relationship:e1f6b96bef1be1d5|tata|trust|progressive','legacy:relationship:money:c041|progressive|direct|party:inc','legacy:relationship:505d5ae2c50aa73c|food|award|leap']){const row=item(id);assert.ok(row);
  if(c040.targetIds.includes(id)){assert.equal(c.presentationSummary(row),c040.summary);assert.equal(c.presentationTitle(row),c040.displayTitle);assert.deepEqual(c.presentationCorrection(id),c040);assert.equal(c.sourceCorrection(id),null);assert.equal(row.amounts[0].value,757.6205);assert.deepEqual(row,c040.expectedItems.find(expected=>expected.id===id));assert.ok(factual.edges.some(edge=>edge.id===id));}
  else if(upstream.targetIds.includes(id)){assert.equal(c.presentationSummary(row),upstream.summary);assert.deepEqual(c.presentationCorrection(id),upstream);assert.deepEqual(c.sourceCorrection(id),upstream);assert.deepEqual(row,upstream.expectedItems.find(expected=>expected.id===id));assert.ok(!factual.edges.some(edge=>edge.id===id));}
  else {assert.equal(c.presentationSummary(row),row.summary);assert.equal(c.presentationCorrection(id),null);assert.ok(factual.edges.some(edge=>edge.id===id));}
 }
 assert.equal(hash(),before);
});
test('Sarda UI keeps directed procurement context and distinguishes text qualification from a hold',async()=>{
 const app=await readFile('src/App.tsx','utf8');assert.ok(app.includes('inspectionEdge && (!inspectionCorrection || inspectionCorrection.graphEligible)'));assert.ok(app.includes('inspectionCorrection && !inspectionCorrection.graphEligible'));
 const correctionCode=await readFile('src/sourceCorrections.ts','utf8');assert.match(correctionCode,/!row.graphEligible&&row.targetIds.includes/);
});
test('CI rendered scenarios cover both input classes, exact selection readiness and raw export boundaries without local launch',async()=>{
 const code=await readFile('scripts/inherited-absence-browser.mjs','utf8'),harness=await readFile('scripts/source-correction-browser.mjs','utf8');assert.match(harness,/await runInheritedAbsenceBrowserCases/);
 for(const text of ['30-inherited-absence-reader-and-export','31-inherited-absence-mobile-reading','entry.fields[id].summary','packet.sourceCorrections','fullRegistry[key]','touch:true','reducedMotion:true','data-held-warning','relationship-route'])assert.ok(code.includes(text),text);
 assert.match(code,/process.env.GITHUB_ACTIONS,'true'/);assert.doesNotMatch(code,/chromium\.launch|browserType\.launch/);
});
