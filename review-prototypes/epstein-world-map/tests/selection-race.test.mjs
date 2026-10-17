import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,appendFileSync} from 'node:fs';
import {webcrypto,createHash} from 'node:crypto';
import {JSDOM,VirtualConsole} from '../dependencies/jsdom/lib/api.js';
const bundlePath=process.env.WORLD_RACE_BUNDLE??new URL('../dist/index.html',import.meta.url);
const html=readFileSync(bundlePath,'utf8');
const bundleSha256=createHash('sha256').update(html).digest('hex');
const raw=JSON.parse(readFileSync(new URL('../data/packet.json',import.meta.url)));
const sleep=ms=>new Promise(ok=>setTimeout(ok,ms));
async function reclaim(){await sleep(0);globalThis.gc?.();}
async function boot(){
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(String(e)));
 // Preserve every delivered script/input byte while avoiding parse5's per-character
 // allocation for multi-megabyte inert inline payloads in this constrained workspace.
 const bodies=[];const skeleton=html.replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script>)/g,(_,open,body,close)=>{bodies.push(body);return open+close;});
 const dom=new JSDOM(skeleton,{url:'https://local.invalid/',runScripts:'outside-only',virtualConsole:vc});
 [...dom.window.document.scripts].forEach((script,i)=>{script.textContent=bodies[i];});
 const w=dom.window,d=w.document;w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;Object.defineProperty(w.crypto,'subtle',{value:webcrypto.subtle});
 let network=0;for(const key of ['fetch','XMLHttpRequest','WebSocket','EventSource'])w[key]=()=>{network++;throw Error('Network forbidden');};
 w.eval([...d.scripts].find(s=>!s.type).textContent);
 for(let i=0;i<1000&&!d.querySelector('#world-app,.blocked');i++)await sleep(2);
 assert(d.querySelector('#world-app'),d.body.textContent.slice(-300));
 const current=()=>new URLSearchParams(w.location.hash.slice(1)).get('record');
 const click=selector=>{const b=d.querySelector(selector);assert(b,selector);b.focus();b.click();return b;};
 const change=(selector,value)=>{const el=d.querySelector(selector);assert(el,selector);el.value=value;el.dispatchEvent(new w.Event('change',{bubbles:true}));};
 const choose=(component,relations=false)=>{change('#packet-filter',component);if(relations&&d.querySelector('#toggle-relations').textContent.includes('Browse all'))click('#toggle-relations');};
 const go=pointer=>{w.history.replaceState(null,'','#record='+encodeURIComponent(pointer));w.dispatchEvent(new w.PopStateEvent('popstate'));};
 return {dom,w,d,errors,current,click,change,choose,go,network:()=>network,async close(){dom.window.close();await reclaim();}};
}
function layout(h){
 const track=h.d.querySelector('#timeline-track');let left=0,nearest;
 Object.defineProperty(track,'clientWidth',{configurable:true,value:600});
 Object.defineProperty(track,'scrollWidth',{configurable:true,value:6000});
 Object.defineProperty(track,'scrollLeft',{configurable:true,get:()=>left,set:value=>{left=Math.max(0,Math.min(5400,Number(value)));}});
 track.getBoundingClientRect=()=>({left:0,width:600});
 function center(pointer){nearest=pointer;[...track.querySelectorAll('[data-timeline-pointer]')].forEach((el,i)=>el.getBoundingClientRect=()=>({left:el.dataset.timelinePointer===nearest?175:el.dataset.timelinePointer==='/extensions/0/milestones/0'?0:900+i*300,width:250}));}
 async function scroll(){track.dispatchEvent(new h.w.Event('scroll'));await sleep(155);}
 return {track,center,scroll};
}
async function baselineLoop(h){
 let cases=0;
 for(const collection of ['milestones','procedural_relations'])for(const [index,record]of raw.baseline[collection].entries()){
  const pointer='/baseline/'+collection+'/'+index;if(process.env.WORLD_RACE_PROGRESS)appendFileSync(process.env.WORLD_RACE_PROGRESS,JSON.stringify({pointer,memory:process.memoryUsage()})+'\n');h.choose('baseline',collection==='procedural_relations');await reclaim();
  const trigger=collection==='milestones'?`[data-timeline-pointer="${pointer}"] [data-record]`:`[data-exact-relation="${pointer}"] .relation-title`;
  h.click(trigger);await reclaim();if(collection==='milestones'){h.click('#open-selected');await reclaim();}
  assert(h.d.querySelector('dialog').open);assert.equal(h.current(),pointer);assert.equal(h.d.activeElement.id,'drawer-title');
  if(collection==='milestones'){h.click('#selected-threads');assert.equal(h.d.activeElement.id,'relations-content');}
  else{h.click('#linked-entry');await reclaim();const id=record.linked_milestone,i=raw.baseline.milestones.findIndex(r=>r.milestone===id);assert.equal(h.current(),'/baseline/milestones/'+i);h.click('#close-sheet');await reclaim();}
  cases++;await reclaim();
 }
 assert.equal(cases,33);return cases;
}
test('native group 3 sequence: 33 baseline cases then delayed click-scroll cannot replace first Round 1 selection',async()=>{
 const h=await boot();try{
  const completedBaselineCases=await baselineLoop(h);h.choose('round-1');
  const pointer='/extensions/0/milestones/0',neighbor='/extensions/0/milestones/1',l=layout(h);l.center(neighbor);
  const button=h.d.querySelector(`[data-timeline-pointer="${pointer}"] [data-record]`);assert(button);
  // Model browser/automation scrolling the target into view before its click, but
  // delivering the rail scroll event after the explicit click has completed.
  l.track.scrollLeft=275;button.dispatchEvent(new h.w.Event('pointerdown',{bubbles:true}));button.focus();button.click();
  assert.equal(h.current(),pointer);const historyAfterClick=h.w.history.length;
  await l.scroll();const beforeOpen=h.current();h.click('#open-selected');
  const observed={bundleSha256,completedBaselineCases,requested:pointer,afterDelayedScroll:beforeOpen,opened:h.current(),dialogOpen:h.d.querySelector('dialog').open,focused:h.d.activeElement.id,network:h.network(),errors:h.errors,layout:'Controlled clamped rail; both clicked and neighbor cards visible; neighbor is nearest center. Scroll position changes before click; event is delivered after click. Native event ordering is not asserted.'};
  if(process.env.WORLD_RACE_RECEIPT)writeFileSync(process.env.WORLD_RACE_RECEIPT,JSON.stringify(observed,null,2)+'\n');
  assert.equal(beforeOpen,pointer,'A delayed pre-click scroll event must not replace the explicitly clicked exact record');
  assert.equal(h.current(),pointer);assert.equal(h.w.history.length,historyAfterClick);assert.equal(h.d.activeElement.id,'drawer-title');assert.equal(h.network(),0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});

test('queued and repeated same-offset scroll events preserve explicit selection; real position changes and user intent resume selection',async()=>{
 const h=await boot();try{
  h.choose('round-1');const pointer='/extensions/0/milestones/0',neighbor='/extensions/0/milestones/1',other='/extensions/0/milestones/2',l=layout(h);
  l.center(neighbor);l.track.scrollLeft=275.25;
  // A scroll callback already scheduled before the click must also be cancelled.
  l.track.dispatchEvent(new h.w.Event('scroll'));
  h.click(`[data-timeline-pointer="${pointer}"] [data-record]`);await sleep(155);assert.equal(h.current(),pointer);
  l.track.scrollLeft=275.75;await l.scroll();await l.scroll();assert.equal(h.current(),pointer,'Subpixel movement within the existing < 1 px tolerance retains the explicit selection');
  l.track.scrollLeft=276.25;await l.scroll();assert.equal(h.current(),neighbor,'The existing strict < 1 px tolerance does not suppress a full pixel of later movement');
  h.click(`[data-timeline-pointer="${pointer}"] [data-record]`);const before=h.w.history.length;l.track.scrollLeft=550;await l.scroll();assert.equal(h.current(),neighbor,'An unannounced changed-position scroll still selects normally');assert.equal(h.w.history.length,before);
  l.center(other);l.track.scrollLeft=825;await l.scroll();assert.equal(h.current(),other,'Scroll-derived selection does not lock continuing scroll');assert.equal(h.w.history.length,before);
  for(const intent of ['wheel','pointerdown','touchstart','keydown']){
   h.click(`[data-timeline-pointer="${pointer}"] [data-record]`);l.center(neighbor);
   const e=intent==='keydown'?new h.w.KeyboardEvent(intent,{key:'ArrowRight',bubbles:true}):new h.w.Event(intent,{bubbles:true});l.track.dispatchEvent(e);
   await l.scroll();assert.equal(h.current(),neighbor,`${intent} releases the lock even at the same offset`);await reclaim();
  }
  assert.equal(h.network(),0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});

test('explicit route and relation selection survive delayed same-offset scroll through source Back and Close',async()=>{
 const h=await boot();try{
  h.choose('round-4');const relation='/extensions/3/procedural_relations/1',linked='/extensions/3/milestones/1',other='/extensions/3/milestones/0',l=layout(h);l.center(linked);l.track.scrollLeft=275;
  h.go(relation);await l.scroll();assert.equal(h.current(),relation,'Back/popstate exact relation is not replaced by a rail milestone');
  const trigger=h.click('#open-selected');h.click('dialog [data-source-index="0"]');await l.scroll();assert.equal(h.current(),relation);h.click('#back-entry');assert.equal(h.d.activeElement.dataset.sourceIndex,'0');h.click('#close-sheet');assert.equal(h.d.activeElement,trigger);
  await l.scroll();assert.equal(h.current(),relation,'Dialog Close retains the explicit relation at its existing rail position');
  l.center(other);l.track.scrollLeft=550;await l.scroll();assert.equal(h.current(),other,'A later changed-position scroll is not suppressed after Close');
  assert.equal(h.network(),0);assert.deepEqual(h.errors,[]);
 }finally{await h.close();}
});
