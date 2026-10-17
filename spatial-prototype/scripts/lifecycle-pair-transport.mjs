import {serializeLifecycleValue} from './lifecycle-value-transport.mjs';
/** Diagnostic-only transport for the same independent one-instant raw pair.
 * Does not replace read(), readLifecyclePair(), the projection or any oracle. */
export function installLifecyclePairTransport(serialize) {
  const probe=window.__caseGraphicsProbe;
  if (!probe || typeof probe.readLifecyclePair !== 'function' || 'readLifecyclePairJSON' in probe)
    throw new Error('Pair transport requires the original independent raw-pair observer');
  Object.defineProperty(probe,'readLifecyclePairJSON',{value() {
    // Preserve the old callback's metadata-before-pair evaluation order.
    const active=document.querySelector('.webgl-host')?.dataset.geographicWorkspaceActive;
    const workspaceCount=document.querySelectorAll('[data-case-workspace]').length;
    return serialize({active,workspaceCount,...probe.readLifecyclePair()});
  }});
}
export function lifecyclePairTransportInitSource() {
  return `(${installLifecyclePairTransport.toString()})(${serializeLifecycleValue.toString()});`;
}
