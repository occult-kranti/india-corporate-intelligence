import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareReadableCaseLabelGeometry as prepare } from './case-label-policy.mjs';
import { validateCaseLabelGeometry, assertCaseLabelReadability } from './case-label-readability.mjs';
import { CaseLabelGeometryError } from './case-label-coverage.mjs';
const file={id:'policy-fixture',nodes:[{id:'a',label:'A'},{id:'b',label:'Complete peripheral name'},{id:'c',label:'Complete offscreen name'}],edges:[{id:'r',from:'a',to:'b',role:'Complete relation role'}]};
const plaque=(id,left,width,natural,visible=true)=>({id,kind:'node',text:file.nodes.find(n=>n.id===id).label,visible,rect:{left,top:20,width,height:30},anchor:{x:left+width/2,y:35},lines:[{left:left+5,top:25,width:width-10,height:20}],textOverflow:'clip',lineClamp:'none',placement:'anchored',disposition:visible?'shown':'outside-view',naturalSizing:{measuredNaturalWidth:natural,widthMode:width===natural?'natural':'wrapped',probes:[0,200,399].map(x=>({x,width:natural,height:30}))}});
function fixture(){return{width:400,height:200,selection:'a',labels:[plaque('a',20,80,80),plaque('b',350,120,180,false)],leaders:[],credits:[],expectedNodeIds:['a','b'],expectedRoleIds:[],allFrameNodeIds:['a','b','c'],allFrameRoleIds:['r'],readerNodes:file.nodes.map(n=>({id:n.id,text:n.label})),readerRoles:file.edges.map(e=>({id:e.id,text:`Select relation: ${e.role}`})),fitControlAvailable:true,readerControlAvailable:true,policyNotice:{visible:true,nodeCount:2,roleCount:1,text:'2 node labels and 1 relation labels'},labelPolicy:{status:'ready',requireAll:false,board:{width:400,height:200},requiredNodeIds:['a'],requiredRoleIds:[],deferredNodes:[{id:'b',reason:'outside-view'},{id:'c',reason:'outside-view'}],deferredRoles:[{id:'r',reason:'outside-view'}],failures:[]}};}
const page=sample=>({locator(){return{async evaluate(){return structuredClone(sample);}};},async evaluate(){}});
const fatal=error=>error instanceof assert.AssertionError&&!(error instanceof CaseLabelGeometryError);

test('explicit off-view nodes and original-frame roles retain full semantic evidence before geometry filtering',async()=>{
 const s=fixture(),before=structuredClone(s),p=prepare(s,file);assert.deepEqual(p.sample.labels.map(n=>n.id),['a']);assert.deepEqual(s,before);assert.equal(validateCaseLabelGeometry(p.sample,file,p.options).labels,1);
 const result={};await assertCaseLabelReadability(page(s),file,result);assert.deepEqual(result.caseLabelReadabilitySamples[0].labels.map(n=>n.id),['a','b']);
});

test('short natural names are accepted without padding them to 96px',()=>{assert.doesNotThrow(()=>prepare(fixture(),file));});

test('below-minimum measured node geometry is collectable only after contracts pass',()=>{
 const s=fixture(),b=s.labels[1];b.rect.width=80;b.anchor.x=b.rect.left+40;
 assert.throws(()=>prepare(s,file),CaseLabelGeometryError);
});

for(const [name,mutate]of [
 ['changed hidden text',s=>s.labels[1].text='Abbreviation'],
 ['changed hidden node pin',s=>s.labels[1].anchor.x++],
 ['missing original node',s=>s.labels.pop()],
 ['unreported off-view source node',s=>s.labelPolicy.deferredNodes.pop()],
 ['required node deferral',s=>{s.labelPolicy.deferredNodes.push({id:'a',reason:'crowded'});s.labels[0].visible=false;s.labels[0].disposition='crowded';}],
 ['unknown deferred ID',s=>s.labelPolicy.deferredNodes.push({id:'unknown',reason:'outside-view'})],
 ['wrong exact omitted reader text',s=>s.readerNodes[1].text='Short'],
 ['wrong deferred count',s=>s.policyNotice.nodeCount=1],
 ['missing visible explanation',s=>s.policyNotice.visible=false],
 ['missing Complete reader access',s=>s.readerControlAvailable=false],
 ['stale measured board',s=>s.labelPolicy.board.width=500],
 ['insufficient report counted as scene',s=>s.labelPolicy.status='insufficient'],
 ['all-fit with any deferral',s=>{s.labelPolicy.requireAll=true;s.labelPolicy.requiredNodeIds=['a','b','c'];s.labelPolicy.requiredRoleIds=['r'];}],
 ])test(`${name} fails immediately`,async()=>{const s=fixture();mutate(s);await assert.rejects(()=>assertCaseLabelReadability(page(s),file,{}),fatal);});

test('mixed minimum geometry and later omitted-role reader fault fails immediately before collection',async()=>{
 const s=fixture(),b=s.labels[1];b.rect.width=80;b.anchor.x=b.rect.left+40;s.readerRoles=[];
 await assert.rejects(()=>assertCaseLabelReadability(page(s),file,{}),error=>fatal(error)&&/lacks exact reader control/.test(error.message));
});

test('mixed early plaque geometry and late hidden source mutation remains immediately fatal',async()=>{
 const s=fixture();s.labels[0].lines=[];s.labels[1].text='Wrong full text';
 await assert.rejects(()=>assertCaseLabelReadability(page(s),file,{}),error=>fatal(error)&&/exact full text/.test(error.message));
});

function displaced(){const s=fixture();s.expectedRoleIds=['r'];s.labels.push({id:'r',kind:'role',text:file.edges[0].role,visible:false,rect:{left:60,top:100,width:100,height:30},anchor:{x:110,y:80},lines:[{left:65,top:105,width:90,height:20}],textOverflow:'clip',lineClamp:'none',placement:'displaced',disposition:'crowded'});s.leaders=[{id:'r',x1:110,y1:80,x2:110,y2:100,visible:false}];s.labelPolicy.deferredRoles[0].reason='crowded';return s;}
test('deferred displaced role preserves exact hidden leader origin, identity and endpoint',async()=>{await assertCaseLabelReadability(page(displaced()),file,{});});
test('deferred displaced-role source and leader faults remain immediately fatal',async()=>{
 for(const mutate of [s=>s.labels.at(-1).text='Changed role',s=>s.leaders[0].x1++,s=>s.leaders[0].id='other',s=>s.leaders=[]]){const s=displaced();mutate(s);await assert.rejects(()=>assertCaseLabelReadability(page(s),file,{}),fatal);}
});
test('deferred displaced-role endpoint is checked before filtering and remains collectable geometry',async()=>{const s=displaced();s.leaders[0].y2=105;await assert.rejects(()=>assertCaseLabelReadability(page(s),file,{}),CaseLabelGeometryError);});
test('original LOD-absent roles do not become fictional outside-view omissions',()=>{const s=fixture();s.allFrameRoleIds=[];s.labelPolicy.deferredRoles=[];s.policyNotice.roleCount=0;assert.doesNotThrow(()=>prepare(s,file));});

test('deferred role cannot retain an orphan visible leader',async()=>{const s=displaced();s.leaders[0].visible=true;await assert.rejects(()=>assertCaseLabelReadability(page(s),file,{}),fatal);});
