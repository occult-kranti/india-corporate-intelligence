/** One diagnostic-only page CPU profile. Never an acceptance oracle or GPU profile. */
import assert from 'node:assert/strict';
import {writeFile, mkdir} from 'node:fs/promises';
import {join} from 'node:path';
export const LIMITS = Object.freeze({intervalUs:10000, windowMs:75000, commandMs:5000, profileBytes:4*1024*1024, summaryBytes:1024*1024, metadataBytes:64*1024});
export const TRIGGER = '() => window.__caseGraphicsProbe.frames(120, true)';
export const LIMITATION = 'Diagnostic-only sampling perturbs timing. Renderer-main JavaScript isolate only; GPU, browser and other-process attribution is unavailable. Native outcomes and 300000ms budget are unchanged. No release acceptance.';
const METRICS = new Set(['Timestamp','TaskDuration','ScriptDuration','LayoutDuration','RecalcStyleDuration','JSHeapUsedSize','JSHeapTotalSize']);
const BUILTINS = new Set(['(root)','(idle)','(program)','(garbage collector)']);
const safeFunction = name => typeof name === 'string' && /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*){0,3}$/u.test(name) && name.length <= 120;
const finite = x => typeof x === 'number' && Number.isFinite(x);
const encode = value => JSON.stringify(value) + '\n';
export function numericMetrics(response) {
  return Object.fromEntries((response?.metrics ?? []).filter(row=>METRICS.has(row.name)&&finite(row.value)).map(row=>[row.name,row.value]));
}
/** Unknown frames get a fixed bucket. No raw URL, script ID, source or error enters artifacts. */
export function sanitizeProfile(raw, assetURLs) {
  assert.ok(raw && Array.isArray(raw.nodes) && raw.nodes.length > 0 && raw.nodes.length <= 100000,'profile-shape-limit');
  assert.ok(Array.isArray(raw.samples)&&Array.isArray(raw.timeDeltas)&&raw.samples.length===raw.timeDeltas.length&&raw.samples.length>0&&raw.samples.length<=20000,'sample-shape-limit');
  assert.ok(finite(raw.startTime)&&finite(raw.endTime)&&raw.endTime>=raw.startTime,'profile-time-shape');
  const ids=new Map();raw.nodes.forEach((node,i)=>{assert.ok(Number.isSafeInteger(node.id)&&!ids.has(node.id),'profile-node-identity');ids.set(node.id,i+1);});
  const nodes=raw.nodes.map((node,i)=>{
    const frame=node.callFrame ?? {};let url='[unclassified-script]',functionName='[unclassified-frame]',lineNumber=-1,columnNumber=-1;
    if(assetURLs.has(frame.url)) {
      url=assetURLs.get(frame.url);assert.match(url,/^[A-Za-z0-9_-]+\.js$/u);
      functionName=safeFunction(frame.functionName)?frame.functionName:'[anonymous-asset-function]';
      if(Number.isSafeInteger(frame.lineNumber)&&frame.lineNumber>=-1)lineNumber=frame.lineNumber;
      if(Number.isSafeInteger(frame.columnNumber)&&frame.columnNumber>=-1)columnNumber=frame.columnNumber;
    } else if(!frame.url&&BUILTINS.has(frame.functionName)) {url='[builtin]';functionName=frame.functionName;}
    const children=(node.children ?? []).map(id=>{assert.ok(ids.has(id),'unknown-child');return ids.get(id);});
    assert.equal(new Set(children).size,children.length,'duplicate-child');
    return {id:i+1,callFrame:{functionName,scriptId:'',url,lineNumber,columnNumber},hitCount:0,children};
  });
  const parents=new Map();for(const node of nodes)for(const child of node.children){assert.ok(child!==1&&!parents.has(child),'profile-not-tree');parents.set(child,node.id);}
  assert.equal(parents.size,nodes.length-1,'profile-disconnected');
  const seen=new Set(),queue=[1];while(queue.length){const id=queue.pop();assert.ok(!seen.has(id),'profile-cycle');seen.add(id);queue.push(...nodes[id-1].children);}assert.equal(seen.size,nodes.length,'profile-cycle');
  const samples=raw.samples.map(id=>{assert.ok(ids.has(id),'unknown-sample');const next=ids.get(id);nodes[next-1].hitCount++;return next;});
  const timeDeltas=raw.timeDeltas.map(value=>{assert.ok(finite(value)&&value>=0,'invalid-sample-delta');return value;});
  assert.ok(timeDeltas.reduce((a,b)=>a+b,0)<=raw.endTime-raw.startTime+1000000,'sample-duration-mismatch');
  return {nodes,startTime:raw.startTime,endTime:raw.endTime,samples,timeDeltas};
}
export function profileArtifacts(raw, assetURLs, metadata, limits=LIMITS) {
  // Tests may lower caps; production callers never widen any approved cap.
  for(const key of ['profileBytes','summaryBytes','metadataBytes'])assert.ok(limits[key]>0&&limits[key]<=LIMITS[key]);
  let profile=null,summary={limitation:LIMITATION,profile_status:'unavailable',sample_count:0},status='unavailable';
  if(raw)try {
    profile=sanitizeProfile(raw,assetURLs);
    const elapsed=profile.endTime-profile.startTime;
    if(elapsed>LIMITS.windowMs*1000){status='collection-window-overrun';profile=null;}
    else {
      const counts=new Map();for(let i=0;i<profile.samples.length;i++){const frame=profile.nodes[profile.samples[i]-1].callFrame,key=JSON.stringify(frame);const row=counts.get(key)??{...frame,samples:0,sampled_us:0};row.samples++;row.sampled_us+=profile.timeDeltas[i];counts.set(key,row);}
      summary={limitation:LIMITATION,profile_status:'complete',sample_count:profile.samples.length,elapsed_us:elapsed,top_callsites:[...counts.values()].sort((a,b)=>b.sampled_us-a.sampled_us).slice(0,1000),omitted_callsite_count:Math.max(0,counts.size-1000)};
      status='complete';
    }
  }catch{status='invalid-profile';profile=null;}
  let profileText=profile?encode(profile):null;
  if(profileText&&Buffer.byteLength(profileText)>limits.profileBytes){profileText=null;status='profile-artifact-cap';}
  summary.profile_status=status;
  let summaryText=encode(summary);
  if(Buffer.byteLength(summaryText)>limits.summaryBytes){status='summary-artifact-cap';summaryText=encode({limitation:LIMITATION,profile_status:status,sample_count:summary.sample_count,top_callsites_omitted:true});}
  if(Buffer.byteLength(summaryText)>limits.summaryBytes)summaryText=null;
  // Metadata is constructed by this module, but its cap is still an enforced boundary.
  let metadataText=encode({...metadata,profile_status:status,limitation:LIMITATION,full_acceptance:false,release_acceptance:false});
  if(Buffer.byteLength(metadataText)>limits.metadataBytes)metadataText=encode({profile_status:'metadata-artifact-cap',full_acceptance:false,release_acceptance:false});
  if(Buffer.byteLength(metadataText)>limits.metadataBytes)metadataText=null;
  return {profileText,summaryText,metadataText,status};
}
const realClock={now:()=>performance.now(),set:(fn,ms)=>setTimeout(fn,ms),clear:id=>clearTimeout(id)};
/** Fake-session tested. Only the exact existing sample call can arm one profile. */
export function createProfileController({assetURLs,clock=realClock}={}) {
  assert.ok(assetURLs instanceof Map);let page,context,session,originalEvaluate,originalScreenshot;
  let startTask=null,stopTask=null,windowTimer=null,recording=false,startRequested=false,setupAttempted=false,armedScreenshot=false,finished=false;
  const data={version:1,interval_us:LIMITS.intervalUs,maximum_window_ms:LIMITS.windowMs,trigger_count:0,target_screenshot_count:0,page_count:0,events:[],errors:[],metrics:{},gpu_attribution:'unavailable',native_deadline_unchanged_ms:300000};
  let rawProfile=null;
  const event=(name)=>{if(data.events.length<40)data.events.push({name,host_monotonic_ms:clock.now()});};
  const error=code=>{if(data.errors.length<40&&!data.errors.includes(code))data.errors.push(code);};
  async function bounded(code,action,onLate) {
    let timer,settled=false;
    const actionTask=Promise.resolve().then(action);
    if(onLate)actionTask.then(value=>{if(settled)onLate(value);},()=>{});
    try{return await Promise.race([actionTask,new Promise((_,reject)=>{timer=clock.set(()=>{settled=true;reject(new Error(code));},LIMITS.commandMs);})]);}
    finally{clock.clear(timer);}
  }
  async function send(method,params={}){return bounded('cdp-command-deadline',()=>session.send(method,params));}
  async function metrics(phase){const start=clock.now(),values=numericMetrics(await send('Performance.getMetrics'));data.metrics[phase]={host_start_ms:start,host_end_ms:clock.now(),values};}
  function restoreMethods(){if(!page)return;if(page.evaluate===wrappedEvaluate)page.evaluate=originalEvaluate;if(page.screenshot===wrappedScreenshot)page.screenshot=originalScreenshot;page.off('close',onClose);context.off('close',onClose);}
  async function start() {
    if(startTask)return startTask;
    setupAttempted=true;event('profile-start-request');
    windowTimer=clock.set(()=>{error('window-expired');void stop('window-expired');},LIMITS.windowMs);
    startTask=(async()=>{
      try{
        session=await bounded('cdp-attach-deadline',()=>context.newCDPSession(page),late=>{void bounded('late-detach-deadline',()=>late.detach()).catch(()=>error('late-detach-failed'));});
        await send('Profiler.enable');await send('Profiler.setSamplingInterval',{interval:LIMITS.intervalUs});await send('Performance.enable');
        await metrics('before');
        startRequested=true;await send('Profiler.start');recording=true;event('profile-started');
      }catch{error('profile-setup-failed');}
    })();
    await startTask;
    if(!recording)void stop('setup-failed');
  }
  function stop(reason) {
    if(stopTask)return stopTask;
    event('profile-stop-request');data.stop_reason=reason;armedScreenshot=false;clock.clear(windowTimer);
    // Queue cleanup after any in-flight setup so no late start can escape its stop.
    stopTask=(async()=>{
      if(startTask)await startTask;
      if(session){
        if(startRequested){try{const answer=await send('Profiler.stop');rawProfile=answer.profile;event('profile-stopped');}catch{error('profile-stop-failed');}recording=false;}
        try{await metrics('after');}catch{error('profile-cleanup-failed');}
        for(const method of ['Profiler.disable','Performance.disable'])try{await send(method);}catch{error('profile-cleanup-failed');}
        try{await bounded('cdp-detach-deadline',()=>session.detach());event('session-detached');}catch{error('profile-detach-failed');}
      }
      restoreMethods();
    })();
    return stopTask;
  }
  async function wrappedEvaluate(...args) {
    const matched=args.length===1&&typeof args[0]==='function'&&Function.prototype.toString.call(args[0])===TRIGGER;
    if(!matched)return Reflect.apply(originalEvaluate,this,args);
    data.trigger_count++;
    if(data.trigger_count!==1||finished||stopTask){error('repeated-or-late-trigger');return Reflect.apply(originalEvaluate,this,args);}
    await start();event('sample-call-start');
    try{const answer=await Reflect.apply(originalEvaluate,this,args);event('sample-call-resolved');if(!stopTask){try{await metrics('after_sample');}catch{error('sample-metrics-failed');}if(!stopTask)armedScreenshot=true;}return answer;}
    catch(caught){error('original-sample-rejected');void stop('sample-rejected');throw caught;}
  }
  async function wrappedScreenshot(...args) {
    if(!armedScreenshot)return Reflect.apply(originalScreenshot,this,args);
    armedScreenshot=false;data.target_screenshot_count++;event('target-screenshot-start');
    const valid=args.length===1&&args[0]&&Object.keys(args[0]).length===1&&args[0].fullPage===false;
    if(!valid){error('unexpected-target-screenshot');void stop('unexpected-screenshot');return Reflect.apply(originalScreenshot,this,args);}
    try{if(!stopTask)try{await metrics('before_screenshot');}catch{error('screenshot-metrics-failed');}return await Reflect.apply(originalScreenshot,this,args);}
    catch(caught){error('original-screenshot-rejected');throw caught;}
    finally{event('target-screenshot-settled');void stop('timing-active-screenshot');}
  }
  const onClose=()=>{error('page-or-context-closed');void stop('page-or-context-closed');};
  function onPage(value) {
    data.page_count++;
    if(page||data.page_count!==1){error('second-page-rejected');void stop('second-page');return;}
    page=value;originalEvaluate=page.evaluate;originalScreenshot=page.screenshot;page.evaluate=wrappedEvaluate;page.screenshot=wrappedScreenshot;page.on('close',onClose);
  }
  return {
    attach(value){assert.equal(context,undefined,'One context only');context=value;assert.equal(context.pages().length,0,'Attach before the single scenario page');context.on('page',onPage);context.on('close',onClose);},
    stop,
    async finish(){finished=true;if(!setupAttempted)error('sample-trigger-missing');await stop('driver-finish');context?.off('page',onPage);if(data.trigger_count!==1)error('trigger-count');if(data.target_screenshot_count!==1)error('target-screenshot-count');return {data,rawProfile};},
    snapshot(){return structuredClone(data);},
  };
}
/** Adapts only the diagnostic's call into the original scenario function. */
export function createProfileDiagnostic({output,assetURLs,identity}) {
  assert.deepEqual(Object.keys(identity).sort(),['harness_commit','runtime_commit','runtime_tree']);for(const value of Object.values(identity))assert.match(value,/^[a-f0-9]{40}$/u);
  const controller=createProfileController({assetURLs});let invoked=false,result,finished=false;
  return {
    wrap(originalScenario){return async function(name,options,work){
      assert.equal(invoked,false,'One diagnostic scenario only');invoked=true;assert.equal(name,'46-thirty-cycle-native-resource-handle-plateau');assert.equal(options.budgetMs,300000);
      const before=options.beforeNavigation,after=options.afterScenario;
      return Reflect.apply(originalScenario,this,[name,{...options,
        beforeNavigation:async function(context,current){result=current;if(before)await Reflect.apply(before,this,[context,current]);controller.attach(context);},
        afterScenario:function(...args){void controller.stop('scenario-finalizer');return after?Reflect.apply(after,this,args):undefined;},
      },work]);
    };},
    async finish(){assert.equal(finished,false,'Profile artifacts are one-shot');finished=true;const observed=await controller.finish();
      const metadata={...observed.data,identity,native_outcome:result?.status??'unavailable',native_deadline:result?.resourceCapture?.deadlineObservation?{
        elapsed_ms:result.resourceCapture.deadlineObservation.elapsedMs,completed_cycles:result.resourceCapture.deadlineObservation.completedCycles,
        completed_pairs:result.resourceCapture.deadlineObservation.completedPairs,completed_dom_checkpoints:result.resourceCapture.deadlineObservation.completedDOMCheckpoints}:null};
      const artifacts=profileArtifacts(observed.rawProfile,assetURLs,metadata);
      await mkdir(output,{recursive:false});
      for(const [name,text]of [['renderer-main.cpuprofile',artifacts.profileText],['profile-summary.json',artifacts.summaryText],['profile-metadata.json',artifacts.metadataText]])if(text!==null){validateArtifactBytes(name,text);await writeFile(join(output,name),text,{flag:'wx'});}
      return artifacts.status;
    },
  };
}
/** Last-mile check before any upload of the three optional profiling artifacts. */
export function validateArtifactBytes(name,text) {
  const cap={'renderer-main.cpuprofile':LIMITS.profileBytes,'profile-summary.json':LIMITS.summaryBytes,'profile-metadata.json':LIMITS.metadataBytes}[name];
  assert.ok(cap&&Buffer.byteLength(text)<=cap,'artifact-name-or-size');
  const value=JSON.parse(text),pending=[value];
  while(pending.length){const item=pending.pop();if(typeof item==='string')assert.ok(!/[\\/\r\n]/u.test(item)&&!item.includes('://'),'unsafe-artifact-string');
    else if(item&&typeof item==='object')for(const [key,child]of Object.entries(item)){if(key==='scriptId')assert.equal(child,'','raw-source-id');pending.push(child);}}
  if(name==='renderer-main.cpuprofile')assert.ok(Array.isArray(value.nodes)&&Array.isArray(value.samples));
  else {assert.ok(typeof value.profile_status==='string');if(name==='profile-metadata.json'){assert.equal(value.full_acceptance,false);assert.equal(value.release_acceptance,false);}}
  return value;
}
