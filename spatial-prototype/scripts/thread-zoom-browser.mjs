/** CI-only native zoom regression. Importing helpers never launches a browser.
 * Observes Three r180 scenes and native GL uploads/draws; never changes scene data,
 * camera internals, materials, draw arguments, or native draw results. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { readFile, mkdir, realpath, writeFile } from 'node:fs/promises';
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

export const ATLAS_EDGE = 'legacy:relationship:9e7654ec6cc7ec18|joshi|role|coal';
export const CASE_EDGE = 'case:india-ambani:edge:1:1';
export const CROSSING_CENTER = Object.freeze([76.329121982, 21.999570445240124]);
export const REQUIRED_ZOOMS = Object.freeze([4.5, 5.9, 6, 8, 16, 17, 18, 19]);
export const BASELINE_COMMIT = '85702ec5f553415e009a37e89d7333c96c952c66';
export const LIVE_ATLAS_URL = 'https://occult-kranti.github.io/india-corporate-intelligence/spatial/';
export const PREFIX = '/india-corporate-intelligence/spatial/';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export function requireAuthorizedCI(env = process.env) {
  assert.equal(env.GITHUB_ACTIONS, 'true', 'Native zoom review is restricted to GitHub Actions. No local browser was launched.');
  assert.equal(env.SPATIAL_BROWSER_REVIEW, 'github-actions', 'Native zoom review requires the authorized spatial CI workflow.');
}
export function parseMode(args) {
  if (!args.length) return 'candidate';
  if (args.length === 1 && args[0] === '--live-diagnostic') return 'live-diagnostic';
  assert.deepEqual(args, ['--baseline-diagnostic'], 'Only --baseline-diagnostic or --live-diagnostic is supported; candidate is strict by default.');
  return 'baseline-diagnostic';
}
export function mercator([lng, lat]) {
  return [(lng + 180) / 360, (180 - 180 / Math.PI * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360))) / 360];
}
export function diagnosticStatus(mode, checks) {
  if (checks.some(check => check.status === 'failed')) return 'failed';
  return mode === 'candidate' ? 'passed' : checks.some(check => /failure|unsupported/.test(check.status)) ? 'diagnostic-incomplete' : 'diagnostic-only';
}
export function panDelta(center, destination, zoom) {
  const a = mercator(center), b = mercator(destination), scale = 512 * 2 ** zoom;
  return [(a[0] - b[0]) * scale, (a[1] - b[1]) * scale];
}
/** MapLibre 6.13 activates at 3 CSS px; CaseInputAdapter requires >5 px.
 * Always activate with one deliberate 12 px move before the exact correction.
 * A short correction returns along the same held drag, so it cannot be a click. */
export function dragOffsets(delta) {
  assert.ok(delta.length === 2 && delta.every(Number.isFinite), 'Invalid pointer delta');
  const distance = Math.hypot(...delta);
  assert.ok(distance > 0, 'A zero correction must not send a pointer gesture');
  return [delta.map(value => value / distance * 12), [...delta]];
}

/** Serialized read-only DOM hit testing; no overlay dismissal, style or camera changes.
 * Check the entire route, including its activation leg, against the exact input surface. */
export function findClearGesture({ selector, offsets = [] }) {
  const surface = document.querySelector(selector);
  const describe = element => element ? { tag: element.tagName, id: element.id, class: element.getAttribute('class'), label: element.getAttribute('aria-label') } : null;
  if (!surface) return { plan: null, selector, reason: 'Input surface is missing' };
  const rect = surface.getBoundingClientRect(), inset = 8;
  const bounds = { left: Math.max(0, rect.left) + inset, top: Math.max(0, rect.top) + inset,
    right: Math.min(innerWidth, rect.right) - inset, bottom: Math.min(innerHeight, rect.bottom) - inset };
  const blocked = new Map(); let attempts = 0, samples = 0;
  const hit = point => {
    samples++;
    const target = document.elementFromPoint(point.x, point.y), clear = target === surface;
    if (!clear) { const key = JSON.stringify(describe(target)); blocked.set(key, (blocked.get(key) ?? 0) + 1); }
    return clear;
  };
  const inBounds = point => point.x >= bounds.left && point.x <= bounds.right && point.y >= bounds.top && point.y <= bounds.bottom;
  const candidates = [[.5,.5],[.5,.6],[.7,.5],[.3,.5],[.65,.65],[.35,.65]].map(([x,y]) => ({ x: rect.x + rect.width * x, y: rect.y + rect.height * y }));
  for (let y = bounds.top; y <= bounds.bottom; y += 16)
    for (let x = bounds.left; x <= bounds.right; x += 16) candidates.push({ x, y });
  for (const start of candidates) {
    attempts++;
    const points = [start, ...offsets.map(([x,y]) => ({ x: start.x + x, y: start.y + y }))];
    if (!points.every(inBounds)) continue;
    let clear = true;
    for (let i = 0; clear && i < points.length; i++) {
      const a = points[Math.max(0, i - 1)], b = points[i], steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 4));
      for (let step = 0; clear && step <= steps; step++) {
        const x = a.x + (b.x - a.x) * step / steps, y = a.y + (b.y - a.y) * step / steps;
        // A small clear corridor avoids sitting directly on a label/control boundary.
        clear = [[0,0],[-3,0],[3,0],[0,-3],[0,3]].every(([dx,dy]) => hit({ x: x + dx, y: y + dy }));
      }
    }
    if (clear) return { plan: { start, points: points.slice(1) }, selector, bounds, attempts, samples,
      hitTargets: points.map(point => ({ ...point, target: describe(document.elementFromPoint(point.x, point.y)) })) };
  }
  return { plan: null, selector, bounds, attempts, samples, blockedTargets: [...blocked].map(([target,count]) => ({ target: JSON.parse(target), count })) };
}

/** Serialized diagnostic snapshot also survives a failure before the first GL checkpoint. */
export function navigationSnapshot() {
  const host = document.querySelector('.webgl-host'), inspector = document.querySelector('.evidence-inspector'), workspace = document.querySelector('[data-case-workspace]');
  const parse = text => { try { return JSON.parse(text ?? 'null'); } catch { return text; } };
  return { geographicPose: parse(host?.dataset.geographicPose), renderedEdgeIds: parse(host?.dataset.renderedEdgeIds),
    inspector: inspector ? { metadata: parse(inspector.querySelector('.retained-metadata pre')?.textContent), rect: inspector.getBoundingClientRect().toJSON() } : null,
    caseSelection: workspace?.dataset.caseSelection ?? null, caseView: workspace?.dataset.caseView ?? null,
    canvas: host?.querySelector('canvas')?.getBoundingClientRect().toJSON() ?? null,
    viewport: { width: innerWidth, height: innerHeight } };
}
export function clipSegment(a, b, width, height) {
  let lo = 0, hi = 1;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  for (const [p, q] of [[-dx, a[0]], [dx, width - a[0]], [-dy, a[1]], [dy, height - a[1]]]) {
    if (!p) { if (q < 0) return null; continue; }
    const t = q / p;
    if (p < 0) lo = Math.max(lo, t); else hi = Math.min(hi, t);
    if (lo > hi) return null;
  }
  return [[a[0] + lo * dx, a[1] + lo * dy], [a[0] + hi * dx, a[1] + hi * dy]];
}
export function assertRasterEvidence(row, label) {
  assert.ok(row && row.draws.length, `${label}: exact thread had no native draw submission`);
  const samples = row.draws.filter(draw => draw.nativePositionBufferMatched === true && draw.raster && !draw.raster.error);
  assert.ok(samples.length, `${label}: no native before/after raster sample`);
  assert.ok(samples.some(({ raster: r }) => r.changedPixels >= 8 && r.spanCss >= 16 && r.meanWidthCss >= .4 && r.coverage >= .8 && r.maxGapCss <= 4),
    `${label}: native draw did not produce a continuous readable raster strip: ${JSON.stringify(samples.map(d => d.raster))}`);
  assert.ok(row.canvas.width > 0 && row.canvas.height > 0 && row.buffer.width > 0 && row.buffer.height > 0, `${label}: missing canvas/buffer bounds`);
  assert.equal(row.contextLost, false, `${label}: native context lost`);
}
export function recordCheck(report, label, work, diagnostic = false) {
  try { work(); report.checks.push({ label, status: 'passed' }); }
  catch (error) { report.checks.push({ label, status: diagnostic === 'live' ? 'live-diagnostic-failure' : diagnostic ? 'baseline-diagnostic-failure' : 'failed', message: error.message }); }
}

/** Serialized with addInitScript. Only native GL methods and the official read-only
 * Three observer are wrapped. Upload-array identity maps a real GPU buffer back to
 * the original mesh. No renderer methods, factual arrays, uniforms or matrices are patched. */
export function installThreadZoomProbe({ atlasEdge, caseEdge }) {
  const scenes = [], contexts = [], renderers = [], buffers = new WeakMap(), shaderSources = new WeakMap(), programSources = new WeakMap();
  const nativeGetContext = HTMLCanvasElement.prototype.getContext;
  const state = { active: null, captures: {}, errors: [], versions: [], contexts: [], renderers: 0, inputs: [] };
  const observer = new EventTarget();
  observer.addEventListener('register', event => state.versions.push(event.detail.revision));
  observer.addEventListener('observe', event => {
    const value = event.detail;
    if (value?.isScene) scenes.push(value);
    if (value?.isWebGLRenderer) { renderers.push(value); state.renderers = renderers.length; }
  });
  if (typeof window.__THREE_DEVTOOLS__ !== 'undefined') throw new Error('Zoom probe refuses to replace an existing Three observer');
  window.__THREE_DEVTOOLS__ = observer;
  const rect = element => element?.getBoundingClientRect().toJSON() ?? null;
  const hostPose = () => {
    try { return JSON.parse(document.querySelector('.webgl-host')?.dataset.geographicPose ?? 'null')?.pose ?? null; }
    catch { return null; }
  };
  const inputTarget = element => element instanceof Element ? { tag: element.tagName, id: element.id,
    class: element.getAttribute('class'), label: element.getAttribute('aria-label') } : null;
  // Passive capture observes real input, including a click later suppressed by MapLibre.
  // It never dispatches events, changes handlers or prevents their normal behavior.
  for (const type of ['mousedown','mousemove','mouseup','click','wheel','keydown']) window.addEventListener(type, event => {
    if (type === 'mousemove' && !event.buttons) return;
    const row = { type, time: performance.now(), trusted: event.isTrusted, x: event.clientX ?? null, y: event.clientY ?? null,
      buttons: event.buttons ?? null, key: event.key ?? null, deltaY: event.deltaY ?? null, target: inputTarget(event.target),
      hitTarget: Number.isFinite(event.clientX) ? inputTarget(document.elementFromPoint(event.clientX, event.clientY)) : null, pose: hostPose() };
    state.inputs.push(row);
    queueMicrotask(() => { row.defaultPrevented = event.defaultPrevented; });
  }, { capture: true, passive: true });
  const inside = (p, box) => p[0] >= 0 && p[0] <= box.width && p[1] >= 0 && p[1] <= box.height;
  function atlasMesh() {
    for (const scene of scenes) {
      let found; scene.traverse(object => { if (object.userData?.edgeId === atlasEdge) found = object; });
      if (found?.parent) return found;
    }
    return null;
  }
  function caseMeshes() {
    const roots = scenes.filter(scene => scene.children.some(object => object.isGroup && object.children.some(mesh => mesh.geometry?.attributes.distanceAlong)));
    const root = roots.at(-1), meshes = [];
    root?.traverse(mesh => { if (mesh.renderOrder === 11 && mesh.geometry?.attributes.distanceAlong) meshes.push(mesh); });
    const ids = [...document.querySelectorAll('.ocv2-evidence [data-edge-id]')].map(element => element.dataset.edgeId);
    // At detail zoom all roles are represented in source order. Reject ambiguity.
    return { mesh: ids.length === meshes.length ? meshes[ids.indexOf(caseEdge)] : null, ids, count: meshes.length };
  }
  function atlasGeometry(mesh, canvas) {
    const pose = hostPose();
    if (!mesh || !pose) return null;
    const curve = mesh.geometry.parameters?.path;
    if (!curve) return null;
    const m = ([lng, lat]) => [(lng + 180) / 360, (180 - 180 / Math.PI * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360))) / 360];
    const center = m(pose.center), size = rect(canvas), scale = 512 * 2 ** pose.zoom;
    const points = curve.getSpacedPoints(48).map(p => [(p.x - center[0]) * scale + size.width / 2, (p.y - center[1]) * scale + size.height / 2]);
    return { points, endpoints: [points[0], points.at(-1)], bothEndpointsOffscreen: !inside(points[0], size) && !inside(points.at(-1), size), topDownOnly: pose.pitch === 0 && pose.bearing === 0 };
  }
  function caseGeometry(mesh) {
    const board = rect(document.querySelector('[data-case-surface]'));
    if (!mesh || !board) return null;
    const p = mesh.geometry.attributes.position.array, count = mesh.geometry.drawRange.count / 6;
    const center = index => [((p[index] + p[index + 3]) / 2 + 1) * board.width / 2, (1 - (p[index + 1] + p[index + 4]) / 2) * board.height / 2];
    const points = Array.from({ length: count }, (_, i) => center(i * 12));
    points.push(center((count - 1) * 12 + 6));
    return { board, points, endpoints: [points[0], points.at(-1)], bothEndpointsOffscreen: !inside(points[0], board) && !inside(points.at(-1), board) };
  }
  function snapshot(kind) {
    const context = contexts.find(row => row.canvas === document.querySelector('.webgl-host canvas'));
    if (!context) return null;
    const mesh = kind === 'atlas' ? atlasMesh() : caseMeshes().mesh;
    return { kind, edgeId: kind === 'atlas' ? atlasEdge : caseEdge, canvas: rect(context.canvas), buffer: { width: context.gl.drawingBufferWidth, height: context.gl.drawingBufferHeight },
      pose: hostPose(), geometry: kind === 'atlas' ? atlasGeometry(mesh, context.canvas) : caseGeometry(mesh),
      meshObserved: Boolean(mesh), meshUuid: mesh?.uuid ?? null, meshVisibleDiagnosticOnly: mesh?.visible ?? null, contextLost: context.native.isContextLost(),
      visibleEdgeIds: kind === 'atlas' ? JSON.parse(document.querySelector('.webgl-host')?.dataset.renderedEdgeIds ?? '[]') : caseMeshes().ids,
      semanticMode: document.querySelector('.webgl-host')?.dataset.semanticMode, caseSelection: document.querySelector('[data-case-workspace]')?.dataset.caseSelection ?? null,
      caseView: document.querySelector('[data-case-workspace]')?.dataset.caseView ?? null };
  }
  function instrument(gl, canvas) {
    if (contexts.some(row => row.gl === gl)) return;
    if (!(gl instanceof WebGL2RenderingContext)) throw new Error('Native zoom probe requires real WebGL2');
    const native = {};
    for (let proto = gl; proto && proto !== Object.prototype; proto = Object.getPrototypeOf(proto))
      for (const name of Object.getOwnPropertyNames(proto)) if (!(name in native)) { const descriptor = Object.getOwnPropertyDescriptor(proto, name); if (typeof descriptor?.value === 'function') native[name] = descriptor.value.bind(gl); }
    const row = { gl, canvas, native }; contexts.push(row);
    const debug = native.getExtension('WEBGL_debug_renderer_info');
    state.contexts.push({ version: native.getParameter(gl.VERSION), renderer: native.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER) });
    gl.bufferData = function (target, data, ...rest) {
      const value = native.bufferData(target, data, ...rest);
      if (ArrayBuffer.isView(data)) buffers.set(data, native.getParameter(target === gl.ARRAY_BUFFER ? gl.ARRAY_BUFFER_BINDING : gl.ELEMENT_ARRAY_BUFFER_BINDING));
      return value;
    };
    gl.bufferSubData = function (target, offset, data, ...rest) {
      const value = native.bufferSubData(target, offset, data, ...rest);
      if (ArrayBuffer.isView(data)) buffers.set(data, native.getParameter(target === gl.ARRAY_BUFFER ? gl.ARRAY_BUFFER_BINDING : gl.ELEMENT_ARRAY_BUFFER_BINDING));
      return value;
    };
    gl.shaderSource = function (shader, source) { shaderSources.set(shader, String(source)); return native.shaderSource(shader, source); };
    gl.attachShader = function (program, shader) { programSources.set(program, [...(programSources.get(program) ?? []), shaderSources.get(shader) ?? '']); return native.attachShader(program, shader); };
    function readRegion(kind) {
      const viewport = Array.from(native.getParameter(gl.VIEWPORT));
      const defaultTarget = native.getParameter(gl.DRAW_FRAMEBUFFER_BINDING) === null;
      if ((kind === 'atlas') !== defaultTarget) throw new Error('Thread drew into the wrong native framebuffer');
      if (native.getParameter(gl.READ_FRAMEBUFFER_BINDING) !== native.getParameter(gl.DRAW_FRAMEBUFFER_BINDING)) throw new Error('Probe refuses to change framebuffer bindings for readback');
      const box = kind === 'atlas' ? rect(canvas) : rect(document.querySelector('[data-case-surface]'));
      const sx = viewport[2] / box.width, sy = viewport[3] / box.height;
      const width = Math.min(viewport[2], Math.max(1, Math.ceil(160 * sx))), height = Math.min(viewport[3], Math.max(1, Math.ceil(128 * sy)));
      const x = viewport[0] + Math.floor((viewport[2] - width) / 2), y = viewport[1] + Math.floor((viewport[3] - height) / 2);
      // Existing host contract uses ordinary tightly packed reads. Never mutate GL state.
      for (const name of ['PACK_ROW_LENGTH', 'PACK_SKIP_PIXELS', 'PACK_SKIP_ROWS']) if (native.getParameter(gl[name]) !== 0) throw new Error(`Unexpected ${name}`);
      if (native.getParameter(gl.PIXEL_PACK_BUFFER_BINDING)) throw new Error('Unexpected pixel pack buffer');
      const pixels = new Uint8Array(width * height * 4);
      native.readPixels(x, y, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      return { pixels, width, height, x, y, sx, sy };
    }
    function rasterDelta(a, b) {
      const encode = pixels => { let text = ''; for (let i = 0; i < pixels.length; i += 4096) text += String.fromCharCode(...pixels.subarray(i, i + 4096)); return btoa(text); };
      let changedPixels = 0, minX = a.width, minY = a.height, maxX = -1, maxY = -1;
      const columns = new Set(), rows = new Set();
      for (let i = 0; i < a.pixels.length; i += 4) {
        if (Math.max(...[0, 1, 2].map(c => Math.abs(a.pixels[i + c] - b.pixels[i + c]))) < 2) continue;
        const x = (i / 4) % a.width, y = Math.floor(i / 4 / a.width); changedPixels++;
        minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); columns.add(x); rows.add(y);
      }
      const major = maxX - minX >= maxY - minY ? { values: columns, lo: minX, hi: maxX, scale: a.sx } : { values: rows, lo: minY, hi: maxY, scale: a.sy };
      let gap = 0, maxGap = 0; for (let i = major.lo; i <= major.hi; i++) { gap = major.values.has(i) ? 0 : gap + 1; maxGap = Math.max(maxGap, gap); }
      const coverage = changedPixels ? major.values.size / (major.hi - major.lo + 1) : 0;
      const spanCss = changedPixels ? Math.hypot((maxX - minX + 1) / a.sx, (maxY - minY + 1) / a.sy) : 0;
      return { changedPixels, spanCss, coverage, maxGapCss: maxGap / major.scale, meanWidthCss: spanCss ? changedPixels / (a.sx * a.sy) / spanCss : 0,
        changedColumns: columns.size, changedRows: rows.size, roi: { x: a.x, y: a.y, width: a.width, height: a.height },
        bounds: changedPixels ? { minX, minY, maxX, maxY } : null, beforeRgbaBase64: encode(a.pixels), afterRgbaBase64: encode(b.pixels), sampleMethod: 'native readPixels immediately before/after the exact original thread draw' };
    }
    for (const method of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced']) {
      gl[method] = function (...args) {
        const active = state.active, capture = active && state.captures[active.name];
        let matched = false, before = null, record = null;
        if (active && capture.draws.length < 8) {
          try {
            const program = native.getParameter(gl.CURRENT_PROGRAM), sources = (programSources.get(program) ?? []).join('\n');
            const mesh = active.kind === 'atlas' ? atlasMesh() : caseMeshes().mesh;
            const position = program && native.getAttribLocation(program, 'position');
            const actualBuffer = position >= 0 ? native.getVertexAttrib(position, gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING) : null;
            matched = Boolean(mesh && actualBuffer && buffers.get(mesh.geometry.attributes.position.array) === actualBuffer &&
              (active.kind === 'atlas' ? sources.includes('uThreadRadius') : sources.includes('distanceAlong') && sources.includes('uniform float stops[8]')));
            if (matched) {
              const snap = snapshot(active.kind); Object.assign(capture, snap);
              record = { method, args: [...args], nativePositionBufferMatched: true, shaderKind: active.kind, viewport: Array.from(native.getParameter(gl.VIEWPORT)) };
              try { before = readRegion(active.kind); } catch (error) { record.raster = { error: String(error) }; }
            }
          } catch (error) { state.errors.push(String(error)); }
        }
        // Exactly one original call, with unchanged arguments, even if observation fails.
        const result = native[method](...args);
        if (matched && record) {
          if (before) try { record.raster = rasterDelta(before, readRegion(active.kind)); } catch (error) { record.raster = { error: String(error) }; }
          capture.draws.push(record);
        }
        return result;
      };
    }
  }
  HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
    const context = Reflect.apply(nativeGetContext, this, [kind, ...args]);
    if (/^(webgl2?|experimental-webgl)$/.test(kind) && context) instrument(context, this);
    return context;
  };
  window.__threadZoomProbe = Object.freeze({
    arm(name, kind) { state.active = { name, kind }; state.captures[name] = { ...snapshot(kind), draws: [] }; },
    stop() { state.active = null; },
    snapshot,
    report() { return JSON.parse(JSON.stringify({ ...state, active: null })); },
  });
}

async function until(check, message, timeout = 20000) {
  const end = Date.now() + timeout;
  do { if (await check()) return; await delay(60); } while (Date.now() < end);
  throw new Error(message);
}
async function pose(page) {
  return page.locator('.webgl-host').evaluate(element => JSON.parse(element.dataset.geographicPose).pose);
}
const navigationReports = new WeakMap();
async function gesturePlan(page, selector, offsets, label) {
  const receipt = { label, offsets, before: await page.evaluate(navigationSnapshot) };
  navigationReports.get(page)?.push(receipt);
  receipt.hitTest = await page.evaluate(findClearGesture, { selector, offsets });
  assert.ok(receipt.hitTest.plan, `No unobstructed ${selector} gesture path: ${JSON.stringify(receipt.hitTest)}`);
  return receipt;
}
async function clearMapPoint(page) {
  const receipt = await gesturePlan(page, '.webgl-host canvas', [], 'atlas wheel target');
  return receipt.hitTest.plan.start;
}
async function dragSurface(page, selector, delta, label) {
  const receipt = await gesturePlan(page, selector, dragOffsets(delta), label), { start, points } = receipt.hitTest.plan;
  await page.mouse.move(start.x, start.y);
  let pressed = false;
  try {
    await page.mouse.down(); pressed = true;
    // One first move crosses both real handlers' activation thresholds. Splitting it
    // into tiny steps would discard pre-activation motion in CaseInputAdapter.
    await page.mouse.move(points[0].x, points[0].y);
    await delay(40);
    await page.mouse.move(points[1].x, points[1].y, { steps: Math.max(1, Math.ceil(Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y) / 16)) });
    // MapLibre's inertia buffer expires after 160 ms; allow a rendered frame first.
    await delay(240);
    receipt.releaseHit = await page.evaluate(({ selector, point }) => {
      const hit = document.elementFromPoint(point.x, point.y);
      return { point, clear: hit === document.querySelector(selector), target: hit ? { tag: hit.tagName, id: hit.id, class: hit.getAttribute('class'), label: hit.getAttribute('aria-label') } : null };
    }, { selector, point: points[1] });
    assert.equal(receipt.releaseHit.clear, true, 'Pointer release is obstructed; preserve the target diagnostics');
  } finally {
    if (pressed) await page.mouse.up();
    await delay(80);
    receipt.after = await page.evaluate(navigationSnapshot);
  }
  assert.equal(Boolean(receipt.after.inspector), Boolean(receipt.before.inspector), 'A navigation drag changed atlas reader visibility; do not silently close it');
  assert.deepEqual(receipt.after.inspector?.metadata ?? null, receipt.before.inspector?.metadata ?? null, 'A navigation drag opened or changed the atlas reader; do not silently close it');
  assert.equal(receipt.after.caseSelection, receipt.before.caseSelection, 'A navigation drag selected a case object');
  assert.equal(receipt.after.caseView, receipt.before.caseView, 'A navigation drag changed the case view');
}
async function setAtlasZoom(page, requested) {
  const target = requested === 6 ? 6.0001 : requested;
  for (let iteration = 0; iteration < 55; iteration++) {
    const current = (await pose(page)).zoom, difference = target - current;
    if (Math.abs(difference) < .00025 && (requested !== 6 || current >= 6)) return;
    if (Math.abs(difference) > .52) {
      await page.getByRole('button', { name: difference > 0 ? 'Zoom in' : 'Zoom out', exact: true }).click();
    } else {
      // Small trackpad deltas unambiguously use MapLibre 6.13's 1/100 rate.
      const delta = -Math.sign(difference) * Math.min(3.8, -100 * Math.log(2 / (2 ** Math.abs(difference)) - 1));
      const point = await clearMapPoint(page); await page.mouse.move(point.x, point.y); await page.mouse.wheel(0, delta);
    }
    await until(async () => Math.abs((await pose(page)).zoom - current) > .00001, `Camera did not respond while moving to zoom ${requested}`, 5000);
    await delay(70);
  }
  throw new Error(`Could not reach zoom ${requested}: ${JSON.stringify(await pose(page))}`);
}
async function centerAtlas(page, destination = CROSSING_CENTER) {
  for (let iteration = 0; iteration < 25; iteration++) {
    const p = await pose(page), delta = panDelta(p.center, destination, p.zoom);
    if (Math.hypot(...delta) < .3) return;
    const scale = Math.min(1, 90 / Math.max(...delta.map(Math.abs)));
    await dragSurface(page, '.webgl-host canvas', delta.map(value => value * scale), `atlas center correction ${iteration}`);
  }
  throw new Error(`Could not center the original crossing: ${JSON.stringify(await pose(page))}`);
}
async function screenshot(page, directory, name, requireCanvas = true) {
  const filename = `${name}.png`; await page.screenshot({ path: join(directory, filename), fullPage: true });
  const png = await readFile(join(directory, filename));
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'Screenshot is not a native PNG');
  const pixels = { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
  const canvas = await page.locator('.webgl-host canvas').count() ? await page.locator('.webgl-host canvas').boundingBox() : null;
  if (requireCanvas) assert.ok(canvas && canvas.x >= 0 && canvas.y >= 0 && canvas.x + canvas.width <= pixels.width + 1 && canvas.y + canvas.height <= pixels.height + 1, 'Screenshot must include the real canvas bounds');
  return { filename, viewport: page.viewportSize(), canvas, pixels, bytes: png.length };
}
async function captureAtlas(page, output, name, orient = true) {
  await page.evaluate(name => window.__threadZoomProbe.arm(name, 'atlas'), name);
  // Natural no-op orientation command requests a normal host render.
  if (orient) await page.getByRole('button', { name: 'Top-down orientation', exact: true }).click();
  else {
    // A one-pixel real viewport resize requests redraw without overwriting the oblique pose.
    const viewport = page.viewportSize(); await page.setViewportSize({ ...viewport, width: viewport.width + 1 });
    await page.setViewportSize(viewport);
  }
  await delay(160);
  const image = await screenshot(page, output, name), capture = await page.evaluate(name => {
    const report = window.__threadZoomProbe.report(); window.__threadZoomProbe.stop();
    return { ...window.__threadZoomProbe.snapshot('atlas'), ...report.captures[name] };
  }, name);
  return { ...capture, screenshot: image };
}
async function inspectAtlasClick(page, point) {
  assert.equal(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y) === document.querySelector('.webgl-host canvas'), point), true, 'Crossing click must hit the real map canvas, never a DOM label');
  await page.mouse.click(point.x, point.y);
  await page.getByRole('complementary', { name: 'Evidence reading panel' }).waitFor({ state: 'visible', timeout: 5000 });
  const object = JSON.parse(await page.locator('.evidence-inspector .retained-metadata pre').textContent());
  assert.equal(object.id, ATLAS_EDGE, 'Crossing click selected a different original object');
  assert.ok(object.sourceIds?.length, 'Selected original edge lost source access');
  await page.getByRole('button', { name: 'Close reading panel', exact: true }).click();
  return { id: object.id, sourceIds: object.sourceIds };
}
async function runAtlas(page, output, report) {
  const diagnostic = report.mode === 'baseline-diagnostic';
  await page.getByRole('button', { name: 'Top-down orientation', exact: true }).click();
  await setAtlasZoom(page, 4.5); await centerAtlas(page);
  let areaIds, selectedAreaIds, selected = false;
  for (const zoom of REQUIRED_ZOOMS) {
    await setAtlasZoom(page, zoom); await centerAtlas(page);
    const label = `atlas-z${String(zoom).replace('.', '_')}`, row = await captureAtlas(page, output, label);
    report.atlas.push(row);
    recordCheck(report, `${label}: native thread raster`, () => assertRasterEvidence(row, label), diagnostic);
    recordCheck(report, `${label}: pose and original admission`, () => {
      assert.ok(Math.abs(row.pose.zoom - zoom) < .002, 'Camera did not reach the requested threshold');
      if (zoom === 6) assert.ok(row.pose.zoom >= 6, 'The zoom-6 boundary must be tested on its hidden side');
      assert.equal(row.pose.pitch, 0); assert.equal(row.pose.bearing, 0);
      assert.ok(row.visibleEdgeIds.includes(ATLAS_EDGE)); assert.ok(row.visibleEdgeIds.length <= 60);
      assert.ok(row.geometry.points.slice(1).some((p, i) => clipSegment(row.geometry.points[i], p, row.canvas.width, row.canvas.height)), 'Original centerline does not cross the viewport');
      if (!areaIds) areaIds = row.visibleEdgeIds;
      if (selected) {
        if (selectedAreaIds) assert.deepEqual(row.visibleEdgeIds, selectedAreaIds, 'Zoom changed representative IDs within the same selected state');
        else selectedAreaIds = row.visibleEdgeIds;
        assert.equal(row.visibleEdgeIds[0], ATLAS_EDGE, 'The exact selected original must remain first');
      } else assert.deepEqual(row.visibleEdgeIds, areaIds, 'Zoom changed representative IDs within the unselected fixture state');
      if (zoom >= 5.9) assert.equal(row.geometry?.bothEndpointsOffscreen, true, 'Crossing fixture did not put both endpoints offscreen');
      assert.ok(row.screenshot.bytes > 1000, 'Missing screenshot evidence');
    });
    await writeFile(join(output, 'report.partial.json'), `${JSON.stringify(report, null, 2)}\n`);
    if ([5.9, 6, 8, 19].includes(zoom)) {
      const box = row.canvas;
      try { report.clicks.push({ zoom, ...await inspectAtlasClick(page, { x: box.x + box.width / 2, y: box.y + box.height / 2 }) }); selected = true; report.checks.push({ label: `${label}: exact crossing click`, status: 'passed' }); }
      catch (error) { report.checks.push({ label: `${label}: exact crossing click`, status: diagnostic === 'live' ? 'live-diagnostic-failure' : diagnostic ? 'baseline-diagnostic-failure' : 'failed', message: error.message }); const close = page.getByRole('button', { name: 'Close reading panel', exact: true }); if (await close.count()) await close.click(); }
    }
  }
  // Normal world-mode caps and detail reentry remain separate admission policies.
  await setAtlasZoom(page, 2.5);
  const world = await page.evaluate(() => window.__threadZoomProbe.snapshot('atlas'));
  recordCheck(report, 'atlas zoom-out retains world admission cap', () => { assert.equal(world.semanticMode, 'world'); assert.ok(world.visibleEdgeIds.length <= 24); });
  await setAtlasZoom(page, 5.9); await centerAtlas(page);
  const reentry = await captureAtlas(page, output, 'atlas-reentry-z5_9'); report.atlas.push(reentry);
  recordCheck(report, 'atlas reentry native raster and exact original IDs', () => { assertRasterEvidence(reentry, 'reentry'); assert.deepEqual(reentry.visibleEdgeIds, selected ? selectedAreaIds : areaIds); }, diagnostic);
  // Pan the retained crossing away and back without using an endpoint-in-view gate.
  await dragSurface(page, '.webgl-host canvas', [70, 35], 'atlas deliberate pan away');
  await centerAtlas(page);
  const pan = await captureAtlas(page, output, 'atlas-pan-return'); report.atlas.push(pan);
  recordCheck(report, 'atlas pan-return raster and both offscreen endpoints', () => { assertRasterEvidence(pan, 'pan-return'); assert.equal(pan.geometry.bothEndpointsOffscreen, true); }, diagnostic);
  await setAtlasZoom(page, 8); await centerAtlas(page);
  await page.getByRole('button', { name: 'Rotate right', exact: true }).click(); await delay(150);
  const oblique = await captureAtlas(page, output, 'atlas-oblique-z8', false); report.atlas.push(oblique);
  recordCheck(report, 'atlas oblique nonzero-bearing native raster', () => { assertRasterEvidence(oblique, 'oblique'); assert.ok(oblique.pose.pitch >= 35 && Math.abs(oblique.pose.bearing) >= 20); }, diagnostic);
  await page.getByRole('button', { name: 'Top-down orientation', exact: true }).click();
  await setAtlasZoom(page, 5.9); await centerAtlas(page);
  await writeFile(join(output, 'report.partial.json'), `${JSON.stringify(report, null, 2)}\n`);
}

async function runNarrowAtlas(page, output, report) {
  await page.setViewportSize({ width: 390, height: 844 }); await delay(150);
  for (const zoom of [5.9, 6, 19]) {
    await setAtlasZoom(page, zoom); await centerAtlas(page);
    const row = await captureAtlas(page, output, `atlas-narrow-z${String(zoom).replace('.', '_')}`); report.atlas.push(row);
    recordCheck(report, `narrow z${zoom}: exact crossing raster`, () => { assertRasterEvidence(row, `narrow z${zoom}`); assert.equal(row.geometry.bothEndpointsOffscreen, true); assert.ok(Math.abs(row.pose.zoom - zoom) < .002); }, report.mode === 'baseline-diagnostic');
  }
  await page.setViewportSize({ width: 800, height: 500 }); await delay(150);
  await setAtlasZoom(page, 5.9); await centerAtlas(page);
}
async function runLive(page, output, report) {
  report.live = { url: LIVE_ATLAS_URL, observedAt: new Date().toISOString(), runtimeCommit: 'not inferred from a concurrent deployment', diagnosticOnly: true };
  const dataset = await page.locator('.webgl-host').evaluate(element => ({ ...element.dataset }));
  report.live.initialDataset = dataset;
  if (!dataset.geographicPose) {
    report.checks.push({ label: 'public live precise camera observation', status: 'live-diagnostic-unsupported', message: 'This live release does not expose the full-precision geographic pose. Rounded center/zoom attributes are retained as diagnostics only; no exact crossing/threshold or native visibility claim is made.' });
    report.screenshots.push(await screenshot(page, output, 'live-pose-unsupported'));
    return;
  }
  await page.getByRole('button', { name: 'Top-down orientation', exact: true }).click();
  for (const zoom of [5.9, 8]) {
    await setAtlasZoom(page, zoom); await centerAtlas(page);
    const row = await captureAtlas(page, output, `public-live-z${String(zoom).replace('.', '_')}`); report.atlas.push(row);
    try { assertRasterEvidence(row, `public live z${zoom}`); report.checks.push({ label: `public live z${zoom}: native observation`, status: 'live-diagnostic-observed' }); }
    catch (error) { report.checks.push({ label: `public live z${zoom}: native observation`, status: 'live-diagnostic-failure', message: error.message }); }
    await writeFile(join(output, 'report.partial.json'), `${JSON.stringify(report, null, 2)}\n`);
  }
}

async function runCase(page, output, report) {
  const { caseWorkspace, caseSurface, openCaseWorkspace, chooseCase, showCaseScene } = await import('./case-workspace-browser.mjs');
  const transport = JSON.parse(await readFile(join(ROOT, 'src/case-data/reviewed-transport.json'), 'utf8'));
  // Use the pinned accepted adapter through the existing expectation helper, not a hand-built case.
  const { loadCaseExpectation } = await import('./case-workspace-browser.mjs');
  const temporary = join(output, 'case-reference'); await mkdir(temporary, { recursive: true });
  const expected = await loadCaseExpectation(ROOT, temporary), file = expected.catalog.cases.find(file => file.id === 'case:india-ambani');
  assert.ok(file?.edges.some(edge => edge.id === CASE_EDGE));
  report.caseReference = { ...expected.reference, transportBytes: JSON.stringify(transport).length };
  const before = await pose(page);
  await openCaseWorkspace(page, until); await chooseCase(page, file, until); await showCaseScene(page, until, report, 'zoom regression');
  const surface = caseSurface(page);
  await surface.focus(); await surface.press('Home'); await delay(150);
  const initial = await page.evaluate(() => window.__threadZoomProbe.snapshot('case'));
  assert.ok(initial.geometry, 'No original case geometry at the normal fit pose');
  assert.equal(initial.caseSelection, '', 'Case crossing fixture must start without a selected object');
  assert.deepEqual(initial.visibleEdgeIds, file.edges.slice(0, 4).map(edge => edge.id), 'Case draw/source order changed');
  // Verify the identity mapping against the accepted source layout at its known Home pose.
  const { build } = await import('esbuild');
  const modelPath = join(temporary, 'accepted-layout.mjs');
  await build({ entryPoints: [join(ROOT, 'src/case-scene/layout.ts')], outfile: modelPath, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent' });
  const layout = await import(pathToFileURL(modelPath).href);
  const model = layout.createCaseSceneModel(file), thread = model.threads.find(thread => thread.record.id === CASE_EDGE);
  const b = model.bounds, board = initial.geometry.board, center = [(b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2];
  const scale = board.height / (2 * Math.max((b.maxY - b.minY) / 2, (b.maxX - b.minX) / (2 * board.width / board.height)));
  initial.geometry.points.forEach((point, i) => { const p = layout.cubicPoint(thread, i / 24); assert.ok(Math.hypot(point[0] - ((p[0] - center[0]) * scale + board.width / 2), point[1] - (board.height / 2 - (p[1] - center[1]) * scale)) < .08, `Case mesh is not the accepted original edge at sample ${i}`); });
  report.caseInitial = initial;
  await caseWorkspace(page).getByRole('button', { name: 'Pan/zoom off', exact: true }).click();
  // The original unselected edge remains eligible; selected endpoint readability is a separate policy.
  await surface.focus();
  for (let i = 0; i < 12; i++) { await surface.press('+'); await delay(30); }
  await until(async () => Boolean((await page.evaluate(() => window.__threadZoomProbe.snapshot('case')))?.geometry), 'Case original edge geometry was not observed');
  // Center the middle retained segment using its actual read-only screen geometry.
  for (let i = 0; i < 16; i++) {
    const row = await page.evaluate(() => window.__threadZoomProbe.snapshot('case')), g = row.geometry, mid = g.points[Math.floor(g.points.length / 2)];
    const dx = g.board.width / 2 - mid[0], dy = g.board.height / 2 - mid[1];
    if (Math.hypot(dx, dy) < 1) break;
    const scale = Math.min(1, 80 / Math.max(Math.abs(dx), Math.abs(dy)));
    await dragSurface(page, '[data-case-surface]', [dx * scale, dy * scale], `case center correction ${i}`);
  }
  await page.evaluate(() => window.__threadZoomProbe.arm('case-max-zoom', 'case'));
  await surface.focus(); await surface.press('+'); await delay(100);
  const row = await page.evaluate(() => { const r = window.__threadZoomProbe.report().captures['case-max-zoom']; window.__threadZoomProbe.stop(); return r; });
  row.screenshot = await screenshot(page, output, 'case-max-zoom'); report.case.push(row);
  recordCheck(report, 'case max-zoom native exact-edge raster and crossing', () => {
    assertRasterEvidence(row, 'case max zoom'); assert.equal(row.edgeId, CASE_EDGE); assert.equal(row.meshUuid, initial.meshUuid, 'Original case GPU geometry identity changed');
    const length = points => points.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - points[i][0], p[1] - points[i][1]), 0);
    const currentBoard = row.geometry.board;
    const currentBaseScale = currentBoard.height / (2 * Math.max((b.maxY - b.minY) / 2, (b.maxX - b.minX) / (2 * currentBoard.width / currentBoard.height)));
    row.observedZoomRatio = length(row.geometry.points) / length(initial.geometry.points) * scale / currentBaseScale;
    assert.ok(Math.abs(row.observedZoomRatio - 4) < .002, 'Native case geometry did not reach max zoom 4'); assert.equal(row.geometry.bothEndpointsOffscreen, true);
    assert.ok(row.visibleEdgeIds.includes(CASE_EDGE)); assert.ok(row.visibleEdgeIds.length <= 12);
    assert.ok(row.draws.every(draw => draw.viewport[2] <= 1024 && draw.viewport[3] <= 1024 && draw.viewport[2] * draw.viewport[3] <= 786432));
  });
  const g = row.geometry, mid = g.points[Math.floor(g.points.length / 2)];
  await page.mouse.click(g.board.x + mid[0], g.board.y + mid[1]);
  await until(async () => await caseWorkspace(page).getAttribute('data-case-selection') === CASE_EDGE, 'Case crossing click did not select the exact original ID');
  const selected = caseWorkspace(page).locator(`[data-edge-id=${JSON.stringify(CASE_EDGE)}]`);
  assert.equal(await selected.getByRole('button').first().getAttribute('aria-pressed'), 'true');
  assert.ok(await caseWorkspace(page).locator('[data-reader-scroll="workspace-evidence"] a[href^="https://"]').count(), 'Case sources are unavailable after crossing selection');
  report.clicks.push({ kind: 'case', id: CASE_EDGE, sourceAccess: true, resultView: await caseWorkspace(page).getAttribute('data-case-view') });
  // Explicit readable fallback has its own result; it cannot satisfy a native ribbon check.
  if (await caseWorkspace(page).getAttribute('data-case-view') === 'scene') {
    await surface.focus();
    for (let i = 0; i < 12 && await surface.count(); i++) { await surface.press('+'); await delay(80); }
  }
  await until(async () => await caseWorkspace(page).getAttribute('data-case-view') === 'list', 'Selected offscreen endpoints did not enter the explicit readable fallback', 8000);
  report.caseFallback = { continuityEvidence: 'Native case ribbon continuity was observed before this deliberate reader transition; the reader is not a rendering pass.', mode: 'list', notice: await caseWorkspace(page).locator('[data-case-auto-fallback-notice]').textContent(), selection: await caseWorkspace(page).getAttribute('data-case-selection') };
  assert.ok(report.caseFallback.notice?.trim()); assert.equal(report.caseFallback.selection, CASE_EDGE);
  assert.ok(await caseWorkspace(page).locator('[data-reader-scroll="workspace-evidence"] a[href^="https://"]').count());
  await caseWorkspace(page).getByRole('button', { name: 'Close workspace', exact: true }).click();
  await until(async () => await caseWorkspace(page).count() === 0, 'Case did not close');
  const after = await pose(page); assert.deepEqual(after, before, 'Case camera leaked into atlas pose');
  const restored = await captureAtlas(page, output, 'atlas-after-case'); report.atlas.push(restored);
  recordCheck(report, 'atlas raster after case handoff', () => assertRasterEvidence(restored, 'after case'), report.mode === 'baseline-diagnostic');
}

async function startServer(dist) {
  const canonicalRoot = await realpath(dist);
  const outside = target => { const r = relative(canonicalRoot, target); return r === '..' || r.startsWith(`..${sep}`) || isAbsolute(r); };
  const server = createServer(async (request, response) => {
    try {
      assert.ok(['GET','HEAD'].includes(request.method));
      const path = decodeURIComponent((request.url ?? '').split('?')[0]);
      assert.ok(path.startsWith(PREFIX) && !path.includes('\\') && !path.includes('\0') && !path.split('/').some(p => p === '..' || p === '.'));
      const file = await realpath(resolve(canonicalRoot, path.slice(PREFIX.length) || 'index.html'));
      assert.equal(outside(file), false); const body = await readFile(file);
      response.writeHead(200, { 'Content-Type': ({ '.html':'text/html', '.js':'text/javascript', '.json':'application/json', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.woff2':'font/woff2' })[extname(file)] ?? 'application/octet-stream', 'Cache-Control':'no-store' });
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch { response.writeHead(404); response.end('Not found in isolated preview'); }
  });
  await new Promise((resolveReady, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolveReady); });
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}
export async function main(args = process.argv.slice(2), env = process.env) {
  requireAuthorizedCI(env); const mode = parseMode(args);
  if (mode === 'baseline-diagnostic') assert.equal(env.SPATIAL_HEAD_SHA, BASELINE_COMMIT, 'Baseline diagnostics must serve the exact frozen baseline checkout');
  // Guard precedes even importing Playwright, and cannot be bypassed by a CLI flag.
  const { chromium } = await import('playwright');
  const output = join(ROOT, 'thread-zoom-review', mode); await mkdir(output, { recursive: true });
  const report = { mode, baselineCommit: BASELINE_COMMIT, headCommit: mode === 'live-diagnostic' ? null : env.SPATIAL_HEAD_SHA ?? env.GITHUB_SHA ?? null, harnessCommit: env.SPATIAL_HARNESS_SHA ?? env.GITHUB_SHA ?? null,
    startedAt: new Date().toISOString(), renderer: 'Chromium / ANGLE SwiftShader, native WebGL calls and software rasterization; not consumer-device FPS',
    checks: [], atlas: [], case: [], clicks: [], errors: [], screenshots: [], scriptAssets: [], sourceHashes: {}, navigation: [] };
  if (mode !== 'live-diagnostic') for (const file of ['src/registry.json', 'src/semanticZoom.ts', 'src/case-data/reviewed-transport.json', 'src/threadGeometry.ts', 'src/scene.ts']) report.sourceHashes[file] = sha256(await readFile(join(ROOT, file)));
  let browser, server, page; const assetReads = [];
  try {
    const serving = mode === 'live-diagnostic' ? { origin: new URL(LIVE_ATLAS_URL).origin } : await startServer(join(ROOT, 'dist')); server = serving.server;
    browser = await chromium.launch({ headless: true, args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
    report.browserVersion = browser.version();
    const context = await browser.newContext({ viewport: { width: 800, height: 500 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    await context.addInitScript(installThreadZoomProbe, { atlasEdge: ATLAS_EDGE, caseEdge: CASE_EDGE });
    page = await context.newPage(); navigationReports.set(page, report.navigation); page.setDefaultTimeout(15000); page.on('pageerror', error => report.errors.push(error.message));
    page.on('response', response => {
      if (!response.url().startsWith(`${serving.origin}${PREFIX}`) || !/\.js(?:\?|$)/.test(response.url())) return;
      const asset = { url: response.url(), status: response.status(), sha256: null }; report.scriptAssets.push(asset);
      assetReads.push(response.body().then(bytes => { asset.sha256 = sha256(bytes); asset.bytes = bytes.length; }).catch(error => { asset.error = String(error); }));
    });
    await page.goto(mode === 'live-diagnostic' ? LIVE_ATLAS_URL : `${serving.origin}${PREFIX}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await until(async () => await page.locator('.webgl-host').getAttribute('data-renderer') === 'maplibre-three-mercator' &&
      (mode === 'live-diagnostic' || Boolean(await page.locator('.webgl-host').getAttribute('data-geographic-pose'))), 'Default factual atlas did not render', 60000);
    if (mode === 'live-diagnostic') await runLive(page, output, report);
    else {
    await runAtlas(page, output, report);
    await runNarrowAtlas(page, output, report);
    // Nongeographic case gets a comfortably readable independent viewport.
    await page.setViewportSize({ width: 1440, height: 1000 }); await delay(200);
    await runCase(page, output, report);
    }
    report.observer = await page.evaluate(() => window.__threadZoomProbe.report());
    recordCheck(report, 'one real shared renderer and native context', () => { assert.equal(report.observer.renderers, 1); assert.equal(report.observer.contexts.length, 1); assert.deepEqual(report.observer.errors, []); assert.deepEqual(report.errors, []); }, mode === 'live-diagnostic' ? 'live' : false);
  } catch (error) { report.checks.push({ label: 'native scenario execution', status: mode === 'live-diagnostic' ? 'live-diagnostic-failure' : 'failed', message: error.stack ?? String(error) }); }
  finally {
    if (page && !page.isClosed()) {
      try { report.observer = await page.evaluate(() => window.__threadZoomProbe?.report() ?? null); } catch (error) { report.errors.push(`Observer persistence: ${error}`); }
      if (report.checks.some(check => /failed|failure|unsupported/.test(check.status))) {
        try { report.failureNavigation = await page.evaluate(navigationSnapshot); } catch (error) { report.errors.push(`Failure navigation persistence: ${error}`); }
        try { report.screenshots.push(await screenshot(page, output, 'failure-state', false)); } catch (error) { report.errors.push(`Failure screenshot: ${error}`); }
      }
    }
    await Promise.allSettled(assetReads);
    if (browser) await browser.close().catch(error => report.errors.push(`Browser cleanup: ${error}`)); if (server) await new Promise(resolveClosed => server.close(resolveClosed));
    for (const [file, hash] of Object.entries(report.sourceHashes)) assert.equal(sha256(await readFile(join(ROOT, file))), hash, `${file}: browser review mutated source`);
    report.finishedAt = new Date().toISOString(); report.status = diagnosticStatus(mode, report.checks);
    await writeFile(join(output, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
    await writeFile(join(output, 'summary.md'), `# Thread zoom native review\n\nStatus: ${report.status}\n\n${report.renderer}\n\n${report.checks.map(c => `- ${c.status}: ${c.label}${c.message ? `: ${c.message.split('\n')[0]}` : ''}`).join('\n')}\n\nScreenshots and per-draw readback evidence are in report.json. Baseline diagnostic failures never count as candidate passes. Existing full gates remain mandatory.\n`);
  }
  assert.equal(report.status === 'failed', false, `Native thread zoom review failed; inspect ${output}/report.json`);
  return report;
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) await main();
