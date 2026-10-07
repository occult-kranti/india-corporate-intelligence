import type { InvestigationEntity, InvestigationFilters, InvestigationRecord, InvestigationRegistry, InvestigationRelationship, InvestigationSource } from './investigation';
import { createInvestigationMatcher, matchesInvestigationDates, investigationPlacement, type InvestigationMatchRow } from './investigationFilters';
import atlasModel from '../../research/atlas-expansion/model-suggestions.json';
import sites from '../../research/raw/atlas-expansion/sites.json';
import { investigationGraphSlice, relationshipDirected, type GraphDirection } from '../components/investigation/graphHelpers';

export const ATLAS_DATE_RANGE = {from:'2011-10-06',to:'2026-10-06'} as const;
export const ATLAS_DISCOVERY_MODEL={...atlasModel,status:'executed'} as const;
export const ATLAS_NAMESPACES = ['atlas-policy','atlas-institutions','atlas-oversight','atlas-international-finance','atlas-defence-trade'] as const;
export interface AtlasSite {id:string;label:string;entityIds:string[];recordIds:string[];lon:number;lat:number;precision:'building'|'campus'|'locality';sourceIds:string[];stateCode:string;kind:'institution'|'office'|'project';coordinateNote:string}
export const ATLAS_SITES=sites as AtlasSite[];
export type AtlasSelection = {kind:'entity'|'relationship'|'record';id:string};
export interface AtlasEvidenceClosure {entities:InvestigationEntity[];relationships:InvestigationRelationship[];records:InvestigationRecord[];sources:InvestigationSource[];missingIds:string[]}
const unique=<T,>(rows:T[])=>[...new Set(rows)];
export const atlasDatePass=matchesInvestigationDates;
export function atlasRecordPass(row:InvestigationMatchRow,filters:InvestigationFilters,registry:InvestigationRegistry){return createInvestigationMatcher(registry,filters)(row);}
/** A closure packet retains the original claim and recursively linked responses even outside the active date lens. */
export function getAtlasEvidenceClosure(registry:InvestigationRegistry,selections:AtlasSelection[]):AtlasEvidenceClosure {
 const collections={entity:new Map(registry.entities.map(row=>[row.id,row])),relationship:new Map(registry.relationships.map(row=>[row.id,row])),record:new Map(registry.records.map(row=>[row.id,row]))};
 const seedEntities=new Set(selections.filter(row=>row.kind==='entity').map(row=>row.id));
 const ids={entity:new Set<string>(),relationship:new Set<string>(),record:new Set<string>()},missing=new Set<string>(),queue=[...selections,...registry.relationships.filter(row=>seedEntities.has(row.from)||seedEntities.has(row.to)).map(row=>({kind:'relationship' as const,id:row.id})),...registry.records.filter(row=>row.entityIds.some(id=>seedEntities.has(id))).map(row=>({kind:'record' as const,id:row.id}))];
 for(let index=0;index<queue.length;index++){
  const selection=queue[index];if(ids[selection.kind].has(selection.id))continue;
  const row=collections[selection.kind].get(selection.id);if(!row){missing.add(selection.id);continue;}ids[selection.kind].add(selection.id);
  if(selection.kind==='relationship'){const edge=row as InvestigationRelationship;queue.push({kind:'entity',id:edge.from},{kind:'entity',id:edge.to},...unique([...edge.recordIds,...edge.responseIds]).map(id=>({kind:'record' as const,id})));}
  if(selection.kind==='record'){const record=row as InvestigationRecord;queue.push(...record.entityIds.map(id=>({kind:'entity' as const,id})),...record.relationshipIds.map(id=>({kind:'relationship' as const,id})));}
 }
 const entities=registry.entities.filter(row=>ids.entity.has(row.id)),relationships=registry.relationships.filter(row=>ids.relationship.has(row.id)),records=registry.records.filter(row=>ids.record.has(row.id));
 const sourceIds=new Set([...entities,...relationships,...records].flatMap(row=>[...row.sourceIds,...row.geography.flatMap(geo=>geo.sourceIds)])),sourceIndex=new Set(registry.sources.map(row=>row.id));
 for(const id of sourceIds)if(!sourceIndex.has(id))missing.add(id);
 return {entities,relationships,records,sources:registry.sources.filter(row=>sourceIds.has(row.id)),missingIds:[...missing]};
}
export function exportAtlasEvidence(registry:InvestigationRegistry,selections:AtlasSelection[],filters:InvestigationFilters={}) {
 return {schemaVersion:1,exportedAt:new Date().toISOString(),registryUpdatedAt:registry.updatedAt,selections,filters,interpretation:'Source-backed evidence packet. Amount stages are distinct; response context is retained beyond active filters. Connectivity is not evidence of influence or wrongdoing.',...getAtlasEvidenceClosure(registry,selections)};
}
export function exploreAtlasGraph(registry:InvestigationRegistry,options:InvestigationFilters&{rootId?:string|null;depth?:number;direction?:GraphDirection;moneyOnly?:boolean;priorityEdgeIds?:string[]}={}) {
 const depth=Math.min(5,Math.max(1,Math.floor(options.depth??2))),direction=options.direction??'both';
 const matches=createInvestigationMatcher(registry,options);
 const filtered=registry.relationships.filter(row=>matches(row)&&(!options.moneyOnly||row.amounts.length>0));
 const matchingRecords=options.moneyOnly?[]:registry.records.filter(matches);
 const endpointIds=new Set([...filtered.flatMap(row=>[row.from,row.to]),...matchingRecords.flatMap(row=>row.entityIds)]);
 const allowStandalone=!options.moneyOnly&&!options.tiers&&!options.from&&!options.to&&options.includeUndated!==false;
 const availableEntities=registry.entities.filter(row=>row.id===options.rootId||endpointIds.has(row.id)||allowStandalone&&matches(row));
 const result=investigationGraphSlice(availableEntities,filtered,registry.sources,options.rootId??null,depth,options.priorityEdgeIds??[],undefined,direction);
 const selections=result.ledger.map(edge=>({kind:'relationship' as const,id:edge.id}));
 return {...result,depth,direction,evidence:getAtlasEvidenceClosure(registry,selections),undatedRelationships:result.ledger.filter(row=>!row.fromDate&&!row.toDate).length};
}
export type AtlasCaseCategory='allegation'|'finding'|'proceeding'|'case';
/** Classification uses declared record kind/tier/status, never a name match or ominous summary phrase. */
export function atlasCaseCategory(row:InvestigationRecord):AtlasCaseCategory|null {
 if(['relationship-record','source','response','counter-evidence','denial','withdrawn-correction','policy-change'].includes(row.kind))return null;
 const reviewedCase=row.kind==='investigation-case';
 const allegation=['allegation','filed-allegation','allegation-record','charge','indictment'].includes(row.kind)||row.tier==='alleged';
 if(allegation&&(reviewedCase||['allegation','filed-allegation','allegation-record','charge','indictment','case'].includes(row.kind)))return 'allegation';
 if(['audit-finding','judicial-finding','court-finding','finding','judgment','audit'].includes(row.kind)&&row.tier==='documented')return 'finding';
 if(['proceeding','legal-proceeding','case-outcome','court-order','order','judicial-decision','regulatory-decision','procedural-status'].includes(row.kind))return 'proceeding';
 return reviewedCase?'case':null;
}
export function getAtlasCaseFeed(registry:InvestigationRegistry,filters:InvestigationFilters={}) {
 const eligible=registry.records.map(record=>({record,category:atlasCaseCategory(record)})).filter((row):row is {record:InvestigationRecord;category:AtlasCaseCategory}=>!!row.category);
 const matches=createInvestigationMatcher(registry,filters);
 const entries=eligible.filter(({record})=>matches(record)).map(entry=>({...entry,placement:investigationPlacement(entry.record,filters)})).sort((a,b)=>(b.record.fromDate??b.record.toDate??'').localeCompare(a.record.fromDate??a.record.toDate??'')||a.record.id.localeCompare(b.record.id));
 const counts={allegation:0,finding:0,proceeding:0,case:0};for(const {category} of entries)counts[category]++;
 return {entries,counts,total:entries.length,denominator:eligible.length,undated:entries.filter(({record})=>!record.fromDate&&!record.toDate).length,national:entries.filter(({record})=>record.geography.some(geo=>geo.scope==='national')).length,international:entries.filter(({record})=>record.geography.some(geo=>geo.scope==='country'&&geo.countryCodes?.some(code=>code!=='IN'))).length,interpretation:'Counts describe retained case and finding records, not unique incidents, proven corruption, or rates of misconduct.'};
}
/** Accounting context has its own denominator: a reserve asset or financing instrument is not a case. */
export function getAtlasFinancialContext(registry:InvestigationRegistry,filters:InvestigationFilters={}) {
 const eligible=registry.records.filter(row=>['reserve-account','institution-financial-position','financing-instrument'].includes(row.kind));
 const matches=createInvestigationMatcher(registry,filters);
 const entries=eligible.filter(matches).map(record=>({record,placement:investigationPlacement(record,filters)})).sort((a,b)=>(b.record.fromDate??b.record.toDate??'').localeCompare(a.record.fromDate??a.record.toDate??'')||a.record.id.localeCompare(b.record.id));
 return {entries,total:entries.length,denominator:eligible.length,interpretation:'Financial context records describe financing instruments, reserve assets and institutional positions. They are counted separately from cases, allegations and findings; an allocation or commitment is not a cash payment.'};
}
export function getAtlasPolicyTimeline(registry:InvestigationRegistry,filters:InvestigationFilters={}) {
 return registry.records.filter(row=>row.kind==='policy-change'&&atlasRecordPass(row,{...filters,from:filters.from??ATLAS_DATE_RANGE.from,to:filters.to??ATLAS_DATE_RANGE.to},registry)).sort((a,b)=>(a.fromDate??a.toDate??'9999').localeCompare(b.fromDate??b.toDate??'9999')||a.id.localeCompare(b.id));
}
export function validateAtlasSites(registry:InvestigationRegistry,sites:AtlasSite[]) {
 const errors:string[]=[],ids=new Set<string>(),entities=new Map(registry.entities.map(row=>[row.id,row])),records=new Set(registry.records.map(row=>row.id)),sources=new Set(registry.sources.map(row=>row.id));
 for(const site of sites){
  if(ids.has(site.id))errors.push(`${site.id}: duplicate site identity`);ids.add(site.id);
  if(!Number.isFinite(site.lon)||Math.abs(site.lon)>180||!Number.isFinite(site.lat)||Math.abs(site.lat)>90)errors.push(`${site.id}: invalid coordinates`);
  if(!site.sourceIds.length||site.sourceIds.some(id=>!sources.has(id)))errors.push(`${site.id}: coordinate source is unavailable`);
  if(!site.entityIds.length||site.entityIds.some(id=>!entities.has(id)||entities.get(id)?.type==='person'))errors.push(`${site.id}: public facility identity required; people cannot anchor a site`);
  if(site.recordIds.some(id=>!records.has(id)))errors.push(`${site.id}: unknown site record`);
  if(!site.coordinateNote.trim()||!['building','campus','locality'].includes(site.precision))errors.push(`${site.id}: coordinate precision and source basis required`);
  if(!registry.states.some(state=>state.code===site.stateCode))errors.push(`${site.id}: unknown state`);
 }
 return errors;
}

export interface AtlasTrailStep {relationship:InvestigationRelationship;fromId:string;toId:string;reversed:boolean}
/** Shortest exact trails over valid retained edges. No response, similarity or comparison can supply a missing hop. */
export function findAtlasTrails(registry:InvestigationRegistry,options:InvestigationFilters&{fromId:string;toId:string;depth?:number;direction?:GraphDirection;moneyOnly?:boolean}) {
 const exploration=exploreAtlasGraph(registry,{...options,rootId:options.fromId});
 const traversable=exploration.ledger.filter(row=>row.tier!=='analytic'&&!['contra','supersede','response','denial','analytic','comparison'].includes(row.kind));
 const adjacency=new Map<string,AtlasTrailStep[]>();
 for(const edge of traversable){
  if(exploration.direction!=='incoming'||!relationshipDirected(edge.kind)){const list=adjacency.get(edge.from)??[];list.push({relationship:edge,fromId:edge.from,toId:edge.to,reversed:false});adjacency.set(edge.from,list);}
  if(exploration.direction!=='outgoing'||!relationshipDirected(edge.kind)){const list=adjacency.get(edge.to)??[];list.push({relationship:edge,fromId:edge.to,toId:edge.from,reversed:relationshipDirected(edge.kind)});adjacency.set(edge.to,list);}
 }
 const exists=new Set(registry.entities.map(row=>row.id)),distance=new Map<string,number>([[options.fromId,0]]),parents=new Map<string,AtlasTrailStep[]>(),queue=[options.fromId];
 if(!exists.has(options.fromId)||!exists.has(options.toId))return {paths:[] as AtlasTrailStep[][],truncated:false,reason:'One or both exact identities are unavailable.'};
 for(let index=0;index<queue.length;index++){
  const id=queue[index],depth=distance.get(id)!;if(depth>=exploration.depth)continue;
  for(const step of adjacency.get(id)??[]){const known=distance.get(step.toId);if(known===undefined){distance.set(step.toId,depth+1);parents.set(step.toId,[step]);queue.push(step.toId);}else if(known===depth+1)parents.get(step.toId)!.push(step);}
 }
 const paths:AtlasTrailStep[][]=[];let truncated=false;
 const trace=(id:string,steps:AtlasTrailStep[])=>{if(paths.length>=3){truncated=true;return;}if(id===options.fromId){paths.push([...steps].reverse());return;}for(const step of parents.get(id)??[])trace(step.fromId,[...steps,step]);};
 if(distance.has(options.toId))trace(options.toId,[]);
 return {paths,truncated,reason:paths.length?'Each step names an exact retained relationship. An ownership or identity bridge is not a payment; the path is not evidence of influence.':`No recorded trail within ${exploration.depth} hops and these filters. Missing evidence is not proof that no relationship exists.`};
}

/** Exact verified sites only; an out-of-state national-context case cannot relocate a campus. */
export function getAtlasVisibleSites(registry:InvestigationRegistry,filters:InvestigationFilters={}) {
 const entities=new Map(registry.entities.map(row=>[row.id,row])),records=new Map(registry.records.map(row=>[row.id,row])),sources=new Map(registry.sources.map(row=>[row.id,row]));
 return ATLAS_SITES.filter(site=>{
  if(filters.stateCode&&site.stateCode!==filters.stateCode)return false;
  if(site.sourceIds.some(id=>!sources.has(id))||site.entityIds.some(id=>!entities.has(id)))return false;
  const matchFilters={...filters,stateCode:undefined};
  if(site.recordIds.length)return site.recordIds.some(id=>{const record=records.get(id);return record&&atlasRecordPass(record,matchFilters,registry);});
  return site.entityIds.some(id=>{const entity=entities.get(id);return entity&&atlasRecordPass(entity,matchFilters,registry);});
 }).map(site=>({...site,sourceLabel:site.sourceIds.map(id=>sources.get(id)?.title).filter(Boolean).join(' · '),sourceUrl:sources.get(site.sourceIds[0])?.url}));
}

/** Alleged relationships are a separate retained-link population, never counted as cases or findings. */
export function getAtlasAllegedLinks(registry:InvestigationRegistry,filters:InvestigationFilters={}) {
 const eligible=registry.relationships.filter(row=>row.tier==='alleged'),matches=createInvestigationMatcher(registry,filters);
 const entries=eligible.filter(matches).map(relationship=>({relationship,placement:investigationPlacement(relationship,filters)})).sort((a,b)=>(b.relationship.fromDate??b.relationship.toDate??'').localeCompare(a.relationship.fromDate??a.relationship.toDate??'')||a.relationship.id.localeCompare(b.relationship.id));
 return {entries,total:entries.length,denominator:eligible.length,interpretation:'Alleged links are sourced assertions, not findings, unique cases or proven wrongdoing. Inherited citations are not newly verified by inclusion here.'};
}
