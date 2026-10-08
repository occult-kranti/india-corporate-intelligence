#!/usr/bin/env python3
"""One-shot evaluator-owned test invocation after development selection. No training."""
import argparse
import datetime as dt
import importlib.util
import json
from pathlib import Path
import subprocess
import sys

ROOT=Path(__file__).resolve().parents[3]
AREA=ROOT/'research/research-radar/next-model'
SCRIPTS=Path(__file__).parent
spec=importlib.util.spec_from_file_location('independent',SCRIPTS/'evaluate-independent.py')
e=importlib.util.module_from_spec(spec);spec.loader.exec_module(e)


def write(path,value):path.write_text(json.dumps(value,indent=2,ensure_ascii=False)+'\n')
def now():return dt.datetime.now(dt.timezone.utc).isoformat()
def binding(path):return {'path':str(path.relative_to(ROOT)),'sha256':e.sha(path),'bytes':path.stat().st_size}


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--runtime',required=True,type=Path)
    ap.add_argument('--onnx-cache',default='/workspace/.cache/icip-onnx-models',type=Path)
    args=ap.parse_args()
    e.verify_freeze()
    run=AREA/'model-run';selected=json.loads((run/'selected-model.json').read_text())
    training=json.loads((run/'training-receipt.json').read_text())
    if training['status']!='executed' or training['testLabelsRead'] or training['testDocumentsEncodedForOptimizationOrSelection']:
        raise ValueError('Invalid completed training boundary')
    if selected['freezeSha256']!=e.sha(run/'experiment-freeze.json') or training['datasetSha256']!=e.sha(AREA/'dataset.json'):
        raise ValueError('Selection and corpus are not frozen together')
    checkpoint=ROOT/selected['adapterPath']
    if selected['adapterSha256']!=e.sha(checkpoint):raise ValueError('Selected weights changed')
    freeze=json.loads((run/'experiment-freeze.json').read_text())
    for file,h in freeze['codeHashes'].items():
        if e.sha(file)!=h:raise ValueError('Frozen executable changed before test')
    out=AREA/'final-test';out.mkdir(exist_ok=False)
    labels=json.loads(e.LABELS.read_text())
    query_path=out/'query-projection.json'
    write(query_path,{'queries':[{'id':q['id'],'text':q['query']} for q in labels['queries']]})
    files=[AREA/'dataset.json',e.LABELS,e.FREEZE,AREA/'preflight-review.json',run/'experiment-freeze.json',run/'training-config.json',run/'selected-model.json',run/'training-receipt.json',checkpoint,query_path,SCRIPTS/'invoke-final.py',SCRIPTS/'evaluate-independent.py',SCRIPTS/'trace.py',SCRIPTS/'rank.py',SCRIPTS/'encoder.py',AREA/'graph-data.json']
    receipt={'schemaVersion':1,'event':'One selected-candidate final holdout invocation','owner':'Independent evaluation AI agent',
             'startedAtUtc':now(),'status':'running','candidateOutputsInspectedBeforeInvocation':False,
             'selectedCandidate':{k:selected[k] for k in ('family','fusion','epoch','adapterSha256')},
             'files':[binding(p) for p in files], 'runtime':str(args.runtime),
             'comparators':['bm25','base','candidate','mini'],'noFurtherModelSelectionAuthorized':True}
    write(out/'invocation.json',receipt)
    try:
        combined={'schemaVersion':1,'corpusSha256':e.sha(AREA/'dataset.json'),'queriesSha256':e.sha(query_path),'comparators':{}}
        for name in receipt['comparators']:
            result=out/f'{name}.json'
            command=[str(args.runtime),str(SCRIPTS/'rank.py'),'--queries',str(query_path),'--corpus',str(AREA/'dataset.json'),'--model',name,'--candidate-config',str(run/'selected-model.json'),'--onnx-cache',str(args.onnx_cache),'--output',str(result)]
            subprocess.run(command,cwd=ROOT,check=True)
            raw=json.loads(result.read_text())
            if raw['corpusSha256']!=combined['corpusSha256'] or raw['queriesSha256']!=combined['queriesSha256']:raise ValueError('Comparator binding mismatch')
            combined['comparators'].update(raw['comparators'])
        ranking_path=out/'rankings.json';write(ranking_path,combined)
        # Source-derived trace expansion is deterministic and deliberately separate
        # from model rankings. Store exact copied edges for reproducible checking.
        tspec=importlib.util.spec_from_file_location('trace',SCRIPTS/'trace.py')
        trace=importlib.util.module_from_spec(tspec);tspec.loader.exec_module(trace)
        graph=json.loads((AREA/'graph-data.json').read_text())
        packets=[];summaries=[]
        for q in combined['comparators']['candidate']['queries']:
            packet=trace.expand_trace(graph,source_ids=[r['sourceId'] for r in q['ranking'][:5]],max_hops=2)
            trace.validate_packet(packet,graph)
            packets.append({'queryId':q['queryId'],'relationships':packet['relationships']})
            summaries.append({'queryId':q['queryId'],'selectedSourceIds':packet['selectedSourceIds'],
                              'relationships':len(packet['relationships']),'sources':len(packet['sources']),
                              'fullPacketCanonicalSha256':trace.canonical_sha(packet),
                              'inferredCashFlow':packet['inferredCashFlow'],'aggregateAmount':packet['aggregateAmount'],
                              'truncation':packet['truncation'],'retainedCounterevidenceRecords':len(packet['counterevidence'])})
        packet_path=out/'emitted-edges.json';write(packet_path,packets)
        write(out/'trace-audit.json',{'kind':'Deterministic exact-registry/source-closure integration, not learned truth or guilt accuracy','graphSha256':e.sha(AREA/'graph-data.json'),'traceCodeSha256':e.sha(SCRIPTS/'trace.py'),'queries':summaries})
        subprocess.run([sys.executable,str(SCRIPTS/'evaluate-independent.py'),'--corpus',str(AREA/'dataset.json'),'--rankings',str(ranking_path),'--registry',str(AREA/'graph-data.json'),'--packets',str(packet_path),'--output',str(AREA/'evaluation.json')],cwd=ROOT,check=True)
        for record in receipt['files']:
            if e.sha(ROOT/record['path'])!=record['sha256']:raise ValueError('Frozen invocation input changed during evaluation')
        receipt.update(status='completed',completedAtUtc=now(),outputs=[binding(p) for p in sorted(out.glob('*.json')) if p.name!='invocation.json']+[binding(AREA/'evaluation.json')],
                       testStatusAfterInvocation='Exhausted for future tuning; no test-driven training rerun')
        write(out/'invocation.json',receipt)
        print('One-shot independent evaluation completed.',flush=True)
    except Exception as exc:
        receipt.update(status='failed-technical-invocation',failedAtUtc=now(),error=str(exc),
                       policy='Preserve every output. An implementation-only repair requires a recorded audit; do not select a new model or relabel observed queries.')
        write(out/'invocation.json',receipt)
        raise

if __name__=='__main__':main()
