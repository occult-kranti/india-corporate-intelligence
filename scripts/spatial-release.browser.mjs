/** GitHub-CI-only checks of the actual combined root + /spatial/ build. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, realpath, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
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
const activity = `${base}research-activity/`;
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

// Vite copies this independent static runtime without transforming it. Check the
// reviewed public source, the built bytes, and actual browser responses separately.
const activityFiles = ['index.html', 'styles.css', 'app.mjs', 'model.mjs', 'snapshot.json'];
const expectedActivityData = new Map();
for (const file of activityFiles) {
  const source = await readFile(join(root, 'public/research-activity', file));
  const built = await readFile(join(dist, 'research-activity', file));
  assert.deepEqual(built, source, `Research activity build/source mismatch: ${file}`);
  const contentType = file.endsWith('.html') ? 'text/html' : file.endsWith('.css') ? 'text/css' : file.endsWith('.json') ? 'application/json' : 'text/javascript';
  expectedActivityData.set(file === 'index.html' ? activity : `${activity}${file}`, { sha256: hash(source), bytes: source.length, contentType });
}
const activitySnapshot = JSON.parse(await readFile(join(root, 'public/research-activity/snapshot.json')));
const { validateSnapshot, GROUPS: activityGroups, GROUP_LABELS: activityLabels } = await import(pathToFileURL(join(root, 'public/research-activity/model.mjs')).href);
assert.deepEqual(validateSnapshot(activitySnapshot), { valid: true, errors: [] }, 'The published activity snapshot must validate before browser review');
assert.deepEqual(activityGroups, ['completed', 'working', 'planned', 'blocked']);
assert.deepEqual(activityLabels, { completed: 'Done', working: 'Working on', planned: 'Next', blocked: 'Blocked' });
const requiredActivityStates = {
  'base-release': 'completed', 'historical-tutorial': 'completed',
  'research-methods': 'review-pending', 'repository-audit': 'review-pending', 'source-reviews': 'completed',
  'cross-border-finance': 'review-pending', 'public-program-records': 'review-pending',
};
for (const [id, status] of Object.entries(requiredActivityStates)) assert.equal(activitySnapshot.tasks.find(task => task.id === id)?.status, status, `Dated release/review state: ${id}`);
for (const id of ['public-program-records']) assert.equal(activitySnapshot.tasks.find(task => task.id === id)?.reviewStage, 'source-review', `Source-review qualification: ${id}`);
assert.equal(activitySnapshot.tasks.filter(task => task.status === 'running').length, 0, 'Reviewed work must not remain indefinitely running in this dated snapshot');

const report = {
  startedAt: new Date().toISOString(), commit: process.env.GITHUB_SHA ?? null,
  headCommit: process.env.SPATIAL_HEAD_SHA ?? null, basePath: base,
  snapshotSha256: manifest.sourceSnapshot.sha256, manifestSha256: hash(manifestBytes),
  counts: manifest.counts, scenarios: [], serverRequests: [],
  activity: { asOf: activitySnapshot.asOf, taskCount: activitySnapshot.tasks.length, milestoneCount: activitySnapshot.milestones.length, sourceFiles: Object.fromEntries(expectedActivityData) },
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

async function activityReady(page, result) {
  await page.locator('#console-content:not([hidden])').waitFor();
  assert.equal(new URL(page.url()).pathname, activity);
  assert.equal(await page.title(), 'Research Activity · Olympus');
  assert.equal(await page.getByRole('main').count(), 1);
  assert.equal(await page.getByRole('heading', { level: 1 }).count(), 1);
  assert.match(await page.getByRole('heading', { level: 1 }).innerText(), /Research\s*Activity/);
  assert.equal(await page.locator('#error').isHidden(), true);
  assert.equal(await page.locator('#scope').innerText(), activitySnapshot.scope);
  assert.equal(await page.locator('#as-of').getAttribute('datetime'), activitySnapshot.asOf);
  assert.match(await page.locator('#as-of').innerText(), /UTC$/);
  assert.equal(await page.locator('.snapshot-label').innerText(), 'Snapshot, not live');
  assert.equal(await page.locator('#total-count').innerText(), `${activitySnapshot.tasks.length} tracked items`);
  assert.equal(await page.locator('#milestone-list > li').count(), activitySnapshot.milestones.length);
  assert.equal(await page.locator('#result-count').getAttribute('aria-live'), 'polite');
  const age = await page.evaluate(asOf => Date.now() - Date.parse(asOf), activitySnapshot.asOf);
  const warning = age < 0 ? 'The snapshot timestamp is ahead of this device’s clock. Confirm the date before relying on status.'
    : age > activitySnapshot.freshnessHours * 3600000 ? `This snapshot is more than ${activitySnapshot.freshnessHours} hours old. Recheck sources before relying on task or release status.`
      : 'Dated snapshot only. Updates record reviewed roadmap progress. “Working on” can include review pending; it does not indicate live worker activity. Recheck sources before release decisions.';
  assert.equal(await page.locator('#freshness').innerText(), warning);
  assert.equal(await page.locator('#freshness').getAttribute('role'), 'status');
  await until(async () => [...expectedActivityData.keys()].every(path => result.verifiedActivityPaths.has(path)) && result.activityVerificationPending === 0, 'The browser did not receive every source-identical research activity runtime file');
}

async function activityRows(page, status = 'all', query = '') {
  const needle = query.trim().toLocaleLowerCase();
  const expected = activitySnapshot.tasks.filter(task => (status === 'all' || (task.status === 'review-pending' ? 'working' : task.status) === status) && [task.title, task.question, task.role, task.summary, task.nextAction, ...task.evidence.map(item => item.title)].join(' ').toLocaleLowerCase().includes(needle));
  assert.deepEqual(await page.locator('#tasks > article').evaluateAll(rows => rows.map(row => row.id)), expected.map(task => `task-${task.id}`));
  assert.equal(await page.locator('#result-count').innerText(), `${expected.length} of ${activitySnapshot.tasks.length} items shown${status === 'all' ? '' : ` · ${activityLabels[status]}`}`);
  assert.equal(await page.locator('#empty').isVisible(), expected.length === 0);
  for (const filter of ['all', ...activityGroups]) {
    const button = page.locator(`#filters button[data-status="${filter}"]`);
    assert.equal(await button.getAttribute('aria-pressed'), String(filter === status));
    assert.equal(Number(await button.locator('.filter-count').innerText()), filter === 'all' ? activitySnapshot.tasks.length : activitySnapshot.tasks.filter(task => (task.status === 'review-pending' ? 'working' : task.status) === filter).length);
  }
  for (const task of expected) {
    const card = page.locator(`#task-${task.id}`);
    assert.equal(await card.getByRole('heading', { level: 3 }).innerText(), task.title);
    assert.equal(await card.locator('.badge').innerText(), `${activityLabels[task.status === 'review-pending' ? 'working' : task.status]}${task.status === 'review-pending' ? (task.reviewStage === 'source-review' ? ' · Source review pending' : ' · Review pending') : ''}`);
    assert.equal(await card.locator('time').getAttribute('datetime'), task.lastChecked);
    assert.match(await card.locator('time').innerText(), /^Checked .+ UTC$/);
    assert.equal(await card.locator('.question').innerText(), task.question);
    assert.equal(await card.locator('.summary').innerText(), task.summary);
    assert.equal(await card.locator('.next-action').innerText(), `NEXT ACTION\n${task.nextAction}`);
    if (task.completion) assert.equal(await card.locator('.verification').innerText(), `Verification: ${task.completion.note}`);
    const references = card.locator('.evidence > li');
    assert.equal(await references.count(), task.evidence.length);
    for (const [index, evidence] of task.evidence.entries()) {
      const reference = references.nth(index);
      if (evidence.url) {
        const link = reference.getByRole('link');
        assert.equal(await link.getAttribute('href'), evidence.url);
        assert.match(evidence.url, /^https:\/\/github\.com\/occult-kranti\/india-corporate-intelligence\/pull\/[1-9]\d*$/);
        assert.equal(await link.getAttribute('target'), null, 'Public references should use same-tab navigation');
        assert.equal(await link.getAttribute('rel'), 'noopener noreferrer');
      } else {
        assert.equal(await reference.getByRole('link').count(), 0);
        assert.equal(await reference.innerText(), `${evidence.title} · title only`);
      }
    }
  }
}

async function activityLayout(page, result, label) {
  const frame = await page.evaluate(() => ({
    viewport: { width: innerWidth, height: innerHeight }, scrollWidth: document.documentElement.scrollWidth,
    controls: [...document.querySelectorAll('#filters button, #search, .reset')].map(node => ({ width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height })),
    text: [...document.querySelectorAll('#freshness, #as-of, #tasks .badge, #tasks time, #tasks .question, #tasks .next-action')].map(node => {
      const box = node.getBoundingClientRect(); const style = getComputedStyle(node);
      return { text: node.textContent, width: box.width, left: box.left, right: box.right, fontSize: parseFloat(style.fontSize), visible: style.display !== 'none' && style.visibility === 'visible' && Number(style.opacity) > 0 };
    }),
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
    animatedElements: [...document.querySelectorAll('*')].filter(node => getComputedStyle(node).animationName !== 'none').length,
  }));
  assert.ok(frame.scrollWidth <= frame.viewport.width + 1, 'Research activity must not overflow horizontally');
  assert.ok(frame.controls.every(control => control.width > 0 && control.height >= 44), 'Activity controls must remain operable on small screens');
  assert.ok(frame.text.length > 0 && frame.text.every(text => text.visible && text.width > 0 && text.fontSize >= 10 && text.left >= -1 && text.right <= frame.viewport.width + 1), 'Snapshot warnings, dates and task metadata must remain readable and unclipped');
  assert.equal(frame.reducedMotion, true);
  assert.equal(frame.scrollBehavior, 'auto');
  assert.equal(frame.animatedElements, 0, 'Activity status must not pulse or imply live worker activity');
  (result.activityLayouts ??= []).push({ label, ...frame });
}

// A whole tall aside can be visible while its qualified heading is offscreen.
// Measure the actual text-line boxes and their hit-test visibility before capture.
function readTextFrame(node) {
  const doc = node.ownerDocument;
  const win = doc.defaultView;
  const range = doc.createRange();
  range.selectNodeContents(node);
  const style = win.getComputedStyle(node);
  return {
    text: node.textContent, viewport: { width: win.innerWidth, height: win.innerHeight },
    visible: style.display !== 'none' && style.visibility === 'visible' && Number(style.opacity) > 0,
    lines: [...range.getClientRects()].filter(box => box.width > 0 && box.height > 0).map(box => ({
      left: box.left, top: box.top, right: box.right, bottom: box.bottom,
      unobscured: [0.15, 0.5, 0.85].every(fraction => node.contains(doc.elementFromPoint(box.left + box.width * fraction, box.top + box.height / 2))),
    })),
  };
}

function textFrameIsReadable(frame) {
  return frame.visible && frame.lines.length > 0 && frame.lines.every(line =>
    line.left >= 0 && line.top >= 0 && line.right <= frame.viewport.width && line.bottom <= frame.viewport.height && line.unobscured);
}

async function captureQualifiedOriginalClaim(page, result, claim) {
  const heading = claim.getByRole('heading', { name: 'Progressive → BJP: reported FY2024–25 donation', exact: true });
  const qualification = claim.locator('p').filter({ hasText: 'Exact payment dates and the adjacent subsidy chronology have not been independently verified' });
  await qualification.evaluate(node => node.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
  let frames;
  await until(async () => {
    frames = await Promise.all([heading.evaluate(readTextFrame), qualification.evaluate(readTextFrame)]);
    result.qualifiedOriginalClaim = { heading: frames[0], qualification: frames[1] };
    return frames.every(textFrameIsReadable);
  }, 'Original claim heading and every qualification line must be within the viewport and unobscured', 10000);
  await capture(page, result, 'original-energy-c040-qualified-report');
}

async function focused(page, selector) {
  assert.equal(await page.locator(selector).evaluate(node => node === document.activeElement), true, `Keyboard focus must reach ${selector}`);
  const outline = await page.locator(selector).evaluate(node => { const style = getComputedStyle(node); return { width: parseFloat(style.outlineWidth), style: style.outlineStyle }; });
  assert.ok(outline.width >= 2 && outline.style !== 'none', `Visible keyboard focus required on ${selector}`);
}

async function atlasActivityNavigation(page, result, mode, phase = 'initial') {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  const frame = await page.evaluate(() => {
    const sample = node => {
      if (!node) return null;
      const box = node.getBoundingClientRect(); const style = getComputedStyle(node);
      const hit = [0.1, 0.5, 0.9].every(x => [0.1, 0.5, 0.9].every(y =>
        node.contains(document.elementFromPoint(box.left + box.width * x, box.top + box.height * y))));
      return { ...box.toJSON(), hit, visible: style.display !== 'none' && style.visibility === 'visible' && Number(style.opacity) > 0 };
    };
    const link = document.querySelector('.atlas-workspace-links a[href="../research-activity/"]');
    const box = link?.getBoundingClientRect();
    const hit = box ? document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2) : null;
    return { viewport: { width: innerWidth, height: innerHeight }, header: sample(document.querySelector('.masthead')), link: sample(link), linkHit: Boolean(link && (link === hit || link.contains(hit))), status: sample(document.querySelector('.scene-overview')), reading: sample(document.querySelector('.reading-surface')),
      clearance: getComputedStyle(document.querySelector('.evidence-app')).getPropertyValue('--atlas-header-clearance'),
      intro: sample(document.querySelector('.room-caption')), dock: sample(document.querySelector('.bottom-dock')), camera: sample(document.querySelector('.camera-tools')),
      legend: sample(document.querySelector('.legend')), buildingToggle: sample(document.querySelector('.city-toggle')),
      overlays: ['.evidence-inspector', '.city-info', '.map-status', '.journey-bar', '.lens-panel', '.audio-panel'].map(selector => ({ selector, frame: sample(document.querySelector(selector)) })) };
  });
  // Keep the actual failing boxes in report.json, including an overlap failure.
  (result.atlasNavigationLayouts ??= []).push({ mode, phase, ...frame });
  assert.ok(frame.header?.visible && frame.link?.visible && frame.linkHit, 'The atlas Research activity link must be visible and hit-testable');
  assert.ok(frame.link.width > 0 && frame.link.height >= 24 && frame.link.left >= 0 && frame.link.top >= 0 && frame.link.right <= frame.viewport.width && frame.link.bottom <= frame.viewport.height, 'Atlas activity navigation must fit within the viewport with a 24px minimum target height');
  const surface = mode === 'reading' ? frame.reading : frame.status;
  assert.ok(surface?.visible, `The ${mode} surface must be present for header overlap review`);
  if (surface.left < frame.header.right && surface.right > frame.header.left) {
    assert.ok(surface.top >= frame.header.bottom || surface.bottom <= frame.header.top, `The atlas header must not overlap the visible ${mode} surface at ${frame.viewport.width}px`);
  }
  const intersects = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  for (const box of [frame.intro, ...frame.overlays.map(row => row.frame)].filter(box => box?.visible)) {
    assert.ok(!intersects(box, frame.header), 'Visible atlas intro and overlays must clear the measured header');
  }
  assert.ok(surface.height > 0 && surface.bottom <= frame.dock.top, `The ${mode} surface must retain usable height above the bottom dock`);
  if (frame.camera?.visible) assert.ok(!intersects(surface, frame.camera), `The ${mode} surface must leave the camera strip unobscured`);
  for (const [name, control] of [['legend', frame.legend], ['buildings toggle', frame.buildingToggle]]) {
    if (!control?.visible) continue;
    assert.ok(!intersects(surface, control), `The ${mode} surface must not overlap the ${name}`);
    assert.ok(!intersects(frame.header, control) && !intersects(frame.dock, control), `The ${name} must leave the header and dock unobscured`);
    if (frame.camera?.visible) assert.ok(!intersects(frame.camera, control), `The ${name} must leave the camera strip unobscured`);
    assert.ok(control.width > 0 && control.height > 0 && control.left >= 0 && control.top >= 0 && control.right <= frame.viewport.width && control.bottom <= frame.viewport.height && control.hit, `The ${name} must fit within the viewport and be hit-testable`);
  }
  assert.ok(surface.hit, `The visible ${mode} surface must be hit-testable throughout its scrollport`);
}

async function exerciseAtlasHeaderClearance(page, result, viewport) {
  const nav = page.locator('.atlas-workspace-links');
  const previous = await nav.getAttribute('style');
  // Deliberately constrain navigation text to exercise a taller wrapped header.
  await nav.evaluate(node => { node.style.maxWidth = '104px'; });
  await atlasActivityNavigation(page, result, 'reading', 'wrapped-navigation-text');
  await capture(page, result, 'atlas-wrapped-header-reading');
  await page.getByRole('button', { name: 'Explore', exact: true }).click();
  await atlasActivityNavigation(page, result, 'status', 'wrapped-navigation-text');
  await capture(page, result, 'atlas-wrapped-header-status');
  await exerciseAtlasStatusAction(page, result, 'wrapped-header');
  await nav.evaluate((node, style) => { if (style === null) node.removeAttribute('style'); else node.setAttribute('style', style); }, previous);
  // 720×500 is a 200% effective viewport relative to 1440×1000, not browser zoom.
  await page.setViewportSize({ width: 720, height: 500 });
  await atlasActivityNavigation(page, result, 'status', '200-percent-effective-viewport');
  await capture(page, result, 'atlas-200-percent-effective-viewport-status');
  await exerciseAtlasStatusAction(page, result, '200-percent-effective-viewport');
  await page.getByRole('button', { name: 'Reading', exact: true }).click();
  await atlasActivityNavigation(page, result, 'reading', '200-percent-effective-viewport');
  const reader = page.locator('.reading-surface');
  const scroll = await reader.evaluate(node => { node.scrollTop = node.scrollHeight; return { top: node.scrollTop, height: node.clientHeight, content: node.scrollHeight }; });
  (result.atlasReaderScroll ??= []).push({ phase: '200-percent-effective-viewport', ...scroll });
  assert.ok(scroll.content > scroll.height && scroll.top > 0, 'The reader must remain scrollable in the reduced effective viewport');
  await reader.evaluate(node => { node.scrollTop = 0; });
  await capture(page, result, 'atlas-200-percent-effective-viewport-reading');
  await exerciseAtlasReaderAction(page, result);
  await page.setViewportSize(viewport);
  await atlasActivityNavigation(page, result, 'reading', 'viewport-restored');
}

async function captureAtlasAction(page, result, target, phase, keyboard = false) {
  const frame = await target.evaluate(node => {
    const parent = node.closest('.reading-surface, .scene-overview, .legend');
    const box = node.getBoundingClientRect(), surface = parent.getBoundingClientRect();
    const hit = [0.15, 0.5, 0.85].every(x => node.contains(document.elementFromPoint(box.left + box.width * x, box.top + box.height / 2)));
    return { text: node.textContent.trim(), target: box.toJSON(), surface: surface.toJSON(), hit, scrollTop: parent.scrollTop,
      active: document.activeElement?.outerHTML.slice(0, 400), focused: node.closest('button, a, summary') === document.activeElement };
  });
  const text = await target.evaluate(readTextFrame);
  (result.atlasActionReachability ??= []).push({ phase, keyboard, ...frame, textFrame: text });
  assert.ok(frame.target.width > 0 && frame.target.height > 0 && frame.target.left >= frame.surface.left && frame.target.right <= frame.surface.right && frame.target.top >= frame.surface.top && frame.target.bottom <= frame.surface.bottom, `${phase}: the actual action must fit inside its scrollport`);
  assert.ok(frame.hit && textFrameIsReadable(text), `${phase}: every action text line must be visible and hit-testable`);
  if (keyboard) assert.ok(frame.focused, `${phase}: keyboard focus must remain on the action`);
  await capture(page, result, `atlas-${phase}`);
  return frame;
}

async function exerciseAtlasStatusAction(page, result, phase) {
  const status = page.locator('.scene-overview');
  const action = status.locator('.overview-read');
  await action.evaluate(node => node.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
  await atlasActivityNavigation(page, result, 'status', `${phase}-status-scrolled`);
  await captureAtlasAction(page, result, action, `${phase}-status-action`);
  const legend = page.locator('.legend');
  if (await legend.isVisible()) {
    const summary = legend.locator('summary');
    await summary.click();
    assert.equal(await legend.locator('details').getAttribute('open'), '');
    await atlasActivityNavigation(page, result, 'status', `${phase}-legend-expanded`);
    await captureAtlasAction(page, result, summary, `${phase}-expanded-legend`);
    await summary.click();
    await legend.evaluate(node => { node.scrollTop = 0; });
  }
  await status.evaluate(node => { node.scrollTop = 0; });
}

async function exerciseAtlasReaderAction(page, result) {
  const reader = page.locator('.reading-surface');
  const selector = '.reading-surface .record-grid > button.reading-card:first-child';
  const card = page.locator(selector);
  const action = card.locator('span').last();
  await action.evaluate(node => node.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
  const pointerFrame = await captureAtlasAction(page, result, action, '200-percent-effective-viewport-inspect-action');
  assert.ok(pointerFrame.scrollTop > 0, 'The inspect-action capture must show actual reader scrolling');
  // Start at the final reader tab, then use actual keyboard navigation into the
  // first record and scroll with arrow keys until its Inspect evidence action fits.
  await reader.evaluate(node => { node.scrollTop = 0; });
  await reader.locator('.reader-tabs button').last().focus();
  await page.keyboard.press('Tab');
  await focused(page, selector);
  let steps = 0;
  while (!textFrameIsReadable(await action.evaluate(readTextFrame)) && steps < 24) {
    await page.keyboard.press('ArrowDown');
    await delay(100);
    steps += 1;
  }
  (result.atlasReaderKeyboard ??= []).push({ phase: '200-percent-effective-viewport', steps, recordId: await card.getAttribute('data-record-id') });
  await focused(page, selector);
  const keyboardFrame = await captureAtlasAction(page, result, action, '200-percent-effective-viewport-keyboard-inspect', true);
  assert.ok(keyboardFrame.scrollTop > 0, 'The keyboard capture must show the actual scrolled reader action');
  await page.keyboard.press('Enter');
  await page.getByRole('complementary', { name: 'Evidence reading panel', exact: true }).waitFor();
  assert.equal(await page.locator('.evidence-inspector .inspector-content h2').textContent(), await card.locator('h3').textContent(), 'Enter on the keyboard-reached record must open the matching evidence');
  await assertAtlasOpenedReading(page, result, '200-percent-effective-viewport');
  await capture(page, result, 'atlas-200-percent-effective-viewport-opened-evidence');
  const source = page.locator('.evidence-inspector .source-card a[href]').first();
  await source.scrollIntoViewIfNeeded();
  const sourceFrame = await source.evaluate(readTextFrame);
  assert.ok(textFrameIsReadable(sourceFrame), 'The opened record source link must be readable and unobscured in the reduced viewport');
  const sourceUrl = await source.getAttribute('href');
  assert.ok(/^https?:\/\//.test(sourceUrl), 'The opened record retains an HTTP(S) source destination');
  (result.atlasOpenedSourceReachability ??= []).push({ phase: '200-percent-effective-viewport', sourceUrl, sourceFrame });
  await capture(page, result, 'atlas-200-percent-effective-viewport-opened-source');
  await page.getByRole('button', { name: 'Close reading panel', exact: true }).click();
  await reader.evaluate(node => { node.scrollTop = 0; });
}

function assertAtlasReadingFrame(frame) {
  const intersects = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  assert.equal(frame.scrollTop, 0, 'The initial reading assertion must not scroll away a clipped title');
  assert.ok(frame.body.height >= 180, 'The opened reader must reserve a meaningful reading body, not a source-button-only slot');
  assert.ok(frame.summary.text.trim().length >= 60 && frame.summary.text.trim().split(/\s+/).length >= 10, 'The reading fixture must contain a meaningful complete paragraph');
  assert.ok(frame.summaryFontSize >= 12, 'The complete paragraph must not be made to fit by shrinking below 12px');
  for (const [name, text] of [['title', frame.title], ['complete paragraph', frame.summary]]) {
    assert.ok(textFrameIsReadable(text), `The opened reader ${name} must be fully visible and unobscured initially`);
    assert.ok(text.lines.every(line => line.left >= frame.body.left && line.right <= frame.body.right && line.top >= frame.body.top && line.bottom <= frame.body.bottom), `The opened reader ${name} must fit in the actual content scrollport`);
  }
  for (const [name, control] of Object.entries(frame.controls)) {
    if (!control?.visible) continue;
    assert.ok(control.hit && control.width > 0 && control.height > 0, `The opened reader must preserve the ${name} control lane`);
    if (['masthead', 'search', 'camera', 'dock'].includes(name)) assert.ok(!intersects(frame.panel, control), `The opened reader must not cover the ${name} control lane`);
    else assert.ok(!intersects(frame.body, control), `The opened reader content must stay separate from its ${name} controls`);
  }
}

async function assertAtlasOpenedReading(page, result, phase) {
  // No scroll-to-title workaround: measure the initial reading state after layout.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const panel = page.locator('.evidence-inspector');
  const [title, summary, layout] = await Promise.all([
    panel.locator('.inspector-content h2').evaluate(readTextFrame),
    panel.locator('.lead-summary').evaluate(readTextFrame),
    panel.evaluate(node => {
      const sample = element => {
        if (!element) return null;
        const box = element.getBoundingClientRect(), style = getComputedStyle(element);
        return { ...box.toJSON(), visible: style.display !== 'none' && style.visibility === 'visible' && Number(style.opacity) > 0,
          hit: [0.15, 0.5, 0.85].every(x => element.contains(document.elementFromPoint(box.left + box.width * x, box.top + box.height / 2))) };
      };
      const body = node.querySelector('.inspector-content');
      return { panel: sample(node), body: sample(body), scrollTop: body.scrollTop, summaryFontSize: parseFloat(getComputedStyle(node.querySelector('.lead-summary')).fontSize),
        controls: { masthead: sample(document.querySelector('.masthead')), search: sample(document.querySelector('.top-tools')), camera: sample(document.querySelector('.camera-tools')), dock: sample(document.querySelector('.bottom-dock')), header: sample(node.querySelector('.inspector-top')), footer: sample(node.querySelector('.inspector-footer')) } };
    }),
  ]);
  const frame = { phase, title, summary, ...layout };
  (result.atlasOpenedReadingFrames ??= []).push(frame);
  assertAtlasReadingFrame(frame);
}

async function exerciseActivityKeyboard(page, result) {
  await page.keyboard.press('Tab');
  await focused(page, '.skip');
  await page.keyboard.press('Enter');
  assert.equal(new URL(page.url()).hash, '#work');
  assert.equal(await page.locator('#work').evaluate(node => node === document.activeElement), true);
  for (const [index, status] of ['all', ...activityGroups].entries()) {
    await page.keyboard.press('Tab');
    await focused(page, `#filters button[data-status="${status}"]`);
    await page.keyboard.press(index % 2 ? 'Space' : 'Enter');
    await activityRows(page, status);
  }
  await page.keyboard.press('Tab');
  await focused(page, '#search');
  const blocked = activitySnapshot.tasks.find(task => task.status === 'blocked');
  const query = blocked.title.toUpperCase();
  await page.keyboard.type(query);
  await activityRows(page, 'blocked', query);
  assert.ok(await page.locator('#tasks > article').count() >= 1, 'Uppercase search must match a blocked task');
  const beforeSubmit = page.url();
  await page.keyboard.press('Enter');
  assert.equal(page.url(), beforeSubmit, 'Search must stay local rather than submitting or navigating');
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('ci-no-matching-work-47c8c9a2');
  await activityRows(page, 'blocked', 'ci-no-matching-work-47c8c9a2');
  await page.getByRole('heading', { name: 'No work matches these filters.', exact: true }).waitFor();
  await capture(page, result, 'keyboard-empty-search');
  for (const key of ['Enter', 'Space']) {
    await page.keyboard.press('Tab');
    await focused(page, '.reset');
    await page.keyboard.press(key);
    await focused(page, '#search');
    assert.equal(await page.locator('#search').inputValue(), '');
    await activityRows(page);
  }
  // Repeat lane changes and confirm reset removes both the lane and query.
  await page.keyboard.press('Shift+Tab');
  await focused(page, '#filters button[data-status="blocked"]');
  await page.keyboard.press('Space');
  await activityRows(page, 'blocked');
  await page.keyboard.press('Shift+Tab');
  await focused(page, '#filters button[data-status="planned"]');
  await page.keyboard.press('Enter');
  await activityRows(page, 'planned');
  for (let index = 0; index < 3; index += 1) await page.keyboard.press('Tab');
  await focused(page, '.reset');
  await page.keyboard.press('Enter');
  await focused(page, '#search');
  await activityRows(page);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  const firstEvidence = page.locator('#tasks .evidence a').first();
  assert.equal(await firstEvidence.evaluate(node => node === document.activeElement), true, 'Keyboard must reach public evidence links after reset');
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
  const result = { name, viewport, status: 'running', screenshots: [], pageErrors: [], responses: [], failedRequests: [], verifiedRegistryPaths: new Set(), verificationErrors: [], requests: [], verifiedActivityPaths: new Set(), activityVerificationErrors: [], activityVerificationPending: 0 };
  report.scenarios.push(result);
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce', deviceScaleFactor: 1 });
  context.setDefaultTimeout(45000);
  const page = await context.newPage();
  const pending = new Set();
  page.on('request', request => result.requests.push({ url: request.url(), type: request.resourceType(), method: request.method() }));
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
    const expectedActivity = expectedActivityData.get(url.pathname);
    if (expectedActivity) {
      result.activityVerificationPending += 1;
      const verification = response.body().then(bytes => {
        assert.equal(response.status(), 200, url.pathname);
        assert.equal(record.contentType.split(';')[0], expectedActivity.contentType, url.pathname);
        assert.equal(bytes.length, expectedActivity.bytes, url.pathname);
        assert.equal(hash(bytes), expectedActivity.sha256, url.pathname);
        result.verifiedActivityPaths.add(url.pathname);
      }).catch(error => result.activityVerificationErrors.push(error.message)).finally(() => { result.activityVerificationPending -= 1; pending.delete(verification); });
      pending.add(verification);
    }
  });
  let deadline;
  try {
    await Promise.race([work(page, result), new Promise((_, reject) => { deadline = setTimeout(() => reject(new Error('Combined navigation scenario exceeded 150 seconds')), 150000); })]);
    await Promise.all([...pending]);
    assert.deepEqual(result.verificationErrors, [], 'Browser-served registry identity failures');
    assert.deepEqual(result.activityVerificationErrors, [], 'Browser-served research activity source identity failures');
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
    result.verifiedActivityPaths = [...result.verifiedActivityPaths];
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

  for (const [name, viewport, menu] of [
    ['desktop-research-activity-and-workspaces', { width: 1440, height: 1000 }, 'Open all lenses and registers'],
    ['mobile-research-activity-and-workspaces', { width: 390, height: 844 }, 'Open navigation'],
  ]) await scenario(name, viewport, async (page, result) => {
    await page.goto(`${origin}${activity}`, { waitUntil: 'domcontentloaded' });
    await activityReady(page, result);
    await activityRows(page);
    await activityLayout(page, result, 'initial');
    await capture(page, result, 'dated-roadmap-overview');
    await exerciseActivityKeyboard(page, result);

    let expectedSnapshotLoads = 1;
    if (name.startsWith('desktop')) {
      // Change only the isolated browser's clock; production snapshot bytes stay
      // untouched and continue to pass response identity checks on every reload.
      result.clockFixtures = [];
      for (const [state, milliseconds] of [
        ['stale', Date.parse(activitySnapshot.asOf) + activitySnapshot.freshnessHours * 3600000 + 60000],
        ['future', Date.parse(activitySnapshot.asOf) - 60000],
      ]) {
        await page.clock.setFixedTime(new Date(milliseconds));
        await page.reload({ waitUntil: 'domcontentloaded' });
        expectedSnapshotLoads += 1;
        await activityReady(page, result);
        await activityRows(page);
        assert.equal(await page.locator('#freshness').evaluate(node => node.classList.contains('stale')), true);
        await page.locator('#freshness').scrollIntoViewIfNeeded();
        await capture(page, result, `clock-fixture-${state}`);
        result.clockFixtures.push({ state, deviceTime: new Date(milliseconds).toISOString(), snapshotAsOf: activitySnapshot.asOf, sourceBytesUnchanged: true });
      }
      await page.clock.setFixedTime(new Date());
      await page.reload({ waitUntil: 'domcontentloaded' });
      expectedSnapshotLoads += 1;
      await activityReady(page, result);
    } else {
      await page.setViewportSize({ width: 320, height: 844 });
      await activityLayout(page, result, 'narrow-320px');
      await page.locator('#work').scrollIntoViewIfNeeded();
      await capture(page, result, 'narrow-320px-reflow');
      await page.setViewportSize(viewport);
    }

    const consoleRequests = [...result.requests];
    assert.deepEqual(consoleRequests.filter(request => {
      const url = new URL(request.url);
      return request.method !== 'GET' || url.origin !== origin || (!expectedActivityData.has(url.pathname) && url.pathname !== '/favicon.ico');
    }), [], 'The activity console must request only its local static runtime and snapshot before navigation');
    assert.equal(consoleRequests.filter(request => new URL(request.url).pathname === `${activity}snapshot.json`).length, expectedSnapshotLoads, 'Snapshot reads must correspond to explicit page loads, without polling');
    result.activityRequestsBeforeNavigation = consoleRequests;
    assert.deepEqual(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length })), { local: 0, session: 0 }, 'The console must not persist filter or activity state');
    const anchors = await page.locator('a').evaluateAll(links => links.map(link => ({ href: link.href, text: link.textContent })));
    for (const link of anchors) {
      const url = new URL(link.href);
      assert.ok((url.origin === origin && [base, spatial, activity].includes(url.pathname)) || /^https:\/\/github\.com\/occult-kranti\/india-corporate-intelligence\/pull\/[1-9][0-9]*$/.test(link.href), `Unexpected or private console link: ${link.href}`);
    }

    // Exercise actual same-tab link activation and browser Back without relying
    // on public GitHub availability. This explicit fixture is not a live PR check.
    const publicLink = page.locator('#tasks .evidence a').first();
    const publicURL = await publicLink.getAttribute('href');
    await page.route(publicURL, route => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html lang="en"><title>CI public-link navigation fixture</title><h1>CI public-link navigation fixture</h1><p>This is an intercepted destination, not a live GitHub verification.</p></html>' }));
    await publicLink.focus();
    await page.keyboard.press('Enter');
    await page.waitForURL(publicURL);
    await page.getByRole('heading', { name: 'CI public-link navigation fixture', exact: true }).waitFor();
    result.publicLinkNavigation = { destination: publicURL, mode: 'intercepted CI navigation fixture; not a live public PR availability check' };
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await activityReady(page, result);
    await activityRows(page);
    await page.unroute(publicURL);

    const workbench = page.getByRole('link', { name: 'Original workbench', exact: true });
    assert.equal(await workbench.evaluate(link => link.href), `${origin}${base}#/investigate`);
    await workbench.click();
    await rootReady(page, '/investigate');
    await page.getByRole('button', { name: menu, exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Explore the atlas' });
    await dialog.waitFor();
    const activityLink = dialog.getByRole('link', { name: 'Research activity', exact: true });
    assert.equal(await activityLink.count(), 1);
    assert.equal(await activityLink.evaluate(link => link.href), `${origin}${activity}`);
    await activityLink.scrollIntoViewIfNeeded();
    await activityLink.focus();
    await page.keyboard.press('Enter');
    await activityReady(page, result);
    await activityRows(page);
    await capture(page, result, 'workbench-to-activity');

    const atlas = page.getByRole('link', { name: 'Evidence atlas', exact: true });
    assert.equal(await atlas.evaluate(link => link.href), `${origin}${spatial}`);
    await atlas.click();
    await fullReady(page, result);
    await atlasActivityNavigation(page, result, 'status');
    await page.getByRole('button', { name: 'Reading', exact: true }).click();
    await page.getByRole('region', { name: 'Accessible record reading mode', exact: true }).waitFor();
    await atlasActivityNavigation(page, result, 'reading');
    await capture(page, result, 'atlas-navigation-clear-of-reader');
    await exerciseAtlasHeaderClearance(page, result, viewport);
    const atlasActivity = page.getByRole('navigation', { name: 'Connected workspaces', exact: true }).getByRole('link', { name: /Research activity/ });
    assert.equal(await atlasActivity.count(), 1);
    assert.equal(await atlasActivity.evaluate(link => link.href), `${origin}${activity}`);
    await atlasActivity.click();
    await activityReady(page, result);
    await activityRows(page);
    await capture(page, result, 'atlas-to-activity');
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await fullReady(page, result);
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await activityReady(page, result);
    await activityRows(page);
    await capture(page, result, 'browser-back-to-activity');
  });
  await scenario('exact-source-corrections-across-original-and-global', { width: 1440, height: 1000 }, async (page, result) => {
    await page.goto(`${origin}${base}#/political?iw_view=dossier`, { waitUntil: 'domcontentloaded' });
    await rootReady(page, '/political?iw_view=dossier');
    const political = page.locator('.iw-dossier-content');
    await political.getByRole('heading', { name: 'The flows, and what they are worth', exact: true }).waitFor();
    const text = await political.innerText();
    assert.match(text, /Missing edges describe[\s\S]*collection coverage only/);
    assert.match(text, /Adani zero-donation claim has been held/);
    assert.match(text, /does not establish an Adani FY20–FY25 filing survey, concealment or non-compliance/);
    assert.doesNotMatch(text, /₹0 — documented void|No disclosed political donation anywhere|genuine nil OR concealment/);
    await political.getByText('Donation coverage gaps', { exact: true }).scrollIntoViewIfNeeded();
    await capture(page, result, 'original-political-two-qualified-scope-holds');
    for (const offline of [false,true]) {
      await page.goto(`${origin}${base}global-workbench/${offline?'fieldwork-offline.html':''}`, { waitUntil: 'domcontentloaded' });
      await page.locator('#records [data-record]').first().waitFor();
      for(const [id,label] of [['india-corporate-intelligence:edge-e7605f62f7476da5f3e1','Electoral-bond name absence reported'],['india-corporate-intelligence:edge-b3d60e32fb42932af025','Adani-specific disclosure claim unverified']]) {
        await page.locator(`#records [data-record=${JSON.stringify(id)}]`).click();
        await page.locator('#detail').getByRole('heading', { name: new RegExp(label) }).waitFor();
        const detail=page.locator('#detail'),value=await detail.innerText();
        assert.ok(value.includes(label));assert.match(value,/HELD SOURCE SCOPE/);
        assert.doesNotMatch(value,/₹0 — documented void|genuine nil OR concealment|Relation endpoints|Documented relation types/);
        await detail.scrollIntoViewIfNeeded();
        await capture(page,result,`${offline?'offline':'served'}-${id.endsWith('5f3e1')?'donation':'disclosure'}-source-scope-hold`);
      }
      await page.locator('#records [data-record="india-corporate-intelligence:adani"]').click();
      await page.locator('#detail').getByRole('heading', { name: 'Adani Group', exact: true }).waitFor();
      assert.match(await page.locator('#detail').innerText(),/Denies wrongdoing\./);
      assert.doesNotMatch(await page.locator('#detail').innerText(),/ZERO disclosed political donations anywhere/);
    }
    result.notes=['Original political coverage and both served/offline global readers qualify the exact two inherited claims. Neither claim becomes a funding, concealment or legal-compliance finding; the original entity denial remains.'];
  });
  await scenario('qualified-jio-and-progressive-original-global', { width: 1440, height: 1000 }, async (page, result) => {
    const jio=JSON.parse(await readFile(join(root,'src/data/jio-ownership-corrections.json'),'utf8')).corrections;
    await page.goto(`${origin}${base}#/conglomerates?iw_view=dossier`, {waitUntil:'domcontentloaded'});
    await rootReady(page,'/conglomerates?iw_view=dossier');
    const original=page.locator('.iw-dossier-content');
    for(const correction of jio){const row=original.locator(`[data-jio-ownership-hold=${JSON.stringify(correction.id)}]`);await row.waitFor();const text=await row.innerText();assert.ok(text.includes(correction.summary));assert.ok(text.includes(correction.notice));assert.ok(text.includes(correction.temporalLimitation));assert.equal(await row.locator('details').getAttribute('open'),null);assert.equal(await row.locator('a[href]').count(),correction.sources.length);await row.scrollIntoViewIfNeeded();await capture(page,result,`${correction.id}-original-partner-qualification`);}
    const energyRoute='/energy?iw_view=dossier&claim=money%3Ac040';
    await page.goto(`${origin}${base}#${energyRoute}`,{waitUntil:'domcontentloaded'});await rootReady(page,energyRoute);
    const claim=page.getByRole('complementary',{name:'Progressive → BJP: reported FY2024–25 donation',exact:true});await claim.waitFor();
    const prose=await claim.innerText();assert.match(prose,/Exact payment dates and the adjacent subsidy chronology have not been independently verified/);assert.doesNotMatch(prose,/₹834\.97|two donations|weeks after the Cabinet/);assert.match(prose,/does not establish company-to-party earmarking or causation/);await captureQualifiedOriginalClaim(page,result,claim);
    for(const offline of [false,true]){
      await page.goto(`${origin}${base}global-workbench/${offline?'fieldwork-offline.html':''}`,{waitUntil:'domcontentloaded'});await page.locator('#records [data-record]').first().waitFor();
      const id='india-corporate-intelligence:edge-290870791c720e40b543';await page.locator(`#records [data-record=${JSON.stringify(id)}]`).click();const detail=page.locator('#detail');await detail.getByRole('heading',{name:'Tata / Progressive · upstream amount held',exact:true}).waitFor();const text=await detail.innerText();assert.match(text,/HELD SOURCE SCOPE/);assert.match(text,/does not establish the upstream amount/);assert.doesNotMatch(text,/Relation endpoints|Documented relation types|₹757\.6cr → BJP FY25/);await detail.scrollIntoViewIfNeeded();await capture(page,result,`${offline?'offline':'served'}-progressive-upstream-hold`);
    }
    result.notes=['Two original partner rows retain complete citations and legal-identity/currentness limits. The original energy claim uses qualified fiscal-year prose, retaining its reported amount. Served and offline global readers suppress the unsupported upstream amount and endpoints; immutable source datasets stay exact.'];
  });
} catch (error) {
  report.error = error.stack ?? error.message;
} finally {
  await browser?.close().catch(() => {});
  if (server) await new Promise(resolveClosed => server.close(resolveClosed));
  report.finishedAt = new Date().toISOString();
  report.status = !report.error && report.scenarios.length === 8 && report.scenarios.every(result => result.status === 'passed') ? 'passed' : 'failed';
  await writeFile(join(output, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  const lines = [
    '# Combined spatial release review', '', `Status: **${report.status}**`,
    `Commit: ${report.commit}; head: ${report.headCommit}`, `Snapshot SHA-256: ${report.snapshotSha256}`, `Manifest SHA-256: ${report.manifestSha256}`, '',
    `Research activity as of: ${report.activity.asOf}; ${report.activity.taskCount} tasks; ${report.activity.milestoneCount} milestones. All five static runtime files require source/build/browser hash parity.`,
    'Clock-fixture screenshots change only the isolated test clock. Public-PR navigation uses an intercepted CI fixture; no live GitHub availability or worker activity is certified.', '',
    ...report.scenarios.map(result => `- ${result.status}: ${result.name} (${result.screenshots.length} screenshots)`), '',
    report.error ? `Setup failure: ${report.error}` : '', report.scope,
  ];
  await writeFile(join(output, 'summary.md'), `${lines.filter(line => line !== undefined).join('\n')}\n`);
  if (report.status !== 'passed') process.exitCode = 1;
}
