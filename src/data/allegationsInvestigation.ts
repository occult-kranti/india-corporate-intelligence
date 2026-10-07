import type { InvestigationFilters, InvestigationRecord, InvestigationRegistry, InvestigationRelationship, InvestigationTier } from './investigation';
import { createInvestigationMatcher, investigationPlacement } from './investigationFilters';
import { getAtlasEvidenceClosure, type AtlasSelection } from './atlasInvestigation';

export const ALLEGATIONS_NAMESPACES=['allegations-policy','allegations-institutions'] as const;
export type AllegationCohort='new'|'retained'|'all';
export type AllegationCategory='case'|'allegation'|'finding'|'outcome'|'alleged-link';
export type AllegationClaimState='active'|'withdrawn'|'superseded'|'outcome-record'|'unknown';
export interface AllegationsOptions {cohort?:AllegationCohort;category?:AllegationCategory|'all';claimState?:AllegationClaimState}
export interface AllegationEntry {
 id:string;selection:AtlasSelection;title:string;summary:string;tier:InvestigationTier;status:string;statusAsOf:string|null;
 category:AllegationCategory;cohort:'new'|'retained';claimState:AllegationClaimState;statusBasis:string;placement:string;
 sourceIds:string[];responseIds:string[];entityIds:string[];relationshipIds:string[];record?:InvestigationRecord;relationship?:InvestigationRelationship;
}
const reviewed=(namespace:string)=>(ALLEGATIONS_NAMESPACES as readonly string[]).includes(namespace);
const activeStatuses=new Set(['pending','pending-proceedings','under-investigation','trial-pending','charges-pending','provisional-attachment','proceedings-pending','appeal-pending','pending-or-procedural-not-final-guilt']);
const withdrawnStatuses=new Set(['withdrawn-claim','withdrawn-unsupported-claim','retracted-claim']);
/** Structured procedural state is not a merits finding. Inherited claims are never presumed current. */
export function allegationClaimState(row:InvestigationRecord|InvestigationRelationship,category:AllegationCategory):{claimState:AllegationClaimState;statusBasis:string} {
 if(withdrawnStatuses.has(row.status)||('kind' in row&&row.kind==='withdrawn-correction'))return {claimState:'withdrawn',statusBasis:'The retained claim was withdrawn or held. This does not establish that no underlying event occurred.'};
 if(row.status==='superseded')return {claimState:'superseded',statusBasis:'A later retained record supersedes this assertion. This is not a blanket merits acquittal.'};
 if(['allegations-policy:record:pacl-land-cis-refunds','allegations-policy:record:chapwa-toll-debarment'].includes(row.id))return {claimState:'outcome-record',statusBasis:'This reviewed case is framed by an explicit regulatory or court outcome. PACL recovery remains ongoing; the Chapwa debarment was set aside. Neither classification supplies a criminal-conviction claim.'};
 if(category==='outcome'||category==='finding')return {claimState:'outcome-record',statusBasis:'Read the precise scope and date of this outcome or finding; it does not resolve unrelated allegations.'};
 if(reviewed(row.namespace)&&activeStatuses.has(row.status))return {claimState:'active',statusBasis:'The newly reviewed record explicitly carries this pending procedural stage as of its stated status date; guilt is not inferred.'};
 return {claimState:'unknown',statusBasis:reviewed(row.namespace)?'The detailed reviewed procedural status is retained verbatim; it is not automatically classified as an active accusation.':'Inherited assertion. Current procedural status was not independently refreshed in this review; read linked responses and the original source.'};
}
const retainedAuditCaseIds=new Set(['deep-services:record:nsap-davp-earmarking','atlas-oversight:record:ov-uk-reconstruction','atlas-oversight:record:ov-ts-police-loan','atlas-oversight:record:ov-bihar-pmkisan']);
const proceedingEdgeKinds=new Set(['audit-finding','adjudicates','enforcement-order','audit-direction','legal-outcome']);
function recordCategory(row:InvestigationRecord,relationships:Map<string,InvestigationRelationship>):AllegationCategory|null {
 if(row.kind==='withdrawn-correction')return 'outcome';
 if(['response','counter-evidence','denial','relationship-record','policy-change'].includes(row.kind))return null;
 if(['audit-finding','judicial-finding','court-finding','finding','audit'].includes(row.kind)&&row.tier==='documented')return 'finding';
 if(['judgment','judicial-decision','regulatory-decision','case-outcome','outcome-record','court-order','order','procedural-status','proceeding','legal-proceeding'].includes(row.kind))return 'outcome';
 if(['allegation','filed-allegation','allegation-record','charge','indictment'].includes(row.kind))return 'allegation';
 if(row.kind==='investigation-case'&&(reviewed(row.namespace)||row.tier==='alleged'||retainedAuditCaseIds.has(row.id)||row.relationshipIds.some(id=>{const edge=relationships.get(id);return edge&&(edge.tier==='alleged'||proceedingEdgeKinds.has(edge.kind));})))return 'case';
 return null;
}
export function getAllegationsView(registry:InvestigationRegistry,filters:InvestigationFilters={},options:AllegationsOptions={}) {
 const cohort=options.cohort??'new',matches=createInvestigationMatcher(registry,filters),entities=new Map(registry.entities.map(row=>[row.id,row])),relationships=new Map(registry.relationships.map(row=>[row.id,row])),sources=new Set(registry.sources.map(row=>row.id));
 const supported=(row:InvestigationRecord|InvestigationRelationship)=>row.sourceIds.length>0&&[...row.sourceIds,...row.geography.flatMap(geo=>geo.sourceIds)].every(id=>sources.has(id));
 const included=(namespace:string)=>cohort==='all'||(cohort==='new')===reviewed(namespace);
 const entries:AllegationEntry[]=[];
 for(const record of registry.records){
  const category=recordCategory(record,relationships);if(!category||!supported(record)||!included(record.namespace)||!matches(record))continue;
  const responseIds=[...new Set(record.relationshipIds.flatMap(id=>relationships.get(id)?.responseIds??[]))];
  entries.push({id:record.id,selection:{kind:'record',id:record.id},title:record.title,summary:record.summary,tier:record.tier,status:record.status,statusAsOf:record.statusAsOf,category,cohort:reviewed(record.namespace)?'new':'retained',...allegationClaimState(record,category),placement:investigationPlacement(record,filters),sourceIds:record.sourceIds,responseIds,entityIds:record.entityIds,relationshipIds:record.relationshipIds,record});
 }
 for(const relationship of registry.relationships){
  if(relationship.tier!=='alleged'||!supported(relationship)||!entities.get(relationship.from)?.resolved||!entities.get(relationship.to)?.resolved||!included(relationship.namespace)||!matches(relationship))continue;
  entries.push({id:relationship.id,selection:{kind:'relationship',id:relationship.id},title:`${entities.get(relationship.from)?.label??relationship.from} → ${entities.get(relationship.to)?.label??relationship.to}`,summary:relationship.summary,tier:relationship.tier,status:relationship.status,statusAsOf:relationship.statusAsOf,category:'alleged-link',cohort:reviewed(relationship.namespace)?'new':'retained',...allegationClaimState(relationship,'alleged-link'),placement:investigationPlacement(relationship,filters),sourceIds:relationship.sourceIds,responseIds:relationship.responseIds,entityIds:[relationship.from,relationship.to],relationshipIds:[relationship.id],relationship});
 }
 const filtered=entries.filter(entry=>(!options.category||options.category==='all'||entry.category===options.category)&&(!options.claimState||entry.claimState===options.claimState)).sort((a,b)=>((b.record??b.relationship)?.fromDate??'').localeCompare((a.record??a.relationship)?.fromDate??'')||a.id.localeCompare(b.id));
 const evidence=getAtlasEvidenceClosure(registry,filtered.map(entry=>entry.selection));
 const count=(test:(entry:AllegationEntry)=>boolean)=>filtered.filter(test).length;
 return {entries:filtered,...evidence,evidenceRegistry:{...registry,...evidence},counts:{total:filtered.length,cases:count(row=>row.category==='case'),allegations:count(row=>row.category==='allegation'),findings:count(row=>row.category==='finding'),outcomes:count(row=>row.category==='outcome'),allegedLinks:count(row=>row.category==='alleged-link'),newlyReviewed:count(row=>row.cohort==='new'),retained:count(row=>row.cohort==='retained'),active:count(row=>row.claimState==='active'),withdrawn:count(row=>row.claimState==='withdrawn'),superseded:count(row=>row.claimState==='superseded'),unknown:count(row=>row.claimState==='unknown')},cohort,
 interpretation:'Newly reviewed records and inherited attributed assertions remain separate. Case, finding, outcome and relationship counts overlap and are not unique incidents, proven corruption, victims, or transactions. Sources establish attribution and procedural stages, not guilt. Linked responses remain in the evidence closure even outside the display filters.'};
}
