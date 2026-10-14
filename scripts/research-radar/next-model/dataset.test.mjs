import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {loadInvestigation} from '../../investigation/load.mjs';
const root=new URL('../../../',import.meta.url),dir='research/research-radar/next-model/';
const json=p=>JSON.parse(readFileSync(new URL(p,root),'utf8'));
const dataset=json(dir+'dataset.json'),inventory=json(dir+'graph-inventory.json'),labels=json(dir+'train-dev-labels.json');
const registry=(await loadInvestigation()).INVESTIGATION_REGISTRY;
const sources=new Map(registry.sources.map(s=>[s.id,s])),docs=new Map(dataset.documents.map(d=>[d.id,d]));
const hash=x=>createHash('sha256').update(x).digest('hex');

test('every encoder document is an exact source-only projection; no case answer or query is appended',()=>{
 assert.equal(dataset.documents.length,435);assert.equal(docs.size,435);
 for(const d of dataset.documents){const s=sources.get(d.id);assert.ok(s);assert.notEqual(s.namespace,'legacy');assert.equal(d.sourceId,s.id);assert.equal(d.text,`${s.title}\nPublisher: ${s.publisher}\n${s.summary}\nLocator: ${s.locator}\nLimitations: ${s.limitations.join(' ')}`);assert.equal(d.publishedAt,s.publishedAt);assert.equal(d.retrievedAt,s.retrievedAt);assert.deepEqual(d.limitations,s.limitations);}
 assert.equal(dataset.splitPolicy.testLabelsConsumed,false);
});

test('case/entity split groups and original-source lineage are separate; same URL never crosses splits',()=>{
 const urls=new Map();for(const d of dataset.documents){const u=new URL(d.url);u.hash='';u.protocol='https:';u.hostname=u.hostname.replace(/^www\./,'');assert.equal(d.canonicalURL,u.href);assert.equal(d.sourceLineageId,'original-url:'+hash(u.href).slice(0,16));assert.ok(d.groupId.startsWith('source-family:'));const peers=urls.get(u.href)??[];peers.push(d);urls.set(u.href,peers);}
 for(const peers of urls.values()){assert.equal(new Set(peers.map(d=>d.split)).size,1);assert.equal(new Set(peers.map(d=>d.sourceLineageId)).size,1);}
 for(const g of dataset.splitGroups){for(const id of g.sourceIds){assert.equal(docs.get(id)?.groupId,g.id);assert.equal(docs.get(id)?.split,g.split);}}
 assert.ok(dataset.splitGroups.some(g=>new Set(g.sourceIds.map(id=>docs.get(id).sourceLineageId)).size>1),'broad case groups must not masquerade as one original source');
});

test('independently reserved source neighborhoods never enter training positives, negatives or development',()=>{
 const reserved=new Set(inventory.holdoutReservation.union.excludeSourceIds);
 for(const id of reserved)if(docs.has(id))assert.equal(docs.get(id).split,'test',id);
 const counts=Object.fromEntries(['train','dev','test'].map(s=>[s,dataset.documents.filter(d=>d.split===s).length]));assert.deepEqual(counts,{train:305,dev:98,test:32});
 for(const q of dataset.queries){assert.ok(['train','dev'].includes(q.split));for(const id of [...q.positiveIds,...q.hardNegativeIds]){assert.equal(docs.get(id)?.split,q.split,`${q.id}: ${id}`);assert.ok(!reserved.has(id));}}
});

test('authored queries have explicit stage or evidence scope and no same-original hard negative',()=>{
 assert.equal(dataset.queries.length,164);assert.equal(new Set(dataset.queries.map(q=>q.id)).size,164);
 assert.equal(dataset.queries.filter(q=>q.split==='train').length,129);assert.equal(dataset.queries.filter(q=>q.split==='dev').length,35);
 for(const q of dataset.queries){assert.ok(q.text.trim().length>40);assert.ok(q.intent);assert.ok(q.rationale);assert.ok(q.positiveIds.length);assert.ok(q.hardNegativeIds.length);const purls=new Set(q.positiveIds.map(id=>docs.get(id).canonicalURL));for(const id of q.hardNegativeIds){assert.ok(!q.positiveIds.includes(id));assert.ok(!purls.has(docs.get(id).canonicalURL));}const basis=docs.get(q.authoringBasis.sourceId);assert.equal(q.authoringBasis.sourceSummary,basis.summary);assert.ok(q.positiveIds.includes(basis.id));assert.equal(q.authoringBasis.contrastSummary,docs.get(q.hardNegativeIds[0]).summary);}
});

test('response and disconfirmation subset is explicit and remains positive relevance, not truth labeling',()=>{
 const coverage={train:0,dev:0};for(const q of dataset.queries){assert.ok(Array.isArray(q.requiredCounterevidenceIds));for(const id of q.requiredCounterevidenceIds){assert.ok(q.positiveIds.includes(id));assert.equal(docs.get(id).split,q.split);}if(q.requiredCounterevidenceIds.length){coverage[q.split]++;assert.ok(q.counterevidenceRole);}}
 assert.deepEqual(coverage,{train:17,dev:5});assert.match(labels.counterevidenceDefinition,/not an assertion the response is true/);assert.match(dataset.labelMeaning,/never guilt/);
});

test('lineage hashes and deterministic builder bind the frozen source projection and authored labels',()=>{
 for(const row of dataset.inputHashes)assert.equal(hash(readFileSync(new URL(row.path,root))),row.sha256,row.path);
 assert.equal(dataset.registrySourceDigest,hash(JSON.stringify(registry.sources.filter(s=>s.namespace!=='legacy').sort((a,b)=>a.id.localeCompare(b.id)))));
 const out=execFileSync(process.execPath,[new URL('build-dataset.mjs',import.meta.url).pathname,'--verify'],{cwd:root,encoding:'utf8'});assert.match(out,/"documents": 435/);
});

test('unknown dates remain unknown and no historical forecasting validation is implied',()=>{
 assert.equal(dataset.documents.filter(d=>!d.publishedAt).length,113);assert.equal(dataset.documents.filter(d=>!d.retrievedAt).length,1);
 assert.ok(dataset.limitations.some(s=>/not a historical forecast backtest/.test(s)));assert.ok(dataset.limitations.some(s=>/not full PDFs/.test(s)));assert.ok(dataset.limitations.some(s=>/never used for gradients/.test(s)));
});
