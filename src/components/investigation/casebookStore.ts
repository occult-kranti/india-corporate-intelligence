import type { InvestigationRegistry } from '../../data/investigation';

export type CasebookKind = 'entity' | 'relationship' | 'record';
export interface CasebookSelection { kind: CasebookKind; id: string }
export interface CasebookPin extends CasebookSelection { addedAt: string; note: string }
export interface CasebookView { id: string; label: string; url: string; savedAt: string }
export interface CasebookData {
  version: 1; title: string; question: string; falsifier: string;
  pins: CasebookPin[]; views: CasebookView[];
}
export const CASEBOOK_KEY = 'icip.investigation.casebook.v1';
export const emptyCasebook = (): CasebookData => ({ version: 1, title: 'Untitled investigation', question: '', falsifier: '', pins: [], views: [] });
const kinds = new Set(['entity', 'relationship', 'record']);
const string = (value: unknown, length: number) => typeof value === 'string' ? value.slice(0, length) : '';
const date = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : '';
export const casebookPinKey = (pin: CasebookSelection) => `${pin.kind}\u0000${pin.id}`;

/** Saved views are portable in-app routes, never scripts or external navigation. */
export function portableCasebookUrl(value: string): string {
  const hash = value.startsWith('#/') ? value : (() => { try { return new URL(value).hash; } catch { return ''; } })();
  return hash.startsWith('#/') && !/[\r\n\u0000]/u.test(hash) && hash.length <= 8000 ? hash : '';
}

export function parseCasebook(value: unknown): CasebookData | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if (row.version !== 1 || !Array.isArray(row.pins) || !Array.isArray(row.views)) return null;
  if (row.pins.length > 250 || row.views.length > 40) return null;
  const seen = new Set<string>();
  const pins: CasebookPin[] = [];
  for (const raw of row.pins) {
    if (!raw || typeof raw !== 'object') continue;
    const pin = raw as Record<string, unknown>;
    const id = string(pin.id, 1000);
    if (!kinds.has(String(pin.kind)) || !id) continue;
    const item: CasebookPin = { kind: pin.kind as CasebookKind, id, addedAt: date(pin.addedAt), note: string(pin.note, 12000) };
    if (seen.has(casebookPinKey(item))) continue;
    seen.add(casebookPinKey(item)); pins.push(item);
    if (pins.length === 250) break;
  }
  const viewUrls = new Set<string>();
  const views: CasebookView[] = [];
  for (const raw of row.views) {
    if (!raw || typeof raw !== 'object') continue;
    const view = raw as Record<string, unknown>;
    const url = portableCasebookUrl(string(view.url, 8001));
    if (!url || viewUrls.has(url)) continue;
    viewUrls.add(url);
    views.push({ id: string(view.id, 200) || `view-${views.length}`, label: string(view.label, 180) || 'Saved view', url, savedAt: date(view.savedAt) });
    if (views.length === 40) break;
  }
  return { version: 1, title: string(row.title, 180) || 'Untitled investigation', question: string(row.question, 12000), falsifier: string(row.falsifier, 12000), pins, views };
}

/** Import is additive: it cannot erase the current notes, pins or question. */
export function mergeCasebooks(current: CasebookData, incoming: CasebookData): CasebookData {
  const existing = new Map(current.pins.map(pin => [casebookPinKey(pin), pin]));
  for (const pin of incoming.pins) {
    const found = existing.get(casebookPinKey(pin));
    if (!found) existing.set(casebookPinKey(pin), pin);
    else if (!found.note && pin.note) existing.set(casebookPinKey(pin), { ...found, note: pin.note });
  }
  const views = [...current.views, ...incoming.views].filter((view, index, rows) => rows.findIndex(other => other.url === view.url) === index);
  if (existing.size > 250 || views.length > 40) throw new Error(`Import would exceed the casebook limit (${existing.size} pins / 250; ${views.length} views / 40). Your casebook is unchanged. Export a backup and remove items before importing.`);
  return parseCasebook({ ...current,
    title: current.title === 'Untitled investigation' ? incoming.title : current.title,
    question: current.question || incoming.question, falsifier: current.falsifier || incoming.falsifier,
    pins: [...existing.values()], views,
  })!;
}

export function buildCasebookPacket(book: CasebookData, registry: InvestigationRegistry) {
  const entityIds = new Set(book.pins.filter(pin => pin.kind === 'entity').map(pin => pin.id));
  const relationshipIds = new Set(book.pins.filter(pin => pin.kind === 'relationship').map(pin => pin.id));
  const recordIds = new Set(book.pins.filter(pin => pin.kind === 'record').map(pin => pin.id));
  const recordsById = new Map(registry.records.map(record => [record.id, record]));
  const relationshipsById = new Map(registry.relationships.map(edge => [edge.id, edge]));
  // Retain explicitly linked records and counter-evidence, without inventing graph joins.
  let changed = true;
  while (changed) {
    const before = recordIds.size + relationshipIds.size;
    for (const id of recordIds) {
      const record = recordsById.get(id);
      for (const entity of record?.entityIds ?? []) entityIds.add(entity);
      for (const edge of record?.relationshipIds ?? []) relationshipIds.add(edge);
    }
    for (const id of relationshipIds) {
      const edge = relationshipsById.get(id);
      if (!edge) continue;
      entityIds.add(edge.from); entityIds.add(edge.to);
      for (const record of edge.recordIds) recordIds.add(record);
      for (const response of edge.responseIds) {
        if (relationshipsById.has(response)) relationshipIds.add(response);
        if (recordsById.has(response)) recordIds.add(response);
      }
    }
    changed = before !== recordIds.size + relationshipIds.size;
  }
  const entities = registry.entities.filter(row => entityIds.has(row.id));
  const relationships = registry.relationships.filter(row => relationshipIds.has(row.id));
  const records = registry.records.filter(row => recordIds.has(row.id));
  const sourceIds = new Set([...entities, ...relationships, ...records].flatMap(row => [...row.sourceIds, ...row.geography.flatMap(geo => geo.sourceIds)]));
  const sources = registry.sources.filter(row => sourceIds.has(row.id));
  const known = { entity: new Set(registry.entities.map(row => row.id)), relationship: new Set(registry.relationships.map(row => row.id)), record: new Set(registry.records.map(row => row.id)) };
  return {
    schema: 'icip.evidence-packet.v1', generatedAt: new Date().toISOString(), registryUpdatedAt: registry.updatedAt,
    casebook: book, entities, relationships, records, sources,
    unavailablePins: book.pins.filter(pin => !known[pin.kind].has(pin.id)),
    limitations: ['Analyst notes and the investigation question are user-entered, not source assertions.', 'Included relationships preserve their original tiers, dates, reporting scope and responses.', 'A graph path does not establish influence, causation or misconduct.', 'Coverage is a curated public-record corpus; missing records remain unknown.'],
  };
}

const markdownText = (value: string) => value.replace(/[\\`*_\[\]]/gu, '\\$&').replace(/</gu, '&lt;').replace(/>/gu, '&gt;');
export function casebookMarkdown(packet: ReturnType<typeof buildCasebookPacket>): string {
  const { casebook: book } = packet;
  const lines = [`# ${markdownText(book.title)}`, '', `Evidence snapshot: ${packet.registryUpdatedAt}. Exported: ${packet.generatedAt}.`, '', '## Analyst question', '', markdownText(book.question || 'No question recorded.'), '', '## Evidence that would close the question', '', markdownText(book.falsifier || 'No falsifier recorded.'), '', '## Pinned items', ''];
  type PacketItem = (typeof packet.entities)[number] | (typeof packet.relationships)[number] | (typeof packet.records)[number];
  function describe(item: PacketItem, kind: CasebookKind) {
    lines.push(`### ${markdownText('title' in item ? item.title : item.label)}`, '', `Kind: ${kind}. ID: ${markdownText(item.id)}.`, '', markdownText(item.summary), '');
    if ('tier' in item) {
      lines.push(`Evidence tier: ${item.tier}. Status: ${markdownText(item.status)}. Status as of: ${item.statusAsOf ?? 'unknown'}.`, '', `Date range: ${item.fromDate ?? 'unknown'} to ${item.toDate ?? 'unknown'}. Basis: ${markdownText(item.dateBasis)}.`, '');
      if ('from' in item) lines.push(`Relationship: ${markdownText(item.from)} → ${markdownText(item.to)}. Type: ${markdownText(item.kind)}.`, '', `Linked responses: ${item.responseIds.map(markdownText).join('; ') || 'None recorded.'}`, '');
      if ('response' in item) lines.push('Recorded response or procedural context:', '', markdownText(item.response || 'No response recorded in this entry.'), '');
      if (item.amounts.length) lines.push('Amounts (distinct stages; do not add without a shared accounting basis):', '', ...item.amounts.map(amount => `- ${amount.currency} ${amount.value} ${markdownText(amount.unit)} · ${markdownText(amount.stage)} · ${markdownText(amount.period)}`), '');
      if (item.alternativeExplanations.length) lines.push('Other explanations to consider:', '', ...item.alternativeExplanations.map(text => `- ${markdownText(text)}`), '');
      if (item.falsifier) lines.push('Evidence that would close this question:', '', markdownText(item.falsifier), '');
    }
    lines.push('Geography and attribution:', '', ...item.geography.map(geo => `- ${geo.scope} · ${geo.basis} · ${geo.stateCodes.join(', ') || 'no state attribution'}: ${markdownText(geo.note)}${geo.sourceIds.length ? ` (sources: ${geo.sourceIds.map(markdownText).join('; ')})` : ''}`), '', `Sources: ${item.sourceIds.map(markdownText).join('; ') || 'No direct source recorded.'}`, '');
    if (item.limitations.length) lines.push('Evidence limits:', '', ...item.limitations.map(text => `- ${markdownText(text)}`), '');
  }
  for (const pin of book.pins) {
    const item = pin.kind === 'entity' ? packet.entities.find(row => row.id === pin.id) : pin.kind === 'relationship' ? packet.relationships.find(row => row.id === pin.id) : packet.records.find(row => row.id === pin.id);
    if (item) describe(item, pin.kind);
    else lines.push(`### ${markdownText(pin.id)}`, '', `Kind: ${pin.kind}. This pinned identifier is unavailable in the current registry.`, '');
    if (pin.note) lines.push('Analyst note (user-entered):', '', ...pin.note.split('\n').map(text => `> ${markdownText(text)}`), '');
  }
  const pinned = new Set(book.pins.map(casebookPinKey));
  lines.push('## Linked context and counter-evidence', '', 'These items are included through explicit record, relationship or response links. Inclusion does not mean endorsement or establish misconduct.', '');
  for (const [kind, items] of [['record', packet.records], ['relationship', packet.relationships], ['entity', packet.entities]] as const) {
    for (const item of items) if (!pinned.has(casebookPinKey({ kind, id: item.id }))) describe(item, kind);
  }
  lines.push('## Source ledger', '');
  for (const source of packet.sources) lines.push(`### ${markdownText(source.title)}`, '', `ID: ${markdownText(source.id)}. Publisher: ${markdownText(source.publisher)}.`, '', source.url, '', `Published: ${source.publishedAt ?? 'unknown'}. Retrieved: ${source.retrievedAt ?? 'unknown'}. Tier: ${source.tier}.`, '', `Locator: ${markdownText(source.locator)}`, '', ...source.limitations.map(text => `- ${markdownText(text)}`), '');
  lines.push('## Saved views', '', ...book.views.map(view => `- ${markdownText(view.label)}: ${view.url}`), '', '## Interpretation limits', '', ...packet.limitations.map(text => `- ${text}`), '', 'The JSON export also retains structured metadata for reproducible analysis.');
  return `${lines.join('\n')}\n`;
}
