import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, rm, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash, webcrypto } from 'node:crypto';
import { createRequire } from 'node:module';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { build } from 'esbuild';
if (!globalThis.crypto?.subtle) globalThis.crypto = webcrypto;
const require = createRequire(import.meta.url);
const temporary = await mkdtemp(join(tmpdir(), 'fieldwork-sector-reader-'));
after(() => rm(temporary, { recursive: true, force: true }));
const plugin = { name: 'shared-react-raw', setup(b) {
  b.onResolve({ filter: /^react(?:\/.*)?$/ }, args => ({ path: require.resolve(args.path), external: true }));
  b.onResolve({ filter: /\?raw$/ }, args => ({ path: resolve(args.resolveDir, args.path.slice(0, -4)), namespace: 'raw' }));
  b.onLoad({ filter: /.*/, namespace: 'raw' }, async args => ({ contents: `export default ${JSON.stringify(await readFile(args.path, 'utf8'))}`, loader: 'js' }));
} };
async function bundle(entry, name) {
  const outfile = join(temporary, `${name}.mjs`);
  const result = await build({ entryPoints: [entry], outfile, bundle: true, platform: 'node', format: 'esm', jsx: 'automatic',
    logLevel: 'silent', metafile: true, plugins: [plugin], loader: { '.css': 'empty' } });
  return { module: await import(pathToFileURL(outfile).href), result };
}
const hash = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const projectionText = await readFile('src/sector-reader/projection.json', 'utf8');
const admissionText = await readFile('src/sector-reader/reader-admission.json', 'utf8');
const projection = JSON.parse(projectionText), admission = JSON.parse(admissionText);
const adapter = (await bundle('src/sector-reader/adapter.ts', 'adapter')).module;
const panel = (await bundle('src/sector-reader/SectorReaderPanel.tsx', 'panel')).module;
const gate = (await bundle('src/sector-reader/SectorReaderGate.tsx', 'gate')).module;
const loader = (await bundle('src/registryLoader.ts', 'registry-loader')).module;
// Portable: reconstruct and verify the shipped complete registry, no private bundle or parent checkout needed.
const base = await loader.loadFullRegistry({ manifestUrl: 'https://local.test/data/registry/manifest.json', fetch: async url => {
  const pathname = new URL(url).pathname;
  assert.ok(pathname.startsWith('/data/registry/') && !pathname.includes('..'));
  const bytes = await readFile(`public${pathname}`);
  return new Response(bytes, { status: 200 });
} });
const before = hash(base);
const pins = { base: adapter.PINNED_SECTOR_BASE_SHA256, projection: adapter.PINNED_SECTOR_PROJECTION_SHA256 };
const compose = (b = base, p = projectionText, a = admissionText, opt = adapter.SECTOR_REVIEW_VALUE) => adapter.buildSectorReaderOverlay(b, p, a, opt);
const overlay = await compose();
const href = 'https://reader.example/india-corporate-intelligence/spatial/?case=energy&review=sector-2026-10#reader';
const html = renderToStaticMarkup(createElement(panel.SectorReaderView, { overlay, href }));
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#x27;');
const tick = () => new Promise(resolve => setImmediate(resolve));
const clone = value => structuredClone(value);
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
function checkInvalid(mutator, pattern = /Sector reader is unavailable/) { const value = clone(projection); mutator(value); assert.throws(() => adapter.validateSectorProjection(value), pattern); }

test('exact retained projection bytes, separate admission, and shipped full baseline are pinned', () => {
  assert.equal(hash(projectionText), '83f4f8f016ea0e734095c43c2e1c46b2d1f080747265fef846cccc1f11d85a44');
  assert.equal(hash(admissionText), 'adb923b208dd07c1c652cd77a9e1b48fd2a0d37a8d5d2f3a84414e57840ab34b');
  assert.equal(before, '048f89ffd008a498212ff2ac71d4413aef09b138a50ab77f336a23fec4722064');
  assert.equal(hash(projectionText), pins.projection); assert.equal(before, pins.base);
  assert.equal(hash(admissionText), adapter.PINNED_SECTOR_ADMISSION_SHA256);
  adapter.validateSectorProjection(projection); adapter.validateSectorReaderAdmission(admission, projection, pins);
});

test('reader is separate narrative data; graph, search and paths receive the identical unmodified registry', () => {
  assert.equal(overlay.graphRegistry, base);
  for (const surface of ['factual', 'search', 'paths']) assert.equal(adapter.registryForSectorSurface(overlay, surface), base);
  assert.equal('readerRegistry' in overlay, false);
  assert.equal('entities' in overlay.projection, false); assert.equal('relationships' in overlay.projection, false);
  assert.equal('records' in overlay.projection, false);
  assert.equal(hash(base), before); assert.equal(Object.isFrozen(base), false); assert.equal(Object.isFrozen(base.entities), false);
  assert.equal(Object.isFrozen(base.entities[0]), false); assert.ok(Object.isFrozen(overlay)); assert.ok(Object.isFrozen(overlay.projection));
  assert.ok(Object.isFrozen(overlay.projection.entries[0].qualifications));
  assert.equal(base.entities.length, 2469); assert.equal(base.relationships.length, 4203);
  assert.equal(base.records.length, 5617); assert.equal(base.sources.length, 3314);
  assert.throws(() => adapter.registryForSectorSurface({ ...overlay }, 'factual'), /unverified/);
  assert.throws(() => adapter.registryForSectorSurface(overlay, 'sector-reader'), /unsupported/);
});

test('retained held statuses are exact and never normalized by reader admission', () => {
  assert.deepEqual(overlay.projection, projection); assert.deepEqual(overlay.readerAdmission, admission);
  assert.equal(overlay.readerAdmission.readerStatus, 'READER_ADMITTED'); assert.equal(overlay.status, 'PUBLIC_GRAPH_BLOCKED');
  for (const row of [overlay.projection, ...overlay.projection.packets, ...overlay.projection.entries]) {
    assert.equal(row.publicationStatus, 'awaiting-parent-content-review'); assert.equal(row.graphEligible, false); assert.equal(row.pathEligible, false);
  }
  for (const row of [overlay.projection, ...overlay.projection.entries]) assert.equal(row.aggregationPermitted, false);
  for (const field of ['graphEligible', 'pathEligible', 'aggregationPermitted']) checkInvalid(x => { x[field] = true; });
  checkInvalid(x => { x.publicationStatus = 'APPROVED'; });
  checkInvalid(x => { x.entries[0].publicationStatus = 'unknown'; });
  checkInvalid(x => { x.packets[0].reviewStatus = 'cleared'; });
  checkInvalid(x => { x.entries[0].graphEligible = true; });
  checkInvalid(x => { x.entries[0].pathEligible = true; });
  checkInvalid(x => { x.entries[0].aggregationPermitted = true; });
});

test('exact query requires fresh full-baseline entry; unknown, duplicate and preview selectors fail closed', () => {
  assert.equal(adapter.sectorReviewRequested('?review=sector-2026-10', true, 'full'), true);
  assert.equal(adapter.sectorReviewRequested('?case=energy&review=sector-2026-10#not-a-query-hash', true, 'full'), false);
  assert.equal(adapter.sectorReviewRequested('?case=energy&review=sector-2026-10', true, 'full'), true);
  for (const search of ['', '?review=unknown', '?review=historical-2025', '?review=SECTOR-2026-10', '?review=sector-2026-10&review=sector-2026-10',
    '?review=sector-2026-10&review=unknown', '?review=sector-2026-10&dataset=preview', '?review=sector-2026-10&dataset=full&dataset=full']) {
    assert.equal(adapter.sectorReviewRequested(search, true, 'full'), false, search);
  }
  assert.equal(adapter.sectorReviewRequested('?review=sector-2026-10', false, 'full'), false);
  assert.equal(adapter.sectorReviewRequested('?review=sector-2026-10', true, 'preview'), false);
  assert.equal(adapter.withoutSectorReview(href), '/india-corporate-intelligence/spatial/?case=energy#reader');
  const prompt = renderToStaticMarkup(createElement(gate.default, { base, href }));
  assert.ok(prompt.includes('Open sector reader')); assert.ok(!prompt.includes('data-sector-claim='));
  assert.equal(renderToStaticMarkup(createElement(gate.default, { base, href: href.replace('sector-2026-10', 'unknown') })), '');
});

test('byte mutations, missing admission, alternate opt-in and partial or altered baseline fail closed', async () => {
  await assert.rejects(compose(base, `${projectionText} `), /projection SHA-256/);
  await assert.rejects(compose(base, projectionText, `${admissionText} `), /admission SHA-256/);
  await assert.rejects(compose(base, projectionText, ''), /admission SHA-256/);
  await assert.rejects(compose(base, projectionText, admissionText, 'approved'), /explicit/);
  await assert.rejects(compose({ ...base, sources: base.sources.slice(1) }), /baseline SHA-256/);
  await assert.rejects(compose({ ...base, updatedAt: '2030-01-01' }), /baseline SHA-256/);
  assert.equal(hash(base), before);
});

test('admission closes every exact ID, source hash, response and financial-context reference', () => {
  assert.deepEqual(admission.claims.map(row => row.id), projection.entries.map(row => row.id));
  assert.deepEqual(admission.sources.map(row => row.sourceId), projection.sources.map(row => row.id));
  for (const change of [x => { x.readerStatus = 'APPROVED'; }, x => { x.publicGraphEligible = true; }, x => { x.publicPathEligible = true; },
    x => { x.claims.pop(); }, x => { x.claims[0].sourceIds = []; }, x => { x.sources[0].retainedContentSha256 = '0'.repeat(64); },
    x => { x.packetIds.push('unknown'); }, x => { x.criticismResponses.pop(); }, x => { x.financialContext.pop(); },
    x => { x.payloadSha256.projection = '0'.repeat(64); }, x => { x.extra = true; }]) {
    const edited = clone(admission); change(edited);
    assert.throws(() => adapter.validateSectorReaderAdmission(edited, projection, pins));
  }
});

test('structural validator rejects unknown fields, source IDs, missing locators and cross-packet references', () => {
  checkInvalid(x => { x.entities = []; }); checkInvalid(x => { x.entries.pop(); });
  checkInvalid(x => { x.sources[0].id = x.sources[1].id; });
  checkInvalid(x => { x.entries[0].sources[0].sourceId = 'not-retained'; });
  checkInvalid(x => { x.entries[0].sources[0].locator = ''; });
  checkInvalid(x => { x.entries[0].sources.push(x.entries[0].sources[0]); });
  checkInvalid(x => { x.entries[0].packet = 'rss-report-review'; });
  checkInvalid(x => { x.entries[0].sources[0].sourceId = 'rss-report-review:report'; });
  checkInvalid(x => { x.financialContext[0].sourceId = 'not-retained'; });
  checkInvalid(x => { x.criticismResponses[4].additionalSources[0].sourceId = 'not-retained'; });
  checkInvalid(x => { x.entries[0].qualifications = []; }); checkInvalid(x => { x.entries[0].unresolved = []; });
  checkInvalid(x => { x.entries[0].directLegalParentAtSnapshot = true; });
});

test('all complete claim texts, qualifications and unresolved fields render expanded with exact IDs', () => {
  assert.equal((html.match(/data-sector-claim="/g) ?? []).length, 20);
  assert.equal((html.match(/data-sector-collection="/g) ?? []).length, 4);
  assert.ok(!html.includes('<details')); assert.ok(!html.includes('<summary')); assert.ok(!html.includes(' title='));
  for (const entry of projection.entries) {
    assert.ok(html.includes(`data-sector-claim="${entry.id}"`)); assert.ok(html.includes(escape(entry.claimText)));
    for (const text of [...entry.qualifications, ...entry.unresolved]) assert.ok(html.includes(escape(text)), text);
    for (const source of entry.sources) assert.ok(html.includes(escape(source.locator)), source.locator);
  }
  assert.ok(html.includes('qualified paraphrase, not a verbatim source quotation'));
  assert.ok(html.includes('Graph, search and paths continue to use only the unchanged base registry'));
});

test('negative welfare predicates and IDA financier-to-payer inference stay explicit', () => {
  const welfare = projection.entries.filter(row => row.packet === 'welfare-food-finance');
  for (const entry of welfare) {
    assert.ok(entry.qualifications.includes(`This does not establish: ${entry.notEstablished}`));
    assert.ok(html.includes(escape(entry.notEstablished)));
  }
  assert.equal(projection.entries.find(row => row.id === 'wff-03').payerAttribution.financierToPayerInferred, true);
  assert.ok(html.includes('Financier-to-payer attribution is inferred'));
  assert.ok(html.includes('Originating account identified</dt><dd data-sector-field="originatingAccountIdentified">No'));
  checkInvalid(x => { x.entries.find(row => row.id === 'wff-03').payerAttribution.originatingAccountIdentified = true; });
  checkInvalid(x => { x.entries.find(row => row.id === 'wff-01').qualifications[0] = 'A loan, treasury cash receipt.'; });
});

test('every criticism has an immediately adjacent response and citation inside each linked claim', () => {
  for (const pair of projection.criticismResponses) {
    const expected = `<p data-sector-criticism="${pair.id}">${escape(pair.criticism)}</p><h5>Response and scope</h5><p data-sector-response="${pair.id}">${escape(pair.response)}</p>`;
    assert.ok(html.includes(expected), pair.id);
    assert.ok(html.includes(escape(pair.status))); assert.ok(html.includes(escape(pair.locator)));
  }
  for (const entry of projection.entries) {
    const markup = html.split(`data-sector-claim="${entry.id}"`)[1].split('class="sector-claim"')[0];
    for (const id of entry.criticismResponseIds) assert.ok(markup.includes(`data-sector-pair="${id}"`));
  }
  checkInvalid(x => { x.entries.find(row => row.id === 'wff-01').criticismResponseIds.pop(); });
  checkInvalid(x => { x.criticismResponses[0].response = ''; });
  checkInvalid(x => { x.criticismResponses[0].status = 'proven corruption'; });
});

test('all packet financial notes render with exact source locators and no aggregation', () => {
  assert.equal((html.match(/data-sector-financial-context="/g) ?? []).length, 7);
  for (const row of projection.financialContext) {
    assert.ok(html.includes(escape(row.text))); assert.ok(html.includes(escape(row.locator)));
    for (const source of row.additionalSources ?? []) assert.ok(html.includes(escape(source.locator)));
  }
  for (const entry of projection.entries) for (const stage of entry.moneyStages) {
    assert.ok(html.includes(escape(stage.stage))); assert.equal(stage.notAuditedCashProof, true);
    assert.ok(html.includes(escape(stage.overlapGroup)));
    if (stage.valueAsReported) assert.ok(html.includes(escape(stage.valueAsReported)));
  }
  assert.ok(html.includes('must not be summed')); assert.ok(html.includes('no national annual-income allocation'));
  checkInvalid(x => { x.entries.find(row => row.id === 'wff-01').moneyStages[0].notAuditedCashProof = false; });
  checkInvalid(x => { x.entries.find(row => row.id === 'RSS-2026-009').moneyStages[0].currency = 'USD'; });
  checkInvalid(x => { x.entries.find(row => row.id === 'EMF-001').moneyStages[0].exactTransferDate = '2025-10-20'; });
});

test('snapshot, announcement, reporting bounds, event conflicts and unknown dates stay separate', () => {
  const byId = new Map(projection.entries.map(row => [row.id, row]));
  assert.equal(byId.get('wff-01').dates.event, '2017-05-04');
  assert.equal(byId.get('wff-02').dates.event, null); assert.equal(byId.get('wff-02').dates.latestReportBound, '2017-09-08');
  assert.equal(byId.get('EMF-001').dates.exactFundsReceiptDate, null); assert.equal(byId.get('EMF-001').dates.firstDrawAnnouncement, '2025-10-20');
  assert.equal(byId.get('EC-E01').dates.snapshot, '2024-12-31');
  assert.deepEqual(byId.get('RSS-2026-007').dates.unresolvedEventAlternatives, ['2025-12-25/2025-12-28', '2025-12-25/2025-12-29']);
  assert.equal(byId.get('RSS-2026-009').dates.planting, '2024-01-10');
  for (const row of [...projection.entries, ...projection.sources]) for (const [key, value] of Object.entries(row.dates)) {
    assert.ok(html.includes(`data-sector-field="${key}"`));
    if (typeof value === 'string') assert.ok(html.includes(escape(value)), `${key}: ${value}`);
    if (Array.isArray(value)) for (const v of value) assert.ok(html.includes(escape(v)));
  }
  assert.ok(html.includes('Publication date</dt><dd data-sector-field="publication">Unknown / not established'));
  checkInvalid(x => { delete x.sources[2].dates.publication; });
  checkInvalid(x => { x.entries[0].dates.currentOwner = true; });
});

test('all source metadata and exact safe original URLs are visible without rewriting or truncation', () => {
  for (const source of projection.sources) {
    assert.ok(html.includes(`href="${escape(source.url)}"`), source.url);
    assert.ok(html.includes(`>${escape(source.url)}</a>`));
    assert.ok(html.includes(escape(source.sourceFamily))); assert.ok(html.includes(escape(source.independence)));
    assert.ok(html.includes(source.sha256)); assert.ok(html.includes(String(source.bytes)));
  }
  assert.ok(html.includes('SEC hosting is not independent corroboration'));
  assert.ok(html.includes('source check is not independent corroboration'));
  assert.ok(!/<(?:img|iframe|object|embed)\b/.test(html));
  assert.ok(!/\.\/.*(?:\.pdf|\.html|\.jpg)/.test(html));
  for (const url of ['javascript:alert(1)', 'data:text/html,x', '//example.com', 'https:/example.com', 'https://example.com/ x', 'https://example.com/\\x', 'https://user:secret@example.com/']) {
    checkInvalid(x => { x.sources[0].url = url; });
  }
  const injected = renderToStaticMarkup(createElement(panel.SectorCitation, { source: { ...projection.sources[0], url: 'javascript:alert(1)' } }));
  assert.ok(!injected.includes('href=')); assert.ok(injected.includes('Unsafe source destination withheld'));
});

test('React escapes claim text, qualifiers, response text and source metadata; no raw HTML path exists', () => {
  const injected = clone(overlay); const attack = '<img src=x onerror="alert(1)"><script>alert(1)</script>';
  injected.projection.entries[0].claimText = attack; injected.projection.entries[0].qualifications[0] = attack;
  injected.projection.criticismResponses[0].response = attack; injected.projection.sources[0].sourceFamily = attack;
  const rendered = renderToStaticMarkup(createElement(panel.SectorReaderView, { overlay: injected, href }));
  assert.ok(rendered.includes(escape(attack))); assert.ok(!rendered.includes('<script>')); assert.ok(!rendered.includes('<img'));
});

test('RSS scope preserves attendees including families, member-team wording, date conflicts and bounded absence', () => {
  assert.ok(html.includes('Members of national-level teams'));
  assert.ok(html.includes('1,611 attendees including family members'));
  assert.ok(html.includes('Not 71 branches'));
  assert.ok(html.includes('No auditor opinion or consolidated annual-income/transfer ledger was located in this inspected file'));
  assert.ok(html.includes('This does not establish nonexistence elsewhere, reporting duties or noncompliance'));
  assert.ok(html.includes('All 39 physical PDF pages'));
});

test('cancel before microtask starts prevents the data import altogether', async () => {
  const states = []; let calls = 0;
  const cancel = gate.startSectorReaderLoad(base, state => states.push(state), async () => { calls++; return overlay; });
  cancel(); await tick(); assert.equal(calls, 0); assert.deepEqual(states.map(state => state.phase), ['loading']);
});

test('cancelled success and failure cannot reopen the dialog or overwrite a later fresh attempt', async () => {
  const first = deferred(), second = deferred(), states = [];
  const cancel = gate.startSectorReaderLoad(base, state => states.push(state), () => first.promise);
  await tick(); cancel();
  gate.startSectorReaderLoad(base, state => states.push(state), () => second.promise);
  await tick(); second.resolve(overlay); await tick(); first.resolve(overlay); await tick();
  assert.deepEqual(states.map(state => state.phase), ['loading', 'loading', 'ready']);
  const failure = deferred(), failures = [];
  const stop = gate.startSectorReaderLoad(base, state => failures.push(state), () => failure.promise);
  await tick(); stop(); failure.reject(new Error('stale failure')); await tick();
  assert.deepEqual(failures.map(state => state.phase), ['loading']);
});

test('verification failure has an explicit retry path and does not mutate the base', async () => {
  const states = [];
  gate.startSectorReaderLoad(base, state => states.push(state), async () => { throw new Error('test verification failure'); });
  await tick(); assert.deepEqual(states.map(state => state.phase), ['loading', 'error']); assert.equal(states[1].message, 'test verification failure');
  gate.startSectorReaderLoad(base, state => states.push(state), async () => overlay); await tick();
  assert.deepEqual(states.map(state => state.phase), ['loading', 'error', 'loading', 'ready']); assert.equal(hash(base), before);
});

test('back/forward/hash/BFCache cancel a session and listeners are removed on cleanup', () => {
  const target = new EventTarget(); let calls = 0;
  const cleanup = gate.watchSectorReaderNavigation(() => { calls++; }, target);
  for (const name of ['popstate', 'hashchange', 'pagehide']) target.dispatchEvent(new Event(name));
  target.dispatchEvent(new Event('pageshow')); assert.equal(calls, 3);
  const restored = new Event('pageshow'); Object.defineProperty(restored, 'persisted', { value: true }); target.dispatchEvent(restored); assert.equal(calls, 4);
  cleanup(); target.dispatchEvent(new Event('popstate')); target.dispatchEvent(restored); assert.equal(calls, 4);
});

test('modal has labelled native-dialog semantics, Escape handling and focus return to the persistent Open control', async () => {
  const dialog = renderToStaticMarkup(createElement(panel.default, { overlay, href, onClose: () => {} }));
  assert.ok(dialog.includes('<dialog')); assert.ok(dialog.includes('aria-labelledby="sector-reader-title"'));
  assert.ok(dialog.includes('Close sector reader (Escape)')); assert.ok(dialog.includes('autofocus=""'));
  const code = await readFile('src/sector-reader/SectorReaderPanel.tsx', 'utf8');
  assert.ok(code.includes('element.showModal()')); assert.ok(code.includes('event.preventDefault(); props.onClose()'));
  assert.ok(code.includes('target.isConnected')); assert.ok(code.includes('target.focus()'));
  assert.ok(code.includes('scrollIntoView')); assert.ok(!code.includes('href={`#sector-collection-'));
  const style = await readFile('src/sector-reader/sector-reader.css', 'utf8');
  assert.ok(style.includes('overflow-wrap:anywhere')); assert.ok(!/(text-overflow|line-clamp|overflow:hidden)/.test(style));
});

test('payload and reader remain dynamically imported; private review files and raw materials are absent', async () => {
  const gateCode = await readFile('src/sector-reader/SectorReaderGate.tsx', 'utf8');
  const loaderCode = await readFile('src/sector-reader/loadSectorReader.ts', 'utf8');
  assert.ok(gateCode.includes("lazy(() => import('./SectorReaderPanel'))"));
  assert.ok(gateCode.includes("import('./loadSectorReader')"));
  assert.ok(!gateCode.includes('projection.json')); assert.ok(!gateCode.includes('reader-admission.json'));
  assert.ok(loaderCode.includes("'./projection.json?raw'")); assert.ok(loaderCode.includes("'./reader-admission.json?raw'"));
  const filenames = await readdir('src/sector-reader');
  assert.ok(!filenames.includes('projection-manifest.json')); assert.ok(!filenames.includes('parent-content-review.json'));
  assert.ok(!filenames.some(name => /\.(pdf|html|jpg|png|ocr)$/i.test(name)));
  for (const file of filenames.filter(name => /\.(tsx?|json)$/.test(name))) {
    const contents = await readFile(`src/sector-reader/${file}`, 'utf8');
    assert.ok(!contents.includes('/workspace/')); assert.ok(!contents.includes('publication_authorization'));
    assert.ok(!contents.includes('dangerouslySetInnerHTML'));
  }
});


test('collection buttons scroll and focus the matching section without any history mutation', () => {
  const calls = [];
  const target = { getElementById: id => { calls.push(id); return { scrollIntoView: options => calls.push(options), focus: options => calls.push(options) }; } };
  panel.focusSectorCollection('energy-mineral-finance', target);
  assert.deepEqual(calls, ['sector-collection-energy-mineral-finance', { block: 'start' }, { preventScroll: true }]);
  panel.focusSectorCollection('unknown', { getElementById: () => null });
  assert.ok(html.includes('tabindex="-1" aria-labelledby="sector-collection-title-energy-mineral-finance"'));
});


test('coverage counts derive only from reader records and are explicitly separate from the base catalogue', () => {
  assert.ok(html.includes('4 collections · 20 qualified panels · 18 source records'));
  assert.ok(html.includes('6 distinct criticism/response pairs · 7 financial context notes'));
  assert.ok(html.includes('reader coverage counts, separate from the base registry catalogue'));
});

test('sticky Close and collection buttons keep explicit opaque high-contrast hover/focus palettes', async () => {
  const style = await readFile('src/sector-reader/sector-reader.css', 'utf8');
  assert.ok(style.includes('.sector-reader-dialog .sector-dismiss:hover:not(:disabled)'));
  assert.ok(style.includes('.sector-reader-dialog .sector-dismiss:focus-visible'));
  assert.ok(style.includes('background:#fff4d3;color:#102e25;border-color:#d4b276;opacity:1'));
  assert.ok(style.includes('.sector-reader-dialog .sector-reader-content nav button:hover:not(:disabled)'));
  assert.ok(style.includes('background:#1e4638;color:#fff4d3;opacity:1'));
});
