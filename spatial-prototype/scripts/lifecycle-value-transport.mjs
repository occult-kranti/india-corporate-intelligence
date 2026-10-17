/** CI-only value transport. Native recording, observation frequency and oracles
 * are unchanged. Unsupported values fail rather than becoming lossy JSON.
 * Reference aliasing is not an observation predicate; every own field/value is. */
export function serializeLifecycleValue(value) {
  const active = new WeakSet(), checked = new WeakMap();
  function snapshot(item) {
    if (item === null || typeof item === 'string' || typeof item === 'boolean') return item;
    if (typeof item === 'number') {
      if (!Number.isFinite(item) || Object.is(item, -0)) throw new Error('Lifecycle transport requires finite JSON numbers without negative zero');
      return item;
    }
    if (typeof item !== 'object') throw new Error('Lifecycle transport cannot omit or coerce an unsupported value');
    if (active.has(item)) throw new Error('Lifecycle transport does not accept cycles');
    if (checked.has(item)) return checked.get(item);
    const array = Array.isArray(item);
    if (Object.getPrototypeOf(item) !== (array ? Array.prototype : Object.prototype) || 'toJSON' in item)
      throw new Error('Lifecycle transport requires plain data without custom serialization');
    active.add(item);
    const copy = array ? [] : {};
    const keys = Reflect.ownKeys(item);
    if (array && keys.length !== item.length + 1) throw new Error('Lifecycle transport cannot omit array properties or holes');
    for (const key of keys) {
      if (array && key === 'length') continue;
      if (typeof key !== 'string' || (array && (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= item.length)))
        throw new Error('Lifecycle transport cannot omit an own property');
      const descriptor = Object.getOwnPropertyDescriptor(item, key);
      if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) throw new Error('Lifecycle transport requires enumerable data properties');
      Object.defineProperty(copy, key, { value: snapshot(descriptor.value), enumerable: true, writable: true, configurable: true });
    }
    active.delete(item); checked.set(item, copy); return copy;
  }
  // Serialize the observed data descriptors, never read original getters/traps
  // a second time. The pinned native recorder constructs ordinary plain data.
  return JSON.stringify(snapshot(value));
}
