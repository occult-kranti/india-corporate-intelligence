#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { METRO_SLICES, METRO_CONTEXT_SLICES } from './validate.mjs';

const retainedPath = 'research/allegations-map/model-corpus.json';
const retainedBytes = readFileSync(retainedPath);
const retained = JSON.parse(retainedBytes);
const inputs = [...METRO_SLICES, ...METRO_CONTEXT_SLICES].map(name => ({ namespace: `metro-${name}`, path: `research/raw/metro-spending/${name}.json` }));
const registries = inputs.map(input => { const bytes = readFileSync(input.path); return { ...input, sha256: createHash('sha256').update(bytes).digest('hex'), value: JSON.parse(bytes) }; });
const newDocuments = registries.flatMap(({ namespace, value }) => value.sources.map(source => ({
  id: `${namespace}:source:${source.id}`, sourceId: `${namespace}:source:${source.id}`, namespace,
  title: source.title, text: [source.summary, ...source.limitations].join(' '), url: source.url,
  evidenceTier: source.tier, retrievedAt: source.retrievedAt,
})));
const documents = [...retained.documents, ...newDocuments].sort((a, b) => a.id.localeCompare(b.id));
if (new Set(documents.map(row => row.id)).size !== documents.length) throw new Error('Duplicate discovery source identity');
const corpus = {
  schemaVersion: 1, evidenceAsOf: '2026-10-07',
  sourceRegistries: [
    { path: retainedPath, sha256: createHash('sha256').update(retainedBytes).digest('hex'), namespace: 'retained-authored-summaries' },
    ...registries.map(({ path, sha256, namespace }) => ({ path, sha256, namespace })),
  ],
  inputKind: 'Public researcher-authored summaries and source limitations from the Delhi/Mumbai review and the frozen prior discovery corpus. No full document or bank-ledger analysis is asserted.',
  lineageLimitation: 'Repeated source URLs and related summaries are not independent corroboration. Ranking is a research aid, not proof of identity, payment or wrongdoing.',
  uniqueSourceUrls: new Set(documents.map(row => row.url)).size,
  documents,
};
const path = 'research/metro-spending/model-corpus.json', output = `${JSON.stringify(corpus, null, 2)}\n`;
if (process.argv.includes('--verify')) {
  if (readFileSync(path, 'utf8') !== output) throw new Error('Metro discovery corpus changed: regenerate and execute inference');
  console.log(`Verified ${documents.length} exact public summaries including ${newDocuments.length} metro sources.`);
} else {
  mkdirSync('research/metro-spending', { recursive: true }); writeFileSync(path, output);
  console.log(`Prepared ${documents.length} summaries, including ${newDocuments.length} new metro sources.`);
}
