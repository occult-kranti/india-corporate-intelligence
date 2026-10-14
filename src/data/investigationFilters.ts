import type { InvestigationDimensions, InvestigationFilters, InvestigationRegistry, InvestigationTier } from './investigation';
export type InvestigationMatchRow=InvestigationDimensions&{id:string;label?:string;title?:string;summary?:string;entityIds?:string[];from?:string;to?:string;tier?:InvestigationTier;fromDate?:string|null;toDate?:string|null};
const exactDate=(date:string|null|undefined):date is string=>!!date&&/^\d{4}-\d{2}-\d{2}$/u.test(date)&&Number.isFinite(Date.parse(`${date}T00:00:00Z`))&&new Date(`${date}T00:00:00Z`).toISOString().slice(0,10)===date;
const normalize=(value:string)=>value.normalize('NFKC').toLocaleLowerCase('en-IN').trim();
export function matchesInvestigationDates(row:{fromDate?:string|null;toDate?:string|null},filters:InvestigationFilters={}) {
 if(filters.from&&!exactDate(filters.from)||filters.to&&!exactDate(filters.to)||filters.from&&filters.to&&filters.from>filters.to)return false;
 if(!filters.from&&!filters.to&&filters.includeUndated!==false)return true;
 const start=exactDate(row.fromDate)?row.fromDate:null,end=exactDate(row.toDate)?row.toDate:null;
 if(!start&&!end)return filters.includeUndated!==false;
 return !(filters.from&&(end??start)!<filters.from||filters.to&&(start??end)!>filters.to);
}
const coverage=new Set(['project-location','programme-coverage','institution-location']);
const association=new Set(['headquarters','constituency','state-association']);
type RegistryContext=Pick<InvestigationRegistry,'entities'|'sources'|'states'>;
const cache=new WeakMap<RegistryContext,{entities:Map<string,InvestigationRegistry['entities'][number]>;sources:Map<string,InvestigationRegistry['sources'][number]>;states:Set<string>}>();
/** One contextual predicate for map counts, case feeds, graph edges and source-led discovery. */
export function createInvestigationMatcher(registry:RegistryContext,filters:InvestigationFilters={}) {
 let index=cache.get(registry);if(!index){index={entities:new Map(registry.entities.map(row=>[row.id,row])),sources:new Map(registry.sources.map(row=>[row.id,row])),states:new Set(registry.states.map(row=>row.code))};cache.set(registry,index);}
 const {entities,sources,states}=index,query=normalize(filters.q??'').split(/\s+/u).filter(Boolean),state=filters.stateCode;
 return (row:InvestigationMatchRow)=>{
  if(!matchesInvestigationDates(row,filters))return false;
  if(filters.domains&&!filters.domains.some(domain=>row.domains.includes(domain)))return false;
  if(filters.layers&&!filters.layers.some(layer=>row.layers.includes(layer)))return false;
  if(filters.tiers&&(!row.tier||!filters.tiers.includes(row.tier)))return false;
  const endpointIds=[...(row.entityIds??[]),row.from??'',row.to??''];
  if(state){
   if(!states.has(state))return false;
   const national=filters.includeNational!==false&&row.geography.some(geo=>geo.scope==='national');
   const mode=filters.geographyMode??'all';
   const located=mode!=='associations'&&row.geography.some(geo=>coverage.has(geo.basis)&&geo.stateCodes.includes(state));
   const associated=mode!=='coverage'&&(row.geography.some(geo=>association.has(geo.basis)&&geo.stateCodes.includes(state))||endpointIds.some(id=>entities.get(id)?.geography.some(geo=>geo.stateCodes.includes(state))));
   if(!national&&!located&&!associated)return false;
  }
  if(query.length){const text=normalize([row.id,row.title??row.label??'',row.summary??'',...endpointIds.map(id=>entities.get(id)?.label??''),...row.sourceIds.map(id=>sources.get(id)?.title??'')].join(' '));if(!query.every(term=>text.includes(term)))return false;}
  return true;
 };
}
export function investigationPlacement(row:InvestigationDimensions,filters:InvestigationFilters={}) {
 if(filters.stateCode&&!row.geography.some(geo=>geo.stateCodes.includes(filters.stateCode!))&&!(filters.includeNational!==false&&row.geography.some(geo=>geo.scope==='national')))return 'entity-association';
 if(row.geography.some(geo=>geo.scope==='country'&&geo.countryCodes?.some(code=>code!=='IN')))return 'international-context';
 if(row.geography.some(geo=>geo.scope==='national'))return 'national-context';
 if(row.geography.every(geo=>geo.scope==='unknown'))return 'unknown';
 return 'recorded-geography';
}
