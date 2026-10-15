import unittest,sys,pathlib
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]))
from assemble import assemble
class Assembly(unittest.TestCase):
 @classmethod
 def setUpClass(cls):cls.d=assemble()
 def test_no_duplicate_ids(self):
  for k in ['records','relations','sources','documentChanges']:
   ids=[r['id'] for r in self.d[k]];self.assertEqual(len(ids),len(set(ids)),k)
 def test_sources_and_endpoints(self):
  sources={s['id'] for s in self.d['sources']};records={r['id'] for r in self.d['records']}
  for r in self.d['records']+self.d['relations']+self.d['documentChanges']:self.assertTrue(set(r['sourceIds'])<=sources,(r['id'],set(r['sourceIds'])-sources))
  for e in self.d['relations']:self.assertTrue({e['source'],e['target']}<=records,(e['id'],e['source'],e['target']))
 def test_updates_not_duplicates(self):
  updates=[u for r in self.d['records'] for u in r.get('researchUpdates',[])];ids={r['id'] for r in self.d['records']}
  self.assertEqual(len(updates),4)
  for u in updates:self.assertNotIn(u['id'],ids)
 def test_changes_have_no_fake_hashes(self):
  for c in self.d['documentChanges']:self.assertIsNone(c['beforeSha256']);self.assertIsNone(c['afterSha256']);self.assertFalse(c['concealmentEstablished'])
 def test_all_paths_and_sums_blocked(self):
  for e in self.d['relations']:self.assertFalse(e['pathEligible']);self.assertFalse(e['amountAggregable'])
 def test_target_is_not_finance(self):
  e=next(e for e in self.d['relations'] if e['id']=='pr-target-in-cec');self.assertEqual(e['type'],'demands_resignation_of');self.assertEqual(e['source'],'protest-atlas:in-electoral-20261002')
if __name__=='__main__':unittest.main()
