import {admitBytes,COMPONENT_NAMES,readAdmitted,selectRecord,SOURCE_SHA256} from './contract.ts';
import type {Admission,Selection,JsonObject,Component,SelectionRequest} from './contract.ts';
import {records,dateMeaning,roles,sourceRefs,linkedEntry} from './model.ts';
export const INPUT_HASHES = Object.freeze({
 anchors:'97112a40565f311513bfa71b3fcabc1efb88a97cda1aba2593d6b03737f0237c',
 candidates:'3ef109703b95307fbd8ec79438ec9ceedf2eeda2395ce639d13004c2a1ccbb36',
 review:'8853a868eb26435775aa50b847bcb2da477ee26d287c9b68ef795d6720b4086e',
 root:'95b6f2fab359db2aa8b3e75176c9b3b0dbcdefa82e340b0274a3f431e4791a3f'
});
export type Anchor = Readonly<{anchor_id:string;entity:{id:string;json_pointer:string};role:string;latitude:number;longitude:number;display_decimals:number;precision_label:string;geoid:string;coordinate_method:string;evidence_ids:readonly string[];milestone_ids:readonly string[];relation_ids:readonly string[];event_location:null;person_presence:false;map_edges_allowed:false;routes_allowed:false;company_or_person_coordinate_inheritance:false}>;
export type Candidate=Readonly<{id:string;label:string;geography_assertion:string;city_qualification:string;geography:JsonObject;coordinates:JsonObject;milestones:readonly {id:string;json_pointer:string}[];relations:readonly {id:string;json_pointer:string}[];evidence_ids:readonly string[]}>;
export type MapAdmission=Readonly<{token:Admission;anchors:readonly Anchor[];candidates:readonly Candidate[];sources:readonly JsonObject[];registry:ReadonlyMap<string,Selection>}>;
export type Inputs={packet:Uint8Array;anchors:Uint8Array;candidates:Uint8Array;review:Uint8Array;root:Uint8Array};
const admitted=new WeakSet<object>();
const hex=(b:ArrayBuffer)=>Array.from(new Uint8Array(b),n=>n.toString(16).padStart(2,'0')).join('');
const freeze=<T>(v:T):T=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
async function checked(bytes:Uint8Array,hash:string):Promise<any>{if(hex(await globalThis.crypto.subtle.digest('SHA-256',new Uint8Array(bytes)))!==hash)throw Error('Map input hash mismatch');return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
export async function admitMap(inputs:Inputs):Promise<MapAdmission>{
 const token=await admitBytes(inputs.packet),[table,packet,review,root]=await Promise.all([checked(inputs.anchors,INPUT_HASHES.anchors),checked(inputs.candidates,INPUT_HASHES.candidates),checked(inputs.review,INPUT_HASHES.review),checked(inputs.root,INPUT_HASHES.root)]);
 // Historical acceptance remains bound to original local hashes. The projected
 // metadata has its own exact pins and explicitly pending conservation review.
 const historicalCandidate='e0e11b6cea35d968127d11a8a12b5f4666e0598af8c567b03f5d36b20ca2fb78',historicalReview='b54f8c86b02e084a74f688088db36c17afb0fc17e9fe83eb4c0dd45c334b40f3';
 if(table.packet_sha256!==historicalCandidate||packet.corpus.sha256!==SOURCE_SHA256||root.root_acceptance!==true||root.public_data_publication_approval!==false||root.packet_sha256!==historicalCandidate||root.table_sha256!==INPUT_HASHES.anchors||root.review_receipt_sha256!==historicalReview||packet.public_projection?.source_sha256!==historicalCandidate||review.public_projection?.source_receipt_sha256!==historicalReview||review.public_projection?.source_candidate_sha256!==historicalCandidate||packet.public_projection?.conservation_review!=='pending'||review.public_projection?.conservation_review!=='pending'||packet.public_projection?.publication_authorized!==false||review.public_projection?.publication_authorized!==false)throw Error('Map admission conjunction failed');
 const registry=new Map<string,Selection>();for(const c of COMPONENT_NAMES)for(const collection of ['milestones','procedural_relations'] as const)for(const row of records(token,c,collection))registry.set(row.pointer,row);
 if(registry.size!==112||table.anchors.length!==3)throw Error('Coverage mismatch');
 const original=readAdmitted(token);const at=(pointer:string)=>pointer.split('/').slice(1).reduce((v:any,k:string)=>v[k],original);
 for(const a of table.anchors as Anchor[]){const candidate=packet.anchors.find((x:Candidate)=>x.id===a.anchor_id) as Candidate|undefined;
  if(!candidate||!root.anchor_ids.includes(a.anchor_id)||at(a.entity.json_pointer)?.id!==a.entity.id||!Number.isFinite(a.latitude)||!Number.isFinite(a.longitude)||Math.abs(a.latitude)>90||Math.abs(a.longitude)>180||a.event_location!==null||a.person_presence!==false||a.map_edges_allowed!==false||a.routes_allowed!==false||a.company_or_person_coordinate_inheritance!==false)throw Error('Unsupported anchor');
  for(const [links,ids,collection] of [[candidate.milestones,a.milestone_ids,'milestones'],[candidate.relations,a.relation_ids,'procedural_relations']] as const){if(links.length!==ids.length)throw Error('Anchor link mismatch');for(const link of links){const row=registry.get(link.json_pointer);if(!row||row.id!==link.id||!ids.includes(link.id)||row.collection!==collection)throw Error('Non-exact record bridge');}}
 }
 const sealed:ReadonlyMap<string,Selection>=Object.freeze({get size(){return registry.size;},get:(key:string)=>registry.get(key),has:(key:string)=>registry.has(key),entries:()=>registry.entries(),keys:()=>registry.keys(),values:()=>registry.values(),[Symbol.iterator]:()=>registry[Symbol.iterator](),forEach:(callback:(value:Selection,key:string,map:ReadonlyMap<string,Selection>)=>void,thisArg?:unknown)=>registry.forEach((value,key)=>callback.call(thisArg,value,key,sealed))});
 const result=Object.freeze({token,anchors:freeze(table.anchors),candidates:freeze(packet.anchors),sources:freeze(packet.sources),registry:sealed});admitted.add(result);return result;
}
export function ensureMap(model:MapAdmission):void{if(!admitted.has(model))throw Error('Unadmitted map');}
export function selectPointer(model:MapAdmission,pointer:string):Selection{ensureMap(model);const row=model.registry.get(pointer);if(!row)throw Error('Unknown exact record pointer');return selectRecord(model.token,{component:row.component,collection:row.collection,id:row.id});}
export function anchorsFor(model:MapAdmission,selection:Selection):readonly Anchor[]{ensureMap(model);const exact=selectPointer(model,selection.pointer);return model.anchors.filter(a=>{const candidate=model.candidates.find(c=>c.id===a.anchor_id)!;return [...candidate.milestones,...candidate.relations].some(r=>r.json_pointer===exact.pointer&&r.id===exact.id);});}
export function linkedAnchorRecords(model:MapAdmission,id:string):readonly Selection[]{ensureMap(model);const c=model.candidates.find(a=>a.id===id);if(!c)throw Error('Unknown anchor');return [...c.milestones,...c.relations].map(r=>selectPointer(model,r.json_pointer));}
export function timeline(model:MapAdmission,component:Component|'all'='all',role='primary'):readonly Selection[]{ensureMap(model);if(component!=='all'&&!COMPONENT_NAMES.includes(component))throw Error('Unknown component');if((component==='all'&&role!=='primary')||(component!=='all'&&!roles(model.token,component).includes(role)))throw Error('Unknown source date role');return [...model.registry.values()].filter(s=>s.collection==='milestones'&&(component==='all'||s.component===component)).sort((a,b)=>{const ad=dateMeaning(a,role).column,bd=dateMeaning(b,role).column;if(ad===null&&bd===null)return 0;if(ad===null)return 1;if(bd===null)return -1;return ad.localeCompare(bd,'en')||a.pointer.localeCompare(b.pointer,'en');});}
export function unmapped(model:MapAdmission):readonly Selection[]{ensureMap(model);return [...model.registry.values()].filter(s=>anchorsFor(model,s).length===0);}
export function requestFor(s:Selection):SelectionRequest{return {component:s.component,collection:s.collection,id:s.id};}
export function entryFor(model:MapAdmission,s:Selection):Selection{return s.collection==='milestones'?s:linkedEntry(model.token,s);}
export function point(lon:number,lat:number):readonly [number,number]{if(!Number.isFinite(lon)||!Number.isFinite(lat)||Math.abs(lon)>180||Math.abs(lat)>90)throw Error('Invalid coordinates');return [(lon+180)/360*1200,(90-lat)/180*600];}
export function referenceCount(model:MapAdmission):number{return [...model.registry.values()].reduce((n,s)=>n+sourceRefs(model.token,s).length,0);}
