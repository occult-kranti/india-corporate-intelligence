import { PROGRESSIVE_CORRECTIONS, validateProgressiveItem, validateProgressiveRegistry } from './progressiveCorrections';
export { PROGRESSIVE_CORRECTIONS, validateProgressiveRegistry, validateProgressiveDefinitions } from './progressiveCorrections';
import { INHERITED_ABSENCE_CORRECTIONS, inheritedAbsenceCorrection, inheritedAbsenceFields, validateInheritedAbsenceRegistry } from './inheritedAbsenceCorrections';
export { validateInheritedAbsenceRegistry, INHERITED_ABSENCE_CORRECTIONS } from './inheritedAbsenceCorrections';
import { JIO_HOLD_CORRECTIONS, JIO_SOURCE_CITATIONS, validateJioHoldItem, validateJioHoldRegistry } from './jioHoldCorrections';
export { JIO_HOLD_CORRECTIONS, validateJioHoldRegistry, validateJioHoldDefinitions } from './jioHoldCorrections';
import type { CorrectionValidationOptions } from './jioHoldCorrections';
import type { InvestigationRegistry } from './domain';
import donationCorrection from './source-corrections.json';
import disclosureCorrection from './source-correction-section182.json';

interface SourceCorrection {
  subjectLabel?:string;displayTitle?:string;schemaVersion:number;id:string;reviewedAt:string;status:string;
  graphEligible:boolean;pathEligible:boolean;baselineCanonicalSha256:string;reviewReceiptSha256:string;
  targetIds:readonly string[];sourceId:string;sourceUrl:string;sourceTitle:string;
  sourceDisplayedUpdatedAt:string|null;sourcePublishedAt:string|null;sourceDateBasis:string;sourceDateNotice:string;
  label:string;summary:string;reason:string;findings:readonly string[];amount:null;
  relatedClaimStatus:string;interpretationNotice:string;
  entityPresentationId:string|null;supersededEntitySentence:string|null;entityReplacementSentence:string|null;
}
const freeze = (entry:SourceCorrection):Readonly<SourceCorrection> => Object.freeze({...entry,
  targetIds:Object.freeze([...entry.targetIds]),findings:Object.freeze([...entry.findings])});
/** Exact-target review sidecars. Never rewrite retained registry objects or infer aliases. */
export const SOURCE_CORRECTION = freeze(donationCorrection);
export const SECTION182_CORRECTION = freeze(disclosureCorrection);
export const SOURCE_CORRECTIONS = Object.freeze([SOURCE_CORRECTION, SECTION182_CORRECTION, ...INHERITED_ABSENCE_CORRECTIONS.map(freeze), ...JIO_HOLD_CORRECTIONS.map(freeze), ...PROGRESSIVE_CORRECTIONS.map(freeze)]);
export function sourceCorrection(id:string) { return SOURCE_CORRECTIONS.find(row=>!row.graphEligible&&row.targetIds.includes(id)) ?? null; }
export function presentationCorrection(id:string) { return inheritedAbsenceCorrection(id) ?? SOURCE_CORRECTIONS.find(row=>row.targetIds.includes(id)||row.entityPresentationId===id) ?? null; }
/** Citation metadata never contains claim reasons. Shared citations cannot inherit the first
 * claimant's hold or subject-specific reasoning. A source is never an eligibility selector. */
const legacyCitationMetadata = [SOURCE_CORRECTION, SECTION182_CORRECTION, ...INHERITED_ABSENCE_CORRECTIONS].map(({sourceId,sourceUrl,sourceTitle,sourcePublishedAt,sourceDisplayedUpdatedAt,sourceDateBasis,sourceDateNotice})=>Object.freeze({sourceId,sourceUrl,sourceTitle,sourcePublishedAt,sourceDisplayedUpdatedAt,sourceDateBasis,sourceDateNotice}));
const sourceCitations = Object.freeze([...legacyCitationMetadata, ...JIO_SOURCE_CITATIONS]);
export function sourceCitationCorrection(id:string) { return sourceCitations.find(row=>row.sourceId===id) ?? null; }
export function validateSourceCorrectionsRegistry(registry:InvestigationRegistry, options:CorrectionValidationOptions = {}) {
  validateInheritedAbsenceRegistry(registry);
  validateJioHoldRegistry(registry, options);
  validateProgressiveRegistry(registry, options);
}
export function presentationTitle(item:{id:string;title?:string;label?:string}):string {
  validateJioHoldItem(item);
  validateProgressiveItem(item);
  const fields=inheritedAbsenceFields(item);
  if(fields?.title)return fields.title;
  const correction=SOURCE_CORRECTIONS.find(row=>row.targetIds.includes(item.id));
  return correction ? correction.displayTitle ?? [correction.subjectLabel, correction.label].filter(Boolean).join(' · ') : item.title ?? item.label ?? item.id;
}
export function presentationSummary(item:{id:string;summary:string}):string {
  validateJioHoldItem(item);
  validateProgressiveItem(item);
  const fields=inheritedAbsenceFields(item);
  if(fields)return fields.summary;
  const correction=presentationCorrection(item.id);
  if(!correction)return item.summary;
  if(item.id===correction.entityPresentationId && correction.supersededEntitySentence && correction.entityReplacementSentence)
    return item.summary.replace(correction.supersededEntitySentence,correction.entityReplacementSentence);
  return correction.summary;
}
export function presentationTier(item:{id:string;tier?:string}):string {
  return sourceCorrection(item.id) ? 'source correction · excluded from factual network' : item.tier ?? 'source-bound identity';
}
/** Include only the sidecars whose exact targets or qualified entity are in this packet. */
export function correctionsForItems(items:ReadonlyArray<{id:string}>) {
  return SOURCE_CORRECTIONS.filter(row=>items.some(item=>row.targetIds.includes(item.id)||item.id===row.entityPresentationId));
}
