import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const raw=readFileSync(new URL('../../src/components/investigation/graphHelpers.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(raw,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ES2020}}).outputText;
const {investigationGraphSlice,investigationEdgePaths,investigationGraphCsv,isTraversalRelationship,investigationRelationshipDate}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const node=(id,resolved=true)=>({id,label:id,resolved,identityBasis:`Exact registry identity ${id}`,type:'company'});
const edge=(id,from,to,patch={})=>({id,from,to,kind:'role',tier:'documented',namespace:'test',label:id,status:'recorded',statusAsOf:null,fromDate:null,toDate:null,dateBasis:'Not established',summary:'A sourced relationship, not an influence claim',sourceIds:['s'],responseIds:[],alternativeExplanations:[],falsifier:null,limitations:['No causal inference'],geography:[],amounts:[],...patch});
const sources=[{id:'s',title:'Statutory record',url:'https://example.gov.in/record',publishedAt:'2024-01-02',locator:'Page 10',retrievedAt:'2026-10-06'}];

test('graph excludes unresolved or unsourced endpoints, and does not use analytic/denial links to expand',()=>{
 const nodes=['a','b','c','d','e','unresolved'].map(id=>node(id,id!=='unresolved'));
 const edges=[edge('ab','a','b'),edge('bc','b','c'),edge('analytic','a','d',{tier:'analytic'}),edge('denial','a','e',{kind:'contra'}),edge('invalid','a','unresolved'),edge('no-source','a','c',{sourceIds:[]}),edge('missing-source','a','c',{sourceIds:['absent']})];
 const one=investigationGraphSlice(nodes,edges,sources,'a',1);
 assert.deepEqual(new Set(one.entities.map(x=>x.id)),new Set(['a','b']));assert.equal(one.excludedRelationships,3);
 const two=investigationGraphSlice(nodes,edges,sources,'a',2);
 assert.deepEqual(new Set(two.entities.map(x=>x.id)),new Set(['a','b','c']));
 assert.deepEqual(two.ledger.map(x=>x.id),['ab','bc']);
 assert.equal(isTraversalRelationship(edge('sup','a','b',{kind:'supersede'})),false);
 assert.equal(isTraversalRelationship(edge('self','a','b',{tier:'self-reported'})),true);
});
test('bounded preview retains selected focus and complete ledger; order is reproducible',()=>{
 const nodes=[node('hub'),...Array.from({length:200},(_,i)=>node(`n${String(i).padStart(3,'0')}`))];
 const edges=nodes.slice(1).map(n=>edge(`e-${n.id}`,'hub',n.id));
 const first=investigationGraphSlice(nodes,edges,sources,'hub',1);
 const second=investigationGraphSlice([...nodes].reverse(),[...edges].reverse(),sources,'hub',1);
 assert.equal(first.entities.length,80);assert.equal(first.totalEntities,201);assert.equal(first.ledger.length,200);assert.equal(first.truncated,true);
 assert.equal(first.entities[0].id,'hub');assert.deepEqual(first.entities.map(x=>x.id),second.entities.map(x=>x.id));assert.deepEqual(first.relationships,second.relationships);
});
test('explicit path edges are retained outside focus and disclosed without inventing joins',()=>{
 const nodes=['a','b','c','d','isolated'].map(id=>node(id));const edges=[edge('ab','a','b'),edge('bc','b','c'),edge('cd','c','d')];
 const result=investigationGraphSlice(nodes,edges,sources,'a',1,['bc','cd']);
 assert.equal(result.priorityOutsideFocus,2);assert.deepEqual(result.omittedPriorityIds,[]);assert.deepEqual(new Set(result.entities.map(x=>x.id)),new Set(['a','b','c','d']));
 assert.ok(!result.entities.some(x=>x.id==='isolated'));
 const bounded=investigationGraphSlice(nodes,edges,sources,'a',1,['bc','cd'],{entities:2,relationships:1});assert.ok(bounded.omittedPriorityIds.length>0);
});
test('unavailable focus is explicit and disconnected exact focus stays visible',()=>{
 const nodes=[node('a'),node('b')];
 assert.equal(investigationGraphSlice(nodes,[],sources,'absent',2).invalidSelection,true);
 const empty=investigationGraphSlice(nodes,[],sources,'a',2);assert.deepEqual(empty.entities.map(x=>x.id),['a']);assert.equal(empty.relationships.length,0);
});
test('parallel, reciprocal and self-loop edge paths are distinct and stable',()=>{
 const points=new Map([['a',{x:100,y:100}],['b',{x:500,y:200}]]);
 const edges=[edge('1','a','b'),edge('2','b','a'),edge('3','a','b'),edge('4','a','a'),edge('5','a','a')];
 const paths=investigationEdgePaths(edges,points);assert.equal(paths.size,5);assert.equal(new Set(paths.values()).size,5);
 assert.deepEqual([...paths],[...investigationEdgePaths([...edges].reverse(),points)]);
 assert.ok([...paths.values()].every(path=>!path.includes('NaN')));
});
test('CSV carries identity, evidence, source, responses and monetary stage; formula payloads neutralized',()=>{
 const nodes=[{...node('a'),label:'=FORMULA()'},node('b')];
 const csv=investigationGraphCsv(nodes,[edge('ab','a','b',{responseIds:['denial'],amounts:[{value:5,currency:'INR',unit:'crore',stage:'committed',period:'2024'}]})],sources);
 for(const needle of ["'=FORMULA()",'Exact registry identity a','documented','Page 10','https://example.gov.in/record','2024-01-02','2026-10-06','denial','committed','No causal inference'])assert.ok(csv.includes(needle),needle);
 assert.equal(investigationRelationshipDate({fromDate:null,toDate:null}),'Dates unknown');
 assert.equal(investigationRelationshipDate({fromDate:'2024-01-01',toDate:null}),'2024-01-01 – end unknown');
});
test('map has exactly the current36 LGD identities and allmultipart geometry with traceable licence',()=>{
 const map=JSON.parse(readFileSync(new URL('../../src/components/investigation/assets/india-current36.json',import.meta.url)));
 const codes=map.states.map(state=>state.code);
 assert.equal(codes.length,36);assert.equal(new Set(codes).size,36);
 assert.ok(codes.includes('LA'));assert.ok(codes.includes('JK'));assert.ok(codes.includes('DN'));assert.ok(!codes.includes('DD'));
 assert.equal(map.states.find(x=>x.code==='LA').lgdCode,37);assert.equal(map.states.find(x=>x.code==='DN').lgdCode,38);
 assert.equal(map.provenance.license,'CC0-1.0');assert.match(map.provenance.sourceSha256,/^[a-f0-9]{64}$/);
 assert.equal(map.states.reduce((n,state)=>n+state.parts,0),832);
 for(const state of map.states){assert.ok(state.path.startsWith('M'));assert.ok(state.path.length>25);assert.ok(Number.isFinite(state.x)&&Number.isFinite(state.y));assert.ok(state.x>0&&state.x<640&&state.y>0&&state.y<720);}
});

test('label placement never overlaps labels or node symbols across mobile and desktop zoom levels',async()=>{
 const {investigationGraphLabels}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
 const nodes=Array.from({length:30},(_,i)=>({...node(`n${i}`),label:`A long institution name ${i}`,namespace:'test'}));
 const points=new Map(nodes.map((n,i)=>[n.id,{x:160+(i%6)*165,y:100+Math.floor(i/6)*120}]));
 for(const zoom of [.35,.65,1,1.6]){const labels=investigationGraphLabels(nodes,points,{zoom,width:1300,height:800,showAll:true,priorityIds:['n14']});assert.ok(labels.length>0);for(let a=0;a<labels.length;a++)for(let b=a+1;b<labels.length;b++){const x=labels[a],y=labels[b];assert.ok(!(x.x<y.x+y.width&&x.x+x.width>y.x&&x.y<y.y+y.height&&x.y+x.height>y.y),`${zoom}: ${x.id} overlaps ${y.id}`);}assert.deepEqual(labels,investigationGraphLabels([...nodes].reverse(),points,{zoom,width:1300,height:800,showAll:true,priorityIds:['n14']}));}
});

test('CSV includes supplied response text and response-only provenance without a quadratic full-registry scan',()=>{const responseSource={...sources[0],id:'response-source',title:'Respondent original filing',url:'https://example.gov.in/response'},response={id:'denial',title:'Company reply',summary:'The company disputes the allegation',response:'Read the filed denial',sourceIds:['response-source'],geography:[]};const csv=investigationGraphCsv([node('a'),node('b')],[edge('ab','a','b',{responseIds:['denial']})],[...sources,responseSource],[response]);assert.ok(csv.includes('The company disputes the allegation'));assert.ok(csv.includes('https://example.gov.in/response'));assert.ok(csv.includes('missing_response_ids'));});
