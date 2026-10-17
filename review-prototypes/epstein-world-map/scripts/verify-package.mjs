import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {ROOT,sha,inventory,readInputs} from './contract.mjs';
await readInputs();
const repo=resolve(ROOT,'../..'),manifest=JSON.parse(await readFile(resolve(ROOT,'manifest.json')));
assert.equal(manifest.schema,'world-board-native-publication-candidate-v1');
const members=await inventory(ROOT);assert.deepEqual(members.filter(x=>x.path!=='manifest.json'),manifest.packageMembers);
for(const row of manifest.workflowMembers){const bytes=await readFile(resolve(repo,row.path));assert.equal(bytes.length,row.bytes);assert.equal(sha(bytes),row.sha256);}
console.log(JSON.stringify({status:'PASS_EXACT_PACKAGE',members:members.length+manifest.workflowMembers.length,bytes:members.reduce((n,x)=>n+x.bytes,0)+manifest.workflowMembers.reduce((n,x)=>n+x.bytes,0),nativeExecuted:false}));
