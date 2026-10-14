import bundle from '../../research/hypothesis-lab/bundle.json';
import type { FundingCase, FundingStream, FundingStatus } from './fundingInvestigations';
import { INVESTIGATION_REGISTRY, type InvestigationGeography, type InvestigationLayer, type InvestigationRecord, type InvestigationRegistry, type InvestigationTier } from './investigation';

export type HypothesisAssessment = 'open' | 'narrowed' | 'contradicted' | 'supported-pattern';
export type HypothesisTestResult = 'unresolved' | 'supports' | 'narrows' | 'contradicts';
export type HypothesisLink = { id: string; from: string; to: string; question: string; missingEvidence: string; disconfirmingEvidence: string; sourceIds: string[] };
export type Hypothesis = {
  proposition: string; assessment: HypothesisAssessment; assessmentReason: string; jurisdiction: string;
  rules: { title: string; operativePeriod: string; requirement: string; sourceIds: string[] }[];
  alternatives: { id: string; label: string; explanation: string; discriminatingRecord: string }[];
  tests: { id: string; question: string; expectedIfTrue: string; expectedIfAlternative: string; observation: string; result: HypothesisTestResult; sourceIds: string[]; nextRecord: string; holder: string }[];
  proposedLinks: HypothesisLink[];
  chronology: { date: string; event: string; knowledge: 'contemporaneous' | 'later-outcome'; sourceIds: string[] }[];
  comparison: string; nextReview: string; inferenceLimits: string[];
};
export type HypothesisCase = FundingCase & { hypothesis: Hypothesis };
export type HypothesisStream = Omit<FundingStream, 'cases'> & { cases: HypothesisCase[] };
export const HYPOTHESIS_BUNDLE = bundle as unknown as { schemaVersion: number; reviewDate: string; streams: HypothesisStream[] };
export const HYPOTHESIS_STREAMS = HYPOTHESIS_BUNDLE.streams;
export const HYPOTHESIS_CASES = HYPOTHESIS_STREAMS.flatMap(stream => stream.cases.map(item => ({ ...item, track: stream.track })));
export const HYPOTHESIS_SOURCES = new Map(HYPOTHESIS_STREAMS.flatMap(stream => stream.sources).map(row => [row.id, row]));
export const HYPOTHESIS_ENTITIES = new Map(HYPOTHESIS_STREAMS.flatMap(stream => stream.entities).map(row => [row.id, row]));
export const HYPOTHESIS_EDGES = new Map(HYPOTHESIS_STREAMS.flatMap(stream => stream.edges).map(row => [row.id, row]));
export const HYPOTHESIS_TRACKS: Record<string, string> = { 'political-finance': 'Political finance & influence', 'resources-contracts': 'Resources & contracts', 'oversight-services': 'Oversight & public services' };
export const HYPOTHESIS_ASSESSMENTS: Record<HypothesisAssessment, string> = { open: 'Open hypothesis', narrowed: 'Narrowed by evidence', contradicted: 'Contradicted', 'supported-pattern': 'Observable pattern supported' };
export const HYPOTHESIS_STATUSES: Record<FundingStatus, string> = { documented: 'Documentary record', alleged: 'Attributed allegation', 'audit-finding': 'Audit finding', unresolved: 'Open question', contradicted: 'Contradicted or narrowed' };
export const HYPOTHESIS_COUNTS = {
  cases: HYPOTHESIS_CASES.length, sources: HYPOTHESIS_SOURCES.size, entities: HYPOTHESIS_ENTITIES.size,
  recordedEdges: HYPOTHESIS_EDGES.size, proposedLinks: HYPOTHESIS_CASES.reduce((sum, item) => sum + item.hypothesis.proposedLinks.length, 0),
  tests: HYPOTHESIS_CASES.reduce((sum, item) => sum + item.hypothesis.tests.length, 0),
  rejectedJoins: HYPOTHESIS_STREAMS.reduce((sum, stream) => sum + stream.rejectedJoins.length, 0),
};
const distinct = <T,>(rows: T[]) => [...new Set(rows)];
const exactDate = (value: string | null) => value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
const tier = (status: FundingStatus): InvestigationTier => status === 'alleged' ? 'alleged' : status === 'documented' ? 'documented' : status === 'unresolved' ? 'analytic' : 'reported';

/** Collect every nested citation, including decision actors, rules, tests and questions. */
export function hypothesisSourceIds(value: unknown): string[] {
  const ids: string[] = [];
  const walk = (entry: unknown) => {
    if (Array.isArray(entry)) { entry.forEach(walk); return; }
    if (!entry || typeof entry !== 'object') return;
    for (const [key, child] of Object.entries(entry)) {
      if ((key === 'sourceIds' || key === 'evidenceSourceIds') && Array.isArray(child)) ids.push(...child.filter((id): id is string => typeof id === 'string'));
      else walk(child);
    }
  };
  walk(value); return distinct(ids);
}

export const questionEdgeId = (id: string) => `question:${id}`;
function geography(item: HypothesisCase, sourceIds: string[]): InvestigationGeography[] {
  return item.geography.length ? item.geography.map(place => {
    const state = INVESTIGATION_REGISTRY.states.find(row => row.code === place.stateCode);
    return { scope: state ? 'state' : 'unknown', stateCodes: state ? [state.code] : [], localityIds: [], basis: state ? 'state-association' : 'unknown', note: `${place.label}: ${place.basis}. Case association only; this does not locate a person, payment or hypothesised activity.`, sourceIds };
  }) : [{ scope: 'unknown', stateCodes: [], localityIds: [], basis: 'unknown', note: 'No location established in the retained file.', sourceIds }];
}
const emptyRegistry = (): InvestigationRegistry => ({ updatedAt: HYPOTHESIS_BUNDLE.reviewDate, entities: [], relationships: [], records: [], sources: [], states: INVESTIGATION_REGISTRY.states, localities: [], held: [], coverage: [], methodology: ['Selected structural hypotheses, not discovered conspiracies or exhaustive administrative coverage.', 'Recorded assertions retain their source, financial stage, attribution and response.', 'Optional analytic questions are non-traversable, carry no amount and cannot bridge a factual money trail.', 'Institutional choices are retrospective alternatives; no secret intent, guilt probability or forecasting calibration is inferred.'] });

/** A closed, case-scoped graph. Analytic questions are absent unless explicitly requested. */
export function hypothesisCaseRegistry(item: HypothesisCase, options: { includeProposed?: boolean } = {}): InvestigationRegistry {
  const registry = emptyRegistry();
  const stream = HYPOTHESIS_STREAMS.find(row => row.cases.some(candidate => candidate.id === item.id));
  const namespace = `hypothesis-${stream?.track ?? 'case'}`;
  const sourceIds = new Set(hypothesisSourceIds(item));
  const entityIds = new Set([...item.entityIds, ...(item.decisionAnalysis?.actors.map(actor => actor.entityId) ?? [])]);
  const edges = item.edgeIds.map(id => HYPOTHESIS_EDGES.get(id)).filter((row): row is NonNullable<typeof row> => !!row);
  const dimensions = (sources: string[], layers: InvestigationLayer[] = ['review']) => ({ namespace, domains: [item.sector, 'governance'], layers, geography: geography(item, sources), route: '/hypothesis-lab', sourceIds: sources, limitations: ['A geographic case association is not a transaction address or evidence of coordination.'] });
  const record = (id: string, extra: Partial<InvestigationRecord>): InvestigationRecord => ({ ...dimensions(item.sourceIds), id, originalId: id, title: item.title, summary: item.finding, kind: 'hypothesis-file', tier: 'analytic', status: item.hypothesis.assessment, statusAsOf: HYPOTHESIS_BUNDLE.reviewDate, fromDate: exactDate(item.decisionAnalysis?.decisionDate ?? null), toDate: null, dateBasis: 'Retained decision date, not the date a hypothesis was formulated.', entityIds: [...item.entityIds], relationshipIds: [...item.edgeIds], period: item.period, response: item.hypothesis.assessmentReason, alternativeExplanations: item.hypothesis.alternatives.map(row => row.explanation), falsifier: item.hypothesis.tests.map(row => row.expectedIfAlternative).join('\n\n'), amounts: [], ...extra });
  registry.records.push(record(item.id, { sourceIds: hypothesisSourceIds(item), limitations: [...item.limits, ...item.hypothesis.inferenceLimits] }));
  for (const claim of item.claims) registry.records.push(record(claim.id, { title: claim.text, summary: claim.text, kind: 'attributed-proposition', tier: tier(claim.status), status: claim.status, sourceIds: claim.sourceIds, response: claim.response, alternativeExplanations: [claim.alternative], falsifier: claim.falsifier, limitations: claim.missingRecords }));
  for (const edge of edges) {
    entityIds.add(edge.from); entityIds.add(edge.to); edge.sourceIds.forEach(id => sourceIds.add(id));
    const responseId = `${edge.id}:response`;
    registry.relationships.push({ ...dimensions(edge.sourceIds, ['funding', 'review']), id: edge.id, originalId: edge.id, from: edge.from, to: edge.to, kind: edge.relation, label: edge.label, tier: tier(edge.status), status: `${edge.status} · ${edge.stage}`, statusAsOf: HYPOTHESIS_BUNDLE.reviewDate, fromDate: exactDate(edge.date), toDate: null, dateBasis: edge.date ?? 'Exact event date is not established.', summary: `${edge.label}. Financial / institutional stage: ${edge.stage}.${edge.amount ? ` Amount basis: ${edge.amount.basis}.` : ''}`, alternativeExplanations: item.claims.map(claim => claim.alternative), falsifier: item.claims.map(claim => claim.falsifier).join('\n\n'), responseIds: [responseId], recordIds: [item.id, responseId], amounts: edge.amount ? [{ value: edge.amount.value, currency: edge.amount.currency, unit: edge.amount.unit, stage: edge.stage, period: edge.amount.period }] : [], limitations: [...edge.limits] });
    registry.records.push(record(responseId, { title: `Response and qualification: ${edge.label}`, summary: edge.response, kind: 'response-and-qualification', tier: tier(edge.status), status: 'retained-response-or-explicit-gap', fromDate: null, entityIds: [edge.from, edge.to], relationshipIds: [edge.id], sourceIds: edge.sourceIds, response: edge.response, limitations: edge.limits, alternativeExplanations: [], falsifier: null }));
  }
  if (options.includeProposed) for (const link of item.hypothesis.proposedLinks) {
    entityIds.add(link.from); entityIds.add(link.to); link.sourceIds.forEach(id => sourceIds.add(id));
    const id = questionEdgeId(link.id), responseId = `${id}:response`;
    registry.relationships.push({ ...dimensions(link.sourceIds), id, originalId: link.id, from: link.from, to: link.to, kind: 'analytic', label: `QUESTION TO TEST: ${link.question}`, tier: 'analytic', status: 'unestablished-question · no recorded transfer', statusAsOf: HYPOTHESIS_BUNDLE.reviewDate, fromDate: null, toDate: null, dateBasis: 'Question formulated retrospectively; no event date is inferred.', summary: `Unproved link, not a recorded relationship. Missing evidence: ${link.missingEvidence}`, alternativeExplanations: item.hypothesis.alternatives.map(row => row.explanation), falsifier: link.disconfirmingEvidence, responseIds: [responseId], recordIds: [responseId], amounts: [], limitations: [link.missingEvidence, link.disconfirmingEvidence, 'Linked sources supply context for the question; they do not establish this connection. This analytic question cannot complete a source-backed path.'] });
    registry.records.push(record(responseId, { title: `Unestablished question: ${link.question}`, summary: link.missingEvidence, kind: 'analytic-question', tier: 'analytic', status: 'not-established', fromDate: null, entityIds: [link.from, link.to], relationshipIds: [id], sourceIds: link.sourceIds, response: `Disconfirming evidence: ${link.disconfirmingEvidence}`, falsifier: link.disconfirmingEvidence, limitations: ['Not a discovered conspiracy, attributed allegation or inferred transfer. Contextual citations do not establish the question as fact.'] }));
  }
  for (const id of entityIds) {
    const entity = HYPOTHESIS_ENTITIES.get(id); if (!entity) continue;
    entity.sourceIds.forEach(sourceId => sourceIds.add(sourceId));
    registry.entities.push({ ...dimensions(entity.sourceIds, [entity.kind === 'person' ? 'people' : 'organisations']), id, originalId: id, label: entity.label, type: entity.kind, resolved: entity.resolved === true, identityBasis: entity.identityBasis, summary: entity.identityBasis });
  }
  registry.sources = [...sourceIds].flatMap(id => {
    const source = HYPOTHESIS_SOURCES.get(id);
    return source ? [{ id, originalId: id, namespace, title: source.title, url: source.url, publisher: source.publisher, publishedAt: source.publishedAt, retrievedAt: source.accessedAt, locator: source.locator, summary: source.excerpt, tier: (['reporting', 'methods'].includes(source.kind) ? 'reported' : 'documented') as InvestigationTier, limitations: [...source.limitations, `Inspected: ${source.inspection}. Source family: ${source.sourceFamily}.`] }] : [];
  });
  return registry;
}

function combinedRegistry(): InvestigationRegistry {
  const result = emptyRegistry(), graphs = HYPOTHESIS_CASES.map(item => hypothesisCaseRegistry(item));
  const unique = <T extends { id: string },>(rows: T[]) => [...new Map(rows.map(row => [row.id, row])).values()];
  // Each graph closes its own response records; shared IDs remain one retained object.
  result.entities = unique(graphs.flatMap(graph => graph.entities));
  result.relationships = unique(graphs.flatMap(graph => graph.relationships));
  result.records = unique(graphs.flatMap(graph => graph.records));
  result.sources = unique(graphs.flatMap(graph => graph.sources));
  return result;
}
export const HYPOTHESIS_REGISTRY = combinedRegistry();

/** Exact original records and speculative questions stay in separate arrays. */
export function exportHypothesisCase(item: HypothesisCase) {
  const stream = HYPOTHESIS_STREAMS.find(row => row.cases.some(candidate => candidate.id === item.id));
  const graph = hypothesisCaseRegistry(item, { includeProposed: true });
  const rejectedJoins = stream?.rejectedJoins ?? [];
  const ids = distinct([...graph.sources.map(row => row.id), ...hypothesisSourceIds(rejectedJoins)]);
  const entityIds = distinct([...graph.entities.map(row => row.id), ...rejectedJoins.flatMap(row => [row.from, row.to]).filter(id => HYPOTHESIS_ENTITIES.has(id))]);
  for (const id of entityIds) ids.push(...(HYPOTHESIS_ENTITIES.get(id)?.sourceIds ?? []));
  const sourceIds = distinct(ids);
  return {
    schemaVersion: 1, reviewDate: HYPOTHESIS_BUNDLE.reviewDate, case: item,
    sources: sourceIds.map(id => HYPOTHESIS_SOURCES.get(id)).filter((row): row is NonNullable<typeof row> => !!row),
    entities: entityIds.map(id => HYPOTHESIS_ENTITIES.get(id)).filter((row): row is NonNullable<typeof row> => !!row),
    recordedEdges: item.edgeIds.map(id => HYPOTHESIS_EDGES.get(id)).filter((row): row is NonNullable<typeof row> => !!row),
    proposedLinks: item.hypothesis.proposedLinks,
    rejectedJoins, rejectedJoinsScope: 'Entire research track; these are not all claims about the selected case.',
    aggregateAmount: null, inferredCashFlow: false, outcomeProbabilities: null,
    interpretation: 'Recorded edges retain their exact attribution, financial stage and response. Proposed links are unproved questions, not facts or inferred cash flows. Retrospective hypotheses and institutional choices are not preregistered predictions or findings of private intent.',
  };
}
export const caseRegistry = hypothesisCaseRegistry;
export const exportPacket = exportHypothesisCase;
