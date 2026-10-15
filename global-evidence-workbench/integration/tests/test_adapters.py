import unittest,sys,pathlib,json,hashlib
ROOT=pathlib.Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from build import build,manifest
from literals import parse_literal
class Adapters(unittest.TestCase):
 @classmethod
 def setUpClass(cls):cls.d=build()
 def test_counts(self):
  self.assertEqual(len(self.d['records']),150);self.assertEqual(len(self.d['relations']),108)
 def test_reproducible(self):self.assertEqual(self.d,build())
 def test_unique_namespaced_ids(self):
  for collection in ['sources','records','relations']:
   ids=[x['id'] for x in self.d[collection]];self.assertEqual(len(ids),len(set(ids)));self.assertTrue(all(':' in x for x in ids))
 def test_citations_and_endpoints(self):
  ids={r['id'] for r in self.d['records']};sources={s['id'] for s in self.d['sources']}
  for r in self.d['records']+self.d['relations']:self.assertTrue(set(r['sourceIds'])<=sources)
  for e in self.d['relations']:self.assertTrue({e['source'],e['target']}<=ids)
 def test_nested_source_refs(self):
  sources={s['id'] for s in self.d['sources']}
  def walk(v):
   if isinstance(v,list):
    for x in v:walk(x)
   elif isinstance(v,dict):
    for k,x in v.items():
     if k=='source_ids':self.assertTrue(set(x)<=sources,repr(x))
     else:walk(x)
  for r in self.d['records']:
   for k in ['positions','outcomes','cities','stateResponse']:walk(r.get(k))
 def test_no_geographic_involvement_join(self):
  self.assertEqual(self.d['meta']['crossRepositoryJoins'],0)
  self.assertTrue(all(e['source'].split(':')[0]==e['target'].split(':')[0] for e in self.d['relations']))
 def test_no_current_activity_inference(self):
  for r in self.d['records']:
   if r['type']=='protest-event':self.assertEqual(r['currentStatus'],'UNKNOWN');self.assertEqual(r['temporalScope'],'historical-observation');self.assertIsNone(r['dates']['currentAsOf'])
 def test_no_false_geographic_precision(self):
  for r in self.d['records']:
   if r['location']:
    self.assertEqual(len(r['cities']),1);self.assertEqual(r['location']['precision'],'coarse-city-reference-not-event-location')
   if r['type']!='protest-event':self.assertIsNone(r['location'])
 def test_context_is_lossless(self):
  events=json.loads((ROOT/'cache/protest-atlas/public/events.json').read_text())['events']
  for e,r in zip(events,self.d['records']):self.assertEqual(e,r['original'])
 def test_deny_executable_upstream(self):
  for text in ['[process.exit()]','[...x]','[`${x}`]','[x]']:
   with self.assertRaises(ValueError):parse_literal(text)
 def test_unknown_dates_not_current(self):
  for e in self.d['relations']:
   if not e['validFrom'] and not e['validTo']:self.assertEqual(e['temporalStatus'],'UNKNOWN')
 def test_exact_upstream_blobs(self):
  blobs=json.loads((ROOT/'upstream-blobs.json').read_text())
  for f in manifest()['files']:self.assertEqual(f['gitBlobSha1'],blobs[f['repository'].split('/')[1]+'/'+f['path']])
 def test_no_source_reverification_claim(self):
  self.assertTrue(all(not s['originalRechecked'] for s in self.d['sources']))
 def test_supersession_resolves(self):
  ids={e['id'] for e in self.d['relations']}
  for e in self.d['relations']:
   if e.get('supersededBy'):self.assertIn(e['supersededBy'],ids)
 def test_stable_edge_identity(self):
  from build import edge_id
  self.assertEqual(edge_id('r',{'a':1,'b':2}),edge_id('r',{'b':2,'a':1}))
 def test_no_unreviewed_path_or_sum(self):
  for e in self.d['relations']:self.assertFalse(e['pathEligible']);self.assertFalse(e['amountAggregable'])
 def test_syndication_not_independence(self):
  from build import source_family
  self.assertEqual(source_family('Associated Press via Seattle Times'),source_family('Associated Press'))
 def test_denial_and_supersession_retained(self):
  self.assertTrue(any(e['type']=='contra' for e in self.d['relations']));self.assertTrue(any(e['type']=='supersede' for e in self.d['relations']))
if __name__=='__main__':unittest.main()
