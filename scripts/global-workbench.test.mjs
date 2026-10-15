import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const root = new URL('../global-evidence-workbench/', import.meta.url);
const read = p => fs.readFileSync(new URL(p,root),'utf8');
test('reviewed dataset is pinned, source-complete and preserves stage guards',()=>{
 const d=JSON.parse(read('ui/public/data/dataset.json'));
 assert.deepEqual([d.records.length,d.relations.length,d.sources.length,d.documentChanges.length],[237,150,305,11]);
 assert.equal(read('ui/public/data/dataset.json'),read('integration/staging/dataset-round4.json'));
 const sources=new Set(d.sources.map(x=>x.id));
 for(const r of [...d.records,...d.relations]) for(const id of r.sourceIds||[]) assert.ok(sources.has(id));
 for(const r of d.relations){assert.equal(r.amountAggregable,false);assert.equal(r.pathEligible,false);}
});
test('connected workspaces use ordinary links and subpath-relative assets',()=>{
 const html=read('ui/index.html');
 assert.ok(html.includes('href="../"'));
 assert.ok(html.includes('https://occult-kranti.github.io/protest-atlas/'));
 assert.ok(html.includes('src="./src/app.js"'));
 assert.ok(read('ui/src/app.js').includes("fetch('./public/data/dataset.json')"));
 const layout=fs.readFileSync(new URL('../src/components/Layout.tsx',import.meta.url),'utf8');
 assert.ok(layout.includes('href="./global-workbench/"'));
});
test('published source tree excludes acquired raw originals and credentials',()=>{
 for(const path of fs.readdirSync(root,{recursive:true})) {
  if(path.includes('node_modules')||path.includes('__pycache__'))continue;
  assert.ok(!/\.(pdf|pem|key)$/i.test(path),path);
  if(path.split('/').includes('raw')) assert.ok(path.endsWith('/raw')||path.endsWith('/raw/acquisition.json'),path);
 }
});
