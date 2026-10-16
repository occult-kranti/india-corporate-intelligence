import test from 'node:test';
import assert from 'node:assert/strict';
import {load,names,Surface,environment,mapMock,worldFixture,adapterFixture,fire} from './test-tools.mjs';
const {suspendGeography}=await load('profile-host/geographicLease.ts');
const {attachCaseScene}=await load('profile-host/attachScene.ts');
const {CaseController}=await load('case-scene/controller.ts');
const {getCaseCatalog}=await load('case-scene/catalog-bridge.ts');
const files=getCaseCatalog().cases;
const flags=map=>names.map(name=>map[name].enabled);
const capturePose=map=>structuredClone(map.pose);
const frameArgs={defaultProjectionData:{mainMatrix:[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]}};
function attach(f,controller=new CaseController(files[0]),overrides={}) {
  const surface=new Surface();surface.ownerDocument=f.doc;surface.rect={left:80,top:120,width:600,height:400};
  const states=[],failures=[];
  const options={graphics:f.binding,controller,surface,opener:f.opener,onState:s=>states.push(s),onFrame(){},onMetrics(){},onAmbiguousEdges(){},onFailure:r=>failures.push(r),onClose(){},closeSourceDialog:()=>false,...overrides};
  return {session:attachCaseScene(options),surface,controller,states,failures};
}

test('whole-workspace lease captures once and restores exact pose plus enabled AND disabled flags once',()=>{
  const map=mapMock(new Surface()),before=flags(map),pose=capturePose(map),release=suspendGeography(map);
  assert.deepEqual(flags(map),names.map(()=>false));assert.equal(map.jumps.length,0);
  Object.assign(map.pose,{center:[90,-10],zoom:11,pitch:0,bearing:0});release();release();
  assert.deepEqual(map.pose,pose);assert.deepEqual(flags(map),before);assert.equal(map.jumps.length,1);
  for(let i=0;i<names.length;i++){const h=map[names[i]];assert.equal(h.enables,before[i]?1:0);assert.equal(h.disables,before[i]?1:2);}
});
test('lease acquisition failure restores prior flags and pose and returns no live lease',()=>{
  const map=mapMock(new Surface()),before=flags(map),pose=capturePose(map);let attempt=0;
  const original=map.dragPan.disable;map.dragPan.disable=function(){original.call(this);if(++attempt===1)throw Error('injected disable failure');};
  assert.throws(()=>suspendGeography(map),/injected disable failure/);
  assert.deepEqual(flags(map),before);assert.deepEqual(map.pose,pose);assert.equal(map.jumps.length,1);
});
test('lease release attempts all flag restorations after independent failures and remains idempotent',()=>{
  const map=mapMock(new Surface()),before=flags(map),release=suspendGeography(map);
  map.jumpTo=()=>{throw Error('pose restore failed');};map.boxZoom.enable=()=>{throw Error('flag restore failed');};
  assert.throws(release,/2 operations/);const calls=map.log.length;assert.doesNotThrow(release);assert.equal(map.log.length,calls);
  for(let i=0;i<names.length;i++)if(names[i]!=='boxZoom')assert.equal(map[names[i]].enabled,before[i]);
});
test('default adapter continues standalone capture/restoration and focus behavior',async()=>{
  const f=await adapterFixture();try{const prior=flags(f.map),pose=capturePose(f.map),a=f.create();assert.deepEqual(flags(f.map),names.map(()=>false));a.dispose();a.dispose();assert.deepEqual(flags(f.map),prior);assert.deepEqual(f.map.pose,pose);assert.equal(f.map.jumps.length,1);assert.equal(f.opener.focuses,1);assert.deepEqual(f.calls.active,[true,false]);}finally{f.restore();}
});
test('optional adapter lease acquires and releases exactly once without default map capture or restoration',async()=>{
  let acquisitions=0,releases=0;const f=await adapterFixture({acquireGeographicLease:()=>{acquisitions++;return()=>releases++;}});
  try{const before=flags(f.map),a=f.create();assert.equal(acquisitions,1);assert.deepEqual(flags(f.map),before);a.dispose();a.dispose();assert.equal(releases,1);assert.equal(f.map.jumps.length,0);assert.equal(f.map.log.length,0);assert.equal(f.frames.size,0);assert.equal(f.observers.size,0);}finally{f.restore();}
});
test('optional lease acquisition failure restores touch/workspace state without starting observers/listeners',async()=>{
  const f=await adapterFixture({acquireGeographicLease:()=>{throw Error('lease unavailable');}});
  try{assert.throws(f.create,/lease unavailable/);assert.equal(f.surface.style.touchAction,'manipulation');assert.deepEqual(f.calls.active,[true,false]);assert.equal(f.surface.listenerCount(),0);assert.equal(f.observers.size,0);assert.equal(f.frames.size,0);}finally{f.restore();}
});
test('adapter post-acquisition initialization failure releases optional lease and all installed listeners once',async()=>{
  let releases=0;const f=await adapterFixture({acquireGeographicLease:()=>()=>releases++,onState(){throw Error('state callback failed');}});
  try{assert.throws(f.create,/state callback failed/);assert.equal(releases,1);assert.equal(f.surface.style.touchAction,'manipulation');assert.equal(f.surface.listenerCount(),0);assert.equal(f.canvas.listenerCount(),0);assert.equal(f.doc.listenerCount(),0);assert.equal(f.media.listenerCount(),0);assert.equal(f.observers.size,0);assert.equal(f.frames.size,0);}finally{f.restore();}
});
test('optional release failure reports fallback but still clears workspace and restores focus',async()=>{
  let releases=0;const f=await adapterFixture({acquireGeographicLease:()=>()=>{releases++;throw Error('release failed');}});
  try{const a=f.create();a.dispose();a.dispose();assert.equal(releases,1);assert.equal(f.calls.failures.length,1);assert.match(f.calls.failures[0],/release failed/);assert.deepEqual(f.calls.active,[true,false]);assert.equal(f.opener.focuses,1);}finally{f.restore();}
});
test('actual onLoad publishes same map/renderer binding and invalidates it on teardown',async()=>{
  const f=await worldFixture();try{assert.equal(f.binding.map,f.map);assert.equal(f.binding.renderer,f.renderer);assert.equal(f.binding.isUsable(),true);assert.equal(typeof f.binding.identity,'number');f.world.dispose();assert.equal(f.binding.isUsable(),false);assert.equal(f.callbacks.bindings.at(-1),null);}finally{f.cleanup();}
});
test('reader workspace alone suppresses geography, captures once, and restores once on Close',async()=>{
  const f=await worldFixture();try{const before=flags(f.map),pose=capturePose(f.map);f.world.setWorkspaceActive(true);f.world.setWorkspaceActive(true);assert.equal(f.surface.dataset.geographicWorkspaceActive,'true');assert.deepEqual(flags(f.map),names.map(()=>false));for(const name of names)assert.equal(f.map[name].disables,1);f.render();assert.equal(f.draws.length,0);f.world.command({type:'zoom-in',stamp:1});assert.equal(f.world.journey,null);f.world.setWorkspaceActive(false);f.world.setWorkspaceActive(false);assert.deepEqual(flags(f.map),before);assert.deepEqual(f.map.pose,pose);assert.equal(f.map.jumps.length,1);f.render();assert.equal(f.draws.length,1);}finally{f.cleanup();}
});
test('opening workspace during travel cancels it; Close and later ticks never resume or queue it',async()=>{
  const f=await worldFixture();try{f.world.command({type:'city',id:'london',stamp:1});assert.ok(f.world.journey);f.step(16);f.step(100);const pausedPose=capturePose(f.map);f.world.setWorkspaceActive(true);assert.equal(f.world.journey,null);f.world.command({type:'resume',stamp:2});f.world.setWorkspaceActive(false);const jumps=f.map.jumps.length;for(let i=0;i<10;i++)f.step(100);assert.equal(f.world.journey,null);assert.equal(f.world.pendingCommand,null);assert.equal(f.map.jumps.length,jumps);assert.deepEqual(f.map.pose,pausedPose);assert.equal(f.callbacks.journeys.at(-1).phase,'idle');}finally{f.cleanup();}
});
test('reader/scene/reader/case switches keep single original host lease until Close',async()=>{
  const f=await worldFixture();try{const before=flags(f.map),pose=capturePose(f.map);f.world.setWorkspaceActive(true);const a=attach(f);a.session.dispose();a.session.dispose();assert.equal(f.map.jumps.length,0);assert.deepEqual(flags(f.map),names.map(()=>false));assert.equal(f.world.workspaceActive,true);const b=attach(f,new CaseController(files[1]));b.session.dispose();assert.equal(f.map.jumps.length,0);assert.equal(f.world.beforeGraphicsDispose.size,0);for(const name of names)assert.equal(f.map[name].disables,1);f.world.setWorkspaceActive(false);assert.deepEqual(flags(f.map),before);assert.deepEqual(f.map.pose,pose);assert.equal(f.map.jumps.length,1);assert.equal(f.opener.focuses,0);}finally{f.cleanup();}
});
test('30 attach/remove cycles leave no layer, child observer, listener, or hook behind while retaining host lease',async()=>{
  const f=await worldFixture();try{f.world.setWorkspaceActive(true);const hostObservers=f.observers.size,canvasListeners=f.canvas.listenerCount();for(let i=0;i<30;i++){const a=attach(f,new CaseController(files[i%files.length]));const layer=f.map.getLayer('selected-case-workspace'),resources=[...layer.geometry,...layer.materials,...layer.instances],counts=new Map();for(const resource of resources)resource.addEventListener('dispose',()=>counts.set(resource,(counts.get(resource)||0)+1));a.session.dispose();assert.ok(resources.every(resource=>counts.get(resource)===1));assert.equal(a.surface.listenerCount(),0);assert.equal(a.surface.style.touchAction,'manipulation');assert.equal(f.observers.size,hostObservers);assert.equal(f.canvas.listenerCount(),canvasListeners);assert.equal(f.window.listenerCount(),0);assert.equal(f.movements.size,0);assert.equal(f.doc.listenerCount(),0);assert.equal(f.media.listenerCount(),0);assert.equal(f.world.beforeGraphicsDispose.size,0);assert.equal(f.map.getLayer('selected-case-workspace')===undefined,true);}assert.equal(f.map.jumps.length,0);assert.equal(f.renderer.disposed,false);assert.deepEqual(flags(f.map),names.map(()=>false));}finally{f.cleanup();}
});
test('host disposal removes case layer before renderer/map, cancels frames and never restores dying geography',async()=>{
  const f=await worldFixture();try{f.world.setWorkspaceActive(true);const a=attach(f);a.session.dispatch({type:'camera',patch:{zoom:2}});assert.ok(f.frames.size>=2);f.log.length=0;f.world.dispose();f.world.dispose();const remove=f.log.indexOf('remove:selected-case-workspace'),renderer=f.log.indexOf('renderer.dispose'),map=f.log.indexOf('map.remove');assert.ok(remove>=0&&remove<renderer&&renderer<map,JSON.stringify(f.log));assert.equal(f.log.filter(x=>x==='renderer.dispose').length,1);assert.equal(f.map.jumps.length,0);assert.deepEqual(flags(f.map),names.map(()=>false));assert.equal(f.observers.size,0);assert.equal(f.frames.size,0);assert.equal(a.surface.listenerCount(),0);assert.equal(f.world.beforeGraphicsDispose.size,0);assert.equal(f.opener.focuses,0);}finally{f.cleanup();}
});
test('beforeDispose unregistration is idempotent and sibling cleanup runs after one hook throws',async()=>{
  const f=await worldFixture();try{const events=[];const cancel=f.binding.beforeDispose(()=>events.push('cancelled'));cancel();cancel();f.binding.beforeDispose(()=>{events.push('first');throw Error('cleanup failure');});f.binding.beforeDispose(()=>events.push('second'));f.world.dispose();assert.deepEqual(events,['first','second']);assert.equal(f.renderer.disposed,true);assert.equal(f.map.removed,true);}finally{f.cleanup();}
});
test('addLayer failure cleans allocated layer/hook without ending reader workspace lease',async()=>{
  const f=await worldFixture();try{f.world.setWorkspaceActive(true);f.map.addLayer=()=>{throw Error('addLayer failed');};assert.throws(()=>attach(f),/addLayer failed/);assert.equal(f.world.beforeGraphicsDispose.size,0);assert.equal(f.window.listenerCount(),0);assert.equal(f.world.workspaceActive,true);assert.equal(f.map.jumps.length,0);assert.deepEqual(flags(f.map),names.map(()=>false));assert.equal(f.renderer.disposed,false);}finally{f.cleanup();}
});
test('input initialization failure removes case layer, observers and host hook while preserving reader lease',async()=>{
  const f=await worldFixture();try{f.world.setWorkspaceActive(true);const before=f.observers.size;assert.throws(()=>attach(f,undefined,{onState(){throw Error('input callback failed');}}),/input callback failed/);assert.equal(f.map.getLayer('selected-case-workspace')===undefined,true);assert.equal(f.world.beforeGraphicsDispose.size,0);assert.equal(f.observers.size,before);assert.equal(f.media.listenerCount(),0);assert.equal(f.doc.listenerCount(),0);assert.equal(f.map.jumps.length,0);assert.equal(f.world.workspaceActive,true);assert.equal(f.renderer.disposed,false);}finally{f.cleanup();}
});
test('case remove failure disposes child and synchronously marks host fatal before deferred notification',async()=>{
  const f=await worldFixture();try{f.world.setWorkspaceActive(true);const a=attach(f);f.map.removeLayer=()=>{throw Error('removeLayer failed');};a.session.dispose();assert.equal(f.binding.isUsable(),false);assert.equal(f.surface.dataset.graphicsFatal,'true');assert.equal(f.callbacks.failures.length,0);assert.equal(f.world.beforeGraphicsDispose.size,0);assert.equal(f.window.listenerCount(),0);await Promise.resolve();assert.equal(f.callbacks.failures.length,1);}finally{f.map.removeLayer=id=>f.map.layers.delete(id);f.cleanup();}
});
test('shared fatal block is immediate and idempotent; same-frame later geographic draws are forbidden',async()=>{
  const f=await worldFixture();try{f.render();assert.equal(f.draws.length,1);f.binding.failSharedRenderer('fatal injected');assert.equal(f.binding.isUsable(),false);assert.equal(f.callbacks.failures.length,0);f.render();f.binding.failSharedRenderer('duplicate');assert.equal(f.draws.length,1);f.world.command({type:'city',id:'london',stamp:1});assert.equal(f.world.journey,null);await Promise.resolve();assert.deepEqual(f.callbacks.failures,['fatal injected']);}finally{f.cleanup();}
});
test('fatal signal during boundary reset blocks the pending render in that same call',async()=>{
  const f=await worldFixture();try{f.renderer.resetState=()=>f.binding.failSharedRenderer('fatal during reset');f.render();assert.equal(f.draws.length,0);assert.equal(f.binding.isUsable(),false);}finally{f.cleanup();}
});
test('unexpected geographic renderer exception makes host unusable and suppresses every later draw',async()=>{
  const f=await worldFixture();try{let attempts=0;f.renderer.render=()=>{attempts++;throw Error('draw failed');};f.render();f.render();assert.equal(attempts,1);assert.equal(f.binding.isUsable(),false);await Promise.resolve();assert.match(f.callbacks.failures[0],/draw failed/);}finally{f.cleanup();}
});
test('geographic boundary resets default target, current drawing-buffer viewport and scissor on every draw',async()=>{
  const f=await worldFixture();try{f.log.length=0;f.render();assert.deepEqual(f.log,['renderer.reset','renderer.target:null','renderer.viewport','renderer.scissor:false','renderer.render','renderer.reset']);assert.deepEqual(f.viewport.at(-1),[0,0,1000,600]);f.gl.drawingBufferWidth=2100;f.gl.drawingBufferHeight=1200;f.render();assert.deepEqual(f.viewport.at(-1),[0,0,1400,800]);f.renderer.getPixelRatio=()=>2;f.gl.drawingBufferWidth=900;f.gl.drawingBufferHeight=1600;f.render();assert.deepEqual(f.viewport.at(-1),[0,0,450,800]);}finally{f.cleanup();}
});
test('position-only scroll and window resize invalidate case surface; listeners stop after dispose',async()=>{
  const f=await worldFixture();try{const a=attach(f);const initial=f.map.repaints;fire(f.window,'scroll');fire(f.window,'resize');assert.equal(f.map.repaints,initial+2);a.session.dispose();const after=f.map.repaints;fire(f.window,'scroll');fire(f.window,'resize');assert.equal(f.map.repaints,after);}finally{f.cleanup();}
});
test('real case layer shared-renderer failure reaches host fatal hook and blocks geography in the same frame',async()=>{
  const f=await worldFixture({caseGL:true});try{const a=attach(f),layer=f.map.getLayer('selected-case-workspace');f.renderer.throwRender=true;layer.prerender(f.gl,frameArgs);assert.equal(f.binding.isUsable(),false);const before=f.draws.length;f.world.workspaceActive=false;f.render();assert.equal(f.draws.length,before);await Promise.resolve();assert.equal(f.callbacks.failures.length,1);a.session.dispose();}finally{f.cleanup();}
});
test('case offscreen passes followed by Close use refreshed host viewport after buffer resize',async()=>{
  const f=await worldFixture({caseGL:true});try{const a=attach(f),layer=f.map.getLayer('selected-case-workspace');layer.prerender(f.gl,frameArgs);assert.ok(f.renderer.renders.length>0);a.session.dispose();f.world.setWorkspaceActive(false);f.gl.drawingBufferWidth=1800;f.gl.drawingBufferHeight=1500;f.render();assert.deepEqual(f.renderer.renders.at(-1).viewport,[0,0,1800,1500]);assert.equal(f.renderer.renders.at(-1).target,null);}finally{f.cleanup();}
});
test('graphics failure/recreation keeps reader controller selection and does not reuse disposed graphics',async()=>{
  const f=await worldFixture();const controller=new CaseController(files[2]);try{const a=attach(f,controller);a.session.dispatch({type:'select-node',id:controller.file.nodes[0].id});controller.dispatch({type:'set-view',view:'list'},0);const selected=controller.state.navigation.nodeId;f.binding.failSharedRenderer('lost');a.session.dispose();f.world.dispose();assert.equal(controller.state.navigation.nodeId,selected);assert.equal(controller.state.view,'list');assert.throws(()=>attach(f,controller),/Graphics unavailable/);}finally{f.cleanup();}
  const fresh=await worldFixture();try{const b=attach(fresh,controller);assert.equal(controller.state.navigation.nodeId,controller.file.nodes[0].id);assert.equal(controller.state.view,'list');assert.equal(b.controller,controller);b.session.dispose();}finally{fresh.cleanup();}
});


test('disposing a travelling case freezes its camera and reattachment does not resume old case travel',async()=>{
  const f=await worldFixture();try{const controller=new CaseController(files[0]),a=attach(f,controller);a.session.dispatch({type:'camera',patch:{zoom:2}});assert.ok(controller.state.motion);f.step(16);f.step(32);a.session.dispose();assert.equal(controller.state.motion,null);const camera=JSON.stringify(controller.state.camera);const b=attach(f,controller);f.step(200);assert.equal(controller.state.motion,null);assert.equal(JSON.stringify(controller.state.camera),camera);b.session.dispose();}finally{f.cleanup();}
});
test('disposal still releases input and layer if publishing interrupted state throws',async()=>{
  const f=await worldFixture();let reject=false;try{const a=attach(f,undefined,{onState(){if(reject)throw Error('publish interrupted state failed');}});a.session.dispatch({type:'camera',patch:{zoom:2}});reject=true;try{a.session.dispose();}catch{/* Cleanup must still complete after a userland callback error. */}assert.equal(f.map.getLayer('selected-case-workspace')===undefined,true);assert.equal(a.surface.listenerCount(),0);assert.equal(f.media.listenerCount(),0);assert.equal(f.doc.listenerCount(),0);assert.equal(f.observers.size,1);assert.equal(f.frames.size,1);}finally{f.cleanup();}
});
test('movement-observer acquisition failure disconnects partial observer and leaves no child resources',async()=>{
  const f=await worldFixture();try{const Base=globalThis.MutationObserver;globalThis.MutationObserver=class extends Base{observe(){throw Error('movement observation unavailable');}};assert.throws(()=>attach(f),/movement observation unavailable/);assert.equal(f.movements.size,0);assert.equal(f.map.getLayer('selected-case-workspace')===undefined,true);assert.equal(f.world.beforeGraphicsDispose.size,0);assert.equal(f.map.jumps.length,0);}finally{f.cleanup();}
});


test('ancestor attribute movements invalidate position-only layout and observer disconnects on removal',async()=>{
  const f=await worldFixture();try{const ancestor=new Surface(),surface=new Surface();surface.ownerDocument=f.doc;surface.parentElement=ancestor;const a=attach(f,undefined,{surface});const movement=[...f.movements][0];assert.deepEqual(movement.targets.map(item=>item.target),[surface,ancestor]);for(const item of movement.targets)assert.deepEqual(item.options,{attributes:true,attributeFilter:['style','class','hidden']});const before=f.map.repaints;surface.rect.left+=50;movement.cb();assert.equal(f.map.repaints,before+1);a.session.dispose();assert.equal(f.movements.size,0);}finally{f.cleanup();}
});

test('full graphics teardown, replacement adoption and Close restore original non-HOME pose and mixed flags',async()=>{
  const original=await worldFixture();let snapshot,priorFlags,priorPose;const controller=new CaseController(files[3]);
  try{Object.assign(original.map.pose,{center:[-73.9857,40.7484],zoom:13.125,pitch:57,bearing:-21});names.forEach((name,i)=>original.map[name].enabled=i%2===0);priorFlags=flags(original.map);priorPose=capturePose(original.map);snapshot=original.binding.captureGeography();original.world.command({type:'city',id:'london',stamp:1});assert.ok(original.world.journey);original.world.setWorkspaceActive(true);const a=attach(original,controller);a.session.dispatch({type:'select-node',id:controller.file.nodes[0].id});original.world.dispose();assert.equal(original.map.jumps.length,0);assert.deepEqual(flags(original.map),names.map(()=>false));assert.equal(original.world.journey,null);}finally{original.cleanup();}
  const fresh=await worldFixture();try{assert.notDeepEqual(fresh.map.pose,priorPose);assert.notDeepEqual(flags(fresh.map),priorFlags);fresh.world.setWorkspaceActive(true);fresh.binding.adoptGeography(snapshot);const b=attach(fresh,controller);assert.equal(controller.state.navigation.nodeId,controller.file.nodes[0].id);assert.equal(fresh.map.jumps.length,0);assert.deepEqual(flags(fresh.map),names.map(()=>false));b.session.dispose();assert.equal(fresh.map.jumps.length,0);assert.deepEqual(flags(fresh.map),names.map(()=>false));fresh.world.setWorkspaceActive(false);fresh.world.setWorkspaceActive(false);assert.deepEqual(fresh.map.pose,priorPose);assert.deepEqual(flags(fresh.map),priorFlags);assert.equal(fresh.map.jumps.length,1);for(let i=0;i<5;i++)fresh.step(100);assert.equal(fresh.world.journey,null);assert.equal(fresh.world.pendingCommand,null);assert.equal(fresh.map.jumps.length,1);}finally{fresh.cleanup();}
});
test('snapshot adoption before suspension is copied and later capture cannot mutate the restoration target',async()=>{
  const f=await worldFixture();try{const snapshot={pose:{center:[151.2093,-33.8688],zoom:9.25,pitch:44,bearing:171},handlers:Object.fromEntries(names.map((name,i)=>[name,i%2===1]))},expected=structuredClone(snapshot);f.binding.adoptGeography(snapshot);snapshot.pose.center[0]=0;snapshot.handlers.dragPan=!snapshot.handlers.dragPan;f.world.setWorkspaceActive(true);const captured=f.binding.captureGeography();assert.deepEqual(captured,expected);captured.pose.zoom=0;captured.handlers.keyboard=!captured.handlers.keyboard;f.world.setWorkspaceActive(false);assert.deepEqual(f.map.pose,expected.pose);assert.deepEqual(flags(f.map),names.map(name=>expected.handlers[name]));}finally{f.cleanup();}
});
test('default/low case quality changes only render target size and replaces/disposes owned targets',async()=>{
  const f=await worldFixture({caseGL:true});try{const a=attach(f),layer=f.map.getLayer('selected-case-workspace');a.session.dispatch({type:'select-node',id:a.controller.file.nodes[0].id});const semanticState=JSON.stringify(a.controller.state),file=a.controller.file,model=a.controller.model;layer.prerender(f.gl,frameArgs);const normal=layer.metrics(),first=layer.target;let firstDisposals=0;first.addEventListener('dispose',()=>firstDisposals++);a.session.setQuality(0.65);layer.prerender(f.gl,frameArgs);const low=layer.metrics();assert.ok(low.targetWidth*low.targetHeight<normal.targetWidth*normal.targetHeight);assert.equal(firstDisposals,1);assert.equal(JSON.stringify(a.controller.state),semanticState);assert.equal(a.controller.file,file);assert.equal(a.controller.model,model);a.session.setQuality(1);layer.prerender(f.gl,frameArgs);assert.equal(layer.metrics().targetWidth,normal.targetWidth);assert.equal(layer.metrics().targetHeight,normal.targetHeight);assert.equal(JSON.stringify(a.controller.state),semanticState);a.session.dispose();const repaints=f.map.repaints;a.session.setQuality(0.65);assert.equal(f.map.repaints,repaints);}finally{f.cleanup();}
});
