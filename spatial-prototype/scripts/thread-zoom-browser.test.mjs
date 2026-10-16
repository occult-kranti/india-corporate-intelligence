/** Portable contract/model checks only. Never launches a browser or WebGL. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';
import { ATLAS_EDGE, CASE_EDGE, CROSSING_CENTER, REQUIRED_ZOOMS, BASELINE_COMMIT,
  requireAuthorizedCI, parseMode, mercator, panDelta, clipSegment, assertRasterEvidence, recordCheck,
  installThreadZoomProbe, dragOffsets, findClearGesture, navigationSnapshot, atlasCenterReached, ATLAS_CENTER_ERROR_PX } from './thread-zoom-browser.mjs';

const path = fileURLToPath(new URL('./thread-zoom-browser.mjs', import.meta.url));
const source = await readFile(path, 'utf8');
test('native entry rejects local invocation before importing Playwright', () => {
  for (const env of [{}, { CI: 'true' }, { GITHUB_ACTIONS: 'true' }, { SPATIAL_BROWSER_REVIEW: 'github-actions' }]) assert.throws(() => requireAuthorizedCI(env));
  const env = { ...process.env }; delete env.GITHUB_ACTIONS; delete env.SPATIAL_BROWSER_REVIEW;
  const child = spawnSync(process.execPath, [path], { env, encoding: 'utf8' });
  assert.notEqual(child.status, 0); assert.match(child.stderr, /No local browser was launched/);
  assert.ok(source.indexOf('requireAuthorizedCI(env); const mode') < source.indexOf("await import('playwright')"));
});
test('strict candidate is default; only named baseline diagnostic is available', () => {
  assert.equal(parseMode([]), 'candidate'); assert.equal(parseMode(['--baseline-diagnostic']), 'baseline-diagnostic');
  for (const args of [['--local'], ['--skip-extreme'], ['--baseline-diagnostic', '--local'], ['--early-scene-smoke']]) assert.throws(() => parseMode(args));
});
test('original fixtures and full allowed-range thresholds remain exact', () => {
  assert.equal(ATLAS_EDGE, 'legacy:relationship:9e7654ec6cc7ec18|joshi|role|coal');
  assert.equal(CASE_EDGE, 'case:india-ambani:edge:1:1');
  assert.deepEqual(CROSSING_CENTER, [76.329121982, 21.999570445240124]);
  assert.deepEqual(REQUIRED_ZOOMS, [4.5, 5.9, 6, 8, 16, 17, 18, 19]);
  assert.equal(BASELINE_COMMIT, '85702ec5f553415e009a37e89d7333c96c952c66');
});
test('read-only camera math supplies natural drag deltas, not a hidden camera setter', () => {
  assert.deepEqual(mercator([0, 0]), [.5, .5]); assert.deepEqual(panDelta(CROSSING_CENTER, CROSSING_CENTER, 19), [0, 0]);
  assert.ok(panDelta([0, 0], [1, 0], 5)[0] < 0); assert.ok(panDelta([0, 0], [0, 1], 5)[1] > 0);
  assert.match(source, /page\.mouse\.wheel/); assert.match(source, /page\.mouse\.down/);
  assert.doesNotMatch(source, /\.jumpTo\(|\.setZoom\(|\.setState\(|setSelected\(|\.visible\s*=/);
});
test('every drag starts beyond both activation thresholds, including fractional corrections', () => {
  for (const delta of [[.31,0],[0,-.31],[1,1],[-3,4],[12,0],[90,-80]]) {
    const [activation, end] = dragOffsets(delta);
    assert.ok(Math.abs(Math.hypot(...activation) - 12) < 1e-10);
    assert.deepEqual(end, delta);
    for (let i = 0; i < 2; i++) assert.ok(Math.abs(activation[i] + (end[i] - activation[i]) - delta[i]) < 1e-10);
  }
  for (const invalid of [[0,0],[NaN,0],[1,Infinity],[1]]) assert.throws(() => dragOffsets(invalid));
  assert.match(source, /dragSurface\(page, '\[data-case-surface\]'/);
  assert.match(source, /dragSurface\(page, '\.webgl-host canvas'/);
  assert.match(source, /if \(atlasCenterReached\(delta\)\)/);
  assert.match(source, /if \(Math\.hypot\(dx, dy\) < 1\) break/);
});

test('installed MapLibre drag handler suppresses short out-and-back clicks and preserves the net delta', async () => {
  const require = createRequire(import.meta.url), root = dirname(require.resolve('maplibre-gl/package.json'));
  assert.equal(JSON.parse(await readFile(join(root, 'package.json'), 'utf8')).version, '6.13.0');
  assert.match(await readFile(join(root, 'src/ui/map.ts'), 'utf8'), /clickTolerance: 3,/);
  const result = await build({ stdin: { contents: `export {DragHandler} from './src/ui/handler/drag_handler.ts'; export {DOM} from './src/util/dom.ts';`, resolveDir: root },
    bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent',
    plugins: [{ name: 'portable-click-suppression-spy', setup(builder) {
      builder.onLoad({ filter: /\/util\/dom\.ts$/ }, () => ({ contents: 'export class DOM { static suppressed = 0; static suppressClick() { this.suppressed++; } }', loader: 'js' }));
    } }] });
  const { DragHandler, DOM } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
  const point = ([x,y]) => ({ x, y, dist(other) { return Math.hypot(x - other.x, y - other.y); } });
  const run = offsets => {
    const sum = [0,0], before = DOM.suppressed;
    const handler = new DragHandler({ clickTolerance: 3, enable: true, activateOnStart: true, assignEvents() {},
      moveStateManager: { startMove() {}, endMove() {}, isValidStartEvent: () => true, isValidMoveEvent: () => true, isValidEndEvent: () => true },
      move(a,b) { const delta = [b.x - a.x,b.y - a.y]; sum[0] += delta[0]; sum[1] += delta[1]; return { panDelta: delta }; } });
    const event = { preventDefault() {} }; handler.dragStart(event, point([0,0]));
    for (const offset of offsets) handler.dragMove(event, point(offset));
    handler.dragEnd(event); return { sum, suppressed: DOM.suppressed - before };
  };
  assert.deepEqual(run([[1,1]]), { sum: [0,0], suppressed: 0 }, 'The old tiny correction is a click candidate');
  for (const delta of [[.31,0],[1,1],[-2,0],[90,-80]]) {
    const actual = run(dragOffsets(delta)); assert.equal(actual.suppressed, 1);
    for (let i = 0; i < 2; i++) assert.ok(Math.abs(actual.sum[i] - delta[i]) < 1e-10);
  }
});

test('actual case input keeps tiny corrective drags unselected and does not lose activation motion', async () => {
  const { helpers } = await import('./case-unit/test-tools.mjs'), { load } = helpers('case-scene');
  const { CaseInputAdapter, CaseController } = await load('integration-adapter.ts'), { getCaseCatalog } = await load('catalog-bridge.ts');
  const file = getCaseCatalog().cases.find(row => row.id === 'case:india-ambani');
  class Surface extends EventTarget {
    style = { touchAction:'pan-y' }; capture = new Set(); clientHeight = 500;
    getBoundingClientRect() { return { left:0,top:0 }; }
    setPointerCapture(id) { this.capture.add(id); }
    hasPointerCapture(id) { return this.capture.has(id); }
    releasePointerCapture(id) { this.capture.delete(id); }
  }
  const fire = (surface, type, [x,y]) => {
    const event = new Event(type, { cancelable:true });
    for (const [key,value] of Object.entries({ pointerId:1,button:0,clientX:100+x,clientY:100+y })) Object.defineProperty(event,key,{ value });
    surface.dispatchEvent(event);
  };
  const previousObserver = globalThis.ResizeObserver;
  globalThis.ResizeObserver = class { observe() {} disconnect() {} };
  try {
    const run = offsets => {
      const surface = new Surface(), canvas = new Surface(), document = new EventTarget(), media = new EventTarget(); media.matches = true;
      document.hidden = false; document.defaultView = { performance:{ now:() => 0 }, matchMedia:() => media, requestAnimationFrame:() => 1, cancelAnimationFrame() {} }; surface.ownerDocument = document;
      const controller = new CaseController(file), before = [...controller.state.camera.center]; let picks = 0;
      const map = { getCenter:() => ({ lng:0,lat:0 }), getZoom:() => 4, getPitch:() => 0, getBearing:() => 0, stop() {}, jumpTo() {}, getCanvas:() => canvas };
      const layer = { model:controller.model, setState() {}, resize() {}, fitSelectionPose:pose => pose, layoutAt:(x,y) => [x/100,y/100], pick() { picks++; return { kind:'node',id:file.nodes[0].id }; } };
      const adapter = new CaseInputAdapter({ controller,layer,map,surface,opener:null,onState() {},onAmbiguousEdges() {},closeSourceDialog:() => false,onClose() {},onFailure(message) { throw new Error(message); },stopGeographicJourney() {},setWorkspaceActive() {} });
      try {
        adapter.setInteractionMode(true); fire(surface,'pointerdown',[0,0]);
        for (const offset of offsets) fire(surface,'pointermove',offset);
        fire(surface,'pointerup',offsets.at(-1));
        return { picks, selection:controller.state.navigation.nodeId, delta:controller.state.camera.center.map((value,i) => value - before[i]) };
      } finally { adapter.dispose(); }
    };
    assert.equal(run([[1,1]]).picks, 1, 'The old sub-threshold correction selects instead of panning');
    for (const delta of [[.31,0],[1,1],[3,0],[-4,4],[80,-40]]) {
      const actual = run(dragOffsets(delta)); assert.equal(actual.picks, 0); assert.equal(actual.selection, null);
      for (let i = 0; i < 2; i++) assert.ok(Math.abs(actual.delta[i] + delta[i] / 100) < 1e-10);
    }
  } finally {
    if (previousObserver === undefined) delete globalThis.ResizeObserver; else globalThis.ResizeObserver = previousObserver;
  }
});

function scanGesture(clearAt, offsets = [], rect = { x:0,y:0,left:0,top:0,right:800,bottom:500,width:800,height:500 }, viewport = { width:800,height:500 }) {
  const element = (tag, className) => ({ tagName:tag, id:'', getAttribute: name => name === 'class' ? className : null });
  const surface = { ...element('CANVAS','real-surface'), getBoundingClientRect: () => rect }, blocker = element('BUTTON','real-overlay');
  const document = { querySelector: () => surface, elementFromPoint: (x,y) => clearAt(x,y) ? surface : blocker };
  const result = runInNewContext(`(${findClearGesture.toString()})`, { document, innerWidth:viewport.width, innerHeight:viewport.height })({ selector:'.webgl-host canvas', offsets });
  return JSON.parse(JSON.stringify(result));
}
test('gesture search finds real clear paths beyond the six old center probes', () => {
  const result = scanGesture((x,y) => x > 600 && x < 720 && y > 80 && y < 130, dragOffsets([40,0]));
  assert.ok(result.plan); assert.ok(result.attempts > 6);
  assert.ok(result.hitTargets.every(hit => hit.target.tag === 'CANVAS'));
});
test('clear starts cannot excuse blocked activation, endpoints or intermediate paths', () => {
  const small = { x:0,y:0,left:0,top:0,right:100,bottom:100,width:100,height:100 };
  assert.equal(scanGesture((x,y) => x >= 46 && x <= 54 && y >= 40 && y <= 60, dragOffsets([1,0]), small).plan, null);
  const wide = { ...small, right:400, width:400 };
  const crossed = scanGesture(x => x < 190 || x > 210, dragOffsets([280,0]), wide);
  assert.equal(crossed.plan, null); assert.ok(crossed.blockedTargets.some(row => row.target.tag === 'BUTTON'));
  assert.equal(scanGesture(() => false, dragOffsets([1,1])).plan, null);
});
test('gesture routes remain inside the actual clipped viewport and preserve failed target diagnostics', () => {
  const result = scanGesture(() => true, dragOffsets([-40,30]), { x:-50,y:-20,left:-50,top:-20,right:750,bottom:480,width:800,height:500 }, { width:390,height:844 });
  assert.ok(result.plan);
  for (const point of [result.plan.start,...result.plan.points]) assert.ok(point.x >= 8 && point.x <= 382 && point.y >= 8 && point.y <= 472);
  assert.match(source, /report\.failureNavigation = await page\.evaluate\(navigationSnapshot\)/);
  assert.match(source, /navigationReports\.set\(page, report\.navigation\)/);
  assert.match(source, /do not silently close it/);
  assert.match(navigationSnapshot.toString(), /geographicPose/);
  assert.match(navigationSnapshot.toString(), /caseSelection/);
  assert.match(installThreadZoomProbe.toString(), /state\.inputs\.push\(row\)/);
});
test('independent screen clipping keeps crossings with both endpoints outside', () => {
  assert.deepEqual(clipSegment([-5, 20], [105, 20], 100, 40), [[0,20],[100,20]]);
  assert.deepEqual(clipSegment([30, -5], [30, 45], 100, 40), [[30,0],[30,40]]);
  assert.deepEqual(clipSegment([30, 20], [105, 20], 100, 40), [[30,20],[100,20]]);
  assert.equal(clipSegment([-5, -5], [105, -5], 100, 40), null);
  assert.deepEqual(clipSegment([30, 20], [30, 20], 100, 40), [[30,20],[30,20]]);
});
const raster = () => ({ canvas: { width:800, height:500 }, buffer: { width:800, height:500 }, contextLost:false,
  draws:[{ nativePositionBufferMatched:true, raster:{ changedPixels:180, spanCss:128, meanWidthCss:1.4, coverage:.99, maxGapCss:1 } }] });
test('native pixel acceptance rejects visible meshes, draw counts and extreme-width collapse', () => {
  assert.doesNotThrow(() => assertRasterEvidence(raster(), 'portable acceptance fixture'));
  const empty = raster(); empty.draws = []; empty.meshVisibleDiagnosticOnly = true; assert.throws(() => assertRasterEvidence(empty, 'zero actual draws'));
  const invisible = raster(); invisible.draws[0].raster.changedPixels = 0; assert.throws(() => assertRasterEvidence(invisible, 'submitted but invisible'));
  const thin = raster(); thin.draws[0].raster.meanWidthCss = .1; assert.throws(() => assertRasterEvidence(thin, 'Float32 collapse'));
  const discontinuous = raster(); discontinuous.draws[0].raster.coverage = .3; assert.throws(() => assertRasterEvidence(discontinuous, 'disconnected fragments'));
  const gap = raster(); gap.draws[0].raster.maxGapCss = 20; assert.throws(() => assertRasterEvidence(gap, 'large gap'));
  const failedRead = raster(); failedRead.draws[0].raster = { error:'native read failed' }; assert.throws(() => assertRasterEvidence(failedRead, 'read error'));
  const lost = raster(); lost.contextLost = true; assert.throws(() => assertRasterEvidence(lost, 'lost'));
});
test('baseline failures are explicitly diagnostic and never candidate passes', () => {
  const report = { checks: [] }, fail = () => { throw new Error('old cutoff or width failure'); };
  recordCheck(report, 'z19 strict', fail); recordCheck(report, 'z19 baseline', fail, true);
  assert.equal(report.checks[0].status, 'failed'); assert.equal(report.checks[1].status, 'baseline-diagnostic-failure');
  assert.ok(report.checks.every(c => c.status !== 'passed'));
});
test('native observer keeps original GL calls, factual data and renderer untouched', () => {
  const probe = installThreadZoomProbe.toString();
  assert.match(probe, /native\[method\]\(\.\.\.args\)/); assert.match(probe, /native\.readPixels\(/);
  assert.match(probe, /buffers\.get\(mesh\.geometry\.attributes\.position\.array\) === actualBuffer/);
  assert.match(probe, /'observe'/); assert.match(probe, /'register'/); assert.match(probe, /uThreadRadius/);
  assert.doesNotMatch(probe, /renderer\.render\s*=|onBeforeRender\s*=|\.uniforms\.[^;]+\s*=|\.position\.set|native\.draw\w+\(/);
  assert.doesNotMatch(probe, /bindFramebuffer\(|pixelStorei\(|clearColor\(|colorMask\(/);
  assert.match(probe, /readPixels immediately before\/after the exact original thread draw/);
});
test('case review proves accepted-source mesh identity, max zoom, sources and explicit fallback separately', () => {
  assert.match(source, /Case mesh is not the accepted original edge/); assert.match(source, /row\.meshUuid, initial\.meshUuid/);
  assert.match(source, /observedZoomRatio - 4/); assert.match(source, /bothEndpointsOffscreen/);
  assert.match(source, /data-case-auto-fallback-notice/); assert.match(source, /sourceAccess: true/);
  assert.match(source, /Case camera leaked into atlas pose/); assert.match(source, /world\.visibleEdgeIds\.length <= 24/);
  assert.match(source, /row\.visibleEdgeIds\.length <= 60/); assert.match(source, /visibleEdgeIds\.length <= 12/);
});

test('public live mode is destination-pinned and never an acceptance result', async () => {
  const { LIVE_ATLAS_URL, diagnosticStatus } = await import('./thread-zoom-browser.mjs');
  assert.equal(LIVE_ATLAS_URL, 'https://occult-kranti.github.io/india-corporate-intelligence/spatial/');
  assert.equal(parseMode(['--live-diagnostic']), 'live-diagnostic');
  assert.throws(() => parseMode(['--live-diagnostic', 'https://example.org/']));
  assert.equal(diagnosticStatus('live-diagnostic', []), 'diagnostic-only');
  assert.equal(diagnosticStatus('live-diagnostic', [{ status:'live-diagnostic-unsupported' }]), 'diagnostic-incomplete');
  assert.equal(diagnosticStatus('baseline-diagnostic', [{ status:'baseline-diagnostic-failure' }]), 'diagnostic-incomplete');
  assert.equal(diagnosticStatus('candidate', [{ status:'failed' }]), 'failed');
  assert.match(source, /Baseline diagnostics must serve the exact frozen baseline checkout/);
  assert.match(source, /live release does not expose the full-precision geographic pose/);
  assert.match(source, /asset\.sha256 = sha256\(bytes\)/);
});
test('partial native receipts, raw raster samples, oblique pose and narrow captures are retained', () => {
  assert.match(source, /beforeRgbaBase64: encode\(a\.pixels\), afterRgbaBase64: encode\(b\.pixels\)/);
  assert.match(source, /report\.partial\.json/); assert.match(source, /failure-state/);
  assert.match(source, /captureAtlas\(page, output, 'atlas-oblique-z8', false\)/);
  assert.match(source, /oblique\.pose\.pitch >= 35 && Math\.abs\(oblique\.pose\.bearing\) >= 20/);
  assert.match(source, /width: 390, height: 844/); assert.match(source, /pixels, bytes: png\.length/);
  assert.match(source, /within the same selected state/);
  assert.match(source, /Crossing click must hit the real map canvas, never a DOM label/);
});

test('integer native input convergence is bounded independently from strict raster quality', () => {
  assert.equal(ATLAS_CENTER_ERROR_PX, 1);
  assert.equal(atlasCenterReached([0.5289056300977041, 0.006431765995139872]), true);
  assert.equal(atlasCenterReached([-10.471094369846272, 0.006431765968129258]), false);
  for (const dx of [-1, 0, 1]) for (const dy of [-1, 0, 1]) assert.equal(atlasCenterReached([dx,dy]), true);
  for (const value of [[1.00001,0],[0,-1.00001],[NaN,0],[0,Infinity],[0]]) assert.equal(atlasCenterReached(value), false);
  assert.match(source, /errorCssPixels: delta/);
  assert.match(source, /maxAxisErrorCssPixels: ATLAS_CENTER_ERROR_PX/);
  // Changed navigation does not convert absent pixels or a missing centerline into a pass.
  assert.throws(() => assertRasterEvidence({ samples: [] }, 'missing raster'));
});
