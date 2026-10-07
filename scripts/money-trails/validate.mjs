#!/usr/bin/env node
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validateDeepSlice } from '../deep-investigation/validate.mjs';
import { loadInvestigation } from '../investigation/load.mjs';
import { loadMoneyTrails } from './load.mjs';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
export const MONEY_TRAIL_TOPICS = ['djb', 'mumbai', 'corporate'];
const bases = new Set(['documented-financial-disclosure', 'court-recorded-agency-allegation', 'agency-published-allegation', 'judicial-procedural-finding', 'accounting-reconciliation', 'contract-commitment', 'ownership-role-context', 'unresolved-cash-path-stop']);
const flowStates = new Set(['documented-transfer', 'reported-transfer', 'alleged-transfer', 'commitment', 'context', 'gap']);
const kinds = { entity: 'entities', relationship: 'relationships', record: 'records', source: 'sources' };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.trim().length > 0;
const strings = value => Array.isArray(value) && value.every(text);
const date = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/u.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const duplicates = values => values.length !== new Set(values).size;

/** Targeted structured privacy checks; source artifacts are independently scanned below. */
export function validateMoneyTrailPrivacy(value, label = 'money trails') {
  const errors = [];
  const visit = (row, path) => {
    if (Array.isArray(row)) return row.forEach((entry, index) => visit(entry, `${path}[${index}]`));
    if (object(row)) return Object.entries(row).forEach(([key, entry]) => {
      if (/^(?:bankAccountNumber|accountNumber|aadhaar|aadhar|passportNumber|privateAddress|personalPhone|personalEmail)$/iu.test(key) && entry) errors.push(`${path}.${key}: private identity/account field is prohibited`);
      visit(entry, `${path}.${key}`);
    });
    if (typeof row === 'string' && /(?:account\s*(?:number|no\.?|#)|a\/c\s*(?:no\.?|#))\s*[:=]?\s*\d[\d -]{7,}\d/iu.test(row)) errors.push(`${path}: unredacted bank-account identifier`);
  };
  visit(value, label);
  return errors;
}

export function validateMoneyTrailCatalog(catalog, registry) {
  const errors = [], fail = message => errors.push(message);
  if (!object(catalog)) return ['Money-trail catalog object required'];
  if (catalog.schemaVersion !== 1 || !/^money-trails-[a-z0-9-]+$/u.test(catalog.namespace ?? '') || !date(catalog.cutoff)) fail('Money-trail schemaVersion, namespace and exact cutoff required');
  for (const key of ['trails', 'hops', 'hypotheses']) if (!Array.isArray(catalog[key]) || catalog[key].some(row => !object(row))) fail(`${key}: object array required`);
  if (errors.length) return errors;
  const maps = Object.fromEntries(Object.entries(kinds).map(([kind, key]) => [kind, new Map((registry?.[key] ?? []).map(row => [row.id, row]))]));
  const allIds = [];
  for (const [key, kind] of [['trails', 'trail'], ['hops', 'hop'], ['hypotheses', 'hypothesis']]) for (const row of catalog[key]) {
    if (!new RegExp(`^${catalog.namespace}:${kind}:[a-z0-9][a-z0-9-]*$`, 'u').test(row.id ?? '')) fail(`${row.id}: stable namespaced ${kind} ID required`);
    allIds.push(row.id);
  }
  if (duplicates(allIds)) fail('Duplicate money-trail identifiers');
  const hopIds = new Set(catalog.hops.map(row => row.id)), hypothesisIds = new Set(catalog.hypotheses.map(row => row.id));
  const ref = (kind, id, label) => { if (!maps[kind]?.has(id)) fail(`${label}: missing ${kind} ${id}`); };
  const requireText = (row, fields) => fields.forEach(field => { if (!text(row[field])) fail(`${row.id}: ${field} must explain this evidence`); });
  const requireArrays = (row, fields) => fields.forEach(field => { if (!strings(row[field])) fail(`${row.id}: ${field} string array required`); });
  for (const trail of catalog.trails) {
    requireText(trail, ['title', 'caseRecordId', 'question', 'conclusion', 'sourceStatus']);
    requireArrays(trail, ['hopIds', 'hypothesisIds', 'limitations']);
    if (!date(trail.cutoff) || trail.cutoff > catalog.cutoff) fail(`${trail.id}: review cutoff invalid or beyond catalog cutoff`);
    if (!['delhi', 'mumbai', 'national', 'multi-city'].includes(trail.city)) fail(`${trail.id}: explicit city scope required`);
    ref('record', trail.caseRecordId, trail.id);
    if (maps.record.get(trail.caseRecordId)?.kind !== 'investigation-case') fail(`${trail.id}: exact investigation-case record required`);
    if (!trail.hopIds?.length) fail(`${trail.id}: authored ordered hop IDs required`);
    if (Array.isArray(trail.hopIds)) { if (duplicates(trail.hopIds)) fail(`${trail.id}: repeated hop would double count an evidence step`); for (const id of trail.hopIds) if (!hopIds.has(id)) fail(`${trail.id}: missing hop ${id}`); }
    if (Array.isArray(trail.hypothesisIds)) for (const id of trail.hypothesisIds) if (!hypothesisIds.has(id)) fail(`${trail.id}: missing hypothesis ${id}`);
  }
  for (const hop of catalog.hops) {
    requireText(hop, ['title', 'summary', 'dateBasis', 'financialStage', 'response', 'missingNextDocument', 'documentHolder']);
    const arrayFields = ['entityIds', 'relationshipIds', 'recordIds', 'sourceIds', 'responseRecordIds', 'counterEvidenceRecordIds', 'alternatives', 'limitations'];
    requireArrays(hop, arrayFields);
    if (!bases.has(hop.basis) || !flowStates.has(hop.flowState)) fail(`${hop.id}: evidence basis and financial flow state must be explicit`);
    if (hop.date !== null && (!date(hop.date) || hop.date > catalog.cutoff)) fail(`${hop.id}: invalid exact event date or beyond cutoff; use null and dateBasis for intervals`);
    if (!Array.isArray(hop.amountRefs) || hop.amountRefs.some(row => !object(row))) fail(`${hop.id}: amountRefs object array required`);
    if (!Array.isArray(hop.sourceLocators) || hop.sourceLocators.some(row => !object(row))) fail(`${hop.id}: sourceLocators object array required`);
    if (arrayFields.some(field => !strings(hop[field])) || !Array.isArray(hop.amountRefs) || !Array.isArray(hop.sourceLocators)) continue;
    for (const [field, kind] of [['entityIds', 'entity'], ['relationshipIds', 'relationship'], ['recordIds', 'record'], ['sourceIds', 'source'], ['responseRecordIds', 'record'], ['counterEvidenceRecordIds', 'record']]) {
      if (duplicates(hop[field])) fail(`${hop.id}: duplicate ${field}`);
      for (const id of hop[field]) ref(kind, id, hop.id);
    }
    for (const field of ['fromEntityId', 'toEntityId']) if (hop[field] !== null) { ref('entity', hop[field], hop.id); if (!hop.entityIds.includes(hop[field])) fail(`${hop.id}: ${field} must occur in entityIds`); }
    if (!hop.sourceIds.length || !hop.sourceLocators.length) fail(`${hop.id}: every step including a gap needs bounded source context`);
    for (const locator of hop.sourceLocators) {
      if (!object(locator)) continue;
      if (!hop.sourceIds.includes(locator.sourceId) || !text(locator.locator) || !['supports', 'counterevidence', 'response', 'limitation'].includes(locator.role)) fail(`${hop.id}: exact source locator, role and source join required`);
    }
    for (const id of hop.sourceIds) if (!hop.sourceLocators.some(row => row?.sourceId === id)) fail(`${hop.id}: missing locator for ${id}`);
    if (hop.flowState === 'gap' || hop.basis === 'unresolved-cash-path-stop') {
      if (hop.flowState !== 'gap' || hop.basis !== 'unresolved-cash-path-stop' || hop.relationshipIds.length || hop.amountRefs.length) fail(`${hop.id}: a cash-path gap must not create an edge or amount`);
    }
    if (['ownership-role-context', 'judicial-procedural-finding'].includes(hop.basis) && hop.flowState !== 'context') fail(`${hop.id}: role/ownership or procedural finding is not a cash transfer`);
    if (hop.basis === 'contract-commitment' && !['commitment', 'context'].includes(hop.flowState)) fail(`${hop.id}: contract commitment cannot be promoted to payment`);
    if (['court-recorded-agency-allegation', 'agency-published-allegation'].includes(hop.basis) && hop.flowState === 'documented-transfer') fail(`${hop.id}: publishing an agency allegation does not establish a documented transfer`);
    if (['documented-transfer', 'reported-transfer', 'alleged-transfer', 'commitment'].includes(hop.flowState)) {
      if (!hop.relationshipIds.length || !hop.fromEntityId || !hop.toEntityId) fail(`${hop.id}: a financial step needs an exact existing relationship and endpoints`);
      for (const id of hop.relationshipIds) {
        const edge = maps.relationship.get(id);
        if (edge && (edge.from !== hop.fromEntityId || edge.to !== hop.toEntityId)) fail(`${hop.id}: ${id} does not match the explicit financial direction`);
        if (edge && /identity|ownership|shareholding|official-role|ministerial-role|directorship/iu.test(edge.kind)) fail(`${hop.id}: identity or role relationship cannot be a financial step`);
        if (edge && hop.flowState === 'documented-transfer' && edge.tier !== 'documented') fail(`${hop.id}: non-documentary relationship cannot be promoted to documented transfer`);
      }
    }
    const amountKeys = [];
    for (const amountRef of hop.amountRefs) {
      if (!object(amountRef)) continue;
      if (!['record', 'relationship'].includes(amountRef.kind) || !Number.isInteger(amountRef.amountIndex) || amountRef.amountIndex < 0) { fail(`${hop.id}: typed exact amount index required`); continue; }
      ref(amountRef.kind, amountRef.id, hop.id);
      if (!(amountRef.kind === 'record' ? hop.recordIds : hop.relationshipIds).includes(amountRef.id)) fail(`${hop.id}: amount owner must be explicitly part of this step`);
      const owner = maps[amountRef.kind].get(amountRef.id), amount = owner?.amounts?.[amountRef.amountIndex];
      if (!amount || !Number.isFinite(amount.value) || ['currency', 'unit', 'stage', 'period'].some(key => !text(amount[key]))) fail(`${hop.id}: missing amount or financial-stage provenance`);
      if (owner && !owner.sourceIds.some(id => hop.sourceIds.includes(id))) fail(`${hop.id}: amount's original source must remain attached to this step`);
      if (amount && hop.flowState === 'documented-transfer' && /(?:sanction|approval|accepted bid|commitment|undrawn|not drawn|not payment|ceiling|guarantee)/iu.test(amount.stage)) fail(`${hop.id}: ${amount.stage} cannot be a documented transfer`);
      amountKeys.push(`${amountRef.kind}:${amountRef.id}:${amountRef.amountIndex}`);
    }
    if (duplicates(amountKeys)) fail(`${hop.id}: duplicate amount reference would repeat a financial amount`);
    if (hop.flowState === 'documented-transfer' && !hop.amountRefs.length) fail(`${hop.id}: documented transfer requires retained financial disclosure, not adjacency`);
  }
  for (const hypothesis of catalog.hypotheses) {
    requireText(hypothesis, ['question', 'observation', 'disconfirmationTest', 'documentHolder']);
    requireArrays(hypothesis, ['expectedDocumentaryFootprints', 'neededRecords', 'limitations']);
    if (!hypothesis.expectedDocumentaryFootprints?.length || !hypothesis.neededRecords?.length) fail(`${hypothesis.id}: testable documentary footprint and next records required`);
    if (!['open', 'supported-with-limits', 'weakened', 'refuted'].includes(hypothesis.status)) fail(`${hypothesis.id}: bounded hypothesis status required`);
    for (const field of ['supportingEvidence', 'refutingEvidence']) {
      if (!Array.isArray(hypothesis[field]) || hypothesis[field].some(row => !object(row))) { fail(`${hypothesis.id}: ${field} exact reference array required`); continue; }
      for (const item of hypothesis[field]) ref(item.kind, item.id, hypothesis.id);
    }
    if (/\b(?:step[- ]by[- ]step evasion|how to hide (?:payments|money)|instructions? (?:for|to) conceal|avoid detection by (?:splitting|routing))\b/iu.test(JSON.stringify(hypothesis))) fail(`${hypothesis.id}: operational evasion instructions are not an investigative hypothesis`);
  }
  return [...errors, ...validateMoneyTrailPrivacy(catalog)];
}

export function validateMoneyTrailManifest(manifest, requiredSourceIds, root = ROOT) {
  const errors = [];
  if (!object(manifest) || !Array.isArray(manifest.artifacts) || !manifest.artifacts.length || !Array.isArray(manifest.sourceArtifacts)) return ['Money-trail archive needs artifacts and sourceArtifacts provenance bindings'];
  const artifacts = new Map(), checked = new Set();
  for (const row of manifest.artifacts) {
    if (!object(row) || !text(row.path) || isAbsolute(row.path) || !/^[a-f0-9]{64}$/u.test(row.sha256 ?? '') || !Number.isInteger(row.bytes) || row.bytes < 0) { errors.push('Archive artifact requires repository-relative path, bytes and SHA-256'); continue; }
    if (artifacts.has(row.path)) errors.push(`Duplicate archive artifact ${row.path}`);
    artifacts.set(row.path, row);
    const path = resolve(root, row.path);
    if (relative(root, path).startsWith('..') || !existsSync(path) || relative(root, realpathSync(path)).startsWith('..')) { errors.push(`Unavailable or out-of-repository archive ${row.path}`); continue; }
    const bytes = readFileSync(path);
    if (bytes.length !== row.bytes || createHash('sha256').update(bytes).digest('hex') !== row.sha256) { errors.push(`Archive digest mismatch ${row.path}`); continue; }
    checked.add(row.path);
    if (/\.(?:txt|json|html|md)$/u.test(path)) errors.push(...validateMoneyTrailPrivacy(bytes.toString('utf8'), row.path));
  }
  const bound = new Set();
  for (const binding of manifest.sourceArtifacts) {
    if (!object(binding) || !text(binding.sourceId) || !strings(binding.paths) || !binding.paths.length) { errors.push('Source-to-artifact binding needs sourceId and retained paths'); continue; }
    if (bound.has(binding.sourceId)) errors.push(`Duplicate source-artifact binding ${binding.sourceId}`);
    bound.add(binding.sourceId);
    for (const path of binding.paths) if (!artifacts.has(path) || !checked.has(path)) errors.push(`${binding.sourceId}: source artifact unavailable or not hash verified: ${path}`);
  }
  for (const sourceId of requiredSourceIds) if (!bound.has(sourceId)) errors.push(`${sourceId}: missing archived source binding`);
  return errors;
}

export async function validateMoneyTrails() {
  const errors = [], catalogs = [];
  for (const topic of MONEY_TRAIL_TOPICS) {
    const folder = resolve(ROOT, 'research/raw/money-trails', topic);
    for (const file of ['slice.json', 'trails.json', 'sha256-manifest.json']) if (!existsSync(resolve(folder, file))) errors.push(`Missing money-trail ${topic}/${file}`);
    if (!existsSync(resolve(folder, 'slice.json')) || !existsSync(resolve(folder, 'trails.json')) || !existsSync(resolve(folder, 'sha256-manifest.json'))) continue;
    const raw = JSON.parse(readFileSync(resolve(folder, 'slice.json'), 'utf8')), catalog = JSON.parse(readFileSync(resolve(folder, 'trails.json'), 'utf8'));
    errors.push(...validateDeepSlice(raw, `money-trails-${topic}`), ...validateMoneyTrailPrivacy(raw, topic));
    const requiredSources = new Set([...raw.sources.map(row => `money-trails-${topic}:source:${row.id}`), ...(catalog.hops ?? []).flatMap(hop => hop.sourceIds ?? []), ...(catalog.hypotheses ?? []).flatMap(row => [...row.supportingEvidence ?? [], ...row.refutingEvidence ?? []]).filter(row => row.kind === 'source').map(row => row.id)]);
    errors.push(...validateMoneyTrailManifest(JSON.parse(readFileSync(resolve(folder, 'sha256-manifest.json'), 'utf8')), requiredSources));
    catalogs.push(catalog);
  }
  const { INVESTIGATION_REGISTRY: registry } = await loadInvestigation(), api = await loadMoneyTrails();
  const imported = new Set(api.MONEY_TRAIL_CATALOGS.map(catalog => catalog.namespace));
  for (const catalog of catalogs) {
    errors.push(...validateMoneyTrailCatalog(catalog, registry));
    if (!imported.has(catalog.namespace)) errors.push(`${catalog.namespace}: reviewed catalog missing from app`);
    if (!registry.coverage.some(row => row.namespace === catalog.namespace)) errors.push(`${catalog.namespace}: slice not integrated into registry`);
    for (const trail of catalog.trails) {
      const packet = api.exportMoneyTrailEvidence(registry, trail.id, [catalog]);
      if (!packet || packet.missingIds.length) errors.push(`${trail.id}: incomplete provenance closure ${packet?.missingIds.join(', ') ?? 'missing packet'}`);
    }
  }
  return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const errors = await validateMoneyTrails();
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else { const api = await loadMoneyTrails(); console.log(`Money trails validated: ${api.MONEY_TRAILS.length} authored investigations; exact joins, source hashes, stage separation and response closure checked.`); }
}
