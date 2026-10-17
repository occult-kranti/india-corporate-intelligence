// Portable, synthetic-only tests. No DOM engine, app bundle, or browser is run.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {expectedPercent, authoredPercent, observeCoordinate, assertCoordinateObservation,
  assertWorldCoordinate, RAW_PERCENT_LIMIT, CENTER_ALIGNMENT_LIMIT_CSS_PX} from '../scripts/world-coordinate-oracle.mjs';
import {coordinateFailureSnapshot, coordinateFailureEnvelope} from '../scripts/world-coordinate-diagnostic.mjs';
import {failureDiagnostic} from '../scripts/failure-diagnostic.mjs';

const anchors = JSON.parse(readFileSync(new URL('../data/anchors.json', import.meta.url))).anchors;
// Independently calculated decimal references; no application or oracle helper.
const references = [
  [28.60658265277777777778, 28.38623629444444444444],
  [29.00099490833333333333, 26.15496543333333333333],
  [31.98915640277777777778, 39.96676782777777777778],
];
const serializeMock = value => `${Number(value.toFixed(6))}%`;
const grid = value => Math.floor(value * 64) / 64;
function style(patch = {}) {
  return {position: 'relative', direction: 'ltr', borderLeftWidth: '0px', borderRightWidth: '0px',
    borderTopWidth: '0px', borderBottomWidth: '0px', paddingLeft: '0px', paddingRight: '0px',
    paddingTop: '0px', paddingBottom: '0px', marginLeft: '0px', marginRight: '0px',
    marginTop: '0px', marginBottom: '0px', transform: 'none', translate: 'none', rotate: 'none',
    scale: 'none', perspective: 'none', zoom: '1', offsetPath: 'none', animationName: 'none',
    transitionDuration: '0s', width: '24px', height: '24px', overflowX: 'visible', overflowY: 'visible', ...patch};
}
function fixture(x, y, {width = 1200, height = 600, left = -315.25, top = 73.125} = {}) {
  return {
    rawStyle: `left:${x}%;top:${y}%`,
    cssom: {left: serializeMock(x), top: serializeMock(y)},
    reference: {left: serializeMock(x), top: serializeMock(y)}, priorities: {left: '', top: ''},
    pin: {left: left + grid(width * x / 100) - 12, top: top + grid(height * y / 100) - 12, width: 24, height: 24},
    canvas: {left, top, width, height}, pinStyle: style({position: 'absolute', transform: 'matrix(1, 0, 0, 1, -12, -12)'}),
    ancestors: [style(), style({position: 'static'})], directChild: true, offsetParent: true,
    canvasScroll: {left: 0, top: 0}, mapZoom: 1, devicePixelRatio: 1, viewportScale: 1,
  };
}
const check = (o, a) => assertCoordinateObservation(o, a);

test('all three source anchors match independent decimal references at 1x and 5x synthetic layout', () => {
  assert.equal(anchors.length, 3);
  for (const [i, anchor] of anchors.entries()) {
    const [x, y] = references[i];
    assert(Math.abs(expectedPercent(anchor).left - x) < RAW_PERCENT_LIMIT);
    assert(Math.abs(expectedPercent(anchor).top - y) < RAW_PERCENT_LIMIT);
    for (const zoom of [1, 5]) for (const width of [620, 967.5, 1200]) {
      const o = fixture(x, y, {width: width * zoom, height: width * zoom / 2});
      check(o, anchor);
      // The old CSSOM parseFloat comparison rejects this valid synthetic rounding.
      assert(Math.abs(parseFloat(o.cssom.left) - x) >= RAW_PERCENT_LIMIT);
    }
  }
});

test('boundary and near-boundary coordinates have explicit independent expected axes', () => {
  const rows = [
    [-180, 90, 0, 0], [180, -90, 100, 100], [0, 0, 50, 50],
    [-180, -90, 0, 100], [180, 90, 100, 0],
    [-179.99999964, 89.99999982, 1e-7, 1e-7],
    [179.99999964, -89.99999982, 99.9999999, 99.9999999],
    [-179.9955, 89.99775, 0.00125, 0.00125],
  ];
  for (const [longitude, latitude, x, y] of rows) for (const zoom of [1, 5]) {
    check(fixture(x, y, {width: 1200 * zoom, height: 600 * zoom}), {longitude, latitude});
  }
});

test('fractional CSS rectangles and large coordinates do not require a particular engine grid', () => {
  const o = fixture(...references[0], {width: 1234.567, height: 678.123, left: 0.123, top: -1.234});
  check(o, anchors[0]);
  check(fixture(...references[0], {width: 200000, height: 100000, left: 200000, top: 200000}), anchors[0]);
});

test('wrong source coordinates and swapped axes fail independently for every anchor and zoom', () => {
  for (const [i, a] of anchors.entries()) for (const zoom of [1, 5]) {
    const [x, y] = references[i], good = fixture(x, y, {width: 1200 * zoom, height: 600 * zoom});
    for (const rawStyle of [`left:${x + 1}%;top:${y}%`, `left:${x}%;top:${y + 1}%`, `left:${y}%;top:${x}%`]) {
      assert.throws(() => check({...good, rawStyle}, a), /authored .* projection/);
    }
    // Same synthetic displayed string and unchanged rectangles cannot excuse a
    // wrong unrounded authored coordinate, even when old screenshot checks pass.
    const changed = x + 1e-8;
    assert.equal(serializeMock(changed), serializeMock(x));
    assert.throws(() => check({...good, rawStyle: `left:${changed}%;top:${y}%`}, a), /authored left projection/);
    assert.throws(() => check({...good, cssom: {...good.cssom, left: '40%'}}, a), /CSSOM left projection/);
  }
});

test('cascade-like displacements are rejected with correct raw and CSSOM coordinate values', () => {
  for (const [i, a] of anchors.entries()) for (const zoom of [1, 5]) {
    const [x, y] = references[i], good = fixture(x, y, {width: 1200 * zoom, height: 600 * zoom});
    for (const axis of ['left', 'top']) {
      const shifted = structuredClone(good); shifted.pin[axis] += 1;
      assert.throws(() => check(shifted, a), new RegExp('rendered ' + axis + ' center alignment'));
      const quantumShift = structuredClone(good);
      // Cross the predeclared product threshold; this is synthetic geometry.
      quantumShift.pin[axis] += 2 * CENTER_ALIGNMENT_LIMIT_CSS_PX;
      assert.throws(() => check(quantumShift, a), /rendered .* center alignment/);
    }
  }
});

test('wrong effective transform, reference box, containing block, and nonfinite sizes fail', () => {
  const good = fixture(...references[0]);
  const mutations = [
    o => o.pinStyle.transform = 'matrix(1, 0, 0, 1, 0, 0)',
    o => o.ancestors[0].transform = 'matrix(2, 0, 0, 2, 0, 0)',
    o => o.ancestors[1].scale = '2', o => o.pinStyle.translate = '1px',
    o => o.pinStyle.rotate = '2deg', o => o.pinStyle.zoom = '2',
    o => o.ancestors[0].paddingLeft = '1px', o => o.ancestors[0].borderLeftWidth = '1px',
    o => o.pinStyle.marginLeft = '1px',
    o => o.offsetParent = false, o => o.directChild = false,
    o => o.canvasScroll.left = 1, o => o.pin.width = 26, o => o.canvas.width = 0,
  ];
  for (const mutate of mutations) {const o = structuredClone(good); mutate(o); assert.throws(() => check(o, anchors[0]));}
});

test('missing/invalid/nonfinite values and ambiguous authored declarations are rejected', () => {
  for (const rawStyle of [null, undefined, '', 'left:20%', 'left:20%;left:30%', 'left:20px;top:30%',
    'left:NaN%;top:30%', 'left:Infinity%;top:30%', 'left:1e999%;top:30%',
    'left:-1%;top:30%', 'left:101%;top:30%', 'left:20%;top:30%;color:red',
    'left:20%!important;top:30%', 'left:calc(20%);top:30%', 'left:20%junk;top:30%']) {
    assert.throws(() => authoredPercent(rawStyle));
  }
  assert.deepEqual(authoredPercent('left: 1e-7%; top: 100%;'), {left: 1e-7, top: 100});
  for (const a of [null, {}, {latitude: 0}, {latitude: NaN, longitude: 0},
    {latitude: 91, longitude: 0}, {latitude: 0, longitude: 181}, {latitude: 0, longitude: Infinity},
    {latitude: 0, longitude: '0'}]) assert.throws(() => expectedPercent(a));
  for (const mutate of [o => o.cssom.left = '', o => o.reference.left = '',
    o => o.priorities.left = 'important', o => o.pin.top = NaN, o => o.canvas.height = Infinity,
    o => o.ancestors = []]) {
    const o = fixture(...references[0]); mutate(o); assert.throws(() => check(o, anchors[0]));
  }
});

test('0.5 CSS-pixel product threshold is inclusive per axis and never loosens raw source tolerance', () => {
  assert.equal(CENTER_ALIGNMENT_LIMIT_CSS_PX, 0.5); assert.equal(RAW_PERCENT_LIMIT, 1e-10);
  for (const width of [620, 1200, 6000]) for (const axis of ['left', 'top']) for (const sign of [-1, 1]) {
    const o = fixture(50, 50, {width, height: width / 2});
    o.pin[axis] += sign * 0.5; check(o, {longitude: 0, latitude: 0});
    o.pin[axis] += sign * 0.000001;
    assert.throws(() => check(o, {longitude: 0, latitude: 0}), /rendered .* center alignment/);
  }
  const rawWrong = fixture(50, 50); rawWrong.rawStyle = 'left:50.000000001%;top:50%';
  assert.throws(() => check(rawWrong, {longitude: 0, latitude: 0}), /authored left projection/);
});

test('DPR, visual zoom, transition declarations, harmless animation and formatting do not reject aligned geometry', () => {
  const o = fixture(...references[0]); o.devicePixelRatio = 3; o.viewportScale = 2;
  o.pinStyle.transitionDuration = '1s'; o.ancestors[0].animationName = 'color-only';
  o.ancestors[0].direction = 'rtl'; o.ancestors[0].overflowX = 'hidden';
  o.pinStyle.transform = 'matrix(1,0,0,1,-12,-12)';
  o.ancestors[1].transform = 'matrix(1,0,0,1,3.25,-5.125)';
  check(o, anchors[0]);
  const differentSize = fixture(...references[0]); differentSize.pin.width = 30; differentSize.pin.height = 30;
  differentSize.pin.left -= 3; differentSize.pin.top -= 3;
  differentSize.pinStyle.transform = 'matrix(1,0,0,1,-15,-15)'; check(differentSize, anchors[0]);
});

test('collector reads authored attribute first and keeps reference declaration detached (mock only)', async () => {
  const good = fixture(...references[0]), calls = [];
  const declaration = () => {
    const values = {};
    return Object.defineProperties({getPropertyPriority: () => ''}, Object.fromEntries(['left', 'top'].map(axis => [axis, {
      get: () => {calls.push('read-cssom'); return values[axis];},
      set: value => {values[axis] = serializeMock(Number(value.slice(0, -1)));},
    }])));
  };
  const win = {devicePixelRatio: 1, visualViewport: {scale: 1}, getComputedStyle: e => ({...e.computed, getPropertyValue: name => name === '--map-zoom' ? '1' : ''})};
  const canvas = {computed: good.ancestors[0], parentElement: null, scrollLeft: 0, scrollTop: 0, getBoundingClientRect: () => good.canvas};
  const doc = {defaultView: win, querySelector: s => {assert.equal(s, '#map-canvas'); return canvas;},
    createElement: tag => {assert.equal(tag, 'span'); calls.push('create-detached'); return {style: declaration()};}};
  const pinStyle = declaration(); pinStyle.left = references[0][0] + '%'; pinStyle.top = references[0][1] + '%';
  const pin = {ownerDocument: doc, getAttribute: s => {calls.push('get-raw'); assert.equal(s, 'style'); return good.rawStyle;},
    style: pinStyle, computed: good.pinStyle, parentElement: canvas, offsetParent: canvas, getBoundingClientRect: () => good.pin};
  const observed = observeCoordinate(pin, {left: references[0][0], top: references[0][1]});
  assert.equal(calls[0], 'get-raw'); assert.equal(calls.filter(x => x === 'create-detached').length, 1);
  check(observed, anchors[0]);
  await assertWorldCoordinate({evaluate: async (fn, value) => fn(pin, value)}, anchors[0]);
});

test('unchanged authored renderer and exact bundle remain runtime-generated; old source tests stay sealed', () => {
  const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
  assert(read('src/world-view.ts').includes('style="left:${x/12}%;top:${y/6}%"'));
  const staticHTML = read('dist/index.html').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  assert(!staticHTML.includes('<button class="map-pin'));
  assert.equal(createHash('sha256').update(read('tests/world.test.mjs')).digest('hex'), '8931c0f5ee117ac55765fa7d90b5adb53606bc58e7433b8344068e0a4b2e7ac9');
  const source = read('scripts/world-interactions.mjs');
  assert.equal((source.match(/await assertWorldCoordinate\(pin,a,[15]\)/g) || []).length, 2);
  assert(source.includes('await geometry(pin);await pin.click();'));
  assert(source.includes("await page.locator('#zoom-reset').click();"));
});

test('failure snapshot contains only bounded numerical/closed-vocabulary observations', () => {
  const o = fixture(...references[0]); o.mapZoom = 5; o.pin.left += 1;
  const d = coordinateFailureSnapshot(o, anchors[0], 5);
  assert.equal(d.status, 'observed'); assert.equal(d.anchorId, anchors[0].anchor_id);
  assert.equal(d.expectedZoom, 5); assert.equal(d.observedZoom, 5);
  assert.equal(d.rawTokens.left, references[0][0] + '%');
  assert.equal(d.metrics.left.limit, CENTER_ALIGNMENT_LIMIT_CSS_PX); assert(d.metrics.left.error > 0.5);
  assert.equal(d.preconditions.containingBlock, true);
  const hostile = structuredClone(o); hostile.rawStyle = 'left:person@example.com;top:30%';
  hostile.cssom.left = 'https://private.invalid/'; hostile.reference.top = 'person@example.com';
  hostile.pinStyle.transform = 'contact-sensitive'; hostile.ancestors[0].animationName = 'contact-sensitive';
  const h = coordinateFailureSnapshot(hostile, {...anchors[0], anchor_id: 'person@example.com'}, 5);
  assert(!JSON.stringify(h).includes('person@')); assert(!JSON.stringify(h).includes('private.invalid'));
  assert(!JSON.stringify(h).includes('contact-sensitive')); assert.equal(h.anchorId, null);
  assert.equal(h.rawTokens.left, null); assert.equal(h.cssom.left, null); assert.equal(h.reference.top, null);
  assert(Buffer.byteLength(JSON.stringify(h)) < 4096);
  const unknown = coordinateFailureSnapshot(undefined, anchors[0], 1); assert.equal(unknown.status, 'unavailable');
});

test('available browser identity stays exact; uncollected revision and other missing identities stay explicit', () => {
  const d = coordinateFailureSnapshot(fixture(...references[0]), anchors[0], 1);
  const report = {browserExecutable: '/opt/google/chrome/chrome', browserExecutableSha256: 'a'.repeat(64), browserVersion: '1.2.3.4', playwrightVersion: '1.62.1'};
  const e = coordinateFailureEnvelope(d, report); // Synthetic identity, never a world-run claim.
  assert.deepEqual(e.browserIdentity, {executable: report.browserExecutable, executableSha256: report.browserExecutableSha256,
    version: '1.2.3.4', revision: null, revisionStatus: 'not_collected_by_existing_runner', playwrightVersion: '1.62.1'});
  const u = coordinateFailureEnvelope(d, {}); assert.equal(u.browserIdentity.version, null); assert.equal(u.browserIdentity.executableSha256, null);
  const h = coordinateFailureEnvelope({...d, privateText: 'person@example.com'}, {browserVersion: 'person@example.com', browserExecutable: '/home/private'});
  assert.equal(h.status, 'unavailable'); assert(!JSON.stringify(h).includes('person@')); assert(!JSON.stringify(h).includes('/home/private'));
  for (const mutate of [x => x.metrics.left.error = Infinity, x => x.metrics.left.limit = 1,
    x => x.rawTokens.left = '20%;email=person@example.com', x => x.computed.pinTransform = Array(1000).fill(1),
    x => x.rectangles.canvas.left = 1e50, x => x.preconditions.contact = true]) {
    const bad = structuredClone(d); mutate(bad); assert.equal(coordinateFailureEnvelope(bad, report).status, 'unavailable');
  }
});

test('wrapper preserves the original failure and existing bounded report carries the safe diagnostic', async () => {
  const o = fixture(...references[0]); o.pin.top += 1;
  let error;
  try {await assertWorldCoordinate({evaluate: async () => o}, anchors[0], 5);} catch (e) {error = e;}
  assert(error); assert.match(error.message, /rendered top center alignment/); assert.equal(error.coordinateFailure.status, 'observed');
  const plannedIds = Array.from({length: 503}, (_, i) => 'case-' + i), groupNames = Array.from({length: 17}, (_, i) => 'group-' + i);
  const report = {status: 'failed', completedCases: 0, error: String(error.stack),
    plannedCases: plannedIds.map((id, i) => ({id, status: i === 483 ? 'failed' : 'not-run'})),
    plannedCheckGroups: groupNames.map((name, i) => ({name, status: i === 13 ? 'failed' : 'not-run'})), browserVersion: '1.2.3.4'};
  const small = failureDiagnostic(report, {plannedIds, groupNames, root: '/synthetic', sourceLineCounts: {}, coordinateFailure: error.coordinateFailure});
  assert.equal(small.failedGroupIndices[0], 13); assert.equal(small.failedCaseIndices[0], 483);
  assert.equal(small.coordinateFailure.browserIdentity.version, '1.2.3.4');
  assert.equal(small.coordinateFailure.browserIdentity.revision, null); assert.equal(small.nativeAcceptance, false);
  assert(Buffer.byteLength(JSON.stringify(small)) < 8192);
  const normal = failureDiagnostic(report, {plannedIds, groupNames, root: '/synthetic', sourceLineCounts: {}});
  assert.equal(normal.coordinateFailure, undefined);
  const frozenError = Object.freeze(new Error('synthetic observation failure'));
  await assert.rejects(assertWorldCoordinate({evaluate: async () => {throw frozenError;}}, anchors[0], 1), e => e === frozenError);
});

test('native integration adds no API call, captured body, report artifact, or changed capture count', () => {
  const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
  const source = read('scripts/native-review.mjs');
  assert(source.includes("const metadata=Object.getOwnPropertyDescriptor(e,'coordinateFailure');"));
  assert(source.includes("if(metadata&&Object.hasOwn(metadata,'value'))coordinateFailure=metadata.value;"));
  assert(source.includes('sourceLineCounts:diagnosticLines,coordinateFailure'));
  assert(!source.includes('Browser.getVersion')); assert(!source.includes('coordinate-failure.json'));
  assert.equal((source.match(/await page\.screenshot\(/g) || []).length, 1);
  assert.equal((source.match(/await page\.content\(/g) || []).length, 1);
});

test('reviewer changing snapshot getter is rejected without invocation', () => {
  const d = coordinateFailureSnapshot({}, {anchor_id: 'anchor-scotus-washington-city', longitude: 0, latitude: 0}, 1);
  let reads = 0;
  Object.defineProperty(d.rawTokens, 'left', {enumerable: true, get() {return ++reads <= 2 ? '20%' : 'synthetic-private@example.invalid';}});
  const result = coordinateFailureEnvelope(d);
  assert.equal(reads, 0); assert.equal(result.status, 'unavailable');
  assert(!JSON.stringify(result).includes('synthetic-private@')); assert(Buffer.byteLength(JSON.stringify(result)) <= 4096);
});

test('reviewer changing identity getters cannot escape or enlarge fallback', () => {
  for (const payload of ['/synthetic-private/path', '/' + 'x'.repeat(5000)]) {
    let reads = 0;
    const result = coordinateFailureEnvelope(coordinateFailureSnapshot(undefined), {get browserExecutable() {return ++reads === 1 ? '/opt/google/chrome/chrome' : payload;}});
    assert.equal(reads, 0); assert.equal(result.browserIdentity.executable, null);
    assert(!JSON.stringify(result).includes(payload)); assert(Buffer.byteLength(JSON.stringify(result)) <= 4096);
  }
  for (const key of ['browserExecutable', 'browserExecutableSha256', 'browserVersion', 'playwrightVersion']) {
    let reads = 0;
    const report = Object.defineProperty({}, key, {enumerable: true, get() {reads++; throw Error('must not run');}});
    const result = coordinateFailureEnvelope(coordinateFailureSnapshot(undefined), report);
    assert.equal(reads, 0); assert.equal(result.browserIdentity.version, null); assert(Buffer.byteLength(JSON.stringify(result)) <= 4096);
  }
});

test('diagnostic snapshot rejects accessors, unexpected prototypes, hidden fields and cycles', () => {
  const fresh = () => coordinateFailureSnapshot(fixture(...references[0]), anchors[0], 1);
  for (const mutate of [
    d => Object.setPrototypeOf(d, {privateValue: 'synthetic-private@example.invalid'}),
    d => Object.defineProperty(d.metrics.left, 'error', {get() {throw Error('must not run');}}),
    d => Object.defineProperty(d, 'hidden', {value: 'synthetic-private@example.invalid'}),
    d => d[Symbol('hidden')] = 'synthetic-private@example.invalid',
    d => d.metrics.left.self = d,
    d => Object.defineProperty(d.computed.canvasBorder, '0', {get() {throw Error('must not run');}}),
    d => d.rawTokens.left = 'x'.repeat(9000),
  ]) {
    const d = fresh(); mutate(d); const result = coordinateFailureEnvelope(d);
    assert.equal(result.status, 'unavailable'); assert(!JSON.stringify(result).includes('synthetic-private@'));
    assert(Buffer.byteLength(JSON.stringify(result)) <= 4096);
  }
  const d = fresh(); Object.setPrototypeOf(d, null); Object.freeze(d);
  const result = coordinateFailureEnvelope(d, Object.freeze({browserVersion: '1.2.3.4'}));
  assert.equal(result.status, 'observed'); assert.equal(result.browserIdentity.version, '1.2.3.4');
  assert.notEqual(result, d); assert.notEqual(result.rawTokens, d.rawTokens);
});

test('native catch optional metadata never replaces original or frozen failures', async () => {
  const source = readFileSync(new URL('../scripts/native-review.mjs', import.meta.url), 'utf8');
  const body = source.match(/^\}catch\(e\)\{(.+)\}$/m)[1];
  const AsyncFunction = Object.getPrototypeOf(async function() {}).constructor;
  const run = new AsyncFunction('e', 'report', 'process', 'page', 'capture', 'let coordinateFailure;' + body + ';return coordinateFailure;');
  for (const freeze of [false, true]) {
    const original = new Error('original synthetic observation failure'), replacement = new Error('synthetic coordinate accessor failure');
    let reads = 0; Object.defineProperty(original, 'coordinateFailure', {get() {reads++; throw replacement;}});
    if (freeze) Object.freeze(original);
    let caught;
    try {await assertWorldCoordinate({evaluate: async () => {throw original;}}, {longitude: 0, latitude: 0}, 1);} catch (e) {caught = e;}
    assert.equal(caught, original);
    const report = {}, processStub = {};
    assert.equal(await run(caught, report, processStub, undefined, async () => {}), undefined);
    assert.equal(reads, 0); assert.equal(report.status, 'failed'); assert.equal(processStub.exitCode, 1);
    assert.equal(report.error, String(original.stack));
  }
  const d = coordinateFailureSnapshot(undefined), e = new Error('ordinary synthetic failure');
  Object.defineProperty(e, 'coordinateFailure', {value: d});
  assert.equal(await run(e, {}, {}, undefined, async () => {}), d);
});
