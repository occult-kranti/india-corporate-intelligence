import { safeSourceUrl } from '../navigation';
import { SECTOR_GRAPH_STATUS, SECTOR_HELD_STATUS, SECTOR_READER_STATUS } from './types';
import type { SectorProjection, SectorReaderAdmission } from './types';

export function sectorFailure(detail: string): never {
  throw new Error(`Sector reader is unavailable: ${detail}. The base atlas remains unchanged.`);
}
const hasOwn = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);
const object = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const string = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const hash = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
function keys(v: Record<string, unknown>, required: string[], optional: string[] = []) {
  if (required.some(k => !hasOwn(v, k)) || Object.keys(v).some(k => ![...required, ...optional].includes(k))) sectorFailure('unknown or missing fields');
}
function strings(v: unknown, minimum = 0): asserts v is string[] {
  if (!Array.isArray(v) || v.length < minimum || !v.every(string) || new Set(v).size !== v.length) sectorFailure('invalid or duplicate text/reference list');
}
function rows(v: unknown, count?: number): asserts v is Record<string, unknown>[] {
  if (!Array.isArray(v) || (count !== undefined && v.length !== count) || !v.every(object)) sectorFailure('invalid collection');
}
function uniqueIds(v: Record<string, unknown>[]) {
  if (!v.every(r => string(r.id)) || new Set(v.map(r => r.id)).size !== v.length) sectorFailure('missing or duplicate ID');
}
function hold(v: Record<string, unknown>, aggregation = false) {
  if (v.publicationStatus !== SECTOR_HELD_STATUS || v.graphEligible !== false || v.pathEligible !== false ||
    (aggregation && v.aggregationPermitted !== false)) sectorFailure('unknown status or graph/path/aggregation hold changed');
}
const entryDateKeys = ['snapshot', 'statement', 'publication', 'publicationVerification', 'event', 'eventType', 'latestReportBound',
  'signatureDateKnown', 'firstDrawAnnouncement', 'exactFundsReceiptDate', 'reportPeriod', 'eventOrMeasurement', 'unresolvedEventAlternatives', 'planting'];
const sourceDateKeys = ['report_period_end', 'statement_date', 'publication_date', 'retrieved_at', 'acquiredAt', 'publication', 'retrievedAt', 'reportPeriod'];
function dates(v: unknown, allowed: string[]) {
  if (!object(v) || !Object.keys(v).length) sectorFailure('date fields unavailable');
  for (const [key, value] of Object.entries(v)) {
    if (!allowed.includes(key)) sectorFailure('unknown date field');
    if (key === 'signatureDateKnown') { if (typeof value !== 'boolean') sectorFailure('signature date flag must be boolean'); }
    else if (key === 'unresolvedEventAlternatives') strings(value, 2);
    else if (value !== null && !string(value)) sectorFailure('invalid date value');
  }
}
const packetIds = ['europe-china-ownership', 'welfare-food-finance', 'energy-mineral-finance', 'rss-report-review'];
const moneyStages = ['grant_commitment', 'contract_award', 'official_reported_disbursement', 'issuer_reported_cash_advance',
  'Local sales amount', 'Local financial-support amount', 'Local price', 'Local prizes and distribution price'];
const pairStatuses = ['Published evaluation observation, not corruption finding', 'Published evaluation observation',
  'Evaluation limitation; weakens causal welfare claims', 'Analytical scrutiny question, not allegation of violation',
  'Regulatory/judicial responses answer different questions, not transaction corroboration', 'Unresolved legal-document scope; no fresh legal opinion'];

/** Structural checks supplement exact-byte pins. This function never alters input or admits a reader. */
export function validateSectorProjection(value: unknown): asserts value is SectorProjection {
  if (!object(value)) sectorFailure('projection is not an object');
  keys(value, ['schemaVersion', 'mode', 'publicationStatus', 'graphEligible', 'pathEligible', 'aggregationPermitted',
    'packets', 'sources', 'entries', 'criticismResponses', 'financialContext']);
  if (value.schemaVersion !== 1 || value.mode !== 'local-reader-stage') sectorFailure('unknown projection format');
  hold(value, true);
  rows(value.packets, 4); rows(value.sources, 18); rows(value.entries, 20); rows(value.criticismResponses, 6); rows(value.financialContext, 7);
  uniqueIds(value.packets); uniqueIds(value.sources); uniqueIds(value.entries); uniqueIds(value.criticismResponses);
  for (const row of value.packets) {
    keys(row, ['id', 'reviewDate', 'reviewStatus', 'correctionReceiptPresent', 'graphEligible', 'pathEligible', 'publicationStatus']);
    hold(row);
    if (!packetIds.includes(row.id as string) || row.reviewDate !== '2026-10-16' ||
      row.reviewStatus !== 'documentary support with qualifications; public hold preserved' || typeof row.correctionReceiptPresent !== 'boolean') sectorFailure('unknown packet review status');
  }
  const sources = new Set(value.sources.map(row => row.id));
  const entryIds = ['EC-E01', 'EC-E02', 'EC-E03', 'wff-01', 'wff-02', 'wff-03', 'EMF-001', 'EMF-002', 'EMF-003',
    ...Array.from({ length: 11 }, (_, i) => `RSS-2026-${String(i + 1).padStart(3, '0')}`)];
  if (value.entries.some(row => !entryIds.includes(row.id as string))) sectorFailure('unreviewed entry ID');
  function reference(v: unknown, packet: string) {
    if (!object(v)) sectorFailure('invalid source reference');
    keys(v, ['sourceId', 'locator']);
    if (!string(v.sourceId) || !v.sourceId.startsWith(`${packet}:`) || !sources.has(v.sourceId) || !string(v.locator)) sectorFailure('source closure or locator failure');
  }
  function contextualReferences(v: Record<string, unknown>) {
    const packet = v.packet;
    if (!string(packet) || !packetIds.includes(packet)) sectorFailure('unknown packet');
    reference({ sourceId: v.sourceId, locator: v.locator }, packet);
    if (v.additionalSources !== undefined) {
      rows(v.additionalSources);
      v.additionalSources.forEach(row => reference(row, packet));
      const ids = [v.sourceId, ...v.additionalSources.map(row => row.sourceId)];
      if (new Set(ids).size !== ids.length) sectorFailure('duplicate contextual source');
    }
  }
  for (const source of value.sources) {
    keys(source, ['id', 'url', 'sha256', 'bytes', 'sourceFamily', 'dates', 'independence']);
    if (!string(source.id) || !packetIds.some(id => (source.id as string).startsWith(`${id}:`)) || !string(source.url) ||
      !safeSourceUrl(source.url) || new URL(source.url).username || new URL(source.url).password || !hash(source.sha256) ||
      !Number.isSafeInteger(source.bytes) || (source.bytes as number) <= 0 || !string(source.sourceFamily) || !string(source.independence)) sectorFailure('source metadata or HTTP(S) destination invalid');
    dates(source.dates, sourceDateKeys);
    if (!object(source.dates) || (!hasOwn(source.dates, 'publication') && !hasOwn(source.dates, 'publication_date'))) sectorFailure('publication field missing; unknown must remain null');
  }
  for (const pair of value.criticismResponses) {
    keys(pair, ['id', 'packet', 'criticism', 'response', 'locator', 'sourceId', 'status'], ['additionalSources']);
    if (!string(pair.criticism) || !string(pair.response) || !pairStatuses.includes(pair.status as string)) sectorFailure('criticism/response pair or status invalid');
    contextualReferences(pair);
  }
  for (const context of value.financialContext) {
    keys(context, ['packet', 'sourceId', 'locator', 'text'], ['additionalSources']);
    if (!string(context.text)) sectorFailure('financial context missing');
    contextualReferences(context);
  }
  const pairs = new Map(value.criticismResponses.map(pair => [pair.id, pair]));
  for (const entry of value.entries) {
    keys(entry, ['id', 'packet', 'claimText', 'claimTextType', 'sources', 'dates', 'qualifications', 'unresolved', 'moneyStages',
      'aggregationPermitted', 'graphEligible', 'pathEligible', 'publicationStatus', 'criticismResponseIds', 'sourceRecordPointer'],
      ['directLegalParentAtSnapshot', 'notEstablished', 'payerAttribution']);
    hold(entry, true);
    if (!string(entry.packet) || !packetIds.includes(entry.packet) || !string(entry.claimText) ||
      entry.claimTextType !== 'qualified_reader_paraphrase_not_verbatim_source_quote') sectorFailure('unknown entry type');
    const expectedPacket = (entry.id as string).startsWith('EC-') ? packetIds[0] : (entry.id as string).startsWith('wff-') ? packetIds[1] : (entry.id as string).startsWith('EMF-') ? packetIds[2] : packetIds[3];
    if (entry.packet !== expectedPacket) sectorFailure('claim moved to another packet');
    strings(entry.qualifications, 1); strings(entry.unresolved, 1); strings(entry.criticismResponseIds);
    rows(entry.sources); if (!entry.sources.length) sectorFailure('claim needs a source');
    entry.sources.forEach(row => reference(row, entry.packet as string));
    if (new Set(entry.sources.map(row => row.sourceId)).size !== entry.sources.length) sectorFailure('duplicate claim source');
    for (const id of entry.criticismResponseIds) if (pairs.get(id)?.packet !== entry.packet) sectorFailure('paired response closure failure');
    const requiredPairs = value.criticismResponses.filter(pair => pair.packet === entry.packet).map(pair => pair.id);
    if (JSON.stringify(entry.criticismResponseIds) !== JSON.stringify(requiredPairs)) sectorFailure('a packet criticism/response was omitted');
    dates(entry.dates, entryDateKeys);
    if (!object(entry.sourceRecordPointer) || entry.sourceRecordPointer.id !== entry.id ||
      !['candidate-edges.json', 'relationships-held.json', 'candidate-claims.json'].includes(entry.sourceRecordPointer.file as string)) sectorFailure('record provenance invalid');
    keys(entry.sourceRecordPointer, ['file', 'id']);
    if (hasOwn(entry, 'directLegalParentAtSnapshot') && entry.directLegalParentAtSnapshot !== null) sectorFailure('direct parenthood must remain unestablished');
    if (entry.packet === 'welfare-food-finance') {
      if (!string(entry.notEstablished) || !entry.qualifications.includes(`This does not establish: ${entry.notEstablished}`)) sectorFailure('negative predicate lost');
    } else if (entry.notEstablished !== undefined) sectorFailure('unreviewed negative predicate');
    if (entry.id === 'wff-03') {
      const payer = entry.payerAttribution;
      if (!object(payer)) sectorFailure('payer inference missing');
      keys(payer, ['financier', 'reportedRoute', 'financierToPayerInferred', 'originatingAccountIdentified']);
      if (payer.financier !== 'IDA' || payer.reportedRoute !== 'World Bank to designated agency account' ||
        payer.financierToPayerInferred !== true || payer.originatingAccountIdentified !== false) sectorFailure('payer inference altered');
    } else if (entry.payerAttribution !== undefined) sectorFailure('unreviewed payer attribution');
    rows(entry.moneyStages);
    for (const money of entry.moneyStages) {
      keys(money, ['stage', 'amount', 'currency', 'overlapGroup', 'notAuditedCashProof'],
        ['valueAsReported', 'exactTransferDate', 'dateBasis', 'announcementDate']);
      if (!moneyStages.includes(money.stage as string) || !string(money.overlapGroup) || money.notAuditedCashProof !== true ||
        !(money.amount === null || (typeof money.amount === 'number' && Number.isFinite(money.amount) && money.amount >= 0)) ||
        ![null, 'USD'].includes(money.currency as null | string) ||
        (hasOwn(money, 'exactTransferDate') && money.exactTransferDate !== null) ||
        ['valueAsReported', 'dateBasis', 'announcementDate'].some(k => hasOwn(money, k) && !string(money[k]))) sectorFailure('unknown money stage or unsupported transfer assertion');
      if (entry.packet === 'rss-report-review' && (money.amount !== null || money.currency !== null || !string(money.valueAsReported))) sectorFailure('local monetary mention must not become normalized receipts');
    }
  }
}

/** Exact-ID public reader decision, separate from and unable to clear retained holds. */
export function validateSectorReaderAdmission(value: unknown, projection: SectorProjection, pins: { base: string; projection: string }): asserts value is SectorReaderAdmission {
  if (!object(value)) sectorFailure('reader admission missing');
  keys(value, ['schemaVersion', 'admissionId', 'surface', 'readerStatus', 'graphStatus', 'publicGraphEligible', 'publicPathEligible',
    'aggregationPermitted', 'payloadSha256', 'packetIds', 'claims', 'sources', 'criticismResponses', 'financialContext']);
  if (value.schemaVersion !== 1 || value.admissionId !== 'sector-2026-10-reader-v1' || value.surface !== 'explicit-opt-in-sector-reader' ||
    value.readerStatus !== SECTOR_READER_STATUS || value.graphStatus !== SECTOR_GRAPH_STATUS || value.publicGraphEligible !== false ||
    value.publicPathEligible !== false || value.aggregationPermitted !== false) sectorFailure('unknown reader admission status');
  const refs = (row: { sourceId: string; additionalSources?: { sourceId: string }[] }) => [row.sourceId, ...(row.additionalSources ?? []).map(source => source.sourceId)];
  const expected = {
    payloadSha256: pins, packetIds: projection.packets.map(row => row.id),
    claims: projection.entries.map(row => ({ id: row.id, packet: row.packet, sourceIds: row.sources.map(source => source.sourceId), criticismResponseIds: row.criticismResponseIds })),
    sources: projection.sources.map(row => ({ sourceId: row.id, retainedContentSha256: row.sha256 })),
    criticismResponses: projection.criticismResponses.map(row => ({ id: row.id, packet: row.packet, sourceIds: refs(row) })),
    financialContext: projection.financialContext.map(row => ({ packet: row.packet, sourceIds: refs(row) })),
  };
  for (const [key, expectedValue] of Object.entries(expected)) {
    if (JSON.stringify(value[key]) !== JSON.stringify(expectedValue)) sectorFailure(`reader admission ${key} differs from exact reviewed scope`);
  }
}
