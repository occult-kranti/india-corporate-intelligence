/** Portable contract/model checks only. Never launches a browser or WebGL. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';
import { deflateSync, gunzipSync } from 'node:zlib';
import { ATLAS_EDGE, CASE_EDGE, CROSSING_CENTER, REQUIRED_ZOOMS, BASELINE_COMMIT,
  requireAuthorizedCI, parseMode, mercator, panDelta, clipSegment, assertRasterEvidence, recordCheck,
  installThreadZoomProbe, dragOffsets, findClearGesture, navigationSnapshot, atlasCenterReached, ATLAS_CENTER_ERROR_PX,
  analyzePathRaster, assertPathEvidence, assertExactSourceLinks, decodeScreenshotPng, loadAtlasSourceReference, writeRasterReport,
  ATLAS_COINCIDENT_ORIGINALS, matchCoincidentOriginalPath, traceAtlasContributions } from './thread-zoom-browser.mjs';

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
function portableStrip(paint=region=>paintRect(region,0,160,63,65),expected={kind:'atlas',points:[[-100,64],[260,64]],nominalWidthCss:2.2}) {
  const region=()=>({pixels:new Uint8Array(160*128*4),width:160,height:128,x:320,y:186,sx:1,sy:1,cssLeft:0,cssTop:0});
  const before=region(),after=region();paint(after);return analyzePathRaster(before,after,expected);
}
function paintRect(region,x0,x1,y0,y1,contrast=100) {
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)for(let c=0;c<3;c++)region.pixels[(y*region.width+x)*4+c]=contrast;
}
function rasterFrames(rasters) {
  const draws=rasters.map((raster,i)=>({drawId:i,frameToken:i,observationOrdinal:i,edgeId:ATLAS_EDGE,sourceIds:ATLAS_COINCIDENT_ORIGINALS[0].sourceIds,
    pathMatch:{targetMeshUuid:'original',meshUuid:'original'},nativePositionBufferMatched:true,raster,poseKey:'settled',meshUuid:'original',programId:1,positionBufferId:2,material:{type:'MeshStandardMaterial',opacity:.9},nativeOpacity:Math.fround(.9)}));
  return {kind:'atlas',meshUuid:'original',finalPoseKey:'settled',canvas:{width:800,height:500},buffer:{width:800,height:500},contextLost:false,draws,
    frames:draws.map(draw=>({token:draw.drawId,complete:true,poseKey:'settled',drawIds:[draw.drawId],composites:[],finalCanvas:{raster:draw.raster,sourceDrawId:draw.drawId,poseKey:'settled',meshUuid:'original',programId:1,defaultFramebuffer:true,colorAgreementTolerance255:8,
      contributions:[{...draw,raster:undefined}]}})),
    screenshotEvidence:{raster:rasters.at(-1)}};
}
const raster=()=>{const r=portableStrip();return rasterFrames([r,r,r]);};
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
  assert.match(source, /readPixels immediately before\/after the exact original thread draw/);
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

test('original-path support rejects every audited disconnected/truncated/thick/faint counterexample', () => {
  assert.doesNotThrow(()=>assertPathEvidence(portableStrip(),'control'));
  const negatives={
    disconnected:r=>{paintRect(r,0,80,40,42);paintRect(r,80,160,80,82);},
    short_survivor:r=>paintRect(r,72,88,63,65),
    disconnected_on_path:r=>{paintRect(r,0,79,63,65);paintRect(r,81,160,63,65);},
    eighty_pixel_smear:r=>paintRect(r,0,160,24,104),
    two_of_255_contrast:r=>paintRect(r,0,160,63,65,2),
    displaced_centerline:r=>paintRect(r,0,160,71,73),
    absent:()=>{},
  };
  for(const [name,paint]of Object.entries(negatives)) {
    const candidate=portableStrip(paint);assert.throws(()=>assertPathEvidence(candidate,name),name);
    assert.throws(()=>assertRasterEvidence(rasterFrames([candidate,candidate,candidate]),name),name);
  }
});
test('later absent, stale, missing-composite and hidden screenshot frames cannot borrow an early pass',()=>{
  const good=portableStrip(),absent=portableStrip(()=>{});
  assert.throws(()=>assertRasterEvidence(rasterFrames([good,absent,absent]),'early good late absent'));
  const lastMissing=raster();lastMissing.frames.at(-1).finalCanvas={error:'late draw absent'};assert.throws(()=>assertRasterEvidence(lastMissing,'late missing'));
  const stale=raster();stale.frames.at(-1).poseKey='earlier';assert.throws(()=>assertRasterEvidence(stale,'stale pose'));
  const hidden=raster();hidden.screenshotEvidence.raster=absent;assert.throws(()=>assertRasterEvidence(hidden,'hidden in screenshot'));
  const caseRow=raster();caseRow.kind='case';caseRow.draws.forEach(d=>d.textureId=3);assert.throws(()=>assertRasterEvidence(caseRow,'FBO without canvas composite'));
  caseRow.frames.forEach(f=>f.composites=[{textureId:4,defaultFramebuffer:true}]);assert.throws(()=>assertRasterEvidence(caseRow,'wrong native composite texture'));
  caseRow.frames.forEach(f=>f.composites=[{textureId:3,defaultFramebuffer:true}]);assert.doesNotThrow(()=>assertRasterEvidence(caseRow,'exact original texture composite'));
});
test('redundant same-frame zero-delta overdraw is not itself a disappearance',()=>{
  const row=raster(),absent=portableStrip(()=>{});
  row.draws.push({drawId:3,nativePositionBufferMatched:true,raster:absent,poseKey:'settled'});row.frames[0].drawIds.push(3);
  assert.doesNotThrow(()=>assertRasterEvidence(row,'one visible original contribution survives redundant overdraw'));
  assert.doesNotMatch(installThreadZoomProbe.toString(),/capture\.draws\.length < 8/);
});
test('native final-frame provenance and precise original-path projection stay observation-only',()=>{
  const probe=installThreadZoomProbe.toString();
  assert.match(probe,/frameTimestamp = timestamp/);assert.match(probe,/queueMicrotask/);
  assert.match(probe,/getFramebufferAttachmentParameter/);assert.match(probe,/textureId===sourceRecord\.textureId/);
  assert.match(probe,/frame\.matrix/);assert.match(probe,/curve\.getSpacedPoints\(48\)/);
  assert.match(probe,/Original segment\/ring path mapping changed/);assert.match(probe,/ELEMENT_ARRAY_BUFFER_BINDING/);
  assert.match(probe,/aThreadRadial/);assert.match(probe,/nativeProjectionMatrix:projection/);
  assert.match(source,/verifyScreenshotCrossing/);assert.match(source,/displayed\.some\(p=>p\.supported/);
  assert.doesNotMatch(probe,/\.getSpacedPoints\(48\)\.map\(p=>.*aThreadClip/);
});
test('source access requires exact IDs and usable URLs, not an unrelated HTTPS anchor',()=>{
  const expected=[{sourceId:'selected-source',href:'https://source.example/original.pdf'}];
  assert.doesNotThrow(()=>assertExactSourceLinks(expected,expected,'selected'));
  for(const actual of [[],[{sourceId:'other-source',href:expected[0].href}],[{sourceId:'selected-source',href:null}],[{sourceId:'selected-source',href:'https://unrelated.example/'}]])assert.throws(()=>assertExactSourceLinks(actual,expected,'selected'));
  assert.match(source,/Source trail/);assert.match(source,/article\[data-claim-id=/);assert.match(source,/Inspect selected claim/);
  assert.doesNotMatch(source,/workspace-evidence.*a\[href\^=/);
});
test('PNG screenshot decoder preserves RGB/RGBA pixels and every standard filter',()=>{
  const chunk=(name,data)=>{const result=Buffer.alloc(12+data.length);result.writeUInt32BE(data.length);result.write(name,4);data.copy(result,8);return result;};
  for(const channels of [3,4]) {
    const width=3,height=5,stride=width*channels,scan=Buffer.from(Array.from({length:stride*height},(_,i)=>(i*19+7)%256)),raw=Buffer.alloc((stride+1)*height);
    const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
    for(let y=0;y<height;y++){raw[y*(stride+1)]=y;for(let x=0;x<stride;x++){const a=x>=channels?scan[y*stride+x-channels]:0,b=y?scan[(y-1)*stride+x]:0,c=y&&x>=channels?scan[(y-1)*stride+x-channels]:0;raw[y*(stride+1)+x+1]=(scan[y*stride+x]-[0,a,b,Math.floor((a+b)/2),paeth(a,b,c)][y])&255;}}
    const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=channels===4?6:2;
    const png=Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]),decoded=decodeScreenshotPng(png);
    assert.equal(decoded.width,width);assert.equal(decoded.height,height);
    for(let i=0;i<width*height;i++)for(let c=0;c<4;c++)assert.equal(decoded.pixels[i*4+c],c===3&&channels===3?255:scan[i*channels+c]);
  }
});


test('accepted original atlas source reference is integrity-checked independently of the DOM',async()=>{
  const reference=await loadAtlasSourceReference();
  assert.equal(reference.sourceId,'legacy:source:8c9d47878789e779');
  assert.equal(reference.url,'https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=1573010');
  assert.equal(reference.receipts.length,2);
  assert.deepEqual(reference.coincidentOriginals,ATLAS_COINCIDENT_ORIGINALS);
  assert.equal(reference.coincidentOriginals.length,4);assert.ok(reference.coincidentReceipts.length>=2);
});


test('raw artifact persistence deduplicates losslessly without dropping any frame or screenshot',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'native-pixels-'));
  try {
    const bytes=Buffer.from([0,1,2,255,127,128,129,255]),encoded=bytes.toString('base64');
    const report={draws:[{beforeRgbaBase64:encoded,afterRgbaBase64:encoded}],frames:[{canvasRgbaBase64:encoded}],screenshot:{screenshotRgbaBase64:encoded}};
    await writeRasterReport(report,directory);
    assert.equal(report.rawRasterArtifacts.uniqueFiles,1);assert.equal(report.draws.length,1);assert.equal(report.frames.length,1);
    assert.deepEqual(gunzipSync(await readFile(join(directory,report.draws[0].beforeRgba.file))),bytes);
    assert.equal(report.frames[0].canvasRgba.sha256,report.screenshot.screenshotRgba.sha256);
    assert.doesNotMatch(await readFile(join(directory,'report.json'),'utf8'),/RgbaBase64/);
  }finally{await rm(directory,{recursive:true,force:true});}
});


test('gap/continuity analysis respects intended dash intervals and rejects missing dash cores',()=>{
  const expected={kind:'case',points:[[0,64,0],[160,64,160]],nominalWidthCss:1.5,dash:{period:16,stops:[8,16]}};
  const dashed=portableStrip(r=>{for(let x=0;x<160;x+=16)paintRect(r,x,x+8,63,65);},expected);
  assert.doesNotThrow(()=>assertPathEvidence(dashed,'intended dashes'));
  const missing=portableStrip(r=>{for(let x=0;x<160;x+=32)paintRect(r,x,x+8,63,65);},expected);
  assert.throws(()=>assertPathEvidence(missing,'missing intended dash intervals'));
});
test('failed raster messages remain concise and never include raw pixels',()=>{
  const row=raster();row.draws.forEach(draw=>draw.raster.changedPixels=0);
  try{assertRasterEvidence(row,'absence');assert.fail('Expected failure');}catch(error){assert.ok(error.message.length<500);assert.doesNotMatch(error.message,/RgbaBase64/);}
});

function contributionFixture() {
  const descriptor=(edgeId,meshUuid,reverse=false)=>({edgeId,meshUuid,type:'CatmullRomCurve3',closed:false,curveType:'centripetal',tension:.5,
    points:(reverse?[[.8,.6,0],[.71,.58,.001],[.65,.55,.002],[.59,.52,.001],[.5,.5,0]]:[[.5,.5,0],[.59,.52,.001],[.65,.55,.002],[.71,.58,.001],[.8,.6,0]])});
  const region=()=>{const r={pixels:new Uint8Array(160*128*4),width:160,height:128,x:320,y:186,sx:1,sy:1,cssLeft:0,cssTop:0};r.pixels.fill(40);return r;};
  const clone=r=>({...r,pixels:new Uint8Array(r.pixels)}),before=region(),after=clone(before);paintRect(after,0,160,63,65,160);
  const expected={kind:'atlas',points:[[-100,64],[260,64]],nominalWidthCss:2.2,sourceCount:1,projectionMatrix:[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],lift:1};
  const target=descriptor(ATLAS_EDGE,'original');
  const source={drawId:0,frameToken:0,observationOrdinal:0,edgeId:ATLAS_EDGE,sourceIds:ATLAS_COINCIDENT_ORIGINALS[0].sourceIds,meshUuid:'original',programId:1,positionBufferId:2,
    nativePositionBufferMatched:true,poseKey:'settled',material:{type:'MeshStandardMaterial',opacity:.9},nativeOpacity:Math.fround(.9),expected,
    pathMatch:matchCoincidentOriginalPath(target,target),_source:{before,after,expected}};
  source.raster=analyzePathRaster(before,after,expected);
  const fixture=ATLAS_COINCIDENT_ORIGINALS[2],repaint=clone(after);paintRect(repaint,0,160,63,65,172);
  const later={...source,drawId:undefined,contributionId:0,observationOrdinal:1,edgeId:fixture.edgeId,sourceIds:fixture.sourceIds,meshUuid:'coincident',positionBufferId:3,
    pathMatch:matchCoincidentOriginalPath(target,descriptor(fixture.edgeId,'coincident',true)),_source:{before:after,after:repaint,expected}};
  const run=(draws=[later],final=repaint)=>{const result=traceAtlasContributions(source,draws,final,ATLAS_COINCIDENT_ORIGINALS);return {...result,raster:analyzePathRaster(result.before,result.after,expected)};};
  return {source,later,before,after,repaint,expected,descriptor,clone,run};
}
test('original curve coincidence requires the entire existing forward/reverse curve within double roundoff',()=>{
  const {descriptor}=contributionFixture(),target=descriptor(ATLAS_EDGE,'original'),candidate=descriptor(ATLAS_COINCIDENT_ORIGINALS[1].edgeId,'other',true);
  assert.equal(matchCoincidentOriginalPath(target,candidate).direction,'reverse');
  const altered=structuredClone(candidate);altered.points[2][0]+=.00001;assert.equal(matchCoincidentOriginalPath(target,altered),null,'Shared endpoints or screen crossings cannot establish coincidence');
  for(const change of [r=>r.type='LineCurve3',r=>r.tension=.6,r=>r.closed=true,r=>r.points[2][0]=NaN]){const wrong=structuredClone(candidate);change(wrong);assert.equal(matchCoincidentOriginalPath(target,wrong),null);}
});
test('same-frame verified original repaint preserves exact target proof and the unchanged 8/255 final agreement',()=>{
  const f=contributionFixture(),result=f.run();assert.doesNotThrow(()=>assertPathEvidence(result.raster,'observed original repaint'));
  assert.equal(result.targetChangedPixels,320);assert.equal(result.retainedPixels,320);assert.equal(result.colorAgreementTolerance255,8);
  assert.deepEqual(result.contributions.map(r=>r.edgeId),[ATLAS_EDGE,ATLAS_COINCIDENT_ORIGINALS[2].edgeId]);
  assert.equal(result.contributions[1].changedPixels,320);assert.equal(result.contributions[1].restartedPixels,0);
  const oldComparison=f.run([],f.repaint);assert.equal(oldComparison.retainedPixels,0,'A later actual paint must be observed; matching a fitted blend is not allowed');
  const boundary=f.clone(f.repaint);paintRect(boundary,0,160,63,65,180);assert.equal(f.run([f.later],boundary).retainedPixels,320);
  paintRect(boundary,0,160,63,65,181);assert.equal(f.run([f.later],boundary).retainedPixels,0);
  const serialized=runInNewContext(`(${traceAtlasContributions.toString()})`,{})(f.source,[f.later],f.repaint,ATLAS_COINCIDENT_ORIGINALS);
  assert.equal(serialized.retainedPixels,result.retainedPixels,'The browser-serialized helper is independent of Node module globals');
});
test('unrelated later paint and wrong source, mesh, buffer, curve, frame or projection cannot repair the final strip',()=>{
  const changes={unrelated:r=>r.edgeId='unrelated-edge',wrongSource:r=>r.sourceIds=['wrong-source'],wrongMesh:r=>r.meshUuid='another-mesh',
    wrongBuffer:r=>r.nativePositionBufferMatched=false,wrongFrame:r=>r.frameToken=1,wrongPose:r=>r.poseKey='earlier',wrongProjection:r=>r.expected={...r.expected,lift:.5},
    wrongPath:r=>r.pathMatch={...r.pathMatch,candidateControlPoints:r.pathMatch.candidateControlPoints.map((p,i)=>i===2?[p[0]+.001,p[1],p[2]]:p)}};
  for(const [name,change]of Object.entries(changes)) {
    const f=contributionFixture(),bad={...f.later};change(bad);const result=f.run([bad]);
    assert.equal(result.retainedPixels,0,name);assert.equal(result.rejectedContributions.length,1,name);assert.throws(()=>assertPathEvidence(result.raster,name));
  }
});
test('a later no-op original draw cannot copy an unrelated occluder into the known contribution chain',()=>{
  const f=contributionFixture(),occluder=f.clone(f.repaint);paintRect(occluder,0,160,63,65,220);
  const noop={...f.later,_source:{...f.later._source,before:occluder,after:occluder}};
  const hidden=f.run([noop],occluder);assert.equal(hidden.retainedPixels,0);assert.equal(hidden.contributions[1].changedPixels,0);
  assert.throws(()=>assertPathEvidence(hidden.raster,'opaque occluder followed by no-op original'));
  const faint=f.clone(occluder);paintRect(faint,0,160,63,65,222);
  const repainted=f.run([{...noop,_source:{...noop._source,after:faint}}],faint);
  assert.equal(repainted.contributions[1].restartedPixels,320);assert.equal(repainted.raster.path.contrast255.p50,2);
  assert.throws(()=>assertPathEvidence(repainted.raster,'unknown occluder contrast cannot be borrowed by a 2/255 repaint'));
});
test('absent original target, disappearing final pixels and screenshot obstruction still fail with a valid coincident repaint',()=>{
  const f=contributionFixture();assert.throws(()=>assertPathEvidence(f.run([f.later],f.before).raster,'late disappearance'));
  const absent={...f.source,_source:{...f.source._source,after:f.before}};
  assert.throws(()=>traceAtlasContributions(absent,[f.later],f.repaint,ATLAS_COINCIDENT_ORIGINALS),/cannot replace an absent original target/);
  const row=raster(),good=f.run().raster;row.screenshotEvidence.raster=portableStrip(()=>{});
  assert.throws(()=>assertRasterEvidence(row,'DOM obstruction after native contributions'),/displayed screenshot/);
  assert.doesNotThrow(()=>assertPathEvidence(good,'native canvas remains supported independently'));
});

test('the four accepted retained edges produce exactly coincident original scene curves, with unchanged source counts',async()=>{
  const root=dirname(dirname(path)),sceneSource=await readFile(join(root,'src/scene.ts'),'utf8');
  const curveFunction=sceneSource.slice(sceneSource.indexOf('function geographicCurve('),sceneSource.indexOf('\nexport class EvidenceWorld'));
  const compiled=await build({stdin:{contents:curveFunction.replace('function geographicCurve','export function geographicCurve'),loader:'ts'},format:'cjs',write:false,logLevel:'silent'});
  const THREE=await import('three'),{MercatorCoordinate}=await import('maplibre-gl'),module={exports:{}};
  runInNewContext(compiled.outputFiles[0].text,{module,exports:module.exports,THREE,coordinate:anchor=>{const c=MercatorCoordinate.fromLngLat([anchor.lng,anchor.lat]);return new THREE.Vector3(c.x,c.y,c.z);}});
  const model=await build({stdin:{contents:"export {buildEvidenceScene} from './src/model.ts'; export {getNodeAnchor} from './src/geography.ts';",resolveDir:root},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
  const {buildEvidenceScene,getNodeAnchor}=await import(`data:text/javascript;base64,${Buffer.from(model.outputFiles[0].text).toString('base64')}`);
  const directory=join(root,'public/data/registry'),manifest=JSON.parse(await readFile(join(directory,'manifest.json'),'utf8')),input={};
  for(const group of manifest.arrays)input[group.key]=(await Promise.all(group.chunks.map(async chunk=>JSON.parse(await readFile(join(directory,chunk.file),'utf8'))))).flat();
  const scene=buildEvidenceScene(input);let target;const directions=[];
  for(const fixture of ATLAS_COINCIDENT_ORIGINALS) {
    const edge=scene.edges.find(edge=>edge.id===fixture.edgeId);assert.equal(edge.sourceCount,fixture.sourceIds.length);
    const curve=module.exports.geographicCurve(getNodeAnchor(scene.nodes.find(n=>n.id===edge.from)),getNodeAnchor(scene.nodes.find(n=>n.id===edge.to)));
    const descriptor={edgeId:edge.id,meshUuid:edge.id,type:curve.type,closed:curve.closed,curveType:curve.curveType,tension:curve.tension,points:curve.points.map(p=>p.toArray())};
    target??=descriptor;const match=matchCoincidentOriginalPath(target,descriptor);assert.ok(match);assert.equal(match.maxControlPointError,0);directions.push(match.direction);
  }
  assert.deepEqual(directions,['forward','reverse','forward','reverse']);
});
