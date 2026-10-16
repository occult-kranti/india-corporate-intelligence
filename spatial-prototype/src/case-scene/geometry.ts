/** Pure screen-local geometry. No geography, identity joins, amount scaling or animation. */
import { cubicPoint, SCENE_BUDGET } from './layout';
import type { LayoutThread } from './layout';
export interface Rect { x:number; y:number; width:number; height:number }
export interface Size {width:number;height:number}
export type Point3=readonly [number,number,number];
export const TARGET_BUDGET=Object.freeze({maxDimension:1024,maxPixels:786432,otherGpuBytes:2*1024*1024});
export function targetSize(width:number,height:number,dpr:number,quality=1):Size {
  if(![width,height,dpr,quality].every(Number.isFinite)||width<=0||height<=0||dpr<=0||quality<=0)throw new Error('Invalid case viewport');
  let w=width*Math.min(dpr,SCENE_BUDGET.maxDpr)*Math.min(quality,1),h=height*Math.min(dpr,SCENE_BUDGET.maxDpr)*Math.min(quality,1);
  const scale=Math.min(1,TARGET_BUDGET.maxDimension/w,TARGET_BUDGET.maxDimension/h,Math.sqrt(TARGET_BUDGET.maxPixels/(w*h)));
  // Round down in stable 16-pixel buckets, never over the budget.
  w=Math.max(1,Math.floor(w*scale/16)*16);h=Math.max(1,Math.floor(h*scale/16)*16);
  return {width:w,height:h};
}
/** Client/CSS rectangle -> drawing-buffer pixels, bottom-left origin. The board must fit
 * inside the canvas; clipping it would stretch the composite and break hit/label parity. */
export function bufferRect(board:Rect,canvas:Rect,buffer:Size):Rect {
  if(![...Object.values(board),...Object.values(canvas),...Object.values(buffer)].every(Number.isFinite)||board.width<=0||board.height<=0||canvas.width<=0||canvas.height<=0||buffer.width<=0||buffer.height<=0)throw new Error('Invalid case rectangle');
  if(board.x<canvas.x-.5||board.y<canvas.y-.5||board.x+board.width>canvas.x+canvas.width+.5||board.y+board.height>canvas.y+canvas.height+.5)throw new Error('Case board must fit inside map canvas');
  const sx=buffer.width/canvas.width,sy=buffer.height/canvas.height;
  const left=Math.max(0,Math.round((board.x-canvas.x)*sx)),right=Math.min(buffer.width,Math.round((board.x+board.width-canvas.x)*sx));
  const bottom=Math.max(0,Math.round((canvas.y+canvas.height-board.y-board.height)*sy)),top=Math.min(buffer.height,Math.round((canvas.y+canvas.height-board.y)*sy));
  return {x:left,y:bottom,width:right-left,height:top-bottom};
}
export function screenPoint(ndc:Point3,size:Size):Point3 {return [(ndc[0]+1)*size.width/2,(1-ndc[1])*size.height/2,ndc[2]];}
export interface RibbonData {positions:Float32Array;distances:Float32Array;indices:Uint16Array;screen:Point3[];length:number}
/** Segment ribbons use fragment dash clipping, so triangle count stays bounded at every zoom. */
export function ribbon(thread:LayoutThread,project:(p:Point3)=>Point3,size:Size,widthCssPx=1.5):RibbonData {
  if(![size.width,size.height,widthCssPx].every(Number.isFinite)||size.width<=0||size.height<=0||widthCssPx<=0)throw new Error('Invalid ribbon dimensions');
  const screen=Array.from({length:SCENE_BUDGET.curveSegments+1},(_,i)=>screenPoint(project(cubicPoint(thread,i/SCENE_BUDGET.curveSegments)),size));
  if(screen.some(p=>p.some(v=>!Number.isFinite(v))))throw new Error('Non-finite case projection');
  const positions:number[]=[],distances:number[]=[],indices:number[]=[];let length=0;
  for(let i=1;i<screen.length;i++) {
    const a=screen[i-1],b=screen[i],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);if(len<1e-8)continue;
    const nx=-dy/len*widthCssPx/2,ny=dx/len*widthCssPx/2,base=positions.length/3;
    for(const [p,sign] of [[a,-1],[a,1],[b,-1],[b,1]] as const)positions.push((p[0]+nx*sign)/size.width*2-1,1-(p[1]+ny*sign)/size.height*2,0);
    distances.push(length,length,length+len,length+len);indices.push(base,base+1,base+2,base+1,base+3,base+2);length+=len;
  }
  return {positions:new Float32Array(positions),distances:new Float32Array(distances),indices:new Uint16Array(indices),screen,length};
}
/** Static target arrow, offset only to keep it outside the target pin silhouette. */
export function targetArrow(screen:readonly Point3[],size:Size,pinRadiusCss:number):Float32Array {
  if(screen.length<2)return new Float32Array();
  let remaining=Math.max(5,pinRadiusCss+3),tip:Point3|undefined,tangent:[number,number]=[1,0];
  for(let i=screen.length-1;i>0;i--) {
    const a=screen[i-1],b=screen[i],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);
    if(len<1e-8)continue;
    if(remaining<=len){const t=(len-remaining)/len;tip=[a[0]+dx*t,a[1]+dy*t,0];tangent=[dx/len,dy/len];break;}remaining-=len;
  }
  if(!tip)return new Float32Array();
  const [dx,dy]=tangent,points=[[tip[0],tip[1]],[tip[0]-dx*8+dy*4,tip[1]-dy*8-dx*4],[tip[0]-dx*8-dy*4,tip[1]-dy*8+dx*4]];
  return new Float32Array(points.flatMap(([x,y])=>[x/size.width*2-1,1-y/size.height*2,0]));
}
export function segmentDistance(x:number,y:number,a:Point3,b:Point3):number {const dx=b[0]-a[0],dy=b[1]-a[1],s=dx*dx+dy*dy,t=s?Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/s)):0;return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);}
