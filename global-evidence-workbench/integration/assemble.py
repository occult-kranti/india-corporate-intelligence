"""Merge reviewed track artifacts without turning updates into duplicate episodes."""
import json,pathlib,hashlib
from build import build,ROOT
from document_ledger import normalize_entry
WORK=ROOT.parent

def load(path,default):
 p=WORK/path
 return json.loads(p.read_text()) if p.exists() else default

def assemble():
 d=build();records={r['id']:r for r in d['records']};sources={s['id']:s for s in d['sources']};aliases={};d['documentChanges']=[]
 for track in ['protests','epstein']:
  for s in load(track+'/sources.json',[]):
   ss=dict(s);ss['accessDepth']=s.get('access_status') or s.get('access_depth') or s.get('accessDepth','UNKNOWN');ss['sourceFamily']=s.get('source_family') or s.get('family') or 'UNKNOWN';sources[s['id']]=ss
 for r in load('protests/events.json',[]):
  r=dict(r);baseline='protest-atlas:'+(r.get('baseline_event_id') or '');r['location']=None;r['currentStatus']='UNKNOWN';r['temporalScope']='historical-observation';r['pathEligible']=False
  if baseline in records:
   records[baseline].setdefault('researchUpdates',[]).append(r);records[baseline]['sourceIds']=list(dict.fromkeys(records[baseline]['sourceIds']+r['sourceIds']));aliases[r['id']]=baseline
  else:records[r['id']]=r
 for e in load('protests/relations.json',[]):
  e=dict(e);e['source']=aliases.get(e.get('from'),e.get('from'));e['target']=aliases.get(e.get('to'),e.get('to'));e['description']=e.get('interpretation','');e['pathEligible']=False;e['amountAggregable']=False;e['evidenceGrade']='analytic' if 'comparison' in e['type'] else 'reported';e['status']='RESEARCH';d['relations'].append(e)
 for n in load('protests/entities.json',[]):
  records[n['id']]=dict(n,city=None,date=None,status='NAMED_PUBLIC_ACTOR',evidenceGrade='see-related-claims',sector='Public institutions',summary=n.get('identity_scope',''),sourceIds=[],location=None)
 for e in load('protests/target-edges.json',[]):
  e=dict(e);e['source']=aliases.get(e['source'],e['source']);e['target']=aliases.get(e['target'],e['target']);e.update(description=e['claim'],pathEligible=False,amountAggregable=False,evidenceGrade=e.get('claim_type','UNKNOWN'),status='ATTRIBUTED_TYPED_CLAIM',validFrom=None,validTo=None)
  d['relations'].append(e)
  for endpoint_id in [e['source'],e['target']]:
   if endpoint_id in records:records[endpoint_id]['sourceIds']=list(dict.fromkeys(records[endpoint_id].get('sourceIds',[])+e['sourceIds']))
 d['rejectedJoins']+=load('protests/rejected-joins.json',[]);d['researchQueue']+=load('protests/research-queue.json',[])
 claims=[];p=WORK/'epstein/claims.jsonl'
 if p.exists():claims=[json.loads(l) for l in p.read_text().splitlines() if l.strip()]
 claimmap={c['id']:c for c in claims}
 for c in claims:
  records[c['id']]={'id':c['id'],'label':c['claim'],'layer':'epstein','type':'documentary-claim','country':'UNKNOWN','city':None,'date':c.get('event_date'),'status':c['status'],'evidenceGrade':c['status'],'sector':'Public records','summary':c['claim'],'outcome':c.get('support_scope'),'sourceIds':[c['source_id']],'location':None,'dates':{'event':c.get('event_date'),'start':c.get('event_date') if c.get('event_date') and '/' not in c['event_date'] else None,'observed':None,'publication':c.get('publication_date'),'retrieval':c.get('retrieval_date')},'original':c,'amountAggregable':False,'transactionStage':c.get('amount_stage'),'contraryEvidence':c.get('contrary_evidence_or_response')}
 def endpoint(label,refs):
  eid='epstein-entity:'+hashlib.sha256(label.encode()).hexdigest()[:16]
  if eid not in records:records[eid]={'id':eid,'label':label,'layer':'epstein','type':'named-public-record-entity','country':'UNKNOWN','city':None,'date':None,'status':'DOCUMENT_MENTION','evidenceGrade':'see-typed-claim','sector':'Public records','summary':'Named endpoint in a bounded documentary relationship. Mention does not establish wrongdoing.','sourceIds':refs,'location':None}
  return eid
 for i,e in enumerate(load('epstein/institutional_edges.json',[])):
  c=claimmap[e['claim_id']];refs=[c['source_id']];d['relations'].append(dict(e,id='epstein-relation:'+hashlib.sha256(json.dumps(e,sort_keys=True).encode()).hexdigest()[:16],source=endpoint(e['from'],refs),target=endpoint(e['to'],refs),sourceIds=refs,description=c['claim'],status=c['status'],evidenceGrade=c['status'],pathEligible=False,amountAggregable=False,transactionStage=c.get('amount_stage'),validFrom=None,validTo=None,temporalStatus='UNNORMALIZED_DOCUMENT_DATE',originalClaim=c))
 for track in ['epstein','sources']:
  for e in load(track+'/document_changes.json',[]):d['documentChanges'].append(normalize_entry(e))
 changes=load('independent-sources/change-ledger.json',{}).get('records',[])
 for c in changes:
  refs=[]
  for k in ['before_reference','after_reference']:
   url=c.get(k,{}).get('source')
   if url:
    sid='change-source:'+hashlib.sha256(url.encode()).hexdigest()[:16];sources[sid]={'id':sid,'title':'Document-change report / '+c['original_record_id'],'url':url,'accessDepth':'Report inspected; underlying before/after bytes not acquired','sourceFamily':'UNKNOWN','originalRechecked':False};refs.append(sid)
  d['documentChanges'].append(normalize_entry({'id':c['id'],'documentId':c['original_record_id'],'observationType':'PUBLISHER_REPORTED_CHANGE','displayLabel':c['classification'].upper(),'sourceIds':list(dict.fromkeys(refs)),'observedAt':None,'reviewedAt':'2026-10-14','accessDepth':'Historical reported lead; current live state not checked','officialExplanation':c.get('publisher_explanation'),'beforeSha256':None,'afterSha256':None,'original':c,'limitations':['Report dates are not capture timestamps','No original before/after bytes acquired; no byte identity comparison']}))
 countries={c['code']:c['name'] for c in load('integration/cache/protest-atlas/public/countries.json',[])}
 for r in records.values():
  if r.get('country') in countries:r.setdefault('countryName',countries[r['country']])
 resolution=load('epstein/entity_resolution.json',{})
 d['entityResolution']=resolution
 d['records']=list(records.values());d['sources']=list(sources.values());d['meta']['researchOverlayCounts']={'protestUpdateRecords':len(aliases),'protestCandidateEpisodes':len(load('protests/events.json',[]))-len(aliases),'epsteinClaims':len(claims)};d['meta']['scope']='Pinned upstream baseline plus separate bounded research overlays; current activity, completeness and causal cross-network claims are not established'
 return d
if __name__=='__main__':
 d=assemble();(ROOT/'output/dataset.json').write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n');print({k:len(v) for k,v in d.items() if isinstance(v,list)})
 paths=['protests/sources.json','protests/events.json','protests/entities.json','protests/target-edges.json','protests/relations.json','protests/rejected-joins.json','protests/research-queue.json','epstein/sources.json','epstein/claims.jsonl','epstein/institutional_edges.json','epstein/document_changes.json','epstein/entity_resolution.json','independent-sources/change-ledger.json']
 rows=[]
 for path in paths:
  p=WORK/path
  if p.exists():rows.append({'path':path,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'hashScope':'Local research artifact, not original cited document'})
 (ROOT/'output/assembly-manifest.json').write_text(json.dumps({'files':rows,'datasetSha256':hashlib.sha256((ROOT/'output/dataset.json').read_bytes()).hexdigest()},indent=2)+'\n')
