import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('../src/data/testPlan.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ES2022 } });
const { readResearchState, capturePlanRevision, resolveWorksheetLink, DEFAULT_TEST_PLAN, TEST_PLAN_BOUNDARY } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const draft = { question: 'Question', prediction: 'Prediction', alternative: 'Alternative', falsifier: 'Falsifier', records: 'Records', notes: 'Notes', links: '' };
const plan = { ...DEFAULT_TEST_PLAN, population: 'All awards, including unsuccessful bids', timeWindow: '2020–2025', alternativeObservation: 'Capacity explains selection', analysisMethod: 'Match capacity and contract size; report all prespecified comparisons' };
const time = '2026-10-14T20:00:00.000Z';

test('v1 worksheets survive migration and malformed sibling sections', () => {
  const parsed = readResearchState({ drafts: { 'case:0': draft }, inputs: null, plans: 'bad', revisions: [] }, ['case:0']);
  assert.deepEqual(parsed.drafts['case:0'], draft);
  assert.deepEqual(parsed.plans, {}); assert.deepEqual(parsed.revisions, {});
  for (const raw of [null, [], 42, 'bad']) assert.deepEqual(readResearchState(raw, ['case:0']), { drafts: {}, plans: {}, revisions: {} });
});

test('captured revisions remain immutable and isolated by worksheet', () => {
  const editableDraft = { ...draft }, editablePlan = { ...plan };
  const first = capturePlanRevision({}, 'case:0', editableDraft, editablePlan, time);
  editableDraft.notes = 'Changed later'; editablePlan.population = 'Changed population';
  assert.equal(first['case:0'][0].worksheet.notes, 'Notes');
  assert.equal(first['case:0'][0].plan.population, plan.population);
  assert.throws(() => { first['case:0'][0].worksheet.notes = 'overwrite'; }, TypeError);
  assert.throws(() => first['case:0'].push({}), TypeError);
  const second = capturePlanRevision(first, 'case:0', editableDraft, editablePlan, time);
  const third = capturePlanRevision(second, 'generic:supplier', draft, plan, time);
  assert.equal(first['case:0'].length, 1); assert.equal(second['case:0'].length, 2);
  assert.equal(second['case:0'][1].revision, 2); assert.equal(third['generic:supplier'][0].revision, 1);
  assert.equal(third['case:0'][0].worksheet.notes, 'Notes');
});

test('malformed revisions, timing, timestamps and unknown keys are excluded on reload', () => {
  const valid = capturePlanRevision({}, 'case:0', draft, plan, time)['case:0'][0];
  const parsed = readResearchState({
    drafts: { 'case:0': draft, unknown: draft, bad: { ...draft, notes: 42 } },
    plans: { 'case:0': { ...plan, timing: 'registered' } },
    revisions: { 'case:0': [{ ...valid, capturedAt: '2026-02-30T20:00:00.000Z' }, valid, valid, { ...valid, revision: 2, plan: { timing: 'exploratory' } }, { ...valid, revision: 3, plan: { ...plan, timing: 'before-new-search' } }], unknown: [valid] },
  }, ['case:0', 'bad']);
  assert.deepEqual(Object.keys(parsed.drafts), ['case:0']);
  assert.deepEqual(parsed.plans, {});
  assert.deepEqual(parsed.revisions['case:0'].map(item => item.revision), [1, 3]);
  assert.equal(Object.isFrozen(parsed.revisions['case:0'][0].plan), true);
  assert.equal(parsed.revisions.unknown, undefined);
  assert.equal(DEFAULT_TEST_PLAN.timing, 'exploratory');
  assert.match(TEST_PLAN_BOUNDARY, /not independently registered or validated/);
});

test('only valid exact case and hypothesis links resolve', () => {
  const cases = [{ id: 'one', hypotheses: [{}, {}] }, { id: 'empty', hypotheses: [] }];
  assert.deepEqual(resolveWorksheetLink(cases, 'one', '1'), { caseId: 'one', hypothesisIndex: 1 });
  assert.deepEqual(resolveWorksheetLink(cases, 'one', null), { caseId: 'one', hypothesisIndex: 0 });
  for (const index of ['-1', '2', '0.5', 'x', '1e0', '', '9007199254740992']) assert.equal(resolveWorksheetLink(cases, 'one', index), null);
  for (const id of [null, 'unknown', 'empty']) assert.equal(resolveWorksheetLink(cases, id, '0'), null);
});

test('capture rejects malformed snapshots and invalid timestamps', () => {
  assert.throws(() => capturePlanRevision({}, 'case:0', draft, { ...plan, timing: 'registered' }, time), TypeError);
  assert.throws(() => capturePlanRevision({}, 'case:0', { ...draft, notes: null }, plan, time), TypeError);
  assert.throws(() => capturePlanRevision({}, 'case:0', draft, plan, 'bad'), TypeError);
});
