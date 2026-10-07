#!/usr/bin/env python3
"""Reproduce the bounded GVPR donor-label join from pinned PDF mirrors.
Requires Python standard library and pdftotext. Original downloads remain in an
external evidence cache because redemption PDFs contain masked bank identifiers.
Only necessary bond serials, corporate donor label, party names and dates are
written into the public repository. Mirrors are not original-host retrievals.
"""
import urllib.request, pathlib, hashlib, json, subprocess, re, datetime, argparse
p=argparse.ArgumentParser();p.add_argument('--cache',default='/workspace/research-cache/money-trails-corporate');a=p.parse_args()
base=pathlib.Path(__file__).resolve().parent; cache=pathlib.Path(a.cache);cache.mkdir(parents=True,exist_ok=True)
commit='9ff9171f5f14dc3796bd0fbc9b950b8f7e035559'
metadata={}; texts={}
for name,filename in [('purchase','new-purchaser.pdf'),('redemption','new-receiver.pdf')]:
 url=f'https://raw.githubusercontent.com/anagri/electoral-bond-analysis/{commit}/{filename}'
 pdf=cache/f'eci-{name}-mirror.pdf'
 data=urllib.request.urlopen(url,timeout=45).read();assert data.startswith(b'%PDF');pdf.write_bytes(data)
 out=cache/f'eci-{name}-mirror.txt';subprocess.run(['pdftotext','-layout',str(pdf),str(out)],check=True)
 texts[name]=out.read_text();metadata[name]={'mirrorUrl':url,'originalPublisher':'State Bank of India, published by Election Commission of India','originalIndex':'https://www.eci.gov.in/disclosure-of-electoral-bonds','retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'pages':len(texts[name].split('\f'))-1,'retrievalStatus':'pinned-public-mirror; original-host index returned HTTP406','publicArtifact':'privacy-minimized selected rows; bank-account suffixes and operational teller identifiers omitted'}
selected=[]
for page,body in enumerate(texts['purchase'].split('\f'),1):
 for line in body.splitlines():
  if 'GVPR ENGINEERS LTD' not in line:continue
  m=re.match(r'\s*(\d+)\s+(\d+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(GVPR ENGINEERS LTD)\s+(\w+)\s+(\d+)\s+([\d,]+)\s+.*',line)
  assert m,line
  serial,urn,journal,date,expiry,donor,prefix,number,denom=m.groups()
  selected.append({'purchaseRow':int(serial),'purchasePdfPage':page,'purchasedOn':date,'expiresOn':expiry,'donorLabel':donor,'prefix':prefix,'bondNumber':number,'denominationINR':int(denom.replace(',',''))})
assert len(selected)==10
pairs={(r['prefix'],r['bondNumber']):r for r in selected};assert len(pairs)==10
matches=[]
for page,body in enumerate(texts['redemption'].split('\f'),1):
 for line in body.splitlines():
  m=re.match(r'\s*(\d+)\s+(\S+)\s+(.+?)\s+\*+\d+\s+(\w+)\s+(\d+)\s+([\d,]+)\s+.*',line)
  if not m:continue
  serial,date,party,prefix,number,denom=m.groups();key=(prefix,number)
  if key not in pairs:continue
  r=pairs[key].copy();assert r['denominationINR']==int(denom.replace(',',''));r.update(redemptionRow=int(serial),redemptionPdfPage=page,redeemedOn=date,partyLabel=party.strip());matches.append(r)
assert len(matches)==10 and len({(r['prefix'],r['bondNumber']) for r in matches})==10
summary={}
for r in matches:summary[r['partyLabel']]=summary.get(r['partyLabel'],0)+r['denominationINR']
assert summary=={'BHARATIYA JANATA PARTY':50000000,'PRESIDENT, ALL INDIA CONGRESS COMMITTEE':50000000}
result={'method':'Exact prefix plus bond number one-to-one join; denomination agreement required. No amount/date-only joins; no spelling-based entity consolidation. Entire purchase PDF scanned for exact donor label.','companyIdentityStatus':'GVPR ENGINEERS LTD is the disclosed donor label, not a CIN-verified identification of the CCTV legal contractor. That bridge is held.','sources':metadata,'selectedBondCount':10,'partyTotalsINR':summary,'rows':matches,'limitations':['Original ECI host was unavailable (406); original-form PDFs were obtained from a pinned public GitHub mirror. No claim of original-host byte identity is made.','The ECI release does not expose purchaser KYC/CIN or the funding bank-account ledger. Donation does not identify the original revenue stream or establish an exchange for a contract.']}
(base/'bond-join.json').write_text(json.dumps(result,indent=2)+'\n')
for name in texts:
 (base/f'eci-{name}-selected.json').write_text(json.dumps({'source':metadata[name],'rows':[{k:v for k,v in r.items() if (name=='purchase' and k not in ['redemptionRow','redemptionPdfPage','redeemedOn','partyLabel']) or (name=='redemption' and k not in ['purchaseRow','purchasePdfPage','purchasedOn','expiresOn','donorLabel'])} for r in matches]},indent=2)+'\n')
print(json.dumps({'selectedBondCount':len(matches),'partyTotalsINR':summary,'mirrorHashes':{k:v['sha256'] for k,v in metadata.items()}}))
