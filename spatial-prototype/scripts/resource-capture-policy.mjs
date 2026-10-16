/** CI evidence policy only. No application code or native observation is changed. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RESOURCE_CAPTURE_SCENARIO = '46-thirty-cycle-native-resource-handle-plateau';
export const RESOURCE_CAPTURE_PHASES = Object.freeze(['warmed-baseline', 'cycle-1-before-close', 'cycle-1-closed', 'cycle-15-before-close', 'cycle-15-closed', 'cycle-30-before-close', 'cycle-30-closed', 'timing-active', 'timing-closed']);
export const DOM_STYLE_PROPERTIES = Object.freeze(['display', 'visibility', 'position', 'color', 'background-color', 'font-family', 'font-size', 'line-height', 'white-space', 'overflow', 'z-index', 'transform']);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export const RESOURCE_EVIDENCE_OPERATION_TIMEOUT_MS = 15000;
export async function boundedResourceEvidence(label, action, timeoutMs = RESOURCE_EVIDENCE_OPERATION_TIMEOUT_MS) {
  assert.ok(Number.isSafeInteger(timeoutMs) && timeoutMs > 0 && timeoutMs <= RESOURCE_EVIDENCE_OPERATION_TIMEOUT_MS);
  let deadline;
  try { return await Promise.race([Promise.resolve().then(action), new Promise((_, reject) => {
    deadline = setTimeout(() => reject(new Error(`${label} exceeded ${timeoutMs} ms evidence deadline`)), timeoutMs);
  })]); } finally { clearTimeout(deadline); }
}

export function assertResourceBudget(elapsedMs, budgetMs) {
  assert.equal(budgetMs, 300000, 'Scenario46 resource budget must remain 300000 ms');
  assert.ok(Number.isFinite(elapsedMs) && elapsedMs >= 0 && elapsedMs <= budgetMs, `Resource work completed outside its ${budgetMs} ms deadline: ${elapsedMs} ms`);
}
export function traceOptionsForScenario(name) {
  return { screenshots: name !== RESOURCE_CAPTURE_SCENARIO, snapshots: name !== RESOURCE_CAPTURE_SCENARIO, sources: true };
}
export async function startResourceCapture(context, name, output, result) {
  if (name !== RESOURCE_CAPTURE_SCENARIO) return;
  result.resourceCapture = {
    version: 2, scenario: name, traceOptions: traceOptionsForScenario(name), status: 'recording', startedAt: new Date().toISOString(),
    trace: `${name}.trace.zip`, har: `${name}.network.har.zip`, checkpoints: [], networkEvents: [], webSockets: [],
    limitations: [
      'Only scenario 46 omits automatic per-action DOM snapshots and automatic screenshot streaming. Action timing, console and action source files remain enabled; the nine explicit checkpoint PNGs and full final/failure PNG remain mandatory.',
      'Closed author shadow-root live state is rejected rather than silently omitted. User-agent control internals remain in CDP with exposed form state; arbitrary internal CSS/focus replay is not claimed.',
      'Nine explicit Chromium DOM snapshots plus failure/final evidence have lower temporal granularity than per-action replay. HTML and screenshots do not reconstruct every intermediate DOM state.',
      'The standalone full HAR contains request/response headers, timings and attached bodies. It is separate network evidence; Trace Viewer network linkage and trace-specific frame/monotonic metadata are not equivalent.',
      'Native full/compact pairs are captured together before DOM evidence; DOM, dynamic state and screenshots are sequential observations with explicit clocks.',
    ],
  };
  await boundedResourceEvidence('HAR start', () => context.tracing.startHar(join(output, result.resourceCapture.har), { mode: 'full', content: 'attach' }));
  result.resourceCapture.harStartedAt = new Date().toISOString();
}
export function observeResourceNetwork(page, result) {
  if (!result.resourceCapture) return;
  const events = result.resourceCapture.networkEvents;
  const ids = new WeakMap(); let sequence = 0;
  const id = request => { if (!ids.has(request)) ids.set(request, ++sequence); return ids.get(request); };
  const basic = (type, request) => ({ type, id: id(request), at: new Date().toISOString(), url: request.url(), method: request.method(), resourceType: request.resourceType(), frameUrl: (() => { try { return request.frame().url(); } catch { return null; } })() });
  page.on('request', request => events.push({ ...basic('request', request), redirectedFrom: request.redirectedFrom() ? id(request.redirectedFrom()) : null }));
  page.on('response', response => events.push({ ...basic('response', response.request()), status: response.status() }));
  page.on('requestfinished', request => events.push({ ...basic('finished', request), timing: request.timing() }));
  page.on('requestfailed', request => events.push({ ...basic('failed', request), error: request.failure()?.errorText ?? null, timing: request.timing() }));
  page.on('websocket', socket => {
    const entry = { url: socket.url(), openedAt: new Date().toISOString(), frames: [], errors: [] };
    result.resourceCapture.webSockets.push(entry);
    for (const event of ['framesent', 'framereceived']) socket.on(event, ({ payload }) => entry.frames.push({ event, at: new Date().toISOString(), encoding: typeof payload === 'string' ? 'text' : 'base64', payload: typeof payload === 'string' ? payload : payload.toString('base64') }));
    socket.on('socketerror', error => entry.errors.push(String(error)));
    socket.on('close', () => { entry.closedAt = new Date().toISOString(); });
  });
}

/** Read-only companion to CDP DOMSnapshot: live form/focus/scroll/CSSOM/source state. */
export function readCheckpointDocumentState() {
  const describe = element => element ? { tag: element.tagName, id: element.id, attributes: Object.fromEntries([...element.attributes].map(attribute => [attribute.name, attribute.value])), text: element.textContent, rect: element.getBoundingClientRect().toJSON() } : null;
  const roots = [document], controls = [], scroll = [], shadowHosts = [], sheets = [];
  let active = document.activeElement; const focus = [];
  while (active) { focus.push(describe(active)); active = active.shadowRoot?.activeElement ?? null; }
  for (let index = 0; index < roots.length; index++) {
    const root = roots[index];
    for (const element of root.querySelectorAll('*')) {
      if (element.shadowRoot) { shadowHosts.push(describe(element)); roots.push(element.shadowRoot); }
      if (element.matches('input,textarea,select,option,details,dialog')) controls.push({ ...describe(element), value: 'value' in element ? element.value : null, checked: 'checked' in element ? element.checked : null, selected: 'selected' in element ? element.selected : null, open: 'open' in element ? element.open : null, modal: element.matches('dialog') ? element.matches(':modal') : null, selectionStart: typeof element.selectionStart === 'number' ? element.selectionStart : null, selectionEnd: typeof element.selectionEnd === 'number' ? element.selectionEnd : null });
      if (element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight || element.scrollTop || element.scrollLeft) scroll.push({ ...describe(element), top: element.scrollTop, left: element.scrollLeft, width: element.scrollWidth, height: element.scrollHeight, clientWidth: element.clientWidth, clientHeight: element.clientHeight });
    }
    for (const sheet of [...(root.styleSheets ?? []), ...(root.adoptedStyleSheets ?? [])]) {
      let rules = null, accessError = null;
      try { rules = [...sheet.cssRules].map(rule => rule.cssText); } catch (error) { accessError = String(error); }
      sheets.push({ href: sheet.href, disabled: sheet.disabled, rules, accessError });
    }
  }
  return { url: location.href, clock: { epochMs: Date.now(), performanceMs: performance.now(), timeOrigin: performance.timeOrigin },
    viewport: { width: innerWidth, height: innerHeight, scrollX, scrollY, devicePixelRatio },
    documentHasFocus: document.hasFocus(), focus, controls, scroll, shadowHosts, sheets,
    workspace: describe(document.querySelector('[data-case-workspace]')),
    sourceDialogs: [...document.querySelectorAll('dialog')].map(describe),
    links: [...document.querySelectorAll('a[href]')].map(element => ({ href: element.href, text: element.textContent, attributes: Object.fromEntries([...element.attributes].map(attribute => [attribute.name, attribute.value])) })),
    selection: getSelection()?.toString() ?? '', html: document.documentElement.outerHTML };
}
export function assertDOMFrameCoverage(snapshot, frames) {
  assert.ok(snapshot && Array.isArray(snapshot.documents) && snapshot.documents.length > 0 && Array.isArray(snapshot.strings), 'DOM snapshot lacks complete document/string arrays');
  const available = new Map();
  for (const document of snapshot.documents) {
    assert.ok(document.nodes && Array.isArray(document.nodes.nodeType) && document.nodes.nodeType.length > 0, 'DOM snapshot document is empty');
    assert.ok(!(document.nodes.shadowRootType?.value ?? []).some(value => snapshot.strings[value] === 'closed'), 'Closed author shadow-root live state is unsupported by this checkpoint capture');
    const url = snapshot.strings[document.documentURL]; available.set(url, (available.get(url) ?? 0) + 1);
  }
  for (const frame of frames) {
    assert.ok((available.get(frame.url) ?? 0) > 0, `DOM snapshot omitted frame ${frame.url}`);
    available.set(frame.url, available.get(frame.url) - 1);
  }
}
export async function captureResourceCheckpoint(page, output, result, phase, nativeEntry = null) {
  if (result.name !== RESOURCE_CAPTURE_SCENARIO) return;
  assert.ok(RESOURCE_CAPTURE_PHASES.includes(phase) || ['failure', 'final'].includes(phase), 'Unknown resource evidence phase');
  assert.ok(result.resourceCapture, 'Resource capture did not start before navigation');
  const entry = { phase, status: 'pending', startedAt: new Date().toISOString(), nativeSequence: nativeEntry?.sequence ?? null,
    nativeFull: nativeEntry?.rawEvidence ?? result.caseGraphics?.evidence ?? null, nativeCompact: nativeEntry?.compactEvidence ?? null,
    order: ['native pair already captured', 'CDP DOM snapshot', 'per-frame dynamic state', 'viewport PNG'], files: [] };
  result.resourceCapture.checkpoints.push(entry);
  const stem = `${RESOURCE_CAPTURE_SCENARIO}--${phase}.checkpoint`;
  let session;
  const save = async (suffix, bytes) => {
    const path = `${stem}.${suffix}`; await writeFile(join(output, path), bytes);
    entry.files.push({ path, bytes: Buffer.byteLength(bytes), sha256: sha256(bytes) });
  };
  try {
    session = await boundedResourceEvidence('Checkpoint CDP attach', () => page.context().newCDPSession(page));
    const snapshot = await boundedResourceEvidence('Checkpoint DOM snapshot', () => session.send('DOMSnapshot.captureSnapshot', { computedStyles: [...DOM_STYLE_PROPERTIES], includePaintOrder: true, includeDOMRects: true }));
    await save('dom.json', JSON.stringify(snapshot) + '\n');
    const frames = [];
    for (const frame of page.frames()) frames.push({ url: frame.url(), name: frame.name(), parentUrl: frame.parentFrame()?.url() ?? null, state: await boundedResourceEvidence('Checkpoint dynamic frame state', () => frame.evaluate(readCheckpointDocumentState)) });
    await save('state.json', JSON.stringify({ frames, computedStyles: DOM_STYLE_PROPERTIES, label: 'CDP full document/shadow trees and explicit live state; sequential, not a Playwright replay snapshot' }) + '\n');
    assertDOMFrameCoverage(snapshot, frames);
    const screenshot = await boundedResourceEvidence('Checkpoint screenshot', () => page.screenshot({ fullPage: false }));
    await save('png', screenshot);
    entry.status = 'passed'; entry.frameCount = frames.length;
  } catch (error) { entry.status = 'failed'; entry.error = error.stack ?? String(error); throw error; }
  finally {
    entry.completedAt = new Date().toISOString();
    let detachError;
    if (session) { try { await boundedResourceEvidence('Checkpoint CDP detach', () => session.detach()); } catch (error) { detachError = error; entry.status = 'failed'; entry.detachError = String(error); } }
    await writeFile(join(output, `${stem}.manifest.json`), JSON.stringify(entry, null, 2) + '\n');
    if (detachError) throw detachError;
  }
  return entry;
}
export function assertResourceCheckpointCoverage(result) {
  const rows = result.resourceCapture?.checkpoints.filter(row => RESOURCE_CAPTURE_PHASES.includes(row.phase));
  assert.deepEqual(rows?.map(row => row.phase), RESOURCE_CAPTURE_PHASES, 'Nine ordered resource evidence checkpoints are required');
  for (const row of rows) {
    assert.equal(row.status, 'passed', `Resource evidence failed: ${row.phase}`);
    assert.ok(Number.isInteger(row.nativeSequence) && row.nativeFull && row.nativeCompact, 'Checkpoint lost native pair correlation');
    assert.equal(row.files.length, 3, 'Checkpoint must retain full DOM, dynamic state and pixels');
  }
}
export async function stopResourceCapture(context, output, result) {
  if (!result.resourceCapture) return;
  const data = result.resourceCapture;
  // Export before closing the context, on both success and failure.
  const eventsPath = `${RESOURCE_CAPTURE_SCENARIO}.network-events.json`;
  data.networkEventsBeforeExport = `${RESOURCE_CAPTURE_SCENARIO}.network-events-before-export.json`;
  await writeFile(join(output, data.networkEventsBeforeExport), JSON.stringify({ events: data.networkEvents, webSockets: data.webSockets }, null, 2) + '\n');
  await boundedResourceEvidence('HAR stop/export', () => context.tracing.stopHar()); data.harStoppedAt = new Date().toISOString();
  await writeFile(join(output, eventsPath), JSON.stringify({ events: data.networkEvents, webSockets: data.webSockets }, null, 2) + '\n');
  const validator = join(dirname(fileURLToPath(import.meta.url)), 'validate-resource-har.py');
  const verification = JSON.parse(execFileSync('python3', [validator, join(output, data.har), join(output, eventsPath)], { encoding: 'utf8', maxBuffer: 1024 * 1024, timeout: RESOURCE_EVIDENCE_OPERATION_TIMEOUT_MS }));
  data.networkVerification = verification; data.networkEventsFile = eventsPath;
  data.harSha256 = sha256(await readFile(join(output, data.har))); data.status = 'preserved';
  if (result.status === 'passed') assertResourceCheckpointCoverage(result);
  const terminal = data.checkpoints.filter(row => ['failure', 'final'].includes(row.phase));
  assert.equal(terminal.length, 1, 'Exactly one terminal DOM/source/focus capture is required');
  assert.equal(terminal[0].status, 'passed', 'Terminal resource evidence capture failed');
}
