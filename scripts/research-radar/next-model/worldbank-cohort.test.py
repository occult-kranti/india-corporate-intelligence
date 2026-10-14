#!/usr/bin/env python3
"""Semantic checks for prospective outcome resolution; synthetic fixtures are not model tests."""
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock

spec = importlib.util.spec_from_file_location('cohort', Path(__file__).with_name('worldbank-cohort.py'))
cohort_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cohort_module)


class ResolutionTests(unittest.TestCase):
    def setUp(self):
        self.receipt = {'capturedFrom': '2027-04-06T01:00:00+00:00',
                        'capturedThrough': '2027-04-06T01:01:00+00:00'}
        baseline_receipt = dict(self.receipt, capturedThrough='2026-10-08T17:00:00+00:00')
        self.record = {'id': 'PTEST', 'project_name': 'Synthetic test project', 'status': 'Active',
                       'closingdate': '2027-12-31', 'curr_total_commitment': '1000000'}
        self.cohort = cohort_module.build({'PTEST': self.record}, baseline_receipt)

    def outcomes(self, records):
        return cohort_module.resolve(self.cohort, records, self.receipt)['rows'][0]['outcomes']

    def test_no_record_cannot_become_negative(self):
        self.assertTrue(all(x is None for x in self.outcomes({}).values()))

    def test_observed_unchanged_is_explicit_negative(self):
        self.assertTrue(all(x is False for x in self.outcomes({'PTEST': self.record}).values()))

    def test_observed_three_transitions_are_separate_targets(self):
        next_record = dict(self.record, status='Closed', closingdate='2028-06-30', curr_total_commitment='1200000')
        self.assertTrue(all(x is True for x in self.outcomes({'PTEST': next_record}).values()))

    def test_status_does_not_fill_missing_money_or_date(self):
        output = self.outcomes({'PTEST': {'id': 'PTEST', 'status': 'Closed'}})
        self.assertTrue(output['status-closed-at-checkpoint'])
        self.assertIsNone(output['later-closing-date-at-checkpoint'])
        self.assertIsNone(output['larger-commitment-at-checkpoint'])

    def test_invalid_status_date_amount_remain_unknown(self):
        output = self.outcomes({'PTEST': dict(self.record, status='Unavailable', closingdate='n/a', curr_total_commitment='NaN')})
        self.assertTrue(all(x is None for x in output.values()))

    def test_collection_before_window_is_rejected(self):
        before = dict(self.receipt, capturedFrom='2027-04-05T23:59:59+00:00')
        with self.assertRaises(AssertionError):
            cohort_module.resolve(self.cohort, {}, before)

    def test_collection_finishing_after_window_is_rejected(self):
        late = dict(self.receipt, capturedThrough='2027-04-21T00:00:00+00:00')
        with self.assertRaises(AssertionError):
            cohort_module.resolve(self.cohort, {}, late)

    def test_reversed_capture_interval_is_rejected(self):
        reversed_receipt = dict(self.receipt, capturedFrom='2027-04-10T00:00:00+00:00')
        with self.assertRaises(AssertionError):
            cohort_module.resolve(self.cohort, {}, reversed_receipt)

    def test_population_excludes_pipeline_without_negative_label(self):
        receipt = dict(self.receipt, capturedThrough='2026-10-08T17:00:00+00:00')
        result = cohort_module.build({'PTEST': self.record, 'PNEW': dict(self.record, id='PNEW', status='Pipeline')}, receipt)
        self.assertEqual(result['population']['apiProjects'], 2)
        self.assertEqual(result['population']['eligibleProjects'], 1)
        self.assertEqual(result['rows'][0]['id'], 'PTEST')
        self.assertTrue(all(v is None for v in result['rows'][0]['probabilities'].values()))

    def test_old_approval_date_cannot_backdate_feature_availability(self):
        old_approval = dict(self.record, boardapprovaldate='2001-01-01T00:00:00Z')
        receipt = dict(self.receipt, capturedThrough='2026-10-08T17:00:00+00:00')
        row = cohort_module.build({'PTEST': old_approval}, receipt)['rows'][0]
        self.assertEqual(row['firstAvailableAt'], receipt['capturedThrough'])
        self.assertIsNone(row['publishedAt'])
        self.assertIsNone(row['eventAt'])
        self.assertTrue(all(v is None for v in row['outcomes'].values()))

    def test_earlier_completed_status_is_not_a_future_training_label(self):
        past_complete = dict(self.record, status='Closed', boardapprovaldate='2001-01-01T00:00:00Z')
        receipt = dict(self.receipt, capturedThrough='2026-10-08T17:00:00+00:00')
        result = cohort_module.build({'POLD': past_complete}, receipt)
        self.assertEqual(result['rows'], [])
        self.assertEqual(result['population']['targetCount'], 0)


class CaptureProvenanceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.patch = mock.patch.object(cohort_module, 'ROOT', self.root)
        self.patch.start()
        self.payload = {'os': '0', 'total': '1', 'projects': {'PTEST': {'id': 'PTEST', 'status': 'Active'}}}
        self.body = json.dumps(self.payload).encode()
        (self.root / 'projects-0.json').write_bytes(self.body)
        date = '2026-10-08T17:00:00+00:00'
        self.receipt = {'countryFilter': 'IN', 'total': 1, 'capturedFrom': date, 'capturedThrough': date,
                        'pages': [{'url': cohort_module.API.format(offset=0), 'path': 'projects-0.json',
                                   'httpStatus': 200, 'retrievedAt': date, 'bytes': len(self.body),
                                   'sha256': cohort_module.digest(self.body), 'total': 1, 'records': 1}]}

    def tearDown(self):
        self.patch.stop()
        self.temp.cleanup()

    def read(self):
        path = self.root / 'receipt.json'
        path.write_text(json.dumps(self.receipt))
        return cohort_module.read_capture(path)

    def test_valid_complete_capture(self):
        records, receipt = self.read()
        self.assertEqual(list(records), ['PTEST'])
        self.assertEqual(receipt['total'], 1)

    def test_wrong_country_is_rejected_even_with_intact_bytes(self):
        self.receipt['countryFilter'] = 'US'
        with self.assertRaises(AssertionError):
            self.read()

    def test_unrelated_api_is_rejected_even_with_intact_bytes(self):
        self.receipt['pages'][0]['url'] = 'https://example.com/api?country=IN'
        with self.assertRaises(AssertionError):
            self.read()

    def test_incomplete_population_is_rejected(self):
        self.receipt['total'] = 2
        with self.assertRaises(AssertionError):
            self.read()

    def test_out_of_interval_page_is_rejected(self):
        self.receipt['pages'][0]['retrievedAt'] = '2026-10-09T00:00:00+00:00'
        with self.assertRaises(AssertionError):
            self.read()

    def test_record_id_mismatch_is_rejected_after_rehash(self):
        self.payload['projects']['PTEST']['id'] = 'POTHER'
        body = json.dumps(self.payload).encode()
        (self.root / 'projects-0.json').write_bytes(body)
        self.receipt['pages'][0]['bytes'] = len(body)
        self.receipt['pages'][0]['sha256'] = cohort_module.digest(body)
        with self.assertRaises(AssertionError):
            self.read()


if __name__ == '__main__':
    unittest.main()
