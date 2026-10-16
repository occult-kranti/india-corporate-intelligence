import { Color, Vector4 } from 'three';
import type { Camera, Scene, WebGLRenderer } from 'three';

/** This is a MapLibre custom-callback boundary, not a generic nested Three render.
 * Every subsequent host Three entry MUST resetState and explicitly bind its intended
 * target. MapLibre 6.13 calls context.setDirty after callbacks return. Raw GL restoration
 * deliberately happens LAST: Three resetState binds default DRAW/READ framebuffers. */
export function captureExternalGL(gl:WebGL2RenderingContext):()=>void {
  const restore:Array<()=>void>=[];
  const param=(key:number)=>gl.getParameter(key);
  const draw=param(gl.DRAW_FRAMEBUFFER_BINDING),read=param(gl.READ_FRAMEBUFFER_BINDING);
  const viewport=param(gl.VIEWPORT) as number[],scissor=param(gl.SCISSOR_BOX) as number[];
  const drawBuffers=Array.from({length:draw?param(gl.MAX_DRAW_BUFFERS):1},(_,i)=>param(gl.DRAW_BUFFER0+i));const readBuffer=param(gl.READ_BUFFER);
  restore.push(()=>{gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,draw);gl.bindFramebuffer(gl.READ_FRAMEBUFFER,read);gl.drawBuffers(drawBuffers);gl.readBuffer(readBuffer);});
  restore.push(()=>gl.viewport(viewport[0],viewport[1],viewport[2],viewport[3]),()=>gl.scissor(scissor[0],scissor[1],scissor[2],scissor[3]));
  for(const cap of [gl.BLEND,gl.CULL_FACE,gl.DEPTH_TEST,gl.POLYGON_OFFSET_FILL,gl.SCISSOR_TEST,gl.STENCIL_TEST,gl.SAMPLE_ALPHA_TO_COVERAGE,gl.SAMPLE_COVERAGE,gl.RASTERIZER_DISCARD]){const enabled=gl.isEnabled(cap);restore.push(()=>enabled?gl.enable(cap):gl.disable(cap));}
  const colorMask=param(gl.COLOR_WRITEMASK) as boolean[],clearColor=param(gl.COLOR_CLEAR_VALUE) as number[],depthRange=param(gl.DEPTH_RANGE) as number[];
  const depthMask=param(gl.DEPTH_WRITEMASK),depthFunc=param(gl.DEPTH_FUNC),clearDepth=param(gl.DEPTH_CLEAR_VALUE),clearStencil=param(gl.STENCIL_CLEAR_VALUE);
  restore.push(()=>gl.colorMask(colorMask[0],colorMask[1],colorMask[2],colorMask[3]),()=>gl.clearColor(clearColor[0],clearColor[1],clearColor[2],clearColor[3]),()=>gl.depthRange(depthRange[0],depthRange[1]),()=>gl.depthMask(depthMask),()=>gl.depthFunc(depthFunc),()=>gl.clearDepth(clearDepth),()=>gl.clearStencil(clearStencil));
  const blend=[gl.BLEND_EQUATION_RGB,gl.BLEND_EQUATION_ALPHA,gl.BLEND_SRC_RGB,gl.BLEND_DST_RGB,gl.BLEND_SRC_ALPHA,gl.BLEND_DST_ALPHA].map(param),blendColor=param(gl.BLEND_COLOR) as number[];
  restore.push(()=>gl.blendEquationSeparate(blend[0],blend[1]),()=>gl.blendFuncSeparate(blend[2],blend[3],blend[4],blend[5]),()=>gl.blendColor(blendColor[0],blendColor[1],blendColor[2],blendColor[3]));
  for(const back of [false,true]) {
    const face=back?gl.BACK:gl.FRONT;
    const vals=(back?[gl.STENCIL_BACK_WRITEMASK,gl.STENCIL_BACK_FUNC,gl.STENCIL_BACK_REF,gl.STENCIL_BACK_VALUE_MASK,gl.STENCIL_BACK_FAIL,gl.STENCIL_BACK_PASS_DEPTH_FAIL,gl.STENCIL_BACK_PASS_DEPTH_PASS]:[gl.STENCIL_WRITEMASK,gl.STENCIL_FUNC,gl.STENCIL_REF,gl.STENCIL_VALUE_MASK,gl.STENCIL_FAIL,gl.STENCIL_PASS_DEPTH_FAIL,gl.STENCIL_PASS_DEPTH_PASS]).map(param);
    restore.push(()=>gl.stencilMaskSeparate(face,vals[0]),()=>gl.stencilFuncSeparate(face,vals[1],vals[2],vals[3]),()=>gl.stencilOpSeparate(face,vals[4],vals[5],vals[6]));
  }
  const cull=param(gl.CULL_FACE_MODE),front=param(gl.FRONT_FACE),factor=param(gl.POLYGON_OFFSET_FACTOR),units=param(gl.POLYGON_OFFSET_UNITS),line=param(gl.LINE_WIDTH);
  restore.push(()=>gl.cullFace(cull),()=>gl.frontFace(front),()=>gl.polygonOffset(factor,units),()=>gl.lineWidth(line));
  const program=param(gl.CURRENT_PROGRAM),vao=param(gl.VERTEX_ARRAY_BINDING),array=param(gl.ARRAY_BUFFER_BINDING),element=param(gl.ELEMENT_ARRAY_BUFFER_BINDING),renderbuffer=param(gl.RENDERBUFFER_BINDING);
  restore.push(()=>gl.useProgram(program),()=>gl.bindVertexArray(vao),()=>gl.bindBuffer(gl.ARRAY_BUFFER,array),()=>gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,element),()=>gl.bindRenderbuffer(gl.RENDERBUFFER,renderbuffer));
  // Owned scene shaders sample only TEXTURE0. r180 setupRenderTarget uses the
  // LAST combined texture unit when its cached current slot is unset. Capture
  // both; assuming resetState's physical TEXTURE0 equals its null slot is wrong.
  const active=param(gl.ACTIVE_TEXTURE),textureUnits=[...new Set([0,param(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS)-1])];
  try {
    for(const unit of textureUnits) {
      gl.activeTexture(gl.TEXTURE0+unit);
      for(const [target,binding] of [[gl.TEXTURE_2D,gl.TEXTURE_BINDING_2D],[gl.TEXTURE_CUBE_MAP,gl.TEXTURE_BINDING_CUBE_MAP],[gl.TEXTURE_3D,gl.TEXTURE_BINDING_3D],[gl.TEXTURE_2D_ARRAY,gl.TEXTURE_BINDING_2D_ARRAY]]){const texture=param(binding);restore.push(()=>{gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(target,texture);});}
      const sampler=param(gl.SAMPLER_BINDING);restore.push(()=>gl.bindSampler(unit,sampler));
    }
  } finally {gl.activeTexture(active);}
  restore.push(()=>gl.activeTexture(active));
  for(const key of [gl.UNPACK_ALIGNMENT,gl.UNPACK_FLIP_Y_WEBGL,gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,gl.UNPACK_ROW_LENGTH,gl.UNPACK_IMAGE_HEIGHT,gl.UNPACK_SKIP_PIXELS,gl.UNPACK_SKIP_ROWS,gl.UNPACK_SKIP_IMAGES]){const value=param(key);restore.push(()=>gl.pixelStorei(key,value));}
  return ()=>{const errors:unknown[]=[];for(const step of restore)try{step();}catch(error){errors.push(error);}if(errors.length)throw new Error(`External GL restoration failed in ${errors.length} operations`);};
}
/** resetState cannot unwind Three's private render stacks after a thrown render. */
export class SharedRendererFailure extends Error {}
export function renderOwned(renderer:WebGLRenderer,scene:Scene,camera:Camera):void {try{renderer.render(scene,camera);}catch(error){throw new SharedRendererFailure(`Three.render aborted: ${String(error)}`);}}
export interface PassMetrics {calls:number;triangles:number;points:number;lines:number}
export interface PassReceipt {metrics:PassMetrics;defaultFramebuffer:boolean}
export function withCaseGL<T>(renderer:WebGLRenderer,gl:WebGL2RenderingContext,draw:(receipt:PassReceipt)=>T):T {
  if(renderer.getContext()!==gl)throw new Error('Must reuse map context');
  if(gl.isContextLost())throw new Error('WebGL context lost');
  if(renderer.xr.enabled)throw new Error('XR unsupported');
  const restoreGL=captureExternalGL(gl);
  const snapshot={target:renderer.getRenderTarget(),face:renderer.getActiveCubeFace(),mip:renderer.getActiveMipmapLevel(),viewport:renderer.getViewport(new Vector4()),scissor:renderer.getScissor(new Vector4()),scissorTest:renderer.getScissorTest(),color:renderer.getClearColor(new Color()),alpha:renderer.getClearAlpha(),autoClear:renderer.autoClear,sortObjects:renderer.sortObjects,clippingPlanes:renderer.clippingPlanes,localClippingEnabled:renderer.localClippingEnabled,infoAutoReset:renderer.info.autoReset,info:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,points:renderer.info.render.points,lines:renderer.info.render.lines},shaderCheck:renderer.debug.checkShaderErrors,shaderError:renderer.debug.onShaderError};
  const receipt:PassReceipt={metrics:{calls:0,triangles:0,points:0,lines:0},defaultFramebuffer:gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING)===null};
  let result:T|undefined,error:unknown,shaderFailed=false;
  try {
    renderer.resetState();renderer.autoClear=false;renderer.sortObjects=true;renderer.clippingPlanes=[];renderer.localClippingEnabled=false;renderer.info.autoReset=false;renderer.debug.checkShaderErrors=true;renderer.debug.onShaderError=()=>{shaderFailed=true;};
    gl.depthRange(0,1);gl.disable(gl.RASTERIZER_DISCARD);gl.disable(gl.SAMPLE_COVERAGE);gl.bindSampler(0,null);
    result=draw(receipt);
    // Report only after Three finishes shader deletion and private stack unwind.
    if(shaderFailed)throw new Error('Case shader failed');
    for(const key of ['calls','triangles','points','lines'] as const)receipt.metrics[key]=renderer.info.render[key]-snapshot.info[key];
  } catch(caught){error=caught;}
  finally {
    // Restore Three's logical settings first, actual foreign GL last. Do not reset
    // after restoreGL: that would silently discard MapLibre's actual framebuffer.
    const steps=[()=>renderer.resetState(),()=>{renderer.autoClear=snapshot.autoClear;renderer.sortObjects=snapshot.sortObjects;renderer.clippingPlanes=snapshot.clippingPlanes;renderer.localClippingEnabled=snapshot.localClippingEnabled;renderer.info.autoReset=snapshot.infoAutoReset;// Preserve frame: WebGLObjects uses it as an upload-cache epoch.
    Object.assign(renderer.info.render,snapshot.info);renderer.debug.checkShaderErrors=snapshot.shaderCheck;renderer.debug.onShaderError=snapshot.shaderError;},()=>renderer.setClearColor(snapshot.color,snapshot.alpha),()=>renderer.setViewport(snapshot.viewport),()=>renderer.setScissor(snapshot.scissor),()=>renderer.setScissorTest(snapshot.scissorTest),()=>renderer.setRenderTarget(snapshot.target,snapshot.face,snapshot.mip),restoreGL];
    for(const step of steps)try{step();}catch(caught){error=new SharedRendererFailure(`Case pass restoration failed: ${String(caught)}; original error: ${String(error??'none')}`);}
  }
  if(error)throw error;
  return result as T;
}
