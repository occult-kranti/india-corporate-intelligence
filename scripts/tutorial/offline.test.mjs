/** Each exporter must be self-contained without the root build's post-pass. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {inlineTutorialAssets} from '../../global-evidence-workbench/ui/scripts/inline-tutorial.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const ui=path.join(root,'global-evidence-workbench/ui');
const require=createRequire(path.join(ui,'package.json'));
const {JSDOM}=require('jsdom');

for(const [generator,filename,dataFile] of [['standalone.mjs','fieldwork-offline.html','dataset.json'],['standalone-finance.mjs','finance-offline.html','finance.json'],['standalone-media.mjs','media-offline.html','media.json']]){
 test(`${generator} independently embeds research, archive theme and working tutorial; rebuild is deterministic`,async()=>{
  const generate=()=>execFileSync(process.execPath,[`scripts/${generator}`],{cwd:ui,stdio:'pipe'});
  generate();const file=path.join(ui,'dist',filename);const html=fs.readFileSync(file,'utf8');
  assert.ok(!/<script\b[^>]*\bsrc\s*=/.test(html),'No external runtime script');
  assert.ok(!/<link\b[^>]*rel="stylesheet"/.test(html),'No external stylesheet');
  assert.ok(!html.includes(`fetch('./public/data/${dataFile}')`),'No runtime dataset request');
  assert.ok(html.includes('fieldwork-static-tutorial:v1'),'Tutorial implementation is embedded');
  assert.ok(html.includes('fw-tutorial-dialog'),'Tutorial styling and dialog are embedded');
  assert.ok(html.includes(fs.readFileSync(path.join(ui,'src/archive.css'),'utf8')),'Complete archive theme is embedded');
  assert.equal(inlineTutorialAssets(html),html,'Root post-pass is a no-op on an independently embedded export');
  const dom=new JSDOM(html,{runScripts:'outside-only',url:`file:///${filename}`,pretendToBeVisual:true});
  try{
   const w=dom.window,d=w.document;w.HTMLElement.prototype.scrollIntoView=function(){};w.matchMedia=()=>({matches:true});
   w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
   w.fetch=()=>{throw Error('Unexpected offline runtime fetch');};
   for(const script of [...d.querySelectorAll('script[type="module"]')])await w.eval(`(async()=>{${script.textContent}\n})()`);
   assert.equal(d.querySelector('#error').hidden,true,'Research loaded with no fetch');
   assert.ok(d.querySelectorAll('.record').length>0,'Real retained records are rendered');
   const launcher=d.querySelector('.fw-tutorial-launcher');assert.ok(launcher,'Offline help launcher exists');
   assert.equal(d.querySelector('.fw-tutorial-dialog').open,false,'Offline help remains opt-in');
   launcher.click();assert.equal(d.querySelector('.fw-tutorial-dialog').open,true);assert.match(d.querySelector('.fw-tutorial-dialog').textContent,/Guide this page/);
   d.querySelector('.fw-tutorial-dialog [data-start][data-replay="true"]').click();assert.match(d.querySelector('.fw-tutorial-dialog').textContent,/Step 1 of/);
  }finally{dom.window.close();}
  generate();assert.equal(fs.readFileSync(file,'utf8'),html,'Repeated direct builds produce identical bytes');
 });
}
