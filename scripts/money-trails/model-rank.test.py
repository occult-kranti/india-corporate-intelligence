#!/usr/bin/env python3
"""Reject citation fabrication, stale inference and automatic factual promotion."""
import copy
import importlib.util
import json
from pathlib import Path
import unittest
from tempfile import TemporaryDirectory

spec = importlib.util.spec_from_file_location('money_trails_model', Path(__file__).with_name('model-rank.py'))
wrapper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(wrapper)
engine = wrapper.model_engine()
documents, digest = engine.read_corpus(wrapper.DEFAULT_INPUT)
result = json.loads(wrapper.DEFAULT_OUTPUT.read_text())


class MoneyTrailsModelContract(unittest.TestCase):
    def read_rows(self, rows):
        with TemporaryDirectory() as directory:
            corpus = Path(directory) / 'corpus.json'
            corpus.write_text(json.dumps({'documents': rows}))
            return engine.read_corpus(corpus)

    def test_registry_wide_review_keeps_rows_beyond_legacy_limit(self):
        self.assertGreater(len(documents), 2000)
        retained, _ = self.read_rows(documents)
        self.assertEqual([row['id'] for row in retained], [row['id'] for row in documents])

    def test_duplicate_identity_across_chunks_is_rejected(self):
        rows = copy.deepcopy(documents[:2001])
        rows[2000] = copy.deepcopy(rows[0])
        with self.assertRaisesRegex(ValueError, 'Duplicate'):
            self.read_rows(rows)

    def test_registry_cap_and_later_chunk_validation_remain_enforced(self):
        with self.assertRaisesRegex(ValueError, '5,000'):
            self.read_rows([documents[0]] * 5001)
        rows = copy.deepcopy(documents[:2001])
        rows[2000]['url'] = 'https://user:password@example.com/private'
        with self.assertRaises(ValueError):
            self.read_rows(rows)

    def test_pinned_executed_local_artifact(self):
        engine.validate_result(result, documents, digest)
        self.assertEqual(result['researchDomain'], 'money-trails')
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
