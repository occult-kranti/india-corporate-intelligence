import * as T from 'three';
import type { CustomLayerInterface, Map as MapLibreMap } from 'maplibre-gl';
import type { CaseFile } from './contract';
import { createCaseSceneModel, presentCaseScene, SCENE_BUDGET } from './layout';
import type { CaseSceneModel } from './layout';
import { orthographicFrame, sampleCamera } from './state';
import type { CaseNavigation } from './navigation';
import type { CameraPose, CaseSceneState } from './state';
import { bufferRect, ribbon, screenPoint, segmentDistance, targetArrow, targetSize, TARGET_BUDGET } from './geometry';
import type { Point3, Rect } from './geometry';
import { withCaseGL, renderOwned, SharedRendererFailure } from './gl-boundary';
import type { PassMetrics } from './gl-boundary';

export interface CaseLabel {id:string;kind:string;label:string;qualification:string;x:number;y:number;visible:boolean}
export interface CaseRoleLabel {id:string;claimId:string;label:string;x:number;y:number;visible:boolean}
export interface CaseFrame {nodes:CaseLabel[];roles:CaseRoleLabel[];presentation:ReturnType<typeof presentCaseScene>}
export interface CaseRenderMetrics {targetWidth:number;targetHeight:number;estimatedGpuBytes:number;scene:PassMetrics;composite:PassMetrics}
export interface CaseLayerOptions {
  id?:string;rect:()=>Rect;quality?:()=>number;
  /** Synchronously disable ALL later host Three draws in the current frame; then
   * enter whole-graphics fallback. Recreate the complete shared renderer explicitly. */
  onSharedRendererFailure:(reason:string)=>void;
  onFailure:(reason:string)=>void;onFrame?:(frame:CaseFrame)=>void;onMetrics?:(metrics:CaseRenderMetrics)=>void;
  /** Required host contract: resetState + explicit target bind before every host Three render. */
  hostResetsThreeAtEveryBoundary:true;
}
const activeOwners=new WeakMap<T.WebGLRenderer,CaseSceneLayer>();
const blankMetrics=():PassMetrics=>({calls:0,triangles:0,points:0,lines:0});
const clipVertex='attribute float distanceAlong; varying float vDistance; void main(){vDistance=distanceAlong;gl_Position=vec4(position,1.0);}';
const solidVertex='void main(){gl_Position=vec4(position,1.0);}';
const paperColor=new T.Color('#e9dfbf'),pinColor=new T.Color('#b66d4d'),brass=new T.Color('#c3a166'),cream=new T.Color('#fff4c9');
/** Same renderer/context, independent screen-local scene. No second WebGL canvas. */
export class CaseSceneLayer implements CustomLayerInterface {
  readonly id:string;readonly type='custom' as const;readonly renderingMode='2d' as const;
  readonly model:CaseSceneModel;
  private map:MapLibreMap|null=null;private disposed=false;private failed=false;private dirty=true;private readyTexture=false;
  private scene=new T.Scene();private camera=new T.OrthographicCamera();private compositeScene=new T.Scene();private compositeCamera=new T.Camera();
  private target:T.WebGLRenderTarget|null=null;private targetKey='';private sizeKey='';private state:CaseSceneState|null=null;private now=0;
  private instances=new Set<T.InstancedMesh>();private geometry=new Set<T.BufferGeometry>();private materials=new Set<T.Material>();private ribbons=new T.Group();
  private pinRims:T.InstancedMesh;private compositeMaterial:T.ShaderMaterial;
  private ribbonMeshes=new Map<string,T.Mesh<T.BufferGeometry,T.ShaderMaterial>>();private ribbonMaterialCache=new Map<string,T.ShaderMaterial>();private arrowMaterial:T.ShaderMaterial|null=null;
  private projection=new Map<string,Point3[]>();private frame:CaseFrame|null=null;private lastLabelMs=-Infinity;private framePending=false;
  private sceneMetrics=blankMetrics();private compositeMetrics=blankMetrics();
  constructor(file:CaseFile,private renderer:T.WebGLRenderer,private options:CaseLayerOptions) {
    if(T.REVISION!=='180')throw new Error('Requires Three r180');
    if(typeof options.onSharedRendererFailure!=='function')throw new Error('Missing shared-failure hook');
    if(options.hostResetsThreeAtEveryBoundary!==true)throw new Error('Missing Three reset contract');
    this.id=options.id??'case-workspace';this.model=createCaseSceneModel(file);
    this.addFelt();this.pinRims=this.addPins();this.scene.add(this.ribbons);
    this.compositeMaterial=this.shader({uniforms:{map:{value:null}},vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position,1.0);}',fragmentShader:'uniform sampler2D map; varying vec2 vUv; void main(){gl_FragColor=vec4(texture2D(map,vUv).rgb,1.0); #include <colorspace_fragment>\n}'});
    // Shader include directives must start their own line.
    this.compositeMaterial.fragmentShader=this.compositeMaterial.fragmentShader.replace(' #include','\n#include');
    this.compositeScene.add(new T.Mesh(this.ownGeometry(new T.PlaneGeometry(2,2)),this.compositeMaterial));
  }
  private ownGeometry<G extends T.BufferGeometry>(geometry:G):G {this.geometry.add(geometry);return geometry;}
  private ownMaterial<M extends T.Material>(material:M):M {this.materials.add(material);return material;}
  private shader(parameters:T.ShaderMaterialParameters):T.ShaderMaterial {return this.ownMaterial(new T.ShaderMaterial({depthTest:false,depthWrite:false,blending:T.NoBlending,toneMapped:false,...parameters}));}
  private basic(color:T.Color):T.MeshBasicMaterial {return this.ownMaterial(new T.MeshBasicMaterial({color,toneMapped:false}));}
  private addFelt() {
    const mat=this.shader({uniforms:{dark:{value:new T.Color('#123e2d')},light:{value:new T.Color('#246342')}},vertexShader:solidVertex,fragmentShader:'uniform vec3 dark;uniform vec3 light;void main(){float grain=fract(sin(dot(floor(gl_FragCoord.xy),vec2(12.9898,78.233)))*43758.5453);gl_FragColor=vec4(mix(dark,light,0.42+grain*0.10),1.0);}'});
    const mesh=new T.Mesh(this.ownGeometry(new T.PlaneGeometry(2,2)),mat);mesh.frustumCulled=false;mesh.renderOrder=-1000;this.scene.add(mesh);
  }
  private paperShape(cut:boolean):T.ShapeGeometry {
    const s=new T.Shape();s.moveTo(-1.6,-.9);s.lineTo(1.6,-.9);s.lineTo(1.6,cut?.55:.9);if(cut)s.lineTo(1.25,.9);s.lineTo(-1.6,.9);s.closePath();return new T.ShapeGeometry(s);
  }
  private addPins():T.InstancedMesh {
    const dummy=new T.Object3D(),nodes=this.model.nodes;
    for(const cut of [false,true]) {
      const entries=nodes.filter(n=>(n.lane==='unresolved_endpoint')===cut);if(!entries.length)continue;
      const cards=new T.InstancedMesh(this.ownGeometry(this.paperShape(cut)),this.basic(paperColor),entries.length);cards.renderOrder=0;this.instances.add(cards);
      entries.forEach((node,i)=>{dummy.position.set(node.position[0],node.position[1],.12);dummy.rotation.set(0,0,0);dummy.updateMatrix();cards.setMatrixAt(i,dummy.matrix);});cards.instanceMatrix.needsUpdate=true;cards.computeBoundingSphere();this.scene.add(cards);
    }
    const stemGeometry=this.ownGeometry(new T.CylinderGeometry(.045,.055,.35,6));stemGeometry.rotateX(Math.PI/2);
    const stems=new T.InstancedMesh(stemGeometry,this.basic(brass),nodes.length);
    const heads=new T.InstancedMesh(this.ownGeometry(new T.IcosahedronGeometry(.16,0)),this.basic(pinColor),nodes.length);
    const rims=new T.InstancedMesh(this.ownGeometry(new T.RingGeometry(.20,.28,12)),this.basic(new T.Color('white')),nodes.length);
    for(const [mesh,z] of [[stems,.39],[heads,.65],[rims,.58]] as const){this.instances.add(mesh);mesh.renderOrder=30;nodes.forEach((node,i)=>{dummy.position.set(node.position[0],node.position[1],z);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);if(mesh===rims)mesh.setColorAt(i,node.lane==='group_label'?brass:new T.Color('#31533c'));});mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();this.scene.add(mesh);}
    return rims;
  }
  onAdd=(map:MapLibreMap,gl:WebGL2RenderingContext):void=>{
    try {
      if(map.version!=='6.13.0')throw new Error('Requires MapLibre 6.13.0');
      if(this.disposed)throw new Error('Disposed case layer');
      if(this.renderer.getContext()!==gl||this.renderer.domElement!==map.getCanvas())throw new Error('Map canvas/context mismatch');
      if(activeOwners.has(this.renderer))throw new Error('Only one case allowed');
      activeOwners.set(this.renderer,this);this.map=map;this.requestRepaint();
    }catch(error){this.fail(error);}
  };
  onRemove=():void=>{this.dispose();};
  setState(state:CaseSceneState,activeNowMs:number):void {
    if(this.disposed||this.failed)return;
    if(!Number.isFinite(activeNowMs))throw new Error('Invalid active clock');
    if(state.caseId!==this.model.caseId)throw new Error('Remove prior case first');
    // Validation is pure and includes visible-edge/source direction boundaries.
    presentCaseScene(this.model,state.navigation,sampleCamera(state,activeNowMs).zoom);
    this.state=state;this.now=activeNowMs;this.dirty=true;this.requestRepaint();
  }
  resize():void {if(!this.disposed){this.dirty=true;this.requestRepaint();}}
  requestRepaint():void {if(!this.disposed&&!this.failed&&this.state?.view==='scene')this.map?.triggerRepaint();}
  private canvasRect():Rect {const r=this.renderer.domElement.getBoundingClientRect();return {x:r.left,y:r.top,width:r.width,height:r.height};}
  private dimensions() {
    const rect=this.options.rect(),canvas=this.canvasRect(),gl=this.renderer.getContext();
    const buffer=bufferRect(rect,canvas,{width:gl.drawingBufferWidth,height:gl.drawingBufferHeight});
    const size=targetSize(rect.width,rect.height,Math.max(gl.drawingBufferWidth/canvas.width,gl.drawingBufferHeight/canvas.height),this.options.quality?.()??1);
    return {rect,buffer,size};
  }
  private configureCamera(camera:T.OrthographicCamera,pose:CameraPose,rect:Rect) {
    const frame=orthographicFrame(this.model,rect.width,rect.height,pose);
    Object.assign(camera,{left:frame.left,right:frame.right,top:frame.top,bottom:frame.bottom,near:frame.near,far:frame.far});
    const tilt=pose.tilt*Math.PI/180;camera.up.set(0,1,0);camera.position.set(pose.center[0],pose.center[1]+Math.sin(tilt)*100,Math.cos(tilt)*100);camera.lookAt(pose.center[0],pose.center[1],0);camera.rotateZ(pose.bearing*Math.PI/180);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);return frame;
  }
  private updateCamera(rect:Rect) {if(this.state)return this.configureCamera(this.camera,sampleCamera(this.state,this.now),rect);}
  /** Only selection-triggered travel uses this viewport-aware safety fit. Deliberate
   * pan/zoom remains under user control. DOM wrapping still needs browser acceptance. */
  fitSelectionPose(pose:CameraPose,navigation:CaseNavigation):CameraPose {
    const ids=new Set<string>();if(navigation.nodeId)ids.add(navigation.nodeId);
    for(const thread of this.model.threads)if(thread.record.id===navigation.edgeId||navigation.nodeId&&(thread.record.from===navigation.nodeId||thread.record.to===navigation.nodeId)){ids.add(thread.record.from);ids.add(thread.record.to);}
    if(!ids.size)return pose;const rect=this.options.rect(),camera=new T.OrthographicCamera();this.configureCamera(camera,pose,rect);
    const limitX=Math.max(.25,1-72/rect.width),limitY=Math.max(.25,1-72/rect.height);let factor=1;
    for(const node of this.model.nodes.filter(n=>ids.has(n.record.id)))for(const x of [-1,1])for(const y of [-1,1]){const p=new T.Vector3(node.position[0]+x*node.cardSize[0]/2,node.position[1]+y*node.cardSize[1]/2,.65).project(camera);factor=Math.max(factor,Math.abs(p.x)/limitX,Math.abs(p.y)/limitY);}
    return {...pose,zoom:Math.max(.7,pose.zoom/factor)};
  }
  private project=(point:Point3):Point3=>{const v=new T.Vector3(...point).project(this.camera);return [v.x,v.y,v.z];};
  private upsertRibbon(key:string,positions:Float32Array,distances:Float32Array|null,indices:Uint16Array|null,material:T.ShaderMaterial,order:number) {
    let mesh=this.ribbonMeshes.get(key);
    if(!mesh){const geometry=this.ownGeometry(new T.BufferGeometry());const vertices=key==='arrows'?SCENE_BUDGET.visibleThreads*3:SCENE_BUDGET.curveSegments*4;geometry.setAttribute('position',new T.BufferAttribute(new Float32Array(vertices*3),3));if(distances)geometry.setAttribute('distanceAlong',new T.BufferAttribute(new Float32Array(vertices),1));if(indices)geometry.setIndex(new T.BufferAttribute(new Uint16Array(SCENE_BUDGET.curveSegments*6),1));mesh=new T.Mesh(geometry,material);mesh.frustumCulled=false;this.ribbonMeshes.set(key,mesh);this.ribbons.add(mesh);}
    const position=mesh.geometry.getAttribute('position') as T.BufferAttribute;position.array.set(positions);position.needsUpdate=true;
    if(distances){const attribute=mesh.geometry.getAttribute('distanceAlong') as T.BufferAttribute;attribute.array.set(distances);attribute.needsUpdate=true;}
    if(indices){mesh.geometry.index!.array.set(indices);mesh.geometry.index!.needsUpdate=true;}
    mesh.geometry.setDrawRange(0,indices?indices.length:positions.length/3);mesh.material=material;mesh.renderOrder=order;
  }
  private pruneRibbons(used:Set<string>) {for(const [key,mesh] of this.ribbonMeshes)if(!used.has(key)){this.ribbons.remove(mesh);mesh.geometry.dispose();this.geometry.delete(mesh.geometry);this.ribbonMeshes.delete(key);}}
  private ribbonMaterial(color:T.Color,dash:string):T.ShaderMaterial {
    const key=`${color.getHexString()}:${dash}`;const cached=this.ribbonMaterialCache.get(key);if(cached)return cached;
    const parts=dash?dash.split(' ').map(Number):[],period=parts.reduce((a,b)=>a+b,0);const stops:number[]=[];let sum=0;for(const value of parts){sum+=value;stops.push(sum);}while(stops.length<8)stops.push(sum);
    const material=this.shader({uniforms:{color:{value:color},period:{value:period},stops:{value:stops},count:{value:parts.length}},vertexShader:clipVertex,fragmentShader:'uniform vec3 color;uniform float period;uniform float stops[8];uniform int count;varying float vDistance;void main(){if(period>0.0){float phase=mod(vDistance,period);for(int i=0;i<8;i++){if(i<count&&phase<stops[i]){if(mod(float(i),2.0)>0.5)discard;break;}}}gl_FragColor=vec4(color,1.0);}'});this.ribbonMaterialCache.set(key,material);return material;
  }
  private rebuild(rect:Rect) {
    const frame=this.updateCamera(rect);if(!this.state||!frame)return;
    const pose=sampleCamera(this.state,this.now),presentation=presentCaseScene(this.model,this.state.navigation,pose.zoom);this.projection.clear();
    const used=new Set<string>(),arrows:number[]=[];
    for(const thread of presentation.threads) {
      for(const halo of thread.emphasized?[true,false]:[false]) {
        const data=ribbon(thread,this.project,rect,halo?4.5:1.5),key=`${thread.record.id}:${halo?'halo':'core'}`;used.add(key);
        const material=this.ribbonMaterial(halo?new T.Color('#102e20'):thread.emphasized?cream:brass,thread.dash);this.upsertRibbon(key,data.positions,data.distances,data.indices,material,halo?10:11);
        if(!halo){this.projection.set(thread.record.id,data.screen);arrows.push(...targetArrow(data.screen,rect,.2*frame.cssPixelsPerLayoutUnit));}
      }
    }
    if(arrows.length){if(!this.arrowMaterial)this.arrowMaterial=this.shader({uniforms:{color:{value:cream}},vertexShader:solidVertex,fragmentShader:'uniform vec3 color;void main(){gl_FragColor=vec4(color,1.0);}'});used.add('arrows');this.upsertRibbon('arrows',new Float32Array(arrows),null,null,this.arrowMaterial,12);}
    this.pruneRibbons(used);
    const visible=(p:Point3)=>p[0]>=0&&p[0]<=rect.width&&p[1]>=0&&p[1]<=rect.height&&p[2]>=-1&&p[2]<=1;
    const nodes=presentation.nodes.map((node,i)=>{this.pinRims.setColorAt(i,node.emphasized?cream:node.lane==='group_label'?brass:new T.Color('#31533c'));const p=screenPoint(this.project(node.position),rect);return {id:node.record.id,label:node.record.label,kind:node.record.kind,qualification:node.record.qualification,x:p[0],y:p[1],visible:visible(p)};});
    if(this.pinRims.instanceColor)this.pinRims.instanceColor.needsUpdate=true;
    const roles=presentation.threads.filter(t=>presentation.detailLevel!=='overview'||t.selected).map(thread=>{const points=this.projection.get(thread.record.id)!;const p=points[Math.floor(points.length/2)];return {id:thread.record.id,claimId:thread.record.claimId,label:thread.record.role,x:p[0],y:p[1],visible:visible(p)};});
    this.frame={nodes,roles,presentation};this.framePending=true;
  }
  prerender=(gl:WebGL2RenderingContext):void=>{
    if(this.disposed||this.failed||!this.state||this.state.view!=='scene')return;
    try {
      const {rect,size}=this.dimensions(),sizeKey=JSON.stringify([rect.width,rect.height,size]);if(sizeKey!==this.sizeKey){this.dirty=true;this.sizeKey=sizeKey;}
      if(!this.dirty)return;
      withCaseGL(this.renderer,gl,receipt=>{
        const targetKey=`${size.width}x${size.height}`;
        if(this.targetKey!==targetKey){this.target?.dispose();this.target=new T.WebGLRenderTarget(size.width,size.height,{format:T.RGBAFormat,type:T.UnsignedByteType,depthBuffer:true,stencilBuffer:false,samples:0,generateMipmaps:false,minFilter:T.LinearFilter,magFilter:T.LinearFilter});this.target.texture.colorSpace=T.LinearSRGBColorSpace;this.targetKey=targetKey;this.compositeMaterial.uniforms.map.value=this.target.texture;this.readyTexture=false;}
        this.rebuild(rect);
        // setViewport/setScissor always multiply the renderer's pixel ratio in r180.
        // Target viewport fields are already physical pixels and setRenderTarget uses them directly.
        this.target!.viewport.set(0,0,size.width,size.height);this.target!.scissor.set(0,0,size.width,size.height);this.target!.scissorTest=false;
        this.renderer.setRenderTarget(this.target);if(gl.isContextLost()||gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING)===null||gl.checkFramebufferStatus(gl.DRAW_FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('Case framebuffer incomplete');this.renderer.setClearColor('#123e2d',1);this.renderer.clear(true,true,false);renderOwned(this.renderer,this.scene,this.camera);
        // Capture metrics before restoration, without overwriting host per-frame counters.
        this.sceneMetrics=receipt.metrics;this.readyTexture=true;this.dirty=false;
      });
      this.emitFrame();
    }catch(error){this.fail(error);}
  };
  render=(gl:WebGL2RenderingContext):void=>{
    if(this.disposed||this.failed||!this.state||this.state.view!=='scene'||!this.readyTexture||!this.target)return;
    try {
      const {buffer}=this.dimensions();
      withCaseGL(this.renderer,gl,receipt=>{
        // MapLibre's documented render main-framebuffer path is supported. A future
        // terrain/postprocess FBO must not be silently replaced by the canvas.
        if(!receipt.defaultFramebuffer)throw new Error('Non-default composite framebuffer unsupported');
        this.renderer.setRenderTarget(null);
        const ratio=this.renderer.getPixelRatio();this.renderer.setViewport(buffer.x/ratio,buffer.y/ratio,buffer.width/ratio,buffer.height/ratio);this.renderer.setScissor(buffer.x/ratio,buffer.y/ratio,buffer.width/ratio,buffer.height/ratio);this.renderer.setScissorTest(true);
        renderOwned(this.renderer,this.compositeScene,this.compositeCamera);this.compositeMetrics=receipt.metrics;
      });
      const metrics=this.metrics();if(metrics.scene.calls+metrics.composite.calls>SCENE_BUDGET.incrementalDrawCalls||metrics.scene.triangles+metrics.composite.triangles>SCENE_BUDGET.incrementalTriangles)throw new Error('Case draw budget exceeded');this.safeNotify(()=>this.options.onMetrics?.(metrics));
    }catch(error){this.fail(error);}
  };
  private emitFrame() {if(this.framePending&&this.frame&&(!this.state?.motion||this.now-this.lastLabelMs>=1000/SCENE_BUDGET.labelUpdatesPerSecond)){const frame=this.frame;this.framePending=false;this.lastLabelMs=this.now;this.safeNotify(()=>this.options.onFrame?.(frame));}}
  private safeNotify(callback:()=>void) {queueMicrotask(()=>{if(!this.disposed)try{callback();}catch{/* Host callbacks must never escape MapLibre's state-cleanup path. */}});}
  private fail(error:unknown) {if(this.failed||this.disposed)return;this.failed=true;this.readyTexture=false;if(error instanceof SharedRendererFailure)try{this.options.onSharedRendererFailure(String(error));}catch{/* Host must not escape MapLibre cleanup. */}this.safeNotify(()=>this.options.onFailure(`Use complete reader. ${String(error)}`));}
  contextLost():void {this.fail(new Error('Context lost; recreate explicitly'));}
  metrics():CaseRenderMetrics {return {targetWidth:this.target?.width??0,targetHeight:this.target?.height??0,estimatedGpuBytes:this.disposed?0:(this.target?this.target.width*this.target.height*8:0)+TARGET_BUDGET.otherGpuBytes,scene:{...this.sceneMetrics},composite:{...this.compositeMetrics}};}
  /** Node-first hit test. Ambiguous adjacent strings return explicit role choices. */
  pick(x:number,y:number):{kind:'node';id:string}|{kind:'edges';ids:string[]}|null {
    if(!this.frame||this.failed||this.state?.view!=='scene')return null;
    const nodes=this.frame.nodes.filter(n=>n.visible&&Math.hypot(n.x-x,n.y-y)<=22).sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y)||a.id.localeCompare(b.id));if(nodes.length)return {kind:'node',id:nodes[0].id};
    const hits=[...this.projection].map(([id,points])=>({id,distance:Math.min(...points.slice(1).map((p,i)=>segmentDistance(x,y,points[i],p)))})).filter(h=>h.distance<=7).sort((a,b)=>a.distance-b.distance||a.id.localeCompare(b.id));
    return hits.length?{kind:'edges',ids:hits.filter(h=>h.distance<=hits[0].distance+2).map(h=>h.id)}:null;
  }
  /** Used only for layout pan. Never convert these values to map coordinates. */
  layoutAt(x:number,y:number):readonly [number,number]|null {
    const rect=this.options.rect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(x/rect.width*2-1,1-y/rect.height*2),this.camera);const point=ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,0,1),0),new T.Vector3());return point?[point.x,point.y]:null;
  }
  dispose():void {
    if(this.disposed)return;this.disposed=true;if(activeOwners.get(this.renderer)===this)activeOwners.delete(this.renderer);
    this.target?.dispose();this.target=null;this.compositeMaterial.uniforms.map.value=null;
    for(const mesh of this.instances)mesh.dispose();this.instances.clear();for(const geometry of this.geometry)geometry.dispose();for(const material of this.materials)material.dispose();this.geometry.clear();this.materials.clear();this.scene.clear();this.compositeScene.clear();this.ribbonMeshes.clear();this.ribbonMaterialCache.clear();this.arrowMaterial=null;this.projection.clear();this.frame=null;this.state=null;this.map=null;
    // Never renderer.dispose(), forceContextLoss(), canvas resize, or map.remove().
  }
}
