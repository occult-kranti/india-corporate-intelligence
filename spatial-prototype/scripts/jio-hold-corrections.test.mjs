import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {loadOriginalRegistry} from './original-registry.mjs';
const tmp=await mkdtemp(join(tmpdir(),'jio-hold-'));after(()=>rm(tmp,{recursive:true,force:true}));
async function load(file,name){const outfile=join(tmp,name+'.mjs');await build({entryPoints:[file],outfile,bundle:true,platform:'node',format:'esm',logLevel:'silent'});return import(pathToFileURL(outfile).href);}
const c=await load('src/sourceCorrections.ts','corrections'),jio=await load('src/jioHoldCorrections.ts','jio'),integrity=await load('src/exactCorrectionIntegrity.ts','integrity'),model=await load('src/model.ts','model'),geo=await load('src/geography.ts','geo'),narration=await load('src/narrationTranscript.ts','narration'),book=await load('src/casebookWithCorrections.ts','book');
const raw=await loadOriginalRegistry(),hash=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex'),before=hash(raw),entries=jio.JIO_HOLD_CORRECTIONS;
const ids=entries.flatMap(entry=>entry.targetIds),rows=r=>[...r.entities,...r.relationships,...r.records],item=(id,r=raw)=>rows(r).find(row=>row.id===id);
const makeBook=targets=>({version:1,title:'Jio source scope',question:'',falsifier:'',pins:targets.map(id=>({kind:id.includes(':relationship:')?'relationship':'record',id,addedAt:'2026-10-16T08:00:00Z',note:''})),views:[]});
const scene=model.buildEvidenceScene(raw,{requireAllTargets:true}),factual=model.factualScene(scene);

test('portable SHA-256 and immutable definition pins validate full expected objects and exact two claim closures',()=>{
 for(const text of ['', 'abc', 'A date is not an ownership onset. 🌏', 'a'.repeat(65),'x'.repeat(10000)])assert.equal(integrity.correctionSha256(text),hash(text));
 jio.validateJioHoldDefinitions();c.validateSourceCorrectionsRegistry(raw,{requireAllTargets:true});
 assert.equal(before,jio.JIO_BASELINE_SHA256);assert.equal(entries.length,2);
 assert.deepEqual(entries.map(entry=>entry.sourceIds),[['legacy:source:88f95f360cab64d','legacy:source:5ac4722579b9b603'],['legacy:source:88f95f360cab64d']]);
 for(const entry of entries){assert.equal(entry.recommendationSha256,'e533a8ee7f9fc114fcfd1a3432b371820bdf72029f7e75170dc0999b0b51a36a');assert.equal(entry.reviewReceiptSha256,'755a46a9e4e35a966b6e266f784a7bf94a7e3fffc872afee8c12893e5768f516');assert.equal(entry.baselineCanonicalSha256,before);assert.equal(entry.graphEligible,false);assert.equal(entry.pathEligible,false);assert.ok(Object.isFrozen(entry.expectedItems[0].sourceIds));
  for(const [index,expected]of entry.expectedItems.entries()){assert.deepEqual(item(expected.id),expected);assert.equal(hash(expected),entry.expectedItemJsonStringifySha256[index]);assert.deepEqual(expected.sourceIds,entry.sourceIds);}
 }
});

test('exact Jio set difference removes only two records and two edges while preserving all endpoint identities and raw bytes',()=>{
 const ordinaryHeld=new Set(raw.held.map(row=>row.id)),jioIds=new Set(ids);
 const priorNodes=scene.nodes.filter(row=>!ordinaryHeld.has(row.id)&&row.item.status!=='not-drawn'&&(!c.sourceCorrection(row.id)||jioIds.has(row.id)));
 const priorIds=new Set(priorNodes.map(row=>row.id));
 const priorEdges=scene.edges.filter(row=>!ordinaryHeld.has(row.id)&&row.relationship.status!=='not-drawn'&&(!c.sourceCorrection(row.id)||jioIds.has(row.id))&&priorIds.has(row.from)&&priorIds.has(row.to));
 assert.deepEqual(priorNodes.filter(row=>!factual.nodes.includes(row)).map(row=>row.id).sort(),entries.map(row=>row.targetIds[1]).sort());
 assert.deepEqual(priorEdges.filter(row=>!factual.edges.includes(row)).map(row=>row.id).sort(),entries.map(row=>row.targetIds[0]).sort());
 assert.equal(scene.nodes.length,8086);assert.equal(scene.edges.length,4203);assert.equal(raw.held.length,316);
 for(const entry of entries)for(const endpoint of entry.expectedEndpoints){assert.ok(factual.nodes.some(row=>row.id===endpoint.id));assert.deepEqual(item(endpoint.id),endpoint);assert.equal(c.presentationCorrection(endpoint.id),null);}
 assert.equal(hash(raw),before);
});

test('held IDs remain reader-searchable and cannot enter factual search, geographic threads, directed or undirected adjacency',()=>{
 const geographic=geo.getGeographicScene(factual);
 for(const id of ids){assert.equal(model.isHeldItem(raw,id),true);assert.ok([...model.filterScene(scene,{query:id}).nodes,...model.filterScene(scene,{query:id}).edges].some(row=>row.id===id));assert.equal(model.filterScene(factual,{query:id}).nodes.length,0);assert.equal(model.filterScene(factual,{query:id}).edges.length,0);assert.ok(!geographic.edges.some(row=>row.id===id));}
 for(const entry of entries){const edge=item(entry.targetIds[0]);for(const directed of [true,false]){const neighbours=factual.edges.filter(row=>row.from===edge.from||!directed&&row.to===edge.from);assert.ok(!neighbours.some(row=>row.id===edge.id));}assert.ok(!factual.edges.some(row=>row.from===edge.from&&row.to===edge.to&&row.id===edge.id));}
});

test('correct subject/date/vehicle/currentness qualifications survive reader text and narration without direct ownership prose',()=>{
 for(const entry of entries)for(const id of entry.targetIds){const row=item(id),title=c.presentationTitle(row),summary=c.presentationSummary(row),speech=narration.buildNarrationTranscript(row,true);assert.equal(title,entry.displayTitle);assert.doesNotMatch(title,/Adani/);assert.equal(summary,entry.summary);assert.match(summary,/Outlook Business reported on 21 June 2026/);assert.match(summary,/current ownership/);assert.match(summary,/Reliance-group endpoint is not a reviewed identity match to Jio Platforms/);assert.match(speech,/Source-scope correction/);assert.match(speech,/excluded from the factual map/);assert.ok(!speech.includes(row.summary));assert.doesNotMatch(speech,/Evidence tier: documented/);assert.equal(row.fromDate,null);assert.equal(row.toDate,null);assert.equal(model.eventYear(row.fromDate),null);}
 assert.match(entries[0].summary,/Jaadhu Holdings/);assert.match(entries[0].findings.join(' '),/9\.99% versus 9\.98%/);
 assert.match(entries[1].summary,/Alphabet Inc\., Google LLC and Google International LLC remain distinct/);assert.doesNotMatch(JSON.stringify(entries[1].findings),/9\.99|9\.98|Jaadhu|Inc42/);
});

test('shared Outlook and Inc42 metadata remain neutral; PIF and every other unchanged shared-source claim remain eligible',()=>{
 for(const citation of jio.JIO_SOURCE_CITATIONS){assert.deepEqual(c.sourceCitationCorrection(citation.sourceId),citation);assert.ok(!('reason'in c.sourceCitationCorrection(citation.sourceId)));assert.doesNotMatch(citation.sourceDateNotice,/Meta|Jaadhu|Google|PIF|9\.99|9\.98|7\.73/);assert.match(citation.sourceDateNotice,/does not establish/);}
 assert.equal(c.sourceCitationCorrection(entries[0].sourceId).sourcePublishedAt,'2026-06-21');
 const shared=raw.relationships.filter(row=>!ids.includes(row.id)&&row.sourceIds.some(id=>entries[0].sourceIds.includes(id)));
 assert.ok(shared.some(row=>/pif/i.test(row.summary+' '+row.id)));
 for(const row of shared){assert.equal(c.sourceCorrection(row.id),null);assert.equal(c.presentationSummary(row),row.summary);assert.ok(factual.edges.some(edge=>edge.relationship===row));}
 const unrelated={...item(ids[0]),id:'unrelated:copied:jio'};assert.equal(c.sourceCorrection(unrelated.id),null);assert.equal(c.presentationSummary(unrelated),unrelated.summary);assert.equal(model.isHeldItem(raw,unrelated.id),false);
});

test('JSON preserves exact rows and claim source closure; Markdown and source ledger retain attributed dated qualifications',()=>{
 for(const entry of entries){const packet=book.buildCasebookPacket(makeBook([entry.targetIds[0]]),raw);assert.deepEqual(packet.sourceCorrections,[entry]);
  for(const id of entry.targetIds){const row=item(id);assert.equal([...packet.relationships,...packet.records].find(row=>row.id===id),row);assert.deepEqual(row.sourceIds,entry.sourceIds);}
  assert.deepEqual(packet.sourceCorrections[0].sourceIds,entry.sourceIds);for(const source of entry.expectedSources)assert.deepEqual(packet.sources.find(row=>row.id===source.id),source);
  // Endpoint citations remain contextual ledger rows; they are never promoted into claim closure.
  const md=book.casebookMarkdown(packet);assert.ok(md.includes(entry.displayTitle));assert.ok(md.includes(entry.summary));assert.match(md,/SOURCE-SCOPE CORRECTION/);assert.ok(md.includes(entry.interpretationNotice));assert.match(md,/21 June 2026/);assert.match(md,/underlying prospectus was not authenticated/);assert.ok(!md.includes(item(entry.targetIds[0]).summary));assert.doesNotMatch(md,/Evidence tier: documented/);
  if(entry.subjectLabel==='Meta')assert.match(md,/Inc42/);
 }
 assert.equal(hash(raw),before);
});

test('partial previews/casebooks make no complete-corpus claim, yet present target and complete source closure are mandatory',()=>{
 assert.doesNotThrow(()=>model.buildPreview());
 for(const entry of entries){const partial={...raw,entities:[],relationships:[],records:[item(entry.targetIds[1])],sources:entry.expectedSources,held:[]};assert.doesNotThrow(()=>model.buildEvidenceScene(partial));const packet=book.buildCasebookPacket(makeBook([entry.targetIds[1]]),partial);assert.equal(packet.records.length,1);assert.equal(packet.relationships.length,0);assert.deepEqual(packet.sourceCorrections,[entry]);assert.match(book.casebookMarkdown(packet),/direct ownership interpretation held/);assert.throws(()=>model.buildEvidenceScene(partial,{requireAllTargets:true}),/missing target/);
  const missing=structuredClone(partial);missing.sources=[];assert.throws(()=>model.buildEvidenceScene(missing),/source closure drift/);assert.throws(()=>book.buildCasebookPacket(makeBook([entry.targetIds[1]]),missing),/source closure drift/);assert.equal(model.isHeldItem(missing,entry.targetIds[1]),true);
 }
});

test('all target object fields and extra fields fail closed; standalone presentation/narration cannot hide mutated objects',()=>{
 for(const entry of entries)for(const expected of entry.expectedItems){for(const field of Object.keys(expected)){const clone=structuredClone(raw),row=item(expected.id,clone);row[field]=Array.isArray(row[field])?[...row[field],'drift']:row[field]===null?'2026-01-01':String(row[field])+' drift';assert.throws(()=>c.validateSourceCorrectionsRegistry(clone,{requireAllTargets:true}),/Jio hold (object drift|missing target)/,`${expected.id}/${field}`);assert.throws(()=>model.buildEvidenceScene(clone,{requireAllTargets:true}),/Jio hold/);assert.throws(()=>book.buildCasebookPacket(makeBook([expected.id]),clone,{requireAllTargets:true}),/Jio hold/);}
  const row={...expected,unexpected:'extra'};assert.throws(()=>c.presentationTitle(row),/object drift/);assert.throws(()=>c.presentationSummary(row),/object drift/);assert.throws(()=>narration.buildNarrationTranscript(row,true),/object drift/);
 }
});

test('complete preflight rejects every missing/renamed target, missing endpoint and duplicate while preserving explicit partial support',()=>{
 for(const id of ids){const clone=structuredClone(raw),key=id.includes(':relationship:')?'relationships':'records';clone[key]=clone[key].filter(row=>row.id!==id);assert.throws(()=>c.validateSourceCorrectionsRegistry(clone,{requireAllTargets:true}),/missing target/);assert.throws(()=>model.buildEvidenceScene(clone,{requireAllTargets:true}),/missing target/);}
 const missingAll=structuredClone(raw);missingAll.relationships=missingAll.relationships.filter(row=>!ids.includes(row.id));missingAll.records=missingAll.records.filter(row=>!ids.includes(row.id));assert.throws(()=>c.validateSourceCorrectionsRegistry(missingAll,{requireAllTargets:true}),/missing target/);
 for(const entry of entries){const clone=structuredClone(raw);clone.records.push(structuredClone(item(entry.targetIds[1])));assert.throws(()=>model.buildEvidenceScene(clone,{requireAllTargets:true}),/duplicate target/);for(const endpoint of entry.expectedEndpoints){const absent=structuredClone(raw);absent.entities=absent.entities.filter(row=>row.id!==endpoint.id);assert.throws(()=>model.buildEvidenceScene(absent,{requireAllTargets:true}),/endpoint drift/);}}
 const clone=structuredClone(raw),complete=model.buildEvidenceScene(clone,{requireAllTargets:true});clone.relationships=clone.relationships.filter(row=>row.id!==ids[0]);assert.throws(()=>model.factualScene(complete),/missing target/);
});

test('source ID/URL/full-object/extra or missing closure and every endpoint field fail before factual map or export use',()=>{
 for(const source of entries[0].expectedSources){for(const field of Object.keys(source)){const clone=structuredClone(raw),row=clone.sources.find(row=>row.id===source.id);row[field]=Array.isArray(row[field])?[...row[field],'drift']:String(row[field])+' drift';assert.throws(()=>model.buildEvidenceScene(clone,{requireAllTargets:true}),/source closure drift/,field);assert.throws(()=>book.buildCasebookPacket(makeBook(ids),clone),/source closure drift/);}
  for(const action of ['remove','duplicate']){const clone=structuredClone(raw);clone.sources=action==='remove'?clone.sources.filter(row=>row.id!==source.id):[...clone.sources,source];assert.throws(()=>model.buildEvidenceScene(clone,{requireAllTargets:true}),/source closure drift/);}
 }
 for(const entry of entries)for(const expected of entry.expectedEndpoints)for(const field of Object.keys(expected)){const clone=structuredClone(raw),row=clone.entities.find(row=>row.id===expected.id);row[field]=Array.isArray(row[field])?[...row[field],'drift']:String(row[field])+' drift';assert.throws(()=>model.buildEvidenceScene(clone,{requireAllTargets:true}),/endpoint drift/);}
 for(const entry of entries)for(const changed of [entry.sourceIds.slice(1),[...entry.sourceIds,'unrelated:source'],[...entry.sourceIds].reverse()]){if(JSON.stringify(changed)===JSON.stringify(entry.sourceIds))continue;const clone=structuredClone(raw);item(entry.targetIds[0],clone).sourceIds=changed;assert.throws(()=>model.buildEvidenceScene(clone,{requireAllTargets:true}),/object drift/);}
});

test('sidecar target/object/hash/baseline/receipt mutations and source-date mutations cannot repin the approved definitions',()=>{
 for(const index of [0,1])for(const field of ['id','targetIds','sourceIds','graphEligible','pathEligible','baselineCanonicalSha256','recommendationSha256','reviewReceiptSha256','expectedItemJsonStringifySha256','expectedSourceJsonStringifySha256','expectedEndpointJsonStringifySha256']){const clone=structuredClone(entries);clone[index][field]=Array.isArray(clone[index][field])?['drift']:'drift';assert.throws(()=>jio.validateJioHoldDefinitions(clone),/definition drift/);}
 for(const key of ['expectedItems','expectedSources','expectedEndpoints']){const clone=structuredClone(entries);clone[0][key][0].id+=' drift';assert.throws(()=>jio.validateJioHoldDefinitions(clone),/definition drift/);}
 const dates=structuredClone(jio.JIO_SOURCE_CITATIONS);dates[0].sourcePublishedAt='2026-01-01';assert.throws(()=>jio.validateJioHoldDefinitions(entries,dates),/citation metadata drift/);
});

test('packaged raw snapshot and all 96 chunks retain canonical hashes, lengths and reconstruction',async()=>{
 const manifest=JSON.parse(await readFile('public/data/registry/manifest.json','utf8')),rebuilt={};let chunks=0;
 for(const key of manifest.topLevelKeys){if(key==='updatedAt'){rebuilt[key]=manifest.metadata.updatedAt;continue;}const group=manifest.arrays.find(row=>row.key===key);rebuilt[key]=[];for(const chunk of group.chunks){const bytes=await readFile(join('public/data/registry',chunk.file));assert.equal(bytes.length,chunk.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),chunk.sha256);rebuilt[key].push(...JSON.parse(bytes));chunks++;}}
 assert.equal(chunks,96);assert.equal(manifest.sourceSnapshot.sha256,before);assert.equal(hash(rebuilt),before);c.validateSourceCorrectionsRegistry(rebuilt,{requireAllTargets:true});
});

test('production full scene opts into missing-target guards and CI cases 32–33 cover desktop/mobile without local browser startup',async()=>{
 const app=await readFile('src/App.tsx','utf8'),reader=await readFile('src/RegistryReader.tsx','utf8'),browser=await readFile('scripts/jio-hold-browser.mjs','utf8'),harness=await readFile('scripts/source-correction-browser.mjs','utf8');
 assert.match(app,/buildEvidenceScene\(registry, \{ requireAllTargets: true \}\)/);assert.doesNotMatch(reader,/sourceCitationCorrection\(source.id\)\?\.reason/);assert.match(harness,/await runJioHoldBrowserCases/);
 for(const text of ['32-jio-exact-holds-reader-export','33-jio-exact-holds-mobile','entry.sourceIds','fullRegistry[key]','Current transcript','casebookMarkdown','data-held-warning','relationship-route','scrollWidth','touch:true','reducedMotion:true'])assert.ok(browser.includes(text),text);
 assert.match(browser,/process.env.GITHUB_ACTIONS,'true'/);assert.doesNotMatch(browser,/chromium\.launch|browserType\.launch|\.install\(/);
});
