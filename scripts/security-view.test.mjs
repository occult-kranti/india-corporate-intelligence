/**
 * Unit checks for src/data/securityView.ts, the /security data layer (spec §3.2).
 *
 * The page suite (scripts/pages/security.test.mjs) reads the DOM; this file reads the
 * derivations themselves, each against an independent rule written here from the generated
 * module and the slim slice file, so a derivation that drifts fails with its own name rather
 * than as a figure on a page. It pins the corrections of the 2026-10-07 data-layer audit:
 * Delhi's panel does not carry the national records, ordnance is a rule and not a void, the
 * pay bracket reads the demand documents only, a partial stack computes no share, the two
 * works figures stay apart, and the resolution line counts only a state's own budget.
 *
 * Run: node --test scripts/security-view.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Bundle a TS module (and its imports, JSON included) to one ESM file and import it. */
async function bundle(rel, tag) {
  const r = await build({ entryPoints: [join(root, rel)], bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent', loader: { '.json': 'json' } });
  const dir = mkdtempSync(join(tmpdir(), `icip-security-view-${tag}-`));
  const out = join(dir, `${tag}.mjs`);
  writeFileSync(out, r.outputFiles[0].text);
  return import(pathToFileURL(out).href);
}

const V = await bundle('src/data/securityView.ts', 'view');
const F = await bundle('src/graph/force.generated.ts', 'force');
let SLICE = null;
try { SLICE = JSON.parse(readFileSync(join(root, 'research/raw/cppp/security-page.json'), 'utf8')); } catch { SLICE = null; }

const uniq = (xs) => [...new Set(xs)];
const round2 = (x) => Math.round(x * 100) / 100;
const isReported = (r) => (r.note ?? '').startsWith('reported:');
const empty = !!F.FORCE_META.empty;

test('resolution: a state counts as having its own budget only where its own document opened (PRS rows excluded)', (t) => {
  if (empty) return t.skip('register not promoted');
  const own = uniq(F.FORCE_BUDGETS.filter((r) => r.payer !== 'union' && r.head !== 'Police (MH 2055)' && !isReported(r)).map((r) => r.payer)).sort();
  assert.deepEqual([...V.RESOLUTION_COUNTS.statesWithOwn].sort(), own);
  const prs = F.FORCE_BUDGETS.filter((r) => r.payer !== 'union' && r.head !== 'Police (MH 2055)' && isReported(r));
  for (const r of prs) assert.equal(V.isOwnStateRow(r), false, `${r.payer} ${r.head} is a transcription, not the state's own budget`);
});

/** The national bodies, declared here independently of the module: they publish across states and sit in Delhi. */
const NATIONAL_BODIES = new Set(['force:bprd', 'force:ncrb']);
const STATE_POLICE = F.FORCE_EDGES.filter((e) => e.pred === 'analytic' && F.FORCE_EDGE_DOMAIN[e.id] === 'state-police');
const NODE = new Map(F.FORCE_NODES.map((n) => [n.id, n]));

test('stateRecords: a record is filed by its source node\'s own state, never by budget-row coverage', (t) => {
  if (empty) return t.skip('register not promoted');
  // Every record is a state's or a declared national body's; none is neither.
  for (const e of STATE_POLICE) {
    const n = NODE.get(e.s);
    assert.ok(NATIONAL_BODIES.has(e.s) || (n?.fam === 'state' && n?.st), `${e.id}: its source ${e.s} is a state body with a state, or a declared national body`);
  }
  assert.deepEqual(V.UNFILED_STATE_RECORDS.map((e) => e.id), [], 'no record is filed under no state');
  const states = uniq(STATE_POLICE.map((e) => NODE.get(e.s)?.st).filter(Boolean));
  for (const st of states) {
    const want = STATE_POLICE.filter((e) => !NATIONAL_BODIES.has(e.s) && NODE.get(e.s)?.st === st).map((e) => e.id).sort();
    assert.deepEqual(V.stateRecords(st).map((e) => e.id).sort(), want, `stateRecords(${st})`);
  }
  // A state body with no Police-head row still keeps its records (the old rule dropped them).
  const series = new Set(F.FORCE_BUDGETS.filter((r) => r.head === 'Police (MH 2055)').map((r) => r.body));
  for (const e of STATE_POLICE.filter((x) => !NATIONAL_BODIES.has(x.s) && !series.has(x.s))) {
    assert.ok(V.stateRecords(NODE.get(e.s).st).includes(e), `${e.id}: kept on ${NODE.get(e.s).st} although ${e.s} has no Police-head row`);
  }
  const national = STATE_POLICE.filter((e) => NATIONAL_BODIES.has(e.s)).map((e) => e.id).sort();
  assert.deepEqual(V.NATIONAL_STATE_RECORDS.map((e) => e.id).sort(), national, 'the national records, read under Q4');
  assert.ok(national.length > 0, 'the national comparisons exist in this build');
  for (const id of national) assert.ok(!V.stateRecords('dl').some((e) => e.id === id), `${id} is not one of Delhi's records although its source sits in Delhi`);
});

test('kindReason: ordnance is the fixed rule; any other empty kind reads a footprint void only', () => {
  assert.equal(V.kindReason('ordnance'), V.ORDNANCE_RULE);
  assert.match(V.ORDNANCE_RULE, /dpsu-plant/);
  const fpVoids = F.FORCE_VOIDS.filter((v) => v.domain === 'footprint');
  for (const k of V.EMPTY_KINDS.filter((x) => x !== 'ordnance')) {
    const re = k === 'prison' ? /prison|jail/i : new RegExp(k.replace(/-/g, '[ -]'), 'i');
    const want = fpVoids.find((v) => re.test(v.what))?.what ?? null;
    assert.equal(V.kindReason(k), want, `${k}: the footprint void that names it, or null when none does`);
    if (want == null) continue;
    assert.ok(!V.kindReason(k).startsWith('unused by rule'), `${k}: a void, not the rule`);
  }
  // A void of another domain never explains a footprint kind.
  for (const k of V.EMPTY_KINDS) { const why = V.kindReason(k); if (why && k !== 'ordnance') assert.ok(fpVoids.some((v) => v.what === why)); }
  assert.deepEqual([...V.EMPTY_BY_RULE, ...V.EMPTY_UNREACHED].sort(), [...V.EMPTY_KINDS].sort(), 'every empty kind is either a rule or unreached');
  assert.ok(!V.EMPTY_UNREACHED.includes('ordnance'), 'ordnance is never listed as unreached');
});

test('payBracket: demand-document pay lines only; another document\'s pay row is a tick of its own', (t) => {
  if (empty) return t.skip('register not promoted');
  // The defence bodies, read from the register: every Union body that prints a row under the Ministry of Defence's demands or its all-demands total.
  const mod = F.FORCE_BUDGETS.filter((r) => r.payer === 'union' && (/^Ministry of Defence/.test(r.head) || /^Demand \d+ — (Ministry of Defence|Defence|Capital Outlay on Defence)/.test(r.head)));
  const DEF = new Set(mod.map((r) => r.body));
  for (const b of V.DEFENCE_BODIES) if (F.FORCE_BUDGETS.some((r) => r.body === b && r.payer === 'union')) assert.ok(DEF.has(b), `${b}: a defence body by the register's own heads`);
  // Another document's pay row is read by its document, not by the demand regex.
  const fromOtherDoc = (r) => /^Expenditure Profile/.test(r.head);
  for (const stage of V.STAGES) {
    for (const p of V.payBracket(stage)) {
      const rows = F.FORCE_BUDGETS.filter((r) => r.payer === 'union' && r.fy === p.fy && r.stage === stage && r.component === 'pay' && DEF.has(r.body));
      const demand = rows.filter((r) => !fromOtherDoc(r));
      assert.equal(p.lines, demand.length, `${stage} ${p.fy}: lines`);
      assert.equal(p.other.length, rows.length - demand.length, `${stage} ${p.fy}: other documents`);
      if (demand.length) assert.ok(Math.abs(p.cr - demand.reduce((s, r) => s + r.cr, 0)) <= 0.01, `${stage} ${p.fy}: Σ`);
      else assert.equal(p.cr, null, `${stage} ${p.fy}: no lines is no sum, never 0`);
    }
    const { breaks, untranscribed } = V.compositionBreaks(stage);
    // Recomputed here: over the drawn columns in order, a year with no demand pay line is listed apart, never a change to 0.
    const drawn = V.defenceStack(stage).filter((c) => !c.missing).map((c) => c.fy);
    const lines = (fy) => F.FORCE_BUDGETS.filter((r) => r.payer === 'union' && r.fy === fy && r.stage === stage && r.component === 'pay' && DEF.has(r.body) && !fromOtherDoc(r)).length;
    const wantUn = drawn.filter((fy) => lines(fy) === 0);
    const wantBreaks = [];
    let prev = null;
    for (const fy of drawn) { const k = lines(fy); if (!k) continue; if (prev != null && k !== prev) wantBreaks.push({ fy, from: prev, to: k }); prev = k; }
    assert.deepEqual(untranscribed, wantUn, `${stage}: every untranscribed year, and only those`);
    assert.deepEqual(breaks, wantBreaks, `${stage}: the composition breaks`);
    for (const b of breaks) assert.ok(b.from > 0 && b.to > 0, `${stage} FY${b.fy}: a break never runs to or from zero`);
  }
  const all = V.STAGES.map((st) => V.compositionBreaks(st));
  assert.ok(all.some((x) => x.breaks.length > 0), 'the register holds at least one composition break');
});

test('agnipathTicks and the other-document pay ticks', (t) => {
  if (empty) return t.skip('register not promoted');
  for (const stage of V.STAGES) {
    const want = new Map();
    for (const r of F.FORCE_BUDGETS) if (r.payer === 'union' && r.stage === stage && /Agnipath/i.test(r.head) && V.DEFENCE_BODIES.includes(r.body)) want.set(r.fy, round2((want.get(r.fy) ?? 0) + r.cr));
    assert.deepEqual(V.agnipathTicks(stage).map((x) => [x.fy, x.cr]), [...want].sort((a, b) => (a[0] < b[0] ? -1 : 1)), `${stage}: one tick per FY with Agnipath lines, at their Σ`);
  }
  const mhaPay = F.FORCE_BUDGETS.filter((r) => r.payer === 'union' && r.component === 'pay' && r.body === 'min:ministry-of-home-affairs');
  assert.equal(V.POLICE_PAY_TICKS.length, mhaPay.length, 'every MHA pay row is a police pay tick');
  for (const r of V.POLICE_PAY_TICKS) {
    if (!/^Expenditure Profile/.test(r.head)) continue;
    assert.equal(V.otherDocument(r), r.head.split(' — ')[0]);
    assert.match(V.otherPayWords(r, 'Police'), /another definition of pay; not part of the Police demand's lines$/);
    // A Statement 22 row belongs to no demand: its denominator words say so, never "this line's demand".
    assert.match(V.crContext(r).denom, /^no denominator published for this line: a line of Expenditure Profile/);
  }
});

test('defenceStack: a partial stack without a published total computes no pension share', (t) => {
  if (empty) return t.skip('register not promoted');
  for (const stage of V.STAGES) {
    for (const c of V.defenceStack(stage)) {
      if (c.missing) continue;
      if (c.partial && !c.published) {
        assert.equal(c.pensionPct, null, `${stage} ${c.fy}: no share on a partial stack`);
        assert.ok(c.bands.every((b) => b.share == null), `${stage} ${c.fy}: no band share`);
        if (c.pension != null) assert.match(c.pensionWords, /demands recorded; no share computed/);
      } else if (c.pension != null) {
        const base = c.published ? c.published.cr : c.sum;
        assert.equal(c.pensionPct, round2((c.pension / base) * 100), `${stage} ${c.fy}: pension share`);
        assert.ok(c.pensionWords.endsWith(c.basis), `${stage} ${c.fy}: the basis words`);
      }
    }
  }
});

test('policeStack and delhiLine: the check and the share, only where both parts are printed', (t) => {
  if (empty) return t.skip('register not promoted');
  for (const stage of V.STAGES) {
    for (const p of V.policeStack(stage)) {
      if (p.revenue && p.capital) assert.equal(p.sum, round2(p.revenue.cr + p.capital.cr));
      else assert.equal(p.sum, null);
      if (!p.total || p.sum == null) assert.equal(p.check, 'incomplete');
      else assert.equal(p.check, Math.abs(p.total.cr - p.sum) <= 0.5 ? 'equal' : 'differs', `${stage} ${p.fy}: the check`);
    }
  }
  assert.ok(V.STAGES.some((st) => V.policeStack(st).some((p) => p.check === 'equal')), 'an equal year exists');
  // No unequal Police year is in this build, so the one tolerance is pinned on both sides directly.
  assert.equal(V.RECON_TOLERANCE, 0.5);
  assert.equal(V.reconciles(100, 100.5), true, 'equal within half a crore');
  assert.equal(V.reconciles(100, 100.51), false, 'differs beyond half a crore');
  assert.equal(V.reconciles(100.51, 100), false, 'symmetric');
  for (const d of V.DELHI_LINE) {
    if (d.total && d.police) assert.equal(d.shareOfPolice, round2((d.total.cr / d.police.cr) * 100));
    else assert.equal(d.shareOfPolice, null);
  }
});

test('SLICE: one works buyer and the works class are two figures under two labels', (t) => {
  if (!SLICE) return t.skip('slice not built in this copy');
  const sf = V.sliceFigures(SLICE);
  const total = SLICE.quality.total.dedupRows;
  const byBuyer = new Map();
  for (const r of SLICE.classes.map) if (r.class === 'works') byBuyer.set(r.buyer, (byBuyer.get(r.buyer) ?? 0) + r.rows);
  assert.equal(sf.worksBuyer.pct, round2((Math.max(...byBuyer.values()) / total) * 100));
  assert.equal(sf.worksClassPct, round2((SLICE.quality.byClass.find((c) => c.class === 'works').dedupRows / total) * 100));
  assert.notEqual(sf.worksBuyer.pct, sf.worksClassPct);
  // The page file carries no winner field.
  const { dropped, ...kept } = SLICE;
  assert.ok(Array.isArray(dropped) && dropped.some((d) => /topMarkedWinners/.test(d.path)), 'the projection lists the winner fields it dropped');
  assert.ok(!JSON.stringify(kept).includes('topMarkedWinners') && !('concentration' in kept) && !('redflags' in kept), 'security-page.json holds no winner list');
});

test('gapMonths: year-precision dates compute no month count', () => {
  assert.deepEqual(V.gapMonths('2007', '2008-03'), { months: null, why: 'year precision only — not computed' });
  assert.deepEqual(V.gapMonths('2007-11', '2008-03'), { months: 4, why: null });
  assert.equal(V.gapMonths(null, '2008-03').months, null);
});

test('reconSummary: every checkable year is equal or differs, and the ceiling covers the largest excess', (t) => {
  if (empty) return t.skip('register not promoted');
  for (const stage of V.STAGES) {
    const r = V.reconSummary(stage);
    const cols = V.defenceStack(stage).filter((c) => !c.missing && c.published);
    assert.equal(r.checkable, cols.length);
    assert.equal(r.equal + r.differ, r.checkable, `${stage}: equal + differ = checkable`);
    for (const c of cols) assert.equal(c.recon, V.reconciles(c.sum, c.published.cr) ? 'equal' : 'differs', `${stage} ${c.fy}: one tolerance`);
    const ex = cols.filter((c) => c.recon === 'differs').map((c) => ((c.sum - c.published.cr) / c.published.cr) * 100);
    if (ex.length) { const m = Math.max(...ex); assert.ok(r.maxPct >= m && r.maxPct - 0.1 < m + 1e-9, `${stage}: maxPct ${r.maxPct} rounds ${m} up to 0.1`); }
    else assert.equal(r.maxPct, null);
  }
});

test('BUDGET_STRIP, BUDGET_RECON and PROCUREMENT_COUNTS: counts from the generated module, every row in one term', (t) => {
  if (empty) return t.skip('register not promoted');
  const B = F.FORCE_BUDGETS;
  assert.equal(V.BUDGET_STRIP.stateUnits, uniq(B.filter((r) => r.head === 'Police (MH 2055)').map((r) => r.payer)).length);
  assert.equal(V.BUDGET_STRIP.reportedRows, B.filter(isReported).length);
  assert.equal(V.BUDGET_STRIP.zeroRows, B.filter((r) => r.cr === 0).length);
  const R = V.BUDGET_RECON;
  assert.equal(R.total, B.length);
  assert.equal(R.union + R.state, R.total);
  assert.equal(R.demand + R.inside + R.grants + R.pub, R.union, 'Union terms');
  assert.equal(R.rbi + R.own + R.prs, R.state, 'state terms');
  assert.equal(R.rbi, B.filter((r) => r.payer !== 'union' && r.head === 'Police (MH 2055)').length);
  assert.equal(R.prs, B.filter((r) => r.payer !== 'union' && r.head !== 'Police (MH 2055)' && isReported(r)).length);
  for (const k of ['inside', 'demand', 'grants', 'pub', 'own']) assert.ok(R[k] >= 0, `${k} ≥ 0`);
  const P = V.PROCUREMENT_COUNTS;
  const by = (p) => F.FORCE_EDGES.filter((e) => e.pred === p).length;
  for (const p of ['award', 'enforce', 'contra', 'role', 'bond', 'law', 'analytic']) assert.equal(P[p], by(p), p);
  assert.equal(P.award + P.enforce + P.contra + P.role + P.bond + P.law + P.analytic + P.other, F.FORCE_EDGES.length, 'every edge in one term');
});

test('gsdpShare, vacancyPct, baseRateForm and baseRateShare: each figure only on its own denominator', (t) => {
  if (empty) return t.skip('register not promoted');
  for (const r of F.FORCE_BUDGETS) {
    const g = V.gsdpShare(r);
    if (r.head !== 'Police (MH 2055)') { assert.equal(g, null, `${r.payer} ${r.head}: no GSDP share off the Police head`); continue; }
    const den = V.gsdpOf(r.payer, r.fy);
    assert.equal(g, den != null && den > 0 ? round2((r.cr / den) * 100) : null, `${r.payer} ${r.fy}: share of the same FY's GSDP or none`);
    if (g != null) assert.equal(V.crContext(r).share, g, `${r.payer} ${r.fy}: the readout and the map read one share`);
  }
  for (const r of F.FORCE_STRENGTH) {
    const derived = /DERIVED/.test(r.note ?? '');
    const want = r.sanctioned && r.actual != null && !derived ? round2(((r.sanctioned - r.actual) / r.sanctioned) * 100) : null;
    assert.equal(V.vacancyPct(r), want, `${r.body} ${r.year}: vacancy only on printed counts`);
  }
  const isInt = (x) => typeof x === 'number' && Number.isInteger(x);
  for (const r of F.FORCE_BASE_RATES) {
    const form = r.numerator == null || r.denominator == null ? 'null' : isInt(r.numerator) && isInt(r.denominator) && r.numerator <= r.denominator ? 'share' : 'two-figures';
    assert.equal(V.baseRateForm(r), form, r.property);
    assert.equal(V.baseRateShare(r), form === 'share' && r.denominator >= 10 ? round2((r.numerator / r.denominator) * 100) : null, `${r.property}: a percentage only over an integer ≥ 10`);
  }
});

test('stateSpend: Delhi is the Union demand, a missing row is no-row, a missing GSDP is no-denominator, never 0', (t) => {
  if (empty) return t.skip('register not promoted');
  for (const m of ['gsdp', 'cr']) {
    const pair = V.defaultStatePair(m);
    if (!pair) continue;
    const map = V.stateSpend(pair, m, () => true, null);
    assert.equal(map.size, 36, `${m}: every unit`);
    assert.equal(map.get('dl').cls, 'union-funded');
    for (const [st, u] of map) {
      const row = F.FORCE_BUDGETS.find((r) => r.payer === st && r.head === 'Police (MH 2055)' && r.fy === pair.fy && r.stage === pair.stage) ?? null;
      if (st === 'dl') continue;
      if (!row) { assert.equal(u.cls, 'no-row', `${m} ${st}`); assert.equal(u.value, null); continue; }
      if (m === 'gsdp') {
        const g = V.gsdpOf(st, row.fy);
        if (g == null) { assert.equal(u.cls, 'no-denominator', `${m} ${st}`); assert.equal(u.value, null); assert.match(u.denom, /^no GSDP for FY/); }
        else { assert.equal(u.cls, 'value'); assert.equal(u.tier, 'reported', 'a GSDP share rests on a reported series'); assert.match(u.denom, /computed here$/); }
      } else { assert.equal(u.value, row.cr); assert.equal(u.tier, isReported(row) ? 'reported' : 'documented'); }
    }
    const hidden = V.stateSpend(pair, m, () => false, 'tier');
    for (const [st, u] of hidden) if (st !== 'dl' && u.row) { assert.equal(u.cls, 'hidden'); assert.equal(u.value, null, `${st}: hidden is not zero`); }
  }
});

test('crContext: demand-level wording, and a plain-edition parent before the Summary edition', (t) => {
  if (empty) return t.skip('register not promoted');
  let plainChecked = 0;
  for (const r of F.FORCE_BUDGETS.filter((x) => x.payer === 'union')) {
    const c = V.crContext(r);
    if (c.parent) {
      assert.equal(c.parent.fy, r.fy); assert.equal(c.parent.stage, r.stage);
      const sib = F.FORCE_BUDGETS.filter((x) => x !== c.parent && x.payer === 'union' && x.fy === r.fy && x.stage === r.stage && V.demandNo(x.head) === V.demandNo(r.head) && V.demandTitle(x.head) === V.demandTitle(r.head));
      if (/ \(Summary of Demands for Grants, BE\)$/.test(c.parent.head) && sib.some((x) => !/ \(Summary of Demands for Grants, BE\)$/.test(x.head) && V.isDemandLevel(x) && x !== r)) assert.fail(`${r.head} ${r.fy}: a Summary-edition parent where the plain edition prints the demand`);
      if (!/ \(Summary of Demands for Grants, BE\)$/.test(c.parent.head)) plainChecked++;
      assert.match(c.denom, /^₹[\d,.]+ of ₹[\d,.]+ cr, [\d.]+% of the published .+, computed here$/);
    } else if (V.isDefence(r) && V.isDemandLevel(r) && r.head !== V.MOD_ALL_DEMANDS) {
      assert.match(c.denom, /all-demands total is not printed for (BE|RE|actual) that year$/, `${r.head} ${r.fy}: the demand-level absence names the all-demands total`);
    }
  }
  t.diagnostic(`${plainChecked} rows read against a plain-edition parent`);
});

test('quotedCr: a quoted ₹ figure hooks to its own record, never to an unrelated budget row', (t) => {
  if (empty) return t.skip('register not promoted');
  // literature:c007's research wording prints "~₹670 crore per aircraft"; the register's Assam Rifles RE 2001-02 line is ₹669.8 cr.
  const c007 = F.FORCE_EDGES.find((e) => e.id === 'literature:c007');
  const text = [c007?.lab, c007?.d, ...(c007?.srcs ?? []).map(([l]) => l)].filter(Boolean).find((x) => /₹670 crore/.test(x)) ?? null;
  assert.ok(text, 'literature:c007 prints ₹670 crore in its wording (the review\'s case)');
  const hook = V.quotedCr(text, [c007.a]);
  assert.ok(V.quotedCrs(text).includes(hook), `the hook ${hook} is a figure the wording prints`);
  assert.equal(hook, V.quotedCrs(text)[0], 'with no declared figure of its own in the wording, the first it prints');
  assert.notEqual(hook, 669.8, 'never the Assam Rifles line that happens to be within ₹0.5 cr of ₹670 crore');
  assert.equal(V.quotedCr('~₹670 crore per aircraft'), 670);
  assert.equal(V.quotedCr('a ₹1,197,328 crore total'), 1197328, '"crore" is a unit');
  assert.equal(V.quotedCr('₹500 credit line'), null, '"cr" is never read out of a longer word');
  assert.equal(V.quotedCr('₹1,202 cr and ₹458.87 cr', [458.87]), 458.87, "the record's own declared figure first");
  assert.equal(V.quotedCr('₹1,202 cr and ₹458.87 cr', [9999]), 1202, 'else the first figure, never a value from elsewhere');
  // No research wording anywhere hooks to a figure it does not print.
  const texts = [...F.FORCE_EDGES.flatMap((e) => [e.lab, e.d, e.innocentReading, ...(e.srcs ?? []).map(([l]) => l)]), ...F.FORCE_BASE_RATES.flatMap((r) => [r.label, r.property])].filter(Boolean);
  for (const x of texts) { const v = V.quotedCr(x); if (v != null) assert.ok(V.quotedCrs(x).includes(v), `"${x.slice(0, 60)}": the hook is a printed figure`); }
  assert.equal(typeof V.budgetRowFor, 'undefined', 'no value-to-row lookup is exported');
});

test('responder wording: one source for the string and the on-screen parts', (t) => {
  if (empty) return t.skip('register not promoted');
  const contras = F.FORCE_EDGES.filter((e) => e.pred === 'contra');
  for (const r of contras) {
    const p = V.responderParts(r);
    assert.equal(V.responderWords(r), `${p.pre}${V.labelOf(p.id)}${p.post}`);
    assert.equal(V.responseHeadWords(r), `Response from ${V.responderWords(r)} [${r.tier}], ${r.from ?? 'undated response'}:`);
    if (/:audit-contra$/.test(r.id ?? '') || r.lab === 'denial found in audit') assert.equal(V.responderWords(r), `the audit (recorded on ${V.labelOf(r.s)})`);
    else assert.equal(V.responderWords(r), V.labelOf(r.s));
  }
});

test('partyText, pensionSpoken and the derived gap lines', (t) => {
  assert.equal(V.partyText({ lab: 'Bihar, ruled by the Janata Dal (United) with the BJP', d: null }), 'Janata Dal (United)', 'a bracketed party name is kept whole');
  assert.equal(V.partyText({ lab: 'no party here', d: null }), null);
  assert.equal(V.pensionSpoken({ pensionPct: 0, pensionWords: 'x' }), '0 percent', 'a recorded 0 is spoken, never dropped');
  assert.equal(V.pensionSpoken({ pensionPct: null, pensionWords: '2 of 8 demands recorded; no share computed' }), '2 of 8 demands recorded; no share computed');
  if (empty) return;
  const gaps = V.derivedGaps().map((g) => g.text);
  const UNBUDGETED = /prison|jail|fire|home guard|civil defence|forensic/i;
  const hasPrison = F.FORCE_BUDGETS.some((r) => UNBUDGETED.test(r.head));
  assert.equal(gaps.includes('No budget row for prisons, fire services, home guards, civil defence or forensic laboratories'), !hasPrison, 'the prisons line holds only while no such row exists');
  const sp = STATE_POLICE.length, nat = STATE_POLICE.filter((e) => NATIONAL_BODIES.has(e.s)).length;
  assert.ok(gaps.some((x) => x.startsWith(`Outcome rates by state exist only in research prose (${sp} state-police analytic records`) && x.includes(`${nat} of them national, read under Q4`)), 'the outcome-records line counts the records and the national ones');
  const ord = gaps.find((x) => /declared installation kinds have no row/.test(x));
  if (V.EMPTY_KINDS.includes('ordnance')) assert.match(ord, /ordnance \(unused by rule.*a rule, not a gap\)/);
});

test('C10, C16 and the joint flag are read from the register', (t) => {
  if (empty) return t.skip('register not promoted');
  const per = F.FORCE_BUDGETS.filter((r) => r.payer === 'union' && r.component === 'grant-to-states' && / — (Allocation|Released)$/.test(r.head));
  assert.deepEqual(V.GRANT_SPLIT.sources.sort(), uniq(per.flatMap((r) => r.srcs.map(([l]) => l))).sort());
  assert.equal(V.GRANT_SPLIT.totalLines, uniq(per.filter((r) => /total\)/.test(r.head)).map((r) => r.head.replace(/ — (Allocation|Released)$/, ''))).length);
  const vendorsWithBoth = V.VENDORS.filter((v) => F.FORCE_EDGES.some((e) => e.pred === 'bond' && e.s === v && e.from) && F.FORCE_EDGES.some((e) => e.pred === 'award' && e.t === v && e.s === 'min:ministry-of-defence' && e.tier !== 'alleged' && e.from));
  assert.deepEqual(V.BOND_AND_AWARD_VENDORS, vendorsWithBoth);
  for (const e of V.JOINT_AWARDS) assert.ok(typeof e.a === 'number', `${e.id}: a joint total has a value`);
  assert.equal(V.countWord(1), 'one'); assert.equal(V.countWord(2), 'two'); assert.equal(V.countWord(12), '12');
});

test('quotedRow: a quoted figure is a row only of the record\'s own body, in a year the wording names', (t) => {
  if (empty) return t.skip('register not promoted');
  const c024 = F.FORCE_EDGES.find((e) => e.id === 'state-police:c024');
  if (c024?.innocentReading && /₹2,248 crore/.test(c024.innocentReading)) {
    const r = V.quotedRow(c024.innocentReading, c024);
    assert.ok(r && r.body === c024.s && r.fy === '2025-26' && Math.abs(r.cr - 2248) <= 0.5, "c024's residual ₹2,248 crore is jk's own 2025-26 row");
  }
  // c024's source label names the Union's J&K Police line (its own body) for BE 2024-25, to the paisa.
  for (const [l] of c024?.srcs ?? []) {
    const r = V.quotedRow(l, c024);
    if (r) { assert.equal(r.body, c024.s); assert.ok(l.includes(r.fy)); }
  }
  const c007 = F.FORCE_EDGES.find((e) => e.id === 'literature:c007');
  for (const x of [c007?.lab, c007?.d, c007?.innocentReading, ...(c007?.srcs ?? []).map(([l]) => l)].filter(Boolean)) assert.equal(V.quotedRow(x, c007), null, 'literature:c007 names no row of its own body');
  // Every hit is the record's own body, a year its wording prints, and a figure it prints.
  for (const e of F.FORCE_EDGES) for (const x of [e.lab, e.d, e.innocentReading]) {
    if (!x) continue;
    const r = V.quotedRow(x, e);
    if (!r) continue;
    assert.equal(r.body, e.s, `${e.id}: the row is its own body's`);
    assert.ok(x.includes(r.fy), `${e.id}: the wording names FY${r.fy}`);
    assert.ok(V.quotedCrs(x).some((v) => Math.abs(v - r.cr) <= 0.5), `${e.id}: the wording prints the figure`);
  }
  // A decimal figure must match to the paisa: ₹45,499.54 is not a ₹45,500 row of another stage.
  assert.equal(V.quotedRow('₹45,499.54 crore in 2013-14', { s: '__none__' }), null);
});
