import {execFileSync} from 'node:child_process';import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {JSDOM} from 'jsdom';
execFileSync(process.execPath,['scripts/standalone.mjs'],{stdio:'pipe'});
async function load(offline){const html=fs.readFileSync(offline?'dist/fieldwork-offline.html':'index.html','utf8'),dom=new JSDOM(html,{runScripts:'outside-only',url:'https://local.test/'}),w=dom.window;w.fetch=async()=>({ok:true,json:async()=>JSON.parse(fs.readFileSync('public/data/dataset.json'))});w.HTMLElement.prototype.scrollIntoView=()=>{};const code=offline?w.document.querySelector('script[type="module"]').textContent:fs.readFileSync('src/model.js','utf8').replaceAll('export ','')+'\n'+fs.readFileSync('src/app.js','utf8').replace(/^import[^\n]+\n/,'');await w.eval('(async()=>{'+code+'})()');return dom;}
for(const offline of [false,true])test(`${offline?'offline export':'served'} Leap hold, Sarda award and Tata clause withdrawal render with scope`,async()=>{
 const dom=await load(offline),d=dom.window.document;assert.equal(d.querySelector('#error').hidden,true);
 const select=id=>{const b=d.querySelector(`[data-record="${id}"]`);assert.ok(b,id);b.click();return d.querySelector('#detail').textContent;};
 const leap=select('india-corporate-intelligence:edge-36a48e03e54bb6a90d95');assert.match(leap,/HELD SOURCE SCOPE/);assert.match(leap,/Political donation history unverified/);assert.doesNotMatch(leap,/₹0|no traceable political giving|Relation endpoints|Documented relation types/);
 const sarda=select('india-corporate-intelligence:edge-ba6b2c3e65e9cae88c94');assert.match(sarda,/66\.75% closing bid/);assert.match(sarda,/9 November 2020/);assert.match(sarda,/Relation endpoints/);assert.doesNotMatch(sarda,/gave no donations|HELD SOURCE SCOPE/);assert.match(sarda,/Not eligible for multi-hop inference/,'Existing global path policy stays closed');
 for(const id of ['tata','progressive']){const text=select('india-corporate-intelligence:'+id);assert.doesNotMatch(text,/Never bought bonds|never bought bonds/);assert.match(text,/757/);assert.match(text,/not newly approved/);}
 assert.match(select('india-corporate-intelligence:adani'),/Denies wrongdoing\./);
 assert.doesNotMatch(d.querySelector('#records').textContent,/₹0 — no footprint|record 66.75% bid/);dom.window.close();
});
