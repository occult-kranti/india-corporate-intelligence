import bundle from '../../research/funding-investigations/bundle.json';
import { INVESTIGATION_REGISTRY, INVESTIGATION_DOMAINS, type InvestigationRegistry, type InvestigationGeography, type InvestigationTier, type InvestigationLayer, type InvestigationRecord } from './investigation';

export type FundingStatus = 'documented' | 'alleged' | 'audit-finding' | 'unresolved' | 'contradicted';
export type FundingSource = { id: string; title: string; publisher: string; url: string; publishedAt: string | null; accessedAt: string; kind: string; sourceFamily: string; inspection: string; locator: string; excerpt: string; limitations: string[]; capturePath: string | null; sha256: string | null };
export type FundingEntity = { id: string; label: string; kind: string; identityBasis: string; sourceIds: string[]; resolved?: boolean };
export type FundingEdge = { id: string; from: string; to: string; relation: string; label: string; status: FundingStatus; stage: string; date: string | null; amount: { value: number; currency: string; unit: string; period: string; basis: string; overlapGroup: string | null } | null; sourceIds: string[]; response: string; limits: string[] };
export type FundingClaim = { id: string; text: string; status: FundingStatus; sourceIds: string[]; response: string; alternative: string; falsifier: string; missingRecords: string[] };
export type DecisionAnalysis = { decisionDate: string | null; actors: { entityId: string; authority: string; incentive: string; evidenceSourceIds: string[] }[]; informationThen: (string | { text: string; sourceIds: string[] })[]; options: { label: string; expectedObservableOutcome: string; sourceIds: string[] }[]; observedOutcome: string; sourceIds: string[]; hindsightLimits: string[] };
export type FundingCase = { id: string; title: string; question: string; sector: string; period: string; status: FundingStatus; finding: string; geography: { label: string; stateCode: string | null; basis: string }[]; entityIds: string[]; edgeIds: string[]; sourceIds: string[]; claims: FundingClaim[]; whatWeKnow: string[]; whatWeDoNotKnow: string[]; nextRecords: { record: string; holder: string; purpose: string }[]; limits: string[]; decisionAnalysis?: DecisionAnalysis };
export type FundingStream = { schemaVersion: number; track: string; reviewDate: string; scope: string; searchLog: { query: string; requestedResults: number; date: string }[]; sources: FundingSource[]; entities: FundingEntity[]; edges: FundingEdge[]; cases: FundingCase[]; coverage: { institution: string; jurisdiction: string; period: string; status: string; sourceIds: string[]; gap: string; nextRecord: string }[]; rejectedJoins: { from: string; to: string; proposed: string; reason: string; sourceIds: string[] }[]; roadmap: { phase: string; task: string; deliverable: string; acceptance: string }[] };
export const FUNDING_BUNDLE = bundle as unknown as { schemaVersion: number; reviewDate: string; streams: FundingStream[] };
export const FUNDING_STREAMS = FUNDING_BUNDLE.streams;
export const FUNDING_CASES = FUNDING_STREAMS.flatMap(stream => stream.cases.map(row => ({ ...row, track: stream.track })));
export const FUNDING_SOURCES = new Map(FUNDING_STREAMS.flatMap(stream => stream.sources).map(row => [row.id, row]));
export const FUNDING_ENTITIES = new Map(FUNDING_STREAMS.flatMap(stream => stream.entities).map(row => [row.id, row]));
export const FUNDING_EDGES = new Map(FUNDING_STREAMS.flatMap(stream => stream.edges).map(row => [row.id, row]));
export const FUNDING_TRACKS: Record<string, string> = { defence: 'Defence & arms', 'police-border': 'Police & borders', utilities: 'Water & energy', 'welfare-pmcares': 'Welfare & PM CARES', 'cross-sector': 'Across sectors' };
export const FUNDING_STATUSES: Record<FundingStatus, string> = { documented: 'Documentary record', alleged: 'Attributed allegation', 'audit-finding': 'Audit finding', unresolved: 'Open question', contradicted: 'Contradicted or narrowed' };
const distinct = <T,>(rows: T[]) => [...new Set(rows)];
const date = (value: string | null) => value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
const tier = (status: FundingStatus): InvestigationTier => status === 'alleged' ? 'alleged' : status === 'documented' ? 'documented' : status === 'unresolved' ? 'analytic' : 'reported';
const domain = (stream: FundingStream) => ({ defence: ['defence-trade', 'security'], 'police-border': ['security', 'governance'], utilities: ['water', 'energy'], 'welfare-pmcares': ['welfare', 'pmcares', 'health'], 'cross-sector': ['finance', 'capital', 'transport', 'education', 'health', 'media', 'justice'] }[stream.track] ?? ['public-funds']);

function geography(cases: FundingCase[], sourceIds: string[]): InvestigationGeography[] {
  const rows = new Map<string, InvestigationGeography>();
  for (const item of cases) for (const place of item.geography) {
    const state = INVESTIGATION_REGISTRY.states.find(row => row.code === place.stateCode);
    const key = `${state?.code ?? 'unknown'}:${place.label}`;
    rows.set(key, { scope: state ? 'state' : 'unknown', stateCodes: state ? [state.code] : [], localityIds: [], basis: state ? 'state-association' : 'unknown', note: `${place.label}: ${place.basis}. Case association only; this does not locate a person, payment or operational asset.`, sourceIds });
  }
  return rows.size ? [...rows.values()] : [{ scope: 'unknown', stateCodes: [], localityIds: [], basis: 'unknown', note: 'No geographic association established in this research file.', sourceIds }];
}

function buildFundingRegistry(): InvestigationRegistry {
  const registry: InvestigationRegistry = { updatedAt: FUNDING_BUNDLE.reviewDate, entities: [], relationships: [], records: [], sources: [], states: INVESTIGATION_REGISTRY.states, localities: [], coverage: [], held: [], methodology: ['Source-attributed research files, not an exhaustive spending census.', 'No fuzzy identity merges, inferred transfers, pooled money total or guilt probability.', 'Maps show case associations. Decision analysis is retrospective and does not recreate an archived ex-ante information set.'] };
  for (const stream of FUNDING_STREAMS) {
    const namespace = `funding-${stream.track}`;
    const dimensions = (sourceIds: string[], cases: FundingCase[], layers: InvestigationLayer[] = ['funding', 'review']) => ({ domains: domain(stream), layers, geography: geography(cases, sourceIds), route: '/funding-investigations', sourceIds, limitations: ['Geographic association is not a transaction address. Source assertions retain their original scope and legal status.'] });
    for (const source of stream.sources) registry.sources.push({ id: source.id, originalId: source.id, namespace, title: source.title, url: source.url, publisher: source.publisher, publishedAt: source.publishedAt, retrievedAt: source.accessedAt, locator: source.locator, summary: source.excerpt, tier: ['reporting', 'methods'].includes(source.kind) ? 'reported' : 'documented', limitations: [...source.limitations, `Inspection: ${source.inspection}; source family: ${source.sourceFamily}.`] });
    for (const entity of stream.entities) registry.entities.push({ ...dimensions(entity.sourceIds, stream.cases.filter(row => row.entityIds.includes(entity.id)), [entity.kind === 'person' ? 'people' : 'organisations']), id: entity.id, originalId: entity.id, namespace, label: entity.label, type: entity.kind, resolved: entity.resolved === true, identityBasis: entity.identityBasis, summary: entity.identityBasis });
    const addRecord = (id: string, item: FundingCase, extra: Partial<InvestigationRecord> = {}) => {
      registry.records.push({ ...dimensions(item.sourceIds, [item]), id, originalId: id, namespace, title: item.title, summary: item.finding, kind: 'research-file', tier: tier(item.status), status: item.status, statusAsOf: stream.reviewDate, fromDate: date(item.decisionAnalysis?.decisionDate ?? null), toDate: null, dateBasis: 'Decision date where retained; period and source-publication dates are separate.', entityIds: item.entityIds, relationshipIds: item.edgeIds, period: item.period, response: item.claims.map(claim => claim.response).join('\n\n'), alternativeExplanations: item.claims.map(claim => claim.alternative), falsifier: item.claims.map(claim => claim.falsifier).join('\n\n'), amounts: [], ...extra });
    };
    for (const item of stream.cases) {
      addRecord(item.id, item, { limitations: [...item.limits, ...item.whatWeDoNotKnow] });
      for (const claim of item.claims) addRecord(claim.id, item, { title: claim.text, summary: claim.text, tier: tier(claim.status), status: claim.status, sourceIds: claim.sourceIds, response: claim.response, alternativeExplanations: [claim.alternative], falsifier: claim.falsifier, limitations: claim.missingRecords });
    }
    for (const edge of stream.edges) {
      const cases = stream.cases.filter(row => row.edgeIds.includes(edge.id));
      const responseId = `${edge.id}:response`;
      const amounts = edge.amount ? [{ value: edge.amount.value, currency: edge.amount.currency, unit: edge.amount.unit, stage: edge.stage, period: edge.amount.period }] : [];
      registry.relationships.push({ ...dimensions(edge.sourceIds, cases), id: edge.id, originalId: edge.id, namespace, from: edge.from, to: edge.to, kind: edge.relation, label: edge.label, tier: tier(edge.status), status: `${edge.status} · ${edge.stage}`, statusAsOf: stream.reviewDate, fromDate: date(edge.date), toDate: null, dateBasis: edge.date ?? 'Exact event date not established.', summary: `${edge.label}. Financial / institutional stage: ${edge.stage}.${edge.amount ? ` Amount basis: ${edge.amount.basis}.` : ''}`, alternativeExplanations: distinct(cases.flatMap(row => row.claims.map(claim => claim.alternative))), falsifier: cases.flatMap(row => row.claims.map(claim => claim.falsifier)).join('\n\n') || null, responseIds: [responseId], recordIds: [...cases.map(row => row.id), responseId], amounts, limitations: edge.limits });
      registry.records.push({ ...dimensions(edge.sourceIds, cases), id: responseId, originalId: responseId, namespace, title: `Response and limits: ${edge.label}`, summary: edge.response, kind: 'response-and-qualification', tier: tier(edge.status), status: 'retained-response-or-explicit-gap', statusAsOf: stream.reviewDate, fromDate: null, toDate: null, dateBasis: 'Read the linked source dates.', entityIds: [edge.from, edge.to], relationshipIds: [edge.id], period: edge.amount?.period ?? cases[0]?.period ?? 'Unspecified', response: edge.response, alternativeExplanations: [], falsifier: null, amounts: [], limitations: edge.limits });
    }
    registry.coverage.push({ namespace, label: FUNDING_TRACKS[stream.track] ?? stream.track, route: '/funding-investigations', entities: stream.entities.length, relationships: stream.edges.length, records: stream.cases.length, sources: stream.sources.length, held: stream.rejectedJoins.length, limitations: [stream.scope] });
  }
  return registry;
}

export const FUNDING_REGISTRY = buildFundingRegistry();
export const EXISTING_SECTORS = INVESTIGATION_DOMAINS.map(row => ({ ...row, entities: INVESTIGATION_REGISTRY.entities.filter(entity => entity.domains.includes(row.value)).length, records: INVESTIGATION_REGISTRY.records.filter(record => record.domains.includes(row.value)).length }));
export const EXISTING_ATLAS = INVESTIGATION_REGISTRY;

function decisionSources(item: FundingCase): string[] {
  const decision = item.decisionAnalysis;
  return decision ? distinct([...decision.sourceIds, ...decision.actors.flatMap(row => row.evidenceSourceIds), ...decision.options.flatMap(row => row.sourceIds), ...decision.informationThen.flatMap(row => typeof row === 'string' ? [] : row.sourceIds)]) : [];
}

export function fundingCaseRegistry(item: FundingCase): InvestigationRegistry {
  const entityIds = new Set([...item.entityIds, ...(item.decisionAnalysis?.actors.map(row => row.entityId) ?? [])]), edgeIds = new Set(item.edgeIds);
  const relationships = FUNDING_REGISTRY.relationships.filter(row => edgeIds.has(row.id)).map(row => ({ ...row, recordIds: row.recordIds.filter(id => id === item.id || row.responseIds.includes(id)) }));
  for (const edge of relationships) { entityIds.add(edge.from); entityIds.add(edge.to); }
  const entities = FUNDING_REGISTRY.entities.filter(row => entityIds.has(row.id));
  const recordIds = new Set([item.id, ...item.claims.map(row => row.id), ...relationships.flatMap(row => [...row.recordIds, ...row.responseIds])]);
  const records = FUNDING_REGISTRY.records.filter(row => recordIds.has(row.id));
  const sourceIds = new Set([...item.sourceIds, ...decisionSources(item), ...[...entities, ...relationships, ...records].flatMap(row => [...row.sourceIds, ...row.geography.flatMap(place => place.sourceIds)])]);
  return { ...FUNDING_REGISTRY, entities, relationships, records, sources: FUNDING_REGISTRY.sources.filter(row => sourceIds.has(row.id)) };
}

export function exportFundingCase(item: FundingCase) {
  const stream = FUNDING_STREAMS.find(row => row.cases.some(candidate => candidate.id === item.id))!;
  const graph = fundingCaseRegistry(item);
  const sourceIds = distinct([...graph.sources.map(row => row.id), ...stream.rejectedJoins.flatMap(row => row.sourceIds)]);
  return { schemaVersion: 1, reviewDate: FUNDING_BUNDLE.reviewDate, case: item, sources: sourceIds.map(id => FUNDING_SOURCES.get(id)), entities: graph.entities.map(row => FUNDING_ENTITIES.get(row.id)), edges: graph.relationships.map(row => FUNDING_EDGES.get(row.id)), rejectedJoins: stream.rejectedJoins, rejectedJoinsScope: 'Entire research track; not all rejected joins concern the selected case.', aggregateAmount: null, inferredCashFlow: false, outcomeProbabilities: null, interpretation: 'Existing source-attributed relations only. Different financial stages are never summed. Decision analysis is retrospective; no private intent or forecast accuracy is inferred.' };
}
