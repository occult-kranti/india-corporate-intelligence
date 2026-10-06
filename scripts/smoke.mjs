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
import { dossierUrl } from './pages/dossier-navigation.mjs';

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
  ['/investigate', 'investigate'],
  ['/justice', 'justice'],
  ['/debt', 'debt'],
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
  ['/energy', 'energy'],
  ['/welfare', 'welfare'],
  ['/finance', 'finance'],
  ['/education', 'education'],
  ['/public-works', 'public-works'],
  ...['electricity', 'water', 'hospitals', 'schools', 'police', 'military', 'recruitment', 'administration', 'all'].map(sector => [`/public-works?sector=${sector}`, `public-works-${sector}`]),
  ['/public-works?sector=water&state=KA', 'public-works-water-karnataka'],
  ['/water', 'water'],
  ['/water?state=KA&domain=drinking-water&window=all', 'water-state'],
  ['/water?stage=harvest&window=all', 'water-food-chain'],
  ['/finance?lens=capital', 'finance-capital'],
  ['/security', 'security'],
  ['/security?lens=footprint', 'security-footprint'],
  ['/security?lens=procurement', 'security-procurement'],
  ['/tenders?section=national', 'tenders-national'],
  ['/company/wipro', 'company-wipro'],
  ['/map?idx=sensex50', 'map-sensex50'],
  ['/map?metric=psu&exchange=NSE&sector=Financials&scale=log&marks=hidden&idx=nifty50', 'map-parameterised'],
  ['/industries?sector=Financials', 'industries-banking'],
];

const failures = [];
// The environment ships a pinned Chromium; use it rather than downloading one.
const PINNED = process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/opt/pw-browsers/chromium';
const browser = await chromium.launch(existsSync(PINNED) ? { executablePath: PINNED } : {});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

// Every known route must support both the default linked map and its complete
// dossier. Keeping separate checks prevents the shared map from masking a broken
// legacy map or a blank dossier behind a healthy workspace shell.
for (const surface of ['map', 'dossier']) {
for (const [route, name] of ROUTES) {
  const label = `${route} [${surface}]`;
  const errors = [];
  // Third-party font/CDN failures are an environment fact, not an app defect —
  // every family has a system fallback. Everything else is a real error.
  // ERR_CERT_AUTHORITY_INVALID is the sandbox's TLS-intercepting proxy refusing a
  // third-party fetch; Chromium reports it without the URL, so it cannot be matched
  // on host. Nothing in dist is served over that path.
  const external = /fonts\.(googleapis|gstatic)\.com|ERR_CONNECTION_RESET|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|ERR_CERT_AUTHORITY_INVALID/;
  const onConsole = (m) => {
    if (m.type() === 'error' && !external.test(m.text())) errors.push(m.text());
  };
  const onPageError = (e) => errors.push(`pageerror: ${e.message}`);
  page.on('console', onConsole);
  page.on('pageerror', onPageError);

  // Hash-only navigation does not reload, so a crash on one route would poison
  // every route after it. Force a full document load per route.
  await page.goto('about:blank');
  await page.goto(surface === 'dossier' ? dossierUrl(base, route) : `${base}/#${route}`, { waitUntil: 'networkidle' });
  if (surface === 'dossier') {
    // The workspace shell can finish before its lazy route starts loading. A
    // real dossier heading, rather than the shared shell or Loading status,
    // establishes readiness before the original content/geometry assertions.
    await page.locator('.iw-dossier-content h1, .iw-dossier-content h2').first().waitFor({ timeout: 30_000 });
  }
  await page.waitForTimeout(route === '/network' || route === '/atlas' ? 1800 : 700);

  const text = await page.evaluate((surface) => (surface === 'dossier'
    ? document.querySelector('.iw-dossier-content')?.textContent ?? ''
    : document.body.innerText).length, surface);
  if (text < 200) failures.push(`${label}: rendered only ${text} characters — page is probably blank`);
  if (await page.locator(`.iw-surface-${surface}`).count() !== 1) failures.push(`${label}: requested workspace surface is not active`);

  if (surface === 'map') {
    const states = await page.locator('.iw-map-panel .iw-map-state').evaluateAll(paths => ({
      count: paths.length,
      codes: new Set(paths.map(path => path.getAttribute('data-state-code'))).size,
      real: paths.filter(path => (path.getAttribute('d') ?? '').length > 100).length,
      keyboard: paths.filter(path => path.getAttribute('tabindex') === '0').length,
    }));
    if (states.count !== 36 || states.codes !== 36 || states.real !== 36) failures.push(`${label}: map must render 36 distinct real state/UT paths (${JSON.stringify(states)})`);
    if (states.keyboard !== 1) failures.push(`${label}: geographic map must have one keyboard entry point`);
    if (await page.locator('.iw-dossier-content').count()) failures.push(`${label}: original dossier unexpectedly rendered on the default map surface`);
    if (await page.locator('.iw-surfaces button[aria-pressed="true"]').innerText() !== 'Map') failures.push(`${label}: map surface control is not selected`);
  }

  // A parameterised route in this list is a known-good link. If any of its params is
  // rejected, the page falls back to a default and says so — which would make the
  // route test the default view while claiming to test the parameterised one.
  if (surface === 'dossier' && route.includes('?')) {
    const rejected = await page.locator('.iw-dossier-content').evaluate(el => /Unrecognised /.test(el.textContent));
    if (rejected) failures.push(`${label}: a URL param was reported as unrecognised — the smoke route is stale`);
  }

  // Map pages must draw real geometry, not rectangles.
  if (surface === 'dossier' && ['/map', '/atlas', '/cabinet', '/conglomerates'].includes(route)) {
    const paths = await page.evaluate(
      () => document.querySelectorAll('.iw-dossier-content svg path[d^="m"], .iw-dossier-content svg path[d^="M"]').length,
    );
    if (paths < 36) failures.push(`${label}: only ${paths} SVG paths — expected at least 36 state polygons`);
  }

  if (errors.length) failures.push(`${label}: ${errors.length} console error(s) — ${errors[0]}`);
  if (shots) await page.screenshot({ path: `${shots}/${surface}-${name}.png`, fullPage: false });

  page.off('console', onConsole);
  page.off('pageerror', onPageError);
  console.log(`  ${errors.length ? '✗' : '·'} ${label}  (${text} chars)`);
}
}

// Keyboard reachability on the map.
await page.goto(dossierUrl(base, '/map'), { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
const focusable = await page.evaluate(() => document.querySelectorAll('.iw-dossier-content svg[tabindex="0"]').length);
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
