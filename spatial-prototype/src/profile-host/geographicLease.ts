/** Whole-workspace lease. Only captured geographic pose/handler flags are restored. */
export interface GeographicHandler { isEnabled(): boolean; enable(): unknown; disable(): unknown }
export const geographicHandlers = ['scrollZoom','boxZoom','dragRotate','dragPan','keyboard','doubleClickZoom','touchZoomRotate','touchPitch','cooperativeGestures'] as const;
export interface GeographicMap {
  getCenter(): { lng: number; lat: number }; getZoom(): number; getPitch(): number; getBearing(): number;
  stop(): unknown; jumpTo(pose: { center: [number,number]; zoom: number; pitch: number; bearing: number }): unknown;
}
export interface GeographicSnapshot {
  pose: { center: [number,number]; zoom: number; pitch: number; bearing: number };
  handlers: Partial<Record<typeof geographicHandlers[number],boolean>>;
}
type LockableMap = GeographicMap & Partial<Record<typeof geographicHandlers[number], GeographicHandler>>;
export function captureGeography(map: LockableMap): GeographicSnapshot {
  const center=map.getCenter();
  return { pose:{ center:[center.lng,center.lat], zoom:map.getZoom(), pitch:map.getPitch(), bearing:map.getBearing() },
    handlers:Object.fromEntries(geographicHandlers.flatMap(name=>map[name]?[[name,map[name]!.isEnabled()]]:[])) };
}
export function suspendGeography(map: LockableMap, restoredSnapshot?:()=>GeographicSnapshot): () => void {
  const captured=captureGeography(map);
  const flags=geographicHandlers.flatMap(name=>map[name]?[{ name, handler:map[name]!, enabled:map[name]!.isEnabled() }]:[]);
  let released=false;
  const restore=()=>{ if(released)return;released=true;const errors:unknown[]=[];
    const target=restoredSnapshot?.()??captured;
    try{map.stop();map.jumpTo(target.pose);}catch(error){errors.push(error);}
    for(const {name,handler,enabled} of flags)try{if(target.handlers[name]??enabled)handler.enable();else handler.disable();}catch(error){errors.push(error);}
    if(errors.length)throw new Error(`Geographic restoration failed in ${errors.length} operations`);
  };
  try{map.stop();for(const {handler} of flags)handler.disable();}catch(error){try{restore();}catch{/* Acquisition remains failed. */}throw error;}
  return restore;
}
