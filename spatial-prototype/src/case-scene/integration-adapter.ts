/** Separate DOM/input/lifecycle integration. Host owns the complete controlled reader,
 * source dialog, exact semantic labels, route state, focus trap and graphic failure boundary. */
import type { Map as MapLibreMap } from 'maplibre-gl';
import { sampleCamera } from './state';
import { CaseController } from './controller';
export { ActiveClock, CaseController } from './controller';
import type { CaseSceneState, SceneAction } from './state';
import type { CaseSceneLayer } from './CaseSceneLayer';

export interface Handler {isEnabled():boolean;enable():unknown;disable():unknown}
const handlerNames=['scrollZoom','boxZoom','dragRotate','dragPan','keyboard','doubleClickZoom','touchZoomRotate','touchPitch','cooperativeGestures'] as const;
type LockableMap=Pick<MapLibreMap,'getCenter'|'getZoom'|'getPitch'|'getBearing'|'stop'|'jumpTo'>&Partial<Record<typeof handlerNames[number],Handler>>;
/** Separate exported lease is mock-testable. The host must independently suppress ALL
 * geographic picking/label/command paths for the whole workspace, not only its rectangle. */
export function suspendMap(map:LockableMap):()=>void {
  const center=map.getCenter(),pose={center:[center.lng,center.lat] as [number,number],zoom:map.getZoom(),pitch:map.getPitch(),bearing:map.getBearing()};
  const flags=handlerNames.flatMap(name=>{const handler=map[name];return handler?[{handler,enabled:handler.isEnabled()}]:[];});
  map.stop();try{for(const item of flags)item.handler.disable();}catch(error){for(const item of flags)try{if(item.enabled)item.handler.enable();else item.handler.disable();}catch{/* Report original acquisition failure. */}throw error;}let released=false;
  return ()=>{if(released)return;released=true;const failures:unknown[]=[];try{map.stop();map.jumpTo(pose);}catch(error){failures.push(error);}for(const item of flags)try{if(item.enabled)item.handler.enable();else item.handler.disable();}catch(error){failures.push(error);}if(failures.length)throw new Error(`Map restoration failed in ${failures.length} operations`);};
}
export interface InputOptions {
  controller:CaseController;layer:CaseSceneLayer;map:MapLibreMap;surface:HTMLElement;
  opener:HTMLElement|null;returnFocusFallback?:()=>void;
  onState:(state:CaseSceneState)=>void;onAmbiguousEdges:(ids:string[])=>void;
  /** Must close source dialog first; return true when it handled Escape. */
  closeSourceDialog:()=>boolean;onClose:()=>void;
  onFailure:(reason:string)=>void;onContextRestored?:()=>void;
  stopGeographicJourney:()=>void;
  /** Optional host-owned whole-workspace lease. Default preserves standalone behavior. */
  acquireGeographicLease?:()=>()=>void;
  /** Set true before map gestures are suspended; restore geographic DOM/commands on false. */
  setWorkspaceActive:(active:boolean)=>void;
}
interface Pointer {x:number;y:number;startX:number;startY:number}
export class CaseInputAdapter {
  private cleanup:Array<()=>void>=[];private pointers=new Map<number,Pointer>();private canceled=false;private moved=false;private interactive=false;private disposed=false;private raf:number|null=null;private releaseMap:()=>void;
  private document:Document;private window:Window;private priorTouchAction:string;
  constructor(private options:InputOptions) {
    const {surface,controller,layer,map}=options;this.document=surface.ownerDocument;const window=this.document.defaultView;if(!window)throw new Error('Case input needs the owner document');this.window=window;
    if(controller.model.caseId!==layer.model.caseId)throw new Error('Controller/layer mismatch');
    this.priorTouchAction=surface.style.touchAction;surface.style.touchAction='pan-y';
    options.stopGeographicJourney();options.setWorkspaceActive(true);
    try{this.releaseMap=options.acquireGeographicLease?options.acquireGeographicLease():suspendMap(map);}catch(error){options.setWorkspaceActive(false);surface.style.touchAction=this.priorTouchAction;throw error;}
    try {
    this.listen(surface,'pointerdown',this.pointerDown);this.listen(surface,'pointermove',this.pointerMove);this.listen(surface,'pointerup',this.pointerUp);this.listen(surface,'pointercancel',this.pointerCancel);this.listen(surface,'lostpointercapture',this.pointerCancel);
    this.listen(this.document,'pointerup',this.pointerUp);this.listen(this.document,'pointercancel',this.pointerCancel);
    this.listen(surface,'wheel',this.wheel,{passive:false});this.listen(surface,'keydown',this.keyDown);
    this.listen(this.document,'visibilitychange',this.visibility);
    const canvas=map.getCanvas();this.listen(canvas,'webglcontextlost',this.contextLost);this.listen(canvas,'webglcontextrestored',()=>options.onContextRestored?.());
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');const reduced=()=>this.dispatch({type:'reduced-motion',enabled:media.matches});media.addEventListener('change',reduced);this.cleanup.push(()=>media.removeEventListener('change',reduced));reduced();
    const observer=new ResizeObserver(()=>layer.resize());observer.observe(surface);observer.observe(canvas);this.cleanup.push(()=>observer.disconnect());
    this.visibility();this.refresh();
    }catch(error){this.dispose();throw error;}
  }
  private listen(target:EventTarget,name:string,handler:EventListenerOrEventListenerObject,options?:AddEventListenerOptions) {target.addEventListener(name,handler,options);this.cleanup.push(()=>target.removeEventListener(name,handler,options));}
  private wall():number{return this.window.performance.now();}
  dispatch(action:SceneAction):void {if(this.disposed)return;const controller=this.options.controller;let state=controller.dispatch(action,this.wall());if(action.type==='select-node'||action.type==='select-edge'){const target=state.motion?.to??state.camera,fit=this.options.layer.fitSelectionPose(target,state.navigation);if(fit.zoom<target.zoom)state=controller.dispatch({type:'camera',patch:fit},this.wall());}this.options.onState(state);this.refresh();}
  /** Explicit Pan/Zoom mode preserves ordinary one-finger page/rail scrolling by default. */
  setInteractionMode(enabled:boolean):void {if(this.disposed)return;this.cancelPointers();this.interactive=enabled;this.options.surface.style.touchAction=enabled?'none':'pan-y';}
  private refresh() {const {controller,layer}=this.options;layer.setState(controller.state,controller.clock.now);if(controller.state.motion&&controller.state.view==='scene'&&!this.document.hidden&&this.raf===null)this.raf=this.window.requestAnimationFrame(this.tick);else if((!controller.state.motion||controller.state.view!=='scene'||this.document.hidden)&&this.raf!==null){this.window.cancelAnimationFrame(this.raf);this.raf=null;}}
  private tick=():void=>{this.raf=null;if(this.disposed||this.document.hidden)return;const state=this.options.controller.tick(this.wall());if(!state.motion)this.options.onState(state);this.refresh();};
  private visibility=():void=>{this.options.controller.clock.setVisible(!this.document.hidden,this.wall());if(this.document.hidden&&this.pointers.size)this.cancelPointers();this.refresh();};
  private contextLost=():void=>{this.cancelPointers();this.options.layer.contextLost();this.dispatch({type:'graphics-lost'});};
  private relative(event:PointerEvent):{x:number;y:number} {const r=this.options.surface.getBoundingClientRect();return {x:event.clientX-r.left,y:event.clientY-r.top};}
  private pointerDown:EventListener=(raw)=>{
    const event=raw as PointerEvent;if(event.button!==0)return;event.stopPropagation();
    if(!this.pointers.size){this.moved=false;this.canceled=false;this.dispatch({type:'interrupt'});}
    const p=this.relative(event);this.pointers.set(event.pointerId,{...p,startX:p.x,startY:p.y});
    if(this.pointers.size>1){this.moved=true;if(!this.interactive)this.canceled=true;}
    if(this.interactive){event.preventDefault();this.options.surface.setPointerCapture(event.pointerId);}
  };
  private pointerMove:EventListener=(raw)=>{
    const event=raw as PointerEvent,prior=this.pointers.get(event.pointerId);if(!prior)return;event.stopPropagation();const p=this.relative(event),before=[...this.pointers.values()];
    if(Math.hypot(p.x-prior.startX,p.y-prior.startY)>5)this.moved=true;
    this.pointers.set(event.pointerId,{...prior,...p});if(!this.interactive||this.canceled||!this.moved)return;event.preventDefault();
    const after=[...this.pointers.values()],{controller,layer}=this.options,pose=sampleCamera(controller.state,controller.clock.advance(this.wall()));
    if(after.length===1){const a=layer.layoutAt(prior.x,prior.y),b=layer.layoutAt(p.x,p.y);if(a&&b)this.dispatch({type:'gesture-camera',patch:{center:[pose.center[0]+a[0]-b[0],pose.center[1]+a[1]-b[1]]}});}
    else if(after.length===2){const old=Math.hypot(before[0].x-before[1].x,before[0].y-before[1].y),next=Math.hypot(after[0].x-after[1].x,after[0].y-after[1].y);if(old>1)this.dispatch({type:'gesture-camera',patch:{zoom:pose.zoom*next/old}});}
  };
  private pointerUp:EventListener=(raw)=>{
    const event=raw as PointerEvent;if(!this.pointers.has(event.pointerId))return;event.stopPropagation();const p=this.relative(event),start=this.pointers.get(event.pointerId)!,shouldPick=Math.hypot(p.x-start.startX,p.y-start.startY)<=5&&!this.moved&&!this.canceled&&this.pointers.size===1;this.pointers.delete(event.pointerId);if(this.options.surface.hasPointerCapture(event.pointerId))this.options.surface.releasePointerCapture(event.pointerId);
    if(shouldPick){const hit=this.options.layer.pick(p.x,p.y);if(hit?.kind==='node')this.dispatch({type:'select-node',id:hit.id});else if(hit?.kind==='edges'){if(hit.ids.length===1)this.dispatch({type:'select-edge',id:hit.ids[0]});else this.options.onAmbiguousEdges(hit.ids);}}
  };
  private pointerCancel:EventListener=(raw)=>{const event=raw as PointerEvent;if(!this.pointers.has(event.pointerId))return;this.canceled=true;this.cancelPointers();};
  private cancelPointers() {this.canceled=true;const ids=[...this.pointers.keys()];this.pointers.clear();for(const id of ids)if(this.options.surface.hasPointerCapture(id))this.options.surface.releasePointerCapture(id);if(!this.disposed)this.dispatch({type:'interrupt'});}
  private wheel:EventListener=(raw)=>{const event=raw as WheelEvent;if(!this.interactive||event.ctrlKey)return;event.preventDefault();event.stopPropagation();const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?this.options.surface.clientHeight:1),controller=this.options.controller,pose=sampleCamera(controller.state,controller.clock.advance(this.wall()));this.dispatch({type:'gesture-camera',patch:{zoom:pose.zoom*Math.exp(-Math.max(-500,Math.min(500,delta))*.001)}});};
  private keyDown:EventListener=(raw)=>{
    const event=raw as KeyboardEvent;if(event.target!==this.options.surface||event.ctrlKey||event.metaKey||event.altKey)return;
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();if(!this.options.closeSourceDialog())this.options.onClose();return;}
    const controller=this.options.controller,pose=sampleCamera(controller.state,controller.clock.advance(this.wall()));let action:SceneAction|undefined;
    if(event.key==='+'||event.key==='=')action={type:'camera',patch:{zoom:pose.zoom*1.2}};
    else if(event.key==='-')action={type:'camera',patch:{zoom:pose.zoom/1.2}};
    else if(event.key==='Home')action={type:'fit'};
    else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))action={type:'camera',patch:{center:[pose.center[0]+(event.key==='ArrowLeft'?-1:event.key==='ArrowRight'?1:0),pose.center[1]+(event.key==='ArrowUp'?1:event.key==='ArrowDown'?-1:0)]}};
    if(action){event.preventDefault();event.stopPropagation();this.dispatch(action);}
  };
  dispose():void {
    if(this.disposed)return;this.disposed=true;if(this.raf!==null)this.window.cancelAnimationFrame(this.raf);this.raf=null;this.cancelPointers();
    for(const cleanup of this.cleanup)try{cleanup();}catch{/* Continue releasing the remaining listeners and map lease. */}this.cleanup=[];this.options.surface.style.touchAction=this.priorTouchAction;
    try{this.releaseMap();}catch(error){this.options.onFailure(String(error));}finally{this.options.setWorkspaceActive(false);}
    if(this.options.opener?.isConnected)this.options.opener.focus({preventScroll:true});else this.options.returnFocusFallback?.();
    // The host removes the custom layer before the shared renderer/map. Removing it
    // invokes layer.onRemove/dispose. This adapter never disposes the shared renderer.
  }
}
