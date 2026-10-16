import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {STATUSES,GROUPS,GROUP_LABELS,statusGroup,groupCounts,validateSnapshot,safeURL,selectTasks,counts,freshness} from '../../public/research-activity/model.mjs';
const source=JSON.parse(await readFile(new URL('../../public/research-activity/snapshot.json',import.meta.url),'utf8'));
const mutate=fn=>{const value=structuredClone(source);fn(value);return value;};
const rejects=fn=>assert.equal(validateSnapshot(mutate(fn)).valid,false);
test('seed snapshot is valid and accurately separates PR9 and PR10',()=>{
 assert.deepEqual(validateSnapshot(source),{valid:true,errors:[]});
 assert.equal(source.tasks.find(t=>t.id==='base-release').status,'completed');
 assert.equal(source.tasks.find(t=>t.id==='historical-tutorial').status,'review-pending');
 assert.deepEqual(counts(source.tasks),{planned:1,running:0,'review-pending':5,blocked:2,completed:1});
});
test('all status lanes filter without mutating source',()=>{
 for(const status of STATUSES)assert.equal(selectTasks(source.tasks,{status}).length,counts(source.tasks)[status]);
 assert.equal(selectTasks(source.tasks).length,9);
});
test('search is case-insensitive and spans question, role, action and evidence',()=>{
 for(const query of ['PR10','  pr10  ','Implementation review','rendered scope'])assert.ok(selectTasks(source.tasks,{query}).some(t=>t.id==='historical-tutorial'));
 assert.equal(selectTasks(source.tasks,{status:'completed',query:'PR10'}).length,0);
 assert.equal(selectTasks(source.tasks,{query:'no such task exists'}).length,0);
});
test('unknown statuses and duplicate IDs rejected',()=>{rejects(d=>d.tasks[0].status='done');rejects(d=>d.tasks[1].id=d.tasks[0].id);});
test('completion without reviewed evidence is rejected',()=>{
 rejects(d=>delete d.tasks[0].completion);rejects(d=>d.tasks[1].status='completed');
 rejects(d=>d.tasks[0].completion.evidenceIndex=99);rejects(d=>d.tasks[0].completion.evidenceIndex=1);
 rejects(d=>d.tasks[0].completion.note='');rejects(d=>delete d.tasks[0].evidence[0].url);
 rejects(d=>d.tasks[0].completion.verifiedAt=new Date(Date.parse(d.tasks[0].lastChecked)+1000).toISOString().replace('.000',''));
 rejects(d=>d.tasks[1].completion=d.tasks[0].completion);
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
 assert.deepEqual(groupCounts(source.tasks),{completed:1,working:5,planned:1,blocked:2});
 assert.deepEqual(selectTasks(source.tasks,{status:'working'}).map(task=>task.id),['historical-tutorial','research-methods','repository-audit','cross-border-finance','public-program-records']);
 assert.equal(statusGroup('running'),'working');
 assert.equal(statusGroup('review-pending'),'working');
 assert.equal(statusGroup('blocked'),'blocked');
 assert.equal(groupCounts([{status:'running'},{status:'review-pending'}]).working,2);
});
test('review checkpoint remains dated, candidate-only and non-live',()=>{
 assert.equal(source.asOf,'2026-10-16T03:49:31Z');
 assert.equal(source.tasks.length,9);
 assert.equal(source.tasks.filter(task=>task.status==='running').length,0);
 const release=source.tasks.find(task=>task.id==='base-release');
 assert.match(release.summary,/6e4d6512/);
 assert.match(release.summary,/deployed and live/);
 assert.equal(release.evidence[release.completion.evidenceIndex].url,'https://github.com/occult-kranti/india-corporate-intelligence/pull/9');
 const next=source.tasks.find(task=>task.id==='historical-tutorial');
 assert.match(next.summary,/0b4af3a1/);assert.match(next.summary,/174 static tests/);
 assert.match(next.summary,/22 spatial browser cases and four combined browser cases/);
 assert.match(next.summary,/CI was still in progress/);
 assert.equal(next.completion,undefined);
 assert.match(source.tasks.find(task=>task.id==='source-reviews').summary,/reviewed candidates awaiting independent and publication review/);
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
 for(const id of ['cross-border-finance','public-program-records']){
  const task=source.tasks.find(task=>task.id===id);
  assert.equal(task.status,'review-pending');assert.equal(task.reviewStage,'source-review');
  assert.equal(task.completion,undefined);assert.equal(task.privateProjectLink,null);
 }
 rejects(data=>data.tasks[0].reviewStage='source-review');
 rejects(data=>data.tasks.find(task=>task.id==='cross-border-finance').reviewStage='approved');
 rejects(data=>data.tasks.find(task=>task.id==='public-program-records').status='running');
});
