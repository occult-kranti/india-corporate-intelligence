#!/usr/bin/env python3
"""Execute the sealed test once after checkpoint selection, retaining every ranking."""
import argparse
from collections import Counter
import datetime as dt
import importlib.metadata
import importlib.util
import json
import math
import os
from pathlib import Path
import random
import re
import time

os.environ.setdefault('HF_HUB_OFFLINE', '1')
os.environ.setdefault('TRANSFORMERS_OFFLINE', '1')
os.environ.setdefault('TOKENIZERS_PARALLELISM', 'false')

import numpy as np
import torch
from safetensors.torch import load_file

from encoder import embed, load_adapter, load_encoder
from metrics import evaluate_rankings
from policy import promotion_decision
from prepare_assets import DEFAULT_CACHE, prepare, sha

ROOT = Path('research/research-radar/fine-tuning')


def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + '\n')


def complete_rankings(queries, documents, score_matrix):
    if score_matrix.shape != (len(queries), len(documents)) or not np.isfinite(score_matrix).all():
        raise ValueError('Invalid complete ranking score matrix')
    rankings, scores = {}, {}
    for i, query in enumerate(queries):
        order = sorted(range(len(documents)), key=lambda j: (-float(score_matrix[i, j]), documents[j]['id']))
        rankings[query['id']] = [documents[j]['id'] for j in order]
        scores[query['id']] = {documents[j]['id']: float(score_matrix[i, j]) for j in order}
    return rankings, scores


def torch_scores(model, tokenizer, queries, documents, max_tokens=256):
    docs = embed(model, tokenizer, [document['text'] for document in documents], max_tokens=max_tokens)
    query = embed(model, tokenizer, [item['text'] for item in queries], max_tokens=max_tokens)
    return (query @ docs.T).cpu().numpy()


def bm25_scores(queries, documents):
    """Frozen lexical baseline: Unicode word tokens, no stopwords, k1=1.2 b=.75."""
    tokenize = lambda text: re.findall(r'\w+', text.lower(), flags=re.UNICODE)
    tokens = [tokenize(document['text']) for document in documents]
    counts = [Counter(row) for row in tokens]
    df = Counter(token for row in tokens for token in set(row))
    average_length = sum(map(len, tokens)) / len(tokens)
    result = np.zeros((len(queries), len(documents)))
    for i, query in enumerate(queries):
        for token in set(tokenize(query['text'])):
            frequency = df.get(token, 0)
            idf = math.log(1 + (len(tokens) - frequency + .5) / (frequency + .5))
            for j, count in enumerate(counts):
                tf = count.get(token, 0)
                denominator = tf + 1.2 * (1 - .75 + .75 * len(tokens[j]) / average_length)
                result[i, j] += idf * tf * (1.2 + 1) / denominator
    return result


def onnx_scores(queries, documents, cache=Path('/tmp/india-education-model-cache')):
    import onnxruntime as ort
    from tokenizers import Tokenizer
    path = Path('scripts/education/model-rank.py')
    spec = importlib.util.spec_from_file_location('original_model_assets', path)
    engine = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(engine)
    tokenizer = Tokenizer.from_file(str(engine.asset(cache, 'tokenizer.json', offline=True)))
    tokenizer.enable_truncation(max_length=256)
    tokenizer.enable_padding(pad_id=0, pad_token='[PAD]')
    options = ort.SessionOptions()
    options.intra_op_num_threads = 4
    options.inter_op_num_threads = 1
    session = ort.InferenceSession(str(engine.asset(cache, 'onnx/model_quint8_avx2.onnx', offline=True)),
                                  sess_options=options, providers=['CPUExecutionProvider'])

    def encode(texts):
        vectors = []
        for start in range(0, len(texts), 16):
            batch = tokenizer.encode_batch(texts[start:start + 16])
            values = {'input_ids': np.asarray([item.ids for item in batch], dtype=np.int64),
                      'attention_mask': np.asarray([item.attention_mask for item in batch], dtype=np.int64),
                      'token_type_ids': np.asarray([item.type_ids for item in batch], dtype=np.int64)}
            hidden = session.run(None, {item.name: values[item.name] for item in session.get_inputs()})[0]
            mask = values['attention_mask'][:, :, None]
            means = (hidden * mask).sum(1) / np.clip(mask.sum(1), 1, None)
            vectors.append(means / np.clip(np.linalg.norm(means, axis=1, keepdims=True), 1e-12, None))
        return np.concatenate(vectors)
    return encode([q['text'] for q in queries]) @ encode([d['text'] for d in documents]).T


def bootstrap(systems):
    candidate = {row['caseId']: row['metrics']['ndcgAt5'] for row in systems['candidate']['metrics']['perCase']}
    base = {row['caseId']: row['metrics']['ndcgAt5'] for row in systems['base_fp32']['metrics']['perCase']}
    differences = [candidate[id] - base[id] for id in sorted(base)]
    generator = random.Random(20261007)
    values = sorted(sum(generator.choice(differences) for _ in differences) / len(differences)
                    for _ in range(10_000))
    return {'metric': 'case-macro nDCG@5 candidate minus untuned FP32', 'seed': 20261007,
            'caseGroups': len(differences), 'resamples': len(values),
            'meanDifference': sum(differences) / len(differences),
            'percentileInterval95': [values[249], values[9749]],
            'interpretation': 'Exploratory paired case-group resampling; five selected groups do not establish national generalization.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=ROOT)
    parser.add_argument('--cache', type=Path, default=DEFAULT_CACHE)
    parser.add_argument('--onnx-cache', type=Path, default=Path('/tmp/india-education-model-cache'))
    args = parser.parse_args()
    root = args.root
    if (root / 'evaluation.json').exists() or (root / 'test-invocation.json').exists():
        raise ValueError('The sealed test has already been invoked. Retain that run; do not tune against it.')
    receipt = json.loads((root / 'training-receipt.json').read_text())
    if sha(root / 'training-config.json') != receipt['configSha256']:
        raise ValueError('Training configuration changed after execution')
    freeze = json.loads((root / 'test-freeze-receipt.json').read_text())
    if dt.datetime.fromisoformat(freeze['frozenAtUtc']) >= dt.datetime.fromisoformat(receipt['startedAt']):
        raise ValueError('The independent holdout must predate training')
    for item in freeze['files']:
        if sha(item['path']) != item['sha256']:
            raise ValueError(f'Independent evaluation freeze changed: {item["path"]}')
    for path, digest in {**receipt['inputHashes'], **receipt['codeHashes']}.items():
        if sha(path) != digest:
            raise ValueError(f'Training provenance changed: {path}')
    for name, digest in receipt['artifactHashes'].items():
        if sha(root / name) != digest:
            raise ValueError(f'Trained artifact changed: {name}')
    if sha(root / 'test-labels.json') != 'e9f21dda1111df290fb0fb06b810d8f70e100b40d2fca8c45ab6bfe1fa22c5df':
        raise ValueError('Independent test labels changed')
    prepare(args.cache, offline=True)
    dataset = json.loads((root / 'dataset.json').read_text())
    test = json.loads((root / 'test-labels.json').read_text())
    queries = test['queries']
    documents = dataset['documents']
    config = json.loads((root / 'training-config.json').read_text())
    torch.manual_seed(config['seed'])
    torch.set_num_threads(config['cpuThreads'])
    torch.set_num_interop_threads(1)
    torch.use_deterministic_algorithms(True)
    code = {str(path.resolve().relative_to(Path.cwd())): sha(path) for path in Path(__file__).parent.glob('*.py')}
    code['scripts/education/model-rank.py'] = sha('scripts/education/model-rank.py')
    original_spec = importlib.util.spec_from_file_location('original_provenance', 'scripts/education/model-rank.py')
    original = importlib.util.module_from_spec(original_spec)
    original_spec.loader.exec_module(original)
    original_assets = {name: {'sha256': values[0], 'bytes': values[1]} for name, values in original.ASSETS.items()}
    started_at = dt.datetime.now(dt.timezone.utc).isoformat()
    write(root / 'test-invocation.json', {'startedAt': started_at, 'trainingReceiptSha256': sha(root / 'training-receipt.json'),
          'testLabelsSha256': sha(root / 'test-labels.json'), 'executableHashes': code,
          'policy': 'One selected checkpoint; no test-driven retraining or label revision.'})
    started = time.perf_counter()
    systems = {}

    def retain(name, scores, settings):
        rankings, values = complete_rankings(queries, documents, scores)
        systems[name] = {'configuration': settings, 'rankings': rankings, 'scores': values,
                         'metrics': evaluate_rankings(queries, documents, rankings)}
        print(json.dumps({'system': name, 'caseMacro': systems[name]['metrics']['caseMacro']}), flush=True)

    retain('bm25', bm25_scores(queries, documents), {'k1': 1.2, 'b': .75, 'tokens': 'Unicode word tokens, lowercase, no stopword removal', 'queryTerms': 'unique', 'labelFitting': False})
    model, tokenizer, _ = load_encoder(args.cache, config, with_adapter=False)
    retain('base_fp32', torch_scores(model, tokenizer, queries, documents, config['maxTokens']),
           {'revision': prepare(args.cache, offline=True)['revision'], 'precision': 'float32', 'adapter': False})
    del model
    retain('base_onnx_uint8', onnx_scores(queries, documents, args.onnx_cache),
           {'precision': 'uint8 AVX2', 'runtime': 'onnxruntime CPUExecutionProvider', 'assetManifest': 'scripts/education/model-rank.py'})
    model, tokenizer, _ = load_encoder(args.cache, config)
    load_adapter(model, load_file(str(root / 'adapter.safetensors')))
    retain('candidate', torch_scores(model, tokenizer, queries, documents, config['maxTokens']),
           {'precision': 'float32', 'adapterSha256': sha(root / 'adapter.safetensors'), 'selectedEpoch': receipt['selectedEpoch']})
    decision = promotion_decision(systems)
    for path, digest in code.items():
        if sha(path) != digest:
            raise ValueError(f'Evaluation executable changed during the sealed invocation: {path}')
    result = {'schemaVersion': 1, 'purpose': 'source-retrieval-evaluation', 'startedAt': started_at,
              'completedAt': dt.datetime.now(dt.timezone.utc).isoformat(), 'elapsedSeconds': round(time.perf_counter() - started, 3),
              'testQueries': len(queries), 'caseGroups': len({q['caseId'] for q in queries}), 'candidateDocuments': len(documents),
              'datasetSha256': sha(root / 'dataset.json'), 'testLabelsSha256': sha(root / 'test-labels.json'),
              'trainingReceiptSha256': sha(root / 'training-receipt.json'), 'codeHashes': code,
              'trainingConfigSha256': sha(root / 'training-config.json'),
              'testFreezeReceiptSha256': sha(root / 'test-freeze-receipt.json'),
              'runtime': {name: importlib.metadata.version(name) for name in ('torch', 'transformers', 'safetensors', 'numpy', 'tokenizers', 'onnxruntime')},
              'originalOnnxAssets': original_assets,
              'systems': systems, 'promotion': decision, 'uncertainty': bootstrap(systems),
              'testDrivenRetraining': False, 'publicTextUploadedToModelService': False,
              'limitations': ['Agent-authored relevance labels over selected summaries, not full documents.',
                              'Only five held-out case groups; unknown upstream pretraining exposure.',
                              'No wrongdoing, factual-truth or calibrated forecast performance is measured.']}
    write(root / 'evaluation.json', result)
    status = {'schemaVersion': 1, 'modelLabel': 'MiniLM local LoRA', 'status': decision['status'],
              'objective': 'source-retrieval', 'trained': True, 'forecastProbabilitiesEstimated': False,
              'trainableParameters': receipt['trainableParameters'], 'trainingQueries': len(receipt['trainingQueryIds']),
              'trainingDocuments': len(receipt['trainingDocumentIds']), 'developmentQueries': len(receipt['developmentQueryIds']),
              'holdoutQueries': len(queries), 'holdoutCases': result['caseGroups'], 'indexedDocuments': len(documents),
              'selectedEpoch': receipt['selectedEpoch'], 'defaultRetriever': decision['defaultRetriever'],
              'adapterSha256': sha(root / 'adapter.safetensors'), 'evaluationSha256': sha(root / 'evaluation.json'),
              'scores': {name: system['metrics']['caseMacro'] for name, system in systems.items()},
              'failedCriteria': [item['name'] for item in decision['criteria'] if not item['passed']],
              'completedAt': result['completedAt'], 'limitations': result['limitations']}
    write(root / 'model-status.json', status)
    print(json.dumps({'promotion': decision['status'], 'failedCriteria': status['failedCriteria']}), flush=True)


if __name__ == '__main__':
    main()
