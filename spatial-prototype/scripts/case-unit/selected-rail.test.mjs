/** P1-A presentation contracts. No browser launch, graphics stub or replacement
 * evidence data: compile the real reader once and compare with pre-edit pins. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {host,require,build,hash,semanticHash,pins} from './test-tools.mjs';
const base=JSON.parse(fs.readFileSync(new URL('./fixtures/selected-rail-base-pins.json',import.meta.url),'utf8'));
const result=await build({stdin:{contents:`export {getCaseCatalog} from './case-data/adapter';export {CaseEvidenceDetails,SelectedCaseEvidence} from './case-data/CaseDiagramPanel';export {CaseSceneEvidence} from './case-scene/CaseSceneEvidence';export {CaseController} from './case-scene/controller';`,resolveDir:path.join(host,'src'),loader:'tsx'},bundle:true,write:false,platform:'node',format:'cjs',jsx:'automatic',external:['react','react/jsx-runtime'],loader:{'.css':'empty'},metafile:true});
const module={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(require,module,module.exports);
const {getCaseCatalog,CaseEvidenceDetails,SelectedCaseEvidence,CaseSceneEvidence,CaseController}=module.exports;
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const catalog=getCaseCatalog(),files=catalog.cases;
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#x27;');
const render=(Component,props)=>renderToStaticMarkup(React.createElement(Component,props));
const source=(file,claim)=>render(CaseEvidenceDetails,{caseFile:file,claimId:claim.claimId});
const summary=(file,claim,edge)=>render(SelectedCaseEvidence,{file,claim,edge,onInspectSource(){}});
const rail=controller=>render(CaseSceneEvidence,{caseFile:controller.file,model:controller.model,state:controller.state,onAction(){},onInspectSource(){}});
const contains=(html,text,label=text)=>assert.ok(html.includes(escape(text)),`Missing exact ${label}`);
const valueText=value=>value===null?'Unknown / not established':Array.isArray(value)?value.map(valueText).join('; '):typeof value==='object'?Object.entries(value).map(([key,item])=>`${key.replaceAll('_',' ')}: ${valueText(item)}`).join('; '):String(value);

test('all 19 decoded cases and every protected source file remain exact; publication/path/aggregation holds stay false',()=>{
  assert.equal(semanticHash(catalog),pins.expandedCatalogSha256);
  assert.deepEqual([files.length,files.flatMap(f=>f.claims).length,files.flatMap(f=>f.nodes).length,files.flatMap(f=>f.edges).length,files.flatMap(f=>f.readerFactIds).length],[19,72,91,73,13]);
  for(const [relative,expected] of Object.entries(base.protectedSourceFiles))assert.equal(hash(fs.readFileSync(path.join(host,relative))),expected,relative);
  for(const file of files)for(const record of [file,...file.nodes,...file.edges])for(const flag of ['publicationEligible','publicGraphEligible','pathEligible','aggregateEligible','researchExportEligible'])assert.equal(record[flag],false,`${record.id}/${flag}`);
});

test('all 72 complete source/qualifier bodies are byte-identical to PR15 before editing',()=>{
  let count=0;
  for(const file of files)for(const claim of file.claims){assert.equal(hash(source(file,claim)),base.sourceEvidenceHtmlSha256[claim.claimId],claim.claimId);count++;}
  assert.equal(count,72);
  const panel=fs.readFileSync(path.join(host,'src/case-data/CaseDiagramPanel.tsx'),'utf8');
  const guards=panel.slice(panel.indexOf('function V2VisibleGuards'),panel.indexOf('/** Selected-first context'));
  assert.equal(hash(guards),base.visibleGuardsFunctionSha256,'V2VisibleGuards implementation is unchanged');
});

test('73 selected relations preserve endpoints, exact date/basis/status and all material scope next to their original statement',()=>{
  let count=0;
  for(const file of files)for(const edge of file.edges){
    const claim=file.claims.find(c=>c.claimId===edge.claimId),html=summary(file,claim,edge);
    for(const text of [edge.role,claim.statement,claim.dateLabel,valueText(claim.dates.dateBasis??null),claim.financialStage.replaceAll('_',' '),claim.alwaysVisibleQualification,claim.capacityAndDirectness,claim.directionMeaning,claim.mandatoryBoundary,claim.reviewedSourceLocator,...claim.qualifications,...claim.reviewLimitations,...claim.exclusions.map(x=>x.statement),...file.constraints])contains(html,text,`${edge.id}: ${text}`);
    for(const id of [edge.from,edge.to]){const node=file.nodes.find(node=>node.id===id);contains(html,node.label);contains(html,node.qualification);}
    if(edge.v2){for(const text of [edge.v2.predicate.replaceAll('_',' '),edge.v2.capacity,edge.v2.financialStage.replaceAll('_',' '),edge.v2.dateLabel,edge.v2.alwaysVisibleQualification])contains(html,text);if(edge.v2.amount!==null)contains(html,valueText(edge.v2.amount));}
    if(claim.v2){for(const [key,value]of Object.entries(claim.v2.flags)){contains(html,key.replace(/([a-z0-9])([A-Z])/g,'$1 $2').replaceAll('_',' '));contains(html,valueText(value));}for(const id of claim.v2.nonAdditionGroupIds)contains(html,file.v2.nonAdditionGroups.find(group=>group.id===id).qualification);for(const id of claim.v2.recursiveDependencyClaimIds){const dep=file.claims.find(c=>c.claimId===id);contains(html,dep.proposedLabel);contains(html,dep.dateLabel);}}
    const sources=[...new Set(claim.sourceIds)].map(id=>file.sources.find(s=>s.id===id)),publishers=[...new Set(sources.map(s=>s.publisher))];
    contains(html,`${sources.length} source${sources.length===1?'':'s'} · ${publishers.length} distinct publisher${publishers.length===1?'':'s'}`);
    for(const s of sources){contains(html,s.publisher);for(const exclusion of s.exclusions)contains(html,exclusion.statement);}
    assert.match(html,/Inspect source and full claim/);
    assert.doesNotMatch(html,/<details|\shidden(?:=|\s|>)|aria-hidden=|\stitle=|line-clamp|text-overflow/,'no selected qualifier is disclosure-, hover- or truncation-only');
    count++;
  }
  assert.equal(count,73);
});

test('selected relation comes before navigation, other claims and all-node index at each semantic zoom',()=>{
  let checks=0;
  for(const file of files){const c=new CaseController(file,true);for(const edge of file.edges)for(const zoom of [.7,1.5,4]){
    c.dispatch({type:'select-edge',id:edge.id},0);c.dispatch({type:'camera',patch:{zoom}},1);
    const html=rail(c),claim=file.claims.find(item=>item.claimId===edge.claimId),selected=html.indexOf('data-selected-claim-id='),nav=html.indexOf('aria-label="Case views and history"'),nodeIndex=html.indexOf('aria-label="Complete case node index"');
    assert.ok(selected>=0&&selected<nav&&nav<nodeIndex,edge.id);
    assert.ok(html.includes(summary(file,claim,edge)),edge.id);
    assert.ok(html.includes(source(file,claim)),edge.id);
    assert.match(html,/Case layout · not geographic locations\./);
    assert.equal(html.split(`data-edge-id="${escape(edge.id)}"`).length-1,1,'one ordinary exact-role control for each original edge');
    checks++;
  }}
  assert.equal(checks,219);
});

test('all complete-reader claims, reader-only facts, node identities and source actions survive without WebGL',()=>{
  for(const file of files){const c=new CaseController(file,true);c.dispatch({type:'set-view',view:'list'},0);const html=rail(c);
    assert.match(html,/data-main-view="list"/);assert.doesNotMatch(html,/<canvas|<iframe|<audio/);
    assert.match(html,/<details class="ocv2-disclosure"><summary>All case nodes/);
    for(const claim of file.claims)assert.ok(html.includes(source(file,claim)),claim.claimId);
    for(const node of file.nodes)contains(html,node.label);
    for(const id of file.readerFactIds){c.dispatch({type:'select-fact',id},1);const selected=rail(c),claim=file.claims.find(claim=>claim.claimId===id);assert.ok(selected.includes(summary(file,claim)));assert.match(selected,/Selected reader-only fact · no relationship arrow/);assert.ok(selected.includes(source(file,claim)));}
    contains(html,`Inspect sources for any of the ${file.claims.length} core claims`);
  }
  const inputs=Object.keys(result.metafile.inputs);
  assert.ok(!inputs.some(name=>/CaseSceneLayer|integration-adapter|node_modules\/(three|maplibre-gl)\//.test(name)),'reader closure imports no graphics implementation');
});

test('ordinary selected source opener forwards only the exact claim ID, with no navigation/camera action',()=>{
  for(const file of files)for(const edge of file.edges){const claim=file.claims.find(claim=>claim.claimId===edge.claimId),calls=[];
    const tree=SelectedCaseEvidence({file,claim,edge,onInspectSource:id=>calls.push(id)}),buttons=[];
    function visit(node){if(!node||typeof node!=='object')return;if(Array.isArray(node)){node.forEach(visit);return;}if(node.type==='button')buttons.push(node);visit(node.props?.children);}
    visit(tree);assert.equal(buttons.length,1);assert.equal(buttons[0].props['aria-haspopup'],'dialog');buttons[0].props.onClick();assert.deepEqual(calls,[claim.claimId]);
  }
});

test('348 existing controller/navigation/camera transitions retain exact accepted state hashes',()=>{
  let steps=0;
  for(const file of files){const c=new CaseController(file,true),expected=pins.transitions[file.id];assert.equal(semanticHash(c.model),expected.modelSha256);let wall=0;for(const step of expected.steps){c.dispatch(step.action,wall+=10);assert.equal(semanticHash(c.state),step.stateSha256,`${file.id}/${step.action.type}`);steps++;}}
  assert.equal(steps,348);
});

test('Koch, Batista, Modi, Musk and Trump preserve their long or uncertain source context',()=>{
  const find=pattern=>files.find(file=>pattern.test(file.label));
  for(const pattern of [/Koch/,/Batista/,/Modi/,/Musk/,/Trump/]){const file=find(pattern);assert.ok(file);for(const claim of file.claims){const edge=file.edges.find(edge=>edge.claimId===claim.claimId),html=summary(file,claim,edge);contains(html,claim.dateLabel);contains(html,claim.alwaysVisibleQualification);contains(html,claim.mandatoryBoundary);for(const constraint of file.constraints)contains(html,constraint);}}
  const koch=find(/Koch/),grant=koch.claims.find(claim=>claim.claimId.endsWith('paid-gmu'));assert.match(summary(koch,grant,koch.edges.find(edge=>edge.claimId===grant.claimId)),/recipient identity unresolved/);assert.match(summary(koch,grant),/payment dates unknown/);
  const batista=find(/Batista/);assert.match(summary(batista,batista.claims[0]),/No individual 50% allocation, duplicate 100%/);
  const musk=find(/Musk/),documentary=musk.claims.find(claim=>claim.claimId.endsWith('UM2-C1'));assert.match(summary(musk,documentary),/effective\/closing date unknown/);assert.match(summary(musk,documentary),/ABS-15G signature 2025-09-12 separate/);
  const trump=find(/Trump/),mixed=trump.claims.find(claim=>claim.claimId.endsWith('non-common-date-percent'));assert.match(summary(trump,mixed),/event 2024-12-17; denominator 2024-10-29/);
});

test('exact research-jurisdiction label and qualification stay expanded near the banner for all cases and selected roles',()=>{
  let checks=0;
  // Inspect structural disclosure ancestry, not mere presence in serialized HTML.
  // The exact paragraph must be before any collapsed detail and before selection.
  function assertExpanded(html,file){
    const paragraph=`<p>Research jurisdiction: ${escape(file.researchJurisdiction.label)}. ${escape(file.researchJurisdiction.qualification)}</p>`;
    assert.equal(html.split(paragraph).length-1,1,`${file.id}: exact jurisdiction context occurs once`);
    const index=html.indexOf(paragraph),prefix=html.slice(0,index),disclosures=[];
    for(const match of prefix.matchAll(/<\/?details\b[^>]*>/g)){
      if(match[0].startsWith('</'))disclosures.pop();
      else disclosures.push(/\sopen(?:\s|=|>)/.test(match[0]));
    }
    assert.ok(disclosures.every(Boolean),`${file.id}: jurisdiction context must not be in a closed disclosure`);
    const banner=html.indexOf('Case layout · not geographic locations.'),headerEnd=html.indexOf('</header>',banner);
    assert.ok(banner>=0&&index>banner&&index<headerEnd,`${file.id}: jurisdiction context stays adjacent to the abstract-layout banner`);
    const selected=html.indexOf('data-selected-claim-id=');
    if(selected>=0)assert.ok(index<selected,`${file.id}: jurisdiction context is before selected evidence`);
    checks++;
  }
  for(const file of files)for(const view of ['scene','list']){
    const c=new CaseController(file,true);c.dispatch({type:'set-view',view},0);assertExpanded(rail(c),file);
    for(const edge of file.edges){c.dispatch({type:'select-edge',id:edge.id},1);assertExpanded(rail(c),file);}
    for(const id of file.readerFactIds){c.dispatch({type:'select-fact',id},2);assertExpanded(rail(c),file);}
  }
  assert.equal(checks,(19+73+13)*2);
});

test('all 73 role and 13 reader-fact selections require exact selected-first reader order, once each, with original role order',()=>{
  let count=0;
  const articles=html=>[...html.matchAll(/<article\b[^>]*data-claim-id="([^"]+)"[^>]*>([\s\S]*?)<\/article>/g)];
  for(const file of files){
    const c=new CaseController(file,true);c.dispatch({type:'set-view',view:'list'},0);
    const original=file.claims.map(claim=>claim.claimId);
    assert.deepEqual(articles(rail(c)).map(match=>match[1]),original);
    for(const action of [...file.edges.map(edge=>({type:'select-edge',id:edge.id})),...file.readerFactIds.map(id=>({type:'select-fact',id}))]){
      c.dispatch(action,1);
      const edge=file.edges.find(item=>item.id===action.id),selected=edge?.claimId??action.id,html=rail(c),rows=articles(html);
      assert.deepEqual(rows.map(match=>match[1]),[selected,...original.filter(id=>id!==selected)],`${file.id}/${action.id}`);
      for(const claim of file.claims){
        const article=rows.find(match=>match[1]===claim.claimId)?.[2];
        assert.ok(article,claim.claimId);
        assert.deepEqual([...article.matchAll(/data-edge-id="([^"]+)"/g)].map(match=>match[1]),file.edges.filter(item=>item.claimId===claim.claimId).map(item=>item.id),claim.claimId);
        assert.ok(article.includes(source(file,claim)),`${claim.claimId}: complete original evidence body`);
      }
      count++;
    }
  }
  assert.equal(count,86);
});
