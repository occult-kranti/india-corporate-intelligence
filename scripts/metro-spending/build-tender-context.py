#!/usr/bin/env python3
"""Turn executed, bounded dataset cohorts into neutral inspectable context cards."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FOLDER = ROOT / 'research/raw/metro-spending/tender-scan'
analysis = json.loads((FOLDER / 'analysis.json').read_text())
base = 'https://github.com/occult-kranti/india-corporate-intelligence/blob/'
source_ids = ['portal-snapshot', 'executed-cohort-scan', 'original-download-receipts']
sources = [
    dict(id='portal-snapshot', title='Public tender archive: separate notice and award SQLite snapshots', url='https://tender.sarthaksidhant.com/', publisher='Sarthak Sidhant', publishedAt='2026-06-26', retrievedAt='2026-10-06', locator='Published SQLite schemas and SHA256 values; retained June 2026 archive', summary='Third-party mirror of notice and award listings, with different row grains. The analysis uses original publisher-hash-verified SQLite files, not the displayed website grand total.', tier='reported', limitations=['A mirrored row is not a revalidated original procurement document, award payment, legal-company identity or corruption finding.']),
    dict(id='executed-cohort-scan', title='Executed Delhi, Mumbai and security buyer-cohort scan', url=base+'codex/education-funding-intelligence/research/raw/metro-spending/tender-scan/analysis.json', publisher='ICIP reproducible source analysis', publishedAt='2026-10-07', retrievedAt='2026-10-07', locator='cohorts, queries: full_listing_denominators, *_cohort_counts, *_repeated_keys, award_bid_lexemes; exact SQL and execution times', summary='Read-only scan of two rehashed original SQLite inputs and a fingerprint-verified derivation. Thirteen disjoint buyer-name probes keep notice/award rows, date eligibility, repeated keys and bid-count coverage separate. No money sum or corruption inference is produced.', tier='analytic', limitations=analysis['limits']),
    dict(id='original-download-receipts', title='Original archive retrieval, ZIP integrity and full SQLite SHA256 receipts', url=base+'528948966c1015ea25bcf2539004561e8fd68963/research/raw/tender-portal-audit/evidence/', publisher='ICIP original source retrieval receipts', publishedAt=None, retrievedAt='2026-10-06', locator='aoc_tenders.db.download-receipt.json and tenders_vps.db.download-receipt.json; complete byte counts and publisher SHA256s; scan sourceSnapshots reverified 7 October', summary='The two original databases contain 4,921,960 award-listing rows and 3,952,191 notice-listing rows. Listing/detail storage must not be added into a count of distinct procurements.', tier='analytic', limitations=['Hashes establish the retained bytes and lineage, not truth of every source field or completeness of procurement coverage.']),
]
localities = [dict(id='delhi', name='Delhi', stateCode='DL', kind='city', aliases=['New Delhi']), dict(id='mumbai', name='Mumbai', stateCode='MH', kind='city', aliases=['Bombay'])]
entities, relationships, records = [], [], []
counts = {stage: {row['cohort']: row for row in analysis['queries'][stage+'_cohort_counts']['rows']} for stage in ['notices', 'awards']}
bid_counts = {row['cohort']: row for row in analysis['queries']['award_bid_lexemes']['rows']}
repeats = {stage: {row['cohort']: row for row in analysis['queries'][stage+'_repeated_keys']['rows']} for stage in ['notices', 'awards']}
for cohort in analysis['cohorts']:
    key, city, topic = cohort['id'], cohort['cityAssociation'], cohort['topic']
    geo = [dict(scope='city' if city else 'national', stateCodes=[{'delhi':'DL','mumbai':'MH'}[city]] if city else [], localityIds=[city] if city else [], basis='state-association' if city else 'national-context', note='Buyer-name cohort associated with this city; source-record discovery, not a project pin, city expenditure allocation or entity address.' if city else 'National buyer-name cohort; a Delhi or Mumbai parent-office label does not place projects or expenditure in either city.', sourceIds=source_ids)]
    domains = ['public-funds', 'public-finance'] + (['security'] if topic in ['police','defence'] else []) + (['defence-trade'] if topic == 'defence' else [])
    dims = dict(domains=domains, layers=['procurement','review'], sourceIds=source_ids, route='/allegations', geography=geo, limitations=analysis['limits'])
    notice, award = counts['notices'].get(key, {}), counts['awards'].get(key, {})
    n, a = notice.get('listing_rows', 0), award.get('listing_rows', 0)
    dates = f"Date-eligible listing rows: {notice.get('date_eligible_rows',0):,} notices and {award.get('date_eligible_rows',0):,} awards (publication/AOC on or after 7 October 2011, no later than the row's capture and the June 2026 snapshot)."
    bids = bid_counts.get(key, {})
    bid_note = f"Among {bids.get('strict_bid_count_rows',0):,} eligible award listings with strictly parseable bid counts, {bids.get('one_bid_listing_rows',0):,} record one bid. These are listing rows, not deduplicated competitions; one bid is not proof of misconduct."
    repeated = f"Repeated nonblank portal/buyer/tender/reference keys: {repeats['notices'].get(key,{}).get('repeated_keys',0):,} notice keys and {repeats['awards'].get(key,{}).get('repeated_keys',0):,} award keys. Repeated captured records do not establish repeated paid work."
    gap = ' No matching notice or award buyer strings were found under this exact probe. Other aliases, state portals and missing coverage remain untested; this is not an absence-of-tenders claim.' if not n and not a else ' No cross-stage notice-to-award match, supplier identity or cash payment is established by these counts.'
    summary = f"The retained snapshot contains {n:,} notice-listing rows and {a:,} award-listing rows under this declared buyer-name probe. {dates} {bid_note} {repeated}{gap}"
    entities.append(dict(**dims, id=key, label=cohort['label'], type='source-cohort', resolved=True, identityBasis=f"Exactly the source rows matching the published buyerRegex {cohort['buyerRegex']!r}. This node is a declared dataset cohort, not a merged legal institution or company.", summary=summary))
    records.append(dict(**dims, id=key, title=cohort['label']+' · snapshot coverage', summary=summary, kind='procurement-context', tier='analytic', status='executed-source-cohort-not-allegation', statusAsOf='2026-10-07', fromDate='2026-06-26', toDate=None, dateBasis='Publisher snapshot date; historical row dates have their own eligibility audit. This is not a contract, payment or event date.', entityIds=[key], relationshipIds=[], period='June 2026 source snapshot; separately audited historical listing dates', response='Procurement methods, proprietary compatibility, emergency rules, market size, re-tendering and incomplete mirroring can explain apparent concentration or gaps. No authority or vendor is accused by this analysis.', alternativeExplanations=['Repeated source rows can arise from repeated captures or listings.', 'A one-bid procurement can have a lawful procurement-method or market explanation.', 'Missing buyer strings may reflect alternate naming or incomplete source coverage.'], falsifier='Rerun the published SQL on the same hash-verified inputs. A changed row, corrected field semantics, original award document or complete portal coverage can change the discovery result.', amounts=[]))
data = dict(sources=sources, entities=entities, relationships=relationships, records=records, localities=localities)
path = ROOT / 'research/raw/metro-spending/tender-scan.json'
path.write_text(json.dumps(data, indent=2, ensure_ascii=False)+'\n')
artifacts = []
for p in [FOLDER/'analysis.json', path, Path(__file__), ROOT/'scripts/metro-spending/tender-scan.py']:
    content = p.read_bytes()
    artifacts.append(dict(path=str(p.relative_to(ROOT)), bytes=len(content), sha256=hashlib.sha256(content).hexdigest()))
(FOLDER/'sha256-manifest.json').write_text(json.dumps({'executedAt':analysis['executedAt'], 'sourceSnapshots':analysis['sourceSnapshots'], 'artifacts':artifacts},indent=2)+'\n')
print(f'Built {len(records)} neutral procurement context records; zero generated allegations, payments or vendor identities.')
