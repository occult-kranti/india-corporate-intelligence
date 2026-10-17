import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {STATUSES,GROUPS,GROUP_LABELS,statusGroup,groupCounts,validateSnapshot,safeURL,selectTasks,counts,freshness} from '../../public/research-activity/model.mjs';
const source=JSON.parse(await readFile(new URL('../../public/research-activity/snapshots/2026-10-16T112700Z.json',import.meta.url),'utf8'));
const mutate=fn=>{const value=structuredClone(source);fn(value);return value;};
const rejects=fn=>assert.equal(validateSnapshot(mutate(fn)).valid,false);
test('dated snapshot distinguishes three live releases from pending workspace review',()=>{
 assert.deepEqual(validateSnapshot(source),{valid:true,errors:[]});
 assert.equal(source.tasks.find(t=>t.id==='base-release').status,'completed');
 assert.equal(source.tasks.find(t=>t.id==='historical-tutorial').status,'completed');
 assert.deepEqual(counts(source.tasks),{planned:1,running:0,'review-pending':4,blocked:1,completed:3});
});
test('all status lanes filter without mutating source',()=>{
 for(const status of STATUSES)assert.equal(selectTasks(source.tasks,{status}).length,counts(source.tasks)[status]);
 assert.equal(selectTasks(source.tasks).length,9);
});
test('search is case-insensitive and spans question, role, action and evidence',()=>{
 for(const query of ['PR11','  pr11  ','Release verification','published reader'])assert.ok(selectTasks(source.tasks,{query}).some(t=>t.id==='historical-tutorial'));
 assert.equal(selectTasks(source.tasks,{status:'completed',query:'PR11'}).length,1);
 assert.equal(selectTasks(source.tasks,{query:'no such task exists'}).length,0);
});
test('unknown statuses and duplicate IDs rejected',()=>{rejects(d=>d.tasks[0].status='done');rejects(d=>d.tasks[1].id=d.tasks[0].id);});
test('completion without reviewed evidence is rejected',()=>{
 rejects(d=>delete d.tasks[0].completion);rejects(d=>d.tasks[2].status='completed');
 rejects(d=>d.tasks[0].completion.evidenceIndex=99);rejects(d=>d.tasks[0].completion.evidenceIndex=1);
 rejects(d=>d.tasks[0].completion.note='');rejects(d=>delete d.tasks[0].evidence[0].url);
 rejects(d=>d.tasks[0].completion.verifiedAt=new Date(Date.parse(d.tasks[0].lastChecked)+1000).toISOString().replace('.000',''));
 rejects(d=>d.tasks[2].completion=d.tasks[0].completion);
});
test('private project links and extra fields rejected at every level',()=>{
 rejects(d=>d.privateNotes='secret');rejects(d=>d.tasks[0].privateProjectLink='https://chatgpt.com/c/private');
 rejects(d=>d.tasks[0].hiddenReasoning='private');rejects(d=>d.tasks[0].evidence[0].excerpt='unreviewed');
 rejects(d=>d.milestones[0].internalUrl='https://chatgpt.com/c/private');
});
test('URL allowlist rejects dangerous, private, credentialed, misleading and tracking URLs',()=>{
 for(const url of ['javascript:alert(1)','data:text/html,x','//github.com/x','https://chatgpt.com/c/private','https://github.com.evil.test/occult-kranti/india-corporate-intelligence/pull/9','https://user:pass@github.com/occult-kranti/india-corporate-intelligence/pull/9','https://github.com/occult-kranti/india-corporate-intelligence/pull/9?token=secret','https://github.com/occult-kranti/india-corporate-intelligence/pull/9#private','http://github.com/occult-kranti/india-corporate-intelligence/pull/9','https://127.0.0.1/','https://github.com/occult-kranti/india-corporate-intelligence/pull/9\n','https://github.com/occult-kranti/india-corporate-intelligence/pull/9\r\n','https://github.com/occult-kranti/india-corporate-intelligence/pull/09','https://github.com/occult-kranti/india-corporate-intelligence/pull/9/','https://github.com/occult-kranti/india-corporate-intelligence/pull/9０','https://github.com/another/repository/pull/9','https://occult-kranti.github.io/india-corporate-intelligence/spatial/']) {
  assert.equal(safeURL(url),false,url);rejects(d=>d.tasks[0].evidence[0].url=url);
 }
 assert.equal(safeURL(source.tasks[0].evidence[0].url),true);
});
test('HTML payloads, URLs in text and invalid shapes are rejected',()=>{
 rejects(d=>d.tasks[0].title='<img src=x onerror=alert(1)>');rejects(d=>d.tasks[0].summary='https://chatgpt.com/c/private');
 rejects(d=>d.tasks[0]=null);rejects(d=>d.tasks[0].evidence=[null]);rejects(d=>d.tasks=[]);rejects(d=>d.tasks[0].title=' '.repeat(3));
 for(const input of [null,[],42,'bad'])assert.equal(validateSnapshot(input).valid,false);
});
test('timestamps, temporal order and milestone references validated',()=>{
 rejects(d=>d.asOf='tomorrow');rejects(d=>d.asOf='2026-02-30T03:31:25Z');
 rejects(d=>d.tasks[0].lastChecked='2027-10-16T03:22:00Z');rejects(d=>d.milestones[0].taskId='missing');
 rejects(d=>d.freshnessHours=0);
});
test('freshness has recent, stale and device-clock warning states',()=>{
 const asOf=Date.parse(source.asOf);
 assert.equal(freshness(source,asOf),'snapshot');assert.equal(freshness(source,asOf+24*3600000),'snapshot');
 assert.equal(freshness(source,asOf+24*3600000+1),'stale');assert.equal(freshness(source,asOf-1),'future');
});
test('UI avoids HTML injection sinks, remote dependencies and disabled private slots',async()=>{
 const app=await readFile(new URL('../../public/research-activity/app.mjs',import.meta.url),'utf8');
 const html=await readFile(new URL('../../public/research-activity/index.html',import.meta.url),'utf8');
 assert.doesNotMatch(app,/innerHTML|outerHTML|insertAdjacentHTML|eval\(|document\.write/);
 assert.doesNotMatch(html,/(?:src|href)="https?:/);
 assert.match(html,/Content-Security-Policy/);assert.match(app,/textContent/);
 assert.match(app,/safeURL\(evidence.url\)/);assert.match(html,/aria-live="polite"/);
});

test('four simple display groups preserve internal review and hold states',()=>{
 assert.deepEqual(GROUPS,['completed','working','planned','blocked']);
 assert.deepEqual(GROUPS.map(group=>GROUP_LABELS[group]),['Done','Working on','Next','Blocked']);
 assert.deepEqual(groupCounts(source.tasks),{completed:3,working:4,planned:1,blocked:1});
 assert.deepEqual(selectTasks(source.tasks,{status:'working'}).map(task=>task.id),['research-methods','repository-audit','cross-border-finance','public-program-records']);
 assert.equal(statusGroup('running'),'working');
 assert.equal(statusGroup('review-pending'),'working');
 assert.equal(statusGroup('blocked'),'blocked');
 assert.equal(groupCounts([{status:'running'},{status:'review-pending'}]).working,2);
});
test('release checkpoint distinguishes live corrections from pending selected-case browser gates',()=>{
 assert.equal(source.asOf,'2026-10-16T11:27:00Z');
 assert.match(source.checkpointTitle,/16 October 2026, 11:27 UTC/);
 assert.equal(source.tasks.length,9);
 assert.equal(source.milestones.length,4);
 assert.equal(source.tasks.filter(task=>task.status==='running').length,0);
 const release=source.tasks.find(task=>task.id==='base-release');
 assert.match(release.summary,/6e4d6512/);
 assert.match(release.summary,/deployed and live/);
 assert.equal(release.evidence[release.completion.evidenceIndex].url,'https://github.com/occult-kranti/india-corporate-intelligence/pull/9');
 const next=source.tasks.find(task=>task.id==='historical-tutorial');
 assert.match(next.summary,/PR11 merged at 81b0e3b9/);
 assert.match(next.summary,/all three exact-head CI gates and assistant screenshot review/);
 assert.match(next.summary,/deployment and published reader, guide, activity and navigation were verified/);
 assert.equal(next.completion.verifiedAt,'2026-10-16T07:03:10Z');
 const readers=source.tasks.find(task=>task.id==='source-reviews');
 assert.equal(readers.status,'completed');
 assert.equal(readers.lastChecked,source.asOf);
 assert.match(readers.summary,/reader-only publication approval/);
 assert.match(readers.summary,/PR13 merged at a4f6a04b and its source-correction release is live/);
 assert.match(readers.summary,/six routes, fourteen assets, five activity files, twenty-nine lazy bundles and all 96 raw registry chunks/);
 assert.match(readers.summary,/Live no-WebGL source-hold and navigation checks passed at 11:27 UTC/);
 assert.doesNotMatch(readers.summary,/PR13 is a draft|under exact-head review/);
 assert.equal(readers.evidence[readers.completion.evidenceIndex].url,'https://github.com/occult-kranti/india-corporate-intelligence/pull/13');
 assert.equal(readers.completion.verifiedAt,source.asOf);
 assert.match(readers.completion.note,/Pages run 38893115494 succeeded/);
 assert.match(readers.summary,/Raw baseline bytes and all research graph\/path holds remain intact/);
 const profiles=source.tasks.find(task=>task.id==='cross-border-finance');
 assert.equal(profiles.status,'review-pending');
 assert.equal(profiles.lastChecked,source.asOf);
 assert.equal(profiles.summary,'21 selected billionaire and public-office case packets have scoped source reviews and verified dedicated case chats. The separate 19-case, 72-core-claim reader and non-geographic scene is under browser review. Huang and Tencent remain outside this UI cohort. Eighteen dated wealth observations remain a follow-on feature. This is selected-case coverage, not complete worldwide mapping.');
 assert.match(profiles.nextAction,/actual browser and visual gates/);
 assert.match(profiles.nextAction,/Source, build and portable tests have passed; no pull request exists yet/);
 assert.equal(profiles.evidence.some(item=>item.url!==undefined),false);
 assert.equal(profiles.completion,undefined);
});
test('unchanged task dates retain their earlier verification provenance',()=>{
 const expected={
  'base-release':'2026-10-16T03:44:12Z',
  'historical-tutorial':'2026-10-16T09:12:40Z',
  'original-guides':'2026-10-16T03:22:00Z',
  federation:'2026-10-16T03:22:00Z',
  'research-methods':'2026-10-16T03:44:12Z',
  'repository-audit':'2026-10-16T03:44:12Z',
  'public-program-records':'2026-10-16T03:49:31Z',
 };
 for(const [id,date] of Object.entries(expected))assert.equal(source.tasks.find(task=>task.id===id).lastChecked,date,id);
 assert.equal(source.tasks.find(task=>task.id==='base-release').completion.verifiedAt,'2026-10-16T03:22:00Z');
});
test('public snapshot contains no private paths, chat links or claimed live monitoring',()=>{
 assert.match(source.scope,/snapshot, not live worker telemetry/);
 assert.equal(source.tasks.every(task=>task.privateProjectLink===null),true);
 assert.doesNotMatch(JSON.stringify(source),/chatgpt\.com|codex:\/\/|\/workspace\/|\/home\/|\/tmp\/|local-integration\//);
 const profiles=source.tasks.find(task=>task.id==='cross-border-finance');
 assert.match(profiles.evidence[1].title,/actual browser gates await draft review/);
});
test('standalone shell keeps local modules, local fetch policy and relative return navigation',async()=>{
 const html=await readFile(new URL('../../public/research-activity/index.html',import.meta.url),'utf8');
 assert.match(html,/<nav class="back-nav" aria-label="Other workspaces">/);
 assert.match(html,/<a class="rail-link" href="\.\.\/spatial\/">Evidence atlas/);
 assert.match(html,/<a class="rail-link" href="\.\.\/#\/investigate">Original workbench/);
 assert.match(html,/<script type="module" src="app.mjs"><\/script>/);
 assert.match(html,/script-src 'self'/);assert.match(html,/connect-src 'self'/);
 assert.match(html,/object-src 'none'/);assert.match(html,/base-uri 'none'/);
 assert.doesNotMatch(html,/unsafe-inline|unsafe-eval/);
});

test('source review qualification is bounded and cannot imply completion',()=>{
 for(const id of ['public-program-records']){
  const task=source.tasks.find(task=>task.id===id);
  assert.equal(task.status,'review-pending');assert.equal(task.reviewStage,'source-review');
  assert.equal(task.completion,undefined);assert.equal(task.privateProjectLink,null);
 }
 rejects(data=>data.tasks[0].reviewStage='source-review');
 rejects(data=>data.tasks.find(task=>task.id==='cross-border-finance').reviewStage='approved');
 rejects(data=>data.tasks.find(task=>task.id==='public-program-records').status='running');
});
