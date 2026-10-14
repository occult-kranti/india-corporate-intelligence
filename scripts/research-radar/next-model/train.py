#!/usr/bin/env python3
"""Run a finite, pre-reviewed local retrieval experiment without test labels."""
import argparse
from collections import defaultdict
import datetime as dt
import gc
import importlib.metadata
import json
import math
from pathlib import Path
import platform
import random
import resource
import time

import numpy as np
import torch
from safetensors.torch import save_file

from encoder import (CACHE_ROOT, MODELS, adapter_state, embed, frozen_base_hash, load_encoder,
                     sha, tensor_hash, truncation_report, write_json)
from rank import bm25_scores, complete_rankings, dense_scores, rrf_scores, rows

ROOT = Path('research/research-radar/next-model')
CONFIG = {
    'schemaVersion': 1, 'seed': 20261008, 'epochs': 3, 'batchSize': 4,
    'learningRate': 0.0002, 'weightDecay': 0.01, 'rank': 8, 'alpha': 16,
    'temperature': 0.08, 'gradientClipNorm': 1.0, 'maxTokens': 256, 'cpuThreads': 4,
    'optimizer': 'AdamW', 'precision': 'float32', 'baseDropout': 'disabled',
    'loss': 'uniform-positive cross entropy against explicit query-specific hard negatives; all other sources masked',
    'families': ['e5', 'f2'],
    'configurations': [{'family': family, 'fusion': fusion} for family in ('e5', 'f2') for fusion in ('none', 'rrf')],
    'fusion': {'method': 'reciprocal rank fusion', 'constant': 60, 'weights': [1, 1],
               'members': ['BM25 k1=1.2 b=.75', 'dense encoder'], 'candidateRanks': 'complete corpus'},
    'selection': ['development case-macro nDCG@5 descending',
                  'development case-macro required-counterevidence recall@5 descending',
                  'fewer trainable parameters', 'earlier epoch', 'family ascending then fusion ascending'],
    'checkpointCandidates': 3, 'untunedBasesEligibleForCandidateSelection': False,
    'baseComparator': 'same selected family, precision, tokenization and fusion; adapter absent',
    'finalHoldout': 'independent evaluator only; this script never opens independent test queries or labels',
}


def now():
    return dt.datetime.now(dt.timezone.utc).isoformat()


def code_hashes():
    directory = Path(__file__).parent
    return {str(directory / name): sha(directory / name) for name in ('encoder.py', 'train.py', 'rank.py')}


def validate_dataset(dataset):
    documents = rows(dataset, 'documents')
    queries = rows(dataset, 'queries')
    by_id = {row['id']: row for row in documents}
    if any(q.get('split') not in ('train', 'dev') for q in queries):
        raise ValueError('Training dataset must contain only train/development query labels')
    if any(d.get('split') not in ('train', 'dev', 'test') for d in documents):
        raise ValueError('Unknown document split')
    for query in queries:
        positives, negatives = query.get('positiveIds', []), query.get('hardNegativeIds', [])
        if not positives or not negatives or len(set(positives + negatives)) != len(positives + negatives):
            raise ValueError(f'{query["id"]}: requires disjoint nonempty explicit positives and negatives')
        if any(identifier not in by_id for identifier in positives + negatives):
            raise ValueError(f'{query["id"]}: unknown source reference')
        eligible = ('train',) if query['split'] == 'train' else ('train', 'dev')
        if any(by_id[identifier]['split'] not in eligible for identifier in positives + negatives):
            raise ValueError(f'{query["id"]}: labels cross a forbidden split')
        if not query.get('caseId'):
            raise ValueError(f'{query["id"]}: case grouping is required')
        relevance = query.get('relevance', {identifier: 1 for identifier in positives})
        if any(type(grade) is not int or grade not in (0, 1, 2) for grade in relevance.values()):
            raise ValueError('Relevance grades must be integer 0, 1 or 2')
        if {identifier for identifier, grade in relevance.items() if grade > 0} != set(positives):
            raise ValueError('Positive IDs and graded relevance differ')
        if not set(query.get('requiredCounterevidenceIds', [])) <= set(positives):
            raise ValueError('Required counterevidence must be positively relevant')
    for field in ('family', 'groupId'):
        assigned = defaultdict(set)
        for document in documents:
            if not document.get(field):
                raise ValueError(f'Missing split grouping {field}')
            assigned[document[field]].add(document['split'])
        if any(len(splits) > 1 for splits in assigned.values()):
            raise ValueError(f'{field} crosses document splits')
    if not all(any(q['split'] == split for q in queries) for split in ('train', 'dev')):
        raise ValueError('Train and development queries must both be nonempty')
    return documents, queries


def metrics_for(queries, documents, scores):
    ranked = complete_rankings(queries, documents, scores)
    by_query = {row['queryId']: [item['sourceId'] for item in row['ranking']] for row in ranked}
    per_query = []
    for query in queries:
        relevance = query.get('relevance', {identifier: 1 for identifier in query['positiveIds']})
        ordered = by_query[query['id']]
        def dcg(grades):
            return sum((2 ** value - 1) / math.log2(index + 2) for index, value in enumerate(grades[:5]))
        ideal = dcg(sorted(relevance.values(), reverse=True))
        counter = query.get('requiredCounterevidenceIds', [])
        if not counter and query.get('counterevidence', False):
            counter = query['positiveIds']
        per_query.append({'queryId': query['id'], 'caseId': query['caseId'],
                          'ndcgAt5': dcg([relevance.get(identifier, 0) for identifier in ordered]) / ideal,
                          'counterevidenceRecallAt5': len(set(counter) & set(ordered[:5])) / len(counter) if counter else None})
    grouped = defaultdict(list)
    for record in per_query:
        grouped[record['caseId']].append(record)
    def mean(values):
        kept = [value for value in values if value is not None]
        return sum(kept) / len(kept) if kept else None
    per_case = [{'caseId': case, 'ndcgAt5': mean([row['ndcgAt5'] for row in values]),
                 'counterevidenceRecallAt5': mean([row['counterevidenceRecallAt5'] for row in values])}
                for case, values in sorted(grouped.items())]
    return {'caseMacro': {'ndcgAt5': mean([row['ndcgAt5'] for row in per_case]),
                          'counterevidenceRecallAt5': mean([row['counterevidenceRecallAt5'] for row in per_case])},
            'queryCount': len(queries), 'caseCount': len(grouped), 'perCase': per_case, 'perQuery': per_query}


def selection_key(record):
    metric = record['metrics']['caseMacro']
    return (-metric['ndcgAt5'], -(metric['counterevidenceRecallAt5'] or 0.0),
            record['trainableParameters'], record['epoch'], record['family'], record['fusion'])


def masked_contrastive_loss(logits, batch, positions):
    """Unlabelled in-batch documents cannot affect a query's denominator."""
    losses = []
    for index, query in enumerate(batch):
        allowed = query['positiveIds'] + query['hardNegativeIds']
        selected = logits[index, [positions[identifier] for identifier in allowed]]
        log_probabilities = torch.log_softmax(selected, dim=0)
        losses.append(-log_probabilities[:len(query['positiveIds'])].mean())
    return torch.stack(losses).mean()


def make_freeze(dataset_path, output):
    if (output / 'experiment-freeze.json').exists() or (output / 'run-started.json').exists():
        raise ValueError('A freeze already exists. Preserve it and choose a new run directory.')
    dataset = json.loads(dataset_path.read_text())
    documents, queries = validate_dataset(dataset)
    for source in dataset.get('inputHashes', []):
        if sha(source['path']) != source['sha256']:
            raise ValueError(f'Stale data input: {source["path"]}')
    output.mkdir(parents=True, exist_ok=True)
    write_json(output / 'training-config.json', CONFIG)
    freeze = {'schemaVersion': 1, 'frozenAt': now(), 'datasetPath': str(dataset_path),
              'datasetSha256': sha(dataset_path), 'configurationSha256': sha(output / 'training-config.json'),
              'codeHashes': code_hashes(), 'inputHashes': dataset.get('inputHashes', []),
              'splitCounts': {split: {'documents': sum(d['split'] == split for d in documents),
                                       'queries': sum(q['split'] == split for q in queries)}
                              for split in ('train', 'dev', 'test')},
              'models': {family: {'modelId': MODELS[family]['modelId'], 'revision': MODELS[family]['revision']}
                         for family in CONFIG['families']},
              'developmentPredictionsMade': False, 'testLabelsRead': False}
    write_json(output / 'experiment-freeze.json', freeze)
    print(json.dumps({'freeze': str(output / 'experiment-freeze.json'),
                      'sha256': sha(output / 'experiment-freeze.json'), 'counts': freeze['splitCounts']}), flush=True)


def verify_freeze(output, review_path):
    freeze_path = output / 'experiment-freeze.json'
    freeze = json.loads(freeze_path.read_text())
    review = json.loads(review_path.read_text())
    if review.get('approved') is not True or review.get('freezeSha256') != sha(freeze_path) or not review.get('reviewer'):
        raise ValueError('Independent code/config review must approve this exact freeze')
    if sha(output / 'training-config.json') != freeze['configurationSha256']:
        raise ValueError('Frozen configuration changed')
    if json.loads((output / 'training-config.json').read_text()) != CONFIG:
        raise ValueError('Executable configuration differs from the freeze')
    if sha(freeze['datasetPath']) != freeze['datasetSha256'] or code_hashes() != freeze['codeHashes']:
        raise ValueError('Frozen dataset or executable changed')
    for source in freeze['inputHashes']:
        if sha(source['path']) != source['sha256']:
            raise ValueError(f'Frozen input changed: {source["path"]}')
    return freeze


def train(output, cache_root, review_path):
    if (output / 'run-started.json').exists() or (output / 'training-receipt.json').exists():
        raise ValueError('An invoked run exists; never silently overwrite or restart it')
    freeze = verify_freeze(output, review_path)
    documents, queries = validate_dataset(json.loads(Path(freeze['datasetPath']).read_text()))
    training_docs = [row for row in documents if row['split'] == 'train']
    development_docs = [row for row in documents if row['split'] in ('train', 'dev')]
    train_queries = [row for row in queries if row['split'] == 'train']
    dev_queries = [row for row in queries if row['split'] == 'dev']
    train_lookup = {row['id']: row for row in training_docs}
    torch.set_num_threads(CONFIG['cpuThreads'])
    torch.set_num_interop_threads(1)
    torch.use_deterministic_algorithms(True)
    started = time.perf_counter()
    invocation = {'startedAt': now(), 'freezeSha256': sha(output / 'experiment-freeze.json'),
                  'reviewSha256': sha(review_path), 'testLabelsRead': False}
    write_json(output / 'run-started.json', invocation)
    score_dir = output / 'development-scores'
    score_dir.mkdir()
    write_json(output / 'development-index.json', {'queryIds': [q['id'] for q in dev_queries],
                                                   'sourceIds': [d['id'] for d in development_docs]})
    lexical = bm25_scores(dev_queries, development_docs)
    np.save(score_dir / 'bm25.npy', lexical, allow_pickle=False)
    baseline_metrics = {'bm25': metrics_for(dev_queries, development_docs, lexical)}
    candidates, family_receipts = [], []
    for family in CONFIG['families']:
        random.seed(CONFIG['seed'])
        torch.manual_seed(CONFIG['seed'])
        family_started = time.perf_counter()
        model, tokenizer, targets, manifest = load_encoder(family, cache_root, with_adapter=True,
                                                           rank=CONFIG['rank'], alpha=CONFIG['alpha'])
        trainable = [(name, parameter) for name, parameter in model.named_parameters() if parameter.requires_grad]
        count = sum(parameter.numel() for _, parameter in trainable)
        if count != MODELS[family]['expectedTrainableParameters'] or any('.lora_' not in name for name, _ in trainable):
            raise ValueError('Unexpected trainable parameter boundary')
        initial = adapter_state(model)
        initial_hash = tensor_hash(initial)
        base_before = frozen_base_hash(model)
        save_file(initial, str(output / f'{family}-initial-adapter.safetensors'))
        write_json(output / f'{family}-base-assets.json', manifest)
        truncation = {
            'trainDocuments': truncation_report(tokenizer, family, [d['text'] for d in training_docs]),
            'trainQueries': truncation_report(tokenizer, family, [q['text'] for q in train_queries], query=True),
            'developmentDocuments': truncation_report(tokenizer, family, [d['text'] for d in development_docs]),
            'developmentQueries': truncation_report(tokenizer, family, [q['text'] for q in dev_queries], query=True),
        }
        dense = dense_scores(model, tokenizer, family, dev_queries, development_docs)
        np.save(score_dir / f'{family}-epoch-0.npy', dense, allow_pickle=False)
        baseline_metrics[family] = {'none': metrics_for(dev_queries, development_docs, dense),
                                    'rrf': metrics_for(dev_queries, development_docs, rrf_scores(dense, lexical, development_docs))}
        optimizer = torch.optim.AdamW([parameter for _, parameter in trainable], lr=CONFIG['learningRate'],
                                     weight_decay=CONFIG['weightDecay'])
        generator = random.Random(CONFIG['seed'])
        steps, history = 0, []
        print(json.dumps({'family': family, 'trainableParameters': count, 'trainingQueries': len(train_queries),
                          'developmentQueries': len(dev_queries), 'baseline': baseline_metrics[family]}), flush=True)
        for epoch in range(1, CONFIG['epochs'] + 1):
            order = list(range(len(train_queries)))
            generator.shuffle(order)
            losses, batch_records = [], []
            for start in range(0, len(order), CONFIG['batchSize']):
                batch = [train_queries[index] for index in order[start:start + CONFIG['batchSize']]]
                identifiers = sorted({identifier for query in batch for identifier in query['positiveIds'] + query['hardNegativeIds']})
                positions = {identifier: index for index, identifier in enumerate(identifiers)}
                optimizer.zero_grad(set_to_none=True)
                doc_vectors = embed(model, tokenizer, family, [train_lookup[identifier]['text'] for identifier in identifiers],
                                    max_tokens=CONFIG['maxTokens'], batch_size=4, gradients=True)
                query_vectors = embed(model, tokenizer, family, [query['text'] for query in batch], query=True,
                                      max_tokens=CONFIG['maxTokens'], batch_size=4, gradients=True)
                logits = query_vectors @ doc_vectors.T / CONFIG['temperature']
                loss = masked_contrastive_loss(logits, batch, positions)
                if not torch.isfinite(loss):
                    raise ValueError('Nonfinite training objective')
                loss.backward()
                gradient = torch.nn.utils.clip_grad_norm_([p for _, p in trainable], CONFIG['gradientClipNorm'])
                if not torch.isfinite(gradient):
                    raise ValueError('Nonfinite gradient')
                optimizer.step()
                steps += 1
                losses.append(float(loss.detach()))
                batch_records.append({'queryIds': [q['id'] for q in batch], 'encodedSourceIds': identifiers})
                if steps % 10 == 0:
                    print(json.dumps({'family': family, 'epoch': epoch, 'optimizerSteps': steps,
                                      'latestLoss': losses[-1],
                                      'familyElapsedSeconds': round(time.perf_counter() - family_started, 2)}), flush=True)
            state = adapter_state(model)
            delta = math.sqrt(sum(float(((state[name] - initial[name]) ** 2).sum()) for name in state))
            if not math.isfinite(delta) or delta <= 0:
                raise ValueError('No finite actual adapter update')
            checkpoint = output / f'{family}-epoch-{epoch}-adapter.safetensors'
            save_file(state, str(checkpoint))
            dense = dense_scores(model, tokenizer, family, dev_queries, development_docs)
            np.save(score_dir / f'{family}-epoch-{epoch}.npy', dense, allow_pickle=False)
            epoch_records = []
            for fusion in ('none', 'rrf'):
                scores = dense if fusion == 'none' else rrf_scores(dense, lexical, development_docs)
                record = {'family': family, 'fusion': fusion, 'epoch': epoch, 'trainableParameters': count,
                          'metrics': metrics_for(dev_queries, development_docs, scores),
                          'adapterPath': str(checkpoint), 'adapterSha256': sha(checkpoint), 'adapterDeltaL2': delta,
                          'adapterTensorHash': tensor_hash(state)}
                candidates.append(record)
                epoch_records.append(record)
            history.append({'epoch': epoch, 'optimizerSteps': steps, 'meanTrainingLoss': sum(losses) / len(losses),
                            'batches': batch_records, 'configurations': epoch_records})
            print(json.dumps({'family': family, 'epoch': epoch, 'steps': steps, 'meanLoss': history[-1]['meanTrainingLoss'],
                              'development': {r['fusion']: r['metrics']['caseMacro'] for r in epoch_records}}), flush=True)
        base_after = frozen_base_hash(model)
        if base_after != base_before:
            raise ValueError('Frozen base weights changed')
        family_receipts.append({'family': family, 'baseModelId': manifest['modelId'], 'revision': manifest['revision'],
                                'trainableParameters': count, 'trainableNames': [name for name, _ in trainable],
                                'targetModules': targets, 'initialAdapterTensorHash': initial_hash,
                                'frozenBaseTensorHashBefore': base_before, 'frozenBaseTensorHashAfter': base_after,
                                'optimizerSteps': steps, 'epochs': CONFIG['epochs'], 'history': history,
                                'truncation': truncation, 'elapsedSeconds': round(time.perf_counter() - family_started, 3)})
        del model, tokenizer, optimizer, trainable, initial, state, doc_vectors, query_vectors, loss, logits
        gc.collect()
        verify_freeze(output, review_path)
    selected = sorted(candidates, key=selection_key)[0]
    selection = {**selected, 'schemaVersion': 1, 'maxTokens': CONFIG['maxTokens'],
                 'selectionRule': CONFIG['selection'], 'selectedAt': now(),
                 'purpose': 'source relevance, never factual proof or personal wrongdoing prediction',
                 'promoted': False, 'promotionPendingIndependentEvaluation': True,
                 'freezeSha256': sha(output / 'experiment-freeze.json')}
    write_json(output / 'selected-model.json', selection)
    artifacts = {str(path.relative_to(output)): sha(path) for path in sorted(output.rglob('*')) if path.is_file()}
    receipt = {'schemaVersion': 1, 'status': 'executed', 'startedAt': invocation['startedAt'], 'completedAt': now(),
               'elapsedSeconds': round(time.perf_counter() - started, 3), 'device': 'cpu',
               'maxResidentSetKiB': resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,
               'python': platform.python_version(), 'platform': platform.platform(),
               'runtime': {name: importlib.metadata.version(name) for name in ('torch', 'transformers', 'numpy', 'safetensors', 'tokenizers')},
               'freezeSha256': sha(output / 'experiment-freeze.json'), 'reviewSha256': sha(review_path),
               'datasetSha256': freeze['datasetSha256'], 'codeHashes': freeze['codeHashes'],
               'publicTextUploadedToModelService': False, 'testLabelsRead': False,
               'testDocumentsEncodedForOptimizationOrSelection': False,
               'trainingQueryIds': [q['id'] for q in train_queries], 'trainingCandidateIds': sorted(train_lookup),
               'developmentQueryIds': [q['id'] for q in dev_queries],
               'developmentCandidateIds': [d['id'] for d in development_docs],
               'baselineDevelopmentMetrics': baseline_metrics, 'families': family_receipts,
               'selectedConfiguration': selected, 'artifactHashes': artifacts,
               'limitations': ['Agent-authored relevance judgements over selected summaries, not full source originals.',
                               'Unknown pretrained exposure; no personal guilt, causal mechanism or corruption probability is trained.',
                               'Numerical outcome forecasting requires separate resolved temporal-cohort validation.']}
    write_json(output / 'training-receipt.json', receipt)
    print(json.dumps({'status': 'executed', 'selected': {key: selected[key] for key in ('family', 'fusion', 'epoch')},
                      'seconds': receipt['elapsedSeconds'], 'maxResidentSetKiB': receipt['maxResidentSetKiB']}), flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dataset', type=Path, default=ROOT / 'dataset.json')
    parser.add_argument('--output', type=Path, default=ROOT / 'model-run')
    parser.add_argument('--cache-root', type=Path, default=CACHE_ROOT)
    parser.add_argument('--review', type=Path, default=ROOT / 'preflight-review.json')
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--freeze', action='store_true')
    group.add_argument('--run', action='store_true')
    args = parser.parse_args()
    if args.freeze:
        make_freeze(args.dataset, args.output)
    else:
        train(args.output, args.cache_root, args.review)


if __name__ == '__main__':
    main()
