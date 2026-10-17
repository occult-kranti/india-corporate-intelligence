// Mandatory CI-only replay in an isolated copy. The frozen native package is not modified.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,mkdir,cp,symlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {ROOT,inventory,sha,requireNativeCI} from './contract.mjs';
requireNativeCI();
const pins={'package.json':'626813e1727d7640330ce48e466e33d237d5b8e49f4e5efc4335ede6d9e425c4','package-lock.json':'9514550391c421bfec3fb8cd8d98c7f2c30d0ba65c26a24e8de068081e9b97a2'};
for(const [file,digest]of Object.entries(pins))assert.equal(sha(await readFile(resolve(ROOT,'test-dependencies',file))),digest);
const lock=JSON.parse(await readFile(resolve(ROOT,'test-dependencies/package-lock.json')));
assert.equal(lock.packages[''].devDependencies.jsdom,'26.1.0');assert.equal(lock.packages['node_modules/jsdom'].version,'26.1.0');
assert.equal(Object.keys(lock.packages).length,40);
for(const [name,row]of Object.entries(lock.packages))if(name){assert(row.resolved.startsWith('https://registry.npmjs.org/'));assert(row.integrity.startsWith('sha512-'));}
const before=await inventory(ROOT),scratch=await mkdtemp(join(tmpdir(),'olympus-world-portable-')),working=resolve(scratch,'package'),deps=resolve(scratch,'test-dependencies'),home=resolve(scratch,'home');
assert.equal(sha(await readFile(resolve(ROOT,'tests/world.test.mjs'))),'8931c0f5ee117ac55765fa7d90b5adb53606bc58e7433b8344068e0a4b2e7ac9','Original 18-test file is immutable');
const outcomes=[];
function run(label,command,args,cwd){
 const r=spawnSync(command,args,{cwd,env:{PATH:process.env.PATH,HOME:home,LANG:'C.UTF-8',CI:'true',npm_config_cache:resolve(scratch,'npm-cache')},stdio:'inherit'});
 outcomes.push({label,exitCode:r.status,signal:r.signal,errorCode:r.error?.code??null});
 assert.equal(r.status,0,label+' must pass');
}
let sourceUnchanged=false;
try{
 await mkdir(home);await mkdir(deps);await cp(ROOT,working,{recursive:true});assert.deepEqual(await inventory(working),before,'Exact isolated copy before adding test-only dependency links');
 for(const file of Object.keys(pins))await writeFile(resolve(deps,file),await readFile(resolve(ROOT,'test-dependencies',file)),{flag:'wx'});
 run('locked jsdom install without lifecycle scripts','npm',['ci','--ignore-scripts','--no-audit','--no-fund','--prefix',deps],scratch);
 assert.equal(JSON.parse(await readFile(resolve(deps,'node_modules/jsdom/package.json'))).version,'26.1.0');
 const typescript=resolve(ROOT,'../../spatial-prototype/node_modules/typescript');assert.equal(JSON.parse(await readFile(resolve(typescript,'package.json'))).version,'5.6.3');
 await mkdir(resolve(working,'dependencies'));await symlink(resolve(deps,'node_modules/jsdom'),resolve(working,'dependencies/jsdom'),'dir');
 run('strict original source and isolated fixture types',process.execPath,['--max-old-space-size=768','--max-semi-space-size=1',resolve(typescript,'bin/tsc'),'--noEmit','-p',resolve(working,'tsconfig.fixture.json')],working);
 run('unchanged original 18 world tests',process.execPath,['--expose-gc','--max-old-space-size=768','--max-semi-space-size=1','--test','--test-concurrency=1','tests/world.test.mjs'],working);
 run('three exact-bundle selection race regressions',process.execPath,['--expose-gc','--max-old-space-size=384','--max-semi-space-size=1','--test','--test-concurrency=1','tests/selection-race.test.mjs'],working);
 run('ten exact-bundle modal focus regressions',process.execPath,['--expose-gc','--max-old-space-size=384','--max-semi-space-size=1','--test','--test-concurrency=1','tests/modal-focus.test.mjs'],working);
}finally{
 try{assert.deepEqual(await inventory(ROOT),before,'Frozen publication package unchanged after every test outcome');sourceUnchanged=true;}
 finally{console.log(JSON.stringify({schema:'world-portable-ci-replay-v1',outcomes,sourceUnchanged,nativeExecuted:false}));await rm(scratch,{recursive:true,force:true});}
}
