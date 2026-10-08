#!/usr/bin/env python3
"""Post-run lexical arithmetic audit; never regenerates/selects a neural candidate."""
from collections import Counter
import hashlib
import json
import math
from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[3]
AREA=ROOT/'research/research-radar/next-model'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()

def main():
    corpus=json.loads((AREA/'dataset.json').read_text())['documents']
    queries=json.loads((AREA/'final-test/query-projection.json').read_text())['queries']
    saved=json.loads((AREA/'final-test/bm25.json').read_text())['comparators']['bm25']['queries']
    labels={q['id']:q for q in json.loads((AREA/'independent-test-labels.json').read_text())['queries']}
    saved_by={q['queryId']:q['ranking'] for q in saved}
    tokenize=lambda t:re.findall(r'\w+',t.lower(),flags=re.UNICODE)
    tokens=[tokenize(d['text']) for d in corpus];counts=[Counter(t) for t in tokens]
    df=Counter(w for ts in tokens for w in set(ts));average=sum(map(len,tokens))/len(tokens)
    rows=[]
    for q in queries:
        terms=sorted(set(tokenize(q['text'])))
        reference=[];bounds={}
        for i,d in enumerate(corpus):
            contributions=[]
            for word in terms:
                tf=counts[i].get(word,0)
                idf=math.log(1+(len(tokens)-df.get(word,0)+.5)/(df.get(word,0)+.5))
                denominator=tf+1.2*(1-.75+.75*len(tokens[i])/average)
                contributions.append(idf*tf*2.2/denominator)
            score=math.fsum(contributions)
            n=max(0,len(contributions)-1);gamma=n*(2**-52)/(1-n*(2**-52))
            bound=gamma*math.fsum(abs(v) for v in contributions)
            reference.append({'sourceId':d['id'],'score':score});bounds[d['id']]=bound
        reference.sort(key=lambda x:(-x['score'],x['sourceId']))
        actual=saved_by[q['id']];old={r['sourceId']:r['score'] for r in actual}
        ref={r['sourceId']:r['score'] for r in reference}
        old_ids=[r['sourceId'] for r in actual];new_ids=[r['sourceId'] for r in reference]
        positive=set(labels[q['id']]['relevance'])
        changed_positive=[{'sourceId':sid,'savedRank':old_ids.index(sid)+1,'stableSumRank':new_ids.index(sid)+1} for sid in positive if old_ids.index(sid)!=new_ids.index(sid)]
        rows.append({'queryId':q['id'],'maximumAbsoluteScoreDifference':max(abs(old[s]-ref[s]) for s in old),
                     'allDifferencesInsideConservativeSummationBound':all(abs(old[s]-ref[s])<=max(bounds[s],2**-52) for s in old),
                     'changedRankPositions':sum(a!=b for a,b in zip(old_ids,new_ids)),
                     'topFiveChanged':old_ids[:5]!=new_ids[:5],'positiveRankChanges':changed_positive,
                     'topFiveSaved':old_ids[:5],'topFiveStableSum':new_ids[:5]})
    result={'schemaVersion':1,'kind':'Post-first-invocation lexical summation sensitivity audit',
            'issue':'Frozen BM25 implementation iterates a Python set of query terms. PYTHONHASHSEED was not pinned for the already-started final invocation. Cross-process addition order can change last bits.',
            'policy':'First saved model rankings are preserved. This arithmetic audit does not retrain, rerun a neural model, revise labels, change gates or choose another checkpoint.',
            'reference':'Same frozen tokenization, document statistics, k1=1.2 and b=.75; sorted terms and math.fsum over identical per-term floating contributions.',
            'hashes':{'corpus':sha(AREA/'dataset.json'),'queries':sha(AREA/'final-test/query-projection.json'),'savedBM25':sha(AREA/'final-test/bm25.json'),'auditCode':sha(Path(__file__))},
            'queryCount':len(rows),'queriesWithChangedFullRanking':sum(r['changedRankPositions']>0 for r in rows),
            'queriesWithChangedTopFive':sum(r['topFiveChanged'] for r in rows),
            'queriesWithChangedPositiveRanks':sum(bool(r['positiveRankChanges']) for r in rows),
            'maximumAbsoluteScoreDifference':max(r['maximumAbsoluteScoreDifference'] for r in rows),
            'rows':rows,
            'limits':'Only the saved standalone BM25 output is compared with stable summation here. It cannot retrospectively pin the hash seeds of the separately executed fused baseline and candidate. Final neural/fusion conclusions use their first frozen raw rankings.'}
    target=AREA/'lexical-numerical-audit.json'
    if target.exists():raise ValueError('Preserve first audit output; do not overwrite')
    target.write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps({k:result[k] for k in ('queryCount','queriesWithChangedFullRanking','queriesWithChangedTopFive','queriesWithChangedPositiveRanks','maximumAbsoluteScoreDifference')},indent=2))

if __name__=='__main__':main()
