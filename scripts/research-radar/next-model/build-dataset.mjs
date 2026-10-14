import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadInvestigation} from '../../investigation/load.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const root=new URL('../../../',import.meta.url),dir='research/research-radar/next-model/';
const read=p=>JSON.parse(readFileSync(new URL(p,root),'utf8'));
const registry=(await loadInvestigation()).INVESTIGATION_REGISTRY;
const inventory=read(dir+'graph-inventory.json');
const sourceRows=registry.sources.filter(x=>x.namespace!=='legacy').sort((a,b)=>a.id.localeCompare(b.id));
const ids=new Set(sourceRows.map(s=>s.id));
const parents=new Map(sourceRows.map(s=>[s.id,s.id]));
const find=id=>{let p=parents.get(id);while(p!==parents.get(p))p=parents.get(p);return p;};
const union=(a,b)=>{a=find(a);b=find(b);if(a!==b)parents.set(a<b?b:a,a<b?a:b);};
const join=values=>{const list=[...new Set(values)].filter(x=>ids.has(x)).sort();for(const id of list.slice(1))union(list[0],id);};
const canonicalURL=url=>{const u=new URL(url);u.hash='';u.protocol='https:';u.hostname=u.hostname.replace(/^www\./,'');return u.href;};
const byURL=new Map();for(const s of sourceRows){const key=canonicalURL(s.url),list=byURL.get(key)??[];list.push(s.id);byURL.set(key,list);}for(const list of byURL.values())join(list);
const caseRows=registry.records.filter(x=>x.kind==='investigation-case');
for(const c of caseRows)join(c.sourceIds);
// Multi-source relationships are one evidence family for split purposes, not independent corroboration.
for(const e of registry.relationships.filter(x=>x.namespace!=='legacy'))join(e.sourceIds);
// Repeated exact substantive parties across reviewed cases cannot straddle training and development.
const entityMap=new Map(registry.entities.map(e=>[e.id,e]));
const substantive=new Set(['company','firm','person','ngo','trust','foundation','contractor','partnership','consortium','hospital']);
const entityCases=new Map();
for(const c of caseRows)for(const id of c.entityIds){const e=entityMap.get(id);if(!e||!substantive.has(e.type))continue;const list=entityCases.get(id)??[];list.push(...c.sourceIds);entityCases.set(id,list);}
for(const list of entityCases.values())join(list);
for(const e of registry.relationships.filter(x=>x.kind==='identity-crosswalk'))join([...(entityCases.get(e.from)??[]),...(entityCases.get(e.to)??[])]);
const groups=new Map();for(const s of sourceRows){const key=find(s.id),list=groups.get(key)??[];list.push(s.id);groups.set(key,list);}
const testReserved=new Set(inventory.holdoutReservation.union.excludeSourceIds);
const devSeeds=new Set(sourceRows.filter(x=>['water','education'].includes(x.namespace)).map(x=>x.id));
const sourceGroups=[];for(const [key,members]of [...groups].sort((a,b)=>a[0].localeCompare(b[0]))){const split=members.some(x=>testReserved.has(x))?'test':members.some(x=>devSeeds.has(x))?'dev':'train';sourceGroups.push({id:'source-family:'+sha(members.join('\n')).slice(0,16),split,sourceIds:members,groupingBasis:'Exact URL, reviewed case, shared exact substantive entity and explicit identity crosswalk; common government/lender hubs are not grouping keys.'});}
const membership=new Map(sourceGroups.flatMap(g=>g.sourceIds.map(id=>[id,g])));
const documents=sourceRows.map(s=>({id:s.id,sourceId:s.id,title:s.title,text:`${s.title}\nPublisher: ${s.publisher}\n${s.summary}\nLocator: ${s.locator}\nLimitations: ${s.limitations.join(' ')}`,url:s.url,canonicalURL:canonicalURL(s.url),sourceLineageId:'original-url:'+sha(canonicalURL(s.url)).slice(0,16),caseIds:caseRows.filter(c=>c.sourceIds.includes(s.id)).map(c=>c.id),split:membership.get(s.id).split,groupId:membership.get(s.id).id,family:membership.get(s.id).id,namespace:s.namespace,tier:s.tier,publishedAt:s.publishedAt,retrievedAt:s.retrievedAt,summary:s.summary,locator:s.locator,limitations:s.limitations}));
const labelsPath=dir+'train-dev-labels.json';
const labels=existsSync(new URL(labelsPath,root))?read(labelsPath):{queries:[]};
const documentMap=new Map(documents.map(d=>[d.id,d]));
const queries=labels.queries.map(q=>({...q,split:documentMap.get(q.positiveIds[0])?.split,groupId:documentMap.get(q.positiveIds[0])?.groupId,caseId:q.caseId??documentMap.get(q.positiveIds[0])?.caseIds[0]??documentMap.get(q.positiveIds[0])?.groupId}));
const errors=[];const queryIds=new Set();
for(const q of queries){if(queryIds.has(q.id))errors.push(`${q.id}: duplicate`);queryIds.add(q.id);if(q.split==='test')errors.push(`${q.id}: heldout positive`);for(const id of [...q.positiveIds,...q.hardNegativeIds]){if(!documentMap.has(id))errors.push(`${q.id}: missing ${id}`);else if(documentMap.get(id).split!==q.split)errors.push(`${q.id}: cross-split ${id}`);}for(const id of q.requiredCounterevidenceIds??[])if(!q.positiveIds.includes(id))errors.push(`${q.id}: required counterevidence is not positive`);for(const id of q.hardNegativeIds)if(q.positiveIds.includes(id)||q.positiveIds.some(p=>documentMap.get(p)?.canonicalURL===documentMap.get(id)?.canonicalURL))errors.push(`${q.id}: positive/negative original-source overlap`);}
if(errors.length)throw new Error(errors.join('\n'));
const data={schemaVersion:2,task:'source-summary-retrieval-with-exact-graph-context',researchCutoff:'2026-10-08',labelMeaning:'AI-authored source relevance, never guilt, truth of an allegation, personal propensity or probability. A negative is query-specific relevance, not a factual denial.',inputKind:'435 retained nonlegacy source summaries with locators and limitations. Full documents and case answers are not embedded.',inputHashes:[{path:dir+'graph-inventory.json',sha256:sha(readFileSync(new URL(dir+'graph-inventory.json',root)))},...(labels.queries.length?[{path:labelsPath,sha256:sha(readFileSync(new URL(labelsPath,root)))}]:[])],registrySourceDigest:sha(JSON.stringify(sourceRows)),splitPolicy:{unit:'exact original-source family, reviewed case, repeated substantive party and reserved independent-test neighborhoods',testSourceIds:documents.filter(d=>d.split==='test').map(d=>d.id),trainSourceIds:documents.filter(d=>d.split==='train').map(d=>d.id),devSourceIds:documents.filter(d=>d.split==='dev').map(d=>d.id),testLabelsConsumed:false,developmentSeed:'All education/water sources and connected evidence families; selected before training to test domain/source-family generalization.',scope:'Split isolation uses available exact identities, source URLs and reviewed cases. Unknown external duplicates or hidden ownership are not claimed resolved.'},limitations:['Authored source summaries, not full PDFs or public-bank ledgers.','Legacy citation-only rows excluded from this supervised corpus but retained in the evidence graph.','Test source documents may be indexed for final retrieval evaluation, but never used for gradients, negatives, checkpoint selection or dev scoring.','Development is a deliberately held-out service domain; it is not representative of all Indian institutions.','This is a source/entity holdout, not a historical forecast backtest. Publication dates do not establish pre-outcome availability.','A long source packet can exceed encoder limits; encoder reports must disclose truncation.'],splitGroups:sourceGroups,documents,queries};
const target=new URL(dir+'dataset.json',root),serialized=JSON.stringify(data,null,2)+'\n';
if(process.argv.includes('--verify')){if(!existsSync(target)||readFileSync(target,'utf8')!==serialized)throw new Error('next-model dataset stale');}else writeFileSync(target,serialized);
console.log(JSON.stringify({documents:documents.length,splits:Object.fromEntries(['train','dev','test'].map(s=>[s,documents.filter(x=>x.split===s).length])),groups:sourceGroups.length,queries:queries.length,querySplits:Object.fromEntries(['train','dev'].map(s=>[s,queries.filter(x=>x.split===s).length]))},null,2));
