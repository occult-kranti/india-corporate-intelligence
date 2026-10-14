#!/usr/bin/env python3
import importlib.util
from pathlib import Path
import unittest
s=importlib.util.spec_from_file_location('trace',Path(__file__).with_name('trace.py'));m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
def graph():
    sources={'s':{'id':'s','title':'Award original','corpusOrigin':'fixture'}}
    entities={i:{'id':i,'label':i,'corpusOrigin':'fixture','sourceIds':['s']} for i in 'abcd'}
    def e(i,a,b,stage):return {'id':i,'from':a,'to':b,'edgeStage':stage,'status':'documented','sourceIds':['s'],'originalAssertion':{'id':i,'from':a,'to':b,'amount':5,'stage':stage}}
    edges={x['id']:x for x in [e('award','a','b','award'),e('owner','b','c','ownership'),e('alias','c','d','identity-crosswalk')]}
    return {'sources':sources,'entities':entities,'edges':edges,'records':{},'questions':[{'id':'next','edgeIds':['award'],'record':'Payment advice','holder':'Buyer'}]}
class TraceTests(unittest.TestCase):
    def setUp(self):self.g=graph()
    def test_unreachable_target_search_is_bounded(self):
        r=m.navigate(self.g,'a','d',depth=5,max_expansions=1);self.assertTrue(r['truncated']);self.assertEqual(r['truncationReason'],'edge-expansion-budget');self.assertEqual(r['paths'],[])
    def test_invalid_limits_rejected(self):
        with self.assertRaises(ValueError):m.navigate(self.g,'a',max_paths=-1)
        with self.assertRaises(ValueError):m.search(self.g,'query',limit=-1)
    def test_two_hops_preserve_types(self):
        r=m.navigate(self.g,'a','c',2);self.assertEqual([h['stage'] for h in r['paths'][0]['hops']],['award','ownership']);self.assertFalse(r['inferredCashFlow']);self.assertIsNone(r['aggregateAmount']);self.assertEqual(r['inferredEdges'],[])
    def test_reverse_not_payment_reversal(self):r=m.navigate(self.g,'c','a',2);self.assertEqual(r['paths'][0]['hops'][0]['navigationDirection'],'reverse');self.assertEqual(r['paths'][0]['hops'][0]['from'],'b')
    def test_exact_ids_only(self):
        with self.assertRaises(ValueError):m.navigate(self.g,'A')
    def test_missing_target(self):
        with self.assertRaises(ValueError):m.navigate(self.g,'a','missing')
    def test_depth_bound(self):
        with self.assertRaises(ValueError):m.navigate(self.g,'a',depth=6)
    def test_no_synthetic_connection(self):r=m.navigate(self.g,'a','d',3);self.assertEqual(r['paths'],[])
    def test_context_opt_in_is_labelled(self):r=m.navigate(self.g,'a','d',3,include_context=True);self.assertTrue(r['paths'][0]['hops'][2]['contextOnly'])
    def test_truncation_disclosed(self):r=m.navigate(self.g,'a',depth=3,max_paths=1);self.assertTrue(r['truncated']);self.assertEqual(len(r['paths']),1)
    def test_entity_and_acquisition_source_closure(self):
        self.g['sources']['extra']={'id':'extra','title':'Counterevidence'};self.g['entities']['b']['sourceIds']=['s','extra'];self.g['questions'][0]['sourceIds']=['extra'];r=m.navigate(self.g,'a','c',2);self.assertEqual({x['id'] for x in r['sources']},{'s','extra'})
    def test_source_closure(self):r=m.navigate(self.g,'a','c',2);self.assertEqual([s['id'] for s in r['sources']],['s'])
    def test_acquisition_is_authored(self):r=m.navigate(self.g,'a','c',2);self.assertEqual(r['acquisitionQuestions'][0]['record'],'Payment advice')
    def test_no_loop(self):r=m.navigate(self.g,'b',depth=5,include_context=True);self.assertTrue(all(len(p['entityIds'])==len(set(p['entityIds'])) for p in r['paths']))
    def test_lexical_retrieval_is_deterministic(self):a=m.search(self.g,'award original');b=m.search(self.g,'original award');self.assertEqual(a,b);self.assertEqual(a[0]['id'],'s')
    def test_unknown_query_returns_no_candidates(self):self.assertEqual(m.search(self.g,'unfindable'),[])
    def test_no_fuzzy_alias_creation(self):self.g['entities']['b']['label']='a';self.assertEqual(len(m.navigate(self.g,'a','c',2)['paths']),1)
if __name__=='__main__':unittest.main()
