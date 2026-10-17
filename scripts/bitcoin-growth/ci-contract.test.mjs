import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,copyFileSync,mkdirSync,mkdtempSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {hash} from './served-integrity.mjs';
import {RELEASE_SHA,ARTIFACTS,LIMITS,verifyLock,validateNativeReport,safeFailure,validateBinding} from './ci-contract.mjs';
const manifest=JSON.parse(readFileSync(new URL('./release-manifest-v2.json',import.meta.url)));
const matrix=JSON.parse(readFileSync(new URL('./browser-acceptance-matrix.json',import.meta.url)));
const binding={repository:'occult-kranti/india-corporate-intelligence',branch:'refs/heads/feature/bitcoin-growth-map',commit:'a'.repeat(40),run_id:'1234',run_attempt:'1',source_manifest_sha256:'b'.repeat(64),release_manifest_sha256:RELEASE_SHA,workflow_sha256:'c'.repeat(64),package_lock_sha256:'d'.repeat(64),runner_sha256:'e'.repeat(64),playwright_version:'1.62.1',chromium_sandbox:true};
function fixture(){
  const images=Object.fromEntries(['desktop-initial.png','mobile-initial.png'].map(n=>{const b=Buffer.alloc(33);Buffer.from([137,80,78,71,13,10,26,10]).copy(b);b.write('IHDR',12);b.writeUInt32BE(n.startsWith('desktop')?1440:390,16);b.writeUInt32BE(1000,20);return[n,b];}));
  const raw={status:'passed_automated_native_suite_manual_gates_pending',browser_started:true,release_acceptance:false,selected_manifest_sha256:RELEASE_SHA,
    base:'http://127.0.0.1:8769/bitcoin-growth/',external_requests:[],errors:[],browser_channel:'chrome',playwright_version:'1.62.1',browser_version:'142.0.0.0',
    automated_gates:Object.fromEntries(matrix.automated.map(n=>[n,'passed'])),manual_gates:Object.fromEntries(matrix.manual.map(n=>[n,'unrun'])),
    checks:matrix.automated.map(name=>({name,status:'passed'})),served_hashes_before:manifest.files,served_hashes_after:manifest.files,expected_artifacts:ARTIFACTS,
    screenshots:Object.entries(images).map(([name,b])=>({name,bytes:b.length,sha256:hash(b)})),started_at:'2026-10-17T00:00:00.000Z',finished_at:'2026-10-17T00:01:00.000Z'};
  return{raw,images,binding:structuredClone(binding)};
}
const validate=f=>validateNativeReport(f.raw,f.images,manifest,matrix,f.binding);
test('complete bounded envelope is allowed without release acceptance',()=>{const f=fixture();const out=JSON.parse(validate(f));assert.equal(out.release_acceptance,false);assert.equal(Object.keys(out.automated_gates).length,29);assert.equal(out.binding.commit,binding.commit);});
test('raw report additions are never copied to the public artifact',()=>{const f=fixture();f.raw.failure='SECRET DOM URL /private/path';f.raw.arbitrary='SENSITIVE';const out=validate(f).toString();assert.doesNotMatch(out,/SECRET|SENSITIVE|private/);});
const mutations={
  'wrong commit':f=>f.binding.commit='latest',
  'wrong branch':f=>f.binding.branch='refs/heads/master',
  'repeated run':f=>f.binding.run_attempt='2',
  'sandbox disabled':f=>f.binding.chromium_sandbox=false,
  'wrong release':f=>f.raw.selected_manifest_sha256='f'.repeat(64),
  'external request':f=>f.raw.external_requests=['https://example.invalid/data'],
  'page error':f=>f.raw.errors=['raw source excerpt'],
  'missing automated gate':f=>delete f.raw.automated_gates[matrix.automated[0]],
  'failed case':f=>f.raw.automated_gates[matrix.automated[0]]='failed',
  'manual gate fabricated pass':f=>f.raw.manual_gates[matrix.manual[0]]='passed',
  'native failure':f=>f.raw.status='failed_browser_gate',
  'source mismatch after native':f=>f.raw.served_hashes_after=[],
  'extra artifact':f=>f.raw.expected_artifacts=[...ARTIFACTS,'trace.zip'],
  'missing screenshot':f=>delete f.images['mobile-initial.png'],
  'changed screenshot':f=>f.images['mobile-initial.png'][32]=1,
  'wrong screenshot width':f=>f.images['desktop-initial.png'].writeUInt32BE(1920,16),
  'oversized screenshot':f=>f.images['desktop-initial.png']=Buffer.alloc(LIMITS.png+1),
  'browser version contains raw log':f=>f.raw.browser_version='142.0 /private/path',
  'wrong Playwright':f=>f.raw.playwright_version='1.63.0',
  'release accepted':f=>f.raw.release_acceptance=true,
};
for(const [name,mutate]of Object.entries(mutations))test(`reject ${name}`,()=>{const f=fixture();mutate(f);assert.throws(()=>validate(f));});
test('failure summary preserves bounded case, owned line, pass count and native exit',()=>{
  const f=fixture();f.raw.automated_gates[matrix.automated[3]]='failed';f.raw.failure='Error SECRET DOM\n at file:///some/private/path/browser-flow.mjs:44:12';
  const safe=safeFailure(f.raw,7,null,matrix,'native-suite');assert.equal(safe.case_id,'B04');assert.equal(safe.owned_line,44);assert.equal(safe.exit_code,7);assert.equal(safe.passed_cases,28);assert.doesNotMatch(JSON.stringify(safe),/SECRET|private\/path/);
});
test('early startup failure remains failed with no invented case',()=>{const s=safeFailure(undefined,1,null,matrix,'fixture');assert.equal(s.case_id,null);assert.equal(s.passed_cases,0);assert.equal(s.release_acceptance,false);});
test('official pinned package metadata is required',()=>{
  const lock={packages:Object.fromEntries(['playwright','playwright-core'].map(n=>[`node_modules/${n}`,{version:'1.62.1',resolved:`https://registry.npmjs.org/${n}/-/${n}-1.62.1.tgz`,integrity:'sha512-abc='}]))};
  verifyLock(lock);lock.packages['node_modules/playwright'].resolved='https://unrecognized.invalid/a';assert.throws(()=>verifyLock(lock));
});
test('wrong repository and missing source binding are rejected',()=>{assert.throws(()=>validateBinding({...binding,repository:'other/repo'}));assert.throws(()=>validateBinding({...binding,source_manifest_sha256:undefined}));});

test('non-registry transitive dependency is rejected before installation',()=>{assert.throws(()=>verifyLock({packages:{'node_modules/other':{resolved:'git+https://example.invalid/repo',integrity:'sha512-abc='}}}));});

// These subprocess tests stop at guarded startup. No GitHub context is spoofed,
// no fixture/browser is started, and no installation or network access is used.
const startupCases=[
  {name:'missing matrix',file:'browser-acceptance-matrix.json',missing:true,phase:'startup-matrix'},
  {name:'malformed matrix',file:'browser-acceptance-matrix.json',body:'{"marker":"STARTUP_SECRET_SENTINEL", INVALID}',phase:'startup-matrix'},
  {name:'null matrix',file:'browser-acceptance-matrix.json',body:'null',phase:'startup-matrix'},
  {name:'wrong-shaped matrix',file:'browser-acceptance-matrix.json',body:'{"schema_version":"bitcoin-native-acceptance-v2","automated":"STARTUP_SECRET_SENTINEL","manual":[]}',phase:'startup-matrix'},
  {name:'non-string matrix case',file:'browser-acceptance-matrix.json',body:'{"schema_version":"bitcoin-native-acceptance-v2","automated":[{"secret":"STARTUP_SECRET_SENTINEL"}],"manual":[]}',phase:'startup-matrix'},
  {name:'missing release manifest',file:'release-manifest-v2.json',missing:true,phase:'startup-release-manifest'},
  {name:'malformed release manifest',file:'release-manifest-v2.json',body:'{"marker":"STARTUP_SECRET_SENTINEL", INVALID}',phase:'startup-release-manifest'},
  {name:'missing source manifest',file:'publication-source-manifest.json',missing:true,phase:'startup-source-manifest'},
  {name:'malformed source manifest',file:'publication-source-manifest.json',body:'{"marker":"STARTUP_SECRET_SENTINEL", INVALID}',phase:'startup-source-manifest'},
];
for(const c of startupCases)test(`guarded startup: ${c.name}`,t=>{
  const root=mkdtempSync(join(tmpdir(),'bitcoin-startup-sentinel-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
  const dir=join(root,'scripts','bitcoin-growth');mkdirSync(dir,{recursive:true});
  for(const name of ['ci-wrapper.mjs','ci-contract.mjs','served-integrity.mjs','browser-acceptance-matrix.json','release-manifest-v2.json']){
    if(c.missing&&c.file===name)continue;copyFileSync(new URL(`./${name}`,import.meta.url),join(dir,name));
  }
  if(c.body!==undefined)writeFileSync(join(dir,c.file),c.body);
  const before=readdirSync(dir).sort();
  const expectedSource=c.file==='publication-source-manifest.json'&&c.body!==undefined?hash(Buffer.from(c.body)):'0'.repeat(64);
  const result=spawnSync(process.execPath,[join(dir,'ci-wrapper.mjs'),'preflight'],{cwd:root,env:{PATH:process.env.PATH,EXPECTED_SOURCE_MANIFEST_SHA256:expectedSource},encoding:'utf8',maxBuffer:4096,timeout:10000});
  assert.equal(result.error,undefined);assert.equal(result.status,1);assert.equal(result.signal,null);assert.equal(result.stderr,'');
  assert.ok(Buffer.byteLength(result.stdout)<1024);assert.equal(result.stdout.trim().split('\n').length,1);
  assert.doesNotMatch(result.stdout,/STARTUP_SECRET_SENTINEL|SyntaxError|ENOENT|node:|file:\/\/|\/tmp\/|\/workspace\/|bitcoin-startup-sentinel-| at /);
  const out=JSON.parse(result.stdout);assert.equal(out.code,'STARTUP_INPUT_INVALID');assert.equal(out.phase,c.phase);
  assert.equal(out.exit_code,1);assert.equal(out.case_id,null);assert.equal(out.passed_cases,0);assert.equal(out.release_acceptance,false);
  assert.deepEqual(readdirSync(dir).sort(),before);assert.deepEqual(readdirSync(root),['scripts']);
});
