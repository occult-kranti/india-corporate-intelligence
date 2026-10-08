#!/usr/bin/env python3
"""Independent next-round source retrieval evaluation. Never trains or selects a model."""
import argparse
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import random
import statistics
from urllib.parse import urlsplit, urlunsplit

ROOT = Path(__file__).resolve().parents[3]
LABELS = ROOT / 'research/research-radar/next-model/independent-test-labels.json'
FREEZE = ROOT / 'research/research-radar/next-model/independent-test-freeze.json'
SPEC = importlib.util.spec_from_file_location('frozen_retrieval_metrics', ROOT / 'scripts/research-radar/fine-tuning/metrics.py')
_METRICS = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(_METRICS)


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def canonical_url(value):
    p = urlsplit(value)
    host = p.netloc.lower()
    if host.startswith('www.'):
        host = host[4:]
    return urlunsplit(('https', host, p.path, p.query, ''))


def verify_freeze():
    receipt = json.loads(FREEZE.read_text())
    for item in receipt['files']:
        path = ROOT / item['path']
        if sha(path) != item['sha256']:
            raise ValueError(f'Frozen artifact changed: {item["path"]}')
    if receipt['candidateOutputsInspected'] is not False:
        raise ValueError('Freeze must precede candidate-output inspection')
    return receipt


def document_projection(corpus):
    raw = corpus.get('documents', corpus.get('sources', []))
    docs = []
    for d in raw:
        source_id = d.get('id', d.get('sourceId'))
        url = d.get('url', d.get('sourceUrl'))
        family = d.get('sourceLineageId') or (canonical_url(url) if url else None) or d.get('sourceFamilyId', d.get('family'))
        if not source_id or not family:
            raise ValueError('Each corpus document needs ID and explicit URL/source lineage')
        docs.append({'id': source_id, 'family': family})
    return docs


def query_projection(labels):
    return [dict(q, caseId=q['caseGroup'], positiveIds=[k for k,v in q['relevance'].items() if v > 0],
                 requiredCounterevidenceIds=q['requiredCounterevidenceSourceIds'],
                 hardNegativeIds=q['hardNegativeSourceIds']) for q in labels['queries']]


def checked_rankings(rows, source_ids, query_ids):
    if not isinstance(rows, list) or len(rows) != len(query_ids):
        raise ValueError('Exactly one full ranking required per frozen query')
    seen = set()
    result = {}
    for row in rows:
        qid = row['queryId']
        if qid in seen or qid not in query_ids:
            raise ValueError('Duplicate or unknown query ID')
        seen.add(qid)
        ranked = row['ranking']
        ids = [item['sourceId'] for item in ranked]
        if len(ids) != len(source_ids) or len(set(ids)) != len(ids) or set(ids) != source_ids:
            raise ValueError(f'{qid}: incomplete/duplicate/unknown source ranking')
        for item in ranked:
            if isinstance(item['score'], bool) or not isinstance(item['score'], (int,float)) or not math.isfinite(item['score']):
                raise ValueError('Retrieval scores must be finite numbers')
        if ranked != sorted(ranked, key=lambda x: (-x['score'], x['sourceId'])):
            raise ValueError(f'{qid}: ranking not score-descending/source-ID tie-broken')
        result[qid] = ids
    return result


def promotion(systems):
    required = ('candidate','base','bm25')
    if not all(k in systems for k in required):
        raise ValueError('candidate, own untuned base and BM25 are required')
    c,b,l = [systems[k]['metrics']['caseMacro'] for k in required]
    checks=[]
    def criterion(name, value, minimum):
        checks.append({'name':name,'observed':value,'minimum':minimum,'passed':value is not None and value + 1e-12 >= minimum})
    def diff(a,b):
        return None if a is None or b is None else a-b
    criterion('nDCG@5 gain over own untuned base',diff(c['ndcgAt5'],b['ndcgAt5']),.02)
    criterion('nDCG@5 difference from BM25',diff(c['ndcgAt5'],l['ndcgAt5']),-.01)
    for m in ('recallAt5','counterevidenceRecallAt5'):
        for name,baseline in [('own base',b),('BM25',l)]:
            criterion(f'{m} difference from {name}',diff(c[m],baseline[m]),-.01)
    if 'mini' in systems:
        criterion('nDCG@5 difference from existing MiniLM',diff(c['ndcgAt5'],systems['mini']['metrics']['caseMacro']['ndcgAt5']),-.01)
    bc={x['caseId']:x['metrics']['ndcgAt5'] for x in systems['base']['metrics']['perCase']}
    delta={x['caseId']:x['metrics']['ndcgAt5']-bc[x['caseId']] for x in systems['candidate']['metrics']['perCase']}
    criterion('Groups improving over own untuned base',sum(x>1e-12 for x in delta.values()),4)
    criterion('Worst group nDCG@5 difference',min(delta.values()),-.05)
    passed=all(x['passed'] for x in checks) and len(delta)==6
    return {'promoted':passed,'status':'promoted-retrieval-only' if passed else 'experimental-not-promoted',
            'criteria':checks,'perCaseNdcgChanges':delta,
            'meaning':'Retrieval convenience gate only; does not establish an edge, truth, personal guilt or forecast probability.'}


def bootstrap(systems):
    b={x['caseId']:x['metrics']['ndcgAt5'] for x in systems['base']['metrics']['perCase']}
    differences=[x['metrics']['ndcgAt5']-b[x['caseId']] for x in systems['candidate']['metrics']['perCase']]
    rng=random.Random(20261008)
    draws=sorted(statistics.mean(rng.choices(differences,k=len(differences))) for _ in range(5000))
    return {'unit':'whole case family','groups':len(differences),'resamples':5000,'seed':20261008,
            'meanDifference':statistics.mean(differences),'percentileInterval95':[draws[124],draws[4874]],
            'interpretation':'Exploratory six-group interval; no representative national accuracy or significance claim.'}


def path_audit(registry, labels, ranked_ids, packets=None):
    """Source closure and preservation checks; deliberately not learned reasoning metrics."""
    rels={x['id']:x for x in registry['relationships']}
    sources={x['id']:x for x in registry['sources']}
    rows=[]
    for q in labels['queries']:
        wanted=[rels[r] for r in q['requiredRelationshipIds']]
        available={canonical_url(sources[s]['url']) for s in ranked_ids[q['id']][:5]}
        supported=[r['id'] for r in wanted if any(canonical_url(sources[s]['url']) in available for s in r['sourceIds'])]
        rows.append({'queryId':q['id'],'requiredEdges':len(wanted),'requiredEdgeSourcesReachedAt5':len(supported),
                     'requiredEdgeSourceCoverageAt5':len(supported)/len(wanted) if wanted else None,
                     'expectedEvidenceStop':q['evidenceStop']})
    checks=[]
    if packets is not None:
        for packet in packets:
            for edge in packet.get('relationships',[]):
                original=rels.get(edge['id'])
                checks.append({'edgeId':edge['id'],'exists':original is not None,'preserved':original is not None and all(edge.get(k)==original.get(k) for k in ('from','to','kind','tier','status','sourceIds','amounts','limitations'))})
    return {'kind':'Deterministic retained-evidence integration/source-closure check, not learned factual reasoning',
            'perQuery':rows,'emittedEdgeChecks':checks,
            'emittedGraphEvaluated':packets is not None,
            'allEmittedEdgesPreserved':all(x['exists'] and x['preserved'] for x in checks) if packets is not None else None,
            'abstentionScope':'Expected evidence stops are retained editorial constraints. Without emitted predictions no learned abstention accuracy is claimed.'}


def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--corpus',required=True);ap.add_argument('--rankings',required=True);ap.add_argument('--output',required=True)
    ap.add_argument('--registry');ap.add_argument('--packets')
    args=ap.parse_args()
    freeze=verify_freeze()
    labels=json.loads(LABELS.read_text());corpus=json.loads(Path(args.corpus).read_text());raw=json.loads(Path(args.rankings).read_text())
    if raw.get('corpusSha256')!=sha(args.corpus):raise ValueError('Rankings are not bound to exact corpus bytes')
    docs=document_projection(corpus);queries=query_projection(labels)
    source_ids={d['id'] for d in docs};query_ids={q['id'] for q in queries}
    systems={};rankings={}
    for name,system in raw['comparators'].items():
        ranks=checked_rankings(system['queries'],source_ids,query_ids);rankings[name]=ranks
        systems[name]={'configuration':system.get('configuration',{}),'metrics':_METRICS.evaluate_rankings(queries,docs,ranks)}
    output={'schemaVersion':1,'task':'Independent source-summary retrieval evaluation','queries':len(queries),'caseFamilies':len({q['caseId'] for q in queries}),'documents':len(docs),
            'hashes':{'corpus':sha(args.corpus),'rankings':sha(args.rankings),'labels':sha(LABELS),'freeze':sha(FREEZE),'evaluator':sha(__file__),'inheritedMetrics':sha(ROOT / 'scripts/research-radar/fine-tuning/metrics.py')},
            'systems':systems,'promotion':promotion(systems),'caseClusterBootstrap':bootstrap(systems),'forecastProbabilitiesEstimated':False,
            'limitations':['Selected agent-authored relevance labels across six institutional case families.','Source summaries and locators, not a full-document comprehension benchmark.','Unlisted sources are unjudged zero for these tightly scoped questions, not exhaustively verified irrelevant documents.','Source lineage uses normalized original URLs; different-URL syndication/mirrors may remain, and distinct URLs do not establish independent corroboration.','Pretrained-model exposure to source entities is unknown.','All final-test labels become exhausted for future tuning after this invocation.']}
    if args.registry:
        registry=json.loads(Path(args.registry).read_text())
        packets=json.loads(Path(args.packets).read_text()) if args.packets else None
        output['evidencePathIntegration']=path_audit(registry,labels,rankings['candidate'],packets)
        output['hashes']['registry']=sha(args.registry)
    Path(args.output).write_text(json.dumps(output,indent=2)+'\n')
    print(json.dumps({'output':args.output,'systems':{k:v['metrics']['caseMacro'] for k,v in systems.items()},'promotion':output['promotion']},indent=2))

if __name__=='__main__':main()
