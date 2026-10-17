/** CI-only one-shot profiling orchestration. No application or original test edits. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,realpath,open} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
export const PAIR_DRIVER_SHA='f513c81fa656ba6321dd4f2ba69370f04876d08ba7de6e3e92ed06dee7e7cd21';
export const RUNTIME=Object.freeze({commit:'dcb5119f37680888b3fb5175626ac62448584417',tree:'eca4e4ad6deb12e7f0e8a90c481b720ba485935f'});
export const PLAYWRIGHT_CORE_SHA='9393fa79e1c67c74edc26b610d65a4f7ed73d345a762465cc88340a33a2454ac';
export const BRANCH='refs/heads/diagnostic/pr16-p1-lifecycle-profile';
export const HARNESS_PARENT=Object.freeze({commit:'3d926651b09db2340cd1d2613e02890684818fbc',tree:'b17544b391d57c8f67c611a3208c58538df76390'});
export const PUSH_EVENT_BYTES=1024*1024;
export const digest=value=>createHash('sha256').update(value).digest('hex');
function replaceOnce(text,old,value){assert.equal(text.split(old).length,2,'Pinned generator insertion must be unique');return text.replace(old,value);}
export function generateProfileSources(base) {
  assert.equal(digest(base.main),'d4ba8a867c64f34cf2af5e1961f04ed703dedbf8abfeab75f7dd43791994ce31');
  assert.equal(digest(base.graphics),'b89dbc3007eb6e45c55872271aafddcfb167bb9b455d97cbaf7ef7a7bcfca5a8');
  assert.equal(base.conservation.lifecycle_callback_sha256,'4e6974e1426b669749a81838de7db0fbd9df2a820c845ce5588e9375c544d4f1');
  assert.equal(base.conservation.scenario_wrapper_sha256,'544210ba017075b86d17bdc98f7a019b03653fe8d31f5bde0d446f575516416c');
  const importLine='import { createProfileDiagnostic } from "./p1-renderer-profile.mjs";\n';
  const old='  const caseReviewContext = { root, dist, output, origin, prefix, scenario, capture, assertFullLoad, assertReaderOnly, assertSpatial, assertCountryBase, until, report, temporary };\n  await runCaseGraphicsBrowserCases(caseReviewContext, { mode: "p1-lifecycle-diagnostic" });';
  const replacement=`  const profileAssets = JSON.parse(await readFile(join(root, "scripts", "p1-profile-assets.json"), "utf8"));
  assert.ok(Array.isArray(profileAssets) && profileAssets.length > 0 && profileAssets.every(name => name.startsWith("assets/") && /^[A-Za-z0-9_-]+\\.js$/.test(name.slice(7))));
  const profileDiagnostic = createProfileDiagnostic({ output: join(root, "browser-profile"),
    assetURLs: new Map(profileAssets.map(name => [new URL(prefix + name, origin).href, name.slice(7)])),
    identity: { runtime_commit: "${RUNTIME.commit}", runtime_tree: "${RUNTIME.tree}", harness_commit: process.env.SPATIAL_DIAGNOSTIC_HARNESS_SHA } });
  const caseReviewContext = { root, dist, output, origin, prefix, scenario: profileDiagnostic.wrap(scenario), capture, assertFullLoad, assertReaderOnly, assertSpatial, assertCountryBase, until, report, temporary };
  try { await runCaseGraphicsBrowserCases(caseReviewContext, { mode: "p1-lifecycle-diagnostic" }); }
  finally { await profileDiagnostic.finish(); }`;
  const main=importLine+replaceOnce(base.main,old,replacement);
  const reverse=replaceOnce(main,importLine,'').replace(replacement,old);assert.equal(reverse,base.main,'Original complete scenario source must be recoverable exactly');
  const wrapper=text=>text.slice(text.indexOf('async function scenario('),text.indexOf('\ntry {\n  const checkedOutCommit'));
  assert.equal(wrapper(main),wrapper(base.main));
  return {main,graphics:base.graphics,conservation:{...base.conservation,profile_main_sha256:digest(main),profile_reverse_transform_sha256:digest(reverse),profile_graphics_unchanged:true,profile_scenario_wrapper_unchanged:true,profile_callback_unchanged:true}};
}
export function guard(env,event) {
  assert.equal(env.GITHUB_ACTIONS,'true','No local browser is permitted');assert.equal(env.SPATIAL_BROWSER_REVIEW,'github-actions');
  assert.equal(env.GITHUB_RUN_ATTEMPT,'1','One first attempt only');assert.equal(env.GITHUB_EVENT_NAME,'push');assert.equal(env.GITHUB_REF,BRANCH);
  assert.match(env.GITHUB_RUN_ID??'',/^\d+$/u);assert.match(env.GITHUB_SHA??'',/^[a-f0-9]{40}$/u);assert.equal(env.SPATIAL_DIAGNOSTIC_HARNESS_SHA,env.GITHUB_SHA);
  assert.equal(env.SPATIAL_PROFILE_ONCE,'renderer-main-v1');
  assert.ok(event&&typeof event==='object'&&!Array.isArray(event),'Initial push event required');
  assert.equal(event.created,true,'Only initial branch creation is permitted');assert.equal(event.deleted,false);assert.equal(event.forced,false);
  assert.equal(event.before,'0'.repeat(40));assert.equal(event.after,env.GITHUB_SHA);assert.equal(event.ref,BRANCH);
}
export function parsePushEvent(bytes) {
  assert.ok(Buffer.isBuffer(bytes)&&bytes.length>0&&bytes.length<=PUSH_EVENT_BYTES,'Push event exceeds bounded scope');
  const event=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  assert.ok(event&&typeof event==='object'&&!Array.isArray(event));return event;
}
export function validateHarnessLineage({head,commitObject,parentTree},env) {
  assert.equal(head,env.GITHUB_SHA);assert.ok(typeof commitObject==='string'&&Buffer.byteLength(commitObject)<=65536);
  const headers=commitObject.split('\n\n',1)[0].split('\n'),parents=headers.filter(line=>line.startsWith('parent '));
  assert.deepEqual(parents,['parent '+HARNESS_PARENT.commit],'Harness must have exactly the reviewed diagnostic parent');
  assert.equal(headers.filter(line=>/^tree [a-f0-9]{40}$/u.test(line)).length,1);assert.equal(parentTree,HARNESS_PARENT.tree);
}
export async function verifyHarnessLaunch(env) {
  // Repeat the full event/object check in both the early preparation gate and the driver.
  assert.equal(env.GITHUB_ACTIONS,'true','No local browser is permitted');
  assert.ok(typeof env.GITHUB_EVENT_PATH==='string'&&env.GITHUB_EVENT_PATH.length>0);
  assert.ok(typeof env.GITHUB_WORKSPACE==='string'&&env.GITHUB_WORKSPACE.length>0);
  const file=await open(env.GITHUB_EVENT_PATH,'r');let bytes;
  try{const buffer=Buffer.alloc(PUSH_EVENT_BYTES+1);const {bytesRead}=await file.read(buffer,0,buffer.length,0);bytes=buffer.subarray(0,bytesRead);}finally{await file.close();}
  guard(env,parsePushEvent(bytes));
  const git=args=>execFileSync('git',args,{cwd:env.GITHUB_WORKSPACE,encoding:'utf8',timeout:5000,maxBuffer:65536}).trim();
  validateHarnessLineage({head:git(['rev-parse','HEAD']),commitObject:git(['cat-file','-p',env.GITHUB_SHA]),parentTree:git(['rev-parse',HARNESS_PARENT.commit+'^{tree}'])},env);
}
export function profileAccepted(metadata,summary) {
  return metadata?.profile_status==='complete'&&summary?.profile_status==='complete'&&summary.sample_count>0&&metadata?.errors?.length===0&&metadata.trigger_count===1&&metadata.target_screenshot_count===1&&metadata.page_count===1&&metadata.stop_reason==='timing-active-screenshot'&&metadata.release_acceptance===false&&metadata.full_acceptance===false;
}
async function run() {
  await verifyHarnessLaunch(process.env);assert.equal(process.argv.length,2,'No alternate scope arguments');
  const scripts=dirname(fileURLToPath(import.meta.url)),spatial=resolve(scripts,'..'),repository=resolve(spatial,'..');
  assert.equal(digest(await readFile(join(scripts,'p1-lifecycle-diagnostic.mjs'))),PAIR_DRIVER_SHA);
  assert.equal(digest(await readFile(join(spatial,'node_modules/playwright-core/lib/coreBundle.js'))),PLAYWRIGHT_CORE_SHA,'Pinned CDP/tracing implementation drift');
  const {SOURCE_PINS,generateDiagnosticSources,inventory,validateDiagnosticReport}=await import('./p1-lifecycle-diagnostic.mjs');
  const git=args=>execFileSync('git',args,{cwd:repository,encoding:'utf8'}).trim();
  const verify=()=>{assert.equal(git(['rev-parse','HEAD']),RUNTIME.commit);assert.equal(git(['rev-parse','HEAD^{tree}']),RUNTIME.tree);assert.equal(git(['diff','HEAD','--name-only']),'');};verify();
  await writeFile(join(spatial,'.p1-renderer-profile-one-shot'),process.env.GITHUB_RUN_ID,{flag:'wx'});
  const output=join(spatial,'browser-review','p1-lifecycle-diagnostic','candidate');assert.equal(existsSync(output),false);assert.equal(existsSync(join(spatial,'browser-profile')),false);
  const sources=Object.fromEntries(await Promise.all(Object.keys(SOURCE_PINS.candidate).map(async name=>[name,await readFile(join(scripts,name),'utf8')])));
  const generated=generateProfileSources(generateDiagnosticSources(sources,'candidate'));
  await mkdir(output,{recursive:true});const save=(name,value)=>writeFile(join(output,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
  for(const [name,text]of [['p1-lifecycle-generated-main.mjs',generated.main],['p1-lifecycle-generated-graphics.mjs',generated.graphics]]){await writeFile(join(scripts,name),text,{flag:'wx'});await writeFile(join(output,name),text,{flag:'wx'});}
  const built=await inventory(await realpath(join(spatial,'dist')));assert.ok(built.some(row=>row.path==='index.html'));
  const assets=built.map(row=>row.path).filter(name=>/^assets\/[A-Za-z0-9_-]+\.js$/u.test(name));assert.ok(assets.length>0);
  await writeFile(join(scripts,'p1-profile-assets.json'),JSON.stringify(assets),{flag:'wx'});
  await save('profile-source-conservation.json',{...generated.conservation,runtime:RUNTIME,paired_generator_sha256:PAIR_DRIVER_SHA});
  await save('runtime-build.json',{runtime:RUNTIME,files:built});
  let child,observation;const result={diagnostic_only:true,release_acceptance:false,full_acceptance:false,runtime:RUNTIME,harness_commit:process.env.GITHUB_SHA,run_id:process.env.GITHUB_RUN_ID,run_attempt:1,profile_outcome:'unavailable'};
  try{
    child=spawnSync(process.execPath,[join(scripts,'p1-lifecycle-generated-main.mjs')],{cwd:spatial,encoding:'utf8',env:{...process.env,SPATIAL_HEAD_SHA:RUNTIME.commit,SPATIAL_DIAGNOSTIC_RUNTIME_SHA:RUNTIME.commit},maxBuffer:32*1024*1024,timeout:12*60*1000});
    // Existing native logs are retained independently; no raw profile is logged.
    await writeFile(join(output,'process.stdout'),child.stdout??'');await writeFile(join(output,'process.stderr'),child.stderr??'');
    result.raw_process_exit_code=child.status;result.raw_process_signal=child.signal;
    assert.equal(child.error,undefined);assert.equal(child.signal,null);verify();assert.deepEqual(await inventory(join(spatial,'dist')),built);
    const report=JSON.parse(await readFile(join(output,'diagnostics.json'),'utf8'));
    observation=validateDiagnosticReport(report,'candidate',child.status);
    await save('native-diagnostic-observation.json',observation);
    result.native_outcome=observation.observation;
    const metadata=JSON.parse(await readFile(join(spatial,'browser-profile','profile-metadata.json'),'utf8'));
    const summary=JSON.parse(await readFile(join(spatial,'browser-profile','profile-summary.json'),'utf8'));
    result.profile_outcome=profileAccepted(metadata,summary)?'complete-diagnostic-only':'incomplete-diagnostic-only';
    process.exitCode=child.status|| (result.profile_outcome==='complete-diagnostic-only'?0:1);
  }catch{result.driver_status='failed';process.exitCode=1;}
  finally{await save('profile-run-result.json',result);console.log(JSON.stringify(result));}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await run();
/** Fail closed before native-archive upload; no native evidence is rewritten. */
export const TRACE_LIMITS=Object.freeze({zipBytes:64*1024*1024,totalBytes:256*1024*1024,recordBytes:16*1024*1024,stacksBytes:1024*1024,records:100000,members:64,depth:128,values:2000000});
export function auditTraceProfileSeparation(directory,limits=TRACE_LIMITS) {
  assert.deepEqual(Object.keys(limits).sort(),Object.keys(TRACE_LIMITS).sort());
  for(const [name,value]of Object.entries(limits))assert.ok(Number.isSafeInteger(value)&&value>0&&value<=TRACE_LIMITS[name],'Trace bounds cannot be widened');
  const program=String.raw`
import pathlib,zipfile,json,re,sys
limits=json.loads(sys.argv[2])
result={'traces_checked':0,'streams_checked':0,'events_checked':0,'profiler_commands':0,'raw_profile_payloads':0,'safe':False}
def require(condition):
 if not condition: raise ValueError('refused')
def pairs(items):
 out={}
 for key,value in items:
  require(key not in out)
  out[key]=value
 return out
def invalid_constant(value): raise ValueError('refused')
def decode(data):
 return json.loads(data.decode('utf-8'),object_pairs_hook=pairs,parse_constant=invalid_constant)
def inspect(value):
 pending=[iter([value])];count=0
 while pending:
  try: item=next(pending[-1])
  except StopIteration:
   pending.pop();continue
  count+=1
  require(len(pending)-1<=limits['depth'] and count<=limits['values'])
  if isinstance(item,dict):
   method=item.get('method')
   if isinstance(method,str) and method.startswith('Profiler.'): result['profiler_commands']+=1
   if (isinstance(item.get('profile'),(dict,list)) or
       ('nodes' in item and any(key in item for key in ('samples','timeDeltas','startTime','endTime'))) or
       isinstance(item.get('callFrame'),dict)):
    result['raw_profile_payloads']+=1
   pending.append(iter(item.values()))
  elif isinstance(item,list): pending.append(iter(item))
def events(z,info,network=False):
 require(info.file_size<=limits['totalBytes'])
 total=0;rows=0
 with z.open(info) as stream:
  while True:
   line=stream.readline(limits['recordBytes']+1)
   if not line: break
   require(len(line)<=limits['recordBytes'])
   total+=len(line);rows+=1;result['events_checked']+=1
   require(total<=info.file_size and result['events_checked']<=limits['records'])
   row=decode(line);require(isinstance(row,dict));inspect(row)
   if network:
    require(row.get('type')=='resource-snapshot' and isinstance(row.get('snapshot'),dict))
   else:
    require(row.get('type') in ('context-options','before','after','event','log','console','input'))
 require(total==info.file_size and (network or rows>0))
 result['streams_checked']+=1
try:
 files=[]
 for path in pathlib.Path(sys.argv[1]).rglob('*.trace.zip'):
  files.append(path);require(len(files)<=1)
 require(len(files)==1);result['traces_checked']=1
 path=files[0];require(not path.is_symlink() and path.stat().st_size<=limits['zipBytes'])
 with zipfile.ZipFile(path) as z:
  infos=z.infolist();names=[info.filename for info in infos]
  require(len(infos)<=limits['members'] and len(names)==len(set(names)))
  require(sum(info.file_size for info in infos)<=limits['totalBytes'])
  expected={'trace.trace','trace.network','trace.stacks'}
  require(expected.issubset(names))
  for info in infos:
   require(not info.is_dir() and not (info.flag_bits & 1))
   # Only the pinned format's static source attachments may sit beside all three parsed streams.
   require(info.filename in expected or re.fullmatch(r'resources/src@[a-f0-9]{40}\.txt',info.filename))
  events(z,z.getinfo('trace.trace'))
  events(z,z.getinfo('trace.network'),network=True)
  stacks=z.getinfo('trace.stacks');require(stacks.file_size<=limits['stacksBytes'])
  with z.open(stacks) as stream: data=stream.read(limits['stacksBytes']+1)
  require(len(data)==stacks.file_size and len(data)<=limits['stacksBytes'])
  row=decode(data);require(isinstance(row,dict) and set(row)=={'files','stacks'})
  require(isinstance(row['files'],list) and isinstance(row['stacks'],list));inspect(row)
  result['streams_checked']+=1
 result['safe']=result['profiler_commands']==0 and result['raw_profile_payloads']==0
except Exception:
 result['refusal']='invalid-or-oversized-trace'
print(json.dumps(result))
`;
  let result;
  try{result=JSON.parse(execFileSync('python3',['-c',program,directory,JSON.stringify(limits)],{encoding:'utf8',maxBuffer:65536,timeout:30000,stdio:['ignore','pipe','pipe']}));}
  catch{assert.fail('Native trace audit failed or exceeded its bound; upload blocked');}
  assert.equal(result.safe,true,'Native trace contains profiler data or has unexpected scope; upload blocked');return result;
}
