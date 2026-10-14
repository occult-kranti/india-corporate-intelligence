import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const outputPath = 'research/research-radar/fine-tuning/dataset.json';
const labelsPath = 'research/research-radar/fine-tuning/train-dev-labels.json';
const sourcePaths = ['national', 'north', 'south-east', 'west'].map(region => `research/raw/research-radar/${region}.json`);
const testCases = new Set(['radar-north:lucknow-smart-meter', 'radar-west:ports-case', 'radar-west:goa-case', 'radar-south-east:case:kiifb-publicity', 'radar-national:case:psb-writeoffs']);
const devCases = new Set(['radar-north:delhi-procurement', 'radar-south-east:case:bmrcl-finance', 'radar-south-east:case:hal-engine-delivery', 'radar-national:case:navy-lease']);
const aliases = [
  { key: 'material-party:adani-enterprises-limited', label: 'Adani Enterprises Limited', cases: ['radar-west:tara-case', 'radar-west:shivpuri-case'], rationale: 'Exact company is materially named in both projects; keep both cases in training. The Tara bidder identity remains unresolved; this grouping prevents shared ownership-context leakage and does not assert that identity join.' },
  { key: 'material-party:ministry-of-defence', label: 'Ministry of Defence', cases: ['radar-south-east:case:hal-engine-delivery', 'radar-national:case:navy-lease'], rationale: 'Same exact public procuring ministry is materially named in the two defence cases; keep both in development.' },
];
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = rel => fs.readFileSync(path.join(root, rel));
const normalize = s => s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const splitFor = caseId => testCases.has(caseId) ? 'test' : devCases.has(caseId) ? 'dev' : 'train';
const groupFor = caseId => aliases.find(a => a.cases.includes(caseId))?.key ?? `case:${caseId}`;

export function buildDataset() {
  const catalogs = sourcePaths.map(p => JSON.parse(read(p)));
  const cases = catalogs.flatMap(c => c.cases);
  const sourceRows = catalogs.flatMap(c => c.sources);
  const labels = JSON.parse(read(labelsPath));
  const caseById = new Map(cases.map(c => [c.id, c]));
  const sourceCases = new Map();
  for (const c of cases) for (const sourceId of c.sourceIds) {
    sourceCases.set(sourceId, [...(sourceCases.get(sourceId) ?? []), c.id]);
  }
  for (const alias of aliases) for (const caseId of alias.cases) {
    assert(caseById.get(caseId)?.entities.some(e => e.label === alias.label), `Declared material-party group lost exact label: ${caseId}: ${alias.label}`);
  }
  const documents = sourceRows.map(source => {
    const caseIds = sourceCases.get(source.id) ?? [];
    assert(caseIds.length === 1, `Expected one source-case scope: ${source.id}`);
    const text = `${source.title}\n${source.summary}\nLocator: ${source.locator}\nLimitations: ${source.limitations.join(' ')}`;
    return {
      id: source.id, sourceId: source.id, title: source.title, text, url: source.url,
      caseIds, split: splitFor(caseIds[0]), groupId: groupFor(caseIds[0]),
      family: source.family, kind: source.kind, access: source.access,
      publishedAt: source.publishedAt, retrievedAt: source.retrievedAt,
      summary: source.summary, locator: source.locator, limitations: source.limitations,
    };
  }).sort((a, b) => a.id.localeCompare(b.id));
  const splitGroups = [...new Set(cases.map(c => groupFor(c.id)))].sort().map(groupId => {
    const groupedCases = cases.filter(c => groupFor(c.id) === groupId);
    const groupedDocs = documents.filter(d => d.groupId === groupId);
    return {
      id: groupId, split: splitFor(groupedCases[0].id),
      caseIds: groupedCases.map(c => c.id).sort(),
      documentIds: groupedDocs.map(d => d.id).sort(),
      sourceFamilies: [...new Set(groupedDocs.map(d => d.family))].sort(),
      materialParty: aliases.find(a => a.key === groupId) ?? null,
    };
  });
  const dataset = {
    schemaVersion: 1, task: 'supervised-source-retrieval', researchCutoff: '2026-10-07',
    labelMeaning: labels.labelMeaning,
    inputKind: '64 retained researcher-authored source summaries, exact locators and limitations. No case summaries or questions are embedded as documents; no full documents, private records or bank ledgers.',
    inputHashes: [...sourcePaths, labelsPath].map(p => ({ path: p, sha256: hash(read(p)) })),
    splitPolicy: {
      unit: 'case/source-family with explicit exact material-party groups',
      trainCases: cases.filter(c => splitFor(c.id) === 'train').map(c => c.id).sort(),
      devCases: [...devCases].sort(), testCases: [...testCases].sort(),
      materialPartyGroups: aliases,
      ignoredGenericOversight: ['CAG and broad government oversight context are not a claim of entity-disjointness across every public institution.'],
      trainingVisibility: 'Only train documents and train queries may be encoded inside the training loss or mined as negatives. Dev and test text is excluded from optimization. All 64 candidates may be ranked during evaluation, without gradient updates.',
      testVisibility: 'Independently authored test labels are held in a separate frozen file. This dataset intentionally contains only train/dev questions; choose the checkpoint on dev before opening final test results.',
      interpretation: 'A source-family/case holdout in a small selected corpus, not temporal backtesting or representative field performance.',
    },
    limitations: [...labels.limits,
      'The split keeps all 45 declared source families together; absence of known overlap does not prove independence between every research claim.',
      'Exact Adani Enterprises and Ministry of Defence overlaps are grouped; generic regulator/auditor context is intentionally shared and explicitly limits entity-disjoint claims.',
      'Source-only text prevents copied case-question leakage, but authored relevance questions and summaries still share domain vocabulary.',
      'Counterevidence is relevant evidence, never a negative because it contradicts an allegation. Hard negatives concern the wrong record for a particular information need.',
      'This fine-tuning task cannot resolve the 23 unknown institutional forecast outcomes or calibrate misconduct probabilities.',
    ],
    splitGroups, documents, queries: labels.queries,
  };
  validateDataset(dataset);
  return dataset;
}

export function validateDataset(dataset) {
  const { documents, queries, splitGroups } = dataset;
  assert(documents.length === 64, 'Pilot must retain exactly 64 source documents');
  const docs = new Map(documents.map(d => [d.id, d]));
  assert(docs.size === documents.length, 'Duplicate document id');
  assert(new Set(documents.map(d => d.url)).size === documents.length, 'Duplicate citation URL must be grouped/reviewed before training');
  const families = new Map();
  const groups = new Map(splitGroups.map(g => [g.id, g]));
  for (const d of documents) {
    assert(d.id === d.sourceId && d.caseIds.length === 1, `Invalid source scope ${d.id}`);
    assert(['train', 'dev', 'test'].includes(d.split), `Invalid split ${d.id}`);
    assert(d.text.includes(d.summary) && d.limitations.every(l => d.text.includes(l)), `Source meaning omitted ${d.id}`);
    assert(groups.get(d.groupId)?.split === d.split && groups.get(d.groupId)?.documentIds.includes(d.id), `Group mismatch ${d.id}`);
    const seen = families.get(d.family);
    assert(!seen || seen === d.split, `Source family crosses splits: ${d.family}`);
    families.set(d.family, d.split);
  }
  assert(families.size === 45, 'Declared source-family inventory changed');
  assert(documents.filter(d => d.split === 'train').length === 39, 'Training document count changed');
  assert(documents.filter(d => d.split === 'dev').length === 10, 'Development document count changed');
  assert(documents.filter(d => d.split === 'test').length === 15, 'Test document count changed');
  assert(new Set(queries.map(q => q.id)).size === queries.length, 'Duplicate query id');
  assert(queries.filter(q => q.split === 'train').length === 70, 'Training query count changed');
  assert(queries.filter(q => q.split === 'dev').length === 16, 'Development query count changed');
  for (const q of queries) {
    assert(q.split !== 'test', 'Held-out test queries belong in the independent frozen test file');
    assert(q.text.trim().length >= 30 && q.intent && q.rationale, `Incomplete supervised label ${q.id}`);
    assert(q.positiveIds.length > 0 && new Set(q.positiveIds).size === q.positiveIds.length, `Invalid positives ${q.id}`);
    for (const id of q.positiveIds) {
      assert(docs.has(id), `Missing positive ${q.id}: ${id}`);
      assert(docs.get(id).split === q.split && docs.get(id).caseIds.includes(q.caseId), `Positive split/case leakage ${q.id}: ${id}`);
      assert(!normalize(docs.get(id).text).includes(normalize(q.text)), `Question copied into target ${q.id}`);
    }
    for (const id of q.hardNegativeIds) {
      assert(docs.has(id) && !q.positiveIds.includes(id), `Invalid hard negative ${q.id}: ${id}`);
      assert(q.split === 'train' && docs.get(id).split === 'train', `Training-negative leakage ${q.id}: ${id}`);
    }
  }
  for (const group of splitGroups) {
    assert(group.documentIds.every(id => docs.get(id)?.split === group.split), `Cross-split group ${group.id}`);
    assert(new Set(group.caseIds.map(splitFor)).size === 1, `Primary-entity split leakage ${group.id}`);
  }
  return { documents: documents.length, sourceFamilies: families.size, groups: splitGroups.length, trainQueries: 70, devQueries: 16, splitDocuments: { train: 39, dev: 10, test: 15 } };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dataset = buildDataset();
  const serialized = `${JSON.stringify(dataset, null, 2)}\n`;
  if (process.argv.includes('--verify')) {
    assert(fs.existsSync(path.join(root, outputPath)) && read(outputPath).equals(Buffer.from(serialized)), 'Dataset differs from inputs; rebuild after reviewing source or label changes');
  } else {
    fs.mkdirSync(path.dirname(path.join(root, outputPath)), { recursive: true });
    fs.writeFileSync(path.join(root, outputPath), serialized);
  }
  console.log(JSON.stringify({ ...validateDataset(dataset), datasetSha256: hash(serialized), verified: process.argv.includes('--verify') }));
}
