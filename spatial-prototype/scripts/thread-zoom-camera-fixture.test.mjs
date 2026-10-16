import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {MAP_CAPTURE_ANCHOR,cameraCaptureLocation,assertFixturePose,assertSameFixturePose} from './thread-zoom-camera-fixture.mjs';
const pose={center:[76.329121982,21.999570445240124],zoom:19,pitch:0,bearing:0};
test('exact one-shot constructor location rejects missing/duplicate anchors',()=>{
 assert.deepEqual(cameraCaptureLocation(`x\ny,${MAP_CAPTURE_ANCHOR}`),{lineNumber:1,columnNumber:2});
 assert.throws(()=>cameraCaptureLocation('absent'));assert.throws(()=>cameraCaptureLocation(MAP_CAPTURE_ANCHOR+MAP_CAPTURE_ANCHOR));
});
test('camera setup accepts only bounded public pose fields',()=>{
 assertFixturePose(pose);for(const invalid of [{...pose,zoom:20},{...pose,zoom:NaN},{...pose,center:[181,0]},{...pose,center:[0,Infinity]},{...pose,pitch:71},{...pose,bearing:181},{...pose,extra:1}])assert.throws(()=>assertFixturePose(invalid));
});
test('exact camera getter equality cannot hide a wrong pose',()=>{
 assertSameFixturePose(pose,pose);for(const invalid of [{...pose,zoom:18.99},{...pose,center:[76.33,22]},{...pose,pitch:1},{...pose,bearing:1}])assert.throws(()=>assertSameFixturePose(invalid,pose));
});
test('fixture stays outside app and never assigns internal camera/source/geometry state',async()=>{
 const source=await readFile(new URL('./thread-zoom-camera-fixture.mjs',import.meta.url),'utf8');
 for(const forbidden of ['window.__atlas','setScriptSource','setVariableValue','.transform =','.geometry =','.material ='])assert.equal(source.includes(forbidden),false);
 assert.match(source,/this\.jumpTo\(options\)/);assert.match(source,/Runtime\.releaseObjectGroup/);assert.match(source,/Debugger\.resume/);
});

test('one-shot capture resumes, uses only jumpTo, and releases its handle',async()=>{
 const {mkdtemp,mkdir,writeFile,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const {prepareCameraFixture}=await import('./thread-zoom-camera-fixture.mjs');const dist=await mkdtemp(join(tmpdir(),'camera-fixture-'));
 try{
  await mkdir(join(dist,'assets'));await writeFile(join(dist,'assets','world.js'),`ctor(){${MAP_CAPTURE_ANCHOR};}`);
  const calls=[],listeners=new Map();let current={...pose,zoom:4.5};
  const session={on:(name,fn)=>listeners.set(name,fn),off:name=>listeners.delete(name),detach:async()=>{calls.push('detach');},send:async(method,args)=>{
   calls.push(method);
   if(method==='Debugger.setBreakpointByUrl')return{breakpointId:'capture:1'};
   if(method==='Debugger.evaluateOnCallFrame')return{result:{objectId:'original-map:1'}};
   if(method==='Runtime.callFunctionOn'){
    assert.equal(args.objectId,'original-map:1');
    if(args.arguments){const before=current;current=args.arguments[0].value;return{result:{value:{before,after:current,canvas:{width:800,height:500}}}};}
    return{result:{value:{...current,isHost:true,cameraAPI:true}}};
   }
   return{};
  }};
  const receipt={},fixture=await prepareCameraFixture({newCDPSession:async()=>session},{},dist,'http://127.0.0.1:1234','/spatial/',receipt);
  await listeners.get('Debugger.paused')({hitBreakpoints:['capture:1'],callFrames:[{callFrameId:'frame:1',location:{scriptId:'1',lineNumber:0,columnNumber:7}}]});
  await fixture.ready();await fixture.set(pose,'z19');await fixture.close();
  assert.equal(receipt.captured,true);assert.equal(receipt.requests.length,1);assert.deepEqual(receipt.requests[0].after,pose);assert.ok(calls.includes('Debugger.resume'));assert.ok(calls.includes('Runtime.releaseObjectGroup'));assert.equal(calls.at(-1),'detach');
 }finally{await rm(dist,{recursive:true,force:true});}
});
test('a failed capture still resumes execution and never supplies a camera',async()=>{
 const {mkdtemp,mkdir,writeFile,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const {join}=await import('node:path');const {prepareCameraFixture}=await import('./thread-zoom-camera-fixture.mjs');
 const dist=await mkdtemp(join(tmpdir(),'camera-failure-'));try{
  await mkdir(join(dist,'assets'));await writeFile(join(dist,'assets','world.js'),MAP_CAPTURE_ANCHOR);const calls=[],listeners=new Map();
  const session={on:(n,f)=>listeners.set(n,f),off:n=>listeners.delete(n),detach:async()=>{},send:async(m)=>{calls.push(m);if(m==='Debugger.setBreakpointByUrl')return{breakpointId:'capture:1'};if(m==='Debugger.evaluateOnCallFrame')return{exceptionDetails:{text:'undefined map'},result:{type:'undefined'}};return{};}};
  const fixture=await prepareCameraFixture({newCDPSession:async()=>session},{},dist,'http://127.0.0.1:1234','/spatial/',{});
  await listeners.get('Debugger.paused')({hitBreakpoints:['capture:1'],callFrames:[{callFrameId:'frame:1',location:{}}]});await assert.rejects(fixture.ready(),/capture failed/);await fixture.close();assert.ok(calls.includes('Debugger.resume'));assert.equal(calls.includes('Runtime.callFunctionOn'),false);
 }finally{await rm(dist,{recursive:true,force:true});}
});
