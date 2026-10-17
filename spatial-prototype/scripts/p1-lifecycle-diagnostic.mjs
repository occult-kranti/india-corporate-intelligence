/** One released control then one P1 candidate, on one GitHub worker.
 * Diagnostic-only orchestration. Runtime, native recorder, scenario callback,
 * assertions, evidence, and 300000 ms budget stay pinned and unchanged. */
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir, readdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync, spawnSync} from 'node:child_process';
import {dirname, resolve, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import os from 'node:os';
export const RUNTIMES = Object.freeze({
  control: {commit: 'cdc0f9fbe6748b7b459f4f4151cdb9b4e8a936b8', tree: '77e6cb0712c856287c923dc0c0e07a09d62cbc14'},
  candidate: {commit: 'dcb5119f37680888b3fb5175626ac62448584417', tree: 'eca4e4ad6deb12e7f0e8a90c481b720ba485935f'},
});
export const ORDER = Object.freeze(['control', 'candidate']);
export const SCENARIOS = Object.freeze(['46-thirty-cycle-native-resource-handle-plateau']);
export const PHASES = Object.freeze(['warmed-baseline', 'cycle-1-before-close', 'cycle-1-closed', 'cycle-15-before-close', 'cycle-15-closed', 'cycle-30-before-close', 'cycle-30-closed', 'timing-active', 'timing-closed']);
export const LIMITATION = 'One sequential control then candidate on one worker controls worker identity, not cache, ordering, transient load, or sustained thermal effects. It is not full spatial/release acceptance or production-device performance. Stop after this one pair and review the evidence; do not automatically retry.';
export const SOURCE_PINS = Object.freeze({
  "control": {
    "browser-review.mjs": "3d142288b64354c3182afaf5bc8f5df1413eb319fe325607a00494d806a96fed",
    "case-graphics-browser.mjs": "4402c2447b36b38989c896250b97af5875214b4da851220d1c44c47d41c3e7ee",
    "case-workspace-browser.mjs": "27acfa4346a913d6614b559984967c5abb86fd3dc50571f92eb56f5c4f9f7ee3",
    "case-frame-readiness.mjs": "0b588b1f93a091f041cfa203c9311721794f152bfa0cc1088877ed9219feafd9",
    "case-lifecycle-observation.mjs": "fb347edace0d10cad63b7a3ddc8de210a45f23117dc0dace3e318a1276122b69",
    "lifecycle-pair-transport.mjs": "67040e8e3a82cb8b096922f25e4e518722a26270bf60d2de8b903e46cebf858a",
    "lifecycle-value-transport.mjs": "a1ca27376d0df85e57a64b08410450649f5b27de2839abbfe8e128d2fff8923c",
    "resource-capture-policy.mjs": "9d4512d9f2d25de9ef237b1b4d7d42575a90bffa3d0918b5eee6c1ce001cbab3",
    "reader-scroll-settlement.mjs": "a41f39a00081e20209fa2b6b0a3af4fb3453c36e872e7947c6ab72b385a616e6",
    "partition-browser-artifacts.mjs": "a0704f06c3dc175b266e4ac5d94265cc251156c2885cec8f4cf4265f7c6dac48"
  },
  "candidate": {
    "browser-review.mjs": "3d142288b64354c3182afaf5bc8f5df1413eb319fe325607a00494d806a96fed",
    "case-graphics-browser.mjs": "4402c2447b36b38989c896250b97af5875214b4da851220d1c44c47d41c3e7ee",
    "case-workspace-browser.mjs": "c555e4c9f5137d2a396bded63e682a6e48d0e913e7f3e3ac47540239696831a3",
    "case-frame-readiness.mjs": "0b588b1f93a091f041cfa203c9311721794f152bfa0cc1088877ed9219feafd9",
    "case-lifecycle-observation.mjs": "fb347edace0d10cad63b7a3ddc8de210a45f23117dc0dace3e318a1276122b69",
    "lifecycle-pair-transport.mjs": "67040e8e3a82cb8b096922f25e4e518722a26270bf60d2de8b903e46cebf858a",
    "lifecycle-value-transport.mjs": "a1ca27376d0df85e57a64b08410450649f5b27de2839abbfe8e128d2fff8923c",
    "resource-capture-policy.mjs": "9d4512d9f2d25de9ef237b1b4d7d42575a90bffa3d0918b5eee6c1ce001cbab3",
    "reader-scroll-settlement.mjs": "a41f39a00081e20209fa2b6b0a3af4fb3453c36e872e7947c6ab72b385a616e6",
    "partition-browser-artifacts.mjs": "a0704f06c3dc175b266e4ac5d94265cc251156c2885cec8f4cf4265f7c6dac48"
  }
});
export const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function replaceOnce(source, old, replacement) {
  assert.equal(source.split(old).length, 2, `Expected exactly one pinned transformation: ${old.slice(0, 70)}`);
  return source.replace(old, replacement);
}
export function generateDiagnosticSources(sources, variant) {
  assert.ok(['control', 'candidate'].includes(variant));
  for (const [name, pin] of Object.entries(SOURCE_PINS[variant])) assert.equal(hash(sources[name]), pin, name);
  let main = sources['browser-review.mjs'], graphics = sources['case-graphics-browser.mjs'];
  main = replaceOnce(main, 'from "./case-graphics-browser.mjs";', 'from "./p1-lifecycle-generated-graphics.mjs";');
  main = replaceOnce(main, 'const reviewMode = parseCaseGraphicsReviewMode(process.argv.slice(2));', 'const reviewMode = "p1-lifecycle-diagnostic";');
  main = replaceOnce(main, '  reviewMode,\n', `  reviewMode,\n  diagnosticOnly: true,\n  fullAcceptance: false,\n  diagnosticVariant: ${JSON.stringify(variant)},\n  runtimeCommit: ${JSON.stringify(RUNTIMES[variant].commit)},\n  harnessCommit: process.env.SPATIAL_DIAGNOSTIC_HARNESS_SHA,\n`);
  main = replaceOnce(main, 'const output = earlySceneSmoke ? join(root, "browser-review", "early-scene-smoke") : join(root, "browser-review");',
    `const output = join(root, "browser-review", "p1-lifecycle-diagnostic", ${JSON.stringify(variant)});`);
  main = replaceOnce(main, '    earlySceneSmoke ? "# Spatial prototype early native scene smoke" : "# Spatial prototype browser review",',
    `    ${JSON.stringify(`# Pinned reader and resource diagnostic: ${variant} (not release acceptance)`)},\n    "Only the complete scenario 46 is selected. Every default full release gate remains mandatory.",`);
  main = replaceOnce(main, '    checkedOutCommit,\n    process.env.GITHUB_SHA,\n    "Review checkout does not match the workflow revision",',
    '    checkedOutCommit,\n    process.env.SPATIAL_DIAGNOSTIC_RUNTIME_SHA,\n    "Diagnostic checkout does not match the pinned runtime revision",');
  main = replaceOnce(main, '      : "All positive and negative historical reader cases are mandatory for this next-release candidate.",',
    '      : "Diagnostic-only complete scenario46; the full release suite is still mandatory.",');
  const first = '  await scenario("01-overview-and-source-trail"', last = '  await runCaseGraphicsBrowserCases(caseReviewContext);';
  const start = main.indexOf(first), end = main.indexOf(last, start) + last.length;
  assert.ok(start > 0 && end > start); assert.equal(main.indexOf(first, start + 1), -1);
  const removedFullBody = main.slice(start, end);
  const context = '{ root, dist, output, origin, prefix, scenario, capture, assertFullLoad, assertReaderOnly, assertSpatial, assertCountryBase, until, report, temporary }';
  const focusedBody = `  const caseReviewContext = ${context};\n` +
    `  await runCaseGraphicsBrowserCases(caseReviewContext, { mode: "p1-lifecycle-diagnostic" });`;
  main = main.slice(0, start) + focusedBody + main.slice(end);
  const oldSelector = "export function selectCaseGraphicsScenarios(mode = 'full') {\n  assert.ok(mode === 'full' || mode === 'early-scene-smoke', 'Unknown case graphics review mode');\n  return mode === 'full' ? GRAPHICS_SCENARIOS : GRAPHICS_SMOKE_SCENARIOS;\n}";
  const newSelector = "export function selectCaseGraphicsScenarios(mode = 'full') {\n  assert.equal(mode, 'p1-lifecycle-diagnostic', 'Generated module is diagnostic-only');\n  return [GRAPHICS_SCENARIOS[7]];\n}";
  graphics = replaceOnce(graphics, oldSelector, newSelector);
  const scenarioStart = 'async function scenario(', scenarioEnd = '\ntry {\n  const checkedOutCommit';
  const wrapper = text => text.slice(text.indexOf(scenarioStart), text.indexOf(scenarioEnd));
  assert.ok(wrapper(main).startsWith(scenarioStart));
  assert.equal(wrapper(main), wrapper(sources['browser-review.mjs']), 'The complete scenario wrapper must remain byte-identical');
  const lifecycleStart = '  await run(GRAPHICS_SCENARIOS[7]', lifecycleEnd = '  coverage.scenarios';
  const lifecycle = text => text.slice(text.indexOf(lifecycleStart), text.indexOf(lifecycleEnd));
  assert.equal(lifecycle(graphics), lifecycle(sources['case-graphics-browser.mjs']), 'Every lifecycle callback byte must remain unchanged');
  return {main, graphics, conservation: {release_sources: SOURCE_PINS[variant],
    removed_full_body_sha256: hash(removedFullBody), workspace_callbacks_changed: false,
    graphics_callbacks_changed: false, scenario_budgets_changed: false, scenario_wrapper_sha256: hash(wrapper(main)), lifecycle_callback_sha256: hash(lifecycle(graphics)),
    generated_graphics_reverse_transform_sha256: hash(replaceOnce(graphics, newSelector, oldSelector)),
    diagnostic_main_sha256: hash(main), diagnostic_graphics_sha256: hash(graphics)}};
}
export function validateDiagnosticReport(report, variant, rawExitCode) {
  assert.ok(ORDER.includes(variant));
  assert.equal(report.reviewMode, 'p1-lifecycle-diagnostic'); assert.equal(report.diagnosticOnly, true);
  assert.equal(report.fullAcceptance, false); assert.equal(report.diagnosticVariant, variant);
  assert.equal(report.runtimeCommit, RUNTIMES[variant].commit); assert.equal(report.headCommit, RUNTIMES[variant].commit);
  assert.match(report.harnessCommit, /^[a-f0-9]{40}$/u); assert.equal(report.commit, report.harnessCommit);
  assert.equal(report.revision.checkedOutCommit, RUNTIMES[variant].commit);
  assert.equal(report.revision.candidateHead, RUNTIMES[variant].commit);
  assert.equal(report.revision.mode, 'exact-head');
  assert.deepEqual(report.scenarios.map(row => row.name), SCENARIOS, 'Exactly one full lifecycle callback must run');
  assert.ok(Number.isInteger(rawExitCode) && rawExitCode >= 0 && rawExitCode <= 255);
  const row = report.scenarios[0], capture = row.resourceCapture;
  assert.ok(['passed', 'failed'].includes(row.status), 'Skipped scenarios cannot count as observations');
  assert.ok(capture && capture.scenario === SCENARIOS[0]);
  assert.equal(capture.status, 'preserved', 'Network/checkpoint preservation must finish');
  let outcome;
  if (row.status === 'passed') {
    assert.equal(rawExitCode, 0); assert.equal(report.status, 'passed'); assert.equal(report.setupError, undefined);
    assert.equal(row.error, undefined); assert.equal(capture.deadlineObservation, undefined);
    assert.deepEqual(capture.withinBudgetCompletion, capture.completionObservation);
    assert.ok(Number.isFinite(capture.withinBudgetCompletion?.elapsedMs) && capture.withinBudgetCompletion.elapsedMs >= 0 && capture.withinBudgetCompletion.elapsedMs <= 300000);
    assert.deepEqual(row.caseResourceWarmups?.map(item => item.cycle), [1, 2, 3]); assert.deepEqual(row.caseResourceCycles?.map(item => item.cycle), Array.from({length: 30}, (_, i) => i + 1));
    assert.deepEqual(row.caseResourceObservationChecks?.map(check => check.phase), PHASES); assert.ok(row.caseResourceObservationChecks.every(check => check.status === 'passed'));
    assert.deepEqual(capture.checkpoints.filter(check => check.phase !== 'final' && check.phase !== 'failure' && check.status === 'passed').map(check => check.phase), PHASES);
    assert.equal(row.caseTiming?.browserAnimationFrameIntervals?.count, 119);
    outcome = 'native-passed';
  } else {
    assert.notEqual(rawExitCode, 0); assert.equal(report.status, 'failed');
    assert.ok(typeof row.error === 'string' && row.error.length > 0);
    if (/Scenario exceeded its 300000 ms review budget/.test(row.error)) {
      assert.ok(Number.isFinite(capture.deadlineObservation?.elapsedMs) && capture.deadlineObservation.elapsedMs >= 300000);
      assert.equal(capture.withinBudgetCompletion, undefined);
      outcome = 'native-deadline-failed';
    } else outcome = 'other-native-failure';
  }
  return {variant, runtime_commit: RUNTIMES[variant].commit, runtime_tree: RUNTIMES[variant].tree,
    harness_commit: report.harnessCommit, observation: outcome, raw_process_exit_code: rawExitCode,
    native_report_status: report.status, scenario_status: row.status, scenario_error: row.error ?? null,
    setup_error: report.setupError ?? null, deadline: capture.deadlineObservation ?? null,
    within_budget_completion: capture.withinBudgetCompletion ?? null,
    saved_warmups: row.caseResourceWarmups?.length ?? 0, saved_cycles: row.caseResourceCycles?.length ?? 0,
    saved_pairs: row.caseResourceObservationChecks?.length ?? 0, timing: row.caseTiming ?? null,
    full_acceptance: false, release_acceptance: false, limitation: LIMITATION};
}
export function validatePairOrder(previous, current) {
  assert.equal(previous.variant, 'control'); assert.equal(current.variant, 'candidate');
  for (const key of ['harness_commit', 'runner_name', 'hostname', 'run_id', 'run_attempt', 'job']) assert.equal(current[key], previous[key], `Pair worker/run identity differs: ${key}`);
  assert.equal(previous.runtime_commit, RUNTIMES.control.commit); assert.equal(current.runtime_commit, RUNTIMES.candidate.commit);
  assert.equal(current.run_attempt, '1', 'This bounded diagnostic does not authorize automatic reruns');
  assert.ok(Number.isFinite(Date.parse(previous.finished_at)) && Number.isFinite(Date.parse(current.started_at)));
  assert.ok(Date.parse(current.started_at) >= Date.parse(previous.finished_at), 'Candidate cannot overlap or precede control');
}
async function optionalText(path) { try { return await readFile(path, 'utf8'); } catch (error) { return {unavailable: error.code ?? String(error)}; } }
export async function environment() {
  return {at: new Date().toISOString(), node: process.version, platform: process.platform, arch: process.arch,
    hostname: os.hostname(), os_release: os.release(), cpus: os.cpus(), loadavg: os.loadavg(), total_memory: os.totalmem(), free_memory: os.freemem(),
    uptime: os.uptime(), driver_usage: process.resourceUsage(), runner_name: process.env.RUNNER_NAME ?? null,
    run_id: process.env.GITHUB_RUN_ID ?? null, run_attempt: process.env.GITHUB_RUN_ATTEMPT ?? null,
    job: process.env.GITHUB_JOB ?? null, image_os: process.env.ImageOS ?? null, image_version: process.env.ImageVersion ?? null,
    proc_stat: await optionalText('/proc/stat'), proc_meminfo: await optionalText('/proc/meminfo'),
    cgroup_cpu_stat: await optionalText('/sys/fs/cgroup/cpu.stat'), cgroup_memory_events: await optionalText('/sys/fs/cgroup/memory.events')};
}
export async function inventory(root, relative = '') {
  const files = [];
  for (const entry of await readdir(join(root, relative), {withFileTypes: true})) {
    const path = join(relative, entry.name);
    if (entry.isDirectory()) files.push(...await inventory(root, path));
    else {assert.ok(entry.isFile(), 'Built artifacts must be regular files'); const bytes = await readFile(join(root, path)); files.push({path, bytes: bytes.length, sha256: hash(bytes)});}
  }
  return files.sort((a, b) => a.path.localeCompare(b.path));
}
async function run(variant) {
  assert.equal(process.env.GITHUB_ACTIONS, 'true', 'No local browser is permitted');
  assert.equal(process.env.SPATIAL_BROWSER_REVIEW, 'github-actions'); assert.ok(ORDER.includes(variant));
  assert.equal(process.env.GITHUB_RUN_ATTEMPT, '1', 'Only the first diagnostic attempt is authorized by this bounded driver');
  assert.match(process.env.SPATIAL_DIAGNOSTIC_HARNESS_SHA ?? '', /^[a-f0-9]{40}$/u);
  assert.equal(process.env.SPATIAL_DIAGNOSTIC_HARNESS_SHA, process.env.GITHUB_SHA);
  const scripts = dirname(fileURLToPath(import.meta.url)), spatial = resolve(scripts, '..'), repository = resolve(spatial, '..');
  const git = args => execFileSync('git', args, {cwd: repository, encoding: 'utf8'}).trim();
  const verifyRuntime = () => {
    assert.equal(git(['rev-parse', 'HEAD']), RUNTIMES[variant].commit);
    assert.equal(git(['rev-parse', 'HEAD^{tree}']), RUNTIMES[variant].tree);
    assert.equal(git(['diff', 'HEAD', '--name-only']), '', 'No tracked runtime or oracle overlay is permitted');
  };
  verifyRuntime();
  const sources = Object.fromEntries(await Promise.all(Object.keys(SOURCE_PINS[variant]).map(async name => [name, await readFile(join(scripts, name), 'utf8')])));
  const generated = generateDiagnosticSources(sources, variant), output = join(spatial, 'browser-review', 'p1-lifecycle-diagnostic', variant);
  assert.equal(existsSync(output), false, 'Refusing to overwrite diagnostic evidence'); await mkdir(output, {recursive: true});
  const save = (name, value) => writeFile(join(output, name), JSON.stringify(value, null, 2) + '\n');
  for (const [name, text] of [['p1-lifecycle-generated-main.mjs', generated.main], ['p1-lifecycle-generated-graphics.mjs', generated.graphics]]) {
    await writeFile(join(scripts, name), text, {flag: 'wx'}); await writeFile(join(output, name), text, {flag: 'wx'});
  }
  await save('source-conservation.json', {...generated.conservation, variant, runtime: RUNTIMES[variant], harness_sha: process.env.SPATIAL_DIAGNOSTIC_HARNESS_SHA});
  const build = await inventory(join(spatial, 'dist'));
  assert.ok(build.some(file => file.path === 'index.html') && build.length > 10);
  await save('runtime-build.json', {runtime: RUNTIMES[variant], harness_sha: process.env.SPATIAL_DIAGNOSTIC_HARNESS_SHA,
    tree_sha256: hash(JSON.stringify(build)), files: build, intentionally_different_runtime_builds: true,
    package_sha256: hash(await readFile(join(spatial, 'package.json'))), lock_sha256: hash(await readFile(join(spatial, 'package-lock.json'))),
    playwright_version: JSON.parse(await readFile(join(spatial, 'node_modules/playwright/package.json'), 'utf8')).version});
  const before = await environment(); await save('environment-before.json', before);
  assert.ok(process.env.SPATIAL_DIAGNOSTIC_PAIR_DIRECTORY, 'A shared pair-order directory is required');
  const pairDirectory = resolve(process.env.SPATIAL_DIAGNOSTIC_PAIR_DIRECTORY); await mkdir(pairDirectory, {recursive: true});
  const identity = {variant, runtime_commit: RUNTIMES[variant].commit, harness_commit: process.env.SPATIAL_DIAGNOSTIC_HARNESS_SHA,
    runner_name: before.runner_name, hostname: before.hostname, run_id: before.run_id, run_attempt: before.run_attempt, job: before.job, started_at: new Date().toISOString()};
  assert.ok(identity.runner_name && identity.run_id && identity.job);
  if (variant === 'candidate') validatePairOrder(JSON.parse(await readFile(join(pairDirectory, 'control-finished.json'), 'utf8')), identity);
  else assert.equal(existsSync(join(pairDirectory, 'candidate-started.json')), false);
  await writeFile(join(pairDirectory, `${variant}-started.json`), JSON.stringify(identity, null, 2) + '\n', {flag: 'wx'});
  await save('pair-start.json', identity);
  let child, observation;
  try {
    child = spawnSync(process.execPath, [join(scripts, 'p1-lifecycle-generated-main.mjs')], {cwd: spatial, encoding: 'utf8',
      env: {...process.env, SPATIAL_HEAD_SHA: RUNTIMES[variant].commit, SPATIAL_DIAGNOSTIC_RUNTIME_SHA: RUNTIMES[variant].commit}, maxBuffer: 32 * 1024 * 1024});
    await writeFile(join(output, 'process.stdout'), child.stdout ?? ''); await writeFile(join(output, 'process.stderr'), child.stderr ?? '');
    await save('raw-process-result.json', {status: child.status, signal: child.signal, error: child.error ? String(child.error) : null,
      stdout_sha256: hash(child.stdout ?? ''), stderr_sha256: hash(child.stderr ?? '')});
    assert.equal(child.error, undefined); assert.equal(child.signal, null); verifyRuntime();
    assert.deepEqual(await inventory(join(spatial, 'dist')), build, 'Served runtime build changed during observation');
    const report = JSON.parse(await readFile(join(output, 'diagnostics.json'), 'utf8'));
    const graphics = JSON.parse(await readFile(join(output, 'case-graphics-coverage-index.json'), 'utf8'));
    assert.equal(graphics.browserAcceptancePassed, false); assert.deepEqual(graphics.requiredScenarios, SCENARIOS);
    const lifecycle = report.scenarios[0], canonical = JSON.parse(await readFile(join(output, `${SCENARIOS[0]}.native-webgl.json`), 'utf8'));
    await save('failure-state-identities.json', {deadline: lifecycle.resourceCapture?.deadlineObservation ?? null,
      within_budget_completion: lifecycle.resourceCapture?.withinBudgetCompletion ?? null,
      canonical_raw: {sequence: canonical.sequence, contexts: canonical.contexts.map(c => ({id: c.id, caseLive: c.caseLive}))},
      later_report_terminal: lifecycle.caseTerminalNativeState ?? null,
      limitation: 'Deadline, canonical raw export and later terminal summary are distinct-time observations. Late work cannot turn a failure into a pass.'});
    observation = validateDiagnosticReport(report, variant, child.status);
    await save('diagnostic-observation.json', observation); console.log(JSON.stringify(observation, null, 2));
    // An observed timeout stays a real failed native process and failed CI step.
    process.exitCode = child.status;
  } catch (error) {
    await save('driver-error.json', {error: error.stack ?? String(error), raw_process_status: child?.status ?? null}); throw error;
  } finally {
    await save('environment-after.json', await environment());
    const finished = {...identity, finished_at: new Date().toISOString(), raw_process_status: child?.status ?? null,
      observation: observation?.observation ?? 'inconclusive-driver-failure', release_acceptance: false};
    await writeFile(join(pairDirectory, `${variant}-finished.json`), JSON.stringify(finished, null, 2) + '\n', {flag: 'wx'});
    await save('pair-finished.json', finished);
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 3, 'Use exactly one argument: control or candidate');
  await run(process.argv[2]);
}
