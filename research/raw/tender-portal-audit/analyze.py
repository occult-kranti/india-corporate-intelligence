"""Read-only source audit of publisher-hash-verified SQLite snapshots.
Run with PYTHONPATH=/workspace/research-cache/tender-tools python this_file.py.
Only local derived tables are written; originals are attached READ_ONLY.
No personal contact/address fields are read or emitted.
"""
import datetime,json,pathlib,time,duckdb
from cache_contract import guard
ROOT=pathlib.Path(__file__).resolve().parent
CACHE=pathlib.Path('/workspace/research-cache/tender-20260626')
for name in ['aoc_tenders.db','tenders_vps.db']:
 receipt=json.loads((ROOT/'evidence'/f'{name}.download-receipt.json').read_text())
 assert receipt['status']=='verified-published-sha256'
prior_results=json.loads((ROOT/'analysis.json').read_text()) if (ROOT/'analysis.json').exists() else {}
source_hashes={name:json.loads((ROOT/'evidence'/f'{name}.download-receipt.json').read_text())['sha256'] for name in ['aoc_tenders.db','tenders_vps.db']}
recipe=guard(__file__,source_hashes,CACHE,prior_results)
c=duckdb.connect(str(CACHE/'audit.duckdb'));c.execute("SET memory_limit='1100MB';SET threads=2;SET temp_directory='/workspace/research-cache/tender-20260626/duckdb-tmp';SET preserve_insertion_order=false")
c.execute('LOAD sqlite');c.execute(f"ATTACH '{CACHE}/aoc_tenders.db' AS src_a (TYPE sqlite, READ_ONLY)");c.execute(f"ATTACH '{CACHE}/tenders_vps.db' AS src_t (TYPE sqlite, READ_ONLY)")
c.execute("CREATE OR REPLACE MACRO portal_ts(x) AS try_strptime(x, '%d-%b-%Y %I:%M %p');CREATE OR REPLACE MACRO clean_num(x) AS try_cast(nullif(regexp_replace(coalesce(x,''),'[^0-9.-]','','g'),'') AS DOUBLE)")
results={'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'duckdbVersion':duckdb.__version__,'sourceHashes':{name:json.loads((ROOT/'evidence'/f'{name}.download-receipt.json').read_text())['sha256'] for name in ['aoc_tenders.db','tenders_vps.db']},'queries':{}}
if (ROOT/'analysis.json').exists():
 results=json.loads((ROOT/'analysis.json').read_text())
results['derivationFingerprint']=recipe['fingerprint']
def run(name,sql,fetch=True):
 if name in results['queries'] and results['queries'][name]['sql']==sql:
  print(name,'reusing identical completed query',flush=True);return results['queries'][name]['rows']
 start=time.time();cur=c.execute(sql);value=[dict(zip([col[0] for col in cur.description],row)) for row in cur.fetchall()] if fetch else None
 results['queries'][name]={'sql':sql,'seconds':round(time.time()-start,3),'rows':value};(ROOT/'analysis.json').write_text(json.dumps(results,indent=2,default=str));print(name,round(time.time()-start,2),json.dumps(value,default=str)[:2200],flush=True);return value
run('source_counts',"SELECT 'award_listings' AS table_name,count(*) AS n FROM src_a.aoc_tenders UNION ALL SELECT 'award_details',count(*) FROM src_a.aoc_details UNION ALL SELECT 'notice_listings',count(*) FROM src_t.tenders UNION ALL SELECT 'notice_details',count(*) FROM src_t.tender_details")
if not c.execute("SELECT count(*) FROM information_schema.tables WHERE table_catalog='audit' AND table_name='awards'").fetchone()[0]:
 run('build_award_details',r'''CREATE TABLE award_details AS SELECT internal_id,tender_id,try_cast(scraped_at AS TIMESTAMP) AS scraped_at,json_valid(details_json) AS json_valid,
 json_extract_string(try_cast(details_json AS JSON),'$."Name of the selected bidder(s)"') AS bidder,
 json_extract_string(try_cast(details_json AS JSON),'$."Number of bids received"') AS bids_raw,
 json_extract_string(try_cast(details_json AS JSON),'$."Contract Value"') AS value_raw,
 json_extract_string(try_cast(details_json AS JSON),'$."Contract Date"') AS contract_raw,
 json_extract_string(try_cast(details_json AS JSON),'$."Tender Type"') AS tender_type,
 json_extract_string(try_cast(details_json AS JSON),'$."Tender Document"') AS document_url
 FROM src_a.aoc_details''',False)
 run('build_awards',r'''CREATE TABLE awards AS SELECT a.internal_id,a.tender_id,a.portal_type AS portal,a.year AS portal_year,a.org_name AS buyer,a.ref_no AS reference,a.title,
 portal_ts(a.aoc_date) AS aoc_at,portal_ts(a.closing_date) AS closing_at,d.scraped_at,d.internal_id IS NOT NULL AS has_details,
 a.tender_id IS DISTINCT FROM d.tender_id AND d.internal_id IS NOT NULL AS detail_id_mismatch,
 d.bidder,lower(trim(d.bidder)) AS bidder_norm,d.bids_raw,try_cast(clean_num(d.bids_raw) AS INTEGER) AS bids,d.value_raw,clean_num(d.value_raw) AS value_amount,portal_ts(d.contract_raw) AS contract_at,d.tender_type,d.document_url
 FROM src_a.aoc_tenders a LEFT JOIN award_details d USING(internal_id)''',False)
if not c.execute("SELECT count(*) FROM information_schema.tables WHERE table_catalog='audit' AND table_name='notices'").fetchone()[0]:
 run('build_notice_details',r'''CREATE TABLE notice_details AS SELECT internal_id,tender_id,try_cast(scraped_at AS TIMESTAMP) AS scraped_at,json_valid(details_json) AS json_valid,
 json_extract_string(try_cast(details_json AS JSON),'$."Location"') AS location,
 json_extract_string(try_cast(details_json AS JSON),'$."Product Category"') AS product_category,
 json_extract_string(try_cast(details_json AS JSON),'$."Tender Category"') AS tender_category,
 json_extract_string(try_cast(details_json AS JSON),'$."Tender Type"') AS tender_type,
 coalesce(json_extract_string(try_cast(details_json AS JSON),'$."EMD *"'),json_extract_string(try_cast(details_json AS JSON),'$."EMD"')) AS emd_raw,
 coalesce(json_extract_string(try_cast(details_json AS JSON),'$."Tender Fee *"'),json_extract_string(try_cast(details_json AS JSON),'$."Tender Fee"')) AS fee_raw,
 json_extract_string(try_cast(details_json AS JSON),'$."Bid Submission Start Date"') AS bid_start_raw,
 json_extract_string(try_cast(details_json AS JSON),'$."Document Download Start Date"') AS download_start_raw,
 json_extract_string(try_cast(details_json AS JSON),'$."Document Download End Date"') AS download_end_raw,
 json_extract_string(try_cast(details_json AS JSON),'$."Tender Document"') AS document_url
 FROM src_t.tender_details''',False)
 run('build_notices',r'''CREATE TABLE notices AS SELECT t.internal_id,t.tender_id,CASE t.portal_type WHEN 'org' THEN 'central' ELSE t.portal_type END AS portal,t.portal_type AS original_portal,t.organisation_name AS buyer,t.reference_number AS reference,t.title,t.status,t.corrigendum_url,
 portal_ts(t.e_published_date) AS published_at,portal_ts(t.bid_submission_closing_date) AS closing_at,portal_ts(t.tender_opening_date) AS opening_at,try_cast(t.scraped_at AS TIMESTAMP) AS listing_scraped_at,d.scraped_at AS detail_scraped_at,d.internal_id IS NOT NULL AS has_details,
 t.tender_id IS DISTINCT FROM d.tender_id AND d.internal_id IS NOT NULL AS detail_id_mismatch,
 d.location,d.product_category,d.tender_category,d.tender_type,d.emd_raw,clean_num(d.emd_raw) AS emd_amount,d.fee_raw,clean_num(d.fee_raw) AS fee_amount,portal_ts(d.bid_start_raw) AS bid_start_at,portal_ts(d.download_start_raw) AS download_start_at,portal_ts(d.download_end_raw) AS download_end_at,d.document_url
 FROM src_t.tenders t LEFT JOIN notice_details d USING(internal_id)''',False)
run('portal_population',"SELECT 'awards' AS grain,portal,count(*) AS rows,count(DISTINCT tender_id) AS distinct_tender_ids,count(*) FILTER(WHERE has_details) AS detailed FROM awards GROUP BY portal UNION ALL SELECT 'notices',portal,count(*),count(DISTINCT tender_id),count(*) FILTER(WHERE has_details) FROM notices GROUP BY portal")
run('detail_integrity',"SELECT 'awards' AS grain,count(*) FILTER(WHERE NOT json_valid) AS invalid_json,count(*) FILTER(WHERE internal_id='test_id_1') AS test_rows,count(*) FILTER(WHERE NOT EXISTS(SELECT 1 FROM awards a WHERE a.internal_id=award_details.internal_id)) AS orphan_details,min(scraped_at) AS earliest_scrape,max(scraped_at) AS latest_scrape FROM award_details UNION ALL SELECT 'notices',count(*) FILTER(WHERE NOT json_valid),count(*) FILTER(WHERE internal_id='test_id_1'),count(*) FILTER(WHERE NOT EXISTS(SELECT 1 FROM notices n WHERE n.internal_id=notice_details.internal_id)),min(scraped_at),max(scraped_at) FROM notice_details")
run('listing_detail_id_mismatch',"SELECT 'awards' AS grain,count(*) FILTER(WHERE detail_id_mismatch) AS mismatches FROM awards UNION ALL SELECT 'notices',count(*) FILTER(WHERE detail_id_mismatch) FROM notices")
run('notice_status',"SELECT portal,status,count(*) AS rows FROM notices GROUP BY ALL ORDER BY ALL")
run('notice_field_coverage',"SELECT portal,count(*) AS rows,count(*) FILTER(WHERE has_details) AS detailed,count(*) FILTER(WHERE nullif(trim(location),'') IS NOT NULL) AS location_present,count(*) FILTER(WHERE nullif(trim(product_category),'') IS NOT NULL) AS category_present,count(*) FILTER(WHERE emd_amount IS NOT NULL) AS emd_parseable,count(*) FILTER(WHERE fee_amount IS NOT NULL) AS fee_parseable,count(*) FILTER(WHERE emd_amount<0) AS negative_emd,count(*) FILTER(WHERE fee_amount<0) AS negative_fee,count(*) FILTER(WHERE nullif(trim(corrigendum_url),'') IS NOT NULL) AS corrigendum_link,count(*) FILTER(WHERE nullif(trim(document_url),'') IS NOT NULL) AS tender_document_link FROM notices GROUP BY portal")
run('notice_date_quality',"SELECT portal,count(*) AS rows,count(*) FILTER(WHERE published_at IS NULL) AS publication_unparsed,count(*) FILTER(WHERE closing_at IS NULL) AS closing_unparsed,count(*) FILTER(WHERE published_at>closing_at) AS closes_before_publication,count(*) FILTER(WHERE published_at>listing_scraped_at) AS publication_after_listing_scrape,count(*) FILTER(WHERE closing_at>listing_scraped_at) AS closing_after_listing_scrape,count(*) FILTER(WHERE opening_at<closing_at) AS opening_before_closing,count(*) FILTER(WHERE bid_start_at>closing_at) AS bid_start_after_closing,min(published_at) AS earliest_publication,max(published_at) AS latest_publication,min(listing_scraped_at) AS earliest_listing_scrape,max(listing_scraped_at) AS latest_listing_scrape FROM notices GROUP BY portal")
run('notice_year_coverage',"SELECT portal,year(published_at) AS publication_year,count(*) AS rows FROM notices GROUP BY ALL ORDER BY ALL")
run('bid_window_summary',"SELECT portal,count(*) AS eligible,median(date_diff('minute',published_at,closing_at)/1440.0) AS median_days,count(*) FILTER(WHERE date_diff('minute',published_at,closing_at)<72*60) AS under_72h,count(*) FILTER(WHERE date_diff('minute',published_at,closing_at)<24*60) AS under_24h FROM notices WHERE published_at<=closing_at AND published_at<=listing_scraped_at AND year(published_at)>=2011 GROUP BY portal")
# Group sizes compute pair cardinality without ever materialising the many-to-many pairs.
for name,keys in [('id_only',['tender_id']),('portal_id',['portal','tender_id']),('portal_buyer_id',['portal','buyer','tender_id']),('portal_buyer_id_reference',['portal','buyer','tender_id','reference'])]:
 cols=','.join(keys);condition=' AND '.join(f'n.{k}=a.{k}' for k in keys);valid=' AND '.join(f"nullif(trim({k}),'') IS NOT NULL" for k in keys)
 run('join_'+name,f"WITH n AS(SELECT {cols},count(*) AS n FROM notices WHERE {valid} GROUP BY {cols}),a AS(SELECT {cols},count(*) AS n FROM awards WHERE {valid} GROUP BY {cols}) SELECT count(*) AS shared_keys,sum(n.n::HUGEINT*a.n) AS candidate_pair_rows,sum(n.n) AS matched_notice_rows,sum(a.n) AS matched_award_rows,count(*) FILTER(WHERE n.n=1 AND a.n=1) AS one_to_one_keys,count(*) FILTER(WHERE n.n>1 AND a.n>1) AS many_to_many_keys,max(n.n::HUGEINT*a.n) AS max_pairs_one_key FROM n JOIN a ON {condition}")
run('largest_ambiguous_keys',"WITH n AS(SELECT tender_id,count(*) AS n,count(DISTINCT buyer) AS notice_buyers FROM notices GROUP BY tender_id),a AS(SELECT tender_id,count(*) AS n,count(DISTINCT buyer) AS award_buyers FROM awards GROUP BY tender_id) SELECT tender_id,n.n AS notice_rows,a.n AS award_rows,n.n::HUGEINT*a.n AS candidate_pairs,notice_buyers,award_buyers FROM n JOIN a USING(tender_id) ORDER BY candidate_pairs DESC,tender_id LIMIT 10")
run('award_date_quality',"SELECT portal,count(*) AS rows,count(*) FILTER(WHERE aoc_at>scraped_at) AS aoc_after_own_detail_scrape,count(*) FILTER(WHERE aoc_at>TIMESTAMP '2026-06-26 23:59:59') AS aoc_after_publication_cutoff,count(*) FILTER(WHERE contract_at>scraped_at) AS contract_after_own_detail_scrape,count(*) FILTER(WHERE aoc_at<closing_at) AS aoc_before_closing,count(*) FILTER(WHERE year(aoc_at)<>portal_year) AS portal_year_differs,min(aoc_at) AS min_aoc,max(aoc_at) AS max_aoc FROM awards GROUP BY portal")
run('legacy_dedup_key_collisions',"WITH k AS(SELECT tender_id,bidder_norm,aoc_at,count(*) AS rows,count(DISTINCT portal) AS portals,count(DISTINCT buyer) AS buyers,count(DISTINCT reference) AS reference_variants,count(DISTINCT coalesce(cast(value_amount AS VARCHAR),'<NULL>')) AS amount_variants,count(DISTINCT coalesce(cast(bids AS VARCHAR),'<NULL>')) AS bid_variants,count(DISTINCT coalesce(cast(closing_at AS VARCHAR),'<NULL>')) AS closing_variants FROM awards GROUP BY ALL) SELECT count(*) AS legacy_keys,sum(rows) AS raw_rows,count(*) FILTER(WHERE portals>1) AS cross_portal_keys,sum(rows) FILTER(WHERE portals>1) AS cross_portal_rows,count(*) FILTER(WHERE buyers>1) AS cross_buyer_keys,sum(rows) FILTER(WHERE buyers>1) AS cross_buyer_rows,count(*) FILTER(WHERE reference_variants>1) AS multiple_reference_keys,count(*) FILTER(WHERE amount_variants>1) AS conflicting_value_keys,count(*) FILTER(WHERE bid_variants>1) AS conflicting_bid_count_keys,count(*) FILTER(WHERE closing_variants>1) AS conflicting_closing_keys FROM k")
run('scoped_dedup_counts',"SELECT (SELECT count(*) FROM (SELECT tender_id,bidder_norm,aoc_at FROM awards GROUP BY ALL)) AS legacy_rows,(SELECT count(*) FROM (SELECT portal,buyer,tender_id,bidder_norm,aoc_at FROM awards GROUP BY ALL)) AS scoped_rows,(SELECT count(*) FROM (SELECT portal,buyer,tender_id,reference,bidder_norm,aoc_at FROM awards GROUP BY ALL)) AS reference_scoped_rows")
c.execute('CHECKPOINT');c.close()
