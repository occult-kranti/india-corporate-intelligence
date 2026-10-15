"""Rebuild frozen integration with no network and no execution of upstream code."""
import json,hashlib, pathlib, argparse
from literals import exported_array
ROOT=pathlib.Path(__file__).parent
PINS={'protest-atlas':'fcd35a74d0b515be7e36e426aa594e13f2b9543e','india-corporate-intelligence':'c49a5256217c76b8ab2866c5df7711ffbacbf6bf'}
RETRIEVED='2026-10-14T23:09:32Z'
def read(repo,path):return json.loads((ROOT/'cache'/repo/path).read_text())
def ns(repo,id):return repo+':'+str(id)
def source_family(publisher):
    p=publisher.lower()
    for token,family in [('associated press','AP'),('reuters','Reuters'),('afp','AFP')]:
        if token in p:return family
    return 'UNKNOWN'
def source(repo,s):
    url=s.get('url');sid=ns(repo,s.get('id') or hashlib.sha256(str(url).encode()).hexdigest()[:16])
    return dict(s,id=sid,accessDepth='repository-retained-citation',originalRechecked=False,repositoryRetrievedAt=RETRIEVED,sourceFamily=source_family(s.get('publisher','')))
def provenance(repo,path,original):return {'repository':'occult-kranti/'+repo,'commit':PINS[repo],'path':path,'recordId':original,'retrievedAt':RETRIEVED,'verification':'Imported upstream record; cited original not freshly reverified'}
def remap_refs(value,repo):
    if isinstance(value,list):return [remap_refs(v,repo) for v in value]
    if isinstance(value,dict):return {k:[ns(repo,s) for s in v] if k=='source_ids' else remap_refs(v,repo) for k,v in value.items()}
    return value

def edge_id(repo,e):
    return ns(repo,e.get('id') or 'edge-'+hashlib.sha256(json.dumps(e,sort_keys=True,ensure_ascii=False).encode()).hexdigest()[:20])
def build():
    sources={};records=[];relations=[];rejected=[];queue=[];counter=[]
    repo='protest-atlas';events=read(repo,'public/events.json');contexts={x['event_id']:x for x in read(repo,'public/event-context.json')['records']};geo=read(repo,'public/cities.json');cities={(p['country'],p['name']):p for p in geo['places']}
    for e in events['events']:
        ctx=contexts.get(e['id'],{});refs=[]
        for s in e['sources']:
            x=source(repo,s);sources[x['id']]=x;refs.append(x['id'])
        places=[]
        for c in ctx.get('cities',[]):
            g=cities.get((e['country'],c['name']))
            places.append(dict(c,source_ids=[ns(repo,x) for x in c.get('source_ids',[])],location={'lat':g['lat'],'lon':g['lon'],'precision':'coarse-city-reference-not-event-location','sourceUrl':geo['source_url']} if g else None))
        # A single city-reference marker is allowed only for a single explicitly sourced city.
        location=places[0]['location'] if len(places)==1 and places[0]['source_ids'] else None
        records.append({'id':ns(repo,e['id']),'label':e['title'],'layer':'protests','type':'protest-event','country':e['country'],'countryName':e['country_name'],'region':e['region'],'city':', '.join(c['name'] for c in places) or None,'date':e.get('last_observed_at'),'status':e.get('status','unknown').upper(),'currentStatus':'UNKNOWN','evidenceGrade':e['verification']['level'],'sector':', '.join(e.get('issues',[])),'summary':e['summary'],'outcome':ctx.get('outcome_status','not-established'),'sourceIds':refs,'location':location,'cities':places,'positions':remap_refs(e.get('positions',[]),repo),'outcomes':remap_refs(ctx.get('outcomes',[]),repo),'stateResponse':remap_refs(e.get('state_response',[]),repo),'dates':{'start':e.get('start_date'),'startPrecision':e.get('start_date_precision'),'end':e.get('end_date'),'observed':e.get('last_observed_at'),'verifiedUpstream':e.get('last_verified'),'currentAsOf':None},'temporalScope':'historical-observation','provenance':provenance(repo,'public/events.json',e['id']),'original':e,'contextOriginal':ctx})
    repo='india-corporate-intelligence';path='src/graph/data.ts';code=(ROOT/'cache'/repo/path).read_text();nodes=exported_array(code,'NODES');edges=exported_array(code,'EDGES');node_lookup={n['id']:n for n in nodes}
    def node_sources(pairs):
        ids=[]
        for label,url in pairs:
            s=source(repo,{'title':label,'url':url});sources[s['id']]=s;ids.append(s['id'])
        return ids
    for n in nodes:
        # Never place a person from an upstream state display hint, nor treat HQ as project location.
        records.append({'id':ns(repo,n['id']),'label':n['label'],'layer':'entities','type':n['ty'],'country':'UNKNOWN','city':None,'date':None,'status':'UNRESOLVED' if n.get('resolved') is False else 'IMPORTED','evidenceGrade':'upstream-mixed-see-relations','sector':n.get('fam','UNKNOWN'),'summary':' '.join(n.get('d',[])),'outcome':'UNKNOWN','sourceIds':node_sources(n.get('srcs',[])),'location':None,'aliases':n.get('al',[]),'geographicHints':{'upstreamStateDisplayHint':n.get('st'),'meaning':'Not an event, personal, or project location'},'provenance':provenance(repo,path,n['id']),'claimStatus':'INHERITED_UNVERIFIED','original':n})
    original_edge_ids={e['id']:edge_id(repo,e) for e in edges if e.get('id')}
    for i,e in enumerate(edges):
        sid=edge_id(repo,e);refs=node_sources(e.get('srcs',[]));reason=None
        if e['s'] not in node_lookup or e['t'] not in node_lookup:reason='missing-endpoint'
        elif any(node_lookup[x].get('resolved') is False for x in (e['s'],e['t'])):reason='unresolved-identity'
        elif not refs:reason='no-citation'
        if reason:rejected.append({'id':sid,'reason':reason,'original':e});continue
        rel={'id':sid,'source':ns(repo,e['s']),'target':ns(repo,e['t']),'type':e['pred'],'description':e.get('d') or e.get('lab',''),'label':e.get('lab'),'sourceIds':refs,'status':'SUPERSEDED' if e.get('supersededBy') else 'IMPORTED','evidenceGrade':e['tier'],'validFrom':e.get('from'),'validTo':e.get('to'),'temporalStatus':'BOUNDED' if e.get('from') or e.get('to') else 'UNKNOWN','amountOriginal':e.get('a'),'amountUnit':'INR crore' if 'a' in e else None,'amountAggregable':False,'amountSemantics':'upstream-display-value-not-exact-transaction','transactionStage':'UNKNOWN','pathEligible':False,'pathBlockReason':'Original source and temporal compatibility require review','innocentReading':e.get('innocentReading'),'upgradeIf':e.get('upgradeIf'),'killIf':e.get('killIf'),'supersededBy':original_edge_ids.get(e.get('supersededBy')),'supersessionTargetOriginal':e.get('supersededBy'),'supersessionTargetStatus':('RESOLVED' if e.get('supersededBy') in original_edge_ids else 'UNRESOLVED_EXTERNAL') if e.get('supersededBy') else None,'provenance':provenance(repo,path,e.get('id',i)),'original':e}
        relations.append(rel)
        if e.get('innocentReading'):counter.append({'id':sid+'-counter','relationId':sid,'text':e['innocentReading'],'sourceIds':refs})
    rejected.append({'id':'no-geographic-cross-join','reason':'Shared geography, sector, or names are not evidence of protest involvement. No cross-repository relationship is asserted.','status':'NO_JOIN'})
    queue.extend([{'id':'refresh-protests','priority':'high','task':'Reverify current activity and outcomes against original sources','blockedBy':[],'acceptance':'Dated original source explicitly establishes each changed status'}, {'id':'review-india-subgraph','priority':'high','task':'Review inherited source tiers, negative claims and date bounds before causal or temporal path use','blockedBy':[],'acceptance':'Source-level verification and explicit validity windows'}, {'id':'cross-repo-resolution','priority':'high','task':'Admit only explicit source-supported event/entity involvement edges','blockedBy':['refresh-protests','review-india-subgraph'],'acceptance':'Verified identifier, predicate, temporal scope, source and competing interpretation'}, {'id':'full-india-fleets','priority':'medium','task':'Extend additive adapters to generated sector fleets and investigation datasets','blockedBy':['review-india-subgraph'],'acceptance':'Complete manifest, deterministic identities and no duplicate edges'}])
    return {'meta':{'schemaVersion':1,'builtAt':RETRIEVED,'repositoryPins':PINS,'scope':'84 upstream protest episodes plus the India core Atlas subgraph; not all India sector fleets or a current global census','protestCoverageNote':events['coverage_note'],'protestSnapshotAt':events['generated_at'],'originalSourcesFreshlyVerified':False,'crossRepositoryJoins':0},'sources':list(sources.values()),'records':records,'relations':relations,'researchQueue':queue,'rejectedJoins':rejected,'counterhypotheses':counter}

def manifest():
    files=[]
    for p in sorted((ROOT/'cache').rglob('*')):
        if p.is_file():
            rel=p.relative_to(ROOT/'cache');repo=rel.parts[0];path='/'.join(rel.parts[1:]);b=p.read_bytes()
            files.append({'repository':'occult-kranti/'+repo,'commit':PINS[repo],'path':path,'cachePath':str(p.relative_to(ROOT)),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'gitBlobSha1':hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest(),'fetchUrl':f'https://api.github.com/repos/occult-kranti/{repo}/contents/{path}?ref={PINS[repo]}','retrievedAt':RETRIEVED,'accessMethod':'GitHub connector fetch; UTF-8 text body cached','status':'retrieved'})
    return {'version':1,'files':files}
if __name__=='__main__':
    (ROOT/'output').mkdir(exist_ok=True)
    d=build();(ROOT/'output/dataset.json').write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n');(ROOT/'cache-manifest.json').write_text(json.dumps(manifest(),indent=2)+'\n')
    print(json.dumps({k:len(v) for k,v in d.items() if isinstance(v,list)}))
