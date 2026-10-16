import rawEntries from './source-correction-inherited-absence.json';
import type { InvestigationRegistry } from './domain';
type Entry=Omit<(typeof rawEntries)[number], 'targetIds'|'fields'|'expectedItems'> & {targetIds:string[];fields:Record<string,{title?:string;summary:string}>;expectedItems:{id:string}[]};
const entries=rawEntries as unknown as Entry[];
const canonical=(value:unknown):string=>Array.isArray(value)?'['+value.map(canonical).join(',')+']':value&&typeof value==='object'?'{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical((value as Record<string,unknown>)[key])).join(',')+'}':JSON.stringify(value);
export const INHERITED_ABSENCE_CORRECTIONS=entries;
export function inheritedAbsenceCorrection(id:string){return entries.find(entry=>entry.entityPresentationId===id||entry.targetIds.includes(id))??null;}
export function inheritedAbsenceFields(item:{id:string}) {
  const entry=inheritedAbsenceCorrection(item.id);if(!entry)return null;
  const expected=entry.expectedItems.find(row=>row.id===item.id);
  if(canonical(item)!==canonical(expected))throw new Error(`Inherited absence object drift: ${item.id}`);
  return (entry.fields as Record<string,{title?:string;summary:string}>)[item.id];
}
/** Validate every present exact target before it enters any reader, search, map or export.
 * Partial preview/casebook inputs are allowed; present targets must retain full source closure.
 * No WeakMap cache: a mutated input must fail on the next boundary call too. */
export function validateInheritedAbsenceRegistry(registry:InvestigationRegistry) {
  const rows=[...registry.entities,...registry.relationships,...registry.records];
  for(const entry of entries) {
    const present=rows.filter(row=>row.id===entry.entityPresentationId||entry.targetIds.includes(row.id));
    if(!present.length)continue;
    if(new Set(present.map(row=>row.id)).size!==present.length)throw new Error(`Inherited absence duplicate target: ${entry.id}`);
    for(const item of present)inheritedAbsenceFields(item);
    const sources=registry.sources.filter(source=>source.id===entry.sourceId);
    if(sources.length!==1||canonical(sources[0])!==canonical(entry.expectedSource))throw new Error(`Inherited absence source drift: ${entry.sourceId}`);
  }
}
