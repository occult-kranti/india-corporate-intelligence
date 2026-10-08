import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDataset, validateDataset } from './build-dataset.mjs';

const dataset = buildDataset();
test('source-only pilot preserves the bounded source/family and query inventory', () => {
  assert.deepEqual(validateDataset(dataset), { documents: 64, sourceFamilies: 45, groups: 21, trainQueries: 70, devQueries: 16, splitDocuments: { train: 39, dev: 10, test: 15 } });
  assert.equal(dataset.documents.some(d => d.id.endsWith(':model-case')), false);
  assert.equal(dataset.queries.filter(q => q.split === 'train' && q.intent === 'counterevidence').length >= 10, true);
});
test('rejects a held-out source in training hard negatives', () => {
  const changed = structuredClone(dataset);
  changed.queries.find(q => q.split === 'train').hardNegativeIds = [changed.documents.find(d => d.split === 'test').id];
  assert.throws(() => validateDataset(changed), /Training-negative leakage/);
});
test('rejects a development source falsely labeled as a training positive', () => {
  const changed = structuredClone(dataset);
  changed.queries.find(q => q.split === 'train').positiveIds = [changed.documents.find(d => d.split === 'dev').id];
  assert.throws(() => validateDataset(changed), /Positive split\/case leakage/);
});
test('rejects a shared source family moved across train and test', () => {
  const changed = structuredClone(dataset);
  changed.documents.find(d => d.split === 'test').family = changed.documents.find(d => d.split === 'train').family;
  assert.throws(() => validateDataset(changed), /Source family crosses splits/);
});
test('rejects omission of the source limitations from its embedded text', () => {
  const changed = structuredClone(dataset);
  changed.documents[0].text = changed.documents[0].summary;
  assert.throws(() => validateDataset(changed), /Source meaning omitted/);
});
test('rejects source text containing the exact authored query as an answer shortcut', () => {
  const changed = structuredClone(dataset);
  const query = changed.queries[0];
  changed.documents.find(d => d.id === query.positiveIds[0]).text += `\n${query.text}`;
  assert.throws(() => validateDataset(changed), /Question copied into target/);
});
test('rejects a hard negative that is simultaneously declared positive', () => {
  const changed = structuredClone(dataset);
  changed.queries[0].hardNegativeIds = [changed.queries[0].positiveIds[0]];
  assert.throws(() => validateDataset(changed), /Invalid hard negative/);
});
test('keeps exact material parties together while documenting generic-oversight limits', () => {
  const adani = dataset.splitGroups.find(g => g.id === 'material-party:adani-enterprises-limited');
  const mod = dataset.splitGroups.find(g => g.id === 'material-party:ministry-of-defence');
  assert.equal(adani.caseIds.length, 2);
  assert.equal(adani.split, 'train');
  assert.equal(mod.caseIds.length, 2);
  assert.equal(mod.split, 'dev');
  assert.match(dataset.splitPolicy.ignoredGenericOversight[0], /not a claim of entity-disjointness/);
});
