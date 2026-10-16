"""Optional schema parity smoke checks using already-installed python-jsonschema."""
import copy,json,pathlib,unittest
from jsonschema import Draft202012Validator, FormatChecker
CHECKS=pathlib.Path(__file__).resolve().parent
PUBLIC=CHECKS.parents[1]/'public'/'research-activity'
DATA=json.loads((PUBLIC/'snapshot.json').read_text())
SCHEMA=json.loads((CHECKS/'snapshot.schema.json').read_text())
class SchemaTests(unittest.TestCase):
 def setUp(self): self.validator=Draft202012Validator(SCHEMA,format_checker=FormatChecker())
 def test_schema_and_seed(self):
  Draft202012Validator.check_schema(SCHEMA)
  self.validator.validate(DATA)
 def test_rejects_unsafe_and_incomplete_payloads(self):
  def status(d):d['tasks'][0]['status']='invented'
  def evidence(d):d['tasks'][0]['evidence']=[]
  def completion(d):del d['tasks'][0]['completion']
  def private(d):d['tasks'][0]['privateProjectLink']='https://chatgpt.com/c/private'
  def xss(d):d['tasks'][0]['title']='<script>alert(1)</script>'
  def url(d):d['tasks'][0]['evidence'][0]['url']='javascript:alert(1)'
  def extra(d):d['tasks'][0]['hiddenReasoning']='not allowed'
  def newline(d):d['tasks'][0]['evidence'][0]['url']+='\n'
  def unrelated(d):d['tasks'][0]['evidence'][0]['url']='https://occult-kranti.github.io/india-corporate-intelligence/spatial/'
  def review_stage(d):d['tasks'][0]['reviewStage']='source-review'
  for modify in [status,evidence,completion,private,xss,url,extra,newline,unrelated,review_stage]:
   with self.subTest(case=modify.__name__):
    data=copy.deepcopy(DATA);modify(data)
    self.assertFalse(self.validator.is_valid(data))
if __name__=='__main__':unittest.main()
