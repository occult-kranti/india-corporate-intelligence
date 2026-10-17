// Independent test oracle. Never imports the application's projection/renderer.
import assert from 'node:assert/strict';
import {coordinateFailureSnapshot} from './world-coordinate-diagnostic.mjs';

export const RAW_PERCENT_LIMIT = 1e-10; // Existing strict source-value threshold.
// Explicit version 2 placement requirement: maximum center error on each CSS-pixel axis.
// This is not an engine-rounding theorem or a geographic/source tolerance.
export const CENTER_ALIGNMENT_LIMIT_CSS_PX = 0.5;

export function expectedPercent(anchor) {
  assert(anchor && typeof anchor === 'object', 'coordinate anchor missing');
  const {longitude, latitude} = anchor;
  assert(Number.isFinite(longitude) && Math.abs(longitude) <= 180, 'invalid longitude');
  assert(Number.isFinite(latitude) && Math.abs(latitude) <= 90, 'invalid latitude');
  return {left: (longitude + 180) / 360 * 100, top: (90 - latitude) / 180 * 100};
}

// This is deliberately a narrow parser for the unchanged renderer's two authored
// declarations. Read getAttribute('style'), never cssText/outerHTML after mutation.
export function authoredPercent(raw) {
  assert.equal(typeof raw, 'string', 'authored style missing');
  const number = '[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?';
  const declaration = new RegExp('^(left|top)\\s*:\\s*(' + number + ')%$');
  const pieces = raw.trim().replace(/;\s*$/, '').split(';');
  assert.equal(pieces.length, 2, 'exactly two authored coordinate declarations required');
  const values = {};
  for (const piece of pieces) {
    const match = declaration.exec(piece.trim());
    assert(match, 'invalid authored coordinate token');
    assert(!Object.hasOwn(values, match[1]), 'duplicate authored coordinate');
    const value = Number(match[2]);
    assert(Number.isFinite(value) && value >= 0 && value <= 100, 'invalid authored percentage');
    values[match[1]] = value;
  }
  assert(Object.hasOwn(values, 'left') && Object.hasOwn(values, 'top'), 'coordinate axis missing');
  return values;
}

// Self-contained Playwright evaluate callback. The reference declaration remains
// detached: it cannot alter the app, cascade, page layout, or capture contents.
export function observeCoordinate(pin, expected) {
  const doc = pin.ownerDocument, win = doc.defaultView;
  const canvas = doc.querySelector('#map-canvas');
  if (!canvas) throw Error('coordinate canvas missing');
  const rawStyle = pin.getAttribute('style'); // Before any CSSOM property reads.
  const reference = doc.createElement('span').style;
  reference.left = `${expected.left}%`;
  reference.top = `${expected.top}%`;
  const rect = element => {
    const r = element.getBoundingClientRect();
    return {left: r.left, top: r.top, width: r.width, height: r.height};
  };
  const style = element => {
    const s = win.getComputedStyle(element);
    return Object.fromEntries([
      'position', 'direction', 'borderLeftWidth', 'borderRightWidth',
      'borderTopWidth', 'borderBottomWidth', 'paddingLeft', 'paddingRight',
      'paddingTop', 'paddingBottom', 'marginLeft', 'marginRight', 'marginTop',
      'marginBottom', 'transform', 'translate', 'rotate', 'scale', 'perspective',
      'zoom', 'offsetPath', 'animationName', 'transitionDuration', 'width', 'height',
      'overflowX', 'overflowY',
    ].map(key => [key, s[key]]));
  };
  const ancestors = [];
  for (let element = canvas; element; element = element.parentElement) ancestors.push(style(element));
  return {
    rawStyle,
    cssom: {left: pin.style.left, top: pin.style.top},
    reference: {left: reference.left, top: reference.top},
    priorities: {left: pin.style.getPropertyPriority('left'), top: pin.style.getPropertyPriority('top')},
    pin: rect(pin), canvas: rect(canvas), pinStyle: style(pin), ancestors,
    directChild: pin.parentElement === canvas, offsetParent: pin.offsetParent === canvas,
    canvasScroll: {left: canvas.scrollLeft, top: canvas.scrollTop},
    mapZoom: Number(win.getComputedStyle(canvas).getPropertyValue('--map-zoom')),
    devicePixelRatio: win.devicePixelRatio, viewportScale: win.visualViewport?.scale ?? null,
  };
}

export function transformMatrix(value) {
  if (value === 'none') return [1, 0, 0, 1, 0, 0];
  if (typeof value !== 'string' || !/^matrix\([^()]+\)$/.test(value)) return null;
  const parts = value.slice(7, -1).split(',').map(s => s.trim());
  const numeric = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
  if (parts.length !== 6 || !parts.every(p => numeric.test(p) && Number.isFinite(Number(p)))) return null;
  return parts.map(Number);
}

function unitTranslation(style, label) {
  assert(style && typeof style === 'object', label + ' style missing');
  const matrix = transformMatrix(style.transform);
  assert(matrix && matrix[0] === 1 && matrix[1] === 0 && matrix[2] === 0 && matrix[3] === 1, label + ' unit translation required');
  for (const key of ['translate', 'rotate', 'scale', 'perspective', 'offsetPath']) assert.equal(style[key], 'none', label + ' ' + key);
  assert.equal(style.zoom, '1', label + ' CSS zoom');
  // DPR, visual scale, and declared transitions/animations are diagnostic only.
  return matrix;
}

export function assertCoordinateObservation(observed, anchor) {
  const expected = expectedPercent(anchor), raw = authoredPercent(observed.rawStyle);
  for (const axis of ['left', 'top']) {
    assert(Math.abs(raw[axis] - expected[axis]) < RAW_PERCENT_LIMIT, 'authored ' + axis + ' projection');
    assert.equal(typeof observed.reference?.[axis], 'string', 'detached reference missing');
    assert(observed.reference[axis].endsWith('%') && Number.isFinite(Number(observed.reference[axis].slice(0, -1))), 'invalid detached reference');
    assert.equal(observed.cssom?.[axis], observed.reference[axis], 'CSSOM ' + axis + ' projection');
    assert.equal(observed.priorities?.[axis], '', 'unexpected coordinate priority');
  }
  assert.equal(observed.directChild, true, 'pin must be a direct canvas child');
  assert.equal(observed.offsetParent, true, 'canvas must be the containing block');
  assert.deepEqual(observed.canvasScroll, {left: 0, top: 0}, 'canvas must not scroll itself');
  assert(Array.isArray(observed.ancestors) && observed.ancestors.length > 0, 'canvas ancestry missing');
  observed.ancestors.forEach((s, i) => unitTranslation(s, 'ancestor ' + i));
  const canvasStyle = observed.ancestors[0], pinStyle = observed.pinStyle;
  assert.equal(canvasStyle.position, 'relative', 'canvas position');
  const matrix = unitTranslation(pinStyle, 'pin');
  assert.equal(pinStyle.position, 'absolute', 'pin position');
  for (const [label, style] of [['canvas', canvasStyle]]) {
    for (const key of ['borderLeftWidth', 'borderRightWidth', 'borderTopWidth', 'borderBottomWidth',
      'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom']) assert.equal(style[key], '0px', label + ' ' + key);
  }
  for (const key of ['marginLeft', 'marginRight', 'marginTop', 'marginBottom']) assert.equal(pinStyle[key], '0px', 'pin ' + key);
  for (const [label, rect] of [['canvas', observed.canvas], ['pin', observed.pin]]) {
    assert(rect && typeof rect === 'object', label + ' rectangle missing');
    for (const key of ['left', 'top', 'width', 'height']) {
      const value = rect[key];
      assert(Number.isFinite(value), label + ' nonfinite rectangle');
    }
    assert(rect.width > 0 && rect.height > 0, label + ' empty rectangle');
  }
  // Effective translation relative to the measured border box, without literal
  // matrix formatting, fixed button size, or engine-specific grid assumptions.
  assert(Math.abs(matrix[4] + observed.pin.width / 2) <= CENTER_ALIGNMENT_LIMIT_CSS_PX, 'pin horizontal centering translation');
  assert(Math.abs(matrix[5] + observed.pin.height / 2) <= CENTER_ALIGNMENT_LIMIT_CSS_PX, 'pin vertical centering translation');
  const errors = {};
  for (const [axis, extent, size] of [['left', 'width', 'width'], ['top', 'height', 'height']]) {
    const span = observed.canvas[extent];
    const actual = observed.pin[axis] + observed.pin[size] / 2 - observed.canvas[axis];
    const ideal = span * expected[axis] / 100, bound = CENTER_ALIGNMENT_LIMIT_CSS_PX;
    const error = Math.abs(actual - ideal);
    assert(Number.isFinite(actual) && Number.isFinite(ideal) && Number.isFinite(error), 'nonfinite rendered coordinate');
    assert(error <= bound, 'rendered ' + axis + ' center alignment');
    errors[axis] = {error, bound};
  }
  return {expected, errors};
}

export async function assertWorldCoordinate(pin, anchor, expectedZoom) {
  let observed;
  try {
    const expected = expectedPercent(anchor);
    observed = await pin.evaluate(observeCoordinate, expected);
    return assertCoordinateObservation(observed, anchor);
  } catch (error) {
    const diagnostic = coordinateFailureSnapshot(observed, anchor, expectedZoom);
    try { if (error && typeof error === 'object') Object.defineProperty(error, 'coordinateFailure', {value: diagnostic}); } catch {}
    throw error; // Preserve the original assertion/observation failure.
  }
}
