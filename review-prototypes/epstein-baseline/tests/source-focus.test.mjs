import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
await mkdir(new URL('../review/',import.meta.url),{recursive:true});
await build({entryPoints:[new URL('../src/source-focus.ts',import.meta.url).pathname],outfile:new URL('../review/source-focus.mjs',import.meta.url).pathname,bundle:true,platform:'node',format:'esm'});
const {containSourceTab}=await import('../review/source-focus.mjs');
function fixture(){
 const document={activeElement:null};const controls=[0,1,2].map(id=>({id,closest:()=>null,getClientRects:()=>[{}],focus(){document.activeElement=this;}}));
 const dialog={open:true,matches:()=>true,ownerDocument:document,querySelectorAll:()=>controls,contains:el=>controls.includes(el)};
 const event={key:'Tab',ctrlKey:false,metaKey:false,altKey:false,shiftKey:false,prevented:false,preventDefault(){this.prevented=true;}};
 return {document,controls,dialog,event};
}
test('only forward and reverse modal endpoints wrap',()=>{
 for(const reverse of [false,true]){const f=fixture();f.event.shiftKey=reverse;f.document.activeElement=f.controls[reverse?0:2];containSourceTab(f.dialog,f.event);assert.equal(f.document.activeElement,f.controls[reverse?2:0]);assert.equal(f.event.prevented,true);}
 const f=fixture();f.document.activeElement=f.controls[1];containSourceTab(f.dialog,f.event);assert.equal(f.event.prevented,false);assert.equal(f.document.activeElement,f.controls[1]);
});
test('closed, nonmodal, modified and non-Tab keys retain native browser behavior',()=>{
 for(const kind of ['closed','nonmodal','ctrlKey','metaKey','altKey','Escape']){const f=fixture();f.document.activeElement=f.controls[2];if(kind==='closed')f.dialog.open=false;else if(kind==='nonmodal')f.dialog.matches=()=>false;else if(kind==='Escape')f.event.key='Escape';else f.event[kind]=true;containSourceTab(f.dialog,f.event);assert.equal(f.event.prevented,false);assert.equal(f.document.activeElement,f.controls[2]);}
});
test('hidden controls do not become the endpoint and retained origin is untouched',()=>{
 const f=fixture();f.controls[2].getClientRects=()=>[];f.document.activeElement=f.controls[1];containSourceTab(f.dialog,f.event);assert.equal(f.document.activeElement,f.controls[0]);
 const g=fixture();g.controls[2].closest=()=>({});g.document.activeElement=g.controls[1];containSourceTab(g.dialog,g.event);assert.equal(g.document.activeElement,g.controls[0]);
});
test('one control wraps safely and no controls do not suppress Tab',()=>{
 const f=fixture();f.dialog.querySelectorAll=()=>[f.controls[0]];f.document.activeElement=f.controls[0];containSourceTab(f.dialog,f.event);assert.equal(f.document.activeElement,f.controls[0]);assert.equal(f.event.prevented,true);
 const g=fixture();g.dialog.querySelectorAll=()=>[];containSourceTab(g.dialog,g.event);assert.equal(g.event.prevented,false);
});
