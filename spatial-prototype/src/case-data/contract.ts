/** Case-local display contract. Deliberately no map, path, registry or admission callback. */
export type NodeKind = 'person' | 'organization' | 'institution' | 'group_label' | 'joint_block' | 'project_or_franchise' | 'documentary_event' | 'unresolved_endpoint' | 'securities' | 'trust';
export type LegacyThreadKind = 'holding' | 'franchise' | 'documentary_role' | 'reported_grant' | 'reported_financing' | 'group_membership' | 'noncash_transfer' | 'succession' | 'institutional_event';
export type V2Predicate = 'reported_beneficial_holding'|'listed_subsidiary'|'issuer_attributed_ownership'|'issuer_estimated_payment'|'expected_agreement_payment'|'announced_contract_award'|'sole_trustee'|'sole_member'|'record_holding'|'party_attributed_holding'|'conditional_equity_commitment'|'form4_direct_holding'|'form4_named_indirect_holding'|'historical_direct_holding'|'historical_named_trust_holding';
export type ThreadKind = LegacyThreadKind | V2Predicate;
export type NonAdditionKind = 'non_additive_joint_block'|'non_additive_same_reported_block'|'non_additive_potentially_overlapping_dated_reports'|'non_additive_different_financial_stages'|'non_additive_different_audit_scopes'|'non_additive_separate_dated_observations'|'non_additive_same_security_exposure';
export type JsonValue = null | boolean | number | string | JsonValue[] | { [key:string]:JsonValue };
export type JsonRecord = { [key:string]:JsonValue };
export interface Exclusion { sourceField:string; polarity:'not_established'; statement:string }
export interface CaseSource {
  id:string; title:string; publisher:string; url:string | null; locator:string;
  publishedOn:string | null; accessedOn:string; dateFields:JsonRecord;
  exclusions:Exclusion[]; custody:string; accessDepth:string; sourceFamily:string | null;
  independentCorroboration:false;
}
export interface CaseBoundary {
  publicationEligible:false; publicGraphEligible:false; pathEligible:false;
  aggregateEligible:false; researchExportEligible:false; canonicalEntityId:null;
  countryAssociations:never[];
}
export interface CaseNode extends CaseBoundary {
  id:string; caseId:string; label:string; kind:NodeKind; qualification:string;
  claimIds:string[];
}
export interface V2ClaimEvidence {
  originalClaimRecord:JsonRecord; readerClaimRecord:JsonRecord; sourceDateFields:JsonRecord;
  flags:JsonRecord; directSourceIds:string[]; dependencySourceIds:string[];
  dependencyClaimIds:string[]; recursiveDependencyClaimIds:string[];
  recursiveDependencySourceIds:string[]; nonAdditionGroupIds:string[]; relationIds:string[];
}
export interface NonAdditionGroup {
  id:string; aggregation:NonAdditionKind; qualification:string; claimIds:string[];
  individualAllocations:null; amountAggregationAllowed:false;
}
export interface V2Relation {
  id:string; claimId:string; fromNodeId:string; toNodeId:string; predicate:V2Predicate;
  label:string; financialStage:string; capacity:string; amount:JsonValue;
  assertionBasis:'explicit_source_attribution'; edgeWidth:1.5;
  publicationEligible:false; publicGraphEligible:false; pathEligible:false;
  aggregateEligible:false; researchExportEligible:false;
  dateLabel:string; alwaysVisibleQualification:string; sourceIds:string[]; locator:string;
}
export interface CaseClaim {
  /** Absent on exact frozen v1 claims; mandatory for every claim in the v2 additions cohort. */
  v2?:V2ClaimEvidence;
  number:number; claimId:string; profileId:string; classCode:'A'|'B'|'R';
  proposedEndpoints:string; proposedLabel:string; dateLabel:string; mandatoryBoundary:string;
  alwaysVisibleQualification:string; directionMeaning:string; capacityAndDirectness:string;
  reviewedSourceLocator:string; sharedBlockId:string | null; statement:string;
  sourceIds:string[]; dates:JsonRecord; financialStage:string; details:JsonRecord;
  qualifications:string[]; exclusions:Exclusion[]; reviewLimitations:string[];
  review:{reviewedOn:string; scope:string; disposition:string};
}
export interface CaseEdge extends CaseBoundary {
  v2?:V2Relation;
  id:string; caseId:string; claimId:string; from:string; to:string;
  role:string; kind:ThreadKind; sharedBlockId:string|null;
  assertionBasis:'explicit_source_attribution'; width:1.5;
}
export interface CaseFile extends CaseBoundary {
  v2?:{cohort:'reviewed_v2_additions'; nonAdditionGroups:NonAdditionGroup[];
    legacySceneSupport:'held_use_complete_v2_reader'; legacySceneHoldReason:string; displayContract:JsonRecord};
  id:string; profileId:string; label:string;
  researchJurisdiction:{countryCode:string;label:string;basis:'research_jurisdiction';qualification:string};
  nodes:CaseNode[]; edges:CaseEdge[]; claims:CaseClaim[]; sources:CaseSource[];
  readerFactIds:string[]; constraints:string[];
  sharedBlocks:{id:string; aggregation:NonAdditionKind; individualAllocations:null; qualification?:string; subjectLabels?:string[]; profileIds?:string[]}[];
}
export interface CaseCatalog {
  schemaVersion:'olympus.case-diagram.2'; reviewedOn:string;
  counts:{A:32;B:27;R:13}; cases:CaseFile[]; renderReviewComplete:false;
  cohorts:{id:'frozen_v1'|'reviewed_v2_additions';cases:number;claims:number;relations:number;nodes:number}[];
}
export const THREAD_STYLES:Record<ThreadKind,{label:string;dash:string}> = {
  reported_beneficial_holding:{label:'Reported beneficial holding',dash:''},
  listed_subsidiary:{label:'Listed subsidiary; directness unspecified',dash:'5 5'},
  issuer_attributed_ownership:{label:'Issuer-attributed ownership',dash:'3 4'},
  issuer_estimated_payment:{label:'Issuer-estimated paid; receipt unverified',dash:'12 3 3 3'},
  expected_agreement_payment:{label:'Expected agreement payment',dash:'2 5'},
  announced_contract_award:{label:'Announced contract award',dash:'8 4'},
  sole_trustee:{label:'Sole trustee capacity',dash:'2 4'},
  sole_member:{label:'Sole LLC member capacity',dash:'2 4'},
  record_holding:{label:'Record holding',dash:''},
  party_attributed_holding:{label:'Party-attributed share statement',dash:'3 4'},
  conditional_equity_commitment:{label:'Conditional equity commitment',dash:'14 3 2 3'},
  form4_direct_holding:{label:'Form 4 direct holding',dash:''},
  form4_named_indirect_holding:{label:'Form 4 named indirect holding',dash:'6 3'},
  historical_direct_holding:{label:'Historical direct holding',dash:''},
  historical_named_trust_holding:{label:'Historical named trust holding',dash:'6 3'},
  holding:{label:'Source-reported holding / interest',dash:''},
  franchise:{label:'Franchise / concession',dash:'10 4 2 4'},
  documentary_role:{label:'Documentary role',dash:'2 4'},
  reported_grant:{label:'Foundation-reported grant',dash:'8 4'},
  reported_financing:{label:'Participant-reported financing',dash:'12 3 3 3'},
  group_membership:{label:'Listed group membership',dash:'5 5'},
  noncash_transfer:{label:'Noncash transfer role',dash:'14 4'},
  succession:{label:'Notice-reported succession',dash:'2 3 8 3'},
  institutional_event:{label:'Institutional decision',dash:'1 4'},
};
export const CASE_WARNING = 'Source-qualified historical statements. Dates may differ or be unknown. Adjacency does not establish a simultaneous chain, current holding, transitive control, payment trail or wrongdoing. Profile headings are context, not personal connection evidence.';
export function safeSourceUrl(value:string|null):string|null {
  if (!value) return null;
  try { const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null; } catch { return null; }
}

/** Structurally assignable to the incumbent v1 CaseFile, after exact identity validation.
 * This is a compatibility boundary, not permission to run an unreviewed scene. */
export type FrozenV1CaseFile = Omit<CaseFile,'edges'|'sharedBlocks'|'v2'> & {
  edges:(Omit<CaseEdge,'kind'|'v2'> & {kind:LegacyThreadKind;v2?:never})[];
  sharedBlocks:{id:string;aggregation:'non_additive_joint_block'|'non_additive_same_reported_block';individualAllocations:null}[];
  v2?:never;
};
