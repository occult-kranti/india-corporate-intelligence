import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,appendFileSync,mkdirSync,mkdtempSync,readdirSync,existsSync} from 'node:fs';
import {resolve,join,relative,isAbsolute} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createServer} from 'node:http';
import {spawn,execFileSync} from 'node:child_process';
import {hash,verifyServingManifest} from './served-integrity.mjs';
import {RELEASE_SHA,PLAYWRIGHT_VERSION,ARTIFACTS,LIMITS,WORKFLOW,readRegular,verifySource,verifyLock,validateBinding,validateNativeReport,safeFailure} from './ci-contract.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const support=join(root,'scripts/bitcoin-growth');
let matrix={automated:[],manual:[]},manifestBytes,manifest;
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:65536,stdio:['ignore','pipe','ignore']}).trim();
let phase='startup-matrix',childExit=null,childSignal=null,raw,server;
const summarize=obj=>{
  const text=JSON.stringify(obj);
  try{writeFileSync(1,`${text}\n`);}catch{process.exitCode=1;}
  if(process.env.GITHUB_STEP_SUMMARY)try{appendFileSync(process.env.GITHUB_STEP_SUMMARY,`${text}\n`);}catch{
    process.exitCode=1;try{writeFileSync(1,JSON.stringify({code:'SAFE_SUMMARY_WRITE_FAILED',release_acceptance:false})+'\n');}catch{}
  }
};
const output=(key,value)=>{assert.match(key,/^[a-z_]+$/);assert.match(value,/^[a-f0-9]+$/);appendFileSync(process.env.GITHUB_OUTPUT,`${key}=${value}\n`);};
async function preflight(installed){
  assert.equal(process.env.GITHUB_ACTIONS,'true');
  assert.equal(process.env.GITHUB_REPOSITORY,'occult-kranti/india-corporate-intelligence');
  assert.equal(process.env.GITHUB_REF,'refs/heads/feature/bitcoin-growth-map');
  assert.equal(process.env.GITHUB_RUN_ATTEMPT,'1');assert.match(process.env.GITHUB_RUN_ID||'',/^\d{1,20}$/);
  assert.equal(git(['rev-parse','HEAD']),process.env.GITHUB_SHA);assert.equal(git(['status','--porcelain','--untracked-files=no']),'');
  verifySource(root,process.env.EXPECTED_SOURCE_MANIFEST_SHA256);
  verifyLock(JSON.parse(readRegular(root,'package-lock.json',4000000)));
  await verifyServingManifest(manifestBytes,RELEASE_SHA,p=>readRegular(root,`public/bitcoin-growth/${p}`));
  if(installed){
    for(const p of ['playwright','playwright-core'])assert.equal(JSON.parse(readRegular(root,`node_modules/${p}/package.json`)).version,PLAYWRIGHT_VERSION);
    // The reviewed runner selects the existing Chrome channel. This check does not install a browser.
    const version=execFileSync('google-chrome',['--version'],{encoding:'utf8',maxBuffer:1024,stdio:['ignore','pipe','ignore']}).trim();
    assert.match(version,/^Google Chrome (?:for Testing )?\d+(?:\.\d+){2,4}(?:[ -].*)?$/);
  }
  const binding={repository:process.env.GITHUB_REPOSITORY,branch:process.env.GITHUB_REF,commit:process.env.GITHUB_SHA,
    run_id:process.env.GITHUB_RUN_ID,run_attempt:process.env.GITHUB_RUN_ATTEMPT,source_manifest_sha256:process.env.EXPECTED_SOURCE_MANIFEST_SHA256,
    release_manifest_sha256:RELEASE_SHA,workflow_sha256:hash(readRegular(root,WORKFLOW)),package_lock_sha256:hash(readRegular(root,'package-lock.json',4000000)),
    runner_sha256:hash(readRegular(root,'scripts/bitcoin-growth/browser-flow.mjs')),playwright_version:PLAYWRIGHT_VERSION,chromium_sandbox:true};
  validateBinding(binding);return binding;
}
function tempPaths(){
  const temp=resolve(process.env.RUNNER_TEMP||'');assert.ok(process.env.RUNNER_TEMP&&isAbsolute(process.env.RUNNER_TEMP));
  const rel=relative(root,temp);assert.ok(rel==='..'||rel.startsWith('../'));return {temp,upload:join(temp,`bitcoin-growth-upload-${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}`)};
}
async function startFixture(){
  const files=new Map(manifest.files.map(f=>[`/bitcoin-growth/${f.path}`,readRegular(root,`public/bitcoin-growth/${f.path}`)]));
  files.set('/bitcoin-growth/',files.get('/bitcoin-growth/index.html'));
  server=createServer((req,res)=>{
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
    const url=new URL(req.url,'http://127.0.0.1:8769');const bytes=files.get(url.pathname);
    if(!bytes||url.search){res.writeHead(404).end();return;}
    const type=url.pathname.endsWith('.json')?'application/json':url.pathname.endsWith('.mjs')?'text/javascript':url.pathname.endsWith('.css')?'text/css':'text/html';
    res.writeHead(200,{'Content-Type':`${type}; charset=utf-8`,'Content-Length':bytes.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:bytes);
  });
  await new Promise((ok,no)=>{server.once('error',no);server.listen(8769,'127.0.0.1',ok);});
}
async function runChild(evidence){
  // Only runtime essentials reach the browser child, never repository credentials or action tokens.
  const env=Object.fromEntries(['PATH','HOME','TMPDIR','LANG','LC_ALL','XDG_RUNTIME_DIR'].filter(k=>process.env[k]).map(k=>[k,process.env[k]]));
  Object.assign(env,{CI:'true',ATLAS_URL:'http://127.0.0.1:8769/bitcoin-growth/',RELEASE_MANIFEST:join(support,'release-manifest-v2.json'),
    EXPECTED_RELEASE_MANIFEST_SHA256:RELEASE_SHA,EXPECTED_PLAYWRIGHT_VERSION:PLAYWRIGHT_VERSION,CHROMIUM_CHANNEL:'chrome',
    PLAYWRIGHT_MODULE:pathToFileURL(join(root,'node_modules/playwright/index.mjs')).href,EVIDENCE_DIR:evidence});
  return new Promise(resolveDone=>{
    const child=spawn(process.execPath,[join(support,'browser-flow.mjs')],{cwd:root,env,stdio:'ignore',detached:true});
    let force;const timeout=setTimeout(()=>{try{process.kill(-child.pid,'SIGTERM');}catch{}force=setTimeout(()=>{try{process.kill(-child.pid,'SIGKILL');}catch{}},5000);},600000);
    child.once('error',()=>{clearTimeout(timeout);clearTimeout(force);resolveDone({code:null,signal:null,spawn_failed:true});});
    child.once('exit',(code,signal)=>{clearTimeout(timeout);clearTimeout(force);resolveDone({code,signal});});
  });
}
try{
  // Startup inputs are untrusted until their source hashes pass. Never format their error text.
  const candidateMatrix=JSON.parse(readRegular(root,'scripts/bitcoin-growth/browser-acceptance-matrix.json'));
  assert.equal(candidateMatrix?.schema_version,'bitcoin-native-acceptance-v2');
  for(const key of ['automated','manual']){assert.ok(Array.isArray(candidateMatrix[key]));assert.ok(candidateMatrix[key].every(n=>typeof n==='string'));}
  matrix=candidateMatrix;
  phase='startup-release-manifest';
  manifestBytes=readRegular(root,'scripts/bitcoin-growth/release-manifest-v2.json');
  manifest=JSON.parse(manifestBytes);
  assert.equal(manifest?.schema_version,'olympus-bitcoin-release-v2');assert.ok(Array.isArray(manifest.files));
  phase='startup-source-manifest';
  verifySource(root,process.env.EXPECTED_SOURCE_MANIFEST_SHA256);
  phase='preflight';
  const command=process.argv[2]||'run';assert.ok(['preflight','run','verify-upload'].includes(command));
  const binding=await preflight(command==='run');
  if(command==='preflight'){summarize({code:'PINNED_INPUT_PREFLIGHT_PASSED',release_acceptance:false});}
  else if(command==='verify-upload'){
    phase='upload-validation';const {upload}=tempPaths();assert.deepEqual(readdirSync(upload).sort(),[...ARTIFACTS].sort());
    let total=0;for(const name of ARTIFACTS){const body=readRegular(upload,name,name.endsWith('.png')?LIMITS.png:LIMITS.report);total+=body.length;
      const key=name==='browser-flow-result.json'?'EXPECTED_REPORT_SHA256':name.startsWith('desktop')?'EXPECTED_DESKTOP_SHA256':'EXPECTED_MOBILE_SHA256';assert.equal(hash(body),process.env[key]);}
    assert.ok(total<=LIMITS.total);const report=JSON.parse(readRegular(upload,'browser-flow-result.json',LIMITS.report));assert.deepEqual(report.binding,binding);
    assert.equal(report.status,'passed_automated_native_suite_manual_gates_pending');assert.equal(report.release_acceptance,false);
    appendFileSync(process.env.GITHUB_OUTPUT,'upload_allowed=true\n');summarize({code:'BOUNDED_THREE_FILE_ENVELOPE_VERIFIED',release_acceptance:false});
  }else{
    phase='fixture';const {temp,upload}=tempPaths();assert.equal(existsSync(upload),false);
    const evidence=mkdtempSync(join(temp,'bitcoin-growth-raw-'));await startFixture();phase='native-suite';
    const child=await runChild(evidence);childExit=child.code;childSignal=child.signal;
    if(existsSync(join(evidence,'browser-flow-result.json')))raw=JSON.parse(readRegular(evidence,'browser-flow-result.json',LIMITS.report));
    assert.equal(child.code,0);assert.equal(child.signal,null);phase='report-validation';
    assert.deepEqual(readdirSync(evidence).sort(),[...ARTIFACTS].sort());
    const images=Object.fromEntries(ARTIFACTS.filter(n=>n.endsWith('.png')).map(n=>[n,readRegular(evidence,n,LIMITS.png)]));
    const report=validateNativeReport(raw,images,manifest,matrix,binding);
    const after=await preflight(true);assert.deepEqual(after,binding);phase='upload-envelope';
    mkdirSync(upload);writeFileSync(join(upload,ARTIFACTS[0]),report,{flag:'wx'});for(const [name,bytes] of Object.entries(images))writeFileSync(join(upload,name),bytes,{flag:'wx'});
    output('report_sha',hash(report));output('desktop_sha',hash(images['desktop-initial.png']));output('mobile_sha',hash(images['mobile-initial.png']));
    summarize({code:'AUTOMATED_NATIVE_PASSED_MANUAL_GATES_PENDING',passed_cases:matrix.automated.length,release_acceptance:false});
  }
}catch{
  const diagnostic=phase.startsWith('startup-')?{phase,code:'STARTUP_INPUT_INVALID',case_id:null,owned_script:'ci-wrapper.mjs',owned_line:null,passed_cases:0,exit_code:1,termination_signal:null,release_acceptance:false}:safeFailure(raw,childExit,childSignal,matrix,phase);
  summarize(diagnostic);
  // Retain the actual native nonzero exit status. Wrapper/inventory failures cannot become green.
  process.exitCode=Number.isInteger(childExit)&&childExit>0?childExit:1;
}finally{if(server)try{await new Promise((ok,no)=>server.close(error=>error?no(error):ok()));}catch{process.exitCode=process.exitCode||1;summarize({code:'FIXTURE_CLOSE_FAILED',release_acceptance:false});}}
