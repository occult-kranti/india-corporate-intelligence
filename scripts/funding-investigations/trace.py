#!/usr/bin/env python3
"""Read-only exact-edge navigation and lexical acquisition search across the full registry."""
from __future__ import annotations
import argparse
from collections import Counter, defaultdict, deque
import hashlib
import json
import math
from pathlib import Path
import re
import subprocess
import sys
import importlib.util

ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('funding_validate',Path(__file__).with_name('validate.py'));validator=importlib.util.module_from_spec(spec);spec.loader.exec_module(validator)
CONTEXT={'identity-crosswalk','context','comparison','response','contra','analytic','analytic-review','budget-context','procurement-context','funding-context'}

def digest(v):return hashlib.sha256(json.dumps(v,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
def load_registry():
    program="import {loadInvestigation} from './scripts/investigation/load.mjs';console.log(JSON.stringify((await loadInvestigation()).INVESTIGATION_REGISTRY));"
    p=subprocess.run(['node','--input-type=module','-e',program],cwd=ROOT,check=True,capture_output=True,text=True)
    return json.loads(p.stdout)

def build(registry,streams,retained_followups=None):
    checked=validator.validate(streams) if streams else {'valid':True}
    if not checked['valid']:raise ValueError('Funding streams fail contract: '+str(checked['errors'][:10]))
    sources={};entities={};edges={};records={};questions=[];seen_ids=set();dependencies=[]
    def insert(dest,row,origin):
        ident=row['id']
        if ident in seen_ids:raise ValueError(f'Duplicate global exact ID {ident}')
        seen_ids.add(ident)
        dest[ident]={**row,'corpusOrigin':origin}
    for s in registry['sources']:insert(sources,s,'retained-registry-not-newly-reread')
    for e in registry['entities']:insert(entities,e,'retained-registry-not-newly-reread')
    for e in registry['relationships']:insert(edges,{**e,'edgeStage':e.get('kind'),'status':e.get('tier'),'originalAssertion':e},'retained-registry-not-newly-reread')
    for r in registry['records']:insert(records,r,'retained-registry-not-newly-reread')
    for st in streams:
        for s in st['sources']:insert(sources,s,'funding-stream')
        for e in st['entities']:insert(entities,e,'funding-stream')
        for e in st['edges']:insert(edges,{**e,'edgeStage':e['stage'],'originalAssertion':e},'funding-stream')
        for c in st['cases']:
            insert(records,{**c,'summary':c['finding'],'relationshipIds':c['edgeIds']},'funding-stream')
            for n,q in enumerate(c['nextRecords']):questions.append({'id':f'{c["id"]}:acquire:{n}','caseId':c['id'],'sourceIds':c['sourceIds'],'edgeIds':c['edgeIds'],**q,'priorityBasis':'authored-next-record; no calculated wrongdoing likelihood'})
    retained=ROOT/'research/research-radar/next-model/graph-data.json'
    if retained_followups is None:
        retained_bytes=retained.read_bytes() if retained.exists() else None
        retained_followups=json.loads(retained_bytes).get('followups',[]) if retained_bytes else []
        dependencies.append({'path':str(retained.relative_to(ROOT)),'sha256':hashlib.sha256(retained_bytes).hexdigest() if retained_bytes is not None else None,'status':'read' if retained_bytes is not None else 'absent'})
    for q in retained_followups:questions.append({**q,'record':q['neededRecord'],'purpose':q['whyCurrentEvidenceStops'],'origin':'retained-authored-followup'})
    errors=[]
    for e in edges.values():
        if e.get('from') not in entities or e.get('to') not in entities:errors.append(f'{e["id"]}: endpoint absent')
        if not e.get('sourceIds') or any(s not in sources for s in e.get('sourceIds',[])):errors.append(f'{e["id"]}: source absent')
    for group in (entities,records,edges):
        for row in group.values():
            refs=set(row.get('sourceIds',[]))|{s for geo in row.get('geography',[]) for s in geo.get('sourceIds',[])}
            for sid in refs:
                if sid not in sources:errors.append(f'{row["id"]}: absent source {sid}')
    for row in records.values():
        for field,target in [('entityIds',entities),('relationshipIds',edges)]:
            for ident in row.get(field,[]):
                if ident not in target:errors.append(f'{row["id"]}: absent {field} {ident}')
    for row in edges.values():
        for field in ('recordIds','responseIds'):
            for ident in row.get(field,[]):
                if ident not in records:errors.append(f'{row["id"]}: absent {field} {ident}')
    for q in questions:
        for field,target in [('sourceIds',sources),('edgeIds',edges),('relationshipIds',edges),('recordIds',records),('counterEvidenceRecordIds',records)]:
            for ident in q.get(field,[]):
                if ident not in target:errors.append(f'{q["id"]}: absent {field} {ident}')
    if errors:raise ValueError('Registry reference closure failed: '+str(errors[:20]))
    return {'sources':sources,'entities':entities,'edges':edges,'records':records,'questions':questions,'dependencyReceipts':dependencies,'fingerprint':digest({'registry':registry,'streams':streams,'retainedFollowups':retained_followups,'dependencies':dependencies})}

def tokens(s):return re.findall(r'[\w]+',s.lower(),flags=re.UNICODE)
def search(graph,query,limit=15,include_zero=False):
    if not 1<=limit<=1000000:raise ValueError('Result limit must be between 1 and 1000000')
    docs=[]
    for kind in ('sources','entities','records'):
        for row in graph[kind].values():
            txt=' '.join(str(row.get(k,'')) for k in ('title','label','summary','excerpt','identityBasis','finding','question'))
            docs.append((kind,row['id'],txt,row))
    tfs=[Counter(tokens(d[2])) for d in docs];df=Counter(term for tf in tfs for term in tf);av=sum(sum(tf.values()) for tf in tfs)/max(1,len(tfs));q=sorted(set(tokens(query)));rank=[]
    for (kind,ident,txt,row),tf in zip(docs,tfs):
        dl=sum(tf.values());parts=[]
        for term in q:
            f=tf.get(term,0)
            if f:parts.append(math.log(1+(len(docs)-df[term]+.5)/(df[term]+.5))*f*2.5/(f+1.5*(.25+.75*dl/max(av,1))))
        score=math.fsum(parts)
        if score or include_zero:rank.append({'id':ident,'kind':kind,'bm25':score,'label':row.get('title',row.get('label',ident)),'sourceIds':row.get('sourceIds',[ident] if kind=='sources' else []),'corpusOrigin':row['corpusOrigin']})
    return sorted(rank,key=lambda x:(-x['bm25'],x['id']))[:limit]

def navigate(graph,start,target=None,depth=3,max_paths=100,include_context=False,max_expansions=20000):
    if start not in graph['entities']:raise ValueError('Start must be an exact existing entity ID; search labels separately')
    if target is not None and target not in graph['entities']:raise ValueError('Target must be an exact existing entity ID')
    if not 1<=depth<=5:raise ValueError('Depth must be 1–5')
    if not 1<=max_paths<=10000:raise ValueError('Path limit must be between 1 and 10000')
    if not 1<=max_expansions<=1000000:raise ValueError('Expansion limit must be between 1 and 1000000')
    adj=defaultdict(list)
    excluded=[]
    for e in graph['edges'].values():
        kind=e.get('edgeStage','')
        context=kind in CONTEXT or kind.endswith('-context')
        if context and not include_context:excluded.append(e['id']);continue
        adj[e['from']].append((e['to'],e,True,context));adj[e['to']].append((e['from'],e,False,context))
    for rows in adj.values():rows.sort(key=lambda t:t[1]['id'])
    queue=deque([(start,[start],[])]);paths=[];truncated=False;expansions=0;truncation_reason=None
    while queue:
        node,nodes,hops=queue.popleft()
        if len(hops)>=depth:continue
        for dest,e,forward,context in adj[node]:
            if expansions>=max_expansions:truncated=True;truncation_reason='edge-expansion-budget';queue.clear();break
            expansions+=1
            if dest in nodes:continue
            step={'edgeId':e['id'],'from':e['from'],'to':e['to'],'navigationDirection':'forward' if forward else 'reverse','stage':e.get('edgeStage'),'status':e.get('status'),'contextOnly':context,'sourceIds':e['sourceIds'],'originalAssertion':e['originalAssertion']}
            new=hops+[step];ns=nodes+[dest]
            if target is None or dest==target:
                if len(paths)>=max_paths:truncated=True;truncation_reason='path-output-budget';queue.clear();break
                paths.append({'entityIds':ns,'hops':new,'interpretation':'Documentary adjacency only. Original arrows retained; reverse navigation does not reverse a payment.'})
            if dest!=target:queue.append((dest,ns,new))
    picked_edges={h['edgeId'] for p in paths for h in p['hops']};picked_sources={s for p in paths for h in p['hops'] for s in h['sourceIds']};picked_entities={n for p in paths for n in p['entityIds']}
    questions=[q for q in graph['questions'] if set(q.get('edgeIds',q.get('relationshipIds',[]))) & picked_edges]
    linked_record_ids={i for edge_id in picked_edges for field in ('recordIds','responseIds') for i in graph['edges'][edge_id].get(field,[])}|{i for q in questions for field in ('recordIds','counterEvidenceRecordIds') for i in q.get(field,[])}
    linked_records=[graph['records'][i] for i in sorted(linked_record_ids)]
    exported_rows=[graph['entities'][i] for i in picked_entities]+questions+linked_records
    picked_sources|={sid for row in exported_rows for sid in row.get('sourceIds',[])}|{sid for row in exported_rows for geo in row.get('geography',[]) for sid in geo.get('sourceIds',[])}
    missing=picked_sources-graph['sources'].keys()
    if missing:raise ValueError('Navigation source closure failed: '+str(sorted(missing)))
    return {'paths':paths,'truncated':truncated,'truncationReason':truncation_reason,'edgeExpansions':expansions,'edgeExpansionLimit':max_expansions,'pathLimit':max_paths,'excludedContextEdges':len(excluded),'entities':[graph['entities'][i] for i in sorted(picked_entities)],'sources':[graph['sources'][i] for i in sorted(picked_sources)],'acquisitionQuestions':questions,'supportingRecords':linked_records,'supportingRecordScope':'Original cited records; their broader registry entity/edge references are retained, and do not add traversed paths. All their source citations are included.','inferredEdges':[],'aggregateAmount':None,'inferredCashFlow':False,'probabilitiesEstimated':False,'temporalClaim':'Current documentary reconstruction; no knowledge-at-time or historical forecast is established.'}

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--registry',type=Path);p.add_argument('--streams',type=Path,default=ROOT/'research/funding-investigations/streams');p.add_argument('--query');p.add_argument('--from-id');p.add_argument('--to-id');p.add_argument('--depth',type=int,default=3);p.add_argument('--limit',type=int,default=20);p.add_argument('--include-context',action='store_true');p.add_argument('--output',type=Path);a=p.parse_args()
    registry=json.loads(a.registry.read_text()) if a.registry else load_registry();paths=sorted(a.streams.glob('*.json'));streams=[]
    for path in paths:streams.extend(validator.streams_from(json.loads(path.read_text())))
    graph=build(registry,streams);result={'schemaVersion':1,'task':'document-discovery-and-exact-edge-navigation','corpusFingerprint':graph['fingerprint'],'dependencyReceipts':graph['dependencyReceipts'],'counts':{k:len(graph[k]) for k in ('sources','entities','edges','records','questions')},'streamInputs':[{'path':str(f.relative_to(ROOT)) if f.is_relative_to(ROOT) else str(f),'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in paths],'limitations':['All prior registry sectors loaded, including explicitly labelled legacy sources; these records were not all newly inspected.','No name-based entity merging. Same labels in different namespaces remain separate.','BM25 relevance does not confirm the truth of a claim or a relationship.','Paths may mix ownership, official roles, alleged transfers and contracts; they are not a money total.']}
    if a.query:result['query']=a.query;result['rankedCandidates']=search(graph,a.query,a.limit)
    if a.from_id:result['navigation']=navigate(graph,a.from_id,a.to_id,a.depth,a.limit,a.include_context)
    if not a.query and not a.from_id:result['acquisitionQuestions']=graph['questions']
    rendered=json.dumps(result,ensure_ascii=False,indent=2)+'\n'
    if a.output:a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(rendered);print(json.dumps({'output':str(a.output),'counts':result['counts'],'fingerprint':graph['fingerprint']}))
    else:print(rendered)
if __name__=='__main__':main()
