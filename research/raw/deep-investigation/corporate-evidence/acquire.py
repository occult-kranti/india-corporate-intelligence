"""Fetch named original documents; archive bytes, extracts and SHA-256 receipts."""
import concurrent.futures,datetime,hashlib,json,re,urllib.request,urllib.error,subprocess
from pathlib import Path
from html import unescape
ROOT=Path(__file__).resolve().parent
SOURCES={
'air-india-award':'https://pib.gov.in/Pressreleaseshare.aspx?PRID=1762146',
'air-india-close':'https://www.pib.gov.in/PressReleasePage.aspx?PRID=1792950',
'air-budget-2022':'https://www.indiabudget.gov.in/budget2022-23/doc/eb/sbe8.pdf',
'airports-receipts-2022':'https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=1882715',
'mangaluru-concession':'https://www.civilaviation.gov.in/sites/default/files/2023-07/1%20Concession%20Agreement_compressed%20%283%29.pdf',
'parsa-sc-2019':'https://api.sci.gov.in/supremecourt/2018/13456/13456_2018_Judgement_27-May-2019.pdf',
'hzl-sc-2021':'https://api.sci.gov.in/supremecourt/2014/5445/5445_2014_34_1501_31393_Judgement_18-Nov-2021.pdf',
'vedanta-proposal-2023':'https://www.vedantalimited.com/public/uploads/15733/VEDL-Press-release_-Q3FY23_v13.pdf',
'ael-report-2026':'https://nsearchives.nseindia.com/annual_reports/AR_29299_ADANIENT_2025_2026_A_17942605_29052026223750.pdf',
'hzl-objection-2023':'https://www.thehindu.com/business/Industry/govt-to-explore-all-legal-avenues-to-stop-hzls-298-bn-buyout-of-vedantas-overseas-zinc-assets/article66533343.ece',
'hzl-lapse-2023':'https://www.business-standard.com/companies/news/hindustan-zinc-bids-to-buy-assets-from-vedanta-group-for-2-98-billion-123050200880_1.html',
}
def fetch(item):
 sid,url=item; rec={'sourceId':sid,'url':url,'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'not-fetched'}
 try:
  req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 (compatible; evidence-research/1.0)'})
  with urllib.request.urlopen(req,timeout=45) as r: b=r.read();rec.update(httpStatus=r.status,finalUrl=r.url,contentType=r.headers.get('Content-Type'))
  ext='pdf' if b[:4]==b'%PDF' else 'html';p=ROOT/f'{sid}.{ext}';p.write_bytes(b);rec.update(status='original-retrieved',file=p.name,bytes=len(b),sha256=hashlib.sha256(b).hexdigest())
  t=ROOT/f'{sid}.txt'
  if ext=='pdf':
   subprocess.run(['pdftotext','-layout',str(p),str(t)],check=True,timeout=50)
  else:
   s=b.decode('utf-8',errors='replace');s=re.sub(r'<(script|style)\b[^>]*>.*?</\1>','',s,flags=re.S|re.I);s=re.sub(r'<[^>]*>','\n',s);s=unescape(s);s='\n'.join(x.strip() for x in s.splitlines() if x.strip());t.write_text(s)
  rec.update(extract=t.name,extractBytes=t.stat().st_size,extractSha256=hashlib.sha256(t.read_bytes()).hexdigest())
 except Exception as e: rec.update(status='access-failed',error=str(e))
 return rec
if __name__=='__main__':
 with concurrent.futures.ThreadPoolExecutor(max_workers=7) as ex: rows=list(ex.map(fetch,SOURCES.items()))
 (ROOT/'manifest.json').write_text(json.dumps({'method':'Original HTTP bytes plus pdftotext -layout or HTML tag-stripped extract. Hash authenticates retained bytes, not factual truth. Source IDs correspond to corporate.json. Failed downloads do not support claims.','retrievedAt':datetime.date.today().isoformat(),'receipts':rows},indent=2)+'\n')
 for r in rows: print(r['sourceId'],r['status'],r.get('bytes'),r.get('error',''))
