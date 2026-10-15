#!/usr/bin/env python3
"""Offline validation and hashing of screened extracts, never an original-file hash.
No network access or automated extraction of private identities is performed.
"""
import hashlib, json, pathlib, re
ROOT = pathlib.Path(__file__).resolve().parent
def digest(data): return hashlib.sha256(data).hexdigest()
def main():
    sources = json.loads((ROOT/'sources.json').read_text())
    claims = [json.loads(x) for x in (ROOT/'claims.jsonl').read_text().splitlines() if x.strip()]
    ids = {s['id'] for s in sources}
    assert len(ids)==len(sources)
    assert len({c['id'] for c in claims})==len(claims)
    hashes, normalized = [], {}
    for s in sources:
        p = ROOT/s['extract_path']; b=p.read_bytes(); e=json.loads(b)
        assert e['source_id']==s['id'] and e['url']==s['url']
        assert s['original_source_sha256'] is None and not s['original_bytes_retained']
        texts=[e['verbatim_excerpt']]+[x['text'] for x in e.get('additional_excerpts',[])]
        assert sum(len(t.split()) for t in texts)<=25, s['id']
        norm=' '.join(re.sub(r'\s+',' ',t).strip().lower() for t in texts)
        nh=digest(norm.encode()); normalized.setdefault(nh,[]).append(s['id'])
        hashes.append({'source_id':s['id'],'artifact_path':s['extract_path'],'artifact_sha256':digest(b),'normalized_extract_sha256':nh,'hash_scope':'analyst-curated UTF-8 JSON extract, NOT original publisher bytes'})
    for c in claims:
        assert c['source_id'] in ids
        for k in ['locator','status','support_scope','contrary_evidence_or_response','source_dependency_family']:
            assert c[k], (c['id'],k)
    edges=json.loads((ROOT/'institutional_edges.json').read_text())
    for e in edges:
        assert e['claim_id'] in {c['id'] for c in claims}
        assert e['criminality_inferred'] is False
    inventory=json.loads((ROOT/'corpus_inventory.json').read_text())
    assert len(inventory['datasets'])==12
    for d in inventory['datasets']:
        assert d['observed_count']==len(set(d['observed_filenames']))
        assert d['payloads_downloaded']==0
    (ROOT/'artifact_hashes.json').write_text(json.dumps(hashes,indent=2)+'\n')
    report={'sources':len(sources),'claims':len(claims),'edges':len(edges),'dataset_first_pages':12,'observed_first_page_file_labels':sum(d['observed_count'] for d in inventory['datasets']),'original_source_files_hashed':0,'duplicate_normalized_extract_groups':[v for v in normalized.values() if len(v)>1],'full_corpus_reviewed':False,'limitations':'Offline schema and extract integrity checks only; not independent factual verification or original-content deduplication.'}
    (ROOT/'validation_report.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))
if __name__=='__main__':main()
