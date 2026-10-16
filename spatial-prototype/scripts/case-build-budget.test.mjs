import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { caseBuildBudget } from './case-build-budget.mjs';
async function fixture(change=()=>{}) {
 const root=await mkdtemp(join(tmpdir(),'case-output-budget-'));await mkdir(join(root,'assets'));await mkdir(join(root,'.vite'));
 const m={ 'index.html':{file:'assets/index-a.js'},'src/profile-host/CaseWorkspace.tsx':{file:'assets/CaseWorkspace-a.js',imports:['index.html'],dynamicImports:['src/profile-host/reader-runtime.ts','src/profile-host/attachScene.ts'],css:['assets/workspace.css']},'src/profile-host/reader-runtime.ts':{file:'assets/reader-runtime-a.js',imports:['index.html','_state-a.js'],css:['assets/reader.css']},'_state-a.js':{file:'assets/state-a.js'},'_scene-a.js':{file:'assets/scene-a.js'},'src/profile-host/attachScene.ts':{file:'assets/attachScene-a.js',imports:['_state-a.js','_scene-a.js']}};
 const files={'index-a.js':'export const i=1;','CaseWorkspace-a.js':'export const w=1;','reader-runtime-a.js':'export const r=1;','state-a.js':'export const data="olympus.key-dictionary.1";','scene-a.js':'export const t=1;','attachScene-a.js':'export const s=1;','workspace.css':'.workspace{}','reader.css':'.reader{}','state-a.js.map':JSON.stringify({sources:['../../src/case-data/runtime-transport.ts']})};
 change(m,files);await writeFile(join(root,'.vite/manifest.json'),JSON.stringify(m));for(const [file,text]of Object.entries(files))await writeFile(join(root,'assets',file),text);
 return{root,dispose:()=>rm(root,{recursive:true,force:true})};
}
async function check(change,pattern){const f=await fixture(change);try{await assert.rejects(caseBuildBudget(f.root),pattern);}finally{await f.dispose();}}
test('reader budget counts chooser, shared data and each unique stylesheet',async()=>{const f=await fixture();try{const r=await caseBuildBudget(f.root);assert.equal(r.readerFiles.length,5);assert.equal(r.readerCss.length,2);assert.equal(r.payloadChunks.length,1);assert.equal(r.sceneIncremental.length,1);assert.equal(r.readerLimit,350000);}finally{await f.dispose();}});
test('combined reader raw cap cannot be shifted into CSS',()=>check((_m,f)=>{f['reader.css']='x'.repeat(350001);},/exceeds 350000/));
test('duplicate CSS content rejects rather than double loads',()=>check((_m,f)=>{f['reader.css']=f['workspace.css'];},/Duplicate case CSS/));
test('chooser cannot eagerly download case payload',()=>check(m=>{m['src/profile-host/CaseWorkspace.tsx'].imports.push('_state-a.js');},/Chooser must not import/));
test('reader cannot eagerly require Three',()=>check(m=>{m['src/profile-host/reader-runtime.ts'].imports.push('_scene-a.js');},/must not require graphics/));
test('one payload chunk is mandatory',()=>check((_m,f)=>{f['duplicate.js']='"olympus.key-dictionary.1"';},/Exactly one encoded/));
test('retained audit JSON must not be emitted a second time',()=>check((_m,f)=>{f['original.js.map']=JSON.stringify({sources:['../../src/case-data/reviewed-transport.json']});},/must not be bundled again/));
test('additional renderer cap remains unchanged',()=>check((_m,f)=>{f['attachScene-a.js']='x'.repeat(41001);},/exceeds 41000/));
