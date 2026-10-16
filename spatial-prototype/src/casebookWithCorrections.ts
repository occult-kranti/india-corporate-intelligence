import { buildCasebookPacket as retainedPacket, casebookMarkdown as retainedMarkdown } from './casebookStore';
import type { CasebookData } from './casebookStore';
import type { InvestigationRegistry } from './domain';
import { sourceCorrection, correctionsForItems, presentationTitle, presentationSummary } from './sourceCorrections';
/** Original export rows stay exact; interpretation changes travel in an explicit sidecar. */
export function buildCasebookPacket(book: CasebookData, registry: InvestigationRegistry) {
  const packet = retainedPacket(book, registry);
  return { ...packet, sourceCorrections: correctionsForItems([...packet.entities, ...packet.relationships, ...packet.records]),
    limitations: [...packet.limitations, 'Any sourceCorrections sidecar supersedes the specified raw claim for interpretation and excludes it from factual funding/path use. Raw objects remain audit material.'] };
}
/** Only the derived prose view is qualified; raw JSON objects and saved casebooks stay untouched. */
export function casebookMarkdown(packet: ReturnType<typeof buildCasebookPacket>): string {
  const corrected = <T extends InvestigationRegistry['records'][number] | InvestigationRegistry['relationships'][number]>(item: T): T => {
    const correction=sourceCorrection(item.id);
    if(!correction)return item;
    return {...item,...('title' in item?{title:presentationTitle(item)}:{label:presentationTitle(item)}),
      summary:`SOURCE-SCOPE CORRECTION: ${presentationSummary(item)} ${correction.reason} ${correction.interpretationNotice}`,
      tier:'reported',status:'not-drawn',limitations:[...item.limitations,...correction.findings]} as T;
  };
  return retainedMarkdown({...packet,entities:packet.entities.map(item=>({...item,summary:presentationSummary(item)})),relationships:packet.relationships.map(corrected),records:packet.records.map(corrected)});
}
