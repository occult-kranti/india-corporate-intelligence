import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {loadOriginalRegistry} from './original-registry.mjs';
const temporary=await mkdtemp(join(tmpdir(),'source-correction-'));
after(()=>rm(temporary,{recursive:true,force:true}));
async function load(path,name){const outfile=join(temporary,`${name}.mjs`);await build({entryPoints:[path],outfile,bundle:true,platform:'node',format:'esm',logLevel:'silent'});return import(pathToFileURL(outfile).href);}
const correction=await load('src/sourceCorrections.ts','correction');
const model=await load('src/model.ts','model');
const geography=await load('src/geography.ts','geography');
const narration=await load('src/narrationTranscript.ts','narration');
const book=await load('src/casebookWithCorrections.ts','book');
const original=await loadOriginalRegistry();
const hash=()=>createHash('sha256').update(JSON.stringify(original)).digest('hex');
const hashBefore=hash();
const edgeID='legacy:relationship:f34361dbb8642b3|adani|direct|bjp';
const recordID='legacy:record:f34361dbb8642b3|adani|direct|bjp';
const leapEdgeID='legacy:relationship:d28b0cf3ca30f78d|leap|direct|bjp';
const leapRecordID='legacy:record:d28b0cf3ca30f78d|leap|direct|bjp';
const sectionEdgeID='legacy:relationship:652dbd2bc25b312f|sec182|law|adani';
const sectionRecordID='legacy:record:652dbd2bc25b312f|sec182|law|adani';
const acceptedAdditionalHolds=[...correction.JIO_HOLD_CORRECTIONS,...correction.PROGRESSIVE_CORRECTIONS.filter(c=>!c.graphEligible)];
const heldEdgeIDs=[edgeID,sectionEdgeID,leapEdgeID,...acceptedAdditionalHolds.flatMap(c=>c.targetIds.filter(id=>id.includes(':relationship:')))];
const heldRecordIDs=[recordID,sectionRecordID,leapRecordID,...acceptedAdditionalHolds.flatMap(c=>c.targetIds.filter(id=>id.includes(':record:')))];
const entityID='legacy:entity:adani';
const sourceID='legacy:source:4f9a5826f3c29ee';
const edge=original.relationships.find(row=>row.id===edgeID),record=original.records.find(row=>row.id===recordID),entity=original.entities.find(row=>row.id===entityID);
const scene=model.buildEvidenceScene(original),factual=model.factualScene(scene);
test('correction binds the reviewed receipt, exact targets and immutable raw snapshot, with update/publication dates separate',()=>{
 const c=correction.SOURCE_CORRECTION;
 assert.equal(hashBefore,'048f89ffd008a498212ff2ac71d4413aef09b138a50ab77f336a23fec4722064');
 assert.equal(c.baselineCanonicalSha256,hashBefore);
 assert.equal(c.reviewReceiptSha256,'7532fb7fd68da06cb43db3dfea3ccbdf42de21c83b93a7fc3e01eaf8cd21ca87');
 assert.deepEqual(c.targetIds,[edgeID,recordID]);assert.equal(c.sourceId,sourceID);
 assert.equal(c.sourceUrl,original.sources.find(row=>row.id===sourceID).url);
 assert.equal(c.sourceDisplayedUpdatedAt,'2024-03-15T00:09+05:30');assert.equal(c.sourcePublishedAt,null);
 assert.equal(c.amount,null);assert.equal(c.graphEligible,false);assert.equal(c.pathEligible,false);
 assert.match(c.reason,/narrow reported name-absence observation/);
 assert.match(c.relatedClaimStatus,/separate exact-target review/);
});
test('exact edge and mirrored record are reader-only without removing other rows or changing raw status',()=>{
 assert.equal(scene.registry,original);assert.equal(scene.nodes.length,8086);assert.equal(scene.edges.length,4203);
 assert.equal(scene.nodes.find(row=>row.id===recordID).item,record);assert.equal(scene.edges.find(row=>row.id===edgeID).relationship,edge);
 assert.equal(edge.label,'₹0 — documented void');assert.equal(edge.status,'retained-claim');assert.equal(record.status,'retained-claim');
 assert.equal(original.held.length,316);
 const retainedEligibleNodes=scene.nodes.filter(node=>!original.held.some(row=>row.id===node.id)&&node.item.status!=='not-drawn');
 const retainedEligibleEdges=scene.edges.filter(row=>!original.held.some(held=>held.id===row.id)&&row.relationship.status!=='not-drawn');
 assert.equal(heldEdgeIDs.length,6);assert.equal(heldRecordIDs.length,6);
 assert.deepEqual(heldEdgeIDs.slice().sort(),['legacy:relationship:f34361dbb8642b3|adani|direct|bjp','legacy:relationship:652dbd2bc25b312f|sec182|law|adani','legacy:relationship:d28b0cf3ca30f78d|leap|direct|bjp','legacy:relationship:4d8d2645c8158165|for:meta-platforms|own|grp:reliance','legacy:relationship:46b943139aaf3743|for:google-alphabet-|own|grp:reliance','legacy:relationship:e1f6b96bef1be1d5|tata|trust|progressive'].sort());
 assert.deepEqual(heldRecordIDs.slice().sort(),heldEdgeIDs.map(id=>id.replace('relationship:','record:')).sort());
 assert.deepEqual(retainedEligibleNodes.filter(node=>!factual.nodes.includes(node)).map(node=>node.id).sort(),heldRecordIDs.slice().sort());
 assert.deepEqual(retainedEligibleEdges.filter(row=>!factual.edges.includes(row)).map(row=>row.id).sort(),heldEdgeIDs.slice().sort());
 assert.equal(factual.nodes.length,7853);assert.equal(factual.edges.length,4197);
 assert.equal(model.isHeldItem(original,edgeID),true);assert.equal(model.isHeldItem(original,recordID),true);assert.equal(model.isHeldItem(original,entityID),false);
 assert.equal(hash(),hashBefore);
});
test('held correction never re-enters a selected geographic/thread projection or factual search',()=>{
 assert.equal(model.filterScene(factual,{query:recordID}).nodes.length,0);
 assert.equal(model.filterScene(factual,{query:edgeID}).edges.length,0);
 const geo=geography.getGeographicScene(factual);
 assert.equal(geo.nodes.length,3856);assert.equal(geo.unplacedNodes.length,3997);
 assert.ok(!geo.edges.some(row=>row.id===edgeID));
 assert.ok(model.filterScene(scene,{query:recordID}).nodes.some(row=>row.id===recordID));
 assert.ok(model.filterScene(scene,{query:edgeID}).edges.some(row=>row.id===edgeID));
});
test('derived labels and narration cannot repeat the unsupported universal-zero statement as accepted evidence',()=>{
 for(const item of [edge,record]){
  assert.match(correction.presentationTitle(item),/wider donation history unverified/);
  assert.match(correction.presentationSummary(item),/does not establish total political donations/);
  assert.match(correction.presentationTier(item),/excluded from factual network/);
  const transcript=narration.buildNarrationTranscript(item,true);
  assert.match(transcript,/Source-scope correction/);assert.doesNotMatch(transcript,/₹0|No disclosed political donation anywhere|untraceable payment|Evidence tier: documented/);
 }
 const summary=correction.presentationSummary(entity);
 assert.doesNotMatch(summary,/ZERO disclosed political donations anywhere|documented void/);
 assert.ok(summary.includes('Denies wrongdoing.'));assert.ok(summary.includes('without admission or finding of guilt'));
 assert.equal(summary,entity.summary.replace(correction.SOURCE_CORRECTION.supersededEntitySentence,correction.SOURCE_CORRECTION.entityReplacementSentence));
 assert.doesNotMatch(narration.buildNarrationTranscript(entity),/ZERO disclosed political donations anywhere|documented void/);
});
test('same words or names under unrelated IDs are not silently corrected or held',()=>{
 const other={...record,id:'unrelated:record:adani',title:'Same words',summary:record.summary};
 assert.equal(correction.sourceCorrection(other.id),null);assert.equal(correction.presentationSummary(other),record.summary);
 assert.equal(model.isHeldItem(original,other.id),false);
 const unrelatedLaw=original.relationships.find(row=>row.kind==='law' && row.id!==sectionEdgeID);
 assert.ok(unrelatedLaw);assert.equal(correction.presentationSummary(unrelatedLaw),unrelatedLaw.summary);assert.equal(correction.sourceCorrection(unrelatedLaw.id),null);
});
test('casebook JSON preserves raw objects with explicit correction sidecars and derived Markdown stays qualified',()=>{
 const casebook={version:1,title:'Source correction',question:'',falsifier:'',pins:[{kind:'relationship',id:edgeID,addedAt:'2026-10-16T05:00:00Z',note:''}],views:[]};
 const packet=book.buildCasebookPacket(casebook,original);
 assert.equal(packet.relationships.find(row=>row.id===edgeID),edge);assert.equal(packet.records.find(row=>row.id===recordID),record);
 assert.deepEqual(packet.sourceCorrections,[correction.SOURCE_CORRECTION]);
 const markdown=book.casebookMarkdown(packet);
 assert.match(markdown,/SOURCE-SCOPE CORRECTION/);assert.match(markdown,/sourceCorrections sidecar/);
 assert.doesNotMatch(markdown,/₹0|No disclosed political donation anywhere|untraceable payment|ZERO disclosed political donations anywhere/);
 assert.ok(markdown.includes('Denies wrongdoing.'));
 const entityPacket=book.buildCasebookPacket({...casebook,pins:[{...casebook.pins[0],kind:'entity',id:entityID}]},original);
 assert.equal(entityPacket.sourceCorrections.length,1);assert.equal(entityPacket.entities[0],entity);
 assert.equal(hash(),hashBefore);
});
test('UI and exported casebook entry use correction-aware helpers while storage schema remains unchanged',async()=>{
 const app=await readFile('src/App.tsx','utf8'),reader=await readFile('src/RegistryReader.tsx','utf8');
 assert.match(app,/from "\.\/casebookWithCorrections"/);assert.match(app,/data-source-correction/);
 assert.match(app,/Superseded raw object · audit only, not accepted evidence/);
 assert.match(app,/inspectionEdge && !inspectionHeld && !mapEdgeIds.has/);
 assert.ok(app.includes('inspectionEdge && (!inspectionCorrection || inspectionCorrection.graphEligible)'));
 assert.match(app,/SUPERSEDED CLAIM \/ SOURCE REVIEW/);
 assert.match(reader,/presentationSummary\(node.item\)/);assert.match(reader,/presentationTitle\(edge.relationship\)/);
 assert.match(reader,/sourceCitationCorrection\(source.id\)/);
 assert.equal(await readFile('src/casebookStore.ts','utf8'),(await readFile('scripts/fixtures/casebookStore.original.ts','utf8')).replace("'../../data/investigation'","'./domain'"));
});

test('second exact-target receipt holds the unsupported filing survey without making a compliance or concealment finding',()=>{
 const c=correction.SECTION182_CORRECTION;
 assert.equal(c.reviewReceiptSha256,'5c2fb88caf3fc6cd4796770460f48b3b2ab055f68f08af3fa784f7511c5da518');
 assert.deepEqual(c.targetIds,[sectionEdgeID,sectionRecordID]);
 assert.equal(c.sourceDisplayedUpdatedAt,'2024-03-23T00:23+05:30');assert.equal(c.sourcePublishedAt,null);
 assert.equal(c.sourceUrl,original.sources.find(row=>row.id===c.sourceId).url);
 assert.match(c.sourceDateNotice,/30 Sensex companies and FY19–FY23/);
 assert.match(c.interpretationNotice,/no conclusion about actual donations, concealment, statutory duties or compliance/);
 for(const id of c.targetIds){
  const item=[...original.records,...original.relationships].find(row=>row.id===id);
  assert.ok(item);assert.match(item.summary,/No non-zero.*FY20–25/);
  assert.equal(model.isHeldItem(original,id),true);
  assert.match(correction.presentationSummary(item),/does not establish.*Adani/);
  assert.doesNotMatch(narration.buildNarrationTranscript(item,true),/No non-zero|genuine nil OR concealment/);
  assert.equal(model.filterScene(factual,{query:id}).nodes.length,0);
  assert.equal(model.filterScene(factual,{query:id}).edges.length,0);
 }
 const casebook={version:1,title:'Both corrections',question:'',falsifier:'',pins:[edgeID,sectionEdgeID].map(id=>({kind:'relationship',id,addedAt:'2026-10-16T05:00:00Z',note:''})),views:[]};
 const packet=book.buildCasebookPacket(casebook,original);
 assert.deepEqual(packet.sourceCorrections,[correction.SOURCE_CORRECTION,correction.SECTION182_CORRECTION]);
 assert.equal(packet.relationships.length,2);assert.equal(packet.records.length,2);
 assert.doesNotMatch(book.casebookMarkdown(packet),/No non-zero|genuine nil OR concealment|₹0|ZERO disclosed political donations anywhere/);
 assert.equal(hash(),hashBefore);
});

test('CI requires desktop/mobile correction reading and raw-export checks without local browser launch',async()=>{
 const runner=await readFile('scripts/browser-review.mjs','utf8'),checks=await readFile('scripts/source-correction-browser.mjs','utf8');
 assert.match(runner,/await runSourceCorrectionBrowserCases/);
 for(const text of ['27-exact-source-corrections-reader-export-and-holds','28-source-corrections-mobile-reading','packet.sourceCorrections','fullRegistry[kind]','data-factual-items','sourceDateNotice','assertReaderOnly','touch:true','reducedMotion:true'])assert.ok(checks.includes(text),text);
 assert.match(checks,/process.env.GITHUB_ACTIONS,'true'/);
 assert.match(checks,/process.env.SPATIAL_BROWSER_REVIEW,'github-actions'/);
 assert.doesNotMatch(checks,/chromium\.launch|browserType\.launch/);
});
