import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {dir,load,renderModule,build} from './test-tools.mjs';
const adapter=await load('adapter.ts');
const catalog=adapter.getCaseCatalog();
const {render,renderEvidence}=await renderModule();
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#x27;');
const occurrences=(haystack,needle)=>haystack.split(needle).length-1;

test('every case SSRs with an accessible full list, node controls and graph/path/aggregate holds',()=>{
 for(const file of catalog.cases){const html=render(file,'list');assert.ok(html.includes(escape(file.label)));assert.match(html,/Complete accessible relationship list/);assert.match(html,/aria-pressed="false"/);assert.match(html,/data-public-graph-eligible="false"/);assert.match(html,/data-path-eligible="false"/);assert.match(html,/data-aggregate-eligible="false"/);assert.match(html,/Research jurisdiction:/);assert.match(html,/No map location or camera movement/);assert.match(html,/Profile headings are context/);}
});
test('every full-list edge retains its complete label/date/capacity/direction/qualification/source locator visibly',()=>{
 for(const file of catalog.cases){const html=render(file,'list');
  for(const edge of file.edges){const c=file.claims.find(c=>c.claimId===edge.claimId);assert.equal(occurrences(html,`data-edge-id="${escape(edge.id)}"`),1);
   for(const field of ['proposedLabel','alwaysVisibleQualification','dateLabel','capacityAndDirectness','directionMeaning','mandatoryBoundary','reviewedSourceLocator'])assert.ok(html.includes(escape(c[field])),`${c.claimId}: missing visible ${field}`);
   assert.ok(html.includes(escape(edge.role)));for(const source of c.sourceIds)assert.ok(html.includes(escape(file.sources.find(s=>s.id===source).publisher)));
  }
  assert.doesNotMatch(html,/title="Required qualification/);
 }
});
test('reader-only facts appear with qualifiers but never on an edge element',()=>{
 for(const file of catalog.cases){const html=render(file);for(const id of file.readerFactIds){const c=file.claims.find(c=>c.claimId===id);assert.ok(html.includes(escape(c.proposedLabel)));assert.ok(html.includes(escape(c.alwaysVisibleQualification)));assert.ok(!html.includes(`data-claim-id="${escape(id)}"`));}}
});
test('all 72 evidence bodies retain every date role, quantity, source custody and exclusion polarity',()=>{
 for(const file of catalog.cases)for(const claim of file.claims){const html=renderEvidence(file,claim.claimId);assert.ok(html.includes(escape(claim.statement)));assert.ok(html.includes(escape(claim.financialStage.replaceAll('_',' '))));
  for(const q of [...claim.qualifications,...claim.reviewLimitations,...claim.exclusions.map(x=>x.statement)])assert.ok(html.includes(escape(q)),`${claim.claimId}: ${q}`);
  for(const key of Object.keys(claim.dates))assert.ok(html.includes(escape(key.replace(/([a-z0-9])([A-Z])/g,'$1 $2').replaceAll('_',' '))));
  for(const id of claim.sourceIds){const s=file.sources.find(x=>x.id===id);assert.ok(html.includes(escape(s.accessDepth.replaceAll('_',' '))));assert.ok(html.includes(escape(s.custody.replaceAll('_',' '))));if(s.url)assert.match(html,/rel="noopener noreferrer"/);}
  assert.match(html,/Retrieval is not a relationship date/);assert.match(html,/Dependent sources are not independent corroboration/);
 }
});
test('negative public-office inferences always retain the negative predicate',()=>{
 const file=adapter.getCase('profile:public-office/india-modi');const html=render(file);
 assert.ok(occurrences(html,'This does not establish')>=4);for(const c of file.claims){const h=renderEvidence(file,c.claimId);assert.ok(h.includes(escape(c.exclusions[0].statement)));}
 assert.doesNotMatch(html,/INR 3,800 crore<\/h/);
});
test('shared non-additive blocks and exact trust/issuing-entity identities render',()=>{
 for(const key of ['brazil-batista','usa-trump']){const f=adapter.getCase('profile:'+key);assert.ok(render(f).includes(escape(f.sharedBlocks[0].id)));assert.match(render(f),/Non-additive/);}
 assert.match(render(adapter.getCase('profile:usa-trump')),/Donald J\. Trump Revocable Trust dated April 7, 2014/);
 const musk=adapter.getCase('profile:usa-musk');assert.match(render(musk,'list'),/Tesla Lease Electric Vehicle Securitization 2025-A, LLC/);assert.match(render(musk),/closing unverified/);
});
test('empty input has a clear non-inferential fallback and unsafe mutations fail closed',()=>{
 assert.match(render(null),/No reviewed case is available/);const f=adapter.getCase('profile:india-ambani');f.edges[0].to='global:inferred';const html=render(f);assert.match(html,/diagram is withheld/);assert.doesNotMatch(html,/data-edge-id/);assert.throws(()=>renderEvidence(f,f.claims[0].claimId));
});
test('semantic buttons, status, jump link, native dialog and source links are present',()=>{
 const f=adapter.getCase('profile:india-adani'),html=render(f);assert.match(html,/<dialog[^>]*aria-labelledby=/);assert.match(html,/aria-haspopup="dialog"/);assert.match(html,/role="status" aria-live="polite"/);assert.match(html,/Reveal up to 4 more neighbors/);assert.match(html,/Jump to selected detail/);assert.match(html,/Source-qualified case diagram/);assert.match(html,/stroke-dasharray="/);
 const evidence=renderEvidence(f,f.claims[0].claimId);assert.match(evidence,/<a href="https:/);assert.match(evidence,/Open original public source \(new tab\)/);
});
test('CSS bundles without warnings, remains scoped, and contains mobile/reduced-motion/forced-colors fallbacks',async()=>{
 const result=await build({entryPoints:[path.join(dir,'case-diagrams.css')],bundle:true,write:false,logLevel:'silent'});assert.deepEqual(result.warnings,[]);
 const css=fs.readFileSync(path.join(dir,'case-diagrams.css'),'utf8');assert.match(css,/prefers-reduced-motion:reduce/);assert.match(css,/forced-colors:active/);assert.match(css,/max-width:900px/);assert.match(css,/min-height:44px/);assert.doesNotMatch(css,/text-overflow:\s*ellipsis|line-clamp|animation:.*infinite|transition:(?!none)/);assert.doesNotMatch(css,/(^|\})\s*(body|html|button|a|section)\s*\{/);
});
test('implementation has no global registry, pathfinding, map camera, network or inferred-amount dependency',()=>{
 for(const name of ['adapter.ts','navigation.ts','CaseDiagramPanel.tsx']){const source=fs.readFileSync(path.join(dir,name),'utf8');assert.doesNotMatch(source,/from\s*['"][^'"]*(registry|maplibre|three|scene|historical)/);assert.doesNotMatch(source,/fetch\(|XMLHttpRequest|flyTo\(|easeTo\(|shortestPath|eval\(/);}
});

test('Diagram and Full accessible list are exclusive views with equivalent reviewed meaning',()=>{
 for(const f of catalog.cases){const diagram=render(f,'diagram'),list=render(f,'list');
  assert.match(diagram,/aria-label="Relationship view"/);assert.match(diagram,/aria-label="Source-qualified case diagram"/);assert.doesNotMatch(diagram,/aria-label="Complete accessible relationship list"/);
  assert.match(list,/aria-label="Complete accessible relationship list"/);assert.doesNotMatch(list,/aria-label="Source-qualified case diagram"/);
  for(const e of f.edges.slice(0,4)){const c=f.claims.find(c=>c.claimId===e.claimId);for(const h of [diagram,list]){assert.equal(occurrences(h,`data-edge-id="${escape(e.id)}"`),1);for(const key of ['alwaysVisibleQualification','dateLabel','capacityAndDirectness','directionMeaning'])assert.ok(h.includes(escape(c[key])));}}
 }
});

test('every v2 relation visibly retains its predicate, role stage/capacity, unresolved flags and safe non-addition warning',()=>{
 for(const file of catalog.cases.slice(14)){const html=render(file,'list');for(const edge of file.edges){const c=file.claims.find(c=>c.claimId===edge.claimId);
  const start=html.indexOf(`data-edge-id="${escape(edge.id)}"`),end=html.indexOf('</li>',start),card=html.slice(start,end);
  for(const text of [edge.v2.predicate.replaceAll('_',' '),edge.v2.financialStage.replaceAll('_',' '),edge.v2.capacity,edge.v2.dateLabel,edge.v2.alwaysVisibleQualification])assert.ok(card.includes(escape(text)),edge.id+': '+text);
  for(const key of Object.keys(c.v2.flags))assert.ok(card.includes(escape(key.replace(/([a-z0-9])([A-Z])/g,'$1 $2').replaceAll('_',' '))));
  for(const id of c.v2.nonAdditionGroupIds){const group=file.v2.nonAdditionGroups.find(g=>g.id===id);assert.ok(card.includes(escape(group.qualification)));assert.ok(card.includes(escape(group.aggregation.replaceAll('_',' '))));}
  for(const id of c.v2.recursiveDependencyClaimIds){const dep=file.claims.find(c=>c.claimId===id);assert.ok(card.includes(escape(dep.dateLabel)));}
 }}
});
test('all recursive dependency claims and source evidence are directly included, without recursion cycles',()=>{
 for(const file of catalog.cases.slice(14))for(const c of file.claims){const html=renderEvidence(file,c.claimId);for(const id of c.v2.recursiveDependencyClaimIds){const dep=file.claims.find(d=>d.claimId===id);assert.ok(html.includes(escape(dep.statement)));assert.ok(html.includes(escape(dep.alwaysVisibleQualification)));for(const q of [...dep.qualifications,...dep.reviewLimitations,...dep.exclusions.map(x=>x.statement)])assert.ok(html.includes(escape(q)));}
  for(const source of c.sourceIds){const s=file.sources.find(s=>s.id===source);for(const text of [s.title,s.publisher,s.locator,s.custody,s.accessDepth.replaceAll('_',' ')])assert.ok(html.includes(escape(text)),c.claimId+': '+text);}
 }
});
test('missing mandatory v2 fields withhold all arrows and retain the complete independent pinned reader',()=>{
 for(const file of catalog.cases.slice(14)){const bad=JSON.parse(JSON.stringify(file));delete bad.claims[0].v2.sourceDateFields;const html=render(bad);assert.match(html,/diagram is withheld/);assert.match(html,/complete pinned source reader/);assert.doesNotMatch(html,/data-edge-id=/);for(const c of file.claims){assert.ok(html.includes(escape(c.statement)));assert.ok(html.includes(escape(c.alwaysVisibleQualification)));}}
});
