#!/usr/bin/env python3
"""Search cited summaries locally with the trained adapter or retained baselines."""
import argparse
import json
from pathlib import Path
import time

from prepare_assets import DEFAULT_CACHE, prepare, sha

ROOT = Path('research/research-radar/fine-tuning')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--query', required=True)
    parser.add_argument('--model', choices=['default', 'candidate', 'base_fp32', 'base_onnx_uint8', 'bm25'], default='default')
    parser.add_argument('--limit', type=int, choices=range(1, 21), default=5)
    parser.add_argument('--root', type=Path, default=ROOT)
    parser.add_argument('--cache', type=Path, default=DEFAULT_CACHE)
    parser.add_argument('--onnx-cache', type=Path, default=Path('/tmp/india-education-model-cache'))
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    if not args.query.strip() or len(args.query) > 4_000:
        raise ValueError('Provide a nonempty query up to 4,000 characters')
    root = args.root
    status = json.loads((root / 'model-status.json').read_text())
    evaluation = json.loads((root / 'evaluation.json').read_text())
    receipt = json.loads((root / 'training-receipt.json').read_text())
    for name, expected in [('evaluation.json', status['evaluationSha256']),
                           ('dataset.json', evaluation['datasetSha256']),
                           ('training-config.json', receipt['configSha256']),
                           ('adapter.safetensors', status['adapterSha256'])]:
        if sha(root / name) != expected:
            raise ValueError(f'Local model provenance mismatch: {name}')
    if status['defaultRetriever'] != evaluation['promotion']['defaultRetriever']:
        raise ValueError('Default model conflicts with the recorded promotion gate')
    selected = status['defaultRetriever'] if args.model == 'default' else args.model
    if selected == 'candidate' and not evaluation['promotion']['promoted'] and args.model != 'candidate':
        raise ValueError('An unpromoted adapter requires explicit --model candidate')
    # Training and full evaluation are not repeated by this inference command.
    from evaluate import bm25_scores, complete_rankings, onnx_scores, torch_scores
    from encoder import load_adapter, load_encoder
    import torch
    from safetensors.torch import load_file
    dataset = json.loads((root / 'dataset.json').read_text())
    documents = dataset['documents']
    query = [{'id': 'local-query', 'text': args.query.strip()}]
    config = json.loads((root / 'training-config.json').read_text())
    torch.set_num_threads(config['cpuThreads'])
    torch.set_num_interop_threads(1)
    started = time.perf_counter()
    if selected == 'bm25':
        scores = bm25_scores(query, documents)
    elif selected == 'base_onnx_uint8':
        scores = onnx_scores(query, documents, args.onnx_cache)
    else:
        prepare(args.cache, offline=True)
        model, tokenizer, _ = load_encoder(args.cache, config, with_adapter=selected == 'candidate')
        if selected == 'candidate':
            load_adapter(model, load_file(str(root / 'adapter.safetensors')))
        scores = torch_scores(model, tokenizer, query, documents, config['maxTokens'])
    rankings, values = complete_rankings(query, documents, scores)
    lookup = {document['id']: document for document in documents}
    matches = []
    for id in rankings['local-query'][:args.limit]:
        document = lookup[id]
        matches.append({'sourceId': id, 'title': document['title'], 'url': document['url'],
                        'score': values['local-query'][id], 'scoreType': 'BM25' if selected == 'bm25' else 'cosine similarity',
                        'summary': document['summary'], 'locator': document['locator'],
                        'sourceKind': document['kind'], 'access': document['access'],
                        'limitations': document['limitations'], 'caseIds': document['caseIds'],
                        'automaticallyVerified': False})
    result = {'query': args.query.strip(), 'model': selected, 'adapterPromotion': status['status'],
              'indexedDocuments': len(documents), 'elapsedSeconds': round(time.perf_counter() - started, 3),
              'publicTextUploadedToModelService': False,
              'meaning': 'Source-relevance ranking only. Scores are not probabilities, factual verification or new graph connections.',
              'matches': matches}
    serialized = json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False) + '\n'
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(serialized)
    else:
        print(serialized, end='')


if __name__ == '__main__':
    main()
