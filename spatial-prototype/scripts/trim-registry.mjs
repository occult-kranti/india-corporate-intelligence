/** Reproduce the source-preserving preview from the retained original registry bundle.
 * This selects reviewed objects by exact ID; it does not rewrite evidence fields.
 * The full original application remains read-only outside this isolated prototype.
 */
import { writeFileSync } from 'node:fs';
import { loadOriginalRegistry } from './original-registry.mjs';
const original = await loadOriginalRegistry();

const recordIds = new Set(original.records.filter(row => row.namespace === 'atlas-international-finance').map(row => row.id));
recordIds.add('atlas-defence-trade:record:c295-spain-india');
recordIds.add('atlas-defence-trade:record:c295-delivery-boundary');
const entityIds = new Set(original.entities.filter(row => row.namespace === 'atlas-international-finance').map(row => row.id));
const relationshipIds = new Set();
const byRecord = new Map(original.records.map(row => [row.id, row]));
const byRelationship = new Map(original.relationships.map(row => [row.id, row]));
let changed = true;
while (changed) {
  const before = recordIds.size + relationshipIds.size + entityIds.size;
  for (const id of recordIds) {
    const row = byRecord.get(id);
    if (!row) throw new Error(`Missing original record ${id}`);
    row.entityIds.forEach(id => entityIds.add(id));
    row.relationshipIds.forEach(id => relationshipIds.add(id));
  }
  for (const id of relationshipIds) {
    const row = byRelationship.get(id);
    if (!row) throw new Error(`Missing original relationship ${id}`);
    entityIds.add(row.from); entityIds.add(row.to);
    row.recordIds.forEach(id => recordIds.add(id));
    for (const id of row.responseIds) {
      if (byRecord.has(id)) recordIds.add(id);
      else if (byRelationship.has(id)) relationshipIds.add(id);
      else throw new Error(`Missing original response ${id}`);
    }
  }
  changed = before !== recordIds.size + relationshipIds.size + entityIds.size;
}
const entities = original.entities.filter(row => entityIds.has(row.id));
const relationships = original.relationships.filter(row => relationshipIds.has(row.id));
const records = original.records.filter(row => recordIds.has(row.id));
const dimensions = [...entities, ...relationships, ...records];
const sourceIds = new Set(dimensions.flatMap(row => [...row.sourceIds, ...row.geography.flatMap(geo => geo.sourceIds)]));
const localityIds = new Set(dimensions.flatMap(row => row.geography.flatMap(geo => geo.localityIds)));
const sources = original.sources.filter(row => sourceIds.has(row.id));
const namespaces = new Set(dimensions.map(row => row.namespace));
const preview = {
  updatedAt: original.updatedAt, entities, relationships, records, sources,
  states: original.states,
  localities: original.localities.filter(row => localityIds.has(row.id)),
  coverage: original.coverage.filter(row => namespaces.has(row.namespace)).map(row => ({
    ...row,
    entities: entities.filter(item => item.namespace === row.namespace).length,
    relationships: relationships.filter(item => item.namespace === row.namespace).length,
    records: records.filter(item => item.namespace === row.namespace).length,
    sources: sources.filter(item => item.namespace === row.namespace).length,
    held: 0,
    limitations: [...row.limitations, 'Source-preserving preview only. Counts describe this selected subset, not the full source registry.'],
  })),
  held: [],
  methodology: [...original.methodology,
    'Source-preserving preview: all atlas-international-finance records plus the C295 India–Spain case and its response. Exact entities, relationships, records, sources, date qualifiers and counter-evidence are retained unchanged. This is not a complete research corpus.',
    'Spatial board positions are deterministic layout zones, not surveyed coordinates, borders, headquarters or destinations of money. Spatial proximity is never converted into a relationship.',
  ],
};
writeFileSync(new URL('../src/registry.json', import.meta.url), `${JSON.stringify(preview, null, 2)}\n`);
writeFileSync(new URL('../docs/preview-manifest.json', import.meta.url), `${JSON.stringify({
  kind: 'source-preserving-spatial-preview', sourceUpdatedAt: original.updatedAt,
  selection: ['atlas-international-finance: all retained records', 'atlas-defence-trade: C295 case and delivery boundary'],
  fullRegistryCounts: Object.fromEntries(['entities','relationships','records','sources'].map(key => [key, original[key].length])),
  previewCounts: Object.fromEntries(['entities','relationships','records','sources'].map(key => [key, preview[key].length])),
  sourceRule: 'Every retained evidence object is byte-value equivalent to its exact-ID original; all referenced sources, endpoints, records and responses are retained.',
  excludedScope: 'Other original cases are omitted from this preview, not disproven or discarded from the preserved original application.',
}, null, 2)}\n`);
console.log(JSON.stringify({ entities: entities.length, relationships: relationships.length, records: records.length, sources: sources.length }));
