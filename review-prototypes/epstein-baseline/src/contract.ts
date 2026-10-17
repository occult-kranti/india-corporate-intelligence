export const PAYLOAD_SHA256 = '3c1998d85054daac0033cca1803ad7bfaf8f6692db02f14c11851327b117f498';
export interface Citation { readonly title: string; readonly url: string; readonly locator: string }
export type RetainedDocumentDate = { readonly state: 'unknown' } | { readonly value: string; readonly role: string };
export interface Milestone { readonly milestone: number; readonly date: string; readonly date_role: string; readonly title: string; readonly source_qualified_statement: string; readonly qualification: string; readonly source: Citation; readonly first_disclosure?: { readonly state: 'unknown' }; readonly document_date?: RetainedDocumentDate }
export interface ProceduralRelation { readonly relation: number; readonly source_endpoint: string; readonly procedural_relation: string; readonly target_endpoint: string; readonly attribution_and_limit: string; readonly linked_milestone: number; readonly date: string; readonly date_role: string; readonly duration_or_end: string; readonly source: Citation }
export interface Timeline { readonly title: string; readonly subtitle: string; readonly status: string; readonly as_of: string; readonly coverage: Readonly<Record<string, unknown>>; readonly milestones: readonly Milestone[]; readonly procedural_relations: readonly ProceduralRelation[]; readonly boundaries: readonly string[] }

function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function exactKeys(value: Record<string, unknown>, keys: string[]) { if (Object.keys(value).length !== keys.length || keys.some(key => !Object.prototype.hasOwnProperty.call(value,key))) throw new Error('Unexpected or missing source-packet field.'); }
function text(value: unknown): value is string { return typeof value === 'string' && !!value.trim(); }
export function safeSourceUrl(value: string): string | null {
  if (!/^https:\/\/[^/?#]/u.test(value) || /[\u0000-\u0020\u007f-\u009f\\]/u.test(value) || /%(?![\da-f]{2})/iu.test(value)) return null;
  try { const url = new URL(value); return url.protocol === 'https:' && url.hostname && !url.username && !url.password ? value : null; } catch { return null; }
}
function citation(value: unknown) {
  if (!record(value)) throw new Error('Missing source citation.');
  exactKeys(value,['title','url','locator']);
  if (!text(value.title) || !text(value.locator) || !text(value.url) || !safeSourceUrl(value.url)) throw new Error('Invalid source citation.');
}
/** Shape checks cannot admit new facts: decodeTimeline also requires the exact reviewed byte hash. */
export function validateShape(value: unknown): asserts value is Timeline {
  if (!record(value)) throw new Error('Invalid source packet.');
  exactKeys(value,['title','subtitle','status','as_of','coverage','milestones','procedural_relations','boundaries']);
  for (const key of ['title','subtitle','status','as_of']) if (!text(value[key])) throw new Error('Missing packet context.');
  if (!record(value.coverage) || !Array.isArray(value.milestones) || value.milestones.length !== 21 || !Array.isArray(value.procedural_relations) || value.procedural_relations.length !== 12 || !Array.isArray(value.boundaries) || value.boundaries.length !== 5 || !value.boundaries.every(text)) throw new Error('Incomplete source-packet coverage.');
  const events = new Map<number,Record<string,unknown>>();
  for (const row of value.milestones) {
    if (!record(row)) throw new Error('Invalid milestone.');
    const extras = [14,15,19,20].includes(Number(row.milestone)) ? ['first_disclosure','document_date'] : row.milestone === 17 ? ['document_date'] : [];
    exactKeys(row,['milestone','date','date_role','title','source_qualified_statement','qualification','source',...extras]);
    if (extras.includes('first_disclosure')) { if (!record(row.first_disclosure)) throw new Error('Missing disclosure qualification.'); exactKeys(row.first_disclosure,['state']); if (row.first_disclosure.state !== 'unknown') throw new Error('First disclosure cannot be inferred.'); }
    if (extras.includes('document_date')) { if (!record(row.document_date)) throw new Error('Missing document date.'); if (row.milestone === 20) { exactKeys(row.document_date,['state']); if (row.document_date.state !== 'unknown') throw new Error('Document date cannot be inferred.'); } else { exactKeys(row.document_date,['value','role']); if (!text(row.document_date.value) || !text(row.document_date.role)) throw new Error('Incomplete document date.'); } }
    if (!Number.isInteger(row.milestone) || Number(row.milestone) < 1 || Number(row.milestone) > 21 || events.has(Number(row.milestone))) throw new Error('Invalid milestone identity.');
    for (const key of ['date','date_role','title','source_qualified_statement','qualification']) if (!text(row[key])) throw new Error('Incomplete milestone.');
    citation(row.source); events.set(Number(row.milestone),row);
  }
  const relations = new Set<number>();
  for (const row of value.procedural_relations) {
    if (!record(row)) throw new Error('Invalid procedural relation.');
    exactKeys(row,['relation','source_endpoint','procedural_relation','target_endpoint','attribution_and_limit','linked_milestone','date','date_role','duration_or_end','source']);
    if (!Number.isInteger(row.relation) || Number(row.relation) < 1 || Number(row.relation) > 12 || relations.has(Number(row.relation)) || !Number.isInteger(row.linked_milestone) || !events.has(Number(row.linked_milestone))) throw new Error('Invalid procedural identity or milestone binding.');
    for (const key of ['source_endpoint','procedural_relation','target_endpoint','attribution_and_limit','date','date_role','duration_or_end']) if (!text(row[key])) throw new Error('Incomplete procedural relation.');
    citation(row.source);
    const event = events.get(Number(row.linked_milestone))!;
    if (row.date !== event.date || row.date_role !== event.date_role || JSON.stringify(row.source) !== JSON.stringify(event.source)) throw new Error('Changed relation-to-milestone source binding.');
    relations.add(Number(row.relation));
  }
}
function freeze<T>(value: T): T { if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
export async function decodeTimeline(bytes: Uint8Array): Promise<Timeline> {
  if (bytes.byteLength !== 27585) throw new Error('The source packet does not match the reviewed baseline. No partial facts were opened.');
  const snapshot = new Uint8Array(bytes);
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',snapshot))).map(n=>n.toString(16).padStart(2,'0')).join('');
  if (digest !== PAYLOAD_SHA256) throw new Error('The source packet does not match the reviewed baseline. No partial facts were opened.');
  const value: unknown = JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(snapshot));
  validateShape(value); return freeze(value);
}
export async function loadTimeline(signal: AbortSignal): Promise<Timeline> {
  const response = await fetch(new URL('./timeline.json',document.baseURI),{signal});
  if (!response.ok) throw new Error('The reviewed baseline could not be loaded. Please retry.');
  return decodeTimeline(new Uint8Array(await response.arrayBuffer()));
}
/** Selection never parses raw labels, creates event dates, joins endpoints or changes the packet. */
export function selectedMilestone(timeline: Timeline,id: number): Milestone { const row = timeline.milestones.find(value=>value.milestone===id); if (!row) throw new Error('Unknown milestone.'); return row; }
export function selectedRelations(timeline: Timeline,id: number): readonly ProceduralRelation[] { selectedMilestone(timeline,id); return timeline.procedural_relations.filter(value=>value.linked_milestone===id); }
