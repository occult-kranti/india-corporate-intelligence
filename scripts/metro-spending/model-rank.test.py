#!/usr/bin/env python3
"""Reject citation fabrication, stale inference and automatic factual promotion."""
import copy
import importlib.util
import json
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('metro_model', Path(__file__).with_name('model-rank.py'))
wrapper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(wrapper)
engine = wrapper.model_engine()
documents, digest = engine.read_corpus(wrapper.DEFAULT_INPUT)
result = json.loads(wrapper.DEFAULT_OUTPUT.read_text())


class MetroModelContract(unittest.TestCase):
    def test_pinned_executed_local_artifact(self):
        engine.validate_result(result, documents, digest)
        self.assertEqual(result['researchDomain'], 'metro-spending')
        self.assertFalse(result['execution']['publicTextUploadedToModelService'])
        self.assertGreater(result['execution']['inferenceSeconds'], 0)
        self.assertEqual(result['model']['license'], 'Apache-2.0')

    def test_cannot_promote_a_rank_to_verified_evidence(self):
        changed = copy.deepcopy(result)
        changed['automaticallyVerified'] = True
        with self.assertRaises(ValueError):
            engine.validate_result(changed, documents, digest)

    def test_changed_source_corpus_requires_new_execution(self):
        with self.assertRaises(ValueError):
            engine.validate_result(result, documents, '0' * 64)

    def test_invented_source_url_rejected(self):
        changed = copy.deepcopy(result)
        next(iter(changed['queries'].values()))['matches'][0]['url'] = 'https://example.com/invented'
        with self.assertRaises(ValueError):
            engine.validate_result(changed, documents, digest)


if __name__ == '__main__':
    unittest.main()
