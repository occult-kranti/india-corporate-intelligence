/** Pure UI/camera state. This is an orientation aid, never a source-derived journey or money flow. */
import { initialNavigation, navigateCase, MAX_HISTORY } from './navigation';
import type { CaseAction, CaseNavigation } from './navigation';
import type { CaseFile } from './contract';
import { SCENE_BUDGET } from './layout';
import type { CaseSceneModel } from './layout';
export interface CameraPose { center:readonly [number,number]; zoom:number; bearing:number; tilt:number }
export interface CameraMotion {from:CameraPose;to:CameraPose;startedMs:number;durationMs:number;token:number}
export interface CaseSceneState {
  caseId:string;navigation:CaseNavigation;camera:CameraPose;motion:CameraMotion|null;
  cameraHistory:CameraPose[];view:'scene'|'list';reducedMotion:boolean;revision:number;
}
export type SceneAction=CaseAction|{type:'set-view';view:'scene'|'list'}|{type:'reduced-motion';enabled:boolean}|
  {type:'camera';patch:Partial<CameraPose>}|{type:'gesture-camera';patch:Partial<CameraPose>}|{type:'interrupt'}|{type:'tick';token:number}|
  {type:'fit'}|{type:'graphics-lost'};
const clamp=(v:number,min:number,max:number,fallback:number)=>Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback;
const copy=(p:CameraPose):CameraPose=>({...p,center:[...p.center]});
export function homeCamera(model:CaseSceneModel):CameraPose {const b=model.bounds;return {center:[(b.minX+b.maxX)/2,(b.minY+b.maxY)/2],zoom:1,bearing:0,tilt:0};}
export function initialSceneState(file:CaseFile,model:CaseSceneModel,reducedMotion=false):CaseSceneState {
  if(model.caseId!==file.id)throw new Error('Case state/model mismatch');
  return {caseId:file.id,navigation:initialNavigation(file),camera:homeCamera(model),motion:null,cameraHistory:[],view:'scene',reducedMotion,revision:0};
}
export function sampleCamera(state:CaseSceneState,nowMs:number):CameraPose {
  const m=state.motion;if(!m)return copy(state.camera);
  const raw=clamp((nowMs-m.startedMs)/m.durationMs,0,1,0),t=raw*raw*(3-2*raw);
  const mix=(a:number,b:number)=>a+(b-a)*t;
  return {center:[mix(m.from.center[0],m.to.center[0]),mix(m.from.center[1],m.to.center[1])],
    zoom:mix(m.from.zoom,m.to.zoom),bearing:mix(m.from.bearing,m.to.bearing),tilt:mix(m.from.tilt,m.to.tilt)};
}
function boundedPose(model:CaseSceneModel,pose:CameraPose):CameraPose {
  const b=model.bounds,home=homeCamera(model);
  return {center:[clamp(pose.center[0],b.minX,b.maxX,home.center[0]),clamp(pose.center[1],b.minY,b.maxY,home.center[1])],
    zoom:clamp(pose.zoom,0.7,4,1),bearing:clamp(pose.bearing,-45,45,0),tilt:clamp(pose.tilt,0,25,0)};
}
function begin(state:CaseSceneState,model:CaseSceneModel,target:CameraPose,nowMs:number):CaseSceneState {
  const from=sampleCamera(state,nowMs),to=boundedPose(model,target),revision=state.revision+1;
  if(state.reducedMotion||state.view==='list')return {...state,camera:to,motion:null,revision};
  return {...state,camera:from,revision,motion:{from,to,startedMs:nowMs,durationMs:SCENE_BUDGET.travelMs,token:revision}};
}
/** CSS-pixel viewport; no Mercator camera, longitude, latitude, map zoom or location API. */
export function orthographicFrame(model:CaseSceneModel,width:number,height:number,pose:CameraPose) {
  const viewportWidth=Math.max(1,Number.isFinite(width)?width:1),viewportHeight=Math.max(1,Number.isFinite(height)?height:1);
  const aspect=viewportWidth/viewportHeight;
  const b=model.bounds,spanX=b.maxX-b.minX,spanY=b.maxY-b.minY;
  // The diagonal is conservative for allowed board rotation; fitting never invents geography.
  const angle=Math.abs(pose.bearing)*Math.PI/180;
  const rotatedX=spanX*Math.cos(angle)+spanY*Math.sin(angle);
  const rotatedY=spanY*Math.cos(angle)+spanX*Math.sin(angle);
  const halfHeight=Math.max(rotatedY/2,rotatedX/(2*aspect))/Math.max(0.7,pose.zoom);
  return {left:-halfHeight*aspect,right:halfHeight*aspect,top:halfHeight,bottom:-halfHeight,near:0.1,far:1000,
    cssPixelsPerLayoutUnit:viewportHeight/(2*halfHeight)};
}
function selectionPose(model:CaseSceneModel,nav:CaseNavigation,prior:CameraPose):CameraPose {
  const ids=new Set<string>();if(nav.nodeId)ids.add(nav.nodeId);
  for(const thread of model.threads)if(thread.record.id===nav.edgeId||nav.nodeId&&(thread.record.from===nav.nodeId||thread.record.to===nav.nodeId)) {ids.add(thread.record.from);ids.add(thread.record.to);}
  const nodes=model.nodes.filter(n=>ids.has(n.record.id));if(!nodes.length)return prior;
  const xs=nodes.map(n=>n.position[0]),ys=nodes.map(n=>n.position[1]);
  // Modest movement only. The renderer may additionally fit selected endpoints with viewport padding.
  return {...prior,center:[(Math.min(...xs)+Math.max(...xs))/2,(Math.min(...ys)+Math.max(...ys))/2],zoom:Math.max(1,Math.min(prior.zoom,1.6))};
}
/** The caller supplies one monotonic ACTIVE clock (freeze it while hidden). New input samples/cancels prior motion, stale
 * animation tokens cannot move a newer selection. No timers, browser globals or side effects. */
export function reduceCaseScene(file:CaseFile,model:CaseSceneModel,state:CaseSceneState,action:SceneAction,nowMs:number):CaseSceneState {
  if(model.caseId!==file.id)throw new Error('Case state/model mismatch');
  if(!Number.isFinite(nowMs))throw new Error('Finite monotonic timestamp required');
  if(state.caseId!==file.id)return initialSceneState(file,model,state.reducedMotion);
  const sampled=sampleCamera(state,nowMs);
  if(action.type==='tick') {
    if(!state.motion||action.token!==state.motion.token)return state;
    const complete=nowMs>=state.motion.startedMs+state.motion.durationMs;
    return {...state,camera:sampled,motion:complete?null:state.motion};
  }
  if(action.type==='interrupt')return {...state,camera:sampled,motion:null,revision:state.revision+1};
  if(action.type==='set-view'||action.type==='graphics-lost')return {...state,view:action.type==='graphics-lost'?'list':action.view,camera:sampled,motion:null,revision:state.revision+1};
  if(action.type==='reduced-motion')return {...state,reducedMotion:action.enabled,camera:action.enabled&&state.motion?copy(state.motion.to):sampled,motion:action.enabled?null:state.motion,revision:state.revision+1};
  if(action.type==='gesture-camera')return {...state,camera:boundedPose(model,{...sampled,...action.patch}),motion:null,revision:state.revision+1};
  if(action.type==='camera')return begin(state,model,{...sampled,...action.patch},nowMs);
  if(action.type==='fit')return begin(state,model,homeCamera(model),nowMs);
  const navigation=navigateCase(file,state.navigation,action);
  if(navigation===state.navigation)return state.motion&&(action.type==='reveal-more'||action.type==='select-fact')
    ?{...state,camera:sampled,motion:null,revision:state.revision+1}:state;
  let cameraHistory=state.cameraHistory;
  let target=sampled;
  if(action.type==='reset') {cameraHistory=[];target=homeCamera(model);}
  else if(action.type==='back') {target=cameraHistory[cameraHistory.length-1]??sampled;cameraHistory=cameraHistory.slice(0,-1);}
  else {cameraHistory=[...cameraHistory,copy(sampled)].slice(-MAX_HISTORY);if(action.type==='select-node'||action.type==='select-edge')target=selectionPose(model,navigation,sampled);}
  const next={...state,navigation,cameraHistory};
  // Reveal/fact changes do not travel, and must cancel a superseded node/edge movement.
  if(action.type==='reveal-more'||action.type==='select-fact')return {...next,camera:sampled,motion:null,revision:state.revision+1};
  return begin(next,model,target,nowMs);
}
