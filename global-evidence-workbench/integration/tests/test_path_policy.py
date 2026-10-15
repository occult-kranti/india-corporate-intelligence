import unittest,sys,pathlib
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]))
from path_policy import eligible_path_edge,cross_repo_join
class PathPolicy(unittest.TestCase):
 def test_imported_blocked(self):self.assertEqual(eligible_path_edge({'pathEligible':False},'2020-01-01'),(False,'not-reviewed'))
 def test_reviewed_but_unknown_date_blocked(self):self.assertFalse(eligible_path_edge({'pathEligible':True,'type':'award','sourceIds':['s']},'2020-01-01')[0])
 def test_temporal_bounds(self):
  e={'pathEligible':True,'type':'award','sourceIds':['s'],'validFrom':'2020-01-01','validTo':'2020-03-01'}
  self.assertTrue(eligible_path_edge(e,'2020-02-01')[0]);self.assertFalse(eligible_path_edge(e,'2021-02-01')[0])
 def test_family_is_not_mechanism(self):self.assertEqual(eligible_path_edge({'pathEligible':True,'type':'family'},'2020-01-01')[1],'non-mechanism-predicate')
 def test_geography_cannot_join(self):
  c=dict(sourceIds=['s'],sourceEntityId='e',targetEventId='p',predicate='support',validFrom='2020-01-01',validTo='2021-01-01',reviewer='r',basis='geography',identityResolved=True,sourceExplicitlySupportsPredicate=True)
  self.assertFalse(cross_repo_join(c)[0])
 def test_name_without_resolution_cannot_join(self):self.assertFalse(cross_repo_join({'basis':'same-name'})[0])
if __name__=='__main__':unittest.main()
