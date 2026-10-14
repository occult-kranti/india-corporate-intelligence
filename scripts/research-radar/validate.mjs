import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { loadRadarRaw } from './load.mjs';
import { validDate, daysBetween } from './forecast.mjs';

export const RADAR_STATE_CODES = new Set('AN AP AR AS BR CH CG DN DL GA GJ HR HP JK JH KA KL LA LD MP MH MN ML MZ NL OD PY PB RJ SK TN TS TR UP UK WB'.split(' '));
const sourceKinds = new Set(['official', 'judicial', 'corporate', 'news', 'dataset', 'methodology']);
const sourceAccess = new Set(['full-text', 'original-file', 'indexed-extract', 'unavailable']);
const statuses = new Set(['documented-development', 'audit-finding', 'reported-allegation', 'open-question']);
const entityKinds = new Set(['institution', 'company', 'public-official', 'project', 'policy', 'source-mention']);
const linkKinds = new Set(['contract', 'payment', 'ownership', 'oversight', 'policy', 'appointment', 'allegation']);
const timelineKinds = new Set(['office', 'decision', 'allegation', 'response', 'judicial-outcome', 'corporate-role']);
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const array = value => Array.isArray(value) ? value : [];
const isHttp = value => { try { return ['https:', 'http:'].includes(new URL(value).protocol); } catch { return false; } };

export function validateRadar(regions, coverage) {
  const errors = [], warnings = [];
  const check = (condition, message) => { if (!condition) errors.push(message); };
  const string = (value, field) => check(nonempty(value), `${field}: nonempty string required`);
  const strings = (value, field, min = 1) => check(Array.isArray(value) && value.length >= min && value.every(nonempty), `${field}: ${min ? 'nonempty ' : ''}string array required`);
  const date = (value, field, cutoff, nullable = false) => check((nullable && value === null) || (validDate(value) && (!cutoff || value <= cutoff)), `${field}: valid ISO date${cutoff ? ' no later than cutoff' : ''} required`);
  const sources = new Map(), seenIds = new Set(), cityIds = new Set(array(coverage?.cities).map(city => city.id));
  const addId = (id, prefix, context) => { string(id, `${context}.id`); check(nonempty(id) && id.startsWith(prefix), `${context}: id must use ${prefix}`); check(!seenIds.has(id), `${context}: duplicate identity ${id}`); seenIds.add(id); };
  for (const region of array(regions)) for (const source of array(region.sources)) sources.set(source.id, source);
  const refs = (ids, field, requireInspected = true) => {
    strings(ids, field);
    for (const id of array(ids)) check(sources.has(id), `${field}: missing source ${id}`);
    if (requireInspected && array(ids).length) check(ids.some(id => sources.get(id)?.access && sources.get(id).access !== 'unavailable'), `${field}: unavailable records alone do not support a claim`);
  };
  check(Array.isArray(regions) && regions.length > 0, 'Regions required');
  const regionNames = new Set();
  for (const region of array(regions)) {
    const prefix = `radar-${region.region}:`, cutoff = region.cutoff;
    string(region.region, 'region'); check(!regionNames.has(region.region), `Duplicate region ${region.region}`); regionNames.add(region.region);
    check(region.schemaVersion === 1, `${prefix} unsupported schemaVersion`);
    date(cutoff, `${prefix}cutoff`); check(cutoff === '2026-10-07', `${prefix} research cutoff mismatch`);
    for (const field of ['sources', 'cases', 'actors', 'searchLog']) check(Array.isArray(region[field]), `${prefix}${field}: array required`);
    for (const source of array(region.sources)) {
      addId(source.id, prefix, 'source');
      for (const field of ['title', 'publisher', 'family', 'summary', 'locator']) string(source[field], `${source.id}.${field}`);
      check(isHttp(source.url), `${source.id}: public HTTP(S) source URL required`);
      check(sourceKinds.has(source.kind), `${source.id}: unknown source kind`); check(sourceAccess.has(source.access), `${source.id}: unknown access basis`);
      date(source.publishedAt, `${source.id}.publishedAt`, cutoff, true); date(source.retrievedAt, `${source.id}.retrievedAt`, cutoff);
      if (source.publishedAt) check(source.publishedAt <= source.retrievedAt, `${source.id}: publication after retrieval`);
      strings(source.limitations, `${source.id}.limitations`, 0);
      if (source.access === 'unavailable' || source.access === 'indexed-extract') check(array(source.limitations).length > 0, `${source.id}: partial/unavailable access requires a limitation`);
      if (source.publishedAt === null) warnings.push(`${source.id}: unknown publication date excluded from recent-source filter`);
    }
    for (const row of array(region.cases)) {
      addId(row.id, prefix, 'case');
      for (const field of ['title', 'question', 'summary']) string(row[field], `${row.id}.${field}`);
      strings(row.cityIds, `${row.id}.cityIds`, 0); for (const id of array(row.cityIds)) check(cityIds.has(id), `${row.id}: unknown planned city ${id}`);
      strings(row.stateCodes, `${row.id}.stateCodes`, 0); for (const code of array(row.stateCodes)) check(RADAR_STATE_CODES.has(code), `${row.id}: unknown/current uppercase state code ${code}`);
      strings(row.sectors, `${row.id}.sectors`); check(statuses.has(row.status), `${row.id}: unknown case status`); refs(row.sourceIds, `${row.id}.sourceIds`);
      date(row.updatedAt, `${row.id}.updatedAt`, cutoff);
      for (const field of ['observations', 'counterevidence']) {
        check(Array.isArray(row[field]) && row[field].length > 0, `${row.id}.${field}: at least one sourced statement required`);
        for (const item of array(row[field])) { string(item.text, `${row.id}.${field}.text`); refs(item.sourceIds, `${row.id}.${field}.sourceIds`); for (const id of array(item.sourceIds)) check(array(row.sourceIds).includes(id), `${row.id}: ${field} source omitted from complete case source list`); }
      }
      check(Array.isArray(row.nextRecords) && row.nextRecords.length > 0, `${row.id}: next record/holder/test required`);
      for (const item of array(row.nextRecords)) for (const field of ['record', 'holder', 'purpose']) string(item[field], `${row.id}.nextRecords.${field}`);
      check(Array.isArray(row.entities) && row.entities.length > 0, `${row.id}: case entities required`);
      const entityIds = new Set();
      for (const entity of array(row.entities)) {
        string(entity.id, `${row.id}.entity.id`); check(entity.id?.startsWith(prefix), `${row.id}: foreign entity namespace`); check(!entityIds.has(entity.id), `${row.id}: duplicate case entity ${entity.id}`); entityIds.add(entity.id);
        string(entity.label, `${entity.id}.label`); string(entity.role, `${entity.id}.role`); check(entityKinds.has(entity.kind), `${entity.id}: unsupported entity kind`); refs(entity.sourceIds, `${entity.id}.sourceIds`);
        for (const id of array(entity.sourceIds)) check(array(row.sourceIds).includes(id), `${row.id}: entity source omitted from complete case source list`);
      }
      check(Array.isArray(row.links), `${row.id}.links: array required`);
      const linkIds = new Set();
      for (const edge of array(row.links)) {
        string(edge.id, `${row.id}.link.id`); check(edge.id?.startsWith(prefix), `${row.id}: foreign link namespace`); check(!linkIds.has(edge.id), `${row.id}: duplicate link id`); linkIds.add(edge.id);
        check(entityIds.has(edge.from) && entityIds.has(edge.to), `${edge.id}: dangling exact endpoint`); check(edge.from !== edge.to, `${edge.id}: self-link is not a relationship between entities`);
        check(linkKinds.has(edge.kind), `${edge.id}: unknown link kind`); check(['documented', 'reported', 'alleged'].includes(edge.status), `${edge.id}: unknown evidence stage`); string(edge.label, `${edge.id}.label`); refs(edge.sourceIds, `${edge.id}.sourceIds`);
        if (edge.kind === 'allegation') check(edge.status === 'alleged', `${edge.id}: allegation cannot be promoted to documented/reported relationship`);
        if (edge.status === 'documented') check(array(edge.sourceIds).some(id => { const source = sources.get(id); return ['official', 'judicial', 'corporate', 'dataset'].includes(source?.kind) && ['full-text', 'original-file'].includes(source?.access); }), `${edge.id}: documented status needs an inspected documentary source`);
        for (const id of array(edge.sourceIds)) check(array(row.sourceIds).includes(id), `${row.id}: edge source omitted from complete case source list`);
      }
      const scenario = row.scenario ?? {};
      for (const field of ['target', 'baseline', 'probabilityReason']) string(scenario[field], `${row.id}.scenario.${field}`);
      for (const field of ['triggers', 'alternatives', 'falsifiers', 'requiredData']) strings(scenario[field], `${row.id}.scenario.${field}`);
      check(scenario.probability === null, `${row.id}: probability must remain null; source frequency is not calibrated probability`);
      check(Number.isInteger(scenario.horizonDays) && scenario.horizonDays > 0, `${row.id}: positive integer horizonDays required`);
      date(scenario.evaluationAt, `${row.id}.scenario.evaluationAt`); check(validDate(scenario.evaluationAt) && scenario.evaluationAt > cutoff, `${row.id}: scenario must evaluate after cutoff`);
      if (validDate(scenario.evaluationAt) && validDate(cutoff)) check(daysBetween(cutoff, scenario.evaluationAt) === scenario.horizonDays, `${row.id}: horizonDays must match cutoff-to-evaluation calendar interval`);
    }
    for (const actor of array(region.actors)) {
      addId(actor.id, prefix, 'actor'); for (const field of ['label', 'kind', 'identityNote']) string(actor[field], `${actor.id}.${field}`); refs(actor.sourceIds, `${actor.id}.sourceIds`);
      check(['public-official', 'corporate-role', 'company', 'institution', 'source-mention'].includes(actor.kind), `${actor.id}: actor must represent a public decision/corporate role`);
      check(Array.isArray(actor.timeline) && actor.timeline.length > 0, `${actor.id}: dated timeline required`);
      for (const item of array(actor.timeline)) {
        date(item.date, `${actor.id}.timeline.date`, cutoff); string(item.label, `${actor.id}.timeline.label`); string(item.outcome, `${actor.id}.timeline.outcome`); strings(item.limitations, `${actor.id}.timeline.limitations`, 0); check(timelineKinds.has(item.category), `${actor.id}: unknown historical category`); refs(item.sourceIds, `${actor.id}.timeline.sourceIds`);
        for (const id of array(item.sourceIds)) check(array(actor.sourceIds).includes(id), `${actor.id}: timeline source omitted from actor source list`);
      }
      for (const key of ['risk', 'riskScore', 'guilt', 'guiltProbability', 'probability', 'propensity', 'corruptionScore']) check(!(key in actor), `${actor.id}: personal propensity field forbidden: ${key}`);
    }
    for (const entry of array(region.searchLog)) {
      for (const field of ['query', 'tool', 'notes']) string(entry[field], `${prefix}searchLog.${field}`);
      check(Number.isInteger(entry.requestedResults) && entry.requestedResults >= 0, `${prefix}searchLog.requestedResults: nonnegative integer required`);
      check(Array.isArray(entry.inspectedUrls) && entry.inspectedUrls.every(isHttp), `${prefix}searchLog.inspectedUrls: actual HTTP URLs required`);
    }
  }
  check(coverage?.schemaVersion === 1 && coverage.cutoff === '2026-10-07', 'Coverage version/cutoff mismatch');
  check(Array.isArray(coverage?.cities) && coverage.cities.length > 0, 'Coverage cities required');
  const geographySources = new Map(array(coverage?.geographySources).map(source => [source.id, source]));
  if (coverage?.geographySources != null) {
    check(Array.isArray(coverage.geographySources), 'Coverage geographySources must be an array');
    check(geographySources.size === array(coverage.geographySources).length, 'Duplicate geography source identity');
    for (const source of geographySources.values()) {
      check(nonempty(source.id) && source.id.startsWith('radar-coverage:'), 'Geography source must use radar-coverage: namespace');
      for (const field of ['title', 'publisher', 'summary', 'locator', 'family']) string(source[field], `${source.id}.${field}`);
      check(isHttp(source.url), `${source.id}: public geography source URL required`);
      check(sourceKinds.has(source.kind) && sourceAccess.has(source.access), `${source.id}: geography source kind/access invalid`);
      date(source.publishedAt, `${source.id}.publishedAt`, coverage.cutoff, true); date(source.retrievedAt, `${source.id}.retrievedAt`, coverage.cutoff);
      if (source.publishedAt) check(source.publishedAt <= source.retrievedAt, `${source.id}: geography source publication after retrieval`);
      strings(source.limitations, `${source.id}.limitations`, 0);
    }
  }
  const seenCities = new Set();
  for (const city of array(coverage?.cities)) {
    string(city.id, 'city.id'); check(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(city.id), `${city.id}: lowercase city id required`); check(!seenCities.has(city.id), `Duplicate city ${city.id}`); seenCities.add(city.id);
    string(city.label, `${city.id}.label`); strings(city.stateCodes, `${city.id}.stateCodes`); for (const code of array(city.stateCodes)) check(RADAR_STATE_CODES.has(code), `${city.id}: invalid current state code ${code}`);
    check(Number.isFinite(city.latitude) && city.latitude >= -90 && city.latitude <= 90 && Number.isFinite(city.longitude) && city.longitude >= -180 && city.longitude <= 180, `${city.id}: finite WGS84 coordinates required`);
    check(nonempty(city.role) || (Array.isArray(city.role) && city.role.length > 0 && city.role.every(nonempty)), `${city.id}: explicit planning role required`); strings(city.sectors, `${city.id}.sectors`);
    check(nonempty(city.notes) || (Array.isArray(city.notes) && city.notes.every(nonempty)), `${city.id}: geography/coverage notes required`);
    if (city.capitalFor != null) { strings(city.capitalFor, `${city.id}.capitalFor`, 0); for (const code of array(city.capitalFor)) check(RADAR_STATE_CODES.has(code), `${city.id}: invalid capital service jurisdiction ${code}`); }
    if (coverage?.geographySources != null) { const manualPlanningAnchor = Array.isArray(city.capitalFor) && city.capitalFor.length === 0 && typeof city.coordinateBasis === 'string' && /manual/i.test(city.coordinateBasis) && /approximate/i.test(city.coordinateBasis); strings(city.sourceIds, `${city.id}.sourceIds`, manualPlanningAnchor ? 0 : 1); for (const id of array(city.sourceIds)) check(geographySources.has(id), `${city.id}: missing geography source ${id}`); }
    if (city.coordinateBasis != null) string(city.coordinateBasis, `${city.id}.coordinateBasis`);
  }
  return { valid: errors.length === 0, errors, warnings, counts: { regions: array(regions).length, cases: array(regions).reduce((n, region) => n + array(region.cases).length, 0), sources: sources.size, actors: array(regions).reduce((n, region) => n + array(region.actors).length, 0), plannedCities: cityIds.size }, interpretation: 'Schema/provenance checks do not certify the truth of allegations or complete city/sector coverage.' };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { regions, coverage } = await loadRadarRaw();
  const result = validateRadar(regions, coverage);
  console.log(JSON.stringify(result, null, 2));
  if (!result.valid) process.exitCode = 1;
}
