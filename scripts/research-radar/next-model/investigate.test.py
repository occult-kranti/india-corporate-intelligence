#!/usr/bin/env python3
"""Wrapper behavior tests use synthetic fixtures, never independent model-test labels."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest


def load(name,path):
    spec=importlib.util.spec_from_file_location(name,path)
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module

ROOT=Path(__file__).parent
investigate=load('investigate_wrapper',ROOT/'investigate.py')
trace_tests=load('trace_fixture',ROOT/'trace.test.py')


class InvestigationTests(unittest.TestCase):
    def test_default_stays_mini_without_valid_matching_promotion(self):
        with tempfile.TemporaryDirectory() as d:
            d=Path(d);corpus=d/'corpus.json';corpus.write_text('{}');evaluation=d/'evaluation.json';selected=d/'selected.json'
            self.assertEqual(investigate.model_selection('default',evaluation,corpus,selected)['resolved'],'mini')
            selected.write_text('{"adapterSha256":"abc"}')
            evaluation.write_text(json.dumps({'promotion':{'promoted':True,'status':'promoted-retrieval-only'}}))
            self.assertEqual(investigate.model_selection('default',evaluation,corpus,selected)['resolved'],'mini')
            value={'promotion':{'promoted':True,'status':'promoted-retrieval-only'},'hashes':{'corpus':investigate.sha(corpus)},
                   'systems':{'candidate':{'configuration':{'selectedConfigurationSha256':investigate.sha(selected),'adapterSha256':'abc'}}}}
            evaluation.write_text(json.dumps(value))
            self.assertEqual(investigate.model_selection('default',evaluation,corpus,selected)['resolved'],'candidate')
            corpus.write_text('{"changed":true}')
            self.assertEqual(investigate.model_selection('default',evaluation,corpus,selected)['resolved'],'mini')

    def test_explicit_candidate_waits_for_evaluation(self):
        with tempfile.TemporaryDirectory() as d:
            d=Path(d);p=d/'corpus';p.write_text('{}');selected=d/'selected';selected.write_text('{"adapterSha256":"abc"}')
            with self.assertRaises(ValueError): investigate.model_selection('candidate',d/'missing',p,selected)
            evaluation=d/'evaluation';evaluation.write_text(json.dumps({'promotion':{'promoted':False},'hashes':{'corpus':investigate.sha(p)},
                'systems':{'candidate':{'configuration':{'selectedConfigurationSha256':investigate.sha(selected),'adapterSha256':'abc'}}}}))
            self.assertEqual(investigate.model_selection('candidate',evaluation,p,selected)['resolved'],'candidate')

    def test_unique_query_identity_and_nonempty_text_required(self):
        for value in [[],[{'id':'a','text':''}],[{'id':'a','text':'one'},{'id':'a','text':'two'}],['query']]:
            with self.assertRaises(ValueError): investigate.normalize_queries(value)
        self.assertEqual(investigate.normalize_queries({'queries':[{'id':'a','query':'valid'}]})[0]['text'],'valid')

    def test_ranking_hashes_completeness_finite_scores_and_ties(self):
        raw={'corpusSha256':'c','queriesSha256':'q','comparators':{'bm25':{'queries':[{'queryId':'q1','ranking':[{'sourceId':'s1','score':1.0},{'sourceId':'s2','score':1.0}]}]}}}
        good=investigate.checked_rankings(raw,'bm25',{'q1'},{'s1','s2'},'c','q');self.assertEqual(len(good['q1']),2)
        with self.assertRaises(ValueError): investigate.checked_rankings(raw,'bm25',{'q1'},{'s1','s2'},'wrong','q')
        row=raw['comparators']['bm25']['queries'][0]
        row['ranking'].reverse()
        with self.assertRaises(ValueError): investigate.checked_rankings(raw,'bm25',{'q1'},{'s1','s2'},'c','q')
        row['ranking']=[{'sourceId':'s1','score':float('nan')},{'sourceId':'s2','score':0}]
        with self.assertRaises(ValueError): investigate.checked_rankings(raw,'bm25',{'q1'},{'s1','s2'},'c','q')
        row['ranking']=[{'sourceId':'s1','score':1},{'sourceId':'s1','score':0}]
        with self.assertRaises(ValueError): investigate.checked_rankings(raw,'bm25',{'q1'},{'s1','s2'},'c','q')

    def test_only_empty_pending_ui_is_replaceable(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'output.json';p.write_text('{"status":"pending-actual-inference","runs":[]}')
            investigate.output_available(p,allow_pending_ui=True)
            with self.assertRaises(ValueError): investigate.output_available(p)
            p.write_text('{"status":"executed","runs":[]}')
            with self.assertRaises(ValueError): investigate.output_available(p,allow_pending_ui=True)

    def test_saved_packet_and_compact_ui_replay_without_model(self):
        with tempfile.TemporaryDirectory() as d:
            d=Path(d);paths={k:d/(k+'.json') for k in ['graph','corpus','queries','rankings','packets','ui','evaluation','selected']}
            graph=trace_tests.fixture();queries=[{'id':'q','text':'Synthetic contract query'}]
            investigate.write(paths['graph'],graph)
            investigate.write(paths['corpus'],{'documents':[{'id':'s1','text':'contract'},{'id':'s2','text':'response'}]})
            investigate.write(paths['queries'],{'queries':queries})
            raw={'corpusSha256':investigate.sha(paths['corpus']),'queriesSha256':investigate.sha(paths['queries']),
                 'comparators':{'bm25':{'queries':[{'queryId':'q','ranking':[{'sourceId':'s1','score':1.0},{'sourceId':'s2','score':0.0}]}]}}}
            investigate.write(paths['rankings'],raw)
            selection=investigate.model_selection('bm25',paths['evaluation'],paths['corpus'],paths['selected'])
            ranks={'q':raw['comparators']['bm25']['queries'][0]['ranking']}
            result={'schemaVersion':1,'status':'executed','modelSelection':selection,'topK':1,
                    'completeRankingsPath':str(paths['rankings']),'historicalForecastEligible':False,'probabilitiesEstimated':False,
                    'hashes':{k:investigate.sha(paths[k]) for k in ['graph','corpus','queries']},
                    'runs':investigate.make_runs(queries,ranks,graph,selection,depth=1,top_k=1)}
            result['hashes'].update(completeRankings=investigate.sha(paths['rankings']),wrapper=investigate.sha(investigate.__file__),traceEngine=investigate.sha(ROOT/'trace.py'))
            investigate.write(paths['packets'],result)
            investigate.write(paths['ui'],investigate.browser_projection(result,investigate.sha(paths['packets']),investigate.sha(paths['rankings'])))
            options={'packet_path':paths['packets'],'ranking_path':paths['rankings'],'graph_path':paths['graph'],
                     'corpus_path':paths['corpus'],'queries_path':paths['queries'],'evaluation_path':paths['evaluation'],
                     'selected_path':paths['selected'],'ui_path':paths['ui']}
            checked=investigate.verify_saved_investigation(**options)
            self.assertTrue(checked['traceReplayedWithoutInference'])
            self.assertEqual(checked['runs'],1)
            ui=json.loads(paths['ui'].read_text());ui['runs'][0]['trace']['missingRecordQuestions']=[]
            investigate.write(paths['ui'],ui)
            with self.assertRaises(ValueError):investigate.verify_saved_investigation(**options)

    def test_rank_to_graph_keeps_source_trace_boundaries(self):
        result=investigate.make_runs([{'id':'q','text':'synthetic query'}],{'q':[{'sourceId':'s1','score':.7},{'sourceId':'s2','score':.1}]},
                                     trace_tests.fixture(),{'resolved':'bm25'},depth=1,top_k=1,as_of='2025-01-15')
        row=result[0];self.assertEqual(row['model'],'bm25');self.assertEqual(row['ranking'][0]['sourceId'],'s1')
        self.assertEqual(row['trace']['selectedSourceIds'],['s1']);self.assertFalse(row['trace']['inferredCashFlow'])
        self.assertFalse(row['trace']['temporalLimits']['historicalForecastEligible'])
        self.assertTrue(row['trace']['missingRecordQuestions'])
        self.assertIn('s2',[x['id'] for x in row['trace']['sources']])


if __name__=='__main__':unittest.main()
