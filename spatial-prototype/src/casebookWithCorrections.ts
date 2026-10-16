import { validateProgressiveRegistry } from './progressiveCorrections';
import { buildCasebookPacket as retainedPacket, casebookMarkdown as retainedMarkdown } from './casebookStore';
import type { CasebookData } from './casebookStore';
import type { InvestigationRegistry } from './domain';
import { presentationCorrection, validateSourceCorrectionsRegistry, correctionsForItems, presentationTitle, presentationSummary, sourceCitationCorrection, validateJioHoldRegistry } from './sourceCorrections';
/** Original export rows stay exact; interpretation changes travel in an explicit sidecar. */
export function buildCasebookPacket(book: CasebookData, registry: InvestigationRegistry, options: { requireAllTargets?: boolean } = {}) {
  validateSourceCorrectionsRegistry(registry, options);
  const packet = retainedPacket(book, registry);
  return { ...packet, sourceCorrections: correctionsForItems([...packet.entities, ...packet.relationships, ...packet.records]),
    limitations: [...packet.limitations, 'Any sourceCorrections sidecar supersedes only specified raw fields. A graphEligible:false correction is excluded from factual graph/path use; text-only qualifications do not change existing eligibility. Raw objects remain audit material.'] };
}
/** Only the derived prose view is qualified; raw JSON objects and saved casebooks stay untouched. */
export function casebookMarkdown(packet: ReturnType<typeof buildCasebookPacket>): string {
  validateJioHoldRegistry(packet);
  validateProgressiveRegistry(packet);
  const corrected = <T extends InvestigationRegistry['records'][number] | InvestigationRegistry['relationships'][number]>(item: T): T => {
    const correction=presentationCorrection(item.id);
    if(!correction)return item;
    return {...item,...('title' in item?{title:presentationTitle(item)}:{label:presentationTitle(item)}),
      summary:`SOURCE-SCOPE CORRECTION: ${presentationSummary(item)} ${correction.reason} ${correction.interpretationNotice}`,
      ...(correction.graphEligible?{}:{tier:'reported',status:'not-drawn',amounts:[]}),limitations:[...item.limitations,...correction.findings]} as T;
  };
  return retainedMarkdown({...packet,sources:packet.sources.map(source=>{const citation=sourceCitationCorrection(source.id);return citation?{...source,title:citation.sourceTitle,limitations:[...source.limitations,citation.sourceDateNotice]}:source;}),entities:packet.entities.map(item=>({...item,summary:presentationSummary(item)})),relationships:packet.relationships.map(corrected),records:packet.records.map(corrected)});
}
