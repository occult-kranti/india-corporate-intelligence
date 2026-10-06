import compact from './procurement-trails.json';
import type {Concentration,ConcentrationRow,Portal} from './cppp';
import type {InvestigationGeography,InvestigationRawSlice,InvestigationRecord} from './investigation';

export interface ProcurementBidRate {n:number;singleBidder:number;pct:number;wilson95:number[];denominator:string}
export interface ProcurementConcentration {
 namedPlausibleAwards:number;namedPlausibleValueInr:number;markedAwards:number;unmarkedAwards:number;
 markedSharePct:number;unmarkedShareOfValuePct:number;distinctMarkedLabels:number;
 hhiMarkedCount:number|null;hhiMarkedValue:number|null;topMarkedShareOfValuePct:number|null;topMarkedShareOfCountPct:number|null;
}
export interface ProcurementTrail {
 id:string;reviewedBuyerId:string;buyer:string;portal:Portal;snapshot:string;buyerRule:string;computedAt:string;period:string;
 sectors:string[];stateCodes:string[];scope:'national'|'state'|'unknown';classificationBasis:string;
 sourceIds:string[];bidRate:ProcurementBidRate;concentration:ProcurementConcentration|null;
 concentrationStatus:'available'|'outside-retained-concentration-family';
}
export interface ProcurementSupplierLabel {label:string;awards:number;valueInr:number;identityStatus:'dataset-label-only'}
export interface ProcurementTrailDetails {
 trail:ProcurementTrail;family:string;namingRule:string;innocentReading:string;labels:ProcurementSupplierLabel[];
 missingStages:string[];limitations:string[];
}

export const PROCUREMENT_TRAIL_NAMESPACE='procurement-trails';
export const PROCUREMENT_TRAIL_PERIOD='2011–mid-2026 historical scrape; unmatched buyer aggregate';
export const PROCUREMENT_TRAIL_METADATA={...compact,buyers:undefined};
export const PROCUREMENT_TRAIL_SCOPE=compact.scope;
const LIMITATIONS=[
 compact.scope,
 'Historical dataset-only award aggregates; all 40 sampled stored portal URLs were unavailable on 2026-09-26. Agreement with official records is unknown.',
 'The bid-count denominator, named plausible-value family and marked-label subset differ. Neither concentration nor the selected trail cohort represents all procurement.',
 'Supplier strings are dataset labels, not resolved legal entities. No name-only supplier, director or political joins are made.',
 'An award value is not a payment, expenditure or completed work. Asset IDs, bills of quantities, measurement books and payment records are absent.',
 'Buyer jurisdiction is collection context, not the location or delivery of work. The historical period is not a matched year or project cohort.',
];
const sourceIds=['cppp-portal','sarthak-publication','hf-conversion','hf-awards','cppp-aggregates','reviewed-buyer-scope'];
export const PROCUREMENT_TRAIL_SOURCES:InvestigationRawSlice['sources']=[
 {id:'cppp-portal',title:'Central Public Procurement Portal — original publishing portal',url:'https://eprocure.gov.in/cppp/',publisher:'Government of India / NIC',publishedAt:null,retrievedAt:null,locator:'Original portal named in the archived dataset card; retained verification sample 2026-09-26',summary:'The original publication layer. Stored result links were tokenised and all 40 sampled links were unavailable.',tier:'reported',limitations:['Source attribution is not independent validation of each award.']},
 {id:'sarthak-publication',title:'Sarthak Sidhant — CPPP scrape publication',url:'https://tender.sarthaksidhant.com/',publisher:'Sarthak Sidhant',publishedAt:null,retrievedAt:'2026-10-06',locator:'research/raw/tender-portal-audit/evidence/portal-home.receipt.json',summary:'The corpus publisher named by the Hugging Face dataset card.',tier:'reported',limitations:['Underlying source licensing and crawl completeness remain unresolved.']},
 {id:'hf-conversion',title:'Rohan Verma — award conversion recipe',url:'https://gist.github.com/rhnvrm/8060dedb15ae592dae492ec62f725c0c/593ed6da09866ca75bd016fecd863546a4c48df2',publisher:'Rohan Verma (rhnvrm)',publishedAt:null,retrievedAt:'2026-10-06',locator:'conversion-gist.json and conversion-gist.receipt.json; revision 593ed6da09866ca75bd016fecd863546a4c48df2',summary:'Recipe linked by the HF card: award listings join to award details within the award stage, then fields are parsed. It does not join notices to awards.',tier:'reported',limitations:['The observed recipe does not prove it produced the retained Arrow bytes; prefix hashes and that lineage limit remain explicit.']},
 {id:'hf-awards',title:'rumourscape/tenders — retained award mirror',url:'https://huggingface.co/datasets/rumourscape/tenders/tree/401d093cc74d7a05e7d48326c1bc11edb289d7bb',publisher:'rumourscape / Hugging Face',publishedAt:null,retrievedAt:'2026-10-06',locator:`Observed HF revision 401d093cc74d7a05e7d48326c1bc11edb289d7bb; retained Arrow SHA-256 prefixes ${compact.arrowInputs.map(row=>row.sha256_16).join(', ')}; remote full LFS hashes in hf-tree.json`,summary:'Award-only data used by the retained SQL pipeline. HF asserts CC-BY-4.0; underlying portal licensing remains unresolved.',tier:'reported',limitations:['Remote full LFS hashes match retained byte sizes and SHA-256 prefixes. Historical Arrow inputs were not locally rehashed in full during this lineage audit.']},
 {id:'cppp-aggregates',title:'Retained CPPP rate and concentration SQL outputs',url:'https://github.com/occult-kranti/india-corporate-intelligence/tree/codex/education-funding-intelligence/scripts/cppp',publisher:'India Corporate Intelligence research',publishedAt:null,retrievedAt:'2026-10-06',locator:`research/raw/cppp/{rates,concentration,provenance}.json; ${compact.generatedBy}; computed ${compact.computedAt}; exact input hashes in procurement-trails.json`,summary:'Deterministic buyer aggregates joined by exact portal and buyer labels under the retained snapshot and buyer rule.',tier:'reported',limitations:LIMITATIONS},
 {id:'reviewed-buyer-scope',title:'Reviewed public-works buyer classifications',url:'https://github.com/occult-kranti/india-corporate-intelligence/blob/codex/education-funding-intelligence/scripts/public-works/assemble.mjs',publisher:'India Corporate Intelligence research',publishedAt:null,retrievedAt:'2026-10-06',locator:'src/data/public-works-research.json buyers; exact source file digest in procurement-trails.json',summary:compact.scope,tier:'analytic',limitations:['Classification is based on reviewed public-body labels, not asset geography or a complete sector census.']},
];

export const PROCUREMENT_TRAILS:ProcurementTrail[]=compact.buyers.map(row=>({
 ...row,portal:row.portal as Portal,scope:row.scope as ProcurementTrail['scope'],snapshot:compact.snapshot,buyerRule:compact.buyerRule,computedAt:compact.computedAt,period:PROCUREMENT_TRAIL_PERIOD,
 sourceIds:[...sourceIds],bidRate:{...row.bidRate,denominator:compact.rateDenominator},
 concentrationStatus:row.concentration?'available':'outside-retained-concentration-family',
}));
const byId=new Map(PROCUREMENT_TRAILS.map(row=>[row.id,row]));
export const getProcurementTrail=(id:string)=>byId.get(id);
export const getProcurementTrailByBuyer=(portal:Portal,buyer:string)=>PROCUREMENT_TRAILS.find(trail=>trail.portal===portal&&trail.buyer===buyer);
export const findProcurementTrail=(portal:string,buyer:string)=>PROCUREMENT_TRAILS.find(trail=>trail.portal===portal&&trail.buyer===buyer);
export const procurementTrailRecordId=(id:string)=>`${PROCUREMENT_TRAIL_NAMESPACE}:record:${id}`;
export const getProcurementTrailForRecord=(recordId:string)=>recordId.startsWith(`${PROCUREMENT_TRAIL_NAMESPACE}:record:`)?getProcurementTrail(recordId.slice(`${PROCUREMENT_TRAIL_NAMESPACE}:record:`.length)):undefined;
export const procurementTrailHref=(id:string)=>`/public-works?trail=${encodeURIComponent(id)}`;

export function procurementTrailGeography(trail:ProcurementTrail):InvestigationGeography[]{
 const national=trail.portal==='central';
 return [{scope:national?'national':trail.stateCodes.length?'state':'unknown',stateCodes:national?[]:trail.stateCodes,localityIds:[],basis:national?'national-context':trail.stateCodes.length?'state-association':'unknown',note:national?'Central buyer collection context; no location of work or service delivery is inferred.':'State-portal buyer jurisdiction only; not asset, supplier-address or service-delivery geography.',sourceIds:trail.sourceIds}];
}
const sectorDomain:Record<string,string>={electricity:'energy',water:'water',hospitals:'welfare',schools:'education',police:'security',military:'security',recruitment:'governance',administration:'governance'};
function cohortSummary(trail:ProcurementTrail){
 const c=trail.concentration;
 return `${trail.bidRate.singleBidder.toLocaleString('en-IN')} single-bid awards among ${trail.bidRate.n.toLocaleString('en-IN')} awards with 1–1,000 reported bids (${trail.bidRate.pct}%; Wilson 95% ${trail.bidRate.wilson95.join('–')}%). ${c?`${c.namedPlausibleAwards.toLocaleString('en-IN')} named plausible-value awards: ${c.markedAwards.toLocaleString('en-IN')} marked and ${c.unmarkedAwards.toLocaleString('en-IN')} unmarked (${c.markedSharePct}% marked coverage). Marked-subset HHI: count ${c.hhiMarkedCount??'unavailable'}, value ${c.hhiMarkedValue??'unavailable'}, on a 0–10,000 scale. Reported award-value sum ₹${c.namedPlausibleValueInr.toLocaleString('en-IN')} across the named plausible-value family; unmarked value share ${c.unmarkedShareOfValuePct}%. This is not a payment total.`:'Concentration is outside the retained family; unavailable, not zero.'}`;
}
export const PROCUREMENT_TRAIL_RECORDS:InvestigationRawSlice['records']=PROCUREMENT_TRAILS.map(trail=>({
 id:trail.id,title:`${trail.buyer} — procurement cohort`,summary:cohortSummary(trail),
 kind:'procurement-cohort',tier:'reported',status:'dataset-only-cohort',statusAsOf:trail.computedAt,fromDate:null,toDate:null,
 dateBasis:'Aggregate computed date is not an award or payment date. Historical records span 2011–mid-2026 and include invalid date values; no matched temporal cohort is asserted.',
 entityIds:[],relationshipIds:[],period:trail.period,response:'This cohort makes no allegation against a supplier or public body.',
 alternativeExplanations:[compact.concentrationInnocentReading,'Single bidding may reflect specialised supply, lawful rate contracts or thin local markets.'],
 falsifier:'Official tender, lot, bidder, value and date records can correct the reported cohort; payment and asset records are needed before assessing physical work or expenditure.',amounts:[],
 domains:[...new Set(['public-works','procurement',...trail.sectors.flatMap(sector=>sectorDomain[sector]?[sectorDomain[sector]]:[])])],layers:['procurement'],geography:procurementTrailGeography(trail),route:procurementTrailHref(trail.id),sourceIds:trail.sourceIds,limitations:[...LIMITATIONS,`Snapshot: ${trail.snapshot}; computed by ${compact.generatedBy}.`,`Buyer rule: ${trail.buyerRule}`,`Deduplication: ${compact.dedupRule}`,`Concentration family: ${compact.concentrationFamily}`,'HF asserts CC-BY-4.0; underlying source licensing remains unresolved.'],
} satisfies Omit<InvestigationRecord,'namespace'|'originalId'>));
export const PROCUREMENT_TRAIL_SLICE:InvestigationRawSlice={sources:PROCUREMENT_TRAIL_SOURCES,records:PROCUREMENT_TRAIL_RECORDS,entities:[],relationships:[],localities:[]};

/** Exact-key lazy join. No company resolver, graph edges, or unmarked names. */
export function procurementTrailDetails(trail:ProcurementTrail,data:Concentration|null):ProcurementTrailDetails|null{
 if(!data)return null;
 const row:ConcentrationRow|undefined=data.rows.find(row=>row.portal===trail.portal&&row.buyer===trail.buyer);
 if(!row)return null;
 const c=trail.concentration;
 if(!c||row.awards!==c.namedPlausibleAwards||row.markedAwards!==c.markedAwards||row.unmarkedAwards!==c.unmarkedAwards||row.valueSumInr!==c.namedPlausibleValueInr||row.hhiCount!==c.hhiMarkedCount||row.hhiValue!==c.hhiMarkedValue||data.family!==compact.concentrationFamily||data.namingRule!==compact.concentrationNamingRule)throw new Error('Concentration snapshot differs from the retained trail');
 return {trail,family:data.family,namingRule:data.namingRule,innocentReading:data.innocentReading,labels:row.winners.map(winner=>({label:winner.name,awards:winner.awards,valueInr:winner.valueInr,identityStatus:'dataset-label-only'})),missingStages:['Notice and corrigenda','Lot and asset identifiers','Measurement book and bill of quantities','Payment','Completion'],limitations:[...LIMITATIONS,'Marked-only concentration can rest on fewer than 50 marked awards even when the named plausible-value family meets its 50-award threshold.']};
}
export async function loadProcurementTrailDetails(id:string):Promise<ProcurementTrailDetails|null>{
 const trail=getProcurementTrail(id);if(!trail||!trail.concentration)return null;
 const {loadConcentration}=await import('./cppp');
 return procurementTrailDetails(trail,await loadConcentration());
}
