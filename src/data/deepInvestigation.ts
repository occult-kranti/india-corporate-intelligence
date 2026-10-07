import {
 INVESTIGATION_REGISTRY, getInvestigationView, isInvestigationConnectivityEdge,
 type InvestigationEntity, type InvestigationRelationship, type InvestigationRecord,
 type InvestigationSource, type InvestigationFilters,
} from './investigation';
import universe from './deep-universe.json';
import discoveryModel from '../../research/deep-investigation/model-suggestions.json';

export const DEEP_INVESTIGATION_NAMESPACES=['deep-procurement','deep-corporate','deep-services','deep-governance'];
const spaces=new Set(DEEP_INVESTIGATION_NAMESPACES);
const registry=INVESTIGATION_REGISTRY;
const entitiesById=new Map(registry.entities.map(row=>[row.id,row]));
const relationshipsById=new Map(registry.relationships.map(row=>[row.id,row]));
const recordsById=new Map(registry.records.map(row=>[row.id,row]));
const sourcesById=new Map(registry.sources.map(row=>[row.id,row]));
const unique=<T,>(items:T[])=>[...new Set(items)];
export const DEEP_INVESTIGATION_CASES=registry.records.filter(row=>spaces.has(row.namespace)&&row.kind==='investigation-case');
export const getDeepInvestigationCase=(id:string)=>DEEP_INVESTIGATION_CASES.find(row=>row.id===id);

export interface DeepEvidenceClosure {
 entities:InvestigationEntity[];relationships:InvestigationRelationship[];
 records:InvestigationRecord[];sources:InvestigationSource[];
 totalEntities:number;totalRelationships:number;truncated:false;
}

/** Include linked responses recursively; response cards never become traversal edges. */
function evidenceClosure(initialEntityIds:string[],initialRelationshipIds:string[],initialRecordIds:string[]):DeepEvidenceClosure{
 const entityIds=new Set(initialEntityIds),relationshipIds=new Set(initialRelationshipIds),recordIds=new Set(initialRecordIds);
 const queue=[...recordIds];
 const addRelationship=(id:string)=>{const edge=relationshipsById.get(id);if(!edge)return;relationshipIds.add(id);entityIds.add(edge.from);entityIds.add(edge.to);for(const key of [...edge.recordIds,...edge.responseIds])if(!recordIds.has(key)){recordIds.add(key);queue.push(key);}};
 for(const id of [...relationshipIds])addRelationship(id);
 for(let i=0;i<queue.length;i++){const row=recordsById.get(queue[i]);if(!row)continue;for(const id of row.entityIds)entityIds.add(id);for(const id of row.relationshipIds)addRelationship(id);}
 const entities=[...entityIds].map(id=>entitiesById.get(id)).filter((row):row is InvestigationEntity=>!!row);
 const relationships=[...relationshipIds].map(id=>relationshipsById.get(id)).filter((row):row is InvestigationRelationship=>!!row);
 const records=[...recordIds].map(id=>recordsById.get(id)).filter((row):row is InvestigationRecord=>!!row);
 const sourceIds=unique([...entities,...relationships,...records].flatMap(row=>[...row.sourceIds,...row.geography.flatMap(geo=>geo.sourceIds)]));
 const sources=sourceIds.map(id=>sourcesById.get(id)).filter((row):row is InvestigationSource=>!!row);
 return {entities,relationships,records,sources,totalEntities:entities.length,totalRelationships:relationships.length,truncated:false};
}

export function getDeepInvestigationCaseEvidence(id:string){
 const record=getDeepInvestigationCase(id);
 return {record,...evidenceClosure(record?.entityIds??[],record?.relationshipIds??[],record?[id]:[])};
}

/** Exact incident ledger; full case/response context is separately named, never counted as direct edges. */
export function getDeepInvestigationConnections(entityId:string):DeepEvidenceClosure&{evidenceClosure:DeepEvidenceClosure}{
 if(!entitiesById.has(entityId)){const empty=evidenceClosure([],[],[]);return {...empty,evidenceClosure:empty};}
 const direct=registry.relationships.filter(edge=>edge.from===entityId||edge.to===entityId);
 const evidence=evidenceClosure([entityId],direct.map(edge=>edge.id),registry.records.filter(row=>row.entityIds.includes(entityId)).map(row=>row.id));
 const endpointIds=new Set([entityId,...direct.flatMap(edge=>[edge.from,edge.to])]),entities=evidence.entities.filter(row=>endpointIds.has(row.id));
 return {...evidence,entities,relationships:direct,totalEntities:entities.length,totalRelationships:direct.length,evidenceClosure:evidence};
}

/** Complete component over existing sourced connectors. No similarity/name/proximity edges. */
export function getDeepInvestigationComponent(entityId:string):DeepEvidenceClosure{
 if(!entitiesById.has(entityId))return evidenceClosure([],[],[]);
 const adjacency=new Map<string,InvestigationRelationship[]>();
 for(const edge of registry.relationships.filter(isInvestigationConnectivityEdge))for(const endpoint of [edge.from,edge.to]){const rows=adjacency.get(endpoint)??[];rows.push(edge);adjacency.set(endpoint,rows);}
 const selected=new Set([entityId]),queue=[entityId];
 for(let i=0;i<queue.length;i++)for(const edge of adjacency.get(queue[i])??[]){const other=edge.from===queue[i]?edge.to:edge.from;if(!selected.has(other)){selected.add(other);queue.push(other);}}
 const edges=registry.relationships.filter(edge=>selected.has(edge.from)&&selected.has(edge.to));
 return evidenceClosure([...selected],edges.map(edge=>edge.id),[]);
}

/** Search the retained evidence as-is: this never promotes it to newly reviewed evidence. */
export function getDeepInvestigationDiscovery(filters:InvestigationFilters&{domain?:string;kind?:string}={}){
 const view=getInvestigationView({...filters,domains:filters.domain?[filters.domain]:filters.domains});
 const records=filters.kind?view.records.filter(row=>row.kind===filters.kind):view.records;
 const relationships=filters.kind?view.relationships.filter(row=>row.kind===filters.kind):view.relationships;
 return {...view,records,relationships,totals:{...view.totals,records:records.length,relationships:relationships.length},interpretation:'Retained evidence catalogue. Inherited claims have not all been freshly verified; inspect their sources, dates, response and exact amount stage.'};
}

const caseEntityIds=new Set(DEEP_INVESTIGATION_CASES.flatMap(row=>row.entityIds));
const reviewedLegacyIds=new Set<string>();
const caseIdsByLegacy=new Map<string,Set<string>>();
for(const edge of registry.relationships.filter(row=>row.kind==='identity-crosswalk')){
 const pairs=([[edge.from,edge.to],[edge.to,edge.from]] as [string,string][]).filter(([local,legacy])=>caseEntityIds.has(local)&&legacy.startsWith('legacy:entity:'));
 for(const [local,legacy] of pairs){reviewedLegacyIds.add(legacy);const cases=caseIdsByLegacy.get(legacy)??new Set<string>();for(const record of DEEP_INVESTIGATION_CASES)if(record.entityIds.includes(local))cases.add(record.id);caseIdsByLegacy.set(legacy,cases);}
}
export const DEEP_INVESTIGATION_UNIVERSE={...universe,reviewedCases:DEEP_INVESTIGATION_CASES.length,
 securitiesWithReviewedCaseIdentity:universe.securities.filter(row=>row.registryEntityIds.some(id=>reviewedLegacyIds.has(id))).length,
 securities:universe.securities.map(row=>({...row,reviewedCaseIds:unique(row.registryEntityIds.flatMap(id=>[...(caseIdsByLegacy.get(id)??[])]))})),
};

const byKind=new Map<string,InvestigationRelationship[]>();
for(const edge of registry.relationships){const group=byKind.get(edge.kind)??[];group.push(edge);byKind.set(edge.kind,group);}
export const DEEP_INVESTIGATION_COVERAGE={
 asOf:registry.updatedAt,reviewedCases:DEEP_INVESTIGATION_CASES.length,
 reviewedEntities:registry.entities.filter(row=>spaces.has(row.namespace)).length,
 reviewedRelationships:registry.relationships.filter(row=>spaces.has(row.namespace)).length,
 reviewedSources:registry.sources.filter(row=>spaces.has(row.namespace)).length,
 retainedEntities:registry.entities.length,retainedRelationships:registry.relationships.length,
 retainedRecords:registry.records.length,retainedSources:registry.sources.length,heldRecords:registry.held.length,
 namespaces:registry.coverage.filter(row=>spaces.has(row.namespace)),
 relationshipKinds:[...byKind].map(([kind,rows])=>({kind,count:rows.length,amountBearing:rows.filter(row=>row.amounts.length).length,withResponses:rows.filter(row=>row.responseIds.length).length})).sort((a,b)=>b.count-a.count),
 limitations:[
  'Reviewed cases are purposive, source-led investigations and are not a random or complete sample of NSE companies, contracts or institutions.',
  'Retained graph totals include historical sources, structural membership and response edges. A graph edge is not necessarily a payment or an incident.',
  'Money measures preserve currency, unit, period, perimeter and financial stage; this page supplies no pooled public-loss total.',
  'Identity bridges are explicitly reviewed links only. Missing bridges and held identifiers remain unresolved; a missing path does not establish no relationship.',
  'Counter-evidence can narrow or defeat a claim. A procurement award, donation, loan, common director or a connected path alone does not establish wrongdoing.',
 ],
};

export const DEEP_INVESTIGATION_MODEL={...discoveryModel,status:'executed'};
