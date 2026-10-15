import unittest,sys,pathlib,json,hashlib
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]))
from assemble_round4 import assemble_round4,ROOT,BASELINE
class Round4(unittest.TestCase):
 @classmethod
 def setUpClass(cls):cls.old=json.loads(BASELINE.read_text());cls.d=assemble_round4()
 def test_replay_independent_of_canonical_output(self):
  from unittest.mock import patch
  original=pathlib.Path.read_bytes
  def protected_read(path):
   if path==ROOT/'output/dataset.json':raise AssertionError('Must not use mutable canonical output')
   return original(path)
  with patch.object(pathlib.Path,'read_bytes',protected_read):self.assertEqual(assemble_round4(),assemble_round4())
 def test_baseline_manifest(self):
  m=json.loads((ROOT/'releases/v0-manifest.json').read_text());self.assertEqual(hashlib.sha256(BASELINE.read_bytes()).hexdigest(),m['sha256'])
 def test_preserve_prior_release(self):
  for key in ['records','relations','sources','documentChanges']:
   now={r['id']:r for r in self.d[key]}
   for r in self.old[key]:self.assertEqual(r,now[r['id']])
 def test_no_duplicate_ids(self):
  for key in ['records','relations','sources','documentChanges','rejectedJoins']:
   ids=[r['id'] for r in self.d[key]];self.assertEqual(len(ids),len(set(ids)),key)
 def test_referential_integrity(self):
  ids={r['id'] for r in self.d['records']};sources={s['id'] for s in self.d['sources']}
  for r in self.d['records']+self.d['relations']+self.d['documentChanges']:self.assertTrue(set(r['sourceIds'])<=sources,r['id'])
  for e in self.d['relations']:self.assertTrue({e['source'],e['target']}<=ids,e['id'])
 def test_discovery_only_edges_quarantined(self):
  from assemble import load
  claims={c['id']:c for c in load('round4-cases/claims.json',[])};sources={s['id']:s for s in load('round4-cases/sources.json',[])}
  for e in load('round4-cases/typed-graph.json',{})['edges']:
   if all(sources[s]['access_depth']=='search_result_only' for s in claims[e['claim_id']]['source_ids']):
    self.assertNotIn('round4-cases:'+e['id'],{x['id'] for x in self.d['relations']})
 def test_acquired_original_hashes(self):
  ss={s['id']:s for s in self.d['sources']}
  for sid in ['M6','S4']:self.assertTrue(ss['round4-cases:'+sid]['originalBytesRetained']);self.assertEqual(len(ss['round4-cases:'+sid]['originalSha256']),64)
 def test_no_temporal_or_financial_promotion(self):
  for e in self.d['relations']:self.assertFalse(e['pathEligible']);self.assertFalse(e['amountAggregable'])
 def test_dockets_not_conflated(self):
  es={e['id']:e for e in self.d['relations']};nodes={r['id']:r for r in self.d['records']}
  self.assertEqual(es['round4-cases:E01']['target'],'round4-cases:MTFENECH');self.assertEqual(es['round4-cases:E03']['target'],'round4-cases:MT27_2022');self.assertEqual(nodes['round4-cases:MTCASE']['type'],'case_family')
 def test_status_not_collapsed(self):
  es={e['id']:e for e in self.d['relations']}
  self.assertEqual(es['round4-cases:E01']['type'],'acquitted_first_instance');self.assertEqual(es['round4-cases:E02']['status'],'reported_appeal_pending')
 def test_no_changes_hash_fabrication(self):
  for c in self.d['documentChanges']:self.assertIsNone(c['beforeSha256']);self.assertIsNone(c['afterSha256'])
 def test_ap_family_shared(self):
  ss={s['id']:s for s in self.d['sources']};self.assertEqual(ss['round4-cases:S5']['sourceFamily'],'AP');self.assertEqual(ss['round4-cases:M8']['sourceFamily'],'AP')
 def test_translation_not_independent(self):
  ss={s['id']:s for s in self.d['sources']};self.assertEqual(ss['round4-cases:M4']['sourceFamily'],ss['round4-cases:M5']['sourceFamily'])
if __name__=='__main__':unittest.main()
