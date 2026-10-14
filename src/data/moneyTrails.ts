import type { InvestigationAmount, InvestigationEntity, InvestigationRecord, InvestigationRegistry, InvestigationRelationship } from './investigation';
import corporateTrails from '../../research/raw/money-trails/corporate/trails.json';
import mumbaiTrails from '../../research/raw/money-trails/mumbai/trails.json';
import djbTrails from '../../research/raw/money-trails/djb/trails.json';

export const MONEY_TRAIL_BASIS_LABELS = {
  'documented-financial-disclosure': 'Financial disclosure',
  'court-recorded-agency-allegation': 'Agency allegation in court record',
  'agency-published-allegation': 'Agency-published allegation',
  'judicial-procedural-finding': 'Judicial / procedural finding',
  'accounting-reconciliation': 'Accounting reconciliation',
  'contract-commitment': 'Contract commitment',
  'ownership-role-context': 'Ownership / role context',
  'unresolved-cash-path-stop': 'Cash path stops here',
} as const;
export const MONEY_TRAIL_FLOW_LABELS = { 'documented-transfer': 'Documented transfer', 'reported-transfer': 'Reported transfer · source limitations', 'alleged-transfer': 'Alleged transfer', commitment: 'Commitment, not payment', context: 'Non-transaction context', gap: 'Missing transaction evidence' } as const;
export type MoneyTrailBasis = keyof typeof MONEY_TRAIL_BASIS_LABELS;
export type MoneyTrailFlowState = keyof typeof MONEY_TRAIL_FLOW_LABELS;
export interface MoneyTrailEvidenceRef { kind: 'entity' | 'relationship' | 'record' | 'source'; id: string }
export interface MoneyTrailAmountRef { kind: 'record' | 'relationship'; id: string; amountIndex: number }
export interface MoneyTrailSourceLocator { sourceId: string; locator: string; role: 'supports' | 'counterevidence' | 'response' | 'limitation'; sourceFamily?: string }
export interface MoneyTrailHop {
  id: string; title: string; summary: string; basis: MoneyTrailBasis; flowState: MoneyTrailFlowState;
  fromEntityId: string | null; toEntityId: string | null; entityIds: string[]; relationshipIds: string[]; recordIds: string[]; sourceIds: string[];
  sourceLocators: MoneyTrailSourceLocator[]; date: string | null; dateBasis: string; financialStage: string; amountRefs: MoneyTrailAmountRef[];
  responseRecordIds: string[]; counterEvidenceRecordIds: string[]; response: string; alternatives: string[]; missingNextDocument: string; documentHolder: string; limitations: string[];
  eventPeriod?: string; identityStatus?: string; overlapGroup?: string; stopReason?: string;
}
export interface MoneyTrailHypothesis {
  id: string; question: string; observation: string; expectedDocumentaryFootprints: string[];
  supportingEvidence: MoneyTrailEvidenceRef[]; refutingEvidence: MoneyTrailEvidenceRef[];
  disconfirmationTest: string; documentHolder: string; neededRecords: string[];
  status: 'open' | 'supported-with-limits' | 'weakened' | 'refuted'; limitations: string[];
}
export interface MoneyTrail {
  id: string; title: string; city: 'delhi' | 'mumbai' | 'national' | 'multi-city'; caseRecordId: string; question: string; conclusion: string;
  sourceStatus: string; cutoff: string; hopIds: string[]; hypothesisIds: string[]; limitations: string[];
}
export interface MoneyTrailCatalog { schemaVersion: 1; namespace: string; cutoff: string; trails: MoneyTrail[]; hops: MoneyTrailHop[]; hypotheses: MoneyTrailHypothesis[] }

export const MONEY_TRAIL_CATALOGS: MoneyTrailCatalog[] = [djbTrails as MoneyTrailCatalog, mumbaiTrails as MoneyTrailCatalog, corporateTrails as MoneyTrailCatalog];
export const MONEY_TRAILS: MoneyTrail[] = MONEY_TRAIL_CATALOGS.flatMap(catalog => catalog.trails);
const unique = <T,>(rows: T[]) => [...new Set(rows)];
const byId = <T extends { id: string }>(rows: T[]) => new Map(rows.map(row => [row.id, row]));
const CONTEXT_KINDS = new Set(['identity-crosswalk', 'identity-bridge', 'same-entity', 'own', 'ownership', 'shareholding', 'role', 'director', 'directorship', 'office-holder', 'ministerial-role', 'official-role', 'parent', 'subsidiary', 'controls', 'appointed']);

/** Context is a retained relationship with an explicit semantic kind, never a guessed name join. */
export function isMoneyTrailContextRelationship(row: InvestigationRelationship) {
  return CONTEXT_KINDS.has(row.kind) && row.amounts.length === 0 && row.tier !== 'alleged' && row.tier !== 'analytic';
}

/** Provenance closure deliberately does not fan out from entity adjacency. */
export function closeMoneyTrailEvidence(registry: InvestigationRegistry, refs: MoneyTrailEvidenceRef[]) {
  const maps = { entity: byId(registry.entities), relationship: byId(registry.relationships), record: byId(registry.records), source: byId(registry.sources) };
  const ids = { entity: new Set<string>(), relationship: new Set<string>(), record: new Set<string>(), source: new Set<string>() };
  const missing = new Set<string>(), queue = [...refs];
  for (let index = 0; index < queue.length; index++) {
    const ref = queue[index];
    if (ids[ref.kind].has(ref.id)) continue;
    const row = maps[ref.kind].get(ref.id);
    if (!row) { missing.add(ref.id); continue; }
    ids[ref.kind].add(ref.id);
    if (ref.kind === 'source') continue;
    const evidence = row as InvestigationEntity | InvestigationRelationship | InvestigationRecord;
    queue.push(...unique([...evidence.sourceIds, ...evidence.geography.flatMap(geo => geo.sourceIds)]).map(id => ({ kind: 'source' as const, id })));
    if (ref.kind === 'relationship') {
      const edge = row as InvestigationRelationship;
      queue.push({ kind: 'entity', id: edge.from }, { kind: 'entity', id: edge.to }, ...unique([...edge.recordIds, ...edge.responseIds]).map(id => ({ kind: 'record' as const, id })));
    }
    if (ref.kind === 'record') {
      const record = row as InvestigationRecord;
      queue.push(...record.entityIds.map(id => ({ kind: 'entity' as const, id })), ...record.relationshipIds.map(id => ({ kind: 'relationship' as const, id })));
    }
  }
  return {
    entities: registry.entities.filter(row => ids.entity.has(row.id)), relationships: registry.relationships.filter(row => ids.relationship.has(row.id)),
    records: registry.records.filter(row => ids.record.has(row.id)), sources: registry.sources.filter(row => ids.source.has(row.id)), missingIds: [...missing].sort(),
  };
}

function hopRefs(hop: MoneyTrailHop): MoneyTrailEvidenceRef[] {
  return [
    ...unique([...hop.entityIds, ...[hop.fromEntityId, hop.toEntityId].filter((id): id is string => !!id)]).map(id => ({ kind: 'entity' as const, id })),
    ...hop.relationshipIds.map(id => ({ kind: 'relationship' as const, id })),
    ...unique([...hop.recordIds, ...hop.responseRecordIds, ...hop.counterEvidenceRecordIds]).map(id => ({ kind: 'record' as const, id })),
    ...unique([...hop.sourceIds, ...hop.sourceLocators.map(locator => locator.sourceId)]).map(id => ({ kind: 'source' as const, id })),
    ...hop.amountRefs.map(({ kind, id }) => ({ kind, id })),
  ];
}

export function moneyTrailHopAmounts(registry: InvestigationRegistry, hop: MoneyTrailHop): InvestigationAmount[] {
  const records = byId(registry.records), relationships = byId(registry.relationships);
  if (hop.flowState === 'gap') return [];
  return hop.amountRefs.flatMap(ref => {
    const amount = (ref.kind === 'record' ? records : relationships).get(ref.id)?.amounts[ref.amountIndex];
    return amount ? [{ ...amount }] : [];
  });
}

export function getMoneyTrailsView(registry: InvestigationRegistry, options: { city?: 'all' | 'delhi' | 'mumbai' | 'national'; q?: string } = {}, catalogs: MoneyTrailCatalog[] = MONEY_TRAIL_CATALOGS) {
  const records = byId(registry.records), entities = byId(registry.entities), sources = byId(registry.sources);
  const query = (options.q ?? '').trim().toLocaleLowerCase(), city = options.city ?? 'all';
  const all = catalogs.flatMap(catalog => catalog.trails);
  const trails = all.filter(trail => {
    if (city !== 'all' && trail.city !== city && !(trail.city === 'multi-city' && city !== 'national')) return false;
    if (!query) return true;
    const record = records.get(trail.caseRecordId), catalog = catalogs.find(row => row.trails.some(candidate => candidate.id === trail.id));
    const hops = catalog?.hops.filter(hop => trail.hopIds.includes(hop.id)) ?? [];
    const text = [trail.title, trail.question, trail.conclusion, record?.summary, ...hops.flatMap(hop => [hop.title, hop.summary, ...hop.entityIds.map(id => entities.get(id)?.label), ...hop.sourceIds.map(id => sources.get(id)?.title)])].filter(Boolean).join(' ').toLocaleLowerCase();
    return text.includes(query);
  });
  const hops = catalogs.flatMap(catalog => catalog.hops).filter(hop => trails.some(trail => trail.hopIds.includes(hop.id)));
  return { trails, empty: trails.length === 0, counts: { trails: trails.length, availableTrails: all.length, hops: hops.length, gaps: hops.filter(hop => hop.flowState === 'gap').length, hypotheses: unique(trails.flatMap(trail => trail.hypothesisIds)).length }, interpretation: 'Counts describe reviewed trails and evidence steps; they do not measure corruption, transaction totals or investigative completeness.' };
}

/** Two-hop role/ownership/identity expansion preserves exact endpoints and cannot turn into payment. */
export function getMoneyTrailConnectedContext(registry: InvestigationRegistry, seedIds: string[], depth = 2) {
  const sourceIds = new Set(registry.sources.map(source => source.id)), entityIds = new Set(registry.entities.map(entity => entity.id));
  const eligible = registry.relationships.filter(row => isMoneyTrailContextRelationship(row) && entityIds.has(row.from) && entityIds.has(row.to) && row.sourceIds.length > 0 && [...row.sourceIds, ...row.geography.flatMap(geo => geo.sourceIds)].every(id => sourceIds.has(id)));
  const reached = new Set(seedIds.filter(id => entityIds.has(id))), selected = new Set<string>();
  let frontier = new Set(reached);
  const boundedDepth = Math.min(2, Math.max(0, Math.floor(Number.isFinite(depth) ? depth : 2)));
  for (let step = 0; step < boundedDepth && frontier.size; step++) {
    const next = new Set<string>();
    for (const edge of eligible) if (frontier.has(edge.from) || frontier.has(edge.to)) {
      selected.add(edge.id);
      for (const id of [edge.from, edge.to]) if (!reached.has(id)) next.add(id);
    }
    for (const id of next) reached.add(id);
    frontier = next;
  }
  return { depth: boundedDepth, entityIds: [...reached], relationships: eligible.filter(row => selected.has(row.id)), interpretation: 'Exact retained identity, role and ownership context only. These links do not document cash movement, political influence or a quid pro quo.' };
}

export function getMoneyTrailDetail(registry: InvestigationRegistry, trailId: string, catalogs: MoneyTrailCatalog[] = MONEY_TRAIL_CATALOGS) {
  const catalog = catalogs.find(row => row.trails.some(trail => trail.id === trailId));
  const trail = catalog?.trails.find(row => row.id === trailId);
  if (!catalog || !trail) return null;
  const hopIndex = byId(catalog.hops), hypothesisIndex = byId(catalog.hypotheses), sources = byId(registry.sources);
  const missingIds = new Set<string>();
  const hops = trail.hopIds.flatMap(id => { const hop = hopIndex.get(id); if (!hop) { missingIds.add(id); return []; } return [{ ...hop, amounts: moneyTrailHopAmounts(registry, hop), sources: hop.sourceIds.flatMap(sourceId => { const source = sources.get(sourceId); return source ? [source] : []; }) }]; });
  const hypotheses = trail.hypothesisIds.flatMap(id => { const hypothesis = hypothesisIndex.get(id); if (!hypothesis) { missingIds.add(id); return []; } return [hypothesis]; });
  const refs: MoneyTrailEvidenceRef[] = [{ kind: 'record', id: trail.caseRecordId }, ...hops.flatMap(hopRefs), ...hypotheses.flatMap(row => [...row.supportingEvidence, ...row.refutingEvidence])];
  const evidence = closeMoneyTrailEvidence(registry, refs);
  evidence.missingIds.forEach(id => missingIds.add(id));
  const financialHops = hops.filter(hop => !['gap', 'context'].includes(hop.flowState) && !['unresolved-cash-path-stop', 'ownership-role-context', 'judicial-procedural-finding'].includes(hop.basis));
  const explicitRelationshipIds = new Set(financialHops.flatMap(hop => hop.relationshipIds));
  const entityIndex = byId(registry.entities), sourceIndex = new Set(registry.sources.map(row => row.id));
  const usable = (row: InvestigationRelationship) => entityIndex.has(row.from) && entityIndex.has(row.to) && row.sourceIds.length > 0 && [...row.sourceIds, ...row.geography.flatMap(geo => geo.sourceIds)].every(id => sourceIndex.has(id));
  const pathRelationships = evidence.relationships.filter(row => explicitRelationshipIds.has(row.id) && usable(row));
  const explicitEntityIds = new Set([...financialHops.flatMap(hop => hop.entityIds), ...pathRelationships.flatMap(row => [row.from, row.to])]);
  const pathRecordIds = new Set(financialHops.flatMap(hop => hop.recordIds));
  const pathRegistry: InvestigationRegistry = { ...registry, ...evidence, entities: evidence.entities.filter(row => explicitEntityIds.has(row.id)), relationships: pathRelationships, records: evidence.records.filter(row => pathRecordIds.has(row.id)), coverage: [], held: [] };
  // Geography must not silently reintroduce every contextual person in a case.
  // Project selection references only; readers and exports use the unchanged canonical record.
  const pathMapRegistry: InvestigationRegistry = { ...pathRegistry, records: pathRegistry.records.map(record => ({ ...record,
    entityIds: record.entityIds.filter(id => explicitEntityIds.has(id)),
    relationshipIds: record.relationshipIds.filter(id => explicitRelationshipIds.has(id)),
    limitations: [...record.limitations, 'Map-only selection projection: displayed participant references are limited to this trail’s explicit financial steps. The evidence reader and exported packet retain the complete original record.'],
  })).filter(record => record.entityIds.length > 0) };
  const allAuthoredEntityIds = unique(hops.flatMap(hop => hop.entityIds));
  const connectedContext = getMoneyTrailConnectedContext(registry, allAuthoredEntityIds);
  const authoredContextIds = new Set(hops.filter(hop => hop.flowState === 'context').flatMap(hop => hop.relationshipIds));
  connectedContext.relationships = unique([...connectedContext.relationships, ...evidence.relationships.filter(row => authoredContextIds.has(row.id) && usable(row))]);
  const contextClosure = closeMoneyTrailEvidence(registry, [...refs, ...connectedContext.relationships.map(row => ({ kind: 'relationship' as const, id: row.id }))]);
  const contextRelationshipIds = new Set([...pathRelationships.map(row => row.id), ...connectedContext.relationships.map(row => row.id)]);
  const contextEntityIds = new Set([...allAuthoredEntityIds, ...connectedContext.entityIds]);
  const contextRecordIds = new Set([trail.caseRecordId, ...hops.flatMap(hop => hop.recordIds)]);
  const contextRegistry: InvestigationRegistry = { ...registry, ...contextClosure, relationships: contextClosure.relationships.filter(row => contextRelationshipIds.has(row.id) && usable(row)), entities: contextClosure.entities.filter(row => contextEntityIds.has(row.id)), records: contextClosure.records.filter(row => contextRecordIds.has(row.id)), coverage: [], held: [] };
  contextClosure.missingIds.forEach(id => missingIds.add(id));
  const byBasis = Object.fromEntries(Object.keys(MONEY_TRAIL_BASIS_LABELS).map(basis => [basis, hops.filter(hop => hop.basis === basis).length])) as Record<MoneyTrailBasis, number>;
  const byFlowState = Object.fromEntries(Object.keys(MONEY_TRAIL_FLOW_LABELS).map(state => [state, hops.filter(hop => hop.flowState === state).length])) as Record<MoneyTrailFlowState, number>;
  return { trail, hops, hypotheses, metrics: { hops: hops.length, byBasis, byFlowState, gaps: byFlowState.gap, explicitRelationships: pathRelationships.length, contextRelationships: connectedContext.relationships.filter(row => !explicitRelationshipIds.has(row.id)).length, sources: evidence.sources.length }, evidence, pathRegistry, pathMapRegistry, contextRegistry, contextMapRegistry: contextRegistry, mapProjection: 'Map selection references are narrowed to displayed steps; the full original record remains in the reader and evidence packet.', connectedContext, missingIds: [...missingIds].sort() };
}

export function exportMoneyTrailEvidence(registry: InvestigationRegistry, trailId: string, catalogs: MoneyTrailCatalog[] = MONEY_TRAIL_CATALOGS) {
  const detail = getMoneyTrailDetail(registry, trailId, catalogs);
  if (!detail) return null;
  const contextEvidence = closeMoneyTrailEvidence(registry, detail.connectedContext.relationships.map(row => ({ kind: 'relationship' as const, id: row.id })));
  return { schemaVersion: 1, exportedAt: new Date().toISOString(), registryUpdatedAt: registry.updatedAt, trail: detail.trail, hops: detail.hops, hypotheses: detail.hypotheses, metrics: detail.metrics, ...detail.evidence, missingIds: detail.missingIds, context: { interpretation: detail.connectedContext.interpretation, relationshipIds: detail.connectedContext.relationships.map(row => row.id), ...contextEvidence }, interpretation: 'Editorially ordered source-backed steps, not an inferred end-to-end payment path. Financial stages, periods and currencies are not added. Court-recorded agency allegations remain allegations. Roles, ownership, identity and political giving do not prove a quid pro quo. A gap generates no relationship.' };
}
