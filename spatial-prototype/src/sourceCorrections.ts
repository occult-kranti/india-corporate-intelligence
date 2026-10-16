import donationCorrection from './source-corrections.json';
import disclosureCorrection from './source-correction-section182.json';

interface SourceCorrection {
  schemaVersion:number;id:string;reviewedAt:string;status:string;
  graphEligible:boolean;pathEligible:boolean;baselineCanonicalSha256:string;reviewReceiptSha256:string;
  targetIds:readonly string[];sourceId:string;sourceUrl:string;sourceTitle:string;
  sourceDisplayedUpdatedAt:string;sourcePublishedAt:null;sourceDateBasis:string;sourceDateNotice:string;
  label:string;summary:string;reason:string;findings:readonly string[];amount:null;
  relatedClaimStatus:string;interpretationNotice:string;
  entityPresentationId:string|null;supersededEntitySentence:string|null;entityReplacementSentence:string|null;
}
const freeze = (entry:SourceCorrection):Readonly<SourceCorrection> => Object.freeze({...entry,
  targetIds:Object.freeze([...entry.targetIds]),findings:Object.freeze([...entry.findings])});
/** Exact-target review sidecars. Never rewrite retained registry objects or infer aliases. */
export const SOURCE_CORRECTION = freeze(donationCorrection);
export const SECTION182_CORRECTION = freeze(disclosureCorrection);
export const SOURCE_CORRECTIONS = Object.freeze([SOURCE_CORRECTION, SECTION182_CORRECTION]);
export function sourceCorrection(id:string) { return SOURCE_CORRECTIONS.find(row=>row.targetIds.includes(id)) ?? null; }
export function presentationCorrection(id:string) { return sourceCorrection(id) ?? SOURCE_CORRECTIONS.find(row=>row.entityPresentationId===id) ?? null; }
export function sourceCitationCorrection(id:string) { return SOURCE_CORRECTIONS.find(row=>row.sourceId===id) ?? null; }
export function presentationTitle(item:{id:string;title?:string;label?:string}):string {
  const correction=sourceCorrection(item.id);
  return correction ? `Adani Group · ${correction.label}` : item.title ?? item.label ?? item.id;
}
export function presentationSummary(item:{id:string;summary:string}):string {
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
