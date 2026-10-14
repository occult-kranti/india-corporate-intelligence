#!/usr/bin/env python3
import copy
import hashlib
import importlib.util
from pathlib import Path
import tempfile
import unittest

spec=importlib.util.spec_from_file_location('funding_validate',Path(__file__).with_name('validate.py'));mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
S='fi:defence:src:1';A='fi:defence:entity:a';B='fi:defence:entity:b';E='fi:defence:edge:1';C='fi:defence:case:1'
def fixture():
    return {'schemaVersion':1,'track':'defence','reviewDate':'2026-10-08','scope':'One synthetic contract only','searchLog':[{'query':'Synthetic fixture','requestedResults':1,'date':'2026-10-08'}],
      'sources':[{'id':S,'title':'Synthetic record','publisher':'Fixture','url':'https://example.org/record','publishedAt':'2026-01-01','accessedAt':'2026-10-08T20:00:00Z','kind':'official','sourceFamily':'fixture-one','inspection':'web-text','locator':'Paragraph 2','excerpt':'Synthetic test: award, not payment.','limitations':['No capture in synthetic fixture'],'capturePath':None,'sha256':None}],
      'entities':[{'id':i,'label':i[-1],'kind':'institution','identityBasis':'Synthetic exact record','sourceIds':[S]} for i in [A,B]],
      'edges':[{'id':E,'from':A,'to':B,'relation':'awarded','label':'Contract award','status':'documented','stage':'award','date':'2026-01-01','amount':{'value':10,'currency':'INR','unit':'crore','period':'FY2025-26','basis':'Contract face value','overlapGroup':None},'sourceIds':[S],'response':'No allegation in this fixture','limits':['Not payment']}],
      'cases':[{'id':C,'title':'Fixture case','question':'Was there an award?','sector':'defence','period':'2026','status':'documented','finding':'Award only','geography':[{'label':'Delhi','stateCode':'DL','basis':'Administrative association'}],'entityIds':[A,B],'edgeIds':[E],'sourceIds':[S],'claims':[{'id':'fi:defence:claim:1','text':'An award is recorded','status':'documented','sourceIds':[S],'response':'No contrary evidence in fixture','alternative':'Scope correction could change value','falsifier':'Obtain a withdrawal or correction','missingRecords':['Payment advice']}],'whatWeKnow':['Award recorded'],'whatWeDoNotKnow':['Payment unknown'],'nextRecords':[{'record':'Payment advice','holder':'Buyer','purpose':'Verify cash disbursement'}],'limits':['Synthetic fixture only']}],
      'coverage':[{'institution':'Buyer','jurisdiction':'India','period':'2026','status':'partial','sourceIds':[S],'gap':'Payments unavailable','nextRecord':'Payment advice'}],'rejectedJoins':[],'roadmap':[{'phase':'next','task':'Read payment evidence','deliverable':'Payment record','acceptance':'Exact ID verified'}]}
class ContractTests(unittest.TestCase):
    def setUp(self):self.x=fixture()
    def valid(self):self.assertTrue(mod.validate(self.x)['valid'],mod.validate(self.x)['errors'])
    def invalid(self,part):
        r=mod.validate(self.x);self.assertFalse(r['valid']);self.assertTrue(any(part in e for e in r['errors']),r)
    def test_malformed_input_fails_closed(self):
        for bad in [None, 1, 'string', {'streams':None}, {'streams':[{'track':[]}]}]:self.assertFalse(mod.validate(bad)['valid'])
    def test_malformed_nested_array(self):self.x['cases'][0]['claims']=None;self.invalid('Malformed contract structure')
    def test_valid_scoped_award(self):self.valid()
    def test_bundle_closure(self):self.assertTrue(mod.validate({'schemaVersion':1,'streams':[self.x]})['valid'])
    def test_no_streams(self):self.assertFalse(mod.validate([])['valid'])
    def test_duplicate_global_id(self):self.x['entities'][0]['id']=S;self.invalid('duplicate global')
    def test_wrong_track_id(self):self.x['edges'][0]['id']='fi:police-border:edge:1';self.invalid('invalid edges ID')
    def test_missing_reference(self):self.x['edges'][0]['sourceIds']=['missing'];self.invalid('unresolved sourceIds')
    def test_missing_edge_evidence(self):self.x['edges'][0]['sourceIds']=[];self.invalid('sourceIds must not be empty')
    def test_missing_endpoint(self):self.x['edges'][0]['to']='unknown';self.invalid('unresolved endpoint')
    def test_case_endpoints(self):self.x['cases'][0]['entityIds']=[A];self.invalid('omits endpoint')
    def test_captured_source_hash(self):
        with tempfile.TemporaryDirectory() as d:
            f=Path(d)/'source.txt';f.write_text('original');s=self.x['sources'][0];s['capturePath']='source.txt';s['sha256']=hashlib.sha256(f.read_bytes()).hexdigest()
            self.assertTrue(mod.validate(self.x,Path(d))['valid']);f.write_text('tampered');self.assertTrue(any('hash mismatch' in e for e in mod.validate(self.x,Path(d))['errors']))
    def test_capture_escape(self):self.x['sources'][0].update(capturePath='../outside',sha256='a'*64);self.invalid('inside repository')
    def test_capture_symlink_escape(self):
        with tempfile.TemporaryDirectory() as d,tempfile.TemporaryDirectory() as e:
            out=Path(e)/'out';out.write_text('private');(Path(d)/'capture').symlink_to(out);self.x['sources'][0].update(capturePath='capture',sha256=hashlib.sha256(out.read_bytes()).hexdigest());self.assertFalse(mod.validate(self.x,Path(d))['valid'])
    def test_hash_pair(self):self.x['sources'][0]['sha256']='a'*64;self.invalid('both be present')
    def test_capture_gap_must_be_visible(self):self.x['sources'][0]['limitations']=[];self.invalid('uncaptured')
    def test_inspection_enum(self):self.x['sources'][0]['inspection']='search-snippet';self.invalid('inspection')
    def test_missing_locator(self):self.x['sources'][0]['locator']='';self.invalid('locator')
    def test_selected_pages_scope(self):self.x['sources'][0].update(inspection='selected-pages',limitations=[]);self.invalid('selected pages')
    def test_time_requires_timezone(self):self.x['sources'][0]['accessedAt']='2026-10-08T12:00:00';self.invalid('timezone')
    def test_invalid_day(self):self.x['edges'][0]['date']='2026-02-31';self.invalid('ISO date')
    def test_unknown_amount_is_null(self):self.x['edges'][0]['amount']=None;self.valid()
    def test_huge_integer_fails_closed(self):self.x['edges'][0]['amount']['value']=10**400;self.invalid('Malformed contract structure')
    def test_cli_preserves_wrapper_guards(self):
        import json,subprocess,sys
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'bundle.json';p.write_text(json.dumps({'streams':[self.x],'aggregateAmount':10}))
            r=subprocess.run([sys.executable,str(Path(__file__).with_name('validate.py')),str(p)],capture_output=True,text=True);self.assertEqual(r.returncode,1);self.assertIn('prohibited',r.stdout)
    def test_nan_money_rejected(self):self.x['edges'][0]['amount']['value']=float('nan');self.invalid('finite')
    def test_bool_money_rejected(self):self.x['edges'][0]['amount']['value']=True;self.invalid('finite')
    def test_infinite_money_rejected(self):self.x['edges'][0]['amount']['value']=float('inf');self.invalid('finite')
    def test_negative_money_rejected(self):self.x['edges'][0]['amount']['value']=-1;self.invalid('nonnegative')
    def test_money_scope_required(self):del self.x['edges'][0]['amount']['period'];self.invalid('period')
    def test_ownership_not_cash(self):self.x['edges'][0]['stage']='ownership';self.invalid('nonfinancial')
    def test_allegation_not_proven_transfer(self):self.x['edges'][0]['stage']='alleged-transfer';self.invalid('cannot be marked documented')
    def test_no_probability(self):self.x['cases'][0]['probability']=0.8;self.invalid('prohibited')
    def test_no_inferred_edge_array(self):self.x['inferredEdges']=[{'from':'a','to':'b'}];self.invalid('prohibited inferred edges')
    def test_no_total(self):self.x['aggregateAmount']=10;self.invalid('prohibited')
    def test_no_hidden_guilt_score(self):self.x['cases'][0]['decisionAnalysis']={'nested':{'guiltScore':0.9}};self.invalid('prohibited')
    def test_null_inference_metadata_allowed(self):self.x.update(aggregateAmount=None,inferredCashFlow=False);self.valid()
    def test_alternative_required(self):self.x['cases'][0]['claims'][0]['alternative']='';self.invalid('alternative')
    def test_falsifier_required(self):self.x['cases'][0]['claims'][0]['falsifier']='';self.invalid('falsifier')
    def test_next_holder_required(self):del self.x['cases'][0]['nextRecords'][0]['holder'];self.invalid('holder')
    def test_secondary_only_disclosed(self):self.x['sources'][0]['inspection']='secondary-only';r=mod.validate(self.x);self.assertTrue(r['valid']);self.assertTrue(any('secondary-only' in w for w in r['warnings']))
    def test_decision_refs(self):
        self.x['cases'][0]['decisionAnalysis']={'decisionDate':None,'actors':[{'entityId':A,'authority':'Documented buyer','incentive':'Delivery is a hypothesis','evidenceSourceIds':[S]}],'informationThen':[{'text':'Incomplete prior information','sourceIds':[S]}],'options':[{'label':'Award','expectedObservableOutcome':'An award document','sourceIds':[S]}],'observedOutcome':'Award recorded','sourceIds':[S],'hindsightLimits':['Unknown private preferences']};self.valid();self.x['cases'][0]['decisionAnalysis']['actors'][0]['entityId']='missing';self.invalid('actor entityId')
    def test_duplicate_stream(self):self.assertFalse(mod.validate([self.x,copy.deepcopy(self.x)])['valid'])
    def test_cross_sector_track(self):
        text=__import__('json').dumps(self.x).replace('fi:defence:','fi:cross-sector:').replace('"track": "defence"','"track": "cross-sector"');self.x=__import__('json').loads(text);self.valid()
if __name__=='__main__':unittest.main()
