/** Pure display coordinates. Never feed these into GeoAnchor, Mercator or the registry. */
import { getSceneCase, freezeSceneData } from './catalog-bridge';
import { CASE_WARNING, THREAD_STYLES } from './contract';
import type { CaseClaim, CaseEdge, CaseFile, CaseNode, CaseSource } from './contract';
import type { CaseNavigation } from './navigation';

export type LayoutPoint = readonly [number, number, number];
export type Lane = 'reviewed_endpoint' | 'group_label' | 'unresolved_endpoint' | 'joint_block';
export interface LayoutNode {
  record: CaseNode;
  position: LayoutPoint;
  lane: Lane;
  /** Visual whitespace partition only, not a legal group or transitive claim. */
  layoutIsland: number;
  cardSize: readonly [number, number];
}
export interface LayoutThread {
  record: CaseEdge;
  points: readonly [LayoutPoint, LayoutPoint, LayoutPoint, LayoutPoint];
  widthCssPx: 1.5;
  dash: string;
  arrow: 'static_at_target';
}
export interface EvidenceEnvelope { claim: CaseClaim; sources: CaseSource[] }
export interface CaseSceneModel {
  /** Verified v2 snapshot, including every original claim, source and non-addition group. */
  caseFile: CaseFile;
  space: 'case_layout_units_not_geography';
  caseId: string;
  profileId: string;
  label: string;
  warning: string;
  nodes: LayoutNode[];
  threads: LayoutThread[];
  evidence: EvidenceEnvelope[];
  readerFactIds: string[];
  sharedBlocks: CaseFile['sharedBlocks'];
  constraints: string[];
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}
export const SCENE_BUDGET = Object.freeze({
  nodes: 24, visibleThreads: 12, curveSegments: 24, radialSegments: 5,
  history: 32, labelUpdatesPerSecond: 20, travelMs: 260, maxTravelMs: 320,
  maxDpr: 1.5, incrementalDrawCalls: 64, incrementalTriangles: 24000,
  incrementalGpuBytes: 8 * 1024 * 1024,
});
const clone = <T,>(v:T):T => JSON.parse(JSON.stringify(v)) as T;
const laneFor = (node:CaseNode):Lane => node.kind==='group_label'||node.kind==='unresolved_endpoint'||node.kind==='joint_block' ? node.kind : 'reviewed_endpoint';
const laneX:Record<Lane,number> = { joint_block:-8, group_label:-4, reviewed_endpoint:0, unresolved_endpoint:8 };

/** Undirected connected partitions are used for whitespace only. No partition creates a node,
 * edge, path, ownership group or factual relation. Directed records remain untouched. */
function layoutIslands(file:CaseFile):CaseNode[][] {
  const remaining=new Set(file.nodes.map(n=>n.id));
  const adjacency=new Map(file.nodes.map(n=>[n.id,new Set<string>()]));
  for(const edge of file.edges) {adjacency.get(edge.from)!.add(edge.to);adjacency.get(edge.to)!.add(edge.from);}
  const islands:CaseNode[][]=[];
  for(const seed of file.nodes) {
    if(!remaining.has(seed.id)) continue;
    const ids=new Set<string>();const queue=[seed.id];remaining.delete(seed.id);
    for(let i=0;i<queue.length;i++) {const id=queue[i];ids.add(id);for(const next of adjacency.get(id)!) if(remaining.delete(next)) queue.push(next);}
    islands.push(file.nodes.filter(node=>ids.has(node.id)));
  }
  return islands;
}

function pointOnCurve(points:LayoutThread['points'],t:number):LayoutPoint {
  const v=Math.max(0,Math.min(1,Number.isFinite(t)?t:0)),u=1-v;
  return [0,1,2].map(k=>u*u*u*points[0][k]+3*u*u*v*points[1][k]+3*u*v*v*points[2][k]+v*v*v*points[3][k]) as unknown as LayoutPoint;
}
function segmentTouchesCard(a:LayoutPoint,b:LayoutPoint,node:LayoutNode):boolean {
  let lower=0,upper=1;
  for(const axis of [0,1] as const) {
    const half=node.cardSize[axis]/2+0.3,min=node.position[axis]-half,max=node.position[axis]+half,delta=b[axis]-a[axis];
    if(Math.abs(delta)<1e-12) {if(a[axis]<min||a[axis]>max)return false;continue;}
    const v=(min-a[axis])/delta,w=(max-a[axis])/delta;
    lower=Math.max(lower,Math.min(v,w));upper=Math.min(upper,Math.max(v,w));if(lower>upper)return false;
  }
  return true;
}
/** Conservative 128-segment check against expanded, unrotated paper footprints.
 * Actual DOM label wrapping/tilt/occlusion still requires browser review. */
export function curveClearsOtherCards(points:LayoutThread['points'],nodes:LayoutNode[],from:string,to:string):boolean {
  const obstacles=nodes.filter(n=>n.record.id!==from&&n.record.id!==to);let prior=points[0];
  for(let i=1;i<=128;i++) {const next=pointOnCurve(points,i/128);if(obstacles.some(node=>segmentTouchesCard(prior,next,node)))return false;prior=next;}
  return true;
}

/** Stable, force-free layout; selection, reveal, viewport and financial quantities never repack it. */
export function createCaseSceneModel(input:CaseFile):CaseSceneModel {
  const file=getSceneCase(input);
  if(file.nodes.length>SCENE_BUDGET.nodes) throw new Error('Case exceeds scene budget; use complete accessible list');
  const nodes:LayoutNode[]=[];let top=0;
  layoutIslands(file).forEach((island,index)=>{
    let rows=1;
    for(const lane of ['joint_block','group_label','reviewed_endpoint','unresolved_endpoint'] as const) {
      const members=island.filter(n=>laneFor(n)===lane);const columns=lane==='reviewed_endpoint'?2:1;
      rows=Math.max(rows,Math.ceil(members.length/columns));
      members.forEach((node,i)=>nodes.push({record:clone(node),lane,layoutIsland:index,
        position:[laneX[lane]+(i%columns)*4,top-Math.floor(i/columns)*3.6,0.28],cardSize:[3.2,1.8]}));
    }
    top-=rows*3.6+2.4;
  });
  // Restore source node ordering for stable DOM/list correspondence.
  nodes.sort((a,b)=>file.nodes.findIndex(n=>n.id===a.record.id)-file.nodes.findIndex(n=>n.id===b.record.id));
  const byId=new Map(nodes.map(n=>[n.record.id,n]));
  const threads:LayoutThread[]=file.edges.map(edge=>{
    const a=byId.get(edge.from)!.position,b=byId.get(edge.to)!.position;
    const pair=file.edges.filter(e=>(e.from===edge.from&&e.to===edge.to)||(e.from===edge.to&&e.to===edge.from));
    const rank=pair.findIndex(e=>e.id===edge.id);
    // Fixed finite candidate order; never use random/force layout or quantities as routing weights.
    const parallelShift=(rank-(pair.length-1)/2)*0.48;
    const dx=b[0]-a[0],dy=b[1]-a[1],distance=Math.hypot(dx,dy);
    let points:LayoutThread['points']|null=null;
    for(const bend of [0.65,-0.65,1.2,-1.2,2,-2,3.2,-3.2,5.2,-5.2,8.4,-8.4,13.6,-13.6,22,-22]) {
      const offset=bend+parallelShift;
      let controlA:LayoutPoint,controlB:LayoutPoint;
      if(distance===0) {controlA=[a[0]-1.2,a[1]+Math.abs(offset)+1.4,0.5];controlB=[a[0]+1.2,a[1]+Math.abs(offset)+1.4,0.5];}
      else {
        // Perpendicular orientation is fixed by the unordered pair, never a direction rewrite.
        const sign=edge.from<edge.to?1:-1;const ox=-dy/distance*offset*sign,oy=dx/distance*offset*sign;
        controlA=[a[0]+dx/3+ox,a[1]+dy/3+oy,0.5];controlB=[a[0]+2*dx/3+ox,a[1]+2*dy/3+oy,0.5];
      }
      const candidate:LayoutThread['points']=[a,controlA,controlB,b];
      if(curveClearsOtherCards(candidate,nodes,edge.from,edge.to)) {points=candidate;break;}
    }
    if(!points)throw new Error('No clear deterministic case route; use complete accessible list');
    return {record:clone(edge),points,widthCssPx:1.5,dash:THREAD_STYLES[edge.kind].dash,arrow:'static_at_target'};
  });
  const allPoints=[...nodes.map(n=>n.position),...threads.flatMap(t=>t.points)];
  const xs=allPoints.map(p=>p[0]),ys=allPoints.map(p=>p[1]);
  return freezeSceneData({caseFile:file,space:'case_layout_units_not_geography',caseId:file.id,profileId:file.profileId,label:file.label,
    warning:`Layout coordinates, not world places. ${CASE_WARNING}`,nodes,threads,
    evidence:file.claims.map(claim=>({claim:clone(claim),sources:file.sources.filter(s=>claim.sourceIds.includes(s.id)).map(clone)})),
    readerFactIds:[...file.readerFactIds],sharedBlocks:clone(file.sharedBlocks),constraints:[...file.constraints],
    bounds:{minX:Math.min(0,...xs)-2.2,maxX:Math.max(0,...xs)+2.2,minY:Math.min(0,...ys)-2.8,maxY:Math.max(0,...ys)+2.2}});
}
export function cubicPoint(thread:LayoutThread,t:number):LayoutPoint {return pointOnCurve(thread.points,t);}
/** One source envelope per claim, even if the claim has several role spokes. Full envelopes
 * stay in the DOM qualification rail at every level, including overview. Nothing is a tooltip-only caveat. */
export function presentCaseScene(model:CaseSceneModel,state:CaseNavigation,zoom:number) {
  if(state.caseId!==model.caseId) throw new Error('Case state/model mismatch');
  const nodeIds=new Set(model.nodes.map(n=>n.record.id)),edgeIds=new Set(model.threads.map(t=>t.record.id));
  if(state.nodeId&&!nodeIds.has(state.nodeId)||state.edgeId&&!edgeIds.has(state.edgeId)||state.factId&&!model.readerFactIds.includes(state.factId)) throw new Error('Unknown local selection');
  if(state.visibleEdgeIds.length>SCENE_BUDGET.visibleThreads||new Set(state.visibleEdgeIds).size!==state.visibleEdgeIds.length||state.visibleEdgeIds.some(id=>!edgeIds.has(id))) throw new Error('Invalid visible spoke set');
  if(state.edgeId&&!state.visibleEdgeIds.includes(state.edgeId)) throw new Error('Selected spoke must remain visible');
  if([state.nodeId,state.edgeId,state.factId].filter(Boolean).length>1) throw new Error('Conflicting selection');
  const visible=new Set(state.visibleEdgeIds);const threads=model.threads.filter(t=>visible.has(t.record.id));
  const eligible=model.threads.filter(t=>!state.nodeId||t.record.from===state.nodeId||t.record.to===state.nodeId);
  const eligibleIds=new Set(eligible.map(t=>t.record.id));
  if(threads.some(t=>!eligibleIds.has(t.record.id)))throw new Error('Visible spoke is outside selected neighborhood');
  const claimIds=new Set(threads.map(t=>t.record.claimId));if(state.factId)claimIds.add(state.factId);
  const selectedThread=threads.find(t=>t.record.id===state.edgeId);
  const neighborIds=new Set(threads.filter(t=>t.record.from===state.nodeId||t.record.to===state.nodeId).flatMap(t=>[t.record.from,t.record.to]));
  const detailLevel=!Number.isFinite(zoom)||zoom<1.25?'overview':zoom<2.25?'labels':'close';
  return {detailLevel,
    nodes:model.nodes.map(node=>({...node,selected:node.record.id===state.nodeId,
      emphasized:node.record.id===state.nodeId||neighborIds.has(node.record.id)||[selectedThread?.record.from,selectedThread?.record.to].includes(node.record.id)})),
    threads:threads.map(thread=>({...thread,selected:thread.record.id===state.edgeId,
      emphasized:thread.record.id===state.edgeId||thread.record.from===state.nodeId||thread.record.to===state.nodeId})),
    qualificationRail:model.evidence.filter(e=>claimIds.has(e.claim.claimId)),
    availableSpokes:eligible.length,
    hiddenEligibleSpokes:eligible.length-threads.length,
    outsideNeighborhoodSpokes:model.threads.length-eligible.length,
    totalUndisplayedSpokes:model.threads.length-threads.length,
    sharedBlocks:model.sharedBlocks,
    readerFactIds:model.readerFactIds,
    warning:model.warning};
}
