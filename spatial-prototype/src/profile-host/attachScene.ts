/** Loaded only on explicit Case scene. Uses the incumbent canvas, context and renderer. */
import { CaseSceneLayer, CaseInputAdapter } from '../case-scene/scene-entry';
import type { CaseSession, CaseSessionOptions } from './graphics-contract';
export function attachCaseScene(options: CaseSessionOptions): CaseSession {
  const {graphics,controller,surface}=options;
  if(!graphics.isUsable())throw new Error('Graphics unavailable. The complete case reader remains available.');
  graphics.setWorkspaceActive(true);
  graphics.stopGeographicJourney();
  let quality: 1 | 0.65 = 1;
  let disposed=false, input:CaseInputAdapter|undefined, unregister=()=>{};
  const map=graphics.map;
  const layer=new CaseSceneLayer(controller.file,graphics.renderer,{
    id:'selected-case-workspace', hostResetsThreeAtEveryBoundary:true, quality:()=>quality,
    rect:()=>{const r=surface.getBoundingClientRect();return {x:r.left,y:r.top,width:r.width,height:r.height};},
    onSharedRendererFailure:reason=>graphics.failSharedRenderer(reason),
    onFailure:reason=>{ if(!disposed)options.onFailure(reason); },
    onFrame:options.onFrame,onMetrics:options.onMetrics,
  });
  let boardRect = surface.getBoundingClientRect();
  const invalidate=()=>layer.resize();
  // A scrolled evidence rail does not move this board. Invalidate for actual
  // board movement while retaining resize/quality invalidations unconditionally.
  const invalidateMovement=()=>{
    const next=surface.getBoundingClientRect();
    if(next.left===boardRect.left&&next.top===boardRect.top&&next.width===boardRect.width&&next.height===boardRect.height)return;
    boardRect=next;layer.resize();
  };
  const window=surface.ownerDocument.defaultView!;
  // Scroll and ancestor style/class movement may change the board's position without resizing it.
  let movement: MutationObserver | undefined;
  const dispose=()=>{
    if(disposed)return;disposed=true;unregister();
    window.removeEventListener('scroll',invalidateMovement,true);
    window.removeEventListener('resize',invalidate);
    movement?.disconnect();
    // A host state callback must never prevent listener/resource teardown.
    try { input?.dispatch({type:'interrupt'}); } catch { /* Continue disposal. */ }
    try { input?.dispose(); } catch { /* The layer must still be removed. */ }
    try{if(map.getLayer(layer.id))map.removeLayer(layer.id);else layer.dispose();}
    catch(error){layer.dispose();graphics.failSharedRenderer(String(error));}
  };
  try {
    movement = new MutationObserver(invalidateMovement);
    for (let ancestor: HTMLElement | null = surface; ancestor; ancestor = ancestor.parentElement)
      movement.observe(ancestor, { attributes: true, attributeFilter: ['style', 'class', 'hidden'] });
    unregister=graphics.beforeDispose(dispose);
    map.addLayer(layer);
    input=new CaseInputAdapter({
      ...options,layer,map,opener:null,
      // The host owns the single captured pose/handler lease across reader/scene/failure switches.
      acquireGeographicLease:()=>()=>{},setWorkspaceActive:()=>{},
      stopGeographicJourney:()=>graphics.stopGeographicJourney(),
      onContextRestored:()=>options.onFailure('Graphics were interrupted. Recreate graphics explicitly to continue the scene.'),
    });
    window.addEventListener('scroll',invalidateMovement,true);
    window.addEventListener('resize',invalidate);
    layer.setState(controller.state,controller.clock.now);
  } catch(error) { dispose();throw error; }
  return {dispatch:action=>input?.dispatch(action),setInteractionMode:enabled=>input?.setInteractionMode(enabled),setQuality:value=>{quality=value;invalidate();},requestRepaint:invalidate,dispose};
}
