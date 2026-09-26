/**
 * Tests for scripts/assemble-fleet.mjs.   node --test scripts/assemble-fleet.test.mjs
 *
 * The fixture is synthetic — fictional "FX" entities, example.org sources — and is
 * built by this file, so the test needs nothing outside the repository. Set
 * FLEET_FIXTURE_DIR to keep the fixture somewhere inspectable; otherwise it goes to
 * a temporary directory. Two ids are real on purpose: `pol:pralhad-joshi` and
 * `co:ntpc`, to prove inventory ids pass the endpoint gate unchanged.
 */

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync, copyFileSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { assembleFleet, assemble as assembleRaw, OUTPUTS } from './assemble-fleet.mjs';
import * as vocab from './lib/vocab.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TMP = process.env.FLEET_TEST_TMP ?? tmpdir();
const made = [];
const scratch = () => {
  const d = mkdtempSync(join(TMP, 'fleet-'));
  made.push(d);
  return d;
};
after(() => {
  for (const d of made) rmSync(d, { recursive: true, force: true });
});
const put = (path, obj) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(obj, null, 2)}\n`);
};
const S = (label, slug) => [label, `https://example.org/${slug}`];

// ---------------------------------------------------------------------------
// The fixture
// ---------------------------------------------------------------------------

const FIXTURE = {
  'energy/coal-power.json': {
    asOf: '2026-09-20',
    domain: 'coal-power',
    scope: 'Synthetic fixture for scripts/assemble-fleet.test.mjs. Not research.',
    sources: [S('Fixture index', 'index')],
    entities: [
      {
        id: 'energy:fx-power', label: 'FX Power', sub: 'fixture generator', ty: 'company', fam: 'capital', st: 'gj', sz: 3,
        al: ['FX Power Ltd'], resolved: true,
        identity: { cin: null, din: null, nse: 'FXPOWER', office: null, dob: null },
        publicRole: 'listed company', d: ['Listed on NSE [documented]'], srcs: [S('FX filing', 'fx-filing')],
      },
      { id: 'energy:fx-regulator', label: 'FX Regulator', ty: 'agency', fam: 'enforce', st: null, sz: 2, resolved: true, srcs: [S('FX regulator', 'regulator')] },
      { id: 'energy:fx-trader', label: 'FX Trader', ty: 'company', fam: 'capital', st: 'mh', sz: 1, resolved: false, collisionRisk: 'two firms trade under this name; no CIN found' },
    ],
    claims: [
      { id: 'coal-power:c001', s: 'energy:fx-regulator', t: 'energy:fx-power-ltd', pred: 'enforce', tier: 'alleged', lab: 'notice alleged', d: 'A petitioner alleges the regulator issued a show-cause notice.', from: '2024-01-10', to: null },
      { id: 'coal-power:c002', s: 'energy:fx-power-ltd', t: 'claim:coal-power:c001', pred: 'contra', tier: 'reported', lab: 'denies', d: 'FX Power denies receiving any notice.', srcs: [S('FX statement', 'fx-statement')] },
      {
        id: 'coal-power:c003', s: 'co:ntpc', t: 'energy:fx-power', pred: 'award', tier: 'documented', a: 1200, lab: 'PPA', d: 'A 25-year fixed-tariff PPA.', from: '2023-05-01',
        srcs: [S('PPA portal', 'ppa')], benefit: { who: 'energy:fx-power-ltd', how: 'fixed-tariff PPA', amountCr: 1200, confidence: 'documented' }, supersededBy: null,
      },
      { id: 'coal-power:c004', s: 'pol:pralhad-joshi', t: 'min:ministry-of-new-and-renewable-energy', pred: 'role', tier: 'documented', lab: 'minister', from: '2024-06-10', srcs: [S('Portfolio list', 'portfolio')] },
      { id: 'coal-power:c005', s: 'energy:fx-trader', t: 'energy:fx-power', pred: 'own', tier: 'reported', lab: 'stake', srcs: [S('Trade press', 'press')] },
    ],
    voids: [{ what: 'No political donation by FX Power found FY19–FY25.', whyItMatters: 'Benefit without payment.', srcs: [S('Donation register', 'register')] }],
    narratives: [{ claim: 'FX Power was favoured.', status: 'contested', strongestCase: 'Won at a low tariff.', strongestCounter: 'Lowest bid in an open auction.', whatWouldChangeThis: 'The bid sheet.', srcs: [S('Auction result', 'auction')] }],
    baseRates: [{ property: 'won a PPA in the round', numerator: 4, denominator: 11, label: 'bidders in the round', srcs: [S('Auction result', 'auction')] }],
    symmetryCheck: 'The same lens on a rival group produced the same picture.',
    gaps: ['Board minutes not public.'],
  },
  'energy/renewables.json': {
    asOf: '2026-09-21',
    domain: 'renewables',
    scope: 'Synthetic fixture. Not research.',
    sources: [S('Fixture index', 'index')],
    entities: [
      {
        id: 'energy:fx-power-ltd', label: 'FX Power Limited', ty: 'company', fam: 'capital', st: 'gj', sz: 2,
        al: ['FX Power Limited', 'FX Power Ltd'], d: ['Registered in Gujarat [documented]', 'Listed on NSE [documented]'], srcs: [S('FX annual report', 'fx-ar')],
      },
    ],
    claims: [
      { id: 'renewables:c001', s: 'energy:fx-power', t: 'co:ntpc', pred: 'analytic', tier: 'analytic', lab: 'tariff comparison', d: 'Tariffs within 2% of each other.', innocentReading: 'Both bid in the same round against the same ceiling.' },
      { id: 'renewables:c002', s: 'energy:fx-power', t: 'energy:fx-regulator', pred: 'direct', tier: 'reported', a: 5, lab: 'payment', srcs: [S('A blog', 'blog')] },
      { id: 'renewables:c003', s: 'energy:fx-regulator', t: 'energy:fx-power', pred: 'enforce', tier: 'reported', lab: 'inquiry', d: 'The regulator opened an inquiry.', from: '2025-02-01', srcs: [S('Regulator order', 'order')] },
      { id: 'renewables:c004', s: 'energy:fx-power', t: 'co:ntpc', pred: 'own', tier: 'reported', lab: 'stake', srcs: [S('Trade press', 'press-2')] },
    ],
  },
  'energy/RECONCILIATION.json': {
    mappings: [{ from: 'energy:fx-power-ltd', to: 'energy:fx-power', reason: 'same CIN in both annual reports' }],
  },
  'energy/AUDIT.json': {
    asOf: '2026-09-24',
    verdicts: [
      { claimId: 'renewables:c002', domain: 'renewables', lens: 'chronology', refuted: true, recommendedTier: 'kill', sourceCheck: 'source-does-not-say', denialFound: 'none found — not asked', innocentReading: '', reason: 'The cited page records no such payment.', corrections: [] },
      { claimId: 'renewables:c004', domain: 'renewables', lens: 'chronology', refuted: true, recommendedTier: 'reported', sourceCheck: 'partially', denialFound: 'none found — asked', reason: 'Stake predates the window.', corrections: 'drop the claim' },
      { claimId: 'renewables:c004', domain: 'renewables', lens: 'base-rate', refuted: true, recommendedTier: 'alleged', sourceCheck: 'partially', denialFound: 'none found', reason: 'Every peer holds a comparable stake.' },
      { claimId: 'coal-power:c003', domain: 'coal-power', lens: 'chronology', refuted: true, recommendedTier: 'reported', sourceCheck: 'partially', denialFound: 'none found — not asked', reason: 'Only one outlet carries the tariff.' },
      { claimId: 'coal-power:c003', domain: 'coal-power', lens: 'base-rate', refuted: false, recommendedTier: 'documented', sourceCheck: 'confirmed', denialFound: 'none found — not asked', reason: 'Award is on the portal.' },
      { claimId: 'renewables:c003', domain: 'renewables', lens: 'base-rate', refuted: false, recommendedTier: 'reported', sourceCheck: 'confirmed', denialFound: 'FX Power said the inquiry was routine (https://example.org/fx-denial).', innocentReading: 'Routine inquiries reach every generator above 500 MW.', reason: 'Inquiry confirmed; the company responded.' },
      { claimId: 'coal-power:c002', domain: 'coal-power', lens: 'chronology', refuted: false, recommendedTier: 'documented', sourceCheck: 'confirmed', denialFound: 'none found', reason: 'Statement is on the company site.' },
      { claimId: 'renewables:c999', domain: 'renewables', lens: 'chronology', refuted: true, recommendedTier: 'kill', reason: 'No such claim.' },
    ],
  },
  'welfare/women-cash.json': {
    asOf: '2026-09-22',
    domain: 'women-cash',
    scope: 'Synthetic fixture. Not research.',
    sources: [S('Fixture index', 'index')],
    schemes: [
      {
        id: 'scheme:fx-cash', name: 'FX Cash Transfer', al: ['FX Cash'], level: 'state', st: 'mp', applicableStates: null,
        category: 'women-cash', party: 'FX Party',
        announced: { date: '2023-01-28', byPersonId: 'wel:fx-cm-2023', office: 'Chief Minister, FX', srcs: [S('Announcement', 'announce')] },
        approved: { date: '2023-02-25', body: 'FX Cabinet', srcs: [S('Cabinet note', 'cabinet')] },
        launched: { date: '2023-06-10', srcs: [S('Launch', 'launch')] },
        benefit: { amount: 1000, unit: '₹ per month', changes: [{ date: '2023-10-01', amount: 1250, note: 'raised before the election', srcs: [S('Order', 'raise')] }] },
        eligibility: 'women 21–60, family income < ₹2.5 lakh',
        beneficiaries: [{ asOf: '2024-03-31', count: 1000000, srcs: [S('Portal', 'portal')] }],
        outlay: [{ fy: '2023-24', budgetedCr: 8000, actualCr: null, pctOfStateBudget: 2.6, pctOfGSDP: null, srcs: [S('Budget', 'budget')] }],
        electionContext: { election: 'FX assembly', date: '2023-11-17', monthsFromLaunch: 5, incumbentParty: 'FX Party', result: 'incumbent won', seatChange: 46, srcs: [S('Result', 'result')] },
        status: [
          { date: '2023-06-10', status: 'live', note: 'first instalment', srcs: [S('Launch', 'launch')] },
          { date: '2023-10-01', status: 'raised', note: '₹1,000 → ₹1,250', srcs: [S('Order', 'raise')] },
          { date: '2025-04-01', status: 'discontinued', note: 'wound up in the budget', srcs: [S('Budget 2025', 'budget-2025')] },
        ],
        results: [{ finding: 'A survey found most recipients spent it on household needs.', tier: 'reported', srcs: [S('Survey', 'survey')] }],
        ministers: [{ personId: 'wel:fx-cm-2023', role: 'Chief Minister', action: 'announced', date: '2023-01-28', party: 'FX Party', srcs: [S('Announcement', 'announce')] }],
        whoElseBenefits: [{ who: 'business-correspondent networks', how: 'per-transaction commission', amountCr: null, tier: 'analytic', srcs: [] }],
        srcs: [S('Scheme portal', 'portal')],
      },
    ],
    entities: [
      { id: 'wel:fx-cm', label: 'FX Chief Minister', ty: 'person', fam: 'state', st: null, sz: 2, resolved: true, identity: { office: 'Chief Minister, FX, 2020-03-23→2023-12-13' }, publicRole: 'Chief Minister', srcs: [S('Assembly', 'assembly')] },
      { id: 'wel:fx-party', label: 'FX Party', ty: 'party', fam: 'state', st: null, sz: 2, resolved: true, srcs: [S('ECI', 'eci')] },
    ],
    claims: [
      { id: 'women-cash:c001', s: 'wel:fx-cm-2023', t: 'scheme:fx-cash', pred: 'role', tier: 'documented', lab: 'announced', from: '2023-01-28', srcs: [S('Announcement', 'announce')] },
      {
        id: 'women-cash:c002', s: 'scheme:fx-cash', t: 'wel:fx-party', pred: 'analytic', tier: 'analytic', lab: 'launched 5 months before the election',
        innocentReading: 'Budget cycles put many launches in the months before an election.',
        benefit: { who: 'wel:fx-party', how: 'electoral goodwill', amountCr: null, confidence: 'unknown' },
      },
    ],
    elections: [{ st: 'mp', election: 'assembly', date: '2023-11-17', incumbentParty: 'FX Party', winner: 'FX Party', srcs: [S('Result', 'result')] }],
    coverage: [
      { st: 'mp', years: [2018, 2026], searched: true, note: 'state budget documents, every year', srcs: [S('Budgets', 'budgets')] },
      { st: 'central', fromYear: 2019, toYear: 2026, categories: 'all', method: 'Union budget, every scheme line', srcs: [S('Union budget', 'union-budget')] },
      { st: 'MP', years: [2020, 2021, 2024], srcs: [S('x', 'x')] },
      { st: 'ka', years: [2018, 2026], searched: true, srcs: [] },
      { st: 'ka', years: [2019, 2021, 2024], categories: ['women-cash', 'farmer-cash'], method: 'budget speeches in those years only', srcs: [S('Speeches', 'speeches')] },
      { st: 'tn', fromYear: 2020, toYear: 2018, categories: ['all'], srcs: [S('x', 'x')] },
      { st: 'tn', fromYear: 2018, toYear: 2020, categories: ['bribes'], srcs: [S('x', 'x')] },
    ],
    baseRates: [{ property: 'cash scheme launched within 12 months before an election', numerator: 1, denominator: 1, label: 'schemes in this fixture', srcs: [] }],
    narratives: [{ claim: 'The scheme bought the election.', status: 'speculative', strongestCase: 'Timing.', strongestCounter: 'Vote share moved in districts without the scheme too.', whatWouldChangeThis: 'District-level uptake vs swing.', srcs: [S('Analysis', 'analysis')] }],
    voids: [],
    symmetryCheck: 'Every party in the sample launched a cash scheme within a year of an election.',
    gaps: [],
  },
  'welfare/RECONCILIATION.json': {
    mappings: [{ from: 'wel:fx-cm-2023', to: 'wel:fx-cm', reason: 'same office-with-dates' }],
  },
};

function writeFixture(dir) {
  for (const [rel, doc] of Object.entries(FIXTURE)) put(join(dir, rel), doc);
  return dir;
}

const FIXTURE_DIR = process.env.FLEET_FIXTURE_DIR ?? join(scratch(), 'fleet-fixture');
rmSync(FIXTURE_DIR, { recursive: true, force: true });
writeFixture(FIXTURE_DIR);
const run = assembleFleet({ root: ROOT, dir: FIXTURE_DIR });
const E = run.energy;
const W = run.welfare;
const edge = (id) => E.edges.find((e) => e.id === id);

/** The literal grab validate.mjs uses, reimplemented here so the test does not trust either copy. */
function grab(src, name) {
  const m = src.match(new RegExp(`export const ${name}\\b[^=]*=\\s*(\\[[\\s\\S]*?\\n\\];|\\{[\\s\\S]*?\\n\\};)`, 'm'));
  assert.ok(m, `no literal for ${name}`);
  return Function(`"use strict"; return (${m[1].replace(/;$/, '')});`)();
}

// ---------------------------------------------------------------------------

test('the fixture assembles with no errors', () => {
  assert.deepEqual(run.errors, []);
  assert.equal(typeof run.energyTs, 'string');
  assert.equal(typeof run.welfareTs, 'string');
});

test('an absent fleet still emits both modules, empty, and says so', () => {
  const r = assembleFleet({ root: ROOT, dir: scratch() });
  assert.deepEqual(r.errors, []);
  for (const d of [r.energy, r.welfare]) {
    assert.equal(d.meta.empty, true);
    assert.match(d.meta.note, /emitted empty/);
    assert.equal(d.meta.asOf, null);
  }
  assert.match(r.energyTs, /export const ENERGY_NODES: GNode\[\] = \[\n\];/);
  assert.match(r.welfareTs, /export const WELFARE_SCHEMES: Scheme\[\] = \[\n\];/);
  assert.match(r.welfareTs, /export const WELFARE_COVERAGE: Coverage\[\] = \[\n\];/);
  assert.match(r.energyTs, /export const ENERGY_EDGE_DOMAIN: Record<string, string> = \{\n\};/);
  assert.notEqual(r.energy.meta.runId, r.welfare.meta.runId);
});

test('reconciliation collapses records and rewrites every reference', () => {
  assert.equal(E.nodes.some((n) => n.id === 'energy:fx-power-ltd'), false);
  const fx = E.nodes.find((n) => n.id === 'energy:fx-power');
  assert.equal(fx.label, 'FX Power', "the first record's fields win");
  assert.deepEqual(fx.al, ['FX Power Ltd', 'FX Power Limited']);
  assert.deepEqual(fx.d, ['Listed on NSE [documented]', 'Registered in Gujarat [documented]']);
  assert.equal(fx.srcs.length, 2);
  assert.deepEqual(E.meta.reconciliation.merged, [{ id: 'energy:fx-power', ids: ['energy:fx-power', 'energy:fx-power-ltd'], files: ['energy/coal-power.json', 'energy/renewables.json'], filledFrom: [] }]);
  assert.equal(edge('coal-power:c001').t, 'energy:fx-power');
  assert.equal(edge('coal-power:c002').s, 'energy:fx-power');
  assert.equal(E.benefits.find((b) => b.claimId === 'coal-power:c003').who, 'energy:fx-power');

  const s = W.schemes[0];
  assert.equal(s.announced.byPersonId, 'wel:fx-cm');
  assert.equal(s.ministers[0].personId, 'wel:fx-cm');
  assert.equal(W.edges.find((e) => e.id === 'women-cash:c001').s, 'wel:fx-cm');
});

test('audit: a kill recommendation or two refuting lenses kill; the claim is held, never deleted', () => {
  for (const id of ['renewables:c002', 'renewables:c004']) assert.equal(edge(id), undefined, `${id} must not be an edge`);
  assert.deepEqual(E.meta.killed.map((k) => k.id), ['renewables:c002', 'renewables:c004']);
  const both = E.meta.killed.find((k) => k.id === 'renewables:c004');
  assert.equal(both.status, 'killed');
  // Reasons join in lens order, not AUDIT.json row order, so reordering the file changes nothing.
  assert.equal(both.killedReason, 'Every peer holds a comparable stake. | Stake predates the window.');
  assert.equal(both.file, 'energy/renewables.json');
  assert.deepEqual(both.srcs, [S('Trade press', 'press-2')]);
  assert.deepEqual(E.meta.files.map((f) => [f.file, f.killed]), [['energy/coal-power.json', 0], ['energy/renewables.json', 2]]);
});

test('audit: one refuting lens downgrades without killing, and nothing is ever upgraded', () => {
  assert.equal(edge('coal-power:c003').tier, 'reported');
  assert.equal(E.benefits.find((b) => b.claimId === 'coal-power:c003').tier, 'reported', 'benefit rows carry the audited tier');
  assert.equal(edge('coal-power:c002').tier, 'reported');
  const v = E.meta.audit.verdicts.find((x) => x.claimId === 'coal-power:c002');
  assert.deepEqual(v.applied, ['no upgrade: recommended documented, kept reported']);
  assert.ok(E.meta.audit.verdicts.find((x) => x.claimId === 'coal-power:c003' && x.lens === 'chronology').applied.includes('downgrade documented → reported'));
});

test('audit: a confirmed denial becomes a contra answering the claim, and innocent readings fill gaps', () => {
  const c = edge('renewables:c003:audit-contra');
  assert.ok(c, 'contra added');
  assert.equal(c.s, 'energy:fx-power', '`enforce` accuses its target');
  assert.equal(c.t, 'claim:renewables:c003');
  assert.equal(c.pred, 'contra');
  assert.equal(c.tier, 'reported');
  assert.deepEqual(c.srcs, [['Denial — example.org', 'https://example.org/fx-denial']]);
  assert.equal(c.d, 'FX Power said the inquiry was routine (https://example.org/fx-denial).');
  assert.equal(edge('renewables:c003').innocentReading, 'Routine inquiries reach every generator above 500 MW.');
  assert.equal(E.meta.audit.asOf, '2026-09-24');
  assert.equal(E.meta.audit.verdicts.length, 7);
  assert.deepEqual(E.meta.audit.unmatched.map((u) => u.claimId), ['renewables:c999']);
  assert.equal(E.meta.counts.contrasAdded, 1);
});

test('unresolved endpoints are excluded and reported, not fatal', () => {
  assert.equal(edge('coal-power:c005'), undefined);
  const x = E.meta.excluded.find((k) => k.id === 'coal-power:c005');
  assert.match(x.excludedReason, /energy:fx-trader.*resolved:false/);
  assert.equal(E.nodes.find((n) => n.id === 'energy:fx-trader').resolved, false);
});

test('inventory ids pass the endpoint gate verbatim; identity rides beside the node', () => {
  assert.equal(edge('coal-power:c004').s, 'pol:pralhad-joshi');
  assert.equal(edge('coal-power:c003').s, 'co:ntpc');
  assert.equal(edge('renewables:c001').tier, 'analytic');
  assert.deepEqual(E.identity['energy:fx-power'], {
    identity: { cin: null, din: null, nse: 'FXPOWER', office: null, dob: null },
    publicRole: 'listed company',
  });
  assert.equal('identity' in E.nodes.find((n) => n.id === 'energy:fx-power'), false);
  assert.equal(Object.keys(edge('coal-power:c003')).includes('benefit'), false, 'benefit leaves the edge');
});

test('welfare: scheme normalised, scheme node derived, election and sections carried', () => {
  const s = W.schemes[0];
  assert.equal(s.electionContext.seatChange, '46', 'a number where text belongs is quoted, not dropped');
  assert.equal(s.status.length, 3);
  assert.equal(s.domain, 'women-cash');
  assert.deepEqual(W.schemeNodes.map((n) => [n.id, n.ty, n.fam, n.st]), [['scheme:fx-cash', 'mechanism', 'instrument', 'mp']]);
  assert.equal(W.elections.length, 1);
  assert.equal(W.benefits[0].who, 'wel:fx-party');
  assert.equal(W.symmetry[0].domain, 'women-cash');
  assert.equal(W.meta.counts.schemes, 1);
});

test('welfare helpers read the status history', async () => {
  const require = createRequire(import.meta.url);
  const ts = require(join(ROOT, 'node_modules/typescript'));
  const dir = scratch();
  const js = (src) => ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
  writeFileSync(join(dir, 'welfare.generated.mjs'), js(run.welfareTs));
  writeFileSync(join(dir, 'welfare.mjs'), js(readFileSync(join(ROOT, 'src/data/welfare.ts'), 'utf8')).replaceAll("'./welfare.generated'", "'./welfare.generated.mjs'"));
  const w = await import(pathToFileURL(join(dir, 'welfare.mjs')).href);
  const [s] = w.WELFARE_SCHEMES;
  assert.equal(w.WELFARE_AS_OF, '2026-09-22');
  assert.equal(w.latestStatus(s).status, 'discontinued');
  assert.deepEqual([2022, 2023, 2024, 2025].map((y) => w.schemesLiveInYear(y).length), [0, 1, 1, 0]);
  assert.equal(w.monthsBetween(s.launched.date, s.electionContext.date), 5);
  assert.equal(w.monthsBetween('2023-06-17', '2023-11-10'), 4);
  assert.equal(w.monthsBetween('2023-11-17', '2023-06-10'), -5);
  assert.equal(w.monthsBetween(null, '2023-06-10'), null);
  assert.equal(w.outlayForFy(s, '2023-2024').budgetedCr, 8000);
  assert.equal(w.outlayForFy(s, '2024-25'), null);
  assert.equal(w.schemesByState().get('mp').length, 1);
  const [mp, central, ka] = w.WELFARE_COVERAGE;
  assert.deepEqual(w.coverageYears(mp), [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026]);
  assert.deepEqual(w.coverageYears(central), [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026]);
  assert.deepEqual(w.coverageYears(ka), [2019, 2021, 2024]);
  assert.deepEqual(w.coverageYears({ st: 'ka', years: [2024, 2019, 2021, 2019], srcs: [], domain: 'x' }), [2019, 2021, 2024]);
  assert.equal(w.coverageYears({ st: 'ka', years: '2018-2026', srcs: [], domain: 'x' }), null);
  assert.equal(w.WELFARE_EDGE_DOMAIN['women-cash:c002'], 'women-cash');
  rmSync(dir, { recursive: true, force: true });
});

test('output is deterministic, plain data, and changes run id with its inputs', () => {
  const again = assembleFleet({ root: ROOT, dir: FIXTURE_DIR });
  assert.equal(again.energyTs, run.energyTs);
  assert.equal(again.welfareTs, run.welfareTs);
  assert.match(E.meta.runId, /^run-[0-9a-f]{12}$/);
  assert.match(run.energyTs, /^\/\*\*\n \* GENERATED FILE — DO NOT EDIT BY HAND\./);
  assert.ok(run.energyTs.includes(E.meta.runId));
  assert.ok(run.energyTs.includes(' *   research/raw/energy/AUDIT.json'));
  assert.equal(run.energyTs.includes(FIXTURE_DIR), false, 'the directory a run read from never reaches the header');
  assert.equal(run.welfareTs.includes(FIXTURE_DIR), false);

  const nodes = grab(run.energyTs, 'ENERGY_NODES');
  const edges = grab(run.energyTs, 'ENERGY_EDGES');
  const meta = grab(run.energyTs, 'ENERGY_META');
  assert.deepEqual(nodes, E.nodes);
  assert.deepEqual(edges.map((e) => e.id), [...edges.map((e) => e.id)].sort());
  assert.equal(meta.killed.length, 2);
  assert.deepEqual(grab(run.welfareTs, 'WELFARE_SCHEMES'), W.schemes);
  assert.deepEqual(grab(run.welfareTs, 'WELFARE_SCHEME_NODES'), W.schemeNodes);
  assert.doesNotMatch(run.energyTs.split('export const ENERGY_NODES')[1], /\bas\s+[A-Z]/, 'no casts inside the literals');

  const dir = scratch();
  writeFixture(dir);
  const p = join(dir, 'energy/renewables.json');
  writeFileSync(p, readFileSync(p, 'utf8').replace('Tariffs within 2%', 'Tariffs within 3%'));
  const changed = assembleFleet({ root: ROOT, dir });
  assert.notEqual(changed.energy.meta.runId, E.meta.runId);
  assert.equal(changed.welfare.meta.runId, W.meta.runId, 'a fleet run id depends on that fleet only');
  rmSync(dir, { recursive: true, force: true });
});

test('generated modules are tsc --strict clean', () => {
  const dir = scratch();
  const files = {
    'src/graph/schema.ts': readFileSync(join(ROOT, 'src/graph/schema.ts'), 'utf8'),
    'src/graph/fleet.ts': readFileSync(join(ROOT, 'src/graph/fleet.ts'), 'utf8'),
    'src/data/welfare.ts': readFileSync(join(ROOT, 'src/data/welfare.ts'), 'utf8'),
    [OUTPUTS.energy]: run.energyTs,
    [OUTPUTS.welfare]: run.welfareTs,
  };
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    writeFileSync(join(dir, rel), text);
  }
  const tsc = spawnSync(process.execPath, [
    join(ROOT, 'node_modules/typescript/bin/tsc'), '--noEmit', '--strict', '--noUnusedLocals', '--noUnusedParameters',
    '--isolatedModules', '--skipLibCheck', '--target', 'ES2020', '--module', 'ESNext', '--moduleResolution', 'bundler',
    ...Object.keys(files).map((f) => join(dir, f)),
  ], { encoding: 'utf8' });
  assert.equal(tsc.status, 0, tsc.stdout + tsc.stderr);
  rmSync(dir, { recursive: true, force: true });
});

test('EDGE_DOMAIN maps every edge and every held claim to its research file', () => {
  const ids = [...E.edges.map((e) => e.id), ...E.meta.killed.map((k) => k.id), ...E.meta.excluded.map((x) => x.id)];
  assert.deepEqual(Object.keys(E.edgeDomain).sort(), [...new Set(ids)].sort());
  assert.equal(E.edgeDomain['coal-power:c001'], 'coal-power');
  assert.equal(E.edgeDomain['renewables:c002'], 'renewables', 'killed claims keep their domain');
  assert.equal(E.edgeDomain['coal-power:c005'], 'coal-power', 'excluded claims keep their domain');
  assert.equal(E.edgeDomain['renewables:c003:audit-contra'], 'renewables', 'an audit denial takes the domain of the claim it answers');
  const lit = grab(run.energyTs.replace(/export const ENERGY_EDGE_DOMAIN: Record<string, string> = /, 'export const ENERGY_EDGE_DOMAIN = '), 'ENERGY_EDGE_DOMAIN');
  assert.deepEqual(Object.keys(lit), Object.keys(lit).sort(), 'emitted in id order');
  assert.deepEqual(Object.keys(W.edgeDomain), ['women-cash:c001', 'women-cash:c002']);
});

test('WELFARE_COVERAGE: canonical shape, the earlier contract shape still read, unreadable declarations held out', () => {
  assert.equal(W.coverage.length, 3);
  // The contract's earlier shape: [from, to] becomes the range, missing categories become ["all"] with a warning.
  assert.deepEqual(W.coverage[0], {
    st: 'mp', fromYear: 2018, toYear: 2026, categories: ['all'], method: null,
    note: 'state budget documents, every year', searched: true, years: [2018, 2026],
    srcs: [S('Budgets', 'budgets')], domain: 'women-cash',
  });
  assert.ok(run.warnings.some((w) => /coverage\[0\]: no categories — treated as \["all"\]/.test(w)));
  // The page spec's shape, with "all" written as a string.
  assert.deepEqual([W.coverage[1].st, W.coverage[1].fromYear, W.coverage[1].toYear, W.coverage[1].categories, W.coverage[1].method],
    ['central', 2019, 2026, ['all'], 'Union budget, every scheme line']);
  // A list of single years never becomes a range: spanning its gaps would declare years nobody searched.
  assert.deepEqual([W.coverage[2].fromYear, W.coverage[2].toYear, W.coverage[2].categories], [null, null, ['women-cash', 'farmer-cash']]);
  for (const [i, re] of [[2, /st "MP" is not a state code/], [3, /needs at least one \[label, url\] source/], [5, /fromYear\/toYear must be whole years/], [6, /categories \["bribes"\]/]]) {
    assert.ok(run.warnings.some((w) => new RegExp(`coverage\\[${i}\\]: `).test(w) && re.test(w)), `coverage[${i}] held out`);
  }
  assert.equal(W.meta.counts.coverage, 3);
  assert.deepEqual(grab(run.welfareTs, 'WELFARE_COVERAGE'), W.coverage);
});

test('the file stem is the domain; a disagreeing domain field is warned about, not used', () => {
  const dir = scratch();
  const entities = [
    { id: 'energy:a', label: 'A', ty: 'company', fam: 'capital', st: 'gj', sz: 1 },
    { id: 'energy:b', label: 'B', ty: 'agency', fam: 'enforce', st: null, sz: 1 },
  ];
  put(join(dir, 'energy/coal.json'), { asOf: '2026-09-25', domain: 'coal-and-lignite', sources: [S('x', 'x')], entities, claims: [{ id: 'coal:1', s: 'energy:a', t: 'energy:b', pred: 'own', tier: 'reported', srcs: [S('s', 's')] }] });
  const r = assembleFleet({ root: ROOT, dir });
  assert.deepEqual(r.errors, []);
  assert.equal(r.energy.edgeDomain['coal:1'], 'coal');
  assert.equal(r.energy.meta.files[0].domain, 'coal');
  assert.ok(r.warnings.some((w) => /domain "coal-and-lignite" differs from the file name — "coal" is used/.test(w)));
});

// ---------------------------------------------------------------------------
// The invariants — each one exits 1 and writes nothing
// ---------------------------------------------------------------------------

const ENT = [
  { id: 'energy:a', label: 'A', ty: 'company', fam: 'capital', st: 'gj', sz: 1, srcs: [S('A', 'a')] },
  { id: 'energy:b', label: 'B', ty: 'agency', fam: 'enforce', st: null, sz: 1, srcs: [S('B', 'b')] },
];
function assembleClaims(claims, audit) {
  const dir = scratch();
  put(join(dir, 'energy/x.json'), { asOf: '2026-09-25', domain: 'x', sources: [S('x', 'x')], entities: ENT, claims });
  if (audit) put(join(dir, 'energy/AUDIT.json'), audit);
  const r = assembleFleet({ root: ROOT, dir });
  rmSync(dir, { recursive: true, force: true });
  return r;
}
const refused = (r, re) => {
  assert.ok(r.errors.some((e) => re.test(e)), `expected an error matching ${re}; got ${JSON.stringify(r.errors)}`);
  assert.equal(r.energyTs, null);
  // The fault is energy's; the (empty, clean) welfare fleet still assembles.
  assert.deepEqual(r.fleetErrors.welfare, []);
  assert.equal(typeof r.welfareTs, 'string');
};

test('invariant: an endpoint that is neither fleet, inventory nor atlas', () => {
  refused(assembleClaims([{ id: 'x:1', s: 'energy:a', t: 'nowhere', pred: 'own', tier: 'reported', srcs: [S('s', 's')] }]), /"nowhere" is neither a fleet id/);
  refused(assembleClaims([{ id: 'x:1', s: 'energy:a', t: 'energy:undefined', pred: 'own', tier: 'reported', srcs: [S('s', 's')] }]), /"energy:undefined" is neither/);
  // An atlas id from src/graph/data.ts resolves.
  assert.deepEqual(assembleClaims([{ id: 'x:1', s: 'energy:a', t: 'adani', pred: 'own', tier: 'reported', srcs: [S('s', 's')] }]).errors, []);
});

test('invariant: documented or reported with no srcs', () => {
  refused(assembleClaims([{ id: 'x:1', s: 'energy:a', t: 'energy:b', pred: 'own', tier: 'documented' }]), /PROVENANCE INVARIANT/);
  refused(assembleClaims([{ id: 'x:1', s: 'energy:a', t: 'energy:b', pred: 'own', tier: 'reported', srcs: [] }]), /PROVENANCE INVARIANT/);
});

test('invariant: analytic without innocentReading after audit', () => {
  refused(assembleClaims([{ id: 'x:1', s: 'energy:a', t: 'energy:b', pred: 'analytic', tier: 'analytic' }]), /analytic claim without an innocentReading/);
  // A downgrade to analytic needs a reading from somewhere; a verdict can supply it.
  const claim = { id: 'x:1', s: 'energy:a', t: 'energy:b', pred: 'own', tier: 'reported', srcs: [S('s', 's')] };
  refused(assembleClaims([claim], { asOf: '2026-09-25', verdicts: [{ claimId: 'x:1', lens: 'l', recommendedTier: 'analytic' }] }), /innocentReading/);
  assert.deepEqual(assembleClaims([claim], { asOf: '2026-09-25', verdicts: [{ claimId: 'x:1', lens: 'l', recommendedTier: 'analytic', innocentReading: 'Peers do the same.' }] }).errors, []);
});

test('invariant: alleged without a contra after audit', () => {
  refused(assembleClaims([{ id: 'x:1', s: 'energy:b', t: 'energy:a', pred: 'enforce', tier: 'alleged' }]), /alleged claim without a contra/);
  // Valid alone, invalid once a verdict downgrades it with no denial on file.
  const claim = { id: 'x:1', s: 'energy:b', t: 'energy:a', pred: 'enforce', tier: 'reported', srcs: [S('s', 's')] };
  refused(assembleClaims([claim], { asOf: '2026-09-25', verdicts: [{ claimId: 'x:1', lens: 'l', recommendedTier: 'alleged', denialFound: 'none found — not asked' }] }), /alleged claim without a contra/);
  // A denial the audit found without a URL still answers it, at tier alleged.
  const ok = assembleClaims([claim], { asOf: '2026-09-25', verdicts: [{ claimId: 'x:1', lens: 'l', recommendedTier: 'alleged', sourceCheck: 'confirmed', denialFound: 'A told a reporter it was routine.' }] });
  assert.deepEqual(ok.errors, []);
  assert.equal(ok.energy.edges.find((e) => e.id === 'x:1:audit-contra').tier, 'alleged');
});

test('a killed alleged claim needs no contra, and a value tsc would reject fails here instead', () => {
  const r = assembleClaims([{ id: 'x:1', s: 'energy:b', t: 'energy:a', pred: 'enforce', tier: 'alleged' }], { asOf: '2026-09-25', verdicts: [{ claimId: 'x:1', lens: 'l', recommendedTier: 'kill', reason: 'no source' }] });
  assert.deepEqual(r.errors, []);
  assert.equal(r.energy.meta.killed[0].killedReason, 'no source');
  refused(assembleClaims([{ id: 'x:1', s: 'energy:a', t: 'energy:b', pred: 'own', tier: 'reported', a: '1,200', srcs: [S('s', 's')] }]), /expected a number/);
});

test('a tier written as a predicate is excluded with the reason, never coerced', () => {
  // The shape the coal sweep produced: an allegation with pred "alleged", answered by a denial.
  const r = assembleClaims([
    { id: 'x:1', s: 'energy:b', t: 'energy:a', pred: 'alleged', tier: 'alleged', lab: 'allegation' },
    { id: 'x:2', s: 'energy:a', t: 'claim:x:1', pred: 'contra', tier: 'reported', srcs: [S('denial', 'denial')] },
    { id: 'x:3', s: 'energy:a', t: 'energy:b', pred: 'bribe', tier: 'reported', srcs: [S('s', 's')] },
  ]);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.energy.edges.map((e) => e.id), ['x:2'], 'the denial stays; it answers a claim that is still on the record');
  const [x1, x3] = r.energy.meta.excluded;
  assert.equal(x1.id, 'x:1');
  assert.equal(x1.pred, 'alleged', 'kept as written');
  assert.equal(x1.excludedReason, 'alleged is a tier, not a predicate — did you mean pred contra/enforce with tier alleged?');
  assert.match(x3.excludedReason, /^unknown predicate "bribe"/);
  assert.ok(r.warnings.some((w) => /x:1: excluded — alleged is a tier/.test(w)));
});

test('a claim: endpoint resolves for any predicate when the claim exists; Atlas ids resolve verbatim', () => {
  const base = { id: 'x:1', s: 'energy:b', t: 'energy:a', pred: 'enforce', tier: 'reported', srcs: [S('s', 's')] };
  const ok = assembleClaims([base, { id: 'x:2', s: 'sebi', t: 'claim:x:1', pred: 'analytic', tier: 'analytic', innocentReading: 'Timing only.' }]);
  assert.deepEqual(ok.errors, []);
  refused(assembleClaims([base, { id: 'x:2', s: 'energy:a', t: 'claim:x:9', pred: 'analytic', tier: 'analytic', innocentReading: 'Timing only.' }]), /"claim:x:9" is not a claim in the energy fleet/);
});

test('a scheme in three files keeps every file\'s status history — union, never drop', () => {
  const dir = scratch();
  const S1 = S('Budget', 'budget');
  const scheme = (status, extra = {}) => ({ id: 'scheme:fx-lakshmi', name: 'FX Lakshmi', level: 'state', st: 'ka', category: 'women-cash', status, srcs: [S1], ...extra });
  const live = { date: '2023-08-30', status: 'live', note: 'launched', srcs: [S1] };
  put(join(dir, 'welfare/a-elections.json'), { asOf: '2026-09-25', sources: [S1], schemes: [scheme([live])] });
  put(join(dir, 'welfare/b-fiscal.json'), { asOf: '2026-09-25', sources: [S1], schemes: [scheme([
    { srcs: [S1], note: 'launched', status: 'live', date: '2023-08-30' }, // the same entry, keys in another order
    { date: '2024-06', status: 'paused', note: 'instalments delayed', srcs: [S1] },
  ], { outlay: [{ fy: '2024-25', budgetedCr: 28608, srcs: [S1] }] })] });
  put(join(dir, 'welfare/c-women.json'), { asOf: '2026-09-25', sources: [S1], schemes: [scheme([
    { date: '2025-02', status: 'live', note: 'arrears cleared', srcs: [S1] },
  ], { outlay: [{ fy: '2025-26', budgetedCr: 28608, srcs: [S1] }], benefit: { amount: 2000, unit: '₹ per month', changes: [] } })] });
  const r = assembleFleet({ root: ROOT, dir });
  assert.deepEqual(r.fleetErrors.welfare, []);
  const [s] = r.welfare.schemes;
  assert.deepEqual(s.status.map((x) => `${x.date} ${x.status}`), ['2023-08-30 live', '2024-06 paused', '2025-02 live'], 'one entry per distinct fact, first file first');
  assert.deepEqual(s.outlay.map((o) => o.fy), ['2024-25', '2025-26']);
  const merged = r.welfare.meta.reconciliation.merged.find((m) => m.id === 'scheme:fx-lakshmi');
  assert.deepEqual(merged.files, ['welfare/a-elections.json', 'welfare/b-fiscal.json', 'welfare/c-women.json']);
});

test('a null the first record left is filled from a later one, and META says where from', () => {
  const dir = scratch();
  const S1 = S('Budget', 'budget');
  put(join(dir, 'welfare/a.json'), {
    asOf: '2026-09-25', sources: [S1],
    schemes: [{ id: 'scheme:fx-x', name: 'FX X', level: 'state', st: 'mp', party: null, benefit: { amount: null, unit: '₹ per month', changes: [{ date: '2024', amount: 1250, srcs: [S1] }] }, srcs: [S1] }],
    entities: [{ id: 'wel:fx-cm', label: 'FX CM', ty: 'person', fam: 'state', st: null, sz: 2, al: ['FX CM'], srcs: [S1] }],
  });
  put(join(dir, 'welfare/b.json'), {
    asOf: '2026-09-25', sources: [S1],
    schemes: [{ id: 'scheme:fx-x', name: 'FX X (renamed)', level: 'state', st: 'mp', party: 'FX Party', benefit: { amount: 1000, unit: '₹ a month', changes: [{ date: '2025-01', amount: 1500, srcs: [S1] }] }, srcs: [S1] }],
    entities: [{ id: 'wel:fx-cm', label: 'Another label', sub: 'Chief Minister', ty: 'person', fam: 'state', st: null, sz: 2, al: ['FX Chief Minister'], srcs: [S1] }],
  });
  const r = assembleFleet({ root: ROOT, dir });
  assert.deepEqual(r.fleetErrors.welfare, []);
  const [s] = r.welfare.schemes;
  assert.equal(s.name, 'FX X', 'a scalar the first record has is kept');
  assert.equal(s.party, 'FX Party', 'a null scalar is filled');
  assert.equal(s.benefit.amount, 1000);
  assert.equal(s.benefit.unit, '₹ per month');
  assert.deepEqual(s.benefit.changes.map((c) => c.amount), [1250, 1500]);
  const n = r.welfare.nodes.find((x) => x.id === 'wel:fx-cm');
  assert.equal(n.label, 'FX CM');
  assert.equal(n.sub, 'Chief Minister');
  assert.deepEqual(n.al, ['FX CM', 'FX Chief Minister']);
  const byId = Object.fromEntries(r.welfare.meta.reconciliation.merged.map((m) => [m.id, m.filledFrom]));
  assert.deepEqual(byId['scheme:fx-x'], [{ field: 'party', file: 'welfare/b.json' }, { field: 'benefit.amount', file: 'welfare/b.json' }]);
  assert.deepEqual(byId['wel:fx-cm'], [{ field: 'sub', file: 'welfare/b.json' }]);
});

test('dates: ISO 8601 at year, month or day precision; a financial-year span is refused', () => {
  const claim = (from) => ({ id: 'x:1', s: 'energy:a', t: 'energy:b', pred: 'own', tier: 'reported', from, srcs: [S('s', 's')] });
  for (const d of ['2024', '2024-06', '2024-06-10']) {
    const r = assembleClaims([claim(d)]);
    assert.deepEqual(r.errors, [], d);
    assert.equal(r.energy.edges[0].from, d, 'kept at the precision written — never padded to a day');
  }
  for (const d of ['2024-25', '2025-2026', '10/06/2024']) refused(assembleClaims([claim(d)]), /is not an ISO date \(YYYY, YYYY-MM or YYYY-MM-DD\)/);

  const dir = scratch();
  const doc = JSON.parse(JSON.stringify(FIXTURE['welfare/women-cash.json']));
  doc.schemes[0].launched.date = '2023-06';
  doc.schemes[0].status[2].date = '2025-2026';
  put(join(dir, 'welfare/women-cash.json'), doc);
  put(join(dir, 'welfare/RECONCILIATION.json'), FIXTURE['welfare/RECONCILIATION.json']);
  const r = assembleFleet({ root: ROOT, dir });
  assert.deepEqual(r.fleetErrors.welfare, [`welfare/women-cash.json:scheme:fx-cash.status[2].date: "2025-2026" is not an ISO date (YYYY, YYYY-MM or YYYY-MM-DD)`]);
  assert.equal(r.welfareTs, null);
  assert.equal(r.welfare.schemes[0].launched.date, '2023-06');
});

test('CLI: --dir/--out writes both modules; a violation exits 1 and leaves only its own fleet unwritten', () => {
  const out = scratch();
  const ok = spawnSync(process.execPath, [join(ROOT, 'scripts/assemble-fleet.mjs'), '--dir', FIXTURE_DIR, '--out', out], { encoding: 'utf8' });
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(readFileSync(join(out, OUTPUTS.energy), 'utf8'), run.energyTs);
  assert.equal(readFileSync(join(out, OUTPUTS.welfare), 'utf8'), run.welfareTs);

  const bad = scratch();
  put(join(bad, 'energy/x.json'), { asOf: '2026-09-25', sources: [], entities: ENT, claims: [{ id: 'x:1', s: 'energy:a', t: 'energy:b', pred: 'own', tier: 'documented' }] });
  const out2 = scratch();
  const no = spawnSync(process.execPath, [join(ROOT, 'scripts/assemble-fleet.mjs'), '--dir', bad, '--out', out2], { encoding: 'utf8' });
  assert.equal(no.status, 1);
  assert.match(no.stderr, /PROVENANCE INVARIANT/);
  assert.equal(existsSync(join(out2, OUTPUTS.energy)), false);
  assert.equal(existsSync(join(out2, OUTPUTS.welfare)), true, 'the clean fleet is still written');
  for (const d of [out, bad, out2]) rmSync(d, { recursive: true, force: true });
});

test('mixed: energy clean, welfare failing — energy is written, welfare left untouched, exit 1', () => {
  const dir = scratch();
  writeFixture(dir);
  const p = join(dir, 'welfare/women-cash.json');
  const doc = JSON.parse(readFileSync(p, 'utf8'));
  doc.claims.find((c) => c.id === 'women-cash:c001').srcs = [];
  writeFileSync(p, JSON.stringify(doc, null, 2));

  const f = assembleFleet({ root: ROOT, dir });
  assert.deepEqual(f.fleetErrors.energy, []);
  assert.equal(f.fleetErrors.welfare.length, 1);
  assert.match(f.fleetErrors.welfare[0], /women-cash:c001: PROVENANCE INVARIANT/);
  assert.equal(f.energyTs, run.energyTs, 'energy is exactly what the clean fixture assembles to');
  assert.equal(f.welfareTs, null);

  const out = scratch();
  const previous = '// the last clean welfare module — must survive a failing run\n';
  mkdirSync(dirname(join(out, OUTPUTS.welfare)), { recursive: true });
  writeFileSync(join(out, OUTPUTS.welfare), previous);
  const r = spawnSync(process.execPath, [join(ROOT, 'scripts/assemble-fleet.mjs'), '--dir', dir, '--out', out], { encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /welfare: 1 error\(s\) — .* left untouched/);
  assert.match(r.stdout, /→ .*energy\.generated\.ts/);
  assert.equal(readFileSync(join(out, OUTPUTS.energy), 'utf8'), run.energyTs);
  assert.equal(readFileSync(join(out, OUTPUTS.welfare), 'utf8'), previous);
});

// ---------------------------------------------------------------------------
// Phase G — loan and grant, terms, N fleets
// ---------------------------------------------------------------------------

const assemble = (opts) => assembleRaw({ root: ROOT, ...opts });

/** A scratch raw directory holding one fleet's files: { '<name>.json': doc }. */
function mkTmpFleet(fleet, files) {
  const dir = scratch();
  for (const [name, doc] of Object.entries(files)) put(join(dir, fleet, name), doc);
  return dir;
}

test('loan and grant predicates pass the fleet gate and keep terms', () => {
  const dir = mkTmpFleet('finance', {
    'worldbank.json': {
      asOf: '2026-09-26', domain: 'worldbank', scope: 's', sources: [['WB', 'https://projects.worldbank.org/en/projects-operations/project-detail/P000001']],
      entities: [
        { id: 'fin:ibrd', label: 'IBRD', sub: 'World Bank lending arm', ty: 'fund', fam: 'capital', st: null, sz: 3, al: [], resolved: true, identity: {}, d: ['x [documented]'], srcs: [['WB', 'https://www.worldbank.org/']] },
        { id: 'min:ministry-of-finance', label: 'Ministry of Finance', sub: '', ty: 'ministry', fam: 'state', st: 'dl', sz: 3, al: [], resolved: true, identity: {}, d: [], srcs: [['WB', 'https://www.worldbank.org/']] },
      ],
      claims: [{ id: 'worldbank:c001', s: 'fin:ibrd', t: 'min:ministry-of-finance', pred: 'loan', tier: 'documented', a: 4150, lab: 'P000001', d: 'US$500m at ₹83/US$', from: '2023-06-30', to: '2028-12-31',
        terms: { instrument: 'IPF', ratePct: null, tenorYears: 18, graceYears: 5, conditions: ['procurement under WB rules'] }, srcs: [['WB', 'https://projects.worldbank.org/en/projects-operations/project-detail/P000001']] }],
      voids: [], narratives: [], symmetryCheck: 'x', baseRates: [], gaps: [],
    },
  });
  const out = assemble({ rawDir: dir });
  assert.equal(out.errors.length, 0, out.errors.join('\n'));
  const e = out.finance.data.edges.find((x) => x.id === 'worldbank:c001');
  assert.equal(e.pred, 'loan');
  assert.deepEqual(e.terms, { instrument: 'IPF', ratePct: null, tenorYears: 18, graceYears: 5, conditions: ['procurement under WB rules'] });
  assert.ok(out.finance.text.includes('"conditions":["procurement under WB rules"]'), 'terms reach the emitted literal');
});

/** The smallest graph-fleet file that passes every gate: two resolved entities and one sourced claim. */
function minimalGraphDoc(domain, claim = {}) {
  const src = ['Fixture', `https://example.org/${domain}`];
  return {
    asOf: '2026-09-26', domain, scope: 'Synthetic fixture. Not research.', sources: [src],
    entities: [
      { id: 'fin:fx-lender', label: 'FX Lender', ty: 'fund', fam: 'capital', st: null, sz: 2, resolved: true, srcs: [src] },
      { id: 'fin:fx-borrower', label: 'FX Borrower', ty: 'agency', fam: 'state', st: 'dl', sz: 2, resolved: true, srcs: [src] },
    ],
    claims: [{ id: `${domain}:c001`, s: 'fin:fx-lender', t: 'fin:fx-borrower', pred: 'loan', tier: 'documented', a: 830, d: 'US$100m at ₹83/US$', from: '2024', srcs: [src], ...claim }],
    voids: [], narratives: [], symmetryCheck: 'x', baseRates: [], gaps: [],
  };
}

test('a loan or grant without a numeric amount must say "amount not stated" — never read as zero', () => {
  for (const pred of ['loan', 'grant']) {
    const bad = assemble({ rawDir: mkTmpFleet('finance', { 'x.json': minimalGraphDoc('x', { pred, a: null, d: 'Disbursed in FY2023.' }) }) });
    assert.ok(bad.fleetErrors.finance.some((e) => /x:c001: .*amount not stated/.test(e)), `${pred}: ${JSON.stringify(bad.fleetErrors.finance)}`);
    assert.equal(bad.finance.text, null, 'a refused fleet emits nothing');
    assert.deepEqual(bad.fleetErrors.energy, [], 'the fault is charged to its own fleet only');
    const ok = assemble({ rawDir: mkTmpFleet('finance', { 'x.json': minimalGraphDoc('x', { pred, a: undefined, d: 'Amount not stated in the sanction order.' }) }) });
    assert.deepEqual(ok.errors, []);
    assert.equal('a' in ok.finance.data.edges[0], false, 'the absent amount stays absent');
  }
  // The rule is one function, so the validator and the assembler cannot disagree on it.
  assert.equal(vocab.amountProblem({ pred: 'loan', a: 0 }), null, 'a stated zero is a number');
  assert.equal(vocab.amountProblem({ pred: 'bond', d: '' }), null, 'only loan and grant carry the rule');
  assert.match(vocab.amountProblem({ pred: 'grant', a: '12' }), /amount not stated/);
});

test('terms: a fixed shape — conditions a list of strings, an unknown key refused with its name', () => {
  const run1 = (terms) => assemble({ rawDir: mkTmpFleet('finance', { 'x.json': minimalGraphDoc('x', { terms }) }) });
  assert.match(run1({ conditions: 'procurement rules' }).fleetErrors.finance.join('\n'), /terms\.conditions: expected a list of strings/);
  assert.match(run1({ conditions: ['ok', 3] }).fleetErrors.finance.join('\n'), /terms\.conditions\[1\]: expected text/);
  assert.match(run1({ gracePeriodYears: 5 }).fleetErrors.finance.join('\n'), /terms\.gracePeriodYears is not a terms field/);
  assert.match(run1({ ratePct: '1.2%' }).fleetErrors.finance.join('\n'), /terms\.ratePct: expected a number/);
  assert.match(run1('IPF').fleetErrors.finance.join('\n'), /terms: expected an object/);
  const r = run1({ conditions: [], instrument: 'PforR' });
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.finance.data.edges[0].terms, { instrument: 'PforR', conditions: [] }, 'only the keys written, in a fixed order');
  const noTerms = run1(undefined);
  assert.equal('terms' in noTerms.finance.data.edges[0], false);
});

test('every money predicate is directed and labelled in ForceGraph; every predicate has a label', () => {
  const src = readFileSync(join(ROOT, 'src/components/viz/ForceGraph.tsx'), 'utf8');
  const directed = src.match(/const DIRECTED = new Set<Predicate>\(\[([^\]]*)\]\)/);
  assert.ok(directed, 'DIRECTED literal not found');
  const set = new Set([...directed[1].matchAll(/'([a-z]+)'/g)].map((m) => m[1]));
  for (const p of [...vocab.MONEY_PREDS, 'award']) assert.ok(set.has(p), `${p} is a money flow and must draw an arrow`);
  const labels = src.match(/export const PRED_LABEL[^=]*=\s*\{([\s\S]*?)\n\};/);
  assert.ok(labels, 'PRED_LABEL literal not found');
  for (const p of vocab.PREDS) assert.match(labels[1], new RegExp(`\\n\\s*${p}: '`), `PRED_LABEL has no entry for ${p}`);
  assert.match(labels[1], /loan: 'Loan'/);
  assert.match(labels[1], /grant: 'Grant \/ foreign contribution'/);
});

test('every FLEETS entry gets a module; a missing directory yields empty:true', () => {
  const dir = mkTmpFleet('finance', { 'worldbank.json': minimalGraphDoc('worldbank') });
  const out = assemble({ rawDir: dir });
  assert.deepEqual(out.errors, []);
  assert.ok(out.finance.text.includes('export const FINANCE_NODES'));
  assert.equal(out.finance.data.meta.empty, false);
  assert.equal(out.ngo.data.meta.empty, true);
  assert.equal(out.capital.data.meta.empty, true);
  for (const f of vocab.FLEETS) {
    assert.equal(typeof out[f.key].text, 'string', `${f.key} has a module`);
    assert.match(out[f.key].text, new RegExp(`export const ${f.prefix}_META: FleetMeta = `));
    assert.equal(out[f.key].data.meta.fleet, f.key);
  }
  for (const f of vocab.FLEETS.filter((x) => x.kind === 'graph')) {
    for (const s of ['NODES', 'EDGES', 'BENEFITS', 'VOIDS', 'NARRATIVES', 'BASE_RATES', 'SYMMETRY', 'META', 'IDENTITY', 'GAPS', 'EDGE_DOMAIN']) {
      assert.match(out[f.key].text, new RegExp(`export const ${f.prefix}_${s}\\b`), `${f.key} exports ${f.prefix}_${s}`);
    }
    assert.match(out[f.key].text, /from '\.\/schema';/, `${f.key} is written under src/graph/`);
  }
  assert.match(out.ngo.text, /export const NGO_NODES: GNode\[\] = \[\n\];/);
  assert.match(out.ngo.data.meta.note, /no research files under research\/raw\/ngo\//);
  // One file in a fleet directory is a fleet: a fleet directory with a single file assembles.
  assert.deepEqual(out.finance.data.meta.inputs, ['finance/worldbank.json']);
  assert.equal(out.finance.data.edges.length, 1);
  // Run ids: one per fleet, from that fleet's inputs only.
  const ids = vocab.FLEETS.map((f) => out[f.key].data.meta.runId);
  assert.equal(new Set(ids).size, ids.length, 'no two fleets share a stamp');
  assert.equal(assemble({ rawDir: dir }).finance.text, out.finance.text, 'deterministic');
  put(join(dir, 'ngo/fcra.json'), minimalGraphDoc('fcra', { pred: 'grant' }));
  const after2 = assemble({ rawDir: dir });
  assert.equal(after2.finance.data.meta.runId, out.finance.data.meta.runId, 'another fleet\'s research does not restamp this one');
  assert.notEqual(after2.ngo.data.meta.runId, out.ngo.data.meta.runId);
  // The two-fleet view the existing callers read is the same assembly.
  const legacy = assembleFleet({ root: ROOT, dir });
  assert.equal(legacy.energyTs, after2.energy.text);
  assert.equal(legacy.welfareTs, after2.welfare.text);
  assert.equal(legacy.financeTs, after2.finance.text);
});

test('generated N-fleet modules are tsc --strict clean', () => {
  const dir = mkTmpFleet('finance', { 'worldbank.json': minimalGraphDoc('worldbank', { terms: { instrument: 'IPF', ratePct: null, conditions: ['c'] } }) });
  const out = assemble({ rawDir: dir });
  assert.deepEqual(out.errors, []);
  const tmp = scratch();
  const files = {
    'src/graph/schema.ts': readFileSync(join(ROOT, 'src/graph/schema.ts'), 'utf8'),
    'src/graph/fleet.ts': readFileSync(join(ROOT, 'src/graph/fleet.ts'), 'utf8'),
    'src/data/welfare.ts': readFileSync(join(ROOT, 'src/data/welfare.ts'), 'utf8'),
    ...Object.fromEntries(vocab.FLEETS.map((f) => [f.out, out[f.key].text])),
  };
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(dirname(join(tmp, rel)), { recursive: true });
    writeFileSync(join(tmp, rel), text);
  }
  const tsc = spawnSync(process.execPath, [
    join(ROOT, 'node_modules/typescript/bin/tsc'), '--noEmit', '--strict', '--noUnusedLocals', '--noUnusedParameters',
    '--isolatedModules', '--skipLibCheck', '--target', 'ES2020', '--module', 'ESNext', '--moduleResolution', 'bundler',
    ...Object.keys(files).map((f) => join(tmp, f)),
  ], { encoding: 'utf8' });
  assert.equal(tsc.status, 0, tsc.stdout + tsc.stderr);
});

test('CLI writes every FLEETS module, each to its own path', () => {
  const dir = mkTmpFleet('finance', { 'worldbank.json': minimalGraphDoc('worldbank') });
  const out = scratch();
  const r = spawnSync(process.execPath, [join(ROOT, 'scripts/assemble-fleet.mjs'), '--dir', dir, '--out', out], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const mem = assemble({ rawDir: dir });
  for (const f of vocab.FLEETS) assert.equal(readFileSync(join(out, f.out), 'utf8'), mem[f.key].text, f.out);
});
