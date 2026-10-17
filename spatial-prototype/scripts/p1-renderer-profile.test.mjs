import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {LIMITS,TRIGGER,LIMITATION,numericMetrics,sanitizeProfile,profileArtifacts,createProfileController,createProfileDiagnostic,validateArtifactBytes} from './p1-renderer-profile.mjs';
import {PAIR_DRIVER_SHA,RUNTIME,BRANCH,digest,generateProfileSources,guard,profileAccepted,PLAYWRIGHT_CORE_SHA,auditTraceProfileSeparation,HARNESS_PARENT,PUSH_EVENT_BYTES,TRACE_LIMITS,parsePushEvent,validateHarnessLineage,verifyHarnessLaunch} from './p1-renderer-profile-driver.mjs';
const assets=new Map([['http://127.0.0.1:123/approved/assets/attachScene-abcd.js','attachScene-abcd.js']]);
const sample=new Function(`return ${TRIGGER}`)();
const profile=()=>({nodes:[{id:7,callFrame:{functionName:'(root)',url:'',scriptId:'secret'},children:[9,11]},{id:9,callFrame:{functionName:'snapshot',url:'',scriptId:'private-id'},children:[]},{id:11,callFrame:{functionName:'a',url:[...assets.keys()][0],scriptId:'123',lineNumber:4,columnNumber:6},children:[]}],startTime:100,endTime:30100,samples:[9,11,11],timeDeltas:[10000,10000,10000]});
const tick=async()=>{for(let i=0;i<200;i++)await Promise.resolve();};
function fakeClock(){let now=0,next=0;const timers=new Map();return {now:()=>now,set(fn,ms){const id=++next;timers.set(id,{at:now+ms,fn});return id;},clear:id=>timers.delete(id),async advance(ms){const end=now+ms;for(;;){const due=[...timers].filter(([,r])=>r.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;now=due[1].at;timers.delete(due[0]);due[1].fn();await tick();}now=end;await tick();},timers};}
function fixture({fail,hang,evaluate,screenshot,attach}={}){
 const clock=fakeClock(),calls=[],native=[],session={async send(method,params){calls.push({method,params});if(method===fail)throw new Error('PRIVATE /home/runner/token');if(method===hang)return new Promise(()=>{});if(method==='Profiler.stop')return {profile:profile()};if(method==='Performance.getMetrics')return {metrics:[{name:'TaskDuration',value:1},{name:'private',value:'secret'}]};return {};},async detach(){calls.push({method:'detach'});if(fail==='detach')throw new Error('PRIVATE');if(hang==='detach')return new Promise(()=>{});}};
 const page=new EventEmitter();page.evaluate=async function(...args){native.push({kind:'evaluate',self:this,args});return evaluate?evaluate(...args):{original:'result'};};page.screenshot=async function(...args){native.push({kind:'screenshot',self:this,args});return screenshot?screenshot(...args):Buffer.from('exact-original-pixels');};
 const original={evaluate:page.evaluate,screenshot:page.screenshot};const context=new EventEmitter();context.pages=()=>[];context.newCDPSession=async target=>{assert.equal(target,page);return attach?attach():session;};
 const c=createProfileController({assetURLs:assets,clock});c.attach(context);context.emit('page',page);
 return {clock,c,calls,native,page,context,session,original};
}
test('exact trigger and numeric metric allowlist',()=>{assert.equal(sample.toString(),TRIGGER);assert.deepEqual(numericMetrics({metrics:[{name:'Timestamp',value:1},{name:'ScriptDuration',value:NaN},{name:'URL',value:7}]}),{Timestamp:1});});
test('profile sanitizer removes source IDs and raw URLs; unknown scripts use one fixed bucket',()=>{
 const p=profile();p.nodes.push({id:13,callFrame:{functionName:'privateAccount',url:'file:///private/secret',scriptId:'secret-path',lineNumber:77},children:[]});p.nodes[0].children.push(13);p.samples.push(13);p.timeDeltas.push(0);
 const got=sanitizeProfile(p,assets),serialized=JSON.stringify(got);assert.doesNotMatch(serialized,/127\.0\.0\.1|secret|privateAccount|private\/|file:|http:|private-id/);assert.ok(got.nodes.every(n=>n.callFrame.scriptId===''));assert.equal(got.nodes[3].callFrame.functionName,'[unclassified-frame]');assert.equal(got.nodes[3].callFrame.lineNumber,-1);assert.equal(got.nodes[1].callFrame.functionName,'[unclassified-frame]');assert.equal(got.nodes[1].callFrame.url,'[unclassified-script]');assert.equal(got.nodes[2].callFrame.url,'attachScene-abcd.js');assert.deepEqual(got.samples,[2,3,3,4]);
});
test('raw URL query, arbitrary function name, deopt reason and source ticks are not carried over',()=>{
 const p=profile();p.nodes[2].callFrame.url+='?token=secret';p.nodes[2].callFrame.functionName='/private/name';p.nodes[2].deoptReason='private';p.nodes[2].positionTicks=[{private:'secret'}];const got=sanitizeProfile(p,assets);assert.equal(got.nodes[2].callFrame.functionName,'[unclassified-frame]');assert.doesNotMatch(JSON.stringify(got),/secret|private|token|positionTicks|deoptReason/);
});
test('malformed topology, source shape and invalid sample time fail closed',()=>{
 const mutations=[p=>p.nodes.push(p.nodes[1]),p=>p.nodes[0].children.push(9),p=>p.nodes[1].children.push(7),p=>p.nodes[0].children.pop(),p=>p.nodes[1].children.push(99),p=>p.samples.push(99),p=>p.timeDeltas[0]=-1,p=>p.timeDeltas[0]=Infinity,p=>p.endTime=-1,p=>p.timeDeltas[0]=9000000];
 for(const change of mutations){const p=profile();change(p);assert.throws(()=>sanitizeProfile(p,assets));}
});
test('artifact caps, overrun and invalid profiles are explicit; no cap can be widened',()=>{
 const metadata={errors:[],release_acceptance:false,full_acceptance:false};let got=profileArtifacts(profile(),assets,metadata);for(const [name,key]of [['renderer-main.cpuprofile','profileText'],['profile-summary.json','summaryText'],['profile-metadata.json','metadataText']])validateArtifactBytes(name,got[key]);
 got=profileArtifacts(profile(),assets,metadata,{...LIMITS,profileBytes:1});assert.equal(got.profileText,null);assert.equal(got.status,'profile-artifact-cap');
 got=profileArtifacts(profile(),assets,metadata,{...LIMITS,summaryBytes:1,metadataBytes:1});assert.equal(got.summaryText,null);assert.equal(got.metadataText,null);assert.equal(got.status,'summary-artifact-cap');
 const long=profile();long.endTime=long.startTime+75000001;assert.equal(profileArtifacts(long,assets,metadata).status,'collection-window-overrun');assert.equal(profileArtifacts({},assets,metadata).status,'invalid-profile');
 assert.throws(()=>profileArtifacts(profile(),assets,metadata,{...LIMITS,profileBytes:LIMITS.profileBytes+1}));
});
test('last-mile validator rejects private paths, URLs, script IDs, unknown files and oversized metadata',()=>{
 for(const value of ['file:///home/secret','/home/secret','C:\\secret','https://example.com/?token=secret'])assert.throws(()=>validateArtifactBytes('profile-summary.json',JSON.stringify({profile_status:'bad',value})));
 assert.throws(()=>validateArtifactBytes('renderer-main.cpuprofile',JSON.stringify({nodes:[{callFrame:{scriptId:'12'}}],samples:[]})));
 assert.throws(()=>validateArtifactBytes('raw-profile.json','{}'));
 assert.throws(()=>validateArtifactBytes('profile-metadata.json',JSON.stringify({full_acceptance:false,release_acceptance:false,profile_status:'x',big:'x'.repeat(LIMITS.metadataBytes)})));
});
test('only the exact call triggers; original receiver, arguments, result and pixels are preserved',async()=>{
 const f=fixture(),arg={a:1};await f.page.evaluate(()=>42,arg);await f.page.evaluate(TRIGGER);await f.page.screenshot({fullPage:true});assert.equal(f.calls.length,0);
 assert.deepEqual(await f.page.evaluate(sample),{original:'result'});const pixels=await f.page.screenshot({fullPage:false});assert.equal(pixels.toString(),'exact-original-pixels');const got=await f.c.finish();
 assert.equal(got.data.errors.length,0);assert.equal(got.data.trigger_count,1);assert.equal(got.data.target_screenshot_count,1);assert.equal(got.data.stop_reason,'timing-active-screenshot');assert.equal(f.calls.filter(c=>c.method==='Profiler.start').length,1);assert.equal(f.calls.filter(c=>c.method==='Profiler.stop').length,1);assert.deepEqual(f.calls.find(c=>c.method==='Profiler.setSamplingInterval').params,{interval:10000});
 assert.ok(f.native.every(c=>c.self===f.page));assert.equal(f.native[0].args[1],arg);assert.equal(f.native.filter(c=>c.kind==='screenshot').length,2);assert.equal(f.page.evaluate,f.original.evaluate);assert.equal(f.page.screenshot,f.original.screenshot);assert.equal(f.clock.timers.size,0);assert.equal(f.context.listenerCount('page'),0);
});
test('near-match call and extra argument never arm a profile',async()=>{const f=fixture();await f.page.evaluate(()=>window.__caseGraphicsProbe.frames(119,true));await f.page.evaluate(sample,undefined);const out=await f.c.finish();assert.ok(out.data.errors.includes('sample-trigger-missing'));assert.equal(f.calls.length,0);});
test('a duplicate matching call does not start a second profiler and is flagged',async()=>{const f=fixture();await f.page.evaluate(sample);await f.page.evaluate(sample);await f.page.screenshot({fullPage:false});const out=await f.c.finish();assert.ok(out.data.errors.includes('repeated-or-late-trigger'));assert.equal(f.calls.filter(c=>c.method==='Profiler.start').length,1);});
test('original sample rejection stays the identical exception; cleanup is independent',async()=>{const original=new Error('original sample failure');const f=fixture({evaluate:()=>{throw original;}});await assert.rejects(f.page.evaluate(sample),error=>error===original);const got=await f.c.finish();assert.ok(got.data.errors.includes('original-sample-rejected'));assert.equal(f.calls.filter(c=>c.method==='Profiler.stop').length,1);assert.equal(f.page.evaluate,f.original.evaluate);});
test('original screenshot rejection stays identical, is forwarded once and still stops',async()=>{const original=new Error('original PNG failure');const f=fixture({screenshot:()=>{throw original;}});await f.page.evaluate(sample);await assert.rejects(f.page.screenshot({fullPage:false}),error=>error===original);const got=await f.c.finish();assert.ok(got.data.errors.includes('original-screenshot-rejected'));assert.equal(f.native.filter(c=>c.kind==='screenshot').length,1);assert.equal(f.calls.filter(c=>c.method==='Profiler.stop').length,1);});
test('unexpected screenshot parameters are forwarded unchanged but cannot count as valid profiling',async()=>{const f=fixture();await f.page.evaluate(sample);const arg={fullPage:true};await f.page.screenshot(arg);const got=await f.c.finish();assert.ok(got.data.errors.includes('unexpected-target-screenshot'));assert.equal(f.native.at(-1).args[0],arg);});
for(const method of ['Profiler.enable','Profiler.setSamplingInterval','Performance.enable','Performance.getMetrics','Profiler.start','Profiler.stop','Profiler.disable','Performance.disable','detach'])test(`CDP rejection ${method} is recorded without replacing original calls`,async()=>{const f=fixture({fail:method});await f.page.evaluate(sample);await f.page.screenshot({fullPage:false});const got=await f.c.finish();assert.ok(got.data.errors.length);assert.doesNotMatch(JSON.stringify(got.data),/PRIVATE|home|token/);assert.equal(f.page.evaluate,f.original.evaluate);});
test('hanging start is bounded; queued stop closes an uncertain start exactly once',async()=>{const f=fixture({hang:'Profiler.start'});const work=f.page.evaluate(sample);await tick();await f.clock.advance(5000);await work;const final=f.c.finish();await tick();const got=await final;assert.ok(got.data.errors.includes('profile-setup-failed'));assert.equal(f.calls.filter(c=>c.method==='Profiler.stop').length,1);});
test('hanging stop and detach are each bounded; methods and listeners restore',async()=>{for(const method of ['Profiler.stop','detach']){const f=fixture({hang:method});await f.page.evaluate(sample);await f.page.screenshot({fullPage:false});const final=f.c.finish();await tick();await f.clock.advance(5000);const got=await final;assert.ok(got.data.errors.length);assert.equal(f.page.evaluate,f.original.evaluate);assert.equal(f.clock.timers.size,0);}});
test('75s collection expiry stops once without inventing a timing screenshot',async()=>{const f=fixture();await f.page.evaluate(sample);await f.clock.advance(75000);const got=await f.c.finish();assert.equal(got.data.stop_reason,'window-expired');assert.ok(got.data.errors.includes('window-expired'));assert.equal(got.data.target_screenshot_count,0);assert.equal(f.calls.filter(c=>c.method==='Profiler.stop').length,1);});
test('native deadline/finalizer does not alter original work; stop is single-flight',async()=>{const f=fixture();await f.page.evaluate(sample);const a=f.c.stop('scenario-finalizer'),b=f.c.stop('other');assert.equal(a,b);await a;const got=await f.c.finish();assert.equal(got.data.stop_reason,'scenario-finalizer');assert.equal(f.calls.filter(c=>c.method==='Profiler.stop').length,1);});
test('page/context close and second page fail bounded profiling without attaching elsewhere',async()=>{for(const target of ['page','context','second']){const f=fixture();await f.page.evaluate(sample);if(target==='second')f.context.emit('page',new EventEmitter());else f[target].emit('close');const got=await f.c.finish();assert.ok(got.data.errors.includes(target==='second'?'second-page-rejected':'page-or-context-closed'));assert.equal(f.calls.filter(c=>c.method==='Profiler.start').length,1);}});
test('late CDP attachment is detached and no profiler is started after attach deadline',async()=>{let resolveAttach;const f=fixture({attach:()=>new Promise(r=>{resolveAttach=r;})});const work=f.page.evaluate(sample);await tick();await f.clock.advance(5000);await work;await f.c.finish();resolveAttach(f.session);await tick();assert.equal(f.calls.filter(c=>c.method==='detach').length,1);assert.equal(f.calls.filter(c=>c.method==='Profiler.start').length,0);});
test('scenario adapter retains callback identity, original after hook and no raw artifact persistence',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'p1-profile-adapter-'));try{
 const output=join(dir,'safe'),identity={runtime_commit:RUNTIME.commit,runtime_tree:RUNTIME.tree,harness_commit:'a'.repeat(40)};
 const diagnostic=createProfileDiagnostic({output,assetURLs:assets,identity});let after=0;const callback=()=>{},expected=new Error('original scenario failure');
 const original=async(name,options,work)=>{assert.equal(work,callback);await options.afterScenario();throw expected;};
 await assert.rejects(diagnostic.wrap(original)('46-thirty-cycle-native-resource-handle-plateau',{budgetMs:300000,afterScenario:()=>{after++;}},callback),e=>e===expected);assert.equal(after,1);await diagnostic.finish();
 const metadata=await readFile(join(output,'profile-metadata.json'),'utf8');validateArtifactBytes('profile-metadata.json',metadata);assert.match(metadata,/sample-trigger-missing/);await assert.rejects(()=>diagnostic.finish(),/one-shot/);
 assert.throws(()=>createProfileDiagnostic({output,assetURLs:assets,identity:{...identity,private:'/secret'}}));
 }finally{await rm(dir,{recursive:true,force:true});}
});
const goodEnv={GITHUB_ACTIONS:'true',SPATIAL_BROWSER_REVIEW:'github-actions',GITHUB_RUN_ATTEMPT:'1',GITHUB_EVENT_NAME:'push',GITHUB_REF:BRANCH,GITHUB_RUN_ID:'123',GITHUB_SHA:'a'.repeat(40),SPATIAL_DIAGNOSTIC_HARNESS_SHA:'a'.repeat(40),SPATIAL_PROFILE_ONCE:'renderer-main-v1'};
const goodEvent={created:true,deleted:false,forced:false,before:'0'.repeat(40),after:goodEnv.GITHUB_SHA,ref:BRANCH};
test('one-shot workflow identity guard rejects local, rerun, alternate branch/event and drift',()=>{assert.doesNotThrow(()=>guard(goodEnv,goodEvent));for(const key of Object.keys(goodEnv))assert.throws(()=>guard({...goodEnv,[key]:'wrong'},goodEvent));});
test('initial creation guard rejects later push, deletion, force push and mismatched after/ref',()=>{
 assert.doesNotThrow(()=>guard(goodEnv,goodEvent));
 for(const change of [{created:false,before:goodEnv.GITHUB_SHA},{created:'true'},{deleted:true},{forced:true},{before:'b'.repeat(40)},{after:'b'.repeat(40)},{ref:BRANCH+'-other'}])assert.throws(()=>guard(goodEnv,{...goodEvent,...change}));
 for(const key of Object.keys(goodEvent)){const event={...goodEvent};delete event[key];assert.throws(()=>guard(goodEnv,event));}
 for(const event of [undefined,null,[],false])assert.throws(()=>guard(goodEnv,event));
 const next={...goodEnv,GITHUB_RUN_ID:'124',GITHUB_SHA:'b'.repeat(40),SPATIAL_DIAGNOSTIC_HARNESS_SHA:'b'.repeat(40)};
 assert.throws(()=>guard(next,{...goodEvent,created:false,before:goodEnv.GITHUB_SHA,after:next.GITHUB_SHA}));
});
test('push event decoding rejects malformed, oversized, invalid UTF-8 and non-object input',()=>{
 assert.deepEqual(parsePushEvent(Buffer.from(JSON.stringify(goodEvent))),goodEvent);
 for(const bytes of [Buffer.from('{'),Buffer.from('null'),Buffer.from('[]'),Buffer.from([0xff]),Buffer.alloc(PUSH_EVENT_BYTES+1,32),Buffer.alloc(0),'{}'])assert.throws(()=>parsePushEvent(bytes));
});
test('exact harness lineage requires one reviewed parent and its exact tree',()=>{
 const row={head:goodEnv.GITHUB_SHA,commitObject:'tree '+ 'c'.repeat(40)+'\nparent '+HARNESS_PARENT.commit+'\nauthor A\n\nmessage',parentTree:HARNESS_PARENT.tree};
 assert.doesNotThrow(()=>validateHarnessLineage(row,goodEnv));
 for(const change of [{head:'b'.repeat(40)},{parentTree:'c'.repeat(40)},{commitObject:row.commitObject.replace(HARNESS_PARENT.commit,'d'.repeat(40))},{commitObject:row.commitObject.replace('parent '+HARNESS_PARENT.commit+'\n','')},{commitObject:row.commitObject.replace('author A','parent '+HARNESS_PARENT.commit+'\nauthor A')},{commitObject:'x'.repeat(65537)}])assert.throws(()=>validateHarnessLineage({...row,...change},goodEnv));
});
test('early launch refuses malformed or later push events before consulting any Git checkout',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'p1-profile-event-'));try{
 const eventPath=join(dir,'event.json');const env={...goodEnv,GITHUB_EVENT_PATH:eventPath,GITHUB_WORKSPACE:join(dir,'nonexistent-checkout')};
 await writeFile(eventPath,JSON.stringify({...goodEvent,created:false}));await assert.rejects(verifyHarnessLaunch(env),/Only initial branch creation/);
 await writeFile(eventPath,Buffer.alloc(PUSH_EVENT_BYTES+1,32));await assert.rejects(verifyHarnessLaunch(env),/bounded scope/);
 await writeFile(eventPath,'{');await assert.rejects(verifyHarnessLaunch(env),SyntaxError);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('driver cannot open any local browser',()=>{assert.throws(()=>execFileSync(process.execPath,[fileURLToPath(new URL('./p1-renderer-profile-driver.mjs',import.meta.url))],{env:{...process.env,GITHUB_ACTIONS:'false'},stdio:'pipe'}),/No local browser is permitted/);});
test('profile completeness never supplies release acceptance or masks native failure',()=>{const m={profile_status:'complete',errors:[],trigger_count:1,target_screenshot_count:1,page_count:1,stop_reason:'timing-active-screenshot',release_acceptance:false,full_acceptance:false},s={profile_status:'complete',sample_count:3};assert.equal(profileAccepted(m,s),true);for(const key of Object.keys(m)){const copy={...m,[key]:null};assert.equal(profileAccepted(copy,s),false);}assert.match(LIMITATION,/GPU.*unavailable/);});
const pairedPath=process.env.SPATIAL_P1_PAIR_DRIVER,candidateScripts=process.env.SPATIAL_P1_CANDIDATE_SCRIPTS;
assert.ok(pairedPath&&candidateScripts,'Explicit pinned generator and candidate scripts are required');
const pairedBytes=await readFile(pairedPath);assert.equal(digest(pairedBytes),PAIR_DRIVER_SHA);
const paired=await import(pathToFileURL(resolve(pairedPath)).href);
const sources=Object.fromEntries(await Promise.all(Object.keys(paired.SOURCE_PINS.candidate).map(async name=>[name,await readFile(join(candidateScripts,name),'utf8')])));
test('complete wrapper/callback/recorder are byte-identical, with only additive driver wiring',()=>{
 const base=paired.generateDiagnosticSources(sources,'candidate'),out=generateProfileSources(base);assert.equal(out.graphics,base.graphics);assert.equal(out.conservation.profile_reverse_transform_sha256,digest(base.main));
 const wrapper=s=>s.slice(s.indexOf('async function scenario('),s.indexOf('\ntry {\n  const checkedOutCommit'));assert.equal(wrapper(out.main),wrapper(sources['browser-review.mjs']));
 for(const pattern of [/budgetMs: 300000/,/index <= 30/,/frames\(120, true\)/,/caseResourceObservationChecks.length, 9/,/const terminal = await fullProbe\(page\)/])assert.match(out.graphics,pattern);
 const drift={...base,conservation:{...base.conservation,lifecycle_callback_sha256:'x'}};assert.throws(()=>generateProfileSources(drift));
});
test('both generated modules parse without any browser execution',async()=>{const dir=await mkdtemp(join(tmpdir(),'p1-profile-parse-'));try{const out=generateProfileSources(paired.generateDiagnosticSources(sources,'candidate'));for(const name of ['main','graphics']){const path=join(dir,name+'.mjs');await writeFile(path,out[name]);execFileSync(process.execPath,['--check',path],{stdio:'pipe'});}}finally{await rm(dir,{recursive:true,force:true});}});
test('workflow is one candidate diagnostic only, with explicit sanitized upload paths',async()=>{const w=await readFile(new URL('../../.github/workflows/p1-renderer-profile.yml',import.meta.url),'utf8');assert.match(w,/branches: \[diagnostic\/pr16-p1-lifecycle-profile\]/);assert.doesNotMatch(w,/workflow_dispatch|schedule:|pull_request:|matrix:|continue-on-error|contents: write|deploy-pages|sudo|perf_event|no-sandbox/);assert.equal((w.match(/run: node scripts\/p1-renderer-profile-driver\.mjs/g)||[]).length,1);assert.equal((w.match(new RegExp('ref: '+RUNTIME.commit,'g'))||[]).length,1);assert.match(w,/test "\$GITHUB_RUN_ATTEMPT" = 1/);for(const filename of ['renderer-main.cpuprofile','profile-summary.json','profile-metadata.json'])assert.match(w,new RegExp('browser-profile/'+filename.replace('.','\\.')));assert.match(w,/validateArtifactBytes/);assert.match(w,/persist-credentials: false/);});
test('clean CI installs pinned dependencies before contracts and runs no browser before those contracts pass',async()=>{
 const w=await readFile(new URL('../../.github/workflows/p1-renderer-profile.yml',import.meta.url),'utf8');
 const markers=['await verifyHarnessLaunch(process.env);','run: npm ci --prefix pinned-candidate/spatial-prototype','run: node --test spatial-prototype/scripts/p1-renderer-profile.test.mjs','npm run build --prefix pinned-candidate/spatial-prototype','npx --no-install playwright install --with-deps chromium','run: node scripts/p1-renderer-profile-driver.mjs'];
 let previous=-1;for(const marker of markers){const at=w.indexOf(marker);assert.ok(at>previous,marker);assert.equal(w.split(marker).length,2);previous=at;}
 assert.match(w,/fetch-depth: 2/);for(const clause of ["github.event.created == true","github.event.deleted == false","github.event.forced == false","github.event.before == '"+'0'.repeat(40)+"'","github.event.after == github.sha","github.run_attempt == 1"])assert.ok(w.includes(clause));
 const beforePrepare=w.slice(w.indexOf('      - name: Install existing'),w.indexOf('      - name: Run the one profiled'));assert.doesNotMatch(beforePrepare,/if:|continue-on-error/);
});
test('installed pinned Playwright keeps CDP target sessions off the context trace owner',async()=>{
 const source=await readFile(join(candidateScripts,'../node_modules/playwright-core/lib/coreBundle.js'),'utf8');assert.equal(digest(source),PLAYWRIGHT_CORE_SHA);
 assert.match(source,/const rootSession = await this\._browser\._clientRootSession\(\);\s*return rootSession.attachToTarget\(targetId\);/);
 assert.match(source,/CDPSession = class _CDPSession extends SdkObject[\s\S]*?super\(parentSession, "cdp-session"\)/);
});
const ordinaryTrace=JSON.stringify({type:'before',class:'Page',method:'screenshot',params:{fullPage:false}})+'\n';
const traceEntries=(trace=ordinaryTrace)=>[['trace.trace',trace],['trace.network',''],['trace.stacks',JSON.stringify({files:[],stacks:[]})]];
const makeTrace=(dir,entries=traceEntries())=>execFileSync('python3',['-c',"import sys,zipfile,json;z=zipfile.ZipFile(sys.argv[1]+'/one.trace.zip','w',compression=zipfile.ZIP_DEFLATED);[(z.writestr(name,value)) for name,value in json.loads(sys.argv[2])];z.close()",dir,JSON.stringify(entries)],{stdio:'pipe'});
async function withTrace(work){const dir=await mkdtemp(join(tmpdir(),'p1-profile-trace-'));try{await work(dir);}finally{await rm(dir,{recursive:true,force:true});}}
test('native trace privacy audit parses all ordinary streams and rejects leaked profiler commands/payloads',()=>withTrace(async dir=>{
 makeTrace(dir);assert.deepEqual(auditTraceProfileSeparation(dir),{traces_checked:1,streams_checked:3,events_checked:1,profiler_commands:0,raw_profile_payloads:0,safe:true});
 for(const row of [{type:'before',class:'CDPSession',method:'send',params:{method:'Profiler.stop'}},{type:'after',result:{profile:{nodes:[],samples:[]}}}]){makeTrace(dir,traceEntries(JSON.stringify(row)+'\n'));assert.throws(()=>auditTraceProfileSeparation(dir),/upload blocked/);}
}));
test('independent reordered-profile and spaced-command privacy bypasses are refused structurally',()=>withTrace(async dir=>{
 const entries=['{"type": "before", "class": "CDPSession", "params": {"method": "Profiler.stop"}}',JSON.stringify({type:'after',result:{profile:{startTime:0,endTime:10000,nodes:[{id:1,callFrame:{functionName:'PRIVATE_FUNCTION',url:'file:///private/path',scriptId:'PRIVATE_SOURCE_ID'}}],samples:[1],timeDeltas:[10000]}}})];
 for(const entry of entries){makeTrace(dir,traceEntries(entry+'\n'));assert.throws(()=>auditTraceProfileSeparation(dir),/upload blocked/);}
}));
test('nested results, node-only payloads and escaped Profiler methods cannot bypass trace audit',()=>withTrace(async dir=>{
 const rows=[{result:{nested:[{profile:{endTime:10000,nodes:[],startTime:0}}]}},{result:{nodes:[],timeDeltas:[]}},{result:{nested:[{id:1,callFrame:{scriptId:'secret',url:'file:///private'}}]}},{params:{nested:[{method:'Profiler.start'}]}}];
 for(const row of rows){makeTrace(dir,traceEntries(JSON.stringify({type:'after',...row})+'\n'));assert.throws(()=>auditTraceProfileSeparation(dir),/upload blocked/);}
 makeTrace(dir,traceEntries('{"type":"before","params":{"method":"Profiler.'+String.raw`\u0073`+'top"}}\n'));assert.throws(()=>auditTraceProfileSeparation(dir),/upload blocked/);
}));
test('network and stack streams are structurally audited and unexpected streams are refused',()=>withTrace(async dir=>{
 const network=JSON.stringify({type:'resource-snapshot',snapshot:{request:{method:'GET'},response:{status:200}}})+'\n';makeTrace(dir,[...traceEntries().filter(([name])=>name!=='trace.network'),['trace.network',network]]);assert.equal(auditTraceProfileSeparation(dir).streams_checked,3);
 for(const [name,value]of [['trace.network',JSON.stringify({type:'resource-snapshot',snapshot:{nested:{profile:{nodes:[]}}}})+'\n'],['trace.stacks',JSON.stringify({files:[],stacks:[{result:{profile:{nodes:[]}}}]})]]){makeTrace(dir,[...traceEntries().filter(([key])=>key!==name),[name,value]]);assert.throws(()=>auditTraceProfileSeparation(dir),/upload blocked/);}
 for(const name of ['other.trace','trace.1.trace','resources/hidden.json','../trace.trace']){makeTrace(dir,[...traceEntries(),[name,'{}']]);assert.throws(()=>auditTraceProfileSeparation(dir),/upload blocked/);}
 makeTrace(dir,[...traceEntries(),['resources/src@'+'a'.repeat(40)+'.txt','// Existing static source attachment']]);assert.equal(auditTraceProfileSeparation(dir).safe,true);
}));
test('malformed, duplicate-key, nonfinite, blank and unexpected JSON trace records are refused',()=>withTrace(async dir=>{
 for(const text of ['{','null','[]','\n','{"type":"unexpected"}','{"type":"after","value":NaN}','{"type":"after","profile":{"nodes":[]},"profile":null}']){makeTrace(dir,traceEntries(text+'\n'));assert.throws(()=>auditTraceProfileSeparation(dir),/upload blocked/);}
 makeTrace(dir,[...traceEntries(),['trace.trace',ordinaryTrace]]);assert.throws(()=>auditTraceProfileSeparation(dir),/upload blocked/);
 for(const missing of ['trace.trace','trace.network','trace.stacks']){makeTrace(dir,traceEntries().filter(([name])=>name!==missing));assert.throws(()=>auditTraceProfileSeparation(dir),/upload blocked/);}
 makeTrace(dir,traceEntries(''));assert.throws(()=>auditTraceProfileSeparation(dir),/upload blocked/);
}));
test('trace archive, stream, record, member, depth and structural-size bounds fail closed',()=>withTrace(async dir=>{
 makeTrace(dir,traceEntries(ordinaryTrace+ordinaryTrace));
 for(const [name,value]of [['zipBytes',1],['totalBytes',1],['recordBytes',16],['stacksBytes',1],['records',1],['members',1],['depth',1],['values',1]])assert.throws(()=>auditTraceProfileSeparation(dir,{...TRACE_LIMITS,[name]:value}),/upload blocked/);
 for(const name of Object.keys(TRACE_LIMITS))assert.throws(()=>auditTraceProfileSeparation(dir,{...TRACE_LIMITS,[name]:TRACE_LIMITS[name]+1}),/cannot be widened/);
 makeTrace(dir,traceEntries(ordinaryTrace));await writeFile(join(dir,'two.trace.zip'),await readFile(join(dir,'one.trace.zip')));assert.throws(()=>auditTraceProfileSeparation(dir),/upload blocked/);
}));
test('successful scenario adapter persists only capped sanitized profile artifacts and preserves native result',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'p1-profile-success-'));try{
 const context=new EventEmitter(),page=new EventEmitter();context.pages=()=>[];
 context.newCDPSession=async target=>{assert.equal(target,page);return {async send(method){return method==='Profiler.stop'?{profile:profile()}:method==='Performance.getMetrics'?{metrics:[{name:'Timestamp',value:10}]}:{};},async detach(){}};};
 page.evaluate=async()=>[1,2,3];page.screenshot=async()=>Buffer.from('unchanged');const nativeEvaluate=page.evaluate,nativeScreenshot=page.screenshot;
 const output=join(dir,'safe'),diagnostic=createProfileDiagnostic({output,assetURLs:assets,identity:{runtime_commit:RUNTIME.commit,runtime_tree:RUNTIME.tree,harness_commit:'a'.repeat(40)}});
 const result={status:'running'},work=async p=>{assert.deepEqual(await p.evaluate(sample),[1,2,3]);assert.equal((await p.screenshot({fullPage:false})).toString(),'unchanged');};let after=0;
 const scenario=async(name,options,callback)=>{assert.equal(callback,work);await options.beforeNavigation(context,result);context.emit('page',page);await callback(page,result);result.status='passed';await options.afterScenario();return result;};
 assert.equal(await diagnostic.wrap(scenario)('46-thirty-cycle-native-resource-handle-plateau',{budgetMs:300000,beforeNavigation:async()=>{},afterScenario:()=>{after++;}},work),result);
 await diagnostic.finish();assert.equal(after,1);assert.equal(result.status,'passed');assert.equal(page.evaluate,nativeEvaluate);assert.equal(page.screenshot,nativeScreenshot);
 for(const name of ['renderer-main.cpuprofile','profile-summary.json','profile-metadata.json'])validateArtifactBytes(name,await readFile(join(output,name),'utf8'));
 const metadata=JSON.parse(await readFile(join(output,'profile-metadata.json'),'utf8')),summary=JSON.parse(await readFile(join(output,'profile-summary.json'),'utf8'));assert.equal(profileAccepted(metadata,summary),true);assert.ok(metadata.metrics.after_sample);assert.ok(metadata.metrics.before_screenshot);assert.equal(metadata.native_outcome,'passed');
 }finally{await rm(dir,{recursive:true,force:true});}
});
