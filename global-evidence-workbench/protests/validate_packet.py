import json,pathlib,hashlib
p=pathlib.Path(__file__).parent
load=lambda n:json.loads((p/n).read_text())
r=load('events.json');s=load('sources.json');ents=load('entities.json');edges=load('target-edges.json');ids={x['id'] for x in r};sids={x['id'] for x in s};eids=ids|{x['id'] for x in ents}
checks=[]
assert len(ids)==len(r);assert len(sids)==len(s)
for x in r:
 assert all(y in sids for y in x['sourceIds']),x['id']
 assert x['date'] is None or x['date']<='2026-10-14',x['id']
 assert x['location'] is None
 assert x['financing_links']==[]
for x in s:
 assert x['published_at'] is None or x['published_at']<='2026-10-14'
 assert len(x['exact_excerpt'].split())<=25,x['id']
for x in edges:
 assert x['source'] in eids and x['target'] in eids,x['id']
 assert all(y in sids for y in x['sourceIds'])
c=load('coverage.json');assert len(c['country_rows'])==249
for x in c['country_rows']:
 rr=[z for z in r if z['country']==x['code']];x['supplement_source_ids']=sorted({s for z in rr for s in z['sourceIds']})
(p/'coverage.json').write_text(json.dumps(c,ensure_ascii=False,indent=2)+'\n')
res={'as_of':'2026-10-14','checks_passed':['unique record/source IDs','all supplemental source references resolve','all typed-edge endpoints resolve','no future event/publication dates','all source excerpts at most25 words','no precise operational coordinates','no unsupported financial links','249 country/territory denominator retained'],'record_count':len(r),'source_count':len(s),'target_edge_count':len(edges),'country_rows':249,'city_rows':len(c['city_rows']),'global_city_completeness':False,'validation_type':'structural plus source-check; not proof every factual claim independently verified'}
(p/'validation.json').write_text(json.dumps(res,indent=2)+'\n')
manifest=[dict(file=x.name,sha256=hashlib.sha256(x.read_bytes()).hexdigest()) for x in sorted(p.glob('*.json')) if x.name!='packet-manifest.json']
(p/'packet-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(res,indent=2))
