import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {dir,load} from './test-tools.mjs';
const {getCaseCatalog,getCase}=await load('catalog-bridge.ts');
const {initialNavigation,navigateCase}=await load('navigation.ts');
const {createCaseSceneModel,presentCaseScene,cubicPoint,curveClearsOtherCards,SCENE_BUDGET}=await load('layout.ts');
const {initialSceneState,reduceCaseScene,sampleCamera,homeCamera,orthographicFrame}=await load('state.ts');
const catalog=getCaseCatalog();
const clone=v=>JSON.parse(JSON.stringify(v));
const file=getCase('profile:usa-musk'),model=createCaseSceneModel(file);
const step=(state,action,at=0)=>reduceCaseScene(file,model,state,action,at);

test('all 19 reviewed cases: exactly 91 unique nodes, 73 explicit spokes, 72 retained claims',()=>{
 assert.equal(catalog.cases.length,19);
 assert.equal(catalog.cases.reduce((n,f)=>n+createCaseSceneModel(f).nodes.length,0),91);
 assert.equal(catalog.cases.reduce((n,f)=>n+createCaseSceneModel(f).threads.length,0),73);
 assert.equal(catalog.cases.reduce((n,f)=>n+createCaseSceneModel(f).evidence.length,0),72);
 assert.equal(Math.max(...catalog.cases.map(f=>f.nodes.length)),8);
 assert.equal(Math.max(...catalog.cases.map(f=>f.edges.length)),11);
});
test('layout is deterministic and neither source inputs nor model coordinates change during selection',()=>{
 for(const f of catalog.cases){const before=JSON.stringify(f),m=createCaseSceneModel(f);assert.deepEqual(m,createCaseSceneModel(clone(f)));assert.equal(JSON.stringify(f),before);
 const coords=JSON.stringify(m.nodes.map(n=>n.position));let nav=initialNavigation(f);
 for(const n of f.nodes){nav=navigateCase(f,nav,{type:'select-node',id:n.id});presentCaseScene(m,nav,4);}
 assert.equal(JSON.stringify(m.nodes.map(n=>n.position)),coords);}
});
test('review integrity rejects forged geographic, admission, endpoint and qualification changes',()=>{
 for(const mutate of [f=>f.nodes[0].latitude=1,f=>f.nodes[0].canonicalEntityId='invented',f=>f.edges[0].to='new',f=>f.claims[0].alwaysVisibleQualification='',f=>f.pathEligible=true]){
  const f=clone(file);mutate(f);assert.throws(()=>createCaseSceneModel(f),/reviewed/);
 }
});
test('each thread retains directed endpoint IDs, exact predicate roles and uniform width',()=>{
 for(const f of catalog.cases){const m=createCaseSceneModel(f);for(const t of m.threads){const original=f.edges.find(e=>e.id===t.record.id);assert.deepEqual(t.record,original);
 assert.deepEqual(t.points[0],m.nodes.find(n=>n.record.id===original.from).position);assert.deepEqual(t.points[3],m.nodes.find(n=>n.record.id===original.to).position);
 assert.equal(t.widthCssPx,1.5);assert.equal(t.arrow,'static_at_target');assert.deepEqual(cubicPoint(t,0),t.points[0]);assert.deepEqual(cubicPoint(t,1),t.points[3]);}}
});
test('reader-only rows create no extra pin or string, including undrawn amounts and capacity',()=>{
 let total=0;for(const f of catalog.cases){const m=createCaseSceneModel(f);for(const id of f.readerFactIds){total++;assert.ok(!m.threads.some(t=>t.record.claimId===id));assert.ok(!m.nodes.some(n=>n.record.claimIds.includes(id)));}}assert.equal(total,13);
});
test('group, unresolved, joint-block endpoints are distinct lanes and retain exact labels',()=>{
 for(const f of catalog.cases){const m=createCaseSceneModel(f);for(const node of m.nodes){assert.deepEqual(node.record,f.nodes.find(n=>n.id===node.record.id));
 assert.equal(node.lane,['group_label','unresolved_endpoint','joint_block'].includes(node.record.kind)?node.record.kind:'reviewed_endpoint');}}
 const slim=createCaseSceneModel(getCase('profile:mexico-slim'));assert.equal(new Set(slim.nodes.map(n=>n.layoutIsland)).size,3);
 const rinehart=createCaseSceneModel(getCase('profile:australia-rinehart'));assert.equal(new Set(rinehart.nodes.map(n=>n.layoutIsland)).size,2);
});
test('shared blocks remain one non-additive identity, without individual allocation or synthetic node',()=>{
 for(const f of catalog.cases){const m=createCaseSceneModel(f);assert.deepEqual(m.sharedBlocks,f.sharedBlocks);assert.equal(m.nodes.length,f.nodes.length);
 for(const b of m.sharedBlocks){assert.equal(b.individualAllocations,null);assert.match(b.aggregation,/^non_additive_/);}}
 const trump=createCaseSceneModel(getCase('profile:usa-trump'));assert.equal(trump.sharedBlocks.length,1);assert.equal(trump.threads.length,5);
});
test('no profile-to-company bridge or cross-case merged node is manufactured',()=>{
 for(const profile of ['france-arnault','india-adani','usa-musk','russia-potanin']){const f=getCase('profile:'+profile),m=createCaseSceneModel(f);assert.ok(m.nodes.every(n=>n.record.kind!=='person'));assert.deepEqual(m.threads.map(t=>t.record.id),f.edges.map(e=>e.id));}
 const ids=catalog.cases.flatMap(f=>createCaseSceneModel(f).nodes.map(n=>n.record.id));assert.equal(new Set(ids).size,91);
});
test('full claim/source envelopes survive every detail level; selected relation caveats never depend on zoom',()=>{
 for(const f of catalog.cases){const m=createCaseSceneModel(f);for(const edge of f.edges){const nav=navigateCase(f,initialNavigation(f),{type:'select-edge',id:edge.id});
 for(const zoom of [0.7,1.5,4]){const p=presentCaseScene(m,nav,zoom),e=p.qualificationRail.find(e=>e.claim.claimId===edge.claimId);assert.deepEqual(e.claim,f.claims.find(c=>c.claimId===edge.claimId));assert.deepEqual(e.sources,f.sources.filter(s=>e.claim.sourceIds.includes(s.id)));assert.ok(p.threads.some(t=>t.record.id===edge.id&&t.selected));}}}
});
test('multi-role claim has one evidence envelope while each spoke retains its explicit role',()=>{
 const f=getCase('profile:india-adani'),m=createCaseSceneModel(f);let nav=initialNavigation(f);nav=navigateCase(f,nav,{type:'reveal-more'});const p=presentCaseScene(m,nav,1);
 assert.equal(p.threads.length,4);assert.equal(p.qualificationRail.length,2);assert.equal(new Set(p.threads.map(t=>t.record.role)).size,4);
});
test('visible strings have same shared navigation as accessible list; hidden count and selection are honest',()=>{
 let nav=initialNavigation(file);assert.equal(presentCaseScene(model,nav,1).threads.length,4);
 nav=navigateCase(file,nav,{type:'select-edge',id:file.edges[5].id});assert.equal(presentCaseScene(model,nav,1).threads.length,1);
 nav=navigateCase(file,nav,{type:'reveal-more'});assert.ok(presentCaseScene(model,nav,1).threads.some(t=>t.record.id===file.edges[5].id));
 assert.throws(()=>presentCaseScene(model,{...nav,caseId:'wrong'},1));assert.throws(()=>presentCaseScene(model,{...nav,visibleEdgeIds:['unknown']},1));
 assert.throws(()=>presentCaseScene(model,{...nav,visibleEdgeIds:[]},1));
});
test('neighbor hidden count excludes unrelated case spokes and agrees with reveal eligibility',()=>{
 const node=file.nodes.find(n=>n.kind==='group_label');let nav=navigateCase(file,initialNavigation(file),{type:'select-node',id:node.id});
 const p=presentCaseScene(model,nav,1);assert.equal(p.threads.length,3);assert.equal(p.availableSpokes,3);assert.equal(p.hiddenEligibleSpokes,0);assert.equal(p.outsideNeighborhoodSpokes,3);assert.equal(p.totalUndisplayedSpokes,3);
 assert.deepEqual(navigateCase(file,nav,{type:'reveal-more'}),nav);
 assert.throws(()=>presentCaseScene(model,{...nav,visibleEdgeIds:[file.edges[5].id]},1),/neighborhood/);
});
test('all node positions are finite, cards non-overlapping, islands separated',()=>{
 for(const f of catalog.cases){const m=createCaseSceneModel(f);for(const n of m.nodes){assert.ok(n.position.every(Number.isFinite));for(const b of m.nodes){if(n===b)continue;assert.ok(Math.abs(n.position[0]-b.position[0])>=3.2||Math.abs(n.position[1]-b.position[1])>=1.8);}}
 for(const t of m.threads)for(let i=0;i<=24;i++)assert.ok(cubicPoint(t,i/24).every(Number.isFinite));}
});
test('all routed curves clear unrelated expanded card footprints without adding endpoints',()=>{
 for(const f of catalog.cases){const m=createCaseSceneModel(f);for(const t of m.threads){assert.ok(curveClearsOtherCards(t.points,m.nodes,t.record.from,t.record.to),t.record.id);
 for(let i=0;i<=512;i++){const p=cubicPoint(t,i/512);for(const n of m.nodes){if([t.record.from,t.record.to].includes(n.record.id))continue;assert.ok(Math.abs(p[0]-n.position[0])>n.cardSize[0]/2+0.29||Math.abs(p[1]-n.position[1])>n.cardSize[1]/2+0.29,t.record.id+' crosses '+n.record.id);}}}}
});
test('case switching drops old selection, history and motion',()=>{
 let state=step(initialSceneState(file,model),{type:'select-node',id:file.nodes[0].id});const next=getCase('profile:usa-trump'),nextModel=createCaseSceneModel(next);
 state=reduceCaseScene(next,nextModel,state,{type:'reveal-more'},100);assert.equal(state.caseId,next.id);assert.equal(state.navigation.nodeId,null);assert.deepEqual(state.cameraHistory,[]);assert.equal(state.motion,null);
});
test('motion is short and superseded motion tokens cannot move newer selections',()=>{
 let state=step(initialSceneState(file,model),{type:'camera',patch:{zoom:2,center:[4,-2]}});
 assert.equal(state.motion.durationMs,260);assert.ok(state.motion.durationMs<=SCENE_BUDGET.maxTravelMs);const token=state.motion.token,mid=sampleCamera(state,130);
 state=step(state,{type:'camera',patch:{zoom:3}},130);assert.deepEqual(state.motion.from,mid);const before=clone(state);state=step(state,{type:'tick',token},260);assert.deepEqual(state,before);
 state=step(state,{type:'tick',token:state.motion.token},390);assert.equal(state.motion,null);assert.equal(state.camera.zoom,3);
});
test('continuous gesture camera updates are immediate instead of restarting easing',()=>{
 let state=step(initialSceneState(file,model),{type:'camera',patch:{zoom:2,center:[4,0]}});
 for(let i=1;i<=10;i++){state=step(state,{type:'gesture-camera',patch:{center:[i*0.3,0],zoom:1+i*0.1}},i*16);assert.equal(state.motion,null);assert.equal(state.camera.center[0],i*0.3);}
 assert.equal(state.camera.center[0],3);assert.equal(state.camera.zoom,2);const prior=state.camera;state=step(state,{type:'interrupt'},161);assert.deepEqual(state.camera,prior);
});
test('no-op reveal or repeated fact selection still cancel an active camera movement',()=>{
 const group=file.nodes.find(n=>n.kind==='group_label');let state=step(initialSceneState(file,model),{type:'select-node',id:group.id});assert.ok(state.motion);
 const prior=sampleCamera(state,40);state=step(state,{type:'reveal-more'},40);assert.equal(state.motion,null);assert.deepEqual(state.camera,prior);
 state=step(state,{type:'select-fact',id:file.readerFactIds[0]},50);state=step(state,{type:'camera',patch:{zoom:2}},60);assert.ok(state.motion);
 state=step(state,{type:'select-fact',id:file.readerFactIds[0]},70);assert.equal(state.motion,null);
});
test('interrupt keeps displayed pose and does not resume; list/context loss preserve selected evidence',()=>{
 let state=step(initialSceneState(file,model),{type:'select-edge',id:file.edges[0].id});const mid=sampleCamera(state,100);state=step(state,{type:'interrupt'},100);assert.deepEqual(state.camera,mid);assert.equal(state.motion,null);
 state=step(state,{type:'graphics-lost'},110);assert.equal(state.view,'list');assert.equal(state.navigation.edgeId,file.edges[0].id);assert.equal(state.motion,null);
 state=step(state,{type:'set-view',view:'scene'},200);assert.equal(state.navigation.edgeId,file.edges[0].id);assert.equal(state.motion,null);
});
test('reduced motion is immediate, including a preference change during travel',()=>{
 let state=step(initialSceneState(file,model,true),{type:'camera',patch:{zoom:2}});assert.equal(state.camera.zoom,2);assert.equal(state.motion,null);
 state=step(state,{type:'reduced-motion',enabled:false});state=step(state,{type:'camera',patch:{zoom:3}});state=step(state,{type:'reduced-motion',enabled:true},50);assert.equal(state.camera.zoom,3);assert.equal(state.motion,null);
});
test('node to reader fact cancels camera movement and Back restores selection with bounded history',()=>{
 let state=step(initialSceneState(file,model),{type:'select-node',id:file.nodes[0].id});state=step(state,{type:'select-fact',id:file.readerFactIds[0]},40);assert.equal(state.navigation.nodeId,null);assert.equal(state.motion,null);
 state=step(state,{type:'back'},60);assert.equal(state.navigation.nodeId,file.nodes[0].id);
 for(let i=0;i<90;i++)state=step(state,{type:'select-node',id:file.nodes[i%file.nodes.length].id},100+i);
 assert.ok(state.navigation.history.length<=32);assert.equal(state.navigation.history.length,state.cameraHistory.length);
 state=step(state,{type:'reset'},300);assert.equal(state.navigation.nodeId,null);assert.deepEqual(state.cameraHistory,[]);assert.deepEqual(state.motion.to,homeCamera(model));
});
test('camera bounds reject invalid timestamps, constrain pan/zoom/tilt, and fit finite frames',()=>{
 const initial=initialSceneState(file,model,true);const state=step(initial,{type:'camera',patch:{zoom:Infinity,bearing:900,tilt:-10,center:[Infinity,-1e8]}});
 assert.equal(state.camera.zoom,1);assert.equal(state.camera.bearing,45);assert.equal(state.camera.tilt,0);assert.equal(state.camera.center[1],model.bounds.minY);
 assert.throws(()=>step(initial,{type:'fit'},NaN));
 for(const viewport of [[320,568],[1440,900],[0,0],[NaN,Infinity]]){const frame=orthographicFrame(model,...viewport,state.camera);assert.ok(Object.values(frame).every(Number.isFinite));assert.ok(frame.top>0&&frame.right>0);}
});
test('staged runtime is pure and never imports geography, Three, map, finance, router or admission utilities',async()=>{
 for(const name of ['layout.ts','state.ts']){const text=await readFile(path.join(dir,name),'utf8');const imports=[...text.matchAll(/from\s+['"]([^'"]+)/g)].map(m=>m[1]);assert.ok(imports.every(v=>['./layout','./contract','./navigation','./catalog-bridge'].includes(v)));
 assert.doesNotMatch(text,/\b(?:Math\.random|Date\.now|setTimeout|requestAnimationFrame|document\.|window\.|fetch\()\b/);}
});
