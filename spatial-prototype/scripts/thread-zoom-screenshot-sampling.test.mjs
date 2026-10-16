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
