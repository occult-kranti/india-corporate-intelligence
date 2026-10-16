/** Portable source/workflow contracts only. Never launches a browser. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GRAPHICS_SCENARIOS, GRAPHICS_SMOKE_SCENARIOS, RESOURCE_DIAGNOSTIC_SCENARIOS,
  RESOURCE_KINDS, parseCaseGraphicsReviewMode, selectCaseGraphicsScenarios } from './case-graphics-browser.mjs';
import { BASELINE_RUNTIME_SHA, CANDIDATE_RUNTIME_SHA, RESOURCE_HARNESS_FILES, hashRuntimeTree } from './resource-lifecycle-environment.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const load = path => readFile(join(root, path), 'utf8');
const main = await load('spatial-prototype/scripts/browser-review.mjs');
const graphics = await load('spatial-prototype/scripts/case-graphics-browser.mjs');
const workflow = await load('.github/workflows/resource-lifecycle-diagnostic.yml');
const hash = value => createHash('sha256').update(value).digest('hex');

test('strict explicit diagnostic selects only scenario 46; full and smoke selections are intact', () => {
  assert.equal(parseCaseGraphicsReviewMode([]), 'full');
  assert.equal(selectCaseGraphicsScenarios(), GRAPHICS_SCENARIOS);
  assert.equal(selectCaseGraphicsScenarios(parseCaseGraphicsReviewMode(['--early-scene-smoke'])), GRAPHICS_SMOKE_SCENARIOS);
  assert.equal(parseCaseGraphicsReviewMode(['--resource-lifecycle-diagnostic']), 'resource-lifecycle-diagnostic');
  assert.equal(selectCaseGraphicsScenarios('resource-lifecycle-diagnostic'), RESOURCE_DIAGNOSTIC_SCENARIOS);
  assert.ok(Object.isFrozen(RESOURCE_DIAGNOSTIC_SCENARIOS));
  assert.deepEqual(RESOURCE_DIAGNOSTIC_SCENARIOS, ['46-thirty-cycle-native-resource-handle-plateau']);
  for (const args of [null, undefined, '--resource-lifecycle-diagnostic', ['--resource-lifecycle'],
    ['--resource-lifecycle-diagnostic=true'], ['--resource-lifecycle-diagnostic', '--early-scene-smoke'],
    ['--early-scene-smoke', '--resource-lifecycle-diagnostic'], ['--resource-lifecycle-diagnostic', '--resource-lifecycle-diagnostic'],
    ['--resource-lifecycle-diagnostic', '--skip-checks'], [' --resource-lifecycle-diagnostic'], ['--RESOURCE-LIFECYCLE-DIAGNOSTIC']])
    assert.throws(() => parseCaseGraphicsReviewMode(args));
  assert.throws(() => selectCaseGraphicsScenarios('resource'));
});

test('entire original default suite, exact scenario 46, native observer and compact observation remain pinned', async () => {
  const fullStart = main.indexOf('  await scenario("01-overview-and-source-trail"');
  const last = '  await runCaseGraphicsBrowserCases(caseReviewContext);';
  assert.equal(hash(main.slice(fullStart, main.indexOf(last, fullStart) + last.length)), '0d5c51e6ec41602929676e316db19756407dd007c48d1e86e7511d563955dcda');
  const lifecycle = graphics.slice(graphics.indexOf('  await run(GRAPHICS_SCENARIOS[7]'), graphics.indexOf('  coverage.scenarios ='));
  assert.equal(hash(lifecycle), 'c4689854c0bde8b5d7160984c53d78d511ddebe41582c74811b5a791c86c7fde');
  assert.match(lifecycle, /budgetMs: 300000/); assert.match(lifecycle, /index <= 30/);
  assert.match(lifecycle, /frames\(120, true\)/); assert.match(lifecycle, /caseResourceObservationChecks.length, 9/);
  assert.equal(RESOURCE_KINDS.length, 11);
  const nativeStart = graphics.indexOf('export function installCaseGraphicsProbe(');
  assert.equal(hash(graphics.slice(nativeStart, graphics.indexOf('\nexport ', nativeStart + 1))), '02fc5150090584895c7ad7f41f9132e974e08e3a0c37184f994b47e8d68612dd');
  assert.equal(hash(await load('spatial-prototype/scripts/case-lifecycle-observation.mjs')), 'd9add97bba0ea2d55c07b8e2ce8c62dda5f1349fad004a0147541aeb87bf6bc4');
});

test('existing CI/full/early-smoke/release/deployment workflow files remain byte-identical', async () => {
  const pins = {
    'spatial-review.yml': '6e61dbed25dabb0c09f4d534d56204a9edbd61231edfc61bb2fc4de80929c50a',
    'spatial-release-review.yml': 'b44c60f5d8b8cbdafb27fa0df28fd1581798080b22376013701d3f17f1828b75',
    'thread-zoom-review.yml': '584ee74a1a95c569972a79070b707bc458c40607ac2637ab06779ec1fc2a1f1e',
    'ci.yml': '3f7f83fd029cd400e69f783e40dae8598360ebb849836d7d5f31e4cb536ec393',
    'deploy.yml': '7419533c251981aed4a073bda9643e5104d2e0ad6c46ae09b7db3f1a5414ef99',
  };
  for (const [name, sha] of Object.entries(pins)) assert.equal(hash(await load(`.github/workflows/${name}`)), sha, name);
});

test('diagnostic uses exactly the guarded fresh launcher and preserves timeout profile before other cleanup', () => {
  assert.equal(main.match(/chromium\.launch\(/g).length, 1);
  assert.ok(main.indexOf('process.env.GITHUB_ACTIONS !== "true"') < main.indexOf('browser = await chromium.launch('));
  assert.ok(main.indexOf('process.env.SPATIAL_BROWSER_REVIEW !== "github-actions"') < main.indexOf('browser = await chromium.launch('));
  assert.match(main, /if \(resourceLifecycleDiagnostic\) \{\s+await runCaseGraphicsBrowserCases\([^\n]+\{ mode: reviewMode \}\);\s+\} else if \(earlySceneSmoke\)/);
  assert.match(main, /resourceLifecycleDiagnostic \? join\(root, "browser-review", "resource-lifecycle-diagnostic"\)/);
  const scenario = main.slice(main.indexOf('async function scenario('), main.indexOf('\ntry {\n  const checkedOutCommit'));
  assert.ok(scenario.indexOf('await cpuProfile.start(context, page)') < scenario.indexOf('const response = await page.goto'));
  const cleanup = scenario.slice(scenario.indexOf('  } finally {\n    clearTimeout(deadline);'));
  assert.ok(cleanup.indexOf('await cpuProfile.stop()') < cleanup.indexOf('await options.afterScenario()'));
  assert.ok(cleanup.indexOf('await cpuProfile.stop()') < cleanup.indexOf('await context.tracing.stop('));
  assert.ok(cleanup.indexOf('await cpuProfile.stop()') < cleanup.indexOf('await context.close()'));
  assert.match(scenario, /result.cpuProfileError = String\(error\);\s+result.status = "failed"/);
  assert.match(main, /resourceLifecycleDiagnostic \? process.env.SPATIAL_HEAD_SHA : process.env.GITHUB_SHA/);
  assert.match(main, /process.env.SPATIAL_RUNTIME_ROLE === "baseline" \? BASELINE_RUNTIME_SHA : CANDIDATE_RUNTIME_SHA/);
  assert.match(main, /Never full-suite acceptance/);
  assert.match(main, /result.resourceDiagnosticDeadline =/);
  assert.match(main, /Original Promise.race work is not cancelled; post-deadline samples are diagnostic only/);
  assert.match(graphics, /coverage.browserAcceptancePassed = coverage.scenarios.length === GRAPHICS_SCENARIOS.length/);
});

test('workflow is branch-only/manual, read-only, one sequential job with independently pinned runtimes', () => {
  assert.match(workflow, /push:\s+branches: \[diagnostic\/pr15-resource-attribution\]/);
  assert.match(workflow, /workflow_dispatch:/); assert.doesNotMatch(workflow, /pull_request:|matrix:|continue-on-error:|contents: write|deploy-pages/);
  assert.match(workflow, /permissions:\s+contents: read/);
  assert.equal(workflow.match(/^  [a-z][a-z0-9-]*:\n(?=    name:)/gm).length, 1);
  assert.equal(BASELINE_RUNTIME_SHA, '85702ec5f553415e009a37e89d7333c96c952c66');
  assert.equal(CANDIDATE_RUNTIME_SHA, '6ea92299d21ac5ab92686b714420d363de08fa99');
  assert.match(workflow, new RegExp(`ref: ${BASELINE_RUNTIME_SHA}\\s+path: pinned-baseline`));
  assert.match(workflow, new RegExp(`ref: ${CANDIDATE_RUNTIME_SHA}\\s+path: pinned-candidate`));
  assert.ok(workflow.indexOf('id: baseline_profile') < workflow.indexOf('id: candidate_build'));
  for (const role of ['baseline', 'candidate']) {
    assert.match(workflow, new RegExp(`id: ${role}_build\\s+if: always\\(\\) && steps.harness.outcome == 'success'`));
    assert.match(workflow, new RegExp(`id: ${role}_profile\\s+if: always\\(\\) && steps.${role}_build.outcome == 'success'\\s+timeout-minutes: 9`));
    assert.match(workflow, new RegExp(`name: resource-lifecycle-${role}-`));
  }
  assert.equal(workflow.match(/node --cpu-prof --cpu-prof-interval=1000 --cpu-prof-dir=browser-review\/resource-lifecycle-diagnostic --cpu-prof-name=driver.cpuprofile scripts\/browser-review.mjs --resource-lifecycle-diagnostic/g).length, 2);
  assert.equal(workflow.match(/node scripts\/resource-lifecycle-environment.mjs before/g).length, 2);
  assert.equal(workflow.match(/node scripts\/resource-lifecycle-environment.mjs after/g).length, 2);
  assert.equal(workflow.match(/npm ci 2>&1 \| tee/g).length, 2);
  assert.equal(workflow.match(/npm run build 2>&1 \| tee/g).length, 2);
  assert.equal(workflow.match(/pipeline=\( "\$\{PIPESTATUS\[@\]\}" \)/g).length, 2);
  assert.match(workflow, /Neither outcome establishes full-suite acceptance/);
});

test('only identical explicitly named harness files are copied; source, data and dependency bytes remain pinned', async () => {
  assert.ok(Object.isFrozen(RESOURCE_HARNESS_FILES));
  assert.equal(new Set(RESOURCE_HARNESS_FILES).size, RESOURCE_HARNESS_FILES.length);
  for (const file of RESOURCE_HARNESS_FILES) {
    assert.match(file, /^[a-z0-9-]+\.mjs$/);
    const source = await load(`spatial-prototype/scripts/${file}`);
    for (const match of source.matchAll(/(?:from\s*|import\s*)['"]\.\/([^'"]+\.mjs)['"]/g))
      assert.ok(RESOURCE_HARNESS_FILES.includes(match[1]), `Missing static import ${file} -> ${match[1]}`);
  }
  assert.match(workflow, /for \(const name of RESOURCE_HARNESS_FILES\)/);
  assert.match(workflow, /await copyFile\(source, target\)/);
  assert.match(workflow, /assert.deepEqual\(await readFile\(target\), await readFile\(source\)\)/);
  assert.equal(workflow.match(/git diff --exit-code -- spatial-prototype\/src spatial-prototype\/public spatial-prototype\/package.json spatial-prototype\/package-lock.json spatial-prototype\/vite.config.ts spatial-prototype\/tsconfig.json/g).length, 2);
});

test('both artifact streams use unchanged no-truncation partitioner and sixteen individually bounded upload slots', async () => {
  const partition = await load('spatial-prototype/scripts/partition-browser-artifacts.mjs');
  assert.match(partition, /MAX_PART_BYTES = 170 \* 1024 \* 1024/);
  assert.match(partition, /MAX_PARTS = 8/);
  assert.equal(workflow.match(/uses: actions\/upload-artifact@v4/g).length, 16);
  for (const role of ['baseline', 'candidate']) for (let index = 1; index <= 8; index++) {
    const part = String(index).padStart(2, '0');
    assert.ok(workflow.includes(`steps.${role}_parts.outputs.part_${part} == 'true'`));
    assert.ok(workflow.includes(`path: pinned-${role}/spatial-prototype/browser-artifact-parts/${part}/`));
  }
  assert.doesNotMatch(workflow, /rm -|trace.*(false|delete|remove)/);
});

test('runtime receipt hashes exact bytes and rejects symlinks without reading secrets', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'resource-runtime-receipt-'));
  try {
    await mkdir(join(temp, 'src')); await writeFile(join(temp, 'src/a'), 'a');
    const before = await hashRuntimeTree(temp, ['src']);
    assert.equal(before.files.length, 1); assert.equal(before.files[0].sha256, hash('a'));
    await writeFile(join(temp, 'src/a'), 'b');
    assert.notEqual((await hashRuntimeTree(temp, ['src'])).manifestSha256, before.manifestSha256);
    await symlink(join(temp, 'src/a'), join(temp, 'src/link'));
    await assert.rejects(hashRuntimeTree(temp, ['src']), /symbolic links/);
    const source = await load('spatial-prototype/scripts/resource-lifecycle-environment.mjs');
    assert.doesNotMatch(source, /Object\.(entries|keys)\(process.env\)|hostname\(|userInfo\(/);
    assert.match(source, /cpuCount: cpu.length/); assert.match(source, /freeMemoryBytes: freemem\(\)/);
    assert.match(source, /git\(\['status', '--porcelain'/);
  } finally { await rm(temp, { recursive: true, force: true }); }
});
