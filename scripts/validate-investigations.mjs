import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const dossiers = ['funding', 'procurement', 'institutions'];
const sourceIds = new Set();
const caseIds = new Set();
const cases = [];
const sources = [];
const digests = {};
for (const name of dossiers) {
  const bytes = readFileSync(new URL(`../research/investigations/${name}.json`, import.meta.url));
  digests[name] = createHash('sha256').update(bytes).digest('hex');
  const data = JSON.parse(bytes);
  assert(Array.isArray(data.cases) && Array.isArray(data.sources), `${name}: arrays required`);
  cases.push(...data.cases); sources.push(...data.sources);
}
const text = (value, context) => assert(typeof value === 'string' && value.trim(), `${context}: nonempty text required`);
for (const source of sources) {
  assert(!sourceIds.has(source.id), `duplicate source id ${source.id}`);
  sourceIds.add(source.id);
  for (const key of ['id', 'title', 'publisher', 'url', 'date', 'access', 'supports', 'accessedAt']) text(source[key], `${source.id}.${key}`);
  assert(['full-text', 'search-excerpt', 'index-only', 'pdf-visual'].includes(source.access), `${source.id}: disclose access depth`);
  const url = new URL(source.url);
  assert(url.protocol === 'https:' && !url.username && !url.password, `${source.id}: public HTTPS URL required`);
  assert(/^\d{4}-\d{2}-\d{2}$/.test(source.accessedAt), `${source.id}: access date required`);
}
for (const record of cases) {
  assert(!caseIds.has(record.id), `duplicate dossier id ${record.id}`);
  caseIds.add(record.id);
  for (const key of ['id', 'title', 'sector', 'status', 'summary', 'finding', 'limitation']) text(record[key], `${record.id}.${key}`);
  assert(['documented', 'allegation', 'open-question'].includes(record.status), `${record.id}: unknown status`);
  assert(record.sources.length > 0, `${record.id}: must cite a source`);
  for (const id of record.sources) assert(sourceIds.has(id), `${record.id}: missing source ${id}`);
  assert(new Set(record.sources).size === record.sources.length, `${record.id}: duplicate citations`);
  assert(record.entities.length > 0 && record.entities.every(x => typeof x === 'string' && x.trim()), `${record.id}: subject labels required`);
  assert(record.hypotheses.length > 0, `${record.id}: no testable question`);
  for (const hypothesis of record.hypotheses) {
    for (const key of ['question', 'prediction', 'alternative', 'falsifier', 'records']) text(hypothesis[key], `${record.id}.hypothesis.${key}`);
  }
}
console.log(JSON.stringify({ gate: 'investigation-schema', cases: cases.length, sources: sources.length, hypotheses: cases.reduce((n,c)=>n+c.hypotheses.length,0), statuses: Object.fromEntries(['documented','allegation','open-question'].map(status=>[status,cases.filter(c=>c.status===status).length])), sourceAccess: Object.fromEntries([...new Set(sources.map(s=>s.access))].map(access=>[access,sources.filter(s=>s.access===access).length])), sha256: digests }, null, 2));
