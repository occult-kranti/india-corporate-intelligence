"""Reproduce exact listing-only join subset and audit a label's cross-table meaning."""
import duckdb,json,pathlib,time
p=pathlib.Path(__file__).resolve().parent;prior=json.loads((p/'followup.json').read_text());q=prior['queries']['unique_key_temporal_compatibility']['sql'];cte=q.split('SELECT count(*) AS one_to_one_pairs')[0]
c=duckdb.connect('/workspace/research-cache/tender-20260626/audit.duckdb',read_only=True)
queries={
 'field_equality':cte+"SELECT count(*) AS pairs,count(*) FILTER(WHERE closing_at=award_closing) AS identical_closing_timestamp,count(*) FILTER(WHERE closing_at::DATE=award_closing::DATE) AS identical_closing_day,count(*) FILTER(WHERE award_closing=published_at) AS award_closing_equals_notice_publication,count(*) FILTER(WHERE award_closing::TIME=TIME '00:00:00') AS award_closing_midnight,min(published_at) AS earliest_notice,max(published_at) AS latest_notice FROM matched",
 'by_buyer':cte+"SELECT portal,buyer,count(*) AS pairs,count(*) FILTER(WHERE award_closing=published_at) AS equals_publication,count(*) FILTER(WHERE award_closing=closing_at) AS equals_closing,min(published_at) AS earliest_notice,max(published_at) AS latest_notice FROM matched GROUP BY ALL ORDER BY pairs DESC,portal,buyer",
 'by_year':cte+"SELECT portal,year(published_at) AS notice_year,count(*) AS pairs,count(*) FILTER(WHERE award_closing=published_at) AS equals_publication FROM matched GROUP BY ALL ORDER BY ALL",
 'small_examples':cte+"SELECT internal_id AS notice_internal_id,award_internal_id,portal,buyer,tender_id,reference,title,published_at,closing_at AS notice_closing,award_closing,aoc_at,document_url AS notice_document_url,award_document_url FROM matched WHERE award_closing=published_at ORDER BY published_at DESC,tender_id LIMIT 3"
}
out={'sourceHashes':json.loads((p/'analysis.json').read_text())['sourceHashes'],'scope':'Exact listing-only portal+buyer+tender_id+reference keys unique on both sides; no detail-reference fallback; not a random or representative sample.','queries':{}}
for name,sql in queries.items():
 t=time.time();cur=c.execute(sql);rows=[dict(zip([x[0] for x in cur.description],row)) for row in cur.fetchall()];out['queries'][name]={'sql':sql,'rows':rows,'seconds':time.time()-t};print(name,json.dumps(rows,default=str)[:3000],flush=True)
(p/'closing-field-semantics.json').write_text(json.dumps(out,indent=2,default=str));c.close()
