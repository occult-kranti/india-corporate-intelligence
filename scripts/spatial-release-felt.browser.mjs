/** Additive native-browser evidence for the exact reviewed felt composition.
 * Imported only by the guarded combined runner. No browser import/launch here.
 * These viewport/keyboard observations are not full accessibility qualification.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, readdir, realpath, lstat, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

export const STORAGE_KEY = 'fieldwork:geographic-view:v1';
export const VIEWPORTS = Object.freeze({ desktop: { width: 1440, height: 1000 }, narrow: { width: 390, height: 844 } });
export const PAGES = Object.freeze([
  { id: 'global', file: 'index.html', script: 'app.js', data: 'dataset.json', offline: 'fieldwork-offline.html' },
  { id: 'finance', file: 'finance.html', script: 'finance-app.js', data: 'finance.json', offline: 'finance-offline.html' },
  { id: 'media', file: 'media.html', script: 'media-app.js', data: 'media.json', offline: 'media-offline.html' },
]);
export const FILTERS = Object.freeze({
  global: { status: 'documentary_fact', ids: ['E-C01'], count: 387, resetSha256: '16f05a1f6e35ee5d8e58a1f129bbff795cd2c2393ac3fd8c96f26016883f02b4' },
  finance: { status: 'announced', ids: ['GF-US-GAVI-2025', 'GF-E17', 'GF-E18'], count: 54, resetSha256: '7a1469c532ae30962b76c0adc7294f1dfa02a6a683df699da54bce2f8a9b923f' },
  media: { status: 'proposed', ids: ['M-E42'], count: 115, resetSha256: '9c88251ea952f5c6b796621f04980063e0b3bd6201a45b99e941c4c6bbae0a0b' },
});
// Appended material coverage. The first 21 scenarios and 36 capture identities remain intact.
export const ROOT_PLAN = Object.freeze([
  ...Object.keys(VIEWPORTS).map(width => ({ name: `root-chrome-${width}`,
    shots: ['shell-navigation-search', 'navigation-dialog-focus', ...(width === 'desktop' ? ['linked-map-and-paper-dock'] : ['linked-map', 'paper-dock'])],
    observations: ['shell', 'navigation', 'mastheadSearch', 'workspaceSearch', 'sectorNavigation', 'navDialog', 'linkedMap', 'paperDock', 'reducedMotion', 'overflow'] })),
  ...Object.keys(VIEWPORTS).map(width => ({ name: `root-reading-${width}`, shots: ['expanded-dossier', 'expanded-paper-reader'],
    observations: ['dossier', 'paperReader', 'reducedMotion', 'overflow'] })),
  ...Object.keys(VIEWPORTS).map(width => ({ name: `root-independent-${width}`, shots: ['investigations', 'leads', 'game-theory', 'research-program'],
    observations: ['investigations', 'leads', 'game-theory', 'research-program', 'reducedMotion', 'overflow'] })),
]);
const mainShots = ['shell', 'flat-map', 'source-panel', 'globe-reload'];
export const PLAN = Object.freeze([
  ...PAGES.flatMap(page => Object.keys(VIEWPORTS).map(width => ({ name: `${page.id}-${width}`, shots: mainShots }))),
  ...PAGES.flatMap(page => ['invalid', 'denied'].map(mode => ({ name: `${page.id}-storage-${mode}`, shots: [] }))),
  { name: 'same-origin-preference', shots: [] },
  ...PAGES.map(page => ({ name: `${page.id}-offline`, shots: ['flat-map'] })),
  ...PAGES.map(page => ({ name: `${page.id}-load-error`, shots: ['expected-error'] })),
  ...Object.keys(VIEWPORTS).map(width => ({ name: `root-${width}`, shots: ['shell', 'graph-surfaces', 'graph-hover-focus'] })),
  ...ROOT_PLAN,
]);
export const LIMITS = Object.freeze({ scenarioMs: 90000, suiteMs: 540000, screenshotBytes: 5 * 1024 * 1024, artifactBytes: 48 * 1024 * 1024 });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const gitBlob = bytes => createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
const fail = message => { throw new Error(message); };

export const REQUIRED_SOURCE_PATHS = Object.freeze([
  "docs/research/2026-10-17-satellite-university-bitcoin-update.md",
  "global-evidence-workbench/ui/finance.html",
  "global-evidence-workbench/ui/index.html",
  "global-evidence-workbench/ui/media.html",
  "global-evidence-workbench/ui/src/app.js",
  "global-evidence-workbench/ui/src/finance-app.js",
  "global-evidence-workbench/ui/src/media-app.js",
  "global-evidence-workbench/ui/src/style.css",
  "src/index.css",
  "package-lock.json",
  "scripts/build-global-workbench.mjs",
  "global-evidence-workbench/ui/scripts/build.mjs",
  "global-evidence-workbench/ui/scripts/standalone.mjs",
  "global-evidence-workbench/ui/scripts/standalone-finance.mjs",
  "global-evidence-workbench/ui/scripts/standalone-media.mjs",
  "src/components/Layout.tsx",
  "src/components/investigation/Workspace.tsx",
  "src/components/investigation/InvestigationGraph.tsx",
  "src/components/investigation/graph.css",
  "src/components/investigation/shell.css",
  "src/components/investigation/AtlasNetwork.tsx",
  "src/components/investigation/atlas-network.css",
  "src/components/investigation/workspace.css",
  "src/components/investigation/atlas-workspace.css",
  "src/App.tsx",
  "src/components/investigation/AtlasControls.tsx",
  "src/components/investigation/LinkedEvidenceMap.tsx",
  "src/components/investigation/InvestigationMap.tsx",
  "src/components/investigation/AtlasCaseFeed.tsx",
  "src/components/investigation/AtlasEvidencePopover.tsx",
  "src/components/investigation/map.css",
  "src/components/investigation/linked-evidence-map.css",
  "src/pages/InvestigationDossier.tsx",
  "src/pages/investigation-dossier.css",
  "src/pages/Investigations.tsx",
  "src/pages/Leads.tsx",
  "src/pages/GameTheory.tsx",
  "src/pages/ResearchProgram.tsx",
  "src/investigations.css",
  "src/game-theory.css",
  "src/research-program.css"
]);
export const REQUIRED_GLOBAL_OUTPUTS = Object.freeze([
  "global-workbench/fieldwork-offline.html",
  "global-workbench/finance-offline.html",
  "global-workbench/finance.html",
  "global-workbench/index.html",
  "global-workbench/media-offline.html",
  "global-workbench/media.html",
  "global-workbench/public/data/dataset.json",
  "global-workbench/public/data/finance.json",
  "global-workbench/public/data/media.json",
  "global-workbench/src/app.js",
  "global-workbench/src/finance-app.js",
  "global-workbench/src/finance-model.js",
  "global-workbench/src/finance.css",
  "global-workbench/src/media-app.js",
  "global-workbench/src/media-model.js",
  "global-workbench/src/media-nav.css",
  "global-workbench/src/media.css",
  "global-workbench/src/model.js",
  "global-workbench/src/style.css"
]);
export function validateSourceContract(contract) {
  assert.equal(contract.schema, "olympus-felt-native-source-contract-v2-root-shell");
  assert.equal(contract.baseCommit, "8b640853fa374d5f036a0c616312bf6bc97e03e6");
  assert.equal(contract.baseTree, "33504ec391ab3448be326ce27480c2a287dfb896");
  assert.equal(contract.productCompositionTree, "6189f2954d7172b6f2059eb2fde4a6437179db5d");
  assert.equal(contract.priorCompositionTree, "ba7af2ba409972cd18c9771cdab8623737b86c05");
  assert.equal(contract.priorCompositionManifestSha256, "6871565d4ea4cb6cf99fb438e17e43229ce90bd79627bd85fcae9a72d429b1b1");
  assert.equal(contract.rootShellSealSha256, "17f14e3feabe48b658da654bf7829eeb5cfed57cd45cc02076df82c51b9daeea");
  assert.equal(contract.rootShellReviewSha256, "d67e910708d0c7223aefe65042b8d53f6d62024373649f5e6be7530474aba927");
  assert.deepEqual(contract.files.map(pin => pin.path).sort(), [...REQUIRED_SOURCE_PATHS].sort(), 'Missing, duplicate or extra source binding');
  assert.deepEqual(contract.globalBuildFiles.map(pin => pin.path).sort(), [...REQUIRED_GLOBAL_OUTPUTS].sort(), 'Missing, duplicate or extra global build binding');
  for (const pin of contract.globalBuildFiles) { safeRelative(pin.path); assert.match(pin.sha256, /^[a-f0-9]{64}$/); }
  for (const pin of contract.files) {
    safeRelative(pin.path); assert.match(pin.sha256, /^[a-f0-9]{64}$/); assert.match(pin.gitBlob, /^[a-f0-9]{40}$/); assert.ok(Number.isSafeInteger(pin.bytes) && pin.bytes > 0);
  }
}

export function requireCI(env = process.env) {
  assert.equal(env.GITHUB_ACTIONS, 'true', 'Felt browser evidence is restricted to GitHub Actions. No local browser was launched.');
  assert.equal(env.SPATIAL_RELEASE_REVIEW, 'github-actions', 'Felt browser evidence is restricted to the combined release gate.');
  for (const key of ['GITHUB_SHA', 'SPATIAL_HEAD_SHA']) assert.match(env[key] ?? '', /^[a-f0-9]{40}$/, `Missing exact ${key}`);
}
export function rgb(value) {
  if (/^#[a-f0-9]{6}$/i.test(value)) return [1, 3, 5].map(offset => parseInt(value.slice(offset, offset + 2), 16));
  const match = value.match(/^rgba?\(\s*([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/);
  assert.ok(match && (match[4] === undefined || Number(match[4]) === 1), `Opaque RGB color required: ${value}`);
  const channels = match.slice(1, 4).map(Number);
  assert.ok(channels.every(value => value >= 0 && value <= 255), 'Invalid RGB channel');
  return channels;
}
export function contrast(foreground, background) {
  const luminance = value => rgb(value).map(channel => channel / 255).map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4).reduce((total, channel, index) => total + channel * [0.2126, 0.7152, 0.0722][index], 0);
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
export function safeRelative(value) {
  assert.ok(typeof value === 'string' && value.length && !isAbsolute(value) && !value.includes('\\') && !value.split('/').some(part => !part || part === '.' || part === '..'), 'Closed relative artifact path required');
  return value;
}
export function validateResponseResults(result, failurePath) {
  assert.deepEqual(result.bindingErrors, [], 'Browser response bytes must equal reviewed built bytes');
  assert.deepEqual(result.pageErrors, [], 'Unexpected page exceptions');
  assert.deepEqual(result.failedRequests, [], 'Unexpected request failures');
  assert.deepEqual(result.unexpectedExternal, [], 'No external network dependencies');
  // Match the existing combined runner's non-application favicon exception,
  // narrowed here to a conventional 404. Keep every observation in the report.
  const failures = result.responses.filter(item => item.status >= 400 && !(item.status === 404 && ['/favicon.ico', '/india-corporate-intelligence/favicon.ico'].includes(new URL(item.url).pathname)));
  if (failurePath) {
    assert.equal(result.expectedFailureHits, 1);
    assert.equal(failures.length, 1, 'Only the intentionally injected 503 is allowed');
    assert.equal(new URL(failures[0].url).pathname, failurePath); assert.equal(failures[0].status, 503);
  } else assert.deepEqual(failures, [], 'Unexpected HTTP failures');
}
export function validatePlan(results) {
  assert.deepEqual(results.map(result => result.name), PLAN.map(result => result.name), 'Every additive scenario must run, in order');
  for (const [index, result] of results.entries()) {
    assert.equal(result.status, 'passed', result.name);
    assert.deepEqual(result.screenshots.map(item => item.name), PLAN[index].shots, `Closed screenshot inventory: ${result.name}`);
    if (PLAN[index].observations) {
      validateRootObservations(result);
      assert.ok(result.screenshots.every(item => typeof item.caption === 'string' && item.caption.length > 20), 'New root captures require surface/state captions');
    }
  }
}

export function validateRootObservations(result) {
  const spec = ROOT_PLAN.find(item => item.name === result.name);
  assert.ok(spec, 'Exact appended root case identity required');
  assert.deepEqual(Object.keys(result.rootObservations ?? {}).sort(), [...spec.observations].sort(), 'Closed root surface coverage');
  for (const [key, value] of Object.entries(result.rootObservations)) assert.ok(value && typeof value === 'object' && Object.keys(value).length, `Missing root observation: ${key}`);
}
export function requireRootMaterial(actual, expected) {
  assert.equal(actual.background, expected, 'Actual emitted root material winner');
  assert.equal(actual.backgroundImage, 'none', 'Sampled root surface must be opaque, untextured CSS');
}
export function requireSameDocumentRootNavigation(before, after, origin, base, expectedHash, verified) {
  const previous = new URL(before), current = new URL(after);
  assert.equal(previous.origin, origin); assert.equal(current.origin, origin);
  assert.equal(previous.pathname, base); assert.equal(current.pathname, base);
  assert.equal(previous.search, current.search); assert.equal(current.search, '');
  assert.notEqual(previous.hash, current.hash); assert.equal(current.hash, expectedHash);
  assert.equal(verified, true, 'Same-document root navigation requires prior exact HTML response binding');
}
export function requireRootOverflow(frame) {
  assert.ok(frame.document <= frame.width + 1, 'No document-level horizontal overflow');
  assert.ok(frame.main <= frame.mainClient + 1, 'No main-shell horizontal overflow');
}
export function requireReducedMotion(value) {
  assert.equal(value.matches, true, 'Native reduced-motion media query');
  assert.ok(value.samples.length > 0);
  for (const item of value.samples) {
    assert.equal(item.animationName, 'none');
    assert.ok(item.transitionDuration.split(',').every(value => parseFloat(value) === 0));
    assert.equal(item.scrollBehavior, 'auto');
  }
}

// Deadlines are absolute monotonic times. A timeout observes, but never awaits,
// the losing promise indefinitely; the original runner still owns browser exit.
export function until(deadline, operation, label, signal) {
  let timer, abort;
  const task = Promise.resolve().then(() => {
    assert.ok(performance.now() < deadline, `${label}: absolute deadline exceeded`);
    signal?.throwIfAborted();
    return operation();
  });
  const stop = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label}: absolute deadline exceeded`)), Math.max(0, deadline - performance.now()));
    abort = () => reject(signal.reason ?? new Error(`${label}: aborted`));
    if (signal?.aborted) abort(); else signal?.addEventListener('abort', abort, { once: true });
  });
  return Promise.race([task, stop]).then(value => {
    // A blocked event loop must not convert an expired operation into a pass.
    assert.ok(performance.now() < deadline, `${label}: absolute deadline exceeded`);
    signal?.throwIfAborted(); return value;
  }).finally(() => { clearTimeout(timer); signal?.removeEventListener('abort', abort); });
}
export async function boundedLifecycle({ deadline, cleanupReserveMs, label, setup, work, drain, cleanup, validate, signal }) {
  const controller = new AbortController();
  const abort = () => controller.abort(signal.reason);
  if (signal?.aborted) abort(); else signal?.addEventListener('abort', abort, { once: true });
  let setupTask, workTask, drainTask, error;
  const activeDeadline = deadline - cleanupReserveMs;
  try {
    setupTask = Promise.resolve().then(() => { controller.signal.throwIfAborted(); assert.ok(performance.now() < activeDeadline, `${label}/setup: absolute deadline exceeded`); return setup(controller.signal); });
    setupTask.catch(() => {});
    const resource = await until(activeDeadline, () => setupTask, `${label}/setup`, controller.signal);
    workTask = Promise.resolve().then(() => { controller.signal.throwIfAborted(); assert.ok(performance.now() < activeDeadline, `${label}/work: absolute deadline exceeded`); return work(resource, controller.signal); });
    workTask.catch(() => {});
    await until(activeDeadline, () => workTask, `${label}/work`, controller.signal);
    drainTask = Promise.resolve().then(() => { controller.signal.throwIfAborted(); assert.ok(performance.now() < activeDeadline, `${label}/response-drain: absolute deadline exceeded`); return drain(); });
    drainTask.catch(() => {});
    await until(activeDeadline, () => drainTask, `${label}/response-drain`, controller.signal);
  } catch (caught) { error = caught; controller.abort(caught); }
  try {
    // Cleanup is started even if setup is unresolved: its owner must arrange
    // eventual disposal of a late context. All settlement shares the same end.
    const cleanupTask = Promise.resolve().then(cleanup);
    cleanupTask.catch(() => {}); // Observe a late failure even if the absolute deadline has expired.
    await until(deadline, async () => {
      await cleanupTask;
      await Promise.allSettled([setupTask, workTask, drainTask].filter(Boolean));
      await drain();
    }, `${label}/cleanup-and-settlement`, signal);
    if (!error) await until(deadline, validate, `${label}/final-validation`, signal);
  } catch (caught) { error ??= caught; }
  finally { controller.abort(error ?? new Error(`${label}: finished`)); signal?.removeEventListener('abort', abort); }
  if (error) throw error;
}

export function verifyBoundResponse(pin, item, bytes) {
  assert.equal(item.status, 200, item.url); assert.equal(bytes.length, pin.bytes, item.url); assert.equal(hash(bytes), pin.sha256, item.url);
  // MIME follows the bound file, so the slash root alias still requires HTML.
  if (/\.(?:js|mjs)$/.test(pin.path)) assert.match(item.contentType, /javascript/);
  if (pin.path.endsWith('.css')) assert.match(item.contentType, /text\/css/);
  if (pin.path.endsWith('.json')) assert.match(item.contentType, /application\/json/);
  if (pin.path.endsWith('.html')) assert.match(item.contentType, /text\/html/);
}
export function requireVerifiedPath(result, path) { assert.ok(result.verifiedPaths.has(path), `Browser source binding missing: ${path}`); }
export function requirePreference(actual, expected, phase) { assert.equal(actual, expected, `Geographic preference changed during ${phase}`); }
export function requireOfflineRequests(requests) { assert.deepEqual(requests.filter(request => ['script', 'stylesheet', 'fetch', 'xhr'].includes(request.type)), [], 'Self-contained export must not request code, styles or datasets, including after interaction/reload/cleanup'); }
export function requireAdvancedState(state, open) {
  assert.equal(state.expanded, String(open), 'Advanced disclosure ARIA state');
  assert.equal(state.panelVisible, open, 'Actual advanced panel visibility');
  assert.equal(state.fieldVisible, open, 'Actual status field visibility');
}
export function requireFilteredRecords(actual, expected, before) {
  assert.ok(expected.length > 0 && expected.length < before.length, 'Filter fixture must be a nonempty strict subset');
  assert.deepEqual(actual, expected, 'Exact ordered source-backed advanced filter identities');
}

export function requireResetRecords(actual, before, fixture) {
  assert.deepEqual(actual, before, 'Reset must restore every ordered source-backed identity');
  assert.equal(actual.length, fixture.count);
  assert.equal(hash(JSON.stringify(actual)), fixture.resetSha256);
}

// Inventory excludes its own hash to avoid self-reference, but explicitly counts
// its own byte length. The caller returns its SHA and verifies every closed file.
export function artifactInventory(artifacts, metadata, limit = LIMITS.artifactBytes) {
  assert.equal(new Set(artifacts.map(pin => pin.file)).size, artifacts.length, 'Duplicate artifact');
  const contentBytes = artifacts.reduce((total, pin) => total + pin.bytes, 0);
  let ownBytes = 0, bytes;
  for (let pass = 0; pass < 12; pass += 1) {
    bytes = Buffer.from(`${JSON.stringify({ schema: 'olympus-felt-artifacts-v2', ...metadata, files: artifacts, inventory: { file: 'artifacts.json', bytes: ownBytes }, totalBytes: contentBytes + ownBytes }, null, 2)}\n`);
    if (bytes.length === ownBytes) {
      assert.ok(contentBytes + ownBytes <= limit, 'Complete additive artifact budget includes artifacts.json');
      return bytes;
    }
    ownBytes = bytes.length;
  }
  fail('Inventory byte accounting did not converge');
}
export function artifactLedger(limit = LIMITS.artifactBytes) {
  let bytes = 0;
  const paths = new Set();
  return {
    admit(file, size) {
      safeRelative(file); assert.ok(Number.isSafeInteger(size) && size >= 0);
      assert.ok(!paths.has(file), 'Duplicate artifact write');
      assert.ok(bytes + size <= limit, 'Cumulative additive artifact budget before write');
      paths.add(file); bytes += size;
    },
    get bytes() { return bytes; },
  };
}

export async function verifyClosedArtifacts(artifacts, io, limit = LIMITS.artifactBytes) {
  assert.deepEqual((await io.names()).sort(), artifacts.map(pin => pin.file).sort(), 'Closed final inventory includes artifacts.json');
  let total = 0, inventory;
  for (const pin of artifacts) {
    safeRelative(pin.file);
    const info = await io.info(pin.file);
    assert.ok(info.isFile() && !info.isSymbolicLink(), 'Artifact must be a regular file');
    const bytes = await io.read(pin.file);
    assert.equal(bytes.length, pin.bytes); assert.equal(info.size, pin.bytes); assert.equal(hash(bytes), pin.sha256);
    total += bytes.length;
    if (pin.file === 'artifacts.json') inventory = JSON.parse(bytes.toString());
  }
  assert.ok(inventory, 'Final inventory is mandatory');
  assert.deepEqual(inventory.files, artifacts.filter(pin => pin.file !== 'artifacts.json'));
  assert.deepEqual(inventory.inventory, { file: 'artifacts.json', bytes: artifacts.find(pin => pin.file === 'artifacts.json').bytes });
  assert.equal(total, inventory.totalBytes); assert.ok(total <= limit, 'Complete additive artifact byte cap');
}

// Runs inside the browser. Computed, opaque CSS colors only: no image, gradient,
// anti-aliasing, tiny-text, screen-reader or physical-device certification.
export function readColor(node) {
  const style = getComputedStyle(node), box = node.getBoundingClientRect();
  const layers = [];
  let background;
  for (let current = node; current; current = current.parentElement) {
    const css = getComputedStyle(current);
    layers.push({ tag: current.tagName, id: current.id, background: css.backgroundColor, image: css.backgroundImage, opacity: css.opacity });
    if (css.backgroundColor !== 'rgba(0, 0, 0, 0)' && css.backgroundColor !== 'transparent') { background = css.backgroundColor; break; }
  }
  return { text: (node.textContent ?? '').trim().slice(0, 180), foreground: style.color, background, layers,
    fontSize: parseFloat(style.fontSize), fontWeight: style.fontWeight, display: style.display, visibility: style.visibility,
    rect: { x: box.x, y: box.y, width: box.width, height: box.height }, viewport: { width: innerWidth, height: innerHeight } };
}

export async function runFeltReview(args) {
  requireCI();
  const controller = new AbortController();
  const deadline = performance.now() + LIMITS.suiteMs;
  try { return await until(deadline, () => executeFeltReview({ ...args, deadline, signal: controller.signal }), 'Felt suite including setup and final artifacts', controller.signal); }
  finally { controller.abort(new Error('Felt suite finished or reached its absolute deadline')); }
}
async function executeFeltReview({ browser, root, dist, output, origin, base, deadline, signal }) {
  const started = Date.now();
  const activeDeadline = deadline - 5000; // Reserve final report/inventory verification inside nine minutes.
  const alive = () => { signal.throwIfAborted(); assert.ok(performance.now() < deadline, 'Felt suite absolute deadline'); };
  assert.ok(browser && typeof browser.newContext === 'function', 'Use the existing pinned browser');
  assert.equal(new URL(origin).hostname, '127.0.0.1', 'Use the existing read-only loopback server');
  assert.equal(base, '/india-corporate-intelligence/');
  root = await realpath(root); dist = await realpath(dist); output = await realpath(output);
  assert.equal(output, join(root, 'spatial-release-review'), 'Preserve the combined artifact path');
  assert.equal(dist, join(root, 'dist'));
  const folder = join(output, 'felt-ui');
  // Exclusive directory creation prevents stale evidence from an earlier run.
  alive(); await mkdir(folder);
  alive();
  const report = { schema: 'olympus-felt-native-review-v2-root-shell', status: 'running', startedAt: new Date(started).toISOString(),
    commit: process.env.GITHUB_SHA, headCommit: process.env.SPATIAL_HEAD_SHA, runId: process.env.GITHUB_RUN_ID ?? null,
    runAttempt: process.env.GITHUB_RUN_ATTEMPT ?? null, basePath: base, browserVersion: browser.version(), nodeVersion: process.version,
    scope: 'Actual GitHub CI Chromium screenshots only after execution. Viewport, native keyboard and sampled opaque CSS observations; not full accessibility, screen-reader, physical-device or browser-UI zoom qualification.',
    sourceFiles: [], builtFiles: [], scenarios: [], limits: LIMITS };
  const artifacts = [];
  const ledger = artifactLedger();
  const write = async (file, content, writeSignal = signal) => {
    alive(); writeSignal.throwIfAborted(); const bytes = Buffer.from(content);
    ledger.admit(file, bytes.length); // Reserve before any write, including inventory.
    await writeFile(join(folder, safeRelative(file)), bytes, { flag: 'wx', signal: writeSignal });
    alive(); writeSignal.throwIfAborted();
    const pin = { file, bytes: bytes.length, sha256: hash(bytes) };
    artifacts.push(pin); return pin;
  };
  const expected = new Map();
  let expectedGlobalBuild;
  const git = args => { alive(); return execFileSync('git', args, { cwd: root, encoding: 'utf8', timeout: Math.max(1, Math.floor(activeDeadline - performance.now())) }).trim(); };
  let activeContext;
  const abortContext = () => { activeContext?.close().catch(() => {}); };
  signal.addEventListener('abort', abortContext, { once: true });
  const tracked = async path => {
    alive(); safeRelative(path);
    const bytes = await readFile(join(root, path));
    const blob = gitBlob(bytes);
    assert.equal(blob, git(['rev-parse', `HEAD:${path}`]), `Tracked checkout source changed: ${path}`);
    report.sourceFiles.push({ path, bytes: bytes.length, sha256: hash(bytes), gitBlob: blob });
    return bytes;
  };
  const built = async path => {
    alive(); safeRelative(path);
    const canonical = await realpath(join(dist, path));
    const rel = relative(dist, canonical);
    assert.ok(rel && rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel), 'Built path must stay inside dist');
    const bytes = await readFile(canonical);
    const pin = { path, bytes: bytes.length, sha256: hash(bytes) };
    if (path.startsWith('global-workbench/')) assert.equal(pin.sha256, expectedGlobalBuild.get(path), `Reviewed global build hash: ${path}`);
    report.builtFiles.push(pin); expected.set(`${base}${path}`, pin);
    if (path === 'index.html') expected.set(base, pin); // Exact root navigation alias.
    return bytes;
  };
  const drain = async result => {
    while (result.pending.size) { alive(); await Promise.all([...result.pending]); }
    assert.deepEqual(result.bindingErrors, [], 'Browser response bytes must equal reviewed built bytes');
  };
  const shot = async (page, result, name, caption) => {
    const spec = PLAN.find(item => item.name === result.name);
    assert.ok(spec.shots.includes(name) && !result.screenshots.some(item => item.name === name), `Unplanned or duplicate screenshot: ${name}`);
    await drain(result);
    const file = safeRelative(`${result.name}--${name}.png`);
    const bytes = await page.screenshot({ fullPage: false, animations: 'disabled' });
    result.signal.throwIfAborted(); alive();
    assert.ok(bytes.length > 100 && bytes.length <= LIMITS.screenshotBytes, 'Screenshot byte budget');
    assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], 'Actual PNG required');
    const pin = await write(file, bytes, result.signal);
    result.screenshots.push({ name, ...pin, ...(caption ? { caption } : {}) });
  };
  const colors = async (page, result, selectors, label) => {
    const observations = [];
    for (const selector of selectors) {
      const node = page.locator(selector).first();
      await node.scrollIntoViewIfNeeded();
      const sample = await node.evaluate(readColor);
      assert.ok(sample.rect.width > 0 && sample.rect.height > 0 && sample.visibility === 'visible' && sample.display !== 'none', selector);
      assert.ok(sample.layers.every(layer => layer.image === 'none' && Number(layer.opacity) === 1), `Unsupported painted layer: ${selector}`);
      const ratio = contrast(sample.foreground, sample.background);
      assert.ok(ratio >= 4.5, `Sampled normal text contrast below 4.5:1: ${selector}: ${ratio}`);
      observations.push({ selector, ratio, ...sample });
    }
    (result.computedContrast ??= []).push({ label, observations });
  };
  const background = async (page, selector, color) => {
    await page.waitForFunction(({ selector, color }) => getComputedStyle(document.querySelector(selector)).backgroundColor === color, { selector, color });
  };
  const view = async (page, mode) => {
    assert.deepEqual(await page.locator('[data-view]').evaluateAll(nodes => nodes.filter(node => node.getAttribute('aria-pressed') === 'true').map(node => node.dataset.view)), [mode]);
    assert.equal(await page.locator('#geo-view').isVisible(), ['map', 'globe'].includes(mode));
    assert.equal(await page.locator('#network-view').isVisible(), mode === 'network');
    assert.equal(await page.locator('#table-view').isVisible(), mode === 'table');
    if (['map', 'globe'].includes(mode)) {
      assert.equal(await page.locator('#rotate').isVisible(), mode === 'globe');
      assert.ok(await page.locator('#geo path').count() > 0, 'Actual map geometry is required');
      assert.equal(await page.locator('#geo > circle').count() > 0, mode === 'globe', 'Flat/globe geometry must agree with controls');
    }
  };
  const ready = async (page, pageSpec) => {
    await page.locator('#records .record').first().waitFor();
    assert.equal(await page.locator('#error').isHidden(), true);
    assert.equal(await page.locator('#workspace').isVisible(), true);
    assert.ok((await page.locator('#detail h2').innerText()).length > 0);
    assert.ok((await page.locator('#count').innerText()).includes(' of '));
    const width = await page.evaluate(() => ({ width: innerWidth, document: document.documentElement.scrollWidth }));
    assert.ok(width.document <= width.width + 1, `${pageSpec.id}: no document-level horizontal overflow`);
  };
  const go = async (page, result, path) => {
    await drain(result);
    const response = await page.goto(`${origin}${base}${path}`, { waitUntil: 'networkidle' });
    assert.equal(response.status(), 200);
    await drain(result);
  };
  const goRootRoute = async (page, result, route) => {
    await drain(result); const before = page.url(), expectedHash = `#/${route}`;
    const response = await page.goto(`${origin}${base}${expectedHash}`, { waitUntil: 'networkidle' });
    if (response) assert.equal(response.status(), 200);
    else requireSameDocumentRootNavigation(before, page.url(), origin, base, expectedHash, result.verifiedPaths.has(base));
    assert.equal(new URL(page.url()).hash, expectedHash); await drain(result);
  };
  const reload = async (page, result, spec) => {
    await drain(result); await page.reload({ waitUntil: 'networkidle' }); await drain(result); await ready(page, spec);
  };
  const stored = page => page.evaluate(key => localStorage.getItem(key), STORAGE_KEY);
  const selectView = async (page, mode) => { await page.locator(`[data-view="${mode}"]`).click(); await view(page, mode); };
  const tabTo = async (page, selector, maximum = 30) => {
    for (let count = 0; count < maximum; count += 1) {
      await page.keyboard.press('Tab');
      if (await page.locator(selector).evaluate(node => node === document.activeElement)) return;
    }
    fail(`Native Tab did not reach ${selector} within ${maximum} steps`);
  };
  const focusVisible = async (page, locator) => {
    assert.equal(await locator.evaluate(node => node === document.activeElement), true);
    const state = await locator.evaluate(node => { const style = getComputedStyle(node); return { visible: node.matches(':focus-visible'), outline: style.outlineStyle, width: parseFloat(style.outlineWidth) }; });
    assert.ok(state.visible && state.outline !== 'none' && state.width >= 2, 'Native keyboard focus must have a visible outline');
  };
  // Read only live computed styles and native input state; never restyle product DOM.
  const observe = (result, key, value) => {
    const spec = ROOT_PLAN.find(item => item.name === result.name);
    assert.ok(spec?.observations.includes(key), `Unplanned root observation: ${key}`);
    result.rootObservations ??= {}; assert.ok(!(key in result.rootObservations), `Duplicate root observation: ${key}`);
    result.rootObservations[key] = value;
  };
  const rootMaterial = async (locator, expected) => {
    await locator.waitFor({ state: 'visible' });
    const actual = await locator.evaluate(node => { const css = getComputedStyle(node); return { background: css.backgroundColor, backgroundImage: css.backgroundImage, foreground: css.color }; });
    requireRootMaterial(actual, expected); return actual;
  };
  const nativeFocus = async (page, locator) => {
    await locator.scrollIntoViewIfNeeded(); await locator.focus();
    await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab'); await focusVisible(page, locator);
  };
  const rootFocus = async locator => {
    const sample = await locator.evaluate(node => { const css = getComputedStyle(node); let background; for (let parent = node; parent; parent = parent.parentElement) { const color = getComputedStyle(parent).backgroundColor; if (color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') { background = color; break; } } return { color: css.outlineColor, width: css.outlineWidth, style: css.outlineStyle, background, focused: node === document.activeElement, focusVisible: node.matches(':focus-visible') }; });
    assert.ok(sample.focused && sample.focusVisible && sample.style !== 'none' && parseFloat(sample.width) >= 2);
    sample.ratio = contrast(sample.color, sample.background); assert.ok(sample.ratio >= 3, 'Sampled root focus contrast against its computed material'); return sample;
  };
  const rootOverflow = async page => {
    const frame = await page.evaluate(() => { const main = document.querySelector('#main-content'); return { width: innerWidth, document: document.documentElement.scrollWidth, main: main.scrollWidth, mainClient: main.clientWidth }; });
    requireRootOverflow(frame); return frame;
  };
  const rootMotion = async (page, selectors) => {
    const value = await page.evaluate(selectors => ({ matches: matchMedia('(prefers-reduced-motion: reduce)').matches, samples: selectors.map(selector => { const node = document.querySelector(selector); if (!node) throw new Error(`Missing motion sample: ${selector}`); const css = getComputedStyle(node); return { selector, animationName: css.animationName, transitionDuration: css.transitionDuration, scrollBehavior: css.scrollBehavior }; }) }), selectors);
    requireReducedMotion(value); return value;
  };
  const finishRoot = async (page, result) => {
    await drain(result); requireVerifiedPath(result, base);
    assert.ok([...result.verifiedPaths].some(path => /\/assets\/.+\.css$/.test(path)), 'Root computed CSS must have browser/build byte binding');
    assert.ok([...result.verifiedPaths].some(path => /\/assets\/.+\.js$/.test(path)), 'Root markup must have browser/build byte binding');
    observe(result, 'reducedMotion', await rootMotion(page, ['.site-masthead .masthead-search', '#main-content']));
    observe(result, 'overflow', await rootOverflow(page)); validateRootObservations(result);
    result.rootScope = 'Partial root source/material coverage. Native CI pixels exist only after execution; no all-root route/interior, full accessibility, physical-device or ordinary-motion qualification.';
  };

  const selectRecord = async (page, result, spec) => {
    const record = page.locator('#records .record').nth(1);
    assert.ok(await page.locator('#records .record').count() > 1);
    const identity = await record.getAttribute(spec.id === 'media' ? 'data-id' : 'data-record');
    // Focus setup is explicit; activation and replacement-focus behavior use native input.
    await record.focus(); await page.keyboard.press('Enter');
    const selected = page.locator('#records .record[aria-pressed="true"]');
    assert.equal(await selected.getAttribute(spec.id === 'media' ? 'data-id' : 'data-record'), identity);
    assert.equal(await (result.viewport.width < 761 ? page.locator('#inspector') : selected).evaluate(node => node === document.activeElement), true, 'Record selection must retain desktop focus or move narrow focus to the inspector');
    await page.locator('#detail').scrollIntoViewIfNeeded();
    result.selectedRecord = { identity, heading: await page.locator('#detail h2').innerText(), focus: result.viewport.width < 761 ? 'inspector' : 'selected-record' };
  };
  const sourcePanel = async (page, result) => {
    const source = page.locator('#detail a.source[href]').first();
    await source.waitFor({ state: 'attached' });
    const disclosure = source.locator('xpath=ancestor::details[1]');
    const summary = await disclosure.count() ? disclosure.locator(':scope > summary') : page.locator('#detail details > summary').first();
    if (await summary.count()) {
      assert.equal(await summary.evaluate(node => node.parentElement.open), false, 'Initial source disclosure is closed');
      await summary.focus(); await page.keyboard.press('Enter');
      assert.equal(await summary.evaluate(node => node.parentElement.open), true);
      await page.keyboard.press('Space');
      assert.equal(await summary.evaluate(node => node.parentElement.open), false);
      await page.keyboard.press('Enter');
      assert.equal(await summary.evaluate(node => node.parentElement.open), true);
      result.sourceDetailsToggled = 'Native open, close, reopen; left open for source activation, color samples and screenshot';
    } else result.sourceDetailsToggled = 'No details control on this selected record';
    await source.waitFor();
    const href = await source.getAttribute('href');
    assert.ok(['http:', 'https:'].includes(new URL(href).protocol));
    assert.equal(await source.getAttribute('target'), '_blank');
    const rel = (await source.getAttribute('rel')).split(/\s+/);
    assert.ok(rel.includes('noopener') && rel.includes('noreferrer'));
    await source.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
    await focusVisible(page, source);
    result.sourceControl = { href, target: '_blank', rel, keyboardFocused: true, activation: 'isolated-intercepted-fixture' };
    await colors(page, result, ['#detail a.source[href]', '#detail a.source[href] small'], 'source-panel');
    result.sourceFixture = href;
    const popupPromise = page.context().waitForEvent('page');
    popupPromise.catch(() => {}); // Observe a waiter rejected by timeout/close even if activation fails first.
    await page.keyboard.press('Enter');
    const popup = await popupPromise;
    await popup.waitForLoadState('domcontentloaded');
    assert.equal(await popup.locator('h1').innerText(), 'CI source-link fixture');
    assert.equal(await popup.evaluate(() => opener === null), true);
    await popup.close();
    assert.equal(result.sourceFixtureHits, 1, 'Source-link activation must use the exact intercepted fixture, never a live source');

  };
  const run = async (name, viewport, work, options = {}) => {
    alive();
    const caseDeadline = Math.min(performance.now() + LIMITS.scenarioMs, activeDeadline);
    const caseStarted = performance.now();
    const result = { name, viewport, status: 'running', screenshots: [], requests: [], responses: [], pageErrors: [], failedRequests: [], unexpectedExternal: [], bindingErrors: [], verifiedPaths: new Set(), pending: new Set(), sourceFixtureHits: 0, expectedFailureHits: 0 };
    report.scenarios.push(result);
    let context, creation, closing;
    const cleanup = () => closing ??= (async () => {
      context ??= await creation;
      await context?.close();
      if (activeContext === context) activeContext = null;
    })();
    try {
      await boundedLifecycle({ deadline: caseDeadline, cleanupReserveMs: 2000, label: `Felt/${name}`, signal,
        setup: async caseSignal => {
          result.signal = caseSignal; caseSignal.throwIfAborted();
          creation = browser.newContext({ viewport, reducedMotion: 'reduce', deviceScaleFactor: 1, serviceWorkers: 'block',
            ...(options.storage === 'invalid' ? { storageState: { cookies: [], origins: [{ origin, localStorage: [{ name: STORAGE_KEY, value: 'invalid-native-fixture' }] }] } } : {}) });
          context = await creation; activeContext = context; caseSignal.throwIfAborted();
          context.setDefaultTimeout(15000); context.setDefaultNavigationTimeout(30000);
          if (options.storage === 'denied') await context.addInitScript(() => { Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('CI denied localStorage fixture', 'SecurityError'); } }); });
          await context.route('**/*', async route => {
            const url = route.request().url();
            if (url === result.sourceFixture) { result.sourceFixtureHits += 1; return route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>CI source-link fixture</title><h1>CI source-link fixture</h1><p>Intercepted navigation only; no live-source verification.</p>' }); }
            if (new URL(url).origin !== origin) { result.unexpectedExternal.push(url); return route.abort('blockedbyclient'); }
            if (options.failurePath && new URL(url).pathname === options.failurePath && result.expectedFailureHits === 0) {
              result.expectedFailureHits += 1;
              return route.fulfill({ status: 503, contentType: 'application/json', body: '{"fixture":"intentional-one-shot-data-load-failure"}' });
            }
            return route.continue();
          });
          // Context events also include the deliberately intercepted source popup.
          context.on('request', request => result.requests.push({ url: request.url(), type: request.resourceType(), method: request.method() }));
          context.on('requestfailed', request => result.failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
          context.on('response', response => {
            const pathname = new URL(response.url()).pathname;
            const item = { url: response.url(), status: response.status(), type: response.request().resourceType(), contentType: response.headers()['content-type'] ?? '' };
            result.responses.push(item);
            const pin = expected.get(pathname);
            if (!pin || (options.failurePath === pathname && item.status === 503)) return;
            const task = response.body().then(bytes => {
              verifyBoundResponse(pin, item, bytes); result.verifiedPaths.add(pathname);
            }).catch(error => result.bindingErrors.push(error.message)).finally(() => result.pending.delete(task));
            result.pending.add(task);
          });
          context.on('page', page => page.on('pageerror', error => result.pageErrors.push(error.message)));
          return context.newPage();
        },
        work: page => work(page, result),
        drain: () => drain(result), cleanup,
        validate: () => {
          validateResponseResults(result, options.failurePath);
          if (options.offline) requireOfflineRequests(result.requests);
          if (options.root) requireVerifiedPath(result, base);
          assert.deepEqual(result.screenshots.map(item => item.name), PLAN.find(item => item.name === name).shots);
        },
      });
      result.status = 'passed';
    } catch (error) { result.status = 'failed'; result.error = error.stack ?? error.message; throw error; }
    finally { result.elapsedMs = performance.now() - caseStarted; console.log(`${result.status.toUpperCase()}: felt/${name}`); }
  };

  try {
    assert.equal(git(['rev-parse', 'HEAD']), report.commit, 'CI checkout must match the execution SHA');
    report.executionTree = git(['rev-parse', 'HEAD^{tree}']);
    const contract = JSON.parse(await tracked('scripts/spatial-release-felt.sources.json'));
    validateSourceContract(contract); report.sourceContract = contract;
    expectedGlobalBuild = new Map(contract.globalBuildFiles.map(pin => [pin.path, pin.sha256]));
    for (const pin of contract.files) {
      const bytes = await tracked(pin.path);
      assert.equal(hash(bytes), pin.sha256, pin.path); assert.equal(bytes.length, pin.bytes, pin.path); assert.equal(gitBlob(bytes), pin.gitBlob, pin.path);
    }
    for (const path of ['scripts/spatial-release-felt.browser.mjs', 'scripts/spatial-release-felt.browser.test.mjs', 'scripts/spatial-release.browser.mjs', '.github/workflows/deploy.yml', '.github/workflows/spatial-release-review.yml']) await tracked(path);
    const lock = JSON.parse(await readFile(join(root, 'package-lock.json')));
    const runtime = JSON.parse(await readFile(join(root, 'node_modules/playwright/package.json')));
    report.playwright = { version: runtime.version, lockVersion: lock.packages['node_modules/playwright'].version, integrity: lock.packages['node_modules/playwright'].integrity };
    assert.equal(report.playwright.version, report.playwright.lockVersion);
    assert.equal(report.playwright.version, '1.62.1', 'No new browser runtime version');
    const uiFiles = git(['ls-files', '-z', 'global-evidence-workbench/ui']).split('\0').filter(Boolean).filter(path => /\/ui\/(?:src\/|public\/|(?:index|finance|media)\.html$)/.test(path));
    assert.ok(uiFiles.length > 10, 'Closed tracked source inventory is required');
    for (const path of uiFiles) {
      const bytes = await tracked(path);
      const builtBytes = await built(`global-workbench/${path.split('/ui/')[1]}`);
      assert.deepEqual(builtBytes, bytes, `Static source/build equality: ${path}`);
    }
    for (const spec of PAGES) {
      const bytes = await built(`global-workbench/${spec.offline}`), html = bytes.toString('utf8');
      assert.ok(html.includes((await readFile(join(root, 'global-evidence-workbench/ui/src/style.css'), 'utf8')).trim()), `Offline felt stylesheet: ${spec.id}`);
      assert.ok(html.includes(`const MAP_VIEW_KEY='${STORAGE_KEY}'`), `Offline geographic preference: ${spec.id}`);
      assert.ok(!html.includes(`await fetch('./public/data/${spec.data}')`), `Offline dataset must remain embedded: ${spec.id}`);
    }
    assert.deepEqual(report.builtFiles.map(pin => pin.path).sort(), [...REQUIRED_GLOBAL_OUTPUTS].sort(), 'Closed nineteen-output global build');
    // Bind all emitted root JS/CSS and HTML before reading them in the browser.
    await built('index.html');
    for (const file of await readdir(join(dist, 'assets'))) if (/\.(?:css|js)$/.test(file)) await built(`assets/${file}`);
    for (const spec of PAGES) for (const [width, viewport] of Object.entries(VIEWPORTS)) await run(`${spec.id}-${width}`, viewport, async (page, result) => {
      await go(page, result, `global-workbench/${spec.file}`); await ready(page, spec); await view(page, 'map'); assert.equal(await stored(page), null);
      for (const path of [`global-workbench/${spec.file}`, 'global-workbench/src/style.css', `global-workbench/src/${spec.script}`, `global-workbench/public/data/${spec.data}`]) assert.ok(result.verifiedPaths.has(`${base}${path}`), `Source/build/browser equality missing: ${path}`);
      await background(page, 'body', 'rgb(10, 36, 28)'); await background(page, '#filters', 'rgb(245, 243, 236)'); await background(page, '#geo-view', 'rgb(15, 48, 35)');
      await shot(page, result, 'shell');
      await tabTo(page, '.skip'); await focusVisible(page, page.locator('.skip')); await page.keyboard.press('Enter'); assert.equal(new URL(page.url()).hash, '#main');
      await tabTo(page, '#search'); await focusVisible(page, page.locator('#search'));
      await colors(page, result, ['.intro h1', '.dek', '#filters label', '#detail h2', '#detail p', '#geo-note'], 'flat-map');
      await page.locator('.viewbar').scrollIntoViewIfNeeded(); await shot(page, result, 'flat-map');
      const marker = page.locator('#geo [role="button"]').first();
      await marker.waitFor(); const markerId = await marker.getAttribute(spec.id === 'media' ? 'data-id' : 'data-record');
      assert.ok(markerId); await marker.focus(); await page.keyboard.press('Enter');
      assert.ok((await page.locator('#detail .kicker').innerText()).includes(markerId), 'Native map marker must select its exact source record/profile');
      result.mapSelection = markerId; requirePreference(await stored(page), null, 'fresh map marker selection');
      await selectRecord(page, result, spec); requirePreference(await stored(page), null, 'fresh register selection'); await sourcePanel(page, result); await page.locator('#detail a.source[href]').first().scrollIntoViewIfNeeded(); await shot(page, result, 'source-panel');
      const selection = await page.locator('#detail .kicker').innerText();
      await page.locator('[data-view="map"]').focus(); await page.keyboard.press('Tab'); await focusVisible(page, page.locator('[data-view="globe"]')); await page.keyboard.press('Enter'); await view(page, 'globe'); assert.equal(await stored(page), 'globe');
      await page.keyboard.press('Tab'); await focusVisible(page, page.locator('[data-view="network"]')); await page.keyboard.press('Space'); await view(page, 'network'); assert.equal(await stored(page), 'globe');
      assert.equal(await page.locator('#detail .kicker').innerText(), selection);
      const networkFocus = page.locator('#network-focus');
      if (await networkFocus.locator('option').count() > 1) {
        const before = await networkFocus.inputValue(); await networkFocus.focus(); await page.keyboard.press('ArrowDown');
        assert.notEqual(await networkFocus.inputValue(), before); assert.equal(await stored(page), 'globe');
        result.networkFocusChanged = true;
      } else result.networkFocusChanged = 'Only one source-backed focus option';
      await page.locator('[data-view="network"]').focus();
      await page.locator('.viewbar').scrollIntoViewIfNeeded(); 
      await page.keyboard.press('Tab'); await focusVisible(page, page.locator('[data-view="table"]')); await page.keyboard.press('Enter'); await view(page, 'table'); assert.equal(await stored(page), 'globe');
      assert.equal(await page.locator('#detail .kicker').innerText(), selection); assert.ok(await page.locator('#rows tr').count() > 0);
      const tableRecord = page.locator('#rows button').first();
      const tableId = await tableRecord.getAttribute(spec.id === 'media' ? 'data-id' : 'data-record');
      await tableRecord.focus(); await page.keyboard.press('Space');
      assert.ok((await page.locator('#detail .kicker').innerText()).includes(tableId), 'Native table selection must open the same record/profile identity');
      assert.equal(await stored(page), 'globe'); result.tableSelection = tableId;
      await page.locator('.viewbar').scrollIntoViewIfNeeded();
      
      await page.locator('#search').fill('felt-native-no-match-79bb392'); await page.locator('#empty').waitFor(); assert.equal(await page.locator('#records .record').count(), 0); assert.equal(await stored(page), 'globe'); await view(page, 'table');
      await page.locator('#empty').scrollIntoViewIfNeeded(); 
      await page.locator('#empty-reset').focus(); await page.keyboard.press('Space'); await ready(page, spec); assert.equal(await page.locator('#search').inputValue(), ''); assert.equal(await stored(page), 'globe'); await view(page, 'table');
      const filter = FILTERS[spec.id], attribute = spec.id === 'media' ? 'data-id' : 'data-record';
      const ids = selector => page.locator(selector).evaluateAll((nodes, attribute) => nodes.map(node => node.getAttribute(attribute)), attribute);
      const beforeFilter = await ids('#records .record');
      assert.equal(beforeFilter.length, filter.count); assert.equal(hash(JSON.stringify(beforeFilter)), filter.resetSha256);
      await page.locator('#more').focus(); await page.keyboard.press('Enter');
      requireAdvancedState({ expanded: await page.locator('#more').getAttribute('aria-expanded'), panelVisible: await page.locator('#advanced').isVisible(), fieldVisible: await page.locator('#status').isVisible() }, true);
      await page.locator('#status').selectOption(filter.status);
      await page.waitForFunction(({ attribute, expected }) => JSON.stringify([...document.querySelectorAll('#records .record')].map(node => node.getAttribute(attribute))) === JSON.stringify(expected), { attribute, expected: filter.ids });
      requireFilteredRecords(await ids('#records .record'), filter.ids, beforeFilter);
      assert.deepEqual(await ids('#rows button'), filter.ids);
      assert.equal(await page.locator('#count').innerText(), `${filter.ids.length} of ${filter.count} ${spec.id === 'media' ? 'relationships' : 'records'}`);
      requirePreference(await stored(page), 'globe', 'advanced status filter'); await view(page, 'table');
      await page.locator('#filters button[type="reset"]').focus(); await page.keyboard.press('Enter');
      await page.waitForFunction(({ attribute, expected }) => JSON.stringify([...document.querySelectorAll('#records .record')].map(node => node.getAttribute(attribute))) === JSON.stringify(expected), { attribute, expected: beforeFilter });
      requireResetRecords(await ids('#records .record'), beforeFilter, filter); requireResetRecords(await ids('#rows button'), beforeFilter, filter);
      assert.equal(await page.locator('#status').inputValue(), ''); assert.equal(await page.locator('#empty').isHidden(), true);
      requirePreference(await stored(page), 'globe', 'advanced form reset'); await view(page, 'table');
      await page.locator('#more').focus(); await page.keyboard.press('Space');
      requireAdvancedState({ expanded: await page.locator('#more').getAttribute('aria-expanded'), panelVisible: await page.locator('#advanced').isVisible(), fieldVisible: await page.locator('#status').isVisible() }, false);
      result.advancedFilter = { status: filter.status, identities: filter.ids, restoredCount: beforeFilter.length, restoredIdentitySha256: filter.resetSha256, retainedPreference: 'globe' };
      await reload(page, result, spec); await view(page, 'globe'); assert.equal(await stored(page), 'globe'); await page.locator('.viewbar').scrollIntoViewIfNeeded(); await shot(page, result, 'globe-reload');
      await selectView(page, 'map'); await reload(page, result, spec); await view(page, 'map'); assert.equal(await stored(page), 'map');
      await selectRecord(page, result, spec); requirePreference(await stored(page), 'map', 'remembered map register selection');
      await page.locator('#geo [role="button"]').first().focus(); await page.keyboard.press('Enter'); requirePreference(await stored(page), 'map', 'remembered map marker selection');
      await page.locator('.viewbar').scrollIntoViewIfNeeded(); 
      result.preferenceTransitions = { fresh: 'map', explicitGlobeReload: 'globe', explicitMapReload: 'map', networkTableSearchResetPreservedGlobe: true };
      result.emptyReset = { emptyRecords: 0, restoredRecords: await page.locator('#records .record').count(), searchCleared: true };

    });
    for (const spec of PAGES) for (const storage of ['invalid', 'denied']) await run(`${spec.id}-storage-${storage}`, VIEWPORTS.narrow, async (page, result) => {
      await go(page, result, `global-workbench/${spec.file}`); await ready(page, spec); await view(page, 'map');
      if (storage === 'invalid') assert.equal(await stored(page), 'invalid-native-fixture');
      else assert.equal(await page.evaluate(() => { try { void localStorage; return false; } catch (error) { return error.name === 'SecurityError'; } }), true);
      await selectView(page, 'globe'); await reload(page, result, spec); await view(page, storage === 'denied' ? 'map' : 'globe');
      await selectView(page, 'network'); await selectView(page, 'table'); await selectView(page, 'map');
      await page.locator('.viewbar').scrollIntoViewIfNeeded(); 
      result.storageFixture = storage; result.observations = { initial: 'map', afterExplicitGlobeAndReload: storage === 'denied' ? 'map' : 'globe', networkAndTableOperable: true, returnedToMap: true };
    }, { storage });
    await run('same-origin-preference', VIEWPORTS.desktop, async (page, result) => {
      await go(page, result, 'global-workbench/index.html'); await ready(page, PAGES[0]); await selectView(page, 'globe');
      for (const spec of PAGES.slice(1)) { await page.locator(`.section-nav a[href="./${spec.file}"]`).click(); await page.waitForLoadState('networkidle'); await ready(page, spec); await view(page, 'globe'); assert.equal(await stored(page), 'globe'); }
      await selectView(page, 'map');
      for (const spec of [PAGES[1], PAGES[0]]) { await page.locator(`.section-nav a[href="./${spec.file}"]`).click(); await page.waitForLoadState('networkidle'); await ready(page, spec); await view(page, 'map'); assert.equal(await stored(page), 'map'); }
      await page.locator('.viewbar').scrollIntoViewIfNeeded(); 
    });
    for (const spec of PAGES) await run(`${spec.id}-offline`, VIEWPORTS.narrow, async (page, result) => {
      await go(page, result, `global-workbench/${spec.offline}`); await ready(page, spec); await view(page, 'map');
      assert.ok(result.verifiedPaths.has(`${base}global-workbench/${spec.offline}`));
      requireOfflineRequests(result.requests);
      await page.locator('.viewbar').scrollIntoViewIfNeeded(); await shot(page, result, 'flat-map');
      await selectRecord(page, result, spec); requirePreference(await stored(page), null, 'fresh register selection'); await sourcePanel(page, result); await page.locator('#detail a.source[href]').first().scrollIntoViewIfNeeded(); 
      await selectView(page, 'globe'); await reload(page, result, spec); await view(page, 'globe');
      result.offlineScope = 'Self-contained export served by the existing loopback server with zero subresource/data requests through final cleanup/drain. This does not certify file:// storage semantics.';
    }, { offline: true });
    for (const spec of PAGES) await run(`${spec.id}-load-error`, VIEWPORTS.narrow, async (page, result) => {
      await go(page, result, `global-workbench/${spec.file}`); await page.locator('#error').waitFor();
      assert.match(await page.locator('#error').innerText(), /could not load.*503/s); assert.equal(await page.locator('#workspace').isHidden(), true);
      await colors(page, result, ['#error'], 'expected-load-error'); await page.locator('#error').scrollIntoViewIfNeeded(); await shot(page, result, 'expected-error');
      await reload(page, result, spec); await view(page, 'map'); await page.locator('.viewbar').scrollIntoViewIfNeeded(); 
      result.recovery = { sourceBoundDatasetReloaded: true, errorHidden: true, mode: 'map' };
      result.failureFixture = 'Exactly one intercepted dataset HTTP 503, then a real source-bound reload. Other errors fail.';
    }, { failurePath: `${base}global-workbench/public/data/${spec.data}` });
    for (const [width, viewport] of Object.entries(VIEWPORTS)) await run(`root-${width}`, viewport, async (page, result) => {
      await go(page, result, '#/energy'); await page.locator('.site-shell.investigation-shell').waitFor();
      const graph = '[data-investigation-workspace][data-workspace-route="/energy"].iw-surface-map .atlas-linked-network .atlas-network .iw-graph';
      await page.locator(graph).waitFor();
      assert.equal(await page.locator(graph).evaluate(node => node.closest('.iw-graph-panel') === null), true, 'Linked atlas graph is outside the transparent connections override');
      const tokens = await page.evaluate(() => Object.fromEntries(['--color-bg', '--color-bg-elevated', '--color-bg-card', '--color-bg-card-hover'].map(key => [key, getComputedStyle(document.documentElement).getPropertyValue(key).trim()])));
      assert.deepEqual(tokens, { '--color-bg': '#0a241c', '--color-bg-elevated': '#0f3023', '--color-bg-card': '#163e2c', '--color-bg-card-hover': '#1a4631' }); result.rootTokens = tokens;
      await background(page, 'html', 'rgb(10, 36, 28)');
      result.rootShellMaterial = await page.locator('.site-shell').evaluate(node => getComputedStyle(node).backgroundColor);
      assert.equal(result.rootShellMaterial, 'rgb(10, 36, 28)', 'Accepted post-PR19 root-shell material must win');
      await page.locator(graph).scrollIntoViewIfNeeded(); await shot(page, result, 'shell', 'Energy linked AtlasNetwork graph context after scrolling; this retained filename does not depict the full masthead or navigation shell.');
      await background(page, graph, 'rgb(15, 48, 35)');
      await colors(page, result, [`${graph} .iw-graph-heading h2`, `${graph} .iw-graph-count`], 'linked-graph-elevated');
      await page.mouse.move(0, 0); await background(page, `${graph} .iw-graph-tools`, 'rgb(22, 62, 44)');
      await colors(page, result, [`${graph} .iw-graph-tools span`, `${graph} .iw-graph-tools output`], 'linked-graph-tools');
      await page.locator(`${graph} .iw-graph-heading`).scrollIntoViewIfNeeded(); await shot(page, result, 'graph-surfaces');
      const buttonSelector = `${graph} .iw-graph-tools button[aria-label="Zoom in relationship graph"]`;
      const button = page.locator(buttonSelector);
      await button.hover(); await background(page, buttonSelector, 'rgb(26, 70, 49)');
      await colors(page, result, [buttonSelector], 'linked-graph-hover');
      await button.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab'); await focusVisible(page, button);
      await button.hover(); await background(page, buttonSelector, 'rgb(26, 70, 49)');
      const focus = await button.evaluate(node => { const css = getComputedStyle(node); return { color: css.outlineColor, background: css.backgroundColor, width: css.outlineWidth, style: css.outlineStyle }; });
      focus.ratio = contrast(focus.color, focus.background); assert.ok(focus.ratio >= 3, 'Sampled focus indicator against hovered changed surface'); result.rootFocus = focus;
      await shot(page, result, 'graph-hover-focus');
      await page.locator('.iw-surfaces').getByRole('button', { name: 'Connections', exact: true }).click();
      await page.locator('.iw-surface-connections .iw-graph-panel .iw-graph').waitFor();
      result.preservedConnectionsGraph = await page.locator('.iw-surface-connections .iw-graph-panel .iw-graph').evaluate(node => getComputedStyle(node).backgroundColor);
      assert.equal(result.preservedConnectionsGraph, 'rgba(0, 0, 0, 0)', 'Retained specific transparent workspace override');
      requireVerifiedPath(result, base);
      assert.ok([...result.verifiedPaths].some(path => /\/assets\/.+\.css$/.test(path)), 'Root computed CSS must have browser/build byte binding');
      const frame = await page.evaluate(() => ({ width: innerWidth, document: document.documentElement.scrollWidth })); assert.ok(frame.document <= frame.width + 1);
      result.rootScope = 'Partial root-surface coverage: default Energy linked AtlasNetwork graph consumes elevated/card/hover tokens; HTML base token verified. Accepted three-CSS root shell is green; the specific Connections graph remains transparent. Appended cases sample selected chrome, reading surfaces and four independent wrappers only. No all-root-surface, whole-module-graph or full accessibility qualification.';
    }, { root: true });

    // Additional root-shell material evidence; every earlier scenario is retained above.
    for (const [width, viewport] of Object.entries(VIEWPORTS)) await run(`root-chrome-${width}`, viewport, async (page, result) => {
      await go(page, result, '#/');
      await page.locator('[data-investigation-workspace][data-workspace-route="/"].iw-surface-map.atlas-home').waitFor();
      const shell = {};
      for (const selector of ['.site-shell.investigation-shell', '.site-masthead', '.iw-command-header', '.iw-global-search > div']) shell[selector] = await rootMaterial(page.locator(selector), 'rgb(10, 36, 28)');
      shell['.iw-control-bar'] = await rootMaterial(page.locator('.iw-control-bar'), 'rgb(15, 48, 35)');
      observe(result, 'shell', shell);
      const desktop = width === 'desktop';
      assert.equal(await page.locator('.iw-navigation-rail').isVisible(), desktop);
      assert.equal(await page.locator('.atlas-mobile-sectors').isVisible(), !desktop);
      assert.equal(await page.locator('.atlas-home > .atlas-sector-strip').isVisible(), desktop);
      const navigation = desktop ? '.iw-navigation-rail' : '.atlas-mobile-sectors';
      observe(result, 'navigation', { selector: navigation, desktopRailVisible: desktop, mobileNavigationVisible: !desktop, material: await rootMaterial(page.locator(navigation), 'rgb(15, 48, 35)') });
      const search = page.locator('.site-masthead .masthead-search');
      await page.mouse.move(0, 0);
      const searchRest = await rootMaterial(search, 'rgb(22, 62, 44)');
      await search.hover();
      const searchHover = await rootMaterial(search, 'rgb(26, 70, 49)');
      await nativeFocus(page, search); const searchFocus = await rootFocus(search);
      observe(result, 'mastheadSearch', { rest: searchRest, hover: searchHover, focus: searchFocus,
        accessibleMetadata: { ariaLabel: await search.getAttribute('aria-label'), ariaLabelledby: await search.getAttribute('aria-labelledby'), textContent: await search.textContent(), textSpanVisible: await search.locator('span').isVisible(), svgAriaHidden: await search.locator('svg').getAttribute('aria-hidden') },
        accessibleNameLimitation: desktop ? null : 'Pre-existing 390px search link hides its text span and lacks an explicit aria-label. Current DOM metadata is retained; this sample does not determine the browser accessibility-tree name or establish an accessible-name pass.' });
      await page.mouse.move(0, 0);
      const query = page.locator('#iw-global-query');
      await query.fill('atlas'); await nativeFocus(page, query);
      await colors(page, result, ['#iw-global-query'], 'workspace-search-text');
      observe(result, 'workspaceSearch', { value: await query.inputValue(), focus: await rootFocus(query), container: await rootMaterial(page.locator('.iw-global-search > div'), 'rgb(10, 36, 28)'), submitted: false });
      const sectorSelector = desktop ? '.atlas-sector-strip nav' : '.atlas-mobile-sectors';
      const sector = page.locator(sectorSelector).getByRole('link', { name: 'Energy', exact: true });
      await sector.hover();
      const sectorMaterial = await rootMaterial(sector, desktop ? 'rgb(18, 55, 37)' : 'rgb(26, 70, 49)');
      const sectorSample = await sector.evaluate(readColor);
      const sectorRatio = contrast(sectorSample.foreground, sectorSample.background); assert.ok(sectorRatio >= 4.5);
      if (desktop) assert.equal(await sector.locator(':scope > span').count(), 0, 'Actual home sector link has label and SVG, no numeric count consumer');
      observe(result, 'sectorNavigation', { selector: sectorSelector, text: await sector.innerText(), href: await sector.getAttribute('href'), hover: sectorMaterial, contrast: { ...sectorSample, ratio: sectorRatio },
        countScope: 'No sector count is rendered by AtlasSectorStrip. The paper dock record count is observed separately.' });
      await shot(page, result, 'shell-navigation-search', `${width}: actual home masthead and ${desktop ? 'rail/sector strip' : 'mobile sector navigation'} with Energy hovered; workspace search has native focus and unsent text. No sector count exists.`);
      await query.fill('');
      const openerSelector = desktop ? '.iw-rail-more[aria-label="Open all lenses and registers"]' : '.site-masthead button[aria-label="Open navigation"]';
      const opener = page.locator(openerSelector);
      await nativeFocus(page, opener); await page.keyboard.press('Enter');
      const dialog = page.locator('#site-nav-mobile'); await dialog.waitFor();
      assert.equal(await dialog.evaluate(node => node.open), true); assert.equal(await opener.getAttribute('aria-expanded'), 'true');
      await page.waitForFunction(() => document.activeElement === document.querySelector('#site-nav-mobile button[aria-label="Close navigation"]'));
      await focusVisible(page, dialog.locator('button[aria-label="Close navigation"]'));
      await page.keyboard.press('Tab'); const navSearch = dialog.locator('.nav-search'); await focusVisible(page, navSearch);
      await navSearch.fill('energy');
      assert.equal(await dialog.locator('.nav-group').getByRole('link', { name: 'Energy power map', exact: true }).count(), 1);
      const backdrop = await dialog.evaluate(node => getComputedStyle(node, '::backdrop').backgroundColor);
      const channels = backdrop.match(/[\d.]+/g)?.map(Number); assert.equal(channels?.length, 4); assert.deepEqual(channels.slice(0, 3), [0, 23, 15]); assert.ok(Math.abs(channels[3] - 184 / 255) < 0.005);
      await colors(page, result, ['#mobile-nav-title', '#site-nav-mobile .mobile-nav-heading p', '#site-nav-mobile .nav-search'], 'navigation-dialog');
      const navEvidence = { material: await rootMaterial(dialog, 'rgb(15, 48, 35)'), search: await rootMaterial(navSearch, 'rgb(10, 36, 28)'), focus: await rootFocus(navSearch), backdrop,
        reducedMotion: await rootMotion(page, ['#site-nav-mobile', '#site-nav-mobile .nav-search']) };
      await shot(page, result, 'navigation-dialog-focus', `${width}: native navigation dialog opened through its visible control, filtered to Energy, with keyboard focus on the actual search input.`);
      await page.keyboard.press('Escape');
      await page.waitForFunction(selector => !document.querySelector('#site-nav-mobile').open && document.activeElement === document.querySelector(selector), openerSelector);
      assert.equal(await dialog.evaluate(node => node.open), false);
      assert.equal(await opener.getAttribute('aria-expanded'), 'false'); assert.equal(await opener.evaluate(node => node === document.activeElement), true);
      observe(result, 'navDialog', { ...navEvidence, escapeClosed: true, focusReturnedToOpener: true });
      const mapRoot = '.iw-surface-map .iw-linked-canvases';
      const map = page.locator(`${mapRoot} .iw-map[data-map-dimension="2d"]`); await map.waitFor();
      const paths = await map.locator('.iw-map-state[data-state-code]').evaluateAll(nodes => nodes.map(node => ({ code: node.getAttribute('data-state-code'), path: node.getAttribute('d') })));
      assert.equal(paths.length, 36); assert.equal(new Set(paths.map(item => item.code)).size, 36); assert.ok(paths.every(item => item.path?.length > 20));
      const materials = {};
      for (const [selector, expected] of [['.iw-canvas-area', 'rgb(10, 36, 28)'], [mapRoot, 'rgb(10, 36, 28)'], [`${mapRoot} .iw-map-panel`, 'rgb(15, 48, 35)'], [`${mapRoot} .iw-map-readout`, 'rgb(10, 36, 28)']]) materials[selector] = await rootMaterial(page.locator(selector), expected);
      await colors(page, result, [`${mapRoot} .iw-map-heading h2`, `${mapRoot} .iw-map-readout strong`, `${mapRoot} .iw-map-readout span`], 'linked-map-materials');
      observe(result, 'linkedMap', { dimension: await map.getAttribute('data-map-dimension'), stateCount: paths.length, geometrySha256: hash(JSON.stringify(paths)), materials });
      const dock = '.atlas-evidence-dock';
      const dockMaterial = await rootMaterial(page.locator(dock), 'rgb(232, 228, 216)');
      const feedMaterial = await rootMaterial(page.locator(`${dock} > .atlas-case-feed`), 'rgb(232, 228, 216)');
      assert.equal(dockMaterial.foreground, 'rgb(24, 44, 50)'); assert.equal(feedMaterial.foreground, 'rgb(24, 44, 50)');
      const count = await page.locator(`${dock} .atlas-record-count`).innerText(); assert.match(count, /^[\d,]+ records$/); assert.ok(Number(count.replace(/[^\d]/g, '')) > 0);
      assert.ok(await page.locator(`${dock} .atlas-case-list > li[data-case-id]`).count() > 0);
      await colors(page, result, [`${dock} h2`, `${dock} .atlas-record-count`, `${dock} .atlas-feed-method`, `${dock} .atlas-case-list > li:first-child p`], 'paper-dock-and-real-record-count');
      observe(result, 'paperDock', { material: dockMaterial, feedMaterial, actualRecordCountText: count, firstRecordId: await page.locator(`${dock} .atlas-case-list > li[data-case-id]`).first().getAttribute('data-case-id'), countScope: 'Real AtlasCaseFeed record count, not a sector count or modal reader.' });
      await page.locator(`${mapRoot} .iw-map-heading`).scrollIntoViewIfNeeded();
      await shot(page, result, desktop ? 'linked-map-and-paper-dock' : 'linked-map', `${width}: actual default 2D linked map with 36 state paths${desktop ? ' beside the upper paper evidence dock' : ''}; map and dock material winners are separately recorded.`);
      if (!desktop) { await page.locator(`${dock} > .atlas-case-feed > header`).scrollIntoViewIfNeeded(); await shot(page, result, 'paper-dock', '390px: actual stacked paper evidence dock and its real record count; this is not the floating paper reader.'); }
      await finishRoot(page, result);
    }, { root: true });

    for (const [width, viewport] of Object.entries(VIEWPORTS)) await run(`root-reading-${width}`, viewport, async (page, result) => {
      await go(page, result, '#/health'); await page.locator('[data-workspace-route="/health"].iw-surface-map').waitFor();
      const dossierButton = page.locator('.iw-surfaces').getByRole('button', { name: 'Dossier', exact: true });
      await nativeFocus(page, dossierButton); await page.keyboard.press('Enter');
      await page.locator('[data-workspace-route="/health"].iw-surface-dossier').waitFor();
      assert.equal(new URLSearchParams(new URL(page.url()).hash.split('?')[1]).get('iw_view'), 'dossier');
      assert.equal(await page.locator('#investigation-dossier-heading').innerText(), 'Hospitals, insurance & public health');
      const dossierMaterial = await rootMaterial(page.locator('.iw-dossier-content'), 'rgb(10, 36, 28)');
      const noteMaterial = await rootMaterial(page.locator('.iw-dossier-note'), 'rgb(22, 62, 44)');
      const first = '.investigation-dossier-records > article[data-domain-record]:first-child';
      const details = page.locator(`${first} > details`), summary = details.locator(':scope > summary');
      assert.equal(await details.evaluate(node => node.open), false); assert.equal(await summary.innerText(), 'Response, interpretation and sources');
      await nativeFocus(page, summary);
      for (const [key, open] of [['Enter', true], ['Space', false], ['Enter', true]]) { await page.keyboard.press(key); assert.equal(await details.evaluate(node => node.open), open); }
      const paper = await rootMaterial(details, 'rgb(232, 228, 216)'); assert.equal(paper.foreground, 'rgb(24, 44, 50)');
      const summaryMaterial = await rootMaterial(summary, 'rgb(216, 221, 208)'); assert.equal(summaryMaterial.foreground, 'rgb(32, 58, 63)');
      assert.equal(await details.locator('h4').first().innerText(), 'Recorded response or procedural context');
      assert.ok(await details.locator('.investigation-dossier-citations a[href]').count() > 0);
      await colors(page, result, ['.iw-dossier-note span', '#investigation-dossier-heading', `${first} > details > summary`, `${first} > details > div > h4:first-child`, `${first} > details > div > p:first-of-type`], 'expanded-health-dossier');
      await summary.scrollIntoViewIfNeeded();
      observe(result, 'dossier', { route: '/health', recordId: await page.locator(first).getAttribute('data-domain-record'), material: dossierMaterial, noteMaterial, paper, summaryMaterial, nativeToggleStates: [true, false, true], externalSourcesRetained: true });
      await shot(page, result, 'expanded-dossier', `${width}: Health complete dossier with its first actual Response, interpretation and sources disclosure opened by native keyboard; surrounding green shell and preserved paper evidence are distinct.`);
      const mapButton = page.locator('.iw-surfaces').getByRole('button', { name: 'Map', exact: true }); await nativeFocus(page, mapButton); await page.keyboard.press('Enter');
      const network = '[data-workspace-route="/health"].iw-surface-map .atlas-linked-network .atlas-network';
      const node = page.locator(`${network} .iw-graph-node[data-entity-id]`).first(); await node.waitFor();
      const identity = await node.getAttribute('data-entity-id'); assert.ok(identity); await node.scrollIntoViewIfNeeded(); await node.focus(); await page.keyboard.press('Enter');
      const reader = page.locator(`${network} .atlas-evidence-popover[role="dialog"]`); await reader.waitFor(); assert.equal(await reader.getAttribute('data-selection-id'), identity);
      await page.waitForFunction(selector => document.activeElement === document.querySelector(`${selector} .atlas-reader-heading h2`), network);
      assert.equal(await reader.locator('.atlas-reader-heading h2').evaluate(node => node === document.activeElement), true);
      const paperReader = await rootMaterial(reader, 'rgb(232, 228, 216)'); assert.equal(paperReader.foreground, 'rgb(24, 44, 50)');
      const expand = reader.locator('.atlas-reader-toolbar button[aria-expanded]'); assert.equal(await expand.getAttribute('aria-expanded'), 'false');
      await nativeFocus(page, expand); await page.keyboard.press('Enter');
      await page.locator(`${network} .atlas-evidence-popover.is-expanded`).waitFor();
      assert.equal(await expand.getAttribute('aria-expanded'), 'true'); assert.ok((await reader.getAttribute('class')).split(' ').includes('is-expanded'));
      await colors(page, result, [`${network} .atlas-reader-heading h2`, `${network} .atlas-reader-summary`], 'expanded-paper-reader');
      const readerMotion = await rootMotion(page, [`${network} .atlas-evidence-popover`]);
      await reader.locator('.atlas-reader-heading h2').scrollIntoViewIfNeeded();
      await shot(page, result, 'expanded-paper-reader', `${width}: real Health linked-network entity ${identity}, selected by Enter, in its expanded floating paper reader. This is separate from the dock and dossier disclosure.`);
      const box = await reader.boundingBox(); assert.ok(box && box.x >= -1 && box.x + box.width <= viewport.width + 1 && box.y >= -1 && box.y + box.height <= viewport.height + 1, 'Expanded paper reader remains inside the CSS viewport');
      await page.keyboard.press('Escape'); await reader.waitFor({ state: 'detached' }); assert.equal(await reader.count(), 0);
      await page.waitForFunction(({ identity, network }) => document.activeElement?.getAttribute('data-entity-id') === identity || document.activeElement?.matches(`${network} .atlas-entity-search input`), { identity, network });
      const returned = await page.evaluate(() => ({ graph: document.activeElement?.getAttribute('data-entity-id'), search: document.activeElement?.matches('.atlas-entity-search input') }));
      assert.ok(returned.graph === identity || returned.search, 'Reader closes to retained graph opener or documented search fallback');
      observe(result, 'paperReader', { entityId: identity, material: paperReader, expanded: true, viewportBox: box, reducedMotion: readerMotion, escapeClosed: true, returnedFocus: returned });
      await finishRoot(page, result);
    }, { root: true });

    for (const [width, viewport] of Object.entries(VIEWPORTS)) await run(`root-independent-${width}`, viewport, async (page, result) => {
      const routes = [
        { id: 'investigations', selector: '.inv-page', heading: 'The investigation network.' },
        { id: 'leads', selector: '.inv-page', heading: 'Unresolved leads.' },
        { id: 'game-theory', selector: '.gt-page', heading: 'Test the incentives. Then test the story.' },
        { id: 'research-program', selector: '.rp-desk[aria-label="Academic investigation research program"]', heading: 'Follow a claim. Test every connection.' },
      ];
      for (const route of routes) {
        await goRootRoute(page, result, route.id); const content = page.locator(route.selector); await content.waitFor();
        await page.waitForFunction(({ selector, heading }) => document.querySelector(`${selector} h1`)?.innerText.replace(/\s+/g, ' ').trim() === heading, route);
        assert.equal(await page.locator('[data-investigation-workspace]').count(), 0);
        const wrapper = page.locator('.iw-shell-content > .min-h-full'); assert.equal(await wrapper.count(), 1);
        const material = await rootMaterial(wrapper, 'rgb(10, 36, 28)');
        const heading = content.locator('h1').first(); assert.ok(await heading.isVisible());
        const text = (await heading.innerText()).replace(/\s+/g, ' ').trim(); if (route.heading) assert.equal(text, route.heading); else assert.ok(text.length > 0);
        const interior = route.id === 'research-program' ? await rootMaterial(content, 'rgb(16, 32, 32)') : null;
        const overflow = await rootOverflow(page); await heading.scrollIntoViewIfNeeded();
        observe(result, route.id, { route: `/${route.id}`, wrapper: material, heading: text, overflow, retainedInterior: interior,
          scope: route.id === 'research-program' ? 'Only the independent wrapper changed. The unchanged #102020 research desk can cover its green wrapper, especially at 390px.' : 'Independent wrapper coverage only; route interiors and internal graphs are not exhaustively qualified.' });
        await shot(page, result, route.id, `${width}: /${route.id} real independent-route wrapper and heading${interior ? '; unchanged #102020 research-desk interior can obscure its green wrapper' : ''}. Partial wrapper coverage, not an all-interior recolor claim.`);
      }
      await finishRoot(page, result);
    }, { root: true });

    validatePlan(report.scenarios);
    alive();
    report.status = 'passed';
  } catch (error) { report.status = 'failed'; report.error = error.stack ?? error.message; }
  finally {
    // Every scenario has already attempted cleanup inside its own deadline.
    // Never re-await an unresolved close/losing task outside that bound.
    if (activeContext) { report.status = 'failed'; report.cleanupIncomplete = true; abortContext(); }
    report.finishedAt = new Date().toISOString(); report.bodyElapsedMs = Date.now() - started;
    // No synthetic screenshots or success receipt are written for unexecuted cases.
    try {
      const serialize = (key, value) => ['pending', 'signal', 'sourceFixture'].includes(key) ? undefined : value instanceof Set ? [...value].sort() : value;
      await write('report.json', `${JSON.stringify(report, serialize, 2)}\n`);
      await write('summary.md', `# Additive felt UI native review\n\nStatus: ${report.status}\nExecution SHA: ${report.commit}\nReview head: ${report.headCommit}\nBrowser: ${report.browserVersion}\n\n${report.scenarios.map(item => `- ${item.status}: ${item.name} (${item.screenshots.length} actual PNGs)`).join('\n')}\n\n${report.scope}\n${report.error ?? ''}\n`);
      const inventoryBytes = artifactInventory(artifacts, { executionSha: report.commit, headSha: report.headCommit, status: report.status });
      await write('artifacts.json', inventoryBytes);
      await verifyClosedArtifacts(artifacts, {
        names: () => readdir(folder),
        read: file => readFile(join(folder, file)),
        info: file => lstat(join(folder, file)),
      });
      assert.equal(ledger.bytes, artifacts.reduce((sum, item) => sum + item.bytes, 0));
      alive();
    } finally { signal.removeEventListener('abort', abortContext); }
  }
  const pin = file => artifacts.find(item => item.file === file);
  return { status: report.status, scenarios: report.scenarios.length, screenshots: artifacts.filter(item => item.file.endsWith('.png')).length, elapsedMs: Date.now() - started, artifactBytes: ledger.bytes, report: 'felt-ui/report.json', inventory: 'felt-ui/artifacts.json', inventorySha256: pin('artifacts.json').sha256, sha256: pin('report.json').sha256 };

}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  requireCI(); throw new Error('Use scripts/spatial-release.browser.mjs; this module never launches a browser.');
}
