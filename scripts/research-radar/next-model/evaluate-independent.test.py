"""Synthetic arithmetic/contract fixtures; these are not empirical model outcomes."""
import importlib.util
import math
from pathlib import Path
import unittest

spec=importlib.util.spec_from_file_location('evaluation',Path(__file__).with_name('evaluate-independent.py'))
e=importlib.util.module_from_spec(spec);spec.loader.exec_module(e)

class EvaluationContracts(unittest.TestCase):
    def test_full_rankings_are_required(self):
        with self.assertRaises(ValueError):e.checked_rankings([{'queryId':'q','ranking':[{'sourceId':'a','score':1}]}],{'a','b'},{'q'})
    def test_ties_have_deterministic_source_order(self):
        with self.assertRaises(ValueError):e.checked_rankings([{'queryId':'q','ranking':[{'sourceId':'b','score':1},{'sourceId':'a','score':1}]}],{'a','b'},{'q'})
        self.assertEqual(e.checked_rankings([{'queryId':'q','ranking':[{'sourceId':'a','score':1},{'sourceId':'b','score':1}]}],{'a','b'},{'q'}),{'q':['a','b']})
    def test_nonfinite_score_is_not_a_prediction(self):
        with self.assertRaises(ValueError):e.checked_rankings([{'queryId':'q','ranking':[{'sourceId':'a','score':float('nan')}]}],{'a'},{'q'})
    def test_query_duplicate_cannot_replace_missing_query(self):
        with self.assertRaises(ValueError):e.checked_rankings([{'queryId':'q','ranking':[{'sourceId':'a','score':1}]},{'queryId':'q','ranking':[{'sourceId':'a','score':1}]}],{'a'},{'q','r'})
    def test_url_lineage_keeps_meaningful_query(self):
        self.assertEqual(e.canonical_url('http://www.example.org/doc?id=3#p2'),'https://example.org/doc?id=3')
        self.assertNotEqual(e.canonical_url('http://example.org/doc?id=3'),e.canonical_url('http://example.org/doc?id=4'))
    def test_lineage_does_not_collapse_distinct_documents_in_one_case(self):
        docs=e.document_projection({'documents':[{'id':'a','url':'https://e.org/original','family':'same-case'}, {'id':'b','url':'https://e.org/correction','family':'same-case'}]})
        self.assertNotEqual(docs[0]['family'],docs[1]['family'])
    def test_family_collapse_not_repeated_confirmations(self):
        query={'id':'q','caseId':'case','positiveIds':['a','b'],'relevance':{'a':2,'b':1},'hardNegativeIds':[],'requiredCounterevidenceIds':['a']}
        docs=[{'id':'a','family':'one'},{'id':'b','family':'one'},{'id':'c','family':'two'}]
        m=e._METRICS.evaluate_rankings([query],docs,{'q':['b','c','a']})
        self.assertEqual(m['perQuery'][0]['positiveFamilyCount'],1)
        self.assertEqual(m['caseMacro']['familyRecallAt5'],1)
        self.assertLess(m['caseMacro']['ndcgAt5'],1)
    def test_unknown_counterevidence_fails_promotion(self):
        def system(value):return {'metrics':{'caseMacro':{'ndcgAt5':value,'recallAt5':1,'counterevidenceRecallAt5':None},'perCase':[{'caseId':str(i),'metrics':{'ndcgAt5':value}} for i in range(6)]}}
        result=e.promotion({'candidate':system(.9),'base':system(.8),'bm25':system(.8)})
        self.assertFalse(result['promoted'])
    def test_money_stage_mutation_is_not_preserved(self):
        original={'id':'r','from':'a','to':'b','kind':'contract-award','tier':'documented','status':'awarded','sourceIds':['s'],'amounts':[{'value':10,'stage':'contract price'}],'limitations':['No payment ledger']}
        registry={'relationships':[original],'sources':[{'id':'s','url':'https://example.org/s'}]}
        labels={'queries':[{'id':'q','requiredRelationshipIds':['r'],'evidenceStop':'no payment'}]}
        copy=dict(original,kind='payment')
        result=e.path_audit(registry,labels,{'q':['s']},[{'relationships':[copy]}])
        self.assertFalse(result['allEmittedEdgesPreserved'])
        self.assertEqual(result['perQuery'][0]['requiredEdgeSourceCoverageAt5'],1)
        self.assertIn('not learned',result['kind'])
    def test_no_emitted_path_means_no_faithfulness_claim(self):
        result=e.path_audit({'relationships':[],'sources':[]},{'queries':[{'id':'q','requiredRelationshipIds':[],'evidenceStop':None}]},{'q':[]})
        self.assertIsNone(result['allEmittedEdgesPreserved'])
        self.assertFalse(result['emittedGraphEvaluated'])

if __name__=='__main__':unittest.main()
