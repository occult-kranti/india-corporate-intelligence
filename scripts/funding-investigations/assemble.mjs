import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = 'research/funding-investigations';
const files = readdirSync(`${root}/streams`).filter(name => name.endsWith('.json')).sort();
if (files.length !== 5) throw new Error(`Expected all five reviewed research streams, found ${files.length}`);
execFileSync('python3', ['scripts/funding-investigations/validate.py'], { stdio: 'inherit' });
const streams = files.map(name => JSON.parse(readFileSync(`${root}/streams/${name}`, 'utf8')));
const sources = streams.flatMap(row => row.sources);
const output = {
  schemaVersion: 1,
  reviewDate: '2026-10-08',
  historicalWindow: { from: '2011-10-08', through: '2026-10-08', interpretation: 'Research scope, not complete annual coverage or a historical forecast benchmark.' },
  streamHashes: files.map(name => ({ path: `${root}/streams/${name}`, sha256: createHash('sha256').update(readFileSync(`${root}/streams/${name}`)).digest('hex') })),
  counts: { streams: streams.length, cases: streams.reduce((sum, row) => sum + row.cases.length, 0), sources: sources.length, distinctUrls: new Set(sources.map(row => row.url)).size, sourceFamilies: new Set(sources.map(row => row.sourceFamily)).size, entities: streams.reduce((sum, row) => sum + row.entities.length, 0), edges: streams.reduce((sum, row) => sum + row.edges.length, 0), coverageEntries: streams.reduce((sum, row) => sum + row.coverage.length, 0), rejectedJoins: streams.reduce((sum, row) => sum + row.rejectedJoins.length, 0) },
  streams,
};
const bytes = `${JSON.stringify(output, null, 2)}\n`;
if (process.argv.includes('--verify')) {
  if (readFileSync(`${root}/bundle.json`, 'utf8') !== bytes) throw new Error('Funding bundle differs from current validated streams; assemble it before building.');
  console.log('Funding bundle is current:', JSON.stringify(output.counts));
} else {
  writeFileSync(`${root}/bundle.json`, bytes);
  console.log('Assembled funding bundle:', JSON.stringify(output.counts));
}
