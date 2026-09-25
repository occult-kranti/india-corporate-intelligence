#!/usr/bin/env node
/**
 * /welfare acceptance tests — one `node --test` case per criterion in
 * docs/design/WELFARE_ACCEPTANCE.md, named by its AC id.
 *
 * These are black-box checks against the built page: the file serves `dist` on an
 * ephemeral port (the same pattern as scripts/smoke.mjs — owning the server means the
 * only thing that can fail is the thing under test), drives the pinned Chromium, and
 * reads the DOM. Nothing here imports from src/ or reads the page implementation; the
 * criteria document is the whole contract, and where it names a component rather than
 * a selector (ControlCard, StatePanel, Cite …) the element is found by the text or role
 * the criteria themselves fix for it.
 *
 * Fixtures (a scheme id, a state with a value, a year with ballots …) are discovered
 * from the DOM of `/#/welfare?view=table` before the tests run, never hard-coded, so
 * the file keeps working when the register changes. A criterion whose fixture the
 * build does not contain is reported as `SKIPPED: <reason>` — never as a pass.
 *
 * Two builds exist (§0.1). By default the build is detected from the DOM (the EMPTY
 * build carries the `Register not yet promoted` callout); `WELFARE_BUILD=empty|full`
 * overrides, and `WELFARE_DIST=<dir>` points at a scratchpad dist. `WELFARE_SHOTS=<dir>`
 * saves the greyscale legend screenshots AC-83 asks for.
 *
 * Determinism: every wait is for a selector, a text or a URL condition; the only fixed
 * sleep is the 700 ms settle the criteria prescribe after `networkidle`.
 *
 * Run: npm run build && node --test scripts/pages/welfare.test.mjs
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const dist = process.env.WELFARE_DIST ?? join(root, 'dist');
const SHOTS = process.env.WELFARE_SHOTS ?? null;

// ----------------------------------------------------------------- static server
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.map': 'application/json',
  '.png': 'image/png', '.woff2': 'font/woff2',
};

let server = null;
let base = null;
let browser = null;
/** 'empty' | 'full' — which of the two builds (§0.1) this dist is. */
let BUILD = process.env.WELFARE_BUILD ?? null;
/** Fixtures discovered from the DOM (§0.3). Undefined entries skip their criteria. */
const F = {};

// Third-party font/CDN failures are an environment fact, not an app defect — smoke's
// allow-list, verbatim, so the two gates disagree about nothing.
const EXTERNAL = /fonts\.(googleapis|gstatic)\.com|ERR_CONNECTION_RESET|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|ERR_CERT_AUTHORITY_INVALID/;
const PINNED = process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/opt/pw-browsers/chromium';
const SETTLE = 700;

const CTX = {
  desktop: { viewport: { width: 1440, height: 900 } },
  fold: { viewport: { width: 1280, height: 800 } },
  phone: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
};

// Selectors the criteria fix outright.
const TIERS = ['documented', 'reported', 'alleged', 'analytic'];
const CITE = 'a[href^="http"]';
const LIVE = '[aria-live="polite"]';
const RANGE = 'input[type="range"][aria-label="Year"]';
const MAP = 'svg[role="img"][tabindex="0"]';
const SKIP_LINK = 'a[href="#stage-tables"]';
const SEARCH = 'input[type="search"][aria-label="Search schemes by name, alias or person"]';
const STRIP = '.sticky.top-0';
const SECTIONS = ['#control', '#ministers', '#after', '#benefits', '#findings', '#narratives', '#missing'];
const NON_VALUE_CLASSES = ['none recorded', 'live, no comparable figure', 'searched, none live'];

/**
 * In-page helpers, installed as an init script so every `page.evaluate` can use
 * `window.__ac` instead of re-declaring the same DOM walking. Regexes cross the
 * boundary as source strings because functions and RegExp objects do not serialise.
 */
const HELPERS = `
window.__ac = {
  txt(el) { return (el ? (el.innerText ?? el.textContent ?? '') : '').replace(/\\s+/g, ' ').trim(); },
  lines(el) { return (el?.innerText ?? '').split('\\n').map((s) => s.trim()).filter(Boolean); },
  re(src, flags) { return new RegExp(src, flags ?? ''); },
  /** Deepest element under root whose normalised text matches; the way a reader sees a line. */
  deepest(root, src, flags) {
    const r = new RegExp(src, flags ?? '');
    if (!root) return null;
    const all = [root, ...root.querySelectorAll('*')].filter((e) => r.test(this.txt(e)));
    return all.find((e) => ![...e.children].some((c) => r.test(this.txt(c)))) ?? null;
  },
  deepestAll(root, src, flags) {
    const r = new RegExp(src, flags ?? '');
    if (!root) return [];
    return [root, ...root.querySelectorAll('*')].filter(
      (e) => r.test(this.txt(e)) && ![...e.children].some((c) => r.test(this.txt(c))),
    );
  },
  precedes(a, b) { return !!(a && b && (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)); },
  param(href, name) {
    const q = (href ?? '').split('?')[1] ?? '';
    return new URLSearchParams(q.split('#')[0]).get(name);
  },
  urlParams() { return new URLSearchParams((location.hash.split('?')[1] ?? '').split('#')[0]); },
  /** First <table> under a selector (or the element itself), as headers + rows of {text, href}. */
  table(sel) {
    const rootEl = typeof sel === 'string' ? document.querySelector(sel) : sel;
    if (!rootEl) return null;
    const t = rootEl.matches?.('table') ? rootEl : rootEl.querySelector('table');
    if (!t) return null;
    const headers = [...t.querySelectorAll('thead th, thead td')].map((h) => this.txt(h));
    const rows = [...t.querySelectorAll('tbody tr')].map((tr) => ({
      cells: [...tr.children].map((c) => ({
        text: this.txt(c),
        href: c.querySelector('a')?.getAttribute('href') ?? null,
        hasCite: !!c.querySelector('a[href^="http"]'),
        html: c.innerHTML,
      })),
    }));
    return { headers, rows, caption: this.txt(t.querySelector('caption')) };
  },
  col(tbl, name) {
    if (!tbl) return -1;
    const n = name.toLowerCase();
    let i = tbl.headers.findIndex((h) => h.toLowerCase() === n);
    if (i < 0) i = tbl.headers.findIndex((h) => h.toLowerCase().startsWith(n));
    if (i < 0) i = tbl.headers.findIndex((h) => h.toLowerCase().includes(n));
    return i;
  },
  /** Focusable elements in DOM order — the sequence a Tab key walks. */
  focusables() {
    return [...document.querySelectorAll('a[href], button, input, select, textarea, summary, [tabindex]')]
      .filter((e) => !e.disabled && !e.closest('[aria-hidden="true"]') && (e.tabIndex ?? -1) >= 0
        && e.getClientRects().length > 0);
  },
  /** Resolve a design token to the rgb() the browser paints, so colours compare exactly. */
  tokenColor(name) {
    const s = document.createElement('span');
    s.style.color = 'var(' + name + ')';
    document.body.appendChild(s);
    const c = getComputedStyle(s).color;
    s.remove();
    return c;
  },
  /** The TimeLanes drawing: the svg whose axis carries the label 2000. */
  lanesSvg() {
    return [...document.querySelectorAll('svg')].find((s) =>
      [...s.querySelectorAll('text')].some((t) => t.textContent.trim() === '2000')) ?? null;
  },
  scrollBox(el) {
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      const o = getComputedStyle(e).overflowX;
      if (o === 'auto' || o === 'scroll') return e;
    }
    return null;
  },
  mapSvg() { return document.querySelector('figure svg[role="img"][tabindex="0"]') ?? document.querySelector('svg[role="img"][tabindex="0"]'); },
  figure() { return this.mapSvg()?.closest('figure') ?? document.querySelector('figure'); },
  /** The legend: named by the map's aria-describedby (AC-65); the id that is not the figcaption. */
  legend() {
    const svg = this.mapSvg();
    const ids = (svg?.getAttribute('aria-describedby') ?? '').split(/\\s+/).filter(Boolean);
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el && !el.matches('figcaption') && !el.closest('figcaption')) return el;
    }
    return this.deepest(this.figure() ?? document.body, 'not zero')?.parentElement ?? null;
  },
  /** A card is found by its title, then widened until it holds the lines the criteria list. */
  cardFor(titleSrc, mustSrc) {
    let el = this.deepest(document.body, titleSrc);
    const must = new RegExp(mustSrc ?? titleSrc);
    while (el && el !== document.body && !must.test(this.txt(el))) el = el.parentElement;
    return el && el !== document.body ? el : null;
  },
  controlCard() {
    return this.cardFor('Every assembly election in the file, with and without a fresh state scheme', '12 m ·');
  },
  /** StatePanel / SchemeCard: the ancestor of the close control that carries an h2. */
  panel() {
    const btn = document.querySelector('button[aria-label^="Close "]');
    let el = btn?.parentElement ?? null;
    while (el && el !== document.body && !el.querySelector('h2')) el = el.parentElement;
    return el && el !== document.body ? el : null;
  },
  readingKey() {
    const line = this.deepest(document.body, 'None of the three means zero\\\\.');
    if (!line) return null;
    return line.closest('ul, ol, dl') ?? line.parentElement;
  },
  /** The margin column: ReadingKey/ControlCard at rest, or the open panel. */
  margin() { return this.panel() ?? this.controlCard() ?? this.readingKey(); },
  strip() { return document.querySelector('.sticky.top-0'); },
  byline() {
    return this.deepestAll(document.querySelector('article') ?? document.body,
      '(\\\\d+ schemes ·|register not yet promoted · nothing below is zero)')
      .find((e) => !e.closest('.sticky.top-0')) ?? null;
  },
  /** The active-filter line under the strip: the first line after the strip naming a param. */
  activeFilterLine() {
    const strip = this.strip();
    const r = /(^|[\\s(])(y|m|cat|party|lvl|st|s|tier|view|q)=[^\\s]/;
    return this.deepestAll(document.querySelector('article') ?? document.body, r.source)
      .find((e) => !e.closest('figure, table, form, details, .sticky.top-0, svg') && (!strip || this.precedes(strip, e))) ?? null;
  },
  /** Category chips: pressable buttons whose text ends in a count. */
  chips() {
    return [...document.querySelectorAll('button')].filter((b) =>
      /\\((\\d+)\\)$/.test(this.txt(b)) && !TIERS_RE.test(this.txt(b)));
  },
  chipInfo() {
    return this.chips().map((b, i) => ({
      i, label: this.txt(b), count: +this.txt(b).match(/\\((\\d+)\\)$/)[1],
      pressed: b.getAttribute('aria-pressed'), ariaDisabled: b.getAttribute('aria-disabled'),
      disabled: b.hasAttribute('disabled'), tabIndex: b.tabIndex,
    }));
  },
  tierChips(root) {
    return [...(root ?? document).querySelectorAll('*')].filter((e) =>
      e.children.length === 0 && /^(documented|reported|alleged|analytic)$/.test(this.txt(e))
      && !e.closest('button, th, option'));
  },
  /** Allegation/Response pairs: one <dl> per item (AC-35). */
  pairs(root) {
    return [...(root ?? document).querySelectorAll('dl')].filter((dl) => {
      const k = [...dl.children];
      return k.length >= 4 && k[0].tagName === 'DT' && this.txt(k[0]) === 'Allegation' && k[1].tagName === 'DD'
        && k[2].tagName === 'DT' && this.txt(k[2]) === 'Response' && k[3].tagName === 'DD';
    });
  },
  selectedName(candidates) {
    for (const c of candidates) {
      const el = document.querySelector(c);
      if (el) return this.txt(el);
    }
    return null;
  },
};
const TIERS_RE = /^(documented|reported|alleged|analytic)\\b/;
`;

// ------------------------------------------------------------------ lifecycle
before(async () => {
  if (!existsSync(join(dist, 'index.html'))) {
    throw new Error(`welfare.test: ${dist}/index.html missing — run \`npm run build\` first.`);
  }
  server = createServer((req, res) => {
    const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
    let file = join(dist, url === '/' ? 'index.html' : url);
    if (!existsSync(file) || extname(file) === '') file = join(dist, 'index.html');
    try {
      res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
      res.end(readFileSync(file));
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch(existsSync(PINNED) ? { executablePath: PINNED } : {});
  if (SHOTS) mkdirSync(SHOTS, { recursive: true });

  // Which build is this? The EMPTY build announces itself (AC-02); read it, do not assume it.
  if (!BUILD) {
    await withPage('desktop', async (page) => {
      await go(page);
      const n = await page.locator('text=Register not yet promoted').count();
      BUILD = n > 0 ? 'empty' : 'full';
    }, { ignoreErrors: true });
  }
  if (BUILD === 'full') await discover();
});

after(async () => {
  await browser?.close();
  server?.close();
});

// -------------------------------------------------------------------- helpers
/** A fresh context per test: history, clipboard and focus never leak between criteria. */
async function withPage(kind, fn, { ignoreErrors = false } = {}) {
  const ctx = await browser.newContext({
    ...CTX[kind], reducedMotion: 'reduce', permissions: ['clipboard-read', 'clipboard-write'],
  });
  await ctx.addInitScript(HELPERS);
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !EXTERNAL.test(m.text())) errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  try {
    const out = await fn(page, ctx);
    // Any criterion fails if a console or page error fired on its route (§0.2).
    if (!ignoreErrors) assert.deepEqual(errors, [], 'console/page errors on the route');
    return out;
  } finally {
    await ctx.close();
  }
}

/** Navigate the way smoke does: about:blank first, so no route inherits another's crash. */
async function go(page, search = '') {
  await page.goto('about:blank');
  await page.goto(`${base}/#/welfare${search}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('article', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(SETTLE);
}

/** Open the exact URL a page reports (used by ROUND-TRIP step 3). */
async function goUrl(page, url) {
  await page.goto('about:blank');
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForSelector('article', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(SETTLE);
}

const evalTxt = (page, sel) => page.evaluate((s) => window.__ac.txt(document.querySelector(s)), sel);
const count = (page, sel) => page.locator(sel).count();
const params = (page) => page.evaluate(() => Object.fromEntries(window.__ac.urlParams().entries()));
const live = (page) => evalTxt(page, LIVE);

/** Skip — never pass — when the build or a fixture the criterion needs is absent. */
function requireFull(t) {
  if (BUILD === 'full') return true;
  t.skip('SKIPPED: FULL-build criterion; this dist is the EMPTY build');
  return false;
}
function requireEmpty(t) {
  if (BUILD === 'empty') return true;
  t.skip('SKIPPED: EMPTY-build criterion; this dist is the FULL build (set WELFARE_DIST to an empty build)');
  return false;
}
/**
 * §0.3: a FULL build always has a scheme, a party list, a 36-row year slice and a
 * category chip, so those fixtures have no fallback and their absence is a failure of
 * the page. The others (a state with a value, a year with ballots …) depend on what the
 * register happens to contain, and their absence skips the criterion with a reason.
 */
const REQUIRED = new Set(['SCHEME_ID', 'SCHEME_NAME', 'PARTY', 'STATE_NAMES', 'C1', 'C1_LABEL', 'C1_COUNT']);
/** Which twin (or section) each optional fixture is read from: a skip is only honest when that twin exists. */
const READ_FROM = {
  STATE_WITH_VALUE: 'year-slice', STATE_WITH_VALUE_NAME: 'year-slice', STATE_NONE: 'year-slice', STATE_NONE_NAME: 'year-slice',
  Y_WITH_BALLOTS: 'scrubber', Y_MONEY: 'scrubber', ALLEGED_SCHEME: '#findings', C2: 'chips', C2_LABEL: 'chips', C2_COUNT: 'chips', C0: 'chips',
};
function need(t, ...names) {
  for (const n of names) {
    if (F[n] === undefined || F[n] === null) {
      if (REQUIRED.has(n)) assert.fail(`fixture ${n} could not be read from /#/welfare?view=table, and a full build always has one`);
      const src = READ_FROM[n];
      if (src && F.MISSING_SOURCES?.includes(src)) {
        assert.fail(`fixture ${n} is read from the ${src} twin, which /#/welfare?view=table does not render`);
      }
      t.skip(`SKIPPED: fixture ${n} not present in this build`);
      return false;
    }
  }
  return true;
}

/** Accessible-name lookup across the roles a control might reasonably take. */
async function byName(page, name, roles = ['radio', 'option', 'button', 'tab', 'menuitemradio', 'checkbox']) {
  for (const role of roles) {
    const loc = page.getByRole(role, { name, includeHidden: true });
    if (await loc.count()) return loc.first();
  }
  return null;
}
const tierToggle = (page, tier) => page.getByRole('button', { name: tier, exact: true }).first();

/** innerText of the parts ROUND-TRIP compares: figure, TimeLanes, margin, strip. */
const stageText = (page) => page.evaluate(() => {
  const A = window.__ac;
  return {
    figure: A.txt(A.figure()),
    lanes: A.txt(A.lanesSvg()?.parentElement),
    margin: A.txt(A.margin()),
    strip: A.txt(A.strip()),
  };
});

/**
 * ROUND-TRIP(param), §6: load, assert, reopen the reported URL in a fresh page and
 * compare the stage, check the active-filter line names the param, then make the
 * named control change and confirm history.length did not grow (replace, not push).
 */
async function roundTrip(page, ctx, search, paramName, assertState, controlChange) {
  await go(page, search);
  await assertState(page);
  const url = page.url();
  const first = await stageText(page);
  const twin = await ctx.newPage();
  await goUrl(twin, url);
  const second = await stageText(twin);
  await twin.close();
  assert.deepEqual(second, first, `reopening ${url} reproduces the stage`);
  const line = await page.evaluate(() => window.__ac.txt(window.__ac.activeFilterLine()));
  assert.match(line, new RegExp(`(^|[\\s(])${paramName}=`), 'active-filter line names the param');
  const before = await page.evaluate(() => history.length);
  await controlChange(page);
  await page.waitForTimeout(SETTLE);
  const afterLen = await page.evaluate(() => history.length);
  assert.equal(afterLen, before, 'control writes the URL with replace, not push');
}

/** The default state AC-43 fixes; AC-54 requires it to hold after unknown params. */
async function assertDefaults(page) {
  const vt = await page.getAttribute(RANGE, 'aria-valuetext');
  assert.match(vt ?? '', /^All years, 2000 to \d{4}$/);
  const readout = await page.evaluate(() => !!window.__ac.deepest(document.body, '^All years$'));
  assert.ok(readout, 'year readout reads All years');
  const metric = await page.evaluate(() => window.__ac.selectedName([
    '[aria-checked="true"]', '[aria-selected="true"]', 'select option:checked',
  ]));
  const pressedNames = await page.evaluate(() =>
    [...document.querySelectorAll('[aria-pressed="true"], [aria-checked="true"], [aria-selected="true"], option:checked')]
      .map((e) => window.__ac.txt(e)));
  assert.ok(metric === 'Schemes live' || pressedNames.includes('Schemes live'), `Metric selected = Schemes live (saw ${metric})`);
  assert.ok(pressedNames.includes('All'), 'Level = All');
  for (const tier of TIERS) {
    assert.equal(await tierToggle(page, tier).getAttribute('aria-pressed'), 'true', `${tier} toggle pressed`);
  }
  const chips = await page.evaluate(() => window.__ac.chipInfo());
  assert.ok(chips.every((c) => c.pressed !== 'true'), 'no category chip pressed');
  const party = await page.evaluate(() => {
    const sel = document.querySelector('select[multiple]');
    if (sel) return [...sel.selectedOptions].length;
    return document.querySelectorAll('[role="listbox"] [aria-selected="true"], [role="group"] input[type="checkbox"]:checked').length;
  });
  assert.equal(party, 0, 'Party has no selection');
  assert.equal(await count(page, 'button[aria-label^="Close "]'), 0, 'no StatePanel / SchemeCard');
  assert.equal(await count(page, '[data-caption="C11"]'), 0, 'no SchemeCard');
  assert.equal(await count(page, 'figure'), 1, 'view = map: figure present');
  assert.equal(await count(page, '#stage-tables details[open]'), 0, 'twins closed');
  const afl = await page.evaluate(() => window.__ac.activeFilterLine());
  assert.equal(afl, null, 'no active-filter line');
}

/** §0.3 — fixtures read from the FULL build's DOM, never typed in. */
async function discover() {
  await withPage('desktop', async (page) => {
    await go(page, '?view=table');
    Object.assign(F, await page.evaluate((NONV) => {
      const A = window.__ac;
      const out = {};
      const link = document.querySelector('[data-twin="schemes"] a[href*="s="]');
      if (link) { out.SCHEME_ID = A.param(link.getAttribute('href'), 's'); out.SCHEME_NAME = A.txt(link); }
      const ys = A.table('[data-twin="year-slice"]');
      if (ys) {
        const c = A.col(ys, 'Class');
        const withValue = ys.rows.find((r) => c >= 0 && r.cells[c] && !NONV.includes(r.cells[c].text) && r.cells[c].text !== '');
        if (withValue) {
          out.STATE_WITH_VALUE = A.param(withValue.cells.find((x) => x.href && x.href.includes('st='))?.href, 'st');
          out.STATE_WITH_VALUE_NAME = withValue.cells[0].text;
        }
        const none = ys.rows.find((r) => c >= 0 && r.cells[c]?.text === 'none recorded');
        if (none) {
          out.STATE_NONE = A.param(none.cells.find((x) => x.href && x.href.includes('st='))?.href, 'st');
          out.STATE_NONE_NAME = none.cells[0].text;
        }
        out.STATE_NAMES = ys.rows.map((r) => r.cells[0].text);
      }
      const sc = A.table('[data-twin="scrubber"]');
      if (sc) {
        const y = A.col(sc, 'Year'); const e = A.col(sc, 'Assembly elections'); const m = A.col(sc, 'States with a money figure');
        const rb = sc.rows.find((r) => e >= 0 && +r.cells[e]?.text.replace(/,/g, '') > 0);
        if (rb && y >= 0) out.Y_WITH_BALLOTS = rb.cells[y].text;
        const rm = sc.rows.find((r) => m >= 0 && +r.cells[m]?.text.replace(/,/g, '') > 0);
        if (rm && y >= 0) out.Y_MONEY = rm.cells[y].text;
      }
      const findings = document.querySelector('#findings');
      const chip = findings ? A.tierChips(findings).find((e) => A.txt(e) === 'alleged') : null;
      if (chip) {
        const heads = [...findings.querySelectorAll('h2, h3, h4, h5, summary')].filter((h) => A.precedes(h, chip));
        const head = heads[heads.length - 1];
        const hl = head?.querySelector('a[href*="s="]');
        if (hl) out.ALLEGED_SCHEME = A.param(hl.getAttribute('href'), 's');
        else if (head) {
          const name = A.txt(head);
          const match = [...document.querySelectorAll('[data-twin="schemes"] a[href*="s="]')].find((a) => name.includes(A.txt(a)));
          if (match) out.ALLEGED_SCHEME = A.param(match.getAttribute('href'), 's');
        }
      }
      const partyOpt = document.querySelector('select[multiple] option, [role="listbox"] [role="option"], [aria-label*="Party" i] option, [aria-label*="Party" i] [role="option"]');
      if (partyOpt) out.PARTY = A.txt(partyOpt) || partyOpt.value;
      const chips = A.chipInfo();
      out.CHIPS = chips;
      // Record which fixture sources are absent outright, so need() can tell a missing record from a missing twin.
      out.MISSING_SOURCES = [
        ['year-slice', !!ys], ['scrubber', !!sc], ['#findings', !!findings], ['chips', chips.length > 0],
      ].filter(([, present]) => !present).map(([name]) => name);
      return out;
    }, NON_VALUE_CLASSES));

    // Chip param values are learned by pressing a chip and reading what it wrote.
    const chips = F.CHIPS ?? [];
    const live = chips.filter((c) => c.count > 0);
    const zero = chips.find((c) => c.count === 0);
    const learn = async (chip) => {
      await go(page);
      const btn = page.getByRole('button', { name: chip.label, exact: true }).first();
      if (!(await btn.count())) return null;
      await btn.click();
      await page.waitForTimeout(SETTLE);
      const p = await params(page);
      return p.cat ?? null;
    };
    if (live[0]) { F.C1 = await learn(live[0]); F.C1_COUNT = live[0].count; F.C1_LABEL = live[0].label; }
    if (live[1]) { F.C2 = await learn(live[1]); F.C2_COUNT = live[1].count; F.C2_LABEL = live[1].label; }
    if (zero) { F.C0 = await learn(zero); F.C0_LABEL = zero.label; }
  }, { ignoreErrors: true });
}

// =====================================================================
// 1. Scaffold state — EMPTY build
// =====================================================================

test('AC-01 — Render the empty page with ≥ 200 characters and no errors', async (t) => {
  if (!requireEmpty(t)) return;
  await withPage('desktop', async (page) => {
    await go(page);
    const len = await page.evaluate(() => document.body.innerText.length);
    assert.ok(len >= 200, `rendered ${len} characters`);
    assert.equal(await count(page, 'article.pb-20'), 1);
  });
});

test('AC-02 — Say the register is not promoted, above the byline', async (t) => {
  if (!requireEmpty(t)) return;
  for (const kind of ['desktop', 'phone']) {
    await withPage(kind, async (page) => {
      await go(page);
      assert.equal(await count(page, 'text=Register not yet promoted'), 1);
      const r = await page.evaluate(() => {
        const A = window.__ac;
        const callout = A.deepest(document.body, 'Register not yet promoted');
        let box = callout;
        while (box && !A.txt(box).includes('Nothing below is zero.')) box = box.parentElement;
        const h1 = document.querySelector('article h1');
        let standfirst = null;
        for (let e = h1?.nextElementSibling; e && !standfirst; e = e.nextElementSibling) {
          if (e.matches('p')) standfirst = e; else standfirst = e.querySelector('p');
          if (standfirst && A.precedes(callout, standfirst)) standfirst = null;
        }
        return {
          text: A.txt(box),
          afterStandfirst: A.precedes(standfirst ?? h1, callout),
          beforeByline: A.precedes(callout, A.byline()),
        };
      });
      assert.ok(r.text.includes('The distribution-funds research has not been promoted into this build. Nothing below is zero. It is unmeasured.'), r.text);
      assert.ok(r.afterStandfirst, 'callout follows the Standfirst');
      assert.ok(r.beforeByline, 'callout precedes the Byline');
    });
  }
});

test('AC-03 — Replace the byline counts and the strip with the empty wording', async (t) => {
  if (!requireEmpty(t)) return;
  await withPage('desktop', async (page) => {
    await go(page);
    const byline = await page.evaluate(() => window.__ac.txt(window.__ac.byline()));
    assert.ok(byline.includes('register not yet promoted · nothing below is zero'), byline);
    assert.doesNotMatch(byline, /\d+ schemes/);
    const strip = await evalTxt(page, STRIP);
    assert.ok(strip.includes('0 schemes'), strip);
    assert.ok(strip.includes('as of not yet promoted'), strip);
  });
});

test('AC-04 — Name the empty state in the skip link', async (t) => {
  if (!requireEmpty(t)) return;
  await withPage('desktop', async (page) => {
    await go(page);
    assert.equal(await evalTxt(page, SKIP_LINK), 'Skip to tables (empty: register not yet promoted)');
    await page.evaluate(() => {
      const A = window.__ac; const f = A.focusables();
      const i = f.findIndex((e) => e.matches('a[href="#stage-tables"]'));
      f[i - 1]?.focus();
    });
    await page.keyboard.press('Tab');
    const isSkip = await page.evaluate(() => document.activeElement?.matches('a[href="#stage-tables"]'));
    assert.ok(isSkip, 'Tab from the last FilterBar control lands on the skip link');
  });
});

test('AC-05 — Hatch all 36 states and say so in the map\'s name', async (t) => {
  if (!requireEmpty(t)) return;
  await withPage('desktop', async (page) => {
    await go(page);
    const label = await page.getAttribute(MAP, 'aria-label');
    assert.ok(label?.startsWith('Map of India'), label);
    assert.ok(label?.endsWith('0 of 36 states with a value; nothing recorded yet'), label);
    assert.equal(await count(page, 'path[data-fill-class="hatch"]'), 36);
    assert.equal(await count(page, 'path[data-fill-class="zero"]'), 0);
    assert.equal(await count(page, 'path[data-fill-class="value"]'), 0);
  });
});

test('AC-06 — Label every twin as empty, not as zero rows of data', async (t) => {
  if (!requireEmpty(t)) return;
  await withPage('desktop', async (page) => {
    await go(page);
    const twins = await page.evaluate(() => [...document.querySelectorAll('#stage-tables details')].map((d) => ({
      summary: window.__ac.txt(d.querySelector('summary')),
      rows: [...d.querySelectorAll('table tbody tr')].map((r) => window.__ac.txt(r)),
    })));
    assert.equal(twins.length, 3);
    for (const tw of twins) {
      assert.ok(tw.summary.includes('0 rows · register not yet promoted'), tw.summary);
      assert.ok(tw.rows.length === 0 || (tw.rows.length === 1 && tw.rows[0] === 'Nothing recorded yet.'), JSON.stringify(tw.rows));
    }
  });
});

test('AC-07 — Say the control cannot run, and mark every section empty', async (t) => {
  if (!requireEmpty(t)) return;
  await withPage('desktop', async (page) => {
    await go(page);
    const r = await page.evaluate((SECS) => {
      const A = window.__ac;
      return {
        margin: !!A.deepest(document.body, 'No elections recorded, so the control cannot run\\.'),
        sections: SECS.map((s) => [s, !!A.deepest(document.querySelector(s), '^Nothing recorded yet\\.$')]),
        graph: !!A.deepest(document.querySelector('#graph'), 'No claims recorded in this file\\.'),
        graphSvg: document.querySelectorAll('#graph svg[data-tick]').length,
        rungs: A.deepestAll(document.querySelector('#narratives'), 'none in this file').length,
      };
    }, SECTIONS);
    assert.ok(r.margin, 'control cannot run line');
    for (const [s, ok] of r.sections) assert.ok(ok, `${s} has the line Nothing recorded yet.`);
    assert.ok(r.graph, '#graph says no claims');
    assert.equal(r.graphSvg, 0, 'graph not mounted');
    assert.equal(r.rungs, 6, 'six rungs each none in this file');
  });
});

test('AC-08 — Draw the clock axis and the derived gaps anyway', async (t) => {
  if (!requireEmpty(t)) return;
  await withPage('desktop', async (page) => {
    await go(page);
    const r = await page.evaluate(() => {
      const A = window.__ac; const svg = A.lanesSvg();
      const labels = svg ? [...svg.querySelectorAll('text')].map((x) => x.textContent.trim()) : [];
      return {
        has2000: labels.includes('2000'), last: labels[labels.length - 1] ?? '',
        vt: document.querySelector('input[type="range"][aria-label="Year"]')?.getAttribute('aria-valuetext') ?? '',
        coverage: !!A.deepest(document.querySelector('#missing'), 'coverage'),
        absence: !!A.deepest(document.querySelector('#missing'), 'Absence is a result here\\.'),
      };
    });
    assert.ok(r.has2000, 'axis shows 2000');
    assert.match(r.last, /^2026 \(to /);
    assert.ok(r.vt.startsWith('All years'), r.vt);
    assert.ok(r.coverage && r.absence, '#missing has the coverage gap and the absence note');
  });
});

// =====================================================================
// 2. Honesty captions — FULL build
// =====================================================================

test('AC-09 — Always render the in-frame status line as a list of clauses', async (t) => {
  if (!requireFull(t) || !need(t, 'Y_WITH_BALLOTS')) return;
  for (const search of ['', `?y=${F.Y_WITH_BALLOTS}&m=share`]) {
    await withPage('desktop', async (page) => {
      await go(page, search);
      const clauses = await page.locator('figure figcaption ul li').allInnerTexts();
      assert.ok(clauses.length >= 6, `${clauses.length} clauses`);
      const all = clauses.join(' | ');
      for (const re of [/of 36: none recorded \(hatched\)/, /live, no comparable figure \(stippled\)/, /searched, none live \(flat\)/, /as of /, /run run-[0-9a-f]+/]) {
        assert.match(all, re);
      }
      assert.ok(all.includes('central schemes not painted (band below)'), all);
      assert.ok(all.includes('party not encoded'), all);
      const fs = await page.evaluate(() => getComputedStyle(document.querySelector('figure figcaption ul li')).fontSize);
      assert.equal(fs, '14px');
    });
  }
});

test('AC-10 — Render C1 and C6 on every view at body size, capped at 72ch', async (t) => {
  if (!requireFull(t)) return;
  for (const search of ['?view=map', '?view=table']) {
    await withPage('desktop', async (page) => {
      await go(page, search);
      const r = await page.evaluate(() => {
        const A = window.__ac;
        const probe = (el) => {
          // 72ch resolves against the caption's own font; measure a '0' in that font.
          const s = document.createElement('span'); s.textContent = '0';
          s.style.font = getComputedStyle(el).font; s.style.position = 'absolute'; s.style.whiteSpace = 'pre';
          document.body.appendChild(s); const w = s.getBoundingClientRect().width; s.remove(); return w;
        };
        return ['C1', 'C6'].map((id) => {
          const el = document.querySelector(`[data-caption="${id}"]`);
          if (!el) return { id, missing: true };
          const cs = getComputedStyle(el);
          return {
            id, text: A.txt(el), fontSize: cs.fontSize, border: parseFloat(cs.borderLeftWidth),
            maxWidth: cs.maxWidth, ch: probe(el), inFooter: !!el.closest('footer'),
          };
        });
      });
      for (const c of r) {
        assert.ok(!c.missing, `${c.id} rendered at ${search}`);
        if (c.id === 'C1') assert.ok(c.text.includes('Colour never encodes party.'), c.text);
        if (c.id === 'C6') assert.ok(c.text.startsWith('Current boundaries.'), c.text);
        assert.equal(c.fontSize, '14px', `${c.id} font-size`);
        assert.ok(c.border >= 2, `${c.id} border-left-width ${c.border}`);
        assert.ok(c.maxWidth !== 'none' && parseFloat(c.maxWidth) <= 72 * c.ch + 1, `${c.id} max-width ${c.maxWidth} vs 72ch=${72 * c.ch}`);
        assert.ok(!c.inFooter, `${c.id} not in the footer`);
      }
    });
  }
});

test('AC-11 — Show C2 only for the live metric, with the no-coverage sentence when undeclared', async (t) => {
  if (!requireFull(t) || !need(t, 'Y_MONEY')) return;
  await withPage('desktop', async (page) => {
    await go(page);
    const r = await page.evaluate(() => {
      const A = window.__ac;
      return { c2: A.txt(document.querySelector('[data-caption="C2"]')), c2n: document.querySelectorAll('[data-caption="C2"]').length, legend: A.txt(A.legend()) };
    });
    assert.equal(r.c2n, 1, 'C2 present at m=live');
    assert.ok(r.c2.includes('With no year chosen, the count is cumulative'), r.c2);
    if (r.legend.includes('(empty: no research file declares its coverage')) {
      assert.ok(r.c2.includes('so the map cannot show any state as having had no scheme'), r.c2);
    }
    await go(page, `?y=${F.Y_MONEY}&m=share`);
    assert.equal(await count(page, '[data-caption="C2"]'), 0);
  });
});

test('AC-12 — Swap C3 and C4 with the money and per-head metrics', async (t) => {
  if (!requireFull(t) || !need(t, 'Y_MONEY', 'C1')) return;
  await withPage('desktop', async (page) => {
    await go(page, `?y=${F.Y_MONEY}&m=share`);
    const c3 = await evalTxt(page, '[data-caption="C3"]');
    assert.ok(c3.includes('Financial year') && c3.includes('Budgeted and actual are never combined'), c3);
    assert.equal(await count(page, '[data-caption="C4"]'), 0);
    await go(page, `?y=${F.Y_MONEY}&m=perhead&cat=${F.C1}`);
    const c4 = await evalTxt(page, '[data-caption="C4"]');
    assert.ok(c4.includes('divides nothing by enrolment') && c4.includes('Not per capita'), c4);
    assert.equal(await count(page, '[data-caption="C3"]'), 0);
    await go(page);
    assert.equal(await count(page, '[data-caption="C3"]'), 0);
    assert.equal(await count(page, '[data-caption="C4"]'), 0);
  });
});

test('AC-13 — Show C5 and the ballot key only when a year is set', async (t) => {
  if (!requireFull(t) || !need(t, 'Y_WITH_BALLOTS')) return;
  await withPage('desktop', async (page) => {
    await go(page);
    assert.equal(await count(page, '[data-caption="C5"]'), 0);
    let legend = await page.evaluate(() => window.__ac.txt(window.__ac.legend()));
    assert.ok(legend.includes('choose a year to see its elections'), legend);
    assert.equal(await count(page, '[data-ballot]'), 0);
    await go(page, `?y=${F.Y_WITH_BALLOTS}`);
    const c5 = await evalTxt(page, '[data-caption="C5"]');
    assert.ok(c5.includes('The lid marks timing, not cause.'), c5);
    legend = await page.evaluate(() => window.__ac.txt(window.__ac.legend()));
    assert.ok(legend.includes('incumbent kept power'), legend);
    assert.ok(legend.includes("lid = the incumbent's party launched or raised"), legend);
  });
});

test('AC-14 — State the partial range in C7 with a figure that matches the strip', async (t) => {
  if (!requireFull(t)) return;
  await withPage('desktop', async (page) => {
    await go(page);
    const c7 = await evalTxt(page, '[data-caption="C7"]');
    assert.ok(c7.includes('Every election carries the same 12-month band'), c7);
    const strip = await evalTxt(page, STRIP);
    const sm = strip.match(/(\d+) of 27 years with a recorded live scheme/);
    assert.ok(sm, `strip has the years fact: ${strip}`);
    const cm = c7.match(/records a live scheme in (\d+) of the 27 years, first in (\d{4})/);
    if (+sm[1] === 27 && !cm) return;
    assert.ok(cm, `C7 states the partial range: ${c7}`);
    assert.equal(+cm[1], +sm[1], 'C7 figure equals the strip fact');
  });
});

test('AC-15 — Carry C8–C15 in their sections', async (t) => {
  if (!requireFull(t) || !need(t, 'SCHEME_ID')) return;
  await withPage('desktop', async (page) => {
    await go(page);
    const expect = [
      ['#control [data-caption="C8"]', ['Association, not effect.', 'no test is run']],
      ['#ministers [data-caption="C9"]', ['not a tally of credit']],
      ['#after [data-caption="C10"]', ['the page does not decide which']],
      ['#benefits [data-caption="C12"]', ['A missing row means none was recorded']],
      ['#findings [data-caption="C13"]', ['does not show they switched']],
      ['#narratives [data-caption="C14"]', ['rated the same way']],
      ['#graph [data-caption="C15"]', ['Position carries no meaning']],
    ];
    for (const [sel, needles] of expect) {
      const txt = await evalTxt(page, sel);
      for (const n of needles) assert.ok(txt.includes(n), `${sel} contains "${n}" (saw: ${txt})`);
    }
    await go(page, `?s=${F.SCHEME_ID}`);
    const c11 = await evalTxt(page, '[data-caption="C11"]');
    assert.ok(c11.includes('Enrolled is not paid.'), c11);
  });
});

test('AC-16 — Declare a one-sided view when the party filter is on', async (t) => {
  if (!requireFull(t) || !need(t, 'PARTY', 'Y_WITH_BALLOTS')) return;
  await withPage('desktop', async (page) => {
    await go(page, `?party=${encodeURIComponent(F.PARTY)}&y=${F.Y_WITH_BALLOTS}`);
    const r = await page.evaluate((PARTY) => {
      const A = window.__ac;
      const line = A.deepestAll(document.body, 'Showing one side\\. The control and the by-party tables below always measure every party\\.')
        .map((e) => { let el = e; while (el && !el.querySelector('a[href$="#control"]') && el.parentElement && A.txt(el.parentElement).startsWith('Showing one side')) el = el.parentElement; return el; })[0];
      const cap = A.txt(document.querySelector('figure figcaption'));
      const clause = [...document.querySelectorAll('figure figcaption li')].map((l) => A.txt(l)).find((s) => s.startsWith('filters: '));
      return { hasLine: !!line, hasLink: !!line?.querySelector('a[href$="#control"]'), cap, clause: clause ?? '', afl: A.txt(A.activeFilterLine()) };
    }, F.PARTY);
    assert.ok(r.hasLine, 'one-sided line under the FilterBar');
    assert.ok(r.hasLink, 'line links to #control');
    assert.ok(r.cap.includes('party filter on:'), r.cap);
    assert.ok(r.clause.includes(`party=${F.PARTY}`), `filters clause: ${r.clause}`);
    const filters = r.clause.replace(/^filters: /, '');
    assert.ok(r.afl.includes(filters) || filters.includes(r.afl), `figcaption filters "${filters}" = active-filter line "${r.afl}"`);
  });
});

// =====================================================================
// 3. Denominators — FULL build
// =====================================================================

test('AC-17 — Show the six strip facts with their populations and as-of', async (t) => {
  if (!requireFull(t)) return;
  await withPage('desktop', async (page) => {
    await go(page);
    assert.equal(await count(page, STRIP), 1, 'sticky strip present');
    const r = await page.evaluate(() => {
      const A = window.__ac; const strip = A.strip();
      return {
        spans: [...strip.querySelectorAll('span')].map((s) => A.txt(s)).filter((s) => /^\d[\d,]* of \d[\d,]* /.test(s)).length,
        text: A.txt(strip),
        rows: document.querySelectorAll('[data-twin="schemes"] tbody tr').length,
      };
    });
    assert.ok(r.spans >= 5, `${r.spans} population spans`);
    for (const label of ['schemes in view', 'of 36 states & UTs with a recorded state scheme', 'of 27 years with a recorded live scheme', 'assembly elections recorded', 'outlay rows with an actual', 'allegations with a response on record']) {
      assert.ok(r.text.includes(label), `strip has "${label}"`);
    }
    assert.match(r.text, /as of \d{4}/);
    const m = r.text.match(/(\d[\d,]*) of (\d[\d,]*) schemes in view/);
    assert.ok(m, 'fact 1 present');
    assert.equal(m[1], m[2], 'unfiltered: N of N');
    assert.equal(+m[2].replace(/,/g, ''), r.rows, 'N equals the schemes twin row count');
  });
});

test('AC-18 — Show the live effect of every filter as {N} → {k}', async (t) => {
  if (!requireFull(t) || !need(t, 'C1_LABEL')) return;
  await withPage('desktop', async (page) => {
    await go(page);
    let eff = await evalTxt(page, '[data-effect]');
    let m = eff.match(/(\d+) → (\d+) schemes/);
    assert.ok(m, `effect line: ${eff}`);
    assert.equal(m[1], m[2], 'unfiltered N = k');
    await page.getByRole('button', { name: F.C1_LABEL, exact: true }).first().click();
    await page.waitForFunction((n) => /(\d+) → (\d+) schemes/.test(document.querySelector('[data-effect]')?.textContent ?? '') && +document.querySelector('[data-effect]').textContent.match(/(\d+) → (\d+) schemes/)[2] === n, F.C1_COUNT, { timeout: 3000 }).catch(() => {});
    eff = await evalTxt(page, '[data-effect]');
    m = eff.match(/(\d+) → (\d+) schemes/);
    assert.equal(+m[2], F.C1_COUNT, `k equals the chip count (${eff})`);
    const r = await page.evaluate(() => {
      const A = window.__ac; const el = A.deepest(A.strip(), 'filtered \\d+ → \\d+');
      return { text: A.txt(el), color: el ? getComputedStyle(el).color : null, amber: A.tokenColor('--color-amber'), rows: document.querySelectorAll('[data-twin="schemes"] tbody tr').length };
    });
    assert.match(r.text, new RegExp(`filtered ${m[1]} → ${m[2]}`));
    assert.equal(r.color, r.amber, 'filtered figure is amber');
    assert.equal(r.rows, +m[2], 'schemes twin rows = k');
  });
});

test('AC-19 — Count every category chip, and keep zero-count chips present', async (t) => {
  if (!requireFull(t)) return;
  await withPage('desktop', async (page) => {
    await go(page);
    const chips = await page.evaluate(() => window.__ac.chipInfo());
    assert.equal(chips.length, 12, `chip set has 12 entries (saw ${chips.length}: ${chips.map((c) => c.label).join(', ')})`);
    for (const c of chips) {
      assert.match(c.label, /\((\d+)\)$/);
      if (c.count === 0) {
        assert.equal(c.ariaDisabled, 'true', `${c.label} aria-disabled`);
        assert.equal(c.disabled, false, `${c.label} has no disabled attribute`);
        assert.ok(c.tabIndex >= 0, `${c.label} focusable`);
      }
    }
    const zero = chips.find((c) => c.count === 0);
    if (zero) {
      const focused = await page.evaluate((label) => {
        const b = window.__ac.chips().find((x) => window.__ac.txt(x) === label); b.focus(); return document.activeElement === b;
      }, zero.label);
      assert.ok(focused, 'zero-count chip becomes document.activeElement');
    }
  });
});

test('AC-20 — Show metric coverage per option and say why an option is unavailable', async (t) => {
  if (!requireFull(t) || !need(t, 'Y_MONEY')) return;
  await withPage('desktop', async (page) => {
    await go(page);
    for (const re of [/Share/, /Per head|perhead/i, /Budgeted/, /Actual/]) {
      const opt = await byName(page, re);
      assert.ok(opt, `metric option ${re} found`);
      assert.equal(await opt.getAttribute('aria-disabled'), 'true', `${re} aria-disabled without a year`);
      const name = await opt.evaluate((e) => e.getAttribute('aria-label') ?? e.textContent);
      assert.ok(/unavailable: choose a year/.test(name), `${re} name: ${name}`);
    }
    await go(page, `?y=${F.Y_MONEY}`);
    const share = await byName(page, /Share/);
    const shareName = await share.evaluate((e) => e.getAttribute('aria-label') ?? e.textContent);
    assert.match(shareName, /(\d+) of (\d+) live state schemes have a figure for FY \d{4}-\d{2}/);
    const ph = await byName(page, /Per head|perhead/i);
    const phName = await ph.evaluate((e) => e.getAttribute('aria-label') ?? e.textContent);
    assert.ok(phName.includes('choose exactly one category'), phName);
  });
});

test('AC-21 — Print the control\'s three windows, n, points, selection and foot lines at rest', async (t) => {
  if (!requireFull(t)) return;
  await withPage('desktop', async (page) => {
    await go(page);
    const r = await page.evaluate(() => {
      const A = window.__ac; const card = A.controlCard();
      if (!card) return null;
      const lines = A.lines(card);
      const w = ['12 m ·', '6 m ·', '24 m ·'].map((p) => lines.findIndex((l) => l.startsWith(p)));
      return { lines, w, text: A.txt(card) };
    });
    assert.ok(r, 'ControlCard present in the margin');
    const winRe = /retained after a fresh scheme: (\d+) of (\d+) · without: (\d+) of (\d+) · unclassified: (\d+)/;
    assert.ok(r.w.every((i) => i >= 0) && r.w[0] < r.w[1] && r.w[1] < r.w[2], `windows in order: ${r.w}`);
    for (const i of r.w) assert.match(r.lines[i], winRe);
    const nLine = r.lines.find((l) => /^n = (\d+) assembly elections recorded/.test(l));
    assert.ok(nLine && nLine.includes('no test is run at this n'), `n line: ${nLine}`);
    assert.ok(/one election moves a row by up to \d+ points/.test(r.text) || r.text.includes('one election changes a row by one count; too few to express in points'), 'points line');
    assert.ok(r.text.includes('selection: elections are in this file because research reached them, not by census'), 'selection line');
    assert.ok(r.text.includes('challenger promises not recorded'), 'challenger line');
    assert.ok(r.text.includes('association, not effect') && /run run-/.test(r.text), 'foot line');
    assert.ok(r.text.includes('Union ·') || r.text.includes('Union: no Lok Sabha election recorded, so the Union is not measured here'), 'Union block or line');
  });
});

test('AC-22 — Print no percentage under b = 10, and always print a of b', async (t) => {
  if (!requireFull(t) || !need(t, 'SCHEME_ID')) return;
  const scan = (page) => page.evaluate(() => {
    const A = window.__ac;
    const roots = [A.controlCard(), document.querySelector('#control'), A.panel(), ...document.querySelectorAll('[data-twin]')].filter(Boolean);
    const bad = [];
    for (const root of roots) {
      const text = A.txt(root);
      for (const m of text.matchAll(/(\d+) of (\d+)(?:\s*\((\d+(?:\.\d+)?)%\))?/g)) {
        if (+m[2] < 10 && m[3] !== undefined) bad.push(`percentage under b=10: ${m[0]}`);
      }
      for (const cell of root.querySelectorAll('td, li, p, span, dd, div')) {
        if (cell.children.length) continue;
        const s = A.txt(cell);
        if (!/\d%/.test(s)) continue;
        const ok = [...s.matchAll(/(\d+) of (\d+)/g)].some((x) => +x[2] >= 10 && x.index < s.search(/\d%/));
        if (!ok) bad.push(`percentage without a of b ≥ 10: "${s}"`);
      }
    }
    const two = document.querySelector('#control table');
    const ends = two ? [...two.querySelectorAll('tbody tr')].map((tr) => A.txt(tr).match(/(\d+) of (\d+)(?:\s*\((\d+(?:\.\d+)?)%\))?$/)).filter(Boolean) : [];
    for (const e of ends) if (+e[2] >= 10 && e[3] === undefined) bad.push(`TwoByTwo row end lacks a percentage at b ≥ 10: ${e[0]}`);
    return bad;
  });
  await withPage('desktop', async (page) => {
    await go(page);
    assert.deepEqual(await scan(page), []);
    await go(page, `?s=${F.SCHEME_ID}`);
    assert.deepEqual(await scan(page), []);
  });
});

test('AC-23 — Count every legend class, including empty ones, and total 36', async (t) => {
  if (!requireFull(t)) return;
  await withPage('desktop', async (page) => {
    await go(page);
    const r = await page.evaluate(() => {
      const A = window.__ac; const lines = A.lines(A.legend());
      const hatch = lines.map((l) => l.match(/no value \((\d+) of 36\), not zero/)).find(Boolean);
      const stipple = lines.filter((l) => /stipple|no comparable figure/i.test(l)).map((l) => l.match(/\((\d+)/)).find(Boolean);
      const zeroLine = lines.find((l) => /searched, none live|zero/i.test(l) && !/no value/.test(l));
      const zero = zeroLine?.match(/\((\d+)/) ?? (zeroLine?.includes('(empty:') ? [null, '0'] : null);
      const bins = lines.filter((l) => /^\S.* \((\d+|empty)/.test(l) && l !== zeroLine && !/no value|stipple|no comparable/i.test(l));
      const binSum = bins.reduce((s, l) => s + (+(l.match(/\((\d+|empty)/)[1] === 'empty' ? 0 : l.match(/\((\d+)/)[1])), 0);
      const paint = (c) => document.querySelectorAll(`path[data-fill-class="${c}"]`).length;
      return { lines, hatch: hatch && +hatch[1], stipple: stipple && +stipple[1], zero: zero && +zero[1], bins: bins.length, binSum,
        paint: { value: paint('value'), hatch: paint('hatch'), stipple: paint('stipple'), zero: paint('zero') } };
    });
    assert.ok(r.bins > 0, `legend lists bins: ${r.lines.join(' | ')}`);
    assert.ok(r.hatch !== null && r.hatch !== undefined, 'hatch line with count');
    assert.ok(r.stipple !== null && r.stipple !== undefined, 'stipple line with count');
    assert.ok(r.zero !== null && r.zero !== undefined, 'zero swatch with count or (empty: …)');
    assert.equal(r.binSum + r.zero + r.stipple + r.hatch, 36, 'classes total 36');
    assert.equal(r.binSum, r.paint.value); assert.equal(r.hatch, r.paint.hatch);
    assert.equal(r.stipple, r.paint.stipple); assert.equal(r.zero, r.paint.zero);
  });
});

test('AC-24 — Head every section with its denominator line', async (t) => {
  if (!requireFull(t)) return;
  await withPage('desktop', async (page) => {
    await go(page);
    const texts = await page.evaluate(() => {
      const A = window.__ac; const g = (s) => A.txt(document.querySelector(s));
      return { ministers: g('#ministers'), after: g('#after'), findings: g('#findings'), benefits: g('#benefits'), control: g('#control'), article: g('article') };
    });
    assert.match(texts.ministers, /named announcer \d+ · dated approval \d+ · dated launch \d+ · all three \d+, of \d+ schemes in view/);
    assert.match(texts.after, /\d+ dated changes across \d+ of \d+ schemes · \d+ undated · \d+ promised, not enacted/);
    assert.match(texts.findings, /\d+ findings across \d+ of \d+ schemes · D \d+ · R \d+ · A \d+ · An \d+ · \d+ of \d+ allegations answered · \d+ with no date located/);
    assert.match(texts.benefits, /\d+ rows · \d+ with an amount · \d+ alleged, \d+ of them answered/);
    assert.match(texts.control, /\d+ state schemes were live at \d+ changes of government/);
    assert.match(texts.article, /n = \d+ state schemes binned, of \d+ in view/);
    assert.match(texts.article, /Uniform timing over a 60-month term would put [\d.]+ in each bin \(analytic\)/);
  });
});

test('AC-25 — Never print a rate from a missing or tiny denominator', async (t) => {
  if (!requireFull(t)) return;
  await withPage('desktop', async (page) => {
    await go(page);
    const r = await page.evaluate(() => {
      const A = window.__ac;
      const tbl = [...document.querySelectorAll('#control table')].map((t) => A.table(t)).find((x) => x && A.col(x, 'Rate') >= 0 && A.col(x, 'Denominator') >= 0);
      if (!tbl) return null;
      const ri = A.col(tbl, 'Rate'); const di = A.col(tbl, 'Denominator');
      return tbl.rows.map((row) => ({ rate: row.cells[ri]?.text ?? '', den: row.cells[di]?.text ?? '' }));
    });
    assert.ok(r, 'base-rates table with Rate and Denominator columns in #control');
    assert.ok(r.length > 0, 'base-rates table has rows');
    for (const { rate, den } of r) {
      assert.ok(!/NaN|Infinity/.test(rate), rate);
      const d = den.trim();
      if (d === '' || d === 'null' || d === '0') { assert.equal(rate, 'not computed', `den ${JSON.stringify(d)} → ${rate}`); continue; }
      const m = rate.match(/^(\d[\d,]*) of (\d[\d,]*)(.*)$/);
      assert.ok(m, `rate is a of b: ${rate}`);
      const b = +m[2].replace(/,/g, '');
      if (b >= 10) assert.match(m[3], /\d+(\.\d+)?%/, `percentage at b=${b}: ${rate}`);
      else assert.ok(m[3].includes('rate not printed (den < 10)') && !/%/.test(m[3]), `no percentage at b=${b}: ${rate}`);
    }
  });
});

test('AC-26 — Back every control count with a list of exactly that many rows', async (t) => {
  if (!requireFull(t)) return;
  await withPage('desktop', async (page) => {
    await go(page);
    const r = await page.evaluate(() => {
      const A = window.__ac; const card = A.controlCard();
      if (!card) return null;
      const line = A.deepest(card, '^12 m ·');
      const m = A.txt(line).match(/retained after a fresh scheme: (\d+) of (\d+) · without: (\d+) of (\d+) · unclassified: (\d+)/);
      let box = line;
      while (box && box !== card && ![...box.querySelectorAll('details')].some((d) => /which elections/.test(A.txt(d.querySelector('summary'))))) box = box.parentElement;
      const lists = [...(box ?? card).querySelectorAll('details')].filter((d) => /which elections/.test(A.txt(d.querySelector('summary')))).map((d) => d.querySelectorAll('li').length);
      const nLine = A.txt(A.deepest(card, '^n = \\d+ assembly elections recorded'));
      const two = document.querySelector('#control table');
      const cells = two ? [...two.querySelectorAll('tbody td')].map((td) => ({ n: +(A.txt(td).match(/\d+/)?.[0] ?? NaN), li: td.querySelector('details')?.querySelectorAll('li').length ?? -1 })) : [];
      const uncl = two ? [...two.querySelectorAll('tbody tr')].map((tr) => { const tds = [...tr.querySelectorAll('td')]; const u = tds[2]; return +(A.txt(u ?? tr).match(/\d+/)?.[0] ?? 0); }) : [];
      return { m: m && m.slice(1).map(Number), lists, n: +(nLine.match(/n = (\d+)/)?.[1] ?? NaN), cells, uncl };
    });
    assert.ok(r && r.m, '12 m line parsed');
    const [, b, , d] = r.m;
    for (const want of [b, d]) assert.ok(r.lists.includes(want), `a "which elections" list has ${want} rows (lists: ${r.lists})`);
    for (const c of r.cells) assert.equal(c.li, c.n, `TwoByTwo cell ${c.n} backed by ${c.li} rows`);
    assert.equal(b + d + r.uncl.reduce((s, x) => s + x, 0), r.n, 'b + d + unclassified = n');
  });
});

// =====================================================================
// 4. No-data ≠ zero — FULL build
// =====================================================================

test('AC-27 — Hatch every state without a value, and count them in the status line', async (t) => {
  if (!requireFull(t)) return;
  await withPage('desktop', async (page) => {
    await go(page);
    const r = await page.evaluate(() => {
      const cap = window.__ac.txt(document.querySelector('figure figcaption'));
      const h = +(cap.match(/(\d+) of 36: none recorded \(hatched\)/)?.[1] ?? NaN);
      const paths = [...document.querySelectorAll('path[data-fill-class="hatch"]')];
      const fills = paths.map((p) => p.getAttribute('fill') ?? '');
      const patterns = fills.map((f) => { const id = f.match(/^url\(#([^)]+)\)/)?.[1]; const el = id && document.getElementById(id); return el ? el.querySelectorAll('line, path').length : 0; });
      return { h, count: paths.length, fills, patterns };
    });
    assert.equal(r.count, r.h, 'hatched paths equal the figcaption count');
    assert.ok(r.fills.every((f) => f.startsWith('url(#nodata-')), `fills: ${[...new Set(r.fills)]}`);
    assert.ok(r.patterns.every((n) => n > 0), 'hatch pattern has line/path children');
  });
});

test('AC-28 — Paint no flat zero unless a coverage declaration exists', async (t) => {
  if (!requireFull(t)) return;
  await withPage('desktop', async (page) => {
    await go(page);
    const legend = await page.evaluate(() => window.__ac.txt(window.__ac.legend()));
    if (legend.includes('(empty: no research file declares its coverage, so no state-year is shown as none)')) {
      assert.equal(await count(page, 'path[data-fill-class="zero"]'), 0);
      assert.equal(await count(page, 'path[fill="#15171c"]'), 0);
      return;
    }
    const zeroNames = await page.evaluate(() => {
      const A = window.__ac; const ys = A.table('[data-twin="year-slice"]'); const c = A.col(ys, 'Class');
      return ys ? ys.rows.filter((r) => r.cells[c]?.text === 'searched, none live').map((r) => r.cells[0].text) : [];
    });
    assert.ok(zeroNames.length > 0, 'zero-class states listed in the year-slice twin');
    await page.focus(MAP);
    const seen = new Map();
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('ArrowRight');
      const txt = await live(page);
      const name = zeroNames.find((n) => txt.startsWith(n));
      if (name) seen.set(name, txt);
      if (seen.size === zeroNames.length) break;
    }
    assert.ok(seen.size > 0, 'a zero-class state was reached by keyboard');
    for (const [name, txt] of seen) assert.ok(txt.includes('searched, none live'), `${name}: ${txt}`);
  });
});

test('AC-29 — Say none recorded in this file in the readout, never 0', async (t) => {
  if (!requireFull(t) || !need(t, 'STATE_NONE_NAME')) return;
  await withPage('desktop', async (page) => {
    await go(page);
    await page.focus(MAP);
    let txt = '';
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('ArrowRight');
      txt = await live(page);
      if (txt.startsWith(F.STATE_NONE_NAME)) break;
    }
    assert.ok(txt.startsWith(F.STATE_NONE_NAME), `reached ${F.STATE_NONE_NAME} (last: ${txt})`);
    assert.ok(txt.includes('none recorded in this file'), txt);
    assert.doesNotMatch(txt, /:\s*0\b/);
    const visible = await page.evaluate((s) => window.__ac.deepestAll(document.body, s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).some((e) => !e.closest('[aria-live]')), txt);
    assert.ok(visible, 'visible readout shows the same words');
  });
});

test('AC-30 — Class hatched states as none recorded in the year-slice twin', async (t) => {
  if (!requireFull(t)) return;
  await withPage('desktop', async (page) => {
    await go(page);
    const r = await page.evaluate(() => {
      const A = window.__ac; const ys = A.table('[data-twin="year-slice"]');
      if (!ys) return null;
      const c = A.col(ys, 'Class'); const reason = A.col(ys, 'Reason');
      const metric = ys.headers.findIndex((h, i) => i !== 0 && i !== c && i !== reason && !/election|state/i.test(h));
      return { n: ys.rows.length, c, reason, rows: ys.rows.map((r) => ({ cls: r.cells[c]?.text, metric: r.cells[metric]?.text, reason: r.cells[reason]?.text })) };
    });
    assert.ok(r && r.c >= 0 && r.reason >= 0, 'year-slice twin has Class and Reason columns');
    assert.equal(r.n, 36);
    for (const row of r.rows) {
      if (row.cls === 'none recorded') { assert.notEqual(row.metric, '0'); assert.ok(row.reason, 'non-empty Reason'); }
      if (row.cls === 'live, no comparable figure') {
        assert.ok(['partial', 'not located', 'amount not located'].includes(row.reason) || row.reason.startsWith('unit not comparable: '), `reason: ${row.reason}`);
      }
    }
  });
});

test('AC-31 — Fill every matrix cell with a word or a value, never a bare dash', async (t) => {
  if (!requireFull(t) || !need(t, 'Y_WITH_BALLOTS')) return;
  await withPage('desktop', async (page) => {
    await go(page, `?y=${F.Y_WITH_BALLOTS}`);
    const r = await page.evaluate((y) => {
      const A = window.__ac; const tbl = document.querySelector('[data-twin="matrix"] table');
      if (!tbl) return null;
      const cells = [...tbl.querySelectorAll('tbody td')].map((td) => ({ text: A.txt(td), abbr: td.querySelector('abbr[title="none recorded"]')?.textContent.trim() }));
      const headers = [...tbl.querySelectorAll('thead th')].map((h) => A.txt(h));
      return { cells, headers, mapYear: headers.some((h) => h === `${y} (map year)`) };
    }, F.Y_WITH_BALLOTS);
    assert.ok(r, 'matrix twin present');
    const okText = (c) => /^-?\d[\d,]*(\.\d+)?( .+)?$/.test(c.text) || ['none recorded', '0 (declared)', 'not located', 'unit not comparable'].includes(c.text) || /^partial \d+ of \d+$/.test(c.text) || c.abbr === 'n.r.';
    for (const c of r.cells) {
      assert.ok(!['—', '-', '', 'NaN', 'undefined'].includes(c.text), `bare cell "${c.text}"`);
      assert.ok(okText(c), `cell "${c.text}" is a word or a value`);
    }
    assert.ok(r.mapYear, `header ${F.Y_WITH_BALLOTS} (map year): ${r.headers.join(' | ')}`);
  });
});

test('AC-32 — Never render a bare null anywhere on the page', async (t) => {
  if (!requireFull(t) || !need(t, 'SCHEME_ID', 'STATE_NONE')) return;
  const scan = (page) => page.evaluate(() => {
    const A = window.__ac; const art = document.querySelector('article'); const bad = [];
    const w = document.createTreeWalker(art, NodeFilter.SHOW_TEXT);
    const banned = new Set(['—', '–', '-', 'NaN', 'undefined', 'null', '0%', 'Infinity']);
    for (let n = w.nextNode(); n; n = w.nextNode()) { const s = n.textContent.trim(); if (banned.has(s)) bad.push(`text node "${s}" in <${n.parentElement.tagName.toLowerCase()}>`); }
    for (const table of art.querySelectorAll('table')) {
      const tb = A.table(table); const si = tb.headers.findIndex((h) => /^Sources?$/.test(h));
      if (si < 0) continue;
      tb.rows.forEach((row, i) => { const c = row.cells[si]; if (!c) return; if (!c.hasCite && c.text !== 'no source in file') bad.push(`row ${i} Source cell "${c.text}"`); });
    }
    return bad;
  });
  await withPage('desktop', async (page) => {
    for (const search of ['?view=map', '?view=table', `?s=${F.SCHEME_ID}`, `?st=${F.STATE_NONE}`]) {
      await go(page, search);
      assert.deepEqual(await scan(page), [], `at ${search}`);
    }
  });
});

test('AC-33 — Stipple partial money, and state the lower bound', async (t) => {
  if (!requireFull(t) || !need(t, 'Y_MONEY')) return;
  await withPage('desktop', async (page) => {
    await go(page, `?y=${F.Y_MONEY}&m=share`);
    const r = await page.evaluate(() => {
      const A = window.__ac; const paths = [...document.querySelectorAll('path[data-fill-class="stipple"]')];
      const id = paths[0]?.getAttribute('fill')?.match(/^url\(#([^)]+)\)/)?.[1];
      const pat = id && document.getElementById(id);
      const cap = A.txt(document.querySelector('figure figcaption'));
      const above = A.txt(A.figure()).match(/(\d+) states with live schemes have a figure for only some of them/);
      const ys = A.table('[data-twin="year-slice"]'); const c = A.col(ys, 'Class');
      return { n: paths.length, circles: pat ? pat.querySelectorAll('circle').length : 0, p: +(cap.match(/(\d+): live, no comparable figure \(stippled\)/)?.[1] ?? NaN), above: above && +above[1],
        names: ys ? ys.rows.filter((r) => r.cells[c]?.text === 'live, no comparable figure').map((r) => r.cells[0].text) : [] };
    });
    if (r.n === 0) { t.skip('SKIPPED: no stippled state exists in this build at the money year'); return; }
    assert.ok(r.circles > 0, 'stipple pattern has circle children');
    assert.equal(r.p, r.n, 'figcaption stipple figure equals the stipple count');
    if (r.above !== null) assert.equal(r.above, r.n);
    await page.focus(MAP);
    let txt = '';
    for (let i = 0; i < 40; i++) { await page.keyboard.press('ArrowRight'); txt = await live(page); if (r.names.some((n) => txt.startsWith(n))) break; }
    assert.ok(r.names.some((n) => txt.startsWith(n)), `reached a stippled state (last: ${txt})`);
    assert.ok((txt.includes('partial:') && txt.includes('a partial sum is a lower bound and is not shaded')) || txt.includes('not located'), txt);
  });
});

test('AC-34 — Say in the key and the panel that no texture means zero', async (t) => {
  if (!requireFull(t) || !need(t, 'STATE_NONE', 'STATE_WITH_VALUE')) return;
  await withPage('desktop', async (page) => {
    await go(page);
    const key = await page.evaluate(() => window.__ac.txt(window.__ac.readingKey()));
    assert.ok(key.includes('None of the three means zero.'), key);
    await go(page, `?st=${F.STATE_NONE}`);
    const panel = await page.evaluate(() => window.__ac.txt(window.__ac.panel()));
    assert.ok(panel.includes(`${F.STATE_NONE_NAME}: none recorded in this file. Hatched means unknown, not none.`) || /was searched for .*; no scheme recorded/.test(panel), panel);
    const cat0 = F.C0 ?? null;
    if (!cat0) { t.diagnostic('no zero-count chip value learnt; the filtered-panel sentence is unchecked'); return; }
    await go(page, `?st=${F.STATE_WITH_VALUE}&cat=${cat0}`);
    const p2 = await page.evaluate(() => window.__ac.txt(window.__ac.panel()));
    assert.ok(p2.includes(`No scheme from ${F.STATE_WITH_VALUE_NAME} matches the current filters. This is a statement about this file.`), p2);
  });
});

// =====================================================================
// 5. Denials beside claims — FULL build
// =====================================================================

test('AC-35 — Pair every alleged finding with a Response in DOM order', async (t) => {
  if (!requireFull(t)) return;
  await withPage('desktop', async (page) => {
    await go(page);
    assert.equal(await count(page, '#findings'), 1, '#findings present');
    const r = await page.evaluate(() => {
      const A = window.__ac; const f = document.querySelector('#findings');
      const chips = A.tierChips(f).filter((e) => A.txt(e) === 'alleged');
      const pairs = A.pairs(f);
      return { A: chips.length, pairs: pairs.length, each: chips.map((c) => pairs.filter((dl) => dl.contains(c)).length) };
    });
    if (r.A === 0) { t.skip('SKIPPED: no alleged finding in #findings'); return; }
    assert.equal(r.pairs, r.A, 'one Allegation/Response dl per alleged item');
    assert.ok(r.each.every((n) => n === 1), `each chip inside exactly one dl: ${r.each}`);
  });
});

test('AC-36 — Render the response at the same size and weight as the allegation', async (t) => {
  if (!requireFull(t)) return;
  await withPage('desktop', async (page) => {
    await go(page);
    assert.equal(await count(page, '#findings'), 1, '#findings present');
    const r = await page.evaluate(() => {
      const A = window.__ac; const pairs = A.pairs(document.querySelector('#findings'));
      const rose = A.tokenColor('--color-rose');
      const first = pairs[0];
      const rule = first ? A.deepestAll(document.querySelector('#findings'), "Rose rule = the response of those concerned\\. It marks the denial's position, not its credibility\\.").some((e) => A.precedes(e, first)) : false;
      return { rose, rule, pairs: pairs.map((dl) => { const a = getComputedStyle(dl.children[1]); const d = getComputedStyle(dl.children[3]); return { aSize: a.fontSize, dSize: d.fontSize, aW: a.fontWeight, dW: d.fontWeight, border: parseFloat(d.borderLeftWidth), color: d.borderLeftColor }; }) };
    });
    if (r.pairs.length === 0) { t.skip('SKIPPED: no Allegation/Response pair in #findings'); return; }
    for (const p of r.pairs) {
      assert.equal(p.dSize, p.aSize); assert.equal(p.dW, p.aW);
      assert.ok(p.border >= 2, `response border ${p.border}`); assert.equal(p.color, r.rose, 'response rule is the rose token');
    }
    assert.ok(r.rule, 'rose-rule line above the first pair');
  });
});

test('AC-37 — Mark a missing response as missing data, and record two gaps', async (t) => {
  if (!requireFull(t)) return;
  await withPage('desktop', async (page) => {
    await go(page);
    assert.equal(await count(page, '#findings'), 1, '#findings present');
    const r = await page.evaluate(() => {
      const A = window.__ac; const pairs = A.pairs(document.querySelector('#findings'));
      const amber = A.tokenColor('--color-amber');
      const missing = 'No response located in this file. The file does not record whether one was sought.';
      const dds = pairs.map((dl) => { const dd = dl.children[3]; return { text: A.txt(dd), cite: !!dd.querySelector('a[href^="http"]'), color: getComputedStyle(dd).color }; });
      const gaps = A.txt(document.querySelector('#missing'));
      return { amber, dds, missing, gaps, never: A.txt(document.body).includes('No response on record') };
    });
    if (r.dds.length === 0) { t.skip('SKIPPED: no Allegation/Response pair in #findings'); return; }
    let anyMissing = false;
    for (const dd of r.dds) {
      if (dd.text === r.missing) { anyMissing = true; assert.equal(dd.color, r.amber, 'missing-response sentence is amber'); }
      else assert.ok(dd.text && dd.cite, `response has text and a Cite: "${dd.text}"`);
    }
    if (anyMissing) {
      assert.ok(r.gaps.includes('response sought: not recorded'), '#missing records the sought gap');
      assert.ok(/response/i.test(r.gaps.replace('response sought: not recorded', '')), '#missing names the missing response');
    }
    assert.ok(!r.never, '"No response on record" appears nowhere');
  });
});

test('AC-38 — Add the rose-rule line to the ReadingKey when an alleged item is in view', async (t) => {
  if (!requireFull(t)) return;
  await withPage('desktop', async (page) => {
    await go(page);
    const r = await page.evaluate(() => { const A = window.__ac; return { alleged: A.tierChips(document).filter((e) => A.txt(e) === 'alleged').length, lines: A.lines(A.readingKey()) }; });
    if (r.alleged > 0) {
      assert.equal(r.lines.length, 6, `ReadingKey lines: ${r.lines.join(' | ')}`);
      assert.ok(r.lines[5].startsWith('Rose rule = the response of those concerned'), r.lines[5]);
    }
    await go(page, '?tier=documented,reported,analytic');
    const lines = await page.evaluate(() => window.__ac.lines(window.__ac.readingKey()));
    assert.equal(lines.length, 5, `ReadingKey lines with alleged off: ${lines.join(' | ')}`);
  });
});

test('AC-39 — Name both sides in every contested claim, never "critics"', async (t) => {
  if (!requireFull(t)) return;
  await withPage('desktop', async (page) => {
    await go(page);
    assert.equal(await count(page, '#findings'), 1, '#findings present');
    const r = await page.evaluate(() => {
      const A = window.__ac; const f = document.querySelector('#findings');
      const line = A.deepest(f, 'No response located in this file \\((\\d+)\\) · whether one was sought is not recorded');
      const n = line ? +A.txt(line).match(/\((\d+)\)/)[1] : null;
      let list = line?.nextElementSibling; while (list && !list.matches('ul, ol')) list = list.nextElementSibling;
      const headers = [...f.querySelectorAll('dt, h3, h4, h5, strong, th')].map((h) => A.txt(h));
      return { hasLine: !!line, n, li: list ? list.querySelectorAll('li').length : 0, bad: headers.filter((h) => /critics|opponents|sources say/i.test(h)), empty: headers.filter((h) => h === '').length };
    });
    if (!r.hasLine) { t.skip('SKIPPED: #findings (b) has no contested entries (no "No response located" line)'); return; }
    assert.deepEqual(r.bad, [], 'no position header reads critics/opponents/sources say');
    assert.equal(r.empty, 0, 'no empty position header');
    assert.equal(r.li, r.n, 'list has exactly n alleged claims without a contra');
  });
});

test('AC-40 — Keep a Response column in the benefits ledger', async (t) => {
  if (!requireFull(t)) return;
  await withPage('desktop', async (page) => {
    await go(page);
    const r = await page.evaluate(() => {
      const A = window.__ac; const tb = A.table('#benefits');
      if (!tb) return null;
      const ri = A.col(tb, 'Response'); const ti = A.col(tb, 'Tier');
      return { headers: tb.headers, ri, ti, rows: tb.rows.map((row) => ({ tier: row.cells[ti]?.text, resp: row.cells[ri]?.text ?? '', cite: !!row.cells[ri]?.hasCite, total: row.cells.some((c) => /^total/i.test(c.text)) })) };
    });
    assert.ok(r, '#benefits has a table');
    assert.ok(r.headers.includes('Response') && r.headers.includes('Tier'), `headers: ${r.headers}`);
    assert.ok(!r.headers.includes('Total'), 'no Total column');
    for (const row of r.rows) {
      assert.ok(!row.total, 'no total row');
      if (row.tier === 'alleged') {
        assert.ok(row.resp !== '', 'alleged row has a Response');
        assert.ok(row.cite || row.resp === 'No response located in this file. The file does not record whether one was sought.', row.resp);
      }
    }
  });
});

test('AC-41 — Pair allegations in the SchemeCard, and refuse to imply none', async (t) => {
  if (!requireFull(t) || !need(t, 'ALLEGED_SCHEME')) return;
  await withPage('desktop', async (page) => {
    await go(page, `?s=${F.ALLEGED_SCHEME}`);
    const r = await page.evaluate(() => {
      const A = window.__ac; const card = A.panel();
      if (!card) return null;
      const text = A.txt(card);
      return { pairs: A.pairs(card).length, chips: A.tierChips(card).length, text };
    });
    assert.ok(r, 'SchemeCard open');
    assert.ok(r.pairs >= 1, 'block 7 pairs each alleged finding with a Response');
    assert.ok(r.chips >= 1 || r.text.includes('None recorded, which is not the same as none.'), 'block 8 lists rows with a TierChip or says None recorded, which is not the same as none.');
    assert.ok(!r.text.includes('No evaluation, audit, court finding or survey located for this scheme.') || r.pairs === 0, 'an alleged scheme does not claim to have no findings');
  });
});

test('AC-42 — Filter findings by tier without filtering schemes', async (t) => {
  if (!requireFull(t)) return;
  await withPage('desktop', async (page) => {
    await go(page);
    const base0 = await evalTxt(page, '[data-effect]');
    await go(page, '?tier=documented');
    const r = await page.evaluate(() => {
      const A = window.__ac;
      const tierLine = A.deepest(document.body, '(\\d+) of (\\d+) findings · (\\d+) of (\\d+) benefit rows');
      return { alleged: A.tierChips(document.querySelector('#findings')).filter((e) => A.txt(e) === 'alleged').length, tierLine: A.txt(tierLine), effect: A.txt(document.querySelector('[data-effect]')), strip: A.txt(A.strip()) };
    });
    assert.equal(r.alleged, 0);
    assert.match(r.tierLine, /(\d+) of (\d+) findings · (\d+) of (\d+) benefit rows/);
    assert.ok(r.tierLine.includes('filters findings, not schemes'), r.tierLine);
    assert.equal(r.effect, base0, 'N → k unchanged');
    assert.ok(!r.strip.includes('filtered'), 'strip shows no filtered');
  });
});

// =====================================================================
// 6. URL round-trip — FULL build
// =====================================================================

test('AC-43 — Default to unfiltered, nothing selected, no year', async (t) => {
  if (!requireFull(t)) return;
  await withPage('desktop', async (page) => { await go(page); await assertDefaults(page); });
});

test('AC-44 — Round-trip y', async (t) => {
  if (!requireFull(t) || !need(t, 'Y_WITH_BALLOTS')) return;
  const y = F.Y_WITH_BALLOTS;
  await withPage('desktop', async (page, ctx) => {
    await roundTrip(page, ctx, `?y=${y}`, 'y', async (p) => {
      assert.equal(await p.inputValue(RANGE), String(y));
      assert.ok((await p.getAttribute(RANGE, 'aria-valuetext'))?.startsWith(String(y)));
      assert.ok(await p.evaluate((yy) => !!window.__ac.deepest(document.body, `^${yy}\\b`), y), 'mono readout shows y');
      assert.ok((await count(p, '[data-ballot]')) > 0);
    }, async (p) => { await p.focus(RANGE); await p.keyboard.press('ArrowLeft'); });
    assert.equal((await params(page)).y, String(+y - 1));
    await page.getByRole('button', { name: 'All years' }).first().click();
    await page.waitForFunction(() => !window.__ac.urlParams().has('y'), null, { timeout: 3000 });
    assert.ok(await page.evaluate(() => !!window.__ac.deepest(document.body, '^All years$')));
  });
});

test('AC-45 — Round-trip m, and fall back when it cannot be honoured', async (t) => {
  if (!requireFull(t) || !need(t, 'Y_MONEY')) return;
  await withPage('desktop', async (page, ctx) => {
    await roundTrip(page, ctx, `?y=${F.Y_MONEY}&m=share`, 'm', async (p) => {
      const r = await p.evaluate(() => {
        const A = window.__ac;
        const clause = [...document.querySelectorAll('figure figcaption li')].map((l) => A.txt(l)).find((s) => s.startsWith('Share of state budget'));
        return { clause, selected: [...document.querySelectorAll('[aria-checked="true"], [aria-selected="true"], [aria-pressed="true"], option:checked')].map((e) => A.txt(e)), readout: !!A.deepest(document.body, 'money: FY') };
      });
      assert.ok(r.selected.some((s) => /Share/.test(s)), `Share selected (${r.selected})`);
      assert.ok(r.clause && r.clause.includes('FY'), `clause: ${r.clause}`);
      assert.ok(r.readout, 'readout names money: FY');
    }, async (p) => { await p.focus(RANGE); await p.keyboard.press('ArrowLeft'); });
    await go(page, '?m=share');
    const r = await page.evaluate(() => {
      const A = window.__ac;
      return { selected: [...document.querySelectorAll('[aria-checked="true"], [aria-selected="true"], [aria-pressed="true"], option:checked')].map((e) => A.txt(e)), notice: !!A.deepest(document.body, 'ignored an unrecognised m value'), c2: document.querySelectorAll('[data-caption="C2"]').length };
    });
    assert.ok(r.selected.includes('Schemes live'), `metric renders as Schemes live (${r.selected})`);
    const share = await byName(page, /Share/);
    const disabled = share && (await share.getAttribute('aria-disabled')) === 'true' && /choose a year/.test(await share.evaluate((e) => e.getAttribute('aria-label') ?? e.textContent));
    assert.ok(r.notice || disabled, 'stale m: notice or aria-disabled with choose a year');
    assert.equal(r.c2, 1, 'fill is the live metric (C2 present)');
  });
});

test('AC-46 — Round-trip cat as a comma list', async (t) => {
  if (!requireFull(t) || !need(t, 'C1', 'C2')) return;
  await withPage('desktop', async (page, ctx) => {
    await roundTrip(page, ctx, `?cat=${F.C1},${F.C2}`, 'cat', async (p) => {
      for (const label of [F.C1_LABEL, F.C2_LABEL]) assert.equal(await p.getByRole('button', { name: label, exact: true }).first().getAttribute('aria-pressed'), 'true', `${label} pressed`);
      const eff = await evalTxt(p, '[data-effect]'); const k = +eff.match(/(\d+) → (\d+) schemes/)[2];
      assert.equal(k, await count(p, '[data-twin="schemes"] tbody tr'), 'twin rows = k');
      assert.ok(k <= F.C1_COUNT + F.C2_COUNT && k >= Math.max(F.C1_COUNT, F.C2_COUNT), `k=${k} within the two counts`);
    }, async (p) => { await p.getByRole('button', { name: F.C2_LABEL, exact: true }).first().click(); });
    assert.equal((await params(page)).cat, F.C1);
    await page.getByRole('button', { name: F.C1_LABEL, exact: true }).first().click();
    await page.waitForFunction(() => !window.__ac.urlParams().has('cat'), null, { timeout: 3000 });
  });
});

test('AC-47 — Round-trip party, and prove the control ignores it', async (t) => {
  if (!requireFull(t) || !need(t, 'PARTY', 'Y_WITH_BALLOTS')) return;
  const capture = (page) => page.evaluate(() => {
    const A = window.__ac; const card = A.controlCard();
    const tables = [...document.querySelectorAll('#control table')];
    const byParty = tables.find((tb) => /party/i.test(A.txt(tb.querySelector('caption')) + (tb.closest('[role="region"]')?.getAttribute('aria-label') ?? '')));
    const turnover = tables.find((tb) => /turnover|changes of government/i.test(A.txt(tb.closest('[role="region"], section, div')) ));
    return { card: A.lines(card), two: A.txt(tables[0]), byParty: A.txt(byParty), turnover: A.txt(turnover), ballots: document.querySelectorAll('[data-ballot]').length };
  });
  await withPage('desktop', async (page, ctx) => {
    await go(page, `?y=${F.Y_WITH_BALLOTS}`);
    const a = await capture(page);
    await roundTrip(page, ctx, `?party=${encodeURIComponent(F.PARTY)}&y=${F.Y_WITH_BALLOTS}`, 'party', async (p) => {
      const b = await capture(p);
      const added = b.card.filter((l) => !a.card.includes(l));
      assert.deepEqual(a.card.filter((l) => !b.card.includes(l)), [], 'no ControlCard line removed');
      assert.equal(added.length, 1, `exactly one line added: ${added.join(' | ')}`);
      assert.match(added[0], new RegExp(`^${F.PARTY.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} as incumbent · 12 m:`));
      assert.equal(b.two, a.two); assert.equal(b.byParty, a.byParty); assert.equal(b.turnover, a.turnover);
      assert.equal(b.ballots, a.ballots);
      const r = await p.evaluate((line) => {
        const A = window.__ac; const accent = A.tokenColor('--color-accent');
        const el = A.deepest(A.controlCard(), line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        let box = el; while (box && parseFloat(getComputedStyle(box).borderLeftWidth) === 0 && box.parentElement) box = box.parentElement;
        const muted = document.querySelectorAll('[data-ballot][data-muted="true"]').length; const un = document.querySelectorAll('[data-ballot][data-muted="false"]').length;
        return { accent, lineColor: box ? getComputedStyle(box).borderLeftColor : null, muted, un, total: document.querySelectorAll('[data-ballot]').length };
      }, added[0]);
      assert.equal(r.lineColor, r.accent, 'added line has an accent left border');
      assert.equal(r.muted + r.un, r.total);
    }, async (p) => { await p.focus(RANGE); await p.keyboard.press('ArrowLeft'); });
    await go(page);
    const pre = await page.evaluate(() => document.querySelectorAll('select[multiple] option:checked, [role="listbox"] [aria-selected="true"]').length);
    assert.equal(pre, 0, 'party never pre-selected');
  });
});

test('AC-48 — Round-trip lvl without touching the map', async (t) => {
  if (!requireFull(t)) return;
  const fills = (page) => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('path[data-fill-class]')].map((p) => [p.getAttribute('d'), p.dataset.fillClass])));
  await withPage('desktop', async (page, ctx) => {
    await go(page);
    const a = await fills(page);
    assert.equal(Object.keys(a).length, 36);
    await roundTrip(page, ctx, '?lvl=state', 'lvl', async (p) => {
      assert.deepEqual(await fills(p), a, 'per-state fills unchanged');
      const art = await evalTxt(p, 'article');
      assert.match(art, /hidden by Level: state · \d+ central schemes/);
      assert.ok(art.includes('the map shows state schemes only'), 'effect line');
    }, async (p) => { await p.focus(RANGE); await p.keyboard.press('ArrowRight'); });
    await go(page, '?lvl=central');
    assert.equal(await count(page, '[data-lane="state"]'), 0);
    assert.ok((await count(page, '[data-lane="central"]')) > 0, 'central band shows lanes');
  });
});

test('AC-49 — Round-trip st and move focus to the panel on a user action', async (t) => {
  if (!requireFull(t) || !need(t, 'STATE_WITH_VALUE')) return;
  await withPage('desktop', async (page, ctx) => {
    await roundTrip(page, ctx, `?st=${F.STATE_WITH_VALUE}`, 'st', async (p) => {
      const r = await p.evaluate((st) => { const A = window.__ac; const panel = A.panel(); return { h2: A.txt(panel?.querySelector('h2')), link: !!panel?.querySelector(`a[href*="/states/${st}"]`), close: !!panel?.querySelector('button[aria-label^="Close "]') }; }, F.STATE_WITH_VALUE);
      assert.ok(r.h2.includes(F.STATE_WITH_VALUE_NAME), `panel h2: ${r.h2}`);
      assert.ok(r.link, 'Link to /states/{st}'); assert.ok(r.close, 'Close button');
    }, async (p) => { await p.focus(RANGE); await p.keyboard.press('ArrowRight'); });
    await go(page);
    await page.focus(MAP);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.__ac.urlParams().has('st'), null, { timeout: 3000 });
    const r = await page.evaluate(() => ({ isH2: document.activeElement?.tagName === 'H2', tab: document.activeElement?.tabIndex, live: window.__ac.txt(document.querySelector('[aria-live="polite"]')) }));
    assert.ok(r.isH2 && r.tab === -1, 'focus on the panel h2 (tabIndex -1)');
    assert.match(r.live, /opened: \d+ state schemes, \d+ elections in the file/);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !window.__ac.urlParams().has('st'), null, { timeout: 3000 });
    assert.ok(await page.evaluate(() => document.activeElement === window.__ac.mapSvg()), 'focus returns to the map svg');
  });
});

test('AC-50 — Round-trip s, and answer an unknown scheme plainly', async (t) => {
  if (!requireFull(t) || !need(t, 'SCHEME_ID', 'STATE_WITH_VALUE')) return;
  await withPage('desktop', async (page, ctx) => {
    await roundTrip(page, ctx, `?s=${F.SCHEME_ID}`, 's', async (p) => {
      const r = await p.evaluate((name) => {
        const A = window.__ac; const panel = A.panel(); const accent = A.tokenColor('--color-accent'); const svg = A.lanesSvg();
        const hits = svg ? [...svg.querySelectorAll('*')].filter((e) => { const cs = getComputedStyle(e); return cs.stroke === accent || cs.fill === accent; }) : [];
        const groups = new Set(hits.map((e) => e.closest('g')));
        return { header: A.txt(panel?.querySelector('h2, header')), hits: hits.length, groups: groups.size };
      }, F.SCHEME_NAME);
      assert.ok(r.header.includes(F.SCHEME_NAME), `SchemeCard header: ${r.header}`);
      assert.ok(r.hits > 0, 'the scheme lane carries the accent');
      assert.equal(r.groups, 1, 'no other lane carries the accent');
    }, async (p) => { await p.focus(RANGE); await p.keyboard.press('ArrowRight'); });
    await go(page, '?s=does-not-exist');
    const el = await page.evaluate(() => { const A = window.__ac; const e = A.deepest(document.body, 'No scheme `does-not-exist` in this file\\.'); let box = e; while (box && !box.querySelector('a') && box.parentElement && box.parentElement !== document.body) box = box.parentElement; return { found: !!e, link: !!box?.querySelector('a') }; });
    assert.ok(el.found && el.link, 'unknown-scheme line with a link');
    await page.evaluate(() => { const A = window.__ac; const e = A.deepest(document.body, 'No scheme `does-not-exist` in this file\\.'); let box = e; while (box && !box.querySelector('a')) box = box.parentElement; box.querySelector('a').click(); });
    await page.waitForFunction(() => !window.__ac.urlParams().has('s'), null, { timeout: 3000 });
    await go(page, `?st=${F.STATE_WITH_VALUE}&s=${F.SCHEME_ID}`);
    const r2 = await page.evaluate((name) => { const A = window.__ac; const panel = A.panel(); return { header: A.txt(panel?.querySelector('h2, header')), back: !!document.querySelector(`[aria-label="Back to ${name}"]`) }; }, F.STATE_WITH_VALUE_NAME);
    assert.ok(r2.header.includes(F.SCHEME_NAME), 'SchemeCard, not StatePanel'); assert.ok(r2.back, 'Back to {State}');
  });
});

test('AC-51 — Round-trip tier', async (t) => {
  if (!requireFull(t)) return;
  await withPage('desktop', async (page, ctx) => {
    await roundTrip(page, ctx, '?tier=documented,reported', 'tier', async (p) => {
      for (const tier of TIERS) assert.equal(await tierToggle(p, tier).getAttribute('aria-pressed'), tier === 'documented' || tier === 'reported' ? 'true' : 'false', tier);
    }, async (p) => { await tierToggle(p, 'alleged').click(); });
    assert.equal((await params(page)).tier, 'documented,reported,alleged');
    await tierToggle(page, 'analytic').click();
    await page.waitForFunction(() => !window.__ac.urlParams().has('tier'), null, { timeout: 3000 });
  });
});

test('AC-52 — Round-trip view, and open the twins under the table view or the hash', async (t) => {
  if (!requireFull(t)) return;
  await withPage('desktop', async (page, ctx) => {
    await roundTrip(page, ctx, '?view=table', 'view', async (p) => {
      assert.equal(await count(p, 'figure svg[role="img"]'), 0, 'no map svg');
      const r = await p.evaluate(() => { const d = [...document.querySelectorAll('#stage-tables details[data-twin]')]; return { n: d.length, open: d.filter((x) => x.open).length }; });
      assert.ok(r.n > 0 && r.open === r.n, `all ${r.n} twins open`);
      assert.equal(await count(p, SEARCH), 1, 'FilterBar present');
      assert.ok((await p.getByRole('button', { name: 'Copy as TSV' }).count()) >= r.n && (await p.getByRole('button', { name: 'Download .tsv' }).count()) >= r.n, 'export buttons above each twin');
    }, async (p) => { await p.getByRole('button', { name: 'Reset' }).first().click(); });
    assert.equal((await params(page)).view, 'table', 'Reset keeps view');
    await go(page, '#stage-tables');
    const open = await page.evaluate(() => [...document.querySelectorAll('#stage-tables details')].map((d) => d.open));
    assert.equal(open.length, 3); assert.ok(open.every(Boolean), 'hash opens the three details');
    await go(page, '?view=map');
    assert.equal(await count(page, '#stage-tables details[open]'), 0);
  });
});

test('AC-53 — Round-trip q, list ≤ 8 matches as links, and never auto-select', async (t) => {
  if (!requireFull(t) || !need(t, 'SCHEME_NAME')) return;
  const q = F.SCHEME_NAME.slice(0, 6);
  await withPage('desktop', async (page, ctx) => {
    await roundTrip(page, ctx, `?q=${encodeURIComponent(q)}`, 'q', async (p) => {
      assert.equal(await p.inputValue(SEARCH), q);
      const r = await p.evaluate(() => { const A = window.__ac; const eff = document.querySelector('[data-effect]'); const k = +(A.txt(eff).match(/(\d+) → (\d+) schemes/)?.[2] ?? NaN); return { k, links: [...eff.querySelectorAll('a')].map((a) => a.getAttribute('href')), card: !!document.querySelector('button[aria-label^="Close "]') }; });
      if (r.k <= 8) { assert.equal(r.links.length, r.k, 'k links'); assert.ok(r.links.every((h) => h.includes('s=') && h.includes('q=')), `links carry s= and q=: ${r.links}`); }
      assert.ok(!r.card, 'no SchemeCard auto-opened');
    }, async (p) => { await p.locator(SEARCH).press('End'); await p.keyboard.type('a'); });
    await page.locator(SEARCH).press('End');
    await page.keyboard.type('b');
    await page.waitForFunction((want) => window.__ac.urlParams().get('q') === want, `${q}ab`, { timeout: 400 + SETTLE });
    assert.match(await live(page), /\d+ → \d+ schemes/);
  });
});

test('AC-54 — Ignore unknown values with a visible notice, and fall back to defaults', async (t) => {
  if (!requireFull(t)) return;
  await withPage('desktop', async (page) => {
    await go(page, '?m=bogus&lvl=nope&view=chart&tier=x');
    const r = await page.evaluate(() => {
      const A = window.__ac; const amber = A.tokenColor('--color-amber'); const strip = A.strip();
      return ['m', 'lvl', 'view', 'tier'].map((p) => { const el = A.deepest(document.body, `ignored an unrecognised ${p} value`); return { p, found: !!el, amber: el ? getComputedStyle(el).color === amber : false, under: el ? A.precedes(strip, el) : false }; });
    });
    for (const x of r) { assert.ok(x.found, `notice for ${x.p}`); assert.ok(x.amber, `${x.p} notice is amber`); assert.ok(x.under, `${x.p} notice under the strip`); }
    await assertDefaults(page);
  });
});

test('AC-55 — Reset everything but view, and copy the exact link', async (t) => {
  if (!requireFull(t) || !need(t, 'Y_WITH_BALLOTS', 'C1', 'PARTY', 'STATE_WITH_VALUE')) return;
  await withPage('desktop', async (page) => {
    await go(page, `?y=${F.Y_WITH_BALLOTS}&m=live&cat=${F.C1}&party=${encodeURIComponent(F.PARTY)}&lvl=state&st=${F.STATE_WITH_VALUE}&tier=documented&view=map&q=a`);
    await page.getByRole('button', { name: 'Reset' }).first().click();
    await page.waitForFunction(() => { const p = window.__ac.urlParams(); return [...p.keys()].every((k) => k === 'view'); }, null, { timeout: 3000 });
    const p = await params(page);
    assert.ok(Object.keys(p).length === 0 || (Object.keys(p).length === 1 && p.view === 'map'), JSON.stringify(p));
    await page.getByRole('button', { name: 'Copy link' }).first().click();
    await page.waitForFunction(() => window.__ac.txt(document.querySelector('[aria-live="polite"]')) === 'Link copied', null, { timeout: 3000 });
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    assert.equal(clip, await page.evaluate(() => location.href));
  });
});

test('AC-56 — Reproduce the whole view from a URL built through the controls', async (t) => {
  if (!requireFull(t) || !need(t, 'Y_MONEY', 'C1_LABEL', 'C2_LABEL', 'PARTY', 'STATE_WITH_VALUE')) return;
  const capture = (page) => page.evaluate(() => { const A = window.__ac; return { strip: A.txt(A.strip()), afl: A.txt(A.activeFilterLine()), cap: A.txt(document.querySelector('figure figcaption')), margin: A.txt(A.margin()), lanes: A.txt(A.lanesSvg()?.parentElement) }; });
  let url; let first;
  await withPage('desktop', async (page) => {
    await go(page);
    await page.locator(RANGE).fill(String(F.Y_MONEY));
    await page.waitForFunction((y) => window.__ac.urlParams().get('y') === String(y), F.Y_MONEY, { timeout: 3000 });
    const share = await byName(page, /Share/); await share.click();
    await page.getByRole('button', { name: F.C1_LABEL, exact: true }).first().click();
    await page.getByRole('button', { name: F.C2_LABEL, exact: true }).first().click();
    const sel = page.locator('select[multiple]');
    if (await sel.count()) await sel.selectOption({ label: F.PARTY }); else await (await byName(page, F.PARTY, ['option', 'checkbox', 'button']))?.click();
    await (await byName(page, /^state$/i))?.click();
    await tierToggle(page, 'alleged').click();
    await page.evaluate((st) => { const A = window.__ac; const p = [...document.querySelectorAll('path[data-fill-class]')].find((x) => (x.querySelector('title')?.textContent ?? '').includes(st) || x.dataset.st === st || x.id?.endsWith(st)); (p ?? document.querySelector('path[data-fill-class="value"]')).dispatchEvent(new MouseEvent('click', { bubbles: true })); }, F.STATE_WITH_VALUE_NAME);
    await page.waitForFunction(() => window.__ac.urlParams().has('st'), null, { timeout: 3000 });
    await page.locator('[data-lane]').first().click();
    await page.waitForFunction(() => window.__ac.urlParams().has('s'), null, { timeout: 3000 });
    await page.locator(SEARCH).fill('a');
    await page.waitForFunction(() => window.__ac.urlParams().get('q') === 'a', null, { timeout: 3000 });
    await page.waitForTimeout(SETTLE);
    url = page.url(); first = await capture(page);
    const p = await params(page);
    for (const k of ['y', 'm', 'cat', 'party', 'lvl', 'tier', 'st', 's', 'q']) { assert.ok(k in p, `URL carries ${k}`); assert.match(first.afl, new RegExp(`(^|[\\s(])${k}=`), `active-filter line lists ${k}`); }
  });
  await withPage('desktop', async (page) => {
    await goUrl(page, url);
    assert.deepEqual(await capture(page), first, 'five texts byte-identical in a fresh context');
  });
});

// =====================================================================
// 7. Table twin = visible graphic — FULL build
// =====================================================================

test('AC-57 — Match the year-slice twin to the 36 painted states, class for class', async (t) => {
  if (!requireFull(t) || !need(t, 'Y_WITH_BALLOTS')) return;
  for (const search of [`?y=${F.Y_WITH_BALLOTS}`, '']) {
    await withPage('desktop', async (page) => {
      await go(page, search);
      const r = await page.evaluate(() => {
        const A = window.__ac; const ys = A.table('[data-twin="year-slice"]'); const c = A.col(ys, 'Class');
        const cls = ys.rows.map((row) => row.cells[c]?.text ?? '');
        const n = (k) => cls.filter((x) => x === k).length;
        const paint = (k) => document.querySelectorAll(`path[data-fill-class="${k}"]`).length;
        return { rows: ys.rows.length, paths: document.querySelectorAll('path[data-fill-class]').length,
          twin: { hatch: n('none recorded'), stipple: n('live, no comparable figure'), zero: n('searched, none live'), value: cls.filter((x) => !['none recorded', 'live, no comparable figure', 'searched, none live'].includes(x)).length },
          paint: { hatch: paint('hatch'), stipple: paint('stipple'), zero: paint('zero'), value: paint('value') },
          summary: A.txt(document.querySelector('[data-twin="year-slice"] summary')) };
      });
      assert.equal(r.rows, 36); assert.equal(r.paths, 36);
      assert.deepEqual(r.twin, r.paint, `class counts at ${search || '/'}`);
      assert.match(r.summary, /Map as a table · 36 states · metric: .+ · year: .+ · filters: .+ · as of .+/);
    });
  }
});

test('AC-58 — Count the same elections on the map, in the card, and in the twins', async (t) => {
  if (!requireFull(t) || !need(t, 'Y_WITH_BALLOTS')) return;
  const y = F.Y_WITH_BALLOTS;
  await withPage('desktop', async (page) => {
    await go(page, `?y=${y}`);
    const r = await page.evaluate((y) => {
      const A = window.__ac; const E = document.querySelectorAll('[data-ballot]').length;
      const ys = A.table('[data-twin="year-slice"]'); const ei = A.col(ys, `Assembly election in ${y}`);
      const ysCells = ys.rows.map((row) => row.cells[ei]?.text ?? '');
      const card = A.controlCard(); const head = card && A.deepest(card, `^${y}\\b`);
      let list = head; while (list && !list.matches('ul, ol') && !list.querySelector('ul, ol') && list !== card) list = list.parentElement === card ? list.nextElementSibling : list.parentElement;
      const items = list ? [...(list.matches('ul, ol') ? list : list.querySelector('ul, ol') ?? list).querySelectorAll('li')] : [];
      const el = A.table('[data-twin="elections"]'); const eC = A.col(el, 'Election'); const dC = A.col(el, 'Date');
      const titles = [...document.querySelectorAll('[data-ballot] title')].map((tt) => tt.textContent.trim());
      return { E, ysE: ysCells.filter(Boolean).length, cardItems: items.map((li) => ({ text: A.txt(li), cite: !!li.querySelector('a[href^="http"]') })),
        twinE: el ? el.rows.filter((row) => /assembly/i.test(row.cells[eC]?.text ?? '') && (row.cells[dC]?.text ?? '').startsWith(String(y))).length : -1,
        titles, titleHit: titles.map((tt) => ysCells.some((c) => c.includes(tt))) };
    }, y);
    assert.ok(r.E > 0, 'ballots on the map');
    assert.equal(r.ysE, r.E, 'year-slice election cells = E');
    assert.equal(r.cardItems.length, r.E, 'ControlCard year block lists E entries');
    for (const it of r.cardItems) assert.ok(it.cite || it.text.includes('no source in file'), it.text);
    assert.equal(r.twinE, r.E, 'elections twin assembly rows in y = E');
    assert.ok(r.titles.length === r.E && r.titleHit.every(Boolean), 'each ballot title appears verbatim in a year-slice cell');
  });
});

test('AC-59 — Match the schemes twin to the filter effect and the strip', async (t) => {
  if (!requireFull(t) || !need(t, 'C1', 'PARTY', 'SCHEME_NAME')) return;
  await withPage('desktop', async (page) => {
    for (const search of ['', `?cat=${F.C1}`, `?party=${encodeURIComponent(F.PARTY)}`, `?q=${encodeURIComponent(F.SCHEME_NAME.slice(0, 6))}`]) {
      await go(page, search);
      const r = await page.evaluate(() => {
        const A = window.__ac; const tb = A.table('[data-twin="schemes"]'); const si = A.col(tb, 'Scheme');
        return { rows: tb.rows.length, k: +(A.txt(document.querySelector('[data-effect]')).match(/(\d+) → (\d+) schemes/)?.[2] ?? NaN), n: +(A.txt(A.strip()).match(/(\d[\d,]*) of \d[\d,]* schemes in view/)?.[1].replace(/,/g, '') ?? NaN), links: tb.rows.every((row) => row.cells[si]?.href?.includes('s=')) };
      });
      assert.equal(r.rows, r.k, `rows = k at ${search || '/'}`); assert.equal(r.n, r.k, `strip n = k at ${search || '/'}`);
      assert.ok(r.links, 'every Scheme cell links with s=');
    }
  });
});

test('AC-60 — Match lane counts to their headers and the lanes twin', async (t) => {
  if (!requireFull(t) || !need(t, 'STATE_WITH_VALUE')) return;
  await withPage('desktop', async (page) => {
    await go(page);
    let r = await page.evaluate(() => { const A = window.__ac; const m = A.txt(document.querySelector('article')).match(/Central · applies to all states · not painted on the map · (\d+) schemes/); return { n: m && +m[1], lanes: document.querySelectorAll('[data-lane="central"]').length }; });
    assert.ok(r.n !== null, 'central band header'); assert.equal(r.lanes, r.n);
    await go(page, `?st=${F.STATE_WITH_VALUE}`);
    r = await page.evaluate(() => {
      const A = window.__ac; const m = A.txt(document.querySelector('article')).match(/(\d+) schemes · (\d+) elections in the file/);
      const svg = A.lanesSvg(); const rules = svg ? svg.querySelectorAll('[data-election], line[data-rule], .election-rule').length : 0;
      const labels = [...document.querySelectorAll('[data-lane]')].map((b) => A.txt(b));
      const tb = A.table('[data-twin="lanes"]'); const si = A.col(tb, 'Scheme'); const twin = new Set(tb ? tb.rows.map((row) => row.cells[si]?.text) : []);
      return { n: m && +m[1], e: m && +m[2], state: document.querySelectorAll('[data-lane="state"]').length, rules, labels, twin: [...twin] };
    });
    assert.ok(r.n !== null, 'state header'); assert.equal(r.state, r.n, 'state lanes = header count');
    assert.equal(r.rules, r.e, 'election rules in the state lanes = header count');
    for (const l of r.labels) assert.ok(r.twin.some((s) => s && l.includes(s)), `lanes twin covers lane "${l}"`);
  });
});

test('AC-61 — Give the scrubber twin one row per year, agreeing with the readout', async (t) => {
  if (!requireFull(t) || !need(t, 'Y_WITH_BALLOTS')) return;
  await withPage('desktop', async (page) => {
    await go(page, `?y=${F.Y_WITH_BALLOTS}`);
    const r = await page.evaluate((y) => {
      const A = window.__ac; const tb = A.table('[data-twin="scrubber"]'); const yi = A.col(tb, 'Year'); const li = A.col(tb, 'State schemes live'); const ei = A.col(tb, 'Assembly elections');
      const row = tb.rows.find((x) => x.cells[yi]?.text === String(y));
      const m = A.txt(document.querySelector('article')).match(/(\d+) state schemes live of (\d+) in view · (\d+) assembly elections/);
      return { n: tb.rows.length, first: tb.rows[0]?.cells[yi]?.text, last: tb.rows.at(-1)?.cells[yi]?.text, live: row && +row.cells[li]?.text, e: row && +row.cells[ei]?.text, readout: m && { n: +m[1], e: +m[3] }, ballots: document.querySelectorAll('[data-ballot]').length };
    }, F.Y_WITH_BALLOTS);
    assert.equal(r.n, 27); assert.equal(r.first, '2000'); assert.equal(r.last, '2026');
    assert.ok(r.readout, 'map readout present');
    assert.equal(r.live, r.readout.n); assert.equal(r.e, r.readout.e); assert.equal(r.e, r.ballots);
  });
});

test('AC-62 — Export exactly the rows on screen, with the caption line first', async (t) => {
  if (!requireFull(t)) return;
  await withPage('desktop', async (page) => {
    await go(page, '?view=table');
    const tables = await page.evaluate(() => {
      const A = window.__ac; const out = [];
      const seen = new Set();
      const push = (table, sel) => { if (!table || seen.has(table)) return; seen.add(table); table.dataset.acIdx = String(out.length); const box = table.closest('details, [role="region"]')?.parentElement ?? table.closest('details, section') ?? table.parentElement; out.push({ sel, rows: table.querySelectorAll('tbody tr').length, capLine: A.lines(box).find((l) => /(\d+) rows · filters: .+ · .+ · as of .+ · run run-/.test(l)) ?? null }); };
      for (const tw of document.querySelectorAll('[data-twin]')) push(tw.querySelector('table'), tw.dataset.twin);
      for (const s of ['#control', '#ministers', '#after', '#benefits', '#findings', '#narratives', '#missing']) push(document.querySelector(`${s} table`), s);
      return out;
    });
    assert.ok(tables.length > 0, 'tables present');
    for (const tb of tables) {
      const tableLoc = page.locator(`table[data-ac-idx="${tables.indexOf(tb)}"]`);
      assert.ok(tb.capLine, `${tb.sel}: caption line present`);
      assert.equal(+tb.capLine.match(/(\d+) rows/)[1], tb.rows, `${tb.sel}: caption rows = tbody rows`);
      const box = tableLoc.locator('xpath=ancestor::*[.//button[normalize-space()="Copy as TSV"]][1]');
      const copy = box.getByRole('button', { name: 'Copy as TSV' }).first();
      const dl = box.getByRole('button', { name: 'Download .tsv' }).first();
      assert.ok(await copy.count() && await dl.count(), `${tb.sel}: export buttons`);
      assert.ok(await copy.evaluate((b, sel) => { const t = document.querySelector(sel); return !!(b.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING); }, `table[data-ac-idx="${tables.indexOf(tb)}"]`), `${tb.sel}: buttons sit above the table`);
      await copy.click();
      await page.waitForFunction((n) => window.__ac.txt(document.querySelector('[aria-live="polite"]')) === `Table copied, ${n} rows`, tb.rows, { timeout: 3000 });
      const clip = await page.evaluate(() => navigator.clipboard.readText());
      const lines = clip.replace(/\n$/, '').split('\n');
      assert.equal(lines.length, tb.rows + 2, `${tb.sel}: caption + header + rows`);
      assert.equal(lines[0], tb.capLine, `${tb.sel}: line 1 is the caption line`);
      assert.match(lines[1], /^[a-z0-9_]+(\t[a-z0-9_]+)*$/, `${tb.sel}: snake_case header`);
      assert.ok(lines[1].endsWith('as_of\trun_id\tfilters\tsource_urls'), `${tb.sel}: header tail`);
      const [download] = await Promise.all([page.waitForEvent('download', { timeout: 5000 }), dl.click()]);
      assert.match(download.suggestedFilename(), /^welfare-[a-z-]+-\d{4}-\d{2}-\d{2}-run-[0-9a-f]+\.tsv$/);
    }
  });
});

test('AC-63 — Make the TwoByTwo its own twin', async (t) => {
  if (!requireFull(t)) return;
  await withPage('desktop', async (page) => {
    await go(page);
    const r = await page.evaluate(() => {
      const A = window.__ac; const two = document.querySelector('#control table'); if (!two) return null;
      const headers = [...two.querySelectorAll('thead th')].map((h) => A.txt(h));
      const rows = [...two.querySelectorAll('tbody tr')].map((tr) => ({ text: A.txt(tr), cells: [...tr.querySelectorAll('td')].map((td) => ({ n: +(A.txt(td).match(/\d+/)?.[0] ?? NaN), li: td.querySelector('details')?.querySelectorAll('li').length ?? -1 })) }));
      const size = getComputedStyle(two.querySelector('td')).fontSize;
      const sens = A.deepest(document.querySelector('#control'), '^6 m: retained');
      const nline = A.deepest(document.querySelector('#control'), '^n = \\d+\\. No significance test is run at this n\\.$');
      return { headers, rows, size, sens: A.txt(sens), sensSize: sens ? getComputedStyle(sens).fontSize : null, sensAfter: A.precedes(two, sens), nline: !!nline, nAfter: A.precedes(sens, nline) };
    });
    assert.ok(r, 'TwoByTwo table in #control');
    for (const h of ['Incumbent retained', 'Incumbent lost', 'Unclassified']) assert.ok(r.headers.includes(h), `header ${h}: ${r.headers}`);
    assert.equal(r.rows.length, 2);
    for (const row of r.rows) { assert.match(row.text, /(\d+) of (\d+)$/); for (const c of row.cells.slice(0, 3)) assert.equal(c.li, c.n, 'cell details li = number'); }
    assert.match(r.sens, /6 m: retained \d+ of \d+ with · \d+ of \d+ without — 24 m:/);
    assert.equal(r.sensSize, r.size); assert.ok(r.sensAfter && r.nline && r.nAfter, 'sensitivity row then n line');
  });
});

// =====================================================================
// 8. Keyboard reachability — FULL build
// =====================================================================

test('AC-64 — Put the skip link first in the stage, and make it work', async (t) => {
  if (!requireFull(t)) return;
  await withPage('desktop', async (page) => {
    await go(page);
    assert.equal(await evalTxt(page, SKIP_LINK), 'Skip to this stage as tables');
    await page.evaluate(() => { const f = window.__ac.focusables(); const i = f.findIndex((e) => e.matches('a[href="#stage-tables"]')); f[i - 1]?.focus(); });
    await page.keyboard.press('Tab');
    assert.ok(await page.evaluate(() => document.activeElement?.matches('a[href="#stage-tables"]')), 'Tab lands on the skip link');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => location.hash.endsWith('#stage-tables'), null, { timeout: 3000 });
    assert.ok(await page.locator('#stage-tables h3').first().isVisible(), '#stage-tables h3 visible');
    const open = await page.evaluate(() => [...document.querySelectorAll('#stage-tables details')].map((d) => d.open));
    assert.equal(open.length, 3); assert.ok(open.every(Boolean));
  });
});

test('AC-65 — Drive the map by keyboard and announce each state', async (t) => {
  if (!requireFull(t) || !need(t, 'STATE_NAMES')) return;
  await withPage('desktop', async (page) => {
    await go(page);
    const label = await page.getAttribute(MAP, 'aria-label');
    assert.match(label ?? '', /^Map of India, .+, .+, \d+ of 36 states with a value; arrow keys move between states, Enter opens one; a table version follows$/);
    const desc = await page.evaluate(() => { const A = window.__ac; const svg = A.mapSvg(); const ids = (svg.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean); return { ids, cap: ids.some((id) => document.getElementById(id)?.matches('figcaption')), legend: ids.some((id) => document.getElementById(id) && !document.getElementById(id).matches('figcaption')), inner: svg.querySelectorAll('[tabindex]').length ? [...svg.querySelectorAll('[tabindex]')].filter((e) => e.tabIndex >= 0).length : 0 }; });
    assert.ok(desc.cap && desc.legend, `aria-describedby names figcaption and legend: ${desc.ids}`);
    assert.equal(desc.inner, 0, 'nothing focusable inside the svg');
    await page.focus(MAP);
    let prev = await live(page);
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('ArrowRight');
      const txt = await live(page);
      assert.notEqual(txt, prev, 'live region changes'); prev = txt;
      assert.ok(F.STATE_NAMES.some((n) => txt.startsWith(n)), `begins with a state name: ${txt}`);
      const vis = await page.evaluate((s) => window.__ac.deepestAll(document.body, s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).some((e) => !e.closest('[aria-live]')), txt);
      assert.ok(vis, 'visible readout shows the same text');
    }
  });
});

test('AC-66 — Name the scrubber for assistive technology, including the null year', async (t) => {
  if (!requireFull(t)) return;
  await withPage('desktop', async (page) => {
    await go(page);
    assert.equal(await count(page, RANGE), 1, 'Year range present');
    const r = await page.evaluate(() => { const i = document.querySelector('input[type="range"][aria-label="Year"]'); const d = i.getAttribute('aria-describedby'); return { min: i.min, max: i.max, vt: i.getAttribute('aria-valuetext'), desc: d && !!document.getElementById(d.split(/\s+/)[0]), descMono: d && /mono/i.test(getComputedStyle(document.getElementById(d.split(/\s+/)[0])).fontFamily) }; });
    assert.equal(r.min, '2000'); assert.equal(r.max, '2026'); assert.match(r.vt, /^All years, 2000 to \d{4}$/);
    assert.ok(r.desc && r.descMono, 'aria-describedby points at the mono readout');
    assert.ok(await page.getByRole('button', { name: /^Previous year, \d{4}$/ }).count(), 'previous button');
    assert.ok(await page.getByRole('button', { name: /^Next year, \d{4}$/ }).count(), 'next button');
    for (const [y, re] of [['2026', /^Next year/], ['2000', /^Previous year/]]) {
      await go(page, `?y=${y}`);
      const b = page.getByRole('button', { name: re, includeHidden: true }).first();
      assert.equal(await b.getAttribute('aria-disabled'), 'true', `${y}: step button aria-disabled`);
      assert.equal(await b.getAttribute('disabled'), null, `${y}: no disabled attribute`);
      await b.focus(); assert.ok(await b.evaluate((e) => document.activeElement === e), `${y}: remains focusable`);
      const name = await b.evaluate((e) => e.getAttribute('aria-label') ?? e.textContent);
      assert.ok(name.length > `Next year, ${y}`.length && /\b(no|last|first|end|start|beyond|before|after|latest|earliest)\b/i.test(name), `${y}: name states the reason: ${name}`);
    }
  });
});

test('AC-67 — Reach every lane by a real button, and nothing inside the drawing', async (t) => {
  if (!requireFull(t)) return;
  await withPage('desktop', async (page) => {
    await go(page);
    const r = await page.evaluate(() => {
      const A = window.__ac; const svg = A.lanesSvg();
      const buttons = [...document.querySelectorAll('ul > li > button[data-lane]')];
      return { hidden: svg?.getAttribute('aria-hidden'), focusable: svg ? [...svg.querySelectorAll('*')].filter((e) => e.tabIndex >= 0).length : -1, all: document.querySelectorAll('[data-lane]').length, structured: buttons.length, names: buttons.map((b) => b.getAttribute('aria-label') ?? A.txt(b)) };
    });
    assert.equal(r.hidden, 'true', 'lanes svg aria-hidden'); assert.equal(r.focusable, 0);
    assert.ok(r.all > 0 && r.structured === r.all, 'label column is ul > li > button');
    for (const n of r.names) assert.match(n, / · (Central|[A-Z].+) · launched (\d{4}-\d{2}-\d{2}|not launched) · \d+ status events$/);
    const btn = page.locator('[data-lane="central"]').first();
    await btn.focus(); await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.__ac.urlParams().has('s'), null, { timeout: 3000 });
    assert.ok(await page.evaluate(() => document.activeElement?.tagName === 'H2' && !!window.__ac.panel()?.contains(document.activeElement)), 'SchemeCard h2 focused');
    assert.match(await live(page), /opened$/);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !window.__ac.urlParams().has('s'), null, { timeout: 3000 });
    assert.ok(await btn.evaluate((e) => document.activeElement === e), 'focus returns to the lane button');
  });
});

test('AC-68 — Name the close and back controls', async (t) => {
  if (!requireFull(t) || !need(t, 'STATE_WITH_VALUE', 'SCHEME_ID')) return;
  await withPage('desktop', async (page) => {
    const reach = async (sel) => { await page.focus(`${await page.evaluate(() => { const p = window.__ac.panel(); p.querySelector('h2').setAttribute('data-ac-h2', '1'); return '[data-ac-h2]'; })}`); for (let i = 0; i < 12; i++) { await page.keyboard.press('Tab'); if (await page.evaluate((s) => document.activeElement?.matches(s), sel)) return true; } return false; };
    await go(page, `?st=${F.STATE_WITH_VALUE}`);
    const close = `button[aria-label="Close ${F.STATE_WITH_VALUE_NAME}"]`;
    assert.equal(await count(page, close), 1);
    assert.ok(await reach(close), 'close reachable by Tab from the h2');
    await go(page, `?st=${F.STATE_WITH_VALUE}&s=${F.SCHEME_ID}`);
    const back = `[aria-label="Back to ${F.STATE_WITH_VALUE_NAME}"]`;
    assert.equal(await count(page, back), 1); assert.ok(await count(page, 'button[aria-label^="Close "]'));
    assert.ok(await reach(back), 'back reachable by Tab from the h2');
    assert.ok(await reach('button[aria-label^="Close "]'), 'close reachable by Tab from the h2');
  });
});

test('AC-69 — Keep exactly one live region, and hide decorative swatches', async (t) => {
  if (!requireFull(t)) return;
  const routes = ['', '?view=table', F.Y_WITH_BALLOTS ? `?y=${F.Y_WITH_BALLOTS}` : null, F.SCHEME_ID ? `?s=${F.SCHEME_ID}` : null, F.STATE_WITH_VALUE ? `?st=${F.STATE_WITH_VALUE}` : null, '?tier=documented'].filter((x) => x !== null);
  await withPage('desktop', async (page) => {
    for (const search of routes) {
      await go(page, search);
      const r = await page.evaluate(() => ({ n: document.querySelectorAll('[aria-live]').length, polite: document.querySelectorAll('[aria-live="polite"]').length }));
      assert.equal(r.n, 1, `one live region at ${search || '/'}`); assert.equal(r.polite, 1);
    }
    await go(page);
    for (const tier of TIERS) {
      const b = tierToggle(page, tier);
      assert.equal(await b.count(), 1, `${tier} toggle by accessible name`);
      const sw = await b.evaluate((e) => [...e.querySelectorAll('svg, span[class*="dash"], [style*="dash"]')].map((s) => s.closest('[aria-hidden="true"]') !== null || s.getAttribute('aria-hidden') === 'true'));
      assert.ok(sw.length === 0 || sw.every(Boolean), `${tier} swatch aria-hidden`);
    }
    const legendSw = await page.evaluate(() => { const A = window.__ac; const svgs = [...document.querySelectorAll('article svg')].filter((s) => s.querySelector('[stroke-dasharray]') && !s.closest('figure') && s !== A.lanesSvg() && !s.closest('[data-tick]')); return svgs.map((s) => s.getAttribute('aria-hidden') === 'true' || !!s.closest('[aria-hidden="true"]')); });
    assert.ok(legendSw.every(Boolean), 'TierLegend swatches aria-hidden');
  });
});

test('AC-70 — Keep the DOM order the reader hears', async (t) => {
  if (!requireFull(t)) return;
  for (const kind of ['desktop', 'phone']) {
    await withPage(kind, async (page) => {
      await go(page);
      const r = await page.evaluate(() => {
        const A = window.__ac;
        const seq = [['FilterBar', document.querySelector('input[type="search"]')], ['skip link', document.querySelector('a[href="#stage-tables"]')], ['figure', A.figure()], ['margin', A.margin()], ['TimeLanes', A.lanesSvg()], ['C1', document.querySelector('[data-caption="C1"]')], ['#stage-tables', document.querySelector('#stage-tables')]];
        const missing = seq.filter(([, e]) => !e).map(([n]) => n);
        const bad = [];
        for (let i = 1; i < seq.length; i++) if (seq[i - 1][1] && seq[i][1] && !A.precedes(seq[i - 1][1], seq[i][1])) bad.push(`${seq[i - 1][0]} !< ${seq[i][0]}`);
        return { missing, bad };
      });
      assert.deepEqual(r.missing, [], `${kind}: all landmarks present`); assert.deepEqual(r.bad, [], `${kind}: DOM order`);
    });
  }
});

test('AC-71 — Caption or label every table', async (t) => {
  if (!requireFull(t)) return;
  await withPage('desktop', async (page) => {
    await go(page, '?view=table');
    const r = await page.evaluate(() => {
      const A = window.__ac; const bad = [];
      for (const tb of document.querySelectorAll('article table')) {
        const cap = A.txt(tb.querySelector('caption')); const region = tb.closest('[role="region"][aria-label]');
        if (!cap && !region) bad.push('table without caption or labelled region');
        for (const th of tb.querySelectorAll('th')) if (!A.txt(th)) bad.push('empty th');
      }
      const neg = [...document.querySelectorAll('details > summary')].filter((s) => s.tabIndex < 0).length;
      return { bad, neg, tables: document.querySelectorAll('article table').length };
    });
    // A full build renders its twins as tables; "every table" over none would be vacuous.
    assert.ok(r.tables > 0, 'the table view renders at least one table');
    assert.deepEqual(r.bad, []); assert.equal(r.neg, 0, 'no summary with tabindex -1');
  });
});

// =====================================================================
// 9. Mobile at 390 px — FULL build
// =====================================================================

const noSideScroll = (page) => page.evaluate(async () => {
  window.scrollTo(0, document.documentElement.scrollHeight); await new Promise((r) => requestAnimationFrame(r));
  window.scrollTo(0, 0); await new Promise((r) => requestAnimationFrame(r));
  const w = window.innerWidth; const bad = [];
  if (document.documentElement.scrollWidth > w) bad.push(`documentElement ${document.documentElement.scrollWidth} > ${w}`);
  if (document.body.scrollWidth > w) bad.push(`body ${document.body.scrollWidth} > ${w}`);
  for (const el of document.querySelectorAll('*')) {
    const o = getComputedStyle(el).overflowX;
    if ((o === 'auto' || o === 'scroll') && el.scrollWidth > el.clientWidth) {
      if (el === document.body || el.matches('article')) bad.push(`${el.tagName} scrolls sideways`);
      else if (!el.querySelector('table') && !el.querySelector('svg') && !el.querySelector('button')) bad.push(`non-table scroller <${el.tagName.toLowerCase()} class="${el.className}">`);
    }
  }
  return bad;
});

test('AC-72 — Scroll the page vertically only', async (t) => {
  if (!requireFull(t) || !need(t, 'Y_WITH_BALLOTS', 'STATE_WITH_VALUE', 'SCHEME_ID', 'PARTY', 'STATE_NONE')) return;
  await withPage('phone', async (page) => {
    for (const search of ['', `?y=${F.Y_WITH_BALLOTS}&m=share&st=${F.STATE_WITH_VALUE}`, `?s=${F.SCHEME_ID}`, '?view=table', `?party=${encodeURIComponent(F.PARTY)}&y=${F.Y_WITH_BALLOTS}`, `?st=${F.STATE_NONE}`]) {
      await go(page, search);
      assert.deepEqual(await noSideScroll(page), [], `at ${search || '/'}`);
    }
  });
});

test('AC-73 — Collapse the filters into a labelled details block', async (t) => {
  if (!requireFull(t)) return;
  await withPage('phone', async (page) => {
    await go(page);
    const r = await page.evaluate(() => {
      const A = window.__ac; const sum = [...document.querySelectorAll('details > summary')].find((s) => /^Filters \(\d+\) · \d+ → \d+ schemes$/.test(A.txt(s)));
      const d = sum?.parentElement; const selects = d ? [...d.querySelectorAll('select')] : [];
      const metric = selects.find((s) => [...s.options].some((o) => /Schemes live/.test(o.textContent))); const level = selects.find((s) => [...s.options].some((o) => o.textContent.trim() === 'All'));
      const unavailable = metric ? [...metric.options].filter((o) => o.disabled || o.getAttribute('aria-disabled') === 'true').map((o) => o.textContent) : [];
      const chip = A.chips()[0]; const box = chip && A.scrollBox(chip);
      return { found: !!sum, metric: !!metric, level: !!level, unavailable, chipRow: !!box && box !== document.body };
    });
    assert.ok(r.found, 'Filters details summary'); assert.ok(r.metric && r.level, 'Metric and Level are <select>');
    assert.ok(r.unavailable.length === 0 || r.unavailable.every((o) => /unavailable: choose a year/.test(o)), `unavailable options carry the reason: ${r.unavailable}`);
    assert.ok(r.chipRow, 'chips in an overflow-x-auto row');
    assert.deepEqual(await noSideScroll(page), []);
  });
});

test('AC-74 — Pin one scrubber above the map within the 140 px budget', async (t) => {
  if (!requireFull(t)) return;
  await withPage('phone', async (page) => {
    await go(page);
    const r = await page.evaluate(() => {
      const stack = document.querySelector('[data-pinned-stack]');
      const ranges = [...document.querySelectorAll('input[type="range"][aria-label="Year"]')];
      const visible = ranges.filter((i) => i.getAttribute('aria-hidden') !== 'true' && !i.closest('[aria-hidden="true"]'));
      return { h: stack?.getBoundingClientRect().height ?? null, ranges: ranges.length, visible: visible.length, rh: visible[0]?.getBoundingClientRect().height ?? 0, vt: visible[0]?.getAttribute('aria-valuetext') ?? '' };
    });
    assert.ok(r.h !== null && r.h <= 140, `pinned stack height ${r.h}`);
    assert.equal(r.visible, 1, `exactly one non-hidden Year range (of ${r.ranges})`);
    assert.ok(r.rh >= 44, `pinned range height ${r.rh}`); assert.match(r.vt, /^All years, 2000 to \d{4}$/);
  });
});

test('AC-75 — Open the state panel directly under the map on tap, readout first', async (t) => {
  if (!requireFull(t) || !need(t, 'STATE_WITH_VALUE')) return;
  await withPage('phone', async (page) => {
    await go(page);
    const box = await page.evaluate((name) => { const p = [...document.querySelectorAll('path[data-fill-class]')].find((x) => (x.querySelector('title')?.textContent ?? '').includes(name) || x.dataset.st === name || (x.getAttribute('aria-label') ?? '').includes(name)); if (!p) return null; p.scrollIntoView({ block: 'center' }); const r = p.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, F.STATE_WITH_VALUE_NAME);
    assert.ok(box, `path for ${F.STATE_WITH_VALUE_NAME} located by its title`);
    await page.touchscreen.tap(box.x, box.y);
    await page.waitForFunction(() => window.__ac.urlParams().has('st'), null, { timeout: 3000 });
    await page.waitForTimeout(SETTLE);
    const r = await page.evaluate((name) => {
      const A = window.__ac; const panel = A.panel(); const fig = A.figure(); const lanes = A.lanesSvg()?.parentElement; const stack = document.querySelector('[data-pinned-stack]');
      const pr = panel.getBoundingClientRect(); const hr = panel.querySelector('h2').getBoundingClientRect();
      const lines = A.lines(panel);
      return { top: pr.top, figBottom: fig.getBoundingClientRect().bottom, lanesTop: lanes?.getBoundingClientRect().top, hTop: hr.top, stackBottom: stack?.getBoundingClientRect().bottom ?? 0, first: lines[0] ?? '', second: lines[1] ?? '', name };
    }, F.STATE_WITH_VALUE_NAME);
    assert.ok(r.top >= r.figBottom - 1 && r.top < r.lanesTop, `panel between figure (${r.figBottom}) and lanes (${r.lanesTop}): ${r.top}`);
    assert.ok(r.hTop >= r.stackBottom && r.hTop < 844, `header top ${r.hTop} within viewport under the stack (${r.stackBottom})`);
    assert.ok(r.first.startsWith(r.name) || r.second.startsWith(r.name), `readout first: "${r.first}" / "${r.second}"`);
  });
});

test('AC-76 — Scroll the clock inside its own box, opened on the latest years', async (t) => {
  if (!requireFull(t)) return;
  await withPage('phone', async (page) => {
    await go(page);
    const r = await page.evaluate(() => {
      const A = window.__ac; const svg = A.lanesSvg(); const box = svg && A.scrollBox(svg);
      const last = svg && [...svg.querySelectorAll('text')].find((x) => /^2026/.test(x.textContent.trim()));
      const showing = A.deepest(document.body, '^showing \\d{4}–\\d{4}$');
      return { hasBox: !!box, scroll: box ? box.scrollWidth > box.clientWidth : false, minW: svg ? parseFloat(getComputedStyle(svg).minWidth) : 0, lastRight: last?.getBoundingClientRect().right, boxRight: box?.getBoundingClientRect().right, showing: A.txt(showing), showingMono: showing ? /mono/i.test(getComputedStyle(showing).fontFamily) : false, cw: box?.clientWidth, sl: box?.scrollLeft };
    });
    assert.ok(r.hasBox && r.scroll, 'lanes container scrolls horizontally'); assert.ok(r.minW >= 580, `svg min-width ${r.minW}`);
    assert.ok(r.lastRight <= r.boxRight + 1, `2026 label right ${r.lastRight} within box ${r.boxRight}`);
    assert.match(r.showing, /^showing \d{4}–\d{4}$/); assert.ok(r.showingMono, 'showing line is mono');
    const later = page.getByRole('button', { name: 'later years ›' }); const earlier = page.getByRole('button', { name: '‹ earlier years' });
    assert.ok(await later.count() && await earlier.count(), 'earlier/later buttons');
    await earlier.first().click(); await page.waitForTimeout(SETTLE);
    const after = await page.evaluate(() => { const A = window.__ac; const box = A.scrollBox(A.lanesSvg()); return { sl: box.scrollLeft, cw: box.clientWidth }; });
    assert.ok(Math.abs((r.sl - after.sl) - r.cw) <= 8, `scrollLeft moved by ${r.sl - after.sl}, clientWidth ${r.cw}`);
    await page.locator('input[type="range"][aria-label="Year"]:not([aria-hidden="true"])').first().fill('2003');
    await page.waitForFunction(() => window.__ac.urlParams().get('y') === '2003', null, { timeout: 3000 });
    await page.waitForTimeout(SETTLE);
    const col = await page.evaluate(() => { const A = window.__ac; const svg = A.lanesSvg(); const box = A.scrollBox(svg); const lbl = [...svg.querySelectorAll('text')].find((x) => x.textContent.trim().startsWith('2003')); const r = lbl?.getBoundingClientRect(); const b = box.getBoundingClientRect(); return r ? r.left >= b.left - 1 && r.right <= b.right + 1 : null; });
    assert.ok(col, '2003 column within the visible box');
  });
});

test('AC-77 — Scroll each table in its own region, with a column count', async (t) => {
  if (!requireFull(t)) return;
  await withPage('phone', async (page) => {
    await go(page, '?view=table');
    const r = await page.evaluate(() => {
      const A = window.__ac; const bad = [];
      for (const tb of document.querySelectorAll('article table')) {
        const region = tb.closest('[role="region"][aria-label]');
        if (!region) { bad.push('table outside a labelled region'); continue; }
        const cap = A.txt(tb.querySelector('caption')) || A.lines(region.parentElement).find((l) => /rows · filters:/.test(l));
        if (region.getAttribute('aria-label') !== cap) bad.push(`region label "${region.getAttribute('aria-label')}" ≠ caption "${cap}"`);
        if (!['auto', 'scroll'].includes(getComputedStyle(region).overflowX)) bad.push('region not overflow-x auto');
        let above = region.previousElementSibling; let ok = false;
        for (let i = 0; above && i < 3; i++, above = above.previousElementSibling) if (/^\d+ columns · scroll → for the rest$/.test(A.txt(above)) && /mono/i.test(getComputedStyle(above).fontFamily)) ok = true;
        if (!ok) bad.push('no mono column-count line above the region');
      }
      const ctl = document.querySelector('#control'); const allParties = A.deepest(ctl, '^All parties');
      const blocks = allParties ? A.deepestAll(ctl, '^.+: \\d+ of \\d+').length : 0;
      return { bad, allParties: !!allParties, blocks, firstIsAll: allParties && !A.deepestAll(ctl, '^.+: \\d+ of \\d+').some((e) => A.precedes(e, allParties)) };
    });
    assert.deepEqual(r.bad, []);
    assert.ok(r.allParties && r.blocks > 0 && r.firstIsAll, 'by-party stacked blocks with All parties first');
  });
});

test('AC-78 — Keep mono text at or above 12 px, and move strip facts rather than hide them', async (t) => {
  if (!requireFull(t)) return;
  await withPage('phone', async (page) => {
    await go(page);
    const r = await page.evaluate(() => {
      const A = window.__ac; const small = [];
      for (const el of document.querySelectorAll('article *')) {
        if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
        const cs = getComputedStyle(el); if (/mono/i.test(cs.fontFamily) && parseFloat(cs.fontSize) < 12) small.push(`${cs.fontSize} "${A.txt(el).slice(0, 30)}"`);
      }
      const strip = A.strip(); const facts = [...strip.querySelectorAll('span')].map((s) => A.txt(s)).filter((s) => /^\d[\d,]* of \d[\d,]* /.test(s)).length;
      const art = A.txt(document.querySelector('article'));
      const lanes = A.lanesSvg(); const nine = lanes ? [...lanes.querySelectorAll('text')].filter((x) => parseFloat(getComputedStyle(x).fontSize) < 12).length : 0;
      const byline = A.byline(); const under = byline ? A.txt(byline.parentElement) : '';
      return { small, facts, art, nine, under };
    });
    assert.deepEqual(r.small, [], 'mono text ≥ 12px');
    assert.ok(r.facts <= 3, `strip shows ${r.facts} facts`);
    assert.ok(r.art.includes('outlay rows with an actual') && r.art.includes('allegations with a response on record'), 'moved facts still in article');
    assert.equal(r.nine, 0, 'no 9px lane amount labels');
    assert.match(r.art, /amount labels .* (omitted|in the scheme card)/);
  });
});

test('AC-79 — Make ballots legible and the filter clause visible on a phone', async (t) => {
  if (!requireFull(t) || !need(t, 'Y_WITH_BALLOTS', 'PARTY')) return;
  await withPage('phone', async (page) => {
    await go(page, `?y=${F.Y_WITH_BALLOTS}`);
    const r = await page.evaluate(() => {
      const shapes = [...document.querySelectorAll('[data-ballot] rect, [data-ballot] path')].map((e) => e.getBoundingClientRect());
      const lids = [...document.querySelectorAll('[data-ballot][data-lid="true"]')].map((g) => Math.max(...[...g.querySelectorAll('rect, path, line')].map((e) => e.getBoundingClientRect().height)));
      return { n: shapes.length, small: shapes.filter((b) => b.width < 9 || b.height < 9).length, lids, thin: lids.filter((h) => h < 2).length };
    });
    assert.ok(r.n > 0, 'ballot shapes'); assert.equal(r.small, 0, 'every ballot shape ≥ 9px');
    assert.equal(r.thin, 0, 'every lid ≥ 2px');
    await go(page, `?party=${encodeURIComponent(F.PARTY)}&y=${F.Y_WITH_BALLOTS}`);
    const clause = page.locator('figure figcaption li', { hasText: 'filters:' }).first();
    assert.ok(await clause.isVisible(), 'filters clause visible');
    const r2 = await page.evaluate(() => {
      const A = window.__ac; const sum = [...document.querySelectorAll('details > summary')].find((s) => /^Filters \(/.test(A.txt(s)));
      const cap = document.querySelector('figure figcaption'); let list = cap?.nextElementSibling; while (list && !list.matches('ul, ol') && !list.querySelector('ul, ol')) list = list.nextElementSibling;
      const items = list ? [...(list.matches('ul, ol') ? list : list.querySelector('ul, ol')).querySelectorAll('li')] : [];
      return { closed: sum ? !sum.parentElement.open : false, items: items.map((li) => ({ text: A.txt(li), cite: !!li.querySelector('a[href^="http"]') })) };
    });
    assert.ok(r2.closed, 'Filters details closed');
    assert.ok(r2.items.length > 0, 'election list under the figcaption');
    for (const it of r2.items) { assert.ok(it.cite || it.text.includes('no source in file'), it.text); assert.match(it.text, /→/); }
  });
});

test('AC-80 — Explain the empty state before any number on a phone (EMPTY build)', async (t) => {
  if (!requireEmpty(t)) return;
  await withPage('phone', async (page) => {
    await go(page);
    const len = await page.evaluate(() => document.body.innerText.length); assert.ok(len >= 200);
    assert.equal(await count(page, 'text=Register not yet promoted'), 1);
    const r = await page.evaluate(() => {
      const A = window.__ac; const callout = A.deepest(document.body, 'Register not yet promoted'); const byline = A.byline();
      const cb = callout.getBoundingClientRect().top; const bb = byline?.getBoundingClientRect().top ?? -1;
      const art = document.querySelector('article');
      const numbered = [...art.querySelectorAll('*')].filter((e) => e.children.length === 0 && /\d/.test(A.txt(e)) && e.getBoundingClientRect().top > cb && A.precedes(callout, e) && !callout.contains(e) && e.getClientRects().length);
      return { cb, bb, first: A.txt(numbered[0]), inStrip: !!numbered[0]?.closest('.sticky.top-0'), byline: A.txt(byline), strip: A.txt(A.strip()) };
    });
    assert.ok(r.cb < r.bb, 'callout above the byline');
    assert.ok(r.byline.includes('register not yet promoted · nothing below is zero') && r.strip.includes('0 schemes'), 'AC-03 wording');
    assert.ok(r.inStrip && r.first.includes('0 schemes'), `first number-bearing line is the strip's 0 schemes: "${r.first}"`);
    assert.deepEqual(await noSideScroll(page), []);
  });
});

// =====================================================================
// 10. Frozen channels, fold and house rules — FULL build
// =====================================================================

test('AC-81 — Keep the scrubber in the first viewport at 1280×800', async (t) => {
  if (!requireFull(t)) return;
  await withPage('fold', async (page) => {
    await go(page);
    const r = await page.evaluate(() => { const i = document.querySelector('input[type="range"][aria-label="Year"]'); const fig = window.__ac.figure(); return { scrollY: window.scrollY, bottom: i?.parentElement.getBoundingClientRect().bottom, figH: fig?.getBoundingClientRect().height }; });
    assert.equal(r.scrollY, 0); assert.ok(r.bottom !== undefined && r.bottom <= 800, `scrubber row bottom ${r.bottom}`);
    assert.ok(r.figH >= 420 && r.figH <= 620, `figure height ${r.figH}`);
  });
});

test('AC-82 — Dash only for tier, and one analytic edge', async (t) => {
  if (!requireFull(t) || !need(t, 'Y_WITH_BALLOTS')) return;
  await withPage('desktop', async (page) => {
    await go(page, `?y=${F.Y_WITH_BALLOTS}`);
    const r = await page.evaluate(() => {
      const A = window.__ac; const text = A.tokenColor('--color-text'); const muted = A.tokenColor('--color-muted');
      const svgs = [A.mapSvg(), A.lanesSvg()].filter(Boolean); const bad = [];
      for (const svg of svgs) for (const el of svg.querySelectorAll('*')) {
        const da = el.getAttribute('stroke-dasharray') ?? getComputedStyle(el).strokeDasharray;
        if (!da || da === 'none' || da === '0') continue;
        const norm = da.replace(/px|,/g, ' ').replace(/\s+/g, ' ').trim();
        if (norm === '8 3 2 3') continue;
        if (el.closest('[data-ballot]') || el.matches('path[data-fill-class]') || el.closest('[data-lane-bar], [data-bar]')) bad.push(`dash on ${el.tagName} (${norm})`);
        else bad.push(`dash outside the analytic edge: ${el.tagName} (${norm})`);
      }
      const strokes = [...document.querySelectorAll('[data-ballot]')].map((g) => { const el = g.querySelector('rect, path') ?? g; const s = getComputedStyle(el).stroke; return { s, muted: g.dataset.muted === 'true' }; });
      const badStroke = strokes.filter((x) => (x.muted ? x.s !== muted : x.s !== text)).map((x) => x.s);
      return { bad, badStroke, n: strokes.length };
    });
    assert.deepEqual(r.bad, []);
    assert.ok(r.n > 0); assert.deepEqual(r.badStroke, [], 'ballot stroke is the text token or the muted token');
  });
});

test('AC-83 — Keep the five fills distinct and never transition them', async (t) => {
  if (!requireFull(t)) return;
  await withPage('desktop', async (page) => {
    await go(page);
    const r = await page.evaluate(() => {
      const A = window.__ac; const svg = A.mapSvg();
      const fillOf = (c) => svg.querySelector(`path[data-fill-class="${c}"]`)?.getAttribute('fill') ?? null;
      const patChildren = (f) => { const id = f?.match(/^url\(#([^)]+)\)/)?.[1]; const p = id && document.getElementById(id); return p ? [...new Set([...p.children].map((x) => x.tagName))].join(',') : null; };
      const hatch = [...svg.querySelectorAll('pattern')].map((p) => `url(#${p.id})`).find((u) => u.startsWith('url(#nodata-')) ?? fillOf('hatch');
      const stipple = [...svg.querySelectorAll('pattern')].filter((p) => p.querySelector('circle')).map((p) => `url(#${p.id})`)[0] ?? fillOf('stipple');
      const zero = '#15171c';
      const values = [...svg.querySelectorAll('path[data-fill-class="value"]')].map((p) => p.getAttribute('fill'));
      const darkest = values.map((v) => { const m = v?.match(/^#([0-9a-f]{6})$/i); return m ? { v, l: parseInt(m[1].slice(0, 2), 16) + parseInt(m[1].slice(2, 4), 16) + parseInt(m[1].slice(4, 6), 16) } : { v, l: Infinity }; }).sort((a, b) => a.l - b.l)[0]?.v ?? null;
      const bg = A.tokenColor('--color-bg');
      const transitions = [...svg.querySelectorAll('path[data-fill-class]')].filter((p) => /\bfill\b|\ball\b/.test(getComputedStyle(p).transitionProperty)).length;
      return { hatch, stipple, zero, darkest, bg, hatchKids: patChildren(hatch), stippleKids: patChildren(stipple), transitions };
    });
    const five = [r.hatch, r.stipple, r.zero, r.darkest, r.bg];
    assert.ok(five.every(Boolean), `all five fills declared: ${five}`);
    assert.equal(new Set(five).size, 5, `five distinct fills: ${five}`);
    assert.ok(r.hatchKids && r.stippleKids && r.hatchKids !== r.stippleKids, `pattern children differ: ${r.hatchKids} vs ${r.stippleKids}`);
    assert.equal(r.transitions, 0, 'no fill transition');
    if (SHOTS) {
      for (const w of [360, 1280]) {
        await page.setViewportSize({ width: w, height: 900 });
        await page.addStyleTag({ content: 'html { filter: grayscale(1) !important; }' });
        const legend = await page.evaluateHandle(() => window.__ac.legend());
        await legend.asElement()?.screenshot({ path: join(SHOTS, `welfare-legend-${w}-grey.png`) });
      }
    }
  });
});

test('AC-84 — Label every page-computed figure, and source none of them', async (t) => {
  if (!requireFull(t) || !need(t, 'SCHEME_ID')) return;
  await withPage('desktop', async (page) => {
    await go(page);
    let r = await page.evaluate(() => {
      const A = window.__ac; const bad = [];
      for (const el of A.deepestAll(document.querySelector('article'), 'computed here|analytic')) {
        const row = el.closest('td, li, tr, dd, p') ?? el;
        if ([...row.children].some((c) => c.matches('a[href^="http"]'))) bad.push(A.txt(row).slice(0, 60));
      }
      const th = [...document.querySelectorAll('th')].some((h) => A.txt(h) === 'Uniform expectation (analytic)');
      const analyticText = A.txt(document.querySelector('article')).includes('(analytic)');
      return { bad, th, analyticText };
    });
    assert.deepEqual(r.bad, [], 'no Cite beside a computed figure');
    assert.ok(r.th, 'twin column Uniform expectation (analytic)'); assert.ok(r.analyticText);
    await go(page, `?s=${F.SCHEME_ID}`);
    r = await page.evaluate(() => {
      const A = window.__ac; const card = A.panel(); const rows = card ? [...card.querySelectorAll('tr, li, dd, p')].filter((e) => /\/ yr ×12/.test(A.txt(e))) : [];
      return rows.map((e) => ({ computed: A.txt(e).includes('computed here'), cite: !!e.querySelector('a[href^="http"]') }));
    });
    for (const row of r) { assert.ok(row.computed, 'per-year row says computed here'); assert.ok(row.cite, 'Cite sits with the recorded amount'); }
  });
});

test('AC-85 — Use British spelling in prose and no motion', async (t) => {
  if (!requireFull(t)) return;
  await withPage('desktop', async (page) => {
    await go(page);
    const r = await page.evaluate(() => {
      const art = document.querySelector('article').cloneNode(true);
      for (const e of art.querySelectorAll('code, a[href^="http"], q, blockquote, [data-quote]')) e.remove();
      const text = art.textContent;
      const hits = [...text.matchAll(/\b(color|center|organiz\w*|favor|analyz\w*|program(?!me)\b)/g)].map((m) => m[0]);
      const anim = [...document.querySelectorAll('figure *, svg *, [data-lane]')].filter((e) => { const a = getComputedStyle(e).animationName; return a && a !== 'none'; }).length;
      return { hits: [...new Set(hits)], anim };
    });
    assert.deepEqual(r.hits, [], 'no American spellings');
    assert.equal(r.anim, 0, 'no animation in the stage');
    assert.equal(await page.getByRole('button', { name: /play/i }).count(), 0, 'no autoplay control');
  });
});
