import test from 'node:test';
import assert from 'node:assert/strict';
import { loadResearchRadar, loadRadarRaw } from './load.mjs';
import { validateRadar, RADAR_STATE_CODES } from './validate.mjs';
import { assembleForecastRegistry } from './forecast-registry.mjs';

const api = await loadResearchRadar();
const { regions, coverage } = await loadRadarRaw();

test('All retained research satisfies provenance, time and source-stage guards', () => {
  const result = validateRadar(regions, coverage);
  assert.deepEqual(result.errors, []);
  assert(result.counts.cases > 0 && result.counts.sources > 0);
  assert.equal(api.RESEARCH_RADAR_DATA.forecastStatus, 'untrained-uncalibrated');
  assert.equal(api.RESEARCH_RADAR_DATA.cases.length, result.counts.cases);
});

test('National planning covers all 36 jurisdictions without moving Chandigarh into Punjab or Haryana', () => {
  assert.deepEqual([...new Set(coverage.cities.flatMap(city => city.capitalFor ?? []))].sort(), [...RADAR_STATE_CODES].sort());
  const chandigarh = api.RADAR_CITIES.find(city => city.id === 'chandigarh');
  assert.deepEqual(chandigarh.stateCodes, ['CH']);
  assert(chandigarh.capitalFor.includes('PB') && chandigarh.capitalFor.includes('HR'));
  assert(!api.getRadarCoverage({ stateCode: 'PB' }).cities.some(city => city.id === 'chandigarh'));
});

test('Map backlog is an explicit planning denominator, not implied clean-city evidence', () => {
  const result = api.getRadarCoverage();
  const researched = new Set(api.RESEARCH_RADAR_DATA.cases.flatMap(row => row.cityIds));
  assert.equal(result.plannedCities, coverage.cities.length);
  assert.equal(result.coveredCities, researched.size);
  assert.equal(result.unresearchedCities, coverage.cities.length - researched.size);
  assert(result.unresearchedCities > 0, 'This bounded review must retain its unresearched backlog');
  for (const city of result.cities.filter(city => city.status === 'unresearched')) {
    assert.deepEqual(city.caseIds, []);
    assert.equal(city.caseCount, 0);
  }
  assert.match(result.interpretation, /one dossier is not comprehensive/);
});

test('Unknown city or entity does not silently display unrelated cases or invented links', () => {
  assert.deepEqual(api.filterRadarCases({ cityId: 'unresearched-fixture-does-not-exist' }), []);
  assert.deepEqual(api.filterRadarCases({ stateCode: 'XX' }), []);
  assert.deepEqual(api.buildRadarCaseGraph('missing').links, []);
  assert.deepEqual(api.buildRadarCaseGraph('missing').entities, []);
  assert.equal(api.exportRadarCase('missing'), null);
});

test('Case exports keep counterevidence and complete provenance even beyond visible map nodes', () => {
  for (const row of api.RESEARCH_RADAR_DATA.cases) {
    const exported = api.exportRadarCase(row.id);
    const sourceIds = new Set(exported.sources.map(source => source.id));
    assert.deepEqual(exported.case.counterevidence, row.counterevidence, row.id);
    assert.deepEqual(exported.case.nextRecords, row.nextRecords, row.id);
    for (const item of [...row.counterevidence, ...row.observations, ...row.entities, ...row.links]) for (const id of item.sourceIds) assert(sourceIds.has(id), `${row.id} lost ${id}`);
    for (const actor of exported.actors) for (const item of actor.timeline) for (const id of item.sourceIds) assert(sourceIds.has(id), `${row.id} lost actor outcome source ${id}`);
    assert.deepEqual(exported.missingSourceIds, []);
    assert.equal(exported.actorAssociationBasis, 'shared-source-reference');
    assert.equal(exported.case.scenario.probability, null);
  }
});

test('Graph uses case-local identities and never adds cross-case same-name or office connections', () => {
  for (const row of api.RESEARCH_RADAR_DATA.cases) {
    const graph = api.buildRadarCaseGraph(row.id);
    const entities = new Set(row.entities.map(entity => entity.id));
    assert.equal(graph.links.length, row.links.length, row.id);
    assert.deepEqual(graph.links.map(edge => [edge.id, edge.from, edge.to, edge.kind, edge.status]), row.links.map(edge => [edge.id, edge.from, edge.to, edge.kind, edge.status]));
    assert(graph.links.every(edge => entities.has(edge.from) && entities.has(edge.to)));
  }
});

test('Latest filter uses publication time, never retrieval or case update time', () => {
  const row = api.RESEARCH_RADAR_DATA.cases[0];
  const sources = row.sourceIds.map(api.radarSourceById);
  const original = sources.map(source => ({ source, date: source.publishedAt }));
  try {
    for (const source of sources) source.publishedAt = '2020-01-01';
    assert.equal(api.caseHasRecentSource(row), false);
    assert(!api.filterRadarCases({ recency: 'latest-window' }).some(candidate => candidate.id === row.id));
    sources[0].publishedAt = null;
    assert.equal(api.caseHasRecentSource(row), false);
    sources[0].publishedAt = '2026-10-07';
    assert.equal(api.caseHasRecentSource(row), true);
    sources[0].publishedAt = '2026-10-08';
    assert.equal(api.caseHasRecentSource(row), false);
  } finally { for (const { source, date } of original) source.publishedAt = date; }
});

test('City, sector and claim-stage filters intersect without changing source meaning', () => {
  for (const row of api.RESEARCH_RADAR_DATA.cases) {
    for (const cityId of row.cityIds) {
      const result = api.filterRadarCases({ cityId, sector: row.sectors[0], status: row.status });
      assert(result.some(candidate => candidate.id === row.id));
      assert(result.every(candidate => candidate.cityIds.includes(cityId) && candidate.sectors.some(sector => api.normalizeRadarSector(sector) === api.normalizeRadarSector(row.sectors[0])) && candidate.status === row.status));
    }
  }
});

test('Actual forecast registry remains unresolved with a disabled calibration gate', async () => {
  const registry = await assembleForecastRegistry();
  assert.equal(registry.calibrationGate.enabled, false);
  assert.equal(registry.rows.length, api.RESEARCH_RADAR_DATA.cases.length);
  assert(registry.rows.every(row => row.outcome === null && row.probability === null && row.status === 'unknown'));
  assert(registry.calibrationGate.missing.includes('Empirical calibration and uncertainty'));
});


test('Explicit facet aliases find power and school evidence without rewriting original tags', () => {
  assert.equal(api.normalizeRadarSector('power'), 'energy');
  assert.equal(api.normalizeRadarSector('schools'), 'education');
  assert(!api.RADAR_SECTORS.includes('power'));
  for (const row of api.RESEARCH_RADAR_DATA.cases) for (const tag of row.sectors) {
    const canonical = api.normalizeRadarSector(tag);
    assert(api.filterRadarCases({ sector: canonical }).some(candidate => candidate.id === row.id));
    assert(api.exportRadarCase(row.id).case.sectors.includes(tag), `${row.id} original tag lost`);
  }
});
