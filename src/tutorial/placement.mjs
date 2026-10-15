/** Shared, dependency-free geometry. Static help receives these same functions
 * through sync-static.mjs, including in standalone offline exports. */
export function getTutorialPlacement(anchor, popup, viewport, options = {}) {
  const gap = options.gap ?? 20;
  const padding = options.padding ?? 16;
  const left = (viewport.left ?? 0) + padding;
  const top = (viewport.top ?? 0) + padding;
  const right = (viewport.left ?? 0) + viewport.width - padding;
  const bottom = (viewport.top ?? 0) + viewport.height - padding;
  const width = Math.max(1, Math.min(popup.width, right - left));
  const height = Math.max(1, Math.min(popup.height, bottom - top));
  const clamp = (value, min, max) => Math.max(min, Math.min(value, max));
  const centered = { left: left + ((right - left) - width) / 2, top: top + ((bottom - top) - height) / 2, width, maxHeight: height, side: 'center' };
  if (!anchor || anchor.right <= left || anchor.left >= right || anchor.bottom <= top || anchor.top >= bottom) return centered;

  // Test all four sides before reducing the reading plane. Align its leading
  // edge with the control, then clamp only along the perpendicular axis.
  const regions = [
    { side: 'right', left: Math.max(left, anchor.right + gap), top, right, bottom },
    { side: 'left', left, top, right: Math.min(right, anchor.left - gap), bottom },
    { side: 'bottom', left, top: Math.max(top, anchor.bottom + gap), right, bottom },
    { side: 'top', left, top, right, bottom: Math.min(bottom, anchor.top - gap) },
  ];
  const place = (region, w, h) => ({
    left: region.side === 'left' ? region.right - w : region.side === 'right' ? region.left : clamp(anchor.left, region.left, region.right - w),
    top: region.side === 'top' ? region.bottom - h : region.side === 'bottom' ? region.top : clamp(anchor.top, region.top, region.bottom - h),
    width: w, maxHeight: h, side: region.side,
  });
  for (const region of regions) if (region.right - region.left >= width && region.bottom - region.top >= height) return place(region, width, height);

  // Small windows can keep the anchor exposed by scrolling the body of a
  // shorter dialog. Preserve enough room for its heading, actions and text.
  const minWidth = Math.min(width, 320);
  const minHeight = Math.min(height, options.minHeight ?? 260);
  const compact = regions.map(region => ({ region, width: Math.min(width, region.right - region.left), height: Math.min(height, region.bottom - region.top) }))
    .filter(item => item.width >= minWidth && item.height >= minHeight)
    .sort((a, b) => b.width * b.height - a.width * a.height);
  if (compact.length) return place(compact[0].region, compact[0].width, compact[0].height);

  // A panel-sized target can occupy the entire viewport. Preserve its heading
  // or label band when there is no room outside the whole panel. Do not pretend
  // that the entire highlighted panel is visible in this fallback.
  const labelBottom = Math.min(anchor.bottom, Math.max(top, anchor.top) + 48);
  const belowLabel = { side: 'bottom', left, top: labelBottom + gap, right, bottom };
  if (belowLabel.bottom - belowLabel.top >= minHeight) return { ...place(belowLabel, width, Math.min(height, belowLabel.bottom - belowLabel.top)), side: 'label' };
  return { ...centered, side: 'fallback' };
}

/** Measured native-dialog placement, with all observers/listeners scoped to an
 * open tour. No focus, history, animation, research or storage side effects. */
export function watchTutorialPosition(dialog, resolveTarget, getPlacement) {
  const win = dialog.ownerDocument.defaultView;
  let stopped = false, frame = 0, observedTarget = null;
  const properties = ['left', 'top', 'right', 'bottom', 'margin', 'width', 'max-height'];
  const previous = properties.map(name => [name, dialog.style.getPropertyValue(name)]);
  const schedule = () => { if (!stopped && !frame) frame = win.requestAnimationFrame(() => { frame = 0; update(); }); };
  const resize = typeof win.ResizeObserver === 'function' ? new win.ResizeObserver(schedule) : null;
  function update() {
    if (stopped || !dialog.open) return;
    const vv = win.visualViewport;
    const viewport = { left: vv?.offsetLeft ?? 0, top: vv?.offsetTop ?? 0, width: vv?.width ?? win.innerWidth, height: vv?.height ?? win.innerHeight };
    const target = resolveTarget();
    if (target !== observedTarget) { if (observedTarget) resize?.unobserve(observedTarget); observedTarget = target; if (target) resize?.observe(target); }
    // Measure at the normal reading width before choosing a side. Re-measure
    // after narrowing because wrapping changes the dialog's required height.
    const width = Math.max(1, Math.min(480, viewport.width - 32));
    dialog.style.width = `${width}px`;
    dialog.style.maxHeight = `${Math.max(1, viewport.height - 32)}px`;
    const measured = dialog.getBoundingClientRect();
    const anchor = target?.getBoundingClientRect() ?? null;
    const header = dialog.querySelector('header')?.getBoundingClientRect().height ?? 0;
    const footer = dialog.querySelector('footer')?.getBoundingClientRect().height ?? 0;
    const options = { minHeight: Math.max(260, header + footer + 80) };
    let placement = getPlacement(anchor, { width, height: measured.height }, viewport, options);
    if (placement.width < width) {
      dialog.style.width = `${placement.width}px`;
      placement = getPlacement(anchor, { width: placement.width, height: dialog.getBoundingClientRect().height }, viewport, options);
    }
    dialog.style.left = `${placement.left}px`;
    dialog.style.top = `${placement.top}px`;
    dialog.style.right = 'auto'; dialog.style.bottom = 'auto'; dialog.style.margin = '0';
    dialog.style.width = `${placement.width}px`; dialog.style.maxHeight = `${placement.maxHeight}px`;
    dialog.dataset.placement = placement.side;
  }
  const mutations = new win.MutationObserver(schedule);
  mutations.observe(dialog.ownerDocument.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['open', 'hidden'] });
  resize?.observe(dialog);
  win.addEventListener('resize', schedule);
  win.addEventListener('scroll', schedule, true);
  win.visualViewport?.addEventListener('resize', schedule);
  win.visualViewport?.addEventListener('scroll', schedule);
  dialog.ownerDocument.fonts?.ready.then(() => { if (!stopped) schedule(); });
  update();
  return { update, stop() {
    stopped = true; win.cancelAnimationFrame(frame); resize?.disconnect(); mutations.disconnect();
    win.removeEventListener('resize', schedule); win.removeEventListener('scroll', schedule, true);
    win.visualViewport?.removeEventListener('resize', schedule); win.visualViewport?.removeEventListener('scroll', schedule);
    for (const [name, value] of previous) { if (value) dialog.style.setProperty(name, value); else dialog.style.removeProperty(name); }
    delete dialog.dataset.placement;
  } };
}
