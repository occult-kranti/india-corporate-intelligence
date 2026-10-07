#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { dirname, isAbsolute, join } from 'node:path';
import { validateDeepSlice } from '../deep-investigation/validate.mjs';
import { validateInvestigation, validateManifestRows, validateResearchSlice } from '../investigation/validate.mjs';
import { loadInvestigation } from '../investigation/load.mjs';
import { loadAllegations } from '../allegations-map/load.mjs';

export const METRO_SLICES = ['delhi-security', 'mumbai-security', 'defence', 'public-finance'];
export const METRO_CONTEXT_SLICES = ['tender-scan'];
export const METRO_CONTEXT_KINDS = new Set(['budget-allocation', 'budget-expenditure', 'expenditure-report', 'procurement-notice', 'contract-award', 'financial-statement', 'funding-release', 'procurement-context']);

function validateMetroManifest(path) {
  const manifest = JSON.parse(readFileSync(path, 'utf8'));
  const rows = manifest.artifacts ?? manifest.files;
  if (!Array.isArray(rows)) return [`${path}: archive artifact array required`];
  // Research archives may declare repository-relative or manifest-relative paths.
  // Preserve each recorded hash; this only resolves its explicitly retained file.
  const resolved = rows.map(row => ({ ...row, path: isAbsolute(row.path) || row.path.startsWith('research/') || row.path.startsWith('scripts/') || row.path.startsWith('docs/') ? row.path : join(dirname(path), row.path) }));
  return validateManifestRows(resolved);
}

/** Additional admission checks for the city review, beyond the shared schema. */
export function validateMetroSlice(raw, name) {
  const errors = validateDeepSlice(raw, `metro-${name}`);
  if (errors.length) return errors;
  const sources = new Map(raw.sources.map(row => [row.id, row]));
  const records = new Map(raw.records.map(row => [row.id, row]));
  const localities = new Map(raw.localities.map(row => [row.id, row]));
  const mentions = new Set(raw.entities.filter(row => row.type === 'source-mention').map(row => row.id));
  for (const entity of raw.entities) if (mentions.has(entity.id) && entity.canonicalId) errors.push(`${name}/${entity.id}: a documentary source mention cannot carry a legal-identity bridge`);
  for (const row of [...raw.entities, ...raw.relationships, ...raw.records]) {
    for (const geo of row.geography) {
      if (geo.scope === 'national' && (geo.stateCodes.length || geo.localityIds.length)) errors.push(`${name}/${row.id}: national money or context cannot acquire a city/state footprint`);
      if (geo.scope === 'city' && !geo.localityIds.length) errors.push(`${name}/${row.id}: city scope requires an explicit locality`);
      for (const id of geo.localityIds) {
        const locality = localities.get(id);
        if (!locality || !geo.stateCodes.includes(locality.stateCode)) errors.push(`${name}/${row.id}: locality ${id} lacks a matching declared state`);
      }
    }
    if (!row.sourceIds.some(id => sources.has(id))) errors.push(`${name}/${row.id}: retained source required`);
  }
  for (const edge of raw.relationships) {
    if ((mentions.has(edge.from) || mentions.has(edge.to)) && edge.kind !== 'attributed-procurement-mention') errors.push(`${name}/${edge.id}: unresolved legal names may only support explicit documentary-mention edges`);
    if (edge.tier !== 'alleged') continue;
    if (!edge.responseIds.length) errors.push(`${name}/${edge.id}: alleged relationship needs a linked response or an explicit response-gap record`);
    for (const id of edge.responseIds) {
      const response = records.get(id);
      if (response && !response.response?.trim() && !response.summary?.trim()) errors.push(`${name}/${edge.id}: empty linked response ${id}`);
    }
  }
  for (const row of raw.records) {
    if (METRO_CONTEXT_KINDS.has(row.kind) && row.tier === 'alleged') errors.push(`${name}/${row.id}: ordinary spending context cannot be an allegation`);
    for (const id of row.entityIds) if (!raw.entities.some(entity => entity.id === id)) errors.push(`${name}/${row.id}: missing entity ${id}`);
    for (const id of row.relationshipIds) if (!raw.relationships.some(edge => edge.id === id)) errors.push(`${name}/${row.id}: missing relationship ${id}`);
  }
  return errors;
}

export async function validateMetroSpending() {
  const errors = [];
  for (const name of METRO_SLICES) {
    const path = `research/raw/metro-spending/${name}.json`;
    const manifestPath = `research/raw/metro-spending/${name}-evidence/sha256-manifest.json`;
    if (!existsSync(path)) { errors.push(`Missing metro research slice ${name}`); continue; }
    const raw = JSON.parse(readFileSync(path, 'utf8'));
    errors.push(...validateMetroSlice(raw, name));
    if (!existsSync(manifestPath)) errors.push(`Missing metro source manifest ${name}`);
    else {
      errors.push(...validateMetroManifest(manifestPath));
    }
  }
  for (const name of METRO_CONTEXT_SLICES) {
    const path = `research/raw/metro-spending/${name}.json`;
    const manifestPath = `research/raw/metro-spending/${name}/sha256-manifest.json`;
    if (!existsSync(path)) { errors.push(`Missing metro context slice ${name}`); continue; }
    const raw = JSON.parse(readFileSync(path, 'utf8'));
    errors.push(...validateResearchSlice(raw, `metro-${name}`));
    if (raw.records.some(row => !METRO_CONTEXT_KINDS.has(row.kind) || row.tier === 'alleged')) errors.push(`${name}: dataset discovery cannot create an allegation or case`);
    if (raw.relationships.some(row => row.tier === 'alleged' || row.amounts.length)) errors.push(`${name}: dataset cohorts cannot create alleged money routes`);
    if (!existsSync(manifestPath)) errors.push(`Missing metro source manifest ${name}`);
    else errors.push(...validateMetroManifest(manifestPath));
  }
  if (errors.length) return errors;
  const { INVESTIGATION_REGISTRY: registry } = await loadInvestigation();
  const api = await loadAllegations();
  errors.push(...validateInvestigation(registry));
  const view = api.getAllegationsView(registry);
  const entries = new Set(view.entries.map(row => row.id));
  for (const name of [...METRO_SLICES, ...METRO_CONTEXT_SLICES]) {
    const namespace = `metro-${name}`;
    if (!registry.coverage.some(row => row.namespace === namespace)) errors.push(`Missing integrated namespace ${namespace}`);
    for (const record of registry.records.filter(row => row.namespace === namespace)) {
      if (record.kind === 'investigation-case' && !entries.has(record.id)) errors.push(`${record.id}: reviewed case missing from new cohort`);
      if (METRO_CONTEXT_KINDS.has(record.kind) && entries.has(record.id)) errors.push(`${record.id}: ordinary context inflated allegation index`);
    }
  }
  if (view.missingIds.length) errors.push(`Metro review lost evidence closure: ${view.missingIds.join(', ')}`);
  for (const entry of view.entries.filter(row => row.id.startsWith('metro-'))) {
    for (const id of entry.responseIds) if (!view.records.some(row => row.id === id)) errors.push(`${entry.id}: dropped response ${id}`);
  }
  return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const errors = await validateMetroSpending();
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else {
    const { INVESTIGATION_REGISTRY: registry } = await loadInvestigation();
    const records = registry.records.filter(row => row.namespace.startsWith('metro-'));
    console.log(`Metro spending validated: ${records.filter(row => row.kind === 'investigation-case').length} case files, ${records.filter(row => METRO_CONTEXT_KINDS.has(row.kind)).length} ordinary funding/procurement records; exact source, city and response joins preserved.`);
  }
}
