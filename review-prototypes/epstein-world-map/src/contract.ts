import envelopeJSON from '../contracts/envelope.json' with { type: 'json' };
import baselineJSON from '../contracts/baseline.json' with { type: 'json' };
import round1JSON from '../contracts/round-1.json' with { type: 'json' };
import round2JSON from '../contracts/round-2.json' with { type: 'json' };
import round3JSON from '../contracts/round-3.json' with { type: 'json' };
import round4JSON from '../contracts/round-4.json' with { type: 'json' };
import round5JSON from '../contracts/round-5.json' with { type: 'json' };

/** This is an exact reviewed-artifact contract, not a schema for future packets. */
export const SOURCE_SHA256 = 'f365d7f785d54556759230f0c6c27e65ec41ec3ad885fdaee1f46f72860175b5';
export const SOURCE_BYTES = 470076;
export type Primitive = string | number | boolean | null;
export type Json = Primitive | readonly Json[] | { readonly [key: string]: Json };
export type JsonObject = { readonly [key: string]: Json };
export type Component = 'baseline' | 'round-1' | 'round-2' | 'round-3' | 'round-4' | 'round-5';
type Descriptor =
  | { kind: 'null' | 'string' | 'number' | 'boolean'; exact: Primitive }
  | { kind: 'object'; entries: readonly (readonly [string, Descriptor])[] }
  | { kind: 'array'; items: readonly Descriptor[] }
  | { kind: 'component'; name: Component };

export class AdmissionError extends Error {
  readonly code: string;
  readonly path: string;
  constructor(code: string, path: string, detail: string) {
    super(`Admission blocked [${code}] at ${path || '(root)'}: ${detail}. No partial facts opened.`);
    this.name = 'AdmissionError'; this.code = code; this.path = path;
  }
}
function fail(code: string, path: string, detail: string): never { throw new AdmissionError(code, path, detail); }
export function pointerChild(path: string, key: string | number): string {
  return `${path}/${String(key).replaceAll('~', '~0').replaceAll('/', '~1')}`;
}
function freeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
const COMPONENTS: Readonly<Record<Component, Descriptor>> = freeze({
  baseline: baselineJSON.root as unknown as Descriptor,
  'round-1': round1JSON.root as unknown as Descriptor,
  'round-2': round2JSON.root as unknown as Descriptor,
  'round-3': round3JSON.root as unknown as Descriptor,
  'round-4': round4JSON.root as unknown as Descriptor,
  'round-5': round5JSON.root as unknown as Descriptor,
});
const ENVELOPE = freeze(envelopeJSON.root as unknown as Descriptor);
export const COMPONENT_NAMES: readonly Component[] = Object.freeze(['baseline', 'round-1', 'round-2', 'round-3', 'round-4', 'round-5']);
export const ACCOUNTING = freeze({
  baseline: { milestones: 21, relations: 12, nodes: 0, sources: 0, retainedContext: 0, observations: 0 },
  'round-1': { milestones: 18, relations: 13, nodes: 18, sources: 9, retainedContext: 0, observations: 1 },
  'round-2': { milestones: 4, relations: 5, nodes: 9, sources: 2, retainedContext: 0, observations: 1 },
  'round-3': { milestones: 6, relations: 7, nodes: 12, sources: 4, retainedContext: 1, observations: 0 },
  'round-4': { milestones: 6, relations: 8, nodes: 12, sources: 5, retainedContext: 0, observations: 0 },
  'round-5': { milestones: 6, relations: 6, nodes: 10, sources: 10, retainedContext: 2, observations: 0 },
  totalMilestones: 61, totalRelations: 51, retainedContext: 3, observations: 2,
});

/** Data descriptors are inspected without invoking input getters. No coercion. */
function verify(value: unknown, spec: Descriptor, path: string): void {
  if (spec.kind === 'component') return verify(value, COMPONENTS[spec.name], path);
  if (spec.kind !== 'object' && spec.kind !== 'array') {
    const actual = value === null ? 'null' : typeof value;
    if (actual !== spec.kind || !Object.is(value, spec.exact)) fail('FIELD', path, 'Unexpected primitive type or value');
    return;
  }
  if (value === null || typeof value !== 'object') fail('TYPE', path, `Expected ${spec.kind}`);
  if (spec.kind === 'array') {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) fail('TYPE', path, 'Expected ordinary JSON array');
    const keys = Reflect.ownKeys(value);
    if (value.length !== spec.items.length || keys.length !== spec.items.length + 1 || keys.at(-1) !== 'length') fail('ARRAY', path, 'Changed array length, extra properties or holes');
    for (let i = 0; i < spec.items.length; i++) {
      if (keys[i] !== String(i)) fail('ARRAY', path, 'Changed array position');
      const entry = Object.getOwnPropertyDescriptor(value, String(i));
      if (!entry || !('value' in entry) || !entry.enumerable) fail('PROPERTY', pointerChild(path, i), 'Unsupported array property');
      verify(entry.value, spec.items[i], pointerChild(path, i));
    }
    return;
  }
  if (Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) fail('TYPE', path, 'Expected ordinary JSON object');
  const keys = Reflect.ownKeys(value);
  if (keys.length !== spec.entries.length) fail('KEYS', path, 'Unexpected or missing field');
  for (let i = 0; i < spec.entries.length; i++) {
    const [key, child] = spec.entries[i];
    if (keys[i] !== key) fail('KEYS', path, 'Unsupported field or field order');
    const entry = Object.getOwnPropertyDescriptor(value, key);
    if (!entry || !('value' in entry) || !entry.enumerable) fail('PROPERTY', pointerChild(path, key), 'Unsupported object property');
    verify(entry.value, child, pointerChild(path, key));
  }
}
function object(value: Json): JsonObject { return value as JsonObject; }
function rows(value: Json): readonly JsonObject[] { return value as readonly JsonObject[]; }
function componentFrom(root: JsonObject, component: Component): JsonObject {
  if (component === 'baseline') return object(root.baseline);
  const index = COMPONENT_NAMES.indexOf(component) - 1;
  if (index < 0) fail('COMPONENT', '', 'Unknown component');
  return object((root.extensions as readonly Json[])[index]);
}
function checkReferences(root: JsonObject): void {
  const baseline = object(root.baseline);
  const baseIds = new Set(rows(baseline.milestones).map(r => r.milestone));
  for (const r of rows(baseline.procedural_relations)) {
    if (!baseIds.has(r.linked_milestone)) fail('REFERENCE', '/baseline/procedural_relations', 'Unresolved baseline milestone');
  }
  for (const name of COMPONENT_NAMES.slice(1)) {
    const packet = componentFrom(root, name);
    const path = `/extensions/${COMPONENT_NAMES.indexOf(name) - 1}`;
    const claims = new Set(rows(packet.milestones).map(r => r.id));
    const nodes = new Set(rows(packet.nodes).map(r => r.id));
    const sources = new Set(rows(packet.sources).map(r => r.id));
    if (claims.size !== rows(packet.milestones).length || nodes.size !== rows(packet.nodes).length || sources.size !== rows(packet.sources).length) fail('IDENTIFIER', path, 'Repeated component-local identifier');
    for (const relation of rows(packet.procedural_relations)) {
      if (!claims.has(relation.milestone_id) || !nodes.has(relation.source_node_id) || !nodes.has(relation.target_node_id)) fail('REFERENCE', path, 'Unresolved component-local relation reference');
    }
    const scan = (v: Json, at: string): void => {
      if (Array.isArray(v)) { v.forEach((x, i) => scan(x, pointerChild(at, i))); return; }
      if (v && typeof v === 'object') for (const [key, child] of Object.entries(v)) {
        if (key === 'source_id' && !sources.has(child)) fail('REFERENCE', pointerChild(at, key), 'Unresolved component-local source');
        if (key === 'source_ids') for (const id of child as readonly Json[]) if (!sources.has(id)) fail('REFERENCE', pointerChild(at, key), 'Unresolved component-local source');
        scan(child, pointerChild(at, key));
      }
    };
    scan(packet, path);
  }
}

/** Diagnostic only. Success NEVER creates admission or permits rendering. */
export function validateShape(input: unknown): void {
  verify(input, ENVELOPE, '');
  checkReferences(input as JsonObject);
}
/** Each round has its own closed ordered field/value contract. */
export function validateComponentShape(component: Component, input: unknown): void {
  if (!COMPONENT_NAMES.includes(component)) fail('COMPONENT', '', 'Unknown component');
  verify(input, COMPONENTS[component], component === 'baseline' ? '/baseline' : `/extensions/${COMPONENT_NAMES.indexOf(component) - 1}`);
}

declare const admissionBrand: unique symbol;
export type Admission = Readonly<{ readonly [admissionBrand]: true }>;
type Bound = Readonly<{ packet: JsonObject; bytes: Uint8Array }>;
const admitted = new WeakMap<object, Bound>();
const typedArrayPrototype = Object.getPrototypeOf(Uint8Array.prototype);
const intrinsicBuffer = Object.getOwnPropertyDescriptor(typedArrayPrototype, 'buffer')!.get!;
const intrinsicOffset = Object.getOwnPropertyDescriptor(typedArrayPrototype, 'byteOffset')!.get!;
const intrinsicLength = Object.getOwnPropertyDescriptor(typedArrayPrototype, 'byteLength')!.get!;
const intrinsicTag = Object.getOwnPropertyDescriptor(typedArrayPrototype, Symbol.toStringTag)!.get!;
const ordinaryBufferLength = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'byteLength')!.get!;

/** Full raw bytes are copied, length-checked and SHA-256-checked BEFORE decoding or parsing. */
export async function admitBytes(input: Uint8Array): Promise<Admission> {
  // Intrinsic accessors and typed-array copying bypass overridden getters/iterators.
  if (!ArrayBuffer.isView(input) || intrinsicTag.call(input) !== 'Uint8Array') fail('BYTES', '', 'Expected non-shared byte buffer');
  const buffer = intrinsicBuffer.call(input) as ArrayBufferLike;
  try { ordinaryBufferLength.call(buffer); }
  catch { fail('BYTES', '', 'Shared or unsupported backing buffers are unsupported'); }
  const length = intrinsicLength.call(input) as number;
  if (length !== SOURCE_BYTES) fail('BYTES', '', 'Reviewed byte length mismatch');
  const view = new Uint8Array(buffer, intrinsicOffset.call(input) as number, length);
  const bytes = new Uint8Array(length);
  Uint8Array.prototype.set.call(bytes, view);
  if (bytes.byteLength !== SOURCE_BYTES) fail('BYTES', '', 'Reviewed byte length mismatch');
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  const hex = Array.from(digest, b => b.toString(16).padStart(2, '0')).join('');
  if (hex !== SOURCE_SHA256) fail('DIGEST', '', 'Reviewed raw-byte digest mismatch');
  let candidate: unknown;
  try { candidate = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { fail('JSON', '', 'Invalid UTF-8 or JSON'); }
  validateShape(candidate);
  const packet = freeze(candidate as JsonObject);
  const token = Object.freeze(Object.create(null)) as Admission;
  admitted.set(token, Object.freeze({ packet, bytes }));
  return token;
}
function bound(token: Admission): Bound {
  if (token === null || typeof token !== 'object' || !admitted.has(token)) fail('UNBOUND', '', 'Render boundary requires an authentic admission handle');
  return admitted.get(token)!;
}
export function readAdmitted(token: Admission): JsonObject { return bound(token).packet; }
export function copyAdmittedBytes(token: Admission): Uint8Array { return new Uint8Array(bound(token).bytes); }
export function readComponent(token: Admission, component: Component): JsonObject {
  const root = readAdmitted(token);
  if (!COMPONENT_NAMES.includes(component)) fail('COMPONENT', '', 'Unknown component');
  return componentFrom(root, component);
}
export type SelectionRequest = Readonly<{ component: Component; collection: 'milestones' | 'procedural_relations'; id: number | string }>;
export type Selection = Readonly<{ component: Component; collection: SelectionRequest['collection']; id: number | string; pointer: string; record: JsonObject }>;
export function selectRecord(token: Admission, request: SelectionRequest): Selection {
  readAdmitted(token);
  if (!request || typeof request !== 'object' || Object.getPrototypeOf(request) !== Object.prototype) fail('SELECTION', '', 'Expected an ordinary selection request');
  const keys = Reflect.ownKeys(request);
  if (keys.length !== 3 || !['component', 'collection', 'id'].every(k => keys.includes(k))) fail('SELECTION', '', 'Unexpected selection fields');
  const properties = Object.getOwnPropertyDescriptors(request);
  if (Object.values(properties).some(p => !('value' in p) || !p.enumerable)) fail('SELECTION', '', 'Selection getters and hidden fields are unsupported');
  const component = properties.component.value as Component;
  const collection = properties.collection.value as SelectionRequest['collection'];
  const id = properties.id.value as number | string;
  const packet = readComponent(token, component);
  if (collection !== 'milestones' && collection !== 'procedural_relations') fail('SELECTION', '', 'Unsupported record collection');
  const baseline = component === 'baseline';
  if (typeof id !== (baseline ? 'number' : 'string')) fail('SELECTION', '', 'Identifier type differs from its component');
  const idKey = baseline ? (collection === 'milestones' ? 'milestone' : 'relation') : 'id';
  const index = rows(packet[collection]).findIndex(row => row[idKey] === id);
  if (index < 0) fail('SELECTION', '', 'Unknown identifier in the requested component');
  const prefix = baseline ? '/baseline' : `/extensions/${COMPONENT_NAMES.indexOf(component) - 1}`;
  return freeze({ component, collection, id, pointer: `${prefix}/${collection}/${index}`, record: rows(packet[collection])[index] });
}
