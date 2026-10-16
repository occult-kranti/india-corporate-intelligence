/** CI-only actual-WebGL case acceptance. No browser launcher lives in this module.
 * Native probes observe real WebGL calls; portable tests do not run these scenarios.
 * Handle deletion requests are observable lifecycle evidence, never GPU-memory proof. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { compactLifecycleObservation, caseLifecycleObservationInitSource } from './case-lifecycle-observation.mjs';
import {
  loadCaseExpectation, caseWorkspace, caseSurface, caseRail, caseSourceDialog,
  openCaseWorkspace, chooseCase, showCaseScene, showCompleteCaseReader,
  assertCompleteCaseReader, assertCaseFrame, caseWorkspaceDiagnostics,
  captureCaseChromeBaseline, assertCaseChromeActive, assertCaseChromeRestored,
} from './case-workspace-browser.mjs';

export const THREE_RENDERER_OBSERVER_SOURCE_SHA256 = '35cea4871231c3fddc3517dcd03fc876bdb8f9e73f1a77042b35e3de0498c4cd';
export const GRAPHICS_SCENARIOS = Object.freeze([
  '40-shared-renderer-native-gl-boundary-and-arrows',
  '41a-native-viewport-resize-position-quality-dpr1',
  '41b-native-viewport-resize-position-quality-dpr2',
  '42-interrupted-travel-close-and-explicit-recreation',
  '43-real-context-loss-preserves-case-reader',
  '44-case-shader-failure-retains-reader-and-host',
  '45-owned-render-exception-blocks-poisoned-renderer',
  '46-thirty-cycle-native-resource-handle-plateau',
]);
export const GRAPHICS_SMOKE_SCENARIOS = Object.freeze([GRAPHICS_SCENARIOS[0]]);
export const RESOURCE_DIAGNOSTIC_SCENARIOS = Object.freeze([GRAPHICS_SCENARIOS[7]]);
/** Full remains the default; named focused modes never establish full acceptance. */
export function parseCaseGraphicsReviewMode(args) {
  assert.ok(Array.isArray(args), 'Browser review arguments must be an array');
  if (args.length === 0) return 'full';
  if (args.length === 1 && args[0] === '--early-scene-smoke') return 'early-scene-smoke';
  assert.deepEqual(args, ['--resource-lifecycle-diagnostic'], 'Only explicit --early-scene-smoke or --resource-lifecycle-diagnostic review arguments are supported');
  return 'resource-lifecycle-diagnostic';
}
export function selectCaseGraphicsScenarios(mode = 'full') {
  assert.ok(['full', 'early-scene-smoke', 'resource-lifecycle-diagnostic'].includes(mode), 'Unknown case graphics review mode');
  return mode === 'full' ? GRAPHICS_SCENARIOS : mode === 'early-scene-smoke' ? GRAPHICS_SMOKE_SCENARIOS : RESOURCE_DIAGNOSTIC_SCENARIOS;
}
export const RESOURCE_KINDS = Object.freeze(['Buffer', 'Texture', 'Framebuffer', 'Renderbuffer', 'Program', 'Shader', 'VertexArray', 'Query', 'Sampler', 'TransformFeedback', 'Sync']);
const Q = JSON.stringify;
const edgeButton = (page, id) => caseWorkspace(page).locator(`.ocv2-evidence [data-edge-id=${Q(id)}] button`);
const controls = page => caseWorkspace(page).locator('.ocv2-evidence').getByRole('navigation', { name: 'Case views and history' });

export function expectedPhysicalRect(board, canvas, buffer) {
  assert.ok(board.width > 0 && board.height > 0 && canvas.width > 0 && canvas.height > 0);
  assert.ok(board.x >= canvas.x - .5 && board.y >= canvas.y - .5 && board.right <= canvas.right + .5 && board.bottom <= canvas.bottom + .5, 'Board must fit the shared canvas');
  const x = Math.max(0, Math.round((board.x - canvas.x) * buffer.width / canvas.width));
  const y = Math.max(0, Math.round((canvas.bottom - board.bottom) * buffer.height / canvas.height));
  return [x, y, Math.min(buffer.width, Math.round((board.right - canvas.x) * buffer.width / canvas.width)) - x,
    Math.min(buffer.height, Math.round((canvas.bottom - board.y) * buffer.height / canvas.height)) - y];
}
/** Independent contractual calculation. Does not import production targetSize. */
export function expectedTarget(width, height, ratio, quality) {
  const physical = [width, height].map(value => value * Math.min(ratio, 1.5) * quality);
  const scale = Math.min(1, 1024 / physical[0], 1024 / physical[1], Math.sqrt(786432 / (physical[0] * physical[1])));
  return physical.map(value => Math.max(1, Math.floor(value * scale / 16) * 16));
}
export function timingSummary(values) {
  assert.ok(values.length && values.every(value => Number.isFinite(value) && value >= 0));
  const sorted = [...values].sort((a, b) => a - b);
  return { count: values.length, minMs: sorted[0], medianMs: sorted[Math.floor((sorted.length - 1) * .5)], p95Ms: sorted[Math.ceil(sorted.length * .95) - 1], maxMs: sorted.at(-1) };
}
export function assertHandlePlateau(baseline, cycles) {
  assert.equal(cycles.length, 30, 'Exactly thirty measured closed cycles are required');
  for (const row of cycles) {
    assert.deepEqual(row.contextIds, baseline.contextIds, `Cycle ${row.cycle}: allocated a new WebGL context`);
    assert.deepEqual(row.rendererIds, baseline.rendererIds, `Cycle ${row.cycle}: allocated another Three renderer`);
    for (const kind of RESOURCE_KINDS) assert.ok(row.live[kind] <= baseline.live[kind], `Cycle ${row.cycle}: ${kind} handles did not return to the warmed baseline (${row.live[kind]} > ${baseline.live[kind]})`);
    assert.equal(row.caseLive, 0, `Cycle ${row.cycle}: a case-owned native handle has no deletion request`);
    assert.ok(row.scenePasses > 0 && row.compositePasses > 0, `Cycle ${row.cycle}: no real case drawing`);
  }
}

/** Serialized by addInitScript. All helpers must remain inside this function.
 * Only native canvas/GL methods are wrapped. The existing Three r180 constructor
 * observer is read-only; no app debug API, module patch, renderer monkeypatch or
 * synthetic replacement renderer/context is used. */
export function installCaseGraphicsProbe({ kinds, caseAssetPattern = '/attachScene-[^/]+\\.js' }) {
  const nativeCanvas = HTMLCanvasElement.prototype.getContext;
  const contexts = [], renderers = [], ids = new WeakMap(); let nextId = 1, sequence = 0;
  const id = value => value == null ? null : (ids.has(value) ? ids.get(value) : (ids.set(value, nextId), nextId++));
  const clone = value => ArrayBuffer.isView(value) ? Array.from(value) : Array.isArray(value) ? value.map(clone)
    : value && typeof value === 'object' ? (Object.getPrototypeOf(value) === Object.prototype ? Object.fromEntries(Object.entries(value).map(([key, child]) => [key, clone(child)])) : id(value)) : value;
  const keep = (list, value, limit = 1000) => { list.push(value); if (list.length > limit) list.shift(); };
  const caseAsset = new RegExp(caseAssetPattern), clock = () => performance.now();
  const shared = { fault: null, challenge: null, pixelReads: false, contexts: [], renderers: [], errors: [], events: [], lost: [], restored: [], frameTimes: [], allPasses: 0 };
  const observer = new EventTarget();
  observer.addEventListener('observe', event => {
    const renderer = event.detail;
    if (!renderer?.isWebGLRenderer) return;
    if (renderers.includes(renderer)) return;
    renderers.push(renderer);
    shared.renderers.push({ id: id(renderer), contextId: id(renderer.getContext()), canvasId: id(renderer.domElement), observedAt: clock() });
  });
  if (typeof window.__THREE_DEVTOOLS__ !== 'undefined') throw new Error('Case probe will not replace an existing Three devtools observer');
  window.__THREE_DEVTOOLS__ = observer;
  const rendererState = renderer => {
    const vector = method => { const target = { copy(value) { this.value = [value.x, value.y, value.z, value.w]; return this; } }; renderer[method](target); return target.value; };
    const color = { copy(value) { this.value = [value.r, value.g, value.b]; return this; } }; renderer.getClearColor(color);
    return { id: id(renderer), contextId: id(renderer.getContext()), canvasId: id(renderer.domElement), target: id(renderer.getRenderTarget()),
      face: renderer.getActiveCubeFace(), mip: renderer.getActiveMipmapLevel(), viewport: vector('getViewport'), scissor: vector('getScissor'), scissorTest: renderer.getScissorTest(),
      color: color.value, alpha: renderer.getClearAlpha(), autoClear: renderer.autoClear, sortObjects: renderer.sortObjects, clippingPlanes: id(renderer.clippingPlanes),
      localClippingEnabled: renderer.localClippingEnabled, infoAutoReset: renderer.info.autoReset,
      info: Object.fromEntries(['calls', 'triangles', 'points', 'lines'].map(key => [key, renderer.info.render[key]])),
      shaderCheck: renderer.debug.checkShaderErrors, shaderError: id(renderer.debug.onShaderError) };
  };
  function instrument(gl, canvas, kind) {
    const existing = contexts.find(row => row.gl === gl); if (existing) return existing;
    if (!(gl instanceof WebGL2RenderingContext)) throw new Error('Required native WebGL2 context unavailable');
    const native = {};
    for (let proto = gl; proto && proto !== Object.prototype; proto = Object.getPrototypeOf(proto))
      for (const name of Object.getOwnPropertyNames(proto)) if (!(name in native)) { const descriptor = Object.getOwnPropertyDescriptor(proto, name); if (typeof descriptor?.value === 'function') native[name] = descriptor.value.bind(gl); }
    const call = (name, ...args) => { if (!native[name]) throw new Error(`Required native WebGL2 method missing: ${name}`); return native[name](...args); };
    const param = key => call('getParameter', typeof key === 'string' ? gl[key] : key);
    const row = { gl, canvas, native, id: id(gl), canvasId: id(canvas), kind, active: null, passes: [], draws: [], programs: new Map(), shaders: new Map(),
      counts: Object.fromEntries(kinds.map(name => [name, { created: 0, deleted: 0, live: new Set() }])), resources: new Map(),
      totalDraws: 0, caseDraws: 0, hostDraws: 0, hostBoundaryViolationCount: 0, hostBoundaryViolations: [], hostLeaseViolationCount: 0, hostLeaseViolations: [], scenePasses: 0, compositePasses: 0, passTimes: [], poisoned: null, postPoisonThreeDraws: 0,
      restorationErrors: [], faultEvents: [] };
    contexts.push(row); shared.contexts.push({ id: row.id, canvasId: row.canvasId, kind, version: param('VERSION'), renderer: param('RENDERER') });
    canvas.addEventListener('webglcontextlost', event => shared.lost.push({ contextId: row.id, at: clock(), nativeLost: call('isContextLost'), trusted: event.isTrusted }));
    canvas.addEventListener('webglcontextrestored', event => shared.restored.push({ contextId: row.id, at: clock(), trusted: event.isTrusted }));
    const scalarKeys = ['DRAW_FRAMEBUFFER_BINDING','READ_FRAMEBUFFER_BINDING','READ_BUFFER','VIEWPORT','SCISSOR_BOX','COLOR_WRITEMASK','COLOR_CLEAR_VALUE',
      'DEPTH_RANGE','DEPTH_WRITEMASK','DEPTH_FUNC','DEPTH_CLEAR_VALUE','STENCIL_CLEAR_VALUE','BLEND_EQUATION_RGB','BLEND_EQUATION_ALPHA',
      'BLEND_SRC_RGB','BLEND_DST_RGB','BLEND_SRC_ALPHA','BLEND_DST_ALPHA','BLEND_COLOR','STENCIL_WRITEMASK','STENCIL_FUNC','STENCIL_REF','STENCIL_VALUE_MASK',
      'STENCIL_FAIL','STENCIL_PASS_DEPTH_FAIL','STENCIL_PASS_DEPTH_PASS','STENCIL_BACK_WRITEMASK','STENCIL_BACK_FUNC','STENCIL_BACK_REF','STENCIL_BACK_VALUE_MASK',
      'STENCIL_BACK_FAIL','STENCIL_BACK_PASS_DEPTH_FAIL','STENCIL_BACK_PASS_DEPTH_PASS','CULL_FACE_MODE','FRONT_FACE','POLYGON_OFFSET_FACTOR','POLYGON_OFFSET_UNITS',
      'LINE_WIDTH','CURRENT_PROGRAM','VERTEX_ARRAY_BINDING','ARRAY_BUFFER_BINDING','ELEMENT_ARRAY_BUFFER_BINDING','COPY_READ_BUFFER_BINDING','RENDERBUFFER_BINDING',
      'ACTIVE_TEXTURE','PACK_ALIGNMENT','PACK_ROW_LENGTH','PACK_SKIP_PIXELS','PACK_SKIP_ROWS','UNPACK_ALIGNMENT','UNPACK_FLIP_Y_WEBGL',
      'UNPACK_PREMULTIPLY_ALPHA_WEBGL','UNPACK_COLORSPACE_CONVERSION_WEBGL','UNPACK_ROW_LENGTH','UNPACK_IMAGE_HEIGHT','UNPACK_SKIP_PIXELS','UNPACK_SKIP_ROWS','UNPACK_SKIP_IMAGES',
      'SAMPLE_COVERAGE_VALUE','SAMPLE_COVERAGE_INVERT'];
    const caps = ['BLEND','CULL_FACE','DEPTH_TEST','POLYGON_OFFSET_FILL','SCISSOR_TEST','STENCIL_TEST','SAMPLE_ALPHA_TO_COVERAGE','SAMPLE_COVERAGE','RASTERIZER_DISCARD'];
    const texturePairs = [['TEXTURE_2D','TEXTURE_BINDING_2D'],['TEXTURE_CUBE_MAP','TEXTURE_BINDING_CUBE_MAP'],['TEXTURE_3D','TEXTURE_BINDING_3D'],['TEXTURE_2D_ARRAY','TEXTURE_BINDING_2D_ARRAY']];
    function snapshot() {
      const state = Object.fromEntries(scalarKeys.map(key => [key, param(key)]));
      state.caps = Object.fromEntries(caps.map(key => [key, call('isEnabled', gl[key])]));
      state.drawBuffers = Array.from({ length: state.DRAW_FRAMEBUFFER_BINDING ? param('MAX_DRAW_BUFFERS') : 1 }, (_, index) => param(gl.DRAW_BUFFER0 + index));
      const units = [...new Set([0, param('MAX_COMBINED_TEXTURE_IMAGE_UNITS') - 1, state.ACTIVE_TEXTURE - gl.TEXTURE0])];
      state.units = units.map(unit => { call('activeTexture', gl.TEXTURE0 + unit); return { unit, sampler: param('SAMPLER_BINDING'), textures: Object.fromEntries(texturePairs.map(([target, binding]) => [target, param(binding)])) }; });
      call('activeTexture', state.ACTIVE_TEXTURE);
      return state;
    }
    function restore(s) {
      call('bindFramebuffer', gl.DRAW_FRAMEBUFFER, s.DRAW_FRAMEBUFFER_BINDING); call('bindFramebuffer', gl.READ_FRAMEBUFFER, s.READ_FRAMEBUFFER_BINDING);
      call('drawBuffers', s.drawBuffers); call('readBuffer', s.READ_BUFFER); call('viewport', ...s.VIEWPORT); call('scissor', ...s.SCISSOR_BOX);
      for (const [key, enabled] of Object.entries(s.caps)) call(enabled ? 'enable' : 'disable', gl[key]);
      call('colorMask', ...s.COLOR_WRITEMASK); call('clearColor', ...s.COLOR_CLEAR_VALUE); call('depthRange', ...s.DEPTH_RANGE); call('depthMask', s.DEPTH_WRITEMASK);
      call('depthFunc', s.DEPTH_FUNC); call('clearDepth', s.DEPTH_CLEAR_VALUE); call('clearStencil', s.STENCIL_CLEAR_VALUE);
      call('blendEquationSeparate', s.BLEND_EQUATION_RGB, s.BLEND_EQUATION_ALPHA); call('blendFuncSeparate', s.BLEND_SRC_RGB, s.BLEND_DST_RGB, s.BLEND_SRC_ALPHA, s.BLEND_DST_ALPHA); call('blendColor', ...s.BLEND_COLOR);
      for (const [face, prefix] of [[gl.FRONT, 'STENCIL_'], [gl.BACK, 'STENCIL_BACK_']]) {
        call('stencilMaskSeparate', face, s[`${prefix}WRITEMASK`]); call('stencilFuncSeparate', face, s[`${prefix}FUNC`], s[`${prefix}REF`], s[`${prefix}VALUE_MASK`]);
        call('stencilOpSeparate', face, s[`${prefix}FAIL`], s[`${prefix}PASS_DEPTH_FAIL`], s[`${prefix}PASS_DEPTH_PASS`]);
      }
      call('cullFace', s.CULL_FACE_MODE); call('frontFace', s.FRONT_FACE); call('polygonOffset', s.POLYGON_OFFSET_FACTOR, s.POLYGON_OFFSET_UNITS); call('lineWidth', s.LINE_WIDTH);
      call('useProgram', s.CURRENT_PROGRAM); call('bindVertexArray', s.VERTEX_ARRAY_BINDING); call('bindBuffer', gl.ARRAY_BUFFER, s.ARRAY_BUFFER_BINDING);
      call('bindBuffer', gl.ELEMENT_ARRAY_BUFFER, s.ELEMENT_ARRAY_BUFFER_BINDING); call('bindBuffer', gl.COPY_READ_BUFFER, s.COPY_READ_BUFFER_BINDING); call('bindRenderbuffer', gl.RENDERBUFFER, s.RENDERBUFFER_BINDING);
      for (const { unit, sampler, textures } of s.units) { call('activeTexture', gl.TEXTURE0 + unit); for (const [target, texture] of Object.entries(textures)) call('bindTexture', gl[target], texture); call('bindSampler', unit, sampler); }
      call('activeTexture', s.ACTIVE_TEXTURE);
      for (const key of scalarKeys.filter(key => /^(?:UNPACK_|PACK_)/.test(key))) call('pixelStorei', gl[key], s[key]);
      call('sampleCoverage', s.SAMPLE_COVERAGE_VALUE, s.SAMPLE_COVERAGE_INVERT);
    }
    /** Distinct live foreign objects/states challenge the actual application boundary.
     * Probe allocations bypass the wrapped counters and are deleted after exact comparison. */
    function challenge(kind) {
      const priorError = call('getError');
      if (priorError !== gl.NO_ERROR) throw new Error(`Pre-existing native GL error prevents a clean state challenge: ${priorError}`);
      const original = snapshot(), cleanup = [];
      const own = type => { const value = call(`create${type}`); if (!value) throw new Error(`Probe could not allocate ${type}`); cleanup.push(() => call(`delete${type}`, value)); return value; };
      try {
        const vao = own('VertexArray'); call('bindVertexArray', vao);
        for (const target of [gl.ARRAY_BUFFER, gl.ELEMENT_ARRAY_BUFFER]) { call('bindBuffer', target, own('Buffer')); call('bufferData', target, 64, gl.STATIC_DRAW); }
        call('bindRenderbuffer', gl.RENDERBUFFER, own('Renderbuffer')); call('renderbufferStorage', gl.RENDERBUFFER, gl.RGBA4, 2, 2);
        const last = param('MAX_COMBINED_TEXTURE_IMAGE_UNITS') - 1;
        for (const unit of [0, last]) { call('activeTexture', gl.TEXTURE0 + unit); for (const [target] of texturePairs) call('bindTexture', gl[target], own('Texture')); call('bindSampler', unit, own('Sampler')); }
        if (kind === 'scene') {
          const draw = own('Framebuffer'), read = own('Framebuffer');
          for (const [framebuffer, count] of [[draw, 2], [read, 1]]) {
            call('bindFramebuffer', gl.FRAMEBUFFER, framebuffer);
            for (let index = 0; index < count; index++) {
              call('bindTexture', gl.TEXTURE_2D, own('Texture')); call('texImage2D', gl.TEXTURE_2D, 0, gl.RGBA8, 2, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
              call('framebufferTexture2D', gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + index, gl.TEXTURE_2D, param('TEXTURE_BINDING_2D'), 0);
            }
            call('drawBuffers', Array.from({ length: count }, (_, index) => gl.COLOR_ATTACHMENT0 + index));
            if (call('checkFramebufferStatus', gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('Native challenge framebuffer incomplete');
          }
          call('bindFramebuffer', gl.DRAW_FRAMEBUFFER, draw); call('bindFramebuffer', gl.READ_FRAMEBUFFER, read); call('readBuffer', gl.COLOR_ATTACHMENT0);
        } else { call('bindFramebuffer', gl.FRAMEBUFFER, null); call('drawBuffers', [gl.BACK]); call('readBuffer', gl.BACK); }
        call('activeTexture', gl.TEXTURE0 + 2); call('viewport', 3, 5, 17, 19); call('scissor', 7, 11, 13, 17);
        caps.forEach((key, index) => call(index % 2 ? 'disable' : 'enable', gl[key]));
        call('colorMask', true, false, true, false); call('clearColor', .25, .5, .75, .125); call('depthRange', .2, .8); call('depthMask', false); call('depthFunc', gl.GREATER); call('clearDepth', .375); call('clearStencil', 9);
        call('blendEquationSeparate', gl.FUNC_REVERSE_SUBTRACT, gl.FUNC_ADD); call('blendFuncSeparate', gl.ONE_MINUS_DST_COLOR, gl.SRC_ALPHA, gl.ONE, gl.ZERO); call('blendColor', .1, .2, .3, .4);
        call('stencilMaskSeparate', gl.FRONT, 0x35); call('stencilMaskSeparate', gl.BACK, 0x6a); call('stencilFuncSeparate', gl.FRONT, gl.NOTEQUAL, 3, 0x7f); call('stencilFuncSeparate', gl.BACK, gl.LEQUAL, 5, 0x3f);
        call('stencilOpSeparate', gl.FRONT, gl.REPLACE, gl.INCR, gl.KEEP); call('stencilOpSeparate', gl.BACK, gl.KEEP, gl.DECR, gl.INVERT);
        call('cullFace', gl.FRONT); call('frontFace', gl.CW); call('polygonOffset', 1.25, 2.5); call('sampleCoverage', .375, true);
        for (const [name, value] of Object.entries({ UNPACK_ALIGNMENT: 1, UNPACK_FLIP_Y_WEBGL: true, UNPACK_PREMULTIPLY_ALPHA_WEBGL: true, UNPACK_COLORSPACE_CONVERSION_WEBGL: gl.NONE, UNPACK_ROW_LENGTH: 7, UNPACK_IMAGE_HEIGHT: 9, UNPACK_SKIP_PIXELS: 1, UNPACK_SKIP_ROWS: 2, UNPACK_SKIP_IMAGES: 1 })) call('pixelStorei', gl[name], value);
        const error = call('getError'); if (error !== gl.NO_ERROR) throw new Error(`Native challenge introduced GL error ${error}`);
        return { kind, original, cleanup, cleanupNow() { restore(original); for (const dispose of cleanup.reverse()) dispose(); } };
      } catch (error) { restore(original); for (const dispose of cleanup.reverse()) dispose(); throw error; }
    }
    const programInfo = program => row.programs.get(program) ?? { sources: [], kind: 'unknown', three: false };
    function classify(program) {
      const info = programInfo(program), source = info.sources.join('\n');
      info.three = source.includes('#define SHADER_TYPE ');
      info.kind = source.includes('float grain=fract(sin(dot(floor(gl_FragCoord.xy)') ? 'felt'
        : source.includes('texture2D(map,vUv).rgb') ? 'composite'
          : source.includes('uniform float stops[8]') ? 'ribbon'
            : source.includes('uniform vec3 color;void main(){gl_FragColor=vec4(color,1.0);}') && !source.includes('distanceAlong') ? 'arrows' : info.three ? 'three' : 'maplibre';
      row.programs.set(program, info); return info;
    }
    for (const type of kinds) {
      const create = type === 'Sync' ? 'fenceSync' : `create${type}`, remove = `delete${type}`;
      if (!native[create] || !native[remove]) throw new Error(`Required resource instrumentation unsupported: ${type}`);
      gl[create] = function (...args) { const value = call(create, ...args); if (value) { const handle = id(value); row.counts[type].created++; row.counts[type].live.add(handle); row.resources.set(handle, { type, caseOwned: Boolean(row.active), deleted: false }); } return value; };
      gl[remove] = function (value) { const answer = call(remove, value), handle = id(value), resource = row.resources.get(handle); if (value && row.counts[type].live.delete(handle)) { row.counts[type].deleted++; if (resource) resource.deleted = true; } return answer; };
    }
    gl.shaderSource = function (shader, source) {
      row.shaders.set(shader, String(source));
      if (shared.fault?.type === 'shader' && !shared.fault.fired && row.active && String(source).includes('float grain=fract(sin(dot(floor(gl_FragCoord.xy)')) {
        shared.fault.fired = true; const event = { type: 'shader', at: clock(), contextId: row.id, pass: row.active.id, shaderId: id(shader), sourceMarker: 'owned felt fragment' };
        row.faultEvents.push(event); keep(shared.events, event); return call('shaderSource', shader, `${source}\nTHIS_IS_AN_INTENTIONAL_CASE_ONLY_CI_SHADER_ERROR`);
      }
      return call('shaderSource', shader, source);
    };
    gl.attachShader = function (program, shader) { const info = programInfo(program); info.sources.push(row.shaders.get(shader) ?? ''); row.programs.set(program, info); classify(program); return call('attachShader', program, shader); };
    function beginPass() {
      const stack = new Error().stack ?? '';
      if (row.active || !caseAsset.test(stack) || !document.querySelector('[data-case-surface]')) return;
      const ownStack = stack.split('\n').filter(line => caseAsset.test(line));
      const entryKind = ownStack.some(line => /\bprerender\b/.test(line)) ? 'scene' : ownStack.some(line => /(?:\.|\s)render\s*\(/.test(line)) ? 'composite' : null;
      const renderer = renderers.find(item => item.getContext() === gl);
      if (!renderer) { shared.errors.push('Case boundary had no observed Three renderer'); return; }
      let applied = null;
      if (shared.challenge && shared.challenge === entryKind) { applied = challenge(shared.challenge); shared.challenge = null; }
      row.active = { id: ++sequence, start: clock(), before: snapshot(), rendererBefore: rendererState(renderer), renderer, challenge: applied,
        entryKind, entryStack: ownStack, draws: [], type: null, captureSawDraw: false, captureSawRead: false };
    }
    gl.isContextLost = function () { const lost = call('isContextLost'); if (!lost) try { beginPass(); } catch (error) { shared.errors.push(`Probe begin: ${error}`); throw error; } return lost; };
    gl.getParameter = function (key) {
      if (row.active && caseAsset.test(new Error().stack ?? '')) {
        if (key === gl.DRAW_FRAMEBUFFER_BINDING && !row.active.captureSawDraw) row.active.captureSawDraw = true;
        else if (key === gl.READ_FRAMEBUFFER_BINDING && row.active.captureSawDraw) row.active.captureSawRead = true;
      }
      return call('getParameter', key);
    };
    function endPass() {
      const pass = row.active; if (!pass) return;
      const after = snapshot(), rendererAfter = rendererState(pass.renderer), before = clone(pass.before), encodedAfter = clone(after);
      const changes = Object.keys(before).filter(key => JSON.stringify(before[key]) !== JSON.stringify(encodedAfter[key]));
      const logicalChanges = Object.keys(pass.rendererBefore).filter(key => JSON.stringify(pass.rendererBefore[key]) !== JSON.stringify(rendererAfter[key]));
      const record = { id: pass.id, contextId: row.id, rendererId: id(pass.renderer), type: pass.type, durationMs: clock() - pass.start,
        challenge: pass.challenge?.kind ?? null, entryKind: pass.entryKind, entryStack: pass.entryStack, entryObserved: pass.captureSawDraw && pass.captureSawRead, terminalRestoreObserved: true,
        before, after: encodedAfter, rendererBefore: pass.rendererBefore, rendererAfter, changes, logicalChanges, draws: pass.draws };
      if (changes.length || logicalChanges.length) row.restorationErrors.push({ pass: pass.id, changes, logicalChanges });
      if (record.type === 'scene') row.scenePasses++; if (record.type === 'composite') row.compositePasses++;
      keep(row.passes, record, 500); keep(row.passTimes, { type: record.type, startedAt: pass.start, durationMs: record.durationMs }, 10000); shared.allPasses++;
      row.active = null;
      if (pass.challenge) pass.challenge.cleanupNow();
    }
    gl.pixelStorei = function (key, value) {
      const answer = call('pixelStorei', key, value);
      if (key === gl.UNPACK_SKIP_IMAGES && row.active && row.active.captureSawRead && caseAsset.test(new Error().stack ?? '')) endPass();
      return answer;
    };
    function geometry(program, count, first) {
      const location = call('getAttribLocation', program, 'position'); if (location < 0) throw new Error('Arrow position attribute unavailable');
      const buffer = call('getVertexAttrib', location, gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING), type = call('getVertexAttrib', location, gl.VERTEX_ATTRIB_ARRAY_TYPE);
      const stride = call('getVertexAttrib', location, gl.VERTEX_ATTRIB_ARRAY_STRIDE) || 12, offset = call('getVertexAttribOffset', location, gl.VERTEX_ATTRIB_ARRAY_POINTER) + first * stride;
      if (!buffer || type !== gl.FLOAT || call('getVertexAttrib', location, gl.VERTEX_ATTRIB_ARRAY_SIZE) !== 3 || count > 36) throw new Error('Unsupported actual arrow buffer layout');
      const old = param('COPY_READ_BUFFER_BINDING'), bytes = new Uint8Array((count - 1) * stride + 12);
      try { call('bindBuffer', gl.COPY_READ_BUFFER, buffer); call('getBufferSubData', gl.COPY_READ_BUFFER, offset, bytes); } finally { call('bindBuffer', gl.COPY_READ_BUFFER, old); }
      const view = new DataView(bytes.buffer); return Array.from({ length: count }, (_, i) => Array.from({ length: 3 }, (_, axis) => view.getFloat32(i * stride + axis * 4, true)));
    }
    const readPixel = (x, y) => { const data = new Uint8Array(4); call('readPixels', x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, data); return Array.from(data); };
    for (const name of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced']) {
      gl[name] = function (...args) {
        const program = param('CURRENT_PROGRAM'), info = classify(program), pass = row.active;
        const event = { sequence: ++sequence, at: clock(), method: name, args, contextId: row.id, rendererId: renderers.find(item => item.getContext() === gl) ? id(renderers.find(item => item.getContext() === gl)) : null,
          programId: id(program), shaderKind: info.kind, three: info.three, casePass: pass?.id ?? null, geographicWorkspaceActive: document.querySelector('.webgl-host')?.dataset.geographicWorkspaceActive === 'true', semanticWorkspaceCount: document.querySelectorAll('[data-case-workspace]').length, drawFramebuffer: id(param('DRAW_FRAMEBUFFER_BINDING')), readFramebuffer: id(param('READ_FRAMEBUFFER_BINDING')),
          viewport: Array.from(param('VIEWPORT')), scissor: Array.from(param('SCISSOR_BOX')), scissorTest: call('isEnabled', gl.SCISSOR_TEST), buffer: [gl.drawingBufferWidth, gl.drawingBufferHeight], nativeSucceeded: false };
        if (pass) { pass.type ??= info.kind === 'composite' ? 'composite' : 'scene'; row.caseDraws++; }
        else if (info.three) {
          row.hostDraws++;
          if (event.geographicWorkspaceActive || event.semanticWorkspaceCount > 0) { row.hostLeaseViolationCount++; keep(row.hostLeaseViolations, { ...event, reason: 'Geographic draw during active semantic workspace/lease' }, 100); }
          if (event.drawFramebuffer !== null || event.scissorTest || JSON.stringify(event.viewport) !== JSON.stringify([0, 0, ...event.buffer])) {
            row.hostBoundaryViolationCount++; keep(row.hostBoundaryViolations, { ...event, reason: 'Geographic default-target viewport/scissor boundary' }, 100);
          }
        }
        if (row.poisoned && info.three) { row.postPoisonThreeDraws++; keep(shared.events, { ...event, violation: 'Three draw attempted on poisoned renderer' }); }
        if (shared.fault?.type === 'render' && !shared.fault.fired && pass && info.kind === 'felt') {
          shared.fault.fired = true; row.poisoned = { at: clock(), sequence: event.sequence, contextId: row.id, rendererId: event.rendererId };
          const fault = { ...event, type: 'render', injected: 'native draw of the owned felt program only' }; row.faultEvents.push(fault); keep(shared.events, fault);
          if (pass) pass.draws.push(fault); throw new Error('CI_CASE_OWNED_NATIVE_DRAW_INTERRUPTED');
        }
        const answer = call(name, ...args); event.nativeSucceeded = true; row.totalDraws++;
        if (shared.pixelReads && pass && info.kind === 'arrows') {
          if (name !== 'drawArrays' || args[0] !== gl.TRIANGLES) throw new Error('Actual arrows did not use the supported triangle buffer');
          event.positions = geometry(program, args[2], args[1]);
          const location = call('getUniformLocation', program, 'color'); event.color = Array.from(call('getUniform', program, location));
          event.pixelSamples = [];
          for (let i = 0; i < event.positions.length; i += 3) {
            const centroid = [0, 1].map(axis => (event.positions[i][axis] + event.positions[i + 1][axis] + event.positions[i + 2][axis]) / 3);
            const pixel = [Math.floor((centroid[0] + 1) * event.viewport[2] / 2), Math.floor((centroid[1] + 1) * event.viewport[3] / 2)];
            if (pixel[0] >= 0 && pixel[1] >= 0 && pixel[0] < event.viewport[2] && pixel[1] < event.viewport[3]) event.pixelSamples.push({ pixel, rgba: readPixel(...pixel) });
          }
        }
        if (pass) pass.draws.push(event); keep(row.draws, event, 3000); return answer;
      };
    }
    row.export = () => ({ id: row.id, canvasId: row.canvasId, live: Object.fromEntries(kinds.map(type => [type, row.counts[type].live.size])),
      created: Object.fromEntries(kinds.map(type => [type, row.counts[type].created])), deleted: Object.fromEntries(kinds.map(type => [type, row.counts[type].deleted])),
      caseLive: [...row.resources.values()].filter(resource => resource.caseOwned && !resource.deleted).length,
      totalDraws: row.totalDraws, caseDraws: row.caseDraws, hostDraws: row.hostDraws, hostBoundaryViolationCount: row.hostBoundaryViolationCount, hostBoundaryViolations: row.hostBoundaryViolations, hostLeaseViolationCount: row.hostLeaseViolationCount, hostLeaseViolations: row.hostLeaseViolations, scenePasses: row.scenePasses, compositePasses: row.compositePasses,
      passes: row.passes, draws: row.draws, passTimes: row.passTimes, restorationErrors: row.restorationErrors, faultEvents: row.faultEvents,
      poisoned: row.poisoned, postPoisonThreeDraws: row.postPoisonThreeDraws, pendingPass: row.active ? { id: row.active.id, type: row.active.type } : null });
    return row;
  }
  HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
    const gl = Reflect.apply(nativeCanvas, this, [kind, ...args]);
    if (gl && /^(?:webgl2?|experimental-webgl)$/.test(kind)) instrument(gl, this, kind);
    return gl;
  };
  window.__caseGraphicsProbe = {
    configure(options) { for (const [key, value] of Object.entries(options)) { if (!['challenge','fault','pixelReads'].includes(key)) throw new Error(`Unknown probe option ${key}`); shared[key] = value; } },
    read() { return { ...shared, sequence, contexts: contexts.map(row => ({ ...shared.contexts.find(info => info.id === row.id), ...row.export() })), renderers: [...shared.renderers], canvasCount: document.querySelectorAll('canvas').length }; },
    identities() { return { contextIds: contexts.map(row => row.id), rendererIds: renderers.map(id), canvasIds: contexts.map(row => row.canvasId) }; },
    loseContext() { const row = contexts.find(item => item.canvas.isConnected); if (!row) throw new Error('No live context to lose'); const extension = row.native.getExtension('WEBGL_lose_context'); if (!extension) throw new Error('Required WEBGL_lose_context capability unavailable'); extension.loseContext(); return row.id; },
    async frames(count, driveCase = false) { if (!Number.isInteger(count) || count < 2 || count > 180) throw new Error('Invalid bounded frame sample'); const times = []; for (let i = 0; i < count; i++) { times.push(await new Promise(resolve => requestAnimationFrame(resolve))); if (driveCase) { const surface = document.querySelector('[data-case-surface]'); if (!surface) throw new Error('Active frame sample lost its case surface'); surface.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true })); } } const deltas = times.slice(1).map((value, i) => value - times[i]); keep(shared.frameTimes, deltas, 100); return deltas; },
  };
}

export function selectCaseGraphicsFixtures(files) {
  const simple = files.find(file => file.profileId === 'profile:usa-thiel');
  assert.ok(simple && simple.edges.length > 0 && simple.edges.length <= 4 && new Set(simple.edges.map(edge => edge.to)).size === simple.edges.length && simple.edges.every(edge => edge.from !== edge.to), 'No unambiguous accepted source-directed arrow fixture');
  const dense = [...files].sort((a, b) => b.edges.length - a.edges.length)[0];
  assert.ok(dense?.edges.length, 'Dense native lifecycle fixture missing');
  return { simple, dense };
}

const lifecycleObservationPages = new WeakSet();
const fullProbe = page => page.evaluate(() => window.__caseGraphicsProbe.read());
const probe = page => lifecycleObservationPages.has(page)
  ? page.evaluate(() => window.__caseGraphicsProbe.readLifecycle()) : fullProbe(page);
const configure = (page, options) => page.evaluate(options => window.__caseGraphicsProbe.configure(options), options);
const frames = (page, count = 8) => page.evaluate(count => window.__caseGraphicsProbe.frames(count), count);
const geography = page => page.locator('.webgl-host').evaluate(element => Object.fromEntries(['centerLng','centerLat','zoom','pitch','bearing','selectedEdge'].map(key => [key, element.dataset[key] ?? null])));
const geographicPoseObservation = page => page.locator('.webgl-host').evaluate(element => JSON.parse(element.dataset.geographicPose));
export function assertGeographicPoseObservation(observation, phase) {
  assert.equal(observation?.phase, phase, 'Geographic pose must be measured at the required boundary');
  const pose = observation.pose;
  assert.deepEqual(Object.keys(pose).sort(), ['bearing', 'center', 'pitch', 'zoom']);
  assert.ok(Array.isArray(pose.center) && pose.center.length === 2 && [...pose.center, pose.zoom, pose.pitch, pose.bearing].every(Number.isFinite), 'Geographic pose must contain actual finite map coordinates');
  return pose;
}
export function assertCapturedGeographicPose(observation, opening, message) {
  const expected = assertGeographicPoseObservation(opening, 'workspace-acquisition');
  const actual = assertGeographicPoseObservation(observation, 'geographic-render');
  assert.deepEqual(actual, expected, message);
}
const activeLeaseBaselines = new WeakMap();
const retiredLeaseBaselines = new WeakMap();
const leaseSnapshot = page => page.evaluate(compact => ({ active: document.querySelector('.webgl-host')?.dataset.geographicWorkspaceActive,
  workspaceCount: document.querySelectorAll('[data-case-workspace]').length, data: compact ? window.__caseGraphicsProbe.readLifecycle() : window.__caseGraphicsProbe.read() }), lifecycleObservationPages.has(page));
export function liveGraphicsIdentity(data) {
  const context = data.contexts.at(-1), renderer = data.renderers.find(row => row.contextId === context?.id);
  assert.ok(context && renderer, 'Current observed geographic graphics identity is missing');
  assert.equal(renderer.canvasId, context.canvasId); assert.equal(data.canvasCount, 1);
  return { contextId: context.id, rendererId: renderer.id, canvasId: context.canvasId };
}
export function assertActiveLeaseDrawSuppression(snapshot, baseline) {
  assert.equal(snapshot.active, 'true', 'Geographic lease must remain active until workspace Close');
  assert.equal(snapshot.workspaceCount, 1, 'Exactly one semantic workspace must own the lease');
  assert.deepEqual(liveGraphicsIdentity(snapshot.data), baseline.identity, 'Graphics replacement requires a new explicit lease observation baseline');
  const context = snapshot.data.contexts.find(row => row.id === baseline.identity.contextId);
  assert.equal(context.hostDraws, baseline.hostDraws, 'A geographic Three draw escaped active workspace suppression');
  return { identity: baseline.identity, hostDraws: context.hostDraws, baselineSequence: baseline.sequence, sequence: snapshot.data.sequence };
}
export function assertRetiredLeaseSuppression(data, baseline) {
  const context = data.contexts.find(row => row.id === baseline.identity.contextId);
  assert.ok(context, 'Retired graphics context observation disappeared');
  assert.equal(context.hostDraws, baseline.hostDraws, 'Retired renderer escaped its workspace suppression');
  assert.equal(context.hostLeaseViolationCount, baseline.hostLeaseViolationCount, 'Retired renderer has an active-lease draw violation');
  return { identity: baseline.identity, hostDraws: context.hostDraws, activeLeaseViolations: context.hostLeaseViolationCount };
}
function checkRetiredLeases(page, data) {
  return (retiredLeaseBaselines.get(page) ?? []).map(baseline => assertRetiredLeaseSuppression(data, baseline));
}
async function rememberActiveLease(page, until, result, phase) {
  let snapshot;
  await until(async () => { snapshot = await leaseSnapshot(page); return snapshot.active === 'true' && snapshot.workspaceCount === 1; }, 'Workspace did not acquire the geographic suppression lease');
  const identity = liveGraphicsIdentity(snapshot.data), context = snapshot.data.contexts.find(row => row.id === identity.contextId);
  const previous = activeLeaseBaselines.get(page);
  if (previous) {
    assert.notEqual(identity.contextId, previous.identity.contextId, 'A retained context cannot silently reset its active suppression baseline');
    const retired = assertRetiredLeaseSuppression(snapshot.data, previous);
    retiredLeaseBaselines.set(page, [...(retiredLeaseBaselines.get(page) ?? []), previous]);
    (result.caseRetiredGeographicLeases ??= []).push({ phase, ...retired });
  }
  checkRetiredLeases(page, snapshot.data);
  const baseline = { identity, hostDraws: context.hostDraws, hostLeaseViolationCount: context.hostLeaseViolationCount, sequence: snapshot.data.sequence };
  activeLeaseBaselines.set(page, baseline);
  (result.caseGeographicLeases ??= []).push({ phase, ...baseline });
  return baseline;
}
async function openGraphicsWorkspace(page, until, result) {
  await openCaseWorkspace(page, until);
  await rememberActiveLease(page, until, result, 'workspace-open');
}
async function assertActiveSuppression(page, result, phase) {
  const baseline = activeLeaseBaselines.get(page); assert.ok(baseline, 'Missing active lease observation baseline');
  const snapshot = await leaseSnapshot(page);
  checkRetiredLeases(page, snapshot.data);
  const observed = assertActiveLeaseDrawSuppression(snapshot, baseline);
  (result.caseGeographicSuppression ??= []).push({ phase, ...observed }); return observed;
}
export function assertRecoveryCounters(previous, current) {
  assert.ok(Number.isInteger(previous.hostBoundaryViolationCount) && Number.isInteger(current.hostBoundaryViolationCount), 'Missing cumulative geographic boundary observation');
  assert.equal(current.hostBoundaryViolationCount, previous.hostBoundaryViolationCount, 'A geographic draw violated its boundary after Close, including any evicted draw');
  assert.ok(Number.isInteger(previous.hostLeaseViolationCount) && Number.isInteger(current.hostLeaseViolationCount), 'Missing cumulative active-lease draw observation');
  assert.equal(current.hostLeaseViolationCount, previous.hostLeaseViolationCount, 'A geographic draw escaped during the before-Close action gap, including an evicted draw');
  assert.ok(current.hostDraws > previous.hostDraws, 'Geographic draw counter did not advance after Close');
}
export function isGeographicRecoveryDraw(draw, watermark, identity) {
  return draw.sequence > watermark && draw.three && draw.shaderKind === 'three' && draw.casePass === null && draw.nativeSucceeded
    && draw.contextId === identity.contextId && draw.rendererId === identity.rendererId
    && draw.geographicWorkspaceActive === false && draw.semanticWorkspaceCount === 0;
}
async function requireGeographicRecovery(page, until, result, before, phase) {
  const identity = liveGraphicsIdentity(before.data), watermark = before.data.sequence;
  assert.ok(Number.isInteger(watermark), 'Recovery requires the native monotonic sequence watermark');
  await until(async () => { const snapshot = await leaseSnapshot(page); return snapshot.active === 'false' && snapshot.workspaceCount === 0; }, 'Workspace Close did not release the geographic lease');
  await until(async () => { const data = await probe(page); return data.contexts.some(context => context.id === identity.contextId && context.draws.some(draw => isGeographicRecoveryDraw(draw, watermark, identity))); }, 'No fresh geographic Three draw after actual workspace Close');
  const after = await leaseSnapshot(page);
  const retired = checkRetiredLeases(page, after.data);
  assert.deepEqual(liveGraphicsIdentity(after.data), identity, 'Geographic recovery silently replaced the captured renderer/context/canvas');
  const draws = assertHostBoundaries(after.data, watermark, identity);
  const context = after.data.contexts.find(row => row.id === identity.contextId);
  const previous = before.data.contexts.find(row => row.id === identity.contextId);
  assertRecoveryCounters(previous, context);
  (result.caseGeographicRecovery ??= []).push({ phase, identity, watermark, afterSequence: after.data.sequence, draws, hostDrawsBefore: previous.hostDraws, hostDrawsAfter: context.hostDraws, boundaryViolationsBefore: previous.hostBoundaryViolationCount, boundaryViolationsAfter: context.hostBoundaryViolationCount, activeLeaseViolationsBefore: previous.hostLeaseViolationCount, activeLeaseViolationsAfter: context.hostLeaseViolationCount, retiredLeases: retired, lease: after.active });
  activeLeaseBaselines.delete(page); return after.data;
}
async function closeWorkspace(page, until, result, phase = 'workspace-close') {
  await assertActiveSuppression(page, result, `${phase}-before-close`);
  const before = await leaseSnapshot(page);
  assertActiveLeaseDrawSuppression(before, activeLeaseBaselines.get(page)); checkRetiredLeases(page, before.data);
  await caseWorkspace(page).getByRole('button', { name: 'Close workspace', exact: true }).click();
  await until(async () => await caseWorkspace(page).count() === 0, 'Workspace did not close');
  return requireGeographicRecovery(page, until, result, before, phase);
}
async function openSources(page, claim) {
  const details = caseRail(page).locator('.cw-sources details');
  if (await details.getAttribute('open') === null) await details.locator('summary').click();
  await details.getByRole('button', { name: `Claim ${claim.number}: ${claim.proposedLabel}`, exact: true }).click();
  await caseSourceDialog(page).waitFor({ state: 'visible' });
}
function assertRestoration(data, { allowNoPass = false } = {}) {
  assert.deepEqual(data.errors, [], 'Native instrumentation could not establish the required boundary');
  const passes = data.contexts.flatMap(context => context.passes);
  if (!allowNoPass) assert.ok(passes.length > 0, 'No complete native GL boundary was observed');
  for (const context of data.contexts) {
    assert.equal(context.pendingPass, null, 'A case GL boundary did not reach its terminal restoration');
    assert.deepEqual(context.restorationErrors, [], 'A case pass leaked native or logical renderer state');
  }
  for (const pass of passes) {
    assert.equal(pass.entryObserved, true, 'Native case entry was not independently recognized');
    assert.equal(pass.terminalRestoreObserved, true);
    assert.deepEqual(pass.changes, []); assert.deepEqual(pass.logicalChanges, []);
  }
}
export function assertTerminalNativeState(data) {
  assertRestoration(data);
  for (const context of data.contexts.filter(row => row.poisoned)) assert.equal(context.postPoisonThreeDraws, 0, 'A retired poisoned renderer drew during final Close/recovery');
}
/** Compare the two oracles on one browser-captured instant, not sequential reads.
 * Full checkpoints are preserved before this comparison so a mismatch retains
 * the underlying native observations. No projection can manufacture acceptance. */
export function assertLifecycleObservationParity(pair, { activeBaseline = null, retiredBaselines = [], recovery = null } = {}) {
  const { full, compact, active, workspaceCount } = pair;
  assert.deepEqual(compact, compactLifecycleObservation(full), 'Serialized lifecycle projection differs from the portable projection');
  const counters = data => ({ ...data, contexts: data.contexts.map(({ passes, draws, ...rest }) => rest) });
  assert.deepEqual(counters(compact), counters(full), 'Lifecycle projection changed native identities, handles, counters, timings, faults or poison state');
  assert.deepEqual(liveGraphicsIdentity(compact), liveGraphicsIdentity(full));
  for (let index = 0; index < full.contexts.length; index++) {
    const previous = full.contexts[index], current = compact.contexts[index];
    assert.equal(current.passes.length, previous.passes.length, 'Lifecycle projection dropped a retained restoration predicate');
    const predicates = context => context.passes.map(({ id, contextId, rendererId, type, entryObserved, terminalRestoreObserved, changes, logicalChanges }) =>
      ({ id, contextId, rendererId, type, entryObserved, terminalRestoreObserved, changes, logicalChanges }));
    assert.deepEqual(predicates(current), predicates(previous));
    for (const type of ['scene', 'composite']) assert.deepEqual(current.passes.findLast(pass => pass.type === type), previous.passes.findLast(pass => pass.type === type), 'Latest native layout evidence changed');
    assert.deepEqual(current.draws, previous.draws.filter(draw => draw.three && draw.casePass === null), 'Lifecycle projection dropped a geographic draw attempt');
  }
  assertTerminalNativeState(full); assertTerminalNativeState(compact);
  for (const baseline of retiredBaselines) assert.deepEqual(assertRetiredLeaseSuppression(compact, baseline), assertRetiredLeaseSuppression(full, baseline));
  if (activeBaseline) assert.deepEqual(assertActiveLeaseDrawSuppression({ active, workspaceCount, data: compact }, activeBaseline), assertActiveLeaseDrawSuppression({ active, workspaceCount, data: full }, activeBaseline));
  let recoveryDraws = null;
  if (recovery) {
    assert.equal(active, 'false'); assert.equal(workspaceCount, 0);
    assert.deepEqual(liveGraphicsIdentity(full), recovery.identity);
    recoveryDraws = assertHostBoundaries(full, recovery.watermark, recovery.identity);
    assert.equal(assertHostBoundaries(compact, recovery.watermark, recovery.identity), recoveryDraws);
    const previous = { hostDraws: recovery.hostDrawsBefore, hostBoundaryViolationCount: recovery.boundaryViolationsBefore, hostLeaseViolationCount: recovery.activeLeaseViolationsBefore };
    for (const data of [full, compact]) assertRecoveryCounters(previous, data.contexts.find(context => context.id === recovery.identity.contextId));
  }
  return { sequence: full.sequence, allPasses: full.allPasses, identity: liveGraphicsIdentity(full), recoveryDraws,
    fullJSONBytes: Buffer.byteLength(JSON.stringify(full)), compactJSONBytes: Buffer.byteLength(JSON.stringify(compact)) };
}

export function assertHostBoundaries(data, afterSequence = 0, identity = liveGraphicsIdentity(data)) {
  const draws = data.contexts.filter(context => context.id === identity.contextId).flatMap(context => context.draws).filter(draw => draw.sequence > afterSequence && draw.three && draw.casePass === null && draw.rendererId === identity.rendererId);
  assert.ok(draws.some(draw => isGeographicRecoveryDraw(draw, afterSequence, identity)), 'No later geographic Three draw was observed after actual lease release');
  for (const draw of draws) {
    assert.ok(isGeographicRecoveryDraw(draw, afterSequence, identity), 'A purported recovery draw occurred during the lease or came from a case shader');
    assert.equal(draw.nativeSucceeded, true, 'Geographic recovery requires an actual successful native draw');
    assert.equal(draw.drawFramebuffer, null, 'Geographic Three re-entry retained an offscreen target');
    assert.deepEqual(draw.viewport, [0, 0, ...draw.buffer], 'Geographic Three viewport differs from current drawing buffer');
    assert.equal(draw.scissorTest, false, 'Geographic Three re-entry retained case scissoring');
  }
  return draws.length;
}
async function nativeLayout(page, result, phase, until, options = {}) {
  const before = options.afterPass ?? (await probe(page)).allPasses;
  if (options.invalidate !== false) await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  await until(async () => {
    const data = await probe(page);
    return data.allPasses >= before + 2 && (options.afterSequence === undefined || ['scene', 'composite'].every(type =>
      data.contexts.flatMap(context => context.passes).some(pass => pass.id > options.afterSequence && pass.type === type && pass.draws.some(draw => draw.nativeSucceeded))));
  }, `${phase}: did not observe fresh native scene/composite boundaries`);
  const data = await probe(page), context = data.contexts.at(-1);
  const geometry = await caseSurface(page).evaluate(surface => {
    const canvas = document.querySelector('.webgl-host canvas');
    return { board: surface.getBoundingClientRect().toJSON(), canvas: canvas.getBoundingClientRect().toJSON(), target: [Number(surface.dataset.caseTargetWidth), Number(surface.dataset.caseTargetHeight)], quality: Number(document.querySelector('[data-case-workspace]').dataset.caseQuality), devicePixelRatio };
  });
  const scene = context.passes.findLast(pass => pass.type === 'scene'), composite = context.passes.findLast(pass => pass.type === 'composite');
  assert.ok(scene && composite, `${phase}: scene/composite classification unavailable`);
  const draw = composite.draws.find(draw => draw.shaderKind === 'composite'); assert.ok(draw?.nativeSucceeded);
  const expectedRect = expectedPhysicalRect(geometry.board, geometry.canvas, { width: draw.buffer[0], height: draw.buffer[1] });
  const ratio = Math.max(draw.buffer[0] / geometry.canvas.width, draw.buffer[1] / geometry.canvas.height);
  assert.deepEqual(geometry.target, expectedTarget(geometry.board.width, geometry.board.height, ratio, geometry.quality));
  assert.deepEqual(draw.viewport, expectedRect, `${phase}: actual native composite viewport`);
  assert.deepEqual(draw.scissor, expectedRect, `${phase}: actual native composite scissor`); assert.equal(draw.scissorTest, true); assert.equal(draw.drawFramebuffer, null);
  for (const sceneDraw of scene.draws.filter(draw => draw.nativeSucceeded)) {
    assert.notEqual(sceneDraw.drawFramebuffer, null); assert.deepEqual(sceneDraw.viewport, [0, 0, ...geometry.target]);
  }
  assertRestoration(data); await assertActiveSuppression(page, result, phase);
  const sample = { phase, ...geometry, actualDrawingBuffer: draw.buffer, expectedRect, actualViewport: draw.viewport, actualScissor: draw.scissor, scenePass: scene.id, compositePass: composite.id };
  (result.caseGraphicsLayouts ??= []).push(sample); return sample;
}
export function arrowEvidence(data, frame, file) {
  assert.ok(file.edges.length > 0 && file.edges.length <= 4, 'Arrow audit requires every role in the initial reveal');
  assert.equal(new Set(file.edges.map(edge => edge.to)).size, file.edges.length, 'Arrow audit requires unambiguous retained target endpoints');
  const draw = data.contexts.flatMap(context => context.draws).findLast(draw => draw.shaderKind === 'arrows' && draw.positions);
  assert.ok(draw, 'No actual native arrow position buffer was read'); assert.equal(draw.positions.length, file.edges.length * 3);
  const expected = file.edges.map(role => {
    const target = frame.nodes.find(node => node.id === role.to), source = frame.nodes.find(node => node.id === role.from);
    assert.ok(source && target, 'Both source-qualified arrow endpoints must be visible');
    return { role, center: [target.x + target.width / 2, target.y + target.height / 2] };
  });
  const matches = [];
  for (let index = 0; index < draw.positions.length; index += 3) {
    const vertices = draw.positions.slice(index, index + 3);
    const points = vertices.map(([x, y]) => [frame.rect.x + (x + 1) * frame.rect.width / 2, frame.rect.y + (1 - y) * frame.rect.height / 2]);
    const tip = points[0], base = [(points[1][0] + points[2][0]) / 2, (points[1][1] + points[2][1]) / 2];
    const { role, center } = [...expected].sort((a, b) => Math.hypot(tip[0] - a.center[0], tip[1] - a.center[1]) - Math.hypot(tip[0] - b.center[0], tip[1] - b.center[1]))[0];
    const toward = [center[0] - tip[0], center[1] - tip[1]], direction = [tip[0] - base[0], tip[1] - base[1]];
    assert.ok(toward[0] * direction[0] + toward[1] * direction[1] > 0, 'Actual arrow points away from the retained target endpoint');
    assert.ok(Math.hypot(...toward) < 40, 'Actual arrow tip is not adjacent to its retained target pin');
    assert.ok(Math.hypot(tip[0] - center[0], tip[1] - center[1]) < Math.hypot(base[0] - center[0], base[1] - center[1]));
    matches.push({ edgeId: role.id, source: role.from, target: role.to, vertices, points });
  }
  assert.deepEqual(matches.map(row => row.edgeId).sort(), file.edges.map(edge => edge.id).sort(), 'Actual arrows do not cover the exact retained directed roles');
  assert.ok(draw.pixelSamples.length > 0, 'No actual arrow triangle pixel was sampled');
  const expectedColor = draw.color.map(value => Math.round(value * 255));
  assert.ok(draw.pixelSamples.some(sample => sample.rgba[3] === 255 && expectedColor.every((value, channel) => Math.abs(sample.rgba[channel] - value) <= 3)), 'Native arrow draw did not produce the shader color in its triangle interior');
  return { caseId: file.id, matches, pixelSamples: draw.pixelSamples, expectedColor, drawSequence: draw.sequence };
}
async function assertRetainedFailure(page, file, selection, until) {
  await until(async () => await caseWorkspace(page).getAttribute('data-case-view') === 'list' && await caseSurface(page).count() === 0, 'Failed graphics did not fall back to complete reader');
  assert.equal(await caseWorkspace(page).getAttribute('data-case-selection'), selection);
  assert.equal(await caseWorkspace(page).getAttribute('data-case-motion'), 'false');
  await assertCompleteCaseReader(page, file);
  assert.equal(await controls(page).getByRole('button', { name: 'Back within case', exact: true }).isEnabled(), true, 'Graphics failure lost semantic history');
  await caseWorkspace(page).getByRole('button', { name: 'Recreate graphics', exact: true }).waitFor();
}
async function recreateAndVerify(page, file, selection, until, result) {
  const old = await page.evaluate(() => window.__caseGraphicsProbe.identities()), root = await caseWorkspace(page).elementHandle();
  await caseWorkspace(page).getByRole('button', { name: 'Recreate graphics', exact: true }).click();
  await until(async () => (await probe(page)).renderers.length === old.rendererIds.length + 1, 'Explicit recreation did not allocate a complete replacement renderer');
  const now = await probe(page);
  assert.equal(now.contexts.length, old.contextIds.length + 1, 'Explicit recreation reused the failed native context');
  assert.equal(now.canvasCount, 1, 'Old graphics canvas was retained after full recreation');
  await rememberActiveLease(page, until, result, 'explicit-graphics-recreation');
  assert.equal(await root.evaluate(element => element.isConnected && element === document.querySelector('[data-case-workspace]')), true, 'Graphics recreation replaced the semantic workspace');
  assert.equal(await caseWorkspace(page).getAttribute('data-case-selection'), selection); await assertCompleteCaseReader(page, file);
  await showCaseScene(page, until); await assertCaseFrame(page, file, until);
  assert.equal(await caseWorkspace(page).getAttribute('data-case-selection'), selection);
  for (const context of (await probe(page)).contexts.filter(context => context.poisoned)) assert.equal(context.postPoisonThreeDraws, 0, 'A poisoned renderer drew after replacement');
  await showCompleteCaseReader(page, until);
  await controls(page).getByRole('button', { name: 'Back within case', exact: true }).click();
  await until(async () => await caseWorkspace(page).getAttribute('data-case-selection') !== selection, 'Preserved history could not navigate Back after recreation');
  return { before: old, after: await page.evaluate(() => window.__caseGraphicsProbe.identities()) };
}

export async function runCaseGraphicsBrowserCases({ root, output, scenario, capture, assertFullLoad, assertSpatial, assertCountryBase, until, report, temporary }, { mode = 'full' } = {}) {
  assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Actual browser execution is restricted to authorized GitHub CI');
  assert.equal(process.env.SPATIAL_BROWSER_REVIEW, 'github-actions', 'Actual browser execution is restricted to the existing guarded harness');
  const selectedScenarios = selectCaseGraphicsScenarios(mode);
  const sourcePath = join(root, 'node_modules/three/src/renderers/WebGLRenderer.js'), source = await readFile(sourcePath, 'utf8');
  assert.equal(createHash('sha256').update(source).digest('hex'), THREE_RENDERER_OBSERVER_SOURCE_SHA256, 'Installed Three renderer source changed; re-review the observation contract');
  assert.match(source, /__THREE_DEVTOOLS__\.dispatchEvent\( new CustomEvent\( 'observe', \{ detail: this \} \) \)/, 'Installed Three constructor observation contract changed');
  const { catalog, reference } = await loadCaseExpectation(root, temporary), files = catalog.cases;
  const { simple, dense } = selectCaseGraphicsFixtures(files);
  const coverage = { reviewMode: mode, requiredScenarios: selectedScenarios, actualBrowserExecution: true, environment: 'Authorized GitHub CI actual WebGL2, Chromium/ANGLE SwiftShader software renderer',
    sourceReference: reference, threeConstructorObserver: { source: 'node_modules/three/src/renderers/WebGLRenderer.js', sha256: createHash('sha256').update(source).digest('hex'), event: 'observe', access: 'read-only' },
    limitations: ['Native resource handles and deletion requests do not measure GPU-memory residency.', 'Instrumented CPU boundary timings and browser animation-frame intervals are not production/device FPS or GPU execution time.', 'Screenshot capture is evidence for subsequent assistant visual review, not automatic visual admission.'], scenarios: [] };
  async function run(name, options, work) {
    if (!selectedScenarios.includes(name)) return;
    let context, current;
    await scenario(name, { query: '', blockTiles: true, budgetMs: 120000, ...options,
      beforeNavigation: async (value, result) => {
        context = value; current = result;
        const native = `(${installCaseGraphicsProbe.toString()})(${JSON.stringify({ kinds: RESOURCE_KINDS })});`;
        await value.addInitScript({ content: native + (name === GRAPHICS_SCENARIOS[7] ? '\n' + caseLifecycleObservationInitSource() : '') });
      },
      afterScenario: async () => {
        const page = context?.pages().find(page => !page.isClosed());
        if (!page) { if (current) current.caseGraphicsDiagnosticError = 'Browser page unavailable before native-probe evidence preservation'; return; }
        try { const data = await fullProbe(page); current.caseGraphics = { contexts: data.contexts.length, renderers: data.renderers.length, passes: data.allPasses, probeErrors: data.errors, evidence: `${name}.native-webgl.json` };
          await writeFile(join(output, `${name}.native-webgl.json`), JSON.stringify(data, null, 2) + '\n');
        } catch (error) { current.caseGraphicsDiagnosticError = String(error); current.status = 'failed'; current.error = `${current.error ?? ''}\nFailed preserving native WebGL evidence: ${error}`; process.exitCode = 1; }
        try { current.caseWorkspaceDiagnostics = await caseWorkspaceDiagnostics(page); }
        catch (error) { current.caseWorkspaceDiagnosticError = String(error); }
      } }, async (page, result) => {
      await assertFullLoad(page, result); await assertSpatial(page); await assertCountryBase(page);
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      const identity = await probe(page); assert.equal(identity.contexts.length, 1); assert.equal(identity.renderers.length, 1);
      assert.equal(identity.contexts[0].id, identity.renderers[0].contextId); assert.equal(identity.contexts[0].canvasId, identity.renderers[0].canvasId);
      await work(page, result);
      if (await caseWorkspace(page).count()) await closeWorkspace(page, until, result, 'scenario-final-close');
      await assertSpatial(page);
      const terminal = await fullProbe(page);
      assertTerminalNativeState(terminal); checkRetiredLeases(page, terminal);
      result.caseTerminalNativeState = { sequence: terminal.sequence, contexts: terminal.contexts.map(context => ({ id: context.id, poisoned: Boolean(context.poisoned), postPoisonThreeDraws: context.postPoisonThreeDraws, pendingPass: context.pendingPass, restorationErrors: context.restorationErrors })) };
    });
  }

  await run(GRAPHICS_SCENARIOS[0], { reducedMotion: true }, async (page, result) => {
    const initial = await page.evaluate(() => window.__caseGraphicsProbe.identities());
    const chrome = await captureCaseChromeBaseline(page, result);
    await openGraphicsWorkspace(page, until, result); await chooseCase(page, simple, until);
    await configure(page, { challenge: 'scene', pixelReads: true }); await showCaseScene(page, until);
    const frame = await assertCaseFrame(page, simple, until, result, 'native-arrow-proof');
    let data = await probe(page); assertRestoration(data);
    const scene = data.contexts[0].passes.find(pass => pass.challenge === 'scene');
    assert.equal(scene?.type, 'scene'); assert.notEqual(scene.before.DRAW_FRAMEBUFFER_BINDING, null); assert.notEqual(scene.before.READ_FRAMEBUFFER_BINDING, null);
    assert.notEqual(scene.before.DRAW_FRAMEBUFFER_BINDING, scene.before.READ_FRAMEBUFFER_BINDING, 'Distinct external draw/read FBO challenge was not exercised');
    assert.equal(scene.before.drawBuffers.filter(value => value !== 0).length, 2, 'Multiple actual external draw buffers were not exercised');
    result.caseNativeArrows = arrowEvidence(data, frame, simple);
    // Public custom-layer callback names in the actual case chunk identify the entry.
    // Leave the challenge armed across prerender; only the subsequent render callback
    // receives the default-FBO sentinel. Missing stack support fails this gate closed.
    await configure(page, { challenge: 'composite' });
    await page.evaluate(() => window.dispatchEvent(new Event('resize')));
    await until(async () => (await probe(page)).contexts[0].passes.some(pass => pass.challenge === 'composite'), 'Default-FBO native challenge never ran');
    data = await probe(page); assertRestoration(data);
    assert.equal(data.contexts[0].passes.find(pass => pass.challenge === 'composite')?.type, 'composite');
    assert.ok(data.contexts[0].passes.some(pass => pass.type === 'composite' && pass.draws.some(draw => draw.shaderKind === 'composite' && draw.nativeSucceeded)), 'No real composite draw');
    await assertActiveSuppression(page, result, 'challenged-case-boundaries');
    assert.deepEqual(await page.evaluate(() => window.__caseGraphicsProbe.identities()), initial, 'Case did not reuse the exact observed renderer/context/canvas');
    await nativeLayout(page, result, 'shared-boundary', until);
    await assertCaseChromeActive(page, result, chrome, 'native-scene-active');
    await capture(page, result, 'native-offscreen-composite-arrow-proof');
    await closeWorkspace(page, until, result, 'case40-native-reentry');
    await assertCaseChromeRestored(page, result, chrome, 'case40-native-reentry');
    await chrome.retained.dispose();
    await capture(page, result, 'native-geographic-reentry-after-close');
    result.notes.push('Exact same Three constructor object, canvas and native WebGL2 context observed. Independent native entry/exit snapshots test foreign draw/read FBOs, multiple draw buffers, textures/samplers, VAO/buffers and fixed-function state; actual arrow vertices, direction and interior pixels are checked against the retained source role.');
  });

  for (const [index, dpr] of [[1, 1], [2, 2]]) await run(GRAPHICS_SCENARIOS[index], { reducedMotion: true, deviceScaleFactor: dpr }, async (page, result) => {
    assert.equal(await page.evaluate(() => devicePixelRatio), dpr, 'Harness did not apply requested real browser deviceScaleFactor');
    await openGraphicsWorkspace(page, until, result); await chooseCase(page, dense, until); await showCaseScene(page, until);
    const base = await nativeLayout(page, result, 'default', until); assert.equal(base.quality, 1);
    await edgeButton(page, dense.edges[0].id).click(); await assertCaseFrame(page, dense, until);
    const selection = await caseWorkspace(page).getAttribute('data-case-selection');
    await caseWorkspace(page).getByRole('button', { name: 'Low quality off', exact: true }).click();
    const low = await nativeLayout(page, result, 'low-quality', until); assert.equal(low.quality, .65);
    assert.ok(low.target[0] < base.target[0] && low.target[1] < base.target[1], 'Low quality did not reduce the actual physical target');
    assert.equal(await caseWorkspace(page).getAttribute('data-case-selection'), selection);
    await caseWorkspace(page).getByRole('button', { name: 'Low quality on', exact: true }).click();
    await page.setViewportSize({ width: 1280, height: 900 }); const resized = await nativeLayout(page, result, 'resized', until);
    assert.notDeepEqual(resized.actualDrawingBuffer, base.actualDrawingBuffer); assert.equal(resized.quality, 1);
    // Observe real growth before any synthetic resize or user retry. A conservative
    // capture-phase fallback may retain the reader while MapLibre resizes its canvas.
    const identitiesBeforeGrowth = await page.evaluate(() => window.__caseGraphicsProbe.identities());
    const workspaceBeforeGrowth = await caseWorkspace(page).elementHandle();
    const growthBefore = await probe(page), growthStart = growthBefore.allPasses;
    const growthSequence = Math.max(0, ...growthBefore.contexts.flatMap(context => context.passes.map(pass => pass.id)));
    await page.setViewportSize({ width: 1600, height: 1100 });
    await until(async () => page.locator('.webgl-host canvas').evaluate((canvas, previous) => {
      const rect = canvas.getBoundingClientRect();
      return rect.width > previous.canvas.width && rect.height > previous.canvas.height &&
        canvas.width > previous.actualDrawingBuffer[0] && canvas.height > previous.actualDrawingBuffer[1];
    }, resized), 'Desktop growth did not resize the actual host canvas and drawing buffer');
    await frames(page, 3);
    const modeAfterGrowth = await caseWorkspace(page).getAttribute('data-case-view');
    assert.ok(['scene', 'list'].includes(modeAfterGrowth), 'Desktop growth lost the active case workspace');
    assert.equal(await workspaceBeforeGrowth.evaluate(element => element.isConnected && element === document.querySelector('[data-case-workspace]')), true, 'Desktop growth replaced the semantic workspace');
    assert.equal(await caseWorkspace(page).getAttribute('data-case-id'), dense.id);
    assert.equal(await caseWorkspace(page).getAttribute('data-case-selection'), selection);
    result.caseResizeGrowth = { viewport: { width: 1600, height: 1100 }, modeAfterGrowth,
      workspace: await caseWorkspace(page).evaluate(element => ({ ...element.dataset })),
      explicitSceneReentry: true, selection, retainedSourceIds: dense.sources.map(source => source.id) };
    let grown;
    if (modeAfterGrowth === 'scene') {
      grown = await nativeLayout(page, result, 'desktop-grown', until, { invalidate: false, afterPass: growthStart, afterSequence: growthSequence });
      await assertCaseFrame(page, dense, until, result, 'desktop-grown');
      await capture(page, result, `real-device-scale-${dpr}-desktop-grown`);
      await showCompleteCaseReader(page, until);
    } else {
      assert.equal(await caseSurface(page).count(), 0, 'Desktop growth reader fallback retained an invalid physical scene');
      await capture(page, result, `real-device-scale-${dpr}-desktop-grown-reader-fallback`);
    }
    result.caseResizeGrowth.completeReader = await assertCompleteCaseReader(page, dense);
    assert.equal(await controls(page).getByRole('button', { name: 'Back within case', exact: true }).isEnabled(), true, 'Desktop growth lost semantic history');
    const reentryBefore = await probe(page), reentryStart = reentryBefore.allPasses;
    const reentrySequence = Math.max(0, ...reentryBefore.contexts.flatMap(context => context.passes.map(pass => pass.id)));
    await showCaseScene(page, until, result, 'desktop-grown-reentry');
    const reentered = await nativeLayout(page, result, 'desktop-grown-reentry', until, { invalidate: false, afterPass: reentryStart, afterSequence: reentrySequence });
    assert.ok(reentered.board.width > resized.board.width && reentered.board.height > resized.board.height, 'Desktop growth did not enlarge both physical board dimensions');
    assert.ok(reentered.actualDrawingBuffer.every((value, axis) => value > resized.actualDrawingBuffer[axis]), 'Desktop growth did not enlarge the actual native drawing buffer');
    if (grown) {
      assert.deepEqual(reentered.actualDrawingBuffer, grown.actualDrawingBuffer);
      assert.deepEqual(reentered.actualViewport, grown.actualViewport);
      assert.deepEqual(reentered.target, grown.target);
    }
    assert.equal(await workspaceBeforeGrowth.evaluate(element => element.isConnected && element === document.querySelector('[data-case-workspace]')), true, 'Scene re-entry replaced the semantic workspace');
    assert.equal(await caseWorkspace(page).getAttribute('data-case-selection'), selection);
    assert.deepEqual(await page.evaluate(() => window.__caseGraphicsProbe.identities()), identitiesBeforeGrowth, 'Desktop growth or scene re-entry replaced the shared renderer/context/canvas');
    await assertCaseFrame(page, dense, until, result, 'desktop-grown-reentry');
    await capture(page, result, `real-device-scale-${dpr}-desktop-grown-reentry`);
    const beforeMove = await nativeLayout(page, result, 'before-position-only', until);
    const movementStart = (await probe(page)).allPasses;
    await caseSurface(page).evaluate(element => { element.parentElement.style.transform = 'translateX(7px)'; });
    const moved = await nativeLayout(page, result, 'position-only', until, { invalidate: false, afterPass: movementStart });
    assert.equal(moved.board.width, beforeMove.board.width); assert.equal(moved.board.height, beforeMove.board.height);
    assert.equal(moved.board.x, beforeMove.board.x + 7); assert.equal(moved.board.y, beforeMove.board.y);
    assert.deepEqual(moved.target, beforeMove.target, 'Position-only movement resized the target'); assert.notDeepEqual(moved.actualViewport, beforeMove.actualViewport);
    const restoreStart = (await probe(page)).allPasses;
    await caseSurface(page).evaluate(element => { element.parentElement.style.removeProperty('transform'); }); await nativeLayout(page, result, 'position-restored', until, { invalidate: false, afterPass: restoreStart });
    assert.equal(await caseWorkspace(page).getAttribute('data-case-selection'), selection); await capture(page, result, `real-device-scale-${dpr}-resize-and-quality`);
    result.notes.push(`Actual Chromium deviceScaleFactor=${dpr}; native drawing-buffer viewport/scissor, capped offscreen dimensions, quality changes, desktop shrink/growth, complete-reader-to-scene re-entry and CSS position-only movement were observed. No emulated production metrics substitute for native GL calls.`);
  });

  await run(GRAPHICS_SCENARIOS[3], {}, async (page, result) => {
    const beforeFlight = await geographicPoseObservation(page);
    assertGeographicPoseObservation(beforeFlight, 'geographic-render');
    result.interruptedGeographicPose = { beforeFlight };
    await page.getByRole('button', { name: 'Start a source trail', exact: true }).click();
    const journey = page.getByRole('region', { name: 'Camera journey' });
    await until(async () => await journey.count() === 1 && Number(await journey.locator('progress').getAttribute('value')) > 0, 'Geographic travel did not begin');
    await openGraphicsWorkspace(page, until, result); await frames(page, 3);
    // The legacy draw-only dataset may predate the last travel tick. Preserve it,
    // but use the live map sample taken at lease acquisition as the expected pose.
    const opening = await geographicPoseObservation(page);
    Object.assign(result.interruptedGeographicPose, { opening, staleRenderAtAcquisition: await geography(page) });
    assertGeographicPoseObservation(opening, 'workspace-acquisition');
    assert.notDeepEqual(opening.pose, beforeFlight.pose, 'Workspace must interrupt an advanced journey rather than capture the pre-flight pose');
    assert.equal(await journey.count(), 0, 'Workspace entry did not cancel geographic travel');
    await chooseCase(page, dense, until); await showCaseScene(page, until); await assertCaseFrame(page, dense, until);
    await assertActiveSuppression(page, result, 'before-interrupted-flight-close');
    const interruptedClose = await leaseSnapshot(page);
    assertActiveLeaseDrawSuppression(interruptedClose, activeLeaseBaselines.get(page)); checkRetiredLeases(page, interruptedClose.data);
    result.interruptedCaseTravel = await page.evaluate(edgeId => new Promise((resolve, reject) => {
      const root = document.querySelector('[data-case-workspace]'), select = root.querySelector(`[data-edge-id=${JSON.stringify(edgeId)}] button`);
      const close = [...root.querySelectorAll('button')].find(button => button.textContent === 'Close workspace');
      const timer = setTimeout(() => { observer.disconnect(); reject(new Error('Case motion was never observed before Close')); }, 3000);
      const observer = new MutationObserver(() => { if (root.dataset.caseMotion === 'true') { const evidence = { selection: root.dataset.caseSelection, motionBeforeClose: true }; observer.disconnect(); clearTimeout(timer); close.click(); resolve(evidence); } });
      observer.observe(root, { attributes: true, attributeFilter: ['data-case-motion'] }); select.click();
    }), dense.edges[0].id);
    await until(async () => await caseWorkspace(page).count() === 0, 'Close during active case travel failed');
    await requireGeographicRecovery(page, until, result, interruptedClose, 'interrupted-flight-close');
    await frames(page, 24);
    result.interruptedGeographicPose.afterClose = await geographicPoseObservation(page);
    assertCapturedGeographicPose(result.interruptedGeographicPose.afterClose, opening, 'Close failed to restore the captured geographic pose or resumed an interrupted journey');
    assert.equal(await journey.count(), 0); assert.equal(await page.getByRole('button', { name: 'Selected case files', exact: true }).evaluate(element => document.activeElement === element), true);
    await openGraphicsWorkspace(page, until, result); await chooseCase(page, dense, until); await showCaseScene(page, until); await assertCaseFrame(page, dense, until);
    assert.equal(await caseWorkspace(page).getAttribute('data-case-motion'), 'false');
    await edgeButton(page, dense.edges[0].id).click(); await assertCaseFrame(page, dense, until);
    const selection = await caseWorkspace(page).getAttribute('data-case-selection');
    await page.evaluate(() => window.__caseGraphicsProbe.loseContext()); await assertRetainedFailure(page, dense, selection, until);
    result.explicitRecreation = await recreateAndVerify(page, dense, selection, until, result);
    await closeWorkspace(page, until, result); await frames(page, 24);
    result.interruptedGeographicPose.afterRecreationClose = await geographicPoseObservation(page);
    assertCapturedGeographicPose(result.interruptedGeographicPose.afterRecreationClose, opening, 'Full graphics recreation lost the original non-HOME geography snapshot');
    assert.equal(await journey.count(), 0); await capture(page, result, 'interrupted-travel-restored-after-full-recreation');
  });

  await run(GRAPHICS_SCENARIOS[4], { reducedMotion: true }, async (page, result) => {
    await openGraphicsWorkspace(page, until, result); await chooseCase(page, dense, until); await showCaseScene(page, until);
    await edgeButton(page, dense.edges[0].id).click(); await assertCaseFrame(page, dense, until);
    const selection = await caseWorkspace(page).getAttribute('data-case-selection'), root = await caseWorkspace(page).elementHandle();
    await openSources(page, dense.claims.find(claim => claim.claimId === dense.edges[0].claimId));
    const sourceText = await caseSourceDialog(page).innerText(), old = await page.evaluate(() => window.__caseGraphicsProbe.identities());
    const lostId = await page.evaluate(() => window.__caseGraphicsProbe.loseContext());
    await until(async () => (await probe(page)).lost.some(event => event.contextId === lostId && event.nativeLost && event.trusted), 'Native WEBGL_lose_context did not dispatch an actual trusted loss event');
    await until(async () => await caseWorkspace(page).getAttribute('data-case-view') === 'list', 'Context loss did not retain reader mode');
    assert.equal(await root.evaluate(element => element.isConnected), true); assert.equal(await caseSourceDialog(page).innerText(), sourceText);
    assert.equal(await caseSourceDialog(page).evaluate(element => element.open && element.matches(':modal')), true, 'Graphics teardown lost the independent source dialog');
    await frames(page, 12); assert.deepEqual(await page.evaluate(() => window.__caseGraphicsProbe.identities()), old, 'Context loss silently recreated graphics without an explicit action');
    await capture(page, result, 'native-context-loss-source-dialog-survives'); await page.keyboard.press('Escape');
    await assertRetainedFailure(page, dense, selection, until); result.explicitRecreation = await recreateAndVerify(page, dense, selection, until, result);
    result.notes.push('The loss is generated by the native WEBGL_lose_context extension, with native isContextLost and a trusted canvas event required. An unsupported extension fails this gate. Source dialog, complete reader, exact selection and history survive; a new context/renderer appears only after Recreate graphics.');
  });

  for (const [index, fault] of [[5, 'shader'], [6, 'render']]) await run(GRAPHICS_SCENARIOS[index], { reducedMotion: true }, async (page, result) => {
    await openGraphicsWorkspace(page, until, result); await chooseCase(page, simple, until); await edgeButton(page, simple.edges[0].id).click();
    const selection = await caseWorkspace(page).getAttribute('data-case-selection'), before = await probe(page);
    await configure(page, { fault: { type: fault, fired: false } });
    await controls(page).getByRole('button', { name: 'Case scene', exact: true }).click();
    await until(async () => (await probe(page)).contexts.some(context => context.faultEvents.some(event => event.type === fault)), `Owned case ${fault} fault was not injected`);
    await assertRetainedFailure(page, simple, selection, until); await frames(page, 12);
    const data = await probe(page), context = data.contexts[0]; assertRestoration(data);
    assert.equal(context.faultEvents.length, 1, 'Fault injection escaped its one owned case pass');
    assert.equal(data.renderers.length, before.renderers.length, 'Failure automatically recreated the renderer');
    if (fault === 'render') { assert.ok(context.poisoned); assert.equal(context.postPoisonThreeDraws, 0, 'Same-frame or later Three drawing continued after a shared-renderer exception'); }
    else { assert.equal(context.poisoned, null); await assertActiveSuppression(page, result, 'contained-shader-reader'); assert.equal(await page.locator('.webgl-host').getAttribute('data-graphics-fatal'), null, 'Contained shader failure incorrectly poisoned the shared renderer'); }
    await openSources(page, simple.claims[0]); await capture(page, result, `${fault}-failure-complete-source-reader`); await page.keyboard.press('Escape');
    if (fault === 'shader') {
      // Phase A proves the shader-failed ORIGINAL renderer can resume geography.
      // Close intentionally ends this semantic workspace; phase B is newly seeded.
      const originalIdentity = liveGraphicsIdentity(data);
      await closeWorkspace(page, until, result, 'shader-original-renderer-recovery');
      assert.deepEqual(liveGraphicsIdentity(await probe(page)), originalIdentity);
      await capture(page, result, 'shader-original-renderer-geography-recovered');
      await openGraphicsWorkspace(page, until, result); await chooseCase(page, simple, until); await edgeButton(page, simple.edges[0].id).click();
      const secondBefore = await probe(page), secondContext = secondBefore.contexts.find(row => row.id === originalIdentity.contextId);
      assert.equal(await caseWorkspace(page).getAttribute('data-case-selection'), selection);
      result.shaderFaultEpisodes = [{ phase: 'A-original-renderer-containment', contextId: context.id, faultCount: context.faultEvents.length, semanticWorkspace: 'closed after retained reader proof' },
        { phase: 'B-explicit-recreation', contextId: secondContext.id, faultCountBefore: secondContext.faultEvents.length, semanticWorkspace: 'new workspace; selection/history explicitly re-established' }];
      await configure(page, { fault: { type: 'shader', fired: false } });
      await controls(page).getByRole('button', { name: 'Case scene', exact: true }).click();
      await until(async () => (await probe(page)).contexts.find(row => row.id === originalIdentity.contextId).faultEvents.length > secondContext.faultEvents.length, 'Second explicitly recorded shader episode did not fire');
      await assertRetainedFailure(page, simple, selection, until);
      const secondAfter = await probe(page), second = secondAfter.contexts.find(row => row.id === originalIdentity.contextId);
      assert.equal(second.faultEvents.length, secondContext.faultEvents.length + 1, 'Second shader episode must inject exactly one owned fault');
      assert.equal(second.poisoned, null); assertRestoration(secondAfter); await assertActiveSuppression(page, result, 'second-contained-shader-reader');
      result.shaderFaultEpisodes[1].faultCountAfter = second.faultEvents.length;
      await openSources(page, simple.claims[0]); await capture(page, result, 'shader-second-episode-retained-reader-before-recreation'); await page.keyboard.press('Escape');
    }
    result.explicitRecreation = await recreateAndVerify(page, simple, selection, until, result);
    const after = await probe(page); assertRestoration(after);
    for (const previous of after.contexts.filter(context => context.poisoned)) assert.equal(previous.postPoisonThreeDraws, 0);
    result.notes.push(fault === 'render' ? 'A one-shot exception interrupts only the native draw of the owned case felt program. Every subsequent same-context Three draw attempt is retained, including the current MapLibre frame. Zero are allowed before or after explicit complete renderer/context replacement.' : 'A one-shot actual shader-source compile error affects only the owned case felt fragment. Phase A retains reader/history and proves fresh geographic draws on the original renderer only after Close. Phase B opens a new workspace and explicitly re-establishes selection/history before a second declared one-shot shader fault; full recreation preserves that second workspace. Both geographic recoveries require the current default-target viewport.');
  });

  await run(GRAPHICS_SCENARIOS[7], { reducedMotion: true, budgetMs: 300000 }, async (page, result) => {
    lifecycleObservationPages.add(page);
    async function checkpoint(phase, recovery = null) {
      const pair = await page.evaluate(() => ({ active: document.querySelector('.webgl-host')?.dataset.geographicWorkspaceActive,
        workspaceCount: document.querySelectorAll('[data-case-workspace]').length, ...window.__caseGraphicsProbe.readLifecyclePair() }));
      const stem = `${GRAPHICS_SCENARIOS[7]}--${phase}`;
      const entry = { phase, sequence: pair.full.sequence, rawEvidence: `${stem}.native-webgl.json`, compactEvidence: `${stem}.compact-observation.json`, status: 'pending' };
      (result.caseResourceObservationChecks ??= []).push(entry);
      // The raw data is saved before assertions, and never routed through probe().
      await writeFile(join(output, entry.rawEvidence), JSON.stringify(pair.full, null, 2) + '\n');
      await writeFile(join(output, entry.compactEvidence), JSON.stringify({ active: pair.active, workspaceCount: pair.workspaceCount, data: pair.compact, recovery }, null, 2) + '\n');
      const comparison = assertLifecycleObservationParity(pair, { activeBaseline: activeLeaseBaselines.get(page) ?? null,
        retiredBaselines: retiredLeaseBaselines.get(page) ?? [], recovery });
      Object.assign(entry, comparison, { status: 'passed' });
      return pair.full;
    }
    try {
    async function cycle(number, warmup) {
      const before = await probe(page), start = performance.now();
      await openGraphicsWorkspace(page, until, result); await chooseCase(page, dense, until); await showCaseScene(page, until);
      await edgeButton(page, dense.edges[0].id).click(); await assertCaseFrame(page, dense, until);
      await caseWorkspace(page).getByRole('button', { name: 'Low quality off', exact: true }).click(); await nativeLayout(page, result, `${warmup ? 'warmup' : 'cycle'}-${number}-low`, until);
      await showCompleteCaseReader(page, until); await showCaseScene(page, until); await assertCaseFrame(page, dense, until);
      if (!warmup && [1, 15, 30].includes(number)) {
        await capture(page, result, `native-lifecycle-cycle-${number}`);
        await checkpoint(`cycle-${number}-before-close`);
      }
      await closeWorkspace(page, until, result);
      await until(async () => (await probe(page)).contexts.every(context => context.caseLive === 0), `Cycle ${number}: case-owned native handles did not receive deletion requests`);
      await frames(page, 3); const after = await probe(page), current = after.contexts[0]; assertRestoration(after);
      if (!warmup && [1, 15, 30].includes(number)) await checkpoint(`cycle-${number}-closed`, result.caseGeographicRecovery.at(-1));
      return { cycle: number, contextIds: after.contexts.map(row => row.id), rendererIds: after.renderers.map(row => row.id), live: current.live, caseLive: current.caseLive,
        scenePasses: current.scenePasses - before.contexts[0].scenePasses, compositePasses: current.compositePasses - before.contexts[0].compositePasses, wallMs: performance.now() - start };
    }
    result.caseResourceWarmups = []; for (let index = 1; index <= 3; index++) result.caseResourceWarmups.push(await cycle(index, true));
    const baseline = result.caseResourceWarmups.at(-1);
    await checkpoint('warmed-baseline', result.caseGeographicRecovery.at(-1));
    result.caseResourceCycles = [];
    for (let index = 1; index <= 30; index++) result.caseResourceCycles.push(await cycle(index, false));
    assertHandlePlateau(baseline, result.caseResourceCycles);
    await openGraphicsWorkspace(page, until, result); await chooseCase(page, dense, until); await showCaseScene(page, until);
    const timingStart = await page.evaluate(() => performance.now());
    const frameDeltas = await page.evaluate(() => window.__caseGraphicsProbe.frames(120, true));
    const data = await probe(page), renderedStarts = data.contexts[0].passTimes.filter(row => row.type === 'composite' && row.startedAt >= timingStart).map(row => row.startedAt);
    assert.ok(renderedStarts.length >= 2, 'Controlled input-driven timing sample produced no repeated native composite frames');
    result.caseTiming = { label: 'Instrumentation-enabled Chromium/ANGLE SwiftShader CI software WebGL; not production/device FPS or GPU execution time',
      sampleInput: '120 animation-frame opportunities, each dispatching the existing Home key action to the case surface',
      actualCompositeFrameIntervals: timingSummary(renderedStarts.slice(1).map((value, index) => value - renderedStarts[index])),
      browserAnimationFrameIntervals: timingSummary(frameDeltas), sceneBoundaryCPU: timingSummary(data.contexts[0].passTimes.filter(row => row.type === 'scene').map(row => row.durationMs)),
      compositeBoundaryCPU: timingSummary(data.contexts[0].passTimes.filter(row => row.type === 'composite').map(row => row.durationMs)), measuredCycleWallTime: timingSummary(result.caseResourceCycles.map(row => row.wallMs)) };
    await checkpoint('timing-active');
    await closeWorkspace(page, until, result); assert.equal((await probe(page)).contexts[0].caseLive, 0);
    await checkpoint('timing-closed', result.caseGeographicRecovery.at(-1));
    assert.equal(result.caseResourceObservationChecks.length, 9);
    assert.ok(result.caseResourceObservationChecks.every(row => row.status === 'passed'));
    result.notes.push('Three warm-up cycles are disclosed separately; all thirty measured cycles open/close, select, change quality and detach/reattach the case layer. Every observed native resource kind must return to or below the warmed baseline, case-owned live handles must be zero, and renderer/context identities cannot grow. These are create/delete-handle observations, not GPU-memory residency. Compact transport observations retain the unchanged native oracles; warmed, cycle 1/15/30 and timing/recovery raw checkpoints independently compare full and compact data from the same instant.');
    } finally { lifecycleObservationPages.delete(page); }
  });
  coverage.scenarios = report.scenarios.filter(row => GRAPHICS_SCENARIOS.includes(row.name)).map(row => ({ name: row.name, status: row.status, error: row.error ?? null, nativeEvidence: row.caseGraphics?.evidence ?? null }));
  coverage.selectedBrowserAcceptancePassed = coverage.scenarios.length === selectedScenarios.length && coverage.scenarios.every(row => selectedScenarios.includes(row.name) && row.status === 'passed' && row.nativeEvidence);
  coverage.browserAcceptancePassed = coverage.scenarios.length === GRAPHICS_SCENARIOS.length && coverage.scenarios.every(row => row.status === 'passed' && row.nativeEvidence);
  await writeFile(join(output, 'case-graphics-coverage-index.json'), JSON.stringify(coverage, null, 2) + '\n');
  assert.ok(coverage.selectedBrowserAcceptancePassed, `Required ${mode} native graphics scenarios did not all pass with preserved evidence`);
}
