/** Portable contract/model checks only. Never launches a browser or WebGL. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ATLAS_EDGE, CASE_EDGE, CROSSING_CENTER, REQUIRED_ZOOMS, BASELINE_COMMIT,
  requireAuthorizedCI, parseMode, mercator, panDelta, clipSegment, assertRasterEvidence, recordCheck,
  installThreadZoomProbe } from './thread-zoom-browser.mjs';

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
