import test from 'node:test';import assert from 'node:assert/strict';
import {inspectScreenshotPath,cropScreenshotRegion} from './thread-zoom-screenshot-sampling.mjs';
const points=Array.from({length:129},(_,y)=>({x:80,y}));
const roi={width:160,height:128,sx:1,sy:1,x:100,y:200,cssLeft:0,cssTop:0};
const surface={},overlay={tagName:'BUTTON',getAttribute:()=>null,getBoundingClientRect:()=>({toJSON:()=>({x:0,y:45,width:160,height:20})})};
function observe(blocked){global.document={querySelector:()=>surface,querySelectorAll:()=>[],elementFromPoint:(x,y)=>blocked(x,y)?overlay:surface};try{return inspectScreenshotPath({points,box:{x:0,y:0},kind:'atlas',roi,nominalWidthCss:2.2});}finally{delete global.document;}}
test('sampling follows geometric clear interval with explicit obstructed-band receipt',()=>{
 const result=observe((x,y)=>y>=45&&y<=65);assert.ok(result.selected.arcCss>=32);assert.ok(result.selected.top>65);assert.ok(result.obstructions.length);assert.equal(result.sampleCount,129);
});
test('all or fragmented obstruction fails closed instead of selecting successful pixels',()=>{
 assert.equal(observe(()=>true).selected,null);assert.equal(observe((x,y)=>Math.floor(y/20)%2===0).selected,null);
});
test('pixel support is never a selection input',()=>{
 const before=observe(()=>false);for(const p of points){p.supported=false;p.contrast=0;}assert.deepEqual(observe(()=>false),before);for(const p of points){delete p.supported;delete p.contrast;}
});
test('cropping preserves exact bottom-up bytes and CSS/framebuffer origins',()=>{
 const pixels=Uint8Array.from({length:4*4*4},(_,i)=>i),r={width:4,height:4,sx:1,sy:1,x:100,y:200,cssLeft:10,cssTop:20,pixels};
 const result=cropScreenshotRegion(r,{left:11,right:13,top:21,bottom:23,arcCss:32});assert.equal(result.x,101);assert.equal(result.y,201);assert.equal(result.cssLeft,11);assert.equal(result.cssTop,21);assert.equal(result.width,2);assert.equal(result.height,2);assert.deepEqual([...result.pixels],[...pixels.slice(20,28),...pixels.slice(36,44)]);
 assert.throws(()=>cropScreenshotRegion(r,null));assert.throws(()=>cropScreenshotRegion(r,{left:11,right:13,top:21,bottom:23,arcCss:31}));
});

test('pointer-events-none case plaques remain screenshot obstructions',()=>{
 const plaque={tagName:'SPAN',getAttribute:()=>null,getBoundingClientRect:()=>({left:0,right:160,top:0,bottom:128,width:160,height:128,toJSON:()=>({x:0,y:0,width:160,height:128})})};
 global.document={querySelector:()=>surface,querySelectorAll:()=>[plaque],elementFromPoint:()=>surface};global.getComputedStyle=()=>({display:'block',visibility:'visible',opacity:'1',pointerEvents:'none'});
 try{const result=inspectScreenshotPath({points,box:{x:0,y:0},kind:'case',roi,nominalWidthCss:1.5});assert.equal(result.selected,null);assert.ok(result.obstructions.length);}finally{delete global.document;delete global.getComputedStyle;}
});

test('native witness candidates retain fixed160×128 area along original offscreen crossing',async()=>{
 const {witnessRegions,witnessPathSamples}=await import('./thread-zoom-screenshot-sampling.mjs');
 const path=[[-10000,330],[10000,330]],regions=witnessRegions(path,840,663);assert.ok(regions.length>10);assert.deepEqual(regions[0].center,[420,331.5]);
 for(const region of regions){assert.equal(region.width,160);assert.equal(region.height,128);assert.ok(region.cssLeft>=0&&region.cssLeft+160<=840);assert.ok(region.cssTop>=0&&region.cssTop+128<=663);const samples=witnessPathSamples(path,region);assert.ok(samples.length>=320);assert.ok(samples.every(p=>p.y===330&&p.x>=region.cssLeft-1e-9&&p.x<=region.cssLeft+160+1e-9));}
 assert.throws(()=>witnessRegions([[0,0],[NaN,4]],840,663));assert.throws(()=>witnessRegions(path,100,100));
});
test('a central plaque forces an independent same-path native witness outside it',async()=>{
 const {witnessRegions,witnessPathSamples}=await import('./thread-zoom-screenshot-sampling.mjs');const path=[[-10000,330],[10000,330]],regions=witnessRegions(path,840,663);
 global.document={querySelector:()=>surface,querySelectorAll:()=>[],elementFromPoint:(x,y)=>x>=329&&x<=511&&y>=314&&y<=346?overlay:surface};
 try{const observations=regions.map(roi=>({roi,receipt:inspectScreenshotPath({points:witnessPathSamples(path,roi),box:{x:0,y:0},kind:'case',roi,nominalWidthCss:1.5})}));assert.equal(observations[0].receipt.selected,null);const witness=observations.find(o=>o.receipt.selected?.arcCss>=64);assert.ok(witness);assert.notDeepEqual(witness.roi.center,regions[0].center);assert.equal(witness.roi.width,160);assert.equal(witness.roi.height,128);const click=witness.receipt.selected.witnessPoint;assert.ok(click.x>witness.receipt.selected.left&&click.x<witness.receipt.selected.right);assert.equal(click.y,330);assert.ok(click.x>520||click.x<320);assert.ok(click.x>=witness.roi.cssLeft&&click.x<=witness.roi.cssLeft+160);assert.notEqual(click.x,420);}finally{delete global.document;}
});
