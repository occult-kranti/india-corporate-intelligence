/** Portable tests only. No browser, WebGL implementation or GPU is started here. */
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { loadCaseExpectation } from './case-workspace-browser.mjs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname, join } from 'node:path';
import { THREE_RENDERER_OBSERVER_SOURCE_SHA256, selectCaseGraphicsFixtures, arrowEvidence, GRAPHICS_SCENARIOS, RESOURCE_KINDS, expectedPhysicalRect, expectedTarget, timingSummary, assertHandlePlateau, installCaseGraphicsProbe, runCaseGraphicsBrowserCases } from './case-graphics-browser.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function fixture() {
  class MockHandle {}
  class MockGL {
    VERSION = 1; RENDERER = 2; CURRENT_PROGRAM = 3; DRAW_FRAMEBUFFER_BINDING = 4; READ_FRAMEBUFFER_BINDING = 5; VIEWPORT = 6; SCISSOR_BOX = 7; SCISSOR_TEST = 8;
    drawingBufferWidth = 1440; drawingBufferHeight = 1000;
    getParameter(key) { return key === this.VERSION ? 'MOCK PORTABLE WebGL2' : key === this.RENDERER ? 'MOCK ONLY' : [this.VIEWPORT, this.SCISSOR_BOX].includes(key) ? new Int32Array([0, 0, 1440, 1000]) : null; }
    getExtension() { return null; }
    isContextLost() { return false; }
    isEnabled() { return false; }
    shaderSource() {}
    attachShader() {}
    pixelStorei() {}
    drawArrays() { return 'native-return'; }
    drawElements() { return 'native-return'; }
    drawArraysInstanced() { return 'native-return'; }
    drawElementsInstanced() { return 'native-return'; }
  }
  for (const kind of RESOURCE_KINDS) {
    MockGL.prototype[kind === 'Sync' ? 'fenceSync' : `create${kind}`] = function () { return new MockHandle(); };
    MockGL.prototype[`delete${kind}`] = function () {};
  }
  class MockCanvas extends EventTarget {
    constructor() { super(); this.gl = new MockGL(); this.isConnected = true; }
    getContext() { return this.gl; }
  }
  class DetailEvent extends Event { constructor(type, init) { super(type); this.detail = init.detail; } }
  const canvases = [], document = { querySelector: () => null, querySelectorAll: selector => selector === 'canvas' ? canvases : [] };
  const sandbox = { EventTarget, CustomEvent: DetailEvent, HTMLCanvasElement: MockCanvas, WebGL2RenderingContext: MockGL, document, performance, setTimeout, clearTimeout,
    requestAnimationFrame: callback => setTimeout(() => callback(performance.now()), 0) };
  sandbox.window = sandbox; vm.createContext(sandbox);
  vm.runInContext(`(${installCaseGraphicsProbe.toString()})(${JSON.stringify({ kinds: RESOURCE_KINDS })})`, sandbox);
  const canvas = new MockCanvas(); canvases.push(canvas); const gl = canvas.getContext('webgl2');
  return { sandbox, gl, canvas, probe: sandbox.__caseGraphicsProbe, observe: renderer => sandbox.__THREE_DEVTOOLS__.dispatchEvent(new DetailEvent('observe', { detail: renderer })) };
}

test('the eight required scenario IDs are unique and bounded to 40–46', () => {
  assert.equal(GRAPHICS_SCENARIOS.length, 8); assert.equal(new Set(GRAPHICS_SCENARIOS).size, 8);
  assert.ok(GRAPHICS_SCENARIOS.every(name => /^(?:40|41[ab]|42|43|44|45|46)-/.test(name)));
});
test('native helper independently maps CSS position and bottom-left buffer coordinates', () => {
  const canvas = { x: 0, y: 0, width: 1440, height: 1000, right: 1440, bottom: 1000 };
  const board = { x: 0, y: 300, width: 840, height: 700, right: 840, bottom: 1000 };
  assert.deepEqual(expectedPhysicalRect(board, canvas, { width: 2880, height: 2000 }), [0, 0, 1680, 1400]);
  assert.deepEqual(expectedPhysicalRect({ ...board, x: 7, right: 847 }, canvas, { width: 2880, height: 2000 }), [14, 0, 1680, 1400]);
  assert.throws(() => expectedPhysicalRect({ ...board, x: -2 }, canvas, { width: 1440, height: 1000 }));
});
test('target calculation keeps the original 1.5 DPR, 1024 dimension, 786432 pixel and 16-pixel bucket constraints', () => {
  assert.deepEqual(expectedTarget(800, 600, 1, 1), [800, 592]);
  assert.deepEqual(expectedTarget(800, 600, 1, .65), [512, 384]);
  assert.deepEqual(expectedTarget(800, 600, 2, 1), [1024, 768]);
  assert.deepEqual(expectedTarget(800, 600, 3, 1), [1024, 768]);
  for (const ratio of [1, 1.25, 1.5, 2, 3]) for (const quality of [1, .65]) {
    const [w, h] = expectedTarget(837.25, 701.75, ratio, quality);
    assert.ok(w <= 1024 && h <= 1024 && w * h <= 786432); assert.equal(w % 16, 0); assert.equal(h % 16, 0);
  }
});
test('timing summary reports actual samples without claiming FPS or a GPU benchmark', () => {
  assert.deepEqual(timingSummary([4, 1, 8, 2, 3]), { count: 5, minMs: 1, medianMs: 3, p95Ms: 8, maxMs: 8 });
  assert.throws(() => timingSummary([])); assert.throws(() => timingSummary([NaN])); assert.throws(() => timingSummary([-1]));
});
function plateau() {
  const baseline = { contextIds: [1], rendererIds: [2], live: Object.fromEntries(RESOURCE_KINDS.map(kind => [kind, 10])) };
  const cycles = Array.from({ length: 30 }, (_, index) => ({ ...structuredClone(baseline), cycle: index + 1, caseLive: 0, scenePasses: 2, compositePasses: 3 }));
  return { baseline, cycles };
}
test('handle plateau requires all thirty measured cycles and every resource kind', () => {
  const { baseline, cycles } = plateau(); assert.doesNotThrow(() => assertHandlePlateau(baseline, cycles));
  assert.throws(() => assertHandlePlateau(baseline, cycles.slice(1)));
  for (const kind of RESOURCE_KINDS) { const changed = structuredClone(cycles); changed[15].live[kind]++; assert.throws(() => assertHandlePlateau(baseline, changed), new RegExp(kind)); }
});
test('handle plateau rejects hidden context, renderer, ownership or no-draw regressions', () => {
  const { baseline, cycles } = plateau();
  for (const change of [row => row.contextIds.push(3), row => row.rendererIds.push(4), row => { row.caseLive = 1; }, row => { row.scenePasses = 0; }, row => { row.compositePasses = 0; }]) {
    const changed = structuredClone(cycles); change(changed[29]); assert.throws(() => assertHandlePlateau(baseline, changed));
  }
});
test('serialized browser init runs against declared MOCK boundaries and preserves native returns', () => {
  const { canvas, gl, probe } = fixture(); assert.equal(canvas.getContext('webgl2'), gl);
  const initial = probe.read(); assert.equal(initial.contexts.length, 1); assert.equal(initial.contexts[0].version, 'MOCK PORTABLE WebGL2');
  assert.equal(gl.drawArrays(4, 0, 3), 'native-return'); assert.equal(probe.read().contexts[0].totalDraws, 1);
  assert.equal(probe.read().allPasses, 0, 'Mock execution must not manufacture accepted GL boundary passes');
});
test('mock create/delete handles are tracked once per native allocation and exact context', () => {
  const { gl, probe } = fixture();
  for (const kind of RESOURCE_KINDS) {
    const handle = gl[kind === 'Sync' ? 'fenceSync' : `create${kind}`]();
    assert.equal(probe.read().contexts[0].live[kind], 1); gl[`delete${kind}`](handle); gl[`delete${kind}`](handle); gl[`delete${kind}`](null);
    assert.equal(probe.read().contexts[0].live[kind], 0); assert.equal(probe.read().contexts[0].created[kind], 1); assert.equal(probe.read().contexts[0].deleted[kind], 1);
  }
});
test('read-only Three constructor observer records exact identity and does not duplicate it', () => {
  const { observe, gl, canvas, probe } = fixture();
  const renderer = { isWebGLRenderer: true, getContext: () => gl, domElement: canvas };
  observe({ isWebGLRenderer: false }); observe(renderer); observe(renderer);
  const actual = probe.read(); assert.equal(actual.renderers.length, 1);
  assert.equal(actual.renderers[0].contextId, actual.contexts[0].id); assert.equal(actual.renderers[0].canvasId, actual.contexts[0].canvasId);
  assert.deepEqual(Object.keys(renderer).sort(), ['domElement', 'getContext', 'isWebGLRenderer']);
});
test('unsupported native context-loss capability fails closed instead of synthetic event success', () => {
  const { probe } = fixture(); assert.throws(() => probe.loseContext(), /Required WEBGL_lose_context capability unavailable/); assert.equal(probe.read().lost.length, 0);
});
test('unknown options and unbounded animation-frame requests are rejected', async () => {
  const { probe } = fixture(); assert.throws(() => probe.configure({ runtimePatch: true }), /Unknown probe option/);
  await assert.rejects(probe.frames(10000), /Invalid bounded frame sample/);
});
test('shader fault cannot affect a non-case shader or any shader outside an owned pass', () => {
  const { gl, probe } = fixture(); probe.configure({ fault: { type: 'shader', fired: false } });
  const shader = gl.createShader(); gl.shaderSource(shader, 'float grain=fract(sin(dot(floor(gl_FragCoord.xy)');
  assert.equal(probe.read().fault.fired, false); assert.equal(probe.read().contexts[0].faultEvents.length, 0);
});
test('module contains no local browser launcher, runtime mutation or fixed-sleep calls', async () => {
  const source = await readFile(resolve(root, 'spatial-prototype/scripts/case-graphics-browser.mjs'), 'utf8');
  assert.doesNotMatch(source, /from ['"]playwright|chromium\.launch|launchPersistentContext|\.waitForTimeout\(|renderer\.render\s*=/);
  assert.match(source, /native-webgl\.json/); assert.match(source, /postPoisonThreeDraws/); assert.match(source, /terminalRestoreObserved/);
  assert.match(source, /invalidate: false, afterPass: movementStart/); assert.match(source, /deviceScaleFactor: dpr/);
});
test('installed Three observer and public case callback source contracts are present', async () => {
  const three = await readFile(resolve(root, 'spatial-prototype/node_modules/three/src/renderers/WebGLRenderer.js'), 'utf8');
  assert.equal(createHash('sha256').update(three).digest('hex'), THREE_RENDERER_OBSERVER_SOURCE_SHA256);
  assert.match(three, /__THREE_DEVTOOLS__\.dispatchEvent\( new CustomEvent\( 'observe', \{ detail: this \} \) \)/);
  const layer = await readFile(resolve(root, 'spatial-prototype/src/case-scene/CaseSceneLayer.ts'), 'utf8');
  assert.match(layer, /prerender=/); assert.match(layer, /render=/); assert.match(layer, /float grain=fract\(sin\(dot\(floor\(gl_FragCoord\.xy\)/);
  const boundary = await readFile(resolve(root, 'spatial-prototype/src/case-scene/gl-boundary.ts'), 'utf8');
  assert.match(boundary, /gl\.isContextLost\(\)/); assert.match(boundary, /gl\.UNPACK_SKIP_ROWS,gl\.UNPACK_SKIP_IMAGES\]/);
});
test('actual acceptance runner refuses local execution before reading sources or using a browser', async () => {
  if (process.env.GITHUB_ACTIONS === 'true' && process.env.SPATIAL_BROWSER_REVIEW === 'github-actions') return;
  await assert.rejects(runCaseGraphicsBrowserCases({}), /Actual browser execution is restricted/);
});


test('native scenario fixtures exist in the exact accepted nineteen-case catalog', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'portable-case-graphics-'));
  try {
    const { catalog } = await loadCaseExpectation(resolve(root, 'spatial-prototype'), temporary);
    const { simple, dense } = selectCaseGraphicsFixtures(catalog.cases);
    assert.equal(simple.id, 'case:usa-thiel'); assert.equal(simple.edges.length, 2); assert.equal(simple.nodes.length, 3);
    assert.equal(dense.id, 'case:usa-alphabet-founders'); assert.equal(dense.edges.length, 11);
    assert.throws(() => selectCaseGraphicsFixtures([]));
    const changed = structuredClone(catalog.cases); const thiel = changed.find(file => file.profileId === simple.profileId);
    thiel.edges[1].to = thiel.edges[0].to; assert.throws(() => selectCaseGraphicsFixtures(changed));
  } finally { await rm(temporary, { recursive: true, force: true }); }
});
function directedArrowFixture() {
  const file = { id: 'portable-mock-directed-role', edges: [{ id: 'first', from: 'a', to: 'b' }, { id: 'second', from: 'b', to: 'c' }] };
  const frame = { rect: { x: 0, y: 0, width: 100, height: 100 }, nodes: [{ id: 'a', x: 17, y: 17, width: 6, height: 6 }, { id: 'b', x: 57, y: 17, width: 6, height: 6 }, { id: 'c', x: 57, y: 67, width: 6, height: 6 }] };
  const ndc = ([x, y]) => [x / 50 - 1, 1 - y / 50, 0];
  const positions = [[55,20],[47,16],[47,24],[55,70],[47,66],[47,74]].map(ndc);
  const draw = { shaderKind: 'arrows', sequence: 12, positions, color: [1, .8, .6], pixelSamples: [{ pixel: [52, 80], rgba: [255, 204, 153, 255] }] };
  return { file, frame, data: { contexts: [{ draws: [draw] }] } };
}
test('portable arrow oracle requires every exact directed target and actual sampled color', () => {
  const { file, frame, data } = directedArrowFixture(); const result = arrowEvidence(data, frame, file);
  assert.deepEqual(result.matches.map(match => match.edgeId), ['first', 'second']);
  const reversed = structuredClone(data); [reversed.contexts[0].draws[0].positions[0], reversed.contexts[0].draws[0].positions[1]] = [reversed.contexts[0].draws[0].positions[1], reversed.contexts[0].draws[0].positions[0]];
  assert.throws(() => arrowEvidence(reversed, frame, file), /points away/);
  const missing = structuredClone(data); missing.contexts[0].draws[0].positions.length = 3; assert.throws(() => arrowEvidence(missing, frame, file));
  const black = structuredClone(data); black.contexts[0].draws[0].pixelSamples[0].rgba = [0,0,0,255]; assert.throws(() => arrowEvidence(black, frame, file), /shader color/);
});
