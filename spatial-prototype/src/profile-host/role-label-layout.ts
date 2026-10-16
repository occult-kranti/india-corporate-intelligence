import { wrapNodeLabels } from './node-label-width';

/** Bounded DOM-label placement. Source records, projected pins and GL are untouched. */
export interface LabelRect { left: number; top: number; width: number; height: number }
export interface RoleLabelBox { id: string; x: number; y: number; width: number; height: number; selected: boolean }
export interface RoleLabelPlacement extends RoleLabelBox { left: number; top: number; displaced: boolean; unresolved: boolean }
const GAP = 8, PAD = 4;
const right = (r: LabelRect) => r.left + r.width;
const bottom = (r: LabelRect) => r.top + r.height;
export const labelsIntersect = (a: LabelRect, b: LabelRect, gap = GAP) =>
  a.left < right(b) + gap && right(a) + gap > b.left && a.top < bottom(b) + gap && bottom(a) + gap > b.top;

/** Nearest available bounded candidate, selected role first then source order.
 * At most 8 candidates per obstacle plus two anchor candidates; never a force simulation.
 * Failure retains the full original label and reports unresolved, never drops it. */
export function placeRoleLabels(nodes: readonly LabelRect[], roles: readonly RoleLabelBox[], width: number, height: number): RoleLabelPlacement[] {
  const occupied = [...nodes], placements = new Map<string, RoleLabelPlacement>();
  for (const role of [...roles].sort((a, b) => Number(b.selected) - Number(a.selected))) {
    const origin = { left: role.x - role.width / 2, top: role.y - role.height / 2, width: role.width, height: role.height };
    const candidates: LabelRect[] = [origin, { ...origin,
      left: Math.max(PAD, Math.min(origin.left, width - role.width - PAD)),
      top: Math.max(PAD, Math.min(origin.top, height - role.height - PAD)) }];
    const add = (left: number, top: number) => candidates.push({ left, top, width: role.width, height: role.height });
    for (const obstacle of occupied) {
      const xs = [obstacle.left - role.width - GAP, right(obstacle) + GAP];
      const ys = [obstacle.top - role.height - GAP, bottom(obstacle) + GAP];
      for (const x of xs) add(x, origin.top);
      for (const y of ys) add(origin.left, y);
      for (const x of xs) for (const y of ys) add(x, y);
    }
    const bounded = candidates.filter(rect => rect.left >= PAD && rect.top >= PAD && right(rect) <= width - PAD && bottom(rect) <= height - PAD);
    bounded.sort((a, b) => Math.hypot(a.left - origin.left, a.top - origin.top) - Math.hypot(b.left - origin.left, b.top - origin.top));
    const chosen = bounded.find(rect => !occupied.some(obstacle => labelsIntersect(rect, obstacle)));
    const rect = chosen ?? origin;
    placements.set(role.id, { ...role, left: rect.left, top: rect.top,
      displaced: Math.hypot(rect.left - origin.left, rect.top - origin.top) > .5, unresolved: !chosen });
    occupied.push(rect);
  }
  return roles.map(role => placements.get(role.id)!);
}

/** Measure real font/wrapped boxes; layout effects call this before painting.
 * ResizeObserver catches later font/box changes without a polling/animation loop. */
export function observeRoleLabels(root: HTMLElement): () => void {
  const nodeElements = [...root.querySelectorAll<HTMLElement>('.cw-node-label')];
  const roleElements = [...root.querySelectorAll<HTMLElement>('.cw-role-label')];
  const leaders = new Map([...root.querySelectorAll<SVGLineElement>('[data-case-label-leader]')]
    .map(line => [line.dataset.caseLabelLeader!, line]));
  const creditElements = [...root.ownerDocument.querySelectorAll<HTMLElement>('.evidence-app .city-attribution > a,.evidence-app .maplibregl-ctrl-attrib-inner')];
  let active = true;
  const place = () => {
    if (!active || !root.isConnected) return;
    wrapNodeLabels(nodeElements);
    if (!roleElements.length) { root.dataset.caseLabelUnresolved = '0'; return; }
    const bounds = root.getBoundingClientRect();
    const nodes = nodeElements.map(element => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left - bounds.left, top: rect.top - bounds.top, width: rect.width, height: rect.height };
    });
    const roles = roleElements.map(element => {
      const rect = element.getBoundingClientRect();
      return { id: element.dataset.caseEdgeId!, x: Number(element.dataset.caseLabelX), y: Number(element.dataset.caseLabelY),
        width: rect.width, height: rect.height, selected: element.dataset.selected === 'true' };
    });
    const credits = creditElements.flatMap(element => {
      if (!element.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return [];
      const rect = element.getBoundingClientRect();
      const local = { left: rect.left - bounds.left, top: rect.top - bounds.top, width: rect.width, height: rect.height };
      return rect.width > 0 && rect.height > 0 && labelsIntersect(local, { left: 0, top: 0, width: bounds.width, height: bounds.height }, 0) ? [local] : [];
    });
    const placements = placeRoleLabels([...nodes, ...credits], roles, bounds.width, bounds.height);
    root.dataset.caseLabelReservedCredits = String(credits.length);
    root.dataset.caseLabelUnresolved = String(placements.filter(role => role.unresolved).length);
    placements.forEach((role, index) => {
      const element = roleElements[index];
      element.style.left = `${role.left + role.width / 2}px`;
      element.style.top = `${role.top + role.height / 2}px`;
      element.dataset.caseLabelPlacement = role.unresolved ? 'unresolved' : role.displaced ? 'displaced' : 'anchored';
      const leader = leaders.get(role.id);
      if (!leader) return;
      // Neutral leader, not a source relation or an arrow. It ends at the plaque edge.
      const centerX = role.left + role.width / 2, centerY = role.top + role.height / 2;
      const dx = role.x - centerX, dy = role.y - centerY;
      const scale = Math.min(role.width / 2 / Math.max(Math.abs(dx), .001), role.height / 2 / Math.max(Math.abs(dy), .001), 1);
      leader.setAttribute('x2', String(centerX + dx * scale));
      leader.setAttribute('y2', String(centerY + dy * scale));
      leader.style.visibility = role.displaced ? 'visible' : 'hidden';
    });
  };
  place();
  const Observer = root.ownerDocument.defaultView?.ResizeObserver;
  const observer = Observer ? new Observer(place) : null;
  for (const element of [root, ...nodeElements, ...roleElements, ...creditElements]) observer?.observe(element);
  const fonts = root.ownerDocument.fonts;
  fonts?.addEventListener('loadingdone', place);
  return () => { active = false; observer?.disconnect(); fonts?.removeEventListener('loadingdone', place); };
}
