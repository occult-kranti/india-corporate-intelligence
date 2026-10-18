/** Dependency-free contract tests. Never imports Playwright or a DOM runtime. */
import { performance } from 'node:perf_hooks';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { STORAGE_KEY, PAGES, VIEWPORTS, PLAN, ROOT_PLAN, LIMITS, validateRootObservations, requireSameDocumentRootNavigation, requireRootMaterial, requireRootOverflow, requireReducedMotion, FILTERS, until, boundedLifecycle, verifyBoundResponse, requireVerifiedPath, requirePreference, requireOfflineRequests, requireAdvancedState, requireFilteredRecords, requireResetRecords, artifactInventory, artifactLedger, verifyClosedArtifacts, REQUIRED_SOURCE_PATHS, REQUIRED_GLOBAL_OUTPUTS, requireCI, rgb, contrast, safeRelative, validateSourceContract, validateResponseResults, validatePlan } from './spatial-release-felt.browser.mjs';
const exec = promisify(execFile);
const script = fileURLToPath(new URL('./spatial-release-felt.browser.mjs', import.meta.url));
const source = await readFile(script, 'utf8');
const contract = JSON.parse(await readFile(new URL('./spatial-release-felt.sources.json', import.meta.url)));
const runner = await readFile(new URL('./spatial-release.browser.mjs', import.meta.url), 'utf8');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const clone = value => JSON.parse(JSON.stringify(value));
const passingResults = () => PLAN.map(spec => ({ name: spec.name, status: 'passed', screenshots: spec.shots.map(name => ({ name, caption: 'Portable contract fixture only; never native evidence.' })), ...(spec.observations ? { rootObservations: Object.fromEntries(spec.observations.map(key => [key, { portableFixture: true }])) } : {}) }));
const responseResult = () => ({ bindingErrors: [], pageErrors: [], failedRequests: [], unexpectedExternal: [], responses: [], expectedFailureHits: 0 });

test('module and integrated runner parse without a browser or DOM', async () => {
  for (const path of [script, fileURLToPath(new URL('./spatial-release.browser.mjs', import.meta.url))]) assert.equal((await exec(process.execPath, ['--check', path])).stderr, '');
});
test('local direct invocation refuses before filesystem output or browser access', async () => {
  await assert.rejects(exec(process.execPath, [script], { env: { ...process.env, GITHUB_ACTIONS: '', SPATIAL_RELEASE_REVIEW: '' } }), error => {
    assert.match(error.stderr, /restricted to GitHub Actions. No local browser was launched/);
    assert.doesNotMatch(error.stderr, /ERR_MODULE_NOT_FOUND|ENOENT|Executable doesn't exist/); return true;
  });
  assert.doesNotMatch(source, /import\(['"]playwright['"]\)|chromium\.launch|browser\.launch/);
});
test('CI admission requires both gates and two exact SHA identities', () => {
  const env = { GITHUB_ACTIONS: 'true', SPATIAL_RELEASE_REVIEW: 'github-actions', GITHUB_SHA: '1'.repeat(40), SPATIAL_HEAD_SHA: '2'.repeat(40) };
  requireCI(env);
  for (const key of Object.keys(env)) assert.throws(() => requireCI({ ...env, [key]: '' }), key);
  assert.throws(() => requireCI({ ...env, GITHUB_SHA: 'branch-name' }));
});
function stripReviewedAtlasSettlement(text) {
  const begin = '// BEGIN REVIEWED ATLAS HEADER SETTLEMENT\n', end = '// END REVIEWED ATLAS HEADER SETTLEMENT\n\n';
  const call = '  // REVIEWED ATLAS HEADER SETTLEMENT CALL\n  if (phase === \'wrapped-navigation-text\') await settleAtlasHeaderClearance(page, result, mode, phase);\n';
  for (const marker of [begin.trimEnd(), end.trimEnd(), '  // REVIEWED ATLAS HEADER SETTLEMENT CALL', '  if (phase === \'wrapped-navigation-text\') await settleAtlasHeaderClearance(page, result, mode, phase);']) assert.equal(text.split(marker).length - 1, 1, `Exactly one reviewed settlement marker/call required: ${marker}`);
  const first = text.indexOf(begin), last = text.indexOf(end);
  assert.ok(first >= 0 && last > first, 'Reviewed settlement block markers must be exact and ordered');
  const block = text.slice(first, last + end.length);
  assert.equal(hash(block), 'a4a3ddd42dc1b927d08ee3294b63ca4696947c36c84b79355ff7216eed2eec6c', 'Only the exact reviewed readiness block may be reversed');
  assert.equal(text.split(call).length - 1, 1, 'Reviewed settlement call must remain exact');
  const prefix = "async function atlasActivityNavigation(page, result, mode, phase = 'initial') {\n  await page.evaluate(async () => {\n    await document.fonts.ready;\n    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));\n  });\n";
  const context = prefix + call + '  const frame = await page.evaluate(() => {\n';
  assert.equal(text.split(context).length - 1, 1, 'Reviewed wrapped-only settlement must follow the exact fonts/two-frame wait immediately before the final sample');
  return text.replace(block, '').replace(call, '');
}

test('historical combined code is recovered exactly after reversing the reviewed settlement and additive felt hook', () => {
  let original = stripReviewedAtlasSettlement(runner).replace("const { runFeltReview } = await import('./spatial-release-felt.browser.mjs');\n", '');
  original = original.replace('  // Separate additive evidence; the original eight scenarios stay unchanged.\n  report.feltUI = await runFeltReview({ browser, root, dist, output, origin, base });\n', '');
  original = original.replace(" && report.feltUI?.status === 'passed'", '');
  original = original.replace("    `Additive felt UI: ${report.feltUI?.status ?? 'not run'}; see felt-ui/summary.md and felt-ui/artifacts.json.`,\n", '');
  assert.equal(hash(original), '4721b73c2e8c44e425eaad37e246cd87e63165221b23351bbddd724d77284232');
  assert.ok(runner.indexOf("process.env.GITHUB_ACTIONS !== 'true'") < runner.indexOf("await import('./spatial-release-felt.browser.mjs')"));
  assert.ok(runner.indexOf('await runFeltReview') > runner.indexOf("await scenario('qualified-jio-and-progressive-original-global'"));
  assert.match(runner, /report\.scenarios\.length === 8/); assert.match(runner, /join\(root, 'spatial-release-review'\)/);
});
test('existing workflow permissions, gates, ordering, budgets and artifact paths are byte-preserved', async () => {
  // Exact SHA values below are generated from the deployed-tree-bound baselines.
  const expected = JSON.parse('{"spatial-release-review.yml": "b44c60f5d8b8cbdafb27fa0df28fd1581798080b22376013701d3f17f1828b75", "deploy.yml": "7419533c251981aed4a073bda9643e5104d2e0ad6c46ae09b7db3f1a5414ef99"}');
  for (const [file, sha256] of Object.entries(expected)) {
    const workflow = await readFile(new URL(`../.github/workflows/${file}`, import.meta.url), 'utf8');
    assert.equal((workflow.match(/ scripts\/spatial-release-felt\.browser\.test\.mjs/g) ?? []).length, 1);
    assert.equal(hash(workflow.replace(' scripts/spatial-release-felt.browser.test.mjs', '').replace('      - \"scripts/spatial-release-felt.sources.json\"\n', '')), sha256);
    if (file === 'spatial-release-review.yml') assert.ok(workflow.includes('      - \"scripts/spatial-release-felt.sources.json\"')); 
    assert.match(workflow, /spatial-release-review\//);
  }
});
test('the reviewed source contract binds all nine composition files and exact supporting consumers', () => {
  validateSourceContract(contract);
  assert.ok(REQUIRED_SOURCE_PATHS.includes('docs/research/2026-10-17-satellite-university-bitcoin-update.md'));
  for (const spec of PAGES) assert.ok(REQUIRED_SOURCE_PATHS.includes(`global-evidence-workbench/ui/${spec.file}`));
  assert.ok(REQUIRED_SOURCE_PATHS.includes('src/components/investigation/graph.css'));
  assert.equal(REQUIRED_GLOBAL_OUTPUTS.length, 19);
});
test('missing, duplicate, extra or malformed source pins fail closed', () => {
  for (const path of REQUIRED_SOURCE_PATHS) { const bad = clone(contract); bad.files = bad.files.filter(pin => pin.path !== path); assert.throws(() => validateSourceContract(bad), path); }
  for (const mutate of [
    bad => bad.files.push(bad.files[0]), bad => bad.files.push({ ...bad.files[0], path: 'extra.js' }),
    bad => { bad.files[0].sha256 = 'invalid'; }, bad => { bad.files[0].gitBlob = ''; },
    bad => { bad.files[0].bytes = 0; }, bad => { bad.baseCommit = '0'.repeat(40); },
    ...['baseTree', 'productCompositionTree', 'priorCompositionTree', 'priorCompositionManifestSha256', 'rootShellSealSha256', 'rootShellReviewSha256'].map(key => bad => { bad[key] = '0'.repeat(64); }),
  ]) { const bad = clone(contract); mutate(bad); assert.throws(() => validateSourceContract(bad)); }
});
test('missing or duplicate built-output pins fail including each unchanged offline export', () => {
  for (const path of REQUIRED_GLOBAL_OUTPUTS) { const bad = clone(contract); bad.globalBuildFiles = bad.globalBuildFiles.filter(pin => pin.path !== path); assert.throws(() => validateSourceContract(bad), path); }
  const bad = clone(contract); bad.globalBuildFiles.push(bad.globalBuildFiles[0]); assert.throws(() => validateSourceContract(bad));
  for (const spec of PAGES) assert.ok(REQUIRED_GLOBAL_OUTPUTS.includes(`global-workbench/${spec.offline}`));
});
test('scenario and screenshot inventories cover all three pages at two explicit viewports', () => {
  assert.equal(STORAGE_KEY, 'fieldwork:geographic-view:v1');
  assert.deepEqual(Object.keys(VIEWPORTS), ['desktop', 'narrow']); assert.deepEqual(VIEWPORTS.narrow, { width: 390, height: 844 });
  assert.equal(PLAN.length, 27); assert.equal(PLAN.reduce((n, item) => n + item.shots.length, 0), 55);
  assert.equal(hash(JSON.stringify(PLAN.slice(0, 21))), '7a016cf744f96564fa074bc3dfb475949d77539d7d8b08181050ceea2bebbc93', 'Original 21 identities and 36 capture names are immutable');
  assert.equal(ROOT_PLAN.length, 6); assert.equal(ROOT_PLAN.reduce((n, item) => n + item.shots.length, 0), 19);
  for (const page of PAGES) for (const kind of ['desktop', 'narrow', 'storage-invalid', 'storage-denied', 'offline', 'load-error']) assert.ok(PLAN.some(item => item.name === `${page.id}-${kind}`));
  validatePlan(passingResults());
});
test('skipping any page, viewport, case, screenshot or failure cannot pass', () => {
  for (let index = 0; index < PLAN.length; index += 1) {
    const skipped = passingResults(); skipped.splice(index, 1); assert.throws(() => validatePlan(skipped));
    const failed = passingResults(); failed[index].status = 'failed'; assert.throws(() => validatePlan(failed));
    if (PLAN[index].shots.length) { const shot = passingResults(); shot[index].screenshots.pop(); assert.throws(() => validatePlan(shot)); }
  }
  const extra = passingResults(); extra.push(extra[0]); assert.throws(() => validatePlan(extra));
});
test('opaque contrast math matches black/white and reviewed felt/paper references', () => {
  assert.equal(contrast('#000000', '#ffffff'), 21); assert.equal(contrast('#ffffff', '#000000'), 21);
  assert.equal(contrast('#ffffff', '#ffffff'), 1);
  assert.ok(contrast('#f2eddc', '#0a241c') > 13); assert.ok(contrast('#566a70', '#f5f3ec') > 5);
  assert.deepEqual(rgb('rgb(10, 36, 28)'), [10, 36, 28]); assert.deepEqual(rgb('rgba(10, 36, 28, 1)'), [10, 36, 28]);
});
test('unsupported or translucent computed colors cannot silently become a passing contrast ratio', () => {
  for (const value of ['transparent', 'rgba(0, 0, 0, 0.5)', 'rgb(999, 0, 0)', 'red', 'color(display-p3 1 0 0)', '#fff']) assert.throws(() => rgb(value));
});
test('artifact paths reject traversal, absolute paths and path aliases', () => {
  for (const value of ['', '/tmp/evidence.png', '../report.json', 'a/../b', './b', 'a//b', 'a\\b']) assert.throws(() => safeRelative(value));
  assert.equal(safeRelative('global-desktop--flat-map.png'), 'global-desktop--flat-map.png');
});
test('expected load error is exact, one-shot and separate from unexpected runtime/network errors', () => {
  const path = '/india-corporate-intelligence/global-workbench/public/data/dataset.json';
  const good = responseResult(); good.expectedFailureHits = 1; good.responses = [{ url: `http://127.0.0.1:1${path}`, status: 503 }];
  validateResponseResults(good, path); validateResponseResults(responseResult());
  for (const mutate of [
    result => { result.pageErrors = ['unexpected']; }, result => { result.bindingErrors = ['wrong SHA']; },
    result => { result.failedRequests = ['unexpected']; }, result => { result.unexpectedExternal = ['https://invalid.example']; },
    result => { result.responses[0].status = 500; }, result => { result.expectedFailureHits = 0; },
    result => { result.responses.push(result.responses[0]); }, result => { result.responses[0].url = 'http://127.0.0.1:1/wrong.json'; },
  ]) { const bad = clone(good); mutate(bad); assert.throws(() => validateResponseResults(bad, path)); }
  assert.throws(() => validateResponseResults(good));
  const icon = responseResult(); icon.responses = [{ url: 'http://127.0.0.1:1/favicon.ico', status: 404 }]; validateResponseResults(icon);
  icon.responses[0].status = 500; assert.throws(() => validateResponseResults(icon));
  icon.responses[0] = { url: 'http://127.0.0.1:1/missing.js', status: 404 }; assert.throws(() => validateResponseResults(icon));
});
test('storage tests cover getter denial, invalid initial value, explicit selection, reload and shared-origin navigation', () => {
  for (const evidence of ['storageState:', "Object.defineProperty(window, 'localStorage'", "'SecurityError'", "'invalid-native-fixture'", "await stored(page), null", "await stored(page), 'globe'", "await stored(page), 'map'", "'same-origin-preference'", "await page.reload", '.section-nav a[href=']) assert.ok(source.includes(evidence), evidence);
});
test('keyboard, selection, source activation, empty/reset, geometry and focus observations remain native', () => {
  for (const evidence of ["page.keyboard.press('Tab')", "page.keyboard.press('Enter')", "page.keyboard.press('Space')", 'Native map marker', 'Native table selection', '#network-focus', '#empty-reset', '#more', ':focus-visible', "page.context().waitForEvent('page')", 'opener === null', "contentType: 'text/html'", 'sourceFixtureHits, 1', 'No external network dependencies']) assert.ok(source.includes(evidence), evidence);
  assert.doesNotMatch(source, /dispatchEvent\(|\.click\(\{\s*force|\.addStyleTag\(|\.setContent\(/);
});
test('actual root token consumers and accepted green shell override are explicitly measured', () => {
  for (const evidence of ["'#/energy'", '.atlas-linked-network .atlas-network .iw-graph', '.iw-surface-connections .iw-graph-panel .iw-graph', 'Zoom in relationship graph', 'rootTokens', 'rootShellMaterial', 'rootFocus', 'focus.ratio >= 3', "rootShellMaterial, 'rgb(10, 36, 28)'"]) assert.ok(source.includes(evidence), evidence);
  assert.doesNotMatch(source, /preservedRootShell|rgb\(7, 28, 36\)/);
  requireRootMaterial({ background: 'rgb(10, 36, 28)', backgroundImage: 'none' }, 'rgb(10, 36, 28)');
  assert.throws(() => requireRootMaterial({ background: 'rgb(7, 28, 36)', backgroundImage: 'none' }, 'rgb(10, 36, 28)'));
});
test('closed artifact bytes, runtime identity and finally cleanup are additive and bounded', () => {
  assert.equal(LIMITS.suiteMs, 540000); assert.equal(LIMITS.scenarioMs, 90000); assert.equal(LIMITS.artifactBytes, 48 * 1024 * 1024);
  for (const evidence of ["await mkdir(folder)", "flag: 'wx'", "'artifacts.json'", 'PNG required', 'validatePlan(report.scenarios)', "git(['rev-parse', 'HEAD'])", "git(['rev-parse', 'HEAD^{tree}'])", "git(['rev-parse', `HEAD:${path}`])", "report.playwright.version, '1.62.1'", 'await context?.close()', 'clearTimeout(timer)', 'cleanupReserveMs: 2000', 'Promise.allSettled([setupTask, workTask, drainTask]', 'verifyClosedArtifacts(artifacts', 'artifactInventory(artifacts', 'await Promise.all([...result.pending])']) assert.ok(source.includes(evidence), evidence);
  assert.ok(source.includes('No synthetic screenshots or success receipt are written for unexecuted cases'));
});

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const never = () => new Promise(() => {});
test('absolute lifecycle admits setup/work/drain/cleanup/settlement only inside one deadline', async () => {
  const calls = [];
  await boundedLifecycle({ deadline: performance.now() + 100, cleanupReserveMs: 10, label: 'positive',
    setup: async () => { calls.push('setup'); return 'resource'; },
    work: async resource => { assert.equal(resource, 'resource'); calls.push('work'); },
    drain: async () => { calls.push('drain'); }, cleanup: async () => { calls.push('cleanup'); }, validate: async () => { calls.push('validate'); },
  });
  assert.deepEqual(calls, ['setup', 'work', 'drain', 'cleanup', 'drain', 'validate']);
});
test('delayed and never-settling setup/work/drain/cleanup cannot pass or hold the caller past its deadline', async () => {
  for (const phase of ['setup', 'work', 'drain', 'cleanup']) for (const mode of ['delayed', 'never']) {
    let validated = false, cleaned = false;
    const start = performance.now();
    const options = { deadline: start + 25, cleanupReserveMs: 5, label: `${phase}/${mode}`,
      setup: async () => 'resource', work: async () => {}, drain: async () => {},
      cleanup: async () => { cleaned = true; }, validate: async () => { validated = true; },
    };
    options[phase] = async () => { if (phase === 'cleanup') cleaned = true; return mode === 'never' ? never() : delay(100); };
    await assert.rejects(boundedLifecycle(options), /absolute deadline exceeded/);
    assert.equal(validated, false); assert.equal(cleaned, true);
    assert.ok(performance.now() - start < 80, `${phase}/${mode}: losing operation was awaited beyond the bounded return`);
  }
});
test('suite absolute deadline also bounds pre-case setup and final artifact phases', async () => {
  for (const phase of ['source setup', 'final inventory', 'unresolved context disposal']) {
    const start = performance.now();
    await assert.rejects(until(start + 15, never, phase), /absolute deadline exceeded/);
    assert.ok(performance.now() - start < 80);
  }
  const controller = new AbortController(); controller.abort(new Error('parent absolute deadline'));
  let cleanup = 0;
  await assert.rejects(boundedLifecycle({ deadline: performance.now() + 25, cleanupReserveMs: 5, label: 'parent abort', signal: controller.signal,
    setup: async () => assert.fail('Aborted setup must not run'), work: never, drain: async () => {}, cleanup: async () => { cleanup += 1; }, validate: async () => assert.fail('Aborted lifecycle must not pass'),
  }), /parent absolute deadline/);
  assert.equal(cleanup, 1);
  assert.ok(source.indexOf('const deadline = performance.now() + LIMITS.suiteMs') < source.indexOf('root = await realpath(root)'));
  assert.match(source, /until\(deadline, \(\) => executeFeltReview/);
  assert.doesNotMatch(source, /await activeContext\?\.close|await task\?\.catch/);
});
test('late setup context disposal is initiated and observed without an unbounded losing-task await', async () => {
  let creation, closed = false;
  const start = performance.now();
  await assert.rejects(boundedLifecycle({ deadline: start + 25, cleanupReserveMs: 5, label: 'late context',
    setup: () => creation = delay(100).then(() => ({ close: async () => { closed = true; } })), work: async () => {}, drain: async () => {},
    cleanup: async () => { await (await creation).close(); }, validate: async () => assert.fail('Late context cannot pass'),
  }), /absolute deadline exceeded/);
  assert.ok(performance.now() - start < 80); assert.equal(closed, false);
  await creation; await delay(0); assert.equal(closed, true);
});
test('complete artifact inventory includes its own bytes at and above the 48 MiB boundary without payload allocation', () => {
  const cap = LIMITS.artifactBytes, metadata = { status: 'passed', executionSha: '1'.repeat(40), headSha: '2'.repeat(40) };
  let content = cap - 1000, bytes;
  for (let i = 0; i < 10; i += 1) {
    bytes = artifactInventory([{ file: 'fixture.png', bytes: content, sha256: 'a'.repeat(64) }], metadata, cap + 10000);
    if (content + bytes.length === cap) break;
    content = cap - bytes.length;
  }
  bytes = artifactInventory([{ file: 'fixture.png', bytes: content, sha256: 'a'.repeat(64) }], metadata);
  const inventory = JSON.parse(bytes);
  assert.equal(inventory.inventory.bytes, bytes.length); assert.equal(inventory.totalBytes, cap);
  assert.throws(() => artifactInventory([{ file: 'fixture.png', bytes: content + 1, sha256: 'a'.repeat(64) }], metadata), /includes artifacts.json/);
  assert.throws(() => artifactInventory([{ file: 'fixture.png', bytes: cap, sha256: 'a'.repeat(64) }], metadata), /includes artifacts.json/);
});
test('cumulative admission rejects the next PNG or inventory before any over-budget write', () => {
  const ledger = artifactLedger(); let writes = 0;
  const write = (file, bytes) => { ledger.admit(file, bytes); writes += 1; };
  for (let i = 0; i < 9; i += 1) write(`${i}.png`, LIMITS.screenshotBytes);
  assert.throws(() => write('overflow.png', LIMITS.screenshotBytes), /before write/); assert.equal(writes, 9);
  write('remaining.bin', LIMITS.artifactBytes - ledger.bytes);
  assert.throws(() => write('artifacts.json', 1), /before write/); assert.equal(ledger.bytes, LIMITS.artifactBytes);
  assert.throws(() => write('0.png', 0), /Duplicate/);
});
test('closed final verification rejects omitted, extra, corrupted, symlink and over-budget artifacts', async () => {
  const content = Buffer.from('small inert artifact'), first = { file: 'report.json', bytes: content.length, sha256: hash(content) };
  const inventory = artifactInventory([first], { status: 'passed' });
  const pins = [first, { file: 'artifacts.json', bytes: inventory.length, sha256: hash(inventory) }];
  const data = new Map([['report.json', content], ['artifacts.json', inventory]]);
  const io = { names: async () => [...data.keys()], read: async file => data.get(file), info: async file => ({ size: data.get(file).length, isFile: () => true, isSymbolicLink: () => false }) };
  await verifyClosedArtifacts(pins, io);
  await assert.rejects(verifyClosedArtifacts(pins, { ...io, names: async () => ['report.json'] }));
  await assert.rejects(verifyClosedArtifacts(pins, { ...io, names: async () => [...data.keys(), 'extra.png'] }));
  await assert.rejects(verifyClosedArtifacts(pins, { ...io, read: async () => Buffer.from('corrupt') }));
  await assert.rejects(verifyClosedArtifacts(pins, { ...io, info: async file => ({ size: data.get(file).length, isFile: () => true, isSymbolicLink: () => true }) }));
  await assert.rejects(verifyClosedArtifacts(pins, io, content.length + inventory.length - 1));
});
test('root slash alias requires exact HTML bytes and MIME and cannot pass with only an index or CSS receipt', () => {
  const bytes = Buffer.from('<!doctype html><title>inert exact source</title>'), pin = { path: 'index.html', bytes: bytes.length, sha256: hash(bytes) };
  const path = '/india-corporate-intelligence/', item = { url: `http://127.0.0.1:1${path}`, status: 200, contentType: 'text/html; charset=utf-8' };
  verifyBoundResponse(pin, item, bytes);
  assert.throws(() => verifyBoundResponse(pin, item, Buffer.from('corrupt')));
  assert.throws(() => verifyBoundResponse(pin, { ...item, contentType: 'text/plain' }, bytes));
  requireVerifiedPath({ verifiedPaths: new Set([path]) }, path);
  for (const verifiedPaths of [new Set(), new Set([`${path}index.html`, `${path}assets/styles.css`])]) assert.throws(() => requireVerifiedPath({ verifiedPaths }, path));
  assert.match(source, /if \(path === 'index.html'\) expected.set\(base, pin\)/);
  assert.match(source, /if \(options.root\) requireVerifiedPath\(result, base\)/);
});
test('selection cannot silently initialize or overwrite the explicit geographic preference', () => {
  requirePreference(null, null, 'fresh marker'); requirePreference('map', 'map', 'remembered register');
  for (const [actual, expected] of [['map', null], ['globe', null], ['map', 'globe'], ['globe', 'map']]) assert.throws(() => requirePreference(actual, expected, 'selection'));
  const marker = source.indexOf("requirePreference(await stored(page), null, 'fresh map marker selection')");
  const register = source.indexOf("requirePreference(await stored(page), null, 'fresh register selection')");
  const explicit = source.indexOf("await page.locator('[data-view=\"map\"]').focus()");
  assert.ok(marker > 0 && marker < register && register < explicit);
  for (const phase of ['remembered map register selection', 'remembered map marker selection', 'advanced status filter', 'advanced form reset']) assert.ok(source.includes(phase));
});
test('advanced disclosure/filter behavioral controls reject ARIA-only, no-op, wrong records and wrong order', () => {
  requireAdvancedState({ expanded: 'true', panelVisible: true, fieldVisible: true }, true);
  requireAdvancedState({ expanded: 'false', panelVisible: false, fieldVisible: false }, false);
  for (const state of [{ expanded: 'true', panelVisible: false, fieldVisible: false }, { expanded: 'true', panelVisible: true, fieldVisible: false }, { expanded: 'false', panelVisible: true, fieldVisible: true }]) assert.throws(() => requireAdvancedState(state, true));
  for (const fixture of Object.values(FILTERS)) {
    const before = [...fixture.ids, 'other'];
    requireFilteredRecords(fixture.ids, fixture.ids, before);
    assert.throws(() => requireFilteredRecords(before, fixture.ids, before));
    assert.throws(() => requireFilteredRecords(['wrong-record'], fixture.ids, before));
    assert.throws(() => requireFilteredRecords(fixture.ids, fixture.ids, fixture.ids));
  }
  assert.throws(() => requireFilteredRecords(['b', 'a'], ['a', 'b'], ['a', 'b', 'c']));
  for (const evidence of ["selectOption(filter.status)", "assert.deepEqual(await ids('#rows button'), filter.ids)", "requireResetRecords(await ids('#records .record'), beforeFilter, filter)", "'#filters button[type=\"reset\"]'", 'filter.resetSha256']) assert.ok(source.includes(evidence), evidence);
});
test('late offline script/style/fetch/xhr requests fail the final post-cleanup check', async () => {
  for (const type of ['script', 'stylesheet', 'fetch', 'xhr']) {
    const requests = [{ type: 'document' }]; requireOfflineRequests(requests);
    await assert.rejects(boundedLifecycle({ deadline: performance.now() + 100, cleanupReserveMs: 10, label: 'late offline', setup: async () => {}, work: async () => {}, drain: async () => {},
      cleanup: async () => { requests.push({ type, url: 'http://127.0.0.1/late' }); }, validate: () => requireOfflineRequests(requests),
    }), /including after interaction\/reload\/cleanup/);
  }
  assert.match(source, /if \(options.offline\) requireOfflineRequests\(result.requests\)/);
  assert.match(source, /\}, \{ offline: true \}\)/);
});
test('exact source-panel routine opens the actual ancestor disclosure through native UI before colors and activation', async () => {
  const start = source.indexOf('  const sourcePanel = async (page, result) => {');
  const end = source.indexOf('\n  const run = async ', start);
  assert.ok(start >= 0 && end > start);
  const execute = new (Object.getPrototypeOf(async function() {}).constructor)('assert', 'colors', 'focusVisible', 'page', 'result', `${source.slice(start, end)}; return sourcePanel(page, result);`);
  for (const broken of [false, true]) {
    const state = { open: false, focused: '', keys: [] }, result = { sourceFixtureHits: 0 };
    const summary = { count: async () => 1, focus: async () => { state.focused = 'summary'; }, evaluate: async fn => fn({ parentElement: state }) };
    const anchor = { first() { return this; }, locator: () => ({ count: async () => 1, locator: () => summary }),
      waitFor: async options => { if (options?.state !== 'attached') assert.equal(state.open, true, 'Source must become actually visible'); },
      getAttribute: async key => ({ href: 'https://source.example/exact', target: '_blank', rel: 'noopener noreferrer' })[key], focus: async () => { state.focused = 'source'; },
    };
    const popup = { waitForLoadState: async () => {}, locator: () => ({ innerText: async () => 'CI source-link fixture' }), evaluate: async () => true, close: async () => {} };
    const page = { locator: selector => { assert.equal(selector, '#detail a.source[href]'); return anchor; }, context: () => ({ waitForEvent: async () => popup }), keyboard: { press: async key => {
      state.keys.push(key);
      if (state.focused === 'summary' && ['Enter', 'Space'].includes(key) && !broken) state.open = !state.open;
      if (state.focused === 'source' && key === 'Enter') result.sourceFixtureHits += 1;
    } } };
    const operation = () => execute(assert, async () => assert.equal(state.open, true), async () => {}, page, result);
    if (broken) await assert.rejects(operation());
    else { await operation(); assert.deepEqual(state.keys.slice(0, 3), ['Enter', 'Space', 'Enter']); assert.equal(state.open, true); assert.equal(result.sourceFixtureHits, 1); }
  }
});
test('root source contract covers the genuine AtlasNetwork ancestry and preserved transparent override', () => {
  for (const path of ['AtlasNetwork.tsx', 'atlas-network.css', 'workspace.css', 'atlas-workspace.css']) assert.ok(REQUIRED_SOURCE_PATHS.includes(`src/components/investigation/${path}`));
  assert.match(source, /node.closest\('\.iw-graph-panel'\) === null/);
  assert.match(source, /preservedConnectionsGraph, 'rgba\(0, 0, 0, 0\)'/);
  assert.match(source, /Partial root-surface coverage/);
  assert.doesNotMatch(source, /background\(page, '\.iw-graph', 'rgb\(15, 48, 35\)'/);
});

test('reset cannot pass with the filtered subset, a missing identity or reordered identities', () => {
  const before = ['one', 'two', 'three'], fixture = { count: 3, resetSha256: hash(JSON.stringify(before)) };
  requireResetRecords(before, before, fixture);
  for (const actual of [['one'], ['one', 'two'], ['two', 'one', 'three']]) assert.throws(() => requireResetRecords(actual, before, fixture));
  assert.throws(() => requireResetRecords(before, before, { ...fixture, resetSha256: '0'.repeat(64) }));
});
test('a never-settling post-close response drain is inside the same absolute case deadline', async () => {
  let drains = 0, closed = false, validated = false;
  const start = performance.now();
  await assert.rejects(boundedLifecycle({ deadline: start + 25, cleanupReserveMs: 5, label: 'post-close pending response', setup: async () => {}, work: async () => {},
    drain: async () => { drains += 1; if (drains === 2) await never(); }, cleanup: async () => { closed = true; }, validate: async () => { validated = true; },
  }), /absolute deadline exceeded/);
  assert.equal(closed, true); assert.equal(drains, 2); assert.equal(validated, false); assert.ok(performance.now() - start < 80);
});
test('expired setup does not create resources and late rejected work is observed', async () => {
  let setup = 0, cleanup = 0;
  await assert.rejects(boundedLifecycle({ deadline: performance.now() - 1, cleanupReserveMs: 5, label: 'already expired', setup: async () => { setup += 1; }, work: async () => {}, drain: async () => {}, cleanup: async () => { cleanup += 1; }, validate: async () => {}, }), /absolute deadline exceeded/);
  assert.equal(setup, 0); assert.equal(cleanup, 1);
  const late = delay(60).then(() => { throw new Error('late inert work rejection'); });
  await assert.rejects(boundedLifecycle({ deadline: performance.now() + 25, cleanupReserveMs: 5, label: 'late rejection', setup: async () => {}, work: () => late, drain: async () => {}, cleanup: async () => {}, validate: async () => {}, }), /absolute deadline exceeded/);
  await assert.rejects(late, /late inert work rejection/);
});


test('every appended root surface observation and caption is mandatory and closed', () => {
  for (const spec of ROOT_PLAN) {
    const good = passingResults().find(result => result.name === spec.name); validateRootObservations(good);
    for (const key of spec.observations) {
      const bad = clone(good); delete bad.rootObservations[key]; assert.throws(() => validateRootObservations(bad), key);
      const empty = clone(good); empty.rootObservations[key] = {}; assert.throws(() => validateRootObservations(empty), key);
    }
    const extra = clone(good); extra.rootObservations.invented = {}; assert.throws(() => validateRootObservations(extra));
    const results = passingResults(); results.find(result => result.name === spec.name).screenshots[0].caption = ''; assert.throws(() => validatePlan(results));
  }
  assert.throws(() => validateRootObservations({ name: 'root-unplanned', rootObservations: {} }));
});
test('computed material checks reject old blue, transparency and invented gradients', () => {
  const actual = { background: 'rgb(15, 48, 35)', backgroundImage: 'none' }; requireRootMaterial(actual, actual.background);
  for (const background of ['rgb(16, 42, 52)', 'rgba(0, 0, 0, 0)']) assert.throws(() => requireRootMaterial({ ...actual, background }, actual.background));
  assert.throws(() => requireRootMaterial({ ...actual, backgroundImage: 'linear-gradient(red,blue)' }, actual.background));
});
test('sampled overflow and native reduced-motion controls fail closed', () => {
  const frame = { width: 390, document: 390, main: 390, mainClient: 390 }; requireRootOverflow(frame);
  assert.throws(() => requireRootOverflow({ ...frame, document: 392 })); assert.throws(() => requireRootOverflow({ ...frame, main: 392 }));
  const motion = { matches: true, samples: [{ animationName: 'none', transitionDuration: '0s, 0s', scrollBehavior: 'auto' }] }; requireReducedMotion(motion);
  assert.throws(() => requireReducedMotion({ ...motion, matches: false })); assert.throws(() => requireReducedMotion({ ...motion, samples: [] }));
  for (const patch of [{ animationName: 'atlas-library-open' }, { transitionDuration: '0.16s' }, { scrollBehavior: 'smooth' }]) assert.throws(() => requireReducedMotion({ ...motion, samples: [{ ...motion.samples[0], ...patch }] }));
});
test('new root selectors follow actual home sector ancestry, visible mobile navigation and separate real record count', () => {
  for (const path of ['AtlasControls.tsx', 'AtlasCaseFeed.tsx', 'LinkedEvidenceMap.tsx', 'InvestigationMap.tsx', 'AtlasEvidencePopover.tsx']) assert.ok(REQUIRED_SOURCE_PATHS.includes(`src/components/investigation/${path}`));
  for (const evidence of ['iw-surface-map.atlas-home', '.atlas-home > .atlas-sector-strip', '.atlas-mobile-sectors', "name: 'Energy', exact: true", "sector.locator(':scope > span').count(), 0", 'actualRecordCountText', 'No sector count is rendered by AtlasSectorStrip', 'Pre-existing 390px search link', 'focusReturnedToOpener', 'Energy power map']) assert.ok(source.includes(evidence), evidence);
  assert.doesNotMatch(source, /sector-count|sectorCount|AtlasSectorStrip\.tsx/);
});
test('reading coverage opens real Health details and retained linked-network paper reader with native input', () => {
  assert.ok(REQUIRED_SOURCE_PATHS.includes('src/pages/InvestigationDossier.tsx'));
  for (const evidence of ["'#/health'", 'Response, interpretation and sources', "[['Enter', true], ['Space', false], ['Enter', true]]", 'data-domain-record', '.iw-graph-node[data-entity-id]', 'data-selection-id', '.atlas-reader-toolbar button[aria-expanded]', "'is-expanded'", 'Reader closes to retained graph opener', 'externalSourcesRetained']) assert.ok(source.includes(evidence), evidence);
  assert.doesNotMatch(source, /dispatchEvent\(|\.click\(\{\s*force|\.addStyleTag\(|\.setContent\(|\.evaluate\([^\n]*(?:innerHTML\s*=|\.open\s*=|setAttribute\()/);
});
test('four real independent wrappers remain explicit and the research desk interior is not relabeled green', () => {
  for (const id of ['investigations', 'leads', 'game-theory', 'research-program']) for (const width of Object.keys(VIEWPORTS)) assert.ok(ROOT_PLAN.find(item => item.name === `root-independent-${width}`).shots.includes(id));
  for (const path of ['src/App.tsx', 'src/pages/Investigations.tsx', 'src/pages/Leads.tsx', 'src/pages/GameTheory.tsx', 'src/pages/ResearchProgram.tsx', 'src/research-program.css']) assert.ok(REQUIRED_SOURCE_PATHS.includes(path));
  for (const evidence of ['.iw-shell-content > .min-h-full', 'Academic investigation research program', "'rgb(16, 32, 32)'", 'Only the independent wrapper changed', 'Partial root source/material coverage', 'this retained filename does not depict the full masthead']) assert.ok(source.includes(evidence), evidence);
});

test('null root navigation response is accepted only for a previously bound same-document hash transition', () => {
  const origin = 'http://127.0.0.1:1777', base = '/india-corporate-intelligence/';
  const args = [`${origin}${base}#/investigations`, `${origin}${base}#/leads`, origin, base, '#/leads', true];
  requireSameDocumentRootNavigation(...args);
  for (const [index, value] of [[0, 'about:blank'], [1, 'https://other.example/#/leads'], [1, `${origin}/wrong/#/leads`], [1, `${origin}${base}?changed=1#/leads`], [1, args[0]], [4, '#/game-theory'], [5, false]]) {
    const bad = [...args]; bad[index] = value; assert.throws(() => requireSameDocumentRootNavigation(...bad));
  }
  assert.match(source, /else requireSameDocumentRootNavigation/);
  assert.match(source, /await goRootRoute\(page, result, route.id\)/);
});

test('effect-owned dialog and reader focus and shared wrapper selectors use bounded native predicates', () => {
  for (const evidence of ["!document.querySelector('#site-nav-mobile').open && document.activeElement", "document.activeElement === document.querySelector(`${selector} .atlas-reader-heading h2`)", "await reader.waitFor({ state: 'detached' })", 'document.querySelector(`${selector} h1`)?.innerText.replace', "heading: 'Follow a claim. Test every connection.'"]) assert.ok(source.includes(evidence), evidence);
  assert.doesNotMatch(source, /waitForTimeout|setTimeout\(resolve, [1-9]/);
});


test('reviewed settlement reversal rejects missing, duplicate or altered markers, calls and helper bytes', () => {
  const begin = '// BEGIN REVIEWED ATLAS HEADER SETTLEMENT';
  const end = '// END REVIEWED ATLAS HEADER SETTLEMENT';
  const marker = '  // REVIEWED ATLAS HEADER SETTLEMENT CALL';
  const call = '  if (phase === \'wrapped-navigation-text\') await settleAtlasHeaderClearance(page, result, mode, phase);';
  for (const token of [begin, end, marker, call]) {
    for (const replacement of ['', token + '\n' + token, token + ' altered']) assert.throws(() => stripReviewedAtlasSettlement(runner.replace(token, replacement)), /reviewed|Reviewed|Only the exact|Exactly one/);
  }
  assert.throws(() => stripReviewedAtlasSettlement(runner.replace('maxSamples: 64', 'maxSamples: 65')), /Only the exact reviewed/);
  assert.throws(() => stripReviewedAtlasSettlement(runner.replace('started + 1000', 'started + 1001')), /Only the exact reviewed/);
});

test('reviewed reversal rejects call relocation around the exact font/frame/final-sample context and any broadened phase gate', () => {
  const call = "  // REVIEWED ATLAS HEADER SETTLEMENT CALL\n  if (phase === 'wrapped-navigation-text') await settleAtlasHeaderClearance(page, result, mode, phase);\n";
  const stripped = runner.replace(call, '');
  const anchors = [
    "async function atlasActivityNavigation(page, result, mode, phase = 'initial') {\n",
    '    await document.fonts.ready;\n',
    '    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));\n',
    '  // Keep the actual failing boxes in report.json, including an overlap failure.\n',
  ];
  for (const anchor of anchors) {
    assert.equal(stripped.split(anchor).length - 1, 1, anchor);
    const moved = stripped.replace(anchor, anchor + call);
    assert.equal(moved.split(call).length - 1, 1);
    assert.throws(() => stripReviewedAtlasSettlement(moved), /must follow the exact fonts\/two-frame wait/, anchor);
  }
  assert.throws(() => stripReviewedAtlasSettlement(runner.replace("if (phase === 'wrapped-navigation-text') await settle", 'await settle')), /Exactly one/);
  assert.throws(() => stripReviewedAtlasSettlement(runner.replace("phase === 'wrapped-navigation-text'", "phase.startsWith('wrapped-navigation-text')")), /Exactly one/);
  assert.throws(() => stripReviewedAtlasSettlement(runner.replace("phase === 'wrapped-navigation-text'", "phase === 'initial'")), /Exactly one/);
});
