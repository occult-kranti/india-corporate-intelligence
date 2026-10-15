import json,pathlib
p=pathlib.Path(__file__).parent
s=json.loads((p/'sources.json').read_text()); rows=json.loads((p/'change-ledger.json').read_text())['records']
ids={x['id'] for x in s}
assert len(ids)==len(s)==7
assert len(rows)==3
for r in rows:
 assert set(r['source_ids'])<=ids
 assert r['before_sha256'] is None and r['after_sha256'] is None
 assert r['intent_conclusion']=='NOT_ESTABLISHED'
 assert r['limitations'] and r['statement_vs_observation']
 assert r['current_status']
assert rows[0]['prior_record_id']=='E-D04'
assert rows[0]['before_record_ids'] is None
assert rows[1]['classification']=='DOCUMENTED_ADDITIVE_FILING_AMENDMENT'
assert rows[1]['before_record_ids']!=rows[1]['after_record_ids']
assert rows[2]['underlying_event_date']<rows[2]['event_date']
assert all(x['original_sha256'] is None for x in s)
assert not list(p.glob('*.pdf'))
print('PASS: 3 cases, 7 source records; source references, uncertainty, no byte-comparison overclaim, no raw PDFs.')
