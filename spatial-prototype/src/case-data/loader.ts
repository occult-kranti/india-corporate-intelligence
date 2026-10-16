/** Host imports this tiny entry. Call only after explicit case-reader opening.
 * No eager payload, React, scene, geometry, network or registry import. */
export const loadCaseDiagram=()=>import('./entry');
