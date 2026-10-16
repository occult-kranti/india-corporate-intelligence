import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const exec = promisify(execFile);
const script = fileURLToPath(new URL('./spatial-release.browser.mjs', import.meta.url));
const source = await readFile(script, 'utf8');
// Exercise the runner's dependency-free helpers without importing its CI-only
// entry point or loading Playwright. No browser or DOM implementation is used.
function helper(name, dependencies = {}) {
  const match = source.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n\\}`));
  assert.ok(match, `Missing runner helper ${name}`);
  return new Function(...Object.keys(dependencies), `${match[0]}; return ${name};`)(...Object.values(dependencies));
}

function readyFrame(width = 1440, height = 1000) {
  const rect = { x: 0, y: 0, width, height, right: width, bottom: height, visible: true };
  return {
    viewport: { width, height }, host: { ...rect }, canvas: { ...rect },
    canvasWidth: width, canvasHeight: height, renderer: 'maplibre-three-mercator',
    drawCalls: 20, countryBaseFeatures: 177,
  };
}

test('combined browser runner parses without running a browser', async () => {
  const result = await exec(process.execPath, ['--check', script]);
  assert.equal(result.stderr, '');
});

test('combined browser runner refuses local invocation before importing Playwright or reading output', async () => {
  for (const [GITHUB_ACTIONS, SPATIAL_RELEASE_REVIEW] of [['false', 'github-actions'], ['true', ''], ['', '']]) {
    await assert.rejects(exec(process.execPath, [script], { env: { ...process.env, GITHUB_ACTIONS, SPATIAL_RELEASE_REVIEW } }), error => {
      assert.match(error.stderr, /restricted to GitHub Actions\. No local browser was launched/);
      assert.doesNotMatch(error.stderr, /ERR_MODULE_NOT_FOUND|Executable doesn't exist|ENOENT/);
      return true;
    });
  }
});

test('release review covers real cross-app clicks, back navigation, immutable data and preserved workspaces', async () => {
  assert.ok(source.indexOf("process.env.GITHUB_ACTIONS !== 'true'") < source.indexOf("await import('playwright')"));
  for (const check of ['await link.click()', 'await original.click()', 'await back.click()', 'await page.goBack(', 'global-workbench/finance.html', 'global-workbench/media.html', 'expectedData', 'verifiedRegistryPaths', 'contentType', 'data-registry-state="ready"', 'page.screenshot(']) assert.ok(source.includes(check), check);
  assert.match(source, /sha256/);
  assert.match(source, /Missing assets must not receive index\.html/);
  assert.match(source, /assert\.match\(await page\.locator\('\.masthead'\)\.innerText\(\), \/Complete original registry\.\*retained snapshot\/s\)/);
});

test('source-route fixtures use retained finance and energy destinations without rewriting records', () => {
  const select = helper('retainedSourceRouteItems', { assert });
  const row = (id, route, extras = {}) => Object.freeze({ id, route, sourceIds: Object.freeze(['source:1']), status: 'documented', ...extras });
  const finance = row('entity:finance', '/finance');
  const energy = row('record:energy', '/energy');
  const registry = Object.freeze({
    held: Object.freeze([{ id: 'held:finance' }]),
    entities: Object.freeze([row('held:finance', '/finance'), row('undrawn:finance', '/finance', { status: 'not-drawn' }), row('uncited:finance', '/finance', { sourceIds: [] }), finance]),
    records: Object.freeze([energy]),
  });
  const before = JSON.stringify(registry);
  const selected = select(registry);
  assert.deepEqual(selected.map(item => item.route), ['/finance', '/energy']);
  assert.equal(selected[0], finance);
  assert.equal(selected[1], energy);
  assert.equal(JSON.stringify(registry), before);
  assert.throws(() => select({ ...registry, records: [] }), /No retained source-backed test item at \/energy/);
  assert.doesNotMatch(source, /international-finance/);
  assert.ok(source.includes('await rootReady(page, item.route)'));
  assert.ok(source.includes('retainedRoute: item.route, url: page.url()'));
});

test('map capture readiness accepts desktop/mobile visible geometry and rejects empty or hidden frames', () => {
  const ready = helper('mapViewportIsReady');
  assert.equal(ready(readyFrame()), true);
  assert.equal(ready(readyFrame(390, 844)), true);
  for (const [name, change] of [
    ['country geometry not populated', frame => { frame.countryBaseFeatures = 0; }],
    ['no completed map draw', frame => { frame.drawCalls = 0; }],
    ['wrong renderer', frame => { frame.renderer = undefined; }],
    ['missing host', frame => { frame.host = null; }],
    ['missing canvas', frame => { frame.canvas = null; }],
    ['hidden host', frame => { frame.host.visible = false; }],
    ['hidden canvas', frame => { frame.canvas.visible = false; }],
    ['empty canvas', frame => { frame.canvasWidth = 0; }],
    ['tiny host width', frame => { frame.host.width = 100; }],
    ['tiny host height', frame => { frame.host.height = 100; }],
    ['off-screen host', frame => { frame.host.x = -30; }],
    ['host overflows viewport', frame => { frame.host.right += 30; }],
    ['canvas too small', frame => { frame.canvas.width -= 100; }],
    ['canvas offset from host', frame => { frame.canvas.y += 100; }],
  ]) {
    const frame = readyFrame();
    change(frame);
    assert.equal(ready(frame), false, name);
  }
});

test('both full-map screenshots wait for geometry and record the final viewport evidence', async () => {
  const readiness = helper('mapViewportIsReady');
  const frames = [{ ...readyFrame(), countryBaseFeatures: 0 }, readyFrame()];
  let evaluations = 0;
  const result = {};
  const captures = [];
  const readMapViewport = () => {};
  const page = { evaluate: async callback => { assert.equal(callback, readMapViewport); return frames[evaluations++]; } };
  const captureFullMap = helper('captureFullMap', {
    readMapViewport, mapViewportIsReady: readiness,
    until: async (check, message, timeout) => {
      assert.equal(timeout, 60000);
      assert.match(message, /populated country base.*viewport-sized/);
      assert.equal(await check(), false);
      assert.deepEqual(captures, []);
      assert.equal(await check(), true);
    },
    capture: async (actualPage, actualResult, name) => {
      assert.equal(actualPage, page);
      assert.equal(actualResult, result);
      assert.equal(evaluations, 2);
      captures.push(name);
    },
  });
  await captureFullMap(page, result, 'ready-map');
  assert.deepEqual(captures, ['ready-map']);
  assert.deepEqual(result.mapCaptures, [{ capture: 'ready-map', ...frames[1] }]);
  for (const name of ['full-registry-default', 'browser-back-to-complete-spatial']) {
    assert.ok(source.includes(`await captureFullMap(page, result, '${name}')`));
    assert.ok(!source.includes(`await capture(page, result, '${name}')`));
  }
});

test('activity navigation and four simple groups are additive CI requirements', async () => {
  const layout = await readFile(new URL('../src/components/Layout.tsx', import.meta.url), 'utf8');
  assert.match(layout, /BASE_URL}research-activity\//);
  assert.match(layout, /<span>Research activity<\/span>/);
  for (const relative of ['../.github/workflows/deploy.yml','../.github/workflows/spatial-release-review.yml']) {
    const workflow = await readFile(new URL(relative, import.meta.url), 'utf8');
    assert.match(workflow, /node --test scripts\/spatial-release-validate.test.mjs scripts\/spatial-release.browser.test.mjs scripts\/research-activity\/\*.test.mjs/);
    assert.match(workflow, /node scripts\/spatial-release.browser.mjs/);
  }
});
