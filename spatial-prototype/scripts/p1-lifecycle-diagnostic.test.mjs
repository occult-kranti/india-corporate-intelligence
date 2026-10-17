/** Portable contracts only. No browser/native acceptance is provided here. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm,symlink} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {RUNTIMES,ORDER,SCENARIOS,PHASES,SOURCE_PINS,LIMITATION,generateDiagnosticSources,validateDiagnosticReport,validatePairOrder,inventory,hash} from './p1-lifecycle-diagnostic.mjs';
const roots={control:process.env.SPATIAL_P1_CONTROL_SCRIPTS,candidate:process.env.SPATIAL_P1_CANDIDATE_SCRIPTS};
assert.ok(roots.control&&roots.candidate,'Set both explicit pinned runtime script directories');
const sources={};
for(const variant of ORDER)sources[variant]=Object.fromEntries(await Promise.all(Object.keys(SOURCE_PINS[variant]).map(async name=>[name,await readFile(join(roots[variant],name),'utf8')])));
for(const variant of ORDER)test(`${variant}: exact source pins and complete native/wrapper bodies are conserved`,()=>{
 const input=sources[variant],generated=generateDiagnosticSources(input,variant);
 for(const [name,pin]of Object.entries(SOURCE_PINS[variant]))assert.equal(hash(input[name]),pin);
 assert.equal(generated.conservation.generated_graphics_reverse_transform_sha256,SOURCE_PINS[variant]['case-graphics-browser.mjs']);
 const scenario=text=>text.slice(text.indexOf('async function scenario('),text.indexOf('\ntry {\n  const checkedOutCommit'));
 assert.equal(scenario(generated.main),scenario(input['browser-review.mjs']));
 const native=text=>text.slice(text.indexOf('export function installCaseGraphicsProbe('),text.indexOf('export function selectCaseGraphicsFixtures('));
 assert.equal(native(generated.graphics),native(input['case-graphics-browser.mjs']));
 const callback=text=>text.slice(text.indexOf('  await run(GRAPHICS_SCENARIOS[7]'),text.indexOf('  coverage.scenarios'));
 assert.equal(callback(generated.graphics),callback(input['case-graphics-browser.mjs']));
 assert.equal(generated.conservation.lifecycle_callback_sha256,'4e6974e1426b669749a81838de7db0fbd9df2a820c845ce5588e9375c544d4f1');
 for(const pattern of [/budgetMs: 300000/,/index <= 3/,/index <= 30/,/frames\(120, true\)/,/caseResourceObservationChecks.length, 9/,/const terminal = await fullProbe\(page\)/])assert.match(generated.graphics,pattern);
 assert.match(generated.main,/diagnosticOnly: true/);assert.match(generated.main,/fullAcceptance: false/);
 assert.ok(!generated.main.includes('await scenario("01-overview-and-source-trail"'));
 assert.ok(input['browser-review.mjs'].includes('await scenario("01-overview-and-source-trail"'));
 assert.ok(!generated.main.includes('await runCaseWorkspaceBrowserCases(caseReviewContext)'));
 assert.match(input['case-graphics-browser.mjs'],/if \(args.length === 0\) return 'full'/);
 assert.match(generated.graphics,/return \[GRAPHICS_SCENARIOS\[7\]\];/);
});
test('both generated variants parse without executing a browser',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'p1-pair-syntax-'));
 try{for(const variant of ORDER){const generated=generateDiagnosticSources(sources[variant],variant);for(const key of ['main','graphics']){const path=join(directory,`${variant}-${key}.mjs`);await writeFile(path,generated[key]);execFileSync(process.execPath,['--check',path],{stdio:'pipe'});}}}finally{await rm(directory,{recursive:true,force:true});}
});
test('any pinned input drift or an unknown variant fails before generation',()=>{
 for(const variant of ORDER)for(const name of Object.keys(SOURCE_PINS[variant]))assert.throws(()=>generateDiagnosticSources({...sources[variant],[name]:sources[variant][name]+'\n'},variant));
 assert.throws(()=>generateDiagnosticSources(sources.candidate,'full'));
});
test('local execution is refused before opening a browser or mutating a runtime',()=>{
 assert.throws(()=>execFileSync(process.execPath,[fileURLToPath(new URL('./p1-lifecycle-diagnostic.mjs',import.meta.url)),'candidate'],{encoding:'utf8',env:{...process.env,GITHUB_ACTIONS:'false',SPATIAL_BROWSER_REVIEW:'github-actions'},stdio:'pipe'}),/No local browser is permitted/);
});
function report(variant='candidate'){
 const completion={at:'2026-10-17T18:01:00Z',elapsedMs:200000};
 return {reviewMode:'p1-lifecycle-diagnostic',diagnosticOnly:true,fullAcceptance:false,diagnosticVariant:variant,
  runtimeCommit:RUNTIMES[variant].commit,headCommit:RUNTIMES[variant].commit,harnessCommit:'a'.repeat(40),commit:'a'.repeat(40),
  revision:{checkedOutCommit:RUNTIMES[variant].commit,candidateHead:RUNTIMES[variant].commit,mode:'exact-head'},status:'passed',
  scenarios:[{name:SCENARIOS[0],status:'passed',resourceCapture:{scenario:SCENARIOS[0],status:'preserved',completionObservation:completion,withinBudgetCompletion:completion,
   checkpoints:PHASES.map(phase=>({phase,status:'passed'}))},caseResourceWarmups:[1,2,3].map(cycle=>({cycle})),caseResourceCycles:Array.from({length:30},(_,i)=>({cycle:i+1})),caseResourceObservationChecks:PHASES.map(phase=>({phase,status:'passed'})),caseTiming:{browserAnimationFrameIntervals:{count:119}}}]};
}
for(const variant of ORDER)test(`${variant}: real passed reports remain diagnostic-only`,()=>{
 const result=validateDiagnosticReport(report(variant),variant,0);assert.equal(result.observation,'native-passed');assert.equal(result.full_acceptance,false);assert.equal(result.release_acceptance,false);
});
test('identity, completeness, deadline and process failures cannot become a pass',()=>{
 const mutations=[r=>r.scenarios=[],r=>r.scenarios.push(r.scenarios[0]),r=>r.scenarios[0].status='skipped',r=>r.fullAcceptance=true,r=>r.runtimeCommit=RUNTIMES.control.commit,r=>r.revision.mode='merge',r=>r.harnessCommit='b'.repeat(40),r=>r.setupError='broken',
 r=>r.scenarios[0].caseResourceCycles.pop(),r=>r.scenarios[0].caseResourceCycles.reverse(),r=>r.scenarios[0].caseResourceObservationChecks.reverse(),r=>r.scenarios[0].caseResourceWarmups.pop(),r=>r.scenarios[0].caseResourceObservationChecks.pop(),r=>r.scenarios[0].caseResourceObservationChecks[0].status='failed',r=>r.scenarios[0].caseTiming.browserAnimationFrameIntervals.count=118,
 r=>r.scenarios[0].resourceCapture.status='recording',r=>r.scenarios[0].resourceCapture.checkpoints.pop(),r=>delete r.scenarios[0].resourceCapture.withinBudgetCompletion,r=>r.scenarios[0].resourceCapture.deadlineObservation={elapsedMs:300001}];
 for(const value of [-1,NaN,Infinity,300001])mutations.push(r=>{r.scenarios[0].resourceCapture.withinBudgetCompletion.elapsedMs=value});
 for(const mutate of mutations){const r=report();mutate(r);assert.throws(()=>validateDiagnosticReport(r,'candidate',0));}
 for(const exit of [1,null,-1,256])assert.throws(()=>validateDiagnosticReport(report(),'candidate',exit));
});
function timeout(variant='candidate'){
 const r=report(variant);r.status='failed';r.scenarios[0].status='failed';r.scenarios[0].error='Error: Scenario exceeded its 300000 ms review budget';
 r.setupError='Required p1-lifecycle-diagnostic native graphics scenarios did not all pass with preserved evidence';
 delete r.scenarios[0].resourceCapture.withinBudgetCompletion;delete r.scenarios[0].resourceCapture.completionObservation;
 r.scenarios[0].resourceCapture.deadlineObservation={elapsedMs:300000.5,completedCycles:30,completedPairs:9};return r;
}
for(const variant of ORDER)test(`${variant}: timeout is retained as failed, never accepted or retried`,()=>{
 const r=timeout(variant),result=validateDiagnosticReport(r,variant,1);
 assert.equal(result.observation,'native-deadline-failed');assert.equal(result.raw_process_exit_code,1);assert.equal(result.native_report_status,'failed');assert.equal(result.scenario_status,'failed');assert.equal(result.release_acceptance,false);
 assert.throws(()=>validateDiagnosticReport(r,variant,0));r.scenarios[0].resourceCapture.withinBudgetCompletion={elapsedMs:300001};assert.throws(()=>validateDiagnosticReport(r,variant,1));
});
test('unexpected native assertions remain explicit other failures',()=>{
 const r=timeout();r.scenarios[0].error='AssertionError: leaked handle';delete r.scenarios[0].resourceCapture.deadlineObservation;
 const got=validateDiagnosticReport(r,'candidate',1);assert.equal(got.observation,'other-native-failure');assert.equal(got.scenario_error,'AssertionError: leaked handle');assert.equal(got.release_acceptance,false);
});
function pair(){const identity={harness_commit:'a'.repeat(40),runner_name:'one',hostname:'host',run_id:'123',run_attempt:'1',job:'pair'};return [{...identity,variant:'control',runtime_commit:RUNTIMES.control.commit,finished_at:'2026-10-17T18:00:00Z'},{...identity,variant:'candidate',runtime_commit:RUNTIMES.candidate.commit,started_at:'2026-10-17T18:00:01Z'}];}
test('one worker, one first attempt, control completion before candidate are mandatory',()=>{
 assert.doesNotThrow(()=>validatePairOrder(...pair()));
 for(const key of ['harness_commit','runner_name','hostname','run_id','run_attempt','job','runtime_commit','variant']){const p=pair();p[1][key]='wrong';assert.throws(()=>validatePairOrder(...p));}
 for(const started of ['2026-10-17T17:59:59Z','bad']){const p=pair();p[1].started_at=started;assert.throws(()=>validatePairOrder(...p));}
 const rerun=pair();for(const row of rerun)row.run_attempt='2';assert.throws(()=>validatePairOrder(...rerun));
});
test('build inventories bind every regular served file and refuse implicit symlinks',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'p1-pair-tree-'));
 try{await writeFile(join(directory,'a'),'one');await writeFile(join(directory,'b'),'two');const first=await inventory(directory);assert.equal(first.length,2);await writeFile(join(directory,'b'),'changed');assert.notDeepEqual(await inventory(directory),first);await symlink(join(directory,'a'),join(directory,'link'));await assert.rejects(()=>inventory(directory),/regular files/);}finally{await rm(directory,{recursive:true,force:true});}
});
test('workflow has one sequential pair, isolated branch, immutable runtime refs and complete evidence',async()=>{
 const w=await readFile(new URL('../../.github/workflows/p1-lifecycle-diagnostic.yml',import.meta.url),'utf8');
 assert.match(w,/branches: \[diagnostic\/pr16-p1-lifecycle-pair\]/);assert.doesNotMatch(w,/workflow_dispatch|pull_request:|schedule:|matrix:|continue-on-error|deploy-pages|contents: write/);
 assert.match(w,/contents: read/);assert.match(w,/test "\$GITHUB_RUN_ATTEMPT" = 1/);
 assert.equal((w.match(/persist-credentials: false/g)||[]).length,3);
 for(const variant of ORDER){assert.equal((w.match(new RegExp(`ref: ${RUNTIMES[variant].commit}`,'g'))||[]).length,1);assert.equal((w.match(new RegExp(`run: node scripts/p1-lifecycle-diagnostic.mjs ${variant}`,'g'))||[]).length,1);for(let i=1;i<=8;i++)assert.ok(w.includes(`p1-lifecycle-${variant}-\${{ github.run_id }}-\${{ github.run_attempt }}-part-${String(i).padStart(2,'0')}`));}
 assert.ok(w.indexOf('id: control_run')<w.indexOf('id: candidate_run'));assert.ok(w.indexOf('id: candidate_run')<w.indexOf('id: control_parts'));
 assert.match(w,/if: always\(\) && steps.prepare.outcome == 'success'/);assert.match(w,/if\(!result.both_native_passed\)process.exitCode=1/);
 assert.match(LIMITATION,/cache, ordering, transient load/);assert.match(LIMITATION,/one pair/);
});
