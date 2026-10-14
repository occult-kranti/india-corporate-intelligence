"""Lightweight audit invariants: stdlib only, no database or network required."""
import copy
import hashlib
import json
import pathlib
import subprocess
import sys
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parent
REPO = ROOT.parents[2]
sys.path.insert(0, str(ROOT))
from cache_contract import contract, guard
from strict_parse import amount, bids


def read(name):
    return json.loads((ROOT / name).read_text())


class TenderSourceAuditTests(unittest.TestCase):
    def test_original_receipts_match_published_full_hashes_and_sizes(self):
        expected = {
            'aoc_tenders.db': ('ec8ef7711a17b7cae9e0414c2403b119a0a31c4dec49ed7055b38ec0df5f7586', 6594818048),
            'tenders_vps.db': ('b1994cfb6dd2d5da9ed1d9ac8d6bbc7083178f155e92a65628e87a38e4c64d01', 6672879616),
        }
        for name, (digest, size) in expected.items():
            receipt = read(f'evidence/{name}.download-receipt.json')
            self.assertEqual(receipt['status'], 'verified-published-sha256')
            self.assertEqual(receipt['sha256'], digest)
            self.assertEqual(receipt['expectedSHA256'], digest)
            self.assertEqual(receipt['uncompressedBytes'], size)
            self.assertEqual(receipt['expectedUncompressedBytes'], size)
            self.assertTrue(receipt['deflateEOF'])
            self.assertEqual(receipt['crc32'], receipt['entry']['crc32'])

    def test_all_executed_result_families_pin_the_same_original_inputs(self):
        hashes = read('analysis.json')['sourceHashes']
        for name in ['followup.json', 'closing-field-semantics.json', 'linkage-v2.json', 'derivation-manifest.json', 'field-semantics-leads.json', 'candidate-pool.json']:
            self.assertEqual(read(name)['sourceHashes'], hashes, name)
        for name in ['analysis.json', 'followup.json', 'closing-field-semantics.json', 'linkage-v2.json']:
            for key, result in read(name)['queries'].items():
                self.assertTrue(result['sql'].strip(), (name, key))
                self.assertIn('rows', result)

    def test_grain_count_does_not_count_details_as_extra_tenders(self):
        rows = {r['table_name']: r['n'] for r in read('analysis.json')['queries']['source_counts']['rows']}
        self.assertEqual(rows, {'award_listings': 4921960, 'award_details': 4540739, 'notice_listings': 3952191, 'notice_details': 3178485})
        self.assertEqual(sum(rows.values()), 16593375)
        self.assertGreater(sum(rows.values()), rows['award_listings'] + rows['notice_listings'])

    def test_join_population_and_semantic_scope_are_not_silently_broadened(self):
        a = read('analysis.json')['queries']
        self.assertEqual(a['join_id_only']['rows'][0]['candidate_pair_rows'], 2730656872)
        s = read('closing-field-semantics.json')['queries']
        row = s['field_equality']['rows'][0]
        self.assertEqual((row['pairs'], row['award_closing_equals_notice_publication'], row['identical_closing_timestamp'], row['identical_closing_day']), (1714, 1709, 0, 0))
        self.assertEqual(sum(r['pairs'] for r in s['by_buyer']['rows']), 1714)
        self.assertTrue(all(r['portal'] == 'central' for r in s['by_buyer']['rows']))
        self.assertEqual(sum(r['equals_publication'] for r in s['by_buyer']['rows']), 1709)
        self.assertTrue(row['earliest_notice'].startswith('2013-'))
        self.assertTrue(row['latest_notice'].startswith('2018-'))
        v = read('linkage-v2.json')['queries']
        self.assertEqual(v['fallback_join_cardinality']['rows'][0]['one_to_one_keys'], 17704)
        self.assertEqual(v['closing_field_semantics']['rows'][0]['award_closing_equals_notice_publication'], 15816)
        self.assertEqual(v['candidate_eligibility_by_closing_semantics']['rows'][0]['closing_timestamp_confirmed'], 0)
        self.assertEqual(read('candidate-pool.json')['rows'], [])

    def test_followup_input_hash_is_recoverable_without_changing_executed_results(self):
        # The only later append to analysis.json was derivationFingerprint metadata.
        original = read('analysis.json')
        self.assertEqual(original.pop('derivationFingerprint'), read('derivation-manifest.json')['fingerprint'])
        self.assertEqual(hashlib.sha256(json.dumps(original, indent=2).encode()).hexdigest(), read('followup.json')['inputAnalysisSHA256'])

    def test_cached_build_recipe_matches_executed_sql_and_rejects_changed_inputs(self):
        a = read('analysis.json')
        recipe = contract(ROOT / 'analyze.py', a['sourceHashes'])
        self.assertEqual(recipe['fingerprint'], read('derivation-manifest.json')['fingerprint'])
        self.assertEqual(len(recipe['buildSQL']), 4)
        self.assertEqual(len(recipe['macroSQL']), 1)
        for key, sql in recipe['buildSQL'].items():
            self.assertEqual(sql, a['queries'][key]['sql'])
        with tempfile.TemporaryDirectory() as directory:
            path = pathlib.Path(directory)
            (path / 'derivation-manifest.json').write_text(json.dumps(recipe))
            changed = dict(a['sourceHashes']); changed['aoc_tenders.db'] = '0' * 64
            with self.assertRaisesRegex(RuntimeError, 'fingerprint differs'):
                guard(ROOT / 'analyze.py', changed, path, a)
            script = path / 'changed.py'
            script.write_text((ROOT / 'analyze.py').read_text().replace("[^0-9.-]", "[^0-9.]"))
            self.assertNotEqual(contract(script, a['sourceHashes'])['fingerprint'], recipe['fingerprint'])
            with self.assertRaisesRegex(RuntimeError, 'fingerprint differs'):
                guard(script, a['sourceHashes'], path, a)

    def test_strict_amounts_preserve_raw_strings_grouping_and_currency_prefix(self):
        for raw, expected in [('₹ 83200', '83200'), ('INR 1,23,456.50', '123456.50'), ('Rs. 1,234,567.89', '1234567.89'), ('0', '0')]:
            result = amount(raw)
            self.assertEqual(result['status'], 'parsed-numeric-lexeme')
            self.assertEqual(result['value'], expected)
            self.assertEqual(result['raw'], raw)
        for raw in ['20%', 'amount 200', '1,234,56', '-100', 'NaN', 'Infinity']:
            self.assertEqual(amount(raw)['status'], 'unrecognised-format', raw)
        for raw in [None, '', '   ']:
            self.assertEqual(amount(raw)['status'], 'missing')

    def test_scientific_notation_is_quarantined_not_stripped_into_another_value(self):
        numeric = json.loads((REPO / 'docs/tender-investigation/amount-lexemes.json').read_text())
        rows = numeric['queries']['central_nonplain_amounts']['rows']
        self.assertEqual(sum(r['n'] for r in rows if r['field'] == 'emd'), 14)
        self.assertEqual(sum(r['n'] for r in rows if r['field'] == 'fee'), 1)
        for row in rows:
            parsed = amount(row['raw'])
            self.assertEqual(parsed['status'], 'scientific-notation-quarantined')
            self.assertIsNone(parsed['value'])
            self.assertEqual(parsed['raw'], row['raw'])
        self.assertNotEqual(amount('1e17')['value'], '117')

    def test_bid_counts_do_not_round_decimals_or_strip_labels(self):
        self.assertEqual(bids('1')['value'], 1)
        self.assertEqual(bids('1000')['status'], 'eligible-count')
        for raw in ['0', '1001']:
            self.assertEqual(bids(raw)['status'], 'outside-analysis-range')
        for raw in ['1.5', '1 bid', '1e2', '-1']:
            self.assertEqual(bids(raw)['status'], 'unrecognised-format')
        self.assertEqual(bids(None)['status'], 'missing')

    def test_compact_findings_are_current_with_closed_query_and_source_references(self):
        subprocess.run([sys.executable, str(ROOT / 'build_cards.py'), '--check'], check=True, capture_output=True, text=True)
        compact = json.loads((REPO / 'src/data/procurement-audit.json').read_text())
        self.assertEqual(compact['status']['state'], 'complete')
        self.assertEqual(len(compact['findings']), 9)
        self.assertEqual(len(compact['slice']['records']), 9)
        self.assertEqual(compact['slice']['entities'], [])
        self.assertEqual(compact['slice']['relationships'], [])
        sources = {r['id'] for r in compact['slice']['sources']}
        query_sets = {k: set(read(v)['queries']) for k, v in {'analysis': 'analysis.json', 'followup': 'followup.json', 'semantics': 'closing-field-semantics.json', 'linkage': 'linkage-v2.json'}.items()}
        query_sets['numeric'] = set(json.loads((REPO / 'docs/tender-investigation/amount-lexemes.json').read_text())['queries'])
        for finding in compact['findings']:
            for locator in finding['queryIds']:
                family, key = locator.split('.', 1)
                self.assertIn(key, query_sets[family])
        for record in compact['slice']['records']:
            self.assertTrue(set(record['sourceIds']) <= sources)
            self.assertEqual(record['tier'], 'analytic')
            self.assertEqual(record['amounts'], [])
            self.assertTrue(record['alternativeExplanations'])
            self.assertTrue(record['falsifier'])
        for name, digest in compact['inputHashes'].items():
            self.assertEqual(hashlib.sha256((ROOT / name).read_bytes()).hexdigest(), digest, name)

    def test_notebook_exposes_executed_sql_without_fabricated_cell_execution(self):
        notebook = read('audit.ipynb')
        self.assertEqual(notebook['nbformat'], 4)
        text = '\n'.join(''.join(c['source']) for c in notebook['cells'])
        for digest in read('analysis.json')['sourceHashes'].values():
            self.assertIn(digest, text)
        for file, key in [('closing-field-semantics.json', 'field_equality'), ('analysis.json', 'join_id_only'), ('followup.json', 'window_status_cohorts')]:
            self.assertIn(read(file)['queries'][key]['sql'], text)
        for cell in notebook['cells']:
            if cell['cell_type'] == 'code':
                self.assertIsNone(cell['execution_count'])
                self.assertEqual(cell['outputs'], [])
        self.assertIn('read_only=True', text)

    def test_retained_audit_artifacts_match_digest_manifest(self):
        manifest = read('sha256-manifest.json')
        self.assertGreaterEqual(len(manifest), 40)
        for row in manifest:
            path = REPO / row['path']
            self.assertTrue(path.is_file(), row['path'])
            contents = path.read_bytes()
            self.assertEqual(len(contents), row['bytes'], row['path'])
            self.assertEqual(hashlib.sha256(contents).hexdigest(), row['sha256'], row['path'])


if __name__ == '__main__':
    unittest.main()
