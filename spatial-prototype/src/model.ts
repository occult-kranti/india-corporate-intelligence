import { sourceCorrection, presentationTitle, presentationSummary } from './sourceCorrections';
import registryData from './registry.json';
import type {
  InvestigationEntity, InvestigationLayer, InvestigationRecord,
  InvestigationRegistry, InvestigationRelationship,
} from './domain';

export type EvidenceItem = InvestigationEntity | InvestigationRelationship | InvestigationRecord;
export interface SceneNode {
  id: string;
  kind: 'entity' | 'record';
  item: InvestigationEntity | InvestigationRecord;
  title: string;
  position: [number, number, number];
  /** Narrative layout zone, or "unplaced" before projection; never a geolocation. */
  cluster: string;
}
export interface SceneEdge {
  id: string;
  relationship: InvestigationRelationship;
  from: string;
  to: string;
  /** Exact count of distinct cited source IDs, not a confidence or guilt score. */
  sourceCount: number;
}
export interface SceneCluster {
  id: string;
  label: string;
  position: [number, number, number];
  color: string;
}
export interface SceneFilters {
  query?: string;
  /** Exact source-corpus namespace. Original cross-corpus endpoints stay available as context. */
  namespace?: string;
  layers?: InvestigationLayer[];
  fromYear?: number;
  toYear?: number;
  /** Controls evidence with no usable event date at either bound. Default true. */
  includeUndated?: boolean;
}
export interface PreviewData {
  nodes: SceneNode[];
  edges: SceneEdge[];
  /** The complete input registry stays available while the scene is filtered. */
  registry: InvestigationRegistry;
  clusters: SceneCluster[];
  layers: { value: InvestigationLayer; label: string }[];
  yearRange: [number, number];
  caveat: string;
}

export const registry = registryData as InvestigationRegistry;
export const LAYERS: PreviewData['layers'] = [
  { value: 'people', label: 'People & office' },
  { value: 'organisations', label: 'Organisations' },
  { value: 'funding', label: 'Funding & debt' },
  { value: 'procurement', label: 'Contracts & work' },
  { value: 'legal', label: 'Cases & judgments' },
  { value: 'welfare', label: 'Welfare programmes' },
  { value: 'services', label: 'Public services' },
  { value: 'policy', label: 'Rules & policy' },
  { value: 'review', label: 'Review questions' },
];
export const PREVIEW_CAVEAT = 'Source-preserving preview: 36 entities, 33 sourced relationships, 12 records. Positions are layout zones, not geospatial coordinates or money destinations. Proximity is not evidence. Line thickness is capped by distinct cited source count, not confidence, importance or guilt.';
export const CLUSTERS: SceneCluster[] = [
  { id: 'india', label: 'INDIA · CASE CONTEXT', position: [2, 0.04, 3], color: '#d9ad70' },
  { id: 'bangladesh', label: 'BANGLADESH · PROJECT CONTEXT', position: [21, 0.04, -8], color: '#89b4ad' },
  { id: 'spain', label: 'SPAIN · C295 CONTEXT', position: [-22, 0.04, -9], color: '#a3b8cd' },
  { id: 'institutions', label: 'MULTILATERAL · CONTEXT', position: [-18, 0.04, 8], color: '#b8a5c6' },
];

const multilateral = new Set(['ibrd', 'ifc', 'adb', 'aiib', 'ida', 'imf']);
const bangladesh = new Set(['bangladesh', 'ban-loan3853', 'pgcb', 'lt', 'ban-package3', 'bangladesh-adb-response', 'bangladesh-adb-lt']);
/** Explicit case organization, separate from the original untouched geography. */
export function clusterFor(item: InvestigationEntity | InvestigationRecord): string {
  if (item.namespace === 'atlas-international-finance') {
    if (multilateral.has(item.originalId) || item.originalId.startsWith('imf-')) return 'institutions';
    if (bangladesh.has(item.originalId)) return 'bangladesh';
    return 'india';
  }
  if (item.namespace === 'atlas-defence-trade' && ['spain', 'airbus', 'c295-spain-india', 'c295-delivery-boundary'].includes(item.originalId)) return 'spain';
  return 'india';
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return hash >>> 0;
}

/** Capped rendering multiplier. The uncapped exact count remains on SceneEdge. */
export function strength(item: { sourceIds: string[] } | SceneEdge | number): number {
  const count = typeof item === 'number' ? item : 'sourceCount' in item ? item.sourceCount : new Set(item.sourceIds).size;
  return Math.max(1, Math.min(5, Number.isFinite(count) ? count : 0));
}

/** All positions are deterministic display coordinates on an approximately 60 × 36 board. */
export function buildPreview(): PreviewData {
  const items: { kind: 'entity' | 'record'; item: InvestigationEntity | InvestigationRecord }[] = [
    ...registry.entities.map(item => ({ kind: 'entity' as const, item })),
    ...registry.records.map(item => ({ kind: 'record' as const, item })),
  ];
  const nodes: SceneNode[] = [];
  for (const cluster of CLUSTERS) {
    const rows = items.filter(row => clusterFor(row.item) === cluster.id);
    const columns = cluster.id === 'india' ? 5 : cluster.id === 'spain' ? 2 : 3;
    const spacingX = cluster.id === 'india' ? 4 : 3.8;
    const spacingZ = cluster.id === 'india' ? 3.25 : 3.8;
    const rowCount = Math.ceil(rows.length / columns);
    rows.forEach(({ kind, item }, index) => {
      const x = cluster.position[0] + (index % columns - (columns - 1) / 2) * spacingX;
      const z = cluster.position[2] + (Math.floor(index / columns) - (rowCount - 1) / 2) * spacingZ;
      // Elevation is only a stable visual treatment, unrelated to evidence tier.
      const y = kind === 'record' ? 0.28 : 0.52 + (stableHash(item.id) % 4) * 0.14;
      nodes.push({ id: item.id, kind, item, title: 'title' in item ? item.title : item.label, position: [x, y, z], cluster: cluster.id });
    });
  }
  const ids = new Set(nodes.map(node => node.id));
  const edges = registry.relationships.filter(relationship => ids.has(relationship.from) && ids.has(relationship.to)).map(relationship => ({
    id: relationship.id, relationship, from: relationship.from, to: relationship.to,
    sourceCount: new Set(relationship.sourceIds).size,
  }));
  const years = [...registry.records, ...registry.relationships].flatMap(item => [eventYear(item.fromDate), eventYear(item.toDate)]).filter((year): year is number => year !== null);
  return {
    nodes, edges, registry,
    clusters: CLUSTERS.map(cluster => ({ ...cluster, position: [...cluster.position] })),
    layers: LAYERS.map(layer => ({ ...layer })),
    yearRange: [Math.min(...years), Math.max(...years)],
    caveat: PREVIEW_CAVEAT,
  };
}
export const getPreview = buildPreview;

/** Adapt the complete registry without selecting, cloning or rewriting evidence.
 * Positions are deliberately identical non-geographic placeholders. Geographic
 * projection must read each item's retained geography; no label-based placement,
 * narrative cluster, membership edge or inferred relationship is introduced here.
 */
export function buildEvidenceScene(input: InvestigationRegistry): PreviewData {
  const nodes: SceneNode[] = [
    ...input.entities.map(item => ({
      id: item.id, kind: 'entity' as const, item, title: presentationTitle(item),
      position: [0, 0, 0] as [number, number, number], cluster: 'unplaced',
    })),
    ...input.records.map(item => ({
      id: item.id, kind: 'record' as const, item, title: presentationTitle(item),
      position: [0, 0, 0] as [number, number, number], cluster: 'unplaced',
    })),
  ];
  const edges = input.relationships.map(relationship => ({
    id: relationship.id, relationship, from: relationship.from, to: relationship.to,
    sourceCount: new Set(relationship.sourceIds).size,
  }));
  const years = [...input.records, ...input.relationships]
    .flatMap(item => [eventYear(item.fromDate), eventYear(item.toDate)])
    .filter((year): year is number => year !== null);
  return {
    nodes, edges, registry: input, clusters: [],
    layers: LAYERS.map(layer => ({ ...layer })),
    // [0, 0] is the empty-range sentinel, never a substituted event date.
    yearRange: years.length ? [Math.min(...years), Math.max(...years)] : [0, 0],
    caveat: `Complete source-preserving registry: ${input.entities.length} entities, ${input.relationships.length} directed relationships, ${input.records.length} records, ${input.sources.length} sources and ${input.held.length} held entries. Positions are non-geographic placeholders; only retained source geography can support map placement. Held and not-drawn evidence is excluded from factual marks but remains available in the reader. Relationships retain their original direction, status, tier and limitations; visibility is not a finding of wrongdoing.`,
  };
}

// Registry inputs are immutable source snapshots. Cache derived IDs without
// modifying their rows or keeping abandoned/retried registry snapshots alive.
const heldIdsByRegistry = new WeakMap<InvestigationRegistry, Set<string>>();
function heldIdsFor(input: InvestigationRegistry): Set<string> {
  let ids = heldIdsByRegistry.get(input);
  if (!ids) {
    ids = new Set(input.held.map(item => item.id));
    heldIdsByRegistry.set(input, ids);
  }
  return ids;
}

/** Constant-time lookup, including held IDs absent from scene evidence. */
export function isHeldItem(input: InvestigationRegistry, id: string): boolean {
  return heldIdsFor(input).has(id) || !!sourceCorrection(id);
}

/** A drawable evidence subset, not an upgrade of any record's evidentiary tier.
 * Preserve the complete registry (including held context) for inspection while
 * excluding held/not-drawn marks and any edge whose endpoint cannot be drawn.
 */
export function factualScene(scene: PreviewData): PreviewData {
  const heldIds = heldIdsFor(scene.registry);
  const nodes = scene.nodes.filter(node => !heldIds.has(node.id) && !sourceCorrection(node.id)
    && !('status' in node.item && node.item.status === 'not-drawn'));
  const visibleIds = new Set(nodes.map(node => node.id));
  const edges = scene.edges.filter(edge => !heldIds.has(edge.id) && !sourceCorrection(edge.id)
    && edge.relationship.status !== 'not-drawn'
    && visibleIds.has(edge.from) && visibleIds.has(edge.to));
  return { ...scene, nodes, edges };
}

/** Only exact, real calendar event dates are eligible; status/publication dates never substitute. */
export function eventYear(value: string | null | undefined): number | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return null;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== value) return null;
  return Number(value.slice(0, 4));
}

/** Inclusive interval overlap. A single known bound is used as the retained known date,
 * matching the original registry matcher; no start/end date is invented for a null bound.
 */
export function matchesYearRange(item: { fromDate?: string | null; toDate?: string | null }, filters: SceneFilters = {}): boolean {
  const { fromYear, toYear } = filters;
  if ((fromYear !== undefined && !Number.isInteger(fromYear)) || (toYear !== undefined && !Number.isInteger(toYear))) return false;
  if (fromYear !== undefined && toYear !== undefined && fromYear > toYear) return false;
  const start = eventYear(item.fromDate), end = eventYear(item.toDate);
  if (start === null && end === null) return filters.includeUndated !== false;
  return !(fromYear !== undefined && (end ?? start)! < fromYear || toYear !== undefined && (start ?? end)! > toYear);
}

const normalized = (text: string) => text.normalize('NFKC').toLocaleLowerCase('en-IN').trim();
/** Filtering never mutates evidence or layout, and never creates connectivity.
 * Entity labels are timeless context: a timeline retains them only when connected
 * to eligible evidence, or when they have no temporal evidence and undated is enabled.
 */
export function filterScene(preview: PreviewData, filters: SceneFilters = {}): PreviewData {
  const terms = normalized(filters.query ?? '').split(/\s+/u).filter(Boolean);
  const entities = new Map(preview.registry.entities.map(entity => [entity.id, entity]));
  const sources = new Map(preview.registry.sources.map(source => [source.id, source]));
  const layerMatches = (item: EvidenceItem) => (!filters.namespace || item.namespace === filters.namespace)
    && (!filters.layers?.length || filters.layers.some(layer => item.layers.includes(layer)));
  const queryMatches = (item: EvidenceItem) => {
    if (!terms.length) return true;
    const endpointIds = 'entityIds' in item ? item.entityIds : 'from' in item ? [item.from, item.to] : [];
    const text = normalized([item.id, presentationTitle(item), presentationSummary(item),
      ...endpointIds.map(id => entities.get(id)?.label ?? ''), ...item.sourceIds.map(id => sources.get(id)?.title ?? ''),
    ].join(' '));
    return terms.every(term => text.includes(term));
  };
  const eligible = (item: InvestigationRecord | InvestigationRelationship) => layerMatches(item) && queryMatches(item) && matchesYearRange(item, filters);
  // Only marks in the input scene may supply matching/temporal context. In
  // particular, held records retained in the reader must never re-enter a
  // factual scene indirectly by making their entity endpoints match a query.
  const sceneRecords = preview.nodes.flatMap(node => node.kind === 'record' ? [node.item as InvestigationRecord] : []);
  const sceneRelationships = preview.edges.map(edge => edge.relationship);
  const records = sceneRecords.filter(eligible);
  const relationships = sceneRelationships.filter(eligible);
  const referenced = new Set([
    ...records.flatMap(record => record.entityIds),
    ...relationships.flatMap(relationship => [relationship.from, relationship.to]),
  ]);
  const anyTemporalContext = new Set([
    ...sceneRecords.flatMap(record => record.entityIds),
    ...sceneRelationships.flatMap(relationship => [relationship.from, relationship.to]),
  ]);
  // An entity's own ID/name can match independently of the wording in its
  // evidence. Date eligibility must not also require that evidence to repeat
  // the search term. Read only the supplied scene, so held context cannot leak
  // into a factual search through this temporal index.
  const eligibleTemporalContext = new Set([
    ...sceneRecords.filter(item => matchesYearRange(item, filters)).flatMap(item => item.entityIds),
    ...sceneRelationships.filter(item => matchesYearRange(item, filters)).flatMap(item => [item.from, item.to]),
  ]);
  const hasTemporalFilter = filters.fromYear !== undefined || filters.toYear !== undefined || filters.includeUndated === false;
  const eligibleRecordIds = new Set(records.map(record => record.id));
  const nodes = preview.nodes.filter(node => node.kind === 'record'
    ? eligibleRecordIds.has(node.id)
    : referenced.has(node.id) || (layerMatches(node.item) && queryMatches(node.item) && (!hasTemporalFilter || eligibleTemporalContext.has(node.id) || !anyTemporalContext.has(node.id) && filters.includeUndated !== false)));
  const visibleIds = new Set(nodes.map(node => node.id));
  const eligibleRelationshipIds = new Set(relationships.map(relationship => relationship.id));
  const edges = preview.edges.filter(edge => eligibleRelationshipIds.has(edge.id) && visibleIds.has(edge.from) && visibleIds.has(edge.to));
  return { ...preview, nodes, edges };
}
