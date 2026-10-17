/** Screenshot sampling is selected from original projected geometry and DOM
 * occlusion only, never from successful pixel colors. Full native ROI remains mandatory. */
import assert from 'node:assert/strict';
export function inspectScreenshotPath({points,box,kind,roi,nominalWidthCss}) {
  const surface=document.querySelector(kind==='case'?'[data-case-surface]':'.webgl-host canvas');
  const guard=Math.max(9,nominalWidthCss/2+3),obstructions=new Map(),runs=[];let current=[];
  // Case labels intentionally have pointer-events:none, so hit testing alone
  // cannot identify their visible plaques. Include their actual painted boxes.
  const plaques=[...document.querySelectorAll('.cw-node-label,.cw-role-label')].map(element=>({element,rect:element.getBoundingClientRect()})).filter(({element,rect})=>{const style=getComputedStyle(element);return rect.width>0&&rect.height>0&&style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity)!==0;});
  const describe=element=>({tag:element.tagName,class:element.getAttribute('class'),label:element.getAttribute('aria-label'),rect:element.getBoundingClientRect().toJSON()});
  for(const point of points) {
    let clear=Boolean(surface);
    for(const plaque of plaques){const x=box.x+point.x,y=box.y+point.y,r=plaque.rect;if(x>=r.left-guard&&x<=r.right+guard&&y>=r.top-guard&&y<=r.bottom+guard){clear=false;const key=JSON.stringify(describe(plaque.element));obstructions.set(key,(obstructions.get(key)??0)+1);}}
    for(const [dx,dy] of [[0,0],[-guard,0],[guard,0],[0,-guard],[0,guard],[-guard,-guard],[guard,-guard],[-guard,guard],[guard,guard]]) {
      const target=document.elementFromPoint(box.x+point.x+dx,box.y+point.y+dy);
      if(target!==surface){clear=false;if(target){const value=describe(target),key=JSON.stringify(value);obstructions.set(key,(obstructions.get(key)??0)+1);}}
    }
    if(clear)current.push(point);else if(current.length){runs.push(current);current=[];}
  }
  if(current.length)runs.push(current);
  const candidates=runs.map(run=>({points:run,arcCss:run.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-run[i].x,p.y-run[i].y),0)})).sort((a,b)=>b.arcCss-a.arcCss);
  const best=candidates[0];let selected=null;
  if(best?.arcCss>=32) {
    const xs=best.points.map(p=>p.x),ys=best.points.map(p=>p.y),vertical=Math.max(...ys)-Math.min(...ys)>=Math.max(...xs)-Math.min(...xs);
    selected={left:vertical?roi.cssLeft:Math.min(...xs),right:vertical?roi.cssLeft+roi.width/roi.sx:Math.max(...xs),
      top:vertical?Math.min(...ys):roi.cssTop,bottom:vertical?Math.max(...ys):roi.cssTop+roi.height/roi.sy,arcCss:best.arcCss,
      witnessPoint:{x:best.points[Math.floor(best.points.length/2)].x,y:best.points[Math.floor(best.points.length/2)].y}};
  }
  return {selectionBasis:'Original projected path and DOM hit tests only; pixel values are not an input',guardCss:guard,requiredClearArcCss:32,selected,
    candidateArcLengths:candidates.map(c=>c.arcCss),obstructions:[...obstructions].map(([target,samples])=>({target:JSON.parse(target),samples})),sampleCount:points.length};
}
export function cropScreenshotRegion(region,selection) {
  assert.ok(selection && selection.arcCss>=32,'No independently unobstructed original-path screenshot interval');
  const {width,height,sx,sy,cssLeft,cssTop}=region;
  const x0=Math.max(0,Math.ceil((selection.left-cssLeft)*sx)),x1=Math.min(width,Math.floor((selection.right-cssLeft)*sx));
  const yTop=Math.max(0,Math.ceil((selection.top-cssTop)*sy)),yBottom=Math.min(height,Math.floor((selection.bottom-cssTop)*sy));
  assert.ok(x1>x0 && yBottom>yTop,'Invalid screenshot sampling bounds');
  const output=new Uint8Array((x1-x0)*(yBottom-yTop)*4),y0=height-yBottom;
  for(let y=0;y<yBottom-yTop;y++)output.set(region.pixels.subarray(((y0+y)*width+x0)*4,((y0+y)*width+x1)*4),y*(x1-x0)*4);
  return {...region,width:x1-x0,height:yBottom-yTop,x:region.x+x0,y:region.y+y0,cssLeft:cssLeft+x0/sx,cssTop:cssTop+yTop/sy,pixels:output};
}

/** Fixed-size native witness candidates along the original projected polyline.
 * Selection happens before native capture; no colors or successful draws enter it. */
export function witnessRegions(points,width,height) {
  assert.ok(width>=160&&height>=128&&points.length>=2);
  assert.ok(points.every(p=>p.length>=2&&p.slice(0,2).every(Number.isFinite)));
  const centers=[[width/2,height/2]];
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],dx=b[0]-a[0],dy=b[1]-a[1];let lo=0,hi=1;
    for(const [p,q] of [[-dx,a[0]-80],[dx,width-80-a[0]],[-dy,a[1]-64],[dy,height-64-a[1]]]){
      if(!p){if(q<0){lo=1;hi=0;break;}continue;}const t=q/p;if(p<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);
    }
    if(lo>hi)continue;const count=Math.max(1,Math.ceil(Math.hypot(dx,dy)*(hi-lo)/24));
    for(let j=0;j<=count;j++){const t=lo+(hi-lo)*j/count;centers.push([a[0]+dx*t,a[1]+dy*t]);}
  }
  const unique=[...new Map(centers.map(c=>[c.map(v=>v.toFixed(3)).join(','),c])).values()];
  return unique.sort((a,b)=>Math.hypot(a[0]-width/2,a[1]-height/2)-Math.hypot(b[0]-width/2,b[1]-height/2)).map(center=>({center,width:160,height:128,sx:1,sy:1,cssLeft:center[0]-80,cssTop:center[1]-64}));
}
export function witnessPathSamples(points,roi) {
  const samples=[];
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],dx=b[0]-a[0],dy=b[1]-a[1];let lo=0,hi=1;
    for(const [p,q] of [[-dx,a[0]-roi.cssLeft],[dx,roi.cssLeft+roi.width-a[0]],[-dy,a[1]-roi.cssTop],[dy,roi.cssTop+roi.height-a[1]]]){
      if(!p){if(q<0){lo=1;hi=0;break;}continue;}const t=q/p;if(p<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);
    }
    if(lo>hi)continue;const count=Math.max(1,Math.ceil(Math.hypot(dx,dy)*(hi-lo)/.5));
    for(let j=0;j<=count;j++){const t=lo+(hi-lo)*j/count;samples.push({x:a[0]+dx*t,y:a[1]+dy*t});}
  }
  return samples;
}
