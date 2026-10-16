import assert from 'node:assert/strict';
import { assertRoleLabelPlacementSemantics } from './case-role-label-semantics.mjs';
import { assertReadableGeometry } from './case-label-coverage.mjs';
import { prepareReadableCaseLabelGeometry } from './case-label-policy.mjs';

/** Real browser rectangles and wrapped text-line rectangles, not source-text heuristics. */
export async function readCaseLabelGeometry(page) {
  return page.locator('[data-case-surface]').evaluate(surface => {
    const board = surface.getBoundingClientRect(), layer = surface.querySelector('.cw-labels');
    const copy = rect => ({ left: rect.left - board.left, top: rect.top - board.top, width: rect.width, height: rect.height });
    // Probe the same full node text and font at independent absolute positions.
    // A hidden clone leaves actual labels, source IDs and projected pins untouched.
    const measureNaturalNodeSizing = element => {
      const probe = element.cloneNode(true);
      probe.removeAttribute('data-case-node-id');
      probe.removeAttribute('id');
      probe.setAttribute('aria-hidden', 'true');
      probe.style.visibility = 'hidden';
      probe.style.maxWidth = '';
      layer.append(probe);
      try {
        const probes = [0, board.width / 2, Math.max(0, board.width - 1)].map(x => {
          probe.style.left = `${x}px`;
          const rect = probe.getBoundingClientRect();
          return { x, width: rect.width, height: rect.height };
        });
        return { measuredNaturalWidth: Number(element.dataset.caseLabelNaturalWidth),
          widthMode: element.dataset.caseLabelWidth, probes };
      } finally { probe.remove(); }
    };
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
        naturalSizing: element.dataset.caseNodeId ? measureNaturalNodeSizing(element) : null,
        disposition: element.dataset.caseLabelDisposition ?? 'shown',
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
    const workspace = surface.closest('[data-case-workspace]'), notice = workspace.querySelector('[data-case-label-notice]');
    const noticeGeometry = element => {
      const rect = element.getBoundingClientRect(), band = workspace.querySelector('.cw-scene-band')?.getBoundingClientRect();
      const points = [[rect.left+4,rect.top+4],[rect.right-4,rect.top+4],[rect.left+4,rect.bottom-4],[rect.right-4,rect.bottom-4],[(rect.left+rect.right)/2,(rect.top+rect.bottom)/2]];
      return { rect: { left:rect.left,top:rect.top,width:rect.width,height:rect.height },
        viewport: { width:innerWidth,height:innerHeight },
        inViewport:rect.width>0&&rect.height>0&&rect.left>=0&&rect.top>=0&&rect.right<=innerWidth&&rect.bottom<=innerHeight,
        inSceneBand:Boolean(band)&&rect.left>=band.left&&rect.top>=band.top&&rect.right<=band.right&&rect.bottom<=band.bottom,
        unobscured:points.every(([x,y])=>{const top=document.elementFromPoint(x,y);return top===element||element.contains(top);}) };
    };
    const readerRows = selector => [...workspace.querySelectorAll(selector)].map(element => ({ id: element.dataset.nodeId ?? element.dataset.edgeId, text: element.querySelector(':scope > button')?.textContent }));
    const available = name => [...workspace.querySelectorAll('button')].some(button => button.textContent === name && !button.disabled && button.checkVisibility({ opacityProperty: true, visibilityProperty: true }));
    const rail=workspace.querySelector('.cw-rail'), status=workspace.querySelector('[data-case-label-status]'), focused=document.activeElement;
    const globalRect=element=>element?{left:element.getBoundingClientRect().left,top:element.getBoundingClientRect().top,width:element.getBoundingClientRect().width,height:element.getBoundingClientRect().height}:null;
    return { width: board.width, height: board.height, labels, leaders, credits,
      boardRect:globalRect(surface),statusRect:globalRect(status),railScrollTop:rail?.scrollTop,
      focusedControl:focused?{tag:focused.tagName,text:focused.textContent,node:focused.closest('[data-node-id]')?.getAttribute('data-node-id'),edge:focused.closest('[data-edge-id]')?.getAttribute('data-edge-id')}:null,
      labelPolicyName: layer.dataset.caseLabelPolicy ?? null,
      labelPublication: layer.dataset.caseLabelPublication ?? null,
      workspaceLabelPolicy: workspace.dataset.caseReadableLabelReport ? JSON.parse(workspace.dataset.caseReadableLabelReport) : null,
      labelPolicy: layer.dataset.caseLabelReport ? JSON.parse(layer.dataset.caseLabelReport) : null,
      allFrameNodeIds: JSON.parse(layer.dataset.caseAllNodeIds ?? '[]'), allFrameRoleIds: JSON.parse(layer.dataset.caseAllRoleIds ?? '[]'),
      policyNotice: notice ? { ...noticeGeometry(notice), visible: notice.checkVisibility({ opacityProperty: true, visibilityProperty: true }), nodeCount: Number(notice.dataset.caseDeferredNodeCount), roleCount: Number(notice.dataset.caseDeferredRoleCount), text: notice.textContent } : null,
      readerNodes: readerRows('.cw-rail [data-node-id]'), readerRoles: readerRows('.cw-rail [data-edge-id]'),
      fitControlAvailable: available('Fit case'), readerControlAvailable: available('Complete reader'),
      expectedNodeIds: JSON.parse(layer.dataset.caseVisibleNodeIds), expectedRoleIds: JSON.parse(layer.dataset.caseVisibleRoleIds),
      selection: surface.closest('[data-case-workspace]').dataset.caseSelection };
  });
}
const right = r => r.left + r.width, bottom = r => r.top + r.height;
const overlaps = (a, b, gap = 0) => a.left < right(b) + gap - .5 && right(a) + gap - .5 > b.left && a.top < bottom(b) + gap - .5 && bottom(a) + gap - .5 > b.top;
const contains = (outer, inner) => inner.left >= outer.left - .75 && inner.top >= outer.top - .75 && right(inner) <= right(outer) + .75 && bottom(inner) <= bottom(outer) + .75;

export function validateCaseLabelSemantics(sample, file, { phase = 'frame', fit = false } = {}) {
  const prefix = `${file.id}:${phase}`;
  const nodes = sample.labels.filter(label => label.kind === 'node'), roles = sample.labels.filter(label => label.kind === 'role');
  assert.deepEqual(nodes.map(label => label.id), sample.expectedNodeIds, `${prefix}: emitted node IDs differ from visible frame contract`);
  assert.deepEqual(roles.map(label => label.id), sample.expectedRoleIds, `${prefix}: emitted role IDs differ from visible frame contract`);
  for (const kind of [nodes, roles]) assert.equal(new Set(kind.map(label => label.id)).size, kind.length, `${prefix}: duplicate emitted label ID`);
  if (fit) assert.deepEqual(nodes.map(label => label.id), file.nodes.map(node => node.id), `${prefix}: fit must include every exact node`);
  const selectedEdge = file.edges.find(edge => edge.id === sample.selection);
  const selectedNode = file.nodes.find(node => node.id === sample.selection);
  const mandatory = new Set(selectedEdge ? [selectedEdge.id, selectedEdge.from, selectedEdge.to] : selectedNode ? [selectedNode.id] : []);
  for (const id of mandatory) assert.equal(sample.labels.filter(label => label.id === id).length, 1, `${prefix}: selected role/node/endpoint missing or duplicated ${id}`);
  // A presentation fault must never mask a simultaneous source/pin/leader fault.
  // Complete this prepass before any collectable geometry assertion.
  for (const label of sample.labels) {
    assert.equal(label.text, label.kind === 'node' ? file.nodes.find(node => node.id === label.id)?.label : file.edges.find(edge => edge.id === label.id)?.role, `${prefix}: exact full text ${label.id}`);
    if (label.kind === 'node') {
      assert.ok(Math.abs(label.rect.left + label.rect.width / 2 - label.anchor.x) <= .75 && Math.abs(label.rect.top + label.rect.height / 2 - label.anchor.y) <= .75, `${prefix}: node label moved away from original pin ${label.id}`);
    } else {
      assertRoleLabelPlacementSemantics(sample, label, prefix);
    }
  }
  return { prefix, nodes, roles, mandatory };
}

export function validateCaseLabelGeometry(sample, file, options = {}) {
  const { prefix, nodes, roles, mandatory } = validateCaseLabelSemantics(sample, file, options);
  const { fit = false } = options, board = { left: 0, top: 0, width: sample.width, height: sample.height };
  const clipped = [];
  for (const label of sample.labels) {
    for (const credit of sample.credits ?? []) assertReadableGeometry(!overlaps(label.rect, credit.rect, 6), `${prefix}: label obscures provider/ODbL credit: ${label.id} / ${credit.text}`);
    assert.equal(label.text, label.kind === 'node' ? file.nodes.find(node => node.id === label.id)?.label : file.edges.find(edge => edge.id === label.id)?.role, `${prefix}: exact full text ${label.id}`);
    assertReadableGeometry(label.visible && label.lines.length && label.rect.width > 0 && label.rect.height > 0, `${prefix}: hidden/empty label ${label.id}`);
    assertReadableGeometry(label.textOverflow !== 'ellipsis', `${prefix}: ellipsized label ${label.id}`);
    assertReadableGeometry(!label.lineClamp || label.lineClamp === 'none', `${prefix}: clamped label ${label.id}`);
    for (const line of label.lines) assertReadableGeometry(contains(label.rect, line), `${prefix}: text line escapes its plaque ${label.id}`);
    if (!contains(board, label.rect)) clipped.push(label.id);
    if (fit || mandatory.has(label.id)) assertReadableGeometry(contains(board, label.rect), `${prefix}: required full label clips board ${label.id}`);
    if (label.kind === 'node') {
      assert.ok(Math.abs(label.rect.left + label.rect.width / 2 - label.anchor.x) <= .75 && Math.abs(label.rect.top + label.rect.height / 2 - label.anchor.y) <= .75, `${prefix}: node label moved away from original pin ${label.id}`);
    } else {
      assertReadableGeometry(label.placement !== 'unresolved', `${prefix}: unresolved role plaque ${label.id}`);
      if (label.placement === 'displaced') {
        const leader = sample.leaders.find(item => item.id === label.id);
        assert.ok(leader?.visible, `${prefix}: displaced role missing visible leader ${label.id}`);
        assert.ok(Math.abs(leader.x1 - label.anchor.x) <= .01 && Math.abs(leader.y1 - label.anchor.y) <= .01, `${prefix}: leader does not retain projected relation midpoint ${label.id}`);
        assertReadableGeometry(Math.hypot(leader.x2 - leader.x1, leader.y2 - leader.y1) > 0, `${prefix}: outside-anchor leader has zero length ${label.id}`);
        const onX = Math.abs(leader.x2 - label.rect.left) < .75 || Math.abs(leader.x2 - right(label.rect)) < .75;
        const onY = Math.abs(leader.y2 - label.rect.top) < .75 || Math.abs(leader.y2 - bottom(label.rect)) < .75;
        assertReadableGeometry((onX || onY) && leader.x2 >= label.rect.left - .75 && leader.x2 <= right(label.rect) + .75 && leader.y2 >= label.rect.top - .75 && leader.y2 <= bottom(label.rect) + .75, `${prefix}: leader does not terminate at plaque boundary ${label.id}`);
      }
    }
  }
  for (let i = 0; i < sample.labels.length; i++) for (const b of sample.labels.slice(i + 1)) {
    const a = sample.labels[i];
    assertReadableGeometry(!overlaps(a.rect, b.rect, 6), `${prefix}: plaque collision or missing 6px gap: ${a.id} / ${b.id}`);
    for (const lineA of a.lines) for (const lineB of b.lines)
      assertReadableGeometry(!overlaps(lineA, lineB), `${prefix}: actual wrapped text-line collision: ${a.id} / ${b.id}`);
  }
  return { labels: sample.labels.length, nodes: nodes.length, roles: roles.length, clippedNonselectedIds: clipped,
    fullBoardContainmentRequired: fit, reservedCreditCount: sample.credits?.length ?? 0, displacedRoles: roles.filter(role => role.placement === 'displaced').map(role => role.id),
    containedDisplacedRoles: roles.filter(role => role.placement === 'displaced-contained').map(role => role.id) };
}

export function validateCaseNodeLabelSizingMetadata(sample, { phase = 'frame' } = {}) {
  for (const label of sample.labels.filter(item => item.kind === 'node')) {
    const prefix = `${phase}:${label.id}`, sizing = label.naturalSizing;
    assert.ok(sizing && sizing.probes?.length === 3, `${prefix}: missing node natural-width probes`);
    assert.ok(['natural', 'wrapped'].includes(sizing.widthMode), `${prefix}: missing node wrapping mode`);
  }
}

/** Same browser/font/CSS at three positions, with the runtime row cap removed. */
export function validateCaseNodeLabelSizing(sample, { phase = 'frame' } = {}) {
  validateCaseNodeLabelSizingMetadata(sample, { phase });
  for (const label of sample.labels.filter(item => item.kind === 'node')) {
    const prefix = `${phase}:${label.id}`, sizing = label.naturalSizing;
    assert.ok(sizing && sizing.probes?.length === 3, `${prefix}: missing node natural-width probes`);
    const center = sizing.probes[1];
    for (const probe of sizing.probes) {
      assertReadableGeometry(Number.isFinite(probe.width) && probe.width > 0 && Number.isFinite(probe.height) && probe.height > 0, `${prefix}: invalid node natural-size probe`);
      for (const key of ['width', 'height']) assertReadableGeometry(Math.abs(probe[key] - center[key]) <= .75, `${prefix}: position-dependent node natural ${key} at x=${probe.x}`);
    }
    assertReadableGeometry(Number.isFinite(sizing.measuredNaturalWidth) && Math.abs(sizing.measuredNaturalWidth - center.width) <= .75, `${prefix}: runtime node natural width differs from independent centered probe`);
    assert.ok(['natural', 'wrapped'].includes(sizing.widthMode), `${prefix}: missing node wrapping mode`);
    assertReadableGeometry(label.rect.width <= center.width + .75, `${prefix}: node exceeds natural width`);
    if (sizing.widthMode === 'natural') assertReadableGeometry(Math.abs(label.rect.width - center.width) <= .75, `${prefix}: uncapped node differs from natural width`);
  }
}

/** Pending frames are diagnostic, never scene credit. Source/identity/pin checks
 * run on every observation; a truthful pending frame restores every emitted
 * plaque. Wait only for the explicit committed-state transition, under the
 * existing locator timeout, rather than adding a settling sleep. */
async function readCommittedCaseLabels(page, file, result, options, read) {
  const deadline = Date.now() + 12000;
  while (true) {
    const sample = await readCaseLabelGeometry(page);
    const samples = read === 'initial' ? 'caseLabelReadabilitySamples' : 'caseLabelReadabilityRepeatedSamples';
    (result[samples] ??= []).push({ caseId:file.id, phase:options.phase, ...sample });
    validateCaseLabelSemantics(sample, file, options);
    validateCaseNodeLabelSizingMetadata(sample, options);
    if (options.requireReadablePolicy) assert.equal(sample.labelPolicyName, 'readable-minimum', `${file.id}: native scene lacks exact readable-label policy marker`);
    if (options.requireReadablePolicy || sample.labelPolicyName === 'readable-minimum') {
      assert.deepEqual(sample.allFrameNodeIds,file.nodes.map(node=>node.id),`${file.id}: full frame node identities differ`);
      assert.equal(new Set(sample.allFrameRoleIds).size,sample.allFrameRoleIds.length,`${file.id}: duplicate full frame role identity`);
      for(const id of sample.allFrameRoleIds)assert.ok(file.edges.some(edge=>edge.id===id),`${file.id}: unknown full frame role identity ${id}`);
      for(const id of sample.expectedRoleIds)assert.ok(sample.allFrameRoleIds.includes(id),`${file.id}: emitted role absent from full frame ${id}`);
      assert.deepEqual(sample.leaders.map(leader=>leader.id),sample.expectedRoleIds,`${file.id}: exact original leader identity set differs`);
    }
    if (sample.labelPolicyName !== 'readable-minimum' || sample.labelPublication === 'committed') return sample;
    (result.caseLabelPendingSamples ??= []).push({ caseId:file.id, phase:options.phase, read, ...sample });
    assert.equal(sample.labelPublication, 'pending', `${file.id}: unknown label publication state`);
    assert.equal(sample.labelPolicy, null, `${file.id}: pending layer exposes stale ready policy`);
    for (const label of sample.labels) {
      assert.equal(label.disposition, 'shown', `${file.id}: pending label retained deferral ${label.id}`);
      assert.equal(label.visible, true, `${file.id}: pending label hidden before matching explanation ${label.id}`);
    }
    assert.ok(Date.now() < deadline, `${file.id}: label publication did not commit within the existing native timeout`);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
  }
}

export async function assertCaseLabelReadability(page, file, result, options = {}) {
  // Allow the event-bounded host report to commit before checking its visible notice.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve)))));
  const sample = await readCommittedCaseLabels(page, file, result, options, 'initial');
  validateCaseLabelSemantics(sample, file, options);
  validateCaseNodeLabelSizingMetadata(sample, options);
  const prepared = prepareReadableCaseLabelGeometry(sample, file, options);
  const receipt = validateCaseLabelGeometry(prepared.sample, file, prepared.options);
  validateCaseNodeLabelSizing(sample, options);
  // Give ResizeObserver another delivery opportunity. Position-only writes must
  // not change an absolute plaque's width and cause size/position oscillation.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const repeated = await readCommittedCaseLabels(page, file, result, options, 'repeated');
  validateCaseLabelSemantics(repeated, file, options);
  validateCaseNodeLabelSizingMetadata(repeated, options);
  assert.deepEqual(repeated.labelPolicy, sample.labelPolicy, `${file.id}: unstable readable-label disposition`);
  if(options.requireReadablePolicy){
    assert.deepEqual(repeated.boardRect,sample.boardRect,`${file.id}: report publication changed measured board geometry`);
    assert.deepEqual(repeated.statusRect,sample.statusRect,`${file.id}: reserved status geometry changed during publication`);
    assert.equal(repeated.railScrollTop,sample.railScrollTop,`${file.id}: publication reset evidence reading position`);
    assert.equal(repeated.selection,sample.selection,`${file.id}: publication changed selection`);
    assert.deepEqual(repeated.focusedControl,sample.focusedControl,`${file.id}: publication changed focused control`);
  }
  // Identity/anchor stability also completes before any second-read geometry.
  for (const before of sample.labels) {
    const after = repeated.labels.find(label => label.kind === before.kind && label.id === before.id);
    assert.ok(after, `${file.id}: ${before.kind} vanished during settled placement ${before.id}`);
    assert.deepEqual(after.anchor, before.anchor, `${file.id}: ${before.kind} anchor changed during placement ${before.id}`);
  }
  const repeatedPrepared = prepareReadableCaseLabelGeometry(repeated, file, options);
  validateCaseLabelGeometry(repeatedPrepared.sample, file, repeatedPrepared.options);
  validateCaseNodeLabelSizing(repeated, options);
  for (const before of sample.labels) {
    const after = repeated.labels.find(label => label.kind === before.kind && label.id === before.id);
    assert.ok(after, `${file.id}: ${before.kind} vanished during settled placement ${before.id}`);
    for (const key of ['left', 'top', 'width', 'height']) assertReadableGeometry(Math.abs(after.rect[key] - before.rect[key]) <= .75, `${file.id}: unstable ${before.kind} ${key} after ResizeObserver ${before.id}`);
    assert.deepEqual(after.anchor, before.anchor, `${file.id}: ${before.kind} anchor changed during placement ${before.id}`);
  }
  return receipt;
}
