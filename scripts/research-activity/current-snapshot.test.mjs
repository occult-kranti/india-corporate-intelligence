import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validateSnapshot,counts,selectTasks,freshness} from '../../public/research-activity/model.mjs';
const current=JSON.parse(await readFile(new URL('../../public/research-activity/snapshot.json',import.meta.url),'utf8'));
const archiveBytes=await readFile(new URL('../../public/research-activity/snapshots/2026-10-16T112700Z.json',import.meta.url));
const historical=JSON.parse(archiveBytes);
const task=id=>current.tasks.find(t=>t.id===id);
test('current and exact archived checkpoints separately validate',()=>{
 assert.deepEqual(validateSnapshot(current),{valid:true,errors:[]});
 assert.deepEqual(validateSnapshot(historical),{valid:true,errors:[]});
 assert.equal(createHash('sha256').update(archiveBytes).digest('hex'),'0b829cbdc70ed0a48e5fa1fa2bec4f05a0e895e6852f3de5213454f5201e1a01');
 assert.equal(historical.asOf,'2026-10-16T11:27:00Z');
 assert.equal(current.asOf,'2026-10-17T06:55:00Z');
});
test('four current states do not promote pending publication or email coverage',()=>{
 assert.deepEqual(current.tasks.map(t=>[t.id,t.status]),[['zoom-release','completed'],['epstein-world-board','review-pending'],['epstein-publication','blocked'],['epstein-email-coverage','blocked']]);
 assert.deepEqual(counts(current.tasks),{planned:0,running:0,'review-pending':1,blocked:2,completed:1});
 assert.equal(current.milestones.length,3);
 for(const t of current.tasks.filter(t=>t.status!=='completed'))assert.equal(t.completion,undefined);
 assert.match(task('epstein-publication').summary,/Publication approval is pending/);
 assert.match(task('epstein-email-coverage').summary,/zero email records have been acquired through that route/);
 assert.match(task('epstein-email-coverage').summary,/procedural timeline is not email coverage/);
});
test('release claim carries exact completion date and bounded observation limits',()=>{
 const t=task('zoom-release');
 assert.equal(t.evidence[t.completion.evidenceIndex].url,'https://github.com/occult-kranti/india-corporate-intelligence/pull/15');
 assert.equal(t.completion.verifiedAt,'2026-10-17T06:45:49Z');
 assert.equal(t.lastChecked,t.completion.verifiedAt);
 assert.match(t.summary,/All 141 published spatial files/);
 assert.match(t.summary,/zoom 5.9 and 8/);
 assert.match(t.summary,/do not establish every edge or zoom level/);
 assert.match(t.completion.note,/full raw archive was not independently re-downloaded/);
});
test('branch and local review statements retain the browser and deployment boundary',()=>{
 const t=task('epstein-world-board');
 assert.match(t.summary,/feature\/epstein-world-map branch was created/);
 assert.match(t.summary,/local world-board interface and controller passed scoped source-conservation and portable reviews/);
 assert.match(t.summary,/Actual browser behavior, rendering and accessibility still require review/);
 assert.match(t.summary,/No world-board deployment is claimed/);
 assert.equal(t.lastChecked,'2026-10-17T06:18:12Z');
});
test('snapshot retains stale warning and contains only public-safe status text',()=>{
 const text=JSON.stringify(current);
 assert.match(current.scope,/dated editorial snapshot, not live worker telemetry/);
 assert.equal(current.tasks.every(t=>t.privateProjectLink===null),true);
 assert.doesNotMatch(text,/chatgpt\.com|codex:\/\/|\/workspace\/|\/home\/|\/tmp\/|Sentinel_|quarantine|HOUSE_OVERSIGHT|email body|victim address/i);
 assert.equal(freshness(current,Date.parse(current.asOf)+24*3600000+1),'stale');
 assert.equal(selectTasks(current.tasks,{query:'JMAIL'}).length,1);
});
test('all noncompletion states reject a fabricated completion grant',()=>{
 for(const id of ['epstein-world-board','epstein-publication','epstein-email-coverage']){
  const value=structuredClone(current);value.tasks.find(t=>t.id===id).completion=structuredClone(task('zoom-release').completion);
  assert.equal(validateSnapshot(value).valid,false,id);
 }
});
