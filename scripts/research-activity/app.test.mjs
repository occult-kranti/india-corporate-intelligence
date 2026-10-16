// Minimal DOM contract harness, not a browser or accessibility conformance test.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=JSON.parse(await readFile(new URL('../../public/research-activity/snapshot.json',import.meta.url),'utf8'));
class Node {
 constructor(tag='div'){this.tagName=tag;this.children=[];this.attributes={};this.listeners={};this.dataset={};this.value='';this.hidden=false;this._text='';this.classList={toggle:()=>{}};}
 set textContent(text){this._text=String(text);this.children=[];}
 get textContent(){return this._text+this.children.map(n=>n.textContent).join('');}
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(...nodes){this._text='';this.children=[...nodes];}
 setAttribute(key,value){this.attributes[key]=value;}
 addEventListener(event,callback){this.listeners[event]=callback;}
 focus(){this.focused=true;}
 fire(event){this.listeners[event]?.({preventDefault(){}});}
}
let serial=0;
async function boot({data=source,ok=true,parseError=false}={}){
 const nodes=new Map();
 globalThis.document={getElementById(id){if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id);},createElement:tag=>new Node(tag),createTextNode:text=>{const node=new Node('#text');node.textContent=text;return node;}};
 document.getElementById('console-content').hidden=true;
 globalThis.fetch=async(url,options)=>{assert.equal(url,'./snapshot.json');assert.deepEqual(options,{cache:'no-store'});return {ok,json:async()=>{if(parseError)throw new SyntaxError('Bad JSON');return structuredClone(data);}};};
 await import(`../../public/research-activity/app.mjs?test=${++serial}`);await new Promise(resolve=>setImmediate(resolve));
 return id=>nodes.get(id);
}
test('app renders validated snapshot, counts, evidence and milestones',async()=>{
 const $=await boot();assert.equal($('console-content').hidden,false);assert.equal($('tasks').children.length,9);assert.equal($('milestone-list').children.length,4);
 assert.match($('tasks').textContent,/PR9/);assert.match($('tasks').textContent,/not merged/);assert.equal($('filters').children.length,5);
});
test('filter/search/reset interactions retain truthful counts and keyboard-native controls',async()=>{
 const $=await boot();const working=$('filters').children.find(n=>n.dataset.status==='working');working.fire('click');assert.equal($('tasks').children.length,5);assert.equal(working.attributes['aria-pressed'],'true');
 $('search').value='not a real task';$('search').fire('input');assert.equal($('tasks').children.length,0);assert.equal($('empty').hidden,false);
 $('search-form').fire('reset');assert.equal($('tasks').children.length,9);assert.equal($('search').value,'');assert.equal($('search').focused,true);assert.equal(working.attributes['aria-pressed'],'false');
});
test('invalid snapshot is withheld from the rendered ledger',async()=>{
 const invalid=structuredClone(source);invalid.tasks[0].title='<img src=x onerror=alert(1)>';
 const $=await boot({data:invalid});assert.equal($('console-content').hidden,true);assert.match($('error').textContent,/validation failed/);assert.equal($('tasks'),undefined);
});
test('fetch and parse failures expose readable recovery instructions',async()=>{
 for(const config of [{ok:false},{parseError:true}]){const $=await boot(config);assert.equal($('console-content').hidden,true);assert.equal($('error').hidden,false);assert.match($('error').textContent,/reload/);}
});
test('query text cannot create markup',async()=>{
 const $=await boot();$('search').value='<script>alert(1)</script>';$('search').fire('input');assert.equal($('tasks').children.length,0);assert.doesNotMatch($('result-count').textContent,/<script>/);
});

test('simple group labels and review-pending sublabels remain visible',async()=>{
 const $=await boot();
 assert.deepEqual($('filters').children.map(node=>node.textContent),['All work9','Done1','Working on5','Next1','Blocked2']);
 assert.match($('tasks').textContent,/Working on · Review pending/);
 assert.match($('tasks').textContent,/Working on · Source review pending/);
 assert.doesNotMatch($('filters').textContent,/Running|Review pending|Completed|Planned/);
 for(const [status,count] of [['completed',1],['working',5],['planned',1],['blocked',2],['all',9]]){
  $('filters').children.find(node=>node.dataset.status===status).fire('click');
  assert.equal($('tasks').children.length,count);
  assert.match($('result-count').textContent,new RegExp('^'+count+' of 9 items shown'));
 }
});
test('repeated search resets and status changes preserve totals',async()=>{
 const $=await boot();
 for(let i=0;i<3;i++){
  $('filters').children.find(node=>node.dataset.status==='working').fire('click');
  $('search').value='Pr10';$('search').fire('input');assert.equal($('tasks').children.length,1);
  $('search-form').fire('reset');assert.equal($('tasks').children.length,9);
  assert.equal($('filters').children.find(node=>node.dataset.status==='all').attributes['aria-pressed'],'true');
 }
});
