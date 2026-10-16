import definitions from './source-correction-progressive.json';
import type { InvestigationRegistry } from './domain';
import { canonicalCorrectionValue as canonical, correctionSha256, freezeCorrection } from './exactCorrectionIntegrity';
export function validateProgressiveDefinitions(value:unknown=definitions) {
 if(correctionSha256(canonical(value))!=='490c3cd617bccaa2be7dbc6132a5e8f80b34c6eaaff4aabf8fdf5025c20e86fd')throw new Error('Progressive definition drift');
}
validateProgressiveDefinitions();
export const PROGRESSIVE_CORRECTIONS=freezeCorrection(definitions);
export function progressiveCorrection(id:string){return PROGRESSIVE_CORRECTIONS.find(row=>row.targetIds.includes(id))??null;}
export function validateProgressiveItem(item:{id:string}) {
 const correction=progressiveCorrection(item.id);if(!correction)return;
 if(canonical(item)!==canonical(correction.expectedItems.find(row=>row.id===item.id)))throw new Error(`Progressive object drift: ${item.id}`);
}
export function validateProgressiveRegistry(registry:Pick<InvestigationRegistry,'entities'|'relationships'|'records'|'sources'>, options:{requireAllTargets?:boolean}={}) {
 const rows=[...registry.entities,...registry.relationships,...registry.records];
 for(const entry of PROGRESSIVE_CORRECTIONS){const present=rows.filter(row=>entry.targetIds.includes(row.id));
  if(options.requireAllTargets&&entry.targetIds.some(id=>!present.some(row=>row.id===id)))throw new Error(`Progressive missing target in complete registry: ${entry.id}`);
  if(!present.length)continue;
  if(new Set(present.map(row=>row.id)).size!==present.length)throw new Error(`Progressive duplicate target: ${entry.id}`);
  for(const item of present)validateProgressiveItem(item);
  for(const expected of entry.expectedSources){const actual=registry.sources.filter(row=>row.id===expected.id);if(actual.length!==1||canonical(actual[0])!==canonical(expected))throw new Error(`Progressive source closure drift: ${expected.id}`);}
 }
}
