"""Additive Round 4 staging only. Never replaces prior release output."""
import json,hashlib,pathlib
from assemble import WORK,ROOT,load
from document_ledger import normalize_entry
STAGING=ROOT/'staging'
BASELINE=ROOT/'releases/v0-dataset.json'
def nid(x):return 'round4-cases:'+x

def assemble_round4():
 baseline=BASELINE.read_bytes();expected=json.loads((ROOT/'releases/v0-manifest.json').read_text())['sha256']
 if hashlib.sha256(baseline).hexdigest()!=expected:raise ValueError('Immutable v0 baseline hash mismatch')
 d=json.loads(baseline);sources={s['id']:s for s in d['sources']};records={r['id']:r for r in d['records']}
 d['meta']['priorReleaseSha256']=hashlib.sha256(baseline).hexdigest();d['meta']['round4ReviewStatus']='BOUNDED_REVIEW_COMPLETE_WITH_LIMITATIONS'
 for s in load('round4-changes/sources.json',[]):sources[s['id']]=dict(s,accessDepth=s['access_depth'],sourceFamily='UNKNOWN',originalRechecked=False)
 for c in load('round4-changes/change-ledger.json',{}).get('records',[]):
  d['documentChanges'].append(normalize_entry({'id':c['id'],'documentId':c['document_id'],'priorRecordId':c.get('prior_record_id'),'url':next((sources[sid]['url'] for sid in c['source_ids']),None),'eventDate':c['event_date'],'observedAt':None,'reviewedAt':'2026-10-14','observationType':'PUBLISHER_REPORTED_CHANGE','displayLabel':c['classification'],'observationBasis':c['statement_vs_observation'],'sourceIds':c['source_ids'],'accessDepth':'Extracted primary document text inspected; original bytes not retained','beforeSha256':None,'afterSha256':None,'officialExplanation':c['reason'],'limitations':c['limitations'],'original':c}))
 ss=load('round4-cases/sources.json',[]);source_lookup={s['id']:s for s in ss}
 for s in ss:
  family='M4_inquiry' if s['id'] in ['M4','M5'] else 'M3_judgment' if s['id'] in ['M3','M9'] else s.get('source_family','UNKNOWN')
  sources[nid(s['id'])]=dict(s,id=nid(s['id']),accessDepth=s['access_depth'],sourceFamily='AP' if s['id'] in ['M8','S5'] else nid(family),originalRechecked=False)
 acquisitions=load('round4-cases/raw/acquisition.json',[])
 for a in acquisitions:
  sid={'NAO_Electrogas_2018.pdf':'M6','olaf_03_2021.pdf':'S4'}.get(a.get('file'))
  p=WORK/'round4-cases/raw'/a.get('file','')
  if sid and a.get('sha256'):
   if p.is_file() and hashlib.sha256(p.read_bytes()).hexdigest()!=a['sha256']:raise ValueError('Original byte hash mismatch '+str(p))
   sources[nid(sid)].update(originalBytesRetained=True,originalIncludedInBundle=False,originalSha256=a['sha256'],originalByteCount=a['bytes'],originalAcquisitionUrl=a['url'],originalReviewScope='Selected passages; original acquired and hash-verified in research workspace, not distributed. Replay without raw bytes relies on retained acquisition receipt.')
 claims=load('round4-cases/claims.json',[]);cm={c['id']:c for c in claims};leads=set()
 for c in claims:
  refs=[nid(s) for s in c['source_ids']];lead=all(source_lookup[s]['access_depth']=='search_result_only' for s in c['source_ids'])
  if lead:leads.add(c['id'])
  records[nid(c['id'])]={'id':nid(c['id']),'label':c['text'],'layer':'journalist-cases','type':'research-lead' if lead else 'documentary-claim','country':{'MT-DCG':'MT','SK-KUC':'SK'}.get(c['case_id'],'UNKNOWN'),'countryName':{'MT-DCG':'Malta','SK-KUC':'Slovakia'}.get(c['case_id'],'Unknown'),'city':None,'date':c.get('event_date'),'dates':{'start':c.get('event_date'),'observed':None,'retrieval':c.get('retrieved_at')},'status':'DISCOVERY_ONLY' if lead else c['status'],'evidenceGrade':'discovery-only' if lead else c['status'],'sector':'Journalist case research','summary':c['text'],'outcome':c.get('does_not_establish'),'sourceIds':refs,'location':None,'amountOriginal':c.get('amount'),'amountAggregable':False,'pathEligible':False,'contraryEvidence':c.get('counterevidence'),'original':c}
 graph=load('round4-cases/typed-graph.json',{})
 for n in graph.get('nodes',[]):
  refs=[nid(c['source_ids'][0]) for e in graph.get('edges',[]) if n['id'] in [e['source'],e['target']] for c in [cm[e['claim_id']]] if e['claim_id'] not in leads]
  if not refs and n.get('id_source'):refs=[nid(n['id_source'])]
  records[nid(n['id'])]={'id':nid(n['id']),'label':n['name'],'layer':'journalist-cases','type':n['type'],'country':'UNKNOWN','city':None,'date':None,'status':'DISCOVERY_ONLY' if not refs else 'NAMED_PUBLIC_RECORD_ENTITY','evidenceGrade':'see-related-claims','sector':'Journalist case research','summary':'Entity in bounded public-record claims; no guilt or shared-mechanism inference.','sourceIds':list(dict.fromkeys(refs)),'location':None,'original':n}
 for e in graph.get('edges',[]):
  c=cm[e['claim_id']]
  if e['claim_id'] in leads:
   d['rejectedJoins'].append({'id':nid(e['id']),'decision':'QUARANTINED_DISCOVERY_ONLY','reason':'Only search-result evidence; original not opened','original':e});continue
  d['relations'].append({'id':nid(e['id']),'source':nid(e['source']),'target':nid(e['target']),'type':e['predicate'],'description':c['text'],'sourceIds':[nid(s) for s in c['source_ids']],'status':c['status'],'evidenceGrade':e['epistemic_status'],'pathEligible':False,'pathBlockReason':'No causal inference; validity and independent review required','amountAggregable':False,'validFrom':e.get('valid_from'),'validTo':e.get('valid_to'),'temporalStatus':'UNKNOWN','claimId':nid(c['id']),'contraryEvidence':c.get('counterevidence'),'limitations':c.get('does_not_establish'),'original':e})
 for i,r in enumerate(load('round4-cases/rejected-joins.json',[])):d['rejectedJoins'].append(dict(r,id=nid('rejected-'+str(i))))
 d['records']=list(records.values());d['sources']=list(sources.values());d['meta']['round4']={'claims':len(claims),'discoveryOnlyClaims':sorted(leads),'typedEdgesAdmitted':len(graph.get('edges',[]))-sum(e['claim_id'] in leads for e in graph.get('edges',[])),'changeEntriesAdded':len(load('round4-changes/change-ledger.json',{}).get('records',[]))}
 return d
if __name__=='__main__':
 STAGING.mkdir(exist_ok=True);d=assemble_round4();p=STAGING/'dataset-round4.json';p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n');manifest={'priorReleaseSha256':d['meta']['priorReleaseSha256'],'datasetSha256':hashlib.sha256(p.read_bytes()).hexdigest(),'inputs':[]}
 for folder in ['round4-cases','round4-changes']:
  for f in sorted((WORK/folder).glob('*.json')):manifest['inputs'].append({'path':str(f.relative_to(WORK)),'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'scope':'Local track artifact'})
 (STAGING/'manifest-round4.json').write_text(json.dumps(manifest,indent=2)+'\n');print({k:len(v) for k,v in d.items() if isinstance(v,list)},d['meta']['round4'])
