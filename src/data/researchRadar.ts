import north from '../../research/raw/research-radar/north.json';
import west from '../../research/raw/research-radar/west.json';
import southEast from '../../research/raw/research-radar/south-east.json';
import coverage from '../../research/raw/research-radar/coverage.json';
import national from '../../research/raw/research-radar/national.json';

export const RADAR_CUTOFF = '2026-10-07';
export const RADAR_RECENT_SINCE = '2026-07-07';
export const RADAR_FORECAST_STATUS = 'untrained-uncalibrated' as const;
export const RADAR_STATUS_LABELS = { 'documented-development': 'Documented development', 'audit-finding': 'Audit finding', 'reported-allegation': 'Reported allegation', 'open-question': 'Open question' } as const;
export type RadarStatus = keyof typeof RADAR_STATUS_LABELS;
export interface RadarSource {
  id: string; title: string; url: string; publisher: string; publishedAt: string | null; retrievedAt: string; family: string;
  kind: 'official' | 'judicial' | 'corporate' | 'news' | 'dataset' | 'methodology'; summary: string; locator: string;
  limitations: string[]; access: 'full-text' | 'original-file' | 'indexed-extract' | 'unavailable';
}
export interface RadarEvidenceStatement { text: string; sourceIds: string[] }
export interface RadarEntity { id: string; label: string; kind: 'institution' | 'company' | 'public-official' | 'project' | 'policy' | 'source-mention'; role: string; sourceIds: string[] }
export interface RadarLink { id: string; from: string; to: string; kind: 'contract' | 'payment' | 'ownership' | 'oversight' | 'policy' | 'appointment' | 'allegation'; label: string; sourceIds: string[]; status: 'documented' | 'reported' | 'alleged' }
export interface RadarScenario {
  target: string; horizonDays: number; evaluationAt: string; baseline: string; triggers: string[]; alternatives: string[]; falsifiers: string[];
  probability: null; probabilityReason: string; requiredData: string[];
}
export interface RadarCase {
  id: string; title: string; cityIds: string[]; stateCodes: string[]; sectors: string[]; question: string; summary: string; status: RadarStatus;
  sourceIds: string[]; observations: RadarEvidenceStatement[]; counterevidence: RadarEvidenceStatement[];
  nextRecords: { record: string; holder: string; purpose: string }[]; entities: RadarEntity[]; links: RadarLink[]; scenario: RadarScenario; updatedAt: string;
}
export interface RadarActor {
  id: string; label: string; kind: string; identityNote: string; sourceIds: string[];
  timeline: { date: string; label: string; category: 'office' | 'decision' | 'allegation' | 'response' | 'judicial-outcome' | 'corporate-role'; sourceIds: string[]; outcome: string; limitations: string[] }[];
}
export interface RadarSearchLog { query: string; tool: string; requestedResults: number; inspectedUrls: string[]; notes: string }
export interface RadarRegion { schemaVersion: 1; region: string; cutoff: string; searchLog: RadarSearchLog[]; sources: RadarSource[]; cases: RadarCase[]; actors: RadarActor[] }
export interface RadarCity { id: string; label: string; stateCodes: string[]; latitude: number; longitude: number; role: string | string[]; sectors: string[]; notes: string | string[]; capitalFor?: string[]; coordinateBasis?: string; sourceIds?: string[] }
export interface RadarCoverageDocument { schemaVersion: 1; cutoff: string; cities: RadarCity[]; geographySources?: RadarSource[] }
export interface RadarFilters { cityId?: string; stateCode?: string; sector?: string; status?: RadarStatus | 'all'; recency?: 'all' | 'latest-window'; query?: string }

export const RADAR_REGIONS = [north, west, southEast, national] as unknown as RadarRegion[];
export const RESEARCH_RADAR_DATA = {
  schemaVersion: 1 as const, cutoff: RADAR_CUTOFF, recentSince: RADAR_RECENT_SINCE, forecastStatus: RADAR_FORECAST_STATUS,
  regions: RADAR_REGIONS.map(region => region.region), sources: RADAR_REGIONS.flatMap(region => region.sources),
  cases: RADAR_REGIONS.flatMap(region => region.cases), actors: RADAR_REGIONS.flatMap(region => region.actors),
  searchLog: RADAR_REGIONS.flatMap(region => region.searchLog),
};
export const RADAR_COVERAGE = coverage as unknown as RadarCoverageDocument;
export const RADAR_CITIES = RADAR_COVERAGE.cities;
/** Editorial facet aliases only; original research tags and exported text are unchanged. */
export const RADAR_SECTOR_ALIASES: Record<string, string> = { power: 'energy', schools: 'education', courts: 'justice', law: 'justice', 'government-administration': 'administration', 'natural-resources': 'resources', ports: 'infrastructure', 'roads-infrastructure': 'infrastructure', 'consumer-welfare': 'welfare', 'public-finance': 'public-funds' };
export const normalizeRadarSector = (sector: string) => RADAR_SECTOR_ALIASES[sector] ?? sector;
export const RADAR_SECTORS = [...new Set([...RADAR_CITIES.flatMap(city => city.sectors), ...RESEARCH_RADAR_DATA.cases.flatMap(row => row.sectors)].map(normalizeRadarSector))].sort();
const sources = new Map(RESEARCH_RADAR_DATA.sources.map(row => [row.id, row]));
const cases = new Map(RESEARCH_RADAR_DATA.cases.map(row => [row.id, row]));
export const radarSourceById = (id: string) => sources.get(id);
export const radarCaseById = (id: string) => cases.get(id);
export function caseHasRecentSource(caseOrId: RadarCase | string) {
  const row = typeof caseOrId === 'string' ? radarCaseById(caseOrId) : caseOrId;
  return !!row?.sourceIds.some(id => { const date = radarSourceById(id)?.publishedAt; return !!date && date >= RADAR_RECENT_SINCE && date <= RADAR_CUTOFF; });
}
export function filterRadarCases(filters: RadarFilters = {}): RadarCase[] {
  const query = (filters.query ?? '').trim().toLocaleLowerCase();
  return RESEARCH_RADAR_DATA.cases.filter(row => {
    if (filters.cityId && filters.cityId !== 'all' && !row.cityIds.includes(filters.cityId)) return false;
    if (filters.stateCode && filters.stateCode !== 'all' && !row.stateCodes.includes(filters.stateCode)) return false;
    if (filters.sector && filters.sector !== 'all' && !row.sectors.some(sector => normalizeRadarSector(sector) === normalizeRadarSector(filters.sector!))) return false;
    if (filters.status && filters.status !== 'all' && row.status !== filters.status) return false;
    if (filters.recency === 'latest-window' && !caseHasRecentSource(row)) return false;
    if (!query) return true;
    const haystack = [row.title, row.question, row.summary, ...row.sectors, ...row.entities.map(entity => entity.label), ...row.observations.map(item => item.text), ...row.counterevidence.map(item => item.text), ...row.sourceIds.flatMap(id => { const source = radarSourceById(id); return source ? [source.title, source.publisher] : []; })].join(' ').toLocaleLowerCase();
    return haystack.includes(query);
  });
}
/** Only authored links are returned; shared words, city, source or office do not add an edge. */
export function buildRadarCaseGraph(caseId: string) {
  const row = radarCaseById(caseId);
  return { caseId, entities: row?.entities ?? [], links: row?.links ?? [], interpretation: 'Authored, sourced relationships only. Contract, ownership, office and oversight links are not payments or evidence of collusion.' };
}
export function getRadarCoverage(filters: RadarFilters = {}) {
  const selected = filterRadarCases(filters);
  const scopedCities = RADAR_CITIES.filter(city => (!filters.cityId || filters.cityId === 'all' || city.id === filters.cityId) && (!filters.stateCode || filters.stateCode === 'all' || city.stateCodes.includes(filters.stateCode)));
  const cities = scopedCities.map(city => {
    const rows = selected.filter(row => row.cityIds.includes(city.id));
    return { ...city, caseCount: rows.length, sourceCount: new Set(rows.flatMap(row => row.sourceIds)).size, caseIds: rows.map(row => row.id), status: rows.length ? 'researched' as const : 'unresearched' as const };
  });
  return { cities, plannedCities: cities.length, coveredCities: cities.filter(city => city.caseCount > 0).length, unresearchedCities: cities.filter(city => city.caseCount === 0).length, caseCount: selected.length, sourceCount: new Set(selected.flatMap(row => row.sourceIds)).size,
    interpretation: 'Research coverage counts retained dossiers in the selected scope. An empty city is unresearched here, not free of problems; one dossier is not comprehensive coverage.' };
}
/** Actor proximity here is source co-reference, not an entity-resolution or money-flow claim. */
export function getRadarRelatedActors(caseId: string) {
  const row = radarCaseById(caseId);
  if (!row) return [];
  const ids = new Set(row.sourceIds);
  return RESEARCH_RADAR_DATA.actors.filter(actor => actor.sourceIds.some(id => ids.has(id)));
}
export function exportRadarCase(caseId: string) {
  const row = radarCaseById(caseId);
  if (!row) return null;
  const actors = getRadarRelatedActors(caseId);
  const ids = new Set([...row.sourceIds, ...row.observations.flatMap(item => item.sourceIds), ...row.counterevidence.flatMap(item => item.sourceIds), ...row.entities.flatMap(item => item.sourceIds), ...row.links.flatMap(item => item.sourceIds), ...actors.flatMap(actor => [...actor.sourceIds, ...actor.timeline.flatMap(item => item.sourceIds)])]);
  return { schemaVersion: 1, cutoff: RADAR_CUTOFF, forecastStatus: RADAR_FORECAST_STATUS, case: row, sources: [...ids].flatMap(id => { const source = sources.get(id); return source ? [source] : []; }), actors, actorAssociationBasis: 'shared-source-reference', missingSourceIds: [...ids].filter(id => !sources.has(id)), graph: buildRadarCaseGraph(caseId),
    interpretation: 'Complete authored evidence, counterevidence and provenance. Scenarios are uncalibrated research questions; no probability of corruption or guilt is assigned.' };
}
