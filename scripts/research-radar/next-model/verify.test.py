#!/usr/bin/env python3
"""Mutation tests for offline artifact verification; no Torch/NumPy dependencies."""
import copy
import importlib.util
import json
from pathlib import Path
import random
import struct
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('offline_verifier', Path(__file__).with_name('verify.py'))
v = importlib.util.module_from_spec(spec); spec.loader.exec_module(v)


def npy_bytes(values, shape=(2, 2), dtype='<f4', fortran=False):
    header = repr({'descr': dtype, 'fortran_order': fortran, 'shape': shape}).encode() + b'\n'
    code = dtype[0] + ('f' if dtype.endswith('4') else 'd')
    return b'\x93NUMPY\x01\x00' + len(header).to_bytes(2, 'little') + header + b''.join(struct.pack(code, x) for x in values)


def tensor_bytes(values, name='layer.query.lora_a', shape=(2, 2), dtype='F32', offsets=None):
    payload = struct.pack('<' + 'f' * len(values), *values)
    header = json.dumps({name: {'dtype': dtype, 'shape': list(shape), 'data_offsets': offsets or [0, len(payload)]}}).encode()
    return len(header).to_bytes(8, 'little') + header + payload


class OfflineReaderTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(); self.path = Path(self.tmp.name) / 'array'

    def tearDown(self):
        self.tmp.cleanup()

    def test_npy_scores_are_read_without_numpy(self):
        for dtype in ['<f4', '>f4', '<f8', '>f8']:
            self.path.write_bytes(npy_bytes([1, 2, 3, 4], dtype=dtype))
            self.assertEqual(v.read_npy(self.path), [[1, 2], [3, 4]])

    def test_npy_rejects_pickle_nonfinite_truncation_and_order_mutations(self):
        variants = [npy_bytes([1, 2, float('nan'), 4]), npy_bytes([1, 2, 3, 4], fortran=True), npy_bytes([1, 2, 3]), npy_bytes([1, 2, 3, 4]).replace(b'<f4', b'|O8'), b'pickle-object']
        for raw in variants:
            with self.subTest(raw=raw[:20]):
                self.path.write_bytes(raw)
                with self.assertRaises((ValueError, SyntaxError)):
                    v.read_npy(self.path)

    def test_adapter_tensor_count_hash_and_actual_delta(self):
        self.path.write_bytes(tensor_bytes([0, 1, 2, 3])); initial = v.read_adapter(self.path)
        self.path.write_bytes(tensor_bytes([0, 1, 2, 4])); final = v.read_adapter(self.path)
        self.assertEqual(sum(len(x['values']) for x in final.values()), 4)
        self.assertNotEqual(v.adapter_tensor_hash(initial), v.adapter_tensor_hash(final))
        self.assertEqual(v.adapter_delta(initial, final), 1)
        self.assertEqual(v.adapter_delta(initial, initial), 0)

    def test_adapter_rejects_base_weights_nonfinite_and_misaligned_offsets(self):
        variants = [tensor_bytes([1, 2, 3, 4], name='layer.query.weight'), tensor_bytes([1, 2, float('inf'), 4]), tensor_bytes([1, 2, 3, 4], shape=(2, 3)), tensor_bytes([1, 2, 3, 4], offsets=[4, 20]), tensor_bytes([1, 2, 3, 4], dtype='F16')]
        for raw in variants:
            self.path.write_bytes(raw)
            with self.assertRaises(ValueError):
                v.read_adapter(self.path)

    def test_path_rebase_is_portable_and_cannot_escape_checkout(self):
        self.assertEqual(v.repo_path('/workspace/india-corporate-intelligence/scripts/research-radar/next-model/train.py'), v.ROOT / 'scripts/research-radar/next-model/train.py')
        for path in ['../../private', '/etc/passwd', '/workspace/india-corporate-intelligence/../../escape']:
            with self.assertRaises(ValueError):
                v.repo_path(path)


class MetricBoundaryTests(unittest.TestCase):
    def test_source_id_ties_and_case_macro_counterevidence(self):
        docs = [{'id': 'b'}, {'id': 'a'}, {'id': 'c'}]
        self.assertEqual(v.ordered([1, 1, 0], docs), [1, 0, 2])
        queries = [{'id': 'one', 'caseId': 'case-a', 'positiveIds': ['a'], 'requiredCounterevidenceIds': ['a']}, {'id': 'two', 'caseId': 'case-b', 'positiveIds': ['b'], 'requiredCounterevidenceIds': []}]
        m = v.development_metrics(queries, docs, [[0, 1, 0], [1, 0, 0]])
        self.assertEqual(m['caseMacro'], {'ndcgAt5': 1.0, 'counterevidenceRecallAt5': 1.0})
        self.assertIsNone(m['perCase'][1]['counterevidenceRecallAt5'])
        with self.assertRaises(ValueError):
            v.development_metrics(queries, docs, [[0, float('inf'), 0], [1, 0, 0]])

    def test_rrf_preserves_complete_candidates_and_fixed_rank_rule(self):
        docs = [{'id': 'a'}, {'id': 'b'}, {'id': 'c'}]
        values = v.rrf_scores([[3, 2, 1]], [[1, 2, 3]], docs)
        self.assertAlmostEqual(values[0][1], 2 / 62)
        self.assertAlmostEqual(values[0][0], 1 / 61 + 1 / 63)
        self.assertEqual(v.ordered(values[0], docs)[0], 0)

    def test_only_declared_epochs_and_ties_are_selection_eligible(self):
        records = [{'family': f, 'fusion': u, 'epoch': epoch, 'trainableParameters': size, 'metrics': {'caseMacro': {'ndcgAt5': .8, 'counterevidenceRecallAt5': .5}}} for f, size in [('e5', 147456), ('f2', 237568)] for u in ['none', 'rrf'] for epoch in [1, 2, 3]]
        selected = sorted(records, key=v.selection_key)[0]
        self.assertEqual((selected['family'], selected['fusion'], selected['epoch']), ('e5', 'none', 1))
        records[-1]['metrics']['caseMacro']['ndcgAt5'] = .9
        self.assertEqual(sorted(records, key=v.selection_key)[0], records[-1])

    def test_batch_mask_rejects_unlabelled_or_heldout_sources(self):
        queries = [{'id': f'q{i}', 'positiveIds': [f'p{i}'], 'hardNegativeIds': [f'n{i}']} for i in range(5)]
        config = {'seed': 123, 'epochs': 3, 'batchSize': 2}; rng = random.Random(config['seed']); history = []
        for epoch in range(1, 4):
            order = list(range(5)); rng.shuffle(order); batches = []
            for start in range(0, 5, 2):
                items = [queries[i] for i in order[start:start + 2]]
                batches.append({'queryIds': [q['id'] for q in items], 'encodedSourceIds': sorted({s for q in items for s in q['positiveIds'] + q['hardNegativeIds']})})
            history.append({'epoch': epoch, 'batches': batches, 'optimizerSteps': epoch * 3, 'meanTrainingLoss': .2})
        allowed = {s for q in queries for s in q['positiveIds'] + q['hardNegativeIds']}
        self.assertEqual(v.verify_batches(history, queries, allowed, config), 9)
        changed = copy.deepcopy(history); changed[0]['batches'][0]['encodedSourceIds'].append('held-out')
        with self.assertRaisesRegex(ValueError, 'unlabelled'):
            v.verify_batches(changed, queries, allowed, config)
        with self.assertRaisesRegex(ValueError, 'heldout'):
            v.verify_batches(history, queries, set(), config)
        changed = copy.deepcopy(history); changed[0]['optimizerSteps'] += 1
        with self.assertRaisesRegex(ValueError, 'Optimizer'):
            v.verify_batches(changed, queries, allowed, config)


@unittest.skipUnless((v.RUN / 'training-receipt.json').exists(), 'Executed training receipt not yet present')
class ExecutedArtifactMutationTests(unittest.TestCase):
    def mutate_receipt(self, mutate):
        original = v.read_json
        def altered(path):
            data = original(path)
            if Path(path) == v.RUN / 'training-receipt.json':
                mutate(data)
            return data
        return patch.object(v, 'read_json', side_effect=altered)

    def test_actual_executed_training_passes_offline_verifier(self):
        result = v.verify_training()
        self.assertEqual(len(result['families']), 2)

    def test_frozen_base_mutation_is_detected(self):
        with self.mutate_receipt(lambda x: x['families'][0].update(frozenBaseTensorHashAfter='0' * 64)):
            with self.assertRaisesRegex(ValueError, 'Frozen base'):
                v.verify_training()

    def test_heldout_training_candidate_is_detected(self):
        with self.mutate_receipt(lambda x: x['trainingCandidateIds'].append('test-source')):
            with self.assertRaisesRegex(ValueError, 'Training candidate mask'):
                v.verify_training()

    def test_falsified_metrics_are_detected(self):
        with self.mutate_receipt(lambda x: x['baselineDevelopmentMetrics']['bm25']['caseMacro'].update(ndcgAt5=0)):
            with self.assertRaisesRegex(ValueError, 'BM25 development metrics'):
                v.verify_training()


@unittest.skipUnless((v.DATA / 'evaluation.json').exists(), 'Completed final evaluation not yet present')
class EvaluatedArtifactMutationTests(unittest.TestCase):
    def test_completed_evaluation_metrics_and_fixed_gate_recompute(self):
        self.assertEqual(v.verify_evaluation()['queries'], 24)

    def test_promotion_claim_cannot_be_flipped(self):
        original = v.read_json
        def altered(path):
            data = original(path)
            if Path(path) == v.DATA / 'evaluation.json':
                data['promotion']['promoted'] = not data['promotion']['promoted']
            return data
        with patch.object(v, 'read_json', side_effect=altered):
            with self.assertRaisesRegex(ValueError, 'promotion gate'):
                v.verify_evaluation()

    def test_website_default_cannot_ignore_release_gate(self):
        original = v.read_json
        def altered(path):
            data = original(path)
            if Path(path) == v.DATA / 'ui-status.json':
                data['defaultRetriever'] = 'unverified-model'
            return data
        with patch.object(v, 'read_json', side_effect=altered):
            with self.assertRaisesRegex(ValueError, 'Website status projection'):
                v.verify_report()


if __name__ == '__main__':
    unittest.main()
