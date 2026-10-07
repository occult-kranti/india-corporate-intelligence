#!/usr/bin/env node
/**
 * /security acceptance tests — one `node --test` case per criterion in
 * docs/design/SECURITY_ACCEPTANCE.md, named by its AC id.
 *
 * Black-box checks against the built page: the file serves `dist` on an ephemeral
 * port (the pattern of scripts/smoke.mjs — owning the server means the only thing
 * that can fail is the thing under test), drives the pinned Chromium, and reads the
 * DOM. Nothing here imports from src/pages/, src/components/ or src/data/securityView.ts;
 * every expected value is derived before the run from the generated module
 * (src/graph/force.generated.ts), research/raw/cppp/security-page.json (the slim page file;
 * security.json carries winner lists the page must not load), src/data/india-geo.json,
 * the GSDP fields behind src/data/companies.ts (research/raw/state-economy.json) and the
 * Atlas and fleet modules it needs for labels, exactly as the criteria's §0.5 prescribes.
 * Where the criteria name a component rather than a selector (CellCard, StatePanel,
 * ControlCard …) the element is found by the text, role or §0.6 hook they fix for it.
 *
 * A criterion whose fixture the build does not contain is reported as
 * `SKIPPED: <reason>` — never as a pass. Three builds exist (§0.3): FULL is `dist`;
 * EMPTY (research/raw/force absent) and ZERO-SERIES (every top-level `budgets`,
 * `strength` and `footprint` key deleted from research/raw/force/*.json) are assembled
 * here from scratch copies of the repository and cached at `dist-empty-security/` and
 * `dist-zero-security/` — their own names, so they cannot swap data with `dist-empty`
 * (energy) or `dist-empty-finance`. The working tree's research/raw/ and *.generated.ts
 * are never touched. A cache is rebuilt when it is older than any file under src/ or
 * research/raw/force/ (a stale scaffold would test yesterday's page), or on request.
 *
 * Environment: `SECURITY_DIST=<dir>` pins the FULL dist copy (default ROOT/dist) so a
 * concurrent rebuild cannot poison a run; `SECURITY_BUILD=full|empty|zero` overrides the
 * DOM detection of what that dist is; `SECURITY_REBUILD_EMPTY=1` / `SECURITY_REBUILD_ZERO=1`
 * force a cache rebuild; `SECURITY_SHOTS=<dir>` saves AC-138's greyscale screenshots.
 *
 * Determinism: every wait is for a selector, a text or a URL condition; the only fixed
 * sleeps are the 700 ms settle after `networkidle` (1,800 ms more for the fixed-tick
 * connection graph), the 400 ms the criteria give Find, and the debounce windows the
 * criteria themselves time (150 ms filters, 300 ms Find).
 *
 * Run: npm run build && node --test scripts/pages/security.test.mjs
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { transformSync } from 'esbuild';
import { createServer } from 'node:http';
import {
  existsSync, readFileSync, writeFileSync, mkdtempSync, cpSync, rmSync, symlinkSync, mkdirSync,
  readdirSync, statSync,
} from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, extname, dirname, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SHOTS = process.env.SECURITY_SHOTS ?? null;

// ---------------------------------------------------------------------------
// Constants the acceptance document (and the spec text it cites) fixes
// ---------------------------------------------------------------------------

const SETTLE = 700;
const GRAPH_SETTLE = 1800;
const FIND_SETTLE = 400;
/** Playwright's per-action wait: long enough for a React commit, short enough to fail a missing anchor fast. */
const ACTION_TIMEOUT = 5_000;

const H1 = 'The money India spends on force';
const KICKER = 'Security spend · defence, police, intelligence and the bodies around them';
const STANDFIRST_HEAD = 'The Union pays for defence and for its own police';
const STANDFIRST_TAIL = 'A large number is not a finding.';
const STANDING = 'No colour on this page stands for a party, a government, a state or a verdict. Party appears only as text, as the record states it. Vendors appear beside the vendors they compete with; cases appear beside the case recorded as their control.';
const CALLOUT = 'Register not yet promoted';
const EMPTY_MONO = 'register not yet promoted — nothing below is zero';
const NO_RESPONSE = 'No response recorded — asked/not asked unknown';
const CONTROL_HEADING = 'The same lens on the other side';
const CONTROL_EMPTY = 'No symmetry check recorded for this lens — the control has not been run. This is a gap, not a pass.';
const ADJ = 'Nothing recorded yet.';
const NO_BUDGET_ROWS = 'This register holds no budget rows in this build. Nothing below is zero.';
const NO_FP_ROWS = 'This register holds no installation rows in this build. Nothing below is zero.';
const NO_PAIRING = 'No control pairing recorded for this case in the register.';
const C21 = 'Position carries no meaning. Line dash is evidence tier; hue is the kind of actor; shape is entity type; size is a declared band. Persons appear only in public roles.';
const CITY_TEXT = (state) => `inside ${state}'s police head (MH 2055) — no city budget is published`;
const CITY_STRENGTH_VOID = 'no primary table — the national police table is unreachable';
const RAIL_REFUSAL = "Not offered: party, government, era, vendor-class-only, 'risk' and city-budget filters — why →";
const LINK_ALL_TABLES = 'Every graphic on this lens has a table; show them all';

/** Spec §5.0.1 — the three fixed rows of the ResolutionStatement (C1). */
const RESOLUTION = [
  { dt: 'Union — to the line', dd: 'Every rupee the Union spends here resolves to a line in a demand for grants, with Budget Estimate, Revised Estimate and Actual where the document prints them.' },
  { dt: 'State — to the Police head', dd: "Each state's police money resolves to its Police major head and no further, except where a state's own budget opened. Strength, vacancy and per-lakh figures come through secondary transcriptions while the national strength table is unreachable, and say so. Prisons, home guards, fire and forensic money resolve only as Union scheme totals and are not budget rows here." },
  { dt: 'City — to the footprint, and Delhi', dd: "Only Delhi Police has a budget line of its own, and it is a Union demand. Every other city's police money is inside its state's police head, and this page prints those words in place of a number. Cities appear through what is located in them." },
];

/** Spec §2.1 — every Q-block heading, verbatim, by its §0.6 address. */
const QBLOCKS = {
  budgets: [
    ['B1', 'Q1 — What does the Union budget for force, year by year, and how much is pensions and pay?'],
    ['B2', 'Q2 — Who held the Defence and Home portfolios on each date?'],
    ['B3', 'Q3 — How has each Union line moved, and which years are missing?'],
    ['B4', 'Q4 — Compared with what?'],
    ['B5', 'Q5 — Who is paid, and on what terms?'],
    ['B6', 'Q6 — What does each state spend on police, against its economy, beside how many police it has?'],
    ['B7', 'Q7 — Which city has a police budget?'],
    ['B8', 'Q8 — What does the Union give the states for police?'],
    ['B9', 'Q9 — What is not published?'],
  ],
  footprint: [
    ['F1', 'Q1 — Where is it?'],
    ['F2', 'Q2 — Of what kind, in which city?'],
    ['F3', 'Q3 — Which cities have police money?'],
    ['F4', 'Q4 — Compared with what?'],
    ['F5', 'Q5 — What is not published?'],
  ],
  procurement: [
    ['P0', 'Q0 — The same lens on the other side'],
    ['P1', 'Q1 — Who was awarded, to which class of vendor, when, and beside whom?'],
    ['P2', 'Q2 — Who bought on the open market, and how many bid?'],
    ['P3', 'Q3 — Who sits on both sides of the money?'],
    ['P4', 'Q4 — What did courts and auditors record?'],
    ['P5', 'Q5 — Which stories hold up?'],
    ['P6', 'Q6 — What is not published?'],
  ],
};
const CANNOT_SHOW = { budgets: 'B9', footprint: 'F5', procurement: 'P6' };
const LENSES = ['budgets', 'footprint', 'procurement'];
const LENS_ROUTE = { budgets: '/security', footprint: '/security?lens=footprint', procurement: '/security?lens=procurement' };
const LENS_TAB = { budgets: 'Budgets', footprint: 'Footprint', procurement: 'Procurement and people' };
const LENS_DOMAINS = {
  budgets: ['union-defence', 'union-home', 'state-police', 'pay-pensions'],
  footprint: ['footprint'],
  procurement: ['procurement-industry', 'money-people', 'literature'],
};
/** AC-13 — the captions each lens owns. */
const CAPTIONS = {
  budgets: ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10', 'C21'],
  footprint: ['C1', 'C5', 'C9', 'C11', 'C12', 'C21'],
  procurement: ['C1', 'C5', 'C13', 'C14', 'C15', 'C16', 'C17', 'C18', 'C19', 'C20', 'C21'],
};
const RUNGS = ['established', 'well-supported', 'contested', 'speculative', 'unsupported', 'debunked'];
const STAGES = ['BE', 'RE', 'actual'];
const TIER_WORDS = ['documented', 'reported', 'alleged', 'analytic'];
/** AC-137 — the frozen dash per tier (`none` and solid are the same reading). */
const TIER_DASH = { documented: 'none', reported: '6 3', alleged: '2 4', analytic: '8 3 2 3' };
const REFUSALS = [
  "A city police budget other than Delhi's", 'A total that adds a demand to its own lines', 'A per-person figure on the 2011 Census',
  'A per-state outcome rate parsed from prose', 'A map of defence money by state or city', 'Points at city addresses without coordinates',
  'DAC approvals by vendor', 'A vendor alone', "The tender slice's overall rate as a finding",
  'Party as a colour, a filter, a sort or a column the page writes', 'A case without the case recorded as its control beside it',
  'A ranking, score or index', 'A merge of two ids by name', 'Operational detail',
];
/** AC-61 — the words an empty value may print. */
const NULL_WORDS = [
  'no row in this register', 'not recorded', 'not stated', 'none named', 'not computed', 'amount not stated', 'none recorded',
  'no owner recorded', 'no holding recorded', 'no bond recorded in this register', 'no board role recorded',
  'date not printed on the list', 'end not recorded', 'no note', 'none in this register', 'no row', '₹0 cr — as recorded',
];
const BAD_NULLS = ['—', '-', '', 'NaN', 'undefined', 'null', '0', '₹0'];
const AMERICAN = ['color', 'center', 'favor', 'honor', 'labeled', 'organization', 'analyze', 'program', 'catalog', 'gray', 'defense'];
const STRIP = 'section[aria-label="Denominators"]';
const LIVE = '[aria-live]';
/** §0.7 TABBABLE, verbatim. */
const TABBABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea, summary, [tabindex]:not([tabindex="-1"])';
/** §0.7 CR-CONTEXT, the two alternative sets, verbatim. */
const CR_DENOM = /₹[\d,.]+ of ₹[\d,.]+ cr, [\d.]+% of the published .+, computed here|no published total for this line's demand in FY|[\d.]+% of GSDP .+ \(reported series\), computed here|no same-year denominator in this register \(S3\)|no denominator published for this line|% of published total|% of stack, computed here|amount not stated/;
const CR_COMPARE = /FY\d{4}-\d{2} (BE|RE|actual): ₹[\d,.]+ cr|no (BE|RE|actual) row for FY\d{4}-\d{2}|previous year not applicable/;
const RUPEE_CR = /₹[\d,]+(\.\d+)? cr/;

// ---------------------------------------------------------------------------
// Generated modules — transpiled with esbuild and imported, never via src/pages
// ---------------------------------------------------------------------------

/** A TypeScript data module as plain ESM: esbuild strips the types; nothing else is changed. */
async function importTs(file, tag) {
  const { code } = transformSync(readFileSync(file, 'utf8'), { loader: 'ts', format: 'esm' });
  const dir = mkdtempSync(join(tmpdir(), `icip-security-fixture-${tag}-`));
  const out = join(dir, `${tag}.mjs`);
  writeFileSync(out, code);
  return import(pathToFileURL(out).href);
}
const importRel = (rel, tag) => importTs(join(root, rel), tag);

const F = await importRel('src/graph/force.generated.ts', 'force');
const atlas = await importRel('src/graph/data.ts', 'atlas');
const OTHER_FLEETS = [];
for (const [rel, tag] of [
  ['src/graph/energy.generated.ts', 'energy'], ['src/graph/finance.generated.ts', 'finance'], ['src/graph/ngo.generated.ts', 'ngo'],
  ['src/graph/capital.generated.ts', 'capital'], ['src/data/welfare.generated.ts', 'welfare'],
]) {
  if (existsSync(join(root, rel))) OTHER_FLEETS.push(await importRel(rel, tag));
}
/** §0.5 SLICE: the slim page file the page itself loads — never security.json, which carries winner lists (C14). */
const SLICE_FILE = join(root, 'research/raw/cppp/security-page.json');
let SLICE = null;
try { SLICE = JSON.parse(readFileSync(SLICE_FILE, 'utf8')); } catch { SLICE = null; }
const geo = JSON.parse(readFileSync(join(root, 'src/data/india-geo.json'), 'utf8'));
const economy = JSON.parse(readFileSync(join(root, 'research/raw/state-economy.json'), 'utf8'));
const fleetTypes = readFileSync(join(root, 'src/graph/fleet.ts'), 'utf8');

// ---------------------------------------------------------------------------
// §0.5 — fixtures, computed once, independently of securityView.ts; no literal figure
// ---------------------------------------------------------------------------

const finite = (v) => typeof v === 'number' && Number.isFinite(v);
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const uniq = (xs) => [...new Set(xs)];
const sum = (xs) => xs.reduce((s, x) => s + x, 0);
const round2 = (x) => Math.round(x * 100) / 100;
const enIN = (n) => n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
const num = (s) => Number.parseFloat(String(s).replace(/,/g, ''));
const int = (s) => Number.parseInt(String(s).replace(/,/g, ''), 10);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const yearOf = (d) => (typeof d === 'string' && /^\d{4}/.test(d) ? Number(d.slice(0, 4)) : null);
const countBy = (xs, key) => { const m = new Map(); for (const x of xs) { const k = key(x); m.set(k, (m.get(k) ?? 0) + 1); } return m; };
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const n = s.length; return n === 0 ? null : n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };

const META = F.FORCE_META;
const ASOF = META.asOf;
const RUN = META.runId;
const KILLED = META.killed ?? [];
const BUDGETS = F.FORCE_BUDGETS;
const STRENGTH = F.FORCE_STRENGTH;
const FOOTPRINT = F.FORCE_FOOTPRINT;
const EDGES = F.FORCE_EDGES;
const DOMAIN = F.FORCE_EDGE_DOMAIN;
const FORCE_NODE = new Map(F.FORCE_NODES.map((n) => [n.id, n]));
const OTHER_NODE = new Map();
for (const n of atlas.NODES ?? []) if (!OTHER_NODE.has(n.id)) OTHER_NODE.set(n.id, n);
for (const mod of OTHER_FLEETS) {
  for (const [k, v] of Object.entries(mod)) if (/_NODES$/.test(k) && Array.isArray(v)) for (const n of v) if (n?.id && !OTHER_NODE.has(n.id)) OTHER_NODE.set(n.id, n);
}
/** `nodeOf(id)` — the force module first, then the Atlas and the other fleets; a miss is named. */
const nodeOf = (id) => FORCE_NODE.get(id) ?? OTHER_NODE.get(id) ?? null;
const labelOf = (id) => nodeOf(id)?.label ?? `${id} (not in the register)`;
const resolves = (id) => nodeOf(id) != null;

// Spec §3.2 anchors. Each must be a `body` of ≥ 1 budget row or a node id, else the run aborts (SG-1's observable half).
const MOD = 'min:ministry-of-defence';
const MHA = 'min:ministry-of-home-affairs';
const DELHI_POLICE = 'force:delhi-police';
const PENSIONS_BODY = 'force:defence-pensions';
const DEFENCE_BODIES = [MOD, 'force:indian-army', 'force:indian-navy', 'force:indian-air-force', 'force:drdo', PENSIONS_BODY, 'force:ofb'];
const MOD_ALL_DEMANDS = 'Ministry of Defence — all demands (Summary of Demands for Grants, BE)';
const STATE_SERIES_HEAD = 'Police (MH 2055)';
const BUDGET_BODIES = new Set(BUDGETS.map((r) => r.body));
if (!META.empty) {
  for (const id of [MOD, MHA, DELHI_POLICE, PENSIONS_BODY, ...DEFENCE_BODIES]) {
    if (!BUDGET_BODIES.has(id) && !resolves(id)) throw new Error(`security.test: anchor ${id} is neither a budget-row body nor a node id in the module`);
  }
}

// Prerequisite handles (§0.4): decided from the data, never from the page.
const S1 = BUDGETS.some((r) => 'level' in r);
const S2 = BUDGETS.some((r) => r.component === 'grant-to-states' && 'recipient' in r);
const S3 = Array.isArray(F.FORCE_DENOMINATORS) && F.FORCE_DENOMINATORS.length > 0;
const S4 = [...BUDGETS, ...STRENGTH, ...FOOTPRINT].some((r) => 'tier' in r);
const S5 = Array.isArray(F.FORCE_VENDOR_CLASS) ? F.FORCE_VENDOR_CLASS.length > 0 : !!(F.FORCE_VENDOR_CLASS && Object.keys(F.FORCE_VENDOR_CLASS).length);
const S6 = Array.isArray(F.FORCE_OUTCOMES) && F.FORCE_OUTCOMES.length > 0;
const S7 = FOOTPRINT.some((r) => 'lat' in r && 'lon' in r);
const S8 = !!(SLICE && Array.isArray(SLICE.rates?.byClass));
const S10 = F.FORCE_FOOTPRINT_COVERAGE != null;
const S11 = EDGES.some((e) => 'caseId' in e) || F.FORCE_CASES != null;
const S12 = F.FORCE_BASE_RATES.some((r) => 'fy' in r && 'kind' in r);

const UNION_ROWS = BUDGETS.filter((r) => r.payer === 'union');
const STATE_ROWS = BUDGETS.filter((r) => r.payer !== 'union');
const fyStart = (fy) => Number(String(fy).slice(0, 4));
const fyLabel = (y) => `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
const FY_STARTS = BUDGETS.map((r) => fyStart(r.fy)).filter(Number.isFinite);
const FY_AXIS = FY_STARTS.length ? Array.from({ length: Math.max(...FY_STARTS) - Math.min(...FY_STARTS) + 1 }, (_, i) => fyLabel(Math.min(...FY_STARTS) + i)) : [];
const EDITION = / \(Summary of Demands for Grants, BE\)$/;
/** The test's own implementation of the spec's F5 rule (S1 reads `level`). */
const isDemandLevel = (r) => (S1 ? r.level === 'demand' : /^Demand \d+ — [^:]+?( \(Summary of Demands for Grants, BE\))?$/.test(r.head));
const DEFENCE_DEMANDS = (fy, stage) => {
  const rows = UNION_ROWS.filter((r) => DEFENCE_BODIES.includes(r.body) && isDemandLevel(r) && r.fy === fy && r.stage === stage);
  const plain = rows.filter((r) => !EDITION.test(r.head));
  return plain.length ? plain : rows;
};
const STACK = (fy, stage) => {
  const rows = DEFENCE_DEMANDS(fy, stage);
  const bands = new Map();
  for (const r of rows) bands.set(r.component, (bands.get(r.component) ?? 0) + r.cr);
  const s = sum(rows.map((r) => r.cr));
  const pub = UNION_ROWS.find((r) => r.head === MOD_ALL_DEMANDS && r.fy === fy && r.stage === stage)?.cr ?? null;
  const recon = pub == null ? 'none' : Math.abs(s - pub) <= 0.5 ? 'equal' : 'differs';
  return { rows, bands, sum: s, published: pub, recon };
};
const STAGE_RANK = { actual: 0, RE: 1, BE: 2 };
const coveredFys = (stage) => FY_AXIS.filter((fy) => DEFENCE_DEMANDS(fy, stage).length > 0);
const DEFAULT_STAGE = [...STAGES].sort((a, b) => coveredFys(b).length - coveredFys(a).length || STAGE_RANK[a] - STAGE_RANK[b])[0];
const LATEST_FY = (stage) => coveredFys(stage).at(-1) ?? null;
const PARTIAL = (() => {
  for (const stage of [DEFAULT_STAGE, ...STAGES.filter((s) => s !== DEFAULT_STAGE)]) {
    const fys = coveredFys(stage);
    const counts = new Map(fys.map((fy) => [fy, DEFENCE_DEMANDS(fy, stage).length]));
    const max = Math.max(0, ...counts.values());
    const union = new Set(fys.flatMap((fy) => DEFENCE_DEMANDS(fy, stage).map((r) => r.component)));
    for (const fy of fys) {
      const comps = new Set(DEFENCE_DEMANDS(fy, stage).map((r) => r.component));
      if (counts.get(fy) < max && comps.size < union.size && [...comps].every((c) => union.has(c))) return { fy, stage, k: counts.get(fy), n: max };
    }
  }
  return null;
})();
const MISSING = (stage) => FY_AXIS.filter((fy) => DEFENCE_DEMANDS(fy, stage).length === 0);
const PENSION_SHARE = (fy, stage) => {
  const st = STACK(fy, stage);
  const p = st.bands.get('pension');
  if (p == null) return null;
  return round2((p / (st.published ?? st.sum)) * 100);
};
const BASIS = (fy, stage) => (STACK(fy, stage).published != null ? 'of published total' : 'of stack, computed here');
const POLICE = (fy, stage) => {
  const rows = UNION_ROWS.filter((r) => r.fy === fy && r.stage === stage && ((r.head.includes('(whole demand)') && r.body === MHA) || (/^Demand/.test(r.head) && r.head.includes('Police: Grand Total'))));
  const by = {};
  for (const r of rows) by[r.component] = r.cr;
  return rows.length ? by : null;
};
const DELHI = (fy, stage) => {
  const rows = UNION_ROWS.filter((r) => r.body === DELHI_POLICE && r.fy === fy && r.stage === stage);
  const by = {};
  for (const r of rows) by[r.component] = r.cr;
  return rows.length ? by : null;
};
const PAY = (fy, stage) => UNION_ROWS.filter((r) => r.component === 'pay' && DEFENCE_BODIES.includes(r.body) && r.fy === fy && r.stage === stage);
const LANE_KEY = (r) => `${r.body}|${r.component}|${r.head.replace(/^Demand \d+ — /, '').replace(EDITION, '')}`;
const LANE_SOURCE = UNION_ROWS.filter((r) => r.component !== 'grant-to-states');
const LANES = uniq(LANE_SOURCE.map(LANE_KEY));
const LANE_ROWS = (key) => LANE_SOURCE.filter((r) => LANE_KEY(r) === key);
const DEFENCE_SET = new Set(DEFENCE_BODIES);
const unionBodyCounts = [...countBy(UNION_ROWS, (r) => r.body).entries()].sort((a, b) => b[1] - a[1] || cmp(a[0], b[0]));
const outsideCore = unionBodyCounts.filter(([id]) => !DEFENCE_SET.has(id) && id !== MHA && id !== DELHI_POLICE);
const CAPF_SAMPLE = (outsideCore.find(([id]) => /CRPF|BSF|CISF|ITBP|SSB|Assam Rifles|NSG/.test(nodeOf(id)?.label ?? '')) ?? outsideCore[0])?.[0] ?? null;
const CAPF_LANES = CAPF_SAMPLE ? LANES.filter((k) => k.startsWith(`${CAPF_SAMPLE}|`)).sort() : [];
const CELL_SAMPLE = (() => {
  for (const need of [2, 1]) {
    for (const key of CAPF_LANES) {
      const rows = LANE_ROWS(key);
      for (const fy of uniq(rows.map((r) => r.fy)).sort().reverse()) {
        if (new Set(rows.filter((r) => r.fy === fy).map((r) => r.stage)).size >= need) return { key, fy, body: CAPF_SAMPLE, component: key.split('|')[1], line: key.split('|').slice(2).join('|') };
      }
    }
  }
  return null;
})();
const ZERO_ROWS = BUDGETS.filter((r) => r.cr === 0).sort((a, b) => cmp(a.head, b.head) || cmp(a.fy, b.fy));
const ZERO_ROW = ZERO_ROWS[0] ?? null;
const ZERO_COUNT = ZERO_ROWS.length;
const isReported = (r) => (S4 ? r.tier === 'reported' : /^reported:/.test(r.note ?? ''));
const REPORTED_BUDGET = BUDGETS.filter(isReported);
const REPORTED_STRENGTH = STRENGTH.filter(isReported);
const REPORTED_FOOTPRINT = FOOTPRINT.filter(isReported);
const LAKH_ROWS = BUDGETS.filter((r) => (r.note ?? '').startsWith('RBI Appendix II prints ₹ lakh; converted to ₹ crore (÷100).'));
const STATE_SERIES = STATE_ROWS.filter((r) => r.head === STATE_SERIES_HEAD);
const STATE_PAIRS = [...countBy(STATE_SERIES, (r) => `${r.fy}:${r.stage}`).entries()].map(([k, n]) => {
  const [fy, stage] = k.split(':');
  return { key: k, fy, stage, states: new Set(STATE_SERIES.filter((r) => r.fy === fy && r.stage === stage).map((r) => r.payer)).size, rows: n };
});
const toFyLabel = (y) => {
  if (y == null) return null;
  const s = String(y);
  let m = s.match(/^(\d{4})-(\d{2})$/); if (m) return s;
  m = s.match(/^FY ?(\d{2})$/i); if (m) return fyLabel(2000 + Number(m[1]) - 1);
  m = s.match(/^FY ?(\d{4})$/i); if (m) return fyLabel(Number(m[1]) - 1);
  return s;
};
const GSDP = new Map(economy.states.map((s) => [s.stateCode, s.gsdpCr]));
const GSDP_FY = toFyLabel([...countBy(economy.states.filter((s) => s.gsdpYear), (s) => s.gsdpYear).entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null);
const DEFAULT_PAIR = (m) => {
  const pairs = STATE_PAIRS.filter((p) => (m === 'gsdp' ? p.fy === GSDP_FY : true));
  return [...pairs].sort((a, b) => b.states - a.states || STAGE_RANK[a.stage] - STAGE_RANK[b.stage] || cmp(b.fy, a.fy))[0] ?? null;
};
const SPEND_CLASS = (st, pair, m) => {
  if (st === 'dl') return 'union-funded';
  if (!pair || !STATE_SERIES.some((r) => r.payer === st && r.fy === pair.fy && r.stage === pair.stage)) return 'no-row';
  if (m === 'gsdp' && GSDP.get(st) == null) return 'no-denominator';
  return 'value';
};
const spendValue = (st, pair, m) => {
  const r = STATE_SERIES.find((x) => x.payer === st && x.fy === pair.fy && x.stage === pair.stage);
  if (!r) return null;
  return m === 'gsdp' ? (GSDP.get(st) ? (r.cr / GSDP.get(st)) * 100 : null) : r.cr;
};
const STRENGTH_ST = STRENGTH.filter((r) => r.st);
const STRENGTH_YEARS = uniq(STRENGTH_ST.map((r) => r.year)).sort((a, b) => a - b);
const DEFAULT_SY = [...STRENGTH_YEARS].sort((a, b) => STRENGTH_ST.filter((r) => r.year === b && r.perLakh != null).length - STRENGTH_ST.filter((r) => r.year === a && r.perLakh != null).length || b - a)[0] ?? null;
const STRENGTH_CLASS = (st, sy) => {
  const rows = STRENGTH_ST.filter((r) => r.st === st && r.year === sy);
  if (!rows.length) return 'no-row';
  return rows.some((r) => r.perLakh != null) ? 'value' : 'counts-only';
};
/** The 36 map units, north to south by label-anchor latitude (smaller SVG y is further north), ties by code. */
const UNITS = [...geo.states].sort((a, b) => a.cy - b.cy || cmp(a.id, b.id)).map((s) => s.id);
const STATE_NAME = new Map(geo.states.map((s) => [s.id, s.name]));
assert.equal(UNITS.length, 36, 'india-geo.json holds 36 states/UTs');
const STATE_SAMPLE = UNITS.find((st) => STATE_SERIES.some((r) => r.payer === st)) ?? null;
const STATE_SAMPLE_2 = UNITS.filter((st) => STATE_SERIES.some((r) => r.payer === st))[1] ?? null;
const COMMISSIONERATES = FOOTPRINT.filter((r) => r.kind === 'commissionerate');
const CITY_SAMPLE = [...COMMISSIONERATES].sort((a, b) => UNITS.indexOf(a.st) - UNITS.indexOf(b.st) || cmp(a.city, b.city))[0] ?? null;
const STATE_SERIES_BODIES = new Set(STATE_SERIES.map((r) => r.body));
const CITY_BODIES = uniq([
  ...COMMISSIONERATES.map((r) => r.body),
  ...[...FORCE_NODE.keys(), ...OTHER_NODE.keys()].filter((id) => /-police$/.test(id) && id !== DELHI_POLICE && !STATE_SERIES_BODIES.has(id)),
]);
const DECLARED_KINDS = (() => {
  const m = fleetTypes.match(/export type FootprintKind\s*=([^;]+);/);
  return m ? [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]) : [];
})();
const KINDS = uniq([...DECLARED_KINDS, ...FOOTPRINT.map((r) => r.kind)]);
const EMPTY_KINDS = KINDS.filter((k) => !FOOTPRINT.some((r) => r.kind === k));
const FP_BY_STATE = (kinds) => { const m = new Map(UNITS.map((u) => [u, 0])); for (const r of FOOTPRINT) if (!kinds || kinds.includes(r.kind)) m.set(r.st, (m.get(r.st) ?? 0) + 1); return m; };
const FP_NONE = UNITS.filter((u) => !FOOTPRINT.some((r) => r.st === u));

const AWARDS = EDGES.filter((e) => e.pred === 'award' && e.s === MOD && e.tier !== 'alleged');
const PRICED = AWARDS.filter((e) => finite(e.a));
const UNPRICED = AWARDS.filter((e) => !finite(e.a));
const AWARD_YEARS = uniq(AWARDS.map((e) => yearOf(e.from)).filter((y) => y != null)).sort((a, b) => a - b);
const EMPTY_YEARS = AWARD_YEARS.length ? Array.from({ length: AWARD_YEARS.at(-1) - AWARD_YEARS[0] + 1 }, (_, i) => AWARD_YEARS[0] + i).filter((y) => !AWARD_YEARS.includes(y)) : [];
const ALLEGED_AWARDS = EDGES.filter((e) => e.pred === 'award' && e.tier === 'alleged');
const vendorClass = (id) => {
  if (S5) {
    const decl = Array.isArray(F.FORCE_VENDOR_CLASS) ? F.FORCE_VENDOR_CLASS.find((r) => r.id === id)?.class : F.FORCE_VENDOR_CLASS[id];
    if (decl) return decl;
  }
  const fam = nodeOf(id)?.fam;
  return fam === 'state' ? 'public' : fam === 'capital' ? 'private' : 'unclassified';
};
const isCo = (id) => ['company', 'psu'].includes(nodeOf(id)?.ty);
/** Spec §3.2 `VENDORS` as a function of the footprint rows it reads (AC-11 [Adjudicated 2026-10-07]). */
const vendorUnion = (fpRows) => {
  const base = new Set([...AWARDS.map((e) => e.t), ...ALLEGED_AWARDS.map((e) => e.t)]);
  const out = new Set(base);
  for (const e of EDGES) {
    if (e.pred !== 'analytic') continue;
    if (base.has(e.s) && isCo(e.t)) out.add(e.t);
    if (base.has(e.t) && isCo(e.s)) out.add(e.s);
  }
  for (const r of fpRows) if (['dpsu-plant', 'other'].includes(r.kind) && isCo(r.body)) out.add(r.body);
  for (const e of EDGES) {
    if (e.pred === 'bond') out.add(e.s);
    if (e.pred === 'role' && isCo(e.t)) out.add(e.t);
  }
  return [...out].sort((a, b) => cmp(labelOf(a), labelOf(b)));
};
const VENDORS = vendorUnion(FOOTPRINT);
/** AC-11: the ZERO-SERIES union — the fixture empties the three series, never the graph, so only the footprint arm drops. */
const VENDORS_NOFP = vendorUnion([]);
/** AC-11: the bodies that a `dpsu-plant`/`other` footprint row alone brings into `VENDORS`. */
const FOOT_ONLY = VENDORS.filter((v) => !VENDORS_NOFP.includes(v));
/** Strip fact 2 (§0 strip facts) counted over a vendor set. */
const fact2 = (vs) => `${vs.filter((v) => vendorClass(v) === 'public').length} public-sector beside ${vs.filter((v) => vendorClass(v) === 'private').length} private, JV or foreign — vendor class not a field`;
const VENDOR_SET = new Set(VENDORS);
const COMPARATORS = (v) => uniq(EDGES.filter((e) => e.pred === 'analytic' && ((e.s === v && VENDOR_SET.has(e.t) && e.t !== v) || (e.t === v && VENDOR_SET.has(e.s) && e.s !== v))).map((e) => (e.s === v ? e.t : e.s)));
const VENDOR_NO_AWARD = VENDORS.find((v) => !AWARDS.some((e) => e.t === v) && COMPARATORS(v).length >= 1) ?? null;
const VENDOR_WITH_OWN = VENDORS.find((v) => EDGES.some((e) => e.pred === 'own' && e.s === v && VENDOR_SET.has(e.t))) ?? null;
const PUBLIC_V = VENDORS.filter((v) => vendorClass(v) === 'public');
const PRIVATE_V = VENDORS.filter((v) => vendorClass(v) === 'private');
const UNCLASS_V = VENDORS.filter((v) => vendorClass(v) === 'unclassified');
const JOINT = AWARDS.find((e) => finite(e.a) && VENDORS.filter((v) => `${e.lab ?? ''} ${e.d ?? ''}`.includes(nodeOf(v)?.label ?? '\u0000')).length >= 2) ?? null;

const CASES = F.FORCE_NODES.filter((n) => n.id.startsWith('force:case-')).map((n) => n.id).sort();
const CASE_SET = new Set(CASES);
const touching = (c) => EDGES.filter((e) => e.s === c || e.t === c);
const FIRST_RECORD = (c) => touching(c).map((e) => e.from).filter(Boolean).sort()[0] ?? '9999';
const CASE_PAIRS = (() => {
  const seen = new Map();
  for (const e of EDGES) {
    if (e.pred !== 'analytic' || !CASE_SET.has(e.s) || !CASE_SET.has(e.t) || e.s === e.t) continue;
    const [a, b] = [e.s, e.t].sort();
    const key = `${a}|${b}`;
    if (!seen.has(key)) seen.set(key, { a, b, edges: [] });
    seen.get(key).edges.push(e);
  }
  return [...seen.values()].sort((x, y) => cmp(Math.min(...[FIRST_RECORD(x.a), FIRST_RECORD(x.b)].map((d) => Date.parse(d) || Infinity)), Math.min(...[FIRST_RECORD(y.a), FIRST_RECORD(y.b)].map((d) => Date.parse(d) || Infinity))) || cmp(`${x.a}|${x.b}`, `${y.a}|${y.b}`));
})();
const PAIRED = new Set(CASE_PAIRS.flatMap((p) => [p.a, p.b]));
const UNPAIRED = CASES.filter((c) => !PAIRED.has(c));
const FIRST_PAIR = CASE_PAIRS[0] ?? null;
const PAIR_EDGE_IDS = new Set(CASE_PAIRS.flatMap((p) => p.edges.map((e) => e.id)));
const CASE_FILE = (c) => {
  const parties = new Set(EDGES.filter((e) => ['direct', 'award', 'sector'].includes(e.pred) && (e.s === c || e.t === c)).map((e) => (e.s === c ? e.t : e.s)));
  return EDGES.filter((e) => e.pred !== 'contra' && !PAIR_EDGE_IDS.has(e.id) && (e.s === c || e.t === c || parties.has(e.s) || parties.has(e.t)));
};
const responsesTo = (id) => EDGES.filter((e) => e.pred === 'contra' && e.t === `claim:${id}`);
const CASE_FILE_ENFORCE = uniq(CASES.flatMap((c) => CASE_FILE(c).filter((e) => e.pred === 'enforce').map((e) => e.id))).map((id) => EDGES.find((e) => e.id === id));
const ENFORCE_NO_CONTRA = CASE_FILE_ENFORCE.find((e) => responsesTo(e.id).length === 0) ?? null;
const ENFORCE_WITH_CONTRA = CASE_FILE_ENFORCE.find((e) => responsesTo(e.id).length > 0) ?? null;
const caseOf = (edge) => CASES.find((c) => CASE_FILE(c).some((e) => e.id === edge.id)) ?? null;
const ALLEGED = EDGES.filter((e) => e.tier === 'alleged' && e.pred !== 'contra');
const ANSWERED = ALLEGED.filter((e) => responsesTo(e.id).length > 0);
const CONTRA_IDS = new Set(EDGES.filter((e) => e.pred === 'contra').map((e) => e.id));
const REPLY = EDGES.find((e) => e.pred === 'contra' && typeof e.t === 'string' && CONTRA_IDS.has(e.t.replace(/^claim:/, ''))) ?? null;
const AUDIT_CONTRAS = EDGES.filter((e) => e.pred === 'contra' && (/:audit-contra$/.test(e.id) || e.lab === 'denial found in audit'));
const AUDIT_CONTRA = AUDIT_CONTRAS[0] ?? null;
const ROLE_EDGES = EDGES.filter((e) => e.pred === 'role');
const ROLE_WINDOWS = [...countBy(ROLE_EDGES, (e) => `${e.s}|${e.t}|${e.from ?? ''}|${e.to ?? ''}`).entries()].map(([k, n]) => { const [s, t, from, to] = k.split('|'); return { s, t, from, to, n }; });
const OPEN_ENDED = ROLE_WINDOWS.filter((w) => !w.to);
const BOARD_PAIRS = uniq(ROLE_EDGES.map((e) => e.s)).filter((p) => ROLE_EDGES.some((e) => e.s === p && ['ministry', 'agency'].includes(nodeOf(e.t)?.ty)) && ROLE_EDGES.some((e) => e.s === p && isCo(e.t)));
const BONDS = EDGES.filter((e) => e.pred === 'bond');
const DONORS = uniq(BONDS.map((e) => e.s));
const PARTIES = uniq(BONDS.map((e) => e.t));
const LAWS = EDGES.filter((e) => e.pred === 'law' && DOMAIN[e.id] === 'pay-pensions');
const CONTRACTS = LAWS.filter((e) => !/Pay Commission/.test(nodeOf(e.s)?.label ?? '') || nodeOf(e.t)?.ty !== 'group').sort((a, b) => cmp(a.from ?? '', b.from ?? '') || cmp(a.id, b.id));
const BENEFIT = new Map(F.FORCE_BENEFITS.map((b) => [b.claimId, b]));
const PARTY_NODES = [...F.FORCE_NODES, ...OTHER_NODE.values()].filter((n) => n.ty === 'party');
const PARTY_WORDS = uniq([
  ...PARTY_NODES.flatMap((n) => [n.label, ...(n.al ?? [])]),
  'UPA', 'NDA', 'BJP', 'Congress', 'ruling', 'opposition', 'government of the day', 'era', 'regime', 'incumbent', "government's",
].filter(Boolean));
const VOIDS = (domains) => F.FORCE_VOIDS.filter((v) => domains.includes(v.domain));
const GAPS = (domains) => F.FORCE_GAPS.filter((g) => domains.includes(g.domain));
const BASE_RATES = (domain) => F.FORCE_BASE_RATES.filter((r) => r.domain === domain);
const SYMMETRY = (domain) => F.FORCE_SYMMETRY.find((s) => s.domain === domain)?.text ?? null;
const isInt = (x) => finite(x) && Number.isInteger(x);
const TWO_FIGURES = F.FORCE_BASE_RATES.find((r) => finite(r.numerator) && finite(r.denominator) && (r.numerator > r.denominator || !isInt(r.numerator) || !isInt(r.denominator)) && !(S12 && r.kind === 'share')) ?? null;
const SMALL_YEARS = S8 ? SLICE.rates.byClassYear.filter((r) => r.n < 10) : [];
const CAPF_CLASS = S8 ? SLICE.rates.byClass.find((r) => r.class === 'capf') ?? null : null;
/**
 * The two works figures (AC-24, AC-32) [Adjudicated 2026-10-07]. "One works buyer" is the
 * largest works-class buyer's rows over the slice's dedup decisions, read from `classes.map`
 * (74.41 in this build); the class share (works dedup rows over the same total, 75.79) is a
 * different figure and is labelled "the works class (MES and BRO)".
 */
const WORKS_BUYER_PCT = (() => {
  if (!S8) return null;
  const byBuyer = new Map();
  for (const r of SLICE.classes?.map ?? []) if (r.class === 'works') byBuyer.set(r.buyer, (byBuyer.get(r.buyer) ?? 0) + r.rows);
  if (!byBuyer.size) throw new Error('security.test: §0.5 SLICE has no works buyer in classes.map (research/raw/cppp/security-page.json)');
  return round2((Math.max(...byBuyer.values()) / SLICE.quality.total.dedupRows) * 100);
})();
const WORKS_CLASS_PCT = S8 ? round2((SLICE.quality.byClass.find((c) => c.class === 'works').dedupRows / SLICE.quality.total.dedupRows) * 100) : null;
const UNRESOLVED = EDGES.filter((e) => !resolves(e.s) || (!String(e.t).startsWith('claim:') && !resolves(e.t))).map((e) => e.id);
const EMPTY_SRCS = EDGES.filter((e) => !(e.srcs?.length));
const edgeById = new Map(EDGES.map((e) => [e.id, e]));
const ANALYTIC = EDGES.filter((e) => e.pred === 'analytic');
const FIRST_SRC = (r) => r.srcs?.[0]?.[0] ?? null;
const SPLIT_IDS = [...countBy([...F.FORCE_NODES], (n) => n.label).entries()].filter(([, k]) => k > 1).length;

// ---------------------------------------------------------------------------
// Servers, browser and the two scaffold builds (§0.3)
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

/** The newest mtime under the inputs a scaffold build depends on — a cache older than this tests yesterday's page. */
function newestInput() {
  let newest = 0;
  const walk = (p) => {
    if (!existsSync(p)) return;
    const st = statSync(p);
    if (st.isDirectory()) { for (const f of readdirSync(p)) walk(join(p, f)); return; }
    if (st.mtimeMs > newest) newest = st.mtimeMs;
  };
  for (const rel of ['src', 'research/raw/force', 'research/raw/cppp/security-page.json', 'vite.config.ts', 'index.html', 'package.json']) walk(join(root, rel));
  return newest;
}

/**
 * Build a scaffold in a scratch copy of the repository: `mutate(scratch)` shapes the raw
 * files there, the assembler writes the generated modules, `check` reads the force module
 * back, and vite builds into `outName`. The working tree's research/raw/ and
 * *.generated.ts are never touched. The force module is copied next to the build so
 * the build's own fixtures can be read later.
 */
async function scratchBuild(outName, mutate, check, rebuildEnv) {
  const out = join(root, outName);
  const stamp = join(out, 'index.html');
  if (existsSync(stamp) && !process.env[rebuildEnv] && statSync(stamp).mtimeMs >= newestInput()) return out;
  const scratch = mkdtempSync(join(tmpdir(), `icip-${outName}-`));
  const EXCLUDE = /^(node_modules|dist[^/]*|\.git|tsconfig\.tsbuildinfo)(\/|$)/;
  cpSync(root, scratch, {
    recursive: true,
    filter: (src) => !EXCLUDE.test(relative(root, src).split(sep).join('/')),
  });
  symlinkSync(join(root, 'node_modules'), join(scratch, 'node_modules'));
  mutate(scratch);
  // The assembler may exit non-zero on another fleet's unreconciled files; what matters
  // is what it wrote for the force module.
  spawnSync(process.execPath, ['scripts/assemble-fleet.mjs'], { cwd: scratch, stdio: 'pipe' });
  const modFile = join(scratch, 'src/graph/force.generated.ts');
  await check(await importTs(modFile, `${outName}-check`), readFileSync(modFile, 'utf8'));
  execFileSync(process.execPath, [join(scratch, 'node_modules/vite/bin/vite.js'), 'build', '--outDir', outName], { cwd: scratch, stdio: 'pipe' });
  rmSync(out, { recursive: true, force: true });
  cpSync(join(scratch, outName), out, { recursive: true });
  mkdirSync(join(out, 'modules'), { recursive: true });
  writeFileSync(join(out, 'modules', 'force.generated.ts'), readFileSync(modFile, 'utf8'));
  rmSync(scratch, { recursive: true, force: true });
  return out;
}

function ensureDistEmpty() {
  return scratchBuild(
    'dist-empty-security',
    (scratch) => rmSync(join(scratch, 'research/raw/force'), { recursive: true, force: true }),
    (mod) => { if (mod.FORCE_META?.empty !== true) throw new Error('dist-empty-security: FORCE_META.empty is not true'); },
    'SECURITY_REBUILD_EMPTY',
  );
}

function ensureDistZero() {
  return scratchBuild(
    'dist-zero-security',
    (scratch) => {
      const dir = join(scratch, 'research/raw/force');
      for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
        const file = join(dir, f);
        const json = JSON.parse(readFileSync(file, 'utf8'));
        if (json && typeof json === 'object' && !Array.isArray(json)) {
          for (const k of ['budgets', 'strength', 'footprint']) delete json[k];
          writeFileSync(file, JSON.stringify(json, null, 1));
        }
      }
    },
    (mod) => {
      // §0.3: the three facts, asserted on the scratch module before building.
      for (const k of ['FORCE_BUDGETS', 'FORCE_STRENGTH', 'FORCE_FOOTPRINT']) {
        if (!Array.isArray(mod[k]) || mod[k].length !== 0) throw new Error(`dist-zero-security: ${k} is not []`);
      }
      const series = mod.FORCE_META?.series ?? {};
      if (Object.values(series).some((v) => v !== 0)) throw new Error(`dist-zero-security: FORCE_META.series is not all zeros (${JSON.stringify(series)})`);
      if (mod.FORCE_EDGES.length !== EDGES.length || mod.FORCE_NODES.length !== F.FORCE_NODES.length) throw new Error('dist-zero-security: the graph changed');
    },
    'SECURITY_REBUILD_ZERO',
  );
}

let browser;
let full; // { server, base } — FULL
let empty; // EMPTY
let zero; // ZERO-SERIES
let BUILD = process.env.SECURITY_BUILD ?? null;
const contexts = {};

const CTX = {
  D: { viewport: { width: 1440, height: 900 } },
  FOLD: { viewport: { width: 1280, height: 800 } },
  M: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  M360: { viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true },
};

// §0.1: smoke's EXTERNAL allow-list verbatim, plus finance's adjudicated favicon exclusion.
const EXTERNAL = /fonts\.(googleapis|gstatic)\.com|ERR_CONNECTION_RESET|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|ERR_CERT_AUTHORITY_INVALID|vite\.svg|is not a secure context and the resource is in more-private address space/;

/**
 * In-page helpers, installed as an init script so `page.evaluate` bodies stay short.
 * Regexes cross the boundary as source strings — RegExp objects do not serialise.
 */
const HELPERS = `
window.__ac = {
  TABBABLE: ${JSON.stringify(TABBABLE)},
  txt(el) { return (el ? (el.innerText ?? el.textContent ?? '') : '').replace(/\\s+/g, ' ').trim(); },
  raw(el) { return (el ? (el.textContent ?? '') : '').replace(/\\s+/g, ' ').trim(); },
  deepestAll(root, src, flags) {
    const r = new RegExp(src, flags ?? '');
    if (!root) return [];
    return [root, ...root.querySelectorAll('*')].filter(
      (e) => r.test(this.txt(e)) && ![...e.children].some((c) => r.test(this.txt(c))),
    );
  },
  deepest(root, src, flags) { return this.deepestAll(root, src, flags)[0] ?? null; },
  precedes(a, b) { return !!(a && b && (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)); },
  params() { return new URLSearchParams((location.hash.split('?')[1] ?? '')); },
  /** Accessible name, approximately: aria-label, aria-labelledby, label[for]/wrapping label, an svg <title>, title, else text. */
  name(el) {
    if (!el) return '';
    const al = el.getAttribute('aria-label'); if (al) return al.replace(/\\s+/g, ' ').trim();
    const lb = el.getAttribute('aria-labelledby');
    if (lb) return lb.split(/\\s+/).map((id) => this.txt(document.getElementById(id))).join(' ').replace(/\\s+/g, ' ').trim();
    if (el.id) { const l = document.querySelector('label[for="' + CSS.escape(el.id) + '"]'); if (l) return this.txt(l); }
    const wrap = el.closest('label'); if (wrap && el.matches('input, select, textarea')) return this.txt(wrap);
    const t = el.querySelector(':scope > title'); if (t) return this.txt(t);
    const txt = el.matches('select') ? '' : this.txt(el); if (txt) return txt;
    const title = el.getAttribute('title'); if (title) return title.trim();
    return '';
  },
  described(el) { const ids = (el?.getAttribute('aria-describedby') ?? '').split(/\\s+/).filter(Boolean); return ids.map((id) => this.txt(document.getElementById(id))).join(' '); },
  table(t) {
    if (!t) return null;
    const table = t.matches('table') ? t : t.querySelector('table');
    if (!table) return null;
    const headers = [...table.querySelectorAll('thead th, thead td')].map((h) => this.txt(h));
    const rows = [...table.querySelectorAll('tbody tr')].map((tr) => [...tr.children].map((c) => this.txt(c)));
    return { headers, rows, caption: this.txt(table.querySelector('caption')) };
  },
  col(tbl, name) { return tbl ? tbl.headers.findIndex((h) => h.toLowerCase().startsWith(name.toLowerCase())) : -1; },
  visible(e) { return !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden'; },
  tabbables(root) { return [...(root ?? document).querySelectorAll(this.TABBABLE)].filter((e) => !e.closest('[hidden]') && !e.closest('details:not([open]) > :not(summary)') && this.visible(e)); },
  rgb(color) { const p = document.createElement('span'); p.style.color = color; document.body.appendChild(p); const c = getComputedStyle(p).color; p.remove(); return c; },
  token(name) { return this.rgb(getComputedStyle(document.documentElement).getPropertyValue(name).trim()); },
  amber() { const el = document.querySelector('.text-amber'); return el ? getComputedStyle(el).color : this.token('--color-amber'); },
  /** A panel the criteria name (CellCard, StatePanel, FYReadout, BodyCard, VendorCard, RecordCard): the box around an h2 that holds a Close or Back control. */
  card(test) {
    const hs = [...document.querySelectorAll('h2')].filter((h) => test(this.txt(h)));
    for (const h of hs) {
      let el = h.parentElement;
      while (el && el !== document.body) {
        if ([...el.querySelectorAll('button, a')].some((b) => /^(Close|Back to )/.test(this.txt(b)))) return el;
        el = el.parentElement;
      }
    }
    return null;
  },
  q(id) { return document.querySelector('[data-q="' + id + '"]'); },
  /** A Q-block, or an empty detached one when the page has none: counts then read 0 and the assertion names the absence. */
  qq(id) { return this.q(id) ?? document.createElement('section'); },
  fillClasses(root) { return [...(root ?? document).querySelectorAll('path[data-fill-class]')].map((p) => p.getAttribute('data-fill-class')); },
  figuresText() { return [...document.querySelectorAll('figure')].map((f) => this.txt(f)); },
  activeFilter() { const e = this.deepest(document.querySelector('main') ?? document.body, '^filters: '); return e ? this.txt(e) : null; },
  strip() { return this.txt(document.querySelector('section[aria-label="Denominators"]')); },
  /** The ReconciliationLine: the element whose text reads 'N rows|installations|records = '. */
  recon() { return this.deepest(document.querySelector('main') ?? document.body, '^[\\\\d,]+ (rows|installations|records) = '); },
  dash(el) { const d = el ? (el.getAttribute('stroke-dasharray') ?? getComputedStyle(el).strokeDasharray) : null; return d == null || d === '' || d === 'none' ? 'none' : d.replace(/px/g, '').replace(/,/g, ' ').replace(/\\s+/g, ' ').trim(); },
  live() { return this.txt(document.querySelector('[aria-live]')); },
};
`;

before(async () => {
  const dist = process.env.SECURITY_DIST ?? join(root, 'dist');
  if (!existsSync(join(dist, 'index.html'))) throw new Error(`${dist}/index.html missing — run \`npm run build\` first.`);
  const PINNED = process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/opt/pw-browsers/chromium';
  browser = await chromium.launch(existsSync(PINNED) ? { executablePath: PINNED } : {});
  for (const [k, v] of Object.entries(CTX)) {
    contexts[k] = await browser.newContext({ ...v, reducedMotion: 'reduce', permissions: ['clipboard-read', 'clipboard-write'], acceptDownloads: true });
    contexts[k].setDefaultTimeout(ACTION_TIMEOUT);
    await contexts[k].addInitScript(HELPERS);
  }
  const served = await serve(dist);
  // Detect which build `dist` is from the DOM (§0.3) unless SECURITY_BUILD says.
  if (!BUILD) {
    const page = await contexts.D.newPage();
    await page.goto(`${served.base}/#/security`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(SETTLE);
    BUILD = await page.evaluate(([callout, zeroLine]) => {
      if (window.__ac.deepestAll(document.body, '^' + callout + '$').length > 0) return 'empty';
      if (document.body.innerText.includes(zeroLine)) return 'zero';
      return 'full';
    }, [CALLOUT, NO_BUDGET_ROWS]);
    await page.close();
  }
  if (BUILD === 'empty') empty = served;
  else if (BUILD === 'zero') zero = served;
  else {
    full = served;
    empty = await serve(await ensureDistEmpty());
    zero = await serve(await ensureDistZero());
  }
});

after(async () => {
  await browser?.close();
  for (const s of [full, empty, zero]) s?.server.close();
});

// ---------------------------------------------------------------------------
// Page helpers
// ---------------------------------------------------------------------------

const requireFull = (t) => { if (!full) { t.skip(`SKIPPED: FULL-build criterion; this dist is the ${BUILD} build`); return false; } return true; };
const requireEmpty = (t) => { if (!empty) { t.skip(`SKIPPED: EMPTY-build criterion; no EMPTY build in this run (${BUILD})`); return false; } return true; };
const requireZero = (t) => { if (!zero) { t.skip(`SKIPPED: ZERO-SERIES criterion; no ZERO-SERIES build in this run (${BUILD})`); return false; } return true; };
const need = (t, value, what) => { if (value == null || value === false || (Array.isArray(value) && !value.length)) { t.skip(`SKIPPED: ${what}`); return false; } return true; };

/** Open a page in a context, run the check, and fail on any console or page error (§0.1). */
async function withPage(vp, fn) {
  const page = await contexts[vp].newPage();
  const errors = [];
  let lastFailed = null;
  page.on('requestfailed', (r) => { lastFailed = r.url(); });
  page.on('console', (m) => {
    if (m.type() !== 'error' || EXTERNAL.test(m.text())) return;
    if (/^Failed to load resource: net::ERR_FAILED$/.test(m.text().trim()) && (/\/vite\.svg$/.test(lastFailed ?? '') || /\/vite\.svg$/.test(m.location()?.url ?? ''))) return;
    errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  try {
    await fn(page);
    assert.deepEqual(errors, [], `console/page errors: ${errors.join(' | ')}`);
  } finally {
    await page.close();
  }
}

/** about:blank first (smoke's rule), then networkidle, article.pb-20, `main h1`, and the settle (§0.1). */
async function load(page, route, { base = full?.base, graph = false, slice = false } = {}) {
  await page.goto('about:blank');
  await page.goto(`${base}/#${route}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('article.pb-20', { timeout: ACTION_TIMEOUT });
  await page.waitForSelector('main h1', { timeout: ACTION_TIMEOUT });
  await page.waitForTimeout(SETTLE);
  if (graph) await page.waitForTimeout(GRAPH_SETTLE);
  if (slice) await page.waitForFunction(() => !document.body.innerText.includes('Loading the open-market slice…'), null, { timeout: 5_000 });
}
const route = (lens, extra = '') => `${LENS_ROUTE[lens]}${extra ? (LENS_ROUTE[lens].includes('?') ? '&' : '?') + extra : ''}`;
const hashParams = (page) => new URLSearchParams((new URL(page.url()).hash.split('?')[1] ?? ''));
const waitParam = (page, key, value) => page.waitForFunction(([k, v]) => {
  const p = new URLSearchParams(location.hash.split('?')[1] ?? '');
  return v == null ? p.has(k) : p.get(k) === v;
}, [key, value ?? null], { timeout: ACTION_TIMEOUT });
const waitNoParam = (page, key) => page.waitForFunction((k) => !new URLSearchParams(location.hash.split('?')[1] ?? '').has(k), key, { timeout: ACTION_TIMEOUT });
const text = async (loc) => (await loc.innerText({ timeout: ACTION_TIMEOUT })).replace(/\s+/g, ' ').trim();
const bodyText = (page) => page.evaluate(() => document.body.innerText);
const style = (loc, prop) => loc.evaluate((el, p) => getComputedStyle(el)[p], prop);
const rect = (loc) => loc.evaluate((el) => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height }; });
const deepest = (page, src, scope = 'body') => page.evaluate(([s, sc]) => { const el = window.__ac.deepest(document.querySelector(sc), s); return el ? window.__ac.txt(el) : null; }, [src, scope]);
const deepestCount = (page, src, scope = 'body') => page.evaluate(([s, sc]) => window.__ac.deepestAll(document.querySelector(sc), s).length, [src, scope]);
const count = (page, sel) => page.locator(sel).count();
const strip = (page) => page.locator(STRIP).first();
const stripText = (page) => page.evaluate(() => window.__ac.strip());
const liveText = (page) => page.evaluate(() => window.__ac.live());
const caption = (page, id) => page.locator(`[data-caption="${id}"]`).first();
const block = (page, id) => page.locator(`[data-q="${id}"]`).first();
const twin = (page, name) => page.locator(`details[data-twin="${name}"]`).first();
const activeFilterText = (page) => page.evaluate(() => window.__ac.activeFilter());
const reconText = (page) => page.evaluate(() => { const e = window.__ac.recon(); return e ? window.__ac.txt(e) : null; });
const amberColour = (page) => page.evaluate(() => window.__ac.amber());
const tokenColour = (page, name) => page.evaluate((n) => window.__ac.token(n), name);
const tab = (page, lens) => page.getByRole('tab', { name: new RegExp(`^${esc(LENS_TAB[lens])}`) }).first();
const findInput = (page) => page.locator('input[type="search"]').first();
const tierToggle = (page, tier) => page.locator('button[aria-pressed]').filter({ hasText: new RegExp(`^\\s*${tier}\\b`, 'i') }).first();
const stageOption = (page, stage) => page.locator('button[aria-pressed]').filter({ hasText: new RegExp(`^\\s*${stage} · \\d+ of \\d+ FYs`) }).first();
const stateSelect = (page) => page.getByLabel('State (where the record places it)').first();
const fySelects = (page) => page.locator('select').filter({ has: page.locator('option', { hasText: /^All years$/ }) });
const pairSelect = (page) => page.locator(`[data-q="B6"] select`).filter({ has: page.locator('option', { hasText: / states/ }) }).first();
const controlCard = (page) => page.locator('section, aside, article, div').filter({ has: page.getByRole('heading', { name: CONTROL_HEADING, exact: true }) }).last();
/** A panel by its h2 (CellCard, StatePanel, FYReadout, BodyCard, VendorCard, RecordCard), as {text, h2} or null. */
const panel = (page, h2src) => page.evaluate((s) => {
  const re = new RegExp(s);
  const el = window.__ac.card((t) => re.test(t));
  return el ? { text: window.__ac.txt(el), h2: window.__ac.txt(el.querySelector('h2')) } : null;
}, h2src);

/** TWIN(name) (§0.7): open by clicking its summary unless already open; rows = tbody tr (at M, [data-row]). */
async function openTwin(page, name) {
  const d = twin(page, name);
  await d.waitFor({ state: 'attached', timeout: ACTION_TIMEOUT });
  if (!(await d.evaluate((el) => el.open))) await d.locator('summary').first().click();
  await page.waitForFunction((n) => document.querySelector(`details[data-twin="${n}"]`)?.open, name, { timeout: ACTION_TIMEOUT });
  return d;
}
const twinRows = (page, name) => page.evaluate((n) => {
  const d = document.querySelector(`details[data-twin="${n}"]`);
  if (!d) return -1;
  const tr = d.querySelectorAll('tbody tr').length;
  return tr || d.querySelectorAll('[data-row]').length;
}, name);
const twinTable = (page, name) => page.evaluate((n) => window.__ac.table(document.querySelector(`details[data-twin="${n}"]`)), name);
/**
 * TWIN(name) content in either form §0.7 names: the <table> at D/FOLD, the StackTable cards at M ([data-row] <dl>s,
 * dt = column label, dd = cell). Card values are aligned to the headers by dt label, never by position.
 */
const twinRecords = (page, name) => page.evaluate((n) => {
  const d = document.querySelector(`details[data-twin="${n}"]`);
  if (!d) return null;
  const t = window.__ac.table(d);
  if (t) return t;
  const cards = [...d.querySelectorAll('[data-row]')];
  if (!cards.length) return null;
  const pairs = (c) => [...c.querySelectorAll('dt')].map((dt) => [window.__ac.txt(dt), window.__ac.txt(dt.nextElementSibling)]);
  const headers = pairs(cards[0]).map(([h]) => h);
  const rows = cards.map((c) => { const m = new Map(pairs(c)); return headers.map((h) => (m.has(h) ? m.get(h) : null)); });
  return { headers, rows, caption: window.__ac.txt(d.querySelector('[data-twin-caption]')) };
}, name);
async function openTwinRows(page, name) { await openTwin(page, name); return twinRows(page, name); }

/** Press `Download .tsv` inside a twin; returns {name, text}. */
async function downloadTsv(page, name, nth = 0) {
  const d = await openTwin(page, name);
  const btn = d.getByRole('button', { name: /^Download \.tsv/ }).nth(nth);
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: ACTION_TIMEOUT }), btn.click()]);
  const path = await dl.path();
  return { name: dl.suggestedFilename(), text: readFileSync(path, 'utf8') };
}
const tsvRows = (tsv) => tsv.split('\n').filter((l) => l && !l.startsWith('#'));

/** Every page of a paged twin (tp=1…), as tables. */
async function allTwinPages(page, name, base) {
  const out = [];
  for (let tp = 1; tp < 60; tp++) {
    await load(page, `${base}${base.includes('?') ? '&' : '?'}view=table${tp > 1 ? `&tp=${tp}` : ''}`);
    const tbl = await twinTable(page, name);
    if (!tbl) break;
    out.push(tbl);
    const pager = await deepest(page, 'page (\\d+) of (\\d+)', `details[data-twin="${name}"]`);
    const m = pager?.match(/page (\d+) of (\d+)/);
    if (!m || int(m[1]) >= int(m[2])) break;
  }
  return out;
}

/** §0.7 step (4), Patch B: does the active-filter line present a non-filter param (its code, an accent's label, the Find text) as a filter? */
async function nonFilterNamed(page, param, nv) {
  const line = await page.evaluate(() => window.__ac.activeFilter());
  if (!line) return false;
  if (new RegExp(`\\b${esc(param)}[=:]`).test(line)) return true;
  if (['body', 'vendor', 'case'].includes(param)) return line.includes(labelOf(nv)) || line.includes(nv);
  if (param === 'find') return line.toLowerCase().includes(String(nv).toLowerCase());
  return false;
}

/**
 * ROUND-TRIP(param=value) (§0.7). `change` alters the control once through the UI and
 * returns the new value; `reset` returns it to its default. `filter` marks a page filter —
 * `payer`, `st`, `fy`, `stage`, `comp`, `kind`, `tier` (amended §0.7 step (4), spec §6) —
 * whose value the active-filter line must name in the words its control shows: `words(nv,
 * page)` returns the RegExp(s) (or plain strings, matched case-insensitively) that must
 * match the line, and `rawCode(nv)` the escaped raw value code that must not be printed.
 * Every other param is exempt from step (4) — `lens`, `view`, `tp`, `sfy`, `m`, `sy`, `body`,
 * `vendor`, `case`, `cell`, `rec` and, under the adjudicated Reading B (2026-10-07), `find` —
 * and is asserted instead through `visible(page, nv)`, its visible state; the line must not
 * present any of them as a filter.
 */
async function roundTrip(page, { lens = 'budgets', param, value, check, change, reset, filter = true, words, rawCode, visible }) {
  await load(page, route(lens, `${param}=${encodeURIComponent(value)}`));
  if (check) await check(page);
  let nv = value;
  if (change) {
    const before = await page.evaluate(() => history.length);
    nv = await change(page);
    await waitParam(page, param, nv);
    assert.equal(await page.evaluate(() => history.length), before, `${param}: the control writes with replace, not push`);
  }
  const snap = async (p) => ({
    strip: await p.evaluate(() => window.__ac.strip()),
    figures: await p.evaluate(() => window.__ac.figuresText()),
    filters: await p.evaluate(() => window.__ac.activeFilter()),
  });
  const first = await snap(page);
  const fresh = await page.context().newPage();
  try {
    await fresh.goto('about:blank');
    await fresh.goto(page.url(), { waitUntil: 'networkidle' });
    await fresh.waitForSelector('article.pb-20');
    await fresh.waitForTimeout(SETTLE);
    assert.deepEqual(await snap(fresh), first, `${param}=${nv}: a fresh page reproduces the strip, every figure and the active-filter line`);
  } finally {
    await fresh.close();
  }
  if (filter) {
    assert.ok(first.filters, `${param}=${nv}: an active-filter line is present`);
    assert.ok(!first.filters.includes(`${param}=`) && !new RegExp(`\\b${param}:`).test(first.filters), `${param}: the line does not print the param code (reads "${first.filters}")`);
    assert.ok(typeof words === 'function', `${param}: a filter round-trip must say which words name the value`);
    const line = first.filters.replace(/\s*·\s*reset\s*$/, '');
    for (const w of [].concat(await words(nv, page))) {
      const ok = w instanceof RegExp ? w.test(line) : line.toLowerCase().includes(String(w).toLowerCase());
      assert.ok(ok, `${param}=${nv}: the active-filter line names the value in words, ${w} (reads "${first.filters}")`);
    }
    if (rawCode) assert.ok(!new RegExp(`(^|[\\s:·])${rawCode(nv)}([\\s·]|$)`).test(first.filters), `${param}=${nv}: the raw code is not printed (reads "${first.filters}")`);
  } else if (visible) {
    await visible(page, nv);
  }
  if (!filter && first.filters) assert.ok(!(await nonFilterNamed(page, param, nv)), `${param}: a non-filter is not presented on the "filters:" line (reads "${first.filters}")`);
  if (reset) {
    await reset(page);
    await waitNoParam(page, param);
  }
}

/** Find (§5.0.4): type, then the 400 ms the criteria give it. */
async function find(page, q) {
  await findInput(page).fill(q);
  await page.waitForTimeout(FIND_SETTLE);
}

/** Every element whose own text prints a ₹ figure, with its [data-cr] ancestor's text (AC-29, AC-47). */
const rupeeElements = (page, scope = 'main') => page.evaluate((sc) => {
  const root = document.querySelector(sc) ?? document.body;
  return window.__ac.deepestAll(root, '₹[\\d,]+(\\.\\d+)? cr').map((e) => {
    const holder = e.closest('[data-cr]');
    return {
      text: window.__ac.txt(e),
      holder: holder ? window.__ac.txt(holder) : null,
      cr: holder?.getAttribute('data-cr') ?? null,
      gridCell: !!e.closest('[role="grid"]'),
      name: holder ? window.__ac.name(holder) : '',
    };
  });
}, scope);

/**
 * Harvest the `cell` value the page itself writes for a (lane, FY): load `?body=`, focus the
 * ledger cell button named `{body label} — {component} — {line}, FY{fy}: …` (matched on body,
 * component and line), press Enter, read `cell` from the URL (§0.5 CELL_PARAM; AC-85).
 */
async function harvestCell(page, { key, fy, query = '' }) {
  const [body, comp, ...rest] = key.split('|'); const line = rest.join('|');
  await load(page, `/security?body=${encodeURIComponent(body)}${query ? '&' + query : ''}`);
  const label = labelOf(body);
  const cells = page.locator('[role="grid"] [aria-label]');
  const idx = await cells.evaluateAll((els, [pfx]) => els.findIndex((e) => (e.getAttribute('aria-label') ?? '').startsWith(pfx)), [`${label} — ${comp} — ${line}, FY${fy}:`]);
  assert.ok(idx >= 0, `a ledger cell button named "${label} — ${comp} — ${line}, FY${fy}: …" exists`);
  await cells.nth(idx).focus();
  await page.keyboard.press('Enter');
  await waitParam(page, 'cell');
  return hashParams(page).get('cell');
}
/** §0.5 CELL_PARAM: the cell param for CELL_SAMPLE, written by the ledger's own cell button (the slug is the page's, not the test's). */
let CELL_PARAM = null;
async function cellParam(page) {
  if (CELL_PARAM) return CELL_PARAM;
  if (!CELL_SAMPLE) return null;
  CELL_PARAM = await harvestCell(page, { key: CELL_SAMPLE.key, fy: CELL_SAMPLE.fy });
  assert.match(CELL_PARAM ?? '', new RegExp(`^.+@${esc(CELL_SAMPLE.fy)}$`), `the cell param has the form {laneKey slug}@${CELL_SAMPLE.fy} (got "${CELL_PARAM}")`);
  return CELL_PARAM;
}

/** GREY (§0.7): mean luminance and variance of a 12 × 12 sample of a PNG screenshot buffer. */
async function greySample(page, clip) {
  const png = await page.screenshot({ clip: { x: Math.max(0, clip.x), y: Math.max(0, clip.y), width: 12, height: 12 } });
  return page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const ls = [];
    for (let i = 0; i < d.length; i += 4) ls.push(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]);
    const mean = ls.reduce((s, x) => s + x, 0) / ls.length;
    const variance = ls.reduce((s, x) => s + (x - mean) ** 2, 0) / ls.length;
    return { mean, variance };
  }, png.toString('base64'));
}
const greyDistinct = (a, b) => Math.abs(a.mean - b.mean) >= 8 || Math.abs(a.variance - b.variance) >= 400;

/** NO-HSCROLL (§0.7). */
async function noHScroll(page) {
  return page.evaluate(async () => {
    const out = [];
    const check = () => {
      if (document.scrollingElement.scrollWidth > window.innerWidth) out.push(`scrollWidth ${document.scrollingElement.scrollWidth} > ${window.innerWidth} at y=${scrollY}`);
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.right <= window.innerWidth + 0.5) continue;
        let a = el.parentElement, scrolls = false;
        while (a && a !== document.body) { const ox = getComputedStyle(a).overflowX; if (ox === 'auto' || ox === 'scroll' || ox === 'hidden' || ox === 'clip') { scrolls = true; break; } a = a.parentElement; }
        if (!scrolls) { out.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''} right ${Math.round(r.right)} > ${window.innerWidth}`); break; }
      }
    };
    window.scrollTo(0, 0); check();
    const step = window.innerHeight * 10;
    for (let y = step; y < document.scrollingElement.scrollHeight + step; y += step) { window.scrollTo(0, y); await new Promise((r) => requestAnimationFrame(r)); check(); }
    window.scrollTo(0, 0);
    return out.slice(0, 5);
  });
}

/** Tab presses from the first TABBABLE in <main> until `pred(activeElement)`; returns the count or Infinity past `limit`. */
async function tabsTo(page, limit, predSrc) {
  await page.evaluate(() => { const first = window.__ac.tabbables(document.querySelector('main'))[0]; first?.focus(); });
  for (let i = 0; i <= limit; i++) {
    const hit = await page.evaluate((s) => { const el = document.activeElement; return !!el && new Function('el', `return (${s})(el);`)(el); }, predSrc);
    if (hit) return i;
    await page.keyboard.press('Tab');
  }
  return Infinity;
}

test('§0.6 — keyed hooks carry their register key', async (t) => {
  if (!requireFull(t)) return;
  await withPage('D', async (page) => {
    await load(page, '/security');
    const r = await page.evaluate(() => ({
      def: [...document.querySelectorAll('[data-column][data-panel="defence"]')].map((c) => c.getAttribute('data-column')),
      pol: [...document.querySelectorAll('[data-column][data-panel="police"]')].map((c) => c.getAttribute('data-column')),
      lanes: [...document.querySelectorAll('[data-lane]')].map((e) => e.getAttribute('data-lane')),
    }));
    assert.deepEqual(r.def, FY_AXIS, 'data-column = FY_AXIS labels, in order');
    assert.ok(r.pol.every((v) => FY_AXIS.includes(v)), 'police data-column values ∈ FY_AXIS');
    assert.ok(r.lanes.every((v) => LANES.includes(v)), 'every data-lane ∈ LANES');
    assert.equal(new Set(r.lanes).size, r.lanes.length, 'data-lane values distinct');
    await load(page, '/security?lens=procurement');
    const cs = await page.evaluate(() => [...document.querySelectorAll('[data-case]')].map((d) => d.getAttribute('data-case')));
    const real = cs.filter((v) => v !== 'none');
    assert.deepEqual([...real].sort(), [...CASES].sort(), 'each CASES id exactly once');
    assert.equal(cs.length - real.length, UNPAIRED.length, 'one data-case="none" per unpaired case');
  });
});

// ---------------------------------------------------------------------------
// §1 Scaffold state — EMPTY and ZERO-SERIES builds
// ---------------------------------------------------------------------------

/** The kicker is compared on textContent: a CSS text-transform changes innerText, not the words. */
const kickerPresent = (page) => page.evaluate((k) => [...document.querySelectorAll('main *')].some((e) => window.__ac.raw(e) === k && ![...e.children].some((c) => window.__ac.raw(c) === k)), KICKER);

/** The fixed words of each #resolution row and its mono line, as the page prints them. */
const resolutionRows = (page) => page.evaluate((rows) => {
  const sec = document.querySelector('#resolution');
  if (!sec) return null;
  const h2 = sec.querySelector('h2');
  const dts = [...sec.querySelectorAll('dt')];
  return {
    h2: window.__ac.txt(h2), h2Visible: window.__ac.visible(h2),
    tag: sec.tagName.toLowerCase(), labelled: !!sec.getAttribute('aria-labelledby'),
    rows: rows.map((r) => {
      const dt = dts.find((d) => window.__ac.txt(d) === r.dt);
      let dd = dt?.nextElementSibling; while (dd && dd.tagName !== 'DD') dd = dd.nextElementSibling;
      if (!dd) return { dt: r.dt, found: false };
      const all = window.__ac.txt(dd);
      const words = all.startsWith(r.dd);
      const rest = all.slice(r.dd.length).trim();
      const leaves = [...dd.querySelectorAll('*')].filter((e) => !e.children.length).map((e) => window.__ac.txt(e)).filter(Boolean);
      return { dt: r.dt, found: true, all, words, mono: rest, leaves };
    }),
  };
}, RESOLUTION);

test('AC-01 — Render the empty page with ≥ 200 characters and no errors', async (t) => {
  if (!requireEmpty(t)) return;
  for (const vp of ['D', 'M']) {
    await withPage(vp, async (page) => {
      for (const lens of LENSES) {
        await load(page, LENS_ROUTE[lens], { base: empty.base });
        const len = await page.evaluate(() => document.body.innerText.length);
        assert.ok(len >= 200, `${vp} ${lens}: renders ${len} characters`);
        assert.ok(await count(page, 'article.pb-20') > 0, `${vp} ${lens}: article.pb-20 exists`);
        assert.equal(await text(page.locator('main h1').first()), H1, `${vp} ${lens}: main h1`);
        assert.ok(await kickerPresent(page), `${vp} ${lens}: the kicker reads "${KICKER}"`);
      }
    });
  }
});

test('AC-02 — Say the register is not promoted, before any figure', async (t) => {
  if (!requireEmpty(t)) return;
  await withPage('D', async (page) => {
    for (const lens of LENSES) {
      await load(page, LENS_ROUTE[lens], { base: empty.base });
      const r = await page.evaluate(([callout, head]) => {
        const own = window.__ac.deepestAll(document.body, `^${callout}$`);
        const standfirst = [...document.querySelectorAll('main p, main [data-page-copy]')].find((e) => window.__ac.txt(e).startsWith(head));
        return {
          n: own.length,
          afterStandfirst: window.__ac.precedes(standfirst, own[0]),
          beforeResolution: window.__ac.precedes(own[0], document.querySelector('#resolution')),
          body: document.body.innerText,
          cr: document.querySelectorAll('[data-cr]').length,
        };
      }, [CALLOUT, STANDFIRST_HEAD]);
      assert.equal(r.n, 1, `${lens}: exactly one element whose own text is "${CALLOUT}"`);
      assert.ok(r.afterStandfirst, `${lens}: the callout follows the Standfirst`);
      assert.ok(r.beforeResolution, `${lens}: the callout precedes #resolution`);
      assert.ok(r.body.includes('force: register not yet promoted'), `${lens}: the byline says force: register not yet promoted`);
      assert.equal(r.cr, 0, `${lens}: no [data-cr] element`);
    }
  });
});

test('AC-03 — Keep the resolution statement\'s words and replace its counts with the empty wording', async (t) => {
  if (!requireEmpty(t)) return;
  await withPage('D', async (page) => {
    for (const lens of LENSES) {
      await load(page, LENS_ROUTE[lens], { base: empty.base });
      const r = await resolutionRows(page);
      assert.ok(r, `${lens}: #resolution exists`);
      assert.equal(r.h2, 'What resolves at which level', `${lens}: #resolution h2`);
      assert.ok(r.h2Visible, `${lens}: the h2 is visible`);
      for (const row of r.rows) {
        assert.ok(row.found, `${lens}: dt "${row.dt}" with its dd`);
        assert.ok(row.words, `${lens}: "${row.dt}" dd begins with its fixed sentence(s) in full (reads "${row.all?.slice(0, 160)}")`);
        assert.equal(row.mono, EMPTY_MONO, `${lens}: "${row.dt}" mono line`);
        assert.ok(!/\b0 (line rows|of 36|commissionerates)/.test(row.all), `${lens}: "${row.dt}" prints no zero count`);
      }
    }
  });
});

test('AC-04 — Replace the strip and reconciliation counts with the empty wording, never 0', async (t) => {
  if (!requireEmpty(t)) return;
  await withPage('D', async (page) => {
    for (const lens of LENSES) {
      await load(page, LENS_ROUTE[lens], { base: empty.base });
      const s = await text(strip(page));
      assert.ok(s.includes('register not yet promoted · nothing below is zero'), `${lens}: strip reads the empty wording (reads "${s.slice(0, 200)}")`);
      for (const re of [/\b0 of\b/, /₹0 cr/, /\b0 budget rows/, /\b0 installations/, /\b0 contracts/]) assert.ok(!re.test(s), `${lens}: strip does not match ${re}`);
      const rec = await page.evaluate(() => {
        const main = document.querySelector('main');
        const all = window.__ac.deepestAll(main, 'register not yet promoted').filter((e) => !e.closest('section[aria-label="Denominators"]') && !e.closest('#resolution') && !/^force: register/.test(window.__ac.txt(e)) && !/^Register not yet promoted$/.test(window.__ac.txt(e)));
        return { n: all.length, withSum: all.filter((e) => / = /.test(window.__ac.txt(e))).length, anySum: window.__ac.deepestAll(main, '^[\\d,]+ (rows|installations|records) = ').length };
      });
      assert.ok(rec.n >= 1, `${lens}: a ReconciliationLine reading "register not yet promoted" is present`);
      assert.equal(rec.withSum, 0, `${lens}: it carries no = sum`);
      assert.equal(rec.anySum, 0, `${lens}: no "N rows = …" sum is printed`);
    }
  });
});

test('AC-05 — Render every Q-block heading with the empty sentence, numbering intact', async (t) => {
  if (!requireEmpty(t)) return;
  await withPage('D', async (page) => {
    for (const lens of LENSES) {
      await load(page, LENS_ROUTE[lens], { base: empty.base });
      const blocks = await page.evaluate(() => [...document.querySelectorAll('[data-q]')].map((b) => ({ id: b.getAttribute('data-q'), h3: window.__ac.txt(b.querySelector('h3')), text: window.__ac.txt(b) })));
      assert.deepEqual(blocks.map((b) => b.id), QBLOCKS[lens].map(([id]) => id), `${lens}: [data-q] addresses in order`);
      for (const [id, h] of QBLOCKS[lens]) {
        const b = blocks.find((x) => x.id === id);
        assert.equal(b?.h3, h, `${lens} ${id}: h3 verbatim`);
        if (id === CANNOT_SHOW[lens]) {
          const m = b.text.match(/0 voids and 0 gaps recorded by the research, 0 claim\(s\) killed in audit, and (\d+) derived by this page/);
          assert.ok(m, `${lens} ${id}: the CannotShow header reads the zero counts and the derived count (reads "${b.text.slice(0, 200)}")`);
        } else {
          assert.ok(b.text.includes(ADJ), `${lens} ${id}: contains "${ADJ}"`);
        }
      }
    }
  });
});

test('AC-06 — Draw the FY axis with no columns and hatch all 36 units', async (t) => {
  if (!requireEmpty(t)) return;
  await withPage('D', async (page) => {
    await load(page, '/security', { base: empty.base });
    const r = await page.evaluate(() => {
      const fig = document.querySelector('[data-q="B1"] figure') ?? document.createElement('figure');
      const b3 = window.__ac.q('B3');
      const b6 = window.__ac.q('B6');
      const maps = b6 ? [...b6.querySelectorAll('svg[role="listbox"]')] : [];
      return {
        fig: !!fig, figText: window.__ac.txt(fig), columns: fig ? fig.querySelectorAll('[data-column]').length : -1,
        b3Text: window.__ac.txt(b3), lanes: b3 ? b3.querySelectorAll('[data-lane]').length : -1,
        maps: maps.map((m) => window.__ac.fillClasses(m)),
        legends: window.__ac.deepestAll(b6, 'no state rows in this build').length,
      };
    });
    assert.ok(r.fig, 'the DemandStack figure renders');
    assert.equal(r.columns, 0, 'no [data-column]');
    assert.ok(r.figText.includes('Register not yet promoted — nothing below is zero'), `the axis carries the empty words (figure reads "${r.figText.slice(0, 200)}")`);
    assert.equal(r.lanes, 0, 'the ledger renders no [data-lane]');
    assert.ok(r.b3Text.includes('Register not yet promoted — nothing below is zero'), 'the ledger carries the empty words');
    assert.equal(r.maps.length, 2, 'B6 holds two svg[role="listbox"] maps');
    for (const [i, m] of r.maps.entries()) {
      assert.equal(m.filter((c) => c === 'hatch').length, 36, `map ${i + 1}: 36 hatched units`);
      assert.equal(m.filter((c) => c !== 'hatch').length, 0, `map ${i + 1}: no other fill class`);
    }
    assert.ok(r.legends >= 2, 'each legend reads "no state rows in this build"');
    await load(page, '/security?lens=footprint', { base: empty.base });
    const f = await page.evaluate(() => { const b = window.__ac.q('F1'); return { fills: window.__ac.fillClasses(b), dots: b ? b.querySelectorAll('[data-dot]').length : -1 }; });
    assert.equal(f.fills.filter((c) => c === 'hatch').length, 36, 'F1: 36 hatched units');
    assert.equal(f.dots, 0, 'F1: no [data-dot]');
  });
});

test('AC-07 — Keep the frames: 36-row state table, vendor bands, case pairs, six rungs, control card', async (t) => {
  if (!requireEmpty(t)) return;
  await withPage('D', async (page) => {
    await load(page, '/security', { base: empty.base });
    await openTwin(page, 'state-table');
    const firsts = await page.evaluate(() => [...document.querySelectorAll('details[data-twin="state-table"] tbody tr')].map((tr) => window.__ac.txt(tr.querySelector('td'))));
    assert.equal(firsts.length, 36, 'TWIN(state-table) has 36 rows');
    assert.ok(firsts.every((c) => c.includes('register not yet promoted')), `each row's first data cell reads "register not yet promoted" (${JSON.stringify(firsts.slice(0, 3))})`);
    await load(page, '/security?lens=procurement', { base: empty.base });
    const p = await page.evaluate(() => ({
      pub: [...document.querySelectorAll('h3, h4, h5, h6')].some((h) => /^public sector/i.test(window.__ac.txt(h))),
      priv: [...document.querySelectorAll('h3, h4, h5, h6')].some((h) => /^private, JV or foreign/i.test(window.__ac.txt(h))),
      cards: document.querySelectorAll('[data-vendor-card]').length,
      pairs: document.body.innerText.includes('No case record in this register.'),
      narr: window.__ac.txt(document.querySelector('#narratives')),
    }));
    assert.ok(p.pub && p.priv, 'both class-band headings render');
    assert.equal(p.cards, 0, 'no [data-vendor-card]');
    assert.ok(p.pairs, 'the pair section reads "No case record in this register."');
    for (const r of RUNGS) assert.ok(p.narr.includes(r), `#narratives lists the rung ${r}`);
    assert.ok((p.narr.match(/none in this file/g) ?? []).length >= 6, 'six rungs read "none in this file"');
    for (const lens of LENSES) {
      await load(page, LENS_ROUTE[lens], { base: empty.base });
      const colour = await controlCard(page).evaluate((el, s) => { const d = window.__ac.deepest(el, `^${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`); return d ? getComputedStyle(d).color : null; }, CONTROL_EMPTY);
      assert.ok(colour, `${lens}: the ControlCard contains exactly the empty sentence`);
      assert.equal(colour, await amberColour(page), `${lens}: in the amber token`);
    }
  });
});

test('AC-08 — Answer Find honestly on an empty register', async (t) => {
  if (!requireEmpty(t)) return;
  await withPage('D', async (page) => {
    await load(page, '/security', { base: empty.base });
    await find(page, 'Mumbai');
    const expected = 'No body, place, vendor, case or record in this register matches "Mumbai". This is a statement about the register, not about the world.';
    assert.equal(await deepestCount(page, `^${esc(expected)}$`), 1, 'the results region reads exactly the sentence');
    assert.equal(hashParams(page).get('find'), 'Mumbai', 'the URL carries find=Mumbai');
  });
});

test('AC-09 — (ZERO-SERIES) Say the budget series is empty and hatch every stack column', async (t) => {
  if (!requireZero(t)) return;
  await withPage('D', async (page) => {
    await load(page, '/security', { base: zero.base });
    const r = await page.evaluate(() => {
      const q = (id) => window.__ac.q(id);
      const cols = [...document.querySelectorAll('[data-column][data-panel="defence"]')].map((c) => c.getAttribute('data-column-state'));
      const maps = q('B6') ? [...q('B6').querySelectorAll('svg[role="listbox"]')].map((m) => window.__ac.fillClasses(m)) : [];
      return {
        b1: window.__ac.txt(q('B1')), b3: window.__ac.txt(q('B3')), b3h: window.__ac.txt(q('B3')?.querySelector('h3')), b8: window.__ac.txt(q('B8')),
        cols, maps, cr: ['B1', 'B3', 'B6', 'B7', 'B8'].map((id) => [id, q(id) ? q(id).querySelectorAll('[data-cr]').length : -1]),
      };
    });
    assert.ok(r.b1.includes(NO_BUDGET_ROWS), `B1 contains "${NO_BUDGET_ROWS}"`);
    assert.ok(r.cols.length === FY_AXIS.length || r.cols.length === 0, `defence columns: ${r.cols.length}, expected ${FY_AXIS.length} (the FULL axis) or 0`);
    t.diagnostic(`AC-09 recorded: ${r.cols.length === 0 ? '0 columns with the sentence' : `${r.cols.length} hatched columns`}`);
    assert.ok(r.cols.every((s) => s === 'hatched'), 'every present column is hatched');
    for (const [id, n] of r.cr) assert.equal(n, 0, `no [data-cr] in ${id}`);
    assert.equal(r.b3h, QBLOCKS.budgets[2][1], 'B3 renders its heading');
    assert.ok(r.b3.includes(NO_BUDGET_ROWS), 'B3 renders the sentence');
    assert.equal(r.maps.length, 2, "B6's two maps render");
    for (const m of r.maps) assert.ok(m.length === 36 && m.every((c) => c === 'hatch'), 'every unit hatched');
    assert.ok(r.b8.includes('No grant line matches') || r.b8.includes(NO_BUDGET_ROWS), 'B8 reads "No grant line matches" or the no-rows sentence');
  });
});

/** Kind chips (AC-10, AC-56, AC-83): the controls whose name starts with a declared kind (hyphen or space). */
const kindChips = (page) => page.evaluate((kinds) => {
  const els = [...document.querySelectorAll('button, input[type="checkbox"], [role="checkbox"], [role="switch"]')];
  return kinds.map((k) => {
    const re = new RegExp('^' + k.replace(/-/g, '[ -]'), 'i');
    const el = els.find((e) => re.test(window.__ac.name(e)));
    return { kind: k, found: !!el, disabled: el?.getAttribute('aria-disabled') === 'true', hardDisabled: !!el?.disabled, name: el ? window.__ac.name(el) + ' ' + window.__ac.described(el) : '' };
  });
}, KINDS);

test('AC-10 — (ZERO-SERIES) Say the strength and footprint series are empty, keep 36 rows, name the kinds', async (t) => {
  if (!requireZero(t)) return;
  await withPage('D', async (page) => {
    await load(page, '/security', { base: zero.base });
    assert.ok((await text(block(page, 'B6'))).includes('no state rows in this build'), 'B6 right map legend contains "no state rows in this build"');
    assert.equal(await openTwinRows(page, 'state-table'), 36, 'TWIN(state-table) has 36 rows');
    await load(page, '/security?lens=footprint', { base: zero.base });
    const f = await page.evaluate(() => { const b = window.__ac.q('F1'); return { text: window.__ac.txt(b), fills: window.__ac.fillClasses(b), dots: b ? b.querySelectorAll('[data-dot]').length : -1 }; });
    assert.ok(f.text.includes(NO_FP_ROWS), `F1 contains "${NO_FP_ROWS}"`);
    assert.equal(f.fills.filter((c) => c === 'hatch').length, 36, '36 hatched units');
    assert.equal(f.dots, 0, 'no [data-dot]');
    const chips = await kindChips(page);
    for (const c of chips) {
      assert.ok(c.found, `kind chip ${c.kind} renders`);
      assert.ok(c.disabled, `kind chip ${c.kind} is aria-disabled`);
      assert.ok(c.name.includes('none in this register'), `kind chip ${c.kind} names "none in this register"`);
    }
    await openTwin(page, 'footprint-matrix');
    const m = await twinTable(page, 'footprint-matrix');
    assert.equal(m.rows.length, 36, 'TWIN(footprint-matrix) has 36 rows');
    const kindCols = KINDS.map((k) => m.headers.findIndex((h) => new RegExp('^' + k.replace(/-/g, '[ -]'), 'i').test(h)));
    assert.ok(kindCols.every((i) => i >= 0), `eleven kind columns (headers ${JSON.stringify(m.headers)})`);
    for (const row of m.rows) for (const i of kindCols) assert.equal(row[i], 'no row', 'every kind cell reads "no row"');
    const rec = await reconText(page) ?? await deepest(page, 'installations = ');
    for (const k of KINDS) assert.ok(new RegExp(`0 ${k.replace(/-/g, '[ -]')} \\(none in this register\\)`, 'i').test(rec ?? ''), `the Footprint ReconciliationLine prints "0 ${k} (none in this register)"`);
  });
});

test('AC-11 — (ZERO-SERIES) Leave the procurement lens unchanged', async (t) => {
  if (!requireZero(t) || !requireFull(t)) return;
  const snap = async (base) => {
    let out;
    await withPage('D', async (page) => {
      await load(page, '/security?lens=procurement', { base, slice: S8 });
      out = await page.evaluate(() => ({
        cards: document.querySelectorAll('[data-vendor-card]').length,
        ids: [...new Set([...document.querySelectorAll('[data-vendor-card]')].map((e) => e.getAttribute('data-vendor-card')))].sort(),
        pairs: document.querySelectorAll('[data-pair]').length,
        awards: document.querySelectorAll('[data-mark="award"]').length,
        contested: window.__ac.txt(window.__ac.deepest(document.querySelector('#contested'), 'alleged claims · ')),
        strip: window.__ac.strip(),
      }));
    });
    return out;
  };
  const z = await snap(zero.base);
  const f = await snap(full.base);
  // [Adjudicated 2026-10-07] Set equality against the §3.2 union, never a count tolerance: ZERO loses exactly the
  // footprint-only vendors (FOOT_ONLY) and nothing else; FULL keeps every one.
  assert.ok(f.cards > 0, 'FULL procurement renders vendor cards');
  assert.ok(FOOT_ONLY.length > 0, 'the FULL module has vendors that only a footprint row brings in (else ZERO and FULL agree and the plain identity holds)');
  for (const v of FOOT_ONLY) {
    const hit = EDGES.find((e) => ['award', 'enforce', 'bond', 'role', 'analytic'].includes(e.pred) && (e.s === v || e.t === v));
    assert.ok(!hit, `${v} (footprint-only) carries no award, enforce, bond, role or analytic edge (found ${hit?.id ?? ''})`);
  }
  assert.equal(f.cards, f.ids.length, 'FULL: one [data-vendor-card] per vendor');
  assert.equal(z.cards, z.ids.length, 'ZERO: one [data-vendor-card] per vendor');
  assert.deepEqual(f.ids, [...VENDORS].sort(), 'FULL vendor cards = VENDORS (§3.2)');
  assert.deepEqual(z.ids, [...VENDORS_NOFP].sort(), 'ZERO vendor cards = the §3.2 union with no footprint rows');
  for (const v of FOOT_ONLY) assert.ok(!z.ids.includes(v), `${v} (footprint-only) has no card in ZERO`);
  assert.equal(z.pairs, f.pairs, '[data-pair] count');
  assert.equal(z.awards, f.awards, '[data-mark="award"] count');
  assert.equal(z.contested, f.contested, 'the Contested denominator sentence');
  assert.ok(f.strip.includes(fact2(VENDORS)), `FULL strip fact 2 reads "${fact2(VENDORS)}" (reads "${f.strip.slice(0, 400)}")`);
  assert.ok(z.strip.includes(fact2(VENDORS_NOFP)), `ZERO strip fact 2 reads "${fact2(VENDORS_NOFP)}" (reads "${z.strip.slice(0, 400)}")`);
  assert.equal(z.strip, f.strip.replace(fact2(VENDORS), fact2(VENDORS_NOFP)), "the strip's procurement facts 1 and 3–6 are identical; fact 2 differs only by the footprint-only vendors");
  // E30: a footprint-only id asked for by URL in ZERO is named as not a vendor, with Show connections — never dropped silently.
  await withPage('D', async (page) => {
    for (const v of FOOT_ONLY) {
      await load(page, `/security?lens=procurement&vendor=${encodeURIComponent(v)}`, { base: zero.base, slice: S8 });
      assert.ok((await bodyText(page)).includes(`${labelOf(v)} is not a vendor in this register`), `ZERO: vendor=${v} reads "${labelOf(v)} is not a vendor in this register"`);
      assert.ok(await page.getByRole('button', { name: /^Show connections/ }).count() >= 1, `ZERO: vendor=${v} offers Show connections`);
    }
  });
});

test('AC-12 — (ZERO-SERIES) Keep the resolution statement\'s words with `no rows in this build`', async (t) => {
  if (!requireZero(t)) return;
  await withPage('D', async (page) => {
    await load(page, '/security', { base: zero.base });
    const r = await resolutionRows(page);
    assert.ok(r, '#resolution exists');
    for (const row of r.rows) assert.ok(row.found && row.words, `"${row.dt}" keeps its fixed sentence(s) in full`);
    assert.equal(r.rows[0].mono, 'no rows in this build', 'the Union mono line');
    assert.ok(r.rows[1].mono.includes('no rows in this build'), 'the State mono line');
    assert.ok(r.rows[2].mono.includes('no rows in this build'), 'the City mono line');
    const s = await text(strip(page));
    assert.ok(s.includes('no budget rows in this build'), `strip fact 1 reads "no budget rows in this build" (reads "${s.slice(0, 160)}")`);
    assert.ok(!/\b0 of 0\b/.test(s), 'strip fact 1 never reads "0 of 0"');
  });
});

// ---------------------------------------------------------------------------
// §2 Honesty captions — FULL build
// ---------------------------------------------------------------------------

/** Digits as the page may group them (en-IN) compared as bare digits. */
const ungroup = (s) => (s ?? '').replace(/(\d),(?=\d)/g, '$1');
const capText = (page, id) => page.evaluate((c) => { const e = document.querySelector(`[data-caption="${c}"]`); return e ? window.__ac.txt(e) : null; }, id);
function containsAll(hay, needles, what) {
  assert.ok(hay != null, `${what} is present`);
  for (const n of needles) assert.ok(hay.includes(n), `${what} contains "${n}" (reads "${hay.slice(0, 240)}…")`);
}

/** §5.0.1 mono lines, derived from the module (AC-14, AC-31). */
// [Adjudicated 2026-10-07] "with their own budget series" counts a state whose own budget opened
// (spec §5.0.1, "except where a state's own budget opened"): a non-MH 2055 head that is not a
// reported PRS transcription. The PRS "District Police line" rows are tier reported and are
// excluded; in this build only Uttar Pradesh (Grant 26) qualifies.
const statesWithOwn = uniq(STATE_ROWS.filter((r) => r.head !== STATE_SERIES_HEAD && !isReported(r)).map((r) => r.payer));
const strengthStates = uniq(STRENGTH_ST.map((r) => r.st));
const delhiRows = UNION_ROWS.filter((r) => r.body === DELHI_POLICE);
const delhiFys = uniq(delhiRows.map((r) => r.fy)).sort();
const commBodies = new Set(COMMISSIONERATES.map((r) => r.body));
const commWithStrength = uniq(STRENGTH.filter((r) => commBodies.has(r.body)).map((r) => r.body)).length;
const fpCities = uniq(FOOTPRINT.map((r) => r.city)).length;
const fyActual = uniq(UNION_ROWS.filter((r) => r.stage === 'actual').map((r) => r.fy)).sort();
const RES_MONO = {
  union: [`${UNION_ROWS.length} line rows`, `${uniq(UNION_ROWS.map((r) => r.body)).length} bodies`, `FY${FY_AXIS[0]}–FY${FY_AXIS.at(-1)}`, `actuals for ${fyActual.length} of ${FY_AXIS.length} FYs`],
  state: [`${uniq(STATE_SERIES.map((r) => r.payer)).length} of 36 states and UTs carry a Police-head row`, `${statesWithOwn.length} with their own budget series`, `${strengthStates.length} with a strength row`, `${REPORTED_STRENGTH.length} of ${STRENGTH.length} strength rows reported`],
  city: [`Delhi Police: ${delhiRows.length} line rows, FY${delhiFys[0]}–FY${delhiFys.at(-1)}`, `${COMMISSIONERATES.length} commissionerates placed, ${commWithStrength} with a strength row`, `${fpCities} cities with an installation`],
};
async function assertResolutionMono(page, where) {
  const r = await resolutionRows(page);
  assert.ok(r, `${where}: #resolution exists`);
  const [u, s, c] = r.rows.map((x) => ungroup(x.mono));
  for (const part of RES_MONO.union) assert.ok(u.includes(part), `${where}: Union mono line contains "${part}" (reads "${u}")`);
  assert.ok(u.startsWith(`${UNION_ROWS.length} line rows · `), `${where}: the Union line leads with the row count`);
  for (const part of RES_MONO.state) assert.ok(s.includes(part), `${where}: State mono line contains "${part}" (reads "${s}")`);
  for (const part of RES_MONO.city) assert.ok(c.includes(part), `${where}: City mono line contains "${part}" (reads "${c}")`);
}

test('AC-13 — Render C1–C21 at body size, under their block, referenced by `aria-describedby`', async (t) => {
  if (!requireFull(t)) return;
  await withPage('D', async (page) => {
    for (const lens of LENSES) {
      await load(page, LENS_ROUTE[lens], { graph: true, slice: lens === 'procurement' && S8 });
      const caps = await page.evaluate(() => {
        const bodyP = document.querySelector('#gaps p') ?? [...document.querySelectorAll('[data-q] p')].find((p) => !p.closest('[data-caption]') && !p.closest('figure'));
        const bodySize = bodyP ? parseFloat(getComputedStyle(bodyP).fontSize) : null;
        const secondary = window.__ac.token('--color-text-secondary');
        const sources = document.querySelector('#sources');
        return [...document.querySelectorAll('[data-caption]')].map((c) => {
          const owner = c.closest('[data-q], #connections, #resolution');
          const drawing = owner ? [...owner.querySelectorAll('svg, canvas, [data-column], [role="grid"], [role="listbox"], table, dl')].find((d) => !c.contains(d) && !d.closest('details[data-twin]')) : null;
          const twinEl = owner ? owner.querySelector('details[data-twin]') : null;
          const referrers = c.id ? [...document.querySelectorAll('[aria-describedby]')].filter((e) => e.getAttribute('aria-describedby').split(/\s+/).includes(c.id)) : [];
          return {
            id: c.getAttribute('data-caption'), fontSize: parseFloat(getComputedStyle(c).fontSize), bodySize,
            color: getComputedStyle(c).color, secondary, owner: !!owner,
            afterDrawing: !drawing || window.__ac.precedes(drawing, c), beforeTwin: !twinEl || window.__ac.precedes(c, twinEl),
            describedBy: referrers.length > 0, inFooter: !!c.closest('footer'), belowSources: !!(sources && window.__ac.precedes(sources, c)),
          };
        });
      });
      const ids = caps.map((c) => c.id);
      for (const id of CAPTIONS[lens]) assert.equal(ids.filter((x) => x === id).length, 1, `${lens}: ${id} exists exactly once`);
      for (const c of caps.filter((x) => CAPTIONS[lens].includes(x.id))) {
        assert.ok(c.bodySize != null && c.fontSize >= c.bodySize, `${lens} ${c.id}: font-size ${c.fontSize} ≥ body ${c.bodySize}`);
        assert.equal(c.color, c.secondary, `${lens} ${c.id}: colour is --color-text-secondary`);
        assert.ok(c.owner, `${lens} ${c.id}: inside its block`);
        assert.ok(c.afterDrawing, `${lens} ${c.id}: after the drawing`);
        assert.ok(c.beforeTwin, `${lens} ${c.id}: before the twin`);
        assert.ok(c.describedBy, `${lens} ${c.id}: an aria-describedby resolves to it`);
        assert.ok(!c.inFooter && !c.belowSources, `${lens} ${c.id}: not in footer nor below #sources`);
      }
    }
  });
});

test('AC-14 — State the three-level resolution in C1\'s fixed words', async (t) => {
  if (!requireFull(t)) return;
  await withPage('D', async (page) => {
    await load(page, '/security');
    const c1 = await capText(page, 'C1');
    containsAll(c1, [...RESOLUTION.map((r) => r.dd), 'prints those words in place of a number', 'no further'], 'C1');
    await assertResolutionMono(page, 'C1');
  });
});

test('AC-15 — Say in C2 what the stack adds, what pay is, which years agree, and that no share is rated', async (t) => {
  if (!requireFull(t)) return;
  const withPub = FY_AXIS.filter((fy) => STACK(fy, DEFAULT_STAGE).published != null && STACK(fy, DEFAULT_STAGE).rows.length);
  const eq = withPub.filter((fy) => STACK(fy, DEFAULT_STAGE).recon === 'equal').length;
  const differs = withPub.filter((fy) => STACK(fy, DEFAULT_STAGE).recon === 'differs').map((fy) => { const s = STACK(fy, DEFAULT_STAGE); return round2(((s.sum - s.published) / s.published) * 100); });
  const tierWord = UNION_ROWS.some(isReported) ? 'reported' : 'documented';
  await withPage('D', async (page) => {
    await load(page, '/security');
    const c2 = await capText(page, 'C2');
    containsAll(c2, ['as Parliament votes them', 'drawn as a bracket, not added on top', 'drawn as a tick across the column', 'Missing years are hatched, not skipped', 'nominal and not adjusted for inflation', 'does not rate whether the share is high', 'the label says which', 'Delhi Police is bracketed'], 'C2');
    const m = c2.match(/in (\d+) of (\d+) such years it does/);
    assert.ok(m, 'C2 carries "in {eq} of {pub} such years it does"');
    assert.equal(int(m[1]), eq, 'eq = years whose stack equals the published total');
    assert.equal(int(m[2]), withPub.length, 'pub = years with a published total');
    assert.ok(c2.includes(`every Union row here is ${tierWord}`), `tierWord = ${tierWord}`);
    if (differs.length) {
      const pm = c2.match(/by under ([\d.]+)%/);
      assert.ok(pm && num(pm[1]) >= Math.max(...differs), `maxPct ≥ ${Math.max(...differs)} (reads ${pm?.[1]})`);
    }
    const fb = c2.match(/before (?:FY)?(\d{4}-\d{2}) the services/);
    assert.ok(fb && FY_AXIS.includes(fb[1]), `firstBreak is an FY of the axis (reads ${fb?.[1]})`);
  });
});

test('AC-16 — Say in C3 that lanes show office, not decision, and that party is not drawn', async (t) => {
  if (!requireFull(t)) return;
  const open = OPEN_ENDED.filter((w) => w.t === MOD || w.t === MHA).length;
  await withPage('D', async (page) => {
    await load(page, '/security');
    const c3 = await capText(page, 'C3');
    containsAll(c3, ['show who was in office, not who decided a line', 'Party is not drawn', 'carries it as text'], 'C3');
    const m = c3.match(/(\d+) windows? ha(?:ve|s) no recorded end/);
    assert.ok(m, 'C3 prints {openEnded}');
    assert.equal(int(m[1]), open, 'openEnded = open-ended role windows into MoD and MHA');
  });
});

test('AC-17 — Say in C4 that a hatched slot is not zero and two levels are never added; add C4b under `fy`', async (t) => {
  if (!requireFull(t)) return;
  const firstActual = fyActual[0];
  const from = FY_AXIS.includes('2014-15') ? '2014-15' : FY_AXIS[0];
  const to = FY_AXIS.includes('2024-25') ? '2024-25' : FY_AXIS.at(-1);
  await withPage('D', async (page) => {
    await load(page, '/security');
    const c4 = await capText(page, 'C4');
    containsAll(c4, ['A hatched slot has no row in this register; it is not zero', 'never added together here', `Union actuals in this register begin in FY${firstActual}`, 'not adjusted for inflation'], 'C4');
    assert.equal(await capText(page, 'C4b'), null, 'C4b is absent without fy');
    await load(page, `/security?fy=${from}..${to}`);
    assert.equal(await capText(page, 'C4b'), `Columns outside FY${from}–FY${to} are dimmed, not removed.`, 'C4b under fy');
    await load(page, '/security');
    assert.equal(await capText(page, 'C4b'), null, 'C4b is absent once fy is unloaded');
  });
});

test('AC-18 — Say in C5 that ratios are the research\'s and in C6 that no column is a verdict', async (t) => {
  if (!requireFull(t)) return;
  await withPage('D', async (page) => {
    for (const lens of LENSES) {
      await load(page, LENS_ROUTE[lens]);
      containsAll(await capText(page, 'C5'), ['computed by the research', 'this page does not chart them', 'this page has not re-run it'], `${lens} C5`);
    }
    await load(page, '/security');
    containsAll(await capText(page, 'C6'), ['for a rank, never a person', 'neither column is a verdict', 'recorded as absent, not estimated'], 'C6');
  });
});

test('AC-19 — Say in C7 why every ratio is reported and why no per-person figure exists', async (t) => {
  if (!requireFull(t)) return;
  await withPage('D', async (page) => {
    await load(page, '/security');
    const c7 = await capText(page, 'C7');
    containsAll(c7, ['every ratio is reported because its denominator is a secondary series for one year', 'derived by the research from the ratio', 'not for dividing one by the other', 'Hatched means no row is recorded, never zero', '2011 Census would inflate'], 'C7');
    if (S3) { assert.ok(/population/i.test(c7), 'S3: C7 names the population basis'); return; }
    assert.ok(c7.includes('GSDP'), 'm=gsdp (default): {denomWords} names GSDP');
    await load(page, '/security?m=cr');
    assert.ok((await capText(page, 'C7')).includes('the ₹ crore as published'), 'm=cr: {denomWords} is "the ₹ crore as published"');
  });
});

test('AC-20 — Say in C8 and C9 that only Delhi has a city line and that no estimate is computed', async (t) => {
  if (!requireFull(t)) return;
  await withPage('D', async (page) => {
    await load(page, '/security');
    containsAll(await capText(page, 'C8'), ['the only city police force with its own budget line', 'the city ledger says so'], 'C8');
    for (const lens of ['budgets', 'footprint']) {
      await load(page, LENS_ROUTE[lens]);
      assert.equal(await count(page, '[data-caption="C9"]'), 1, `${lens}: one C9`);
      containsAll(await capText(page, 'C9'), ['prints where the money sits instead of a number, and computes no estimate', 'this is not every commissionerate'], `${lens} C9`);
    }
  });
});

test('AC-21 — Say in C10 that a ₹0 release is a recorded figure and the table is not a map', async (t) => {
  if (!requireFull(t)) return;
  const mod = BUDGETS.filter((r) => r.component === 'grant-to-states' && /ASUMP|modernisation/i.test(r.head)).map((r) => r.fy).sort();
  await withPage('D', async (page) => {
    await load(page, '/security');
    const c10 = await capText(page, 'C10');
    containsAll(c10, ['A release of ₹0 is a recorded figure'], 'C10');
    if (S2) { assert.ok(/recipient/.test(c10), 'S2: C10 says the map fills from the recipient field'); return; }
    assert.ok(c10.includes('so this is a table, not a map'), 'C10 says it is a table, not a map');
    assert.ok(mod.length > 0, 'a modernisation-scheme grant row exists in the module');
    assert.ok(c10.includes(`FY${mod[0]}–FY${mod.at(-1)}`), `C10 names FY${mod[0]}–FY${mod.at(-1)}`);
  });
});

test('AC-22 — Say in C11 and C12 that hatch is not absence and counts measure lists', async (t) => {
  if (!requireFull(t)) return;
  const dated = FOOTPRINT.filter((r) => r.since !== null).length;
  await withPage('D', async (page) => {
    await load(page, '/security?lens=footprint');
    const c11 = await capText(page, 'C11');
    containsAll(c11, ['not at their address: no row carries a coordinate', 'A dot is a place, not money', 'which is not the same as having none', 'only from this register'], 'C11');
    for (const k of EMPTY_KINDS) assert.ok(new RegExp(k.replace(/-/g, '[ -]'), 'i').test(c11), `C11 names the empty kind ${k}`);
    const m = c11.match(/(\d+) of (\d+) rows print a date/);
    assert.ok(m, 'C11 prints {dated} of {n}');
    assert.deepEqual([int(m[1]), int(m[2])], [dated, FOOTPRINT.length], '{dated} of {n}');
    containsAll(await capText(page, 'C12'), ['measures what was listed and reachable, not the size of its forces'], 'C12');
  });
});

test('AC-23 — Say in C13 and C15 that awards are a sample, never summed, class read from family', async (t) => {
  if (!requireFull(t)) return;
  await withPage('D', async (page) => {
    await load(page, '/security?lens=procurement');
    const c13 = await capText(page, 'C13');
    containsAll(c13, ['a sample of what was announced, not every contract signed, so no column is summed and no share is computed here', 'never drawn as zero', 'name no vendor and no price', ...(S5 ? [] : ['read from the actor family'])], 'C13');
    const m = c13.match(/(\d+) of (\d+) state a value/);
    assert.ok(m, 'C13 prints {withRupee} of {awards}');
    assert.deepEqual([int(m[1]), int(m[2])], [PRICED.length, AWARDS.length], '{withRupee} of {awards}');
    containsAll(await capText(page, 'C15'), ['Every vendor carries the same fields', 'never shown without the public-sector vendors beside it', 'computes no share of awards by vendor or class'], 'C15');
  });
});

test('AC-24 — Say in C14 what the slice is not, and name the works share', async (t) => {
  if (!requireFull(t)) return;
  await withPage('D', async (page) => {
    await load(page, '/security?lens=procurement', { slice: true });
    if (!S8) {
      assert.ok((await text(block(page, 'P2'))).includes('The open-market slice is not built in this copy of the register. Nothing here is zero.'), 'S8 absent: the absence sentence');
      assert.equal(await capText(page, 'C14'), null, 'S8 absent: no C14');
      return;
    }
    const c14 = await capText(page, 'C14');
    containsAll(c14, ["not India's security procurement", 'capital acquisition runs on another portal, and GeM is not here', "the slice's overall rate is a works rate", 'No winner is named here'], 'C14');
    // [Adjudicated 2026-10-07] {worksShare} is the class share, labelled as the class.
    const m = c14.match(/the works class \(MES and BRO\)[^.%]*?([\d.]+)% of the slice/i);
    assert.ok(m, `C14 prints {worksShare} labelled "the works class (MES and BRO)" (reads "${c14.slice(0, 400)}")`);
    assert.ok(Math.abs(num(m[1]) - WORKS_CLASS_PCT) <= 0.01, `worksShare ${m[1]} = ${WORKS_CLASS_PCT}`);
    // "One works buyer" is the largest works buyer's share (classes.map), never the class share.
    const all = ungroup(await bodyText(page));
    const oneBuyer = [...all.matchAll(/one works buyer(?: is)? ([\d.]+)%|([\d.]+)% one works buyer/gi)].map((x) => num(x[1] ?? x[2]));
    for (const v of oneBuyer) assert.ok(Math.abs(v - WORKS_BUYER_PCT) <= 0.01, `"one works buyer" prints ${WORKS_BUYER_PCT}% (the largest works buyer's rows ÷ dedup decisions), not ${v}%`);
    assert.ok(!/one works buyer/i.test(c14) || c14.includes(`${WORKS_BUYER_PCT}%`), 'C14 never gives the class share to one buyer');
  });
});

test('AC-25 — Say in C16 and C17 that a bond is not a payment and a board seat is lawful', async (t) => {
  if (!requireFull(t)) return;
  await withPage('D', async (page) => {
    await load(page, '/security?lens=procurement');
    containsAll(await capText(page, 'C16'), ['recorded as a void, not as innocence or guilt', 'A purchase is not a payment for a contract'], 'C16');
    containsAll(await capText(page, 'C17'), ['only in public roles at the public rank', 'is lawful', 'and the rule, not a judgement'], 'C17');
  });
});

test('AC-26 — Say in C18 and C19 that cases are records, density is documentation, Bofors beside Rafale by design', async (t) => {
  if (!requireFull(t)) return;
  await withPage('D', async (page) => {
    await load(page, '/security?lens=procurement');
    containsAll(await capText(page, 'C18'), ['A dense lane is a well-documented case, not a worse one', 'Rose ticks are recorded answers'], 'C18');
    containsAll(await capText(page, 'C19'), ["Bofors and Rafale sit side by side by design, each the other's control", 'No case here is a finding of guilt or of innocence', 'never drawn as a link to a party'], 'C19');
  });
});

test('AC-27 — Say in C20 and C21 that status is calibration, not a verdict, and position carries no meaning', async (t) => {
  if (!requireFull(t)) return;
  await withPage('D', async (page) => {
    await load(page, '/security?lens=procurement');
    containsAll(await capText(page, 'C20'), ['not the verdict of any court, regulator or auditor', 'It is never drawn as an edge', `as of ${ASOF}`], 'C20');
    for (const lens of LENSES) {
      await load(page, LENS_ROUTE[lens]);
      assert.equal(await capText(page, 'C21'), C21, `${lens}: C21 verbatim`);
    }
  });
});

test('AC-28 — Carry the fixed standfirst, standing line and header copy on every lens, with no figure', async (t) => {
  if (!requireFull(t)) return;
  await withPage('D', async (page) => {
    for (const lens of LENSES) {
      await load(page, LENS_ROUTE[lens], { slice: lens === 'procurement' && S8 });
      const r = await page.evaluate(([head, standing]) => {
        const sf = [...document.querySelectorAll('main p, main [data-page-copy]')].find((e) => window.__ac.txt(e).startsWith(head));
        const st = window.__ac.deepest(document.querySelector('main'), '^' + standing.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$');
        return { sf: window.__ac.txt(sf), st: window.__ac.txt(st), body: document.body.innerText.replace(/\s+/g, ' ') };
      }, [STANDFIRST_HEAD, STANDING]);
      assert.ok(r.sf.startsWith(STANDFIRST_HEAD), `${lens}: the Standfirst begins "${STANDFIRST_HEAD}"`);
      assert.ok(r.sf.endsWith(STANDFIRST_TAIL), `${lens}: the Standfirst ends "${STANDFIRST_TAIL}"`);
      assert.equal(r.st, STANDING, `${lens}: the standing line verbatim`);
      for (const [what, s] of [['Standfirst', r.sf], ['standing line', r.st]]) assert.ok(!/\d/.test(s.replace(/MH 2055/g, '')), `${lens}: the ${what} carries no digit outside MH 2055`);
      assert.ok(r.body.includes(`force ${RUN}`), `${lens}: the byline names force ${RUN}`);
      assert.ok(r.body.includes(`records read to ${ASOF}`), `${lens}: the byline reads records read to ${ASOF}`);
      if (S8) {
        assert.ok(r.body.includes('open-market slice from the CPPP scrape'), `${lens}: the byline names the open-market slice`);
        for (const i of SLICE.provenance.inputs) assert.ok(r.body.includes(i.sha256_16), `${lens}: the byline carries input digest ${i.sha256_16}`);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// §3 Denominators — FULL build
// ---------------------------------------------------------------------------

const crContextOk = (s) => CR_DENOM.test(s) && CR_COMPARE.test(s);
const GRID_EXCEPTION = '— open for its share of the demand and the previous year';

/** The FY axis buttons of the stack: name starts `{fy}, `. */
const axisButtons = (page) => page.evaluate(() => [...document.querySelectorAll('[data-q="B1"] button, [data-q="B1"] [role="button"], [data-q="B1"] [tabindex]')]
  .map((b, i) => ({ i, name: window.__ac.name(b), tabindex: b.getAttribute('tabindex'), current: b.getAttribute('aria-current') }))
  .filter((b) => /^\d{4}-\d{2}, /.test(b.name)));
async function focusAxis(page, fy) {
  const all = page.locator('[data-q="B1"] button, [data-q="B1"] [role="button"], [data-q="B1"] [tabindex]');
  const btns = await axisButtons(page);
  const b = btns.find((x) => x.name.startsWith(`${fy}, `));
  assert.ok(b, `an FY axis button named "${fy}, …" exists (axis buttons: ${btns.length})`);
  await all.nth(b.i).focus();
  return all.nth(b.i);
}
/** Open the FYReadout for fy (Enter on its axis button) and return the panel text. */
async function openReadout(page, fy) {
  await focusAxis(page, fy);
  await page.keyboard.press('Enter');
  await page.waitForFunction((f) => [...document.querySelectorAll('h2')].some((h) => window.__ac.txt(h).includes(f)), fy, { timeout: ACTION_TIMEOUT });
  return panel(page, esc(fy));
}

/** Every stack column: its FY (its required `data-column` value, the FY_AXIS label — §0.6), state, bands, ticks and glyph. */
const stackColumns = (page, panelName = 'defence') => page.evaluate(([p]) => {
  const cols = [...document.querySelectorAll(`[data-column][data-panel="${p}"]`)];
  const glyphs = [...document.querySelectorAll('[data-glyph]')];
  return cols.map((c, i) => ({
    fy: c.getAttribute('data-column'),
    state: c.getAttribute('data-column-state'),
    bands: [...c.querySelectorAll('[data-band]')].map((b) => ({ band: b.getAttribute('data-band'), cr: b.getAttribute('data-cr') == null ? null : Number(b.getAttribute('data-cr')), dash: window.__ac.dash(b) })),
    ticks: [...c.querySelectorAll('[data-tick]')].map((x) => x.getAttribute('data-tick')),
    glyph: (c.querySelector('[data-glyph]') ?? (glyphs.length === cols.length ? glyphs[i] : null))?.getAttribute('data-glyph') ?? null,
    cr: c.querySelectorAll('[data-cr]').length,
    text: window.__ac.txt(c),
    opacity: Number(getComputedStyle(c).opacity),
  }));
}, [panelName]);
const BAND_OF = { revenue: 'revenue', capital: 'capital', pension: 'pension', total: 'civil' };

test('AC-29 — Put a denominator and a comparison in the same element as every ₹', async (t) => {
  if (!requireFull(t)) return;
  await withPage('D', async (page) => {
    const states = [];
    for (const lens of LENSES) states.push([lens, LENS_ROUTE[lens]]);
    const cell = await cellParam(page);
    states.push(['cell', `/security?cell=${encodeURIComponent(cell)}`]);
    if (STATE_SAMPLE) states.push(['st', `/security?st=${STATE_SAMPLE}`]);
    for (const [what, r] of states) {
      await load(page, r, { slice: what === 'procurement' && S8 });
      const els = await rupeeElements(page);
      for (const e of els) {
        assert.ok(e.holder != null, `${what}: "${e.text.slice(0, 80)}" sits inside a [data-cr]`);
        if (e.gridCell && e.name.endsWith(GRID_EXCEPTION)) continue;
        assert.ok(crContextOk(e.holder), `${what}: CR-CONTEXT holds for "${e.holder.slice(0, 200)}"`);
      }
    }
    // The latest FY readout open.
    await load(page, '/security');
    await openReadout(page, LATEST_FY(DEFAULT_STAGE));
    for (const e of await rupeeElements(page)) {
      assert.ok(e.holder != null, `readout: "${e.text.slice(0, 80)}" sits inside a [data-cr]`);
      if (e.gridCell && e.name.endsWith(GRID_EXCEPTION)) continue;
      assert.ok(crContextOk(e.holder), `readout: CR-CONTEXT holds for "${e.holder.slice(0, 200)}"`);
    }
    // (U13) a lakh row prints its as-published unit beside its ₹.
    const lakh = LAKH_ROWS.find((r) => r.payer === STATE_SAMPLE) ?? LAKH_ROWS[0];
    if (lakh) {
      await load(page, `/security?st=${lakh.payer}`);
      const holders = await page.evaluate(() => [...document.querySelectorAll('[data-cr]')].map((e) => ({ cr: Number(e.getAttribute('data-cr')), text: window.__ac.txt(e) })));
      const mine = holders.filter((h) => Math.abs(h.cr - lakh.cr) <= 0.005 && h.text.includes(lakh.fy));
      assert.ok(mine.length >= 1, `the StatePanel prints the lakh row ${lakh.fy} ${lakh.stage}`);
      for (const h of mine) {
        assert.ok(h.text.includes('as published:') && h.text.includes('₹ lakh'), `lakh row element names "as published: … ₹ lakh" (reads "${h.text.slice(0, 160)}")`);
        assert.ok(h.text.includes(enIN(round2(lakh.cr * 100))), `lakh row element prints ${enIN(round2(lakh.cr * 100))}`);
      }
    }
  });
});

test('AC-30 — Give the pension share one basis everywhere and name it', async (t) => {
  if (!requireFull(t)) return;
  const fy = LATEST_FY(DEFAULT_STAGE);
  const share = PENSION_SHARE(fy, DEFAULT_STAGE);
  const basis = BASIS(fy, DEFAULT_STAGE);
  if (!need(t, share, `no pension band in FY${fy} ${DEFAULT_STAGE}`)) return;
  const SHARE_RE = /([\d.]+)% (of published total|of stack, computed here)/;
  const check = (s, where) => {
    const m = (s ?? '').match(SHARE_RE);
    assert.ok(m, `${where}: prints a pension share with its basis (reads "${(s ?? '').slice(0, 200)}")`);
    assert.ok(Math.abs(num(m[1]) - share) <= 0.01, `${where}: ${m[1]}% = ${share}%`);
    assert.equal(m[2], basis, `${where}: basis words`);
  };
  await withPage('D', async (page) => {
    await load(page, '/security');
    const cols = await stackColumns(page);
    const col = cols.find((c) => c.fy === fy);
    assert.ok(col, `a defence column for FY${fy}`);
    check(col.text.match(/[\d.]+% (of published total|of stack, computed here)/)?.[0], `band label FY${fy}`);
    for (const c of cols.filter((x) => x.bands.some((b) => b.band === 'pension'))) {
      const m = c.text.match(SHARE_RE);
      if (m) assert.equal(m[2], BASIS(c.fy, DEFAULT_STAGE), `column FY${c.fy}: basis words`);
    }
    check((await stripText(page)).match(/pensions [\d.]+% (of published total|of stack, computed here)/)?.[0], 'strip fact 2');
    const answer = await page.evaluate(() => { const f = document.querySelector('[data-q="B1"] figure'); if (!f) return null; const w = document.createTreeWalker(f, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { if (n.textContent.trim()) return n.parentElement ? window.__ac.txt(n.parentElement) : n.textContent; } return null; });
    check(answer, 'the answer sentence');
    const twinRowsText = await (async () => { await openTwin(page, 'stack'); return page.evaluate(() => [...document.querySelectorAll('details[data-twin="stack"] tbody tr')].map((r) => window.__ac.txt(r))); })();
    check(twinRowsText.find((r) => r.includes(fy) && /pension/i.test(r) && /%/.test(r)), 'stack twin pension row');
    const orphans = await page.evaluate(() => window.__ac.deepestAll(document.querySelector('main'), '[Pp]ension[^.;]*?\\d[\\d.]*%').map((e) => window.__ac.txt(e)).filter((s) => !/of published total|of stack, computed here/.test(s)));
    assert.deepEqual(orphans, [], 'no pension percentage appears without its basis words');
    check((await openReadout(page, fy))?.text, `FYReadout FY${fy}`);
  });
});

test('AC-31 — Equate the resolution statement\'s mono lines to the module', async (t) => {
  if (!requireFull(t)) return;
  await withPage('D', async (page) => {
    await load(page, '/security');
    await assertResolutionMono(page, 'resolution');
    const link = await page.evaluate(() => [...document.querySelectorAll('section[aria-label="Denominators"] a[href*="resolution"]')].map((a) => window.__ac.name(a)));
    assert.ok(link.includes('what resolves at which level'), `strip fact 1 links to #resolution, named "what resolves at which level" (links: ${JSON.stringify(link)})`);
  });
});

test('AC-32 — Show the strip facts for each lens with their populations', async (t) => {
  if (!requireFull(t)) return;
  const dated = FOOTPRINT.filter((r) => r.since !== null).length;
  const kindsWith = KINDS.filter((k) => FOOTPRINT.some((r) => r.kind === k)).length;
  await withPage('D', async (page) => {
    await load(page, '/security');
    let s = ungroup(await stripText(page));
    const f1 = s.match(/(\d+) of (\d+) budget rows · (BE|RE|actual)/);
    assert.ok(f1, `Budgets fact 1 (strip reads "${s.slice(0, 300)}")`);
    assert.equal(int(f1[2]), BUDGETS.length, 'fact 1 population');
    assert.equal(f1[3], DEFAULT_STAGE, 'fact 1 stage');
    for (const part of [
      `${coveredFys(DEFAULT_STAGE).length} of ${FY_AXIS.length} FYs have a ${DEFAULT_STAGE} stack`,
      `${uniq(STATE_SERIES.map((r) => r.payer)).length} of 36 map units have a state police row · Delhi's police is a Union line`,
      `${REPORTED_BUDGET.length} rows transcribed from a secondary (reported)`,
      `${ZERO_COUNT} rows print ₹0 as recorded`,
    ]) assert.ok(s.includes(part), `Budgets strip contains "${part}"`);
    await load(page, '/security?lens=footprint');
    s = ungroup(await stripText(page));
    for (const part of [
      `${FOOTPRINT.length} of ${FOOTPRINT.length} installations`,
      `${kindsWith} of ${KINDS.length} kinds recorded; ${EMPTY_KINDS.length} with no row`,
      `${dated} of ${FOOTPRINT.length} dated`,
      `${COMMISSIONERATES.length} commissionerates; budget inside the state's police head; city strength: no primary table`,
    ]) assert.ok(s.includes(part), `Footprint strip contains "${part}" (reads "${s.slice(0, 300)}")`);
    assert.ok(/no coordinates/.test(s), 'Footprint fact 3 ends "no coordinates"');
    await load(page, '/security?lens=procurement', { slice: S8 });
    s = ungroup(await stripText(page));
    const parts = [
      `${AWARDS.length} contracts MoD named (${PRICED.length} with ₹, ${UNPRICED.length} unpriced) to ${uniq(AWARDS.map((e) => e.t)).length} vendors`,
      `${CASES.length} cases, ${CASE_PAIRS.length} control pairs, ${UNPAIRED.length} unpaired`,
      `${ANSWERED.length} of ${ALLEGED.length} alleged claims with a recorded response`,
      `${BONDS.length} bond records, ${DONORS.length} donors, ${PARTIES.length} parties`,
    ];
    if (!S5) parts.push(`${PUBLIC_V.length} public-sector beside ${PRIVATE_V.length} private, JV or foreign — vendor class not a field`);
    for (const part of parts) assert.ok(s.includes(part), `Procurement strip contains "${part}" (reads "${s.slice(0, 400)}")`);
    if (S8) {
      const m = s.match(/open market: (\d+) award decisions in (\d+) buyer classes, ([\d.]+)% one works buyer — read by class/);
      assert.ok(m, 'Procurement fact 6 (S8)');
      assert.equal(int(m[1]), SLICE.quality.total.dedupRows, 'fact 6 dedup decisions');
      assert.equal(int(m[2]), SLICE.rates.byClass.length, 'fact 6 buyer classes');
      assert.ok(Math.abs(num(m[3]) - WORKS_BUYER_PCT) <= 0.01, `fact 6: one works buyer = ${WORKS_BUYER_PCT}% (largest works buyer in classes.map ÷ quality.total.dedupRows), not the works class's ${WORKS_CLASS_PCT}% (reads ${m[3]}%)`);
    } else assert.ok(s.includes('open-market slice not built in this copy'), 'fact 6 without S8');
  });
});

/** Split a reconciliation sum on top-level ' + ' (parenthesised terms kept whole). */
function topTerms(s) {
  const out = []; let depth = 0; let cur = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (depth === 0 && s.startsWith(' + ', i)) { out.push(cur); cur = ''; i += 2; continue; }
    cur += ch;
  }
  out.push(cur);
  return out.map((x) => x.trim());
}

test('AC-33 — Print the reconciliation lines whose terms sum to the series lengths', async (t) => {
  if (!requireFull(t)) return;
  await withPage('D', async (page) => {
    await load(page, '/security');
    const b = ungroup(await reconText(page));
    const m = b.match(/(\d+) rows = (\d+) Union \((\d+) demand-level \+ (\d+) lines inside a demand \+ (\d+) grants to states \+ (\d+) published totals\) \+ (\d+) state \((\d+) RBI Police head \+ (\d+) a state's own budget \+ (\d+) PRS transcriptions, reported\) · (\d+) recorded as ₹0 · no total on this page adds rows from two levels/);
    assert.ok(m, `Budgets ReconciliationLine (reads "${b}")`);
    const n = m.slice(1).map(int);
    assert.equal(n[0], BUDGETS.length, 'first number = FORCE_BUDGETS.length');
    assert.equal(n[2] + n[3] + n[4] + n[5], n[1], 'the four Union terms sum to the Union number');
    assert.equal(n[7] + n[8] + n[9], n[6], 'the three state terms sum to the state number');
    assert.equal(n[1] + n[6], n[0], 'Union + state = the first number');
    assert.equal(n[10], ZERO_COUNT, 'the ₹0 term = ZERO_COUNT');
    await load(page, '/security?lens=footprint');
    const f = ungroup(await reconText(page));
    assert.ok(f?.startsWith(`${FOOTPRINT.length} installations = `), `Footprint line leads "${FOOTPRINT.length} installations = " (reads "${f}")`);
    const terms = topTerms(f.slice(f.indexOf(' = ') + 3));
    let total = 0;
    for (const k of KINDS) {
      const n0 = FOOTPRINT.filter((r) => r.kind === k).length;
      const re = n0 === 0 ? new RegExp(`^0 ${k.replace(/-/g, '[ -]')} \\(none in this register\\)`, 'i') : new RegExp(`^(\\d+) ${k.replace(/-/g, '[ -]')}`, 'i');
      const term = terms.find((x) => re.test(x));
      assert.ok(term, `Footprint term for ${k} (terms ${JSON.stringify(terms)})`);
      total += int(term);
    }
    assert.equal(total, FOOTPRINT.length, 'the kind terms sum to the total');
    await load(page, '/security?lens=procurement', { slice: S8 });
    const p = ungroup(await reconText(page));
    assert.ok(p?.startsWith(`${EDGES.length} records = `), `Procurement line leads "${EDGES.length} records = " (reads "${p}")`);
    const body = p.slice(p.indexOf(' = ') + 3).split(' · ')[0];
    assert.equal(sum(topTerms(body).map(int)), EDGES.length, 'the predicate terms sum to FORCE_EDGES.length');
    if (S8) {
      const sm = p.match(/(\d+) raw rows → (\d+) after dedup/);
      assert.ok(sm, 'the slice term');
      assert.deepEqual([int(sm[1]), int(sm[2])], [SLICE.quality.total.rawRows, SLICE.quality.total.dedupRows], 'raw → dedup = SLICE.quality.total');
    }
  });
});

test('AC-34 — Draw each stack column from demand-level rows only, tick the published total, glyph the reconciliation', async (t) => {
  if (!requireFull(t)) return;
  await withPage('D', async (page) => {
    for (const stage of [DEFAULT_STAGE, ...STAGES.filter((s) => s !== DEFAULT_STAGE)]) {
      await load(page, stage === DEFAULT_STAGE ? '/security' : `/security?stage=${stage}`);
      const cols = await stackColumns(page);
      const tbl = await (async () => { await openTwin(page, 'stack'); return twinTable(page, 'stack'); })();
      const iHead = window_col(tbl, 'demand head');
      for (const fy of coveredFys(stage)) {
        const st = STACK(fy, stage);
        const col = cols.find((c) => c.fy === fy);
        assert.ok(col, `${stage} FY${fy}: a defence column`);
        const want = new Map([...st.bands].map(([c, v]) => [BAND_OF[c] ?? c, v]));
        const got = new Map();
        for (const b of col.bands) got.set(b.band, (got.get(b.band) ?? 0) + (b.cr ?? NaN));
        assert.deepEqual([...got.keys()].sort(), [...want.keys()].sort(), `${stage} FY${fy}: one band per component`);
        for (const [k, v] of want) assert.ok(Math.abs(got.get(k) - v) <= 0.5, `${stage} FY${fy} ${k}: ${got.get(k)} ≈ ${v}`);
        const rows = tbl.rows.filter((r) => r.some((c) => c === fy || c === `FY${fy}`));
        if (iHead >= 0) for (const r of rows.filter((x) => x[iHead] && /^Demand \d+ — /.test(x[iHead]))) assert.ok(isDemandLevel({ head: r[iHead] }), `${stage} FY${fy}: twin demand head "${r[iHead]}" is demand-level`);
        const pubRow = rows.map((r) => r.join(' | ')).find((r) => /published total|no published all-demands total/.test(r) && !/police/i.test(r));
        assert.ok(pubRow, `${stage} FY${fy}: the twin's published-total row for defence`);
        assert.equal(col.glyph, st.recon, `${stage} FY${fy}: glyph = ${st.recon}`);
        if (st.published != null) {
          assert.ok(col.ticks.includes('published'), `${stage} FY${fy}: a published tick`);
          assert.ok(rupeeValues(pubRow).some((v) => Math.abs(v - st.published) <= 0.5), `${stage} FY${fy}: published ${st.published} printed`);
          assert.ok(pubRow.includes('computed here'), `${stage} FY${fy}: the stack sum is labelled computed here`);
          if (st.recon === 'equal') assert.ok(pubRow.includes('equals the published total'), `${stage} FY${fy}: equals`);
          else {
            const m = pubRow.match(/exceeds the published total by ₹([\d,.]+) cr \(([\d.]+)%\), computed here/);
            assert.ok(m, `${stage} FY${fy}: exceeds … computed here (reads "${pubRow}")`);
            assert.ok(Math.abs(num(m[1]) - (st.sum - st.published)) <= 0.5, `${stage} FY${fy}: Δ ${m[1]} ≈ ${st.sum - st.published}`);
          }
        } else {
          assert.ok(pubRow.includes('no published all-demands total for this FY'), `${stage} FY${fy}: no published total`);
        }
      }
    }
  });
});
/** Column index by header prefix, node-side twin of window.__ac.col. */
function window_col(tbl, name) { return tbl ? tbl.headers.findIndex((h) => h.toLowerCase().startsWith(name.toLowerCase())) : -1; }
const rupeeValues = (s) => [...(s ?? '').matchAll(/₹([\d,]+(?:\.\d+)?) cr/g)].map((m) => num(m[1]));

test('AC-35 — Check the police stack and the Delhi bracket against the rows', async (t) => {
  if (!requireFull(t)) return;
  const fys = FY_AXIS.filter((fy) => POLICE(fy, DEFAULT_STAGE));
  if (!need(t, fys, `no Police whole-demand rows at ${DEFAULT_STAGE}`)) return;
  const chk = fys.filter((fy) => { const p = POLICE(fy, DEFAULT_STAGE); return p.revenue != null && p.capital != null && p.total != null; }).length;
  await withPage('D', async (page) => {
    await load(page, '/security');
    const cols = await stackColumns(page, 'police');
    assert.ok(cols.every((c) => FY_AXIS.includes(c.fy)), `every police column carries a data-column ∈ FY_AXIS (${cols.map((c) => c.fy)})`);
    await openTwin(page, 'stack');
    const tbl = await twinTable(page, 'stack');
    const rowsText = tbl.rows.map((r) => r.join(' | '));
    for (const fy of fys) {
      const p = POLICE(fy, DEFAULT_STAGE);
      const col = cols.find((c) => c.fy === fy);
      assert.ok(col, `police column FY${fy}`);
      for (const comp of ['revenue', 'capital']) if (p[comp] != null) {
        const b = col.bands.filter((x) => x.band === comp);
        assert.ok(b.length && Math.abs(sum(b.map((x) => x.cr)) - p[comp]) <= 0.5, `police FY${fy} ${comp} band = ${p[comp]}`);
      }
      if (p.total != null && p.revenue != null && p.capital != null) {
        const row = rowsText.find((r) => r.includes(fy) && /police/i.test(r) && /published total/.test(r) && !/Delhi/.test(r));
        assert.ok(row, `the twin's published-total row for (FY${fy}, police)`);
        assert.ok(rupeeValues(row).some((v) => Math.abs(v - p.total) <= 0.5), `FY${fy}: prints total ${p.total}`);
        assert.ok(row.includes('revenue + capital, computed here'), `FY${fy}: "revenue + capital, computed here"`);
        const equal = Math.abs(p.total - (p.revenue + p.capital)) <= 0.5;
        assert.ok(equal ? row.includes('equals') : row.includes('differs'), `FY${fy}: ${equal ? 'equals' : 'differs'}`);
      }
      const d = DELHI(fy, DEFAULT_STAGE);
      if (d?.total != null) {
        assert.ok(col.ticks.includes('delhi'), `FY${fy}: a Delhi bracket on the police column`);
        const row = rowsText.find((r) => r.includes(fy) && r.includes('Delhi Police (inside the Police demand)'));
        assert.ok(row && rupeeValues(row).some((v) => Math.abs(v - d.total) <= 0.5), `FY${fy}: the Delhi row prints ${d.total}`);
        assert.ok(row.includes('computed here') && /%/.test(row), `FY${fy}: the Delhi share is computed here`);
      }
    }
    const fig = await text(page.locator('[data-q="B1"] figure').first());
    assert.ok(ungroup(fig).includes(`police stack = revenue + capital of the Police demand, checked in ${chk} of ${chk} FYs`), 'the figure denominator line names the police check');
  });
});

test('AC-36 — Print each lane\'s own max and the cell\'s share of its demand', async (t) => {
  if (!requireFull(t)) return;
  if (!need(t, CELL_SAMPLE, 'no CAPF lane with a row')) return;
  const COMP_ORDER = ['total', 'revenue', 'capital', 'pay', 'pension', 'other'];
  const lane = [...CAPF_LANES].sort((a, b) => COMP_ORDER.indexOf(a.split('|')[1]) - COMP_ORDER.indexOf(b.split('|')[1]) || cmp(a, b))[0];
  const max = Math.max(...LANE_ROWS(lane).map((r) => r.cr));
  await withPage('D', async (page) => {
    await load(page, '/security');
    const right = await page.evaluate((key) => {
      const th = [...document.querySelectorAll('[data-lane]')].find((e) => e.getAttribute('data-lane') === key);
      const tr = th?.closest('tr, [role="row"]');
      return tr ? window.__ac.txt(tr) : null;
    }, lane);
    assert.ok(right, `the lane row for ${lane}`);
    const m = ungroup(right).match(/lane max ₹([\d.]+) cr/);
    assert.ok(m && Math.abs(num(m[1]) - max) <= 0.5, `lane max ₹${max} cr (reads "${right.slice(-80)}")`);
    const ledger = ungroup(await text(block(page, 'B3')));
    const dm = ledger.match(/(\d+) lanes · (\d+) slots drawn, (\d+) hatched · /);
    assert.ok(dm, `the ledger denominator line (reads "${ledger.slice(0, 200)}")`);
    assert.equal(int(dm[1]), LANES.length, 'lanes = LANES.length');
    assert.equal(int(dm[2]) + int(dm[3]), LANES.length * FY_AXIS.length * 3, 'cells + hatched = lanes × FYs × 3');
    const cell = await cellParam(page);
    await load(page, `/security?cell=${encodeURIComponent(cell)}`);
    const rows = LANE_ROWS(CELL_SAMPLE.key).filter((r) => r.fy === CELL_SAMPLE.fy);
    const card = await page.evaluate((fy) => {
      const el = window.__ac.card((t) => t.includes(fy));
      if (!el) return null;
      return { text: window.__ac.txt(el), crs: [...el.querySelectorAll('[data-cr]')].map((e) => ({ v: Number(e.getAttribute('data-cr')), text: window.__ac.txt(e) })) };
    }, CELL_SAMPLE.fy);
    assert.ok(card, 'the CellCard opens');
    assert.equal(card.crs.length, rows.length, `the CellCard lists ${rows.length} row(s)`);
    for (const r of rows) {
      const h = card.crs.find((c) => Math.abs(c.v - r.cr) <= 0.005);
      assert.ok(h, `row ${r.stage} ₹${r.cr} cr is listed`);
      assert.ok(crContextOk(h.text), `row ${r.stage}: CR-CONTEXT (reads "${h.text.slice(0, 200)}")`);
      assert.ok(card.text.includes(r.note ?? 'no note'), `row ${r.stage}: its note or "no note"`);
      assert.ok(card.text.includes(isReported(r) ? 'reported' : 'documented'), `row ${r.stage}: tier word`);
      for (const [l] of r.srcs) assert.ok(card.text.includes(l), `row ${r.stage}: source "${l.slice(0, 60)}"`);
      assert.ok(card.text.includes(`read to ${ASOF} · document: ${FIRST_SRC(r)}`), `row ${r.stage}: "read to ${ASOF} · document: …"`);
    }
  });
});

/** The [data-effect] lines of the rail: outside every Q-block, figure and the strip. */
const railEffects = (page) => page.evaluate(() => [...document.querySelectorAll('[data-effect]')]
  .filter((e) => !e.closest('[data-q], figure, section[aria-label="Denominators"]'))
  .map((e) => ({ text: window.__ac.txt(e), raw: window.__ac.raw(e), arrowHidden: [...e.querySelectorAll('[aria-hidden="true"]')].some((h) => h.textContent.includes('→')) })));
/** The effect line nearest a control: the first ancestor that holds a [data-effect]. */
const effectNear = (loc) => loc.evaluate((el) => {
  let a = el.parentElement;
  while (a && a !== document.body) { const e = a.querySelector('[data-effect]'); if (e) return { text: window.__ac.txt(e), raw: window.__ac.raw(e) }; a = a.parentElement; }
  return null;
});
const payerButton = (page, word) => page.locator('button[aria-pressed]').filter({ hasText: new RegExp(`^\\s*${word}\\s*$`) }).first();

test('AC-37 — Show the live effect of every rail control as `{N} → {k}` in words', async (t) => {
  if (!requireFull(t)) return;
  await withPage('D', async (page) => {
    await load(page, '/security');
    const effects = await railEffects(page);
    assert.ok(effects.length >= 6, `Payer, State, FY, Stage, Component and Tier each carry a [data-effect] (found ${effects.length})`);
    for (const e of effects) {
      const m = ungroup(e.text).match(/(\d+) → (\d+)/);
      assert.ok(m, `effect "${e.text}" reads {N} → {k}`);
      assert.equal(int(m[1]), BUDGETS.length, `effect "${e.text}": N = the lens population`);
      assert.ok(e.arrowHidden, `effect "${e.text}": the arrow is aria-hidden`);
      assert.ok(ungroup(e.raw).includes(`from ${m[1]} to ${m[2]}`), `effect "${e.text}": visually hidden "from N to k"`);
    }
    const other = STAGES.find((s) => s !== DEFAULT_STAGE);
    const opt = stageOption(page, other);
    await opt.click();
    await waitParam(page, 'stage', other);
    await page.waitForTimeout(300);
    const eff = await effectNear(opt);
    const m = ungroup(eff?.text).match(/(\d+) → (\d+)/);
    assert.ok(m, 'the Stage control carries an effect line');
    assert.equal(int(m[2]), BUDGETS.filter((r) => r.stage === other).length, `Stage ${other}: k = budget rows at that stage`);
    const live = ungroup(await liveText(page));
    assert.equal((live.match(/from (\d+) to (\d+) (rows|records|installations)/g) ?? []).length, 1, `the live region says it once (reads "${live}")`);
    await load(page, '/security?lens=footprint');
    const payer = payerButton(page, 'Union');
    assert.equal(await payer.getAttribute('aria-disabled'), 'true', 'Footprint: Payer is aria-disabled');
    assert.ok(await payer.isVisible(), 'Footprint: Payer stays visible');
    const pe = await effectNear(payer);
    assert.ok(pe && /does not apply to footprint|installations and contracts are not budget rows/.test(pe.text), `Footprint: Payer's effect line gives the reason (reads "${pe?.text}")`);
  });
});

const stateOptions = (page) => stateSelect(page).evaluate((sel) => [...sel.options].map((o) => ({ value: o.value, text: o.textContent.replace(/\s+/g, ' ').trim(), disabled: o.getAttribute('aria-disabled') === 'true', hard: o.disabled })));
const codeOfOption = (o) => (UNITS.includes(o.value) ? o.value : [...STATE_NAME.entries()].find(([, n]) => o.text.startsWith(`${n} (`))?.[0] ?? null);

test('AC-38 — Count every State option, show zero as `(0)` disabled, never hidden', async (t) => {
  if (!requireFull(t)) return;
  await withPage('D', async (page) => {
    await load(page, '/security');
    assert.equal(await stateSelect(page).count(), 1, 'the State control is labelled "State (where the record places it)"');
    let opts = await stateOptions(page);
    assert.equal(opts.length, 37, '36 options plus the all option');
    const units = opts.filter((o) => codeOfOption(o));
    assert.equal(units.length, 36, 'every map unit is an option');
    const labels = units.map((o) => o.text.replace(/ \(\d+\)$/, ''));
    assert.deepEqual(labels, [...labels].sort((a, b) => a.localeCompare(b)), 'alphabetical by label');
    for (const o of units) {
      const st = codeOfOption(o);
      const k = STATE_ROWS.filter((r) => r.payer === st).length;
      assert.ok(o.text.endsWith(`(${k})`), `Budgets ${st}: "${o.text}" ends (${k})`);
      if (k === 0) assert.ok(o.disabled && !o.hard, `Budgets ${st}: (0) is aria-disabled and kept`);
    }
    await load(page, '/security?lens=footprint');
    opts = await stateOptions(page);
    for (const o of opts.filter((x) => codeOfOption(x))) {
      const k = FOOTPRINT.filter((r) => r.st === codeOfOption(o)).length;
      assert.ok(o.text.endsWith(`(${k})`), `Footprint ${codeOfOption(o)}: "${o.text}" ends (${k})`);
      if (k === 0) assert.ok(o.disabled && !o.hard, `Footprint ${codeOfOption(o)}: (0) aria-disabled`);
    }
    await load(page, '/security?lens=procurement');
    assert.equal(await stateSelect(page).getAttribute('aria-disabled'), 'true', 'Procurement: the State control is aria-disabled');
    const eff = await effectNear(stateSelect(page));
    assert.ok(eff?.text.includes("a vendor's registered office is not where its work is"), `Procurement: the reason in its effect line (reads "${eff?.text}")`);
  });
});

test('AC-39 — Derive the default stage, state pair and strength year from coverage, and say so on the controls', async (t) => {
  if (!requireFull(t)) return;
  await withPage('D', async (page) => {
    await load(page, '/security');
    assert.ok(!hashParams(page).has('stage'), 'no stage in the URL at rest');
    for (const s of STAGES) {
      const o = stageOption(page, s);
      assert.equal(await o.count(), 1, `Stage option "${s} · {k} of {n} FYs"`);
      assert.ok((await text(o)).startsWith(`${s} · ${coveredFys(s).length} of ${FY_AXIS.length} FYs`), `Stage ${s}: k = ${coveredFys(s).length}`);
      assert.equal(await o.getAttribute('aria-pressed'), s === DEFAULT_STAGE ? 'true' : 'false', `Stage ${s} pressed iff default`);
    }
    assert.ok((await bodyText(page)).includes('actuals arrive two years after the budget'), 'the control says actuals arrive two years after the budget');
    const sel = pairSelect(page);
    const opts = await sel.evaluate((s) => [...s.options].map((o) => ({ value: o.value, text: o.textContent.replace(/\s+/g, ' ').trim(), selected: o.selected, disabled: o.getAttribute('aria-disabled') === 'true', name: (o.getAttribute('aria-label') ?? '') + ' ' + o.textContent })));
    const dp = DEFAULT_PAIR(S3 ? 'percap' : 'gsdp');
    for (const p of STATE_PAIRS) {
      const o = opts.find((x) => x.text.includes(p.fy) && x.text.includes(p.stage));
      assert.ok(o, `pair ${p.key} is listed`);
      assert.ok(o.text.includes(`${p.states} states`), `pair ${p.key}: "${p.states} states"`);
      assert.equal(o.selected, p.key === dp.key, `pair ${p.key} selected iff default (${dp.key})`);
      if (!S3 && p.fy !== GSDP_FY) {
        assert.ok(o.disabled, `pair ${p.key} is aria-disabled`);
        assert.ok(o.name.includes(`GSDP in this build is for ${GSDP_FY} only`), `pair ${p.key}: the reason in its name`);
      }
    }
    const rows = STRENGTH_ST.filter((r) => r.year === DEFAULT_SY).length;
    const sy = page.locator('[data-q="B6"] [aria-pressed="true"], [data-q="B6"] select option:checked').filter({ hasText: new RegExp(`^\\s*${DEFAULT_SY} · ${rows} rows`) });
    assert.ok(await sy.count() >= 1, `the strength year control shows "${DEFAULT_SY} · ${rows} rows" selected`);
  });
});

/** Base-rate figures as the criteria require them printed. */
function baseRateLine(r) {
  if (r.numerator == null || r.denominator == null) return { kind: 'null', text: 'not computed in this file' };
  if (TWO_FIGURES && r === TWO_FIGURES) return { kind: 'two', text: `${r.numerator} and ${r.denominator} — ${r.label}` };
  const share = isInt(r.numerator) && isInt(r.denominator) && r.numerator <= r.denominator;
  if (share) return { kind: 'share', text: `${r.numerator} of ${r.denominator} — ${r.label}`, pct: r.denominator >= 10 };
  return { kind: 'two', text: `${r.numerator} and ${r.denominator} — ${r.label}` };
}
/** The <section> that holds a domain's base-rate cards: the one carrying "wording: {domain} research file". */
const domainSection = (page, domain) => page.evaluate((d) => {
  const w = window.__ac.deepest(document.querySelector('main'), 'wording: ' + d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' research file');
  const s = w?.closest('section');
  return s ? { text: window.__ac.txt(s), links: [...s.querySelectorAll('a[href^="http"]')].map((a) => a.href), html: s.innerHTML.length } : null;
}, domain);

test('AC-40 — Print base rates as `a of b`, a percentage only over an integer ≥ 10, two figures as two figures', async (t) => {
  if (!requireFull(t)) return;
  await withPage('D', async (page) => {
    for (const lens of LENSES) {
      await load(page, LENS_ROUTE[lens]);
      for (const d of LENS_DOMAINS[lens]) {
        const rows = BASE_RATES(d);
        if (!rows.length) continue;
        const sec = await domainSection(page, d);
        assert.ok(sec, `${lens}: the ${d} base-rate section`);
        const s = ungroup(sec.text);
        for (const r of rows) {
          const want = baseRateLine(r);
          assert.ok(s.includes(ungroup(want.text)), `${lens} ${d}: prints "${want.text.slice(0, 120)}"`);
          if (want.kind === 'null') assert.ok(s.includes("figure in the research file's wording, not computed by this page"), `${lens} ${d}: the null chip`);
          if (want.kind === 'two') {
            assert.ok(s.includes('two figures as the research states them, not a share'), `${lens} ${d}: the two-figures chip`);
            const at = s.indexOf(ungroup(want.text));
            assert.ok(!/%/.test(s.slice(Math.max(0, at - 12), at)), `${lens} ${d}: no percentage before a two-figures row`);
          }
        }
        const cardCount = await page.evaluate((dd) => {
          const w = window.__ac.deepest(document.querySelector('main'), 'wording: ' + dd + ' research file');
          const sec2 = w?.closest('section');
          // AC-40: a figure may carry its sign (the literature row -0.5 and 1 prints "-0.5 and 1 — …"); the count stays exact.
          return sec2 ? window.__ac.deepestAll(sec2, '^(-?₹?-?[\\d,.]+( cr)? (of|and) -?₹?-?[\\d,.]+( cr)?|not computed in this file)( — |$)').length : -1;
        }, d);
        assert.equal(cardCount, rows.length, `${lens} ${d}: card count = ${rows.length}`);
      }
    }
  });
});

test('AC-41 — Put the symmetry text in the same section as its base rates', async (t) => {
  if (!requireFull(t)) return;
  const norm = (s) => (s ?? '').replace(/\s+/g, ' ').trim();
  await withPage('D', async (page) => {
    for (const lens of ['budgets', 'footprint']) {
      await load(page, LENS_ROUTE[lens]);
      for (const d of LENS_DOMAINS[lens]) {
        const sym = SYMMETRY(d);
        const sec = await domainSection(page, d);
        if (!sym) {
          assert.ok((await bodyText(page)).includes(CONTROL_EMPTY), `${lens} ${d}: no text → the ControlCard empty sentence`);
          continue;
        }
        assert.ok(sec, `${lens} ${d}: the section with "wording: ${d} research file"`);
        assert.ok(sec.text.includes(norm(sym)), `${lens} ${d}: the symmetry text verbatim in the same section`);
      }
    }
    await load(page, '/security?lens=procurement', { slice: S8 });
    const chapters = { P1: 'procurement-industry', P3: 'money-people', P4: 'literature' };
    for (const [q, d] of Object.entries(chapters)) {
      const sym = SYMMETRY(d);
      const r = await page.evaluate(([id, dom, s]) => {
        const b = window.__ac.q(id);
        if (!b) return null;
        const head = window.__ac.deepest(b, '^The same lens, run on the other side — ' + dom + ' research file');
        const box = head?.closest('section, aside, div, article');
        const first = b.querySelector('table, figure');
        return { head: !!head, text: window.__ac.txt(box), before: !first || window.__ac.precedes(box, first), empty: window.__ac.txt(b).includes('No symmetry check recorded for this lens'), aon: s ? window.__ac.deepestAll(b, s.slice(0, 60).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).length : 0 };
      }, [q, d, sym ? norm(sym) : null]);
      assert.ok(r, `${q} renders`);
      if (!sym) { assert.ok(r.empty, `${q}: no ${d} text → the empty sentence in its place`); continue; }
      assert.ok(r.head, `${q}: opens with "The same lens, run on the other side — ${d} research file"`);
      assert.ok(r.text.includes(norm(sym)), `${q}: the block holds the ${d} text`);
      assert.ok(r.before, `${q}: the block precedes the chapter's first table or figure`);
      if (q === 'P1') assert.ok(r.aon >= 2, 'P1: the award frame\'s AoN card also carries the procurement-industry text');
    }
    if (S8) {
      const r = await page.evaluate(([a, c]) => {
        const b = window.__ac.qq('P2'); const t = window.__ac.txt(b);
        const first = b?.querySelector('table, figure');
        const el = window.__ac.deepest(b, a.slice(0, 50).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        return { ia: t.indexOf(a), ic: t.indexOf(c), before: !first || window.__ac.precedes(el, first) };
      }, [norm(SLICE.readMeFirst), norm(SLICE.caveat)]);
      assert.ok(r.ia >= 0 && r.ic > r.ia, 'P2 opens with SLICE.readMeFirst, then SLICE.caveat');
      assert.ok(r.before, 'P2: the block precedes the chapter\'s first table or figure');
    }
  });
});

const mapFigures = (page, q) => page.evaluate((id) => [...(window.__ac.q(id)?.querySelectorAll('figure') ?? [])].filter((f) => f.querySelector('svg[role="listbox"]')).map((f) => ({
  text: window.__ac.txt(f), fills: window.__ac.fillClasses(f),
  frameDashes: [...f.querySelectorAll('svg rect, svg path:not([data-fill-class]), svg line, svg polyline, svg g')].map((e) => window.__ac.dash(e)),
  options: [...f.querySelectorAll('[role="option"]')].map((o) => ({ name: window.__ac.name(o), selected: o.getAttribute('aria-selected') })),
})), q);

test('AC-42 — Frame the spend map with its denominator, its tier and its median', async (t) => {
  if (!requireFull(t)) return;
  const pair = DEFAULT_PAIR('gsdp');
  if (!need(t, pair, 'no state pair with GSDP')) return;
  const values = UNITS.filter((st) => SPEND_CLASS(st, pair, 'gsdp') === 'value').map((st) => spendValue(st, pair, 'gsdp'));
  await withPage('D', async (page) => {
    await load(page, '/security');
    const [left] = await mapFigures(page, 'B6');
    assert.ok(left, 'the spend map figure');
    const s = ungroup(left.text);
    const m = s.match(/(\d+) of 36 drawn · (\d{4}-\d{2}) (BE|RE|actual) · head Police \(MH 2055\), revenue account only .+ · ÷ (GSDP|.+) \(reported\) · median of (\d+) drawn states: ([\d.]+) (%|₹ cr)/);
    assert.ok(m, `the spend map denominator line (reads "${s.slice(0, 300)}")`);
    assert.equal(int(m[1]), values.length, 'k drawn = value units');
    assert.equal(`${m[2]}:${m[3]}`, pair.key, 'the line names the default pair');
    assert.ok(Math.abs(num(m[6]) - median(values)) <= 0.01, `median ${m[6]} = ${median(values)}`);
    assert.ok(s.includes('every ratio on this map is reported: its denominator is a secondary series'), 'the legend says every ratio is reported');
    assert.ok(left.frameDashes.includes('6 3'), 'the map frame carries the reported dash 6 3');
    await load(page, '/security?m=cr');
    const [crMap] = await mapFigures(page, 'B6');
    assert.ok(!/÷/.test(crMap.text), 'under m=cr the ÷ term is absent');
    assert.ok(!/%/.test(crMap.text), 'under m=cr no % appears in the figure');
    await openTwin(page, 'spend-map');
    assert.ok(!/%/.test(await text(twin(page, 'spend-map'))), 'under m=cr no % appears in the twin');
  });
});

test('AC-43 — Frame the strength map with its source, its reported count and its counts-only count', async (t) => {
  if (!requireFull(t)) return;
  if (!need(t, DEFAULT_SY, 'no strength rows with a state')) return;
  const atYear = STRENGTH_ST.filter((r) => r.year === DEFAULT_SY);
  const values = UNITS.filter((st) => STRENGTH_CLASS(st, DEFAULT_SY) === 'value');
  const countsOnly = UNITS.filter((st) => STRENGTH_CLASS(st, DEFAULT_SY) === 'counts-only').length;
  await withPage('D', async (page) => {
    await load(page, '/security');
    const maps = await mapFigures(page, 'B6');
    const right = maps[1];
    assert.ok(right, 'the strength map figure');
    const s = ungroup(right.text);
    const m = s.match(/(\d+) of 36 drawn · per lakh as printed, BPR&D via secondary sources · (\d+) of (\d+) reported · (\d+) counts only · median of (\d+) drawn states: ([\d.]+) per lakh/);
    assert.ok(m, `the strength map denominator line (reads "${s.slice(0, 300)}")`);
    assert.equal(int(m[1]), values.length, 'k drawn = value units');
    assert.deepEqual([int(m[2]), int(m[3])], [atYear.filter(isReported).length, atYear.length], 'reported of rows at that year');
    assert.equal(int(m[4]), countsOnly, 'counts-only units');
    if (atYear.some(isReported)) assert.ok(right.frameDashes.includes('6 3'), 'the frame carries the reported dash');
  });
});

test('AC-44 — Frame the footprint map with rows, kinds, units and the positioning rule', async (t) => {
  if (!requireFull(t)) return;
  const k = KINDS.filter((x) => FOOTPRINT.some((r) => r.kind === x)).length;
  const u = uniq(FOOTPRINT.map((r) => r.st)).length;
  await withPage('D', async (page) => {
    await load(page, '/security?lens=footprint');
    const f = ungroup(await text(block(page, 'F1')));
    const line = `${FOOTPRINT.length} of ${FOOTPRINT.length} installations · ${k} of ${KINDS.length} kinds · ${u} of 36 units with any row · positions are states, not addresses`;
    assert.ok(f.includes(line), `F1 denominator line "${line}"`);
    const dots = await page.evaluate(() => { const b = window.__ac.qq('F1'); return { dots: b.querySelectorAll('[data-dot]').length, over: [...b.querySelectorAll('[data-overflow]')].reduce((s, e) => s + Number(e.getAttribute('data-overflow')), 0) }; });
    assert.equal(dots.dots + dots.over, FOOTPRINT.length, `dots ${dots.dots} + overflow ${dots.over} = ${FOOTPRINT.length}`);
  });
});

test('AC-45 — Frame the award graphic with priced, unpriced and class counts, and no sum', async (t) => {
  if (!requireFull(t)) return;
  const pubAwards = AWARDS.filter((e) => vendorClass(e.t) === 'public').length;
  const privAwards = AWARDS.filter((e) => vendorClass(e.t) === 'private').length;
  await withPage('D', async (page) => {
    await load(page, '/security?lens=procurement');
    const r = await page.evaluate(() => {
      const fig = window.__ac.q('P1')?.querySelector('figure');
      const tw = document.querySelector('details[data-twin="awards"]');
      return { text: window.__ac.txt(fig), crs: fig ? [...fig.querySelectorAll('[data-cr]')].map((e) => Number(e.getAttribute('data-cr'))) : [], twin: window.__ac.raw(tw) };
    });
    const line = `${PRICED.length} contracts with ₹ · ${UNPRICED.length} without · ${pubAwards} public sector, ${privAwards} private, JV or foreign · a sample of PIB releases, not every contract signed; no share is computed here`;
    assert.ok(ungroup(r.text).includes(line), `the award denominator line "${line}"`);
    const want = PRICED.map((e) => e.a).sort((a, b) => a - b);
    assert.deepEqual([...r.crs].sort((a, b) => a - b).map(round2), want.map(round2), "the figure's [data-cr] values are PRICED.a, each once");
    for (const s of [r.text, r.twin]) assert.ok(!/total ₹|Σ/.test(s), 'no "total ₹" or Σ in the figure or its twin');
  });
});

test('AC-46 — Equate every slice rate to `security.json` and keep the slice-wide rate a reference row', async (t) => {
  if (!requireFull(t)) return;
  if (!need(t, S8, 'S8 absent: no open-market slice in this copy')) return;
  await withPage('D', async (page) => {
    await load(page, '/security?lens=procurement', { slice: true });
    const r = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('[data-class]:not([data-rate])')];
      const b = window.__ac.qq('P2');
      // Anchored: each reference row *reads* its label (AC-46). The unanchored phrase also occurs inside the readMeFirst
      // quote ("…never for the slice as a whole"), which spec §5.3.2 puts first in P2.
      const refA = window.__ac.deepest(b, '^excluding the works class\\b');
      const refB = window.__ac.deepest(b, '^the slice as a whole\\b');
      return {
        rows: rows.map((e) => ({ key: e.getAttribute('data-class'), text: window.__ac.txt(e) })),
        dots: [...document.querySelectorAll('[data-rate]')].map((e) => ({ key: e.getAttribute('data-class'), n: Number(e.getAttribute('data-n')) })),
        refA: refA ? window.__ac.txt(refA.closest('tr, li, div') ?? refA) : null, refB: refB ? window.__ac.txt(refB.closest('tr, li, div') ?? refB) : null,
        after: !!refA && !!refB && rows.every((x) => window.__ac.precedes(x, refA) && window.__ac.precedes(x, refB)),
      };
    });
    const by = SLICE.rates.byClass;
    assert.deepEqual(r.rows.map((x) => x.key), by.map((c) => c.class), '[data-class] rows in file order');
    for (const c of by) {
      const row = ungroup(r.rows.find((x) => x.key === c.class)?.text);
      assert.ok(row.includes(`${c.singleBidder} of ${c.n}`), `${c.class}: ${c.singleBidder} of ${c.n}`);
      assert.ok(row.includes(`${c.singleBidderPct}%`) || row.includes(`${c.singleBidderPct.toFixed(2)}%`), `${c.class}: rate ${c.singleBidderPct}%`);
      for (const w of c.wilson95) assert.ok(row.includes(String(w)) || row.includes(w.toFixed(2)), `${c.class}: Wilson bound ${w}`);
      assert.ok(row.includes(`whole file, same portal ${c.wholeFileSamePortal.singleBidderPct}%`) && row.includes(`whole file ${c.wholeFile.singleBidderPct}%`), `${c.class}: the two whole-file references`);
      assert.ok(!row.includes(`${SLICE.rates.total.singleBidderPct}%`) || c.singleBidderPct === SLICE.rates.total.singleBidderPct, `${c.class}: the slice-wide rate's digits are not in a class row`);
      const big = SLICE.rates.byClassYear.filter((y) => y.class === c.class && y.n >= 10).length;
      assert.equal(r.dots.filter((d) => d.key === c.class).length, big, `${c.class}: ${big} drawn rate dots`);
    }
    assert.ok(r.refA?.includes(`${SLICE.rates.excludingWorks.singleBidderPct}%`), 'the excluding-works reference row');
    assert.ok(r.refB?.includes(`${SLICE.rates.total.singleBidderPct}%`), 'the slice-as-a-whole reference row');
    assert.ok(r.after, 'both reference rows come after every class row');
  });
});

/** Every ₹ value the module can account for (AC-47). */
const KNOWN_CR = [
  ...BUDGETS.map((r) => r.cr),
  ...F.FORCE_BASE_RATES.flatMap((r) => [r.numerator, r.denominator]).filter(finite),
  ...EDGES.filter((e) => ['award', 'bond'].includes(e.pred) && finite(e.a)).map((e) => e.a),
  ...F.FORCE_BENEFITS.map((b) => b.amountCr).filter(finite),
];
const COMPUTED_CR = [
  ...STAGES.flatMap((s) => FY_AXIS.map((fy) => STACK(fy, s).sum)),
  ...STAGES.flatMap((s) => FY_AXIS.map((fy) => { const p = POLICE(fy, s); return p && p.revenue != null && p.capital != null ? p.revenue + p.capital : null; })).filter(finite),
];
const LAKH_CR = LAKH_ROWS.map((r) => r.cr * 100);
const near = (v, xs) => xs.some((x) => Math.abs(x - v) <= 0.5);
function accountFor(v, holderText) {
  if (near(v, KNOWN_CR)) return true;
  if (/computed here/.test(holderText) && near(v, COMPUTED_CR)) return true;
  if (/as published/.test(holderText) && near(v, LAKH_CR)) return true;
  return false;
}
/**
 * AC-47 [Adjudicated 2026-10-07]: a ₹ printed inside research wording quoted verbatim. Every string of the force module
 * that prints a ₹ (labels, `d`, `srcs` labels, base-rate labels, voids, gaps, notes …), whitespace-collapsed.
 */
const normWs = (s) => String(s).replace(/\s+/g, ' ').trim();
const QUOTED_RUPEE_RE = /₹\s?([\d,]+(?:\.\d+)?)\s?(?:crores?|crs?)\b/g;
const MODULE_RUPEE_STRINGS = (() => {
  const out = new Set();
  const walk = (o) => {
    if (typeof o === 'string') { if (o.includes('₹')) out.add(normWs(o)); } else if (Array.isArray(o)) o.forEach(walk);
    else if (o && typeof o === 'object') Object.values(o).forEach(walk);
  };
  walk(Object.fromEntries(Object.entries(F)));
  return [...out];
})();
const QUOTED_CR_NOTE = " (₹ in the research's own words: no denominator published for this line on this page; previous year not applicable)";
/**
 * A DOM `[data-quoted]` `[data-cr]` (never a TSV cell) is accounted for when its text begins with a module string R that
 * itself prints this value, and the words right after R (past the optional bracketed pension-basis note) are the page's
 * quoted-figure note: no denominator, no comparison. A page-computed figure re-labelled quoted fails: no module string prints it.
 */
function accountForQuoted(v, text, quoted) {
  if (!quoted) return false;
  const t = normWs(text);
  return MODULE_RUPEE_STRINGS.some((R) => {
    if (!t.startsWith(R)) return false;
    if (![...R.matchAll(QUOTED_RUPEE_RE)].some((m) => Math.abs(Number(m[1].replace(/,/g, '')) - v) <= 0.5)) return false;
    return t.slice(R.length).replace(/^ \[the research's own pension share[^\]]*\]/, '').startsWith(QUOTED_CR_NOTE);
  });
}
/** Download every twin's TSV on a lens under view=table. */
async function allTsvs(page, lens) {
  await load(page, route(lens, 'view=table'), { slice: lens === 'procurement' && S8 });
  const names = await page.evaluate(() => [...document.querySelectorAll('details[data-twin]')].map((d) => [d.getAttribute('data-twin'), [...d.querySelectorAll('button')].filter((b) => /^Download \.tsv/.test(window.__ac.txt(b))).length]));
  const out = [];
  for (const [name, n] of names) for (let i = 0; i < n; i++) out.push({ twin: name, ...(await downloadTsv(page, name, i)) });
  return out;
}

test('AC-47 — Account for every ₹ in the DOM and in every TSV as a row, a declared figure or a labelled share', async (t) => {
  if (!requireFull(t)) return;
  await withPage('D', async (page) => {
    const cell = await cellParam(page);
    const routes = [];
    for (const lens of LENSES) routes.push(LENS_ROUTE[lens], route(lens, 'view=table'));
    routes.push(`/security?cell=${encodeURIComponent(cell)}`);
    if (STATE_SAMPLE) routes.push(`/security?st=${STATE_SAMPLE}`);
    if (VENDOR_NO_AWARD) routes.push(`/security?lens=procurement&vendor=${encodeURIComponent(VENDOR_NO_AWARD)}`);
    if (CASES[0]) routes.push(`/security?lens=procurement&case=${encodeURIComponent(CASES[0])}`);
    if (ENFORCE_WITH_CONTRA) routes.push(`/security?lens=procurement&rec=${encodeURIComponent(ENFORCE_WITH_CONTRA.id)}`);
    for (const r of routes) {
      await load(page, r, { slice: r.includes('procurement') && S8 });
      const crs = await page.evaluate(() => [...document.querySelectorAll('[data-cr]')].map((e) => ({ v: Number(e.getAttribute('data-cr')), text: window.__ac.txt(e), quoted: e.hasAttribute('data-quoted') })));
      for (const c of crs) assert.ok(accountFor(c.v, c.text) || accountForQuoted(c.v, c.text, c.quoted), `${r}: ₹${c.v} cr is accounted for (element reads "${c.text.slice(0, 160)}")`);
      const labels = await page.evaluate(() => [...document.querySelectorAll('[aria-label]')].filter((e) => !e.closest('[role="grid"]') && e.getAttribute('aria-label').includes('₹')).map((e) => e.getAttribute('aria-label')));
      assert.deepEqual(labels, [], `${r}: no aria-label outside the ledger grid carries a ₹`);
    }
    for (const lens of LENSES) {
      for (const f of await allTsvs(page, lens)) {
        const lines = f.text.split('\n');
        for (const h of lines.filter((l) => l.startsWith('#'))) assert.ok(!h.includes('₹') || /^# amounts: ₹ crore/.test(h), `${f.name}: no # header carries a ₹ figure ("${h}")`);
        const rows = tsvRows(f.text);
        const header = rows[0]?.split('\t') ?? [];
        const crCols = header.map((h, i) => (/^(cr|.*_cr)$/.test(h) && !/gsdp/.test(h) ? i : -1)).filter((i) => i >= 0);
        for (const row of rows.slice(1)) {
          const cells = row.split('\t');
          for (const i of crCols) {
            if (cells[i] === '' || cells[i] == null) continue;
            assert.ok(accountFor(Number(cells[i]), row), `${f.name}: ₹ ${cells[i]} in column ${header[i]} is accounted for`);
          }
        }
      }
    }
  });
});

test('AC-48 — Carry the as-of date and a source beside every figure', async (t) => {
  if (!requireFull(t)) return;
  await withPage('D', async (page) => {
    const cell = await cellParam(page);
    const panels = [[`/security?cell=${encodeURIComponent(cell)}`, CELL_SAMPLE.fy]];
    if (STATE_SAMPLE) panels.push([`/security?st=${STATE_SAMPLE}`, STATE_NAME.get(STATE_SAMPLE)]);
    for (const [r, h2] of panels) {
      await load(page, r);
      const card = await page.evaluate((h) => {
        const el = window.__ac.card((t) => t.includes(h));
        return el ? { text: window.__ac.txt(el), crs: [...el.querySelectorAll('[data-cr]')].map((e) => Number(e.getAttribute('data-cr'))) } : null;
      }, h2);
      assert.ok(card && card.crs.length > 0, `${r}: the panel prints its figures`);
      assert.ok(card.text.includes(`read to ${ASOF}`), `${r}: "read to ${ASOF}"`);
      for (const v of card.crs) {
        const labels = BUDGETS.filter((x) => Math.abs(x.cr - v) <= 0.005).map(FIRST_SRC).filter(Boolean);
        assert.ok(labels.some((l) => card.text.includes(`document: ${l}`)), `${r}: ₹${v} cr carries "document: {its first source label}"`);
      }
    }
    await load(page, '/security');
    await openReadout(page, LATEST_FY(DEFAULT_STAGE));
    const ro = await panel(page, esc(LATEST_FY(DEFAULT_STAGE)));
    assert.ok(ro?.text.includes(`read to ${ASOF}`) && ro.text.includes('document: '), 'the FYReadout carries read to and document:');
    assert.ok((await stripText(page)).includes(`read to ${ASOF}`), `the strip reads "read to ${ASOF}"`);
    await load(page, '/security?view=table');
    for (const name of ['ledger-long', 'grants']) {
      const missing = await page.evaluate((n) => [...document.querySelectorAll(`details[data-twin="${n}"] tbody tr`)].filter((tr) => !tr.querySelector('a[href^="http"]')).length, name);
      assert.equal(missing, 0, `TWIN(${name}): every budget row has a Sources cell with an http link`);
    }
    for (const lens of LENSES) {
      await load(page, LENS_ROUTE[lens]);
      for (const d of LENS_DOMAINS[lens]) {
        const sec = await domainSection(page, d);
        if (!sec) continue;
        for (const r of BASE_RATES(d)) for (const [, url] of r.srcs) assert.ok(sec.links.includes(url) || sec.links.includes(new URL(url).href), `${lens} ${d}: base-rate source ${url} is printed in full`);
        assert.ok(!/show more|…$/.test(sec.text), `${lens} ${d}: no "show more" or truncation`);
      }
    }
    if (ENFORCE_WITH_CONTRA) {
      await load(page, `/security?lens=procurement&rec=${encodeURIComponent(ENFORCE_WITH_CONTRA.id)}`);
      const links = await page.evaluate((lab) => { const el = window.__ac.card((t) => t === lab || t.startsWith(lab)); return el ? [...el.querySelectorAll('a[href^="http"]')].map((a) => a.href) : null; }, ENFORCE_WITH_CONTRA.lab);
      assert.ok(links, 'the RecordCard opens');
      for (const [, url] of ENFORCE_WITH_CONTRA.srcs ?? []) assert.ok(links.includes(url) || links.includes(new URL(url).href), `the RecordCard prints source ${url}`);
    }
  });
});

// ---------------------------------------------------------------------------
// §4 No-data ≠ zero — FULL build
// ---------------------------------------------------------------------------

/** A ledger lane's key: its `data-lane` value, which §0.6 fixes as the LANES key (required; never its label text). */
function resolveLane(attr, label) {
  return LANES.includes(attr) ? attr : null;
}
/** Every ledger lane with its slots in DOM order (FY-major, BE · RE · actual within a year). */
const ledgerLanes = (page) => page.evaluate(() => [...document.querySelectorAll('[data-lane]')].map((th) => {
  const tr = th.closest('tr, [role="row"]');
  return {
    attr: th.getAttribute('data-lane'), label: window.__ac.txt(th), group: th.getAttribute('data-lane-group'), current: th.getAttribute('aria-current'),
    slots: tr ? [...tr.querySelectorAll('[data-slot]')].map((s) => {
      const btn = s.closest('button, [role="gridcell"], [tabindex]') ?? s;
      return { stage: s.getAttribute('data-slot'), state: s.getAttribute('data-slot-state'), text: window.__ac.txt(s), name: window.__ac.name(btn), fill: (s.getAttribute('fill') ?? '') + ' ' + (s.getAttribute('class') ?? '') + ' ' + getComputedStyle(s).fill };
    }) : [],
  };
}));
const expectedSlot = (key, fy, stage) => {
  const rows = LANE_ROWS(key).filter((r) => r.fy === fy && r.stage === stage);
  if (rows.length === 2) return 'two';
  if (rows.length === 1) return rows[0].cr === 0 ? 'zero' : 'row';
  return rows.length > 2 ? 'two' : 'hatch';
};

test('AC-49 — Hatch every missing stack column with its name and never close the axis up', async (t) => {
  if (!requireFull(t)) return;
  await withPage('D', async (page) => {
    for (const stage of STAGES) {
      await load(page, stage === DEFAULT_STAGE ? '/security' : `/security?stage=${stage}`);
      const attrs = await page.evaluate(() => [...document.querySelectorAll('[data-column][data-panel="defence"]')].map((c) => c.getAttribute('data-column')));
      assert.equal(attrs.length, FY_AXIS.length, `${stage}: ${FY_AXIS.length} defence columns`);
      assert.deepEqual(attrs, FY_AXIS, `${stage}: data-column values equal FY_AXIS in order`);
      const cols = await stackColumns(page);
      const names = (await axisButtons(page)).map((b) => b.name);
      await openTwin(page, 'stack');
      const rows = (await twinTable(page, 'stack')).rows.map((r) => r.join(' | '));
      for (const fy of MISSING(stage)) {
        const col = cols.find((c) => c.fy === fy);
        assert.equal(col?.state, 'hatched', `${stage} FY${fy}: hatched`);
        assert.equal(col.bands.length, 0, `${stage} FY${fy}: no [data-band]`);
        assert.equal(col.cr, 0, `${stage} FY${fy}: no [data-cr]`);
        assert.ok(names.includes(`${fy}, no ${stage} rows recorded`), `${stage} FY${fy}: the axis button is named "${fy}, no ${stage} rows recorded"`);
        assert.ok(rows.some((r) => r.includes(fy) && r.includes(`no ${stage} rows recorded`)), `${stage} FY${fy}: a twin row reads "no ${stage} rows recorded"`);
      }
    }
  });
});

test('AC-50 — Draw a partial column\'s bands and hatch the remainder, labelled', async (t) => {
  if (!requireFull(t)) return;
  if (!need(t, PARTIAL, 'no partial (fy, stage) column in the module')) return;
  const st = STACK(PARTIAL.fy, PARTIAL.stage);
  await withPage('D', async (page) => {
    await load(page, `/security?stage=${PARTIAL.stage}`);
    const r = await page.evaluate((fy) => {
      const cols = [...document.querySelectorAll('[data-column][data-panel="defence"]')];
      const c = cols.find((x) => x.getAttribute('data-column') === fy);
      return c ? { state: c.getAttribute('data-column-state'), bands: [...c.querySelectorAll('[data-band]')].map((b) => b.getAttribute('data-band')), crs: [...c.querySelectorAll('[data-cr]')].map((e) => Number(e.getAttribute('data-cr'))), text: window.__ac.txt(c), hatch: /hatch/.test(c.innerHTML) } : null;
    }, PARTIAL.fy);
    assert.ok(r, `the column for FY${PARTIAL.fy}`);
    assert.equal(r.state, 'partial', 'data-column-state="partial"');
    assert.deepEqual(uniq(r.bands).sort(), [...st.bands.keys()].map((c) => BAND_OF[c] ?? c).sort(), 'one band per component present');
    assert.ok(r.hatch, 'a hatched remainder element');
    assert.ok(r.text.includes(`partial: ${PARTIAL.k} of ${PARTIAL.n} demands`), `labelled "partial: ${PARTIAL.k} of ${PARTIAL.n} demands"`);
    assert.ok(!r.crs.some((v) => Math.abs(v - st.sum) <= 0.5 && ![...st.bands.values()].some((b) => Math.abs(b - v) <= 0.5)), 'no [data-cr] for a column sum');
    await openTwin(page, 'stack');
    const row = (await twinTable(page, 'stack')).rows.map((x) => x.join(' | ')).find((x) => x.includes(PARTIAL.fy) && /published total|no published all-demands total/.test(x) && !/police/i.test(x));
    assert.ok(row, 'the twin published-total row');
    assert.ok(row.includes('no published all-demands total for this FY') || (st.published != null && rupeeValues(row).some((v) => Math.abs(v - st.published) <= 0.5)), 'the published figure or the no-total words');
    assert.ok(row.includes('partial, no sum printed'), 'the stack sum is withheld: "partial, no sum printed"');
  });
});

test('AC-51 — Hatch every empty ledger slot and name it, never `0`', async (t) => {
  if (!requireFull(t)) return;
  if (!need(t, CAPF_LANES, 'no CAPF lane')) return;
  await withPage('D', async (page) => {
    await load(page, '/security');
    const lanes = await ledgerLanes(page);
    for (const l of lanes) assert.ok(LANES.includes(l.attr), `lane "${l.label}" carries data-lane from LANES (got "${l.attr}")`);
    for (const key of CAPF_LANES) {
      const lane = lanes.find((l) => resolveLane(l.attr, l.label) === key);
      assert.ok(lane, `the ledger lane ${key}`);
      assert.equal(lane.slots.length, 3 * FY_AXIS.length, `${key}: 3 × ${FY_AXIS.length} slots`);
      lane.slots.forEach((s, i) => {
        const fy = FY_AXIS[Math.floor(i / 3)];
        const want = expectedSlot(key, fy, s.stage);
        assert.equal(s.state, want, `${key} FY${fy} ${s.stage}: ${want}`);
        if (want === 'hatch') assert.ok(s.name.includes('no row in this register'), `${key} FY${fy} ${s.stage}: the hatch is named "no row in this register"`);
        if (want !== 'zero') assert.ok(!/₹0\b/.test(`${s.text} ${s.name}`), `${key} FY${fy} ${s.stage}: no ₹0`);
      });
    }
    await openTwin(page, 'ledger-coverage');
    const cov = await twinTable(page, 'ledger-coverage');
    const key = CAPF_LANES[0];
    const fyHole = FY_AXIS.find((fy) => STAGES.some((s) => expectedSlot(key, fy, s) === 'hatch'));
    if (fyHole) {
      const line = key.split('|').slice(2).join('|');
      const row = cov.rows.find((r) => r.some((c) => c.includes(line)) && r.some((c) => c === fyHole || c === `FY${fyHole}`));
      assert.ok(row?.some((c) => c === 'no row in this register'), `the coverage twin reads "no row in this register" for ${key} FY${fyHole}`);
    }
  });
});

test('AC-52 — Print a recorded zero as `₹0 cr — as recorded` on `ZERO_FILL`, never a hatch', async (t) => {
  if (!requireFull(t)) return;
  if (!need(t, ZERO_ROW, 'no budget row with cr === 0')) return;
  const zeroGrants = ZERO_ROWS.filter((r) => r.component === 'grant-to-states').length;
  await withPage('D', async (page) => {
    const pages = await allTwinPages(page, 'grants', '/security');
    const rows = pages.flatMap((p) => p.rows.map((r) => r.join(' | ')));
    if (ZERO_ROW.component === 'grant-to-states') {
      const row = rows.find((r) => r.includes(ZERO_ROW.head) && r.includes(ZERO_ROW.fy));
      assert.ok(row?.includes('₹0 cr — as recorded'), `the grants row for ZERO_ROW reads "₹0 cr — as recorded" (reads "${row?.slice(0, 200)}")`);
      await load(page, '/security?view=table');
      const tsv = await downloadTsv(page, 'grants');
      const data = tsvRows(tsv.text);
      const hdr = data[0].split('\t');
      const iCr = hdr.indexOf('cr');
      const line = data.find((l) => l.includes(ZERO_ROW.head) && l.includes(ZERO_ROW.fy));
      assert.equal(line?.split('\t')[iCr], '0', 'its TSV cr exports as 0');
    } else {
      await load(page, '/security');
      const lane = (await ledgerLanes(page)).find((l) => resolveLane(l.attr, l.label) === LANE_KEY(ZERO_ROW));
      const slot = lane?.slots[FY_AXIS.indexOf(ZERO_ROW.fy) * 3 + STAGES.indexOf(ZERO_ROW.stage)];
      assert.equal(slot?.state, 'zero', 'the ledger slot is zero');
      assert.ok(/zero-fill|ZERO_FILL|zero/i.test(slot.fill) && !/hatch/.test(slot.fill), 'ZERO_FILL, not the hatch');
    }
    assert.equal(rows.filter((r) => r.includes('₹0 cr — as recorded')).length, zeroGrants, `${zeroGrants} grants rows read "₹0 cr — as recorded"`);
    for (const lens of LENSES) {
      await load(page, route(lens, 'view=table'));
      const bad = await page.evaluate(() => window.__ac.deepestAll(document.body, '₹0 cr').map((e) => window.__ac.txt(e)).filter((s) => /₹0 cr(?! — as recorded)/.test(s)));
      assert.deepEqual(bad, [], `${lens}: no "₹0 cr" without " — as recorded"`);
    }
  });
});

const mapOptionsRaw = (page, q, i) => page.evaluate(([id, k]) => {
  const m = [...(window.__ac.q(id)?.querySelectorAll('svg[role="listbox"]') ?? [])][k];
  return m ? { fills: window.__ac.fillClasses(m), options: [...m.querySelectorAll('[role="option"]')].map((o) => ({ name: window.__ac.name(o), selected: o.getAttribute('aria-selected'), id: o.id })), legend: window.__ac.txt(m.closest('figure')) } : null;
}, [q, i]);
/** The i-th svg[role="listbox"] map in a Q-block, asserted present so a missing map fails with its name. */
async function mapOptions(page, q, i) {
  const m = await mapOptionsRaw(page, q, i);
  assert.ok(m, `${q}: map ${i + 1} is an svg[role="listbox"]`);
  return m;
}

test('AC-53 — Paint the spend map\'s classes to the module and name every class in the legend', async (t) => {
  if (!requireFull(t)) return;
  const pair = DEFAULT_PAIR('gsdp');
  if (!need(t, pair, 'no state pair')) return;
  const cls = new Map(UNITS.map((st) => [st, SPEND_CLASS(st, pair, 'gsdp')]));
  const noRow = UNITS.filter((st) => cls.get(st) === 'no-row').length;
  const noDen = UNITS.filter((st) => cls.get(st) === 'no-denominator');
  await withPage('D', async (page) => {
    await load(page, '/security');
    const m = await mapOptions(page, 'B6', 0);
    assert.ok(m, 'the spend map');
    assert.equal(m.fills.length, 36, '36 painted units');
    const n = (c) => m.fills.filter((x) => x === c).length;
    assert.equal(n('value'), UNITS.filter((st) => cls.get(st) === 'value').length, 'value count');
    assert.equal(n('hatch'), noRow + noDen.length, 'hatch = no-row units + no-denominator units');
    assert.equal(n('crosshatch'), 1, 'crosshatch = Delhi');
    assert.equal(n('hollow') + n('stipple'), 0, 'no hollow or stipple on this map');
    for (const st of noDen) assert.ok(m.options[UNITS.indexOf(st)]?.name.includes('GSDP not in this build'), `${st}: the option says "GSDP not in this build"`);
    assert.equal(m.options[UNITS.indexOf('dl')]?.name, 'Delhi: police paid by the Union, not a state line', 'the Delhi option');
    for (const w of [`no row in this register (${noRow})`, 'police paid by the Union', `GSDP not in this build (${noDen.length})`]) assert.ok(m.legend.includes(w), `the legend names "${w}"`);
    assert.ok(/\d[\d.]*\s?[–-]\s?\d[\d.]*/.test(m.legend), 'the legend names its bins by their edges');
    await load(page, '/security?m=cr');
    const c = await mapOptions(page, 'B6', 0);
    assert.ok(!c.legend.includes('GSDP not in this build'), 'under m=cr the no-denominator class is absent');
    assert.equal(c.fills.filter((x) => x === 'value').length, UNITS.filter((st) => SPEND_CLASS(st, pair, 'cr') === 'value').length, 'under m=cr those units are value');
  });
});

test('AC-54 — Stipple Delhi on the strength map and hatch the units without a row', async (t) => {
  if (!requireFull(t)) return;
  if (!need(t, DEFAULT_SY, 'no strength rows with a state')) return;
  const cls = new Map(UNITS.map((st) => [st, STRENGTH_CLASS(st, DEFAULT_SY)]));
  await withPage('D', async (page) => {
    await load(page, '/security');
    const m = await mapOptions(page, 'B6', 1);
    assert.ok(m, 'the strength map');
    const n = (c) => m.fills.filter((x) => x === c).length;
    const want = (c) => UNITS.filter((st) => cls.get(st) === c).length;
    assert.equal(n('stipple'), want('counts-only'), 'stipple = counts-only units');
    assert.equal(n('hatch'), want('no-row'), 'hatch = no-row units');
    assert.equal(n('value'), want('value'), 'value = the rest');
    assert.equal(n('stipple') + n('hatch') + n('value'), 36, 'the classes sum to 36');
    const stipple = UNITS.filter((st) => cls.get(st) === 'counts-only');
    for (const st of stipple) assert.ok(m.options[UNITS.indexOf(st)]?.name.includes('counts recorded without per-lakh'), `${st}: the stipple option is named`);
    await openTwin(page, 'strength-map');
    const rows = (await twinTable(page, 'strength-map')).rows.map((r) => r.join(' | '));
    for (const st of stipple) {
      const row = rows.find((r) => r.startsWith(STATE_NAME.get(st)) || r.includes(STATE_NAME.get(st)));
      assert.ok(row?.includes('sanctioned') && row.includes('no per-lakh printed'), `${st}: the twin row prints sanctioned and "no per-lakh printed"`);
    }
    const derived = STRENGTH_ST.find((r) => r.year === DEFAULT_SY && /DERIVED/.test(r.note ?? ''));
    if (derived) {
      const sentence = derived.note.split(/(?<=\.)\s+/).find((s) => s.includes('DERIVED'));
      const row = rows.find((r) => r.includes(STATE_NAME.get(derived.st)));
      assert.ok(row?.includes(sentence.trim()), `${derived.st}: the derived row prints the note's DERIVED sentence`);
    }
  });
});

test('AC-55 — Keep 36 rows in the state table, each empty cell carrying its reason', async (t) => {
  if (!requireFull(t)) return;
  const PRS = STATE_ROWS.filter((r) => /PRS/.test(r.head));
  const up = STATE_ROWS.filter((r) => r.payer === 'up' && r.head !== STATE_SERIES_HEAD && !/PRS/.test(r.head));
  const upFys = uniq(up.map((r) => r.fy)).sort();
  const variants = ['', STATE_SAMPLE ? `st=${STATE_SAMPLE}` : '', `fy=${FY_AXIS[5]}`, `stage=${STAGES.find((s) => s !== DEFAULT_STAGE)}`, 'tier=documented', 'tier=none'].filter((v, i) => i === 0 || v);
  await withPage('D', async (page) => {
    for (const v of variants) {
      await load(page, `/security${v ? `?${v}` : ''}`);
      await openTwin(page, 'state-table');
      const tbl = await twinTable(page, 'state-table');
      assert.equal(tbl.rows.length, 36, `${v || 'rest'}: 36 rows`);
      assert.deepEqual(tbl.rows.map((r) => r[0]), UNITS.map((u) => STATE_NAME.get(u)), `${v || 'rest'}: rows in UNITS order`);
      for (const [i, r] of tbl.rows.entries()) for (const c of r) assert.ok(!['', '—', '0', 'NaN'].includes(c), `${v || 'rest'} ${UNITS[i]}: no empty, —, 0 or NaN cell`);
      if (v) continue;
      const mh = tbl.headers.map((h, i) => (/MH 2055/.test(h) ? i : -1)).filter((i) => i >= 0);
      const inst = window_col(tbl, 'Installations');
      const prs = tbl.headers.findIndex((h) => h.includes('District Police line, PRS'));
      const own = tbl.headers.findIndex((h) => /own/i.test(h));
      assert.ok(mh.length >= 1 && inst >= 0 && prs >= 0 && own >= 0, `the MH 2055, Installations, PRS and own-series columns (headers ${JSON.stringify(tbl.headers)})`);
      for (const [i, st] of UNITS.entries()) {
        const row = tbl.rows[i];
        if (!STATE_SERIES.some((r) => r.payer === st)) for (const j of mh) assert.ok(['no row in this register', "Delhi's police is a Union demand line — see Q7", 'no RBI row for this UT'].includes(row[j]), `${st}: MH 2055 cell reads its reason (reads "${row[j]}")`);
        if (FP_NONE.includes(st)) assert.equal(row[inst], 'no installation in this register', `${st}: Installations cell`);
        for (const j of mh) assert.ok(!/District Police line|PRS/.test(row[j]), `${st}: no PRS figure in an MH 2055 column`);
      }
      for (const r of PRS) {
        const row = tbl.rows[UNITS.indexOf(r.payer)];
        assert.ok(row[prs].includes('reported') && rupeeValues(row[prs]).some((x) => Math.abs(x - r.cr) <= 0.5), `${r.payer}: the PRS ₹ sits in its own column with "reported"`);
      }
      if (up.length) assert.ok(tbl.rows[UNITS.indexOf('up')][own].includes(`${up.length} rows, FY${upFys[0]}–FY${upFys.at(-1)}`), `UP own-series cell reads "${up.length} rows, FY${upFys[0]}–FY${upFys.at(-1)}"`);
    }
  });
});

test('AC-56 — Hatch footprint states without a row and keep 0-row kinds visible as `none in this register`', async (t) => {
  if (!requireFull(t)) return;
  await withPage('D', async (page) => {
    await load(page, '/security?lens=footprint');
    const m = await mapOptions(page, 'F1', 0);
    assert.ok(m, 'the footprint map');
    assert.equal(m.fills.filter((c) => c === 'hatch').length, FP_NONE.length, `hatch = ${FP_NONE.length} units with no row`);
    for (const st of FP_NONE) assert.equal(m.options[UNITS.indexOf(st)]?.name, `${STATE_NAME.get(st)}: no row of the selected kinds in this register`, `${st}: option name`);
    const chips = await kindChips(page);
    assert.equal(chips.filter((c) => c.found).length, KINDS.length, `${KINDS.length} kind chips`);
    for (const c of chips.filter((x) => EMPTY_KINDS.includes(x.kind))) {
      assert.ok(c.disabled && c.name.includes('none in this register'), `${c.kind}: aria-disabled, "none in this register"`);
      // [Adjudicated 2026-10-07] ordnance's absence is a rule (spec §5.2.1), not a void; a void of another domain (pay,
      // demands) never explains a footprint absence, so prison reads only footprint-domain voids.
      if (c.kind === 'ordnance') {
        assert.ok(/ex-OFB/.test(c.name) && /dpsu-plant/.test(c.name), `ordnance: the rule sentence (ex-OFB plants recorded as dpsu-plant), not a void of another domain (reads "${c.name}")`);
      } else if (c.kind === 'prison') {
        const v = F.FORCE_VOIDS.find((x) => x.domain === 'footprint' && /prison|jail/i.test(x.what));
        assert.ok(v, 'a footprint-domain void names prisons or jails');
        assert.ok(c.name.includes(v.what.slice(0, 40)), `prison: the footprint void's words (reads "${c.name}")`);
      }
    }
    await openTwin(page, 'footprint-matrix');
    const tbl = await twinTable(page, 'footprint-matrix');
    for (const k of KINDS) {
      const i = tbl.headers.findIndex((h) => new RegExp('^' + k.replace(/-/g, '[ -]'), 'i').test(h));
      assert.ok(i >= 0, `the matrix keeps a ${k} column`);
      if (EMPTY_KINDS.includes(k)) assert.ok(tbl.headers[i].includes('none in this register'), `${k}: header note "none in this register"`);
    }
    for (const r of tbl.rows) for (const c of r) assert.notEqual(c, '0', 'no matrix cell reads 0');
  });
});

test('AC-57 — Count unpriced awards beneath the axis and draw none as zero', async (t) => {
  if (!requireFull(t)) return;
  await withPage('D', async (page) => {
    await load(page, '/security?lens=procurement');
    const r = await page.evaluate(() => ({
      priced: document.querySelectorAll('[data-mark="award"]').length,
      unpriced: document.querySelectorAll('[data-mark="award-unpriced"]').length,
      zeroCr: [...document.querySelectorAll('[data-mark]')].filter((e) => e.getAttribute('data-cr') === '0').length,
      counts: window.__ac.deepestAll(window.__ac.q('P1'), '^\\d+ contracts? named without ₹').map((e) => window.__ac.txt(e)),
      fig: window.__ac.txt(window.__ac.q('P1')?.querySelector('figure')),
    }));
    assert.equal(r.priced, PRICED.length, '[data-mark="award"] = PRICED');
    assert.equal(r.unpriced, UNPRICED.length, '[data-mark="award-unpriced"] = UNPRICED');
    assert.equal(sum(r.counts.map(int)), UNPRICED.length, 'Σ of the per-year "{n} contracts named without ₹" = UNPRICED');
    assert.equal(r.zeroCr, 0, 'no mark is drawn at ₹0');
    assert.ok(r.fig.includes(String(AWARD_YEARS[0])) && r.fig.includes(String(AWARD_YEARS.at(-1))), `the x-axis runs ${AWARD_YEARS[0]}–${AWARD_YEARS.at(-1)}`);
    await openTwin(page, 'awards');
    const rows = (await twinTable(page, 'awards')).rows.map((x) => x.join(' | '));
    assert.equal(rows.filter((x) => x.includes('amount not stated')).length, UNPRICED.length, 'each unpriced award\'s ₹ cell reads "amount not stated"');
    for (const y of EMPTY_YEARS) assert.ok(rows.some((x) => x.includes(`no named contract in ${y}`)), `a twin row reads "no named contract in ${y}"`);
  });
});

test('AC-58 — Draw no slice dot where n < 10, and say so', async (t) => {
  if (!requireFull(t)) return;
  if (!need(t, S8, 'S8 absent: no open-market slice')) return;
  await withPage('D', async (page) => {
    await load(page, '/security?lens=procurement', { slice: true });
    const r = await page.evaluate(() => ({ dots: [...document.querySelectorAll('[data-rate]')].map((e) => Number(e.getAttribute('data-n'))), text: window.__ac.txt(window.__ac.q('P2')) }));
    assert.equal(r.dots.length, SLICE.rates.byClassYear.filter((y) => y.n >= 10).length, '[data-rate] count = class-years with n ≥ 10');
    assert.ok(r.dots.every((n) => n >= 10), 'every drawn dot has data-n ≥ 10');
    for (const y of SMALL_YEARS) assert.ok(ungroup(r.text).includes(`n ${y.n}: no rate drawn`), `${y.class} ${y.year}: "n ${y.n}: no rate drawn"`);
  });
});

test('AC-59 — Dim, never hatch, a row hidden by a filter, and name the filter', async (t) => {
  if (!requireFull(t)) return;
  await withPage('D', async (page) => {
    for (const tier of ['documented', 'alleged']) {
      await load(page, `/security?tier=${tier}`);
      const lanes = await ledgerLanes(page);
      for (const lane of lanes) {
        const key = resolveLane(lane.attr, lane.label);
        assert.ok(key, `lane "${lane.label}" carries a LANES key (reads "${lane.attr}")`);
        lane.slots.forEach((s, i) => {
          const fy = FY_AXIS[Math.floor(i / 3)];
          const rows = LANE_ROWS(key).filter((r) => r.fy === fy && r.stage === s.stage);
          if (!rows.length) return;
          assert.ok(['row', 'two', 'zero', 'hidden'].includes(s.state), `tier=${tier} ${key} FY${fy} ${s.stage}: never hatch (reads ${s.state})`);
          if (s.state === 'hidden') {
            assert.ok(/\d+ rows? hidden by the tier filter — not absent/.test(s.name), `tier=${tier} ${key} FY${fy} ${s.stage}: named "{k} rows hidden by the tier filter — not absent"`);
            assert.ok(!/hatch/.test(s.fill), `tier=${tier} ${key} FY${fy} ${s.stage}: no hatch fill`);
          }
        });
      }
      if (tier === 'alleged') {
        const m = await mapOptions(page, 'B6', 0);
        const k = m.legend.match(/hidden by filter \((\d+)\)/);
        const j = m.legend.match(/no row in this register \((\d+)\)/);
        assert.ok(k && j, 'the spend map legend lists "hidden by filter ({k})" beside "no row in this register ({j})"');
        assert.equal(int(k[1]) + int(j[1]) + m.fills.filter((c) => c === 'value').length + m.fills.filter((c) => c === 'crosshatch').length, 36, 'k + j + value + crosshatch = 36');
        const figs = await page.evaluate(() => [...document.querySelectorAll('[data-q="B1"] figure, [data-q="B3"] figure, [data-q="B6"] figure')].map((f) => window.__ac.txt(f)));
        assert.ok(figs.some((f) => /\d+ rows hidden by filters/.test(f)), 'a figure that lost rows adds "{hidden} rows hidden by filters"');
      }
    }
  });
});

test('AC-60 — Keep axis, rows and frames when filters leave nothing, and name the most-removing filter', async (t) => {
  if (!requireFull(t)) return;
  const N = { budgets: BUDGETS.length, footprint: FOOTPRINT.length, procurement: EDGES.length };
  const SENT = /No record in this register matches .*tier.*\. This is a statement about the register, not about India\./;
  await withPage('D', async (page) => {
    for (const lens of LENSES) {
      await load(page, route(lens, 'tier=none'));
      assert.ok(ungroup(await stripText(page)).includes(`${N[lens]} → 0`), `${lens}: the strip reads "${N[lens]} → 0"`);
      const blocks = await page.evaluate(() => [...document.querySelectorAll('[data-q]')].map((b) => window.__ac.txt(b)).filter((s) => s.includes('No record in this register matches')));
      assert.ok(blocks.length >= 1, `${lens}: Q-blocks with a population say so`);
      for (const b of blocks) assert.ok(SENT.test(b), `${lens}: the sentence names tier`);
      if (lens === 'budgets') {
        assert.equal(await count(page, '[data-column][data-panel="defence"]'), FY_AXIS.length, 'the stack axis keeps every column');
        assert.equal(await openTwinRows(page, 'state-table'), 36, 'TWIN(state-table) stays 36 rows');
      }
      if (lens === 'procurement') {
        assert.equal(await count(page, '[data-vendor-card]'), VENDORS.length, 'every vendor card stays');
        assert.equal(await count(page, '[data-pair]'), CASE_PAIRS.length + UNPAIRED.length, 'every pair row stays');
      }
      const reset = page.locator('[data-q] button').filter({ hasText: /reset|show all|clear/i }).first();
      await reset.click();
      await waitNoParam(page, 'tier');
    }
    const fy = MISSING(DEFAULT_STAGE)[0];
    if (fy) {
      await load(page, `/security?fy=${fy}`);
      assert.ok((await liveText(page)).includes(`0 ${DEFAULT_STAGE} columns in`), `the live region says "0 ${DEFAULT_STAGE} columns in {range}"`);
      assert.equal(await count(page, '[data-column][data-panel="defence"]'), FY_AXIS.length, 'the axis is unchanged');
    }
  });
});

test('AC-61 — Print the null words everywhere: never a bare dash, `NaN` or `0` for absence', async (t) => {
  if (!requireFull(t)) return;
  await withPage('D', async (page) => {
    for (const lens of LENSES) {
      for (const v of ['', 'view=table']) {
        await load(page, route(lens, v), { slice: lens === 'procurement' && S8 });
        const bad = await page.evaluate((badList) => {
          const els = [...document.querySelectorAll('main td, main dd, main [data-effect]')];
          const den = window.__ac.deepestAll(document.querySelector('main'), ' · ').filter((e) => e.closest('figure'));
          return [...els, ...den].filter((e) => badList.includes(window.__ac.txt(e))).map((e) => `${e.tagName.toLowerCase()} "${window.__ac.txt(e)}" in ${window.__ac.txt(e.closest('tr, dl, figure'))?.slice(0, 80)}`);
        }, BAD_NULLS);
        assert.ok(await count(page, 'main td, main dd') > 0, `${lens}${v ? ' ' + v : ''}: the lens prints table and list values to check`);
        assert.deepEqual(bad, [], `${lens}${v ? ' ' + v : ''}: no bare dash, NaN, 0 or empty value`);
        if (lens === 'procurement' && !v) {
          const dds = await page.evaluate(() => [...document.querySelectorAll('[data-vendor-card]')].map((c) => [...c.querySelectorAll('dd')].map((d) => window.__ac.txt(d))));
          assert.equal(dds.length, VENDORS.length, `${VENDORS.length} vendor cards to check`);
          for (const d of dds) {
            assert.equal(d.length, 13, 'every vendor card has thirteen dds');
            assert.ok(d.every((x) => x.length > 0), 'every vendor dd is non-empty');
          }
        }
      }
    }
  });
});

test('AC-62 — Print `no source in file` in amber for a record without sources', async (t) => {
  if (!requireFull(t)) return;
  const e = EMPTY_SRCS.find((x) => x.tier === 'alleged' || x.pred === 'enforce') ?? EMPTY_SRCS[0];
  if (!need(t, e, 'no record without sources')) return;
  await withPage('D', async (page) => {
    await load(page, `/security?lens=procurement&rec=${encodeURIComponent(e.id)}`);
    const r = await page.evaluate((lab) => {
      const el = window.__ac.card((t) => t === lab || t.startsWith(lab.slice(0, 40)));
      const cell = el ? window.__ac.deepest(el, '^no source in file$') : null;
      return { card: !!el, colour: cell ? getComputedStyle(cell).color : null };
    }, e.lab ?? e.id);
    assert.ok(r.card, `the RecordCard for ${e.id} opens`);
    assert.ok(r.colour, 'its Sources cell reads exactly "no source in file"');
    assert.equal(r.colour, await amberColour(page), 'in the amber token');
    const contested = await page.evaluate(() => window.__ac.deepestAll(document.querySelector('#contested'), '^no source in file$').map((c) => getComputedStyle(c).color));
    const alleged = EMPTY_SRCS.filter((x) => x.tier === 'alleged' && x.pred !== 'contra');
    assert.ok(contested.length >= alleged.length, `#contested prints "no source in file" for its ${alleged.length} unsourced allegations`);
    for (const c of contested) assert.equal(c, await amberColour(page), 'in amber');
  });
});

test('AC-63 — Print the exact city sentence, and no ₹, for every city body other than Delhi Police', async (t) => {
  if (!requireFull(t)) return;
  if (!need(t, CITY_SAMPLE, 'no commissionerate in the footprint')) return;
  const state = STATE_NAME.get(CITY_SAMPLE.st);
  const delhiBeFys = uniq(UNION_ROWS.filter((r) => r.body === DELHI_POLICE && r.stage === 'BE').map((r) => r.fy)).sort();
  const latestBe = delhiBeFys.at(-1);
  const d = DELHI(latestBe, 'BE');
  const commStates = uniq(COMMISSIONERATES.map((r) => r.st)).length;
  const checkCityBodies = async (page, where) => {
    const els = await page.evaluate((ids) => [...document.querySelectorAll('[data-city-body]')].filter((e) => ids.includes(e.getAttribute('data-city-body'))).map((e) => ({ id: e.getAttribute('data-city-body'), text: window.__ac.txt(e), title: e.getAttribute('title') ?? '', aria: e.getAttribute('aria-label') ?? '' })), CITY_BODIES);
    for (const e of els) for (const s of [e.text, e.title, e.aria]) assert.ok(!/₹|\d[\d,]*(\.\d+)? cr\b|%/.test(s), `${where} ${e.id}: no ₹, crore figure or % ("${s.slice(0, 120)}")`);
    return els;
  };
  await withPage('D', async (page) => {
    for (const [where, r] of [['B7', '/security'], ['F3', '/security?lens=footprint'], ['panel', `/security?st=${CITY_SAMPLE.st}`]]) {
      await load(page, r);
      const els = await checkCityBodies(page, where);
      assert.ok(els.length >= 1, `${where}: city bodies are marked [data-city-body]`);
      const mine = els.filter((e) => e.id === CITY_SAMPLE.body);
      assert.ok(mine.some((e) => e.text === CITY_TEXT(state)), `${where}: ${CITY_SAMPLE.body}'s budget cell reads exactly "${CITY_TEXT(state)}"`);
    }
    await load(page, '/security');
    await find(page, CITY_SAMPLE.city);
    await checkCityBodies(page, 'Find');
    assert.ok((await bodyText(page)).includes(CITY_TEXT(state)), 'Find: the result prints the city sentence');
    await load(page, '/security');
    await openTwin(page, 'city-ledger');
    const tbl = await twinTable(page, 'city-ledger');
    assert.equal(tbl.rows.length, COMMISSIONERATES.length + 1, `TWIN(city-ledger) = ${COMMISSIONERATES.length} + 1 rows`);
    const first = ungroup(tbl.rows[0].join(' | '));
    assert.ok(new RegExp(`₹([\\d.]+) cr BE ${esc(latestBe)} — the Police demand \\(Union\\)`).test(first), `the Delhi row first reads "₹{latest BE} cr BE ${latestBe} — the Police demand (Union)" (reads "${first}")`);
    if (d?.total != null) assert.ok(rupeeValues(first).some((v) => Math.abs(v - d.total) <= 0.5), `Delhi latest BE = ${d.total}`);
    const row = tbl.rows.find((x) => x.some((c) => c.includes(CITY_SAMPLE.city)));
    assert.ok(row?.includes(CITY_TEXT(state)) || row?.some((c) => c.startsWith(CITY_TEXT(state))), 'the sample row prints the city sentence');
    assert.ok(row?.some((c) => c === CITY_STRENGTH_VOID || STRENGTH.some((s) => s.body === CITY_SAMPLE.body)), 'its strength cell is a row or the void sentence');
    const link = page.locator('details[data-twin="city-ledger"] a, details[data-twin="city-ledger"] button').filter({ hasText: `${state}'s police head →` }).first();
    await link.click();
    await waitParam(page, 'st', CITY_SAMPLE.st);
    assert.ok(!hashParams(page).has('lens') || hashParams(page).get('lens') === 'budgets', 'the link sets st and lens=budgets');
    await load(page, '/security');
    assert.ok(ungroup(await text(block(page, 'B7'))).includes(`${COMMISSIONERATES.length} commissionerates recorded in ${commStates} states · not every commissionerate: the national list is unreachable`), 'the city ledger denominator line');
    await load(page, '/security?view=table');
    const tsv = await downloadTsv(page, 'city-ledger');
    for (const l of tsvRows(tsv.text).slice(1).filter((x) => CITY_BODIES.some((b) => x.includes(b)) || COMMISSIONERATES.some((c) => x.includes(c.city)))) assert.ok(!/₹|\d[\d,]*(\.\d+)? cr\b|%/.test(l.replace(/\thttps?:\S+/g, '')), `city-ledger TSV: no ₹ for a city body ("${l.slice(0, 120)}")`);
  });
});

// ---------------------------------------------------------------------------
// §5 Denials beside claims — FULL build
// ---------------------------------------------------------------------------

/** The case column <dl> for a case: `[data-case="{id}"]` (§0.6; the value is required, never matched by label text). */
const caseColumn = (page, id) => page.evaluate((cid) => {
  const el = document.querySelector(`[data-case="${cid}"]`);
  if (!el) return null;
  return {
    text: window.__ac.txt(el), width: el.getBoundingClientRect().width, fontSize: getComputedStyle(el).fontSize,
    dts: [...el.querySelectorAll('dt')].map((d) => window.__ac.txt(d)),
    responses: [...el.querySelectorAll('[data-response]')].map((r) => ({ v: r.getAttribute('data-response'), text: window.__ac.txt(r) })),
  };
}, id);
/** In-page: the element holding a record's text, and its response slot (AC-64, AC-65, AC-67). */
const recordAndResponse = (page, scopeSel, recText, respText) => page.evaluate(([sc, rt, pt]) => {
  const scope = document.querySelector(sc);
  if (!scope) return null;
  const recEl = [...scope.querySelectorAll('*')].filter((e) => window.__ac.txt(e).includes(rt) && ![...e.children].some((c) => window.__ac.txt(c).includes(rt)))[0] ?? null;
  // The slot that prints the response in full: a Counter-record line pointing to a response already printed beside its claim is not it (AC-65, amended 2026-10-07).
  const resp = [...scope.querySelectorAll('[data-response]')].filter((r) => (pt ? window.__ac.txt(r).includes(pt) : true)).sort((a, b) => window.__ac.txt(b).length - window.__ac.txt(a).length)[0] ?? null;
  const box = (e) => (e ? { width: e.getBoundingClientRect().width, fontSize: getComputedStyle(e).fontSize, fontWeight: getComputedStyle(e).fontWeight, text: window.__ac.txt(e), v: e.getAttribute('data-response'), folded: !!e.closest('details:not([open])') } : null);
  return { rec: box(recEl), resp: box(resp) };
}, [scopeSel, recText, respText]);
/**
 * AC-65 (amended 2026-10-07): the fold state of every pair row. In-page, each row's `[data-case]` columns must share
 * their nearest <details> (or none has one); a closed one is a whole-row fold whose summary names no allegation. Returns
 * one entry per row; `fold` is the index of the shared <details> among all <details> on the page, or -1.
 */
const pairFolds = (page) => page.evaluate(() => {
  const all = [...document.querySelectorAll('details')];
  return [...document.querySelectorAll('[data-pair]')].map((row) => {
    const cols = [...row.querySelectorAll('[data-case]')];
    const folds = cols.map((c) => all.indexOf(c.closest('details')));
    const d = all[folds[0]] ?? null;
    return {
      cases: cols.map((c) => c.getAttribute('data-case')), folds, fold: folds[0] ?? -1,
      closed: !!d && !d.open, summary: d ? window.__ac.raw(d.querySelector(':scope > summary')) : null,
    };
  });
});
/** Open the <details> at index `i` from its summary, as a reader does, and wait for it to report open. */
const openFold = async (page, i) => {
  await page.evaluate((k) => document.querySelectorAll('details')[k].querySelector(':scope > summary').click(), i);
  await page.waitForFunction((k) => document.querySelectorAll('details')[k]?.open === true, i, { timeout: ACTION_TIMEOUT });
  await page.waitForTimeout(SETTLE);
};
/** In-page, per case column: every rendered answered record and the response slots that carry one of its responses' `lab`, with their nearest <details>. */
const recordFolds = (page, cid, recs) => page.evaluate(([c, rs]) => {
  const col = document.querySelector(`[data-case="${c}"]`);
  if (!col) return null;
  const all = [...document.querySelectorAll('details')];
  const deepestRaw = (needle) => [...col.querySelectorAll('*')].filter((e) => window.__ac.raw(e).includes(needle) && ![...e.children].some((k) => window.__ac.raw(k).includes(needle)))[0] ?? null;
  const box = (e) => ({ fold: all.indexOf(e.closest('details')), width: e.getBoundingClientRect().width, fontSize: getComputedStyle(e).fontSize });
  return rs.map(({ id, lab, resp }) => {
    const rec = deepestRaw(lab);
    if (!rec) return { id, rendered: false };
    const slots = [...col.querySelectorAll('[data-response="true"]')].filter((r) => resp.some((l) => window.__ac.raw(r).includes(l)));
    return { id, rendered: true, rec: box(rec), slots: slots.map((r) => ({ ...box(r), len: window.__ac.raw(r).length })) };
  });
}, [cid, recs]);
const squash = (s) => (s ?? '').replace(/\s+/g, ' ').trim();
/** The ALLEGED records of a case's file: a folded row's summary may name none of them (AC-65, AC-134). */
const allegationsOf = (cases) => uniq(cases.flatMap((c) => (CASE_SET.has(c) ? CASE_FILE(c) : []).filter((e) => e.tier === 'alleged' && e.pred !== 'contra').map((e) => squash(e.lab)).filter(Boolean)));
const namesAllegation = (summary, cases) => allegationsOf(cases).find((l) => squash(summary).includes(l) || (l.length > 40 && squash(summary).includes(l.slice(0, 40)))) ?? null;
const PARTY_RE = new RegExp(`\\b(${PARTY_WORDS.map(esc).join('|')})\\b`, 'i');
const partyHit = (s) => (s ?? '').match(PARTY_RE)?.[0] ?? null;

test('AC-64 — Print the exact no-response sentence for every unanswered record', async (t) => {
  if (!requireFull(t)) return;
  if (!need(t, ENFORCE_NO_CONTRA, 'no case-file enforce record without a response')) return;
  const e = ENFORCE_NO_CONTRA;
  const c = caseOf(e);
  await withPage('D', async (page) => {
    await load(page, '/security?lens=procurement');
    const col = await caseColumn(page, c);
    assert.ok(col, `the case column for ${c}`);
    assert.ok(col.text.includes(e.lab), `the column lists ${e.id}`);
    assert.ok(col.responses.some((r) => r.v === 'false' && r.text === NO_RESPONSE), `a [data-response="false"] reads exactly "${NO_RESPONSE}"`);
    await openTwin(page, 'case-timeline');
    const tl = (await twinTable(page, 'case-timeline')).rows.find((r) => r.some((x) => x.includes(e.lab)));
    assert.ok(tl?.includes(NO_RESPONSE), 'the case-timeline row reads the sentence in its response cell');
    await load(page, `/security?lens=procurement&rec=${encodeURIComponent(e.id)}`);
    assert.ok((await panel(page, esc(e.lab.slice(0, 40))))?.text.includes(NO_RESPONSE), 'its RecordCard reads the sentence');
    const unanswered = CONTRACTS.find((k) => responsesTo(k.id).length === 0);
    if (unanswered) {
      await load(page, '/security');
      const r = await page.evaluate(([lab, sentence]) => {
        const b = window.__ac.qq('B5');
        const card = [...b.querySelectorAll('article, li, section, div')].filter((x) => window.__ac.txt(x).includes(lab) && x.querySelectorAll('dl').length >= 2).pop();
        if (!card) return null;
        const [left, right] = card.querySelectorAll('dl');
        const s = window.__ac.deepest(right, '^' + sentence + '$');
        const firstField = left.querySelector('dd');
        return { found: !!s, size: s ? getComputedStyle(s).fontSize : null, left: firstField ? getComputedStyle(firstField).fontSize : null };
      }, [unanswered.lab, NO_RESPONSE]);
      assert.ok(r?.found, `the contract card for ${unanswered.id} reads the sentence in its right column`);
      assert.equal(r.size, r.left, "at the left column's first-field size");
    }
  });
});

test('AC-65 — Show every recorded response in full, at the claim\'s size and weight', async (t) => {
  if (!requireFull(t)) return;
  if (!need(t, ENFORCE_WITH_CONTRA, 'no case-file enforce record with a response')) return;
  const e = ENFORCE_WITH_CONTRA;
  const contra = responsesTo(e.id)[0];
  const c = caseOf(e);
  const head = `Response from ${labelOf(contra.s)} [${contra.tier}], ${contra.from ?? 'undated response'}:`;
  const caseResponses = uniq(CASES.flatMap((k) => CASE_FILE(k).flatMap((x) => responsesTo(x.id).map((r) => r.id)))).length;
  for (const vp of ['D', 'M']) {
    await withPage(vp, async (page) => {
      await load(page, '/security?lens=procurement');
      // Amended 2026-10-07: a record never folds apart from its response. Every pair row's columns share one fold state;
      // a closed fold names no allegation and is opened from its summary before anything inside it is measured.
      const rows = await pairFolds(page);
      assert.equal(rows.length, CASE_PAIRS.length + UNPAIRED.length, `${vp}: every pair row renders`);
      const toOpen = [];
      for (const row of rows) {
        const name = row.cases.join(' | ');
        assert.ok(row.folds.every((f) => f === row.fold), `${vp}: ${name}: both columns sit in the same <details> or both outside one (folds ${row.folds.join(', ')})`);
        if (!row.closed) continue;
        if (vp === 'D') assert.ok(!row.cases.includes(c), `${vp}: ${name}: the row holding ${e.id} is open at rest`);
        const hit = namesAllegation(row.summary, row.cases);
        assert.equal(hit, null, `${vp}: ${name}: the folded row's summary "${row.summary}" names no allegation`);
        toOpen.push(row.fold);
      }
      // Last first: opening a fold can render <details> inside it, which shifts the index of every later one, never an earlier one.
      for (const f of uniq(toOpen).sort((a, b) => b - a)) await openFold(page, f);
      for (const cid of CASES) {
        const recs = CASE_FILE(cid).map((x) => ({ id: x.id, lab: squash(x.lab), resp: responsesTo(x.id).map((k) => squash(k.lab)).filter(Boolean) })).filter((x) => x.lab && x.resp.length);
        if (!recs.length) continue;
        const got = await recordFolds(page, cid, recs);
        assert.ok(got, `${vp}: the case column for ${cid}`);
        for (const g of got.filter((x) => x.rendered)) {
          assert.ok(g.slots.length >= 1, `${vp}: ${cid} ${g.id}: a [data-response="true"] in its column carries its response`);
          for (const sl of g.slots) assert.equal(sl.fold, g.rec.fold, `${vp}: ${cid} ${g.id}: the record and its response sit in the same <details> or both outside one`);
          if (vp === 'M') {
            const full = [...g.slots].sort((a, b) => b.len - a.len)[0];
            assert.ok(Math.abs(full.width - g.rec.width) <= 2, `${vp}: ${cid} ${g.id}: opened, the record (${g.rec.width}) and its response (${full.width}) at the same width ± 2 px`);
            assert.equal(full.fontSize, g.rec.fontSize, `${vp}: ${cid} ${g.id}: at the same font-size`);
          }
        }
      }
      const sel = await page.evaluate((cid) => {
        const el = document.querySelector(`[data-case="${cid}"]`);
        if (!el) return null;
        el.setAttribute('data-ac65', '1');
        return '[data-ac65]';
      }, c);
      assert.ok(sel, `${vp}: the case column for ${c}`);
      const r = await recordAndResponse(page, sel, e.lab, contra.lab);
      assert.ok(r?.rec && r.resp, `${vp}: the record and its response render`);
      assert.equal(r.resp.v, 'true', `${vp}: data-response="true"`);
      // Two closed <details> make both widths 0 and pass the ± 2 px check vacuously: measured with the row open
      // (at rest at D; at M after its fold, if any, was opened above).
      assert.ok(!r.rec.folded && !r.resp.folded, `${vp}: neither the record nor its response sits in a closed <details>`);
      assert.ok(r.rec.width > 0 && r.resp.width > 0, `${vp}: the record and its response are rendered${vp === 'D' ? ' at rest' : ', their row open'} (widths ${r.rec.width}, ${r.resp.width})`);
      assert.ok(r.resp.text.startsWith(head), `${vp}: the response begins "${head}" (reads "${r.resp.text.slice(0, 120)}")`);
      assert.ok(r.resp.text.includes(contra.lab) && r.resp.text.includes((contra.d ?? '').replace(/\s+/g, ' ').trim()), `${vp}: lab and d in full`);
      assert.equal(r.resp.fontSize, r.rec.fontSize, `${vp}: equal font-size`);
      if (vp === 'D') {
        assert.ok(r.resp.width >= 0.9 * r.rec.width, `${vp}: width ${r.resp.width} ≥ 0.9 × ${r.rec.width}`);
        assert.equal(r.resp.fontWeight, r.rec.fontWeight, `${vp}: equal font-weight`);
        const rose = await page.evaluate((s) => {
          const roseC = window.__ac.token('--color-rose');
          const row = document.querySelector(s).closest('[data-pair]') ?? document.querySelector(s);
          const uses = (el) => { const cs = getComputedStyle(el); return [cs.borderLeftColor, cs.borderTopColor, cs.color, cs.backgroundColor, cs.stroke, cs.fill].includes(roseC); };
          const resp = [...row.querySelectorAll('[data-response="true"]')];
          return { respRose: resp.some((x) => uses(x) || [...x.querySelectorAll('*')].some(uses)), others: [...row.querySelectorAll('*')].filter((x) => uses(x) && !x.closest('[data-response="true"]')).length };
        }, sel);
        assert.ok(rose.respRose, `${vp}: the response's rule or tick is the rose token`);
        assert.equal(rose.others, 0, `${vp}: no other element in the pair row uses rose`);
      } else {
        assert.ok(Math.abs(r.resp.width - r.rec.width) <= 2, `${vp}: stacked at the same width ± 2 px`);
      }
    });
  }
  await withPage('D', async (page) => {
    await load(page, '/security?lens=procurement');
    assert.equal(await count(page, '[data-mark="response"]'), caseResponses, `[data-mark="response"] = ${caseResponses} contras on case-file records`);
  });
});

test('AC-66 — Re-admit a response whenever its claim is shown, whatever the response\'s tier', async (t) => {
  if (!requireFull(t)) return;
  const e = CASE_FILE_ENFORCE.find((x) => responsesTo(x.id).some((r) => r.tier !== x.tier)) ?? ALLEGED.find((x) => responsesTo(x.id).some((r) => r.tier !== x.tier)) ?? null;
  if (!need(t, e, 'no response whose tier differs from its claim')) return;
  const contra = responsesTo(e.id).find((r) => r.tier !== e.tier);
  const drawn = (tiers) => EDGES.filter((x) => resolves(x.s) && (String(x.t).startsWith('claim:') ? true : resolves(x.t)))
    .filter((x) => tiers.includes(x.tier) || (x.pred === 'contra' && tiers.includes(edgeById.get(String(x.t).replace(/^claim:/, ''))?.tier))).length;
  await withPage('D', async (page) => {
    await load(page, `/security?lens=procurement&tier=${e.tier}`, { graph: true });
    const body = (await bodyText(page)).replace(/\s+/g, ' ');
    assert.ok(body.includes(e.lab), `tier=${e.tier}: the record is visible`);
    assert.ok(body.includes((contra.d ?? contra.lab).replace(/\s+/g, ' ').slice(0, 80)), `tier=${e.tier}: its ${contra.tier} response is re-admitted`);
    if (e.tier === 'alleged') assert.ok((await text(page.locator('#contested'))).includes(contra.lab), '#contested includes the response');
    const g = ungroup(await text(page.locator('#connections'))).match(/(\d+) edges/);
    assert.ok(g, 'the graph status line prints its drawn edge count');
    assert.equal(int(g[1]), drawn([e.tier]), `the graph draws the claim's tier plus its re-admitted responses (${drawn([e.tier])})`);
    if (contra.tier !== e.tier) {
      await load(page, `/security?lens=procurement&tier=${contra.tier}`);
      const b2 = (await bodyText(page)).replace(/\s+/g, ' ');
      assert.ok(!b2.includes(e.lab), `tier=${contra.tier}: the record is not rendered`);
      assert.ok(!b2.includes((contra.d ?? contra.lab).replace(/\s+/g, ' ').slice(0, 80)), `tier=${contra.tier}: neither is its orphaned response`);
    }
  });
});

test('AC-67 — List every alleged claim in Contested with its response slot and the denominator sentence', async (t) => {
  if (!requireFull(t)) return;
  await withPage('D', async (page) => {
    await load(page, '/security?lens=procurement');
    const r = await page.evaluate((labs) => {
      const c = document.querySelector('#contested');
      if (!c) return null;
      const items = [...c.querySelectorAll('li, article')].filter((x) => x.querySelector('[data-response]') && !x.parentElement.closest('li, article')?.querySelector('[data-response]') || false);
      return {
        text: window.__ac.txt(c),
        slots: [...c.querySelectorAll('[data-response]')].map((x) => x.getAttribute('data-response')),
        sizes: labs.map((l) => {
          const recEl = window.__ac.deepestAll(c, l.slice(0, 50).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))[0];
          const item = recEl?.closest('li, article');
          const resp = item?.querySelector('[data-response]');
          return { lab: l, rec: recEl ? getComputedStyle(recEl).fontSize : null, resp: resp ? getComputedStyle(resp).fontSize : null, item: item ? window.__ac.txt(item) : null };
        }),
        items: items.length,
      };
    }, ALLEGED.map((e) => e.lab));
    assert.ok(r, '#contested exists');
    for (const s of r.sizes) {
      assert.ok(s.item, `#contested lists "${s.lab.slice(0, 60)}"`);
      assert.equal(s.resp, s.rec, `"${s.lab.slice(0, 40)}": claim and response at equal font-size`);
      assert.ok(!/\b(verdict|guilty|proven)\b/i.test(s.item), `"${s.lab.slice(0, 40)}": no verdict, guilty or proven`);
    }
    assert.equal(r.slots.length, ALLEGED.length, `${ALLEGED.length} response slots`);
    assert.equal(r.slots.filter((v) => v === 'true').length, ANSWERED.length, `${ANSWERED.length} answered`);
    const k = ALLEGED.length - ANSWERED.length;
    assert.ok(ungroup(r.text).includes(`${ALLEGED.length} alleged claims · ${ANSWERED.length} with a recorded response · ${k} without — whether a response was sought is not recorded`), 'the denominator sentence');
  });
});

test('AC-68 — Keep alleged awards off the award graphic and inside the allegation field and Contested', async (t) => {
  if (!requireFull(t)) return;
  if (!need(t, ALLEGED_AWARDS, 'no alleged award')) return;
  await withPage('D', async (page) => {
    await load(page, '/security?lens=procurement');
    await openTwin(page, 'awards');
    const twinText = await text(twin(page, 'awards'));
    const contested = await text(page.locator('#contested'));
    for (const e of ALLEGED_AWARDS) {
      assert.ok(!twinText.includes(e.lab), `${e.id}: no award-twin row`);
      assert.ok(contested.includes(e.lab), `${e.id}: listed in #contested`);
      const c = CASES.find((k) => EDGES.some((x) => ['direct', 'award', 'sector'].includes(x.pred) && ((x.s === k && (x.t === e.t || x.t === e.s)) || (x.t === k && (x.s === e.t || x.s === e.s)))));
      if (c) {
        const col = await caseColumn(page, c);
        assert.ok(col?.text.includes(e.lab), `${e.id}: in the ${c} column's Allegation field`);
        assert.ok(col.dts.includes('Allegation'), `${c}: an Allegation field`);
      }
      if (!VENDOR_SET.has(e.t)) continue;
      const card = await page.evaluate((id) => {
        const el = [...document.querySelectorAll('[data-vendor-card]')].find((c) => c.getAttribute('data-vendor-card') === id) ?? null;
        if (!el) return null;
        const f = (n) => window.__ac.txt(el.querySelector(`[data-field="${n}"]`)?.nextElementSibling ?? el.querySelector(`dd[data-field="${n}"]`));
        const named = [...el.querySelectorAll('dt')].find((d) => /^Named awards/.test(window.__ac.txt(d)));
        return { f4: f('4'), f9: f('9'), named: named ? window.__ac.txt(named.nextElementSibling) : null };
      }, e.t);
      if (!card) continue;
      assert.ok(/alleged/.test(`${card.f4} ${card.f9}`), `${e.t}: field 4 or 9 lists the allegation with the word "alleged"`);
      if (card.named) assert.equal(int(card.named), AWARDS.filter((x) => x.t === e.t).length, `${e.t}: Named awards counts no alleged award`);
    }
  });
});

const contractCards = (page) => page.evaluate(() => {
  const b = window.__ac.q('B5');
  if (!b) return [];
  const heads = window.__ac.deepestAll(b, '^The terms and the stated case$');
  return heads.map((h) => {
    let card = h.parentElement;
    while (card && card !== b && !window.__ac.deepest(card, '^The stated objections and the answers$')) card = card.parentElement;
    const dls = [...card.querySelectorAll('dl')].slice(0, 2);
    return {
      text: window.__ac.txt(card),
      dts: dls.map((d) => [...d.querySelectorAll('dt')].map((x) => window.__ac.txt(x))),
      widths: dls.map((d) => d.getBoundingClientRect().width),
      cols: dls.map((d) => window.__ac.txt(d)),
      amber: [...card.querySelectorAll('*')].filter((x) => window.__ac.txt(x) === 'no stated saving recorded').map((x) => getComputedStyle(x).color),
      links: [...card.querySelectorAll('a[href^="#"]')].map((a) => ({ href: a.getAttribute('href'), text: window.__ac.txt(a) })),
    };
  });
});
const leftResponder = (id) => { const n = nodeOf(id); return n?.ty === 'ministry' || (n?.fam === 'state' && ['agency', 'psu', 'mechanism', 'state'].includes(n?.ty)); };

test('AC-69 — Give every contract card two equal columns, identical fields, the column rule in its foot', async (t) => {
  if (!requireFull(t)) return;
  if (!need(t, CONTRACTS, 'no pay-pensions contract record')) return;
  await withPage('D', async (page) => {
    await load(page, '/security');
    const cards = await contractCards(page);
    assert.equal(cards.length, CONTRACTS.length, `${CONTRACTS.length} contract cards`);
    CONTRACTS.forEach((k, i) => assert.ok(cards[i]?.text.includes(k.lab), `card ${i + 1} is ${k.id} (from order)`));
    const amber = await amberColour(page);
    for (const [i, c] of cards.entries()) {
      const k = CONTRACTS[i];
      assert.equal(c.dts.length, 2, `${k.id}: two <dl> columns`);
      assert.deepEqual(c.dts[0], c.dts[1], `${k.id}: identical dt sequences`);
      assert.ok(Math.abs(c.widths[0] - c.widths[1]) <= 1, `${k.id}: equal widths ± 1 px`);
      assert.ok(c.text.includes("by the responder's kind: ministries and state agencies left; parties, veterans' bodies and petitioners right"), `${k.id}: the column rule in its foot`);
      const chain = []; const walk = (id, depth) => { if (depth > 3) return; for (const r of responsesTo(id)) { chain.push(r); walk(r.id, depth + 1); } };
      walk(k.id, 1);
      for (const r of chain) {
        const side = leftResponder(r.s) ? 0 : 1;
        assert.ok(c.cols[side].includes(r.lab), `${k.id}: response ${r.id} (${nodeOf(r.s)?.ty}/${nodeOf(r.s)?.fam}) sits in the ${side ? 'right' : 'left'} column`);
      }
      const b = BENEFIT.get(k.id);
      if (b && finite(b.amountCr)) assert.ok(c.text.includes(`₹${enIN(b.amountCr)} cr (${b.confidence})`) || ungroup(c.text).includes(`₹${b.amountCr} cr (${b.confidence})`), `${k.id}: the stated saving`);
      else {
        assert.ok(c.text.includes('no stated saving recorded'), `${k.id}: "no stated saving recorded"`);
        assert.ok(c.amber.length && c.amber.every((x) => x === amber), `${k.id}: in amber`);
      }
      if (/agnipath/i.test(`${k.s} ${k.lab}`)) {
        assert.ok(c.text.includes('does not join the Agnipath terms to the terms they replaced'), 'the Agnipath card says it does not join old and new terms');
        assert.ok(c.links.length >= 1, 'with an in-page link to the pay table');
      }
    }
    assert.equal(await openTwinRows(page, 'pay'), LAWS.length - CONTRACTS.length, `TWIN(pay) rows = ${LAWS.length} − ${CONTRACTS.length}`);
  });
});

test('AC-70 — Nest a reply under the response it answers and name that responder', async (t) => {
  if (!requireFull(t)) return;
  if (!need(t, REPLY, 'no reply to a response')) return;
  const chainUp = []; let cur = REPLY;
  while (cur && cur.pred === 'contra') { chainUp.push(cur); cur = edgeById.get(String(cur.t).replace(/^claim:/, '')); }
  const root = cur;
  const parent = edgeById.get(String(REPLY.t).replace(/^claim:/, ''));
  const depth = chainUp.length - 1;
  await withPage('D', async (page) => {
    await load(page, `/security?lens=procurement&rec=${encodeURIComponent(root.id)}`);
    const r = await page.evaluate(([replyText, parentText]) => {
      const lis = [...document.querySelectorAll('li[data-reply-depth]')];
      const li = lis.find((x) => window.__ac.txt(x).includes(replyText) && ![...x.querySelectorAll('li')].some((y) => window.__ac.txt(y).includes(replyText)));
      if (!li) return null;
      const up = li.parentElement.closest('li');
      return { depth: li.getAttribute('data-reply-depth'), text: window.__ac.txt(li), parentHas: up ? window.__ac.txt(up).includes(parentText) : false, size: getComputedStyle(li).fontSize, parentSize: up ? getComputedStyle(up).fontSize : null };
    }, [(REPLY.d ?? REPLY.lab).replace(/\s+/g, ' ').slice(0, 60), (parent.d ?? parent.lab).replace(/\s+/g, ' ').slice(0, 60)]);
    assert.ok(r, `the reply ${REPLY.id} renders as an <li data-reply-depth>`);
    assert.ok(r.parentHas, 'it is nested in the <li> of the response it answers');
    assert.equal(int(r.depth), depth, `data-reply-depth = ${depth}`);
    assert.ok(r.text.startsWith(`in reply to ${labelOf(parent.s)}, ${REPLY.from ?? 'undated'}:`), `it begins "in reply to ${labelOf(parent.s)}, …:" (reads "${r.text.slice(0, 100)}")`);
    assert.equal(r.size, r.parentSize, "its font-size equals its parent's");
  });
});

test('AC-71 — Name an audit-added response as the audit, and count it as a response', async (t) => {
  if (!requireFull(t)) return;
  if (!need(t, AUDIT_CONTRA, 'no audit-added response')) return;
  const claim = edgeById.get(String(AUDIT_CONTRA.t).replace(/^claim:/, ''));
  await withPage('D', async (page) => {
    await load(page, `/security?lens=procurement&rec=${encodeURIComponent(claim.id)}`);
    const r = await page.evaluate((txt) => {
      const slot = [...document.querySelectorAll('[data-response]')].find((x) => window.__ac.txt(x).includes(txt));
      return slot ? { v: slot.getAttribute('data-response'), text: window.__ac.txt(slot) } : null;
    }, (AUDIT_CONTRA.d ?? '').replace(/\s+/g, ' ').slice(0, 60));
    assert.ok(r, `the audit response to ${claim.id} renders in a response slot`);
    assert.equal(r.v, 'true', 'data-response="true"');
    assert.ok(r.text.includes(`the audit (recorded on ${labelOf(AUDIT_CONTRA.s)})`), `the responder reads "the audit (recorded on ${labelOf(AUDIT_CONTRA.s)})"`);
    const rec = ungroup(await reconText(page));
    const m = rec?.match(/\((\d+) added by the audit\)/);
    assert.ok(m, 'the Procurement ReconciliationLine names the audit-added responses');
    assert.equal(int(m[1]), AUDIT_CONTRAS.length, `(${AUDIT_CONTRAS.length} added by the audit)`);
  });
});

test('AC-72 — Print every analytic comparison\'s innocent reading in the same section at the same size', async (t) => {
  if (!requireFull(t)) return;
  const norm = (s) => (s ?? '').replace(/\s+/g, ' ').trim();
  let shown = 0;
  await withPage('D', async (page) => {
    for (const lens of LENSES) {
      await load(page, LENS_ROUTE[lens]);
      const res = await page.evaluate((items) => items.map(([id, lab, ir]) => {
        const main = document.querySelector('main');
        const hits = [...main.querySelectorAll('*')].filter((e) => !e.closest('details:not([open])') && !e.closest('#connections') && window.__ac.txt(e).includes(lab) && ![...e.children].some((c) => window.__ac.txt(c).includes(lab)));
        return hits.map((h) => {
          const box = h.closest('section, dl, article, li, [data-vendor-card], [data-pair]');
          const irEl = box ? [...box.querySelectorAll('*')].filter((e) => window.__ac.txt(e).includes(ir) && ![...e.children].some((c) => window.__ac.txt(c).includes(ir)))[0] : null;
          return { id, found: !!irEl, a: getComputedStyle(h).fontSize, b: irEl ? getComputedStyle(irEl).fontSize : null };
        });
      }), ANALYTIC.filter((e) => e.lab && e.innocentReading).map((e) => [e.id, norm(e.lab).slice(0, 70), norm(e.innocentReading).slice(0, 70)]));
      for (const hits of res) for (const h of hits) {
        shown++;
        assert.ok(h.found, `${lens} ${h.id}: its innocent reading sits in the same section or card`);
        assert.equal(h.b, h.a, `${lens} ${h.id}: at equal font-size`);
      }
    }
  });
  assert.ok(shown > 0, 'ANALYTIC_SHOWN is not empty: analytic comparisons are printed somewhere on the page');
});

test('AC-73 — Put the two anchor cases in one pair row first, equal columns, and give an unpaired case the pairing sentence', async (t) => {
  if (!requireFull(t)) return;
  if (!need(t, CASE_PAIRS, 'no case pair')) return;
  const anchor = ['force:case-bofors', 'force:case-rafale'];
  const firstIsAnchor = FIRST_PAIR && [FIRST_PAIR.a, FIRST_PAIR.b].sort().join() === [...anchor].sort().join();
  if (!firstIsAnchor) t.diagnostic(`AC-73: the date rule puts ${FIRST_PAIR?.a} | ${FIRST_PAIR?.b} first, not the CASE_PAIR anchor — the two rules disagree`);
  const pairEdges = CASE_PAIRS.find((p) => [p.a, p.b].sort().join() === [...anchor].sort().join())?.edges ?? [];
  const [early, late] = [...anchor].sort((a, b) => cmp(FIRST_RECORD(a), FIRST_RECORD(b)));
  const readPairs = (page) => page.evaluate(() => [...document.querySelectorAll('[data-pair]')].map((p) => {
    const cols = [...p.querySelectorAll('[data-case]')];
    return {
      cases: cols.map((c) => c.getAttribute('data-case')), h4: window.__ac.txt(p.querySelector('h4')), text: window.__ac.txt(p),
      dts: cols.map((c) => [...c.querySelectorAll('dt')].map((d) => window.__ac.txt(d))),
      widths: cols.map((c) => c.getBoundingClientRect().width), sizes: cols.map((c) => getComputedStyle(c).fontSize),
      adjacent: cols.length === 2 && cols[0].nextElementSibling === cols[1],
      pairing: cols[1] ? { text: window.__ac.txt(cols[1]), color: getComputedStyle(window.__ac.deepest(cols[1], '^No control pairing recorded for this case in the register\\.$') ?? cols[1]).color } : null,
    };
  }));
  await withPage('FOLD', async (page) => {
    await load(page, '/security?lens=procurement');
    const pairs = await readPairs(page);
    assert.equal(pairs.length, CASE_PAIRS.length + UNPAIRED.length, `[data-pair] = ${CASE_PAIRS.length} + ${UNPAIRED.length}`);
    const p0 = pairs[0];
    assert.deepEqual([...p0.cases].sort(), [...anchor].sort(), 'the first pair row holds Bofors and Rafale');
    assert.equal(p0.cases[0], early, `the left column is ${early}, the earlier first record`);
    assert.equal(p0.h4, `${labelOf(early)} beside ${labelOf(late)}`, 'the pair h4');
    assert.equal(partyHit(p0.h4), null, 'the h4 carries no party word');
    assert.deepEqual(p0.dts[0], p0.dts[1], 'identical dt sequences');
    assert.ok(Math.abs(p0.widths[0] - p0.widths[1]) <= 1, 'equal widths ± 1 px at FOLD');
    assert.equal(p0.sizes[0], p0.sizes[1], 'equal font-size at FOLD');
    for (const e of pairEdges) for (const s of [e.lab, e.d, e.innocentReading].filter(Boolean)) assert.ok(p0.text.includes(s.replace(/\s+/g, ' ').trim().slice(0, 80)), `the pair row carries ${e.id}'s text "${s.slice(0, 50)}"`);
    for (const e of pairEdges) assert.ok(p0.text.includes(`wording: ${e.id.split(':')[0]}`), `${e.id} under "wording: {file}"`);
    for (const c of [early, late]) for (const e of CASE_FILE(c).filter((x) => x.pred === 'enforce' || x.tier === 'alleged')) {
      const col = await caseColumn(page, c);
      if (col.text.includes(e.lab)) assert.ok(col.responses.length >= 1, `${c}: ${e.id} has a [data-response]`);
    }
    const amber = await amberColour(page);
    for (const u of UNPAIRED) {
      const row = pairs.find((p) => p.cases.includes(u));
      assert.ok(row, `the unpaired case ${u} has a row`);
      assert.equal(row.cases[1], 'none', `${u}: the pairing <dl> carries data-case="none"`);
      assert.equal(row.pairing?.text, NO_PAIRING, `${u}: the right <dl> reads exactly "${NO_PAIRING}"`);
      assert.equal(row.pairing.color, amber, `${u}: in amber`);
      assert.ok(Math.abs(row.widths[0] - row.widths[1]) <= 1 && row.sizes[0] === row.sizes[1], `${u}: at the left's width and font-size`);
    }
  });
  await withPage('M', async (page) => {
    await load(page, '/security?lens=procurement');
    const pairs = await readPairs(page);
    assert.ok(pairs[0]?.adjacent, 'at M the two <dl>s are consecutive siblings');
  });
});

// ---------------------------------------------------------------------------
// §6 URL round-trip of every filter — FULL build
// ---------------------------------------------------------------------------

const FORBIDDEN_PARAMS = ['party', 'vendor-class', 'era'];
const GRAPH_PARAMS = ['q', 'fam', 'pred', 'ty', 'amt', 'path'];
const assertNoForbidden = (page, where) => {
  const p = hashParams(page);
  for (const k of FORBIDDEN_PARAMS) assert.ok(!p.has(k), `${where}: the URL carries no ${k} (D46)`);
};
const componentBoxes = (page) => page.evaluate(() => [...document.querySelectorAll('input[type="checkbox"]')]
  .map((c) => ({ name: window.__ac.name(c), checked: c.checked, value: c.value }))
  .filter((c) => /^(total|revenue|capital|grants?|pay|pension|other)\b/i.test(c.name)));
const anyPanelOpen = (page) => page.evaluate(() => !!window.__ac.card(() => true));
const tableViewToggle = (page) => page.locator('button[aria-pressed]').filter({ hasText: /^\s*Table view\s*$/ }).first();

test('AC-74 — Default to Budgets, unfiltered, nothing selected, nothing in the URL', async (t) => {
  if (!requireFull(t)) return;
  await withPage('D', async (page) => {
    await load(page, '/security');
    assert.equal(new URL(page.url()).hash, '#/security', 'the hash is exactly #/security');
    assert.equal(await tab(page, 'budgets').getAttribute('aria-selected'), 'true', 'Budgets is selected');
    assert.equal(await payerButton(page, 'All').getAttribute('aria-pressed'), 'true', 'Payer All');
    const stateVal = await stateSelect(page).evaluate((s) => s.options[s.selectedIndex]?.textContent ?? '');
    assert.ok(/^All/.test(stateVal.trim()), `State: all (reads "${stateVal}")`);
    const fys = await fySelects(page).evaluateAll((els) => els.map((s) => s.options[s.selectedIndex]?.textContent.trim()));
    assert.deepEqual(fys.slice(0, 2), ['All years', 'All years'], 'FY from/to: All years');
    assert.equal(await stageOption(page, DEFAULT_STAGE).getAttribute('aria-pressed'), 'true', `Stage ${DEFAULT_STAGE}`);
    const comps = await componentBoxes(page);
    assert.equal(comps.length, 7, 'seven Component boxes');
    assert.ok(comps.every((c) => c.checked), 'every Component box checked');
    for (const tier of TIER_WORDS) assert.equal(await tierToggle(page, tier).getAttribute('aria-pressed'), 'true', `Tier ${tier} pressed`);
    assert.equal(await findInput(page).inputValue(), '', 'Find is empty');
    const dp = DEFAULT_PAIR(S3 ? 'percap' : 'gsdp');
    const sel = await pairSelect(page).evaluate((s) => s.options[s.selectedIndex]?.textContent ?? '');
    assert.ok(sel.includes(dp.fy) && sel.includes(dp.stage), `the spend map pair is ${dp.key} (reads "${sel}")`);
    const mPressed = await page.locator('[data-q="B6"] [aria-pressed="true"], [data-q="B6"] input[type="radio"]:checked').evaluateAll((els) => els.map((e) => window.__ac.name(e)));
    assert.ok(mPressed.some((n) => (S3 ? /person/i : /GSDP/).test(n)), `m = ${S3 ? 'percap' : 'gsdp'}`);
    assert.ok(mPressed.some((n) => n.startsWith(`${DEFAULT_SY} · `)), `sy = ${DEFAULT_SY}`);
    assert.equal(await page.locator('details[data-twin][open]').count(), 0, 'every twin closed');
    assert.ok(!(await anyPanelOpen(page)), 'no CellCard, StatePanel, BodyCard, VendorCard or RecordCard');
    assert.equal(await activeFilterText(page), null, 'no active-filter line');
    const names = await page.evaluate(() => [...document.querySelectorAll('[name]')].map((e) => e.getAttribute('name')));
    for (const k of FORBIDDEN_PARAMS) assert.ok(!names.includes(k), `no control is named ${k}`);
    // A sample of the page's own writes across §6's controls carries none of them.
    await stageOption(page, STAGES.find((s) => s !== DEFAULT_STAGE)).click(); await page.waitForTimeout(200); assertNoForbidden(page, 'stage');
    await tierToggle(page, 'alleged').click(); await page.waitForTimeout(200); assertNoForbidden(page, 'tier');
    if (STATE_SAMPLE) { await stateSelect(page).selectOption(STATE_SAMPLE); await page.waitForTimeout(200); assertNoForbidden(page, 'st'); }
    await tab(page, 'procurement').click(); await page.waitForTimeout(200); assertNoForbidden(page, 'lens');
  });
});

/** §0.7 step (4) words for `fy` (AC-78): `FY {a}–{b}` for a range, else `FY {fy}` not followed by a range dash. */
const fyWords = (v) => {
  const [a, b] = String(v).split('..');
  return b ? new RegExp(`FY ${esc(a)}\\s*[–-]\\s*(FY )?${esc(b)}`) : new RegExp(`FY ${esc(v)}(?![–\\d])`);
};
/** A control's label as the page prints it, cut before any count, reason or separator (AC-80, AC-83). */
const labelHead = (n) => (n ?? '').replace(/\s*[(\d·:,—].*$/, '').trim();
/** §0.7 step (4) words for `comp` (AC-80): each component's Component-checkbox label, under `components:`. */
const compWords = async (v, page) => {
  const names = await page.evaluate(() => [...document.querySelectorAll('input[type="checkbox"], [role="checkbox"]')].map((c) => window.__ac.name(c)));
  return String(v).split(',').map((k) => {
    const lab = labelHead(names.find((n) => new RegExp(`^${esc(k)}\\b`, 'i').test(n)));
    assert.ok(lab, `comp=${k}: a Component checkbox is named for it`);
    return new RegExp(`components:[^·]*\\b${esc(lab)}\\b`, 'i');
  });
};
/** §0.7 step (4) words for `kind` (AC-83): each kind's chip accessible name. */
const kindWords = async (v, page) => {
  const chips = await kindChips(page);
  return String(v).split(',').map((k) => {
    const lab = labelHead(chips.find((c) => c.kind === k && c.found)?.name);
    assert.ok(lab, `kind=${k}: a chip is named for it`);
    return new RegExp(esc(lab), 'i');
  });
};

test('AC-75 — Round-trip `lens`, keeping the shared params and dropping `rec` and `cell`', async (t) => {
  if (!requireFull(t)) return;
  await withPage('D', async (page) => {
    await roundTrip(page, {
      param: 'lens', value: 'footprint', filter: false,
      change: async (p) => { await tab(p, 'procurement').click(); return 'procurement'; },
      reset: async (p) => { await tab(p, 'budgets').click(); },
    });
    const cell = await cellParam(page);
    const sel = CAPF_SAMPLE;
    const recId = ENFORCE_WITH_CONTRA?.id ?? EDGES[0].id;
    const q = `fy=2014-15..2024-25&st=${STATE_SAMPLE}&stage=actual&tier=documented,reported&find=police&sel=${encodeURIComponent(sel)}&view=table&cell=${encodeURIComponent(cell)}&rec=${encodeURIComponent(recId)}`;
    await load(page, `/security?${q}`);
    await tab(page, 'footprint').click();
    await waitParam(page, 'lens', 'footprint');
    const p = hashParams(page);
    for (const k of ['fy', 'st', 'stage', 'tier', 'find', 'sel', 'view']) assert.ok(p.has(k), `the URL keeps ${k}`);
    for (const k of ['rec', 'cell']) assert.ok(!p.has(k), `the URL drops ${k}`);
    assert.equal(await page.locator('details[data-twin]:not([open])').count(), 0, 'view=table: the new lens\'s twins are open');
    for (const ctl of [payerButton(page, 'Union'), stageOption(page, 'actual')]) {
      const e = await effectNear(ctl);
      assert.ok(/does not apply|not budget rows/.test(e?.text ?? ''), `an inactive control reads its reason (reads "${e?.text}")`);
    }
    const compReason = await page.evaluate(() => { const c = [...document.querySelectorAll('input[type="checkbox"]')].find((x) => /^pay\b/i.test(window.__ac.name(x))); let a = c?.parentElement; while (a && !a.querySelector('[data-effect]')) a = a.parentElement; return a ? window.__ac.txt(a.querySelector('[data-effect]')) : null; });
    assert.ok(/does not apply|not budget rows/.test(compReason ?? ''), `Component reads its inactive reason (reads "${compReason}")`);
  });
});

test('AC-76 — Round-trip `payer`, and say where it does not reach', async (t) => {
  if (!requireFull(t)) return;
  await withPage('D', async (page) => {
    await load(page, '/security');
    const restBands = (await stackColumns(page)).map((c) => c.bands.map((b) => `${b.band}:${b.cr}`).join(','));
    await roundTrip(page, {
      param: 'payer', value: 'states',
      check: async (p) => {
        await openTwin(p, 'ledger-long');
        const tbl = await twinTable(p, 'ledger-long');
        const i = window_col(tbl, 'Payer');
        assert.ok(i >= 0 || tbl.rows.length === 0, 'the ledger twin has a Payer column');
        for (const r of tbl.rows) assert.notEqual(r[i]?.toLowerCase(), 'union', 'payer=states: no Union row');
        assert.deepEqual((await stackColumns(p)).map((c) => c.bands.map((b) => `${b.band}:${b.cr}`).join(',')), restBands, 'the stack is unchanged');
        assert.ok((await text(p.locator('[data-q="B1"] figure').first())).includes('not affected'), 'the stack figure reads "not affected"');
        assert.equal(await openTwinRows(p, 'state-table'), 36, 'TWIN(state-table) stays 36');
      },
      change: async (p) => { await payerButton(p, 'Union').click(); return 'union'; },
      reset: async (p) => { await payerButton(p, 'All').click(); },
      words: (v) => ({ union: /\bUnion\b/, states: /\bStates?\b/ })[v],
    });
    await load(page, '/security?payer=union');
    await openTwin(page, 'state-table');
    const cells = await page.evaluate(() => [...document.querySelectorAll('details[data-twin="state-table"] td')].map((c) => window.__ac.txt(c)));
    assert.ok(cells.some((c) => /\d+ rows? hidden by the payer filter — not absent/.test(c)), 'payer=union: the MH 2055 cells read "{k} rows hidden by the payer filter — not absent"');
    for (const lens of ['footprint', 'procurement']) {
      await load(page, route(lens, 'payer=states'));
      const e = await effectNear(payerButton(page, 'Union'));
      assert.ok((e?.text ?? '').includes('installations and contracts are not budget rows') || (await bodyText(page)).includes('installations and contracts are not budget rows'), `${lens}: the control reads "installations and contracts are not budget rows"`);
      assert.equal(hashParams(page).get('payer'), 'states', `${lens}: the param is kept`);
    }
  });
});

test('AC-77 — Round-trip `st`, opening the panel and accenting both maps', async (t) => {
  if (!requireFull(t)) return;
  if (!need(t, STATE_SAMPLE_2, 'fewer than two units with a Police-head row')) return;
  const st = STATE_SAMPLE;
  const rows = STATE_SERIES.filter((r) => r.payer === st);
  await withPage('D', async (page) => {
    await roundTrip(page, {
      param: 'st', value: st,
      words: (v) => new RegExp(esc(STATE_NAME.get(v))), rawCode: (v) => esc(v),
      check: async (p) => {
        const sel = await p.evaluate(() => [...(window.__ac.q('B6')?.querySelectorAll('svg[role="listbox"]') ?? [])].map((m) => [...m.querySelectorAll('[role="option"][aria-selected="true"]')].map((o) => window.__ac.name(o))));
        assert.equal(sel.length, 2, 'two maps');
        for (const s of sel) assert.ok(s.length === 1 && s[0].startsWith(STATE_NAME.get(st)), `the ${st} option is aria-selected on each map`);
        const pan = await p.evaluate((name) => { const el = window.__ac.card((t) => t === name); return el ? { text: window.__ac.txt(el), crs: [...el.querySelectorAll('[data-cr]')].map((e) => Number(e.getAttribute('data-cr'))) } : null; }, STATE_NAME.get(st));
        assert.ok(pan, `the StatePanel h2 reads ${STATE_NAME.get(st)}`);
        for (const r of rows) assert.ok(pan.crs.some((v) => Math.abs(v - r.cr) <= 0.005), `the panel lists ${r.fy} ${r.stage}`);
        if (STATE_ROWS.some((r) => r.payer === st && r.head !== STATE_SERIES_HEAD)) assert.ok(pan.text.includes('other heads, not comparable across states'), 'other heads are grouped');
        for (const e of ANALYTIC.filter((x) => DOMAIN[x.id] === 'state-police' && nodeOf(x.s)?.st === st)) {
          assert.ok(pan.text.includes(e.lab), `the panel quotes ${e.id}`);
          if (e.innocentReading) assert.ok(pan.text.includes(e.innocentReading.replace(/\s+/g, ' ').slice(0, 60)), `${e.id}: with its innocent reading`);
        }
        for (const c of COMMISSIONERATES.filter((x) => x.st === st)) assert.ok(pan.text.includes(CITY_TEXT(STATE_NAME.get(st))), `${c.city}: the fixed sentence`);
      },
      change: async (p) => { await stateSelect(p).selectOption(STATE_SAMPLE_2); return STATE_SAMPLE_2; },
      reset: async (p) => {
        const opt = p.locator(`[data-q="B6"] svg[role="listbox"] [role="option"][aria-selected="true"]`).first();
        await opt.click();
      },
    });
    await load(page, '/security?st=dl');
    const dl = await page.evaluate((name) => { const el = window.__ac.card((t) => t === name); return el ? window.__ac.txt(el) : null; }, STATE_NAME.get('dl'));
    assert.ok(dl?.includes("Delhi's police is a Union demand line — see Q7"), 'st=dl: the panel\'s first line');
    const cur = (await ledgerLanes(page)).filter((l) => resolveLane(l.attr, l.label)?.startsWith(`${DELHI_POLICE}|`));
    assert.ok(cur.length && cur.every((l) => l.current === 'true'), 'st=dl: the Delhi Police lanes carry aria-current');
    const jk = STATE_SERIES.find((r) => r.payer === 'jk' && /Demand 51/.test(r.note ?? ''));
    if (jk) {
      await load(page, '/security?st=jk');
      assert.ok((await panel(page, `^${esc(STATE_NAME.get('jk'))}$`))?.text.includes(jk.note), 'st=jk: the panel quotes the RBI note on Demand 51');
    }
    const fpSt = FOOTPRINT[0]?.st;
    if (fpSt) {
      await load(page, `/security?lens=footprint&st=${fpSt}`);
      await openTwin(page, 'places');
      const tbl = await twinTable(page, 'places');
      const i = window_col(tbl, 'State');
      assert.ok(tbl.rows.length > 0 && tbl.rows.every((r) => r[i] === STATE_NAME.get(fpSt)), `Footprint: TWIN(places) rows all name ${STATE_NAME.get(fpSt)}`);
    }
    await load(page, `/security?lens=procurement&st=${st}`);
    assert.ok((await effectNear(stateSelect(page)))?.text.includes("a vendor's registered office is not where its work is"), 'Procurement: the State control gives its reason');
  });
});

test('AC-78 — Round-trip `fy` as a year or a range, dimming and never cropping', async (t) => {
  if (!requireFull(t)) return;
  const one = FY_AXIS[5];
  const [a, b] = [FY_AXIS[3], FY_AXIS[10]];
  await withPage('FOLD', async (page) => {
    await load(page, '/security');
    const axisRest = (await axisButtons(page)).map((x) => x.name.slice(0, 7));
    await roundTrip(page, {
      param: 'fy', value: one, words: fyWords, rawCode: (v) => esc(v),
      check: async (p) => {
        const cols = await stackColumns(p);
        assert.equal(cols.length, FY_AXIS.length, 'the column count is unchanged');
        for (const c of cols) assert.ok(c.fy === one ? c.opacity === 1 : c.opacity <= 0.3, `FY${c.fy}: opacity ${c.opacity}`);
        assert.ok(await p.locator('[data-caption="C4b"]').count() === 1, 'C4b is present');
        const ax = (await axisButtons(p)).map((x) => x.name.slice(0, 7));
        assert.deepEqual([ax[0], ax.at(-1)], [axisRest[0], axisRest.at(-1)], 'the x-domain is unchanged');
      },
      change: async (p) => { await fySelects(p).nth(1).selectOption({ label: FY_AXIS[6] }); return `${one}..${FY_AXIS[6]}`; },
      reset: async (p) => { await fySelects(p).nth(0).selectOption({ label: 'All years' }); await fySelects(p).nth(1).selectOption({ label: 'All years' }); },
    });
    await roundTrip(page, {
      param: 'fy', value: `${a}..${b}`, words: fyWords, rawCode: (v) => esc(v),
      check: async (p) => {
        const sel = await fySelects(p).evaluateAll((els) => els.map((s) => s.options[s.selectedIndex]?.textContent.trim()));
        assert.deepEqual(sel.slice(0, 2), [a, b], 'From/To read the range');
        await openTwin(p, 'ledger-long');
        const tbl = await twinTable(p, 'ledger-long');
        const i = window_col(tbl, 'FY');
        for (const r of tbl.rows) assert.ok(r[i] >= a && r[i] <= b, `ledger-long FY ${r[i]} in range`);
        assert.ok((await bodyText(p)).includes('strength tables dated 1 January Y count in FY Y−1–Y'), 'the control states the strength-year rule');
      },
    });
    await load(page, `/security?lens=footprint&fy=${a}..${b}`);
    const dated = FOOTPRINT.filter((r) => r.since !== null).length;
    assert.ok((await bodyText(page)).includes(`does not apply: ${dated} of ${FOOTPRINT.length} installations carry a date`), 'Footprint: the FY control reads its reason');
    await load(page, `/security?lens=procurement&fy=${a}..${b}`);
    await openTwin(page, 'awards');
    const aw = await twinTable(page, 'awards');
    const yA = fyStart(a); const yB = fyStart(b) + 1;
    for (const r of aw.rows) {
      const y = r.map((c) => c.match(/\b(1[89]\d{2}|20\d{2})\b/)?.[1]).find(Boolean);
      if (/no named contract/.test(r.join(' '))) continue;
      assert.ok(!r.includes('undated'), 'no undated row under fy');
      assert.ok(y && Number(y) >= yA && Number(y) <= yB, `award row year ${y} falls in the range`);
    }
  });
});

test('AC-79 — Round-trip `stage` with each option\'s coverage', async (t) => {
  if (!requireFull(t)) return;
  await withPage('D', async (page) => {
    await load(page, '/security');
    const slotsRest = await count(page, '[data-slot]');
    await roundTrip(page, {
      param: 'stage', value: 'actual', words: (v) => new RegExp(`stage ${v}\\b`),
      check: async (p) => {
        const cols = await stackColumns(p);
        for (const c of cols) assert.equal(c.state === 'hatched', MISSING('actual').includes(c.fy), `FY${c.fy}: hatched iff no actual rows`);
        assert.equal(await count(p, '[data-slot]'), slotsRest, 'the ledger keeps three slots per FY');
        assert.ok(/· actual\b/.test(await stripText(p)), 'strip fact 1 ends "· actual"');
      },
      change: async (p) => { await stageOption(p, 'RE').click(); return 'RE'; },
      reset: async (p) => { await stageOption(p, DEFAULT_STAGE).click(); },
    });
  });
});

test('AC-80 — Round-trip `comp` as a comma list that reaches the ledger and not the stack', async (t) => {
  if (!requireFull(t)) return;
  const k = LANES.filter((x) => ['pay', 'pension'].includes(x.split('|')[1])).length;
  await withPage('D', async (page) => {
    await load(page, '/security');
    const restBands = (await stackColumns(page)).map((c) => c.bands.map((b) => b.band).join(','));
    await roundTrip(page, {
      param: 'comp', value: 'pay,pension', words: compWords,
      check: async (p) => {
        assert.equal(await count(p, '[data-lane]'), k, `[data-lane] = ${k} pay and pension lanes`);
        assert.ok((await text(block(p, 'B3'))).includes(`${k} of ${LANES.length} lanes under the component filter`), 'the ledger heading names the filter');
        assert.deepEqual((await stackColumns(p)).map((c) => c.bands.map((b) => b.band).join(',')), restBands, 'the stack bands are unchanged');
        assert.ok((await text(p.locator('[data-q="B1"] figure').first())).includes('the stack shows every component; the filter applies to the ledger'), 'the stack says the filter applies to the ledger');
        assert.ok((await bodyText(p)).includes('components overlap by level; this filter never adds rows'), 'the control states its rule');
      },
      change: async (p) => { const box = p.getByRole('checkbox', { name: /^pension\b/i }).first(); await box.click(); return 'pay'; },
      reset: async (p) => { await p.getByRole('button', { name: /^Select all/ }).first().click(); },
    });
  });
});

test('AC-81 — Round-trip `sfy` and `m`, disabling what the denominator cannot divide', async (t) => {
  if (!requireFull(t)) return;
  const dp = DEFAULT_PAIR('gsdp');
  const other = STATE_PAIRS.find((p) => p.fy === GSDP_FY && p.key !== dp?.key) ?? null;
  await withPage('D', async (page) => {
    if (other) {
      await roundTrip(page, {
        param: 'sfy', value: other.key, filter: false,
        check: async (p) => {
          const m = await mapOptions(p, 'B6', 0);
          const want = countBy(UNITS, (st) => ({ value: 'value', 'no-row': 'hatch', 'no-denominator': 'hatch', 'union-funded': 'crosshatch' })[SPEND_CLASS(st, other, 'gsdp')]);
          for (const [c, n] of want) assert.equal(m.fills.filter((x) => x === c).length, n, `sfy=${other.key}: ${c} = ${n}`);
          assert.ok(m.legend.includes(`${other.fy} ${other.stage}`), 'the denominator line names the pair');
        },
      });
    } else t.diagnostic('AC-81: no second drawable pair under gsdp — the sfy round-trip is skipped');
    await roundTrip(page, {
      param: 'm', value: 'cr', filter: false,
      check: async (p) => {
        const dis = await pairSelect(p).evaluate((s) => [...s.options].filter((o) => o.getAttribute('aria-disabled') === 'true').length);
        assert.equal(dis, 0, 'm=cr: every drawable pair is enabled');
        const m = await mapOptions(p, 'B6', 0);
        assert.ok(/₹ cr|crore/.test(m.legend) && !/%/.test(m.legend), 'm=cr: the bins are ₹ crore and no % appears');
      },
    });
    await load(page, '/security?m=percap');
    const body = await bodyText(page);
    if (!S3) {
      const opt = page.locator('[aria-disabled="true"]').filter({ hasText: /Per person/ }).first();
      assert.equal(await opt.count(), 1, 'the per-person option is aria-disabled');
      assert.equal(await page.evaluate(() => window.__ac.name([...document.querySelectorAll('[aria-disabled="true"]')].find((e) => /Per person/.test(window.__ac.txt(e) + (e.getAttribute('aria-label') ?? ''))))), 'Per person, unavailable: no population series in this build; a 2011 Census base would re-rank states (S3)', 'its name gives the reason');
      assert.ok(!(await opt.evaluate((e) => e.disabled)), 'focusable (no disabled attribute)');
      const m = await mapOptions(page, 'B6', 0);
      assert.ok(m.legend.includes('GSDP'), 'the map falls back to gsdp');
      assert.ok(!/per person[^.]*₹|₹[^.]*per person/i.test(body), 'no per-person ₹ anywhere');
    } else {
      assert.ok(/per person/i.test(body), 'S3: m defaults to percap and names its basis');
    }
  });
});

const legendBins = (s) => [...(s ?? '').matchAll(/\d[\d,.]*\s?[–-]\s?\d[\d,.]*/g)].map((m) => m[0]).join(' | ');

test('AC-82 — Round-trip `sy`, keeping every year in the table', async (t) => {
  if (!requireFull(t)) return;
  const other = STRENGTH_YEARS.filter((y) => y !== DEFAULT_SY).at(-1);
  if (!need(t, other, 'a single strength year')) return;
  await withPage('D', async (page) => {
    await load(page, '/security');
    const restBins = legendBins((await mapOptions(page, 'B6', 1))?.legend);
    await roundTrip(page, {
      param: 'sy', value: String(other), filter: false,
      visible: async (p, v) => {
        const seg = await p.evaluate((y) => {
          const e = [...document.querySelectorAll('button, [role="radio"], [role="tab"], [role="option"], [aria-pressed], [aria-checked]')].find((x) => window.__ac.name(x).startsWith(`${y} ·`));
          return e ? (e.getAttribute('aria-pressed') ?? e.getAttribute('aria-checked') ?? e.getAttribute('aria-selected')) : null;
        }, v);
        assert.equal(seg, 'true', `sy=${v}: the strength-year segment named "${v} · …" is pressed or checked`);
        assert.ok((await text(p.locator('[data-q="B6"] figure').nth(1))).includes(v), `sy=${v}: the strength map's title or legend names the year`);
      },
      check: async (p) => {
        const m = await mapOptions(p, 'B6', 1);
        const want = countBy(UNITS, (st) => ({ value: 'value', 'no-row': 'hatch', 'counts-only': 'stipple' })[STRENGTH_CLASS(st, other)]);
        for (const [c, n] of want) assert.equal(m.fills.filter((x) => x === c).length, n, `sy=${other}: ${c} = ${n}`);
        assert.equal(legendBins(m.legend), restBins, 'the bin edges are identical under every sy');
        await openTwin(p, 'state-table');
        const hdr = (await twinTable(p, 'state-table')).headers.join(' | ');
        for (const y of STRENGTH_YEARS) assert.ok(new RegExp(`${y}[^|]*per lakh|per lakh[^|]*${y}`, 'i').test(hdr), `the state table keeps a per-lakh column for ${y}`);
      },
    });
  });
});

test('AC-83 — Round-trip `kind` as a comma list, with 0-row kinds always listed', async (t) => {
  if (!requireFull(t)) return;
  const dotsFor = (kinds) => FOOTPRINT.filter((r) => kinds.includes(r.kind)).length;
  const check = (kinds) => async (p) => {
    const r = await p.evaluate(() => { const b = window.__ac.qq('F1'); return { dots: b.querySelectorAll('[data-dot]').length, over: [...b.querySelectorAll('[data-overflow]')].reduce((s, e) => s + Number(e.getAttribute('data-overflow')), 0), fills: window.__ac.fillClasses(b) }; });
    assert.equal(r.dots + r.over, dotsFor(kinds), `kind=${kinds}: dots + overflow = ${dotsFor(kinds)}`);
    assert.equal(r.fills.filter((c) => c === 'hatch').length, UNITS.filter((u) => !FOOTPRINT.some((x) => x.st === u && kinds.includes(x.kind))).length, `kind=${kinds}: hatch = units with none`);
    await openTwin(p, 'places');
    const tbl = await twinTable(p, 'places');
    const i = window_col(tbl, 'Kind');
    for (const row of tbl.rows) assert.ok(kinds.some((k) => new RegExp('^' + k.replace(/-/g, '[ -]'), 'i').test(row[i])), `places row kind "${row[i]}" ∈ ${kinds}`);
    const chips = await kindChips(p);
    assert.equal(chips.filter((c) => c.found).length, KINDS.length, 'every kind chip stays');
    for (const c of chips.filter((x) => EMPTY_KINDS.includes(x.kind))) assert.ok(c.disabled, `${c.kind}: still aria-disabled`);
  };
  await withPage('D', async (page) => {
    await roundTrip(page, {
      lens: 'footprint', param: 'kind', value: 'cantonment', check: check(['cantonment']), words: kindWords,
      change: async (p) => { await p.locator('button, [role="checkbox"], input[type="checkbox"]').filter({ hasText: /^drdo[ -]lab/i }).first().click(); return 'cantonment,drdo-lab'; },
    });
    await load(page, '/security?lens=footprint&kind=cantonment,drdo-lab');
    await check(['cantonment', 'drdo-lab'])(page);
  });
});

test('AC-84 — Round-trip `body`, accenting lanes and never filtering', async (t) => {
  if (!requireFull(t)) return;
  if (!need(t, CAPF_SAMPLE, 'no CAPF body')) return;
  const otherBody = outsideCore.map(([id]) => id).find((id) => id !== CAPF_SAMPLE && LANES.some((k) => k.startsWith(`${id}|`)));
  await withPage('D', async (page) => {
    await load(page, '/security');
    const rest = await count(page, '[data-lane]');
    const mine = LANES.filter((k) => k.startsWith(`${CAPF_SAMPLE}|`)).length;
    await roundTrip(page, {
      param: 'body', value: CAPF_SAMPLE, filter: false,
      check: async (p) => {
        assert.equal(await count(p, '[data-lane]'), rest, 'the lane count is unchanged');
        const cur = await p.evaluate(() => [...document.querySelectorAll('[data-lane][aria-current="true"]')].map((e) => window.__ac.raw(e)));
        assert.equal(cur.length, mine, `${mine} lanes accented`);
        assert.ok(cur.every((s) => s.includes('selected body')), 'each carries the hidden words "selected body"');
        const card = await panel(p, `^${esc(labelOf(CAPF_SAMPLE))}$`);
        assert.ok(card?.text.includes(`Go to its ${mine} lanes in the ledger`), 'the BodyCard offers "Go to its {k} lanes in the ledger"');
        await p.getByRole('link', { name: `Go to its ${mine} lanes in the ledger` }).or(p.getByRole('button', { name: `Go to its ${mine} lanes in the ledger` })).first().click();
        assert.ok(await p.evaluate(() => { const a = document.activeElement; return !!a && (a.matches('[data-lane][aria-current="true"]') || !!a.closest('tr, [role="row"]')?.querySelector('[data-lane][aria-current="true"]')); }), 'focus moves to the first accented lane');
      },
      change: otherBody ? async (p) => { await p.locator('[data-q="B3"] button, [data-q="B3"] a').filter({ hasText: new RegExp(`^${esc(labelOf(otherBody))}$`) }).first().click(); return otherBody; } : undefined,
      reset: async (p) => { await p.getByRole('button', { name: /^Close$/ }).first().click(); },
    });
    await load(page, '/security?body=force:not-a-body');
    assert.equal(await deepestCount(page, '^ignored an unrecognised body value$'), 1, 'an unknown body: one amber line');
  });
});

test('AC-85 — Round-trip `cell`, opening the `CellCard`', async (t) => {
  if (!requireFull(t)) return;
  if (!need(t, CELL_SAMPLE, 'no CAPF cell')) return;
  await withPage('D', async (page) => {
    const cell = await cellParam(page);
    const rows = LANE_ROWS(CELL_SAMPLE.key).filter((r) => r.fy === CELL_SAMPLE.fy);
    // [Adjudicated 2026-10-06] the slug is stable under a component filter, only the part after @ varies by FY, and lanes differ.
    const slug = cell.slice(0, cell.lastIndexOf('@'));
    assert.equal(await harvestCell(page, { key: CELL_SAMPLE.key, fy: CELL_SAMPLE.fy, query: `comp=${CELL_SAMPLE.component}` }), cell, 'the slug is stable under a component filter');
    const otherFy = uniq(LANE_ROWS(CELL_SAMPLE.key).map((r) => r.fy)).find((f) => f !== CELL_SAMPLE.fy) ?? FY_AXIS.find((f) => f !== CELL_SAMPLE.fy);
    const v2 = await harvestCell(page, { key: CELL_SAMPLE.key, fy: otherFy });
    assert.ok(v2 === `${slug}@${otherFy}`, `same lane, FY${otherFy}: only the part after @ changes (got "${v2}")`);
    const otherLane = CAPF_LANES.find((k) => k !== CELL_SAMPLE.key);
    if (otherLane) assert.notEqual((await harvestCell(page, { key: otherLane, fy: LANE_ROWS(otherLane).some((r) => r.fy === CELL_SAMPLE.fy) ? CELL_SAMPLE.fy : LANE_ROWS(otherLane)[0].fy })).split('@')[0], slug, 'another lane writes a different slug');
    else t.diagnostic('SKIPPED: one lane for CAPF_SAMPLE — slug distinctness not checked');
    await roundTrip(page, {
      param: 'cell', value: cell, filter: false,
      check: async (p) => {
        const card = await panel(p, esc(CELL_SAMPLE.fy));
        assert.ok(card, 'the CellCard opens');
        assert.ok(card.h2.includes(labelOf(CELL_SAMPLE.body)) && card.h2.includes(CELL_SAMPLE.line) && card.h2.includes(CELL_SAMPLE.fy), `its h2 names the body, the line and the FY (reads "${card.h2}")`);
        const btns = p.getByRole('button', { name: /^Copy citation/ });
        assert.equal(await btns.count(), rows.length, `${rows.length} Copy citation buttons`);
        await btns.first().click();
        const clip = await p.evaluate(() => navigator.clipboard.readText());
        const out = await p.evaluate(() => window.__ac.txt(document.querySelector('output')));
        for (const s of [clip, out]) {
          assert.ok(rows.some((r) => s.includes(r.head)), 'the citation carries the head verbatim');
          assert.ok(STAGES.some((st) => s.includes(st)) && s.includes(CELL_SAMPLE.fy) && /https?:\/\//.test(s) && s.includes(`read to ${ASOF}`), 'stage, FY, an http URL and read to');
          assert.ok(s.includes(`#/security?cell=${cell}`) || s.includes(`#/security?cell=${encodeURIComponent(cell)}`), 'the citation deep link carries the same cell value');
        }
        assert.ok(await p.locator('[role="grid"] [aria-current="true"]').count() >= 1, 'the cell carries aria-current');
        await p.getByRole('button', { name: /^Close$/ }).first().click();
        await waitNoParam(p, 'cell');
        assert.ok(await p.evaluate(() => !!document.activeElement?.closest('[role="grid"]')), 'Close returns focus to the cell');
      },
    });
    await load(page, '/security?cell=x%401900-01');
    assert.equal(await deepestCount(page, '^ignored an unrecognised cell value$'), 1, 'an unknown cell: one amber line');
    assert.equal(await page.locator('[role="grid"] [aria-current="true"]').count(), 0, 'no cell is selected');
    const q = hashParams(page);
    assert.ok(!q.has('cell') || q.get('cell') === 'x@1900-01', 'an unknown cell: the page does not write a different value');
  });
});

/** SG-RF3's URL set (AC-86, AC-142). */
const RF3_URLS = () => {
  const out = ['/security?lens=procurement'];
  for (const v of VENDORS) out.push(`/security?lens=procurement&vendor=${encodeURIComponent(v)}`);
  for (const y of AWARD_YEARS) out.push(`/security?lens=procurement&fy=${fyLabel(y)}`);
  for (const tr of ['documented', 'alleged', 'none']) out.push(`/security?lens=procurement&tier=${tr}`);
  for (const v of VENDORS) out.push(`/security?lens=procurement&find=${encodeURIComponent(labelOf(v))}`);
  return out;
};
const vendorState = (page) => page.evaluate(() => ({
  cards: document.querySelectorAll('[data-vendor-card]').length,
  margin: [...document.querySelectorAll('aside, [data-margin]')].map((a) => a.querySelectorAll('dl').length).filter((n) => n > 0),
}));

test('AC-86 — Round-trip `vendor`, accenting and opening with comparators, never filtering', async (t) => {
  if (!requireFull(t)) return;
  if (!need(t, VENDOR_NO_AWARD, 'no vendor without an award that has a comparator')) return;
  const v = VENDOR_NO_AWARD;
  const comps = COMPARATORS(v);
  await withPage('D', async (page) => {
    await roundTrip(page, {
      lens: 'procurement', param: 'vendor', value: v, filter: false,
      check: async (p) => {
        assert.equal(await count(p, '[data-vendor-card]'), VENDORS.length, 'the vendor card count is unchanged');
        const acc = await p.evaluate(() => [...document.querySelectorAll('[data-vendor-card][aria-current="true"]')].map((e) => window.__ac.raw(e)));
        assert.equal(acc.length, 1, 'one card carries aria-current');
        assert.ok(acc[0].includes('selected vendor'), 'with "selected vendor"');
        const card = await p.evaluate((label) => {
          const el = window.__ac.card((t) => t.startsWith(label));
          return el ? { h2: window.__ac.txt(el.querySelector('h2')), dls: [...el.querySelectorAll('dl')].map((d) => [...d.querySelectorAll('dt')].map((x) => window.__ac.txt(x))) } : null;
        }, labelOf(v));
        assert.ok(card, 'the VendorCard opens');
        assert.ok(card.dls.length >= 2, 'the margin holds ≥ 2 <dl>s');
        for (const d of card.dls) assert.deepEqual(d, card.dls[0], 'identical dt sequences');
        assert.equal(card.h2, `${labelOf(v)} beside ${comps.map(labelOf).join(', ').replace(/, ([^,]*)$/, ' and $1')}`, 'VendorCard h2 reads "{vendor} beside {comparators}"');
      },
      reset: async (p) => { await p.locator('[data-vendor-card][aria-current="true"] h4, [data-vendor-card][aria-current="true"] button').first().click(); },
    });
    const notVendor = F.FORCE_NODES.find((n) => !VENDOR_SET.has(n.id) && !n.id.startsWith('force:case-'));
    await load(page, `/security?lens=procurement&vendor=${encodeURIComponent(notVendor.id)}`);
    assert.ok((await bodyText(page)).includes(`${notVendor.label} is not a vendor in this register`), 'a non-vendor id says so');
    assert.ok(await page.getByRole('button', { name: /^Show connections/ }).count() >= 1, 'with a Show connections button');
  });
  for (const vp of ['D', 'M']) {
    await withPage(vp, async (page) => {
      for (const u of RF3_URLS()) {
        await load(page, u);
        const s = await vendorState(page);
        assert.notEqual(s.cards, 1, `${vp} ${u}: never exactly one vendor card`);
        assert.ok(!s.margin.includes(1), `${vp} ${u}: never exactly one vendor <dl> in the margin`);
      }
    });
  }
});

test('AC-87 — Round-trip `case`, accenting both columns, never filtering', async (t) => {
  if (!requireFull(t)) return;
  const c = CASES.find((x) => x === 'force:case-rafale') ?? CASES[0];
  if (!need(t, c, 'no case')) return;
  const total = CASE_PAIRS.length + UNPAIRED.length;
  await withPage('D', async (page) => {
    await roundTrip(page, {
      lens: 'procurement', param: 'case', value: c, filter: false,
      check: async (p) => {
        assert.equal(await count(p, '[data-pair]'), total, 'the pair count is unchanged');
        const r = await p.evaluate(() => {
          const s = document.querySelector('[data-pair][aria-current="true"]');
          if (!s) return null;
          const h4 = s.querySelector('h4').getBoundingClientRect();
          return { raw: window.__ac.raw(s), borders: [...s.querySelectorAll('[data-case]')].map((d) => getComputedStyle(d).borderTopColor + '/' + getComputedStyle(d).borderLeftColor), inView: h4.top >= 0 && h4.bottom <= innerHeight };
        });
        assert.ok(r, 'the pair row carries aria-current');
        assert.ok(r.raw.includes('selected case'), 'with "selected case"');
        assert.equal(r.borders.length, 2, 'both columns');
        assert.equal(r.borders[0], r.borders[1], 'both columns carry the accent border');
        assert.ok(r.inView, 'the row\'s h4 is in the viewport after load');
        await p.getByRole('link', { name: /^Go to the pair row/ }).first().click();
        assert.ok(await p.evaluate(() => document.activeElement?.matches('[data-pair][aria-current="true"] h4')), 'Go to the pair row moves focus to the h4');
      },
    });
  });
});

test('AC-88 — Round-trip `rec`, opening the `RecordCard`', async (t) => {
  if (!requireFull(t)) return;
  if (!need(t, ENFORCE_WITH_CONTRA, 'no record with a response')) return;
  const e = ENFORCE_WITH_CONTRA;
  await withPage('D', async (page) => {
    await roundTrip(page, {
      lens: 'procurement', param: 'rec', value: e.id, filter: false,
      check: async (p) => {
        const card = await p.evaluate((lab) => {
          const el = window.__ac.card((t) => t === lab);
          return el ? { text: window.__ac.txt(el), out: [...el.querySelectorAll('output')].map((o) => window.__ac.txt(o)) } : null;
        }, e.lab);
        assert.ok(card, 'the RecordCard h2 = the record\'s lab');
        for (const r of responsesTo(e.id)) assert.ok(card.text.includes(r.lab), `it lists the response ${r.id}`);
        assert.ok(card.out.some((o) => /https?:\/\//.test(o) && o.endsWith(`read to ${ASOF}`)), `a citation <output> ending "read to ${ASOF}" with an http URL`);
        await p.getByRole('button', { name: /^Close$/ }).first().click();
        await waitNoParam(p, 'rec');
        assert.ok(await p.evaluate(() => document.activeElement?.matches('input[type="search"]')), 'arriving by URL, Close returns focus to the Find input');
      },
    });
    await load(page, '/security?lens=procurement&rec=no-such-record');
    assert.ok((await bodyText(page)).includes('No record no-such-record in this register.'), 'an unknown rec says so');
  });
});

test('AC-89 — Write `sel`, `focus` and `hops` only through Show connections, and never the graph\'s other params', async (t) => {
  if (!requireFull(t)) return;
  if (!need(t, CAPF_SAMPLE, 'no CAPF body')) return;
  await withPage('D', async (page) => {
    await load(page, `/security?find=${encodeURIComponent(labelOf(CAPF_SAMPLE))}`);
    await page.getByRole('button', { name: /^Show connections/ }).first().click();
    await waitParam(page, 'sel', CAPF_SAMPLE);
    const p = hashParams(page);
    assert.equal(p.get('focus'), CAPF_SAMPLE, 'focus = the id');
    assert.equal(p.get('hops'), '1', 'hops = 1');
    await page.waitForTimeout(GRAPH_SETTLE);
    assert.ok(await page.evaluate(() => document.activeElement?.matches('#connections h2')), 'focus lands on #connections h2');
    assert.ok(await page.getByRole('link', { name: /^Back to / }).count() >= 1, 'a Back to {origin} link');
    for (const k of GRAPH_PARAMS) assert.ok(!p.has(k), `the URL never gains ${k}`);
    await load(page, `/security?fy=${FY_AXIS[3]}..${FY_AXIS[10]}`);
    const before = [...hashParams(page).keys()].sort();
    await page.getByRole('button', { name: /^Apply .+ to the graph/ }).first().click();
    await waitParam(page, 'from');
    const after = [...hashParams(page).keys()].sort();
    assert.deepEqual(after.filter((k) => !before.includes(k)).sort(), ['from', 'to'], 'Apply {fy} to the graph writes from/to and nothing else');
  });
});

test('AC-90 — Round-trip `tier` as a comma list shared with the graph', async (t) => {
  if (!requireFull(t)) return;
  await withPage('D', async (page) => {
    await load(page, '/security', { graph: true });
    const restCount = ungroup(await text(page.locator('#connections'))).match(/(\d+) edges/)?.[1];
    await roundTrip(page, {
      param: 'tier', value: 'documented,reported', words: (v) => v.split(',').map((tr) => new RegExp(`\\b${tr}\\b`)),
      check: async (p) => {
        for (const tr of TIER_WORDS) assert.equal(await tierToggle(p, tr).getAttribute('aria-pressed'), ['documented', 'reported'].includes(tr) ? 'true' : 'false', `${tr} pressed iff in the set`);
        await openTwin(p, 'ledger-long');
        const tbl = await twinTable(p, 'ledger-long');
        const i = window_col(tbl, 'Tier');
        for (const r of tbl.rows) assert.ok(['documented', 'reported'].includes(r[i]), `ledger-long tier ${r[i]} ∈ the set`);
        await p.waitForTimeout(GRAPH_SETTLE);
        const c = ungroup(await text(p.locator('#connections'))).match(/(\d+) edges/)?.[1];
        assert.ok(c && c !== restCount, `the graph's drawn edge count changes (${restCount} → ${c})`);
        const sw = await p.evaluate(() => [...document.querySelectorAll('button[aria-pressed]')].filter((b) => /^(documented|reported|alleged|analytic)\b/.test(window.__ac.txt(b))).map((b) => [...b.querySelectorAll('svg, [data-swatch], span:empty')].every((s) => s.closest('[aria-hidden="true"]'))));
        assert.ok(sw.length === 4 && sw.every(Boolean), 'the swatches are aria-hidden and the word is the label');
      },
      change: async (p) => { await tierToggle(p, 'alleged').click(); return 'documented,reported,alleged'; },
    });
    await load(page, '/security');
    await tierToggle(page, 'alleged').click();
    await page.waitForTimeout(300);
    const live = ungroup(await liveText(page));
    assert.ok(/tier filter: documented, reported, analytic; from (\d+) to (\d+) (rows|records)/.test(live) || /tier filter: [a-z, ]+; from (\d+) to (\d+) (rows|records)/.test(live), `the live region names the tier filter (reads "${live}")`);
    await load(page, '/security?tier=none&view=table');
    const sums = await page.evaluate(() => [...document.querySelectorAll('details[data-twin] > summary')].map((s) => window.__ac.txt(s)));
    assert.ok(sums.length > 0 && sums.every((s) => /\b0 rows\b/.test(s) || /always all 36/.test(s)), 'tier=none: every twin reads 0 rows (the state table keeps its 36)');
  });
});

test('AC-91 — Round-trip `find` and filter nothing by it', async (t) => {
  if (!requireFull(t)) return;
  const VERBS = ['Show its budget lines', 'Show connections', 'Show in footprint', 'Where its police money sits', 'Show vendor', 'Show the pair', 'Open record'];
  await withPage('D', async (page) => {
    await load(page, '/security?view=table');
    const restRows = await page.evaluate(() => [...document.querySelectorAll('details[data-twin]')].map((d) => [d.getAttribute('data-twin'), d.querySelectorAll('tbody tr').length]));
    await roundTrip(page, {
      param: 'find', value: 'Police', filter: false,
      // [Adjudicated 2026-10-07, §0.7 Reading B] `find` filters nothing: the Find input showing the query is its visible state.
      visible: async (p, v) => {
        assert.equal(await findInput(p).inputValue(), v, `find=${v}: the Find input shows the query`);
        const line = await p.evaluate(() => window.__ac.activeFilter());
        assert.ok(!line || !line.includes('Police'), `find: the active-filter line, if present, does not name the Find text (reads "${line}")`);
      },
      check: async (p) => {
        const q = hashParams(p);
        for (const k of ['st', 'body', 'vendor']) assert.ok(!q.has(k), `no result is auto-selected (no ${k})`);
        const groups = await p.evaluate(() => window.__ac.deepestAll(document.querySelector('main'), '^(Bodies|Places|Vendors|Cases|Records)$').map((e) => window.__ac.txt(e)));
        assert.ok(groups.length >= 1, 'results are grouped');
        const order = ['Bodies', 'Places', 'Vendors', 'Cases', 'Records'];
        assert.deepEqual(groups, [...groups].sort((a, b) => order.indexOf(a) - order.indexOf(b)), 'groups in the fixed order');
        const verbs = await p.evaluate(() => [...document.querySelectorAll('main button, main a')].map((b) => window.__ac.txt(b)).filter((x) => /^(Show|Where|Open)\b/.test(x)));
        for (const v of uniq(verbs).filter((x) => !/^Show (all|the table)|^Open a state/.test(x))) assert.ok(VERBS.some((w) => v === w || v.startsWith(`${w}:`)), `result verb "${v}" is one of the seven`);
        const cityBudget = await p.evaluate((ids) => [...document.querySelectorAll('[data-city-body]')].filter((e) => ids.includes(e.getAttribute('data-city-body'))).some((e) => [...(e.closest('li, article, div')?.querySelectorAll('button, a') ?? [])].some((b) => /Show its budget lines/.test(window.__ac.txt(b)))), CITY_BODIES);
        assert.ok(!cityBudget, 'a city body result never carries "Show its budget lines"');
        const rows = await p.evaluate(() => [...document.querySelectorAll('details[data-twin]')].map((d) => [d.getAttribute('data-twin'), d.querySelectorAll('tbody tr').length]));
        if (hashParams(p).get('view') === 'table') assert.deepEqual(rows, restRows, 'every twin keeps its unfiltered row count');
        const live = await liveText(p);
        assert.equal((live.match(/\d+ matches for Police/g) ?? []).length, 1, `the live region reads "{k} matches for Police" once (reads "${live}")`);
      },
      change: async (p) => { await findInput(p).fill('Police head'); await p.waitForTimeout(FIND_SETTLE); return 'Police head'; },
      reset: async (p) => { await findInput(p).fill(''); },
    });
  });
});

test('AC-92 — Round-trip `view=table` and keep it across a lens change', async (t) => {
  if (!requireFull(t)) return;
  await withPage('D', async (page) => {
    await roundTrip(page, {
      param: 'view', value: 'table', filter: false,
      check: async (p) => {
        const r = await p.evaluate(() => ({
          closed: document.querySelectorAll('details[data-twin]:not([open])').length,
          drawings: [...document.querySelectorAll('figure svg, figure [data-column], figure [data-dot]')].filter((e) => window.__ac.visible(e) && !e.closest('details[data-twin]')).length,
          h3: [...document.querySelectorAll('[data-q] h3')].every((h) => window.__ac.visible(h)),
        }));
        assert.equal(r.closed, 0, 'every twin is open');
        assert.equal(r.drawings, 0, 'every drawing is hidden');
        assert.ok(r.h3, 'the Q h3s stay visible');
        assert.equal(await tableViewToggle(p).getAttribute('aria-pressed'), 'true', 'Table view is pressed');
        await tab(p, 'footprint').click();
        await waitParam(p, 'lens', 'footprint');
        assert.equal(hashParams(p).get('view'), 'table', 'a tab press keeps view=table');
        assert.equal(await count(p, 'details[data-twin]:not([open])'), 0, "the new lens's twins are open");
        await tab(p, 'budgets').click();
      },
      reset: async (p) => { await tableViewToggle(p).click(); },
    });
  });
});

test('AC-93 — Round-trip `tp` and page at 400', async (t) => {
  if (!requireFull(t)) return;
  const n = LANE_SOURCE.length;
  if (!need(t, n > 400, `${n} ledger rows: no second page`)) return;
  await withPage('D', async (page) => {
    await load(page, '/security?view=table');
    assert.equal(await twinRows(page, 'ledger-long'), 400, 'tp absent: 400 rows');
    await roundTrip(page, {
      param: 'tp', value: '2', filter: false,
      check: async (p) => {
        assert.ok((await text(twin(p, 'ledger-long'))).includes(`page 2 of ${Math.ceil(n / 400)}`), `the pager reads "page 2 of ${Math.ceil(n / 400)}"`);
        assert.equal(await twinRows(p, 'ledger-long'), Math.min(400, n - 400), 'rows 401–800');
      },
    });
    const pages = await allTwinPages(page, 'ledger-long', '/security');
    assert.equal(sum(pages.map((p) => p.rows.length)), n, `the union over every tp = the ${n} rows in view`);
    await load(page, '/security?view=table&tp=2');
    await page.getByRole('button', { name: /previous|‹/i }).first().click();
    await waitNoParam(page, 'tp');
  });
});

test('AC-94 — Fall back from an unknown value with one amber line', async (t) => {
  if (!requireFull(t)) return;
  const bad = [['lens', 'x'], ['stage', 'x'], ['st', 'zz'], ['fy', '1900-01'], ['sfy', 'x'], ['sy', '1'], ['kind', 'x'], ['m', 'x'], ['payer', 'x'], ['view', 'x']];
  await withPage('D', async (page) => {
    for (const [k, v] of bad) {
      const r = k === 'kind' ? `/security?lens=footprint&${k}=${v}` : `/security?${k}=${v}`;
      await load(page, r);
      const lines = await page.evaluate((kk) => window.__ac.deepestAll(document.querySelector('main'), `^ignored an unrecognised ${kk} value$`).map((e) => getComputedStyle(e).color), k);
      assert.equal(lines.length, 1, `${k}=${v}: exactly one "ignored an unrecognised ${k} value" line`);
      assert.equal(lines[0], await amberColour(page), `${k}=${v}: in amber`);
      const p = hashParams(page);
      assert.ok(!p.has(k) || p.get(k) === v, `${k}=${v}: the page does not write a different value`);
      if (k === 'lens') assert.equal(await tab(page, 'budgets').getAttribute('aria-selected'), 'true', 'lens=x: Budgets');
      if (k === 'stage') assert.equal(await stageOption(page, DEFAULT_STAGE).getAttribute('aria-pressed'), 'true', 'stage=x: the default stage');
    }
  });
});

test('AC-95 — Reset every page param except `lens` and `view`, never the graph\'s', async (t) => {
  if (!requireFull(t)) return;
  const unit = FOOTPRINT[0]?.st ?? UNITS[0];
  const sel = CAPF_SAMPLE ?? F.FORCE_NODES[0].id;
  await withPage('D', async (page) => {
    await load(page, `/security?lens=footprint&view=table&st=${unit}&kind=cantonment&tier=documented&find=x&fy=2014-15&q=abc&fam=state&sel=${encodeURIComponent(sel)}`);
    await page.locator('main button, main a').filter({ hasText: /^reset$/ }).first().click();
    await page.waitForFunction(() => !new URLSearchParams(location.hash.split('?')[1] ?? '').has('kind'), null, { timeout: ACTION_TIMEOUT });
    const got = Object.fromEntries(hashParams(page));
    assert.deepEqual(got, { lens: 'footprint', view: 'table', q: 'abc', fam: 'state', sel }, 'the URL keeps lens, view and the graph\'s params only');
    assert.equal(((await liveText(page)).match(/reset/gi) ?? []).length, 1, 'the live region announces the reset once');
    const foot = await page.evaluate((s) => { const e = window.__ac.deepest(document.querySelector('main'), '^' + s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); return e ? { text: window.__ac.txt(e), href: (e.closest('a') ?? e.querySelector('a'))?.getAttribute('href') ?? null } : null; }, RAIL_REFUSAL.slice(0, 40));
    assert.equal(foot?.text, RAIL_REFUSAL, 'the rail foot line');
    assert.ok(foot.href?.includes('refusals'), 'links to #refusals');
  });
});

test('AC-96 — Copy the exact link and announce it', async (t) => {
  if (!requireFull(t)) return;
  const v = VENDOR_NO_AWARD ?? VENDORS[0];
  await withPage('D', async (page) => {
    await load(page, `/security?lens=procurement&vendor=${encodeURIComponent(v)}&fy=2014-15..2024-25`);
    const before = await page.evaluate(() => history.length);
    await page.getByRole('button', { name: /^Copy link$/ }).first().click();
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), page.url(), 'the clipboard holds page.url()');
    assert.ok((await liveText(page)).includes('Link copied'), 'the live region reads "Link copied"');
    assert.equal(await page.evaluate(() => history.length), before, 'history.length unchanged');
  });
});

// ---------------------------------------------------------------------------
// §7 Table twin = visible graphic — FULL build
// ---------------------------------------------------------------------------

test('AC-97 — Match the stack twin to bands, totals, hatched columns and the bracket rows, with no glyph tokens', async (t) => {
  if (!requireFull(t)) return;
  const EXTRA = /^(pay lines \(\d+\)|Agnipath lines|Delhi Police \(inside the Police demand\)|police pay)$/;
  await withPage('D', async (page) => {
    await load(page, '/security');
    const r = await page.evaluate(() => ({
      bands: document.querySelectorAll('[data-band]').length,
      hatched: document.querySelectorAll('[data-column][data-column-state="hatched"]').length,
      answer: (() => { const f = document.querySelector('[data-q="B1"] figure'); if (!f) return null; const w = document.createTreeWalker(f, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) if (n.textContent.trim()) return window.__ac.txt(n.parentElement); return null; })(),
    }));
    await openTwin(page, 'stack');
    const tbl = await twinTable(page, 'stack');
    const summary = await text(twin(page, 'stack').locator('summary').first());
    const iKind = window_col(tbl, 'kind');
    assert.ok(iKind >= 0, `the stack twin has a kind column (${JSON.stringify(tbl.headers)})`);
    const extras = tbl.rows.filter((x) => EXTRA.test(x[iKind])).length;
    assert.equal(tbl.rows.length, r.bands + 2 * FY_AXIS.length + r.hatched + extras, `rows = ${r.bands} bands + 2 × ${FY_AXIS.length} published-total rows + ${r.hatched} hatched + ${extras} bracket rows`);
    for (const row of tbl.rows) {
      for (const c of row) assert.ok(!['=', '≠', '·'].includes(c), 'no cell holds a bare glyph');
    }
    const bandRows = tbl.rows.filter((x) => ['revenue', 'capital', 'civil', 'pension'].some((b) => x[iKind]?.toLowerCase().startsWith(b)));
    for (const row of bandRows) {
      const s = row.join(' | ');
      assert.ok(crContextOk(s), `band row CR-CONTEXT ("${s.slice(0, 160)}")`);
      if (/%/.test(s)) assert.ok(/of published total|of stack, computed here/.test(s), 'its share carries the basis words');
    }
    assert.equal(tbl.caption, r.answer, "the <caption> equals the figure's answer sentence");
    assert.match(summary, /Q1 — .+ as a table · (\d+) rows/, 'the summary reads "Q1 — … as a table · {n} rows"');
  });
});

test('AC-98 — Match the ledger\'s long form to the rows in view and its coverage twin to lanes × FYs', async (t) => {
  if (!requireFull(t)) return;
  await withPage('D', async (page) => {
    const pages = await allTwinPages(page, 'ledger-long', '/security');
    const n = sum(pages.map((p) => p.rows.length));
    assert.equal(n, LANE_SOURCE.length, `Σ ledger-long rows = ${LANE_SOURCE.length}`);
    await load(page, '/security');
    const eff = await page.evaluate(() => window.__ac.txt(window.__ac.q('B3')?.querySelector('[data-effect]')));
    const m = ungroup(eff).match(/(\d+) → (\d+)/);
    assert.ok(m && int(m[2]) === n, `= the ledger's [data-effect] k (reads "${eff}")`);
    const lanes = await count(page, '[data-lane]');
    await openTwin(page, 'ledger-coverage');
    const cov = await twinTable(page, 'ledger-coverage');
    assert.equal(cov.rows.length, lanes * FY_AXIS.length, `coverage rows = ${lanes} lanes × ${FY_AXIS.length} FYs`);
    for (const row of cov.rows) for (const c of row.slice(-3)) assert.ok(/^₹[\d,.]+/.test(c) || c === 'no row in this register' || c === '₹0 cr — as recorded' || /hidden by/.test(c), `coverage cell "${c}" is ₹x or the null words`);
    const order = async () => page.evaluate(() => [...document.querySelectorAll('[data-lane]')].map((e) => `${e.getAttribute('data-lane-group')}|${e.getAttribute('data-lane')}|${window.__ac.txt(e)}`));
    const rest = await order();
    const groups = rest.map((x) => x.split('|')[0]);
    const rank = { published: 0, body: 1, city: 2 };
    assert.deepEqual(groups, [...groups].sort((a, b) => rank[a] - rank[b]), 'groups: Published totals, then bodies, then Delhi Police');
    for (const v of ['stage=actual', `fy=${FY_AXIS[3]}..${FY_AXIS[10]}`]) {
      await load(page, `/security?${v}`);
      assert.deepEqual(await order(), rest, `${v}: no lane order changes`);
    }
    const two = LANES.flatMap((k) => FY_AXIS.flatMap((fy) => STAGES.filter((s) => LANE_ROWS(k).filter((r) => r.fy === fy && r.stage === s).length === 2).map((s) => ({ k, fy, s }))))[0];
    if (two) {
      const rows = pages.flatMap((p) => p.rows.map((r) => r.join(' | '))).filter((r) => r.includes(two.fy) && r.includes(two.k.split('|').slice(2).join('|')));
      assert.ok(rows.length >= 2, `a two-edition slot (${two.k} FY${two.fy} ${two.s}) has two long-form rows`);
    }
  });
});

test('AC-99 — Match the office twin to the role records', async (t) => {
  if (!requireFull(t)) return;
  const datedTargets = new Set(ROLE_EDGES.filter((e) => e.from).map((e) => e.t));
  const officeRows = ROLE_EDGES.filter((e) => e.t === MOD || e.t === MHA || datedTargets.has(e.t));
  await withPage('D', async (page) => {
    await load(page, '/security');
    assert.equal(await count(page, '[data-mark="office"]'), ROLE_WINDOWS.length, `[data-mark="office"] = ${ROLE_WINDOWS.length} windows`);
    await openTwin(page, 'office');
    const tbl = await twinTable(page, 'office');
    assert.equal(tbl.rows.length, officeRows.length, `TWIN(office) rows = ${officeRows.length} role records`);
    for (const w of ROLE_WINDOWS.filter((x) => x.n > 1)) assert.ok(tbl.rows.some((r) => r.join(' ').includes(`×${w.n} records`)), `a ${w.n}-record window reads "×${w.n} records"`);
    assert.equal(tbl.rows.filter((r) => r.includes('end not recorded')).length, ROLE_EDGES.filter((e) => !e.to && officeRows.includes(e)).length, 'open-ended rows read "end not recorded"');
    assert.ok(window_col(tbl, 'party as recorded') >= 0, 'a "party as recorded" text column');
  });
});

test('AC-100 — Match the spend map twin to 36 units and make its sortable columns the dot strip', async (t) => {
  if (!requireFull(t)) return;
  await withPage('D', async (page) => {
    await load(page, '/security');
    const m = await mapOptions(page, 'B6', 0);
    await openTwin(page, 'spend-map');
    const tbl = await twinTable(page, 'spend-map');
    assert.equal(tbl.rows.length, 36, '36 rows');
    assert.deepEqual(tbl.rows.map((r) => r[0]), UNITS.map((u) => STATE_NAME.get(u)), 'default order north to south');
    const has = (w) => tbl.rows.filter((r) => r.some((c) => c.includes(w))).length;
    const fills = (c) => m.fills.filter((x) => x === c).length;
    assert.equal(has('police paid by the Union'), fills('crosshatch'), 'crosshatch rows');
    assert.equal(has('no row in this register') + has('GSDP not in this build'), fills('hatch'), 'hatch rows (no row, or GSDP not in this build)');
    const sorts = await page.evaluate(() => [...document.querySelectorAll('details[data-twin="spend-map"] th')].map((th) => ({ text: window.__ac.txt(th), sort: th.getAttribute('aria-sort'), btn: !!th.querySelector('button') })));
    for (const col of ['% of GSDP', '₹ cr']) {
      const th = sorts.find((s) => s.text.includes(col));
      assert.ok(th?.btn && th.sort != null, `"${col}" has a Sort button and aria-sort`);
    }
    await page.locator('details[data-twin="spend-map"] th button').filter({ hasText: /% of GSDP/ }).first().click();
    const sorted = (await twinTable(page, 'spend-map')).rows.map((r) => [...STATE_NAME.entries()].find(([, n]) => n === r[0])?.[0]);
    const strip = await page.evaluate(() => {
      const fig = [...window.__ac.qq('B6').querySelectorAll('figure')][0];
      const labels = [...fig.querySelectorAll('[aria-hidden="true"] text, [aria-hidden="true"] span')].map((e) => ({ t: (e.textContent ?? '').trim().toLowerCase(), x: e.getBoundingClientRect().x })).filter((e) => /^[a-z]{2}$/.test(e.t));
      return labels.sort((a, b) => a.x - b.x).map((e) => e.t);
    });
    const valued = sorted.filter((s) => strip.includes(s));
    assert.ok(strip.length > 0, 'the dot strip carries aria-hidden state codes');
    assert.ok(JSON.stringify(valued) === JSON.stringify(strip) || JSON.stringify([...valued].reverse()) === JSON.stringify(strip), 'sorting by % of GSDP orders the rows as the dot strip');
  });
});

test('AC-101 — Match the strength map twin to 36 units with the note\'s words on derived counts', async (t) => {
  if (!requireFull(t)) return;
  await withPage('D', async (page) => {
    await load(page, '/security');
    const m = await mapOptions(page, 'B6', 1);
    await openTwin(page, 'strength-map');
    const tbl = await twinTable(page, 'strength-map');
    assert.equal(tbl.rows.length, 36, '36 rows');
    const has = (w) => tbl.rows.filter((r) => r.some((c) => c.includes(w))).length;
    assert.equal(has('counts recorded without per-lakh'), m.fills.filter((c) => c === 'stipple').length, 'counts-only rows = stipple units');
    assert.equal(has('no row in this register'), m.fills.filter((c) => c === 'hatch').length, 'no-row rows = hatch units');
    const iPL = tbl.headers.findIndex((h) => /per lakh/i.test(h));
    for (const st of UNITS) {
      const r = STRENGTH_ST.find((x) => x.st === st && x.year === DEFAULT_SY && x.perLakh != null);
      if (!r) continue;
      const row = tbl.rows[UNITS.indexOf(st)];
      assert.equal(num(row[iPL]), r.perLakh, `${st}: per lakh as recorded (${r.perLakh})`);
      const derived = /DERIVED/.test(r.note ?? '');
      if (derived) assert.ok(row.join(' ').includes(r.note.split(/(?<=\.)\s+/).find((s) => s.includes('DERIVED')).trim()), `${st}: the DERIVED sentence`);
      const vac = row.join(' ').match(/vacan\w*[^|]*?([\d.]+)%/i);
      if (vac) assert.ok(finite(r.sanctioned) && finite(r.actual) && !derived, `${st}: a vacancy share only from two printed counts`);
    }
  });
});

test('AC-102 — Export the state table as two machine tables', async (t) => {
  if (!requireFull(t)) return;
  const SPEND = 'st, state, fy, fy_start, stage, head, cr, tier, note, gsdp_cr, gsdp_fy, gsdp_tier, pct_gsdp, source_urls'.split(', ');
  const STR = 'st, state, year, per_lakh, sanctioned, actual, women_pct, derived_counts, tier, note, source_urls'.split(', ');
  await withPage('D', async (page) => {
    await load(page, '/security');
    const d = await openTwin(page, 'state-table');
    const btns = await d.getByRole('button', { name: /^Download \.tsv/ }).evaluateAll((els) => els.map((e) => window.__ac.name(e)));
    assert.equal(btns.length, 2, 'two Download .tsv buttons');
    assert.ok(btns.some((b) => /spend/i.test(b)) && btns.some((b) => /strength/i.test(b)), `named spend and strength (${JSON.stringify(btns)})`);
    const files = [await downloadTsv(page, 'state-table', 0), await downloadTsv(page, 'state-table', 1)];
    const spend = files.find((f) => tsvRows(f.text)[0]?.startsWith('st\tstate\tfy')) ?? files[0];
    const str = files.find((f) => tsvRows(f.text)[0]?.startsWith('st\tstate\tyear')) ?? files[1];
    const sRows = tsvRows(spend.text);
    assert.deepEqual(sRows[0].split('\t'), SPEND, 'the spend header');
    assert.equal(sRows.length - 1, STATE_ROWS.length, `${STATE_ROWS.length} spend rows`);
    const iHead = SPEND.indexOf('head');
    for (const r of STATE_ROWS.filter((x) => x.head !== STATE_SERIES_HEAD)) assert.ok(sRows.some((l) => l.split('\t')[iHead] === r.head), `own-series/PRS row keeps its own head "${r.head.slice(0, 50)}"`);
    const tRows = tsvRows(str.text);
    assert.deepEqual(tRows[0].split('\t'), STR, 'the strength header');
    assert.equal(tRows.length - 1, STRENGTH_ST.length, `${STRENGTH_ST.length} strength rows`);
    const iD = STR.indexOf('derived_counts');
    const iNote = STR.indexOf('note');
    for (const l of tRows.slice(1)) {
      const c = l.split('\t');
      assert.equal(c[iD] === 'true', /DERIVED/.test(c[iNote]), `derived_counts is true exactly for a DERIVED note (${c[0]} ${c[2]})`);
    }
  });
});

test('AC-103 — Match the kind matrix to 36 × every declared kind, and the place list to the dots', async (t) => {
  if (!requireFull(t)) return;
  await withPage('D', async (page) => {
    await load(page, '/security?lens=footprint');
    await openTwin(page, 'footprint-matrix');
    const tbl = await twinTable(page, 'footprint-matrix');
    assert.equal(tbl.rows.length, 36, '36 rows');
    const cols = KINDS.map((k) => tbl.headers.findIndex((h) => new RegExp('^' + k.replace(/-/g, '[ -]'), 'i').test(h)));
    assert.ok(cols.every((i) => i >= 0), 'a column per declared kind');
    assert.ok(window_col(tbl, 'cities') >= 0, 'plus cities');
    let total = 0;
    tbl.rows.forEach((row, ri) => {
      const st = UNITS[ri];
      KINDS.forEach((k, ki) => {
        const n = FOOTPRINT.filter((r) => r.st === st && r.kind === k).length;
        const c = row[cols[ki]];
        assert.equal(c, n ? String(n) : 'no row', `${st} ${k}`);
        total += n ? int(c) : 0;
      });
    });
    assert.equal(total, FOOTPRINT.length, 'Σ cells = FORCE_FOOTPRINT.length');
    const dots = await page.evaluate(() => { const b = window.__ac.qq('F1'); return b.querySelectorAll('[data-dot]').length + [...b.querySelectorAll('[data-overflow]')].reduce((s, e) => s + Number(e.getAttribute('data-overflow')), 0); });
    const pages = await allTwinPages(page, 'places', '/security?lens=footprint');
    const rows = pages.flatMap((p) => p.rows);
    assert.equal(rows.length, dots, 'TWIN(places) rows = dots + overflow');
    const hdr = pages[0].headers;
    const iSrc = window_col({ headers: hdr }, 'Sources');
    const iLabel = window_col({ headers: hdr }, 'Label') >= 0 ? window_col({ headers: hdr }, 'Label') : 0;
    for (const r of FOOTPRINT) {
      const row = rows.find((x) => x[iLabel] === r.label || x.includes(r.label));
      assert.ok(row, `places lists ${r.id}`);
      for (const [l] of r.srcs) assert.ok(row[iSrc]?.includes(l), `${r.id}: source "${l.slice(0, 50)}" printed`);
      if (r.since === null) assert.ok(row.includes('date not printed on the list'), `${r.id}: "date not printed on the list"`);
    }
    const order = [...FOOTPRINT].sort((a, b) => UNITS.indexOf(a.st) - UNITS.indexOf(b.st) || cmp(a.city, b.city) || cmp(a.label, b.label)).map((r) => r.label);
    assert.deepEqual(rows.map((x) => order.find((l) => x.includes(l))), order, 'rows ordered state (north to south), city, label');
  });
});

test('AC-104 — Match the award twin to marks, unpriced contracts and empty years', async (t) => {
  if (!requireFull(t)) return;
  await withPage('D', async (page) => {
    await load(page, '/security?lens=procurement');
    const marks = await page.evaluate(() => ({ a: document.querySelectorAll('[data-mark="award"]').length, joint: document.querySelectorAll('[data-mark="award"]:not([data-cr])').length, u: document.querySelectorAll('[data-mark="award-unpriced"]').length }));
    await openTwin(page, 'awards');
    const tbl = await twinTable(page, 'awards');
    const jointExtra = JOINT ? Math.max(0, marks.joint - 1) : 0;
    assert.equal(tbl.rows.length, marks.a - jointExtra + marks.u + EMPTY_YEARS.length, 'rows = award marks (a joint pair counted once) + unpriced marks + empty years');
    if (JOINT) assert.ok(tbl.rows.some((r) => /joint total ₹[\d,.]+ cr announced for .+; not split/.test(r.join(' '))), 'the joint row is printed once, not split');
    const btns = await page.locator('details[data-twin="awards"] button').evaluateAll((els) => els.map((e) => window.__ac.name(e)).filter((n) => /^Open record: /.test(n)));
    assert.equal(btns.length, AWARDS.length, 'each award row has "Open record: {vendor}, {date}"');
    const iClass = window_col(tbl, 'class');
    for (const r of tbl.rows.filter((x) => !/no named contract in/.test(x.join(' ')))) assert.ok(['public sector', 'private, JV or foreign', 'unclassified'].includes(r[iClass]), `class cell "${r[iClass]}" is words, never state/capital`);
    const iResp = window_col(tbl, 'response');
    for (const r of tbl.rows.filter((x) => !/no named contract in/.test(x.join(' ')))) assert.ok(r[iResp] === NO_RESPONSE || /^Response from /.test(r[iResp]), `response cell "${r[iResp]?.slice(0, 60)}"`);
    await page.locator('details[data-twin="awards"] button').filter({ hasText: /^Open record: / }).first().click();
    await waitParam(page, 'rec');
  });
});

test('AC-105 — Match the slice twin to classes, two reference rows and class-years, with the share computed here', async (t) => {
  if (!requireFull(t)) return;
  if (!need(t, S8, 'S8 absent: no slice')) return;
  await withPage('D', async (page) => {
    await load(page, '/security?lens=procurement', { slice: true });
    await openTwin(page, 'slice');
    const tbl = await twinTable(page, 'slice');
    assert.equal(tbl.rows.length, SLICE.rates.byClass.length + 2 + SLICE.rates.byClassYear.length, 'rows = classes + 2 references + class-years');
    for (const c of SLICE.rates.byClass) {
      const q = SLICE.quality.byClass.find((x) => x.class === c.class);
      const share = round2((q.dedupRows / SLICE.quality.total.dedupRows) * 100);
      const row = tbl.rows.find((r) => r[0] === c.class || r[0].startsWith(c.class)) ?? tbl.rows.find((r) => r.includes(c.class));
      const s = row?.join(' | ') ?? '';
      assert.ok(s.includes('computed here') && (s.includes(`${share}%`) || s.includes(`${share.toFixed(2)}%`)), `${c.class}: share ${share}% computed here`);
    }
    // Key class-year rows on the spec's `class` and `year` columns (§5.3.2 Twin), never on row substrings: a class
    // definition may itself name a year (dpsu: "carved out of the Ordnance Factory Board in 2021"). Exact header match —
    // a prefix match would read `whole file same portal` for `whole file`.
    const col = (name) => tbl.headers.findIndex((h) => h.trim().toLowerCase() === name.toLowerCase());
    const [iC, iY, iN, iR, iLo, iHi, iWsp, iWf] = ['class', 'year', 'n', 'rate', 'Wilson low', 'high', 'whole file same portal', 'whole file'].map(col);
    for (const [k, i] of Object.entries({ iC, iY, iN, iR, iLo, iHi, iWsp, iWf })) assert.ok(i >= 0, `slice twin has column ${k} (headers ${JSON.stringify(tbl.headers)})`);
    const yearRows = tbl.rows.filter((r) => r[iY] !== 'all years');
    assert.equal(yearRows.length, SLICE.rates.byClassYear.length, 'class-year rows = byClassYear.length');
    const val = (cell) => num(ungroup(cell ?? '').replace(/%$/, ''));
    const eq = (cell, v, what) => assert.ok(Math.abs(val(cell) - v) <= 0.005, `${what}: "${cell}" = ${v}`);
    for (const y of SLICE.rates.byClassYear) {
      const yearOk = (cell) => (/^\d{4}$/.test(y.year) ? cell === y.year : (cell ?? '').startsWith(y.year));
      const hits = yearRows.filter((r) => (r[iC] ?? '').split(' ')[0] === y.class && yearOk(r[iY]));
      assert.equal(hits.length, 1, `class-year ${y.class} ${y.year}: exactly one row whose class cell is the class and whose year cell is the year`);
      const row = hits[0];
      const tag = `${y.class} ${y.year}`;
      eq(row[iN], y.n, `${tag} n`);
      if (y.n < 10) {
        assert.equal(row[iR], `n ${y.n}: no rate drawn`, `${tag}: "n ${y.n}: no rate drawn"`);
      } else {
        eq(row[iR], y.singleBidderPct, `${tag} rate`);
        eq(row[iLo], y.wilson95[0], `${tag} Wilson low`);
        eq(row[iHi], y.wilson95[1], `${tag} high`);
      }
      if (y.wholeFileSamePortal?.singleBidderPct != null) eq(row[iWsp], y.wholeFileSamePortal.singleBidderPct, `${tag} whole file same portal`);
      eq(row[iWf], y.wholeFile.singleBidderPct, `${tag} whole file`);
    }
    const tsv = await downloadTsv(page, 'slice');
    const head = tsv.text.split('\n').filter((l) => l.startsWith('#')).join('\n');
    assert.ok(head.includes(SLICE.quality.afterDedup?.rule ?? SLICE.provenance.dedupRule), 'the TSV header carries the dedup rule');
    for (const i of SLICE.provenance.inputs) assert.ok(head.includes(i.sha256_16), `the TSV header carries digest ${i.sha256_16}`);
  });
});

test('AC-106 — Match the case-timeline twin to the ticks and the field table to the columns', async (t) => {
  if (!requireFull(t)) return;
  const fixture = CASES.flatMap((c) => CASE_FILE(c)).find((e) => /CBI/.test(e.lab ?? '') && /Court|Tribunal/i.test(labelOf(e.s))) ?? null;
  await withPage('D', async (page) => {
    await load(page, '/security?lens=procurement');
    const marks = await page.evaluate(() => document.querySelectorAll('[data-mark="case"]').length + document.querySelectorAll('[data-mark="response"]').length);
    await openTwin(page, 'case-timeline');
    const tbl = await twinTable(page, 'case-timeline');
    assert.equal(tbl.rows.length, marks, 'case-timeline rows = case ticks + response ticks');
    const iKind = window_col(tbl, 'kind');
    for (const r of tbl.rows) {
      assert.ok(['court', 'audit', 'investigation', 'allegation', 'decision', 'response'].includes(r[iKind]), `kind "${r[iKind]}" ∈ the fixed set`);
    }
    if (fixture) {
      const row = tbl.rows.find((r) => r.some((c) => c.includes(fixture.lab)));
      assert.equal(row?.[iKind], 'court', `${fixture.id}: a CBI-worded record whose source is a court reads "court"`);
    } else t.diagnostic('AC-106: SKIPPED clause — no CBI-worded record from a court in the module');
    const cases = await count(page, '[data-case]:not([data-case="none"])');
    assert.equal(cases, CASES.length, `[data-case]:not([data-case="none"]) = CASES.length (${CASES.length})`);
    assert.equal(await openTwinRows(page, 'case-fields'), cases * 11, `TWIN(case-fields) = ${cases} × 11`);
  });
});

test('AC-107 — Match the Delhi line twin to its points and the city ledger to the commissionerates plus Delhi', async (t) => {
  if (!requireFull(t)) return;
  const pts = uniq(UNION_ROWS.filter((r) => r.body === DELHI_POLICE).map((r) => `${r.fy}:${r.stage}`));
  const runs = sum(STAGES.map((s) => {
    const present = FY_AXIS.map((fy) => pts.includes(`${fy}:${s}`));
    return present.filter((p, i) => p && !present[i - 1]).length;
  }));
  await withPage('D', async (page) => {
    await load(page, '/security');
    const r = await page.evaluate(() => {
      const fig = window.__ac.q('B7')?.querySelector('figure');
      return { marks: document.querySelectorAll('[data-mark="delhi"]').length, paths: fig ? fig.querySelectorAll('path:not([data-fill-class])').length : -1 };
    });
    assert.equal(r.marks, pts.length, `[data-mark="delhi"] = ${pts.length} (fy, stage) points`);
    assert.equal(r.paths, runs, `${runs} line segments: none spans a missing FY`);
    await openTwin(page, 'delhi');
    const tbl = await twinTable(page, 'delhi');
    assert.equal(tbl.rows.length, pts.length, `TWIN(delhi) rows = ${pts.length}`);
    const btns = await page.locator('details[data-twin="delhi"] button').evaluateAll((els) => els.map((e) => window.__ac.name(e)));
    for (const p of pts) { const [fy, st] = p.split(':'); assert.ok(btns.includes(`Open the line: Delhi Police ${fy} ${st}`), `"Open the line: Delhi Police ${fy} ${st}"`); }
    for (const row of tbl.rows) {
      const s = row.join(' | ');
      const [fy, st] = [FY_AXIS.find((f) => s.includes(f)), STAGES.find((x) => s.includes(x))];
      const pol = POLICE(fy, st);
      assert.equal(/computed here/.test(s), !!(pol && pol.total != null), `${fy} ${st}: a share computed here only where the police total exists`);
    }
    assert.equal(await openTwinRows(page, 'city-ledger'), COMMISSIONERATES.length + 1, `TWIN(city-ledger) = ${COMMISSIONERATES.length} + 1`);
  });
});

test('AC-108 — Head every TSV with its provenance and name the file `security-`', async (t) => {
  if (!requireFull(t)) return;
  const OTHER_RUNS = OTHER_FLEETS.flatMap((m) => Object.entries(m).filter(([k]) => /_META$/.test(k)).map(([, v]) => v?.runId)).filter(Boolean);
  await withPage('D', async (page) => {
    for (const lens of LENSES) {
      const files = await allTsvs(page, lens);
      assert.ok(files.length > 0, `${lens}: TSV downloads exist`);
      for (const f of files) {
        assert.match(f.name, new RegExp(`^security-(budgets|footprint|procurement)-[a-z0-9-]+-\\d{4}-\\d{2}-\\d{2}-run-[0-9a-f]+\\.tsv$`), `${f.name}: the file name`);
        const lines = f.text.split('\n');
        const heads = lines.filter((l) => l.startsWith('#'));
        for (const [i, p] of ['# table:', '# rows:', '# url:', '# lens:'].entries()) assert.ok(lines[i]?.startsWith(p), `${f.name}: line ${i + 1} begins "${p}"`);
        assert.ok(heads.some((l) => l.startsWith(`# force ${RUN} asOf ${ASOF}`)), `${f.name}: "# force ${RUN} asOf ${ASOF}"`);
        if (f.twin === 'slice') assert.ok(heads.some((l) => /^# open-market slice \S+ asOf \d{4}-\d{2}-\d{2}/.test(l)), `${f.name}: the slice line`);
        const rows = tsvRows(f.text);
        const hdr = rows[0]?.split('\t') ?? [];
        if (hdr.includes('cr')) assert.ok(heads.some((l) => /^# amounts: ₹ crore, nominal, as published; not deflated; stage (BE|RE|actual)/.test(l)), `${f.name}: the amounts line`);
        for (const l of heads) {
          assert.ok(!/\b(finance|ngo|capital)\b/.test(l), `${f.name}: no # line names another fleet ("${l}")`);
          for (const r of OTHER_RUNS) assert.ok(!l.includes(r), `${f.name}: no other fleet's run id`);
        }
        const numeric = hdr.map((h, i) => (/^(cr|.*_cr|fy_start|year|per_lakh|sanctioned|actual|women_pct|pct_gsdp|n|rate|low|high)$/.test(h) ? i : -1)).filter((i) => i >= 0);
        for (const l of rows.slice(1)) for (const i of numeric) { const v = l.split('\t')[i]; assert.ok(v === '' || v == null || Number.isFinite(Number(v)), `${f.name}: ${hdr[i]} "${v}" parses as a number or is empty`); }
      }
    }
    await load(page, '/security?view=table');
    const d = twin(page, 'stack');
    const copy = d.getByRole('button', { name: /^Copy as TSV — / }).first();
    const name = (await copy.getAttribute('aria-label')) ?? (await text(copy));
    await copy.click();
    await page.waitForTimeout(200);
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    const dl = await downloadTsv(page, 'stack');
    assert.equal(clip, dl.text, 'Copy as TSV writes the same text as the download');
    const table = name.replace(/^Copy as TSV — /, '');
    assert.ok((await liveText(page)).includes(`${table} copied, ${tsvRows(dl.text).length - 1} rows`), 'the live region reads "{table} copied, {rows} rows"');
  });
});

test('AC-109 — Print the class\'s meaning in every twin, never the token', async (t) => {
  if (!requireFull(t)) return;
  const TOKENS = ['hatch', 'stipple', 'crosshatch', 'hollow', 'value', 'zero', 'hidden', 'state', 'capital', 'none'];
  await withPage('D', async (page) => {
    for (const lens of LENSES) {
      await load(page, route(lens, 'view=table'), { slice: lens === 'procurement' && S8 });
      assert.ok(await count(page, 'details[data-twin] td') > 0, `${lens}: the twins print cells to check`);
      const bad = await page.evaluate((tok) => [...document.querySelectorAll('details[data-twin] td')].map((c) => window.__ac.txt(c)).filter((s) => tok.includes(s)), TOKENS);
      assert.deepEqual(bad, [], `${lens}: no twin cell holds a bare class token`);
    }
  });
});

test('AC-110 — Open every twin under `view=table` and hide the drawings', async (t) => {
  if (!requireFull(t)) return;
  await withPage('D', async (page) => {
    for (const lens of LENSES) {
      await load(page, route(lens, 'view=table'), { slice: lens === 'procurement' && S8 });
      const r = await page.evaluate(() => ({
        closed: document.querySelectorAll('details[data-twin]:not([open])').length,
        noCaption: [...document.querySelectorAll('[data-twin] table')].filter((t) => !window.__ac.txt(t.querySelector('caption'))).length,
        svgs: [...document.querySelectorAll('figure svg')].filter((s) => window.__ac.visible(s) && !s.closest('details[data-twin]')).length,
        rows: Object.fromEntries([...document.querySelectorAll('details[data-twin]')].map((d) => [d.getAttribute('data-twin'), d.querySelectorAll('tbody tr').length])),
      }));
      assert.ok(Object.keys(r.rows).length > 0, `${lens}: the lens has table twins`);
      assert.equal(r.closed, 0, `${lens}: no closed twin`);
      assert.equal(r.noCaption, 0, `${lens}: every twin table has a <caption>`);
      assert.equal(r.svgs, 0, `${lens}: no visible svg inside a <figure>`);
      await load(page, LENS_ROUTE[lens], { slice: lens === 'procurement' && S8 });
      for (const [name, n] of Object.entries(r.rows)) assert.equal(await openTwinRows(page, name), n, `${lens} ${name}: the same rows at rest`);
    }
  });
});

// ---------------------------------------------------------------------------
// §8 Keyboard reachability — FULL build
// ---------------------------------------------------------------------------

const activeInfo = (page) => page.evaluate(() => { const a = document.activeElement; return a ? { tag: a.tagName.toLowerCase(), name: window.__ac.name(a), id: a.id, role: a.getAttribute('role'), text: window.__ac.txt(a).slice(0, 120) } : null; });
const AXIS_NAME = /^\d{4}-\d{2}, (BE|RE|actual): defence ₹[\d,.]+ crore in \d+ demands, computed here, pensions [\d.]+ percent, (equals the published total|exceeds the published total .+|no published total); police ₹[\d,.]+ crore$|^\d{4}-\d{2}, no (BE|RE|actual) rows recorded$/;
const CELL_NAME = /^.+ — (total|revenue|capital|pay|pension|other) — .+, FY\d{4}-\d{2}: BE (₹[\d,.]+ crore|no row), RE (₹[\d,.]+ crore|no row), actual (₹[\d,.]+ crore|no row) — open for its share of the demand and the previous year$/;

test('AC-111 — Drive the lens tabs with arrows and activate on Enter, not on focus', async (t) => {
  if (!requireFull(t)) return;
  await withPage('D', async (page) => {
    await load(page, '/security');
    const tabs = await page.evaluate(() => { const l = document.querySelector('[role="tablist"]'); return l ? [...l.querySelectorAll('[role="tab"]')].map((x) => window.__ac.name(x)) : null; });
    assert.deepEqual(tabs, LENSES.map((l) => LENS_TAB[l]), 'three tabs named Budgets, Footprint, Procurement and people');
    await tab(page, 'budgets').focus();
    const url0 = page.url();
    await page.keyboard.press('ArrowRight');
    assert.equal((await activeInfo(page))?.name, 'Footprint', 'ArrowRight moves focus to Footprint');
    assert.equal(await tab(page, 'budgets').getAttribute('aria-selected'), 'true', 'aria-selected is unchanged');
    assert.equal(page.url(), url0, 'the URL is unchanged');
    for (const [lens, key] of [['footprint', 'Enter'], ['procurement', ' ']]) {
      if (lens === 'procurement') { await tab(page, 'procurement').focus(); }
      await page.keyboard.press(key === ' ' ? 'Space' : key);
      await waitParam(page, 'lens', lens);
      const r = await page.evaluate((name) => {
        const t = [...document.querySelectorAll('[role="tab"]')].find((x) => window.__ac.name(x) === name);
        const p = document.querySelector(`[role="tabpanel"][aria-labelledby="${t?.id}"]`);
        return { panel: !!p && !!t?.id, h2: window.__ac.txt(p?.querySelector('h2')), focus: document.activeElement === p?.querySelector('h2') };
      }, LENS_TAB[lens]);
      assert.ok(r.panel, `${lens}: the panel's aria-labelledby is the tab's id`);
      assert.equal(r.h2, LENS_TAB[lens], `${lens}: its h2`);
      assert.ok(r.focus, `${lens}: focus moves to that h2`);
    }
  });
});

test('AC-112 — Reach the stack\'s FY axis in one tab stop and open a year with Enter', async (t) => {
  if (!requireFull(t)) return;
  await withPage('D', async (page) => {
    await load(page, '/security');
    const n = await tabsTo(page, 15, '(el) => /^\\d{4}-\\d{2}, /.test(window.__ac.name(el))');
    assert.ok(n <= 15, `an FY axis button within 15 tab stops (took ${n})`);
    const btns = await axisButtons(page);
    assert.equal(btns.filter((b) => b.tabindex === '0').length, 1, 'exactly one axis button has tabindex="0"');
    for (const b of btns) assert.match(b.name, AXIS_NAME, `axis button name "${b.name}"`);
    await focusAxis(page, FY_AXIS[0]);
    await page.keyboard.press('ArrowRight');
    assert.ok((await activeInfo(page)).name.startsWith(`${FY_AXIS[1]}, `), 'ArrowRight moves along FY_AXIS');
    await page.keyboard.press('ArrowLeft');
    assert.ok((await activeInfo(page)).name.startsWith(`${FY_AXIS[0]}, `), 'ArrowLeft moves back');
    await page.keyboard.press('End');
    assert.ok((await activeInfo(page)).name.startsWith(`${FY_AXIS.at(-1)}, `), 'End → the last FY');
    await page.keyboard.press('Home');
    assert.ok((await activeInfo(page)).name.startsWith(`${FY_AXIS[0]}, `), 'Home → the first FY');
    const fy = LATEST_FY(DEFAULT_STAGE);
    await focusAxis(page, fy);
    await page.keyboard.press('Enter');
    await page.waitForFunction((f) => document.activeElement?.tagName === 'H2' && document.activeElement.textContent.includes(f), fy, { timeout: ACTION_TIMEOUT });
    const ro = await panel(page, esc(fy));
    for (const r of DEFENCE_DEMANDS(fy, DEFAULT_STAGE)) assert.ok(ro.text.includes(r.head), `the readout lists ${r.head}`);
    assert.ok(ro.text.includes(`read to ${ASOF} · document: `), 'read to {ASOF} · document: {label}');
    assert.ok(STACK(fy, DEFAULT_STAGE).published != null ? /published total/.test(ro.text) : ro.text.includes('no published all-demands total for this FY'), 'the published total or its absence');
    assert.ok(/\d+ pay lines/.test(ro.text), '{k} pay lines');
    assert.ok(/police/i.test(ro.text) && ro.text.includes('Delhi Police'), 'the police check and Delhi Police');
    await page.keyboard.press('Escape');
    assert.ok((await activeInfo(page)).name.startsWith(`${fy}, `), 'Escape returns focus to the axis button');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-current')), 'true', 'the chosen button has aria-current');
    const skip = await page.evaluate(() => { const fig = document.querySelector('[data-q="B1"] figure'); const a = [...document.querySelectorAll('a')].find((x) => window.__ac.txt(x) === 'Skip to the table' && window.__ac.precedes(x, fig) && x.closest('[data-q="B1"]')); return !!a; });
    assert.ok(skip, 'a "Skip to the table" link precedes the figure');
    await page.locator('[data-q="B1"] a').filter({ hasText: /^Skip to the table$/ }).first().click();
    assert.ok(await twin(page, 'stack').evaluate((d) => d.open), 'it opens TWIN(stack)');
  });
});

test('AC-113 — Drive the ledger as a grid with a roving tabindex', async (t) => {
  if (!requireFull(t)) return;
  await withPage('D', async (page) => {
    await load(page, '/security');
    const g = await page.evaluate(() => {
      const grid = document.querySelector('[role="grid"]');
      if (!grid) return null;
      return {
        rows: Number(grid.getAttribute('aria-rowcount')), cols: Number(grid.getAttribute('aria-colcount')),
        lanes: grid.querySelectorAll('[data-lane]').length,
        rowTh: grid.querySelectorAll('th[scope="row"]').length, colTh: grid.querySelectorAll('th[scope="col"]').length,
        tabbable: [...grid.querySelectorAll('[tabindex="0"]')].length,
        names: [...grid.querySelectorAll('[aria-label]')].map((e) => e.getAttribute('aria-label')).filter((n) => / — open for /.test(n)),
        barsHidden: [...grid.querySelectorAll('rect, [data-slot]')].every((b) => !!b.closest('[aria-hidden="true"]')),
      };
    });
    assert.ok(g, 'a [role="grid"] ledger');
    assert.ok(g.rows >= g.lanes + 1, `aria-rowcount ${g.rows} = lanes ${g.lanes} + header rows`);
    assert.equal(g.cols, FY_AXIS.length + 2, 'aria-colcount = FYs + label and max columns');
    assert.equal(g.rowTh, g.lanes, 'lane labels are th[scope="row"]');
    assert.ok(g.colTh >= FY_AXIS.length, 'FYs are th[scope="col"]');
    assert.equal(g.tabbable, 1, 'one roving tab stop');
    for (const n of g.names) assert.match(n, CELL_NAME, `cell name "${n.slice(0, 100)}"`);
    assert.ok(g.barsHidden, 'bars are aria-hidden');
    const n = await tabsTo(page, 20, '(el) => !!el.closest(\'[role="grid"]\') && el.getAttribute("tabindex") === "0"');
    assert.ok(n <= 20, `Tab reaches the grid within 20 stops (took ${n})`);
    const a0 = (await activeInfo(page)).name;
    await page.keyboard.press('ArrowRight');
    const a1 = (await activeInfo(page)).name;
    assert.notEqual(a1, a0, 'ArrowRight moves by FY');
    await page.keyboard.press('ArrowDown');
    assert.notEqual((await activeInfo(page)).name, a1, 'ArrowDown moves by lane');
    await page.keyboard.press('End');
    assert.ok((await activeInfo(page)).name.includes(`FY${FY_AXIS.at(-1)}:`), 'End → the lane\'s last FY');
    await page.keyboard.press('Home');
    assert.ok((await activeInfo(page)).name.includes(`FY${FY_AXIS[0]}:`), 'Home → the lane\'s first FY');
    await page.keyboard.press('Tab');
    assert.ok(!(await page.evaluate(() => !!document.activeElement?.closest('[role="grid"]'))), 'Tab leaves the grid in one stop');
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Enter');
    await waitParam(page, 'cell');
    assert.ok(await page.evaluate(() => document.activeElement?.tagName === 'H2'), 'Enter writes cell and moves focus to the CellCard h2');
  });
});

test('AC-114 — Drive the three maps as listboxes and announce each unit', async (t) => {
  if (!requireFull(t)) return;
  const st = STATE_SAMPLE;
  await withPage('D', async (page) => {
    for (const [lens, q, k] of [['budgets', 'B6', 0], ['budgets', 'B6', 1], ['footprint', 'F1', 0]]) {
      await load(page, LENS_ROUTE[lens]);
      const m = await mapOptions(page, q, k);
      assert.ok(m, `${q} map ${k + 1} is an svg[role="listbox"]`);
      assert.equal(m.options.length, 36, `${q} map ${k + 1}: 36 options`);
      m.options.forEach((o, i) => assert.ok(o.name.startsWith(`${STATE_NAME.get(UNITS[i])}: `), `${q} map ${k + 1}: option ${i + 1} is ${UNITS[i]} ("${o.name.slice(0, 60)}")`));
      if (q === 'F1') for (const [i, o] of m.options.entries()) {
        const n = FOOTPRINT.filter((r) => r.st === UNITS[i]).length;
        if (n) assert.ok(new RegExp(`^${esc(STATE_NAME.get(UNITS[i]))}: ${n} installations? in \\d+ cit(y|ies)`).test(o.name), `F1 ${UNITS[i]}: "{State}: {k} installations in {c} cities"`);
      }
      const bad = await page.evaluate(([id, kk]) => { const s = [...window.__ac.qq(id).querySelectorAll('svg[role="listbox"]')][kk]; return { focusPaths: [...s.querySelectorAll('path')].filter((p) => p.hasAttribute('tabindex') && p.getAttribute('tabindex') !== '-1').length, shapes: [...s.querySelectorAll('path, circle, rect')].filter((e) => !e.closest('[aria-hidden="true"]')).length }; }, [q, k]);
      assert.equal(bad.focusPaths, 0, `${q} map ${k + 1}: no path is focusable`);
      assert.equal(bad.shapes, 0, `${q} map ${k + 1}: every shape is aria-hidden`);
    }
    await load(page, '/security');
    const n = await tabsTo(page, 30, '(el) => el.matches(\'svg[role="listbox"]\') || !!el.closest(\'svg[role="listbox"]\')');
    assert.ok(n <= 30, `Tab into the spend map within 30 stops (took ${n})`);
    const ad0 = await page.evaluate(() => document.activeElement.getAttribute('aria-activedescendant'));
    await page.keyboard.press('ArrowDown');
    const ad1 = await page.evaluate(() => document.activeElement.getAttribute('aria-activedescendant'));
    assert.ok(ad1 && ad1 !== ad0, 'ArrowDown moves aria-activedescendant');
    const target = UNITS.indexOf(st);
    for (let i = 0; i < 40; i++) {
      const cur = await page.evaluate(() => { const id = document.activeElement.getAttribute('aria-activedescendant'); return id ? window.__ac.name(document.getElementById(id)) : ''; });
      if (cur.startsWith(`${STATE_NAME.get(st)}: `)) break;
      await page.keyboard.press(i < target + 1 ? 'ArrowDown' : 'ArrowUp');
    }
    await page.keyboard.press('Enter');
    await waitParam(page, 'st', st);
    assert.equal((await activeInfo(page))?.tag, 'h2', 'Enter moves focus to the StatePanel h2');
    await page.keyboard.press('Escape');
    await waitNoParam(page, 'st');
    assert.ok(await page.evaluate(() => !!document.activeElement?.closest('svg[role="listbox"]') || document.activeElement?.getAttribute('role') === 'option'), 'Escape returns focus to the option');
  });
});

test('AC-115 — Put nothing focusable inside a hidden drawing', async (t) => {
  if (!requireFull(t)) return;
  await withPage('D', async (page) => {
    const cell = await cellParam(page);
    const states = [...LENSES.map((l) => LENS_ROUTE[l]), `/security?cell=${encodeURIComponent(cell)}`, `/security?st=${STATE_SAMPLE}`, `/security?lens=procurement&vendor=${encodeURIComponent(VENDOR_NO_AWARD ?? VENDORS[0])}`, `/security?lens=procurement&case=${encodeURIComponent(CASES[0])}`, `/security?lens=procurement&rec=${encodeURIComponent((ENFORCE_WITH_CONTRA ?? EDGES[0]).id)}`, ...LENSES.map((l) => route(l, 'view=table'))];
    for (const r of states) {
      await load(page, r);
      const x = await page.evaluate((tb) => ({
        hidden: document.querySelectorAll(`[aria-hidden="true"] :is(${tb})`).length,
        img: document.querySelectorAll(`[role="img"] :is(${tb})`).length,
        award: document.querySelectorAll('[data-mark="award"] :is(a, button)').length,
        agni: [...document.querySelectorAll('[data-tick="agnipath"], [data-mark="delhi"]')].filter((e) => e.tagName === 'A' || e.hasAttribute('tabindex')).length,
      }), TABBABLE);
      assert.equal(x.hidden, 0, `${r}: nothing TABBABLE inside [aria-hidden="true"]`);
      assert.equal(x.img, 0, `${r}: nothing TABBABLE inside [role="img"]`);
      assert.equal(x.award, 0, `${r}: no link or button inside an award mark`);
      assert.equal(x.agni, 0, `${r}: the Agnipath tick and the Delhi marks are not links and have no tabindex`);
    }
  });
});

test('AC-116 — Keep every closed twin out of the accessibility tree and open it from its skip link', async (t) => {
  if (!requireFull(t)) return;
  await withPage('D', async (page) => {
    for (const lens of LENSES) {
      await load(page, LENS_ROUTE[lens]);
      const closed = await page.evaluate(() => [...document.querySelectorAll('details[data-twin]:not([open])')].map((d) => ({
        name: d.getAttribute('data-twin'),
        content: window.__ac.txt(d).replace(window.__ac.txt(d.querySelector('summary')), '').trim(),
        tabbables: [...d.querySelectorAll(window.__ac.TABBABLE)].filter((e) => e.tagName !== 'SUMMARY' && window.__ac.visible(e)).length,
      })));
      assert.ok(closed.length > 0, `${lens}: closed twins exist`);
      for (const c of closed) {
        assert.equal(c.content, '', `${lens} ${c.name}: closed content exposes no text`);
        assert.equal(c.tabbables, 0, `${lens} ${c.name}: closed content holds no tab stop`);
      }
      const first = closed[0].name;
      await openTwin(page, first);
      const inside = await page.evaluate((n) => window.__ac.tabbables(document.querySelector(`details[data-twin="${n}"]`)).filter((e) => e.tagName !== 'SUMMARY').length, first);
      assert.ok(inside >= 1, `${lens} ${first}: open, its controls are tabbable`);
      await load(page, LENS_ROUTE[lens]);
      const skips = page.locator('a').filter({ hasText: /^Skip to the table$/ });
      assert.ok(await skips.count() >= 1, `${lens}: "Skip to the table" links precede the graphics`);
      await skips.first().click();
      assert.ok(await page.evaluate(() => document.activeElement?.tagName === 'CAPTION' || !!document.activeElement?.closest('caption')), `${lens}: the skip link moves focus to the twin's <caption>`);
      const all = page.locator('a, button').filter({ hasText: new RegExp(`^${esc(LINK_ALL_TABLES)}$`) }).first();
      assert.ok(await page.evaluate((s) => { const tabsEl = [...document.querySelectorAll('[role="tab"]')].pop(); const a = [...document.querySelectorAll('a, button')].find((x) => window.__ac.txt(x) === s); return !!a && window.__ac.precedes(tabsEl, a); }, LINK_ALL_TABLES), `${lens}: "${LINK_ALL_TABLES}" sits after the tabs`);
      await all.click();
      await waitParam(page, 'view', 'table');
    }
  });
});

test('AC-117 — Announce every change through one live region, in words', async (t) => {
  if (!requireFull(t)) return;
  await withPage('D', async (page) => {
    await load(page, '/security');
    assert.equal(await count(page, '[aria-live]'), 1, 'exactly one [aria-live]');
    assert.equal(await page.locator('[aria-live]').getAttribute('aria-live'), 'polite', 'polite');
    await stageOption(page, STAGES.find((s) => s !== DEFAULT_STAGE)).click();
    await page.waitForTimeout(300);
    let l = ungroup(await liveText(page));
    assert.match(l, /from (\d+) to (\d+) rows/, 'a Stage change announces from N to k rows');
    assert.ok(!l.includes('→'), 'no arrow in the live region');
    await tab(page, 'footprint').click();
    await page.waitForTimeout(300);
    assert.ok(/Footprint/.test(await liveText(page)), 'a lens change names the lens');
    await load(page, `/security?cell=${encodeURIComponent(await cellParam(page))}`);
    await page.getByRole('button', { name: /^Copy citation/ }).first().click();
    await page.waitForTimeout(300);
    assert.ok((await liveText(page)).includes('Citation copied'), 'Copy citation → "Citation copied"');
    await load(page, '/security');
    await focusAxis(page, LATEST_FY(DEFAULT_STAGE));
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    const title = (await panel(page, esc(LATEST_FY(DEFAULT_STAGE))))?.h2;
    assert.ok(title && (await liveText(page)).includes(title), 'choosing an FY announces the readout title');
    const arrows = await page.evaluate(() => [...document.querySelectorAll('[aria-describedby]')].flatMap((e) => e.getAttribute('aria-describedby').split(/\s+/)).map((id) => document.getElementById(id)).filter((e) => e && e.textContent.includes('→')).length);
    assert.equal(arrows, 0, 'no aria-describedby target contains →');
    await load(page, '/security');
    const changes = await page.evaluate(async () => {
      const lr = document.querySelector('[aria-live]');
      let n = 0;
      const mo = new MutationObserver(() => { n++; });
      mo.observe(lr, { childList: true, characterData: true, subtree: true });
      const toggles = [...document.querySelectorAll('button[aria-pressed]')].filter((b) => /^(alleged|analytic)\b/.test(window.__ac.txt(b)));
      toggles[0]?.click();
      await new Promise((r) => setTimeout(r, 50));
      toggles[1]?.click();
      await new Promise((r) => setTimeout(r, 700));
      mo.disconnect();
      return n;
    });
    assert.equal(changes, 1, 'two filter changes within 150 ms produce one message');
  });
});

test('AC-118 — Keep unavailable options reachable by keyboard, never `disabled`, with the reason in the name', async (t) => {
  if (!requireFull(t)) return;
  const REASONS = /GSDP in this build is for|no population series|none in this register|does not apply|not budget rows/;
  await withPage('D', async (page) => {
    for (const lens of LENSES) {
      await load(page, LENS_ROUTE[lens]);
      const els = await page.evaluate(() => [...document.querySelectorAll('[aria-disabled="true"]')].map((e) => ({
        tag: e.tagName.toLowerCase(), disabledAttr: e.hasAttribute('disabled'),
        focusable: (() => {
          if (e.tagName === 'OPTION') { const s = e.closest('select'); return !!s && !s.disabled && s.tabIndex >= 0; }
          if (e.getAttribute('role') === 'option') { const lb = e.closest('[role="listbox"]'); return !!lb && lb.tabIndex >= 0 && !!e.id; }
          return e.tabIndex >= 0;
        })(),
        reason: `${window.__ac.name(e)} ${window.__ac.described(e)} ${e.tagName === 'OPTION' ? e.textContent : ''}`,
      })));
      assert.ok(els.length > 0, `${lens}: unavailable options exist`);
      for (const e of els) {
        assert.ok(!e.disabledAttr, `${lens} ${e.tag} "${e.reason.slice(0, 60)}": no disabled attribute`);
        assert.ok(e.focusable, `${lens} ${e.tag} "${e.reason.slice(0, 60)}": reachable from the keyboard (Tab, or its select/listbox tab stop)`);
        assert.ok(REASONS.test(e.reason) || (e.tag === 'option' && /\(0\)/.test(e.reason)), `${lens} ${e.tag}: the reason is in its name ("${e.reason.slice(0, 100)}")`);
      }
    }
  });
});

test('AC-119 — Mark every selection with state and move focus to it from the margin', async (t) => {
  if (!requireFull(t)) return;
  await withPage('D', async (page) => {
    const cell = await cellParam(page);
    const cases = [
      ['body', `/security?body=${encodeURIComponent(CAPF_SAMPLE)}`, LANES.filter((k) => k.startsWith(`${CAPF_SAMPLE}|`)).length, 'selected body'],
      ['vendor', `/security?lens=procurement&vendor=${encodeURIComponent(VENDOR_NO_AWARD ?? VENDORS[0])}`, 1, 'selected vendor'],
      ['case', `/security?lens=procurement&case=${encodeURIComponent(CASES[0])}`, 1, 'selected case'],
      ['cell', `/security?cell=${encodeURIComponent(cell)}`, 1, null],
    ];
    for (const [k, r, n, words] of cases) {
      await load(page, r);
      const cur = await page.evaluate(() => [...document.querySelectorAll('main [aria-current="true"]')].filter((e) => !e.matches('a[href^="#/"]')).map((e) => window.__ac.raw(e)));
      assert.equal(cur.length, n, `${k}: ${n} accented item(s)`);
      if (words) assert.ok(cur.every((s) => s.includes(words)), `${k}: each carries "${words}"`);
      const go = page.locator('a, button').filter({ hasText: /^Go to / }).first();
      if (await go.count()) {
        await go.click();
        assert.ok(await page.evaluate(() => { const a = document.activeElement; return !!a && (a.getAttribute('aria-current') === 'true' || !!a.closest('[aria-current="true"]') || !!a.closest('tr, [role="row"], [data-pair]')?.querySelector('[aria-current="true"]')); }), `${k}: the margin card's Go to link moves focus to the accented element`);
      } else assert.ok(k === 'cell', `${k}: the margin card offers a "Go to …" link`);
    }
    await load(page, `/security?st=${STATE_SAMPLE}`);
    assert.equal(await count(page, 'svg[role="listbox"] [aria-selected="true"]'), 2, 'st on Budgets: both maps');
    await load(page, `/security?lens=footprint&st=${STATE_SAMPLE}`);
    assert.equal(await count(page, 'svg[role="listbox"] [aria-selected="true"]'), 1, 'st on Footprint: one map');
  });
});

test('AC-120 — Close every panel from a control that returns focus, and on Escape only from inside', async (t) => {
  if (!requireFull(t)) return;
  /** Each panel: the route it opens on, and how to open it by its control (returns the opener locator). */
  const OPENERS = {
    rec: ['/security?lens=procurement', async (p) => { await openTwin(p, 'awards'); const b = p.locator('details[data-twin="awards"] button').filter({ hasText: /^Open record: / }).first(); await b.click(); return b; }],
    cell: ['/security', async (p) => { const c = p.locator('[role="grid"] [tabindex="0"]').first(); await c.focus(); await p.keyboard.press('Enter'); return c; }],
    st: ['/security', async (p) => { const o = p.locator('[data-q="B6"] svg[role="listbox"] [role="option"]').nth(UNITS.indexOf(STATE_SAMPLE)); await o.click(); return o; }],
    vendor: ['/security?lens=procurement', async (p) => { const b = p.locator('[data-vendor-card] h4 button, [data-vendor-card] h4 a').first(); await b.click(); return b; }],
    case: ['/security?lens=procurement', async (p) => { const b = p.locator('[data-pair] h4 button, [data-pair] h4 a, [data-case] button').first(); await b.click(); return b; }],
    body: ['/security', async (p) => { const b = p.locator('[data-q="B3"] button, [data-q="B3"] a').filter({ hasText: new RegExp(`^${esc(labelOf(CAPF_SAMPLE))}$`) }).first(); await b.click(); return b; }],
  };
  await withPage('D', async (page) => {
    for (const [param, [r, open]] of Object.entries(OPENERS)) {
      for (const how of ['Close', 'Back']) {
        await load(page, r);
        const opener = await open(page);
        await waitParam(page, param);
        const marker = await opener.evaluate((el) => { el.setAttribute('data-ac120', '1'); return true; });
        assert.ok(marker, `${param}: the opener is marked`);
        if (how === 'Close') {
          const first = await page.evaluate(() => { const h2 = [...document.querySelectorAll('h2')].find((h) => window.__ac.card((t) => t === window.__ac.txt(h))); const card = h2 ? window.__ac.card((t) => t === window.__ac.txt(h2)) : null; const tb = card ? window.__ac.tabbables(card).find((e) => window.__ac.precedes(h2, e)) : null; return tb ? window.__ac.txt(tb) : null; });
          assert.equal(first, 'Close', `${param}: the first TABBABLE after the panel h2 is Close`);
          await page.getByRole('button', { name: /^Close$/ }).first().click();
        } else {
          await page.locator('a, button').filter({ hasText: /^Back to / }).last().click();
        }
        await waitNoParam(page, param);
        assert.ok(await page.evaluate(() => document.activeElement?.getAttribute('data-ac120') === '1' || !!document.activeElement?.querySelector('[data-ac120]') || !!document.activeElement?.closest('[data-ac120]')), `${param} ${how}: focus returns to the invoking control`);
      }
      await load(page, r);
      await open(page);
      await waitParam(page, param);
      await stateSelect(page).focus();
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
      assert.ok(hashParams(page).has(param), `${param}: Escape on the rail does nothing`);
      await page.getByRole('button', { name: /^Close$/ }).first().focus();
      await page.keyboard.press('Escape');
      await waitNoParam(page, param);
    }
  });
});

test('AC-121 — Reach the stack, the ledger, the spend map and the first pair within the tab budgets', async (t) => {
  if (!requireFull(t)) return;
  await withPage('FOLD', async (page) => {
    await load(page, '/security');
    const axis = await tabsTo(page, 15, '(el) => /^\\d{4}-\\d{2}, /.test(window.__ac.name(el))');
    assert.ok(axis <= 15, `an FY axis button in ≤ 15 (took ${axis})`);
    await load(page, '/security');
    const cell = await tabsTo(page, 20, '(el) => !!el.closest(\'[role="grid"]\')');
    assert.ok(cell <= 20, `a ledger cell in ≤ 20 (took ${cell})`);
    await load(page, '/security');
    const map = await tabsTo(page, 30, '(el) => el.matches(\'svg[role="listbox"]\')');
    assert.ok(map <= 30, `the spend map in ≤ 30 (took ${map})`);
    await load(page, '/security?lens=procurement');
    let n = 0;
    await page.evaluate(() => window.__ac.tabbables(document.querySelector('main'))[0]?.focus());
    for (; n <= 40; n++) {
      const where = await page.evaluate(() => { const a = document.activeElement; return { pair: !!a?.closest('[data-pair] [data-case]'), skip: /^Skip the \d+ vendor cards to chapter 2$/.test(window.__ac.txt(a)) || /chapter 4|Q4/.test(window.__ac.txt(a)) && a?.tagName === 'A' }; });
      if (where.pair) break;
      await page.keyboard.press(where.skip ? 'Enter' : 'Tab');
      if (where.skip) await page.keyboard.press('Tab');
    }
    assert.ok(n <= 40, `a pair <dl>'s first TABBABLE in ≤ 40 via the chapter-4 link or the skip link (took ${n})`);
    await load(page, `/security?find=${encodeURIComponent(labelOf(CAPF_SAMPLE))}`);
    await page.getByRole('button', { name: /^Show connections/ }).first().click();
    await page.waitForFunction(() => document.activeElement?.matches('#connections h2'), null, { timeout: ACTION_TIMEOUT });
  });
});

test('AC-122 — Keep the outline sound: one h3 per Q-block, a caption per table, no skipped level, no duplicate names', async (t) => {
  if (!requireFull(t)) return;
  await withPage('D', async (page) => {
    for (const lens of LENSES) {
      await load(page, route(lens, 'view=table'), { slice: lens === 'procurement' && S8 });
      const r = await page.evaluate(() => {
        const heads = [...document.querySelectorAll('main h1, main h2, main h3, main h4, main h5, main h6, aside h1, aside h2, aside h3, aside h4, aside h5, aside h6')];
        const skips = [];
        let prev = 1;
        for (const h of heads) { const lv = Number(h.tagName[1]); if (lv > prev + 1) skips.push(`${h.tagName} "${window.__ac.txt(h).slice(0, 50)}" after h${prev}`); prev = lv; }
        const blocks = [...document.querySelectorAll('[data-q]')].map((b) => [b.getAttribute('data-q'), b.querySelectorAll('h3').length]);
        const noCap = [...document.querySelectorAll('main table')].filter((t) => !window.__ac.txt(t.querySelector('caption'))).length;
        const dangling = [...document.querySelectorAll('[aria-describedby], [aria-labelledby]')].flatMap((e) => [...(e.getAttribute('aria-describedby') ?? '').split(/\s+/), ...(e.getAttribute('aria-labelledby') ?? '').split(/\s+/)]).filter((id) => id && !document.getElementById(id));
        const dupes = [];
        for (const scope of document.querySelectorAll('main section, main table, main ul')) {
          const names = [...scope.querySelectorAll('button:not([disabled]), a[href]')].filter((b) => b.closest('section, table, ul') === scope).map((b) => window.__ac.name(b)).filter(Boolean);
          const seen = new Set();
          for (const n of names) { if (seen.has(n)) dupes.push(n); seen.add(n); }
        }
        const res = document.querySelector('#resolution');
        const strip = document.querySelector('section[aria-label="Denominators"]');
        return {
          skips, blocks, noCap, dangling, dupes: [...new Set(dupes)].slice(0, 5), h1: document.querySelectorAll('main h1').length,
          resolution: !!res && res.tagName === 'SECTION' && res.hasAttribute('aria-labelledby') && window.__ac.visible(res.querySelector('h2')),
          strip: !!strip && !!strip.querySelector('h2') && !window.__ac.visible(strip.querySelector('h2')),
          abbr: [...document.querySelectorAll('main table')].filter((t) => /\bcr\b/.test(t.textContent)).every((t) => t.querySelector('abbr[title="crore"]')),
        };
      });
      assert.deepEqual(r.skips, [], `${lens}: no skipped heading level`);
      for (const [id, n] of r.blocks) assert.equal(n, 1, `${lens} ${id}: exactly one h3`);
      assert.equal(r.h1, 1, `${lens}: one main h1`);
      assert.equal(r.noCap, 0, `${lens}: every table has a <caption>`);
      assert.deepEqual(r.dangling, [], `${lens}: every aria-describedby/labelledby id resolves`);
      assert.deepEqual(r.dupes, [], `${lens}: no two enabled controls in one section, table or list share a name`);
      assert.ok(r.resolution, `${lens}: #resolution is a section[aria-labelledby] with a visible h2`);
      assert.ok(r.strip, `${lens}: the strip is section[aria-label="Denominators"] with a hidden h2`);
      assert.ok(r.abbr, `${lens}: abbr[title="crore"] on the first cr of each table`);
    }
  });
});

test('AC-123 — Make no vendor card a composite widget, and skip the grid in one link', async (t) => {
  if (!requireFull(t)) return;
  const FIELDS = ['1', '2', '3', '3b', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  await withPage('D', async (page) => {
    await load(page, '/security?lens=procurement');
    const r = await page.evaluate(() => [...document.querySelectorAll('[data-vendor-card]')].map((c) => {
      let a = c; const roles = [];
      while (a) { if (a.getAttribute?.('role')) roles.push(a.getAttribute('role')); a = a.parentElement; }
      return {
        roles, h4: window.__ac.txt(c.querySelector('h4')),
        tabindex: [...c.querySelectorAll('button, a')].map((b) => b.getAttribute('tabindex')).filter((x) => x != null && x !== '0'),
        fields: [...c.querySelectorAll('dt')].map((d) => d.getAttribute('data-field')),
        dts: [...c.querySelectorAll('dt')].map((d) => window.__ac.txt(d)),
      };
    }));
    assert.equal(r.length, VENDORS.length, `${VENDORS.length} vendor cards`);
    for (const c of r) {
      assert.ok(!c.roles.some((x) => ['grid', 'listbox', 'tree', 'application'].includes(x)), `${c.h4}: no composite role on the card or an ancestor`);
      assert.ok(c.h4, 'each card has an h4');
      assert.deepEqual(c.tabindex, [], `${c.h4}: buttons in natural tab order`);
      assert.deepEqual([...c.fields].sort(), [...FIELDS].sort(), `${c.h4}: 13 dts, data-field 1…12 and 3b`);
      assert.deepEqual(c.dts, r[0].dts, `${c.h4}: identical dt sequence`);
    }
    for (const c of r) assert.ok(VENDORS.map(labelOf).includes(c.h4), `the h4 "${c.h4}" is a vendor label`);
    const skip = page.locator('a').filter({ hasText: new RegExp(`^Skip the ${VENDORS.length} vendor cards to chapter 2$`) }).first();
    assert.equal(await skip.count(), 1, `"Skip the ${VENDORS.length} vendor cards to chapter 2" precedes the grid`);
    await skip.click();
    assert.ok(await page.evaluate(() => document.activeElement?.tagName === 'H4' && !!document.activeElement.closest('[data-q="P2"]')), 'it moves focus to the chapter-2 h4');
  });
});

// ---------------------------------------------------------------------------
// §9 Mobile at 390 px — FULL build
// ---------------------------------------------------------------------------

const railDetails = (page) => page.locator('details').filter({ has: page.locator('summary', { hasText: /^Filters \(\d+\) · / }) }).first();
const box44 = (r) => r.width >= 44 && r.height >= 44;

test('AC-124 — Scroll the page vertically only, in every state', async (t) => {
  if (!requireFull(t)) return;
  const v = VENDOR_NO_AWARD ?? VENDORS[0];
  for (const vp of ['M', 'M360']) {
    await withPage(vp, async (page) => {
      const cell = await cellParam(page);
      const routes = ['/security', '/security?lens=footprint', '/security?lens=procurement', ...LENSES.map((l) => route(l, 'view=table')), `/security?cell=${encodeURIComponent(cell)}`, `/security?lens=procurement&vendor=${encodeURIComponent(v)}`, `/security?lens=procurement&case=${encodeURIComponent(CASES[0])}`, `/security?rec=${encodeURIComponent((ENFORCE_WITH_CONTRA ?? EDGES[0]).id)}`, '/security?st=dl'];
      for (const r of routes) {
        await load(page, r);
        assert.deepEqual(await noHScroll(page), [], `${vp} ${r}: no horizontal page scroll`);
        const wide = await page.evaluate(() => [...document.querySelectorAll('details[data-twin][open] table')].filter((tb) => tb.scrollWidth > tb.clientWidth + 1).map((tb) => {
          const d = tb.closest('details');
          return { name: d.getAttribute('data-twin'), step: [...d.querySelectorAll('button')].some((b) => /^\d+ columns · later ›$/.test(window.__ac.txt(b))) };
        }));
        for (const w of wide) assert.ok(w.step, `${vp} ${r}: the wide twin ${w.name} carries "{k} columns · later ›"`);
      }
      await load(page, '/security?lens=procurement');
      for (const q of ['P1', 'P4']) {
        const b = await page.evaluate((id) => [...(window.__ac.q(id)?.querySelectorAll('button') ?? [])].map((x) => window.__ac.txt(x)), q);
        assert.ok(b.includes('‹ earlier') && b.includes('later ›'), `${vp} ${q}: the award and case-timeline containers carry ‹ earlier / later ›`);
      }
    });
  }
});

test('AC-125 — Pin one line of strip and one row of tabs within 140 px', async (t) => {
  if (!requireFull(t)) return;
  await withPage('M', async (page) => {
    await load(page, '/security');
    const r = await page.evaluate(() => {
      const p = document.querySelector('[data-pinned-stack]');
      if (!p) return null;
      const tabs = [...p.querySelectorAll('[role="tab"]')].map((x) => ({ top: x.getBoundingClientRect().top, h: x.getBoundingClientRect().height, text: window.__ac.txt(x), name: window.__ac.name(x) }));
      const lv = [...p.querySelectorAll('a')].find((a) => window.__ac.txt(a) === 'levels');
      return { h: p.getBoundingClientRect().height, pos: getComputedStyle(p).position, text: window.__ac.txt(p), tabs, levels: lv ? window.__ac.name(lv) : null, header: !!p.querySelector('header') || !!p.closest('header') };
    });
    assert.ok(r, '[data-pinned-stack] exists');
    assert.ok(r.h <= 140, `height ${r.h} ≤ 140 px`);
    assert.ok(['sticky', 'fixed'].includes(r.pos), `position ${r.pos}`);
    assert.match(ungroup(r.text), /(\d+) of (\d+) rows · (BE|RE|actual) · read to \d{4}-\d{2}-\d{2} · levels/, 'one strip line');
    assert.equal(r.levels, 'what resolves at which level', 'the levels link is named "what resolves at which level"');
    assert.equal(r.tabs.length, 3, 'three tabs');
    assert.ok(r.tabs.every((x) => Math.abs(x.top - r.tabs[0].top) <= 1), 'on one row');
    assert.deepEqual(r.tabs.map((x) => x.text), ['Budgets', 'Footprint', 'Procurement'], 'visible labels');
    assert.ok(r.tabs[2].name.includes('Procurement and people'), 'the third tab is named "Procurement and people"');
    assert.ok(r.tabs.every((x) => x.h >= 44), 'each tab ≥ 44 px tall');
    const facts = await page.evaluate(() => {
      const cap = document.querySelector('main figcaption');
      const list = cap?.parentElement ? [...cap.parentElement.querySelectorAll('ul, ol')].find((u) => window.__ac.precedes(cap, u)) : null;
      const rec = [...document.querySelectorAll('ul')].find((u) => /^\d[\d,]* rows = /.test(window.__ac.txt(u)));
      return { list: window.__ac.txt(list), mono: list ? getComputedStyle(list).fontFamily : '', recUl: !!rec, recSticky: rec ? ['sticky', 'fixed'].includes(getComputedStyle(rec).position) || !!rec.closest('[data-pinned-stack]') : null };
    });
    assert.ok(/mono/i.test(facts.mono) && /FYs have a (BE|RE|actual) stack/.test(facts.list) && /rows print ₹0 as recorded/.test(facts.list), 'facts 3–6 sit whole in a mono list after the first figcaption');
    assert.ok(facts.recUl && facts.recSticky === false, 'the ReconciliationLine is a <ul>, not sticky');
  });
});

test('AC-126 — Put Find first under the tabs, outside the rail, never pinned', async (t) => {
  if (!requireFull(t)) return;
  if (!need(t, CITY_SAMPLE, 'no commissionerate')) return;
  await withPage('M', async (page) => {
    await load(page, '/security');
    const r = await page.evaluate((tb) => {
      const tabs = [...document.querySelectorAll('[role="tab"]')];
      const last = tabs.at(-1);
      const all = [...document.querySelectorAll(tb)].filter((e) => window.__ac.precedes(last, e));
      const input = document.querySelector('input[type="search"]');
      const main = document.querySelector('main').getBoundingClientRect();
      return { first: all[0] === input, inRail: !!input?.closest('details'), pinned: !!input?.closest('[data-pinned-stack]'), width: input?.getBoundingClientRect().width, content: main.width };
    }, TABBABLE);
    assert.ok(r.first, 'Find is the first TABBABLE after the last tab');
    assert.ok(!r.inRail && !r.pinned, 'outside the rail <details> and the pinned stack');
    assert.ok(Math.abs(r.width - (r.content - 32)) <= 16 || Math.abs(r.width - r.content) <= 16, `spans the content width (${r.width} of ${r.content})`);
    await find(page, CITY_SAMPLE.city);
    const res = await page.evaluate((s) => { const i = document.querySelector('input[type="search"]'); const e = window.__ac.deepest(document.querySelector('main'), s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); return { found: !!e, after: window.__ac.precedes(i, e), gap: e ? e.getBoundingClientRect().top - i.getBoundingClientRect().bottom : null }; }, CITY_TEXT(STATE_NAME.get(CITY_SAMPLE.st)));
    assert.ok(res.found && res.after, 'the result prints the fixed city sentence beneath Find');
    assert.ok(res.gap < 400, 'directly beneath it');
  });
});

test('AC-127 — Measure the 390 fold against its ceilings and record it', async (t) => {
  if (!requireFull(t)) return;
  await withPage('M', async (page) => {
    await load(page, '/security');
    const r = await page.evaluate(() => {
      const sum = [...document.querySelectorAll('details > summary')].find((s) => /^Filters \(\d+\) · \d+ → \d+/.test(window.__ac.txt(s)));
      const fig = document.querySelector('[data-q="B1"] figure') ?? document.createElement('figure');
      const y = (e) => (e ? e.getBoundingClientRect() : null);
      const strip = y(document.querySelector('[data-pinned-stack]')); const find = y(document.querySelector('input[type="search"]'));
      return { rail: y(sum)?.bottom ?? null, fig: y(fig)?.top ?? null, stripBottom: strip?.bottom ?? null, findBottom: find?.bottom ?? null };
    });
    t.diagnostic(`AC-127 measured at M: rail summary bottom ${r.rail} px, DemandStack top ${r.fig} px`);
    assert.ok(r.rail != null && r.rail <= 1688, `the rail summary bottom ${r.rail} ≤ 1,688 px`);
    assert.ok(r.stripBottom <= r.rail && r.findBottom <= r.rail, 'the strip, tabs and Find sit above it');
    assert.ok(r.fig != null && r.fig <= 2110, `the DemandStack figure top ${r.fig} ≤ 2,110 px`);
  });
  await withPage('FOLD', async (page) => {
    await load(page, '/security');
    const b = await page.evaluate((fy) => { const c = [...document.querySelectorAll('[data-column][data-panel="defence"]')].find((x) => x.getAttribute('data-column') === fy); const p = c?.querySelector('[data-band="pension"]'); return p ? p.getBoundingClientRect().bottom : null; }, LATEST_FY(DEFAULT_STAGE));
    t.diagnostic(`AC-127 measured at FOLD: pension band bottom ${b} px`);
    assert.ok(b != null && b <= 800, `FOLD: the latest pension band within 800 px (${b})`);
  });
});

test('AC-128 — Draw the stack at full width with a 44 px step control', async (t) => {
  if (!requireFull(t)) return;
  await withPage('M', async (page) => {
    await load(page, '/security');
    const r = await page.evaluate(() => {
      const fig = document.querySelector('[data-q="B1"] figure') ?? document.createElement('figure');
      // `width`/`height`: the names box44 reads (recorded as w/h, every page failed the 44 px check).
      const steps = [...fig.querySelectorAll('button')].filter((b) => /^(‹ earlier|later ›|FY\d{4}-\d{2})$/.test(window.__ac.txt(b))).map((b) => { const q = b.getBoundingClientRect(); return { text: window.__ac.txt(b), width: q.width, height: q.height }; });
      const pensionLabels = [...fig.querySelectorAll('[data-column]')].filter((c) => /% of (published total|stack)/.test(window.__ac.txt(c))).map((c) => c.getAttribute('data-column'));
      return { sw: fig.scrollWidth, cw: fig.clientWidth, cols: fig.querySelectorAll('[data-column][data-panel="defence"]').length, steps, pensionLabels };
    });
    assert.ok(r.sw <= r.cw, 'no inner horizontal scroll');
    assert.equal(r.cols, FY_AXIS.length, `${FY_AXIS.length} defence columns`);
    assert.equal(r.steps.length, 3, 'a step control of three buttons');
    t.diagnostic(`AC-128 step buttons: ${r.steps.map((x) => `${x.text} ${x.width}×${x.height}`).join(', ')}`);
    assert.ok(r.steps.every(box44), `each ≥ 44 × 44 px (${r.steps.map((x) => `${x.text} ${x.width}×${x.height}`).join(', ')})`);
    assert.deepEqual(r.pensionLabels, [LATEST_FY(DEFAULT_STAGE)], 'the pension share label appears on the latest column only');
    const before = (await page.evaluate(() => [...document.querySelectorAll('[data-q="B1"] figure button')].map((b) => window.__ac.txt(b)).find((x) => /^FY\d{4}-\d{2}$/.test(x))));
    await page.locator('[data-q="B1"] figure button').filter({ hasText: /^‹ earlier$/ }).first().click();
    const after = (await page.evaluate(() => [...document.querySelectorAll('[data-q="B1"] figure button')].map((b) => window.__ac.txt(b)).find((x) => /^FY\d{4}-\d{2}$/.test(x))));
    assert.notEqual(after, before, 'the step control moves the roving FY');
    const col = page.locator(`[data-column="${LATEST_FY(DEFAULT_STAGE)}"][data-panel="defence"]`);
    await col.tap();
    assert.ok(!(await page.evaluate(() => !!window.__ac.card((t) => /^FY?\d{4}-\d{2}/.test(t)))), 'a first tap shows the readout line, not the panel');
    await col.tap();
    assert.ok(await page.evaluate(() => !!window.__ac.card((t) => /\d{4}-\d{2}/.test(t))), 'a second tap on the same column opens the FYReadout inline');
    await load(page, '/security');
    // `later ›` moves the roving FY too (the criterion names it; at rest the roving FY is the latest, so step earlier first).
    const fyBtn = () => page.evaluate(() => [...document.querySelectorAll('[data-q="B1"] figure button')].map((b) => window.__ac.txt(b)).find((x) => /^FY\d{4}-\d{2}$/.test(x)));
    await page.locator('[data-q="B1"] figure button').filter({ hasText: /^‹ earlier$/ }).first().click();
    const stepped = await fyBtn();
    await page.locator('[data-q="B1"] figure button').filter({ hasText: /^later ›$/ }).first().click();
    const back = await fyBtn();
    assert.notEqual(back, stepped, '`later ›` moves the roving FY');
    assert.equal(back, `FY${LATEST_FY(DEFAULT_STAGE)}`, '`later ›` after one `‹ earlier` returns to the latest FY');
    await load(page, '/security');
    assert.equal(await twin(page, 'stack').evaluate((d) => d.open), false, 'the twin is a closed <details>');
    await openTwin(page, 'stack');
    assert.ok(await page.locator('details[data-twin="stack"] [data-row]').count() > 0, 'opened as StackTable cards');
  });
});

test('AC-129 — Collapse the rail into a labelled details block with the effect outside', async (t) => {
  if (!requireFull(t)) return;
  await withPage('M', async (page) => {
    await load(page, '/security');
    const d = railDetails(page);
    assert.equal(await d.count(), 1, 'the rail is a <details> summarised "Filters ({n}) · {N} → {k}"');
    const r = await page.evaluate(() => {
      const det = [...document.querySelectorAll('details')].find((x) => /^Filters \(\d+\) · /.test(window.__ac.txt(x.querySelector('summary'))));
      const eff = [...document.querySelectorAll('[data-effect]')].filter((e) => !det.contains(e) && !e.closest('[data-q], figure'));
      return { outside: eff.length, visible: eff.some((e) => window.__ac.visible(e)), selects: det.querySelectorAll('select').length, foot: [...det.querySelectorAll('a')].some((a) => (a.getAttribute('href') ?? '').includes('refusals')) };
    });
    assert.ok(r.outside >= 1 && r.visible, 'the last change\'s effect line sits outside the closed rail, visible');
    assert.ok(r.selects >= 1, 'native <select>s inside');
    assert.ok(r.foot, "the rail foot's refusal line links to #refusals");
    await load(page, '/security?lens=footprint');
    await railDetails(page).locator('summary').click();
    const k = await page.evaluate((kinds) => {
      const det = [...document.querySelectorAll('details')].find((x) => /^Filters \(\d+\) · /.test(window.__ac.txt(x.querySelector('summary'))));
      const boxes = [...det.querySelectorAll('input[type="checkbox"]')].map((c) => window.__ac.name(c));
      return { kinds: kinds.filter((kk) => boxes.some((b) => new RegExp('^' + kk.replace(/-/g, '[ -]'), 'i').test(b))).length, all: boxes.some((b) => /^all kinds/i.test(b)) || [...det.querySelectorAll('button')].some((b) => /^all kinds/i.test(window.__ac.txt(b))), counts: boxes.filter((b) => /\(\d+\)|\d+/.test(b)).length };
    }, KINDS);
    assert.equal(k.kinds, KINDS.length, 'the kind chips become checkboxes inside the rail');
    assert.ok(k.counts >= KINDS.length - EMPTY_KINDS.length, 'with counts');
    assert.ok(k.all, 'and one "all kinds" control');
  });
});

test('AC-130 — Draw the ledger one stage at a time, groups closed, with step buttons', async (t) => {
  if (!requireFull(t)) return;
  await withPage('M', async (page) => {
    await load(page, '/security');
    const r = await page.evaluate(() => {
      const b = window.__ac.qq('B3');
      const lanes = [...b.querySelectorAll('[data-lane]')];
      const perLane = lanes.map((th) => th.closest('tr, [role="row"]')?.querySelectorAll('[data-slot]').length ?? 0);
      const region = b.querySelector('[role="region"]');
      const btns = [...(region ?? b).querySelectorAll('button')].filter((x) => /^(‹ earlier|later ›)$/.test(window.__ac.txt(x))).map((x) => x.getBoundingClientRect());
      const label = lanes[0];
      const groups = [...b.querySelectorAll('details')].map((d) => ({ open: d.open, summary: window.__ac.txt(d.querySelector('summary')) }));
      return { perLane, region: !!region && !!region.getAttribute('aria-labelledby') || !!region?.getAttribute('aria-label'), btns: btns.map((x) => ({ w: x.width, h: x.height })), sticky: label ? getComputedStyle(label).position : null, labelW: label?.getBoundingClientRect().width, showing: /showing FY\d{4}-\d{2}–FY\d{4}-\d{2}/.test(window.__ac.txt(b)), groups, twinsOpen: b.querySelectorAll('details[data-twin][open]').length };
    });
    assert.ok(r.perLane.length > 0 && r.perLane.every((n) => n === FY_AXIS.length), 'one slot per lane per FY');
    assert.ok(r.region, 'the drawing is a role="region" named by the caption');
    assert.ok(r.btns.length >= 2 && r.btns.every((x) => x.h >= 44 && x.w >= 44), '‹ earlier / later › buttons ≥ 44 px');
    assert.equal(r.sticky, 'sticky', 'the label column is sticky');
    assert.ok(Math.abs(r.labelW - 120) <= 24, `the label column is ≈ 120 px (${r.labelW})`);
    assert.ok(r.showing, 'a mono "showing FY{a}–FY{b}" line');
    const bodyGroups = r.groups.filter((g) => /\d+ lanes · BE \d+ RE \d+ actual \d+ of \d+ FYs/.test(g.summary));
    assert.ok(bodyGroups.length >= 1, 'body groups are <details> summarised "{n} lanes · BE … RE … actual … of {n} FYs"');
    assert.ok(bodyGroups.filter((g) => !/Published totals/.test(g.summary)).every((g) => !g.open), 'closed except Published totals');
    assert.equal(r.twinsOpen, 0, 'both twins closed by default');
  });
});

test('AC-131 — Stack the maps, close the state table, and open the selected state inline', async (t) => {
  if (!requireFull(t)) return;
  await withPage('M', async (page) => {
    await load(page, '/security');
    const r = await page.evaluate(() => {
      const maps = [...window.__ac.qq('B6').querySelectorAll('svg[role="listbox"]')].map((m) => m.getBoundingClientRect());
      const vw = window.innerWidth;
      const selects = [...window.__ac.qq('B6').querySelectorAll('select')].filter((s) => /Open a state/.test(window.__ac.name(s)));
      const sw = [...window.__ac.qq('B6').querySelectorAll('figcaption svg, [data-legend] svg, figure svg:not([role]) rect')].map((e) => e.getBoundingClientRect().width).filter((w) => w > 0);
      return { maps: maps.map((m) => ({ top: m.top, bottom: m.bottom, w: m.width, h: m.height })), vw, selects: selects.length, swatches: sw };
    });
    assert.equal(r.maps.length, 2, 'two maps');
    assert.ok(r.maps[1].top >= r.maps[0].bottom, 'stacked');
    for (const m of r.maps) {
      assert.ok(m.w >= r.vw - 40, `full width (${m.w} of ${r.vw})`);
      assert.ok(m.h >= 300 && m.h <= 420, `height ${m.h} in [300, 420]`);
    }
    assert.equal(r.selects, 2, 'an "Open a state" <select> under each figcaption');
    assert.ok(r.swatches.every((w) => w >= 12), 'legend swatches ≥ 12 px');
    const st = twin(page, 'state-table');
    assert.equal(await st.evaluate((d) => d.open), false, 'TWIN(state-table) is closed');
    assert.match(await text(st.locator('summary')), /^Q6 — .+ as a table · 36 rows, always all 36$/, 'its summary');
    await openTwin(page, 'state-table');
    assert.ok(await page.locator('details[data-twin="state-table"] [data-row]').count() > 0, 'opens as StackTable cards');
    await load(page, `/security?st=${STATE_SAMPLE}`);
    const inline = await page.evaluate((name) => { const c = window.__ac.card((t) => t === name); const maps = [...window.__ac.qq('B6').querySelectorAll('svg[role="listbox"]')]; return c ? { below: window.__ac.precedes(maps.at(-1), c), aside: !!c.closest('aside') } : null; }, STATE_NAME.get(STATE_SAMPLE));
    assert.ok(inline?.below && !inline.aside, 'the StatePanel renders inline under the maps');
  });
});

test('AC-132 — Stack each case pair field by field and each vendor card behind an identical summary', async (t) => {
  if (!requireFull(t)) return;
  await withPage('M', async (page) => {
    await load(page, '/security?lens=procurement');
    const p = await page.evaluate(() => {
      const row = document.querySelector('[data-pair]') ?? document.createElement('section');
      const blocks = [...row.querySelectorAll('[data-case] dt')].map((d) => ({ caseId: d.closest('[data-case]').getAttribute('data-case'), dt: window.__ac.txt(d), y: d.getBoundingClientRect().top }));
      return blocks.sort((a, b) => a.y - b.y);
    });
    assert.ok(p.length >= 22, 'the first pair row holds 11 fields per case');
    for (let i = 0; i + 1 < p.length; i += 2) assert.ok(p[i].dt === p[i + 1].dt && p[i].caseId !== p[i + 1].caseId, `field "${p[i].dt}" alternates left case / right case`);
    const v = await page.evaluate(() => [...document.querySelectorAll('[data-vendor-card]')].map((c) => {
      const det = c.closest('details') ?? c.querySelector('details');
      return { summary: window.__ac.txt(det?.querySelector('summary')), dts: c.querySelectorAll('dt').length, open: !!det?.open, current: c.getAttribute('aria-current') };
    }));
    assert.equal(v.length, VENDORS.length, 'every card stays in the DOM');
    for (const c of v) {
      assert.match(c.summary, /^.+ · (public sector|private, JV or foreign|unclassified) · \d+ named awards \(\d+ with ₹\) · 13 fields$/, `card summary "${c.summary}"`);
      assert.equal(c.dts, 13, 'with 13 dts');
    }
    if (UNPAIRED.length) {
      // At rest the unpaired row is folded whole (AC-134, amended 2026-10-07): open it from its summary, as a reader does, before reading its fields.
      const fold = (await pairFolds(page)).find((r) => r.cases.includes(UNPAIRED[0]));
      if (fold?.closed) await openFold(page, fold.fold);
      const u = await page.evaluate((id) => { const row = [...document.querySelectorAll('[data-pair]')].find((r) => r.querySelector(`[data-case="${id}"]`)); return row ? (window.__ac.txt(row).match(/No control pairing recorded for this case in the register\./g) ?? []).length : 0; }, UNPAIRED[0]);
      assert.equal(u, 11, 'an unpaired case: the pairing sentence occupies the right slot of every field');
    }
    const vv = VENDOR_NO_AWARD ?? VENDORS[0];
    await load(page, `/security?lens=procurement&vendor=${encodeURIComponent(vv)}`);
    const open = await page.evaluate(() => [...document.querySelectorAll('[data-vendor-card]')].filter((c) => (c.closest('details') ?? c.querySelector('details'))?.open).length);
    assert.ok(open >= 1 + COMPARATORS(vv).length, "the selected vendor's and its comparators' details are open");
  });
});

test('AC-133 — Give every wide drawing and table step buttons, never swipe only', async (t) => {
  if (!requireFull(t)) return;
  await withPage('M', async (page) => {
    await load(page, '/security?lens=procurement');
    for (const q of ['P1', 'P4']) {
      const r = await page.evaluate((id) => {
        const b = window.__ac.qq(id);
        const btns = [...b.querySelectorAll('button')].map((x) => ({ t: window.__ac.txt(x), r: x.getBoundingClientRect() }));
        return { btns: btns.filter((x) => /^(‹ earlier|later ›|earliest)$/.test(x.t)).map((x) => ({ t: x.t, h: x.r.height, w: x.r.width })), line: /showing .+–.+ of .+–.+/.test(window.__ac.txt(b)) };
      }, q);
      for (const w of ['‹ earlier', 'later ›', 'earliest']) assert.ok(r.btns.some((b) => b.t === w), `${q}: a "${w}" button`);
      assert.ok(r.btns.filter((b) => b.t !== 'earliest').every((b) => b.h >= 44 && b.w >= 44), `${q}: step buttons ≥ 44 px`);
      assert.ok(r.line, `${q}: a mono "showing … of …" line`);
    }
    for (const lens of LENSES) {
      await load(page, route(lens, 'view=table'));
      const tables = await page.evaluate(() => [...document.querySelectorAll('details[data-twin] table')].map((tb) => {
        const first = tb.querySelector('tbody tr > *');
        const visibleCols = [...(tb.querySelector('tbody tr')?.children ?? [])].filter((c) => { const r = c.getBoundingClientRect(); return r.right > 0 && r.left < window.innerWidth; }).length;
        const d = tb.closest('details');
        return { name: d.getAttribute('data-twin'), sticky: first ? getComputedStyle(first).position : null, visibleCols, later: [...d.querySelectorAll('button')].some((b) => /^\d+ columns · later ›$/.test(window.__ac.txt(b))) };
      }));
      for (const tb of tables) {
        assert.equal(tb.sticky, 'sticky', `${lens} ${tb.name}: a sticky first column`);
        assert.ok(tb.visibleCols <= 4, `${lens} ${tb.name}: ≤ 3 further visible columns`);
        assert.ok(tb.later || tb.visibleCols <= 4, `${lens} ${tb.name}: a "{k} columns · later ›" button`);
      }
      if (lens === 'footprint') {
        const cards = await page.evaluate(() => document.querySelectorAll('details[data-twin="footprint-matrix"] [data-row]').length);
        assert.equal(cards, 36, 'KindMatrix renders one card per unit');
      }
    }
  });
});

test('AC-134 — Measure the page length against its ceilings and record it', async (t) => {
  if (!requireFull(t)) return;
  const VP = 844;
  const CEIL_LAST = 12 * VP; // 10,128 px
  const CEIL_BLOCK = 4 * VP; // 3,376 px
  const lit = SYMMETRY('literature');
  const measured = [];
  const checks = [];
  await withPage('M', async (page) => {
    for (const lens of LENSES) {
      await load(page, LENS_ROUTE[lens], { slice: lens === 'procurement' && S8 });
      // Amended 2026-10-07: wait for the slice to render before measuring (a page measured before it loads is shorter than the reader's).
      if (lens === 'procurement' && S8) {
        await page.waitForFunction((n) => document.querySelectorAll('[data-q="P2"] [data-class]').length >= n, SLICE.rates.byClass.length, { timeout: ACTION_TIMEOUT });
        await page.waitForTimeout(SETTLE);
      }
      const r = await page.evaluate(([last, a, b, readMe, caveat]) => {
        const shut = (e) => !!e?.closest('details:not([open])');
        const rendered = (e) => !!e && !shut(e) && e.getBoundingClientRect().height > 0;
        const h3 = window.__ac.q(last)?.querySelector('h3');
        const blocks = [...document.querySelectorAll('[data-q]')].map((x) => ({ q: x.getAttribute('data-q'), h: x.getBoundingClientRect().height }));
        const out = { top: h3 ? h3.getBoundingClientRect().top + scrollY : null, blocks };
        const p4 = window.__ac.q('P4');
        if (!p4) return out;
        const all = [...document.querySelectorAll('details')];
        const rows = [...document.querySelectorAll('[data-pair]')];
        const first = rows.find((p) => p.querySelector(`[data-case="${a}"]`) && p.querySelector(`[data-case="${b}"]`)) ?? null;
        const head = window.__ac.deepest(p4, '^The same lens, run on the other side — literature research file');
        const litBox = head?.closest('section, aside, div, article') ?? null;
        out.first = first ? { index: rows.indexOf(first), h: first.getBoundingClientRect().height, open: rendered(first) && [...first.querySelectorAll('[data-case]')].every((c) => !shut(c)) } : null;
        out.lit = litBox ? { h: litBox.getBoundingClientRect().height, open: rendered(litBox) } : null;
        out.others = rows.filter((p) => p !== first).map((p) => {
          const cols = [...p.querySelectorAll('[data-case]')];
          const folds = cols.map((c) => all.indexOf(c.closest('details')));
          const d = all[folds[0]] ?? null;
          return { cases: cols.map((c) => c.getAttribute('data-case')), whole: folds.every((f) => f === folds[0]) && !!d && !d.open, summary: d ? window.__ac.raw(d.querySelector(':scope > summary')) : null, h: p.getBoundingClientRect().height };
        });
        const p2 = window.__ac.q('P2');
        if (p2) {
          const find = (s) => (s ? window.__ac.deepestAll(p2, s.slice(0, 50).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).find((e) => !e.matches('summary')) ?? null : null);
          out.p2 = { classes: [...p2.querySelectorAll('[data-class]')].filter(rendered).length, readMe: rendered(find(readMe)), caveat: rendered(find(caveat)) };
        }
        return out;
      }, [CANNOT_SHOW[lens], FIRST_PAIR?.a ?? '', FIRST_PAIR?.b ?? '', S8 ? squash(SLICE.readMeFirst) : null, S8 ? squash(SLICE.caveat) : null]);
      const allowance = lens === 'procurement' ? (r.first?.h ?? 0) + (r.lit?.h ?? 0) : 0;
      const ceiling = (q) => (q === 'P4' ? CEIL_BLOCK + allowance : CEIL_BLOCK);
      const tallest = r.blocks.reduce((m, x) => (x.h > m.h ? x : m), { q: null, h: 0 });
      const tallestBut4 = r.blocks.filter((x) => x.q !== 'P4').reduce((m, x) => (x.h > m.h ? x : m), { q: null, h: 0 });
      t.diagnostic(`AC-134 measured at M, ${lens}: last Q-block h3 at ${r.top} px; tallest Q-block ${tallest.q} ${tallest.h} px; blocks ${r.blocks.map((x) => `${x.q} ${Math.round(x.h)}`).join(', ')}`);
      measured.push({ lens, top: r.top, tallest: tallest.h });
      if (lens === 'procurement') {
        const p4 = r.blocks.find((x) => x.q === 'P4');
        t.diagnostic(`AC-134 measured at M, procurement: tallest Q-block other than P4 ${tallestBut4.q} ${tallestBut4.h} px; P4 ${p4?.h} px against ${CEIL_BLOCK} + first pair row ${r.first?.h} + literature block ${r.lit?.h} = ${ceiling('P4')} px; other pair rows ${(r.others ?? []).map((o) => `${o.cases.join('|')} ${Math.round(o.h)} px ${o.whole ? 'folded whole' : 'not folded whole'}`).join('; ')}`);
      }
      // Every lens is measured and printed before any ceiling is asserted, so one failure never hides another lens's values.
      checks.push(() => {
        if (lens === 'procurement') {
          assert.ok(FIRST_PAIR, 'a first pair row to keep open');
          assert.ok(r.first, `the first pair row (${FIRST_PAIR.a} | ${FIRST_PAIR.b}) renders`);
          assert.equal(r.first.index, 0, 'the first pair row is the first [data-pair]');
          assert.ok(r.first.open, `the first pair row is open at rest (height ${r.first.h} px, in no closed <details>) — its height is P4's allowance only when rendered`);
          if (lit) {
            assert.ok(r.lit, 'the literature symmetry block renders in P4');
            assert.ok(r.lit.open, `the literature symmetry block is open at rest (height ${r.lit.h} px, in no closed <details>)`);
          }
          for (const o of r.others ?? []) {
            const name = o.cases.join(' | ');
            assert.ok(o.whole, `${name}: folds whole at rest — one closed <details> holds both [data-case] columns`);
            for (const c of o.cases.filter((x) => x !== 'none')) assert.ok(squash(o.summary).includes(squash(labelOf(c))), `${name}: the fold's summary "${o.summary}" names ${labelOf(c)}`);
            assert.equal(namesAllegation(o.summary, o.cases), null, `${name}: the fold's summary "${o.summary}" names no allegation`);
          }
          if (S8) {
            assert.ok(r.p2, 'P2 renders');
            assert.ok(r.p2.classes >= SLICE.rates.byClass.length, `P2: the SliceBesideFile comparison stays open — ${r.p2.classes} rendered [data-class] rows, ≥ ${SLICE.rates.byClass.length}`);
            assert.ok(r.p2.readMe && r.p2.caveat, 'P2: SLICE.readMeFirst and SLICE.caveat stay open at rest');
          }
        }
        assert.ok(r.top != null && r.top <= CEIL_LAST, `${lens}: the last Q-block's h3 at ${r.top} ≤ 10,128 px`);
        for (const b of r.blocks) assert.ok(b.h <= ceiling(b.q), `${lens}: Q-block ${b.q} ${b.h} ≤ ${ceiling(b.q)} px${b.q === 'P4' ? ` (3,376 + first pair row ${r.first?.h} + literature block ${r.lit?.h})` : ''}`);
      });
    }
  });
  t.diagnostic(`AC-134 table: ${measured.map((m) => `${m.lens} last h3 ${m.top} px, tallest ${m.tallest} px`).join(' · ')}`);
  for (const check of checks) check();
});

test('AC-135 — Render margin panels inline under their opener, with Close and Back', async (t) => {
  if (!requireFull(t)) return;
  await withPage('M', async (page) => {
    const cell = await cellParam(page);
    const v = VENDOR_NO_AWARD ?? VENDORS[0];
    for (const [k, r, h2] of [
      ['cell', `/security?cell=${encodeURIComponent(cell)}`, CELL_SAMPLE.fy],
      ['st', `/security?st=${STATE_SAMPLE}`, STATE_NAME.get(STATE_SAMPLE)],
      ['vendor', `/security?lens=procurement&vendor=${encodeURIComponent(v)}`, labelOf(v)],
      ['rec', `/security?lens=procurement&rec=${encodeURIComponent((ENFORCE_WITH_CONTRA ?? EDGES[0]).id)}`, (ENFORCE_WITH_CONTRA ?? EDGES[0]).lab],
    ]) {
      await load(page, r);
      const p = await page.evaluate((h) => {
        const c = window.__ac.card((t) => t.includes(h));
        if (!c) return null;
        const h2el = c.querySelector('h2');
        const tb = window.__ac.tabbables(c).find((e) => window.__ac.precedes(h2el, e));
        const pin = document.querySelector('[data-pinned-stack]')?.getBoundingClientRect().height ?? 0;
        return { aside: !!c.closest('aside'), close: window.__ac.txt(tb), back: [...c.querySelectorAll('a, button')].some((b) => /^Back to /.test(window.__ac.txt(b))), smt: parseFloat(getComputedStyle(c).scrollMarginTop) || 0, pin };
      }, h2);
      assert.ok(p, `${k}: the panel renders`);
      assert.ok(!p.aside, `${k}: no aside column`);
      assert.equal(p.close, 'Close', `${k}: Close after its h2`);
      assert.ok(p.back, `${k}: Back to {origin} at its foot`);
      assert.ok(p.smt >= p.pin, `${k}: scroll-margin-top ${p.smt} ≥ the pinned stack ${p.pin}`);
    }
  });
});

test('AC-136 — Keep the mono floor at 12 px and the graph behind a button', async (t) => {
  if (!requireFull(t)) return;
  await withPage('M', async (page) => {
    for (const lens of LENSES) {
      await load(page, LENS_ROUTE[lens]);
      const r = await page.evaluate(() => {
        const small = [...document.querySelectorAll('main *')].filter((e) => /mono/i.test(getComputedStyle(e).fontFamily) && e.childNodes.length && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 12 && !e.closest('[data-glyph]')).map((e) => window.__ac.txt(e).slice(0, 40));
        const conn = document.querySelector('#connections');
        const targets = [...document.querySelectorAll('main button, main a, main [role="option"], main [role="tab"], main summary')].filter((e) => window.__ac.visible(e)).filter((e) => {
          const r = e.getBoundingClientRect(); const before = getComputedStyle(e, '::before');
          const hit = Math.max(r.height, parseFloat(before.height) || 0);
          return hit < 44;
        }).map((e) => window.__ac.txt(e).slice(0, 30) || e.tagName);
        return { small, loadBtn: !!conn && [...conn.querySelectorAll('button')].some((b) => /^Load the graph/.test(window.__ac.txt(b))), canvas: conn ? conn.querySelectorAll('canvas').length : -1, targets: targets.slice(0, 8) };
      });
      assert.deepEqual(r.small, [], `${lens}: no mono text below 12 px`);
      assert.ok(r.loadBtn, `${lens}: #connections shows "Load the graph"`);
      assert.equal(r.canvas, 0, `${lens}: no canvas until it is pressed`);
      assert.deepEqual(r.targets, [], `${lens}: coarse-pointer targets measure ≥ 44 px`);
    }
  });
});

// ---------------------------------------------------------------------------
// §10 Frozen channels, fold and house rules — FULL build
// ---------------------------------------------------------------------------

/** The frozen family hues, read as text (never imported) — the one src/components read, adjudicated in the criteria preamble (§0.5). */
const FAMILY_COLOR = (() => {
  const src = readFileSync(join(root, 'src/components/viz/ForceGraph.tsx'), 'utf8');
  const block = src.match(/\bconst\s+FAMILY_COLOR\b[^=]*=\s*\{([^}]+)\}/)?.[1] ?? '';
  const out = Object.fromEntries([...block.matchAll(/['"]?(\w+)['"]?\s*:\s*['"](#[0-9a-fA-F]{6})['"]/g)].map((m) => [m[1], m[2].toLowerCase()]));
  if (!out.state || !out.capital || out.state === out.capital) throw new Error(`§0.5 FAMILY_COLOR: state/capital did not parse as two distinct #rrggbb values from src/components/viz/ForceGraph.tsx (${JSON.stringify(out)})`);
  return out;
})();
const hexToRgb = (h) => { const m = h.replace('#', '').match(/.{2}/g).map((x) => parseInt(x, 16)); return `rgb(${m[0]}, ${m[1]}, ${m[2]})`; };
const lumOf = (rgb) => { const m = (rgb ?? '').match(/\d+(\.\d+)?/g)?.map(Number) ?? [0, 0, 0]; return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
const hslOf = (rgb) => {
  const [r, g, b] = ((rgb ?? '').match(/\d+(\.\d+)?/g)?.map(Number) ?? [0, 0, 0]).map((x) => x / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return { h: 0, l: l * 100 };
  const d = max - min;
  const h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, l: l * 100 };
};

test('AC-137 — Draw tier as dash on every mark and never as stage; draw reported rows in the reported dash with the word', async (t) => {
  if (!requireFull(t)) return;
  const DASHES = new Set(Object.values(TIER_DASH));
  await withPage('D', async (page) => {
    for (const lens of LENSES) {
      await load(page, LENS_ROUTE[lens]);
      const marks = await page.evaluate(() => [...document.querySelectorAll('[data-mark], [data-band]')].map((e) => ({ kind: e.getAttribute('data-mark') ?? 'band', cr: e.getAttribute('data-cr'), dash: window.__ac.dash(e) })));
      for (const m of marks) assert.ok(DASHES.has(m.dash), `${lens} ${m.kind}: dash "${m.dash}" is a tier dash`);
      for (const m of marks.filter((x) => x.kind === 'award' && x.cr != null)) {
        const e = PRICED.find((x) => Math.abs(x.a - Number(m.cr)) <= 0.005);
        if (e) assert.equal(m.dash, TIER_DASH[e.tier], `${lens} award ₹${m.cr}: the ${e.tier} dash`);
      }
      if (lens === 'budgets') {
        const bands = marks.filter((x) => x.kind === 'band');
        const bandDashes = new Set([TIER_DASH.documented, ...(UNION_ROWS.filter((r) => DEFENCE_BODIES.includes(r.body)).some(isReported) ? [TIER_DASH.reported] : [])]);
        assert.ok(bands.every((b) => bandDashes.has(b.dash)), `stack bands carry their rows' tier dash (${[...new Set(bands.map((b) => b.dash))]})`);
        const lanes = await ledgerLanes(page);
        for (const lane of lanes.slice(0, 40)) {
          const key = resolveLane(lane.attr, lane.label);
          assert.ok(key, `lane "${lane.label}" carries a LANES key (reads "${lane.attr}")`);
          if (LANE_ROWS(key).some(isReported)) continue;
          const dashes = await page.evaluate((attr) => { const th = [...document.querySelectorAll('[data-lane]')].find((e) => e.getAttribute('data-lane') === attr); const tr = th?.closest('tr, [role="row"]'); return [...(tr?.querySelectorAll('[data-slot]') ?? [])].filter((s) => ['row', 'two', 'zero'].includes(s.getAttribute('data-slot-state'))).map((s) => window.__ac.dash(s.querySelector('rect, path') ?? s)); }, lane.attr);
          assert.ok(dashes.every((d) => d === TIER_DASH.documented), `${key}: BE, RE and actual slots of a documented lane share the documented dash (never by stage)`);
        }
        await openTwin(page, 'state-table');
        const prs = STATE_ROWS.filter((r) => /PRS/.test(r.head));
        const tbl = await twinTable(page, 'state-table');
        const iPrs = tbl.headers.findIndex((h) => h.includes('District Police line, PRS'));
        for (const r of prs) assert.ok(tbl.rows[UNITS.indexOf(r.payer)]?.[iPrs]?.includes('reported'), `${r.payer}: the PRS row sits in its own column with the word reported`);
      }
      if (lens === 'footprint') {
        const rows = (await allTwinPages(page, 'places', '/security?lens=footprint')).flatMap((p) => p.rows.map((r) => r.join(' | ')));
        for (const r of REPORTED_FOOTPRINT) assert.ok(rows.find((x) => x.includes(r.label))?.includes('reported'), `${r.id}: its PlaceList row says reported`);
      }
    }
    const cell = await cellParam(page);
    await load(page, `/security?cell=${encodeURIComponent(cell)}`);
    const rows = LANE_ROWS(CELL_SAMPLE.key).filter((r) => r.fy === CELL_SAMPLE.fy);
    const card = (await panel(page, esc(CELL_SAMPLE.fy)))?.text ?? '';
    for (const r of rows) assert.ok(card.includes(isReported(r) ? 'reported' : 'documented'), `CellCard ${r.stage}: its tier word`);
  });
});

test('AC-138 — Keep hatch, crosshatch, stipple, zero, hollow, dot, ramp floor and ground distinct in greyscale', async (t) => {
  if (!requireFull(t)) return;
  const floor = lumOf(hexToRgb('#2e373f'));
  for (const vp of ['M', 'FOLD']) {
    await withPage(vp, async (page) => {
      for (const lens of LENSES) {
        await load(page, LENS_ROUTE[lens]);
        if (SHOTS) { mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: join(SHOTS, `security-${lens}-${vp}.png`), fullPage: true }); }
        const sels = {
          hatch: 'path[data-fill-class="hatch"]', crosshatch: 'path[data-fill-class="crosshatch"]', stipple: 'path[data-fill-class="stipple"]',
          zero: '[data-slot-state="zero"]', hollow: '[data-mark="award-unpriced"]', dot: '[data-dot]',
        };
        const samples = {};
        for (const [k, s] of Object.entries(sels)) {
          const at = await page.evaluate((sel) => { const e = document.querySelector(sel); if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return r.width ? { x: r.x + r.width / 2 - 6, y: r.y + r.height / 2 - 6 } : null; }, s);
          if (at) samples[k] = await greySample(page, at);
        }
        const ramp = await page.evaluate(() => {
          const vals = [...document.querySelectorAll('path[data-fill-class="value"]')].map((p) => ({ p, c: getComputedStyle(p).fill }));
          const lum = (c) => { const m = c.match(/\d+(\.\d+)?/g)?.map(Number) ?? [0, 0, 0]; return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
          vals.sort((a, b) => lum(a.c) - lum(b.c));
          return vals[0]?.c ?? null;
        });
        const ground = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
        samples.ground = { mean: lumOf(ground), variance: 0 };
        if (ramp) { samples.ramp = { mean: lumOf(ramp), variance: 0 }; assert.ok(lumOf(ramp) >= floor - 0.5, `${vp} ${lens}: the darkest ramp bin (${ramp}) is not darker than #2e373f`); }
        const keys = Object.keys(samples);
        for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) assert.ok(greyDistinct(samples[keys[i]], samples[keys[j]]), `${vp} ${lens}: ${keys[i]} and ${keys[j]} are distinct in greyscale`);
        if (lens === 'budgets') {
          const ls = await page.evaluate(() => [...new Set([...document.querySelectorAll('[data-band]')].map((b) => `${b.getAttribute('data-band')}|${getComputedStyle(b).fill}`))]);
          const by = new Map(ls.map((x) => x.split('|')));
          const lights = [...by.values()].map((c) => hslOf(c).l);
          for (let i = 0; i < lights.length; i++) for (let j = i + 1; j < lights.length; j++) assert.ok(Math.abs(lights[i] - lights[j]) >= 8, `${vp}: stack band lightness steps differ by ≥ 8 (${lights.map((x) => x.toFixed(1))})`);
        }
      }
      await load(page, '/security?lens=procurement');
      const d = await page.evaluate(() => [...document.querySelectorAll('[data-mark]')].map((e) => window.__ac.dash(e)));
      assert.notEqual(TIER_DASH.documented, TIER_DASH.alleged, 'documented and alleged dashes differ');
      assert.ok(new Set(d).size >= 1, `${vp}: marks carry dashes`);
    });
  }
});

test('AC-139 — Key no fill or stroke to party, kind, stage or component; share one y-scale; one dot fill', async (t) => {
  if (!requireFull(t)) return;
  await withPage('D', async (page) => {
    await load(page, '/security');
    const r = await page.evaluate(() => ({
      office: [...new Set([...document.querySelectorAll('[data-mark="office"]')].map((e) => getComputedStyle(e).fill))],
      officeStroke: [...new Set([...document.querySelectorAll('[data-mark="office"]')].map((e) => getComputedStyle(e).stroke))],
      bands: [...new Set([...document.querySelectorAll('[data-band]')].map((e) => getComputedStyle(e).fill))],
      ticks: [...document.querySelectorAll('[data-q="B1"] figure svg text')].map((e) => e.textContent.trim()).filter((s) => /^₹?[\d,]+(\.\d+)?( cr| k| lakh)?$/.test(s)),
    }));
    assert.ok(r.office.length <= 1, `office bars share one fill across windows whatever their party text (${r.office})`);
    assert.ok(r.officeStroke.length <= 1, `office bars share one stroke across windows whatever their party text (${r.officeStroke})`);
    const hues = r.bands.map((c) => hslOf(c).h);
    assert.ok(hues.length >= 2, 'stack bands drawn');
    for (const h of hues) assert.ok(Math.abs(h - hues[0]) <= 2 || Math.abs(Math.abs(h - hues[0]) - 360) <= 2, `band fills share one hue (± 2°): ${hues.map((x) => x.toFixed(1))}`);
    const nums = r.ticks.map((s) => num(s.replace(/[₹a-z ]/g, '')));
    const max = Math.max(...nums);
    assert.ok(nums.filter((n) => n === max).length >= 2, 'the two stack panels print the same max tick (one shared y-scale)');
    await load(page, '/security?lens=footprint');
    const dots = await page.evaluate(() => [...new Set([...document.querySelectorAll('[data-dot]')].map((e) => getComputedStyle(e).fill))]);
    assert.equal(dots.length, 1, 'every [data-dot] has one fill');
    await load(page, '/security?lens=procurement');
    if (!PRICED.length) { t.diagnostic('SKIPPED: no priced non-alleged award in the module'); return; }
    const aw = await page.evaluate(() => [...document.querySelectorAll('[data-mark="award"]')].map((e) => { const cs = getComputedStyle(e); return { cr: e.getAttribute('data-cr'), fill: cs.fill, stroke: cs.stroke }; }));
    const solid = (f) => f && f !== 'none' && f !== 'rgba(0, 0, 0, 0)';
    const hueOf = (v) => { const f = nodeOf(v)?.fam; return FAMILY_COLOR[f] ? hexToRgb(FAMILY_COLOR[f]) : null; };
    assert.ok(aw.some((x) => solid(x.fill)), 'at least one award mark carries a fill');
    for (const m of aw.filter((x) => x.cr != null && solid(x.fill))) {
      const cands = PRICED.filter((e) => Math.abs(e.a - Number(m.cr)) <= 0.005);
      if (!cands.length) continue;
      const ok = new Set(cands.map((e) => hueOf(e.t)).filter(Boolean));
      assert.ok(ok.has(m.fill), `award ₹${m.cr}: fill ${m.fill} is its vendor's family hue (${[...ok]}), not another key`);
    }
    const expected = new Set(PRICED.map((e) => hueOf(e.t)).filter(Boolean));
    assert.deepEqual([...new Set(aw.map((x) => x.fill).filter(solid))].sort(), [...expected].sort(), "award fills are exactly the family hues of the priced vendors' classes");
    assert.ok(new Set(aw.map((x) => x.stroke).filter(solid)).size <= 2 + expected.size, 'award strokes vary by no key beyond family hue and selection accent');
  });
});

test('AC-140 — Show the pension band and its share label in the first viewport at 1280 × 800', async (t) => {
  if (!requireFull(t)) return;
  await withPage('FOLD', async (page) => {
    await load(page, '/security');
    const r = await page.evaluate((fy) => {
      const c = [...document.querySelectorAll('[data-column][data-panel="defence"]')].find((x) => x.getAttribute('data-column') === fy);
      const band = c?.querySelector('[data-band="pension"]');
      const label = c ? window.__ac.deepest(c, '% of (published total|stack, computed here)') : null;
      return { band: band?.getBoundingClientRect().bottom ?? null, label: label?.getBoundingClientRect().bottom ?? null, res: document.querySelector('#resolution')?.getBoundingClientRect().height ?? null, fig: document.querySelector('[data-q="B1"] figure')?.getBoundingClientRect().height ?? null };
    }, LATEST_FY(DEFAULT_STAGE));
    assert.ok(r.band != null && r.band <= 800, `the pension band bottom ${r.band} ≤ 800`);
    assert.ok(r.label != null && r.label <= 800, `its share label bottom ${r.label} ≤ 800`);
    assert.ok(r.res != null && r.res <= 132, `#resolution height ${r.res} ≤ 132 px`);
    assert.ok(r.fig >= 360 && r.fig <= 520, `the figure height ${r.fig} in [360, 520]`);
  });
});

test('AC-141 — Never rescale the x-domain under `fy`', async (t) => {
  if (!requireFull(t)) return;
  const ends = (page) => page.evaluate(() => {
    const fyRe = /\b\d{4}-\d{2}\b/g;
    const labels = (el) => (el ? [...el.querySelectorAll('text, th[scope="col"], [data-axis] *')].map((e) => (e.textContent.match(fyRe) ?? [])[0]).filter(Boolean) : []);
    const get = (id) => { const l = labels(window.__ac.q(id)?.querySelector('figure') ?? window.__ac.q(id)); return [l[0] ?? null, l.at(-1) ?? null]; };
    return { stack: get('B1'), office: get('B2'), ledger: get('B3'), cols: document.querySelectorAll('[data-column][data-panel="defence"]').length };
  });
  await withPage('D', async (page) => {
    await load(page, '/security');
    const rest = await ends(page);
    for (const [k, v] of Object.entries(rest)) if (k !== 'cols') assert.ok(v[0] && v[1], `${k}: axis labels at rest`);
    for (const [q, inRange] of [[`fy=${FY_AXIS[10]}`, [FY_AXIS[10]]], [`fy=${FY_AXIS[2]}..${FY_AXIS[4]}`, FY_AXIS.slice(2, 5)]]) {
      await load(page, `/security?${q}`);
      assert.deepEqual(await ends(page), rest, `${q}: the first and last axis labels and the column count are unchanged`);
      for (const c of await stackColumns(page)) if (!inRange.includes(c.fy)) assert.ok(c.opacity >= 0.2 && c.opacity <= 0.3, `${q} FY${c.fy}: opacity ${c.opacity} in [0.2, 0.3]`);
    }
  });
});

test('AC-142 — Show no vendor alone in any URL state', async (t) => {
  if (!requireFull(t)) return;
  for (const vp of ['D', 'M']) {
    await withPage(vp, async (page) => {
      for (const u of RF3_URLS()) {
        await load(page, u);
        const r = await page.evaluate(() => {
          const heads = [...document.querySelectorAll('h3, h4, h5, h6')];
          const band = (re) => { const h = heads.find((x) => re.test(window.__ac.txt(x))); const sec = h?.closest('section, div'); return { head: !!h, cards: sec ? [...sec.querySelectorAll('[data-vendor-card]')].map((c) => window.__ac.txt(c.querySelector('h4'))) : [] }; };
          return { cards: document.querySelectorAll('[data-vendor-card]').length, pub: band(/^public sector/i), priv: band(/^private, JV or foreign/i), guard: document.body.innerText.includes('Comparison set required'), text: document.body.innerText };
        });
        assert.equal(r.cards, VENDORS.length, `${vp} ${u}: ${VENDORS.length} vendor cards`);
        for (const b of [r.pub, r.priv]) {
          assert.ok(b.head && (b.cards.length >= 1 || r.guard), `${vp} ${u}: both class bands render with a card, or "Comparison set required"`);
          assert.deepEqual(b.cards, [...b.cards].sort((a, c) => a.localeCompare(c)), `${vp} ${u}: a band is alphabetical (the vendor with most awards is not placed first by count)`);
        }
        if (u.includes('vendor=')) {
          const m = await vendorState(page);
          assert.ok(m.margin.some((n) => n >= 2), `${vp} ${u}: the margin holds ≥ 2 vendor <dl>s`);
        }
        for (const v of UNCLASS_V) assert.ok(r.text.includes(labelOf(v)), `${vp} ${u}: unclassified ${labelOf(v)} is listed by name`);
      }
    });
  }
});

/** Page-authored words only: [data-page-copy] minus any [data-quoted] inside it. */
const pageCopy = (page) => page.evaluate(() => {
  const own = (el) => { const c = el.cloneNode(true); c.querySelectorAll('[data-quoted]').forEach((q) => q.remove()); return c.textContent.replace(/\s+/g, ' ').trim(); };
  const copy = [...document.querySelectorAll('[data-page-copy]')].filter((e) => !e.closest('[data-quoted]')).map(own);
  const heads = [...document.querySelectorAll('[data-q] h3, [data-pair] h4, [data-q] > h4')].filter((e) => !e.closest('[data-quoted]')).map(own);
  const labels = [...document.querySelectorAll('[aria-label]')].filter((e) => !e.closest('[data-quoted]')).map((e) => e.getAttribute('aria-label'));
  return [...copy, ...heads, ...labels].join('\n');
});

test('AC-143 — Use no partisan frame in the page\'s own words, and spell British', async (t) => {
  if (!requireFull(t)) return;
  const CI = new Set(['ruling', 'opposition', 'era', 'regime', 'incumbent']);
  const partyRes = PARTY_WORDS.map((w) => new RegExp(`(^|[^\\p{L}\\p{N}])${esc(w)}(?=$|[^\\p{L}\\p{N}])`, CI.has(w.toLowerCase()) ? 'iu' : 'u'));
  await withPage('D', async (page) => {
    let all = '';
    for (const lens of LENSES) {
      await load(page, LENS_ROUTE[lens]);
      const c = await pageCopy(page);
      assert.ok(c.length > 200, `${lens}: page-authored copy is marked [data-page-copy]`);
      all += `\n${c}`;
      for (const f of await allTsvs(page, lens)) all += `\n${f.text.split('\n').filter((l) => l.startsWith('#')).join('\n')}`;
    }
    for (const re of partyRes) assert.ok(!re.test(all), `no partisan word ${re} in the page's own words (found: "${all.match(re)?.[0]}")`);
    for (const w of AMERICAN) assert.ok(!new RegExp(`\\b${w}\\b`, 'i').test(all), `British spelling: no "${w}"`);
    assert.ok(!/\blicense\b/i.test(all), 'British spelling: no noun "license"');
  });
});

test('AC-144 — Rank nothing by a page-computed figure', async (t) => {
  if (!requireFull(t)) return;
  const laneOrder = (page) => page.evaluate(() => [...document.querySelectorAll('[data-lane]')].map((e) => e.getAttribute('data-lane') + '|' + window.__ac.txt(e)));
  await withPage('D', async (page) => {
    await load(page, '/security');
    const rest = await laneOrder(page);
    for (const q of ['stage=RE', 'stage=actual', `fy=${FY_AXIS[2]}..${FY_AXIS[8]}`]) { await load(page, `/security?${q}`); assert.deepEqual(await laneOrder(page), rest, `${q}: lane order unchanged`); }
    await load(page, '/security');
    await openTwin(page, 'state-table');
    assert.deepEqual((await twinTable(page, 'state-table')).rows.map((r) => r[0]), UNITS.map((u) => STATE_NAME.get(u)), 'the state table defaults to UNITS order');
    const sorts = await page.evaluate(() => [...document.querySelectorAll('th[aria-sort]')].map((th) => window.__ac.txt(th)));
    for (const s of sorts) assert.ok(/% of GSDP|₹ cr|per lakh/.test(s), `aria-sort only on a declared external quantity ("${s}")`);
    await load(page, '/security?lens=procurement', { slice: S8 });
    const pairs = await page.evaluate(() => [...document.querySelectorAll('[data-pair]')].map((p) => [...p.querySelectorAll('[data-case]')].map((c) => c.getAttribute('data-case'))));
    assert.ok(pairs.flat().filter((id) => id !== 'none').every((id) => CASES.includes(id)), 'every [data-case] carries a force:case- id');
    assert.deepEqual(pairs.slice(0, CASE_PAIRS.length).map((p) => [...p].sort().join('|')), CASE_PAIRS.map((p) => [p.a, p.b].sort().join('|')), 'case pairs in FIRST_RECORD order');
    if (S8) assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('[data-class]:not([data-rate])')].map((e) => e.getAttribute('data-class'))), SLICE.rates.byClass.map((c) => c.class), 'slice class rows in file order');
    await openTwin(page, 'bonds');
    const bonds = await twinTable(page, 'bonds');
    const iDonor = window_col(bonds, 'donor');
    const donors = uniq(bonds.rows.map((r) => r[iDonor]).filter(Boolean));
    assert.deepEqual(donors, [...donors].sort((a, b) => a.localeCompare(b)), 'bond donors alphabetical');
    const allSorts = await page.evaluate(() => [...document.querySelectorAll('th[aria-sort], button')].filter((b) => /^Sort by /.test(window.__ac.txt(b)) || b.hasAttribute('aria-sort')).map((b) => window.__ac.txt(b)));
    for (const s of allSorts) assert.ok(!/computed here|count|awards|party/i.test(s), `no sort on a computed share, a page count, a party or an award count ("${s}")`);
    // [Adjudicated 2026-10-07 — Reading B] Scan all page-authored text (main and the live region,
    // at rest and under view=table, plus aria-label/-description, title, alt, placeholder) outside
    // [data-quoted], #refusals and the rail-foot `Not offered:` line, after removing verbatim only
    // the spec's fixed phrases (C2, C6, C11, C12, C17, `Rank class`, the per-person option's name).
    const RANK = /\b(most|top|rank|ranks|ranked|ranking|rankings|score|scores|scored|scoring|index|indexes|indices|risk|risks|risky|riskier|riskiest|leaderboard)\b/i;
    const FIXED = [/not added on top/gi, /Most installations are older than any government/gi, /most DPSU plants/gi, /most command headquarters/gi, /for a rank, never a person/gi, /at the public rank/gi, /would re-rank states/gi, /^Rank class$/i];
    const strip = (s) => FIXED.reduce((a, re) => a.replace(re, ' '), s);
    const scan = () => page.evaluate(() => {
      const norm = (s) => (s ?? '').replace(/\s+/g, ' ').trim();
      const out = [];
      for (const root of document.querySelectorAll('main, [aria-live]')) for (const e of [root, ...root.querySelectorAll('*')]) {
        if (e.closest('[data-quoted], #refusals')) continue;
        if ([...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) out.push(norm(e.textContent));
        for (const a of ['aria-label', 'aria-description', 'title', 'alt', 'placeholder']) if (e.hasAttribute(a)) out.push(norm(e.getAttribute(a)));
      }
      return [...new Set(out)];
    });
    for (const lens of LENSES) {
      const r = LENS_ROUTE[lens];
      for (const rt of [r, `${r}${r.includes('?') ? '&' : '?'}view=table`]) {
        await load(page, rt);
        const hits = (await scan()).filter((s) => !s.startsWith('Not offered:')).filter((s) => RANK.test(strip(s)));
        assert.deepEqual(hits, [], `${rt}: no rank word in page-authored text outside quoted text, the refusals and the spec's fixed phrases`);
      }
    }
  });
});

test('AC-145 — Keep map bins fixed under every filter', async (t) => {
  if (!requireFull(t)) return;
  await withPage('D', async (page) => {
    await load(page, '/security');
    const spend0 = legendBins((await mapOptions(page, 'B6', 0))?.legend);
    const str0 = legendBins((await mapOptions(page, 'B6', 1))?.legend);
    assert.ok(spend0 && str0, 'both legends name their bins by their edges');
    const spendQs = [...STATE_PAIRS.filter((p) => p.fy === GSDP_FY).map((p) => `sfy=${p.key}`), `st=${STATE_SAMPLE}`, `fy=${FY_AXIS[5]}`, 'tier=documented', 'payer=states'];
    for (const q of spendQs) { await load(page, `/security?${q}`); assert.equal(legendBins((await mapOptions(page, 'B6', 0))?.legend), spend0, `spend bins unchanged under ${q}`); }
    for (const q of [...STRENGTH_YEARS.map((y) => `sy=${y}`), `st=${STATE_SAMPLE}`, `fy=${FY_AXIS[5]}`]) { await load(page, `/security?${q}`); assert.equal(legendBins((await mapOptions(page, 'B6', 1))?.legend), str0, `strength bins unchanged under ${q}`); }
  });
});

test('AC-146 — List every void, gap, killed claim and true derived gap at findings size', async (t) => {
  if (!requireFull(t)) return;
  const famSplits = [...countBy(F.FORCE_NODES, (n) => n.ty).keys()].filter((ty) => new Set(F.FORCE_NODES.filter((n) => n.ty === ty).map((n) => n.fam)).size > 1);
  const noGsdp = UNITS.filter((u) => GSDP.get(u) == null).length;
  const commNoStrength = COMMISSIONERATES.filter((c) => !STRENGTH.some((s) => s.body === c.body)).length;
  const noDate = FOOTPRINT.filter((r) => r.since === null).length;
  const DERIVED = [
    [!S1, 'Demand hierarchy is not a field'],
    [!S2, 'Grants to states name their recipient in the line\'s text only'],
    [!S3, 'No population series: per-person spending is not drawn'],
    [!S3, `The spend map's denominator is a secondary GSDP series for one FY; ${noGsdp} of 36 units have none`],
    [!S12, 'Base-rate years and kinds are in words, not fields'],
    [!S4, 'Budget, strength and footprint tiers are read from the'],
    [!S9(), `${commNoStrength} commissionerates have no strength row`],
    [!S7, `Installations have no coordinates; ${noDate} of ${FOOTPRINT.length} carry no date`],
    [!S5, 'Vendor class is not a field; vendors are grouped by actor family'],
    [!S6, 'Outcome rates by state exist only in research prose'],
    [UNPAIRED.length > 0, `${UNPAIRED.length} case(s) have no recorded control pairing`],
    [EMPTY_SRCS.length > 0, `${EMPTY_SRCS.length} records have no source in the file`],
    [SPLIT_IDS > 0, `${SPLIT_IDS} entities appear under two ids and are not merged by name`],
    [EMPTY_KINDS.length > 0, `${EMPTY_KINDS.length} declared installation kinds have no row`],
  ];
  function S9() { return STRENGTH.some((s) => COMMISSIONERATES.some((c) => c.body === s.body)); }
  await withPage('D', async (page) => {
    await load(page, '/security');
    const g = ungroup(await text(page.locator('#gaps')));
    const m = g.match(/(\d+) voids and (\d+) gaps recorded by the research, (\d+) claim\(s\) killed in audit, and (\d+) derived by this page\./);
    assert.ok(m, `#gaps header (reads "${g.slice(0, 200)}")`);
    assert.deepEqual([int(m[1]), int(m[2]), int(m[3])], [F.FORCE_VOIDS.length, F.FORCE_GAPS.length, KILLED.length], 'voids, gaps and killed counts');
    const raw = (await text(page.locator('#gaps')));
    for (const v of F.FORCE_VOIDS) assert.ok(raw.includes(v.what.replace(/\s+/g, ' ').trim()), `void listed: "${v.what.slice(0, 60)}"`);
    for (const x of F.FORCE_GAPS) assert.ok(raw.includes(x.text.replace(/\s+/g, ' ').trim()), `gap listed: "${x.text.slice(0, 60)}"`);
    for (const k of KILLED) for (const s of [k.id, k.lab, k.killedReason].filter(Boolean)) assert.ok(raw.includes(String(s).replace(/\s+/g, ' ').trim()), `killed ${k.id}: "${String(s).slice(0, 50)}" verbatim`);
    for (const [cond, line] of DERIVED) assert.equal(raw.includes(line), !!cond, `derived gap "${line.slice(0, 70)}" present iff its condition holds (${!!cond})`);
    if (famSplits.length) assert.ok(/hue/i.test(raw), 'the inconsistent-hue line');
    for (const lens of LENSES) {
      await load(page, LENS_ROUTE[lens]);
      const r = await page.evaluate(([id, whats]) => {
        const b = window.__ac.q(id);
        const bodyP = document.querySelector('#gaps p') ?? b?.querySelector('p');
        return whats.map((w) => { const e = b ? [...b.querySelectorAll('*')].filter((x) => window.__ac.raw(x).includes(w) && ![...x.children].some((c) => window.__ac.raw(c).includes(w)))[0] : null; return { w, found: !!e, closed: !!e?.closest('details:not([open])'), size: e ? getComputedStyle(e).fontSize : null, body: bodyP ? getComputedStyle(bodyP).fontSize : null }; });
      }, [CANNOT_SHOW[lens], VOIDS(LENS_DOMAINS[lens]).map((v) => v.what.replace(/\s+/g, ' ').trim().slice(0, 80))]);
      for (const v of r) {
        assert.ok(v.found, `${lens}: CannotShow lists "${v.w.slice(0, 60)}"`);
        assert.ok(!v.closed, `${lens}: never inside a closed <details>`);
        assert.equal(v.size, v.body, `${lens}: at findings size`);
      }
    }
  });
});

test('AC-147 — Refuse in the rail foot and in `#refusals`', async (t) => {
  if (!requireFull(t)) return;
  await withPage('D', async (page) => {
    await load(page, '/security', { graph: true });
    const r = await page.evaluate(() => ({ bold: [...document.querySelectorAll('#refusals strong, #refusals b')].map((e) => window.__ac.txt(e)), text: window.__ac.txt(document.querySelector('#refusals')), foot: [...document.querySelectorAll('a[href*="refusals"]')].length, conn: window.__ac.txt(document.querySelector('#connections')) }));
    for (const p of REFUSALS) assert.ok(r.bold.some((b) => b.startsWith(p)) || r.text.includes(p), `#refusals lists "${p}"`);
    assert.equal(REFUSALS.filter((p) => r.text.includes(p)).length, 14, 'the fourteen §14 items');
    assert.ok(r.foot >= 1, 'the rail foot links to #refusals');
    const c = ungroup(r.conn);
    assert.ok(c.includes(`${UNRESOLVED.length} edges with an endpoint outside every register are not drawn`), `the graph status line: "${UNRESOLVED.length} edges with an endpoint outside every register are not drawn"`);
    assert.ok(c.includes(`${SPLIT_IDS} entities appear under two ids`), `the graph status line: "${SPLIT_IDS} entities appear under two ids"`);
  });
});

test('AC-148 — B-J1: read the latest year\'s pensions and copy a citation in two interactions', async (t) => {
  if (!requireFull(t)) return;
  const fy = LATEST_FY(DEFAULT_STAGE);
  const share = PENSION_SHARE(fy, DEFAULT_STAGE);
  const pensionRow = DEFENCE_DEMANDS(fy, DEFAULT_STAGE).find((r) => r.component === 'pension');
  if (!need(t, pensionRow, `no pension demand in FY${fy}`)) return;
  for (const vp of ['FOLD', 'M']) {
    await withPage(vp, async (page) => {
      await load(page, '/security');
      const answer = await page.evaluate(() => { const f = document.querySelector('[data-q="B1"] figure'); if (!f) return null; const w = document.createTreeWalker(f, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) if (n.textContent.trim()) return window.__ac.txt(n.parentElement); return null; });
      const m = ungroup(answer).match(/^FY(\d{4}-\d{2}) (BE|RE|actual): pensions ₹[\d,.]+ cr, ([\d.]+)% (of published total|of stack, computed here); defence ₹[\d,.]+ cr across \d+ demands, computed here; \d+ pay lines inside revenue\./);
      assert.ok(m, `${vp}: the answer sentence (reads "${answer}")`);
      assert.equal(m[1], fy, `${vp}: the latest FY`);
      assert.ok(Math.abs(num(m[3]) - share) <= 0.01, `${vp}: the pension share ${m[3]} = ${share}`);
      if (vp === 'M') {
        const col = page.locator(`[data-column="${fy}"][data-panel="defence"]`);
        await col.tap(); await col.tap();
      } else {
        await focusAxis(page, fy);
        await page.keyboard.press('Enter');
      }
      await page.waitForFunction((f) => !!window.__ac.card((t) => t.includes(f)), fy, { timeout: ACTION_TIMEOUT });
      const ro = (await panel(page, esc(fy))).text;
      assert.ok(rupeeValues(ro).some((v) => Math.abs(v - pensionRow.cr) <= 0.5), `${vp}: the readout shows the pension ₹`);
      assert.ok(/of published total|of stack, computed here/.test(ro), `${vp}: its share with basis words`);
      assert.ok(/published total|no published all-demands total for this FY/.test(ro), `${vp}: the published total or its absence`);
      assert.ok(/https?:\/\//.test(await page.evaluate((f) => [...(window.__ac.card((t) => t.includes(f))?.querySelectorAll('a[href]') ?? [])].map((a) => a.href).join(' '), fy)), `${vp}: an http source`);
      const btn = page.getByRole('button', { name: /^Copy citation/ });
      const idx = await page.evaluate((head) => [...document.querySelectorAll('button')].filter((b) => /^Copy citation/.test(window.__ac.name(b))).findIndex((b) => window.__ac.txt(b.closest('li, tr, div')).includes(head)), pensionRow.head);
      await btn.nth(Math.max(0, idx)).click();
      await page.waitForTimeout(200);
      const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''));
      const out = await page.evaluate(() => [...document.querySelectorAll('output')].map((o) => window.__ac.txt(o)).join('\n'));
      const s = clip || out;
      for (const part of [pensionRow.head, DEFAULT_STAGE, fy, 'ICIP', `read to ${ASOF}`]) assert.ok(s.includes(part), `${vp}: the citation contains "${part}"`);
      assert.ok(/https?:\/\//.test(s), `${vp}: the citation carries an http URL`);
    });
  }
});

test('AC-149 — B-J2: reach a CAPF\'s cell card in three interactions', async (t) => {
  if (!requireFull(t)) return;
  if (!need(t, CELL_SAMPLE, 'no CAPF cell')) return;
  for (const vp of ['FOLD', 'M']) {
    await withPage(vp, async (page) => {
      await load(page, '/security');
      await find(page, labelOf(CAPF_SAMPLE));
      await page.getByRole('button', { name: /^Show its budget lines/ }).first().click();
      await waitParam(page, 'body', CAPF_SAMPLE);
      const acc = await page.evaluate(() => { const l = document.querySelector('[data-lane][aria-current="true"]'); if (!l) return null; const r = l.getBoundingClientRect(); return { inView: r.top < innerHeight && r.bottom > 0 }; });
      assert.ok(acc?.inView, `${vp}: the lanes are accented and scrolled into view`);
      const label = labelOf(CAPF_SAMPLE);
      const cells = page.locator('[role="grid"] [aria-label]');
      const idx = await cells.evaluateAll((els, [l, mid]) => els.findIndex((e) => (e.getAttribute('aria-label') ?? '').startsWith(l) && (e.getAttribute('aria-label') ?? '').includes(mid)), [label, ` — ${CELL_SAMPLE.component} — ${CELL_SAMPLE.line}, FY${CELL_SAMPLE.fy}:`]);
      assert.ok(idx >= 0, `${vp}: a cell for FY${CELL_SAMPLE.fy}`);
      await cells.nth(idx).click();
      await waitParam(page, 'cell');
      const card = await page.evaluate((fy) => { const el = window.__ac.card((t) => t.includes(fy)); return el ? { text: window.__ac.txt(el), crs: [...el.querySelectorAll('[data-cr]')].map((e) => window.__ac.txt(e)), out: el.querySelectorAll('output').length, http: [...el.querySelectorAll('a[href^="http"]')].length } : null; }, CELL_SAMPLE.fy);
      assert.ok(card, `${vp}: the CellCard opens`);
      assert.ok(card.crs.length >= 1 && card.crs.every(crContextOk), `${vp}: a ₹ with CR-CONTEXT`);
      const prev = fyLabel(fyStart(CELL_SAMPLE.fy) - 1);
      assert.ok(new RegExp(`FY${esc(prev)} (BE|RE|actual): ₹[\\d,.]+ cr|no (BE|RE|actual) row for FY${esc(prev)}`).test(card.text), `${vp}: the previous-year comparison`);
      assert.ok(/\b(documented|reported)\b/.test(card.text), `${vp}: a tier word`);
      assert.ok(card.http >= 1, `${vp}: an http source`);
      assert.ok(card.out >= 1, `${vp}: a rowCitation <output>`);
    });
  }
});

test('AC-150 — B-J3 / F-J: find a commissionerate and read the city sentence with no ₹ in two', async (t) => {
  if (!requireFull(t)) return;
  if (!need(t, CITY_SAMPLE, 'no commissionerate')) return;
  const state = STATE_NAME.get(CITY_SAMPLE.st);
  const cantUnit = UNITS.find((u) => FOOTPRINT.some((r) => r.st === u && r.kind === 'cantonment'));
  for (const vp of ['FOLD', 'M']) {
    await withPage(vp, async (page) => {
      await load(page, '/security');
      await find(page, CITY_SAMPLE.city);
      const res = await page.evaluate(([id, sentence]) => {
        const el = [...document.querySelectorAll(`[data-city-body="${id}"]`)].find((e) => window.__ac.txt(e) === sentence);
        const item = el?.closest('li, article, div');
        return { sentence: !!el, verbs: item ? [...item.querySelectorAll('button, a')].map((b) => window.__ac.name(b)) : [] };
      }, [CITY_SAMPLE.body, CITY_TEXT(state)]);
      assert.ok(res.sentence, `${vp}: the commissionerate result prints "${CITY_TEXT(state)}"`);
      assert.ok(res.verbs.includes('Where its police money sits'), `${vp}: its verb is "Where its police money sits"`);
      assert.ok(!res.verbs.some((v) => /budget line/.test(v)), `${vp}: no "budget line" verb for the city body`);
      await page.getByRole('button', { name: 'Where its police money sits' }).first().click();
      await waitParam(page, 'st', CITY_SAMPLE.st);
      const p = hashParams(page);
      assert.ok(!p.has('lens') || p.get('lens') === 'budgets', `${vp}: lens=budgets`);
      const ledger = await page.evaluate(([id, sentence, link]) => ({
        row: [...document.querySelectorAll(`[data-q="B7"] [data-city-body="${id}"]`)].some((e) => window.__ac.txt(e) === sentence),
        link: [...document.querySelectorAll('[data-q="B7"] a, [data-q="B7"] button')].some((a) => window.__ac.txt(a) === link),
        rupee: [...document.querySelectorAll('[data-city-body]')].filter((e) => /₹/.test(window.__ac.txt(e))).length,
        void: window.__ac.txt(window.__ac.q('B7')).includes('no primary table — the national police table is unreachable'),
      }), [CITY_SAMPLE.body, CITY_TEXT(state), `${state}'s police head →`]);
      assert.ok(ledger.row && ledger.link && ledger.void, `${vp}: the CityLedger row reads the sentence, the link and the strength void`);
      assert.equal(ledger.rupee, 0, `${vp}: no ₹ in any [data-city-body]`);
      if (!cantUnit) return;
      await load(page, '/security');
      await tab(page, 'footprint').click();
      await waitParam(page, 'lens', 'footprint');
      if (vp === 'M') await railDetails(page).locator('summary').click();
      await page.locator('button, [role="checkbox"], input[type="checkbox"], label').filter({ hasText: /^cantonment/i }).first().click();
      await waitParam(page, 'kind', 'cantonment');
      await page.locator('[data-q="F1"] svg[role="listbox"] [role="option"]').nth(UNITS.indexOf(cantUnit)).click();
      await waitParam(page, 'st', cantUnit);
      await openTwin(page, 'places');
      // §0.7: TWIN(places) is a <table> at FOLD and StackTable cards at M (spec §12) — read whichever form is there.
      const tbl = await twinRecords(page, 'places');
      assert.ok(tbl, `${vp}: TWIN(places) renders (table at FOLD, StackTable cards at M)`);
      const iK = window_col(tbl, 'Kind'); const iS = window_col(tbl, 'State');
      assert.ok(iK >= 0 && iS >= 0, `${vp}: TWIN(places) carries Kind and State fields (spec §12: every field; headers ${JSON.stringify(tbl.headers)})`);
      assert.ok(tbl.rows.length > 0 && tbl.rows.every((r) => /^cantonment/i.test(r[iK] ?? '') && r[iS] === STATE_NAME.get(cantUnit)), `${vp}: TWIN(places) rows are cantonments in ${STATE_NAME.get(cantUnit)}`);
    });
  }
});

test('AC-151 — P-J: open a comparator vendor beside its comparators in two, with holdings listed, not added', async (t) => {
  if (!requireFull(t)) return;
  if (!need(t, VENDOR_NO_AWARD, 'no comparator vendor without an award')) return;
  const v = VENDOR_NO_AWARD;
  for (const vp of ['FOLD', 'M']) {
    await withPage(vp, async (page) => {
      await load(page, '/security?lens=procurement');
      await find(page, labelOf(v));
      await page.getByRole('button', { name: /^Show vendor/ }).first().click();
      await waitParam(page, 'vendor', v);
      const card = await page.evaluate((label) => {
        const el = window.__ac.card((t) => t.startsWith(label));
        if (!el) return null;
        const dls = [...el.querySelectorAll('dl')];
        const f4 = dls[0]?.querySelector('[data-field="4"]');
        return { dts: dls.map((d) => [...d.querySelectorAll('dt')].map((x) => window.__ac.txt(x))), http: el.querySelectorAll('a[href^="http"]').length, f4: f4 ? window.__ac.txt(f4.nextElementSibling ?? f4) : null };
      }, labelOf(v));
      assert.ok(card && card.dts.length >= 1 + COMPARATORS(v).length, `${vp}: the vendor's <dl> beside its ${COMPARATORS(v).length} comparators`);
      for (const d of card.dts) assert.deepEqual(d, card.dts[0], `${vp}: identical dts`);
      assert.ok(card.http >= 1, `${vp}: an http source`);
      assert.ok(card.f4?.includes('none named in the Ministry releases the research read'), `${vp}: field 4 reads "none named in the Ministry releases the research read"`);
    });
  }
  if (!VENDOR_WITH_OWN) return;
  const owns = EDGES.filter((e) => e.pred === 'own' && e.s === VENDOR_WITH_OWN && VENDOR_SET.has(e.t));
  await withPage('FOLD', async (page) => {
    await load(page, `/security?lens=procurement&vendor=${encodeURIComponent(VENDOR_WITH_OWN)}`);
    const f3b = await page.evaluate((id) => { const c = [...document.querySelectorAll('[data-vendor-card]')].find((x) => x.getAttribute('data-vendor-card') === id) ?? window.__ac.card(() => true); const dt = c?.querySelector('[data-field="3b"]'); const dd = dt?.nextElementSibling; return dd ? { text: window.__ac.txt(dd), links: [...dd.querySelectorAll('a, button')].map((a) => window.__ac.txt(a)) } : null; }, VENDOR_WITH_OWN);
    assert.ok(f3b, 'field 3b renders');
    for (const e of owns) {
      const k = AWARDS.filter((x) => x.t === e.t).length;
      assert.ok(f3b.text.includes(labelOf(e.t)), `3b lists ${labelOf(e.t)}`);
      assert.ok(f3b.text.includes(e.tier), `3b gives the holding's tier (${e.tier})`);
      const share = (e.lab ?? '').match(/\d+(\.\d+)?%/)?.[0];
      if (share) assert.ok(f3b.text.includes(share), `3b gives the share as recorded (${share})`);
      assert.ok(f3b.text.includes(`${k} named award${k === 1 ? '' : '(s)'} — listed, not added to this vendor`) || f3b.text.includes(`${k} named award(s) — listed, not added to this vendor`), `3b: "${k} named award(s) — listed, not added to this vendor"`);
    }
    const others = await page.evaluate(() => [...document.querySelectorAll('[data-vendor-card]')].map((c) => ({ id: c.getAttribute('data-vendor-card'), f: window.__ac.txt(c.querySelector('[data-field="3b"]')?.nextElementSibling) })));
    for (const o of others.filter((x) => !EDGES.some((e) => e.pred === 'own' && e.s === x.id))) assert.equal(o.f, 'no holding recorded', `${o.id}: field 3b reads "no holding recorded"`);
  });
});

test('AC-152 — P-S and P-P: find Bofors beside Rafale in one scroll, and the CAPF by-year TSV in two', async (t) => {
  if (!requireFull(t)) return;
  if (!need(t, FIRST_PAIR, 'no case pair')) return;
  for (const vp of ['FOLD', 'M']) {
    await withPage(vp, async (page) => {
      await load(page, '/security');
      await tab(page, 'procurement').click();
      await waitParam(page, 'lens', 'procurement');
      await page.waitForTimeout(SETTLE);
      const r = await page.evaluate(([a, b, lit]) => {
        const h4 = window.__ac.q('P4')?.querySelector('h4');
        if (!h4) return null;
        h4.scrollIntoView({ block: 'start' });
        const row = [...document.querySelectorAll('[data-pair]')].find((p) => p.querySelector(`[data-case="${a}"]`) && p.querySelector(`[data-case="${b}"]`));
        const cols = row ? [...row.querySelectorAll('[data-case]')] : [];
        const rr = row?.getBoundingClientRect();
        const litEl = lit ? window.__ac.deepest(window.__ac.q('P4'), lit.slice(0, 50).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) : null;
        return { inView: !!rr && rr.top < innerHeight * 2, widths: cols.map((c) => c.getBoundingClientRect().width), sizes: cols.map((c) => getComputedStyle(c).fontSize), adjacent: cols.length === 2 && cols[0].nextElementSibling === cols[1], litBefore: !!litEl && window.__ac.precedes(litEl, row) };
      }, [FIRST_PAIR.a, FIRST_PAIR.b, SYMMETRY('literature')?.replace(/\s+/g, ' ')]);
      assert.ok(r, `${vp}: the chapter-4 h4`);
      assert.ok(r.inView, `${vp}: the first pair row is within one further viewport`);
      assert.equal(r.widths.length, 2, `${vp}: both columns`);
      if (vp === 'M') assert.ok(r.adjacent, `${vp}: consecutive`);
      else assert.ok(Math.abs(r.widths[0] - r.widths[1]) <= 1, `${vp}: equal widths ± 1 px`);
      assert.equal(r.sizes[0], r.sizes[1], `${vp}: equal font-size`);
      if (SYMMETRY('literature')) assert.ok(r.litBefore, `${vp}: the literature symmetry block precedes it`);
      if (!S8 || !CAPF_CLASS) return;
      await page.locator('[data-class="capf"]:not([data-rate]) button, [data-class="capf"]:not([data-rate]) a, [data-q="P2"] button').filter({ hasText: /CAPF|capf|central armed police/i }).first().click();
      assert.ok(await page.evaluate(() => !!document.querySelector('[data-class="capf"][aria-current="true"], [data-class="capf"] [aria-current="true"]')), `${vp}: the CAPF by-year multiple is accented`);
      const d = await openTwin(page, 'slice');
      const [dl] = await Promise.all([page.waitForEvent('download'), d.getByRole('button', { name: /^Download \.tsv — / }).first().click()]);
      const tsv = readFileSync(await dl.path(), 'utf8');
      const rows = tsvRows(tsv);
      const hdr = rows[0].split('\t');
      const iC = hdr.indexOf('class'); const iY = hdr.indexOf('year');
      for (const y of SLICE.rates.byClassYear.filter((x) => x.class === 'capf')) {
        const line = rows.find((l) => { const c = l.split('\t'); return c[iC] === 'capf' && c[iY] === y.year; });
        assert.ok(line, `${vp}: the TSV has capf ${y.year}`);
        const c = line.split('\t');
        if (y.n >= 10) for (const [k, v] of [['rate', y.singleBidderPct], ['low', y.wilson95[0]], ['high', y.wilson95[1]]]) assert.equal(Number(c[hdr.indexOf(k)]), v, `${vp}: capf ${y.year} ${k} = ${v}`);
      }
    });
  }
});
