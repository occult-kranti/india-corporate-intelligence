import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {financeValidation,normalizeFinance,coverageFor} from '../src/finance-model.js';
const d=JSON.parse(fs.readFileSync('public/data/finance.json','utf8'));
const get=id=>d.cases.find(c=>c.id===id);
test('material India stages and cancelled-process scope survive ingestion',()=>{
 assert.equal(get('IN-IDBI-2022').stage,'bidding');
 assert.match(get('IN-IDBI-2022').reportedStatus,/no_definitive_agreement/);
 for(const id of ['IN-AIRINDIA-2021','IN-NINL-2022','IN-FSNL-2024'])assert.equal(get(id).stage,'closed');
 for(const id of ['IN-CEL-2021','IN-PAWANHANS-2022','IN-BPCL-2020'])assert.equal(get(id).stage,'cancelled');
 assert.equal(get('IN-IDBI-2022').amounts[0].value,'52878.0806181');
 assert.match(get('IN-IDBI-2022').amounts[0].scope,/not government-only/);
 assert.match(get('IN-PAWANHANS-2022').parties.find(p=>p.entityId==='in_ongc').note,/Separate willingness/);
});
test('every imported claim has its assertion and exact case/source references',()=>{
 const cases=new Set(d.cases.map(c=>c.id)),claims=new Set(d.claims.map(c=>c.id));
 assert.deepEqual(financeValidation(d),[]);
 for(const c of d.claims){assert.ok(c.statement?.trim(),c.id);if(c.caseId)assert.ok(cases.has(c.caseId),c.id);assert.ok(c.sourceIds.length,c.id);}
 for(const c of d.cases)for(const id of c.claimIds??[])assert.ok(claims.has(id),id);
});
test('voting rights are not flattened into economic ownership',()=>{
 const e=d.relationships.find(x=>x.id==='IN-R05');
 assert.equal(e.percent,43.3);assert.equal(e.role,'voting_rights');
 assert.match(e.limitations.join(' '),/not economic-equity/);
 assert.ok(!d.relationships.some(x=>x.sourceEntity==='person_prem_watsa'&&x.targetEntity==='in_idbi'));
});
test('guarantee, pledge and unresolved amount boundaries remain visible',()=>{
 const et=get('GF-ET-SAFARICOM-2023'),j=get('GF-FR-JANNGO-2024'),m=get('GF-ZM-MOPANI-2024');
 assert.equal(et.amounts.find(a=>a.id==='GF-A12').type,'guarantee_exposure');
 assert.match(et.amounts.find(a=>a.id==='GF-A13').note,/not an additional amount/);
 assert.match(j.amounts.find(a=>a.id==='GF-A22').note,/conflict/);
 assert.match(m.amounts.find(a=>a.id==='GF-A19').note,/Plus aggregate interest/);
 assert.equal(get('GF-US-GAVI-2025').classification,'comparator_not_privatization');
 assert.equal(get('GF-US-GAVI-2025').amounts[0].type,'charitable_pledge');
});
test('public payload contains no internal file paths and global coverage is bounded',()=>{
 assert.equal(d.coverage.length,249);
 assert.doesNotMatch(JSON.stringify(d),/\/workspace\/|\/agent_notes\/|\/user_notes\/|file:\/\//);
 assert.match(d.meta.scope,/not a global, national or sector census/);
 const g=normalizeFinance(d),c=coverageFor(g,'AQ');
 assert.match(c.status,/not_researched/);assert.equal(c.caseCount,0);
 assert.ok(!d.coverage.some(c=>/^(complete|comprehensive|exhaustive|all_reviewed)$/.test(c.status)));
});


test('populated case inspectors display each claim and no empty assertion body',async()=>{
 const {JSDOM}=await import('jsdom');
 const read=p=>fs.readFileSync(p,'utf8');
 const dom=new JSDOM(read('finance.html'),{runScripts:'outside-only',url:'https://review.test/finance.html'});
 const w=dom.window;w.fetch=async()=>({ok:true,json:async()=>d});w.HTMLElement.prototype.scrollIntoView=function(){};
 const model=read('src/model.js').replaceAll('export ','');
 const finance=read('src/finance-model.js').replace(/^import[^\n]+\n/,'').replaceAll('export ','');
 const app=read('src/finance-app.js').replace(/^import[^\n]+\n/gm,'').replace('normalize(payload)','normalizeFinance(payload)').replace('filterRecords(graph,state())','filterFinance(graph,state())').replace('graph.records.flatMap(years)','graph.records.flatMap(financeYears)');
 await w.eval('(async()=>{'+model+'\n'+finance+'\n'+app+'})()');
 assert.equal(w.document.querySelector('#error').hidden,true);
 for(const c of d.cases){
  const b=[...w.document.querySelectorAll('.record')].find(x=>x.dataset.record===c.id);assert.ok(b,c.id);b.click();
  const detail=w.document.querySelector('#detail').textContent;assert.ok(detail.includes(c.reportedStatus),c.id);
  for(const claim of d.claims.filter(x=>x.caseId===c.id))assert.ok(detail.includes(claim.statement),claim.id);
 }
 dom.window.close();
});
