#!/usr/bin/env node
/**
 * /tenders?section=national — acceptance tests, one per criterion in
 * docs/design/TENDERS-NATIONAL_ACCEPTANCE.md (AC-01 … AC-86), named by AC id.
 *
 * Runs with `node --test scripts/pages/tenders.test.mjs` against the built `dist`
 * (and a scaffold build without research/raw/cppp/ that this file assembles itself
 * when it is missing or stale). Nothing here reads the page's source: every
 * expectation is the acceptance document's, and every id, label, name or count is
 * derived at test time from research/raw/cppp/*.json, exactly as the document's
 * "Fixtures" section says. A criterion whose record does not exist in the data
 * under test ends in `SKIPPED: <reason>`, never in a pass.
 *
 * Why a test per criterion rather than a few broad ones: each criterion is the RED
 * test for the build step that owns it, so a developer needs to see which criterion
 * fails, not that "tenders fails".
 *
 * Why the dist server is owned here (copied from scripts/smoke.mjs): a separately
 * started preview server makes the test fail for reasons that have nothing to do
 * with the page. `TENDERS_DIST=<dir>` pins the suite to one copy of a build so a
 * concurrent `npm run build` cannot swap assets mid-run.
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import {
  existsSync, readFileSync, readdirSync, mkdtempSync, cpSync, rmSync, symlinkSync, statSync,
} from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, extname, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// ---------------------------------------------------------------------------
// Constants the acceptance document fixes
// ---------------------------------------------------------------------------

/** Settle after networkidle. The task caps this at 700ms; everything else waits on selectors. */
const SETTLE = 700;
const TEST_TIMEOUT = 300_000;
/** Playwright's per-action wait; long enough for a React commit, short enough to fail a missing section fast. */
const ACTION_TIMEOUT = 5_000;

const ROUTE = '/tenders';
const NATIONAL = `${ROUTE}?section=national`;

const H1 = 'The procurement register, and what it cannot tell you';
const H2_TEXT = 'The CPPP award scrape — a different dataset from the registers below';
const KICKER = 'National · CPPP award scrape';
const ABSENT = 'CPPP pipeline outputs not present in this build';
const TIER_CLAUSE = "the portal is the primary record; this scrape's agreement with it is unknown (see verification)";
const TIER_LINE = 'tier: reported (dataset-only; portal agreement unknown)';
const TIER_WORDS = ['Documented', 'Reported', 'Alleged', 'Analytic'];
const RATES_CAPTION_1 = "No change of government is marked. The scrape's composition by year (which bodies, which states, which tender types) is not constant, and the two portals are not the same population; a difference between the lines or a slope within one is a fact about the scrape before it is a fact about procurement.";
const RATES_CAPTION_2 = "The interval covers sampling variation only. It does not cover the scrape's agreement with the portal, which is unknown (verification).";
const BINS_CAPTION = 'Bins are unequal widths; bar heights are counts, not densities.';
const STATES_CAPTION = "The state portal is not India's states. It is the states and UTs whose bodies publish on one portal.";
/**
 * What a state with no n ≥ 30 buyer may be called. [Adjudicated] `rates.byOrganisation` is
 * thresholded at n ≥ 30, so missing from it is not missing from the portal: the absence
 * claim is printed only when `quality.organisations.statePortalNames` is emitted and gives
 * the name no rows; otherwise the row says the state may still sit in the pooled row.
 */
const UNLISTED_STATE = 'no buyer with n ≥ 30 on the state portal in this scrape; smaller buyers are pooled, so the state may still appear there; absence here is coverage, not conduct';
const ABSENT_STATE_KNOWN = 'not present on the state portal in this scrape; absence here is coverage, not conduct';
const pooledState = (rows) => `on the state portal (${rows} raw rows), but no buyer with n ≥ 30; its buyers sit in the pooled row`;
/** The `state=` filter sentence for a value no emitted key matches, by the same rule. */
const unmatchedStateSentence = (v, known) => (known
  ? `“${v}” does not appear on the state portal in this scrape; absence here is coverage, not conduct`
  : `“${v}” has no buyer with n ≥ 30 on the state portal in this scrape; smaller buyers are pooled, so it may still appear there; absence here is coverage, not conduct`);
const NOT_ASKED_TABLE = "No body listed here has been asked for comment. That is a weakness of this table, not a neutral fact. Each figure is a rate over the body's own awards, not a finding about it.";
const SAMPLE_LEAD = 'The portal answered “Invalid Url” to every stored link; the finding below gives the reason it appears to be a validity window on the link token. Nothing was checked, and nothing was contradicted.';
const NOTHING_CONTRADICTED = 'Nothing was checked, and nothing was contradicted.';
const AGREEMENT_CAPTION = 'Agreement with the portal is unknown, not zero.';
const NOT_ASKED_PARTIES = "The portal's operator and the dataset's publisher were not asked about link validity.";
const UPGRADE = 'a fresh sample from a scrape whose links resolve, meeting the agreement threshold stated in the finding.';
const HOW_TO_CHECK = "tender_id and buyer are enough for a manual search of the portal's Results of Tenders page, which sits behind an image captcha; scripts/cppp/build.py re-derives every number from the named dataset.";
const NO_COMPARATOR = 'No external comparator is shown. EU and OECD single-bidding shares are computed over above-threshold contracts with different tender-type mixes and are not comparable to this denominator; the comparison offered is the scrape against itself, by portal, type and value band.';
const ORIGIN_MISSING = 'Dataset origin not yet in provenance.json (recorded in scripts/cppp/README.md)';
const MS_MISSING = 'Some names shown are admitted by “M/s” alone and may be trading names of individuals; the count is recorded in scripts/cppp/README.md and is not yet a field.';
const MOSTLY_UNMARKED = 'most winners here are unnamed; the HHI covers the marked minority';
const THIN_NOTE = 'thin coverage: interval shown, slope not to be read';
const LIMITED_NOTE = "The state portal's tender_type field carries almost no Limited labels; its rate is a fact about the field before it is a fact about tendering.";
const NO_COMMENT_GAP = 'no body named in this section was asked for comment';
const SCRAPE_DATE_MISSING = 'scrape date not yet a field';
const SCRAPE_DATE_STRIP = 'scrape date not yet a field (see verification finding)';
const LEGEND_ROW = 'page gone: the stored link returned the portal\'s “Invalid Url” page; the field could not be checked';

/** Indicator key → h4 text (AC-08). An unmapped key renders as its raw key inside <code>. */
const INDICATOR_H4 = {
  singleBidding: 'Single bidding',
  nonOpenTenderType: 'Non-open tender type (Limited)',
  shortDecisionWindow: 'Short decision window (two days or fewer)',
  repeatSingleBidderMarkedWinners: 'Repeat single-bidder pairs (marked winners)',
};

const RATES_TWIN_HEADERS = [
  'AOC year', 'n', "share of the portal's plotted n", 'single-bidder awards', 'single-bidder %',
  '95% interval (Wilson), %', 'interval width, points', 'mean bids', 'median bids', 'flag',
];
const BUYERS_HEADERS = ['portal', 'buyer', 'awards in denominator', 'single-bidder awards', 'single-bidder %', '95% interval', 'response'];
const HIST_HEADERS = ['bin', 'width in days', 'n', 'share'];
const FYMONTH_HEADERS = ['FY month', 'calendar month', 'n', '%', 'central', 'state', 'note'];
const QUALITY_HEADERS = ['count', 'what is counted', 'base', 'share of base'];
const NOT_PLOTTED_REASONS = ['out-of-range year', 'after the scrape year', 'n < 30'];
const TWINS = ['quality', 'families', 'rates-central', 'rates-state', 'composition', 'states', 'bands', 'types', 'hist', 'fymonth', 'buyers', 'tenths', 'concentration', 'agreement', 'sample', 'provenance'];
const PREREQ_FIELDS = ['provenance.dataset', 'provenance.scrapedAt', 'winnerMarkers.msOnlyNamed', 'redflags.singleBiddingByBuyerFamily', 'rates.byPortalTenderType'];

// ---------------------------------------------------------------------------
// Fixtures — derived from research/raw/cppp/*.json, never hard-coded
// ---------------------------------------------------------------------------

const RAW = join(root, 'research/raw/cppp');
if (!existsSync(RAW)) throw new Error(`${RAW} missing — the criteria derive every handle from the pipeline outputs`);
const rawFiles = readdirSync(RAW).filter((f) => f.endsWith('.json')).sort();
const raw = Object.fromEntries(rawFiles.map((f) => [f.replace(/\.json$/, ''), JSON.parse(readFileSync(join(RAW, f), 'utf8'))]));
const { provenance, rates, redflags, concentration, timing, quality } = raw;
const sample = raw['sample-verification'];
for (const [k, v] of Object.entries({ provenance, rates, redflags, concentration, timing, quality, sample })) {
  if (!v) throw new Error(`research/raw/cppp/${k}.json missing — cannot derive fixtures`);
}
const STATES = JSON.parse(readFileSync(join(root, 'src/data/india-states.json'), 'utf8')).states.map((s) => s.name);

const P = provenance.provenance;
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const yearsOf = (p) => rates.byPortalYear.filter((r) => r.portal === p);
const numericYear = (y) => /^\d{4}$/.test(String(y));

const FIX = {
  rows: P.rows, tids: P.distinctTenderIds, dedup: P.afterDedupRows,
  asOf: P.asOf, gen: P.generatedBy,
  digests: P.inputs.map((i) => i.sha256_16),
  inputs: P.inputs,
  dedupRule: P.dedupRule,
  dataset: P.dataset ?? null,
  scrapedAt: P.scrapedAt ?? null,
  caveat: rates.caveat,
  denomN: rates.denominatorN, denomText: rates.denominator, excl: rates.excludedFromDenominator.bidsNullOrZeroOrOver1000,
  years: { central: yearsOf('central'), state: yearsOf('state') },
  ind: Object.fromEntries(redflags.indicators.map((i) => [i.indicator, i])),
  indList: redflags.indicators,
  buyers25: redflags.singleBiddingByBuyer,
  byOrg: rates.byOrganisation,
  states: STATES,
  conc: concentration.byBuyer,
  markerRegex: P.markerRegex,
  timing, quality, sample,
};
FIX.unparsed25 = FIX.buyers25.filter((b) => b.buyer.endsWith('/ unparsed'));
FIX.pooled = FIX.byOrg.find((r) => r.key.startsWith('pooled')) ?? null;
FIX.stateKeys = [...new Set(FIX.byOrg.filter((r) => r.portal === 'state').map((r) => r.key.split(' / ')[0]))];
FIX.nullHhi = FIX.conc.filter((b) => b.hhiMarkedValue === null || b.hhiMarkedCount === null);
FIX.mostlyUnmarked = FIX.conc.filter((b) => b.unmarkedShareOfAwardsPct >= 50);
FIX.winners = new Set(FIX.conc.flatMap((b) => (b.topMarkedWinners ?? []).map((w) => w.name)));
FIX.matchSum = Object.values(sample.agreement).reduce((s, a) => s + a.match, 0);
FIX.fetchDates = [...new Set(sample.rows.map((r) => r.fetch.fetchedAt.slice(0, 10)))];
FIX.fetchDate = FIX.fetchDates[0];
/**
 * [Fixed here] in the document: the scrape year is scrapedAt's year when the field
 * exists, else the largest numeric year in byPortalYear with n ≥ 30 that is ≤ asOf's year.
 */
FIX.scrapeYear = FIX.scrapedAt?.value
  ? Number(String(FIX.scrapedAt.value).slice(0, 4))
  : Math.max(...rates.byPortalYear.filter((r) => numericYear(r.year) && r.n >= 30 && Number(r.year) <= Number(FIX.asOf.slice(0, 4))).map((r) => Number(r.year)));
FIX.notPlotted = {}; FIX.plotted = {}; FIX.hatchYears = {}; FIX.thin = {};
for (const p of ['central', 'state']) {
  FIX.notPlotted[p] = FIX.years[p].filter((r) => !numericYear(r.year) || Number(r.year) > FIX.scrapeYear || r.n < 30);
  FIX.plotted[p] = FIX.years[p].filter((r) => !FIX.notPlotted[p].includes(r));
  FIX.hatchYears[p] = FIX.notPlotted[p].filter((r) => numericYear(r.year) && Number(r.year) <= FIX.scrapeYear && r.n < 30);
  const half = median(FIX.plotted[p].map((r) => r.n)) / 2;
  FIX.thin[p] = FIX.plotted[p].filter((r) => r.n < half);
}
FIX.notPlottedTotal = FIX.notPlotted.central.length + FIX.notPlotted.state.length;
/** Every string value in the seven files plus the state names — "the page's own words" exclude these. */
FIX.data = (() => {
  const out = new Set();
  const walk = (v) => {
    if (typeof v === 'string') out.add(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(raw);
  for (const s of STATES) out.add(s);
  // A state-portal prefix ("Andaman and Nicobar Island") is a data string the page prints on its own row.
  for (const k of FIX.stateKeys) out.add(k);
  return [...out].filter((x) => x.length >= 6).sort((a, b) => b.length - a.length || (a < b ? -1 : 1));
})();
const reasonNotPlotted = (r) => (!numericYear(r.year) ? 'out-of-range year' : Number(r.year) > FIX.scrapeYear ? 'after the scrape year' : 'n < 30');
const scrapeYearLabel = FIX.scrapedAt?.value
  ? `${FIX.scrapeYear} (partial, to ${new Date(FIX.scrapedAt.value).toLocaleString('en-GB', { month: 'long' })})`
  : `${FIX.scrapeYear} (partial; ${SCRAPE_DATE_MISSING})`;
/** The Election-calendar sentence of the timing reading, isolated when it can be. */
const ELECTION_SENTENCE = timing.innocentReading.match(/Election-calendar clustering[^.]*\./)?.[0] ?? timing.innocentReading;
/** The finding's own sentence about the captcha search and token re-signing. */
const NOT_ATTEMPTED_SENTENCE = sample.finding.match(/[^.]*was not attempted; no token was re-signed or re-timestamped[^.]*\./)?.[0] ?? null;
const familyStrings = [...new Set([FIX.denomText, ...FIX.indList.map((i) => i.familyDefinition), concentration.family])];
const absentPrereqs = PREREQ_FIELDS.filter((f) => {
  switch (f) {
    case 'provenance.dataset': return !P.dataset;
    case 'provenance.scrapedAt': return !P.scrapedAt;
    case 'winnerMarkers.msOnlyNamed': return quality.winnerMarkers.msOnlyNamed === undefined;
    case 'redflags.singleBiddingByBuyerFamily': return redflags.singleBiddingByBuyerFamily === undefined;
    case 'rates.byPortalTenderType': return rates.byPortalTenderType === undefined;
    default: return false;
  }
});

// ---------------------------------------------------------------------------
// Number and text helpers
// ---------------------------------------------------------------------------

const fmt = (n) => Number(n).toLocaleString('en-IN');
/** De-group digits (`,`, thin space, NBSP), fold curly quotes, collapse whitespace. */
const norm = (s) => String(s ?? '')
  .replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"')
  .replace(/(\d)[,\u00a0\u2009\u202f](?=\d)/g, '$1')
  .replace(/\s+/g, ' ').trim();
/**
 * `norm` without the trim, for the literal parts of `findSentence`: a part such as ' of '
 * or ' to ' keeps its edge spaces, so it still separates the numbers around it.
 * [Adjudicated] trimming the parts made ' of ' read 'of' and every rate sentence miss.
 */
const normKeep = (s) => String(s ?? '')
  .replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"')
  .replace(/(\d)[,\u00a0\u2009\u202f](?=\d)/g, '$1')
  .replace(/\s+/g, ' ');
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const int = (s) => Number.parseInt(norm(s).replace(/[^\d-]/g, ''), 10);
const samePct = (a, b) => Math.round(Number(a) * 10) === Math.round(Number(b) * 10);
const includes = (hay, needle) => norm(hay).includes(norm(needle));
const rgbToHsl = ({ r, g, b }) => {
  const R = r / 255; const G = g / 255; const B = b / 255;
  const max = Math.max(R, G, B); const min = Math.min(R, G, B); const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min; const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  return { h: 0, s, l };
};
const parseRgb = (c) => { const m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[\s,/]+/).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
const isNoFill = (c) => c === 'none' || c === 'transparent' || (parseRgb(c)?.a === 0);

/**
 * Find a sentence in `text`: literal parts are matched after normalisation, `{int}`
 * parts as de-grouped integers, `{pct}` parts as percentages compared to one decimal,
 * `{any}` as a non-empty wildcard. Returns the match or null.
 */
function findSentence(text, parts) {
  const checks = [];
  const src = parts.map((p) => {
    if (typeof p === 'string') return esc(normKeep(p));
    if (p.int !== undefined) { checks.push((s) => int(s) === Number(p.int)); return '(\\d+)'; }
    if (p.pct !== undefined) { checks.push((s) => samePct(s, p.pct)); return '(\\d+(?:\\.\\d+)?)'; }
    if (p.re) { checks.push(() => true); return `(${p.re})`; }
    checks.push(() => true); return '(.+?)';
  }).join('');
  const re = new RegExp(src, 'g');
  for (const m of norm(text).matchAll(re)) if (checks.every((c, i) => c(m[i + 1]))) return m;
  return null;
}
const assertSentence = (text, parts, label) => assert.ok(findSentence(text, parts), `${label}: expected "${parts.map((p) => (typeof p === 'string' ? p : `{${Object.keys(p)[0]}=${Object.values(p)[0]}}`)).join('')}" in "${norm(text).slice(0, 600)}"`);

const rateSentence = (x) => ['', { int: x.count }, ' of ', { int: x.familySize ?? x.n }, ' (', { pct: x.ratePct ?? x.pct }, '%, 95% interval ', { pct: x.wilson95[0] }, ' to ', { pct: x.wilson95[1] }, ')'];

/** Minimal RFC 4180 parser — cells may hold newlines and quotes. */
function parseCsv(s) {
  const rows = []; let row = []; let cell = ''; let quoted = false;
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
    resolve({ server, base: `http://127.0.0.1:${server.address().port}`, dir: dist });
  }));
}

function newestMtime(dir) {
  let m = 0;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    m = Math.max(m, e.isDirectory() ? newestMtime(p) : statSync(p).mtimeMs);
  }
  return m;
}

/**
 * Build the scaffold fixture as the document prescribes: a scratch copy of the
 * repository without research/raw/cppp/, built there with `vite build --outDir
 * dist-empty`, so the working tree's raw files are never touched. Cached at
 * dist-empty-cppp/ (its own directory, because energy's suite owns dist-empty/ and
 * rebuilds it), rebuilt when src/ is newer or TENDERS_REBUILD_EMPTY=1 is set.
 * TENDERS_DIST_EMPTY=<dir> pins a build made elsewhere.
 */
function ensureDistEmpty() {
  if (process.env.TENDERS_DIST_EMPTY) return process.env.TENDERS_DIST_EMPTY;
  const out = join(root, 'dist-empty-cppp');
  const fresh = existsSync(join(out, 'index.html')) && !process.env.TENDERS_REBUILD_EMPTY
    && statSync(join(out, 'index.html')).mtimeMs >= newestMtime(join(root, 'src'));
  if (fresh) return out;
  const scratch = mkdtempSync(join(tmpdir(), 'icip-cppp-empty-'));
  const EXCLUDE = /^(node_modules|dist|dist-empty|dist-empty-cppp|\.git|research\/raw\/cppp|tsconfig\.tsbuildinfo)(\/|$)/;
  cpSync(root, scratch, { recursive: true, filter: (src) => !EXCLUDE.test(relative(root, src).split(sep).join('/')) });
  symlinkSync(join(root, 'node_modules'), join(scratch, 'node_modules'));
  try {
    execFileSync(process.execPath, [join(scratch, 'node_modules/vite/bin/vite.js'), 'build', '--outDir', 'dist-empty'], { cwd: scratch, stdio: 'pipe' });
  } catch (e) {
    rmSync(scratch, { recursive: true, force: true });
    throw new Error(`the build must succeed without research/raw/cppp/ (the accessor's imports are discovered, not listed): ${e.stderr?.toString().slice(-800) || e.message}`);
  }
  rmSync(out, { recursive: true, force: true });
  cpSync(join(scratch, 'dist-empty'), out, { recursive: true });
  rmSync(scratch, { recursive: true, force: true });
  return out;
}

let browser;
let full; // { server, base, dir } for dist
let empty = null; // { server, base, dir } for the scaffold build, made on first use
let emptyError = null;

async function emptyServer() {
  if (empty) return empty;
  if (emptyError) throw emptyError;
  try { empty = await serve(ensureDistEmpty()); } catch (e) { emptyError = e; throw e; }
  return empty;
}

before(async () => {
  const dist = process.env.TENDERS_DIST ?? join(root, 'dist');
  if (!existsSync(join(dist, 'index.html'))) throw new Error(`${dist}/index.html missing — run \`npm run build\` first.`);
  full = await serve(dist);
  const PINNED = process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/opt/pw-browsers/chromium';
  browser = await chromium.launch(existsSync(PINNED) ? { executablePath: PINNED } : {});
});

after(async () => {
  await browser?.close();
  full?.server.close();
  empty?.server.close();
});

// ---------------------------------------------------------------------------
// Page helpers
// ---------------------------------------------------------------------------

const VIEWPORT = {
  D: { viewport: { width: 1280, height: 800 } },
  M: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
};

/**
 * In-page helpers, installed on every page. `sec()` is the acceptance document's
 * `SEC`: the <section> enclosing h2#cppp.
 */
const INIT = `window.__t = {
  sec() { const h = document.getElementById('cppp'); return h ? (h.closest('section') || h.parentElement) : null; },
  norm(s) { return String(s ?? '').replace(/[\\u2018\\u2019]/g, "'").replace(/[\\u201C\\u201D]/g, '"').replace(/(\\d)[,\\u00a0\\u2009\\u202f](?=\\d)/g, '$1').replace(/\\s+/g, ' ').trim(); },
  follows(a, b) { return !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING); },
  accName(el) {
    const lb = el.getAttribute('aria-labelledby');
    if (lb) { const t = lb.split(/\\s+/).map((id) => document.getElementById(id)?.textContent ?? '').join(' ').trim(); if (t) return t; }
    const al = el.getAttribute('aria-label'); if (al) return al.trim();
    const title = el.querySelector(':scope > title'); if (title) return title.textContent.trim();
    if (el.hasAttribute('title')) return el.getAttribute('title').trim();
    return el.textContent.trim();
  },
  described(el) { const ids = el.getAttribute('aria-describedby'); if (!ids) return ''; return ids.split(/\\s+/).map((id) => document.getElementById(id)?.textContent ?? '').join(' '); },
  captionOf(el) {
    const cap = el.tagName === 'TABLE' ? el.querySelector(':scope > caption') : null;
    const fig = el.closest('figure')?.querySelector('figcaption');
    const desc = el.tagName.toLowerCase() === 'svg' ? el.querySelector(':scope > desc') : null;
    return [cap?.textContent, fig?.textContent, desc?.textContent, __t.described(el)].filter(Boolean).join(' ');
  },
  deepest(root, needle) {
    const n = __t.norm(needle);
    const cands = [...root.querySelectorAll('*')].filter((e) => __t.norm(e.textContent).includes(n));
    return cands.find((c) => !cands.some((o) => o !== c && c.contains(o))) ?? null;
  },
  visible(el) {
    if (!el) return false;
    if (el.closest('details:not([open])') && !el.closest('summary')) return false;
    const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  },
  block(el) { for (let e = el; e && e !== document.body; e = e.parentElement) { if (!/^inline/.test(getComputedStyle(e).display)) return e; } return document.body; },
  inTierChip(el) { for (let e = el; e && e !== document.body; e = e.parentElement) { if (${JSON.stringify(TIER_WORDS)}.includes(e.textContent.trim())) return true; } return false; },
  /**
   * A StatGrid: the first block inside \`main\` after \`from\` (default: the page h1), outside
   * SEC, with 3–12 short children that each carry a figure. [Adjudicated] scoped to \`main\`
   * after \`main h1\`: the Layout sidebar's figure block (outside main) is not a StatGrid.
   */
  statGrid(from) {
    const sec = __t.sec();
    const start = from ?? document.querySelector('main h1');
    return [...document.querySelectorAll('main *')].find((el) => (!start || __t.follows(start, el)) && !(sec && sec.contains(el)) && !el.closest('table, nav, header')
      && el.children.length >= 3 && el.children.length <= 12
      && [...el.children].every((c) => /\\d/.test(c.textContent) && c.textContent.trim().length > 0 && c.textContent.trim().length < 160)
      && !el.querySelector('table, h1, h2, h3, svg, section')) ?? null;
  },
  ring(el) { const s = getComputedStyle(el); return (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== 'none'; },
  rgb(c) { const m = String(c).match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const p = m[1].split(/[\\s,\\/]+/).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; },
  varColor(name) { const probe = document.createElement('span'); probe.style.color = 'var(' + name + ')'; document.body.appendChild(probe); const c = getComputedStyle(probe).color; probe.remove(); return c; },
};`;

const external = /fonts\.(googleapis|gstatic)\.com|ERR_CONNECTION_RESET|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|ERR_CERT_AUTHORITY_INVALID/;

/**
 * A fresh context per check: history, clipboard and focus never leak between
 * criteria. Fails on any console error or page error.
 */
async function withPage(vp, fn) {
  const ctx = await browser.newContext({ ...VIEWPORT[vp], reducedMotion: 'reduce', permissions: ['clipboard-read', 'clipboard-write'], acceptDownloads: true });
  ctx.setDefaultTimeout(ACTION_TIMEOUT);
  await ctx.addInitScript(INIT);
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !external.test(m.text())) errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  try {
    await fn(page);
    assert.deepEqual(errors, [], `console/page errors: ${errors.join(' | ')}`);
  } finally {
    await ctx.close();
  }
}

/**
 * about:blank first so a hash-only navigation cannot carry state between loads; then
 * wait for #cppp and for nothing inside the section to read `loading` (the files are
 * dynamic imports), then settle.
 */
async function load(page, route, { base = full?.base, section = true, waitUntil = 'networkidle' } = {}) {
  await page.goto('about:blank');
  await page.goto(`${base}/#${route}`, { waitUntil });
  await page.waitForFunction(() => document.body && document.body.innerText.trim().length > 0, null, { timeout: ACTION_TIMEOUT }).catch(() => {});
  if (section) {
    // A missing section is a failed criterion, not something to wait 20s for: only a
    // present section is given time for its dynamic imports to land.
    const present = await page.waitForSelector('#cppp', { state: 'attached', timeout: ACTION_TIMEOUT }).then(() => true, () => false);
    if (present) await page.waitForFunction(() => { const s = window.__t.sec(); return !!s && !/\bloading\b/i.test(s.innerText); }, null, { timeout: 20_000 }).catch(() => {});
  }
  await page.waitForTimeout(SETTLE);
}
const requireSection = async (page) => assert.ok(await page.locator('#cppp').count(), 'h2#cppp missing — the CPPP section did not render');
async function openNational(page, query = '', opts = {}) {
  await load(page, `${NATIONAL}${query}`, opts);
  await requireSection(page);
}

function parseHash(url) {
  const hash = new URL(url).hash.slice(1);
  const [pathAndQuery, ...frag] = hash.split('#');
  const [path, query = ''] = pathAndQuery.split('?');
  return { path, params: new URLSearchParams(query), fragment: frag.join('#') };
}
const params = (page) => parseHash(page.url()).params;
function assertParamsExactly(page, expected, label = 'hash params') {
  const got = [...params(page).entries()].map((kv) => kv.join('=')).sort();
  const want = Object.entries(expected).map((kv) => kv.join('=')).sort();
  assert.deepEqual(got, want, label);
}
const waitForParam = (page, key, value) => page.waitForFunction(([k, v]) => {
  const q = (location.hash.split('?')[1] ?? '').split('#')[0];
  const p = new URLSearchParams(q);
  return v === undefined ? p.has(k) : p.get(k) === v;
}, [key, value], { timeout: ACTION_TIMEOUT });
const waitForNoParam = (page, key) => page.waitForFunction((k) => !new URLSearchParams((location.hash.split('?')[1] ?? '').split('#')[0]).has(k), key, { timeout: ACTION_TIMEOUT });

const text = async (loc) => norm(await loc.innerText());
const style = (loc, prop) => loc.evaluate((el, p) => getComputedStyle(el)[p], prop);
const rect = (loc) => loc.evaluate((el) => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height }; });
const secText = (page) => page.evaluate(() => window.__t.sec()?.innerText ?? '');
const secLocator = (page) => page.locator('#cppp').locator('xpath=ancestor::section[1]');
const historyLength = (page) => page.evaluate(() => history.length);
/** A button (or link) by its visible text, case-insensitive, exact after trim. */
const control = (scope, name) => scope.locator('button, a[href], summary, [role="button"]').filter({ hasText: new RegExp(`^\\s*${esc(name)}\\s*$`, 'i') }).first();
/** The portal group in #cppp-concentration: the labelled group holding the `central` and `state` buttons. */
const portalGroup = (page) => page.locator('#cppp-concentration [role="group"]').filter({ hasText: /central/i }).filter({ hasText: /state/i }).first();
const portalButton = (page, name) => portalGroup(page).locator('button').filter({ hasText: new RegExp(`^\\s*${esc(name)}\\s*$`, 'i') }).first();
/** The register's View / Scope groups below the section. */
const registerGroup = (page, label) => page.locator(`[role="group"][aria-label="${label}" i]`).first();

/** Read a table into plain data: normalised header and cell texts, row flags. */
async function readTable(page, sel) {
  return page.evaluate((s) => {
    const t = typeof s === 'string' ? document.querySelector(s) : s;
    if (!t) return null;
    const headers = [...t.querySelectorAll('thead th')].map((th) => ({ text: __t.norm(th.textContent), sort: th.getAttribute('aria-sort'), scope: th.getAttribute('scope'), button: !!th.querySelector('button') }));
    // [Adjudicated] a `/ unparsed` buyer cell renders as label + raw key (AC-42); when matching
    // rows to the data the cell is read by its raw key, the mono [data-raw-key] element.
    const rows = [...t.querySelectorAll('tbody tr')].map((tr) => ({
      cells: [...tr.querySelectorAll('th, td')].map((c) => __t.norm((c.querySelector('[data-raw-key]') ?? c).textContent)),
      header: __t.norm(tr.querySelector('th[scope="row"]')?.textContent ?? ''),
      hasRowHeader: !!tr.querySelector('th[scope="row"]'),
      nodata: tr.hasAttribute('data-nodata') || !!tr.querySelector('[data-nodata]'),
      notPlotted: tr.hasAttribute('data-not-plotted'),
      role: tr.getAttribute('role'),
      text: __t.norm(tr.textContent),
    }));
    return { headers, rows, caption: __t.norm(t.querySelector(':scope > caption')?.textContent ?? ''), described: __t.norm(__t.described(t)), describedBy: t.getAttribute('aria-describedby') ?? '' };
  }, sel);
}
const twin = (page, name) => readTable(page, `[data-twin="${name}"]`);
const requireTwin = async (page, name) => { const t = await twin(page, name); assert.ok(t, `[data-twin="${name}"] missing`); return t; };
const colIndex = (tbl, ...names) => {
  const lower = names.map((n) => norm(n).toLowerCase());
  let i = tbl.headers.findIndex((h) => lower.includes(h.text.toLowerCase()));
  if (i < 0) i = tbl.headers.findIndex((h) => lower.some((n) => h.text.toLowerCase().includes(n)));
  return i;
};
const requireCol = (tbl, label, ...names) => { const i = colIndex(tbl, ...names); assert.ok(i >= 0, `${label}: no header among ${names.join(' | ')} (headers: ${tbl.headers.map((h) => h.text).join(' | ')})`); return i; };

/** Every caption-like text in a container: table captions, figcaptions, svg desc, and described-by targets. */
const captionsIn = (page, sel) => page.evaluate((s) => {
  const c = document.querySelector(s); if (!c) return [];
  const out = [...c.querySelectorAll('caption, figcaption')].map((e) => e.textContent);
  for (const g of c.querySelectorAll('table, svg[role="img"]')) { const d = __t.described(g); if (d) out.push(d); const desc = g.querySelector(':scope > desc'); if (desc) out.push(desc.textContent); }
  return out.map((x) => __t.norm(x));
}, sel);

/** Click a download control and return { filename, text, requests } with the CSV saved to a temp file. */
async function download(page, btn) {
  const requests = [];
  const onReq = (r) => { const u = r.url(); if (!u.startsWith('blob:') && !u.startsWith('data:')) requests.push(u); };
  page.on('request', onReq);
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 10_000 }), btn.click()]);
  const dir = mkdtempSync(join(tmpdir(), 'icip-cppp-csv-'));
  const file = join(dir, dl.suggestedFilename() || 'download.csv');
  await dl.saveAs(file);
  await page.waitForTimeout(200);
  page.off('request', onReq);
  const body = readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  rmSync(dir, { recursive: true, force: true });
  return { filename: dl.suggestedFilename(), body, requests };
}
const csvParts = (body) => {
  const lines = body.split('\n');
  const comments = lines.filter((l) => l.startsWith('#'));
  const rows = parseCsv(lines.filter((l) => !l.startsWith('#')).join('\n')).filter((r) => r.some((c) => c.length));
  return { comments: comments.join('\n'), header: rows[0] ?? [], data: rows.slice(1) };
};
/** Download buttons inside a `#cppp-*` container. */
const downloadButtons = (page, containerSel) => page.locator(`${containerSel} button, ${containerSel} a[download]`).filter({ hasText: /download/i });

/** The states twin split into matched rows, rows under `spellings that match no state name`, and hatched absent rows. */
async function statesSplit(page) {
  return page.evaluate((heading) => {
    const t = document.querySelector('[data-twin="states"]'); if (!t) return null;
    const scope = document.getElementById('cppp-states') ?? t.parentElement;
    const head = __t.deepest(scope, heading);
    const out = { matched: [], unmatched: [], nodata: [], headingExists: !!head, rows: [] };
    for (const tr of t.querySelectorAll('tbody tr')) {
      const cells = [...tr.querySelectorAll('th, td')].map((c) => __t.norm(c.textContent));
      const isHeadingRow = head && tr.contains(head);
      if (isHeadingRow) continue;
      const row = { cells, text: __t.norm(tr.textContent), nodata: tr.hasAttribute('data-nodata') || !!tr.querySelector('[data-nodata]'), link: tr.querySelector('a[href]')?.textContent?.trim() ?? null };
      out.rows.push(row);
      if (row.nodata) out.nodata.push(cells[0]);
      else if (head && !head.contains(tr) && __t.follows(head, tr)) out.unmatched.push(cells[0]);
      else out.matched.push(cells[0]);
    }
    out.headers = [...t.querySelectorAll('thead th')].map((th) => __t.norm(th.textContent));
    return out;
  }, 'spellings that match no state name');
}

const ac = (name, fn) => test(name, { timeout: TEST_TIMEOUT }, fn);

// ===========================================================================
// 1. Render, entry and scaffold state
// ===========================================================================

/** The register's furniture after SEC: byline, StatGrid, View/Scope groups, further h2s. */
const afterSection = (page) => page.evaluate(() => {
  const sec = __t.sec(); if (!sec) return null;
  const after = (sel) => [...document.querySelectorAll(sel)].filter((el) => !sec.contains(el) && __t.follows(sec, el));
  return {
    byline: after('p')[0]?.textContent.trim() ?? null,
    statGrid: __t.statGrid(sec)?.innerText ?? null,
    groups: after('[role="group"][aria-label]').map((g) => g.getAttribute('aria-label')),
    h2After: after('h2').length,
  };
});
function assertRegistersBelow(info, label) {
  assert.ok(info, `${label}: SEC missing`);
  assert.ok(info.byline, `${label}: no Byline paragraph after SEC`);
  assert.ok(info.statGrid, `${label}: no StatGrid after SEC`);
  assert.ok(info.groups.some((g) => /view/i.test(g)) && info.groups.some((g) => /scope/i.test(g)), `${label}: View/Scope groups after SEC: ${info.groups.join(', ')}`);
  assert.ok(info.h2After >= 1, `${label}: no further h2 after SEC`);
}

ac('AC-01 — The section renders, error-free, above the registers', () => withPage('D', async (page) => {
  await openNational(page);
  const head = await page.evaluate(() => {
    const h2 = document.getElementById('cppp');
    return {
      tag: h2.tagName, text: __t.norm(h2.textContent), first: document.querySelector('h2') === h2,
      prev: __t.norm(h2.previousElementSibling?.textContent ?? ''), len: document.body.innerText.length,
      // [Adjudicated] the page's h1 is `main h1` (PageTitle); the Layout's wordmark h1 is not the page's.
      h1: __t.norm(document.querySelector('main h1')?.textContent ?? ''),
    };
  });
  assert.equal(head.tag, 'H2', '#cppp is not an h2');
  assert.equal(head.text, H2_TEXT);
  assert.ok(head.first, 'h2#cppp is not the first h2 in the document');
  assert.equal(head.prev, KICKER, 'the element before h2#cppp is not the kicker');
  assert.ok(head.len >= 200, `rendered only ${head.len} characters`);
  assert.equal(head.h1, H1, 'page h1 changed');
  assertRegistersBelow(await afterSection(page), 'registers');
}));

ac('AC-02 — view=national lands on section=national with every other param kept', () => withPage('D', async (page) => {
  await page.goto('about:blank');
  const before = await historyLength(page);
  await page.goto(`${full.base}/#${ROUTE}?view=national&scope=centre`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#cppp', { state: 'attached' }).catch(() => {});
  await page.waitForTimeout(SETTLE);
  assertParamsExactly(page, { section: 'national', scope: 'centre' });
  // goto adds exactly one entry; the rewrite must add none (replace, not push).
  assert.equal(await historyLength(page), before + 1, 'the alias rewrite pushed a history entry');
  await requireSection(page);
  assert.equal(await registerGroup(page, 'Scope').locator('button').filter({ hasText: /^\s*centre\s*$/i }).first().getAttribute('aria-pressed'), 'true', 'Scope centre is not pressed');
}));

/** The head link and byline of the default view. */
const defaultViewHead = (page) => page.evaluate(() => {
  const links = [...document.querySelectorAll('a[href]')];
  const link = links.find((a) => /^\s*The CPPP award scrape/.test(a.textContent));
  const byline = [...document.querySelectorAll('p')].find((p) => /A separate national award scrape/.test(p.textContent));
  const bylineLink = byline ? [...byline.querySelectorAll('a[href]')].find((a) => /section=national/.test(a.getAttribute('href'))) : null;
  const arrow = link ? (link.querySelector('[aria-hidden="true"]') ?? (link.nextElementSibling?.getAttribute('aria-hidden') === 'true' ? link.nextElementSibling : null)) : null;
  const headerText = (() => { const h1 = document.querySelector('h1'); const firstH2 = document.querySelector('h2'); if (!h1) return document.body.innerText; const r = document.createRange(); r.setStartBefore(h1); if (firstH2) r.setEndBefore(firstH2); else r.setEndAfter(document.body.lastChild); return r.toString(); })();
  return {
    link: link ? { text: __t.norm(link.textContent), href: link.getAttribute('href'), arrow: !!arrow } : null,
    byline: byline ? __t.norm(byline.textContent) : null, bylineLink: !!bylineLink,
    h2Count: document.querySelectorAll('h2').length, statGrid: __t.statGrid(null)?.innerText ?? null,
    headerText: __t.norm(headerText), body: document.body.innerText,
  };
});

ac('AC-03 — The default view is unchanged except for one head link and one byline sentence', () => withPage('D', async (page) => {
  await load(page, ROUTE, { section: false });
  assert.equal(await page.locator('#cppp').count(), 0, '#cppp rendered without section=');
  const snap = await defaultViewHead(page);
  assert.ok(!includes(snap.body, FIX.caveat), 'the caveat renders in the default view');
  assert.ok(snap.link, 'no head link starting "The CPPP award scrape"');
  assert.equal(snap.link.text, norm(`The CPPP award scrape — ${fmt(FIX.rows)} award rows, reported, not a national statistic`));
  assert.ok(snap.link.arrow, 'head link has no aria-hidden arrow');
  assert.ok(parseHash(new URL(snap.link.href, page.url()).href).params.get('section') === 'national', `head link href "${snap.link.href}" does not resolve to ?section=national`);
  assert.ok(snap.byline, 'no Byline sentence "A separate national award scrape …"');
  assert.ok(snap.byline.includes('A separate national award scrape (reported, unverified) is in the CPPP section.'), `byline "${snap.byline}"`);
  assert.ok(snap.bylineLink, 'the byline sentence has no link to ?section=national');
  assert.ok(snap.statGrid, 'no StatGrid found in the default view');
  // The snapshot is the same URL rendered again by this suite, and the section view's register.
  await load(page, ROUTE, { section: false });
  const again = await defaultViewHead(page);
  assert.equal(again.h2Count, snap.h2Count, 'h2 count differs between two renders of /#/tenders');
  assert.equal(again.statGrid, snap.statGrid, 'StatGrid text differs between two renders of /#/tenders');
  await openNational(page);
  const withSection = await page.evaluate(() => { const sec = __t.sec(); return { h2: [...document.querySelectorAll('h2')].filter((h) => !sec.contains(h)).length, statGrid: __t.statGrid(sec)?.innerText ?? null }; });
  assert.equal(withSection.h2, snap.h2Count, 'the register has a different h2 count once the section is shown');
  assert.equal(withSection.statGrid, snap.statGrid, 'the register StatGrid changes once the section is shown');
}));

ac('AC-04 — Zero records still renders a page that says so', async () => {
  const e = await emptyServer();
  for (const vp of ['D', 'M']) {
    await withPage(vp, async (page) => {
      await openNational(page, '', { base: e.base });
      const len = await page.evaluate(() => document.body.innerText.length);
      assert.ok(len >= 200, `${vp}: rendered only ${len} characters`);
      const s = await page.evaluate(() => {
        const sec = __t.sec();
        return {
          text: sec.innerText, tables: sec.querySelectorAll('table').length, svgs: sec.querySelectorAll('svg').length,
          marks: sec.querySelectorAll('[data-mark]').length, facts: sec.querySelectorAll('[data-strip-fact]').length, figure: sec.querySelectorAll('[data-figure]').length,
        };
      });
      assert.ok(s.text.includes(ABSENT), `${vp}: SEC lacks "${ABSENT}"`);
      assert.equal(s.tables, 0, `${vp}: tables in the scaffold`);
      assert.equal(s.svgs, 0, `${vp}: svgs in the scaffold`);
      assert.equal(s.marks, 0, `${vp}: [data-mark] in the scaffold`);
      assert.ok(!s.text.includes('%'), `${vp}: a percentage in the scaffold`);
      assert.equal(s.facts, 0, `${vp}: [data-strip-fact] in the scaffold`);
      assert.equal(s.figure, 0, `${vp}: [data-figure] in the scaffold`);
      assert.ok(!/\d award/.test(s.text), `${vp}: a digit followed by " award" in the scaffold`);
      assertRegistersBelow(await afterSection(page), vp);
    });
  }
});

ac('AC-05 — The scaffold head link never says 0 award rows', async () => {
  const e = await emptyServer();
  await withPage('D', async (page) => {
    await load(page, ROUTE, { base: e.base, section: false });
    const snap = await defaultViewHead(page);
    if (snap.link) assert.ok(snap.link.text.includes('not present in this build'), `head link reads "${snap.link.text}"`);
    assert.ok(!/\b0 award rows\b/.test(snap.headerText), 'header says "0 award rows"');
    assert.ok(!/\b0 award rows\b/.test(snap.body), 'page says "0 award rows"');
    if (snap.byline) assert.ok(!/\d/.test(snap.byline), `byline sentence carries a digit: "${snap.byline}"`);
  });
});

ac('AC-06 — A pending import shows a named placeholder, never the absence sentence', () => withPage('D', async (page) => {
  let delayed = 0;
  let release;
  const gate = new Promise((r) => { release = r; });
  await page.route('**/*.js', async (route) => {
    const resp = await route.fetch();
    const body = await resp.text();
    if (body.includes('hhiMarkedValue')) {
      delayed += 1;
      await new Promise((r) => setTimeout(r, 4_000));
      release();
    }
    await route.fulfill({ response: resp, body, headers: { ...resp.headers(), 'content-type': 'text/javascript' } });
  });
  await page.goto('about:blank');
  await page.goto(`${full.base}/#${NATIONAL}`, { waitUntil: 'commit' });
  await page.waitForSelector('#cppp', { state: 'attached', timeout: 10_000 });
  const pending = page.locator('#cppp-concentration [data-pending]');
  await pending.first().waitFor({ state: 'attached', timeout: 3_500 }).catch(() => {});
  assert.ok(await pending.count(), '#cppp-concentration has no [data-pending] placeholder while the chunk is delayed');
  const ptext = await text(pending.first());
  assert.match(ptext, /loading/i, `placeholder "${ptext}" does not say loading`);
  assert.match(ptext, /concentration/i, `placeholder "${ptext}" does not name the table`);
  assert.ok(!(await secText(page)).includes(ABSENT), 'the absence sentence renders while an import is pending');
  await gate;
  assert.ok(delayed >= 1, 'no JS response contained hhiMarkedValue — the concentration data is not a chunk of its own');
  await page.waitForSelector('[data-twin="concentration"]', { state: 'attached', timeout: 10_000 });
  await page.waitForFunction(() => !document.querySelector('#cppp-concentration [data-pending]'), null, { timeout: ACTION_TIMEOUT });
  await page.unroute('**/*.js');
}));

ac('AC-07 — Quality comes before any rate, in DOM order', () => withPage('D', async (page) => {
  await openNational(page);
  const r = await page.evaluate(() => {
    const sec = __t.sec(); const caveat = document.getElementById('cppp-caveat');
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let pct = null; let n;
    while ((n = walker.nextNode())) { if (n.nodeValue.includes('%')) { pct = n.parentElement; break; } }
    const firstH3 = document.querySelector('h3'); const firstTable = document.querySelector('table');
    const q = document.getElementById('cppp-quality'); const rt = document.getElementById('cppp-rates'); const svg = sec.querySelector('svg');
    return {
      caveat: !!caveat, pctFollows: !!(caveat && pct && __t.follows(caveat, pct)), pctText: pct?.textContent.slice(0, 80) ?? null,
      h3InSec: !!firstH3 && sec.contains(firstH3), h3BeforeQuality: !!(firstH3 && q && __t.follows(firstH3, q)), h3: firstH3?.textContent.trim() ?? null,
      firstTableIsQuality: firstTable?.getAttribute('data-twin') === 'quality',
      qBeforeRates: !!(q && rt && __t.follows(q, rt)), ratesBeforeSvg: !!(rt && svg && (rt.contains(svg) || __t.follows(rt, svg))),
    };
  });
  assert.ok(r.caveat, '#cppp-caveat missing');
  assert.ok(r.pctFollows, `the first "%" ("${r.pctText}") precedes the caveat`);
  assert.ok(r.h3InSec, `the first h3 ("${r.h3}") is not inside SEC`);
  // The §3.0 head has no table; the first h3 belongs to it, so it precedes #cppp-quality.
  assert.ok(r.h3BeforeQuality, `the first h3 ("${r.h3}") does not precede #cppp-quality`);
  assert.ok(r.firstTableIsQuality, 'the first table in the document is not [data-twin="quality"]');
  assert.ok(r.qBeforeRates, '#cppp-quality does not precede #cppp-rates');
  assert.ok(r.ratesBeforeSvg, '#cppp-rates does not precede the first svg in SEC');
}));

ac('AC-08 — Heading levels run h2 → h3 → h4 with no skips', () => withPage('D', async (page) => {
  await openNational(page);
  const r = await page.evaluate(() => {
    const sec = __t.sec();
    const hs = [...sec.querySelectorAll('h2, h3, h4')].map((h) => ({ level: Number(h.tagName[1]), id: h.id, text: __t.norm(h.textContent), code: h.querySelector('code')?.textContent.trim() ?? null }));
    const rf = document.getElementById('cppp-redflags');
    const h4 = rf ? [...rf.querySelectorAll('h4')].map((h) => ({ text: __t.norm(h.textContent), code: h.querySelector('code')?.textContent.trim() ?? null })) : null;
    return { hs, h4 };
  });
  assert.ok(r.hs.length && r.hs[0].level === 2 && r.hs[0].id === 'cppp', 'the first heading in SEC is not h2#cppp');
  for (let i = 1; i < r.hs.length; i += 1) assert.ok(r.hs[i].level <= r.hs[i - 1].level + 1, `heading level skips at "${r.hs[i].text}" (h${r.hs[i - 1].level} → h${r.hs[i].level})`);
  assert.ok(r.hs.filter((h) => h.level === 3).length >= 10, `only ${r.hs.filter((h) => h.level === 3).length} h3 in SEC`);
  assert.ok(r.h4, '#cppp-redflags missing');
  assert.equal(r.h4.length, FIX.indList.length, `h4 count in #cppp-redflags: ${r.h4.map((h) => h.text).join(' | ')}`);
  for (const ind of FIX.indList) {
    const mapped = INDICATOR_H4[ind.indicator];
    if (mapped) assert.ok(r.h4.some((h) => h.text === mapped), `no h4 "${mapped}"`);
    else assert.ok(r.h4.some((h) => h.code === ind.indicator), `unmapped key ${ind.indicator} not shown as <code>`);
  }
}));

ac('AC-09 — Hide removes section and keeps every other param', () => withPage('D', async (page) => {
  await openNational(page, '&view=map&scope=states');
  await control(page, 'Hide the CPPP section').click();
  await waitForNoParam(page, 'section');
  await page.waitForTimeout(SETTLE);
  assertParamsExactly(page, { view: 'map', scope: 'states' });
  assert.equal(await page.locator('#cppp').count(), 0, '#cppp still present after Hide');
  assert.equal(await registerGroup(page, 'View').locator('button').filter({ hasText: /^\s*map\s*$/i }).first().getAttribute('aria-pressed'), 'true', 'View map is not pressed');
}));

// ===========================================================================
// 2. Honesty captions
// ===========================================================================

async function assertCaveat(page, vp) {
  const caveat = page.locator('p#cppp-caveat');
  assert.equal(await caveat.count(), 1, `${vp}: p#cppp-caveat missing`);
  assert.equal(await text(caveat), norm(FIX.caveat), `${vp}: caveat text`);
  const r = await caveat.evaluate((el) => {
    const body = [...document.querySelectorAll('main p, p')].find((p) => p !== el && p.textContent.trim().length >= 80 && !p.closest('caption, details, table'));
    const label = [...document.querySelectorAll('*')].find((x) => /^Read this first/.test(x.textContent.trim()) && x.children.length <= 1 && __t.follows(x, el));
    return { size: parseFloat(getComputedStyle(el).fontSize), bodySize: body ? parseFloat(getComputedStyle(body).fontSize) : null, inCaption: !!el.closest('caption, details'), labelled: !!label };
  });
  assert.ok(r.size >= 14, `${vp}: caveat font-size ${r.size}px`);
  assert.equal(r.size, r.bodySize, `${vp}: caveat ${r.size}px ≠ body paragraph ${r.bodySize}px`);
  assert.ok(!r.inCaption, `${vp}: caveat has a caption/details ancestor`);
  assert.ok(r.labelled, `${vp}: no "Read this first" label precedes the caveat`);
  for (const name of ['quality', 'rates-central', 'rates-state', 'bands', 'types', 'buyers']) {
    const t = await requireTwin(page, name);
    assert.ok(t.describedBy.split(/\s+/).includes('cppp-caveat'), `${vp}: [data-twin="${name}"] aria-describedby "${t.describedBy}" lacks cppp-caveat`);
  }
}

ac('AC-10 — The caveat is a body paragraph, verbatim, before any rate, and every rates table points at it', async () => {
  for (const vp of ['D', 'M']) await withPage(vp, async (page) => { await openNational(page); await assertCaveat(page, vp); });
});

/** The verification line between h2#cppp and #cppp-caveat, and the tier chip before it. */
const verificationLine = (page) => page.evaluate(() => {
  const h2 = document.getElementById('cppp'); const caveat = document.getElementById('cppp-caveat'); if (!h2 || !caveat) return null;
  const between = [...__t.sec().querySelectorAll('*')].filter((el) => __t.follows(h2, el) && __t.follows(el, caveat) && !el.contains(caveat));
  const line = between.filter((el) => /^Verification:/.test(el.textContent.trim())).pop() ?? null;
  const chip = between.find((el) => el.textContent.trim() === 'Reported') ?? null;
  const range = document.createRange(); range.setStartAfter(h2); range.setEndBefore(caveat);
  const r = line?.getBoundingClientRect();
  return { text: line ? __t.norm(line.textContent) : null, link: !!line?.querySelector('a[href$="#cppp-sample"]'), chip: !!chip, chipBefore: !!(chip && line && __t.follows(chip, line)), headText: __t.norm(range.toString()), bottom: r?.bottom ?? null };
});

ac('AC-11 — The verification line states what could be checked, and links to the sample', () => withPage('D', async (page) => {
  await openNational(page);
  const v = await verificationLine(page);
  assert.ok(v?.text, 'no element starting "Verification:" between h2#cppp and #cppp-caveat');
  assert.equal(v.text, norm(`Verification: ${fmt(FIX.matchSum)} of ${fmt(sample.rows.length)} sampled rows could be checked against the portal on ${FIX.fetchDate} (every stored link returned the portal's “Invalid Url” page). Every figure below is dataset-only.`));
  assert.ok(v.link, 'verification line has no a[href$="#cppp-sample"]');
  assert.ok(v.chip && v.chipBefore, 'no TierChip "Reported" precedes the verification line');
  const i = v.headText.indexOf('Reported'); const j = v.headText.indexOf(norm(TIER_CLAUSE)); const k = v.headText.indexOf('Verification:');
  assert.ok(i >= 0 && j > i && k > j, `head order: Reported@${i}, clause@${j}, verification@${k}`);
}));

ac('AC-12 — Tier is spoken text on every table and chart', () => withPage('D', async (page) => {
  await openNational(page, '&rows=all&buyers=all');
  const r = await page.evaluate((tierWords) => {
    const sec = __t.sec();
    const graphics = [...sec.querySelectorAll('table, svg[role="img"]')].map((g) => ({ kind: g.tagName.toLowerCase(), twin: g.getAttribute('data-twin'), caption: __t.norm(__t.captionOf(g)) }));
    const chips = [...sec.querySelectorAll('*')].filter((el) => tierWords.includes(el.textContent.trim()) && ![...el.children].some((c) => tierWords.includes(c.textContent.trim())));
    return { graphics, chips: chips.map((c) => ({ text: c.textContent.trim(), visible: __t.visible(c), dash: [c, ...c.querySelectorAll('*')].some((x) => x.hasAttribute('stroke-dasharray') || (getComputedStyle(x).strokeDasharray && getComputedStyle(x).strokeDasharray !== 'none')) })) };
  }, TIER_WORDS);
  assert.ok(r.graphics.length, 'no table or svg[role="img"] in SEC');
  for (const g of r.graphics) {
    assert.ok(g.caption.includes(norm(TIER_LINE)), `${g.kind}[data-twin="${g.twin}"]: caption "${g.caption.slice(0, 200)}" lacks "${TIER_LINE}"`);
    assert.ok(/\breported\b/.test(g.caption), `${g.kind}[data-twin="${g.twin}"]: caption lacks "reported"`);
  }
  assert.ok(r.chips.length, 'no TierChip in SEC');
  for (const c of r.chips) {
    assert.equal(c.text, 'Reported', `TierChip reads "${c.text}"`);
    assert.ok(c.visible, 'TierChip not visible');
    assert.ok(!c.dash, 'TierChip carries a stroke-dasharray');
  }
}));

async function statesAppearing(page) { const s = await statesSplit(page); assert.ok(s, '[data-twin="states"] missing'); return s; }

async function assertRatesCaptions(page, vp) {
  // [Adjudicated] wait for the states twin and the rates figcaption to be in the DOM, never
  // on the settle alone: the caption's third line counts the states twin's rows.
  await page.waitForSelector('[data-twin="states"]', { state: 'attached' });
  await page.waitForSelector('#cppp-rates figcaption', { state: 'attached' });
  const s = await statesAppearing(page);
  const k = s.matched.length;
  const r = await page.evaluate(([c1, c2]) => {
    const sect = document.getElementById('cppp-rates'); if (!sect) return null;
    const svg = sect.querySelector('svg'); const tw = sect.querySelector('[data-twin="rates-central"]');
    const els = [...sect.querySelectorAll('*')].filter((el) => svg && tw && __t.follows(svg, el) && __t.follows(el, tw) && !el.contains(tw));
    const cands = els.filter((el) => __t.norm(el.textContent).includes(__t.norm(c1)) && __t.norm(el.textContent).includes(__t.norm(c2)));
    const el = cands.find((c) => !cands.some((o) => o !== c && c.contains(o))) ?? null;
    return el ? { text: __t.norm(el.textContent), visible: __t.visible(el), details: !!el.closest('details') } : { text: null, secText: __t.norm(sect.innerText).slice(0, 1500) };
  }, [RATES_CAPTION_1, RATES_CAPTION_2]);
  assert.ok(r, `${vp}: #cppp-rates missing`);
  // On failure the section's text is recorded so a recurrence can be diagnosed from the log.
  assert.ok(r.text, `${vp}: no element between the rates svg and its twin carrying the two frozen caption lines; #cppp-rates reads "${r.secText}"`);
  const i1 = r.text.indexOf(norm(RATES_CAPTION_1)); const i2 = r.text.indexOf(norm(RATES_CAPTION_2));
  assert.ok(i1 >= 0 && i2 > i1, `${vp}: caption lines out of order`);
  const line3 = `The state portal is not India's states: ${k} of ${FIX.states.length} states and UTs appear (see §3.2a).`;
  assert.ok(r.text.indexOf(norm(line3)) > i2, `${vp}: third caption line "${line3}" missing or out of order in "${r.text.slice(0, 700)}"`);
  assert.ok(r.visible, `${vp}: caption not visible`);
  assert.ok(!r.details, `${vp}: caption inside details`);
}

ac('AC-13 — The rates chart carries its three frozen caption lines', async () => {
  for (const vp of ['D', 'M']) await withPage(vp, async (page) => { await openNational(page); await assertRatesCaptions(page, vp); });
});

ac('AC-14 — Years are AOC years, said so, and the two year fields are reconciled', () => withPage('D', async (page) => {
  await openNational(page);
  for (const name of ['rates-central', 'rates-state']) {
    const t = await requireTwin(page, name);
    const yearHeaders = t.headers.filter((h) => /year/i.test(h.text));
    assert.ok(yearHeaders.length, `${name}: no year column`);
    for (const h of yearHeaders) assert.ok(h.text.includes('AOC year'), `${name}: year header "${h.text}"`);
  }
  const q = await requireTwin(page, 'quality');
  const perYear = q.rows.filter((r) => r.hasRowHeader && /\b(19|20)\d{2}\b/.test(r.header) && !/AOC/.test(r.header));
  assert.ok(perYear.length, 'quality twin has no per-year rows');
  for (const r of perYear) assert.ok(/portal year/.test(r.header), `quality row header "${r.header}" lacks "portal year"`);
  const caps = (await captionsIn(page, '#cppp-rates')).join(' ');
  assert.ok(caps.includes('portal year'), 'rates caption lacks "portal year"');
  assert.ok(caps.includes(String(FIX.quality.dates.portalYearDiffersFromAocYear)), `rates caption lacks ${fmt(FIX.quality.dates.portalYearDiffersFromAocYear)}`);
  assert.ok(/half/.test(caps) && /median/.test(caps), 'rates caption lacks the thin-coverage rule (half, median)');
  assert.ok(new RegExp(`\\b${FIX.notPlottedTotal}\\b[^.]*not plotted|not plotted[^.]*\\b${FIX.notPlottedTotal}\\b`).test(caps), `rates caption lacks "${FIX.notPlottedTotal} … not plotted"`);
}));

ac('AC-15 — Bands and types carry their captions and the floor sentence', () => withPage('D', async (page) => {
  await openNational(page);
  const caps = (await captionsIn(page, '#cppp-bands')).join(' ');
  const body = norm(await page.locator('#cppp-bands').innerText().catch(() => ''));
  assert.ok(body, '#cppp-bands missing or empty');
  const last = rates.byValueBand[rates.byValueBand.length - 1];
  assert.ok(caps.includes(norm(`This is a rate over rows the pipeline could not value, not over a value band. In this scrape a missing value and a single bid travel together (median bids ${last.medianBids}).`)), `bands caption: "${caps.slice(0, 500)}"`);
  assert.ok(body.includes(norm(FIX.quality.contractValue.implausibleRule)), 'implausibleRule not printed beside the group');
  const svgText = await page.evaluate(() => [...document.querySelectorAll('#cppp-bands svg text')].map((t) => t.textContent).join(' | '));
  assert.ok(svgText.includes('category, and one method'), `types axis label missing (svg text: ${svgText.slice(0, 300)})`);
  assert.ok(body.includes(norm(FIX.quality.tenderType.note)), 'tenderType.note not printed verbatim');
  const no = FIX.ind.nonOpenTenderType;
  assert.ok(body.includes(norm(no.note)), 'nonOpenTenderType.note not printed beside Limited');
  assert.ok(body.includes(String(no.nonOpenLabelsLeftInOtherUnknown.n)), `figure ${fmt(no.nonOpenLabelsLeftInOtherUnknown.n)} not printed beside Limited`);
  if (rates.byPortalTenderType === undefined) assert.ok(/not emitted/.test(caps), 'bands caption does not say composition by portal and type is not emitted');
}));

ac('AC-16 — Timing captions: unequal bins, and the innocent reading at the same size', () => withPage('D', async (page) => {
  await openNational(page);
  const caps = (await captionsIn(page, '#cppp-timing')).join(' ');
  assert.ok(caps.includes(BINS_CAPTION), `timing captions lack "${BINS_CAPTION}"`);
  const rate = page.locator('#cppp-timing [data-rate]').first();
  assert.ok(await rate.count(), 'no [data-rate] in #cppp-timing');
  assertSentence(await text(rate), rateSentence(FIX.timing.shareLe2Days), 'timing rate');
  const nx = await rate.evaluate((el) => { const n = el.nextElementSibling; return n ? { innocent: n.hasAttribute('data-innocent'), text: __t.norm(n.textContent), size: getComputedStyle(n).fontSize, rateSize: getComputedStyle(el).fontSize } : null; });
  assert.ok(nx?.innocent, 'the next element sibling of the timing rate is not [data-innocent]');
  assert.equal(nx.text, norm(FIX.timing.innocentReading));
  assert.equal(nx.size, nx.rateSize, 'innocent reading font-size differs from the rate');
  const fy = await requireTwin(page, 'fymonth');
  const cm = requireCol(fy, 'fymonth', 'calendar month'); const note = requireCol(fy, 'fymonth', 'note');
  const march = fy.rows.find((r) => /^(3|mar(ch)?)$/i.test(r.cells[cm] ?? ''));
  assert.ok(march, 'no fymonth row whose calendar month is March');
  assert.equal(march.cells[note], 'see the financial-year reading');
  const target = await page.evaluate(() => { const t = document.querySelector('[data-twin="fymonth"]'); const ids = (t?.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean); return ids.map((id) => { const e = document.getElementById(id); return e ? { tag: e.tagName, text: __t.norm(e.textContent) } : null; }); });
  assert.ok(target.some((t) => t && t.tag === 'P' && t.text === norm(FIX.timing.innocentReading)), 'fymonth aria-describedby names no <p> holding the innocent reading');
}));

ac('AC-17 — The state portal is not India\'s states, and there is no map', () => withPage('D', async (page) => {
  await openNational(page);
  const caps = (await captionsIn(page, '#cppp-states')).join(' ');
  assert.ok(caps.includes(norm(STATES_CAPTION)), `states caption: "${caps.slice(0, 400)}"`);
  const r = await page.evaluate(() => {
    const s = document.getElementById('cppp-states'); const sec = __t.sec();
    return {
      exists: !!s,
      bigSvg: s ? [...s.querySelectorAll('svg')].some((svg) => svg.querySelectorAll('path').length >= 30) : null,
      listbox: s ? s.querySelectorAll('[role="listbox"]').length : null,
      map: [...sec.querySelectorAll('*')].some((el) => /^Map of India/.test(__t.accName(el))),
    };
  });
  assert.ok(r.exists, '#cppp-states missing');
  assert.ok(!r.bigSvg, '#cppp-states contains an svg with ≥ 30 paths (a map)');
  assert.equal(r.listbox, 0, '#cppp-states contains a listbox');
  assert.ok(!r.map, 'SEC contains an element named "Map of India…"');
}));

ac('AC-18 — Concentration prints its family, definition, naming rule and reading verbatim', () => withPage('D', async (page) => {
  await openNational(page);
  const t = await requireTwin(page, 'concentration');
  const cap = `${t.caption} ${t.described}`;
  for (const [k, v] of Object.entries({ family: concentration.family, hhiDefinition: concentration.hhiDefinition, namingRule: concentration.namingRule, innocentReading: concentration.innocentReading })) {
    assert.ok(cap.includes(norm(v)), `concentration caption lacks ${k} verbatim`);
  }
  const cs = FIX.quality.organisations.centralDistinctBuyers + FIX.quality.organisations.stateDistinctBuyers;
  assert.ok(cap.includes(`${FIX.conc.length} of ${cs} buyers`), `caption lacks "${fmt(FIX.conc.length)} of ${fmt(cs)} buyers"`);
  assert.ok(new RegExp(`${FIX.quality.winnerMarkers.unmarked} unmarked award rows \\(.+?\\) are counted, never named\\.`).test(cap), `caption lacks "${fmt(FIX.quality.winnerMarkers.unmarked)} unmarked award rows ({base}) are counted, never named."`);
  assert.ok(cap.includes(MOSTLY_UNMARKED.split(';')[0]), 'caption lacks the 50% rule');
  const ms = FIX.quality.winnerMarkers.msOnlyNamed;
  if (ms === undefined) assert.ok(cap.includes(norm(MS_MISSING)), 'caption lacks the M/s sentence for the absent field');
  else assert.ok(findSentence(cap, ['', { int: ms.n ?? ms }, ' of ', { int: ms.of ?? FIX.winners.size }, ' names shown are admitted by "M/s" alone and may be trading names of individuals.']), 'caption lacks the M/s count sentence');
}));

ac('AC-19 — The verification section leads with its plain reading and says what would upgrade it', () => withPage('D', async (page) => {
  await openNational(page);
  const items = [
    SAMPLE_LEAD, { sel: '[data-twin="agreement"]' },
    ...Object.values(sample.verdictRule), sample.finding, sample.redraw,
    NOT_ASKED_PARTIES, UPGRADE, HOW_TO_CHECK,
    // [Adjudicated] the seed is looked up as printed, `seed {seed}`: the bare number is a
    // substring of the section's dates and would resolve to the agreement caption.
    `seed ${sample.seed}`, sample.rng, { sel: '#cppp-sample pre' }, { sel: '[data-twin="sample"]' },
  ];
  const r = await page.evaluate((list) => {
    const root = document.getElementById('cppp-sample'); if (!root) return null;
    const els = list.map((it) => (typeof it === 'string' ? __t.deepest(root, it) : root.querySelector(it.sel)));
    const order = [];
    for (let i = 1; i < els.length; i += 1) order.push(!!(els[i - 1] && els[i] && els[i - 1] !== els[i] && (__t.follows(els[i - 1], els[i]) || els[i - 1].contains(els[i]))));
    const agreement = root.querySelector('[data-twin="agreement"]');
    const pre = [...root.querySelectorAll('pre')].find((p) => /CREATE TABLE cand|SELECT internal_id/.test(p.textContent));
    return {
      missing: els.map((e, i) => (e ? null : i)).filter((x) => x !== null),
      order, agreementCaption: agreement ? __t.norm(__t.captionOf(agreement)) : null,
      code: [...root.querySelectorAll('code')].some((c) => c.textContent.includes('A13h1')),
      shortfall: /strataShortfall|shortfall/i.test(root.textContent),
      preWidth: pre ? pre.getBoundingClientRect().width : null, rootWidth: root.getBoundingClientRect().width,
    };
  }, items);
  assert.ok(r, '#cppp-sample missing');
  assert.deepEqual(r.missing, [], `items missing from #cppp-sample: ${r.missing.map((i) => (typeof items[i] === 'string' ? items[i].slice(0, 60) : items[i].sel)).join(' | ')}`);
  r.order.forEach((ok, i) => assert.ok(ok, `order breaks between item ${i} and ${i + 1} (${typeof items[i + 1] === 'string' ? items[i + 1].slice(0, 50) : items[i + 1].sel})`));
  assert.ok(r.agreementCaption?.includes(AGREEMENT_CAPTION), `agreement caption "${r.agreementCaption}"`);
  assert.ok(r.code, 'the token pattern is not inside <code>');
  assert.ok(r.shortfall, 'strataShortfall not stated');
  assert.ok(r.preWidth !== null, 'no <pre> holding the draw SQL');
  assert.ok(r.preWidth >= 0.8 * r.rootWidth, `draw SQL pre is ${r.preWidth}px of ${r.rootWidth}px — not full width`);
}));

const SOURCE_LINE_RE = /^Source: .+ \(.+\), licence .+; scraper .+; scraped .+; pipeline .+; computed \d{4}-\d{2}-\d{2}\. Tier: reported\.$/;

ac('AC-20 — The source line is derived, printed twice, copied verbatim, and never a literal', () => withPage('D', async (page) => {
  await openNational(page);
  const lines = await page.evaluate(() => {
    const sec = __t.sec(); const q = document.getElementById('cppp-quality'); const prov = document.getElementById('cppp-provenance');
    return [...sec.querySelectorAll('[data-source-line]')].map((el) => ({ text: __t.norm(el.textContent), beforeQuality: !!(q && __t.follows(el, q)), inProvenance: !!(prov && prov.contains(el)) }));
  });
  assert.equal(lines.length, 2, `${lines.length} [data-source-line] in SEC`);
  assert.ok(lines.some((l) => l.beforeQuality) && lines.some((l) => l.inProvenance), 'source lines are not one in the head and one in #cppp-provenance');
  assert.equal(lines[0].text, lines[1].text, 'the two source lines differ');
  if (!FIX.dataset) {
    assert.equal(lines[0].text, norm(ORIGIN_MISSING));
    const gaps = await page.locator('[data-gap]').allInnerTexts();
    assert.ok(gaps.some((g) => includes(g, ORIGIN_MISSING)), 'no [data-gap] line carries the missing-origin sentence');
  } else {
    assert.match(lines[0].text, SOURCE_LINE_RE);
    assert.ok(lines[0].text.includes(FIX.gen) && lines[0].text.includes(`computed ${FIX.asOf}`), 'source line lacks pipeline/computed');
  }
  await control(page, 'Copy citation').click();
  await page.waitForTimeout(300);
  const clip = norm(await page.evaluate(() => navigator.clipboard.readText()));
  assert.equal(clip, lines[0].text, 'clipboard ≠ source line');
  const announced = await page.evaluate(() => [...document.querySelectorAll('[role="status"], [aria-live]')].some((e) => e.textContent.trim().length > 0));
  assert.ok(announced, 'no [role="status"] or aria-live region announces the copy');
  // Source guard on the built assets.
  const assets = readdirSync(join(full.dir, 'assets')).filter((f) => f.endsWith('.js'));
  for (const f of assets) {
    const js = readFileSync(join(full.dir, 'assets', f), 'utf8');
    if (!FIX.dataset) assert.ok(!js.includes('rumourscape'), `${f} contains a dataset name literal`);
    else if (js.includes(FIX.dataset.name)) assert.ok(js.includes('sha256_16'), `${f} names the dataset but is not a data chunk`);
  }
}));

ac('AC-21 — The gaps panel is at findings size, before the footer, and each line is derived', () => withPage('D', async (page) => {
  await openNational(page);
  const s = await statesAppearing(page);
  const r = await page.evaluate(() => {
    const gaps = document.getElementById('cppp-gaps'); const prov = document.getElementById('cppp-provenance'); const rate = __t.sec().querySelector('[data-rate]');
    if (!gaps) return null;
    return {
      beforeProv: !!(prov && __t.follows(gaps, prov)), inFooter: !!gaps.closest('footer'),
      lines: [...gaps.querySelectorAll('[data-gap]')].map((g) => ({ text: __t.norm(g.textContent), size: getComputedStyle(g).fontSize, statesLink: !!g.querySelector('a[href$="#cppp-states"]') })),
      rateSize: rate ? getComputedStyle(rate).fontSize : null,
      timing: __t.norm(document.getElementById('cppp-timing')?.textContent ?? ''),
    };
  });
  assert.ok(r, '#cppp-gaps missing');
  assert.ok(r.beforeProv, '#cppp-gaps does not precede #cppp-provenance');
  assert.ok(!r.inFooter, '#cppp-gaps is inside a footer');
  assert.ok(r.lines.length, 'no [data-gap] lines');
  assert.ok(r.rateSize, 'no [data-rate] to compare against');
  for (const l of r.lines) assert.equal(l.size, r.rateSize, `gap line "${l.text.slice(0, 60)}" is ${l.size}, findings are ${r.rateSize}`);
  const has = (pred, label) => assert.ok(r.lines.some(pred), `no gap line: ${label}`);
  has((l) => l.text.includes(`${FIX.matchSum} of ${sample.rows.length}`) && /checkable/.test(l.text), `${FIX.matchSum} of ${sample.rows.length} … checkable`);
  has((l) => l.text.includes(norm(ELECTION_SENTENCE)), 'Election-calendar sentence');
  has((l) => l.text.includes(norm(NO_COMPARATOR)), 'no external comparator');
  if (rates.byPortalTenderType === undefined) has((l) => /tender-type composition/.test(l.text) && /not emitted/.test(l.text), 'per-portal tender-type composition not emitted');
  // [Adjudicated] the states table is thresholded at n ≥ 30, so the line says what the data can: no buyer at that threshold, not absence.
  has((l) => l.text.includes(`${s.nodata.length} states and UTs have no buyer with n ≥ 30 on the state portal`) && l.statesLink, `${s.nodata.length} states and UTs have no buyer with n ≥ 30 on the state portal (with link)`);
  if (!FIX.quality.organisations.statePortalNames) assert.ok(!r.lines.some((l) => /absent from the state portal/.test(l.text)), 'a gap line claims absence from the state portal while statePortalNames is not emitted');
  has((l) => l.text.includes(NO_COMMENT_GAP), NO_COMMENT_GAP);
  for (const f of absentPrereqs) has((l) => l.text.includes(f), `prerequisite field ${f}`);
  assert.ok(r.timing.includes('Election-calendar clustering is not computed'), '#cppp-timing lacks the Election-calendar sentence');
}));

/** SEC's own words: its innerText with every data string removed. */
function ownWords(textIn) {
  let t = textIn;
  for (const s of FIX.data) if (t.includes(s)) t = t.split(s).join(' ');
  return t;
}

ac('AC-22 — The page\'s own words carry no party or leader', () => withPage('D', async (page) => {
  await openNational(page, '&rows=all&buyers=all');
  const own = ownWords(await secText(page));
  const m1 = own.match(/\b(BJP|Congress|UPA|NDA|Modi|Gandhi)\b/);
  assert.equal(m1, null, `party or leader in the page's own words: "${m1?.[0]}" near "${own.slice(Math.max(0, (m1?.index ?? 0) - 60), (m1?.index ?? 0) + 60)}"`);
  const m2 = own.match(/\b(opposition|ruling|government of the day)\b/i);
  assert.equal(m2, null, `partisan frame in the page's own words: "${m2?.[0]}"`);
}));

ac('AC-23 — Two dates, always labelled', () => withPage('D', async (page) => {
  await openNational(page);
  // [Adjudicated] a verbatim data string that happens to carry the asOf date (the caveat, the
  // redraw text) and the verification line's `on {fetch date}` are not asOf printed alone.
  const dataDates = FIX.data.filter((s) => s.includes(FIX.asOf)).map(norm);
  const r = await page.evaluate(([asOf, dataDates, fetchDate]) => {
    const sec = __t.sec(); const walker = document.createTreeWalker(sec, NodeFilter.SHOW_TEXT);
    const bad = []; let n;
    while ((n = walker.nextNode())) {
      if (!n.nodeValue.includes(asOf)) continue;
      const block = __t.norm(__t.block(n.parentElement).textContent);
      const node = __t.norm(n.nodeValue);
      if (dataDates.some((s) => s.includes(node) || block.includes(s))) continue;
      if (/^Verification:/.test(block) && block.includes(`on ${fetchDate}`)) continue;
      const i = block.indexOf('computed'); const j = block.indexOf(asOf);
      if (!(i >= 0 && i < j)) bad.push(block.slice(0, 120));
    }
    return { bad, captions: [...sec.querySelectorAll('caption')].map((c) => __t.norm(c.textContent)) };
  }, [FIX.asOf, dataDates, FIX.fetchDate]);
  assert.deepEqual(r.bad, [], `asOf printed without "computed" before it: ${r.bad.join(' | ')}`);
  assert.ok(r.captions.length, 'no caption in SEC');
  for (const c of r.captions) {
    assert.ok(c.includes('scraped '), `caption lacks "scraped ": "${c.slice(0, 120)}"`);
    assert.ok(c.includes(`computed ${FIX.asOf}`), `caption lacks "computed ${FIX.asOf}": "${c.slice(0, 120)}"`);
    if (!FIX.scrapedAt) {
      for (const m of c.matchAll(/scraped (.{0,60})/g)) assert.ok(m[1].startsWith(SCRAPE_DATE_MISSING), `"scraped" not followed by "${SCRAPE_DATE_MISSING}" in "${c.slice(0, 160)}"`);
      const dates = [...c.matchAll(/\d{4}-\d{2}-\d{2}/g)].map((m) => m[0]).filter((d) => d !== FIX.asOf);
      assert.deepEqual(dates, [], `caption carries another date ${dates.join(', ')}: "${c.slice(0, 160)}"`);
    }
  }
}));

// ===========================================================================
// 3. Denominators
// ===========================================================================

const fact = (page, n) => page.locator(`[data-strip-fact="${n}"]`).first();

ac('AC-24 — The strip carries counts only, in order, and releases where the registers begin', () => withPage('D', async (page) => {
  await openNational(page);
  const want = [
    `${fmt(FIX.dedup)} award decisions after dedup`, `from ${fmt(FIX.rows)} raw rows`, `${fmt(FIX.denomN)} in the single-bidder denominator`,
    `${fmt(FIX.tids)} distinct tender ids`, null, `computed ${FIX.asOf}`,
  ];
  for (let i = 1; i <= 6; i += 1) {
    assert.ok(await fact(page, i).count(), `[data-strip-fact="${i}"] missing`);
    const t = await text(fact(page, i));
    if (i === 5) {
      if (FIX.scrapedAt) assert.equal(t, `scraped ${FIX.scrapedAt.value}`);
      else assert.match(t, new RegExp(`^(scraped )?${esc(SCRAPE_DATE_STRIP)}$`), `fact 5 "${t}"`);
    } else assert.equal(t, norm(want[i - 1]), `fact ${i}`);
  }
  const strip = await fact(page, 1).evaluate((el) => { for (let e = el; e; e = e.parentElement) if (getComputedStyle(e).position === 'sticky') return { text: e.innerText, ok: true }; return { ok: false }; });
  assert.ok(strip.ok, 'no sticky ancestor of the strip facts');
  assert.ok(!strip.text.includes('%'), 'strip carries a percentage');
  const bottom = await page.evaluate(() => {
    const sec = __t.sec(); const h2 = [...document.querySelectorAll('h2')].find((h) => !sec.contains(h) && __t.follows(sec, h));
    if (!h2) return null;
    h2.scrollIntoView({ block: 'start' });
    const f = document.querySelector('[data-strip-fact="1"]'); let e = f; while (e && getComputedStyle(e).position !== 'sticky') e = e.parentElement;
    return e ? e.getBoundingClientRect().bottom : null;
  });
  assert.ok(bottom !== null, 'no register h2 after SEC or no sticky strip');
  assert.ok(bottom <= 0, `strip bottom is ${bottom}px with the first register h2 at the top — it followed into the registers`);
}));

ac('AC-25 — The figure sentence comes first, matches the data, and copies with its citation', () => withPage('D', async (page) => {
  await openNational(page);
  const fig = page.locator('[data-figure]').first();
  assert.ok(await fig.count(), '[data-figure] missing');
  const r = await fig.evaluate((el) => { const svg = __t.sec().querySelector('svg'); return { before: !!svg && __t.follows(el, svg), font: getComputedStyle(el).fontFamily, text: __t.norm(el.textContent) }; });
  assert.ok(r.before, '[data-figure] does not precede the first svg in SEC');
  const sb = FIX.ind.singleBidding; const c = sb.byPortal.find((p) => p.portal === 'central'); const s = sb.byPortal.find((p) => p.portal === 'state');
  assertSentence(r.text, [
    '', { int: sb.count }, ' of ', { int: sb.familySize }, ' award decisions (', { pct: sb.ratePct }, '%, 95% interval ', { pct: sb.wilson95[0] }, ' to ', { pct: sb.wilson95[1] }, ') received one bid. Central portal: ',
    { int: c.count }, ' of ', { int: c.familySize }, ' (', { pct: c.ratePct }, '%); state portal: ', { int: s.count }, ' of ', { int: s.familySize }, ' (', { pct: s.ratePct }, '%). Dataset-only; scraped ', { any: true }, '; computed ', FIX.asOf, '; source: ', { any: true }, '.',
  ], 'figure sentence');
  assert.match(r.text, /\d of \d.*%.*interval.*computed/);
  assert.match(r.font, /mono/i, `figure font-family "${r.font}"`);
  const source = norm(await page.locator('[data-source-line]').first().innerText());
  await control(page, 'Copy figure').click();
  await page.waitForTimeout(300);
  const clip = norm(await page.evaluate(() => navigator.clipboard.readText()));
  assert.ok(clip.startsWith(r.text), `clipboard does not start with the figure sentence: "${clip.slice(0, 120)}"`);
  assert.ok(clip.endsWith(source), `clipboard does not end with the source line: "${clip.slice(-160)}"`);
}));

ac('AC-26 — The denominator sentence sits under the chart', () => withPage('D', async (page) => {
  await openNational(page);
  const between = await page.evaluate(() => {
    const sect = document.getElementById('cppp-rates'); const svg = sect?.querySelector('svg'); const tw = sect?.querySelector('[data-twin="rates-central"]');
    if (!svg || !tw) return null;
    const r = document.createRange(); r.setStartAfter(svg); r.setEndBefore(tw); return __t.norm(r.toString());
  });
  assert.ok(between !== null, '#cppp-rates lacks its svg or rates-central twin');
  assert.ok(between.includes(norm(FIX.denomText)), 'denominator text missing under the chart');
  assert.ok(between.includes(String(FIX.denomN)), `${fmt(FIX.denomN)} missing under the chart`);
  assert.ok(between.includes(String(FIX.excl)), `${fmt(FIX.excl)} missing under the chart`);
  assert.ok(/excluded/.test(between), '"excluded" missing under the chart');
}));

ac('AC-27 — Families: one row per family, every identity sums exactly, every caption links to its row', () => withPage('D', async (page) => {
  await openNational(page);
  const t = await requireTwin(page, 'families');
  assert.deepEqual(t.headers.map((h) => h.text), ['family definition', 'N', 'used in', `reconciles to ${FIX.dedup}`].map(norm));
  // Distinct families: the rates denominator, each indicator's, the timing family, the concentration family.
  assert.ok(t.rows.length >= familyStrings.length && t.rows.length <= familyStrings.length + 1, `${t.rows.length} rows for ${familyStrings.length} distinct family definitions (+1 if the timing family is worded on its own)`);
  for (const f of familyStrings) assert.ok(t.rows.some((r) => r.cells[0].includes(norm(f))), `no row for family "${f.slice(0, 60)}"`);
  const rec = 3;
  for (const r of t.rows) {
    const cell = r.cells[rec] ?? '';
    if (cell.includes('=')) {
      const m = cell.match(/^(\d+) \+ (\d+)(?: \+ (\d+))? = (\d+)$/);
      assert.ok(m, `reconciliation cell "${cell}" is not "a + b (+ c) = d"`);
      const sum = int(m[1]) + int(m[2]) + (m[3] ? int(m[3]) : 0);
      assert.equal(sum, int(m[4]), `arithmetic fails in "${cell}"`);
      assert.equal(int(m[4]), FIX.dedup, `"${cell}" does not reconcile to ${FIX.dedup}`);
    } else assert.ok(cell === 'complement not emitted' || cell.endsWith('; complement not emitted'), `reconciliation cell "${cell}" — [Adjudicated] the concentration row prefixes its buyer count`);
  }
  assert.ok(t.rows.some((r) => r.cells[rec] === `${FIX.denomN} + ${FIX.excl} = ${FIX.dedup}`), 'no rates-denominator identity row');
  assert.ok(t.rows.some((r) => r.cells[rec] === `${timing.n} + ${timing.excludedAocBeforeClosing} + ${timing.excludedDateMissing} = ${FIX.dedup}`), 'no timing identity row');
  const conc = t.rows.find((r) => r.cells[0].includes(norm(concentration.family)));
  assert.ok(conc, 'no concentration family row');
  assert.equal(int(conc.cells[1]), FIX.conc.reduce((s, b) => s + b.awards, 0), 'concentration N ≠ Σ awards');
  const cs = FIX.quality.organisations.centralDistinctBuyers + FIX.quality.organisations.stateDistinctBuyers;
  assert.ok(conc.cells[rec].includes(`${FIX.conc.length} of ${cs}`), `concentration cell "${conc.cells[rec]}"`);
  const caps = await page.evaluate(() => ['#cppp-rates', '#cppp-bands', '#cppp-timing', '#cppp-redflags', '#cppp-concentration'].map((id) => ({ id, captions: [...(document.querySelector(id)?.querySelectorAll('caption') ?? [])].map((c) => ({ text: c.textContent.trim().slice(0, 60), link: !!c.querySelector('a[href*="#cppp-families"]') })) })));
  for (const s of caps) {
    assert.ok(s.captions.length, `${s.id} has no caption`);
    for (const c of s.captions) assert.ok(c.link, `${s.id} caption "${c.text}" has no link to #cppp-families`);
  }
}));

ac('AC-28 — Every rate row shows n and an interval', () => withPage('D', async (page) => {
  await openNational(page, '&buyers=all&rows=all');
  for (const name of ['rates-central', 'rates-state', 'bands', 'types', 'buyers']) {
    const t = await requireTwin(page, name);
    const nCol = requireCol(t, name, 'n', 'awards in denominator');
    const iCol = t.headers.findIndex((h) => h.text.includes('95% interval'));
    assert.ok(iCol >= 0, `${name}: no interval column`);
    assert.ok(t.headers[iCol].text.includes('95% interval (Wilson), %'), `${name}: interval header "${t.headers[iCol].text}"`);
    const rateRows = t.rows.filter((r) => r.text.includes('%'));
    assert.ok(rateRows.length, `${name}: no row with a percentage`);
    for (const r of rateRows) {
      const n = int(r.cells[nCol]);
      assert.ok(Number.isInteger(n) && n >= 1, `${name} row "${r.text.slice(0, 50)}": n cell "${r.cells[nCol]}"`);
      const iv = r.cells[iCol];
      assert.ok(/^\d+(\.\d)? to \d+(\.\d)?$/.test(iv) || iv === 'interval not computed', `${name} row "${r.text.slice(0, 50)}": interval cell "${iv}"`);
    }
  }
}));

ac('AC-29 — Each indicator card is a labelled list with its family share', () => withPage('D', async (page) => {
  await openNational(page);
  const cards = await page.evaluate(() => [...document.querySelectorAll('#cppp-redflags section')].filter((s) => s.querySelector('h4')).map((s) => {
    const dl = s.querySelector('dl');
    const dts = dl ? [...dl.querySelectorAll(':scope > dt, :scope > div > dt')].map((d) => __t.norm(d.textContent)) : [];
    const dds = dl ? [...dl.querySelectorAll(':scope > dd, :scope > div > dd')] : [];
    const tbl = dds[5]?.querySelector('table');
    return {
      h4: __t.norm(s.querySelector('h4').textContent), dts,
      family: dds[1] ? __t.norm(dds[1].textContent) : null,
      rate: dds[3]?.querySelector('[data-rate]') ? __t.norm(dds[3].querySelector('[data-rate]').textContent) : null,
      byPortal: tbl ? [...tbl.querySelectorAll('tbody tr')].map((tr) => __t.norm(tr.textContent)) : null,
    };
  }));
  assert.equal(cards.length, FIX.indList.length, `${cards.length} indicator cards`);
  for (const ind of FIX.indList) {
    const name = INDICATOR_H4[ind.indicator] ?? ind.indicator;
    const card = cards.find((c) => c.h4 === name || c.h4.includes(ind.indicator));
    assert.ok(card, `no card "${name}"`);
    const want = ['Definition', 'Family', 'Count', 'Rate', 'Innocent reading', 'By portal'];
    want.forEach((w, i) => assert.ok((card.dts[i] ?? '').startsWith(w), `${name}: dt ${i} "${card.dts[i]}" should start "${w}"`));
    assert.ok(card.family?.includes(norm(ind.familyDefinition)), `${name}: Family dd lacks the family definition`);
    assertSentence(card.family, ['', { int: ind.familySize }, ', which is ', { pct: (100 * ind.familySize) / FIX.dedup }, '% of the ', { int: FIX.dedup }, ' award decisions after dedup'], `${name}: family share`);
    assert.ok(card.rate, `${name}: Rate dd has no [data-rate]`);
    assertSentence(card.rate, rateSentence(ind), `${name}: rate`);
    assert.ok(card.byPortal, `${name}: By portal dd has no table`);
    assert.equal(card.byPortal.length, 2, `${name}: by-portal rows`);
    for (const p of ind.byPortal) {
      const row = card.byPortal.find((r) => new RegExp(`^${p.portal}\\b`).test(r));
      assert.ok(row, `${name}: no by-portal row for ${p.portal}`);
      assert.ok(row.includes(String(p.count)), `${name} ${p.portal}: count ${fmt(p.count)} missing in "${row}"`);
    }
  }
}));

ac('AC-30 — The named-buyer table leads with portal base rates and states its frame', () => withPage('D', async (page) => {
  await openNational(page);
  const t = await requireTwin(page, 'buyers');
  BUYERS_HEADERS.forEach((h, i) => assert.ok((t.headers[i]?.text ?? '').includes(norm(h)), `buyers header ${i} "${t.headers[i]?.text}" should read "${h}"`));
  const nCol = colIndex(t, 'awards in denominator'); const sCol = colIndex(t, 'single-bidder awards'); const pCol = colIndex(t, 'single-bidder %');
  const sb = FIX.ind.singleBidding;
  ['central', 'state'].forEach((p, i) => {
    const row = t.rows[i];
    assert.ok(row?.text.includes(`${p} portal, every award in the family`), `row ${i} reads "${row?.text}"`);
    const bp = sb.byPortal.find((x) => x.portal === p);
    assert.equal(int(row.cells[nCol]), bp.familySize, `${p} base row n`);
    assert.equal(int(row.cells[sCol]), bp.count, `${p} base row count`);
    assert.ok(samePct(parseFloat(row.cells[pCol]), bp.ratePct), `${p} base row % "${row.cells[pCol]}" ≠ ${bp.ratePct}`);
  });
  const cap = `${t.caption} ${t.described}`;
  assert.ok(cap.includes(norm(redflags.singleBiddingByBuyerNote)), 'caption lacks singleBiddingByBuyerNote');
  const fam = redflags.singleBiddingByBuyerFamily;
  if (fam) assert.ok(cap.includes(`25 of ${fam.eligibleBuyers} buyers with at least ${fam.threshold} awards`), 'caption lacks the frame');
  else assert.ok(cap.includes('the number of eligible buyers is not yet a field'), 'caption lacks "the number of eligible buyers is not yet a field"');
}));

ac('AC-31 — Every filter shows its effect on the denominator, live', () => withPage('D', async (page) => {
  await openNational(page);
  const N = FIX.conc.length; const k = FIX.conc.filter((b) => b.portal === 'state').length;
  const effect = portalGroup(page).locator('xpath=..').locator('[data-effect]').first();
  const eff = (await effect.count()) ? effect : page.locator('#cppp-concentration [data-effect]').first();
  assert.ok(await eff.count(), 'no [data-effect] beside the portal group');
  assert.equal(await text(eff), `${N} → ${N} buyers`);
  await portalButton(page, 'state').click();
  await waitForParam(page, 'portal', 'state');
  await page.waitForFunction((want) => [...document.querySelectorAll('#cppp-concentration [data-effect]')].some((e) => window.__t.norm(e.textContent) === want), `${N} → ${k} buyers`, { timeout: ACTION_TIMEOUT }).catch(() => {});
  assert.equal(await text(eff), `${N} → ${k} buyers`);
  const live = norm(await page.locator('#cppp-concentration [aria-live="polite"]').first().innerText());
  assert.ok(live.includes(`${k} buyers`) && live.includes(`showing ${Math.min(25, k)}`), `aria-live reads "${live}"`);
  assert.equal(await page.locator('[data-twin="concentration"] tbody tr').count(), Math.min(25, k));
  const rf = page.locator('#cppp-redflags [data-effect]').first();
  assert.ok(await rf.count(), 'no [data-effect] on the buyers control');
  const rfText = await text(rf);
  assert.ok(/^25 of \d+ buyers/.test(rfText) || /not yet a field/.test(rfText), `buyers effect "${rfText}"`);
  await openNational(page, '&buyers=all');
  assert.equal(await text(page.locator('#cppp-redflags [data-effect]').first()), `${FIX.byOrg.length - 1} buyers and the pooled row`);
}));

ac('AC-32 — Exclusions are printed with their base, here and in the quality table', () => withPage('D', async (page) => {
  await openNational(page);
  const tm = norm(await page.locator('#cppp-timing').innerText().catch(() => ''));
  assert.ok(tm, '#cppp-timing missing');
  assert.ok(tm.includes(norm(`AOC dated before closing: ${fmt(FIX.quality.dates.aocBeforeClosing)} raw rows (quality table); ${fmt(timing.excludedAocBeforeClosing)} award decisions after dedup, excluded here. A date-order defect, excluded, not read as conduct.`)), 'AOC-before-closing exclusion sentence missing');
  assert.ok(new RegExp(`${timing.excludedDateMissing} award decisions`).test(tm), `missing-date sentence with "${fmt(timing.excludedDateMissing)} award decisions" missing`);
  const q = await requireTwin(page, 'quality');
  const row = q.rows.find((r) => r.header.includes('AOC dated before closing'));
  assert.ok(row, 'quality twin has no "AOC dated before closing" row');
  assert.ok(row.cells.some((c) => c === String(FIX.quality.dates.aocBeforeClosing)), `count ${fmt(FIX.quality.dates.aocBeforeClosing)} missing in "${row.text}"`);
  assert.ok(row.cells.some((c) => c === 'raw rows'), `base "raw rows" missing in "${row.text}"`);
  const names = await page.evaluate(() => [...document.querySelectorAll('#cppp-timing svg[role="img"]')].map((s) => __t.norm(__t.accName(s))));
  assert.ok(names.length, 'no svg[role="img"] in #cppp-timing');
  for (const n of names) {
    assert.ok(n.includes(`n = ${timing.n}`), `svg name "${n}" lacks n = ${fmt(timing.n)}`);
    assert.ok(n.includes(String(timing.excludedAocBeforeClosing)) && n.includes(String(timing.excludedDateMissing)), `svg name "${n}" lacks the exclusion figures`);
  }
}));

ac('AC-33 — The quality table is a key/value table with three dedup readings and thresholds in words', () => withPage('D', async (page) => {
  await openNational(page);
  const q = await requireTwin(page, 'quality');
  const r = await page.evaluate(() => {
    const t = document.querySelector('[data-twin="quality"]'); const sect = document.getElementById('cppp-quality') ?? t.parentElement;
    const ps = [...sect.querySelectorAll('p')].filter((p) => __t.follows(p, t));
    const label = [...sect.querySelectorAll('*')].find((el) => el.textContent.trim() === 'Read this first about the data');
    const walker = document.createTreeWalker(t, NodeFilter.SHOW_TEXT); const pow = []; let n;
    while ((n = walker.nextNode())) if (/10\^12|10¹²/.test(n.nodeValue) && !n.parentElement.closest('code')) pow.push(n.nodeValue.trim());
    const summaries = [...sect.querySelectorAll('details > summary')].map((s) => __t.norm(s.textContent));
    const pres = [...sect.querySelectorAll('details pre')].map((p) => p.textContent);
    return {
      firstP: ps[0] ? __t.norm(ps[0].textContent) : null, label: !!label && __t.visible(label), sectText: __t.norm(sect.textContent), pow, summaries, pres,
    };
  });
  const r2 = await page.evaluate((classes) => {
    const sect = document.getElementById('cppp-quality') ?? document.querySelector('[data-twin="quality"]').parentElement;
    return classes.map((c) => [...sect.querySelectorAll('*')].some((el) => el.children.length === 0 && el.textContent.trim() === c && !el.closest('details') && __t.visible(el)));
  }, Object.keys(FIX.quality.tenderType.normalisedCounts));
  assert.ok(r, '#cppp-quality could not be read');
  assert.equal(r.firstP, norm(FIX.quality.readMeFirst), 'the first paragraph before the quality table is not readMeFirst');
  assert.ok(r.label, 'no visible label "Read this first about the data"');
  assert.deepEqual(q.headers.map((h) => h.text), QUALITY_HEADERS);
  for (const row of q.rows) {
    assert.ok(row.hasRowHeader, `row "${row.text.slice(0, 50)}" has no th[scope="row"]`);
    assert.ok(['rows', 'tender ids', 'award decisions'].includes(row.cells[2]), `row "${row.header}": what-is-counted "${row.cells[2]}"`);
    assert.ok(/^\d+(\.\d)?%$/.test(row.cells[4] ?? '') || row.cells[4] === '—', `row "${row.header}": share "${row.cells[4]}"`);
  }
  for (const alt of [FIX.quality.afterDedup.alternativeOnePerTenderId, FIX.quality.afterDedup.alternativeOnePerTenderBidder]) {
    assert.ok(q.rows.some((row) => row.header.includes(norm(`Alternative rule, NOT applied — ${alt.rule}`))), `no row "Alternative rule, NOT applied — ${alt.rule.slice(0, 40)}…"`);
  }
  const min = Math.min(FIX.quality.afterDedup.rows, FIX.quality.afterDedup.alternativeOnePerTenderId.rows, FIX.quality.afterDedup.alternativeOnePerTenderBidder.rows);
  const h0 = FIX.quality.duplicates.heaviestTenderIds[0];
  assert.ok(r.sectText.includes(norm(`How many award decisions the scrape holds depends on the rule: between ${fmt(min)} and ${fmt(FIX.dedup)}. This page uses ${fmt(FIX.dedup)}. The smallest reading counts year/organisation buckets such as ${h0.tender_id} (${fmt(h0.rows)} rows, ${fmt(h0.distinct_bidders)} bidders) as one tender.`)), 'dedup-range sentence missing');
  assert.deepEqual(r.pow, [], `10^12 outside <code>: ${r.pow.join(' | ')}`);
  assert.ok(r.sectText.includes('over ₹1 lakh crore (10^12 rupees)'), 'phrase "over ₹1 lakh crore (10^12 rupees)" missing');
  Object.keys(FIX.quality.tenderType.normalisedCounts).forEach((c, i) => assert.ok(r2[i], `normalised class "${c}" not visible outside details`));
  assert.ok(r.summaries.some((s) => s === `${FIX.quality.tenderType.rawValues.length} raw spellings → 5 normalised classes`), `summaries: ${r.summaries.join(' | ')}`);
  const terms = FIX.quality.winnerMarkers.regex.split('|').length;
  assert.ok(r.summaries.some((s) => s.includes(`${terms} terms`)), `no summary naming the marker regex with ${terms} terms`);
  assert.ok(r.pres.some((p) => /CREATE OR REPLACE VIEW dedup/.test(p)), 'dedup SQL is not in a details > pre');
  assert.ok(r.pres.some((p) => p.includes(h0.tender_id)), 'heaviest-id list is not in a details > pre');
}));

ac('AC-34 — States on the state portal are counted exactly as emitted', () => withPage('D', async (page) => {
  await openNational(page);
  const s = await statesAppearing(page);
  const nCol = s.headers.findIndex((h) => h.includes('award decisions in the denominator'));
  const bCol = s.headers.findIndex((h) => h.includes('buyers with n ≥ 30') || h.includes('buyers with n >= 30'));
  assert.ok(nCol >= 0 && bCol >= 0, `states headers: ${s.headers.join(' | ')}`);
  for (const p of FIX.stateKeys) {
    const rows = FIX.byOrg.filter((r) => r.portal === 'state' && r.key.split(' / ')[0] === p);
    const row = s.rows.find((r) => r.cells[0] === norm(p));
    assert.ok(row, `no states row whose first cell is exactly "${p}"`);
    assert.equal(int(row.cells[nCol]), rows.reduce((a, r) => a + r.n, 0), `${p}: award decisions`);
    assert.equal(int(row.cells[bCol]), rows.length, `${p}: buyers with n ≥ 30`);
    if (FIX.states.includes(p)) assert.ok(!s.unmatched.includes(norm(p)), `"${p}" is a state name but sits under "spellings that match no state name"`);
  }
  for (const u of s.unmatched) assert.ok(!FIX.states.includes(u), `"${u}" matches a state name exactly but sits under the unmatched heading`);
  for (const n of s.nodata) assert.ok(FIX.states.includes(n) && !FIX.stateKeys.includes(n), `hatched row "${n}" is not an absent state name`);
  assert.ok(s.nodata.length >= FIX.states.length - s.matched.length, `${s.nodata.length} hatched rows for ${FIX.states.length} states with ${s.matched.length} matched rows`);
}));

// ===========================================================================
// 4. No-data is never zero
// ===========================================================================

ac('AC-35 — Every byPortalYear row is in a twin: plotted, or listed as not plotted with its reason', () => withPage('D', async (page) => {
  await openNational(page);
  for (const p of ['central', 'state']) {
    const t = await requireTwin(page, `rates-${p}`);
    assert.equal(t.rows.length, FIX.years[p].length, `${p}: rows`);
    const np = t.rows.filter((r) => r.notPlotted);
    assert.equal(np.length, FIX.notPlotted[p].length, `${p}: [data-not-plotted] rows`);
    for (const r of t.rows) assert.ok(r.hasRowHeader && FIX.years[p].some((y) => r.header.startsWith(`${p} ${y.year}`)), `${p}: row header "${r.header}" is not "{portal} {year}"`);
    for (const y of FIX.notPlotted[p]) {
      const row = np.find((r) => r.header.startsWith(`${p} ${y.year}`));
      assert.ok(row, `${p} ${y.year}: not listed as not plotted`);
      assert.ok(row.cells.includes(reasonNotPlotted(y)), `${p} ${y.year}: reason "${reasonNotPlotted(y)}" not in cells ${row.cells.join(' | ')}`);
    }
    if (np.length) {
      const headed = await page.evaluate((name) => { const t = document.querySelector(`[data-twin="${name}"]`); return [...t.querySelectorAll('th, tr')].some((el) => /not plotted/.test(el.textContent)); }, `rates-${p}`);
      assert.ok(headed, `${p}: no heading row or th reading "not plotted"`);
    }
    assert.equal(await page.locator(`#cppp-rates svg [data-mark="point"][data-portal="${p}"]`).count(), FIX.plotted[p].length, `${p}: plotted points`);
  }
}));

ac('AC-36 — An in-range year with n < 30 keeps a hatched slot labelled n < 30', async (t) => {
  await withPage('D', async (page) => {
    await openNational(page);
    for (const p of ['central', 'state']) {
      for (const y of FIX.hatchYears[p]) {
        const mark = page.locator(`#cppp-rates [data-mark="hatch"][data-portal="${p}"][data-year="${y.year}"]`);
        assert.equal(await mark.count(), 1, `${p} ${y.year}: hatch mark`);
        assert.ok(await mark.evaluate((el) => el.hasAttribute('data-nodata') || !!el.closest('[data-nodata]')), `${p} ${y.year}: hatch lacks [data-nodata]`);
        assert.ok(await page.evaluate(() => [...document.querySelectorAll('#cppp-rates svg text')].some((tx) => /n < 30/.test(tx.textContent) && __t.visible(tx))), `${p} ${y.year}: no visible "n < 30" label`);
        assert.equal(await page.locator(`#cppp-rates [data-mark="point"][data-portal="${p}"][data-year="${y.year}"]`).count(), 0, `${p} ${y.year}: a point exists for a hatched year`);
      }
    }
    if (!FIX.hatchYears.central.length && !FIX.hatchYears.state.length) {
      assert.ok(await page.locator('#cppp-rates').count(), '#cppp-rates missing');
      assert.equal(await page.locator('#cppp-rates [data-mark="hatch"]').count(), 0, 'hatch marks exist although no year needs one');
    }
  });
  if (!FIX.hatchYears.central.length && !FIX.hatchYears.state.length) t.skip('SKIPPED: no in-range year with n < 30 in this data');
});

/** Every vertex drawn by lines, polylines and paths in the rates svg. */
const RATES_VERTICES = () => {
  const svg = document.querySelector('#cppp-rates svg'); const pts = [];
  for (const l of svg.querySelectorAll('line')) pts.push([+l.getAttribute('x1'), +l.getAttribute('y1')], [+l.getAttribute('x2'), +l.getAttribute('y2')]);
  for (const p of svg.querySelectorAll('polyline, polygon')) { const nums = (p.getAttribute('points') ?? '').trim().split(/[\s,]+/).map(Number); for (let i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]); }
  for (const p of svg.querySelectorAll('path')) { if (p.hasAttribute('data-ribbon')) continue; const nums = (p.getAttribute('d') ?? '').replace(/[a-zA-Z]/g, ' ').trim().split(/[\s,]+/).map(Number).filter((x) => !Number.isNaN(x)); for (let i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]); }
  return pts;
};
const markCentre = (el) => {
  if (el.tagName === 'circle') return [+el.getAttribute('cx'), +el.getAttribute('cy')];
  if (el.tagName === 'rect') return [+el.getAttribute('x') + (+el.getAttribute('width')) / 2, +el.getAttribute('y') + (+el.getAttribute('height')) / 2];
  const b = el.getBBox(); return [b.x + b.width / 2, b.y + b.height / 2];
};

ac('AC-37 — Thin coverage is hollow and disconnected', () => withPage('D', async (page) => {
  await openNational(page);
  assert.ok(FIX.thin.central.length + FIX.thin.state.length, 'SKIPPED: no thin year in this data');
  for (const p of ['central', 'state']) {
    const t = await requireTwin(page, `rates-${p}`);
    for (const y of FIX.thin[p]) {
      const mark = page.locator(`#cppp-rates [data-mark="point"][data-portal="${p}"][data-year="${y.year}"]`);
      assert.equal(await mark.count(), 1, `${p} ${y.year}: thin mark`);
      const r = await mark.evaluate((el, [verts, centre]) => {
        const v = new Function(`return (${verts})()`)(); const c = new Function(`return (${centre})`)()(el);
        const onLine = v.some(([x, y]) => Math.abs(x - c[0]) < 0.5 && Math.abs(y - c[1]) < 0.5);
        return { flag: el.getAttribute('data-flag') ?? '', fill: getComputedStyle(el).fill, onLine };
      }, [RATES_VERTICES.toString(), markCentre.toString()]);
      assert.ok(r.flag.includes('thin'), `${p} ${y.year}: data-flag "${r.flag}"`);
      assert.ok(isNoFill(r.fill), `${p} ${y.year}: fill "${r.fill}" is not hollow`);
      assert.ok(!r.onLine, `${p} ${y.year}: a line vertex sits on the thin mark`);
      const row = t.rows.find((x) => x.header.startsWith(`${p} ${y.year}`));
      assert.ok(row?.text.includes(THIN_NOTE), `${p} ${y.year}: twin row lacks "${THIN_NOTE}"`);
    }
  }
}));

ac('AC-38 — The scrape year is labelled partial', () => withPage('D', async (page) => {
  await openNational(page);
  const axis = await page.evaluate((label) => [...document.querySelectorAll('#cppp-rates svg text')].some((t) => window.__t.norm(t.textContent).includes(window.__t.norm(label))), scrapeYearLabel);
  assert.ok(axis, `no axis label "${scrapeYearLabel}"`);
  for (const p of ['central', 'state']) {
    if (!FIX.years[p].some((y) => Number(y.year) === FIX.scrapeYear)) continue;
    const t = await requireTwin(page, `rates-${p}`);
    const row = t.rows.find((r) => r.header.startsWith(`${p} ${FIX.scrapeYear}`));
    assert.ok(row?.header.includes(norm(scrapeYearLabel)), `${p}: twin header "${row?.header}" lacks "${scrapeYearLabel}"`);
    const mark = page.locator(`#cppp-rates [data-mark="point"][data-portal="${p}"][data-year="${FIX.scrapeYear}"]`);
    assert.equal(await mark.count(), 1, `${p}: scrape-year mark`);
    assert.ok((await mark.getAttribute('data-flag') ?? '').includes('partial'), `${p}: scrape-year mark flag`);
    assert.ok(isNoFill(await style(mark, 'fill')), `${p}: scrape-year mark is not hollow`);
  }
}));

/**
 * The words a hatched state row must end with, by the same three-way rule as the page
 * (AC-39): with `statePortalNames` emitted, exact-name rows > 0 → pooled, 0 → not present;
 * without it → unlisted, since the n ≥ 30 table cannot establish absence.
 */
function unlistedStateText(name) {
  const list = FIX.quality.organisations.statePortalNames;
  if (!list) return UNLISTED_STATE;
  const rows = list.filter((x) => x.name === name).reduce((a, x) => a + x.rows, 0);
  return rows > 0 ? pooledState(rows) : ABSENT_STATE_KNOWN;
}

ac('AC-39 — Absent states are hatched, named, and given no reason', () => withPage('D', async (page) => {
  await openNational(page);
  const s = await statesAppearing(page);
  const nodataRows = s.rows.filter((r) => r.nodata);
  assert.ok(nodataRows.length, 'no [data-nodata] rows in the states twin');
  for (const r of nodataRows) {
    assert.ok(FIX.states.includes(r.cells[0]), `hatched row "${r.cells[0]}" is not a state name`);
    assert.ok(!FIX.stateKeys.includes(r.cells[0]), `"${r.cells[0]}" appears on the state portal yet is hatched`);
    assert.equal(r.text, norm(`${r.cells[0]} ${unlistedStateText(r.cells[0])}`), `hatched row text "${r.text}"`);
    assert.ok(!/runs its own/.test(r.text), `hatched row "${r.cells[0]}" prints a reason`);
  }
  assert.ok(s.nodata.length + s.matched.length >= FIX.states.length, `${s.nodata.length} hatched + ${s.matched.length} matched < ${FIX.states.length}`);
}));

/** Concentration twin rows with their buyer text and column map. */
async function concRows(page) {
  const t = await requireTwin(page, 'concentration');
  const buyer = requireCol(t, 'concentration', 'buyer');
  const hhi = t.headers.map((h, i) => (/hhi/i.test(h.text) ? i : -1)).filter((i) => i >= 0);
  return { t, buyer, hhi };
}
const concByBuyer = new Map(FIX.conc.map((b) => [norm(b.buyer), b]));

ac('AC-40 — A null HHI reads not computed, is hatched, sorts last and is never 0', async (t) => {
  if (!FIX.nullHhi.length) { t.skip('SKIPPED: no buyer with a null HHI in this data'); return; }
  const keys = { awards: (b) => -b.awards, value: (b) => -b.valueSumInr, buyer: (b) => b.buyer };
  for (const [sort, key] of Object.entries(keys)) {
    await withPage('D', async (page) => {
      await openNational(page, `&rows=all&sort=${sort}`);
      const { t: tbl, buyer, hhi } = await concRows(page);
      assert.ok(hhi.length, 'no HHI column');
      const seq = tbl.rows.map((r) => concByBuyer.get(r.cells[buyer]) ?? null);
      assert.ok(seq.every(Boolean), 'a concentration row names a buyer not in the data');
      for (const b of FIX.nullHhi) {
        const row = tbl.rows.find((r) => r.cells[buyer] === norm(b.buyer));
        assert.ok(row, `${sort}: no row for null-HHI buyer "${b.buyer}"`);
        for (const i of hhi) {
          assert.equal(row.cells[i], 'not computed', `${sort}: "${b.buyer}" HHI cell "${row.cells[i]}"`);
          assert.ok(!/^0(\.0)?$/.test(row.cells[i]), `${sort}: "${b.buyer}" HHI reads zero`);
        }
        assert.ok(row.nodata, `${sort}: "${b.buyer}" row has no [data-nodata]`);
      }
      for (let i = 1; i < seq.length; i += 1) {
        const a = key(seq[i - 1]); const b = key(seq[i]);
        const ok = sort === 'buyer' ? a.localeCompare(b) <= 0 : a < b || (a === b && seq[i - 1].buyer.localeCompare(seq[i].buyer) <= 0);
        assert.ok(ok, `${sort}: rows ${i - 1} ("${seq[i - 1].buyer}") and ${i} ("${seq[i].buyer}") are out of order — a null HHI moved a row`);
      }
    });
  }
});

ac('AC-41 — Agreement cells are not checkable, and 0% never appears in §3.7', async (t) => {
  if (sample.pageGone !== sample.rows.length) { t.skip('SKIPPED: not every sampled page is gone in this data'); return; }
  await withPage('D', async (page) => {
    await openNational(page);
    const a = await requireTwin(page, 'agreement');
    const cols = ['match', 'mismatch', 'missing'].map((n) => requireCol(a, 'agreement', n));
    const pg = requireCol(a, 'agreement', 'page_gone', 'page gone');
    const nodata = await page.evaluate(() => [...document.querySelectorAll('[data-twin="agreement"] tbody tr')].map((tr) => [...tr.querySelectorAll('th, td')].map((c) => c.hasAttribute('data-nodata') || !!c.querySelector('[data-nodata]'))));
    a.rows.forEach((r, ri) => {
      for (const c of cols) {
        assert.equal(r.cells[c], 'not checkable', `row ${ri} col ${c}: "${r.cells[c]}"`);
        assert.ok(nodata[ri][c], `row ${ri} col ${c}: no [data-nodata]`);
        assert.ok(!/[\d%]/.test(r.cells[c]), `row ${ri} col ${c} carries a digit or %`);
      }
      assert.equal(r.cells[pg], `${sample.pageGone} of ${sample.rows.length}`, `row ${ri} page_gone`);
    });
    const tx = await page.locator('#cppp-sample').innerText();
    assert.ok(!norm(tx).includes('0%'), '#cppp-sample prints "0%"');
  });
});

ac('AC-42 — An unparsed buyer key is not shown as a public body', () => withPage('D', async (page) => {
  const check = async (twinName, keys, label) => {
    const rows = await page.evaluate((name) => [...document.querySelectorAll(`[data-twin="${name}"] tbody tr`)].map((tr) => ({ text: __t.norm(tr.textContent), nodata: tr.hasAttribute('data-nodata') || !!tr.querySelector('[data-nodata]'), mono: [...tr.querySelectorAll('*')].filter((el) => /mono/i.test(getComputedStyle(el).fontFamily)).map((el) => el.textContent.trim()) })), twinName);
    assert.ok(rows.length, `${label}: [data-twin="${twinName}"] has no rows`);
    for (const key of keys) {
      const state = key.split(' / ')[0];
      const row = rows.find((r) => r.mono.includes(key) || r.text.includes(norm(key)));
      assert.ok(row, `${label}: no row for "${key}"`);
      assert.ok(row.nodata, `${label}: "${key}" row lacks [data-nodata]`);
      assert.ok(row.text.includes(`${state} state portal · department code unparsed`), `${label}: "${key}" row reads "${row.text.slice(0, 120)}"`);
      assert.ok(row.mono.includes(key), `${label}: "${key}" has no mono element with the raw key`);
    }
  };
  await openNational(page);
  assert.ok(FIX.unparsed25.length, 'SKIPPED: no unparsed key among the 25 named buyers');
  await check('buyers', FIX.unparsed25.map((b) => b.buyer), 'top25');
  await openNational(page, '&rows=all');
  await check('concentration', FIX.conc.filter((b) => b.buyer.endsWith('/ unparsed')).map((b) => b.buyer), 'concentration');
  await openNational(page, '&buyers=all');
  await check('buyers', FIX.byOrg.filter((r) => r.key.endsWith('/ unparsed')).map((r) => r.key), 'buyers=all');
}));

ac('AC-43 — The unusable-value rows are a separate hatched group, not a sixth bar', () => withPage('D', async (page) => {
  await openNational(page);
  const bands = rates.byValueBand.slice(0, -1).map((b) => b.key); const last = rates.byValueBand[rates.byValueBand.length - 1];
  const r = await page.evaluate(([bands, lastKey]) => {
    const sect = document.getElementById('cppp-bands'); if (!sect) return null;
    const bars = bands.map((k) => sect.querySelector(`[data-mark="bar"][data-key="${k.replace(/"/g, '\\"')}"]`));
    const lastMark = sect.querySelector(`[data-mark="bar"][data-key="${lastKey.replace(/"/g, '\\"')}"]`) ?? sect.querySelector('[data-mark="bar"][data-flag="nodata"]');
    const parents = new Set(bars.filter(Boolean).map((b) => b.parentElement));
    const lp = lastMark?.parentElement ?? null;
    const headed = (el) => { for (let e = el; e && e !== sect; e = e.parentElement) if (/rows with no usable value/.test(e.textContent)) return true; return false; };
    return {
      missing: bands.filter((_, i) => !bars[i]), sameParent: parents.size === 1 && [...parents][0].tagName.toLowerCase() === 'g',
      last: lastMark ? { flag: lastMark.getAttribute('data-flag'), nodata: lastMark.hasAttribute('data-nodata') || !!lastMark.closest('[data-nodata]'), otherParent: !parents.has(lp), headed: headed(lastMark) || /rows with no usable value/.test(sect.textContent) } : null,
      text: __t.norm(sect.textContent),
    };
  }, [bands, last.key]);
  assert.ok(r, '#cppp-bands missing');
  assert.deepEqual(r.missing, [], `no [data-mark="bar"][data-key] for bands ${r.missing.join(', ')}`);
  assert.ok(r.sameParent, 'the five band bars do not share one <g>');
  assert.ok(r.last, 'no mark for the unusable-value row');
  assert.equal(r.last.flag, 'nodata'); assert.ok(r.last.nodata, 'unusable-value mark lacks [data-nodata]');
  assert.ok(r.last.otherParent, 'unusable-value mark shares the bands\' parent');
  assert.ok(r.last.headed, 'no heading "rows with no usable value"');
  assert.ok(r.text.includes(`n = ${last.n}`), `"n = ${fmt(last.n)}" not shown`);
  assert.ok(findSentence(r.text, ['', { pct: last.wilson95[0] }, ' to ', { pct: last.wilson95[1] }]), 'the unusable-value interval is not shown');
  const t = await requireTwin(page, 'bands');
  assert.equal(t.rows.length, 6);
  assert.ok(t.rows[5].text.includes('not a value band'), `last bands row "${t.rows[5].text}"`);
}));

ac('AC-44 — A row without wilson95 is flagged, never drawn with a band', async (t) => {
  const missing = [
    ...rates.byPortalYear.filter((r) => !r.wilson95).map((r) => ({ twin: `rates-${r.portal}`, key: `${r.portal} ${r.year}` })),
    ...rates.byTenderType.filter((r) => !r.wilson95).map((r) => ({ twin: 'types', key: r.key })),
    ...rates.byValueBand.filter((r) => !r.wilson95).map((r) => ({ twin: 'bands', key: r.key })),
    ...rates.byOrganisation.filter((r) => !r.wilson95).map((r) => ({ twin: 'buyers', key: r.key })),
  ];
  await withPage('D', async (page) => {
    await openNational(page, '&buyers=all');
    const cells = await page.evaluate(() => [...__t.sec().querySelectorAll('table td, table th')].filter((c) => __t.norm(c.textContent) === 'interval not computed').map((c) => __t.norm(c.closest('tr').textContent)));
    if (!missing.length) assert.deepEqual(cells, [], `"interval not computed" appears although every row carries wilson95: ${cells.join(' | ')}`);
    for (const m of missing) {
      assert.ok(cells.some((c) => c.includes(norm(m.key))), `${m.twin} "${m.key}": no cell reading "interval not computed"`);
      const ribbon = await page.evaluate((k) => { const mark = document.querySelector(`[data-mark][data-key="${k}"], [data-mark][data-year="${k.split(' ').pop()}"]`); return mark ? !!mark.closest('svg')?.querySelector(`[data-ribbon][data-key="${k}"]`) : false; }, m.key);
      assert.ok(!ribbon, `${m.twin} "${m.key}": drawn with a ribbon`);
    }
  });
  if (!missing.length) t.skip('SKIPPED: every emitted row carries wilson95');
});

ac('AC-45 — An unmatched state prints its sentence, never an empty table', () => withPage('D', async (page) => {
  await openNational(page, '&state=Nowhere');
  // [Adjudicated] "does not appear" only when statePortalNames is emitted (and gives Nowhere no rows).
  const sentence = unmatchedStateSentence('Nowhere', !!FIX.quality.organisations.statePortalNames);
  for (const id of ['#cppp-concentration', '#cppp-redflags']) {
    const tx = await page.locator(id).innerText().catch(() => '');
    assert.ok(includes(tx, sentence), `${id} lacks "${sentence}"`);
  }
  const t = await twin(page, 'concentration');
  if (t) assert.ok(t.rows.length >= 1, 'concentration twin renders a tbody with zero rows');
  const status = await page.evaluate(() => [...document.querySelectorAll('[role="status"]')].map((e) => e.textContent).join(' '));
  assert.ok(!/Unrecognised[^.]*\bstate\b/.test(status), `an unmatched state was reported as unrecognised: "${status}"`);
}));

// ===========================================================================
// 5. Denials beside claims
// ===========================================================================

async function assertInnocentBeside(page, vp) {
  const r = await page.evaluate(() => {
    const sec = __t.sec(); const innocents = [...sec.querySelectorAll('[data-innocent]')];
    const cs = (el) => { const s = getComputedStyle(el); return { size: s.fontSize, weight: s.fontWeight, color: s.color, lh: s.lineHeight === 'normal' ? parseFloat(s.fontSize) * 1.2 : parseFloat(s.lineHeight) }; };
    return {
      rates: [...sec.querySelectorAll('[data-rate]')].map((rate) => {
        const inn = innocents.find((i) => __t.follows(rate, i));
        const label = __t.norm(rate.textContent).slice(0, 60);
        if (!inn) return { label, missing: true };
        const a = cs(rate); const b = cs(inn); const rr = rate.getBoundingClientRect(); const ir = inn.getBoundingClientRect();
        return { label, same: a.size === b.size && a.weight === b.weight && a.color === b.color, a, b, details: !!inn.closest('details'), visible: __t.visible(inn), gap: ir.top - rr.bottom, limit: 1.5 * a.lh };
      }),
      innocents: innocents.map((i) => __t.norm(i.textContent)),
    };
  });
  assert.ok(r.rates.length, `${vp}: no [data-rate] in SEC`);
  for (const x of r.rates) {
    assert.ok(!x.missing, `${vp}: no [data-innocent] follows rate "${x.label}"`);
    assert.ok(x.same, `${vp}: rate "${x.label}" ${JSON.stringify(x.a)} vs innocent ${JSON.stringify(x.b)}`);
    assert.ok(!x.details, `${vp}: innocent reading after "${x.label}" is inside details`);
    assert.ok(x.visible, `${vp}: innocent reading after "${x.label}" not visible`);
    assert.ok(x.gap <= x.limit, `${vp}: innocent reading sits ${x.gap.toFixed(1)}px below rate "${x.label}" (limit ${x.limit.toFixed(1)}px)`);
  }
  for (const reading of [...FIX.indList.map((i) => i.innocentReading), timing.innocentReading, concentration.innocentReading]) {
    assert.ok(r.innocents.some((t) => t.includes(norm(reading))), `${vp}: no [data-innocent] carries "${reading.slice(0, 60)}…" verbatim`);
  }
}

ac('AC-46 — The innocent reading sits beside every rate, at the same size and weight', async () => {
  for (const vp of ['D', 'M']) await withPage(vp, async (page) => { await openNational(page); await assertInnocentBeside(page, vp); });
});

async function assertNotAskedAbove(page, vp) {
  const r = await page.evaluate((sentence) => {
    const rf = document.getElementById('cppp-redflags'); const t = rf?.querySelector('[data-twin="buyers"]'); if (!rf || !t) return null;
    const el = __t.deepest(rf, sentence);
    const inn = el ? [...rf.querySelectorAll('[data-innocent]')].find((i) => __t.follows(el, i) && __t.follows(i, t)) : null;
    return { el: !!el, before: !!(el && __t.follows(el, t)), visible: __t.visible(el), inn: inn ? __t.norm(inn.textContent) : null, innVisible: __t.visible(inn) };
  }, NOT_ASKED_TABLE);
  assert.ok(r, `${vp}: #cppp-redflags or its buyers twin missing`);
  assert.ok(r.el, `${vp}: the not-asked sentence is missing`);
  assert.ok(r.before, `${vp}: the not-asked sentence does not precede the buyers table`);
  assert.equal(r.inn, norm(FIX.ind.singleBidding.innocentReading), `${vp}: no [data-innocent] with the single-bidding reading between the sentence and the table`);
  if (vp === 'M') assert.ok(r.visible && r.innVisible, 'M: sentence or innocent reading not visible');
}

ac('AC-47 — The named-buyer table says nobody was asked, above the table', async () => {
  for (const vp of ['D', 'M']) await withPage(vp, async (page) => { await openNational(page); await assertNotAskedAbove(page, vp); });
});

/** Download every CSV a container offers and return the parsed files. */
async function downloadAll(page, containerSel) {
  const btns = downloadButtons(page, containerSel);
  const n = await btns.count();
  const out = [];
  for (let i = 0; i < n; i += 1) out.push(await download(page, btns.nth(i)));
  return out;
}

ac('AC-48 — Every named-buyer row carries not asked', () => withPage('D', async (page) => {
  for (const q of ['', '&buyers=all']) {
    await openNational(page, q);
    const t = await requireTwin(page, 'buyers');
    const c = requireCol(t, `buyers${q}`, 'response');
    for (const r of t.rows) assert.equal(r.cells[c], 'not asked', `${q || 'top25'}: row "${r.text.slice(0, 50)}" response cell`);
  }
  const files = await downloadAll(page, '#cppp-redflags');
  assert.ok(files.length, 'no download button in #cppp-redflags');
  const csv = files.map((f) => csvParts(f.body)).find((p) => p.header.includes('response'));
  assert.ok(csv, 'no CSV from #cppp-redflags has a response column');
  const ci = csv.header.indexOf('response');
  assert.ok(csv.data.length, 'buyers CSV has no data rows');
  for (const row of csv.data) assert.equal(row[ci], 'not asked', `CSV row "${row.slice(0, 3).join(',')}" response`);
}));

ac('AC-49 — The verification says nothing was contradicted, and who was not asked', () => withPage('D', async (page) => {
  await openNational(page);
  assert.ok(NOT_ATTEMPTED_SENTENCE, 'the finding in sample-verification.json has no "was not attempted; no token was re-signed" sentence');
  const r = await page.evaluate(([s1, s2, s3]) => {
    const root = document.getElementById('cppp-sample'); if (!root) return null;
    const el = __t.deepest(root, s1);
    const others = [...root.querySelectorAll('table, p, li, pre')].filter((o) => o !== el && !o.contains(el) && !el?.contains(o) && o.textContent.trim().length > 20);
    return { first: !!el && others.every((o) => __t.follows(el, o)), parties: __t.norm(root.textContent).includes(__t.norm(s2)), attempted: __t.norm(root.textContent).includes(__t.norm(s3)) };
  }, [NOTHING_CONTRADICTED, NOT_ASKED_PARTIES, NOT_ATTEMPTED_SENTENCE]);
  assert.ok(r, '#cppp-sample missing');
  assert.ok(r.first, `"${NOTHING_CONTRADICTED}" is not in the first paragraph of #cppp-sample`);
  assert.ok(r.parties, `#cppp-sample lacks "${NOT_ASKED_PARTIES}"`);
  assert.ok(r.attempted, 'the finding\'s "was not attempted; no token was re-signed or re-timestamped" sentence is missing');
}));

ac('AC-50 — Repeat pairs are counted, never listed; winners never appear in red flags', () => withPage('D', async (page) => {
  await openNational(page);
  const cards = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('#cppp-redflags section')].filter((s) => s.querySelector('h4')).map((s) => [__t.norm(s.querySelector('h4').textContent), __t.norm(s.textContent)])));
  const rep = FIX.ind.repeatSingleBidderMarkedWinners;
  const repCard = cards[INDICATOR_H4.repeatSingleBidderMarkedWinners];
  assert.ok(repCard, 'no repeat-pairs card');
  assert.ok(repCard.includes('pairs counted, never listed'), 'repeat card lacks "pairs counted, never listed"');
  assert.ok(repCard.includes(`pairs ${rep.pairs}`), `repeat card lacks "pairs ${fmt(rep.pairs)}"`);
  assert.ok(repCard.includes(`repeat pairs ${rep.repeatPairs}`), `repeat card lacks "repeat pairs ${fmt(rep.repeatPairs)}"`);
  const rfText = await page.locator('#cppp-redflags').innerText();
  const leak = [...FIX.winners].find((w) => rfText.includes(w));
  assert.equal(leak, undefined, `winner name "${leak}" appears in #cppp-redflags`);
  const lim = cards[INDICATOR_H4.nonOpenTenderType];
  assert.ok(lim, 'no Limited card');
  assert.ok(lim.includes(norm(FIX.ind.nonOpenTenderType.note)), 'Limited card lacks its note');
  assert.ok(lim.includes(norm(LIMITED_NOTE)), `Limited card lacks "${LIMITED_NOTE}"`);
}));

/** A bare personal-name shape: two to four capitalised tokens ending the text. */
const NAME_SHAPE = /(?:^|[\s(])((?:[A-Z][a-z]+[  ]){1,3}[A-Z][a-z]+)[.,;:)"'”’]*$/;

ac('AC-51 — Rendered winner names are only the JSON\'s, and every component matches the marker rule', () => withPage('D', async (page) => {
  await openNational(page, '&rows=all');
  const r = await page.evaluate(() => ({
    lis: [...document.querySelectorAll('[data-twin="concentration"] tbody tr ol li')].map((li) => li.textContent.trim()),
    secText: __t.sec().innerText,
    leaves: [...__t.sec().querySelectorAll('td, span')].map((el) => el.textContent.trim()).filter((t) => t.length >= 4),
  }));
  assert.ok(r.lis.length, 'no <ol><li> winners in the concentration twin');
  const re = new RegExp(FIX.markerRegex, 'i');
  for (const li of r.lis) {
    const name = li.split(' · ')[0].trim();
    assert.ok(FIX.winners.has(name), `li name "${name}" is not a topMarkedWinners name`);
    for (const comp of name.split(/[,;]/)) if (comp.trim()) assert.ok(re.test(comp), `component "${comp}" of "${name}" fails the marker rule`);
  }
  assert.ok(!r.secText.includes('selected_bidder_address'), 'SEC prints selected_bidder_address');
  const suspects = r.leaves.filter((t) => NAME_SHAPE.test(t)).map((t) => ownWords(t).trim()).filter((t) => NAME_SHAPE.test(t));
  assert.deepEqual(suspects.slice(0, 5), [], `${suspects.length} td/span texts end in a bare personal-name shape outside the data: ${suspects.slice(0, 5).join(' | ')}`);
}));

ac('AC-52 — Mostly-unmarked buyers say so', () => withPage('D', async (page) => {
  await openNational(page, '&rows=all');
  const { t, buyer } = await concRows(page);
  const set = new Set(FIX.mostlyUnmarked.map((b) => norm(b.buyer)));
  assert.equal(t.rows.length, FIX.conc.length, 'rows=all does not show every buyer');
  for (const r of t.rows) {
    const has = r.text.includes(MOSTLY_UNMARKED);
    if (set.has(r.cells[buyer])) assert.ok(has, `"${r.cells[buyer]}" (unmarked ≥ 50%) lacks "${MOSTLY_UNMARKED}"`);
    else assert.ok(!has, `"${r.cells[buyer]}" (unmarked < 50%) carries "${MOSTLY_UNMARKED}"`);
  }
}));

ac('AC-53 — Denials are not muted: no --color-rose on a rate, no dash on a mark', () => withPage('D', async (page) => {
  await openNational(page);
  const r = await page.evaluate(() => {
    const sec = __t.sec(); const rose = __t.varColor('--color-rose');
    const els = [...sec.querySelectorAll('[data-mark], svg line, svg path, svg rect, svg circle')].filter((el) => !__t.inTierChip(el));
    const bad = [];
    for (const el of els) {
      const s = getComputedStyle(el);
      if (s.strokeDasharray && s.strokeDasharray !== 'none') bad.push(`${el.tagName} dash ${s.strokeDasharray}`);
      if (s.stroke === rose || s.fill === rose) bad.push(`${el.tagName} uses --color-rose`);
    }
    return { count: els.length, rose, bad };
  });
  assert.ok(r.count, 'no marks or svg shapes in SEC');
  assert.deepEqual(r.bad.slice(0, 5), [], `${r.bad.length} violations: ${r.bad.slice(0, 5).join(' | ')}`);
}));

ac('AC-54 — Portals are told apart by shape and label, in greys', () => withPage('D', async (page) => {
  await openNational(page);
  const r = await page.evaluate(() => {
    const svg = document.querySelector('#cppp-rates svg'); if (!svg) return null;
    const tags = (p) => [...svg.querySelectorAll(`[data-mark="point"][data-portal="${p}"]`)].map((m) => m.tagName.toLowerCase());
    const last = (p) => { const ms = [...svg.querySelectorAll(`[data-mark="point"][data-portal="${p}"]`)].filter((m) => /^\d{4}$/.test(m.getAttribute('data-year'))); ms.sort((a, b) => a.getAttribute('data-year') - b.getAttribute('data-year')); const m = ms.pop(); if (!m) return null; const b = m.getBBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
    const labels = [...svg.querySelectorAll('text')].map((t) => { const b = t.getBBox(); return { text: t.textContent.trim(), x: b.x, y: b.y + b.height / 2 }; });
    return { central: tags('central'), state: tags('state'), lastC: last('central'), lastS: last('state'), labels };
  });
  assert.ok(r, '#cppp-rates svg missing');
  assert.ok(r.central.length && r.central.every((t) => t === 'circle'), `central marks: ${[...new Set(r.central)].join(',')}`);
  assert.ok(r.state.length && r.state.every((t) => t === 'rect'), `state marks: ${[...new Set(r.state)].join(',')}`);
  for (const [name, last] of [['central', r.lastC], ['state', r.lastS]]) {
    assert.ok(last, `${name}: no last plotted mark`);
    const near = r.labels.find((l) => l.text === name && Math.abs(l.x - last.x) <= 80 && Math.abs(l.y - last.y) <= 24);
    assert.ok(near, `${name}: no end label adjacent to the last mark (${last.x.toFixed(0)},${last.y.toFixed(0)}); labels: ${r.labels.filter((l) => l.text === name).map((l) => `${l.x.toFixed(0)},${l.y.toFixed(0)}`).join(' ')}`);
  }
}));

const saturationOf = (c) => { if (!c || isNoFill(c)) return 0; const rgb = parseRgb(c); return rgb ? rgbToHsl(rgb).s : 0; };

ac('AC-55 — Every chart mark is a neutral grey', () => withPage('D', async (page) => {
  await openNational(page);
  const paints = await page.evaluate(() => {
    const sec = __t.sec();
    const els = [...sec.querySelectorAll('[data-mark], path[data-ribbon], #cppp-rates svg path')].filter((el) => !__t.inTierChip(el));
    return els.map((el) => { const s = getComputedStyle(el); return { tag: el.tagName, mark: el.getAttribute('data-mark'), fill: s.fill, stroke: s.stroke }; });
  });
  assert.ok(paints.length, 'no marks in SEC');
  for (const p of paints) {
    for (const k of ['fill', 'stroke']) {
      if (isNoFill(p[k])) continue;
      const s = saturationOf(p[k]);
      assert.ok(s <= 0.10, `${p.tag}[data-mark=${p.mark}] ${k} ${p[k]} has saturation ${s.toFixed(2)}`);
    }
  }
  const point = page.locator('#cppp-rates [data-mark="point"]').first();
  assert.ok(await point.count(), 'no point to hover');
  const before = parseFloat(await style(point, 'strokeWidth'));
  await point.hover();
  await page.waitForTimeout(150);
  const after = parseFloat(await style(point, 'strokeWidth'));
  assert.ok(after > before, `hover stroke-width ${before} → ${after} did not increase`);
  const stroke = await style(point, 'stroke');
  assert.ok(saturationOf(stroke) <= 0.10, `hover stroke ${stroke} is saturated`);
}));

// ===========================================================================
// 6. URL round-trip of every filter
// ===========================================================================

/** The current value of a select-or-button-group control offering `values`. */
const controlValue = (page, container, values) => page.evaluate(([sel, vals]) => {
  const c = document.querySelector(sel); if (!c) return null;
  const select = [...c.querySelectorAll('select')].find((s) => vals.every((v) => [...s.options].some((o) => o.value === v || o.textContent.trim() === v)));
  if (select) { const o = select.options[select.selectedIndex]; return o.value || o.textContent.trim(); }
  const btns = [...c.querySelectorAll('button[aria-pressed], [role="radio"], input[type="radio"]')].filter((b) => vals.includes((b.textContent || b.value || '').trim()));
  const on = btns.find((b) => b.getAttribute('aria-pressed') === 'true' || b.getAttribute('aria-checked') === 'true' || b.checked);
  return on ? (on.textContent || on.value).trim() : (btns.length ? '(none pressed)' : null);
}, [container, values]);
const ROWS_VALUES = ['25', '100', 'all'];
const BUYERS_VALUES = ['top25', 'all'];
/** Choose a value on a select-or-button-group control. */
async function choose(page, container, values, value) {
  const select = page.locator(`${container} select`).filter({ has: page.locator(`option[value="${value}"], option:text-is("${value}")`) }).first();
  if (await select.count()) { await select.selectOption({ value }).catch(() => select.selectOption({ label: value })); return; }
  await page.locator(`${container} button, ${container} [role="radio"], ${container} label`).filter({ hasText: new RegExp(`^\\s*${esc(value)}\\s*$`) }).first().click();
}
const headerButton = (page, name) => page.locator('[data-twin="concentration"] thead th').filter({ hasText: new RegExp(`^\\s*${esc(name)}\\b`, 'i') }).first();
/** aria-sort of a concentration header. `expected` waits for React's commit after the URL changed (the param
 *  lands a frame before the DOM does), so the read is of the settled header, not the frame in between. */
const headerSort = async (page, name, expected) => {
  const th = headerButton(page, name);
  let v = await th.getAttribute('aria-sort');
  for (let i = 0; expected && v !== expected && i < 50; i += 1) { await page.waitForTimeout(100); v = await th.getAttribute('aria-sort'); }
  return v;
};
const stateParam = () => FIX.stateKeys[0];

ac('AC-56 — Every param loads into its control', () => withPage('D', async (page) => {
  await openNational(page, `&portal=state&sort=value&rows=100&buyers=all&state=${encodeURIComponent(stateParam())}`);
  const pressed = await portalGroup(page).locator('button').evaluateAll((bs) => bs.map((b) => [b.textContent.trim(), b.getAttribute('aria-pressed')]));
  assert.ok(pressed.length, 'no portal group buttons');
  for (const [name, p] of pressed) assert.equal(p, /^state$/i.test(name) ? 'true' : 'false', `portal button "${name}" aria-pressed`);
  const t = await requireTwin(page, 'concentration');
  for (const h of t.headers) if (h.sort !== null) assert.equal(h.sort, /^value\b/i.test(h.text) ? 'descending' : 'none', `header "${h.text}" aria-sort`);
  assert.equal(t.headers.find((h) => /^value\b/i.test(h.text))?.sort, 'descending', 'value header is not sorted descending');
  assert.equal(await controlValue(page, '#cppp-concentration', ROWS_VALUES), '100', 'rows control');
  const buyer = requireCol(t, 'concentration', 'buyer');
  for (const r of t.rows) assert.ok(r.cells[buyer].startsWith(`${norm(stateParam())} / `), `row buyer "${r.cells[buyer]}" is not under ${stateParam()}`);
  assert.equal(await controlValue(page, '#cppp-redflags', BUYERS_VALUES), 'all', 'buyers control');
  assert.ok((await requireTwin(page, 'buyers')).rows.length > 27, 'buyers=all shows ≤ 27 rows');
}));

ac('AC-57 — Controls write params with replace', () => withPage('D', async (page) => {
  await openNational(page);
  const H = await historyLength(page);
  const check = async (key, value) => { await waitForParam(page, key, value); assert.equal(await historyLength(page), H, `history grew after ${key}=${value}`); assert.equal(params(page).get('section'), 'national', `section lost after ${key}=${value}`); };
  await portalButton(page, 'central').click(); await check('portal', 'central');
  await headerButton(page, 'buyer').locator('button').first().click(); await check('sort', 'buyer');
  await choose(page, '#cppp-concentration', ROWS_VALUES, 'all'); await check('rows', 'all');
  await choose(page, '#cppp-redflags', BUYERS_VALUES, 'all'); await check('buyers', 'all');
  const link = page.locator('[data-twin="states"] a[href]').first();
  assert.ok(await link.count(), 'no state name link in the states twin');
  const name = await text(link);
  await link.click(); await check('state', name); await check('portal', 'state');
}));

ac('AC-58 — Unknown values fall back to the default with an announced note', () => withPage('D', async (page) => {
  await openNational(page, '&portal=bogus&sort=hhi&rows=7&buyers=some');
  const r = await page.evaluate(() => {
    const notes = [...document.querySelectorAll('[role="status"]')].filter((e) => /Unrecognised/.test(e.textContent));
    const h1 = document.querySelector('h1'); const grid = __t.statGrid(null);
    return { count: notes.length, tag: notes[0]?.tagName, text: __t.norm(notes.map((n) => n.textContent).join(' ')), afterH1: !!(notes[0] && h1 && __t.follows(h1, notes[0])), beforeGrid: !grid || (notes[0] && __t.follows(notes[0], grid)) };
  });
  assert.equal(r.count, 1, `${r.count} [role="status"] notes about unrecognised values`);
  assert.equal(r.tag, 'P', 'the note is not a paragraph');
  assert.ok(r.afterH1 && r.beforeGrid, 'the note is not between the page header and the StatGrid');
  assert.ok(r.text.includes(norm('Unrecognised value “bogus” for portal, showing all.')), `note "${r.text}"`);
  for (const [v, k, d] of [['hhi', 'sort', 'awards'], ['7', 'rows', '25'], ['some', 'buyers', 'top25']]) {
    assert.ok(new RegExp(`Unrecognised value "${v}" for ${k}, showing ${d}`).test(r.text), `note lacks the ${k} sentence: "${r.text}"`);
  }
  assert.equal(await portalButton(page, 'all').getAttribute('aria-pressed'), 'true', 'portal all not pressed');
  assert.equal(await headerSort(page, 'awards'), 'descending', 'awards header not sorted');
  assert.equal(await controlValue(page, '#cppp-concentration', ROWS_VALUES), '25');
  assert.equal(await controlValue(page, '#cppp-redflags', BUYERS_VALUES), 'top25');
  const hhiSorted = await page.evaluate(() => [...document.querySelectorAll('[data-twin="concentration"] thead th')].filter((th) => /hhi/i.test(th.textContent)).some((th) => th.hasAttribute('aria-sort') && th.getAttribute('aria-sort') !== 'none'));
  assert.ok(!hhiSorted, 'sort=hhi was honoured');
}));

ac('AC-59 — state implies portal=state', () => withPage('D', async (page) => {
  await openNational(page, `&state=${encodeURIComponent(stateParam())}`);
  assert.equal(await portalButton(page, 'state').getAttribute('aria-pressed'), 'true', 'portal state not pressed');
  const { t, buyer } = await concRows(page);
  const pc = colIndex(t, 'portal');
  for (const r of t.rows) assert.ok((pc >= 0 && r.cells[pc] === 'state') || r.cells[buyer].startsWith(`${norm(stateParam())} / `), `row "${r.cells[buyer]}" is not a state-portal row`);
  const k = FIX.conc.filter((b) => b.portal === 'state' && b.buyer.startsWith(`${stateParam()} / `)).length;
  const effects = await page.locator('#cppp-concentration [data-effect]').allInnerTexts();
  assert.ok(effects.map(norm).includes(`${FIX.conc.length} → ${k} buyers`), `effects ${effects.join(' | ')} lack "${FIX.conc.length} → ${k} buyers"`);
}));

ac('AC-60 — The register\'s view and scope still round-trip beside section', () => withPage('D', async (page) => {
  await openNational(page, '&view=graph&scope=centre');
  assert.equal(await registerGroup(page, 'View').locator('button').filter({ hasText: /^\s*graph\s*$/i }).first().getAttribute('aria-pressed'), 'true', 'View graph not pressed');
  assert.equal(await registerGroup(page, 'Scope').locator('button').filter({ hasText: /^\s*centre\s*$/i }).first().getAttribute('aria-pressed'), 'true', 'Scope centre not pressed');
  const graph = await page.evaluate(() => { const g = document.querySelector('[role="group"][aria-label="View" i]'); const sec = __t.sec(); return !!g && [...document.querySelectorAll('canvas, svg')].some((el) => !sec.contains(el) && __t.follows(g, el)); });
  assert.ok(graph, 'the graph view container does not render below the View group');
  await registerGroup(page, 'View').locator('button').filter({ hasText: /^\s*ledger\s*$/i }).first().click();
  await waitForParam(page, 'view', 'ledger');
  assert.equal(params(page).get('section'), 'national', 'section lost when switching view');
}));

ac('AC-61 — The jump list writes the router fragment and scrolls', () => withPage('D', async (page) => {
  await openNational(page);
  const H = await historyLength(page);
  const link = secLocator(page).locator('a[href$="#cppp-rates"]').filter({ hasText: /^\s*Rates\s*$/ }).first();
  assert.ok(await link.count(), 'no jump-list link "Rates" to #cppp-rates');
  await link.click();
  await page.waitForFunction(() => location.hash.endsWith('#cppp-rates'), null, { timeout: ACTION_TIMEOUT });
  await page.waitForTimeout(SETTLE);
  assert.ok(new URL(page.url()).hash.endsWith('#cppp-rates'));
  const top = (await rect(page.locator('#cppp-rates'))).top;
  assert.ok(top >= 0 && top <= 120, `#cppp-rates top is ${top}px`);
  assert.equal(await historyLength(page), H, 'the jump pushed a history entry');
  await load(page, `${NATIONAL}#cppp-sample`);
  const top2 = (await rect(page.locator('#cppp-sample'))).top;
  assert.ok(top2 >= 0 && top2 <= 120, `#cppp-sample top is ${top2}px after a fresh load with the fragment`);
}));

ac('AC-62 — Defaults are unfiltered and unnamed', () => withPage('D', async (page) => {
  await openNational(page);
  assertParamsExactly(page, { section: 'national' });
  assert.equal(await portalButton(page, 'all').getAttribute('aria-pressed'), 'true', 'portal all not pressed');
  assert.equal(await headerSort(page, 'awards'), 'descending');
  assert.equal(await controlValue(page, '#cppp-concentration', ROWS_VALUES), '25');
  assert.equal(await controlValue(page, '#cppp-redflags', BUYERS_VALUES), 'top25');
  assert.ok(!params(page).has('state'));
  const { t, buyer } = await concRows(page);
  const expected = [...FIX.conc].sort((a, b) => b.awards - a.awards || a.buyer.localeCompare(b.buyer))[0];
  assert.equal(t.rows[0]?.cells[buyer], norm(expected.buyer), 'first concentration row is not the largest by awards');
}));

ac('AC-63 — A reload reproduces the view exactly', () => withPage('D', async (page) => {
  const snapshot = () => page.evaluate(() => ({
    effects: [...document.querySelectorAll('[data-effect]')].map((e) => __t.norm(e.textContent)),
    rows: Object.fromEntries([...document.querySelectorAll('[data-twin]')].map((t) => [t.getAttribute('data-twin'), t.querySelectorAll('tbody tr').length])),
    figure: __t.norm(document.querySelector('[data-figure]')?.textContent ?? ''),
  }));
  for (const q of ['', '&portal=state&rows=100', '&buyers=all&sort=buyer', `&state=${encodeURIComponent(stateParam())}`]) {
    await openNational(page, q);
    const a = await snapshot();
    assert.ok(a.effects.length && Object.keys(a.rows).length && a.figure, `${q || 'default'}: nothing to snapshot`);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForFunction(() => { const s = window.__t?.sec(); return !!s && !/\bloading\b/i.test(s.innerText); }, null, { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(SETTLE);
    assert.deepEqual(await snapshot(), a, `${q || 'default'}: reload changed the view`);
  }
}));

// ===========================================================================
// 7. Table twin
// ===========================================================================

ac('AC-64 — Every table has a caption, scoped headers, and lives in a labelled scroll region', () => withPage('D', async (page) => {
  await openNational(page, '&rows=all&buyers=all');
  const r = await page.evaluate((asOf) => {
    const sec = __t.sec();
    const tables = [...sec.querySelectorAll('table')].map((t) => {
      const cap = __t.norm(t.querySelector(':scope > caption')?.textContent ?? '');
      let region = t.parentElement; while (region && region !== sec && !/(auto|scroll)/.test(getComputedStyle(region).overflowX)) region = region.parentElement;
      const rs = region && region !== sec ? getComputedStyle(region) : null;
      return {
        twin: t.getAttribute('data-twin'), cap,
        capOk: cap.length > 0 && /\b(n|rows)\b/.test(cap) && cap.includes('scraped') && cap.includes(`computed ${asOf}`) && /reported/.test(cap),
        unscoped: [...t.querySelectorAll('th')].filter((th) => !['col', 'row'].includes(th.getAttribute('scope'))).length,
        region: rs ? { overflow: rs.overflowX, role: region.getAttribute('role'), label: region.getAttribute('aria-label'), tabindex: region.getAttribute('tabindex') } : null,
        closedDetails: !!t.closest('details:not([open])'),
      };
    });
    const details = [...sec.querySelectorAll('details')].map((d) => {
      const walker = document.createTreeWalker(d, NodeFilter.SHOW_TEXT); const bare = []; let n;
      while ((n = walker.nextNode())) if (!n.parentElement.closest('summary') && /^\d[\d,]*$/.test(n.nodeValue.trim())) bare.push(n.nodeValue.trim());
      return { summary: d.querySelector('summary')?.textContent.trim().slice(0, 50), table: !!d.querySelector('table'), bare };
    });
    return { tables, details };
  }, FIX.asOf);
  assert.ok(r.tables.length, 'no table in SEC');
  for (const t of r.tables) {
    assert.ok(t.capOk, `[data-twin="${t.twin}"] caption "${t.cap.slice(0, 160)}" lacks n/rows, scraped, computed ${FIX.asOf} or reported`);
    assert.equal(t.unscoped, 0, `[data-twin="${t.twin}"] has ${t.unscoped} th without scope`);
    assert.ok(t.region, `[data-twin="${t.twin}"] has no overflow-x scrolling ancestor`);
    assert.equal(t.region.overflow, 'auto', `[data-twin="${t.twin}"] region overflow-x`);
    assert.equal(t.region.role, 'region', `[data-twin="${t.twin}"] region role`);
    assert.ok(t.region.label, `[data-twin="${t.twin}"] region has no aria-label`);
    assert.equal(t.region.tabindex, '0', `[data-twin="${t.twin}"] region tabindex`);
    assert.ok(!t.closedDetails, `[data-twin="${t.twin}"] is inside a closed details`);
  }
  for (const d of r.details) {
    assert.ok(!d.table, `details "${d.summary}" contains a table`);
    assert.deepEqual(d.bare, [], `details "${d.summary}" holds bare counts outside its summary: ${d.bare.join(', ')}`);
  }
}));

ac('AC-65 — The rates twins list exactly what the multiples draw', () => withPage('D', async (page) => {
  await openNational(page);
  for (const p of ['central', 'state']) {
    const t = await requireTwin(page, `rates-${p}`);
    const plottedRows = t.rows.filter((r) => !r.notPlotted);
    assert.equal(plottedRows.length, await page.locator(`#cppp-rates [data-mark][data-portal="${p}"]`).count(), `${p}: plotted rows ≠ marks`);
    assert.deepEqual(t.headers.map((h) => h.text), RATES_TWIN_HEADERS.map(norm), `${p}: headers`);
    const share = plottedRows.reduce((s, r) => s + parseFloat(r.cells[2]), 0);
    assert.ok(Math.abs(share - 100) <= 0.2, `${p}: share column sums to ${share.toFixed(2)}`);
    for (const r of plottedRows) {
      const m = r.cells[5].match(/^(\d+(?:\.\d+)?) to (\d+(?:\.\d+)?)$/);
      assert.ok(m, `${p} "${r.header}": interval "${r.cells[5]}"`);
      assert.ok(Math.abs(parseFloat(r.cells[6]) - (parseFloat(m[2]) - parseFloat(m[1]))) < 0.051, `${p} "${r.header}": width ${r.cells[6]} ≠ ${m[2]} − ${m[1]}`);
    }
  }
}));

ac('AC-66 — Histogram, FY-month, bands and types twins match their bars', () => withPage('D', async (page) => {
  await openNational(page);
  const hist = await requireTwin(page, 'hist');
  const bars = await page.evaluate(() => [...document.querySelectorAll('#cppp-timing [data-mark="bar"]')].map((b) => __t.norm(`${b.getAttribute('data-key') ?? ''} ${__t.accName(b)} ${b.getAttribute('aria-label') ?? ''}`)));
  assert.equal(hist.rows.length, timing.daysClosingToAoc.length, 'hist rows');
  assert.equal(bars.length, timing.daysClosingToAoc.length, 'hist bars');
  for (const bin of timing.daysClosingToAoc) assert.ok(bars.some((b) => b.includes(norm(bin.bin)) && b.includes(String(bin.n))), `no bar labelled with bin "${bin.bin}" and n ${fmt(bin.n)}`);
  assert.deepEqual(hist.headers.map((h) => h.text), HIST_HEADERS);
  const fy = await requireTwin(page, 'fymonth');
  assert.equal(fy.rows.length, 12); assert.deepEqual(fy.headers.map((h) => h.text), FYMONTH_HEADERS);
  assert.equal((await requireTwin(page, 'bands')).rows.length, 6);
  const types = await requireTwin(page, 'types');
  const named = types.rows.filter((r) => r.hasRowHeader && r.role !== 'separator').map((r) => r.header);
  assert.deepEqual(named, ['Works', 'Goods', 'Services', 'Limited', 'Other/unknown'], 'types row order');
  const iS = types.rows.findIndex((r) => r.header === 'Services'); const iL = types.rows.findIndex((r) => r.header === 'Limited');
  assert.ok(types.rows.slice(iS + 1, iL).some((r) => r.role === 'separator' || !r.hasRowHeader), 'no rule row or tr[role="separator"] between Services and Limited');
  const other = types.rows.find((r) => r.header === 'Other/unknown');
  assert.ok(other.cells.includes(String(rates.byTenderType.find((t) => t.key === 'Other/unknown').n)), 'Other/unknown row lacks its n');
}));

ac('AC-67 — The buyer table\'s row counts follow buyers', () => withPage('D', async (page) => {
  await openNational(page);
  assert.equal((await requireTwin(page, 'buyers')).rows.length, 2 + FIX.buyers25.length, 'top25 rows');
  await openNational(page, '&buyers=all');
  const t = await requireTwin(page, 'buyers');
  assert.equal(t.rows.length, 2 + FIX.byOrg.length, 'all rows');
  const nCol = requireCol(t, 'buyers', 'awards in denominator', 'n'); const bCol = requireCol(t, 'buyers', 'buyer');
  const body = t.rows.slice(2, -1);
  for (let i = 1; i < body.length; i += 1) {
    const a = int(body[i - 1].cells[nCol]); const b = int(body[i].cells[nCol]);
    assert.ok(a > b || (a === b && body[i - 1].cells[bCol] <= body[i].cells[bCol]), `rows ${i - 1} and ${i} are out of order (${a} "${body[i - 1].cells[bCol]}" vs ${b} "${body[i].cells[bCol]}")`);
  }
  assert.ok(FIX.pooled, 'SKIPPED: no pooled row in byOrganisation');
  assert.ok(t.rows[t.rows.length - 1].text.includes(norm(FIX.pooled.key)), `last row "${t.rows[t.rows.length - 1].text.slice(0, 60)}" is not the pooled row`);
  const tenths = await requireTwin(page, 'tenths');
  assert.equal(tenths.rows.length, 10, 'tenths rows');
  const cnt = colIndex(tenths, 'buyers', 'n', 'count');
  const idx = cnt >= 0 ? cnt : 1;
  assert.equal(tenths.rows.reduce((s, r) => s + int(r.cells[idx]), 0), FIX.byOrg.length - 1, 'tenths counts do not sum to the named buyers');
  const pct = t.headers.find((h) => h.text.includes('single-bidder %'));
  assert.ok(pct && !(pct.sort && pct.sort !== 'none') && !pct.button, 'the buyer table offers a rate sort');
}));

ac('AC-68 — Concentration rows follow rows, portal and state; the export ignores rows', () => withPage('D', async (page) => {
  const N = FIX.conc.length; const central = FIX.conc.filter((b) => b.portal === 'central').length;
  await openNational(page);
  assert.equal((await requireTwin(page, 'concentration')).rows.length, 25);
  const effects = (await page.locator('#cppp-concentration [data-effect]').allInnerTexts()).map(norm);
  assert.ok(effects.some((e) => e.includes(`showing 25 of ${N} buyers`)), `effects ${effects.join(' | ')}`);
  await openNational(page, '&rows=100'); assert.equal((await requireTwin(page, 'concentration')).rows.length, 100);
  await openNational(page, '&rows=all'); assert.equal((await requireTwin(page, 'concentration')).rows.length, N);
  await openNational(page, '&portal=central&rows=all'); assert.equal((await requireTwin(page, 'concentration')).rows.length, central);
  await openNational(page, '&portal=central');
  const files = await downloadAll(page, '#cppp-concentration');
  assert.ok(files.length, 'no download button in #cppp-concentration');
  const f = files.find((x) => /concentration/.test(x.filename)) ?? files[0];
  assert.equal(csvParts(f.body).data.length, central, `concentration CSV rows under portal=central`);
}));

ac('AC-69 — Top winners are a nested list, one item per emitted name', () => withPage('D', async (page) => {
  await openNational(page, '&rows=all');
  const { buyer } = await concRows(page);
  const rows = await page.evaluate((bi) => [...document.querySelectorAll('[data-twin="concentration"] tbody tr')].map((tr) => {
    const cells = [...tr.querySelectorAll('th, td')]; const ol = tr.querySelector('ol');
    // [Adjudicated] an unparsed buyer is read by its raw key (see readTable).
    const key = cells[bi].querySelector('[data-raw-key]') ?? cells[bi];
    return { buyer: __t.norm(key.textContent), buyerRaw: key.textContent, wbr: cells[bi].querySelectorAll('wbr').length, lis: ol ? [...ol.querySelectorAll('li')].map((li) => __t.norm(li.textContent)) : null };
  }), buyer);
  assert.equal(rows.length, FIX.conc.length);
  for (const r of rows) {
    const b = concByBuyer.get(r.buyer);
    assert.ok(b, `no data for buyer "${r.buyer}"`);
    assert.ok(r.lis, `"${r.buyer}": winners cell has no <ol>`);
    assert.equal(r.lis.length, b.topMarkedWinners.length, `"${r.buyer}": li count`);
    b.topMarkedWinners.forEach((w, i) => {
      assert.ok(r.lis[i].startsWith(`${norm(w.name)} · ${w.awards} · `), `"${r.buyer}" li ${i} "${r.lis[i]}" should start "${w.name} · ${w.awards} · "`);
      assert.ok(r.lis[i].includes(String(w.valueInr)), `"${r.buyer}" li ${i} lacks the value ${w.valueInr} as reported`);
    });
    if (b.buyer.includes('||')) { assert.equal(r.wbr, b.buyer.split('||').length - 1, `"${r.buyer}": wbr count`); assert.equal(r.buyerRaw.trim(), b.buyer, `"${r.buyer}": textContent changed`); }
  }
}));

ac('AC-70 — The sample rows are complete, collapsed honestly, and their links are real', () => withPage('D', async (page) => {
  await openNational(page);
  const t = await requireTwin(page, 'sample');
  const legend = t.rows.filter((r) => /^page gone:/.test(r.text));
  assert.equal(t.rows.length - legend.length, sample.rows.length, 'sample data rows');
  const allSame = sample.rows.every((r) => new Set(Object.values(r.verdicts)).size === 1);
  if (allSame) {
    const vc = requireCol(t, 'sample', 'verdict (all fields)');
    for (const r of t.rows.filter((x) => !legend.includes(x))) assert.equal(r.cells[vc], 'page gone', `verdict cell "${r.cells[vc]}"`);
    assert.ok(legend.length === 1 && legend[0].text.includes(norm(LEGEND_ROW)), `legend row: ${legend.map((l) => l.text).join(' | ')}`);
  }
  assert.ok(/\|\|/.test(t.caption) && /organisation/.test(t.caption) && /department/.test(t.caption) && /division/.test(t.caption), `caption does not explain "||": "${t.caption.slice(0, 200)}"`);
  const oc = requireCol(t, 'sample', 'organisation_name');
  const details = await page.evaluate((oi) => [...document.querySelectorAll('[data-twin="sample"] tbody tr')].map((tr) => {
    const cells = [...tr.querySelectorAll('th, td')]; const a = tr.querySelector('a[href^="http"]');
    return { org: cells[oi]?.textContent ?? '', wbr: cells[oi]?.querySelectorAll('wbr').length ?? 0, href: a?.getAttribute('href') ?? null, name: a ? __t.norm(__t.accName(a)) : null, text: __t.norm(tr.textContent) };
  }), oc);
  const names = new Set();
  for (const s of sample.rows) {
    const row = details.find((d) => d.href === s.detail_url);
    assert.ok(row, `no row with a[href="${s.detail_url.slice(0, 60)}…"]`);
    assert.equal(row.org, s.organisation_name, 'organisation_name textContent');
    assert.equal(row.wbr, s.organisation_name.split('||').length - 1, `wbr count for "${s.organisation_name.slice(0, 40)}"`);
    assert.equal(row.name, norm(`Portal page for tender ${s.tender_id}, returned “Invalid Url” on ${s.fetch.fetchedAt.slice(0, 10)}`), 'link accessible name');
    names.add(row.name);
    assert.ok(row.text.includes(s.fetch.sha256_16), `row lacks fetch.sha256_16 ${s.fetch.sha256_16}`);
    assert.ok(row.text.includes('page gone'), 'row lacks its verdict');
  }
  assert.equal(names.size, sample.rows.length, 'link names are not distinct');
}));

ac('AC-71 — Every table downloads as a CSV with its header block, and no request is made', () => withPage('D', async (page) => {
  await openNational(page, '&portal=central');
  const twins = await page.evaluate(() => [...__t.sec().querySelectorAll('table[data-twin]')].map((t) => ({ twin: t.getAttribute('data-twin'), rows: t.querySelectorAll('tbody tr').length, legend: [...t.querySelectorAll('tbody tr')].filter((tr) => /^page gone:/.test(tr.textContent.trim())).length, container: t.closest('[id^="cppp-"]')?.id ?? null })));
  assert.ok(twins.length, 'no data-twin table');
  const seen = new Set();
  for (const container of [...new Set(twins.map((t) => t.container))]) {
    assert.ok(container, 'a twin sits outside every #cppp-* container');
    const files = await downloadAll(page, `#${container}`);
    const here = twins.filter((t) => t.container === container);
    assert.ok(files.length >= here.length, `#${container}: ${files.length} download buttons for ${here.length} tables`);
    for (const f of files) {
      assert.deepEqual(f.requests, [], `#${container}: network requests on download: ${f.requests.join(', ')}`);
      assert.match(f.filename, /^cppp-[a-z-]+-\d{4}-\d{2}-\d{2}\.csv$/);
      assert.ok(f.filename.endsWith(`${FIX.asOf}.csv`), `filename ${f.filename} does not end ${FIX.asOf}.csv`);
      const { comments, header, data } = csvParts(f.body);
      assert.ok(includes(comments, FIX.caveat), `${f.filename}: header block lacks the caveat`);
      assert.ok(/family/i.test(comments), `${f.filename}: header block names no family`);
      assert.ok(/\bN\b|\bn = /.test(comments), `${f.filename}: header block lacks N`);
      assert.ok(comments.includes('scraped') && comments.includes(`computed ${FIX.asOf}`) && comments.includes(FIX.gen), `${f.filename}: header block lacks scraped/computed/pipeline`);
      for (const d of FIX.digests) assert.ok(comments.includes(d), `${f.filename}: header block lacks digest ${d}`);
      assert.ok(comments.includes('portal=central'), `${f.filename}: header block lacks portal=central`);
      // Attribute by exact twin name first, so `rates-state` is never read as `rates-central`.
      const twinOf = here.find((t) => f.filename.includes(`-${t.twin}-`)) ?? here.find((t) => f.filename.includes(t.twin.split('-')[0]));
      const expected = twinOf?.twin === 'concentration' ? FIX.conc.filter((b) => b.portal === 'central').length : twinOf?.rows;
      if (twinOf) {
        seen.add(twinOf.twin);
        const ok = data.length === expected || (twinOf.twin === 'sample' && data.length === expected - twinOf.legend);
        assert.ok(ok, `${f.filename}: ${data.length} data rows for a table of ${expected}`);
      }
      header.forEach((h, ci) => {
        const col = data.map((r) => r[ci] ?? '');
        if (h === 'status') return;
        if (col.some((v) => /^-?\d+(\.\d+)?$/.test(v))) assert.ok(!col.some((v) => /not computed|not checkable/.test(v)), `${f.filename}: numeric column "${h}" holds a status word`);
        assert.ok(!col.some((v) => /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(v) || /^\d+(\.\d+)?%$/.test(v)), `${f.filename}: column "${h}" is not raw (grouping or %)`);
      });
    }
  }
  for (const t of twins) assert.ok(seen.has(t.twin), `no CSV could be attributed to [data-twin="${t.twin}"]`);
}));

ac('AC-72 — Provenance footer matches provenance.json', () => withPage('D', async (page) => {
  await openNational(page);
  const tx = norm(await page.locator('#cppp-provenance').innerText().catch(() => ''));
  assert.ok(tx, '#cppp-provenance missing');
  for (const i of FIX.inputs) for (const v of [i.file, String(i.bytes), i.sha256_16]) assert.ok(tx.includes(norm(v)), `provenance lacks ${v}`);
  for (const v of [FIX.rows, FIX.tids, FIX.dedup]) assert.ok(tx.includes(String(v)), `provenance lacks ${fmt(v)}`);
  for (const v of [FIX.dedupRule, FIX.gen, FIX.asOf]) assert.ok(tx.includes(norm(v)), `provenance lacks "${String(v).slice(0, 50)}"`);
  assert.ok(await page.locator('#cppp-provenance a').filter({ hasText: 'scripts/cppp/README.md' }).count(), 'no link naming scripts/cppp/README.md');
  assert.equal(await page.locator('#cppp-provenance [data-source-line]').count(), 1, 'no [data-source-line] in #cppp-provenance');
}));

// ===========================================================================
// 8. Keyboard reachability
// ===========================================================================

ac('AC-73 — The head link moves focus to the section heading', () => withPage('D', async (page) => {
  await load(page, ROUTE, { section: false });
  let found = false;
  for (let i = 0; i < 80 && !found; i += 1) {
    await page.keyboard.press('Tab');
    found = await page.evaluate(() => { const a = document.activeElement; return !!a && a.tagName === 'A' && /^\s*The CPPP award scrape/.test(a.textContent); });
  }
  assert.ok(found, 'Tab never reaches the head link');
  await page.keyboard.press('Enter');
  await waitForParam(page, 'section', 'national');
  await page.waitForSelector('#cppp', { state: 'attached' });
  await page.waitForTimeout(SETTLE);
  const r = await page.evaluate(() => { const h = document.getElementById('cppp'); return { active: document.activeElement === h, tabIndex: h.tabIndex, top: h.getBoundingClientRect().top }; });
  assert.ok(r.active, 'h2#cppp is not the active element');
  assert.equal(r.tabIndex, -1);
  assert.ok(r.top >= 0 && r.top <= 120, `h2#cppp top is ${r.top}px`);
}));

ac('AC-74 — Every table region is reachable by Tab and shows a focus ring', async () => {
  await withPage('D', async (page) => {
    await openNational(page);
    await page.keyboard.press('Tab');
    const n = await secLocator(page).locator('[role="region"][tabindex="0"]').count();
    assert.ok(n, 'no [role="region"][tabindex="0"] in SEC');
    for (let i = 0; i < n; i += 1) {
      const r = await secLocator(page).locator('[role="region"][tabindex="0"]').nth(i).evaluate((el) => { el.focus(); return { active: document.activeElement === el, ring: __t.ring(el), label: el.getAttribute('aria-label') }; });
      assert.ok(r.active, `region ${i} ("${r.label}") does not take focus`);
      assert.ok(r.ring, `region ${i} ("${r.label}") shows no focus ring`);
    }
  });
  await withPage('M', async (page) => {
    await openNational(page);
    const wide = secLocator(page).locator('[role="region"][tabindex="0"]').filter({ has: page.locator('table') });
    const idx = await wide.evaluateAll((els) => els.findIndex((el) => el.scrollWidth > el.clientWidth));
    assert.ok(idx >= 0, 'M: no scrollable table region');
    const region = wide.nth(idx);
    await region.focus();
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(200);
    const left = await region.evaluate((el) => el.scrollLeft);
    assert.ok(left > 0, `M: ArrowRight did not scroll the region (scrollLeft ${left})`);
  });
});

ac('AC-75 — Every control is a real control and works by Enter or Space', () => withPage('D', async (page) => {
  await openNational(page);
  await page.keyboard.press('Tab');
  const r = await page.evaluate(() => {
    const sec = __t.sec(); const conc = document.getElementById('cppp-concentration'); const rf = document.getElementById('cppp-redflags');
    const byText = (root, re) => [...(root?.querySelectorAll('button, a, summary, [role="button"]') ?? [])].filter((el) => re.test(el.textContent.trim()));
    const groups = {
      'portal group buttons': [...(conc?.querySelectorAll('[role="group"] button') ?? [])],
      'rows control': [...(conc?.querySelectorAll('select, button[aria-pressed], input[type="radio"]') ?? [])].filter((el) => /^(25|100|all)$/.test((el.textContent || el.value || '').trim()) || el.tagName === 'SELECT'),
      'buyers control': [...(rf?.querySelectorAll('select, button[aria-pressed], input[type="radio"]') ?? [])].filter((el) => /^(top25|all)$/.test((el.textContent || el.value || '').trim()) || el.tagName === 'SELECT'),
      'sortable headers': [...(conc?.querySelectorAll('th button') ?? [])],
      'jump-list links': [...sec.querySelectorAll('a[href*="#cppp-"]')].filter((a) => !a.closest('[data-twin], [data-gap], caption')),
      'Copy figure': byText(sec, /^Copy figure$/), 'Copy citation': byText(sec, /^Copy citation$/),
      'DownloadButtons': byText(sec, /download/i), 'Hide link': byText(sec, /^Hide the CPPP section$/),
      'summaries': [...sec.querySelectorAll('details > summary')], 'state links': [...sec.querySelectorAll('[data-twin="states"] a[href]')],
    };
    const out = {};
    for (const [k, els] of Object.entries(groups)) {
      out[k] = { count: els.length, bad: [] };
      for (const el of els) {
        const real = ['BUTTON', 'INPUT', 'SELECT', 'SUMMARY'].includes(el.tagName) || (el.tagName === 'A' && el.hasAttribute('href')) || el.getAttribute('tabindex') === '0';
        el.focus();
        const active = document.activeElement === el; const ring = __t.ring(el);
        if (!real || !active || !ring) out[k].bad.push(`${el.tagName} "${el.textContent.trim().slice(0, 30)}" real=${real} active=${active} ring=${ring}`);
      }
    }
    return out;
  });
  for (const [k, v] of Object.entries(r)) {
    assert.ok(v.count, `${k}: none found`);
    assert.deepEqual(v.bad, [], `${k}: ${v.bad.join(' | ')}`);
  }
  await portalButton(page, 'state').focus();
  await page.keyboard.press('Enter');
  await waitForParam(page, 'portal', 'state');
  const valueBtn = headerButton(page, 'value').locator('button').first();
  await valueBtn.focus();
  await page.keyboard.press('Space');
  await waitForParam(page, 'sort', 'value');
  assert.equal(await headerSort(page, 'value', 'descending'), 'descending', 'value header aria-sort after Space');
}));

ac('AC-76 — Folded material has summaries that name content and count, and nothing counted is folded', () => withPage('D', async (page) => {
  await openNational(page);
  const summaries = secLocator(page).locator('details > summary');
  const n = await summaries.count();
  assert.ok(n, 'no details > summary in SEC');
  for (let i = 0; i < n; i += 1) {
    const t = await text(summaries.nth(i));
    assert.ok(/\d+ (raw spellings|terms|tender ids|lines)/.test(t) || /SQL/.test(t), `summary "${t}" names neither content nor count`);
  }
  const first = summaries.first();
  const before = await first.evaluate((s) => s.parentElement.open);
  await first.focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(150);
  assert.notEqual(await first.evaluate((s) => s.parentElement.open), before, 'Enter on a focused summary did not toggle open');
  const hidden = await page.evaluate(() => {
    const sec = __t.sec(); sec.querySelectorAll('details').forEach((d) => { d.open = false; });
    return [...sec.querySelectorAll('[data-strip-fact], [data-rate], [data-effect], [data-figure], table')].filter((el) => !__t.visible(el)).map((el) => `${el.tagName}${el.getAttribute('data-twin') ? `[${el.getAttribute('data-twin')}]` : ''} "${el.textContent.trim().slice(0, 40)}"`);
  });
  assert.deepEqual(hidden, [], `hidden with every details closed: ${hidden.join(' | ')}`);
}));

ac('AC-77 — Copy actions announce, and status regions are single', () => withPage('D', async (page) => {
  await openNational(page);
  await control(page, 'Copy citation').click();
  await page.waitForFunction(() => [...(window.__t.sec()?.querySelectorAll('[role="status"], [aria-live="polite"]') ?? [])].some((e) => /copied/i.test(e.textContent)), null, { timeout: ACTION_TIMEOUT }).catch(() => {});
  const announced = await page.evaluate(() => [...(window.__t.sec()?.querySelectorAll('[role="status"], [aria-live="polite"]') ?? [])].some((e) => /copied/i.test(e.textContent)));
  assert.ok(announced, 'no status or polite live region in SEC says "copied"');
  assert.equal(await page.locator('#cppp-concentration [aria-live="polite"]').count(), 1, 'aria-live="polite" regions in #cppp-concentration');
  await portalButton(page, 'state').click();
  await waitForParam(page, 'portal', 'state');
  const k = FIX.conc.filter((b) => b.portal === 'state').length;
  await page.waitForFunction((want) => /→ \d+ buyers/.test(document.querySelector('#cppp-concentration [aria-live="polite"]')?.textContent ?? ''), null, { timeout: ACTION_TIMEOUT }).catch(() => {});
  const r = await page.evaluate(() => { const live = document.querySelector('#cppp-concentration [aria-live="polite"]'); const t = document.querySelector('[data-twin="concentration"]'); return { text: __t.norm(live?.textContent ?? ''), before: !!(live && t && __t.follows(live, t)) }; });
  assert.ok(r.text.includes(`→ ${k} buyers`), `live region "${r.text}"`);
  assert.ok(r.before, 'the live region does not precede the concentration twin');
}));

ac('AC-78 — Every role="img" name states the measure, n and table follows; hover carries nothing extra', () => withPage('D', async (page) => {
  await openNational(page);
  const r = await page.evaluate(() => {
    const sec = __t.sec();
    const svgs = [...sec.querySelectorAll('svg[role="img"]')].map((s) => __t.norm(__t.accName(s)));
    const rates = document.querySelector('#cppp-rates svg[role="img"]');
    const labelled = [...sec.querySelectorAll('[data-mark]')].filter((m) => m.querySelector('title') || m.hasAttribute('aria-label')).map((m) => {
      const label = __t.norm(m.getAttribute('aria-label') ?? m.querySelector('title')?.textContent ?? '');
      const p = m.getAttribute('data-portal'); const y = m.getAttribute('data-year'); const k = m.getAttribute('data-key');
      let row = null;
      if (p && y) row = [...document.querySelectorAll(`[data-twin="rates-${p}"] tbody tr`)].find((tr) => __t.norm(tr.querySelector('th[scope="row"]')?.textContent ?? '').startsWith(`${p} ${y}`));
      else if (k) row = [...sec.querySelectorAll('table tbody tr')].find((tr) => __t.norm(tr.textContent).includes(__t.norm(k)));
      return { label, row: row ? __t.norm(row.textContent) : null, tabindex: m.hasAttribute('tabindex'), named: !!label };
    });
    const unnamedTab = [...sec.querySelectorAll('[data-mark][tabindex]')].filter((m) => !__t.accName(m)).length;
    return { svgs, ratesName: rates ? __t.norm(__t.accName(rates)) : null, labelled, unnamedTab };
  });
  assert.ok(r.svgs.length, 'no svg[role="img"] in SEC');
  for (const n of r.svgs) assert.ok(n.includes('n =') && n.includes('table follows'), `svg name "${n}"`);
  assert.equal(r.ratesName, norm(`Single-bidder rate by AOC year, central and state portals, n = ${fmt(FIX.denomN)} award decisions; ${FIX.notPlottedTotal} rows not plotted; table follows.`));
  for (const m of r.labelled) {
    assert.ok(m.row, `mark "${m.label}" has no matching twin row`);
    const rowNums = [...m.row.matchAll(/\d+(?:\.\d+)?/g)].map((x) => Number(x[0]));
    for (const num of [...m.label.matchAll(/\d+(?:\.\d+)?/g)].map((x) => Number(x[0]))) {
      assert.ok(rowNums.some((v) => v === num || samePct(v, num)), `mark "${m.label}": ${num} not in its twin row "${m.row.slice(0, 80)}"`);
    }
  }
  assert.equal(r.unnamedTab, 0, 'a [data-mark] has tabindex without an accessible name');
  await page.addStyleTag({ content: '#cppp svg{display:none}' });
  const hidden = await page.evaluate(() => [...__t.sec().querySelectorAll('[data-rate], [data-figure], [data-twin]')].filter((el) => !__t.visible(el)).length);
  assert.equal(hidden, 0, 'hiding the svgs hides a rate, the figure or a twin');
}));

ac('AC-79 — View and Scope groups are labelled groups with pressed state', () => withPage('D', async (page) => {
  await openNational(page);
  const r = await page.evaluate(() => { const sec = __t.sec(); return [...document.querySelectorAll('[role="group"][aria-label]')].filter((g) => !sec.contains(g) && __t.follows(sec, g)).map((g) => ({ label: g.getAttribute('aria-label'), buttons: [...g.querySelectorAll('button')].map((b) => b.getAttribute('aria-pressed')) })); });
  for (const name of ['View', 'Scope']) {
    const g = r.find((x) => x.label.toLowerCase() === name.toLowerCase());
    assert.ok(g, `no [role="group"][aria-label="${name}"] below SEC (found: ${r.map((x) => x.label).join(', ')})`);
    assert.ok(g.buttons.length && g.buttons.every((p) => p === 'true' || p === 'false'), `${name}: a button lacks aria-pressed`);
    assert.equal(g.buttons.filter((p) => p === 'true').length, 1, `${name}: pressed count`);
  }
}));

// ===========================================================================
// 9. Mobile at 390 px
// ===========================================================================

ac('AC-80 — No horizontal page scroll at any width', async () => {
  const e = await emptyServer();
  const cases = [
    ['', full.base], ['&portal=state&rows=all', full.base], ['&buyers=all', full.base], [`&state=${encodeURIComponent(stateParam())}`, full.base], ['#cppp-sample', full.base], ['', e.base],
  ];
  for (const vp of ['M', 'D']) {
    for (const [q, base] of cases) {
      await withPage(vp, async (page) => {
        await openNational(page, q, { base });
        const label = `${vp} ${q || 'default'}${base === e.base ? ' (dist-empty)' : ''}`;
        for (const phase of ['load', 'bottom']) {
          if (phase === 'bottom') { await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await page.waitForTimeout(150); }
          const m = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, body: document.body.scrollWidth, inner: window.innerWidth }));
          assert.equal(m.doc, m.inner, `${label} after ${phase}: documentElement.scrollWidth ${m.doc} ≠ innerWidth ${m.inner}`);
          assert.ok(m.body <= m.inner, `${label} after ${phase}: body.scrollWidth ${m.body} > ${m.inner}`);
        }
      });
    }
  }
});

ac('AC-81 — Every table scrolls inside its own container with a sticky first column and a hint', () => withPage('M', async (page) => {
  await openNational(page, '&rows=all&buyers=all');
  const r = await page.evaluate(() => {
    const sec = __t.sec();
    const wide = [...sec.querySelectorAll('table')].filter((t) => t.scrollWidth > t.clientWidth || (t.parentElement.scrollWidth > t.parentElement.clientWidth)).map((t) => {
      let region = t.parentElement; while (region && region !== sec && !/(auto|scroll)/.test(getComputedStyle(region).overflowX)) region = region.parentElement;
      const firsts = [...t.querySelectorAll('tr')].map((tr) => tr.querySelector('th, td')).filter(Boolean);
      const unsticky = firsts.filter((c) => { const s = getComputedStyle(c); return s.position !== 'sticky' || s.left !== '0px'; }).length;
      const around = region && region !== sec ? region.parentElement : null;
      const hint = !!around && (/scrolls →/.test(around.textContent) || !!around.querySelector('[data-edge-fade], [class*="fade"]'));
      return { twin: t.getAttribute('data-twin'), overflow: region && region !== sec ? getComputedStyle(region).overflowX : null, unsticky, hint };
    });
    const leaks = [...sec.querySelectorAll('*')].filter((el) => !el.closest('[role="region"]') && el.scrollWidth > el.clientWidth + 1).map((el) => `${el.tagName}.${el.className}`.slice(0, 60));
    return { wide, leaks };
  });
  assert.ok(r.wide.length, 'no table wider than its container at 390px');
  for (const t of r.wide) {
    assert.equal(t.overflow, 'auto', `[data-twin="${t.twin}"] region overflow-x`);
    assert.equal(t.unsticky, 0, `[data-twin="${t.twin}"]: ${t.unsticky} first cells not sticky at left 0`);
    assert.ok(t.hint, `[data-twin="${t.twin}"]: no "scrolls →" hint or edge fade beside the region`);
  }
  assert.deepEqual(r.leaks.slice(0, 5), [], `${r.leaks.length} elements outside a region overflow: ${r.leaks.slice(0, 5).join(' | ')}`);
}));

ac('AC-82 — The first phone screen carries the verification line and the start of the caveat', () => withPage('M', async (page) => {
  await openNational(page);
  const v = await verificationLine(page);
  assert.ok(v?.text, 'no verification line');
  assert.ok(v.bottom <= 844, `verification line bottom ${v.bottom}px is below the first screen`);
  const top = (await rect(page.locator('#cppp-caveat'))).top;
  assert.ok(top < 844, `#cppp-caveat top ${top}px is below the first screen`);
}));

ac('AC-83 — Long strings wrap; SQL is a full-width pre, never in a cell', () => withPage('M', async (page) => {
  await openNational(page);
  const r = await page.evaluate((regex) => {
    const sec = __t.sec();
    const targets = [...sec.querySelectorAll('code'), ...[...sec.querySelectorAll('td, th')].filter((c) => /\b[0-9a-f]{16}\b/.test(c.textContent) || c.textContent.includes(regex))];
    const badWrap = targets.filter((el) => { const s = getComputedStyle(el); return s.whiteSpace !== 'pre-wrap' || s.overflowWrap !== 'anywhere'; }).map((el) => `${el.tagName} "${el.textContent.trim().slice(0, 30)}"`);
    const pres = [...sec.querySelectorAll('pre')].map((p) => ({ inCell: !!p.closest('td'), width: p.getBoundingClientRect().width }));
    sec.querySelectorAll('details').forEach((d) => { d.open = true; });
    return { targets: targets.length, badWrap, pres, scrollWidth: document.documentElement.scrollWidth };
  }, FIX.markerRegex);
  assert.ok(r.targets, 'no code element or digest/regex cell in SEC');
  assert.deepEqual(r.badWrap.slice(0, 5), [], `${r.badWrap.length} without pre-wrap + anywhere: ${r.badWrap.slice(0, 5).join(' | ')}`);
  assert.ok(r.pres.length, 'no pre in SEC');
  for (const p of r.pres) { assert.ok(!p.inCell, 'a pre sits inside a td'); assert.ok(p.width <= 390 - 32, `pre is ${p.width}px wide`); }
  assert.equal(r.scrollWidth, 390, `documentElement.scrollWidth ${r.scrollWidth} with every details open`);
}));

ac('AC-84 — Stacked rows, when used, keep every column', () => withPage('M', async (page) => {
  await openNational(page);
  for (const name of ['rates-central', 'rates-state', 'buyers']) {
    const r = await page.evaluate((n) => {
      const t = document.querySelector(`[data-twin="${n}"]`); if (!t) return null;
      const cap = t.querySelector(':scope > caption');
      const shown = getComputedStyle(t).display !== 'none';
      if (shown) return { shown, visible: __t.visible(t), caption: __t.visible(cap) };
      const cols = t.querySelectorAll('thead th').length; const rows = [...t.querySelectorAll('tbody tr')];
      const dls = [...(t.parentElement.closest('[role="region"]')?.parentElement ?? t.parentElement).querySelectorAll('dl')].filter((d) => __t.visible(d));
      const bad = rows.map((tr, i) => { const dl = dls[i]; if (!dl) return `row ${i}: no dl`; const dts = dl.querySelectorAll('dt').length; const dds = [...dl.querySelectorAll('dd')].map((d) => __t.norm(d.textContent)); const cells = [...tr.querySelectorAll('th, td')].map((c) => __t.norm(c.textContent)); if (dts !== cols) return `row ${i}: ${dts} dt for ${cols} columns`; if (dds.join('|') !== cells.join('|')) return `row ${i}: dd texts differ`; return null; }).filter(Boolean);
      return { shown, dls: dls.length, rows: rows.length, bad, caption: cap ? __t.visible(cap) || getComputedStyle(cap).display !== 'none' : false };
    }, name);
    assert.ok(r, `[data-twin="${name}"] missing`);
    if (r.shown) assert.ok(r.visible, `${name}: table is display-shown but not visible`);
    else { assert.equal(r.dls, r.rows, `${name}: ${r.dls} dl for ${r.rows} rows`); assert.deepEqual(r.bad.slice(0, 3), [], `${name}: ${r.bad.slice(0, 3).join(' | ')}`); }
    assert.ok(r.caption, `${name}: caption not visible`);
  }
}));

ac('AC-85 — Innocent readings, the gaps panel and the captions are full size on a phone', () => withPage('M', async (page) => {
  await openNational(page);
  const r = await page.evaluate(([c1, c2]) => {
    const sec = __t.sec();
    const els = [...sec.querySelectorAll('[data-innocent], [data-gap]')];
    const cap = __t.deepest(document.getElementById('cppp-rates') ?? sec, c1); const cap2 = __t.deepest(document.getElementById('cppp-rates') ?? sec, c2);
    for (const c of [cap, cap2]) if (c) els.push(c);
    const bad = els.filter((el) => !__t.visible(el) || parseFloat(getComputedStyle(el).fontSize) < 14 || el.closest('details')).map((el) => `${el.tagName} "${el.textContent.trim().slice(0, 40)}" ${getComputedStyle(el).fontSize}`);
    const jumpLinks = [...sec.querySelectorAll('a[href*="#cppp-"]')].filter((a) => !a.closest('[data-twin], [data-gap], caption'));
    const jump = jumpLinks[0]?.closest('nav, ul, ol, div') ?? null;
    return { count: els.length, cap: !!cap && !!cap2, bad, jump: jump ? { sw: jump.scrollWidth, cw: jump.clientWidth } : null };
  }, [RATES_CAPTION_1, RATES_CAPTION_2]);
  assert.ok(r.count, 'no [data-innocent] or [data-gap] in SEC');
  assert.ok(r.cap, 'rates caption lines missing');
  assert.deepEqual(r.bad, [], `not full size at 390px: ${r.bad.join(' | ')}`);
  await assertInnocentBeside(page, 'M');
  assert.ok(r.jump, 'no jump list');
  assert.ok(r.jump.sw <= r.jump.cw, `jump list does not wrap (scrollWidth ${r.jump.sw} > clientWidth ${r.jump.cw})`);
}));

ac('AC-86 — The initial national chunk is within budget and the data is split, never fetched', () => withPage('D', async (page) => {
  const responses = [];
  page.on('response', (r) => { responses.push({ url: r.url(), type: r.headers()['content-type'] ?? '', body: r.body().catch(() => Buffer.alloc(0)) }); });
  await load(page, ROUTE, { section: false });
  const firstLoad = new Set(responses.map((r) => r.url));
  await page.goto(`${full.base}/#${NATIONAL}`);
  await page.waitForSelector('#cppp', { state: 'attached' }).catch(() => {});
  await page.waitForFunction(() => { const s = window.__t?.sec(); return !!s && !/\bloading\b/i.test(s.innerText); }, null, { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(SETTLE);
  await requireSection(page);
  for (const r of responses) assert.ok(!/application\/json/.test(r.type) && !/\.json(\?|$)/.test(r.url), `a JSON response was fetched: ${r.url}`);
  const A = [];
  for (const r of responses) if (!firstLoad.has(r.url) && /\.js(\?|$)/.test(r.url)) A.push({ url: r.url, body: (await r.body).toString('utf8') });
  assert.ok(A.length, 'the second load requested no new JS chunk — the section is not code-split');
  const conc = A.filter((c) => c.body.includes('hhiMarkedValue')); const org = A.filter((c) => c.body.includes('byOrganisationPooling'));
  assert.ok(conc.length, 'no new chunk holds the concentration data (hhiMarkedValue)');
  assert.ok(org.length, 'no new chunk holds byOrganisation (byOrganisationPooling)');
  assert.ok(conc.every((c) => !org.includes(c)), 'concentration and byOrganisation share a chunk');
  const rest = A.filter((c) => !conc.includes(c) && !org.includes(c));
  const gz = rest.reduce((s, c) => s + gzipSync(Buffer.from(c.body)).length, 0);
  assert.ok(gz <= 150 * 1024, `the remaining national chunks gzip to ${(gz / 1024).toFixed(1)} KiB (budget 150 KiB): ${rest.map((c) => c.url.split('/').pop()).join(', ')}`);
}));
