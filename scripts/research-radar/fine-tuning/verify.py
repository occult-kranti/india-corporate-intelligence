#!/usr/bin/env python3
"""Verify the executed retrieval experiment offline, using only Python stdlib.

This rechecks retained bytes, information barriers, tensor updates, checkpoint
selection, every ranking/metric and the published decision. It does not download
weights, train, perform new inference, or establish that source claims are true.
"""
import argparse
import datetime as dt
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import random
import struct

from metrics import evaluate_rankings
from policy import promotion_decision
from prepare_assets import ASSETS, MODEL_ID, REVISION

REPO = Path(__file__).resolve().parents[3]
ARTIFACT_PATH = Path('research/research-radar/fine-tuning')
DEFAULT_ROOT = REPO / ARTIFACT_PATH
TEST_LABEL_SHA = 'e9f21dda1111df290fb0fb06b810d8f70e100b40d2fca8c45ab6bfe1fa22c5df'
TARGETS = [f'encoder.layer.{layer}.attention.self.{target}'
           for layer in range(6) for target in ('query', 'value')]
TENSOR_SHAPES = {f'{target}.lora_{part}': ([8, 384] if part == 'a' else [384, 8])
                 for target in TARGETS for part in ('a', 'b')}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def read(path):
    def reject(value):
        raise ValueError(f'Nonfinite JSON literal {value}')
    return json.loads(Path(path).read_text(), parse_constant=reject)


def resolved(path, root=DEFAULT_ROOT, repo=REPO):
    relative = Path(path)
    require(not relative.is_absolute() and '..' not in relative.parts, 'Unsafe retained path')
    if relative.is_relative_to(ARTIFACT_PATH):
        return Path(root) / relative.relative_to(ARTIFACT_PATH)
    return Path(repo) / relative


def exact(actual, expected, label):
    require(actual == expected, f'{label} does not match recomputed value')


def hash_map(records, root=DEFAULT_ROOT, repo=REPO):
    require(isinstance(records, dict) and records, 'Missing hash manifest')
    for path, digest in records.items():
        require(sha(resolved(path, root, repo)) == digest, f'Changed retained input or code: {path}')


def timestamp(value):
    result = dt.datetime.fromisoformat(value)
    require(result.tzinfo is not None, 'Timestamp must include its timezone')
    return result


def read_adapter(path):
    """Validate canonical F32 safetensors layout without importing torch."""
    raw = Path(path).read_bytes()
    require(len(raw) >= 8, 'Truncated adapter')
    length = struct.unpack('<Q', raw[:8])[0]
    require(2 <= length <= 100_000 and 8 + length < len(raw), 'Invalid safetensors header length')
    header = json.loads(raw[8:8 + length])
    rows = {key: value for key, value in header.items() if key != '__metadata__'}
    exact(set(rows), set(TENSOR_SHAPES), 'Adapter tensor names')
    body = raw[8 + length:]
    tensors, offsets = {}, []
    for name, item in rows.items():
        exact(item['dtype'], 'F32', f'{name} dtype')
        exact(item['shape'], TENSOR_SHAPES[name], f'{name} shape')
        start, end = item['data_offsets']
        require(type(start) is int and type(end) is int and 0 <= start < end <= len(body), 'Invalid tensor offset')
        require(end - start == math.prod(item['shape']) * 4, 'Tensor byte length does not match shape')
        values = struct.unpack('<' + str(math.prod(item['shape'])) + 'f', body[start:end])
        require(all(math.isfinite(value) for value in values), 'Nonfinite adapter weight')
        tensors[name] = values
        offsets.append((start, end))
    cursor = 0
    for start, end in sorted(offsets):
        require(start == cursor, 'Overlapping or gapped tensor storage')
        cursor = end
    require(cursor == len(body), 'Trailing adapter bytes')
    require(sum(len(values) for values in tensors.values()) == 73_728, 'Wrong adapter parameter count')
    digest = hashlib.sha256()
    for name in sorted(tensors):
        start, end = rows[name]['data_offsets']
        digest.update(name.encode())
        digest.update(str(tuple(rows[name]['shape'])).encode())
        digest.update(body[start:end])
    return tensors, digest.hexdigest()


def validate_training(dataset, receipt, config):
    require(receipt['status'] == 'executed' and receipt['device'] == 'cpu', 'Training execution not recorded')
    exact(receipt['purpose'], 'supervised-public-source-retrieval', 'Training objective')
    for field in ('publicTextUploadedToModelService', 'testLabelsUsedForOptimization',
                  'testDocumentsEncodedDuringTrainingOrSelection'):
        require(receipt[field] is False, f'Unexpected {field}')
    require(math.isfinite(receipt['trainingSeconds']) and receipt['trainingSeconds'] > 0, 'Missing runtime')
    exact({key: config[key] for key in ('seed', 'epochs', 'batchSize', 'learningRate', 'rank', 'alpha',
                                     'maxTokens', 'temperature', 'weightDecay', 'cpuThreads')},
          {'seed': 20261007, 'epochs': 8, 'batchSize': 8, 'learningRate': .0001, 'rank': 8,
           'alpha': 16, 'maxTokens': 256, 'temperature': .08, 'weightDecay': .01, 'cpuThreads': 4},
          'Frozen training configuration')
    require(receipt['baseTensorHashBefore'] == receipt['baseTensorHashAfter']
            and len(receipt['baseTensorHashBefore']) == 64, 'Frozen base hash changed')
    exact(receipt['trainableParameters'], 73_728, 'Trainable parameters')
    exact(set(receipt['trainableParameterNames']), set(TENSOR_SHAPES), 'Trainable parameter names')
    documents = dataset['documents']
    require(len(documents) == 64 and len({doc['id'] for doc in documents}) == 64, 'Invalid candidate population')
    train_docs = [doc for doc in documents if doc['split'] == 'train']
    dev_docs = [doc for doc in documents if doc['split'] in ('train', 'dev')]
    train_queries = [query for query in dataset['queries'] if query['split'] == 'train']
    dev_queries = [query for query in dataset['queries'] if query['split'] == 'dev']
    exact((len(train_docs), len(dev_docs), len(train_queries), len(dev_queries)), (39, 49, 70, 16), 'Split sizes')
    require(all(query['split'] in ('train', 'dev') for query in dataset['queries']), 'Test queries entered optimization dataset')
    exact(receipt['trainingDocumentIds'], sorted(doc['id'] for doc in train_docs), 'Training document visibility')
    exact(receipt['trainingQueryIds'], [query['id'] for query in train_queries], 'Training query visibility')
    exact(receipt['developmentQueryIds'], [query['id'] for query in dev_queries], 'Development queries')
    exact(receipt['developmentCandidateIds'], [doc['id'] for doc in dev_docs], 'Development candidates')
    train_ids = {doc['id'] for doc in train_docs}
    for query in train_queries:
        require(set(query['positiveIds'] + query['hardNegativeIds']) <= train_ids, 'Held-out document entered training labels')
    for field in ('family', 'groupId'):
        splits = {}
        for doc in documents:
            splits.setdefault(doc[field], set()).add(doc['split'])
        require(all(len(values) == 1 for values in splits.values()), f'{field} crosses splits')
    exact(receipt['baselineDevelopmentMetrics'], evaluate_rankings(dev_queries, dev_docs,
          receipt['baselineDevelopmentRankings']), 'Baseline development metrics')
    history = receipt['history']
    exact([row['epoch'] for row in history], list(range(1, 9)), 'Epoch history')
    steps_per_epoch = math.ceil(len(train_queries) / config['batchSize'])
    for row in history:
        require(math.isfinite(row['meanTrainingLoss']) and row['meanTrainingLoss'] > 0, 'Invalid training loss')
        exact(row['optimizerSteps'], row['epoch'] * steps_per_epoch, 'Epoch optimizer steps')
        exact(row['developmentMetrics'], evaluate_rankings(dev_queries, dev_docs,
              row['developmentRankings']), f'Epoch {row["epoch"]} development metrics')
    key = lambda row: tuple(row['developmentMetrics']['caseMacro'][metric]
                           for metric in ('ndcgAt5', 'mrrAt10', 'recallAt5'))
    selected = max(history, key=key)  # Python retains the earliest tied maximum.
    exact(receipt['selectedEpoch'], selected['epoch'], 'Development-only checkpoint selection')
    exact(receipt['selectedDevelopmentRankings'], selected['developmentRankings'], 'Selected checkpoint rankings')
    exact(receipt['optimizerSteps'], 72, 'Total optimizer steps')


def expected_uncertainty(systems):
    candidate = {row['caseId']: row['metrics']['ndcgAt5'] for row in systems['candidate']['metrics']['perCase']}
    base = {row['caseId']: row['metrics']['ndcgAt5'] for row in systems['base_fp32']['metrics']['perCase']}
    differences = [candidate[case] - base[case] for case in sorted(base)]
    generator = random.Random(20261007)
    values = sorted(sum(generator.choice(differences) for _ in differences) / len(differences)
                    for _ in range(10_000))
    return {'seed': 20261007, 'caseGroups': 5, 'resamples': 10_000,
            'meanDifference': sum(differences) / len(differences),
            'percentileInterval95': [values[249], values[9749]]}


def validate_evaluation(dataset, test, evaluation):
    exact(evaluation['purpose'], 'source-retrieval-evaluation', 'Evaluation objective')
    require(evaluation['testDrivenRetraining'] is False and evaluation['publicTextUploadedToModelService'] is False,
            'Unexpected evaluation/training behavior')
    queries, documents = test['queries'], dataset['documents']
    exact((len(queries), len({query['caseId'] for query in queries}), len(documents)), (20, 5, 64), 'Held-out population')
    exact((evaluation['testQueries'], evaluation['caseGroups'], evaluation['candidateDocuments']), (20, 5, 64), 'Published holdout sizes')
    require({query['caseId'] for query in queries} == set(dataset['splitPolicy']['testCases']), 'Test case group changed')
    test_ids = {doc['id'] for doc in documents if doc['split'] == 'test'}
    for query in queries:
        require(set(query['positiveIds']) <= test_ids, 'Test positives leave held-out source group')
    require(not ({query['id'] for query in queries} & {query['id'] for query in dataset['queries']}), 'Train/test query overlap')
    systems = evaluation['systems']
    exact(set(systems), {'candidate', 'base_fp32', 'base_onnx_uint8', 'bm25'}, 'Evaluation comparators')
    candidate_ids, query_ids = {doc['id'] for doc in documents}, {query['id'] for query in queries}
    for name, system in systems.items():
        exact(system['metrics'], evaluate_rankings(queries, documents, system['rankings']), f'{name} metrics')
        exact(set(system['scores']), query_ids, f'{name} score query IDs')
        for query_id, scores in system['scores'].items():
            exact(set(scores), candidate_ids, f'{name} score candidate IDs')
            require(all(type(value) in (int, float) and math.isfinite(value) for value in scores.values()), 'Nonfinite retrieval score')
            ranking = sorted(scores, key=lambda doc_id: (-scores[doc_id], doc_id))
            exact(system['rankings'][query_id], ranking, f'{name} score/ranking ordering')
    decision = promotion_decision(systems)
    exact(evaluation['promotion'], decision, 'Prespecified promotion gate')
    expected = expected_uncertainty(systems)
    exact({key: evaluation['uncertainty'][key] for key in expected}, expected, 'Case bootstrap')


def validate_status(status, receipt, evaluation, adapter_sha, evaluation_sha):
    decision = evaluation['promotion']
    expected = {
        'schemaVersion': 1, 'modelLabel': 'MiniLM local LoRA', 'status': decision['status'],
        'objective': 'source-retrieval', 'trained': True, 'forecastProbabilitiesEstimated': False,
        'trainableParameters': 73_728, 'trainingQueries': 70, 'trainingDocuments': 39,
        'developmentQueries': 16, 'holdoutQueries': 20, 'holdoutCases': 5, 'indexedDocuments': 64,
        'selectedEpoch': receipt['selectedEpoch'], 'defaultRetriever': decision['defaultRetriever'],
        'adapterSha256': adapter_sha, 'evaluationSha256': evaluation_sha,
        'scores': {name: system['metrics']['caseMacro'] for name, system in evaluation['systems'].items()},
        'failedCriteria': [item['name'] for item in decision['criteria'] if not item['passed']],
        'completedAt': evaluation['completedAt'], 'limitations': evaluation['limitations'],
    }
    exact(status, expected, 'Published model status')


def verify(root=DEFAULT_ROOT, repo=REPO):
    root, repo = Path(root), Path(repo)
    dataset = read(root / 'dataset.json')
    config = read(root / 'training-config.json')
    receipt = read(root / 'training-receipt.json')
    evaluation = read(root / 'evaluation.json')
    test = read(root / 'test-labels.json')
    freeze = read(root / 'test-freeze-receipt.json')
    invocation = read(root / 'test-invocation.json')
    exact(sha(root / 'test-labels.json'), TEST_LABEL_SHA, 'Locked independent labels')
    for entry in freeze['files']:
        path = resolved(entry['path'], root, repo)
        require(sha(path) == entry['sha256'] and path.stat().st_size == entry['bytes'], 'Frozen label/source provenance changed')
    require(len(freeze['files']) == 8 and freeze['candidateOutputsInspectedBeforeFreeze'] is False, 'Invalid independent freeze')
    require(timestamp(freeze['frozenAtUtc']) < timestamp(receipt['startedAt'])
            < timestamp(receipt['completedAt']) < timestamp(evaluation['startedAt'])
            < timestamp(evaluation['completedAt']), 'Invalid freeze/train/test chronology')
    for entry in dataset['inputHashes']:
        exact(sha(resolved(entry['path'], root, repo)), entry['sha256'], 'Dataset source lineage')
    hash_map(receipt['inputHashes'], root, repo)
    hash_map(receipt['codeHashes'], root, repo)
    for name in ('train.py', 'encoder.py', 'metrics.py', 'prepare_assets.py'):
        require(f'scripts/research-radar/fine-tuning/{name}' in receipt['codeHashes'], 'Training executable missing from receipt')
    exact(sha(root / 'training-config.json'), receipt['configSha256'], 'Executed training configuration')
    exact(set(receipt['artifactHashes']), {'adapter.safetensors', 'initial-adapter.safetensors',
          'adapter_config.json', 'base-assets.json'}, 'Training artifact manifest')
    for name, digest in receipt['artifactHashes'].items():
        exact(sha(root / name), digest, f'Executed artifact {name}')
    validate_training(dataset, receipt, config)

    adapter, selected_tensor_hash = read_adapter(root / 'adapter.safetensors')
    initial, initial_tensor_hash = read_adapter(root / 'initial-adapter.safetensors')
    exact(selected_tensor_hash, receipt['selectedAdapterTensorHash'], 'Selected tensor hash')
    exact(initial_tensor_hash, receipt['initialAdapterTensorHash'], 'Initial tensor hash')
    delta = math.sqrt(sum((left - right) ** 2 for name in adapter
                          for left, right in zip(adapter[name], initial[name])))
    require(delta > 0 and math.isclose(delta, receipt['adapterDeltaL2'], rel_tol=1e-6), 'Actual adapter delta does not match training receipt')
    for name in adapter:
        if name.endswith('lora_b'):
            require(all(value == 0 for value in initial[name]), 'Initial B matrix was not zero')
            require(any(value != 0 for value in adapter[name]), 'An attention adapter was not updated')
    adapter_config = read(root / 'adapter_config.json')
    exact({key: adapter_config[key] for key in ('baseModelId', 'baseRevision', 'license', 'rank', 'alpha',
          'targetModules', 'trainableParameters', 'maxTokens', 'purpose', 'automaticallyVerified')},
          {'baseModelId': MODEL_ID, 'baseRevision': REVISION, 'license': 'Apache-2.0', 'rank': 8, 'alpha': 16,
           'targetModules': TARGETS, 'trainableParameters': 73_728, 'maxTokens': 256,
           'purpose': 'public-source-retrieval-only', 'automaticallyVerified': False}, 'Adapter configuration')
    base_assets = read(root / 'base-assets.json')
    exact((base_assets['modelId'], base_assets['revision'], base_assets['license']), (MODEL_ID, REVISION, 'Apache-2.0'), 'Base model provenance')
    exact({item['filename']: item['sha256'] for item in base_assets['assets']}, ASSETS, 'Pinned base assets')

    for key, filename in (('datasetSha256', 'dataset.json'), ('testLabelsSha256', 'test-labels.json'),
                          ('trainingReceiptSha256', 'training-receipt.json'), ('trainingConfigSha256', 'training-config.json'),
                          ('testFreezeReceiptSha256', 'test-freeze-receipt.json')):
        exact(evaluation[key], sha(root / filename), f'Evaluation {key}')
    hash_map(evaluation['codeHashes'], root, repo)
    for name in ('evaluate.py', 'policy.py', 'metrics.py'):
        require(f'scripts/research-radar/fine-tuning/{name}' in evaluation['codeHashes'], 'Evaluation executable missing')
    require('scripts/education/model-rank.py' in evaluation['codeHashes'], 'Original ONNX loader is not hash-bound')
    exact(invocation['executableHashes'], evaluation['codeHashes'], 'Single invocation executable provenance')
    exact(invocation['startedAt'], evaluation['startedAt'], 'Single invocation start')
    exact(invocation['trainingReceiptSha256'], sha(root / 'training-receipt.json'), 'Single invocation checkpoint')
    exact(invocation['testLabelsSha256'], TEST_LABEL_SHA, 'Single invocation labels')
    lock = dict(line.split('==', 1) for line in (root / 'requirements.lock').read_text().splitlines() if '==' in line)
    for record in (receipt, evaluation):
        for name, version in record['runtime'].items():
            exact(lock.get(name), version, f'Executed runtime {name}')
    require('onnxruntime' in evaluation['runtime'], 'ONNX runtime version absent')
    spec = importlib.util.spec_from_file_location('original_radar_model', repo / 'scripts/education/model-rank.py')
    original = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(original)
    exact(evaluation['originalOnnxAssets'], {name: {'sha256': values[0], 'bytes': values[1]}
          for name, values in original.ASSETS.items()}, 'Original quantized model assets')
    validate_evaluation(dataset, test, evaluation)
    exact(evaluation['systems']['candidate']['configuration']['adapterSha256'], sha(root / 'adapter.safetensors'), 'Evaluated candidate adapter')
    exact(evaluation['systems']['candidate']['configuration']['selectedEpoch'], receipt['selectedEpoch'], 'Evaluated selected checkpoint')
    validate_status(read(root / 'model-status.json'), receipt, evaluation,
                    sha(root / 'adapter.safetensors'), sha(root / 'evaluation.json'))
    return {'verified': True, 'trainingSteps': receipt['optimizerSteps'], 'trainableParameters': 73_728,
            'actualAdapterDeltaL2': delta, 'heldOutQueries': 20, 'heldOutCases': 5,
            'systemsRecomputed': 4, 'promotion': evaluation['promotion']['status'],
            'downloads': 0, 'trainingOrInferenceExecuted': False}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=DEFAULT_ROOT)
    args = parser.parse_args()
    print(json.dumps(verify(args.root), indent=2, allow_nan=False))
