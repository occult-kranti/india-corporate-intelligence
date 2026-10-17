/** Observe native scrolling before a test changes its fixture. This helper never
 * scrolls, focuses, dispatches input, or changes the application. Inject as a
 * standalone function so the browser and portable event fixtures share logic. */
export function beginReaderScrollSettlement(element, { timeoutMs = 5000, stableFrames = 2 } = {}) {
  const view = element.ownerDocument.defaultView;
  const startedAt = view.performance.now();
  const samples = [];
  let frame = null, timer = null, finished = false, seenScroll = false;
  const initialTop = element.scrollTop;
  let inputAt = null, lastScrollAt = null, scrollEndAt = null, stable = 0, lastTop = initialTop;
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  // The driver issues PageDown before awaiting this observation.
  promise.catch(() => {});
  const sample = type => {
    const row = { type, at: view.performance.now(), scrollTop: element.scrollTop,
      focused: element.ownerDocument.activeElement === element, connected: element.isConnected };
    samples.push(row); return row;
  };
  const snapshot = () => ({ startedAt, finishedAt: view.performance.now(), inputAt, initialTop, seenScroll, lastScrollAt,
    scrollEndAt, stableFrames: stable, samples: samples.map(row => ({ ...row })) });
  const cleanup = () => {
    element.removeEventListener('scroll', onScroll);
    element.removeEventListener('scrollend', onScrollEnd);
    element.removeEventListener('keydown', onInput);
    if (frame !== null) view.cancelAnimationFrame(frame);
    if (timer !== null) view.clearTimeout(timer);
  };
  const finish = error => {
    if (finished) return;
    finished = true; cleanup();
    if (error) reject(Object.assign(new Error(error), { observation: snapshot() }));
    else resolve(snapshot());
  };
  const onInput = event => {
    if (event.key === 'PageDown' && !event.ctrlKey && !event.metaKey && !event.altKey && element.ownerDocument.activeElement === element)
      inputAt = sample('native-page-down').at;
  };
  const onScroll = () => {
    const row = sample('scroll');
    if (inputAt === null || (!seenScroll && row.scrollTop === initialTop)) return;
    seenScroll = true; lastScrollAt = row.at; scrollEndAt = null; stable = 0;
  };
  const onScrollEnd = () => {
    const row = sample('scrollend');
    if (seenScroll) { scrollEndAt = row.at; lastTop = row.scrollTop; stable = 0; }
  };
  const tick = () => {
    if (finished) return;
    if (!element.isConnected) { sample('detached'); finish('Reader detached before native scrolling settled'); return; }
    if (scrollEndAt !== null) {
      const row = sample('after-scrollend-frame');
      if (row.scrollTop !== lastTop) { scrollEndAt = null; stable = 0; }
      else if (++stable >= stableFrames) { finish(); return; }
      lastTop = row.scrollTop;
    }
    frame = view.requestAnimationFrame(tick);
  };
  sample('before-input');
  element.addEventListener('scroll', onScroll);
  element.addEventListener('scrollend', onScrollEnd);
  element.addEventListener('keydown', onInput);
  timer = view.setTimeout(() => { sample('timeout'); finish('Native reader scrollend and stable frames were not observed before the deadline'); }, timeoutMs);
  frame = view.requestAnimationFrame(tick);
  return { promise, snapshot, cancel: () => finish('Native reader scroll observation canceled') };
}
