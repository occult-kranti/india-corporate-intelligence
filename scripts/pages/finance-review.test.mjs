#!/usr/bin/env node
/**
 * /finance review checks — the gates the semantics review asked for, kept apart from the
 * blind-written acceptance suite (scripts/pages/finance.test.mjs), which this file does not
 * change. Black-box, like that suite: it serves `dist` (or FINANCE_DIST) itself, drives the
 * pinned Chromium, and derives every expected value from the generated modules, never from
 * src/data/financeView.ts.
 *
 *   R1 (FG-30, matrix)  a matrix cell's border is its tier's dash: the count of cells drawn
 *                       in each dash equals the count of holder × company pairs whose weakest
 *                       filing tier is that tier; aggregates take the analytic dash; and in a
 *                       greyscale screenshot a reported cell's border breaks where a
 *                       documented cell's does not.
 *   R2                  the strip's "answered" count excludes placeholder contras.
 *   R3                  the strip's placed ₹ is the spec's strict rule: a state government as
 *                       borrower or as the benefit `who` (§3.2 placement, F5, D7).
 *   R4                  a flow band and the unplaced segment really narrow the project list.
 *
 * Run: npm run build && FINANCE_DIST=<copy of dist> node --test scripts/pages/finance-review.test.mjs
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { dossierUrl } from './dossier-navigation.mjs';
import { createServer } from 'node:http';
import { existsSync, readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SETTLE = 700;
const NO_RESPONSE = 'No response recorded — asked/not asked unknown';

async function importGenerated(rel, tag) {
  const src = readFileSync(join(root, rel), 'utf8');
  const js = src.replace(/^import type .*$/gm, '').replace(/^export const ([A-Z_]+): [A-Za-z_<>, |]+(\[\])? = /gm, 'export const $1 = ');
  const dir = mkdtempSync(join(tmpdir(), `icip-finance-review-${tag}-`));
  const file = join(dir, `${tag}.mjs`);
  writeFileSync(file, js);
  return import(pathToFileURL(file).href);
}
const fin = await importGenerated('src/graph/finance.generated.ts', 'finance');
const ngo = await importGenerated('src/graph/ngo.generated.ts', 'ngo');
const cap = await importGenerated('src/graph/capital.generated.ts', 'capital');
const indices = JSON.parse(readFileSync(join(root, 'research/raw/indices.json'), 'utf8'));

const NODES = new Map([...fin.FINANCE_NODES, ...ngo.NGO_NODES, ...cap.CAPITAL_NODES].map((n) => [n.id, n]));
const finite = (v) => typeof v === 'number' && Number.isFinite(v);
const num = (s) => Number(String(s).replace(/,/g, ''));
const TIER_RANK = ['documented', 'reported', 'alleged', 'analytic'];
const weakest = (ts) => ts.reduce((w, t) => (TIER_RANK.indexOf(t) > TIER_RANK.indexOf(w) ? t : w), 'documented');

// Loans: the census and the spec's strict placement.
const LOANS = [...fin.FINANCE_EDGES.filter((e) => e.pred === 'loan'), ...cap.CAPITAL_EDGES.filter((e) => e.pred === 'loan')];
const CENSUS = LOANS.filter((e) => fin.FINANCE_EDGE_DOMAIN[e.id] === 'worldbank-projects');
const BENEFIT = new Map(fin.FINANCE_BENEFITS.map((b) => [b.claimId, b]));
const stateNode = (id) => { const n = id ? NODES.get(id) : null; return n && n.ty === 'state' && n.st ? n : null; };
const strictPlaced = (e) => !!(stateNode(e.t) ?? stateNode(BENEFIT.get(e.id)?.who));
const round2 = (v) => Math.round(v * 100) / 100;
const PLACED_CR = round2(CENSUS.filter((e) => finite(e.a) && strictPlaced(e)).reduce((s, e) => s + e.a, 0));
const FACTS = fin.FINANCE_LOAN_FACTS ?? {};
const UNPLACED_IDS = CENSUS.filter((e) => !strictPlaced(e) && !FACTS[e.id]?.st).map((e) => e.id);

// Associations: allegations and the contras that really answer them.
const isPlaceholder = (c) => (c.lab ?? '').startsWith(NO_RESPONSE) || (c.d ?? '').startsWith(NO_RESPONSE);
const CONTRAS = [...fin.FINANCE_EDGES, ...ngo.NGO_EDGES, ...cap.CAPITAL_EDGES].filter((e) => e.pred === 'contra' && e.t.startsWith('claim:'));
const NGO_ALLEGED = ngo.NGO_EDGES.filter((e) => e.tier === 'alleged' && e.pred !== 'contra');
const ANSWERED = NGO_ALLEGED.filter((e) => CONTRAS.some((c) => c.t === `claim:${e.id}` && !isPlaceholder(c))).length;

// Capital: holder × company pairs in the NIFTY 50 matrix, by the weakest tier of their filing lines.
const COLUMN_IDS = new Set((indices.indices?.nifty50 ?? []).map((c) => c.existingId).filter(Boolean));
const OWN_IDX = cap.CAPITAL_EDGES.filter((e) => e.pred === 'own' && COLUMN_IDS.has(e.t));
const isAgg = (e) => cap.CAPITAL_EDGE_DOMAIN[e.id] === 'holders-aggregates';
const pairs = new Map();
for (const e of OWN_IDX) { const k = `${e.s}|${e.t}`; if (!pairs.has(k)) pairs.set(k, []); pairs.get(k).push(e); }
const LINE_PAIRS_BY_TIER = {};
let AGG_ONLY_PAIRS = 0;
for (const es of pairs.values()) {
  const lines = es.filter((e) => !isAgg(e));
  if (lines.length) { const t = weakest(lines.map((e) => e.tier)); LINE_PAIRS_BY_TIER[t] = (LINE_PAIRS_BY_TIER[t] ?? 0) + 1; } else AGG_ONLY_PAIRS++;
}

// ---------------------------------------------------------------------------
// Server and browser (the pattern of scripts/smoke.mjs)
// ---------------------------------------------------------------------------

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
let browser; let server; let base; let ctx;
before(async () => {
  const dist = process.env.FINANCE_DIST ?? join(root, 'dist');
  if (!existsSync(join(dist, 'index.html'))) throw new Error(`${dist}/index.html missing — run \`npm run build\` first.`);
  server = createServer((req, res) => {
    const p = decodeURIComponent((req.url ?? '/').split('?')[0]);
    const file = join(dist, p === '/' ? 'index.html' : p);
    if (!file.startsWith(dist) || !existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
  const PINNED = process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/opt/pw-browsers/chromium';
  browser = await chromium.launch(existsSync(PINNED) ? { executablePath: PINNED } : {});
  ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  ctx.setDefaultTimeout(5000);
});
after(async () => { await browser?.close(); server?.close(); });

async function withPage(fn) {
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try { await fn(page); assert.deepEqual(errors, [], `page errors: ${errors.join(' | ')}`); } finally { await page.close(); }
}
async function load(page, route) {
  await page.goto('about:blank', { timeout: 30_000 });
  await page.goto(dossierUrl(base, route), { waitUntil: 'networkidle', timeout: 30_000 });
  // Lazy route readiness has the same budget as the main finance acceptance suite;
  // individual interactions retain this review suite's five-second action limit.
  await page.waitForSelector('.iw-dossier-content article.pb-20', { timeout: 30_000 });
  await page.waitForTimeout(SETTLE);
}
const stripText = async (page) => (await page.locator('section[aria-label="Denominators"]').first().innerText()).replace(/\s+/g, ' ');

// ---------------------------------------------------------------------------
// R1 — FG-30 for the matrix
// ---------------------------------------------------------------------------

/** On/off runs along the brightest of a cell's top rows, in a greyscale screenshot. */
async function borderRuns(page, cellHandle) {
  const png = await cellHandle.screenshot({ style: 'html { filter: grayscale(1) }' });
  return page.evaluate(async (b64) => {
    const img = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
    const c = new OffscreenCanvas(img.width, img.height);
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const { data, width } = g.getImageData(0, 0, img.width, Math.min(4, img.height));
    const rows = [0, 1, 2, 3].filter((y) => y < img.height).map((y) => Array.from({ length: width }, (_, x) => data[(y * width + x) * 4]));
    const row = rows.sort((a, b) => b.reduce((s, v) => s + v, 0) - a.reduce((s, v) => s + v, 0))[0];
    // Ignore the corners, where the rect's stroke meets the side strokes.
    const inner = row.slice(3, row.length - 3);
    const lo = Math.min(...inner); const hi = Math.max(...inner);
    if (hi - lo < 25) return { runs: [inner.length], contrast: hi - lo };
    const mid = (lo + hi) / 2;
    const runs = []; let on = inner[0] > mid; let n = 0;
    for (const v of inner) { const o = v > mid; if (o === on) n++; else { runs.push(n); on = o; n = 1; } }
    runs.push(n);
    return { runs, contrast: hi - lo };
  }, png.toString('base64'));
}

test('R1 — FG-30: every matrix cell is drawn in its own tier dash, and reported is not documented in greyscale', async () => {
  await withPage(async (page) => {
    await load(page, '/finance?lens=capital');
    const legend = await page.evaluate((tiers) => Object.fromEntries(tiers.map((t) => [t, document.querySelector(`[data-reading-key] [data-tier="${t}"] [stroke-dasharray]`)?.getAttribute('stroke-dasharray') ?? ''])), TIER_RANK);
    assert.ok(legend.reported && legend.analytic && legend.reported !== legend.analytic, `the reading key carries distinct reported and analytic dashes (${JSON.stringify(legend)})`);
    // The outer frame is the cell's last rect: an inset aggregate square, when present, comes first.
    const cells = await page.evaluate(() => [...document.querySelectorAll('[data-cell="line"], [data-cell="aggregate"]')].map((c) => {
      const rects = [...c.querySelectorAll('svg rect')];
      return { state: c.getAttribute('data-cell'), outer: rects.at(-1)?.getAttribute('stroke-dasharray') ?? '', inner: rects.length > 1 ? (rects[0].getAttribute('stroke-dasharray') ?? '') : null, border: getComputedStyle(c).borderTopWidth };
    }));
    // Preflight gives every element `border: 0 solid`; what matters is that no width draws it.
    for (const c of cells) assert.equal(c.border, '0px', 'no CSS border stands in for a dash');
    for (const tier of ['documented', 'reported', 'alleged']) {
      const drawn = cells.filter((c) => c.state === 'line' && c.outer === legend[tier]).length;
      assert.equal(drawn, LINE_PAIRS_BY_TIER[tier] ?? 0, `line cells drawn in the ${tier} dash = holder × company pairs whose weakest filing tier is ${tier}`);
    }
    const aggOnly = cells.filter((c) => c.state === 'aggregate');
    assert.equal(aggOnly.length, AGG_ONLY_PAIRS, 'aggregate-only cells = pairs with only aggregates');
    assert.ok(aggOnly.every((c) => c.outer === legend.analytic), 'every aggregate-only cell has the analytic dash');
    const mixed = cells.filter((c) => c.state === 'line' && c.inner != null);
    assert.ok(mixed.every((c) => c.inner === legend.analytic), 'a line cell that also holds an aggregate shows it as an inset square in the analytic dash');

    // Greyscale pixels: a reported cell's border breaks; a documented cell's does not.
    /** The first cell in a state whose single frame carries the dash (no inset aggregate square). */
    const pick = async (dash, state = 'line') => {
      for (const h of await page.$$(`[data-cell="${state}"]`)) {
        const f = await h.evaluate((c) => { const rs = [...c.querySelectorAll('svg rect')]; return { dash: rs.at(-1)?.getAttribute('stroke-dasharray') ?? '', n: rs.length }; });
        if (f.dash === dash && f.n === 1) return h;
      }
      return null;
    };
    const doc = await pick(legend.documented);
    const rep = await pick(legend.reported);
    const agg = await pick(legend.analytic, 'aggregate');
    assert.ok(doc && rep, 'a documented and a reported line cell exist to compare');
    for (const h of [doc, rep, agg]) if (h) await h.scrollIntoViewIfNeeded();
    const d = await borderRuns(page, doc);
    const r = await borderRuns(page, rep);
    assert.ok(d.runs.length <= 2, `documented border is unbroken in greyscale (runs ${JSON.stringify(d.runs)})`);
    assert.ok(r.runs.length >= 3 && r.contrast >= 25, `reported border breaks in greyscale (runs ${JSON.stringify(r.runs)}, contrast ${r.contrast})`);
    if (agg) {
      const a = await borderRuns(page, agg);
      assert.ok(a.runs.length >= 3, `analytic border breaks in greyscale (runs ${JSON.stringify(a.runs)})`);
      assert.notDeepEqual(a.runs, r.runs, 'the analytic and reported borders break differently');
    }
  });
});

// ---------------------------------------------------------------------------
// R2 — placeholders are not answers
// ---------------------------------------------------------------------------

test('R2 — the strip counts only real responses as answers', async () => {
  await withPage(async (page) => {
    await load(page, '/finance?lens=associations');
    const m = (await stripText(page)).match(/(\d+) of (\d+) allegations with a recorded response/);
    assert.ok(m, 'strip fact 3 present');
    assert.equal(Number(m[2]), NGO_ALLEGED.length, 'denominator = alleged NGO claims');
    assert.equal(Number(m[1]), ANSWERED, `answered = claims with a contra that is not the no-response placeholder (${ANSWERED})`);
    const contested = await page.locator('#contested').innerText();
    const c = contested.match(/(\d+) alleged claims in this lens · (\d+) with a recorded response/);
    assert.ok(c && Number(c[2]) === ANSWERED, `Contested denominator agrees (${c?.[0]})`);
  });
});

// ---------------------------------------------------------------------------
// R3 — strict placement is borrower or implementer
// ---------------------------------------------------------------------------

test('R3 — the strip places ₹ by the spec\'s strict rule (borrower or benefit who)', async () => {
  await withPage(async (page) => {
    await load(page, '/finance');
    const m = (await stripText(page)).match(/₹([\d,.]+) cr of ₹([\d,.]+) cr placed in a state government/);
    assert.ok(m, 'strip fact 3 present');
    assert.ok(Math.abs(num(m[1]) - PLACED_CR) <= 0.5, `placed ₹ ${m[1]} = Σ census ₹ with a state government as borrower or implementer (${PLACED_CR})`);
    const key = await page.locator('[data-reading-key]').first().innerText();
    assert.ok(/placed — the record names a state government as borrower or implementer/.test(key.replace(/\s+/g, ' ')), 'the reading key defines placed as borrower or implementer');
  });
});

// ---------------------------------------------------------------------------
// R4 — the controls that say they filter the list do
// ---------------------------------------------------------------------------

test('R4 — a band and the unplaced segment narrow the project list, shown as a removable chip', async () => {
  await withPage(async (page) => {
    await load(page, '/finance');
    const btn = page.locator('figure svg[role="group"] button').first();
    const name = await btn.getAttribute('aria-label');
    const n = Number(name.match(/across (\d+) records/)[1]);
    await btn.click();
    const chip = page.locator('[data-list-focus]').first();
    await chip.waitFor();
    const cap = await page.locator('details[data-twin="project-list"] caption').first().innerText();
    assert.equal(Number(cap.match(/^(\d+) of \d+ loan records/)[1]), n, `the list shows the band's ${n} records (caption "${cap.slice(0, 80)}")`);
    await chip.getByRole('button', { name: 'remove' }).click();
    await page.locator('[data-list-focus]').waitFor({ state: 'detached' });
    await page.locator('[data-union-bar] button').first().click();
    await page.locator('[data-list-focus]').first().waitFor();
    const cap2 = await page.locator('details[data-twin="project-list"] caption').first().innerText();
    assert.equal(Number(cap2.match(/^(\d+) of \d+ loan records/)[1]), UNPLACED_IDS.length, `the unplaced segment narrows the list to the ${UNPLACED_IDS.length} census records placed by neither rule`);
  });
});
