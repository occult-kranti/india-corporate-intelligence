#!/usr/bin/env python3
"""Behavioral and independent-bug regression tests for exact evidence navigation."""
from copy import deepcopy
import importlib.util
import json
from pathlib import Path
import unittest

MODULE = Path(__file__).with_name('trace.py')
spec = importlib.util.spec_from_file_location('evidence_trace', MODULE)
trace = importlib.util.module_from_spec(spec)
spec.loader.exec_module(trace)


def fixture():
    sources = [dict(id='s1', title='Original contract', url='https://example.org/1', namespace='case',
                    publishedAt='2024-01-01', retrievedAt='2025-01-01', limitations=['Commitment only']),
               dict(id='s2', title='Later response', url='https://example.org/2', namespace='case',
                    publishedAt='2025-02-01', retrievedAt='2025-03-01', limitations=['Later document'])]
    entities = [dict(id=x, label='Same name' if x in ['A', 'D'] else x, namespace='case',
                     sourceIds=['s1'], resolved=True, geography=[], limitations=[]) for x in 'ABCDE']
    def edge(ident, start, end, kind, **kwargs):
        return dict(id=ident, namespace='case', **{'from': start}, to=end, kind=kind, label=kind,
                    tier='documented', status='contract-commitment' if kind == 'contract' else 'context',
                    sourceIds=['s1'], responseIds=[], recordIds=[], amounts=[],
                    fromDate='2020-01-01', toDate=None, dateBasis='Event date, not availability',
                    summary=kind, alternativeExplanations=[], falsifier=None, limitations=['No cash inferred'],
                    geography=[]) | kwargs
    edges = [edge('ab', 'A', 'B', 'contract', responseIds=['response'], recordIds=['case-record'],
                  amounts=[{'value':100,'currency':'INR','unit':'crore','stage':'commitment','period':'FY2024'}]),
             edge('bc', 'B', 'C', 'ownership', amounts=[{'value':75,'currency':'percent','unit':'percent','stage':'ownership','period':'2024'}]),
             edge('cd', 'C', 'D', 'response'), edge('de', 'D', 'E', 'payment')]
    records = [dict(id='case-record', namespace='case', entityIds=['A','B'], relationshipIds=['ab'],
                    sourceIds=['s1'], response='No bank transaction evidence', alternativeExplanations=['Lawful performance'],
                    falsifier='Inspect invoices and bank receipt.', summary='One commitment', limitations=[], geography=[]),
               dict(id='response', namespace='case', entityIds=['A'], relationshipIds=[], sourceIds=['s2'],
                    response='The later response contests the premise.', alternativeExplanations=['Accounting scope differs'],
                    falsifier=None, summary='Original response', limitations=['Later context'], geography=[])]
    return {'schemaVersion':1,'registryFingerprint':'fixture','sources':sources,'entities':entities,
            'relationships':edges,'records':records,'followups':[]}


class TraceTests(unittest.TestCase):
    def test_exact_direction_kind_status_amounts_preserved(self):
        graph = fixture()
        result = trace.expand_trace(graph, from_entity='A', to_entity='C', max_hops=2, direction='outgoing')
        self.assertEqual(result['paths'][0]['relationshipIds'], ['ab','bc'])
        self.assertEqual(result['relationships'], graph['relationships'][:2])
        self.assertFalse(result['inferredCashFlow'])
        self.assertIsNone(result['aggregateAmount'])
        self.assertEqual(result['moneyAmounts'][0]['stage'], 'commitment')
        self.assertEqual(result['moneyAmounts'][1]['currency'], 'percent')

    def test_response_cannot_be_navigation_bridge(self):
        result = trace.expand_trace(fixture(), from_entity='A', to_entity='D', max_hops=3, direction='outgoing')
        self.assertEqual(result['paths'], [])
        self.assertIn('cd', [x['id'] for x in result['relationships']])
        self.assertNotIn('de', [x['id'] for x in result['relationships']])
        self.assertTrue(next(x for x in result['traversal'] if x['relationshipId']=='cd')['contextOnly'])

    def test_same_name_never_merges_entities(self):
        result = trace.expand_trace(fixture(), from_entity='A', to_entity='D', max_hops=1)
        self.assertEqual(result['paths'], [])
        self.assertNotIn('D', [x['id'] for x in result['entities']])

    def test_reverse_navigation_does_not_reverse_original_arrow(self):
        result = trace.expand_trace(fixture(), from_entity='B', to_entity='A', direction='incoming', max_hops=1)
        self.assertEqual(result['paths'][0]['traversedDirections'], ['reverse'])
        self.assertEqual(result['relationships'][0]['from'], 'A')
        self.assertEqual(result['relationships'][0]['to'], 'B')

    def test_response_is_source_closed_and_not_filtered_away(self):
        result = trace.expand_trace(fixture(), from_entity='A', max_hops=1, as_of='2025-01-15')
        self.assertIn('response', [x['id'] for x in result['records']])
        self.assertEqual({x['id'] for x in result['sources']}, {'s1','s2'})
        response = next(x for x in result['counterevidence'] if x['recordId']=='response')
        self.assertFalse(response['availableAtCutoff'])
        self.assertFalse(result['temporalLimits']['recordAvailability']['response']['allCitedSourcesEligible'])
        self.assertFalse(result['temporalLimits']['historicalForecastEligible'])

    def test_event_date_cannot_backdate_acquisition(self):
        result = trace.expand_trace(fixture(), from_entity='A', max_hops=2, as_of='2024-02-01')
        self.assertEqual(result['relationships'], [])
        self.assertEqual(result['temporalLimits']['sourceAvailability']['s1']['basis'], 'retrieved-after-cutoff')

    def test_all_edge_sources_must_pass_cutoff(self):
        graph = fixture()
        graph['relationships'][0]['sourceIds'] = ['s1','s2']
        result = trace.expand_trace(graph, from_entity='A', max_hops=2, as_of='2025-01-15')
        self.assertEqual(result['relationships'], [])

    def test_unknown_availability_excluded_only_for_cutoff(self):
        graph = fixture(); graph['sources'][0]['retrievedAt'] = None
        self.assertEqual(trace.expand_trace(graph, from_entity='A', as_of='2026-01-01')['relationships'], [])
        self.assertTrue(trace.expand_trace(graph, from_entity='A')['relationships'])

    def test_invalid_dates_fail_closed_and_inconsistent_dates_are_flagged(self):
        for value in ['2010', '2020-99-01', '2020-01-01Garbage', '2020-01-01T99:00:00', 'invalid']:
            s = {'publishedAt':None, 'retrievedAt':value}
            result = trace.source_temporal_status(s, '2026-01-01')
            self.assertFalse(result['eligible'], value)
            self.assertEqual(result['basis'],'invalid-observed-availability')
        s = {'publishedAt':'2025-01-01', 'retrievedAt':'2024-01-01'}
        self.assertEqual(trace.source_temporal_status(s, '2026-01-01')['basis'], 'inconsistent-publication-after-retrieval')

    def test_noncanonical_cutoff_dates_rejected(self):
        for cutoff in ['', '20261008', '2026-W41-4', '2026-99-99', '2026-10-08T00:00:00Z']:
            with self.assertRaises(ValueError):
                trace.expand_trace(fixture(),from_entity='A',as_of=cutoff)

    def test_dangling_source_endpoint_or_response_rejected(self):
        for field,value in [('sourceIds',['unknown']),('to','unknown'),('responseIds',['unknown'])]:
            graph = fixture(); graph['relationships'][0][field] = value
            with self.assertRaises(ValueError): trace.expand_trace(graph, from_entity='A')

    def test_duplicate_ids_rejected(self):
        graph = fixture(); graph['sources'].append(deepcopy(graph['sources'][0]))
        with self.assertRaises(ValueError): trace.expand_trace(graph, from_entity='A')

    def test_missing_unknown_and_fuzzy_ids_rejected(self):
        for options in [{'source_ids':['same name']}, {'from_entity':'Same name'}, {}]:
            with self.assertRaises(ValueError): trace.expand_trace(fixture(), **options)

    def test_output_mutation_detected(self):
        graph = fixture(); result = trace.expand_trace(graph, from_entity='A', max_hops=1)
        result['relationships'][0]['amounts'][0]['stage'] = 'paid'
        with self.assertRaises(ValueError): trace.validate_packet(result,graph)

    def test_derived_money_and_path_claim_mutations_rejected(self):
        graph=fixture(); result=trace.expand_trace(graph,from_entity='A',to_entity='C',max_hops=2)
        changed=deepcopy(result); changed['moneyAmounts'][0]['value']=999
        with self.assertRaises(ValueError): trace.validate_packet(changed,graph)
        changed=deepcopy(result); changed['paths'][0]['inferredCashFlow']=True
        with self.assertRaises(ValueError): trace.validate_packet(changed,graph)

    def test_hop_bounds_and_explicit_truncation(self):
        for hops in [0,4,100]:
            with self.assertRaises(ValueError): trace.expand_trace(fixture(),from_entity='A',max_hops=hops)
        result=trace.expand_trace(fixture(),source_ids=['s1'],max_edges=1)
        self.assertEqual(len(result['relationships']),1)
        self.assertTrue(result['truncation']['edgeLimitReached'])

    def test_no_sum_no_probability_even_for_alleged_edges(self):
        graph=fixture(); graph['relationships'][0]['tier']='alleged'
        graph['relationships'][0]['status']='disputed allegation'
        result=trace.expand_trace(graph,from_entity='A',max_hops=1)
        self.assertEqual(result['relationships'][0]['tier'],'alleged')
        self.assertFalse(result['paths'])
        self.assertFalse(result['inferredCashFlow'])
        self.assertNotIn('probability',result)

    def test_retained_graph_illustrative_development_source_closure(self):
        graph=json.loads(trace.DEFAULT_GRAPH.read_text())
        result=trace.expand_trace(graph,source_ids=['money-trails-djb:source:tribunal'],max_hops=2)
        self.assertTrue(result['relationships'])
        self.assertTrue(result['missingRecordQuestions'])
        self.assertTrue(result['counterevidence'])
        self.assertEqual(result['sourceClosure']['missingSourceIds'],[])
        trace.validate_packet(result,graph)
        self.assertTrue(all(e['namespace'] not in {'legacy','crosswalk'} for e in result['relationships']))


if __name__=='__main__': unittest.main()
