import { nodeLabelWidths } from './node-label-width';
import { placeRoleLabels, roleLabelPresentation, type LabelRect, type RoleLabelBox, type RoleLabelPlacement } from './role-label-layout';

export const READABLE_NODE_MIN_WIDTH = 96;
export type DeferredReason = 'outside-view' | 'crowded';
export interface DeferredLabel { id: string; reason: DeferredReason }
export interface ReadableNodeBox extends LabelRect { id: string }
export interface ReadableLabelPolicy {
  allNodeIds: readonly string[];
  allRoleIds: readonly string[];
  requiredNodeIds: readonly string[];
  requiredRoleIds: readonly string[];
  requireAll: boolean;
}
export interface ReadableLabelReport {
  status: 'ready' | 'insufficient';
  requireAll: boolean;
  board: { width: number; height: number };
  requiredNodeIds: string[];
  requiredRoleIds: string[];
  deferredNodes: DeferredLabel[];
  deferredRoles: DeferredLabel[];
  failures: { id: string; reason: 'missing' | 'outside-view' | 'collision' | 'no-role-placement' }[];
}
const right = (box: LabelRect) => box.left + box.width, bottom = (box: LabelRect) => box.top + box.height;
export const readableLabelsOverlap = (a: LabelRect, b: LabelRect) =>
  a.left < right(b) + 6 - .5 && right(a) + 6 - .5 > b.left && a.top < bottom(b) + 6 - .5 && bottom(a) + 6 - .5 > b.top;
export const readableLabelContained = (box: LabelRect, width: number, height: number) =>
  box.left >= -.75 && box.top >= -.75 && right(box) <= width + .75 && bottom(box) <= height + .75;

/** Existing home pose means all labels, including after Fit with selection retained. */
export function isAllLabelPose(pose: { center: readonly number[]; zoom: number; bearing: number; tilt: number },
  bounds: { minX: number; maxX: number; minY: number; maxY: number }): boolean {
  return Math.abs(pose.zoom - 1) < 1e-6 && Math.abs(pose.bearing) < 1e-6 && Math.abs(pose.tilt) < 1e-6
    && Math.abs(pose.center[0] - (bounds.minX + bounds.maxX) / 2) < 1e-6
    && Math.abs(pose.center[1] - (bounds.minY + bounds.maxY) / 2) < 1e-6;
}

/** Same row calculation, with a readable lower bound only for naturally long names. */
export function wrapReadableNodeLabels(elements: readonly HTMLElement[]): void {
  for (const element of elements) element.style.maxWidth = '';
  const nodes = elements.map(element => ({ id: element.dataset.caseNodeId!, x: Number(element.dataset.caseLabelX),
    y: Number(element.dataset.caseLabelY), width: element.getBoundingClientRect().width }));
  const widths = nodeLabelWidths(nodes);
  elements.forEach((element, index) => {
    const node = nodes[index], minimum = Math.min(node.width, READABLE_NODE_MIN_WIDTH);
    const width = Math.max(minimum, widths.get(node.id)!);
    element.style.maxWidth = width < node.width - .25 ? `${width}px` : '';
    element.dataset.caseLabelNaturalWidth = String(node.width);
    element.dataset.caseLabelReadableMin = String(minimum);
    element.dataset.caseLabelWidth = width < node.width - .25 ? 'wrapped' : 'natural';
  });
}

/** Bounded deterministic policy: mandatory boxes first, then stable source order.
 * No camera, topology, text, pin position, or font mutation. */
export function planReadableCaseLabels(nodes: readonly ReadableNodeBox[], roles: readonly RoleLabelBox[],
  width: number, height: number, policy: ReadableLabelPolicy, credits: readonly LabelRect[] = []):
  { report: ReadableLabelReport; roles: RoleLabelPlacement[] } {
  const requiredNodes = new Set(policy.requireAll ? policy.allNodeIds : policy.requiredNodeIds);
  const requiredRoles = new Set([...policy.requiredRoleIds, ...(policy.requireAll ? policy.allRoleIds : [])]);
  const report: ReadableLabelReport = { status: 'ready', requireAll: policy.requireAll, board: { width, height },
    requiredNodeIds: [...requiredNodes], requiredRoleIds: [...requiredRoles], deferredNodes: [], deferredRoles: [], failures: [] };
  const occupied = [...credits], placements = new Map<string, RoleLabelPlacement>();
  const fail = (id: string, reason: ReadableLabelReport['failures'][number]['reason']) => { report.failures.push({ id, reason }); };
  for (const id of requiredNodes) if (!nodes.some(node => node.id === id)) fail(id, 'missing');
  for (const id of requiredRoles) if (!roles.some(role => role.id === id)) fail(id, 'missing');
  for (const node of nodes.filter(node => requiredNodes.has(node.id))) {
    if (!readableLabelContained(node, width, height)) fail(node.id, 'outside-view');
    if (occupied.some(rect => readableLabelsOverlap(node, rect))) fail(node.id, 'collision');
    occupied.push(node);
  }
  const place = (role: RoleLabelBox, required: boolean) => {
    const [placement] = placeRoleLabels(occupied, [role], width, height);
    placements.set(role.id, placement);
    if (placement.unresolved) {
      if (required) fail(role.id, 'no-role-placement');
      else report.deferredRoles.push({ id: role.id, reason: readableLabelContained(placement, width, height) ? 'crowded' : 'outside-view' });
    } else occupied.push(placement);
  };
  for (const role of roles.filter(role => requiredRoles.has(role.id))) place(role, true);
  for (const id of policy.allNodeIds) if (!nodes.some(node => node.id === id) && !requiredNodes.has(id)) report.deferredNodes.push({ id, reason: 'outside-view' });
  for (const node of nodes.filter(node => !requiredNodes.has(node.id))) {
    if (!readableLabelContained(node, width, height)) report.deferredNodes.push({ id: node.id, reason: 'outside-view' });
    else if (occupied.some(rect => readableLabelsOverlap(node, rect))) report.deferredNodes.push({ id: node.id, reason: 'crowded' });
    else occupied.push(node);
  }
  for (const id of policy.allRoleIds) if (!roles.some(role => role.id === id) && !requiredRoles.has(id)) report.deferredRoles.push({ id, reason: 'outside-view' });
  for (const role of roles.filter(role => !requiredRoles.has(role.id))) place(role, false);
  report.deferredNodes.sort((a, b) => policy.allNodeIds.indexOf(a.id) - policy.allNodeIds.indexOf(b.id));
  report.deferredRoles.sort((a, b) => policy.allRoleIds.indexOf(a.id) - policy.allRoleIds.indexOf(b.id));
  report.status = report.failures.length ? 'insufficient' : 'ready';
  return { report, roles: roles.map(role => placements.get(role.id)!) };
}

export interface ReadableLabelObserverOptions extends ReadableLabelPolicy {
  isSettled: () => boolean;
  /** Commit the matching explanation synchronously, then acknowledge it. */
  onReport: (report: ReadableLabelReport) => boolean;
}
const invalidators = new WeakMap<HTMLElement, () => void>();
/** Clear exposed policy/deferrals before the host removes a report's explanation. */
export function invalidateReadableCaseLabels(root: HTMLElement): void {
  invalidators.get(root)?.();
}

/** Event-driven measurement with a bounded, acknowledged publication. Pending
 * frames retain full labels and expose no ready policy. No idle polling loop. */
export function observeReadableCaseLabels(root: HTMLElement, policy: ReadableLabelObserverOptions): () => void {
  const nodes = [...root.querySelectorAll<HTMLElement>('.cw-node-label')], roles = [...root.querySelectorAll<HTMLElement>('.cw-role-label')];
  const leaders = new Map([...root.querySelectorAll<SVGLineElement>('[data-case-label-leader]')].map(line => [line.dataset.caseLabelLeader!, line]));
  const creditElements = [...root.ownerDocument.querySelectorAll<HTMLElement>('.evidence-app .city-attribution > a,.evidence-app .maplibregl-ctrl-attrib-inner')];
  const window = root.ownerDocument.defaultView!;
  let active = true, pendingFrame = 0, pendingKey = '', publishedKey = '', revision = 0;
  let last: ReturnType<typeof planReadableCaseLabels> | null = null;
  const apply = (result: ReturnType<typeof planReadableCaseLabels>, publish: boolean) => {
    const bounds = root.getBoundingClientRect();
    const deferredNodes = new Map(result.report.deferredNodes.map(item => [item.id, item.reason]));
    const deferredRoles = new Map(result.report.deferredRoles.map(item => [item.id, item.reason]));
    nodes.forEach(element => {
      const reason = publish ? deferredNodes.get(element.dataset.caseNodeId!) : undefined;
      element.dataset.caseLabelDisposition = reason ?? 'shown';
      element.style.visibility = reason ? 'hidden' : '';
    });
    result.roles.forEach((role, index) => {
      const element = roles[index], reason = publish ? deferredRoles.get(role.id) : undefined, leader = leaders.get(role.id);
      element.dataset.caseLabelDisposition = reason ?? 'shown';
      element.style.visibility = reason ? 'hidden' : '';
      element.style.left = `${role.left + role.width / 2}px`; element.style.top = `${role.top + role.height / 2}px`;
      const rect = element.getBoundingClientRect();
      const presentation = roleLabelPresentation(role, { left: rect.left - bounds.left, top: rect.top - bounds.top, width: rect.width, height: rect.height });
      element.dataset.caseLabelPlacement = presentation.placement;
      if (!leader) return;
      leader.setAttribute('x2', String(presentation.x2)); leader.setAttribute('y2', String(presentation.y2));
      leader.style.visibility = !reason && presentation.leaderVisible ? 'visible' : 'hidden';
    });
    root.dataset.caseLabelReport = publish ? JSON.stringify(result.report) : '';
    root.dataset.caseLabelPublication = publish ? 'committed' : 'pending';
  };
  const invalidate = () => {
    revision++;
    if (pendingFrame) window.cancelAnimationFrame(pendingFrame);
    pendingFrame = 0; pendingKey = ''; publishedKey = '';
    if (last) apply(last, false);
    else { root.dataset.caseLabelReport = ''; root.dataset.caseLabelPublication = 'pending'; }
  };
  invalidators.set(root, invalidate);
  const publishAfterSettling = (result: ReturnType<typeof planReadableCaseLabels>, key: string) => {
    if (key === pendingKey) return;
    if (pendingFrame) window.cancelAnimationFrame(pendingFrame);
    pendingKey = key;
    const token = ++revision;
    const current = () => active && root.isConnected && revision === token && policy.isSettled();
    pendingFrame = window.requestAnimationFrame(() => {
      if (!current()) { pendingFrame = 0; pendingKey = ''; return; }
      pendingFrame = window.requestAnimationFrame(() => {
        pendingFrame = 0; pendingKey = '';
        if (!current()) return;
        // The host's acknowledgement is after its matching notice DOM commit.
        const acknowledged = policy.onReport(result.report);
        if (!current() || acknowledged !== true || result.report.status !== 'ready') return;
        apply(result, true); publishedKey = key;
      });
    });
  };
  const place = () => {
    if (!active || !root.isConnected) return;
    wrapReadableNodeLabels(nodes);
    const bounds = root.getBoundingClientRect();
    const local = (rect: DOMRect): LabelRect => ({ left: rect.left - bounds.left, top: rect.top - bounds.top, width: rect.width, height: rect.height });
    const nodeBoxes = nodes.map(element => ({ id: element.dataset.caseNodeId!, ...local(element.getBoundingClientRect()) }));
    const roleBoxes = roles.map(element => ({ id: element.dataset.caseEdgeId!, x: Number(element.dataset.caseLabelX), y: Number(element.dataset.caseLabelY),
      width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height, selected: element.dataset.selected === 'true' }));
    const credits = creditElements.filter(element => element.checkVisibility({ opacityProperty: true, visibilityProperty: true }))
      .map(element => local(element.getBoundingClientRect())).filter(rect => rect.width > 0 && rect.height > 0 && rect.left < bounds.width && right(rect) > 0 && rect.top < bounds.height && bottom(rect) > 0);
    const result = planReadableCaseLabels(nodeBoxes, roleBoxes, bounds.width, bounds.height, policy, credits);
    last = result;
    const key = JSON.stringify([result, nodeBoxes, roleBoxes, credits]);
    const settled = policy.isSettled();
    root.dataset.caseLabelPolicy = 'readable-minimum';
    root.dataset.caseLabelUnresolved = String(result.report.failures.length);
    root.dataset.caseLabelReservedCredits = String(credits.length);
    if (!settled) { invalidate(); return; }
    if (key === publishedKey) { apply(result, true); return; }
    publishedKey = ''; apply(result, false); publishAfterSettling(result, key);
  };
  place();
  const observer = window.ResizeObserver ? new window.ResizeObserver(place) : null;
  for (const element of [root, ...nodes, ...roles, ...creditElements]) observer?.observe(element);
  root.ownerDocument.fonts?.addEventListener('loadingdone', place);
  return () => {
    invalidate(); active = false;
    if (invalidators.get(root) === invalidate) invalidators.delete(root);
    observer?.disconnect(); root.ownerDocument.fonts?.removeEventListener('loadingdone', place);
  };
}
