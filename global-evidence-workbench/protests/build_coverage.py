import json,pathlib,hashlib
P=pathlib.Path(__file__).parent
load=lambda p:json.loads(p.read_text())
base=load(P/'baseline/events.json'); countries=load(P/'baseline/countries.json'); cov=load(P/'baseline/coverage.json'); refs=load(P/'baseline/cities.json')['places']; rec=load(P/'events.json'); src=load(P/'sources.json')
for r in rec:
 if r['id']=='pr-in-hostels-2026':
  r['date']=None;r['last_observed_at']=None;r['reported_as_of']='2026-10-05';r['status']='reported by source; event day and continuity unverified'
 if r['id'] in ['pr-bd-accountability-2024','pr-np-allegations-2025']:r['type']='historical_accountability_context';r['status']='historical_context; current proceeding status not verified'
(P/'events.json').write_text(json.dumps(rec,ensure_ascii=False,indent=2)+'\n')
ci={x['code']:x for x in cov['countries']};cl=[]
for c in countries:
 b=[x for x in base['events'] if x['country']==c['code']];d=[x for x in rec if x['country']==c['code']]
 cl.append(dict(code=c['code'],name=c['name'],region=c['region'],baseline_episode_count=len(b),baseline_event_ids=[x['id'] for x in b],baseline_last_checked=ci.get(c['code'],{}).get('last_checked'),baseline_sources_reopened_in_this_batch=False,supplement_record_ids=[x['id'] for x in d],supplement_source_ids=sorted(set(s for x in d for s in x['sourceIds'])),coverage_status='selected-source-check' if d else ('inherited-baseline-only' if b else 'not-reviewed'),complete=False,absence_means='coverage gap, not absence of protest'))
# Reference points are NOT evidence of occurrence. Only explicit source-linked context joins may connect cities.
eventById={e['id']:e for e in base['events']};cityrows={}
for c in refs:
 cityrows[(c['country'],c['name'])]=dict(country=c['country'],city=c['name'],reference_point=True,baseline_event_ids=[],supplement_record_ids=[],source_ids=[],complete=False)
ctx=load(P.parent/'integration/cache/protest-atlas/public/event-context.json')
for x in ctx['records']:
 e=eventById.get(x['event_id'])
 if not e: continue
 for c in x.get('cities',[]):
  key=(e['country'],c['name']);row=cityrows.setdefault(key,dict(country=key[0],city=key[1],reference_point=False,baseline_event_ids=[],supplement_record_ids=[],source_ids=[],complete=False));row['baseline_event_ids'].append(e['id']);row['source_ids'].extend(c.get('source_ids',[]))
for e in rec:
 for c in e['cities']:
  key=(e['country'],c);row=cityrows.setdefault(key,dict(country=key[0],city=key[1],reference_point=False,baseline_event_ids=[],supplement_record_ids=[],source_ids=[],complete=False));row['supplement_record_ids'].append(e['id']);row['source_ids'].extend(e['sourceIds'])
for row in cityrows.values():
 row['source_ids']=sorted(set(row['source_ids']));row['coverage_status']='selected-source-check' if row['supplement_record_ids'] else ('inherited-baseline-only' if row['baseline_event_ids'] else 'reference-only-unreviewed');row['absence_means']='not reviewed; no negative event inference'
ledger=dict(as_of='2026-10-14',country_roster_definition='249 ISO-style country and territory rows inherited from repository; not 249 sovereign states',country_roster_count=len(cl),country_rows=cl,city_roster_definition='Union of 101 repository reference points, explicit source-linked baseline cities, and this supplement; not a global city gazetteer',city_roster_count=len(cityrows),city_rows=list(cityrows.values()),population_denominator=None,global_city_denominator=None,coverage_is_exhaustive=False,current_activity_is_verified_globally=False,limitations=['No inference that countries with no rows have no protests.','No incidence ranking or share of global protests is computable from convenience sample.','A source date span is not a continuously monitored interval.','Only English and Spanish articles read in this supplement. Translation origin does not add a language reviewed.','Undetected events, unindexed local reporting, offline records, restricted media and subnational omissions remain.'])
(P/'coverage.json').write_text(json.dumps(ledger,ensure_ascii=False,indent=2)+'\n')
manifest=[]
for p in sorted((P/'baseline').glob('*.json')):manifest.append(dict(path=str(p.relative_to(P)),sha256=hashlib.sha256(p.read_bytes()).hexdigest(),origin='https://github.com/occult-kranti/protest-atlas/blob/fcd35a74d0b515be7e36e426aa594e13f2b9543e/public/'+p.name,accessed_at='2026-10-14',scope='repository snapshot; underlying external sources not reread'))
(P/'baseline-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('country roster',len(cl),'city ledger',len(cityrows),'supplement countries',len(set(e['country'] for e in rec)),'new countries',set(e['country'] for e in rec)-set(e['country'] for e in base['events']))
