#!/usr/bin/env python3
"""Verify retained experiment/evaluation artifacts offline using only Python stdlib.

No model weights are downloaded and no training or inference is rerun. Recorded base
immutability is checked against the executed receipt; optional cache verification
checks original model-file bytes. This is an artifact audit, not replayed training.
"""
import argparse
import ast
from collections import Counter, defaultdict
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import random
import re
import struct

ROOT = Path(__file__).resolve().parents[3]
DATA = ROOT / 'research/research-radar/next-model'
RUN = DATA / 'model-run'


def fail(condition, message):
    if not condition:
        raise ValueError(message)


def read_json(path):
    return json.loads(Path(path).read_text())


def sha(path):
    digest = hashlib.sha256()
    with Path(path).open('rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def repo_path(value):
    """Rebase historical absolute workspace receipts for GitHub Actions checkouts."""
    path = Path(value)
    if path.is_absolute():
        marker = '/india-corporate-intelligence/'
        if marker in str(path):
            path = Path(str(path).split(marker, 1)[1])
        else:
            try:
                path = path.relative_to(ROOT)
            except ValueError as exc:
                raise ValueError(f'Path is outside repository: {value}') from exc
    result = (ROOT / path).resolve()
    fail(result.is_relative_to(ROOT), f'Path escapes repository: {value}')
    return result


def check_hashes(items):
    items = items.items() if isinstance(items, dict) else ((x['path'], x['sha256']) for x in items)
    for name, expected in items:
        path = repo_path(name)
        fail(path.is_file(), f'Missing hashed artifact: {name}')
        fail(sha(path) == expected, f'Hash changed: {name}')


def assert_close(actual, expected, label='value', tolerance=1e-9):
    if isinstance(actual, bool) or isinstance(expected, bool):
        fail(type(actual) is type(expected) and actual == expected, f'{label}: boolean differs')
    elif isinstance(actual, (int, float)) and isinstance(expected, (int, float)):
        fail(math.isfinite(actual) and math.isfinite(expected) and math.isclose(actual, expected, rel_tol=tolerance, abs_tol=tolerance), f'{label}: numeric result differs ({actual} vs {expected})')
    elif isinstance(actual, dict) and isinstance(expected, dict):
        fail(set(actual) == set(expected), f'{label}: fields differ')
        for key in expected:
            assert_close(actual[key], expected[key], f'{label}.{key}', tolerance)
    elif isinstance(actual, list) and isinstance(expected, list):
        fail(len(actual) == len(expected), f'{label}: lengths differ')
        for i, (a, b) in enumerate(zip(actual, expected)):
            assert_close(a, b, f'{label}[{i}]', tolerance)
    else:
        fail(actual == expected, f'{label}: value differs')


def read_npy(path):
    """Strict 2D C-order float32/float64 NPY reader; never loads pickle payloads."""
    raw = Path(path).read_bytes()
    fail(raw[:6] == b'\x93NUMPY' and len(raw) >= 10, 'Invalid NPY magic/header')
    version = tuple(raw[6:8])
    fail(version in ((1, 0), (2, 0), (3, 0)), 'Unsupported NPY version')
    length_size = 2 if version == (1, 0) else 4
    header_size = int.from_bytes(raw[8:8 + length_size], 'little')
    start = 8 + length_size
    fail(0 < header_size <= 65536 and start + header_size <= len(raw), 'NPY header is truncated or excessive')
    header = ast.literal_eval(raw[start:start + header_size].decode('utf-8' if version == (3, 0) else 'latin1'))
    fail(isinstance(header, dict) and set(header) == {'descr', 'fortran_order', 'shape'}, 'Unexpected NPY header fields')
    fail(header['fortran_order'] is False, 'Fortran-order scores are not allowed')
    fail(header['descr'] in ('<f4', '<f8', '>f4', '>f8'), 'Only finite float32/float64 scores allowed')
    shape = header['shape']
    fail(isinstance(shape, tuple) and len(shape) == 2 and all(type(n) is int and 0 < n <= 100000 for n in shape), 'Invalid 2D score shape')
    count = math.prod(shape)
    fail(count <= 20000000, 'Score matrix exceeds offline audit bound')
    code = header['descr'][0] + ('f' if header['descr'].endswith('4') else 'd')
    size = struct.calcsize(code)
    payload = raw[start + header_size:]
    fail(len(payload) == count * size, 'NPY data length differs from shape')
    values = [v[0] for v in struct.iter_unpack(code, payload)]
    fail(all(math.isfinite(v) for v in values), 'NPY contains nonfinite scores')
    return [values[i * shape[1]:(i + 1) * shape[1]] for i in range(shape[0])]


def read_adapter(path):
    raw = Path(path).read_bytes()
    fail(len(raw) >= 8, 'Truncated safetensors header')
    length = int.from_bytes(raw[:8], 'little')
    fail(1 <= length <= 1048576 and 8 + length <= len(raw), 'Invalid safetensors header size')
    header = json.loads(raw[8:8 + length])
    fail(isinstance(header, dict), 'Adapter header must be an object')
    payload, tensors, spans = raw[8 + length:], {}, []
    for name, metadata in header.items():
        if name == '__metadata__':
            continue
        fail('.lora_' in name and name.endswith(('.lora_a', '.lora_b')), 'Adapter contains non-LoRA tensor')
        fail(metadata.get('dtype') == 'F32', 'Adapter must contain float32 tensors')
        shape, offsets = metadata.get('shape'), metadata.get('data_offsets')
        fail(isinstance(shape, list) and len(shape) == 2 and all(type(n) is int and n > 0 for n in shape), 'Invalid adapter shape')
        fail(isinstance(offsets, list) and len(offsets) == 2 and all(type(n) is int for n in offsets), 'Invalid adapter byte offsets')
        begin, end = offsets
        fail(0 <= begin < end <= len(payload) and end - begin == math.prod(shape) * 4, 'Adapter shape/byte count mismatch')
        values = [x[0] for x in struct.iter_unpack('<f', payload[begin:end])]
        fail(all(math.isfinite(v) for v in values), 'Nonfinite adapter weights')
        tensors[name] = {'shape': shape, 'bytes': payload[begin:end], 'values': values}
        spans.append((begin, end))
    fail(bool(tensors), 'Empty adapter')
    cursor = 0
    for begin, end in sorted(spans):
        fail(begin == cursor, 'Adapter offsets overlap or leave gaps')
        cursor = end
    fail(cursor == len(payload), 'Unaccounted adapter payload')
    return tensors


def adapter_tensor_hash(tensors):
    digest = hashlib.sha256()
    for name, tensor in sorted(tensors.items()):
        digest.update(name.encode())
        digest.update(str(tuple(tensor['shape'])).encode())
        digest.update(tensor['bytes'])
    return digest.hexdigest()


def adapter_delta(initial, final):
    fail(set(initial) == set(final), 'Adapter parameter names changed')
    total = 0.0
    for name in initial:
        fail(initial[name]['shape'] == final[name]['shape'], 'Adapter shape changed')
        total += sum((a - b) ** 2 for a, b in zip(initial[name]['values'], final[name]['values']))
    return math.sqrt(total)


def ordered(scores, documents):
    fail(len(scores) == len(documents), 'Ranking width differs from candidates')
    fail(all(math.isfinite(value) for value in scores), 'Nonfinite retrieval score')
    return sorted(range(len(scores)), key=lambda i: (-scores[i], documents[i]['id']))


def lexical_scores(queries, documents):
    tokens = [re.findall(r'\w+', d['text'].lower(), flags=re.UNICODE) for d in documents]
    counts = [Counter(row) for row in tokens]
    df = Counter(token for row in tokens for token in set(row))
    average = sum(map(len, tokens)) / len(tokens)
    out = [[0.0] * len(documents) for _ in queries]
    for i, q in enumerate(queries):
        for token in sorted(set(re.findall(r'\w+', q['text'].lower(), flags=re.UNICODE))):
            n = df.get(token, 0)
            idf = math.log(1 + (len(tokens) - n + .5) / (n + .5))
            for j, c in enumerate(counts):
                tf = c.get(token, 0)
                out[i][j] += idf * tf * 2.2 / (tf + 1.2 * (1 - .75 + .75 * len(tokens[j]) / average))
    return out


def rrf_scores(dense, lexical, documents):
    fail(len(dense) == len(lexical), 'Fusion heights differ')
    out = [[0.0] * len(documents) for _ in dense]
    for i in range(len(dense)):
        for values in (dense[i], lexical[i]):
            for rank, j in enumerate(ordered(values, documents), 1):
                out[i][j] += 1 / (60 + rank)
    return out


def development_metrics(queries, documents, scores):
    fail(len(scores) == len(queries), 'Score rows differ from queries')
    def mean(values):
        values = [v for v in values if v is not None]
        return sum(values) / len(values) if values else None
    def dcg(grades):
        return sum((2 ** grade - 1) / math.log2(i + 2) for i, grade in enumerate(grades[:5]))
    per_query = []
    for q, values in zip(queries, scores):
        relevance = q.get('relevance', {p: 1 for p in q['positiveIds']})
        ids = [documents[i]['id'] for i in ordered(values, documents)]
        required = q.get('requiredCounterevidenceIds', [])
        per_query.append({'queryId': q['id'], 'caseId': q['caseId'], 'ndcgAt5': dcg([relevance.get(i, 0) for i in ids]) / dcg(sorted(relevance.values(), reverse=True)), 'counterevidenceRecallAt5': len(set(required) & set(ids[:5])) / len(required) if required else None})
    grouped = defaultdict(list)
    for row in per_query:
        grouped[row['caseId']].append(row)
    per_case = [{'caseId': key, 'ndcgAt5': mean([r['ndcgAt5'] for r in rows]), 'counterevidenceRecallAt5': mean([r['counterevidenceRecallAt5'] for r in rows])} for key, rows in sorted(grouped.items())]
    return {'caseMacro': {'ndcgAt5': mean([r['ndcgAt5'] for r in per_case]), 'counterevidenceRecallAt5': mean([r['counterevidenceRecallAt5'] for r in per_case])}, 'queryCount': len(queries), 'caseCount': len(grouped), 'perCase': per_case, 'perQuery': per_query}


def selection_key(row):
    macro = row['metrics']['caseMacro']
    return (-macro['ndcgAt5'], -(macro['counterevidenceRecallAt5'] or 0.0), row['trainableParameters'], row['epoch'], row['family'], row['fusion'])


def literal_assignment(path, name):
    for node in ast.parse(Path(path).read_text()).body:
        if isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id == name for t in node.targets):
            return ast.literal_eval(node.value)
    raise ValueError(f'Missing literal assignment {name}')


def verify_batches(history, queries, training_ids, config):
    by_id = {q['id']: q for q in queries}
    rng = random.Random(config['seed'])
    steps = 0
    fail(len(history) == config['epochs'], 'Incomplete epoch history')
    for epoch, record in enumerate(history, 1):
        order = list(range(len(queries)))
        rng.shuffle(order)
        expected_batches = [[queries[i]['id'] for i in order[j:j + config['batchSize']]] for j in range(0, len(order), config['batchSize'])]
        fail(record['epoch'] == epoch, 'Epoch history ordering differs')
        fail([b['queryIds'] for b in record['batches']] == expected_batches, 'Recorded batch order differs from frozen seed')
        for batch in record['batches']:
            allowed = sorted({s for qid in batch['queryIds'] for s in by_id[qid]['positiveIds'] + by_id[qid]['hardNegativeIds']})
            fail(batch['encodedSourceIds'] == allowed, 'Training batch includes unlabelled or omitted source')
            fail(set(allowed) <= training_ids, 'Training batch contains heldout source')
        steps += len(expected_batches)
        fail(record['optimizerSteps'] == steps, 'Optimizer step count differs')
        fail(math.isfinite(record['meanTrainingLoss']) and record['meanTrainingLoss'] >= 0, 'Invalid training loss')
    return steps


def verify_training(verify_cached_assets=False):
    freeze = read_json(RUN / 'experiment-freeze.json')
    config = read_json(RUN / 'training-config.json')
    review = read_json(DATA / 'preflight-review.json')
    receipt = read_json(RUN / 'training-receipt.json')
    dataset = read_json(DATA / 'dataset.json')
    fail(receipt['status'] == 'executed', 'Training is not recorded as executed')
    fail(receipt['freezeSha256'] == sha(RUN / 'experiment-freeze.json') == review['freezeSha256'], 'Freeze/review binding differs')
    fail(review['approved'] is True and review['newCandidateOutputsInspected'] is False and review['newHoldoutUsedForSelection'] is False, 'Review is not pre-output approval')
    fail(receipt['reviewSha256'] == sha(DATA / 'preflight-review.json'), 'Training review hash differs')
    fail(receipt['datasetSha256'] == freeze['datasetSha256'] == sha(DATA / 'dataset.json'), 'Frozen dataset changed')
    fail(freeze['configurationSha256'] == sha(RUN / 'training-config.json'), 'Training configuration changed')
    fail(receipt['codeHashes'] == freeze['codeHashes'], 'Receipt executable hashes differ')
    check_hashes(freeze['codeHashes']); check_hashes(freeze['inputHashes'])
    fail(config['families'] == ['e5', 'f2'] and config['epochs'] == 3 and config['batchSize'] == 4 and config['rank'] == 8 and config['alpha'] == 16 and config['seed'] == 20261008, 'Unexpected experiment grid')
    fail(config['learningRate'] == .0002 and config['maxTokens'] == 256 and config['precision'] == 'float32', 'Unexpected optimizer/token/precision configuration')
    fail(config['configurations'] == [{'family': f, 'fusion': u} for f in ['e5', 'f2'] for u in ['none', 'rrf']], 'Candidate search grid differs')
    for flag in ['publicTextUploadedToModelService', 'testLabelsRead', 'testDocumentsEncodedForOptimizationOrSelection']:
        fail(receipt[flag] is False, f'Unexpected training flag {flag}')
    fail(freeze['testLabelsRead'] is False and freeze['developmentPredictionsMade'] is False, 'Freeze followed development/test inspection')
    started = read_json(RUN / 'run-started.json')
    fail(started['freezeSha256'] == receipt['freezeSha256'] and started['reviewSha256'] == receipt['reviewSha256'] and started['testLabelsRead'] is False, 'Training invocation provenance differs')
    fail(started['startedAt'] == receipt['startedAt'] and freeze['frozenAt'] <= review['reviewedAtUtc'] <= receipt['startedAt'] <= receipt['completedAt'], 'Training chronology invalid')
    fail(receipt['elapsedSeconds'] > 0 and receipt['device'] == 'cpu', 'Missing actual runtime evidence')
    for name, expected in receipt['artifactHashes'].items():
        path = (RUN / name).resolve()
        fail(path.is_relative_to(RUN) and path.is_file() and sha(path) == expected, f'Training artifact changed: {name}')
    docs, qs = dataset['documents'], dataset['queries']
    train_docs = [d for d in docs if d['split'] == 'train']
    dev_docs = [d for d in docs if d['split'] in ['train', 'dev']]
    train_qs, dev_qs = [[q for q in qs if q['split'] == s] for s in ['train', 'dev']]
    fail((len(train_docs), len(dev_docs), len(train_qs), len(dev_qs)) == (305, 403, 129, 35), 'Unexpected source/query populations')
    fail(receipt['trainingQueryIds'] == [q['id'] for q in train_qs] and receipt['developmentQueryIds'] == [q['id'] for q in dev_qs], 'Query population differs')
    fail(receipt['trainingCandidateIds'] == sorted(d['id'] for d in train_docs), 'Training candidate mask differs')
    fail(receipt['developmentCandidateIds'] == [d['id'] for d in dev_docs], 'Development includes test or loses candidates')
    index = read_json(RUN / 'development-index.json')
    fail(index == {'queryIds': [q['id'] for q in dev_qs], 'sourceIds': [d['id'] for d in dev_docs]}, 'Development score axes differ')
    lexical = read_npy(RUN / 'development-scores/bm25.npy')
    assert_close(lexical, lexical_scores(dev_qs, dev_docs), 'BM25 scores', 1e-10)
    assert_close(receipt['baselineDevelopmentMetrics']['bm25'], development_metrics(dev_qs, dev_docs, lexical), 'BM25 development metrics')
    specifications = literal_assignment(ROOT / 'scripts/research-radar/next-model/encoder.py', 'MODELS')
    base_assets = read_json(DATA / 'base-assets.json')
    candidates, family_summary = [], []
    fail([f['family'] for f in receipt['families']] == ['e5', 'f2'], 'Both model runs are required')
    for family in receipt['families']:
        key = family['family']; spec = specifications[key]
        count = {'e5': 147456, 'f2': 237568}[key]
        fail(family['trainableParameters'] == count == spec['expectedTrainableParameters'], 'Trainable parameter count differs')
        fail(family['baseModelId'] == spec['modelId'] and family['revision'] == spec['revision'], 'Base model revision differs')
        fail(freeze['models'][key] == {'modelId': spec['modelId'], 'revision': spec['revision']}, 'Freeze model identity differs')
        before, after = family['frozenBaseTensorHashBefore'], family['frozenBaseTensorHashAfter']
        fail(before == after and re.fullmatch(r'[a-f0-9]{64}', before), 'Frozen base mutation or invalid recorded hash')
        manifest = read_json(RUN / f'{key}-base-assets.json')
        fail(manifest == base_assets[key], 'Executed base manifest differs from preflight assets')
        for item in manifest['assets']:
            expected_hash, size = spec['assets'][item['filename']]
            fail(item['sha256'] == expected_hash and item['bytes'] == size, 'Base asset declaration differs from pinned code')
            fail(item['url'] == f'https://huggingface.co/{spec["modelId"]}/resolve/{spec["revision"]}/{item["filename"]}', 'Model asset URL is not revision pinned')
            if verify_cached_assets:
                cached = Path(manifest['cache']) / item['filename']
                fail(cached.is_file() and cached.stat().st_size == size and sha(cached) == expected_hash, f'Cached model bytes changed: {key}/{item["filename"]}')
        fail(set(x['filename'] for x in manifest['assets']) == set(spec['assets']), 'Incomplete base asset manifest')
        initial = read_adapter(RUN / f'{key}-initial-adapter.safetensors')
        fail(sum(math.prod(v['shape']) for v in initial.values()) == count, 'Actual initial tensor count differs')
        fail(adapter_tensor_hash(initial) == family['initialAdapterTensorHash'], 'Initial tensor hash differs')
        fail(set(initial) == set(family['trainableNames']), 'Trainable names differ from saved adapter')
        fail(all(name.rsplit('.lora_', 1)[0] in family['targetModules'] for name in initial), 'LoRA target set differs')
        steps = verify_batches(family['history'], train_qs, {d['id'] for d in train_docs}, config)
        fail(steps == family['optimizerSteps'] == 99 and family['epochs'] == 3, 'Optimizer steps/epochs differ')
        baseline = read_npy(RUN / f'development-scores/{key}-epoch-0.npy')
        for fusion in ['none', 'rrf']:
            values = baseline if fusion == 'none' else rrf_scores(baseline, lexical, dev_docs)
            assert_close(receipt['baselineDevelopmentMetrics'][key][fusion], development_metrics(dev_qs, dev_docs, values), f'{key} untuned {fusion}')
        for epoch in family['history']:
            number = epoch['epoch']; state = read_adapter(RUN / f'{key}-epoch-{number}-adapter.safetensors')
            fail(sum(math.prod(v['shape']) for v in state.values()) == count, 'Actual trained tensor count differs')
            delta = adapter_delta(initial, state)
            fail(math.isfinite(delta) and delta > 0, 'Adapter has no actual finite weight update')
            dense = read_npy(RUN / f'development-scores/{key}-epoch-{number}.npy')
            fail(len(epoch['configurations']) == 2 and [c['fusion'] for c in epoch['configurations']] == ['none', 'rrf'], 'Missing candidate fusion')
            for row in epoch['configurations']:
                fail(row['family'] == key and row['epoch'] == number and row['trainableParameters'] == count, 'Candidate identity differs')
                fail(repo_path(row['adapterPath']) == RUN / f'{key}-epoch-{number}-adapter.safetensors', 'Checkpoint path differs')
                fail(row['adapterSha256'] == sha(repo_path(row['adapterPath'])) and row['adapterTensorHash'] == adapter_tensor_hash(state), 'Saved adapter hash differs')
                assert_close(row['adapterDeltaL2'], delta, 'Actual adapter delta', 1e-6)
                values = dense if row['fusion'] == 'none' else rrf_scores(dense, lexical, dev_docs)
                assert_close(row['metrics'], development_metrics(dev_qs, dev_docs, values), f'{key} epoch {number} {row["fusion"]}')
                candidates.append(row)
        family_summary.append({'family': key, 'trainableParameters': count, 'optimizerSteps': steps, 'recordedBaseHashUnchanged': True, 'actualAdapterTensorsVerified': True})
    selected = sorted(candidates, key=selection_key)[0]
    assert_close(receipt['selectedConfiguration'], selected, 'Development-only selected configuration')
    selected_file = read_json(RUN / 'selected-model.json')
    for field, value in selected.items():
        assert_close(selected_file[field], value, f'Selected checkpoint {field}')
    fail(selected_file['selectionRule'] == config['selection'] and selected_file['freezeSha256'] == sha(RUN / 'experiment-freeze.json'), 'Selection provenance differs')
    fail(selected_file['promotionPendingIndependentEvaluation'] is True and selected_file['promoted'] is False, 'Development selection improperly promotes candidate')
    return {'datasetSha256': sha(DATA / 'dataset.json'), 'trainingReceiptSha256': sha(RUN / 'training-receipt.json'), 'families': family_summary, 'candidateConfigurations': 4, 'trainedWeightCheckpoints': 6, 'developmentConfigurationsEvaluated': len(candidates), 'selected': {k: selected[k] for k in ['family', 'fusion', 'epoch']}, 'cachedBaseBytesVerified': verify_cached_assets}


def load_independent_evaluator():
    path = ROOT / 'scripts/research-radar/next-model/evaluate-independent.py'
    spec = importlib.util.spec_from_file_location('independent_release_metrics', path)
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module


def verify_evaluation():
    """Read the exhausted final test only after its fixed invocation has completed."""
    fail((DATA / 'evaluation.json').is_file(), 'Independent evaluation not completed')
    evaluator = load_independent_evaluator(); evaluator.verify_freeze()
    corpus = read_json(DATA / 'dataset.json'); labels = read_json(DATA / 'independent-test-labels.json')
    rankings = read_json(DATA / 'final-test/rankings.json'); output = read_json(DATA / 'evaluation.json')
    fail(rankings['corpusSha256'] == sha(DATA / 'dataset.json'), 'Final rankings corpus binding differs')
    docs = evaluator.document_projection(corpus); queries = evaluator.query_projection(labels)
    fail(len(docs) == 435 and len(queries) == 24 and len({q['caseId'] for q in queries}) == 6, 'Final evaluation populations differ')
    computed, ranked_ids = {}, {}
    fail(set(rankings['comparators']) == {'base', 'candidate', 'bm25', 'mini'}, 'All four final comparators required')
    for name, system in rankings['comparators'].items():
        ranks = evaluator.checked_rankings(system['queries'], {d['id'] for d in docs}, {q['id'] for q in queries})
        ranked_ids[name] = ranks
        computed[name] = {'configuration': system.get('configuration', {}), 'metrics': evaluator._METRICS.evaluate_rankings(queries, docs, ranks)}
        own = read_json(DATA / f'final-test/{name}.json')
        fail(own['corpusSha256'] == rankings['corpusSha256'] and own['comparators'][name] == system, 'Combined ranking differs from standalone execution')
        fail(own['publicTextUploadedToModelService'] is False, 'Unexpected remote model inference')
        check_hashes(own['codeHashes'])
    assert_close(output['systems'], computed, 'Independent retrieval metrics')
    assert_close(output['promotion'], evaluator.promotion(computed), 'Fixed promotion gate')
    assert_close(output['caseClusterBootstrap'], evaluator.bootstrap(computed), 'Fixed case bootstrap')
    fail(output['forecastProbabilitiesEstimated'] is False, 'Retrieval evaluation mislabelled as calibrated forecast')
    expected_hashes = {'corpus': sha(DATA / 'dataset.json'), 'rankings': sha(DATA / 'final-test/rankings.json'), 'labels': sha(DATA / 'independent-test-labels.json'), 'freeze': sha(DATA / 'independent-test-freeze.json'), 'evaluator': sha(ROOT / 'scripts/research-radar/next-model/evaluate-independent.py'), 'inheritedMetrics': sha(ROOT / 'scripts/research-radar/fine-tuning/metrics.py')}
    for key, value in expected_hashes.items():
        fail(output['hashes'][key] == value, f'Evaluation binding differs: {key}')
    selected = read_json(RUN / 'selected-model.json')
    candidate = computed['candidate']['configuration']; base = computed['base']['configuration']
    for field in ['family', 'fusion', 'precision', 'modelId', 'revision', 'maxTokens']:
        fail(candidate[field] == base[field], 'Untuned comparator differs from selected retrieval conditions')
    fail(candidate['family'] == selected['family'] and candidate['fusion'] == selected['fusion'] and candidate['selectedEpoch'] == selected['epoch'], 'Final candidate differs from development selection')
    fail(candidate['adapterSha256'] == selected['adapterSha256'] and candidate['selectedConfigurationSha256'] == sha(RUN / 'selected-model.json'), 'Final adapter/checkpoint binding differs')
    projection = read_json(DATA / 'final-test/query-projection.json')
    raw_queries = projection.get('queries', projection) if isinstance(projection, dict) else projection
    fail([(q['id'], q['text']) for q in raw_queries] == [(q['id'], q['query']) for q in labels['queries']], 'Final query projection differs from frozen labels')
    for name in computed:
        fail(read_json(DATA / f'final-test/{name}.json')['queriesSha256'] == sha(DATA / 'final-test/query-projection.json'), f'{name}: query projection hash differs')
    invocation = read_json(DATA / 'final-test/invocation.json')
    fail(invocation['status'] == 'completed' and invocation['candidateOutputsInspectedBeforeInvocation'] is False and invocation['noFurtherModelSelectionAuthorized'] is True, 'Final evaluation is not a completed one-shot invocation')
    fail(invocation['comparators'] == ['bm25', 'base', 'candidate', 'mini'], 'Final comparator plan differs')
    fail(invocation['selectedCandidate'] == {k: selected[k] for k in ['family', 'fusion', 'epoch', 'adapterSha256']}, 'Final invocation selected another candidate')
    training = read_json(RUN / 'training-receipt.json')
    fail(training['completedAt'] <= invocation['startedAtUtc'] <= invocation['completedAtUtc'], 'Final test preceded development selection/training completion')
    for bindings in [invocation['files'], invocation['outputs']]:
        fail(len({b['path'] for b in bindings}) == len(bindings), 'Duplicate final invocation bindings')
        check_hashes(bindings)
        for item in bindings:
            fail(repo_path(item['path']).stat().st_size == item['bytes'], 'Invocation artifact byte size differs')
    fail('Exhausted' in invocation['testStatusAfterInvocation'], 'Final test exhaustion not retained')
    if 'evidencePathIntegration' in output:
        graph = read_json(DATA / 'graph-data.json')
        fail(sha(DATA / 'graph-data.json') == output['hashes']['registry'], 'Evaluated graph registry changed')
        packets = read_json(DATA / 'final-test/emitted-edges.json')
        recomputed = evaluator.path_audit(graph, labels, ranked_ids['candidate'], packets)
        assert_close(output['evidencePathIntegration'], recomputed, 'Source closure/path preservation')
        trace_spec = importlib.util.spec_from_file_location('release_trace', ROOT / 'scripts/research-radar/next-model/trace.py')
        trace = importlib.util.module_from_spec(trace_spec); trace_spec.loader.exec_module(trace)
        audit = read_json(DATA / 'final-test/trace-audit.json')
        fail(audit['graphSha256'] == sha(DATA / 'graph-data.json') and audit['traceCodeSha256'] == sha(ROOT / 'scripts/research-radar/next-model/trace.py'), 'Trace audit code/data binding differs')
        summaries, exact_packets = [], []
        for row in rankings['comparators']['candidate']['queries']:
            packet = trace.expand_trace(graph, source_ids=[x['sourceId'] for x in row['ranking'][:5]], max_hops=2)
            trace.validate_packet(packet, graph)
            exact_packets.append({'queryId': row['queryId'], 'relationships': packet['relationships']})
            summaries.append({'queryId': row['queryId'], 'selectedSourceIds': packet['selectedSourceIds'], 'relationships': len(packet['relationships']), 'sources': len(packet['sources']), 'fullPacketCanonicalSha256': trace.canonical_sha(packet), 'inferredCashFlow': packet['inferredCashFlow'], 'aggregateAmount': packet['aggregateAmount'], 'truncation': packet['truncation'], 'retainedCounterevidenceRecords': len(packet['counterevidence'])})
        assert_close(packets, exact_packets, 'Replayed deterministic emitted edges')
        assert_close(audit['queries'], summaries, 'Replayed deterministic trace audit')
    return {'evaluationSha256': sha(DATA / 'evaluation.json'), 'rankingsSha256': sha(DATA / 'final-test/rankings.json'), 'queries': 24, 'caseFamilies': 6, 'promoted': output['promotion']['promoted'], 'defaultPromotionIsRetrievalOnly': True}



def verify_report():
    path = ROOT / 'scripts/research-radar/next-model/build-report.py'
    spec = importlib.util.spec_from_file_location('release_report', path)
    report = importlib.util.module_from_spec(spec); spec.loader.exec_module(report)
    status, training, selected, evaluation = report.derive(DATA / 'evaluation.json')
    assert_close(read_json(DATA / 'ui-status.json'), status, 'Website status projection')
    model_card = ROOT / 'docs/research-radar/next-model/MODEL-CARD.md'
    fail(model_card.read_text() == report.model_card(status, training, selected, evaluation), 'Model card differs from executed receipts')
    return {'uiStatusSha256': sha(DATA / 'ui-status.json'), 'modelCardSha256': sha(model_card), 'defaultRetriever': status['defaultRetriever']}


def verify_demonstrations():
    path = ROOT / 'scripts/research-radar/next-model/investigate.py'
    spec = importlib.util.spec_from_file_location('release_investigation', path)
    investigate = importlib.util.module_from_spec(spec); spec.loader.exec_module(investigate)
    packet_path = DATA / 'investigation-packets.json'
    ranking_path = DATA / 'investigation-rankings.json'
    result = investigate.verify_saved_investigation(packet_path, ranking_path=ranking_path, ui_path=DATA / 'investigation-runs.json')
    packet = read_json(packet_path); ranking = read_json(ranking_path)
    fail(packet['status'] == 'executed' and packet['publicTextUploadedToModelService'] is False, 'Investigation was not local executed work')
    fail(packet['queryKind'] == 'pre-output-frozen-illustrations-not-test' and result['runs'] == 10, 'Expected ten illustrative investigation runs')
    fail(packet['execution'] in ['local-model-inference-and-exact-graph-trace', 'reused-hash-verified-rankings'], 'Unknown investigation execution mode')
    check_hashes(ranking['codeHashes'])
    model = packet['modelSelection']['resolved']
    config = ranking['comparators'][model]['configuration']
    if model in ['candidate', 'base']:
        selected = read_json(RUN / 'selected-model.json')
        fail(config['selectedConfigurationSha256'] == sha(RUN / 'selected-model.json'), 'Investigation used another selected configuration')
        for field in ['family', 'fusion']:
            fail(config[field] == selected[field], 'Investigation model settings differ')
        if model == 'candidate':
            fail(config['adapterSha256'] == selected['adapterSha256'] and config['selectedEpoch'] == selected['epoch'], 'Investigation used another adapter')
    fail(ranking['publicTextUploadedToModelService'] is False, 'Investigation ranking uploaded text remotely')
    return result

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--training-only', action='store_true')
    parser.add_argument('--verify-cached-assets', action='store_true')
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    result = {'schemaVersion': 1, 'status': 'verified', 'verifierSha256': sha(__file__), 'training': verify_training(args.verify_cached_assets), 'scope': 'Offline byte/metric/selection verification; training and neural inference are not replayed.'}
    if not args.training_only:
        result['independentEvaluation'] = verify_evaluation()
        result['publicationProjection'] = verify_report()
        result['investigationDemonstrations'] = verify_demonstrations()
    content = json.dumps(result, indent=2) + '\n'
    if args.output:
        args.output.write_text(content)
    print(content)


if __name__ == '__main__':
    main()
