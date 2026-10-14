"""Analytical fixtures test retrieval metrics independently of model weights."""
import copy
import math
import unittest

from metrics import evaluate_rankings


def documents(count=12):
    return [{'id': f'd{index}', 'family': f'f{index}'} for index in range(count)]


def query(query_id='q', case_id='case', positives=None, **kwargs):
    relevance = positives or {'d0': 2}
    return {'id': query_id, 'caseId': case_id, 'positiveIds': list(relevance),
            'relevance': relevance, 'hardNegativeIds': [], **kwargs}


class RetrievalMetrics(unittest.TestCase):
    def test_perfect_graded_ranking_and_undefined_subsets(self):
        docs = documents()
        result = evaluate_rankings([query(positives={'d0': 2, 'd1': 1})], docs,
                                   {'q': [row['id'] for row in docs]})
        for name in ('ndcgAt5', 'mrrAt10', 'recallAt5', 'familyNdcgAt5', 'familyRecallAt5'):
            self.assertEqual(result['macro'][name], 1)
        self.assertIsNone(result['macro']['hardNegativePreference'])
        self.assertIsNone(result['macro']['counterevidenceRecallAt5'])

    def test_graded_gain_and_rank_discount_are_not_binary_accuracy(self):
        docs = documents()
        ranks = ['d1', 'd0'] + [row['id'] for row in docs[2:]]
        result = evaluate_rankings([query(positives={'d0': 2, 'd1': 1})], docs, {'q': ranks})
        expected = (1 + 3 / math.log2(3)) / (3 + 1 / math.log2(3))
        self.assertAlmostEqual(result['macro']['ndcgAt5'], expected)

    def test_family_collapsing_does_not_count_syndicated_duplicates_twice(self):
        docs = documents()
        docs[1]['family'] = docs[0]['family']
        q = query(positives={'d0': 2, 'd1': 2, 'd5': 1})
        result = evaluate_rankings([q], docs, {'q': [row['id'] for row in docs]})
        self.assertAlmostEqual(result['macro']['recallAt5'], 2 / 3)
        self.assertEqual(result['macro']['familyRecallAt5'], 1)
        self.assertEqual(result['perQuery'][0]['positiveFamilyCount'], 2)

    def test_mrr_stops_at_ten_and_recall_uses_all_positives(self):
        docs = documents()
        q = query(positives={'d10': 2, 'd11': 1})
        result = evaluate_rankings([q], docs, {'q': [row['id'] for row in docs]})
        self.assertEqual(result['macro']['mrrAt10'], 0)
        self.assertEqual(result['macro']['recallAt5'], 0)
        self.assertEqual(result['macro']['ndcgAt5'], 0)

    def test_hard_negative_preference_and_explicit_counterevidence_denominator(self):
        docs = documents()
        q = query(positives={'d1': 2, 'd6': 1}, hardNegativeIds=['d0', 'd3'],
                  requiredCounterevidenceIds=['d6'])
        result = evaluate_rankings([q], docs, {'q': [row['id'] for row in docs]})
        self.assertEqual(result['macro']['hardNegativePreference'], .5)
        self.assertEqual(result['macro']['counterevidenceRecallAt5'], 0)
        self.assertEqual(result['macro']['recallAt5'], .5)

    def test_explicit_counterevidence_flag_and_absent_subset_remain_distinct(self):
        docs = documents()
        queries = [query('tagged', counterevidence=True), query('ordinary', intent='counterevidence')]
        ranks = {q['id']: [row['id'] for row in docs] for q in queries}
        result = evaluate_rankings(queries, docs, ranks)
        self.assertEqual(result['macro']['counterevidenceRecallAt5'], 1)
        self.assertTrue(result['perQuery'][0]['counterevidenceQuery'])
        self.assertFalse(result['perQuery'][1]['counterevidenceQuery'])

    def test_case_macro_does_not_overweight_many_queries_from_one_case(self):
        docs = documents()
        queries = [query('a1', 'a'), query('a2', 'a'), query('b1', 'b', {'d11': 2})]
        ranks = {q['id']: [row['id'] for row in docs] for q in queries}
        result = evaluate_rankings(queries, docs, ranks)
        self.assertAlmostEqual(result['macro']['ndcgAt5'], 2 / 3)
        self.assertEqual(result['caseMacro']['ndcgAt5'], .5)

    def test_incomplete_duplicate_unknown_rankings_and_query_sets_rejected(self):
        docs = documents()
        ids = [row['id'] for row in docs]
        for ranks in ({'q': ids[:-1]}, {'q': ids[:-1] + [ids[0]]},
                      {'q': ids[:-1] + ['unknown']}, {'other': ids}):
            with self.subTest(ranks=ranks), self.assertRaises(ValueError):
                evaluate_rankings([query()], docs, ranks)

    def test_invalid_labels_cannot_inflate_metrics(self):
        docs = documents()
        ranks = {'q': [row['id'] for row in docs]}
        mutations = [
            {'relevance': {'d0': float('nan')}}, {'relevance': {'d0': True}},
            {'relevance': {'d0': 3}}, {'positiveIds': []}, {'hardNegativeIds': ['d0']},
            {'requiredCounterevidenceIds': ['d1']}, {'caseId': ''},
        ]
        for mutation in mutations:
            changed = copy.deepcopy(query())
            changed.update(mutation)
            with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                evaluate_rankings([changed], docs, ranks)

    def test_missing_families_and_duplicate_ids_rejected(self):
        docs = documents()
        ids = [row['id'] for row in docs]
        changed = copy.deepcopy(docs)
        changed[0]['family'] = ''
        with self.assertRaises(ValueError):
            evaluate_rankings([query()], changed, {'q': ids})
        with self.assertRaises(ValueError):
            evaluate_rankings([query(), query()], docs, {'q': ids})
        with self.assertRaises(ValueError):
            evaluate_rankings([query()], docs + docs[:1], {'q': ids})


if __name__ == '__main__':
    unittest.main()
