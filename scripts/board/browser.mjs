#!/usr/bin/env node
/**
 * Board acceptance suite. Run only in an explicitly authorized browser environment.
 * Never set BOARD_ALLOW_BROWSER to work around a denied local browser launch.
 * Usage: BOARD_ALLOW_BROWSER=1 BOARD_BASE_URL=https://approved-host node scripts/board/browser.mjs
 * Without BOARD_BASE_URL, an authorized CI runner serves the existing dist/ build locally.
 */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadModule } from './load.mjs';

if (process.env.BOARD_ALLOW_BROWSER !== '1') {
  throw new Error('Browser suite was not started. An authorized browser environment must explicitly set BOARD_ALLOW_BROWSER=1. This flag is not permission to bypass a denied launch.');
}
const { chromium } = await import('playwright');
const root = fileURLToPath(new URL('../../', import.meta.url));
const output = resolve(root, process.env.BOARD_ARTIFACTS ?? '/tmp/investigation-board-review');
mkdirSync(output, { recursive: true });
const api = await loadModule('src/data/investigation.ts'); const registry = api.getInvestigationRegistry();
const { CASEBOOK_KEY, emptyCasebook } = await loadModule('src/components/investigation/casebookStore.ts');
const { BOARD_LAYOUT_KEY, emptyBoardLayout } = await loadModule('src/components/board/boardStore.ts');
const records = registry.records.filter(record => record.sourceIds.length > 0);
const [recordA, recordB, recordC] = records;
const capacityRecords = [...registry.records].sort((a, b) => b.title.length - a.title.length).slice(0, 250);
assert.ok(recordA && recordB && recordC);
const pin = (record, note = '') => ({ kind: 'record', id: record.id, note, addedAt: '2026-10-15T00:00:00Z' });
const recordKey = record => `record:${record.id}`;
const bookOf = (...pins) => ({ ...emptyCasebook(), pins });
const thread = (id = 'analyst-thread') => ({ id, from: recordKey(recordA), to: recordKey(recordB), type: 'question', note: 'Obtain evidence that could disprove this question.' });
const legacyRoutes = JSON.parse(readFileSync(new URL('./legacy-routes.json', import.meta.url)));
let base = process.env.BOARD_BASE_URL?.replace(/\/$/u, ''); let server;
if (!base) {
  const dist = resolve(root, process.env.BOARD_DIST ?? 'dist');
  assert.ok(existsSync(resolve(dist, 'index.html')), 'Build the application before running browser tests');
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
  server = createServer((req, res) => {
    const path = new URL(req.url, 'http://localhost').pathname;
    const file = resolve(dist, `.${path === '/' ? '/index.html' : decodeURIComponent(path)}`);
    if (!file.startsWith(`${dist}/`)) { res.writeHead(403).end(); return; }
    try { res.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file)); }
    catch { res.writeHead(404).end(); }
  });
  await new Promise((done, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', done); });
  base = `http://127.0.0.1:${server.address().port}`;
}
const binary = process.env.PLAYWRIGHT_CHROMIUM_PATH;
let browser; const results = []; let checkCount = 0; const screenshots = []; const layoutDiagnostics = [];
const expectedScreenshots = [
  ...[1280, 1600].flatMap(width => ['board-empty', 'board-picker', 'board-populated', 'board-list', 'retained-atlas', 'retained-education-dossier', 'retained-money-trails', 'retained-research-program', 'static-index', 'static-index-help', 'static-finance', 'static-finance-help', 'static-media', 'static-media-help'].map(name => `${name}-${width}.png`)),
  'board-inspector-1280.png', 'board-help-1280.png', 'board-tutorial-1280.png', 'board-threads-1280.png',
  'board-tutorial-mobile-390.png',
];
const renderedFrames = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const measureLayout = async (page, label) => {
  const metrics = await page.evaluate(() => {
    const measure = (element, name) => {
      if (!element) return { name, missing: true };
      const rect = element.getBoundingClientRect(), style = getComputedStyle(element);
      return { name, clientHeight: element.clientHeight, scrollHeight: element.scrollHeight, offsetHeight: element.offsetHeight, scrollTop: element.scrollTop,
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, top: rect.top, bottom: rect.bottom },
        overflow: style.overflow, overflowX: style.overflowX, overflowY: style.overflowY, position: style.position, display: style.display, height: style.height, minHeight: style.minHeight };
    };
    return { viewport: { width: innerWidth, height: innerHeight }, windowScroll: { x: scrollX, y: scrollY },
      elements: [[document.documentElement, 'document'], [document.body, 'body'], [document.querySelector('#root'), '#root'], [document.querySelector('.site-shell'), '.site-shell'], [document.querySelector('.site-workspace'), '.site-workspace'], [document.querySelector('main'), 'main']].map(([element, name]) => measure(element, name)),
      bodyChildren: [...document.body.children].filter(element => getComputedStyle(element).display !== 'none').map(element => measure(element, `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}${element.className ? `.${String(element.className).trim().replace(/\s+/gu, '.')}` : ''}`)) };
  });
  const entry = { label, url: page.url(), ...metrics }; layoutDiagnostics.push(entry);
  writeFileSync(resolve(output, 'layout-diagnostics.json'), `${JSON.stringify(layoutDiagnostics, null, 2)}\n`);
  return entry;
};
const assertBoardRootHeight = metrics => {
  const roots = metrics.elements.filter(row => ['document', 'body', '#root', '.site-shell', '.site-workspace'].includes(row.name));
  ok(roots.every(row => !row.missing && row.scrollHeight <= metrics.viewport.height + 1 && row.rect.height <= metrics.viewport.height + 1), `Board stays within its viewport shell; only main may scroll: ${JSON.stringify(metrics)}`);
};
const assertReadableMetadata = async (page, label) => {
  const rows = await page.evaluate(() => {
    const parse = color => {
      const values = color.match(/[\d.]+/gu)?.map(Number) ?? [];
      if (values.length < 3 || !color.startsWith('rgb')) throw new Error(`Unsupported computed color in contrast check: ${color}`);
      return { rgb: values.slice(0, 3), alpha: values[3] ?? 1 };
    };
    const over = (foreground, background) => foreground.rgb.map((value, i) => value * foreground.alpha + background[i] * (1 - foreground.alpha));
    const luminance = color => color.map(value => { const channel = value / 255; return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4; }).reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i], 0);
    return [...document.querySelectorAll('.board-picker-count,.board-facts dt,.board-source-list span,.board-source-list small,.board-pin-date')].filter(element => {
      const rect = element.getBoundingClientRect(), style = getComputedStyle(element); return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden';
    }).map(element => {
      const ancestors = []; for (let node = element; node; node = node.parentElement) ancestors.unshift(node);
      const background = ancestors.reduce((color, node) => over(parse(getComputedStyle(node).backgroundColor), color), [255, 255, 255]);
      const style = getComputedStyle(element), foreground = over(parse(style.color), background), a = luminance(foreground), b = luminance(background);
      return { selector: element.className || element.tagName.toLowerCase(), text: element.textContent.trim().slice(0, 90), fontSize: Number.parseFloat(style.fontSize), color: style.color, background, contrast: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) };
    });
  });
  if (rows.length) {
    ok(rows.every(row => row.fontSize >= 12), `${label}: populated evidence metadata is at least 12px: ${JSON.stringify(rows.filter(row => row.fontSize < 12))}`);
    ok(rows.every(row => row.contrast >= 4.5), `${label}: populated evidence metadata has at least 4.5:1 text contrast: ${JSON.stringify(rows.filter(row => row.contrast < 4.5))}`);
    layoutDiagnostics.push({ label, url: page.url(), metadataReadability: rows });
  }
};
const capture = async (page, name) => {
  await page.evaluate(() => document.fonts.ready); await renderedFrames(page);
  const visibleLoading = await page.locator('main').evaluateAll(roots => roots.flatMap(root => [...root.querySelectorAll('p,h1,h2,[role="status"],.skeleton,.animate-pulse,[data-loading="true"],[aria-busy="true"]')].filter(element => {
    const style = getComputedStyle(element), rect = element.getBoundingClientRect();
    const pending = /^(?:loading|loading[.]{3}|loading…)$/iu.test(element.textContent.trim()) || element.matches('.skeleton,.animate-pulse,[data-loading="true"],[aria-busy="true"]');
    return pending && style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight;
  }).map(element => ({ tag: element.tagName, className: element.className, text: element.textContent.trim().slice(0, 150) }))));
  ok(visibleLoading.length === 0, `Screenshot contains resolved content rather than a loading placeholder: ${name}: ${JSON.stringify(visibleLoading)}`);
  await assertReadableMetadata(page, name);
  const metrics = await measureLayout(page, name);
  if (new URL(page.url()).hash.split('?')[0] === '#/board') assertBoardRootHeight(metrics);
  const path = resolve(output, name); await page.screenshot({ path, fullPage: false });
  assert.ok(statSync(path).size > 0, `Screenshot is nonempty: ${name}`);
  screenshots.push({ name, bytes: statSync(path).size, viewport: page.viewportSize(), url: page.url(), layoutDiagnostic: metrics.label });
};

const ok = (condition, message) => { assert.ok(condition, message); checkCount += 1; };
const eventually = async (check, message, timeout = 10000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) { if (await check()) { checkCount += 1; return; } await new Promise(done => setTimeout(done, 40)); }
  assert.fail(message);
};
const storage = (page, key) => page.evaluate(key => { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }, key);
const stylePosition = card => card.evaluate(element => ({ x: Number.parseFloat(element.style.left), y: Number.parseFloat(element.style.top) }));
const noOverflow = async (page, label) => {
  const widths = await page.evaluate(() => [document.documentElement, document.querySelector('main'), document.querySelector('.case-board-page')].filter(Boolean).map(element => ({ className: element.className, client: element.clientWidth, scroll: element.scrollWidth })));
  ok(widths.every(row => row.scroll <= row.client + 1), `${label}: no page/main/board horizontal overflow: ${JSON.stringify(widths)}`);
};
const settledBoardMode = async (page, mode) => {
  const state = () => page.evaluate(() => {
    const toolbar = document.querySelector('.board-toolbar'), buttons = [...(toolbar?.querySelectorAll('button') ?? [])];
    const pressed = name => buttons.find(button => button.textContent.trim() === name)?.getAttribute('aria-pressed');
    const params = new URLSearchParams(location.hash.split('?')[1] ?? '');
    return { urlList: params.get('view') === 'list', stageList: document.querySelector('.board-stage')?.classList.contains('is-list'), boardPressed: pressed('Board'), listPressed: pressed('List') };
  });
  const matches = current => current.urlList === (mode === 'list') && current.stageList === (mode === 'list') && current.boardPressed === String(mode === 'board') && current.listPressed === String(mode === 'list');
  await eventually(async () => matches(await state()), `URL, stage and pressed controls settle in ${mode} mode`);
  await renderedFrames(page); ok(matches(await state()), `${mode} mode remains settled after two rendered frames`);
};
const tutorialTargetGeometry = async (page, label, requireNonintersection = true) => {
  const dialog = page.locator('.tutorial-dialog[data-mode="tour"]');
  await page.locator('[data-tutorial-highlight="true"]').waitFor({ state: 'visible' });
  await eventually(async () => ['left', 'right', 'top', 'bottom', 'fallback'].includes(await dialog.getAttribute('data-placement')), `${label}: measured tutorial placement is ready`);
  await renderedFrames(page);
  const geometry = await page.evaluate(() => {
    const rect = element => { const value = element.getBoundingClientRect(); return { left: value.left, right: value.right, top: value.top, bottom: value.bottom, width: value.width, height: value.height }; };
    const popup = document.querySelector('.tutorial-dialog'), target = document.querySelector('[data-tutorial-highlight="true"]');
    return { popup: rect(popup), target: rect(target), targetText: target.textContent.trim(), placement: popup.dataset.placement, viewport: { width: innerWidth, height: innerHeight } };
  });
  const { popup, target, viewport } = geometry;
  const overlap = Math.min(popup.right, target.right) > Math.max(popup.left, target.left) && Math.min(popup.bottom, target.bottom) > Math.max(popup.top, target.top);
  const spaceFits = target.left - 20 >= popup.width + 12 || viewport.width - target.right - 20 >= popup.width + 12 || target.top - 20 >= popup.height + 12 || viewport.height - target.bottom - 20 >= popup.height + 12;
  ok(geometry.targetText === 'Pin a record', `${label}: step 2 highlights its intended control`);
  ok(popup.left >= -1 && popup.top >= -1 && popup.right <= viewport.width + 1 && popup.bottom <= viewport.height + 1, `${label}: tutorial popup remains inside viewport: ${JSON.stringify(geometry)}`);
  ok((!requireNonintersection && !spaceFits) || !overlap, `${label}: tutorial popup does not cover its target where it can fit: ${JSON.stringify(geometry)}`);
  layoutDiagnostics.push({ label, url: page.url(), tutorialGeometry: { ...geometry, overlap, spaceFits } });
};
const openBoard = async (page, query = '') => {
  await page.goto(`${base}/#/board${query}`); await page.locator('#board-title').waitFor({ timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
};
const upload = async (page, value, name = 'board-backup.json', waitForRead = true) => {
  await page.getByLabel('Import a board backup', { exact: true }).setInputFiles({ name, mimeType: 'application/json', buffer: Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)) });
  if (waitForRead) await page.waitForFunction(() => document.querySelector('input[aria-label="Import a board backup"]')?.value === '');
};
const download = async page => {
  const pending = page.waitForEvent('download');
  await page.locator('.board-toolbar').getByRole('button', { name: 'Export', exact: true }).click();
  return JSON.parse(readFileSync(await (await pending).path(), 'utf8'));
};
async function scenario(name, seed, work, options = {}) {
  const context = await browser.newContext({ viewport: { width: options.width ?? 1280, height: options.height ?? 1000 }, acceptDownloads: true, reducedMotion: 'reduce' });
  const errors = [];
  await context.addInitScript(({ seed, casebookKey, layoutKey }) => {
    if (!sessionStorage.getItem('board-acceptance-initialized')) {
      sessionStorage.setItem('board-acceptance-initialized', '1');
      if (seed.book !== undefined) localStorage.setItem(casebookKey, typeof seed.book === 'string' ? seed.book : JSON.stringify(seed.book));
      if (seed.layout !== undefined) localStorage.setItem(layoutKey, typeof seed.layout === 'string' ? seed.layout : JSON.stringify(seed.layout));
    }
  }, { seed, casebookKey: CASEBOOK_KEY, layoutKey: BOARD_LAYOUT_KEY });
  const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
  try {
    await work(page, context); ok(errors.length === 0, `No uncaught runtime exceptions: ${errors.join(' | ')}`);
    results.push({ name, status: 'passed' }); console.log(`PASS ${name}`);
  } catch (error) {
    await measureLayout(page, `${name}-failure`).catch(() => {});
    await page.screenshot({ path: resolve(output, `${name.replace(/[^a-z0-9]+/giu, '-')}-failure.png`), fullPage: true }).catch(() => {});
    results.push({ name, status: 'failed', message: error.message, url: page.url(), runtimeErrors: errors }); console.error(`FAIL ${name}: ${error.message}`);
  } finally { await context.close(); }
}
try {
  browser = await chromium.launch(binary ? { executablePath: binary } : {});
  for (const width of [1280, 1600]) {
    await scenario(`empty-board-${width}`, {}, async page => {
      await openBoard(page); await noOverflow(page, `${width}px empty board`);
      ok(await page.locator('.board-empty').isVisible(), 'Empty board offers a real first-record action');
      ok(await page.getByRole('button', { name: 'Connect pins', exact: true }).isDisabled(), 'Cannot connect fewer than two pins');
      const opener = page.getByRole('button', { name: 'Find your first record', exact: true }); await opener.click();
      const dialog = page.locator('.board-record-picker'); await dialog.waitFor({ state: 'visible' });
      ok(await dialog.getByLabel('Search records, identities and relationships').evaluate(element => element === document.activeElement), 'Record search receives initial focus');
      await capture(page, `board-picker-${width}.png`);
      for (let i = 0; i < 8; i += 1) { await page.keyboard.press('Tab'); ok(await dialog.evaluate(element => element.contains(document.activeElement)), 'Search dialog contains keyboard focus'); }
      await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' });
      await eventually(() => opener.evaluate(element => element === document.activeElement), 'Picker Escape returns focus to actual empty-state initiator');
      await capture(page, `board-empty-${width}.png`);
    }, { width });
  }

  await scenario('pin-search-inspector-source-closure', {}, async page => {
    await openBoard(page); await page.getByRole('button', { name: 'Pin a record', exact: true }).click();
    const dialog = page.locator('.board-record-picker');
    await dialog.getByLabel('Search records, identities and relationships').fill(recordA.id);
    await dialog.getByRole('button', { name: 'Search', exact: true }).click();
    await eventually(async () => new URL(page.url()).hash.includes(encodeURIComponent(recordA.id)), 'Search query is persisted in the route');
    const row = dialog.locator('article').filter({ has: page.getByRole('heading', { name: recordA.title, exact: true }) });
    await row.getByRole('button', { name: 'Pin record', exact: true }).click();
    ok(await row.getByRole('button', { name: 'Pinned', exact: true }).isDisabled(), 'Repeated pin does not duplicate a record');
    await dialog.getByRole('button', { name: 'Return to board', exact: true }).click();
    await page.locator('.board-pin').waitFor(); const saved = await storage(page, CASEBOOK_KEY);
    ok(saved.pins.length === 1 && saved.pins[0].id === recordA.id, 'Board uses the original casebook storage identity');
    const opener = page.locator('.board-pin-content').first(); await opener.click();
    const inspector = page.locator('.board-inspector'); await inspector.waitFor({ state: 'visible' });
    ok((await inspector.innerText()).includes('Scope and limitations'), 'Inspector retains evidence limitations');
    const requiredSources = new Set([...recordA.sourceIds, ...recordA.geography.flatMap(geo => geo.sourceIds)]);
    const hrefs = await inspector.locator('.board-source-list a').evaluateAll(links => links.map(link => link.href));
    ok([...requiredSources].every(id => hrefs.includes(registry.sources.find(source => source.id === id)?.url)), 'Inspector closes direct and independently cited geographic sources');
    await capture(page, 'board-inspector-1280.png');
    const route = await inspector.getByRole('link', { name: 'Open full evidence workspace' }).getAttribute('href');
    ok(route.includes('iw_view=evidence') && route.includes(`iw_record=${encodeURIComponent(recordA.id)}`), 'Inspect-source link preserves exact record ID');
    await inspector.getByLabel('Your analyst note').fill('Preserve this analyst note across views and reload.');
    await page.keyboard.press('Escape'); await inspector.waitFor({ state: 'hidden' });
    await eventually(() => opener.evaluate(element => element === document.activeElement), 'Inspector Escape restores actual opener focus');
    await page.reload(); await page.locator('.board-pin').waitFor();
    ok((await storage(page, CASEBOOK_KEY)).pins[0].note.includes('Preserve this analyst'), 'Analyst note survives reload');
    const packet = await download(page); ok(packet.sources.length > 0 && packet.casebook.pins.length === 1 && packet.boardLayout.version === 1, 'Export includes source packet, casebook and board layout');
  });

  await scenario('notebook-shared-state-saved-view-and-reading-brief', { book: bookOf(pin(recordA, 'A labelled analyst note')) }, async page => {
    await openBoard(page, '?view=list&q=retained-search');
    await page.getByRole('button', { name: 'Notes & exports', exact: true }).click(); const notebook = page.locator('.board-notebook');
    await notebook.getByLabel('Question or hypothesis', { exact: true }).fill('Which independent record would resolve this?');
    await notebook.getByLabel('What would close or disprove this question?', { exact: true }).fill('A complete signed source ledger.');
    await notebook.getByLabel('View label', { exact: true }).fill('Retained list and search');
    await notebook.getByRole('button', { name: 'Save this view', exact: true }).click();
    const saved = await storage(page, CASEBOOK_KEY); const url = new URL(saved.views[0].url.slice(1), 'https://application.invalid');
    ok(url.searchParams.get('view') === 'list' && url.searchParams.get('q') === 'retained-search', 'Saved board view retains mode and search');
    ok(await page.getByLabel('Evidence that would close this question', { exact: true }).inputValue() === 'A complete signed source ledger.', 'Notebook and board share one falsifier');
    const pending = page.waitForEvent('download'); await notebook.getByRole('button', { name: 'Export reading brief', exact: true }).click();
    const markdown = readFileSync(await (await pending).path(), 'utf8');
    ok(markdown.includes('Analyst note (user-entered)') && markdown.includes('A labelled analyst note') && markdown.includes('Source ledger'), 'Existing reading-brief export keeps analyst labels and sources');
    await notebook.getByRole('button', { name: 'Inspect source record', exact: true }).click(); await page.locator('.board-inspector').waitFor({ state: 'visible' });
    await page.keyboard.press('Escape');
    await eventually(() => notebook.getByRole('button', { name: 'Inspect source record', exact: true }).evaluate(element => element === document.activeElement), 'Notebook inspection returns focus to its own initiator');
  });

  await scenario('notebook-removal-cleans-stale-position-capacity', { book: bookOf(pin(recordA)), layout: { ...emptyBoardLayout(), positions: { [recordKey(recordA)]: { x: 80, y: 100 } } } }, async page => {
    await openBoard(page); await page.getByRole('button', { name: 'Notes & exports', exact: true }).click();
    await page.locator('.board-notebook').getByRole('button', { name: `Remove ${recordA.title} from casebook`, exact: true }).click();
    await eventually(async () => (await storage(page, CASEBOOK_KEY)).pins.length === 0, 'Notebook removes the shared pin');
    await eventually(async () => !(await storage(page, BOARD_LAYOUT_KEY))?.positions?.[recordKey(recordA)], 'Notebook removal releases stale board position capacity');
  });

  await scenario('cross-tab-storage-updates-are-observed', { book: bookOf(pin(recordA)) }, async (page, context) => {
    await openBoard(page); const other = await context.newPage(); await openBoard(other);
    const nextBook = bookOf(pin(recordA, 'Changed in another tab'), pin(recordB));
    const nextLayout = { ...emptyBoardLayout(), positions: { [recordKey(recordA)]: { x: 140, y: 160 } }, threads: [thread()] };
    await other.evaluate(({ casebookKey, layoutKey, nextBook, nextLayout }) => { localStorage.setItem(casebookKey, JSON.stringify(nextBook)); localStorage.setItem(layoutKey, JSON.stringify(nextLayout)); }, { casebookKey: CASEBOOK_KEY, layoutKey: BOARD_LAYOUT_KEY, nextBook, nextLayout });
    await eventually(async () => await page.locator('.board-pin').count() === 2, 'Another tab casebook change reaches this board');
    await eventually(async () => (await stylePosition(page.locator('.board-pin').first())).x === 140, 'Another tab layout change reaches this board');
    ok((await page.locator('.board-connection-ledger').innerText()).includes(thread().note), 'Cross-tab thread note is visible');
    await other.close();
  });

  await scenario('movement-pointer-keyboard-buttons-persistence', { book: bookOf(pin(recordA)), layout: { ...emptyBoardLayout(), positions: { [recordKey(recordA)]: { x: 80, y: 100 } } } }, async page => {
    await openBoard(page); const card = page.locator('.board-pin').first(); const grip = card.locator('.board-pin-grip');
    await grip.focus(); await page.keyboard.press('ArrowRight');
    await eventually(async () => (await stylePosition(card)).x === 104, 'Arrow key moves 24px');
    await page.keyboard.press('Shift+ArrowDown');
    await eventually(async () => (await stylePosition(card)).y === 196, 'Shift arrow moves 96px');
    const initial = await stylePosition(card); const bounds = await grip.boundingBox(); assert.ok(bounds);
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2); await page.mouse.down();
    await page.mouse.move(bounds.x + bounds.width / 2 + 65, bounds.y + bounds.height / 2 + 50, { steps: 5 }); await page.mouse.up();
    await eventually(async () => { const point = await stylePosition(card); return Math.abs(point.x - initial.x - 65) < 2 && Math.abs(point.y - initial.y - 50) < 2; }, 'Pointer drag moves the card');
    await card.locator('.board-pin-content').click(); const inspector = page.locator('.board-inspector'); const before = await stylePosition(card);
    await inspector.getByRole('button', { name: 'Move pin right', exact: true }).click();
    await inspector.getByRole('button', { name: 'Move pin down', exact: true }).click(); await page.keyboard.press('Escape');
    const after = await stylePosition(card); ok(after.x === before.x + 24 && after.y === before.y + 24, 'Arrow buttons provide equivalent movement');
    await page.reload(); await card.waitFor(); assert.deepEqual(await stylePosition(card), after); checkCount += 1;
    const saved = await storage(page, BOARD_LAYOUT_KEY); assert.deepEqual(saved.positions[recordKey(recordA)], after); checkCount += 1;
  });

  await scenario('typed-threads-rejections-and-separate-source-semantics', { book: bookOf(pin(recordA), pin(recordB)) }, async page => {
    await openBoard(page); await page.getByRole('button', { name: 'Connect pins', exact: true }).click();
    const form = page.locator('.board-thread-form');
    await form.getByLabel('From', { exact: true }).selectOption(recordKey(recordA)); await form.getByLabel('To', { exact: true }).selectOption(recordKey(recordA));
    await form.getByRole('button', { name: 'Add thread', exact: true }).click();
    ok((await page.locator('.board-status').innerText()).includes('two different'), 'Self-thread is rejected with an explanation');
    ok((await storage(page, BOARD_LAYOUT_KEY))?.threads?.length !== 1, 'Invalid connection does not persist');
    await form.getByLabel('To', { exact: true }).selectOption(recordKey(recordB)); await form.getByLabel('Purpose', { exact: true }).selectOption('counter-evidence');
    await form.getByLabel('What would you check?').fill('Locate the final order before reaching a conclusion.');
    await form.getByRole('button', { name: 'Add thread', exact: true }).click();
    await eventually(async () => (await storage(page, BOARD_LAYOUT_KEY))?.threads?.length === 1, 'Typed annotation is persisted');
    ok((await page.locator('.board-connection-ledger').innerText()).includes('Analyst'), 'Ledger labels annotation as analyst-entered');
    await page.getByRole('button', { name: 'Connect pins', exact: true }).click(); await form.getByRole('button', { name: 'Add thread', exact: true }).click();
    ok((await page.locator('.board-status').innerText()).includes('already'), 'Duplicate typed endpoint connection is rejected');
    ok((await storage(page, BOARD_LAYOUT_KEY)).threads.length === 1, 'Duplicate rejection keeps exactly one thread');
    await form.getByRole('button', { name: 'Cancel', exact: true }).click();
    const secondPinGrip = page.locator('.board-pin-grip').nth(1); await secondPinGrip.focus();
    await page.keyboard.press('Shift+ArrowRight'); await page.keyboard.press('Shift+ArrowRight'); await page.keyboard.press('Shift+ArrowDown');
    await eventually(async () => await page.locator('.board-wool-thread').count() === 1, 'The saved analyst annotation renders one wool thread');
    ok((await page.locator('.board-legend').innerText()).includes('Depth and proximity carry no evidential meaning.'), 'Visible legend distinguishes arrangement from evidence');
    await page.locator('.board-stage').evaluate(element => element.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await capture(page, 'board-threads-1280.png');
    const packet = await download(page); const analyst = packet.boardLayout.threads[0];
    ok(!packet.relationships.some(row => row.id === analyst.id), 'Analyst thread does not enter source relationships');
    ok(packet.limitations.some(text => text.includes('not source assertions')), 'Export explains analyst-vs-source semantics');
    await page.reload(); await page.locator('.board-connection-ledger').waitFor();
    ok((await page.locator('.board-connection-ledger').innerText()).includes('Locate the final order'), 'Thread note survives reload');
  });

  await scenario('sourced-links-read-only-and-inspectable', { book: (() => { const edge = registry.relationships.find(row => row.from !== row.to && row.sourceIds.length); assert.ok(edge); return bookOf({ kind: 'entity', id: edge.from, note: '', addedAt: '' }, { kind: 'entity', id: edge.to, note: '', addedAt: '' }); })() }, async page => {
    await openBoard(page); const ledger = page.locator('.board-connection-ledger'); await ledger.waitFor();
    ok((await ledger.innerText()).includes('Sourced'), 'Pinned identities expose original sourced relationships');
    ok(await page.locator('.board-sourced-edge').count() > 0, 'Sourced relationship lines have their own visual class');
    await ledger.getByRole('button', { name: 'Inspect sources', exact: true }).first().click();
    await page.locator('.board-inspector').waitFor({ state: 'visible' });
    ok(await page.locator('.board-source-list a').count() > 0, 'Source connection opens source ledger'); await page.keyboard.press('Escape');
    await page.getByLabel('Sourced links between pinned identities').uncheck();
    ok(await page.locator('.board-sourced-edge').count() === 0, 'Source-link visibility toggle works');
    ok((await storage(page, BOARD_LAYOUT_KEY))?.threads?.length !== 1, 'Toggling or inspecting sourced links does not create analyst annotations');
  });

  await scenario('list-source-links-include-pins-beyond-canvas-limit', { book: (() => {
    const edge = registry.relationships.find(row => row.from !== row.to && row.sourceIds.length); assert.ok(edge);
    return bookOf(...registry.records.slice(0, 60).map(record => pin(record)), { kind: 'entity', id: edge.from, note: '', addedAt: '' }, { kind: 'entity', id: edge.to, note: '', addedAt: '' });
  })() }, async page => {
    await openBoard(page, '?view=list'); ok(await page.locator('.board-pin').count() === 62, 'List includes both identities after the first 60 pins');
    ok(await page.locator('.board-connection-ledger').getByRole('button', { name: 'Inspect sources', exact: true }).count() > 0, 'List includes sourced connections for every visible list identity');
  });

  await scenario('restore-is-additive-and-invalid-files-are-atomic', { book: { ...bookOf(pin(recordA, 'Keep current note')), title: 'Current title', question: 'Keep current question', falsifier: 'Keep current falsifier' }, layout: { ...emptyBoardLayout(), positions: { [recordKey(recordA)]: { x: 80, y: 100 } } } }, async page => {
    await openBoard(page);
    const incoming = { casebook: { ...bookOf(pin(recordA, 'Conflicting note'), pin(recordB, 'Incoming retained note')), title: 'Incoming title' }, boardLayout: { version: 1, positions: { [recordKey(recordA)]: { x: 300, y: 300 }, [recordKey(recordB)]: { x: 400, y: 300 } }, threads: [thread()] } };
    await upload(page, incoming); await eventually(async () => (await storage(page, CASEBOOK_KEY))?.pins.length === 2, 'Restore adds new pins');
    const current = await storage(page, CASEBOOK_KEY); const board = await storage(page, BOARD_LAYOUT_KEY);
    ok(current.title === 'Current title' && current.question === 'Keep current question' && current.falsifier === 'Keep current falsifier' && current.pins[0].note === 'Keep current note', 'Restore preserves current authored content');
    assert.deepEqual(board.positions[recordKey(recordA)], { x: 80, y: 100 }); checkCount += 1;
    await upload(page, incoming); ok((await storage(page, CASEBOOK_KEY)).pins.length === 2 && (await storage(page, BOARD_LAYOUT_KEY)).threads.length === 1, 'Repeated restore is idempotent');
    const beforeBook = await storage(page, CASEBOOK_KEY); const beforeLayout = await storage(page, BOARD_LAYOUT_KEY);
    for (const value of ['{broken JSON', { casebook: bookOf(pin(recordC)), boardLayout: { version: 99, positions: {}, threads: [] } }, { casebook: bookOf(pin(recordC)), boardLayout: { version: 1, positions: Object.fromEntries(Array.from({ length: 251 }, (_, i) => [`record:${i}`, { x: 20, y: 30 }])), threads: [] } }]) {
      await upload(page, value); await eventually(async () => (await page.getByLabel('Import a board backup').inputValue()) === '', 'File input resets after failed restore');
      assert.deepEqual(await storage(page, CASEBOOK_KEY), beforeBook); assert.deepEqual(await storage(page, BOARD_LAYOUT_KEY), beforeLayout); checkCount += 2;
    }
    await upload(page, Buffer.alloc(16 * 1024 * 1024 + 1, 32).toString(), 'oversized.json');
    ok((await page.locator('.board-status').innerText()).includes('16 MiB'), 'Oversized backup is rejected before parsing');
    assert.deepEqual(await storage(page, CASEBOOK_KEY), beforeBook); assert.deepEqual(await storage(page, BOARD_LAYOUT_KEY), beforeLayout); checkCount += 2;
    const exported = await download(page); ok(exported.casebook.pins.length === 2 && exported.boardLayout.threads.length === 1, 'Export after restore keeps complete merged state');
  });

  await scenario('restore-keeps-edits-made-during-file-read', { book: bookOf(pin(recordA)), layout: { ...emptyBoardLayout(), positions: { [recordKey(recordA)]: { x: 80, y: 100 } } } }, async page => {
    await openBoard(page);
    await page.evaluate(() => { const original = File.prototype.text; File.prototype.text = function () { const file = this; return new Promise(resolve => { window.releaseBoardImport = async () => resolve(await original.call(file)); }); }; });
    await upload(page, { casebook: bookOf(pin(recordB)), boardLayout: emptyBoardLayout() }, 'delayed-backup.json', false);
    const grip = page.locator('.board-pin-grip').first(); await grip.focus(); await page.keyboard.press('ArrowRight');
    await eventually(async () => (await storage(page, BOARD_LAYOUT_KEY)).positions[recordKey(recordA)].x === 104, 'Concurrent movement persisted before import finishes');
    await page.evaluate(() => window.releaseBoardImport());
    await eventually(async () => (await storage(page, CASEBOOK_KEY)).pins.length === 2, 'Delayed import finishes');
    ok((await storage(page, BOARD_LAYOUT_KEY)).positions[recordKey(recordA)].x === 104, 'Delayed restore uses latest layout instead of overwriting newer movement');
  });

  await scenario('unavailable-pins-remain-readable-and-removal-cleans-layout', { book: bookOf({ kind: 'record', id: 'unknown-snapshot-id', note: 'Preserve unavailable research note', addedAt: '' }), layout: { ...emptyBoardLayout(), positions: { 'record:unknown-snapshot-id': { x: 80, y: 100 } } } }, async page => {
    await openBoard(page); await page.locator('.board-pin-content').click(); const dialog = page.locator('.board-inspector');
    ok((await dialog.innerText()).includes('no longer available'), 'Unknown identifier is explained without deleting it');
    ok(await dialog.getByLabel('Your analyst note').inputValue() === 'Preserve unavailable research note', 'Unknown pin retains its analyst note');
    await dialog.getByRole('button', { name: 'Remove this pin', exact: true }).click();
    await eventually(async () => (await storage(page, CASEBOOK_KEY)).pins.length === 0, 'Explicit removal updates casebook');
    ok(!(await storage(page, BOARD_LAYOUT_KEY))?.positions?.['record:unknown-snapshot-id'], 'Removed pin no longer consumes position capacity');
  });

  for (const width of [1280, 1600]) {
    await scenario(`capacity-250-list-and-canvas-${width}`, { book: bookOf(...capacityRecords.map(record => pin(record, 'Retain the source, dates, limitations and a counter-evidence question.'))) }, async page => {
      await openBoard(page); ok(await page.locator('.board-pin').count() === 60, 'Initial canvas is bounded to 60 pins');
      await capture(page, `board-populated-${width}.png`);
      while (await page.getByRole('button', { name: 'Show 60 more', exact: true }).count()) await page.getByRole('button', { name: 'Show 60 more', exact: true }).click();
      ok(await page.locator('.board-pin').count() === 250, 'Canvas can reveal every retained pin');
      const beforeArrange = await storage(page, CASEBOOK_KEY);
      await page.locator('.board-toolbar').getByRole('button', { name: 'Arrange', exact: true }).click();
      const geometry = await page.locator('.board-pin').evaluateAll(cards => {
        const rects = cards.map((card, index) => { const rect = card.getBoundingClientRect(); return { index, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, height: rect.height }; });
        const overlaps = [];
        for (let i = 0; i < rects.length; i += 1) for (let j = i + 1; j < rects.length; j += 1) {
          const a = rects[i], b = rects[j];
          if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5) overlaps.push([a.index, b.index]);
        }
        const stage = document.querySelector('.board-stage').getBoundingClientRect();
        const clipped = rects.filter(rect => rect.left < stage.left - 1 || rect.right > stage.right + 1 || rect.top < stage.top - 1 || rect.bottom > stage.bottom + 1).map(rect => rect.index);
        return { overlaps, clipped, maximumCardHeight: Math.max(...rects.map(rect => rect.height)) };
      });
      ok(geometry.overlaps.length === 0, `${width}px Arrange avoids card-to-card overlap for 250 long-title pins with notes: ${JSON.stringify(geometry)}`);
      ok(geometry.clipped.length === 0, `${width}px Arrange keeps every card inside the canvas: ${JSON.stringify(geometry)}`);
      assert.deepEqual(await storage(page, CASEBOOK_KEY), beforeArrange); checkCount += 1;
      const positions = await page.locator('.board-pin').evaluateAll(cards => cards.map(card => `${card.style.left}:${card.style.top}`));
      ok(new Set(positions).size === 250, 'All 250 cards have distinct default positions'); await noOverflow(page, `${width}px full canvas`);
      await page.locator('.board-toolbar').getByRole('button', { name: 'List', exact: true }).click();
      await settledBoardMode(page, 'list');
      ok(new URL(page.url()).hash.includes('view=list'), 'List mode persists in URL'); ok(await page.locator('.board-pin').count() === 250, 'List exposes every pin'); await noOverflow(page, `${width}px full list`);
      await page.locator('.board-toolbar').getByRole('button', { name: 'Board', exact: true }).click();
      await settledBoardMode(page, 'board'); await page.goBack();
      await settledBoardMode(page, 'list'); await page.locator('.board-stage.is-list').waitFor(); ok(await page.locator('.board-pin').count() === 250, 'Back restores list mode with all saved pins');
      await capture(page, `board-list-${width}.png`);
    }, { width });
  }

  await scenario('storage-denial-is-explicit-and-export-retains-in-tab-work', { book: bookOf(pin(recordA)) }, async page => {
    await openBoard(page); await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('Storage unavailable', 'QuotaExceededError'); }; });
    await page.locator('.board-pin-grip').focus(); await page.keyboard.press('ArrowRight');
    ok((await page.locator('.board-status').innerText()).includes('only in this tab'), 'Layout storage failure is explicit');
    const packet = await download(page); ok(packet.casebook.pins.length === 1 && packet.boardLayout.positions[recordKey(recordA)], 'Export retains in-memory layout after denied storage write');
  });

  await scenario('malformed-saved-layout-does-not-erase-casebook', { book: bookOf(pin(recordA, 'Retained despite malformed layout')), layout: '{broken' }, async page => {
    await openBoard(page); ok((await page.locator('.board-status').innerText()).length > 0, 'Unreadable layout is disclosed');
    ok((await storage(page, CASEBOOK_KEY)).pins[0].note === 'Retained despite malformed layout', 'Unreadable layout does not erase casebook');
    ok(await page.evaluate(key => localStorage.getItem(key), BOARD_LAYOUT_KEY) === '{broken', 'Initial failed read does not overwrite raw saved layout');
    const packet = await download(page); ok(packet.casebook.pins[0].note === 'Retained despite malformed layout', 'Casebook remains exportable after invalid layout');
  });

  await scenario('malformed-casebook-does-not-prune-intact-layout', { book: '{malformed', layout: { ...emptyBoardLayout(), positions: { [recordKey(recordA)]: { x: 80, y: 100 } }, threads: [thread()] } }, async page => {
    await openBoard(page); ok((await page.locator('.board-status').innerText()).length > 0, 'Unreadable casebook is disclosed');
    ok(await page.evaluate(key => localStorage.getItem(key), CASEBOOK_KEY) === '{malformed', 'Unreadable casebook raw backup is not overwritten on load');
    const retained = await storage(page, BOARD_LAYOUT_KEY);
    ok(retained.positions[recordKey(recordA)].x === 80 && retained.threads.length === 1, 'Fallback empty casebook cannot automatically prune intact layout or notes');
  });

  await scenario('tutorial-integration-dismiss-resume-and-reduced-motion', { book: bookOf(pin(recordA, 'Research must not change')), layout: { ...emptyBoardLayout(), threads: [] } }, async page => {
    await openBoard(page, '?q=retained-query'); const beforeBook = await storage(page, CASEBOOK_KEY); const beforeLayout = await storage(page, BOARD_LAYOUT_KEY);
    const launcher = page.getByRole('button', { name: 'Open help, page guides and tutorials', exact: true });
    await launcher.waitFor(); ok(!(await page.locator('.tutorial-dialog').isVisible()), 'Tutorial never opens automatically');
    await launcher.click(); const dialog = page.locator('.tutorial-dialog'); await dialog.waitFor({ state: 'visible' });
    await capture(page, 'board-help-1280.png');
    await dialog.getByRole('button', { name: 'Guide this page', exact: true }).click();
    ok(await dialog.getAttribute('data-mode') === 'tour', 'Board-specific guide opens'); await dialog.getByRole('button', { name: 'Next', exact: true }).click();
    await tutorialTargetGeometry(page, 'board-step-2-1280');
    await capture(page, 'board-tutorial-1280.png');
    await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' });
    await eventually(() => launcher.evaluate(element => element === document.activeElement), 'Escape restores Help focus');
    const progress = await storage(page, 'fieldwork-tutorial:v1'); ok(progress.tours['page:board'].step === 1 && progress.tours['page:board'].status === 'paused', 'Escape persists paused progress separately');
    await launcher.click(); await dialog.getByRole('button', { name: 'Resume', exact: true }).click();
    ok((await dialog.locator('.tutorial-progress').innerText()).includes('Step 2'), 'Resume continues the saved step');
    while (await dialog.getByRole('button', { name: 'Next', exact: true }).count()) await dialog.getByRole('button', { name: 'Next', exact: true }).click();
    await dialog.getByRole('button', { name: 'Finish', exact: true }).click();
    ok(await dialog.getAttribute('data-mode') === 'complete', 'Board guide can finish');
    await dialog.getByRole('button', { name: 'Replay', exact: true }).click();
    ok((await dialog.locator('.tutorial-progress').innerText()).includes('Step 1'), 'Replay resets to the first step');
    await dialog.getByRole('button', { name: 'Skip tour', exact: true }).click(); await dialog.waitFor({ state: 'hidden' });
    ok(await page.locator('[data-tutorial-highlight]').count() === 0, 'Dismissal removes all highlights');
    assert.deepEqual(await storage(page, CASEBOOK_KEY), beforeBook); assert.deepEqual(await storage(page, BOARD_LAYOUT_KEY), beforeLayout); checkCount += 2;
    ok(new URL(page.url()).hash.includes('q=retained-query'), 'Page guide preserves existing board query');
    ok(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), 'Browser requests reduced motion');
    const motion = await page.locator('.case-board-page *').evaluateAll(elements => elements.map(element => { const style = getComputedStyle(element); return { animation: style.animationName, transition: style.transitionDuration, scroll: style.scrollBehavior }; }));
    ok(motion.every(style => style.animation === 'none' && style.transition.split(',').every(value => Number.parseFloat(value) === 0) && style.scroll !== 'smooth'), 'Reduced-motion board disables motion and smooth scrolling');
  });

  await scenario('tutorial-mobile-target-remains-readable', {}, async page => {
    await openBoard(page); await page.getByRole('button', { name: 'Open help, page guides and tutorials', exact: true }).click();
    const dialog = page.locator('.tutorial-dialog'); await dialog.getByRole('button', { name: 'Guide this page', exact: true }).click();
    await dialog.getByRole('button', { name: 'Next', exact: true }).click();
    await tutorialTargetGeometry(page, 'board-step-2-mobile-390', false);
    await capture(page, 'board-tutorial-mobile-390.png');
    await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' });
  }, { width: 390, height: 844 });

  for (const width of [1280, 1600]) {
    await scenario(`representative-retained-react-desktop-${width}`, {}, async page => {
      for (const [name, route, ready] of [
        ['atlas', '/investigate', '[data-investigation-workspace]'],
        ['education-dossier', '/education?iw_view=dossier', '.iw-dossier-content h1'],
        ['money-trails', '/money-trails', '.money-trails h1'],
        ['research-program', '/research-program', '.rp-desk h1'],
      ]) {
        await page.goto(`${base}/#${route}`); await page.locator(ready).first().waitFor({ timeout: 60000 });
        await page.evaluate(() => document.fonts.ready); await noOverflow(page, `${width}px retained ${name}`);
        await capture(page, `retained-${name}-${width}.png`);
      }
    }, { width });
    await scenario(`retained-static-apps-and-help-desktop-${width}`, {}, async page => {
      for (const name of ['index', 'finance', 'media']) {
        await page.goto(`${base}/global-workbench/${name}.html`);
        await page.waitForFunction(() => document.querySelector('#records')?.childElementCount > 0, null, { timeout: 60000 });
        ok(!(await page.locator('#error').isVisible()), `Static ${name} loaded its retained data`);
        await page.evaluate(() => document.fonts.ready); await noOverflow(page, `${width}px static ${name}`);
        await capture(page, `static-${name}-${width}.png`);
        const opener = page.locator('.fw-tutorial-launcher'); await opener.click();
        const dialog = page.locator('.fw-tutorial-dialog'); await dialog.waitFor({ state: 'visible' });
        await capture(page, `static-${name}-help-${width}.png`);
        ok((await dialog.innerText()).includes('Guide this page'), `Static ${name} retains contextual Help`);
        await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' });
        await eventually(() => opener.evaluate(element => element === document.activeElement), `Static ${name} Help restores its opener`);
      }
    }, { width });
  }

  await scenario('all-retained-routes-and-query-history-smoke', {}, async page => {
    const company = registry.entities.find(row => row.namespace === 'legacy' && row.originalId.startsWith('co:') && row.resolved);
    const group = registry.entities.find(row => row.namespace === 'legacy' && row.originalId.startsWith('grp:') && row.resolved);
    assert.ok(company && group);
    for (const pattern of legacyRoutes) {
      const route = pattern === '/states/:code' ? '/states/ka' : pattern === '/company/:id' ? `/company/${encodeURIComponent(company.originalId.slice(3))}` : pattern === '/conglomerates/:id' ? `/conglomerates/${encodeURIComponent(group.originalId.slice(4))}` : pattern;
      await page.goto(`${base}/#${route}`); await page.locator('main').waitFor();
      await eventually(async () => (await page.locator('main').innerText()).trim().length > 50 && !(await page.locator('main').innerText()).trim().match(/^Loading…?$/u), `Retained route renders content: ${route}`, 60000);
      ok(await page.locator('.case-board-page').count() === 0, `Legacy route is not replaced by board: ${route}`);
    }
    await openBoard(page); await page.locator('.board-toolbar').getByRole('button', { name: 'List', exact: true }).click(); await settledBoardMode(page, 'list'); await page.goBack();
    await settledBoardMode(page, 'board'); await eventually(async () => !(new URL(page.url()).hash.includes('view=list')), 'Back restores board query state');
  });
} finally {
  if (browser) await browser.close();
  if (server) await new Promise(done => server.close(done));
  const missingArtifacts = expectedScreenshots.filter(name => !screenshots.some(row => row.name === name) || !existsSync(resolve(output, name)) || statSync(resolve(output, name)).size === 0);
  results.push({ name: 'required-desktop-screenshot-artifacts', status: missingArtifacts.length ? 'failed' : 'passed', missingArtifacts });
  writeFileSync(resolve(output, 'layout-diagnostics.json'), `${JSON.stringify(layoutDiagnostics, null, 2)}\n`);
  const manifest = { generatedAt: new Date().toISOString(), expected: expectedScreenshots, captured: screenshots, missing: missingArtifacts };
  writeFileSync(resolve(output, 'screenshots.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  const report = { generatedAt: new Date().toISOString(), base, screenshotCount: screenshots.length, expectedScreenshotCount: expectedScreenshots.length, passed: results.length > 0 && results.every(row => row.status === 'passed'), scenarios: results.length, checks: checkCount, results };
  writeFileSync(resolve(output, 'results.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report));
}
if (results.some(row => row.status === 'failed')) process.exitCode = 1;
