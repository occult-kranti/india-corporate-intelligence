import type { InvestigationEntity, InvestigationRecord, InvestigationRelationship, InvestigationSource } from '../../data/investigation';

export type GraphDirection = 'both'|'incoming'|'outgoing';
export const GRAPH_LIMITS = { entities: 80, relationships: 180 } as const;
export function isTraversalRelationship(edge: InvestigationRelationship) {
  return edge.tier !== 'analytic' && !['contra','supersede','response','denial','analytic','comparison'].includes(edge.kind);
}
/** This is undirected discovery adjacency. Original endpoint direction is never rewritten. */
export function investigationGraphSlice(entities: InvestigationEntity[], relationships: InvestigationRelationship[], sources: InvestigationSource[], selectedNode: string | null, depth: number, priorityEdgeIds: string[] = [], limits: {entities:number;relationships:number} = GRAPH_LIMITS, direction:GraphDirection='both') {
  const nodeById = new Map(entities.filter(node => node.resolved).map(node => [node.id, node]));
  const sourceIds = new Set(sources.map(source => source.id));
  const valid = relationships.filter(edge => nodeById.has(edge.from) && nodeById.has(edge.to) && edge.sourceIds.length > 0 && edge.sourceIds.every(id => sourceIds.has(id))).sort((a,b) => a.id.localeCompare(b.id));
  const invalidSelection = !!selectedNode && !nodeById.has(selectedNode);
  const distance = new Map<string, number>();
  if (selectedNode && !invalidSelection) {
    distance.set(selectedNode,0);
    for (let step=0; step<Math.min(5,Math.max(1,Math.floor(depth))); step++) for (const edge of valid) {
      if (!isTraversalRelationship(edge)) continue;
      if ((direction!=='incoming'||!relationshipDirected(edge.kind)) && distance.get(edge.from) === step && !distance.has(edge.to)) distance.set(edge.to,step+1);
      if ((direction!=='outgoing'||!relationshipDirected(edge.kind)) && distance.get(edge.to) === step && !distance.has(edge.from)) distance.set(edge.from,step+1);
    }
  } else if (!invalidSelection) for (const id of nodeById.keys()) distance.set(id,0);
  const priority = new Set(priorityEdgeIds);
  const highlighted = valid.filter(edge => priority.has(edge.id));
  const contextual = valid.filter(edge => distance.has(edge.from) && distance.has(edge.to));
  const ledger = [...new Map([...contextual,...highlighted].map(edge => [edge.id,edge])).values()].sort((a,b) => a.id.localeCompare(b.id));
  const allIds = new Set([...distance.keys(),...highlighted.flatMap(edge => [edge.from,edge.to])]);
  const keep = new Set<string>();
  const add = (id:string) => { if (keep.size < limits.entities) keep.add(id); };
  if (selectedNode && nodeById.has(selectedNode)) add(selectedNode);
  for (const edge of highlighted) { add(edge.from); add(edge.to); }
  const orderedEdges = [...ledger].sort((a,b) => Math.min(distance.get(a.from) ?? Infinity,distance.get(a.to) ?? Infinity)-Math.min(distance.get(b.from) ?? Infinity,distance.get(b.to) ?? Infinity) || a.id.localeCompare(b.id));
  // Favor connected pairs in the preview; deterministic ordering is not an influence score.
  for (const edge of orderedEdges) { add(edge.from); add(edge.to); }
  for (const id of [...allIds].sort((a,b) => (distance.get(a) ?? Infinity)-(distance.get(b) ?? Infinity) || a.localeCompare(b))) add(id);
  const drawEdges = [...highlighted,...ledger.filter(edge => !priority.has(edge.id))].filter(edge => keep.has(edge.from) && keep.has(edge.to)).slice(0,limits.relationships);
  const drawnIds = new Set(drawEdges.map(edge => edge.id));
  return {
    entities: [...keep].map(id => nodeById.get(id)!), relationships: drawEdges, ledger, ledgerEntities:[...allIds].map(id=>nodeById.get(id)!),
    totalEntities: allIds.size, totalRelationships: ledger.length,
    invalidSelection, excludedRelationships: relationships.length-valid.length,
    truncated: keep.size < allIds.size || drawEdges.length < ledger.length,
    priorityOutsideFocus: highlighted.filter(edge => !distance.has(edge.from) || !distance.has(edge.to)).length,
    omittedPriorityIds: priorityEdgeIds.filter(id => !drawnIds.has(id)),
  };
}

export const relationshipDirected = (kind:string) => !['family','related','association','comparison','analytic','identity-crosswalk'].includes(kind);
export function investigationRelationshipDate(edge: Pick<InvestigationRelationship,'fromDate'|'toDate'>) {
  if (edge.fromDate && edge.toDate && edge.fromDate === edge.toDate) return edge.fromDate;
  if (edge.fromDate && edge.toDate) return `${edge.fromDate} – ${edge.toDate}`;
  if (edge.fromDate) return `${edge.fromDate} – end unknown`;
  if (edge.toDate) return `start unknown – ${edge.toDate}`;
  return 'Dates unknown';
}
export interface GraphPoint { x:number;y:number }
/** Reciprocal and parallel relationships receive separate deterministic curves. */
export function investigationEdgePaths(relationships: Pick<InvestigationRelationship,'id'|'from'|'to'>[], points: Map<string,GraphPoint>) {
  const groups = new Map<string, typeof relationships>();
  for (const edge of [...relationships].sort((a,b) => a.id.localeCompare(b.id))) {
    const key = [edge.from,edge.to].sort().join('\u0000');
    groups.set(key,[...groups.get(key) ?? [],edge]);
  }
  const paths = new Map<string,string>();
  for (const group of groups.values()) group.forEach((edge,index) => {
    const start=points.get(edge.from), end=points.get(edge.to); if (!start || !end) return;
    if (edge.from === edge.to) { const spread=index*Math.min(12,32/Math.max(1,group.length-1));paths.set(edge.id,`M${start.x-12},${start.y-12} C${start.x-48-spread},${start.y-62-spread} ${start.x+48+spread},${start.y-62-spread} ${start.x+12},${start.y-12}`); return; }
    const distance=Math.hypot(end.x-start.x,end.y-start.y) || 1;
    const gap=Math.min(38,240/Math.max(1,group.length-1));
    const offset=(index-(group.length-1)/2)*gap*(edge.from<edge.to ? 1 : -1);
    const cx=(start.x+end.x)/2-(end.y-start.y)/distance*offset,cy=(start.y+end.y)/2+(end.x-start.x)/distance*offset;
    const tail=Math.hypot(cx-start.x,cy-start.y) || 1, head=Math.hypot(end.x-cx,end.y-cy) || 1;
    paths.set(edge.id,`M${start.x+(cx-start.x)/tail*19},${start.y+(cy-start.y)/tail*19} Q${cx},${cy} ${end.x-(end.x-cx)/head*22},${end.y-(end.y-cy)/head*22}`);
  });
  return paths;
}
const csvCell = (value:unknown) => { let text=value==null?'':String(value);if (/^[\s]*[=+@-]/u.test(text)) text=`'${text}`;return `"${text.replace(/"/gu,'""')}"`; };
export function investigationGraphCsv(entities: InvestigationEntity[], relationships: InvestigationRelationship[], sources: InvestigationSource[], records:InvestigationRecord[] = []) {
  const nodes=new Map(entities.map(node => [node.id,node])); const refs=new Map(sources.map(source => [source.id,source]));const recordById=new Map(records.map(record=>[record.id,record]));
  const header=['relationship_id','namespace','from_id','from_label','from_identity_basis','kind','direction','to_id','to_label','to_identity_basis','tier','status','status_as_of','from_date','to_date','date_basis','summary','limitations','alternative_explanations','falsifier','geography','amounts_with_currency_unit_stage_period','response_ids','source_ids','source_titles','source_urls','source_publication_dates','source_locators','source_retrieved_at','response_records','response_source_records','missing_response_ids'];
  const rows=relationships.map(edge => {const responses=edge.responseIds.map(id=>recordById.get(id)).filter((row):row is InvestigationRecord=>!!row);const responseSources=[...new Set(responses.flatMap(record=>[...record.sourceIds,...record.geography.flatMap(geo=>geo.sourceIds)]))].map(id=>refs.get(id)).filter(Boolean);return [edge.id,edge.namespace,edge.from,nodes.get(edge.from)?.label,nodes.get(edge.from)?.identityBasis,edge.kind,relationshipDirected(edge.kind)?'from-to':'undirected',edge.to,nodes.get(edge.to)?.label,nodes.get(edge.to)?.identityBasis,edge.tier,edge.status,edge.statusAsOf,edge.fromDate,edge.toDate,edge.dateBasis,edge.summary,edge.limitations.join(' | '),edge.alternativeExplanations.join(' | '),edge.falsifier,JSON.stringify(edge.geography),JSON.stringify(edge.amounts),edge.responseIds.join(' | '),edge.sourceIds.join(' | '),...(['title','url','publishedAt','locator','retrievedAt'] as const).map(field => edge.sourceIds.map(id => refs.get(id)?.[field] ?? 'unknown').join(' | ')),JSON.stringify(responses),JSON.stringify(responseSources),edge.responseIds.filter(id=>!recordById.has(id)).join(' | ')];});
  return [header,...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
}

export interface GraphLabel {id:string;text:string;x:number;y:number;width:number;height:number;anchor:'start'|'middle'|'end'}
/** Greedy screen-space label packing. Selected/focused identities win; accepted rectangles never intersect. */
export function investigationGraphLabels(entities:Pick<InvestigationEntity,'id'|'label'|'namespace'>[],points:Map<string,GraphPoint>,options:{zoom:number;width:number;height:number;priorityIds?:string[];showAll?:boolean}) {
 const zoom=Math.max(.15,options.zoom),priority=new Map((options.priorityIds??[]).map((id,index)=>[id,index]));
 const counts=new Map<string,number>();for(const node of entities)counts.set(node.label,(counts.get(node.label)??0)+1);
 const ordered=[...entities].sort((a,b)=>(priority.get(a.id)??999)-(priority.get(b.id)??999)||a.id.localeCompare(b.id));
 const result:GraphLabel[]=[];
 const intersects=(a:{x:number;y:number;width:number;height:number},b:{x:number;y:number;width:number;height:number})=>a.x<b.x+b.width+8/zoom&&a.x+a.width+8/zoom>b.x&&a.y<b.y+b.height+5/zoom&&a.y+a.height+5/zoom>b.y;
 for(const node of ordered){
  if(!options.showAll&&!priority.has(node.id))continue;const point=points.get(node.id);if(!point)continue;
  const full=`${node.label}${(counts.get(node.label)??0)>1?` · ${node.namespace}`:''}`,text=full.length>34?`${full.slice(0,32)}…`:full;
  const width=(text.length*6.8+12)/zoom,height=21/zoom,gap=26/zoom;
  const candidates=[{x:point.x-width/2,y:point.y+gap},{x:point.x-width/2,y:point.y-gap-height},{x:point.x+gap,y:point.y-height/2},{x:point.x-gap-width,y:point.y-height/2},...[-1,1].flatMap(sign=>[1,2,3].map(step=>({x:point.x-width/2,y:point.y+sign*(gap+step*26/zoom)-(sign<0?height:0)})))];
  for(const candidate of candidates){
   const box={...candidate,width,height};
   if(box.x<4||box.y<4||box.x+width>options.width-4||box.y+height>options.height-4)continue;
   if(result.some(label=>intersects(box,label)))continue;
   if([...points.values()].some(other=>intersects(box,{x:other.x-17/zoom,y:other.y-17/zoom,width:34/zoom,height:34/zoom})))continue;
   result.push({id:node.id,text,...box,anchor:'start'});break;
  }
 }
 return result;
}
