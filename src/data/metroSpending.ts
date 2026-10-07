import type { InvestigationFilters, InvestigationGeography, InvestigationRecord, InvestigationRegistry } from './investigation';
import { createInvestigationMatcher } from './investigationFilters';
import { getAllegationsView, type AllegationsOptions } from './allegationsInvestigation';
import { getAtlasEvidenceClosure, type AtlasSelection } from './atlasInvestigation';

export const METRO_REVIEW_NAMESPACES = ['metro-delhi-security', 'metro-mumbai-security', 'metro-defence', 'metro-public-finance', 'metro-tender-scan', 'money-trails-djb', 'money-trails-mumbai'] as const;
export const METRO_CITY_LABELS = { all: 'All reviewed', both: 'Delhi + Mumbai', delhi: 'Delhi', mumbai: 'Mumbai' } as const;
export const METRO_TOPIC_LABELS = { all: 'All topics', police: 'Police review', defence: 'Border & defence', funds: 'Public funds' } as const;
export const METRO_CONTEXT_LABELS = {
  'budget-allocation': 'Budget allocation',
  'budget-expenditure': 'Budget expenditure',
  'procurement-notice': 'Tender notice',
  'contract-award': 'Contract award',
  'financial-statement': 'Financial statement',
  'funding-release': 'Funding release',
  'procurement-context': 'Procurement context',
  'expenditure-report': 'Expenditure report',
} as const;
export type MetroCity = keyof typeof METRO_CITY_LABELS;
export type MetroTopic = keyof typeof METRO_TOPIC_LABELS;
export type MetroContextKind = keyof typeof METRO_CONTEXT_LABELS;
export interface MetroOptions extends AllegationsOptions { city?: MetroCity; topic?: MetroTopic; includeNational?: boolean; includeStateContext?: boolean }
export interface MetroPlacement { cities: ('delhi' | 'mumbai')[]; stateContextCodes: string[]; national: boolean; label: string }
const isReviewed = (namespace: string) => (METRO_REVIEW_NAMESPACES as readonly string[]).includes(namespace);
const unique = <T,>(values: T[]) => [...new Set(values)];

/** City membership requires an explicit locality on this evidence, never an endpoint's office or a state tag. */
export function metroPlacement(registry: InvestigationRegistry, geography: InvestigationGeography[]): MetroPlacement {
  const ids = new Set(geography.flatMap(row => row.localityIds));
  const cities = unique(registry.localities.flatMap(locality => {
    if (!ids.has(locality.id)) return [];
    const id = locality.originalId.toLowerCase(), name = locality.name.trim().toLowerCase();
    if (id === 'delhi' || ['delhi', 'new delhi'].includes(name)) return ['delhi' as const];
    if (id === 'mumbai' || name === 'mumbai') return ['mumbai' as const];
    return [];
  }));
  const national = geography.some(row => row.scope === 'national');
  const stateContextCodes = !cities.length && !national ? unique(geography.filter(row => ['state', 'multi-state'].includes(row.scope)).flatMap(row => row.stateCodes)) : [];
  const stateLabel = stateContextCodes.map(code => code === 'DL' ? 'NCT of Delhi' : registry.states.find(state => state.code === code)?.name ?? code).join(' + ');
  return { cities, stateContextCodes, national, label: cities.length ? `${cities.map(city => METRO_CITY_LABELS[city]).join(' + ')} association${national ? ' · national context' : ''}` : national ? 'National context · no city allocation' : stateContextCodes.length ? `${stateLabel} statewide context · no city allocation` : 'Other / unestablished city' };
}

function topicMatches(row: { namespace: string; domains: string[] }, topic: MetroTopic) {
  if (topic === 'all') return true;
  if (row.namespace === 'metro-tender-scan') {
    if (topic === 'police') return row.domains.includes('security') && !row.domains.includes('defence-trade');
    if (topic === 'defence') return row.domains.includes('security') && row.domains.includes('defence-trade');
    return row.domains.includes('public-funds') && !row.domains.includes('security');
  }
  if (topic === 'police') return ['metro-delhi-security', 'metro-mumbai-security'].includes(row.namespace);
  return topic === 'defence' ? row.namespace === 'metro-defence' : ['metro-public-finance', 'money-trails-djb', 'money-trails-mumbai'].includes(row.namespace);
}

/** Narrow display populations; response/identity closure intentionally survives these filters. */
export function getMetroSpendingView(registry: InvestigationRegistry, filters: InvestigationFilters = {}, options: MetroOptions = {}) {
  const city = options.city ?? 'all', topic = options.topic ?? 'all', includeNational = options.includeNational ?? true, includeStateContext = options.includeStateContext ?? false;
  const base = getAllegationsView(registry, filters, options), matches = createInvestigationMatcher(registry, filters);
  const inScope = (row: { namespace: string; geography: InvestigationGeography[]; domains: string[] }) => {
    if (!topicMatches(row, topic)) return false;
    const placement = metroPlacement(registry, row.geography);
    if (!includeNational && placement.national && !placement.cities.length) return false;
    if (city === 'all') return true;
    const stateCodes = city === 'both' ? ['DL', 'MH'] : [city === 'delhi' ? 'DL' : 'MH'];
    return placement.cities.some(value => city === 'both' || value === city)
      || (includeStateContext && placement.stateContextCodes.some(code => stateCodes.includes(code)))
      || (includeNational && placement.national);
  };
  const entries = base.entries.filter(entry => inScope((entry.record ?? entry.relationship)!));
  const sourceIds = new Set(registry.sources.map(source => source.id));
  const contextRecords = registry.records.filter(row => isReviewed(row.namespace)
    && Object.prototype.hasOwnProperty.call(METRO_CONTEXT_LABELS, row.kind)
    && options.cohort !== 'retained' && matches(row) && inScope(row)
    && row.sourceIds.length > 0 && [...row.sourceIds, ...row.geography.flatMap(geo => geo.sourceIds)].every(id => sourceIds.has(id)))
    .sort((a, b) => (b.fromDate ?? '').localeCompare(a.fromDate ?? '') || a.id.localeCompare(b.id));
  const selections: AtlasSelection[] = [...entries.map(entry => entry.selection), ...contextRecords.map(row => ({ kind: 'record' as const, id: row.id }))];
  const evidence = getAtlasEvidenceClosure(registry, selections);
  const count = (predicate: (entry: typeof entries[number]) => boolean) => entries.filter(predicate).length;
  const nationalOnly = (row: { geography: InvestigationGeography[] }) => {
    const placement = metroPlacement(registry, row.geography);
    return placement.national && !placement.cities.length;
  };
  const countContext = (kind: MetroContextKind) => contextRecords.filter(row => row.kind === kind).length;
  const statewideOnly = (row: { geography: InvestigationGeography[] }) => metroPlacement(registry, row.geography).stateContextCodes.length > 0;
  return {
    ...base, ...evidence, entries, contextRecords, selections, city, topic, includeNational, includeStateContext,
    evidenceRegistry: { ...registry, ...evidence },
    counts: { ...base.counts, total: entries.length, cases: count(row => row.category === 'case'), allegations: count(row => row.category === 'allegation'), findings: count(row => row.category === 'finding'), outcomes: count(row => row.category === 'outcome'), allegedLinks: count(row => row.category === 'alleged-link'), newlyReviewed: count(row => row.cohort === 'new'), retained: count(row => row.cohort === 'retained'), active: count(row => row.claimState === 'active'), withdrawn: count(row => row.claimState === 'withdrawn'), superseded: count(row => row.claimState === 'superseded'), unknown: count(row => row.claimState === 'unknown') },
    nationalEntries: entries.filter(entry => nationalOnly((entry.record ?? entry.relationship)!)).length,
    nationalContextRecords: contextRecords.filter(nationalOnly).length,
    stateEntries: entries.filter(entry => statewideOnly((entry.record ?? entry.relationship)!)).length,
    stateContextRecords: contextRecords.filter(statewideOnly).length,
    contextCounts: { allocations: countContext('budget-allocation'), notices: countContext('procurement-notice'), awards: countContext('contract-award') },
    scopeNote: city === 'all' ? 'All reviewed geography includes statewide context. City controls require a recorded Delhi or Mumbai locality; a Maharashtra tag alone is not Mumbai.' : `${METRO_CITY_LABELS[city]} associations${includeNational ? ', with national context shown separately' : '; national-only context hidden'}. ${includeStateContext ? 'Relevant statewide context is included and separately labeled.' : 'Statewide budgets are available through Include state context or All reviewed.'} Statewide and unplaced records are not assigned to a city.`,
  };
}

/** This is a display helper, not an aggregation: currencies, financial stages and periods remain separate. */
export function metroRecordAmounts(record: InvestigationRecord) {
  return record.amounts.map(amount => `${amount.currency} ${amount.value.toLocaleString('en-IN')} ${amount.unit} · ${amount.stage} · ${amount.period}`);
}

/** Context search shares the registry's source and exact-identity vocabulary. */
export function searchMetroContext(registry: InvestigationRegistry, records: InvestigationRecord[], query: string) {
  return records.filter(createInvestigationMatcher(registry, { q: query }));
}
