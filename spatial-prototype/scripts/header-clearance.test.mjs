import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const directory = await mkdtemp(join(tmpdir(), 'atlas-header-clearance-'));
after(() => rm(directory, { recursive: true, force: true }));
const outfile = join(directory, 'header.mjs');
await build({ entryPoints: ['src/headerClearance.ts'], outfile, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent' });
const { bindHeaderClearance } = await import(pathToFileURL(outfile));

function fixture() {
  let finishFonts;
  const styles = new Map(), listeners = new Map(), observed = [];
  const state = { origin: 25, headerBottom: 206.25, introHeight: 240, disconnected: false };
  const header = { getBoundingClientRect: () => ({ bottom: state.headerBottom }) };
  const intro = { get offsetHeight() { return state.introHeight; }, getBoundingClientRect: () => ({ bottom: state.origin + parseFloat(styles.get('--atlas-header-clearance')) + state.introHeight }) };
  const root = {
    querySelector: selector => selector === '.masthead' ? header : intro,
    getBoundingClientRect: () => ({ top: state.origin }),
    style: { setProperty: (name, value) => styles.set(name, value), removeProperty: name => styles.delete(name) },
  };
  const originals = Object.fromEntries(['window', 'document', 'ResizeObserver'].map(key => [key, globalThis[key]]));
  globalThis.window = { addEventListener: (name, callback) => listeners.set(name, callback), removeEventListener: (name, callback) => { assert.equal(listeners.get(name), callback); listeners.delete(name); } };
  globalThis.document = { fonts: { ready: new Promise(resolve => { finishFonts = resolve; }) } };
  globalThis.ResizeObserver = class {
    constructor(callback) { state.resize = callback; }
    observe(node) { observed.push(node); }
    disconnect() { state.disconnected = true; }
  };
  return { root, header, intro, state, styles, listeners, observed, finishFonts, restore: () => { for (const [key, value] of Object.entries(originals)) { if (value === undefined) delete globalThis[key]; else globalThis[key] = value; } } };
}

test('header clearance uses root-relative measured bounds and updates after wrapping, intro visibility, resize and fonts', async () => {
  const f = fixture();
  const dispose = bindHeaderClearance(f.root);
  try {
    assert.equal(f.styles.get('--atlas-header-clearance'), '194px');
    assert.equal(f.styles.get('--atlas-intro-clearance'), '446px');
    assert.deepEqual(f.observed, [f.root, f.header, f.intro]);
    f.state.headerBottom = 257.75;
    f.state.resize();
    assert.equal(f.styles.get('--atlas-header-clearance'), '245px');
    assert.equal(f.styles.get('--atlas-intro-clearance'), '497px');
    f.state.introHeight = 0;
    f.state.origin = 50;
    f.listeners.get('resize')();
    assert.equal(f.styles.get('--atlas-header-clearance'), '220px');
    assert.equal(f.styles.get('--atlas-intro-clearance'), '0px');
    f.state.headerBottom = 190;
    f.finishFonts();
    await Promise.resolve();
    assert.equal(f.styles.get('--atlas-header-clearance'), '152px');
  } finally { dispose(); f.restore(); }
});

test('cleanup removes callbacks and measurements; late fonts and observer callbacks cannot write after unmount', async () => {
  const f = fixture();
  try {
    const dispose = bindHeaderClearance(f.root);
    dispose();
    assert.equal(f.state.disconnected, true);
    assert.equal(f.listeners.size, 0);
    assert.equal(f.styles.size, 0);
    f.state.resize();
    f.finishFonts();
    await Promise.resolve();
    assert.equal(f.styles.size, 0);
    const disposeAgain = bindHeaderClearance(f.root);
    assert.equal(f.styles.get('--atlas-header-clearance'), '194px');
    disposeAgain();
  } finally { f.restore(); }
});

test('shared measured clearance preserves scroll and camera/dock reservations without scene changes', async () => {
  const app = await readFile('src/App.tsx', 'utf8');
  const css = await readFile('src/styles.css', 'utf8');
  assert.match(app, /useLayoutEffect\(\(\) => bindHeaderClearance\(appRef\.current!\), \[\]\)/);
  assert.match(app, /<main\s+ref=\{appRef\}/);
  assert.match(css, /--atlas-header-clearance: 200px/);
  assert.match(css, /\.reading-surface,[\s\S]*?\.room-caption,[\s\S]*?\.evidence-inspector,[\s\S]*?top: var\(--atlas-header-clearance\)/);
  assert.match(css, /--atlas-overview-top: max\(var\(--atlas-header-clearance\), var\(--atlas-intro-clearance\)\)/);
  assert.match(css, /\.scene-overview, \.is-exploring \.scene-overview \{\s*max-width: min\(320px, calc\(100% - 90px\)\)/);
  assert.match(css, /calc\(100% - var\(--atlas-overview-top\) - 130px\)\);\s*overflow: auto/);
  assert.match(css, /\.reading-surface \{[\s\S]*?overflow: auto/);
  assert.match(css, /\.camera-tools \{[\s\S]*?bottom: 108px/);
  assert.match(css, /\.bottom-dock \{[\s\S]*?bottom: 39px/);
});

test('combined CI records failing geometry before unchanged overlap assertion and adds wrapped/effective viewport cases', async () => {
  const source = await readFile('../scripts/spatial-release.browser.mjs', 'utf8');
  const start = source.indexOf('async function atlasActivityNavigation');
  const end = source.indexOf('async function exerciseActivityKeyboard');
  const scope = source.slice(start, end);
  assert.ok(scope.indexOf('result.atlasNavigationLayouts ??=') < scope.indexOf('assert.ok(frame.header?.visible'));
  assert.match(scope, /surface\.top >= frame\.header\.bottom \|\| surface\.bottom <= frame\.header\.top/);
  assert.match(scope, /getBoundingClientRect/);
  assert.match(scope, /wrapped-navigation-text/);
  assert.match(scope, /200-percent-effective-viewport/);
  assert.match(scope, /setViewportSize\(\{ width: 720, height: 500 \}\)/);
  assert.match(scope, /scroll\.content > scroll\.height && scroll\.top > 0/);
  assert.match(source, /process\.env\.GITHUB_ACTIONS !== 'true'/);
});

test('combined overlap guard still rejects both reported failures and preserves each measured frame', async () => {
  const source = await readFile('../scripts/spatial-release.browser.mjs', 'utf8');
  const start = source.indexOf('async function atlasActivityNavigation');
  const end = source.indexOf('async function exerciseAtlasHeaderClearance');
  const check = new Function('assert', `return ${source.slice(start, end)}`)(assert);
  for (const [mode, width, header, surface] of [
    ['reading', 1440, { left: 25, right: 515, top: 23, bottom: 181 }, { left: 340, right: 1310, top: 166, bottom: 870 }],
    ['status', 390, { left: 12, right: 187, top: 12, bottom: 177 }, { left: 12, right: 332, top: 174, bottom: 400 }],
  ]) {
    const frame = { viewport: { width, height: 1000 }, header: { ...header, visible: true }, link: { visible: true, left: 30, right: 150, top: 100, bottom: 124, width: 120, height: 24 }, linkHit: true, [mode]: { ...surface, visible: true } };
    let calls = 0;
    const page = { evaluate: async () => ++calls === 1 ? undefined : frame };
    const result = {};
    await assert.rejects(check(page, result, mode), /header must not overlap/);
    assert.equal(result.atlasNavigationLayouts.length, 1);
    assert.deepEqual(result.atlasNavigationLayouts[0], { mode, phase: 'initial', ...frame });
  }
});

// These dependency-free guard tests exercise the CI assertions with explicit
// geometry. They do not claim browser/layout verification or launch Chromium.
async function browserHelper(name, dependencies = {}) {
  const source = await readFile('../scripts/spatial-release.browser.mjs', 'utf8');
  const match = source.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n\\}`));
  assert.ok(match, `Missing browser helper ${name}`);
  return new Function(...Object.keys(dependencies), `${match[0]}; return ${name};`)(...Object.values(dependencies));
}
const rect = (left, top, right, bottom, extras = {}) => ({ left, top, right, bottom, width: right - left, height: bottom - top, visible: true, hit: true, ...extras });
function lowerPanelFrame() {
  return {
    viewport: { width: 1440, height: 1000 }, header: rect(25, 23, 454.90625, 210),
    link: rect(105, 145, 197, 169), linkHit: true, intro: null, overlays: [],
    status: rect(40, 528, 360, 687), legend: rect(25, 699, 307, 870),
    buildingToggle: rect(1293, 80, 1415, 116), camera: rect(1332, 619, 1415, 892), dock: rect(375.5, 903, 1064.5, 961),
  };
}
async function inspectFrame(check, frame, result = {}, mode = 'status') {
  let calls = 0;
  await check({ evaluate: async () => ++calls === 1 ? undefined : frame }, result, mode, 'lower-panel-regression');
  return result;
}

test('lower-panel CSS partitions wrapped status and legend with independent scrolling and reserves the mobile buildings control', async () => {
  const css = await readFile('src/styles.css', 'utf8');
  assert.match(css, /\.scene-overview, \.legend \{ scroll-padding-block: 12px; \}/);
  assert.match(css, /max-height: max\(0px, calc\(\(100% - var\(--atlas-overview-top\) - 130px\) \/ 2 - 12px\)\)/);
  assert.match(css, /\.legend \{\s*bottom: 130px;\s*max-height: max\(0px, calc\(\(100% - var\(--atlas-overview-top\) - 130px\) \/ 2\)\);\s*overflow: auto/);
  assert.match(css, /\.city-toggle \{ height: 36px; \}/);
  assert.match(css, /max-height: max\(0px, calc\(100% - var\(--atlas-overview-top\) - 123px - 36px - 12px\)\)/);
  // Arithmetic checks of the CSS contract, seeded by exact-head measured tops.
  for (const [height, top] of [[1000, 528], [1000, 499], [851, 528], [768, 193]]) {
    const slot = (height - top - 130) / 2;
    const statusBottom = top + slot - 12, legendTop = height - 130 - slot;
    assert.equal(legendTop - statusBottom, 12);
    assert.ok(slot - 12 >= 24, 'The status action retains room even with a wrapped header');
    assert.ok(height - 130 < height - 97, 'The panel reservation remains above the desktop dock');
  }
  assert.equal(500 - 202 - 123 - 36 - 12, 127);
});

test('extended geometry guard rejects the observed legend collision, buildings collision and blocked reader hit tests before capture', async () => {
  const check = await browserHelper('atlasActivityNavigation', { assert });
  await inspectFrame(check, lowerPanelFrame());
  for (const [name, change, message] of [
    ['legend over status', f => { f.status.bottom = 818.71875; f.status.height = 290.71875; f.legend = rect(25, 692, 307, 896); }, /status surface must not overlap the legend/],
    ['buildings over status', f => { f.buildingToggle = rect(14, 641, 119, 677); }, /status surface must not overlap the buildings toggle/],
    ['legend blocked', f => { f.legend.hit = false; }, /legend must fit.*hit-testable/],
    ['buildings blocked', f => { f.buildingToggle.hit = false; }, /buildings toggle must fit.*hit-testable/],
    ['status blocked', f => { f.status.hit = false; }, /status surface must be hit-testable/],
    ['reader blocked', f => { f.reading = rect(340, 222, 1310, 870, { hit: false }); f.legend.visible = false; f.buildingToggle.visible = false; f.camera.visible = false; }, /reading surface must be hit-testable/],
  ]) {
    const frame = lowerPanelFrame(), result = {};
    change(frame);
    await assert.rejects(inspectFrame(check, frame, result, name.startsWith('reader') ? 'reading' : 'status'), message, name);
    assert.equal(result.atlasNavigationLayouts.length, 1, `${name}: retain diagnostics before throwing`);
    assert.equal(result.atlasNavigationLayouts[0].phase, 'lower-panel-regression');
  }
  const mobile = lowerPanelFrame();
  Object.assign(mobile, { viewport: { width: 720, height: 500 }, header: rect(18, 18, 193, 189.59375), link: rect(31, 128.59375, 180, 152.59375), status: rect(12, 202, 332, 329), legend: null, buildingToggle: rect(14, 341, 119, 377), camera: rect(659, 84, 708, 380), dock: rect(172.5, 396, 547.5, 462) });
  await inspectFrame(check, mobile);
  mobile.status = rect(12, 202, 332, 370);
  await assert.rejects(inspectFrame(check, mobile), /status surface must not overlap the buildings toggle/);
});

test('actual-action guard rejects card-top-only, obscured and unfocused evidence and retains failed diagnostics', async () => {
  const readable = await browserHelper('textFrameIsReadable');
  const captures = [];
  const check = await browserHelper('captureAtlasAction', { assert, readTextFrame: () => {}, textFrameIsReadable: readable, capture: async (_page, _result, phase) => captures.push(phase) });
  const sample = () => ({
    frame: { text: 'Inspect evidence', target: rect(40, 290, 315, 310), surface: rect(15, 202, 650, 375), hit: true, scrollTop: 214, focused: true },
    text: { visible: true, viewport: { width: 720, height: 500 }, lines: [{ left: 40, top: 290, right: 130, bottom: 310, unobscured: true }] },
  });
  for (const [name, change, message] of [
    ['card tops alone', s => { s.frame.target = rect(40, 480, 315, 500); }, /actual action must fit inside its scrollport/],
    ['covered action', s => { s.frame.hit = false; }, /every action text line must be visible and hit-testable/],
    ['covered line', s => { s.text.lines[0].unobscured = false; }, /every action text line must be visible and hit-testable/],
    ['focus lost', s => { s.frame.focused = false; }, /keyboard focus must remain on the action/],
  ]) {
    const state = sample(), result = {}; let calls = 0;
    change(state);
    await assert.rejects(check({}, result, { evaluate: async () => ++calls === 1 ? state.frame : state.text }, name, true), message);
    assert.equal(result.atlasActionReachability.length, 1);
    assert.equal(captures.length, 0, 'Invalid action geometry must not be presented as a successful capture');
  }
  const state = sample(), result = {}; let calls = 0;
  const returned = await check({}, result, { evaluate: async () => ++calls === 1 ? state.frame : state.text }, 'keyboard-inspect', true);
  assert.equal(returned.scrollTop, 214);
  assert.deepEqual(captures, ['atlas-keyboard-inspect']);
});

test('combined CI captures actual inspect actions and follows keyboard focus through Enter to matching evidence', async () => {
  const source = await readFile('../scripts/spatial-release.browser.mjs', 'utf8');
  for (const check of ['legend: sample(', 'buildingToggle: sample(', 'exerciseAtlasStatusAction(page, result', '200-percent-effective-viewport-inspect-action', '200-percent-effective-viewport-keyboard-inspect', "await page.keyboard.press('ArrowDown')", "await page.keyboard.press('Enter')", 'pointerFrame.scrollTop > 0', 'keyboardFrame.scrollTop > 0', 'Enter on the keyboard-reached record must open the matching evidence', 'atlasActionReachability', 'atlasReaderKeyboard']) assert.ok(source.includes(check), check);
  assert.match(source, /await reader\.locator\('\.reader-tabs button'\)\.last\(\)\.focus\(\);\s*await page\.keyboard\.press\('Tab'\);\s*await focused\(page, selector\)/);
  assert.match(source, /steps < 24/);
  assert.match(source, /getAttribute\('open'\), ''/);
  assert.ok(source.indexOf("process.env.GITHUB_ACTIONS !== 'true'") < source.indexOf("await import('playwright')"));
});
