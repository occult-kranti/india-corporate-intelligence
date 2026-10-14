import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMetroSlice } from './validate.mjs';

// Synthetic adversarial fixtures: no assertions about actual named people or vendors.
function fixture() {
  const geo = {scope:'national', stateCodes:[], localityIds:[], basis:'national-context', note:'National appropriation; no city expenditure inferred', sourceIds:['source']};
  const dimensions = {sourceIds:['source'], domains:['finance'], layers:['funding'], limitations:[], route:'/allegations', geography:[geo]};
  const dated = {tier:'documented', status:'Audit observation under review', statusAsOf:'2026-10-07', fromDate:'2025-04-01', toDate:'2026-03-31', dateBasis:'Fiscal-year audit, not a payment date', amounts:[]};
  return {
    sources:[{id:'source',title:'Synthetic public audit',url:'https://example.gov.in/audit',publisher:'Synthetic audit institution',publishedAt:'2026-10-01',retrievedAt:'2026-10-07',locator:'Paragraph 1',summary:'Fixture only',tier:'documented',limitations:[]}],
    entities:['agency','vendor'].map(id=>({...structuredClone(dimensions),id,label:id,type:id==='agency'?'agency':'company',resolved:true,identityBasis:'Exact named identity in synthetic source'})),
    relationships:[{...structuredClone(dimensions),...dated,id:'edge',from:'agency',to:'vendor',kind:'audit-observation',label:'Audit of acceptance controls',summary:'Questioned documentation, not adjudicated theft',recordIds:['case'],responseIds:['response'],alternativeExplanations:['Acceptance records may remain with another office'],falsifier:'Reconciled acceptance records'}],
    records:[{...structuredClone(dimensions),...dated,id:'case',title:'Procurement review',summary:'Synthetic audit review',kind:'investigation-case',entityIds:['agency','vendor'],relationshipIds:['edge'],response:'Agency disputes the audit observation',alternativeExplanations:['Record retention may explain the discrepancy'],falsifier:'Reconciled delivery records',period:'FY2025–26'}, {...structuredClone(dimensions),...dated,id:'response',title:'Agency reply',summary:'Reply retained',kind:'response',entityIds:['agency'],relationshipIds:[],response:'Delivery records are being reconciled',alternativeExplanations:[],falsifier:'Original reconciliation',period:'2026'}],
    localities:[{id:'delhi',name:'Delhi',stateCode:'DL',aliases:[]},{id:'mumbai',name:'Mumbai',stateCode:'MH',aliases:[]}],
  };
}
const rejects = (raw, pattern) => assert.ok(validateMetroSlice(raw,'challenge').some(error=>pattern.test(error)),`Expected ${pattern}`);

test('a national audit with an explicit reply and no local payment footprint is admissible',()=>assert.deepEqual(validateMetroSlice(fixture(),'challenge'),[]));

test('a Delhi headquarters cannot silently become the footprint of national money',()=>{
  const raw=fixture(); Object.assign(raw.records[0].geography[0],{stateCodes:['DL'],localityIds:['delhi']});
  rejects(raw,/national money or context cannot acquire a city\/state footprint/);
});

test('a city claim needs an explicit locality, and Mumbai cannot be paired with Delhi state',()=>{
  const raw=fixture(); Object.assign(raw.records[0].geography[0],{scope:'city',stateCodes:['MH']});
  rejects(raw,/city scope requires an explicit locality/);
  raw.records[0].geography[0].localityIds=['delhi']; rejects(raw,/lacks a matching declared state/);
});

test('an alleged money route cannot lose its reply when added to the graph',()=>{
  const raw=fixture();raw.relationships[0].tier='alleged';raw.relationships[0].responseIds=[];
  rejects(raw,/alleged relationship needs a linked response/);
});

test('a citation with no response content does not satisfy the response check',()=>{
  const raw=fixture();raw.relationships[0].tier='alleged';raw.records[1].response='';raw.records[1].summary='';
  rejects(raw,/empty linked response/);
});

test('ordinary budget, notice and contract contexts cannot be labeled alleged',()=>{
  for(const kind of ['budget-allocation','budget-expenditure','procurement-notice','contract-award','funding-release']) {
    const raw=fixture();raw.records.push({...structuredClone(raw.records[1]),id:'ordinary',kind,tier:'alleged'});
    rejects(raw,/ordinary spending context cannot be an allegation/);
  }
});

test('an amount without its accounting stage or fiscal period is inadmissible',()=>{
  for(const missing of ['stage','period','currency','unit']) {
    const raw=fixture(); const amount={value:50,currency:'INR',unit:'crore',stage:'Budget estimate',period:'FY2026–27'};delete amount[missing];
    raw.records[0].amounts=[amount];rejects(raw,/amount requires finite value, currency, unit, stage and period/);
  }
});

test('a legal outcome or denial cannot silently point to a missing source or entity',()=>{
  const sourceGap=fixture();sourceGap.records[1].sourceIds=['missing'];rejects(sourceGap,/missing local source/);
  const entityGap=fixture();entityGap.records[1].entityIds=['missing'];rejects(entityGap,/missing entity/);
});

test('an orphan graph endpoint and a duplicated raw identity block promotion',()=>{
  const orphan=fixture();orphan.relationships[0].to='missing';rejects(orphan,/missing local endpoint/);
  const duplicate=fixture();duplicate.entities.push(structuredClone(duplicate.entities[0]));rejects(duplicate,/duplicate raw entities identifiers/);
});

test('a case without a dated status, alternative explanation or falsifier is incomplete',()=>{
  const undated=fixture();undated.records[0].statusAsOf=null;rejects(undated,/current procedural status needs an as-of date/);
  for(const key of ['response','falsifier','alternativeExplanations']) {
    const raw=fixture();raw.records[0][key]=key==='alternativeExplanations'?[]:'';
    rejects(raw,/response, alternative and falsifier required/);
  }
});

test('a source-name mention cannot acquire a canonical legal-company bridge',()=>{
  const raw=fixture();Object.assign(raw.entities[1],{type:'source-mention',canonicalId:'legacy:entity:unverified-company'});
  raw.relationships[0].kind='attributed-procurement-mention';
  rejects(raw,/documentary source mention cannot carry a legal-identity bridge/);
});

test('a source-name mention cannot become a verified contract or payment endpoint',()=>{
  for(const kind of ['contract','payment','alleged-transfer']) {
    const raw=fixture();raw.entities[1].type='source-mention';raw.relationships[0].kind=kind;
    rejects(raw,/unresolved legal names may only support explicit documentary-mention edges/);
  }
});

test('a clearly qualified documentary mention preserves source evidence without a false legal identity',()=>{
  const raw=fixture();Object.assign(raw.entities[1],{type:'source-mention',label:'Vendor name in the source — legal entity unverified',identityBasis:'Exact textual mention only; no verified corporate registration or legal-entity merge'});
  raw.relationships[0].kind='attributed-procurement-mention';
  assert.deepEqual(validateMetroSlice(raw,'challenge'),[]);
});
