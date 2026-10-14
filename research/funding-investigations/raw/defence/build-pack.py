"""Assemble the defence stream from inspected documents; no model-generated facts."""
import json, hashlib, re
from pathlib import Path
from decimal import Decimal

ROOT = Path(__file__).resolve().parents[4]
RAW = ROOT / 'research/funding-investigations/raw/defence'
captures = {x['key']: x for x in json.loads((RAW/'captures.json').read_text()) if 'sha256' in x}
prefix = 'fi:defence:'
def ids(kind, names): return [prefix+kind+':'+n for n in names]
sources=[]; entities=[]; edges=[]; cases=[]
def source(key,title,publisher,date,kind,locator,excerpt,limitations=None,inspection='selected-pages',url=None,family=None):
    c=captures[key]
    sources.append(dict(id=prefix+'src:'+key,title=title,publisher=publisher,url=url or c['url'],publishedAt=date,accessedAt=c['accessedAt'],kind=kind,sourceFamily=family or key,inspection=inspection,locator=locator,excerpt=excerpt,limitations=limitations or [],capturePath=c['capturePath'],sha256=c['sha256']))
def entity(key,label,kind,src,basis=None):
    entities.append(dict(id=prefix+'entity:'+key,label=label,kind=kind,identityBasis=basis or 'Exact named institutional identity in the cited document; no namesake or cross-track merge.',sourceIds=ids('src',src)))
def money(v,c='INR',u='crore',period=None,basis='budget estimate',overlap=None):
    return dict(value=v,currency=c,unit=u,period=period,basis=basis,overlapGroup=overlap)
def edge(key,a,b,relation,label,status,stage,src,amount=None,date=None,response='No separate response was obtained; see the cited document and case limits.',limits=None):
    edges.append(dict(id=prefix+'edge:'+key,**{'from':prefix+'entity:'+a,'to':prefix+'entity:'+b},relation=relation,label=label,status=status,stage=stage,date=date,amount=amount,sourceIds=ids('src',src),response=response,limits=limits or ['This edge establishes only its stated financial or legal stage.']))
def claim(key,text,status,src,response,alternative,falsifier,missing):
    return dict(id=prefix+'claim:'+key,text=text,status=status,sourceIds=ids('src',src),response=response,alternative=alternative,falsifier=falsifier,missingRecords=missing)
def record(r,h,p):return dict(record=r,holder=h,purpose=p)
def geo(label,state):return dict(label=label,stateCode=state,basis='Administrative or audited-facility association, not a payment route, deployment coordinate or incident location.')
def case(key,title,question,period,status,finding,geography,ee,ss,claims,know,unknown,nexts,limits,decision=None):
    es=[e for e in edges if e['id'] in ids('edge',ee)]
    o=dict(id=prefix+'case:'+key,title=title,question=question,sector='defence',period=period,status=status,finding=finding,geography=geography,entityIds=sorted({v for e in es for v in (e['from'],e['to'])}),edgeIds=ids('edge',ee),sourceIds=ids('src',ss),claims=claims,whatWeKnow=know,whatWeDoNotKnow=unknown,nextRecords=nexts,limits=limits)
    if decision:o['decisionAnalysis']=decision
    cases.append(o)

source('budget-capital-2026','FY2026–27 Demand 21: Capital Outlay on Defence Services','Ministry of Finance','2026-02-01','official','Printed pp.78–79, net total and item 3 Research and Development','Paraphrase: FY2026–27 net capital BE is ₹219,306.47 crore; Research and Development is ₹17,250.25 crore. FY2025–26 BE is ₹180,000 crore.', ['Allocation is not a contract, release, supplier receipt or loss.'])
source('budget-revenue-2026','FY2026–27 Demand 20: Defence Services (Revenue)','Ministry of Finance','2026-02-01','official','Printed pp.74–77; gross/recoveries/receipts/net and Developmental Heads','Paraphrase: ₹373,255.44 crore gross, ₹715.75 crore recoveries and ₹7,060.71 crore receipts give ₹365,478.98 crore net. Developmental heads: Army ₹243,238.98 crore, Navy ₹46,800 crore, Air Force ₹63,150 crore, Coordination & Services ₹440 crore and R&D ₹11,850 crore.', ['Service-head allocations include multiple purposes; no vendor attribution.'])
source('budget-civil-2026','FY2026–27 Demand 19: Ministry of Defence (Civil)','Ministry of Finance','2026-02-01','official','Printed pp.70–73, opening total and organisation rows','Paraphrase: ₹63,814.61 crore gross less ₹120 crore recoveries and ₹35,140 crore receipts gives ₹28,554.61 crore net. It separately lists Coast Guard, Defence Estates and Border Roads functions.', ['The large receipts deduction must not be presented as missing funds.'])
source('budget-pensions-2026','FY2026–27 Demand 22: Defence Pensions','Ministry of Finance','2026-02-01','official','Printed p.80, total and item 2','Paraphrase: ₹179,338.22 crore gross less ₹8,000 crore recovery from Public Account gives ₹171,338.22 crore net.', ['Public Account recovery is an accounting deduction, not a corruption recovery.'])
source('budget-pib-2026','Ministry of Defence allocation in Union Budget 2026–27','Ministry of Defence / PIB','2026-02-01','official','Capital Head, Aatmanirbharta and R&D sections','Paraphrase: PIB describes ₹7.85 lakh crore total, ₹1.85 lakh crore acquisition earmark and ₹1.39 lakh crore domestic procurement earmark. Its detailed capital paragraph mistakenly prints 2,19,306.47 lakh crore; Demand 21 states crore.', ['Same ministry communication as the PIB backgrounder; not independent corroboration.','The detailed capital-head unit is inconsistent with the original demand and the release headline.'],inspection='web-text')
source('offsets-defence3','Standing Committee on Defence Third Report, 18th Lok Sabha','Lok Sabha Secretariat','2024-12-17','official','Printed pp.26–31, paragraphs 2.18–2.20','Paraphrase: Ministry reports 57 offset contracts; US$8.81bn obligations due at 11 October 2024, US$8.44bn claims submitted and US$6.71bn disposed. Penalty/interim penalty of US$88.60m imposed in 23 contracts. It explains late IOP disclosure, amendment difficulties and rephasing rules.', ['Disposed does not mean accepted; imposed does not mean collected.','These are aggregate ministry submissions, not individually audited cash receipts.'])
source('offsets-2016-parliament','Offset Obligations for Defence Contracts: Lok Sabha written answer','Ministry of Defence / PIB','2016-05-06','official','Three numbered extension examples and preceding obligations paragraph','Paraphrase: Ministry reports recovery of €2.07m penalty for Fleet Tanker offsets and US$80,500 for HAROP-UAV offsets, alongside extensions. Vendors reported US$1.78bn discharge against US$2.23bn due by end-2015, subject to audit.', ['The answer does not identify remitting banks, actual payment dates or legal supplier names in these examples.'],inspection='web-text')
source('offsets-prs-2026','Management of Defence Offsets: PAC report summary','PRS Legislative Research',None,'reporting','Reducing deficiencies, rationalisation and penalties sections','Paraphrase: PRS says PAC presented its report on 22 July 2026, recorded about 45% unfulfilled at 18 December 2025 and recommended changes including greater FDI/technology transfer.', ['Full PAC report not retrieved; original-file candidate returned HTTP500.','Do not derive current vendor-specific debts or compare changing denominators from this summary.','Recommendations are not enacted law.'],inspection='secondary-only')
source('cag-agusta-2013-cdn','CAG Report 10 of 2013: Acquisition of helicopters for VVIPs','Comptroller and Auditor General of India',None,'audit','Printed p.4; pp.27–31 paragraph 14; Ministry responses within paragraph14','Paraphrase: Prime contract €556,262,026 and separate offset obligation €166,879,000. CAG found IDS Infotech work was completed before February2010 yet included for 2011–14; vendor requested its deletion. Civil infrastructure via Taneja was inadmissible under the applicable DPP; Ministry cited a proposed amendment.', ['Historic 2010 award is outside the15-year window and retained as explicit context to 2011–13 audit and later proceedings.','Audit findings are not criminal convictions.','Direct CAG host returned503; exact PDF bytes captured from its public CDN.'],url='https://cag.gov.in/webroot/uploads/download_audit_report/2013/Union_Defence_Compliance_Report_10_2013.pdf')
source('michel-2025-march-mirror','Christian James Michel v Directorate of Enforcement, Bail Application1337/2024','Delhi High Court; judgment PDF hosted by Bar & Bench','2025-03-04','court','Paragraph7 pp.4–5; paragraphs9–10 pp.6–7; paragraphs32–37 pp.19–22','Paraphrase: Court recites prosecution allegations including €6.05m under a Global Services FZE agreement and a €18.2m WG-30 purchase order; counsel denies a specific role/material link. Bail granted for prolonged custody and trial delay.', ['Agency allegations recited in a bail judgment are not trial findings.','Court original March PDF not retrieved; published judgment mirror captured.','A €42m umbrella allegation is not additive to its described component transactions.'])
source('michel-2025-may','Christian James Michel bail-condition modification','Delhi High Court','2025-05-22','court','Paragraphs21 and28–31','Paraphrase: Court relaxed immediate passport production and changed surety terms, explaining the foreign national had no local person to stand surety.', ['Bail conditions and their modification do not establish guilt or exoneration.'])
source('michel-2026','Christian Michel James v Union of India, W.P.(CRL)3868/2025','Delhi High Court','2026-04-08','court','Paragraphs9,13–14 and34–38','Paraphrase: Court records the alleged Global Services FZE service agreement; says prior bail conditions had not been complied with; rejects the extradition/connected-offence and statutory-release challenge.', ['Procedural decision, not conviction.','Do not describe April detention as independently verified October2026 custody status.'])
source('leonardo-half2019','Half-Year Financial Report at30June2019','Leonardo S.p.A.','2019-08-02','filing','Printed pp.40–41 criminal proceedings; pp.44–45 civil/arbitration proceedings','Paraphrase: Company reports Italy Supreme Court rejected appeals against former executives’ acquittal on22May2019. It records Indian proceedings continuing; May2014 injunction relaxation on ~€28m performance bond and up to~€200m advance guarantees, with~€50m protected for accepted helicopters; remaining balance/compensation depended on the overall lawsuit.', ['Issuer account of litigation; Italian original rulings and bank settlement advices not inspected.','Permission to enforce a guarantee is not itself proof of cash recovery.','Filing reflects June/July2019 state, not a final2026 reconciliation.'])
source('reuters-haschke-mirror','Italy court acquits consultant in India helicopter case','Reuters; republished by Abogado','2025-07-01','reporting','Article body paragraphs1–3 and7–9','Paraphrase: Reuters reports Brescia court revoked Haschke’s old plea bargain and acquitted him, based on a ruling Reuters reviewed. Haschke said the earlier plea was a technical decision, not an admission.', ['Italian original judgment not retrieved; Reuters report and this mirror are one source family.','The outcome concerns Haschke in Italy; it does not resolve Michel’s Indian prosecution.'],inspection='web-text',family='reuters-haschke-2025-07-01')
source('agusta-payment-report-2016','Explaining the VVIP chopper row that has rocked Parliament','The Indian Express','2016-04-28','reporting','How did the authorities in India react?; Did India recover the money?','Paraphrase: The newspaper reports ₹1,620 crore paid and guarantees encashed of ₹250 crore in India plus ₹1,818 crore in Italy, reported total ₹2,068 crore.', ['Secondary account, not treasury/bank vouchers.','Rupee conversions and guarantee scopes differ from euro contract/collateral amounts; no net profit/loss computed.','Older criminal-outcome passages are superseded by the separately retained2019 and2025 acquittal evidence.'],inspection='web-text')
source('agusta-facts-2013','Acquisition of AW-101 Choppers for IAF: The Facts','Ministry of Defence / PIB','2013-02-14','official','Numbered paragraphs14–19,34–35','Paraphrase: Ministry defended procurement as following procedure and described contract Articles22–23 and the integrity pact, permitting cancellation/recovery for prohibited influence or agents.', ['A ministry response, not independent adjudication.','Later CAG criticism and legal outcomes must be read alongside it.'],inspection='web-text')
source('agusta-guarantee-company-2014','Company statement on Milan interim collateral ruling','Finmeccanica / Leonardo','2014-03-17','filing','First to fourth substantive paragraphs','Paraphrase: Company says March2014 interim ruling barred more than€278m collateral, while roughly€28m warranty bonds had already been paid out by SBI and Deutsche Bank AG; it disputed India’s grounds.', ['Interim order subsequently modified in May2014, as disclosed in the2019 filing.','Banks not assigned individual shares of the combined reported payment.'],inspection='web-text')
source('michel-july2026','Supreme Court grants Centre three weeks on Michel plea','India Legal','2026-07-24','reporting','Opening paragraphs and description of April8 judgment under appeal','Paraphrase: Reports Supreme Court sought Centre’s response on Michel’s challenge to continued detention and the April8 ruling.', ['Secondary procedural update; July24 original Supreme Court order not retrieved.','Later October6 listing surfaced in search, but its order/outcome remains unverified.'],inspection='secondary-only')
source('cag-dpsu-2025-brief-cdn','CAG Report34 of2025: official defence PSU audit brief','Comptroller and Auditor General of India','2025-12-18','audit','PDF pp.2–3 paragraphs2.2–2.3; pp.1–2 paragraph2.1; pp.4–5 paragraphs3.1–3.4','Paraphrase: HAL cancelled a low-reserve land monetisation after audit and proposed₹97.80cr instead of₹52.30cr. Ordnance Factory Hospitals expenditure2020–24 was₹598.84cr, >82% pay; transfer/regulatory decisions were pending. Ministry June2025 reply says new DPSUs should focus on production.', ['Official five-page summary, not full audit report or underlying working papers.','Underlying title says period ended March2023; brief incorporates follow-up throughJune2025.','CAG host503; publicCDN bytes retained.','No unnamed valuer or customer is identified by inference.'],inspection='full-document',url='https://cag.gov.in/uploads/PressRelease/PR-Press-Brief-ON-REPORT-NO-34-Eng-06944f1d810f985-48377902.pdf')

for k,l,t,ss in [
('mod','Ministry of Defence','institution',['budget-pib-2026']),('capital','Capital Outlay on Defence Services — Demand21','programme',['budget-capital-2026']),('revenue','Defence Services Revenue — Demand20','programme',['budget-revenue-2026']),('civil','Defence Civil — Demand19','programme',['budget-civil-2026']),('pensions','Defence Pensions — Demand22','programme',['budget-pensions-2026']),('army','Indian Army','institution',['budget-revenue-2026']),('navy','Indian Navy','institution',['budget-revenue-2026']),('iaf','Indian Air Force','institution',['budget-revenue-2026','cag-agusta-2013-cdn']),('drdo','Defence Research and Development Organisation','institution',['budget-pib-2026']),('doo','Directorate of Ordnance (Coordination & Services)','institution',['budget-revenue-2026','cag-dpsu-2025-brief-cdn']),('offsets','Defence offset programme — aggregate, not a company','programme',['offsets-defence3']),('fleet-offset','Fleet Tanker offset contract (supplier not named in2016 answer)','programme',['offsets-2016-parliament']),('harop-offset','HAROP-UAV offset contract (supplier not named in2016 answer)','programme',['offsets-2016-parliament']),('pac','Public Accounts Committee','institution',['offsets-prs-2026']),('awil','AgustaWestland International Limited, UK','company',['cag-agusta-2013-cdn']),('aw-holdings','AgustaWestland Holdings Ltd','company',['michel-2025-march-mirror']),('whl','Westland Helicopters Ltd','company',['michel-2025-march-mirror']),('global-services','Global Services FZE, Dubai','company',['michel-2025-march-mirror']),('global-trade','Global Trade & Commerce Ltd, London','company',['michel-2025-march-mirror']),('michel','Christian James Michel / Christian Michel James','person',['michel-2025-march-mirror','michel-2026']),('pawan-hans','Pawan Hans Ltd','company',['michel-2025-march-mirror']),('ids','IDS Infotech','company',['cag-agusta-2013-cdn']),('taneja','Taneja Aerospace and Aviation Company (audit wording)','company',['cag-agusta-2013-cdn']),('ed','Directorate of Enforcement','institution',['michel-2025-march-mirror']),('delhi-hc','Delhi High Court','institution',['michel-2026']),('leonardo','Leonardo S.p.A. / former Finmeccanica','company',['leonardo-half2019']),('haschke','Guido Ralph Haschke','person',['reuters-haschke-mirror']),('brescia','Court of Appeal of Brescia','institution',['reuters-haschke-mirror']),('sbi','State Bank of India','company',['agusta-guarantee-company-2014']),('db-ag','Deutsche Bank AG','company',['agusta-guarantee-company-2014']),('cag','Comptroller and Auditor General of India','institution',['cag-dpsu-2025-brief-cdn']),('hal','Hindustan Aeronautics Limited','company',['cag-dpsu-2025-brief-cdn']),('hal-fmd','HAL Facility Management Division','institution',['cag-dpsu-2025-brief-cdn']),('okalipuram','Okalipuram land monetisation process —2.925acres','programme',['cag-dpsu-2025-brief-cdn']),('ddp','Department of Defence Production','institution',['cag-dpsu-2025-brief-cdn']),('ofh','Ordnance Factory Hospitals network','programme',['cag-dpsu-2025-brief-cdn'])]:entity(k,l,t,ss)

for k,v,s in [('capital',219306.47,'budget-capital-2026'),('revenue',365478.98,'budget-revenue-2026'),('civil',28554.61,'budget-civil-2026'),('pensions',171338.22,'budget-pensions-2026')]:edge('budget-'+k,'mod',k,'allocates','FY2026–27 net Budget Estimate','documented','budget',[s],money(v,period='FY2026-27',overlap='defence-net-demands2026'),date='2026-02-01',limits=['Net BE, not actual spending. Demand children overlap this parent allocation.'])
for k,v in [('army',243238.98),('navy',46800),('iaf',63150),('drdo',11850),('doo',440)]:edge('revenue-'+k,'revenue',k,'budget-head','Revenue allocation to named developmental head','documented','budget',['budget-revenue-2026'],money(v,period='FY2026-27',overlap='defence-demand20-children'),date='2026-02-01',limits=['Contained within Demand20; not additional to it.'])
edge('capital-drdo','capital','drdo','budget-head','Research and Development capital allocation','documented','budget',['budget-capital-2026'],money(17250.25,period='FY2026-27',overlap='defence-demand21-children'),date='2026-02-01',limits=['Contained within Demand21; do not add to total Ministry allocation again.'])
edge('offset-due','offsets','mod','contractual-obligation','Aggregate offset obligations due as at11October2024','documented','award',['offsets-defence3'],money(8.81,'USD','billion','as of2024-10-11','Aggregate contracted obligations due','offsets2024'),limits=['Industrial-benefit obligation, not an amount paid to the Ministry.'])
edge('offset-claimed','offsets','mod','vendor-claim','Vendor-submitted offset discharge claims','documented','oversight',['offsets-defence3'],money(8.44,'USD','billion','as of2024-10-11','Claims submitted, not validated receipts','offsets2024'))
edge('offset-disposed','mod','offsets','claim-disposal','Claims disposed; acceptance/rejection split unavailable','documented','oversight',['offsets-defence3'],money(6.71,'USD','billion','reported December2024','Claims disposed, not necessarily accepted','offsets2024'))
edge('offset-penalty','mod','offsets','penalty-imposition','Penalty/interim penalty imposed in23 contracts','documented','oversight',['offsets-defence3'],money(88.60,'USD','million','reported December2024','Penalty imposed; recovery not stated','offset-penalty2024'))
edge('fleet-recovery','fleet-offset','mod','penalty-recovered','Ministry reported recovered fleet-tanker offset penalty','documented','recovery',['offsets-2016-parliament'],money(2.07,'EUR','million','reported2016-05-06','Reported recovery; remitter not named'),response='The answer says the contract was extended to facilitate outstanding offset implementation.',limits=['Exact payer, bank voucher and payment date absent. Not joined to a named foreign company.'])
edge('harop-recovery','harop-offset','mod','penalty-recovered','Ministry reported recovered HAROP offset penalty','documented','recovery',['offsets-2016-parliament'],money(80500,'USD','dollars','reported2016-05-06','Reported recovery; remitter not named'),response='The answer says the contract was extended to facilitate outstanding offset implementation.',limits=['Exact payer, bank voucher and payment date absent.'])
edge('pac-offset','pac','offsets','recommendation','PRS reports2026 PAC changes proposed, not enacted','documented','oversight',['offsets-prs-2026'],date='2026-07-22',limits=['Secondary-only review; fullPAC record still requested.'])
edge('aw-award','mod','awil','procurement-contract','Prime AW101 contract; historic2010 context','documented','award',['cag-agusta-2013-cdn'],money(556262026,'EUR','euros','2010-02-08','Prime contract face value','agusta-prime'),date='2010-02-08')
edge('aw-payment','mod','awil','reported-payment','Indian Express reports ₹1,620 crore previously paid','documented','payment',['agusta-payment-report-2016'],money(1620,period='paid before February2013 suspension; reported2016',basis='Secondary report of actual payments',overlap='agusta-prime'),limits=['Secondary reported cash stage; no underlying treasury voucher inspected.','Not an allegation that the entire payment was diverted.'])
edge('aw-offset','awil','offsets','offset-obligation','Separate AW101 offset obligation','documented','award',['cag-agusta-2013-cdn'],money(166879000,'EUR','euros','February2010','Offset obligation, not money paid to Government','agusta-offset'),date='2010-02-08')
edge('aw-ids','awil','ids','offset-programme-audited','CAG: pre-contract work included in offset programme','audit-finding','oversight',['cag-agusta-2013-cdn'],response='Ministry said credit applied only after effective contract date and vendor proposed deleting/combining programmes.',limits=['No corresponding accepted credit or money receipt is established.','Audit finding does not establish that this entity laundered money.'])
edge('aw-taneja','awil','taneja','offset-programme-audited','CAG: civil-infrastructure component was inadmissible','audit-finding','oversight',['cag-agusta-2013-cdn'],response='AirHQ said inadmissible claims would be rejected; Ministry cited vendor proposal to remove civil infrastructure.',limits=['Amendment acceptance was not established by the2013 report; no payment amount attributed.'])
edge('aw-gsf','aw-holdings','global-services','prosecution-alleges-payment','Agency allegation recited by court: €6.05m service-agreement payments','alleged','alleged-transfer',['michel-2025-march-mirror'],money(6.05,'EUR','million','April2010–December2011','Alleged payment under agreement; not trial-proven','michel-umbrella42m'),response='Michel’s counsel denied a material link/specific role; court granted bail on prolonged custody and delay.',limits=['Most payment period predates the15-year window; explicitly retained context.','Bank statements and ultimate recipient ledger not inspected.','Do not add to the €42m umbrella allegation.'])
edge('whl-gtc','whl','global-trade','prosecution-alleges-purchase-order','Alleged €18.2m WG-30 buyback purchase order','alleged','award',['michel-2025-march-mirror'],money(18.2,'EUR','million','2010-05-26','Alleged order value, not established payment','michel-umbrella42m'),date='2010-05-26',response='Defence denied material connection; prosecution alleged no engagement with PawanHans.',limits=['Purchase-order face value; no paid amount inferred.','Historic2010 context.'])
edge('gtc-pawan','global-trade','pawan-hans','purported-purchase-not-established','Purported helicopter source; investigators alleged no contact','unresolved','context',['michel-2025-march-mirror'],response='A complete vendor/PawanHans correspondence and performance ledger has not been inspected.',limits=['This is an expressly unresolved claimed transaction, not an established sale or payment.'])
edge('michel-gsf','michel','global-services','ownership-as-recited','Prosecution identifies Michel’s firm, as recited in the bail judgment','alleged','ownership',['michel-2025-march-mirror'],limits=['Prosecution-recited identity, not an independent corporate registry audit or a judicial ownership finding.'])
edge('michel-gtc','michel','global-trade','ownership-as-recited','Prosecution identifies Michel’s firm, as recited in the bail judgment','alleged','ownership',['michel-2025-march-mirror'],limits=['Prosecution-recited identity, not a substitute for ownership-validity filings or a judicial ownership finding.'])
edge('ed-michel','ed','michel','prosecution','ED complaint and allegation; no conviction established here','alleged','oversight',['michel-2025-march-mirror','michel-2026'],response='Counsel disputed evidence and sought release for prolonged pretrial detention.',limits=['Charge/complaint is not proof.'])
edge('hc-michel','delhi-hc','michel','bail-and-extradition-review','Bail2025; connected-offence/release challenge dismissed April2026','documented','oversight',['michel-2025-march-mirror','michel-2025-may','michel-2026'],date='2026-04-08',response='July2026 secondary report records further SupremeCourt challenge.',limits=['No October2026 detention or merits outcome is inferred.'])
edge('brescia-haschke','brescia','haschke','reported-acquittal','Reuters: acquittal revoked earlier plea bargain','documented','oversight',['reuters-haschke-mirror'],date='2025-06-30',response='Haschke said old plea was a technical decision, not an admission.',limits=['Outcome is reported by Reuters; Italian original judgment not inspected.','Do not transfer outcome automatically to different defendants/jurisdictions.'])
edge('leonardo-awil','leonardo','awil','group-proceedings-disclosure','Issuer discloses AWIL litigation and former executives’ acquittal','documented','context',['leonardo-half2019'],limits=['No group-wide liability or net settlement inferred.'])
edge('sbi-guarantee','sbi','mod','reported-guarantee-payment','Company reports part of combined~€28m bonds paid; bank split unknown','documented','recovery',['agusta-guarantee-company-2014'],limits=['Amount deliberately null: combined bank figure cannot be allocated to SBI.'])
edge('db-guarantee','db-ag','mod','reported-guarantee-payment','Company reports part of combined~€28m bonds paid; bank split unknown','documented','recovery',['agusta-guarantee-company-2014'],limits=['Amount deliberately null: combined bank figure cannot be allocated to DeutscheBankAG.'])
edge('hal-fmd','hal','hal-fmd','division','Facility Management Division manages audited parcel','documented','office',['cag-dpsu-2025-brief-cdn'])
edge('hal-reserve-low','hal-fmd','okalipuram','reserve-price','Audited original reserve ₹52.30crore; process cancelled','audit-finding','approval',['cag-dpsu-2025-brief-cdn'],money(52.30,period='audited process reported2025-12-18',basis='Original reserve price, not sale consideration',overlap='okalipuram-reserves'),response='HAL cancelled the ongoing process after audit.',limits=['No buyer, sale, receipt or realised loss identified.'])
edge('hal-reserve-new','hal','okalipuram','replacement-reserve','Fresh monetisation proposed at ₹97.80crore','documented','approval',['cag-dpsu-2025-brief-cdn'],money(97.80,period='reported2025-12-18',basis='Replacement reserve price, not completed sale',overlap='okalipuram-reserves'),response='Cancellation and revaluation are corrective action recorded by CAG.',limits=['₹45.50crore difference is not established loss or recovered proceeds.'])
edge('cag-hal','cag','hal','audit-observation','CAG sought responsibility investigation on reserve-price risk','audit-finding','oversight',['cag-dpsu-2025-brief-cdn'],date='2025-12-18',response='HAL cancelled and reset reserve; later inquiry outcome not located.',limits=['Individual valuer/beneficiary identities unavailable; no inferred politician link.'])
edge('ddp-doo','ddp','doo','administrative-placement','Hospital management placed under DoO(C&S) after2021corporatisation','documented','office',['cag-dpsu-2025-brief-cdn'])
edge('doo-ofh','doo','ofh','facility-administration','Post-corporatisation Ordnance Factory Hospitals administration','documented','office',['cag-dpsu-2025-brief-cdn'],response='Ministry said transfer to other departments was under consideration inJune2025.')
edge('mod-ofh-spending','mod','ofh','audited-network-expenditure','CAG reports ₹598.84crore hospital spending during2020–24','documented','payment',['cag-dpsu-2025-brief-cdn'],money(598.84,period='2020–24',basis='Reported historical hospital-network expenditure'),response='MoD: newDPSUs focus on core production; no legal obligation to operate hospitals; transfer considered.',limits=['Network expenditure, not a single transfer or allegation of diverted funds.','Administration changed during this period; not all spending assigned to post2021DoO.'])
edge('cag-ofh','cag','ofh','sample-audit','Eight selected hospitals: staffing/utilisation and framework gaps','audit-finding','oversight',['cag-dpsu-2025-brief-cdn'],date='2025-12-18',response='MinistryJune2025reply and pending transfer decision retained.',limits=['Eight-hospital sample is not all military healthcare.'])

budget_edges=['budget-'+k for k in ['capital','revenue','civil','pensions']]+['revenue-'+k for k in ['army','navy','iaf','drdo','doo']]+['capital-drdo']
case('funding-architecture','Defence budget: reconcile the accounting boundary','What is appropriated, which agencies receive allocations, and where do supplier-level payments become unobservable?','FY2024–25 actual; FY2025–26 BE/RE; FY2026–27 BE','documented','Four net2026–27 demands reconcile to₹784,678.28crore. This is a budget boundary, not proven spending or a corruption estimate.',[geo('New Delhi','DL')],budget_edges,['budget-capital-2026','budget-revenue-2026','budget-civil-2026','budget-pensions-2026','budget-pib-2026'],[
claim('budget-units','The PIB detailed capital paragraph carries an inconsistent lakh-crore unit; original Demand21 establishes₹219,306.47crore.','documented',['budget-pib-2026','budget-capital-2026'],'The same PIB release headline gives₹2.19lakhcrore, consistent with the demand.','Ordinary publication/typographical error, not evidence of a hidden appropriation.','An authenticated revised Demand21 with a different unit/amount would require revision.',['PIB correction history']),
claim('budget-overlap','DRDO revenue₹11,850cr plus capital₹17,250.25cr equals₹29,100.25cr already inside the four demands. Pension₹8,000cr PublicAccount recovery is an accounting deduction.','documented',['budget-revenue-2026','budget-capital-2026','budget-pensions-2026'],'PIB independently describes the same DRDOtotal, within the same government source family.','Double-counting allocations or confusing gross/net can manufacture apparent missing money.','Reconcile original line items, receipts and recovery notes against Finance/Appropriation Accounts.',['FY2026–27 appropriation accounts','CGDA payment-level contract mapping'])],
['Net demands: Civil₹28,554.61cr; Revenue₹365,478.98cr; Capital₹219,306.47cr; Pensions₹171,338.22cr.','Army/Navy/AirForce/R&D revenue heads are source-supported; capital common heads must not be arbitrarily split by service.'],['No complete contract→invoice→payment→subcontractor ledger has been inspected.','Budget growth after an attack does not establish who caused the attack.'],[record('Object-head and contract-wise expenditure reconciliation','CGDA / DefenceFinance','Separate authority to spend from actual supplier cash'),record('Gross-to-net recovery and receipt schedules','Ministry of Finance / CGDA','Avoid false leakage estimates')],['No graph-wide money total; parent/child allocations overlap.','Review window is not complete annual coverage.'])

case('offset-discharge','Offsets: claims, acceptance and recovery are different ledgers','How much promised industrial benefit was accepted, and which penalties actually reached the government?','2016 recovery snapshots;2024 original update;2026 secondary follow-up','unresolved','Original Parliament evidence reportsUS$8.44bn claims andUS$6.71bn disposed, without an acceptance/rejection split. US$88.60m imposed is not collected money. Two earlier recoveries are explicitly documented.',[geo('New Delhi','DL')],['offset-due','offset-claimed','offset-disposed','offset-penalty','fleet-recovery','harop-recovery','pac-offset'],['offsets-defence3','offsets-2016-parliament','offsets-prs-2026'],[
claim('offset-stage','Ministry’s2024submission reports57contracts, US$8.81bn due,US$8.44bn claimed andUS$6.71bn disposed; the records do not establishUS$6.71bn accepted.','documented',['offsets-defence3'],'Ministry explains long-term contracts, amendment difficulties and352IOPs created.','Administrative verification lag or noncompliant claims can both create a gap; amount disposed is not necessarily success.','Obtain contract-level accepted/rejected/pending claims and reconcile to dated aggregate.',['DOMW claim register','CGDA accepted-credit certificates']),
claim('offset-enforcement','US$88.60m penalty/interim penalty was imposed in23contracts; actual recovery for that cohort is unestablished.2016answer separately reports€2.07m andUS$80,500 recovered.','documented',['offsets-defence3','offsets-2016-parliament'],'Ministry says rephasing attracts additional obligations and extensions support completion.','A lawful pending appeal, adjustment or timing lag can distinguish imposed from recovered; no inference that all penalties were waived.','Treasury receipt and appeal/waiver ledger matching each penalty order would confirm or disprove non-recovery.',['Penalty orders','Recovery vouchers','Waiver/appeal decisions']),
claim('offset-pac2026','PRS reports PAC concern about45%unfulfilled at18December2025, but full original report and denominator have not been inspected.','unresolved',['offsets-prs-2026'],'PRS describes unmaterialised projects and recommended early contract involvement of accounting authorities.','Cohort/date/meaning changes may explain apparent conflict with earlier claim ratios.','Retrieve PAC50original and annexures; reconcile accepted, rejected, pending and not-yet-due obligations.',['PAC50of2026 full report and Ministry written replies'])],
['Dated old recoveries show enforcement exists; they do not prove all liabilities were recovered.','December2024report explains exemptions for ab-initio single-vendor,IGA/FMS and some other routes.'],['Names of remitting vendors in the2016examples and full2026accepted-credit denominator remain unknown.','NewPACrecommendations are not proof a rule has changed.'],[record('Contract-ID offset ledger and payment vouchers','DOMW / CGDA','Establish last verified financial hop'),record('PAC2026full report plus action-taken response','Lok Sabha Secretariat / MoD','Verify latest accepted/disposed distinction')],['Offset credits may include industrial purchases,FDI or technology and multipliers; not fungible cash paid toGovernment.','Do not apply2020exemptions retrospectively to2010contracts.'],decision=dict(decisionDate='2019-08-08',actors=[dict(entityId=prefix+'entity:mod',authority='Rephasing-rule amendment described in2024Parliament submission.',incentive='Analytical possibility: improve completion and prevent penalty avoidance while preserving feasible industrial work.',evidenceSourceIds=ids('src',['offsets-defence3']))],informationThen=['Only the reported2019amendment is reconstructed. The2024claim totals were unavailable at that decision date.'],options=[dict(label='Enforce dated milestones with penalties',expectedObservableOutcome='Penalty orders and actual recoveries; amendments carry stated additional obligations.',sourceIds=ids('src',['offsets-defence3'])),dict(label='Approve justified rephasing under the applicable rule',expectedObservableOutcome='Dated reasoned amendment and later verified eligible work, not merely another claim.',sourceIds=ids('src',['offsets-defence3']))],observedOutcome='By2024Ministry reports penalties imposed and rephasing disincentives; collected total and counterfactual effect remain unknown.',sourceIds=ids('src',['offsets-defence3','offsets-2016-parliament']),hindsightLimits=['Not a causal effect estimate or numerical game equilibrium.','No assumption about private motives of named officers.']))

ag_edges=['aw-award','aw-payment','aw-offset','aw-ids','aw-taneja','aw-gsf','whl-gtc','gtc-pawan','michel-gsf','michel-gtc','ed-michel','hc-michel','brescia-haschke','leonardo-awil','sbi-guarantee','db-guarantee']
ag_src=['cag-agusta-2013-cdn','michel-2025-march-mirror','michel-2025-may','michel-2026','leonardo-half2019','reuters-haschke-mirror','agusta-payment-report-2016','agusta-facts-2013','agusta-guarantee-company-2014','michel-july2026']
case('agusta-stages','AgustaWestland: trace contracts without converting allegations into convictions','Which award, offset, reported payment, alleged intermediary and guarantee stages can actually be joined—and which later outcomes contradict an old narrative?','2011–2026 inquiry and litigation;2006–2010 award context explicitly outside window','alleged','Named corporate links can be reconstructed from audit and court records, but alleged€6.05m service payments are not trial-proven; a€18.2m order is not proof of payment. Later acquittals and bail outcomes materially qualify earlier reporting.',[geo('New Delhi','DL'),geo('Mohali','PB')],ag_edges,ag_src,[
claim('ag-award','CAG gives€556,262,026primecontract and€166,879,000offsetobligation; the latter is not an additional payment toGovernment.','documented',['cag-agusta-2013-cdn'],'Ministry2013defended compliance and described cancellation/recovery clauses.','Scope,discounts,exchange rate and different financial stages can explain differing₹3,600/₹3,726.96crore headlines.','Use signed contract,invoice and currency-specific disbursement ledger.',['Prime contract and payment schedule','CGDAdisbursement vouchers']),
claim('ag-gsf','Prosecution allegations recited in March2025bail judgment attribute€6.05m payments under a service agreement between AgustaWestlandHoldings and GlobalServicesFZE.','alleged',['michel-2025-march-mirror'],'Michel’s counsel denies specific role/material link; court granted bail on custody/trial-delay grounds, not on a final finding about the transfers.','A lawful service fee or mischaracterised/duplicated record remains a rival explanation until bank trail,work product and applicable pact are proved.','Matched bank records plus contemporaneous legitimate deliverables or trial rejection would challenge the alleged sham-service mechanism.',['Service agreement and revisions','Bank debit/credit advices','Work products','Trial findings']),
claim('ag-buyback','The same judgment recites a€18.2m WG-30 buyback order to GlobalTrade&Commerce and investigators’ assertion of no dealings with PawanHans.','alleged',['michel-2025-march-mirror'],'The defence disputes material connection; no PawanHans sale/payment is admitted to this graph.','Unperformed/cancelled order, documentary error or genuine intermediary correspondence could alter the allegation.','PawanHans contract,delivery and communication records would test whether a genuine transaction occurred.',['PawanHans sale register','Purchase order,amendment,cancellation and remittance records']),
claim('ag-offset-ids','CAG found pre-contract IDSInfotech work included in a future offset programme, and an inadmissible civil-infrastructure component via Taneja.','audit-finding',['cag-agusta-2013-cdn'],'Ministry said only post-effective-date credit would be admissible and pointed to proposed amendments; vendor sought IDSdeletion.','Drafting/eligibility error later corrected can explain the problem without payment diversion.','Final amendment and accepted-credit certificates would show whether any ineligible credit actually survived.',['Offset amendment orders','Accepted/rejected credits','Supplier invoices']),
claim('ag-counteroutcomes','Leonardo2019filing reports former executives’ Italian acquittal survived appeal; Reuters2025reports Haschke acquittal. Michel obtained2025bail, while April2026HC rejected a separate release/extradition challenge.','documented',['leonardo-half2019','reuters-haschke-mirror','michel-2025-march-mirror','michel-2026','michel-july2026'],'Acquittals and defence denials are retained prominently; Indian and Italian proceedings are not merged.','Different defendants,charges and jurisdictions can yield different procedural and merits outcomes.','Original appellate judgments and current Indian docket would resolve the exact scope and any later reversal.',['Italian2019and2025judgments','SupremeCourtJuly/October2026orders','Indiantrialstatus']),
claim('ag-recovery-boundary','2016report gives₹1,620cr paid and₹2,068cr guarantee recovery. Company records distinguish enforcement permissions, protected delivered-aircraft amounts and unresolved balances.','unresolved',['agusta-payment-report-2016','agusta-guarantee-company-2014','leonardo-half2019'],'Company challenged guarantee calls; later filing records partial relaxation and unresolved overall lawsuit.','FX movements,performance bonds and delivered-goods entitlements explain why encashment need not equal refund or net fiscal gain.','A matched multicurrency ledger and final settlement/award could establish residual loss,recovery or entitlement.',['Actual bank settlement advices','Government receipt ledger','Finalsettlement documents'])],
['Prime,offset,reportedcash,allegedintermediary and bankguarantee stages remain separate.','The court text supports Michel-firm identity but does not independently audit beneficial ownership.','Later acquittals prevent recycling2016Italianconvictions as current truth.'],['Ultimate recipients of allegedservicepayments are not established by inspected ledgers.','No link from these payments to a named minister,party,judge or attack is established.','October2026case outcome remains unresolved; a listing is not a ruling.'],[record('Contract/invoice/bank trail with source-account matching','MoD/CGDA; case-record holders','Trace actual disclosed cash without borrowing allegations as proof'),record('Offsetamendments and accepted-credit certificates','DOMW/CGDA','Test if ineligible work received credit'),record('Current appellate and trial docket orders','SupremeCourt/DelhiHighCourt/trialcourt','Update legal posture'),record('PawanHans transactional correspondence','PawanHans; disclosedcourt exhibits','Test alleged sham buyback')],['One related case does not establish a general criminal propensity.','No accountnumbers or privateaddresses published.','CAGtrial-design detail excluded from graph; no current operational vulnerabilities.'])

case('hal-land','HAL land monetisation: a stopped transaction is not a realised loss','Did reserve-setting expose public land to undervaluation, and what did the audit correction prevent?','2015policyfollow-up; audit through2023 with2025updates','audit-finding','CAG says HAL cancelled the₹52.30cr reserve process after audit and proposed₹97.80cr. This supports a control failure and corrective action; it does not establish a completed sale,₹45.50cr theft or an identified favoured buyer.',[geo('Bengaluru','KA')],['hal-fmd','hal-reserve-low','hal-reserve-new','cag-hal'],['cag-dpsu-2025-brief-cdn'],[
claim('hal-reserve','CAG describes use of oneIBBIregistered valuer for2.925acres, low₹52.30crreserve, cancellation and new₹97.80crreserve; it calls for investigation to fix responsibility.','audit-finding',['cag-dpsu-2025-brief-cdn'],'The cancellation and revised reserve are concrete contrary evidence to a claim of completed low-price disposal.','Valuation method,encumbrances,tenure,date differences or administrative error could explain part of the difference; none have been independently quantified.','Originalvaluation,comparable sales,boardapproval,cancellation and subsequentauction outcomes can establish whether like-for-like underpricing existed and whether any sale occurred.',['Bothvaluationreports','IBBIvaluer appointment','HALboardminutes','Cancellation order','Newauctionand sale deed'])],
['Auditor reports risk and a corrective reversal.','Valuer and prospectivebuyer are not named in inspected brief.'],['No completeddisposal,payment,beneficiary,politician relationship or disciplinary outcome is established.'],[record('Original/revisedvaluation with encumbrance schedule','HALFacilityManagementDivision','Test like-for-like pricing'),record('Boardapproval,cancellation and sale/auctionrecord','HALCompanySecretary','Establish transactionstop and any laterreceipt'),record('Action-takennote onCAGparagraph2.3','HAL/MoD/CAG','Resolve responsibilityinvestigation')],['Officialsummaryonly; fullauditworkingpapersstillneeded.','Do not treat₹45.50cr difference as money lost,recovered or paid.'],decision=dict(decisionDate=None,actors=[dict(entityId=prefix+'entity:hal',authority='PSUresponsible for its landmanagement and monetisation, as audited.',incentive='Analyticalpossibility: unlocklandvalue efficiently while complying with valuationandapproval controls.',evidenceSourceIds=ids('src',['cag-dpsu-2025-brief-cdn'])),dict(entityId=prefix+'entity:cag',authority='Audits HALlandmanagement and calls for responsibilityinvestigation.',incentive='Analyticalpossibility: preventundervalueand strengthen publicasset controls.',evidenceSourceIds=ids('src',['cag-dpsu-2025-brief-cdn']))],informationThen=['Exact original decisiondate and valuationinputs unknown; no reconstructed claim that actors knew2025audit findings.'],options=[dict(label='Proceed subject to substantiated valuation and competitive process',expectedObservableOutcome='Independentvaluationreview,reasonedapproval,bidresults and registereddeed.',sourceIds=ids('src',['cag-dpsu-2025-brief-cdn'])),dict(label='Cancel andrevalue before proceeding',expectedObservableOutcome='Cancellationrecord,newreserve and laterauctiondocument.',sourceIds=ids('src',['cag-dpsu-2025-brief-cdn']))],observedOutcome='CAG reports cancellation andrevisedreserve; completednewauction outcomeunknown.',sourceIds=ids('src',['cag-dpsu-2025-brief-cdn']),hindsightLimits=['Options are institutional analyticalalternatives, notmindreading.','No causal claim that₹45.50crwas saved; reservedifferencesarenot realisedvalues.']))

case('ordnance-health-transition','Defence corporatisation meets public healthcare','Who owns hospital obligations after ordnance corporatisation, and do expenditure and service measures match the new responsibilities?','2020–24expenditure;2021corporatisation; MinistryresponseJune2025','audit-finding','CAG reports₹598.84crspent onOrdnanceFactoryHospitals in2020–24 and staffing/utilisation/regulatory gaps in eight selected hospitals. Hospitaltransfer andhealthservice merger decisions remained pending in the cited2025record.',[geo('New Delhi','DL')],['ddp-doo','doo-ofh','mod-ofh-spending','cag-ofh'],['cag-dpsu-2025-brief-cdn'],[
claim('ofh-spending','The officialbrief reports₹598.84crnetwork spending, more than82%onpay; auditofeightselected hospitals found staffing/service mismatch,limitedspecialist/diagnosticservices andpostcorporatisation frameworkgaps.','audit-finding',['cag-dpsu-2025-brief-cdn'],'MoDJune2025: newDPSUs shouldfocus onproduction, nolegalobligationtooperate hospitals,transferunderconsideration.','Primary-care,same-daytreatment,remoteaccess andstandbycapacity can explain lowinpatientoccupancy; payrollsharealoneisnotwasteorfraud.','Facility-levelbeneficiaryload,referralcosts,service mix and staffingstandards could establish whether costlyduplication or essentialaccess predominates.',['Eight-hospitalsampleand denominators','Facilitybudgetsand utilisationseries','CGHSreferralcosts','Postcorporatisation transferorders'])],
['Cabinet2021corporatisation createdsevenDPSUs;managementofOFHsplacedunderDoO(C&S),DDP.','Auditrecordprovidesa realdefence-health-administrationjoin, notaprivatepaymentrecipient.'],['No privatehospitalvendor,divertedpayment or outcomeofpending2025decisions is established.','The all-Indiahealthcare implications cannotbe inferredfromthis selectedsample.'],[record('Hospitaltransfer decisionand sanctionedregulatoryframework','MoD/DDP;MinistryofHealth','Resolve responsibilityandduplication'),record('Beneficiary/referralandpayroll aggregates','DoO(C&S),CGHS','Compare actualservice outputsandcostwithoutpatientdata'),record('FullCAGparagraph2.2andactiontaken','CAG/MoD','Checksample,denominatorsandlatercorrections')],['Healthcarespendingisnottreatedassuspiciousbydefault.','No patientnamesorprivatehealthdata.'])

coverage=[]
def cov(i,j,p,s,ss,g,n):coverage.append(dict(institution=i,jurisdiction=j,period=p,status=s,sourceIds=ids('src',ss),gap=g,nextRecord=n))
cov('MinistryofDefence / DefenceFinance','Union','FY2024–27','examined',['budget-capital-2026','budget-revenue-2026','budget-civil-2026','budget-pensions-2026'],'Fourbudgetdemands examined; completecontract/paymentuniverse notexamined.','CGDAexpenditureandappropriationreconciliation')
for i in ['IndianArmy','IndianNavy','IndianAirForce']:cov(i,'Union','FY2026–27BE','partial',['budget-revenue-2026'],'Revenueheads mapped; everycommand/unit/tender/payment notcovered.','Service-wiseactualcontractandpaymentregister')
cov('DRDO','Union','FY2026–27BE','partial',['budget-capital-2026','budget-revenue-2026'],'R&Dfundingmapped; lab/projectvendorpaymentsnotcovered.','Projectsanction,deliverable,invoiceandpaymentledgers')
cov('DOMW / CGDA','Union','2016,2024,2026','partial',['offsets-defence3','offsets-2016-parliament','offsets-prs-2026'],'IndividualacceptedcreditsandlatestPACoriginalunavailable.','PAC50original,contractclaimandpenaltyrecoveryregister')
cov('HAL / BEL','UnionPSUs;selectedproperties','2015–2025','partial',['cag-dpsu-2025-brief-cdn'],'HALselectedlandcaseonly; BELbriefnoticed, noownership/valuationinventoryorallcontracts.','Fullparagraph2.3andentityresponses')
cov('DoO(C&S) / sevennewDPSUs / OrdnanceFactoryHospitals','Union','2020–2025','partial',['cag-dpsu-2025-brief-cdn'],'Hospitaltransitionexamined; allnewPSUcontractsand2026transitionoutcomesqueued.','Transferordersandfacilityfinancialrecords')
for i in ['BharatDynamicsLimited','MazagonDockShipbuilders','GardenReachShipbuilders&Engineers','CochinShipyard','BEML','MishraDhatuNigam','MunitionsIndiaLimited','ArmouredVehiclesNigam','AdvancedWeaponsandEquipmentIndia','TroopComfortsLimited','YantraIndia','IndiaOptel','GlidersIndia']:
    cov(i,'Uniondefenceindustrialbase','2011–2026researchwindow','queued',[],'No new complete entityledger examined in thisstream.','Auditedannualreports,awardregisters,subcontracts,receivablesandCAGactiontaken')
for i in ['C295 Airbus–Tata','HAL–GE engines','BrahMos exports','MQ-9 / FMS','Rafale and submarine programmes']:
    cov(i,'Cross-border procurement','2011–2026researchwindow','queued',[],'Priorrepo coverageinventoried; notrepackagedas newinvestigation. Newcash/offsetjoinsneedoriginalrecords.','Datedpayment/offsetacceptance/guaranteerecords and supplierfilings')
cov('CAPFs,statepolice,borderincidents','Othertrack','2011–2026','queued',[],'Ownedbypolice-borderstream; nofalse-flag inference from defencefunding.','See source-closed police-border researchpack')

rejected=[
dict(**{'from':'PIB capital-head unit','to':'Defence budget','proposed':'Treat219306.47lakhcrore as the actualallocation','reason':'OriginalDemand21andPIBheadline resolve it as219306.47crore; retainunittypeerror ratherthan inflatefunding.','sourceIds':ids('src',['budget-capital-2026','budget-pib-2026'])}),
dict(**{'from':'HAL original/revisedreserve','to':'Unknownbuyer/politician','proposed':'₹45.50crore stolenortransferred','reason':'Ongoingprocesswascancelled; nobuyer,completeddeedorcashreceipt established.','sourceIds':ids('src',['cag-dpsu-2025-brief-cdn'])}),
dict(**{'from':'Michel’salleged€42m umbrella','to':'€6.05mfee+€18.2morder','proposed':'Addallfiguresas independentbribepayments','reason':'Componentsmayoverlap; anorderisnotproof ofpayment and allremainalleged.','sourceIds':ids('src',['michel-2025-march-mirror'])}),
dict(**{'from':'Haschke acquittal inItaly','to':'AllIndianAgustaaccused','proposed':'Declareeveryprosecutionresolved','reason':'Defendants,jurisdictionsandchargesdiffer; preservetheacquittalwithoutoverextendingit.','sourceIds':ids('src',['reuters-haschke-mirror','michel-2026'])}),
dict(**{'from':'US$6.71bn disposedclaims','to':'Verifiedoffsetreceipts','proposed':'Treatdisposalasacceptedindustrialbenefit','reason':'Parliamenttextdoesnotgiveaccepted/rejectedsplit.','sourceIds':ids('src',['offsets-defence3'])}),
dict(**{'from':'Budgetincreaseafteranattack','to':'State-stagedattack','proposed':'Inferfalseflagfromfinancialbenefit','reason':'Budgettimingandbeneficiariesare not evidenceofattackauthorship, intentorcollusion.','sourceIds':ids('src',['budget-pib-2026'])}),
dict(**{'from':'2016FleetTanker/HAROPrecoveries','to':'Specificforeignsupplier','proposed':'Assignrecoverytoanassumednamedcompany','reason':'Theanswerdoesnotnamelegalremitter; nofuzzyvendorjoin.','sourceIds':ids('src',['offsets-2016-parliament'])})]
roadmap=[dict(phase='now',task='Publish bounded documentary graph andcounterevidence',deliverable='Fivecaseswithsources,financialstagesandexplicitstops',acceptance='Allreferencesresolve; no unsupportedcashfloworclaimofcompletecoverage'),dict(phase='next',task='Acquirebank/treasuryandaccepted-credit evidence',deliverable='Contract-IDledgerwithcurrency,date,invoice,acceptanceandrecovery',acceptance='Eachcashhophasoriginrecord; disposed/imposedneverbecomeaccepted/collectedwithoutproof'),dict(phase='next',task='Refreshalllegalandpolicyoutcomes',deliverable='OriginalPAC50andlatestMichel/Italianorders; HALactiontaken',acceptance='Everycurrentstatushasdatedoriginalorvisibleaccessgap'),dict(phase='later',task='ExpandPSUandsubcontractcoverageusingstablelegalIDs',deliverable='Auditedcompanyandprocurementpanelswithresponses',acceptance='Noofficers,ownersorrecipientsmergedonname/proximityalone'),dict(phase='later',task='Preregisterinstitutionaloutcomesforprospectivetracking',deliverable='Binaryobservables:claimaccepted,penaltyrecovered,auctioncompleted,hospitaltransfernotified',acceptance='Freezequestionandavailabilitybeforeoutcome; nopersonalguiltprobability')]
data=dict(schemaVersion=1,track='defence',reviewDate='2026-10-08',scope='Bounded defence funding research over8October2011–8October2026: FY2026–27budgetarchitecture;offsetaccounting/enforcement;AgustaWestlandproceduralandfinancialstages;HALlandcontrols;ordnancehospitaltransition.2010awardcontextexplicitlyolder. Notallmilitaryfunds,contracts,entitiesor15annualcycleshavebeenexamined.',searchLog=[{k:x[k] for k in ['query','requestedResults','date']} for x in json.loads((RAW/'exa-searches-final.json').read_text())],sources=sources,entities=entities,edges=edges,cases=cases,coverage=coverage,rejectedJoins=rejected,roadmap=roadmap)

# Editorial corrections to hand-authored prose; IDs, URLs, dates and source bytes stay exact.
prose = '''
MinistryofDefence|Ministry of Defence
DefenceFinance|Defence Finance
MinistryofHealth|Ministry of Health
IndianArmy|Indian Army
IndianNavy|Indian Navy
IndianAirForce|Indian Air Force
DefenceServices|Defence Services
BharatDynamicsLimited|Bharat Dynamics Limited
MazagonDockShipbuilders|Mazagon Dock Shipbuilders
GardenReachShipbuilders&Engineers|Garden Reach Shipbuilders & Engineers
CochinShipyard|Cochin Shipyard
MishraDhatuNigam|Mishra Dhatu Nigam
MunitionsIndiaLimited|Munitions India Limited
ArmouredVehiclesNigam|Armoured Vehicles Nigam
AdvancedWeaponsandEquipmentIndia|Advanced Weapons and Equipment India
TroopComfortsLimited|Troop Comforts Limited
YantraIndia|Yantra India
IndiaOptel|India Optel
GlidersIndia|Gliders India
SupremeCourt|Supreme Court
DelhiHighCourt|Delhi High Court
DeutscheBankAG|Deutsche Bank AG
GlobalServicesFZE|Global Services FZE
GlobalTrade&Commerce|Global Trade & Commerce
AgustaWestlandHoldings|AgustaWestland Holdings
PawanHans|Pawan Hans
IDSInfotech|IDS Infotech
OrdnanceFactoryHospitals|Ordnance Factory Hospitals
PublicAccount|Public Account
Army/Navy/AirForce|Army / Navy / Air Force
HALFacilityManagementDivision|HAL Facility Management Division
HALCompanySecretary|HAL Company Secretary
HALboardminutes|HAL board minutes
CGDAdisbursement|CGDA disbursement
CGDAexpenditureandappropriationreconciliation|CGDA expenditure and appropriation reconciliation
CGHSreferralcosts|CGHS referral costs
AllIndianAgustaaccused|All Indian Agusta accused
PIBheadline|PIB headline
OriginalDemand|Original Demand
Analyticalpossibility|Analytical possibility
policyfollow-up|policy follow-up
budgetarchitecture|budget architecture
offsetaccounting/enforcement|offset accounting / enforcement
proceduralandfinancialstages| procedural and financial stages
HALlandcontrols|HAL land controls
ordnancehospitaltransition|ordnance hospital transition
awardcontextexplicitlyolder|award context explicitly older
Notallmilitaryfunds|Not all military funds
annualcycleshavebeenexamined|annual cycles have been examined
first45|first 45
HALlandmanagement|HAL land management
PSUresponsible|PSU responsible
landmanagement|land management
andmonetisation|and monetisation
unlocklandvalue|unlock land value
valuationandapproval|valuation and approval
Audits HALlandmanagement|Audits HAL land management
responsibilityinvestigation|responsibility investigation
preventundervalueand|prevent undervalue and
publicasset|public asset
decisiondate|decision date
valuationinputs|valuation inputs
originaldecisiondate|original decision date
that actors knew|that actors knew
audit findings|audit findings
Independentvaluationreview|Independent valuation review
reasonedapproval|reasoned approval
bidresults|bid results
registereddeed|registered deed
Cancel andrevalue|Cancel and revalue
Cancellationrecord|Cancellation record
newreserve|new reserve
laterauctiondocument|later auction document
andrevisedreserve|and revised reserve
completednewauction|completed new auction
outcomeunknown|outcome unknown
analyticalalternatives|analytical alternatives
notmindreading|not mind reading
reservedifferencesarenot|reserve differences are not
realisedvalues|realised values
low-reserve|low-reserve
singleIBBI|single IBBI
oneIBBIregistered|one IBBI registered
valuerfor|valuer for
lowinpatientoccupancy|low inpatient occupancy
MinistryresponseJune|Ministry response June
transfer/regulatory|transfer / regulatory
officialbrief|official brief
auditofeightselected|audit of eight selected
staffing/service|staffing / service
limitedspecialist|limited specialist
diagnosticservices|diagnostic services
andpostcorporatisation|and post-corporatisation
frameworkgaps|framework gaps
newDPSUs|new DPSUs
shouldfocus|should focus
onproduction|on production
nolegalobligationtooperate|no legal obligation to operate
transferunderconsideration|transfer under consideration
same-daytreatment|same-day treatment
remoteaccess|remote access
andstandbycapacity|and standby capacity
payrollsharealoneisnotwasteorfraud|payroll share alone is not waste or fraud
levelbeneficiaryload|level beneficiary load
referralcosts|referral costs
staffingstandards|staffing standards
costlyduplication|costly duplication
essentialaccess|essential access
hospitalsampleand|hospital sample and
Facilitybudgetsand|Facility budgets and
utilisationseries|utilisation series
Postcorporatisation|Post-corporatisation
transferorders|transfer orders
createdsevenDPSUs|created seven DPSUs
managementofOFHsplacedunderDoO|management of OFHs placed under DoO
Auditrecordprovidesa|Audit record provides a
realdefence-health-administrationjoin|real defence-health-administration join
notaprivatepaymentrecipient|not a private payment recipient
privatehospitalvendor|private hospital vendor
divertedpayment|diverted payment
outcomeofpending|outcome of pending
Indiahealthcare|India healthcare
cannotbe|cannot be
inferredfromthis|inferred from this
selectedsample|selected sample
Hospitaltransfer|Hospital transfer
sanctionedregulatoryframework|sanctioned regulatory framework
responsibilityandduplication|responsibility and duplication
Beneficiary/referralandpayroll|Beneficiary / referral and payroll
actualservice|actual service
outputsandcostwithoutpatientdata|outputs and cost without patient data
FullCAGparagraph|Full CAG paragraph
andactiontaken|and action taken
Checksample|Check sample
denominatorsandlatercorrections|denominators and later corrections
Healthcarespendingisnottreatedassuspiciousbydefault|Healthcare spending is not treated as suspicious by default
patientnamesorprivatehealthdata|patient names or private health data
Bothvaluationreports|Both valuation reports
IBBIvaluer|IBBI valuer
valuer appointment|valuer appointment
Newauctionand|New auction and
prospectivebuyer|prospective buyer
completeddisposal|completed disposal
Original/revisedvaluation|Original / revised valuation
Boardapproval|Board approval
sale/auctionrecord|sale / auction record
transactionstop|transaction stop
laterreceipt|later receipt
Action-takennote|Action-taken note
onCAGparagraph|on CAG paragraph
Officialsummaryonly|Official summary only
fullauditworkingpapersstillneeded|full audit working papers still needed
cancelledand|cancelled and
andrevalued|and revalued
Originalvaluation|Original valuation
boardapproval|board approval
subsequentauction|subsequent auction
CGDApayment|CGDA payment
secondaryreport|secondary report
bankguarantee|bank guarantee
allegedintermediary|alleged intermediary
reportedcash|reported cash
reported₹|reported ₹
offsetobligation|offset obligation
primecontract|prime contract
servicepayments|service payments
allegedservicepayments|alleged service payments
ultimatebeneficiary|ultimate beneficiary
Finalsettlement|Final settlement
Indiantrialstatus|Indian trial status
trialstatus|trial status
Offsetamendments|Offset amendments
and accepted|and accepted
filedcomplaint|filed complaint
materiallink|material link
CourtJuly|Court July
guaranteecalls|guarantee calls
trial-delay|trial-delay
lawfulservice|lawful service
Allreferencesresolve|All references resolve
Fourbudgetdemands|Four budget demands
completecontract/paymentuniverse|complete contract / payment universe
notexamined|not examined
everycommand/unit/tender/payment|every command / unit / tender / payment
notcovered|not covered
Service-wiseactualcontractandpaymentregister|Service-wise actual contract and payment register
R&Dfundingmapped|R&D funding mapped
lab/projectvendorpaymentsnotcovered|lab / project vendor payments not covered
Projectsanction|Project sanction
invoiceandpaymentledgers|invoice and payment ledgers
IndividualacceptedcreditsandlatestPACoriginalunavailable|Individual accepted credits and latest PAC original unavailable
PAC50original|PAC 50 original
contractclaimandpenaltyrecoveryregister|contract claim and penalty recovery register
UnionPSUs|Union PSUs
selectedproperties|selected properties
HALselectedlandcaseonly|HAL selected land case only
BELbriefnoticed|BEL brief noticed
valuationinventoryorallcontracts|valuation inventory or all contracts
Fullparagraph|Full paragraph
andentityresponses|and entity responses
sevennewDPSUs|seven new DPSUs
Hospitaltransitionexamined|Hospital transition examined
allnewPSUcontractsand|all new PSU contracts and
transitionoutcomesqueued|transition outcomes queued
Transferordersandfacilityfinancialrecords|Transfer orders and facility financial records
Uniondefenceindustrialbase|Union defence industrial base
researchwindow|research window
entityledger|entity ledger
thisstream|this stream
Auditedannualreports|Audited annual reports
awardregisters|award registers
receivablesandCAGactiontaken|receivables and CAG action taken
coverageinventoried|coverage inventoried
notrepackagedas|not repackaged as
newinvestigation|new investigation
Newcash/offsetjoinsneedoriginalrecords|New cash / offset joins need original records
Datedpayment/offsetacceptance/guaranteerecords|Dated payment / offset acceptance / guarantee records
supplierfilings|supplier filings
statepolice|state police
borderincidents|border incidents
Othertrack|Other track
Ownedbypolice-borderstream|Owned by police-border stream
nofalse-flag|no false-flag
defencefunding|defence funding
researchpack|research pack
actualallocation|actual allocation
resolve it as|resolve it as
retainunittypeerror|retain unit type error
ratherthan|rather than
inflatefunding|inflate funding
stolenortransferred|stolen or transferred
Ongoingprocesswascancelled|Ongoing process was cancelled
nobuyer|no buyer
completeddeedorcashreceipt|completed deed or cash receipt
Michel’salleged|Michel’s alleged
Addallfiguresas|Add all figures as
independentbribepayments|independent bribe payments
Componentsmayoverlap|Components may overlap
anorderisnotproof|an order is not proof
allremainalleged|all remain alleged
inItaly|in Italy
Declareeveryprosecutionresolved|Declare every prosecution resolved
jurisdictionsandchargesdiffer|jurisdictions and charges differ
preservetheacquittalwithoutoverextendingit|preserve the acquittal without overextending it
disposedclaims|disposed claims
Verifiedoffsetreceipts|Verified offset receipts
Treatdisposalasacceptedindustrialbenefit|Treat disposal as accepted industrial benefit
Parliamenttextdoesnotgiveaccepted/rejectedsplit|Parliament text does not give accepted / rejected split
Budgetincreaseafteranattack|Budget increase after an attack
Inferfalseflagfromfinancialbenefit|Infer false flag from financial benefit
Budgettimingandbeneficiariesare|Budget timing and beneficiaries are
evidenceofattackauthorship|evidence of attack authorship
intentorcollusion|intent or collusion
HAROPrecoveries|HAROP recoveries
Specificforeignsupplier|Specific foreign supplier
Assignrecoverytoanassumednamedcompany|Assign recovery to an assumed named company
Theanswerdoesnotnamelegalremitter|The answer does not name legal remitter
nofuzzyvendorjoin|no fuzzy vendor join
andcounterevidence|and counterevidence
Fivecaseswithsources|Five cases with sources
financialstagesandexplicitstops|financial stages and explicit stops
unsupportedcashfloworclaimofcompletecoverage|unsupported cash flow or claim of complete coverage
Acquirebank/treasuryandaccepted-credit|Acquire bank / treasury and accepted-credit
Contract-IDledgerwithcurrency|Contract-ID ledger with currency
acceptanceandrecovery|acceptance and recovery
Eachcashhophasoriginrecord|Each cash hop has origin record
disposed/imposedneverbecomeaccepted/collectedwithoutproof|disposed / imposed never become accepted / collected without proof
Refreshalllegalandpolicyoutcomes|Refresh all legal and policy outcomes
andlatestMichel/Italianorders|and latest Michel / Italian orders
HALactiontaken|HAL action taken
Everycurrentstatushasdatedoriginalorvisibleaccessgap|Every current status has dated original or visible access gap
ExpandPSUandsubcontractcoverageusingstablelegalIDs|Expand PSU and subcontract coverage using stable legal IDs
Auditedcompanyandprocurementpanelswithresponses|Audited company and procurement panels with responses
Noofficers|No officers
ownersorrecipientsmergedonname/proximityalone|owners or recipients merged on name / proximity alone
Preregisterinstitutionaloutcomesforprospectivetracking|Preregister institutional outcomes for prospective tracking
Binaryobservables|Binary observables
claimaccepted|claim accepted
penaltyrecovered|penalty recovered
auctioncompleted|auction completed
hospitaltransfernotified|hospital transfer notified
Freezequestionandavailabilitybeforeoutcome|Freeze question and availability before outcome
nopersonalguiltprobability|no personal guilt probability
January2014|January 2014
March2014|March 2014
May2014|May 2014
June2019|June 2019
August2012|August 2012
February2010|February 2010
October2011|October 2011
October2026|October 2026
February2013|February 2013
March2025|March 2025
April2026|April 2026
July2026|July 2026
June2025|June 2025
December2024|December 2024
December2025|December 2025
Italianconvictions|Italian convictions
NewPACrecommendations|New PAC recommendations
banktrail|bank trail
workproduct|work product
fullPAC|full PAC
disposed/imposed|disposed / imposed
penaltyorders|penalty orders
accepted/rejected|accepted / rejected
creditcertificates|credit certificates
offsetcontracts|offset contracts
FinancialYear|Financial Year
governmentSource|government source
accountnumbers|account numbers
privateaddresses|private addresses
clinicaldata|clinical data
recoveryrecord|recovery record
paidamount|paid amount
ultimaterecipients|ultimate recipients
actualcash|actual cash
fiscalgain|fiscal gain
afteraudit|after audit
allmilitary|all military
militaryhealthcare|military healthcare
morethan|more than
netfiscal|net fiscal
currentstatus|current status
notproof|not proof
notall|not all
briefnoticed|brief noticed
'''
replacements=[line.split('|',1) for line in prose.strip().splitlines()]
protected={'id','url','capturePath','sha256','sourceFamily','date','publishedAt','accessedAt','reviewDate','decisionDate','track','stage','status','kind','inspection','from','to','relation','overlapGroup'}
def clean(x,key=None):
    if isinstance(x,dict):return {k:clean(v,k) for k,v in x.items()}
    if isinstance(x,list):return [clean(v,key) for v in x]
    if not isinstance(x,str) or key in protected or x.startswith('fi:'):return x
    for a,b in replacements:x=x.replace(a,b)
    x=re.sub(r'(?<=[A-Za-z])(?=\d)', ' ', x)
    x=re.sub(r'(?<=\d)(?=[A-Za-z])', ' ', x)
    x=re.sub(r',(?=\S)', ', ', x)
    x=re.sub(r';(?=\S)', '; ', x)
    x=re.sub(r'\.(?=[A-Z])', '. ', x)
    return x
data=clean(data)
finishing={
'lakhcrore':'lakh crore','DRDOtotal':'DRDO total','reportsUS$':'reports US$',
'andUS$':'and US$','establishUS$':'establish US$','toGovernment':'to Government',
'IDSdeletion':'IDS deletion','allegedservice payments':'alleged service payments',
'CAGtrial-design':'CAG trial-design','crreserve':'crore reserve','crspent':'crore spent',
'crnetwork':'crore network','onOrdnance':'on Ordnance','andhealthservice':'and health-service',
'%onpay':'% on pay','MoDJune':'MoD June','Revenueheads':'Revenue heads',
'lab/projectvendorpaymentsnot covered':'lab / project vendor payments not covered',
'noownership':'no ownership','sevennew DPSUs':'seven new DPSUs','Priorrepo':'Prior repo',
'OriginalPAC':'Original PAC','independently describes':'also describes',
'%unfulfilled':'% unfulfilled','unestablished.2016':'unestablished. 2016',
'C 295':'C295','CGDAexpenditure':'CGDA expenditure','FullPAC':'Full PAC',
'nottrial':'not trial','contemporaneouslegitimate':'contemporaneous legitimate',
'Dateknown':'Date known','performancebond':'performance bond','byAudit':'by Audit',
'DPSUs shouldfocus':'DPSUs should focus','newmonetisation':'new monetisation',
'observables:claim':'observables: claim','reported2016':'reported 2016',
'crwas':'crore was','decisionand':'decision and','disclosedcourt':'disclosed court',
'trialcourt':'trial court','MinistryJune':'Ministry June','inJune':'in June',
'throughJune':'through June',
}
def polish(x,key=None):
    if isinstance(x,dict):return {k:polish(v,k) for k,v in x.items()}
    if isinstance(x,list):return [polish(v,key) for v in x]
    if not isinstance(x,str) or key in protected or x.startswith('fi:'):return x
    for a,b in finishing.items():x=x.replace(a,b)
    x=re.sub(r'(?<=\d), (?=\d{3})', ',', x)
    x=re.sub(r'(?<=[A-Za-z])(?=[₹€])', ' ', x)
    x=re.sub(r'(?<=[a-z])(?=(?:US\$|[A-Z]{2,}))', ' ', x)
    return x
data=polish(data)
for s in data['sources']:
    if s['id'].endswith(':leonardo-half2019'):
        s['publishedAt']=None
        s['limitations'].append('Reporting date is 30 June 2019; exact original web-publication date is not established by the inspected PDF.')
for e in data['edges']:
    if e['id'].endswith(':offset-claimed'):e['amount']=None;e['label']='Vendor-submitted offset discharge claims: US$8.44 billion'
    if e['id'].endswith(':offset-disposed'):e['amount']=None;e['label']='US$6.71 billion claims disposed; acceptance/rejection split unavailable'
    if e['id'].endswith(':offset-penalty'):e['amount']=None;e['label']='US$88.60 million penalty/interim penalty imposed in 23 contracts; recovery unestablished'
# Resolve only the source-scoped identity, independently of whether an edge is
# alleged, disputed or established. Do not turn an unnamed supplier into a firm.
identity_resolution = {
    'mod': (True, 'The Ministry of Defence is explicitly identified in its FY2026–27 budget release; this resolves the Union ministry, not any individual officer.'),
    'capital': (True, 'Exact FY2026–27 Union Budget Demand 21, Capital Outlay on Defence Services. This is a budget programme node, not a supplier or bank account.'),
    'revenue': (True, 'Exact FY2026–27 Union Budget Demand 20, Defence Services Revenue. This is a budget programme node, not a supplier or payment recipient.'),
    'civil': (True, 'Exact FY2026–27 Union Budget Demand 19, Ministry of Defence (Civil). This is a budget programme node, not a separate legal entity.'),
    'pensions': (True, 'Exact FY2026–27 Union Budget Demand 22, Defence Pensions. This resolves the accounting programme, not individual pension recipients.'),
    'army': (True, 'The Army service head is explicitly identified in the Union defence revenue demand; resolved to the Indian Army institution, without unit-level identification.'),
    'navy': (True, 'The Navy service head is explicitly identified in the Union defence revenue demand; resolved to the Indian Navy institution, without unit-level identification.'),
    'iaf': (True, 'The Air Force service head and CAG acquisition report identify the Indian Air Force; no individual unit, deployment or officer is inferred.'),
    'drdo': (True, 'The Ministry budget release names the Defence Research and Development Organisation. Laboratory and supplier identities are outside this resolution.'),
    'doo': (True, 'The budget and CAG brief identify the Directorate of Ordnance (Coordination and Services). This resolves the administrative institution, not the seven separate defence PSUs.'),
    'offsets': (True, 'The parliamentary report defines the defence offset programme and its aggregate contract ledger. Resolved only as that programme; it is not a company or a substitute for any unnamed vendor.'),
    'fleet-offset': (False, 'The 2016 parliamentary answer names a Fleet Tanker offset contract but does not identify its exact legal supplier or a unique contract identifier. This remains an unresolved contract placeholder.'),
    'harop-offset': (False, 'The 2016 parliamentary answer names a HAROP-UAV offset contract but does not identify its exact legal supplier or a unique contract identifier. No manufacturer identity is inferred from the equipment name.'),
    'pac': (True, 'PRS explicitly identifies the parliamentary Public Accounts Committee. This resolves the institution; the underlying 2026 committee report remains uninspected and its claims retain secondary-source limitations.'),
    'awil': (True, 'CAG identifies AgustaWestland International Limited, UK, as the AW101 contract counterparty. This source-scoped identity is separate from AgustaWestland Holdings and Westland Helicopters; current corporate registration is not independently audited.'),
    'aw-holdings': (True, 'Paragraph 7 of the March 2025 bail judgment names AgustaWestland Holdings Ltd in the prosecution account of a service agreement. Resolved only to that named counterparty; the transaction allegations are not judicial findings and no group-company merge is made.'),
    'whl': (True, 'Paragraph 7 of the March 2025 bail judgment separately names Westland Helicopters Ltd in the prosecution account of the WG-30 order. The named source identity does not establish payment or criminal responsibility.'),
    'global-services': (True, 'Paragraph 7 of the March 2025 bail judgment names Global Services FZE in Dubai as the alleged service-agreement counterparty. Resolution is confined to that name, jurisdiction and proceeding; ownership remains alleged and no corporate-registry audit is claimed.'),
    'global-trade': (True, 'Paragraph 7 of the March 2025 bail judgment names Global Trade & Commerce Ltd in London as the alleged WG-30 order counterparty. This is not Global Services FZE; ownership remains alleged and no corporate-registry audit is claimed.'),
    'michel': (True, 'The retained Delhi High Court decisions identify the same litigant as Christian Michel James / Christian James Michel in the linked Indian proceedings. Name-order variants are resolved within those proceedings, without deciding guilt or current custody.'),
    'pawan-hans': (True, 'The March 2025 judgment identifies Pawan Hans as the operator associated with the claimed WG-30 buyback. This resolves the named operator only; the alleged seller relationship and any actual payment remain unestablished.'),
    'ids': (False, 'CAG names IDS Infotech as a proposed offset partner, but the retained passage does not establish a full legal registration identity. Keep this audit wording unresolved rather than merge it with a similarly named registered company.'),
    'taneja': (False, 'CAG uses the wording Taneja Aerospace and Aviation Company. No company number or independent registration match was obtained; this audit-named partner remains unresolved as a legal entity.'),
    'ed': (True, 'The March 2025 judgment identifies the Directorate of Enforcement as the investigating agency in the named proceeding; no individual investigator is inferred.'),
    'delhi-hc': (True, 'The official April 2026 judgment identifies its issuing court as the Delhi High Court. This institutional resolution does not elevate allegations recited in its decisions into factual findings.'),
    'leonardo': (True, 'The issuer of the retained 2019 financial report is Leonardo S.p.A., formerly Finmeccanica. This resolves the reporting parent; it does not merge its separately named subsidiaries or attribute every subsidiary transaction to the parent.'),
    'haschke': (True, 'The Reuters report identifies Guido Ralph Haschke as the consultant in the specified Brescia proceeding. Resolution is to this reported person and proceeding; the original Italian judgment was not obtained.'),
    'brescia': (True, 'Reuters identifies the Court of Appeal of Brescia as the court in the reported Haschke outcome. This resolves the named institution; exact disposition scope remains attributed to reporting until the original judgment is inspected.'),
    'sbi': (True, 'The company guarantee statement explicitly names State Bank of India. This resolves the bank, without selecting a branch or allocating a share of the combined bond payment.'),
    'db-ag': (True, 'The company guarantee statement explicitly names Deutsche Bank AG. This resolves that bank, not other Deutsche Bank entities or a particular branch; the combined payment is not apportioned.'),
    'cag': (True, 'The retained official audit brief identifies the Comptroller and Auditor General of India as its issuer. This resolves the national audit institution.'),
    'hal': (True, 'The official CAG defence-PSU brief explicitly identifies Hindustan Aeronautics Limited in the land-monetisation finding. No buyer, valuer or beneficial owner is inferred.'),
    'hal-fmd': (True, 'CAG identifies HAL Facility Management Division in the selected land-management finding. Resolved as a HAL organisational unit, not as a separate incorporated company.'),
    'okalipuram': (True, 'CAG paragraph 2.3 identifies HAL’s 2.925-acre Okalipuram land-monetisation process and reserve revisions. This resolves that process only; plot registration, buyer identity and a completed conveyance remain unverified.'),
    'ddp': (True, 'The official CAG brief names the Department of Defence Production as the responsible administrative department. It is kept distinct from its directorate and the defence PSUs.'),
    'ofh': (True, 'CAG identifies the Ordnance Factory Hospitals network and the eight-hospital audit sample. Resolved as that institutional network, not as any individual hospital, contractor or patient.'),
}
assert set(identity_resolution) == {e['id'].rsplit(':', 1)[1] for e in data['entities']}
for e in data['entities']:
    e['resolved'], e['identityBasis'] = identity_resolution[e['id'].rsplit(':', 1)[1]]
    if e['id'].endswith(':leonardo'):
        e['label'] = 'Leonardo S.p.A. / former Finmeccanica'
    if e['id'].endswith(':okalipuram'):
        e['label'] = 'Okalipuram land monetisation process — 2.925 acres'
out=ROOT/'research/funding-investigations/streams/defence.json'
out.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:len(data[k]) for k in ['sources','entities','edges','cases','coverage','rejectedJoins','searchLog']}))
