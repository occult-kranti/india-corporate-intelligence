import test from 'node:test';import assert from 'node:assert/strict';import fs from'node:fs';import path from'node:path';import{createHash}from'node:crypto';
import{load,renderModule,dir,THREE as T,pins,semanticHash,acceptedCatalog,assertSourcePin}from'./test-tools.mjs';import{makeGL,makeRenderer}from'./mock-gl.mjs';
const{getCaseCatalog,getCase,REVIEWED_SCENE_CASES}=await load('catalog-bridge.ts');
const{createCaseSceneModel,cubicPoint}=await load('layout.ts');const{getSceneCompatibility}=await load('compatibility.ts');
const{CaseController}=await load('controller.ts');const{CaseSceneLayer}=await load('CaseSceneLayer.ts');
const{homeCamera,orthographicFrame,sampleCamera}=await load('state.ts');const{ribbon,targetArrow}=await load('geometry.ts');
const accepted=await acceptedCatalog();
const{render,evidence}=await renderModule();const files=getCaseCatalog().cases;
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#x27;');
const count=(s,needle)=>s.split(needle).length-1;
function camera(model,pose,size){const c=new T.OrthographicCamera(),f=orthographicFrame(model,size.width,size.height,pose);Object.assign(c,{left:f.left,right:f.right,top:f.top,bottom:f.bottom,near:f.near,far:f.far});const tilt=pose.tilt*Math.PI/180;c.position.set(pose.center[0],pose.center[1]+Math.sin(tilt)*100,Math.cos(tilt)*100);c.lookAt(pose.center[0],pose.center[1],0);c.rotateZ(pose.bearing*Math.PI/180);c.updateProjectionMatrix();c.updateMatrixWorld(true);return{project:p=>{const v=new T.Vector3(...p).project(c);return[v.x,v.y,v.z];},f};}

test('all exact 19 inputs have a separate explicit scene compatibility result; source legacy hold remains unchanged',()=>{
 assert.deepEqual(Object.keys(REVIEWED_SCENE_CASES),files.map(f=>f.id));let claims=0,nodes=0,spokes=0,facts=0;
 for(const file of files){const before=JSON.stringify(file),result=getSceneCompatibility(file);assert.equal(result.mode,'reviewed_scene_model',file.id);assert.equal(JSON.stringify(file),before);assert.deepEqual(result.caseFile,file);assert.deepEqual(result.model.caseFile,file);claims+=file.claims.length;nodes+=file.nodes.length;spokes+=file.edges.length;facts+=file.readerFactIds.length;if(file.v2)assert.equal(result.caseFile.v2.legacySceneSupport,'held_use_complete_v2_reader');}
 assert.deepEqual([files.length,claims,nodes,spokes,facts],[19,72,91,73,13]);
});
test('all 14 v1 case objects, 50 claims and prior layouts are unchanged',()=>{
 const old=accepted.cases.slice(0,14);assert.equal(semanticHash(old),pins.legacyCasesSha256);assert.equal(old.length,14);assert.deepEqual(files.slice(0,14),old);assert.equal(old.flatMap(f=>f.claims).length,50);
 for(const f of old){const{caseFile,...derived}=createCaseSceneModel(f);assert.deepEqual(caseFile,f);assert.equal(semanticHash(derived),pins.legacyLayoutHashes[f.id],f.id);}
});
test('controller snapshots source data once and model/file remain deeply frozen after ordinary caller edits',()=>{
 for(const input of files){const original=JSON.parse(JSON.stringify(input)),controller=new CaseController(input,true);input.label='Changed caller';input.claims[0].statement='Changed caller';input.nodes.reverse();assert.deepEqual(controller.file,original);assert.deepEqual(controller.model.caseFile,original);assert.ok(Object.isFrozen(controller.file.claims[0]));assert.ok(Object.isFrozen(controller.model.nodes[0].record));controller.dispatch({type:'select-edge',id:original.edges[0].id},0);assert.equal(controller.presentation.qualificationRail.find(e=>e.claim.claimId===original.edges[0].claimId).claim.statement,original.claims.find(c=>c.claimId===original.edges[0].claimId).statement);Object.assign(input,original);}
});
test('Amazon/NASA Blue Origin nodes stay source-qualified and separate; Ellison 2022 trust stays disconnected',()=>{
 const bz=createCaseSceneModel(getCase('profile:usa-bezos')),nodes=new Map(bz.nodes.map(n=>[n.record.id,n]));
 assert.notEqual(nodes.get('usa-bezos:blue-origin-amazon').layoutIsland,nodes.get('usa-bezos:blue-origin-nasa').layoutIsland);
 assert.equal(bz.threads.filter(t=>t.record.from==='usa-bezos:amazon').length,2);
 assert.deepEqual(bz.threads.filter(t=>t.record.from==='usa-bezos:amazon').map(t=>t.record.kind),['issuer_estimated_payment','expected_agreement_payment']);
 const le=createCaseSceneModel(getCase('profile:usa-ellison')),old=le.nodes.find(n=>n.record.id==='usa-ellison:trust-2022');assert.equal(le.threads.filter(t=>t.record.from===old.record.id).length,1);
 for(const id of ['usa-ellison:ellison','usa-ellison:oracle','usa-ellison:trust-2025'])assert.notEqual(old.layoutIsland,le.nodes.find(n=>n.record.id===id).layoutIsland);
 assert.equal(le.threads.find(t=>t.record.from===old.record.id).record.kind,'conditional_equity_commitment');
});
test('unnamed gifts, class-rights and general-power contexts remain reader-only; every exact parallel role has distinct geometry',()=>{
 const af=getCase('profile:usa-alphabet-founders');assert.deepEqual(af.readerFactIds,['claim:usa-alphabet-founders:AF-C05','claim:usa-alphabet-founders:AF-C06','claim:usa-alphabet-founders:AF-C10']);
 for(const f of files){const m=createCaseSceneModel(f);for(const id of f.readerFactIds){assert.ok(!m.threads.some(t=>t.record.claimId===id));assert.ok(!m.nodes.some(n=>n.record.claimIds.includes(id)));}
 for(let i=0;i<m.threads.length;i++)for(let j=i+1;j<m.threads.length;j++){const a=m.threads[i],b=m.threads[j];if([a.record.from,a.record.to].sort().join('|')===[b.record.from,b.record.to].sort().join('|'))assert.notDeepEqual(cubicPoint(a,.5),cubicPoint(b,.5),`${a.record.id} / ${b.record.id}`);}}
});
test('independent dense 4096-step geometry audit clears unrelated paper rectangles on all 73 routes',()=>{
 for(const f of files){const m=createCaseSceneModel(f);for(const t of m.threads)for(let i=0;i<=4096;i++){const p=cubicPoint(t,i/4096);for(const n of m.nodes){if([t.record.from,t.record.to].includes(n.record.id))continue;assert.ok(Math.abs(p[0]-n.position[0])>n.cardSize[0]/2+.29||Math.abs(p[1]-n.position[1])>n.cardSize[1]/2+.29,`${t.record.id} crosses ${n.record.id}`);}}}
});
test('73 static target arrows remain counter-clockwise over 48 camera/viewport combinations',()=>{
 let tested=0;for(const f of files){const m=createCaseSceneModel(f);for(const size of [{width:390,height:400},{width:1440,height:900}])for(const zoom of [.7,1,1.6,4])for(const bearing of [-45,0,45])for(const tilt of [0,25]){const{project,f:frame}=camera(m,{...homeCamera(m),zoom,bearing,tilt},size);for(const t of m.threads){const p=targetArrow(ribbon(t,project,size).screen,size,.2*frame.cssPixelsPerLayoutUnit);assert.equal(p.length,9,t.record.id);assert.ok((p[3]-p[0])*(p[7]-p[1])-(p[4]-p[1])*(p[6]-p[0])>0,t.record.id);tested++;}}}assert.equal(tested,3504);
});
test('selected endpoint cards remain inside the viewport after safety fit across every case/role/allowed tilt and bearing',()=>{
 for(const f of files){const renderer=makeRenderer(makeGL());let size={width:390,height:400};const layer=new CaseSceneLayer(f,renderer,{hostResetsThreeAtEveryBoundary:true,onSharedRendererFailure:()=>{},onFailure:()=>{},rect:()=>({x:100,y:150,...size})});
 for(size of [{width:390,height:400},{width:800,height:500}])for(const bearing of [-45,0,45])for(const tilt of [0,25])for(const edge of f.edges){const c=new CaseController(f,true);c.dispatch({type:'camera',patch:{zoom:4,bearing,tilt}},0);c.dispatch({type:'select-edge',id:edge.id},1);const fit=layer.fitSelectionPose(c.state.camera,c.state.navigation),{project}=camera(c.model,fit,size);for(const n of c.model.nodes.filter(n=>[edge.from,edge.to].includes(n.record.id)))for(const x of [-1,1])for(const y of [-1,1]){const p=project([n.position[0]+x*n.cardSize[0]/2,n.position[1]+y*n.cardSize[1]/2,.65]);assert.ok(Math.abs(p[0])<=1&&Math.abs(p[1])<=1,`${edge.id}: ${p}`);}}
 layer.dispose();}
});
test('all 19 controllers retain selection/reveal/history/source identity through interruption, reduced motion, list and graphics loss',()=>{
 for(const file of files){const c=new CaseController(file),edge=file.edges.at(-1);c.dispatch({type:'select-edge',id:edge.id},0);const nav=JSON.stringify(c.state.navigation),token=c.state.motion.token;c.dispatch({type:'camera',patch:{zoom:2}},40);const pose=sampleCamera(c.state,c.clock.now);c.dispatch({type:'interrupt'},40);assert.deepEqual(c.state.camera,pose);c.dispatch({type:'tick',token},50);assert.deepEqual(c.state.camera,pose);c.dispatch({type:'camera',patch:{zoom:3}},60);c.dispatch({type:'reduced-motion',enabled:true},70);assert.equal(c.state.motion,null);assert.equal(c.state.camera.zoom,3);c.dispatch({type:'set-view',view:'list'},80);c.dispatch({type:'graphics-lost'},90);assert.equal(JSON.stringify(c.state.navigation),nav);assert.deepEqual(c.model.caseFile,file);c.dispatch({type:'set-view',view:'scene'},100);assert.equal(JSON.stringify(c.state.navigation),nav);if(file.readerFactIds.length){c.dispatch({type:'select-fact',id:file.readerFactIds[0]},110);assert.equal(c.state.navigation.edgeId,null);c.dispatch({type:'back'},120);assert.equal(c.state.navigation.edgeId,edge.id);}}
});
test('complete controlled DOM reader includes all 72 exact approved evidence bodies, 73 role actions, 91 unique node actions and 13 reader facts',()=>{
 let edges=0,nodes=0,facts=0;for(const f of files){const c=new CaseController(f,true);c.dispatch({type:'set-view',view:'list'},0);const html=render(f,c.model,c.state);assert.match(html,/data-main-view="list"/);assert.match(html,/Case layout · not world locations/);for(const n of f.nodes){assert.equal(count(html,`data-node-id="${escape(n.id)}"`),1);nodes++;}for(const e of f.edges){assert.equal(count(html,`data-edge-id="${escape(e.id)}"`),1);edges++;if(e.v2)for(const value of[e.v2.predicate,e.v2.financialStage,e.v2.capacity,e.v2.dateLabel,e.v2.alwaysVisibleQualification,e.v2.locator])assert.ok(html.includes(escape(value)),`${e.id}: ${value}`);}for(const claim of f.claims)assert.ok(html.includes(evidence(f,claim.claimId)),claim.claimId);for(const id of f.readerFactIds){assert.ok(html.includes(`data-claim-id="${escape(id)}" data-reader-only="true"`));facts++;}}
 assert.deepEqual([edges,nodes,facts],[73,91,13]);
});
test('every selected role and all reader-only facts retain full DOM evidence at every semantic zoom level',()=>{
 for(const f of files){const c=new CaseController(f,true);for(const e of f.edges)for(const zoom of [.7,1.5,4]){c.dispatch({type:'select-edge',id:e.id},0);c.dispatch({type:'camera',patch:{zoom}},1);const html=render(f,c.model,c.state);assert.match(html,/data-main-view="scene"/);assert.ok(html.includes(evidence(f,e.claimId)),e.id);for(const id of f.readerFactIds)assert.ok(html.includes(evidence(f,id)),id);assert.equal(count(html,`data-edge-id="${escape(e.id)}"`),1);}}
});
test('corrected renderer, geometry and GL retain accepted byte pins; semantic/scene implementation files remain pinned',()=>{
 for(const name of Object.keys(pins.runtimeSources))assertSourcePin(name);
});
test('actual 24-segment renderer ribbons clear unrelated expanded paper footprints as well as the cubic curves',()=>{
 function intersects(a,b,n){let lo=0,hi=1;for(const axis of[0,1]){const min=n.position[axis]-n.cardSize[axis]/2-.29,max=n.position[axis]+n.cardSize[axis]/2+.29,d=b[axis]-a[axis];if(Math.abs(d)<1e-12){if(a[axis]<min||a[axis]>max)return false;continue;}const l=(min-a[axis])/d,h=(max-a[axis])/d;lo=Math.max(lo,Math.min(l,h));hi=Math.min(hi,Math.max(l,h));if(lo>hi)return false;}return true;}
 for(const f of files){const m=createCaseSceneModel(f);for(const t of m.threads)for(let i=1;i<=24;i++){const a=cubicPoint(t,(i-1)/24),b=cubicPoint(t,i/24);for(const n of m.nodes)if(![t.record.from,t.record.to].includes(n.record.id))assert.ok(!intersects(a,b,n),`${t.record.id} chord crosses ${n.record.id}`);}}
});
test('runtime bridge imports have no legacy adapter or second payload and controlled evidence owns no second reducer',()=>{
 for(const name of['CaseSceneLayer.ts','geometry.ts','gl-boundary.ts','integration-adapter.ts','controller.ts','layout.ts','state.ts','contract.ts','navigation.ts','catalog-bridge.ts','compatibility.ts','CaseSceneEvidence.tsx','reader-entry.ts','scene-entry.ts','loader.ts']){const text=fs.readFileSync(path.join(dir,name),'utf8');assert.doesNotMatch(text,/from\s*['"][^'"]*case-diagram-components-stage\//,name);assert.doesNotMatch(text,/reviewed-input\.json|reviewed-catalog\.json/,name);}
 assert.doesNotMatch(fs.readFileSync(path.join(dir,'CaseSceneEvidence.tsx'),'utf8'),/useState|useReducer|requestAnimationFrame/);
});
