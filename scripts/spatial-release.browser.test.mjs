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

test('combined release requires both original and served/offline global correction scopes',()=>{
  for(const required of ['exact-source-corrections-across-original-and-global','original-political-two-qualified-scope-holds','fieldwork-offline.html','HELD SOURCE SCOPE','Denies wrongdoing','report.scenarios.length === 8'])assert.ok(source.includes(required),required);
  assert.match(source,/for \(const offline of \[false,true\]\)/);
  assert.match(source,/#\/political\?iw_view=dossier/);
  assert.match(source,/page\.locator\('\.iw-dossier-content'\)/);
  assert.match(source,/The flows, and what they are worth/);
});

test('global correction interactions target the visible record list instead of hidden duplicate table buttons', async () => {
  const text = await readFile(new URL('./spatial-release.browser.mjs', import.meta.url), 'utf8');
  assert.ok(text.includes('page.locator(`#records [data-record=${JSON.stringify(id)}]`).click()'));
  assert.ok(text.includes("page.locator('#records [data-record=\"india-corporate-intelligence:adani\"]').click()"));
  assert.ok(text.includes("getByRole('heading', { name: new RegExp(label) }).waitFor()"));
  assert.ok(!text.includes('page.locator(`[data-record=${JSON.stringify(id)}]`).first().click()'));
});

test('new source-scope combined case covers original partner and energy readers plus served/offline upstream hold',()=>{for(const required of ['qualified-jio-and-progressive-original-global','data-jio-ownership-hold','original-energy-c040-qualified-report','progressive-upstream-hold','does not establish the upstream amount'])assert.ok(source.includes(required),required);});


test('qualified original claim capture requires every visible text line, including the heading', async () => {
  const readable = helper('textFrameIsReadable');
  const frame = { visible: true, viewport: { width: 1440, height: 1000 }, lines: [{ left: 700, top: 450, right: 1380, bottom: 475, unobscured: true }] };
  assert.equal(readable(frame), true);
  for (const patch of [{ visible: false }, { lines: [] }, { lines: [{ ...frame.lines[0], top: -1 }] }, { lines: [{ ...frame.lines[0], bottom: 1001 }] }, { lines: [{ ...frame.lines[0], unobscured: false }] }]) assert.equal(readable({ ...frame, ...patch }), false);
  const calls = [];
  let evaluations = 0;
  const heading = { evaluate: async callback => { calls.push('heading'); return frame; } };
  const qualification = { evaluate: async callback => {
    evaluations += 1;
    if (evaluations === 1) { assert.match(callback.toString(), /scrollIntoView.*block: 'center'/); return; }
    calls.push('qualification'); return frame;
  } };
  const claim = { getByRole: (role, options) => { assert.equal(role, 'heading'); assert.equal(options.exact, true); return heading; }, locator: selector => { assert.equal(selector, 'p'); return { filter: ({hasText}) => { assert.match(hasText,/Exact payment dates/); return qualification; } }; } };
  const result = {};
  const captureQualified = helper('captureQualifiedOriginalClaim', {
    readTextFrame: () => {}, textFrameIsReadable: readable,
    until: async (check, message, timeout) => { assert.match(message,/every qualification line/); assert.equal(timeout,10000); assert.equal(await check(),true); },
    capture: async (page, actualResult, name) => { assert.equal(actualResult,result); assert.equal(name,'original-energy-c040-qualified-report'); calls.push('capture'); },
  });
  await captureQualified({},result,claim);
  assert.deepEqual(calls,['heading','qualification','capture']);
  assert.deepEqual(result.qualifiedOriginalClaim,{heading:frame,qualification:frame});
  assert.ok(source.includes('await captureQualifiedOriginalClaim(page,result,claim)'));
  assert.ok(!source.includes("await claim.scrollIntoViewIfNeeded();await capture(page,result,'original-energy-c040-qualified-report')"));
});

test('text visibility samples the rendered lines without altering page styles', () => {
  const read = helper('readTextFrame');
  const rect = { left: 100, top: 200, right: 300, bottom: 220, width: 200, height: 20 };
  let target, hit = true;
  const probes = [];
  const document = {
    defaultView: { innerWidth: 1440, innerHeight: 1000, getComputedStyle: () => ({ display: 'block', visibility: 'visible', opacity: '1' }) },
    createRange: () => ({ selectNodeContents: node => { target = node; }, getClientRects: () => [rect] }),
    elementFromPoint: (x,y) => { probes.push([x,y]); return hit ? target : {}; },
  };
  const node = { ownerDocument: document, textContent: 'Exact qualified text', contains: element => element === node };
  assert.equal(read(node).lines[0].unobscured,true);
  assert.deepEqual(probes,[[130,210],[200,210],[270,210]]);
  hit = false;
  assert.equal(read(node).lines[0].unobscured,false);
});
