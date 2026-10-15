"""Non-mutating structural review; does not certify factual source truth."""
import collections, datetime, hashlib, json, pathlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
results={'reviewed_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'Structural review of local artifacts; original-source truth and browser rendering not certified.','json_files':[],'checks':[]}
for path in sorted(ROOT.rglob('*.json')):
 if any(p in {'node_modules','cache','dist','.git'} for p in path.parts) or path.name in {'structural_audit.json','DELIVERY_MANIFEST.json'}:continue
 item={'path':str(path.relative_to(ROOT)),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
 try:
  data=json.loads(path.read_text());item.update(valid_json=True,root_type=type(data).__name__)
 except Exception as e:item.update(valid_json=False,error=str(e))
 results['json_files'].append(item)
path=ROOT/'protests/baseline/events.json'
if path.exists():
 data=json.loads(path.read_text());events=data['events'];ids=[e['id'] for e in events]
 failures=[];sources=0
 for e in events:
  source_ids={s['id'] for s in e.get('sources',[])};sources+=len(source_ids)
  def walk(o):
   if isinstance(o,dict):
    for k,v in o.items():
     if k=='source_ids':
      for sid in v:
       if sid not in source_ids:failures.append({'event':e['id'],'missing_source':sid})
     else:walk(v)
   elif isinstance(o,list):
    for v in o:walk(v)
  walk(e)
  if e.get('start_date') and e.get('end_date') and e['start_date']>e['end_date']:failures.append({'event':e['id'],'date_order':'start after end'})
 results['checks'].append({'dataset':'protests/baseline/events.json','events':len(events),'country_codes':len({e['country'] for e in events}),'duplicate_ids':[k for k,n in collections.Counter(ids).items() if n>1],'unknown_start_dates':sum(e.get('start_date') is None for e in events),'status_counts':dict(collections.Counter(e.get('status') for e in events)),'embedded_sources':sources,'sources_missing_access_depth':sum(not s.get('access_depth') for e in events for s in e.get('sources',[])),'sources_missing_family':sum(not s.get('source_family') for e in events for s in e.get('sources',[])),'reference_and_date_failures':failures})
print(json.dumps(results,indent=2))
