import assert from 'node:assert/strict';

/** Real browser rectangles and wrapped text-line rectangles, not source-text heuristics. */
export async function readCaseLabelGeometry(page) {
  return page.locator('[data-case-surface]').evaluate(surface => {
    const board = surface.getBoundingClientRect(), layer = surface.querySelector('.cw-labels');
    const copy = rect => ({ left: rect.left - board.left, top: rect.top - board.top, width: rect.width, height: rect.height });
    const labels = [...surface.querySelectorAll('.cw-node-label,.cw-role-label')].map(element => {
      const range = document.createRange(); range.selectNodeContents(element);
      const style = getComputedStyle(element), rect = element.getBoundingClientRect();
      return { id: element.dataset.caseNodeId ?? element.dataset.caseEdgeId, kind: element.dataset.caseNodeId ? 'node' : 'role',
        text: element.textContent, selected: element.dataset.selected === 'true', rect: copy(rect),
        lines: [...range.getClientRects()].filter(line => line.width > .1 && line.height > .1).map(copy),
        anchor: { x: Number(element.dataset.caseLabelX), y: Number(element.dataset.caseLabelY) },
        placement: element.dataset.caseLabelPlacement ?? 'anchored',
        visible: style.visibility === 'visible' && style.display !== 'none' && Number(style.opacity) > 0,
        textOverflow: style.textOverflow, lineClamp: style.webkitLineClamp,
      };
    });
    const leaders = [...surface.querySelectorAll('[data-case-label-leader]')].map(element => ({
      id: element.dataset.caseLabelLeader, x1: Number(element.getAttribute('x1')), y1: Number(element.getAttribute('y1')),
      x2: Number(element.getAttribute('x2')), y2: Number(element.getAttribute('y2')), visible: getComputedStyle(element).visibility === 'visible',
    }));
    const credits = [...document.querySelectorAll('.evidence-app .city-attribution > a,.evidence-app .maplibregl-ctrl-attrib-inner')]
      .filter(element => element.checkVisibility({ opacityProperty: true, visibilityProperty: true }))
      .map(element => ({ text: element.textContent, rect: copy(element.getBoundingClientRect()) }))
      .filter(credit => credit.rect.width > 0 && credit.rect.height > 0 && credit.rect.left < board.width && credit.rect.left + credit.rect.width > 0 && credit.rect.top < board.height && credit.rect.top + credit.rect.height > 0);
    return { width: board.width, height: board.height, labels, leaders, credits,
      expectedNodeIds: JSON.parse(layer.dataset.caseVisibleNodeIds), expectedRoleIds: JSON.parse(layer.dataset.caseVisibleRoleIds),
      selection: surface.closest('[data-case-workspace]').dataset.caseSelection };
  });
}
const right = r => r.left + r.width, bottom = r => r.top + r.height;
const overlaps = (a, b, gap = 0) => a.left < right(b) + gap - .5 && right(a) + gap - .5 > b.left && a.top < bottom(b) + gap - .5 && bottom(a) + gap - .5 > b.top;
const contains = (outer, inner) => inner.left >= outer.left - .75 && inner.top >= outer.top - .75 && right(inner) <= right(outer) + .75 && bottom(inner) <= bottom(outer) + .75;

export function validateCaseLabelGeometry(sample, file, { phase = 'frame', fit = false } = {}) {
  const prefix = `${file.id}:${phase}`, board = { left: 0, top: 0, width: sample.width, height: sample.height };
  const nodes = sample.labels.filter(label => label.kind === 'node'), roles = sample.labels.filter(label => label.kind === 'role');
  assert.deepEqual(nodes.map(label => label.id), sample.expectedNodeIds, `${prefix}: emitted node IDs differ from visible frame contract`);
  assert.deepEqual(roles.map(label => label.id), sample.expectedRoleIds, `${prefix}: emitted role IDs differ from visible frame contract`);
  for (const kind of [nodes, roles]) assert.equal(new Set(kind.map(label => label.id)).size, kind.length, `${prefix}: duplicate emitted label ID`);
  if (fit) assert.deepEqual(nodes.map(label => label.id), file.nodes.map(node => node.id), `${prefix}: fit must include every exact node`);
  const selectedEdge = file.edges.find(edge => edge.id === sample.selection);
  const selectedNode = file.nodes.find(node => node.id === sample.selection);
  const mandatory = new Set(selectedEdge ? [selectedEdge.id, selectedEdge.from, selectedEdge.to] : selectedNode ? [selectedNode.id] : []);
  for (const id of mandatory) assert.equal(sample.labels.filter(label => label.id === id).length, 1, `${prefix}: selected role/node/endpoint missing or duplicated ${id}`);
  const clipped = [];
  for (const label of sample.labels) {
    for (const credit of sample.credits ?? []) assert.ok(!overlaps(label.rect, credit.rect, 6), `${prefix}: label obscures provider/ODbL credit: ${label.id} / ${credit.text}`);
    assert.equal(label.text, label.kind === 'node' ? file.nodes.find(node => node.id === label.id)?.label : file.edges.find(edge => edge.id === label.id)?.role, `${prefix}: exact full text ${label.id}`);
    assert.ok(label.visible && label.lines.length && label.rect.width > 0 && label.rect.height > 0, `${prefix}: hidden/empty label ${label.id}`);
    assert.notEqual(label.textOverflow, 'ellipsis', `${prefix}: ellipsized label ${label.id}`);
    assert.ok(!label.lineClamp || label.lineClamp === 'none', `${prefix}: clamped label ${label.id}`);
    for (const line of label.lines) assert.ok(contains(label.rect, line), `${prefix}: text line escapes its plaque ${label.id}`);
    if (!contains(board, label.rect)) clipped.push(label.id);
    if (fit || mandatory.has(label.id)) assert.ok(contains(board, label.rect), `${prefix}: required full label clips board ${label.id}`);
    if (label.kind === 'node') {
      assert.ok(Math.abs(label.rect.left + label.rect.width / 2 - label.anchor.x) <= .75 && Math.abs(label.rect.top + label.rect.height / 2 - label.anchor.y) <= .75, `${prefix}: node label moved away from original pin ${label.id}`);
    } else {
      assert.notEqual(label.placement, 'unresolved', `${prefix}: unresolved role plaque ${label.id}`);
      if (label.placement === 'displaced') {
        const leader = sample.leaders.find(item => item.id === label.id);
        assert.ok(leader?.visible, `${prefix}: displaced role missing visible leader ${label.id}`);
        assert.ok(Math.abs(leader.x1 - label.anchor.x) <= .01 && Math.abs(leader.y1 - label.anchor.y) <= .01, `${prefix}: leader does not retain projected relation midpoint ${label.id}`);
        const onX = Math.abs(leader.x2 - label.rect.left) < .75 || Math.abs(leader.x2 - right(label.rect)) < .75;
        const onY = Math.abs(leader.y2 - label.rect.top) < .75 || Math.abs(leader.y2 - bottom(label.rect)) < .75;
        assert.ok((onX || onY) && leader.x2 >= label.rect.left - .75 && leader.x2 <= right(label.rect) + .75 && leader.y2 >= label.rect.top - .75 && leader.y2 <= bottom(label.rect) + .75, `${prefix}: leader does not terminate at plaque boundary ${label.id}`);
      }
    }
  }
  for (let i = 0; i < sample.labels.length; i++) for (const b of sample.labels.slice(i + 1)) {
    const a = sample.labels[i];
    assert.ok(!overlaps(a.rect, b.rect, 6), `${prefix}: plaque collision or missing 6px gap: ${a.id} / ${b.id}`);
    for (const lineA of a.lines) for (const lineB of b.lines)
      assert.ok(!overlaps(lineA, lineB), `${prefix}: actual wrapped text-line collision: ${a.id} / ${b.id}`);
  }
  return { labels: sample.labels.length, nodes: nodes.length, roles: roles.length, clippedNonselectedIds: clipped,
    fullBoardContainmentRequired: fit, reservedCreditCount: sample.credits?.length ?? 0, displacedRoles: roles.filter(role => role.placement === 'displaced').map(role => role.id) };
}

export async function assertCaseLabelReadability(page, file, result, options = {}) {
  const sample = await readCaseLabelGeometry(page);
  (result.caseLabelReadabilitySamples ??= []).push({ caseId: file.id, phase: options.phase, ...sample });
  const receipt = validateCaseLabelGeometry(sample, file, options);
  // Give ResizeObserver another delivery opportunity. Position-only writes must
  // not change an absolute plaque's width and cause size/position oscillation.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const repeated = await readCaseLabelGeometry(page);
  for (const before of sample.labels.filter(label => label.kind === 'role')) {
    const after = repeated.labels.find(label => label.kind === 'role' && label.id === before.id);
    assert.ok(after, `${file.id}: role vanished during settled placement ${before.id}`);
    for (const key of ['left', 'top', 'width', 'height']) assert.ok(Math.abs(after.rect[key] - before.rect[key]) <= .75, `${file.id}: unstable role ${key} after ResizeObserver ${before.id}`);
    assert.deepEqual(after.anchor, before.anchor, `${file.id}: role anchor changed during placement ${before.id}`);
  }
  return receipt;
}
