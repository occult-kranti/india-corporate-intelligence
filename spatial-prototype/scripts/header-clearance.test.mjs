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
