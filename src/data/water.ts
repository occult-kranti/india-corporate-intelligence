import research from './water-research.json';

export type WaterDomain = 'drinking-water' | 'groundwater' | 'weather' | 'tenders' | 'farming' | 'food';
export type WaterStage = 'seed' | 'input' | 'irrigation' | 'growing' | 'harvest' | 'market' | 'storage' | 'distribution';
export type WaterScope = 'national' | 'multi-state' | 'state' | 'district' | 'city' | 'village' | 'block';
export type WaterSourceType = 'document' | 'portal' | 'news' | 'dataset' | 'discussion';
export type WaterWindowStatus = 'in-window' | 'background' | 'undated';
export type WaterMeasure = 'household-connections' | 'supply-functionality' | 'supply-regularity' | 'supply-quantity' | 'water-quality' | 'groundwater-extraction' | 'groundwater-resource' | 'rainfall' | 'drought-declaration' | 'tender-estimate' | 'contract-award' | 'payment' | 'crop-production' | 'market-arrivals' | 'crop-loss' | 'storage-capacity' | 'other';
export interface WaterState { code: string; name: string }
export interface WaterLocality { id: string; name: string; stateCode: string; kind: 'district' | 'city' | 'village' | 'block'; districtName?: string; aliases?: string[] }
export interface WaterDimensions {
  scope: WaterScope; stateCodes: string[]; localityIds: string[];
  domains: WaterDomain[]; stages: WaterStage[];
}
export interface WaterSource extends WaterDimensions {
  id: string; title: string; url: string; publisher: string; publishedAt: string | null;
  period: string; retrievedAt: string; type: WaterSourceType;
  tier: 'primary' | 'reported' | 'self-reported'; summary: string; limitations: string[];
  windowStatus: WaterWindowStatus; geographicLabel?: string; retrievalStatus?: string; locator?: string;
  isForecast?: boolean; issuedAt?: string; validFrom?: string; validUntil?: string;
}
export interface WaterObservation extends WaterDimensions {
  id: string; label: string; title: string; summary: string; value: number; unit: string;
  measure: WaterMeasure; period: string; sourceIds: string[]; limitations: string[];
  accountingStage?: 'estimate' | 'award' | 'payment' | 'allocation' | 'release' | 'expenditure';
  denominator?: number; denominatorLabel?: string; asOf?: string;
}
export interface WaterDiscovery extends WaterDimensions {
  id: string; title: string; summary: string; url: string; sourceIds: string[];
  steps: string[]; availableGrains: ('national' | 'state' | 'district' | 'city' | 'village' | 'block' | 'station' | 'project' | 'market')[];
  limitations: string[];
}
export interface WaterLead extends WaterDimensions {
  id: string; title: string; summary: string; signal: string; attribution: string;
  alternativeExplanations: string[]; falsifier: string; sourceIds: string[];
  status: 'investigate' | 'context'; kind: 'source-finding' | 'analytic-question' | 'methodology';
}
export interface WaterFilters {
  stateCode?: string; place?: string; q?: string; domain?: WaterDomain; stage?: WaterStage;
  type?: WaterSourceType; windowStatus?: WaterWindowStatus;
}
export interface WaterDataset {
  updatedAt: string; window: { start: string; end: string }; methodology: string[]; coverageNotes: string[];
  states: WaterState[]; localities: WaterLocality[]; sources: WaterSource[];
  observations: WaterObservation[]; discovery: WaterDiscovery[]; leads: WaterLead[];
}
const data = research as WaterDataset;
export const WATER_UPDATED_AT = data.updatedAt;
export const WATER_WINDOW = data.window;
export const WATER_METHODOLOGY = data.methodology;
export const WATER_COVERAGE_NOTES = data.coverageNotes;
export const WATER_STATES = data.states;
export const WATER_LOCALITIES = data.localities;
export const WATER_SOURCES = data.sources;
export const WATER_OBSERVATIONS = data.observations;
export const WATER_DISCOVERY = data.discovery;
export const WATER_LEADS = data.leads;
export const WATER_DOMAINS: {value:WaterDomain;label:string}[] = [
  {value:'drinking-water',label:'Drinking water'}, {value:'groundwater',label:'Groundwater'},
  {value:'weather',label:'Weather & hazards'}, {value:'tenders',label:'Tenders & delivery'},
  {value:'farming',label:'Farming'}, {value:'food',label:'Food systems'},
];
export const WATER_STAGES: {value:WaterStage;label:string}[] = [
  {value:'seed',label:'Seeds'}, {value:'input',label:'Farm inputs'},
  {value:'irrigation',label:'Irrigation'}, {value:'growing',label:'Crop growth'},
  {value:'harvest',label:'Harvest'}, {value:'market',label:'Markets'},
  {value:'storage',label:'Storage'}, {value:'distribution',label:'Distribution'},
];
export const WATER_SOURCE_TYPES: {value:WaterSourceType;label:string}[] = [
  {value:'document',label:'Documents'}, {value:'dataset',label:'Data'}, {value:'news',label:'News'},
  {value:'portal',label:'Official portals'}, {value:'discussion',label:'Attributed discussion'},
];

const normalize = (value: string) => value.normalize('NFKC').toLocaleLowerCase('en-IN').trim();
type Searchable = WaterDimensions & { title: string; summary: string; publisher?: string; geographicLabel?: string };
export function matchesWaterFilters(item: Searchable, filters: WaterFilters = {}) {
  if (filters.stateCode && !WATER_STATES.some(state => state.code === filters.stateCode)) return false;
  if (filters.stateCode && item.scope !== 'national' && !item.stateCodes.includes(filters.stateCode)) return false;
  if (filters.domain && !item.domains.includes(filters.domain)) return false;
  if (filters.stage && !item.stages.includes(filters.stage)) return false;
  const namedPlaces = WATER_LOCALITIES.filter(place => item.localityIds.includes(place.id));
  const places = namedPlaces.flatMap(place => [place.name,...place.aliases??[]]);
  const states = WATER_STATES.filter(state => item.stateCodes.includes(state.code)).map(state => state.name);
  const haystack = normalize([item.title,item.summary,item.publisher ?? '',item.geographicLabel ?? '',...places,...states].join(' '));
  if (filters.q?.trim() && !normalize(filters.q).split(/\s+/u).every(word => haystack.includes(word))) return false;
  if (filters.place?.trim()) {
    // A publisher address or the generic word "mandi" is not evidence of a local event.
    const candidates = namedPlaces.filter(place => !filters.stateCode || place.stateCode === filters.stateCode)
      .map(place => normalize([place.name,place.districtName ?? '',...place.aliases??[]].join(' ')));
    const words = normalize(filters.place).split(/\s+/u);
    if (!candidates.some(candidate => words.every(word => candidate.includes(word)))) return false;
  }
  return true;
}
function matchesSourceMetadata(source: WaterSource, filters: WaterFilters) {
  return (!filters.type || source.type === filters.type) && (!filters.windowStatus || source.windowStatus === filters.windowStatus);
}
function matchesLinkedMetadata(item: {sourceIds:string[]}, filters: WaterFilters) {
  return item.sourceIds.some(id => {
    const source = WATER_SOURCES.find(candidate => candidate.id === id);
    return source && matchesSourceMetadata(source, filters);
  });
}
export const getWaterSources = (filters:WaterFilters = {}) => WATER_SOURCES.filter(item => matchesWaterFilters(item, filters) && matchesSourceMetadata(item, filters));
export const getWaterObservations = (filters:WaterFilters = {}) => WATER_OBSERVATIONS.filter(item => matchesWaterFilters(item, filters) && matchesLinkedMetadata(item, filters));
export const getWaterLeads = (filters:WaterFilters = {}) => WATER_LEADS.filter(item => matchesWaterFilters(item, filters) && matchesLinkedMetadata(item, filters));
/** Discovery tools are retrieval routes, not matching local evidence. Keep them available for an unknown village. */
export const getWaterDiscovery = (filters:WaterFilters = {}) => WATER_DISCOVERY.filter(item => matchesWaterFilters(item, {stateCode:filters.stateCode,domain:filters.domain,stage:filters.stage}));

/** Classify the original publication date, not retrieval time or the period being described. */
export function classifyWaterWindow(publishedAt: string | null, window = WATER_WINDOW): WaterWindowStatus {
  if (!publishedAt || !/^\d{4}-\d{2}(?:-\d{2})?$/u.test(publishedAt)) return 'undated';
  const normalizedDate = publishedAt.length === 7 ? `${publishedAt}-01` : publishedAt;
  const parsed = Date.parse(`${normalizedDate}T00:00:00Z`);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0,10) !== normalizedDate) return 'undated';
  // A month-only date on a boundary month cannot establish inclusion in an exact-day window.
  if (publishedAt.length === 7 && (publishedAt === window.start.slice(0,7) || publishedAt === window.end.slice(0,7))) return 'undated';
  const date = normalizedDate;
  return date >= window.start && date <= window.end ? 'in-window' : 'background';
}

/** Snapshot status is not a live alert. Forecasts without a stated validity interval remain unverified. */
export function getForecastStatus(source: Pick<WaterSource,'isForecast'|'issuedAt'|'validFrom'|'validUntil'>, asOf = WATER_UPDATED_AT): 'not-forecast' | 'unknown-validity' | 'not-yet-issued' | 'not-yet-valid' | 'active-at-snapshot' | 'expired' {
  if (!source.isForecast && !source.issuedAt && !source.validUntil) return 'not-forecast';
  if (!source.issuedAt || !source.validUntil) return 'unknown-validity';
  const issue = Date.parse(source.issuedAt);
  const expiry = Date.parse(source.validUntil.length === 10 ? `${source.validUntil}T23:59:59Z` : source.validUntil);
  const reference = Date.parse(asOf.length === 10 ? `${asOf}T23:59:59Z` : asOf);
  const start = source.validFrom ? Date.parse(source.validFrom) : issue;
  if (![issue,expiry,reference,start].every(Number.isFinite) || issue > expiry || start > expiry) return 'unknown-validity';
  if (reference < issue) return 'not-yet-issued';
  if (reference < start) return 'not-yet-valid';
  return reference > expiry ? 'expired' : 'active-at-snapshot';
}

export type WaterClaim = 'drought' | 'safe-functional-water' | 'tender-payment' | 'market-arrivals';
/** Checks indicator compatibility only. An eligible type is not verification of its factual contents. */
export function assessWaterIndicatorClaim(claim: WaterClaim, measures: WaterMeasure[]) {
  const required: Record<WaterClaim,WaterMeasure[]> = {
    drought:['drought-declaration'], 'safe-functional-water':['supply-functionality','water-quality'],
    'tender-payment':['payment'], 'market-arrivals':['market-arrivals'],
  };
  const missing = required[claim].filter(measure => !measures.includes(measure));
  const reasons: Record<WaterClaim,string> = {
    drought:'Rainfall alone does not establish declared drought; assess official criteria, soil moisture, crops, hydrology and the relevant order.',
    'safe-functional-water':'A household connection does not establish sufficient, regular or safe supply; matched functionality and quality evidence is required.',
    'tender-payment':'A tender estimate or contract award does not establish payment or completed work.',
    'market-arrivals':'Crop production is not the quantity arriving at a market; use dated market-arrival records.',
  };
  return { sufficientIndicatorTypes: missing.length === 0, missing, reason: reasons[claim] };
}

export interface WaterComparisonInput {
  left: { measure:WaterMeasure; unit:string; geographyId:string; geographicGrain:WaterScope; period:string; sourceIds:string[]; accountingStage?:WaterObservation['accountingStage']; populationBasis:string; methodology:string; boundaryVersion:string };
  right: { measure:WaterMeasure; unit:string; geographyId:string; geographicGrain:WaterScope; period:string; sourceIds:string[]; accountingStage?:WaterObservation['accountingStage']; populationBasis:string; methodology:string; boundaryVersion:string };
}
export function assessWaterComparison({left,right}:WaterComparisonInput) {
  const reasons:string[]=[];
  if (!left.geographyId.trim() || left.geographyId !== right.geographyId || left.geographicGrain !== right.geographicGrain) reasons.push('Geographic boundaries or grains differ or are missing.');
  if (!left.period.trim() || left.period !== right.period) reasons.push('Observation periods differ or are missing.');
  if (!left.unit.trim() || left.unit !== right.unit) reasons.push('Units differ or are missing.');
  if (!left.populationBasis.trim() || left.populationBasis !== right.populationBasis) reasons.push('Sample or population denominators differ or are missing.');
  if (!left.methodology.trim() || left.methodology !== right.methodology) reasons.push('Measurement methods differ or are missing.');
  if (!left.boundaryVersion.trim() || left.boundaryVersion !== right.boundaryVersion) reasons.push('Boundary definitions differ or are missing.');
  if (left.measure !== right.measure) reasons.push('Indicators are not interchangeable.');
  if (left.accountingStage !== right.accountingStage) reasons.push('Estimates, awards and payments are different accounting stages.');
  if (!left.sourceIds.length || !right.sourceIds.length || [...left.sourceIds,...right.sourceIds].some(id => !WATER_SOURCES.some(source=>source.id===id))) reasons.push('A comparable source record is missing.');
  return {comparable:reasons.length===0,reasons};
}

export function waterCsvCell(value:unknown) {
  const text=String(value??'');
  return `"${(/^[\s]*[=+@-]/u.test(text)?`'${text}`:text).replace(/"/gu,'""')}"`;
}
