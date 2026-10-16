/** CI-only observation projection. No browser launcher or application mutation.
 * Serialize inside the browser, retaining full native recording and raw exports.
 * Only scenario46 may use this narrowed observation shape. */
export function compactLifecycleObservation(data) {
  return {
    ...data,
    contexts: data.contexts.map(context => {
      const lastScene = context.passes.findLastIndex(pass => pass.type === 'scene');
      const lastComposite = context.passes.findLastIndex(pass => pass.type === 'composite');
      return {
        ...context,
        // Every retained pass keeps precisely the predicates used by
        // assertRestoration. Latest scene/composite records remain complete for
        // nativeLayout, including native draw identities, viewport and target.
        passes: context.passes.map((pass, index) => index === lastScene || index === lastComposite ? pass : {
          id: pass.id, contextId: pass.contextId, rendererId: pass.rendererId,
          type: pass.type, entryObserved: pass.entryObserved,
          terminalRestoreObserved: pass.terminalRestoreObserved,
          changes: pass.changes, logicalChanges: pass.logicalChanges,
        }),
        // Keep ALL observed non-case Three draw attempts, even unsuccessful,
        // misclassified, stale, wrong-lease, or wrong-target attempts. Filtering
        // by any acceptance condition would hide exactly the failures we test.
        draws: context.draws.filter(draw => draw.three && draw.casePass === null),
      };
    }),
  };
}

/** Serialized after installCaseGraphicsProbe in the same init script. */
export function installCaseLifecycleObservation(project) {
  const probe = window.__caseGraphicsProbe;
  if (!probe || typeof probe.read !== 'function' || 'readLifecycle' in probe || 'readLifecyclePair' in probe)
    throw new Error('Lifecycle observation requires the original unmodified native probe');
  Object.defineProperties(probe, {
    readLifecycle: { value() { return project(probe.read()); } },
    readLifecyclePair: { value() { const full = probe.read(); return { full, compact: project(full) }; } },
  });
}
export function caseLifecycleObservationInitSource() {
  return `(${installCaseLifecycleObservation.toString()})(${compactLifecycleObservation.toString()});`;
}
