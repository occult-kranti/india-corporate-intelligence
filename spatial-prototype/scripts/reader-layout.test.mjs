import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateReaderLayout, measureReaderLayout } from './reader-layout-review.mjs';
const sample=()=>({controls:{top:20,bottom:80},scroll:{top:90,bottom:700,height:610},button:{top:25,bottom:75},dialog:{top:10,left:10,right:790,bottom:710},viewport:{width:800,height:720},scrollWidth:700,clientWidth:700,outerScrollTop:0,overflowY:'auto',closeHit:true,focusable:true,label:'Source content'});
test('reader bounds accept a reserved row and reject overlapping, clipped or obscured controls',()=>{
 validateReaderLayout(sample());
 for(const change of [s=>s.scroll.top=60,s=>s.button.bottom=100,s=>s.scroll.height=0,s=>s.dialog.right=850,s=>s.scrollWidth=720,s=>s.outerScrollTop=20,s=>s.overflowY='visible',s=>s.closeHit=false,s=>s.focusable=false,s=>s.label='']) {const s=sample();change(s);assert.throws(()=>validateReaderLayout(s));}
});
test('both native readers reserve a non-scrolling control row and a labeled keyboard-scroll body',async()=>{
 for(const [panel,css]of [['src/sector-reader/SectorReaderPanel.tsx','src/sector-reader/sector-reader.css'],['src/historical-review/ReviewPanel.tsx','src/historical-review/review.css']]) {
  const text=await readFile(panel,'utf8'),style=await readFile(css,'utf8');
  assert.match(text,/data-reader-controls/);assert.match(text,/data-reader-scroll tabIndex=\{0\} role="region" aria-label="[^"]+"/);
  assert.match(style,/\[open\]\{display:flex;flex-direction:column\}/);assert.match(style,/min-height:0;min-width:0;overflow:auto/);
  assert.doesNotMatch(style,/position:sticky|position:fixed/);assert.match(style,/reader-scroll:focus-visible/);
  assert.match(text,/onCancel=/);assert.match(text,/target\.focus\(\)/);
 }
});
test('browser measurements use the nested body and test keyboard scrolling without local launch',async()=>{
 const helper=await readFile('scripts/reader-layout-review.mjs','utf8');
 assert.doesNotMatch(helper,/from ['"]playwright|chromium\.launch/);
 assert.match(helper,/keyboard.press\('PageDown'\)/);assert.match(helper,/\['middle',0\.5\]/);assert.match(helper,/\['bottom',1\]/);
 for(const name of ['scripts/browser-review.mjs','scripts/sector-browser-review.mjs']) {const code=await readFile(name,'utf8');assert.match(code,/closest\(['"]\[data-reader-scroll\]['"]\)/);assert.match(code,/exerciseReaderScroll/);assert.match(code,/measureReaderLayout/);}
});

test('failed reader geometry retains the measured diagnostic before throwing',async()=>{
 const broken=sample();broken.scroll.top=30;const result={};
 await assert.rejects(()=>measureReaderLayout({evaluate:async()=>broken},result,'failed-band'),/overlap/);
 assert.equal(result.readerLayoutSamples.length,1);assert.equal(result.readerLayoutSamples[0].phase,'failed-band');assert.equal(result.readerLayoutSamples[0].scroll.top,30);
});
