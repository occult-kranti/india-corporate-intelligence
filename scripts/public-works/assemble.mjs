#!/usr/bin/env node
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
export const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export const SECTORS=['roads','electricity','water','hospitals','schools','police','military','recruitment','administration'];
export const RESEARCH_INPUTS=['roads-research.json','services-research.json','state-research.json','connections-research.json'];
export const EVIDENCE_MANIFESTS=[
 'research/raw/public-works/evidence/roads/manifest.json',
 'research/raw/public-works/evidence/services/sha256-manifest.json',
 'research/raw/public-works/evidence/services/reused-evidence-manifest.json',
 'evidence/state/sha256-manifest.json',
 'evidence/public-works-connections/sha256-manifest.json',
];
/** Explicitly reviewed identities, never a fuzzy-name resolver. Keep legal entities and reporting groups distinct. */
export const IDENTITY_CROSSWALK=[
 {from:'pwg-defence',to:'state-ent-mod',basis:'Both slices identify the Union Ministry of Defence, not a department or service headquarters; confirmed by both source reviewers.'},
 {from:'pwg-home',to:'state-ent-mha',basis:'Both slices identify the Union Ministry of Home Affairs, not a state home department; confirmed by both source reviewers.'},
 {from:'pwg-rajnath-singh',to:'state-ent-rajnath',basis:'Official PM roster snapshot of 25 July 2026 and MoD signing release of 1 March 2024 identify the same Union Defence Minister Rajnath Singh. Dates remain on separate role edges.'},
 {from:'state-ent-lt',to:'rw-larsen-toubro',basis:'PIB Dwarka Package 4 award of 2018 and MoD contracts release of 1 March 2024 both explicitly name Larsen & Toubro Limited, the same legal parent, not an SPV or subsidiary.'},
];
const load=path=>JSON.parse(readFileSync(`${ROOT}${path}`,'utf8'));
const hash=path=>({file:path,sha256:createHash('sha256').update(readFileSync(`${ROOT}${path}`)).digest('hex')});
const slug=value=>value.toLowerCase().replace(/[^a-z0-9]+/gu,'-').replace(/^-|-$/gu,'');
export function validateRawResearch(doc){
 const errors=[];
 for(const key of ['sources','entities','relationships','cases','rules','discovery']){
  if(doc[key]!==undefined&&!Array.isArray(doc[key])){errors.push(`${key}: array required`);continue;}
  for(const row of doc[key]??[]){
   if(!row||typeof row!=='object'){errors.push(`${key}: object record required`);continue;}
   for(const field of ['sectors','stateCodes','localityIds'])if(!Array.isArray(row[field])||row[field].some(value=>typeof value!=='string'))errors.push(`${row.id}: explicit ${field} array required`);
   if(!['national','multi-state','state','district','city','village','project','unknown'].includes(row.scope))errors.push(`${row.id}: explicit reviewed scope required`);
   if(key==='sources')for(const field of ['type','tier','retrievedAt','retrievalStatus','locator'])if(typeof row[field]!=='string'||!row[field].trim())errors.push(`${row.id}: explicit source ${field} required`);
   if(key==='entities'&&typeof row.resolved!=='boolean')errors.push(`${row.id}: explicit reviewed resolved status required`);
  }
 }
 return errors;
}
/** Buyer-label lenses, not project classifiers. Opaque department codes and ambiguous acronyms are excluded. */
export const BUYER_RULES=[
 {sector:'roads',pattern:'highways?|\\broad\\b|\\broads\\b|\\bpmgsy\\b|rural roads development',explanation:'Explicit road/highway or PMGSY public-body label. All procurements by that body, not confirmed road assets.'},
 {sector:'electricity',pattern:'nuclear power|electric power|power grid|power system|power projects|hydroelectric|tamilnadu power|jhabua power|^ntpc |^nhpc |^nhdc |^thdc |^sjvn |damodar valley|vidyut nigam|bhartiya rail bijlee',explanation:'Explicit power utility/generator or named utility label. Procurement by the utility, not electricity output or consumer supply.'},
 {sector:'water',pattern:'central water commission|central ground water board|water and power research|barrage project|national institute of hydrology|^wapcos ',explanation:'Explicit water-resource body; hydrology/research bodies do not establish drinking-water delivery.'},
 {sector:'hospitals',pattern:'hospital|medical science|department of health|health services|mental health|medical research|tata memorial|cancer institute|institute of psychiatry|medical and education and research',explanation:'Explicit healthcare institution/authority label. Includes research and purchasing, not patient outcomes or private-sector coverage.'},
 {sector:'schools',pattern:'department of higher education|university|institute of technology|institute of science education|institute of management|institute of information technology|^iit ',explanation:'Explicit higher-education body/institution label. This buyer lens mainly covers colleges; school/private-school coverage is a separate evidence gap.'},
 {sector:'police',pattern:'police|crpf|\\bbsf\\b|sashastra seema|assam rifles|central industrial security|national security guard|special protection group',explanation:'Explicit police/CAPF/security-force buyer label. Central armed police are kept separate from military procurement.'},
 {sector:'military',pattern:'military engineer|border roads|\\bmod\\b|indian air force|defence research|defence estates|integrated defence staff|indian coast guard|^army$|department of defence|munitions india|armoured vehicles|weapons and equipment|yantra india|troop comforts|india optel',explanation:'Explicit defence/services/defence-production body. Open procurement only; excludes complete defence capital acquisition and personnel expenditure.'},
 {sector:'recruitment',pattern:'union public service commission|employment and training',explanation:'Named recruitment/employment authority purchases. These are procurement records, not job vacancies, examination results or appointments.'},
 {sector:'administration',pattern:'central public works department|^cpwd$|department of posts|department of revenue|stationery office|president secretariat|institute of secretariat|directorate of printing|office of the cag',explanation:'Named general administrative buyer/public-works body. Mixed goods, services and building works; not the cost of government administration as a whole.'},
];
export function classifyBuyer(buyer,portal){return portal==='central'?BUYER_RULES.filter(rule=>new RegExp(rule.pattern,'iu').test(buyer)):[];}
export function assemblePublicWorks(){
 const aggregateFiles=['rates','quality','redflags','sample-verification'].map(name=>`research/raw/cppp/${name}.json`);
 const [rates,quality,redflags,verification]=aggregateFiles.map(load);
 const states=load('src/data/water-research.json').states;
 const sources=[],entities=[],relationships=[],cases=[],rules=[],discovery=[],localities=[];
 const researchFiles=RESEARCH_INPUTS.map(name=>`research/raw/public-works/${name}`).filter(path=>existsSync(`${ROOT}${path}`));
 const evidenceManifests=EVIDENCE_MANIFESTS.filter(path=>existsSync(`${ROOT}${path}`));
 const dimensions=row=>({sectors:row.sectors,stateCodes:row.stateCodes,localityIds:row.localityIds,scope:row.scope});
 for(const file of researchFiles){
  const doc=load(file);
  const rawErrors=validateRawResearch(doc);if(rawErrors.length)throw new Error(`${file}\n${rawErrors.join('\n')}`);
  for(const row of doc.sources??[])sources.push({...row,...dimensions(row)});
  for(const row of doc.localities??[])localities.push(row);
  for(const row of doc.entities??[])entities.push({...row,...dimensions(row)});
  for(const row of doc.relationships??[])relationships.push({fromDate:null,toDate:null,limitations:[],...row,...dimensions(row)});
  for(const row of doc.cases??[])cases.push({kind:'audit-finding',status:'review',...row,...dimensions(row)});
  for(const row of doc.rules??[])rules.push({effectiveFrom:null,effectiveTo:null,limitations:[],...row,...dimensions(row)});
  for(const row of doc.discovery??[])discovery.push({...row,...dimensions(row)});
 }
 for(const entry of IDENTITY_CROSSWALK){
  const index=entities.findIndex(entity=>entity.id===entry.from);const target=entities.find(entity=>entity.id===entry.to);
  if(index<0||!target)continue;
  const incoming=entities[index];
  for(const field of ['sectors','stateCodes','localityIds','sourceIds'])target[field]=[...new Set([...target[field],...incoming[field]])];
  target.identityBasis=`${target.identityBasis} ${incoming.identityBasis} Canonical reconciliation: ${entry.basis}`;
  target.resolved=target.resolved===true&&incoming.resolved===true;
  target.mergedIds=[...new Set([...(target.mergedIds??[]),entry.from])];
  if(!target.canonicalId&&incoming.canonicalId)target.canonicalId=incoming.canonicalId;
  if(target.scope!==incoming.scope)target.scope=target.scope==='national'||incoming.scope==='national'?'national':target.stateCodes.length>1?'multi-state':target.scope;
  entities.splice(index,1);
  for(const edge of relationships){if(edge.from===entry.from)edge.from=entry.to;if(edge.to===entry.from)edge.to=entry.to;}
 }
 const common={sectors:SECTORS,stateCodes:[],localityIds:[],scope:'national'};
 const commonLimit='Historical scrape of unknown completeness. All 40 sampled stored portal URLs had expired; row-level agreement with government records remains unknown. No figure is a national procurement statistic.';
 sources.push({id:'pw-cppp-aggregate',title:'CPPP historical award scrape — retained aggregate analysis',url:'https://huggingface.co/datasets/rumourscape/tenders',publisher:'rumourscape re-publication of CPPP scrape; repository calculations',publishedAt:null,period:'Scrape spanning 2011 to mid-2026; includes invalid date values, not a clean five-year cohort',retrievedAt:'2026-10-06',retrievalStatus:'Committed aggregates and original pipeline inspected; original 3.45 GB Arrow files not present in this workspace',locator:'scripts/cppp/README.md; research/raw/cppp/rates.json, quality.json, redflags.json and sample-verification.json',summary:'Buyer-level historical bid-count aggregates, explicit deduplication and data-quality defects. New sector lenses classify public-body labels; they do not re-read raw tender rows.',limitations:[commonLimit,'Supplier names are not CINs, contracts, assets or identity-resolved political links.','Underlying republisher labels CC-BY-4.0; it did not publish its scraper and cannot establish completeness or government endorsement.'],type:'dataset',tier:'reported',...common});
 sources.push({id:'pw-cppp-portal',title:'Central Public Procurement Portal — tender and award discovery',url:'https://eprocure.gov.in/cppp/',publisher:'Government of India / National Informatics Centre',publishedAt:null,period:'Live portal; individual notices retain their own dates',retrievedAt:'2026-10-06',retrievalStatus:'Known official discovery route; individual current tender records are not included in this extension',locator:'Tender search and results of tenders; preserve tender identifiers and document versions',summary:'Search official procurement notices and results, then retrieve original notices, corrigenda, award orders and contract documents for an exact procurement process.',limitations:['A discovery link is not proof that a particular tender was downloaded or verified.','Portal coverage excludes many purchases on other systems.'],type:'portal',tier:'documented',...common});
 discovery.push({id:'pw-find-tender-process',title:'Reconstruct an official procurement process',url:'https://eprocure.gov.in/cppp/',summary:'Use a tender ID and buyer to collect the notice, every corrigendum, cancellation/retender decision and award. Asset and payment records usually require separate disclosure.',sourceIds:['pw-cppp-portal'],steps:['Record the exact buyer, portal and tender ID; save dated original documents.','Link corrigenda and retenders to their prior notice rather than counting each as new work.','Separate estimate, award, variations, measurement book, invoice, payment and completion.','Record road chainage/bridge asset ID or institution/site ID before any repeat-work comparison.'],limitations:['A missing portal result is a retrieval gap, not proof that an award did not exist.'],...common});
 const buyers=rates.byOrganisation.flatMap(row=>{const matched=classifyBuyer(row.key,row.portal);return matched.length?[{id:`pw-buyer-${slug(row.portal)}-${slug(row.key)}`,buyer:row.key,portal:row.portal,n:row.n,singleBidder:row.singleBidder,singleBidderPct:row.singleBidderPct,wilson95:row.wilson95,classificationBasis:matched.map(rule=>rule.explanation).join(' '),sourceIds:['pw-cppp-aggregate'],period:'Historical buyer aggregate, 2011–mid-2026; no matched project/date cohort',tier:'reported',sectors:matched.map(rule=>rule.sector),stateCodes:[],localityIds:[],scope:'national'}]:[];}).sort((a,b)=>b.n-a.n||a.id.localeCompare(b.id));
 // Normalised labels can collide (e.g. Ltd vs Ltd.); IDs retain a stable exact-label digest.
 for(const row of buyers)row.id+=`-${createHash('sha256').update(row.buyer).digest('hex').slice(0,8)}`;
 const repeat=redflags.indicators.find(row=>row.indicator==='repeatSingleBidderMarkedWinners');
 cases.push({id:'pw-repeated-work-boundary',title:'Recurring winners are not repeated physical work',summary:`Across the whole retained dataset, not this sector, the scrape records ${repeat.repeatPairs.toLocaleString('en-IN')} buyer–marked-winner pairs with at least five single-bidder awards, among ${repeat.pairs.toLocaleString('en-IN')} observed buyer–marked-winner pairs. These are recurring text labels, not identity-resolved contractors or duplicate asset payments.`,sourceIds:['pw-cppp-aggregate'],attribution:'Repository CPPP aggregate pipeline; third-party scrape, reported tier',response:'No allegation against a contractor is made; suppliers are not named in this aggregate indicator.',alternativeExplanations:['Lawful rate contracts, OEM supply and specialised local markets create recurring buyers and suppliers.','Different assets, lots, maintenance cycles or project stages can share a winner.','Portal bucket IDs and repeated extracts can resemble repeated contracts.'],falsifier:'Close a duplicate-work claim if matched asset IDs, chainage, bills of quantities, contract versions, measurement books and payments establish distinct work, a correction or a lawful maintenance cycle.',kind:'analytic-question',status:'not-assessable',...common});
 const coverage=SECTORS.map(sector=>{const selected=buyers.filter(row=>row.sectors.includes(sector));return {sector,buyers:selected.length,awardsWithUsableBidCount:selected.reduce((sum,row)=>sum+row.n,0),curatedCases:cases.filter(row=>row.sectors.includes(sector)&&row.kind!=='methodology').length,sources:sources.filter(row=>row.sectors.includes(sector)).length,relationships:relationships.filter(row=>row.sectors.includes(sector)).length,limitations:[commonLimit,'Buyer classification is a navigation aid; it includes unrelated purchases by each body. Lenses overlap and must not be summed.','No exact asset-level, local-village or private-sector procurement census is available here.',...(sector==='schools'?['Historical buyer lens mainly covers higher education; school cases and private funding need separate evidence.']:sector==='recruitment'?['Recruitment-body purchases are not vacancy, applicant, selection or appointment records.']:sector==='military'?['Open tenders do not cover the defence budget, classified procurement or all capital acquisition.']:[])]};});
 const provenance=rates.provenance;
 return {updatedAt:'2026-10-06',states,localities,sources,entities,relationships,cases,rules,discovery,buyers,coverage,dataset:{asOf:provenance.asOf,rawRows:provenance.rows,afterDedupRows:provenance.afterDedupRows,removedRows:provenance.rows-provenance.afterDedupRows,distinctTenderIds:provenance.distinctTenderIds,usableBidCountAwards:rates.denominatorN,verificationSample:verification.rows.length,unavailableRows:verification.pageGone,sampleAsOf:verification.asOf,verifiedRows:verification.rows.filter(row=>Object.values(row.verdicts).every(value=>value==='match')).length,period:'2011–mid-2026, historical scrape with invalid date values; not a five-year matched cohort',tier:'reported',scope:commonLimit,dedupRule:provenance.dedupRule,sourceIds:['pw-cppp-aggregate'],limitations:[commonLimit,'No original Arrow files were downloaded or scanned for this extension. Sector views are derived from retained buyer aggregates.','Public-body names are a classification basis; they are not work-site geography. Central-portal buyers remain national context under state filters.','Bid counts, contract values, completion, payment and physical outcomes are distinct.','No national, inter-sector or cross-state misconduct ranking can be inferred from these unequal historical populations.'],repeatWork:{status:'not-assessable',title:'Repeat work needs asset and payment records',summary:'Existing aggregate repeat-pair counts concern recurring buyer–winner labels. Repeated physical work, duplicate payment and notice republication cannot be distinguished from these aggregates.',missingFields:['Exact asset/road chainage or institution/site identifier','Stable contract and lot identifiers','Original notice, correction and cancellation links','Matched work scope and bill of quantities','Measurement book, payment and completion records','Maintenance cycle, defect-liability and variation orders'],repeatPairCount:repeat.repeatPairs,pairDenominator:repeat.pairs,repeatAwardCount:repeat.count,awardDenominator:repeat.familySize,innocentReading:repeat.innocentReading},inputs:[...aggregateFiles,...researchFiles,...evidenceManifests,'src/data/water-research.json'].map(hash),originalArrowInputs:provenance.inputs},quality:[{label:'Rows removed by deduplication',count:quality.headline.dedupRemoved,denominator:quality.headline.rows,meaning:'Repeated extracts under the stated tender/bidder/AOC key; not proven repeated physical work.'},{label:'Rows sharing a tender ID',count:quality.headline.rowsSharingATenderId,denominator:quality.headline.rows,meaning:'Includes multiple lots and organisation/year bucket IDs. A shared ID does not identify one contract.'},{label:'Bid counts missing',count:quality.headline.bidsNull,denominator:quality.headline.rows,meaning:'Missing is not zero bids; stage and extraction gaps remain.'},{label:'AOC before closing date',count:quality.headline.aocBeforeClosing,denominator:quality.headline.rows,meaning:'Chronology defect in raw data; excluded from the comparable timing analysis.'},{label:'Sampled portal pages expired',count:verification.pageGone,denominator:verification.rows.length,meaning:'Stored tokenised pages could not be verified; agreement with official records is unknown.'}],methodology:['Historical procurement aggregates, current discovery routes, dated audits and legal rules remain separate evidence layers.','A source-backed relationship is not an allegation of influence. No names-only join to supplier, director or politician identities is permitted.','Rule publication, effective date, contract date and official tenure must be checked separately; unknown dates block a breach inference.','All issue cases retain the source attribution, reply, alternative explanation and falsifier.','No comparison with unmatched geography, procurement stage, time period, work scope or institution management becomes a misconduct score.'],classificationRules:BUYER_RULES,identityCrosswalk:IDENTITY_CROSSWALK};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const data=assemblePublicWorks();const output=`${JSON.stringify(data,null,2)}\n`;const path=`${ROOT}src/data/public-works-research.json`;
 if(process.argv.includes('--check')){if(!existsSync(path)||readFileSync(path,'utf8')!==output){console.error('Public works assembly is stale');process.exitCode=1;}else console.log('Public works assembly matches retained inputs');}
 else {writeFileSync(path,output);console.log(`Assembled ${data.sources.length} sources, ${data.buyers.length} historical buyer rows, ${data.cases.length} cases, ${data.relationships.length} relationships`);}
}
