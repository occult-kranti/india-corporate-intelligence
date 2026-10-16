/** GitHub-CI-only checks of the actual combined root + /spatial/ build. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, realpath, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

if (process.env.GITHUB_ACTIONS !== 'true' || process.env.SPATIAL_RELEASE_REVIEW !== 'github-actions') {
  throw new Error('Combined release browser review is restricted to GitHub Actions. No local browser was launched.');
}
// Deliberately import the browser runtime only after the CI-only authorization guard.
const { chromium } = await import('playwright');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
execFileSync(process.execPath, [join(root, 'scripts/spatial-release-validate.mjs'), '--verify-combined'], { cwd: root, stdio: 'inherit' });
const dist = await realpath(join(root, 'dist'));
const output = join(root, 'spatial-release-review');
await mkdir(output, { recursive: true });
const base = '/india-corporate-intelligence/';
const spatial = `${base}spatial/`;
const registryDirectory = join(dist, 'spatial/data/registry');
const manifestBytes = await readFile(join(registryDirectory, 'manifest.json'));
const manifest = JSON.parse(manifestBytes);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const expectedData = new Map([[`${spatial}data/registry/manifest.json`, { sha256: hash(manifestBytes), bytes: manifestBytes.length }]]);
const registry = Object.fromEntries(manifest.topLevelKeys.map(key => [key, key === 'updatedAt' ? manifest.metadata.updatedAt : []]));
for (const group of manifest.arrays) for (const chunk of group.chunks) {
  expectedData.set(`${spatial}data/registry/${chunk.file}`, chunk);
  registry[group.key].push(...JSON.parse(await readFile(join(registryDirectory, chunk.file))));
}

const report = {
  startedAt: new Date().toISOString(), commit: process.env.GITHUB_SHA ?? null,
  headCommit: process.env.SPATIAL_HEAD_SHA ?? null, basePath: base,
  snapshotSha256: manifest.sourceSnapshot.sha256, manifestSha256: hash(manifestBytes),
  counts: manifest.counts, scenarios: [], serverRequests: [],
  scope: 'Combined output navigation and immutable-source checks. CI screenshots require visual/interaction inspection; this is not deployment approval or a device performance benchmark.',
};
let browser;
let server;
let origin;
const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.geojson': 'application/geo+json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.wasm': 'application/wasm', '.txt': 'text/plain; charset=utf-8',
};

async function startServer() {
  server = createServer(async (request, response) => {
    const entry = { method: request.method, url: request.url, status: 500 };
    report.serverRequests.push(entry);
    const send = (status, body) => {
      entry.status = status;
      response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end(body);
    };
    try {
      if (!['GET', 'HEAD'].includes(request.method)) return send(405, 'Read-only review');
      const pathname = decodeURIComponent((request.url ?? '/').split('?')[0]);
      if (pathname.includes('\0') || pathname.includes('\\') || pathname.split('/').some(part => part === '..' || part === '.')) return send(403, 'Forbidden path');
      if (!pathname.startsWith(base)) return send(404, 'Outside the published repository path');
      const suffix = pathname.slice(base.length);
      const candidate = resolve(dist, suffix || 'index.html');
      const outside = path => { const rel = relative(dist, path); return rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel); };
      if (outside(candidate)) return send(403, 'Forbidden path');
      let canonical = await realpath(candidate);
      if (outside(canonical)) return send(403, 'Forbidden path');
      let info = await stat(canonical);
      if (info.isDirectory()) {
        if (!pathname.endsWith('/')) {
          entry.status = 308;
          response.writeHead(308, { Location: `${pathname}/`, 'Cache-Control': 'no-store' });
          response.end();
          return;
        }
        canonical = await realpath(join(canonical, 'index.html'));
        if (outside(canonical)) return send(403, 'Forbidden path');
        info = await stat(canonical);
      }
      if (!info.isFile()) return send(404, 'Not a file');
      entry.status = 200;
      response.writeHead(200, { 'Content-Type': mime[extname(canonical)] ?? 'application/octet-stream', 'Content-Length': info.size, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      if (request.method === 'HEAD') return response.end();
      createReadStream(canonical).on('error', () => response.destroy()).pipe(response);
    } catch (error) { send(error instanceof URIError ? 400 : error.code === 'ENOENT' ? 404 : 500, 'Review file request failed'); }
  });
  await new Promise((resolveReady, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolveReady); });
  origin = `http://127.0.0.1:${server.address().port}`;
}

async function until(check, message, timeout = 45000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (await check()) return; await delay(80); }
  throw new Error(message);
}
async function capture(page, result, name) {
  const file = `${result.name}--${name}.png`;
  await page.screenshot({ path: join(output, file), fullPage: false, animations: 'disabled' });
  result.screenshots.push(file);
}
async function rootReady(page, route) {
  await page.waitForURL(`${origin}${base}#${route}`);
  await page.locator('.site-shell.investigation-shell').waitFor();
  await page.locator('#main-content').waitFor();
  await until(async () => (await page.locator('#main-content').innerText()).trim().length > 50, 'The original workbench content did not render');
  assert.equal(new URL(page.url()).pathname, base);
  assert.equal(new URL(page.url()).hash, `#${route}`);
}
async function fullReady(page, result) {
  await page.locator('[data-registry-dataset="full"][data-registry-state="ready"]').waitFor({ timeout: 60000 });
  const app = page.locator('.evidence-app[data-dataset="full"]');
  await app.waitFor();
  for (const key of ['entities', 'records', 'relationships', 'sources']) assert.equal(Number(await app.getAttribute(`data-loaded-${key}`)), manifest.counts[key]);
  assert.equal(Number(await app.getAttribute('data-held-count')), 316);
  assert.equal(new URL(page.url()).pathname, spatial);
  assert.notEqual(new URL(page.url()).searchParams.get('dataset'), 'preview');
  await until(async () => [...expectedData.keys()].every(path => result.verifiedRegistryPaths.has(path)), 'The browser did not receive every pinned registry file');
  assert.match(await page.locator('.masthead').innerText(), /Complete original registry.*retained snapshot/s);
}

function retainedSourceRouteItems(registry) {
  const held = new Set(registry.held.map(row => row.id));
  return ['/finance', '/energy'].map(route => {
    const item = [...registry.entities, ...registry.records].find(row => row.route === route && row.sourceIds.length && !held.has(row.id) && row.status !== 'not-drawn');
    assert.ok(item, `No retained source-backed test item at ${route}`);
    return item;
  });
}

function readMapViewport() {
  const host = document.querySelector('.webgl-host');
  const canvas = host?.querySelector('canvas');
  const sample = element => {
    if (!element) return null;
    const style = getComputedStyle(element);
    return { ...element.getBoundingClientRect().toJSON(), visible: style.display !== 'none' && style.visibility === 'visible' && Number(style.opacity) > 0 };
  };
  return {
    viewport: { width: innerWidth, height: innerHeight }, host: sample(host), canvas: sample(canvas),
    canvasWidth: canvas?.width ?? 0, canvasHeight: canvas?.height ?? 0,
    renderer: host?.dataset.renderer, drawCalls: Number(host?.dataset.drawCalls ?? 0),
    countryBaseFeatures: Number(host?.dataset.countryBaseFeatures ?? 0),
  };
}

function mapViewportIsReady(frame) {
  const { viewport, host, canvas } = frame;
  return Boolean(
    frame.countryBaseFeatures > 0 && frame.renderer === 'maplibre-three-mercator' && frame.drawCalls > 0 &&
    frame.canvasWidth > 0 && frame.canvasHeight > 0 && host?.visible && canvas?.visible &&
    host.width >= viewport.width * 0.9 && host.height >= viewport.height * 0.9 &&
    host.x >= -2 && host.y >= -2 && host.right <= viewport.width + 2 && host.bottom <= viewport.height + 2 &&
    Math.abs(canvas.width - host.width) <= 4 && Math.abs(canvas.height - host.height) <= 4 &&
    Math.abs(canvas.x - host.x) <= 2 && Math.abs(canvas.y - host.y) <= 2
  );
}

async function captureFullMap(page, result, name) {
  let frame;
  await until(async () => {
    frame = await page.evaluate(readMapViewport);
    return mapViewportIsReady(frame);
  }, 'No populated country base with a visible viewport-sized map host/canvas was observed', 60000);
  (result.mapCaptures ??= []).push({ capture: name, ...frame });
  await capture(page, result, name);
}

async function scenario(name, viewport, work) {
  const result = { name, viewport, status: 'running', screenshots: [], pageErrors: [], responses: [], failedRequests: [], verifiedRegistryPaths: new Set(), verificationErrors: [] };
  report.scenarios.push(result);
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce', deviceScaleFactor: 1 });
  context.setDefaultTimeout(45000);
  const page = await context.newPage();
  const pending = new Set();
  page.on('pageerror', error => result.pageErrors.push(error.stack ?? error.message));
  page.on('requestfailed', request => result.failedRequests.push({ url: request.url(), type: request.resourceType(), error: request.failure()?.errorText }));
  page.on('response', response => {
    const url = new URL(response.url());
    if (url.origin !== origin) return;
    const record = { url: response.url(), status: response.status(), type: response.request().resourceType(), contentType: response.headers()['content-type'] ?? '' };
    result.responses.push(record);
    const expected = expectedData.get(url.pathname);
    if (expected) {
      const verification = response.body().then(bytes => {
        assert.equal(response.status(), 200, url.pathname);
        assert.match(record.contentType, /application\/json/, url.pathname);
        assert.equal(bytes.length, expected.bytes, url.pathname);
        assert.equal(hash(bytes), expected.sha256, url.pathname);
        result.verifiedRegistryPaths.add(url.pathname);
      }).catch(error => result.verificationErrors.push(error.message)).finally(() => pending.delete(verification));
      pending.add(verification);
    }
  });
  let deadline;
  try {
    await Promise.race([work(page, result), new Promise((_, reject) => { deadline = setTimeout(() => reject(new Error('Combined navigation scenario exceeded 150 seconds')), 150000); })]);
    await Promise.all([...pending]);
    assert.deepEqual(result.verificationErrors, [], 'Browser-served registry identity failures');
    assert.deepEqual(result.pageErrors, [], 'Unexpected application runtime errors');
    const failedLocal = result.responses.filter(response => response.status >= 400 && !new URL(response.url).pathname.endsWith('/favicon.ico'));
    assert.deepEqual(failedLocal, [], 'Missing combined-output documents or assets');
    const wrongMime = result.responses.filter(response => response.status === 200 && ['script', 'stylesheet'].includes(response.type) && !/javascript|text\/css/.test(response.contentType));
    assert.deepEqual(wrongMime, [], 'A JavaScript/CSS asset received the wrong MIME type');
    const missingLocal = result.failedRequests.filter(request => request.url.startsWith(origin) && !/ERR_ABORTED/.test(request.error ?? ''));
    assert.deepEqual(missingLocal, [], 'Unexpected local request failures');
    result.status = 'passed';
  } catch (error) {
    result.status = 'failed';
    result.error = error.stack ?? error.message;
    await capture(page, result, 'failure').catch(() => {});
  } finally {
    clearTimeout(deadline);
    await context.close();
    await Promise.all([...pending]);
    result.verifiedRegistryPaths = [...result.verifiedRegistryPaths];
    console.log(`${result.status.toUpperCase()}: ${name}`);
  }
}

try {
  await startServer();
  assert.equal((await fetch(`${origin}${base}assets/definitely-missing.js`)).status, 404, 'Missing assets must not receive index.html');
  assert.equal((await fetch(`${origin}${spatial}%2e%2e%2findex.html`)).status, 403);
  browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

  for (const [name, viewport, menu] of [
    ['desktop-workbench-spatial-round-trip', { width: 1440, height: 1000 }, 'Open all lenses and registers'],
    ['mobile-workbench-spatial-round-trip', { width: 390, height: 844 }, 'Open navigation'],
  ]) await scenario(name, viewport, async (page, result) => {
    await page.goto(`${origin}${base}#/investigate`, { waitUntil: 'domcontentloaded' });
    await rootReady(page, '/investigate');
    await page.getByRole('button', { name: menu, exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Explore the atlas' });
    await dialog.waitFor();
    const link = dialog.getByRole('link', { name: 'Spatial evidence atlas', exact: true });
    assert.equal(await link.count(), 1);
    assert.equal(await link.evaluate(element => element.href), `${origin}${spatial}`);
    await link.scrollIntoViewIfNeeded();
    await capture(page, result, 'preserved-navigation-spatial-link');
    if (name.startsWith('desktop')) { await link.focus(); await page.keyboard.press('Enter'); } else await link.click();
    await fullReady(page, result);
    // Registry completion can precede geometry loading and the first map draw.
    await captureFullMap(page, result, 'full-registry-default');
    const back = page.getByRole('link', { name: 'Original investigation pages ↗' });
    assert.equal(await back.evaluate(element => element.href), `${origin}${base}#/investigate`);
    await back.click();
    await rootReady(page, '/investigate');
    await capture(page, result, 'original-workbench-return');
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await fullReady(page, result);
    await captureFullMap(page, result, 'browser-back-to-complete-spatial');
  });

  await scenario('original-item-source-route-round-trips', { width: 1440, height: 1000 }, async (page, result) => {
    for (const item of retainedSourceRouteItems(registry)) {
      await page.goto(`${origin}${spatial}?mode=reading`, { waitUntil: 'domcontentloaded' });
      await fullReady(page, result);
      const search = page.getByRole('textbox', { name: 'Search retained records' });
      await search.fill(item.id);
      const card = page.locator(`.registry-reader [data-record-id=${JSON.stringify(item.id)}]`);
      await card.click();
      const inspector = page.getByRole('complementary', { name: 'Evidence reading panel' });
      await inspector.waitFor();
      const original = inspector.getByRole('link', { name: 'Open this item’s original page' });
      assert.equal(await original.getAttribute('href'), `../#${item.route}`);
      assert.equal(await original.evaluate(element => element.href), `${origin}${base}#${item.route}`);
      await capture(page, result, `${item.route.slice(1)}-source-backed-reader`);
      await original.click();
      await rootReady(page, item.route);
      (result.originalDestinations ??= []).push({ id: item.id, retainedRoute: item.route, url: page.url() });
      await capture(page, result, `${item.route.slice(1)}-actual-original-destination`);
      await page.goBack({ waitUntil: 'domcontentloaded' });
      await fullReady(page, result);
    }
  });

  await scenario('preserved-global-workbench-and-root-routes', { width: 1440, height: 1000 }, async (page, result) => {
    for (const [path, title, heading, script] of [
      ['global-workbench/', 'Fieldwork — Global Evidence Workbench', 'Explore the record.', 'app.js'],
      ['global-workbench/finance.html', 'Fieldwork — Public Assets & Finance', 'Follow the transaction.', 'finance-app.js'],
      ['global-workbench/media.html', 'Fieldwork — Media & power', 'See the structure.', 'media-app.js'],
    ]) {
      const response = await page.goto(`${origin}${base}${path}`, { waitUntil: 'domcontentloaded' });
      assert.equal(response.status(), 200);
      assert.equal(await page.title(), title);
      await page.getByRole('heading', { level: 1 }).waitFor();
      assert.ok((await page.getByRole('heading', { level: 1 }).innerText()).includes(heading));
      await until(async () => result.responses.some(response => new URL(response.url).pathname.endsWith(`/src/${script}`) && response.status === 200), 'Preserved global-workbench script was not served');
      await capture(page, result, path.includes('finance') ? 'preserved-finance' : path.includes('media') ? 'preserved-media' : 'preserved-global-workbench');
    }
    await page.goto(`${origin}${base}#/method`, { waitUntil: 'domcontentloaded' });
    await rootReady(page, '/method');
    await capture(page, result, 'preserved-original-method-route');
    await page.goto(`${origin}${spatial}?dataset=preview&mode=reading`, { waitUntil: 'domcontentloaded' });
    const preview = page.locator('.evidence-app[data-dataset="preview"]');
    await preview.waitFor();
    assert.match(await preview.locator('.masthead').innerText(), /Selected preview subset.*PREVIEW/s);
    assert.equal(Number(await preview.getAttribute('data-loaded-entities')), 36);
    assert.equal(Number(await preview.getAttribute('data-loaded-records')), 12);
    assert.equal(result.responses.filter(response => new URL(response.url).pathname.startsWith(`${spatial}data/registry/`)).length, 0, 'Explicit preview unexpectedly fetched the complete registry');
    await capture(page, result, 'deliberate-preview-remains-labeled');
  });
} catch (error) {
  report.error = error.stack ?? error.message;
} finally {
  await browser?.close().catch(() => {});
  if (server) await new Promise(resolveClosed => server.close(resolveClosed));
  report.finishedAt = new Date().toISOString();
  report.status = !report.error && report.scenarios.length === 4 && report.scenarios.every(result => result.status === 'passed') ? 'passed' : 'failed';
  await writeFile(join(output, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  const lines = [
    '# Combined spatial release review', '', `Status: **${report.status}**`,
    `Commit: ${report.commit}; head: ${report.headCommit}`, `Snapshot SHA-256: ${report.snapshotSha256}`, `Manifest SHA-256: ${report.manifestSha256}`, '',
    ...report.scenarios.map(result => `- ${result.status}: ${result.name} (${result.screenshots.length} screenshots)`), '',
    report.error ? `Setup failure: ${report.error}` : '', report.scope,
  ];
  await writeFile(join(output, 'summary.md'), `${lines.filter(line => line !== undefined).join('\n')}\n`);
  if (report.status !== 'passed') process.exitCode = 1;
}
