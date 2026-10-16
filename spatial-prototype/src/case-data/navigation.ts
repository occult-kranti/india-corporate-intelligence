import type { CaseFile } from './contract';
export const INITIAL_REVEAL=4;
export const MAX_REVEAL=12;
export const MAX_HISTORY=32;
export interface Selection {nodeId:string|null;edgeId:string|null;factId:string|null;visibleEdgeIds:string[]}
export interface CaseNavigation extends Selection {caseId:string;history:Selection[]}
export type CaseAction={type:'select-node';id:string}|{type:'select-edge';id:string}|{type:'select-fact';id:string}|{type:'reveal-more'}|{type:'back'}|{type:'reset'};
export function initialNavigation(file:CaseFile):CaseNavigation {return {caseId:file.id,nodeId:null,edgeId:null,factId:null,visibleEdgeIds:file.edges.slice(0,INITIAL_REVEAL).map(e=>e.id),history:[]};}
export function availableEdges(file:CaseFile,state:Selection):string[] {
  return file.edges.filter(e=>!state.nodeId||e.from===state.nodeId||e.to===state.nodeId).map(e=>e.id);
}
const snapshot=(s:Selection):Selection=>({nodeId:s.nodeId,edgeId:s.edgeId,factId:s.factId,visibleEdgeIds:[...s.visibleEdgeIds]});
/** UI history only. It is not a selected graph walk or a source-derived path claim. */
export function navigateCase(file:CaseFile,state:CaseNavigation,action:CaseAction):CaseNavigation {
  if(state.caseId!==file.id) return initialNavigation(file);
  if(action.type==='reset') return initialNavigation(file);
  if(action.type==='back') {const last=state.history[state.history.length-1];return last?{...snapshot(last),caseId:file.id,history:state.history.slice(0,-1)}:state;}
  let next:Selection=snapshot(state);
  if(action.type==='select-node') {
    if(!file.nodes.some(n=>n.id===action.id)) throw new Error('Unknown local node');
    next={nodeId:action.id,edgeId:null,factId:null,visibleEdgeIds:file.edges.filter(e=>e.from===action.id||e.to===action.id).slice(0,INITIAL_REVEAL).map(e=>e.id)};
  } else if(action.type==='select-edge') {
    if(!file.edges.some(e=>e.id===action.id)) throw new Error('Unknown local edge');
    next={nodeId:null,edgeId:action.id,factId:null,visibleEdgeIds:state.visibleEdgeIds.includes(action.id)?[...state.visibleEdgeIds]:[action.id]};
  } else if(action.type==='select-fact') {
    if(!file.readerFactIds.includes(action.id)) throw new Error('Unknown reader-only fact');
    next={...next,nodeId:null,edgeId:null,factId:action.id};
  } else {
    const ids=availableEdges(file,state);
    next.visibleEdgeIds=ids.slice(0,Math.min(MAX_REVEAL,state.visibleEdgeIds.length+INITIAL_REVEAL));
    if(state.edgeId&&!next.visibleEdgeIds.includes(state.edgeId)) next.visibleEdgeIds=[...next.visibleEdgeIds.slice(0,MAX_REVEAL-1),state.edgeId];
  }
  if(JSON.stringify(snapshot(state))===JSON.stringify(next)) return state;
  return {...next,caseId:file.id,history:[...state.history,snapshot(state)].slice(-MAX_HISTORY)};
}
