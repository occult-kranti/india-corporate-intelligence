import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {SCENARIOS, SOURCE_PINS, RUNTIME_SHA, OBSERVER_PINS, generateDiagnosticSources, validateDiagnosticReport, hash} from './reader-resource-diagnostic.mjs';
const sources = Object.fromEntries(await Promise.all(Object.keys(SOURCE_PINS).map(async name => [name, await readFile(new URL(name, import.meta.url), 'utf8')])));

test('release entry points and all callback source bytes retain exact current-head pins', () => {
  for (const [name, pin] of Object.entries(SOURCE_PINS)) assert.equal(hash(sources[name]), pin);
  const generated = generateDiagnosticSources(sources, 'candidate');
  assert.equal(generated.conservation.generated_graphics_reverse_transform_sha256, SOURCE_PINS['case-graphics-browser.mjs']);
  assert.equal(generated.conservation.workspace_callbacks_changed, false);
  assert.equal(generated.conservation.graphics_callbacks_changed, false);
  assert.equal(generated.conservation.scenario_budgets_changed, false);
  assert.match(generated.main, /diagnosticOnly: true/); assert.match(generated.main, /fullAcceptance: false/);
  assert.match(generated.main, /diagnostic: candidate \(not release acceptance\)/);
  assert.match(generated.main, /No local browser was launched/);
  assert.match(generated.graphics, /budgetMs: 300000/);
  assert.equal(generated.main.includes('await scenario("01-overview-and-source-trail"'), false);
  assert.ok(sources['browser-review.mjs'].includes('await scenario("01-overview-and-source-trail"'));
  assert.match(sources['case-graphics-browser.mjs'], /if \(args.length === 0\) return 'full'/);
});
test('source drift and unsupported variants fail before any browser can start', () => {
  for (const name of Object.keys(sources)) assert.throws(() => generateDiagnosticSources({...sources, [name]: sources[name] + '\n'}, 'candidate'));
  assert.throws(() => generateDiagnosticSources(sources, 'full'));
  assert.throws(() => execFileSync(process.execPath, [fileURLToPath(new URL('./reader-resource-diagnostic.mjs', import.meta.url)), 'candidate'],
    {encoding: 'utf8', env: {...process.env, GITHUB_ACTIONS: 'false', SPATIAL_BROWSER_REVIEW: 'github-actions'}, stdio: 'pipe'}), /No local browser is permitted/);
});
test('candidate observer is pinned and does not use rounding or an epsilon', async () => {
  const observer = await readFile(new URL('./reader-scroll-settlement.mjs', import.meta.url), 'utf8');
  assert.equal(hash(observer), OBSERVER_PINS.candidate); assert.match(observer, /row.scrollTop !== lastTop/);
  assert.doesNotMatch(observer, /Math\.round|Math\.abs|epsilon|waitForTimeout/);
});
function report(variant = 'candidate') {
  return {reviewMode: 'reader-resource-diagnostic', diagnosticOnly: true, fullAcceptance: false,
    diagnosticVariant: variant, runtimeCommit: RUNTIME_SHA, headCommit: RUNTIME_SHA,
    harnessCommit: 'a'.repeat(40), commit: 'a'.repeat(40), status: 'passed',
    scenarios: SCENARIOS.map(name => ({name, status: 'passed', resourceCapture: {withinBudgetCompletion: {elapsedMs: 200000}}}))};
}
test('candidate requires every exact scenario and a within-budget46 result', () => {
  const good = report(); assert.equal(validateDiagnosticReport(good, 'candidate', 0).full_acceptance, false);
  for (const mutate of [r => r.scenarios.pop(), r => r.scenarios.reverse(), r => r.scenarios.push(r.scenarios[0]),
    r => r.scenarios[0].status = 'skipped', r => r.scenarios[1].status = 'failed', r => r.fullAcceptance = true,
    r => delete r.scenarios[2].resourceCapture.withinBudgetCompletion,
    r => r.scenarios[2].resourceCapture.withinBudgetCompletion.elapsedMs = 300001,
    r => r.scenarios[2].resourceCapture.withinBudgetCompletion.elapsedMs = NaN,
    r => r.scenarios[2].resourceCapture.withinBudgetCompletion.elapsedMs = -1,
    r => r.scenarios[2].resourceCapture.deadlineObservation = {},
    r => r.setupError = 'bad', r => r.headCommit = 'other', r => r.harnessCommit = 'b'.repeat(40)]) {
    const r = report(); mutate(r); assert.throws(() => validateDiagnosticReport(r, 'candidate', 0));
  }
  assert.throws(() => validateDiagnosticReport(good, 'candidate', 1));
  assert.throws(() => validateDiagnosticReport(good, 'unknown', 1));
});
test('control must preserve both actual observed failures rather than accepting any nonzero exit', () => {
  const r = report('control'); r.status = 'failed';
  for (const row of r.scenarios.slice(0, 2)) {
    row.status = 'failed'; row.error = 'Native reader scrollend and stable frames were not observed';
    row.caseReaderScrollSettlements = [{status: 'failed', observation: {seenScroll: true, inputAt: 1,
      samples: [{type: 'scrollend', scrollTop: 537.25}, {type: 'scroll', scrollTop: 537.25}]}}];
  }
  const result = validateDiagnosticReport(r, 'control', 1); assert.equal(result.native_report_status, 'failed');
  assert.equal(result.raw_process_exit_code, 1); assert.equal(result.release_acceptance, false);
  assert.throws(() => validateDiagnosticReport(r, 'control', 0));
  r.scenarios[0].caseReaderScrollSettlements[0].observation.samples[1].scrollTop += .125;
  assert.throws(() => validateDiagnosticReport(r, 'control', 1));
  r.scenarios[0].caseReaderScrollSettlements[0].observation.samples[1].scrollTop -= .125;
  r.scenarios[0].caseReaderScrollSettlements[0].observation.samples.push({type: 'scroll', scrollTop: 538});
  assert.throws(() => validateDiagnosticReport(r, 'control', 1));
});
test('focused workflow is sequential pinned control then candidate, with separate evidence', async () => {
  const workflow = await readFile(new URL('../../.github/workflows/reader-resource-diagnostic.yml', import.meta.url), 'utf8');
  assert.ok(workflow.indexOf('id: control_run') < workflow.indexOf('id: candidate_run'));
  assert.equal(workflow.match(new RegExp(`ref: ${RUNTIME_SHA}`, 'g')).length, 2);
  assert.match(workflow, /persist-credentials: false/); assert.match(workflow, /contents: read/);
  assert.doesNotMatch(workflow, /merge_pull_request|deploy-pages|continue-on-error/);
  for (const variant of ['control', 'candidate']) {
    assert.match(workflow, new RegExp(`reader-resource-diagnostic.mjs ${variant}`));
    assert.match(workflow, new RegExp(`reader-resource-${variant}-`));
  }
});
