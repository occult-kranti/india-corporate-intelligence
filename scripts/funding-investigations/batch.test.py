#!/usr/bin/env python3
import importlib.util
from pathlib import Path
import unittest
s=importlib.util.spec_from_file_location('funding_batch',Path(__file__).with_name('batch.py'));b=importlib.util.module_from_spec(s);s.loader.exec_module(b)
class BatchTests(unittest.TestCase):
    def setUp(self):
        self.reg={'sources':[{'id':'s1','title':'water original','url':'https://example.org/a#one','namespace':'water'},{'id':'s2','title':'unrelated procurement','url':'https://example.org/a#two','namespace':'energy'}],'entities':[{'id':'e1','label':'water buyer','sourceIds':['s1'],'namespace':'water'},{'id':'e2','label':'vendor','sourceIds':['s2'],'namespace':'energy'}],'relationships':[{'id':'edge','from':'e1','to':'e2','kind':'award','tier':'documented','sourceIds':['s1']}],'records':[]}
        self.q={'queries':[{'id':'q','question':'water','sector':'water'}],'limits':['Unjudged fixture']}
    def test_identity_matches_are_unapproved(self):
        self.reg['entities'][1]['label']='Water   buyer';g=b.t.build(self.reg,[],[]);c=b.identity_candidates(g);self.assertEqual(len(c),1);self.assertFalse(c[0]['approved']);self.assertFalse(c[0]['edgeCreated'])
    def test_identity_no_legal_suffix_fuzzy_merge(self):
        self.reg['entities'][1]['label']='Water buyer Limited';self.assertEqual(b.identity_candidates(b.t.build(self.reg,[],[])),[])
    def test_followup_dependency_changes_fingerprint(self):
        q={'id':'gap','neededRecord':'First','whyCurrentEvidenceStops':'Missing payment','sourceIds':['s1'],'relationshipIds':['edge']};a=b.t.build(self.reg,[],[q]);q['neededRecord']='Changed';c=b.t.build(self.reg,[],[q]);self.assertNotEqual(a['fingerprint'],c['fingerprint'])
    def test_inherited_reference_closure(self):
        self.reg['entities'][0]['sourceIds']=['absent']
        with self.assertRaises(ValueError):b.t.build(self.reg,[],[])
    def test_relative_and_external_receipt_paths(self):
        self.assertEqual(b.receipt_path(Path('research/funding-investigations/streams')), 'research/funding-investigations/streams');self.assertEqual(b.receipt_path(Path('/tmp/external')), '/tmp/external')
    def test_retains_zero_results(self):
        raw,ui=b.run(self.reg,[],self.q,[]);self.assertEqual(len(raw['runs'][0]['rankings']),4);self.assertEqual(raw['runs'][0]['rankings'][-1]['bm25'],0)
    def test_metadata_retained_once(self):
        raw,ui=b.run(self.reg,[],self.q,[]);self.assertEqual(set(raw['sourceMetadata']),{'s1','s2'});self.assertEqual(ui['queries'][0]['topSources'][0]['source']['id'],'s1')
    def test_duplicate_urls_not_independence(self):
        raw,ui=b.run(self.reg,[],self.q,[]);self.assertEqual(ui['sourceFamilies']['crossNamespaceExactURLGroups'],1);self.assertEqual(ui['sourceFamilies']['exactURLDuplicateGroups'],1)
    def test_no_inference_fields(self):
        raw,ui=b.run(self.reg,[],self.q,[]);self.assertEqual(ui['inferredEdges'],[]);self.assertFalse(ui['probabilitiesEstimated']);self.assertIsNone(ui['aggregateAmount'])
    def test_input_fingerprint_changes(self):
        a,_=b.run(self.reg,[],self.q,[]);self.reg['sources'][0]['title']='corrected';c,_=b.run(self.reg,[],self.q,[]);self.assertNotEqual(a['corpusFingerprint'],c['corpusFingerprint'])
    def test_query_fingerprint_changes(self):
        a,_=b.run(self.reg,[],self.q,[]);self.q['queries'][0]['question']='changed';c,_=b.run(self.reg,[],self.q,[]);self.assertNotEqual(a['queryFingerprint'],c['queryFingerprint'])
if __name__=='__main__':unittest.main()
