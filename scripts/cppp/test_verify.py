"""Tests for scripts/cppp/verify_sample.py — the CPPP live verification sample.

Run: python3 -m unittest scripts/cppp/test_verify.py   (from the repo root; not in CI)

Two kinds of fixture live in fixtures/:
  * aoc-central-invalid-url.html, aoc-state-invalid-url.html — REAL pages fetched on
    2026-09-26 from the dataset's own detail_url values. The portal answered HTTP 200
    with "Invalid Url.Please Check": the stored links are signed tokens whose third
    segment is the June-2026 scrape timestamp, and the portal no longer honours them.
  * aoc-synthetic-match.html, aoc-synthetic-mismatch.html — SYNTHETIC Award of Contract
    pages carrying the CPPP's own field labels ("Number of bids received", "Name of the
    selected bidder(s)", "Contract Value", "Date of Award of Contract") and invented,
    marker-bearing bidder names. No live AOC page with field content was reachable
    without either a captcha or forging a token, so the parser is pinned on these.

The refusal under test (spec §1 non-goals): no unmarked winner name and no
selected_bidder_address may leave the pipeline — including via this sample.
"""
import json
import os
import re
import sys
import unittest
from datetime import datetime

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import verify_sample as vs  # noqa: E402

FIX = os.path.join(HERE, 'fixtures')
OUT = os.path.join(HERE, '..', '..', 'research', 'raw', 'cppp', 'sample-verification.json')


def read(name):
    with open(os.path.join(FIX, name), encoding='utf-8') as fh:
        return fh.read()


class MarkerTests(unittest.TestCase):
    def test_marked_names_pass(self):
        for n in ['M/s Alpha Infra Pvt Ltd', 'BETA CONSTRUCTION COMPANY', 'Gamma & Sons',
                  'Delta Traders', 'Zeta Udyog', 'Krishi Sahkari Samiti']:
            self.assertTrue(vs.is_marked(n), n)

    def test_bare_personal_names_are_unmarked(self):
        for n in ['ramesh kumar', 'SURINDER KUMAR', 'Amar Chand Negi', 'individual', '', None, ',', ' ; ']:
            self.assertFalse(vs.is_marked(n), repr(n))

    def test_joined_lists_are_marked_only_when_every_component_is(self):
        for n in ['Acme Pvt Ltd,ramesh kumar', 'ramesh kumar,Acme Pvt Ltd', 'Acme Pvt Ltd;ramesh kumar',
                  'Bloom Electronics Private Limited,SANJIT  DEY,MOIRANGTHEM ABHIJIT SINGH',
                  'SAI VAISHNAVI ENTERPRISES, PROP. RAJ KUMAR PATRA',
                  'BEEGEE DESIGN SYSTEMS,SUN LIGHT HOUSE,The Deccan Engineering and Refrigeration Company,gsrinivasarao']:
            self.assertFalse(vs.is_marked(n), n)
        for n in ['Acme Pvt Ltd,Beta Constructions', 'Acme Pvt Ltd, ', 'Gamma Traders; Kappa Suppliers']:
            self.assertTrue(vs.is_marked(n), n)
        self.assertEqual(vs.name_components(' a , ,b;c '), ['a', 'b', 'c'])
        self.assertIn(vs.MARKED_SQL, vs.SQL_CAND)

    def test_candidate_dedup_matches_build_py(self):
        self.assertIn('PARTITION BY tender_id, lower(trim(selected_bidder)), aoc_at', vs.SQL_CAND)
        self.assertIn('ORDER BY internal_id) = 1', vs.SQL_CAND)
        self.assertIn('(tender_id, selected_bidder_norm, aoc_at)', vs.DEDUP_RULE)
        build_path = os.path.join(HERE, 'build.py')
        with open(build_path, encoding='utf-8') as fh:
            self.assertIn('PARTITION BY tender_id, bidder_norm, aoc_at ORDER BY internal_id', fh.read())


class ClassifyTests(unittest.TestCase):
    def test_real_central_page_is_invalid_url(self):
        self.assertEqual(vs.classify_page(read('aoc-central-invalid-url.html'), 200), 'invalid_url')

    def test_real_state_page_is_invalid_url(self):
        self.assertEqual(vs.classify_page(read('aoc-state-invalid-url.html'), 200), 'invalid_url')

    def test_synthetic_page_is_aoc(self):
        self.assertEqual(vs.classify_page(read('aoc-synthetic-match.html'), 200), 'aoc')

    def test_http_404_is_not_found(self):
        self.assertEqual(vs.classify_page('<html></html>', 404), 'not_found')

    def test_captcha_page(self):
        html = '<form><img alt="Image CAPTCHA"><label>What code is in the image?</label></form>'
        self.assertEqual(vs.classify_page(html, 200), 'captcha')


class ParseAocTests(unittest.TestCase):
    def test_parses_all_four_fields_from_synthetic_match(self):
        p = vs.parse_aoc(read('aoc-synthetic-match.html'))
        self.assertEqual(p['bids_received'], 5)
        self.assertEqual(p['selected_bidder'], 'M/s Alpha Infra Pvt Ltd')
        self.assertAlmostEqual(p['contract_value'], 12345678.0)
        self.assertEqual(p['aoc_date'], '2021-03-15')

    def test_missing_bids_field_is_none(self):
        p = vs.parse_aoc(read('aoc-synthetic-mismatch.html'))
        self.assertIsNone(p['bids_received'])
        self.assertEqual(p['selected_bidder'], 'Beta Construction Company')
        self.assertAlmostEqual(p['contract_value'], 250000.0)
        self.assertEqual(p['aoc_date'], '2019-11-02')

    def test_invalid_url_page_parses_to_nothing(self):
        p = vs.parse_aoc(read('aoc-central-invalid-url.html'))
        self.assertEqual(p, {'bids_received': None, 'selected_bidder': None,
                             'contract_value': None, 'aoc_date': None})

    def test_parser_never_returns_an_address(self):
        p = vs.parse_aoc(read('aoc-synthetic-match.html'))
        self.assertNotIn('selected_bidder_address', p)
        self.assertNotIn('address', ' '.join(p.keys()).lower())


class CompareTests(unittest.TestCase):
    row = {'bids_received': 5, 'selected_bidder': 'M/S ALPHA INFRA PVT LTD',
           'contract_value_amount': 12345678.0, 'aoc_at': datetime(2021, 3, 15, 10, 0)}

    def test_all_match(self):
        parsed = vs.parse_aoc(read('aoc-synthetic-match.html'))
        v = vs.compare(self.row, parsed)
        self.assertEqual(v, {'bids_received': 'match', 'selected_bidder': 'match',
                             'contract_value': 'match', 'aoc_date': 'match'})

    def test_mismatch_and_missing(self):
        parsed = vs.parse_aoc(read('aoc-synthetic-mismatch.html'))
        v = vs.compare(self.row, parsed)
        self.assertEqual(v['bids_received'], 'missing')
        self.assertEqual(v['selected_bidder'], 'mismatch')
        self.assertEqual(v['contract_value'], 'mismatch')
        self.assertEqual(v['aoc_date'], 'mismatch')

    def test_dataset_null_against_page_value_is_mismatch(self):
        row = dict(self.row, bids_received=None)
        v = vs.compare(row, vs.parse_aoc(read('aoc-synthetic-match.html')))
        self.assertEqual(v['bids_received'], 'mismatch')

    def test_page_gone_marks_every_field(self):
        v = vs.compare(self.row, None)
        self.assertEqual(set(v.values()), {'page_gone'})


class StrataTests(unittest.TestCase):
    def test_strata_are_20_20_across_2015_2026(self):
        strata = vs.strata_plan()
        self.assertEqual(sum(k for (_, _), k in strata.items()), 40)
        for portal in ('central', 'state'):
            self.assertEqual(sum(k for (p, _), k in strata.items() if p == portal), 20)
            years = sorted(y for (p, y) in strata if p == portal)
            self.assertEqual(years, list(range(2015, 2027)))


class EmissionGuardTests(unittest.TestCase):
    def test_guard_rejects_unmarked_name(self):
        doc = {'rows': [{'selected_bidder': 'ramesh kumar'}]}
        with self.assertRaises(vs.RefusalError):
            vs.assert_emittable(doc)

    def test_guard_rejects_joined_list_with_a_bare_name(self):
        for bad in ('Acme Pvt Ltd,ramesh kumar', 'ramesh kumar,Acme Pvt Ltd', 'Acme Pvt Ltd;ramesh kumar'):
            with self.assertRaises(vs.RefusalError, msg=bad):
                vs.assert_emittable({'rows': [{'selected_bidder': bad}]})
        vs.assert_emittable({'rows': [{'selected_bidder': 'Acme Pvt Ltd,Beta Constructions'}]})

    def test_guard_rejects_address_key_anywhere(self):
        doc = {'rows': [{'selected_bidder': 'M/s Alpha Infra Pvt Ltd', 'selected_bidder_address': 'x'}]}
        with self.assertRaises(vs.RefusalError):
            vs.assert_emittable(doc)

    def test_guard_accepts_marked_rows(self):
        vs.assert_emittable({'rows': [{'selected_bidder': 'M/s Alpha Infra Pvt Ltd'}]})

    def test_guard_accepts_verdict_words_and_counts_but_not_names_there(self):
        vs.assert_emittable({'rows': [{'verdicts': {'selected_bidder': 'page_gone'},
                                       'parsed': {'selected_bidder': None}}],
                             'agreement': {'selected_bidder': {'match': 0, 'page_gone': 40}}})
        with self.assertRaises(vs.RefusalError):
            vs.assert_emittable({'rows': [{'verdicts': {'selected_bidder': 'ramesh kumar'}}]})


class FixtureHygieneTests(unittest.TestCase):
    def test_fixtures_carry_no_address_and_only_marked_names(self):
        # fixtures/ is shared with build.py (fixture.arrow, make_fixture.py); only aoc-*.html is ours
        names = [n for n in sorted(os.listdir(FIX)) if n.startswith('aoc-') and n.endswith('.html')]
        self.assertGreaterEqual(len(names), 4)
        for name in names:
            html = read(name)
            self.assertNotRegex(html, re.compile(r'selected\s*bidder\s*address', re.I), name)
            for m in re.finditer(r'selected bidder\(s\)\s*</t[dh]>\s*<td[^>]*>([^<]+)<', html, re.I):
                self.assertTrue(vs.is_marked(m.group(1)), (name, m.group(1)))


@unittest.skipUnless(os.path.exists(OUT), 'sample-verification.json not yet written')
class OutputInvariantTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with open(OUT, encoding='utf-8') as fh:
            cls.text = fh.read()
        cls.doc = json.loads(cls.text)

    def test_shape(self):
        d = self.doc
        self.assertEqual(d['seed'], 2026)
        self.assertEqual(d['markerRegex'], vs.MARKER.pattern)
        self.assertEqual(len(d['rows']), 40)
        self.assertEqual(sum(1 for r in d['rows'] if r['portal'] == 'central'), 20)
        self.assertEqual(sum(1 for r in d['rows'] if r['portal'] == 'state'), 20)
        self.assertTrue(all(2015 <= r['year'] <= 2026 for r in d['rows']))
        self.assertEqual(len({r['tender_id'] for r in d['rows']}), 40)

    def test_every_row_is_marked_and_no_address(self):
        for r in self.doc['rows']:
            self.assertTrue(vs.is_marked(r['selected_bidder']), r['tender_id'])
            for part in vs.name_components(r['selected_bidder']):   # component by component
                self.assertRegex(part, vs.MARKER, (r['tender_id'], part))
        self.assertNotIn('selected_bidder_address', self.text)
        self.assertEqual(self.doc['markedRule'], vs.MARKED_RULE)
        self.assertIn('redraw', self.doc)
        vs.assert_emittable(self.doc)

    def test_agreement_counts_sum_to_40_per_field(self):
        for field, counts in self.doc['agreement'].items():
            self.assertEqual(sum(counts.values()), 40, field)
            self.assertEqual(set(counts), {'match', 'mismatch', 'missing', 'page_gone'}, field)
        for r in self.doc['rows']:
            self.assertEqual(set(r['verdicts']), set(self.doc['agreement']))

    def test_provenance_block(self):
        p = self.doc['provenance']
        self.assertEqual(p['asOf'], '2026-09-26')
        self.assertEqual(len(p['inputs']), 2)
        for i in p['inputs']:
            self.assertEqual(len(i['sha256_16']), 16)
            self.assertGreater(i['bytes'], 0)
        self.assertEqual(p['rows'], 4921960)
        self.assertGreater(p['distinctTenderIds'], 0)
        self.assertIn('dedupRule', p)
        self.assertTrue(all(s.lstrip().upper().startswith(('SELECT', 'WITH', 'CREATE')) for s in p['sql'].values()))
        self.assertTrue(p['generatedBy'].startswith('scripts/cppp/verify_sample.py@'))
        self.assertIn('cand', p['sql'])


if __name__ == '__main__':
    unittest.main()
