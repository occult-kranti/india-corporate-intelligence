/** GitHub browser-test setup only. This module is never imported by app/src.
 * A one-shot debugger breakpoint obtains the existing Map object without changing
 * shipped JavaScript. Only documented MapLibre jumpTo/getter APIs set test poses.
 * Native pixels, source objects, geometry, materials and product controls are untouched.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const MAP_CAPTURE_ANCHOR = 'this.map.getCanvas().setAttribute("role","img")';
export function cameraCaptureLocation(source) {
  const index = source.indexOf(MAP_CAPTURE_ANCHOR);
  assert.ok(index >= 0 && index === source.lastIndexOf(MAP_CAPTURE_ANCHOR), 'Expected one original Map constructor capture point');
  const lines = source.slice(0,index).split('\n');
  return {lineNumber:lines.length-1,columnNumber:lines.at(-1).length};
}
export function assertFixturePose(pose) {
  assert.deepEqual(Object.keys(pose).sort(), ['bearing','center','pitch','zoom']);
  assert.ok(Array.isArray(pose.center) && pose.center.length===2 && pose.center.every(Number.isFinite));
  assert.ok(pose.center[0]>=-180 && pose.center[0]<=180 && pose.center[1]>=-85 && pose.center[1]<=85);
  assert.ok(Number.isFinite(pose.zoom) && pose.zoom>=.6 && pose.zoom<=19);
  assert.ok(Number.isFinite(pose.pitch) && pose.pitch>=0 && pose.pitch<=70);
  assert.ok(Number.isFinite(pose.bearing) && pose.bearing>=-180 && pose.bearing<=180);
}
export function assertSameFixturePose(actual,expected) {
  assertFixturePose(expected);
  for(const key of ['zoom','pitch','bearing']) assert.ok(Math.abs(actual[key]-expected[key])<1e-9,`MapLibre fixture ${key} did not settle exactly`);
  expected.center.forEach((v,i)=>assert.ok(Math.abs(actual.center[i]-v)<1e-9,'MapLibre fixture center did not settle exactly'));
}
export async function prepareCameraFixture(context,page,dist,origin,prefix,receipt) {
  const candidates=[];
  for(const file of await readdir(join(dist,'assets'))) if(file.endsWith('.js')) {
    const bytes=await readFile(join(dist,'assets',file)),source=bytes.toString('utf8');
    if(source.includes(MAP_CAPTURE_ANCHOR))candidates.push({file,bytes,source});
  }
  assert.equal(candidates.length,1,'Camera fixture requires the exact unmodified served constructor');
  const {file,bytes,source}=candidates[0],location=cameraCaptureLocation(source);
  Object.assign(receipt,{kind:'CI-only one-shot CDP object capture, then public MapLibre camera API',asset:`${origin}${prefix}assets/${file}`,assetSha256:createHash('sha256').update(bytes).digest('hex'),assetBytes:bytes.length,location,requests:[],captured:false});
  const session=await context.newCDPSession(page);let breakpoint,objectId,settled=false;
  let resolveReady,rejectReady;const ready=new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});ready.catch(()=>{});
  await session.send('Runtime.enable');await session.send('Debugger.enable');
  const onPaused=async event=>{
    if(settled || !event.hitBreakpoints?.includes(breakpoint)) {
      receipt.unexpectedPause={reason:event.reason,hitBreakpoints:event.hitBreakpoints};
      await session.send('Debugger.resume').catch(()=>{});
      if(!settled){settled=true;rejectReady(new Error('Unexpected debugger pause during camera capture'));}
      return;
    }
    settled=true;let failure;
    try {
      const frame=event.callFrames[0];receipt.resolvedLocation=frame.location;
      const captured=await session.send('Debugger.evaluateOnCallFrame',{callFrameId:frame.callFrameId,expression:'this.map',objectGroup:'thread-camera-fixture',silent:true,returnByValue:false});
      assert.ok(!captured.exceptionDetails && captured.result?.objectId,'Map object capture failed');objectId=captured.result.objectId;
      const verified=await session.send('Runtime.callFunctionOn',{objectId,functionDeclaration:'function(){return {isHost:this.getContainer().matches(".webgl-host"),cameraAPI:typeof this.jumpTo==="function",center:this.getCenter().toArray(),zoom:this.getZoom(),pitch:this.getPitch(),bearing:this.getBearing()};}',returnByValue:true,silent:true});
      assert.ok(!verified.exceptionDetails && verified.result?.value?.isHost && verified.result.value.cameraAPI,'Captured object is not the original atlas Map');
      receipt.initialPose=verified.result.value;receipt.captured=true;
    }catch(error){failure=error;receipt.error=String(error);}
    finally {
      await session.send('Debugger.removeBreakpoint',{breakpointId:breakpoint}).catch(()=>{});
      await session.send('Debugger.resume').catch(()=>{});
      await session.send('Debugger.disable').catch(()=>{});
    }
    if(failure)rejectReady(failure);else resolveReady();
  };
  session.on('Debugger.paused',onPaused);
  const pending=await session.send('Debugger.setBreakpointByUrl',{url:receipt.asset,...location});breakpoint=pending.breakpointId;receipt.breakpointId=breakpoint;
  return {
    async ready(){await Promise.race([ready,new Promise((_,reject)=>{const timer=setTimeout(()=>reject(new Error('Original Map constructor capture timed out')),60000);timer.unref?.();})]);},
    async set(pose,label){
      await ready;assertFixturePose(pose);
      const request={label,requested:structuredClone(pose)};receipt.requests.push(request);
      const result=await session.send('Runtime.callFunctionOn',{objectId,arguments:[{value:pose}],returnByValue:true,silent:true,functionDeclaration:'function(options){const read=()=>({center:this.getCenter().toArray(),zoom:this.getZoom(),pitch:this.getPitch(),bearing:this.getBearing()});const before=read();this.jumpTo(options);return {before,after:read(),canvas:this.getCanvas().getBoundingClientRect().toJSON()};}'});
      assert.ok(!result.exceptionDetails,'MapLibre jumpTo fixture failed');Object.assign(request,result.result.value);assertSameFixturePose(request.after,pose);return request;
    },
    async close(){
      if(breakpoint)await session.send('Debugger.removeBreakpoint',{breakpointId:breakpoint}).catch(()=>{});
      await session.send('Debugger.resume').catch(()=>{});await session.send('Debugger.disable').catch(()=>{});
      await session.send('Runtime.releaseObjectGroup',{objectGroup:'thread-camera-fixture'}).catch(()=>{});
      session.off('Debugger.paused',onPaused);await session.detach().catch(()=>{});
    }
  };
}
