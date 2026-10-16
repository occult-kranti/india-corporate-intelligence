import assert from 'node:assert/strict';

/** Independent measured-rectangle contract, deliberately not imported from the
 * runtime classifier. These identity/placement assertions are always fatal,
 * including for hidden plaques before the policy filters deferred geometry. */
export function assertRoleLabelPlacementSemantics(sample, label, prefix) {
  assert.ok(['anchored', 'displaced-contained', 'displaced', 'unresolved'].includes(label.placement), `${prefix}: invalid original role placement metadata ${label.id}`);
  const matches = sample.leaders.filter(item => item.id === label.id);
  assert.equal(matches.length, 1, `${prefix}: role must retain exactly one original leader identity ${label.id}`);
  const leader = matches[0];
  assert.ok(Math.abs(leader.x1 - label.anchor.x) <= .01 && Math.abs(leader.y1 - label.anchor.y) <= .01,
    `${prefix}: leader does not retain projected relation midpoint ${label.id}`);
  const rect = label.rect, anchor = label.anchor;
  const displaced = Math.hypot(rect.left + rect.width / 2 - anchor.x, rect.top + rect.height / 2 - anchor.y) > .5;
  // Inclusive boundary, no epsilon: even an anchor just outside needs a leader.
  const contained = anchor.x >= rect.left && anchor.x <= rect.left + rect.width
    && anchor.y >= rect.top && anchor.y <= rect.top + rect.height;
  if (label.placement === 'displaced' || label.placement === 'displaced-contained') {
    assert.ok(displaced, `${prefix}: displaced classification without displacement ${label.id}`);
    assert.equal(contained, label.placement === 'displaced-contained', `${prefix}: role placement classification contradicts exact anchor containment ${label.id}`);
  } else {
    assert.ok(!displaced && contained, `${prefix}: anchored/unresolved role moved away from original midpoint ${label.id}`);
  }
  if (label.placement === 'displaced') {
    const deferred = sample.labelPolicy?.deferredRoles?.some(item => item.id === label.id
      && item.reason === label.disposition && ['outside-view', 'crowded'].includes(item.reason));
    assert.ok(leader.visible || (deferred && !label.visible), `${prefix}: displaced role missing visible leader or explicit deferral ${label.id}`);
  } else {
    assert.equal(leader.visible, false, `${prefix}: contained/unresolved role retains a visible leader ${label.id}`);
    if (label.placement === 'displaced-contained') {
      assert.ok(Math.abs(leader.x2 - anchor.x) <= .01 && Math.abs(leader.y2 - anchor.y) <= .01,
        `${prefix}: contained role hidden leader endpoint does not retain original midpoint ${label.id}`);
    }
  }
  return { leader, displaced, contained };
}
