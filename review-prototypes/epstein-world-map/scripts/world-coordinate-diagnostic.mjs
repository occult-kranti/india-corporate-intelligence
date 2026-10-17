// Closed, bounded numeric metadata for the existing small stdout failure record.
// Never copies DOM/body/error text, labels, URLs, arbitrary paths or CSS identifiers.
const ANCHORS = ['anchor-scotus-washington-city', 'anchor-nydfs-new-york-state', 'anchor-usvi-doj-territory'];
const NUM = '[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?';
const PERCENT = new RegExp('^' + NUM + '%$');
const PIXELS = new RegExp('^(' + NUM + ')px$');
const AXES = ['left', 'top'], RECT = ['left', 'top', 'width', 'height'];
const FLAGS = ['directChild', 'containingBlock', 'finiteRectangles', 'nonemptyRectangles', 'canvasBorderPaddingZero',
  'pinMarginsZero', 'unitTranslations', 'pinCenteringTranslation', 'canvasUnscrolled', 'absolutePin', 'relativeCanvas'];
const LIMIT = 0.5, MAX_NUMBER = 10_000_000, MAX_BYTES = 4096;
const finite = x => typeof x === 'number' && Number.isFinite(x) && Math.abs(x) <= MAX_NUMBER ? x : null;
const percent = x => typeof x === 'string' && x.length <= 64 && PERCENT.test(x) && finite(Number(x.slice(0, -1))) !== null ? x : null;
const pixels = x => typeof x === 'string' && x.length <= 64 && PIXELS.test(x) ? finite(Number(x.slice(0, -2))) : null;
const bool = x => typeof x === 'boolean' ? x : null;
const pair = (value, fn) => Object.fromEntries(AXES.map(k => [k, fn(value?.[k])]));
const rectangle = value => Object.fromEntries(RECT.map(k => [k, finite(value?.[k])]));
const unavailable = () => ({schema: 'world-coordinate-failure-v1', status: 'unavailable', nativeAcceptance: false, artifactApproval: false});
function matrix(value) {
  if (value === 'none') return [1, 0, 0, 1, 0, 0];
  if (typeof value !== 'string' || value.length > 192 || !/^matrix\([^()]+\)$/.test(value)) return null;
  const values = value.slice(7, -1).split(',').map(s => s.trim());
  if (values.length !== 6 || !values.every(s => new RegExp('^' + NUM + '$').test(s))) return null;
  const numbers = values.map(s => finite(Number(s)));
  return numbers.every(v => v !== null) ? numbers : null;
}
function unit(style) {
  const m = matrix(style?.transform);
  return m && m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 1 && style.zoom === '1'
    && ['translate', 'rotate', 'scale', 'perspective', 'offsetPath'].every(k => style[k] === 'none');
}
function rawTokens(raw) {
  const empty = {left: null, top: null};
  if (typeof raw !== 'string' || raw.length > 256) return empty;
  const parts = raw.trim().replace(/;\s*$/, '').split(';'), out = {};
  if (parts.length !== 2) return empty;
  for (const part of parts) {
    const m = /^(left|top)\s*:\s*(.*?)$/.exec(part.trim());
    if (!m || Object.hasOwn(out, m[1])) return empty;
    out[m[1]] = percent(m[2]);
  }
  return pair(out, percent);
}

export function coordinateFailureSnapshot(observed, anchor, expectedZoom) {
  try {
    if (!observed || typeof observed !== 'object') return unavailable();
    const expected = Number.isFinite(anchor?.longitude) && Math.abs(anchor.longitude) <= 180
      && Number.isFinite(anchor?.latitude) && Math.abs(anchor.latitude) <= 90
      ? {left: (anchor.longitude + 180) / 360 * 100, top: (90 - anchor.latitude) / 180 * 100} : null;
    const raw = rawTokens(observed.rawStyle), c = observed.ancestors?.[0], p = observed.pinStyle;
    const ancestors = Array.isArray(observed.ancestors) && observed.ancestors.length <= 64 ? observed.ancestors : null;
    const pm = matrix(p?.transform), cr = rectangle(observed.canvas), pr = rectangle(observed.pin);
    const borderKeys = ['borderLeftWidth', 'borderRightWidth', 'borderTopWidth', 'borderBottomWidth'];
    const paddingKeys = ['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom'];
    const marginKeys = ['marginLeft', 'marginRight', 'marginTop', 'marginBottom'];
    const allFinite = [...Object.values(cr), ...Object.values(pr)].every(x => x !== null);
    const metrics = Object.fromEntries(AXES.map((axis, i) => {
      const size = i ? 'height' : 'width';
      const actualCenter = pr[axis] !== null && pr[size] !== null ? finite(pr[axis] + pr[size] / 2) : null;
      const expectedCenter = expected && cr[axis] !== null && cr[size] !== null ? finite(cr[axis] + cr[size] * expected[axis] / 100) : null;
      return [axis, {actualCenter, expectedCenter, error: actualCenter !== null && expectedCenter !== null ? finite(Math.abs(actualCenter - expectedCenter)) : null,
        limit: LIMIT, rawError: raw[axis] !== null && expected ? finite(Math.abs(Number(raw[axis].slice(0, -1)) - expected[axis])) : null}];
    }));
    const out = {schema: 'world-coordinate-failure-v1', status: 'observed',
      anchorId: ANCHORS.includes(anchor?.anchor_id) ? anchor.anchor_id : null,
      expectedZoom: [1, 5].includes(expectedZoom) ? expectedZoom : null, observedZoom: finite(observed.mapZoom),
      rawTokens: raw, expectedPercent: pair(expected, finite), cssom: pair(observed.cssom, percent), reference: pair(observed.reference, percent),
      rectangles: {pin: pr, canvas: cr},
      preconditions: {
        directChild: bool(observed.directChild), containingBlock: bool(observed.offsetParent), finiteRectangles: allFinite,
        nonemptyRectangles: allFinite ? pr.width > 0 && pr.height > 0 && cr.width > 0 && cr.height > 0 : null,
        canvasBorderPaddingZero: c ? [...borderKeys, ...paddingKeys].every(k => c[k] === '0px') : null,
        pinMarginsZero: p ? marginKeys.every(k => p[k] === '0px') : null,
        unitTranslations: ancestors && p ? ancestors.every(unit) && Boolean(unit(p)) : null,
        pinCenteringTranslation: pm && pr.width !== null && pr.height !== null ? Math.abs(pm[4] + pr.width / 2) <= LIMIT && Math.abs(pm[5] + pr.height / 2) <= LIMIT : null,
        canvasUnscrolled: observed.canvasScroll ? observed.canvasScroll.left === 0 && observed.canvasScroll.top === 0 : null,
        absolutePin: p ? p.position === 'absolute' : null, relativeCanvas: c ? c.position === 'relative' : null,
      },
      computed: {canvasBorder: borderKeys.map(k => pixels(c?.[k])), canvasPadding: paddingKeys.map(k => pixels(c?.[k])),
        pinMargin: marginKeys.map(k => pixels(p?.[k])), pinTransform: pm, ancestorCount: ancestors?.length ?? null,
        unsupportedAncestorCount: ancestors ? ancestors.filter(s => !unit(s)).length : null},
      devicePixelRatio: finite(observed.devicePixelRatio), viewportScale: finite(observed.viewportScale),
      metrics, nativeAcceptance: false, artifactApproval: false};
    return validSnapshot(out) ? out : unavailable();
  } catch { return unavailable(); }
}

function exact(v, names) {
  return v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === names.length && names.every(k => Object.hasOwn(v, k));
}
const nullableNumber = v => v === null || finite(v) !== null;
const nullablePercent = v => v === null || percent(v) !== null;
function validSnapshot(v) {
  const common = ['schema', 'status', 'nativeAcceptance', 'artifactApproval'];
  if (!v || v.schema !== 'world-coordinate-failure-v1' || v.nativeAcceptance !== false || v.artifactApproval !== false) return false;
  if (v.status === 'unavailable') return exact(v, common);
  if (v.status !== 'observed' || !exact(v, [...common, 'anchorId', 'expectedZoom', 'observedZoom', 'rawTokens', 'expectedPercent', 'cssom', 'reference', 'rectangles', 'preconditions', 'computed', 'devicePixelRatio', 'viewportScale', 'metrics'])) return false;
  if (!(v.anchorId === null || ANCHORS.includes(v.anchorId)) || ![null, 1, 5].includes(v.expectedZoom)) return false;
  for (const key of ['observedZoom', 'devicePixelRatio', 'viewportScale']) if (!nullableNumber(v[key])) return false;
  for (const key of ['rawTokens', 'cssom', 'reference', 'expectedPercent']) {
    if (!exact(v[key], AXES) || !Object.values(v[key]).every(key === 'expectedPercent' ? nullableNumber : nullablePercent)) return false;
  }
  if (!exact(v.rectangles, ['pin', 'canvas']) || !Object.values(v.rectangles).every(r => exact(r, RECT) && Object.values(r).every(nullableNumber))) return false;
  if (!exact(v.preconditions, FLAGS) || !Object.values(v.preconditions).every(x => x === null || typeof x === 'boolean')) return false;
  if (!exact(v.computed, ['canvasBorder', 'canvasPadding', 'pinMargin', 'pinTransform', 'ancestorCount', 'unsupportedAncestorCount'])) return false;
  for (const key of ['canvasBorder', 'canvasPadding', 'pinMargin']) if (!Array.isArray(v.computed[key]) || v.computed[key].length !== 4 || !v.computed[key].every(nullableNumber)) return false;
  if (!(v.computed.pinTransform === null || Array.isArray(v.computed.pinTransform) && v.computed.pinTransform.length === 6 && v.computed.pinTransform.every(x => finite(x) !== null))) return false;
  for (const key of ['ancestorCount', 'unsupportedAncestorCount']) if (!(v.computed[key] === null || Number.isInteger(v.computed[key]) && v.computed[key] >= 0 && v.computed[key] <= 64)) return false;
  if (!exact(v.metrics, AXES) || !Object.values(v.metrics).every(m => exact(m, ['actualCenter', 'expectedCenter', 'error', 'limit', 'rawError']) && m.limit === LIMIT && Object.values(m).every(nullableNumber))) return false;
  return Buffer.byteLength(JSON.stringify(v)) <= MAX_BYTES;
}

// Snapshot only own enumerable data properties. Never execute an accessor,
// inherit caller-defined properties, validate live data then reread it, or clone
// an unvalidated second view. Limits concern optional diagnostics only.
function detachedData(value, depth = 0, state = {seen: new Set(), nodes: 0, keys: 0, chars: 0}) {
  if (++state.nodes > 512 || depth > 8) throw Error('diagnostic data bound');
  if (value === null || typeof value === 'boolean' || typeof value === 'number') return value;
  if (typeof value === 'string') {
    state.chars += value.length;
    if (state.chars > 8192) throw Error('diagnostic text bound');
    return value;
  }
  if (typeof value !== 'object' || state.seen.has(value)) throw Error('diagnostic data type');
  const array = Array.isArray(value), prototype = Object.getPrototypeOf(value);
  if (array ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null) throw Error('diagnostic prototype');
  state.seen.add(value);
  const descriptors = Object.getOwnPropertyDescriptors(value), names = Reflect.ownKeys(descriptors);
  if ((state.keys += names.length) > 512) throw Error('diagnostic property bound');
  const out = array ? [] : {};
  if (array && (!Object.hasOwn(descriptors, 'length') || !Number.isInteger(descriptors.length.value) || descriptors.length.value > 64 || names.length !== descriptors.length.value + 1)) throw Error('diagnostic array');
  for (const name of names) {
    const descriptor = descriptors[name];
    if (typeof name !== 'string' || !Object.hasOwn(descriptor, 'value') || !descriptor.enumerable && !(array && name === 'length')) throw Error('diagnostic accessor or hidden property');
    if (array && name === 'length') continue;
    if (array && (!/^(0|[1-9]\d*)$/.test(name) || Number(name) >= descriptors.length.value)) throw Error('diagnostic array key');
    const copy = detachedData(descriptor.value, depth + 1, state);
    Object.defineProperty(out, name, {value: copy, enumerable: true, configurable: true, writable: true});
  }
  state.seen.delete(value);
  return out;
}
function unknownIdentity() {
  return {executable: null, executableSha256: null, version: null, revision: null,
    revisionStatus: 'not_collected_by_existing_runner', playwrightVersion: null};
}
function boundedIdentity(report) {
  const out = unknownIdentity();
  if (!report || typeof report !== 'object') return out;
  const prototype = Object.getPrototypeOf(report);
  if (prototype !== Object.prototype && prototype !== null) return out;
  // Each relevant property descriptor is obtained once. Accessors are ignored,
  // rather than invoked; validated primitive locals are the output primitives.
  const ownData = key => {
    const d = Object.getOwnPropertyDescriptor(report, key);
    return d && Object.hasOwn(d, 'value') ? d.value : undefined;
  };
  const executable = ownData('browserExecutable'), executableSha256 = ownData('browserExecutableSha256'),
    version = ownData('browserVersion'), playwrightVersion = ownData('playwrightVersion');
  out.executable = executable === '/opt/google/chrome/chrome' ? executable : null;
  out.executableSha256 = typeof executableSha256 === 'string' && /^[a-f0-9]{64}$/.test(executableSha256) ? executableSha256 : null;
  out.version = typeof version === 'string' && version.length <= 64 && /^\d+\.\d+\.\d+\.\d+$/.test(version) ? version : null;
  out.playwrightVersion = playwrightVersion === '1.62.1' ? playwrightVersion : null;
  return out;
}
function unavailableEnvelope() { return {...unavailable(), browserIdentity: unknownIdentity()}; }
export function coordinateFailureEnvelope(snapshot, report = {}) {
  try {
    const data = detachedData(snapshot);
    const out = validSnapshot(data) ? data : unavailable();
    out.browserIdentity = boundedIdentity(report);
    return Buffer.byteLength(JSON.stringify(out)) <= MAX_BYTES ? out : unavailableEnvelope();
  } catch { return unavailableEnvelope(); }
}
