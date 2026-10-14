import registryData from '../../research/research-radar/next-model/graph-data.json';
import runData from '../../research/research-radar/next-model/investigation-runs.json';
import statusData from '../../research/research-radar/next-model/ui-status.json';
import type { InvestigationEntity, InvestigationRelationship, InvestigationRecord, InvestigationSource } from './investigation';

export type LabRegistry = { schemaVersion: number; registryFingerprint: string; entities: InvestigationEntity[]; relationships: InvestigationRelationship[]; records: InvestigationRecord[]; sources: InvestigationSource[]; methodology: string[] };
export type LabRun = {
  id: string; query: string; ranking: { sourceId: string; score: number }[]; model: string; interpretation: string;
  trace?: {
    missingRecordQuestions: { id: string; question: string; neededRecord: string; holder: string; whyCurrentEvidenceStops: string; disconfirmationTest: string; sourceIds: string[]; priorityBasis: string }[];
    counterevidence: { recordId: string; response: string; alternativeExplanations: string[]; limitations: string[]; sourceIds: string[]; explicitResponseRecord: boolean; availableAtCutoff: boolean }[];
    temporalLimits: { historicalForecastEligible: false; mode: string; note: string };
  };
};
export type LabStatus = {
  status: string; completedAt: string | null; selectedModel: string; selectedConfiguration: string;
  corpusDocuments: number; trainingQueries: number; developmentQueries: number; testQueries: number; testFamilies: number;
  trainableParameters: number; epochs: number; promoted: boolean; defaultRetriever: string;
  adapterSha256: string; evaluationSha256: string;
  comparisons: { id: string; label: string; ndcgAt5: number; recallAt5: number; counterevidenceRecallAt5: number | null }[];
  failedCriteria: string[]; limitations: string[];
  trainingRuns: { model: string; epochs: number; trainableParameters: number; seconds: number; adapterSha256: string }[];
};
export const LAB_GRAPH = registryData as unknown as LabRegistry;
export const LAB_RUNS = (runData as unknown as { runs: LabRun[] }).runs;
export const LAB_STATUS = statusData as unknown as LabStatus;
export const labSources = new Map(LAB_GRAPH.sources.map(row => [row.id, row]));
export const labEntities = new Map(LAB_GRAPH.entities.map(row => [row.id, row]));
export const labEdges = new Map(LAB_GRAPH.relationships.map(row => [row.id, row]));

/** Evidence browsing only. Shared identifiers expand context; no inferred edges or payments. */
export function sourceNeighborhood(sourceId: string, depth: number, focusEntity?: string) {
  const selected = new Map<string, InvestigationRelationship>();
  const entityIds = new Set<string>();
  if (focusEntity && labEntities.has(focusEntity)) entityIds.add(focusEntity);
  else {
    for (const edge of LAB_GRAPH.relationships) if (edge.sourceIds.includes(sourceId)) {
      selected.set(edge.id, edge); entityIds.add(edge.from); entityIds.add(edge.to);
    }
    for (const entity of LAB_GRAPH.entities) if (entity.sourceIds.includes(sourceId)) entityIds.add(entity.id);
  }
  for (let step = 0; step < Math.max(0, Math.min(2, depth - (focusEntity ? 0 : 1))); step++) {
    const frontier = new Set(entityIds);
    for (const edge of LAB_GRAPH.relationships) if (frontier.has(edge.from) || frontier.has(edge.to)) {
      selected.set(edge.id, edge); entityIds.add(edge.from); entityIds.add(edge.to);
    }
  }
  const relationships = [...selected.values()].sort((a, b) => a.id.localeCompare(b.id));
  const entities = [...entityIds].map(id => labEntities.get(id)).filter((row): row is InvestigationEntity => !!row);
  const responseIds = new Set(relationships.flatMap(row => row.responseIds));
  const recordIds = new Set(relationships.flatMap(row => row.recordIds));
  const records = LAB_GRAPH.records.filter(row => recordIds.has(row.id) || responseIds.has(row.id) || row.sourceIds.includes(sourceId));
  const sourceIds = new Set([sourceId, ...[...relationships, ...entities, ...records].flatMap(row => [...row.sourceIds, ...row.geography.flatMap(geo => geo.sourceIds)])]);
  const sources = LAB_GRAPH.sources.filter(row => sourceIds.has(row.id));
  return { entities, relationships, records, sources, inferredCashFlow: false as const };
}

export function stateAssociations(entities: InvestigationEntity[]) {
  const groups = new Map<string, InvestigationEntity[]>();
  for (const entity of entities) for (const code of new Set(entity.geography.flatMap(geo => geo.stateCodes))) groups.set(code, [...(groups.get(code) ?? []), entity]);
  return groups;
}
