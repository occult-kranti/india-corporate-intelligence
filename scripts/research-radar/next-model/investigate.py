#!/usr/bin/env python3
"""Run a local retriever, then attach exact source-closed investigative graph context."""
from __future__ import annotations
import argparse
import datetime
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys

REPO = Path(__file__).resolve().parents[3]
DATA = REPO / 'research/research-radar/next-model'
SCRIPTS = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('exact_evidence_trace', SCRIPTS / 'trace.py')
trace = importlib.util.module_from_spec(spec)
spec.loader.exec_module(trace)


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n')


def model_selection(requested, evaluation_path, corpus_path, selected_path):
    evaluation = json.loads(evaluation_path.read_text()) if evaluation_path.is_file() else None
    selected = json.loads(selected_path.read_text()) if selected_path.is_file() else None
    promoted = False
    evaluation_matches = False
    if evaluation and selected:
        configuration = evaluation.get('systems', {}).get('candidate', {}).get('configuration', {})
        evaluation_matches = (evaluation.get('hashes', {}).get('corpus') == sha(corpus_path)
                    and configuration.get('selectedConfigurationSha256') == sha(selected_path)
                    and configuration.get('adapterSha256') == selected.get('adapterSha256'))
        promoted = (evaluation_matches and evaluation.get('promotion', {}).get('promoted') is True
                    and evaluation.get('promotion', {}).get('status') == 'promoted-retrieval-only')
    resolved = ('candidate' if promoted else 'mini') if requested == 'default' else requested
    if resolved in {'candidate', 'base'} and not selected:
        raise ValueError('Selected model is unavailable; training/development selection must finish first')
    if resolved == 'candidate' and not evaluation_matches:
        raise ValueError('Candidate investigation runs wait for independent evaluation bound to this corpus and selected model')
    return {'requested': requested, 'resolved': resolved, 'promotedWithMatchingArtifacts': promoted, 'evaluationMatchesSelected': evaluation_matches,
            'reason': 'Matching evaluated candidate passed retrieval gate.' if requested == 'default' and promoted
                      else 'Default retained MiniLM; candidate is explicit opt-in unless the matching evaluation passes.' if requested == 'default'
                      else 'Explicit retriever selection; experimental candidate does not become default.',
            'evaluationSha256': sha(evaluation_path) if evaluation_path.is_file() else None,
            'selectedConfigurationSha256': sha(selected_path) if selected_path.is_file() else None}


def normalize_queries(value):
    rows = value if isinstance(value, list) else value.get('queries')
    if not isinstance(rows, list) or not rows:
        raise ValueError('queries must contain a nonempty list')
    result, ids = [], set()
    for row in rows:
        if not isinstance(row, dict):
            raise ValueError('Each query must be an object with id and text')
        ident, text = row.get('id'), row.get('text', row.get('query'))
        if not isinstance(ident, str) or not ident or ident in ids:
            raise ValueError('Query IDs must be unique nonempty strings')
        if not isinstance(text, str) or not text.strip():
            raise ValueError('Query text must be nonempty')
        ids.add(ident)
        result.append({**row, 'id': ident, 'text': text})
    return result


def checked_rankings(raw, model, query_ids, source_ids, corpus_sha, query_sha):
    if raw.get('corpusSha256') != corpus_sha or raw.get('queriesSha256') != query_sha:
        raise ValueError('Rankings do not match exact corpus/query bytes')
    comparator = raw.get('comparators', {}).get(model)
    if not comparator:
        raise ValueError('Requested model is absent from rankings')
    result = {}
    import math
    for row in comparator['queries']:
        ident = row['queryId']
        if ident in result or ident not in query_ids:
            raise ValueError('Ranking contains duplicate or unexpected query ID')
        ranks = row['ranking']
        ids = [r['sourceId'] for r in ranks]
        if len(ids) != len(set(ids)) or set(ids) != source_ids:
            raise ValueError('A complete unique ranking of the exact corpus is required')
        if any(not isinstance(r.get('score'), (int, float)) or isinstance(r['score'], bool)
               or not math.isfinite(r['score']) for r in ranks):
            raise ValueError('Scores must be finite numbers, never probability claims')
        if ranks != sorted(ranks, key=lambda x: (-x['score'], x['sourceId'])):
            raise ValueError('Ranking order must preserve score and exact-ID tie breaking')
        result[ident] = ranks
    if set(result) != query_ids:
        raise ValueError('Ranking query coverage is incomplete')
    return result


def make_runs(queries, rankings, graph, selection, depth=2, max_edges=150, top_k=5, as_of=None):
    runs = []
    for row in queries:
        ranking = rankings[row['id']][:top_k]
        packet = trace.expand_trace(graph, source_ids=[r['sourceId'] for r in ranking],
                                    max_hops=depth, max_edges=max_edges, as_of=as_of)
        runs.append({'id': row['id'], 'query': row['text'], 'ranking': ranking,
                     'model': selection['resolved'], 'interpretation':
                         'Executed source relevance retrieval followed by deterministic exact-edge navigation. '
                         'An illustrative evidence workup, not a discovered new corruption case or forecast.',
                     'trace': packet})
    return runs



def browser_projection(result, packet_sha, rankings_sha):
    """Saved findings only; the UI browses the separate canonical graph artifact."""
    runs = [{**{k: v for k, v in run.items() if k != 'trace'},
             'trace': {k: run['trace'][k] for k in ('missingRecordQuestions', 'counterevidence', 'temporalLimits', 'truncation')}}
            for run in result['runs']]
    return {'schemaVersion': 1, 'status': 'executed', 'modelSelection': result['modelSelection'],
            'fullPacketsSha256': packet_sha, 'completeRankingsSha256': rankings_sha,
            'historicalForecastEligible': False, 'probabilitiesEstimated': False, 'runs': runs}


def verify_saved_investigation(packet_path, ranking_path=None, graph_path=None, corpus_path=None,
                              queries_path=None, evaluation_path=None, selected_path=None, ui_path=None):
    """Offline verification; recomputes exact trace closure, never neural inference."""
    packet_path=Path(packet_path)
    graph_path=Path(graph_path or DATA/'graph-data.json')
    corpus_path=Path(corpus_path or DATA/'dataset.json')
    queries_path=Path(queries_path or DATA/'demonstration-queries.json')
    evaluation_path=Path(evaluation_path or DATA/'evaluation.json')
    selected_path=Path(selected_path or DATA/'model-run/selected-model.json')
    result=json.loads(packet_path.read_text())
    ranking_path=Path(ranking_path or result['completeRankingsPath'])
    raw=json.loads(ranking_path.read_text());graph=json.loads(graph_path.read_text())
    for key,path in [('corpus',corpus_path),('graph',graph_path),('queries',queries_path),
                     ('completeRankings',ranking_path),('wrapper',Path(__file__)),('traceEngine',SCRIPTS/'trace.py')]:
        if result['hashes'].get(key)!=sha(path):
            raise ValueError(f'Investigation receipt input changed: {key}')
    selection=model_selection(result['modelSelection']['requested'],evaluation_path,corpus_path,selected_path)
    if selection!=result['modelSelection']:
        raise ValueError('Saved model selection differs from matching final evaluation/configuration')
    queries=normalize_queries(json.loads(queries_path.read_text()))
    corpus=json.loads(corpus_path.read_text());documents=corpus if isinstance(corpus,list) else corpus['documents']
    source_ids={d.get('id',d.get('sourceId')) for d in documents}
    rankings=checked_rankings(raw,selection['resolved'],{q['id'] for q in queries},source_ids,sha(corpus_path),sha(queries_path))
    if source_ids!={s['id'] for s in graph['sources']}:
        raise ValueError('Saved trace graph and ranked corpus source IDs differ')
    if len(result['runs'])!=len(queries) or not result['runs']:
        raise ValueError('Missing saved investigation runs')
    request=result['runs'][0]['trace']['request']
    expected=make_runs(queries,rankings,graph,selection,request['maxHops'],request['maxEdges'],result['topK'],request['asOf'])
    if expected!=result['runs']:
        raise ValueError('Saved runs differ from deterministic ranked-source trace replay')
    if result.get('historicalForecastEligible') is not False or result.get('probabilitiesEstimated') is not False:
        raise ValueError('Investigation output cannot claim historical forecast or calibrated probabilities')
    if ui_path:
        ui=json.loads(Path(ui_path).read_text())
        if ui!=browser_projection(result,sha(packet_path),sha(ranking_path)):
            raise ValueError('Browser findings differ from full source-closed packets')
    return {'status':'verified','runs':len(queries),'rankedSourcesPerQuery':len(source_ids),
            'model':selection['resolved'],'rankingsSha256':sha(ranking_path),'packetsSha256':sha(packet_path),
            'traceReplayedWithoutInference':True}


def output_available(path, allow_pending_ui=False):
    if not path.exists():
        return
    if allow_pending_ui:
        try:
            value = json.loads(path.read_text())
            if value.get('status') == 'pending-actual-inference' and value.get('runs') == []:
                return
        except (ValueError, OSError, AttributeError):
            pass
    raise ValueError(f'Refusing to overwrite an executed output: {path}')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--query')
    group.add_argument('--queries', type=Path)
    group.add_argument('--demonstrations', action='store_true', help='Use the ten pre-output frozen questions; wait for final evaluation.')
    parser.add_argument('--model', choices=['default','candidate','base','bm25','mini'], default='default')
    parser.add_argument('--corpus', type=Path, default=DATA / 'dataset.json')
    parser.add_argument('--graph', type=Path, default=DATA / 'graph-data.json')
    parser.add_argument('--evaluation', type=Path, default=DATA / 'evaluation.json')
    parser.add_argument('--candidate-config', type=Path, default=DATA / 'model-run/selected-model.json')
    parser.add_argument('--depth', type=int, choices=[1,2,3], default=2)
    parser.add_argument('--as-of', '--asof', dest='as_of')
    parser.add_argument('--max-edges', type=int, default=150)
    parser.add_argument('--top-k', type=int, default=5)
    parser.add_argument('--output', type=Path, required=True, help='Full source-closed packets and execution receipt.')
    parser.add_argument('--ranking-output', type=Path, help='Preserve complete model rankings separately.')
    parser.add_argument('--rankings-input', type=Path, help='Repackage already executed, hash-bound rankings without model inference.')
    parser.add_argument('--ui-output', type=Path, help='Optional browser run artifact; may replace only an empty pending placeholder.')
    args = parser.parse_args()
    if not 1 <= args.top_k <= 50:
        raise ValueError('top-k must be 1–50')
    if not 1 <= args.max_edges <= 1000:
        raise ValueError('max-edges must be 1–1000')
    if args.as_of is not None and (len(args.as_of) != 10 or trace.retained_date(args.as_of) != args.as_of):
        raise ValueError('as-of must be YYYY-MM-DD')
    args.corpus=args.corpus.resolve(); args.graph=args.graph.resolve()
    selection = model_selection(args.model, args.evaluation, args.corpus, args.candidate_config)
    if args.demonstrations and not args.evaluation.is_file():
        raise ValueError('Frozen demonstration inference waits for completed independent evaluation')
    graph = json.loads(args.graph.read_text())
    trace.validate_graph(graph)
    corpus = json.loads(args.corpus.read_text())
    document_rows = corpus if isinstance(corpus, list) else corpus['documents']
    source_ids = {x.get('id', x.get('sourceId')) for x in document_rows}
    if len(source_ids) != len(document_rows) or source_ids != {x['id'] for x in graph['sources']}:
        raise ValueError('Corpus and canonical graph must have the exact same unique source IDs')
    queries_path = DATA / 'demonstration-queries.json' if args.demonstrations else args.queries
    if args.query is not None:
        queries = normalize_queries([{'id':'query-' + hashlib.sha256(args.query.encode()).hexdigest()[:12], 'text':args.query}])
    else:
        queries = normalize_queries(json.loads(queries_path.read_text()))
    # Frozen files remain byte-identical; ad hoc text gets its own retained query projection.
    projection_path = args.output.with_suffix('.queries.json') if args.query is not None else queries_path
    output_available(args.output)
    if args.query is not None:
        output_available(projection_path)
    ranking_path = args.rankings_input or args.ranking_output or args.output.with_suffix('.rankings.json')
    if not args.rankings_input:
        output_available(ranking_path)
    if args.ui_output:
        output_available(args.ui_output, allow_pending_ui=True)
    output_paths = [args.output.resolve(), ranking_path.resolve()]
    if args.ui_output:
        output_paths.append(args.ui_output.resolve())
    protected = {args.corpus,args.graph,args.evaluation.resolve(),args.candidate_config.resolve()}
    if queries_path:
        protected.add(queries_path.resolve())
    if len(output_paths) != len(set(output_paths)) or set(output_paths) & protected:
        raise ValueError('Outputs must be distinct and must not overwrite model/data/query inputs')
    if args.query is not None:
        write(projection_path, {'schemaVersion':1,'queries':queries})
    started = datetime.datetime.now(datetime.timezone.utc).isoformat()
    if not args.rankings_input:
        ranking_path.parent.mkdir(parents=True,exist_ok=True)
        command = [sys.executable, str(SCRIPTS / 'rank.py'), '--queries', str(projection_path.resolve()),
                   '--corpus', str(args.corpus), '--model', selection['resolved'],
                   '--candidate-config', str(args.candidate_config.resolve()), '--output', str(ranking_path.resolve())]
        subprocess.run(command, cwd=REPO, check=True)
    raw = json.loads(ranking_path.read_text())
    rankings = checked_rankings(raw,selection['resolved'],{q['id'] for q in queries},source_ids,sha(args.corpus),sha(projection_path))
    if selection['resolved'] in {'candidate','base'}:
        configuration=raw['comparators'][selection['resolved']]['configuration']
        if configuration.get('selectedConfigurationSha256') != sha(args.candidate_config):
            raise ValueError('Rankings use a different selected configuration')
    runs=make_runs(queries,rankings,graph,selection,args.depth,args.max_edges,args.top_k,args.as_of)
    result={'schemaVersion':1,'status':'executed','startedAtUtc':started,
            'completedAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'execution':'reused-hash-verified-rankings' if args.rankings_input else 'local-model-inference-and-exact-graph-trace',
            'modelSelection':selection,'publicTextUploadedToModelService':False,
            'hashes':{'corpus':sha(args.corpus),'graph':sha(args.graph),'queries':sha(projection_path),
                      'completeRankings':sha(ranking_path),'wrapper':sha(__file__),'traceEngine':sha(SCRIPTS / 'trace.py')},
            'completeRankingsPath':str(ranking_path),
            'queryKind':'pre-output-frozen-illustrations-not-test' if args.demonstrations else 'user-supplied-investigation',
            'topK':args.top_k,'sourceDatesFilteredAfterRanking':bool(args.as_of),
            'historicalForecastEligible':False,'probabilitiesEstimated':False,
            'limitations':['Source-summary retrieval, not verification of all originals.',
                'Graph closure is deterministic and source-backed; it does not discover a new factual connection.',
                'The illustrative questions are not an independent performance test.',
                'Sources are ranked before optional source-date graph filtering; later citations remain labelled context.'],
            'runs':runs}
    write(args.output,result)
    if args.ui_output:
        write(args.ui_output,browser_projection(result,sha(args.output),sha(ranking_path)))
    print(json.dumps({'status':'executed','model':selection['resolved'],'queries':len(runs),
                      'completeRankings':str(ranking_path),'packets':str(args.output),
                      'relationshipsDisplayed':sum(len(x['trace']['relationships']) for x in runs),
                      'inferredCashFlow':False,'probabilitiesEstimated':False}))


if __name__=='__main__':
    try:
        main()
    except (ValueError,KeyError,OSError,subprocess.CalledProcessError) as exc:
        print(f'investigate: {exc}',file=sys.stderr)
        raise SystemExit(2)
