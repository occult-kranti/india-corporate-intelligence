import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
const result=await build({stdin:{contents:"export * from './src/data/metroSpending';export { getAllegationsView } from './src/data/allegationsInvestigation';",resolveDir:fileURLToPath(new URL('../..',import.meta.url)),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,logLevel:'silent',target:'node24'});
const module={exports:{}};new Function('module','exports',result.outputFiles[0].text)(module,module.exports);
const {getMetroSpendingView,metroPlacement,metroRecordAmounts,searchMetroContext,getAllegationsView}=module.exports;
const source={id:'s',originalId:'s',namespace:'test',title:'Primary source',url:'https://example.gov.in/source',publisher:'Public institution',publishedAt:null,retrievedAt:null,locator:'Page 1',summary:'Primary evidence',tier:'documented',limitations:[]};
const geo=(localityIds=[],stateCodes=[],scope='city')=>({scope,stateCodes,localityIds,basis:scope==='national'?'national-context':'project-location',note:'Explicit source geography',sourceIds:['s']});
const dims={domains:['security'],layers:['funding'],sourceIds:['s'],limitations:[],route:'/allegations',geography:[geo()]};
const record=(id,patch={})=>({...dims,id,originalId:id,namespace:'metro-delhi-security',title:id,summary:'Public spending evidence',kind:'audit-finding',tier:'documented',status:'reviewed-audit-finding',statusAsOf:'2026-10-07',fromDate:'2024-01-01',toDate:null,dateBasis:'Source date',entityIds:[],relationshipIds:[],period:'2024-25',response:'Response retained',amounts:[],alternativeExplanations:[],falsifier:null,...patch});
const fixture=(records,patch={})=>({updatedAt:'2026-10-07',records,entities:[],relationships:[],sources:[source],states:[{code:'DL',name:'Delhi'},{code:'MH',name:'Maharashtra'}],localities:[{id:'d',originalId:'delhi',namespace:'test',name:'Delhi',stateCode:'DL',kind:'city',aliases:[]},{id:'m',originalId:'mumbai',namespace:'test',name:'Mumbai',stateCode:'MH',kind:'city',aliases:[]},{id:'p',originalId:'pune',namespace:'test',name:'Pune',stateCode:'MH',kind:'city',aliases:[]}],coverage:[],held:[],methodology:[],...patch});
const ids=rows=>rows.map(row=>row.id).sort();

test('Mumbai city filtering excludes Maharashtra-only, Pune and unplaced records',()=>{
 const registry=fixture([record('mumbai',{geography:[geo(['m'],['MH'])]}),record('pune',{geography:[geo(['p'],['MH'])]}),record('statewide',{geography:[geo([],['MH'],'state')]}),record('unplaced',{geography:[geo([],[],'unknown')]})]);
 assert.deepEqual(ids(getMetroSpendingView(registry,{}, {cohort:'all',city:'mumbai',includeNational:false}).entries),['mumbai']);
 assert.equal(metroPlacement(registry,[geo([],['MH'],'state')]).cities.length,0);
});

test('city membership never propagates from an endpoint headquarters or a name in the claim',()=>{
 const registry=fixture([record('Mumbai procurement text without locality',{entityIds:['office'],geography:[geo([],[],'unknown')]})],{entities:[{...dims,id:'office',originalId:'office',namespace:'test',label:'Mumbai headquarters',type:'institution',resolved:true,identityBasis:'Named source',summary:'Office only',geography:[geo(['m'],['MH'])]}]});
 assert.equal(getMetroSpendingView(registry,{}, {cohort:'all',city:'mumbai'}).entries.length,0);
});

test('national context stays explicit and optional without assigning a city budget',()=>{
 const registry=fixture([record('delhi',{geography:[geo(['d'],['DL'])]}),record('national',{namespace:'metro-defence',geography:[geo([],[],'national')]})]);
 const included=getMetroSpendingView(registry,{}, {cohort:'all',city:'delhi'});
 assert.deepEqual(ids(included.entries),['delhi','national']);assert.equal(included.nationalEntries,1);
 assert.deepEqual(metroPlacement(registry,registry.records[1].geography),{cities:[],stateContextCodes:[],national:true,label:'National context · no city allocation'});
 assert.deepEqual(ids(getMetroSpendingView(registry,{}, {cohort:'all',city:'delhi',includeNational:false}).entries),['delhi']);
});

test('default All reviewed preserves the existing claim population; topic lenses use exact review namespaces',()=>{
 const registry=fixture([record('police'),record('defence',{namespace:'metro-defence'}),record('funds',{namespace:'metro-public-finance'}),record('legacy-police-word',{namespace:'legacy',title:'Police defence funds'})]);
 assert.deepEqual(ids(getMetroSpendingView(registry,{}, {cohort:'all'}).entries),ids(getAllegationsView(registry,{}, {cohort:'all'}).entries));
 assert.deepEqual(ids(getMetroSpendingView(registry,{}, {cohort:'all',topic:'police'}).entries),['police']);
 assert.deepEqual(ids(getMetroSpendingView(registry,{}, {cohort:'all',topic:'defence'}).entries),['defence']);
 assert.deepEqual(ids(getMetroSpendingView(registry,{}, {cohort:'all',topic:'funds'}).entries),['funds']);
});

test('ordinary budget and tender records enter context and source closure without becoming allegations',()=>{
 const registry=fixture([record('finding'),record('budget',{kind:'budget-allocation',geography:[geo([],[],'national')]}),record('notice',{kind:'procurement-notice'}),record('award',{kind:'contract-award'}),record('unsourced',{kind:'budget-allocation',sourceIds:['absent']})]);
 const view=getMetroSpendingView(registry,{}, {cohort:'all'});
 assert.deepEqual(ids(view.entries),['finding']);assert.equal(view.counts.total,1);
 assert.deepEqual(ids(view.contextRecords),['award','budget','notice']);assert.equal(view.nationalContextRecords,1);
 assert.deepEqual(view.contextCounts,{allocations:1,notices:1,awards:1});assert.deepEqual(view.missingIds,[]);
 assert.deepEqual(ids(view.records),['award','budget','finding','notice']);
 assert.equal(getMetroSpendingView(registry,{}, {cohort:'retained'}).contextRecords.length,0);
});

test('a city-scoped claim keeps out-of-scope responses in closure but not in the selected index',()=>{
 const entities=['a','b'].map(id=>({...dims,id,originalId:id,namespace:'test',label:id,type:'institution',resolved:true,identityBasis:'Exact identity',summary:id}));
 const edge={...dims,id:'edge',originalId:'edge',namespace:'metro-delhi-security',from:'a',to:'b',kind:'audit-finding',label:'Audit finding',tier:'documented',status:'audit-finding',statusAsOf:null,fromDate:null,toDate:null,dateBasis:'Source date',summary:'Finding',alternativeExplanations:[],falsifier:null,responseIds:['response'],recordIds:['claim'],amounts:[]};
 const registry=fixture([record('claim',{geography:[geo(['d'],['DL'])],entityIds:['a','b'],relationshipIds:['edge']}),record('response',{kind:'response',geography:[geo([],[],'national')]})],{entities,relationships:[edge]});
 const view=getMetroSpendingView(registry,{}, {cohort:'all',city:'delhi',includeNational:false});
 assert.deepEqual(ids(view.entries),['claim']);assert.ok(view.records.some(row=>row.id==='response'));assert.deepEqual(view.missingIds,[]);
});

test('record amounts remain separate observations with original period and stage',()=>{
 const budget=record('budget',{amounts:[{value:123,currency:'INR',unit:'crore',stage:'budget estimate',period:'2024-25'},{value:75,currency:'INR',unit:'crore',stage:'actual expenditure',period:'2023-24'}]});
 assert.deepEqual(metroRecordAmounts(budget),['INR 123 crore · budget estimate · 2024-25','INR 75 crore · actual expenditure · 2023-24']);
});

test('state and city intersection is explicit; filter emptiness never restores the complete corpus',()=>{
 const registry=fixture([record('delhi',{geography:[geo(['d'],['DL'])]}),record('mumbai',{geography:[geo(['m'],['MH'])]})]);
 assert.equal(getMetroSpendingView(registry,{stateCode:'MH'}, {cohort:'all',city:'delhi',includeNational:false}).entries.length,0);
 assert.equal(getMetroSpendingView(registry,{q:'absent-registry-value'}, {cohort:'all'}).entries.length,0);
});

test('neutral tender cohorts use declared topic domains without becoming adverse claims',()=>{
 const records=[record('police-cohort',{namespace:'metro-tender-scan',kind:'procurement-context',domains:['security']}),record('defence-cohort',{namespace:'metro-tender-scan',kind:'procurement-context',domains:['security','defence-trade']}),record('municipal-cohort',{namespace:'metro-tender-scan',kind:'procurement-context',domains:['public-funds']}),record('unrelated-title',{namespace:'metro-tender-scan',title:'Police defence Mumbai budget',kind:'procurement-context',domains:['public-works']})],registry=fixture(records);
 assert.deepEqual(ids(getMetroSpendingView(registry,{}, {topic:'police'}).contextRecords),['police-cohort']);
 assert.deepEqual(ids(getMetroSpendingView(registry,{}, {topic:'defence'}).contextRecords),['defence-cohort']);
 assert.deepEqual(ids(getMetroSpendingView(registry,{}, {topic:'funds'}).contextRecords),['municipal-cohort']);
 assert.equal(getMetroSpendingView(registry).entries.length,0);
});


test('ordinary context search finds exact agency labels and cited source titles',()=>{
 const row=record('context',{kind:'budget-allocation',entityIds:['agency']}),registry=fixture([row],{entities:[{...dims,id:'agency',originalId:'agency',namespace:'test',label:'Exact public agency',type:'institution',resolved:true,identityBasis:'Named source',summary:'Agency'}]});
 assert.deepEqual(ids(searchMetroContext(registry,[row],'Exact public agency')),['context']);
 assert.deepEqual(ids(searchMetroContext(registry,[row],'Primary source')),['context']);
 assert.equal(searchMetroContext(registry,[row],'nonexistent agency').length,0);
});


test('optional statewide context includes only DL/MH relevant to the selected city without relabeling city membership',()=>{
 const registry=fixture([record('nct',{geography:[geo([],['DL'],'state')]}),record('maharashtra',{geography:[geo([],['MH'],'state')]}),record('other-state',{geography:[geo([],['TN'],'state')]}),record('national',{geography:[geo([],[],'national')]}),record('unknown-state-tag',{geography:[geo([],['MH'],'unknown')]})]);
 assert.deepEqual(ids(getMetroSpendingView(registry,{}, {cohort:'all',city:'delhi',includeNational:false}).entries),[]);
 const delhi=getMetroSpendingView(registry,{}, {cohort:'all',city:'delhi',includeNational:false,includeStateContext:true});
 assert.deepEqual(ids(delhi.entries),['nct']);assert.equal(delhi.stateEntries,1);assert.equal(delhi.nationalEntries,0);
 assert.equal(metroPlacement(registry,registry.records[0].geography).label,'NCT of Delhi statewide context · no city allocation');
 const mumbai=getMetroSpendingView(registry,{}, {cohort:'all',city:'mumbai',includeNational:false,includeStateContext:true});
 assert.deepEqual(ids(mumbai.entries),['maharashtra']);assert.deepEqual(metroPlacement(registry,registry.records[1].geography).cities,[]);
 assert.deepEqual(ids(getMetroSpendingView(registry,{}, {cohort:'all',city:'both',includeNational:false,includeStateContext:true}).entries),['maharashtra','nct']);
});

test('statewide ordinary budgets stay separate from claims and from national scope',()=>{
 const registry=fixture([record('budget',{kind:'budget-allocation',geography:[geo([],['DL'],'state')]}),record('national-budget',{kind:'budget-allocation',geography:[geo([],[],'national')]})]);
 const view=getMetroSpendingView(registry,{}, {cohort:'all',city:'delhi',includeNational:false,includeStateContext:true});
 assert.deepEqual(ids(view.contextRecords),['budget']);assert.equal(view.stateContextRecords,1);assert.equal(view.nationalContextRecords,0);assert.equal(view.entries.length,0);
 assert.deepEqual(view.missingIds,[]);
});
