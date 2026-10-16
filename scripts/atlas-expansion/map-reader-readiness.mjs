/** Await the user-visible exact reader selection; never retry or synthesize an input. */
export async function waitForExactReader(page, expectedId, diagnostics, timeout = 30000) {
  if (typeof expectedId !== 'string' || !expectedId.trim()) throw new TypeError('An exact selected evidence ID is required');
  if (!Number.isFinite(timeout) || timeout <= 0 || timeout > 30000) throw new RangeError('Reader readiness timeout must be bounded to 30 seconds');
  const inspect = () => page.locator('.atlas-evidence-popover').evaluateAll(nodes => nodes.map(node => ({
    id: node.getAttribute('data-selection-id'),
    visible: node.getBoundingClientRect().width > 0 && node.getBoundingClientRect().height > 0,
    heading: node.querySelector('h2')?.textContent ?? null,
  })));
  const event = { expectedId, timeoutMs: timeout, beforeWait: await inspect(), outcome: 'waiting' };
  diagnostics.push(event);
  try {
    await page.locator(`.atlas-evidence-popover[data-selection-id=${JSON.stringify(expectedId)}]`).waitFor({ state: 'visible', timeout });
    event.afterWait = await inspect();
    event.outcome = 'visible';
  } catch (error) {
    event.outcome = 'failed';
    event.error = String(error.message ?? error);
    try { event.afterWait = await inspect(); } catch { event.afterWait = null; }
    throw error;
  }
  return event;
}
