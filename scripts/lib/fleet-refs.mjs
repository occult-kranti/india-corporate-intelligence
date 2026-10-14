/**
 * The cross-file half of the resolution invariant: an id that carries a fleet's prefix
 * must be defined, as an entity or a scheme, somewhere in that fleet's directory.
 *
 * validate.mjs §4 accepts a prefixed endpoint inside one file because a sibling file
 * may own it; this is the check that some sibling actually does. It is a pure
 * function over what §4 has already read, so scripts/assemble-fleet.test.mjs can run
 * it on a fixture without spawning the validator.
 */

import { FLEETS } from './vocab.mjs';

const OWNER = new Map(FLEETS.flatMap((f) => f.prefixes.map((p) => [p, f.key])));

/** The fleet key whose prefix `id` carries, or null for inventory, Atlas and other ids. */
export function fleetOfId(id) {
  const m = /^([a-z]+):/.exec(String(id ?? ''));
  return m ? OWNER.get(m[1]) ?? null : null;
}

/**
 * `defined`: Map<fleet key, Set<id>> — every entity and scheme id each fleet directory
 * defines. `refs`: [{ where, id }] — every endpoint (claim s/t, benefit.who, scheme
 * personIds, whoElseBenefits.who) any fleet file references. Returns the references
 * whose prefix names a fleet that defines no such id, each with the fleet it belongs to.
 */
export function undefinedFleetRefs(defined, refs) {
  const out = [];
  for (const { where, id } of refs) {
    const fleet = fleetOfId(id);
    if (!fleet) continue;
    if (!(defined.get(fleet)?.has(id))) out.push({ where, id, fleet });
  }
  return out;
}
