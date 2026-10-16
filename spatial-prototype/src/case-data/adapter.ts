import reviewedTransport from './runtime-transport';
import { expandTransport } from './expand-transport';
import { safeSourceUrl, THREAD_STYLES } from './contract';
import type { CaseCatalog, CaseFile, FrozenV1CaseFile, V2Predicate } from './contract';
const clone=<T,>(value:T):T=>JSON.parse(JSON.stringify(value)) as T;
function canonical(value:unknown,active=new Set<object>()):string {
 if(value===null||typeof value==='string'||typeof value==='boolean')return JSON.stringify(value);
 if(typeof value==='number'){if(!Number.isFinite(value))throw new Error('Non-JSON number');return JSON.stringify(value);}
 if(!value||typeof value!=='object')throw new Error('Non-JSON field');
 if(active.has(value))throw new Error('Cyclic input');active.add(value);
 try {
  if(Array.isArray(value)){
   if(Object.getPrototypeOf(value)!==Array.prototype)throw new Error('Non-JSON array prototype');
   const keys=Reflect.ownKeys(value),length=Object.getOwnPropertyDescriptor(value,'length');
   if(!length||!('value' in length)||!Number.isSafeInteger(length.value)||length.value<0||keys.length!==length.value+1)throw new Error('Sparse/extra array field');
   // Inspect all index descriptors first; do not execute caller map, iterators or getters.
   const fields:unknown[]=[];
   for(let i=0;i<length.value;i++){
    const descriptor=Object.getOwnPropertyDescriptor(value,String(i));
    if(!descriptor||!descriptor.enumerable||!('value' in descriptor))throw new Error('Accessor/non-JSON array field');
    fields.push(descriptor.value);
   }
   const parts:string[]=[];
   for(let i=0;i<fields.length;i++)parts.push(canonical(fields[i],active));
   return '['+parts.join(',')+']';
  }
  if(Object.getPrototypeOf(value)!==Object.prototype&&Object.getPrototypeOf(value)!==null)throw new Error('Non-plain record');
  const keys=Reflect.ownKeys(value),fields:{key:string;value:unknown}[]=[];
  // Snapshot only ordinary own enumerable data properties before inspecting nested values.
  for(const key of keys){
   if(typeof key!=='string')throw new Error('Unknown hidden field');
   const descriptor=Object.getOwnPropertyDescriptor(value,key);
   if(!descriptor||!descriptor.enumerable||!('value' in descriptor))throw new Error('Accessor/hidden field');
   fields.push({key,value:descriptor.value});
  }
  fields.sort((a,b)=>a.key<b.key?-1:a.key>b.key?1:0);
  return '{'+fields.map(field=>JSON.stringify(field.key)+':'+canonical(field.value,active)).join(',')+'}';
 }finally{active.delete(value);}
}
const requireValue=(ok:unknown,message:string):void=>{if(!ok)throw new Error(message);};
function freezeReviewedData<T>(value:T):T {
 if(value&&typeof value==='object'){
  for(const child of Object.values(value))freezeReviewedData(child);
  Object.freeze(value);
 }
 return value;
}
// Deep-frozen private baseline; every public getter returns an independent deep copy.
const trusted=freezeReviewedData(expandTransport(reviewedTransport) as unknown as CaseCatalog);
const trustedContent=canonical(trusted);
const trustedCasesByContent=new Map(trusted.cases.map(file=>[canonical(file),file]));
const V2_PREDICATES:ReadonlySet<V2Predicate>=new Set(['reported_beneficial_holding','listed_subsidiary','issuer_attributed_ownership','issuer_estimated_payment','expected_agreement_payment','announced_contract_award','sole_trustee','sole_member','record_holding','party_attributed_holding','conditional_equity_commitment','form4_direct_holding','form4_named_indirect_holding','historical_direct_holding','historical_named_trust_holding']);
const NON_ADDITION=new Set(['non_additive_same_reported_block','non_additive_potentially_overlapping_dated_reports','non_additive_different_financial_stages','non_additive_different_audit_scopes','non_additive_separate_dated_observations','non_additive_same_security_exposure']);
/** Structural safeguards are additional to exact pinned equality, never runtime content approval. */
function validate(catalog:CaseCatalog):void {
 requireValue(catalog.schemaVersion==='olympus.case-diagram.2'&&catalog.cases.length===19,'Explicit v2 schema/cohort required');
 requireValue(canonical(catalog.counts)===canonical({A:32,B:27,R:13})&&!catalog.renderReviewComplete,'Classification/render gate drift');
 const all=catalog.cases.flatMap(f=>f.claims),edges=catalog.cases.flatMap(f=>f.edges);
 requireValue(all.length===72&&edges.length===73&&catalog.cases.flatMap(f=>f.nodes).length===91,'Exact 19/72/73/91 cohort required');
 requireValue(new Set(all.map(c=>c.claimId)).size===72&&new Set(edges.map(e=>e.id)).size===73,'Duplicate claim/relation ID');
 for(const file of catalog.cases){
  const sources=new Set(file.sources.map(s=>s.id)), claims=new Map(file.claims.map(c=>[c.claimId,c])),nodes=new Set(file.nodes.map(n=>n.id));
  requireValue(sources.size===file.sources.length&&nodes.size===file.nodes.length,'Duplicate case-local identity');
  for(const s of file.sources)requireValue(s.independentCorroboration===false&&(s.url===null||safeSourceUrl(s.url)),'Unsafe or unqualified source');
  for(const c of file.claims){
   requireValue(c.profileId===file.profileId&&c.sourceIds.length&&c.sourceIds.every(s=>sources.has(s)),'Full source closure required');
   for(const field of ['statement','proposedLabel','proposedEndpoints','dateLabel','mandatoryBoundary','alwaysVisibleQualification','directionMeaning','capacityAndDirectness','reviewedSourceLocator'] as const)requireValue(c[field].length>0,'Missing mandatory '+field);
   requireValue((c.classCode==='R')===file.readerFactIds.includes(c.claimId),'Reader-only classification drift');
   requireValue((c.classCode==='R')===!file.edges.some(e=>e.claimId===c.claimId),'Reader-only must have zero relations');
   requireValue(Boolean(file.v2)===Boolean(c.v2),'Explicit v2 claim evidence required');
   if(c.v2){
    const v=c.v2;
    requireValue(canonical(c.sourceIds)===canonical(v.recursiveDependencySourceIds),'Source closure cannot be truncated');
    requireValue([...v.directSourceIds,...v.dependencySourceIds].every(s=>c.sourceIds.includes(s)),'Direct/source dependency absent');
    for(const id of v.recursiveDependencyClaimIds){const dep=claims.get(id);requireValue(dep&&dep.sourceIds.every(s=>c.sourceIds.includes(s)),'Recursive context/source closure absent');}
    requireValue(v.dependencyClaimIds.every(id=>v.recursiveDependencyClaimIds.includes(id)),'Recursive claim closure absent');
    requireValue(v.nonAdditionGroupIds.every(id=>file.v2!.nonAdditionGroups.some(g=>g.id===id&&g.claimIds.includes(c.claimId))),'Non-addition guard absent');
    requireValue(canonical(v.relationIds)===canonical(file.edges.filter(e=>e.claimId===c.claimId).map(e=>e.id)),'Extra or missing role relation');
    requireValue(canonical(c.dates)===canonical(v.readerClaimRecord.dates)&&canonical(c.exclusions)===canonical(v.readerClaimRecord.exclusions),'Original dates/exclusions changed');
   }
  }
  for(const e of file.edges){
   requireValue(nodes.has(e.from)&&nodes.has(e.to)&&claims.has(e.claimId)&&e.kind in THREAD_STYLES,'Unknown endpoint/claim/relation kind');
   requireValue(e.width===1.5&&e.assertionBasis==='explicit_source_attribution','Only fixed-width explicit relations');
   requireValue(Boolean(e.v2)===Boolean(file.v2),'Explicit v2 relation required');
   if(e.v2){const r=e.v2;requireValue(V2_PREDICATES.has(r.predicate)&&r.predicate===e.kind,'Unsupported v2 predicate');requireValue(r.id===e.id&&r.claimId===e.claimId&&r.fromNodeId===e.from&&r.toNodeId===e.to&&r.label===e.role,'Relation topology/role drift');requireValue(r.capacity.length&&r.financialStage.length&&r.dateLabel.length&&r.alwaysVisibleQualification.length&&r.locator.length,'Incomplete relation display envelope');}
  }
  if(file.v2)for(const g of file.v2.nonAdditionGroups)requireValue(NON_ADDITION.has(g.aggregation)&&!g.amountAggregationAllowed&&g.individualAllocations===null&&g.qualification.length,'Unsafe non-addition kind');
  for(const value of [file,...file.nodes,...file.edges])requireValue(!value.publicationEligible&&!value.publicGraphEligible&&!value.pathEligible&&!value.aggregateEligible&&!value.researchExportEligible&&value.canonicalEntityId===null&&value.countryAssociations.length===0,'Admission/canonical/geographic expansion blocked');
 }
}
validate(trusted);
/** Only the exact generated v2 catalog is accepted. Raw v1, review candidates and reader projections are not runtime inputs. */
export function adaptReviewedInput(input:unknown=trusted):CaseCatalog {
 requireValue(canonical(input)===trustedContent,'Reviewed content differs: reject missing/unknown fields, extra edges and source drift');
 validate(trusted);return clone(trusted);
}
function verifiedPinnedCase(value:unknown):CaseFile {
 // Do not even read caller IDs before structural validation; lookup uses the stable snapshot.
 const expected=trustedCasesByContent.get(canonical(value));
 requireValue(expected,'Case display differs from the reviewed local projection');
 return expected!;
}
export function assertCaseFile(value:unknown):asserts value is CaseFile {void verifiedPinnedCase(value);}
/** Rendering consumers use this pinned, immutable independent copy, never the checked caller object. */
export function getVerifiedCaseFile(value:unknown):CaseFile {return freezeReviewedData(clone(verifiedPinnedCase(value)));}
/** Invalid-content fallback reads only own data-descriptor local keys, never getters or caller text. */
export function getPinnedReaderFallback(value:unknown):CaseFile|null {
 try {
  if(!value||typeof value!=='object'||Array.isArray(value)||(Object.getPrototypeOf(value)!==Object.prototype&&Object.getPrototypeOf(value)!==null))return null;
  const id=Object.getOwnPropertyDescriptor(value,'id'),profile=Object.getOwnPropertyDescriptor(value,'profileId');
  if(!id||!profile||!('value' in id)||!('value' in profile)||!id.enumerable||!profile.enumerable||typeof id.value!=='string'||typeof profile.value!=='string')return null;
  const expected=trusted.cases.find(file=>file.id===id.value&&file.profileId===profile.value);
  return expected?freezeReviewedData(clone(expected)):null;
 }catch{return null;}
}
export function assertCaseCatalog(value:unknown):asserts value is CaseCatalog {requireValue(canonical(value)===trustedContent,'Catalog differs from the reviewed local projection');}
export function getCase(profileId:string):CaseFile|null{return clone(trusted.cases.find(c=>c.profileId===profileId)??null);}
export function getCaseCatalog():CaseCatalog{return clone(trusted);}
export function neighbors(input:CaseFile,node:string):{nodeId:string;edgeId:string;direction:'incoming'|'outgoing'}[]{
 const file=getVerifiedCaseFile(input);requireValue(file.nodes.some(n=>n.id===node),'Unknown local node');
 return file.edges.filter(e=>e.from===node||e.to===node).map(e=>({nodeId:e.from===node?e.to:e.from,edgeId:e.id,direction:e.from===node?'outgoing':'incoming'}));
}
/** Explicit compatibility gate: the unchanged v1 scene may receive only its exact frozen cases.
 * Never coerce v2 predicates or lose context to satisfy a legacy scene shape. */
export function getSceneCompatibility(input:CaseFile):{mode:'frozen_v1_model';caseFile:FrozenV1CaseFile}|{mode:'reader_only_until_scene_review';reason:string;caseFile:CaseFile}{
 const file=getVerifiedCaseFile(input);return file.v2?{mode:'reader_only_until_scene_review',reason:file.v2.legacySceneHoldReason,caseFile:file}:{mode:'frozen_v1_model',caseFile:file as FrozenV1CaseFile};
}
