#!/usr/bin/env python3
"""Run a fixed unjudged lexical discovery batch; preserve all scores and exact source metadata."""
import argparse
from collections import Counter,defaultdict
from datetime import datetime,timezone
import hashlib
import gzip
import importlib.util
import json
from pathlib import Path
import time
from urllib.parse import urlsplit,urlunsplit
S=importlib.util.spec_from_file_location('funding_trace',Path(__file__).with_name('trace.py'));t=importlib.util.module_from_spec(S);S.loader.exec_module(t)
ROOT=t.ROOT

def url_key(url):
    try:
        p=urlsplit(url);return urlunsplit((p.scheme.lower(),p.netloc.lower(),p.path,p.query,''))
    except ValueError:return url

def identity_candidates(graph):
    """Exact normalized labels suggest document review, never an identity merge."""
    labels=defaultdict(list)
    for row in graph['entities'].values():
        key=' '.join(row.get('label','').casefold().split())
        if key:labels[key].append(row)
    candidates=[]
    for label,rows in sorted(labels.items()):
        if len(rows)<2:continue
        namespaces={r.get('namespace') or (r['id'].split(':')[1] if r['id'].startswith('fi:') else 'unknown') for r in rows}
        if len(namespaces)<2:continue
        evidence=[]
        for row in rows:
            evidence.append({'entityId':row['id'],'label':row['label'],'identityBasis':row.get('identityBasis'),'sourceIds':row.get('sourceIds',[]),'sourceURLs':[graph['sources'][i].get('url') for i in row.get('sourceIds',[]) if i in graph['sources']]})
        candidates.append({'labelKey':label,'namespaces':sorted(namespaces),'entities':evidence,'involvesNewStream':any(r['id'].startswith('fi:') for r in rows),'approved':False,'edgeCreated':False,'reason':'Exact casefolded whitespace-normalized label match only. Review exact legal identity, operative date and original documents before any crosswalk.'})
    return candidates

def run(registry,streams,questions,retained_followups=None):
    start=time.perf_counter();g=t.build(registry,streams,retained_followups);runs=[];source_meta=g['sources'];n=sum(len(g[k]) for k in ('sources','entities','records'))
    for q in questions['queries']:
        ranking=t.search(g,q['question'],n,include_zero=True)
        runs.append({**q,'rankings':ranking,'candidateCount':len(ranking),'positiveScores':sum(r['bm25']>0 for r in ranking),'interpretation':'Unjudged lexical similarity only. Every zero and off-topic result retained; no inferred relationship.'})
    domains=defaultdict(Counter)
    for kind in ('sources','entities','edges','records'):
        for row in g[kind].values():
            namespace=row.get('namespace') or (row['id'].split(':')[1] if row['id'].startswith('fi:') else 'unknown')
            domains[namespace][kind]+=1
    families=defaultdict(list);urls=defaultdict(list)
    for s in source_meta.values():
        families[s.get('sourceFamily') or 'retained-url:'+url_key(s.get('url',''))].append(s['id']);urls[url_key(s.get('url',''))].append(s['id'])
    shared_urls=[{'url':url,'sourceIds':ids,'namespaces':sorted({source_meta[i].get('namespace') or (i.split(':')[1] if i.startswith('fi:') else 'unknown') for i in ids})} for url,ids in urls.items() if url and len(ids)>1]
    demo_seeds=[('sikkim-escrow','fi:utilities:entity:pds',False),('smartmeter-finance','fi:utilities:entity:atssl',False),('pmcares-ledger','fi:welfare-pmcares:entity:pmcares',False),('defence-skills','fi:cross-sector:entity:diav',True),('airport-refinancing','fi:cross-sector:entity:dial',True),('police-funding','fi:police-border:entity:mha',False)]
    demos=[{'id':label,'startEntityId':ident,'contextEdgesExplicitlyEnabled':context,**t.navigate(g,ident,depth=3,max_paths=25,include_context=context)} for label,ident,context in demo_seeds if ident in g['entities']]
    out={'schemaVersion':1,'generatedAt':datetime.now(timezone.utc).isoformat(),'corpusFingerprint':g['fingerprint'],'dependencyReceipts':g['dependencyReceipts'],'queryFingerprint':t.digest(questions),'method':{'name':'BM25','k1':1.5,'b':.75,'termOrder':'sorted Unicode word tokens; math.fsum','supervisedLabels':False,'probabilitiesEstimated':False,'candidateKinds':['source','entity','record'],'zeroScorePolicy':'retained, tied by exact ID'},'counts':{k:len(g[k]) for k in ('sources','entities','edges','records','questions')},'sourceMetadata':source_meta,'pathDemonstrations':demos,'runs':runs,'inferredEdges':[],'aggregateAmount':None,'runtimeSeconds':time.perf_counter()-start,'limits':questions['limits']}
    summary={'schemaVersion':1,'corpusFingerprint':g['fingerprint'],'dependencyReceipts':g['dependencyReceipts'],'queryFingerprint':t.digest(questions),'counts':out['counts'],'queryCount':len(runs),'countsByNamespace':dict(sorted(domains.items())),'sourceFamilies':{'declaredOrURLFallbackCount':len(families),'exactURLDuplicateGroups':len(shared_urls),'crossNamespaceExactURLGroups':sum(len(x['namespaces'])>1 for x in shared_urls),'overlaps':shared_urls,'meaning':'Declared families are used for new sources; exact canonical URL fallback for inherited rows. Different URLs are not evidence of independence; this is not complete syndication resolution.'},'queries':[{'id':r['id'],'sector':r['sector'],'question':r['question'],'candidateCount':r['candidateCount'],'positiveScores':r['positiveScores'],'topCandidates':r['rankings'][:5],'topSources':[dict(x,source=source_meta[x['id']]) for x in r['rankings'] if x['kind']=='sources'][:5],'status':'unjudged-discovery-not-prediction'} for r in runs],'inferredEdges':[],'aggregateAmount':None,'probabilitiesEstimated':False,'pathDemonstrations':[{'id':d['id'],'startEntityId':d['startEntityId'],'pathCount':len(d['paths']),'truncated':d['truncated'],'sourceCount':len(d['sources']),'acquisitionQuestionCount':len(d['acquisitionQuestions']),'contextEdgesExplicitlyEnabled':d['contextEdgesExplicitlyEnabled']} for d in demos],'identityCandidates':identity_candidates(g),'rawRankingsPath':'research/funding-investigations/analysis-batch-rankings.json.gz','limits':questions['limits']}
    return out,summary

def receipt_path(path):
    resolved=path.resolve()
    return str(resolved.relative_to(ROOT)) if resolved.is_relative_to(ROOT) else str(resolved)

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--queries',type=Path,default=ROOT/'research/funding-investigations/analysis-queries.json');p.add_argument('--streams',type=Path,default=ROOT/'research/funding-investigations/streams');p.add_argument('--registry',type=Path);a=p.parse_args()
    streams=[];paths=sorted(a.streams.glob('*.json'))
    for path in paths:streams.extend(t.validator.streams_from(json.loads(path.read_text())))
    registry=json.loads(a.registry.read_text()) if a.registry else t.load_registry();questions=json.loads(a.queries.read_text());raw,ui=run(registry,streams,questions)
    receipt={'queryFileSha256':hashlib.sha256(a.queries.read_bytes()).hexdigest(),'streams':[{'path':receipt_path(f),'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in paths]}
    raw['inputReceipt']=receipt;ui['inputReceipt']=receipt
    raw_bytes=(json.dumps(raw,separators=(',',':'),ensure_ascii=False)+'\n').encode()
    compressed=gzip.compress(raw_bytes,compresslevel=9,mtime=0)
    raw_path=ROOT/'research/funding-investigations/analysis-batch-rankings.json.gz';raw_path.write_bytes(compressed)
    ui['rawReceipt']={'path':str(raw_path.relative_to(ROOT)),'sha256':hashlib.sha256(compressed).hexdigest(),'decompressedSha256':hashlib.sha256(raw_bytes).hexdigest(),'compressedBytes':len(compressed),'decompressedBytes':len(raw_bytes),'compression':'gzip; lossless JSON; fixed gzip mtime'}
    path=ROOT/'research/funding-investigations/analysis-ui.json';path.write_text(json.dumps(ui,indent=2,ensure_ascii=False)+'\n');print(f'{path.name}: {path.stat().st_size} bytes; raw rankings: {len(compressed)} compressed bytes / {len(raw_bytes)} JSON bytes')
    print(json.dumps({'queries':len(raw['runs']),'counts':raw['counts'],'runtimeSeconds':raw['runtimeSeconds']}))
if __name__=='__main__':main()
