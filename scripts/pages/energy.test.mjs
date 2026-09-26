#!/usr/bin/env node
/**
 * /energy — acceptance tests, one per criterion in docs/design/ENERGY_ACCEPTANCE.md.
 *
 * Runs with `node --test scripts/pages/energy.test.mjs` against the built `dist`
 * (and a scaffold build, `dist-empty`, that this file assembles itself when it is
 * missing). Nothing here reads the page's source: every expectation is the
 * acceptance document's, and every id, label or count is derived at test time from
 * the generated data module, exactly as the document's "Fixtures" section says.
 *
 * Why a test per criterion rather than a few broad ones: each criterion is the RED
 * test for the build step that owns it (spec §14), so a developer needs to see
 * which criterion fails, not that "energy fails".
 *
 * Why the dist server is owned here (copied from scripts/smoke.mjs): a separately
 * started preview server makes the test fail for reasons that have nothing to do
 * with the page.
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import {
  existsSync, readFileSync, writeFileSync, mkdtempSync, cpSync, rmSync, symlinkSync, mkdirSync,
} from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, extname, dirname, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// ---------------------------------------------------------------------------
// Constants the acceptance document fixes
// ---------------------------------------------------------------------------

/** Settle after networkidle. The task caps this at 700ms; everything else waits on selectors. */
const SETTLE = 700;
const TEST_TIMEOUT = 180_000;
/** Playwright's per-action wait; long enough for a React commit, short enough to fail a missing section fast. */
const ACTION_TIMEOUT = 5_000;

/** The twelve declared sweeps and their display labels (spec §5.3, in order). */
const SWEEP_LABEL = {
  coal: 'Coal',
  mines: 'Mines & minerals',
  oilgas: 'Oil & gas',
  hydro: 'Hydro & dams',
  solarwind: 'Solar, wind & storage',
  nuclear: 'Nuclear',
  grid: 'Grid & discoms',
  money: 'Money trail',
  people: 'Promoters & families',
  enforce: 'Regulators & courts',
  states: 'Offices: union & state',
  literature: 'Documents & narratives',
};
const DECLARED_SWEEPS = Object.keys(SWEEP_LABEL);

const H1 = 'Who decides over energy, and who is recorded as gaining';
const STAGE_CAPTION_1 = 'An edge is a sourced claim, not a measure of influence.';
const STAGE_CAPTION_2 = 'The dash is the evidence tier and survives greyscale; read it before the colour.';
const STRIP_CAPTION = 'A chip selects the research sweep a claim was recorded in, not its sector. A coal company\'s electoral bond is recorded under Money trail.';
const VOIDS_CAPTION = 'Voids have no line in the graph because an absence has no endpoints.';
const EMPTY_CALLOUT = 'The energy register has not been promoted in this build. Nothing below is zero — it is absent.';
const SKIP_TEXT = 'Skip the graph: go to the margin · go to the table · go to filters';
const TIER_WORDS = ['Documented', 'Reported', 'Alleged', 'Analytic'];
const SECTIONS = ['#offices', '#benefit', '#benchmark', '#contested', '#baserates', '#missing'];

/** Twin columns in spec §5.7 order. */
const TWIN_HEADERS = [
  'claim id', 'sweep', 'file asOf', 's → pred → t', 'lab', 'd', 'tier', '₹', 'from – to',
  'beneficiary', 'how', 'benefit ₹', 'confidence', 'innocent reading', 'upgradeIf', 'killIf',
  'responses', 'superseded by', 'sources',
];

// ---------------------------------------------------------------------------
// Fixtures — derived from the generated module, never hard-coded
// ---------------------------------------------------------------------------

/**
 * The generated module is TypeScript with only type annotations on its exports, so
 * stripping the `import type` lines and the `: Type =` annotations leaves plain
 * ESM that node can import. This avoids a TypeScript toolchain in the test.
 */
async function importGenerated() {
  const src = readFileSync(join(root, 'src/graph/energy.generated.ts'), 'utf8');
  const js = src
    .replace(/^import type .*$/gm, '')
    .replace(/^export const ([A-Z_]+): [A-Za-z_<>, |]+(\[\])? = /gm, 'export const $1 = ');
  const dir = mkdtempSync(join(tmpdir(), 'icip-energy-fixture-'));
  const file = join(dir, 'energy.mjs');
  writeFileSync(file, js);
  return import(pathToFileURL(file).href);
}

/** Node ids and labels the platform already holds, so an endpoint "hydrates" against them too. */
function platformNodes() {
  const out = new Map();
  const graph = readFileSync(join(root, 'src/graph/data.ts'), 'utf8');
  const nodesOnly = graph.slice(0, graph.indexOf('export const EDGES'));
  for (const m of nodesOnly.matchAll(/\bid:\s*"([^"]+)",\s*label:\s*"([^"]+)"/g)) out.set(m[1], m[2]);
  try {
    const companies = readFileSync(join(root, 'research/raw/companies-by-state.json'), 'utf8');
    for (const m of companies.matchAll(/"id":\s*"(co:[^"]+)"/g)) if (!out.has(m[1])) out.set(m[1], m[1]);
  } catch { /* no company register — hydration falls back to the graph alone */ }
  return out;
}

const gen = await importGenerated();
const indices = JSON.parse(readFileSync(join(root, 'research/raw/indices.json'), 'utf8'));
const platform = platformNodes();
const energyLabel = new Map(gen.ENERGY_NODES.map((n) => [n.id, n.label]));
const hydrates = (id) => energyLabel.has(id) || platform.has(id);
const labelOf = (id) => energyLabel.get(id) ?? platform.get(id) ?? id;

const EDGES = gen.ENERGY_EDGES;
const META = gen.ENERGY_META;
const isResponse = (e) => e.pred === 'contra' && typeof e.t === 'string' && e.t.startsWith('claim:');
const DRAWABLE = EDGES
  .filter((e) => !isResponse(e) && !e.supersededBy && hydrates(e.s) && hydrates(e.t))
  .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
const responsesTo = (id) => EDGES.filter((e) => isResponse(e) && e.t === 'claim:' + id);

const constituents = Object.values(indices.indices ?? {}).flat();
const constituentIds = new Set(constituents.map((c) => c.existingId).filter(Boolean));

/** Two nodes at graph distance ≥ 2 in the unfiltered view, chosen deterministically. */
function pathPair() {
  const adj = new Map();
  for (const e of DRAWABLE) {
    if (!adj.has(e.s)) adj.set(e.s, new Set());
    if (!adj.has(e.t)) adj.set(e.t, new Set());
    adj.get(e.s).add(e.t);
    adj.get(e.t).add(e.s);
  }
  const ids = [...adj.keys()].sort();
  for (const a of ids) {
    const dist = new Map([[a, 0]]);
    const queue = [a];
    while (queue.length) {
      const x = queue.shift();
      for (const y of adj.get(x)) if (!dist.has(y)) { dist.set(y, dist.get(x) + 1); queue.push(y); }
    }
    const far = ids.filter((b) => (dist.get(b) ?? 0) >= 2);
    if (far.length) return [a, far[0]];
  }
  return [null, null];
}

const [pathA, pathB] = pathPair();
const FIX = {
  D: DRAWABLE.length,
  claim: DRAWABLE[0]?.id ?? null,
  answered: DRAWABLE.find((e) => responsesTo(e.id).length > 0)?.id ?? null,
  silentDoc: DRAWABLE.find((e) => e.tier === 'documented' && responsesTo(e.id).length === 0)?.id ?? null,
  alleged: DRAWABLE.find((e) => e.tier === 'alleged')?.id ?? null,
  noAmount: DRAWABLE.find((e) => !e.a)?.id ?? null,
  company: (() => {
    const ids = new Set();
    for (const e of DRAWABLE) for (const id of [e.s, e.t]) if (id.startsWith('co:') && constituentIds.has(id)) ids.add(id);
    return [...ids].sort()[0] ?? null;
  })(),
  a: pathA,
  b: pathB,
  killed: META.killed?.[0]?.id ?? null,
  key: Object.keys(indices.indices ?? {})[0] ?? null,
  sweeps: new Set((META.files ?? []).map((f) => f.domain)),
  superseded: EDGES.filter((e) => e.supersededBy).length,
};
FIX.absent = DECLARED_SWEEPS.filter((s) => !FIX.sweeps.has(s));
/** Benefit records by claim id; the ledger lists one row per visible claim that has one. */
const BENEFIT = new Map((gen.ENERGY_BENEFITS ?? []).map((b) => [b.claimId, b]));
FIX.benefitRows = DRAWABLE.filter((e) => BENEFIT.has(e.id)).length;
/** Every amount a single benefit record carries, as the page formats it (en-IN). */
const BENEFIT_AMOUNTS = new Set([...BENEFIT.values()].filter((b) => b.amountCr).map((b) => b.amountCr.toLocaleString('en-IN')));
/**
 * Every string the record itself holds — each string field of the generated module,
 * and the platform's node labels — longest first. Text the page prints verbatim from
 * these is data ("Adani Total Gas", a quoted source "MEIL Rs 966 cr total"), not the
 * page's own words; AC-21 removes it before reading what the page itself says.
 */
const DATA_STRINGS = (() => {
  const out = new Set();
  const walk = (v) => {
    if (typeof v === 'string') out.add(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(Object.values(gen));
  for (const l of platform.values()) out.add(l);
  return [...out].filter((x) => x.length >= 6).sort((a, b) => b.length - a.length || (a < b ? -1 : 1));
})();
const edgeById = new Map(EDGES.map((e) => [e.id, e]));
const companyRow = constituents.find((c) => c.existingId === FIX.company) ?? null;

// ---------------------------------------------------------------------------
// Servers, browser and the scaffold build
// ---------------------------------------------------------------------------

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.map': 'application/json',
  '.png': 'image/png', '.woff2': 'font/woff2',
};

function serve(dist) {
  const server = createServer((req, res) => {
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
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => {
    resolve({ server, base: `http://127.0.0.1:${server.address().port}` });
  }));
}

/**
 * Build the scaffold fixture as the acceptance document prescribes: a scratch copy
 * of the repository without research/raw/energy/, assembled and built there, so the
 * working tree's raw files and generated module are never touched. Cached at
 * dist-empty/ and rebuilt when ENERGY_REBUILD_EMPTY=1 is set.
 */
function ensureDistEmpty() {
  const out = join(root, 'dist-empty');
  if (existsSync(join(out, 'index.html')) && !process.env.ENERGY_REBUILD_EMPTY) return out;
  const scratch = mkdtempSync(join(tmpdir(), 'icip-dist-empty-'));
  const EXCLUDE = /^(node_modules|dist|dist-empty|\.git|research\/raw\/energy|tsconfig\.tsbuildinfo)(\/|$)/;
  cpSync(root, scratch, {
    recursive: true,
    filter: (src) => !EXCLUDE.test(relative(root, src).split(sep).join('/')),
  });
  symlinkSync(join(root, 'node_modules'), join(scratch, 'node_modules'));
  // The assembler may exit non-zero on the other fleet's unreconciled files; what
  // matters here is that the energy module it writes declares itself empty.
  spawnSync(process.execPath, ['scripts/assemble-fleet.mjs'], { cwd: scratch, stdio: 'pipe' });
  const mod = readFileSync(join(scratch, 'src/graph/energy.generated.ts'), 'utf8');
  if (!/"empty":\s*true/.test(mod)) throw new Error('dist-empty: assembler did not write an empty energy module');
  execFileSync(process.execPath, [join(scratch, 'node_modules/vite/bin/vite.js'), 'build', '--outDir', 'dist-empty'], {
    cwd: scratch, stdio: 'pipe',
  });
  rmSync(out, { recursive: true, force: true });
  cpSync(join(scratch, 'dist-empty'), out, { recursive: true });
  rmSync(scratch, { recursive: true, force: true });
  return out;
}

let browser;
let full; // { server, base } for dist
let empty; // { server, base } for dist-empty
const contexts = {};

before(async () => {
  // ENERGY_DIST points the suite at a pinned build (e.g. one made with
  // `vite build --outDir …`) so a concurrent `npm run build` cannot swap assets mid-run.
  const dist = process.env.ENERGY_DIST ?? join(root, 'dist');
  if (!existsSync(join(dist, 'index.html'))) throw new Error(`${dist}/index.html missing — run \`npm run build\` first.`);
  full = await serve(dist);
  empty = await serve(ensureDistEmpty());
  const PINNED = process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/opt/pw-browsers/chromium';
  browser = await chromium.launch(existsSync(PINNED) ? { executablePath: PINNED } : {});
  contexts.D = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  contexts.M = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  contexts.T = await browser.newContext({ viewport: { width: 768, height: 1024 } });
  // A missing anchor is a failed criterion, not something to wait 30s for. Every
  // locator action inherits this, so a scaffold that lacks a section fails fast and
  // names the locator it could not find.
  for (const c of Object.values(contexts)) c.setDefaultTimeout(ACTION_TIMEOUT);
});

after(async () => {
  await browser?.close();
  full?.server.close();
  empty?.server.close();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const external = /fonts\.(googleapis|gstatic)\.com|ERR_CONNECTION_RESET|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|ERR_CERT_AUTHORITY_INVALID/;

/** Open a page in a viewport, run the check, and fail on any console or page error. */
async function withPage(vp, fn) {
  const page = await contexts[vp].newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !external.test(m.text())) errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  try {
    await fn(page);
    assert.deepEqual(errors, [], `console/page errors: ${errors.join(' | ')}`);
  } finally {
    await page.close();
  }
}

/** about:blank first so a hash-only navigation cannot carry state between loads. */
async function load(page, route, base = full.base) {
  await page.goto('about:blank');
  await page.goto(`${base}/#${route}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.body && document.body.innerText.trim().length > 0, null, { timeout: 5_000 }).catch(() => {});
  await page.waitForTimeout(SETTLE);
}

const hashParams = (page) => new URLSearchParams((new URL(page.url()).hash.split('?')[1] ?? ''));
const waitForParam = (page, key) => page.waitForFunction(
  (k) => new URLSearchParams(location.hash.split('?')[1] ?? '').has(k), key, { timeout: 5_000 },
);
const text = async (loc) => (await loc.innerText()).trim();
const style = (loc, prop) => loc.evaluate((el, p) => getComputedStyle(el)[p], prop);
const rect = (loc) => loc.evaluate((el) => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height }; });
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const int = (s) => Number.parseInt(s.replace(/,/g, ''), 10);
const ne = (cond, msg) => assert.ok(cond, msg);

/** A sweep chip by slug — chips carry their label, and the label is what the spec declares. */
const chip = (page, slug) => page.locator('button[aria-pressed]').filter({ hasText: new RegExp('^\\s*' + esc(SWEEP_LABEL[slug]) + '\\b', 'i') }).first();
/**
 * All sweep chips — the strip's toggles only. The page has other `button[aria-pressed]`
 * toggles the spec also requires (the shape legend in #stage, the narrative-status
 * chips in #contested), so "every aria-pressed button" is not "every sweep chip". The
 * strip exposes no data-* hook of its own; a sweep chip is known, as in `chip()`, by
 * starting with one of the twelve declared sweep labels.
 */
const SWEEP_CHIP_TEXT = new RegExp('^\\s*(' + Object.values(SWEEP_LABEL).map(esc).join('|') + ')\\b', 'i');
const sweepChips = (page, extra = '') => page.locator('button[aria-pressed]' + extra).filter({ hasText: SWEEP_CHIP_TEXT });
const fact = (page, n) => page.locator(`[data-strip-fact="${n}"]`).first();
const factNum = async (page, n) => { const t = await text(fact(page, n)); const m = t.match(/^(\d+) of (\d+)/); assert.ok(m, `[data-strip-fact="${n}"] reads "${t}"`); return [int(m[1]), int(m[2])]; };
const noDetailsAncestor = (loc) => loc.evaluate((el) => !el.closest('details'));
const noClosedDetailsAncestor = (loc) => loc.evaluate((el) => !el.closest('details:not([open])'));

/** The deepest element under `scope` whose text contains every fragment. */
function deepest(page, scope, fragments) {
  let loc = page.locator(`${scope} *`);
  for (const f of fragments) loc = loc.filter({ hasText: f instanceof RegExp ? f : new RegExp(esc(f)) });
  return loc.last();
}

/** The column that holds heading `name` in the claim card: the heading's parent. */
function column(page, name) {
  return page.locator('main aside *').filter({ hasText: new RegExp('^\\s*' + esc(name) + '\\s*$') }).last().locator('xpath=..');
}

/** Minimal RFC 4180 parser — the CSV export must be checked cell by cell, and cells may hold newlines. */
function parseCsv(s) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < s.length; i += 1) {
    const c = s[i];
    if (quoted) {
      if (c === '"' && s[i + 1] === '"') { cell += '"'; i += 1; } else if (c === '"') quoted = false; else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; } else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; } else if (c !== '\r') cell += c;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const t = (name, fn) => test(name, { timeout: TEST_TIMEOUT }, fn);

// ===========================================================================
// 1. Render and scaffold state
// ===========================================================================

t('AC-01 — The route renders and is error-free', () => withPage('D', async (page) => {
  await load(page, '/energy');
  const len = await page.evaluate(() => document.body.innerText.length);
  assert.ok(len >= 200, `rendered only ${len} characters`);
  assert.equal(await text(page.locator('main h1').first()), H1);
}));

t('AC-02 — Zero records still renders a page that says so', async () => {
  for (const vp of ['D', 'M']) {
    await withPage(vp, async (page) => {
      await load(page, '/energy', empty.base);
      const len = await page.evaluate(() => document.body.innerText.length);
      assert.ok(len >= 200, `${vp}: rendered only ${len} characters`);
      const callout = page.locator('div').filter({ hasText: EMPTY_CALLOUT }).last();
      assert.ok(await callout.count(), `${vp}: no Callout with the scaffold sentence`);
      const first = callout.locator(':scope > *').first();
      assert.match(await style(first, 'fontFamily'), /mono/i, `${vp}: Callout label is not mono`);
      assert.equal(await style(first, 'textTransform'), 'uppercase', `${vp}: Callout label is not uppercase`);
      const byline = await text(page.locator('main h1 ~ p').first());
      assert.ok(byline.includes('0 research sweeps'), `${vp}: byline "${byline}"`);
      assert.ok(byline.includes('as of —'), `${vp}: byline "${byline}"`);
      const body = await page.evaluate(() => document.body.innerText);
      assert.ok(body.includes('0 of 12 sweeps researched'), `${vp}: strip lacks "0 of 12 sweeps researched"`);
      assert.equal(await page.locator('#missing').count(), 1, `${vp}: #missing missing`);
      for (const id of ['#benefit', '#benchmark', '#offices', '#contested', '#baserates']) {
        assert.equal(await page.locator(id).count(), 0, `${vp}: ${id} rendered in the empty state`);
      }
      assert.equal(await page.locator('[role=combobox]').count(), 0, `${vp}: company box rendered in the empty state`);
      const chips = page.locator('button[aria-pressed]');
      const n = await chips.count();
      assert.ok(n > 0, `${vp}: no sweep chips`);
      for (let i = 0; i < n; i += 1) {
        const c = chips.nth(i);
        assert.ok(await c.isDisabled(), `${vp}: chip ${i} is enabled`);
        assert.ok(await c.evaluate((el) => el.hasAttribute('data-nodata') || !!el.querySelector('[data-nodata]')), `${vp}: chip ${i} lacks [data-nodata]`);
      }
      assert.ok(body.includes('0 sources'), `${vp}: sources footer lacks "0 sources"`);
    });
  }
});

t('AC-03 — The byline carries the run and the as-of span', () => withPage('D', async (page) => {
  await load(page, '/energy');
  const byline = await text(page.locator('main h1 ~ p').first());
  const m = byline.match(/^(\d+) research sweeps · (\d+) entities · (\d+) claims · run run-[0-9a-f]+ · as of \d{4}-\d{2}-\d{2}( – \d{4}-\d{2}-\d{2})?$/);
  assert.ok(m, `byline "${byline}"`);
  assert.equal(int(m[3]), FIX.D);
}));

// ===========================================================================
// 2. Honesty captions
// ===========================================================================

async function assertStageCaption(page, label) {
  const legend = page.locator('#stage [role=group][aria-label="Filter by entity type"]').first();
  assert.equal(await legend.count(), 1, `${label}: shape legend missing`);
  const cap = deepest(page, '#stage', [STAGE_CAPTION_1, STAGE_CAPTION_2]);
  assert.ok(await cap.count(), `${label}: caption missing`);
  assert.ok(await cap.isVisible(), `${label}: caption not visible`);
  assert.ok(await noClosedDetailsAncestor(cap), `${label}: caption inside a closed details`);
  const below = await cap.evaluate((el, sel) => {
    const legend = document.querySelector(sel);
    return !!(legend.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
  }, '#stage [role=group][aria-label="Filter by entity type"]');
  assert.ok(below, `${label}: caption is not below the shape legend`);
}

t('AC-04 — The stage caption is always visible, verbatim', async () => {
  const routes = ['/energy', '/energy?dom=coal', `/energy?claim=${FIX.claim}`, '/energy?table=1'];
  for (const vp of ['D', 'M']) {
    for (const r of routes) {
      await withPage(vp, async (page) => { await load(page, r); await assertStageCaption(page, `${vp} ${r}`); });
    }
  }
});

t('AC-05 — The sweep strip says a chip is not a sector', async () => {
  for (const vp of ['D', 'M']) {
    await withPage(vp, async (page) => {
      await load(page, '/energy');
      const cap = page.getByText(STRIP_CAPTION, { exact: true }).first();
      assert.ok(await cap.count(), `${vp}: caption missing`);
      assert.ok(await cap.isVisible(), `${vp}: caption not visible`);
      assert.equal(await style(cap, 'fontSize'), '12px', `${vp}: caption size`);
      const chips = sweepChips(page);
      assert.equal(await chips.count(), DECLARED_SWEEPS.length, `${vp}: expected one chip per declared sweep`);
      const under = await chips.evaluateAll(
        (els, el) => els.every((c) => !!(c.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)),
        await cap.elementHandle(),
      );
      assert.ok(under, `${vp}: caption is not under the chip rows`);
    });
  }
});

t('AC-06 — The voids caption sits under the void list', async () => {
  await withPage('D', async (page) => {
    await load(page, '/energy');
    const cap = page.locator('main aside').getByText(VOIDS_CAPTION, { exact: true }).first();
    assert.ok(await cap.count(), 'caption missing from aside');
    assert.ok(await cap.isVisible(), 'caption not visible');
    const after = await cap.evaluate((el) => {
      const list = el.closest('main aside').querySelector('ul, ol, dl');
      return !!list && !!(list.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    assert.ok(after, 'caption does not follow the void list');
  });
  await withPage('M', async (page) => {
    await load(page, '/energy');
    const cap = page.getByText(VOIDS_CAPTION, { exact: true }).first();
    assert.ok(await cap.count(), 'M: caption missing');
    assert.ok(await cap.isVisible(), 'M: caption not visible');
    const under = await cap.evaluate((el) => {
      const svg = document.querySelector('#stage svg');
      return !!svg && !!(svg.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    assert.ok(under, 'M: caption is not under the canvas');
  });
});

async function assertCannotShow(page, vp) {
  for (const sec of SECTIONS) {
    const blocks = page.locator(`${sec} [data-cannot-show]`);
    const n = await blocks.count();
    assert.ok(n >= (sec === '#contested' ? 2 : 1), `${vp} ${sec}: ${n} [data-cannot-show]`);
    for (let i = 0; i < n; i += 1) {
      const b = blocks.nth(i);
      const tx = await text(b);
      assert.ok(tx.length >= 40, `${vp} ${sec}[${i}]: text too short "${tx}"`);
      assert.equal(await style(b, 'fontSize'), '14px', `${vp} ${sec}[${i}]: font-size`);
      assert.ok(await noDetailsAncestor(b), `${vp} ${sec}[${i}]: inside details`);
      const label = await b.evaluate((el) => {
        const cands = [...el.querySelectorAll('*')].filter((c) => c.textContent.trim().toLowerCase() === 'what this cannot show');
        return cands.map((c) => { const s = getComputedStyle(c); return [s.fontSize, s.fontFamily, s.textTransform]; });
      });
      assert.ok(label.some(([fs, ff, tt]) => fs === '10px' && /mono/i.test(ff) && tt === 'uppercase'), `${vp} ${sec}[${i}]: no 10px mono uppercase "What this cannot show" label (${JSON.stringify(label)})`);
      if (vp === 'M') assert.ok(await b.isVisible(), `${vp} ${sec}[${i}]: not visible`);
    }
  }
}

t('AC-07 — Every evidence section has a full-size "What this cannot show"', async () => {
  for (const vp of ['D', 'M']) await withPage(vp, async (page) => { await load(page, '/energy'); await assertCannotShow(page, vp); });
});

t('AC-08 — The cannot-show texts are the spec\'s, with dates interpolated', () => withPage('D', async (page) => {
  await load(page, '/energy');
  const all = async (sec) => (await page.locator(`${sec} [data-cannot-show]`).allInnerTexts()).join('\n');
  assert.ok((await all('#offices')).includes('A gap in a lane is a gap in the record, not a vacancy in the office.'), '#offices');
  assert.ok((await all('#benefit')).includes("'unknown' is unknown, not zero"), '#benefit');
  const bench = await all('#benchmark');
  assert.match(bench, /Membership is as of \d{4}-\d{2}-\d{2}/, '#benchmark as-of');
  assert.ok(bench.includes('banks and IT firms are absent because this register did not research them'), '#benchmark absent');
  const cont = await all('#contested');
  assert.ok(cont.includes('Its presence does not make the claim false, and its absence does not make it true.'), '#contested allegations');
  assert.ok(cont.includes('not the verdict of any court, regulator or auditor'), '#contested narratives');
  assert.ok((await all('#baserates')).includes('this page has not re-run it'), '#baserates');
  assert.ok((await all('#missing')).includes('What nobody thought to look for leaves no trace here.'), '#missing');
}));

t('AC-09 — The company trail keeps its two lists apart, and says why', () => withPage('D', async (page) => {
  await load(page, `/energy?sel=${FIX.company}&focus=${FIX.company}&hops=1`);
  const aside = page.locator('main aside').first();
  const h1 = aside.locator('h2, h3, h4').filter({ hasText: /^\s*Public decisions touching it\s*$/ });
  const h2 = aside.locator('h2, h3, h4').filter({ hasText: /^\s*Money it sent\s*$/ });
  assert.equal(await h1.count(), 1, '"Public decisions touching it" heading');
  assert.equal(await h2.count(), 1, '"Money it sent" heading');
  const separate = await h1.first().evaluate((a) => { const b = [...a.closest('main aside').querySelectorAll('h2, h3, h4')].find((h) => /^\s*Money it sent\s*$/.test(h.textContent)); return !!b && a.parentElement !== b.parentElement; });
  assert.ok(separate, 'the two lists share one block');
  const cap = aside.getByText('These two lists are kept apart on purpose.', { exact: false }).first();
  assert.ok(await cap.count() && await cap.isVisible(), 'caption missing or hidden');
  const tables = aside.locator('table');
  const n = await tables.count();
  for (let i = 0; i < n; i += 1) {
    const rows = await tables.nth(i).locator('tbody tr').allInnerTexts();
    const money = rows.some((r) => /\b(bond|csr|trust|direct|pmin)\b/.test(r));
    const decisions = rows.some((r) => /\b(award|law|enforce|pmout|role)\b/.test(r));
    assert.ok(!(money && decisions), `table ${i} mixes money and decision rows`);
  }
}));

t('AC-10 — A lit claim carries the date-test caveat', () => withPage('D', async (page) => {
  await load(page, `/energy?claim=${FIX.claim}`);
  const stage = await page.locator('#stage').innerText();
  assert.match(stage, new RegExp('lit: claim ' + esc(FIX.claim), 'i'), 'in-frame status lacks "lit: claim …"');
  const status = (await page.locator('[role=status]').allInnerTexts()).join('\n');
  assert.ok((stage + status).includes('it is not evidence that the office-holder made or influenced the decision'), 'date-test caveat missing');
}));

t('AC-11 — A date window states its undated and coverage caveats', () => withPage('D', async (page) => {
  await load(page, '/energy?from=2015-01-01&to=2016-12-31');
  const undated = page.locator('main *').filter({ hasText: /\d+ undated claims (are )?shown regardless of the window/ }).last();
  assert.ok(await undated.count(), 'undated caveat missing');
  assert.ok(await undated.isVisible(), 'undated caveat hidden');
  assert.equal(await fact(page, 10).count(), 1, '[data-strip-fact="10"] missing');
  const f = await text(fact(page, 10));
  assert.ok(f.includes('sweeps declare search years in this window') || f.includes('no sweep declares its search years — sparse is not clean'), `fact 10 reads "${f}"`);
}));

t('AC-12 — Every figure carries its as-of and its source', async () => {
  await withPage('D', async (page) => {
    await load(page, `/energy?claim=${FIX.claim}`);
    const aside = page.locator('main aside').first();
    const lines = (await aside.innerText()).split('\n').map((s) => s.trim()).filter(Boolean);
    assert.match(lines[0] ?? '', /\d{4}-\d{2}-\d{2}/, `aside top line "${lines[0]}"`);
    const links = aside.locator('a[href^="http"]');
    const linkTexts = await links.allInnerTexts();
    assert.ok(linkTexts.some((s) => /^https?:\/\//.test(s.trim())), 'no link whose visible text is a URL');
    const mono = await aside.evaluate((el, id) => [...el.querySelectorAll('*')].some((c) => /mono/i.test(getComputedStyle(c).fontFamily) && c.textContent.includes('claim ' + id) && c.textContent.includes('run run-')), FIX.claim);
    assert.ok(mono, 'no mono block with "claim {id}" and "run run-"');
  });
  await withPage('D', async (page) => {
    await load(page, '/energy');
    const body = await page.locator('main').innerText();
    assert.match(body, /membership as of \d{4}-\d{2}-\d{2}/, 'index rail control lacks "membership as of"');
    const den = await text(page.locator('#benchmark [data-denominator]').first());
    assert.match(den, /lists as of \d{4}-\d{2}-\d{2} · \S.*$/, `#benchmark denominator "${den}"`);
    const tables = page.locator('#baserates table');
    const tn = await tables.count();
    assert.ok(tn > 0, '#baserates has no table');
    for (let i = 0; i < tn; i += 1) {
      const heads = (await tables.nth(i).locator('thead th').allInnerTexts()).map((s) => s.trim().toLowerCase());
      const col = heads.findIndex((h) => /source/.test(h));
      assert.ok(col >= 0, `#baserates table ${i} has no sources column (${heads.join(' | ')})`);
      const rows = tables.nth(i).locator('tbody tr');
      const rn = await rows.count();
      for (let r = 0; r < rn; r += 1) {
        const cell = await text(rows.nth(r).locator('td, th').nth(col));
        assert.ok(cell.length > 0, `#baserates table ${i} row ${r}: empty sources cell`);
      }
    }
  });
});

t('AC-13 — The page\'s own words carry no partisan frame', () => withPage('D', async (page) => {
  await load(page, '/energy');
  const own = await page.locator('h1, h2, h3, th, caption, label, [data-cannot-show], [data-denominator], .font-mono[class*="uppercase"]').allInnerTexts();
  const hit = own.find((s) => /\b(opposition|ruling|government of the day)\b/i.test(s));
  assert.equal(hit, undefined, `partisan frame in page chrome: "${hit}"`);
}));

// ===========================================================================
// 3. Denominators
// ===========================================================================

t('AC-14 — The strip shows n of N in the spec\'s order', () => withPage('D', async (page) => {
  await load(page, '/energy');
  const f1 = await text(fact(page, 1));
  assert.match(f1, /^\d+ of \d+ claims$/, `fact 1 "${f1}"`);
  assert.equal((await factNum(page, 1))[1], FIX.D);
  const f3 = await text(fact(page, 3));
  assert.match(f3, /^\d+ of \d+ allegations answered$/, `fact 3 "${f3}"`);
  const sticky = await fact(page, 1).evaluate((el) => { for (let e = el; e; e = e.parentElement) if (getComputedStyle(e).position === 'sticky') return e.innerText; return null; });
  assert.ok(sticky !== null, 'strip container is not position: sticky');
  assert.match(sticky, /as of \d{4}-\d{2}-\d{2}/, 'strip lacks "as of DATE"');
}));

/** The in-frame status's first line: `{v} of {d} claims`. */
async function canvasStatus(page) {
  const stage = await page.locator('#stage').innerText();
  const m = stage.match(/(\d+) of (\d+) claims/);
  assert.ok(m, 'canvas status lacks "{v} of {d} claims"');
  return [int(m[1]), int(m[2])];
}

t('AC-15 — The filtered chip and the in-frame status agree', () => withPage('D', async (page) => {
  await load(page, '/energy?dom=coal');
  const filtered = await page.locator('span').filter({ hasText: /filtered/ }).last().innerText();
  const m = filtered.match(/filtered (\d+) → (\d+)/);
  assert.ok(m, `strip "filtered" span reads "${filtered}"`);
  const [a, b] = [int(m[1]), int(m[2])];
  const [v, d] = await canvasStatus(page);
  assert.equal(a, FIX.D, 'filtered from ≠ FIX.D');
  assert.equal(d, FIX.D, 'status denominator ≠ FIX.D');
  assert.equal(b, v, 'filtered to ≠ status numerator');
  assert.equal(b, (await factNum(page, 1))[0], 'filtered to ≠ fact 1 numerator');
}));

/** The mono integer inside a chip — the count, not a digit from the year span. */
const chipCount = (c) => c.evaluate((el) => {
  const mono = [...el.querySelectorAll('*')].find((x) => /mono/i.test(getComputedStyle(x).fontFamily) && /^\d+$/.test(x.textContent.trim()));
  if (mono) return Number(mono.textContent.trim());
  const m = el.textContent.replace(/\d{4}–\d{2,4}/g, '').match(/\b(\d+)\b/);
  return m ? Number(m[1]) : null;
});

t('AC-16 — Sweep chips carry counts and dated spans that add up', () => withPage('D', async (page) => {
  await load(page, '/energy');
  const chips = sweepChips(page, ':not([disabled])');
  const n = await chips.count();
  assert.ok(n > 0, 'no enabled chips');
  let S = 0;
  for (let i = 0; i < n; i += 1) {
    const c = chips.nth(i);
    const tx = await text(c);
    const k = await chipCount(c);
    assert.ok(Number.isInteger(k), `chip "${tx}" has no integer`);
    assert.ok(/\d{4}–\d{2,4}/.test(tx) || tx.includes('no dated claims'), `chip "${tx}" has no span`);
    S += k;
  }
  const missing = await page.locator('#missing').innerText();
  const U = int(missing.match(/claim sweep not recorded for (\d+) claims/)?.[1] ?? '0');
  assert.equal(S + U, FIX.D, `chip counts ${S} + unrecorded ${U} ≠ ${FIX.D}`);
}));

t('AC-17 — Live effects update and match the strip', () => withPage('D', async (page) => {
  await load(page, '/energy');
  await chip(page, 'coal').click();
  await waitForParam(page, 'dom');
  const stripEffect = fact(page, 1).locator('xpath=ancestor::*[.//*[@data-effect]][1]').locator('[data-effect]').first();
  assert.ok(await stripEffect.count(), 'no [data-effect] in the strip row');
  const e = await text(stripEffect);
  const m = e.match(/^(\d+) → (\d+) claims$/);
  assert.ok(m, `strip effect "${e}"`);
  assert.equal(int(m[1]), FIX.D);
  assert.equal(int(m[2]), (await factNum(page, 1))[0]);
  await page.locator(`input[type=radio][value="${FIX.key}"]`).first().check();
  await waitForParam(page, 'idx');
  const railEffect = page.locator(`input[type=radio][value="${FIX.key}"]`).first().locator('xpath=ancestor::*[.//*[@data-effect]][1]').locator('[data-effect]').first();
  assert.ok(await railEffect.count(), 'no [data-effect] in the rail');
  const r = await text(railEffect);
  const rm = r.match(/^(\d+) → (\d+) claims$/);
  assert.ok(rm, `rail effect "${r}"`);
  assert.equal(int(rm[2]), (await factNum(page, 1))[0], 'rail effect to ≠ fact 1 numerator');
}));

t('AC-18 — Every evidence section prints its own denominator', () => withPage('D', async (page) => {
  await load(page, '/energy');
  const expect = {
    '#offices': [/\d+ institutions with a recorded office-holder · \d+ of \d+ dated decisions fall inside a recorded tenure · \d+ fall between tenures · \d+ undated, not placed/],
    '#benefit': [/\d+ of \d+ visible claims name a beneficiary · \d+ documented amount · \d+ estimated · \d+ unknown · \d+ distinct beneficiaries \(\d+ not nodes in this graph\)/],
    '#benchmark': Object.keys(indices.indices).map((k) => new RegExp(esc(k) + ': \\d+ of \\d+ with ≥ 1 direct claim · \\d+ via group only · \\d+ none · \\d+ not in platform dataset')),
    '#contested': [/\d+ of \d+ alleged claims carry a recorded response · \d+ responses to documented or reported claims/, /\d+ narratives · established \d+ · well-supported \d+ · contested \d+ · speculative \d+ · unsupported \d+ · debunked \d+/],
    '#baserates': [/\d+ base rates across \d+ sweeps · symmetry check recorded for \d+ of \d+ sweeps/],
    '#missing': [/\d+ gaps \(\d+ recorded by research, \d+ found by the build\) · \d+ killed in audit · \d+ held out · \d+ orphans · \d+ superseded · \d+ sweeps not yet researched/],
  };
  for (const sec of SECTIONS) {
    const den = page.locator(`${sec} [data-denominator]`);
    assert.ok(await den.count() >= 1, `${sec}: no [data-denominator]`);
    assert.match(await style(den.first(), 'fontFamily'), /mono/i, `${sec}: denominator not mono`);
    const tx = (await den.allInnerTexts()).join('\n');
    for (const re of expect[sec]) assert.match(tx, re, `${sec} denominator "${tx}"`);
    if (FIX.absent.length) assert.match(tx, new RegExp('· ' + FIX.sweeps.size + ' of 12 sweeps\\s*$'), `${sec}: does not end "· ${FIX.sweeps.size} of 12 sweeps"`);
  }
}));

t('AC-19 — A base rate is always numerator of denominator', () => withPage('D', async (page) => {
  await load(page, '/energy');
  const tables = page.locator('#baserates table');
  const tn = await tables.count();
  assert.ok(tn > 0, '#baserates has no table');
  for (let i = 0; i < tn; i += 1) {
    const heads = (await tables.nth(i).locator('thead th').allInnerTexts()).map((s) => s.trim().toLowerCase());
    const defCol = heads.findIndex((h) => h.includes('denominator'));
    assert.ok(defCol >= 0, `table ${i}: no "what the denominator is" column (${heads.join(' | ')})`);
    const rows = tables.nth(i).locator('tbody tr');
    const rn = await rows.count();
    for (let r = 0; r < rn; r += 1) {
      const row = rows.nth(r);
      const cells = await row.locator('td, th').allInnerTexts();
      const second = (cells[1] ?? '').trim();
      const rowText = cells.join(' ');
      if (!/^\d+ of \d+$/.test(second)) {
        assert.ok(rowText.includes('not a rate (denominator '), `table ${i} row ${r}: second cell "${second}" and no "not a rate" note`);
      }
      const bar = await row.evaluate((el) => !!el.querySelector('svg rect') || [...el.querySelectorAll('div')].some((d) => /%$/.test(d.style.width)));
      assert.ok(!bar, `table ${i} row ${r}: rate row draws a bar`);
      assert.ok((cells[defCol] ?? '').trim().length > 0, `table ${i} row ${r}: empty denominator definition`);
    }
  }
}));

/** The separation histogram: an svg[role=img] under the shape legend named Distribution. */
const histogram = (page) => page.locator('#stage svg[role=img]').filter({ has: page.locator('title', { hasText: /distribution/i }) }).or(page.locator('#stage svg[role=img][aria-label*="istribution"]')).first();
const histogramTwin = (page) => page.locator('#stage table').filter({ has: page.locator('th', { hasText: /^\s*hops\s*$/i }) }).first();

t('AC-20 — A path is never shown without its count and median', () => withPage('D', async (page) => {
  await load(page, `/energy?path=${FIX.a},${FIX.b}`);
  const aside = await page.locator('main aside').first().innerText();
  assert.match(aside, /\d+ hops · one of \d+ equally short paths/, 'aside lacks path count');
  assert.match(aside, /median separation in this view: \d+ hops \(from \d+ evenly spaced entities\)/, 'aside lacks median');
  const h = histogram(page);
  assert.ok(await h.count(), 'no Distribution svg[role=img] in #stage');
  const under = await h.evaluate((el) => { const l = document.querySelector('#stage [role=group][aria-label="Filter by entity type"]'); return !!l && !!(l.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING); });
  assert.ok(under, 'histogram is not under the shape legend');
  assert.match(await page.locator('#stage').innerText(), /\d+ entities in this view cannot be reached from /, 'histogram caption');
  const heads = (await histogramTwin(page).locator('thead th').allInnerTexts()).map((s) => s.trim().toLowerCase());
  assert.deepEqual(heads, ['hops', 'entities', 'share'], 'histogram twin headers');
}));

t('AC-21 — The benefit ledger sums nothing and draws nothing', () => withPage('D', async (page) => {
  await load(page, '/energy');
  // No chart of amounts: no svg beyond the ≤ 20px tier-dash samples, no canvas, no bar.
  const wide = await page.locator('#benefit svg').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().width).filter((w) => w > 20));
  assert.deepEqual(wide, [], `#benefit draws svg wider than 20px: ${wide.join(', ')}`);
  assert.equal(await page.locator('#benefit canvas').count(), 0, '#benefit draws a canvas');
  const bars = await page.locator('#benefit [style]').evaluateAll((els) => els.filter((e) => /(^|;)\s*width:\s*[\d.]+%/.test(e.getAttribute('style'))).length);
  assert.equal(bars, 0, `#benefit has ${bars} percentage-width bar(s)`);
  // No aggregate row: every ledger row is one claim, and there are exactly as many
  // rows as visible claims that carry a benefit record.
  assert.equal(await page.locator('#benefit tfoot').count(), 0, 'ledger has a footer row');
  const rowClaims = await page.locator('#benefit table tbody tr').evaluateAll((trs) => trs.map((tr) => [...tr.querySelectorAll('button')].filter((b) => /^Open claim /.test(b.getAttribute('aria-label') ?? '')).length));
  const notOne = rowClaims.map((n, i) => [i, n]).filter(([, n]) => n !== 1);
  assert.deepEqual(notOne, [], 'ledger rows that do not open exactly one claim ([row, buttons])');
  assert.equal(rowClaims.length, FIX.benefitRows, `ledger rows ${rowClaims.length} ≠ visible claims with a benefit record ${FIX.benefitRows}`);
  // No computed total, in the page's own words: remove every verbatim data string
  // (company names such as "Adani Total Gas", quoted sources such as "MEIL Rs 966 cr
  // total") and read what is left.
  let own = await page.locator('#benefit').innerText();
  for (const d of DATA_STRINGS) if (own.includes(d)) own = own.split(d).join(' ¦ ');
  const summing = own.split('\n').filter((l) => /\btotal\b|\bsum\b|\bcombined\b/i.test(l));
  assert.deepEqual(summing, [], 'the ledger\'s own text sums');
  const figures = [...own.matchAll(/₹\s?([\d,]+(?:\.\d+)?)/g)].map((m) => m[1]);
  assert.ok(figures.length > 0, 'no ₹ figure in the ledger\'s own text');
  const computed = [...new Set(figures.filter((f) => !BENEFIT_AMOUNTS.has(f)))];
  assert.deepEqual(computed, [], '₹ figures that are not a single recorded benefit amount');
  const tables = page.locator('#benefit table');
  const tn = await tables.count();
  assert.ok(tn > 0, '#benefit has no ledger table');
  let cells = 0;
  for (let i = 0; i < tn; i += 1) {
    const heads = (await tables.nth(i).locator('thead th').allInnerTexts()).map((s) => s.trim().toLowerCase());
    const col = heads.findIndex((h) => h.includes('₹') || h.includes('amount'));
    assert.ok(col >= 0, `table ${i}: no amount column (${heads.join(' | ')})`);
    const rows = tables.nth(i).locator('tbody tr');
    const rn = await rows.count();
    for (let r = 0; r < rn; r += 1) {
      const c = await text(rows.nth(r).locator('td, th').nth(col));
      cells += 1;
      assert.match(c, /^₹[\d,.]+ cr$|^≈ ₹[\d,.]+ cr \(estimate\)$|^amount unknown$/, `table ${i} row ${r}: amount "${c}"`);
      assert.notEqual(c, '₹0 cr');
    }
  }
  assert.ok(cells > 0, 'no amount cells');
}));

t('AC-22 — The source ledger counts its primaries', () => withPage('D', async (page) => {
  await load(page, '/energy');
  const el = page.locator('main *').filter({ hasText: /^\s*\d+ sources · \d+ primary\s*$/ }).last();
  assert.ok(await el.count(), 'no "{n} sources · {k} primary" line');
  const m = (await text(el)).match(/^(\d+) sources · (\d+) primary$/);
  assert.ok(m, 'line does not match exactly');
  assert.ok(int(m[2]) <= int(m[1]), 'primary > sources');
}));

// ===========================================================================
// 4. No-data is never zero
// ===========================================================================

t('AC-23 — An unresearched sweep is hatched, disabled and named, never 0', () => withPage('D', async (page) => {
  await load(page, '/energy');
  // The complement keeps this criterion non-vacuous when every sweep has a file:
  // a researched sweep's chip exists, can be selected and is not hatched.
  for (const slug of [...FIX.sweeps].sort()) {
    const c = chip(page, slug);
    assert.ok(await c.count(), `${slug}: no chip`);
    assert.ok(await c.isEnabled(), `${slug}: researched chip is disabled`);
    assert.equal(await c.evaluate((el) => el.hasAttribute('data-nodata') || !!el.querySelector('[data-nodata]')), false, `${slug}: researched chip is hatched`);
  }
  for (const slug of FIX.absent) {
    const c = chip(page, slug);
    assert.ok(await c.count(), `${slug}: no chip`);
    assert.ok(await c.isDisabled(), `${slug}: chip enabled`);
    assert.ok(await c.evaluate((el) => el.hasAttribute('data-nodata') || !!el.querySelector('[data-nodata]')), `${slug}: no [data-nodata]`);
    const tx = await text(c);
    assert.ok(tx.includes('— not yet researched'), `${slug}: "${tx}"`);
    assert.doesNotMatch(tx, /(^|\s)\d+(\s|$)/, `${slug}: chip carries a digit "${tx}"`);
    await c.evaluate((el) => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    assert.notEqual(await c.getAttribute('aria-pressed'), 'true', `${slug}: absent chip became pressed`);
  }
  if (FIX.absent.length) {
    const body = await page.locator('main').innerText();
    assert.match(body, /\d+ of 12 sweeps researched; not yet: /, 'strip caption');
    const note = page.locator('main *').filter({ hasText: /\d+ of 12 planned sweeps are researched: / }).last();
    assert.ok(await note.count(), 'no note above the canvas');
    const above = await note.evaluate((el) => { const svg = document.querySelector('#stage svg'); return !!svg && !!(el.compareDocumentPosition(svg) & Node.DOCUMENT_POSITION_FOLLOWING); });
    assert.ok(above, 'note is not above the canvas');
  }
}));

/** Find the twin row for a claim, paging forward if the table is longer than a page. */
async function twinRow(page, id) {
  for (let p = 0; p < 10; p += 1) {
    const row = page.locator(`#twin [data-claim="${id}"]`).first();
    if (await row.count()) return row;
    const next = page.locator('#twin button').filter({ hasText: /^\s*next →\s*$/ }).first();
    if (!(await next.count()) || await next.isDisabled()) break;
    await next.click();
    await page.waitForTimeout(SETTLE);
  }
  return null;
}

t('AC-24 — Unknown amounts read "unknown", not ₹0', () => withPage('D', async (page) => {
  await load(page, `/energy?claim=${FIX.noAmount}`);
  const aside = await page.locator('main aside').first().innerText();
  assert.ok(aside.includes('no amount recorded'), 'aside lacks "no amount recorded"');
  assert.ok(!aside.includes('₹0'), 'aside prints ₹0');
  await load(page, '/energy?table=1');
  const row = await twinRow(page, FIX.noAmount);
  assert.ok(row, `no twin row [data-claim="${FIX.noAmount}"]`);
  const heads = (await page.locator('#twin thead th').allInnerTexts()).map((s) => s.trim());
  const col = heads.indexOf('₹');
  assert.ok(col >= 0, `no ₹ column (${heads.join(' | ')})`);
  const cell = row.locator('td, th').nth(col);
  assert.equal(await text(cell), '—');
  assert.equal(await cell.getAttribute('title'), 'no amount recorded');
}));

t('AC-25 — The benchmark distinguishes zero from unjoinable', () => withPage('D', async (page) => {
  await load(page, '/energy');
  const table = page.locator('#benchmark table').first();
  assert.ok(await table.count(), '#benchmark has no table');
  const heads = (await table.locator('thead th').allInnerTexts()).map((s) => s.trim().toLowerCase());
  const direct = heads.findIndex((h) => h.includes('direct'));
  const symbol = heads.findIndex((h) => /symbol|nse|ticker/.test(h));
  assert.ok(direct >= 0, `no direct-claims column (${heads.join(' | ')})`);
  assert.ok(symbol >= 0, `no symbol column (${heads.join(' | ')})`);
  const rows = table.locator('tbody tr');
  const rn = await rows.count();
  assert.ok(rn > 0, 'no constituent rows');
  const symbols = [];
  for (let r = 0; r < rn; r += 1) {
    const row = rows.nth(r);
    const cells = await row.locator('td, th').allInnerTexts();
    symbols.push(cells[symbol].trim());
    const nodata = await row.locator('[data-nodata]').count();
    if (nodata) {
      assert.ok(cells.join(' ').includes('not in platform dataset — cannot be joined'), `row ${r}: hatched without its reason`);
    } else {
      const tier = await row.locator('span').filter({ hasText: new RegExp('^\\s*(' + TIER_WORDS.join('|') + ')\\s*$') }).count();
      if (!tier) assert.equal(cells[direct].trim(), '0', `row ${r}: no tier chip and direct-claims "${cells[direct]}"`);
    }
  }
  const sorted = [...symbols].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  assert.deepEqual(symbols, sorted, 'rows not in code-unit order by symbol');
}));

t('AC-26 — Empty audit tables and absent symmetry checks say what their emptiness means', () => withPage('D', async (page) => {
  await load(page, '/energy');
  const killed = page.locator('#missing table').filter({ has: page.locator('caption', { hasText: /Killed in audit/ }) })
    .or(page.locator('#missing *').filter({ hasText: /Killed in audit/ }).locator('xpath=following::table[1]')).first();
  assert.ok(await killed.count(), 'no Killed in audit table in #missing');
  if ((await killed.locator('tbody tr').count()) === 0) {
    const tx = await page.locator('#missing').innerText();
    assert.ok(tx.includes('No claim was killed. Either the audit found nothing or it has not run'), 'empty killed table without its meaning');
    assert.ok(tx.includes('ENERGY_META.audit is '), 'empty killed table without its audit state');
  }
  for (const slug of FIX.absent) {
    const block = page.locator('#baserates [data-nodata]').filter({ hasText: 'Not yet researched' }).filter({ hasText: new RegExp(esc(SWEEP_LABEL[slug]), 'i') }).first();
    assert.ok(await block.count(), `#baserates: no hatched "Not yet researched" block for ${slug}`);
    assert.doesNotMatch(await text(block), /\d+ base rates?/, `${slug}: hatched block prints a count`);
  }
}));

t('AC-27 — Filters that leave nothing say so and keep the voids', () => withPage('D', async (page) => {
  await load(page, '/energy?tier=analytic&pred=bond&min=99999');
  const msg = page.locator('#stage *:not(svg):not(svg *)').filter({ hasText: /^0 of \d+ claims match\./ }).last();
  assert.ok(await msg.count(), 'no "0 of N claims match." DOM message');
  const clear = page.locator('#stage button').filter({ hasText: /^\s*clear \S/ });
  assert.ok(await clear.count() >= 1, 'no "clear …" button');
  assert.ok(await page.locator('button').filter({ hasText: /^\s*reset graph filters\s*$/ }).count(), 'no "reset graph filters" button');
  assert.match(await page.locator('main aside').first().innerText(), /\d+ documented voids/, 'aside lost its voids');
  assert.ok((await page.locator('[role=status]').allInnerTexts()).join(' ').includes('0 of'), '[role=status] lacks "0 of"');
}));

t('AC-28 — A void count of zero says "not written down"', async () => {
  for (const slug of [...FIX.sweeps].sort()) {
    await withPage('D', async (page) => {
      await load(page, `/energy?dom=${slug}`);
      // Wait for the margin itself to say one or the other, not for a fixed settle:
      // on a loaded machine the lazy route can still be committing after SETTLE.
      await page.waitForFunction(() => {
        const a = document.querySelector('main aside');
        if (!a) return false;
        const tx = a.innerText;
        return (/\d+ documented voids — absences that were looked for/.test(tx) && !!a.querySelector('li'))
          || tx.includes('That means none was written down, not that none exists.');
      }, null, { timeout: 20_000 }).catch(() => {});
      const aside = page.locator('main aside').first();
      const tx = await aside.innerText();
      const has = /\d+ documented voids — absences that were looked for/.test(tx) && (await aside.locator('li').count()) >= 1;
      const none = tx.includes('That means none was written down, not that none exists.');
      assert.ok(has || none, `${slug}: aside neither lists voids nor says none was written down`);
    });
  }
});

t('AC-29 — Undeclared coverage prints its "not declared" form', () => withPage('D', async (page) => {
  await load(page, '/energy?from=2010-01-01&to=2012-12-31');
  const ok = (s) => s.includes('no sweep declares its search years') || /\d+ of \d+ researched sweeps declare search years/.test(s);
  assert.equal(await fact(page, 10).count(), 1, 'no [data-strip-fact="10"]');
  assert.ok(ok(await text(fact(page, 10))), 'fact 10 lacks a coverage form');
  assert.ok(ok(await page.locator('#stage').innerText()), 'canvas status lacks a coverage form');
  const st = chip(page, 'states');
  assert.ok(await st.count(), 'no states chip');
  assert.match(await text(st), /states searched: (not declared|.+)/, 'states chip lacks "states searched:"');
}));

// ===========================================================================
// 5. Denials beside claims
// ===========================================================================

const responseColumn = (page) => column(page, 'The response');
const claimColumn = (page) => column(page, 'Who gained');

t('AC-30 — The claim card gives the response equal space', async () => {
  await withPage('D', async (page) => {
    await load(page, `/energy?claim=${FIX.answered}`);
    const [c, r] = [claimColumn(page), responseColumn(page)];
    assert.ok(await c.count() && await r.count(), 'headings missing');
    const [cr, rr] = [await rect(c), await rect(r)];
    assert.ok(Math.abs(cr.width - rr.width) <= 2, `column widths ${cr.width} vs ${rr.width}`);
    const [cp, rp] = [c.locator('p').first(), r.locator('p').first()];
    assert.equal(await style(cp, 'fontSize'), await style(rp, 'fontSize'), 'font-size differs');
    assert.equal(await style(cp, 'fontWeight'), await style(rp, 'fontWeight'), 'font-weight differs');
    assert.equal(await style(r, 'borderLeftWidth'), '2px', 'response column border');
    const rose = await page.evaluate(() => { const d = document.createElement('div'); d.style.color = 'var(--color-rose)'; document.body.appendChild(d); const c = getComputedStyle(d).color; d.remove(); return c; });
    assert.equal(await style(r, 'borderLeftColor'), rose, 'response border is not the rose colour');
  });
  await withPage('M', async (page) => {
    await load(page, `/energy?claim=${FIX.answered}`);
    const [c, r] = [claimColumn(page), responseColumn(page)];
    const [cr, rr] = [await rect(c), await rect(r)];
    assert.ok(rr.top > cr.bottom - 1, 'M: response not stacked under the claim');
    assert.ok(Math.abs(cr.width - rr.width) <= 2, `M: widths ${cr.width} vs ${rr.width}`);
    assert.equal(await style(c.locator('p').first(), 'fontSize'), await style(r.locator('p').first(), 'fontSize'), 'M: font-size differs');
  });
});

t('AC-31 — A recorded response is shown in full', () => withPage('D', async (page) => {
  await load(page, `/energy?claim=${FIX.answered}`);
  const r = responseColumn(page);
  assert.ok(await r.count(), 'no response column');
  const tx = await r.innerText();
  const answers = responsesTo(FIX.answered);
  assert.ok(answers.some((a) => tx.includes(labelOf(a.s))), `no responder label among ${answers.map((a) => labelOf(a.s)).join(', ')}`);
  assert.ok(answers.some((a) => a.d && tx.includes(a.d.slice(0, 60))), 'contra text missing');
  assert.ok(await r.locator('span').filter({ hasText: new RegExp('^\\s*(' + TIER_WORDS.join('|') + ')\\s*$') }).count(), 'no TierChip');
  assert.ok(await r.locator('a[href^="http"]').count(), 'no Cite link');
  assert.ok(await page.locator(`#stage [data-claim="${FIX.answered}"] ~ [data-response-tick]`).count(), 'no sibling [data-response-tick]');
}));

t('AC-32 — No response is stated as loudly as a response', async () => {
  await withPage('D', async (page) => {
    await load(page, `/energy?claim=${FIX.silentDoc}`);
    const e = edgeById.get(FIX.silentDoc);
    const [c, r] = [claimColumn(page), responseColumn(page)];
    assert.ok(await r.count(), 'no response column');
    const body = (await r.innerText()).replace(/^\s*The response\s*/, '').trim();
    assert.equal(body, `No response recorded. The register does not record whether ${labelOf(e.s)} or ${labelOf(e.t)} was asked.`);
    const rp = r.locator('p').first();
    const cp = c.locator('p').first();
    assert.equal(await style(rp, 'color'), await style(cp, 'color'), 'colour differs');
    assert.equal(await style(rp, 'fontSize'), await style(cp, 'fontSize'), 'font-size differs');
  });
  await withPage('D', async (page) => {
    await load(page, `/energy?claim=${FIX.alleged}`);
    const r = responseColumn(page);
    assert.ok(await r.count(), 'no response column');
    const tx = await r.innerText();
    if (tx.includes('No response recorded')) {
      const warn = r.locator('*').filter({ hasText: "Under this platform's rules this claim should not have shipped." }).last();
      assert.ok(await warn.count(), 'unanswered allegation without the shipping warning');
      const amber = await page.evaluate(() => { const d = document.createElement('div'); d.style.color = 'var(--color-amber)'; document.body.appendChild(d); const c = getComputedStyle(d).color; d.remove(); return c; });
      assert.equal(await style(warn, 'color'), amber, 'warning is not amber');
    } else {
      const answers = responsesTo(FIX.alleged);
      assert.ok(answers.some((a) => tx.includes(labelOf(a.s))), 'no responder label');
    }
  });
});

t('AC-33 — Edges and nodes name their responses in text', () => withPage('D', async (page) => {
  await load(page, '/energy');
  const bad = await page.locator('#stage [data-claim]').evaluateAll((els) => els
    .map((e) => e.getAttribute('aria-label') ?? e.getAttribute('title') ?? e.querySelector('title')?.textContent ?? '')
    .filter((s) => !/· (\d+ responses recorded|no response recorded( — listed in Gaps)?)$/.test(s)));
  assert.ok(await page.locator('#stage [data-claim]').count() > 0, 'no [data-claim] edges');
  assert.deepEqual(bad.slice(0, 3), [], `${bad.length} edges lack a response phrase`);
  const nodes = page.locator('#stage g[role=button][data-id]');
  assert.ok(await nodes.count() > 0, 'no g[role=button][data-id] nodes');
  const badNodes = await nodes.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') ?? '').filter((s) => !/, .* · \d+ claims · \d+ responses recorded · /.test(s)));
  assert.deepEqual(badNodes.slice(0, 3), [], `${badNodes.length} nodes lack the response phrase`);
  const ticks = page.locator('#stage [data-response-tick]');
  const hidden = await ticks.evaluateAll((els) => els.every((e) => e.getAttribute('aria-hidden') === 'true'));
  assert.ok(hidden, 'a response tick is not aria-hidden');
}));

t('AC-34 — Contested lists every allegation with its answer', () => withPage('D', async (page) => {
  await load(page, '/energy');
  const [, A] = await factNum(page, 3);
  const blocks = await page.locator('#contested').evaluate((sec) => {
    const leaves = [...sec.querySelectorAll('*')].filter((e) => e.children.length === 0 && /Alleged\s*$/.test(e.textContent));
    const seen = new Set();
    const out = [];
    for (const l of leaves) {
      let b = l;
      while (b && b !== sec && !b.textContent.includes('The claim — ')) b = b.parentElement;
      if (!b || b === sec || seen.has(b)) continue;
      seen.add(b);
      out.push({ text: b.innerText, hasOpen: [...b.querySelectorAll('button')].some((x) => /open in graph/i.test(x.textContent)) });
    }
    return out;
  });
  assert.ok(blocks.length >= A, `${blocks.length} allegation blocks < ${A}`);
  for (const b of blocks) {
    assert.ok(b.text.includes('The claim — '), 'block lacks "The claim — "');
    const answered = b.text.includes('The response — ');
    if (!answered) {
      assert.ok(b.text.includes('No response recorded'), 'block lacks a response and a stated absence');
      assert.ok(b.text.includes('The register does not record whether'), 'stated absence lacks the "was asked" sentence');
    }
    assert.ok(b.hasOpen, 'block lacks "open in graph"');
  }
  await page.locator('#contested button').filter({ hasText: /open in graph/i }).first().click();
  await waitForParam(page, 'claim');
  assert.ok(hashParams(page).get('claim'), 'open in graph did not set claim=');
}));

t('AC-35 — Tier and relation filters never hide the answer to a visible claim', () => withPage('D', async (page) => {
  const tier = edgeById.get(FIX.answered).tier;
  await load(page, `/energy?tier=${tier}&claim=${FIX.answered}`);
  const r = responseColumn(page);
  assert.ok(await r.count(), 'no response column');
  const tx = await r.innerText();
  assert.ok(responsesTo(FIX.answered).some((a) => tx.includes(labelOf(a.s))), 'no responder listed');
  assert.ok(await page.locator(`#stage [data-claim="${FIX.answered}"] ~ [data-response-tick]`).count(), 'no response tick');
  assert.ok((await page.locator('main').innerText()).includes('responses to visible claims are never hidden'), 'tier control lacks its note');
}));

t('AC-36 — Strip and Contested agree on answered allegations', () => withPage('D', async (page) => {
  await load(page, '/energy');
  const [n, d] = await factNum(page, 3);
  const den = await text(page.locator('#contested [data-denominator]').first());
  const m = den.match(/(\d+)\D+(\d+)/);
  assert.ok(m, `#contested denominator "${den}"`);
  assert.deepEqual([int(m[1]), int(m[2])], [n, d]);
}));

// ===========================================================================
// 6. URL round-trip of every filter
// ===========================================================================

const checkboxNamed = (page, re) => page.getByRole('checkbox', { name: re }).first();

t('AC-37 — Page-owned parameters set their controls on load', () => withPage('D', async (page) => {
  await load(page, `/energy?dom=coal,money&idx=${FIX.key}&via=group&bsort=amount&nar=contested&isec=energy&ixf=${FIX.key}&sup=1&table=1`);
  for (const slug of DECLARED_SWEEPS) {
    const c = chip(page, slug);
    if (!(await c.count())) continue;
    assert.equal(await c.getAttribute('aria-pressed'), slug === 'coal' || slug === 'money' ? 'true' : 'false', `chip ${slug}`);
  }
  assert.ok(await page.locator(`input[type=radio][value="${FIX.key}"]`).first().isChecked(), 'index radio');
  assert.ok(await checkboxNamed(page, /include via group/i).isChecked(), 'include via group');
  const sortActive = await page.locator('#benefit').evaluate((sec) => {
    const sel = [...sec.querySelectorAll('select')].find((s) => s.value === 'amount');
    const btn = [...sec.querySelectorAll('button[aria-pressed="true"], [role=radio][aria-checked="true"], input:checked')].find((b) => /amount/i.test(b.textContent || b.value || ''));
    return !!(sel || btn);
  });
  assert.ok(sortActive, 'ledger sort is not amount');
  assert.equal(await page.locator('#contested button[aria-pressed="true"]').filter({ hasText: /^\s*contested\b/i }).count(), 1, 'narrative chip contested');
  assert.ok(await checkboxNamed(page, /energy sectors only/i).isChecked(), 'energy sectors only');
  const ixf = await page.locator('#benchmark').evaluate((sec, key) => {
    const sel = [...sec.querySelectorAll('select')].find((s) => s.value === key);
    const btn = [...sec.querySelectorAll('button[aria-pressed="true"], input:checked')].find((b) => (b.value === key) || (b.textContent || '').includes(key));
    return !!(sel || btn);
  }, FIX.key);
  assert.ok(ixf, 'membership filter does not show FIX.key');
  assert.ok(await checkboxNamed(page, /include superseded/i).isChecked(), 'include superseded');
  assert.equal(await page.locator('#twin').count(), 1, '#twin');
}));

t('AC-38 — Controls write their parameters without a new history entry', () => withPage('D', async (page) => {
  await load(page, '/energy');
  const len = await page.evaluate(() => history.length);
  const step = async (act, key, value) => {
    await act();
    await page.waitForFunction(([k, v]) => new URLSearchParams(location.hash.split('?')[1] ?? '').get(k) === v, [key, value], { timeout: 5_000 });
    assert.equal(await page.evaluate(() => history.length), len, `history grew after ${key}=${value}`);
  };
  await step(() => chip(page, 'coal').click(), 'dom', 'coal');
  await step(() => page.locator('#benefit').evaluate((sec) => {
    const sel = sec.querySelector('select');
    if (sel) { sel.value = 'amount'; sel.dispatchEvent(new Event('change', { bubbles: true })); return; }
    [...sec.querySelectorAll('button')].find((b) => /^\s*amount\s*$/i.test(b.textContent))?.click();
  }), 'bsort', 'amount');
  await step(() => checkboxNamed(page, /include superseded/i).check(), 'sup', '1');
  await step(() => page.getByRole('button', { name: /show table/i }).first().click(), 'table', '1');
  await step(() => checkboxNamed(page, /energy sectors only/i).check(), 'isec', 'energy');
  await step(() => page.locator('#contested button[aria-pressed]').filter({ hasText: /^\s*speculative\b/i }).first().click(), 'nar', 'speculative');
  await step(() => page.locator(`input[type=radio][value="${FIX.key}"]`).first().check(), 'idx', FIX.key);
}));

t('AC-39 — Graph parameters round-trip through the rail', async () => {
  await withPage('D', async (page) => {
    await load(page, `/energy?q=coal&tier=documented,reported&min=100&from=2015-01-01&to=2020-12-31&sel=${FIX.company}&focus=${FIX.company}&hops=2&claim=${FIX.claim}`);
    assert.equal(await page.locator('#gq').inputValue(), 'coal');
    for (const w of TIER_WORDS) {
      const cb = checkboxNamed(page, new RegExp('^' + w + '$', 'i'));
      assert.ok(await cb.count(), `no ${w} checkbox`);
      assert.equal(await cb.isChecked(), w === 'Documented' || w === 'Reported', `${w} checkbox`);
    }
    assert.equal(await page.locator('#amt').inputValue(), '100');
    const dates = await page.locator('input[type=date]').evaluateAll((els) => els.map((e) => e.value));
    assert.ok(dates.includes('2015-01-01') && dates.includes('2020-12-31'), `date inputs ${dates.join(', ')}`);
    assert.equal(await page.locator(`[data-id="${FIX.company}"]`).first().getAttribute('aria-pressed'), 'true', 'selected node');
    assert.equal(await page.getByRole('button', { name: /^2 hops$/ }).first().getAttribute('aria-pressed'), 'true', '2 hops button');
    assert.ok((await page.locator('main aside').first().innerText()).includes(`claim ${FIX.claim}`), 'aside claim');
  });
  await withPage('D', async (page) => {
    await load(page, '/energy');
    await page.locator('#gq').fill('coal');
    await page.waitForFunction(() => new URLSearchParams(location.hash.split('?')[1] ?? '').get('q') === 'coal', null, { timeout: 5_000 });
    await checkboxNamed(page, /^alleged$/i).uncheck();
    await page.waitForFunction(() => { const t = new URLSearchParams(location.hash.split('?')[1] ?? '').get('tier'); return t !== null && !t.includes('alleged'); }, null, { timeout: 5_000 });
    await page.locator('#stage [role=group][aria-label="Filter by entity type"] button').first().click();
    await waitForParam(page, 'ty');
    const node = page.locator('#stage g[role=button][data-id][tabindex="0"]').first();
    await node.focus();
    await page.keyboard.press('Enter');
    await waitForParam(page, 'sel');
    await page.locator('#stage [data-claim]').first().click({ force: true });
    await waitForParam(page, 'claim');
    const box = page.locator('main aside [role=combobox]').first();
    assert.ok(await box.count(), 'no "path to…" combobox in the NodeCard');
    await box.fill(labelOf(FIX.b).slice(0, 4));
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await waitForParam(page, 'path');
  });
});

t('AC-40 — A reload reproduces the view exactly', async () => {
  const routes = ['/energy', '/energy?dom=coal&tier=alleged', `/energy?idx=${FIX.key}&via=group`, `/energy?claim=${FIX.claim}`, `/energy?path=${FIX.a},${FIX.b}&table=1`];
  for (const r of routes) {
    await withPage('D', async (page) => {
      await load(page, r);
      const snap = async () => [
        await text(fact(page, 1)),
        r.includes('table=1') ? (await text(page.locator('#twin caption').first())).match(/\d+ rows?/)?.[0] : null,
        await text(page.locator('main aside [tabindex="-1"]').first()),
      ];
      const a = await snap();
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(SETTLE);
      assert.deepEqual(await snap(), a, `${r}: view changed on reload`);
    });
  }
});

t('AC-41 — Unknown list values are dropped, not honoured', () => withPage('D', async (page) => {
  await load(page, '/energy?tier=documented,bogus&pred=award,nonsense');
  for (const w of TIER_WORDS) assert.equal(await checkboxNamed(page, new RegExp('^' + w + '$', 'i')).isChecked(), w === 'Documented', `${w} checkbox`);
  const preds = await page.locator('input[type=checkbox]').evaluateAll((els) => els.filter((e) => e.checked).map((e) => e.value || e.getAttribute('name') || e.id));
  assert.ok(preds.includes('award'), `award not checked (${preds.join(', ')})`);
  assert.ok(!preds.includes('nonsense'), 'nonsense checked');
  const hash = new URL(page.url()).hash;
  assert.ok(!hash.includes('bogus') && !hash.includes('nonsense'), `hash still carries bogus values: ${hash}`);
}));

t('AC-42 — A stale or killed id is named in an announced amber line', () => withPage('D', async (page) => {
  await load(page, '/energy?claim=__missing__&dom=coal');
  const status = page.locator('[role=status]').filter({ hasText: 'The linked item `__missing__` is not in this version of the register (as of ' }).first();
  assert.ok(await status.count(), 'no status line for the missing id');
  const above = await status.evaluate((el) => { const svg = document.querySelector('#stage svg'); return !!svg && !!(el.compareDocumentPosition(svg) & Node.DOCUMENT_POSITION_FOLLOWING); });
  assert.ok(above, 'status line is not above the canvas');
  assert.equal(await chip(page, 'coal').getAttribute('aria-pressed'), 'true', 'coal chip lost');
  if (FIX.killed) {
    await load(page, `/energy?claim=${FIX.killed}`);
    const s = (await page.locator('[role=status]').allInnerTexts()).join('\n');
    assert.ok(s.includes(`Claim \`${FIX.killed}\` was killed in audit:`), 'killed claim not named');
    assert.ok(s.includes('It is listed under Killed in audit.'), 'killed claim not pointed at its table');
  }
}));

t('AC-43 — Reset clears only the graph\'s own keys', () => withPage('D', async (page) => {
  await load(page, `/energy?dom=coal&bsort=amount&tier=alleged&sel=${FIX.company}`);
  await page.getByRole('button', { name: /^reset\b/i }).first().click();
  await page.waitForFunction(() => !new URLSearchParams(location.hash.split('?')[1] ?? '').has('tier'), null, { timeout: 5_000 });
  const p = hashParams(page);
  assert.ok(!p.has('tier') && !p.has('sel'), `graph keys survive reset: ${p}`);
  assert.equal(p.get('dom'), 'coal');
  assert.equal(p.get('bsort'), 'amount');
}));

t('AC-44 — Nothing is selected or filtered by default', () => withPage('D', async (page) => {
  await load(page, '/energy');
  assert.equal(new URL(page.url()).hash.split('?')[1] ?? '', '', 'search part not empty');
  assert.equal(await page.locator('button[aria-pressed="true"]').evaluateAll((els) => els.filter((e) => !e.closest('#stage') && !e.closest('#benefit') && !e.closest('#contested')).length), 0, 'a chip is pressed');
  assert.equal(await page.locator('#stage g[aria-pressed="true"]').count(), 0, 'a node is pressed');
  assert.ok(await page.locator('input[type=radio][value="none"]').first().isChecked(), 'index radio is not none');
  const sortName = await page.locator('#benefit').evaluate((sec) => {
    const sel = sec.querySelector('select');
    if (sel) return sel.value === 'name';
    return [...sec.querySelectorAll('button[aria-pressed="true"]')].some((b) => /^\s*name\s*$/i.test(b.textContent));
  });
  assert.ok(sortName, 'ledger sort is not name');
  const groups = await page.locator('#benefit h3, #benefit h4').allInnerTexts();
  assert.ok(groups.length >= 2, 'fewer than two ledger groups');
  assert.ok(groups[0].trim() <= groups[1].trim(), `groups not in code-unit order: "${groups[0]}" > "${groups[1]}"`);
}));

// ===========================================================================
// 7. Table twin
// ===========================================================================

async function twinRows(page) {
  const foot = await page.locator('#twin').innerText();
  const m = foot.match(/rows \d+–\d+ of (\d+)/);
  assert.ok(m, 'twin footer lacks "rows a–b of n"');
  return int(m[1]);
}

async function drawnEdges(page) {
  const direct = await page.locator('#stage [data-claim]').count();
  const batch = await page.locator('#stage svg[role=img][aria-label*="further relationships drawn in batches"]').evaluateAll((els) => els.reduce((s, e) => s + Number((e.getAttribute('aria-label').match(/(\d+)/) ?? [0, 0])[1]), 0));
  return direct + batch;
}

t('AC-45 — The twin\'s row count equals the drawn graphic', async () => {
  for (const r of ['/energy?table=1', '/energy?table=1&dom=coal&tier=documented', `/energy?table=1&focus=${FIX.company}&hops=1`]) {
    await withPage('D', async (page) => {
      await load(page, r);
      const n = await twinRows(page);
      assert.equal(n, await drawnEdges(page), `${r}: rows ≠ drawn edges`);
      assert.equal(n, (await factNum(page, 1))[0], `${r}: rows ≠ fact 1 numerator`);
    });
  }
});

/** Orphans as #missing reports them; 0 when the section has no denominator yet. */
async function orphanCount(page) {
  const den = page.locator('#missing [data-denominator]').first();
  if (!(await den.count())) return 0;
  return int((await den.innerText()).match(/(\d+) orphans/)?.[1] ?? '0');
}

/** Every row text across every page of the twin. */
async function allTwinRowTexts(page) {
  const out = [];
  for (let p = 0; p < 10; p += 1) {
    out.push(...await page.locator('#twin tbody tr').allInnerTexts());
    const next = page.locator('#twin button').filter({ hasText: /^\s*next →\s*$/ }).first();
    if (!(await next.count()) || await next.isDisabled()) break;
    await next.click();
    await page.waitForTimeout(SETTLE);
  }
  return out;
}

t('AC-46 — Superseded and orphan rows are marked and counted', async () => {
  let n0;
  await withPage('D', async (page) => { await load(page, '/energy?table=1'); n0 = await twinRows(page); });
  await withPage('D', async (page) => {
    await load(page, '/energy?table=1&sup=1');
    const n1 = await twinRows(page);
    assert.equal(n1, n0 + FIX.superseded, `sup=1 rows ${n1} ≠ ${n0} + ${FIX.superseded}`);
    const eff = await text(page.locator('#twin [data-effect]').first());
    assert.match(eff, /^\d+ → \d+ rows$/, `twin effect "${eff}"`);
    const rows = await allTwinRowTexts(page);
    assert.equal(rows.filter((r) => r.includes('superseded by ')).length, FIX.superseded, 'superseded rows not marked');
    const orphans = await orphanCount(page);
    if (orphans > 0) {
      const tail = rows.slice(-orphans);
      assert.ok(tail.every((r) => r.includes('not in platform — not drawn')), 'orphans do not close the table');
    }
  });
});

t('AC-47 — Nineteen columns, nothing truncated', () => withPage('D', async (page) => {
  await load(page, '/energy?table=1');
  const heads = (await page.locator('#twin thead th').allInnerTexts()).map((s) => s.trim());
  assert.deepEqual(heads, TWIN_HEADERS, 'twin headers');
  const ellipsis = await page.locator('#twin td, #twin th').evaluateAll((els) => els.filter((e) => getComputedStyle(e).textOverflow === 'ellipsis').length);
  assert.equal(ellipsis, 0, 'a cell truncates with an ellipsis');
  const tx = await page.locator('#twin').innerText();
  assert.doesNotMatch(tx, /show more|…and \d+ more/, 'twin hides content');
  const bad = await page.locator('#twin tbody tr').evaluateAll((rows, col) => rows.filter((r) => {
    const cell = r.children[col];
    if (!cell || !cell.textContent.trim()) return false;
    return ![...cell.querySelectorAll('a[href^="http"]')].some((a) => /^https?:\/\//.test(a.textContent.trim()));
  }).length, TWIN_HEADERS.length - 1);
  assert.equal(bad, 0, `${bad} sources cells lack a URL-text link`);
}));

t('AC-48 — Rows open a claim through a real button', () => withPage('D', async (page) => {
  await load(page, '/energy?table=1');
  const rows = page.locator('#twin tbody tr');
  const n = Math.min(20, await rows.count());
  assert.ok(n > 0, 'no rows');
  for (let i = 0; i < n; i += 1) {
    const row = rows.nth(i);
    const btn = row.locator('td, th').first().locator('button').first();
    assert.ok(await btn.count(), `row ${i}: id cell has no button`);
    const name = await btn.evaluate((b) => b.getAttribute('aria-label') ?? b.textContent.trim());
    assert.match(name, /^Open claim .+, (documented|reported|alleged|analytic), (\d{4}-\d{2}-\d{2}|undated)$/i, `row ${i}: name "${name}"`);
    assert.match(await text(row), /\d+ responses?/, `row ${i}: no responses count`);
  }
  await rows.first().locator('button').first().focus();
  await page.keyboard.press('Enter');
  await waitForParam(page, 'claim');
  const focused = await page.evaluate(() => { const a = document.activeElement; return !!a && !!a.closest('main aside') && a.getAttribute('tabindex') === '-1'; });
  assert.ok(focused, 'focus is not on the aside heading');
}));

t('AC-49 — Pagination lives in the URL', () => withPage('D', async (page) => {
  await load(page, '/energy?table=1');
  const n = await twinRows(page);
  const next = page.locator('#twin button').filter({ hasText: /^\s*next →\s*$/ }).first();
  if (n > 400) {
    await next.click();
    await waitForParam(page, 'tp');
    assert.equal(hashParams(page).get('tp'), '2');
    assert.match(await page.locator('#twin').innerText(), /rows 401–/);
  } else {
    assert.ok(!hashParams(page).has('tp'), 'tp in hash');
    assert.ok(!(await next.count()) || await next.isDisabled(), 'next enabled on a single page');
  }
}));

t('AC-50 — Download CSV is present, static and complete', () => withPage('D', async (page) => {
  await load(page, '/energy?table=1');
  const n = await twinRows(page);
  const btn = page.getByRole('button', { name: /^Download CSV — \d+ rows$/ }).first();
  assert.ok(await btn.count(), 'no Download CSV button');
  assert.equal(int((await text(btn)).match(/(\d+) rows/)[1]), n, 'button count ≠ n');
  const requests = [];
  page.on('request', (r) => requests.push(r.url()));
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 10_000 }), btn.click()]);
  const dir = mkdtempSync(join(tmpdir(), 'icip-energy-csv-'));
  const file = join(dir, 'energy.csv');
  await dl.saveAs(file);
  assert.deepEqual(requests.filter((u) => !u.startsWith('blob:') && !u.startsWith('data:')), [], `network requests: ${requests.join(', ')}`);
  const raw = readFileSync(file, 'utf8');
  assert.ok(raw.startsWith('﻿'), 'no UTF-8 BOM');
  const lines = raw.slice(1).split('\n');
  assert.ok(lines.slice(0, 4).every((l) => l.startsWith('#')), 'first four lines are not # comments');
  assert.ok(lines.slice(0, 4).some((l) => l.includes('run run-')), 'header lacks run id');
  assert.ok(lines.slice(0, 4).some((l) => l.includes('as of ')), 'header lacks as of');
  const rows = parseCsv(lines.filter((l) => !l.startsWith('#')).join('\n'));
  const data = rows.slice(1).filter((r) => r.some((c) => c.length));
  const orphans = await orphanCount(page);
  assert.ok(data.length === n || data.length === n + orphans, `csv rows ${data.length} ≠ ${n} (or ${n + orphans})`);
  const unsafe = data.flat().filter((c) => /^[=+\-@]/.test(c));
  assert.deepEqual(unsafe.slice(0, 3), [], `${unsafe.length} cells begin with a formula character`);
}));

t('AC-51 — Every twin carries a caption with count and filters in words', () => withPage('D', async (page) => {
  await load(page, `/energy?table=1&path=${FIX.a},${FIX.b}`);
  const check = async (loc, label) => {
    assert.ok(await loc.count(), `${label}: no caption`);
    const tx = await text(loc);
    assert.match(tx, /\d+ rows?/, `${label}: "${tx}"`);
    assert.ok(/unfiltered|filter/.test(tx), `${label}: no filter words "${tx}"`);
    return int(tx.match(/(\d+) rows?/)[1]);
  };
  await check(page.locator('#twin caption').first(), '#twin');
  const lanes = await check(page.locator('#offices caption').first(), 'lanes twin');
  assert.equal(lanes, await page.locator('#offices svg [data-tenure]').count(), 'lanes twin rows ≠ tenure bars');
  const hist = await check(histogramTwin(page).locator('caption').first(), 'histogram twin');
  assert.equal(hist, await histogram(page).locator('rect').count(), 'histogram twin rows ≠ bins');
}));

// ===========================================================================
// 8. Keyboard reachability
// ===========================================================================

const activeInfo = (page) => page.evaluate(() => {
  const a = document.activeElement;
  if (!a) return null;
  const r = a.getBoundingClientRect();
  return { tag: a.tagName, text: a.textContent.trim(), inStage: !!a.closest('#stage'), inTwin: !!a.closest('#twin'), inAside: !!a.closest('main aside'), tabindex: a.getAttribute('tabindex'), visible: r.width > 0 && r.height > 0 && getComputedStyle(a).visibility !== 'hidden', groupText: a.parentElement?.textContent.trim() ?? '' };
});

t('AC-52 — Skip links lead the stage', () => withPage('D', async (page) => {
  await load(page, '/energy');
  await sweepChips(page).last().focus();
  let info = null;
  for (let i = 0; i < 12; i += 1) {
    await page.keyboard.press('Tab');
    info = await activeInfo(page);
    if (info?.inStage) break;
  }
  assert.ok(info?.inStage, 'Tab never reached #stage');
  assert.equal(info.tag, 'A', `first focus in #stage is ${info.tag}`);
  assert.ok(info.groupText.includes(SKIP_TEXT), `skip group reads "${info.groupText}"`);
  assert.ok(info.visible, 'skip link not visible while focused');
  await page.locator('#stage a').filter({ hasText: /^\s*go to the margin\s*$/ }).first().focus();
  await page.keyboard.press('Enter');
  info = await activeInfo(page);
  assert.ok(info.inAside && info.tabindex === '-1', 'go to the margin did not focus the aside heading');
  await page.locator('#stage a').filter({ hasText: /^\s*go to the table\s*$/ }).first().focus();
  await page.keyboard.press('Enter');
  await waitForParam(page, 'table');
  info = await activeInfo(page);
  assert.ok(info.inTwin, 'go to the table did not move focus into #twin');
}));

t('AC-53 — Answers written from outside the canvas move focus to the margin', () => withPage('D', async (page) => {
  await load(page, '/energy');
  const heading = page.locator('main aside [tabindex="-1"]').first();
  assert.ok(await heading.count(), 'no aside heading with tabindex=-1');
  assert.equal(await text(heading), 'Margin');
  let previous = 'Margin';
  const via = async (btn, label) => {
    await btn.focus();
    await page.keyboard.press('Enter');
    // The specific condition: focus is on the aside heading AND the heading has been
    // re-rendered for this answer (it no longer reads what the previous one left).
    await page.waitForFunction((prev) => {
      const a = document.activeElement;
      return !!a?.closest('main aside') && a.getAttribute('tabindex') === '-1' && a.textContent.trim() !== 'Margin' && a.textContent.trim() !== prev;
    }, previous, { timeout: 20_000 }).catch(() => {});
    const info = await activeInfo(page);
    previous = info?.text ?? previous;
    assert.ok(info.inAside && info.tabindex === '-1', `${label}: focus not on the aside heading`);
    assert.notEqual(info.text, 'Margin', `${label}: heading still reads Margin`);
    return info.text;
  };
  const lab = page.locator('#benefit button').first();
  assert.ok(await lab.count(), 'no #benefit lab button');
  const claimLabel = await via(lab, '#benefit');
  assert.ok(claimLabel.length > 0);
  await via(page.locator('#benchmark button').filter({ hasText: /open in graph/i }).first(), '#benchmark');
  await via(page.locator('#contested button').filter({ hasText: /open in graph/i }).first(), '#contested');
}));

t('AC-54 — Every actionable control is a focusable element with a visible ring', () => withPage('D', async (page) => {
  await load(page, `/energy?path=${FIX.a},${FIX.b}&table=1`);
  const failures = await page.evaluate(() => {
    const rail = document.querySelector('#gq')?.closest('form, details, fieldset, section, aside, div') ?? null;
    const railEls = rail ? [...rail.querySelectorAll('input, button, select')] : [];
    const groups = {
      chips: [...document.querySelectorAll('button[aria-pressed]')],
      rail: railEls,
      benefit: [...document.querySelectorAll('#benefit button')],
      benchmark: [...document.querySelectorAll('#benchmark button')],
      contested: [...document.querySelectorAll('#contested button')],
      tenure: [...document.querySelectorAll('#offices svg [data-tenure]')],
      tick: [...document.querySelectorAll('#offices svg [data-tick]')],
      // On page 1 "← previous" is disabled, and a disabled button is not an actionable
      // control; the enabled pager buttons are.
      pager: [...document.querySelectorAll('#twin button')].filter((b) => /next →|← prev/i.test(b.textContent) && !b.disabled),
      download: [...document.querySelectorAll('button')].filter((b) => /Download CSV/.test(b.textContent)),
      narrative: [...document.querySelectorAll('#contested button[aria-pressed]')],
    };
    const out = [];
    for (const [name, els] of Object.entries(groups)) {
      if (!els.length) { out.push(`${name}: no elements`); continue; }
      els.forEach((el, i) => {
        const ok = ['BUTTON', 'INPUT', 'SELECT'].includes(el.tagName) || (el.tagName === 'A' && el.hasAttribute('href')) || el.getAttribute('tabindex') === '0';
        if (!ok) { out.push(`${name}[${i}]: not focusable (${el.tagName.toLowerCase()})`); return; }
        el.focus({ focusVisible: true });
        if (document.activeElement !== el) { out.push(`${name}[${i}]: focus() did not land`); return; }
        const s = getComputedStyle(el);
        const ring = (s.outlineStyle !== 'none' && s.outlineWidth !== '0px') || s.boxShadow !== 'none';
        if (!ring) out.push(`${name}[${i}]: no focus ring`);
      });
    }
    return out;
  });
  assert.deepEqual(failures.slice(0, 5), [], `${failures.length} control failures`);
  await page.locator('#offices svg [data-tick]').first().focus();
  await page.keyboard.press('Enter');
  await waitForParam(page, 'claim');
}));

t('AC-55 — Nodes are keyboard operable and keep focus', () => withPage('D', async (page) => {
  await load(page, '/energy');
  const node = page.locator('#stage g[role=button][data-id][tabindex="0"]').first();
  assert.ok(await node.count(), 'no focusable node');
  await node.focus();
  await page.keyboard.press('Enter');
  await waitForParam(page, 'sel');
  const still = await node.evaluate((el) => document.activeElement === el);
  assert.ok(still, 'node lost focus after Enter');
  const status = (await page.locator('[role=status]').allInnerTexts()).join('\n');
  assert.ok(status.includes('Opened ') && status.includes(' in the margin'), `status "${status}"`);
  const described = await node.evaluate((el) => { const id = el.getAttribute('aria-describedby'); const t = id && document.getElementById(id); if (!t) return false; const r = t.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
  assert.ok(described, 'no visible hover card via aria-describedby');
}));

t('AC-56 — One status region, before the canvas, that announces filters', () => withPage('D', async (page) => {
  await load(page, '/energy');
  const regions = page.locator('#stage [role=status], #stage [aria-live]');
  assert.equal(await regions.count(), 1, 'not exactly one status region in #stage');
  const before = await regions.first().evaluate((el) => { const svg = document.querySelector('#stage svg'); return !!svg && !!(el.compareDocumentPosition(svg) & Node.DOCUMENT_POSITION_FOLLOWING); });
  assert.ok(before, 'status region does not precede the canvas');
  await chip(page, 'coal').click();
  await waitForParam(page, 'dom');
  await page.waitForFunction(() => /\d+ → \d+/.test(document.querySelector('#stage [role=status], #stage [aria-live]')?.textContent ?? ''), null, { timeout: 5_000 }).catch(() => {});
  assert.match(await regions.first().innerText(), /\d+ → \d+/, 'status region did not announce the filter');
  const hidden = await regions.first().evaluate((el) => { const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return (s.clip && s.clip !== 'auto') || s.clipPath !== 'none' || (r.width <= 1 && r.height <= 1); });
  assert.ok(hidden, 'status region is not visually hidden');
  const inFrame = await page.locator('#stage').evaluate((st) => { const el = [...st.querySelectorAll('*')].find((e) => e.children.length === 0 && /\d+ of \d+ claims/.test(e.textContent) && !e.closest('[role=status], [aria-live]')); return el ? !!el.closest('[aria-hidden="true"]') : null; });
  assert.equal(inFrame, true, 'in-frame status is not aria-hidden');
}));

t('AC-57 — The company box is an ARIA 1.2 combobox', () => withPage('D', async (page) => {
  await load(page, '/energy');
  const box = page.locator('input[role=combobox]').first();
  assert.ok(await box.count(), 'no input[role=combobox]');
  assert.ok(await box.getAttribute('aria-expanded') !== null, 'no aria-expanded');
  const controls = await box.getAttribute('aria-controls');
  assert.ok(controls && await page.locator(`#${controls}[role=listbox]`).count(), 'aria-controls does not name a listbox');
  assert.ok(companyRow?.nse, 'FIX.company has no symbol');
  await box.fill(companyRow.nse.slice(0, 3));
  await page.waitForFunction(() => [...document.querySelectorAll('[role=status]')].some((e) => /\d+ matching constituents/.test(e.textContent)), null, { timeout: 5_000 }).catch(() => {});
  assert.match((await page.locator('[role=status]').allInnerTexts()).join('\n'), /\d+ matching constituents/, 'no live match count');
  await box.press('ArrowDown');
  const active = await box.getAttribute('aria-activedescendant');
  assert.ok(active && await page.locator(`#${active}[role=option]`).count(), 'aria-activedescendant does not name an option');
  await box.press('Enter');
  await waitForParam(page, 'sel');
  const p = hashParams(page);
  assert.equal(p.get('sel'), FIX.company);
  assert.equal(p.get('focus'), FIX.company);
  assert.equal(p.get('hops'), '1');
  const info = await activeInfo(page);
  assert.ok(info.inAside && info.tabindex === '-1', 'aside heading not focused');
  assert.ok(info.text.includes(labelOf(FIX.company).split(' ')[0]), `heading "${info.text}" does not name the company`);
}));

t('AC-58 — The margin stands alone when the canvas is gone', () => withPage('D', async (page) => {
  await load(page, `/energy?claim=${FIX.claim}`);
  await page.addStyleTag({ content: '#stage svg{display:none}' });
  const aside = page.locator('main aside').first();
  const tx = await aside.innerText();
  assert.ok(tx.includes(`claim ${FIX.claim}`), 'aside lacks claim id');
  assert.ok(/₹[\d,.]+/.test(tx) || tx.includes('no amount recorded'), 'aside lacks amount or its absence');
  assert.ok(/\d{4}-\d{2}-\d{2}|\d{4}/.test(tx) || tx.includes('undated'), 'aside lacks date');
  assert.ok((await aside.locator('a[href^="http"]').allInnerTexts()).some((s) => /^https?:\/\//.test(s.trim())), 'no URL as text');
  assert.ok(/\d+ responses/.test(tx) || tx.includes('No response recorded'), 'aside lacks response');
  assert.match((await page.locator('[role=status]').allInnerTexts()).join('\n'), /lit: claim/i, 'status lacks "Lit: claim"');
}));

// ===========================================================================
// 9. Mobile at 390 px
// ===========================================================================

const noSideScroll = (page) => page.evaluate(() => ({
  doc: document.documentElement.scrollWidth <= window.innerWidth,
  body: document.body.scrollWidth <= window.innerWidth,
  w: [document.documentElement.scrollWidth, document.body.scrollWidth, window.innerWidth],
}));

t('AC-59 — No horizontal page scroll at any width', async () => {
  const routes = [
    ['/energy', full], [`/energy?claim=${FIX.claim}`, full], [`/energy?dom=coal&idx=${FIX.key}&tier=alleged`, full],
    [`/energy?path=${FIX.a},${FIX.b}&table=1`, full], [`/energy?sel=${FIX.company}&focus=${FIX.company}&hops=1`, full], ['/energy', empty],
  ];
  for (const vp of ['M', 'D']) {
    for (const [r, srv] of routes) {
      await withPage(vp, async (page) => {
        await load(page, r, srv.base);
        let s = await noSideScroll(page);
        assert.ok(s.doc && s.body, `${vp} ${r}${srv === empty ? ' (empty)' : ''}: sideways scroll ${s.w}`);
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(200);
        s = await noSideScroll(page);
        assert.ok(s.doc && s.body, `${vp} ${r}: sideways scroll after scrolling ${s.w}`);
      });
    }
  }
});

t('AC-60 — Below 640 every table stacks and nothing scrolls sideways', () => withPage('M', async (page) => {
  await load(page, '/energy?table=1');
  const tables = await page.locator('main table').evaluateAll((els) => els.map((t) => {
    const cols = t.querySelectorAll('thead th').length;
    const dl = t.parentElement?.querySelector('dl') ?? t.closest('section, div')?.querySelector('dl');
    const dts = dl ? dl.querySelectorAll('dt').length : 0;
    const vis = dl ? (dl.getBoundingClientRect().height > 0 && getComputedStyle(dl).display !== 'none') : false;
    return { display: getComputedStyle(t).display, cols, dts, vis };
  }));
  assert.ok(tables.length > 0, 'no tables in main');
  tables.forEach((tb, i) => {
    assert.equal(tb.display, 'none', `table ${i} still displayed`);
    assert.ok(tb.vis, `table ${i} has no visible dl twin`);
    assert.ok(tb.dts > 0 && tb.cols > 0 && tb.dts % tb.cols === 0, `table ${i}: ${tb.dts} dt for ${tb.cols} columns`);
  });
  const scrollers = await page.locator('main *').evaluateAll((els) => els.filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => ({ inOffices: !!e.closest('#offices'), hasSvg: !!e.querySelector('svg'), tag: e.tagName, cls: e.className?.toString?.().slice(0, 60) })));
  const stray = scrollers.filter((s) => !(s.inOffices && s.hasSvg));
  assert.deepEqual(stray.slice(0, 3), [], `${stray.length} elements scroll sideways outside the lanes container`);
  const btn = page.locator('#offices button[aria-expanded]').first();
  assert.ok(await btn.count(), 'no lanes toggle button');
  assert.equal(await btn.getAttribute('aria-expanded'), 'false', 'lanes not hidden by default');
}));

t('AC-61 — The first phone screen answers "what, how much, as of when, what is missing"', () => withPage('M', async (page) => {
  await load(page, '/energy');
  const within = async (loc, label) => { assert.ok(await loc.count(), `${label}: missing`); const r = await rect(loc); assert.ok(r.bottom <= 844 && r.height > 0, `${label}: bottom ${r.bottom}`); };
  await within(page.locator('main h1 ~ p').first(), 'byline');
  await within(fact(page, 1), 'fact 1');
  await within(fact(page, 3), 'fact 3');
  await within(fact(page, 6), 'fact 6');
  const voids = page.locator('main *').filter({ hasText: /^What the record does not show: \d+ documented voids$/ }).last();
  await within(voids, 'voids line');
  assert.ok(!(await fact(page, 5).count()) || !(await fact(page, 5).isVisible()), 'fact 5 visible at 390');
  await voids.tap();
  await page.waitForTimeout(SETTLE);
  const list = page.locator('main aside *').filter({ hasText: /documented voids/ }).last();
  const r = await rect(list);
  assert.ok(r.top >= 0 && r.top < 844, `void list top ${r.top} not in view`);
}));

t('AC-62 — Sweep chips wrap and the caption names what is absent', () => withPage('M', async (page) => {
  await load(page, '/energy');
  const rows = await page.locator('button[aria-pressed]').evaluateAll((els) => {
    const parents = [...new Set(els.map((e) => e.parentElement))];
    return parents.map((p) => ({ sw: p.scrollWidth, cw: p.clientWidth }));
  });
  assert.ok(rows.length > 0, 'no chip rows');
  rows.forEach((r, i) => assert.ok(r.sw <= r.cw, `chip row ${i} scrolls sideways (${r.sw} > ${r.cw})`));
  const chips = await page.locator('button[aria-pressed]').allInnerTexts();
  for (const c of chips) {
    const tx = c.replace(/\s+/g, ' ').trim();
    assert.ok(/^.+?\s\d+$/.test(tx) || tx.includes('not yet researched'), `chip "${tx}" is not label + integer`);
  }
  const body = await page.locator('main').innerText();
  assert.match(body, /select a sweep for its own breakdown\s*$/m, 'no "select a sweep" line');
  if (FIX.absent.length) assert.match(body, /\d+ of 12 sweeps researched; not yet: /, 'caption does not name absent sweeps');
}));

t('AC-63 — The aside is a non-modal bottom sheet over the canvas', () => withPage('M', async (page) => {
  await load(page, `/energy?claim=${FIX.claim}`);
  const aside = page.locator('main aside').first();
  assert.equal(await style(aside, 'position'), 'fixed', 'aside not fixed');
  const ar = await rect(aside);
  const ih = await page.evaluate(() => window.innerHeight);
  assert.ok(ar.bottom <= 844, `aside bottom ${ar.bottom}`);
  assert.ok(ar.height <= 0.4 * ih, `aside height ${ar.height} > 40% of ${ih}`);
  assert.equal(await aside.getAttribute('aria-modal'), null, 'aside is aria-modal');
  assert.ok(await aside.locator('button[aria-expanded]').count(), 'no expand/collapse button');
  const close = aside.getByRole('button', { name: /close/i }).first();
  assert.ok(await close.count(), 'no close button');
  const canvas = page.locator('#stage svg').first();
  const cr = await rect(canvas);
  const stripBottom = await fact(page, 1).evaluate((el) => { for (let e = el; e; e = e.parentElement) if (getComputedStyle(e).position === 'sticky') return e.getBoundingClientRect().bottom; return el.getBoundingClientRect().bottom; });
  assert.ok(cr.top >= stripBottom, `canvas top ${cr.top} above strip bottom ${stripBottom}`);
  assert.ok(ar.top > cr.top, 'aside is not over the canvas');
  await page.locator('#gq').fill('coal');
  await page.waitForFunction(() => new URLSearchParams(location.hash.split('?')[1] ?? '').get('q') === 'coal', null, { timeout: 5_000 });
  await close.tap();
  await page.waitForFunction(() => !new URLSearchParams(location.hash.split('?')[1] ?? '').has('claim'), null, { timeout: 5_000 });
  assert.equal(hashParams(page).get('q'), 'coal', 'q lost on close');
  // The layout scrolls inside <main> (the document itself does not scroll), so scroll
  // main until #stage's bottom is 50px above the viewport, and read it in the same tick.
  const stageGone = await page.evaluate(() => {
    const m = document.querySelector('main');
    const s = document.querySelector('#stage');
    m.scrollTop += s.getBoundingClientRect().bottom + 50;
    return s.getBoundingClientRect().bottom <= 0;
  });
  assert.ok(stageGone, 'could not scroll #stage out of view');
  // Wait for the sheet to dock, then require that it stays docked: a sheet that
  // re-floats a moment later is still covering the sections below.
  await page.waitForFunction(() => getComputedStyle(document.querySelector('main aside')).position !== 'fixed', null, { timeout: 5_000 }).catch(() => {});
  assert.notEqual(await style(aside, 'position'), 'fixed', 'aside still fixed with #stage off-screen');
  const refloated = await page.evaluate(() => new Promise((resolve) => {
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      if (getComputedStyle(document.querySelector('main aside')).position === 'fixed') { clearInterval(id); resolve(n * 100); }
      if (n >= 15) { clearInterval(id); resolve(0); }
    }, 100);
  }));
  assert.equal(refloated, 0, `aside docked, then became fixed again ~${refloated}ms later with main scrolled past #stage`);
}));

t('AC-64 — The canvas lets a vertical swipe through at rest', () => withPage('M', async (page) => {
  await load(page, '/energy');
  const canvas = page.locator('#stage svg').first();
  assert.ok(await canvas.count(), 'no canvas');
  const ta = () => canvas.evaluate((el) => getComputedStyle(el).touchAction);
  assert.notEqual(await ta(), 'none', 'canvas traps scroll at rest');
  assert.ok((await page.locator('#stage').innerText()).includes('tap the graph to pan and zoom'), 'no "tap the graph" hint');
  const r = await rect(canvas);
  await page.touchscreen.tap(r.left + 8, r.top + 8);
  await page.waitForFunction((sel) => getComputedStyle(document.querySelector(sel)).touchAction === 'none', '#stage svg', { timeout: 3_000 }).catch(() => {});
  assert.equal(await ta(), 'none', 'tap did not arm the canvas');
  const done = page.locator('#stage button').filter({ hasText: /^\s*done\s*$/i }).first();
  assert.ok(await done.count(), 'no done control');
  await done.tap();
  await page.waitForTimeout(200);
  assert.equal(await ta(), 'pan-y', 'done did not release the canvas');
}));

t('AC-65 — Search sits above the canvas and the rails are closed', async () => {
  await withPage('M', async (page) => {
    await load(page, '/energy');
    const gq = page.locator('#gq');
    assert.ok(await gq.isVisible(), '#gq hidden');
    assert.ok((await rect(gq)).top < (await rect(page.locator('#stage svg').first())).top, '#gq below the canvas');
    const rail = page.locator('details').filter({ has: page.locator('#amt') }).first();
    assert.ok(await rail.count(), 'rail is not a details');
    assert.equal(await rail.evaluate((d) => d.open), false, 'rail open at 390');
    const key = page.locator('details').filter({ has: page.locator('summary', { hasText: /^\s*How to read this graph\s*$/ }) }).first();
    assert.ok(await key.count(), 'no "How to read this graph" details');
    assert.equal(await key.evaluate((d) => d.open), false, 'reading key open at 390');
  });
  await withPage('T', async (page) => {
    await load(page, '/energy');
    const rail = page.locator('details').filter({ has: page.locator('#amt') }).first();
    assert.ok(await rail.count(), 'T: rail is not a details');
    assert.equal(await rail.evaluate((d) => d.open), true, 'T: rail closed at 768');
    assert.match(await text(rail.locator('summary').first()), /^Filters · \d+ active · \d+ → \d+ claims$/, 'T: rail summary');
  });
});

t('AC-66 — Lanes on a phone: twin first, SVG behind a button', () => withPage('M', async (page) => {
  await load(page, `/energy?claim=${FIX.claim}`);
  const dl = page.locator('#offices dl').first();
  assert.ok(await dl.count(), 'no dl in #offices');
  assert.ok(await dl.isVisible(), 'dl hidden');
  const order = await dl.evaluate((el) => { const svg = el.closest('#offices').querySelector('svg'); return !!svg && !!(el.compareDocumentPosition(svg) & Node.DOCUMENT_POSITION_FOLLOWING); });
  assert.ok(order, 'dl does not precede the svg');
  const btn = page.locator('#offices button').filter({ hasText: /^\s*Show lanes \(scrolls sideways\)\s*$/ }).first();
  assert.ok(await btn.count(), 'no Show lanes button');
  assert.equal(await btn.getAttribute('aria-expanded'), 'false');
  await btn.tap();
  await page.waitForTimeout(SETTLE);
  assert.ok(await page.locator('#offices svg').first().isVisible(), 'svg not revealed');
  assert.match(await page.locator('#offices').innerText(), /axis clipped to \d{4}–\d{4} around the lit claim; the full span is \d{4}–\d{4}/, 'no clipped-axis caption');
}));

t('AC-67 — Every cannot-show block is full size on a phone', () => withPage('M', async (page) => {
  await load(page, '/energy');
  const blocks = page.locator('[data-cannot-show]');
  const n = await blocks.count();
  assert.ok(n > 0, 'no [data-cannot-show]');
  for (let i = 0; i < n; i += 1) {
    const b = blocks.nth(i);
    assert.ok(await b.isVisible(), `block ${i} hidden`);
    assert.equal(await style(b, 'fontSize'), '14px', `block ${i} font-size`);
    assert.ok(await noDetailsAncestor(b), `block ${i} inside details`);
  }
}));
