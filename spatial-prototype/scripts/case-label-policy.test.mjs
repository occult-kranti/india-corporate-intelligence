import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareReadableCaseLabelGeometry as prepare } from './case-label-policy.mjs';
import { validateCaseLabelGeometry, assertCaseLabelReadability } from './case-label-readability.mjs';
import { CaseLabelGeometryError, createCaseLabelCoverage } from './case-label-coverage.mjs';
const file={id:'policy-fixture',nodes:[{id:'a',label:'A'},{id:'b',label:'Complete peripheral name'},{id:'c',label:'Complete offscreen name'}],edges:[{id:'r',from:'a',to:'b',role:'Complete relation role'}]};
const plaque=(id,left,width,natural,visible=true)=>({id,kind:'node',text:file.nodes.find(n=>n.id===id).label,visible,rect:{left,top:20,width,height:30},anchor:{x:left+width/2,y:35},lines:[{left:left+5,top:25,width:width-10,height:20}],textOverflow:'clip',lineClamp:'none',placement:'anchored',disposition:visible?'shown':'outside-view',naturalSizing:{measuredNaturalWidth:natural,widthMode:width===natural?'natural':'wrapped',probes:[0,200,399].map(x=>({x,width:natural,height:30}))}});
function fixture(){return{width:400,height:200,selection:'a',labels:[plaque('a',20,80,80),plaque('b',350,120,180,false)],leaders:[],credits:[],expectedNodeIds:['a','b'],expectedRoleIds:[],allFrameNodeIds:['a','b','c'],allFrameRoleIds:['r'],readerNodes:file.nodes.map(n=>({id:n.id,text:n.label})),readerRoles:file.edges.map(e=>({id:e.id,text:`Select relation: ${e.role}`})),fitControlAvailable:true,readerControlAvailable:true,policyNotice:{inViewport:true,inSceneBand:true,unobscured:true,visible:true,nodeCount:2,roleCount:1,text:'2 node labels and 1 relation labels'},labelPolicy:{status:'ready',requireAll:false,board:{width:400,height:200},requiredNodeIds:['a'],requiredRoleIds:[],deferredNodes:[{id:'b',reason:'outside-view'},{id:'c',reason:'outside-view'}],deferredRoles:[{id:'r',reason:'outside-view'}],failures:[]}};}
const page=sample=>({locator(){return{async evaluate(){return structuredClone(sample);}};},async evaluate(){}});
const fatal=error=>error instanceof assert.AssertionError&&!(error instanceof CaseLabelGeometryError);

test('explicit off-view nodes and original-frame roles retain full semantic evidence before geometry filtering',async()=>{
 const s=fixture(),before=structuredClone(s),p=prepare(s,file);assert.deepEqual(p.sample.labels.map(n=>n.id),['a']);assert.deepEqual(s,before);assert.equal(validateCaseLabelGeometry(p.sample,file,p.options).labels,1);
 const result={};await assertCaseLabelReadability(page(s),file,result);assert.deepEqual(result.caseLabelReadabilitySamples[0].labels.map(n=>n.id),['a','b']);assert.deepEqual(result.caseLabelReadabilityRepeatedSamples[0].labels.map(n=>n.id),['a','b']);
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
 ['missing associated explanation',s=>s.policyNotice=null],
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

test('native readable policy requires acknowledged host/layer agreement',()=>{
 for(const mutate of [s=>s.labelPolicy=null,s=>s.labelPublication='pending',s=>s.workspaceLabelPolicy=null,s=>s.workspaceLabelPolicy.deferredNodes=[]]){
  const s=fixture();s.labelPolicyName='readable-minimum';s.labelPublication='committed';s.workspaceLabelPolicy=structuredClone(s.labelPolicy);mutate(s);assert.throws(()=>prepare(s,file),fatal);
 }
});
test('second-read failure preserves the exact failing sample before validation',async()=>{
 const s=fixture(),bad=structuredClone(s);bad.policyNotice=null;let i=0;
 const p={locator(){return{async evaluate(){return structuredClone(i++?bad:s);}};},async evaluate(){}};
 const result={};await assert.rejects(()=>assertCaseLabelReadability(p,file,result),fatal);
 assert.deepEqual(result.caseLabelReadabilityRepeatedSamples[0].policyNotice,null);
 assert.equal(result.caseLabelReadabilitySamples[0].policyNotice.visible,true);
});

test('truthful pending observations are retained but only committed samples get scene credit',async()=>{
 const ready=fixture();ready.labelPolicyName='readable-minimum';ready.labelPublication='committed';ready.workspaceLabelPolicy=structuredClone(ready.labelPolicy);
 const pending=structuredClone(ready);pending.labelPublication='pending';pending.labelPolicy=null;pending.workspaceLabelPolicy=null;pending.policyNotice=null;for(const l of pending.labels){l.visible=true;l.disposition='shown';}
 let i=0;const p={locator(){return{async evaluate(){return structuredClone(i++?ready:pending);}};},async evaluate(){}};
 const result={};await assertCaseLabelReadability(p,file,result);assert.equal(result.caseLabelPendingSamples.length,1);assert.equal(result.caseLabelReadabilitySamples[0].labelPublication,'pending');assert.equal(result.caseLabelReadabilitySamples.at(-1).labelPublication,'committed');assert.equal(result.caseLabelReadabilityRepeatedSamples[0].labelPublication,'committed');
});
test('pending source mutations and hidden-before-notice states fail immediately',async()=>{
 for(const mutate of [s=>s.labels[0].text='Wrong source',s=>s.labels[0].anchor.x++,s=>s.labels[1].visible=false,s=>s.labels[1].disposition='outside-view']){
  const s=fixture();s.labelPolicyName='readable-minimum';s.labelPublication='pending';s.labelPolicy=null;for(const l of s.labels){l.visible=true;l.disposition='shown';}mutate(s);
  let reads=0;const p={locator(){return{async evaluate(){reads++;return structuredClone(s);}};},async evaluate(){}};await assert.rejects(()=>assertCaseLabelReadability(p,file,{}),fatal);assert.equal(reads,1);
 }
});

test('second-read semantic failure preserves the exact mutated sample before prepass',async()=>{
 const s=fixture(),bad=structuredClone(s);bad.labels[0].text='Changed source in repeated read';let i=0;
 const p={locator(){return{async evaluate(){return structuredClone(i++?bad:s);}};},async evaluate(){}};
 const result={};await assert.rejects(()=>assertCaseLabelReadability(p,file,result),fatal);assert.equal(result.caseLabelReadabilityRepeatedSamples[0].labels[0].text,'Changed source in repeated read');
});

test('native acceptance rejects missing/wrong markers and does not let pending identity errors heal',async()=>{
 for(const mutate of [s=>delete s.labelPolicyName,s=>s.labelPolicyName='other',s=>s.allFrameNodeIds=[],s=>s.allFrameRoleIds=['unknown'],s=>s.allFrameRoleIds=['r','r'],s=>s.leaders.push({id:'orphan'})]){
  const s=fixture();s.labelPolicyName='readable-minimum';s.labelPublication='pending';s.labelPolicy=null;for(const l of s.labels){l.visible=true;l.disposition='shown';}mutate(s);
  let reads=0;const p={locator(){return{async evaluate(){reads++;return structuredClone(s);}};},async evaluate(){}};const result={};await assert.rejects(()=>assertCaseLabelReadability(p,file,result,{requireReadablePolicy:true}),fatal);assert.equal(reads,1);assert.equal(result.caseLabelReadabilitySamples.length,1);
 }
});

for(const [name,mutate]of [
 ['hidden explanation',s=>s.policyNotice.visible=false],
 ['offscreen explanation',s=>s.policyNotice.inViewport=false],
 ['explanation outside scene controls',s=>s.policyNotice.inSceneBand=false],
 ['obscured explanation',s=>s.policyNotice.unobscured=false],
])test(`${name} is collectable presentation only after all source and count contracts pass`,async()=>{
 const s=fixture();mutate(s);const result={};await assert.rejects(()=>assertCaseLabelReadability(page(s),file,result),CaseLabelGeometryError);
 assert.deepEqual(result.caseLabelReadabilitySamples[0].policyNotice,s.policyNotice);
 for(const corrupt of [x=>x.policyNotice.nodeCount++,x=>x.labels[1].text='Changed source',x=>x.readerControlAvailable=false]){
  const mixed=structuredClone(s);corrupt(mixed);await assert.rejects(()=>assertCaseLabelReadability(page(mixed),file,{}),fatal);
 }
});
test('one real notice visibility failure across the exact 61 observations still fails final acceptance',async()=>{
 const ids=['case:usa-musk','case:public-office%2Findia-modi',...Array.from({length:17},(_,i)=>`case:${i}`)];
 const phases=id=>['initial','selected-node','selected-edge',...([ids[0],ids[1]].includes(id)?['selected-edge-after-source-dialog']:[]),...(id===ids[0]?['selected-edge-forced-colors','selected-edge-restored-colors']:[])];
 const captures=[],collector=createCaseLabelCoverage(ids,failure=>{captures.push(failure);return 'exact-notice-failure.png';});
 for(const id of ids)for(const phase of phases(id))await collector.observe(id,phase,()=>{
  const s=fixture();if(id===ids[8]&&phase==='selected-edge')s.policyNotice.visible=false;
  return prepare(s,file);
 });
 assert.equal(collector.observations.length,61);assert.equal(captures.length,1);assert.equal(collector.failures.length,1);
 assert.equal(captures[0].caseId,ids[8]);assert.equal(captures[0].phase,'selected-edge');
 assert.throws(()=>collector.finish(ids),/Label geometry failures remain \(1\)/);
});

test('second-read visible outside-anchor leader geometry is revalidated after immediate identity checks',async()=>{
 const f={id:'repeated-visible-role',nodes:[],edges:[{id:'r',role:'Exact complete relation'}]};
 const initial={width:400,height:200,selection:'',labels:[{id:'r',kind:'role',text:'Exact complete relation',visible:true,rect:{left:60,top:100,width:100,height:30},anchor:{x:110,y:80},lines:[{left:65,top:105,width:90,height:20}],textOverflow:'clip',lineClamp:'none',placement:'displaced',disposition:'shown'}],leaders:[{id:'r',x1:110,y1:80,x2:110,y2:100,visible:true}],credits:[],expectedNodeIds:[],expectedRoleIds:['r'],allFrameNodeIds:[],allFrameRoleIds:['r'],readerNodes:[],readerRoles:[{id:'r',text:'Select relation: Exact complete relation'}],fitControlAvailable:true,readerControlAvailable:true,labelPolicy:{status:'ready',requireAll:false,board:{width:400,height:200},requiredNodeIds:[],requiredRoleIds:[],deferredNodes:[],deferredRoles:[],failures:[]}};
 for(const [mutate,predicate]of [[s=>s.leaders[0].y2=999,CaseLabelGeometryError],[s=>{s.leaders[0].y2=999;s.leaders[0].x1++;},fatal],[s=>{s.leaders[0].y2=999;s.leaders[0].id='wrong';},fatal],[s=>{s.leaders[0].y2=999;s.labels[0].anchor.x++;s.leaders[0].x1++;},fatal]]){
  const repeated=structuredClone(initial);mutate(repeated);let i=0;const p={locator(){return{async evaluate(){return structuredClone(i++?repeated:initial);}};},async evaluate(){}};
  const result={};await assert.rejects(()=>assertCaseLabelReadability(p,f,result),predicate);assert.equal(result.caseLabelReadabilityRepeatedSamples[0].leaders[0].y2,999);
 }
});
