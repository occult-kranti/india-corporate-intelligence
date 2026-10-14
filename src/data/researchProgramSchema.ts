/** Research records keep identity, relation, attribution and source dependence explicit. */
export type ConnectionStatus = 'documented' | 'alleged' | 'hypothesis';
export interface ProgramSource { id: string; title: string; url: string; publisher: string; publishedAt?: string; accessedAt: string; sourceType: string; accessDepth: 'full-text' | 'pdf-visual' | 'search-excerpt' | 'index-only'; accessNotes?: string; locator?: string; sha256?: string; bytes?: number; supports: string; limitations: string; sourceFamily: string }
export interface ProgramEntity { id: string; name: string; type: string; identifiers: string[]; existingEntityId?: string; sourceIds: string[]; sectorIds?: string[] }
export interface ProgramAmount { value: number; currency: string; unit: string; stage: string; basis: string; exactValue?: string; rawText?: string }
export interface ProgramConnection { id: string; from: string; to: string; relation: string; label: string; status: ConnectionStatus; sourceIds: string[]; summary: string; sectorIds?: string[]; dateFrom?: string; dateTo?: string; amount?: ProgramAmount; limits: string[]; alternativeExplanations: string[]; falsifier: string; response?: string }
export interface ProgramLead { id: string; title: string; question: string; sectorIds: string[]; sourceIds: string[]; neededEvidence: string[]; disconfirmingEvidence: string[]; feasibility: string; priority?: 'high' | 'medium' | 'low'; existingCaseId?: string; hypothesisIndex?: number }
export interface ProgramCoverage { sector: string; status: string; inspectedSources: number; remainingGaps: string[] }
export interface ProgramEvidenceStep { stage: string; evidence: string; inferenceAllowed: string; inferenceNotAllowed: string; sourceIds: string[]; locator: string }
export interface ProgramTransferableTest { id: string; status: string; question: string; requiredRecords: string[]; comparator: string; rivalExplanation: string; falsifier: string; stopRule: string }
export interface ProgramCase { id: string; title: string; sectors: string[]; mechanism: string; evidentiaryChain: (string | ProgramEvidenceStep)[]; legalOutcome: { stage: string; date: string; subject: string; finding: string; limits: string }; sourceIds: string[]; transferableTests: (string | ProgramTransferableTest)[]; nonTransferableInferences: string[] }
export interface ProgramMethod { id: string; title: string; category: string; purpose: string; steps: string[]; failureModes: string[]; requiredOutputs: string[]; sourceIds: string[]; status: 'established' | 'emerging' | 'experimental'; benchmarkLimits: string }
export interface ResearchProgram { sources: ProgramSource[]; entities: ProgramEntity[]; connections: ProgramConnection[]; leads: ProgramLead[]; coverage: ProgramCoverage[]; cases: ProgramCase[]; methods: ProgramMethod[]; files: string[]; errors: string[] }
export interface ProgramContext { resolvedEntityIds?: readonly string[]; existingCases?: readonly { id: string; hypotheses: readonly unknown[] }[] }
type JsonRecord = Record<string, unknown>;
const isRecord = (value: unknown): value is JsonRecord => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const cleanText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
export const validProgramUrl = (value: string) => { try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password; } catch { return false; } };
export function validProgramDate(value: string): boolean {
  if (/^\d{4}$/.test(value)) return true;
  if (/^\d{4}-\d{2}$/.test(value)) return Number(value.slice(5)) >= 1 && Number(value.slice(5)) <= 12;
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value) || !Number.isFinite(Date.parse(value))) return false;
  const day = value.slice(0, 10); return new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) === day;
}
function dateBound(value: string, last: boolean): number {
  if (/^\d{4}$/.test(value)) return Date.parse(`${value}-${last ? '12-31T23:59:59Z' : '01-01T00:00:00Z'}`);
  if (/^\d{4}-\d{2}$/.test(value)) { const first = Date.parse(`${value}-01T00:00:00Z`); if (!last) return first; const next = new Date(first); next.setUTCMonth(next.getUTCMonth() + 1); return next.getTime() - 1; }
  return Date.parse(value);
}
const emptyProgram = (): ResearchProgram => ({ sources: [], entities: [], connections: [], leads: [], coverage: [], cases: [], methods: [], files: [], errors: [] });

/** Rejects the corpus as a unit on schema/reference errors; no plausible-looking partial graph. */
export function assembleResearchProgram(inputs: Record<string, unknown>, context: ProgramContext = {}): ResearchProgram {
  const output = emptyProgram(), errors: string[] = [];
  const seen = new Map<string, Set<string>>();
  const fail = (path: string, message: string) => errors.push(`${path}: ${message}`);
  const text = (row: JsonRecord, key: string, path: string, optional = false): string => {
    if (optional && row[key] === undefined) return '';
    if (!cleanText(row[key])) { fail(`${path}.${key}`, 'must be a nonempty string'); return ''; }
    return row[key] as string;
  };
  const texts = (row: JsonRecord, key: string, path: string, allowEmpty = false): string[] => {
    const raw = typeof row[key] === 'string' ? [row[key]] : row[key];
    if (!Array.isArray(raw) || (!allowEmpty && raw.length === 0) || raw.some(item => !cleanText(item))) { fail(`${path}.${key}`, `must be ${allowEmpty ? 'an' : 'a nonempty'} array of nonempty strings`); return []; }
    return [...raw] as string[];
  };
  const ids = (row: JsonRecord, path: string, kind: string) => {
    const id = text(row, 'id', path); const registry = seen.get(kind) ?? new Set<string>();
    if (registry.has(id)) fail(path, `duplicate ${kind} id ${id}`);
    registry.add(id); seen.set(kind, registry); return id;
  };
  const date = (row: JsonRecord, key: string, path: string, optional = false): string | undefined => {
    if (optional && row[key] === undefined) return undefined;
    const value = text(row, key, path); if (value && !validProgramDate(value)) fail(`${path}.${key}`, 'must be a valid ISO date or timestamp'); return value;
  };
  const enumValue = <T extends string>(row: JsonRecord, key: string, path: string, choices: readonly T[]): T => {
    const value = text(row, key, path); if (!choices.includes(value as T)) fail(`${path}.${key}`, `must be one of ${choices.join(', ')}`); return value as T;
  };
  const optionalText = (row: JsonRecord, key: string, path: string) => row[key] === undefined ? undefined : text(row, key, path);
  const prose = (row: JsonRecord, key: string, path: string) => Array.isArray(row[key]) ? texts(row, key, path).join('\n') : text(row, key, path);
  const optionalTexts = (row: JsonRecord, key: string, path: string) => row[key] === undefined ? undefined : texts(row, key, path);
  const append = (file: string, body: JsonRecord, key: string, parse: (row: JsonRecord, path: string) => void, required = true) => {
    if (!required && body[key] === undefined) return;
    if (!Array.isArray(body[key])) return fail(`${file}.${key}`, 'must be an array');
    (body[key] as unknown[]).forEach((row, index) => { const path = `${file}.${key}[${index}]`; if (!isRecord(row)) fail(path, 'must be an object'); else parse(row, path); });
  };
  for (const [file, raw] of Object.entries(inputs).sort(([a], [b]) => a.localeCompare(b))) {
    output.files.push(file);
    if (!isRecord(raw)) { fail(file, 'must be an object'); continue; }
    if (raw.schemaVersion !== 1) fail(file, 'schemaVersion must equal 1');
    append(file, raw, 'sources', (row, path) => {
      const url = text(row, 'url', path); if (url && !validProgramUrl(url)) fail(`${path}.url`, 'must use http or https');
      const sha256 = optionalText(row, 'sha256', path); if (sha256 && !/^[a-f\d]{64}$/i.test(sha256)) fail(`${path}.sha256`, 'must be a 64-character hexadecimal SHA-256 receipt');
      const bytes = row.bytes as number | undefined; if (bytes !== undefined && (!Number.isSafeInteger(bytes) || bytes < 0)) fail(`${path}.bytes`, 'must be a nonnegative safe integer');
      output.sources.push({ id: ids(row, path, 'source'), title: text(row, 'title', path), url, publisher: text(row, 'publisher', path), publishedAt: date(row, 'publishedAt', path, true), accessedAt: date(row, 'accessedAt', path) ?? '', sourceType: text(row, 'sourceType', path), accessDepth: enumValue(row, 'accessDepth', path, ['full-text', 'pdf-visual', 'search-excerpt', 'index-only']), accessNotes: optionalText(row, 'accessNotes', path), locator: optionalText(row, 'locator', path), sha256, bytes, supports: prose(row, 'supports', path), limitations: prose(row, 'limitations', path), sourceFamily: text(row, 'sourceFamily', path) });
    });
    const sectorFile = !file.endsWith('methods.json') && !file.endsWith('proven-cases.json');
    append(file, raw, 'entities', (row, path) => output.entities.push({ id: ids(row, path, 'entity'), name: text(row, 'name', path), type: text(row, 'type', path), identifiers: texts(row, 'identifiers', path, true), existingEntityId: optionalText(row, 'existingEntityId', path), sourceIds: texts(row, 'sourceIds', path), sectorIds: optionalTexts(row, 'sectorIds', path) }), sectorFile);
    append(file, raw, 'connections', (row, path) => {
      const from = text(row, 'from', path), to = text(row, 'to', path);
      if (from === to) fail(path, 'self-relations require a separate explicit model; from and to must differ');
      const dateFrom = date(row, 'dateFrom', path, true), dateTo = date(row, 'dateTo', path, true);
      if (dateFrom && dateTo && dateBound(dateFrom, false) > dateBound(dateTo, true)) fail(path, 'dateFrom is later than dateTo');
      let amount: ProgramAmount | undefined;
      if (row.amount !== undefined) {
        if (!isRecord(row.amount)) fail(`${path}.amount`, 'must be an object');
        else { const value = row.amount.value; if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) fail(`${path}.amount.value`, 'must be finite and nonnegative'); amount = { value: value as number, currency: text(row.amount, 'currency', `${path}.amount`), unit: text(row.amount, 'unit', `${path}.amount`), stage: text(row.amount, 'stage', `${path}.amount`), basis: text(row.amount, 'basis', `${path}.amount`), exactValue: optionalText(row.amount, 'exactValue', `${path}.amount`), rawText: optionalText(row.amount, 'rawText', `${path}.amount`) }; }
      }
      output.connections.push({ id: ids(row, path, 'connection'), from, to, relation: text(row, 'relation', path), label: text(row, 'label', path), status: enumValue(row, 'status', path, ['documented', 'alleged', 'hypothesis']), sourceIds: texts(row, 'sourceIds', path), summary: text(row, 'summary', path), sectorIds: optionalTexts(row, 'sectorIds', path), dateFrom, dateTo, amount, limits: texts(row, 'limits', path), alternativeExplanations: texts(row, 'alternativeExplanations', path), falsifier: text(row, 'falsifier', path), response: optionalText(row, 'response', path) });
    }, sectorFile);
    append(file, raw, 'leads', (row, path) => {
      const existingCaseId = optionalText(row, 'existingCaseId', path), hypothesisIndex = row.hypothesisIndex as number | undefined;
      if (hypothesisIndex !== undefined && (!Number.isInteger(hypothesisIndex) || hypothesisIndex < 0 || !existingCaseId)) fail(path, 'hypothesisIndex must be a nonnegative integer paired with existingCaseId');
      output.leads.push({ id: ids(row, path, 'lead'), title: text(row, 'title', path), question: text(row, 'question', path), sectorIds: texts(row, 'sectorIds', path), sourceIds: texts(row, 'sourceIds', path), neededEvidence: texts(row, 'neededEvidence', path), disconfirmingEvidence: texts(row, 'disconfirmingEvidence', path), feasibility: text(row, 'feasibility', path), priority: row.priority === undefined ? undefined : enumValue(row, 'priority', path, ['high', 'medium', 'low'] as const), existingCaseId, hypothesisIndex });
    }, sectorFile);
    append(file, raw, 'coverage', (row, path) => {
      const inspectedSources = row.inspectedSources; if (!Number.isInteger(inspectedSources) || (inspectedSources as number) < 0) fail(`${path}.inspectedSources`, 'must be a nonnegative integer');
      output.coverage.push({ sector: text(row, 'sector', path), status: text(row, 'status', path), inspectedSources: inspectedSources as number, remainingGaps: texts(row, 'remainingGaps', path) });
    }, sectorFile);
    append(file, raw, 'cases', (row, path) => {
      const legal = isRecord(row.legalOutcome) ? row.legalOutcome : {}; if (!isRecord(row.legalOutcome)) fail(`${path}.legalOutcome`, 'must be an object');
      const evidentiaryChain: (string | ProgramEvidenceStep)[] = [], transferableTests: (string | ProgramTransferableTest)[] = [];
      for (const key of ['evidentiaryChain', 'transferableTests']) {
        if (!Array.isArray(row[key]) || !row[key].length) { fail(`${path}.${key}`, 'must be a nonempty array'); continue; }
        (row[key] as unknown[]).forEach((item, index) => { const at = `${path}.${key}[${index}]`;
          if (cleanText(item)) { if (key === 'evidentiaryChain') evidentiaryChain.push(item); else transferableTests.push(item); return; }
          if (!isRecord(item)) { fail(at, 'must be text or a structured evidence/test record'); return; }
          if (key === 'evidentiaryChain') evidentiaryChain.push({ stage: text(item, 'stage', at), evidence: text(item, 'evidence', at), inferenceAllowed: text(item, 'inferenceAllowed', at), inferenceNotAllowed: text(item, 'inferenceNotAllowed', at), sourceIds: texts(item, 'sourceIds', at), locator: text(item, 'locator', at) });
          else transferableTests.push({ id: ids(item, at, 'transferable-test'), status: text(item, 'status', at), question: text(item, 'question', at), requiredRecords: texts(item, 'requiredRecords', at), comparator: text(item, 'comparator', at), rivalExplanation: text(item, 'rivalExplanation', at), falsifier: text(item, 'falsifier', at), stopRule: text(item, 'stopRule', at) });
        });
      }
      output.cases.push({ id: ids(row, path, 'case'), title: text(row, 'title', path), sectors: texts(row, 'sectors', path), mechanism: text(row, 'mechanism', path), evidentiaryChain, legalOutcome: { stage: text(legal, 'stage', `${path}.legalOutcome`), date: date(legal, 'date', `${path}.legalOutcome`) ?? '', subject: text(legal, 'subject', `${path}.legalOutcome`), finding: text(legal, 'finding', `${path}.legalOutcome`), limits: prose(legal, 'limits', `${path}.legalOutcome`) }, sourceIds: texts(row, 'sourceIds', path), transferableTests, nonTransferableInferences: texts(row, 'nonTransferableInferences', path) });
    }, file.endsWith('proven-cases.json'));
    append(file, raw, 'methods', (row, path) => output.methods.push({ id: ids(row, path, 'method'), title: text(row, 'title', path), category: text(row, 'category', path), purpose: text(row, 'purpose', path), steps: texts(row, 'steps', path), failureModes: texts(row, 'failureModes', path), requiredOutputs: texts(row, 'requiredOutputs', path), sourceIds: texts(row, 'sourceIds', path), status: enumValue(row, 'status', path, ['established', 'emerging', 'experimental']), benchmarkLimits: text(row, 'benchmarkLimits', path) }), file.endsWith('methods.json'));
  }
  const sourceIds = new Set(output.sources.map(item => item.id)), entityIds = new Set(output.entities.map(item => item.id));
  for (const item of [...output.entities, ...output.connections, ...output.leads, ...output.cases, ...output.methods]) {
    for (const id of item.sourceIds) if (!sourceIds.has(id)) fail(item.id, `dangling source ${id}`);
    if (new Set(item.sourceIds).size !== item.sourceIds.length) fail(item.id, 'duplicate sourceIds');
  }
  for (const edge of output.connections) for (const key of ['from', 'to'] as const) if (!entityIds.has(edge[key])) fail(edge.id, `dangling ${key} entity ${edge[key]}`);
  for (const item of output.cases) for (const step of item.evidentiaryChain) if (typeof step !== 'string') for (const id of step.sourceIds) if (!sourceIds.has(id) || !item.sourceIds.includes(id)) fail(item.id, `evidence step citation is not declared by this case: ${id}`);
  for (const entity of output.entities) if (entity.existingEntityId && !context.resolvedEntityIds?.includes(entity.existingEntityId)) fail(entity.id, `existingEntityId is not a verified resolved registry entity: ${entity.existingEntityId}`);
  for (const lead of output.leads) if (lead.existingCaseId) { const target = context.existingCases?.find(item => item.id === lead.existingCaseId); if (!target || (lead.hypothesisIndex ?? 0) >= target.hypotheses.length) fail(lead.id, 'existing case/question crosswalk does not resolve'); }
  if (errors.length) return { ...emptyProgram(), files: output.files, errors };
  return output;
}

export interface ConnectionFilters { sector?: string; status?: string; relation?: string; entity?: string; query?: string }
export function filterProgramConnections(program: ResearchProgram, filters: ConnectionFilters): ProgramConnection[] {
  const entities = new Map(program.entities.map(item => [item.id, item])); const q = filters.query?.trim().toLowerCase();
  return program.connections.filter(edge => (!filters.sector || edge.sectorIds?.includes(filters.sector)) && (!filters.status || edge.status === filters.status) && (!filters.relation || edge.relation === filters.relation) && (!filters.entity || edge.from === filters.entity || edge.to === filters.entity) && (!q || [edge.label, edge.summary, edge.relation, entities.get(edge.from)?.name, entities.get(edge.to)?.name].join(' ').toLowerCase().includes(q)));
}
export interface EvidencePath { entityIds: string[]; connectionIds: string[]; reversed: boolean[] }
/** Every step is an existing cited relation. Names never participate in identity resolution. */
export function findEvidencePaths(connections: readonly ProgramConnection[], from: string, to: string, direction: 'directed' | 'both' = 'directed', maxDepth = 4): { paths: EvidencePath[]; truncated: boolean } {
  if (!from || !to || from === to) return { paths: [], truncated: false };
  const paths: EvidencePath[] = [], queue: EvidencePath[] = [{ entityIds: [from], connectionIds: [], reversed: [] }]; let expanded = 0;
  while (queue.length && paths.length < 3 && expanded < 5000) {
    const current = queue.shift()!; expanded += 1; if (current.connectionIds.length >= Math.min(4, Math.max(1, maxDepth))) continue;
    const tail = current.entityIds[current.entityIds.length - 1];
    for (const edge of connections) {
      const backwards = edge.to === tail && direction === 'both'; if (edge.from !== tail && !backwards) continue;
      const next = backwards ? edge.from : edge.to; if (current.entityIds.includes(next)) continue;
      const path = { entityIds: [...current.entityIds, next], connectionIds: [...current.connectionIds, edge.id], reversed: [...current.reversed, backwards] };
      if (next === to) { paths.push(path); if (paths.length === 3) break; } else queue.push(path);
    }
  }
  return { paths, truncated: queue.length > 0 || expanded >= 5000 };
}
export function programExport(program: ResearchProgram, edges: readonly ProgramConnection[]) {
  const ids = new Set(edges.flatMap(edge => [edge.from, edge.to])); const entities = program.entities.filter(item => ids.has(item.id));
  const sourceIds = new Set([...edges.flatMap(edge => edge.sourceIds), ...entities.flatMap(item => item.sourceIds)]);
  return { schemaVersion: 1, exportedAt: new Date().toISOString(), scope: 'Filtered recorded relations, not an exhaustive population or a conclusion about coordination.', entities, connections: edges, sources: program.sources.filter(source => sourceIds.has(source.id)), boundary: 'Status belongs to each relation. A connected path does not prove causation, common intent, wrongdoing or independent corroboration. Path search does not enforce temporal overlap or establish a contemporaneous chain. No amounts are aggregated.' };
}
