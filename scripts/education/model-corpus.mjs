#!/usr/bin/env node
// Model inputs are public researcher summaries, never invented full-document text.
import fs from 'node:fs';
import path from 'node:path';

const input = process.argv[2] ?? 'src/data/education-research.json';
const output = process.argv[3] ?? 'research/education/model-corpus.json';
const registry = JSON.parse(fs.readFileSync(input, 'utf8'));
if (!Array.isArray(registry.sources) || registry.sources.length === 0) {
  throw new Error('An evidence registry with source records is required before running the model.');
}
const corpus = {
  schemaVersion: 1,
  evidenceAsOf: registry.updatedAt,
  sourceRegistry: input,
  inputKind: 'Public researcher-authored source summaries and limitations; not full documents',
  documents: [...registry.sources].sort((a, b) => a.id.localeCompare(b.id)).map(source => {
    if (![source.id, source.title, source.summary, source.url].every(value => typeof value === 'string' && value.trim())) {
      throw new Error('Each source requires an id, title, summary and URL.');
    }
    return {
      id: source.id,
      title: source.title,
      text: [source.summary, ...(source.limitations ?? [])].join(' '),
      url: source.url,
      evidenceTier: source.tier,
      retrievedAt: source.retrievedAt,
    };
  }),
};
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(corpus, null, 2)}\n`);
console.log(`Prepared ${corpus.documents.length} public evidence summaries at ${output}.`);
