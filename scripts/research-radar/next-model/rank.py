#!/usr/bin/env python3
"""Complete deterministic local evidence rankings; scores are not probabilities."""
import argparse
from collections import Counter
import importlib.util
import json
import math
from pathlib import Path
import re
import time

import numpy as np
import torch
from safetensors.torch import load_file

from encoder import (CACHE_ROOT, MODELS, embed, load_adapter, load_encoder, sha, write_json)

ROOT = Path('research/research-radar/next-model')


def rows(value, key):
    result = value if isinstance(value, list) else value[key]
    if not isinstance(result, list) or not result:
        raise ValueError(f'{key} must be a nonempty list')
    identifiers = [row.get('id', row.get('queryId' if key == 'queries' else 'sourceId')) for row in result]
    if any(not isinstance(item, str) or not item for item in identifiers) or len(set(identifiers)) != len(identifiers):
        raise ValueError(f'{key} must have unique nonempty IDs')
    normalized = []
    for row, identifier in zip(result, identifiers):
        if not isinstance(row.get('text'), str) or not row['text'].strip():
            raise ValueError(f'{key}/{identifier} has no text')
        normalized.append({**row, 'id': identifier})
    return normalized


def bm25_scores(queries, documents):
    """Fixed Unicode lexical baseline: k1=1.2, b=.75, unique query terms."""
    tokenize = lambda text: re.findall(r'\w+', text.lower(), flags=re.UNICODE)
    tokens = [tokenize(document['text']) for document in documents]
    counts = [Counter(row) for row in tokens]
    df = Counter(token for row in tokens for token in set(row))
    average = sum(map(len, tokens)) / len(tokens)
    if average <= 0:
        raise ValueError('No lexical tokens in corpus')
    result = np.zeros((len(queries), len(documents)))
    for i, query in enumerate(queries):
        for token in set(tokenize(query['text'])):
            frequency = df.get(token, 0)
            idf = math.log(1 + (len(tokens) - frequency + .5) / (frequency + .5))
            for j, count in enumerate(counts):
                tf = count.get(token, 0)
                denominator = tf + 1.2 * (1 - .75 + .75 * len(tokens[j]) / average)
                result[i, j] += idf * tf * 2.2 / denominator
    return result


def ordered_indices(values, documents):
    return sorted(range(len(documents)), key=lambda index: (-float(values[index]), documents[index]['id']))


def rrf_scores(dense, lexical, documents, constant=60):
    if dense.shape != lexical.shape:
        raise ValueError('Fusion input shapes differ')
    result = np.zeros_like(dense, dtype=np.float64)
    for query_index in range(len(dense)):
        for values in (dense[query_index], lexical[query_index]):
            for position, index in enumerate(ordered_indices(values, documents), 1):
                result[query_index, index] += 1.0 / (constant + position)
    return result


def dense_scores(model, tokenizer, family, queries, documents, max_tokens=256):
    document_vectors = embed(model, tokenizer, family, [row['text'] for row in documents], max_tokens=max_tokens)
    query_vectors = embed(model, tokenizer, family, [row['text'] for row in queries], query=True, max_tokens=max_tokens)
    return (query_vectors @ document_vectors.T).detach().cpu().numpy()


def mini_scores(queries, documents, cache):
    """Existing pinned uint8 ONNX retriever, not the earlier experimental adapter."""
    import onnxruntime as ort
    from tokenizers import Tokenizer
    path = Path('scripts/education/model-rank.py')
    specification = importlib.util.spec_from_file_location('retained_minilm_assets', path)
    module = importlib.util.module_from_spec(specification)
    specification.loader.exec_module(module)
    tokenizer = Tokenizer.from_file(str(module.asset(cache, 'tokenizer.json', offline=True)))
    tokenizer.enable_truncation(max_length=256)
    tokenizer.enable_padding(pad_id=0, pad_token='[PAD]')
    options = ort.SessionOptions()
    options.intra_op_num_threads = 4
    options.inter_op_num_threads = 1
    session = ort.InferenceSession(str(module.asset(cache, 'onnx/model_quint8_avx2.onnx', offline=True)),
                                  sess_options=options, providers=['CPUExecutionProvider'])

    def encode(texts):
        vectors = []
        for start in range(0, len(texts), 8):
            batch = tokenizer.encode_batch(texts[start:start + 8])
            arrays = {'input_ids': np.asarray([row.ids for row in batch], dtype=np.int64),
                      'attention_mask': np.asarray([row.attention_mask for row in batch], dtype=np.int64),
                      'token_type_ids': np.asarray([row.type_ids for row in batch], dtype=np.int64)}
            hidden = session.run(None, {item.name: arrays[item.name] for item in session.get_inputs()})[0]
            mask = arrays['attention_mask'][:, :, None]
            mean = (hidden * mask).sum(1) / np.clip(mask.sum(1), 1, None)
            vectors.append(mean / np.clip(np.linalg.norm(mean, axis=1, keepdims=True), 1e-12, None))
        return np.concatenate(vectors)

    return encode([row['text'] for row in queries]) @ encode([row['text'] for row in documents]).T


def complete_rankings(queries, documents, scores):
    if scores.shape != (len(queries), len(documents)) or not np.isfinite(scores).all():
        raise ValueError('Invalid score matrix')
    return [{'queryId': query['id'], 'ranking': [
        {'sourceId': documents[index]['id'], 'score': float(scores[i, index])}
        for index in ordered_indices(scores[i], documents)]} for i, query in enumerate(queries)]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--queries', type=Path, required=True)
    parser.add_argument('--corpus', type=Path, required=True)
    parser.add_argument('--model', choices=['base', 'candidate', 'bm25', 'mini'], required=True)
    parser.add_argument('--family', choices=MODELS)
    parser.add_argument('--base-dense-only', action='store_true', help='Secondary ablation; primary base matches candidate fusion')
    parser.add_argument('--candidate-config', type=Path, default=ROOT / 'model-run' / 'selected-model.json')
    parser.add_argument('--cache-root', type=Path, default=CACHE_ROOT)
    parser.add_argument('--onnx-cache', type=Path, default=Path('/workspace/.cache/icip-onnx-models'))
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists():
        raise ValueError('Refusing to overwrite a ranking artifact; use a fresh output path')
    queries = rows(json.loads(args.queries.read_text()), 'queries')
    documents = rows(json.loads(args.corpus.read_text()), 'documents')
    torch.set_num_threads(4)
    torch.set_num_interop_threads(1)
    torch.use_deterministic_algorithms(True)
    started = time.perf_counter()
    configuration = {'model': args.model, 'device': 'cpu', 'scoreMeaning': 'source relevance only',
                     'tieBreak': 'score descending, canonical source ID ascending'}
    if args.model == 'bm25':
        scores = bm25_scores(queries, documents)
        configuration.update(k1=1.2, b=.75, queryTerms='unique Unicode lowercase word tokens')
    elif args.model == 'mini':
        scores = mini_scores(queries, documents, args.onnx_cache)
        configuration.update(modelId='sentence-transformers/all-MiniLM-L6-v2',
                             revision='1110a243fdf4706b3f48f1d95db1a4f5529b4d41', precision='uint8 ONNX AVX2',
                             maxTokens=256, assetVerifierSha256=sha('scripts/education/model-rank.py'))
    else:
        selected = json.loads(args.candidate_config.read_text())
        family = args.family or selected['family']
        if args.model == 'candidate' and family != selected['family']:
            raise ValueError('Independent ranking must use the selected family')
        model, tokenizer, _, manifest = load_encoder(family, args.cache_root,
                                                     with_adapter=args.model == 'candidate')
        if args.model == 'candidate':
            checkpoint = Path(selected['adapterPath'])
            if sha(checkpoint) != selected['adapterSha256']:
                raise ValueError('Selected adapter changed after development selection')
            load_adapter(model, load_file(str(checkpoint)))
        scores = dense_scores(model, tokenizer, family, queries, documents, selected['maxTokens'])
        if args.base_dense_only and args.model != 'base':
            raise ValueError('--base-dense-only is only a secondary base-model ablation')
        fusion = 'none' if args.base_dense_only else selected['fusion']
        if fusion == 'rrf':
            scores = rrf_scores(scores, bm25_scores(queries, documents), documents)
        configuration.update(family=family, modelId=manifest['modelId'], revision=manifest['revision'],
                             precision='float32', fusion=fusion, maxTokens=selected['maxTokens'],
                             selectedConfigurationSha256=sha(args.candidate_config),
                             baseAssets=manifest['assets'])
        if args.model == 'candidate':
            configuration.update(adapterSha256=selected['adapterSha256'], selectedEpoch=selected['epoch'])
    result = {'schemaVersion': 1, 'corpusSha256': sha(args.corpus), 'queriesSha256': sha(args.queries),
              'publicTextUploadedToModelService': False,
              'elapsedSeconds': round(time.perf_counter() - started, 3),
              'codeHashes': {str(Path(__file__)): sha(__file__), str(Path(__file__).with_name('encoder.py')):
                             sha(Path(__file__).with_name('encoder.py'))},
              'comparators': {args.model: {'configuration': configuration,
                                          'queries': complete_rankings(queries, documents, scores)}}}
    write_json(args.output, result)
    print(json.dumps({'model': args.model, 'queries': len(queries), 'documents': len(documents),
                      'elapsedSeconds': result['elapsedSeconds']}), flush=True)


if __name__ == '__main__':
    main()
