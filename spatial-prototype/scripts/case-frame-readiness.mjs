/** CI-only readiness. No browser is launched and no application state is changed. */
import assert from 'node:assert/strict';

/** One JavaScript task observes the DOM and native pass watermark together. */
export function observeCaseFrame() {
  const workspace = document.querySelector('[data-case-workspace]');
  const surface = workspace?.querySelector('[data-case-surface]');
  if (!workspace || !surface) return null;
  const label = element => { const rect = element.getBoundingClientRect(); return {
    id: element.dataset.caseNodeId ?? element.dataset.caseEdgeId, text: element.textContent,
    selected: element.dataset.selected === 'true', x: rect.x, y: rect.y, width: rect.width, height: rect.height,
  }; };
  return {
    caseId: workspace.dataset.caseId, selection: workspace.dataset.caseSelection,
    motion: workspace.dataset.caseMotion, view: workspace.dataset.caseView,
    observedAt: performance.now(), dataset: { ...surface.dataset },
    rect: surface.getBoundingClientRect().toJSON(), viewport: { width: innerWidth, height: innerHeight },
    nodes: [...surface.querySelectorAll('[data-case-node-id]')].map(label),
    roles: [...surface.querySelectorAll('[data-case-edge-id]')].map(label),
    native: window.__caseGraphicsProbe?.frameIdentity?.() ?? null,
  };
}

export function caseFrameReadiness(sample, file, { expectedSelection, afterNative = null } = {}) {
  if (!sample || sample.caseId !== file.id || sample.view !== 'scene' || sample.motion !== 'false') return false;
  if (Number(sample.dataset.caseFrameNodes) !== file.nodes.length || !(Number(sample.dataset.caseSceneDraws) > 0) || !(Number(sample.dataset.caseCompositeDraws) > 0)) return false;
  if (expectedSelection !== undefined && sample.selection !== expectedSelection) return false;
  const edge = file.edges.find(row => row.id === sample.selection), node = file.nodes.find(row => row.id === sample.selection);
  if (sample.selection && !edge && !node && !file.readerFactIds.includes(sample.selection)) return false;
  const selected = rows => rows.filter(row => row.selected).map(row => row.id);
  if (edge && (selected(sample.roles).length !== 1 || selected(sample.roles)[0] !== edge.id)) return false;
  if (node && (selected(sample.nodes).length !== 1 || selected(sample.nodes)[0] !== node.id)) return false;
  if (afterNative) {
    const current = sample.native;
    if (!current || !Number.isInteger(afterNative.sequence) || !Number.isInteger(current.sequence)) return false;
    for (const key of ['contextId', 'rendererId', 'canvasId']) if (!Number.isInteger(afterNative[key]) || current[key] !== afterNative[key]) return false;
    if (current.pendingPass !== null || current.poisoned !== null) return false;
    for (const type of ['scene', 'composite']) {
      const pass = current[type];
      if (!pass || !Number.isInteger(pass.id) || pass.id <= afterNative.sequence || pass.contextId !== current.contextId || pass.rendererId !== current.rendererId || !pass.nativeSucceeded || !pass.restored) return false;
    }
    if (current.composite.id <= current.scene.id || current.sequence < current.composite.id) return false;
  }
  return true;
}

export async function waitForCaseFrame({ read, until, file, expectedSelection, afterNative = null, result = null, phase = 'frame' }) {
  if (expectedSelection !== undefined) assert.ok(file.edges.some(row => row.id === expectedSelection) || file.nodes.some(row => row.id === expectedSelection) || file.readerFactIds.includes(expectedSelection), 'Expected selection must be an exact retained case ID');
  const receipt = { caseId: file.id, phase, expectedSelection: expectedSelection ?? null, afterNative, attempts: 0, first: null, last: null, status: 'pending' };
  if (result) (result.caseFrameReadiness ??= []).push(receipt);
  let sample;
  try {
    await until(async () => {
      sample = await read(); receipt.attempts++; if (receipt.attempts === 1) receipt.first = sample; receipt.last = sample;
      return caseFrameReadiness(sample, file, { expectedSelection, afterNative });
    }, `${file.id}: exact selected physical frame did not settle after completed draws`, 15000);
    assert.equal(caseFrameReadiness(sample, file, { expectedSelection, afterNative }), true);
    receipt.status = 'passed'; return sample;
  } catch (error) { receipt.status = 'failed'; receipt.error = String(error); throw error; }
}
