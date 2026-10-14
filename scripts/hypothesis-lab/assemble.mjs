#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { REVIEW_DATE, TRACKS, RESEARCH_ROOT, validateAll } from './validate.mjs';

const { streams, errors } = validateAll();
if (errors.length) throw new Error(`Hypothesis bundle was not written:\n${errors.join('\n')}`);
const sources = streams.flatMap(stream => stream.sources);
const cases = streams.flatMap(stream => stream.cases);
const output = {
  schemaVersion: 1,
  reviewDate: REVIEW_DATE,
  historicalWindow: { from: '2014-05-26', through: REVIEW_DATE, interpretation: 'Selected research into Modi Union administrations; earlier dated context retained. Not complete annual or sector coverage.' },
  streamHashes: TRACKS.map(track => {
    const path = `${RESEARCH_ROOT}/streams/${track}.json`;
    return { path, sha256: createHash('sha256').update(readFileSync(path)).digest('hex') };
  }),
  counts: {
    streams: streams.length, cases: cases.length, sources: sources.length,
    distinctUrls: new Set(sources.map(source => source.url)).size,
    sourceFamilies: new Set(sources.map(source => source.sourceFamily)).size,
    entities: streams.reduce((sum, stream) => sum + stream.entities.length, 0),
    edges: streams.reduce((sum, stream) => sum + stream.edges.length, 0),
    proposedLinks: cases.reduce((sum, item) => sum + item.hypothesis.proposedLinks.length, 0),
    tests: cases.reduce((sum, item) => sum + item.hypothesis.tests.length, 0),
    coverageEntries: streams.reduce((sum, stream) => sum + stream.coverage.length, 0),
    rejectedJoins: streams.reduce((sum, stream) => sum + stream.rejectedJoins.length, 0),
  },
  streams,
};
const bytes = `${JSON.stringify(output, null, 2)}\n`;
const path = `${RESEARCH_ROOT}/bundle.json`;
if (process.argv.includes('--verify')) {
  if (readFileSync(path, 'utf8') !== bytes) throw new Error('Hypothesis bundle is stale: assemble the reviewed streams before building. Verification did not mutate any file.');
  console.log('Hypothesis bundle is current:', JSON.stringify(output.counts));
} else {
  writeFileSync(path, bytes);
  console.log('Assembled hypothesis bundle:', JSON.stringify(output.counts));
}
