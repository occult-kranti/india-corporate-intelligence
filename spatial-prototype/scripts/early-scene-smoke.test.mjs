/** Portable source contracts only. Never starts a browser or a WebGL context. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GRAPHICS_SCENARIOS, GRAPHICS_SMOKE_SCENARIOS, parseCaseGraphicsReviewMode, selectCaseGraphicsScenarios } from './case-graphics-browser.mjs';
import { MAX_PART_BYTES, MAX_PARTS, partitionBrowserArtifacts } from './partition-browser-artifacts.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const main = await readFile(join(root, 'spatial-prototype/scripts/browser-review.mjs'), 'utf8');
const graphics = await readFile(join(root, 'spatial-prototype/scripts/case-graphics-browser.mjs'), 'utf8');
const workflow = await readFile(join(root, '.github/workflows/spatial-review.yml'), 'utf8');
const sha256 = value => createHash('sha256').update(value).digest('hex');
// Deliberately exact, including the hard-failing pipeline and step budget.
const smokeStep = `      - name: Smoke real native case scene before the full browser review
        working-directory: spatial-prototype
        timeout-minutes: 4
        run: |
          mkdir -p browser-review/early-scene-smoke
          node scripts/browser-review.mjs --early-scene-smoke 2>&1 | tee browser-review/early-scene-smoke/browser-run.log
`;

test('full review is immutable default; only one explicit CLI spelling selects smoke', () => {
  assert.equal(parseCaseGraphicsReviewMode([]), 'full');
  assert.equal(parseCaseGraphicsReviewMode(['--early-scene-smoke']), 'early-scene-smoke');
  assert.equal(selectCaseGraphicsScenarios(), GRAPHICS_SCENARIOS);
  assert.equal(selectCaseGraphicsScenarios('full'), GRAPHICS_SCENARIOS);
  assert.equal(selectCaseGraphicsScenarios(parseCaseGraphicsReviewMode(['--early-scene-smoke'])), GRAPHICS_SMOKE_SCENARIOS);
  assert.deepEqual(GRAPHICS_SMOKE_SCENARIOS, ['40-shared-renderer-native-gl-boundary-and-arrows']);
  assert.ok(Object.isFrozen(GRAPHICS_SCENARIOS) && Object.isFrozen(GRAPHICS_SMOKE_SCENARIOS));
  for (const args of [undefined, null, '', '--early-scene-smoke', [''], ['--full'], ['false'], ['--early-scene-smoke', '--early-scene-smoke'], ['--early-scene-smoke', '--skip-legacy']])
    assert.throws(() => parseCaseGraphicsReviewMode(args));
  for (const mode of ['', null, false, 'smoke', '40', 'all', []]) assert.throws(() => selectCaseGraphicsScenarios(mode));
});

test('smoke retains CI-only launch guard and every original default review scenario', () => {
  const guard = main.indexOf('process.env.GITHUB_ACTIONS !== "true"');
  const secondGuard = main.indexOf('process.env.SPATIAL_BROWSER_REVIEW !== "github-actions"');
  const parse = main.indexOf('const reviewMode = parseCaseGraphicsReviewMode(process.argv.slice(2));');
  const launch = main.indexOf('browser = await chromium.launch(');
  assert.ok(guard >= 0 && secondGuard > guard && parse > secondGuard && launch > parse);
  assert.match(main, /No local browser was launched/);
  assert.match(main, /const earlySceneSmoke = reviewMode === "early-scene-smoke";/);
  assert.match(main, /if \(earlySceneSmoke\) \{\s+await runCaseGraphicsBrowserCases\([^\n]+\{ mode: reviewMode \}\);\s+\} else \{/);
  assert.match(main, /const output = earlySceneSmoke \? join\(root, "browser-review", "early-scene-smoke"\) : join\(root, "browser-review"\);/);
  assert.match(main, /report\.status = process\.exitCode \? "failed" : "passed"/);
  const start = main.indexOf('  await scenario("01-overview-and-source-trail"');
  const last = '  await runCaseGraphicsBrowserCases(caseReviewContext);';
  const end = main.indexOf(last, start) + last.length;
  assert.ok(start > launch && end > start);
  // All original cases and assertions are retained. The sole intentional
  // contract change is close-up thread continuity replacing the former hide
  // expectation, as requested by the user. Pin the entire resulting body.
  assert.equal(sha256(main.slice(start, end)), '0d5c51e6ec41602929676e316db19756407dd007c48d1e86e7511d563955dcda');
  assert.match(main.slice(end), /^\n  \} \/\/ End full review; the CI smoke is an additional gate, never full acceptance\./);
});

test('smoke pins reviewed case 40 native assertions with correctly phased geographic recovery', () => {
  const start = graphics.indexOf('  await run(GRAPHICS_SCENARIOS[0]');
  const end = graphics.indexOf('  for (const [index, dpr]', start);
  assert.equal(sha256(graphics.slice(start, end)), '94f21dbbcbe2666720c9efc17e69b1fc1c11f0f28451702ed4e0d1fc809ce913');
  assert.match(graphics, /\{ mode = 'full' \} = \{\}/);
  assert.match(graphics, /const selectedScenarios = selectCaseGraphicsScenarios\(mode\)/);
  assert.match(graphics, /async function run\(name, options, work\) \{\s+if \(!selectedScenarios\.includes\(name\)\) return;/);
});

test('scoped native coverage remains bounded and fails without preserved actual evidence', () => {
  assert.match(graphics, /budgetMs: 120000/);
  assert.match(graphics, /coverage\.selectedBrowserAcceptancePassed = coverage\.scenarios\.length === selectedScenarios\.length/);
  assert.match(graphics, /coverage\.browserAcceptancePassed = coverage\.scenarios\.length === GRAPHICS_SCENARIOS\.length && coverage\.scenarios\.every\(row => row\.status === 'passed' && row\.nativeEvidence\)/);
  assert.match(graphics, /assert\.ok\(coverage\.selectedBrowserAcceptancePassed/);
  assert.match(graphics, /native-webgl\.json/);
  assert.doesNotMatch(graphics, /from ['"]playwright|chromium\.launch|launchPersistentContext|\.waitForTimeout\(/);
});

test('workflow adds one bounded hard-failing smoke before the unchanged full command', () => {
  assert.equal(workflow.split(smokeStep).length - 1, 1);
  const position = workflow.indexOf(smokeStep);
  const full = `      - name: Review atlas and both qualified readers at the repository subpath
        working-directory: spatial-prototype
        run: node scripts/browser-review.mjs 2>&1 | tee browser-review/browser-run.log
`;
  assert.equal(workflow.indexOf(full), position + smokeStep.length);
  assert.ok(position > workflow.indexOf('run: npx --no-install playwright install --with-deps chromium'));
  assert.doesNotMatch(smokeStep + full, /continue-on-error|if:|\|\| true/);
  assert.match(workflow, /timeout-minutes: 40/);
  assert.match(graphics, /budgetMs: 120000/);
  assert.match(graphics, /GRAPHICS_SCENARIOS\[7\], \{ reducedMotion: true, budgetMs: 300000 \}/);
  assert.match(workflow, /name: Partition complete browser evidence into bounded artifacts\n        if: always\(\)/);
  assert.equal(MAX_PART_BYTES, 170 * 1024 * 1024); assert.equal(MAX_PARTS, 8);
});

test('both DPR resize cases require actual growth, retained sources and fresh explicit re-entry', () => {
  const start = graphics.indexOf('  for (const [index, dpr] of [[1, 1], [2, 2]])');
  const resize = graphics.slice(start, graphics.indexOf('  await run(GRAPHICS_SCENARIOS[3]', start));
  assert.match(resize, /width: 1280, height: 900/); assert.match(resize, /width: 1600, height: 1100/);
  assert.match(resize, /canvas\.width > previous\.actualDrawingBuffer\[0\] && canvas\.height > previous\.actualDrawingBuffer\[1\]/);
  assert.match(resize, /result\.caseResizeGrowth = \{[^]+modeAfterGrowth/);
  assert.match(resize, /\['scene', 'list'\]\.includes\(modeAfterGrowth\)/);
  assert.match(resize, /completeReader = await assertCompleteCaseReader\(page, dense\)/);
  assert.match(resize, /Desktop growth lost semantic history/);
  assert.match(resize, /workspaceBeforeGrowth\.evaluate/);
  assert.match(resize, /getAttribute\('data-case-selection'\), selection/);
  assert.match(resize, /await showCaseScene\(page, until(?:, result, 'desktop-grown-reentry')?\);\s+const reentered = await nativeLayout/);
  assert.match(resize, /'desktop-grown-reentry', until, \{ invalidate: false, afterPass: reentryStart, afterSequence: reentrySequence \}/);
  assert.match(resize, /reentered\.actualDrawingBuffer\.every/);
  assert.match(resize, /identitiesBeforeGrowth, 'Desktop growth or scene re-entry replaced the shared renderer\/context\/canvas'/);
  assert.match(graphics, /\['scene', 'composite'\]\.every\(type =>\s+data\.contexts\.flatMap\(context => context\.passes\)\.some\(pass => pass\.id > options\.afterSequence && pass\.type === type && pass\.draws\.some\(draw => draw\.nativeSucceeded\)\)/);
});

test('normal bounded partition inventory preserves separate smoke and full JSON, PNG and logs', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'early-scene-smoke-contract-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const sourceDirectory = join(directory, 'browser-review'), outputDirectory = join(directory, 'parts');
  await mkdir(join(sourceDirectory, 'early-scene-smoke'), { recursive: true });
  const files = new Map([
    ['diagnostics.json', 'full review JSON'], ['40-native--failure.png', 'full review PNG fixture'], ['browser-run.log', 'full review log'],
    ['early-scene-smoke/diagnostics.json', 'smoke JSON'], ['early-scene-smoke/40-native--failure.png', 'smoke PNG fixture'],
    ['early-scene-smoke/40-native.native-webgl.json', 'smoke native JSON'], ['early-scene-smoke/browser-run.log', 'smoke log'],
  ]);
  for (const [path, content] of files) await writeFile(join(sourceDirectory, path), content);
  const result = await partitionBrowserArtifacts({ sourceDirectory, outputDirectory });
  assert.equal(result.manifest.files.length, files.size);
  for (const row of result.manifest.files) {
    assert.equal(await readFile(join(outputDirectory, row.part, row.archivePath), 'utf8'), files.get(row.path));
    assert.equal(row.sha256, sha256(files.get(row.path)));
  }
});
