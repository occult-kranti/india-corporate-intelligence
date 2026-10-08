"""Mutation tests challenge retained fine-tuning artifacts without model downloads."""
import copy
import json
from pathlib import Path
import shutil
import struct
import subprocess
import sys
from tempfile import TemporaryDirectory
import unittest

import verify as verifier


ROOT = verifier.DEFAULT_ROOT
DATASET = verifier.read(ROOT / 'dataset.json')
RECEIPT = verifier.read(ROOT / 'training-receipt.json')
CONFIG = verifier.read(ROOT / 'training-config.json')
TEST = verifier.read(ROOT / 'test-labels.json')
EVALUATION = verifier.read(ROOT / 'evaluation.json')
STATUS = verifier.read(ROOT / 'model-status.json')


class FineTuningIntegrity(unittest.TestCase):
    def test_complete_executed_artifacts_pass_without_runtime_dependencies(self):
        result = verifier.verify()
        self.assertEqual(result['trainingSteps'], 72)
        self.assertGreater(result['actualAdapterDeltaL2'], 0)
        self.assertEqual(result['promotion'], 'experimental-not-promoted')
        self.assertFalse(result['trainingOrInferenceExecuted'])
        self.assertNotIn('torch', sys.modules)
        self.assertNotIn('onnxruntime', sys.modules)

    def test_offline_verification_works_without_site_packages(self):
        result = subprocess.run([sys.executable, '-S', str(Path(verifier.__file__))],
                                cwd=verifier.REPO, text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(json.loads(result.stdout)['verified'])

    def test_artifact_directory_can_be_relocated_and_modified_weights_fail(self):
        with TemporaryDirectory() as temporary:
            root = Path(temporary) / 'artifacts'
            shutil.copytree(ROOT, root)
            self.assertTrue(verifier.verify(root)['verified'])
            path = root / 'adapter.safetensors'
            data = bytearray(path.read_bytes())
            data[-1] ^= 1
            path.write_bytes(data)
            with self.assertRaisesRegex(ValueError, 'Executed artifact'):
                verifier.verify(root)

    def test_nonfinite_tensor_and_wrong_shape_rejected_independently_of_manifest(self):
        raw = (ROOT / 'adapter.safetensors').read_bytes()
        length = struct.unpack('<Q', raw[:8])[0]
        with TemporaryDirectory() as temporary:
            path = Path(temporary) / 'candidate.safetensors'
            nonfinite = raw[:8 + length] + struct.pack('<f', float('nan')) + raw[12 + length:]
            path.write_bytes(nonfinite)
            with self.assertRaisesRegex(ValueError, 'Nonfinite adapter'):
                verifier.read_adapter(path)
            header = json.loads(raw[8:8 + length])
            first = next(name for name in header if name != '__metadata__')
            header[first]['shape'] = [4, 768]
            encoded = json.dumps(header).encode()
            path.write_bytes(struct.pack('<Q', len(encoded)) + encoded + raw[8 + length:])
            with self.assertRaisesRegex(ValueError, 'shape'):
                verifier.read_adapter(path)

    def test_held_out_document_in_training_visibility_is_rejected(self):
        changed = copy.deepcopy(RECEIPT)
        held_out = next(row['id'] for row in DATASET['documents'] if row['split'] == 'test')
        changed['trainingDocumentIds'][0] = held_out
        with self.assertRaisesRegex(ValueError, 'Training document visibility'):
            verifier.validate_training(DATASET, changed, CONFIG)

    def test_no_source_family_may_cross_the_holdout(self):
        changed = copy.deepcopy(DATASET)
        train = next(row for row in changed['documents'] if row['split'] == 'train')
        test = next(row for row in changed['documents'] if row['split'] == 'test')
        test['family'] = train['family']
        with self.assertRaisesRegex(ValueError, 'family crosses splits'):
            verifier.validate_training(changed, RECEIPT, CONFIG)

    def test_fabricated_steps_or_changed_frozen_base_fail(self):
        for field, value in [('optimizerSteps', 999), ('baseTensorHashAfter', '0' * 64)]:
            changed = copy.deepcopy(RECEIPT)
            changed[field] = value
            with self.subTest(field=field), self.assertRaises(ValueError):
                verifier.validate_training(DATASET, changed, CONFIG)

    def test_checkpoint_selection_cannot_use_a_later_tied_epoch(self):
        changed = copy.deepcopy(RECEIPT)
        changed['selectedEpoch'] = 8
        with self.assertRaisesRegex(ValueError, 'Development-only checkpoint selection'):
            verifier.validate_training(DATASET, changed, CONFIG)

    def test_development_metrics_are_recomputed_from_complete_rankings(self):
        changed = copy.deepcopy(RECEIPT)
        changed['history'][0]['developmentMetrics']['caseMacro']['ndcgAt5'] = 1.0
        with self.assertRaisesRegex(ValueError, 'development metrics'):
            verifier.validate_training(DATASET, changed, CONFIG)

    def test_held_out_metrics_and_score_ordering_cannot_be_fabricated(self):
        for mutation in ('metric', 'order', 'nan'):
            changed = copy.deepcopy(EVALUATION)
            candidate = changed['systems']['candidate']
            query_id = next(iter(candidate['scores']))
            document_id = next(iter(candidate['scores'][query_id]))
            if mutation == 'metric':
                candidate['metrics']['caseMacro']['ndcgAt5'] = 1.0
            elif mutation == 'order':
                candidate['scores'][query_id][document_id] = -100.0
            else:
                candidate['scores'][query_id][document_id] = float('nan')
            with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                verifier.validate_evaluation(DATASET, TEST, changed)

    def test_omitted_candidate_is_not_silently_ignored(self):
        changed = copy.deepcopy(EVALUATION)
        query_id = next(iter(changed['systems']['candidate']['rankings']))
        changed['systems']['candidate']['rankings'][query_id].pop()
        with self.assertRaisesRegex(ValueError, 'every candidate exactly once'):
            verifier.validate_evaluation(DATASET, TEST, changed)

    def test_promotion_and_bootstrap_are_recomputed(self):
        for mutation in ('promotion', 'bootstrap'):
            changed = copy.deepcopy(EVALUATION)
            if mutation == 'promotion':
                changed['promotion']['promoted'] = True
            else:
                changed['uncertainty']['percentileInterval95'] = [.5, .9]
            with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                verifier.validate_evaluation(DATASET, TEST, changed)

    def test_model_status_cannot_claim_promotion_or_probability_training(self):
        for field, value in [('status', 'promoted-retrieval-only'), ('forecastProbabilitiesEstimated', True),
                             ('trainingQueries', 769), ('defaultRetriever', 'candidate')]:
            changed = copy.deepcopy(STATUS)
            changed[field] = value
            with self.subTest(field=field), self.assertRaisesRegex(ValueError, 'Published model status'):
                verifier.validate_status(changed, RECEIPT, EVALUATION,
                                         verifier.sha(ROOT / 'adapter.safetensors'), verifier.sha(ROOT / 'evaluation.json'))

    def test_runtime_lock_is_checked_against_actual_receipts(self):
        with TemporaryDirectory() as temporary:
            root = Path(temporary) / 'artifacts'
            shutil.copytree(ROOT, root)
            path = root / 'requirements.lock'
            path.write_text(path.read_text().replace('onnxruntime==1.23.2', 'onnxruntime==0.0.0'))
            with self.assertRaisesRegex(ValueError, 'Executed runtime onnxruntime'):
                verifier.verify(root)

    def test_holdout_labels_remain_byte_frozen(self):
        with TemporaryDirectory() as temporary:
            root = Path(temporary) / 'artifacts'
            shutil.copytree(ROOT, root)
            path = root / 'test-labels.json'
            path.write_text(path.read_text() + '\n')
            with self.assertRaisesRegex(ValueError, 'Locked independent labels'):
                verifier.verify(root)

    def test_freeze_must_precede_training(self):
        with TemporaryDirectory() as temporary:
            root = Path(temporary) / 'artifacts'
            shutil.copytree(ROOT, root)
            path = root / 'test-freeze-receipt.json'
            freeze = verifier.read(path)
            freeze['frozenAtUtc'] = EVALUATION['completedAt']
            path.write_text(json.dumps(freeze))
            with self.assertRaisesRegex(ValueError, 'chronology'):
                verifier.verify(root)


if __name__ == '__main__':
    unittest.main()
