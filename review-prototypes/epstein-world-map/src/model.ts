import {ACCOUNTING, COMPONENT_NAMES, readComponent, selectRecord, readAdmitted, pointerChild} from './contract.ts';
import type {Admission, Component, Json, JsonObject, Selection, SelectionRequest} from './contract.ts';
export type View='felt'|'list'|'relations'|'context';
export type UIState=Readonly<{component:Component;view:View;dateRole:string;zoom:number;selection:SelectionRequest|null;drawerOpen:boolean}>;
export const INITIAL_STATE:UIState=Object.freeze({component:'round-5',view:'felt',dateRole:'primary',zoom:100,selection:null,drawerOpen:false});
export type Action={type:'component';value:Component}|{type:'view';value:View}|{type:'role';value:string}|{type:'zoom';value:number}|{type:'select';value:SelectionRequest}|{type:'close'}|{type:'open'};
export const rowArray=(value:Json|undefined):readonly JsonObject[]=>Array.isArray(value)?value as readonly JsonObject[]:[];
export const isObject=(v:Json|undefined):v is JsonObject=>v!==null&&typeof v==='object'&&!Array.isArray(v);
export const textValue=(v:Json|undefined):string=>typeof v==='string'?v:typeof v==='number'||typeof v==='boolean'?String(v):'';
export function componentPath(component:Component):string{return component==='baseline'?'/baseline':`/extensions/${COMPONENT_NAMES.indexOf(component)-1}`;}
export function recordId(component:Component,collection:SelectionRequest['collection'],row:JsonObject):number|string{return row[component==='baseline'?(collection==='milestones'?'milestone':'relation'):'id'] as number|string;}
export function records(token:Admission,component:Component,collection:SelectionRequest['collection']):readonly Selection[]{return Object.freeze(rowArray(readComponent(token,component)[collection]).map(row=>selectRecord(token,{component,collection,id:recordId(component,collection,row)})));}
export function roles(token:Admission,component:Component):readonly string[]{const found=new Set<string>();for(const {record} of records(token,component,'milestones'))if(isObject(record.date_claims))for(const key of Object.keys(record.date_claims))found.add(key);return Object.freeze(['primary',...found]);}
export function reduce(token:Admission,state:UIState,action:Action):UIState{
 readAdmitted(token);
 switch(action.type){
 case 'component': if(!COMPONENT_NAMES.includes(action.value))throw Error('Unsupported component');return Object.freeze({...state,component:action.value,dateRole:'primary',selection:null,drawerOpen:false});
 case 'view': if(!['felt','list','relations','context'].includes(action.value))throw Error('Unsupported view');return Object.freeze({...state,view:action.value});
 case 'role': if(!roles(token,state.component).includes(action.value))throw Error('Unsupported date role');return Object.freeze({...state,dateRole:action.value});
 case 'zoom': if(!Number.isFinite(action.value))throw Error('Unsupported zoom');return Object.freeze({...state,zoom:Math.max(75,Math.min(200,Math.round(action.value/25)*25))});
 case 'select': {const chosen=selectRecord(token,action.value);if(chosen.component!==state.component)throw Error('Selection outside active packet');return Object.freeze({...state,selection:Object.freeze({...action.value}),drawerOpen:true});}
 case 'open':return Object.freeze({...state,drawerOpen:true});
 case 'close':return Object.freeze({...state,drawerOpen:false});
 default:throw Error('Unsupported action');
 }
}
export type DateMeaning=Readonly<{path:string|null;raw:Json|null;role:string;state:string;precision:string;label:string;column:string|null;explanation:string}>;
const pointStates=new Set(['exact','attributed','source_text_interpretation','source_recorded','attributed_historical_observation','verified_day','visually_read_copy','copy_records','partial']);
function calendarLiteral(value:string,precision:string):boolean{
 const match=/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/u.exec(value);if(!match||Number(match[1])<1)return false;
 if(precision==='year')return !match[2];if(precision==='month')return !!match[2]&&!match[3]&&Number(match[2])>=1&&Number(match[2])<=12;
 if(precision!=='day'||!match[2]||!match[3])return false;
 const y=Number(match[1]),m=Number(match[2]),d=Number(match[3]),leap=y%4===0&&(y%100!==0||y%400===0),days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];return m>=1&&m<=12&&d>=1&&d<=days[m-1];
}
/** Categorical source-date columns, NOT an inferred elapsed-time coordinate. */
export function dateMeaning(selection:Selection,requestedRole='primary'):DateMeaning{
 const r=selection.record;
 if(selection.component==='baseline')return Object.freeze({path:selection.pointer+'/date',raw:r.date,role:textValue(r.date_role),state:'original textual date',precision:'not separately encoded',label:textValue(r.date),column:null,explanation:'Original baseline date wording is retained. This reader does not parse textual dates into calendar coordinates.'});
 const key=selection.collection==='procedural_relations'?'date_claim':requestedRole==='primary'?'primary_date':'date_claims';
 const raw=key==='date_claims'&&isObject(r.date_claims)?r.date_claims[requestedRole]:r[key];
 const path=raw===undefined?null:selection.pointer+'/'+key+(key==='date_claims'?'/'+requestedRole:'');
 if(!isObject(raw))return Object.freeze({path,raw:raw??null,role:requestedRole,state:'not supplied for this entry',precision:'not supplied',label:'No field for this role',column:null,explanation:'This role is not supplied for this entry. Its primary date is not substituted.'});
 const role=textValue(raw.role),state=textValue(raw.state),precision=textValue(raw.precision),value=textValue(raw.value),label=textValue(raw.raw_label)||value||textValue(raw.reason)||textValue(raw.condition)||state;
 const column=pointStates.has(state)&&calendarLiteral(value,precision)?value:null;
 const explanation=column?`Source ${precision} precision; ${state}. Date columns have equal spacing and do not measure elapsed time.`:state==='planned'?'Planned source meaning, not a completed event. Kept outside the dated columns.':state==='conditional'?'Conditional source meaning; no fulfillment date is inferred.':precision==='days'?'Duration retained as a duration; no deadline is calculated.':precision==='fiscal_year'?'Fiscal-period source meaning; no start, receipt day, or completion date is inferred.':state==='unknown'?'Unknown date retained as unknown.':'Source meaning is retained without a supported calendar-column placement.';
 return Object.freeze({path,raw,role,state,precision,label,column,explanation});
}
export function dateGroups(token:Admission,state:UIState):Readonly<{dated:readonly Readonly<{key:string;entries:readonly Selection[]}>[];unplaced:readonly Selection[]}>{const grouped=new Map<string,Selection[]>(),unplaced:Selection[]=[];for(const selection of records(token,state.component,'milestones')){const date=dateMeaning(selection,state.dateRole);if(date.column===null)unplaced.push(selection);else{const list=grouped.get(date.column)??[];list.push(selection);grouped.set(date.column,list);}}return Object.freeze({dated:Object.freeze([...grouped].sort(([a],[b])=>a.localeCompare(b,'en')).map(([key,entries])=>Object.freeze({key,entries:Object.freeze(entries)}))),unplaced:Object.freeze(unplaced)});}
export function linkedRelations(token:Admission,selected:Selection):readonly Selection[]{return Object.freeze(records(token,selected.component,'procedural_relations').filter(r=>r.record[selected.component==='baseline'?'linked_milestone':'milestone_id']===selected.id));}
export function linkedEntry(token:Admission,relation:Selection):Selection{return selectRecord(token,{component:relation.component,collection:'milestones',id:relation.record[relation.component==='baseline'?'linked_milestone':'milestone_id'] as string|number});}
export type Endpoint=Readonly<{label:string;capacity:string;node:JsonObject|null;path:string|null;identity:string}>;
export function endpoints(token:Admission,relation:Selection):Readonly<{source:Endpoint;target:Endpoint}>{
 const packet=readComponent(token,relation.component);
 function one(side:'source'|'target'):Endpoint{
  if(relation.component==='baseline')return Object.freeze({label:textValue(relation.record[side+'_endpoint']),capacity:'Capacity is retained in the original relation attribution; no separate endpoint-capacity field is supplied.',node:null,path:null,identity:`${relation.pointer}/${side}_endpoint`});
  const id=textValue(relation.record[side+'_node_id']),nodes=rowArray(packet.nodes),index=nodes.findIndex(n=>n.id===id);if(index<0)throw Error('Missing packet-local node');const node=nodes[index];return Object.freeze({label:textValue(node.label),capacity:textValue(relation.record[side+'_legal_capacity']),node,path:componentPath(relation.component)+'/nodes/'+index,identity:relation.component+':'+id});
 }return Object.freeze({source:one('source'),target:one('target')});
}
export function limitations(record:JsonObject):readonly string[]{const out:string[]=[];for(const key of ['qualification','attribution_and_limit','duration_or_end','limitations','limits']){const value=record[key];if(typeof value==='string')out.push(value);else if(Array.isArray(value))for(const x of value)if(typeof x==='string')out.push(x);}return Object.freeze(out);}
export type SourceOwner=Readonly<{path:string;value:JsonObject}>;
export type SourceRef=Readonly<{path:string;reference:JsonObject;catalog:JsonObject|null;catalogPath:string|null;ancestors:readonly SourceOwner[]}>;
/** Ancestors follow the exact pointer walk. No date, capacity or identity is joined by name or URL. */
export function sourceRefs(token:Admission,selection:Selection):readonly SourceRef[]{
 const out:SourceRef[]=[],catalog=rowArray(readComponent(token,selection.component).sources);
 function scan(value:Json,path:string,ancestors:readonly SourceOwner[]){
  if(Array.isArray(value))value.forEach((v,i)=>scan(v,pointerChild(path,i),ancestors));
  else if(isObject(value)){
   if(typeof value.url==='string'){
    const index=typeof value.source_id==='string'?catalog.findIndex(s=>s.id===value.source_id):-1;
    out.push(Object.freeze({path,reference:value,catalog:index<0?null:catalog[index],catalogPath:index<0?null:componentPath(selection.component)+'/sources/'+index,ancestors:Object.freeze([...ancestors])}));
   }
   const next=path===selection.pointer?ancestors:[...ancestors,Object.freeze({path,value})];
   for(const [k,v]of Object.entries(value))scan(v,pointerChild(path,k),next);
  }
 }
 scan(selection.record,selection.pointer,[]);return Object.freeze(out);
}
export const counts=ACCOUNTING;
