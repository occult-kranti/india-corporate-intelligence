#!/usr/bin/env python3
"""Checksum-bound extraction of the PAC 50/2026 offset tables; no inference of loss.

python research/investigation-program/tools/extract_justice_procurement.py \
  --pdf /tmp/jp-pac50-2026.pdf --output /tmp/jp-offsets-replayed.json
Without --pdf, obtains the publicly available original from Sansad.
Requires pypdf. Numeric facts only; source PDF is not redistributed.
"""
import argparse
from decimal import Decimal, ROUND_HALF_UP
import hashlib
import io
import json
from pathlib import Path
import re
import urllib.request
from pypdf import PdfReader

URL = 'https://sansad.in/getFile/app/lsscommittee/Public%20Accounts/18_Public_Accounts_50.pdf?source=app'
SHA256 = '9023d742c0b30dd2c59aa2227ce265e4918ba0065729163993ecb9f238bedfe8'


def extract(blob):
    digest = hashlib.sha256(blob).hexdigest()
    if digest != SHA256:
        raise ValueError(f'Source changed: expected {SHA256}, obtained {digest}; inspect before updating')
    reader = PdfReader(io.BytesIO(blob))
    if len(reader.pages) != 45:
        raise ValueError('Unexpected page count')
    pages = {n: re.sub(r'\s+', ' ', reader.pages[n-1].extract_text()) for n in [13,14,15,16]}
    rows = []

    def number(id, pattern, page, section, label, unit='USD million', stage='reported', as_of=None, more_pages=()):
        text = ' '.join(pages[p] for p in (page, *more_pages))
        matches = re.findall(pattern, text)
        if len(matches) != 1:
            raise ValueError(f'{id}: expected exactly one anchor match, got {len(matches)}')
        exact = matches[0].replace(',', '')
        value = Decimal(exact)
        row = dict(id=id, label=label, exactValue=exact, value=float(value), unit=unit,
                   stage=stage, pdfPage=page, printedPage=page-8, section=section)
        if more_pages: row['additionalPdfPages'] = list(more_pages)
        if as_of: row['asOf'] = as_of
        rows.append(row)
        return value

    total_count = number('contracts-total',r'Total Offset Contracts\s*[–-]\s*(\d+)',13,'15','All contracts','contracts')
    closed = number('contracts-closed',r'Offset Contracts completed and closed\s*[–-]\s*(\d+)',13,'15','Closed contracts','contracts')
    final_audit = number('contracts-final-audit',r'Offset Contracts completed and under final audit\s*[–-]\s*(\d+)',13,'15','Final-audit contracts','contracts')
    ongoing_count = number('contracts-ongoing',r'Ongoing Offset Contracts\s*[–-]\s*(\d+)',13,'15','Ongoing contracts','contracts')
    total_dec = number('obligations-dec',r'Total Offset Obligation USD ([\d,]+\.\d+) Million',13,'15','Portfolio obligation','USD million','contracted obligation','2025-12-08')
    due_dec = number('due-dec',r'Obligation Due till 08th Dec, 2025 USD ([\d,]+\.\d+) Million',13,'15','Due by December date','USD million','obligation due','2025-12-08')
    claim_dec = number('claims-dec',r'Offset Discharge Claimed till 08th Dec, 2025 USD ([\d,]+\.\d+) Million',14,'15','December claims','USD million','vendor claims submitted','2025-12-08')
    closed_amount = number('closed-obligation',r'contracted offset obligation amounting to USD ([\d,]+\.\d+) Million in 20',15,'18','Closed obligation','USD million','reported fulfilled')
    audit_amount = number('final-audit-submitted',r'USD ([\d,]+\.\d+) Million in 10 offset contracts',16,'18','Final-audit amount','USD million','vendor claims submitted, audit outstanding')
    ongoing = number('ongoing-obligations',r'offset obligations of USD ([\d,]+\.\d+) Million in 26',16,'18','Ongoing obligation','USD million','contracted obligation')
    ongoing_claims = number('ongoing-submitted',r'ongoing offset contracts, obligation of USD ([\d,]+\.\d+) Million is already',16,'18','Ongoing submitted amount','USD million','vendor claims submitted')
    total_jan = number('obligations-jan',r'Total Offset Obligation ([\d,]+\.\d+)',16,'21','January portfolio obligation','USD million','contracted obligation','2026-01-14')
    penalty = number('penalty-imposed',r'Total penalty imposed ([\d,]+\.\d+)',16,'21','Penalty','USD million','imposed, recovery not supplied','2026-01-14')
    due_jan = number('due-jan',r'Total Obligation Due till 14th Jan, 2026 ([\d,]+\.\d+)',16,'21','Due by January date','USD million','obligation due','2026-01-14')
    claim_jan = number('claims-jan',r'Total Offset Discharge Claimed till 14th Jan, 2026 ([\d,]+\.\d+)',16,'21','January claims','USD million','vendor claims submitted','2026-01-14')
    disposed = number('claims-disposed-jan',r'Total Offset Claims Disposed off \(Credited \+ Rejected\) till 14th Jan, 2026 ([\d,]+\.\d+)',16,'21','January disposed claims','USD million','credited plus rejected, not acceptance alone','2026-01-14')
    def rounded(v): return str(v.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))
    calculations = [
        {'id':'contract-count-reconciliation','formula':'20 + 10 + 26','exactResult':str(closed+final_audit+ongoing_count),'unit':'contracts','matchesReportedTotal':closed+final_audit+ongoing_count==total_count},
        {'id':'ongoing-unsubmitted','formula':'9915.38 - 5467.82','exactResult':str(ongoing-ongoing_claims),'unit':'USD million','meaning':'Unsubmitted share of ongoing obligations; not all overdue.'},
        {'id':'ongoing-unsubmitted-percent','formula':'100 * (9915.38 - 5467.82) / 9915.38','roundedResult':rounded(100*(ongoing-ongoing_claims)/ongoing),'unit':'percent','meaning':'Denominator is total obligations of 26 ongoing contracts, not the full portfolio or amounts due.'},
        {'id':'claimed-series-change','formula':'9237.64 - 9452.19','exactResult':str(claim_jan-claim_dec),'unit':'USD million','meaning':'Difference between two published snapshots; definitions/revisions need reconciliation; not a cash movement.'},
        {'id':'component-bridge','formula':'13215.00 - (2438.32 + 632.08 + 9915.38)','exactResult':str(total_jan-closed_amount-audit_amount-ongoing),'unit':'USD million','meaning':'Residual from mixing reported status figures; not a proven accounting discrepancy or loss. Para18 snapshot date is unspecified.'},
        {'id':'claimed-minus-disposed','formula':'9237.64 - 7242.55','exactResult':str(claim_jan-disposed),'unit':'USD million','meaning':'Conditional processing residual only if definitions and cohorts coincide; no estimate of fraud or rejected value.'},
        {'id':'jan-claimed-over-due-percent','formula':'100 * 9237.64 / 10022.93','roundedResult':rounded(100*claim_jan/due_jan),'unit':'percent','meaning':'Submission ratio; not accepted delivery or cash receipt.'}
    ]
    return {'schemaVersion':1,'sourceId':'jp-pac-offsets-2026','sourceUrl':URL,'sourceSha256':digest,'sourceBytes':len(blob),'sourcePages':45,'accessedAt':'2026-10-14','method':'pypdf text extraction with unique numeric anchors; selected original pages visually checked separately','rows':rows,'calculations':calculations,'limitations':['These are Ministry statements reproduced by PAC, not transaction-level reconciled accounts.','December and January tables are retained separately.','Paragraph18 gives no explicit snapshot date.','Claims, acceptance, penalties imposed and recoveries are different stages.','The script fails closed if source bytes change.']}

if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--pdf',type=Path)
    parser.add_argument('--output',type=Path)
    args=parser.parse_args()
    blob=args.pdf.read_bytes() if args.pdf else urllib.request.urlopen(URL,timeout=45).read()
    result=extract(blob)
    output=json.dumps(result,indent=2,ensure_ascii=False)+'\n'
    if args.output:
        args.output.parent.mkdir(parents=True,exist_ok=True)
        args.output.write_text(output)
        print(f'Extracted {len(result["rows"])} numeric rows; {len(result["calculations"])} calculations -> {args.output}')
    else: print(output,end='')
