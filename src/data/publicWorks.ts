import research from './public-works-research.json';

export type PublicWorksSector = 'roads'|'electricity'|'water'|'hospitals'|'schools'|'police'|'military'|'recruitment'|'administration';
export type PublicWorksScope = 'national'|'multi-state'|'state'|'district'|'city'|'village'|'project'|'unknown';
export type PublicWorksTier = 'documented'|'reported'|'self-reported'|'analytic'|'alleged';
export type PublicWorksSourceType = 'document'|'dataset'|'portal'|'news'|'discussion';
export interface PublicWorksDimensions { sectors:PublicWorksSector[];stateCodes:string[];localityIds:string[];scope:PublicWorksScope }
export interface PublicWorksState {code:string;name:string}
export interface PublicWorksLocality {id:string;name:string;stateCode:string;kind:string;aliases?:string[];districtName?:string}
export interface PublicWorksSource extends PublicWorksDimensions {id:string;title:string;url:string;publisher:string;publishedAt:string|null;period:string;retrievedAt:string;retrievalStatus:string;locator:string;summary:string;limitations:string[];type:PublicWorksSourceType;tier:PublicWorksTier}
export interface PublicWorksEntity extends PublicWorksDimensions {id:string;label:string;type:'authority'|'company'|'person'|'party'|'project'|'institution'|'law'|'group';identityBasis:string;sourceIds:string[];resolved:boolean;canonicalId?:string;mergedIds?:string[]}
export interface PublicWorksRelationship extends PublicWorksDimensions {id:string;from:string;to:string;kind:string;label:string;tier:Exclude<PublicWorksTier,'self-reported'>;sourceIds:string[];fromDate:string|null;toDate:string|null;summary:string;limitations:string[];alternativeExplanations?:string[];falsifier?:string;respondsTo?:string}
export interface PublicWorksCase extends PublicWorksDimensions {id:string;title:string;summary:string;sourceIds:string[];attribution:string;response:string;alternativeExplanations:string[];falsifier:string;kind:'audit-finding'|'judicial-finding'|'reported-event'|'analytic-question'|'methodology';status:string;locator?:string;period?:string;amount?:number;valueUnit?:string;amountStage?:string;amounts?:{value:number;currency:string;unit:string;stage:string;period:string}[]}
export interface PublicWorksRule extends PublicWorksDimensions {id:string;title:string;summary:string;sourceIds:string[];effectiveFrom:string|null;effectiveTo:string|null;jurisdiction:string;applicability:string;change:string;limitations:string[];locator?:string}
export interface PublicWorksDiscovery extends PublicWorksDimensions {id:string;title:string;url:string;summary:string;sourceIds:string[];steps:string[];limitations:string[]}
export interface PublicWorksBuyer extends PublicWorksDimensions {id:string;buyer:string;portal:string;n:number;singleBidder:number;singleBidderPct:number;wilson95:number[];classificationBasis:string;sourceIds:string[];period:string;tier:'reported'}
export interface PublicWorksCoverage {sector:PublicWorksSector;buyers:number;awardsWithUsableBidCount:number;curatedCases:number;sources:number;relationships:number;limitations:string[]}
export interface PublicWorksFilters {sector?:PublicWorksSector;stateCode?:string;place?:string;q?:string;type?:PublicWorksSourceType}
export interface PublicWorksDataset {asOf:string;rawRows:number;afterDedupRows:number;removedRows:number;distinctTenderIds:number;usableBidCountAwards:number;verificationSample:number;verifiedRows:number;unavailableRows:number;sampleAsOf:string;period:string;tier:string;scope:string;dedupRule:string;sourceIds:string[];limitations:string[];repeatWork:{status:string;title:string;summary:string;missingFields:string[];repeatPairCount:number;pairDenominator:number;repeatAwardCount:number;awardDenominator:number;innocentReading:string};inputs:{file:string;sha256:string}[]}
export interface PublicWorksQuality {label:string;count:number;denominator:number;meaning:string}
interface PublicWorksData {updatedAt:string;states:PublicWorksState[];localities:PublicWorksLocality[];sources:PublicWorksSource[];entities:PublicWorksEntity[];relationships:PublicWorksRelationship[];cases:PublicWorksCase[];rules:PublicWorksRule[];discovery:PublicWorksDiscovery[];buyers:PublicWorksBuyer[];coverage:PublicWorksCoverage[];dataset:PublicWorksDataset;quality:PublicWorksQuality[];methodology:string[]}
const data=research as unknown as PublicWorksData;
export const PUBLIC_WORKS_UPDATED_AT=data.updatedAt;
export const PUBLIC_WORKS_SECTORS:{value:PublicWorksSector;label:string}[]=[{value:'roads',label:'Roads & bridges'},{value:'electricity',label:'Electricity'},{value:'water',label:'Water'},{value:'hospitals',label:'Hospitals & health'},{value:'schools',label:'Schools & colleges'},{value:'police',label:'Police'},{value:'military',label:'Military'},{value:'recruitment',label:'Recruitment'},{value:'administration',label:'Administration'}];
export const PUBLIC_WORKS_STATES=data.states;
export const PUBLIC_WORKS_LOCALITIES=data.localities;
export const PUBLIC_WORKS_SOURCES=data.sources;
export const PUBLIC_WORKS_ENTITIES=data.entities;
export const PUBLIC_WORKS_RELATIONSHIPS=data.relationships;
export const PUBLIC_WORKS_CASES=data.cases;
export const PUBLIC_WORKS_RULES=data.rules;
export const PUBLIC_WORKS_DISCOVERY=data.discovery;
export const PUBLIC_WORKS_BUYERS=data.buyers;
export const PUBLIC_WORKS_COVERAGE=data.coverage;
export const PUBLIC_WORKS_DATASET=data.dataset;
export const PUBLIC_WORKS_QUALITY=data.quality;
export const PUBLIC_WORKS_METHODOLOGY=data.methodology;
const normalize=(value:string)=>value.normalize('NFKC').toLocaleLowerCase('en-IN').trim();
type Searchable=PublicWorksDimensions&{id?:string;title?:string;label?:string;buyer?:string;summary?:string;publisher?:string;locator?:string;period?:string;applicability?:string;change?:string;attribution?:string;response?:string};
export function matchesPublicWorksFilters(item:Searchable,filters:PublicWorksFilters={}){
 if(filters.sector&&!item.sectors.includes(filters.sector))return false;
 if(filters.stateCode&&!PUBLIC_WORKS_STATES.some(state=>state.code===filters.stateCode))return false;
 if(filters.stateCode&&item.scope!=='national'&&!item.stateCodes.includes(filters.stateCode))return false;
 const places=PUBLIC_WORKS_LOCALITIES.filter(place=>item.localityIds.includes(place.id)&&(!filters.stateCode||place.stateCode===filters.stateCode));
 if(filters.place?.trim()){
  const words=normalize(filters.place).split(/\s+/u);
  if(!places.some(place=>{const text=normalize([place.name,place.districtName??'',...place.aliases??[]].join(' '));return words.every(word=>text.includes(word));}))return false;
 }
 const text=normalize([item.id??'',item.title??item.label??item.buyer??'',item.summary??'',item.publisher??'',item.locator??'',item.period??'',item.applicability??'',item.change??'',item.attribution??'',item.response??'',...places.map(place=>place.name),...PUBLIC_WORKS_STATES.filter(state=>item.stateCodes.includes(state.code)).map(state=>state.name)].join(' '));
 return !filters.q?.trim()||normalize(filters.q).split(/\s+/u).every(word=>text.includes(word));
}
const matchesSourceType=(item:{sourceIds:string[]},filters:PublicWorksFilters)=>!filters.type||item.sourceIds.some(id=>PUBLIC_WORKS_SOURCES.some(source=>source.id===id&&source.type===filters.type));
export const getPublicWorksSources=(filters:PublicWorksFilters={})=>PUBLIC_WORKS_SOURCES.filter(item=>matchesPublicWorksFilters(item,filters)&&(!filters.type||item.type===filters.type));
export const getPublicWorksCases=(filters:PublicWorksFilters={})=>PUBLIC_WORKS_CASES.filter(item=>matchesPublicWorksFilters(item,filters)&&matchesSourceType(item,filters));
export const getPublicWorksRules=(filters:PublicWorksFilters={})=>PUBLIC_WORKS_RULES.filter(item=>matchesPublicWorksFilters(item,filters)&&matchesSourceType(item,filters));
export const getPublicWorksBuyers=(filters:PublicWorksFilters={})=>PUBLIC_WORKS_BUYERS.filter(item=>matchesPublicWorksFilters(item,filters)&&matchesSourceType(item,filters));
export const getPublicWorksDiscovery=(filters:PublicWorksFilters={})=>PUBLIC_WORKS_DISCOVERY.filter(item=>matchesPublicWorksFilters(item,{sector:filters.sector,stateCode:filters.stateCode}));
export function getPublicWorksNetwork(filters:PublicWorksFilters={}){
 const entityById=new Map(PUBLIC_WORKS_ENTITIES.map(entity=>[entity.id,entity]));
 const edges=PUBLIC_WORKS_RELATIONSHIPS.filter(item=>{
  const endpoints=[entityById.get(item.from),entityById.get(item.to)];
  const searchable={...item,summary:[item.summary,...endpoints.filter(entity=>entity?.resolved).map(entity=>`${entity!.id} ${entity!.label}`)].join(' ')};
  return matchesPublicWorksFilters(searchable,filters)&&matchesSourceType(item,filters);
 });
 const ids=new Set(edges.flatMap(edge=>[edge.from,edge.to]));
 const nodes=PUBLIC_WORKS_ENTITIES.filter(item=>item.resolved&&ids.has(item.id));
 const valid=new Set(nodes.map(item=>item.id));
 return {nodes,edges:edges.filter(edge=>valid.has(edge.from)&&valid.has(edge.to)),sources:PUBLIC_WORKS_SOURCES};
}
/** A matching rule period is only temporal eligibility; the legal scope still requires review. */
export function assessRuleDate(rule:Pick<PublicWorksRule,'effectiveFrom'|'effectiveTo'>,eventDate:string|null):'date-unknown'|'predates-rule'|'after-rule'|'within-recorded-period'{
 const valid=(date:string|null)=>date!==null&&/^\d{4}-\d{2}-\d{2}$/u.test(date)&&Number.isFinite(Date.parse(`${date}T00:00:00Z`))&&new Date(`${date}T00:00:00Z`).toISOString().slice(0,10)===date;
 if(!valid(eventDate)||!valid(rule.effectiveFrom)||(rule.effectiveTo!==null&&!valid(rule.effectiveTo)))return 'date-unknown';
 if(eventDate!<rule.effectiveFrom!)return 'predates-rule';
 if(rule.effectiveTo&&eventDate!>rule.effectiveTo)return 'after-rule';
 return 'within-recorded-period';
}
export interface RepeatWorkRecord {id:string;contractId:string|null;authorityId?:string|null;locationId?:string|null;assetId:string|null;scopeId:string|null;periodStart:string|null;periodEnd:string|null;stage:'notice'|'amendment'|'award'|'payment'|'completion';cancelled?:boolean;correctsId?:string|null}
/** Structural review gate, not a fraud detector. No raw CPPP asset rows are supplied to this feature. */
export function assessRepeatedWork(records:RepeatWorkRecord[]){
 const excluded:{id:string;reason:string}[]=[];const seen=new Set<string>();const eligible:RepeatWorkRecord[]=[];
 const validDate=(date:string)=>/^\d{4}-\d{2}-\d{2}$/u.test(date)&&Number.isFinite(Date.parse(`${date}T00:00:00Z`))&&new Date(`${date}T00:00:00Z`).toISOString().slice(0,10)===date;
 for(const row of records){
  let reason='';
  if(seen.has(row.id))reason='duplicate-extract';else if(row.cancelled)reason='cancelled';else if(row.correctsId||row.stage==='amendment')reason='correction-or-amendment';else if(!['award','payment','completion'].includes(row.stage))reason='notice-is-not-work';else if(!row.contractId||!row.authorityId||!row.locationId||!row.assetId||!row.scopeId||!row.periodStart||!row.periodEnd)reason='missing-comparability-fields';else if(!validDate(row.periodStart)||!validDate(row.periodEnd)||row.periodStart>row.periodEnd)reason='invalid-period';
  seen.add(row.id);if(reason)excluded.push({id:row.id,reason});else eligible.push(row);
 }
 const comparisons:{left:string;right:string;status:'review-overlap';reason:string}[]=[];
 for(let i=0;i<eligible.length;i++)for(let j=i+1;j<eligible.length;j++){
  const a=eligible[i],b=eligible[j];
  if(a.contractId===b.contractId||a.authorityId!==b.authorityId||a.locationId!==b.locationId||a.stage!==b.stage||a.assetId!==b.assetId||a.scopeId!==b.scopeId||a.periodStart!>b.periodEnd!||b.periodStart!>a.periodEnd!)continue;
  comparisons.push({left:a.id,right:b.id,status:'review-overlap',reason:'Distinct contracts share an exact authority, location, asset, work scope, accounting stage and overlapping recorded periods. Review bills of quantities, measurements, variations, maintenance cycles and payments before drawing any conclusion.'});
 }
 return {eligible:eligible.length,excluded,comparisons,conclusion:'An overlap is a review question, not proof of repeated physical work, duplicate payment or misconduct.'};
}
const csvCell=(value:unknown)=>{let text=String(value??'');if(/^(?:\s*[=+@\-]|[\t\r])/u.test(text))text=`'${text}`;return `"${text.replace(/"/gu,'""')}"`;};
export function publicWorksSourcesCsv(sources:PublicWorksSource[]=PUBLIC_WORKS_SOURCES){
 const fields=['id','title','publisher','type','tier','publishedAt','period','retrievedAt','retrievalStatus','locator','scope','sectors','stateCodes','localityIds','summary','limitations','url'] as const;
 return [fields.join(','),...sources.map(row=>fields.map(key=>csvCell(Array.isArray(row[key])?(row[key] as string[]).join(' | '):row[key])).join(','))].join('\r\n');
}
