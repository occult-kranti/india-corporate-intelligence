import type { HistoricalAdditions, SourceProvenance } from './adapter';

export const READER_ADMISSION_STATUS = 'READER_ADMITTED' as const;
export const PINNED_READER_ADMISSION_SHA256 = '7588611618969a681ff5d23dbd009cb23a9ac5d6bb625585b80395919e5d1d53';

export interface HistoricalReaderAdmission {
  schemaVersion: 1;
  admissionId: 'historical-2025-reader-v1';
  surface: 'explicit-opt-in-historical-reader';
  readerStatus: typeof READER_ADMISSION_STATUS;
  snapshot: '2025-12-31';
  graphStatus: 'PUBLIC_GRAPH_BLOCKED';
  publicGraphEligible: false;
  publicPathEligible: false;
  payloadSha256: { base: string; additions: string; provenance: string };
  claims: { recordId: string; relationshipId: string; sourceIds: string[] }[];
  sources: { sourceId: string; retainedContentSha256: string }[];
}

/** A separate exact-byte decision, never a coercion of the retained source holds.
 * Missing, unknown, incomplete or edited decisions fail closed. An expansion
 * requires a separately reviewed manifest AND a new code-side hash pin.
 * The caller has already verified the actual payload bytes and baseline.
 */
export async function verifyHistoricalReaderAdmission(
  text: string,
  pins: HistoricalReaderAdmission['payloadSha256'],
  additions: HistoricalAdditions,
  provenance: SourceProvenance[],
  sha256: (value: string) => Promise<string>,
): Promise<HistoricalReaderAdmission> {
  const fail = (): never => { throw new Error('Historical reader admission is unavailable or incomplete. The base atlas remains unchanged.'); };
  if (typeof text !== 'string' || await sha256(text) !== PINNED_READER_ADMISSION_SHA256) return fail();
  const admission = JSON.parse(text) as HistoricalReaderAdmission;
  if (admission.schemaVersion !== 1 || admission.admissionId !== 'historical-2025-reader-v1' ||
    admission.surface !== 'explicit-opt-in-historical-reader' || admission.readerStatus !== READER_ADMISSION_STATUS ||
    admission.snapshot !== '2025-12-31' || admission.graphStatus !== 'PUBLIC_GRAPH_BLOCKED' ||
    admission.publicGraphEligible !== false || admission.publicPathEligible !== false ||
    Object.keys(pins).some(key => admission.payloadSha256[key as keyof typeof pins] !== pins[key as keyof typeof pins])) return fail();
  if (admission.claims.length !== 9 || admission.sources.length !== 3 ||
    new Set(admission.claims.map(row => row.recordId)).size !== 9 ||
    new Set(admission.claims.map(row => row.relationshipId)).size !== 9 ||
    new Set(admission.sources.map(row => row.sourceId)).size !== 3) return fail();
  const admittedRecords = new Set(admission.claims.map(row => row.recordId));
  const admittedEdges = new Set(admission.claims.map(row => row.relationshipId));
  if (additions.records.length !== 9 || additions.relationships.length !== 9 || additions.sources.length !== 3 || provenance.length !== 3 ||
    additions.records.some(row => !admittedRecords.has(row.id)) ||
    additions.relationships.some(row => !admittedEdges.has(row.id))) return fail();
  for (const claim of admission.claims) {
    const record = additions.records.find(row => row.id === claim.recordId);
    const edge = additions.relationships.find(row => row.id === claim.relationshipId);
    if (!record || !edge || edge.recordIds.length !== 1 || edge.recordIds[0] !== record.id ||
      record.relationshipIds.length !== 1 || record.relationshipIds[0] !== edge.id ||
      JSON.stringify(claim.sourceIds) !== JSON.stringify(edge.sourceIds) ||
      JSON.stringify(claim.sourceIds) !== JSON.stringify(record.sourceIds)) return fail();
  }
  for (const source of admission.sources) {
    if (!additions.sources.some(row => row.id === source.sourceId) ||
      provenance.find(row => row.sourceId === source.sourceId)?.sha256 !== source.retainedContentSha256) return fail();
  }
  return admission;
}
