import research from './education-research.json';

export type EducationChannel = 'government' | 'csr' | 'ngo' | 'foreign' | 'multilateral' | 'private';
export type EducationManagement = 'government' | 'aided' | 'private';
export type EducationLevel = 'school' | 'college';
export type EducationScope = 'national' | 'state' | 'district' | 'city' | 'multi-state';
export interface EducationState { code: string; name: string }
export interface EducationLocality { id: string; name: string; stateCode: string; kind: 'district' | 'city' }
export interface EducationDimensions {
  stateCodes: string[]; localityIds: string[]; channels: EducationChannel[];
  managements: EducationManagement[]; levels: EducationLevel[];
}
export interface EducationSource extends EducationDimensions {
  id: string; title: string; url: string; publisher: string; publishedAt: string | null;
  period: string; retrievedAt: string; type: 'document' | 'portal' | 'news' | 'dataset';
  tier: 'primary' | 'reported' | 'self-reported'; scope: EducationScope;
  summary: string; limitations: string[]; retrievalStatus?: string; locator?: string; geographicLabel?: string;
}
export interface EducationProgram extends EducationDimensions {
  id: string; title: string; summary: string; scope: EducationScope;
  sourceIds: string[]; constraints: string[];
}
export interface EducationFlow extends EducationDimensions {
  id: string; title: string; summary: string; scope: EducationScope;
  amount: number; currency: 'INR' | 'USD'; unit: 'crore' | 'million' | 'rupees' | 'lakh';
  stage: 'allocation' | 'release' | 'expenditure' | 'receipt' | 'commitment' | 'outlay' | 'reimbursement';
  period: string; sourceIds: string[]; limitations: string[];
  includedInFlowId?: string; financialEnvelope?: string;
}
export interface EducationSchoolSeries {
  id: string; name: string; stateCode: string; localityId?: string;
  points: { year: string; value: number }[]; sourceIds: string[];
  management: EducationManagement; level: EducationLevel; unit: 'schools';
  geographyId: string; ageBand: string; limitations: string[];
}
export interface EducationLead extends EducationDimensions {
  id: string; title: string; summary: string; signal: string; scope: EducationScope;
  alternativeExplanations: string[]; falsifier: string; sourceIds: string[];
  status: 'investigate' | 'context';
}
export interface EducationFilters {
  stateCode?: string; localityId?: string; q?: string; place?: string; channel?: EducationChannel;
  management?: EducationManagement; level?: EducationLevel;
}
export interface EducationDataset {
  updatedAt: string; methodology: string[]; coverageNotes: string[];
  states: EducationState[]; localities: EducationLocality[]; sources: EducationSource[];
  programs: EducationProgram[]; flows: EducationFlow[]; schoolSeries: EducationSchoolSeries[];
  leads: EducationLead[];
}

const data = research as EducationDataset;
export const EDUCATION_UPDATED_AT = data.updatedAt;
export const EDUCATION_METHODOLOGY = data.methodology;
export const EDUCATION_COVERAGE_NOTES = data.coverageNotes;
export const EDUCATION_STATES = data.states;
export const EDUCATION_LOCALITIES = data.localities;
export const EDUCATION_SOURCES = data.sources;
export const EDUCATION_PROGRAMS = data.programs;
export const EDUCATION_FLOWS = data.flows;
export const EDUCATION_SCHOOL_SERIES = data.schoolSeries;
export const EDUCATION_LEADS = data.leads;
export const EDUCATION_CHANNELS: { value: EducationChannel; label: string }[] = [
  { value: 'government', label: 'Government' }, { value: 'csr', label: 'CSR' },
  { value: 'ngo', label: 'NGO / philanthropy' }, { value: 'foreign', label: 'Foreign funding' },
  { value: 'multilateral', label: 'Multilateral' }, { value: 'private', label: 'Private capital' },
];
export const EDUCATION_MANAGEMENTS: { value: EducationManagement; label: string }[] = [
  { value: 'government', label: 'Government' }, { value: 'aided', label: 'Government aided' },
  { value: 'private', label: 'Private unaided' },
];
export const EDUCATION_LEVELS: { value: EducationLevel; label: string }[] = [
  { value: 'school', label: 'Schools' }, { value: 'college', label: 'Colleges / universities' },
];

const normalize = (value: string) => value.normalize('NFKC').toLocaleLowerCase('en-IN').trim();
/** National context survives a state-only filter; local evidence needs an explicit locality reference. */
export function matchesEducationFilters(
  item: EducationDimensions & { scope: EducationScope; title: string; summary: string; publisher?: string; geographicLabel?: string },
  filters: EducationFilters = {},
): boolean {
  if (filters.stateCode && !EDUCATION_STATES.some(state => state.code === filters.stateCode)) return false;
  if (filters.localityId && !EDUCATION_LOCALITIES.some(place => place.id === filters.localityId)) return false;
  if (filters.stateCode && item.scope !== 'national' && !item.stateCodes.includes(filters.stateCode)) return false;
  if (filters.localityId && !item.localityIds.includes(filters.localityId)) return false;
  if (filters.localityId && filters.stateCode && !EDUCATION_LOCALITIES.some(place => place.id === filters.localityId && place.stateCode === filters.stateCode)) return false;
  if (filters.channel && !item.channels.includes(filters.channel)) return false;
  if (filters.management && !item.managements.includes(filters.management)) return false;
  if (filters.level && !item.levels.includes(filters.level)) return false;
  if (filters.q?.trim() || filters.place?.trim()) {
    const geography = [
      ...EDUCATION_STATES.filter(state => item.stateCodes.includes(state.code)).map(state => state.name),
      ...EDUCATION_LOCALITIES.filter(place => item.localityIds.includes(place.id)).map(place => place.name),
    ].join(' ');
    const haystack = normalize(`${item.title} ${item.summary} ${item.publisher ?? ''} ${item.geographicLabel ?? ''} ${geography}`);
    if (filters.q?.trim() && !normalize(filters.q).split(/\s+/u).every(word => haystack.includes(word))) return false;
    if (filters.place?.trim()) {
      const candidates = EDUCATION_LOCALITIES.filter(place => item.localityIds.includes(place.id) && (!filters.stateCode || place.stateCode === filters.stateCode));
      const words = normalize(filters.place).split(/\s+/u);
      if (!candidates.some(place => words.every(word => normalize(place.name).includes(word)))) return false;
    }
  }
  return true;
}
export const getEducationSources = (filters: EducationFilters = {}) => EDUCATION_SOURCES.filter(item => matchesEducationFilters(item, filters));
export const getEducationPrograms = (filters: EducationFilters = {}) => EDUCATION_PROGRAMS.filter(item => matchesEducationFilters(item, filters));
export const getEducationFlows = (filters: EducationFilters = {}) => EDUCATION_FLOWS.filter(item => matchesEducationFilters(item, filters));
export const getEducationLeads = (filters: EducationFilters = {}) => EDUCATION_LEADS.filter(item => matchesEducationFilters(item, filters));
export function getEducationSchoolSeries(filters: EducationFilters = {}) {
  return EDUCATION_SCHOOL_SERIES.filter(item => {
    if (filters.stateCode && item.stateCode !== filters.stateCode) return false;
    if (filters.localityId && item.localityId !== filters.localityId) return false;
    if (filters.management && item.management !== filters.management) return false;
    if (filters.level && item.level !== filters.level) return false;
    if (filters.channel && filters.channel !== 'government') return false;
    if (filters.q?.trim() && !normalize(`${item.name} ${EDUCATION_STATES.find(state => state.code === item.stateCode)?.name ?? ''}`).includes(normalize(filters.q))) return false;
    if (filters.place?.trim()) {
      const place = EDUCATION_LOCALITIES.find(candidate => candidate.id === item.localityId);
      if (!place || !normalize(filters.place).split(/\s+/u).every(word => normalize(place.name).includes(word))) return false;
    }
    return true;
  });
}

/** Institution stocks do not identify closures: openings, mergers and code changes also affect the balance. */
export function getSchoolCountChange(series: EducationSchoolSeries) {
  const points = [...series.points].sort((a, b) => a.year.localeCompare(b.year));
  if (points.length < 2 || points.some(point => !Number.isInteger(point.value) || point.value < 0) || new Set(points.map(point => point.year)).size !== points.length) return null;
  const first = points[0];
  const last = points[points.length - 1];
  const change = last.value - first.value;
  return {
    first, last, change, percentage: first.value === 0 ? null : change / first.value * 100,
    label: 'Change in reported school count', closureCount: null,
  };
}

export interface PopulationComparisonInput {
  school: { geographyId: string; ageBand: string; startYear: string; endYear: string; startCount: number; endCount: number; boundaryVersion: string; sourceIds: string[]; startManagement: EducationManagement; endManagement: EducationManagement; startLevel: EducationLevel; endLevel: EducationLevel };
  population?: { geographyId: string; ageBand: string; startYear: string; endYear: string; startCount: number; endCount: number; boundaryVersion: string; sourceIds: string[]; basis: 'observed' | 'projected' };
}
/** Return a research signal only after geography, age and time are explicitly aligned. Never infer wrongdoing. */
export function assessPopulationComparison(input: PopulationComparisonInput) {
  const { school, population } = input;
  const reasons: string[] = [];
  if (!population) return { comparable: false, signal: false, reasons: ['No comparable school-age population series is loaded.'], conclusion: 'Insufficient evidence' };
  if (!school.geographyId.trim() || school.geographyId !== population.geographyId) reasons.push('Geographies are missing or differ.');
  if (!school.boundaryVersion.trim() || school.boundaryVersion !== population.boundaryVersion) reasons.push('Boundary definitions are missing or differ.');
  const ageBand = /^(\d{1,2})-(\d{1,2})$/u.exec(school.ageBand);
  if (!ageBand || Number(ageBand[1]) >= Number(ageBand[2]) || Number(ageBand[2]) > 30 || school.ageBand !== population.ageBand) reasons.push('Explicit age-specific population bands are missing or differ; total population is not a substitute.');
  if (school.startYear !== population.startYear || school.endYear !== population.endYear) reasons.push('Observation periods differ.');
  if (school.startYear.length !== school.endYear.length) reasons.push('Calendar years and academic/fiscal years cannot be mixed.');
  if (![school.startYear, school.endYear, population.startYear, population.endYear].every(year => {
    const parts = /^(\d{4})(?:-(\d{2}))?$/u.exec(year);
    return parts && (!parts[2] || Number(parts[2]) === (Number(parts[1]) + 1) % 100);
  })) reasons.push('Observation years are missing or malformed.');
  if (school.startYear >= school.endYear) reasons.push('Observation period must increase.');
  if (!EDUCATION_MANAGEMENTS.some(item => item.value === school.startManagement) || school.startManagement !== school.endManagement || !EDUCATION_LEVELS.some(item => item.value === school.startLevel) || school.startLevel !== school.endLevel) reasons.push('School management or education level definitions are missing or changed.');
  if ([school.startCount, school.endCount, population.startCount, population.endCount].some(value => !Number.isInteger(value) || value < 0)) reasons.push('Counts must be finite non-negative integers.');
  if (population.sourceIds.length === 0) reasons.push('Population provenance is missing.');
  if (school.sourceIds.length === 0) reasons.push('School-count provenance is missing.');
  if ([...school.sourceIds, ...population.sourceIds].some(id => !EDUCATION_SOURCES.some(source => source.id === id))) reasons.push('A cited source is not in the curated source registry.');
  if (population.basis !== 'observed') reasons.push('Population evidence is not identified as observed; projections and unknown bases need corroboration.');
  const comparable = reasons.length === 0;
  const signal = comparable && school.endCount < school.startCount && population.endCount > population.startCount;
  return { comparable, signal, reasons, conclusion: signal ? 'Review access: school count fell while comparable school-age population rose. This is not a closure count or a finding of misconduct.' : comparable ? 'No school-count decline with population growth in this comparison.' : 'Insufficient evidence' };
}

/** Excel interprets leading formula characters even inside quoted CSV cells. */
export function educationCsvCell(value: unknown): string {
  const text = String(value ?? '');
  const safe = /^[\s]*[=+@-]/u.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/gu, '""')}"`;
}
