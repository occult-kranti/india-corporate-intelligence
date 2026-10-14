#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';

const root = 'research/raw/research-radar';
const inputs = ['national', 'north', 'south-east', 'west'].map(name => `${root}/${name}.json`);
const regions = inputs.map(path => ({ path, raw: readFileSync(path) })).map(input => ({ ...input, value: JSON.parse(input.raw) }));
if (regions.length !== 4) throw new Error('Expected exactly four final research source catalogs before model inference');
const documents = regions.flatMap(({ value }) => {
  if (!Array.isArray(value.sources) || !value.sources.length || !Array.isArray(value.cases) || !value.cases.length) throw new Error(`Empty regional handoff: ${value.region}`);
  const sourceById = new Map(value.sources.map(source => [source.id, source]));
  const sourceDocuments = value.sources.map(source => ({
    id: `${source.id}:model-source`, sourceId: source.id, region: value.region, inputType: 'source-summary',
    title: source.title, text: [source.summary, source.locator, ...(source.limitations ?? [])].filter(Boolean).join(' '),
    url: source.url, publishedAt: source.publishedAt, retrievedAt: source.retrievedAt,
    family: source.family, access: source.access,
  }));
  const caseDocuments = value.cases.map(item => {
    const citations = item.sourceIds.map(id => sourceById.get(id));
    if (!citations.length || citations.some(source => !source)) throw new Error(`Case without resolvable source: ${item.id}`);
    return {
      id: `${item.id}:model-case`, caseId: item.id, region: value.region, inputType: 'case-summary',
      title: item.title,
      text: [item.question, item.summary, ...item.observations.map(row => row.text), 'Counterevidence:', ...item.counterevidence.map(row => row.text), 'Unvalidated scenario:', item.scenario.target, 'Alternatives:', ...item.scenario.alternatives, 'Falsifiers:', ...item.scenario.falsifiers].join(' '),
      url: citations[0].url, sourceIds: item.sourceIds, updatedAt: item.updatedAt,
      family: [...new Set(citations.map(source => source.family))],
    };
  });
  return [...sourceDocuments, ...caseDocuments];
}).sort((a, b) => a.id.localeCompare(b.id));
if (documents.length > 2000) throw new Error('New-release source/case summary corpus exceeds the original model guard');
if (new Set(documents.map(row => row.id)).size !== documents.length) throw new Error('Duplicate model document ID');
const corpus = {
  schemaVersion: 1, researchCutoff: '2026-10-07',
  inputKind: 'Authored public source summaries, locators, limitations and case summaries with counterevidence. Full documents, private records and bank ledgers are not model inputs.',
  scope: 'Only the three regional catalogs and national-institution catalog retained in this release. Not a national representative sample or complete archive.',
  lineageLimitation: 'Case/source summaries and repeated sources are dependent descriptions; neither matching counts nor scores establish independent corroboration.',
  sourceRegistries: regions.map(({ path, raw }) => ({ path, sha256: createHash('sha256').update(raw).digest('hex') })),
  uniqueCitationUrls: new Set(documents.map(row => row.url)).size,
  sourceSummaryCount: documents.filter(row => row.inputType === 'source-summary').length,
  caseSummaryCount: documents.filter(row => row.inputType === 'case-summary').length,
  documents,
};
const path = 'research/research-radar/model-corpus.json';
const output = JSON.stringify(corpus, null, 2) + '\n';
if (process.argv.includes('--verify')) {
  if (readFileSync(path, 'utf8') !== output) throw new Error('Research-radar corpus changed; regenerate and rerun inference');
  console.log(`Verified ${documents.length} retained source/case summaries and all four exact input hashes.`);
} else {
  mkdirSync('research/research-radar', { recursive: true });
  writeFileSync(path, output);
  console.log(`Prepared ${corpus.sourceSummaryCount} source and ${corpus.caseSummaryCount} case summaries; ${corpus.uniqueCitationUrls} distinct citations.`);
}
