import assert from 'node:assert/strict';
import {runtimeBindingSha256} from './image-runtime.mjs';
import {lstat,unlink,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {sha,inventory} from './contract.mjs';
export function evidenceRoot(env=process.env){assert(env.GITHUB_WORKSPACE,'WORKSPACE_REQUIRED');return resolve(env.GITHUB_WORKSPACE,'epstein-world-map-native-evidence');}
export async function invalidateGrants(root,{manifest=true}={}){
 let st;try{st=await lstat(root);}catch(e){if(e.code==='ENOENT')return;throw e;}
 assert(st.isDirectory()&&!st.isSymbolicLink(),'EVIDENCE_ROOT_MUST_BE_REAL_DIRECTORY');
 // Only authorization outputs are removed. Raw observations are never edited.
 for(const name of (manifest?['SAFE-TO-UPLOAD','artifact-manifest.json']:['SAFE-TO-UPLOAD']))try{const p=resolve(root,name),s=await lstat(p);assert(!s.isDirectory(),'GRANT_IS_DIRECTORY');await unlink(p);}catch(e){if(e.code!=='ENOENT')throw e;}
}
export function runBinding(env,manifestSha256){assert(/^\d+$/.test(env.GITHUB_RUN_ID??''));assert(/^[1-9]\d*$/.test(env.GITHUB_RUN_ATTEMPT??''));assert(/^[a-f0-9]{40}$/.test(env.REVIEW_HEAD_SHA??''));assert(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(env.NATIVE_INVOCATION_ID??''));return {repository:env.GITHUB_REPOSITORY,branch:env.REVIEW_BRANCH,runId:env.GITHUB_RUN_ID,runAttempt:env.GITHUB_RUN_ATTEMPT,invocationId:env.NATIVE_INVOCATION_ID,headCommit:env.REVIEW_HEAD_SHA,packageManifestSha256:manifestSha256,runtimeBindingSha256:runtimeBindingSha256(env,manifestSha256)};}
export async function writeProducerReceipt(root,binding){const members=(await inventory(root)).filter(x=>x.path!=='producer-receipt.json');const receipt={schema:'native-producer-receipt-v1',...binding,producerNonce:randomUUID(),producer:'scripts/native-review.mjs',inputModel:'exact-pinned-inputs-fresh-context-loopback-documents-only-v1',members};await writeFile(resolve(root,'producer-receipt.json'),JSON.stringify(receipt,null,2)+'\n');return receipt;}
export async function validateProducer(root,binding,rows){const p=JSON.parse(await readFile(resolve(root,'producer-receipt.json')));assert.deepEqual(Object.keys(p).sort(),['schema',...Object.keys(binding),'producerNonce','producer','inputModel','members'].sort(),'PRODUCER_FIELDS');assert.equal(p.schema,'native-producer-receipt-v1');for(const [k,v]of Object.entries(binding))assert.equal(p[k],v,'PRODUCER_BINDING');assert(/^[a-f0-9-]{36}$/.test(p.producerNonce),'PRODUCER_NONCE');assert.equal(p.producer,'scripts/native-review.mjs');assert.equal(p.inputModel,'exact-pinned-inputs-fresh-context-loopback-documents-only-v1');assert.deepEqual(p.members,rows.filter(x=>x.path!=='producer-receipt.json'),'PRODUCER_MEMBERS');return {status:'EXACT_PRODUCER_RECEIPT_BOUND',nonce:p.producerNonce,sha256:sha(await readFile(resolve(root,'producer-receipt.json'))),limitation:'Hash binding is consistency under the reviewed producer and isolated-runner trust model, not unforgeable process identity or semantic privacy certification.'};}
