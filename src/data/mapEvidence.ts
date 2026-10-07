import type { InvestigationEntity, InvestigationFilters, InvestigationRecord, InvestigationRegistry, InvestigationRelationship, InvestigationTier } from './investigation';
import { createInvestigationMatcher } from './investigationFilters';
import { exploreAtlasGraph, getAtlasEvidenceClosure, getAtlasVisibleSites, type AtlasSelection, type AtlasSite } from './atlasInvestigation';
import { relationshipDirected, type GraphDirection } from '../components/investigation/graphHelpers';

export type MapEvidenceSelection = {kind:'state'|'site'|'entity'|'relationship';id:string};
export interface MapEvidenceCounts {entities:number;records:number;relationships:number;sources:number}
export interface MapEvidencePopulation {entityIds:string[];recordIds:string[];relationshipIds:string[];sourceIds:string[];counts:MapEvidenceCounts}
export interface MapEvidenceStateHub extends MapEvidencePopulation {
 id:string;stateCode:string;label:string;placement:'schematic-state-association';coverageRecordIds:string[];associationRecordIds:string[];qualification:string;
}
export interface MapEvidenceSite extends AtlasSite {placement:'verified-public-site';sourceLabel?:string;sourceUrl?:string}
export interface MapEvidenceTrail {
 id:string;fromEntityId:string;toEntityId:string;fromPlacementId?:string;toPlacementId?:string;fromPlacementIds:string[];toPlacementIds:string[];
 relationshipIds:string[];sourceIds:string[];responseIds:string[];label:string;direction:'directed'|'undirected';tier:InvestigationTier;status:string;qualification:string;
}
export interface MapEvidenceScene {
 stateHubs:MapEvidenceStateHub[];sites:MapEvidenceSite[];trails:MapEvidenceTrail[];
 populations:{national:MapEvidencePopulation;international:MapEvidencePopulation;unplaced:MapEvidencePopulation};counts:MapEvidenceCounts;
 selectedEntityId:string|null;selectedPlacementId:string|null;interpretation:string[];
}
export interface MapEvidenceOptions {selectedEntityId?:string|null;selectedPlacementId?:string|null;depth?:number;direction?:GraphDirection}
type EvidenceRow=InvestigationEntity|InvestigationRecord|InvestigationRelationship;
const unique=(ids:string[])=>[...new Set(ids)];
const coverageBases=new Set(['project-location','programme-coverage','institution-location']);
const associationBases=new Set(['headquarters','constituency','state-association']);
const references=(row:EvidenceRow)=>unique([...row.sourceIds,...row.geography.flatMap(geo=>geo.sourceIds)]);

/** Every visible map object is an index into retained evidence, never an inferred entity coordinate. */
export function buildMapEvidenceScene(registry:InvestigationRegistry,filters:InvestigationFilters={},options:MapEvidenceOptions={}):MapEvidenceScene {
 const matches=createInvestigationMatcher(registry,filters),sourceIds=new Set(registry.sources.map(row=>row.id));
 const supported=(row:EvidenceRow)=>row.sourceIds.length>0&&references(row).every(id=>sourceIds.has(id));
 const entityIndex=new Map(registry.entities.filter(row=>row.resolved&&supported(row)).map(row=>[row.id,row]));
 const relationships=registry.relationships.filter(row=>supported(row)&&entityIndex.has(row.from)&&entityIndex.has(row.to)&&matches(row));
 const records=registry.records.filter(row=>supported(row)&&row.entityIds.every(id=>entityIndex.has(id))&&matches(row));
 const usedEntities=new Set([...relationships.flatMap(row=>[row.from,row.to]),...records.flatMap(row=>row.entityIds)]);
 const standalone=!filters.from&&!filters.to&&!filters.tiers&&filters.includeUndated!==false;
 const entities=[...entityIndex.values()].filter(row=>usedEntities.has(row.id)||standalone&&matches(row));
 const population=(es:InvestigationEntity[],rs:InvestigationRecord[],edges:InvestigationRelationship[]):MapEvidencePopulation=>{
  const entityIds=unique(es.map(row=>row.id)),recordIds=unique(rs.map(row=>row.id)),relationshipIds=unique(edges.map(row=>row.id));
  const sources=unique([...es,...rs,...edges].flatMap(references));
  return {entityIds,recordIds,relationshipIds,sourceIds:sources,counts:{entities:entityIds.length,records:recordIds.length,relationships:relationshipIds.length,sources:sources.length}};
 };
 const endpointIds=(row:EvidenceRow)=>'entityIds' in row?row.entityIds:'from' in row?[row.from,row.to]:[];
 const stateCodes=(row:EvidenceRow,bases?:Set<string>)=>unique(row.geography.filter(geo=>!bases||bases.has(geo.basis)).flatMap(geo=>geo.stateCodes));
 const associated=(row:EvidenceRow,state:string)=>stateCodes(row,associationBases).includes(state)||endpointIds(row).some(id=>entityIndex.get(id)?.geography.some(geo=>geo.stateCodes.includes(state)));
 const coverage=(row:EvidenceRow,state:string)=>stateCodes(row,coverageBases).includes(state);
 const allowCoverage=filters.geographyMode!=='associations',allowAssociation=filters.geographyMode!=='coverage';
 const isStateRow=(row:EvidenceRow,state:string)=>allowCoverage&&coverage(row,state)||allowAssociation&&associated(row,state);
 const stateHubs=registry.states.map(state=>{
  const stateRecords=records.filter(row=>isStateRow(row,state.code)),stateEdges=relationships.filter(row=>isStateRow(row,state.code));
  const stateEntities=entities.filter(row=>isStateRow(row,state.code));
  return {...population(stateEntities,stateRecords,stateEdges),id:`state:${state.code}`,stateCode:state.code,label:state.name,placement:'schematic-state-association' as const,
   coverageRecordIds:stateRecords.filter(row=>coverage(row,state.code)).map(row=>row.id),associationRecordIds:stateRecords.filter(row=>associated(row,state.code)).map(row=>row.id),
   qualification:'Schematic state evidence hub. Its map anchor represents a state-level index, not an entity address, exact case site, or destination of money. Coverage and entity-association counts can overlap.'};
 }).filter(hub=>hub.counts.entities+hub.counts.records+hub.counts.relationships>0);
 const sites:MapEvidenceSite[]=getAtlasVisibleSites(registry,filters).filter(site=>site.entityIds.every(id=>entityIndex.has(id)&&entityIndex.get(id)?.type!=='person')).map(site=>({...site,placement:'verified-public-site'}));
 const placementIds=(id:string)=>{
  const precise=sites.filter(site=>site.entityIds.includes(id)).map(site=>site.id);
  return precise.length?precise:stateHubs.filter(hub=>hub.entityIds.includes(id)).map(hub=>hub.id);
 };
 const selectedEntityId=options.selectedEntityId&&entityIndex.has(options.selectedEntityId)?options.selectedEntityId:null;
 const selectedHub=stateHubs.find(hub=>hub.id===options.selectedPlacementId),selectedSite=sites.find(site=>site.id===options.selectedPlacementId);
 const selectedEdges=selectedEntityId?exploreAtlasGraph(registry,{...filters,rootId:selectedEntityId,depth:options.depth??1,direction:options.direction??'both'}).ledger:selectedHub?relationships.filter(edge=>selectedHub.relationshipIds.includes(edge.id)):selectedSite?relationships.filter(edge=>selectedSite.entityIds.includes(edge.from)||selectedSite.entityIds.includes(edge.to)):[];
 const allowedEdges=new Set(relationships.map(row=>row.id));
 const trails=selectedEdges.filter(row=>allowedEdges.has(row.id)).map(edge=>{
  const fromPlacementIds=placementIds(edge.from),toPlacementIds=placementIds(edge.to);
  return {id:edge.id,fromEntityId:edge.from,toEntityId:edge.to,fromPlacementIds,toPlacementIds,
   fromPlacementId:fromPlacementIds.length===1?fromPlacementIds[0]:undefined,toPlacementId:toPlacementIds.length===1?toPlacementIds[0]:undefined,
   relationshipIds:[edge.id],sourceIds:references(edge),responseIds:[...edge.responseIds],label:edge.label,direction:relationshipDirected(edge.kind)?'directed' as const:'undirected' as const,tier:edge.tier,status:edge.status,
   qualification:'Recorded relationship between exact identities. State anchors are schematic associations; a connecting line is not a verified travel, payment or influence route. Read the original direction and monetary stage.'};
 });
 const classify=(test:(row:EvidenceRow)=>boolean)=>population(entities.filter(test),records.filter(test),relationships.filter(test));
 // An entity association can place a schematic hub while the event's own location remains unknown.
 const unplaced=(row:EvidenceRow)=>!row.geography.some(geo=>geo.stateCodes.length>0||geo.scope==='national'||geo.scope==='country')&&!sites.some(site=>site.entityIds.includes(row.id)||site.recordIds.includes(row.id));
 const selectedPlacementId=options.selectedPlacementId&&[...stateHubs,...sites].some(row=>row.id===options.selectedPlacementId)?options.selectedPlacementId:null;
 return {stateHubs,sites,trails,populations:{national:classify(row=>row.geography.some(geo=>geo.scope==='national'||geo.scope==='country'&&geo.countryCodes?.length===1&&geo.countryCodes[0]==='IN')),international:classify(row=>row.geography.some(geo=>geo.scope==='country'&&geo.countryCodes?.some(code=>code!=='IN'))),unplaced:classify(unplaced)},counts:population(entities,records,relationships).counts,selectedEntityId,selectedPlacementId,
  interpretation:['Counts are separate retained record, identity and relationship populations, not counts of wrongdoing.','State hubs are schematic evidence indexes; only explicitly verified public sites carry coordinates. People never receive inferred point locations.','National, international and state context may overlap. Unknown locations remain unplaced; no state centroid becomes an entity address.','Trail arrows retain original source direction and amount stage. Missing or ambiguous endpoints stay in the full evidence reader rather than acquiring guessed map lines.']};
}

/** Uncapped exact connections. Pagination changes presentation only, not the available evidence population. */
export function getEvidenceReaderModel(registry:InvestigationRegistry,selection:AtlasSelection) {
 const closure=getAtlasEvidenceClosure(registry,[selection]);
 const entities=new Map(registry.entities.map(row=>[row.id,row]));
 const relationships=selection.kind==='entity'?registry.relationships.filter(row=>row.from===selection.id||row.to===selection.id):closure.relationships;
 const responses=new Set(closure.relationships.flatMap(row=>row.responseIds));
 const neighborIds=unique(relationships.flatMap(row=>[row.from,row.to]).filter(id=>selection.kind!=='entity'||id!==selection.id));
 return {closure,relationships,neighbors:neighborIds.map(id=>entities.get(id)).filter((row):row is InvestigationEntity=>!!row),responses:closure.records.filter(row=>responses.has(row.id)),records:closure.records.filter(row=>!responses.has(row.id))};
}

export function searchEvidenceConnections(registry:InvestigationRegistry,relationships:InvestigationRelationship[],query='',page=1,pageSize=12) {
 const matches=createInvestigationMatcher(registry,{q:query});
 const matched=relationships.filter(matches),size=Math.max(1,Math.min(100,Math.floor(pageSize))),pages=Math.max(1,Math.ceil(matched.length/size));
 const currentPage=Math.max(1,Math.min(pages,Math.floor(page)||1));
 return {entries:matched.slice((currentPage-1)*size,currentPage*size),total:matched.length,denominator:relationships.length,page:currentPage,pages,pageSize:size};
}
