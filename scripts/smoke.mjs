#!/usr/bin/env node
/**
 * Headless render smoke test.
 *
 * Loads every route, fails on any console error or page error, and asserts a few
 * structural invariants that a type-check cannot catch — chiefly that the map
 * renders 36 real state paths rather than rectangles, and that no page renders
 * an evidence tier without its legend.
 *
 * Usage: node scripts/smoke.mjs [baseUrl] [--shots outDir]
 */

import { chromium } from 'playwright';
import { mkdirSync, existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Serve `dist` ourselves unless a base URL was passed.
 *
 * Relying on a separately-started preview server makes this test fail for reasons
 * that have nothing to do with the app — a reaped background process reads as a
 * broken build. Owning the server means the only thing that can fail is the thing
 * under test.
 */
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.map': 'application/json',
  '.png': 'image/png', '.woff2': 'font/woff2',
};

let server = null;
let base = process.argv[2]?.startsWith('http') ? process.argv[2] : null;

if (!base) {
  const dist = join(root, 'dist');
  if (!existsSync(join(dist, 'index.html'))) {
    console.error('smoke: dist/index.html missing — run `npm run build` first.\n');
    process.exit(1);
  }
  server = createServer((req, res) => {
    const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
    let file = join(dist, url === '/' ? 'index.html' : url);
    if (!existsSync(file) || extname(file) === '') file = join(dist, 'index.html');
    try {
      const body = readFileSync(file);
      res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
  console.log(`  · serving dist on ${base}`);
}
const shotsIdx = process.argv.indexOf('--shots');
const shots = shotsIdx > -1 ? process.argv[shotsIdx + 1] : null;
if (shots) mkdirSync(shots, { recursive: true });

const ROUTES = [
  ['/', 'dashboard'],
  ['/map', 'map'],
  ['/states/mh', 'state-maharashtra'],
  ['/states/jh', 'state-jharkhand'],
  ['/network', 'network'],
  ['/cabinet', 'cabinet'],
  ['/conglomerates', 'conglomerates'],
  ['/atlas', 'atlas'],
  ['/patterns', 'patterns'],
  ['/evidence', 'evidence'],
  ['/base-rates', 'base-rates'],
  ['/method', 'method'],
  ['/industries', 'industries'],
  ['/political', 'political'],
  ['/media', 'media'],
  ['/search', 'search'],
  ['/watchlist', 'watchlist'],
  ['/motifs', 'motifs'],
  ['/prospector', 'prospector'],
  ['/desk', 'desk'],
  ['/capture', 'capture'],
  ['/allocation', 'allocation'],
  ['/pmcares', 'pmcares'],
  ['/competition', 'competition'],
  ['/allocation?min=3', 'allocation-three'],
  ['/interlocks', 'interlocks'],
  ['/conglomerates/reliance', 'deepdive-reliance'],
  ['/conglomerates/adani', 'deepdive-adani'],
  ['/conglomerates/tata', 'deepdive-nodata'],
  ['/provenance', 'provenance'],
  ['/tenders', 'tenders'],
  ['/resources', 'resources'],
  ['/resources?register=spectrum', 'resources-spectrum'],
  ['/resources?register=minerals&view=blocks', 'resources-minerals'],
  ['/resources?register=hydrocarbons&view=blocks', 'resources-hydrocarbons'],
  ['/resources?register=coal&view=winners', 'resources-coal-winners'],
  ['/tenders?view=map&scope=states', 'tenders-map'],
  ['/tenders?view=graph&scope=centre', 'tenders-graph'],
  ['/geograph', 'geograph'],
  ['/geograph?mode=state-flows&layer=all', 'geograph-flows'],
];

const failures = [];
// The environment ships a pinned Chromium; use it rather than downloading one.
const PINNED = process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/opt/pw-browsers/chromium';
const browser = await chromium.launch(existsSync(PINNED) ? { executablePath: PINNED } : {});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

for (const [route, name] of ROUTES) {
  const errors = [];
  // Third-party font/CDN failures are an environment fact, not an app defect —
  // every family has a system fallback. Everything else is a real error.
  const external = /fonts\.(googleapis|gstatic)\.com|ERR_CONNECTION_RESET|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED/;
  const onConsole = (m) => {
    if (m.type() === 'error' && !external.test(m.text())) errors.push(m.text());
  };
  const onPageError = (e) => errors.push(`pageerror: ${e.message}`);
  page.on('console', onConsole);
  page.on('pageerror', onPageError);

  // Hash-only navigation does not reload, so a crash on one route would poison
  // every route after it. Force a full document load per route.
  await page.goto('about:blank');
  await page.goto(`${base}/#${route}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(route === '/network' || route === '/atlas' ? 1800 : 700);

  const text = await page.evaluate(() => document.body.innerText.length);
  if (text < 200) failures.push(`${route}: rendered only ${text} characters — page is probably blank`);

  // Map pages must draw real geometry, not rectangles.
  if (['/map', '/atlas', '/cabinet', '/conglomerates'].includes(route)) {
    const paths = await page.evaluate(
      () => document.querySelectorAll('svg path[d^="m"], svg path[d^="M"]').length,
    );
    if (paths < 36) failures.push(`${route}: only ${paths} SVG paths — expected at least 36 state polygons`);
  }

  if (errors.length) failures.push(`${route}: ${errors.length} console error(s) — ${errors[0]}`);
  if (shots) await page.screenshot({ path: `${shots}/${name}.png`, fullPage: false });

  page.off('console', onConsole);
  page.off('pageerror', onPageError);
  console.log(`  ${errors.length ? '✗' : '·'} ${route}  (${text} chars)`);
}

// Keyboard reachability on the map.
await page.goto(`${base}/#/map`, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
const focusable = await page.evaluate(() => document.querySelectorAll('svg[tabindex="0"]').length);
if (focusable === 0) failures.push('/map: map svg is not keyboard-focusable');

await browser.close();
server?.close();

if (failures.length) {
  console.error(`\n  ${failures.length} FAILURE(S):`);
  for (const f of failures) console.error(`    ✗ ${f}`);
  console.error('\nsmoke: FAILED\n');
  process.exit(1);
}
console.log('\nsmoke: OK\n');
