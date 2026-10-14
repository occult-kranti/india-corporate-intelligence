#!/usr/bin/env python3
"""Regression checks for model output provenance; no model dependency is required."""
import copy
import importlib.util
import json
from pathlib import Path
import unittest

spec=importlib.util.spec_from_file_location('investigation_model',Path(__file__).with_name('model-rank.py'))
wrapper=importlib.util.module_from_spec(spec)
spec.loader.exec_module(wrapper)
engine=wrapper.model_engine()
documents,digest=engine.read_corpus(wrapper.DEFAULT_INPUT)
result=json.loads(wrapper.DEFAULT_OUTPUT.read_text())

class ModelContract(unittest.TestCase):
 def test_current_actual_artifact(self):
  engine.validate_result(result,documents,digest)
  self.assertEqual(result['researchDomain'],'cross-domain-investigation')
  self.assertFalse(result['execution']['publicTextUploadedToModelService'])
 def test_model_cannot_promote_suggestions_to_verified_claims(self):
  changed=copy.deepcopy(result);changed['automaticallyVerified']=True
  with self.assertRaises(ValueError):engine.validate_result(changed,documents,digest)
 def test_corpus_change_requires_new_inference(self):
  with self.assertRaises(ValueError):engine.validate_result(result,documents,'0'*64)
 def test_model_cannot_invent_citations(self):
  changed=copy.deepcopy(result);next(iter(changed['queries'].values()))['matches'][0]['url']='https://example.org/invented'
  with self.assertRaises(ValueError):engine.validate_result(changed,documents,digest)

if __name__=='__main__':unittest.main()
