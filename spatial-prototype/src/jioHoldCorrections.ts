import rawEntries from './source-correction-jio-holds.json';
import rawCitations from './source-citation-jio-dates.json';
import type { InvestigationRegistry } from './domain';
import { canonicalCorrectionValue as canonical, correctionSha256, freezeCorrection } from './exactCorrectionIntegrity';

export const JIO_BASELINE_SHA256 = '048f89ffd008a498212ff2ac71d4413aef09b138a50ab77f336a23fec4722064';
const definitionSha256 = '731e61be5b944faa7a99d19a5ae59e9a8524b52b2b48dfabc3ba32f5e04afb24';
const citationSha256 = '11edbddcbafccc1d2313206f34c133b7b1adacc9010873ece1027098fc250265';
/** Pin the whole definitions, including exact target IDs, full object hashes, source closure,
 * baseline, recommendation and receipt. A changed sidecar needs a new reviewed definition. */
export function validateJioHoldDefinitions(entries: unknown = rawEntries, citations: unknown = rawCitations) {
  if (correctionSha256(canonical(entries)) !== definitionSha256) throw new Error('Jio hold definition drift: exact targets, objects, closure or review pins changed');
  if (correctionSha256(canonical(citations)) !== citationSha256) throw new Error('Jio citation metadata drift');
  for (const entry of rawEntries) {
    for (const [objects, hashes] of [[entry.expectedItems, entry.expectedItemJsonStringifySha256], [entry.expectedSources, entry.expectedSourceJsonStringifySha256], [entry.expectedEndpoints, entry.expectedEndpointJsonStringifySha256]] as const)
      objects.forEach((object, index) => { if (correctionSha256(JSON.stringify(object)) !== hashes[index]) throw new Error(`Jio expected-object hash drift: ${object.id}`); });
  }
}
validateJioHoldDefinitions();
export const JIO_HOLD_CORRECTIONS = freezeCorrection(rawEntries);
export const JIO_SOURCE_CITATIONS = freezeCorrection(rawCitations);
export interface CorrectionValidationOptions { requireAllTargets?: boolean }
export function jioHoldCorrection(id: string) { return JIO_HOLD_CORRECTIONS.find(entry => entry.targetIds.includes(id)) ?? null; }
export function validateJioHoldItem(item: { id: string }) {
  const entry = jioHoldCorrection(item.id);
  if (!entry) return;
  const expected = entry.expectedItems.find(row => row.id === item.id);
  if (canonical(item) !== canonical(expected)) throw new Error(`Jio hold object drift: ${item.id}`);
}
/** Partial previews/casebooks validate every present claim and its entire cited-source closure.
 * Complete original snapshots MUST request requireAllTargets. No missing-target success or cache. */
export function validateJioHoldRegistry(registry: Pick<InvestigationRegistry, 'entities' | 'relationships' | 'records' | 'sources'>, options: CorrectionValidationOptions = {}) {
  const rows = [...registry.entities, ...registry.relationships, ...registry.records];
  for (const entry of JIO_HOLD_CORRECTIONS) {
    const present = rows.filter(row => entry.targetIds.includes(row.id));
    if (options.requireAllTargets && entry.targetIds.some(id => !present.some(row => row.id === id))) throw new Error(`Jio hold missing target in complete registry: ${entry.id}`);
    if (!present.length) continue;
    if (new Set(present.map(row => row.id)).size !== present.length) throw new Error(`Jio hold duplicate target: ${entry.id}`);
    for (const item of present) validateJioHoldItem(item);
    for (const expected of entry.expectedSources) {
      const sources = registry.sources.filter(source => source.id === expected.id);
      if (sources.length !== 1 || canonical(sources[0]) !== canonical(expected)) throw new Error(`Jio hold source closure drift: ${expected.id}`);
    }
    for (const expected of entry.expectedEndpoints) {
      const endpoints = registry.entities.filter(entity => entity.id === expected.id);
      if ((!endpoints.length && options.requireAllTargets) || endpoints.length > 1 || endpoints.some(endpoint => canonical(endpoint) !== canonical(expected))) throw new Error(`Jio hold endpoint drift: ${expected.id}`);
    }
  }
}
