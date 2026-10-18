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

function clearanceSample(patch = {}) {
  const sample = {};
  for (const name of ['root', 'header', 'reading', 'status']) {
    sample[`${name}Present`] = 1;
    for (const edge of ['Top', 'Bottom', 'Left', 'Right']) sample[name + edge] = 0;
  }
  return { ...sample, headerBottom: 210, readingTop: 193, clearanceValid: 1, clearancePx: 222, ...patch };
}
function clearanceHarness(samples, { frameMs = 16, afterRead = () => {}, pendingRead = false, framePending = false, cleanupTime } = {}) {
  let time = 0, reads = 0, frames = 0, timer, resolvePending;
  const readAtlasHeaderClearance = () => {}, nextAtlasHeaderFrame = () => {};
  const result = {};
  const page = { evaluate: async callback => {
    if (callback === readAtlasHeaderClearance) {
      reads += 1;
      if (pendingRead) return new Promise(resolve => { resolvePending = resolve; });
      const sample = typeof samples === 'function' ? samples(reads) : samples[Math.min(reads - 1, samples.length - 1)];
      afterRead(reads, value => { time = value; }); return sample;
    }
    assert.equal(callback, nextAtlasHeaderFrame); frames += 1; time += frameMs;
    if (framePending) return new Promise(resolve => { resolvePending = resolve; });
  } };
  const settle = helper('settleAtlasHeaderClearance', { assert, readAtlasHeaderClearance, nextAtlasHeaderFrame,
    performance: { now: () => time }, setTimeout: (callback, milliseconds) => { timer = { callback, milliseconds }; return 1; }, clearTimeout: () => { timer = undefined; if (cleanupTime !== undefined) time = cleanupTime; } });
  return { result, run: () => settle(page, result, 'reading', 'portable'), counts: () => ({ reads, frames }),
    measurement: () => result.atlasHeaderClearanceSettlements[0].measurement,
    expire: () => { assert.equal(timer.milliseconds, 1000); time = 1000; timer.callback(); },
    release: value => resolvePending(value), timerCleared: () => timer === undefined };
}

test('clearance readiness preserves initial geometry and requires two frame-separated exact stable samples', async () => {
  const h = clearanceHarness([clearanceSample({ clearancePx: 193 }), clearanceSample(), clearanceSample()]);
  await h.run();
  assert.deepEqual(h.counts(), { reads: 3, frames: 2 });
  const record = h.measurement();
  assert.equal(record.samples[0].readingTop, 193); assert.equal(record.samples[0].headerBottom, 210); assert.equal(record.samples[0].rootTop, 0);
  assert.equal(record.samples[0].clearancePx, 193); assert.equal(record.elapsedMs, 32); assert.equal(record.settled, 1);
  assert.equal(record.samples.length, 3); assert.equal(record.limitMs, 1000); assert.equal(record.maxSamples, 64);
  for (const row of record.samples) assert.ok(Object.values(row).every(Number.isFinite));
  assert.equal(h.timerCleared(), true);
});

test('clearance readiness resets on mismatch or changed raw geometry within the same ceil bucket', async () => {
  for (const [samples, expectedReads] of [
    [[clearanceSample(), clearanceSample({ clearancePx: 193 }), clearanceSample(), clearanceSample()], 4],
    [[clearanceSample({ headerBottom: 210.1, clearancePx: 223 }), clearanceSample({ headerBottom: 210.2, clearancePx: 223 }), clearanceSample({ headerBottom: 210.2, clearancePx: 223 })], 3],
    [[clearanceSample({ rootTop: 0.1 }), clearanceSample({ rootTop: 0.2 }), clearanceSample({ rootTop: 0.2 })], 3],
  ]) {
    const h = clearanceHarness(samples); await h.run(); assert.equal(h.counts().reads, expectedReads);
  }
  const fraction = clearanceHarness([clearanceSample({ rootTop: 25.5, headerBottom: 206.25, clearancePx: 193 })]);
  await fraction.run(); assert.equal(fraction.counts().reads, 2);
});

test('permanent stale, oversized, missing or invalid clearance fails the absolute deadline without polling acceptance assertions', async () => {
  for (const patch of [{ clearancePx: 193 }, { clearancePx: 9999 }, { clearanceValid: 0 }, { rootPresent: 0 }, { headerPresent: 0 }]) {
    const h = clearanceHarness([clearanceSample(patch)], { frameMs: 20 });
    await assert.rejects(h.run(), /exceeded 1000 ms/);
    assert.equal(h.measurement().settled, 0); assert.equal(h.measurement().samples.length, 50);
    assert.equal(h.measurement().elapsedMs, 1000); assert.equal(h.timerCleared(), true);
  }
});

test('late matching evaluate results fail before being accepted or appended as timely observations', async () => {
  const h = clearanceHarness([clearanceSample()], { afterRead: (read, advance) => { if (read === 2) advance(1001); } });
  await assert.rejects(h.run(), /exceeded 1000 ms/);
  assert.equal(h.measurement().settled, 0); assert.equal(h.measurement().samples.length, 1);
  assert.equal(h.measurement().elapsedMs, 1001); assert.deepEqual(h.counts(), { reads: 2, frames: 1 });
});

test('stalled evaluate and frame promises are bounded and late completion cannot mutate settled records or continue sampling', async () => {
  for (const options of [{ pendingRead: true }, { framePending: true, frameMs: 0 }]) {
    const h = clearanceHarness([clearanceSample({ clearancePx: 193 })], options), pending = h.run();
    await Promise.resolve(); await Promise.resolve();
    const rejected = assert.rejects(pending, /exceeded 1000 ms/);
    h.expire(); await rejected;
    const saved = JSON.stringify(h.measurement()), counts = h.counts();
    h.release(clearanceSample()); await Promise.resolve(); await Promise.resolve();
    assert.equal(JSON.stringify(h.measurement()), saved); assert.deepEqual(h.counts(), counts);
    assert.equal(h.measurement().settled, 0); assert.equal(h.timerCleared(), true);
  }
});

test('the 64-sample ceiling counts the first observation and never requests sample 65', async () => {
  const h = clearanceHarness([clearanceSample({ clearancePx: 193 })], { frameMs: 0 });
  await assert.rejects(h.run(), /exceeded 64 samples/);
  assert.deepEqual(h.counts(), { reads: 64, frames: 63 }); assert.equal(h.measurement().samples.length, 64);
  assert.equal(h.measurement().elapsedMs, 0); assert.equal(h.measurement().settled, 0); assert.equal(h.timerCleared(), true);
});

test('numeric observation validation rejects nonfinite data without leaking strings or unbounded fields into records', async () => {
  for (const patch of [{ rootTop: NaN }, { headerBottom: Infinity }, { clearancePx: '222px' }, { rootPresent: undefined }]) {
    const h = clearanceHarness([clearanceSample(patch)]);
    await assert.rejects(h.run(), /Invalid numeric clearance observation/);
    assert.equal(h.measurement().samples.length, 0); assert.equal(h.measurement().settled, 0);
  }
  const h = clearanceHarness([clearanceSample({ ignoredText: 'not retained' })]);
  await h.run(); assert.equal('ignoredText' in h.measurement().samples[0], false);
});

test('DOM sampler strictly parses pixel clearance and only reads bounded numeric rectangles', () => {
  let css = '222px', missing = false;
  const box = { top: 0, bottom: 210, left: 0, right: 455 };
  const sample = helper('readAtlasHeaderClearance', { document: { querySelector: () => missing ? null : { getBoundingClientRect: () => box } }, getComputedStyle: () => ({ getPropertyValue: () => css }) });
  assert.equal(sample().clearancePx, 222);
  for (const invalid of ['', 'auto', '222garbage', '222px trailing', '222%', 'NaNpx', 'Infinitypx', 'calc(222px)', '222.px', '+222.px', '-222.px', '0222.px', '+0222.px', '-0222.px', '.px', '+.px', '222..0px']) {
    css = invalid; const result = sample(); assert.equal(result.clearanceValid, 0); assert.equal(result.clearancePx, 0);
    assert.ok(Object.values(result).every(Number.isFinite));
  }
  css = ' 193.25px '; assert.equal(sample().clearancePx, 193.25);
  missing = true; assert.equal(sample().rootPresent, 0); assert.equal(sample().headerPresent, 0); assert.equal(sample().clearanceValid, 0);
  missing = false; box.bottom = NaN; assert.equal(sample().headerPresent, 0); assert.equal(sample().headerBottom, 0);
});

test('frame separation uses requestAnimationFrame and settlement cannot poll geometry acceptance or mutate product styles', async () => {
  let callback, completed = false;
  const frame = helper('nextAtlasHeaderFrame', { requestAnimationFrame: next => { callback = next; } });
  const pending = frame().then(() => { completed = true; }); await Promise.resolve(); assert.equal(completed, false);
  callback(); await pending; assert.equal(completed, true);
  const begin = source.indexOf('// BEGIN REVIEWED ATLAS HEADER SETTLEMENT'), end = source.indexOf('// END REVIEWED ATLAS HEADER SETTLEMENT');
  const block = source.slice(begin, end);
  assert.doesNotMatch(block, /elementFromPoint|style\.setProperty|scrollIntoView|assertAtlas|surface\.hit|surface\.top/);
  const navigation = source.slice(source.indexOf('async function atlasActivityNavigation'), source.indexOf('async function exerciseAtlasHeaderClearance'));
  assert.equal(navigation.split('await settleAtlasHeaderClearance(page, result, mode, phase);').length - 1, 1);
  assert.ok(navigation.indexOf('await settleAtlasHeaderClearance') < navigation.indexOf('const frame = await page.evaluate'));
  assert.equal(navigation.split('The atlas header must not overlap').length - 1, 1);
  assert.match(source, /scenario exceeded 150 seconds.*150000/);
});


test('a result reaching the deadline during final timer cleanup is rejected, while the 64th timely stable sample is allowed', async () => {
  const late = clearanceHarness([clearanceSample()], { cleanupTime: 1000 });
  await assert.rejects(late.run(), /exceeded 1000 ms/);
  assert.equal(late.measurement().settled, 0); assert.equal(late.measurement().elapsedMs, 1000); assert.equal(late.timerCleared(), true);
  const samples = Array.from({ length: 64 }, (_, index) => clearanceSample({ clearancePx: index < 62 ? 193 : 222 }));
  const bounded = clearanceHarness(samples, { frameMs: 1 }); await bounded.run();
  assert.deepEqual(bounded.counts(), { reads: 64, frames: 63 }); assert.equal(bounded.measurement().settled, 1); assert.equal(bounded.measurement().elapsedMs, 63);
});

test('only the exact synthetic wrapped phase invokes settlement and every other current phase preserves the original two evaluations', async () => {
  const expressions = [...new Set([...source.matchAll(/await atlasActivityNavigation\(page, result, '(?:reading|status)'(?:, ([^\n]+?))?\);/g)].map(match => match[1] ?? '<default>'))].sort();
  assert.deepEqual(expressions, ["'200-percent-effective-viewport'", "'viewport-restored'", "'wrapped-navigation-text'", '<default>', '`${phase}-legend-expanded`', '`${phase}-status-scrolled`'].sort());
  const statusPhases = [...source.matchAll(/await exerciseAtlasStatusAction\(page, result, '([^']+)'\);/g)].map(match => match[1]);
  assert.deepEqual(statusPhases, ['wrapped-header', '200-percent-effective-viewport']);
  const otherPhases = ['initial', '200-percent-effective-viewport', 'viewport-restored', ...statusPhases.flatMap(phase => [`${phase}-status-scrolled`, `${phase}-legend-expanded`]), undefined, '', 'wrapped-navigation-text-extra', 'wrapped-navigation-text '];
  const rect = (left, top, right, bottom) => ({ left, top, right, bottom, width: right - left, height: bottom - top, visible: true, hit: true });
  const frame = { viewport: { width: 1440, height: 1000 }, header: rect(25, 23, 455, 210), link: rect(105, 145, 197, 169), linkHit: true,
    reading: rect(340, 222, 1310, 870), status: rect(40, 528, 360, 687), intro: null, overlays: [], dock: rect(375, 903, 1065, 961), camera: null, legend: null, buildingToggle: null };
  for (const mode of ['reading', 'status']) for (const phase of [...otherPhases, 'wrapped-navigation-text']) {
    const events = [], result = {};
    const check = helper('atlasActivityNavigation', { assert, settleAtlasHeaderClearance: async (page, actualResult, actualMode, actualPhase) => {
      assert.equal(actualResult, result); assert.equal(actualMode, mode); assert.equal(actualPhase, 'wrapped-navigation-text'); events.push('settlement');
    } });
    await check({ evaluate: async callback => {
      if (callback.toString().includes('document.fonts.ready')) { events.push('fonts-and-two-frames'); return; }
      events.push('final-assertion-frame'); return frame;
    } }, result, mode, phase);
    assert.deepEqual(events, phase === 'wrapped-navigation-text' ? ['fonts-and-two-frames', 'settlement', 'final-assertion-frame'] : ['fonts-and-two-frames', 'final-assertion-frame']);
    assert.equal(result.atlasNavigationLayouts.length, 1);
    assert.equal(result.atlasNavigationLayouts[0].phase, phase === undefined ? 'initial' : phase);
  }
});

test('malformed decimal dimensions fail both the real sampler and complete readiness helper even when their numeric prefix would exactly match', async () => {
  const cases = [['222.px', 222], ['+222.px', 222], ['-222.px', -222], ['0222.px', 222], ['+0222.px', 222], ['-0222.px', -222], ['000.px', 0], ['+000.px', 0], ['-000.px', 0], ['.px', 222], ['+.px', 222], ['222..0px', 222], ['222. px', 222], ['222pxpx', 222]];
  for (const [css, expected] of cases) {
    const sample = helper('readAtlasHeaderClearance', {
      document: { querySelector: selector => ({ getBoundingClientRect: () => selector === '.evidence-app'
        ? { top: 0, bottom: 1000, left: 0, right: 1440 }
        : { top: expected - 112, bottom: expected - 12, left: 25, right: 455 } }) },
      getComputedStyle: () => ({ getPropertyValue: () => css }),
    });
    assert.equal(Math.ceil(sample().headerBottom - sample().rootTop) + 12, expected, css);
    assert.equal(sample().clearanceValid, 0, css);
    const h = clearanceHarness(() => sample(), { frameMs: 20 });
    await assert.rejects(h.run(), /exceeded 1000 ms/, css);
    assert.equal(h.measurement().settled, 0, css); assert.equal(h.measurement().samples.length, 50, css);
    assert.ok(h.measurement().samples.every(row => row.clearanceValid === 0), css);
  }
});
