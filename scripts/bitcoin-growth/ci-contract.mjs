import assert from 'node:assert/strict';
import {readFileSync,lstatSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {hash,expectedPaths} from './served-integrity.mjs';
export const RELEASE_SHA='1b6ccf1df0060ce191b6c52497b5802b77fd1072d84a907bfbc271c26f80e528';
export const FROZEN_PACKAGE_SHA='5189ff45604402c95e4ccbf09a412d2400c47cf191a832f4f1570ebad3085bd2';
export const PLAYWRIGHT_VERSION='1.62.1';
export const ARTIFACTS=['browser-flow-result.json','desktop-initial.png','mobile-initial.png'];
export const LIMITS={report:262144,png:8388608,total:17039360,maxHeight:20000};
export const WORKFLOW='.github/workflows/bitcoin-growth-review.yml';
export const SUPPORT_FILES=['README.md','THIRD-PARTY-NOTICES.md','browser-acceptance-matrix.json','browser-flow.mjs','ci-contract.mjs','ci-contract.test.mjs','ci-wrapper.mjs','release-manifest-v2.json','served-integrity.mjs','served-integrity.test.mjs'];
export const SOURCE_PATHS=[...expectedPaths.map(p=>`public/bitcoin-growth/${p}`),...SUPPORT_FILES.map(p=>`scripts/bitcoin-growth/${p}`)].sort();
const eq=(a,b)=>assert.deepEqual(a,b);
export function readRegular(root,path,max=2000000){
  assert.ok(!path.startsWith('/')&&!path.split('/').some(p=>!p||p==='.'||p==='..'));
  let at=root;for(const component of path.split('/')){at=join(at,component);assert.equal(lstatSync(at).isSymbolicLink(),false);}
  const stat=lstatSync(at);assert.ok(stat.isFile()&&stat.size<=max);return readFileSync(at);
}
export function listFiles(root,prefix=''){
  return readdirSync(join(root,prefix),{withFileTypes:true}).flatMap(e=>{
    assert.equal(e.isSymbolicLink(),false);const path=prefix?`${prefix}/${e.name}`:e.name;
    return e.isDirectory()?listFiles(root,path):[path];
  }).sort();
}
export function verifySource(root,expected){
  assert.match(expected||'',/^[a-f0-9]{64}$/);
  const raw=readRegular(root,'scripts/bitcoin-growth/publication-source-manifest.json');eq(hash(raw),expected);
  const manifest=JSON.parse(raw);eq(manifest.schema_version,'bitcoin-publication-source-v1');eq(manifest.files.map(f=>f.path).sort(),SOURCE_PATHS);
  eq(manifest.frozen_package_sha256,FROZEN_PACKAGE_SHA);eq(manifest.release_manifest_sha256,RELEASE_SHA);
  for(const f of manifest.files){const body=readRegular(root,f.path);eq(body.length,f.bytes);eq(hash(body),f.sha256);}
  eq(listFiles(join(root,'public/bitcoin-growth')),expectedPaths);
  eq(listFiles(join(root,'scripts/bitcoin-growth')),[...SUPPORT_FILES,'publication-source-manifest.json'].sort());
  return manifest;
}
export function verifyLock(lock){
  for(const [path,p] of Object.entries(lock.packages)){
    if(!path)continue;assert.equal(Boolean(p.link),false);
    assert.match(p.resolved||'',/^https:\/\/registry\.npmjs\.org\//);assert.match(p.integrity||'',/^sha512-[A-Za-z0-9+/]+=*$/);
  }
  for(const name of ['playwright','playwright-core']){
    const p=lock.packages[`node_modules/${name}`];eq(p.version,PLAYWRIGHT_VERSION);
    eq(p.resolved,`https://registry.npmjs.org/${name}/-/${name}-${PLAYWRIGHT_VERSION}.tgz`);
    assert.match(p.integrity,/^sha512-[A-Za-z0-9+/]+=*$/);
  }
}
export function validateBinding(b){
  eq(b.repository,'occult-kranti/india-corporate-intelligence');eq(b.branch,'refs/heads/feature/bitcoin-growth-map');
  assert.match(b.commit,/^[a-f0-9]{40}$/);assert.match(b.source_manifest_sha256,/^[a-f0-9]{64}$/);
  for(const k of ['workflow_sha256','package_lock_sha256','runner_sha256'])assert.match(b[k],/^[a-f0-9]{64}$/);
  assert.match(b.run_id,/^[0-9]{1,20}$/);eq(b.run_attempt,'1');eq(b.release_manifest_sha256,RELEASE_SHA);
  eq(b.playwright_version,PLAYWRIGHT_VERSION);eq(b.chromium_sandbox,true);
}
export function safeFailure(raw,exit,signal,matrix,phase){
  const gates=raw?.automated_gates||{},failed=matrix.automated.findIndex(n=>gates[n]==='failed');
  const stack=typeof raw?.failure==='string'?raw.failure.slice(0,LIMITS.report):'';
  const line=stack.match(/(?:^|\/)browser-flow\.mjs:(\d{1,4}):\d+/m);
  return {phase,exit_code:Number.isInteger(exit)?exit:null,termination_signal:['SIGTERM','SIGKILL'].includes(signal)?signal:null,
    code:failed>=0?'NATIVE_CASE_FAILED':raw?.browser_started?'NATIVE_POSTCHECK_FAILED':'NATIVE_START_OR_INTEGRITY_BLOCKED',
    case_id:failed<0?null:`B${String(failed+1).padStart(2,'0')}`,owned_script:line?'browser-flow.mjs':null,owned_line:line?Number(line[1]):null,
    passed_cases:matrix.automated.filter(n=>gates[n]==='passed').length,release_acceptance:false};
}
export function validateNativeReport(raw,images,manifest,matrix,binding){
  validateBinding(binding);eq(raw.status,'passed_automated_native_suite_manual_gates_pending');eq(raw.browser_started,true);eq(raw.release_acceptance,false);
  eq(raw.selected_manifest_sha256,RELEASE_SHA);eq(raw.base,'http://127.0.0.1:8769/bitcoin-growth/');
  eq(raw.external_requests,[]);eq(raw.errors,[]);eq(raw.browser_channel,'chrome');eq(raw.playwright_version,PLAYWRIGHT_VERSION);
  assert.match(raw.browser_version,/^[0-9]+(?:\.[0-9]+){1,4}$/);
  eq(Object.keys(raw.automated_gates).sort(),[...matrix.automated].sort());
  for(const name of matrix.automated)eq(raw.automated_gates[name],'passed');
  eq(raw.checks.map(c=>c.name).sort(),[...matrix.automated].sort());for(const c of raw.checks)eq(c.status,'passed');
  eq(Object.keys(raw.manual_gates).sort(),[...matrix.manual].sort());for(const n of matrix.manual)eq(raw.manual_gates[n],'unrun');
  eq(raw.served_hashes_before,manifest.files);eq(raw.served_hashes_after,manifest.files);eq(raw.expected_artifacts,ARTIFACTS);
  eq(Object.keys(images).sort(),ARTIFACTS.filter(p=>p.endsWith('.png')).sort());
  const screenshots=[];
  for(const [name,bytes] of Object.entries(images)){
    assert.ok(bytes.length>=33&&bytes.length<=LIMITS.png);eq(bytes.subarray(0,8),Buffer.from([137,80,78,71,13,10,26,10]));
    eq(bytes.subarray(12,16).toString('ascii'),'IHDR');eq(bytes.readUInt32BE(16),name.startsWith('desktop')?1440:390);
    assert.ok(bytes.readUInt32BE(20)>0&&bytes.readUInt32BE(20)<=LIMITS.maxHeight);
    screenshots.push({name,bytes:bytes.length,sha256:hash(bytes)});
  }
  eq(raw.screenshots,[...screenshots].sort((a,b)=>a.name.localeCompare(b.name)));
  for(const key of ['started_at','finished_at']){assert.match(raw[key],/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);assert.ok(Number.isFinite(Date.parse(raw[key])));}
  assert.ok(Date.parse(raw.finished_at)>=Date.parse(raw.started_at));
  // Only this fixed allowlist leaves the job. Raw failure text, URLs, DOM and stack paths never leave it.
  const out={schema_version:'bitcoin-ci-evidence-v1',status:raw.status,release_acceptance:false,binding,
    started_at:raw.started_at,finished_at:raw.finished_at,browser_version:raw.browser_version,browser_channel:'chrome',
    playwright_version:PLAYWRIGHT_VERSION,chromium_sandbox:true,base:raw.base,external_request_count:0,page_error_count:0,
    automated_gates:Object.fromEntries(matrix.automated.map((n,i)=>[`B${String(i+1).padStart(2,'0')}`,{name:n,status:'passed'}])),
    manual_gates:Object.fromEntries(matrix.manual.map(n=>[n,'unrun'])),served_hashes_before:manifest.files,served_hashes_after:manifest.files,
    expected_artifacts:ARTIFACTS,screenshots};
  const bytes=Buffer.from(JSON.stringify(out,null,2)+'\n');assert.ok(bytes.length<=LIMITS.report);
  assert.ok(bytes.length+screenshots.reduce((s,f)=>s+f.bytes,0)<=LIMITS.total);return bytes;
}
