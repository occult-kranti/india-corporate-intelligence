/** Portable capture contracts only. No browser, CDP connection or WebGL is started. */
import test from 'node:test';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { RESOURCE_CAPTURE_SCENARIO, RESOURCE_CAPTURE_PHASES, DOM_STYLE_PROPERTIES, traceOptionsForScenario, startResourceCapture, observeResourceNetwork, assertDOMFrameCoverage, captureResourceCheckpoint, assertResourceCheckpointCoverage, stopResourceCapture, boundedResourceEvidence, readCheckpointDocumentState, assertResourceBudget } from './resource-capture-policy.mjs';
import { GRAPHICS_SCENARIOS } from './case-graphics-browser.mjs';
const here = dirname(fileURLToPath(import.meta.url));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const main = await readFile(join(here, 'browser-review.mjs'), 'utf8');
const graphics = await readFile(join(here, 'case-graphics-browser.mjs'), 'utf8');
const helper = await readFile(join(here, 'resource-capture-policy.mjs'), 'utf8');

test('only exact scenario46 omits automatic DOM and screenshot streaming; sources stay enabled', () => {
  assert.deepEqual(traceOptionsForScenario(RESOURCE_CAPTURE_SCENARIO), { screenshots: false, snapshots: false, sources: true });
  for (const name of [...GRAPHICS_SCENARIOS.filter(row => row !== RESOURCE_CAPTURE_SCENARIO), '', undefined, null, '46', RESOURCE_CAPTURE_SCENARIO + '-other'])
    assert.deepEqual(traceOptionsForScenario(name), { screenshots: true, snapshots: true, sources: true });
  assert.ok(Object.isFrozen(RESOURCE_CAPTURE_PHASES)); assert.equal(RESOURCE_CAPTURE_PHASES.length, 9);
});
test('full standalone HAR starts before page/navigation without filtering or body omission', async () => {
  const calls = [], result = { name: RESOURCE_CAPTURE_SCENARIO };
  await startResourceCapture({ tracing: { startHar: async (...args) => calls.push(args) } }, RESOURCE_CAPTURE_SCENARIO, '/evidence', result);
  assert.deepEqual(calls, [[`/evidence/${RESOURCE_CAPTURE_SCENARIO}.network.har.zip`, { mode: 'full', content: 'attach' }]]);
  assert.equal(result.resourceCapture.checkpoints.length, 0);
  await startResourceCapture({ tracing: { startHar: () => { throw Error('other scenario started HAR'); } } }, '40-other', '/evidence', {});
  const start = main.indexOf('await startResourceCapture(context, name, output, result)');
  assert.ok(start < main.indexOf('await context.tracing.start(traceOptionsForScenario(name))') && start < main.indexOf('page = await context.newPage()'));
  assert.ok(main.indexOf('observeResourceNetwork(page, result)') < main.indexOf('const response = await page.goto(', start));
});
test('original full-review/native assertions and actions remain byte conserved after exact capture, readiness and pair-transport deltas', () => {
  const start = main.indexOf('  await scenario("01-overview-and-source-trail"');
  const last = '  await runCaseGraphicsBrowserCases(caseReviewContext);';
  const end = main.indexOf(last, start) + last.length;
  assert.equal(sha(main.slice(start, end)), '0d5c51e6ec41602929676e316db19756407dd007c48d1e86e7511d563955dcda');
  const nativeStart = graphics.indexOf('  await run(GRAPHICS_SCENARIOS[7]');
  const nativeEnd = graphics.indexOf('  coverage.scenarios', nativeStart);
  let conserved = graphics.slice(nativeStart, nativeEnd)
    .replace('      await captureResourceCheckpoint(page, output, result, phase, entry);\n', '')
    .replace('    assertResourceCheckpointCoverage(result);\n', '');
  // Reverse the exact reviewed lossless transport expression, preserving the original body pin.
  const pairTransport = 'const pair = JSON.parse(await page.evaluate(() => window.__caseGraphicsProbe.readLifecyclePairJSON()));';
  const originalPair = "const pair = await page.evaluate(() => ({ active: document.querySelector('.webgl-host')?.dataset.geographicWorkspaceActive,\n        workspaceCount: document.querySelectorAll('[data-case-workspace]').length, ...window.__caseGraphicsProbe.readLifecyclePair() }));";
  assert.equal(conserved.split(pairTransport).length, 2);
  conserved = conserved.replace(pairTransport, originalPair);
  // Reverse only the exact reviewed readiness additions; keep the original body hash.
  const selectedReadiness = [
    "      const selectionBaseline = await page.evaluate(() => window.__caseGraphicsProbe.frameIdentity());\n",
    "      assert.ok(selectionBaseline, 'Selection needs a native current-canvas baseline before input');\n",
    "      await edgeButton(page, dense.edges[0].id).click();\n",
    "      await assertCaseFrame(page, dense, until, result, `${warmup ? 'warmup' : 'cycle'}-${number}-selection`, null, null,\n",
    "        { expectedSelection: dense.edges[0].id, afterNative: selectionBaseline });\n",
  ].join('');
  const reentryReadiness = [
    "      const reentryBaseline = await page.evaluate(() => window.__caseGraphicsProbe.frameIdentity());\n",
    "      assert.ok(reentryBaseline, 'Re-entry needs a native current-canvas baseline before input');\n",
    "      await showCompleteCaseReader(page, until); await showCaseScene(page, until);\n",
    "      await assertCaseFrame(page, dense, until, result, `${warmup ? 'warmup' : 'cycle'}-${number}-reentry`, null, null,\n",
    "        { expectedSelection: dense.edges[0].id, afterNative: reentryBaseline });\n",
  ].join('');
  assert.equal(conserved.split(selectedReadiness).length, 2);
  assert.equal(conserved.split(reentryReadiness).length, 2);
  conserved = conserved.replace(selectedReadiness, "      await edgeButton(page, dense.edges[0].id).click(); await assertCaseFrame(page, dense, until);\n")
    .replace(reentryReadiness, "      await showCompleteCaseReader(page, until); await showCaseScene(page, until); await assertCaseFrame(page, dense, until);\n");
  assert.equal(sha(conserved), 'c4689854c0bde8b5d7160984c53d78d511ddebe41582c74811b5a791c86c7fde');
  assert.match(conserved, /budgetMs: 300000/); assert.match(conserved, /frames\(120, true\)/);
  assert.equal(graphics.split(pairTransport).length, 2);
  assert.ok(conserved.includes(originalPair));
  assert.ok(graphics.indexOf('await captureResourceCheckpoint(page, output, result, phase, entry)') > graphics.indexOf('Object.assign(entry, comparison'));
  assert.doesNotMatch(helper, /readLifecyclePair|compactLifecycleObservation|JSON\.parse\(await page\.evaluate/);
});
function validRows() { return RESOURCE_CAPTURE_PHASES.map((phase, index) => ({ phase, status: 'passed', nativeSequence: index + 1, nativeFull: 'full.json', nativeCompact: 'compact.json', files: [{}, {}, {}] })); }
test('nine ordered checkpoints fail closed on one missing, duplicate, failed or uncorrelated observation', () => {
  assert.doesNotThrow(() => assertResourceCheckpointCoverage({ resourceCapture: { checkpoints: validRows() } }));
  for (const change of [rows => rows.pop(), rows => { rows[2] = rows[1]; }, rows => { rows[3].status = 'failed'; }, rows => { rows[4].nativeCompact = null; }, rows => { rows[5].nativeSequence = null; }, rows => { rows[6].files.pop(); }]) {
    const rows = validRows(); change(rows); assert.throws(() => assertResourceCheckpointCoverage({ resourceCapture: { checkpoints: rows } }));
  }
});
test('DOM snapshot document coverage includes frame multiplicity and fails on missing/OOPIF data', () => {
  const snapshot = { strings: ['https://site/', 'https://child/'], documents: [{ documentURL: 0, nodes: { nodeType: [9, 1] } }, { documentURL: 1, nodes: { nodeType: [9, 1] } }] };
  assert.doesNotThrow(() => assertDOMFrameCoverage(snapshot, [{ url: 'https://site/' }, { url: 'https://child/' }]));
  assert.throws(() => assertDOMFrameCoverage(snapshot, [{ url: 'https://missing/' }]));
  assert.throws(() => assertDOMFrameCoverage(snapshot, [{ url: 'https://site/' }, { url: 'https://site/' }]));
  assert.throws(() => assertDOMFrameCoverage({ strings: [], documents: [] }, []));
});
async function mockCapture(t, failure = null) {
  const directory = await mkdtemp(join(tmpdir(), 'resource-capture-contract-')); t.after(() => rm(directory, { recursive: true, force: true }));
  const calls = [], session = { send: async (method, options) => { calls.push({ method, options }); if (failure === 'cdp') throw Error('mock CDP failed'); return { strings: ['https://site/'], documents: [{ documentURL: 0, nodes: { nodeType: [9, 1] } }] }; }, detach: async () => calls.push('detached') };
  const page = { context: () => ({ newCDPSession: async () => session }), frames: () => [{ url: () => 'https://site/', name: () => '', parentFrame: () => null, evaluate: async fn => { assert.match(fn.toString(), /document\.activeElement/); return { html: '<html>Exact source & qualifier</html>', focus: [{ id: 'selected' }], links: [{ href: 'https://source/' }] }; } }], screenshot: async () => { if (failure === 'png') throw Error('mock PNG failed'); return Buffer.from('mock pixels'); } };
  const result = { name: RESOURCE_CAPTURE_SCENARIO, resourceCapture: { checkpoints: [] } };
  return { directory, calls, page, result };
}
test('checkpoint retains exact native correlation, full CDP payload, dynamic state and pixels with hashes', async t => {
  const { directory, calls, page, result } = await mockCapture(t);
  const entry = await captureResourceCheckpoint(page, directory, result, 'warmed-baseline', { sequence: 700, rawEvidence: 'raw.json', compactEvidence: 'compact.json' });
  assert.equal(entry.status, 'passed'); assert.equal(entry.nativeSequence, 700); assert.equal(entry.frameCount, 1);
  assert.equal(calls[0].method, 'DOMSnapshot.captureSnapshot'); assert.deepEqual(calls[0].options, { computedStyles: [...DOM_STYLE_PROPERTIES], includePaintOrder: true, includeDOMRects: true }); assert.equal(calls.at(-1), 'detached');
  for (const file of entry.files) { const bytes = await readFile(join(directory, file.path)); assert.equal(bytes.length, file.bytes); assert.equal(sha(bytes), file.sha256); }
  const state = JSON.parse(await readFile(join(directory, entry.files[1].path), 'utf8'));
  assert.equal(state.frames[0].state.html, '<html>Exact source & qualifier</html>'); assert.equal(state.frames[0].state.links[0].href, 'https://source/');
});
for (const failure of ['cdp', 'png']) test(`${failure} capture failure preserves manifest, detaches and cannot pass`, async t => {
  const { directory, calls, page, result } = await mockCapture(t, failure);
  await assert.rejects(captureResourceCheckpoint(page, directory, result, 'failure'), /mock/);
  assert.equal(result.resourceCapture.checkpoints[0].status, 'failed'); assert.equal(calls.at(-1), 'detached');
  const manifest = JSON.parse(await readFile(join(directory, `${RESOURCE_CAPTURE_SCENARIO}--failure.checkpoint.manifest.json`)));
  assert.equal(manifest.status, 'failed'); assert.ok(manifest.completedAt);
});
test('dynamic capture explicitly keeps form state, full source text, focus, scroll, open shadow roots and CSSOM', () => {
  for (const expression of ['document.activeElement', 'element.shadowRoot', 'element.value', 'element.checked', 'element.selected', 'element.open', 'element.scrollTop', 'sheet.cssRules', 'document.documentElement.outerHTML', 'sourceDialogs', 'links:', 'performance.timeOrigin']) assert.ok(helper.includes(expression), expression);
  assert.match(helper, /includePaintOrder: true, includeDOMRects: true/);
  assert.match(helper, /sequential, not a Playwright replay snapshot/);
  assert.doesNotMatch(helper, /snapshotterInjected|node_modules\/.*write|animations: 'disabled'/);
});
test('failure/final capture and HAR stop run in finally before context teardown, and evidence failures fail the scenario', () => {
  const final = main.indexOf('  } finally {\n    clearTimeout(deadline);');
  const stop = main.indexOf('await stopResourceCapture(context, output, result)', final);
  assert.ok(stop > final && stop < main.indexOf('await context.close()', final));
  assert.match(main.slice(final, stop), /await captureResourceCheckpoint\(page, output, result, result.status === "failed" \? "failure" : "final"\)/);
  assert.match(main.slice(stop, stop + 240), /result.status = "failed"; result.resourceNetworkCaptureError/);
  assert.match(main.slice(final, stop), /result.status = "failed"; result.resourceCaptureError/);
});
test('network companion retains request identity/redirects, failures/timings and websocket payloads', () => {
  const listeners = {}, result = { resourceCapture: { networkEvents: [], webSockets: [] } };
  observeResourceNetwork({ on: (event, handler) => { listeners[event] = handler; } }, result);
  const request = { url: () => 'https://site/', method: () => 'GET', resourceType: () => 'document', frame: () => ({ url: () => 'about:blank' }), redirectedFrom: () => null, failure: () => ({ errorText: 'failed' }), timing: () => ({ startTime: 5 }) };
  listeners.request(request); listeners.response({ request: () => request, status: () => 200 }); listeners.requestfailed(request);
  assert.equal(new Set(result.resourceCapture.networkEvents.map(row => row.id)).size, 1);
  assert.equal(result.resourceCapture.networkEvents[2].error, 'failed');
  const socketEvents = {}; listeners.websocket({ url: () => 'wss://site/', on: (name, fn) => { socketEvents[name] = fn; } });
  socketEvents.framesent({ payload: Buffer.from([0, 255]) }); socketEvents.framereceived({ payload: 'exact → source' });
  assert.deepEqual(result.resourceCapture.webSockets[0].frames.map(({ encoding, payload }) => ({ encoding, payload })), [{ encoding: 'base64', payload: 'AP8=' }, { encoding: 'text', payload: 'exact → source' }]);
});
test('HAR validator rejects missing bodies, requests, status, failure and full timing metadata', () => {
  const output = execFileSync('python3', [join(here, 'validate-resource-har.test.py')], { encoding: 'utf8' }); assert.match(output, /16 HAR fixture checks passed/);
});

test('new evidence operations are bounded and rejected waits do not count as successful captures', async () => {
  assert.equal(await boundedResourceEvidence('portable immediate', () => 'okay', 10), 'okay');
  await assert.rejects(boundedResourceEvidence('portable stuck', () => new Promise(() => {}), 5), /exceeded 5 ms/);
  await assert.rejects(boundedResourceEvidence('unsafe longer deadline', () => 'no', 15001));
  assert.match(main, /boundedResourceEvidence\("Terminal native probe preservation", \(\) => options.afterScenario\(\)\)/);
  assert.match(main, /boundedResourceEvidence\("Existing terminal screenshot", captureTerminal\)/);
  assert.match(main, /boundedResourceEvidence\("Existing terminal page diagnostics", preserveDiagnostics\)/);
  assert.match(main, /boundedResourceEvidence\("Trace stop\/export"/);
  assert.match(main, /boundedResourceEvidence\("Resource context close"/);
  assert.ok(helper.indexOf("await writeFile(join(output, data.networkEventsBeforeExport)") < helper.indexOf("'HAR stop/export'"));
});
test('closed author shadow roots fail before an incomplete live-state capture can pass', () => {
  const snapshot = { strings: ['https://site/', 'closed'], documents: [{ documentURL: 0, nodes: { nodeType: [9, 1], shadowRootType: { index: [1], value: [1] } } }] };
  assert.throws(() => assertDOMFrameCoverage(snapshot, [{ url: 'https://site/' }]), /Closed author shadow-root/);
});
test('actual serialized dynamic-state function retains modal/focus/form/source/scroll/CSS values in an isolated realm', () => {
  const make = (tag, id, text) => ({ tagName: tag, id, textContent: text, attributes: [{ name: 'id', value: id }], scrollWidth: 100, clientWidth: 100, scrollHeight: 100, clientHeight: 100, scrollTop: 0, scrollLeft: 0, getBoundingClientRect: () => ({ toJSON: () => ({ x: 1, y: 2, width: 3, height: 4 }) }), matches(selector) { return selector === ':modal' ? this.modal === true : selector.split(',').some(name => name.toUpperCase() === this.tagName); } });
  const input = make('INPUT', 'input', ''); Object.assign(input, { value: 'exact \u2192 value', checked: true, selectionStart: 1, selectionEnd: 3 });
  const modal = make('DIALOG', 'modal', 'Full source qualification'); Object.assign(modal, { open: true, modal: true, scrollHeight: 200, scrollTop: 17 });
  const plain = make('DIALOG', 'nonmodal', 'Other dialog'); Object.assign(plain, { open: true, modal: false });
  const link = make('A', 'source', 'source text'); link.href = 'https://source/?a=1&b=2';
  const elements = [input, modal, plain, link];
  const document = { activeElement: input, hasFocus: () => true, styleSheets: [{ href: null, disabled: false, cssRules: [{ cssText: '.note { color: green; }' }] }], adoptedStyleSheets: [], documentElement: { outerHTML: '<html>full & exact</html>' }, querySelector: () => null, querySelectorAll: selector => selector === '*' ? elements : selector === 'dialog' ? [modal, plain] : selector === 'a[href]' ? [link] : [] };
  const realm = { document, location: { href: 'https://site/' }, performance: { now: () => 4, timeOrigin: 100 }, innerWidth: 1440, innerHeight: 1000, scrollX: 0, scrollY: 7, devicePixelRatio: 1, getSelection: () => ({ toString: () => 'exact selection' }) };
  const state = vm.runInNewContext(`(${readCheckpointDocumentState.toString()})()`, realm);
  assert.equal(state.controls.find(row => row.id === 'modal').modal, true);
  assert.equal(state.controls.find(row => row.id === 'nonmodal').modal, false);
  assert.equal(state.controls.find(row => row.id === 'input').value, 'exact \u2192 value');
  assert.equal(state.focus[0].id, 'input'); assert.equal(state.scroll[0].top, 17);
  assert.equal(state.links[0].href, link.href); assert.equal(state.sourceDialogs[0].text, modal.textContent);
  assert.equal(state.sheets[0].rules[0], '.note { color: green; }'); assert.equal(state.html, '<html>full & exact</html>');
});

test('monotonic elapsed guard rejects late work even if the Promise.race timer callback was delayed', async () => {
  for (const elapsed of [0, 299999.9, 300000]) assert.doesNotThrow(() => assertResourceBudget(elapsed, 300000));
  for (const elapsed of [300000.001, 300001, NaN, Infinity, -1]) assert.throws(() => assertResourceBudget(elapsed, 300000));
  assert.throws(() => assertResourceBudget(1, 300001));
  let timerCallbackRan = false;
  const delayedTimer = new Promise(() => {});
  const workResolvesBeforeDelayedTimer = Promise.resolve().then(() => {
    assert.equal(timerCallbackRan, false);
    assertResourceBudget(300001, 300000);
    return 'must not pass';
  });
  await assert.rejects(Promise.race([workResolvesBeforeDelayedTimer, delayedTimer]), /outside its 300000 ms/);
  const check = main.indexOf('assertResourceBudget(result.resourceCapture.completionObservation.elapsedMs, options.budgetMs)');
  assert.ok(check > 0 && check < main.indexOf('result.status = "passed";', check));
});
