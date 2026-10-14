#!/usr/bin/env python3
"""Integrity checks using the actually retained corpus and executed model output."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

spec = importlib.util.spec_from_file_location('research_radar_model', Path(__file__).with_name('model-rank.py'))
wrapper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(wrapper)
engine = wrapper.model_engine()
documents, digest = engine.read_corpus(wrapper.DEFAULT_INPUT)
corpus = json.loads(wrapper.DEFAULT_INPUT.read_text())
result = json.loads(wrapper.DEFAULT_OUTPUT.read_text())


class ResearchRadarModelIntegrity(unittest.TestCase):
    def read_rows(self, rows):
        with TemporaryDirectory() as directory:
            path = Path(directory) / 'corpus.json'
            path.write_text(json.dumps({'documents': rows}))
            return engine.read_corpus(path)

    def test_actual_retained_inputs_and_all_regional_hashes(self):
        self.assertEqual(len(corpus['sourceRegistries']), 4)
        for item in corpus['sourceRegistries']:
            self.assertEqual(hashlib.sha256(Path(item['path']).read_bytes()).hexdigest(), item['sha256'])
        self.assertEqual(corpus['sourceSummaryCount'] + corpus['caseSummaryCount'], len(documents))
        self.assertGreater(corpus['sourceSummaryCount'], 0)
        self.assertGreater(corpus['caseSummaryCount'], 0)
        self.assertEqual(corpus['uniqueCitationUrls'], len({row['url'] for row in documents}))

    def test_pinned_executed_local_artifact(self):
        engine.validate_result(result, documents, digest)
        self.assertEqual(result['researchDomain'], 'research-radar')
        self.assertFalse(result['execution']['publicTextUploadedToModelService'])
        self.assertGreater(result['execution']['inferenceSeconds'], 0)
        self.assertEqual(result['model']['license'], 'Apache-2.0')
        self.assertEqual(result['model']['maxTokens'], 256)

    def test_changed_corpus_requires_new_inference(self):
        with self.assertRaises(ValueError):
            engine.validate_result(result, documents, '0' * 64)

    def test_rank_cannot_be_promoted_to_verified_evidence(self):
        changed = copy.deepcopy(result)
        changed['automaticallyVerified'] = True
        with self.assertRaises(ValueError):
            engine.validate_result(changed, documents, digest)

    def test_invented_or_modified_citation_is_rejected(self):
        changed = copy.deepcopy(result)
        next(iter(changed['queries'].values()))['matches'][0]['url'] = 'https://example.com/invented'
        with self.assertRaises(ValueError):
            engine.validate_result(changed, documents, digest)

    def test_unknown_duplicate_and_nonfinite_match_rejected(self):
        for mutation in ('unknown', 'duplicate', 'nan'):
            changed = copy.deepcopy(result)
            matches = next(iter(changed['queries'].values()))['matches']
            if mutation == 'unknown':
                matches[0]['documentId'] = 'not-in-retained-corpus'
            elif mutation == 'duplicate':
                matches[1] = copy.deepcopy(matches[0])
            else:
                matches[0]['similarity'] = float('nan')
            with self.assertRaises(ValueError, msg=mutation):
                engine.validate_result(changed, documents, digest)

    def test_original_corpus_guards_remain_enforced(self):
        for rows in ([documents[0]] * 2001, [documents[0], documents[0]]):
            with self.assertRaises(ValueError):
                self.read_rows(rows)
        rows = copy.deepcopy(documents[:1])
        rows[0]['url'] = 'https://private:secret@example.com/data'
        with self.assertRaises(ValueError):
            self.read_rows(rows)

    def test_every_actual_ranked_slot_has_a_hash_bound_review(self):
        review = json.loads(Path('research/research-radar/model-output-review.json').read_text())
        self.assertEqual(review['corpusSha256'], digest)
        self.assertEqual(review['suggestionsSha256'], hashlib.sha256(wrapper.DEFAULT_OUTPUT.read_bytes()).hexdigest())
        expected = [(query_id, rank, match['documentId'], match['url'], match['similarity'])
                    for query_id, query in result['queries'].items()
                    for rank, match in enumerate(query['matches'], 1)]
        actual = [(row['queryId'], row['rank'], row['documentId'], row['url'], row['similarity']) for row in review['decisions']]
        self.assertEqual(actual, expected)
        self.assertEqual(review['slotCount'], len(expected))
        self.assertEqual(review['promotedGraphEdges'], 0)
        for row in review['decisions']:
            self.assertIn(row['decision'], {'follow-up', 'duplicate-lineage', 'context-only', 'rejected-association'})
            self.assertTrue(row['reason'].strip())
            self.assertEqual(row['promotedGraphEdges'], 0)


if __name__ == '__main__':
    unittest.main()
