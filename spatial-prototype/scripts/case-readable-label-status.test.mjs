import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const root=path.resolve(process.env.CASE_LABEL_SOURCE_ROOT??path.join(path.dirname(fileURLToPath(import.meta.url)),'..'));
const host=path.resolve(process.env.CASE_LABEL_HOST??root),require=createRequire(path.join(host,'package.json'));
const {build}=require('esbuild'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const compiled=await build({entryPoints:[path.join(root,'src/profile-host/ReadableLabelStatus.tsx')],bundle:true,write:false,platform:'node',format:'cjs',jsx:'automatic',external:['react','react/jsx-runtime'],nodePaths:[path.join(host,'node_modules')]});
const module={exports:{}};new Function('require','module','exports',compiled.outputFiles[0].text)(require,module,module.exports);
const Status=module.exports.ReadableLabelStatus;
function render(report,nodeMaximum=12,roleMaximum=34){return renderToStaticMarkup(React.createElement(Status,{report,nodeMaximum,roleMaximum}));}
const report=(n,r)=>({status:'ready',deferredNodes:Array.from({length:n},(_,i)=>({id:`n${i}`,reason:'outside-view'})),deferredRoles:Array.from({length:r},(_,i)=>({id:`r${i}`,reason:'crowded'}))});
const reserve=html=>html.match(/<p class="cw-label-status-reserve"[^>]*>([\s\S]*?)<\/p>/)[1];
test('the complete sizing layer is byte-identical across pending, zero and maximal deferrals',()=>{
 const pending=render(null);for(const r of [report(0,0),report(1,0),report(12,34)])assert.equal(reserve(render(r)),reserve(pending));
 assert.match(pending,/aria-hidden="true"/);assert.match(pending,/Label layout is updating/);assert.doesNotMatch(pending,/data-case-label-notice/);
 const maximum=render(report(12,34));assert.match(maximum,/data-case-deferred-node-count="12"/);assert.match(maximum,/data-case-deferred-role-count="34"/);assert.match(maximum,/Complete reader for every full name and source/);
});
test('numeric sizing slots depend only on current case capacity, including zero and multi-digit maxima',()=>{
 for(const [n,r]of [[0,0],[4,3],[91,73],[999,1000]]){
  assert.equal(reserve(render(null,n,r)),reserve(render(report(0,0),n,r)));
  assert.match(render(null,n,r),new RegExp(`inline-size:${String(n).length}ch`));
 }
});
test('live/pending text is out of normal flow; reserve remains in flow and unclipped',()=>{
 const css=fs.readFileSync(path.join(root,'src/profile-host/workspace.css'),'utf8');
 assert.match(css,/\.cw-label-status-live \{position:absolute;inset:0;\}/);
 assert.match(css,/\.cw-label-status-reserve \{visibility:hidden;pointer-events:none;\}/);
 assert.doesNotMatch(css,/\.cw-label-status(?:-live|-reserve)?\s*\{[^}]*overflow:(?:hidden|clip)/);
 assert.match(css,/font-variant-numeric:tabular-nums/);
});
