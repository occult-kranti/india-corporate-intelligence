#!/usr/bin/env node
/** Reproducible planned work packets; generating this file dispatches no agents. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { loadResearchRadar } from './load.mjs';
const radar = await loadResearchRadar();
const { RESEARCH_RADAR_DATA: data, RADAR_CITIES: cities, normalizeRadarSector } = radar;
const normalize = normalizeRadarSector ?? (value => value);
const regions = ['north', 'west', 'south-east', 'national'];
const inputPaths = [...regions.map(region => `research/raw/research-radar/${region}.json`), 'research/raw/research-radar/coverage.json', 'src/data/researchRadar.ts', 'research/raw/cabinet.json'];
const inputHashes = Object.fromEntries(inputPaths.map(path => [path, createHash('sha256').update(readFileSync(path)).digest('hex')]));
const packets = cities.flatMap(city => city.sectors.map(sector => {
  const cases = data.cases.filter(row => row.cityIds.includes(city.id) && row.sectors.some(tag => normalize(tag) === sector));
  return { id: `radar-queue:city:${city.id}:${sector}`, kind: 'city-sector-acquisition', cityId: city.id, sector,
    state: 'planned', priorityBasis: cases.length ? 'Follow up a retained public-record question' : 'Establish source coverage before making any risk assessment',
    retainedCaseIds: cases.map(row => row.id), roles: ['jurisdiction-source-investigator', 'sector-record-reconciler', 'independent-source-challenger'],
    output: 'Source/access manifest, exact-identity case if supported, responses and latest outcome, missing records and holder; otherwise an explicit coverage gap.',
    stopCondition: 'A bounded question is resolved, contradicted, or stopped at a named unavailable record. Do not fill the packet with invented allegations.',
  };
}));
for (const actor of data.actors) packets.push({ id: `radar-queue:actor:${actor.id}`, kind: 'public-role-history', actorId: actor.id,
  state: 'planned', priorityBasis: 'Extend the chronology of an already sourced public decision role', sourceIds: actor.sourceIds,
  roles: ['identity-and-role-historian', 'independent-legal-outcome-challenger'],
  output: 'Dated office/authority/decision/allegation/response/outcome history with exact identity and source limitations; no personal criminality score.',
  stopCondition: 'No verified public role or material case connection exists, or the next source cannot lawfully be acquired.' });
const cabinet = JSON.parse(readFileSync('research/raw/cabinet.json', 'utf8'));
for (const minister of cabinet.ministers) packets.push({ id: `radar-queue:roster-refresh:${minister.id}`, kind: 'inherited-public-office-roster-refresh',
  state: 'planned', inheritedLabel: minister.name, inheritedRosterAsOf: cabinet.asOf, inheritedSourceReferences: minister.srcs,
  currentRoleVerifiedInThisRelease: false,
  priorityBasis: 'Refresh a dated inherited Union-minister roster before extending its public decision history',
  roles: ['official-roster-verifier', 'public-role-historian', 'independent-source-challenger'],
  output: 'Current official role and effective dates, retained departures/portfolio changes, exact public decisions and separately attributed case outcomes if material.',
  stopCondition: 'Unverified current role stays a dated historical entry; no allegation is required to complete the roster task.',
});
const packet = { schemaVersion: 1, cutoff: data.cutoff, executionStatus: 'planned-not-dispatched', inputHashes,
  inheritedRosterLimitations: cabinet.gaps, inheritedRosterAsOf: cabinet.asOf,
  metrics: { citySectorPackets: cities.reduce((n, city) => n + city.sectors.length, 0), publicActorPackets: data.actors.length, inheritedRosterRefreshPackets: cabinet.ministers.length, total: packets.length },
  interpretation: 'Acquisition workload, not discovered cases or hired agents. Duplicate source reads should be cached; independent challenges remain separate. Priority is not a misconduct probability.', packets };
const output = 'research/research-radar/agent-queue.json', serialized = `${JSON.stringify(packet, null, 2)}\n`;
if (process.argv.includes('--verify')) {
  if (readFileSync(output, 'utf8') !== serialized) throw new Error('Research acquisition queue is stale; regenerate deliberately after reviewing source changes.');
} else { mkdirSync('research/research-radar', { recursive: true }); writeFileSync(output, serialized); }
console.log(`Research queue: ${packet.metrics.citySectorPackets} city/sector + ${packet.metrics.publicActorPackets} public-role + ${packet.metrics.inheritedRosterRefreshPackets} inherited roster refresh packets; planned, not dispatched.`);
