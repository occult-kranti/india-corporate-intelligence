/** Portable runtime harness. Actual host modules; only browser/MapLibre/WebGL boundaries are mocked. */
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
export const directory = path.dirname(fileURLToPath(import.meta.url));
export const host = path.resolve(directory, '../../..');
export const root = path.resolve(host, '..');
export const source = path.join(root, 'spatial-prototype/src');
export const require = createRequire(path.join(root, 'spatial-prototype/package.json'));
export const THREE = require('three');
const {build} = require('esbuild');
const cache = new Map();
const assets = {name:'browser-assets-stub',setup(build) {
  build.onResolve({filter:/maplibre-gl-worker|\/cartographyAssets$/}, args => ({path:args.path,namespace:'host-test-stub'}));
  build.onLoad({filter:/.*/,namespace:'host-test-stub'}, args => ({contents:args.path.includes('maplibre-gl-worker') ? 'export default "test-worker";' : 'export const WORLD_MAP_URL="test-world"; export const INDIA_STATE_MAP_URL="test-states"; export const loadMapBoundaries=()=>Promise.resolve({type:"FeatureCollection",features:[]});',loader:'js'}));
}};
export async function load(entry, overrides = {}) {
  if (!cache.has(entry)) cache.set(entry, await build({entryPoints:[path.join(source,entry)],bundle:true,write:false,format:'cjs',platform:'node',external:['three','maplibre-gl'],plugins:[assets],logLevel:'silent'}));
  const module={exports:{}};
  new Function('require','module','exports',cache.get(entry).outputFiles[0].text)(id=>overrides[id]??require(id),module,module.exports);
  return module.exports;
}
export class Target extends EventTarget {
  listeners = new Map();
  addEventListener(name, fn, options) { super.addEventListener(name,fn,typeof options==='boolean'?{capture:options}:options);const set=this.listeners.get(name)??new Set();set.add(fn);this.listeners.set(name,set); }
  removeEventListener(name, fn, options) { super.removeEventListener(name,fn,typeof options==='boolean'?{capture:options}:options);this.listeners.get(name)?.delete(fn); }
  listenerCount() {return [...this.listeners.values()].reduce((n,s)=>n+s.size,0);}
}
export class Surface extends Target {
  style={touchAction:'manipulation'}; capture=new Set(); clientHeight=600;clientWidth=1000;isConnected=true;parentElement=null;focuses=0;dataset={};attributes={};rect={left:50,top:100,width:1000,height:600};
  getBoundingClientRect(){return {...this.rect};}
  setPointerCapture(id){this.capture.add(id);}hasPointerCapture(id){return this.capture.has(id);}releasePointerCapture(id){this.capture.delete(id);}focus(){this.focuses++;}
  setAttribute(k,v){this.attributes[k]=v;}
}
export function fire(target,name,props={}) { const event=new Event(name,{cancelable:true});for(const[k,v]of Object.entries(props))Object.defineProperty(event,k,{value:v});target.dispatchEvent(event);return event; }
export function environment() {
  let wall=0,frame=0;const frames=new Map(),observers=new Set(),movements=new Set(),doc=new Target(),window=new Target(),media=new Target();media.matches=false;doc.hidden=false;doc.defaultView=window;
  Object.assign(window,{devicePixelRatio:1.5,performance:{now:()=>wall},matchMedia:()=>media,requestAnimationFrame:cb=>{frames.set(++frame,cb);return frame;},cancelAnimationFrame:id=>frames.delete(id)});
  const surface=new Surface(),canvas=new Surface(),opener=new Surface();for(const item of [surface,canvas,opener])item.ownerDocument=doc;
  doc.createElement=()=>({getContext:()=>new Proxy({getImageData:()=>({width:128,height:128,data:new Uint8Array(128*128*4)}),measureText:text=>({width:text.length*8})},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)})});
  const prior={};for(const name of ['window','document','requestAnimationFrame','cancelAnimationFrame','ResizeObserver','MutationObserver'])prior[name]=globalThis[name];
  Object.assign(globalThis,{window,document:doc,requestAnimationFrame:window.requestAnimationFrame,cancelAnimationFrame:window.cancelAnimationFrame,ResizeObserver:class {constructor(cb){this.cb=cb;observers.add(this);}observe(){}disconnect(){observers.delete(this);}},MutationObserver:class {constructor(cb){this.cb=cb;this.targets=[];movements.add(this);}observe(target,options){this.targets.push({target,options});}disconnect(){movements.delete(this);}}});
  return {doc,window,media,surface,canvas,opener,frames,observers,movements,step(delta){wall+=delta;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(cb=>cb(wall));},restore(){for(const[name,v]of Object.entries(prior))v===undefined?delete globalThis[name]:globalThis[name]=v;}};
}
export const names=['scrollZoom','boxZoom','dragRotate','dragPan','keyboard','doubleClickZoom','touchZoomRotate','touchPitch','cooperativeGestures'];
export function mapMock(canvas,log=[]) {
  const pose={center:[7,12],zoom:4,pitch:23,bearing:44};const layers=new Map(),sources=new Map(),events=new Map();
  const map={version:'6.13.0',pose,layers,sources,events,log,removed:false,repaints:0,jumps:[],
    getCenter:()=>({lng:pose.center[0],lat:pose.center[1]}),getZoom:()=>pose.zoom,getPitch:()=>pose.pitch,getBearing:()=>pose.bearing,
    stop(){log.push('map.stop');},jumpTo(value){log.push('map.jumpTo');this.jumps.push(structuredClone(value));Object.assign(pose,structuredClone(value));},getCanvas:()=>canvas,
    on(name,fn){const list=events.get(name)??[];list.push(fn);events.set(name,list);},emit(name,payload){for(const fn of events.get(name)??[])fn(payload);},
    addImage(){},setPaintProperty(){},addSource(id,value){sources.set(id,{...value,setData(v){this.data=v;}});},getSource:id=>sources.get(id),
    addLayer(layer){log.push(`add:${layer.id}`);layers.set(layer.id,layer);layer.onAdd?.(map,map.gl);},getLayer:id=>layers.get(id),
    removeLayer(id){log.push(`remove:${id}`);const layer=layers.get(id);layers.delete(id);layer?.onRemove?.(map,map.gl);},
    triggerRepaint(){this.repaints++;},resize(){log.push('map.resize');},setLayoutProperty(){},setPixelRatio(){},project:()=>({x:200,y:200}),
    remove(){log.push('map.remove');this.removed=true;for(const id of [...layers.keys()])this.removeLayer(id);},queryRenderedFeatures:()=>[],areTilesLoaded:()=>true};
  names.forEach((name,index)=>map[name]={enabled:index%3!==0,enables:0,disables:0,isEnabled(){return this.enabled;},enable(){log.push(`enable:${name}`);this.enables++;this.enabled=true;},disable(){log.push(`disable:${name}`);this.disables++;this.enabled=false;}});
  return map;
}
export async function worldFixture({caseGL=false}={}) {
  const env=environment(),log=[],map=mapMock(env.canvas,log),draws=[],viewport=[];
  let gl={drawingBufferWidth:1500,drawingBufferHeight:900};
  let renderer={domElement:env.canvas,disposed:false,info:{render:{calls:0,triangles:0}},resetState(){log.push('renderer.reset');},setRenderTarget(v){log.push(`renderer.target:${v}`);},getContext:()=>gl,getPixelRatio:()=>1.5,setViewport(...v){log.push('renderer.viewport');viewport.push(v);},setScissorTest(v){log.push(`renderer.scissor:${v}`);},render(scene,camera){log.push('renderer.render');draws.push({scene,camera});},dispose(){log.push('renderer.dispose');this.disposed=true;}};
  if(caseGL){const mocks=await import('../scene-tests/mock-gl.mjs');gl=mocks.makeGL();renderer=mocks.makeRenderer(gl);renderer.domElement=env.canvas;renderer.dispose=()=>{log.push('renderer.dispose');renderer.disposed=true;};for(const method of ['render','resetState','setRenderTarget','setViewport','setScissorTest']){const original=renderer[method];renderer[method]=(...args)=>{log.push(`renderer.${method}`);if(method==='render')draws.push(args);if(method==='setViewport')viewport.push(args);return original(...args);};}}
  map.gl=gl;
  const maplibre={Map:class{constructor(options){map.options=options;return map;}},MercatorCoordinate:class {static fromLngLat(){return {x:0,y:0,z:0};}},LngLatBounds:class{},setWorkerUrl(){}};
  const {EvidenceWorld}=await load('scene.ts',{'maplibre-gl':maplibre,three:{...THREE,WebGLRenderer:class{constructor(){return renderer;}}}});
  const callbacks={labels:[],journeys:[],failures:[],bindings:[]};
  const data={nodes:[],edges:[],registry:{entities:[],records:[],relationships:[],held:[],sources:[]},clusters:[],layers:[],yearRange:[0,0],caveat:''};
  const world=new EvidenceWorld(env.surface,data,{onSelect(){},onLabels:v=>callbacks.labels.push(v),onJourney:v=>callbacks.journeys.push(v),onMetric(){},onFailure:v=>callbacks.failures.push(v),onGraphics:v=>callbacks.bindings.push(v)});
  map.emit('load');await Promise.resolve();
  const binding=callbacks.bindings.at(-1);
  return {...env,log,map,gl,renderer,draws,viewport,world,binding,callbacks,render(){map.layers.get('physical-evidence').render(gl,{defaultProjectionData:{mainMatrix:new THREE.Matrix4().toArray()}});},cleanup(){world.dispose();env.restore();}};
}
export async function adapterFixture(overrides={}) {
  const env=environment(),map=mapMock(env.canvas),{CaseInputAdapter,CaseController}=await load('case-scene/integration-adapter.ts'),{getCaseCatalog}=await load('case-scene/catalog-bridge.ts');
  const file=getCaseCatalog().cases[0],controller=new CaseController(file),calls={states:[],active:[],failures:[],stop:0};
  const layer={model:controller.model,setState(){},resize(){},contextLost(){},fitSelectionPose:p=>p,layoutAt:(x,y)=>[x,y],pick:()=>null};
  const options={controller,layer,map,surface:env.surface,opener:env.opener,onState:v=>calls.states.push(v),onAmbiguousEdges(){},closeSourceDialog:()=>false,onClose(){},onFailure:v=>calls.failures.push(v),stopGeographicJourney(){calls.stop++;},setWorkspaceActive:v=>calls.active.push(v),...overrides};
  return {...env,map,file,controller,layer,calls,options,create:()=>new CaseInputAdapter(options)};
}
