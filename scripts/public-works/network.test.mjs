import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

const source=readFileSync(new URL('../../src/components/public-works/network.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ES2020}}).outputText;
const {publicWorksNeighbourhood,relationshipDate,relationshipIsDirected,publicWorksNetworkCsv}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const nodes=['buyer','contractor','parent','party','unrelated','unresolved'].map(id=>({id,label:id,resolved:id!=='unresolved'}));
const edge=(id,from,to)=>({id,from,to,kind:'owns',tier:'documented',sourceIds:['record'],fromDate:null,toDate:null,summary:'Recorded relationship',limitations:['No causal implication']});
const edges=[edge('award','buyer','contractor'),edge('ownership','parent','contractor'),edge('contribution','parent','party'),edge('invalid','party','unresolved'),edge('missing','buyer','absent')];

test('one step traverses incoming and outgoing adjacency without rewriting directed relationships',()=>{
 const graph=publicWorksNeighbourhood(nodes,edges,'contractor',1);
 assert.deepEqual(graph.nodes.map(x=>x.id),['buyer','contractor','parent']);
 assert.deepEqual(graph.edges.map(x=>[x.from,x.to]),[['buyer','contractor'],['parent','contractor']]);
});
test('two steps add only supported paths, excluding unresolved and missing endpoints',()=>{
 const graph=publicWorksNeighbourhood(nodes,edges,'contractor',2);
 assert.deepEqual(graph.nodes.map(x=>x.id),['buyer','contractor','parent','party']);
 assert.equal(graph.edges.length,3);
 assert.ok(!graph.edges.some(x=>x.id==='invalid'||x.id==='missing'));
});
test('unavailable focus stays explicit; all view never admits unresolved endpoints',()=>{
 const graph=publicWorksNeighbourhood(nodes,edges,'not-in-filter',2);
 assert.equal(graph.invalidSelection,true);
 assert.equal(graph.nodes.length,5);
 assert.equal(graph.edges.length,3);
 assert.equal(publicWorksNeighbourhood(nodes,edges,'',1).invalidSelection,false);
});
test('disconnected selected identity is retained without invented links',()=>{
 const graph=publicWorksNeighbourhood(nodes,edges,'unrelated',2);
 assert.deepEqual(graph.nodes.map(x=>x.id),['unrelated']);assert.deepEqual(graph.edges,[]);
});
test('date labels expose unknown boundaries instead of projecting historical roles to present',()=>{
 assert.equal(relationshipDate(edge('x','a','b')),'Relationship dates not established');
 assert.equal(relationshipDate({...edge('x','a','b'),fromDate:'2024-06-10'}),'From 2024-06-10; end not established');
 assert.equal(relationshipDate({...edge('x','a','b'),fromDate:'2024-03-31',toDate:'2024-03-31'}),'2024-03-31');
 assert.equal(relationshipDate({...edge('x','a','b'),toDate:'2024-03-31'}),'Start not established; to 2024-03-31');
});
test('exports preserve IDs, direction, tiers, scope limitations and citation dates; formulas neutralized',()=>{
 const csv=publicWorksNetworkCsv([{id:'a',label:'=HYPERLINK("bad")',identityBasis:'Exact statutory filing identity'},{id:'b',label:'Recipient'}],[{...edge('id','a','b'),summary:'Two, things\nand "quotes"',sourceIds:['record']}],[{id:'record',url:'https://example.gov.in/report.pdf',publishedAt:'2024-08-01',period:'FY2023-24',locator:'Page26,Note24',retrievalStatus:'Original PDF read',retrievedAt:'2026-10-06'}]);
 assert.ok(csv.includes('"\'=HYPERLINK(""bad"")"'));
 assert.ok(csv.includes('"Two, things\nand ""quotes"""'));
 assert.ok(csv.includes('"https://example.gov.in/report.pdf"'));
 assert.ok(csv.includes('"2024-08-01"'));
 assert.ok(csv.includes('"No causal implication"'));
 assert.ok(csv.includes('"documented"'));
 assert.ok(csv.includes('"from-to"'));
 assert.ok(csv.includes('"Exact statutory filing identity"'));
 assert.ok(csv.includes('"FY2023-24"'));
 assert.ok(csv.includes('"Page26,Note24"'));
 assert.ok(csv.includes('"Original PDF read"'));
 assert.ok(csv.includes('"2026-10-06"'));
 assert.equal(relationshipIsDirected('family'),false);assert.equal(relationshipIsDirected('role'),true);
});
