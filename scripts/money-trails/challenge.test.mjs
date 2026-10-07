import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadMoneyTrails } from './load.mjs';

// Independent editorial challenges: synthetic network traps and fixed source facts.
// No generated allegation or real-person inference is introduced by these fixtures.
const api = await loadMoneyTrails();
const text = value => JSON.stringify(value);
const ids = rows => rows.map(row => row.id).sort();
function fixture() {
  const source = {id:'source', namespace:'test', title:'Synthetic public source', url:'https://example.gov.in/document', publisher:'Fixture', publishedAt:'2025-01-01', retrievedAt:'2026-10-07', locator:'Paragraph 1', summary:'Fixture only', tier:'documented', limitations:[]};
  const dimensions = {namespace:'test', originalId:'fixture', sourceIds:['source'], geography:[], domains:['finance'], layers:['funding'], limitations:[], route:'/money-trails'};
  const date = {tier:'documented', status:'Source retained', statusAsOf:'2026-10-07', fromDate:null, toDate:null, dateBasis:'No transaction date inferred', amounts:[]};
  const entities = ['agency','vendor','owner','minister'].map(id=>({...dimensions,id,label:id,type:'institution',resolved:true,identityBasis:'Exact synthetic identity',summary:'Fixture only'}));
  const edge = (id,from,to,kind,patch={})=>({...dimensions,...date,id,from,to,kind,label:id,summary:'Fixture only',recordIds:['case'],responseIds:['response'],alternativeExplanations:['Unresolved'],falsifier:'Original records',...patch});
  const relationships=[edge('payment','agency','vendor','alleged-transfer',{tier:'alleged',amounts:[{value:10,currency:'INR',unit:'crore',stage:'Agency alleged release',period:'2024'}]}),edge('ownership','owner','vendor','ownership'),edge('office','minister','agency','official-role')];
  const records=[{...dimensions,...date,id:'case',title:'Synthetic trace',summary:'Case with financial and contextual evidence',kind:'investigation-case',entityIds:entities.map(row=>row.id),relationshipIds:relationships.map(row=>row.id),period:'2024',response:'Transfer disputed',alternativeExplanations:['Ordinary transaction'],falsifier:'Payment record'},{...dimensions,...date,id:'response',title:'Synthetic denial',summary:'No bank confirmation',kind:'response',entityIds:['vendor'],relationshipIds:[],period:'2024',response:'Transfer disputed',alternativeExplanations:[],falsifier:'Payment record'}];
  const hop=(id,patch={})=>({id,title:id,summary:'Fixture only',basis:'ownership-role-context',flowState:'context',fromEntityId:null,toEntityId:null,entityIds:[],relationshipIds:[],recordIds:[],sourceIds:['source'],sourceLocators:[{sourceId:'source',locator:'Paragraph 1',role:'supports'}],date:null,dateBasis:'Unknown transaction date',financialStage:'Context',amountRefs:[],responseRecordIds:['response'],counterEvidenceRecordIds:[],response:'No bank confirmation',alternatives:['Ordinary transaction'],missingNextDocument:'Payment certificate',documentHolder:'Agency',limitations:[],...patch});
  const hops=[hop('cash',{basis:'court-recorded-agency-allegation',flowState:'alleged-transfer',fromEntityId:'agency',toEntityId:'vendor',entityIds:['agency','vendor'],relationshipIds:['payment'],amountRefs:[{kind:'relationship',id:'payment',amountIndex:0}]}),hop('control',{entityIds:['owner','vendor'],relationshipIds:['ownership']}),hop('public-role',{entityIds:['minister','agency'],relationshipIds:['office']}),hop('stop',{basis:'unresolved-cash-path-stop',flowState:'gap',entityIds:['vendor']})];
  const catalog={schemaVersion:1,namespace:'test',cutoff:'2026-10-07',trails:[{id:'trail',title:'Synthetic trace',city:'delhi',caseRecordId:'case',question:'Was cash transferred?',conclusion:'Agency asserts a transfer; bank record absent',sourceStatus:'Attribution retained',cutoff:'2026-10-07',hopIds:hops.map(row=>row.id),hypothesisIds:[],limitations:[]}],hops,hypotheses:[]};
  return {registry:{updatedAt:'2026-10-07',entities,relationships,records,sources:[source],states:[],localities:[],coverage:[],held:[],methodology:[]},catalog};
}

test('a minister role and an ownership hop cannot masquerade as cash-path edges',()=>{
  const {registry,catalog}=fixture();const detail=api.getMoneyTrailDetail(registry,'trail',[catalog]);
  assert.deepEqual(ids(detail.pathRegistry.relationships),['payment']);
  assert.ok(!detail.pathRegistry.entities.some(row=>['owner','minister'].includes(row.id)));
  assert.deepEqual(ids(detail.contextRegistry.relationships),['office','ownership','payment']);
});

test('a linked case with ownership evidence keeps its context without promoting that closure into cash',()=>{
  const {registry,catalog}=fixture();const packet=api.exportMoneyTrailEvidence(registry,'trail',[catalog]);
  assert.ok(packet.records.some(row=>row.id==='response'));
  assert.ok(packet.relationships.some(row=>row.id==='ownership'));
  assert.equal(packet.hops.find(row=>row.id==='cash').flowState,'alleged-transfer');
  assert.equal(packet.hops.find(row=>row.id==='cash').basis,'court-recorded-agency-allegation');
  assert.deepEqual(packet.missingIds,[]);
});

test('a named ultimate recipient with no transaction record remains a stop, not a zero payment',()=>{
  const {registry,catalog}=fixture();const gap=catalog.hops.find(row=>row.id==='stop');
  gap.fromEntityId='vendor';gap.toEntityId='minister';
  const detail=api.getMoneyTrailDetail(registry,'trail',[catalog]);
  assert.deepEqual(detail.hops.find(row=>row.id==='stop').amounts,[]);
  assert.ok(!detail.pathRegistry.relationships.some(row=>row.from==='vendor'&&row.to==='minister'));
  assert.match(text(detail.hops.find(row=>row.id==='stop')),/Payment certificate/);
});

test('duplicate press and court references cannot create additional transaction amounts',()=>{
  const {registry,catalog}=fixture();
  registry.sources.push({...registry.sources[0],id:'court-recital',title:'Court quotes same agency'});
  catalog.hops[0].sourceIds.push('court-recital');
  catalog.hops[0].sourceLocators.push({sourceId:'court-recital',locator:'Agency case recital',role:'supports',sourceFamily:'same-agency-narrative'});
  const detail=api.getMoneyTrailDetail(registry,'trail',[catalog]);
  assert.equal(detail.hops[0].amounts.length,1);
  assert.equal(detail.hops[0].flowState,'alleged-transfer');
  assert.equal(detail.pathRegistry.relationships.length,1);
});

const readTopic = (topic,file='slice') => JSON.parse(readFileSync(`research/raw/money-trails/${topic}/${file}.json`,'utf8'));
const corporate=readTopic('corporate'), corporateCatalog=readTopic('corporate','trails');
const corpEdge=id=>{const row=corporate.relationships.find(row=>row.id===id);assert.ok(row,`Corporate edge ${id} retained`);return row;};
const corpHop=id=>{const row=corporateCatalog.hops.find(row=>row.id.endsWith(`:hop:${id}`));assert.ok(row,`Corporate hop ${id} retained`);return row;};

test('PFC sanction remains a commitment with the source-dated undrawn status',()=>{
  const edge=corpEdge('pfc-sanction'),hop=corpHop('pfc-sanction');
  assert.equal(edge.amounts[0].value,540.64);assert.equal(edge.amounts[0].unit,'crore');
  assert.match(text(edge),/not drawn|undrawn|drawal pending/i);assert.match(text(edge),/31 December 2025/);
  assert.equal(hop.flowState,'commitment');assert.notEqual(hop.flowState,'documented-transfer');
});

test('the port contribution belongs to an aggregate promoter cohort, not one owner',()=>{
  const edge=corpEdge('promoter-infusion');assert.equal(edge.amounts[0].value,79.48);
  assert.equal(edge.from,'hppl-promoters');assert.notEqual(edge.from,'gvpr');
  assert.match(text(edge),/equity.*unsecured loans|unsecured loans.*equity/i);
  assert.match(text(edge),/no split|not.*assign|unallocated|not.*allocate/i);
});

test('the direct-debit waterfall is a contract mechanism with no claimed consumer transfer',()=>{
  const hop=corpHop('meter-waterfall');assert.equal(hop.flowState,'commitment');
  assert.deepEqual(hop.amountRefs,[]);
  assert.deepEqual(corpEdge('consumer-ddf').amounts,[]);assert.deepEqual(corpEdge('ddf-priority').amounts,[]);
  assert.match(text(hop),/actual|not.*payment|mechanism/i);
});

test('ten distinct serial-prefix joins retain exactly five crore to each of two parties',()=>{
  const join=readTopic('corporate','bond-join'),purchase=readTopic('corporate','eci-purchase-selected').rows,redemption=readTopic('corporate','eci-redemption-selected').rows;
  const expected=['15928','15930','15932','15934','15936','16988','16990','16992','16994','16996'];
  assert.deepEqual(join.rows.map(row=>row.bondNumber).sort(),expected);
  assert.equal(new Set(join.rows.map(row=>`${row.prefix}:${row.bondNumber}`)).size,10);
  const totals={};
  for(const row of join.rows){
    assert.equal(row.prefix,'OC');assert.equal(row.denominationINR,10000000);
    const p=purchase.filter(x=>x.prefix===row.prefix&&x.bondNumber===row.bondNumber),r=redemption.filter(x=>x.prefix===row.prefix&&x.bondNumber===row.bondNumber);
    assert.equal(p.length,1);assert.equal(r.length,1);assert.equal(p[0].denominationINR,r[0].denominationINR);
    assert.equal(r[0].partyLabel,row.partyLabel);assert.equal(p[0].donorLabel,'GVPR ENGINEERS LTD');
    totals[row.partyLabel]=(totals[row.partyLabel]??0)+row.denominationINR;
  }
  assert.deepEqual(totals,{'BHARATIYA JANATA PARTY':50000000,'PRESIDENT, ALL INDIA CONGRESS COMMITTEE':50000000});
  assert.match(text(join.sources),/mirror/);assert.match(text(join.sources),/406/);
});

test('a donor-label identity gap cannot create a legal-company or tender-to-donation edge',()=>{
  const donor=corporate.entities.find(row=>row.id==='donor-label');assert.ok(donor);
  assert.equal(donor.type,'source-mention');assert.ok(!donor.canonicalId);
  assert.equal(corpEdge('bond-bjp').from,'donor-label');assert.equal(corpEdge('bond-aicc').from,'donor-label');
  assert.ok(!corporate.relationships.some(row=>(row.from==='donor-label'&&row.to==='gvpr')||(row.from==='gvpr'&&['donor-label','bjp','aicc'].includes(row.to))));
  for(const id of ['donor-identity-stop','donor-cash-stop']){
    const gap=corpHop(id);assert.equal(gap.flowState,'gap');assert.deepEqual(gap.relationshipIds,[]);assert.deepEqual(gap.amountRefs,[]);
  }
});

const mumbai=readTopic('mumbai'),mumbaiCatalog=readTopic('mumbai','trails');
const mumbaiRecord=id=>{const row=mumbai.records.find(row=>row.id===id);assert.ok(row,`Mumbai record ${id} retained`);return row;};

test('Mumbai individual receipt, overlapping allegation and attached property remain three stages',()=>{
  const personal=mumbai.relationships.find(row=>row.id==='force-chavan'),aggregate=mumbaiRecord('khichdi-trace'),attachment=mumbaiRecord('attachment-outcome');
  assert.equal(personal.amounts[0].value,1.25);assert.equal(personal.tier,'alleged');
  assert.equal(aggregate.amounts[0].value,1.35);assert.match(aggregate.amounts[0].stage,/overlap|not.*add/i);
  assert.equal(attachment.amounts[0].value,88.515);assert.equal(attachment.amounts[0].unit,'lakh');
  assert.match(attachment.amounts[0].stage,/not.*receipt.*recovery|not.*recovery/i);
  assert.ok(!mumbai.relationships.some(row=>row.amounts.some(amount=>amount.value===1.35)),'Combined benefit is not duplicated as account-to-account transfers');
});

test('Mumbai attachment outcome preserves trial scope and the rejected salary/loan response',()=>{
  const outcome=mumbaiRecord('attachment-outcome'),response=mumbaiRecord('tribunal-response');
  assert.match(text(outcome),/trial concludes|conclusion of trial|pending trial/i);
  assert.match(text(outcome),/not.*conviction|not.*criminal/i);
  assert.match(text(response),/salary/);assert.match(text(response),/loan/);assert.match(text(response),/appointment|repayment/);
  const hop=mumbaiCatalog.hops.find(row=>row.id.endsWith(':hop:attachment'));assert.equal(hop.flowState,'context');assert.equal(hop.basis,'judicial-procedural-finding');
});

test('the earlier Mumbai bail assessment survives the later attachment narrative',()=>{
  const counter=mumbaiRecord('bail-counter'),outcome=mumbaiRecord('bail-outcome'),edge=mumbai.relationships.find(row=>row.id==='force-chavan');
  assert.match(text(counter),/licen[cs]/i);assert.match(text(counter),/underweight/);assert.match(text(counter),/bail/);
  assert.match(text(outcome),/May 2025|2025-05/);
  for(const id of ['tribunal-response','bail-counter','bail-outcome','attachment-outcome'])assert.ok(edge.responseIds.includes(id),`Personal-receipt allegation retains ${id}`);
});

test('additional Mumbai routes retain the precise alleged transfers without recasting them as bank inspection',()=>{
  const rupees=amount=>amount.value*({crore:10000000,lakh:100000,rupees:1,INR:1}[amount.unit]??1);
  const values=mumbai.relationships.filter(row=>['alleged','reported'].includes(row.tier)).flatMap(row=>row.amounts.map(rupees));
  for(const amount of [26500000,4500000,41473000,8205000])assert.ok(values.some(value=>Math.abs(value-amount)<0.01),`Exact source transfer ${amount} is retained`);
  for(const hop of mumbaiCatalog.hops.filter(row=>row.flowState==='alleged-transfer'))assert.equal(hop.basis,'court-recorded-agency-allegation');
});

const djb=readTopic('djb');
const djbRecord=id=>{const row=djb.records.find(row=>row.id===id);assert.ok(row,`DJB record ${id} retained`);return row;};
const djbEdge=id=>{const row=djb.relationships.find(row=>row.id===id);assert.ok(row,`DJB relationship ${id} retained`);return row;};

test('DJB exact gross release remains an ECIR assertion instead of independently verified cash',()=>{
  const released=djbEdge('released');assert.equal(released.amounts[0].value,247471376);assert.equal(released.amounts[0].unit,'rupee');
  assert.equal(released.tier,'alleged');assert.equal(released.fromDate,null);
  assert.match(text(released),/agency|ECIR/i);assert.match(text(released),/not independently bank|not.*bank.verified/i);
  assert.notEqual(released.amounts[0].stage,djbEdge('award').amounts[0].stage);
});

test('DJB attachment preserves the excluded spouse share and does not assert a traced asset purchase',()=>{
  const excluded=djbRecord('wife-excluded'),outcome=djbRecord('attachment-outcome'),attachment=djbEdge('attachment');
  assert.match(text(excluded),/Poonam/);assert.match(text(excluded),/not attached|not under attachment/i);
  assert.match(text(outcome),/equivalent.value/i);assert.match(text(outcome),/not.*proof|not.*criminal/i);
  assert.equal(attachment.amounts[0].value,16295503);assert.match(attachment.amounts[0].stage,/not.*traced.*cash recovered/i);
  assert.ok(attachment.responseIds.includes('wife-excluded'));
  assert.ok(!djb.relationships.some(row=>row.to==='poonam'&&/payment|transfer|benefit/.test(row.kind)));
});

test('DJB political route never assigns the combined official-and-party pool to AAP or a minister',()=>{
  const route=djbEdge('party-route'),gap=djbRecord('political-allocation-gap');
  assert.equal(route.to,'aap');assert.equal(route.tier,'alleged');assert.deepEqual(route.amounts,[]);
  assert.ok(route.responseIds.includes('party-denial'));assert.ok(route.responseIds.includes('political-allocation-gap'));
  assert.match(text(gap),/other DJB officials.*AAP|AAP.*other DJB officials/i);
  assert.match(text(gap),/split|allocat/i);assert.match(text(gap),/minister/i);
});

test('DJB preserves conflicting execution-cost accounts instead of calculating an invented loss',()=>{
  const conflict=djbRecord('cost-scope-conflict');
  assert.match(text(conflict),/17/);assert.match(text(conflict),/14/);
  assert.match(text(conflict),/scope|tax|valuation/i);assert.match(text(conflict),/not.*subtract|do not subtract/i);
  assert.ok(!djb.relationships.some(row=>/loss|diverted/.test(row.kind)&&row.amounts.some(amount=>amount.value===21||amount.value===24)));
});

test('DJB component arithmetic does not silently replace contradictory units or become another loss total',()=>{
  const reconciliation=djbRecord('reconciliation');
  assert.equal(63627191+42645503,106272694);assert.equal(42645503-(19000000+7350000),16295503);
  assert.equal(reconciliation.amounts[0].value,106272694);
  assert.match(reconciliation.amounts[0].stage,/aggregate/);assert.match(reconciliation.amounts[0].stage,/must not be added/);
  assert.match(text(reconciliation.limitations),/2\.63.*lakh.*2,63,50,000/s);
  assert.match(text(reconciliation.limitations),/discrepancy|inconsisten|conflict/i);
});
