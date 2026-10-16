/** Screen-space wrapping only. Never move pins, alter text, or repack the case model. */
export interface ProjectedLabelPoint { id: string; x: number; y: number; width: number }
export const NODE_LABEL_GAP = 8;

/** Share same-row space only when measured natural plaques would touch. A short
 * neighbor keeps its natural width; an already separated long name is unchanged.
 * Existing controls preserve axis alignment. Rotated boards and insufficient
 * vertical room require separate browser acceptance, not silent label dropping. */
export function nodeLabelWidths(nodes: readonly ProjectedLabelPoint[]): Map<string, number> {
  const widths = new Map(nodes.map(node => [node.id, node.width]));
  for (let i = 0; i < nodes.length; i++) for (const other of nodes.slice(i + 1)) {
    const node = nodes[i], distance = Math.abs(other.x - node.x);
    if (Math.abs(other.y - node.y) > .5 || distance <= .5) continue;
    const a = widths.get(node.id)!, b = widths.get(other.id)!, room = Math.max(2, 2 * (distance - NODE_LABEL_GAP));
    if (a + b <= room) continue;
    const nextA = Math.min(a, Math.max(room / 2, room - b));
    widths.set(node.id, nextA); widths.set(other.id, Math.min(b, room - nextA));
  }
  return widths;
}

/** Read natural widths first, then wrap once. Final widths depend only on anchor
 * data and natural font metrics, never on the previous positioned/wrapped result. */
export function wrapNodeLabels(elements: readonly HTMLElement[]): void {
  for (const element of elements) element.style.maxWidth = '';
  const nodes = elements.map(element => ({ id: element.dataset.caseNodeId!, x: Number(element.dataset.caseLabelX),
    y: Number(element.dataset.caseLabelY), width: element.getBoundingClientRect().width }));
  const widths = nodeLabelWidths(nodes);
  elements.forEach((element, index) => {
    const node = nodes[index], width = widths.get(node.id)!;
    element.style.maxWidth = width < node.width - .25 ? `${width}px` : '';
    element.dataset.caseLabelNaturalWidth = String(node.width);
    element.dataset.caseLabelWidth = width < node.width - .25 ? 'wrapped' : 'natural';
  });
}

export function observeNodeLabels(root: HTMLElement): () => void {
  const elements = [...root.querySelectorAll<HTMLElement>('.cw-node-label')];
  let active = true;
  const wrap = () => { if (active && root.isConnected) wrapNodeLabels(elements); };
  wrap();
  const Observer = root.ownerDocument.defaultView?.ResizeObserver;
  const observer = Observer ? new Observer(wrap) : null;
  for (const element of [root, ...elements]) observer?.observe(element);
  const fonts = root.ownerDocument.fonts;
  fonts?.addEventListener('loadingdone', wrap);
  return () => { active = false; observer?.disconnect(); fonts?.removeEventListener('loadingdone', wrap); };
}
