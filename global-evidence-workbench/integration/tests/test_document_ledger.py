import unittest,sys,pathlib
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]))
from document_ledger import compare_snapshots,normalize_entry
class DocumentLedger(unittest.TestCase):
 def test_missing_is_not_hashable(self):
  x=compare_snapshots(None,b'new');self.assertIsNone(x['beforeSha256']);self.assertEqual(x['comparison'],'UNAVAILABLE')
 def test_changed_is_not_concealment(self):
  x=compare_snapshots(b'old',b'new');self.assertEqual(x['comparison'],'CONTENT_CHANGED');self.assertEqual(x['intent'],'NOT_ESTABLISHED')
 def test_empty_file_not_missing(self):self.assertIsNotNone(compare_snapshots(b'',b'')['beforeSha256'])
 def test_string_is_not_source_bytes(self):
  with self.assertRaises(TypeError):compare_snapshots('https://source',b'x')
 def test_http_failure_not_intent(self):
  x=normalize_entry({'id':'x','sourceIds':['s'],'observationType':'HTTP_404'});self.assertFalse(x['concealmentEstablished']);self.assertTrue(x['alternativeExplanations'])
 def test_claimed_hash_needs_acquired_evidence(self):
  with self.assertRaises(ValueError):normalize_entry({'id':'x','sourceIds':['s'],'observationType':'CONTENT_CHANGED','beforeSha256':'abc'})
 def test_search_absence_distinct(self):self.assertEqual(normalize_entry({'id':'x','sourceIds':['s'],'observationType':'NOT_FOUND_IN_SEARCH'})['observationType'],'NOT_FOUND_IN_SEARCH')
if __name__=='__main__':unittest.main()
