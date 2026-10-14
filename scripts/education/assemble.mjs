#!/usr/bin/env node
/** Deterministic, explicitly curated adapter; source research stays separate from graph quarantine. */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const read = file => JSON.parse(readFileSync(`${root}${file}`, 'utf8'));
const pub = read('research/raw/education/public-research.json');
const fund = read('research/raw/education/funding-research.json');
const stateRows = [
 ['AN','Andaman and Nicobar Islands'],['AP','Andhra Pradesh'],['AR','Arunachal Pradesh'],['AS','Assam'],['BR','Bihar'],['CH','Chandigarh'],['CG','Chhattisgarh'],['DN','Dadra and Nagar Haveli and Daman and Diu'],['DL','Delhi'],['GA','Goa'],['GJ','Gujarat'],['HR','Haryana'],['HP','Himachal Pradesh'],['JK','Jammu and Kashmir'],['JH','Jharkhand'],['KA','Karnataka'],['KL','Kerala'],['LA','Ladakh'],['LD','Lakshadweep'],['MP','Madhya Pradesh'],['MH','Maharashtra'],['MN','Manipur'],['ML','Meghalaya'],['MZ','Mizoram'],['NL','Nagaland'],['OD','Odisha'],['PY','Puducherry'],['PB','Punjab'],['RJ','Rajasthan'],['SK','Sikkim'],['TN','Tamil Nadu'],['TS','Telangana'],['TR','Tripura'],['UP','Uttar Pradesh'],['UK','Uttarakhand'],['WB','West Bengal'],
];
const states = stateRows.map(([code,name]) => ({code,name}));
const slug = text => text.toLowerCase().replaceAll('&','and').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const stateCode = name => states.find(state => slug(state.name) === slug(name))?.code;
const districtId = name => `district-UP-${slug(name)}`;
const localities = pub.districtCounts.map(row => ({id: districtId(row.geography),name:row.geography,stateCode:'UP',kind:'district'}));
localities.push({id:'district-KA-bengaluru-south',name:'Bengaluru South',stateCode:'KA',kind:'district'});
const cityRows = [['Mumbai','MH'],['Bengaluru','KA'],['Pune','MH'],['Hyderabad','TS'],['Prayagraj','UP'],['Kanpur','UP']];
localities.push(...cityRows.map(([name,code]) => ({id:`city-${code}-${slug(name)}`,name,stateCode:code,kind:'city'})));
const cityIds = names => localities.filter(p => p.kind === 'city' && names.includes(p.name)).map(p => p.id);
const allManagements = ['government','aided','private'];
const allLevels = ['school','college'];
const dims = (overrides = {}) => ({scope:'national',stateCodes:[],localityIds:[],channels:['government'],managements:[...allManagements],levels:['school'],...overrides});
const pubDimensions = {
 'ls-school-counts-2026':dims({stateCodes:states.map(s=>s.code),localityIds:localities.filter(p=>p.kind==='district'&&p.stateCode==='UP').map(p=>p.id),managements:['government']}),
 'ls-up-funding-2026':dims({scope:'state',stateCodes:['UP'],managements:['government','aided']}),
 'aishe-reports':dims({levels:['college']}),'aishe-release-2026':dims({levels:['college']}),'aishe-2023-report':dims({levels:['college']}),
 'samagra-cg-pab-2025':dims({scope:'state',stateCodes:['CG'],managements:['government','aided']}),
 'pm-shri-cabinet':dims({managements:['government']}),'pm-shri-scheme':dims({managements:['government']}),
 'pm-usha-guidelines':dims({managements:['government','aided'],levels:['college']}),'pm-usha-2025':dims({managements:['government','aided'],levels:['college']}),
 'population-projections-2020':dims({levels:allLevels}),
 'samagra-pab-index':dims({managements:['government','aided']}),
 'rte-statute':dims({managements:['private']}),
 'rte-karnataka-2026':dims({scope:'state',stateCodes:['KA'],managements:['private']}),
 'up-pairing-revision-news':dims({scope:'state',stateCodes:['UP'],managements:['government']}),
 'up-pairing-appeal-news':dims({scope:'district',stateCodes:['UP'],localityIds:[districtId('Sitapur')],managements:['government']}),
 'up-pairing-judgment-2025':dims({scope:'district',stateCodes:['UP'],localityIds:[districtId('Sitapur')],managements:['government']}),
 'karnataka-pilot-news':dims({scope:'district',stateCodes:['KA'],localityIds:['district-KA-bengaluru-south'],managements:['government']}),
 'karnataka-counterclaim-news':dims({scope:'state',stateCodes:['KA'],managements:['government']}),
 'himachal-mergers-news':dims({scope:'state',stateCodes:['HP'],managements:['government']}),
};
const sources = pub.sources.map(source => ({
 id:source.id,title:source.title,url:source.url,publisher:source.publisher,publishedAt:source.publishedDate,
 period:source.period,retrievedAt:source.retrievedAt??pub.researchAsOf,type:/News|Court reporting/.test(source.documentType)?'news':/index/.test(source.documentType)?'portal':'document',
 tier:/News|Court reporting/.test(source.documentType)?'reported':'primary',retrievalStatus:source.evidenceStatus,geographicLabel:source.geographicScope,...(source.locator?{locator:source.locator}:{}),
 ...pubDimensions[source.id]??dims(),summary:source.claims.join(' '),limitations:[...source.limitations],
}));
for (const source of fund.sources) {
 const specificStates = source.states.map(stateCode).filter(Boolean);
 // Delhi-NCR is a cross-border region, not a verified Delhi award or a city boundary.
 if (source.id === 'lighthouse-kkr-psp-2025' && specificStates.includes('DL')) specificStates.splice(specificStates.indexOf('DL'),1);
 let dimensions = dims({stateCodes:specificStates,localityIds:cityIds(source.cities),scope:specificStates.length>1?'multi-state':specificStates.length===1?'state':'national'});
 const overrides = {
  'mca-csr-data':{channels:['csr'],levels:allLevels},'mca-csr-company':{channels:['csr'],levels:allLevels},
  'fcra-fc4':{channels:['foreign','ngo'],levels:allLevels},'fcra-dashboard':{channels:['foreign','ngo'],levels:allLevels},
  'world-bank-stars-approval':{channels:['multilateral','government'],managements:['government']},
  'world-bank-stars-isr':{channels:['multilateral','government'],managements:['government']},
  'merite-cabinet':{channels:['government','multilateral'],managements:['government','aided'],levels:['college']},
  'pratham-annual-2025':{channels:['ngo','csr','government'],managements:['government'],stateCodes:[],scope:'national'},
  'educate-girls-progress-2025':{channels:['ngo'],managements:['government']},
  'educate-girls-fcra-2024':{channels:['foreign','ngo'],managements:['government']},
  'akshaya-patra-annual-2025':{channels:['government','csr','ngo','foreign'],managements:['government','aided']},
  'lighthouse-kkr-psp-2025':{channels:['foreign','private'],managements:['private']},
  'tata-trusts-annual-2025':{channels:['ngo'],levels:allLevels},'hdfc-parivartan-2025':{channels:['csr'],levels:allLevels},
  'azim-premji-university-2025':{channels:['ngo','private'],managements:['private'],levels:['college'],scope:'city'},
 };
 dimensions={...dimensions,...overrides[source.id]};
 sources.push({id:source.id,title:source.title,url:source.url,publisher:source.publisher,publishedAt:source.date,
  period:source.period,retrievedAt:source.retrieved_at,type:/portal/i.test(source.type)?'portal':'document',
  tier:/NGO|Philanthropic|Corporate|University|Investor/.test(source.type)?'self-reported':'primary',
  ...dimensions,summary:source.supported_claims.join(' '),limitations:[...source.limitations],retrievalStatus:source.verification,geographicLabel:source.scope,
 });
}
const sourceById = Object.fromEntries(sources.map(s=>[s.id,s]));
const dimensionsOf = source => Object.fromEntries(['scope','stateCodes','localityIds','channels','managements','levels'].map(key=>[key,source[key]]));
const programSeeds = [
 ['rte-reimbursement','RTE private-school reimbursements','Public reimbursement for eligible admissions in specified private unaided schools under Section 12; a Karnataka parliamentary answer supplies five years of state-level sanction and reimbursement observations.',['rte-statute','rte-karnataka-2026'],['Eligibility and payment conditions depend on applicable law and state rules.','The Karnataka amounts include Bengaluru but are not city-level amounts.','Do not add reimbursement to Samagra central releases as separate new money.'],dims({managements:['private']})],
 ['samagra-shiksha','Samagra Shiksha','Integrated school education support: track approved central shares, releases, state contributions and verified use separately.',['ls-up-funding-2026','samagra-cg-pab-2025'],['The compiled monetary records cover Uttar Pradesh only; Chhattisgarh is a planning-document example.','Component-specific eligibility applies; national scope does not prove a local award.'],dims({managements:['government','aided']})],
 ['pm-shri','PM SHRI schools','Upgrade selected existing government schools through a centrally sponsored scheme.',['pm-shri-cabinet','pm-shri-scheme','ls-up-funding-2026'],['Selection and five-year outlay are not individual-school receipts.','The included selection snapshot is November 2024.'],dims({managements:['government']})],
 ['pm-usha','PM-USHA higher education','Institutional support for eligible state government and government-aided higher education institutions.',['pm-usha-guidelines','pm-usha-2025'],['Eligibility does not establish an award.','Private unaided colleges must not be treated as eligible by default.'],dims({managements:['government','aided'],levels:['college']})],
 ['merite','MERITE technical education','A 2025–30 scheme targeting selected government and aided technical institutions, with World Bank assistance included in the total outlay.',['merite-cabinet'],['₹2,100 crore external assistance is included in the ₹4,200 crore total.','Institution targets are planned, not verified outcomes.'],null],
 ['stars','STARS','World Bank supported school-system improvement in six participating states.',['world-bank-stars-approval','world-bank-stars-isr'],['Approval and dated disbursement are stages of the same loan.','No state or city allocation is derived from the programme total.'],null],
 ['csr-projects','Corporate CSR education projects','Trace project disclosures through company reports and MCA project fields, including implementing agency and disclosed location.',['mca-csr-data','mca-csr-company','hdfc-parivartan-2025'],['Do not use a company headquarters as the beneficiary geography.','Grouped education/livelihood categories are not education-only totals.','Current application windows have not been verified.'],dims({channels:['csr'],levels:allLevels})],
 ['foreign-grants','Foreign contributions to education NGOs','Use FCRA reporting and recipient financial statements to distinguish permission, receipt and deployment.',['fcra-fc4','fcra-dashboard','educate-girls-fcra-2024'],['Registration is not a donation.','Association-wide receipt is not city or school funding.'],dims({channels:['foreign','ngo'],levels:allLevels})],
 ['girls-learning','Girls’ learning and re-enrolment','A source-backed example of NGO partnerships for enrolment, learning and second-chance education.',['educate-girls-progress-2025'],['Programme reach and enrolment are self-reported.','City monetary allocations were not verified.'],null],
 ['school-meals','School meals partnerships','Government, corporate and philanthropic funding can support meal provision through implementing organisations.',['akshaya-patra-annual-2025'],['Some reported government contributions fund Anganwadi nutrition.','Kitchen locations are not a school-recipient funding ledger.'],null],
 ['philanthropic-grants','Philanthropic grants and scholarships','Separate institutional support and direct implementation from individual educational grants.',['tata-trusts-annual-2025'],['No state or city split is validated.','Donor disbursements and recipient receipts must be deduplicated.'],null],
 ['private-education-capital','Private education services investment','An investor announcement documents KKR and PSP investment in an Indian education services platform.',['lighthouse-kkr-psp-2025'],['Transaction amount is undisclosed in the primary announcement.','Services-platform equity is distinct from school donations and regulated trust ownership.','Named city presence does not allocate investment proceeds.'],null],
 ['private-university-philanthropy','Philanthropic university sponsorship','Azim Premji University’s annual report documents a not-for-profit private university and its sponsoring foundation.',['azim-premji-university-2025'],['No contribution or scholarship amount was validated in this extraction.','This is one institutional example, not a census of private universities.'],null],
];
const programs = programSeeds.map(([id,title,summary,sourceIds,constraints,dimensions])=>({id,title,summary,sourceIds,constraints,...dimensions??dimensionsOf(sourceById[sourceIds[0]])}));
const flows=[];
for (const row of pub.fundingRecords) {
 for (const [key,stage,label] of [['approvedCentral','allocation','Approved central share'],['releasedCentral','release','Released central share']]) {
  flows.push({id:`${row.id}-${stage}`,title:`${row.programme} · Uttar Pradesh · ${label}`,summary:row.limitation,...dims({scope:'state',stateCodes:['UP'],managements:row.programme==='PM SHRI'?['government']:['government','aided']}),amount:row[key],currency:'INR',unit:'crore',stage,period:`FY ${row.fiscalYear}`,sourceIds:[row.sourceId],limitations:[row.limitation,'Approval less release is not missing money or proven underfunding.'],financialEnvelope:row.id});
 }
}
for(const row of pub.rteFundingRecords??[]) {
 for(const [key,stage,label]of [['sanctioned','allocation','Sanctioned'],['reimbursedToSchools','reimbursement','Reimbursed to schools']]) {
  flows.push({id:`${row.id}-${stage}`,title:`RTE · Karnataka · ${label}`,summary:row.limitation,...dims({scope:'state',stateCodes:['KA'],managements:['private']}),amount:row[key],currency:'INR',unit:'crore',stage,period:`FY ${row.fiscalYear}`,sourceIds:[row.sourceId],limitations:[row.limitation,'A sanctioned-to-reimbursed difference does not establish an overdue obligation or misuse.'],financialEnvelope:row.id});
 }
}
const amountTitles={
 'world-bank-stars-approval':['STARS · approved World Bank loan'],
 'world-bank-stars-isr':['STARS · disbursed to March 2024'],
 'merite-cabinet':['MERITE · total approved outlay','MERITE · included World Bank assistance'],
 'educate-girls-fcra-2024':['Educate Girls · foreign donations'],
 'akshaya-patra-annual-2025':['Akshaya Patra · government contributions','Akshaya Patra · total income'],
 'tata-trusts-annual-2025':['Tata Trusts · institutional education grants and implementation','Tata Trusts · individual education grants'],
};
const amountStages = {'Approved loan':'commitment','Reported disbursement':'release','Approved outlay':'outlay','Planned external assistance':'commitment','Reported donations':'receipt','Reported government contributions':'receipt','Reported total income':'receipt','Reported FY spend':'expenditure'};
for(const source of fund.sources) {
 for(const [index,amount] of (source.amounts??[]).entries()) {
  const record = {id:`${source.id}-amount-${index+1}`,title:amountTitles[source.id]?.[index]??amount.qualifier,summary:`${amount.status}. ${amount.qualifier}.`,...dimensionsOf(sourceById[source.id]),amount:amount.value,currency:amount.currency,unit:amount.unit,stage:amountStages[amount.status],period:source.period,sourceIds:[source.id],limitations:[...source.limitations],financialEnvelope:source.id.startsWith('world-bank-stars')?'stars-loan':source.id};
  // Annual report organisation totals do not acquire the geography of illustrative programme sites.
  if(['akshaya-patra-annual-2025','tata-trusts-annual-2025','educate-girls-fcra-2024'].includes(source.id)) Object.assign(record,{scope:'national',stateCodes:[],localityIds:[]});
  if(source.id==='akshaya-patra-annual-2025'&&index===0) record.channels=['government','ngo'];
  if(source.id==='akshaya-patra-annual-2025'&&index===1) record.limitations.push('Mixed organisation income; not a channel-specific amount.');
  if(source.id==='tata-trusts-annual-2025') record.limitations.push('Not split by school/college or management category; filtering indicates relevance, not an amount allocated to the selected category.');
  if(source.id==='merite-cabinet'&&index===1)record.includedInFlowId='merite-cabinet-amount-1';
  if(source.id==='akshaya-patra-annual-2025'&&index===0)record.includedInFlowId='akshaya-patra-annual-2025-amount-2';
  flows.push(record);
 }
}
const schemeAmounts = [
 ['pm-shri-total','PM SHRI: five-year total project cost','pm-shri-cabinet',27360,'outlay','2022-23 to 2026-27'],
 ['pm-shri-central','PM SHRI: central share within total cost','pm-shri-cabinet',18128,'outlay','2022-23 to 2026-27','pm-shri-total'],
 ['pm-usha-outlay','PM-USHA: three-year scheme outlay','pm-usha-2025',12926.10,'outlay','2023-24 to 2025-26'],
 ['pm-usha-approved','PM-USHA: approvals in first two PAB meetings','pm-usha-2025',5613.12,'allocation','Snapshot May 2025'],
 ['pm-usha-budget','PM-USHA: annual budget','pm-usha-2025',1815,'allocation','FY 2025-26'],
];
for(const [id,title,sourceId,amount,stage,period,includedInFlowId]of schemeAmounts) flows.push({id,title,summary:sourceById[sourceId].limitations.join(' '),...dimensionsOf(sourceById[sourceId]),amount,currency:'INR',unit:'crore',stage,period,sourceIds:[sourceId],limitations:sourceById[sourceId].limitations,financialEnvelope:sourceId.startsWith('pm-shri')?'pm-shri':'pm-usha',...(includedInFlowId?{includedInFlowId}:{})});
const schoolSeries = [...pub.schoolCounts,...pub.districtCounts].map(row=>{
 const district = row.geographicLevel==='District';
 const code=row.geography==='INDIA'?'IN':stateCode(row.state);
 if(!code) throw Error(`Unmapped state ${row.state}`);
 const localityId=district?districtId(row.geography):undefined;
 return{id:district?`schools-${localityId}`:`schools-${code}`,name:row.geography==='INDIA'?'India':row.geography,stateCode:code,...(localityId?{localityId}:{}),points:Object.entries(row.counts).map(([year,value])=>({year,value})),sourceIds:[row.sourceId],management:'government',level:'school',unit:'schools',geographyId:district?localityId:`state-${code}`,ageBand:'school-system',limitations:['Reported government-school stock; this is not a count of closures.','No matched school-age population series is loaded.',district?'District boundaries must not be treated as city boundaries.':'Five annual observations from the same parliamentary annexure.']};
});
const leadDimensions = {
 'ghaziabad-access':dims({scope:'district',stateCodes:['UP'],localityIds:[districtId('Ghaziabad')],managements:['government']}),
 'jhansi-access':dims({scope:'district',stateCodes:['UP'],localityIds:[districtId('Jhansi')],managements:['government']}),
 'meghalaya-reclassification':dims({scope:'state',stateCodes:['ML'],managements:['government']}),
 'telangana-stock':dims({scope:'state',stateCodes:['TS'],managements:['government']}),
 'up-central-release':dims({scope:'state',stateCodes:['UP'],managements:['government','aided']}),
 'cg-pab-version':dims({scope:'state',stateCodes:['CG'],managements:['government','aided']}),
 'college-coverage':dims({levels:['college']}),
 'population-denominator':dims({levels:allLevels}),
};
const falsifiers = {
 'ghaziabad-access':'Close the access-loss hypothesis if school-code continuity and receiving-school records show recoding only, unchanged reachable capacity, and no increase in travel burden for the same child catchments.',
 'jhansi-access':'Reject the individual-closure interpretation if a campus-level crosswalk shows the 39 net change is accounted for by composite-school recoding or classification changes with teaching sites still operating.',
 'meghalaya-reclassification':'Resolve the reporting anomaly if cross-category school-code transitions fully account for the decrease and confirm that teaching locations and accessible seats did not disappear.',
 'telangana-stock':'Reject an access-loss interpretation if linked institution histories account for the count decrease and comparable catchments retain sufficient reachable capacity without longer journeys.',
 'up-central-release':'Close the funding-gap concern if sanction conditions, carry-forward balances and dated release ledgers reconcile the differences with no overdue eligible release.',
 'cg-pab-version':'Reject double-counting if the revision audit shows original items were superseded, spillover was carried once, and the final sanction ledger matches the revised approved plan.',
 'college-coverage':'Reject unequal coverage among eligible institutions if matched AISHE IDs and allocation records show apparent gaps arise from ineligible categories, duplicate approval units or non-response.',
 'population-denominator':'Reject the apparent demographic contradiction when same-boundary school-age population falls or stays stable despite total-population growth; otherwise obtain school-level access evidence.',
};
const leads = pub.leads.map(lead=>({id:lead.id,title:lead.title,summary:`${lead.nextStep} Not established: ${lead.claimNotEstablished}`,signal:lead.evidence,...leadDimensions[lead.id]??dims(),alternativeExplanations:lead.alternativeExplanations,falsifier:falsifiers[lead.id],sourceIds:lead.sourceIds,status:lead.id==='population-denominator'?'context':'investigate'}));
for(const item of pub.newsCases??[]) {
 const code=stateCode(item.state);
 const localityId=item.district==='Bengaluru South'?'district-KA-bengaluru-south':item.district?districtId(item.district):null;
 leads.push({id:item.id,title:item.title,summary:`Reported concern: ${item.reportedConcern} Government response: ${item.governmentResponse} Next check: ${item.nextCheck}`,signal:item.eventStatus,...dims({scope:localityId?'district':'state',stateCodes:[code],localityIds:localityId?[localityId]:[],managements:['government']}),alternativeExplanations:[item.governmentResponse,'Legal school identity, physical teaching location and administrative merger can describe different events.'],falsifier:item.killIf,sourceIds:item.sourceIds,status:'investigate'});
}
leads.push({id:'funding-double-count',title:'Follow the money once across donor and recipient accounts',summary:'Join donors, implementing organisations and institution receipts before comparing geographic education funding.',signal:'CSR, philanthropy and foreign grants can appear in both donor expenditure and recipient income statements.',...dims({channels:['csr','ngo','foreign'],levels:allLevels}),alternativeExplanations:['Two disclosures may describe the same transfer.','Programme costs may span education and other sectors.','Registered offices and project sites may differ.'],falsifier:'Unique transaction references, matched donor–recipient periods and project locations reconcile the amounts without duplicate counting.',sourceIds:['mca-csr-company','educate-girls-fcra-2024','tata-trusts-annual-2025'],status:'investigate'});
const output={
 updatedAt:pub.researchAsOf,
 methodology:[
  'This is a dated, curated evidence desk, not a census of all funding or all NGOs. Each displayed record links to the original source.',
  'Publication date, academic/fiscal reference period and retrieval date are different fields. Unknown publication dates remain unknown.',
  'A government-school stock change is openings minus removals plus reporting, management and boundary changes; it cannot identify individual closure events.',
  'Population comparisons need matching geography, boundaries, age group, period and sources. Total population growth and projected population alone cannot establish rising local demand for schools.',
  'Government approval, release, expenditure, NGO receipts, programme outlays and equity commitments are distinct stages. Monetary rows must not be summed across stages, currencies, periods or nested funding envelopes.',
  'National sources appear as context under state filters. A city/district text search matches explicit source content and mapped places; no city allocation is inferred from an organisation headquarters.',
 ],
 coverageNotes:[
  `The numeric school-stock panel covers all 36 states/UTs and all 75 Uttar Pradesh districts, plus a national aggregate, for 2021-22 to 2025-26.`,
  `The ${sources.length} source records are a bounded research collection retrieved 6 October 2026; coverage is neither exhaustive nor live.`,
  'Private and aided schools, colleges, NGOs, CSR, foreign grants and private capital have source and programme coverage; comparable institution-level funding ledgers are not yet assembled.',
  'City mentions show documented programme or platform presence. No city monetary allocation or matched city child-population series has been verified.',
  'All recorded investigation leads are questions to reconcile, not findings of corruption, unlawful closure or denied access.',
 ],states,localities,sources,programs,flows,schoolSeries,leads,
};
// Normalize research-note typography for display; original source payloads and URLs remain unchanged.
const polish = (value, key='') => {
 if(Array.isArray(value))return value.map(item=>polish(item,key));
 if(value && typeof value==='object')return Object.fromEntries(Object.entries(value).map(([name,item])=>[name,polish(item,name)]));
 if(typeof value!=='string'||key==='url')return value;
 const replacements=[['Paragraph3','Paragraph 3'],['Order16June2025','Order 16 June 2025'],['consequent24June2025','consequent 24 June 2025'],['of105','of 105'],['Question1260','Question 1260'],['Section12','Section 12'],['Section 12(1)(c)','Section 12(1)(c)'],['section2','section 2'],['FY202','FY 202'],['₹156.10crore','₹156.10 crore'],['₹148.68crore','₹148.68 crore'],['Describes2018','Describes 2018'],['retain100','retain 100'],['and120','and 120'],['HTTP404 on2026','HTTP 404 on 2026'],['paragraphs3','paragraphs 3'],['updated26July2021','updated 26 July 2021'],['least25%','least 25%']];
 for(const [before,after]of replacements)value=value.replaceAll(before,after);
 return value;
};
const rteSource=output.sources.find(source=>source.id==='rte-karnataka-2026');
rteSource.locator='PDF page 2, PRABANDH table';
rteSource.retrievalStatus='Original official PDF downloaded and independently read; archived SHA-256 recorded.';
writeFileSync(`${root}src/data/education-research.json`,`${JSON.stringify(polish(output),null,2)}\n`);
console.log(`Assembled ${sources.length} sources, ${programs.length} programmes, ${flows.length} monetary observations, ${schoolSeries.length} school series, ${leads.length} leads.`);
