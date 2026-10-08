#!/usr/bin/env python3
"""Actually optimize a small local retrieval adapter; never fit a wrongdoing label."""
import argparse
import datetime as dt
import hashlib
import importlib.metadata
import json
import math
import os
from pathlib import Path
import platform
import random
import time

os.environ.setdefault('HF_HUB_OFFLINE', '1')
os.environ.setdefault('TRANSFORMERS_OFFLINE', '1')
os.environ.setdefault('TOKENIZERS_PARALLELISM', 'false')

import torch
from safetensors.torch import save_file

from encoder import adapter_state, embed, frozen_base_hash, load_adapter, load_encoder, tensor_hash
from metrics import evaluate_rankings
from prepare_assets import DEFAULT_CACHE, prepare, sha

ROOT = Path('research/research-radar/fine-tuning')
CONFIG = {
    'seed': 20261007, 'epochs': 8, 'batchSize': 8, 'learningRate': 0.0001,
    'weightDecay': 0.01, 'rank': 8, 'alpha': 16, 'temperature': 0.08,
    'gradientClipNorm': 1.0, 'maxTokens': 256, 'cpuThreads': 4,
    'targetModules': ['query', 'value'], 'baseDropout': 'disabled',
    'pooling': 'attention-mask weighted mean, L2 normalized',
    'optimizer': 'AdamW', 'loss': 'uniform-positive cross entropy over all training documents',
    'selection': 'development caseMacro nDCG@5, then MRR@10, then Recall@5; earliest tied epoch',
}


def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + '\n')


def rankings_for(model, tokenizer, queries, documents):
    doc_vectors = embed(model, tokenizer, [row['text'] for row in documents], max_tokens=CONFIG['maxTokens'])
    query_vectors = embed(model, tokenizer, [row['text'] for row in queries], max_tokens=CONFIG['maxTokens'])
    scores = (query_vectors @ doc_vectors.T).detach().cpu().tolist()
    return {query['id']: [documents[i]['id'] for i in sorted(range(len(documents)),
            key=lambda i: (-scores[q][i], documents[i]['id']))] for q, query in enumerate(queries)}


def selection_key(metrics):
    scores = metrics['caseMacro']
    return (scores['ndcgAt5'], scores['mrrAt10'], scores['recallAt5'])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dataset', type=Path, default=ROOT / 'dataset.json')
    parser.add_argument('--output', type=Path, default=ROOT)
    parser.add_argument('--cache', type=Path, default=DEFAULT_CACHE)
    args = parser.parse_args()
    output = args.output
    output.mkdir(parents=True, exist_ok=True)
    if (output / 'training-receipt.json').exists():
        raise ValueError('An executed run already exists here. Use a new output directory; never overwrite a run.')
    # Only the hash of the sealed test labels is read before training. Test query
    # text, relevance judgments and test document text are never passed to a step.
    frozen_paths = [args.dataset, ROOT / 'train-dev-labels.json', ROOT / 'test-labels.json',
                    Path('docs/research-radar/fine-tuning/EVALUATION-PROTOCOL.md')]
    input_hashes = {str(path): sha(path) for path in frozen_paths}
    code_paths = sorted(Path(__file__).parent.glob('*.py'))
    code_hashes = {str(path.resolve().relative_to(Path.cwd())): sha(path) for path in code_paths}
    dataset = json.loads(args.dataset.read_text())
    for source in dataset['inputHashes']:
        if sha(source['path']) != source['sha256']:
            raise ValueError(f'Dataset is stale against {source["path"]}')
    training_docs = [row for row in dataset['documents'] if row['split'] == 'train']
    development_docs = [row for row in dataset['documents'] if row['split'] in ('train', 'dev')]
    train_queries = [row for row in dataset['queries'] if row['split'] == 'train']
    dev_queries = [row for row in dataset['queries'] if row['split'] == 'dev']
    if not all((training_docs, development_docs, train_queries, dev_queries)):
        raise ValueError('Both training and development splits must be nonempty')
    train_ids = {row['id'] for row in training_docs}
    if any(not set(q['positiveIds'] + q.get('hardNegativeIds', [])).issubset(train_ids) for q in train_queries):
        raise ValueError('Training labels cross the training document boundary')
    if any(row['split'] == 'test' for row in dataset['queries']):
        raise ValueError('Test labels must stay in the separate sealed file')
    write(output / 'training-config.json', CONFIG)
    config_hash = sha(output / 'training-config.json')
    manifest = prepare(args.cache, offline=True)
    write(output / 'base-assets.json', manifest)
    random.seed(CONFIG['seed'])
    torch.manual_seed(CONFIG['seed'])
    torch.set_num_threads(CONFIG['cpuThreads'])
    torch.set_num_interop_threads(1)
    torch.use_deterministic_algorithms(True)
    model, tokenizer, targets = load_encoder(args.cache, CONFIG)
    trainable = [(name, parameter) for name, parameter in model.named_parameters() if parameter.requires_grad]
    parameter_count = sum(parameter.numel() for _, parameter in trainable)
    if parameter_count != 73_728 or any('.lora_' not in name for name, _ in trainable):
        raise ValueError('Unexpected trainable parameter boundary')
    initial_state = {key: tensor.clone() for key, tensor in adapter_state(model).items()}
    initial_hash = tensor_hash(initial_state)
    base_hash_before = frozen_base_hash(model)
    save_file(initial_state, str(output / 'initial-adapter.safetensors'))
    optimizer = torch.optim.AdamW([parameter for _, parameter in trainable],
        lr=CONFIG['learningRate'], weight_decay=CONFIG['weightDecay'])
    baseline_rankings = rankings_for(model, tokenizer, dev_queries, development_docs)
    baseline_metrics = evaluate_rankings(dev_queries, development_docs, baseline_rankings)
    history, best, best_state, best_epoch, best_rankings = [], None, None, None, None
    index = {document['id']: i for i, document in enumerate(training_docs)}
    steps = 0
    started_at = dt.datetime.now(dt.timezone.utc).isoformat()
    started = time.perf_counter()
    generator = random.Random(CONFIG['seed'])
    print(f'Training {parameter_count:,} LoRA parameters on {len(train_queries)} queries and {len(training_docs)} source summaries.', flush=True)
    for epoch in range(1, CONFIG['epochs'] + 1):
        order = list(range(len(train_queries)))
        generator.shuffle(order)
        losses = []
        for start in range(0, len(order), CONFIG['batchSize']):
            batch = [train_queries[i] for i in order[start:start + CONFIG['batchSize']]]
            optimizer.zero_grad(set_to_none=True)
            doc_vectors = embed(model, tokenizer, [row['text'] for row in training_docs], max_tokens=CONFIG['maxTokens'], gradients=True)
            query_vectors = embed(model, tokenizer, [row['text'] for row in batch], max_tokens=CONFIG['maxTokens'], gradients=True)
            logits = query_vectors @ doc_vectors.T / CONFIG['temperature']
            log_probabilities = torch.log_softmax(logits, dim=1)
            loss = torch.stack([-log_probabilities[i, [index[id] for id in q['positiveIds']]].mean()
                                for i, q in enumerate(batch)]).mean()
            if not torch.isfinite(loss):
                raise ValueError('Nonfinite training loss')
            loss.backward()
            norm = torch.nn.utils.clip_grad_norm_([parameter for _, parameter in trainable], CONFIG['gradientClipNorm'])
            if not torch.isfinite(norm):
                raise ValueError('Nonfinite adapter gradient')
            optimizer.step()
            steps += 1
            losses.append(float(loss.detach()))
        rankings = rankings_for(model, tokenizer, dev_queries, development_docs)
        metrics = evaluate_rankings(dev_queries, development_docs, rankings)
        key = selection_key(metrics)
        entry = {'epoch': epoch, 'optimizerSteps': steps, 'meanTrainingLoss': sum(losses) / len(losses),
                 'developmentMetrics': metrics, 'developmentRankings': rankings}
        history.append(entry)
        if best is None or key > best:
            best, best_epoch, best_rankings = key, epoch, rankings
            best_state = {name: value.clone() for name, value in adapter_state(model).items()}
        print(json.dumps({'epoch': epoch, 'meanLoss': round(entry['meanTrainingLoss'], 6),
                          'devCaseNdcgAt5': round(key[0], 6), 'bestEpoch': best_epoch}), flush=True)
    assert best_state is not None
    load_adapter(model, best_state)
    base_hash_after = frozen_base_hash(model)
    if base_hash_after != base_hash_before:
        raise ValueError('Frozen base weights changed')
    delta_norm = math.sqrt(sum(float(((best_state[key] - initial_state[key]) ** 2).sum()) for key in best_state))
    if not math.isfinite(delta_norm) or delta_norm <= 0:
        raise ValueError('No actual finite adapter parameter update')
    save_file(best_state, str(output / 'adapter.safetensors'))
    adapter_config = {'schemaVersion': 1, 'baseModelId': manifest['modelId'], 'baseRevision': manifest['revision'],
                      'license': 'Apache-2.0', 'rank': CONFIG['rank'], 'alpha': CONFIG['alpha'],
                      'targetModules': targets, 'trainableParameters': parameter_count,
                      'maxTokens': CONFIG['maxTokens'], 'pooling': CONFIG['pooling'],
                      'format': 'custom LoRA safetensors; load with encoder.py',
                      'purpose': 'public-source-retrieval-only', 'automaticallyVerified': False}
    write(output / 'adapter_config.json', adapter_config)
    for path, digest in input_hashes.items():
        if sha(path) != digest:
            raise ValueError(f'Frozen input changed during training: {path}')
    for path, digest in code_hashes.items():
        if sha(path) != digest:
            raise ValueError(f'Executable changed during training: {path}')
    receipt = {'schemaVersion': 1, 'status': 'executed', 'purpose': 'supervised-public-source-retrieval',
               'startedAt': started_at, 'completedAt': dt.datetime.now(dt.timezone.utc).isoformat(),
               'trainingSeconds': round(time.perf_counter() - started, 3), 'device': 'cpu',
               'python': platform.python_version(), 'platform': platform.platform(),
               'runtime': {name: importlib.metadata.version(name) for name in ('torch', 'transformers', 'safetensors', 'numpy', 'tokenizers')},
               'publicTextUploadedToModelService': False, 'configSha256': config_hash,
               'inputHashes': input_hashes, 'codeHashes': code_hashes,
               'trainingQueryIds': [q['id'] for q in train_queries], 'trainingDocumentIds': sorted(train_ids),
               'developmentQueryIds': [q['id'] for q in dev_queries],
               'developmentCandidateIds': [d['id'] for d in development_docs],
               'testLabelsUsedForOptimization': False, 'testDocumentsEncodedDuringTrainingOrSelection': False,
               'trainableParameterNames': [name for name, _ in trainable], 'trainableParameters': parameter_count,
               'optimizerSteps': steps, 'selectedEpoch': best_epoch, 'initialAdapterTensorHash': initial_hash,
               'selectedAdapterTensorHash': tensor_hash(best_state), 'adapterDeltaL2': delta_norm,
               'baseTensorHashBefore': base_hash_before, 'baseTensorHashAfter': base_hash_after,
               'baselineDevelopmentMetrics': baseline_metrics, 'baselineDevelopmentRankings': baseline_rankings,
               'selectedDevelopmentRankings': best_rankings, 'history': history,
               'artifactHashes': {name: sha(output / name) for name in ('adapter.safetensors', 'initial-adapter.safetensors', 'adapter_config.json', 'base-assets.json')},
               'limitations': ['Small agent-authored relevance pilot; relevance is not truth or guilt.',
                               'No resolved-outcome forecasting labels or calibrated probabilities were trained.',
                               'Primary-entity and case/source-family holdout, not universal entity independence.']}
    write(output / 'training-receipt.json', receipt)
    print(f'Executed {steps} optimizer steps. Selected epoch {best_epoch}; adapter delta L2={delta_norm:.6f}.', flush=True)


if __name__ == '__main__':
    main()
