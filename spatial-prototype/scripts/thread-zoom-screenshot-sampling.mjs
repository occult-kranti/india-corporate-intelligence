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
      top:vertical?Math.min(...ys):roi.cssTop,bottom:vertical?Math.max(...ys):roi.cssTop+roi.height/roi.sy,arcCss:best.arcCss};
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
