/** A separate, source-pinned GitHub-only diagnostic. The release entry points
 * remain byte-identical; generated diagnostic modules are retained as evidence. */
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync, spawnSync} from 'node:child_process';
import {dirname, resolve, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import os from 'node:os';

export const RUNTIME_SHA = '5f2f3e882e8d8090d7576c5047434b45a0c99474';
export const SCENARIOS = Object.freeze(['38-native-sources-keyboard-compact-and-reduced-motion',
  '39d-compact-first-reader-responsiveness', '46-thirty-cycle-native-resource-handle-plateau']);
export const SOURCE_PINS = Object.freeze({
  'browser-review.mjs': '3d142288b64354c3182afaf5bc8f5df1413eb319fe325607a00494d806a96fed',
  'case-graphics-browser.mjs': '3942d3b797a1dddb5f8e0ef57da2c9c5021cac97f3efd81a3be6d541882070ff',
  'case-workspace-browser.mjs': '27acfa4346a913d6614b559984967c5abb86fd3dc50571f92eb56f5c4f9f7ee3',
});
export const OBSERVER_PINS = Object.freeze({control: 'a41f39a00081e20209fa2b6b0a3af4fb3453c36e872e7947c6ab72b385a616e6',
  candidate: 'a41f39a00081e20209fa2b6b0a3af4fb3453c36e872e7947c6ab72b385a616e6'});
export const PAIR_TRANSPORT_SHA256 = '67040e8e3a82cb8b096922f25e4e518722a26270bf60d2de8b903e46cebf858a';
export const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function replaceOnce(source, old, replacement) {
  assert.equal(source.split(old).length, 2, `Expected exactly one pinned transformation: ${old.slice(0, 70)}`);
  return source.replace(old, replacement);
}
export function generateDiagnosticSources(sources, variant) {
  assert.ok(['control', 'candidate'].includes(variant));
  for (const [name, pin] of Object.entries(SOURCE_PINS)) assert.equal(hash(sources[name]), pin, name);
  let main = sources['browser-review.mjs'], graphics = sources['case-graphics-browser.mjs'];
  main = replaceOnce(main, 'from "./case-graphics-browser.mjs";', 'from "./reader-resource-generated-graphics.mjs";');
  main = replaceOnce(main, 'const reviewMode = parseCaseGraphicsReviewMode(process.argv.slice(2));', 'const reviewMode = "reader-resource-diagnostic";');
  main = replaceOnce(main, '  reviewMode,\n', `  reviewMode,\n  diagnosticOnly: true,\n  fullAcceptance: false,\n  diagnosticVariant: ${JSON.stringify(variant)},\n  runtimeCommit: ${JSON.stringify(RUNTIME_SHA)},\n  harnessCommit: process.env.SPATIAL_DIAGNOSTIC_HARNESS_SHA,\n`);
  main = replaceOnce(main, 'const output = earlySceneSmoke ? join(root, "browser-review", "early-scene-smoke") : join(root, "browser-review");',
    `const output = join(root, "browser-review", "reader-resource-diagnostic", ${JSON.stringify(variant)});`);
  main = replaceOnce(main, '    earlySceneSmoke ? "# Spatial prototype early native scene smoke" : "# Spatial prototype browser review",',
    `    ${JSON.stringify(`# Pinned reader and resource diagnostic: ${variant} (not release acceptance)`)},\n    "Only scenarios 38, 39d and 46 are selected. Every default full release gate remains mandatory.",`);
  main = replaceOnce(main, '    checkedOutCommit,\n    process.env.GITHUB_SHA,\n    "Review checkout does not match the workflow revision",',
    '    checkedOutCommit,\n    process.env.SPATIAL_DIAGNOSTIC_RUNTIME_SHA,\n    "Diagnostic checkout does not match the pinned runtime revision",');
  const first = '  await scenario("01-overview-and-source-trail"', last = '  await runCaseGraphicsBrowserCases(caseReviewContext);';
  const start = main.indexOf(first), end = main.indexOf(last, start) + last.length;
  assert.ok(start > 0 && end > start); assert.equal(main.indexOf(first, start + 1), -1);
  const removedFullBody = main.slice(start, end);
  const context = '{ root, dist, output, origin, prefix, scenario, capture, assertFullLoad, assertReaderOnly, assertSpatial, assertCountryBase, until, report, temporary }';
  const focusedBody = `  const caseReviewContext = ${context};\n` +
    `  const selectedWorkspace = ${JSON.stringify(SCENARIOS.slice(0, 2))};\n` +
    `  await runCaseWorkspaceBrowserCases({ ...caseReviewContext, scenario: async (name, options, work) => {\n` +
    `    if (selectedWorkspace.includes(name)) await scenario(name, options, work);\n` +
    `  } });\n` +
    `  await runCaseGraphicsBrowserCases(caseReviewContext, { mode: "reader-resource-diagnostic" });`;
  main = main.slice(0, start) + focusedBody + main.slice(end);
  const oldSelector = "export function selectCaseGraphicsScenarios(mode = 'full') {\n  assert.ok(mode === 'full' || mode === 'early-scene-smoke', 'Unknown case graphics review mode');\n  return mode === 'full' ? GRAPHICS_SCENARIOS : GRAPHICS_SMOKE_SCENARIOS;\n}";
  const newSelector = "export function selectCaseGraphicsScenarios(mode = 'full') {\n  assert.equal(mode, 'reader-resource-diagnostic', 'Generated module is diagnostic-only');\n  return [GRAPHICS_SCENARIOS[7]];\n}";
  graphics = replaceOnce(graphics, oldSelector, newSelector);
  const oldImport="import { compactLifecycleObservation, caseLifecycleObservationInitSource } from './case-lifecycle-observation.mjs';";
  const newImport=oldImport+"\nimport { lifecyclePairTransportInitSource } from './lifecycle-pair-transport.mjs';";
  const oldInit="caseLifecycleObservationInitSource() : '')";
  const newInit="caseLifecycleObservationInitSource() + '\\n' + lifecyclePairTransportInitSource() : '')";
  const oldPair="const pair = await page.evaluate(() => ({ active: document.querySelector('.webgl-host')?.dataset.geographicWorkspaceActive,\n        workspaceCount: document.querySelectorAll('[data-case-workspace]').length, ...window.__caseGraphicsProbe.readLifecyclePair() }));";
  const newPair="const pair = JSON.parse(await page.evaluate(() => window.__caseGraphicsProbe.readLifecyclePairJSON()));";
  let reversedGraphics=graphics;
  if(variant==='candidate') {
    graphics=replaceOnce(graphics,oldImport,newImport);
    graphics=replaceOnce(graphics,oldInit,newInit);
    graphics=replaceOnce(graphics,oldPair,newPair);
    reversedGraphics=replaceOnce(replaceOnce(replaceOnce(graphics,newPair,oldPair),newInit,oldInit),newImport,oldImport);
  }

  return {main, graphics, conservation: {release_sources: SOURCE_PINS,
    removed_full_body_sha256: hash(removedFullBody), workspace_callbacks_changed: false,
    graphics_callbacks_changed: variant === 'candidate', callback_change: variant === 'candidate' ? 'Nine existing one-instant checkpoint pairs use strict lossless string transport; all remaining callback bytes conserved' : null, scenario_budgets_changed: false, raw_recorder_changed: false, compact_projection_changed: false,
    generated_graphics_reverse_transform_sha256: hash(replaceOnce(reversedGraphics, newSelector, oldSelector)),
    diagnostic_main_sha256: hash(main), diagnostic_graphics_sha256: hash(graphics)}};
}
export function validateDiagnosticReport(report, variant, rawExitCode) {
  assert.ok(['control', 'candidate'].includes(variant));
  assert.equal(report.reviewMode, 'reader-resource-diagnostic'); assert.equal(report.diagnosticOnly, true);
  assert.equal(report.fullAcceptance, false); assert.equal(report.diagnosticVariant, variant);
  assert.equal(report.runtimeCommit, RUNTIME_SHA); assert.equal(report.headCommit, RUNTIME_SHA);
  assert.match(report.harnessCommit, /^[a-f0-9]{40}$/u); assert.equal(report.commit, report.harnessCommit);
  assert.deepEqual(report.scenarios.map(row => row.name), SCENARIOS, 'Missing, extra or reordered focused scenarios');
  assert.ok(report.scenarios.every(row => ['passed', 'failed'].includes(row.status)), 'No skipped scenario can count');
  assert.ok(report.scenarios.slice(0,2).every(row=>row.status==='passed'), 'Both variants must retain the proven complete scroll cases');
  if (variant === 'candidate' || report.scenarios[2].status === 'passed') {
    assert.equal(rawExitCode, 0); assert.equal(report.status, 'passed'); assert.equal(report.setupError, undefined);
    assert.ok(report.scenarios.every(row => row.status === 'passed'), 'Candidate must pass all three cases');
    assert.ok(report.scenarios.every(row => row.error === undefined), 'A preserved scenario error cannot count as a pass');
    const completion = report.scenarios[2].resourceCapture?.withinBudgetCompletion;
    assert.ok(completion, '46 must complete all acceptance work within its budget');
    assert.ok(Number.isFinite(completion.elapsedMs) && completion.elapsedMs >= 0 && completion.elapsedMs <= 300000,
      '46 must retain its unchanged 300000 ms completion gate');
    assert.equal(report.scenarios[2].resourceCapture.deadlineObservation, undefined, 'A deadline failure cannot count as completion');
  } else {
    assert.equal(rawExitCode, 1); assert.equal(report.status, 'failed');
    const lifecycle=report.scenarios[2];
    assert.equal(lifecycle.resourceCapture?.withinBudgetCompletion,undefined);
    const deadline=lifecycle.resourceCapture?.deadlineObservation;
    const completion=lifecycle.resourceCapture?.completionObservation;
    assert.equal(typeof lifecycle.error,'string');
    const firstErrorLine=lifecycle.error.split('\n')[0];
    if(deadline!==undefined) {
      assert.equal(firstErrorLine,'Error: Scenario exceeded its 300000 ms review budget');
      assert.ok(deadline && Number.isFinite(deadline.elapsedMs) && deadline.elapsedMs>=300000);
      assert.equal(completion,undefined,'Timer failure cannot also be a completed Promise.race');
    } else {
      assert.ok(completion && Number.isFinite(completion.elapsedMs) && completion.elapsedMs>300000,
        'Only genuine over-budget completion may substitute for a timer-fired failure');
      assert.equal(firstErrorLine,`AssertionError [ERR_ASSERTION]: Resource work completed outside its 300000 ms deadline: ${completion.elapsedMs} ms`);
    }
    assert.match(report.setupError??'',/Required reader-resource-diagnostic native graphics scenarios did not all pass with preserved evidence/);

  }
  return {diagnostic_contract_passed: true, variant, raw_process_exit_code: rawExitCode,
    native_report_status: report.status, scenarios: report.scenarios.map(({name, status, error}) => ({name, status, error: error ?? null})),
    full_acceptance: false, release_acceptance: false};
}
function environment() {
  return {at: new Date().toISOString(), node: process.version, platform: process.platform, arch: process.arch,
    cpus: os.cpus(), loadavg: os.loadavg(), total_memory: os.totalmem(), free_memory: os.freemem(),
    driver_usage: process.resourceUsage(), runner: process.env.RUNNER_NAME ?? null,
    run_id: process.env.GITHUB_RUN_ID ?? null, run_attempt: process.env.GITHUB_RUN_ATTEMPT ?? null};
}
async function run(variant) {
  assert.equal(process.env.GITHUB_ACTIONS, 'true', 'No local browser is permitted');
  assert.equal(process.env.SPATIAL_BROWSER_REVIEW, 'github-actions');
  assert.ok(['control', 'candidate'].includes(variant));
  assert.match(process.env.SPATIAL_DIAGNOSTIC_HARNESS_SHA ?? '', /^[a-f0-9]{40}$/u);
  assert.equal(process.env.SPATIAL_DIAGNOSTIC_HARNESS_SHA, process.env.GITHUB_SHA);
  const scripts = dirname(fileURLToPath(import.meta.url)), spatial = resolve(scripts, '..'), repository = resolve(spatial, '..');
  assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], {cwd: repository, encoding: 'utf8'}).trim(), RUNTIME_SHA);
  const sources = Object.fromEntries(await Promise.all(Object.keys(SOURCE_PINS).map(async name => [name, await readFile(join(scripts, name), 'utf8')])));
  assert.equal(hash(await readFile(join(scripts, 'reader-scroll-settlement.mjs'))), OBSERVER_PINS[variant]);
  if(variant==='candidate')assert.equal(hash(await readFile(join(scripts,'lifecycle-pair-transport.mjs'))),PAIR_TRANSPORT_SHA256);
  else assert.equal(existsSync(join(scripts,'lifecycle-pair-transport.mjs')),false,'Control cannot install the candidate transport');
  const verifyRuntime = async () => {
    assert.equal(hash(await readFile(join(scripts,'reader-scroll-settlement.mjs'))),OBSERVER_PINS[variant]);
    if(variant==='candidate')assert.equal(hash(await readFile(join(scripts,'lifecycle-pair-transport.mjs'))),PAIR_TRANSPORT_SHA256);
    else assert.equal(existsSync(join(scripts,'lifecycle-pair-transport.mjs')),false);
    const changed = execFileSync('git', ['diff', 'HEAD', '--name-only'], {cwd: repository, encoding: 'utf8'}).trim().split('\n').filter(Boolean);
    assert.deepEqual(changed, ['spatial-prototype/scripts/reader-scroll-settlement.mjs'],
      'Both frozen variants may change only the identical proven scroll observer');
  };
  await verifyRuntime();
  const generated = generateDiagnosticSources(sources, variant), output = join(spatial, 'browser-review', 'reader-resource-diagnostic', variant);
  assert.equal(existsSync(output), false, 'Refusing to overwrite diagnostic evidence'); await mkdir(output, {recursive: true});
  for (const [name, text] of [['reader-resource-generated-main.mjs', generated.main], ['reader-resource-generated-graphics.mjs', generated.graphics]]) {
    assert.equal(existsSync(join(scripts, name)), false, 'Refusing to overwrite generated harness');
    await writeFile(join(scripts, name), text); await writeFile(join(output, name), text);
  }
  await writeFile(join(output, 'source-conservation.json'), JSON.stringify({...generated.conservation, variant,
    observer_sha256: OBSERVER_PINS[variant], experiment: 'nine-pair-value-transport', pair_transport_sha256: variant==='candidate'?PAIR_TRANSPORT_SHA256:null, runtime_sha: RUNTIME_SHA, harness_sha: process.env.SPATIAL_DIAGNOSTIC_HARNESS_SHA}, null, 2) + '\n');
  if(variant==='candidate')await writeFile(join(output,'lifecycle-pair-transport.mjs'),await readFile(join(scripts,'lifecycle-pair-transport.mjs')));
  const buildReceipt = JSON.parse(await readFile(join(spatial, 'reader-resource-build.json'), 'utf8'));
  assert.equal(buildReceipt.identical, true); assert.equal(buildReceipt.runtime_sha, RUNTIME_SHA);
  assert.equal(buildReceipt.harness_sha, process.env.SPATIAL_DIAGNOSTIC_HARNESS_SHA);
  await writeFile(join(output, 'identical-runtime-builds.json'), JSON.stringify(buildReceipt, null, 2) + '\n');
  const before = environment(); await writeFile(join(output, 'environment-before.json'), JSON.stringify(before, null, 2) + '\n');
  const child = spawnSync(process.execPath, [join(scripts, 'reader-resource-generated-main.mjs')], {cwd: spatial, encoding: 'utf8',
    env: {...process.env, SPATIAL_HEAD_SHA: RUNTIME_SHA, SPATIAL_DIAGNOSTIC_RUNTIME_SHA: RUNTIME_SHA}, maxBuffer: 32 * 1024 * 1024});
  await writeFile(join(output, 'process.stdout'), child.stdout ?? ''); await writeFile(join(output, 'process.stderr'), child.stderr ?? '');
  await writeFile(join(output, 'environment-after.json'), JSON.stringify(environment(), null, 2) + '\n');
  await writeFile(join(output, 'raw-process-result.json'), JSON.stringify({status: child.status, signal: child.signal,
    error: child.error ? String(child.error) : null, stdout_sha256: hash(child.stdout ?? ''), stderr_sha256: hash(child.stderr ?? '')}, null, 2) + '\n');
  assert.equal(child.error, undefined); assert.equal(child.signal, null); await verifyRuntime();
  const report = JSON.parse(await readFile(join(output, 'diagnostics.json'), 'utf8'));
  const workspace = JSON.parse(await readFile(join(output, 'case-workspace-coverage-index.json'), 'utf8'));
  const graphics = JSON.parse(await readFile(join(output, 'case-graphics-coverage-index.json'), 'utf8'));
  assert.equal(workspace.browserAcceptancePassed, false); assert.equal(graphics.browserAcceptancePassed, false);
  const lifecycle = report.scenarios[2], canonical = JSON.parse(await readFile(join(output, `${SCENARIOS[2]}.native-webgl.json`), 'utf8'));
  await writeFile(join(output, 'failure-state-identities.json'), JSON.stringify({deadline: lifecycle.resourceCapture?.deadlineObservation ?? null,
    completion_observation: lifecycle.resourceCapture?.completionObservation ?? null,
    within_budget_completion: lifecycle.resourceCapture?.withinBudgetCompletion ?? null,
    canonical_raw: {sequence: canonical.sequence, contexts: canonical.contexts.map(c => ({id: c.id, caseLive: c.caseLive}))},
    later_report_terminal: lifecycle.caseTerminalNativeState ?? null,
    limitation: 'Deadline, canonical raw export and later terminal summary are distinct-time observations. Late work cannot turn a failed scenario into a pass.'}, null, 2) + '\n');
  const result = validateDiagnosticReport(report, variant, child.status);
  await writeFile(join(output, 'diagnostic-result.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 3, 'Use exactly one argument: control or candidate');
  await run(process.argv[2]);
}
