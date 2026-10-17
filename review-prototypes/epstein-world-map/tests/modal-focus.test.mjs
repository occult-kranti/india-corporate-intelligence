/** Exact-bundle controller checks with modeled visibility and sequential Tab defaults. No native-browser claim. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash,webcrypto} from 'node:crypto';
import {JSDOM,VirtualConsole} from '../dependencies/jsdom/lib/api.js';
const [oldArg,newArg,outPath]=process.argv.slice(2),oldPath=oldArg||process.env.MODAL_OLD_BUNDLE,newPath=newArg||new URL('../dist/index.html',import.meta.url),results=[];
const sha=s=>createHash('sha256').update(s).digest('hex'),pause=ms=>new Promise(ok=>setTimeout(ok,ms));
async function boot(path){
 const html=readFileSync(path,'utf8'),bodies=[],errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(String(e)));
 const skeleton=html.replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script>)/g,(_,open,body,close)=>{bodies.push(body);return open+close;});
 const dom=new JSDOM(skeleton,{url:'https://local.invalid/',runScripts:'outside-only',virtualConsole:vc}),w=dom.window,d=w.document;
 [...d.scripts].forEach((s,i)=>{s.textContent=bodies[i];assert.equal(s.textContent,bodies[i]);});
 w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;Object.defineProperty(w.crypto,'subtle',{value:webcrypto.subtle});let network=0;
 for(const key of ['fetch','XMLHttpRequest','WebSocket','EventSource'])w[key]=()=>{network++;throw Error('No network');};
 // jsdom has no layout. Model the visibility rules without mutating the renderer.
 function visible(el){
  if(el.closest('[hidden],[inert]'))return false;
  for(let p=el;p;p=p.parentElement){if(w.getComputedStyle(p).display==='none')return false;if(p!==el&&p.tagName==='DETAILS'&&!p.open){const summary=[...p.children].find(c=>c.tagName==='SUMMARY');if(!summary?.contains(el))return false;}}
  return !['hidden','collapse'].includes(w.getComputedStyle(el).visibility);
 }
 w.HTMLElement.prototype.getClientRects=function(){return visible(this)?[{}]:[];};
 // Native summaries participate in sequential navigation; jsdom's getter does not.
 const tabIndex=Object.getOwnPropertyDescriptor(w.HTMLElement.prototype,'tabIndex');
 Object.defineProperty(w.HTMLElement.prototype,'tabIndex',{configurable:true,get(){return this.tagName==='SUMMARY'&&!this.hasAttribute('tabindex')?0:tabIndex.get.call(this);},set(v){tabIndex.set.call(this,v);}});
 w.eval([...d.scripts].find(s=>!s.type).textContent);for(let i=0;i<1000&&!d.querySelector('#world-app,.blocked');i++)await pause(2);assert(d.querySelector('#world-app'));
 const $=s=>d.querySelector(s),click=s=>{const el=$(s);assert(el,s);el.focus();el.click();return el;};
 const dialog=$('dialog'),stops=()=>[...dialog.querySelectorAll('button,a[href],input,select,textarea,summary,[tabindex]')].filter(e=>e.tabIndex>=0&&!e.matches(':disabled')&&visible(e));
 function key(attrs){const e=new w.KeyboardEvent('keydown',{bubbles:true,cancelable:true,...attrs});d.activeElement.dispatchEvent(e);return e;}
 function tab(shift=false){const items=stops(),index=items.indexOf(d.activeElement),event=key({key:'Tab',shiftKey:shift});if(!event.defaultPrevented){const next=index+(shift?-1:1);if(next<0||next>=items.length){d.body.tabIndex=-1;d.body.focus();}else items[next].focus();}return event;}
 function original(){click('.world-footer details > summary');const trigger=click('#browse-original');click('[data-field-path=""] > summary');click('[data-expand-field=""]');click('[data-field-path="/extensions"] > summary');click('[data-expand-field="/extensions"]');assert.equal(dialog.querySelectorAll('[data-field-path="/extensions"] > .original-field').length,5);return trigger;}
 function hiddenFixture(){const parent=d.createElement('div');parent.hidden=true;parent.innerHTML='<button>Test-only hidden endpoint</button>';dialog.append(parent);return parent;}
 return{dom,w,d,$,click,dialog,stops,key,tab,original,hiddenFixture,hash:sha(html),errors,network:()=>network,current:()=>new URLSearchParams(w.location.hash.slice(1)).get('record'),async close(){dom.window.close();await pause(0);globalThis.gc?.();}};
}
function check(name,fn){fn();results.push({name,status:'passed'});}
let oldHash=null;
if(oldPath){const old=await boot(oldPath);oldHash=old.hash;try{
 old.original();old.stops().at(-1).focus();const baseline=old.tab();
 results.push({name:'Exact lazy-renderer baseline under modeled visibility',status:baseline.defaultPrevented?'wrap_observed':'wrap_not_observed',limitation:'This model cannot recover the native failure destination.'});
 old.hiddenFixture();const first=old.stops()[0],last=old.stops().at(-1);last.focus();const event=old.tab();
 assert.equal(event.defaultPrevented,false);assert.equal(old.dialog.contains(old.d.activeElement),false);
 results.push({name:'Old hidden-ancestor candidate corrupts the actual lazy-renderer endpoint list',status:'defect_reproduced',defaultPrevented:false,escaped:true});
 first.focus();const modified=old.key({key:'Tab',shiftKey:true,ctrlKey:true});assert.equal(modified.defaultPrevented,true);
 results.push({name:'Old Ctrl+Shift+Tab is intercepted at an endpoint',status:'defect_reproduced'});
 old.$('#packet-filter').focus();assert.equal(old.dialog.contains(old.d.activeElement),false);
 results.push({name:'Old programmatic external focus is not contained by controller',status:'defect_reproduced'});
}finally{await old.close();}}
const h=await boot(newPath);
try{
 const trigger=h.original();
 check('actual lazy root/extensions renderer wraps both visible endpoints',()=>{const items=h.stops();items.at(-1).focus();assert.equal(h.tab().defaultPrevented,true);assert.equal(h.d.activeElement,items[0]);assert.equal(h.tab(true).defaultPrevented,true);assert.equal(h.d.activeElement,items.at(-1));});
 check('12 forward and reverse steps stay in the modal; interior Tab keeps native default',()=>{const items=h.stops();items[0].focus();assert.equal(h.tab().defaultPrevented,false);assert.equal(h.d.activeElement,items[1]);for(const shift of [false,true])for(let i=0;i<12;i++){h.tab(shift);assert(h.dialog.contains(h.d.activeElement));}});
 check('hidden/inert/disabled/CSS-hidden/negative-tabindex and closed-details candidates are excluded',()=>{
  const holder=h.d.createElement('div');holder.innerHTML='<div hidden><button>Hidden ancestor</button></div><div inert><button>Inert ancestor</button></div><fieldset disabled><button>Disabled fieldset</button><input></fieldset><input disabled><textarea disabled></textarea><div style="display:none"><button>Display none</button></div><button style="visibility:hidden">Visibility hidden</button><button tabindex="-1">Negative tabindex</button><details><summary>Visible closed summary</summary><button>Closed content</button><details><summary>Nested closed summary</summary></details></details>';
  h.dialog.append(holder);const items=h.stops();items.at(-1).focus();assert.equal(h.tab().defaultPrevented,true);assert.equal(h.d.activeElement,items[0]);assert.equal(h.tab(true).defaultPrevented,true);assert.equal(h.d.activeElement,items.at(-1));holder.remove();
 });
 check('open/closed details and dynamic controls recompute endpoints',()=>{const details=h.d.createElement('details');details.innerHTML='<summary>Temporary test disclosure</summary><textarea>Temporary test control</textarea>';h.dialog.append(details);for(const open of [false,true,false]){details.open=open;const items=h.stops();items.at(-1).focus();assert.equal(h.tab().defaultPrevented,true);assert.equal(h.d.activeElement,items[0]);}details.remove();});
 check('browser modifier shortcuts are not cancelled or redirected',()=>{for(const modifier of ['ctrlKey','altKey','metaKey'])for(const shiftKey of [false,true]){const items=h.stops();(shiftKey?items[0]:items.at(-1)).focus();const before=h.d.activeElement,e=h.key({key:'Tab',shiftKey,[modifier]:true});assert.equal(e.defaultPrevented,false);assert.equal(h.d.activeElement,before);assert(h.dialog.open);}});
 check('unexpected background focus is returned to the dialog heading',()=>{h.$('#packet-filter').focus();assert.equal(h.d.activeElement,h.$('#drawer-title'));assert(h.dialog.contains(h.d.activeElement));});
 check('Escape closes and restores exact original-browser invoker; guard releases',()=>{const e=h.key({key:'Escape'});assert.equal(e.defaultPrevented,true);assert.equal(h.dialog.open,false);assert.equal(h.d.activeElement,trigger);h.$('#packet-filter').focus();assert.equal(h.d.activeElement,h.$('#packet-filter'));});
 const anchor=h.click('.anchor-card [data-anchor="anchor-usvi-doj-territory"]');h.click('dialog [data-record]');h.click('dialog [data-source-index="0"]');
 check('source dialog uses fresh endpoints and preserves Back/Close focus',()=>{const items=h.stops();items.at(-1).focus();assert.equal(h.tab().defaultPrevented,true);assert.equal(h.d.activeElement,items[0]);h.click('#back-entry');assert.equal(h.d.activeElement.dataset.sourceIndex,'0');h.click('#close-sheet');assert.equal(h.d.activeElement,anchor);});
 // The prior selection-race correction remains exercised with a delayed event.
 const filter=h.$('#packet-filter');filter.value='round-1';filter.dispatchEvent(new h.w.Event('change',{bubbles:true}));const track=h.$('#timeline-track'),pointer='/extensions/0/milestones/0';track.getBoundingClientRect=()=>({left:0,width:600});[...track.querySelectorAll('[data-timeline-pointer]')].forEach((el,i)=>el.getBoundingClientRect=()=>({left:el.dataset.timelinePointer==='/extensions/0/milestones/1'?175:900+i*300,width:250}));track.scrollLeft=275;h.click(`[data-timeline-pointer="${pointer}"] [data-record]`);track.dispatchEvent(new h.w.Event('scroll'));await pause(155);
 check('previous explicit-selection race fix survives a delayed same-offset event',()=>assert.equal(h.current(),pointer));
 check('no network or jsdom errors',()=>{assert.equal(h.network(),0);assert.deepEqual(h.errors,[]);});
 const report={status:'passed_modeled_focus_contracts_only',oldBundleSha256:oldHash,newBundleSha256:h.hash,checks:results,nativeBrowserVerified:false,limitations:'jsdom layout, Tab default, summary tabIndex and visibility are modeled. Old/new defect reproduction includes a clearly test-only hidden ancestor appended to the unchanged lazy original-field renderer. The unmodified modeled baseline may wrap successfully; the exact native group8 cause/destination remains unobserved. The unchanged native assertion must pass in owner CI.'};
 if(outPath)writeFileSync(outPath,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,defectReproductions:results.filter(r=>r.status==='defect_reproduced').length,passed:results.filter(r=>r.status==='passed').length}));
}finally{await h.close();}
